package io.github.graviton94.bgbb;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;

import java.util.Random;

/**
 * 터진 직후 알림 한 줄 ("[속보] 햄찌, 끝내 참지 못해"). 소리·진동 없는 채널이라
 * 알림 자체로 시끄러워지지 않는다. 설정에서 끌 수 있고, 권한이 없으면 아무것도 안 한다.
 */
final class PrankNotifier {

    static final String CHANNEL = "news";
    private static final String PREFS = "bgbb_notify";
    private static final String KEY_ON = "on";
    private static final int ID = 1;
    private static final Random RANDOM = new Random();

    private PrankNotifier() {}

    static void setEnabled(Context c, boolean on) {
        c.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putBoolean(KEY_ON, on).apply();
    }

    static boolean allowed(Context c) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
                && c.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            return false;
        }
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        return nm != null && nm.areNotificationsEnabled();
    }

    static void ensureChannel(Context c) {
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        if (nm == null) return;
        NotificationChannel ch = new NotificationChannel(CHANNEL, c.getString(R.string.channel_news),
                NotificationManager.IMPORTANCE_DEFAULT);
        ch.setDescription(c.getString(R.string.channel_news_desc));
        ch.setSound(null, null);
        ch.enableVibration(false);
        ch.setShowBadge(true);
        nm.createNotificationChannel(ch);
    }

    private static String randomNick(Context c) {
        int[] ids = {R.string.nick_hamster, R.string.nick_tit, R.string.nick_cat};
        return c.getString(ids[RANDOM.nextInt(ids.length)]);
    }

    private static String line(Context c, int arrayRes, Object... args) {
        String[] lines = c.getResources().getStringArray(arrayRes);
        return String.format(lines[RANDOM.nextInt(lines.length)], args);
    }

    /** 비상탈출 중 도발: "아직도 참고 있어?" + [다시 시작!] 버튼 (앱 안 열고 바로 풀림) */
    static void nagFrozen(Context c, long hours) {
        String nick = randomNick(c);
        PendingIntent resume = PendingIntent.getBroadcast(c, 2,
                new Intent(c, PrankReceiver.class).setAction(PrankReceiver.ACTION_RESUME),
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        show(c, nick, line(c, R.array.nag_frozen, nick, hours), new Notification.Action.Builder(null, c.getString(R.string.action_resume), resume).build());
    }

    /** 쫄 시간 중 아주 가끔: 조용히 한 줄 */
    static void nagRest(Context c) {
        String nick = randomNick(c);
        show(c, nick, line(c, R.array.nag_rest, nick), null);
    }

    /** "다시 시작!" 눌렀을 때 그 알림을 바꿔 둔다 */
    static void resumed(Context c) {
        show(c, c.getString(R.string.app_name), c.getString(R.string.resumed), null);
    }

    private static void show(Context c, String title, String text, Notification.Action action) {
        if (!c.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getBoolean(KEY_ON, true) || !allowed(c)) return;
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        if (nm == null) return;
        ensureChannel(c);
        PendingIntent open = PendingIntent.getActivity(c, 0,
                new Intent(c, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification.Builder b = new Notification.Builder(c, CHANNEL)
                .setSmallIcon(R.drawable.ic_stat_toot)
                .setColor(0xFF111111)
                .setContentTitle(title)
                .setContentText(text)
                .setStyle(new Notification.BigTextStyle().bigText(text))
                .setContentIntent(open)
                .setAutoCancel(true)
                .setVisibility(Notification.VISIBILITY_PUBLIC)   // 잠금화면에도 그대로
                .setCategory(Notification.CATEGORY_REMINDER);
        if (action != null) b.addAction(action);
        nm.notify(ID, b.build());
    }

    /** mode: loud | soft | hold */
    static void post(Context c, String charId, String mode) {
        if (!c.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getBoolean(KEY_ON, true) || !allowed(c)) return;
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        if (nm == null) return;
        ensureChannel(c);

        int nickRes = "tit".equals(charId) ? R.string.nick_tit : "cat".equals(charId) ? R.string.nick_cat : R.string.nick_hamster;
        int linesRes = "loud".equals(mode) ? R.array.news_loud : "soft".equals(mode) ? R.array.news_soft : R.array.news_hold;
        String nick = c.getString(nickRes);
        String[] lines = c.getResources().getStringArray(linesRes);
        String text = String.format(lines[RANDOM.nextInt(lines.length)], nick);

        PendingIntent open = PendingIntent.getActivity(c, 0,
                new Intent(c, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification n = new Notification.Builder(c, CHANNEL)
                .setSmallIcon(R.drawable.ic_stat_toot)
                .setColor(0xFF111111)
                .setContentTitle(nick)
                .setContentText(text)
                .setStyle(new Notification.BigTextStyle().bigText(text))
                .setSubText(c.getString(R.string.news_sub))
                .setContentIntent(open)
                .setAutoCancel(true)
                .setVisibility(Notification.VISIBILITY_PUBLIC)
                .setCategory(Notification.CATEGORY_SOCIAL)
                .build();
        nm.notify(ID, n);   // 같은 자리에 덮어써서 쌓이지 않게
    }
}
