package io.github.graviton94.bgbb;

import android.app.NotificationManager;
import android.content.Context;
import android.content.res.AssetFileDescriptor;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.os.Handler;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

/**
 * 작전 1회: 참여 중인 친구 하나를 골라, 그 순간의 진짜 폰 상태대로 반응한다 (미디어 볼륨 기준).
 *   방해금지                    → 아무것도 X  = 참음 (hold)
 *   미디어 볼륨 > 0              → 소리 (미디어 볼륨 크기, 이어폰이 꽂혀 있으면 이어폰으로) = 냄 (loud)
 *   미디어 볼륨 0 + 무음 모드     → 아무것도 X  = 참음 (hold)
 *   미디어 볼륨 0 (그 밖)         → 진동만      = 진동 (soft)
 *   절전 모드 · 알람이 5분 넘게 늦게 옴 → 아무것도 X = 참음 (화면 켤 때 몰아 터져 칭호 받는 것 방지)
 * 06~24시 밖 · 쫄 시간 · 비상탈출이면 여기까지 오지도 않는다 (PrankReceiver).
 */
final class PrankPlayer {

    static final String DIY_FILE = "diy_sound";
    private static final Random RANDOM = new Random();
    private static final double EPIC_CHANCE = 0.02;
    private static final long LATE_MS = 5 * 60_000L;

    private PrankPlayer() {}

    /** done 은 끝났을 때 메인 스레드에서 정확히 한 번 불린다. */
    static void fire(Context c, Runnable outer) {
        fire(c, outer, false);
    }

    /** scheduled = 작전 알람이 깨운 것 (늦게 왔는지 본다) */
    static void fire(Context c, Runnable outer, boolean scheduled) {
        // 화면이 꺼져 있어도 소리 · 진동이 끝날 때까지 CPU 를 깨워 둔다 (안 그러면 기록만 남고 소리가 안 날 수 있음)
        android.os.PowerManager pm = c.getSystemService(android.os.PowerManager.class);
        android.os.PowerManager.WakeLock lock = pm == null ? null : pm.newWakeLock(android.os.PowerManager.PARTIAL_WAKE_LOCK, "bgbb:toot");
        if (lock != null) lock.acquire(9_000);
        Runnable done = () -> {
            if (lock != null && lock.isHeld()) lock.release();
            outer.run();
        };
        JSONArray sounds = PrankScheduler.config(c).optJSONArray("sounds");
        if (sounds == null || sounds.length() == 0) {
            done.run();
            return;
        }
        JSONObject pick = sounds.optJSONObject(RANDOM.nextInt(sounds.length()));
        String charId = pick.optString("char", "hamster");
        // 소리 종류는 매번 랜덤 (src/data.js 의 pickStyle 과 같다): 기본 55% · 소심 30% · 우렁찬 15%, 내 목소리 섞은 친구는 25% 내 목소리
        boolean diy = pick.optBoolean("diy") && new File(c.getFilesDir(), DIY_FILE).exists();
        String sound = pickStyle(diy);
        String mode = deviceMode(c);
        String why = holdReason(c);   // 참음이면 왜 (앱 터지는 화면에 보여 줌)
        // 공정하게: 폰이 깊이 잠들어 알람이 5분 넘게 늦게 왔으면 (화면 켤 때 몰아서 터지는 경우) 소리 없이 참음으로
        long due = PrankScheduler.due(c), late = System.currentTimeMillis() - due;
        if (scheduled && due > 0 && late > LATE_MS) {
            mode = "hold";
            why = "late" + (late / 60_000);
        }
        long t = System.currentTimeMillis();
        if ("loud".equals(mode)) {
            // '냄' 은 소리가 실제로 재생되기 시작했을 때만 기록 (재생 실패면 참음 · 소리 안 남)
            play(c, charId, sound, done, ok -> {
                PrankScheduler.logEvent(c, t, charId, ok ? "loud" : "hold", ok ? null : "nosound");
                PrankNotifier.post(c, charId, ok ? "loud" : "hold");
            });
        } else {
            PrankScheduler.logEvent(c, t, charId, mode, "hold".equals(mode) ? why : null);
            PrankNotifier.post(c, charId, mode);
            if ("soft".equals(mode)) vibrate(c, charId, sound);
            done.run();
        }
    }

    static String pickStyle(boolean diy) {
        if (diy && RANDOM.nextDouble() < 0.25) return "diy";
        double r = RANDOM.nextDouble();
        if (r < 0.55) return "main";
        if (r < 0.85) return "soft";
        return "loud";
    }

    /** 참음인 이유: dnd · saver · silent (참음이 아니면 null) */
    static String holdReason(Context c) {
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        if (nm != null && nm.getCurrentInterruptionFilter() > NotificationManager.INTERRUPTION_FILTER_ALL) return "dnd";
        if (powerSave(c)) return "saver";
        return "hold".equals(deviceMode(c)) ? "silent" : null;
    }

