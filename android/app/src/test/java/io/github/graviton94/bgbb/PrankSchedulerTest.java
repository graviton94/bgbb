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
    public void planStaysInsideWindowWithRightCount() throws Exception {
        long start = at("2026-10-20T09:00");
        long end = at("2026-10-20T18:00");
        for (int i = 0; i < 200; i++) {
            List<Long> times = PrankScheduler.planDay(cfg(9, 18, "thrill"), start, 0);
            assertTrue(times.size() >= 6 && times.size() <= 9);
            for (long t : times) assertTrue(t > start && t < end);
            List<Long> quiet = PrankScheduler.planDay(cfg(9, 18, "quiet"), start, 0);
            assertTrue(quiet.size() >= 1 && quiet.size() <= 2);
        }
        assertTrue(PrankScheduler.planDay(cfg(9, 18, "normal"), start, end).isEmpty());
    }
}
