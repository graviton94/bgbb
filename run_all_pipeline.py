import os
import time
import threading
import subprocess
from http.server import SimpleHTTPRequestHandler, HTTPServer

ARTIFACT_DIR = r"C:\Users\ruahn49\.gemini\antigravity\brain\b2ce85ba-1f7b-478f-8be4-052d7e2dab69"
os.makedirs(ARTIFACT_DIR, exist_ok=True)

def start_server():
    server = HTTPServer(("127.0.0.1", 8765), SimpleHTTPRequestHandler)
    t = threading.Thread(target=server.serve_forever, daemon=True)
    t.start()
    return server

def capture_screenshots():
    edge_paths = [
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Google\Chrome\Application\chrome.exe"
    ]
    browser = next((p for p in edge_paths if os.path.exists(p)), None)
    if not browser:
        print("No headless browser found")
        return

    out_path = os.path.join(ARTIFACT_DIR, "android_test_screen.png")
    cmd = [
        browser,
        "--headless",
        "--disable-gpu",
        "--hide-scrollbars",
        "--window-size=1420,980",
        "--virtual-time-budget=3500",
        f"--screenshot={out_path}",
        "http://127.0.0.1:8765/android_preview.html"
    ]
    subprocess.run(cmd, check=False)
    if os.path.exists(out_path):
        print(f"Captured screenshot: {out_path} ({os.path.getsize(out_path)} bytes)")

def git_push_and_trigger():
    subprocess.run(["git", "add", "-A"], check=True)
    subprocess.run(["git", "commit", "-m", "feat: V4.0 리얼 효과음 9종, 코어 1-2단계, Android Foreground Service 및 APK 자동 빌드"], check=False)
    branch = subprocess.check_output(["git", "rev-parse", "--abbrev-ref", "HEAD"], text=True).strip()
    print(f"Pushing branch {branch} to origin...")
    subprocess.run(["git", "push", "-u", "origin", branch], check=True)

    # Trigger workflow_dispatch if needed and check status
    time.sleep(4)
    subprocess.run(["gh", "workflow", "run", "build-apk.yml"], check=False)
    time.sleep(3)
    runs = subprocess.check_output(["gh", "run", "list", "--limit", "1"], text=True)
    print("Latest GitHub Actions Run:\n", runs)

if __name__ == "__main__":
    srv = start_server()
    capture_screenshots()
    git_push_and_trigger()
