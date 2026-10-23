// 꾸미기 아이템 카탈로그. 홈 배경 · 캐릭터 옆 소품 · 말풍선 · 캐릭터 모습 (원화 / 실사).
// 얻는 법: free (처음부터) · title (그 칭호를 따면 무료) · price (뿡코인으로 사기). title 과 price 를 같이 두면 둘 중 아무거나.
// season: [월, …] 시즌 한정 (그 달에만 살 수 있음, 산 건 계속 가짐).
// 새 그림이 오면 assets/skin/<slot>/<id>.webp 로 넣고 여기 한 줄 추가하면 끝 (짤 뽑기 · 칭호 보상 · 상점이 모두 이 목록을 쓴다).
const sky = (a, b) => `linear-gradient(180deg, ${a}, ${b})`;
const skin = (slot, id) => `assets/skin/${slot}/${id}.webp`;
// 사진 배경: 위쪽(큰 글자 자리)은 바탕색으로 살짝 덮어 글자가 읽히게
const photo = (id, dark) => `linear-gradient(180deg, ${dark ? 'rgba(12,12,16,.82), rgba(12,12,16,.5) 30%, rgba(12,12,16,0) 52%' : 'rgba(242,242,240,.9), rgba(242,242,240,.55) 30%, rgba(242,242,240,0) 52%'}), url(${skin('bg', id)}) center / cover`;

export const SLOTS = ['bg', 'prop', 'wear', 'fx', 'bubble', 'font', 'frame', 'look'];
export const SLOT_NAMES = {
  bg: { ko: '배경', en: 'Background' },
  prop: { ko: '소품', en: 'Prop' },
  wear: { ko: '착용', en: 'Wear' },
  fx: { ko: '뿡 효과', en: 'Toot FX' },
  bubble: { ko: '말풍선', en: 'Bubble' },
  frame: { ko: '공유 프레임', en: 'Share frame' },
  font: { ko: '구린 글씨', en: 'Cringe font' },
  look: { ko: '모습', en: 'Look' }
};

