/* How the heart works — a front-view schematic section (viewer's left = the heart's right).
   One clock: the beat phase φ(t). Chambers squeeze, valves open and close, and blood particles flow from it. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const RENDER = new URLSearchParams(location.search).has('render');
  if (RENDER) document.body.classList.add('render');
  const W = 1080, H = 1920, FPS = 60, BPM = 72;
  const T = { hook: 0, open: 3.0, ch: 5.8, j1: 9.8, j2: 13.6, j3: 17.4, j4: 21.2, j5: 25.0, valves: 29.0, end: 33.5 };
  const DURATION = 38.5, JD = 3.8;
  const BLUE = '#1C7ED6', RED = '#E03131', INK = '#2A1E1E';
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const ease = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
  const span = (t, a, b) => clamp((t - a) / (b - a));
  const updaters = [], cues = [];
  const cue = (t, type, extra = {}) => cues.push({ t: Math.round(t * 1000) / 1000, type, ...extra });

  // beat clock: 72 bpm, slowed to 36 bpm while we explain, back to 72 at the end
  const FAST = 1.2, SLOW = 0.6;
  const phase = (t) => t < T.open ? FAST * t : t < T.end ? FAST * T.open + SLOW * (t - T.open) : FAST * T.open + SLOW * (T.end - T.open) + FAST * (t - T.end);
  const beat = (t) => {
    const u = ((phase(t) % 1) + 1) % 1;
    const a = u < 0.15 ? Math.sin(Math.PI * u / 0.15) : 0;
    const v = u >= 0.18 && u < 0.52 ? Math.sin(Math.PI * (u - 0.18) / 0.34) : 0;
    const av = 1 - ease(span(u, 0.15, 0.2)) + ease(span(u, 0.52, 0.58));   // tricuspid / mitral open
    const sl = ease(span(u, 0.2, 0.25)) * (1 - ease(span(u, 0.48, 0.53))); // pulmonary / aortic open
    return { u, a, v, av: clamp(av), sl };
  };

  // geometry
  const CH = {
    RA: { d: 'M 300,900 C 300,840 380,830 450,860 C 480,900 470,1060 440,1090 L 320,1090 C 290,1040 290,960 300,900 Z', c: [380, 970], blood: BLUE },
    RV: { d: 'M 320,1120 L 470,1120 C 520,1150 540,1300 556,1440 C 500,1400 380,1300 330,1200 Z', c: [440, 1250], blood: BLUE },
    LA: { d: 'M 590,860 C 650,830 760,830 820,880 C 850,950 830,1060 800,1090 L 610,1090 C 585,1050 580,940 590,860 Z', c: [710, 965], blood: RED },
    LV: { d: 'M 612,1120 L 800,1120 C 830,1200 760,1360 606,1450 C 596,1340 598,1220 612,1120 Z', c: [690, 1260], blood: RED },
  };
  const OUTER = 'M 262,900 C 250,812 332,782 420,800 C 482,762 640,762 722,800 C 832,790 902,862 882,962 C 902,1122 822,1332 642,1502 Q 572,1562 522,1502 C 332,1332 242,1122 262,900 Z';
  const FLOW = {
    P1a: { pts: [[330, 600], [330, 820], [365, 930]], col: BLUE },
    P1b: { pts: [[240, 1600], [280, 1300], [335, 1080], [375, 1010]], col: BLUE },
    P2: { pts: [[385, 960], [392, 1080], [405, 1180], [440, 1300]], col: BLUE },
    P3: { pts: [[445, 1320], [492, 1200], [505, 1100], [505, 860], [505, 760], [300, 742], [130, 770]], col: BLUE },
    P3b: { pts: [[505, 1000], [505, 860], [505, 760], [700, 742], [950, 770]], col: BLUE },
    P4: { pts: [[950, 810], [880, 900], [770, 950], [710, 975]], col: RED },
    P5: { pts: [[705, 960], [705, 1080], [690, 1200], [660, 1330]], col: RED },
    P6: { pts: [[650, 1340], [612, 1200], [578, 1100], [578, 820], [592, 660], [680, 606], [800, 640], [862, 800]], col: RED },
  };
  const ACTIVE = (t) => {
    if (t < T.j1) return t < T.open ? Object.keys(FLOW) : [];
    if (t < T.j2) return ['P1a', 'P1b'];
    if (t < T.j3) return ['P2', 'P3', 'P3b'];
    if (t < T.j4) return ['P3', 'P3b', 'P4'];
    if (t < T.j5) return ['P4', 'P5'];
    if (t < T.valves) return ['P5', 'P6'];
    return Object.keys(FLOW);
  };
  const lengthOf = (pts) => { const L = [0]; for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); return L; };
  const pointAt = (pts, L, s) => { let i = 1; while (i < pts.length - 1 && L[i] < s) i++; const k = clamp((s - L[i - 1]) / (L[i] - L[i - 1] || 1)); return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k]; };
  const poly = (pts) => 'M ' + pts.map((p) => p.join(',')).join(' L ');

  const R = {};
  function lung(x, flip) {
    const s = flip ? -1 : 1;
    return `<path d="M ${x},640 C ${x + s * 70},630 ${x + s * 110},720 ${x + s * 110},820 C ${x + s * 110},900 ${x + s * 60},930 ${x},920 C ${x - s * 60},910 ${x - s * 70},820 ${x - s * 60},740 C ${x - s * 50},680 ${x - s * 30},645 ${x},640 Z" fill="#FFC9C9" stroke="${INK}" stroke-width="6"/>
      ${[0, 1, 2].map((i) => `<path d="M ${x},${700 + i * 50} q ${s * 40},20 ${s * 70},10" fill="none" stroke="#E8A2A2" stroke-width="5" stroke-linecap="round"/>`).join('')}`;
  }
  function prepDOM() {
    Cinema.installEases();
    const tube = (pts, col, w) => `<path d="${poly(pts)}" fill="none" stroke="${INK}" stroke-width="${w + 12}" stroke-linecap="round" stroke-linejoin="round"/><path d="${poly(pts)}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
    const chamber = (k) => `<g class="ch" id="ch${k}" data-c="${CH[k].c}"><path class="cav" d="${CH[k].d}" fill="${CH[k].blood}" stroke="${INK}" stroke-width="6"/><path class="hl" d="${CH[k].d}" fill="none" stroke="#F08C00" stroke-width="12" opacity="0"/></g>`;
    const flap = (id, x0, x1, y, dir) => `<g id="${id}"><line class="fl" data-x="${x0}" data-y="${y}" data-dir="${dir}" x1="${x0}" y1="${y}" x2="${(x0 + x1) / 2 - 4}" y2="${y}" stroke="#FFF4E6" stroke-width="12" stroke-linecap="round"/><line class="fl" data-x="${x1}" data-y="${y}" data-dir="${-dir}" x1="${x1}" y1="${y}" x2="${(x0 + x1) / 2 + 4}" y2="${y}" stroke="#FFF4E6" stroke-width="12" stroke-linecap="round"/></g>`;
    $('#heart').innerHTML = `
      <g id="lungs"><g id="lungL">${lung(130, false)}</g><g id="lungR">${lung(950, true)}</g></g>
      <text x="130" y="975" text-anchor="middle" font-family="Alexandria" font-weight="700" font-size="34" fill="#8C7B74">رئة</text><text x="950" y="975" text-anchor="middle" font-family="Alexandria" font-weight="700" font-size="34" fill="#8C7B74">رئة</text>
      ${tube([[505, 760], [300, 742], [150, 770]], '#74C0FC', 34)}${tube([[505, 760], [700, 742], [930, 770]], '#74C0FC', 34)}
      ${tube([[240, 1640], [280, 1300], [340, 1080]], '#74C0FC', 52)}${tube([[330, 560], [330, 900]], '#74C0FC', 52)}${tube([[950, 810], [870, 905], [790, 945]], '#FFA8A8', 34)}
      <g id="wall"><path d="${OUTER}" fill="#F7B2B2" stroke="${INK}" stroke-width="8"/>
        <path d="M 520,1110 L 600,1110 M 540,840 L 560,1500" stroke="#E89090" stroke-width="10" stroke-linecap="round" opacity=".6"/></g>
      ${['RA', 'RV', 'LA', 'LV'].map(chamber).join('')}
      ${flap('vTri', 328, 462, 1105, 1)}${flap('vMit', 618, 796, 1105, 1)}
      ${tube([[480, 1170], [505, 1100], [505, 760]], '#74C0FC', 46)}
      ${flap('vPul', 482, 528, 1060, -1)}
      ${tube([[612, 1170], [578, 1100], [578, 820], [592, 660], [680, 606], [800, 640], [862, 800]], '#FFA8A8', 50)}
      ${flap('vAor', 552, 604, 1040, -1)}
      <g id="parts">${Object.keys(FLOW).map((k) => `<g data-flow="${k}">${Array.from({ length: 9 }, () => `<circle r="11" fill="${FLOW[k].col}" stroke="#fff" stroke-width="3" opacity="0"/>`).join('')}</g>`).join('')}</g>
      <g font-family="Alexandria" font-weight="700" font-size="34" fill="#8C7B74"><text x="330" y="540" text-anchor="middle">⬇ من الجسم</text><text x="240" y="1700" text-anchor="middle">⬆ من الجسم</text><text x="760" y="575" text-anchor="middle">لكل الجسم ⬅</text></g>`;
    FLOW_PRE.length = 0;
    for (const k of Object.keys(FLOW)) FLOW_PRE.push({ k, pts: FLOW[k].pts, L: lengthOf(FLOW[k].pts), els: $$(`[data-flow="${k}"] circle`) });
    Object.assign(R, { ch: Object.fromEntries(Object.keys(CH).map((k) => [k, $('#ch' + k)])), wall: $('#wall'), flaps: { vTri: $$('#vTri .fl'), vMit: $$('#vMit .fl'), vPul: $$('#vPul .fl'), vAor: $$('#vAor .fl') },
      lungs: [$('#lungL'), $('#lungR')], part: $('#part'), counter: $('#counter'), slow: $('#slow'), bpm: $('#bpm') });
    $$('[data-split]').forEach(splitText);
    Cinema.grain($('#grain'), 41, 0.06);
  }
  const FLOW_PRE = [];

  const PARTS = [['RA', 'الأذين الأيمن', BLUE], ['RV', 'البطين الأيمن', BLUE], ['LA', 'الأذين الأيسر', RED], ['LV', 'البطين الأيسر', RED]];
  const hlOf = (t) => {
    if (t >= T.ch + 0.1 && t < T.j1 - 0.1) { const k = Math.max(0, Math.floor((t - T.ch - 0.1) / 0.95)); return k < 4 ? [PARTS[k][0]] : []; }
    if (t >= T.j1 && t < T.j2) return ['RA'];
    if (t >= T.j2 && t < T.j3) return ['RV'];
    if (t >= T.j4 && t < T.j5) return t < T.j4 + 1.9 ? ['LA'] : ['LV'];
    if (t >= T.j5 && t < T.valves) return ['LV'];
    return [];
  };

  function draw(t) {
    const b = beat(t);
    const sq = { RA: b.a, LA: b.a, RV: b.v, LV: b.v };
    const hl = hlOf(t);
    for (const k of Object.keys(CH)) {
      const [cx, cy] = CH[k].c, s = 1 - (k[1] === 'A' ? 0.1 : 0.12) * sq[k];
      R.ch[k].setAttribute('transform', `translate(${cx * (1 - s)} ${cy * (1 - s)}) scale(${s.toFixed(4)})`);
      R.ch[k].querySelector('.hl').setAttribute('opacity', hl.includes(k) ? (0.75 + 0.25 * Math.sin(t * 8)).toFixed(2) : 0);
    }
    const ws = 1 - 0.035 * b.v;
    R.wall.setAttribute('transform', `translate(${570 * (1 - ws)} ${1160 * (1 - ws)}) scale(${ws.toFixed(4)})`);
    const flapRot = (els, open, deg) => els.forEach((el) => { const x = +el.dataset.x, y = +el.dataset.y, d = +el.dataset.dir; el.setAttribute('transform', `rotate(${(d * deg * open).toFixed(2)} ${x} ${y})`); });
    flapRot(R.flaps.vTri, b.av, 70); flapRot(R.flaps.vMit, b.av, 70); flapRot(R.flaps.vPul, b.sl, 70); flapRot(R.flaps.vAor, b.sl, 70);
    const act = ACTIVE(t);
    const lungGlow = t >= T.j3 && t < T.j4 ? 1 : 0;
    R.lungs.forEach((g) => g.setAttribute('transform', '') || g.setAttribute('opacity', 1));
    R.lungs.forEach((g, i) => { const s = 1 + 0.04 * Math.sin(t * 3) * lungGlow; const cx = i ? 950 : 130; g.setAttribute('transform', `translate(${cx * (1 - s)} ${780 * (1 - s)}) scale(${s.toFixed(4)})`); });
    for (const f of FLOW_PRE) {
      const on = act.includes(f.k), total = f.L[f.L.length - 1];
      const speed = 0.16 + 0.14 * (t < T.open || t >= T.end ? 1 : 0);
      f.els.forEach((el, i) => {
        const p = ((phase(t) * speed * 2.5 + i / f.els.length) % 1 + 1) % 1;
        const [x, y] = pointAt(f.pts, f.L, p * total);
        el.setAttribute('cx', x.toFixed(1)); el.setAttribute('cy', y.toFixed(1));
        el.setAttribute('opacity', on ? (Math.min(1, Math.sin(p * Math.PI) * 3) * 0.95).toFixed(2) : 0);
      });
    }
    // texts in the corners and the part name
    const pk = t >= T.ch + 0.1 && t < T.j1 - 0.1 ? Math.max(0, Math.floor((t - T.ch - 0.1) / 0.95)) : -1;
    const txt = pk >= 0 && pk < 4 ? PARTS[pk][1] : '';
    if (R.part.textContent !== txt) { R.part.textContent = txt; R.part.style.color = pk >= 0 && pk < 4 ? PARTS[pk][2] : ''; }
    R.part.style.opacity = txt ? 1 : 0;
    R.slow.textContent = t >= T.open && t < T.end ? 'تصوير بطيء' : '';
    R.bpm.textContent = t < T.open || t >= T.end ? '72 BPM' : '';
    const n = Math.round(100000 * ease(span(t, 0.4, 2.6)));
    R.counter.textContent = n.toLocaleString('en-US');
  }

  function splitText(el) {
    const walk = (node) => {
      for (const child of Array.from(node.childNodes)) {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment();
          for (const part of child.textContent.split(/(\s+)/)) {
            if (!part) continue;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); continue; }
            const inner = document.createElement('span'); inner.className = 'wi'; inner.textContent = part;
            const mask = document.createElement('span'); mask.className = 'w'; mask.appendChild(inner); frag.appendChild(mask);
          }
          child.replaceWith(frag);
        } else if (child.nodeType === 1 && child.classList.contains('num')) {
          const inner = document.createElement('span'); inner.className = 'wi'; const mask = document.createElement('span'); mask.className = 'w';
          child.replaceWith(mask); mask.appendChild(inner); inner.appendChild(child);
        } else if (child.nodeType === 1 && child.tagName !== 'BR') walk(child);
      }
    };
    walk(el);
  }

  let tl;
  const wordsOf = (sel) => $$('.wi', $(sel));
  function textIn(sel, t, stagger = 0.045) { tl.fromTo(wordsOf(sel), { yPercent: 118, autoAlpha: 1 }, { yPercent: 0, duration: 0.45, ease: 'orinIn', stagger, immediateRender: false }, t); cue(t, 'cap'); }
  function textOut(sel, t) { const w = wordsOf(sel); tl.to(w, { yPercent: -125, duration: 0.22, ease: 'power3.in', stagger: 0.01 }, t); tl.set(w, { autoAlpha: 0, stagger: 0.01 }, t + 0.22); }

  function build() {
    gsap.config({ force3D: false });
    tl = gsap.timeline({ paused: true });
    gsap.set($$('.wi'), { yPercent: 118, autoAlpha: 0 });
    gsap.set(wordsOf('#c0'), { yPercent: 0, autoAlpha: 1 });
    gsap.set(['#counter', '#mirror'], { opacity: 0 });
    gsap.set('#heart', { scale: 1, y: 0, transformOrigin: '540px 1150px' });
    tl.fromTo('#c0', { scale: 1.06 }, { scale: 1, duration: 0.6, ease: 'power2.out', immediateRender: false }, 0);
    tl.to('#counter', { opacity: 1, duration: 0.25 }, 0.3);
    tl.to('#counter', { opacity: 0, duration: 0.2 }, T.open - 0.25);
    textOut('#c0', T.open - 0.25);
    cue(0.4, 'count', { until: 2.6 });
    textIn('#c1', T.open); textOut('#c1', T.ch - 0.3);
    textIn('#cP', T.ch); textOut('#cP', T.j1 - 0.35);
    tl.to('#mirror', { opacity: 1, duration: 0.3 }, T.ch + 0.4);
    tl.to('#mirror', { opacity: 0, duration: 0.3 }, T.j1 - 0.3);
    PARTS.forEach((_, k) => cue(T.ch + 0.1 + k * 0.95, 'label', { k }));
    ['s1', 's2', 's3', 's4', 's5'].forEach((id, k) => { const t0 = [T.j1, T.j2, T.j3, T.j4, T.j5][k]; textIn('#' + id, t0, 0.035); textOut('#' + id, t0 + JD - 0.28); cue(t0, 'step', { k }); });
    tl.to('#heart', { scale: 1.08, y: -40, duration: 0.8, ease: 'power2.inOut' }, T.j1 - 0.6);
    tl.to('#heart', { scale: 1, y: 0, duration: 0.8, ease: 'power2.inOut' }, T.valves - 0.4);
    textIn('#c6', T.valves); textOut('#c6', T.end - 0.3);
    textIn('#c7', T.end);
    tl.fromTo('#flash', { opacity: 0 }, { opacity: 0.6, duration: 0.06, immediateRender: false }, T.end).to('#flash', { opacity: 0, duration: 0.4 }, T.end + 0.08);
    // lub / dub cues straight from the beat clock
    let prev = beat(0).u;
    for (let t = 1 / 240; t <= DURATION; t += 1 / 240) {
      const u = beat(t).u;
      const cross = (x) => (prev < x && u >= x) || (u < prev && (prev < x || u >= x) && u >= x);
      if (cross(0.18)) cue(t, 'lub'); if (cross(0.52)) cue(t, 'dub');
      prev = u;
    }
    updaters.push(draw);
    const rig = $('#rig');
    updaters.push((t) => { const h = Cinema.handheld(t, { amp: 2, rotAmp: 0.06, seed: 12 }); Cinema.applyCamera(rig, { x: h.x, y: h.y, rot: h.rot, scale: 1 }); });
    tl.set({}, {}, DURATION);
  }

  let RAW = '', lastT = 0;
  function rebuild() { tl.kill(); updaters.length = 0; cues.length = 0; $('#stage').innerHTML = RAW; prepDOM(); build(); cues.sort((a, b) => a.t - b.t); lastT = 0; }
  function seek(t) { t = clamp(t, 0, DURATION); if (t < lastT - 1e-6) rebuild(); lastT = t; tl.seek(t, false); for (const u of updaters) u(t); }
  const ready = (async () => {
    await Promise.all(['800 92px Alexandria', '600 46px Alexandria', '700 34px Alexandria', '900 120px Outfit'].map((f) => document.fonts.load(f, 'گ 0123456789 …عربي')));
    await document.fonts.ready;
    RAW = $('#stage').innerHTML; prepDOM();
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    build(); cues.sort((a, b) => a.t - b.t); seek(0);
    return true;
  })();
  window.ORIN = { id: '', prefix: 'heart-video', soundtrack: 'soundtrack_heart.py', ready, seek, cues, T, W, H, FPS, BPM, get duration() { return DURATION; } };

  if (RENDER) return;
  const stage = $('#stage');
  const fit = () => { const k = Math.min(innerWidth / W, (innerHeight - 64) / H); Object.assign(stage.style, { position: 'absolute', left: '50%', top: 'calc(50% - 26px)', transform: `translate(-50%, -50%) scale(${k})` }); };
  addEventListener('resize', fit); fit();
  let playing = true, cur = 0, last = null;
  $('#play').onclick = () => { playing = !playing; };
  $('#scrub').oninput = (e) => { cur = +e.target.value; seek(cur); };
  ready.then(() => { const loop = (now) => { if (last == null) last = now; if (playing) { cur = (cur + (now - last) / 1000) % DURATION; seek(cur); } $('#tlabel').textContent = cur.toFixed(2); last = now; requestAnimationFrame(loop); }; requestAnimationFrame(loop); });
})();
