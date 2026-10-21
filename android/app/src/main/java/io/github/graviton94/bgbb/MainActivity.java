package io.github.graviton94.bgbb;

import android.Manifest;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ContentValues;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Insets;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.window.OnBackInvokedDispatcher;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/** 웹 앱을 띄우는 WebView 껍데기 + window.BgbbNative 다리. */
public class MainActivity extends Activity {

    /**
     * 번들된 웹 앱을 file:// 대신 가짜 https 주소로 서빙한다. 보안 컨텍스트라서
     * ES 모듈 · fetch · 마이크 녹음이 정상 동작하고, 위험한 파일 접근 설정을 켤 필요가 없다.
     * 앱은 인터넷에서 아무것도 불러오지 않는다 (글꼴·그림·소리 모두 APK 안).
     */
    private static final String HOST = "appassets.androidplatform.net";
    private static final String CONTACT = "ruahn49@gmail.com";
    private static final int PAPER = 0xFFF2F2F0;
    private static final int REQ_MIC = 1;
    private static final int REQ_NOTIFY = 2;
    private static final String RESUME_JS = "window.bgbbOnNativeResume && window.bgbbOnNativeResume()";
    private static final Map<String, String> MIME = Map.of(
            "html", "text/html", "css", "text/css", "js", "text/javascript",
            "webp", "image/webp", "png", "image/png", "wav", "audio/wav", "woff2", "font/woff2");

