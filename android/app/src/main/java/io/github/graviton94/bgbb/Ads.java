package io.github.graviton94.bgbb;

import android.app.Activity;

import com.google.android.gms.ads.AdError;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.FullScreenContentCallback;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.rewarded.RewardedAd;
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback;
import com.google.android.ump.ConsentInformation;
import com.google.android.ump.ConsentRequestParameters;
import com.google.android.ump.UserMessagingPlatform;

/**
 * 보상형 광고 하나 (AdMob): '짤 뽑기' 를 다 쓴 뒤 광고를 끝까지 보면 +3.
 * 광고 단위 ID 는 build.gradle (BuildConfig.ADMOB_REWARDED), 앱 ID 는 매니페스트. 비어 있으면 Google 테스트 광고.
 * 유럽 등 동의가 필요한 곳은 Google UMP 동의 창을 먼저 띄우고, 허락된 뒤에만 광고를 부른다.
 * 앱 다른 화면에는 광고가 없다 (배너 · 전면 없음).
 */
final class Ads {

    interface Sink {
        void ready(boolean ready);   // 볼 광고가 준비됐는지 (버튼 보이기)
        void reward();               // 끝까지 봤음 → 짤 뽑기 +3
    }

    private final Activity activity;
    private final Sink sink;
    private RewardedAd ad;
    private boolean loading = false, started = false;

    Ads(Activity activity, Sink sink) {
        this.activity = activity;
        this.sink = sink;
    }

    /** 앱 시작 때 한 번: 동의 확인 → SDK 시작 → 광고 하나 미리 받아 둠 */
    void start() {
        ConsentInformation consent = UserMessagingPlatform.getConsentInformation(activity);
        consent.requestConsentInfoUpdate(activity, new ConsentRequestParameters.Builder().build(),
                () -> UserMessagingPlatform.loadAndShowConsentFormIfRequired(activity, error -> {
                    if (consent.canRequestAds()) init();
                }),
                error -> { if (consent.canRequestAds()) init(); });
        if (consent.canRequestAds()) init();   // 지난번에 이미 동의한 경우 바로
    }

    private void init() {
        if (started) return;
        started = true;
        new Thread(() -> MobileAds.initialize(activity, status -> activity.runOnUiThread(this::load))).start();
    }

    private void load() {
        if (loading || ad != null || !started) return;
        loading = true;
        RewardedAd.load(activity, BuildConfig.ADMOB_REWARDED, new AdRequest.Builder().build(), new RewardedAdLoadCallback() {
            @Override
            public void onAdLoaded(RewardedAd rewarded) {
                ad = rewarded;
                loading = false;
                sink.ready(true);
            }

            @Override
            public void onAdFailedToLoad(LoadAdError error) {
                loading = false;
                sink.ready(false);
            }
        });
    }

    boolean ready() {
        return ad != null;
    }

    void show() {
        RewardedAd shown = ad;
        if (shown == null) { load(); return; }
        ad = null;
        sink.ready(false);
        shown.setFullScreenContentCallback(new FullScreenContentCallback() {
            @Override public void onAdDismissedFullScreenContent() { load(); }
            @Override public void onAdFailedToShowFullScreenContent(AdError error) { load(); }
        });
        shown.show(activity, item -> sink.reward());
    }
}