// bg: css = 홈 전체 배경 (CSS background 값), dark = 글자를 흰색으로, vivid = 알록달록해서 흐린 글자도 진하게, frame = 상장 테두리 색
const BG = [
  { id: 'bg_plain', name: { ko: '무표정 회색', en: 'Poker-face grey' }, free: true, css: '#F2F2F0' },
  { id: 'bg_kakao', name: { ko: '단톡방', en: 'Group chat' }, title: 'soft3', price: 40, css: '#B2C7D9' },
  { id: 'bg_rainbow', name: { ko: '무지개 썸네일', en: 'Rainbow thumbnail' }, title: 'ensemble', price: 90, vivid: true,
    css: 'linear-gradient(115deg, #FF00C8, #FF2E2E, #FFE600, #2EFF6A, #22C8FF, #8A2BFF)' },
  { id: 'bg_ppt', name: { ko: '회색 PPT', en: 'Grey slide deck' }, price: 60, dark: true, css: sky('#3A3A3A', '#9A9A9A') },
  { id: 'bg_cctv', name: { ko: 'CCTV', en: 'CCTV' }, title: 'meeting_loud', dark: true,
    css: 'repeating-linear-gradient(180deg, rgba(0,0,0,.28) 0 2px, transparent 2px 8px), linear-gradient(180deg, #0E2A16, #071009)' },
  { id: 'bg_news', name: { ko: '뉴스 스튜디오', en: 'News studio' }, title: 'first_today', price: 50, dark: true,
    css: 'repeating-linear-gradient(90deg, rgba(255,255,255,.06) 0 2px, transparent 2px 60px), linear-gradient(160deg, #0B2A6F, #1F5FD1)' },
  { id: 'bg_award', name: { ko: '상장 테두리', en: 'Certificate' }, title: 'streak7', css: '#FFFBEA', frame: '#C9A227' },
  { id: 'bg_stock', name: { ko: '주식 창', en: 'Stock chart' }, title: 'loud5', price: 70, dark: true,
    css: 'repeating-linear-gradient(180deg, transparent 0 59px, #262B34 59px 60px), #0F1115' },
  { id: 'bg_night', name: { ko: '야식 타임', en: 'Midnight snack' }, title: 'night_quiet', price: 60, dark: true,
    css: `url(assets/deco/stars.webp) right 12% top 22% / 34% no-repeat, ${sky('#1F2747', '#2B2140')}` },
  { id: 'bg_money', name: { ko: '돈 비', en: 'Money rain' }, title: 'jp_rain',
    css: 'url(assets/deco/money_rain.webp) center 30% / 90% no-repeat, #E8FFD9' },
  // 사진 · 3D 배경 (assets/skin/bg)
  { id: 'bg_office', name: { ko: '사무실 책상', en: 'Office desk' }, title: 'monday', price: 70, css: photo('bg_office') },
  { id: 'bg_meeting', name: { ko: '회의실', en: 'Meeting room' }, title: 'meeting_hold', price: 90, css: photo('bg_meeting') },
  { id: 'bg_subway', name: { ko: '지하철', en: 'Subway' }, title: 'evening', price: 70, css: photo('bg_subway') },
  { id: 'bg_elevator', name: { ko: '엘리베이터', en: 'Elevator' }, title: 'double_loud', price: 80, css: photo('bg_elevator') },
  { id: 'bg_library', name: { ko: '도서관 열람실', en: 'Library' }, title: 'hold3', price: 80, css: photo('bg_library') },
  { id: 'bg_toilet', name: { ko: '화장실 칸', en: 'Toilet stall' }, price: 60, css: photo('bg_toilet') },
  { id: 'bg_wedding', name: { ko: '결혼식장', en: 'Wedding hall' }, title: 'jp_the', css: photo('bg_wedding') },
  { id: 'bg_chicken', name: { ko: '새벽 치킨', en: '2AM chicken' }, title: 'overeat', price: 80, dark: true, css: photo('bg_chicken', true) },
  { id: 'bg_minihompy', name: { ko: '방구월드 미니홈피', en: 'Fartworld homepage' }, price: 100, css: photo('bg_minihompy') },
  { id: 'bg_error', name: { ko: '엉덩이.exe 오류', en: 'butt.exe error' }, title: 'broke', price: 90, dark: true, css: photo('bg_error', true) },
  { id: 'bg_vapor', name: { ko: '베이퍼웨이브', en: 'Vaporwave' }, price: 150, dark: true, css: photo('bg_vapor', true) },
  { id: 'bg_space', name: { ko: '우주 (방구 추진)', en: 'Space (toot-powered)' }, title: 'jp_heritage', dark: true, css: photo('bg_space', true) },
  { id: 'bg_snow', name: { ko: '눈 오는 밤', en: 'Snowy night' }, price: 60, season: [12], dark: true, css: photo('bg_snow', true) },
  { id: 'bg_hanbok', name: { ko: '한옥 마루', en: 'Hanok porch' }, price: 60, season: [1, 2], css: photo('bg_hanbok') },
  { id: 'bg_upsidedown', name: { ko: '뒤집힌 방', en: 'Upside-down room' }, price: 60, season: [4], css: photo('bg_upsidedown') },
];