    static String deviceMode(Context c) {
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        if (nm != null && nm.getCurrentInterruptionFilter() > NotificationManager.INTERRUPTION_FILTER_ALL) {
            return "hold";
        }
        if (powerSave(c)) return "hold";   // 절전 모드 = 참음 (알람이 밀릴 수 있으니 공정하게)
        AudioManager am = c.getSystemService(AudioManager.class);
        if (am == null) return "hold";
        if (am.getStreamVolume(AudioManager.STREAM_MUSIC) > 0) return "loud";
        return am.getRingerMode() == AudioManager.RINGER_MODE_SILENT ? "hold" : "soft";
    }

    static boolean powerSave(Context c) {
        android.os.PowerManager pm = c.getSystemService(android.os.PowerManager.class);
        return pm != null && pm.isPowerSaveMode();
    }

    /** 홈 상태 줄용: {"mode": loud|soft|hold, "vol": 지금 미디어 볼륨, "max": 최대, "dnd": 방해금지} */
    static String status(Context c) {
        AudioManager am = c.getSystemService(AudioManager.class);
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        boolean dnd = nm != null && nm.getCurrentInterruptionFilter() > NotificationManager.INTERRUPTION_FILTER_ALL;
        try {
            return new JSONObject().put("mode", deviceMode(c)).put("dnd", dnd).put("saver", powerSave(c))
                    .put("vol", am != null ? am.getStreamVolume(AudioManager.STREAM_MUSIC) : 0)
                    .put("max", am != null ? am.getStreamMaxVolume(AudioManager.STREAM_MUSIC) : 15).toString();
        } catch (org.json.JSONException e) {
            return "{}";
        }
    }

    /** 홈의 음소거 버튼: 미디어 볼륨을 0 으로 / 아까 크기로 되돌림 (없으면 최대의 절반) */
    static void setMuted(Context c, boolean muted) {
        AudioManager am = c.getSystemService(AudioManager.class);
        if (am == null) return;
        android.content.SharedPreferences p = c.getSharedPreferences("bgbb", Context.MODE_PRIVATE);
        int max = am.getStreamMaxVolume(AudioManager.STREAM_MUSIC), now = am.getStreamVolume(AudioManager.STREAM_MUSIC);
        try {
            if (muted) {
                if (now > 0) p.edit().putInt("lastMediaVol", now).apply();
                am.setStreamVolume(AudioManager.STREAM_MUSIC, 0, 0);
            } else {
                am.setStreamVolume(AudioManager.STREAM_MUSIC, Math.max(1, p.getInt("lastMediaVol", max / 2)), 0);
            }
        } catch (SecurityException ignored) {
            // 방해금지 등으로 시스템이 막으면 그대로 둔다
        }
    }

    /** 앱 안에서 직접 누른 방구 소리 (짤 뽑기 · 연습 · 캐릭터 · 함정): 작전과 같은 규칙 (쫄 시간 · 비상탈출과 상관없음)
     *  미디어 볼륨 > 0 → 소리만 · 미디어 0 → 진동만 · 무음 모드 / 방해금지 → 아무것도 X */
    static void playToot(Context c, String charId, String sound) {
        String mode = deviceMode(c);
        if ("loud".equals(mode)) new Handler(Looper.getMainLooper()).post(() -> play(c, charId, sound, () -> { }, null));
        else if ("soft".equals(mode)) vibrate(c, charId, sound);
    }

