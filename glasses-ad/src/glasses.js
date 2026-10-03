/*
 * Blue-light filter glasses — vertical ad (1080×1920, 24s, Iraqi dialect, VO-ready).
 *
 *   0.00–5.70   hook: a phone's Screen Time races to 9h 40m — "شگد ساعة تباوع موبايلك باليوم؟ 📱"
 *               → stamp "هواية! 😅"; the screen floods the frame with blue light — "وعيونك گبال
 *               الضوء الأزرق 🔵"; "خلّي بين عيونك والشاشة فلتر 👓": the glasses swoop in front of
 *               the phone and the light behind them turns warm
 *   5.70–9.30   reveal: the glasses spin to centre — "نظارة فلتر الضوء الأزرق / بإطار أسود أنيق 🖤"
 *   9.30–13.4   demo: blue rays from a phone hit the lenses; most glance off and a softer, warmer
 *               remainder reaches the eye — "عدساتها تقلل الضوء الأزرق اللي يوصل لعيونك 👁️"
 *   13.4–16.9   uses: "وياك بكل شاشة" — 📱 الموبايل · 💻 الكمبيوتر · 📺 التلفزيون · 🎮 الألعاب
 *   16.9–20.6   offer: "وسعرها؟" a price tag swings in — 20 ألف, "بس!"; a van drives in —
 *               "والتوصيل مجاني!"
 *   20.6–24.0   end card: the glasses, the name, 💰 20 ألف · 🚚 التوصيل مجاني, "اطلبها هسة 👇"
 *
 * Claims stay with what the product does — the lenses reduce the blue light reaching the eye —
 * with no health promises and no invented discount or stock limit.
 * Every caption is also the VO line for that moment (VO below), so the ad reads on mute and a
 * recorded voice-over drops straight in (render/add_vo.py).
 * Engine conventions as orin-ad v5–v7: deterministic seek(t), one owner per transform, 2D
 * transforms only and no layer promotion, full rebuild on backward seeks for the preview.
 */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const RENDER = new URLSearchParams(location.search).has('render');
  if (RENDER) document.body.classList.add('render');

  const W = 1080, H = 1920, DURATION = 24.0, FPS = 60, BPM = 120;
  const T = { hook: 0, stamp: 1.7, blue: 2.4, filter: 4.0, land: 4.75, reveal: 5.7, demo: 9.3, uses: 13.4, price: 16.9, free: 18.8, end: 20.6 };
  // voice-over script — [start, end, line]; the captions on screen carry the same words
  const VO = [
    [0.10, 1.60, 'شگد ساعة تباوع موبايلك باليوم؟'],
    [1.75, 2.30, 'هواية!'],
    [2.45, 3.85, 'وعيونك گبال الضوء الأزرق…'],
    [4.05, 5.55, 'خلّي بين عيونك والشاشة فلتر.'],
    [5.90, 8.90, 'نظارة فلتر الضوء الأزرق… بإطار أسود أنيق.'],
    [9.40, 12.90, 'عدساتها تقلل الضوء الأزرق اللي يوصل لعيونك.'],
    [13.50, 16.50, 'وياك بكل شاشة: الموبايل، الكمبيوتر، التلفزيون، والألعاب.'],
    [17.00, 18.50, 'وسعرها؟ عشرين ألف بس!'],
    [18.95, 20.20, 'والتوصيل مجاني!'],
    [20.90, 22.70, 'اطلبها هسة!'],
  ];
  T.vo = VO.map(([a, b, line]) => ({ t0: a, t1: b, line }));

  // where the glasses sit in each scene: centre x, y (stage px) and scale
  const G = {
    land: { x: 540, y: 1075, s: 0.9 },
    hero: { x: 540, y: 1000, s: 1.0 },
    demo: { x: 540, y: 1040, s: 0.8 },
    uses: { x: 540, y: 1015, s: 0.86 },
    end: { x: 540, y: 660, s: 0.78 },
  };
  const PH = { x: 540, y: 1110 };              // hook phone centre: where the light comes from
  const SHOT = 9 * 60 + 40;                    // the screen time the counter lands on, in minutes
  const BARS = [0.16, 0.1, 0.06, 0.12, 0.28, 0.35, 0.42, 0.38, 0.55, 0.72, 0.94, 0.8]; // the day, evening-heavy
  const NP = 44;                               // light particles in the hook

  const cues = [];
  const cue = (t, type, extra = {}) => cues.push({ t: Math.round(t * 1000) / 1000, type, ...extra });
  const updaters = [];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerpP = (a, b, p) => ({ x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p });
  const rnd = (i, s = 1) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); }; // deterministic 0..1
  const NS = 'http://www.w3.org/2000/svg';
  const svgEl = (tag, attrs, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };

  /* ───────────────────────── the product, drawn in code ─────────────────────────
   * Black wayfarer-style frame; clear lenses with the faint warm tint and blue-violet sheen of a
   * blue-light coating. viewBox 1000×470, lens centres at (275,215) and (725,215).
   */
  const LENS = 'M -200,-122 C -60,-130 100,-118 182,-104 C 200,-100 206,-86 204,-66 L 192,40 C 184,106 132,128 70,128 L -60,128 C -130,128 -186,104 -196,36 L -212,-84 C -216,-110 -208,-121 -200,-122 Z';
  const BROW = 'M -206,-112 C -60,-124 100,-112 186,-98';
  function glassesSVG() {
    const lens = (id, x, mirror) => {
      const m = mirror ? 'scale(-1,1)' : '';
      return `
      <g transform="translate(${x},215)">
        <clipPath id="clip${id}"><path d="${LENS}" transform="${m}"/></clipPath>
        <g clip-path="url(#clip${id})">
          <rect x="-240" y="-160" width="480" height="320" fill="#FFD696" fill-opacity=".07"/>
          <rect x="-240" y="-160" width="480" height="320" fill="url(#sheen)"/>
          <rect class="lglow" x="-240" y="-160" width="480" height="320" fill="url(#lensGlow)" opacity="0"/>
          <polygon points="-120,-160 -84,-160 -214,170 -250,170" fill="#fff" fill-opacity=".1"/>
          <polygon class="streak" points="-150,-160 -96,-160 -256,170 -310,170" fill="#fff" fill-opacity=".26"/>
          <path d="${LENS}" transform="${m}" fill="none" stroke="#000" stroke-opacity=".35" stroke-width="24"/>
        </g>
        <g transform="${m}">
          <path d="${LENS}" fill="none" stroke="#fff" stroke-opacity=".1" stroke-width="40" stroke-linejoin="round"/>
          <path d="${LENS}" fill="none" stroke="#0A0B0F" stroke-width="30" stroke-linejoin="round"/>
          <path d="${BROW}" fill="none" stroke="#0A0B0F" stroke-width="46" stroke-linecap="round"/>
          <path d="${BROW}" fill="none" stroke="url(#rimHi)" stroke-width="7" stroke-linecap="round" transform="translate(0,-15)"/>
          <path d="M -194,-40 L -184,40" fill="none" stroke="#fff" stroke-opacity=".12" stroke-width="5" stroke-linecap="round"/>
        </g>
      </g>`;
    };
    return `<svg viewBox="0 0 1000 470" xmlns="${NS}">
      <defs>
        <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#7D96FF" stop-opacity=".5"/>
          <stop offset=".3" stop-color="#9678FF" stop-opacity=".2"/>
          <stop offset=".6" stop-color="#9678FF" stop-opacity="0"/>
          <stop offset="1" stop-color="#5AAAFF" stop-opacity=".14"/>
        </linearGradient>
        <radialGradient id="lensGlow" cx=".5" cy=".42" r=".62">
          <stop offset="0" stop-color="#8CC2FF" stop-opacity=".75"/>
          <stop offset="1" stop-color="#8CC2FF" stop-opacity="0"/>
        </radialGradient>
        <linearGradient id="rimHi" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#fff" stop-opacity=".05"/>
          <stop offset=".3" stop-color="#fff" stop-opacity=".42"/>
          <stop offset="1" stop-color="#fff" stop-opacity=".08"/>
        </linearGradient>
        <radialGradient id="metal" cx=".35" cy=".35" r=".7">
          <stop offset="0" stop-color="#fff"/><stop offset=".5" stop-color="#A3ACBB"/><stop offset="1" stop-color="#4A505C"/>
        </radialGradient>
        <radialGradient id="gshadow" cx=".5" cy=".5" r=".5">
          <stop offset="0" stop-color="#000" stop-opacity=".55"/><stop offset="1" stop-color="#000" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <ellipse cx="500" cy="430" rx="370" ry="26" fill="url(#gshadow)"/>
      ${lens('L', 275, false)}
      ${lens('R', 725, true)}
      <path d="M 464,136 C 482,98 518,98 536,136" fill="none" stroke="#0A0B0F" stroke-width="30" stroke-linecap="round"/>
      <path d="M 474,118 C 488,102 512,102 526,118" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="4" stroke-linecap="round"/>
      <rect x="38" y="94" width="50" height="54" rx="13" fill="#0A0B0F"/><circle cx="63" cy="121" r="8" fill="url(#metal)"/>
      <rect x="912" y="94" width="50" height="54" rx="13" fill="#0A0B0F"/><circle cx="937" cy="121" r="8" fill="url(#metal)"/>
      <ellipse cx="440" cy="296" rx="12" ry="22" fill="#fff" fill-opacity=".14" stroke="#fff" stroke-opacity=".3" stroke-width="2"/>
      <ellipse cx="560" cy="296" rx="12" ry="22" fill="#fff" fill-opacity=".14" stroke="#fff" stroke-opacity=".3" stroke-width="2"/>
    </svg>`;
  }

  function eyeSVG() {
    const A = 'M 20,115 Q 200,-5 380,115 Q 200,235 20,115 Z';
    const lashes = [[92, 77, 74, 52], [146, 60, 136, 32], [200, 55, 200, 26], [254, 60, 264, 32], [308, 77, 326, 52]];
    return `<svg viewBox="0 0 400 230" xmlns="${NS}">
      <defs>
        <radialGradient id="iris" cx=".5" cy=".5" r=".5">
          <stop offset="0" stop-color="#9A6A40"/><stop offset=".55" stop-color="#5A3820"/><stop offset="1" stop-color="#2A180C"/>
        </radialGradient>
        <clipPath id="eyeClip"><path d="${A}"/></clipPath>
      </defs>
      <g id="eyeG">
        <path d="${A}" fill="#EEF2F8"/>
        <g clip-path="url(#eyeClip)">
          <circle cx="200" cy="115" r="66" fill="url(#iris)"/>
          <circle cx="200" cy="115" r="66" fill="none" stroke="#1A0E06" stroke-width="5"/>
          <circle cx="200" cy="115" r="28" fill="#06070A"/>
          <circle cx="178" cy="92" r="13" fill="#fff" fill-opacity=".9"/>
          <circle cx="222" cy="134" r="6" fill="#fff" fill-opacity=".55"/>
          <path d="M 20,115 Q 200,235 380,115" fill="none" stroke="#000" stroke-opacity=".12" stroke-width="22"/>
        </g>
        <path d="${A}" fill="none" stroke="#F4F7FB" stroke-width="7" stroke-linejoin="round"/>
        ${lashes.map(([a, b, c, d]) => `<path d="M ${a},${b} L ${c},${d}" stroke="#F4F7FB" stroke-width="7" stroke-linecap="round"/>`).join('')}
      </g>
    </svg>`;
  }

  /* ───────────────────────── DOM prep ───────────────────────── */

  function splitText(el) {
    const walk = (node) => {
      for (const child of Array.from(node.childNodes)) {
        if (child.nodeType === Node.TEXT_NODE) {
          const frag = document.createDocumentFragment();
          for (const part of child.textContent.split(/(\s+)/)) {
            if (!part) continue;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); continue; }
            const inner = document.createElement('span');
            inner.className = 'wi';
            inner.textContent = part;
            const mask = document.createElement('span');
            mask.className = 'w';
            mask.appendChild(inner);
            frag.appendChild(mask);
          }
          child.replaceWith(frag);
        } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName !== 'BR') {
          walk(child);
        }
      }
    };
    walk(el);
  }

  function prepDOM() {
    Cinema.installEases();
    $('#gFlip').innerHTML = glassesSVG();
    $('#eye').innerHTML = eyeSVG();
    $$('[data-split]').forEach(splitText);
    const parts = $('#parts');
    for (let i = 0; i < NP; i++) parts.appendChild(document.createElement('i'));

    const dust = $('#dust');
    const r = (() => { let s = 7; return () => { s = (s + 0x6D2B79F5) | 0; let x = Math.imul(s ^ (s >>> 15), 1 | s); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; })();
    for (let i = 0; i < 28; i++) {
      const d = document.createElement('i');
      const size = 2 + r() * 5;
      Object.assign(d.style, { position: 'absolute', left: '0', top: '0', width: size + 'px', height: size + 'px', borderRadius: '50%', background: r() < 0.3 ? '#FFC77A' : '#CFE6FF' });
      d._p = { x: r() * W, y: r() * (H + 200), v: 16 + r() * 40, a: 0.08 + r() * 0.22, f: 0.2 + r() * 0.5, ph: r() * 6.28, amp: 10 + r() * 30 };
      dust.appendChild(d);
    }
    updaters.push((t) => {
      for (const d of dust.children) {
        const p = d._p;
        const y = ((p.y - p.v * t) % (H + 200) + (H + 200)) % (H + 200) - 100;
        d.style.transform = `translate(${(p.x + Math.sin(t * p.f + p.ph) * p.amp).toFixed(1)}px, ${y.toFixed(1)}px)`;
        d.style.opacity = (p.a * (0.6 + 0.4 * Math.sin(t * 1.3 + p.ph))).toFixed(3);
      }
    });

    Cinema.grain($('#grain'), 71, 0.12);
  }

  /* ───────────────────────── helpers ───────────────────────── */

  let tl;
  const wordsOf = (sel) => $$('.wi', typeof sel === 'string' ? $(sel) : sel);
  function textIn(sel, t, { stagger = 0.06, dur = 0.6, ease = 'orinIn', rot = 3 } = {}) {
    tl.fromTo(wordsOf(sel), { yPercent: 118, rotation: rot, autoAlpha: 1 },
      { yPercent: 0, rotation: 0, duration: dur, ease, stagger, immediateRender: false }, t);
  }
  function textOut(sel, t, { stagger = 0.025, dur = 0.26, ease = 'power3.in' } = {}) {
    const w = wordsOf(sel);
    tl.to(w, { yPercent: -125, rotation: -3, duration: dur, ease, stagger }, t);
    tl.set(w, { autoAlpha: 0, stagger }, t + dur);
  }
  // camera shake as a pure function of time (impulses summed by an updater, never chained tweens)
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
      .to('#flash', { opacity: 0, duration: 0.5, ease: 'power2.out' }, t + 0.05);
  }
  // lens glow: impulses per lens, summed by an updater (same reason as the shake)
  const glows = [[], []];
  function glint(t, lens = -1) { if (lens !== 1) glows[0].push(t); if (lens !== 0) glows[1].push(t); }
  function lensSweep(t) {
    tl.fromTo($$('#glasses .streak'), { x: -200 }, { x: 640, duration: 0.8, ease: 'power2.inOut', immediateRender: false }, t);
    cue(t + 0.15, 'shine');
  }

  /* ───────────────────────── scenes ───────────────────────── */

  function buildHook() {
    // the headline is already up at frame 0 — it is the thumbnail
    gsap.set(wordsOf('#hk1'), { yPercent: 0, autoAlpha: 1 });
    tl.fromTo('#hk1', { scale: 1.06 }, { scale: 1, duration: 0.7, ease: 'power2.out', immediateRender: false }, 0);

    // Screen Time races up: minutes(t) is a pure function, bars and digits follow it
    const hh = $('#phone .hh'), mm = $('#phone .mm');
    const bars = $$('#phone .st-bars i'), apps = $$('#phone .app');
    const C0 = 0.1, CD = 1.55;
    const minutesAt = (t) => SHOT * Math.pow(clamp((t - C0) / CD), 2);
    updaters.push((t) => {
      const m = Math.round(minutesAt(t));
      hh.textContent = String(Math.floor(m / 60));
      mm.textContent = String(m % 60).padStart(2, '0');
      const f = (m / SHOT) * BARS.length;
      bars.forEach((b, k) => { b.style.transform = `scaleY(${(clamp(f - k) * BARS[k]).toFixed(4)})`; });
    });
    for (let h = 1; h <= 9; h++) cue(C0 + CD * Math.sqrt((60 * h) / SHOT), 'tick', { h });
    gsap.set(apps, { opacity: 0, x: 40 });
    apps.forEach((a, k) => tl.to(a, { opacity: 1, x: 0, duration: 0.3, ease: 'power3.out' }, C0 + CD * Math.sqrt((k + 1) / 3.4)));

    // "هواية! 😅"
    const st = $('#stamp');
    gsap.set(st, { opacity: 0 });
    tl.fromTo(st, { opacity: 1, scale: 2.6, rotation: -14 }, { scale: 1, rotation: 0, duration: 0.2, ease: 'power4.in', immediateRender: false }, T.stamp - 0.2);
    tl.set(st, { opacity: 1 }, T.stamp - 0.2);
    cue(T.stamp, 'stamp');
    shake(T.stamp, 20);
    flash(T.stamp, 0.22);
    Cinema.chromaBurst(tl, $('#stamp span'), T.stamp, { amp: 22, size: 600 });
    tl.fromTo($('#stamp i'), { scale: 0.3, rotation: -30 }, { scale: 1, rotation: 0, duration: 0.45, ease: 'back.out(3)', immediateRender: false }, T.stamp + 0.1);
    tl.to(st, { scale: 0.7, opacity: 0, duration: 0.24, ease: 'power2.in' }, T.blue - 0.12);

    // blue light floods out of the screen
    const B = T.blue;
    textOut('#hk1', B - 0.1, { dur: 0.24 });
    cue(B - 0.1, 'whoosh');
    textIn('#hk2', B + 0.02, { stagger: 0.07, dur: 0.5 });
    cue(B + 0.02, 'blue', { until: T.land });
    tl.to('#phone .glare', { opacity: 0.75, duration: 0.5, ease: 'power2.out' }, B);
    tl.fromTo('#phGlow', { scale: 1, opacity: 0.8 }, { scale: 1.3, opacity: 1, duration: 0.6, ease: 'power2.out', immediateRender: false }, B);
    tl.to('#raysCold', { opacity: 1, duration: 0.4 }, B + 0.05);
    tl.to('#gCold', { opacity: 1, scale: 1.15, duration: 0.6 }, B);
    tl.to('#push', { scale: 1.06, duration: T.land - B, ease: 'power1.inOut' }, B);
    const rc = $('#raysCold'), rw = $('#raysWarm');
    updaters.push((t) => {
      rc.style.transform = `rotate(${(t * 7).toFixed(2)}deg)`;
      rw.style.transform = `rotate(${(t * 7).toFixed(2)}deg)`;
    });
    buildParticles();

    // "خلّي بين عيونك والشاشة فلتر 👓" — the glasses swoop in front of the phone
    const F = T.filter, L = T.land;
    textOut('#hk2', F - 0.1, { dur: 0.24 });
    cue(F - 0.1, 'whoosh');
    textIn('#hk3', F + 0.02, { stagger: 0.07, dur: 0.5 });
    tl.set('#glasses', { opacity: 1 }, L - 0.5);
    tl.to('#glasses', { x: G.land.x, y: G.land.y, scale: G.land.s, rotation: 0, duration: 0.5, ease: 'power3.out' }, L - 0.5);
    tl.fromTo('#gFlip', { scaleX: -1 }, { scaleX: 1, duration: 0.5, ease: 'power2.out', immediateRender: false }, L - 0.5);
    cue(L - 0.5, 'swoop');
    cue(L, 'land');
    flash(L, 0.12);
    glint(L);
    tl.to('#raysCold', { opacity: 0, duration: 0.35 }, L);
    tl.to('#raysWarm', { opacity: 1, duration: 0.35 }, L);
    tl.to('#phone .glare', { opacity: 0.2, duration: 0.4 }, L);
    tl.to('#gCold', { opacity: 0.2, duration: 0.6 }, L);
    tl.to('#gWarm', { opacity: 1, duration: 0.8 }, L);

    // the phone falls away, the glasses take the stage
    const R = T.reveal;
    textOut('#hk3', R - 0.3, { dur: 0.24 });
    tl.to('#phone', { y: 1150, rotation: 10, opacity: 0, duration: 0.5, ease: 'power2.in' }, R - 0.35);
    tl.to(['#phGlow', '#raysWarm'], { opacity: 0, duration: 0.5 }, R - 0.3);
    tl.to('#push', { scale: 1, duration: 0.6, ease: 'camera' }, R - 0.3);
    tl.set('#hook', { autoAlpha: 0 }, R + 0.3);
  }

  // light particles flying out of the screen at the viewer; once the glasses are in front of the
  // phone, the ones still in flight turn warm and dimmer (that's the filter, in one picture)
  function buildParticles() {
    const B = T.blue + 0.05, SPAN = T.land + 0.3 - B, LIFE = 0.95;
    const P = $$('#parts i').map((el, i) => ({ el, b: B + (i / NP) * SPAN, a: rnd(i, 3) * Math.PI * 2, v: 0.75 + rnd(i, 5) * 0.5, s: 0.6 + rnd(i, 7) * 0.9 }));
    updaters.push((t) => {
      for (const p of P) {
        const age = t - p.b;
        if (age < 0 || age > LIFE || t > T.reveal) {
          if (p.on) { p.el.style.opacity = '0'; p.on = false; }
          continue;
        }
        const u = age / LIFE;
        const r = (60 + 1050 * Math.pow(u, 1.8)) * p.v;
        const warm = t >= T.land;
        p.el.className = warm ? 'pw' : '';
        p.el.style.transform = `translate(${(PH.x + Math.cos(p.a) * r).toFixed(1)}px, ${(PH.y + Math.sin(p.a) * r * 0.9).toFixed(1)}px) scale(${((0.5 + 3.2 * Math.pow(u, 1.6)) * p.s).toFixed(3)})`;
        p.el.style.opacity = (Math.pow(Math.sin(Math.PI * u), 0.8) * (warm ? 0.5 : 0.9)).toFixed(3);
        p.on = true;
      }
    });
  }

  function buildProduct() {
    const R = T.reveal;
    tl.set('#prod', { autoAlpha: 1 }, R - 0.4);
    tl.to('#glasses', { x: G.hero.x, y: G.hero.y, scale: G.hero.s, duration: 0.55, ease: 'power3.inOut' }, R - 0.35);
    tl.fromTo('#gFlip', { scaleX: 1 }, { scaleX: -1, duration: 0.22, ease: 'power2.in', immediateRender: false }, R - 0.3)
      .to('#gFlip', { scaleX: 1, duration: 0.3, ease: 'power2.out' }, R - 0.08);
    cue(R, 'reveal');
    flash(R, 0.2);
    shake(R, 12);
    glint(R);
    Cinema.flarePulse(tl, $('#prod'), G.hero.x, G.hero.y - 40, R + 0.02, { peak: 0.85, dur: 1.0, color: '255,190,110' });
    textIn('#pTitle', R + 0.15, { stagger: 0.07, dur: 0.6 });
    cue(R + 0.15, 'title');
    textIn('#pSub', R + 0.9, { stagger: 0.07, dur: 0.5 });
    cue(R + 0.9, 'pop');
    lensSweep(R + 0.3);
    lensSweep(R + 2.1);
    tl.to('#push', { scale: 1.035, duration: 2.6, ease: 'none' }, R + 0.35);
    textOut('#pTitle', T.demo - 0.35, { dur: 0.24 });
    textOut('#pSub', T.demo - 0.32, { dur: 0.24 });
    tl.to('#push', { scale: 1, duration: 0.4, ease: 'power2.inOut' }, T.demo - 0.33);
    tl.set('#prod', { autoAlpha: 0 }, T.demo);
  }

  function buildDemo() {
    const D = T.demo;
    tl.set('#demo', { autoAlpha: 1 }, D - 0.35);
    tl.to('#glasses', { x: G.demo.x, y: G.demo.y, scale: G.demo.s, duration: 0.6, ease: 'power3.inOut' }, D - 0.3);
    cue(D - 0.3, 'move');
    textIn('#dCap', D + 0.1, { stagger: 0.05, dur: 0.5 });
    gsap.set('#dPhone', { y: -700 });
    gsap.set('#dGlow', { opacity: 0 });
    tl.to('#dPhone', { y: 0, duration: 0.5, ease: 'back.out(1.6)' }, D + 0.05);
    tl.to('#dGlow', { opacity: 1, duration: 0.5 }, D + 0.2);
    cue(D + 0.4, 'drop');
    gsap.set('#eye', { y: 500, opacity: 0 });
    tl.to('#eye', { y: 0, opacity: 1, duration: 0.55, ease: 'power3.out' }, D + 0.25);
    buildRays(D + 0.75);
    // the eye blinks once — alive, nothing more
    const eg = $('#eyeG');
    tl.to(eg, { scaleY: 0.08, duration: 0.07, ease: 'power2.in', svgOrigin: '200 115' }, D + 2.75)
      .to(eg, { scaleY: 1, duration: 0.12, ease: 'power2.out', svgOrigin: '200 115' }, D + 2.82);
    const O = T.uses - 0.3;
    textOut('#dCap', O, { dur: 0.24 });
    tl.to('#dPhone', { y: -700, duration: 0.4, ease: 'power2.in' }, O);
    tl.to('#dGlow', { opacity: 0, duration: 0.3 }, O);
    tl.to('#eye', { y: 500, opacity: 0, duration: 0.4, ease: 'power2.in' }, O);
    tl.set('#demo', { autoAlpha: 0 }, T.uses + 0.15);
  }

  // Six blue rays leave the phone; the four outer ones glance off the lenses, the middle one of
  // each lens carries on — warmer and dimmer — to the eye. Geometry comes from G.demo, so the hit
  // points sit on the lenses exactly; drawing and the flowing dashes are pure functions of time.
  function buildRays(t0) {
    const svg = $('#rayLayer');
    const defs = svgEl('defs', {}, svg);
    const k = (860 / 1000) * G.demo.s;
    const LC = [275, 725].map((lx) => ({ x: G.demo.x + k * (lx - 500), y: G.demo.y + k * (215 - 235) }));
    const EYE = { x: 540, y: 1386 };
    const spec = [[0, -58, false], [0, 0, true], [0, 58, false], [1, -58, false], [1, 0, true], [1, 58, false]];
    const order = [0, 3, 1, 4, 2, 5];
    const rays = spec.map(([li, dx, pass], i) => {
      const S = { x: 486 + i * 22, y: 776 };
      const Hp = { x: LC[li].x + dx, y: LC[li].y - 46 + Math.abs(dx) * 0.16 };
      const len = Math.hypot(Hp.x - S.x, Hp.y - S.y);
      const d = { x: (Hp.x - S.x) / len, y: (Hp.y - S.y) / len };
      const t = t0 + order.indexOf(i) * 0.1;
      const g = svgEl('g', { opacity: 0 }, svg);
      const line = (attrs) => svgEl('line', { 'stroke-linecap': 'round', visibility: 'hidden', ...attrs }, g);
      const r = { li, pass, S, H: Hp, t, g };
      r.inGlow = line({ stroke: '#3EA2FF', 'stroke-width': 16, 'stroke-opacity': 0.22 });
      r.inCore = line({ stroke: '#9AD3FF', 'stroke-width': 5, 'stroke-dasharray': '26 18' });
      if (pass) {
        r.E = { x: Hp.x + d.x * ((LC[li].y + 74 - Hp.y) / d.y), y: LC[li].y + 74 };
        r.Q = { x: EYE.x + (li ? 26 : -26), y: EYE.y };
        r.thru = line({ stroke: '#FFD9A0', 'stroke-width': 4, 'stroke-opacity': 0.4 });
        r.outGlow = line({ stroke: '#FFB547', 'stroke-width': 14, 'stroke-opacity': 0.14 });
        r.outCore = line({ stroke: '#FFD08A', 'stroke-width': 4, 'stroke-opacity': 0.62, 'stroke-dasharray': '26 18' });
      } else {
        r.R = { x: Hp.x + d.x * 300 + (li ? 40 : -40), y: Hp.y - d.y * 300 };
        const gid = `rf${i}`;
        const lg = svgEl('linearGradient', { id: gid, gradientUnits: 'userSpaceOnUse', x1: Hp.x, y1: Hp.y, x2: r.R.x, y2: r.R.y }, defs);
        svgEl('stop', { offset: 0, 'stop-color': '#9AD3FF', 'stop-opacity': 1 }, lg);
        svgEl('stop', { offset: 1, 'stop-color': '#9AD3FF', 'stop-opacity': 0 }, lg);
        r.outGlow = line({ stroke: `url(#${gid})`, 'stroke-width': 18, 'stroke-opacity': 0.42 });
        r.outCore = line({ stroke: `url(#${gid})`, 'stroke-width': 6, 'stroke-dasharray': '26 18' });
        const sx = Hp.x, sy = Hp.y;
        const spark = svgEl('path', {
          d: `M ${sx},${sy - 24} L ${sx + 5},${sy - 5} L ${sx + 24},${sy} L ${sx + 5},${sy + 5} L ${sx},${sy + 24} L ${sx - 5},${sy + 5} L ${sx - 24},${sy} L ${sx - 5},${sy - 5} Z`,
          fill: '#EAF6FF', opacity: 0,
        }, svg);
        tl.fromTo(spark, { scale: 0.2, opacity: 1, rotation: 0 }, { scale: 1.2, opacity: 0, rotation: 60, duration: 0.45, ease: 'power2.out', svgOrigin: `${sx} ${sy}`, immediateRender: false }, t + 0.3);
      }
      cue(t, 'ray', { k: i });
      cue(t + 0.3, pass ? 'pass' : 'ping', { k: i });
      glows[li].push(t + 0.3);
      return r;
    });
    const setL = (ln, a, b, p) => {
      ln.setAttribute('visibility', p > 0 ? 'visible' : 'hidden');
      ln.setAttribute('x1', a.x.toFixed(1)); ln.setAttribute('y1', a.y.toFixed(1));
      ln.setAttribute('x2', b.x.toFixed(1)); ln.setAttribute('y2', b.y.toFixed(1));
    };
    const FADE = T.uses - 0.35;
    updaters.push((t) => {
      const flow = (-((t * 320) % 44)).toFixed(1);
      const fade = 1 - clamp((t - FADE) / 0.35);
      for (const r of rays) {
        const pin = clamp((t - r.t) / 0.3);
        r.g.setAttribute('opacity', (pin > 0 ? fade : 0).toFixed(3));
        const hIn = lerpP(r.S, r.H, pin);
        setL(r.inGlow, r.S, hIn, pin);
        setL(r.inCore, r.S, hIn, pin);
        r.inCore.setAttribute('stroke-dashoffset', flow);
        const po = clamp((t - r.t - 0.3) / 0.3);
        if (r.pass) {
          const p1 = clamp(po * 2), p2 = clamp(po * 2 - 1);
          setL(r.thru, r.H, lerpP(r.H, r.E, p1), p1);
          setL(r.outGlow, r.E, lerpP(r.E, r.Q, p2), p2);
          setL(r.outCore, r.E, lerpP(r.E, r.Q, p2), p2);
        } else {
          const e = lerpP(r.H, r.R, po);
          setL(r.outGlow, r.H, e, po);
          setL(r.outCore, r.H, e, po);
        }
        r.outCore.setAttribute('stroke-dashoffset', flow);
      }
    });
  }

  function buildUses() {
    const U = T.uses;
    tl.set('#uses', { autoAlpha: 1 }, U - 0.2);
    tl.to('#glasses', { x: G.uses.x, y: G.uses.y, scale: G.uses.s, duration: 0.55, ease: 'power3.inOut' }, U - 0.2);
    cue(U - 0.2, 'move');
    textIn('#uCap', U + 0.05, { stagger: 0.07, dur: 0.55 });
    const P = [[785, 745], [295, 745], [785, 1290], [295, 1290]];
    const at = [U + 0.7, U + 1.2, U + 1.7, U + 2.2];
    $$('.use').forEach((u, k) => {
      gsap.set(u, { xPercent: -50, yPercent: -50, x: P[k][0], y: P[k][1], opacity: 0, scale: 0.4 });
      tl.to(u, { opacity: 1, scale: 1, duration: 0.45, ease: 'back.out(2.2)' }, at[k]);
      cue(at[k], 'chip', { k });
      glint(at[k] + 0.05, k % 2 ? 0 : 1);
    });
    const O = T.price - 0.3;
    textOut('#uCap', O, { dur: 0.24 });
    $$('.use').forEach((u, k) => {
      tl.to(u, { x: P[k][0] + (P[k][0] > 540 ? 460 : -460), opacity: 0, duration: 0.35, ease: 'power2.in' }, O + k * 0.03);
    });
    tl.to('#glasses', { y: -420, scale: 0.6, rotation: -12, duration: 0.45, ease: 'power3.in' }, O);
    cue(O, 'whoosh');
    tl.set('#uses', { autoAlpha: 0 }, T.price + 0.2);
  }

  function buildOffer() {
    const P = T.price;
    tl.set('#offer', { autoAlpha: 1 }, P - 0.1);
    textIn('#oCap', P + 0.05, { stagger: 0.07, dur: 0.5 });
    const TL = P + 0.55; // the tag lands
    cue(P - 0.3, 'break', { until: TL });
    const tag = $('#tag');
    gsap.set(tag, { y: -1050 });
    tl.to(tag, { y: 0, duration: 0.3, ease: 'power3.in' }, TL - 0.3);
    // damped swing on its string — CSS `rotate` (the transform belongs to GSAP), pure in t
    updaters.push((t) => {
      const d = t - TL;
      tag.style.rotate = d < 0 ? '0deg' : `${(13 * Math.exp(-d / 0.45) * Math.cos(2 * Math.PI * 1.5 * d)).toFixed(3)}deg`;
    });
    cue(TL, 'price');
    shake(TL, 10);
    flash(TL, 0.14);
    // coin-coloured sparks burst off the tag
    const burst = document.createElement('div');
    burst.className = 'layer';
    $('#offer').appendChild(burst);
    for (let i = 0; i < 12; i++) {
      const s = document.createElement('i');
      Object.assign(s.style, { position: 'absolute', left: '540px', top: '800px', width: '34px', height: '34px', margin: '-17px 0 0 -17px', borderRadius: '50%', opacity: 0, background: 'radial-gradient(circle, #FFF3C4 0%, #FFC94A 40%, rgba(255,160,40,0) 72%)' });
      burst.appendChild(s);
      const a = (i / 12) * Math.PI * 2 + rnd(i, 9) * 0.4, dist = 330 + rnd(i, 4) * 160;
      tl.fromTo(s, { x: 0, y: 0, scale: 1.3, opacity: 1 }, { x: Math.cos(a) * dist, y: Math.sin(a) * dist * 0.8, scale: 0.3, opacity: 0, duration: 0.7, ease: 'power3.out', immediateRender: false }, TL);
    }
    const bas = $('#bas');
    gsap.set(bas, { scale: 0, rotation: -30 });
    tl.to(bas, { scale: 1, rotation: 12, duration: 0.4, ease: 'back.out(3)' }, TL + 0.3);
    cue(TL + 0.3, 'pop');

    // free delivery: the tag steps back, a van pulls in
    const F = T.free;
    textOut('#oCap', F - 0.15, { dur: 0.24 });
    tl.to(tag, { scale: 0.62, duration: 0.45, ease: 'power3.inOut' }, F - 0.15);
    tl.to(bas, { scale: 0, opacity: 0, duration: 0.25, ease: 'power2.in' }, F - 0.15);
    const road = $('#road');
    gsap.set(road, { scaleX: 0, transformOrigin: '100% 50%' });
    tl.to(road, { scaleX: 1, duration: 0.4, ease: 'power3.out' }, F);
    const van = $('#van'), fx = $('#vanFx');
    const VS = F + 0.1, VE = F + 0.65, X0 = 1400;
    gsap.set(van, { x: X0, y: 1236 });
    tl.to(van, { x: 540, duration: VE - VS, ease: 'power3.out' }, VS);
    tl.set(fx, { opacity: 1 }, VS);
    tl.to(fx, { opacity: 0, duration: 0.3 }, VE - 0.12);
    cue(VS, 'van', { until: VE });
    // the road scrolls with the van (same power3.out curve), and the van rocks as it brakes
    updaters.push((t) => {
      const u = clamp((t - VS) / (VE - VS));
      road.style.backgroundPositionX = `${((X0 - 540) * (1 - Math.pow(1 - u, 3))).toFixed(1)}px`;
      const d = t - VE;
      van.style.rotate = t < VS ? '0deg' : d < 0 ? '-3deg' : `${(-3 * Math.exp(-d / 0.18) * Math.cos(2 * Math.PI * 2.4 * d)).toFixed(3)}deg`;
    });
    cue(VE + 0.05, 'horn');
    const badge = $('#freeBadge');
    gsap.set(badge, { xPercent: -50, yPercent: -50, x: 540, y: 905, opacity: 0, rotation: -6 });
    tl.fromTo(badge, { scale: 2.4, opacity: 1 }, { scale: 1, duration: 0.22, ease: 'power4.in', immediateRender: false }, VE + 0.2);
    cue(VE + 0.42, 'badge');
    textIn('#fCap', F + 0.2, { stagger: 0.08, dur: 0.5 });

    // exit: the van drives off, everything clears for the end card
    const X = T.end - 0.25;
    tl.to(van, { x: -460, duration: 0.45, ease: 'power3.in' }, X);
    cue(X, 'vanout');
    textOut('#fCap', X, { dur: 0.24 });
    tl.to([tag, badge, road], { opacity: 0, duration: 0.3 }, X + 0.05);
    tl.set('#offer', { autoAlpha: 0 }, T.end + 0.3);
  }

  function buildEnd() {
    const E = T.end, I = E + 0.15;
    tl.set('#end', { autoAlpha: 1 }, E - 0.1);
    tl.to('#glasses', { x: G.end.x, y: G.end.y, scale: G.end.s, rotation: 0, duration: 0.55, ease: 'power3.out' }, E - 0.05);
    tl.to('#gWarm', { y: 740, duration: 0.6, ease: 'power2.out' }, E - 0.05);
    tl.fromTo('#gFlip', { scaleX: -1 }, { scaleX: 1, duration: 0.55, ease: 'power2.out', immediateRender: false }, E - 0.05);
    cue(E - 0.5, 'riser', { until: I });
    cue(I, 'impact');
    flash(I, 0.2);
    shake(I, 12);
    glint(I);
    Cinema.flarePulse(tl, $('#end'), G.end.x, G.end.y - 30, I + 0.02, { peak: 0.8, dur: 1.0, color: '255,190,110' });
    lensSweep(I + 0.3);
    textIn('#eName', I + 0.35, { stagger: 0.06, dur: 0.55 });
    cue(I + 0.35, 'chime');
    $$('#chips .chip').forEach((c, k) => {
      tl.fromTo(c, { opacity: 0, scale: 0.5, y: 30 }, { opacity: 1, scale: 1, y: 0, duration: 0.45, ease: 'back.out(2.2)', immediateRender: false }, I + 0.75 + k * 0.14);
      cue(I + 0.75 + k * 0.14, 'chip', { k: 4 + k });
    });
    gsap.set($$('#chips .chip'), { opacity: 0 });
    gsap.set('#ctaGlow', { opacity: 0 });
    tl.to('#ctaGlow', { opacity: 1, duration: 0.6 }, I + 1.1);
    tl.fromTo('#cta', { opacity: 0, scale: 0.3 }, { opacity: 1, scale: 1, duration: 0.7, ease: 'uiPop', immediateRender: false }, I + 1.1);
    cue(I + 1.1, 'cta');
    tl.fromTo('#finger', { y: 0 }, { y: 14, duration: 0.2, yoyo: true, repeat: 7, ease: 'sine.inOut', immediateRender: false }, I + 1.6);
    [I + 1.6, I + 2.45].forEach((t) => Cinema.sweep(tl, $('#cta'), t, { dur: 0.75, color: 'rgba(255,255,255,.7)' }));
    [I + 2.05, I + 2.9].forEach((t) => {
      tl.to('#cta', { scale: 1.045, duration: 0.18, yoyo: true, repeat: 1, ease: 'power2.out' }, t);
      cue(t, 'pulse');
    });
  }

  /* ───────────────────────── build ───────────────────────── */

  function build() {
    // 2D transforms only + no compositor layers (glasses.css) → identical frames in any seek order
    gsap.config({ force3D: false });
    tl = gsap.timeline({ paused: true });

    gsap.set($$('.wi'), { yPercent: 118, autoAlpha: 0 });
    gsap.set('#prod, #demo, #uses, #offer, #end', { autoAlpha: 0 });
    gsap.set('#cta', { opacity: 0, scale: 0.3 });
    gsap.set('#phone', { rotation: -3 });
    gsap.set('#glasses', { x: 540, y: 2300, scale: 0.6, rotation: 28, opacity: 0 });
    gsap.set('#gFlip', { scaleX: 1 });
    gsap.set($$('#glasses .streak'), { x: -200 }); // the sweeping highlight waits off the lens
    gsap.set('#gCold', { x: PH.x, y: PH.y, opacity: 0.55 });
    gsap.set('#gWarm', { x: 540, y: 1000, opacity: 0 });
    gsap.set('#grid', { opacity: 0.3 });

    buildHook();
    buildProduct();
    buildDemo();
    buildUses();
    buildOffer();
    buildEnd();

    const world = $('#world');
    updaters.push((t) => {
      const s = shakeAt(t);
      world.style.transform = s.x || s.y ? `translate(${s.x.toFixed(2)}px, ${s.y.toFixed(2)}px)` : '';
    });
    const rig = $('#rig');
    updaters.push((t) => {
      const k = t < T.reveal ? 1 : 0.5;
      const h = Cinema.handheld(t, { amp: 2 + 2.5 * k, rotAmp: 0.12 + 0.2 * k, seed: 23 });
      Cinema.applyCamera(rig, { x: h.x, y: h.y, rot: h.rot, scale: 1 });
    });
    // the glasses float — except in the demo, where the rays must land exactly on the lenses
    const bob = $('#gBob');
    updaters.push((t) => {
      const still = clamp((t - (T.demo - 0.4)) / 0.4) * (1 - clamp((t - (T.uses - 0.3)) / 0.4));
      const a = 1 - still;
      bob.style.transform = `translate(0px, ${(7 * a * Math.sin(2 * Math.PI * 0.45 * t)).toFixed(2)}px) rotate(${(0.7 * a * Math.sin(2 * Math.PI * 0.31 * t + 1)).toFixed(3)}deg)`;
    });
    const lg = $$('#glasses .lglow');
    updaters.push((t) => {
      glows.forEach((list, i) => {
        let v = 0;
        for (const th of list) if (t >= th) v += 0.7 * Math.exp(-(t - th) / 0.16);
        lg[i].setAttribute('opacity', Math.min(0.9, v).toFixed(3));
      });
    });

    tl.set({}, {}, DURATION);
  }

  /* ───────────────────────── player ───────────────────────── */

  let RAW = '', lastT = 0;
  function rebuild() {
    tl.kill();
    updaters.length = 0;
    shakes.length = 0;
    glows[0].length = 0;
    glows[1].length = 0;
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
    await Promise.all(['700 36px Alexandria', '800 104px Alexandria', '700 70px Alexandria', '700 40px Outfit', '800 124px Outfit', '900 214px Outfit']
      .map((f) => document.fonts.load(f, 'گ 0123456789 hm …عربي')));
    await document.fonts.ready;
    RAW = $('#stage').innerHTML;
    prepDOM();
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    build();
    cues.sort((a, b) => a.t - b.t);
    seek(0);
    return true;
  })();

  window.ORIN = { id: '', prefix: 'glasses-ad', soundtrack: 'soundtrack_glasses.py', ready, seek, cues, T, W, H, FPS, BPM, get duration() { return DURATION; } };

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
