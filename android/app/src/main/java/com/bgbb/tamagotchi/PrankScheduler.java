package com.bgbb.tamagotchi;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;
import java.util.Random;

/**
 * 불시 작전 일정.
 *
 * 하루치 작전 시각을 작전 시간대 안에서 미리 뽑아 두고, 가장 가까운 하나만 AlarmManager 에 건다.
 * 알람이 울리면 PrankReceiver 가 한 번 실행하고 다음 것을 건다. 상주 서비스도 WakeLock 도 없어서
 * 기다리는 동안 배터리를 쓰지 않는다.
 *
 * 일정 규칙은 src/schedule.js 와 같다: 시간대를 N칸으로 나누고 칸마다 한 번, 칸 양끝 10%는 비운다.
 */
final class PrankScheduler {

    private static final String PREFS = "bgbb";
    private static final String KEY_CONFIG = "config";
    private static final String KEY_PLAN = "plan";
    private static final String KEY_PLAN_DAY = "planDay";
    private static final String KEY_EVENTS = "events";
    private static final int MAX_EVENTS = 500;
    private static final long HOUR = 3_600_000L;
    private static final Random RANDOM = new Random();

    private PrankScheduler() {}

    private static SharedPreferences prefs(Context c) {
        return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    /** JS 가 보낸 설정을 저장하고 일정을 새로 뽑는다. */
    static void configure(Context c, String json) {
        prefs(c).edit().putString(KEY_CONFIG, json).remove(KEY_PLAN).remove(KEY_PLAN_DAY).apply();
        reschedule(c);
    }

    static void reset(Context c) {
        prefs(c).edit().clear().apply();
        reschedule(c);
    }

    static JSONObject config(Context c) {
        try {
            return new JSONObject(prefs(c).getString(KEY_CONFIG, "{}"));
        } catch (JSONException e) {
            return new JSONObject();
        }
    }

    static boolean isActive(JSONObject cfg) {
        JSONArray sounds = cfg.optJSONArray("sounds");
        return cfg.optBoolean("on") && !cfg.optBoolean("frozen") && sounds != null && sounds.length() > 0;
    }

    /** 지난 일정을 버리고 다음 작전 하나만 알람으로 건다. */
    static void reschedule(Context c) {
        AlarmManager am = c.getSystemService(AlarmManager.class);
        PendingIntent pi = PendingIntent.getBroadcast(c, 0,
                new Intent(c, PrankReceiver.class).setAction(PrankReceiver.ACTION_FIRE),
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        am.cancel(pi);

        JSONObject cfg = config(c);
        if (!isActive(cfg)) return;
        long next = nextTrigger(c, cfg, System.currentTimeMillis());
        // 정확한 시각일 필요가 없으므로(불시니까!) 권한이 필요 없는 inexact + Doze 허용 알람을 쓴다.
        if (next > 0) am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, next, pi);
    }

    private static long nextTrigger(Context c, JSONObject cfg, long now) {
        SharedPreferences p = prefs(c);
        List<Long> plan = parse(p.getString(KEY_PLAN, ""));
        long planDay = p.getLong(KEY_PLAN_DAY, 0);
        long today = windowStart(cfg, now);

        while (!plan.isEmpty() && plan.get(0) <= now) plan.remove(0);
        if (plan.isEmpty()) {
            // 설정 직후엔 오늘 남은 시간부터, 오늘 일정을 다 썼으면 내일부터
            long day = planDay < today ? today : addDays(planDay, 1);
            for (int i = 0; plan.isEmpty() && i < 3; i++, day = addDays(day, 1)) {
                plan = planDay(cfg, day, now);
                planDay = day;
            }
        }
        p.edit().putString(KEY_PLAN, join(plan)).putLong(KEY_PLAN_DAY, planDay).apply();
        return plan.isEmpty() ? -1 : plan.get(0);
    }

    /** 오늘 남은 작전 횟수 (언제인지는 비밀). */
    static int remainingToday(Context c) {
        JSONObject cfg = config(c);
        if (!isActive(cfg)) return 0;
        long now = System.currentTimeMillis();
        long end = windowStart(cfg, now) + windowLength(cfg);
        int n = 0;
        for (long t : parse(prefs(c).getString(KEY_PLAN, ""))) if (t > now && t < end) n++;
        return n;
    }

    /** Doze 로 조금 늦게 울릴 수 있으니 시간대 끝에서 30분까지는 봐준다. */
    static boolean inWindow(JSONObject cfg, long now) {
        long start = windowStart(cfg, now);
        return now >= start && now <= start + windowLength(cfg) + HOUR / 2;
    }

    private static List<Long> planDay(JSONObject cfg, long start, long now) {
        int count;
        switch (cfg.optString("freq", "normal")) {
            case "quiet": count = 1 + RANDOM.nextInt(2); break;   // 1~2
            case "thrill": count = 6 + RANDOM.nextInt(4); break;  // 6~9
            default: count = 3 + RANDOM.nextInt(3);               // 3~5
        }
        long slot = windowLength(cfg) / count;
        List<Long> out = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            long t = start + i * slot + (long) (slot * (0.1 + 0.8 * RANDOM.nextDouble()));
            if (t > now + 60_000) out.add(t);
        }
        return out;
    }

