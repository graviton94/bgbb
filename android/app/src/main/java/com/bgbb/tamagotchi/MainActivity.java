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
import java.util.Map;

/** 웹 앱을 띄우는 WebView 껍데기 + window.BgbbNative 다리. */
public class MainActivity extends Activity {

    /**
     * 번들된 웹 앱을 file:// 대신 가짜 https 주소로 서빙한다. 보안 컨텍스트라서
     * ES 모듈 · fetch · 마이크 녹음이 정상 동작하고, 위험한 파일 접근 설정을 켤 필요가 없다.
     */
    private static final String HOST = "appassets.androidplatform.net";
    private static final int REQ_MIC = 1;
    private static final String RESUME_JS = "window.bgbbOnNativeResume && window.bgbbOnNativeResume()";
    private static final Map<String, String> MIME = Map.of(
            "html", "text/html", "css", "text/css", "js", "text/javascript",
            "webp", "image/webp", "png", "image/png", "wav", "audio/wav");

    private WebView web;
    private PermissionRequest pendingMic;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        web = new WebView(this);
        setContentView(web);

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

        web.addJavascriptInterface(new Bridge(), "BgbbNative");
        web.loadUrl("https://" + HOST + "/index.html");
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.evaluateJavascript(RESUME_JS, null);
    }

    @Override
    public void onRequestPermissionsResult(int code, String[] permissions, int[] results) {
        if (code != REQ_MIC || pendingMic == null) return;
        if (results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED) {
            pendingMic.grant(pendingMic.getResources());
        } else {
            pendingMic.deny();
        }
        pendingMic = null;
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        if (web.canGoBack()) web.goBack();
        else super.onBackPressed();
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

        /** 그림일기 PNG 를 갤러리(Pictures/방구뿡)에 저장하고 공유창을 띄운다. Android 10+ (권한 불필요). */
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
            runOnUiThread(() -> startActivity(Intent.createChooser(send, "그림일기 공유")));
            return true;
        }
    }
}
