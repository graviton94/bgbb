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
 * 작전 1회: 참여 중인 친구 하나를 골라, 그 순간의 진짜 폰 상태대로 반응한다.
 *   소리 모드        → 소리 재생   = 대담 (loud)
 *   진동 모드        → 진동만      = 소심 (soft)
 *   무음 / 방해금지   → 아무것도 X  = 꾹참 (hold)
 */
final class PrankPlayer {

    static final String DIY_FILE = "diy_sound";
    private static final Random RANDOM = new Random();
    private static final double EPIC_CHANCE = 0.02;

    private PrankPlayer() {}

    /** done 은 끝났을 때 메인 스레드에서 정확히 한 번 불린다. */
    static void fire(Context c, Runnable done) {
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
        PrankScheduler.logEvent(c, System.currentTimeMillis(), charId, mode);
        PrankNotifier.post(c, charId, mode);

        if ("loud".equals(mode)) {
            play(c, charId, sound, done);
        } else {
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

    static String deviceMode(Context c) {
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        if (nm != null && nm.getCurrentInterruptionFilter() > NotificationManager.INTERRUPTION_FILTER_ALL) {
            return "hold";
        }
        AudioManager am = c.getSystemService(AudioManager.class);
        int ringer = am != null ? am.getRingerMode() : AudioManager.RINGER_MODE_NORMAL;
        // 소리는 알림 볼륨을 따르니까, 벨소리 모드여도 알림 볼륨이 0 이면 참음 (기준을 하나로)
        if (ringer == AudioManager.RINGER_MODE_NORMAL) return am != null && am.getStreamVolume(AudioManager.STREAM_NOTIFICATION) == 0 ? "hold" : "loud";
        if (ringer == AudioManager.RINGER_MODE_VIBRATE) return "soft";
        return "hold";
    }

    /** 앱 안에서 내는 방구 소리 (연습 · 캐릭터 누르기 · 함정)도 알람과 똑같이 알림 볼륨으로. 무음 · 진동이면 시스템이 막는다. */
    static void playToot(Context c, String charId, String sound) {
        new Handler(Looper.getMainLooper()).post(() -> play(c, charId, sound, () -> { }));
    }

    private static void play(Context c, String charId, String sound, Runnable done) {
        Handler main = new Handler(Looper.getMainLooper());
        MediaPlayer mp = new MediaPlayer();
        boolean[] finished = {false};
        Runnable finish = () -> {
            if (finished[0]) return;
            finished[0] = true;
            mp.release();
            done.run();
        };
        try {
            // 알림 소리로 취급: 알림 볼륨을 따르고 방해금지 모드에서는 시스템이 막는다.
            mp.setAudioAttributes(new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION_EVENT)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build());
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
            mp.setOnPreparedListener(MediaPlayer::start);
            mp.setOnCompletionListener(p -> finish.run());
            mp.setOnErrorListener((p, what, extra) -> { finish.run(); return true; });
            mp.prepareAsync();
            // 콜백이 안 오더라도 브로드캐스트 제한 시간(10초) 안에 끝낸다.
            main.postDelayed(finish, 6000);
        } catch (Exception e) {
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
