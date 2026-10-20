package com.bgbb.tamagotchi;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.os.VibrationEffect;
import android.os.Vibrator;

import androidx.core.app.NotificationCompat;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;

/**
 * 주머니 속 화면이 꺼진 상태(Doze/Sleep)에서도 불시 사운드/진동 작전을 수행하는
 * Android Foreground Service + Partial WakeLock 엔진
 */
public class PocketSecretService extends Service {

    public static final String ACTION_START_OR_UPDATE = "com.bgbb.tamagotchi.ACTION_START_OR_UPDATE";
    public static final String ACTION_STOP = "com.bgbb.tamagotchi.ACTION_STOP";
    public static final String ACTION_EMERGENCY_MUTE = "com.bgbb.tamagotchi.ACTION_EMERGENCY_MUTE";
    public static final String EXTRA_CONFIG_JSON = "extra_config_json";

    private static final String CHANNEL_ID = "bgbb_pocket_stealth_channel";
    private static final int NOTIFICATION_ID = 7701;

    private PowerManager.WakeLock wakeLock;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Random random = new Random();

    private boolean isRunning = false;
    private boolean emergencyFrozen = false;
    private String frequency = "normal";
    private String timeWindow = "09:00 ~ 18:00";
    private final List<String> activeSoundNames = new ArrayList<>();

    private final Runnable secretTimerRunnable = new Runnable() {
        @Override
        public void run() {
            if (!isRunning || emergencyFrozen) return;
            executeSecretPocketTrigger();
            scheduleNextTrigger();
        }
    };

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        acquireWakeLock();
        activeSoundNames.add("fart_main");
        activeSoundNames.add("tit_main");
        activeSoundNames.add("cat_main");
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null) {
            String action = intent.getAction();
            if (ACTION_STOP.equals(action)) {
                stopSecretOperation();
                return START_NOT_STICKY;
            } else if (ACTION_EMERGENCY_MUTE.equals(action)) {
                emergencyFrozen = true;
                handler.removeCallbacks(secretTimerRunnable);
                updateForegroundNotification("🚨 긴급탈출! 모든 소리가 동결되었습니다 🥶");
                return START_STICKY;
            } else if (ACTION_START_OR_UPDATE.equals(action)) {
                String json = intent.getStringExtra(EXTRA_CONFIG_JSON);
                parseConfig(json);
            }
        }

        isRunning = true;
        Notification notification = buildNotification("햄찌와 친구들이 주머니 속 낮잠 중 💤 (" + timeWindow + ")");
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }

        scheduleNextTrigger();
        return START_STICKY;
    }

    private void parseConfig(String jsonStr) {
        if (jsonStr == null || jsonStr.isEmpty()) return;
        try {
            JSONObject obj = new JSONObject(jsonStr);
            emergencyFrozen = obj.optBoolean("emergencyEscape", false);
            frequency = obj.optString("frequency", "normal");
            timeWindow = obj.optString("timeWindow", "09:00 ~ 18:00");
            JSONArray arr = obj.optJSONArray("activeSounds");
            if (arr != null && arr.length() > 0) {
                activeSoundNames.clear();
                for (int i = 0; i < arr.length(); i++) {
                    activeSoundNames.add(arr.getString(i));
                }
            }
        } catch (Exception ignored) {
        }
    }

    private void scheduleNextTrigger() {
        handler.removeCallbacks(secretTimerRunnable);
        if (!isRunning || emergencyFrozen) return;

        int minSec = 25;
        int maxSec = 45;
        if ("thrill".equals(frequency)) {
            minSec = 12;
            maxSec = 24;
        } else if ("quiet".equals(frequency)) {
            minSec = 45;
            maxSec = 75;
        }
        int delayMs = (minSec + random.nextInt(Math.max(1, maxSec - minSec))) * 1000;
        handler.postDelayed(secretTimerRunnable, delayMs);
    }

    private void executeSecretPocketTrigger() {
        if (emergencyFrozen || activeSoundNames.isEmpty()) return;

        AudioManager am = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
        int ringerMode = (am != null) ? am.getRingerMode() : AudioManager.RINGER_MODE_NORMAL;

        String chosenSound = activeSoundNames.get(random.nextInt(activeSoundNames.size()));
        int rawResId = getResources().getIdentifier(chosenSound, "raw", getPackageName());
        if (rawResId == 0) {
            rawResId = getResources().getIdentifier("fart_main", "raw", getPackageName());
        }

        if (ringerMode == AudioManager.RINGER_MODE_NORMAL && rawResId != 0) {
            MediaPlayer mp = MediaPlayer.create(this, rawResId);
            if (mp != null) {
                mp.setOnCompletionListener(MediaPlayer::release);
                mp.start();
            }
        } else if (ringerMode == AudioManager.RINGER_MODE_VIBRATE) {
            Vibrator vib = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            if (vib != null && vib.hasVibrator()) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vib.vibrate(VibrationEffect.createWaveform(new long[]{0, 90, 50, 140}, -1));
                } else {
                    vib.vibrate(200);
                }
            }
        }
        // RINGER_MODE_SILENT 인 경우 조용히 참음 카운트 누적
    }

    private void acquireWakeLock() {
        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (pm != null) {
            wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "BangguBboong::PocketWakeLock");
            wakeLock.setReferenceCounted(false);
            wakeLock.acquire(4 * 60 * 60 * 1000L); // 최대 4시간 세션 유지
        }
    }

    private void stopSecretOperation() {
        isRunning = false;
        handler.removeCallbacks(secretTimerRunnable);
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
        }
        stopForeground(true);
        stopSelf();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "방구뿡 주머니 비밀작전 (포그라운드)",
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("주머니 속에서 화면이 꺼져도 다마고치 친구들이 살아 숨쉬도록 유지합니다.");
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) {
                nm.createNotificationChannel(channel);
            }
        }
    }

    private void updateForegroundNotification(String statusText) {
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) {
            nm.notify(NOTIFICATION_ID, buildNotification(statusText));
        }
    }

    private Notification buildNotification(String contentText) {
        Intent openIntent = new Intent(this, MainActivity.class);
        PendingIntent contentPendingIntent = PendingIntent.getActivity(
                this, 0, openIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Intent muteIntent = new Intent(this, PocketSecretService.class);
        muteIntent.setAction(ACTION_EMERGENCY_MUTE);
        PendingIntent mutePendingIntent = PendingIntent.getService(
                this, 1, muteIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("방구뿡 · 다마고치 비밀 아지트")
                .setContentText(contentText)
                .setSmallIcon(R.drawable.ic_launcher_hamster)
                .setOngoing(true)
                .setContentIntent(contentPendingIntent)
                .addAction(0, "🚨 긴급탈출(즉시동결)", mutePendingIntent)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .build();
    }

    @Override
    public void onDestroy() {
        stopSecretOperation();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
