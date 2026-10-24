package io.github.graviton94.bgbb;

import android.app.Activity;

import com.android.billingclient.api.AcknowledgePurchaseParams;
import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.ConsumeParams;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * 응원하기 + 뿡코인 충전: Google Play 일회성 상품.
 * 응원하기(tip_*)는 한 번 사면 계속 가짐 (확인 acknowledge). 뿡코인 팩(COIN_PACKS)은 소모성:
 * JS 가 코인을 넣고 coinsCredited(토큰) 을 부르면 그때 소모(consume) 한다 → 앱이 중간에 죽어도 다음에 다시 알려 주고,
 * JS 는 토큰으로 두 번 넣지 않는다.
 *
 * (원래 설명) 응원하기: Google Play 일회성 상품. 잠긴 기능은 없고, 산 상품 ID 만 JS 에 알려 준다.
 * 결제는 Google Play 가 처리하며 앱은 결제 정보를 다루지 않는다.
 * Play 에서 설치하지 않았거나 상품이 없으면 가격 목록이 비어서 JS 가 '응원할 수 없음' 을 보여 준다.
 */
final class Support implements PurchasesUpdatedListener {

    interface Sink {
        void prices(String json);   // {"tip_seeds":"₩1,500", ...}
        void owned(String json);    // ["tip_seeds", ...]
        void coins(String productId, String purchaseToken);   // 아직 코인을 안 넣은 충전 (넣고 나서 consume)
    }

    static final Set<String> COIN_PACKS = Set.of("coins_s", "coins_m", "coins_l");

    private final Activity activity;
    private final Sink sink;
    private final BillingClient client;
    private final Map<String, ProductDetails> details = new HashMap<>();
    private final List<Runnable> whenReady = new ArrayList<>();
    private boolean connecting = false;

    Support(Activity activity, Sink sink) {
        this.activity = activity;
        this.sink = sink;
        this.client = BillingClient.newBuilder(activity)
                .setListener(this)
                .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
                .build();
    }

    /** 상품 가격과 이미 응원한 상품을 불러온다. */
    void load(List<String> productIds) {
        withConnection(() -> {
            List<QueryProductDetailsParams.Product> products = new ArrayList<>();
            for (String id : productIds) {
                products.add(QueryProductDetailsParams.Product.newBuilder()
                        .setProductId(id)
                        .setProductType(BillingClient.ProductType.INAPP)
                        .build());
            }
            client.queryProductDetailsAsync(
                    QueryProductDetailsParams.newBuilder().setProductList(products).build(),
                    (result, detailsResult) -> {
                        JSONObject prices = new JSONObject();
                        if (result.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                            for (ProductDetails d : detailsResult.getProductDetailsList()) {
                                ProductDetails.OneTimePurchaseOfferDetails offer = d.getOneTimePurchaseOfferDetails();
                                if (offer == null) continue;
                                details.put(d.getProductId(), d);
                                try { prices.put(d.getProductId(), offer.getFormattedPrice()); } catch (Exception ignored) { }
                            }
                        }
                        sink.prices(prices.toString());
                    });
            refreshOwned();
        }, () -> sink.prices("{}"));
    }

    void buy(String productId) {
        ProductDetails d = details.get(productId);
        if (d == null) return;
        withConnection(() -> {
            List<BillingFlowParams.ProductDetailsParams> list = new ArrayList<>();
            list.add(BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(d).build());
            client.launchBillingFlow(activity, BillingFlowParams.newBuilder().setProductDetailsParamsList(list).build());
        }, null);
    }

    @Override
    public void onPurchasesUpdated(BillingResult result, List<Purchase> purchases) {
        if (result.getResponseCode() == BillingClient.BillingResponseCode.OK && purchases != null) {
            for (Purchase p : purchases) handle(p);
        }
        refreshOwned();
    }

    void destroy() {
        client.endConnection();
    }

    private void refreshOwned() {
        client.queryPurchasesAsync(
                QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.INAPP).build(),
                (result, purchases) -> {
                    JSONArray owned = new JSONArray();
                    for (Purchase p : purchases) {
                        if (p.getPurchaseState() != Purchase.PurchaseState.PURCHASED) continue;
                        if (isCoins(p)) { handle(p); continue; }   // 소모 안 된 충전 = 코인을 아직 못 넣은 것
                        acknowledge(p);
                        for (String id : p.getProducts()) owned.put(id);
                    }
                    if (result.getResponseCode() == BillingClient.BillingResponseCode.OK) sink.owned(owned.toString());
                });
    }

    private static boolean isCoins(Purchase p) {
        for (String id : p.getProducts()) if (COIN_PACKS.contains(id)) return true;
        return false;
    }

    private void handle(Purchase p) {
        if (p.getPurchaseState() != Purchase.PurchaseState.PURCHASED) return;
        if (!isCoins(p)) { acknowledge(p); return; }
        for (String id : p.getProducts()) if (COIN_PACKS.contains(id)) sink.coins(id, p.getPurchaseToken());
    }

    /** JS 가 코인을 넣은 뒤 부른다: 이제 소모해서 같은 팩을 또 살 수 있게 */
    void consume(String purchaseToken) {
        withConnection(() -> client.consumeAsync(
                ConsumeParams.newBuilder().setPurchaseToken(purchaseToken).build(), (r, token) -> { }), null);
    }

    /** 3일 안에 확인(acknowledge)하지 않으면 Play 가 자동 환불하므로 반드시 확인한다. */
    private void acknowledge(Purchase p) {
        if (p.getPurchaseState() != Purchase.PurchaseState.PURCHASED || p.isAcknowledged()) return;
        client.acknowledgePurchase(
                AcknowledgePurchaseParams.newBuilder().setPurchaseToken(p.getPurchaseToken()).build(),
                r -> { });
    }

    private void withConnection(Runnable action, Runnable onFail) {
        if (client.isReady()) {
            action.run();
            return;
        }
        whenReady.add(action);
        if (connecting) return;
        connecting = true;
        client.startConnection(new BillingClientStateListener() {
            @Override
            public void onBillingSetupFinished(BillingResult result) {
                activity.runOnUiThread(() -> {
                    connecting = false;
                    List<Runnable> pending = new ArrayList<>(whenReady);
                    whenReady.clear();
                    boolean ok = result.getResponseCode() == BillingClient.BillingResponseCode.OK;
                    if (ok) for (Runnable r : pending) r.run();
                    else if (onFail != null) onFail.run();
                });
            }

            @Override
            public void onBillingServiceDisconnected() {
                activity.runOnUiThread(() -> connecting = false);
            }
        });
    }
}
