/*
 * شلون يشتغل محرك السيارة — explainer (1080×1920, 33s, Iraqi dialect). Blueprint style.
 *
 * One crank angle drives everything (a pure function of time, deg(t)): piston (real slider-crank
 * geometry), connecting rod, crankshaft, cam-timed valves, the gas in the cylinder, the spark and
 * the burn. 0° = top dead centre; 0–180 intake, 180–360 compression, 360–540 power, 540–720 exhaust.
 *
 *   0–5.8    hook: "بمحرك سيارتك تصير… عشرات الانفجارات بالثانية 💥" — the engine runs and coasts to TDC
 *   5.8–8.0  the parts are labelled: البوجي، بلف السحب، بلف العادم، البستن، ذراع التوصيل، الكرنك
 *   8.0–24.8 the four strokes in slow motion, 4.2 s each: السحب، الضغط، الانفجار، العادم
 *   24.8–29  it speeds up — "وهالدورة تتكرر… مئات وحتى آلاف المرات بالدقيقة 🔁" with a tachometer
 *   29–33    "والكرنك يحوّل هالحركة لدوران… يوصل للعجلات 🛞"
 */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const RENDER = new URLSearchParams(location.search).has('render');
  if (RENDER) document.body.classList.add('render');
  const W = 1080, H = 1920, DURATION = 33.0, FPS = 60, BPM = 120;
  const T = { hook: 0, open: 3.1, parts: 5.8, strokes: 8.0, fast: 24.8, wheels: 29.0 };
  const SD = 4.2, SM = 3.0; // stroke slot, stroke move
  const VO = [
    [0.1, 2.9, 'بمحرك سيارتك تصير… عشرات الانفجارات بالثانية!'],
    [3.2, 5.5, 'خلّي نفتح المحرك… ونشوف.'],
    [8.1, 12.0, 'أول شي السحب: البستن ينزل، وبلف السحب ينفتح… فيدخل هوا وبانزين.'],
    [12.3, 16.2, 'بعدين الضغط: البلوف تتسكر، والبستن يصعد ويضغط الخليط.'],
    [16.5, 20.4, 'وهنا الانفجار: البوجي يقدح شرارة، والخليط ينفجر ويدفع البستن لجوه بقوة.'],
    [20.7, 24.6, 'وآخر شي العادم: بلف العادم ينفتح، والبستن يطلّع الدخان.'],
    [24.9, 28.8, 'وهالدورة تتكرر… مئات وحتى آلاف المرات بالدقيقة.'],
    [29.1, 32.5, 'والكرنك يحوّل هالحركة لدوران… يوصل للعجلات.'],
  ];
  T.vo = VO.map(([a, b, line]) => ({ t0: a, t1: b, line }));

  const cues = [];
  const cue = (t, type, extra = {}) => cues.push({ t: Math.round(t * 1000) / 1000, type, ...extra });
  const updaters = [];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const rnd = (i, s = 1) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };
  const ease = (p) => 0.5 - 0.5 * Math.cos(Math.PI * p);

  // ── the crank angle, a pure function of time ──
  function deg(t) {
    if (t < T.parts) return -2160 * Math.pow(1 - t / T.parts, 2);
    if (t < T.strokes) return 0;
    if (t < T.fast) {
      const k = Math.min(3, Math.floor((t - T.strokes) / SD));
      return 180 * k + 180 * ease(clamp((t - T.strokes - k * SD) / SM));
    }
    if (t < T.wheels) return 720 + 400 * Math.pow(t - T.fast, 2);
    const a29 = 720 + 400 * Math.pow(T.wheels - T.fast, 2);
    return a29 + 1800 * (t - T.wheels);
  }

  // ── geometry (stage px) ──
  const CX = 540, CY = 1420, R = 95, L = 300, HEAD = 880;
  const pinY = (a) => { const r = a * Math.PI / 180; return CY - (R * Math.cos(r) + Math.sqrt(L * L - R * R * Math.sin(r) ** 2)); };
  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };

  function engineSVG() {
    return `
    <defs>
      <linearGradient id="metal" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6E7C8E"/><stop offset=".45" stop-color="#D5DEE8"/><stop offset="1" stop-color="#5D6A7B"/></linearGradient>
      <linearGradient id="metalV" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C9D4E0"/><stop offset="1" stop-color="#5D6A7B"/></linearGradient>
      <radialGradient id="boomG" cx=".5" cy=".4" r=".6"><stop offset="0" stop-color="#FFF4C2"/><stop offset=".4" stop-color="#FFB02E"/><stop offset="1" stop-color="#FF4A1C" stop-opacity="0"/></radialGradient>
      <pattern id="hatch" width="22" height="22" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="22" stroke="#5CE1FF" stroke-opacity=".12" stroke-width="5"/></pattern>
    </defs>
    <circle cx="${CX}" cy="${CY}" r="200" fill="#0C2240" stroke="#5CE1FF" stroke-width="4"/>
    <circle cx="${CX}" cy="${CY}" r="200" fill="url(#hatch)"/>
    <rect x="330" y="740" width="420" height="600" rx="24" fill="#0F2A48" stroke="#5CE1FF" stroke-width="4"/>
    <rect x="330" y="740" width="420" height="600" rx="24" fill="url(#hatch)"/>
    <rect x="390" y="${HEAD}" width="300" height="470" fill="#06162B"/>
    <path d="M 230,690 C 330,700 420,780 470,876" fill="none" stroke="#06162B" stroke-width="56" stroke-linecap="round"/>
    <path d="M 850,690 C 750,700 660,780 610,876" fill="none" stroke="#06162B" stroke-width="56" stroke-linecap="round"/>
    <path d="M 230,662 C 330,672 404,742 452,860 M 230,718 C 320,728 440,812 488,890" fill="none" stroke="#5CE1FF" stroke-width="3" stroke-opacity=".7"/>
    <path d="M 850,662 C 750,672 676,742 628,860 M 850,718 C 760,728 640,812 592,890" fill="none" stroke="#5CE1FF" stroke-width="3" stroke-opacity=".7"/>
    <rect id="gas" x="392" y="${HEAD + 2}" width="296" height="10" fill="#7CC8FF" opacity=".35"/>
    <g id="parts"></g>
    <ellipse id="boom" cx="${CX}" cy="${HEAD + 40}" rx="160" ry="90" fill="url(#boomG)" opacity="0"/>
    <g id="portIn"></g><g id="portEx"></g>
    <g id="crank"><circle cx="${CX}" cy="${CY}" r="122" fill="url(#metal)" stroke="#0A1A30" stroke-width="5"/>
      <path d="M ${CX - 118},${CY + 22} A 120,120 0 0 0 ${CX + 118},${CY + 22} Z" fill="#4A5667" stroke="#0A1A30" stroke-width="4"/>
      <circle cx="${CX}" cy="${CY - R}" r="28" fill="#2A3442" stroke="#C9D4E0" stroke-width="5"/></g>
    <circle cx="${CX}" cy="${CY}" r="30" fill="#1A2533" stroke="#5CE1FF" stroke-width="4"/>
    <line id="rod" x1="${CX}" y1="1000" x2="${CX}" y2="${CY - R}" stroke="url(#metalV)" stroke-width="40" stroke-linecap="round"/>
    <g id="piston"><rect x="392" y="0" width="296" height="150" rx="8" fill="url(#metal)"/>
      <path d="M 392,22 L 688,22 M 392,40 L 688,40 M 392,58 L 688,58" stroke="#3A4656" stroke-width="5"/>
      <circle cx="${CX}" cy="80" r="20" fill="#2A3442" stroke="#C9D4E0" stroke-width="5"/></g>
    <rect x="370" y="${HEAD}" width="22" height="470" fill="#1C3D63" stroke="#5CE1FF" stroke-width="3"/>
    <rect x="688" y="${HEAD}" width="22" height="470" fill="#1C3D63" stroke="#5CE1FF" stroke-width="3"/>
    <rect x="330" y="740" width="420" height="${HEAD - 740}" rx="20" fill="#12355A" stroke="#5CE1FF" stroke-width="4"/>
    <path d="M 230,690 C 330,700 420,780 470,876" fill="none" stroke="#0A2240" stroke-width="40" stroke-linecap="round"/>
    <path d="M 850,690 C 750,700 660,780 610,876" fill="none" stroke="#0A2240" stroke-width="40" stroke-linecap="round"/>
    <g id="vIn"><line x1="470" y1="700" x2="470" y2="880" stroke="#C9D4E0" stroke-width="12"/><rect x="430" y="872" width="80" height="16" rx="6" fill="url(#metal)" stroke="#0A1A30" stroke-width="2"/></g>
    <g id="vEx"><line x1="610" y1="700" x2="610" y2="880" stroke="#C9D4E0" stroke-width="12"/><rect x="570" y="872" width="80" height="16" rx="6" fill="url(#metal)" stroke="#0A1A30" stroke-width="2"/></g>
    <rect x="522" y="660" width="36" height="120" rx="8" fill="#F2F4F7" stroke="#0A1A30" stroke-width="3"/>
    <rect x="512" y="780" width="56" height="60" rx="6" fill="#9AA7B8" stroke="#0A1A30" stroke-width="3"/>
    <rect x="532" y="840" width="16" height="36" fill="#9AA7B8"/>
    <path id="bolt" d="M 540,872 L 520,900 L 548,906 L 526,940 L 566,898 L 538,892 L 556,872 Z" fill="#FFF27A" stroke="#FFB02E" stroke-width="3" opacity="0"/>
    <text x="230" y="640" text-anchor="middle" font-family="Alexandria" font-weight="700" font-size="34" fill="#7FA0C2">هوا + بانزين</text>
    <text x="850" y="640" text-anchor="middle" font-family="Alexandria" font-weight="700" font-size="34" fill="#7FA0C2">دخان</text>`;
  }

  const WX = 540, WY = 1650;
  function wheelSVG() {
    const spokes = Array.from({ length: 5 }, (_, i) => `<path d="M ${WX - 16},${WY - 40} L ${WX - 26},${WY - 128} L ${WX + 26},${WY - 128} L ${WX + 16},${WY - 40} Z" fill="url(#rimG)" transform="rotate(${i * 72} ${WX} ${WY})"/>`).join('');
    return `
    <defs><linearGradient id="rimG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#D5DEE8"/><stop offset="1" stop-color="#6E7C8E"/></linearGradient></defs>
    <path id="belt" d="M ${CX - 52},1290 L ${WX - 62},${WY} M ${CX + 52},1290 L ${WX + 62},${WY}" stroke="#FF8A2A" stroke-width="14" stroke-dasharray="26 16" fill="none"/>
    <g id="road"><line x1="-40" y1="1868" x2="1120" y2="1868" stroke="#5CE1FF" stroke-width="6" stroke-dasharray="70 50"/></g>
    <g id="speedL">${[1500, 1580, 1700, 1780].map((y, i) => `<line x1="${60 + i * 30}" y1="${y}" x2="${250 + i * 10}" y2="${y}" stroke="#5CE1FF" stroke-opacity=".5" stroke-width="6" stroke-linecap="round"/>`).join('')}</g>
    <circle cx="${WX}" cy="${WY}" r="196" fill="#0B0F16" stroke="#5CE1FF" stroke-width="4"/>
    <circle cx="${WX}" cy="${WY}" r="186" fill="none" stroke="#1E2632" stroke-width="10" stroke-dasharray="18 14"/>
    <circle cx="${WX}" cy="${WY}" r="140" fill="#14263E" stroke="#C9D4E0" stroke-width="8"/>
    <g id="rim">${spokes}<circle cx="${WX}" cy="${WY - 110}" r="9" fill="#FF8A2A"/></g>
    <circle cx="${WX}" cy="${WY}" r="62" fill="url(#rimG)" stroke="#0A1A30" stroke-width="5"/>
    <circle cx="${WX}" cy="${WY}" r="22" fill="#1A2533" stroke="#FF8A2A" stroke-width="5"/>`;
  }

  function gaugeSVG() {
    const ticks = Array.from({ length: 9 }, (_, i) => { const a = (-120 + i * 30) * Math.PI / 180; return `<line x1="${120 + Math.sin(a) * 92}" y1="${120 - Math.cos(a) * 92}" x2="${120 + Math.sin(a) * 76}" y2="${120 - Math.cos(a) * 76}" stroke="${i > 6 ? '#FF4A1C' : '#5CE1FF'}" stroke-width="6"/><text x="${120 + Math.sin(a) * 58}" y="${132 - Math.cos(a) * 58}" text-anchor="middle" font-family="Outfit" font-weight="700" font-size="22" fill="#CFE3F7">${i}</text>`; }).join('');
    return `<circle cx="120" cy="120" r="112" fill="#0A1C34" stroke="#5CE1FF" stroke-width="5"/>${ticks}
      <line id="needle" x1="120" y1="120" x2="120" y2="40" stroke="#FF8A2A" stroke-width="7" stroke-linecap="round"/>
      <circle cx="120" cy="120" r="12" fill="#FF8A2A"/><text x="120" y="200" text-anchor="middle" font-family="Outfit" font-weight="700" font-size="20" fill="#7FA0C2">RPM ×1000</text>`;
  }

  function splitText(el) {
    const walk = (node) => {
      for (const child of Array.from(node.childNodes)) {
        if (child.nodeType === Node.TEXT_NODE) {
          const frag = document.createDocumentFragment();
          for (const part of child.textContent.split(/(\s+)/)) {
            if (!part) continue;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); continue; }
            const inner = document.createElement('span'); inner.className = 'wi'; inner.textContent = part;
            const mask = document.createElement('span'); mask.className = 'w'; mask.appendChild(inner); frag.appendChild(mask);
          }
          child.replaceWith(frag);
        } else if (child.nodeType === Node.ELEMENT_NODE && child.classList.contains('num')) {
          const inner = document.createElement('span'); inner.className = 'wi';
          const mask = document.createElement('span'); mask.className = 'w';
          child.replaceWith(mask); mask.appendChild(inner); inner.appendChild(child);
        } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName !== 'BR') walk(child);
      }
    };
    walk(el);
  }

  const R2 = {};
  function prepDOM() {
    Cinema.installEases();
    $('#engine').innerHTML = engineSVG();
    $('#gauge').innerHTML = gaugeSVG();
    $('#wheel').innerHTML = wheelSVG();
    $$('[data-split]').forEach(splitText);
    const parts = $('#parts');
    R2.parts = Array.from({ length: 42 }, (_, i) => el('circle', { r: 6 + rnd(i, 3) * 4, cx: 0, cy: 0, opacity: 0 }, parts));
    R2.pin = Array.from({ length: 12 }, (_, i) => el('circle', { r: 7, opacity: 0, fill: i % 3 ? '#9FD8FF' : '#FFD45A' }, $('#portIn')));
    R2.pex = Array.from({ length: 12 }, () => el('circle', { r: 9, opacity: 0, fill: '#9AA3AF' }, $('#portEx')));
    Object.assign(R2, { gas: $('#gas'), boom: $('#boom'), bolt: $('#bolt'), piston: $('#piston'), rod: $('#rod'), crank: $('#crank'), vIn: $('#vIn'), vEx: $('#vEx'), needle: $('#needle'), rim: $('#rim'), belt: $('#belt'), road: $('#road').firstElementChild });
    Cinema.grain($('#grain'), 13, 0.1);
  }

  // point on a cubic bezier (for the gas flowing through the ports)
  const bez = (p, t) => { const u = 1 - t; return { x: u * u * u * p[0] + 3 * u * u * t * p[2] + 3 * u * t * t * p[4] + t * t * t * p[6], y: u * u * u * p[1] + 3 * u * u * t * p[3] + 3 * u * t * t * p[5] + t * t * t * p[7] }; };
  const IN_P = [230, 690, 330, 700, 420, 780, 470, 876], EX_P = [610, 876, 660, 780, 750, 700, 850, 690];

  function drawEngine(t) {
    const a = deg(t), ph = ((a % 720) + 720) % 720;
    const py = pinY(a), crown = py - 80;
    const r = a * Math.PI / 180;
    R2.piston.setAttribute('transform', `translate(0,${crown.toFixed(2)})`);
    R2.rod.setAttribute('y1', py.toFixed(2));
    R2.rod.setAttribute('x2', (CX + R * Math.sin(r)).toFixed(2));
    R2.rod.setAttribute('y2', (CY - R * Math.cos(r)).toFixed(2));
    R2.crank.setAttribute('transform', `rotate(${(a % 360).toFixed(2)} ${CX} ${CY})`);
    const lin = ph < 180 ? Math.sin(Math.PI * ph / 180) : 0, lex = ph >= 540 ? Math.sin(Math.PI * (ph - 540) / 180) : 0;
    R2.vIn.setAttribute('transform', `translate(0,${(lin * 42).toFixed(2)})`);
    R2.vEx.setAttribute('transform', `translate(0,${(lex * 42).toFixed(2)})`);
    const gh = crown - HEAD - 2;
    R2.gas.setAttribute('height', Math.max(0, gh).toFixed(2));
    let col = '#7CC8FF', op = 0.3, pc = '#BFE6FF';
    if (ph < 180) { col = '#7CC8FF'; op = 0.18 + 0.15 * ph / 180; }
    else if (ph < 360) { const k = (ph - 180) / 180; col = k < 0.6 ? '#9CC9FF' : '#FFC27A'; op = 0.35 + 0.3 * k; pc = '#FFE3A8'; }
    else if (ph < 540) { const k = (ph - 360) / 180; col = k < 0.35 ? '#FFB02E' : '#FF5A2A'; op = 0.9 - 0.5 * k; pc = '#FFD08A'; }
    else { col = '#8E98A6'; op = 0.45 * (1 - (ph - 540) / 180) + 0.1; pc = '#B7BFC9'; }
    R2.gas.setAttribute('fill', col);
    R2.gas.setAttribute('opacity', op.toFixed(3));
    const burn = ph >= 360 && ph < 540 ? Math.exp(-(ph - 360) / 45) : 0;
    R2.boom.setAttribute('opacity', burn.toFixed(3));
    R2.boom.setAttribute('ry', (60 + gh * 0.45).toFixed(1));
    R2.boom.setAttribute('cy', (HEAD + 20 + gh * 0.4).toFixed(1));
    const spark = ph >= 350 && ph < 372 ? 1 : 0;
    R2.bolt.setAttribute('opacity', String(spark));
    // gas particles fill the space above the piston (they squeeze together on compression)
    R2.parts.forEach((c, i) => {
      const show = !(ph >= 360 && ph < 400) && !(ph < 40 && i > ph);
      const jx = Math.sin(t * 3 + i) * 6, jy = Math.cos(t * 2.6 + i * 1.3) * 5;
      c.setAttribute('cx', (402 + rnd(i, 1) * 276 + jx).toFixed(1));
      c.setAttribute('cy', (HEAD + 8 + rnd(i, 2) * Math.max(4, gh - 16) + jy).toFixed(1));
      c.setAttribute('fill', i % 4 === 0 && ph < 360 ? '#FFD45A' : pc);
      c.setAttribute('opacity', show ? (ph >= 540 ? 0.55 : 0.75).toFixed(2) : '0');
    });
    R2.pin.forEach((c, i) => {
      const on = lin > 0.15;
      const p = bez(IN_P, ((t * 0.9 + i / 12) % 1));
      c.setAttribute('cx', p.x.toFixed(1)); c.setAttribute('cy', p.y.toFixed(1));
      c.setAttribute('opacity', on ? (0.85 * lin).toFixed(2) : '0');
    });
    R2.pex.forEach((c, i) => {
      const on = lex > 0.15;
      const p = bez(EX_P, ((t * 0.9 + i / 12) % 1));
      c.setAttribute('cx', p.x.toFixed(1)); c.setAttribute('cy', p.y.toFixed(1));
      c.setAttribute('opacity', on ? (0.8 * lex).toFixed(2) : '0');
    });
    const sp = t < T.fast ? 0 : t < T.wheels ? 800 * (t - T.fast) : 1800; // deg/s
    const rpmShown = 0.8 + 2.6 * clamp(sp / 3360);
    R2.rim.setAttribute('transform', `rotate(${(a * 0.4 % 360).toFixed(2)} ${WX} ${WY})`);
    R2.belt.setAttribute('stroke-dashoffset', (-a * Math.PI / 180 * 52 % 42).toFixed(2));
    R2.road.setAttribute('stroke-dashoffset', (a * 0.4 * Math.PI / 180 * 196 % 120).toFixed(2));
    R2.needle.setAttribute('transform', `rotate(${(-120 + rpmShown * 30).toFixed(2)} 120 120)`);
  }

  let tl;
  const wordsOf = (sel) => $$('.wi', $(sel));
  function textIn(sel, t, stagger = 0.05) {
    tl.fromTo(wordsOf(sel), { yPercent: 118, autoAlpha: 1 }, { yPercent: 0, duration: 0.5, ease: 'orinIn', stagger, immediateRender: false }, t);
    cue(t, 'cap');
  }
  function textOut(sel, t) {
    const w = wordsOf(sel);
    tl.to(w, { yPercent: -125, duration: 0.24, ease: 'power3.in', stagger: 0.012 }, t);
    tl.set(w, { autoAlpha: 0, stagger: 0.012 }, t + 0.24);
  }
  const shakes = [];
  function shakeAt(t) {
    let x = 0, y = 0;
    for (const [t0, a] of shakes) { const d = t - t0; if (d < 0 || d > 0.4) continue; const env = Math.exp(-d / 0.1); x += a * env * Math.cos(2 * Math.PI * 12 * d); y -= 0.6 * a * env * Math.sin(2 * Math.PI * 12 * d); }
    return { x, y };
  }

  function build() {
    gsap.config({ force3D: false });
    tl = gsap.timeline({ paused: true });
    gsap.set($$('.wi'), { yPercent: 118, autoAlpha: 0 });
    gsap.set(wordsOf('#c0'), { yPercent: 0, autoAlpha: 1 });
    gsap.set('#engine', { scale: 1, transformOrigin: '540px 1100px' });

    // hook
    tl.fromTo('#c0', { scale: 1.06 }, { scale: 1, duration: 0.6, ease: 'power2.out', immediateRender: false }, 0);
    textOut('#c0', 2.95);
    textIn('#c1', T.open);
    textOut('#c1', T.parts - 0.3);
    // firing times = every crossing of 360 (mod 720), found by sampling deg(t)
    let prev = deg(0);
    for (let t = 1 / 240; t <= DURATION; t += 1 / 240) {
      const d = deg(t);
      const k0 = Math.floor((prev - 360) / 720), k1 = Math.floor((d - 360) / 720);
      if (k1 > k0) { cue(t, 'fire', { slow: t > T.strokes && t < T.fast }); if (t < T.parts) shakes.push([t, 8]); }
      prev = d;
    }

    // labels with leader lines
    const pts = { lPlug: [540, 760, 'r', 690], lIn: [470, 880, 'l', 820], lEx: [610, 890, 'r', 930], lPis: [430, 1010, 'l', 1010], lRod: [560, 1200, 'r', 1190], lCr: [480, 1430, 'l', 1440] };
    const lead = $('#leaders');
    Object.entries(pts).forEach(([id, [px, py, side, ly]], k) => {
      const lb = $('#' + id);
      const w = lb.offsetWidth, h = lb.offsetHeight;
      const lx = side === 'l' ? 40 : 1040 - w;
      Object.assign(lb.style, { left: `${lx}px`, top: `${ly - h / 2}px` });
      const ex = side === 'l' ? lx + w : lx;
      const ln = el('line', { x1: ex, y1: ly, x2: px, y2: py, stroke: '#5CE1FF', 'stroke-width': 4, 'stroke-dasharray': '10 8', opacity: 0 }, lead);
      const dot = el('circle', { cx: px, cy: py, r: 10, fill: '#5CE1FF', opacity: 0 }, lead);
      const t = T.parts + 0.15 + k * 0.28;
      tl.fromTo(lb, { opacity: 1, scale: 0.4 }, { scale: 1, duration: 0.35, ease: 'back.out(2.5)', immediateRender: false }, t);
      tl.set([ln, dot], { opacity: 1 }, t);
      cue(t, 'label', { k });
      tl.to([lb, ln, dot], { opacity: 0, duration: 0.25 }, T.strokes - 0.3);
    });

    // the four strokes
    tl.to('#engine', { scale: 1.1, duration: 0.6, ease: 'power2.inOut' }, T.strokes - 0.35);
    gsap.set('#strip', { opacity: 0 });
    tl.to('#strip', { opacity: 1, duration: 0.3 }, T.strokes - 0.2);
    const spans = $$('#strip span');
    ['s1', 's2', 's3', 's4'].forEach((id, k) => {
      const t0 = T.strokes + k * SD;
      textIn('#' + id, t0 - 0.05, 0.035);
      textOut('#' + id, t0 + SD - 0.3);
      tl.set(spans, { className: '' }, t0 - 0.05);
      tl.set(spans[k], { className: 'on' }, t0 - 0.05);
      cue(t0, ['intake', 'compress', 'power', 'exhaust'][k], { until: t0 + SM });
    });
    const P = T.strokes + 2 * SD;
    tl.fromTo('#flash', { opacity: 0 }, { opacity: 0.45, duration: 0.05, immediateRender: false }, P + 0.02).to('#flash', { opacity: 0, duration: 0.5 }, P + 0.07);
    shakes.push([P + 0.02, 16]);
    tl.to('#strip', { opacity: 0, duration: 0.3 }, T.fast - 0.2);

    // speed up
    tl.to('#engine', { scale: 1, duration: 0.6, ease: 'power2.inOut' }, T.fast - 0.2);
    textIn('#c5', T.fast + 0.05);
    gsap.set('#gauge', { opacity: 0, scale: 0.5, transformOrigin: '120px 120px' });
    tl.to('#gauge', { opacity: 1, scale: 1, duration: 0.45, ease: 'back.out(2)' }, T.fast + 0.3);
    cue(T.fast, 'rev', { until: T.wheels });
    textOut('#c5', T.wheels - 0.25);
    textIn('#c6', T.wheels);
    tl.to('#gauge', { opacity: 0, duration: 0.3 }, T.wheels);
    tl.to('#engine', { scale: 0.7, y: -70, duration: 0.7, ease: 'power3.inOut' }, T.wheels - 0.1);
    gsap.set('#wheel', { opacity: 0, y: 260 });
    tl.to('#wheel', { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, T.wheels + 0.15);
    cue(T.wheels, 'end');

    updaters.push((t) => drawEngine(t));
    const world = $('#world'), rig = $('#rig');
    updaters.push((t) => {
      const s = shakeAt(t);
      world.style.transform = s.x || s.y ? `translate(${s.x.toFixed(2)}px, ${s.y.toFixed(2)}px)` : '';
      const h = Cinema.handheld(t, { amp: 2, rotAmp: 0.1, seed: 5 });
      Cinema.applyCamera(rig, { x: h.x, y: h.y, rot: h.rot, scale: 1 });
    });
    tl.set({}, {}, DURATION);
  }

  let RAW = '', lastT = 0;
  function rebuild() { tl.kill(); updaters.length = 0; shakes.length = 0; cues.length = 0; $('#stage').innerHTML = RAW; prepDOM(); build(); cues.sort((a, b) => a.t - b.t); lastT = 0; }
  function seek(t) { t = clamp(t, 0, DURATION); if (t < lastT - 1e-6) rebuild(); lastT = t; tl.seek(t, false); for (const u of updaters) u(t); }
  const ready = (async () => {
    await Promise.all(['800 92px Alexandria', '600 52px Alexandria', '700 40px Alexandria', '800 74px Outfit'].map((f) => document.fonts.load(f, 'گ 0123456789 …عربي')));
    await document.fonts.ready;
    RAW = $('#stage').innerHTML; prepDOM();
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    build(); cues.sort((a, b) => a.t - b.t); seek(0);
    return true;
  })();
  window.ORIN = { id: '', prefix: 'engine-video', soundtrack: 'soundtrack_engine.py', ready, seek, cues, T, W, H, FPS, BPM, get duration() { return DURATION; } };

  if (RENDER) return;
  const stage = $('#stage');
  const fit = () => { const k = Math.min(innerWidth / W, (innerHeight - 64) / H); Object.assign(stage.style, { position: 'absolute', left: '50%', top: 'calc(50% - 26px)', transform: `translate(-50%, -50%) scale(${k})` }); };
  addEventListener('resize', fit); fit();
  let playing = true, cur = 0, last = null;
  $('#play').onclick = () => { playing = !playing; };
  $('#scrub').oninput = (e) => { cur = +e.target.value; seek(cur); };
  ready.then(() => { const loop = (now) => { if (last == null) last = now; if (playing) { cur = (cur + (now - last) / 1000) % DURATION; seek(cur); } $('#tlabel').textContent = cur.toFixed(2); last = now; requestAnimationFrame(loop); }; requestAnimationFrame(loop); });
})();
