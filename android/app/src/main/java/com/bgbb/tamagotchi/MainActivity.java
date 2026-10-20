package com.bgbb.tamagotchi;

import android.Manifest;
import android.app.Activity;
import android.content.ContentValues;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;

public class MainActivity extends Activity {

    /**
     * 번들된 웹 앱을 file:// 대신 가짜 https 주소로 서빙한다.
     * 보안 컨텍스트가 되어 fetch / Web Audio 디코딩 / 마이크 녹음이 정상 동작하고,
     * 범용 파일 접근 같은 위험한 WebView 설정을 켤 필요가 없다.
     */
    private static final String HOST = "appassets.androidplatform.net";
    private static final String START_URL = "https://" + HOST + "/index.html";
    private static final int REQ_MIC = 1001;

    private WebView webView;
    private PermissionRequest pendingMicRequest;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMediaPlaybackRequiresUserGesture(false);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri url = request.getUrl();
                if (!HOST.equals(url.getHost())) return null;
                String path = url.getPath() == null || url.getPath().equals("/") ? "/index.html" : url.getPath();
                try {
                    InputStream in = getAssets().open("public" + path);
                    return new WebResourceResponse(mimeType(path), null, in);
                } catch (IOException e) {
                    return new WebResourceResponse("text/plain", "utf-8", 404, "Not Found", null, null);
                }
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                // 마이크 권한은 녹음 버튼을 누른 순간에만 요청한다.
                if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
                    request.grant(request.getResources());
                } else {
                    pendingMicRequest = request;
                    requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, REQ_MIC);
                }
            }
        });

        webView.addJavascriptInterface(new NativeBridge(), "BgbbNative");
        webView.loadUrl(START_URL);
    }

    @Override
    protected void onResume() {
        super.onResume();
        // 앱이 닫혀 있는 동안 울린 작전 기록을 JS 가 가져가게 한다.
        if (webView != null) {
            webView.evaluateJavascript("window.bgbbOnNativeResume && window.bgbbOnNativeResume()", null);
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] results) {
        if (requestCode != REQ_MIC || pendingMicRequest == null) return;
        if (results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED) {
            pendingMicRequest.grant(pendingMicRequest.getResources());
        } else {
            pendingMicRequest.deny();
        }
        pendingMicRequest = null;
    }

    private static String mimeType(String path) {
        if (path.endsWith(".html")) return "text/html";
        if (path.endsWith(".css")) return "text/css";
        if (path.endsWith(".js")) return "application/javascript";
        if (path.endsWith(".webp")) return "image/webp";
        if (path.endsWith(".png")) return "image/png";
        if (path.endsWith(".m4a")) return "audio/mp4";
        if (path.endsWith(".json")) return "application/json";
        return "application/octet-stream";
    }

    /** window.BgbbNative 로 노출되는 JS ↔ 네이티브 다리. */
    public class NativeBridge {

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
        public String deviceMode() {
            return PrankPlayer.deviceMode(getApplicationContext());
        }

        /** 설정 화면의 "지금 1회 발생" 버튼: 실제 폰 상태로 바로 한 번 실행. */
        @JavascriptInterface
        public void fireNow() {
            runOnUiThread(() -> PrankPlayer.fire(getApplicationContext(), () ->
                    webView.evaluateJavascript("window.bgbbOnNativeResume && window.bgbbOnNativeResume()", null)));
        }

        /** 3초 녹음(base64)을 파일로 저장해 앱이 꺼져 있어도 알람에서 재생할 수 있게 한다. */
        @JavascriptInterface
        public boolean saveCustomSound(String base64) {
            File out = new File(getFilesDir(), PrankPlayer.DIY_FILE);
            try (FileOutputStream fos = new FileOutputStream(out)) {
                fos.write(Base64.decode(base64, Base64.DEFAULT));
                return true;
            } catch (IOException | IllegalArgumentException e) {
                return false;
            }
        }

        /** 그림일기 PNG 를 갤러리(Pictures/방구뿡)에 저장하고 공유창을 띄운다. Android 10+ 전용 (권한 불필요). */
        @JavascriptInterface
        public boolean saveAndShareImage(String base64, String fileName) {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return false;
            ContentValues values = new ContentValues();
            values.put(MediaStore.Images.Media.DISPLAY_NAME, fileName);
            values.put(MediaStore.Images.Media.MIME_TYPE, "image/png");
            values.put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/방구뿡");
            Uri uri = getContentResolver().insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values);
            if (uri == null) return false;
            try (OutputStream os = getContentResolver().openOutputStream(uri)) {
                os.write(Base64.decode(base64, Base64.DEFAULT));
            } catch (IOException | IllegalArgumentException | NullPointerException e) {
                getContentResolver().delete(uri, null, null);
                return false;
            }
            Intent send = new Intent(Intent.ACTION_SEND)
                    .setType("image/png")
                    .putExtra(Intent.EXTRA_STREAM, uri)
                    .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            runOnUiThread(() -> startActivity(Intent.createChooser(send, "그림일기 공유")));
            return true;
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