    /** now 가 속한 작전일의 시작 시각. 22~02시처럼 자정을 넘는 시간대도 처리한다. */
    private static long windowStart(JSONObject cfg, long now) {
        Calendar cal = Calendar.getInstance();
        cal.setTimeInMillis(now);
        cal.set(Calendar.HOUR_OF_DAY, cfg.optInt("start", 9));
        cal.set(Calendar.MINUTE, 0);
        cal.set(Calendar.SECOND, 0);
        cal.set(Calendar.MILLISECOND, 0);
        long start = cal.getTimeInMillis();
        if (start > now) {
            long yesterday = addDays(start, -1);
            if (now < yesterday + windowLength(cfg)) return yesterday;
        }
        return start;
    }

    private static long windowLength(JSONObject cfg) {
        int hours = ((cfg.optInt("end", 18) - cfg.optInt("start", 9)) % 24 + 24) % 24;
        return (hours == 0 ? 24 : hours) * HOUR;
    }

    private static long addDays(long t, int days) {
        Calendar cal = Calendar.getInstance();
        cal.setTimeInMillis(t);
        cal.add(Calendar.DAY_OF_MONTH, days);
        return cal.getTimeInMillis();
    }

    private static List<Long> parse(String s) {
        List<Long> out = new ArrayList<>();
        if (!s.isEmpty()) for (String part : s.split(",")) out.add(Long.parseLong(part));
        return out;
    }

    private static String join(List<Long> plan) {
        StringBuilder sb = new StringBuilder();
        for (long t : plan) sb.append(sb.length() > 0 ? "," : "").append(t);
        return sb.toString();
    }

    // ---- 앱이 닫혀 있는 동안의 작전 기록. 앱을 열면 JS 가 가져가 집계한다. ----

    static synchronized void logEvent(Context c, long t, String charId, String mode) {
        SharedPreferences p = prefs(c);
        try {
            JSONArray arr = new JSONArray(p.getString(KEY_EVENTS, "[]"));
            arr.put(new JSONObject().put("t", t).put("char", charId).put("mode", mode));
            while (arr.length() > MAX_EVENTS) arr.remove(0);
            p.edit().putString(KEY_EVENTS, arr.toString()).apply();
        } catch (JSONException ignored) {
        }
    }

    static synchronized String drainEvents(Context c) {
        SharedPreferences p = prefs(c);
        String events = p.getString(KEY_EVENTS, "[]");
        p.edit().remove(KEY_EVENTS).apply();
        return events;
    }
}
