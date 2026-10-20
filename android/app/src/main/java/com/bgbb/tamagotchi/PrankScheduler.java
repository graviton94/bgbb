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
 * 불시 작전 스케줄러.
 *
 * 하루치 작전 시각(N회)을 작전 시간대 안에서 미리 뽑아두고, 가장 가까운 한 번만
 * AlarmManager 에 걸어둔다. 알람이 울리면 PrankReceiver 가 소리를 내고 다음 것을 건다.
 * 상주 서비스·WakeLock 없이 Doze 중에도 깨어나므로 대기 중 배터리 소모가 사실상 0.
 *
 * 일정 계산은 app.js 의 planDay() 와 같은 규칙을 쓴다 (시간대를 N칸으로 나눠 칸마다 한 번).
 */
final class PrankScheduler {

    static final String PREFS = "bgbb";
    private static final String KEY_CONFIG = "config";
    private static final String KEY_PLAN = "plan";
    private static final String KEY_PLAN_DAY = "planDay";
    private static final String KEY_EVENTS = "events";
    private static final int MAX_EVENTS = 500;
    private static final long HOUR = 60 * 60 * 1000L;
    private static final Random RANDOM = new Random();

    private PrankScheduler() {}

    static SharedPreferences prefs(Context c) {
        return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    /** JS 에서 받은 설정을 저장하고 오늘 일정을 새로 짠다. */
    static void configure(Context c, String json) {
        prefs(c).edit()
                .putString(KEY_CONFIG, json)
                .remove(KEY_PLAN)
                .remove(KEY_PLAN_DAY)
                .apply();
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
        return cfg.optBoolean("on", false) && !cfg.optBoolean("frozen", false)
                && cfg.optJSONArray("sounds") != null && cfg.optJSONArray("sounds").length() > 0;
    }

    /** 지난 일정을 버리고 다음 작전 하나만 알람으로 건다. */
    static void reschedule(Context c) {
        AlarmManager am = c.getSystemService(AlarmManager.class);
        PendingIntent pi = alarmIntent(c);
        am.cancel(pi);

        JSONObject cfg = config(c);
        if (!isActive(cfg)) return;

        long next = nextTrigger(c, cfg, System.currentTimeMillis());
        if (next > 0) {
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, next, pi);
        }
    }

    private static PendingIntent alarmIntent(Context c) {
        Intent i = new Intent(c, PrankReceiver.class).setAction(PrankReceiver.ACTION_FIRE);
        return PendingIntent.getBroadcast(c, 0, i,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static long nextTrigger(Context c, JSONObject cfg, long now) {
        SharedPreferences p = prefs(c);
        List<Long> plan = parsePlan(p.getString(KEY_PLAN, ""));
        long planDay = p.getLong(KEY_PLAN_DAY, 0);
        long today = windowStart(cfg, now);

        while (!plan.isEmpty() && plan.get(0) <= now) plan.remove(0);

        // 오늘 일정을 다 썼으면 다음 날 일정을 짠다 (설정을 바꾼 직후엔 오늘 남은 시간부터).
        if (plan.isEmpty()) {
            long day = (planDay < today) ? today : addDays(planDay, 1);
            for (int d = 0; plan.isEmpty() && d < 3; d++) {
                plan = planDay(cfg, day, now);
                planDay = day;
                day = addDays(day, 1);
            }
        }

        p.edit().putString(KEY_PLAN, joinPlan(plan)).putLong(KEY_PLAN_DAY, planDay).apply();
        return plan.isEmpty() ? -1 : plan.get(0);
    }

    /** 남은 오늘 작전 횟수 (정확한 시각은 비밀). */
    static int remainingToday(Context c) {
        JSONObject cfg = config(c);
        if (!isActive(cfg)) return 0;
        long now = System.currentTimeMillis();
        long dayEnd = windowStart(cfg, now) + windowLength(cfg);
        int n = 0;
        for (long t : parsePlan(prefs(c).getString(KEY_PLAN, ""))) {
            if (t > now && t < dayEnd) n++;
        }
        return n;
    }

    /** 현재 시각이 작전 시간대 안인지 (Doze 로 조금 늦게 울린 경우를 위해 30분 여유). */
    static boolean inWindow(JSONObject cfg, long now) {
        long start = windowStart(cfg, now);
        return now >= start && now <= start + windowLength(cfg) + HOUR / 2;
    }

    // ---- 일정 계산 ----

    private static List<Long> planDay(JSONObject cfg, long start, long now) {
        int count = dailyCount(cfg.optString("freq", "normal"));
        long len = windowLength(cfg);
        long slot = len / count;
        List<Long> out = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            // 칸 양끝 10%는 비워서 연달아 울리지 않게 한다.
            long t = start + i * slot + (long) (slot * (0.1 + 0.8 * RANDOM.nextDouble()));
            if (t > now + 60_000) out.add(t);
        }
        return out;
    }

    static int dailyCount(String freq) {
        switch (freq) {
            case "quiet": return 1 + RANDOM.nextInt(2);   // 1~2
            case "thrill": return 6 + RANDOM.nextInt(4);  // 6~9
            default: return 3 + RANDOM.nextInt(3);        // 3~5
        }
    }

    /** now 가 속한 작전일의 시작 시각. 자정을 넘는 시간대(22~02시)도 처리. */
    private static long windowStart(JSONObject cfg, long now) {
        Calendar cal = Calendar.getInstance();
        cal.setTimeInMillis(now);
        cal.set(Calendar.HOUR_OF_DAY, cfg.optInt("start", 9));
        cal.set(Calendar.MINUTE, 0);
        cal.set(Calendar.SECOND, 0);
        cal.set(Calendar.MILLISECOND, 0);
        long start = cal.getTimeInMillis();
        if (start > now && now < addDays(start, -1) + windowLength(cfg)) {
            start = addDays(start, -1);
        }
        return start;
    }

    private static long windowLength(JSONObject cfg) {
        int start = cfg.optInt("start", 9);
        int end = cfg.optInt("end", 18);
        int hours = ((end - start) % 24 + 24) % 24;
        return (hours == 0 ? 24 : hours) * HOUR;
    }

    private static long addDays(long t, int days) {
        Calendar cal = Calendar.getInstance();
        cal.setTimeInMillis(t);
        cal.add(Calendar.DAY_OF_MONTH, days);
        return cal.getTimeInMillis();
    }

    private static List<Long> parsePlan(String s) {
        List<Long> out = new ArrayList<>();
        if (s.isEmpty()) return out;
        for (String part : s.split(",")) out.add(Long.parseLong(part));
        return out;
    }

    private static String joinPlan(List<Long> plan) {
        StringBuilder sb = new StringBuilder();
        for (long t : plan) {
            if (sb.length() > 0) sb.append(',');
            sb.append(t);
        }
        return sb.toString();
    }

    // ---- 앱이 닫혀 있는 동안 생긴 작전 기록 (앱을 열면 JS 가 가져간다) ----

    static synchronized void logEvent(Context c, JSONObject event) {
        SharedPreferences p = prefs(c);
        try {
            JSONArray arr = new JSONArray(p.getString(KEY_EVENTS, "[]"));
            arr.put(event);
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