// prop: 캐릭터 반대쪽 아래에 서 있는 소품 (assets/deco)
const deco = n => `assets/deco/${n}.webp`;
const PROP = [
  { id: 'prop_none', name: { ko: '없음', en: 'None' }, free: true },
  { id: 'prop_sun', name: { ko: '해', en: 'Sun' }, title: 'morning', price: 20, src: deco('sun') },
  { id: 'prop_moon', name: { ko: '달', en: 'Moon' }, title: 'night', price: 20, src: deco('moon') },
  { id: 'prop_cloud', name: { ko: '구름', en: 'Cloud' }, price: 15, src: deco('cloud') },
  { id: 'prop_balloon', name: { ko: '풍선', en: 'Balloon' }, price: 25, src: deco('balloon') },
  { id: 'prop_sunflower', name: { ko: '해바라기', en: 'Sunflower' }, title: 'hamster', price: 25, src: deco('sunflower') },
  { id: 'prop_tree', name: { ko: '나무', en: 'Tree' }, title: 'afternoon', price: 25, src: deco('tree') },
  { id: 'prop_carrot', name: { ko: '당근', en: 'Carrot' }, title: 'lunch', price: 20, src: deco('carrot') },
  { id: 'prop_box', name: { ko: '숨을 상자', en: 'Hiding box' }, title: 'weekend_nap', price: 35, src: deco('box') },
  { id: 'prop_campfire', name: { ko: '모닥불', en: 'Campfire' }, title: 'evening', price: 35, src: deco('campfire') },
  { id: 'prop_gun', name: { ko: '머니건', en: 'Money gun' }, title: 'jp_heir', src: deco('money_gun') },
  { id: 'prop_whoopee', name: { ko: '뿡방석', en: 'Whoopee cushion' }, title: 'first_today', price: 30, src: skin('prop', 'prop_whoopee') },
  { id: 'prop_megaphone', name: { ko: '확성기', en: 'Megaphone' }, title: 'loud5', price: 50, src: skin('prop', 'prop_megaphone') },
  { id: 'prop_extinguisher', name: { ko: '소화기', en: 'Fire extinguisher' }, title: 'loud_basic', price: 40, src: skin('prop', 'prop_extinguisher') },
  { id: 'prop_spray', name: { ko: '탈취제', en: 'Air freshener' }, title: 'soft_basic', price: 30, src: skin('prop', 'prop_spray') },
  { id: 'prop_trophy', name: { ko: '괄약근 대상 트로피', en: 'Clench trophy' }, title: 'streak30', src: skin('prop', 'prop_trophy') },
  { id: 'prop_medal', name: { ko: '금메달', en: 'Gold medal' }, title: 'total100', src: skin('prop', 'prop_medal') },
  { id: 'prop_gasmask', name: { ko: '방독면', en: 'Gas mask' }, title: 'trinity', price: 120, src: skin('prop', 'prop_gasmask') },
  { id: 'prop_candle', name: { ko: '향초', en: 'Scented candle' }, price: 35, src: skin('prop', 'prop_candle') },
  { id: 'prop_fan', name: { ko: '선풍기', en: 'Desk fan' }, price: 40, src: skin('prop', 'prop_fan') },
  { id: 'prop_mic', name: { ko: '노래방 마이크', en: 'Karaoke mic' }, title: 'friday', price: 50, src: skin('prop', 'prop_mic') },
  { id: 'prop_sweetpotato', name: { ko: '군고구마', en: 'Sweet potato' }, title: 'lunch_loud', price: 35, src: skin('prop', 'prop_sweetpotato') },
  { id: 'prop_beans', name: { ko: '콩 한 봉지', en: 'Bag of beans' }, title: 'tit', price: 30, src: skin('prop', 'prop_beans') },
  { id: 'prop_milk', name: { ko: '우유팩', en: 'Milk carton' }, title: 'cat', price: 30, src: skin('prop', 'prop_milk') },
  { id: 'prop_warning', name: { ko: '가스 주의', en: 'Gas warning' }, title: 'meeting_loud', price: 60, src: skin('prop', 'prop_warning') },
  { id: 'prop_cctv', name: { ko: 'CCTV', en: 'CCTV camera' }, title: 'night_quiet', price: 60, src: skin('prop', 'prop_cctv') },
  { id: 'prop_chair', name: { ko: '회의 의자', en: 'Office chair' }, title: 'meeting_soft', price: 45, src: skin('prop', 'prop_chair') },
  { id: 'prop_pumpkin', name: { ko: '잭오랜턴', en: 'Jack-o-lantern' }, price: 40, season: [10], src: skin('prop', 'prop_pumpkin') },
  { id: 'prop_bok', name: { ko: '복주머니', en: 'Lucky pouch' }, price: 40, season: [1, 2], src: skin('prop', 'prop_bok') },
  { id: 'prop_yeot', name: { ko: '수능 엿', en: 'Exam-luck taffy' }, price: 40, season: [11], src: skin('prop', 'prop_yeot') }
];

// wear: 얼굴에 쓰는 것. 표정 그림과 같은 캔버스 · 같은 눈 좌표라 (0,0) 에 겹치면 딱 맞음 (원화 · 실사 모두)
const WEAR = [
  { id: 'wear_none', name: { ko: '없음', en: 'None' }, free: true },
  { id: 'wear_heart', name: { ko: '하트 선글라스', en: 'Heart shades' }, title: 'tit_soft', price: 60 },
  { id: 'wear_3d', name: { ko: '3D 안경', en: '3D glasses' }, price: 60 },
  { id: 'wear_groucho', name: { ko: '코주부 안경', en: 'Groucho glasses' }, title: 'cat_hold', price: 80 },
  { id: 'wear_eyepatch', name: { ko: '해적 안대', en: 'Eyepatch' }, title: 'last_call', price: 70 },
  { id: 'wear_mask', name: { ko: '마스크', en: 'Face mask' }, title: 'hold_basic', price: 40 },
  { id: 'wear_gasmask', name: { ko: '방독면', en: 'Gas mask' }, title: 'trinity' },
  { id: 'wear_party', name: { ko: '파티 고깔', en: 'Party hat' }, title: 'streak3', price: 50 },
  { id: 'wear_crown', name: { ko: '종이 왕관', en: 'Paper crown' }, title: 'jp_lotto' },
  { id: 'wear_headset', name: { ko: '회의용 헤드셋', en: 'Headset' }, title: 'meeting_soft', price: 70 },
  { id: 'wear_ribbon', name: { ko: '머리띠 리본', en: 'Big ribbon' }, title: 'first_bell', price: 50 },
  { id: 'wear_nerd', name: { ko: '뿔테 + 반창고', en: 'Taped nerd glasses' }, title: 'monday', price: 60 },
  { id: 'wear_bandana', name: { ko: '필승 두건', en: '"Must win" bandana' }, title: 'streak7', price: 70 },
  { id: 'wear_santa', name: { ko: '산타 모자', en: 'Santa hat' }, price: 50, season: [12] }
].map(x => (x.id === 'wear_none' ? x : { ...x, src: skin('wear', x.id) }));

