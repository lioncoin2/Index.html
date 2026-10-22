/* Part 2 · What "the line" means — layout from measured VO (src/vo-part2.js). 16:9. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const RENDER = new URLSearchParams(location.search).has('render');
  if (RENDER) document.body.classList.add('render');
  const W = 1920, H = 1080, FPS = 60, BPM = 100, INK = '#1E1B4B';
  const PLAN = [[0, 1.8], [1, 1.4], [1, 0.6], [1, 0.6], [1, 0.6], [2, 1.4], [2, 0.6], [3, 1.4], [3, 0.6], [4, 1.4]];
  const VO = []; let at = 0;
  PLAN.forEach(([sc, gap], i) => { const s = at + gap; VO.push([s, window.VO_DUR[i], window.VO_TXT[i].replace(/\.\.\./g, '…'), sc]); at = s + window.VO_DUR[i]; });
  const L = (i) => VO[i][0], E = (i) => VO[i][0] + VO[i][1];
  const T = { s1: L(1) - 0.8, s2: L(5) - 0.8, s3: L(7) - 0.8, s4: L(9) - 0.8 };
  T.end = E(9) + 2.4;
  const DURATION = Math.round(T.end * 100) / 100;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const ease = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
  const span = (t, a, b) => clamp((t - a) / (b - a));
  const updaters = [], cues = [];
  const cue = (t, type, extra = {}) => cues.push({ t: Math.round(t * 1000) / 1000, type, ...extra });
  const R = {};

  function robot(scale = 1) {
    return `<g transform="scale(${scale})"><rect x="-80" y="-230" width="160" height="150" rx="34" fill="#E0E7FF" stroke="${INK}" stroke-width="8"/>
      <circle cx="-34" cy="-160" r="14" fill="${INK}"/><circle cx="34" cy="-160" r="14" fill="${INK}"/><line x1="0" y1="-230" x2="0" y2="-268" stroke="${INK}" stroke-width="8"/><circle cx="0" cy="-276" r="14" fill="#FBBF24" stroke="${INK}" stroke-width="6"/>
      <rect x="-100" y="-86" width="200" height="130" rx="26" fill="#A5B4FC" stroke="${INK}" stroke-width="8"/><rect x="-60" y="-56" width="120" height="16" rx="8" fill="#2DD4BF"/></g>`;
  }
  function dial(cx, cy, col) {
    const ticks = Array.from({ length: 13 }, (_, i) => { const a = (-120 + i * 20) * Math.PI / 180; return `<line x1="${cx + Math.sin(a) * 230}" y1="${cy - Math.cos(a) * 230}" x2="${cx + Math.sin(a) * (i % 3 ? 205 : 185)}" y2="${cy - Math.cos(a) * (i % 3 ? 205 : 185)}" stroke="#FEF3C7" stroke-width="${i % 3 ? 5 : 9}" stroke-linecap="round"/>`; }).join('');
    return `<circle cx="${cx}" cy="${cy}" r="260" fill="#0F0D2E" stroke="${INK}" stroke-width="10"/><circle cx="${cx}" cy="${cy}" r="250" fill="none" stroke="${col}" stroke-width="10" opacity=".5"/>${ticks}
      <g class="needle"><path d="M ${cx - 14},${cy} L ${cx},${cy - 210} L ${cx + 14},${cy} Z" fill="${col}" stroke="${INK}" stroke-width="5"/></g><circle cx="${cx}" cy="${cy}" r="26" fill="${col}" stroke="${INK}" stroke-width="7"/>`;
  }

  function prepDOM() {
    Cinema.installEases();
    $('#chapSvg').innerHTML = `<g transform="translate(960 230)"><g id="clap"><rect x="-120" y="-50" width="240" height="150" rx="14" fill="#FEF3C7" stroke="${INK}" stroke-width="8"/><path d="M-120,-50 L120,-50 L110,-110 L-130,-110 Z" fill="#1E1B4B" stroke="#FEF3C7" stroke-width="6"/>
      <text x="0" y="50" text-anchor="middle" font-family="Outfit" font-weight="900" font-size="46" fill="${INK}">MOVIES</text><path id="clapX" d="M-150,-130 L150,120 M150,-130 L-150,120" stroke="#FB7185" stroke-width="18" stroke-linecap="round" opacity="0"/></g></g>`;
    const rails = `<rect x="370" y="120" width="26" height="800" rx="13" fill="#A5B4FC" stroke="${INK}" stroke-width="6"/><rect x="770" y="120" width="26" height="800" rx="13" fill="#A5B4FC" stroke="${INK}" stroke-width="6"/>`;
    const rungs = [860, 660, 460, 260].map((y, i) => `<rect class="rung" x="380" y="${y}" width="410" height="24" rx="12" fill="${i === 3 ? '#FB7185' : '#FEF3C7'}" stroke="${INK}" stroke-width="6"/>`).join('');
    $('#ladderSvg').innerHTML = `${rails}${rungs}<g id="climber">${robot(0.7)}</g>`;
    $('#noEyeSvg').innerHTML = `<g id="noEye" transform="translate(1380 760)" opacity="0"><ellipse rx="110" ry="60" fill="#FEF3C7" stroke="${INK}" stroke-width="8"/><circle r="36" fill="${INK}"/><line x1="-120" y1="-80" x2="120" y2="80" stroke="#FB7185" stroke-width="18" stroke-linecap="round"/></g>`;
    $('#dialSvg').innerHTML = `${dial(460, 520, '#FBBF24')}${dial(1460, 520, '#2DD4BF')}
      <g id="gap" opacity="0"><path d="M 760,520 L 1160,520" stroke="#FB7185" stroke-width="12" stroke-dasharray="20 16"/><path d="M 760,520 l 34,-24 M 760,520 l 34,24 M 1160,520 l -34,-24 M 1160,520 l -34,24" stroke="#FB7185" stroke-width="12" stroke-linecap="round"/>
        <text x="960" y="490" text-anchor="middle" font-family="Outfit" font-weight="900" font-size="64" fill="#FB7185">THE GAP</text></g>`;
    const dash = Array.from({ length: 12 }, (_, i) => `<rect class="dash" x="${i * 180}" y="905" width="100" height="14" rx="7" fill="#FEF3C7" opacity=".6"/>`).join('');
    const wheel = (x) => `<g transform="translate(${x} 840)"><circle r="78" fill="${INK}"/><circle r="40" fill="#A5B4FC" stroke="${INK}" stroke-width="6"/><g class="spokes">${[0, 60, 120].map((a) => `<rect x="-6" y="-40" width="12" height="80" fill="${INK}" transform="rotate(${a})"/>`).join('')}</g></g>`;
    $('#carSvg').innerHTML = `<rect x="0" y="880" width="1920" height="200" fill="#26215F"/>${dash}
      <g id="car" style="transform-box:view-box;transform-origin:960px 840px">
        <g id="flame" style="transform-box:view-box;transform-origin:470px 790px"><path d="M 470,770 L 300,790 L 470,810 Z" fill="#FB7185"/><path d="M 470,778 L 360,790 L 470,802 Z" fill="#FDE68A"/></g>
        <path d="M 470,840 L 470,700 Q 480,650 560,640 L 760,630 Q 840,520 1000,520 L 1180,520 Q 1270,530 1320,640 L 1430,660 Q 1480,670 1480,740 L 1480,840 Z" fill="#FB7185" stroke="${INK}" stroke-width="10" stroke-linejoin="round"/>
        <path d="M 800,630 Q 860,550 990,550 L 1160,550 Q 1230,555 1260,630 Z" fill="#7DD3FC" stroke="${INK}" stroke-width="8"/>
        ${wheel(650)}${wheel(1300)}
        <g id="engine" style="transform-box:view-box;transform-origin:1390px 700px"><rect x="1330" y="660" width="120" height="80" rx="12" fill="#FBBF24" stroke="${INK}" stroke-width="7"/><path d="M1350,660 v-22 M1390,660 v-22 M1430,660 v-22" stroke="${INK}" stroke-width="10" stroke-linecap="round"/></g>
        <g transform="translate(1080 600)"><circle r="44" fill="none" stroke="#2DD4BF" stroke-width="14"/><circle r="10" fill="#2DD4BF"/></g></g>
      <g id="tagEngine" opacity="0"><rect x="1270" y="330" width="380" height="96" rx="48" fill="#FBBF24" stroke="${INK}" stroke-width="7"/><text id="tagEngineTxt" x="1460" y="395" text-anchor="middle" font-family="Outfit" font-weight="900" font-size="46" fill="${INK}">ENGINE ×1</text></g>
      <g id="tagSteer" opacity="0"><rect x="760" y="330" width="440" height="96" rx="48" fill="#2DD4BF" stroke="${INK}" stroke-width="7"/><text x="980" y="395" text-anchor="middle" font-family="Outfit" font-weight="900" font-size="42" fill="${INK}">STEERING ×1</text></g>
      <g id="warn" transform="translate(460 300)" opacity="0"><path d="M0,-110 L120,100 L-120,100 Z" fill="#FBBF24" stroke="${INK}" stroke-width="10" stroke-linejoin="round"/><text y="80" text-anchor="middle" font-family="Outfit" font-weight="900" font-size="140" fill="${INK}">!</text></g>`;
    $('#vennSvg').innerHTML = `<line id="vline" x1="200" y1="660" x2="200" y2="660" stroke="#FB7185" stroke-width="12" stroke-linecap="round"/>`;
    Object.assign(R, { climber: $('#climber'), rungLbls: [0, 1, 2, 3].map((i) => $('#r' + i)), tasks: $$('.task'), needles: $$('#dialSvg .needle'), car: $('#car'), dashes: $$('.dash'), spokes: $$('.spokes'),
      flame: $('#flame'), engine: $('#engine'), tagEngineTxt: $('#tagEngineTxt'), sub: $('#sub') });
    Cinema.grain($('#grain'), 22, 0.07);
  }

  function drawLadder(t) {
    const step = [L(1) + 0.5, L(2) + 0.3, L(3) + 0.3];
    let y = 860 - 10, lvl = -1;
    step.forEach((s, i) => { const k = ease(span(t, s, s + 0.9)); if (k > 0) lvl = i; y -= k * (i === 0 ? 0 : 200); });
    const top = ease(span(t, L(4) + 4.6, L(4) + 5.6));
    y -= top * 60;
    R.climber.setAttribute('transform', `translate(583 ${y.toFixed(1)})`);
    R.rungLbls.forEach((el, i) => { el.style.opacity = (i === lvl ? 1 : i === 3 ? 0.55 + 0.45 * Math.abs(Math.sin(t * 3)) * top : 0.35).toFixed(2); });
    R.tasks.forEach((el, i) => { el.style.opacity = (0.25 + 0.75 * ease(span(t, L(4) + 0.3 + i * 0.75, L(4) + 0.6 + i * 0.75))).toFixed(2); });
  }
  function drawDials(t) {
    const cap = -100 + 50 * ease(span(t, L(5) + 0.5, L(6) + 1.2)) + 150 * ease(span(t, L(6) + 2.6, L(6) + 5.2)) + 2 * Math.sin(t * 9) * span(t, L(6) + 4, L(6) + 5);
    const ctl = -100 + 40 * ease(span(t, L(5) + 0.5, L(6) + 1.2)) + 15 * ease(span(t, L(6) + 2.6, L(6) + 5.2));
    R.needles[0].setAttribute('transform', `rotate(${cap.toFixed(2)} 460 520)`);
    R.needles[1].setAttribute('transform', `rotate(${ctl.toFixed(2)} 1460 520)`);
  }
  function drawCar(t) {
    const t0 = T.s3, v = 300 + 1200 * ease(span(t, L(7) + 0.5, L(7) + 4.5));
    const pos = (t - t0) * 300 + 900 * Math.max(0, t - L(7) - 0.5) * span(t, L(7) + 0.5, L(7) + 4.5);
    R.dashes.forEach((d, i) => d.setAttribute('x', ((((i * 180 - pos) % 2160) + 2160) % 2160 - 180).toFixed(1)));
    R.spokes.forEach((s) => s.setAttribute('transform', `rotate(${(-pos * 0.7).toFixed(1)})`));
    const g = ease(span(t, L(7) + 0.5, L(7) + 4.5));
    R.engine.style.transform = `scale(${(1 + 0.6 * g).toFixed(3)})`;
    R.flame.style.transform = `scaleX(${(0.6 + 1.8 * g + 0.25 * Math.sin(t * 30)).toFixed(3)})`;
    R.tagEngineTxt.textContent = 'ENGINE ×' + Math.max(1, Math.round(Math.pow(10, 2 * g))).toLocaleString('en-US');
    const wob = ease(span(t, L(8) + 0.5, L(8) + 1.5));
    R.car.style.transform = `rotate(${(wob * 3 * Math.sin(t * 7)).toFixed(3)}deg) translateY(${(-Math.abs(Math.sin(t * 14)) * 4 * (v / 1500)).toFixed(2)}px)`;
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
  const pop = (sel, t, from = 0.3) => tl.fromTo(sel, { opacity: 0, scale: from }, { opacity: 1, scale: 1, duration: 0.45, ease: 'back.out(2.2)', immediateRender: false }, t);
  const hide = (sel, t) => tl.to(sel, { opacity: 0, duration: 0.3 }, t);
  const cardIn = (sel, t) => tl.fromTo(sel, { opacity: 0, x: 80 }, { opacity: 1, x: 0, duration: 0.5, ease: 'power3.out', immediateRender: false }, t);

  function build() {
    gsap.config({ force3D: false });
    tl = gsap.timeline({ paused: true });
    gsap.set('.scene', { opacity: 0 }); gsap.set('#fade', { opacity: 1 });
    gsap.set(['.card', '#gap', '#tagEngine', '#tagSteer', '#warn', '.vcard', '#lineTag', '#noEye'], { opacity: 0 });
    tl.to('#fade', { opacity: 0, duration: 0.5 }, 0);
    // chapter card
    scene('#sChap', 0, T.s1, 0.01, 0.4);
    tl.fromTo('#chap', { opacity: 0, scale: 1.4 }, { opacity: 1, scale: 1, duration: 0.4, ease: 'power4.out', immediateRender: false }, 0.4);
    cue(0.4, 'slam'); shakes.push([0.4, 8]);
    tl.fromTo('#clap', { opacity: 0, y: -60 }, { opacity: 1, y: 0, duration: 0.4, ease: 'back.out(2)', immediateRender: false }, L(0) + 2.6);
    cue(L(0) + 2.6, 'pop');
    tl.fromTo('#clapX', { opacity: 0 }, { opacity: 1, duration: 0.15, immediateRender: false }, L(0) + 3.6); cue(L(0) + 3.6, 'buzz');
    // ladder
    scene('#sLadder', T.s1, T.s2);
    [L(1) + 0.5, L(2) + 0.3, L(3) + 0.3].forEach((s) => cue(s, 'climb', { until: s + 0.9 }));
    cardIn('#cTool', L(1) + 4.2); cue(L(1) + 4.2, 'whoosh'); hide('#cTool', L(2) - 0.2);
    cardIn('#cAsk', L(2) + 1.0); cue(L(2) + 1.0, 'whoosh'); hide('#cAsk', L(3) - 0.2);
    cardIn('#cAgent', L(3) + 1.4); cue(L(3) + 1.4, 'whoosh');
    [0, 1, 2, 3, 4].forEach((i) => cue(L(4) + 0.45 + i * 0.75, 'tick'));
    pop('#noEye', L(4) + 4.2); cue(L(4) + 4.2, 'buzz');
    cue(L(4) + 4.6, 'rise', { until: L(4) + 5.6 });
    // dials
    scene('#sDials', T.s2, T.s3);
    cue(L(6) + 2.6, 'rev', { until: L(6) + 5.2 });
    pop('#gap', L(6) + 5.0, 0.6); cue(L(6) + 5.0, 'hit');
    // car
    scene('#sCar', T.s3, T.s4);
    cue(L(7) + 0.5, 'engine', { until: E(8) });
    pop('#tagEngine', L(7) + 1.2, 0.6); cue(L(7) + 1.2, 'pop');
    pop('#tagSteer', L(7) + 3.2, 0.6); cue(L(7) + 3.2, 'pop');
    pop('#warn', L(8) + 2.3); cue(L(8) + 2.3, 'buzz');
    // venn
    scene('#sVenn', T.s4, null);
    [2.1, 2.9, 3.8].forEach((d, i) => { pop('#v' + i, L(9) + d, 0.5); cue(L(9) + d, 'pop'); });
    tl.to('#v0', { x: 160, duration: 0.7, ease: 'power3.inOut' }, L(9) + 5.4);
    tl.to('#v2', { x: -160, duration: 0.7, ease: 'power3.inOut' }, L(9) + 5.4);
    tl.fromTo('#vline', { attr: { x2: 200 } }, { attr: { x2: 1720 }, duration: 0.8, ease: 'power3.inOut', immediateRender: false }, L(9) + 6.0);
    cue(L(9) + 6.0, 'line');
    tl.fromTo('#lineTag', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out', immediateRender: false }, L(9) + 6.6);
    cue(L(9) + 6.6, 'slam'); shakes.push([L(9) + 6.6, 6]);
    tl.to('#fade', { opacity: 1, duration: 0.8 }, T.end - 0.8);
    VO.forEach(([s], i) => cue(s, 'vo', { i }));
    updaters.push(drawLadder, drawDials, drawCar, drawSub);
    const world = $('#world'), rig = $('#rig');
    updaters.push((t) => {
      const s = shakeAt(t);
      world.style.transform = s.x || s.y ? `translate(${s.x.toFixed(2)}px, ${s.y.toFixed(2)}px)` : '';
      const h = Cinema.handheld(t, { amp: 3, rotAmp: 0.08, seed: 4 });
      Cinema.applyCamera(rig, { x: h.x, y: h.y, rot: h.rot, scale: 1 });
    });
    tl.set({}, {}, DURATION);
  }

  let RAW = '', lastT = 0;
  function rebuild() { tl.kill(); updaters.length = 0; shakes.length = 0; cues.length = 0; $('#stage').innerHTML = RAW; prepDOM(); build(); cues.sort((a, b) => a.t - b.t); lastT = 0; }
  function seek(t) { t = clamp(t, 0, DURATION); if (t < lastT - 1e-6) rebuild(); lastT = t; tl.seek(t, false); for (const u of updaters) u(t); }
  const ready = (async () => {
    await Promise.all(['900 120px Outfit', '600 40px Outfit'].map((f) => document.fonts.load(f, 'AaZz09?')));
    await document.fonts.ready;
    RAW = $('#stage').innerHTML; prepDOM();
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    build(); cues.sort((a, b) => a.t - b.t); seek(0);
    return true;
  })();
  window.ORIN = { id: 'part2', prefix: 'ai-control', soundtrack: 'soundtrack_part2.py', ready, seek, cues, T, VO, W, H, FPS, BPM, get duration() { return DURATION; } };

  if (RENDER) return;
  const stage = $('#stage');
  const fit = () => { const k = Math.min(innerWidth / W, (innerHeight - 64) / H); Object.assign(stage.style, { position: 'absolute', left: '50%', top: 'calc(50% - 26px)', transform: `translate(-50%, -50%) scale(${k})` }); };
  addEventListener('resize', fit); fit();
  let playing = true, cur = 0, last = null;
  $('#play').onclick = () => { playing = !playing; };
  $('#scrub').oninput = (e) => { cur = +e.target.value; seek(cur); };
  ready.then(() => { const loop = (now) => { if (last == null) last = now; if (playing) { cur = (cur + (now - last) / 1000) % DURATION; seek(cur); } $('#tlabel').textContent = cur.toFixed(2); last = now; requestAnimationFrame(loop); }; requestAnimationFrame(loop); });
})();
