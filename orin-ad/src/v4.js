/*
 * Orin — ad v4 "نفس الطالب، فرق واحد" (split screen, ~24.6s, 1080×1920).
 *
 * Built on the shared Cinema toolkit (src/cinema.js): custom eases, a handheld camera
 * per panel, light sweeps, lens flares, chromatic-aberration impact bursts and a
 * grade pass on #world. The renderer's `--shutter` supersamples motion blur on top of
 * all of it — this file only needs to move things at a believable speed.
 *
 *   0.00–1.30   hook slam: "نفس الطالب… والفرق؟ 👀"
 *   1.30–12.60  split screen, three parallel beats (right=chaos/بدون Orin,
 *               left=calm/مع Orin — right reads first in RTL, so the problem lands
 *               before the resolution)
 *   12.60–13.35 coral wipe erases the chaos side
 *   13.35–15.60 unified line: "الفرق كله… مساعد ذكي وحد 🤝"
 *   15.60–24.60 logo reveal → wordmark → slogan → CTA
 */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const RENDER = new URLSearchParams(location.search).has('render');
  if (RENDER) document.body.classList.add('render');

  const W = 1080, H = 1920, DURATION = 24.6, FPS = 60, BPM = 120;
  const T = { slam: 0, split: 1.3, beatA: 2.0, beatB: 5.6, beatC: 9.2, wipe: 12.6, unified: 13.35, logo: 15.6 };

  const cues = [];
  const cue = (t, type, extra = {}) => cues.push({ t: Math.round(t * 1000) / 1000, type, ...extra });
  const updaters = [];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  /* ───────────────────────── DOM prep (shared pattern with v2/v3) ───────────────────────── */

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

    // draw-on setup for the result badges (circle ring + X / check glyph)
    $$('.badge svg').forEach((svg) => {
      const path = $('.x, .ck', svg);
      const len = path.getTotalLength();
      path.style.strokeDasharray = String(len);
      path.style.strokeDashoffset = String(len);
    });

    const dust = $('#dust');
    const r = (() => { let s = 4; return () => { s = (s + 0x6D2B79F5) | 0; let x = Math.imul(s ^ (s >>> 15), 1 | s); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; })();
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

    Cinema.grain($('#grain'), 99, 0.13);
  }

  function ringView(svg, init) {
    const g = $('.ring-g', svg), shock = $('.shock', svg), pw = $('.pw', svg), pc = $('.pc', svg);
    const st = Object.assign({ x: 540, y: 960, s: 1, r: 240, rot: 0, white: 0, coral: 0, thin: 1, alpha: 1, shockR: 0, shockA: 0 }, init);
    let key = '';
    updaters.push(() => {
      g.setAttribute('transform', `translate(${st.x.toFixed(2)} ${st.y.toFixed(2)}) scale(${st.s.toFixed(4)})`);
      svg.style.opacity = st.alpha.toFixed(3);
      shock.setAttribute('cx', st.x.toFixed(1));
      shock.setAttribute('cy', st.y.toFixed(1));
      shock.setAttribute('r', Math.max(1, st.shockR).toFixed(1));
      shock.setAttribute('opacity', st.shockA.toFixed(3));
      const k = [st.white, st.coral, st.thin, st.rot].map((v) => v.toFixed(4)).join('|');
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
  function textIn(sel, t, { stagger = 0.06, dur = 0.7, ease = 'orinIn', rot = 3 } = {}) {
    tl.fromTo(wordsOf(sel), { yPercent: 118, rotation: rot, autoAlpha: 1 },
      { yPercent: 0, rotation: 0, duration: dur, ease, stagger, immediateRender: false }, t);
  }
  function textOut(sel, t, { stagger = 0.03, dur = 0.32, ease = 'power3.in' } = {}) {
    const w = wordsOf(sel);
    tl.to(w, { yPercent: -125, rotation: -3, duration: dur, ease, stagger }, t);
    tl.set(w, { autoAlpha: 0, stagger }, t + dur);
  }
  function shake(t, amp = 16) {
    [1, -0.85, 0.62, -0.42, 0.26, -0.12, 0].forEach((v, i) =>
      tl.to('#world', { x: v * amp, y: -v * amp * 0.55, duration: 0.045, ease: 'sine.inOut' }, t + i * 0.045));
  }
  function flash(t, peak = 0.2) {
    tl.fromTo('#flash', { opacity: 0 }, { opacity: peak, duration: 0.05, ease: 'none', immediateRender: false }, t)
      .to('#flash', { opacity: 0, duration: 0.5, ease: 'power2.out' }, t + 0.05);
  }
  function popIn(el, t, { from = 30, dur = 0.5, ease = 'uiPop' } = {}) {
    tl.fromTo(el, { opacity: 0, y: from, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, duration: dur, ease, immediateRender: false }, t);
  }
  function popOut(el, t, dur = 0.28) {
    tl.to(el, { opacity: 0, scale: 0.92, duration: dur, ease: 'power2.in' }, t);
  }

  /* ───────────────────────── build ───────────────────────── */

  function build() {
    tl = gsap.timeline({ paused: true });

    gsap.set($$('.wi'), { yPercent: 118, autoAlpha: 0 });
    gsap.set($$('.wordmark .ch'), { yPercent: 110, autoAlpha: 0 });
    gsap.set('#splitScene', { autoAlpha: 0 });
    gsap.set('#divider', { scaleY: 0 });
    gsap.set('.panel.chaos .pcam', { x: 260, rotation: 4 });
    gsap.set('.panel.calm .pcam', { x: -260, rotation: -4 });
    gsap.set('.ptag', { opacity: 0, scale: 0.6 });
    gsap.set('.beat', { opacity: 0 });
    gsap.set('#unified', { autoAlpha: 0 });
    gsap.set('#end', { autoAlpha: 0 });
    gsap.set('#cta', { opacity: 0, scale: 0.3 });
    gsap.set('#cta .shine', { x: -260, rotation: 18 });
    gsap.set('#world', { filter: 'none' });
    gsap.set($$('.badge circle'), { strokeDasharray: '0 100' }); // ring hidden until it draws on (pathLength=100)
    gsap.set('#g1', { x: 540, y: 960, scale: 1.1, opacity: 0.16 });
    gsap.set('#g2', { x: 180, y: 320, opacity: 0.22 });
    gsap.set('#grid', { opacity: 0.35 });
    gsap.set($('#wipeCoral'), { scale: 0 });

    /* ================= HOOK ================= */
    cue(0, 'tension', { until: T.wipe });
    cue(0, 'slam', { big: true });
    flash(0.0, 0.22);
    shake(0.03, 20);
    Cinema.chromaBurst(tl, $('#hk1'), 0.02, { amp: 14 });
    tl.to('#g1', { opacity: 0.55, duration: 0.4, ease: 'power2.out' }, 0);
    textIn('#hk1', 0.04, { stagger: 0.07, dur: 0.55 });
    tl.fromTo('#hk1', { scale: 1.5 }, { scale: 1, duration: 0.4, ease: 'orinIn', immediateRender: false }, 0.04);
    textOut('#hk1', 0.6, { dur: 0.26 });

    cue(0.72, 'slam', { big: true });
    flash(0.72, 0.18);
    shake(0.75, 14);
    Cinema.chromaBurst(tl, $('#hk2'), 0.71, { amp: 16 });
    textIn('#hk2', 0.74, { stagger: 0.08, dur: 0.55 });
    tl.fromTo('#hk2', { scale: 1.4 }, { scale: 1, duration: 0.4, ease: 'orinIn', immediateRender: false }, 0.74);
    textOut('#hk2', T.split - 0.24, { dur: 0.22, stagger: 0.02 });
    tl.to('#hook', { autoAlpha: 0, duration: 0.01 }, T.split);

    /* ================= SPLIT FORMS ================= */
    cue(T.split, 'splitOpen');
    tl.set('#splitScene', { autoAlpha: 1 }, T.split);
    tl.fromTo('#divider', { scaleY: 0 }, { scaleY: 1, duration: 0.3, ease: 'power3.out', immediateRender: false }, T.split);
    tl.to('.panel.chaos .pcam', { x: 0, rotation: 0, duration: 0.55, ease: 'orinIn' }, T.split);
    tl.to('.panel.calm .pcam', { x: 0, rotation: 0, duration: 0.55, ease: 'orinIn' }, T.split);
    popIn($('#panelChaos .ptag'), T.split + 0.22);
    popIn($('#panelCalm .ptag'), T.split + 0.3);
    tl.to('#g1', { opacity: 0.14, duration: 0.4 }, T.split);

    // ---- per-panel handheld camera: chaos shakes hard with jolts at each beat's
    // start, calm barely drifts. Pure function of t, written to .pshake — a layer
    // nested *inside* the GSAP-tweened .pcam so the two never fight over one
    // element's transform (.pcam owns the entrance slide; .pshake owns the noise).
    const chaosCam = $('.panel.chaos .pshake'), calmCam = $('.panel.calm .pshake');
    const jolt = (t, at, dur = 0.5, peak = 1) => {
      const d = (t - at) / dur;
      return d < 0 || d > 1 ? 0 : peak * Math.exp(-d * 5) * Math.sin(d * 40);
    };
    updaters.push((t) => {
      if (t < T.split - 0.1 || t > T.wipe + 0.05) return;
      const jc = jolt(t, T.beatA, 0.6, 10) + jolt(t, T.beatC + 0.18, 0.7, 14);
      const hc = Cinema.handheld(t, { amp: 5, rotAmp: 0.9, seed: 3 });
      Cinema.applyCamera(chaosCam, { x: hc.x + jc, y: hc.y + jc * 0.4, rot: hc.rot, scale: 1 });
      const hk = Cinema.handheld(t, { amp: 1.1, rotAmp: 0.15, seed: 21, speed: 0.7 });
      Cinema.applyCamera(calmCam, { x: hk.x, y: hk.y, rot: hk.rot, scale: 1 });
    });

    // ---- clock hands: frantic vs steady (also pure functions of t)
    const chaosHands = { hh: $('#cA .hh'), mm: $('#cA .mm') };
    const calmHands = { hh: $('#oA .hh'), mm: $('#oA .mm') };
    updaters.push((t) => {
      const mm = 360 * 2.6 * t + 55 * Cinema.noise1D(t * 2.2, 5);
      const hh = 190 + 30 * Cinema.noise1D(t * 3.6, 11);
      chaosHands.mm.style.transform = `rotate(${mm.toFixed(1)}deg)`;
      chaosHands.hh.style.transform = `rotate(${hh.toFixed(1)}deg)`;
      const mmC = 360 * 0.45 * t;
      const hhC = 130 + 5 * Math.sin(t * 0.6);
      calmHands.mm.style.transform = `rotate(${mmC.toFixed(1)}deg)`;
      calmHands.hh.style.transform = `rotate(${hhC.toFixed(1)}deg)`;
    });

    /* ================= BEATS ================= */
    const beats = [
      { t: T.beatA, chaos: '#cA', calm: '#oA', dur: T.beatB - T.beatA },
      { t: T.beatB, chaos: '#cB', calm: '#oB', dur: T.beatC - T.beatB },
      { t: T.beatC, chaos: '#cC', calm: '#oC', dur: T.wipe - T.beatC },
    ];
    beats.forEach((b, i) => {
      const tOut = b.t + b.dur - 0.32;
      cue(b.t - 0.06, 'chaosWhoosh', { pan: 0.7 });
      cue(b.t, 'calmWhoosh', { pan: -0.7 });
      popIn($(b.chaos), b.t, { from: 46, dur: 0.5 });
      popIn($(b.calm), b.t + 0.06, { from: 46, dur: 0.5 });
      textIn(`${b.chaos} .bline`, b.t + 0.04, { stagger: 0.05, dur: 0.5 });
      textIn(`${b.calm} .bline`, b.t + 0.1, { stagger: 0.05, dur: 0.5 });
      textOut(`${b.chaos} .bline`, tOut, { dur: 0.22, stagger: 0.02 });
      textOut(`${b.calm} .bline`, tOut, { dur: 0.22, stagger: 0.02 });
      popOut($(b.chaos), tOut + 0.02);
      popOut($(b.calm), tOut + 0.02);

      if (i === 0) {
        for (let k = 0; k < 6; k++) cue(b.t + 0.4 + k * 0.42 + Math.sin(k) * 0.05, 'chaosPulse', { pan: 0.75 });
        for (let k = 0; k < 5; k++) cue(b.t + 0.5 + k * 0.55, 'calmPulse', { pan: -0.75 });
      } else if (i === 1) {
        const pile = $('#cB .pile');
        $$('.sheet', pile).forEach((sh, k, all) => {
          const n = all.length - 1 - k;
          tl.fromTo(sh, { y: -220, rotation: (k - 1) * 14, opacity: 0 }, { y: n * -10, rotation: (k - 1) * 6, opacity: 1, duration: 0.4, ease: 'back.out(1.5)', immediateRender: false }, b.t + 0.1 + (all.length - 1 - n) * 0.08);
          cue(b.t + 0.1 + (all.length - 1 - n) * 0.08, 'chaosPulse', { pan: 0.75 });
        });
        tl.to(pile, { rotation: 2, duration: 0.08, yoyo: true, repeat: 5, ease: 'sine.inOut' }, b.t + 0.7);
        const card = $('#oB .card');
        tl.fromTo(card, { scale: 0.7, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: 'uiPop', immediateRender: false }, b.t + 0.18);
        cue(b.t + 0.18, 'calmPulse', { pan: -0.75 });
        tl.fromTo($$('.sw', card), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.2, ease: 'power2.out', stagger: 0.05, immediateRender: false }, b.t + 0.55);
        popIn($('.ok-chip', card), b.t + 1.1, { from: 14 });
        cue(b.t + 1.1, 'calmPulse', { pan: -0.75 });
        Cinema.sweep(tl, card, b.t + 1.3, { dur: 0.6 });
      } else {
        const badC = $('#cC .badge'), badO = $('#oC .badge');
        tl.fromTo(badC, { scale: 0.5, rotation: -10 }, { scale: 1, rotation: 0, duration: 0.35, ease: 'power4.in', immediateRender: false }, b.t + 0.35);
        tl.to($('.badge.bad circle'), { strokeDasharray: '100 100', duration: 0.35, ease: 'power2.out' }, b.t + 0.35);
        tl.to($('#cC .x'), { strokeDashoffset: 0, duration: 0.3, ease: 'power2.out' }, b.t + 0.4);
        cue(b.t + 0.35, 'chaosHit', { pan: 0.85 });
        shake(b.t + 0.35, 12);
        Cinema.chromaBurst(tl, badC, b.t + 0.35, { amp: 16 });
        popIn($('#cC .grade'), b.t + 0.65, { from: 16 });

        tl.fromTo(badO, { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.55, ease: 'uiPop', immediateRender: false }, b.t + 0.55);
        tl.to($('.badge.good circle'), { strokeDasharray: '100 100', duration: 0.45, ease: 'power2.out' }, b.t + 0.55);
        tl.to($('#oC .ck'), { strokeDashoffset: 0, duration: 0.4, ease: 'power2.out' }, b.t + 0.62);
        cue(b.t + 0.85, 'calmHit', { pan: -0.85 });
        Cinema.sweep(tl, badO, b.t + 0.9, { dur: 0.7 });
        popIn($('#oC .grade'), b.t + 1.0, { from: 16 });
      }
    });

    /* ================= WIPE ================= */
    cue(T.wipe - 0.5, 'riser', { until: T.wipe });
    cue(T.wipe, 'collapse');
    Cinema.flarePulse(tl, $('#stage'), 540, 960, T.wipe - 0.04, { peak: 1, dur: 1.0 });
    tl.fromTo($('#wipeCoral'), { scale: 0 }, { scale: 1, duration: 0.42, ease: 'power2.in', immediateRender: false }, T.wipe);
    shake(T.wipe, 16);
    flash(T.wipe + 0.05, 0.3);
    tl.set('#splitScene', { autoAlpha: 0 }, T.wipe + 0.4);
    tl.to($('#wipeCoral'), { opacity: 0, duration: 0.4, ease: 'power2.out' }, T.wipe + 0.42);
    tl.set($('#wipeCoral'), { scale: 0, opacity: 1 }, T.wipe + 0.85);

    /* ================= UNIFIED MESSAGE ================= */
    tl.set('#unified', { autoAlpha: 1 }, T.unified - 0.05);
    Cinema.tweenGrade(tl, $('#world'), 'neutral', T.unified, 0.5);
    tl.to('#g1', { opacity: 0.5, scale: 1, duration: 0.6, ease: 'power2.out' }, T.unified);
    tl.to('#grid', { opacity: 0.8, duration: 0.5 }, T.unified);
    textIn('#uni1', T.unified + 0.02, { stagger: 0.07, dur: 0.55 });
    textIn('#uni2', T.unified + 0.55, { stagger: 0.06, dur: 0.6 });
    cue(T.unified + 0.55, 'pop');
    const uni2 = $('#uni2');
    Cinema.sweep(tl, uni2, T.unified + 1.15, { dur: 0.7 });
    textOut('#uni1', T.logo - 0.42, { dur: 0.24, stagger: 0.02 });
    textOut('#uni2', T.logo - 0.36, { dur: 0.24, stagger: 0.02 });
    tl.to('#unified', { scale: 1.06, duration: T.logo - T.unified, ease: 'camera' }, T.unified);

    /* ================= LOGO + END CARD ================= */
    tl.set('#end', { autoAlpha: 1 }, T.logo - 0.1);
    const RB = ringView($('#ringB'), { x: 540, y: 655, r: 175, thin: 0.3, rot: -560 });
    cue(T.logo, 'impact', { big: true });
    flash(T.logo, 0.16);
    shake(T.logo, 14);
    Cinema.flarePulse(tl, $('#end'), 540, 655, T.logo + 0.05, { peak: 0.9, dur: 1.1, color: '255,107,86' });
    tl.set(RB, { white: 0.28, coral: 0.22 }, T.logo - 0.02);
    tl.to(RB, { white: 1, duration: 0.9, ease: 'power3.inOut' }, T.logo);
    tl.to(RB, { coral: 1, duration: 0.85, ease: 'power3.inOut' }, T.logo + 0.05);
    tl.to(RB, { thin: 1, duration: 0.6, ease: 'power2.inOut' }, T.logo + 0.25);
    tl.to(RB, { rot: 0, duration: 1.05, ease: 'expo.out' }, T.logo - 0.02);
    tl.fromTo(RB, { shockR: 180, shockA: 0.8 }, { shockR: 900, shockA: 0, duration: 1.1, ease: 'expo.out', immediateRender: false }, T.logo + 0.85);
    cue(T.logo + 0.85, 'chime');
    tl.to('#g1', { y: 680, opacity: 0.9, scale: 1.1, duration: 1.2, ease: 'expo.out' }, T.logo + 0.6);
    Cinema.tweenGrade(tl, $('#world'), 'warm', T.logo + 0.3, 1.0);

    tl.fromTo($$('#endWordmark .ch'), { yPercent: 110, autoAlpha: 1 }, { yPercent: 0, duration: 0.85, ease: 'expo.out', stagger: 0.05, immediateRender: false }, T.logo + 0.55);
    textIn('#slogan', T.logo + 1.0, { stagger: 0.07, dur: 0.6 });
    const cta = $('#cta');
    tl.to(cta, { opacity: 1, scale: 1, duration: 0.7, ease: 'uiPop' }, T.logo + 1.6);
    cue(T.logo + 1.6, 'pop');
    [T.logo + 2.35, T.logo + 3.45, T.logo + 4.55].forEach((t) => Cinema.sweep(tl, cta, t, { dur: 0.75, color: 'rgba(255,255,255,.7)' }));
    [T.logo + 3.0, T.logo + 4.1].forEach((t) => tl.to(cta, { scale: 1.045, duration: 0.18, yoyo: true, repeat: 1, ease: 'power2.out' }, t));

    // ambient post-wipe camera (its own element — never fought over with shake())
    updaters.push((t) => {
      if (t < T.wipe) return;
      const h = Cinema.handheld(t, { amp: 2.2, rotAmp: 0.25, seed: 41, speed: 0.8 });
      Cinema.applyCamera($('#camPost'), { x: h.x, y: h.y, rot: h.rot, scale: 1 });
    });

    tl.set({}, {}, DURATION);
  }

  /* ───────────────────────── player ───────────────────────── */

  function seek(t) {
    t = clamp(t, 0, DURATION);
    tl.seek(t, false);
    for (const u of updaters) u(t);
  }

  const ready = (async () => {
    await Promise.all(['700 100px Alexandria', '800 100px Alexandria', '400 30px Readex', '500 30px Readex', '600 30px Readex', '600 30px Outfit', '700 30px Outfit']
      .map((f) => document.fonts.load(f, 'Orin 0123456789 …عربي')));
    await document.fonts.ready;
    prepDOM();
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    build();
    cues.sort((a, b) => a.t - b.t);
    seek(0);
    return true;
  })();

  window.ORIN = { id: 'v4', soundtrack: 'soundtrack_v4.py', ready, seek, cues, T, W, H, FPS, BPM, get duration() { return DURATION; } };

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