    private WebView web;
    private PermissionRequest pendingMic;
    private Support support;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        web = new WebView(this);
        web.setBackgroundColor(PAPER);
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(PAPER);
        root.addView(web);
        setContentView(root);
        setUpEdgeToEdge(root);
        setUpBack();

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setMediaPlaybackRequiresUserGesture(false);

        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest req) {
                Uri url = req.getUrl();
                if (!HOST.equals(url.getHost())) return null;
                String path = url.getPath() == null || "/".equals(url.getPath()) ? "/index.html" : url.getPath();
                String ext = path.substring(path.lastIndexOf('.') + 1);
                try {
                    InputStream in = getAssets().open("public" + path);
                    return new WebResourceResponse(MIME.getOrDefault(ext, "application/octet-stream"), "utf-8", in);
                } catch (IOException e) {
                    return new WebResourceResponse("text/plain", "utf-8", 404, "Not Found", null, null);
                }
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                if (HOST.equals(req.getUrl().getHost())) return false;
                openExternal(req.getUrl());   // 바깥 주소(개인정보처리방침 등)는 브라우저로
                return true;
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(PermissionRequest request) {
                if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
                    request.grant(request.getResources());
                } else {
                    pendingMic = request;
                    requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, REQ_MIC);
                }
            }
        });

        support = new Support(this, new Support.Sink() {
            @Override public void prices(String json) { callJs("bgbbOnTipPrices", json); }
            @Override public void owned(String json) { callJs("bgbbOnTipsOwned", json); }
        });

        web.addJavascriptInterface(new Bridge(), "BgbbNative");
        web.loadUrl("https://" + HOST + "/index.html");
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.evaluateJavascript(RESUME_JS, null);
    }

    @Override
    protected void onDestroy() {
        support.destroy();
        web.destroy();
        super.onDestroy();
    }

    @Override
    public void onRequestPermissionsResult(int code, String[] permissions, int[] results) {
        if (code == REQ_NOTIFY) {
            web.evaluateJavascript(RESUME_JS, null);
            return;
        }
        if (code != REQ_MIC || pendingMic == null) return;
        if (results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED) {
            pendingMic.grant(pendingMic.getResources());
        } else {
            pendingMic.deny();
        }
        pendingMic = null;
    }

    // ---- 화면 가장자리 & 뒤로 가기 ----

    /** Android 15+ 는 앱이 화면 끝까지 그려진다. 상태바·내비게이션바·키보드만큼 안쪽으로 비켜 준다. */
    private void setUpEdgeToEdge(FrameLayout root) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) return;   // 그 아래는 시스템이 알아서 비켜 준다
        getWindow().setDecorFitsSystemWindows(false);
        WindowInsetsController c = getWindow().getInsetsController();
        if (c != null) {
            int light = WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS
                    | WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS;
            c.setSystemBarsAppearance(light, light);
        }
        root.setOnApplyWindowInsetsListener((v, insets) -> {
            Insets i = insets.getInsets(WindowInsets.Type.systemBars()
                    | WindowInsets.Type.displayCutout() | WindowInsets.Type.ime());
            v.setPadding(i.left, i.top, i.right, i.bottom);
            return WindowInsets.CONSUMED;
        });
    }

    /** 뒤로 가기: 웹 쪽(열린 시트 → 아지트 탭)이 먼저 처리하고, 처리할 게 없으면 앱을 뒤로 보낸다. */
    private void setUpBack() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                    OnBackInvokedDispatcher.PRIORITY_DEFAULT, this::handleBack);
        }
    }

    private void handleBack() {
        web.evaluateJavascript("window.bgbbBack ? window.bgbbBack() : false", handled -> {
            if (!"true".equals(handled)) moveTaskToBack(true);
        });
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {   // Android 12 이하
        handleBack();
    }

    // ---- 도우미 ----

    private void callJs(String fn, String json) {
        runOnUiThread(() -> web.evaluateJavascript(
                "window." + fn + " && window." + fn + "(" + JSONObject.quote(json) + ")", null));
    }

    private void openExternal(Uri uri) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri));
        } catch (ActivityNotFoundException ignored) {
        }
    }

    private String versionName() {
        try {
            return getPackageManager().getPackageInfo(getPackageName(), 0).versionName;
        } catch (PackageManager.NameNotFoundException e) {
            return "?";
        }
    }

    /** window.BgbbNative */
    public class Bridge {

        @JavascriptInterface
        public void configure(String json) {
            PrankScheduler.configure(getApplicationContext(), json);
        }

        @JavascriptInterface
        public String drainEvents() {
            return PrankScheduler.drainEvents(getApplicationContext());
        }

        @JavascriptInterface
        public int remainingToday() {
            return PrankScheduler.remainingToday(getApplicationContext());
        }

        @JavascriptInterface
        public String appVersion() {
            return versionName();
        }

        /** 방석 모드: 장전 중엔 화면이 꺼지지 않게 */
        @JavascriptInterface
        public void setKeepAwake(boolean on) {
            runOnUiThread(() -> {
                if (on) getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                else getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            });
        }

        /** 방석 모드: 장전 중엔 화면을 가장 어둡게 (꺼진 척) */
        @JavascriptInterface
        public void setDim(boolean on) {
            runOnUiThread(() -> {
                WindowManager.LayoutParams lp = getWindow().getAttributes();
                lp.screenBrightness = on ? 0.01f : WindowManager.LayoutParams.BRIGHTNESS_OVERRIDE_NONE;
                getWindow().setAttributes(lp);
            });
        }

        /** 터진 뒤 알림 문구 켜기/끄기 */
        @JavascriptInterface
        public void setNotify(boolean on) {
            PrankNotifier.setEnabled(getApplicationContext(), on);
        }

        @JavascriptInterface
        public boolean notificationsAllowed() {
            return PrankNotifier.allowed(getApplicationContext());
        }

        /** Android 13+ 알림 권한을 묻는다. 물어볼 수 없으면(이미 거절 등) false → 폰 설정 안내. */
        @JavascriptInterface
        public boolean requestNotifications() {
            if (PrankNotifier.allowed(getApplicationContext())) return true;
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return false;
            if (getSharedPreferences("bgbb_notify", MODE_PRIVATE).getBoolean("asked", false)
                    && !shouldShowRequestPermissionRationale(Manifest.permission.POST_NOTIFICATIONS)) return false;
            getSharedPreferences("bgbb_notify", MODE_PRIVATE).edit().putBoolean("asked", true).apply();
            runOnUiThread(() -> requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, REQ_NOTIFY));
            return true;
        }

        /** 설정의 '지금 바로 1회': 진짜 폰 상태로 한 번 실행하고 결과를 JS 에 알린다. */
        @JavascriptInterface
        public void fireNow() {
            runOnUiThread(() -> PrankPlayer.fire(getApplicationContext(),
                    () -> web.evaluateJavascript(RESUME_JS, null)));
        }

        /** 녹음(base64)을 파일로 저장해 앱이 꺼져 있어도 알람이 재생할 수 있게 한다. */
        @JavascriptInterface
        public boolean saveCustomSound(String base64) {
            try (FileOutputStream out = new FileOutputStream(new File(getFilesDir(), PrankPlayer.DIY_FILE))) {
                out.write(Base64.decode(base64, Base64.DEFAULT));
                return true;
            } catch (IOException | IllegalArgumentException e) {
                return false;
            }
        }

        @JavascriptInterface
        public void resetAll() {
            //noinspection ResultOfMethodCallIgnored
            new File(getFilesDir(), PrankPlayer.DIY_FILE).delete();
            PrankScheduler.reset(getApplicationContext());
        }

        @JavascriptInterface
        public void openUrl(String url) {
            if (url != null && url.startsWith("https://")) runOnUiThread(() -> openExternal(Uri.parse(url)));
        }

        /** 의견 · 오류 보내기: 사용자의 메일 앱을 열고 기기 정보를 채운다. 사용자가 직접 보낼 때만 전송된다. */
        @JavascriptInterface
        public void sendFeedback(String log) {
            String body = "\n\n---\n"
                    + "App: " + versionName() + "\n"
                    + "Device: " + Build.MANUFACTURER + " " + Build.MODEL + "\n"
                    + "Android: " + Build.VERSION.RELEASE + " (API " + Build.VERSION.SDK_INT + ")\n"
                    + "Language: " + Locale.getDefault().toLanguageTag()
                    + (log == null ? "" : log);
            Intent mail = new Intent(Intent.ACTION_SENDTO, Uri.parse("mailto:" + CONTACT))
                    .putExtra(Intent.EXTRA_SUBJECT, "[" + getString(R.string.app_name) + "] " + versionName())
                    .putExtra(Intent.EXTRA_TEXT, body);
            runOnUiThread(() -> {
                try {
                    startActivity(mail);
                } catch (ActivityNotFoundException ignored) {
                }
            });
        }

        /** 응원하기 상품 가격 + 이미 응원한 상품 → bgbbOnTipPrices / bgbbOnTipsOwned */
        @JavascriptInterface
        public void loadTips(String idsJson) {
            List<String> ids = new ArrayList<>();
            try {
                JSONArray arr = new JSONArray(idsJson);
                for (int i = 0; i < arr.length(); i++) ids.add(arr.getString(i));
            } catch (Exception e) {
                return;
            }
            runOnUiThread(() -> support.load(ids));
        }

        @JavascriptInterface
        public void buyTip(String productId) {
            runOnUiThread(() -> support.buy(productId));
        }

        /** 속보 카드 PNG 를 갤러리(Pictures/방구뿡)에 저장하고 공유창을 띄운다. Android 10+ (권한 불필요). */
        @JavascriptInterface
        public boolean saveAndShareImage(String base64, String fileName) {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return false;
            ContentValues v = new ContentValues();
            v.put(MediaStore.Images.Media.DISPLAY_NAME, fileName);
            v.put(MediaStore.Images.Media.MIME_TYPE, "image/png");
            v.put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/방구뿡");
            Uri uri = getContentResolver().insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, v);
            if (uri == null) return false;
            try (OutputStream os = getContentResolver().openOutputStream(uri)) {
                if (os == null) throw new IOException("no stream");
                os.write(Base64.decode(base64, Base64.DEFAULT));
            } catch (IOException | IllegalArgumentException e) {
                getContentResolver().delete(uri, null, null);
                return false;
            }
            Intent send = new Intent(Intent.ACTION_SEND)
                    .setType("image/png")
                    .putExtra(Intent.EXTRA_STREAM, uri)
                    .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            runOnUiThread(() -> startActivity(Intent.createChooser(send, null)));
            return true;
        }
    }
}
