package io.github.graviton94.bgbb;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Handler;
import android.os.Looper;
import android.widget.RemoteViews;

import org.json.JSONObject;

import java.io.InputStream;

/**
 * 홈 화면 위젯: 친구 얼굴 · "오늘 3번 장전" · 최근 칭호. 얼굴을 누르면 뿡 (앱 안 방구와 같은 소리 규칙),
 * 글자 쪽을 누르면 앱이 열린다. 알람이 다시 걸릴 때마다 (터진 뒤 · 설정 바뀜) 새로 그린다.
 */
public class BgbbWidget extends AppWidgetProvider {

    static final String ACTION_POKE = "io.github.graviton94.bgbb.WIDGET_POKE";
    private static final String KEY = "widget";   // JS 가 넣어 줌: {"title": 최근 칭호 이름, "char": 홈 친구}

    @Override
    public void onUpdate(Context c, AppWidgetManager mgr, int[] ids) {
        refresh(c);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (!ACTION_POKE.equals(intent.getAction())) return;
        Context c = context.getApplicationContext();
        String ch = info(c).optString("char", "hamster");
        PrankPlayer.playToot(c, ch, PrankPlayer.pickStyle(false));
        PendingResult result = goAsync();
        draw(c, "burst");   // 잠깐 터지는 얼굴
        new Handler(Looper.getMainLooper()).postDelayed(() -> { draw(c, "blank"); result.finish(); }, 1200);
    }

    /** JS 가 최근 칭호 · 홈 친구를 알려 줌 */
    static void setInfo(Context c, String json) {
        c.getSharedPreferences("bgbb", Context.MODE_PRIVATE).edit().putString(KEY, json).apply();
        refresh(c);
    }

    private static JSONObject info(Context c) {
        try {
            return new JSONObject(c.getSharedPreferences("bgbb", Context.MODE_PRIVATE).getString(KEY, "{}"));
        } catch (Exception e) {
            return new JSONObject();
        }
    }

    static void refresh(Context c) {
        draw(c, "blank");
    }

    private static void draw(Context c, String expr) {
        AppWidgetManager mgr = AppWidgetManager.getInstance(c);
        int[] ids = mgr.getAppWidgetIds(new ComponentName(c, BgbbWidget.class));
        if (ids == null || ids.length == 0) return;
        JSONObject info = info(c), cfg = PrankScheduler.config(c);
        String ch = info.optString("char", "hamster");
        int left = PrankScheduler.remainingToday(c);
        String big = cfg.optBoolean("frozen") ? c.getString(R.string.widget_frozen)
                : left > 0 ? c.getString(R.string.widget_left, left) : c.getString(R.string.widget_done);
        String title = info.optString("title", "");
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_toot);
        v.setTextViewText(R.id.widget_big, big);
        v.setTextViewText(R.id.widget_small, title.isEmpty() ? c.getString(R.string.widget_label) : c.getString(R.string.widget_latest, title));
        Bitmap face = face(c, ch, expr);
        if (face != null) v.setImageViewBitmap(R.id.widget_face, face);
        v.setOnClickPendingIntent(R.id.widget_face, PendingIntent.getBroadcast(c, 9,
                new Intent(c, BgbbWidget.class).setAction(ACTION_POKE), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
        v.setOnClickPendingIntent(R.id.widget_open, PendingIntent.getActivity(c, 10,
                new Intent(c, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
        mgr.updateAppWidget(ids, v);
    }

    /** 앱 그림 (assets/public/assets/faces) 을 위젯 크기로 줄여서 */
    private static Bitmap face(Context c, String ch, String expr) {
        try (InputStream in = c.getAssets().open("public/assets/faces/" + ch + "_" + expr + ".webp")) {
            BitmapFactory.Options o = new BitmapFactory.Options();
            o.inSampleSize = 2;
            return BitmapFactory.decodeStream(in, null, o);
        } catch (Exception e) {
            return null;
        }
    }
}
