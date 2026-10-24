// 공유 프레임 6종을 그린다: 1080×1240 투명 PNG, 가운데 정사각형 칸은 완전히 투명 (짤이 그 칸에 들어감, src/card.js holeOf).
//   node tools/draw_frames.mjs            (Playwright 필요)
// 결과: assets/skin/frame/<id>.webp
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'assets/skin/frame');
const W = 1080, H = 1240;

const FONTS = `
@font-face{font-family:BHS;src:url(/assets/fonts/blackhansans.woff2)}
@font-face{font-family:Gungseo;src:url(/assets/fonts/songmyung.woff2)}
@font-face{font-family:Poster;src:url(/assets/fonts/blackandwhitepicture.woff2)}
@font-face{font-family:Brush;src:url(/assets/fonts/eastseadokdo.woff2)}
*{box-sizing:border-box}
html,body{margin:0;background:transparent}
body{width:${W}px;height:${H}px;position:relative;overflow:hidden;font-family:system-ui,'Noto Sans KR',sans-serif}
.a{position:absolute}
`;
/** 바깥 판에 구멍을 뚫는다 (x, y, s = 정사각형 칸). 판은 background 로 칠한다 */
const board = (bg, x, y, s, extra = '') => `<div class="a" style="inset:0;background:${bg};${extra}
  -webkit-mask:linear-gradient(#000 0 0) exclude,linear-gradient(#000 0 0) ${x}px ${y}px/${s}px ${s}px no-repeat;
  mask:linear-gradient(#000 0 0) exclude,linear-gradient(#000 0 0) ${x}px ${y}px/${s}px ${s}px no-repeat"></div>`;

