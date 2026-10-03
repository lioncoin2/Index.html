/*
 * Blue-light filter glasses — ad v2, problem → solution (1080×1920, 25s, Iraqi dialect, VO-ready).
 * Pop-cartoon style: flat colour, thick black outlines, hard shadows, sticker type.
 *
 *   0.00–3.20   hook: an extreme close-up of a red, watery, twitching eye — the phone glowing in its
 *               pupil — "عيونك تحرگك من كثر الموبايل؟ 😣"; the camera pulls out of the eye
 *   3.20–8.70   the problem: a guy in bed at 3 AM, phone in his face — "الساعة 3 الفجر… وبعدك
 *               لازم الموبايل 📱"; he yawns, rubs his eye; تحرگ · تدمّع · تحمرّ · تتعب pop around
 *               him; the honest cause — "ساعات گبال الشاشة… وبلا راحة 😩"; 💡 "الحل بسيط 👇"
 *   8.70–18.4   the fix (a yellow wipe): 1) the glasses drop onto his face — "أول شي: نظارة فلتر
 *               الضوء الأزرق 👓", "تخفّف الضوء الأزرق اللي يجيك من الشاشة" (blue rays reach the
 *               lenses, the lenses warm), "وإطارها أسود يخبّل 🖤"; 2) the habit — "ثاني شي: كل 20
 *               دقيقة… باوع لبعيد 20 ثانية 👀": he looks out of a window, a 20-second ring fills, and
 *               only now do his eyes clear
 *   18.4–21.7   offer (pink): "سعرها؟ 🤔" — a 20 ألف starburst, "بس!"; a van — "والتوصيل ببلاش! 🚚"
 *   21.7–25.0   end card (yellow): the glasses, the name, 💰 20 ألف · 🚚 توصيل ببلاش, "اطلبها هسة 👇"
 *
 * Honesty: the symptoms and their cause (long hours on a screen without breaks) are real; the
 * glasses are only said to cut the blue light reaching the eye, and the eyes visibly recover
 * with the break habit, not from the glasses alone. No invented discount or stock limit.
 * Engine conventions as orin-ad v5–v7: deterministic seek(t), one owner per transform, 2D
 * transforms only and no layer promotion, full rebuild on backward seeks for the preview.
 */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const RENDER = new URLSearchParams(location.search).has('render');
  if (RENDER) document.body.classList.add('render');

  const W = 1080, H = 1920, DURATION = 25.0, FPS = 60, BPM = 120;
  const T = { hook: 0, pull: 2.5, night: 3.2, yawn: 4.3, sym: 5.0, rub: 5.45, cause: 6.7, idea: 8.4, wipe: 8.75, glasses: 9.6, filter: 12.0, frame: 14.0, tip: 15.6, price: 18.45, free: 20.2, end: 21.65 };
  // voice-over script — [start, end, line]; the captions on screen carry the same words
  const VO = [
    [0.15, 2.30, 'عيونك تحرگك من كثر الموبايل؟'],
    [3.30, 4.90, 'الساعة ثلاثة الفجر… وبعدك لازم الموبايل.'],
    [5.00, 6.50, 'تحرگ… تدمّع… تحمرّ… وتتعب.'],
    [6.80, 8.30, 'ساعات گبال الشاشة… وبلا راحة.'],
    [8.45, 9.40, 'الحل بسيط:'],
    [9.70, 11.80, 'أول شي: نظارة فلتر الضوء الأزرق.'],
    [12.05, 13.80, 'تخفّف الضوء الأزرق اللي يجيك من الشاشة.'],
    [14.05, 15.40, 'وإطارها أسود يخبّل!'],
    [15.70, 18.30, 'وثاني شي: كل عشرين دقيقة، باوع لبعيد عشرين ثانية.'],
    [18.70, 20.00, 'سعرها عشرين ألف بس!'],
    [20.30, 21.50, 'والتوصيل ببلاش!'],
    [22.20, 24.00, 'اطلبها هسة!'],
  ];
  T.vo = VO.map(([a, b, line]) => ({ t0: a, t1: b, line }));

  const INK = '#141414', SKIN = '#F2B98C', HAIR = '#241C18';
  // the guy is a 600×900 box; his head centre is (300,290) inside it, his eyes (212,300) / (388,300)
  const GUY = { bed: { x: 240, y: 730, s: 1 }, sun: { x: 240, y: 810, s: 1.15 } };
  const FOCUS = { x: GUY.bed.x + 212, y: GUY.bed.y + 300 }; // his left eye, where the hook starts
  const NS = 'http://www.w3.org/2000/svg';

  const cues = [];
  const cue = (t, type, extra = {}) => cues.push({ t: Math.round(t * 1000) / 1000, type, ...extra });
  const updaters = [];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  /* ───────────────────────── drawings ───────────────────────── */

  function eyeSVG(id, cx, cy) {
    return `
      <g id="${id}" transform="translate(${cx},${cy})">
        <clipPath id="${id}C"><ellipse rx="64" ry="52"/></clipPath>
        <g clip-path="url(#${id}C)">
          <ellipse rx="64" ry="52" fill="#fff"/>
          <ellipse class="red" rx="64" ry="52" fill="#FF6B7A" opacity="0"/>
          <g class="veins" fill="none" stroke="#E8283C" stroke-width="3.4" stroke-linecap="round">
            <path pathLength="100" d="M -64,6 C -50,2 -42,13 -32,6 C -25,1 -19,9 -12,4"/>
            <path pathLength="100" d="M 64,-4 C 52,1 45,-10 35,-3 C 28,1 22,-6 15,-2"/>
            <path pathLength="100" d="M -22,52 C -19,40 -11,37 -8,26"/>
            <path pathLength="100" d="M 28,52 C 23,41 30,33 21,24"/>
            <path pathLength="100" d="M -58,-24 C -47,-17 -41,-26 -30,-19"/>
          </g>
          <g class="iris">
            <circle r="31" fill="#6B4226" stroke="${INK}" stroke-width="4"/>
            <circle r="15" fill="${INK}"/>
            <circle cx="-10" cy="-12" r="8" fill="#fff"/>
            <rect class="refl" x="5" y="-3" width="9" height="15" rx="2.5" fill="#CFEAFF"/>
          </g>
          <ellipse class="lid" cx="0" cy="-104" rx="78" ry="54" fill="${SKIN}" stroke="${INK}" stroke-width="8"/>
          <path class="rim" d="M -52,34 Q 0,64 52,34" fill="none" stroke="#FF5C6C" stroke-width="6" opacity="0"/>
        </g>
        <ellipse rx="64" ry="52" fill="none" stroke="${INK}" stroke-width="8"/>
      </g>`;
  }

  // the product: a chunky black frame, clear lenses with a blue reflection; `warm` is the
  // amber the lenses take on when the blue light hits them
  function specsSVG(warmClass) {
    const lens = (x) => `<rect x="${x}" y="234" width="164" height="132" rx="36"/>`;
    return `
      <g fill="#9CCBFF" fill-opacity=".26">${lens(130)}${lens(306)}</g>
      <g class="${warmClass}" fill="#FFB547" fill-opacity=".4" opacity="0">${lens(130)}${lens(306)}</g>
      <g fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" opacity=".9">
        <path d="M 150,262 L 178,246 M 150,294 L 202,262"/>
        <path d="M 326,262 L 354,246 M 326,294 L 378,262"/>
      </g>
      <g fill="none" stroke="${INK}" stroke-width="18">${lens(130)}${lens(306)}</g>
      <path d="M 142,238 L 282,238 M 318,238 L 458,238" stroke="${INK}" stroke-width="26" stroke-linecap="round"/>
      <path d="M 292,268 Q 300,250 308,268" fill="none" stroke="${INK}" stroke-width="16"/>`;
  }

  function guySVG() {
    const mitten = 'M -30,-50 C -4,-62 30,-54 38,-24 L 40,40 C 34,66 -28,68 -38,42 L -40,-20 C -42,-38 -38,-46 -30,-50 Z';
    const hand = (id, x, flip) => `
      <g id="${id}" transform="translate(${x},700)"><g transform="${flip ? 'scale(-1,1)' : ''}">
        <path d="${mitten}" fill="${SKIN}" stroke="${INK}" stroke-width="10" stroke-linejoin="round"/>
        <path d="M 36,-8 C 56,-12 60,14 38,20" fill="${SKIN}" stroke="${INK}" stroke-width="10" stroke-linecap="round"/>
        <path d="M -16,-46 L -16,-24 M 2,-50 L 2,-26" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>
      </g></g>`;
    // sparkle stars drawn at their final place (no transform attribute, so GSAP owns transform cleanly)
    const star = (x, y) => {
      const P = [[0, -34], [9, -9], [34, 0], [9, 9], [0, 34], [-9, 9], [-34, 0], [-9, -9]];
      return `<path class="spk" d="M ${P.map(([a, b]) => `${x + a},${y + b}`).join(' L ')} Z" fill="#fff" stroke="${INK}" stroke-width="5" stroke-linejoin="round" opacity="0"/>`;
    };
    const curls = [[146, 150, 40], [196, 104, 44], [262, 78, 46], [338, 78, 46], [404, 104, 44], [454, 150, 40], [110, 210, 36], [490, 210, 36]];
    return `<svg viewBox="0 0 600 900" xmlns="${NS}">
      <defs>
        <linearGradient id="fglow" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stop-color="#5AB6FF" stop-opacity=".65"/>
          <stop offset=".6" stop-color="#5AB6FF" stop-opacity="0"/>
        </linearGradient>
        <radialGradient id="pglow" cx=".5" cy=".5" r=".5">
          <stop offset="0" stop-color="#A6DDFF" stop-opacity=".95"/>
          <stop offset="1" stop-color="#5AB6FF" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <g id="squig" fill="none" stroke="${INK}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" opacity="0">
        <path d="M 96,40 l 16,-24 l 14,24 l 16,-24 l 14,24"/>
        <path d="M 448,40 l 16,-24 l 14,24 l 16,-24 l 14,24"/>
        <path d="M 270,-26 l 16,-24 l 14,24 l 16,-24 l 14,24"/>
      </g>
      <rect x="252" y="460" width="96" height="100" fill="${SKIN}" stroke="${INK}" stroke-width="12"/>
      <path d="M 40,1160 C 52,640 170,540 300,540 C 430,540 548,640 560,1160 Z" fill="#2EC4B6" stroke="${INK}" stroke-width="12" stroke-linejoin="round"/>
      <path d="M 246,548 Q 300,612 354,548" fill="#F2B98C" stroke="${INK}" stroke-width="10"/>
      <circle cx="92" cy="305" r="44" fill="${SKIN}" stroke="${INK}" stroke-width="12"/>
      <circle cx="508" cy="305" r="44" fill="${SKIN}" stroke="${INK}" stroke-width="12"/>
      <path d="M 82,300 Q 96,286 104,304 M 518,300 Q 504,286 496,304" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>
      <ellipse cx="300" cy="290" rx="212" ry="228" fill="${SKIN}" stroke="${INK}" stroke-width="12"/>
      ${curls.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${HAIR}" stroke="${INK}" stroke-width="12"/>`).join('')}
      <path d="M 92,268 C 82,120 190,52 300,54 C 412,52 520,120 508,268 C 486,220 452,196 410,198 C 380,168 330,160 300,172 C 262,160 214,170 188,200 C 146,198 110,224 92,268 Z" fill="${HAIR}"/>
      <path d="M 92,268 C 110,224 146,198 188,200 C 214,170 262,160 300,172 C 330,160 380,168 410,198 C 452,196 486,220 508,268" fill="none" stroke="${INK}" stroke-width="12" stroke-linejoin="round"/>
      <ellipse id="faceGlow" cx="300" cy="290" rx="206" ry="222" fill="url(#fglow)"/>
      <g class="bags" fill="none" stroke="#C9875F" stroke-width="7" stroke-linecap="round">
        <path d="M 162,362 Q 212,386 262,362"/><path d="M 338,362 Q 388,386 438,362"/>
      </g>
      <circle class="blush" cx="150" cy="398" r="30" fill="#FF7FA0" opacity="0"/>
      <circle class="blush" cx="450" cy="398" r="30" fill="#FF7FA0" opacity="0"/>
      ${eyeSVG('eyeL', 212, 300)}
      ${eyeSVG('eyeR', 388, 300)}
      <g id="browL" transform="translate(205,214)"><path d="M -50,8 Q 0,-14 50,2" fill="none" stroke="${HAIR}" stroke-width="17" stroke-linecap="round"/></g>
      <g id="browR" transform="translate(395,214)"><path d="M -50,2 Q 0,-14 50,8" fill="none" stroke="${HAIR}" stroke-width="17" stroke-linecap="round"/></g>
      <path d="M 302,330 Q 284,380 308,384" fill="none" stroke="${INK}" stroke-width="9" stroke-linecap="round"/>
      <path id="mT" d="M 252,440 Q 276,428 300,440 Q 324,452 348,440" fill="none" stroke="${INK}" stroke-width="10" stroke-linecap="round"/>
      <ellipse id="mY" cx="300" cy="446" rx="34" ry="44" fill="#5C1E26" stroke="${INK}" stroke-width="10" opacity="0"/>
      <path id="mS" d="M 238,424 Q 300,492 362,424 Q 300,448 238,424 Z" fill="#8C2F39" stroke="${INK}" stroke-width="10" stroke-linejoin="round" opacity="0"/>
      <g id="tear" opacity="0"><path d="M 0,-14 C 7,-4 11,3 11,8 A 11,11 0 1 1 -11,8 C -11,3 -7,-4 0,-14 Z" fill="#7FD3FF" stroke="${INK}" stroke-width="4"/></g>
      <g id="sRays" opacity="0" fill="none" stroke="#5AB6FF" stroke-width="8" stroke-linecap="round" stroke-dasharray="14 12">
        <path d="M 262,548 C 248,500 204,430 196,368"/><path d="M 282,548 C 276,500 236,430 230,368"/>
        <path d="M 318,548 C 324,500 364,430 370,368"/><path d="M 338,548 C 352,500 396,430 404,368"/>
      </g>
      <g id="specs">${specsSVG('warm')}
        <path d="M 130,260 L 94,272 M 470,260 L 506,272" stroke="${INK}" stroke-width="16" stroke-linecap="round"/>
      </g>
      ${star(126, 226)}${star(476, 230)}${star(300, 196)}
      <g id="phoneG">
        <ellipse cx="300" cy="552" rx="230" ry="92" fill="url(#pglow)"/>
        <rect x="225" y="548" width="150" height="270" rx="28" fill="#2B2B3A" stroke="${INK}" stroke-width="12"/>
        <rect x="245" y="568" width="58" height="58" rx="16" fill="#1B1B26" stroke="${INK}" stroke-width="6"/>
        <circle cx="262" cy="585" r="9" fill="#0E0E16" stroke="#3A3A50" stroke-width="4"/>
        <circle cx="286" cy="609" r="9" fill="#0E0E16" stroke="#3A3A50" stroke-width="4"/>
      </g>
      ${hand('handR', 378, true)}
      ${hand('handL', 222, false)}
    </svg>`;
  }

  function roomSVG() {
    const stars = [[112, 540, 1], [150, 610, 0.7], [118, 690, 0.9], [176, 548, 0.6], [196, 760, 0.8], [312, 700, 0.7], [292, 770, 1], [140, 770, 0.6]];
    const ticks = Array.from({ length: 12 }, (_, i) => `<line x1="0" y1="-78" x2="0" y2="${i % 3 ? -70 : -64}" stroke="${INK}" stroke-width="${i % 3 ? 5 : 8}" stroke-linecap="round" transform="rotate(${i * 30})"/>`).join('');
    return `<svg viewBox="0 0 1080 1920" width="1080" height="1920" xmlns="${NS}">
      <g>
        <rect x="80" y="500" width="270" height="300" rx="26" fill="#121A44" stroke="${INK}" stroke-width="12"/>
        ${stars.map(([x, y, s], i) => `<path class="star" data-i="${i}" transform="translate(${x},${y}) scale(${s})" d="M 0,-12 L 3,-3 L 12,0 L 3,3 L 0,12 L -3,3 L -12,0 L -3,-3 Z" fill="#FFF6D0"/>`).join('')}
        <circle cx="262" cy="580" r="44" fill="#FFE9A8" stroke="${INK}" stroke-width="8"/>
        <circle cx="284" cy="563" r="38" fill="#121A44"/>
        <path d="M 215,506 L 215,794 M 86,650 L 344,650" stroke="${INK}" stroke-width="10"/>
      </g>
      <g transform="translate(860,610)">
        <circle r="92" fill="#FFF6E0" stroke="${INK}" stroke-width="12"/>
        ${ticks}
        <line id="hHand" x1="0" y1="8" x2="0" y2="-44" stroke="${INK}" stroke-width="13" stroke-linecap="round" transform="rotate(90)"/>
        <line id="mHand" x1="0" y1="10" x2="0" y2="-68" stroke="${INK}" stroke-width="8" stroke-linecap="round"/>
        <circle r="10" fill="${INK}"/>
      </g>
      <rect x="150" y="840" width="780" height="560" rx="80" fill="#6C47C9" stroke="${INK}" stroke-width="12"/>
      <rect x="196" y="886" width="688" height="470" rx="56" fill="none" stroke="${INK}" stroke-width="7" opacity=".35"/>
      <rect x="290" y="950" width="500" height="200" rx="80" fill="#F3F1FF" stroke="${INK}" stroke-width="12"/>
    </svg>`;
  }

  function blanketSVG() {
    const wave = 'M -40,1500 C 120,1450 260,1530 400,1480 C 540,1430 680,1520 820,1470 C 940,1432 1040,1490 1120,1462 L 1120,1960 L -40,1960 Z';
    return `<svg viewBox="0 0 1080 1920" width="1080" height="1920" xmlns="${NS}">
      <defs><pattern id="dots" width="64" height="64" patternUnits="userSpaceOnUse">
        <circle cx="16" cy="16" r="9" fill="#fff" fill-opacity=".28"/><circle cx="48" cy="48" r="9" fill="#fff" fill-opacity=".28"/>
      </pattern></defs>
      <path d="${wave}" fill="#3C7BF0"/>
      <path d="${wave}" fill="url(#dots)"/>
      <path d="${wave}" fill="none" stroke="${INK}" stroke-width="12" stroke-linejoin="round"/>
      <path d="M 300,1620 C 340,1680 330,1760 300,1840 M 760,1600 C 730,1680 750,1760 790,1850" fill="none" stroke="${INK}" stroke-width="8" stroke-linecap="round" opacity=".45"/>
    </svg>`;
  }

  function windowSVG() {
    return `<svg viewBox="0 0 1080 1920" width="1080" height="1920" xmlns="${NS}">
      <g id="win2" transform="translate(0,64)">
        <rect x="82" y="572" width="300" height="270" rx="30" fill="${INK}"/>
        <clipPath id="winC"><rect x="70" y="560" width="300" height="270" rx="30"/></clipPath>
        <g clip-path="url(#winC)">
          <rect x="70" y="560" width="300" height="270" fill="#8FD8FF"/>
          <circle cx="300" cy="624" r="34" fill="#FFD23F" stroke="${INK}" stroke-width="8"/>
          <g fill="#fff" stroke="${INK}" stroke-width="7"><ellipse cx="140" cy="628" rx="44" ry="24"/><ellipse cx="172" cy="614" rx="32" ry="24"/></g>
          <path d="M 60,790 C 130,730 220,740 380,780 L 380,840 L 60,840 Z" fill="#5BD16B" stroke="${INK}" stroke-width="8"/>
          <rect x="268" y="700" width="18" height="60" fill="#8A5A34" stroke="${INK}" stroke-width="6"/>
          <circle cx="277" cy="688" r="40" fill="#3FB85A" stroke="${INK}" stroke-width="8"/>
        </g>
        <rect x="70" y="560" width="300" height="270" rx="30" fill="none" stroke="${INK}" stroke-width="12"/>
        <path d="M 220,566 L 220,824 M 76,695 L 364,695" stroke="${INK}" stroke-width="10"/>
      </g>
      <g id="timer" transform="translate(372,630)">
        <circle r="66" fill="#fff" stroke="${INK}" stroke-width="10"/>
        <circle id="tProg" r="47" fill="none" stroke="#2EE6C5" stroke-width="15" pathLength="100" stroke-dasharray="0 100" transform="rotate(-90)" stroke-linecap="round"/>
        <text x="0" y="8" text-anchor="middle" font-family="Outfit" font-weight="900" font-size="46" fill="${INK}">20</text>
        <text x="0" y="40" text-anchor="middle" font-family="Alexandria" font-weight="900" font-size="22" fill="${INK}">ثانية</text>
      </g>
    </svg>`;
  }

  function stickerSVG() {
    const pts = (r1, r2, n, dy = 0) => Array.from({ length: n * 2 }, (_, i) => {
      const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2, r = i % 2 ? r2 : r1;
      return `${(360 + Math.cos(a) * r).toFixed(1)},${(360 + dy + Math.sin(a) * r).toFixed(1)}`;
    }).join(' ');
    return `<polygon points="${pts(338, 286, 18, 18)}" fill="${INK}"/>
      <polygon points="${pts(338, 286, 18)}" fill="#FFD23F" stroke="${INK}" stroke-width="14" stroke-linejoin="round"/>`;
  }

  /* ───────────────────────── DOM prep ───────────────────────── */

  function splitPop(el) {
    const wrap = (node) => { const s = document.createElement('span'); s.className = 'pw'; node.replaceWith(s); s.appendChild(node); };
    const walk = (node) => {
      for (const child of Array.from(node.childNodes)) {
        if (child.nodeType === Node.TEXT_NODE) {
          const frag = document.createDocumentFragment();
          for (const part of child.textContent.split(/(\s+)/)) {
            if (!part) continue;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); continue; }
            const s = document.createElement('span');
            s.className = 'pw';
            s.textContent = part;
            frag.appendChild(s);
          }
          child.replaceWith(frag);
        } else if (child.nodeType === Node.ELEMENT_NODE && child.classList.contains('ltr')) {
          wrap(child);
        } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName !== 'BR') {
          walk(child);
        }
      }
    };
    walk(el);
  }

  const R = {}; // cached nodes the updaters write to
  function prepDOM() {
    Cinema.installEases();
    $('#room').innerHTML = roomSVG();
    $('#guy').innerHTML = guySVG();
    $('#blanket').innerHTML = blanketSVG();
    $('#tipWin').innerHTML = windowSVG();
    $('#sticker svg').innerHTML = stickerSVG();
    $('#product').innerHTML = `<svg viewBox="70 200 460 200" xmlns="${NS}">${specsSVG('pwarm')}
      <path d="M 130,258 C 104,262 92,276 84,300 M 470,258 C 496,262 508,276 516,300" fill="none" stroke="${INK}" stroke-width="16" stroke-linecap="round"/></svg>`;
    $$('[data-pop]').forEach(splitPop);
    const eye = (id) => { const g = $('#' + id); return { lid: $('.lid', g), red: $('.red', g), rim: $('.rim', g), veins: $$('.veins path', g), iris: $('.iris', g), refl: $('.refl', g) }; };
    Object.assign(R, {
      cam: $('#cam'), eyes: [eye('eyeL'), eye('eyeR')], bags: $('.bags'), blush: $$('.blush'),
      browL: $('#browL'), browR: $('#browR'), mT: $('#mT'), mY: $('#mY'), mS: $('#mS'),
      tear: $('#tear'), glow: $('#faceGlow'), squig: $('#squig'), warm: $('#specs .warm'),
      rays: $('#sRays'), rayPaths: $$('#sRays path'), phone: $('#phoneG'), handL: $('#handL'), handR: $('#handR'),
      stars: $$('#room .star'), hHand: $('#hHand'), mHand: $('#mHand'), tProg: $('#tProg'),
      red: $('#redPulse'), burstO: $('#burstO'), burstE: $('#burstE'), sticker: $('#sticker'), van: $('#van'), product: $('#product'),
    });
  }

  /* ───────────────────────── helpers ───────────────────────── */

  let tl;
  const wordsOf = (sel) => $$('.pw', typeof sel === 'string' ? $(sel) : sel);
  function popIn(sel, t, { stagger = 0.06, dur = 0.42 } = {}) {
    tl.fromTo(wordsOf(sel), { scale: 0.2, rotation: -14, autoAlpha: 1 },
      { scale: 1, rotation: 0, duration: dur, ease: 'back.out(2.6)', stagger, immediateRender: false }, t);
    cue(t, 'cap');
  }
  function popOut(sel, t, { stagger = 0.015, dur = 0.2 } = {}) {
    const w = wordsOf(sel);
    tl.to(w, { scale: 0, rotation: 10, duration: dur, ease: 'power2.in', stagger }, t);
    tl.set(w, { autoAlpha: 0, stagger }, t + dur);
  }
  const shakes = [];
  function shake(t, amp = 16) { shakes.push([t, amp]); }
  function shakeAt(t) {
    let x = 0, y = 0;
    for (const [t0, a] of shakes) {
      const d = t - t0;
      if (d < 0 || d > 0.36) continue;
      const env = Math.min(1, d / 0.02) * Math.exp(-d / 0.11);
      x += a * env * Math.cos(2 * Math.PI * 11 * d);
      y -= 0.55 * a * env * Math.cos(2 * Math.PI * 11 * d + 0.6);
    }
    return { x, y };
  }
  function flash(t, peak = 0.2) {
    tl.fromTo('#flash', { opacity: 0 }, { opacity: peak, duration: 0.05, ease: 'none', immediateRender: false }, t)
      .to('#flash', { opacity: 0, duration: 0.45, ease: 'power2.out' }, t + 0.05);
  }
  const pulses = [];   // red "burning" pulses in the hook
  const twitches = []; // eyelid flutters

  // face state — GSAP tweens these numbers (never two tweens on one at once), an updater draws them
  const F0 = { lid: 0.18, veins: 0.3, red: 0.25, bags: 0.6, sad: 0.6, up: 0, lx: 0, ly: 6, tear: 0, mT: 1, mY: 0, mS: 0, blush: 0, glow: 0.55, squig: 0, warm: 0, rub: 0, py: 0, rays: 0, timer: 0 };
  let F = { ...F0 };
  const C0 = { z: 0, push: 0 };
  let C = { ...C0 };

  /* ───────────────────────── scenes ───────────────────────── */

  function buildHook() {
    // the question is up from frame 0 — it is the thumbnail
    gsap.set(wordsOf('#c1'), { scale: 1, autoAlpha: 1 });
    tl.fromTo('#c1', { scale: 1.08 }, { scale: 1, duration: 0.6, ease: 'back.out(2)', immediateRender: false }, 0);
    const em = wordsOf('#c1').slice(-1)[0];
    tl.fromTo(em, { scale: 1 }, { scale: 1.45, duration: 0.14, yoyo: true, repeat: 3, ease: 'power1.inOut', immediateRender: false }, 1.0);
    // the eye gets worse: veins creep in, it reddens, the lid sags, a tear wells and runs
    tl.to(F, { veins: 1, red: 0.75, duration: 1.2, ease: 'power1.in' }, 0.1);
    cue(0.1, 'veins', { until: 1.3 });
    tl.to(F, { lid: 0.3, duration: 1.1, ease: 'power1.inOut' }, 0.3);
    tl.to(F, { tear: 1, duration: 1.5, ease: 'none' }, 0.9);
    cue(0.9 + 0.35 * 1.5, 'tear');
    [1.55, 1.72, 1.89].forEach((t, k) => { twitches.push(t); cue(t, 'twitch', { k }); });
    [0.45, 1.25, 2.05].forEach((t) => { pulses.push(t); cue(t, 'burn'); });
    tl.to(C, { push: 1, duration: 2.45, ease: 'none' }, 0);
    // pull out of the eye into the bedroom
    tl.to(C, { z: 1, push: 0, duration: 0.8, ease: 'power3.inOut' }, T.pull);
    cue(T.pull, 'pull');
    popOut('#c1', T.pull + 0.05);
    tl.to(F, { squig: 1, duration: 0.3 }, 3.0);
    tl.to(F, { bags: 1, duration: 0.4 }, 3.2);
  }

  function buildNight() {
    popIn('#c2', T.night);
    // a yawn
    tl.to(F, { mT: 0, duration: 0.12 }, T.yawn);
    tl.to(F, { mY: 1, duration: 0.2, ease: 'back.out(2)' }, T.yawn);
    tl.to(F, { lid: 0.55, duration: 0.25 }, T.yawn);
    tl.to(F, { mY: 0, duration: 0.15 }, T.yawn + 0.45);
    tl.to(F, { mT: 1, duration: 0.12 }, T.yawn + 0.55);
    tl.to(F, { lid: 0.32, duration: 0.25 }, T.yawn + 0.55);
    cue(T.yawn, 'yawn');
    // symptoms pop around him
    const P = [[235, 820], [845, 820], [220, 1185], [860, 1185]];
    $$('#symptoms .chip').forEach((c, k) => {
      gsap.set(c, { xPercent: -50, yPercent: -50, x: P[k][0], y: P[k][1], scale: 0, rotation: k % 2 ? 8 : -8 });
      const t = T.sym + k * 0.3;
      tl.to(c, { scale: 1, rotation: k % 2 ? 4 : -4, duration: 0.42, ease: 'back.out(3)' }, t);
      cue(t, 'chip', { k });
      tl.to(c, { scale: 0, duration: 0.2, ease: 'power2.in' }, T.cause + k * 0.04);
    });
    // he rubs his eye; another tear
    tl.to(F, { rub: 1, duration: 0.25, ease: 'power2.out' }, T.rub);
    tl.to(F, { lid: 0.72, duration: 0.2 }, T.rub);
    tl.to(F, { rub: 0, duration: 0.25, ease: 'power2.in' }, 6.2);
    tl.to(F, { lid: 0.32, duration: 0.2 }, 6.25);
    cue(T.rub + 0.1, 'rub', { until: 6.2 });
    tl.set(F, { tear: 0 }, 5.2);
    tl.to(F, { tear: 1, duration: 1.4, ease: 'none' }, 5.2);
    cue(5.2 + 0.35 * 1.4, 'tear');
    // the honest cause: hours on the screen, no breaks — the clock races
    popOut('#c2', T.cause - 0.12);
    popIn('#c4', T.cause);
    cue(T.cause, 'clock', { until: 8.3 });
    cue(7.35, 'womp');
    // 💡 the fix is simple
    popOut('#c4', T.idea - 0.12);
    popIn('#c5', T.idea, { stagger: 0.08, dur: 0.5 });
    const bulb = $('#bulb');
    gsap.set(bulb, { x: 540, y: 690, scale: 0 });
    tl.to(bulb, { scale: 1, duration: 0.4, ease: 'back.out(3)' }, T.idea + 0.05);
    cue(T.idea + 0.05, 'idea');
    tl.to(bulb, { scale: 0, duration: 0.2, ease: 'power2.in' }, T.idea + 0.5); // starts after the pop-in ends
  }

  function buildWipe() {
    const Wp = T.wipe;
    gsap.set('#wipeY', { scale: 0 });
    tl.to('#wipeY', { scale: 1, duration: 0.55, ease: 'expo.inOut' }, Wp);
    cue(Wp, 'wipe');
    tl.to('#blanket', { y: 760, duration: 0.45, ease: 'power2.in' }, Wp);
    tl.to('#guy', { x: GUY.sun.x, y: GUY.sun.y, scale: GUY.sun.s, duration: 0.55, ease: 'power3.inOut' }, Wp);
    tl.to(F, { squig: 0, duration: 0.25 }, Wp);
    tl.to(F, { sad: 0.3, duration: 0.45 }, Wp);
    popOut('#c5', T.glasses - 0.25);
  }

  function buildFix() {
    // 1) the glasses drop onto his face
    const G = T.glasses;
    popIn('#c6', G);
    gsap.set('#specs', { y: -1300, rotation: -16, svgOrigin: '300 300', opacity: 0 });
    tl.set('#specs', { opacity: 1 }, G + 0.05);
    tl.to('#specs', { y: 0, rotation: 0, duration: 0.4, ease: 'power2.in' }, G + 0.05);
    tl.to('#specs', { y: -26, duration: 0.12, ease: 'power2.out' }, G + 0.45)
      .to('#specs', { y: 0, duration: 0.14, ease: 'power2.in' }, G + 0.57);
    cue(G + 0.05, 'drop');
    cue(G + 0.45, 'land');
    tl.to('#guy', { scaleY: GUY.sun.s * 0.95, duration: 0.07, yoyo: true, repeat: 1, ease: 'power1.inOut' }, G + 0.45);
    tl.to(F, { up: 0.8, duration: 0.15, ease: 'back.out(3)' }, G + 0.5);
    tl.to(F, { sad: 0, duration: 0.2 }, G + 0.5);
    tl.to(F, { up: 0.2, duration: 0.3 }, G + 1.0);
    // what they do: blue light from the phone reaches the lenses, the lenses warm
    popOut('#c6', T.filter - 0.15);
    popIn('#c7', T.filter);
    tl.to(F, { rays: 1, duration: 0.3 }, T.filter + 0.1);
    tl.to(F, { warm: 1, duration: 0.6, ease: 'power2.inOut' }, T.filter + 0.3);
    cue(T.filter + 0.1, 'filter');
    tl.to(F, { rays: 0, duration: 0.2 }, T.frame - 0.25);
    // and they look good
    popOut('#c7', T.frame - 0.15);
    popIn('#c8', T.frame);
    tl.to(F, { mT: 0, mS: 1, duration: 0.25 }, T.frame + 0.2);
    tl.to(F, { blush: 0.8, duration: 0.3 }, T.frame + 0.2);
    $$('#guy .spk').forEach((s, k) => {
      const [x, y, sc] = [[126, 226, 1], [476, 230, 0.8], [300, 196, 0.6]][k];
      tl.fromTo(s, { opacity: 1, scale: 0, rotation: 0 }, { scale: sc * 1.2, rotation: 90, duration: 0.5, ease: 'back.out(2)', svgOrigin: `${x} ${y}`, immediateRender: false }, T.frame + 0.25 + k * 0.1);
      tl.to(s, { opacity: 0, scale: 0, duration: 0.25, svgOrigin: `${x} ${y}` }, T.frame + 0.95 + k * 0.1);
    });
    cue(T.frame + 0.25, 'sparkle');
    [[0.5, 1], [0.65, 0.2], [0.85, 1], [1.0, 0.2]].forEach(([d, v]) => tl.to(F, { up: v, duration: 0.11 }, T.frame + d));
    cue(T.frame + 0.5, 'brow');
    // 2) the habit: every 20 minutes, look far away for 20 seconds — this is when his eyes clear
    popOut('#c8', T.tip - 0.15);
    popIn('#c9', T.tip);
    gsap.set('#win2, #timer', { scale: 0, transformOrigin: '50% 50%' });
    tl.to('#win2', { scale: 1, duration: 0.45, ease: 'back.out(2.2)' }, T.tip + 0.1);
    tl.to('#timer', { scale: 1, duration: 0.4, ease: 'back.out(3)' }, T.tip + 0.3);
    cue(T.tip + 0.1, 'window');
    tl.to(F, { py: 230, duration: 0.35, ease: 'power2.inOut' }, T.tip + 0.15);
    tl.to(F, { glow: 0.12, duration: 0.5 }, T.tip + 0.2);
    tl.to(F, { lx: -20, ly: -12, duration: 0.35, ease: 'power2.out' }, T.tip + 0.25);
    tl.to(F, { timer: 1, duration: 2.0, ease: 'none' }, T.tip + 0.4);
    cue(T.tip + 0.4, 'timer', { until: T.tip + 2.4 });
    tl.to(F, { veins: 0, red: 0, bags: 0, duration: 1.3, ease: 'power1.inOut' }, T.tip + 0.7);
    tl.to(F, { lid: 0.08, duration: 0.6, ease: 'power2.out' }, T.tip + 0.6);
    tl.to(F, { up: 0.35, duration: 0.3 }, T.tip + 0.6);
    cue(T.tip + 0.8, 'relax');
    popOut('#c9', T.price - 0.2);
    tl.to(['#win2', '#timer'], { scale: 0, duration: 0.2, ease: 'power2.in' }, T.price - 0.2);
  }

  function buildOffer() {
    const P = T.price;
    gsap.set('#offerBg', { scale: 0 });
    gsap.set('#burstO', { opacity: 0 });
    tl.set('#offer', { autoAlpha: 1 }, P - 0.02);
    tl.to('#offerBg', { scale: 1, duration: 0.5, ease: 'expo.inOut' }, P);
    tl.to('#burstO', { opacity: 1, duration: 0.3 }, P + 0.35);
    cue(P, 'wipe');
    popIn('#cP', P + 0.2);
    const st = R.sticker, LAND = P + 0.52;
    gsap.set(st, { x: 540, y: 920, scale: 0, opacity: 0 });
    tl.fromTo(st, { opacity: 1, scale: 2.6, rotation: -25 }, { scale: 1, rotation: 0, duration: 0.22, ease: 'power4.in', immediateRender: false }, LAND - 0.22);
    cue(LAND, 'price');
    shake(LAND, 14);
    flash(LAND, 0.18);
    updaters.push((t) => {
      const d = t - LAND;
      st.style.rotate = d < 0 ? '0deg' : `${(9 * Math.exp(-d / 0.35) * Math.sin(2 * Math.PI * 2.2 * d)).toFixed(3)}deg`;
    });
    gsap.set('#sticker .bas', { scale: 0 });
    tl.to('#sticker .bas', { scale: 1, duration: 0.35, ease: 'back.out(3)' }, LAND + 0.25);
    cue(LAND + 0.25, 'bas');
    // free delivery: the van
    const Fr = T.free;
    popOut('#cP', Fr - 0.1);
    popIn('#cF', Fr + 0.05);
    tl.to(st, { x: 300, y: 650, scale: 0.5, duration: 0.4, ease: 'power3.inOut' }, Fr - 0.05);
    const van = R.van, VS = Fr + 0.15, VE = Fr + 0.7;
    gsap.set(van, { x: 1500, y: 1260 });
    tl.to(van, { x: 560, duration: VE - VS, ease: 'power3.out' }, VS);
    cue(VS, 'van', { until: VE });
    updaters.push((t) => {
      const d = t - VE;
      van.style.rotate = t < VS ? '0deg' : d < 0 ? '-4deg' : `${(-4 * Math.exp(-d / 0.18) * Math.cos(2 * Math.PI * 2.4 * d)).toFixed(3)}deg`;
    });
    // speed lines while it drives, smoke puffs when it stops
    const sp = $('#speed');
    const lines = [[1160, 1110, 260], [1200, 1170, 200], [1150, 1230, 300]].map(([x, y, w]) => {
      const l = document.createElementNS(NS, 'line');
      Object.entries({ x1: x, y1: y, x2: x + w, y2: y, stroke: INK, 'stroke-width': 14, 'stroke-linecap': 'round', opacity: 0 }).forEach(([k, v]) => l.setAttribute(k, v));
      sp.appendChild(l);
      return l;
    });
    lines.forEach((l, k) => {
      tl.set(l, { opacity: 1 }, VS);
      tl.fromTo(l, { x: 0 }, { x: -560, duration: VE - VS, ease: 'power3.out', immediateRender: false }, VS);
      tl.to(l, { opacity: 0, duration: 0.15 }, VE - 0.1 + k * 0.03);
    });
    const puffs = $('#puffs');
    [[780, 1230, 1], [840, 1200, 0.8], [880, 1245, 0.7]].forEach(([x, y, s], k) => {
      const p = document.createElement('i');
      puffs.appendChild(p);
      tl.fromTo(p, { x, y, scale: 0, opacity: 1 }, { x: x + 70, y: y - 30, scale: s * 1.3, opacity: 0, duration: 0.6, ease: 'power2.out', immediateRender: false }, VE - 0.05 + k * 0.06);
    });
    cue(VE + 0.05, 'horn');
    // clear for the end card
    const X = T.end - 0.15;
    tl.to(van, { x: -500, duration: 0.4, ease: 'power3.in' }, X);
    cue(X, 'vanout');
    popOut('#cF', X);
    tl.to(st, { scale: 0, duration: 0.2, ease: 'power2.in' }, X + 0.05);
  }

  function buildEnd() {
    const E = T.end, I = E + 0.25;
    gsap.set('#endBg', { scale: 0 });
    gsap.set('#burstE', { opacity: 0 });
    tl.set('#end', { autoAlpha: 1 }, E - 0.02);
    tl.to('#endBg', { scale: 1, duration: 0.5, ease: 'expo.inOut' }, E);
    tl.to('#burstE', { opacity: 1, duration: 0.3 }, E + 0.35);
    cue(E, 'wipe');
    const pr = R.product;
    gsap.set(pr, { x: 540, y: 650, scale: 0 });
    tl.fromTo(pr, { scale: 0, rotation: -20 }, { scale: 1, rotation: 0, duration: 0.5, ease: 'back.out(2.2)', immediateRender: false }, I - 0.05);
    cue(I, 'impact');
    shake(I, 12);
    flash(I, 0.16);
    updaters.push((t) => { pr.style.rotate = t < I + 0.45 ? '0deg' : `${(3 * Math.sin(2 * Math.PI * 0.8 * (t - I - 0.45))).toFixed(3)}deg`; });
    popIn('#eName', I + 0.35);
    $$('#chips2 .tag2').forEach((c, k) => {
      tl.fromTo(c, { scale: 0, rotation: k ? 8 : -8 }, { scale: 1, rotation: 0, duration: 0.42, ease: 'back.out(3)', immediateRender: false }, I + 0.75 + k * 0.15);
      cue(I + 0.75 + k * 0.15, 'chip', { k: 4 + k });
    });
    gsap.set('#chips2 .tag2', { scale: 0 });
    gsap.set('#cta', { scale: 0 });
    tl.to('#cta', { scale: 1, duration: 0.6, ease: 'uiPop' }, I + 1.2);
    cue(I + 1.2, 'cta');
    tl.fromTo('#finger', { y: 0 }, { y: 16, duration: 0.2, yoyo: true, repeat: 7, ease: 'sine.inOut', immediateRender: false }, I + 1.6);
    [I + 1.75, I + 2.55].forEach((t) => Cinema.sweep(tl, $('#cta'), t, { dur: 0.7, color: 'rgba(255,255,255,.75)' }));
    [I + 2.1, I + 2.85].forEach((t) => {
      tl.to('#cta', { scaleY: 0.9, scaleX: 1.04, duration: 0.09, yoyo: true, repeat: 1, ease: 'power2.out' }, t);
      cue(t, 'pulse');
    });
  }

  /* ───────────────────────── drawing the face state ───────────────────────── */

  function drawFace(t) {
    let lid = F.lid;
    for (const t0 of twitches) { const d = t - t0; if (d >= 0 && d < 0.16) lid += 0.6 * Math.sin(Math.PI * d / 0.16); }
    lid = clamp(lid);
    for (const e of R.eyes) {
      e.lid.setAttribute('cy', (-104 + lid * 104).toFixed(2));
      e.red.setAttribute('opacity', (F.red * 0.45).toFixed(3));
      e.rim.setAttribute('opacity', F.red.toFixed(3));
      for (const v of e.veins) v.setAttribute('stroke-dasharray', `${(F.veins * 100).toFixed(2)} 100`);
      e.iris.setAttribute('transform', `translate(${F.lx.toFixed(2)},${F.ly.toFixed(2)})`);
      e.refl.setAttribute('opacity', clamp(F.glow / 0.55).toFixed(3));
    }
    R.bags.setAttribute('opacity', F.bags.toFixed(3));
    R.blush.forEach((b) => b.setAttribute('opacity', F.blush.toFixed(3)));
    R.browL.setAttribute('transform', `translate(205,${(214 - 16 * F.up).toFixed(2)}) rotate(${(-14 * F.sad).toFixed(2)})`);
    R.browR.setAttribute('transform', `translate(395,${(214 - 16 * F.up).toFixed(2)}) rotate(${(14 * F.sad).toFixed(2)})`);
    R.mT.setAttribute('opacity', F.mT.toFixed(3));
    R.mY.setAttribute('opacity', F.mY.toFixed(3));
    R.mY.setAttribute('ry', (8 + 36 * F.mY).toFixed(2));
    R.mS.setAttribute('opacity', F.mS.toFixed(3));
    // the tear swells at the outer corner of his left eye, then runs down the cheek
    const p = F.tear;
    if (p <= 0 || p >= 1) R.tear.setAttribute('opacity', '0');
    else {
      const s = p < 0.35 ? p / 0.35 : 1, y = p < 0.35 ? 0 : ((p - 0.35) / 0.65) * 170;
      R.tear.setAttribute('opacity', (p > 0.85 ? (1 - p) / 0.15 : 1).toFixed(3));
      R.tear.setAttribute('transform', `translate(158,${(340 + y).toFixed(2)}) scale(${s.toFixed(3)})`);
    }
    R.glow.setAttribute('opacity', F.glow.toFixed(3));
    R.squig.setAttribute('opacity', F.squig.toFixed(3));
    R.squig.setAttribute('transform', `rotate(${(4 * Math.sin(t * 9)).toFixed(2)} 300 20)`);
    R.warm.setAttribute('opacity', F.warm.toFixed(3));
    R.rays.setAttribute('opacity', F.rays.toFixed(3));
    const flow = (-((t * 60) % 26)).toFixed(1);
    R.rayPaths.forEach((r) => r.setAttribute('stroke-dashoffset', flow));
    // hands + phone: the right hand holds the phone; the left one also rubs the eye
    R.phone.setAttribute('transform', `translate(0,${F.py.toFixed(2)})`);
    R.handR.setAttribute('transform', `translate(378,${(700 + F.py).toFixed(2)})`);
    const wig = F.rub * 14 * Math.sin(2 * Math.PI * 5.5 * t);
    R.handL.setAttribute('transform', `translate(${(222 - 10 * F.rub).toFixed(2)},${(700 - 380 * F.rub + F.py * (1 - F.rub)).toFixed(2)}) rotate(${wig.toFixed(2)})`);
    R.tProg.setAttribute('stroke-dasharray', `${(F.timer * 100).toFixed(2)} 100`);
  }

  /* ───────────────────────── build ───────────────────────── */

  function build() {
    gsap.config({ force3D: false });
    tl = gsap.timeline({ paused: true });
    F = { ...F0 };
    C = { ...C0 };

    gsap.set($$('.pw'), { scale: 0.2, autoAlpha: 0 });
    gsap.set('#offer, #end', { autoAlpha: 0 });
    gsap.set('#guy', { x: GUY.bed.x, y: GUY.bed.y, scale: GUY.bed.s, transformOrigin: '300px 290px' });

    buildHook();
    buildNight();
    buildWipe();
    buildFix();
    buildOffer();
    buildEnd();

    updaters.push((t) => drawFace(t));
    // camera: zoomed 5× into his eye at frame 0, log-scale pull-back to the room
    updaters.push(() => {
      const s = Math.exp(Math.log(5) * (1 - C.z)) * (1 + 0.06 * C.push);
      const px = 540 + (FOCUS.x - 540) * C.z, py = 1060 + (FOCUS.y - 1060) * C.z;
      R.cam.style.transform = s === 1 && C.z === 1 ? '' : `translate(${(px - s * FOCUS.x).toFixed(2)}px, ${(py - s * FOCUS.y).toFixed(2)}px) scale(${s.toFixed(5)})`;
    });
    updaters.push((t) => {
      let v = 0;
      for (const t0 of pulses) if (t >= t0) v += 0.75 * Math.exp(-(t - t0) / 0.28);
      R.red.style.opacity = Math.min(0.9, v).toFixed(3);
      // stars twinkle, the clock races through the cause line
      R.stars.forEach((s, i) => s.setAttribute('opacity', (0.55 + 0.45 * Math.sin(t * 3 + i * 1.7)).toFixed(3)));
      const u = clamp((t - T.cause) / 1.6);
      const spin = 360 * 5 * (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2);
      R.mHand.setAttribute('transform', `rotate(${spin.toFixed(2)})`);
      R.hHand.setAttribute('transform', `rotate(${(90 + spin / 12).toFixed(2)})`);
      R.burstO.style.transform = `rotate(${(t * 10).toFixed(2)}deg)`;
      R.burstE.style.transform = `rotate(${(-t * 8).toFixed(2)}deg)`;
    });
    const world = $('#world'), rig = $('#rig');
    updaters.push((t) => {
      const s = shakeAt(t);
      world.style.transform = s.x || s.y ? `translate(${s.x.toFixed(2)}px, ${s.y.toFixed(2)}px)` : '';
      const k = t < T.wipe ? 1 : 0.45;
      const h = Cinema.handheld(t, { amp: 1.5 + 2.5 * k, rotAmp: 0.1 + 0.25 * k, seed: 41 });
      Cinema.applyCamera(rig, { x: h.x, y: h.y, rot: h.rot, scale: 1 });
    });

    tl.set({}, {}, DURATION);
  }

  /* ───────────────────────── player ───────────────────────── */

  let RAW = '', lastT = 0;
  function rebuild() {
    tl.kill();
    updaters.length = 0;
    shakes.length = 0;
    pulses.length = 0;
    twitches.length = 0;
    cues.length = 0;
    $('#stage').innerHTML = RAW;
    prepDOM();
    build();
    cues.sort((a, b) => a.t - b.t);
    lastT = 0;
  }
  function seek(t) {
    t = clamp(t, 0, DURATION);
    if (t < lastT - 1e-6) rebuild();
    lastT = t;
    tl.seek(t, false);
    for (const u of updaters) u(t);
  }

  const ready = (async () => {
    await Promise.all(['900 96px Alexandria', '900 52px Alexandria', '900 46px Outfit', '900 230px Outfit']
      .map((f) => document.fonts.load(f, 'گ 0123456789 …عربي')));
    await document.fonts.ready;
    RAW = $('#stage').innerHTML;
    prepDOM();
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    build();
    cues.sort((a, b) => a.t - b.t);
    seek(0);
    return true;
  })();

  const AD_ID = document.body.dataset.ad || 'v2';
  window.ORIN = { id: AD_ID, prefix: 'glasses-ad', soundtrack: 'soundtrack_v2.py', ready, seek, cues, T, W, H, FPS, BPM, get duration() { return DURATION; } };

  if (RENDER) return;

  const stage = $('#stage');
  const fit = () => {
    const k = Math.min(innerWidth / W, (innerHeight - 64) / H);
    Object.assign(stage.style, { position: 'absolute', left: '50%', top: 'calc(50% - 26px)', transform: `translate(-50%, -50%) scale(${k})` });
  };
  addEventListener('resize', fit);
  fit();

  const playBtn = $('#play'), scrub = $('#scrub'), label = $('#tlabel'), audio = $('#music'), muteBtn = $('#mute');
  let playing = true, cur = 0, last = null, soundOn = false;
  audio.muted = true;
  const syncAudio = () => {
    if (!soundOn) return;
    if (Math.abs(audio.currentTime - cur) > 0.08) audio.currentTime = cur;
    if (playing && audio.paused) audio.play().catch(() => {});
    if (!playing && !audio.paused) audio.pause();
  };
  playBtn.onclick = () => { playing = !playing; playBtn.textContent = playing ? '⏸' : '▶'; syncAudio(); };
  muteBtn.onclick = () => { soundOn = !soundOn; audio.muted = !soundOn; muteBtn.textContent = soundOn ? '🔊' : '🔇'; if (!soundOn) audio.pause(); syncAudio(); };
  scrub.oninput = () => { cur = +scrub.value; seek(cur); if (soundOn) audio.currentTime = cur; };
  addEventListener('keydown', (e) => { if (e.code === 'Space') { e.preventDefault(); playBtn.click(); } });

  ready.then(() => {
    const loop = (now) => {
      if (last == null) last = now;
      if (playing) {
        cur += (now - last) / 1000;
        if (cur >= DURATION) { cur = 0; if (soundOn) audio.currentTime = 0; }
        seek(cur);
        scrub.value = cur;
        syncAudio();
      }
      label.textContent = `${cur.toFixed(2)} / ${DURATION.toFixed(2)}`;
      last = now;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });
})();
