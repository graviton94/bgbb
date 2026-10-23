// 이름만 있던 배경 13종을 직접 그린다: HTML/CSS + 이모지 + 앱 그림 · 글씨로 장면을 만들고 찍는다.
//   node tools/draw_backgrounds.mjs            (Playwright 필요: npm i -D playwright)
// 결과: assets/skin/bg/<id>.png (720×1560) → python3 tools/prepare_skins.py 처럼 webp 로 바꿔 넣는다 (아래에서 바로 webp 로 저장).
// 앱은 사진 배경의 위쪽 절반을 바탕색으로 덮으니 (items.js photo) 볼거리는 아래쪽 절반에 둔다.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'assets/skin/bg');
const TYPES = { '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2' };

const FONTS = `
@font-face{font-family:BHS;src:url(/assets/fonts/blackhansans.woff2)}
@font-face{font-family:Gungseo;src:url(/assets/fonts/songmyung.woff2)}
@font-face{font-family:Wadang;src:url(/assets/fonts/kiranghaerang.woff2)}
@font-face{font-family:Poster;src:url(/assets/fonts/blackandwhitepicture.woff2)}
@font-face{font-family:Gugi;src:url(/assets/fonts/gugi.woff2)}
@font-face{font-family:Brush;src:url(/assets/fonts/eastseadokdo.woff2)}
*{box-sizing:border-box}
body{margin:0;width:360px;height:780px;position:relative;overflow:hidden;font-family:system-ui,'Noto Sans KR',sans-serif}
.a{position:absolute}
.emoji{font-family:'Noto Color Emoji',sans-serif;line-height:1}
`;
const rnd = (a, b) => a + Math.random() * (b - a);
const many = (n, fn) => Array.from({ length: n }, (_, i) => fn(i)).join('');
const deco = n => `/assets/deco/${n}.webp`;