    /** started: 재생이 실제로 시작됐으면 true, 준비 실패 · 6초 안에 시작 못 하면 false (정확히 한 번) */
    private static void play(Context c, String charId, String sound, Runnable done, java.util.function.Consumer<Boolean> started) {
        boolean[] told = {false};
        java.util.function.Consumer<Boolean> tell = ok -> {
            if (told[0] || started == null) return;
            told[0] = true;
            started.accept(ok);
        };
        Handler main = new Handler(Looper.getMainLooper());
        MediaPlayer mp = new MediaPlayer();
        AudioAttributes attrs = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_MEDIA)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build();
        // 노래를 듣고 있으면 그동안 노래 소리를 잠깐 줄인다 (안 그러면 이어폰 속 노래에 묻혀 안 들림)
        AudioManager am = c.getSystemService(AudioManager.class);
        android.media.AudioFocusRequest focus = new android.media.AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
                .setAudioAttributes(attrs).build();
        boolean[] finished = {false};
        Runnable finish = () -> {
            if (finished[0]) return;
            finished[0] = true;
            mp.release();
            if (am != null) am.abandonAudioFocusRequest(focus);
            done.run();
        };
        try {
            // 미디어 소리: 미디어 볼륨을 따르고, 이어폰 · 블루투스가 연결돼 있으면 그쪽으로 (나만 들음)
            mp.setAudioAttributes(attrs);
            if (am != null) am.requestAudioFocus(focus);   // 거절돼도 (백그라운드 제한 등) 그냥 낸다
            File diy = new File(c.getFilesDir(), DIY_FILE);
            if ("diy".equals(sound) && diy.exists()) {
                mp.setDataSource(diy.getAbsolutePath());
            } else {
                String style = "soft".equals(sound) || "loud".equals(sound) ? sound : "main";
                // 햄찌는 아주 가끔(2%) 스타일과 상관없이 레어 방구 (웹 audio.js 의 EPIC_CHANCE 와 같다)
                if ("hamster".equals(charId) && RANDOM.nextDouble() < EPIC_CHANCE) style = "epic";
                // 같은 소리도 매번 다르게: <캐릭터>_<스타일>, _2, _3 … 있는 것 중 하나
                String base = charId + "_" + style;
                List<Integer> takes = new ArrayList<>();
                for (int n = 1; n <= 9; n++) {
                    int id = c.getResources().getIdentifier(n == 1 ? base : base + "_" + n, "raw", c.getPackageName());
                    if (id == 0) break;
                    takes.add(id);
                }
                if (takes.isEmpty()) throw new IllegalStateException("no sound " + base);
                int res = takes.get(RANDOM.nextInt(takes.size()));
                try (AssetFileDescriptor afd = c.getResources().openRawResourceFd(res)) {
                    mp.setDataSource(afd.getFileDescriptor(), afd.getStartOffset(), afd.getLength());
                }
            }
            mp.setOnPreparedListener(p -> {
                p.start();
                tell.accept(p.isPlaying());
            });
            mp.setOnCompletionListener(p -> finish.run());
            mp.setOnErrorListener((p, what, extra) -> { tell.accept(false); finish.run(); return true; });
            mp.prepareAsync();
            // 콜백이 안 오더라도 브로드캐스트 제한 시간(10초) 안에 끝낸다.
            main.postDelayed(() -> { tell.accept(false); finish.run(); }, 6000);
        } catch (Exception e) {
            tell.accept(false);
            finish.run();
        }
    }

    // 진동 모드: 친구 · 소리 종류마다 세기와 길이가 다르다 (src/data.js 의 VIBES 와 같은 값).
    // {켜짐/꺼짐 ms 번갈아}, {켜짐마다 세기 1~255}
    private static final java.util.Map<String, long[][]> VIBES = new java.util.HashMap<>();
    static {
        VIBES.put("hamster_soft", new long[][]{{60, 40, 80}, {90, 120}});
        VIBES.put("hamster_main", new long[][]{{120, 60, 220}, {160, 200}});
        VIBES.put("hamster_loud", new long[][]{{180, 40, 160, 40, 420}, {200, 230, 255}});
        VIBES.put("hamster_epic", new long[][]{{100, 30, 100, 30, 100, 30, 700}, {255, 255, 255, 255}});
        VIBES.put("tit_soft", new long[][]{{40, 40, 40, 40, 40}, {80, 80, 80}});
        VIBES.put("tit_main", new long[][]{{50, 40, 50, 40, 50, 40, 120}, {140, 140, 140, 170}});
        VIBES.put("tit_loud", new long[][]{{60, 30, 60, 30, 60, 30, 60, 30, 300}, {220, 220, 220, 220, 255}});
        VIBES.put("cat_soft", new long[][]{{300}, {70}});
        VIBES.put("cat_main", new long[][]{{200, 80, 400}, {110, 150}});
        VIBES.put("cat_loud", new long[][]{{250, 60, 700}, {200, 255}});
        VIBES.put("diy", new long[][]{{150, 60, 300}, {150, 220}});
    }

    private static void vibrate(Context c, String charId, String sound) {
        Vibrator vib = c.getSystemService(Vibrator.class);
        if (vib == null || !vib.hasVibrator()) return;
        String key = "diy".equals(sound) ? "diy" : charId + "_" + ("soft".equals(sound) || "loud".equals(sound) ? sound : "main");
        // 햄찌 레어 방구는 진동도 레어 (소리와 같은 2%)
        if ("hamster".equals(charId) && !"diy".equals(sound) && RANDOM.nextDouble() < EPIC_CHANCE) key = "hamster_epic";
        long[][] v = VIBES.containsKey(key) ? VIBES.get(key) : VIBES.get("diy");
        long[] on = v[0];
        long[] timings = new long[on.length + 1];   // 맨 앞 0 = 바로 시작
        int[] amps = new int[on.length + 1];
        for (int i = 0; i < on.length; i++) {
            timings[i + 1] = on[i];
            amps[i + 1] = i % 2 == 0 ? (int) v[1][i / 2] : 0;
        }
        if (vib.hasAmplitudeControl()) vib.vibrate(VibrationEffect.createWaveform(timings, amps, -1));
        else vib.vibrate(VibrationEffect.createWaveform(timings, -1));
    }
}
