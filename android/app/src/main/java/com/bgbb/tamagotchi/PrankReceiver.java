package com.bgbb.tamagotchi;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** 작전 알람이 울리거나 재부팅·시간 변경이 있을 때 깨어나는 리시버. */
public class PrankReceiver extends BroadcastReceiver {

    static final String ACTION_FIRE = "com.bgbb.tamagotchi.ACTION_FIRE";

    @Override
    public void onReceive(Context context, Intent intent) {
        Context c = context.getApplicationContext();
        if (!ACTION_FIRE.equals(intent.getAction())) {
            // BOOT_COMPLETED, 앱 업데이트, 시간/시간대 변경 → 알람만 다시 건다.
            PrankScheduler.reschedule(c);
            return;
        }

        long now = System.currentTimeMillis();
        if (!PrankScheduler.isActive(PrankScheduler.config(c))
                || !PrankScheduler.inWindow(PrankScheduler.config(c), now)) {
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
