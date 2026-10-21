package io.github.graviton94.bgbb;

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
 * 일정 규칙은 src/plan.js 와 같다: 작전 시간대에서 쉬는 시간을 뺀 열린 시간에 하루 N번,
 * 서로 최소 1시간(GAP)은 떨어지게 아무 데나 뽑는다.
 */
final class PrankScheduler {

    private static final String PREFS = "bgbb";
    private static final String KEY_CONFIG = "config";
    private static final String KEY_PLAN = "plan";
    private static final String KEY_PLAN_DAY = "planDay";
    private static final String KEY_EVENTS = "events";
    private static final String KEY_LAST = "lastFire";
    static final long GAP = 3_600_000L;
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
            // 설정 직후엔 오늘 남은 시간부터, 오늘 일정을 다 썼으면 내일부터. 마지막으로 터진 뒤 GAP 은 지킨다.
            long notBefore = Math.max(now + 60_000, p.getLong(KEY_LAST, 0) + GAP);
            long day = planDay < today ? today : addDays(planDay, 1);
            for (int i = 0; plan.isEmpty() && i < 3; i++, day = addDays(day, 1)) {
                plan = planDay(cfg, day, notBefore);
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

    // 쉬는 시간 (쫄?): rest = { on, from, to } — 하루 중 분 (0~1439), 자정 넘김 포함. src/plan.js 와 같다.
    private static JSONObject rest(JSONObject cfg) {
        JSONObject rest = cfg.optJSONObject("rest");
        return rest != null && rest.optBoolean("on") && rest.optInt("from") != rest.optInt("to") ? rest : null;
    }

    private static int restMinutes(JSONObject rest) {
        return ((rest.optInt("to") - rest.optInt("from")) % 1440 + 1440) % 1440;
    }

    /** 매일 쉬는 시간 안인지. 이때는 알람이 와도 안 터진다. */
    static boolean inRest(JSONObject cfg, long now) {
        JSONObject rest = rest(cfg);
        if (rest == null) return false;
        Calendar cal = Calendar.getInstance();
        cal.setTimeInMillis(now);
        int m = cal.get(Calendar.HOUR_OF_DAY) * 60 + cal.get(Calendar.MINUTE);
        return ((m - rest.optInt("from")) % 1440 + 1440) % 1440 < restMinutes(rest);
    }

    /** 작전일 [start, start+길이) 에서 쉬는 시간을 뺀 열린 구간들 */
    static List<long[]> openSegments(JSONObject cfg, long start) {
        List<long[]> segs = new ArrayList<>();
        segs.add(new long[]{start, start + windowLength(cfg)});
        JSONObject rest = rest(cfg);
        if (rest == null) return segs;
        long len = restMinutes(rest) * 60_000L;
        for (int k = -1; k <= 1; k++) {
            Calendar cal = Calendar.getInstance();
            cal.setTimeInMillis(start);
            cal.add(Calendar.DAY_OF_MONTH, k);
            cal.set(Calendar.HOUR_OF_DAY, 0);
            cal.set(Calendar.MINUTE, 0);
            cal.set(Calendar.SECOND, 0);
            cal.set(Calendar.MILLISECOND, 0);
            cal.add(Calendar.MINUTE, rest.optInt("from"));
            long rs = cal.getTimeInMillis(), re = rs + len;
            List<long[]> out = new ArrayList<>();
            for (long[] s : segs) {
                if (re <= s[0] || rs >= s[1]) { out.add(s); continue; }
                if (rs > s[0]) out.add(new long[]{s[0], rs});
                if (re < s[1]) out.add(new long[]{re, s[1]});
            }
            segs = out;
        }
        return segs;
    }

    static List<Long> planDay(JSONObject cfg, long start, long notBefore) {
        int count;
        switch (cfg.optString("freq", "normal")) {
            case "quiet": count = 3 + RANDOM.nextInt(2); break;   // 3~4
            case "thrill": count = 8 + RANDOM.nextInt(3); break;  // 8~10
            default: count = 5 + RANDOM.nextInt(3);               // 5~7
        }
        List<long[]> segs = openSegments(cfg, start);
        long open = 0;
        for (long[] s : segs) open += s[1] - s[0];
        List<Long> out = new ArrayList<>();
        int n = (int) Math.min(count, open / GAP + 1);
        if (open <= 0 || n <= 0) return out;
        // 열린 시간에서 (n-1)×GAP 을 접은 구간에 n개를 뿌리고, 정렬한 뒤 i×GAP 을 더해 편다 → 서로 GAP 이상
        long slack = open - (n - 1) * GAP;
        long[] offs = new long[n];
        for (int i = 0; i < n; i++) offs[i] = (long) (RANDOM.nextDouble() * slack);
        java.util.Arrays.sort(offs);
        for (int i = 0; i < n; i++) {
            long o = offs[i] + i * GAP, t = segs.get(segs.size() - 1)[1] - 1;
            for (long[] s : segs) {
                if (o < s[1] - s[0]) { t = s[0] + o; break; }
                o -= s[1] - s[0];
            }
            if (t > notBefore) out.add(t);
        }
        return out;
    }

    /** now 가 속한 작전일의 시작 시각. 22~02시처럼 자정을 넘는 시간대도 처리한다. */
    static long windowStart(JSONObject cfg, long now) {
        Calendar cal = Calendar.getInstance();
        cal.setTimeInMillis(now);
        cal.set(Calendar.HOUR_OF_DAY, cfg.optInt("start", 7));
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

    static long windowLength(JSONObject cfg) {
        int hours = ((cfg.optInt("end", 22) - cfg.optInt("start", 7)) % 24 + 24) % 24;
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
        p.edit().putLong(KEY_LAST, t).apply();
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
