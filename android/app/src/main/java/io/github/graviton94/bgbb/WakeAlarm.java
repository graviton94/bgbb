package io.github.graviton94.bgbb;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import org.json.JSONObject;

import java.util.Calendar;

/**
 * 기상 알람 일정: 정한 시각에 AlarmService 가 알람 음악을 끌 때까지 반복 (실제 알람시계처럼).
 * 알람 시각부터 24시까지가 그날 방구 시간이 된다 (src/schedule.js startMin).
 * 끄는 건 앱 알람 팝업의 [확인], [5분만 더] 는 5분 뒤 다시.
 */
final class WakeAlarm {

    static final String ACTION_RING = "io.github.graviton94.bgbb.ACTION_WAKE";
    private static final String KEY_SNOOZE = "wakeSnooze";
    private static final long SNOOZE_MS = 5 * 60_000L;

    private WakeAlarm() {}

    /** 정확한 시각 알람을 걸 수 있는지 (Android 12+ 는 '알람 및 리마인더' 허용 필요) */
    static boolean exactAllowed(Context c) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true;
        AlarmManager am = c.getSystemService(AlarmManager.class);
        return am != null && am.canScheduleExactAlarms();
    }

    private static PendingIntent intent(Context c, String action, int code) {
        return PendingIntent.getBroadcast(c, code, new Intent(c, PrankReceiver.class).setAction(action),
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static PendingIntent openApp(Context c) {
        return PendingIntent.getActivity(c, 3, MainActivity.wakeIntent(c),
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    /** 설정대로 다음 알람 하나만 건다 (5분 뒤 다시가 있으면 그게 먼저). 꺼져 있으면 지운다. */
    static void schedule(Context c) {
        AlarmManager am = c.getSystemService(AlarmManager.class);
        if (am == null) return;
        PendingIntent pi = intent(c, ACTION_RING, 4);
        am.cancel(pi);
        JSONObject wake = PrankScheduler.config(c).optJSONObject("wake");
        SharedPreferences p = c.getSharedPreferences("bgbb", Context.MODE_PRIVATE);
        long now = System.currentTimeMillis(), snooze = p.getLong(KEY_SNOOZE, 0);
        if (wake == null || !wake.optBoolean("on")) {
            p.edit().remove(KEY_SNOOZE).apply();
            return;
        }
        long at = snooze > now ? snooze : next(wake.optInt("at", 420), now);
        if (exactAllowed(c)) am.setAlarmClock(new AlarmManager.AlarmClockInfo(at, openApp(c)), pi);
        else am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);   // 권한이 없으면 몇 분 늦을 수 있음
    }

    /** 하루 중 분 → 다음 그 시각 */
    private static long next(int minutes, long now) {
        Calendar cal = Calendar.getInstance();
        cal.setTimeInMillis(now);
        cal.set(Calendar.HOUR_OF_DAY, 0);
        cal.set(Calendar.MINUTE, 0);
        cal.set(Calendar.SECOND, 0);
        cal.set(Calendar.MILLISECOND, 0);
        cal.add(Calendar.MINUTE, minutes);
        if (cal.getTimeInMillis() <= now) cal.add(Calendar.DAY_OF_MONTH, 1);
        return cal.getTimeInMillis();
    }

    static void snooze(Context c) {
        c.getSharedPreferences("bgbb", Context.MODE_PRIVATE).edit()
                .putLong(KEY_SNOOZE, System.currentTimeMillis() + SNOOZE_MS).apply();
        stop(c);
        schedule(c);
    }

    /** 울린다: 알람 서비스 시작 (음악 반복 · 진동 · 잠금화면 위로 앱) + 내일 것 미리 */
    static void ring(Context c) {
        c.getSharedPreferences("bgbb", Context.MODE_PRIVATE).edit().remove(KEY_SNOOZE).apply();
        schedule(c);
        AlarmService.start(c);
    }

    /** 앱 알람 팝업의 [확인] */
    static void stop(Context c) {
        AlarmService.stop(c);
    }

    static boolean isRinging() {
        return AlarmService.ringing;
    }
}
