package io.github.graviton94.bgbb;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import org.json.JSONObject;
import org.junit.Test;

import java.text.SimpleDateFormat;
import java.util.List;
import java.util.Locale;
import java.util.TimeZone;

/** 일정 규칙이 src/plan.js 와 같은지 확인한다 (tests/plan.test.mjs 와 같은 경우들). */
public class PrankSchedulerTest {

    private static final long H = 3_600_000L;

    private static long at(String s) throws Exception {
        TimeZone.setDefault(TimeZone.getTimeZone("Asia/Seoul"));
        SimpleDateFormat f = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm", Locale.ROOT);
        f.setTimeZone(TimeZone.getTimeZone("Asia/Seoul"));
        return f.parse(s).getTime();
    }

    private static JSONObject cfg(int start, int end, String freq) throws Exception {
        return new JSONObject().put("start", start).put("end", end).put("freq", freq);
    }

    @Test
    public void windowLength() throws Exception {
        assertEquals(9 * H, PrankScheduler.windowLength(cfg(9, 18, "normal")));
        assertEquals(4 * H, PrankScheduler.windowLength(cfg(22, 2, "normal")));
        assertEquals(24 * H, PrankScheduler.windowLength(cfg(0, 0, "normal")));
    }

    @Test
    public void windowStartHandlesOvernight() throws Exception {
        assertEquals(at("2026-10-20T09:00"), PrankScheduler.windowStart(cfg(9, 18, "normal"), at("2026-10-20T08:00")));
        assertEquals(at("2026-10-20T22:00"), PrankScheduler.windowStart(cfg(22, 2, "normal"), at("2026-10-21T01:00")));
        assertEquals(at("2026-10-21T22:00"), PrankScheduler.windowStart(cfg(22, 2, "normal"), at("2026-10-21T03:00")));
        assertTrue(PrankScheduler.inWindow(cfg(22, 2, "normal"), at("2026-10-21T01:00")));
    }

    @Test
    public void planStaysInsideWindowWithRightCountAndGap() throws Exception {
        long start = at("2026-10-20T06:00");
        long end = at("2026-10-21T00:00");
        for (int i = 0; i < 200; i++) {
            List<Long> times = PrankScheduler.planDay(cfg(6, 0, "thrill"), start, 0);
            assertTrue(times.size() >= 8 && times.size() <= 10);
            for (int k = 0; k < times.size(); k++) {
                assertTrue(times.get(k) >= start && times.get(k) < end);
                if (k > 0) assertTrue(times.get(k) - times.get(k - 1) >= PrankScheduler.GAP);
            }
            List<Long> quiet = PrankScheduler.planDay(cfg(6, 0, "quiet"), start, 0);
            assertTrue(quiet.size() >= 3 && quiet.size() <= 4);
        }
        assertTrue(PrankScheduler.planDay(cfg(6, 0, "normal"), start, end).isEmpty());
        // 3시간짜리 시간대엔 1시간 간격으로 최대 4번
        assertTrue(PrankScheduler.planDay(cfg(9, 12, "thrill"), at("2026-10-20T09:00"), 0).size() <= 4);
    }

    @Test
    public void restHoursAreNeverPlannedAndBlockFiring() throws Exception {
        JSONObject c = cfg(6, 0, "thrill").put("rest", new JSONObject().put("on", true).put("from", 12 * 60 + 30).put("to", 14 * 60));
        for (int i = 0; i < 200; i++) {
            for (long t : PrankScheduler.planDay(c, at("2026-10-20T06:00"), 0)) assertTrue(!PrankScheduler.inRest(c, t));
        }
        assertTrue(PrankScheduler.inRest(c, at("2026-10-20T12:30")));
        assertTrue(PrankScheduler.inRest(c, at("2026-10-20T13:59")));
        assertTrue(!PrankScheduler.inRest(c, at("2026-10-20T14:00")));
    }
}
