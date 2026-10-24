# WebView 에서 부르는 window.BgbbNative 메서드는 이름 그대로 남긴다
-keepattributes JavascriptInterface
-keepclassmembers class io.github.graviton94.bgbb.MainActivity$Bridge {
    @android.webkit.JavascriptInterface <methods>;
}
