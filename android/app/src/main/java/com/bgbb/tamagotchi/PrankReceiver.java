package com.bgbb.tamagotchi;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

import org.json.JSONObject;

/** 작전 알람, 재부팅, 앱 업데이트, 시간 변경 때 깨어난다. */
public class PrankReceiver extends BroadcastReceiver {

    static final String ACTION_FIRE = "com.bgbb.tamagotchi.ACTION_FIRE";

    @Override
    public void onReceive(Context context, Intent intent) {
        Context c = context.getApplicationContext();
        JSONObject cfg = PrankScheduler.config(c);
        boolean fire = ACTION_FIRE.equals(intent.getAction())
                && PrankScheduler.isActive(cfg)
                && PrankScheduler.inWindow(cfg, System.currentTimeMillis());
        if (!fire) {
            PrankScheduler.reschedule(c);
            return;
        }
        PendingResult result = goAsync();
        PrankPlayer.fire(c, () -> {
            PrankScheduler.reschedule(c);
            result.finish();
        });
    }
}
