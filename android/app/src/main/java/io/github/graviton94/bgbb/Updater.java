package io.github.graviton94.bgbb;

import android.app.Activity;

import com.google.android.play.core.appupdate.AppUpdateInfo;
import com.google.android.play.core.appupdate.AppUpdateManager;
import com.google.android.play.core.appupdate.AppUpdateManagerFactory;
import com.google.android.play.core.appupdate.AppUpdateOptions;
import com.google.android.play.core.install.InstallStateUpdatedListener;
import com.google.android.play.core.install.model.AppUpdateType;
import com.google.android.play.core.install.model.InstallStatus;
import com.google.android.play.core.install.model.UpdateAvailability;

/**
 * 새 버전 알림: Google Play 인앱 업데이트 (유연한 방식).
 * Play 에 더 새 버전이 있으면 JS 에 알리고 (업데이트 팝업), 사용자가 누르면 앱을 쓰는 동안 뒤에서 받는다.
 * 다 받으면 다시 알리고 (지금 다시 시작?), completeUpdate 로 설치 · 재시작.
 * Play 에서 설치하지 않은 APK (테스트용) 에서는 아무 일도 안 일어난다.
 */
final class Updater {

    interface Sink {
        void available(int versionCode);   // 새 버전 있음
        void downloaded();                 // 다 받음 → 다시 시작하면 적용
    }

    private final Activity activity;
    private final Sink sink;
    private final AppUpdateManager manager;
    private AppUpdateInfo latest;
    private final InstallStateUpdatedListener listener;

    Updater(Activity activity, Sink sink) {
        this.activity = activity;
        this.sink = sink;
        this.manager = AppUpdateManagerFactory.create(activity);
        this.listener = state -> {
            if (state.installStatus() == InstallStatus.DOWNLOADED) sink.downloaded();
        };
        manager.registerListener(listener);
    }

    /** 앱이 보일 때마다: 새 버전이 있는지 · 받아 둔 게 있는지 */
    void check() {
        manager.getAppUpdateInfo().addOnSuccessListener(info -> {
            latest = info;
            if (info.installStatus() == InstallStatus.DOWNLOADED) sink.downloaded();
            else if (info.updateAvailability() == UpdateAvailability.UPDATE_AVAILABLE
                    && info.isUpdateTypeAllowed(AppUpdateType.FLEXIBLE)) sink.available(info.availableVersionCode());
        });
    }

    /** 사용자가 '업데이트' 를 누름: Play 확인 창 → 뒤에서 받기 */
    void start() {
        if (latest == null) return;
        manager.startUpdateFlow(latest, activity, AppUpdateOptions.newBuilder(AppUpdateType.FLEXIBLE).build());
    }

    /** 다 받은 걸 설치하고 다시 시작 */
    void complete() {
        manager.completeUpdate();
    }

    void destroy() {
        manager.unregisterListener(listener);
    }
}