const FRAMES = {
  // 폴라로이드: 흰 테두리, 아래 넓은 여백에 손글씨
  frame_polaroid: () => `${board('#FBFAF5', 60, 50, 960, 'box-shadow:inset 0 0 0 2px #e5e2d8')}
    <div class="a" style="left:0;right:0;top:1052px;text-align:center;font:400 96px Brush;color:#2b2b2b;transform:rotate(-2deg)">오늘의 뿡 ♥</div>`,
  // 신문 1면: 제호 · 날짜 줄 · 아래 기사 단
  frame_newspaper: () => `${board('#F3EEDF', 70, 150, 940)}
    <div class="a" style="left:40px;right:40px;top:16px;text-align:center;font:400 104px/1 Gungseo;color:#111;letter-spacing:6px">뿡 일 보</div>
    <div class="a" style="left:40px;right:40px;top:122px;border-top:4px solid #111;border-bottom:1.5px solid #111;height:14px"></div>
    <div class="a" style="left:40px;right:40px;top:1100px;font:400 54px/1.1 BHS;color:#111">[속보] 회의실서 정체불명의 소리</div>
    <div class="a" style="left:40px;right:40px;top:1170px;columns:3;column-gap:24px;font:500 18px/1.35 Gungseo;color:#333;text-align:justify;height:60px;overflow:hidden">목격자들은 "데단했다"고 입을 모았다. 경찰은 냄새의 출처를 조사 중이며 용의자 3명은 모두 혐의를 부인했다. 관계자는 "괄약근의 문제"라고 밝혔다.</div>`,
  // VHS 녹화: 검정 판, 왼쪽 위 PLAY ▶, 아래 SP · 날짜 (노란 OSD 글씨)
  frame_vhs: () => `${board('#0A0A0A', 60, 70, 960)}
    <div class="a" style="left:70px;top:8px;font:700 48px 'Courier New',monospace;color:#F4F4F4;text-shadow:3px 3px 0 #3C3CFF">PLAY ▶</div>
    <div class="a" style="right:70px;top:8px;font:700 48px 'Courier New',monospace;color:#F4F4F4;text-shadow:3px 3px 0 #3C3CFF">SP</div>
    <div class="a" style="left:70px;top:1050px;font:700 56px 'Courier New',monospace;color:#FFE600;text-shadow:3px 3px 0 #000">OCT.23 2026  14:07</div>
    <div class="a" style="left:70px;top:1130px;font:700 40px 'Courier New',monospace;color:#F4F4F4">● REC  방구 홈비디오</div>
    <div class="a" style="inset:0;background:repeating-linear-gradient(180deg,rgba(255,255,255,.04) 0 2px,transparent 2px 6px);pointer-events:none;-webkit-mask:linear-gradient(#000 0 0) exclude,linear-gradient(#000 0 0) 60px 70px/960px 960px no-repeat"></div>`,
  // 금테 액자: 금색 그라데이션 두꺼운 테 + 아래 명판
  frame_gold: () => `${board('linear-gradient(135deg,#7A5600,#F8E08E 25%,#B8860B 50%,#FFF3B0 70%,#8A6400)', 90, 80, 900, 'box-shadow:inset 0 0 0 10px #5A3E00')}
    <div class="a" style="left:86px;top:76px;width:908px;height:908px;border:6px solid #5A3E00;box-shadow:0 0 0 14px #FFF3B0,0 0 0 20px #5A3E00"></div>
    <div class="a" style="left:330px;right:330px;top:1060px;height:110px;background:linear-gradient(180deg,#FFF3B0,#C9A227);border:4px solid #5A3E00;display:grid;place-items:center;font:400 52px Gungseo;color:#3A2800">걸작 · 뿡</div>`,
  // 지명수배: 누런 종이, WANTED · 현상금
  frame_wanted: () => `${board('radial-gradient(circle at 50% 50%,#F0DCA8,#D2B074 80%,#A8834A)', 150, 230, 780)}
    <div class="a" style="left:0;right:0;top:20px;text-align:center;font:400 190px/1 Poster;color:#3A2410;letter-spacing:8px">WANTED</div>
    <div class="a" style="left:150px;top:226px;width:788px;height:788px;border:6px solid #3A2410"></div>
    <div class="a" style="left:0;right:0;top:1030px;text-align:center;font:400 72px/1.1 Poster;color:#3A2410">방구 상습범</div>
    <div class="a" style="left:0;right:0;top:1120px;text-align:center;font:400 80px/1 BHS;color:#8A1C10">현상금 🪙 1,000,000</div>`,
  // 미술관 액자: 검정 테 · 흰 매트 + 오른쪽 아래 작품 설명 카드
  frame_museum: () => `${board('#F7F6F2', 140, 110, 800)}
    <div class="a" style="left:0;top:0;width:${W}px;height:${H}px;border:34px solid #1B1B1B"></div>
    <div class="a" style="left:136px;top:106px;width:808px;height:808px;box-shadow:inset 0 0 0 4px #ccc"></div>
    <div class="a" style="right:80px;top:960px;width:470px;background:#fff;border:1px solid #ddd;padding:16px 22px;font:500 22px/1.45 system-ui;color:#222;box-shadow:0 3px 0 rgba(0,0,0,.08)">
      <b style="font:400 34px Gungseo;color:#111">무제 (뿡)</b><br>2026, 디지털 · 괄약근<br><span style="color:#777">작가의 의도: 참을 수 없었음</span></div>`
};

const TYPES = { '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = http.createServer(async (req, res) => {
  const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  try { res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'text/html' }); res.end(await fs.readFile(file)); }
  catch { res.writeHead(404); res.end(); }
}).listen(0);
const base = `http://localhost:${server.address().port}`;

await fs.mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H } });
for (const [id, frame] of Object.entries(FRAMES)) {
  await page.goto(`${base}/index.html`);
  await page.setContent(`<!doctype html><html><head><base href="${base}/"><style>${FONTS}</style></head><body>${frame()}</body></html>`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  const png = path.join(OUT, `${id}.png`);
  await page.screenshot({ path: png, omitBackground: true });
  console.log(png);
}
await browser.close();
server.close();
