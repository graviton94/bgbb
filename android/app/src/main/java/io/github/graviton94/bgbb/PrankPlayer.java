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
        String sound = pick.optString("sound", "main");
        String mode = deviceMode(c);
        PrankScheduler.logEvent(c, System.currentTimeMillis(), charId, mode);
        PrankNotifier.post(c, charId, mode);

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

    private static void vibrate(Context c) {
        Vibrator vib = c.getSystemService(Vibrator.class);
        if (vib != null && vib.hasVibrator()) {
            vib.vibrate(VibrationEffect.createWaveform(new long[]{0, 90, 50, 140}, -1));
        }
    }
}