const SCENES = {
  // 단톡방: 하늘색 채팅창, 남의 말풍선 · 내 노란 말풍선 · 읽음 숫자
  bg_kakao: () => {
    const them = (who, text, y, n) => `<div class="a" style="left:14px;top:${y}px;display:flex;gap:8px">
      <div style="width:38px;height:38px;border-radius:14px;background:#9DB4C8;display:grid;place-items:center" class="emoji">${[...who][0]}</div>
      <div><div style="font-size:11px;color:#3A4B5C;margin-bottom:3px">${[...who].slice(2).join('')}</div>
      <div style="display:flex;align-items:flex-end;gap:4px"><span style="background:#fff;border-radius:4px 14px 14px 14px;padding:8px 11px;font-size:14px;max-width:210px">${text}</span><span style="font-size:10px;color:#FFE600;font-weight:900">${n}</span></div></div></div>`;
    const me = (text, y, n) => `<div class="a" style="right:14px;top:${y}px;display:flex;align-items:flex-end;gap:4px"><span style="font-size:10px;color:#FFE600;font-weight:900">${n}</span><span style="background:#FEE500;border-radius:14px 4px 14px 14px;padding:8px 11px;font-size:14px;max-width:220px">${text}</span></div>`;
    return `<div style="position:absolute;inset:0;background:#B2C7D9"></div>
      <div class="a" style="left:0;right:0;top:0;height:56px;background:#A3B8CC;display:flex;align-items:center;padding:0 16px;font-weight:800;font-size:16px">‹ &nbsp;방구 대책 위원회 (37)</div>
      <div class="a" style="left:0;right:0;top:330px;text-align:center"><span style="background:rgba(0,0,0,.15);color:#fff;border-radius:999px;padding:3px 12px;font-size:11px">2026년 10월 23일 목요일</span></div>
      ${them('🐹 김부장', '방금 회의실 누구야', 364, 12)}
      ${them('🐱 이대리', 'ㅋㅋㅋㅋㅋㅋㅋㅋ', 428, 11)}
      ${them('🐦 박사원', '저 아닙니다 진짜로', 488, 10)}
      ${me('나 아님', 556, 9)}
      ${them('🐹 김부장', '소리가 데단했음', 600, 8)}
      ${me('증거 있음?', 664, 7)}
      <div class="a" style="left:0;right:0;bottom:0;height:52px;background:#fff;display:flex;align-items:center;padding:0 12px;gap:10px;color:#aaa;font-size:14px"><span style="font-size:22px;color:#888">＋</span><span style="flex:1;background:#F3F3F3;border-radius:999px;padding:8px 14px">메시지 입력</span><span class="emoji" style="font-size:20px">💨</span></div>`;
  },
  // 무지개 썸네일: 무지개 + 햇살 + 빨간 화살표 · 노란 동그라미 · 충격 글씨
  bg_rainbow: () => `<div style="position:absolute;inset:0;background:linear-gradient(115deg,#FF00C8,#FF2E2E,#FFE600,#2EFF6A,#22C8FF,#8A2BFF)"></div>
    <div class="a" style="left:50%;top:62%;width:1400px;height:1400px;translate:-50% -50%;background:repeating-conic-gradient(rgba(255,255,255,.22) 0 8deg,transparent 8deg 16deg)"></div>
    <div class="a" style="left:22px;top:470px;width:150px;height:150px;border-radius:50%;border:9px solid #FFE600;box-shadow:0 0 0 4px #E0262B"></div>
    <div class="a" style="right:16px;top:520px;font:400 92px/1 BHS;color:#E0262B;-webkit-text-stroke:4px #fff;transform:rotate(-30deg)">➜</div>
    <div class="a" style="left:-6px;bottom:96px;font:400 74px/1 BHS;color:#FFE600;-webkit-text-stroke:3px #E0262B;paint-order:stroke fill;transform:rotate(-8deg)">충격실화</div>
    <div class="a" style="right:14px;bottom:28px;font:900 20px system-ui;color:#fff;text-shadow:2px 2px 0 #333">구독과 좋아요*^^*</div>
    <div class="a" style="left:180px;top:420px;font:400 40px Wadang;color:#2238FF;-webkit-text-stroke:1.5px #fff;transform:rotate(10deg)">ㄷㄷㄷ</div>`,
  // 회색 PPT: 그라데이션 슬라이드, 점선 자리표시 상자, 별 클립아트, 슬라이드 번호
  bg_ppt: () => `<div style="position:absolute;inset:0;background:linear-gradient(180deg,#3A3A3A,#9A9A9A 60%,#2E2E2E)"></div>
    <div class="a" style="left:24px;right:24px;top:300px;height:110px;border:2px dashed rgba(255,255,255,.6);display:grid;place-items:center;font:400 30px Gungseo;color:rgba(255,255,255,.85)">제목을 입력하십시오</div>
    <div class="a" style="left:24px;right:24px;top:430px;height:200px;border:2px dashed rgba(255,255,255,.45);padding:18px;font:400 18px/1.9 Gungseo;color:rgba(255,255,255,.75)">• 텍스트를 입력하십시오<br>&nbsp;&nbsp;– 둘째 수준<br>&nbsp;&nbsp;&nbsp;&nbsp;» 셋째 수준</div>
    <img class="a" src="${deco('stars')}" style="right:30px;top:640px;width:90px">
    <div class="a" style="left:0;right:0;bottom:44px;height:6px;background:linear-gradient(90deg,#E3B320,#FFF6B0,#E3B320)"></div>
    <div class="a" style="left:24px;bottom:16px;font-size:11px;color:#ddd">Copyright ⓒ 방구뿡 All rights reserved.</div>
    <div class="a" style="right:24px;bottom:14px;font:700 13px system-ui;color:#fff">7 / 52</div>`,
  // CCTV: 야간 녹색, 주사선, REC · 시각 · 모서리 괄호, 가운데 의자 실루엣
  bg_cctv: () => `<div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 65%,#2C5A2E,#0E2A16 60%,#030A05)"></div>
    <div class="a" style="left:40px;right:40px;bottom:150px;height:170px;background:linear-gradient(180deg,#1E3F20,#14301A);border-radius:6px;transform:perspective(400px) rotateX(38deg)"></div>
    ${many(5, i => `<div class="a" style="left:${46 + i * 58}px;bottom:${300 + (i % 2) * 6}px;width:40px;height:62px;border-radius:10px 10px 4px 4px;background:#0B1F0D"></div>`)}
    <div class="a" style="inset:0;background:repeating-linear-gradient(180deg,rgba(0,0,0,.3) 0 2px,transparent 2px 6px)"></div>
    <div class="a" style="left:18px;top:360px;font:900 20px system-ui;color:#FF2E2E">● REC</div>
    <div class="a" style="right:18px;top:362px;font:700 15px 'Courier New',monospace;color:#E6FFE6">CAM 03 · 회의실</div>
    <div class="a" style="left:18px;bottom:22px;font:700 16px 'Courier New',monospace;color:#E6FFE6">2026-10-23 14:07:33</div>
    ${['left:14px;top:400px;border-width:3px 0 0 3px', 'right:14px;top:400px;border-width:3px 3px 0 0', 'left:14px;bottom:54px;border-width:0 0 3px 3px', 'right:14px;bottom:54px;border-width:0 3px 3px 0'].map(p => `<div class="a" style="${p};width:34px;height:34px;border-style:solid;border-color:#E6FFE6"></div>`).join('')}
    <div class="a" style="left:0;right:0;bottom:200px;text-align:center;white-space:nowrap;font:700 14px 'Courier New',monospace;color:#E6FFE6;opacity:.8">MOTION DETECTED: 엉덩이</div>`,
  // 뉴스 스튜디오: 파란 무대, 뒤 대형 화면 '속보', 도시 실루엣, 아래 빨간 자막 띠
  bg_news: () => `<div style="position:absolute;inset:0;background:linear-gradient(160deg,#0B2A6F,#1F5FD1)"></div>
    <div class="a" style="inset:0;background:repeating-linear-gradient(90deg,rgba(255,255,255,.06) 0 2px,transparent 2px 60px)"></div>
    <div class="a" style="left:0;right:0;bottom:120px;height:170px;background:${many(1, () => '')}linear-gradient(0deg,#0A1F55,transparent)"></div>
    ${many(14, i => `<div class="a" style="left:${i * 27}px;bottom:150px;width:24px;height:${Math.round(rnd(50, 150))}px;background:#0D2560;box-shadow:inset 0 0 0 2px rgba(255,230,0,.08)"></div>`)}
    <div class="a" style="left:40px;right:40px;top:400px;height:150px;border-radius:8px;background:#0A1A40;border:4px solid #8FB4FF;display:grid;place-items:center">
      <span style="font:400 62px BHS;color:#fff;background:#E0262B;padding:4px 18px">속보</span></div>
    <div class="a" style="left:0;right:0;bottom:62px;height:44px;background:#E0262B;display:flex;align-items:center;font:800 16px system-ui;color:#fff;white-space:nowrap;overflow:hidden"><span style="background:#111;padding:0 10px;height:100%;display:grid;place-items:center">BBN</span>&nbsp; 회의실서 정체불명의 소리… 목격자 "데단했다" · 경찰 "냄새 조사 중" ·</div>
    <div class="a" style="left:0;right:0;bottom:0;height:62px;background:#0A1A40;color:#8FB4FF;font:700 14px system-ui;display:flex;align-items:center;justify-content:space-between;padding:0 16px"><span>뿡뉴스 24</span><span>LIVE ●</span></div>`,
  // 상장: 크림 바탕 금테 두 줄, 흐린 '상장' 궁서 워터마크, 빨간 도장
  bg_award: () => `<div style="position:absolute;inset:0;background:#FFFBEA"></div>
    <div class="a" style="inset:14px;border:6px double #C9A227"></div>
    <div class="a" style="inset:26px;border:1.5px solid #C9A227"></div>
    ${['left:22px;top:22px', 'right:22px;top:22px', 'left:22px;bottom:22px', 'right:22px;bottom:22px'].map(p => `<div class="a emoji" style="${p};font-size:26px;color:#C9A227">❖</div>`).join('')}
    <div class="a" style="left:0;right:0;top:420px;text-align:center;font:400 120px Gungseo;letter-spacing:40px;color:rgba(201,162,39,.16)">상장</div>
    <div class="a" style="left:0;right:0;top:580px;text-align:center;font:400 22px Gungseo;color:rgba(80,60,0,.45)">위 사람은 괄약근 부문에서<br>뛰어난 성적을 거두었기에</div>
    <div class="a" style="right:44px;bottom:52px;width:78px;height:78px;border-radius:50%;border:4px solid rgba(224,38,43,.7);display:grid;place-items:center;font:400 30px Gungseo;color:rgba(224,38,43,.75);transform:rotate(-12deg)">뿡</div>`,
  // 주식 창: 검정 바탕, 빨강(상승) 파랑(하락) 캔들, 폭락 선, 종목 현황
  bg_stock: () => {
    let y = 440, candles = '';
    for (let i = 0; i < 16; i++) {
      const up = i < 6 ? Math.random() < 0.7 : Math.random() < 0.2, h = rnd(14, 46), x = 14 + i * 21;
      const top = up ? y - h : y;
      candles += `<div class="a" style="left:${x + 7}px;top:${top - 10}px;width:2px;height:${h + 20}px;background:${up ? '#FF3B3B' : '#3B7BFF'}"></div><div class="a" style="left:${x}px;top:${top}px;width:16px;height:${h}px;background:${up ? '#FF3B3B' : '#3B7BFF'}"></div>`;
      y = up ? y - h * 0.6 : y + h * 0.9;
    }
    return `<div style="position:absolute;inset:0;background:#0F1115"></div>
      <div class="a" style="inset:0;background:repeating-linear-gradient(180deg,transparent 0 59px,#262B34 59px 60px)"></div>
      ${candles}
      <div class="a" style="left:16px;top:360px;font:800 16px system-ui;color:#fff">뿡전자 <span style="color:#3B7BFF">▼ 29.9%</span> <span style="background:#3B7BFF;color:#fff;padding:1px 6px;border-radius:4px;font-size:12px">하한가</span></div>
      <div class="a" style="left:0;right:0;bottom:0;height:150px;background:#151922;border-top:1px solid #262B34;padding:12px 16px;font:600 14px/2 system-ui;color:#C8CDD8">
        <div style="display:flex;justify-content:space-between"><span>괄약근바이오</span><span style="color:#FF3B3B">+12.4%</span></div>
        <div style="display:flex;justify-content:space-between"><span>방구에너지</span><span style="color:#3B7BFF">-8.1%</span></div>
        <div style="display:flex;justify-content:space-between"><span>탈취제홀딩스</span><span style="color:#FF3B3B">+30.0% 상한가</span></div></div>`;
  },
  // 야식 타임: 밤 방, 창문 달, 상 위 라면 · 치킨 · 맥주, 네온 문구
  bg_night: () => `<div style="position:absolute;inset:0;background:linear-gradient(180deg,#1F2747,#2B2140)"></div>
    <div class="a" style="right:30px;top:370px;width:130px;height:150px;background:#0E1430;border:6px solid #4A3A60;box-shadow:inset 0 0 0 3px #4A3A60"><img src="${deco('moon')}" style="width:70px;margin:20px 0 0 30px"></div>
    <div class="a" style="left:20px;top:400px;font:400 34px Wadang;color:#FF6FB5;text-shadow:0 0 8px #FF6FB5,0 0 18px #FF2EA6">야식은<br>0칼로리</div>
    <div class="a" style="left:0;right:0;bottom:0;height:200px;background:linear-gradient(180deg,#6B4A2E,#4A3220)"></div>
    <div class="a" style="left:0;right:0;bottom:196px;height:10px;background:#8A6440"></div>
    <div class="a emoji" style="left:30px;bottom:150px;font-size:70px">🍜</div>
    <div class="a emoji" style="left:140px;bottom:156px;font-size:64px">🍗</div>
    <div class="a emoji" style="right:30px;bottom:154px;font-size:62px">🍺</div>
    <div class="a" style="left:0;right:0;bottom:40px;text-align:center;font:700 13px system-ui;color:rgba(255,255,255,.5)">오후 11:58 · 내일의 나에게 미안</div>`,
  // 돈 비: 연두 바탕, 지폐 · 동전이 막 쏟아짐
  bg_money: () => `<div style="position:absolute;inset:0;background:radial-gradient(circle at 50% 70%,#FFF7B0,#9BE36A 70%,#5FBF4A)"></div>
    ${many(18, i => `<img class="a" src="${deco('money_bill')}" style="left:${rnd(-30, 320).toFixed(0)}px;top:${rnd(330, 760).toFixed(0)}px;width:${rnd(70, 110).toFixed(0)}px;transform:rotate(${rnd(-60, 60).toFixed(0)}deg)">`)}
    ${many(8, () => `<div class="a emoji" style="left:${rnd(0, 320).toFixed(0)}px;top:${rnd(380, 740).toFixed(0)}px;font-size:${rnd(26, 40).toFixed(0)}px">🪙</div>`)}
    <img class="a" src="${deco('money_gun')}" style="left:10px;bottom:20px;width:150px;transform:rotate(-14deg)">`,
  // 도서관 열람실: 책장 두 줄 (알록달록 책등), 긴 책상, 스탠드, '정숙' · '방구 금지'
  bg_library: () => {
    const shelf = (top) => `<div class="a" style="left:0;right:0;top:${top}px;height:92px;background:#5A3A22;padding:6px 6px 0;display:flex;align-items:flex-end;gap:2px">${many(30, () => `<i style="display:block;width:${rnd(8, 14).toFixed(0)}px;height:${rnd(56, 80).toFixed(0)}px;background:hsl(${rnd(0, 360).toFixed(0)},${rnd(30, 60).toFixed(0)}%,${rnd(30, 55).toFixed(0)}%);border-radius:1px"></i>`)}</div><div class="a" style="left:0;right:0;top:${top + 92}px;height:8px;background:#3E2716"></div>`;
    return `<div style="position:absolute;inset:0;background:#EFE6D6"></div>
      ${shelf(300)}${shelf(402)}
      <div class="a" style="left:50%;top:340px;translate:-50% 0;background:#fff;border:3px solid #E0262B;padding:4px 14px;font:400 30px Gungseo;color:#E0262B">정 숙</div>
      <div class="a" style="left:0;right:0;bottom:0;height:270px;background:linear-gradient(180deg,#C79A62,#A87A45)"></div>
      <div class="a" style="left:0;right:0;bottom:262px;height:12px;background:#8A5E30"></div>
      ${many(3, i => `<div class="a" style="left:${30 + i * 110}px;bottom:250px;width:2px;height:60px;background:#444"></div><div class="a" style="left:${14 + i * 110}px;bottom:300px;width:36px;height:18px;border-radius:18px 18px 4px 4px;background:#2E7D32"></div>`)}
      <div class="a" style="right:18px;bottom:40px;background:#FFE600;border:3px solid #111;padding:6px 10px;font:400 20px Gugi;transform:rotate(-6deg)">방구 금지 🚫</div>
      <div class="a emoji" style="left:26px;bottom:60px;font-size:44px">📚</div>`;
  },
  // 결혼식장: 분홍 홀, 꽃 아치, 빨간 카펫 원근, '축 결혼' 궁서 현수막, 샹들리에
  bg_wedding: () => `<div style="position:absolute;inset:0;background:linear-gradient(180deg,#FFE3EE,#FFC2D6)"></div>
    <div class="a emoji" style="left:50%;top:330px;translate:-50% 0;font-size:56px">✨🕯️✨</div>
    <div class="a" style="left:50%;top:400px;translate:-50% 0;width:260px;height:300px;border:16px solid transparent;border-radius:130px 130px 0 0;background:linear-gradient(#FFE3EE,#FFE3EE) padding-box,repeating-conic-gradient(#FF6FB5 0 15deg,#fff 15deg 30deg) border-box"></div>
    ${many(9, i => `<div class="a emoji" style="left:${50 + Math.cos(Math.PI * (i / 8)) * -130 + 130}px;top:${560 - Math.sin(Math.PI * (i / 8)) * 150}px;font-size:28px">🌸</div>`)}
    <div class="a" style="left:50%;bottom:0;translate:-50% 0;width:360px;height:250px;background:#C8102E;clip-path:polygon(40% 0,60% 0,100% 100%,0 100%)"></div>
    <div class="a" style="left:50%;top:470px;translate:-50% 0;background:#fff;border:2px solid #C9A227;padding:6px 18px;font:400 36px Gungseo;color:#C8102E">祝 결혼</div>
    <div class="a" style="left:0;right:0;bottom:24px;text-align:center"><span style="background:#fff;border:2px solid #C9A227;padding:2px 12px;font:400 26px Brush;color:#8A0A20">신랑 방구 ♥ 신부 참음</span></div>`,
  // 새벽 치킨: 어두운 방, 치킨 상자 + 다리, 맥주, 시계 02:13, 네온
  bg_chicken: () => `<div style="position:absolute;inset:0;background:linear-gradient(180deg,#1A1410,#2B1E14)"></div>
    <div class="a" style="right:24px;top:360px;font:700 34px 'Courier New',monospace;color:#FF3B3B;text-shadow:0 0 10px #FF3B3B">02:13</div>
    <div class="a" style="left:22px;top:380px;font:400 30px Wadang;color:#FFD400;text-shadow:0 0 8px #FFB000,0 0 20px #FF8A00">치킨은<br>살 안 쪄요</div>
    <div class="a" style="left:0;right:0;bottom:0;height:230px;background:linear-gradient(180deg,#5A3A22,#3E2716)"></div>
    <div class="a" style="left:40px;bottom:120px;width:200px;height:130px;background:#fff;border:3px solid #111;border-radius:6px;transform:rotate(-4deg)">
      <div style="background:#E0262B;color:#fff;font:400 26px BHS;text-align:center;padding:4px">뿡뿡 치킨</div>
      <div class="emoji" style="font-size:56px;text-align:center;margin-top:6px">🍗🍗</div></div>
    <div class="a emoji" style="right:40px;bottom:124px;font-size:76px">🍺</div>
    <div class="a emoji" style="right:120px;bottom:118px;font-size:40px">🧂</div>
    <div class="a" style="left:0;right:0;bottom:40px;text-align:center;font:700 13px system-ui;color:rgba(255,255,255,.45)">내일 아침의 나: ?</div>`,
  // 한옥 마루: 기와 처마, 창호지 문살, 나무 마루, 청사초롱, 복 글씨
  bg_hanbok: () => `<div style="position:absolute;inset:0;background:#F3E9D2"></div>
    <div class="a" style="left:-20px;right:-20px;top:300px;height:46px;background:repeating-linear-gradient(90deg,#3B3B3B 0 22px,#555 22px 26px);border-radius:0 0 50% 50%/0 0 30px 30px"></div>
    <div class="a" style="left:20px;right:20px;top:360px;height:240px;background:#FBF6EA;border:10px solid #7A4A2A;background-image:linear-gradient(#7A4A2A 0 0),linear-gradient(#7A4A2A 0 0);background-size:4px 100%,100% 4px;background-position:center,center;background-repeat:no-repeat">
      <div style="position:absolute;inset:0;background:repeating-linear-gradient(90deg,transparent 0 36px,#9A6A42 36px 39px),repeating-linear-gradient(180deg,transparent 0 36px,#9A6A42 36px 39px)"></div></div>
    <div class="a" style="left:132px;top:432px;width:96px;height:96px;background:#C8102E;transform:rotate(45deg)"></div>
    <div class="a" style="left:0;right:0;top:442px;text-align:center;font:400 58px/1.3 Gungseo;color:#FFE600">福</div>
    <div class="a" style="left:0;right:0;bottom:0;height:180px;background:repeating-linear-gradient(90deg,#B9824D 0 58px,#A87443 58px 60px)"></div>
    <div class="a" style="left:0;right:0;bottom:176px;height:8px;background:#6B3E1E"></div>
    ${[24, 296].map(x => `<div class="a" style="left:${x}px;top:610px;width:40px;height:60px;border-radius:14px;background:linear-gradient(180deg,#C8102E 0 45%,#1E3A8A 45%);box-shadow:0 0 18px rgba(255,200,0,.6)"></div><div class="a" style="left:${x + 19}px;top:590px;width:2px;height:22px;background:#333"></div>`).join('')}
    <div class="a" style="left:0;right:0;bottom:46px;text-align:center;font:400 26px Brush;color:#5A3A22">새해 복 많이 뀌세요</div>`
};

const server = http.createServer(async (req, res) => {
  const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  try {
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'text/html' });
    res.end(await fs.readFile(file));
  } catch { res.writeHead(404); res.end(); }
}).listen(0);
const base = `http://localhost:${server.address().port}`;
const only = process.argv.slice(2);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 360, height: 780 }, deviceScaleFactor: 2 });
for (const [id, scene] of Object.entries(SCENES)) {
  if (only.length && !only.includes(id)) continue;
  await page.goto(`${base}/index.html`);   // 같은 출처라야 글꼴 · 그림을 불러올 수 있다
  await page.setContent(`<!doctype html><html><head><base href="${base}/"><style>${FONTS}</style></head><body>${scene()}</body></html>`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  const png = path.join(OUT, `${id}.png`);
  await page.screenshot({ path: png });
  console.log(png);
}
await browser.close();
server.close();
