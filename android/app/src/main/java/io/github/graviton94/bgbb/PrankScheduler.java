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
    private static final String KEY_DUE = "due";   // 지금 걸린 작전 알람의 원래 시각 (늦게 왔는지 보려고)
    // 그날 정한 하루 횟수 · 오늘 터진 횟수 · 설정이 바뀌어 남은 만큼 다시 뿌려야 하는지 (src/plan.js advancePlan 과 같은 규칙)
    private static final String KEY_PLAN_COUNT = "planCount";
    private static final String KEY_FIRED_DAY = "firedDay";
    private static final String KEY_FIRED_N = "firedN";
    private static final String KEY_RESET = "planReset";
    // 도발 알림: 비상탈출 중엔 "아직도 참고 있어?", 쫄 시간엔 아주 가끔 한 줄 (둘 다 소리·진동 없음)
    private static final String KEY_FROZEN_AT = "frozenAt";
    private static final String KEY_NAG = "nag";
    private static final String KEY_NAG_KIND = "nagKind";
    private static final String KEY_NAG_N = "nagN";
    private static final String KEY_RESUMED = "resumedByNotif";
    static final String NAG_FROZEN = "frozen", NAG_REST = "rest", NAG_SKIP = "skip";
    private static final double REST_TEASE_CHANCE = 0.3;
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
        boolean wasFrozen = config(c).optBoolean("frozen");
        // 그날 횟수는 남겨 두고 일정만 다시 (비상탈출 동안 못 터진 방구는 남은 시간으로 미룸)
        SharedPreferences.Editor e = prefs(c).edit().putString(KEY_CONFIG, json).remove(KEY_PLAN).putBoolean(KEY_RESET, true).remove(KEY_NAG);
        boolean frozen = false;
        try { frozen = new JSONObject(json).optBoolean("frozen"); } catch (JSONException ignored) { }
        if (frozen && !wasFrozen) e.putLong(KEY_FROZEN_AT, System.currentTimeMillis()).putInt(KEY_NAG_N, 0);
        if (!frozen) e.remove(KEY_FROZEN_AT);
        e.apply();
        reschedule(c);
    }

    /** 알림의 "다시 시작!" 버튼: 앱을 안 열어도 비상탈출을 푼다. 앱은 다음에 열릴 때 takeResumed 로 알게 된다. */
    static void resumeFromNotification(Context c) {
        JSONObject cfg = config(c);
        if (!cfg.optBoolean("frozen")) return;
        try { cfg.put("frozen", false); } catch (JSONException ignored) { }
        prefs(c).edit().putString(KEY_CONFIG, cfg.toString()).remove(KEY_PLAN).putBoolean(KEY_RESET, true)
                .remove(KEY_NAG).remove(KEY_FROZEN_AT).putBoolean(KEY_RESUMED, true).apply();
        reschedule(c);
    }

    /** 이번 알람이 원래 울려야 했던 시각 (모르면 0) */
    static long due(Context c) {
        return prefs(c).getLong(KEY_DUE, 0);
    }

    static boolean takeResumed(Context c) {
        boolean r = prefs(c).getBoolean(KEY_RESUMED, false);
        if (r) prefs(c).edit().remove(KEY_RESUMED).apply();
        return r;
    }

    static long frozenHours(Context c) {
        long at = prefs(c).getLong(KEY_FROZEN_AT, 0);
        return at == 0 ? 0 : Math.max(1, (System.currentTimeMillis() - at) / HOUR);
    }

    static String nagKind(Context c) {
        return prefs(c).getString(KEY_NAG_KIND, NAG_SKIP);
    }

    /** 도발 알림을 하나 쓴 뒤 (또는 건너뛴 뒤) 다음 것을 새로 잡게 한다. */
    static void nagDone(Context c) {
        SharedPreferences p = prefs(c);
        p.edit().remove(KEY_NAG).putInt(KEY_NAG_N, p.getInt(KEY_NAG_N, 0) + 1).apply();
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
        WakeAlarm.schedule(c);
        scheduleNag(c, am, cfg, System.currentTimeMillis());
        if (!isActive(cfg)) return;
        long next = nextTrigger(c, cfg, System.currentTimeMillis());
        if (next <= 0) return;
        prefs(c).edit().putLong(KEY_DUE, next).apply();
        // 정확한 알람: inexact 는 화면이 꺼져 있으면 (Doze) 한참 밀렸다가 화면 켤 때 몰려 터진다.
        // '알람 및 리마인더' 를 허용 안 했으면 어쩔 수 없이 inexact (앱이 홈에서 허용하라고 알려 줌)
        if (WakeAlarm.exactAllowed(c)) am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, next, pi);
        else am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, next, pi);
    }

    private static void scheduleNag(Context c, AlarmManager am, JSONObject cfg, long now) {
        PendingIntent pi = PendingIntent.getBroadcast(c, 1,
                new Intent(c, PrankReceiver.class).setAction(PrankReceiver.ACTION_NAG),
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        am.cancel(pi);
        SharedPreferences p = prefs(c);
        long at = p.getLong(KEY_NAG, 0);
        if (at <= now) {
            String kind = NAG_SKIP;
            at = 0;
            if (cfg.optBoolean("frozen")) {
                // 첫 도발은 2~4시간 뒤, 그 뒤로는 5~9시간마다. 잠자는 시간(0~6시)이면 아침으로 민다.
                int n = p.getInt(KEY_NAG_N, 0);
                long base = n == 0 ? Math.max(now, p.getLong(KEY_FROZEN_AT, now)) : now;
                at = awake(base + (long) ((n == 0 ? 2 + 2 * RANDOM.nextDouble() : 5 + 4 * RANDOM.nextDouble()) * HOUR));
                kind = NAG_FROZEN;
            } else if (isActive(cfg) && rest(cfg) != null) {
                // 다음 쫄 시간 (06~24시와 겹치는 부분) 중 아무 때나, 30% 확률로만. 꽝이면 그 쫄 시간이 끝날 때 다시 뽑는다.
                for (int k = 0; k < 3 && at == 0; k++) {
                    long day = addDays(windowStart(cfg, now), k);
                    long[] rest = restInside(cfg, day);
                    if (rest == null || rest[1] <= now) continue;
                    long from = Math.max(rest[0], now + 60_000);
                    if (RANDOM.nextDouble() < REST_TEASE_CHANCE) {
                        at = from + (long) (RANDOM.nextDouble() * (rest[1] - from));
                        kind = NAG_REST;
                    } else {
                        at = rest[1];
                    }
                }
            }
            if (at == 0) return;
            p.edit().putLong(KEY_NAG, at).putString(KEY_NAG_KIND, kind).apply();
        }
        am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
    }

    /** 0~6시면 그날 6시 + 0~90분으로 */
    private static long awake(long t) {
        Calendar cal = Calendar.getInstance();
        cal.setTimeInMillis(t);
        if (cal.get(Calendar.HOUR_OF_DAY) >= 6) return t;
        cal.set(Calendar.HOUR_OF_DAY, 6);
        cal.set(Calendar.MINUTE, 0);
        return cal.getTimeInMillis() + (long) (RANDOM.nextDouble() * 1.5 * HOUR);
    }

    /** 작전일 day 안에서 쉬는 시간과 겹치는 첫 구간 [a, b] (없으면 null) */
    private static long[] restInside(JSONObject cfg, long day) {
        List<long[]> open = openSegments(cfg, day);
        long end = day + windowLength(cfg), cursor = day;
        for (long[] s : open) {
            if (s[0] > cursor) return new long[]{cursor, s[0]};
            cursor = s[1];
        }
        return cursor < end ? new long[]{cursor, end} : null;
    }

    private static long nextTrigger(Context c, JSONObject cfg, long now) {
        SharedPreferences p = prefs(c);
        List<Long> plan = parse(p.getString(KEY_PLAN, ""));
        long planDay = p.getLong(KEY_PLAN_DAY, 0);
        long today = windowStart(cfg, now);

        boolean reset = p.getBoolean(KEY_RESET, false);
        int count = p.getInt(KEY_PLAN_COUNT, 0);
        if (reset) plan.clear();
        while (!plan.isEmpty() && plan.get(0) <= now) plan.remove(0);
        if (plan.isEmpty()) {
            // 설정 직후 (처음 · reset) 엔 오늘 남은 시간에 아직 안 터진 만큼, 오늘 일정을 다 썼으면 내일부터. 마지막으로 터진 뒤 GAP 은 지킨다.
            long notBefore = Math.max(now + 60_000, p.getLong(KEY_LAST, 0) + GAP);
            int fired = p.getLong(KEY_FIRED_DAY, 0) == today ? p.getInt(KEY_FIRED_N, 0) : 0;
            long day = planDay < today || planDay == 0 || (reset && planDay == today) ? today : addDays(planDay, 1);
            for (int i = 0; plan.isEmpty() && i < 3; i++, day = addDays(day, 1)) {
                int n = day == planDay && count > 0 ? count : dailyCount(cfg);
                plan = planDay(cfg, day, notBefore, day == today ? Math.max(0, n - fired) : n);
                planDay = day;
                count = n;
            }
        }
        p.edit().putString(KEY_PLAN, join(plan)).putLong(KEY_PLAN_DAY, planDay).putInt(KEY_PLAN_COUNT, count).putBoolean(KEY_RESET, false).apply();
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

    /** 06~24시 안인지. 절전 모드로 알람이 늦게 와서 24시를 넘겼으면 그 방은 버린다 (자정 넘어 터지지 않게). */
    static boolean inWindow(JSONObject cfg, long now) {
        long start = windowStart(cfg, now);
        return now >= start && now < start + windowLength(cfg);
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

    static int dailyCount(JSONObject cfg) {
        switch (cfg.optString("freq", "normal")) {
            case "quiet": return 3 + RANDOM.nextInt(2);   // 3~4
            case "thrill": return 8 + RANDOM.nextInt(3);  // 8~10
            default: return 5 + RANDOM.nextInt(3);        // 5~7
        }
    }

    static List<Long> planDay(JSONObject cfg, long start, long notBefore) {
        return planDay(cfg, start, notBefore, dailyCount(cfg));
    }

    /** start 작전일에 count 번: notBefore 이후의 열린 시간에만 고르게 뿌린다 (지난 시간은 안 씀) */
    static List<Long> planDay(JSONObject cfg, long start, long notBefore, int count) {
        List<long[]> segs = new ArrayList<>();
        for (long[] s : openSegments(cfg, start)) if (s[1] > Math.max(s[0], notBefore + 1)) segs.add(new long[]{Math.max(s[0], notBefore + 1), s[1]});
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
            out.add(t);
        }
        return out;
    }

    /** now 가 속한 작전일의 시작 시각. 22~02시처럼 자정을 넘는 시간대도 처리한다. */
    static long windowStart(JSONObject cfg, long now) {
        Calendar cal = Calendar.getInstance();
        cal.setTimeInMillis(now);
        int startMin = startMin(cfg);
        cal.set(Calendar.HOUR_OF_DAY, startMin / 60);
        cal.set(Calendar.MINUTE, startMin % 60);
        cal.set(Calendar.SECOND, 0);
        cal.set(Calendar.MILLISECOND, 0);
        long start = cal.getTimeInMillis();
        if (start > now) {
            long yesterday = addDays(start, -1);
            if (now < yesterday + windowLength(cfg)) return yesterday;
        }
        return start;
    }

    /** 방구 시간 시작 (하루 중 분): 기상 알람을 켰으면 그 시각, 아니면 06:00. src/plan.js 와 같다 */
    static int startMin(JSONObject cfg) {
        return cfg.has("startMin") ? cfg.optInt("startMin") : cfg.optInt("start", 6) * 60;
    }

    static long windowLength(JSONObject cfg) {
        int minutes = ((cfg.optInt("end", 0) * 60 - startMin(cfg)) % 1440 + 1440) % 1440;
        return (minutes == 0 ? 1440 : minutes) * 60_000L;
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
        long day = windowStart(config(c), t);
        int n = p.getLong(KEY_FIRED_DAY, 0) == day ? p.getInt(KEY_FIRED_N, 0) : 0;
        p.edit().putLong(KEY_LAST, t).putLong(KEY_FIRED_DAY, day).putInt(KEY_FIRED_N, n + 1).apply();
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
