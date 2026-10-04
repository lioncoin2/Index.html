/*
 * حساب كاب كات برو — ad v2 (1080×1920, 22s, Iraqi dialect, VO-ready). Kinetic typography on a
 * 120 BPM grid: every word slams on a beat, backgrounds flip black / lime / white on the cuts.
 *
 *   0.0–3.0    hook ("don't buy before you watch this"): "لا تشترك" (up at frame 0) → "بكاب كات برو"
 *              → 🚫 → "گبل ما تشوف هذا" → 👀, and the camera dives through the eyes
 *   3.0–6.0    the reveal (lime flip): "حساب كاب كات / برو 👑 / جاهز" → a giant "6 آلاف" → "بس!"
 *   6.0–11.0   "بدون برو؟" علامة مائية / أدوات مقفولة, each struck through; "ويا حسابنا ✅": a
 *              video frame, a lime swipe wipes its watermark away → "برو 👑", "بلا علامة مائية"
 *   11.0–15.0  one perk per two beats: 💳 بلا فيزا · ⚡ تسليم فوري · 🛡️ مضمون شهر كامل · 📱 لجهاز واحد
 *   15.0–17.0  "شهر كامل / 6 آلاف" with marquee bands
 *   17.0–22.0  "اطلبه هسة 👇" — واتساب / انستغرام
 * Name in Arabic, no official logo. Engine conventions as orin-ad (deterministic seek, one owner
 * per transform, no layer promotion, rebuild on backward seeks).
 */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const RENDER = new URLSearchParams(location.search).has('render');
  if (RENDER) document.body.classList.add('render');

  const W = 1080, H = 1920, DURATION = 22.0, FPS = 60, BPM = 120;
  const T = { hook: 0, look: 2.0, reveal: 3.0, price: 4.5, nopro: 6.0, demo: 8.0, perks: 11.0, recap: 15.0, cta: 17.0 };
  const VO = [
    [0.00, 1.90, 'لا تشترك بكاب كات برو…'],
    [2.00, 2.90, 'گبل ما تشوف هذا!'],
    [3.00, 4.40, 'حساب كاب كات برو جاهز…'],
    [4.50, 5.90, 'بستة آلاف بس!'],
    [6.00, 7.90, 'بدون برو: علامة مائية… وأدوات مقفولة.'],
    [8.00, 10.90, 'ويا حسابنا: كلشي مفتوح… وبلا علامة مائية.'],
    [11.00, 14.90, 'بلا فيزا، تسليم فوري، مضمون شهر كامل… لجهاز واحد.'],
    [15.00, 16.90, 'شهر كامل بستة آلاف!'],
    [17.00, 19.50, 'اطلبه هسة من الواتساب أو الانستغرام.'],
  ];
  T.vo = VO.map(([a, b, line]) => ({ t0: a, t1: b, line }));
  const INK = '#0A0A0A', LIME = '#D4FF00', WHITE = '#FFFFFF';

  const cues = [];
  const cue = (t, type, extra = {}) => cues.push({ t: Math.round(t * 1000) / 1000, type, ...extra });
  const updaters = [];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  /* ── the sample video frame (flat, bold): sunset over water, two palms ── */
  function artSVG(id) {
    const palm = (x, lean, s) => {
      const top = { x: x + lean, y: 560 - 60 * (s - 1) };
      const leaves = [-150, -110, -60, -20, 25, 70].map((a) => `<path d="M 0,0 C 50,-46 120,-46 170,-4 C 120,-24 52,-20 0,0 Z" transform="translate(${top.x},${top.y}) rotate(${a}) scale(${s})" fill="#120826"/>`).join('');
      return `<path d="M ${x},960 C ${x + lean * 0.2},820 ${x + lean * 0.6},680 ${top.x},${top.y}" fill="none" stroke="#120826" stroke-width="${24 * s}" stroke-linecap="round"/>${leaves}`;
    };
    return `<defs><linearGradient id="sky${id}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#FF8A4C"/><stop offset=".42" stop-color="#FF3E7F"/><stop offset=".62" stop-color="#7A2CD8"/><stop offset="1" stop-color="#2A1458"/>
      </linearGradient></defs>
      <rect width="760" height="960" fill="url(#sky${id})"/>
      <circle cx="380" cy="500" r="150" fill="#FFD27A"/>
      <rect y="620" width="760" height="340" fill="#2A1458"/>
      ${[650, 690, 732, 780].map((y, i) => `<rect x="${290 - i * 10}" y="${y}" width="${180 + i * 20}" height="12" rx="6" fill="#FFD27A" opacity="${0.7 - i * 0.14}"/>`).join('')}
      ${palm(110, 70, 1.1)}${palm(650, -60, 0.9)}`;
  }

  function prepDOM() {
    Cinema.installEases();
    $('#before svg').innerHTML = artSVG('B');
    $('#after svg').innerHTML = artSVG('A');
    $('#wmTiles').innerHTML = Array.from({ length: 18 }, () => '<span>كاب كات</span>').join('');
    const txt = 'كاب كات برو ✦ <span class="ltr">6</span> آلاف ✦ تسليم فوري ✦ مضمون شهر كامل ✦ ';
    $$('.band .track').forEach((tr) => { tr.innerHTML = Array.from({ length: 4 }, () => `<span style="padding-left:30px">${txt}</span>`).join(''); });
    // every word fills the width but keeps a safe margin: shrink anything wider than 940 px
    $$('.wd, .row, #noPro').forEach((el) => {
      const w = el.scrollWidth;
      if (w > 940) el.style.fontSize = `${(parseFloat(getComputedStyle(el).fontSize) * 940 / w).toFixed(1)}px`;
    });
    Cinema.grain($('#grain'), 57, 0.12);
  }

  let tl;
  const shakes = [];
  const shake = (t, a = 14) => shakes.push([t, a]);
  function shakeAt(t) {
    let x = 0, y = 0;
    for (const [t0, a] of shakes) {
      const d = t - t0; if (d < 0 || d > 0.32) continue;
      const env = Math.min(1, d / 0.015) * Math.exp(-d / 0.09);
      x += a * env * Math.cos(2 * Math.PI * 13 * d); y -= 0.6 * a * env * Math.cos(2 * Math.PI * 13 * d + 0.7);
    }
    return { x, y };
  }
  function flash(t, peak = 0.25) {
    tl.fromTo('#flash', { opacity: 0 }, { opacity: peak, duration: 0.04, ease: 'none', immediateRender: false }, t)
      .to('#flash', { opacity: 0, duration: 0.35, ease: 'power2.out' }, t + 0.04);
  }
  // a word lands on beat t: it starts big and crashes into place
  function slam(el, t, { from = 1.9, rot = 0, rotTo = 0, dur = 0.13, size = 'mid', amp = 10 } = {}) {
    gsap.set(el, { opacity: 0 });
    tl.set(el, { opacity: 1 }, t - dur);
    tl.fromTo(el, { scale: from, rotation: rot }, { scale: 1, rotation: rotTo, duration: dur, ease: 'power4.in', immediateRender: false }, t - dur);
    shake(t, amp);
    cue(t, 'slam', { size });
  }
  function punch(els, t, k = 1.07) {
    tl.fromTo(els, { scale: k }, { scale: 1, duration: 0.3, ease: 'power2.out', immediateRender: false }, t);
  }
  let current = null;
  function scene(id, t, bg) { // a hard cut 0.14 s before the beat, so the first slam is already flying
    const at = t - 0.14;
    if (current) tl.set(current, { autoAlpha: 0 }, at);
    tl.set(id, { autoAlpha: 1 }, at);
    if (bg) tl.set('#bgc', { backgroundColor: bg }, at);
    current = id;
  }

  function build() {
    gsap.config({ force3D: false });
    tl = gsap.timeline({ paused: true });
    current = null;
    gsap.set('.slide', { autoAlpha: 0 });
    gsap.set('#bands', { autoAlpha: 0 });
    gsap.set('#bgc', { backgroundColor: INK });

    // ── 1 · hook ── (frame 0 already reads "لا تشترك")
    gsap.set('#s1', { autoAlpha: 1 });
    current = '#s1';
    tl.fromTo('#h1', { scale: 1.14 }, { scale: 1, duration: 0.3, ease: 'power3.out', immediateRender: false }, 0);
    cue(0, 'slam', { size: 'big' });
    shake(0.02, 12);
    slam('#h2', 0.5, { size: 'mid' });
    slam('#ban', 1.0, { from: 2.4, rot: -30, rotTo: -8, size: 'ban', amp: 18 });
    cue(1.0, 'ban');
    punch(['#h1', '#h2'], 1.5);
    scene('#s2', T.look);
    slam('#h3', T.look, { size: 'mid' });
    slam('#h4', T.look + 0.25, { size: 'big', from: 2.2 });
    gsap.set('#eyes', { opacity: 0 });
    tl.set('#eyes', { opacity: 1 }, T.look + 0.42);
    tl.fromTo('#eyes', { scale: 0.2 }, { scale: 1, duration: 0.22, ease: 'back.out(3)', immediateRender: false }, T.look + 0.42);
    tl.to('#eyes', { scale: 9, duration: 0.3, ease: 'power3.in' }, T.look + 0.66); // after the pop-in ends
    tl.to(['#h3', '#h4'], { opacity: 0, duration: 0.2 }, T.reveal - 0.4);
    cue(T.look + 0.1, 'rise', { until: T.reveal });

    // ── 2 · the reveal ──
    scene('#s3', T.reveal, LIME);
    slam('#r1', T.reveal, { size: 'big', amp: 16 });
    cue(T.reveal, 'drop');
    flash(T.reveal, 0.3);
    slam('#r2', T.reveal + 0.25, { from: 2.3, size: 'big', amp: 20 });
    slam('#r3', T.reveal + 0.5, { size: 'mid' });
    punch(['#r1', '#r2', '#r3'], T.reveal + 1.0);
    scene('#s4', T.price, INK);
    slam('#six .num', T.price, { from: 2.6, size: 'big', amp: 22 });
    slam('#six .unit', T.price + 0.25, { size: 'mid' });
    slam('#basS', T.price + 0.5, { from: 2.4, rot: 20, rotTo: -4, size: 'stamp', amp: 14 });
    cue(T.price + 0.5, 'stamp');
    punch(['#six .num', '#six .unit'], T.price + 1.0);

    // ── 3 · without pro ✗ · with the account ✓ ──
    scene('#s5', T.nopro, INK);
    slam('#noPro', T.nopro, { size: 'mid' });
    slam('#x1', T.nopro + 0.5, { size: 'small' });
    slam('#x2', T.nopro + 1.1, { size: 'small' });
    [['#x1 .strike', T.nopro + 0.85], ['#x2 .strike', T.nopro + 1.45]].forEach(([s, t]) => {
      tl.fromTo(s, { scaleX: 0 }, { scaleX: 1, duration: 0.16, ease: 'power3.out', immediateRender: false }, t);
      cue(t, 'strike');
      shake(t + 0.1, 8);
    });
    scene('#s6', T.demo, INK);
    slam('#capTop', T.demo, { size: 'mid' });
    gsap.set('#frame', { opacity: 0 });
    tl.fromTo('#frame', { scale: 0.8, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(1.8)', immediateRender: false }, T.demo + 0.05);
    const S0 = T.demo + 0.55, S1 = T.demo + 1.25;
    const after = $('#after'), bar = $('#swipe');
    updaters.push((t) => {
      const u = clamp((t - S0) / (S1 - S0));
      const e = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
      const x = 760 * (1 - e);
      after.style.clipPath = `inset(0 0 0 ${x.toFixed(1)}px)`;
      bar.style.left = `${x.toFixed(1)}px`;
      bar.style.opacity = t > S0 - 0.05 && t < S1 + 0.1 ? '1' : '0';
    });
    cue(S0, 'swipe', { until: S1 });
    gsap.set('#proSticker', { scale: 0 });
    tl.to('#proSticker', { scale: 1, duration: 0.35, ease: 'back.out(3)' }, S1 + 0.05);
    cue(S1 + 0.05, 'pop');
    slam('#cleanSticker span', T.demo + 1.6, { from: 2, rot: -12, rotTo: 3, size: 'small' });
    punch('#capTop', T.demo + 2.5);

    // ── 4 · perks ──
    [['#b1', INK], ['#b2', LIME], ['#b3', WHITE], ['#b4', INK]].forEach(([id, bg], k) => {
      const t = T.perks + k;
      scene(id, t, bg);
      const [emo, word] = $$(`${id} > *`);
      slam(emo, t, { from: 2.2, size: 'small', amp: 8 });
      slam(word, t + 0.25, { size: 'mid' });
      punch([emo, word], t + 0.5, 1.05);
      cue(t, 'perk', { k });
    });

    // ── 5 · price recap with the bands ──
    scene('#s8', T.recap, LIME);
    tl.set('#bands', { autoAlpha: 1 }, T.recap - 0.14);
    gsap.set('#bandA', { y: 190, rotation: -6 });
    gsap.set('#bandB', { y: 1500, rotation: 5 });
    slam('#p1', T.recap, { size: 'mid' });
    slam('#p2', T.recap + 0.25, { from: 2.6, size: 'big', amp: 22 });
    cue(T.recap + 0.25, 'price');
    flash(T.recap + 0.25, 0.22);
    slam('#p3', T.recap + 0.5, { size: 'mid' });
    punch(['#p2', '#p3'], T.recap + 1.0);
    punch(['#p1', '#p2', '#p3'], T.recap + 1.5, 1.05);

    // ── 6 · CTA ──
    scene('#s9', T.cta, INK);
    tl.set('#bandA', { y: 1490, rotation: -5 }, T.cta - 0.14);
    tl.set('#bandB', { y: 150, rotation: 4 }, T.cta - 0.14);
    slam('#cta1', T.cta, { from: 2.2, size: 'big', amp: 18 });
    cue(T.cta, 'cta');
    flash(T.cta, 0.25);
    gsap.set('#finger2', { opacity: 0 });
    tl.set('#finger2', { opacity: 1 }, T.cta + 0.25);
    tl.fromTo('#finger2', { y: 0 }, { y: 30, duration: 0.25, yoyo: true, repeat: 15, ease: 'sine.inOut', immediateRender: false }, T.cta + 0.25);
    slam('#wa2', T.cta + 0.5, { from: 1.6, rot: -6, rotTo: 0, size: 'mid' });
    slam('#ig2', T.cta + 0.75, { from: 1.6, rot: 6, rotTo: 0, size: 'mid' });
    cue(T.cta + 0.5, 'btn', { k: 0 });
    cue(T.cta + 0.75, 'btn', { k: 1 });
    slam('#recap span', T.cta + 1.25, { from: 1.8, size: 'small', amp: 6 });
    [[T.cta + 2.0, '#wa2'], [T.cta + 2.5, '#ig2'], [T.cta + 3.0, '#wa2'], [T.cta + 3.5, '#ig2']].forEach(([t, s]) => {
      punch(s, t, 1.08);
      Cinema.sweep(tl, $(s), t, { dur: 0.5, color: 'rgba(255,255,255,.65)' });
      cue(t, 'pulse');
    });
    punch(['#cta1', '#wa2', '#ig2'], T.cta + 4.5, 1.06);
    cue(T.cta + 4.5, 'final');

    // marquee bands: pure functions of time
    const tracks = $$('.band .track');
    const seg = tracks[0].scrollWidth / 4;
    updaters.push((t) => {
      const x = (t * 260) % seg;
      tracks[0].style.transform = `translateX(${(x - seg).toFixed(1)}px)`;
      tracks[1].style.transform = `translateX(${(-x).toFixed(1)}px)`;
    });
    const world = $('#world'), rig = $('#rig');
    updaters.push((t) => {
      const s = shakeAt(t);
      world.style.transform = s.x || s.y ? `translate(${s.x.toFixed(2)}px, ${s.y.toFixed(2)}px)` : '';
      const h = Cinema.handheld(t, { amp: 2.5, rotAmp: 0.15, seed: 77 });
      Cinema.applyCamera(rig, { x: h.x, y: h.y, rot: h.rot, scale: 1 });
    });
    tl.set({}, {}, DURATION);
  }

  let RAW = '', lastT = 0;
  function rebuild() {
    tl.kill(); updaters.length = 0; shakes.length = 0; cues.length = 0;
    $('#stage').innerHTML = RAW; prepDOM(); build(); cues.sort((a, b) => a.t - b.t); lastT = 0;
  }
  function seek(t) {
    t = clamp(t, 0, DURATION);
    if (t < lastT - 1e-6) rebuild();
    lastT = t;
    tl.seek(t, false);
    for (const u of updaters) u(t);
  }
  const ready = (async () => {
    await Promise.all(['900 240px Alexandria', '900 78px Alexandria', '900 640px Outfit', '900 60px Outfit'].map((f) => document.fonts.load(f, 'گ 0123456789 …عربي')));
    await document.fonts.ready;
    RAW = $('#stage').innerHTML;
    prepDOM();
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    build(); cues.sort((a, b) => a.t - b.t); seek(0);
    return true;
  })();
  const AD_ID = document.body.dataset.ad || 'v2';
  window.ORIN = { id: AD_ID, prefix: 'capcut-ad', soundtrack: 'soundtrack_capcut2.py', ready, seek, cues, T, W, H, FPS, BPM, get duration() { return DURATION; } };

  if (RENDER) return;
  const stage = $('#stage');
  const fit = () => { const k = Math.min(innerWidth / W, (innerHeight - 64) / H); Object.assign(stage.style, { position: 'absolute', left: '50%', top: 'calc(50% - 26px)', transform: `translate(-50%, -50%) scale(${k})` }); };
  addEventListener('resize', fit); fit();
  const playBtn = $('#play'), scrub = $('#scrub'), label = $('#tlabel'), audio = $('#music'), muteBtn = $('#mute');
  let playing = true, cur = 0, last = null, soundOn = false;
  audio.muted = true;
  const sync = () => { if (!soundOn) return; if (Math.abs(audio.currentTime - cur) > 0.08) audio.currentTime = cur; if (playing && audio.paused) audio.play().catch(() => {}); if (!playing && !audio.paused) audio.pause(); };
  playBtn.onclick = () => { playing = !playing; playBtn.textContent = playing ? '⏸' : '▶'; sync(); };
  muteBtn.onclick = () => { soundOn = !soundOn; audio.muted = !soundOn; muteBtn.textContent = soundOn ? '🔊' : '🔇'; if (!soundOn) audio.pause(); sync(); };
  scrub.oninput = () => { cur = +scrub.value; seek(cur); if (soundOn) audio.currentTime = cur; };
  ready.then(() => {
    const loop = (now) => {
      if (last == null) last = now;
      if (playing) { cur += (now - last) / 1000; if (cur >= DURATION) cur = 0; seek(cur); scrub.value = cur; sync(); }
      label.textContent = `${cur.toFixed(2)} / ${DURATION.toFixed(2)}`; last = now; requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });
})();