// fx: 터질 때 날아가는 것 (기본 = 노란 '뿡!' 글자)
const FX = [
  { id: 'fx_toot', name: { ko: '뿡! 글자', en: 'TOOT! letters' }, free: true },
  { id: 'fx_hearts', name: { ko: '젤리 하트', en: 'Jelly hearts' }, price: 60 },
  { id: 'fx_sparkle', name: { ko: '렌즈 플레어', en: 'Lens flare' }, title: 'weekend_nap', price: 70 },
  { id: 'fx_skull', name: { ko: '해골', en: 'Skull' }, title: 'hamster_loud', price: 60 },
  { id: 'fx_rainbow', name: { ko: '무지개', en: 'Rainbow' }, title: 'ensemble', price: 80 },
  { id: 'fx_poop', name: { ko: '똥', en: 'Poop' }, title: 'overeat', price: 50 },
  { id: 'fx_beans', name: { ko: '콩 튀김', en: 'Flying beans' }, price: 40 },
  { id: 'fx_pixel', name: { ko: '복셀 구름', en: 'Voxel cloud' }, price: 50 },
  { id: 'fx_petals', name: { ko: '벚꽃잎', en: 'Cherry petals' }, title: 'morning', price: 50 }
].map(x => (x.id === 'fx_toot' ? x : { ...x, src: skin('fx', x.id) }));

// frame: 공유 이미지 테두리 (가운데 투명한 칸에 짤이 들어감). 기본 = 아래 검은 띠
const FRAME = [
  { id: 'frame_strip', name: { ko: '기본 (검은 띠)', en: 'Basic strip' }, free: true },
  { id: 'frame_polaroid', name: { ko: '폴라로이드', en: 'Polaroid' }, price: 50 },
  { id: 'frame_newspaper', name: { ko: '신문 1면', en: 'Front page' }, title: 'commute', price: 60 },
  { id: 'frame_vhs', name: { ko: 'VHS 녹화', en: 'VHS tape' }, title: 'night_quiet', price: 60 },
  { id: 'frame_gold', name: { ko: '금테 액자', en: 'Gold frame' }, title: 'streak30', price: 150 },
  { id: 'frame_wanted', name: { ko: '지명수배', en: 'WANTED poster' }, title: 'meeting_loud', price: 80 },
  { id: 'frame_museum', name: { ko: '미술관 액자', en: 'Museum frame' }, title: 'hold5', price: 120 }
].map(x => (x.id === 'frame_strip' ? x : { ...x, src: skin('frame', x.id) }));

// bubble: 홈 말풍선 모양 (styles.css 의 .bubble.skin-<id>)
const BUBBLE = [
  { id: 'bubble_basic', name: { ko: '기본', en: 'Basic' }, free: true },
  { id: 'bubble_kakao', name: { ko: '노란 톡', en: 'Yellow chat' }, title: 'meeting_soft', price: 40 },
  { id: 'bubble_impact', name: { ko: '짤 자막', en: 'Meme caption' }, title: 'broke', price: 50 },
  { id: 'bubble_ppt', name: { ko: '무지개 PPT', en: 'Rainbow slide' }, price: 60 },
  { id: 'bubble_receipt', name: { ko: '영수증', en: 'Receipt' }, title: 'total50', price: 45 },
  { id: 'bubble_news', name: { ko: '속보 자막', en: 'Breaking ticker' }, title: 'commute', price: 45 },
  // 그림 말풍선 (늘려서 깔기)
  { id: 'bubble_katalk', name: { ko: '3D 노란 톡', en: '3D yellow chat' }, price: 70, src: skin('bubble', 'bubble_katalk') },
  { id: 'bubble_shout', name: { ko: '외침', en: 'Shout' }, title: 'double_loud', price: 50, src: skin('bubble', 'bubble_shout') },
  { id: 'bubble_thought', name: { ko: '3D 생각 구름', en: '3D thought cloud' }, title: 'meeting_hold', price: 60, src: skin('bubble', 'bubble_thought') },
  { id: 'bubble_torn', name: { ko: '옛날 대화상자', en: 'Retro dialog' }, price: 60, src: skin('bubble', 'bubble_torn') }
];

