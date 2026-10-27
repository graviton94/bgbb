package io.github.graviton94.bgbb;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.content.res.AssetFileDescriptor;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.os.VibrationEffect;
import android.os.Vibrator;

/**
 * 기상 알람이 울리는 동안만 떠 있는 서비스: 알람 음악(res/raw/alarm_wake, 30초)을 끌 때까지 반복 +
 * 진동 반복 + 잠금화면 위로 앱을 띄우는 알림. 끄는 건 앱 안 알람 팝업의 [확인] (또는 [5분만 더]).
 * 10분 동안 아무도 안 끄면 알아서 멈춘다 (실제 알람시계처럼).
 */
public class AlarmService extends Service {

    static final String CHANNEL = "wake";
    static final int NOTIF_ID = 7;
    private static final long GIVE_UP_MS = 10 * 60_000L;
    static volatile boolean ringing;

    private MediaPlayer player;
    private PowerManager.WakeLock lock;
    private final Handler main = new Handler(Looper.getMainLooper());

    static void start(Context c) {
        Intent i = new Intent(c, AlarmService.class);
        try {
            c.startForegroundService(i);
        } catch (RuntimeException e) {
            // 정확한 알람 권한이 없어 백그라운드 시작이 막힌 경우: 알림만이라도 (누르면 앱이 열리며 울림)
            notifyOnly(c);
        }
    }

    static void stop(Context c) {
        ringing = false;
        c.stopService(new Intent(c, AlarmService.class));
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        if (nm != null) nm.cancel(NOTIF_ID);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Notification n = notification(this);
        if (Build.VERSION.SDK_INT >= 29) startForeground(NOTIF_ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
        else startForeground(NOTIF_ID, n);
        if (ringing && player != null) return START_NOT_STICKY;
        ringing = true;
        PowerManager pm = getSystemService(PowerManager.class);
        if (pm != null) {
            lock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "bgbb:alarm");
            lock.acquire(GIVE_UP_MS + 10_000);
        }
        play();
        buzz();
        main.postDelayed(() -> stop(this), GIVE_UP_MS);
        // 화면이 켜져 있으면 알림 팝업 대신 바로 앱을 띄운다 (잠금화면이면 전체 화면 알림이 띄움)
        try {
            startActivity(MainActivity.wakeIntent(this));
        } catch (RuntimeException ignored) {
        }
        return START_NOT_STICKY;
    }

    private void play() {
        player = new MediaPlayer();
        try {
            // 알람 볼륨 · 무음 모드여도 울림
            player.setAudioAttributes(new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                    .build());
            try (AssetFileDescriptor afd = getResources().openRawResourceFd(R.raw.alarm_wake)) {
                player.setDataSource(afd.getFileDescriptor(), afd.getStartOffset(), afd.getLength());
            }
            player.setLooping(true);
            player.setOnPreparedListener(MediaPlayer::start);
            player.prepareAsync();
        } catch (Exception e) {
            player.release();
            player = null;
        }
    }

    private void buzz() {
        Vibrator vib = getSystemService(Vibrator.class);
        if (vib == null || !vib.hasVibrator()) return;
        vib.vibrate(VibrationEffect.createWaveform(new long[]{0, 400, 200, 400, 200, 900, 700}, 0),
                new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).build());
    }

    @Override
    public void onDestroy() {
        ringing = false;
        main.removeCallbacksAndMessages(null);
        if (player != null) {
            try { player.release(); } catch (Exception ignored) { }
            player = null;
        }
        Vibrator vib = getSystemService(Vibrator.class);
        if (vib != null) vib.cancel();
        if (lock != null && lock.isHeld()) lock.release();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private static void ensureChannel(Context c) {
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        if (nm == null) return;
        NotificationChannel ch = new NotificationChannel(CHANNEL, c.getString(R.string.channel_wake), NotificationManager.IMPORTANCE_HIGH);
        ch.setSound(null, null);   // 소리는 서비스가 낸다
        ch.enableVibration(false);
        ch.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        nm.createNotificationChannel(ch);
    }

    /** 잠금화면이면 앱을 전체 화면으로 띄우는 알림 (Android 14+ 는 '전체 화면 알림' 허용 필요, 없으면 헤드업) */
    private static Notification notification(Context c) {
        ensureChannel(c);
        PendingIntent open = PendingIntent.getActivity(c, 3, MainActivity.wakeIntent(c),
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        return new Notification.Builder(c, CHANNEL)
                .setSmallIcon(R.drawable.ic_stat_toot)
                .setColor(0xFFFF2E2E)
                .setContentTitle(c.getString(R.string.wake_title))
                .setContentText(c.getString(R.string.wake_text))
                .setCategory(Notification.CATEGORY_ALARM)
                .setVisibility(Notification.VISIBILITY_PUBLIC)
                .setContentIntent(open)
                .setFullScreenIntent(open, true)
                .setOngoing(true)
                .build();
    }

    private static void notifyOnly(Context c) {
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        if (nm != null && PrankNotifier.allowed(c)) nm.notify(NOTIF_ID, notification(c));
    }
}
