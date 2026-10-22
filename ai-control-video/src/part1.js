/* Part 1 · Cold open — deterministic composition (seek(t) drives everything). 16:9, 40 s. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const RENDER = new URLSearchParams(location.search).has('render');
  if (RENDER) document.body.classList.add('render');
  const W = 1920, H = 1080, DURATION = 40, FPS = 60, BPM = 100;
  const T = { open: 0, vo1: 2.6, s2: 9.0, vo2: 10.0, s3: 18.6, vo3: 19.6, s4: 29.0, vo4: 30.2, title: 34.4, end: 40 };
  const VO = [ // durations measured from vo/part1/lines.json
    [T.vo1, 5.48, "Imagine building something smarter than you… and then realising you can't switch it off."],
    [T.vo2, 6.61, 'For most of history, machines did exactly what we told them. A calculator never surprised anyone.'],
    [T.vo3, 7.47, 'Modern AI is different. Nobody writes its rules. We grow it from data… and we only partly understand what grows.'],
    [T.vo4, 3.75, 'So, did we cross a line? And if we did… what now?'],
  ];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const ease = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
  const outBack = (x) => { x = clamp(x); const c = 1.7; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const rnd = (i, k = 0) => { const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return s - Math.floor(s); };
  const span = (t, a, b) => clamp((t - a) / (b - a));
  const NS = 'http://www.w3.org/2000/svg';
  const updaters = [], cues = [];
  const cue = (t, type, extra = {}) => cues.push({ t: Math.round(t * 1000) / 1000, type, ...extra });

  const R = {};
  function prepDOM() {
    Cinema.installEases();
    // ── eye ──
    const burst = Array.from({ length: 72 }, (_, i) => {
      const a = (i / 72) * Math.PI * 2 + rnd(i) * 0.05, r0 = 330 + rnd(i, 1) * 60, r1 = 620 + rnd(i, 2) * 520;
      const col = i % 5 === 0 ? '#FF2E4D' : i % 3 === 0 ? '#0B1026' : '#FFF4E0';
      return `<line x1="${960 + Math.cos(a) * r0}" y1="${540 + Math.sin(a) * r0 * 0.62}" x2="${960 + Math.cos(a) * r1}" y2="${540 + Math.sin(a) * r1 * 0.62}" stroke="${col}" stroke-width="${3 + rnd(i, 3) * 7}" stroke-linecap="round"/>`;
    }).join('');
    const streaks = Array.from({ length: 90 }, (_, i) => {
      const a = (i / 90) * Math.PI * 2, r0 = 70 + rnd(i, 4) * 30, r1 = 150 + rnd(i, 5) * 55;
      return `<line x1="${Math.cos(a) * r0}" y1="${Math.sin(a) * r0}" x2="${Math.cos(a) * r1}" y2="${Math.sin(a) * r1}" stroke="${i % 4 ? '#7A1E0E' : '#FFD08A'}" stroke-width="${i % 4 ? 3 : 2}" stroke-linecap="round"/>`;
    }).join('');
    $('#eyeSvg').innerHTML = `<defs>
        <radialGradient id="glowBg" cx=".5" cy=".5" r=".6"><stop offset="0" stop-color="#FFF4E0" stop-opacity=".9"/><stop offset=".35" stop-color="#FF6B35" stop-opacity=".35"/><stop offset="1" stop-color="#0B1026" stop-opacity="0"/></radialGradient>
        <radialGradient id="sclera" cx=".5" cy=".5" r=".55"><stop offset=".55" stop-color="#FFF8EE"/><stop offset="1" stop-color="#F2B5A8"/></radialGradient>
        <radialGradient id="iris" cx=".5" cy=".5" r=".5"><stop offset=".25" stop-color="#FFB703"/><stop offset=".7" stop-color="#FF6B35"/><stop offset="1" stop-color="#C1121F"/></radialGradient>
        <clipPath id="eyeClip"><ellipse id="eyeOpen" cx="960" cy="540" rx="560" ry="0"/></clipPath></defs>
      <ellipse id="glow" cx="960" cy="540" rx="1100" ry="760" fill="url(#glowBg)" opacity="0"/>
      <g id="burst" style="transform-origin:960px 540px">${burst}</g>
      <g clip-path="url(#eyeClip)"><ellipse cx="960" cy="540" rx="560" ry="300" fill="url(#sclera)"/>
        <g id="iris" transform="translate(960 540)"><circle r="215" fill="url(#iris)" stroke="#0B1026" stroke-width="10"/>${streaks}
          <ellipse id="pupil" rx="70" ry="160" fill="#05060C"/><path id="glint" d="M0,-120 L0,120" stroke="#FF2E4D" stroke-width="6" stroke-linecap="round"/>
          <ellipse cx="-95" cy="-110" rx="46" ry="24" fill="#fff" opacity=".9" transform="rotate(-25 -95 -110)"/></g></g>
      <ellipse id="lidLine" cx="960" cy="540" rx="560" ry="0" fill="none" stroke="#0B1026" stroke-width="14"/>`;
    // ── robot desk ──
    $('#botSvg').innerHTML = `
      <rect x="0" y="760" width="1920" height="320" fill="#141A3A"/><rect x="0" y="752" width="1920" height="12" fill="#232B57"/>
      <g id="target"><rect x="1080" y="742" width="190" height="14" rx="7" fill="#5CE1FF" opacity=".5"/></g>
      <g id="robot"><rect x="-80" y="-230" width="160" height="150" rx="34" fill="#E6ECFF" stroke="#0B1026" stroke-width="8"/>
        <circle cx="-34" cy="-160" r="14" fill="#0B1026"/><circle cx="34" cy="-160" r="14" fill="#0B1026"/><line x1="0" y1="-230" x2="0" y2="-268" stroke="#0B1026" stroke-width="8"/><circle cx="0" cy="-276" r="14" fill="#FF6B35" stroke="#0B1026" stroke-width="6"/>
        <rect x="-100" y="-86" width="200" height="130" rx="26" fill="#C7D2FF" stroke="#0B1026" stroke-width="8"/><rect x="-60" y="-56" width="120" height="16" rx="8" fill="#5CE1FF"/>
        <rect x="100" y="-60" width="70" height="26" rx="13" fill="#C7D2FF" stroke="#0B1026" stroke-width="7"/>
        <circle cx="-56" cy="58" r="22" fill="#0B1026"/><circle cx="56" cy="58" r="22" fill="#0B1026"/></g>
      <g id="box"><rect x="0" y="-130" width="150" height="130" rx="10" fill="#E9A23B" stroke="#0B1026" stroke-width="8"/><path d="M0,-90 H150 M75,-130 V-90" stroke="#0B1026" stroke-width="6"/></g>
      <g id="bubble" style="transform-origin:640px 330px"><rect x="430" y="250" width="420" height="120" rx="60" fill="#FFF4E0" stroke="#0B1026" stroke-width="8"/><path d="M600,368 L620,420 L660,368" fill="#FFF4E0" stroke="#0B1026" stroke-width="8" stroke-linejoin="round"/>
        <text x="640" y="328" text-anchor="middle" font-family="Outfit" font-weight="800" font-size="46" fill="#0B1026">MOVE THE BOX →</text></g>
      <g id="check" style="transform-origin:1175px 470px"><circle cx="1175" cy="470" r="62" fill="#2ECC71" stroke="#0B1026" stroke-width="8"/><path d="M1145,472 L1168,496 L1210,446" fill="none" stroke="#fff" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/></g>
      <g id="calc" style="transform-origin:1600px 620px"><rect x="1460" y="380" width="280" height="380" rx="34" fill="#2B3266" stroke="#0B1026" stroke-width="8"/><rect x="1490" y="410" width="220" height="100" rx="14" fill="#B8F2C4" stroke="#0B1026" stroke-width="6"/>
        <text id="calcTxt" x="1694" y="482" text-anchor="end" font-family="Outfit" font-weight="800" font-size="56" fill="#0B1026">2 + 2</text>
        ${[0, 1, 2].map((r) => [0, 1, 2].map((c) => `<rect x="${1494 + c * 74}" y="${535 + r * 72}" width="60" height="56" rx="12" fill="${c === 2 ? '#FF6B35' : '#C7D2FF'}" stroke="#0B1026" stroke-width="5"/>`).join('')).join('')}</g>`;
    // ── written vs grown ──
    const nodes = Array.from({ length: 70 }, (_, i) => {
      const a = rnd(i, 7) * Math.PI * 2, r = Math.sqrt(rnd(i, 8));
      return { x: 1450 + Math.cos(a) * r * 330, y: 580 + Math.sin(a) * r * 260, t: 0.8 + rnd(i, 9) * 5.6 + r * 0.6 };
    });
    const edges = [];
    nodes.forEach((n, i) => nodes.forEach((m, j) => { if (j > i && Math.hypot(n.x - m.x, n.y - m.y) < 120 && rnd(i, j) < 0.55) edges.push([i, j]); }));
    R.nodes = nodes; R.edges = edges;
    $('#growSvg').innerHTML = `<line x1="960" y1="60" x2="960" y2="1020" stroke="#232B57" stroke-width="6"/>
      <g id="edges">${edges.map(([i, j]) => `<line x1="${nodes[i].x}" y1="${nodes[i].y}" x2="${nodes[j].x}" y2="${nodes[j].y}" stroke="#5CE1FF" stroke-width="3" opacity="0"/>`).join('')}</g>
      <g id="nodes">${nodes.map((n) => `<circle cx="${n.x}" cy="${n.y}" r="${9 + rnd(n.x) * 6}" fill="#FFF4E0" stroke="#5CE1FF" stroke-width="4" opacity="0"/>`).join('')}</g>
      <g id="dots">${Array.from({ length: 26 }, () => '<circle r="7" fill="#FF6B35" opacity="0"/>').join('')}</g>
      <g id="fog" opacity="0"><ellipse cx="1560" cy="520" rx="170" ry="140" fill="#0B1026" opacity=".75"/>
        <text x="1560" y="580" text-anchor="middle" font-family="Outfit" font-weight="900" font-size="180" fill="#FF2E4D">?</text></g>`;
    R.codeLines = ['<span class="k">if</span> (temperature > 30) {', '  <span class="f">turnOn</span>(fan);', '} <span class="k">else</span> {', '  <span class="f">turnOff</span>(fan);', '}', '', '<span class="k">// every rule written by a person</span>'];
    R.codePlain = R.codeLines.map((l) => l.replace(/<[^>]+>/g, ''));
    $('#lineSvg').innerHTML = `<line id="redLine" x1="0" y1="560" x2="0" y2="560" stroke="#FF2E4D" stroke-width="10" stroke-linecap="round"/>`;
    Object.assign(R, { eyeOpen: $('#eyeOpen'), lidLine: $('#lidLine'), iris: $('#iris'), pupil: $('#pupil'), glint: $('#glint'), burst: $('#burst'), glow: $('#glow'), robot: $('#robot'), box: $('#box'), calcTxt: $('#calcTxt'),
      edgeEls: $$('#edges line'), nodeEls: $$('#nodes circle'), dotEls: $$('#dots circle'), fog: $('#fog'), code: $('#code'), redLine: $('#redLine'), sub: $('#sub') });
    Cinema.grain($('#grain'), 21, 0.08);
  }

  // eye openness 0..1 over the film
  const eyeOpen = (t) => {
    if (t < T.s2) return ease(span(t, 0.3, 1.4)) * (1 - ease(span(t, T.s2 - 0.4, T.s2 - 0.05)));
    if (t >= T.s4) return ease(span(t, T.s4 + 0.2, T.s4 + 1.2));
    return 0;
  };
  function drawEye(t) {
    const o = eyeOpen(t);
    R.eyeOpen.setAttribute('ry', (300 * o).toFixed(2)); R.lidLine.setAttribute('ry', (300 * o).toFixed(2));
    R.lidLine.setAttribute('opacity', o > 0.01 ? 1 : 0);
    const narrow = t < T.s2 ? ease(span(t, 1.6, 3.4)) : ease(span(t, T.vo4, T.vo4 + 1.5));
    const pw = 70 - 46 * narrow + 3 * Math.sin(t * 2.3);
    R.pupil.setAttribute('rx', pw.toFixed(2)); R.glint.setAttribute('opacity', (narrow * 0.9).toFixed(2));
    const look = Math.sin(t * 0.7) * 14;
    const push = t < T.s2 ? 1 + 0.06 * span(t, 0, T.s2) : 1 + 0.12 * span(t, T.s4, T.title);
    R.iris.setAttribute('transform', `translate(${960 + look} 540) scale(${(1 + 0.03 * Math.sin(t * 1.3)).toFixed(4)})`);
    R.burst.style.transform = `scale(${(0.6 + 0.4 * o) * push}) rotate(${(t * 1.5).toFixed(2)}deg)`;
    R.burst.style.opacity = o.toFixed(3);
    R.glow.setAttribute('opacity', (o * 0.9).toFixed(3));
  }
  function drawBot(t) {
    const t0 = T.s2, mv = ease(span(t, t0 + 1.4, t0 + 3.2));
    const x = 560 + mv * 470, bob = Math.abs(Math.sin((t - t0) * 9)) * 6 * (mv > 0 && mv < 1 ? 1 : 0);
    R.robot.setAttribute('transform', `translate(${x} ${700 - bob})`);
    R.box.setAttribute('transform', `translate(${x + 140 - 30} 752)`);
    R.calcTxt.textContent = t >= t0 + 6.0 ? '= 4' : '2 + 2';
  }
  function drawGrow(t) {
    const t0 = T.s3;
    const typed = Math.floor(clamp((t - t0 - 0.3) / 3.6) * R.codePlain.join('\n').length);
    let left = typed, html = [];
    R.codeLines.forEach((l, i) => { const plain = R.codePlain[i]; if (left <= 0) return; if (left >= plain.length) { html.push(l); left -= plain.length + 1; } else { html.push(plain.slice(0, left) + '▌'); left = 0; } });
    R.code.innerHTML = html.join('\n');
    const on = R.nodes.map((n) => outBack(span(t, t0 + n.t, t0 + n.t + 0.4)));
    R.nodeEls.forEach((el, i) => { el.setAttribute('opacity', clamp(on[i] * 1.2).toFixed(2)); el.setAttribute('transform', `translate(${R.nodes[i].x * (1 - on[i])} ${R.nodes[i].y * (1 - on[i])}) scale(${on[i].toFixed(3)})`); });
    R.edgeEls.forEach((el, k) => { const [i, j] = R.edges[k]; el.setAttribute('opacity', (Math.min(on[i], on[j]) * 0.6).toFixed(2)); });
    R.dotEls.forEach((el, i) => {
      const p = ((t - t0) * 0.45 + i / R.dotEls.length) % 1, live = t > t0 + 0.6 && t < T.s4 - 0.4;
      const y = 300 + rnd(i, 11) * 520;
      el.setAttribute('cx', (980 + p * 380).toFixed(1)); el.setAttribute('cy', (y + (580 - y) * p * p).toFixed(1));
      el.setAttribute('opacity', live ? (Math.sin(p * Math.PI) * 0.9).toFixed(2) : 0);
    });
  }
  function drawSub(t) {
    const line = VO.find(([s, d]) => t >= s && t < s + d + 0.3);
    const txt = line ? line[2] : '';
    if (R.sub.textContent !== txt) R.sub.textContent = txt;
  }

  let tl;
  const shakes = [];
  const shakeAt = (t) => { let x = 0, y = 0; for (const [t0, a] of shakes) { const d = t - t0; if (d < 0 || d > 0.5) continue; const e = Math.exp(-d / 0.12); x += a * e * Math.cos(2 * Math.PI * 10 * d); y += a * 0.6 * e * Math.sin(2 * Math.PI * 10 * d); } return { x, y }; };
  function scene(sel, a, b, fin = 0.35, fout = 0.35) {
    tl.fromTo(sel, { opacity: 0 }, { opacity: 1, duration: fin, ease: 'power2.out', immediateRender: false }, a);
    if (b != null) tl.to(sel, { opacity: 0, duration: fout, ease: 'power2.in' }, b - fout);
  }
  function pop(sel, t, from = 0.3) { tl.fromTo(sel, { opacity: 0, scale: from }, { opacity: 1, scale: 1, duration: 0.45, ease: 'back.out(2.2)', immediateRender: false }, t); }

  function build() {
    gsap.config({ force3D: false });
    tl = gsap.timeline({ paused: true });
    gsap.set('.scene', { opacity: 0 }); gsap.set('#fade', { opacity: 1 });
    gsap.set(['#title', '#chipPred', '#cardQ'], { opacity: 0 });
    gsap.set(['#bubble', '#check', '#calc'], { opacity: 0, scale: 0.3 });
    tl.to('#fade', { opacity: 0, duration: 0.6, ease: 'power1.out' }, 0);
    // S1 eye
    scene('#sEye', 0, T.s2, 0.01, 0.05);
    tl.fromTo('#title', { opacity: 0, scale: 1.5 }, { opacity: 1, scale: 1, duration: 0.35, ease: 'power4.out', immediateRender: false }, 0.9);
    tl.to('#title', { opacity: 0, y: -40, duration: 0.5, ease: 'power2.in' }, T.vo1 + 1.2);
    cue(0.9, 'slam'); shakes.push([0.9, 10]); cue(0.3, 'open', { until: 1.4 });
    cue(T.s2 - 0.4, 'blink');
    // S2 robot
    scene('#sBot', T.s2, T.s3, 0.25, 0.35);
    pop('#bubble', T.s2 + 0.6); cue(T.s2 + 0.6, 'pop');
    tl.to('#bubble', { opacity: 0, duration: 0.3 }, T.s2 + 3.4);
    cue(T.s2 + 1.4, 'roll', { until: T.s2 + 3.2 });
    pop('#check', T.s2 + 3.35); cue(T.s2 + 3.35, 'ding');
    tl.to('#check', { opacity: 0, duration: 0.3 }, T.s2 + 5.0);
    pop('#calc', T.s2 + 4.2); cue(T.s2 + 4.2, 'pop');
    cue(T.s2 + 6.0, 'beep');
    pop('#chipPred', T.s2 + 6.5, 0.6); cue(T.s2 + 6.5, 'pop');
    cue(T.s3 - 0.35, 'whoosh');
    // S3 written vs grown
    scene('#sGrow', T.s3, T.s4, 0.35, 0.4);
    cue(T.s3 + 0.3, 'type', { until: T.s3 + 3.9 });
    cue(T.s3 + 1.0, 'grow', { until: T.s3 + 7.6 });
    tl.fromTo('#fog', { opacity: 0, scale: 0.6, transformOrigin: '1560px 520px' }, { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(2)', immediateRender: false }, T.vo3 + 5.0);
    cue(T.vo3 + 5.0, 'hit');
    cue(T.s4 - 0.4, 'whoosh');
    // S4 eye again, then the line
    scene('#sEye', T.s4, T.title, 0.4, 0.4);
    cue(T.s4 + 0.2, 'open', { until: T.s4 + 1.2 });
    scene('#sCard', T.title - 0.1, null, 0.2);
    tl.fromTo('#redLine', { attr: { x2: 0 } }, { attr: { x2: 1920 }, duration: 1.0, ease: 'power3.inOut', immediateRender: false }, T.title);
    cue(T.title, 'line');
    tl.fromTo('#cardQ', { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out', immediateRender: false }, T.title + 0.7);
    cue(T.title + 0.7, 'slam'); shakes.push([T.title + 0.7, 6]);
    tl.to('#fade', { opacity: 1, duration: 0.8, ease: 'power1.in' }, T.end - 0.8);
    VO.forEach(([s], i) => cue(s, 'vo', { i }));
    updaters.push(drawEye, drawBot, drawGrow, drawSub);
    const world = $('#world'), rig = $('#rig');
    updaters.push((t) => {
      const s = shakeAt(t);
      world.style.transform = s.x || s.y ? `translate(${s.x.toFixed(2)}px, ${s.y.toFixed(2)}px)` : '';
      const h = Cinema.handheld(t, { amp: 3, rotAmp: 0.08, seed: 3 });
      Cinema.applyCamera(rig, { x: h.x, y: h.y, rot: h.rot, scale: 1 });
    });
    tl.set({}, {}, DURATION);
  }

  let RAW = '', lastT = 0;
  function rebuild() { tl.kill(); updaters.length = 0; shakes.length = 0; cues.length = 0; $('#stage').innerHTML = RAW; prepDOM(); build(); cues.sort((a, b) => a.t - b.t); lastT = 0; }
  function seek(t) { t = clamp(t, 0, DURATION); if (t < lastT - 1e-6) rebuild(); lastT = t; tl.seek(t, false); for (const u of updaters) u(t); }
  const ready = (async () => {
    await Promise.all(['900 120px Outfit', '600 40px Outfit', '500 36px "DejaVu Sans Mono"'].map((f) => document.fonts.load(f, 'AaZz09?')));
    await document.fonts.ready;
    RAW = $('#stage').innerHTML; prepDOM();
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    build(); cues.sort((a, b) => a.t - b.t); seek(0);
    return true;
  })();
  window.ORIN = { id: 'part1', prefix: 'ai-control', soundtrack: 'soundtrack_part1.py', ready, seek, cues, T, W, H, FPS, BPM, get duration() { return DURATION; } };

  if (RENDER) return;
  const stage = $('#stage');
  const fit = () => { const k = Math.min(innerWidth / W, (innerHeight - 64) / H); Object.assign(stage.style, { position: 'absolute', left: '50%', top: 'calc(50% - 26px)', transform: `translate(-50%, -50%) scale(${k})` }); };
  addEventListener('resize', fit); fit();
  let playing = true, cur = 0, last = null;
  $('#play').onclick = () => { playing = !playing; };
  $('#scrub').oninput = (e) => { cur = +e.target.value; seek(cur); };
  ready.then(() => { const loop = (now) => { if (last == null) last = now; if (playing) { cur = (cur + (now - last) / 1000) % DURATION; seek(cur); } $('#tlabel').textContent = cur.toFixed(2); last = now; requestAnimationFrame(loop); }; requestAnimationFrame(loop); });
})();