// look: 홈 캐릭터 모습
const LOOK = [
  { id: 'look_art', name: { ko: '원화', en: 'Drawn' }, free: true },
  { id: 'look_real', name: { ko: '실사', en: 'Real photo' }, title: 'hold5', price: 200 }
];

// 아직 안 내보내는 것: 그림이 아직 임시(자리표시)이거나 누끼 · 위치가 잘못돼서 다시 발주한 것 (docs/skins/REORDER.md).
// 새 그림이 오면 tools/prepare_skins.py 로 변환하고 여기서 빼면 바로 상점 · 칭호 보상에 나온다.
export const PENDING = new Set([
  // 다시 발주 (2차 검수 불량)
  'wear_eyepatch', 'wear_headset', 'wear_nerd', 'wear_bandana', 'wear_santa',
  'wear_gasmask', 'wear_ribbon', 'wear_mask',   // 디자인 탈락
  'prop_mic',
  // 아직 안 옴
  'prop_warning', 'prop_cctv', 'prop_chair', 'prop_pumpkin', 'prop_yeot',
  'bg_library', 'bg_wedding', 'bg_chicken', 'bg_hanbok',
  'fx_beans', 'fx_pixel', 'fx_petals',
  'frame_polaroid', 'frame_newspaper', 'frame_vhs', 'frame_gold', 'frame_wanted', 'frame_museum'
]);

// font: 일부러 구린 꾸밈 글씨. 가진 글씨만 말풍선 · 스티커 · 짤 글자에 가끔 섞인다 (장착한 건 더 자주). deco = src/memes.js DECOR_FONTS 키
const FONT = [
  { id: 'font_basic', name: { ko: '안 구림 (기본)', en: 'Not cringe (default)' }, free: true },
  { id: 'font_gungseo', name: { ko: '근엄한 궁서체', en: 'Solemn brush serif' }, title: 'hold_basic', price: 60, deco: 'gungseo' },
  { id: 'font_wadang', name: { ko: '촌스러운 와당체', en: 'Tacky retro display' }, title: 'soft3', price: 70, deco: 'wadang' },
  { id: 'font_gugi', name: { ko: '동네 간판체', en: 'Corner-shop sign' }, title: 'lunch', price: 50, deco: 'gugi' },
  { id: 'font_poster', name: { ko: '옛날 극장 간판', en: 'Old cinema poster' }, title: 'night_quiet', price: 80, deco: 'poster' },
  { id: 'font_brush', name: { ko: '일필휘지 붓글씨', en: 'One-stroke brush' }, title: 'hold3', price: 70, deco: 'brush' }
];

const BY_SLOT = { bg: BG, prop: PROP, wear: WEAR, fx: FX, bubble: BUBBLE, font: FONT, frame: FRAME, look: LOOK };
export const ITEMS = SLOTS.flatMap(slot => BY_SLOT[slot].filter(x => !PENDING.has(x.id)).map(x => ({ ...x, slot })));
export const itemById = id => ITEMS.find(x => x.id === id);
export const DEFAULT_EQUIP = { bg: 'bg_plain', prop: 'prop_none', wear: 'wear_none', fx: 'fx_toot', bubble: 'bubble_basic', font: 'font_basic', frame: 'frame_strip', look: 'look_art' };

/** 시즌 한정: 지금이 그 달인지 (시즌 없는 건 늘 true) */
export const inSeason = (x, now = Date.now()) => !x.season || x.season.includes(new Date(now).getMonth() + 1);

/** 가졌나: 처음부터 · 그 칭호를 땄음 · 샀음 */
export const isOwned = (x, titles, bought) => !!(x.free || (x.title && titles[x.title]) || bought[x.id]);

// 뿡코인: 터질 때마다 (냄 3 · 진동 2 · 참음 1) + 새 칭호 보너스 (등급별)
export const COINS = { loud: 3, soft: 2, hold: 1 };
export const TITLE_BONUS = { normal: 5, rare: 15, legend: 40, jackpot: 100 };
