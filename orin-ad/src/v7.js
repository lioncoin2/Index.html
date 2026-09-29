/*
 * Orin — ad v7 "إنت تذاكر غلط 😬" (three study mistakes, Iraqi dialect, 33s, 1080×1920).
 *
 *   0.00–4.80   hook: the brain "crashes" — error popups slam in ("الذاكرة ممتلئة 🧠",
 *               "Error 404: المعلومة مو موجودة"…), then "✋ وقف! / إنت تذاكر / [غلط 😬]"
 *               stamped over them; "وأغلب الطلاب مثلك… خلّيني أثبتلك 👇"
 *   4.80–11.2   غلط 1: read it ten times, forget it in two days — a forgetting curve draws
 *               itself down; ✅ Orin's quick quizzes keep pulling it back up (spaced recall)
 *   11.2–17.8   غلط 2: memorising without understanding — the textbook definition's words
 *               literally fall off the card; ✅ Orin explains the cell as a city
 *               ("الميتوكوندريا = محطة الكهرباء… بس ما تطفي 😂")
 *   17.8–24.4   غلط 3: everything the night before — seven chapters piled on exam night at
 *               3 AM; ✅ Orin spreads them across the week, 10:30 PM and asleep
 *   24.4–27.8   payoff: the three mistakes flip into the three fixes — "ذاكر أذكى… مو أكثر 🧠"
 *   27.8–33.0   logo → wordmark → slogan → CTA
 *
 * Every caption on screen is also the voice-over line for that moment (VO below, exported
 * with the cue sheet), so the ad reads fully on mute and a recorded VO drops straight in.
 * Conventions as v5/v6: deterministic seek(t), one owner per transform, 2D transforms and no
 * layer promotion, full rebuild on backward seeks for the browser preview.
 */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const RENDER = new URLSearchParams(location.search).has('render');
  if (RENDER) document.body.classList.add('render');

  const W = 1080, H = 1920, DURATION = 33.0, FPS = 60, BPM = 120;
  const T = { hook: 0, stop: 0.85, stamp: 1.95, prove: 3.0, m1: 4.8, f1: 8.0, m2: 11.2, f2: 14.2, m3: 17.8, f3: 20.8, pay: 24.4, end: 27.8, logo: 28.3 };
  // voice-over script — [start, end, line]; the captions on screen carry the same words
  const VO = [
    [0.85, 2.8, 'وقف! إنت تذاكر غلط…'],
    [3.0, 4.6, 'وأغلب الطلاب مثلك… خلّيني أثبتلك.'],
    [4.9, 7.7, 'أول غلط: تقرا الدرس عشر مرات… وبعد يومين تنساه.'],
    [8.0, 11.0, 'الحل؟ Orin يختبرك بأسئلة سريعة… والمعلومة تثبت.'],
    [11.3, 13.9, 'ثاني غلط: تحفظ بدون ما تفهم.'],
    [14.2, 17.6, 'Orin يشرحلك بأمثلة من حياتك… الميتوكوندريا؟ محطة كهرباء… بس ما تطفي!'],
    [17.9, 20.5, 'ثالث غلط: تخلّي كلشي لليلة الامتحان.'],
    [20.9, 24.2, 'Orin يقسّملك المنهج على أيام… وتدخل الامتحان مرتاح.'],
    [24.6, 27.4, 'ذاكر أذكى… مو أكثر.'],
    [28.4, 31.6, 'Orin… مساعدك الذكي بالدراسة. نزّله هسة!'],
  ];
  T.vo = VO.map(([a, b, line]) => ({ t0: a, t1: b, line }));
  // error popups: centre x, y, rotation (the first is already on screen at frame 0)
  const ERRS = [[540, 800, -3], [370, 470, -8], [720, 1070, 6], [350, 1300, 5], [730, 600, 7], [560, 1510, -5]];

  const cues = [];
  const cue = (t, type, extra = {}) => cues.push({ t: Math.round(t * 1000) / 1000, type, ...extra });
  const updaters = [];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const rnd = (i, s = 1) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); }; // deterministic 0..1

  /* ───────────────────────── DOM prep (shared pattern with v2–v6) ───────────────────────── */

  function splitText(el, mode) {
    const walk = (node) => {
      for (const child of Array.from(node.childNodes)) {
        if (child.nodeType === Node.TEXT_NODE) {
          const frag = document.createDocumentFragment();
          for (const part of child.textContent.split(/(\s+)/)) {
            if (!part) continue;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); continue; }
            const inner = document.createElement('span');
            inner.textContent = part;
            if (mode === 'stream') { inner.className = 'sw'; frag.appendChild(inner); continue; }
            inner.className = 'wi';
            const mask = document.createElement('span');
            mask.className = 'w';
            mask.appendChild(inner);
            frag.appendChild(mask);
          }
          child.replaceWith(frag);
        } else if (child.nodeType === Node.ELEMENT_NODE && !child.classList.contains('ltr')) {
          walk(child);
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          const wrap = document.createElement('span');
          wrap.className = mode === 'stream' ? 'sw' : 'wi';
          child.replaceWith(wrap);
          wrap.appendChild(child);
          if (mode !== 'stream') {
            const mask = document.createElement('span');
            mask.className = 'w';
            wrap.replaceWith(mask);
            mask.appendChild(wrap);
          }
        }
      }
    };
    walk(el);
  }
  function splitLetters(el) {
    const txt = el.textContent.trim();
    el.textContent = '';
    for (const ch of txt) {
      const clip = document.createElement('span');
      clip.className = 'clip';
      const c = document.createElement('span');
      c.className = 'ch';
      c.textContent = ch;
      clip.appendChild(c);
      el.appendChild(clip);
    }
  }

  function prepDOM() {
    Cinema.installEases();
    $$('[data-logo]').forEach((el) => { el.innerHTML = OrinLogo.logoSVG(+el.dataset.logo); });
    $$('[data-split]').forEach((el) => splitText(el, 'mask'));
    $$('[data-stream]').forEach((el) => splitText(el, 'stream'));
    $$('[data-letters]').forEach(splitLetters);

    const dust = $('#dust');
    const r = (() => { let s = 7; return () => { s = (s + 0x6D2B79F5) | 0; let x = Math.imul(s ^ (s >>> 15), 1 | s); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; })();
    for (let i = 0; i < 30; i++) {
      const d = document.createElement('i');
      const size = 2 + r() * 5;
      Object.assign(d.style, { position: 'absolute', left: '0', top: '0', width: size + 'px', height: size + 'px', borderRadius: '50%', background: r() < 0.25 ? '#FF8A70' : '#fff' });
      d._p = { x: r() * W, y: r() * (H + 200), v: 18 + r() * 46, a: 0.1 + r() * 0.25, f: 0.2 + r() * 0.5, ph: r() * 6.28, amp: 10 + r() * 30 };
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

    Cinema.grain($('#grain'), 71, 0.13);
  }

  function stagePos(el) {
    const sr = $('#stage').getBoundingClientRect();
    const k = sr.width / W;
    const r = el.getBoundingClientRect();
    return { x: (r.left + r.width / 2 - sr.left) / k, y: (r.top + r.height / 2 - sr.top) / k, w: r.width / k, h: r.height / k, l: (r.left - sr.left) / k, t: (r.top - sr.top) / k };
  }

  function ringView(svg, init) {
    const g = $('.ring-g', svg), shock = $('.shock', svg), pw = $('.pw', svg), pc = $('.pc', svg);
    const st = Object.assign({ x: 540, y: 960, s: 1, r: 240, rot: 0, white: 0, coral: 0, thin: 1, alpha: 1, shockR: 0, shockA: 0 }, init);
    let key = '';
    updaters.push(() => {
      g.setAttribute('transform', `translate(${st.x.toFixed(2)} ${st.y.toFixed(2)}) scale(${st.s.toFixed(4)})`);
      svg.style.opacity = clamp(st.alpha).toFixed(3);
      shock.setAttribute('cx', st.x.toFixed(1));
      shock.setAttribute('cy', st.y.toFixed(1));
      shock.setAttribute('r', Math.max(1, st.shockR).toFixed(1));
      shock.setAttribute('opacity', clamp(st.shockA).toFixed(3));
      const k = [st.white, st.coral, st.thin, st.rot].map((v) => v.toFixed(3)).join('|');
      if (k !== key) {
        key = k;
        const p = OrinLogo.logoPaths({ white: st.white, coral: st.coral, rot: st.rot, s: st.r, thin: st.thin });
        pw.setAttribute('d', p.white);
        pc.setAttribute('d', p.coral);
      }
    });
    return st;
  }

  /* ───────────────────────── helpers ───────────────────────── */

  let tl;
  const wordsOf = (sel) => $$('.wi', typeof sel === 'string' ? $(sel) : sel);
  const swOf = (sel) => $$('.sw', typeof sel === 'string' ? $(sel) : sel);
  function textIn(sel, t, { stagger = 0.06, dur = 0.6, ease = 'orinIn', rot = 3 } = {}) {
    tl.fromTo(wordsOf(sel), { yPercent: 118, rotation: rot, autoAlpha: 1 },
      { yPercent: 0, rotation: 0, duration: dur, ease, stagger, immediateRender: false }, t);
  }
  function textOut(sel, t, { stagger = 0.025, dur = 0.26, ease = 'power3.in' } = {}) {
    const w = wordsOf(sel);
    tl.to(w, { yPercent: -125, rotation: -3, duration: dur, ease, stagger }, t);
    tl.set(w, { autoAlpha: 0, stagger }, t + dur);
  }
  // Camera shake as a pure function of time: impulses are summed by an updater instead of chained
  // GSAP .to() tweens, because this hook fires overlapping shakes and overlapping .to()s record
  // different start values depending on seek history (frames would differ between workers).
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
  function alarm(t, peak = 0.9, dur = 0.45) {
    tl.fromTo('#alarm', { opacity: peak }, { opacity: 0, duration: dur, ease: 'power2.out', immediateRender: false }, t);
  }
  function popIn(el, t, { from = 40, dur = 0.5, ease = 'uiPop', x = 0 } = {}) {
    tl.fromTo(el, { opacity: 0, y: from, x, scale: 0.92 }, { opacity: 1, y: 0, x: 0, scale: 1, duration: dur, ease, immediateRender: false }, t);
  }
  function scrollIn(el, t) { tl.fromTo(el, { y: 340, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.55, ease: 'expo.out', immediateRender: false }, t); cue(t, 'swoosh'); }
  function scrollOut(el, t) { tl.to(el, { y: -300, autoAlpha: 0, duration: 0.4, ease: 'power2.in' }, t); }
  // the mistake → fix hinge every scene shares: red chip/caption out, green chip/caption in
  function toFix(sc, t) {
    const bad = $('.chip.bad', sc), good = $('.chip.good', sc);
    tl.to(bad, { opacity: 0, scale: 0.7, duration: 0.18, ease: 'power2.in' }, t - 0.12);
    tl.fromTo(good, { opacity: 0, scale: 1.5 }, { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(3)', immediateRender: false }, t + 0.02);
    textOut($('.cap.c1', sc), t - 0.18, { dur: 0.22, stagger: 0.02 });
    textIn($('.cap.c2', sc), t + 0.04, { stagger: 0.055, dur: 0.5 });
    flash(t, 0.12);
    cue(t, 'fix');
  }
  function mistakeIn(sc, t, n) {
    scrollIn(sc, t);
    tl.fromTo($('.chip.bad', sc), { opacity: 0, scale: 1.6, rotation: -8 }, { opacity: 1, scale: 1, rotation: 0, duration: 0.3, ease: 'power4.in', immediateRender: false }, t + 0.08);
    textIn($('.cap.c1', sc), t + 0.14, { stagger: 0.06, dur: 0.5 });
    shake(t + 0.38, 10);
    alarm(t + 0.38, 0.6, 0.5);
    cue(t + 0.38, 'mistake', { n });
  }

  /* ───────────────────────── scenes ───────────────────────── */

  function buildHook() {
    const errs = $$('#errs .err');
    errs.forEach((e, i) => {
      const [x, y, rot] = ERRS[i];
      gsap.set(e, { x: x - 320, y: y - 108, rotation: rot });
      if (i < 2) { // two alerts are already up at frame 0
        tl.fromTo(e, { scale: 1.1 }, { scale: 1, duration: 0.25, ease: 'back.out(3)', immediateRender: false }, 0);
        cue(0, 'error', { i });
        return;
      }
      const t0 = 0.02 + (i - 1) * 0.15;
      gsap.set(e, { opacity: 0 });
      tl.fromTo(e, { opacity: 1, scale: 1.7, rotation: rot + (i % 2 ? 14 : -14) }, { scale: 1, rotation: rot, duration: 0.14, ease: 'power4.in', immediateRender: false }, t0);
      tl.set(e, { opacity: 1 }, t0);
      cue(t0 + 0.14, 'error', { i });
      alarm(t0 + 0.14, 0.75, 0.3);
      shake(t0 + 0.14, 7);
    });
    // freeze: dark scrim + "✋ وقف!"
    const S = T.stop;
    tl.fromTo('#scrim', { opacity: 0 }, { opacity: 1, duration: 0.25, ease: 'power2.out', immediateRender: false }, S);
    textIn('#hkA', S + 0.02, { stagger: 0.05, dur: 0.4 });
    tl.fromTo('#hkA', { scale: 1.5 }, { scale: 1, duration: 0.35, ease: 'orinIn', immediateRender: false }, S + 0.02);
    cue(S, 'stop');
    textIn('#hkB', 1.4, { stagger: 0.08, dur: 0.5 });
    cue(1.4, 'word');
    // the stamp
    const st = $('#stamp');
    gsap.set(st, { opacity: 0 });
    tl.fromTo(st, { opacity: 1, scale: 2.8, rotation: -14 }, { scale: 1, rotation: 0, duration: 0.2, ease: 'power4.in', immediateRender: false }, T.stamp - 0.2);
    tl.set(st, { opacity: 1 }, T.stamp - 0.2);
    cue(T.stamp, 'stamp');
    shake(T.stamp, 22);
    flash(T.stamp, 0.25);
    alarm(T.stamp, 1, 0.8);
    Cinema.chromaBurst(tl, $('#stamp span'), T.stamp, { amp: 22, size: 620 });
    tl.fromTo($('#stamp i'), { scale: 0.3, rotation: -30 }, { scale: 1, rotation: 0, duration: 0.45, ease: 'back.out(3)', immediateRender: false }, T.stamp + 0.12);
    // blow it all away
    const out = 2.72;
    errs.forEach((e, i) => {
      const [x, y] = ERRS[i];
      const dx = (x - 540) * 1.6, dy = (y - 960) * 1.6;
      tl.to(e, { x: `+=${dx}`, y: `+=${dy}`, scale: 1.3, opacity: 0, duration: 0.35, ease: 'power2.in' }, out + i * 0.015);
    });
    textOut('#hkA', out, { dur: 0.22 });
    textOut('#hkB', out + 0.03, { dur: 0.22 });
    tl.to(st, { scale: 1.6, opacity: 0, duration: 0.3, ease: 'power2.in' }, out + 0.05);
    tl.to('#scrim', { opacity: 0, duration: 0.3 }, out + 0.1);
    cue(out, 'whoosh');
    // "and most students are like you… let me prove it 👇"
    textIn('#hkC', T.prove, { stagger: 0.07, dur: 0.5 });
    textIn('#hkD', T.prove + 0.75, { stagger: 0.07, dur: 0.5 });
    cue(T.prove + 0.75, 'pop');
    tl.fromTo('#hkD', { y: 0 }, { y: 16, duration: 0.18, yoyo: true, repeat: 3, ease: 'sine.inOut', immediateRender: false }, T.prove + 1.2);
    textOut('#hkC', T.m1 - 0.32, { dur: 0.24 });
    textOut('#hkD', T.m1 - 0.28, { dur: 0.24 });
    tl.set('#hook', { autoAlpha: 0 }, T.m1 + 0.05);
  }

  function buildM1() {
    const sc = $('#m1'), pane = $('.chartc', sc);
    const M = T.m1, F = T.f1;
    mistakeIn(sc, M, 1);
    popIn(pane, M + 0.3, { from: 60 });
    // reading counter 1 → 10
    const reads = $('.reads', pane), rn = $('.rn', reads);
    const RD = { n: 1 };
    updaters.push(() => { rn.textContent = String(Math.round(RD.n)); });
    tl.fromTo(reads, { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(3)', immediateRender: false }, M + 0.55);
    tl.fromTo(RD, { n: 1 }, { n: 10, duration: 0.95, ease: 'power1.in', immediateRender: false }, M + 0.6);
    cue(M + 0.6, 'count', { until: M + 1.55 });
    tl.fromTo(reads, { scale: 1.25 }, { scale: 1, duration: 0.3, ease: 'back.out(3)', immediateRender: false }, M + 1.55);
    // the curves: dash + the % readout both follow the drawing head
    const [red, green] = [$('.fc.bad', pane), $('.fc.good', pane)];
    const lenR = red.getTotalLength(), lenG = green.getTotalLength();
    const C = { r: 0, g: 0, mode: 0 };
    const pctEl = $('.pct', pane), readout = $('.readout', pane);
    const yToPct = (y) => clamp((480 - y) / 440, 0, 1) * 100;
    updaters.push(() => {
      red.style.strokeDasharray = `${(C.r * 100).toFixed(2)} 100`;
      green.style.strokeDasharray = `${(C.g * 100).toFixed(2)} 100`;
      const p = C.mode ? green.getPointAtLength(C.g * lenG) : red.getPointAtLength(C.r * lenR);
      const pct = Math.round(C.mode ? yToPct(p.y) : (C.r > 0 ? yToPct(p.y) : 100));
      pctEl.textContent = String(pct);
      readout.style.color = pct < 45 ? '#FF4D5E' : pct < 75 ? '#FFD65A' : (C.mode ? '#34D399' : '#FF6B56');
    });
    tl.fromTo(C, { r: 0 }, { r: 1, duration: 1.3, ease: 'power1.inOut', immediateRender: false }, M + 1.75);
    cue(M + 1.75, 'fall', { until: M + 3.05 });
    tl.fromTo($('.tb', pane), { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.35, ease: 'power3.out', immediateRender: false }, M + 2.6);

    // ✅ fix: quick quizzes pull it back up every couple of days
    toFix(sc, F);
    tl.to(reads, { opacity: 0, duration: 0.2 }, F);
    tl.to(red, { opacity: 0.3, duration: 0.3 }, F + 0.05);
    tl.to($('.tb', pane), { opacity: 0.4, duration: 0.3 }, F + 0.05);
    tl.set(C, { mode: 1 }, F + 0.15);
    const GD = 1.9, g0 = F + 0.25;
    tl.fromTo(C, { g: 0 }, { g: 1, duration: GD, ease: 'none', immediateRender: false }, g0);
    // quiz badges pop exactly when the drawing head reaches each jump
    const jumpsX = [206, 406, 696];
    const lenAtX = (x) => { let a = 0, b = lenG; for (let k = 0; k < 30; k++) { const m = (a + b) / 2; if (green.getPointAtLength(m).x < x) a = m; else b = m; } return b; };
    $$('.qz', pane).forEach((q, k) => {
      const p = green.getPointAtLength(lenAtX(jumpsX[k]));
      Object.assign(q.style, { left: `${20 + p.x}px`, top: `${150 + p.y - 46}px` });
      const tq = g0 + (lenAtX(jumpsX[k]) / lenG) * GD - 0.05;
      tl.fromTo(q, { opacity: 0, scale: 0.3 }, { opacity: 1, scale: 1, duration: 0.35, ease: 'back.out(3)', immediateRender: false }, tq);
      cue(tq, 'quiz', { k });
    });
    tl.fromTo($('.tg', pane), { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.35, ease: 'power3.out', immediateRender: false }, g0 + GD - 0.2);
    cue(g0 + GD, 'good');
    scrollOut(sc, T.m2 - 0.4);
  }

  function buildM2() {
    const sc = $('#m2'), defn = $('.defn', sc), city = $('.city', sc);
    const M = T.m2, F = T.f2;
    mistakeIn(sc, M, 2);
    popIn(defn, M + 0.3, { from: 60 });
    tl.fromTo(swOf($('.book', defn)), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.18, ease: 'power2.out', stagger: 0.03, immediateRender: false }, M + 0.5);
    tl.fromTo($('.parrot', defn), { opacity: 0, scale: 1.9, rotation: 12 }, { opacity: 1, scale: 1, rotation: 0, duration: 0.25, ease: 'power4.in', immediateRender: false }, M + 1.05);
    cue(M + 1.3, 'parrot');
    // …and it all falls out of your head
    const tf = M + 1.8;
    swOf($('.book', defn)).forEach((w, i) => {
      const d = rnd(i, 3), dir = rnd(i, 7) < 0.5 ? -1 : 1;
      tl.to(w, { y: 700 + 500 * d, x: dir * (40 + 120 * rnd(i, 11)), rotation: dir * (30 + 90 * d), opacity: 0, duration: 0.9 + 0.3 * d, ease: 'power2.in' }, tf + 0.5 * rnd(i, 5));
    });
    tl.to($('.parrot', defn), { y: 900, rotation: -40, opacity: 0, duration: 1.0, ease: 'power2.in' }, tf + 0.55);
    cue(tf, 'fall', { until: tf + 1.2 });
    tl.to(defn, { opacity: 0, duration: 0.25 }, F - 0.15);

    // ✅ fix: the cell as a city
    toFix(sc, F);
    popIn(city, F + 0.1, { from: 60 });
    cue(F + 0.1, 'msg');
    $$('.an', city).forEach((a, k) => {
      const tk = F + 0.55 + k * 0.62;
      tl.fromTo(a, { opacity: 0, x: 60 }, { opacity: 1, x: 0, duration: 0.42, ease: 'power3.out', immediateRender: false }, tk);
      tl.fromTo($('.ic', a), { scale: 0.3, rotation: -20 }, { scale: 1, rotation: 0, duration: 0.45, ease: 'back.out(3)', immediateRender: false }, tk + 0.05);
      cue(tk, 'row', { k });
    });
    // the power station that never cuts out — lights flicker then hold
    const bolt = $('.an.hot .ic', city);
    const tb = F + 1.3;
    [0, 0.07, 0.14, 0.24, 0.3].forEach((d, k) => tl.to(bolt, { opacity: k % 2 ? 1 : 0.25, duration: 0.03 }, tb + d));
    tl.to(bolt, { opacity: 1, duration: 0.05 }, tb + 0.36);
    cue(tb, 'zap');
    scrollOut(sc, T.m3 - 0.4);
  }

  function buildM3() {
    const sc = $('#m3'), pane = $('.week', sc);
    const M = T.m3, F = T.f3;
    mistakeIn(sc, M, 3);
    popIn(pane, M + 0.3, { from: 60 });
    // measure the day columns (before any transform) to place the chapter chips
    const pp = stagePos(pane);
    const cols = $$('.cols i', pane).map((c) => stagePos(c));
    const tasks = $$('.task', pane);
    const TW = 108, TH = 74;
    const exam = cols[6];
    const pile = tasks.map((_, k) => ({ x: exam.x - pp.l - TW / 2 + (rnd(k, 2) - 0.5) * 14, y: exam.t + exam.h - pp.t - 14 - TH - k * 76, r: (rnd(k, 4) - 0.5) * 12 }));
    const plan = tasks.map((_, k) => ({ x: cols[k].x - pp.l - TW / 2, y: cols[k].y - pp.t - TH / 2, r: 0 }));
    tasks.forEach((tk, k) => gsap.set(tk, { x: pile[k].x, y: pile[k].y - 700, rotation: pile[k].r, opacity: 0 }));
    tasks.forEach((tk, k) => {
      const t0 = M + 0.55 + k * 0.09;
      tl.fromTo(tk, { opacity: 1, y: pile[k].y - 700 }, { y: pile[k].y, duration: 0.3, ease: 'power3.in', immediateRender: false }, t0);
      tl.set(tk, { opacity: 1 }, t0);
      cue(t0 + 0.3, 'drop', { k });
    });
    const clk = $('.clock3', pane);
    tl.fromTo($('.t1', clk), { opacity: 0, scale: 1.6 }, { opacity: 1, scale: 1, duration: 0.3, ease: 'power4.in', immediateRender: false }, M + 1.35);
    tl.fromTo($('.e1', clk), { opacity: 0, scale: 0.3 }, { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(3)', immediateRender: false }, M + 1.5);
    cue(M + 1.65, 'clock');
    alarm(M + 1.65, 0.8, 0.5);
    // the pile wobbles under its own weight
    tl.fromTo($('.tasks', pane), { rotation: 0 }, { rotation: 1.2, duration: 0.12, yoyo: true, repeat: 5, ease: 'sine.inOut', immediateRender: false }, M + 1.9);

    // ✅ fix: one chapter a day, review on exam day
    toFix(sc, F);
    tasks.forEach((tk, k) => {
      const t0 = F + 0.2 + k * 0.1;
      tl.to(tk, { x: plan[k].x, duration: 0.55, ease: 'power2.inOut' }, t0);
      tl.to(tk, { y: plan[k].y, rotation: 0, duration: 0.55, ease: 'back.out(1.4)' }, t0);
      tl.to(tk, { borderColor: k === 6 ? '#FF6B56' : 'rgba(52,211,153,0.8)', backgroundColor: k === 6 ? 'rgba(255,107,86,0.22)' : 'rgba(52,211,153,0.16)', duration: 0.2 }, t0 + 0.5);
      cue(t0 + 0.5, 'place', { k });
    });
    tl.to($('.t1', clk), { opacity: 0, scale: 0.7, duration: 0.2 }, F + 1.1);
    tl.to($('.e1', clk), { opacity: 0, scale: 0.4, duration: 0.2 }, F + 1.1);
    tl.fromTo($('.t2', clk), { opacity: 0, scale: 1.4 }, { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(2)', immediateRender: false }, F + 1.25);
    tl.fromTo($('.e2', clk), { opacity: 0, scale: 0.3 }, { opacity: 1, scale: 1, duration: 0.45, ease: 'back.out(3)', immediateRender: false }, F + 1.35);
    cue(F + 1.3, 'good');
    textIn($('.cap.c3', sc), F + 1.8, { stagger: 0.07, dur: 0.5 });
    scrollOut(sc, T.pay - 0.4);
  }

  function buildPay() {
    const sc = $('#pay'), P = T.pay;
    tl.set(sc, { autoAlpha: 1 }, P - 0.02);
    const flips = $$('.flip', sc);
    flips.forEach((f, k) => {
      const tk = P + 0.05 + k * 0.14;
      tl.fromTo(f, { opacity: 0, y: 60, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: 'uiPop', immediateRender: false }, tk);
      cue(tk, 'row', { k });
    });
    flips.forEach((f, k) => {
      const tk = P + 0.85 + k * 0.32;
      tl.to($('.fb', f), { scaleY: 0, duration: 0.13, ease: 'power2.in' }, tk);
      tl.fromTo($('.ff', f), { scaleY: 0 }, { scaleY: 1, duration: 0.2, ease: 'back.out(2)', immediateRender: false }, tk + 0.13);
      cue(tk + 0.13, 'flip', { k });
    });
    textIn('#payline', P + 1.95, { stagger: 0.08, dur: 0.55 });
    tl.fromTo('#payline', { scale: 1.3 }, { scale: 1, duration: 0.45, ease: 'orinIn', immediateRender: false }, P + 1.95);
    cue(P + 1.95, 'pop');
    tl.to(sc, { autoAlpha: 0, scale: 0.94, duration: 0.35, ease: 'power2.in' }, T.end - 0.35);
  }

  function buildEnd() {
    const E = T.end, L = T.logo;
    tl.set('#end', { autoAlpha: 1 }, E - 0.02);
    const RB = ringView($('#ringB'), { x: 540, y: 700, r: 150, thin: 0.3, rot: -560 });
    cue(L - 0.45, 'riser', { until: L });
    cue(L, 'impact', { big: true });
    flash(L, 0.18);
    shake(L, 12);
    Cinema.flarePulse(tl, $('#end'), 540, 700, L + 0.05, { peak: 0.9, dur: 1.1, color: '255,107,86' });
    tl.set(RB, { white: 0.28, coral: 0.22 }, L - 0.02);
    tl.to(RB, { white: 1, duration: 0.9, ease: 'power3.inOut' }, L);
    tl.to(RB, { coral: 1, duration: 0.85, ease: 'power3.inOut' }, L + 0.05);
    tl.to(RB, { thin: 1, duration: 0.6, ease: 'power2.inOut' }, L + 0.25);
    tl.to(RB, { rot: 0, duration: 1.05, ease: 'expo.out' }, L - 0.02);
    tl.fromTo(RB, { shockR: 160, shockA: 0.8 }, { shockR: 900, shockA: 0, duration: 1.1, ease: 'expo.out', immediateRender: false }, L + 0.85);
    cue(L + 0.85, 'chime');
    tl.to('#g1', { x: 540, y: 700, opacity: 0.9, scale: 1.1, duration: 1.2, ease: 'expo.out' }, L + 0.3);
    tl.fromTo($$('#endWordmark .ch'), { yPercent: 110, autoAlpha: 1 }, { yPercent: 0, duration: 0.85, ease: 'expo.out', stagger: 0.05, immediateRender: false }, L + 0.45);
    textIn('#slogan', L + 0.9, { stagger: 0.07, dur: 0.6 });
    const cta = $('#cta');
    tl.to(cta, { opacity: 1, scale: 1, duration: 0.7, ease: 'uiPop' }, L + 1.45);
    cue(L + 1.45, 'cta');
    [L + 2.0, L + 2.9, L + 3.8].forEach((t) => Cinema.sweep(tl, cta, t, { dur: 0.75, color: 'rgba(255,255,255,.7)' }));
    [L + 2.55, L + 3.45].forEach((t) => tl.to(cta, { scale: 1.045, duration: 0.18, yoyo: true, repeat: 1, ease: 'power2.out' }, t));
  }

  /* ───────────────────────── build ───────────────────────── */

  function build() {
    // 2D transforms only + no compositor layers (v7.css) → identical frames in any seek order
    gsap.config({ force3D: false });
    tl = gsap.timeline({ paused: true });

    gsap.set($$('.wi'), { yPercent: 118, autoAlpha: 0 });
    gsap.set($$('.wordmark .ch'), { yPercent: 110, autoAlpha: 0 });
    gsap.set('.scene, #end', { autoAlpha: 0 });
    gsap.set('.pane, .chip.bad, .flip', { opacity: 0 });
    gsap.set('#cta', { opacity: 0, scale: 0.3 });
    gsap.set('#cta .shine', { x: -260, rotation: 18 });
    gsap.set('#g1', { x: 540, y: 900, scale: 1.1, opacity: 0.3 });
    gsap.set('#g2', { x: 880, y: 320, opacity: 0.16 });
    gsap.set('#grid', { opacity: 0.32 });
    gsap.set('#alarm', { opacity: 0.55 }); // frame 0 already reads "alert"
    tl.to('#alarm', { opacity: 0, duration: 0.4 }, 0.05);

    buildHook();
    buildM1();
    buildM2();
    buildM3();
    buildPay();
    buildEnd();

    const world = $('#world');
    updaters.push((t) => {
      const s = shakeAt(t);
      world.style.transform = s.x || s.y ? `translate(${s.x.toFixed(2)}px, ${s.y.toFixed(2)}px)` : '';
    });
    const rig = $('#rig');
    updaters.push((t) => {
      const k = t < T.stop ? 1 : Math.exp(-(t - T.stop) / 0.8);
      const h = Cinema.handheld(t, { amp: 1.6 + 4 * k, rotAmp: 0.15 + 0.4 * k, seed: 17 });
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
    await Promise.all(['700 100px Alexandria', '800 100px Alexandria', '400 30px Readex', '500 30px Readex', '600 30px Readex', '700 30px Readex', '800 30px Readex', '600 30px Outfit', '700 30px Outfit', '800 30px Outfit']
      .map((f) => document.fonts.load(f, 'Orin 0123456789 …عربي')));
    await document.fonts.ready;
    RAW = $('#stage').innerHTML;
    prepDOM();
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    build();
    cues.sort((a, b) => a.t - b.t);
    seek(0);
    return true;
  })();

  const AD_ID = document.body.dataset.ad || 'v7';
  window.ORIN = { id: AD_ID, soundtrack: 'soundtrack_v7.py', ready, seek, cues, T, W, H, FPS, BPM, get duration() { return DURATION; } };

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
  muteBtn.textContent = '🔇';
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
