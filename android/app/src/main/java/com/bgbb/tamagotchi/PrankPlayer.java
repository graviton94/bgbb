package com.bgbb.tamagotchi;

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
import java.util.Random;

/**
 * 작전 1회 실행: 친구 하나를 골라 폰의 실제 상태대로 반응한다.
 *  - 소리 모드  → 소리 재생 (대담, loud)
 *  - 진동 모드  → 진동만 (소심, soft)
 *  - 무음/방해금지 → 아무것도 안 함 (꾹참, hold)
 */
final class PrankPlayer {

    static final String DIY_FILE = "diy_sound";
    private static final Random RANDOM = new Random();

    private PrankPlayer() {}

    /** done 은 소리가 끝났거나 실패했을 때 메인 스레드에서 정확히 한 번 호출된다. */
    static void fire(Context c, Runnable done) {
        JSONArray sounds = PrankScheduler.config(c).optJSONArray("sounds");
        if (sounds == null || sounds.length() == 0) {
            done.run();
            return;
        }
        JSONObject pick = sounds.optJSONObject(RANDOM.nextInt(sounds.length()));
        String charId = pick.optString("char");
        String sound = pick.optString("sound", "main");
        String mode = deviceMode(c);

        try {
            JSONObject event = new JSONObject()
                    .put("t", System.currentTimeMillis())
                    .put("char", charId)
                    .put("mode", mode);
            PrankScheduler.logEvent(c, event);
        } catch (Exception ignored) {
        }

        if ("loud".equals(mode)) {
            play(c, charId, sound, done);
        } else {
            if ("soft".equals(mode)) vibrate(c);
            done.run();
        }
    }

    static String deviceMode(Context c) {
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        if (nm != null && nm.getCurrentInterruptionFilter() > NotificationManager.INTERRUPTION_FILTER_ALL) {
            return "hold";
        }
        AudioManager am = c.getSystemService(AudioManager.class);
        int ringer = am != null ? am.getRingerMode() : AudioManager.RINGER_MODE_NORMAL;
        if (ringer == AudioManager.RINGER_MODE_NORMAL) return "loud";
        if (ringer == AudioManager.RINGER_MODE_VIBRATE) return "soft";
        return "hold";
    }

    private static void play(Context c, String charId, String sound, Runnable done) {
        Handler main = new Handler(Looper.getMainLooper());
        boolean[] finished = {false};
        Runnable finishOnce = () -> {
            if (finished[0]) return;
            finished[0] = true;
            done.run();
        };
        MediaPlayer mp = new MediaPlayer();
        try {
            // 알림 소리로 취급 → 알림 볼륨을 따르고 방해금지 모드에서 막힌다.
            mp.setAudioAttributes(new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION_EVENT)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build());
            File diy = new File(c.getFilesDir(), DIY_FILE);
            if ("diy".equals(sound) && diy.exists()) {
                mp.setDataSource(diy.getAbsolutePath());
            } else {
                int res = c.getResources().getIdentifier(rawName(charId, sound), "raw", c.getPackageName());
                if (res == 0) throw new IllegalStateException("missing sound");
                try (AssetFileDescriptor afd = c.getResources().openRawResourceFd(res)) {
                    mp.setDataSource(afd.getFileDescriptor(), afd.getStartOffset(), afd.getLength());
                }
            }
            mp.setOnCompletionListener(p -> { p.release(); finishOnce.run(); });
            mp.setOnErrorListener((p, what, extra) -> { p.release(); finishOnce.run(); return true; });
            mp.setOnPreparedListener(MediaPlayer::start);
            mp.prepareAsync();
            // 녹음 파일이 길거나 콜백이 안 와도 브로드캐스트 제한(10초) 안에 끝낸다.
            main.postDelayed(() -> {
                if (!finished[0]) { mp.release(); finishOnce.run(); }
            }, 6000);
        } catch (Exception e) {
            mp.release();
            finishOnce.run();
        }
    }

    private static void vibrate(Context c) {
        Vibrator vib = c.getSystemService(Vibrator.class);
        if (vib != null && vib.hasVibrator()) {
            vib.vibrate(VibrationEffect.createWaveform(new long[]{0, 90, 50, 140}, -1));
        }
    }

    static String rawName(String charId, String sound) {
        String prefix = "hamster".equals(charId) ? "fart" : charId;
        String style = ("soft".equals(sound) || "loud".equals(sound)) ? sound : "main";
        return prefix + "_" + style;
    }
}
