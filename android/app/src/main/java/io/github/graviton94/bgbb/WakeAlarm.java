package io.github.graviton94.bgbb;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.res.AssetFileDescriptor;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.PowerManager;
import android.os.VibrationEffect;
import android.os.Vibrator;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;
import java.util.Random;

/**
 * 기상 알람: 정한 시각에 친구들 방구를 45초 동안 번갈아 (알람 볼륨 · 무음 모드여도 울림).
 * 알람 시각부터 24시까지가 그날 방구 시간이 된다 (src/schedule.js startMin).
 * 알림의 [그만] · [5분 뒤] 또는 앱을 열면 멈춘다. 상주 서비스 없이 리시버 안에서만 (최대 45초, 백그라운드 리시버 제한 60초 안).
 */
final class WakeAlarm {

    static final String ACTION_RING = "io.github.graviton94.bgbb.ACTION_WAKE";
    static final String ACTION_STOP = "io.github.graviton94.bgbb.ACTION_WAKE_STOP";
    static final String ACTION_SNOOZE = "io.github.graviton94.bgbb.ACTION_WAKE_SNOOZE";
    private static final String CHANNEL = "wake";
    private static final String KEY_SNOOZE = "wakeSnooze";
    private static final int NOTIF_ID = 7;
    private static final long RING_MS = 45_000, SNOOZE_MS = 5 * 60_000L;
    private static final Random RANDOM = new Random();

    // 지금 울리는 중인 것 (같은 프로세스 안에서 [그만] 이 멈출 수 있게)
    private static MediaPlayer player;
    private static BroadcastReceiver.PendingResult pending;
    private static PowerManager.WakeLock lock;
    private static Handler main;
    private static boolean ringing;

    private WakeAlarm() {}

