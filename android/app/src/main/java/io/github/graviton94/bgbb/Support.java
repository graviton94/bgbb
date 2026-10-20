package io.github.graviton94.bgbb;

import android.app.Activity;

import com.android.billingclient.api.AcknowledgePurchaseParams;
import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
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

/**
 * 응원하기: Google Play 일회성 상품. 잠긴 기능은 없고, 산 상품 ID 만 JS 에 알려 준다.
 * 결제는 Google Play 가 처리하며 앱은 결제 정보를 다루지 않는다.
 * Play 에서 설치하지 않았거나 상품이 없으면 가격 목록이 비어서 JS 가 '응원할 수 없음' 을 보여 준다.
 */
final class Support implements PurchasesUpdatedListener {

    interface Sink {
        void prices(String json);   // {"tip_seeds":"₩1,500", ...}
        void owned(String json);    // ["tip_seeds", ...]
    }

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
            for (Purchase p : purchases) acknowledge(p);
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
                        acknowledge(p);
                        for (String id : p.getProducts()) owned.put(id);
                    }
                    if (result.getResponseCode() == BillingClient.BillingResponseCode.OK) sink.owned(owned.toString());
                });
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
