/* Ad v3 · "the mystery box": a scroll-stopping question, the problem on a phone, the box (Anatomy kit)
   bursts open and only then reveals the offer. Motion personality: Energetic (motion-design skill). */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const RENDER = new URLSearchParams(location.search).has('render');
  if (RENDER) document.body.classList.add('render');
  const W = 1080, H = 1920, DURATION = 20.5, FPS = 60, BPM = 120;
  const T = { hook: 0, prob: 3.0, reveal: 7.5, burst: 8.6, offer: 12.0, cta: 16.0 };
  const B = window.BOX3;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const span = (t, a, b) => clamp((t - a) / (b - a));
  const updaters = [], cues = [];
  const cue = (t, type, extra = {}) => cues.push({ t: Math.round(t * 1000) / 1000, type, ...extra });
  const R = {};

  function prepDOM() {
    Cinema.installEases();
    CustomEase.create('expoOut', 'M0,0 C0.16,1 0.3,1 1,1');           // energetic entrance (ease-out-expo)
    $('#stage').classList.add('iso'); $('#stage').dataset.theme = 'dark';
    if (!$('#isoCss')) document.head.insertAdjacentHTML('beforeend', `<style id="isoCss">${window.ISO_CSS}</style>`);
    const [mx, my] = B.top;
    $('#boxSvg').setAttribute('viewBox', `0 0 ${B.W} ${B.H}`);
    $('#boxSvg').innerHTML = `<defs><radialGradient id="beamG" cx=".5" cy="1" r="1"><stop offset="0" stop-color="#FFF" stop-opacity=".95"/><stop offset=".3" stop-color="#FF2E88" stop-opacity=".7"/><stop offset="1" stop-color="#8B5CF6" stop-opacity="0"/></radialGradient></defs>
      <g id="boxBody">${B.body}</g>
      <path id="mouthGlow" d="${B.mouth}" fill="#FF2E88" opacity="0" style="mix-blend-mode:screen"/>
      <path id="beam" d="M ${mx - 210},${my} L ${mx - 420},${my - 1100} L ${mx + 420},${my - 1100} L ${mx + 210},${my} Z" fill="url(#beamG)" opacity="0" style="mix-blend-mode:screen"/>
      <ellipse id="seam" cx="${mx}" cy="${my}" rx="200" ry="22" fill="#FF2E88" opacity="0" style="mix-blend-mode:screen;filter:blur(8px)"/>
      <g id="lid">${B.lid}</g>`;
    $('#rays').innerHTML = Array.from({ length: 28 }, (_, i) => { const a = i / 28 * Math.PI * 2; return `<path d="M540,1100 L${540 + Math.cos(a - 0.05) * 1500},${1100 + Math.sin(a - 0.05) * 1500} L${540 + Math.cos(a + 0.05) * 1500},${1100 + Math.sin(a + 0.05) * 1500} Z" fill="${i % 2 ? '#8B5CF6' : '#FF2E88'}" opacity=".12"/>`; }).join('');
    Object.assign(R, { lid: $('#lid'), seam: $('#seam'), beam: $('#beam'), mouthGlow: $('#mouthGlow'), boxWrap: $('#boxWrap'), rays: $('#rays') });
    // fit every line to the safe width (measured with the real font)
    $$('.ln').forEach((el) => { let fs = parseFloat(el.style.fontSize); el.style.display = 'block'; while (el.scrollWidth > 960 && fs > 30) { fs -= 2; el.style.fontSize = fs + 'px'; } });
    Cinema.grain($('#grain'), 31, 0.1);
  }

  // box: knocks in the hook, a rumble before the burst, the lid flies off at T.burst
  const knocks = [0.45, 1.25, 2.05, T.reveal + 0.4, T.reveal + 0.75];
  function drawBox(t) {
    let jx = 0, jy = 0;
    for (const k0 of knocks) { const d = t - k0; if (d >= 0 && d < 0.35) { const e = Math.exp(-d / 0.07); jx += 14 * e * Math.sin(d * 90); jy -= 22 * e; } }
    const rumble = span(t, T.reveal + 0.9, T.burst) * (t < T.burst ? 1 : 0);
    jx += rumble * 9 * Math.sin(t * 83); jy += rumble * 5 * Math.sin(t * 71);
    const fly = span(t, T.burst, T.burst + 0.7), lift = 1100 * (1 - Math.pow(1 - fly, 3));
    R.lid.setAttribute('transform', `translate(${(B.ZV[0] * 0 + (t > T.burst ? 120 * fly : 0)).toFixed(1)} ${(B.ZV[1] * lift - jy * (t < T.burst ? 0.5 : 0)).toFixed(1)}) rotate(${(t > T.burst ? 35 * fly : 0).toFixed(2)} ${B.top[0]} ${B.top[1]})`);
    R.lid.setAttribute('opacity', (1 - span(t, T.burst + 0.35, T.burst + 0.7)).toFixed(3));
    R.boxWrap.style.transform = `translate(${jx.toFixed(2)}px, ${jy.toFixed(2)}px)`;
    const leak = t < T.prob ? 0.35 + 0.35 * Math.abs(Math.sin(t * 4)) : t < T.burst ? 0.5 + 0.5 * rumble : 0;
    R.seam.setAttribute('opacity', leak.toFixed(3));
    const open = span(t, T.burst, T.burst + 0.25);
    R.beam.setAttribute('opacity', (open * (0.85 + 0.15 * Math.sin(t * 7))).toFixed(3));
    R.mouthGlow.setAttribute('opacity', (open * 0.8).toFixed(3));
    R.rays.style.transform = `rotate(${(t * 6).toFixed(2)}deg)`; R.rays.style.transformOrigin = '540px 1100px';
  }

  let tl;
  const shakes = [];
  const shakeAt = (t) => { let x = 0, y = 0; for (const [t0, a] of shakes) { const d = t - t0; if (d < 0 || d > 0.4) continue; const e = Math.exp(-d / 0.09); x += a * e * Math.cos(2 * Math.PI * 13 * d); y += a * 0.7 * e * Math.sin(2 * Math.PI * 13 * d); } return { x, y }; };
  // Energetic: 160–240 ms entrances with an expo-out landing; exits faster (ease-in)
  const slam = (sel, t, size = 'mid', sh = 8) => { tl.fromTo(sel, { opacity: 0, scale: 1.7 }, { opacity: 1, scale: 1, duration: 0.2, ease: 'expoOut', immediateRender: false }, t); cue(t, 'slam', { size }); shakes.push([t, sh]); };
  const pop = (sel, t, xPct = false) => { tl.fromTo(sel, { opacity: 0, scale: 0.4, ...(xPct ? { xPercent: -50 } : {}) }, { opacity: 1, scale: 1, duration: 0.24, ease: 'back.out(2.6)', immediateRender: false }, t); cue(t, 'pop'); };
  const out = (sel, t) => tl.to(sel, { opacity: 0, scale: 0.85, duration: 0.14, ease: 'power3.in' }, t);

  function build() {
    gsap.config({ force3D: false });
    tl = gsap.timeline({ paused: true });
    gsap.set(['.ln', '.chip', '.perk', '.btn', '#price', '#phone', '#wm', '.lock'], { opacity: 0 });
    gsap.set(['.chip', '.perk', '.ln:not(#o2)'], { xPercent: -50, x: 0 });
    gsap.set('#boxWrap', { opacity: 1, y: 0, scale: 1 });
    gsap.set('#rays', { opacity: 0 });
    // ── hook (0–3 s): the question + a box that knocks
    slam('#h1', 0.05, 'big', 10); slam('#h2', 0.8, 'big', 8);
    tl.fromTo('#h3', { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.24, ease: 'expoOut', immediateRender: false }, 1.9); cue(1.9, 'pop');
    knocks.slice(0, 3).forEach((k0) => cue(k0, 'knock'));
    out(['#h1', '#h2', '#h3'], T.prob - 0.16);
    // ── problem (3–7.5 s): your video on a phone
    tl.to('#boxWrap', { y: 900, opacity: 0, duration: 0.25, ease: 'power3.in' }, T.prob - 0.2); cue(T.prob - 0.2, 'whoosh');
    tl.fromTo('#phone', { opacity: 0, y: 300, rotation: -6 }, { opacity: 1, y: 0, rotation: 0, duration: 0.3, ease: 'expoOut', immediateRender: false }, T.prob);
    slam('#p1', T.prob + 0.15, 'mid', 6);
    tl.fromTo('#wm', { opacity: 0, scale: 1.8 }, { opacity: 1, scale: 1.3, duration: 0.22, ease: 'expoOut', immediateRender: false }, T.prob + 0.9); cue(T.prob + 0.9, 'stamp');
    slam('#p2', T.prob + 0.9, 'mid', 5);
    $$('.lock').forEach((el, i) => { tl.fromTo(el, { opacity: 0, scale: 2 }, { opacity: 1, scale: 1, duration: 0.16, ease: 'expoOut', immediateRender: false }, T.prob + 1.9 + i * 0.12); cue(T.prob + 1.9 + i * 0.12, 'lock'); });
    tl.to('#phone', { x: -14, duration: 0.05, yoyo: true, repeat: 5, ease: 'none' }, T.prob + 2.4);
    slam('#p3', T.prob + 3.0, 'mid', 6);
    out(['#p1', '#p2', '#p3'], T.reveal - 0.16);
    tl.to('#phone', { y: 1200, opacity: 0, duration: 0.25, ease: 'power3.in' }, T.reveal - 0.2); cue(T.reveal - 0.2, 'whoosh');
    // ── reveal (7.5–12 s): the box comes back, bursts, and only now says what it is
    tl.fromTo('#boxWrap', { y: 900, opacity: 0 }, { y: 120, opacity: 1, duration: 0.3, ease: 'expoOut', immediateRender: false }, T.reveal);
    slam('#r0', T.reveal + 0.2, 'mid', 6);
    knocks.slice(3).forEach((k0) => cue(k0, 'knock'));
    cue(T.reveal + 0.9, 'rise', { until: T.burst });
    out('#r0', T.burst - 0.1);
    tl.fromTo('#flash', { opacity: 0 }, { opacity: 0.85, duration: 0.04, immediateRender: false }, T.burst).to('#flash', { opacity: 0, duration: 0.4 }, T.burst + 0.05);
    cue(T.burst, 'drop'); shakes.push([T.burst, 22]);
    tl.to('#rays', { opacity: 1, duration: 0.3 }, T.burst);
    ['#c0', '#c1', '#c2'].forEach((s, i) => { tl.fromTo(s, { opacity: 0, y: 500, scale: 0.4 }, { opacity: 1, y: 0, scale: 1, duration: 0.3, ease: 'back.out(2.2)', immediateRender: false }, T.burst + 0.25 + i * 0.12); cue(T.burst + 0.25 + i * 0.12, 'pop'); });
    slam('#r1', T.burst + 1.1, 'big', 12);
    out(['#c0', '#c1', '#c2', '#r1'], T.offer - 0.16);
    tl.to('#boxWrap', { scale: 0.6, y: 1300, opacity: 0, duration: 0.25, ease: 'power3.in' }, T.offer - 0.2);
    tl.to('#rays', { opacity: 0.5, duration: 0.3 }, T.offer);
    // ── offer (12–16 s)
    slam('#o1', T.offer + 0.05, 'mid', 6);
    tl.fromTo('#price', { opacity: 0, scale: 2.2 }, { opacity: 1, scale: 1, duration: 0.22, ease: 'expoOut', immediateRender: false }, T.offer + 0.6); cue(T.offer + 0.6, 'price'); shakes.push([T.offer + 0.6, 16]);
    gsap.set('#o2', { opacity: 1 });
    ['#k0', '#k1', '#k2'].forEach((s, i) => pop(s, T.offer + 1.8 + i * 0.5));
    out(['#o1', '#price', '#k0', '#k1', '#k2'], T.cta - 0.16);
    // ── CTA (16–20.5 s)
    slam('#t1', T.cta + 0.05, 'big', 8);
    tl.fromTo('#wa', { opacity: 0, x: 600 }, { opacity: 1, x: 0, duration: 0.26, ease: 'expoOut', immediateRender: false }, T.cta + 0.6); cue(T.cta + 0.6, 'btn');
    tl.fromTo('#ig', { opacity: 0, x: -600 }, { opacity: 1, x: 0, duration: 0.26, ease: 'expoOut', immediateRender: false }, T.cta + 0.9); cue(T.cta + 0.9, 'btn');
    [1.6, 2.6, 3.6].forEach((d) => { tl.to(['#wa', '#ig'], { scale: 1.06, duration: 0.12, yoyo: true, repeat: 1, ease: 'power2.out' }, T.cta + d); cue(T.cta + d, 'pulse'); });
    tl.fromTo('#t2', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.3, ease: 'expoOut', immediateRender: false }, T.cta + 1.4);
    updaters.push(drawBox);
    const world = $('#world'), rig = $('#rig');
    updaters.push((t) => {
      const s = shakeAt(t);
      world.style.transform = s.x || s.y ? `translate(${s.x.toFixed(2)}px, ${s.y.toFixed(2)}px)` : '';
      const h = Cinema.handheld(t, { amp: 3, rotAmp: 0.1, seed: 9 });
      Cinema.applyCamera(rig, { x: h.x, y: h.y, rot: h.rot, scale: 1 });
    });
    tl.set({}, {}, DURATION);
  }

  let RAW = '', lastT = 0;
  function rebuild() { tl.kill(); updaters.length = 0; shakes.length = 0; cues.length = 0; $('#stage').innerHTML = RAW; prepDOM(); build(); cues.sort((a, b) => a.t - b.t); lastT = 0; }
  function seek(t) { t = clamp(t, 0, DURATION); if (t < lastT - 1e-6) rebuild(); lastT = t; tl.seek(t, false); for (const u of updaters) u(t); }
  const ready = (async () => {
    await Promise.all(['900 128px Alexandria', '800 50px Alexandria', '900 560px Outfit'].map((f) => document.fonts.load(f, 'گ 0123456789 …عربي')));
    await document.fonts.ready;
    RAW = $('#stage').innerHTML; prepDOM();
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    build(); cues.sort((a, b) => a.t - b.t); seek(0);
    return true;
  })();
  window.ORIN = { id: 'v3', prefix: 'capcut-ad', soundtrack: 'soundtrack_capcut3.py', ready, seek, cues, T, W, H, FPS, BPM, get duration() { return DURATION; } };

  if (RENDER) return;
  const stage = $('#stage');
  const fit = () => { const k = Math.min(innerWidth / W, (innerHeight - 64) / H); Object.assign(stage.style, { position: 'absolute', left: '50%', top: 'calc(50% - 26px)', transform: `translate(-50%, -50%) scale(${k})` }); };
  addEventListener('resize', fit); fit();
  let playing = true, cur = 0, last = null;
  $('#play').onclick = () => { playing = !playing; };
  $('#scrub').oninput = (e) => { cur = +e.target.value; seek(cur); };
  ready.then(() => { const loop = (now) => { if (last == null) last = now; if (playing) { cur = (cur + (now - last) / 1000) % DURATION; seek(cur); } $('#tlabel').textContent = cur.toFixed(2); last = now; requestAnimationFrame(loop); }; requestAnimationFrame(loop); });
})();
