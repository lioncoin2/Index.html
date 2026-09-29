/*
 * Orin — ad v6 "دزّ أي شي… Orin يفهّمك ياه" (student features, Iraqi dialect, 34s, 1080×1920).
 *
 *   0.00–3.00   hook: ten files (PDF/PPTX/DOCX/JPG/XLSX/MP3…) slam into a pile —
 *               "ملازم… سلايدات… صور 🤯 / وما فاهم منها شي؟" — then spiral into the
 *               Orin ring ("دزّها كلها لـ Orin ✨") and the camera flies through it
 *   3.00–13.0   01 · any file, explained every way: upload a lecture PDF, Orin asks how
 *               you want it, then the same file becomes a summary → a simple analogy
 *               (the Baghdad "كيا" braking) → a mind map → a quiz
 *   13.0–21.0   02 · snap any question: viewfinder, shutter, scan + detection boxes,
 *               step-by-step solution, the answer written back onto the photo, "💡 الفكرة"
 *   21.0–28.5   03 · an honest opinion: outfit (8.5/10, "try white shoes" → they turn white)
 *               and a project poster (cluttered → Orin's cleaner version)
 *   28.5–34.0   recap (ملفاتك · صورك · رأيه الصريح) → logo → wordmark → slogan → CTA
 *
 * Same conventions as v5: shared Cinema toolkit, deterministic seek(t), one owner per
 * transform (#world = GSAP shakes, #rig = updater handheld, #push = GSAP zooms), 2D
 * transforms only + no layer promotion (bit-identical frames in any seek order), and a
 * full rebuild on backward seeks for the browser preview.
 */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const RENDER = new URLSearchParams(location.search).has('render');
  if (RENDER) document.body.classList.add('render');

  const W = 1080, H = 1920, DURATION = 34.0, FPS = 60, BPM = 120;
  const T = { hook: 0, vortex: 1.75, files: 3.0, modes: 5.9, images: 13.0, capture: 14.3, opinion: 21.0, poster: 24.45, end: 28.5, logo: 30.3 };
  const MODE_AT = [6.05, 7.55, 9.05, 10.55]; // ملخص · شرح مبسّط · خريطة ذهنية · اختبرني
  const VORTEX = { x: 540, y: 1080 };
  // messy pile (card centre x, y, rotation) — later entries land on top
  const PILE = [[330, 900, -14], [765, 885, 12], [525, 1015, -4], [255, 1185, 9], [825, 1160, -10],
    [465, 1305, 16], [690, 1330, -18], [380, 1075, 22], [650, 1045, -8], [545, 1215, 6]];

  const cues = [];
  const cue = (t, type, extra = {}) => cues.push({ t: Math.round(t * 1000) / 1000, type, ...extra });
  const updaters = [];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  /* ───────────────────────── DOM prep (shared pattern with v2–v5) ───────────────────────── */

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

    // file pile: each slot sits at its resting place; the vortex updater offsets it from there
    $$('#pile .fslot').forEach((sl, i) => {
      const [x, y] = PILE[i];
      sl.style.left = `${x - 125}px`;
      sl.style.top = `${y - 150}px`;
    });

    // detection boxes around the three angle labels on the notebook photo
    const ANG = { a1: [274, 446], a2: [478, 462], a3: [325, 320] };
    const box = { d1: ['a1', 128, 84], d2: ['a2', 128, 84], d3: ['a3', 112, 100] };
    for (const [d, [a, w, h]] of Object.entries(box)) {
      const el = $(`#photo .${d}`);
      Object.assign(el.style, { left: `${ANG[a][0] - w / 2}px`, top: `${ANG[a][1] - h / 2}px`, width: `${w}px`, height: `${h}px` });
    }

    // sparkles for the two "live makeover" moments
    const addSparks = (parent, pts) => pts.map(([x, y, s]) => {
      const i = document.createElement('i');
      i.className = 'spark';
      i.textContent = '✦';
      Object.assign(i.style, { left: `${x}px`, top: `${y}px`, fontSize: `${s}px` });
      parent.appendChild(i);
      return i;
    });
    addSparks($('#caseA'), [[640, 812, 44], [860, 850, 34], [610, 958, 30], [890, 968, 46], [760, 790, 28]]);
    addSparks($('#caseB'), [[250, 400, 44], [820, 430, 36], [270, 900, 32], [830, 920, 48], [540, 372, 30]]);

    const dust = $('#dust');
    const r = (() => { let s = 6; return () => { s = (s + 0x6D2B79F5) | 0; let x = Math.imul(s ^ (s >>> 15), 1 | s); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; })();
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

    Cinema.grain($('#grain'), 61, 0.13);
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
  function textIn(sel, t, { stagger = 0.06, dur = 0.7, ease = 'orinIn', rot = 3 } = {}) {
    tl.fromTo(wordsOf(sel), { yPercent: 118, rotation: rot, autoAlpha: 1 },
      { yPercent: 0, rotation: 0, duration: dur, ease, stagger, immediateRender: false }, t);
  }
  function textOut(sel, t, { stagger = 0.03, dur = 0.3, ease = 'power3.in' } = {}) {
    const w = wordsOf(sel);
    tl.to(w, { yPercent: -125, rotation: -3, duration: dur, ease, stagger }, t);
    tl.set(w, { autoAlpha: 0, stagger }, t + dur);
  }
  function textShow(sel, t) { tl.set(wordsOf(sel), { yPercent: 0, rotation: 0, autoAlpha: 1 }, t); }
  function stream(sel, t, stagger = 0.045) {
    tl.fromTo(swOf(sel), { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.22, ease: 'power2.out', stagger, immediateRender: false }, t);
  }
  function shake(t, amp = 16) {
    [1, -0.85, 0.62, -0.42, 0.26, -0.12, 0].forEach((v, i) =>
      tl.to('#world', { x: v * amp, y: -v * amp * 0.55, duration: 0.045, ease: 'sine.inOut' }, t + i * 0.045));
  }
  function flash(t, peak = 0.2) {
    tl.fromTo('#flash', { opacity: 0 }, { opacity: peak, duration: 0.05, ease: 'none', immediateRender: false }, t)
      .to('#flash', { opacity: 0, duration: 0.5, ease: 'power2.out' }, t + 0.05);
  }
  function popIn(el, t, { from = 30, dur = 0.5, ease = 'uiPop', x = 0 } = {}) {
    tl.fromTo(el, { opacity: 0, y: from, x, scale: 0.9 }, { opacity: 1, y: 0, x: 0, scale: 1, duration: dur, ease, immediateRender: false }, t);
  }
  function tap(chip, t) {
    tl.fromTo($('.rip', chip), { opacity: 0.55, scale: 0.2 }, { opacity: 0, scale: 1.7, duration: 0.5, ease: 'power2.out', immediateRender: false }, t);
    tl.fromTo(chip, { scale: 1 }, { scale: 0.94, duration: 0.08, yoyo: true, repeat: 1, ease: 'power2.out', immediateRender: false }, t);
    tl.to(chip, { backgroundColor: '#FF6B56', borderColor: '#FF6B56', color: '#140907', duration: 0.16 }, t + 0.04);
  }
  function untap(chip, t) {
    tl.to(chip, { backgroundColor: '#17171C', borderColor: 'rgba(255,255,255,0.1)', color: '#EDEDF1', duration: 0.2 }, t);
  }
  function sparkle(els, t) {
    els.forEach((s, k) => {
      const tk = t + k * 0.05;
      tl.fromTo(s, { opacity: 0, scale: 0.2, rotation: -40 }, { opacity: 1, scale: 1.15, rotation: 0, duration: 0.3, ease: 'back.out(3)', immediateRender: false }, tk)
        .to(s, { opacity: 0, scale: 0.6, rotation: 40, duration: 0.45, ease: 'power2.in' }, tk + 0.45);
    });
  }
  function whipOut(el, t) { tl.to(el, { x: 1150, duration: 0.4, ease: 'power2.in' }, t); tl.set(el, { autoAlpha: 0 }, t + 0.4); cue(t + 0.04, 'whip'); }
  function whipIn(el, t) { tl.set(el, { autoAlpha: 1 }, t - 0.01); tl.fromTo(el, { x: -1150 }, { x: 0, duration: 0.55, ease: 'expo.out', immediateRender: false }, t); }
  function glowTo(t, x, y, opacity = 0.3, dur = 0.8) { tl.to('#g1', { x, y, opacity, duration: dur, ease: 'power2.inOut' }, t); }

  /* ───────────────────────── scenes ───────────────────────── */

  function buildHook() {
    const slots = $$('#pile .fslot');
    // each card is thrown in from off-screen along its own direction and slams into the pile
    slots.forEach((sl, i) => {
      const card = $('.fcard', sl);
      const [x, , rot] = PILE[i];
      sl._v = { k: 0, rest: PILE[i] };
      if (i < 3) { gsap.set(card, { rotation: rot }); return; }
      const a = (i * 137.5 + 200) * Math.PI / 180;
      const t0 = 0.02 + (i - 3) * 0.13;
      gsap.set(card, { x: Math.cos(a) * 1500, y: Math.sin(a) * 1500 - 300, rotation: rot + 160, opacity: 1 });
      tl.to(card, { x: 0, y: 0, rotation: rot, duration: 0.26, ease: 'power3.in' }, t0);
      tl.fromTo(card, { scale: 1.12 }, { scale: 1, duration: 0.22, ease: 'back.out(3)', immediateRender: false }, t0 + 0.26);
      cue(t0 + 0.26, 'slam', { pan: +((x - 540) / 540).toFixed(2), i });
    });
    [0.28, 0.67, 1.06].forEach((t) => shake(t, 9));

    textIn('#hk1', 0.0, { stagger: 0.06, dur: 0.45 });
    cue(0, 'hit');
    textIn('#hk2', 0.9, { stagger: 0.06, dur: 0.5 });
    cue(0.9, 'word');
    textOut('#hk1', T.vortex - 0.1, { dur: 0.26 });
    textOut('#hk2', T.vortex - 0.06, { dur: 0.26 });

    // the Orin ring opens in the middle of the pile and swallows it
    const RV = ringView($('#ringV'), { x: VORTEX.x, y: VORTEX.y, r: 150, thin: 0.3, rot: -300 });
    cue(T.vortex - 0.05, 'ringIn');
    cue(T.vortex, 'vortex', { until: 2.62 });
    tl.set(RV, { white: 0.1, coral: 0.08, alpha: 1 }, T.vortex - 0.06);
    tl.to(RV, { white: 1, coral: 1, thin: 1, duration: 0.55, ease: 'power3.out' }, T.vortex - 0.05);
    tl.to(RV, { rot: 420, duration: 0.95, ease: 'power2.in' }, T.vortex - 0.05);
    tl.fromTo(RV, { s: 0.5 }, { s: 1, duration: 0.5, ease: 'back.out(2)', immediateRender: false }, T.vortex - 0.05);
    slots.forEach((sl, i) => tl.to(sl._v, { k: 1, duration: 0.72, ease: 'power2.in' }, T.vortex + 0.08 + i * 0.035));
    const [vx, vy] = [VORTEX.x, VORTEX.y];
    updaters.push(() => {
      for (const sl of slots) {
        const v = sl._v, k = v.k;
        if (k <= 0) { sl.style.transform = ''; sl.style.opacity = ''; continue; }
        const [rx, ry] = v.rest;
        const r0 = Math.hypot(rx - vx, ry - vy), a0 = Math.atan2(ry - vy, rx - vx);
        const rad = r0 * Math.pow(1 - k, 1.25);
        const ang = a0 + k * 1.9 * Math.PI;
        const x = vx + Math.cos(ang) * rad - rx, y = vy + Math.sin(ang) * rad - ry;
        const s = Math.max(0.05, 1 - 0.92 * Math.pow(k, 0.85));
        sl.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) rotate(${(k * 540).toFixed(2)}deg) scale(${s.toFixed(4)})`;
        sl.style.opacity = (1 - clamp((k - 0.78) / 0.22)).toFixed(3);
      }
    });
    tl.fromTo('#push', { scale: 1 }, { scale: 1.08, duration: 0.9, ease: 'power2.in', immediateRender: false }, T.vortex);
    tl.to('#g1', { opacity: 0.85, scale: 1.25, duration: 0.9, ease: 'power2.in' }, T.vortex);
    textIn('#hk3', 1.98, { stagger: 0.07, dur: 0.5 });
    cue(1.98, 'word');

    // swallowed → pulse → fly through the ring into scene 01
    const tp = 2.62;
    cue(tp, 'impact', { big: true });
    flash(tp, 0.28);
    shake(tp, 16);
    tl.fromTo(RV, { shockR: 160, shockA: 0.9 }, { shockR: 760, shockA: 0, duration: 0.7, ease: 'expo.out', immediateRender: false }, tp);
    textOut('#hk3', tp + 0.02, { dur: 0.2, stagger: 0.02 });
    tl.to(RV, { s: 9, duration: 0.4, ease: 'expo.in' }, tp + 0.02);
    tl.to(RV, { alpha: 0, duration: 0.1, ease: 'none' }, T.files - 0.1);
    cue(tp + 0.02, 'zoom', { until: T.files });
    tl.to('#push', { scale: 1, duration: 0.38, ease: 'power2.inOut' }, tp);
    tl.set('#hook', { autoAlpha: 0 }, T.files + 0.02);
  }

  function buildFiles() {
    const S = T.files;
    tl.set('#sFiles', { autoAlpha: 1 }, S - 0.02);
    flash(S, 0.2);
    glowTo(S - 0.1, 540, 1150, 0.3, 0.6);
    popIn($('#sFiles .sbadge'), S + 0.02, { from: 14 });
    textIn('#t1a', S + 0.05, { stagger: 0.07, dur: 0.55 });
    cue(S, 'section', { i: 1 });
    $$('#sFiles .tchip').forEach((c, k) => {
      const tk = S + 0.32 + k * 0.06;
      tl.fromTo(c, { opacity: 0, y: 24, scale: 0.7 }, { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: 'back.out(2.5)', immediateRender: false }, tk);
      cue(tk, 'chip', { k });
    });

    // upload a lecture PDF
    const up = $('#upFile');
    popIn(up, S + 0.85, { from: 10, x: -90, dur: 0.55 });
    cue(S + 0.85, 'send');
    tl.fromTo($('.bar i', up), { scaleX: 0 }, { scaleX: 1, duration: 0.8, ease: 'power1.inOut', immediateRender: false }, S + 0.95);
    cue(S + 0.95, 'upload', { until: S + 1.75 });
    tl.fromTo($('.done', up), { opacity: 0, scale: 0.3 }, { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(3)', immediateRender: false }, S + 1.75);
    cue(S + 1.75, 'uploaded');

    // Orin asks how to explain it; the ways to learn appear as chips
    const rep = $('#oReply');
    tl.fromTo($('.avatar', rep), { opacity: 0, scale: 0.4 }, { opacity: 1, scale: 1, duration: 0.45, ease: 'back.out(3)', immediateRender: false }, S + 1.85);
    stream($('p', rep), S + 1.95, 0.06);
    cue(S + 1.9, 'msg');
    const chips = $$('#sFiles .modes .mchip');
    chips.forEach((c, k) => {
      const tk = S + 2.35 + k * 0.06;
      tl.fromTo(c, { opacity: 0, y: 26, scale: 0.85 }, { opacity: 1, y: 0, scale: 1, duration: 0.42, ease: 'uiPop', immediateRender: false }, tk);
      cue(tk, 'chip', { k });
    });

    // same file, every way
    const M = T.modes;
    textOut('#t1a', M - 0.12, { dur: 0.24, stagger: 0.02 });
    textIn('#t1b', M + 0.02, { stagger: 0.06, dur: 0.5 });
    tl.to('#sFiles .types', { opacity: 0, y: -14, duration: 0.25, ease: 'power2.in' }, M - 0.12);
    tl.fromTo('#out', { opacity: 0, y: 50, scale: 0.95 }, { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: 'uiPop', immediateRender: false }, M - 0.05);
    tl.set('#push', { transformOrigin: '540px 1160px' }, M - 0.2);
    tl.fromTo('#push', { scale: 1 }, { scale: 1.035, duration: 12.5 - M, ease: 'none', immediateRender: false }, M);

    const modes = ['#mSum', '#mEasy', '#mMap', '#mQuiz'].map((s) => $(s));
    modes.forEach((m, i) => {
      const t = MODE_AT[i];
      tap(chips[i], t);
      if (i > 0) {
        untap(chips[i - 1], t);
        tl.to(modes[i - 1], { opacity: 0, y: -26, duration: 0.2, ease: 'power2.in' }, t);
      }
      tl.fromTo(m, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.4, ease: 'uiPop', immediateRender: false }, t + 0.1);
      cue(t, 'tap', { k: i });
      cue(t + 0.06, 'swap');
    });
    // 1 · summary
    $$('#mSum li').forEach((li, k) => {
      tl.fromTo(li, { opacity: 0 }, { opacity: 1, duration: 0.15, immediateRender: false }, MODE_AT[0] + 0.2 + k * 0.3);
      stream(li, MODE_AT[0] + 0.2 + k * 0.3, 0.03);
    });
    // 2 · simple analogy: the minibus brakes and you lurch forward
    stream('#mEasy p', MODE_AT[1] + 0.18, 0.04);
    const bus = $('#mEasy .bus');
    gsap.set(bus, { transformOrigin: '20% 100%' });
    tl.fromTo(bus, { x: 60 }, { x: -540, duration: 0.85, ease: 'power3.out', immediateRender: false }, MODE_AT[1] + 0.2);
    tl.fromTo(bus, { rotation: 0 }, { rotation: 9, duration: 0.09, ease: 'power2.out', immediateRender: false }, MODE_AT[1] + 1.02)
      .to(bus, { rotation: 0, duration: 0.45, ease: 'elastic.out(1.1, 0.35)' }, MODE_AT[1] + 1.11);
    cue(MODE_AT[1] + 1.0, 'brake');
    // 3 · mind map draws itself
    const nodes = $$('#mMap .node');
    gsap.set(nodes, { xPercent: -50, yPercent: -50 });
    tl.fromTo(nodes[0], { opacity: 0, scale: 0.4 }, { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(2.5)', immediateRender: false }, MODE_AT[2] + 0.15);
    $$('#mMap .links path').forEach((p, k) => tl.fromTo(p, { strokeDasharray: '0 100' }, { strokeDasharray: '100 100', duration: 0.42, ease: 'power2.out', immediateRender: false }, MODE_AT[2] + 0.3 + k * 0.1));
    nodes.slice(1).forEach((n, k) => tl.fromTo(n, { opacity: 0, scale: 0.4 }, { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(2.5)', immediateRender: false }, MODE_AT[2] + 0.6 + k * 0.12));
    cue(MODE_AT[2] + 0.3, 'draw');
    // 4 · quiz
    stream('#mQuiz .q', MODE_AT[3] + 0.18, 0.04);
    const opts = $$('#mQuiz .qopt');
    opts.forEach((o, k) => popIn(o, MODE_AT[3] + 0.45 + k * 0.1, { from: 20, dur: 0.4 }));
    const ok = opts[1];
    tl.to(ok, { backgroundColor: 'rgba(52,211,153,0.14)', borderColor: '#34D399', duration: 0.2 }, MODE_AT[3] + 1.0);
    tl.fromTo($('.ck', ok), { opacity: 0, scale: 0.3 }, { opacity: 1, scale: 1, duration: 0.45, ease: 'uiPop', immediateRender: false }, MODE_AT[3] + 1.05);
    tl.to(opts[0], { opacity: 0.4, duration: 0.25 }, MODE_AT[3] + 1.0);
    cue(MODE_AT[3] + 1.0, 'correct');

    tl.to('#push', { scale: 1, duration: 0.4, ease: 'power2.in' }, 12.55);
    whipOut('#sFiles', 12.6);
  }

  function buildImages() {
    const S = T.images, C = T.capture;
    const ph = $('#photo');
    whipIn('#sImg', S);
    textShow('#t2', S - 0.01);
    tl.set('#push', { transformOrigin: '540px 690px' }, S - 0.02);
    glowTo(S, 540, 690, 0.3, 0.6);
    cue(S, 'section', { i: 2 });
    // angle labels, centred on their spots on the triangle
    const ANG = { a1: [274, 446], a2: [478, 462], a3: [325, 320], a3s: [325, 320] };
    for (const [a, [x, y]] of Object.entries(ANG)) gsap.set($(`#photo .${a}`), { x, y, xPercent: -50, yPercent: -50 });
    gsap.set('#photo .dbox', { transformOrigin: '50% 50%' });

    // viewfinder locks on
    const cs = $$('.vf .c');
    const off = [[-50, -50], [50, -50], [-50, 50], [50, 50]];
    cs.forEach((c, k) => tl.fromTo(c, { opacity: 0, x: off[k][0], y: off[k][1] }, { opacity: 1, x: 0, y: 0, duration: 0.45, ease: 'expo.out', immediateRender: false }, S + 0.55 + k * 0.03));
    const fc = $('.vf .focus');
    [S + 0.8, S + 1.05].forEach((tk, k) => {
      tl.fromTo(fc, { opacity: 0, scale: 1.5 }, { opacity: 1, scale: 1, duration: 0.18, ease: 'power2.out', immediateRender: false }, tk);
      cue(tk, 'focus', { k });
    });
    // shutter
    cue(C, 'shutter');
    flash(C, 0.75);
    shake(C, 6);
    tl.to([...cs, fc], { opacity: 0, duration: 0.15 }, C + 0.02);
    tl.fromTo('#photo .paper', { scale: 1 }, { scale: 0.955, duration: 0.25, ease: 'power2.out', immediateRender: false }, C);
    tl.fromTo('#push', { scale: 1.03 }, { scale: 1, duration: 0.45, ease: 'expo.out', immediateRender: false }, C);
    // photo docks at the top, then Orin reads it
    tl.to(ph, { scale: 0.72, y: -130, duration: 0.6, ease: 'camera' }, C + 0.25);
    const sc = $('#photo .scan');
    tl.fromTo(sc, { y: 0, opacity: 0 }, { y: 612, duration: 0.9, ease: 'power1.inOut', immediateRender: false }, C + 0.75);
    tl.to(sc, { opacity: 1, duration: 0.12 }, C + 0.75).to(sc, { opacity: 0, duration: 0.15 }, C + 1.52);
    cue(C + 0.75, 'scan', { until: C + 1.65 });
    $$('#photo .dbox').forEach((d, k) => {
      const tk = C + 0.98 + k * 0.2;
      tl.fromTo(d, { opacity: 0, scale: 1.35 }, { opacity: 1, scale: 1, duration: 0.35, ease: 'back.out(2)', immediateRender: false }, tk);
      cue(tk, 'detect', { k });
    });
    glowTo(C + 0.3, 540, 560, 0.28, 0.6);

    // step-by-step solution, and the answer is written back onto the photo
    const sol = $('#sol');
    tl.fromTo(sol, { opacity: 0, y: 60, scale: 0.95 }, { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: 'uiPop', immediateRender: false }, C + 1.6);
    tl.set('#solSteps', { opacity: 1 }, C + 1.6);
    cue(C + 1.6, 'msg');
    $$('#sol .st').forEach((st, k) => {
      const tk = C + 1.8 + k * 0.6;
      tl.fromTo(st, { opacity: 0, x: 40 }, { opacity: 1, x: 0, duration: 0.35, ease: 'power3.out', immediateRender: false }, tk);
      stream($('p', st), tk + 0.08, 0.05);
      cue(tk, 'step', { k });
    });
    const ta = C + 3.3;
    tl.to('#photo .a3', { opacity: 0, scale: 0.4, duration: 0.18, ease: 'power2.in' }, ta);
    tl.fromTo('#photo .a3s', { opacity: 0, scale: 1.8 }, { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(3)', immediateRender: false }, ta + 0.1);
    tl.to('#photo .d3', { borderColor: '#34D399', boxShadow: '0 0 24px rgba(52,211,153,0.6)', duration: 0.25 }, ta + 0.1);
    cue(ta + 0.1, 'answer');

    // …and it can explain the idea behind it
    const [cIdea, cSim] = [$('#cIdea'), $('#cSim')];
    [cIdea, cSim].forEach((c, k) => {
      const tk = C + 3.9 + k * 0.1;
      tl.fromTo(c, { opacity: 0, y: 26, scale: 0.85 }, { opacity: 1, y: 0, scale: 1, duration: 0.42, ease: 'uiPop', immediateRender: false }, tk);
      cue(tk, 'chip', { k });
    });
    const ti = C + 4.5;
    tap(cIdea, ti);
    cue(ti, 'tap', { k: 0 });
    tl.to('#solSteps', { opacity: 0, y: -26, duration: 0.2, ease: 'power2.in' }, ti);
    tl.fromTo('#solIdea', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.4, ease: 'uiPop', immediateRender: false }, ti + 0.1);
    stream('#solIdea p', ti + 0.2, 0.045);
    cue(ti + 0.06, 'swap');

    whipOut('#sImg', 20.6);
  }

  function buildOpinion() {
    const S = T.opinion;
    whipIn('#sOp', S);
    textShow('#t3', S - 0.01);
    tl.set('#push', { transformOrigin: '540px 900px' }, S - 0.02);
    tl.fromTo('#push', { scale: 1 }, { scale: 1.03, duration: 28.0 - S, ease: 'none', immediateRender: false }, S);
    glowTo(S, 540, 700, 0.3, 0.6);
    cue(S, 'section', { i: 3 });

    // A · outfit
    popIn('#capA', S + 0.55, { from: 10, x: -80, dur: 0.5 });
    cue(S + 0.55, 'send');
    const rate = $('#rateA');
    tl.fromTo(rate, { opacity: 0, y: 50, scale: 0.95 }, { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: 'uiPop', immediateRender: false }, S + 1.15);
    cue(S + 1.15, 'msg');
    const SC = { v: 0 };
    const scoreEl = $('#score');
    updaters.push(() => { scoreEl.textContent = SC.v.toFixed(1); });
    tl.fromTo(SC, { v: 0 }, { v: 8.5, duration: 0.85, ease: 'power2.out', immediateRender: false }, S + 1.3);
    tl.fromTo('#rateA .gp', { strokeDasharray: '0 100' }, { strokeDasharray: '85 100', duration: 0.85, ease: 'power2.out', immediateRender: false }, S + 1.3);
    cue(S + 1.3, 'rate', { until: S + 2.15 });
    tl.fromTo('#rateA .fire', { opacity: 0, scale: 0.3, rotation: -20 }, { opacity: 1, scale: 1, rotation: 0, duration: 0.45, ease: 'back.out(3)', immediateRender: false }, S + 2.15);
    cue(S + 2.15, 'rateDone');
    ['#tipA1', '#tipA2'].forEach((id, k) => {
      const tk = S + 2.2 + k * 0.4;
      tl.fromTo(id, { opacity: 0, x: -40 }, { opacity: 1, x: 0, duration: 0.4, ease: 'power3.out', immediateRender: false }, tk);
      cue(tk, 'tip', { k });
    });
    // arrow from the tip to the shoes, which then turn white — a live preview of the advice
    const tip2 = stagePos($('#tipA2')), shoes = stagePos($('#shoes'));
    const a = { x: tip2.l + 70, y: tip2.t - 8 }, b = { x: shoes.l - 14, y: shoes.t + shoes.h * 0.62 };
    const c1 = { x: a.x - 90, y: a.y - 90 }, c2 = { x: b.x - 60, y: b.y + 120 };
    const [arc, head] = $$('#arrA path');
    arc.setAttribute('d', `M${a.x} ${a.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${b.x} ${b.y}`);
    const ang = Math.atan2(b.y - c2.y, b.x - c2.x), L = 26;
    const p1 = { x: b.x - L * Math.cos(ang - 0.5), y: b.y - L * Math.sin(ang - 0.5) }, p2 = { x: b.x - L * Math.cos(ang + 0.5), y: b.y - L * Math.sin(ang + 0.5) };
    head.setAttribute('d', `M${p1.x.toFixed(1)} ${p1.y.toFixed(1)} L${b.x} ${b.y} L${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`);
    tl.fromTo(arc, { strokeDasharray: '0 100' }, { strokeDasharray: '100 100', duration: 0.4, ease: 'power2.inOut', immediateRender: false }, S + 2.8);
    tl.fromTo(head, { strokeDasharray: '0 100' }, { strokeDasharray: '100 100', duration: 0.15, ease: 'none', immediateRender: false }, S + 3.18);
    const tw = S + 3.15;
    tl.to('#shoes .sole', { fill: '#F7F7F5', duration: 0.35, ease: 'power2.inOut' }, tw);
    tl.to('#shoes .rim', { stroke: '#C9C9CF', duration: 0.35, ease: 'power2.inOut' }, tw);
    sparkle($$('#caseA .spark'), tw + 0.05);
    cue(tw, 'morph');

    // B · project poster
    const tb = T.poster;
    tl.to('#caseA', { x: 1150, duration: 0.4, ease: 'power2.in' }, tb);
    tl.set('#caseA', { autoAlpha: 0 }, tb + 0.4);
    tl.set('#caseB', { autoAlpha: 1 }, tb + 0.39);
    tl.fromTo('#caseB', { x: -1150 }, { x: 0, duration: 0.55, ease: 'expo.out', immediateRender: false }, tb + 0.4);
    cue(tb + 0.04, 'whip');
    popIn('#capB', tb + 0.85, { from: 10, x: -80, dur: 0.5 });
    cue(tb + 0.85, 'send');
    tl.fromTo('#fbB', { opacity: 0, y: 50, scale: 0.95 }, { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: 'uiPop', immediateRender: false }, tb + 1.4);
    stream('#fbB p', tb + 1.55, 0.05);
    cue(tb + 1.4, 'msg');
    $$('#poster .ring-note').forEach((n, k) => {
      const tk = tb + 1.75 + k * 0.18;
      tl.fromTo(n, { opacity: 0, scale: 1.12 }, { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(2)', immediateRender: false }, tk);
      cue(tk, 'detect', { k });
    });
    const tm = tb + 2.45;
    tl.to('#poster .ring-note', { opacity: 0, duration: 0.2 }, tm);
    tl.fromTo('#poster .after', { clipPath: 'inset(0% 0% 0% 100%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.6, ease: 'power2.inOut', immediateRender: false }, tm);
    const wl = $('#poster .wipe-line');
    tl.fromTo(wl, { x: 600, opacity: 1 }, { x: 0, duration: 0.6, ease: 'power2.inOut', immediateRender: false }, tm);
    tl.to(wl, { opacity: 0, duration: 0.15 }, tm + 0.6);
    sparkle($$('#caseB .spark'), tm + 0.45);
    cue(tm, 'morph');
    const bt = $('#better');
    tl.fromTo(bt, { opacity: 0, scale: 1.8, rotation: 10 }, { opacity: 1, scale: 1, rotation: -5, duration: 0.25, ease: 'power4.in', immediateRender: false }, tm + 0.65);
    shake(tm + 0.9, 8);
    cue(tm + 0.9, 'pop');

    tl.to('#push', { scale: 1, duration: 0.42, ease: 'power2.in' }, 28.05);
    tl.to('#sOp', { scale: 0.92, autoAlpha: 0, duration: 0.42, ease: 'power2.in' }, 28.05);
    cue(28.05, 'out');
  }

  function buildEnd() {
    const E = T.end, L = T.logo;
    tl.set('#end', { autoAlpha: 1 }, E - 0.02);
    tl.set('#push', { transformOrigin: '540px 960px' }, E - 0.02);
    glowTo(E - 0.1, 540, 700, 0.35, 0.6);
    const chips = ['#r1', '#r2', '#r3'].map((s) => $(s));
    chips.forEach((c, k) => {
      const tk = E + 0.05 + k * 0.2;
      tl.fromTo(c, { opacity: 0, x: k % 2 ? -260 : 260, scale: 0.9 }, { opacity: 1, x: 0, scale: 1, duration: 0.5, ease: 'orinIn', immediateRender: false }, tk);
      cue(tk, 'recap', { k });
    });
    textIn('#rline', E + 0.75, { stagger: 0.07, dur: 0.55 });
    cue(E + 0.75, 'pop');
    // everything folds into the logo
    const tc = L - 0.4;
    chips.forEach((c, k) => {
      const p = stagePos(c);
      tl.to(c, { x: 540 - p.x, y: 700 - p.y, scale: 0.15, autoAlpha: 0, duration: 0.38, ease: 'power2.in' }, tc + k * 0.04);
    });
    textOut('#rline', tc, { dur: 0.25, stagger: 0.02 });
    cue(tc - 0.15, 'converge', { until: L });

    const RB = ringView($('#ringB'), { x: 540, y: 700, r: 150, thin: 0.3, rot: -560 });
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
    tl.to('#g1', { opacity: 0.9, scale: 1.1, duration: 1.2, ease: 'expo.out' }, L + 0.4);
    tl.fromTo($$('#endWordmark .ch'), { yPercent: 110, autoAlpha: 1 }, { yPercent: 0, duration: 0.85, ease: 'expo.out', stagger: 0.05, immediateRender: false }, L + 0.45);
    textIn('#slogan', L + 0.9, { stagger: 0.07, dur: 0.6 });
    const cta = $('#cta');
    tl.to(cta, { opacity: 1, scale: 1, duration: 0.7, ease: 'uiPop' }, L + 1.45);
    cue(L + 1.45, 'cta');
    [L + 2.0, L + 2.9].forEach((t) => Cinema.sweep(tl, cta, t, { dur: 0.75, color: 'rgba(255,255,255,.7)' }));
    tl.to(cta, { scale: 1.045, duration: 0.18, yoyo: true, repeat: 1, ease: 'power2.out' }, L + 2.55);
  }

  /* ───────────────────────── build ───────────────────────── */

  function build() {
    // Always write 2D transforms and let nothing be promoted to its own compositor layer
    // (see v6.css): a promoted layer keeps the raster scale it was created at, so text
    // inside a zoom renders differently depending on how the renderer seeked to the frame.
    gsap.config({ force3D: false });
    tl = gsap.timeline({ paused: true });

    gsap.set($$('.wi'), { yPercent: 118, autoAlpha: 0 });
    gsap.set($$('.wordmark .ch'), { yPercent: 110, autoAlpha: 0 });
    gsap.set('.scene, #end, #caseB', { autoAlpha: 0 });
    gsap.set('#sFiles .sbadge, #sFiles .tchip, #upFile, #oReply .avatar, .mchip, #out, #sol, #capA, #rateA, #capB, #fbB', { opacity: 0 });
    gsap.set('#cta', { opacity: 0, scale: 0.3 });
    gsap.set('#cta .shine', { x: -260, rotation: 18 });
    gsap.set('.rchip', { opacity: 0 });
    gsap.set('#g1', { x: VORTEX.x, y: VORTEX.y, scale: 1, opacity: 0.35 });
    gsap.set('#g2', { x: 900, y: 300, opacity: 0.16 });
    gsap.set('#grid', { opacity: 0.32 });
    gsap.set('#push', { transformOrigin: `${VORTEX.x}px ${VORTEX.y}px` });

    buildHook();
    buildFiles();
    buildImages();
    buildOpinion();
    buildEnd();

    // camera: gentle handheld everywhere, a touch livelier during the hook's chaos
    const rig = $('#rig');
    updaters.push((t) => {
      const k = t < T.vortex ? 1 : Math.exp(-(t - T.vortex) / 0.6);
      const h = Cinema.handheld(t, { amp: 1.6 + 3.2 * k, rotAmp: 0.15 + 0.3 * k, seed: 13 });
      Cinema.applyCamera(rig, { x: h.x, y: h.y, rot: h.rot, scale: 1 });
    });

    tl.set({}, {}, DURATION);
  }

  /* ───────────────────────── player ───────────────────────── */

  // Forward seeks are exact (the renderer only ever seeks forward); a backward seek (preview
  // loop / scrubbing) rebuilds the composition from the pristine markup — see v5.js.
  let RAW = '', lastT = 0;
  function rebuild() {
    tl.kill();
    updaters.length = 0;
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
    await Promise.all(['700 100px Alexandria', '800 100px Alexandria', '400 30px Readex', '500 30px Readex', '600 30px Readex', '700 30px Readex', '600 30px Outfit', '700 30px Outfit', '800 30px Outfit', '700 50px Ruqaa']
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

  const AD_ID = document.body.dataset.ad || 'v6';
  window.ORIN = { id: AD_ID, soundtrack: 'soundtrack_v6.py', ready, seek, cues, T, W, H, FPS, BPM, get duration() { return DURATION; } };

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