    /** 정확한 시각 알람을 걸 수 있는지 (Android 12+ 는 '알람 및 리마인더' 허용 필요) */
    static boolean exactAllowed(Context c) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true;
        AlarmManager am = c.getSystemService(AlarmManager.class);
        return am != null && am.canScheduleExactAlarms();
    }

    private static PendingIntent intent(Context c, String action, int code) {
        return PendingIntent.getBroadcast(c, code, new Intent(c, PrankReceiver.class).setAction(action),
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static PendingIntent openApp(Context c) {
        return PendingIntent.getActivity(c, 3, new Intent(c, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    /** 설정대로 다음 알람 하나만 건다 (5분 뒤 다시가 있으면 그게 먼저). 꺼져 있으면 지운다. */
    static void schedule(Context c) {
        AlarmManager am = c.getSystemService(AlarmManager.class);
        if (am == null) return;
        PendingIntent pi = intent(c, ACTION_RING, 4);
        am.cancel(pi);
        JSONObject wake = PrankScheduler.config(c).optJSONObject("wake");
        SharedPreferences p = c.getSharedPreferences("bgbb", Context.MODE_PRIVATE);
        long now = System.currentTimeMillis(), snooze = p.getLong(KEY_SNOOZE, 0);
        if (wake == null || !wake.optBoolean("on")) {
            p.edit().remove(KEY_SNOOZE).apply();
            return;
        }
        long at = snooze > now ? snooze : next(wake.optInt("at", 420), now);
        if (exactAllowed(c)) am.setAlarmClock(new AlarmManager.AlarmClockInfo(at, openApp(c)), pi);
        else am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);   // 권한이 없으면 몇 분 늦을 수 있음
    }

    /** 하루 중 분 → 다음 그 시각 */
    private static long next(int minutes, long now) {
        Calendar cal = Calendar.getInstance();
        cal.setTimeInMillis(now);
        cal.set(Calendar.HOUR_OF_DAY, 0);
        cal.set(Calendar.MINUTE, 0);
        cal.set(Calendar.SECOND, 0);
        cal.set(Calendar.MILLISECOND, 0);
        cal.add(Calendar.MINUTE, minutes);
        if (cal.getTimeInMillis() <= now) cal.add(Calendar.DAY_OF_MONTH, 1);
        return cal.getTimeInMillis();
    }

    static void snooze(Context c) {
        c.getSharedPreferences("bgbb", Context.MODE_PRIVATE).edit()
                .putLong(KEY_SNOOZE, System.currentTimeMillis() + SNOOZE_MS).apply();
        stop(c);
        schedule(c);
    }

    /** 울린다. result 는 다 끝나면 finish (리시버 제한 시간 안에) */
    static void ring(Context c, BroadcastReceiver.PendingResult result) {
        stop(c);
        c.getSharedPreferences("bgbb", Context.MODE_PRIVATE).edit().remove(KEY_SNOOZE).apply();
        schedule(c);   // 내일 것 미리
        pending = result;
        main = new Handler(Looper.getMainLooper());
        PowerManager pm = c.getSystemService(PowerManager.class);
        if (pm != null) {
            lock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "bgbb:wake");
            lock.acquire(RING_MS + 5_000);
        }
        ringing = true;
        showNotification(c);
        long until = System.currentTimeMillis() + RING_MS;
        playNext(c, sounds(c), until);
        main.postDelayed(() -> stop(c), RING_MS);
    }

    /** 참여 중인 친구들의 기본 · 우렁찬 녹음 전부 (아무도 없으면 햄찌) */
    private static List<Integer> sounds(Context c) {
        List<String> chars = new ArrayList<>();
        JSONArray arr = PrankScheduler.config(c).optJSONArray("sounds");
        if (arr != null) for (int i = 0; i < arr.length(); i++) chars.add(arr.optJSONObject(i).optString("char", "hamster"));
        if (chars.isEmpty()) chars.add("hamster");
        List<Integer> out = new ArrayList<>();
        for (String ch : chars) {
            for (String style : new String[]{"main", "loud"}) {
                for (int n = 1; n <= 9; n++) {
                    String name = ch + "_" + style + (n == 1 ? "" : "_" + n);
                    int id = c.getResources().getIdentifier(name, "raw", c.getPackageName());
                    if (id == 0) break;
                    out.add(id);
                }
            }
        }
        return out;
    }

    private static void playNext(Context c, List<Integer> pool, long until) {
        if (!ringing || pool.isEmpty() || System.currentTimeMillis() >= until) return;
        MediaPlayer mp = new MediaPlayer();
        player = mp;
        try {
            // 알람 소리: 알람 볼륨을 따르고 무음 · 진동 모드여도 울린다
            mp.setAudioAttributes(new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build());
            try (AssetFileDescriptor afd = c.getResources().openRawResourceFd(pool.get(RANDOM.nextInt(pool.size())))) {
                mp.setDataSource(afd.getFileDescriptor(), afd.getStartOffset(), afd.getLength());
            }
            mp.setOnPreparedListener(MediaPlayer::start);
            mp.setOnCompletionListener(done -> {
                done.release();
                if (player == done) player = null;
                if (ringing) main.postDelayed(() -> playNext(c, pool, until), 700 + RANDOM.nextInt(900));
            });
            mp.setOnErrorListener((bad, what, extra) -> {
                bad.release();
                if (player == bad) player = null;
                if (ringing) main.postDelayed(() -> playNext(c, pool, until), 1000);
                return true;
            });
            mp.prepareAsync();
            buzz(c);
        } catch (Exception e) {
            mp.release();
            player = null;
        }
    }

    private static void buzz(Context c) {
        Vibrator vib = c.getSystemService(Vibrator.class);
        if (vib == null || !vib.hasVibrator()) return;
        vib.vibrate(VibrationEffect.createWaveform(new long[]{0, 180, 80, 380}, -1),
                new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).build());
    }

    /** 멈춤: 소리 · 알림 · 대기 중인 리시버 정리. 울리는 중이 아니면 아무 일 없음 */
    static void stop(Context c) {
        ringing = false;
        if (main != null) main.removeCallbacksAndMessages(null);
        if (player != null) {
            try { player.release(); } catch (Exception ignored) { }
            player = null;
        }
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        if (nm != null) nm.cancel(NOTIF_ID);
        if (lock != null && lock.isHeld()) lock.release();
        lock = null;
        if (pending != null) {
            pending.finish();
            pending = null;
        }
    }

    static boolean isRinging() {
        return ringing;
    }

    private static void showNotification(Context c) {
        if (!PrankNotifier.allowed(c)) return;
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        if (nm == null) return;
        NotificationChannel ch = new NotificationChannel(CHANNEL, c.getString(R.string.channel_wake), NotificationManager.IMPORTANCE_HIGH);
        ch.setSound(null, null);   // 소리는 방구가 낸다
        ch.enableVibration(false);
        nm.createNotificationChannel(ch);
        Notification n = new Notification.Builder(c, CHANNEL)
                .setSmallIcon(R.drawable.ic_stat_toot)
                .setColor(0xFF111111)
                .setContentTitle(c.getString(R.string.wake_title))
                .setContentText(c.getString(R.string.wake_text))
                .setCategory(Notification.CATEGORY_ALARM)
                .setVisibility(Notification.VISIBILITY_PUBLIC)
                .setContentIntent(openApp(c))
                .setDeleteIntent(intent(c, ACTION_STOP, 5))
                .addAction(new Notification.Action.Builder(null, c.getString(R.string.wake_stop), intent(c, ACTION_STOP, 5)).build())
                .addAction(new Notification.Action.Builder(null, c.getString(R.string.wake_snooze), intent(c, ACTION_SNOOZE, 6)).build())
                .setOngoing(true)
                .build();
        nm.notify(NOTIF_ID, n);
    }
}
