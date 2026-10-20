import os
import time
import json
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

def inspect_previous_failure():
    print("--- Checking previous failed run log ---")
    res = subprocess.run(["gh", "run", "view", "39389532904", "--log-failed"], capture_output=True, text=True, encoding="utf-8", errors="replace")
    if res.stdout:
        print(res.stdout[-2500:])
    if res.stderr:
        print(res.stderr[-1000:])

def git_push_and_wait_apk():
    subprocess.run(["git", "add", "-A"], check=True)
    subprocess.run(["git", "commit", "-m", "fix: 시간대별 소품 색조 변화, 모닥불 야간 불빛 파장 및 Android APK 빌드 수정"], check=False)
    branch = subprocess.check_output(["git", "rev-parse", "--abbrev-ref", "HEAD"], text=True).strip()
    subprocess.run(["git", "push", "-u", "origin", branch], check=True)

    time.sleep(5)
    # Wait for the latest run to finish and check its conclusion
    for _ in range(36):
        out = subprocess.check_output(
            ["gh", "run", "list", "--workflow=build-apk.yml", "--limit", "1", "--json", "databaseId,status,conclusion,url"],
            text=True
        )
        runs = json.loads(out)
        if runs:
            r = runs[0]
            print(f"Run {r['databaseId']}: status={r['status']}, conclusion={r['conclusion']} ({r['url']})")
            if r["status"] == "completed":
                if r["conclusion"] == "success":
                    print("APK BUILD SUCCEEDED! Downloading artifact...")
                    subprocess.run(["gh", "run", "download", str(r["databaseId"]), "-n", "banggu-bboong-v4-debug-apk", "-D", "."], check=False)
                    return True
                else:
                    print("Run failed! Fetching failed log:")
                    fail_log = subprocess.run(["gh", "run", "view", str(r["databaseId"]), "--log-failed"], capture_output=True, text=True, encoding="utf-8", errors="replace")
                    print(fail_log.stdout[-3000:])
                    return False
        time.sleep(10)
    return False

if __name__ == "__main__":
    inspect_previous_failure()
    srv = start_server()
    capture_screenshots()
    git_push_and_wait_apk()
