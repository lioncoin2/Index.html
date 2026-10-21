/* Engine explainer, Anatomy-kit edition: an isometric half-section driven by one pure function deg(t).
   Static art and per-angle shapes come from build.mjs (src/art.js); this file only places them. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const RENDER = new URLSearchParams(location.search).has('render');
  if (RENDER) document.body.classList.add('render');
  const A = window.ART;
  const W = 1080, H = 1920, DURATION = 35.0, FPS = 60, BPM = 120;
  const T = { hook: 0, open: 3.1, parts: 5.9, strokes: 9.6, fast: 26.4, wheels: 30.6 };
  const SD = 4.2, SM = 3.0;
  const NAMES = ['سحب', 'ضغط', 'انفجار', 'عادم'];
  const PARTS = [['plug', 'البوجي ⚡'], ['valveIn', 'بلف السحب'], ['valveEx', 'بلف العادم'], ['piston', 'البستن'], ['rod', 'ذراع التوصيل'], ['crank', 'الكرنك']];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const ease = (x) => x * x * (3 - 2 * x);
  const updaters = [];
  const cues = [];
  const cue = (t, type, extra = {}) => cues.push({ t: Math.round(t * 1000) / 1000, type, ...extra });

  // crank angle, the only clock of the machine
  function deg(t) {
    if (t < T.parts) return -2160 * Math.pow(1 - t / T.parts, 2);
    if (t < T.strokes) return 0;
    if (t < T.fast) { const k = Math.min(3, Math.floor((t - T.strokes) / SD)); return 180 * k + 180 * ease(clamp((t - T.strokes - k * SD) / SM)); }
    const x = t - T.fast, x1 = 2.25;               // accelerate to 1800°/s, then hold
    return x < x1 ? 720 + 400 * x * x : 720 + 400 * x1 * x1 + 1800 * (x - x1);
  }
  const speed = (t) => (t < T.fast ? 0 : Math.min(1800, 800 * (t - T.fast)));
  const crownZ = (d) => { const a = d * Math.PI / 180; return A.CZ + A.R * Math.cos(a) + Math.sqrt(A.L * A.L - A.R * A.R * Math.sin(a) ** 2) - A.PIN_UP + A.PIST_H; };
  const lift = (z) => `translate(0 ${(A.ZV[1] * z).toFixed(2)})`;

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
          const inner = document.createElement('span'); inner.className = 'wi';
          const mask = document.createElement('span'); mask.className = 'w';
          child.replaceWith(mask); mask.appendChild(inner); inner.appendChild(child);
        } else if (child.nodeType === 1 && child.tagName !== 'BR') walk(child);
      }
    };
    walk(el);
  }

  const R2 = {};
  function prepDOM() {
    Cinema.installEases();
    $('#stage').classList.add('iso'); $('#stage').dataset.theme = 'light';
    if (!$('#isoCss')) document.head.insertAdjacentHTML('beforeend', `<style id="isoCss">${window.ISO_CSS}</style>`);
    const svg = $('#fig');
    svg.setAttribute('viewBox', `0 0 ${A.W} ${A.H}`);
    const [tx, ty] = A.tip;
    svg.innerHTML = `<defs><radialGradient id="burnG"><stop offset="0" stop-color="#FFF3BF"/><stop offset=".45" stop-color="#FFA94D"/><stop offset="1" stop-color="#F03E3E" stop-opacity="0"/></radialGradient>
      <radialGradient id="glowG"><stop offset="0" stop-color="#FFF9DB"/><stop offset=".5" stop-color="#FFD43B" stop-opacity=".8"/><stop offset="1" stop-color="#FFD43B" stop-opacity="0"/></radialGradient></defs>
      ${A.base}${A.block}<g id="mech"></g><g id="piston" data-part="piston">${A.piston}</g>
      <path id="gas"/><ellipse id="burn" rx="${Math.abs(A.chamberRx[0]) + 10}" ry="40" fill="url(#burnG)" opacity="0"/>
      <g id="valveIn" data-part="valveIn">${A.valveIn}</g><g id="valveEx" data-part="valveEx">${A.valveEx}</g><g data-part="plugWrap">${A.spark}</g>
      <circle id="glow" cx="${tx}" cy="${ty}" r="26" fill="url(#glowG)" opacity="0"/>
      <path id="bolt" d="M ${tx + 2},${ty - 16} l -9,14 h 8 l -6,14 l 15,-17 h -8 l 6,-11 z" fill="#FFD43B" stroke="#E8590C" stroke-width="1.5" opacity="0"/>`;
    Object.assign(R2, { mech: $('#mech'), piston: $('#piston'), gas: $('#gas'), burn: $('#burn'), vIn: $('#valveIn'), vEx: $('#valveEx'), glow: $('#glow'), bolt: $('#bolt'), readout: $('#readout'), rpm: $('#rpm'), part: $('#part') });
    $$('[data-split]').forEach(splitText);
    R2.idx = -1;
  }

  let hl = new Set();
  function applyHL() {
    $$('[data-part]', $('#fig')).forEach((g) => {
      const name = g.dataset.part === 'plugWrap' ? 'plug' : g.dataset.part;
      if (hl.has(name)) g.setAttribute('data-hl', ''); else g.removeAttribute('data-hl');
    });
  }
  function highlightAt(t) {
    const s = new Set();
    if (t >= T.parts + 0.1 && t < T.strokes - 0.2) { const k = Math.max(0, Math.floor((t - T.parts - 0.1) / 0.58)); if (k < PARTS.length) s.add(PARTS[k][0]); }
    if (t >= T.strokes && t < T.fast) {
      const k = Math.min(3, Math.floor((t - T.strokes) / SD)), u = t - T.strokes - k * SD;
      if (k === 0) s.add('valveIn'); if (k === 1) s.add('piston'); if (k === 3) s.add('valveEx');
      if (k === 2) s.add(u < 0.6 ? 'plug' : 'piston');
    }
    if (t >= T.wheels) s.add('crank');
    return s;
  }

  function drawEngine(t) {
    const a = deg(t), ph = ((a % 720) + 720) % 720;
    const idx = Math.round((((a % 360) + 360) % 360) / A.STEP) % A.N;
    if (idx !== R2.idx) { R2.mech.innerHTML = A.frames[idx]; R2.gas.setAttribute('d', A.gas[idx]); R2.idx = idx; R2.hlKey = null; }
    const cz = crownZ(a);
    R2.piston.setAttribute('transform', lift(cz));
    const lin = ph < 180 ? Math.sin(Math.PI * ph / 180) : 0, lex = ph >= 540 ? Math.sin(Math.PI * (ph - 540) / 180) : 0;
    R2.vIn.setAttribute('transform', lift(-lin * A.LIFT));
    R2.vEx.setAttribute('transform', lift(-lex * A.LIFT));
    let col = '#74C0FC', op = 0.35;
    if (ph < 180) { op = 0.25 + 0.2 * ph / 180; }
    else if (ph < 360) { const k = (ph - 180) / 180; col = k < 0.6 ? '#91A7FF' : '#FFC078'; op = 0.45 + 0.3 * k; }
    else if (ph < 540) { const k = (ph - 360) / 180; col = k < 0.35 ? '#FF922B' : '#F76707'; op = 0.85 - 0.45 * k; }
    else { col = '#868E96'; op = 0.5 - 0.25 * (ph - 540) / 180; }
    R2.gas.setAttribute('fill', col); R2.gas.setAttribute('opacity', op.toFixed(3));
    const burn = ph >= 360 && ph < 540 ? Math.exp(-(ph - 360) / 45) : 0;
    const midZ = (cz + A.DECK) / 2;
    R2.burn.setAttribute('cx', A.tip[0]); R2.burn.setAttribute('cy', (A.tip[1] + A.ZV[1] * (midZ - (A.DECK - 6))).toFixed(1));
    R2.burn.setAttribute('ry', (30 + Math.abs(A.ZV[1]) * (A.DECK - cz) * 0.6).toFixed(1));
    R2.burn.setAttribute('opacity', burn.toFixed(3));
    const spark = ph >= 350 && ph < 372 ? 1 : 0;
    R2.bolt.setAttribute('opacity', spark); R2.glow.setAttribute('opacity', Math.max(spark, burn * 0.8).toFixed(3));
    const s = highlightAt(t), key = [...s].join();
    if (key !== R2.hlKey) { hl = s; applyHL(); R2.hlKey = key; }
    R2.readout.textContent = `${Math.round(ph)}° · ${NAMES[Math.floor(ph / 180)]}`;
    R2.rpm.textContent = t >= T.fast ? 'عرض مبطّأ' : t >= T.strokes ? 'تصوير بطيء' : '';
    const pk = t >= T.parts + 0.1 && t < T.strokes - 0.2 ? Math.floor((t - T.parts - 0.1) / 0.58) : -1;
    R2.part.textContent = pk >= 0 && pk < PARTS.length ? PARTS[pk][1] : '';
    R2.part.style.opacity = pk >= 0 && pk < PARTS.length ? 1 : 0;
  }

  let tl;
  const wordsOf = (sel) => $$('.wi', $(sel));
  function textIn(sel, t, stagger = 0.05) { tl.fromTo(wordsOf(sel), { yPercent: 118, autoAlpha: 1 }, { yPercent: 0, duration: 0.5, ease: 'orinIn', stagger, immediateRender: false }, t); cue(t, 'cap'); }
  function textOut(sel, t) { const w = wordsOf(sel); tl.to(w, { yPercent: -125, duration: 0.24, ease: 'power3.in', stagger: 0.012 }, t); tl.set(w, { autoAlpha: 0, stagger: 0.012 }, t + 0.24); }
  const shakes = [];
  function shakeAt(t) { let x = 0, y = 0; for (const [t0, a] of shakes) { const d = t - t0; if (d < 0 || d > 0.4) continue; const e = Math.exp(-d / 0.1); x += a * e * Math.cos(2 * Math.PI * 12 * d); y -= 0.6 * a * e * Math.sin(2 * Math.PI * 12 * d); } return { x, y }; }

  function build() {
    gsap.config({ force3D: false });
    tl = gsap.timeline({ paused: true });
    gsap.set($$('.wi'), { yPercent: 118, autoAlpha: 0 });
    gsap.set(wordsOf('#c0'), { yPercent: 0, autoAlpha: 1 });
    const fx = A.cyl[0] * 930 / A.W, fy = A.cyl[1] * 1097 / A.H;
    gsap.set('#figWrap', { scale: 1, x: 0, y: 0, transformOrigin: `${fx}px ${fy}px` });
    tl.fromTo('#c0', { scale: 1.06 }, { scale: 1, duration: 0.6, ease: 'power2.out', immediateRender: false }, 0);
    textOut('#c0', 2.95);
    textIn('#c1', T.open); textOut('#c1', T.parts - 0.3);
    textIn('#cP', T.parts); textOut('#cP', T.strokes - 0.45);
    let prev = deg(0);
    for (let t = 1 / 240; t <= DURATION; t += 1 / 240) {
      const d = deg(t), k0 = Math.floor((prev - 360) / 720), k1 = Math.floor((d - 360) / 720);
      if (k1 > k0) { cue(t, 'fire', { slow: t > T.strokes && t < T.fast }); if (t < T.parts) shakes.push([t, 6]); }
      prev = d;
    }
    PARTS.forEach((_, k) => cue(T.parts + 0.1 + k * 0.58, 'label', { k }));
    tl.to('#figWrap', { scale: 1.22, y: 40, duration: 0.7, ease: 'power2.inOut' }, T.strokes - 0.5);
    gsap.set('#strip', { opacity: 0 });
    tl.to('#strip', { opacity: 1, duration: 0.3 }, T.strokes - 0.2);
    const spans = $$('#strip span');
    ['s1', 's2', 's3', 's4'].forEach((id, k) => {
      const t0 = T.strokes + k * SD;
      textIn('#' + id, t0 - 0.05, 0.035); textOut('#' + id, t0 + SD - 0.3);
      tl.set(spans, { className: '' }, t0 - 0.05); tl.set(spans[k], { className: 'on' }, t0 - 0.05);
      cue(t0, ['intake', 'compress', 'power', 'exhaust'][k], { until: t0 + SM });
    });
    const P = T.strokes + 2 * SD;
    tl.fromTo('#flash', { opacity: 0 }, { opacity: 0.5, duration: 0.05, immediateRender: false }, P + 0.02).to('#flash', { opacity: 0, duration: 0.5 }, P + 0.07);
    shakes.push([P + 0.02, 14]);
    tl.to('#strip', { opacity: 0, duration: 0.3 }, T.fast - 0.2);
    tl.to('#figWrap', { scale: 1, y: 0, duration: 0.7, ease: 'power2.inOut' }, T.fast - 0.2);
    textIn('#c5', T.fast + 0.05); cue(T.fast, 'rev', { until: T.wheels });
    textOut('#c5', T.wheels - 0.25); textIn('#c6', T.wheels); cue(T.wheels, 'end');
    const cx = A.crankAt[0] * 930 / A.W, cy = A.crankAt[1] * 1097 / A.H;
    tl.to('#figWrap', { scale: 1.18, x: (fx - cx) * 0.18, y: (fy - cy) * 1.18 * 0.5, duration: 1.2, ease: 'power2.inOut' }, T.wheels + 0.1);
    updaters.push((t) => drawEngine(t));
    const world = $('#world'), rig = $('#rig');
    updaters.push((t) => {
      const s = shakeAt(t);
      world.style.transform = s.x || s.y ? `translate(${s.x.toFixed(2)}px, ${s.y.toFixed(2)}px)` : '';
      const h = Cinema.handheld(t, { amp: 2, rotAmp: 0.08, seed: 7 });
      Cinema.applyCamera(rig, { x: h.x, y: h.y, rot: h.rot, scale: 1 });
    });
    tl.set({}, {}, DURATION);
  }

  let RAW = '', lastT = 0;
  function rebuild() { tl.kill(); updaters.length = 0; shakes.length = 0; cues.length = 0; $('#stage').innerHTML = RAW; prepDOM(); build(); cues.sort((a, b) => a.t - b.t); lastT = 0; }
  function seek(t) { t = clamp(t, 0, DURATION); if (t < lastT - 1e-6) rebuild(); lastT = t; tl.seek(t, false); for (const u of updaters) u(t); }
  const ready = (async () => {
    await Promise.all(['800 92px Alexandria', '600 48px Alexandria', '600 28px Outfit', '800 68px Outfit'].map((f) => document.fonts.load(f, 'گ 0123456789 …عربي')));
    await document.fonts.ready;
    RAW = $('#stage').innerHTML; prepDOM();
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    build(); cues.sort((a, b) => a.t - b.t); seek(0);
    return true;
  })();
  window.ORIN = { id: '', prefix: 'engine-anatomy', soundtrack: 'soundtrack_engine.py', ready, seek, cues, T, W, H, FPS, BPM, get duration() { return DURATION; } };

  if (RENDER) return;
  const stage = $('#stage');
  const fit = () => { const k = Math.min(innerWidth / W, (innerHeight - 64) / H); Object.assign(stage.style, { position: 'absolute', left: '50%', top: 'calc(50% - 26px)', transform: `translate(-50%, -50%) scale(${k})` }); };
  addEventListener('resize', fit); fit();
  let playing = true, cur = 0, last = null;
  $('#play').onclick = () => { playing = !playing; };
  $('#scrub').oninput = (e) => { cur = +e.target.value; seek(cur); };
  ready.then(() => { const loop = (now) => { if (last == null) last = now; if (playing) { cur = (cur + (now - last) / 1000) % DURATION; seek(cur); } $('#tlabel').textContent = cur.toFixed(2); last = now; requestAnimationFrame(loop); }; requestAnimationFrame(loop); });
})();
