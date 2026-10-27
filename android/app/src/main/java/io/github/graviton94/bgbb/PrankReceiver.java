package io.github.graviton94.bgbb;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

import org.json.JSONObject;

/** 작전 알람, 재부팅, 앱 업데이트, 시간 변경 때 깨어난다. 쉬는 시간이면 안 터지고 다음 것만 건다. */
public class PrankReceiver extends BroadcastReceiver {

    static final String ACTION_FIRE = "io.github.graviton94.bgbb.ACTION_FIRE";
    static final String ACTION_NAG = "io.github.graviton94.bgbb.ACTION_NAG";
    static final String ACTION_RESUME = "io.github.graviton94.bgbb.ACTION_RESUME";

    @Override
    public void onReceive(Context context, Intent intent) {
        Context c = context.getApplicationContext();
        JSONObject cfg = PrankScheduler.config(c);
        String action = intent.getAction();
        if (WakeAlarm.ACTION_RING.equals(action)) { WakeAlarm.ring(c); return; }
        if (ACTION_RESUME.equals(intent.getAction())) {   // 도발 알림의 "다시 시작!"
            PrankScheduler.resumeFromNotification(c);
            PrankNotifier.resumed(c);
            return;
        }
        if (ACTION_NAG.equals(intent.getAction())) {
            String kind = PrankScheduler.nagKind(c);
            long now = System.currentTimeMillis();
            if (PrankScheduler.NAG_FROZEN.equals(kind) && cfg.optBoolean("frozen")) PrankNotifier.nagFrozen(c, PrankScheduler.frozenHours(c));
            else if (PrankScheduler.NAG_REST.equals(kind) && PrankScheduler.inRest(cfg, now)) PrankNotifier.nagRest(c);
            PrankScheduler.nagDone(c);
            return;
        }
        boolean fire = ACTION_FIRE.equals(intent.getAction())
                && PrankScheduler.isActive(cfg)
                && PrankScheduler.inWindow(cfg, System.currentTimeMillis())
                && !PrankScheduler.inRest(cfg, System.currentTimeMillis());
        if (!fire) {
            PrankScheduler.reschedule(c);
            return;
        }
        PendingResult result = goAsync();
        PrankPlayer.fire(c, () -> {
            PrankScheduler.reschedule(c);
            result.finish();
        }, true);
    }
}
