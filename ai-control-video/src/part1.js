/* Part 1 · Cold open — deterministic composition; the timeline is laid out from the measured
   voice-over durations (src/vo-part1.js, written by vo/make_vo.py). 16:9. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const RENDER = new URLSearchParams(location.search).has('render');
  if (RENDER) document.body.classList.add('render');
  const W = 1920, H = 1080, FPS = 60, BPM = 100;
  // voice-over layout: [scene, gap before]
  const PLAN = [[1, 2.6], [1, 0.6], [2, 1.6], [2, 0.6], [2, 0.6], [3, 1.6], [3, 0.6], [3, 0.6], [4, 1.8], [4, 0.8]];
  const VO = []; let at = 0;
  PLAN.forEach(([sc, gap], i) => { const s = (i === 0 ? 0 : at) + gap; VO.push([s, window.VO_DUR[i], window.VO_TXT[i].replace(/\.\.\./g, '…'), sc]); at = s + window.VO_DUR[i]; });
  const L = (i) => VO[i][0], E = (i) => VO[i][0] + VO[i][1];
  const T = { s2: E(1) + 0.9, s3: E(4) + 0.9, s4: E(7) + 0.9 };
  T.title = E(9) + 0.25; T.end = T.title + 5.6;
  const DURATION = Math.round(T.end * 100) / 100;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const ease = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
  const outBack = (x) => { x = clamp(x); const c = 1.7; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const rnd = (i, k = 0) => { const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return s - Math.floor(s); };
  const span = (t, a, b) => clamp((t - a) / (b - a));
  const updaters = [], cues = [];
  const cue = (t, type, extra = {}) => cues.push({ t: Math.round(t * 1000) / 1000, type, ...extra });
  const INK = '#1E1B4B';

  const R = {};
  function prepDOM() {
    Cinema.installEases();
    const burst = Array.from({ length: 72 }, (_, i) => {
      const a = (i / 72) * Math.PI * 2 + rnd(i) * 0.05, r0 = 330 + rnd(i, 1) * 60, r1 = 620 + rnd(i, 2) * 520;
      const col = i % 5 === 0 ? '#FB7185' : i % 3 === 0 ? '#FBBF24' : '#FEF3C7';
      return `<line x1="${960 + Math.cos(a) * r0}" y1="${540 + Math.sin(a) * r0 * 0.62}" x2="${960 + Math.cos(a) * r1}" y2="${540 + Math.sin(a) * r1 * 0.62}" stroke="${col}" stroke-width="${3 + rnd(i, 3) * 7}" stroke-linecap="round"/>`;
    }).join('');
    const streaks = Array.from({ length: 90 }, (_, i) => {
      const a = (i / 90) * Math.PI * 2, r0 = 70 + rnd(i, 4) * 30, r1 = 150 + rnd(i, 5) * 55;
      return `<line x1="${Math.cos(a) * r0}" y1="${Math.sin(a) * r0}" x2="${Math.cos(a) * r1}" y2="${Math.sin(a) * r1}" stroke="${i % 4 ? '#9F1239' : '#FDE68A'}" stroke-width="${i % 4 ? 3 : 2}" stroke-linecap="round"/>`;
    }).join('');
    const agentIcon = (k) => [
      `<rect x="-62" y="-50" width="124" height="100" rx="18" fill="#2DD4BF" stroke="${INK}" stroke-width="8"/><text x="0" y="16" text-anchor="middle" font-family="DejaVu Sans Mono" font-weight="700" font-size="44" fill="${INK}">&lt;/&gt;</text>`,
      `<circle r="56" fill="#7DD3FC" stroke="${INK}" stroke-width="8"/><ellipse rx="24" ry="56" fill="none" stroke="${INK}" stroke-width="6"/><line x1="-56" y1="0" x2="56" y2="0" stroke="${INK}" stroke-width="6"/>`,
      `<rect x="-50" y="-62" width="100" height="124" rx="14" fill="#FEF3C7" stroke="${INK}" stroke-width="8"/>${[0, 1, 2].map((r) => `<path d="M-30,${-30 + r * 34} l10,10 l18,-20" fill="none" stroke="#16A34A" stroke-width="7" stroke-linecap="round"/><line x1="8" y1="${-26 + r * 34}" x2="34" y2="${-26 + r * 34}" stroke="${INK}" stroke-width="6"/>`).join('')}`,
    ][k];
    $('#eyeSvg').innerHTML = `<defs>
        <radialGradient id="glowBg" cx=".5" cy=".5" r=".6"><stop offset="0" stop-color="#FEF3C7" stop-opacity=".85"/><stop offset=".35" stop-color="#FBBF24" stop-opacity=".3"/><stop offset="1" stop-color="#1E1B4B" stop-opacity="0"/></radialGradient>
        <radialGradient id="sclera" cx=".5" cy=".5" r=".55"><stop offset=".55" stop-color="#FFFBEB"/><stop offset="1" stop-color="#FBCFE8"/></radialGradient>
        <radialGradient id="iris" cx=".5" cy=".5" r=".5"><stop offset=".25" stop-color="#FDE68A"/><stop offset=".65" stop-color="#FB923C"/><stop offset="1" stop-color="#E11D48"/></radialGradient>
        <clipPath id="eyeClip"><ellipse id="eyeOpen" cx="960" cy="540" rx="560" ry="0"/></clipPath></defs>
      <g id="eyeAll">
      <ellipse id="glow" cx="960" cy="540" rx="1100" ry="760" fill="url(#glowBg)" opacity="0"/>
      <g id="burst" style="transform-origin:960px 540px">${burst}</g>
      <g clip-path="url(#eyeClip)"><ellipse cx="960" cy="540" rx="560" ry="300" fill="url(#sclera)"/>
        <g id="iris" transform="translate(960 540)"><circle r="215" fill="url(#iris)" stroke="${INK}" stroke-width="10"/>${streaks}
          <ellipse id="pupil" rx="70" ry="160" fill="#0B0A1F"/><path id="glint" d="M0,-120 L0,120" stroke="#FB7185" stroke-width="6" stroke-linecap="round"/>
          <ellipse cx="-95" cy="-110" rx="46" ry="24" fill="#fff" opacity=".9" transform="rotate(-25 -95 -110)"/></g></g>
      <ellipse id="lidLine" cx="960" cy="540" rx="560" ry="0" fill="none" stroke="${INK}" stroke-width="14"/></g>
      <g id="agents">${[0, 1, 2].map((k) => `<g class="agent">${agentIcon(k)}</g>`).join('')}</g>`;
    $('#peopleSvg').innerHTML = [0, 1, 2].map((k) => `<g class="person" transform="translate(${660 + k * 300} 900)">
        <circle cx="0" cy="-130" r="44" fill="#FEF3C7" stroke="${INK}" stroke-width="8"/><path d="M-80,0 Q-80,-80 0,-80 Q80,-80 80,0 Z" fill="${['#2DD4BF', '#FBBF24', '#7DD3FC'][k]}" stroke="${INK}" stroke-width="8"/>
        <g transform="translate(70 -200)"><rect x="-38" y="-38" width="76" height="70" rx="20" fill="#FB7185" stroke="${INK}" stroke-width="7"/><text x="0" y="20" text-anchor="middle" font-family="Outfit" font-weight="900" font-size="54" fill="#fff">!</text></g></g>`).join('');
    $('#botSvg').innerHTML = `
      <rect x="0" y="760" width="1920" height="320" fill="#26215F"/><rect x="0" y="752" width="1920" height="12" fill="#4338CA"/>
      <g id="target"><rect x="760" y="742" width="190" height="14" rx="7" fill="#2DD4BF" opacity=".6"/></g>
      <g id="robot"><rect x="-80" y="-230" width="160" height="150" rx="34" fill="#E0E7FF" stroke="${INK}" stroke-width="8"/>
        <circle cx="-34" cy="-160" r="14" fill="${INK}"/><circle cx="34" cy="-160" r="14" fill="${INK}"/><line x1="0" y1="-230" x2="0" y2="-268" stroke="${INK}" stroke-width="8"/><circle cx="0" cy="-276" r="14" fill="#FBBF24" stroke="${INK}" stroke-width="6"/>
        <rect x="-100" y="-86" width="200" height="130" rx="26" fill="#A5B4FC" stroke="${INK}" stroke-width="8"/><rect x="-60" y="-56" width="120" height="16" rx="8" fill="#2DD4BF"/>
        <rect x="100" y="-60" width="70" height="26" rx="13" fill="#A5B4FC" stroke="${INK}" stroke-width="7"/>
        <circle cx="-56" cy="58" r="22" fill="${INK}"/><circle cx="56" cy="58" r="22" fill="${INK}"/></g>
      <g id="box"><rect x="0" y="-130" width="150" height="130" rx="10" fill="#FBBF24" stroke="${INK}" stroke-width="8"/><path d="M0,-90 H150 M75,-130 V-90" stroke="${INK}" stroke-width="6"/></g>
      <g id="bubble" style="transform-origin:420px 330px"><rect x="210" y="250" width="420" height="120" rx="60" fill="#FEF3C7" stroke="${INK}" stroke-width="8"/><path d="M380,368 L400,420 L440,368" fill="#FEF3C7" stroke="${INK}" stroke-width="8" stroke-linejoin="round"/>
        <text x="420" y="328" text-anchor="middle" font-family="Outfit" font-weight="800" font-size="46" fill="${INK}">MOVE THE BOX →</text></g>
      <g id="check" style="transform-origin:855px 470px"><circle cx="855" cy="470" r="62" fill="#22C55E" stroke="${INK}" stroke-width="8"/><path d="M825,472 L848,496 L890,446" fill="none" stroke="#fff" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/></g>
      <g id="arm" style="transform-origin:1240px 752px"><rect x="1170" y="700" width="140" height="56" rx="14" fill="#A5B4FC" stroke="${INK}" stroke-width="8"/>
        <g id="arm1" style="transform-origin:1240px 700px"><rect x="1222" y="470" width="36" height="240" rx="18" fill="#E0E7FF" stroke="${INK}" stroke-width="8"/><circle cx="1240" cy="700" r="24" fill="#FBBF24" stroke="${INK}" stroke-width="7"/>
          <g id="arm2" style="transform-origin:1240px 480px"><rect x="1222" y="300" width="34" height="190" rx="17" fill="#E0E7FF" stroke="${INK}" stroke-width="8"/><circle cx="1240" cy="480" r="20" fill="#FBBF24" stroke="${INK}" stroke-width="6"/><path d="M1220,300 l-14,-34 M1260,300 l14,-34" stroke="${INK}" stroke-width="10" stroke-linecap="round"/></g></g>
        <text id="armCount" x="1240" y="830" text-anchor="middle" font-family="Outfit" font-weight="800" font-size="44" fill="#FEF3C7">×1</text></g>
      <g id="calc" style="transform-origin:1640px 620px"><rect x="1500" y="380" width="280" height="380" rx="34" fill="#312E81" stroke="${INK}" stroke-width="8"/><rect x="1530" y="410" width="220" height="100" rx="14" fill="#BBF7D0" stroke="${INK}" stroke-width="6"/>
        <text id="calcTxt" x="1734" y="482" text-anchor="end" font-family="Outfit" font-weight="800" font-size="56" fill="${INK}">2 + 2</text>
        ${[0, 1, 2].map((r) => [0, 1, 2].map((c) => `<rect x="${1534 + c * 74}" y="${535 + r * 72}" width="60" height="56" rx="12" fill="${c === 2 ? '#FB7185' : '#A5B4FC'}" stroke="${INK}" stroke-width="5"/>`).join('')).join('')}</g>`;
    $('#fixPanel').innerHTML = ['speed = distance / time', 'if speed > limit:', '<span class="bad" id="badLine">    alarm = Fasle</span>', '    log(speed)'].join('\n');
    const nodes = Array.from({ length: 70 }, (_, i) => {
      const a = rnd(i, 7) * Math.PI * 2, r = Math.sqrt(rnd(i, 8));
      return { x: 1450 + Math.cos(a) * r * 330, y: 560 + Math.sin(a) * r * 250, t: rnd(i, 9) * 7.0 + r * 1.2 };
    });
    const edges = [];
    nodes.forEach((n, i) => nodes.forEach((m, j) => { if (j > i && Math.hypot(n.x - m.x, n.y - m.y) < 120 && rnd(i, j) < 0.55) edges.push([i, j]); }));
    R.nodes = nodes; R.edges = edges;
    $('#growSvg').innerHTML = `<line x1="960" y1="60" x2="960" y2="1020" stroke="#4338CA" stroke-width="6"/>
      <g id="net"><g id="edges">${edges.map(([i, j]) => `<line x1="${nodes[i].x}" y1="${nodes[i].y}" x2="${nodes[j].x}" y2="${nodes[j].y}" stroke="#2DD4BF" stroke-width="3" opacity="0"/>`).join('')}</g>
      <g id="nodes">${nodes.map((n) => `<circle cx="${n.x}" cy="${n.y}" r="${9 + rnd(n.x) * 6}" fill="#FEF3C7" stroke="#2DD4BF" stroke-width="4" opacity="0"/>`).join('')}</g></g>
      <g id="dots">${Array.from({ length: 27 }, (_, i) => `<g opacity="0"><rect x="-58" y="-22" width="116" height="44" rx="22" fill="${['#FBBF24', '#FB7185', '#7DD3FC'][i % 3]}" stroke="${INK}" stroke-width="5"/><text y="12" text-anchor="middle" font-family="Outfit" font-weight="800" font-size="26" fill="${INK}">${['TEXT', 'IMAGE', 'CODE'][i % 3]}</text></g>`).join('')}</g>
      <g id="fog" opacity="0"><ellipse cx="1440" cy="520" rx="210" ry="170" fill="#1E1B4B" opacity=".8"/>
        <text x="1440" y="585" text-anchor="middle" font-family="Outfit" font-weight="900" font-size="200" fill="#FB7185">?</text></g>`;
    R.matrixRows = Array.from({ length: 16 }, (_, r) => Array.from({ length: 7 }, (_, c) => { const v = (rnd(r * 7 + c, 13) * 4 - 2).toFixed(2); return (v[0] === '-' ? '' : ' ') + v; }).join('  '));
    $('#matrix').textContent = R.matrixRows.join('\n');
    R.codeLines = ['<span class="k">if</span> (temperature > 30) {', '  <span class="f">turnOn</span>(fan);', '} <span class="k">else</span> {', '  <span class="f">turnOff</span>(fan);', '}', '', '<span class="k">// every rule written by a person</span>'];
    R.codePlain = R.codeLines.map((l) => l.replace(/<[^>]+>/g, ''));
    $('#lineSvg').innerHTML = `<line id="redLine" x1="0" y1="560" x2="0" y2="560" stroke="#FB7185" stroke-width="10" stroke-linecap="round"/>`;
    Object.assign(R, { eyeOpen: $('#eyeOpen'), lidLine: $('#lidLine'), iris: $('#iris'), pupil: $('#pupil'), glint: $('#glint'), burst: $('#burst'), glow: $('#glow'), eyeAll: $('#eyeAll'),
      agents: $$('#agents .agent'), robot: $('#robot'), box: $('#box'), calcTxt: $('#calcTxt'), arm1: $('#arm1'), arm2: $('#arm2'), armCount: $('#armCount'), badLine: $('#badLine'),
      edgeEls: $$('#edges line'), nodeEls: $$('#nodes circle'), dotEls: $$('#dots > g'), net: $('#net'), code: $('#code'), redLine: $('#redLine'), sub: $('#sub') });
    Cinema.grain($('#grain'), 21, 0.07);
  }

  const eyeOpen = (t) => {
    if (t < T.s2) return ease(span(t, 0.3, 1.4)) * (1 - ease(span(t, T.s2 - 0.4, T.s2 - 0.05)));
    if (t >= T.s4) return ease(span(t, T.s4 + 0.2, T.s4 + 1.2));
    return 0;
  };
  function drawEye(t) {
    const o = eyeOpen(t);
    R.eyeOpen.setAttribute('ry', (300 * o).toFixed(2)); R.lidLine.setAttribute('ry', (300 * o).toFixed(2));
    R.lidLine.setAttribute('opacity', o > 0.01 ? 1 : 0);
    const narrow = t < T.s2 ? ease(span(t, 1.6, 3.4)) : ease(span(t, L(9), L(9) + 1.5));
    R.pupil.setAttribute('rx', (70 - 46 * narrow + 3 * Math.sin(t * 2.3)).toFixed(2)); R.glint.setAttribute('opacity', (narrow * 0.9).toFixed(2));
    R.iris.setAttribute('transform', `translate(${960 + Math.sin(t * 0.7) * 14} 540) scale(${(1 + 0.03 * Math.sin(t * 1.3)).toFixed(4)})`);
    const push = t < T.s2 ? 1 + 0.05 * span(t, 0, T.s2) : 1 + 0.1 * span(t, T.s4, T.title);
    R.burst.style.transform = `scale(${(0.6 + 0.4 * o) * push}) rotate(${(t * 1.5).toFixed(2)}deg)`;
    R.burst.style.opacity = o.toFixed(3);
    R.glow.setAttribute('opacity', (o * 0.9).toFixed(3));
    // S1 line 2: the eye moves up and shrinks to make room for the people; S4 line 8: it shrinks for the agents
    const up = t < T.s2 ? ease(span(t, L(1) - 0.2, L(1) + 0.6)) : ease(span(t, L(8) - 0.2, L(8) + 0.6)) * (1 - ease(span(t, L(9) - 0.3, L(9) + 0.4)));
    const k = 1 - 0.38 * up;
    R.eyeAll.setAttribute('transform', `translate(${960 * (1 - k)} ${540 * (1 - k) - 150 * up}) scale(${k.toFixed(4)})`);
    R.agents.forEach((g, i) => {
      const a = ease(span(t, L(8) + 0.4 + i * 0.5, L(8) + 0.9 + i * 0.5)) * (1 - ease(span(t, L(9) - 0.3, L(9) + 0.2)));
      const ang = (t - L(8)) * 0.5 + (i / 3) * Math.PI * 2;
      g.setAttribute('transform', `translate(${(960 + Math.cos(ang) * 520).toFixed(1)} ${(400 + Math.sin(ang) * 260 + 160).toFixed(1)}) scale(${outBack(a).toFixed(3)})`);
      g.setAttribute('opacity', clamp(a * 1.5).toFixed(2));
    });
  }
  function drawBot(t) {
    const t0 = L(2), mv = ease(span(t, t0 + 1.0, t0 + 2.8));
    const x = 280 + mv * 450, bob = Math.abs(Math.sin((t - t0) * 9)) * 6 * (mv > 0 && mv < 1 ? 1 : 0);
    R.robot.setAttribute('transform', `translate(${x} ${700 - bob})`);
    R.box.setAttribute('transform', `translate(${x + 110} 752)`);
    R.calcTxt.textContent = t >= L(3) + 1.4 ? '= 4' : '2 + 2';
    const s = Math.max(0, t - (L(3) + 2.4)), cyc = Math.sin(s * 5.2);
    R.arm1.style.transform = `rotate(${(cyc * 28).toFixed(2)}deg)`; R.arm2.style.transform = `rotate(${(-cyc * 40).toFixed(2)}deg)`;
    const n = Math.floor(Math.pow(10, Math.min(6, s * 1.6)));
    R.armCount.textContent = '×' + n.toLocaleString('en-US');
  }
  function drawGrow(t) {
    const t0 = T.s3;
    const typed = Math.floor(clamp((t - t0 - 0.3) / 3.4) * R.codePlain.join('\n').length);
    let left = typed; const html = [];
    R.codeLines.forEach((l, i) => { const plain = R.codePlain[i]; if (left <= 0) return; if (left >= plain.length) { html.push(l); left -= plain.length + 1; } else { html.push(plain.slice(0, left) + '▌'); left = 0; } });
    R.code.innerHTML = html.join('\n');
    const g0 = L(6);
    const on = R.nodes.map((n) => outBack(span(t, g0 + n.t, g0 + n.t + 0.4)));
    R.nodeEls.forEach((el, i) => { el.setAttribute('opacity', clamp(on[i] * 1.2).toFixed(2)); el.setAttribute('transform', `translate(${R.nodes[i].x * (1 - on[i])} ${R.nodes[i].y * (1 - on[i])}) scale(${on[i].toFixed(3)})`); });
    R.edgeEls.forEach((el, k) => { const [i, j] = R.edges[k]; el.setAttribute('opacity', (Math.min(on[i], on[j]) * 0.6).toFixed(2)); });
    R.dotEls.forEach((el, i) => {
      const p = ((t - g0) * 0.32 + i / R.dotEls.length) % 1, live = t > g0 && t < L(7) + 1.0;
      const y = 260 + rnd(i, 11) * 560;
      el.setAttribute('transform', `translate(${(1040 + p * 360).toFixed(1)} ${(y + (560 - y) * p * p).toFixed(1)}) scale(${(1 - 0.5 * p).toFixed(3)})`);
      el.setAttribute('opacity', live ? (Math.sin(p * Math.PI) * 0.95).toFixed(2) : 0);
    });
    const z = ease(span(t, L(7) + 0.3, L(7) + 1.6));
    R.net.setAttribute('transform', `translate(${(1440 * -z * 0.6).toFixed(1)} ${(560 * -z * 0.6).toFixed(1)}) scale(${(1 + 0.6 * z).toFixed(3)})`);
    R.net.setAttribute('opacity', (1 - 0.75 * z).toFixed(3));
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

  function build() {
    gsap.config({ force3D: false });
    tl = gsap.timeline({ paused: true });
    gsap.set('.scene', { opacity: 0 }); gsap.set('#fade', { opacity: 1 });
    gsap.set(['#title', '#chipPred', '#cardQ', '#fixPanel', '#matrix', '#chipNum'], { opacity: 0 });
    gsap.set(['#bubble', '#check', '#calc', '#arm', '.person'], { opacity: 0, scale: 0.3 });
    tl.to('#fade', { opacity: 0, duration: 0.6, ease: 'power1.out' }, 0);
    // S1
    scene('#sEye', 0, T.s2, 0.01, 0.05);
    tl.fromTo('#title', { opacity: 0, scale: 1.5 }, { opacity: 1, scale: 1, duration: 0.35, ease: 'power4.out', immediateRender: false }, 0.9);
    hide('#title', L(1) - 0.4);
    cue(0.9, 'slam'); shakes.push([0.9, 10]); cue(0.3, 'open', { until: 1.4 });
    $$('.person').forEach((p, k) => { pop(p, L(1) + 3.4 + k * 0.35); cue(L(1) + 3.4 + k * 0.35, 'pop'); });
    tl.to('.person', { opacity: 0, duration: 0.3 }, T.s2 - 0.7);
    cue(T.s2 - 0.4, 'blink');
    // S2
    scene('#sBot', T.s2, T.s3, 0.25, 0.35);
    pop('#bubble', L(2) + 0.2); cue(L(2) + 0.2, 'pop');
    hide('#bubble', L(2) + 3.0);
    cue(L(2) + 1.0, 'roll', { until: L(2) + 2.8 });
    pop('#check', L(2) + 2.95); cue(L(2) + 2.95, 'ding'); hide('#check', L(3) + 0.5);
    pop('#calc', L(3) + 0.2); cue(L(3) + 0.2, 'pop'); cue(L(3) + 1.4, 'beep');
    pop('#arm', L(3) + 2.2); cue(L(3) + 2.4, 'servo', { until: L(4) - 0.2 });
    tl.to(['#robot', '#box', '#calc', '#arm', '#target'], { opacity: 0.25, duration: 0.4 }, L(4) - 0.2);
    tl.fromTo('#fixPanel', { opacity: 0, y: 60 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out', immediateRender: false }, L(4));
    cue(L(4), 'whoosh');
    tl.fromTo('#badLine', { backgroundColor: 'rgba(251,113,133,0)' }, { backgroundColor: 'rgba(251,113,133,.45)', duration: 0.3, immediateRender: false }, L(4) + 2.0);
    cue(L(4) + 2.0, 'buzz');
    tl.set('#badLine', { textContent: '    alarm = True' }, L(4) + 3.6);
    tl.to('#badLine', { backgroundColor: 'rgba(34,197,94,.45)', duration: 0.3 }, L(4) + 3.6);
    cue(L(4) + 3.6, 'ding');
    pop('#chipPred', E(4) - 0.4, 0.6); cue(E(4) - 0.4, 'pop');
    cue(T.s3 - 0.35, 'whoosh');
    // S3
    scene('#sGrow', T.s3, T.s4, 0.35, 0.4);
    cue(T.s3 + 0.3, 'type', { until: T.s3 + 3.7 });
    cue(L(6), 'grow', { until: L(6) + 8.0 });
    pop('#chipNum', L(6) + 6.2, 0.6); cue(L(6) + 6.2, 'pop');
    hide('#chipNum', L(7) + 0.2);
    tl.fromTo('#matrix', { opacity: 0 }, { opacity: 1, duration: 0.8, immediateRender: false }, L(7) + 1.0);
    tl.fromTo('#fog', { opacity: 0, scale: 0.6, transformOrigin: '1440px 520px' }, { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(2)', immediateRender: false }, L(7) + 5.6);
    cue(L(7) + 5.6, 'hit');
    cue(T.s4 - 0.4, 'whoosh');
    // S4
    scene('#sEye', T.s4, T.title, 0.4, 0.4);
    cue(T.s4 + 0.2, 'open', { until: T.s4 + 1.2 });
    [0, 1, 2].forEach((i) => cue(L(8) + 0.4 + i * 0.5, 'pop'));
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
  window.ORIN = { id: 'part1', prefix: 'ai-control', soundtrack: 'soundtrack_part1.py', ready, seek, cues, T, VO, W, H, FPS, BPM, get duration() { return DURATION; } };

  if (RENDER) return;
  const stage = $('#stage');
  const fit = () => { const k = Math.min(innerWidth / W, (innerHeight - 64) / H); Object.assign(stage.style, { position: 'absolute', left: '50%', top: 'calc(50% - 26px)', transform: `translate(-50%, -50%) scale(${k})` }); };
  addEventListener('resize', fit); fit();
  let playing = true, cur = 0, last = null;
  $('#play').onclick = () => { playing = !playing; };
  $('#scrub').oninput = (e) => { cur = +e.target.value; seek(cur); };
  ready.then(() => { const loop = (now) => { if (last == null) last = now; if (playing) { cur = (cur + (now - last) / 1000) % DURATION; seek(cur); } $('#tlabel').textContent = cur.toFixed(2); last = now; requestAnimationFrame(loop); }; requestAnimationFrame(loop); });
})();
