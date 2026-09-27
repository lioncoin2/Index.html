/*
 * Orin — ad v2 "problem → solution" (30s, 1080×1920).
 *
 *   0–2.6 s   hook: "وقف! ✋" slam → "4 مشاكل تدمّر مذاكرتك"
 *   4 pairs   each 5.6 s: problem (glitchy, red, 2.3 s) → struck out → solution with Orin (3.3 s)
 *   25–30 s   "كل مشكلة… لها حل ✓" → logo, slogan, download CTA
 *
 * Same contract as timeline.js: everything is a pure function of time, driven by
 * `ORIN.seek(t)`; `ORIN.cues` feeds render/soundtrack_v2.py.
 */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const RENDER = new URLSearchParams(location.search).has('render');
  if (RENDER) document.body.classList.add('render');

  const W = 1080, H = 1920, DURATION = 30, FPS = 60, BPM = 120;
  const P0 = 2.6;     // first problem
  const PD = 5.6;     // one problem + solution
  const SOL = 2.3;    // solution starts this long after its problem
  const PAIRS = [0, 1, 2, 3].map((i) => +(P0 + i * PD).toFixed(3));
  const T = { hook: 0, pairs: PAIRS, sol: SOL, pd: PD, outro: +(P0 + 4 * PD).toFixed(3), logo: 26.3 };

  const cues = [];
  const cue = (t, type, extra = {}) => cues.push({ t: Math.round(t * 1000) / 1000, type, ...extra });
  const updaters = [];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  function rng(seed) {
    return () => {
      seed = (seed + 0x6D2B79F5) | 0;
      let x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ───────────────────────── DOM prep ───────────────────────── */

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
    $$('[data-logo]').forEach((el) => { el.innerHTML = OrinLogo.logoSVG(+el.dataset.logo); });
    $$('[data-split]').forEach((el) => splitText(el, 'mask'));
    $$('[data-stream]').forEach((el) => splitText(el, 'stream'));
    $$('[data-letters]').forEach(splitLetters);
    $$('.strike').forEach((s) => { s.innerHTML = '<i></i><i></i>'; });

    const dust = $('#dust');
    const r = rng(5);
    for (let i = 0; i < 34; i++) {
      const d = document.createElement('i');
      const size = 2 + r() * 5;
      Object.assign(d.style, { position: 'absolute', left: '0', top: '0', width: size + 'px', height: size + 'px', borderRadius: '50%', background: r() < 0.25 ? '#FF8A70' : '#fff' });
      d._p = { x: r() * W, y: r() * (H + 200), v: 18 + r() * 46, a: 0.12 + r() * 0.3, f: 0.2 + r() * 0.5, ph: r() * 6.28, amp: 10 + r() * 30 };
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

    const cv = document.createElement('canvas');
    cv.width = cv.height = 256;
    const cx = cv.getContext('2d');
    const img = cx.createImageData(256, 256);
    const gr = rng(99);
    for (let i = 0; i < img.data.length; i += 4) {
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 128 + ((gr() + gr() + gr()) / 3 - 0.5) * 255;
      img.data[i + 3] = 255;
    }
    cx.putImageData(img, 0, 0);
    $('#grain').style.backgroundImage = `url(${cv.toDataURL('image/png')})`;
  }

  function ringView(svg, init) {
    const g = $('.ring-g', svg), shock = $('.shock', svg), pw = $('.pw', svg), pc = $('.pc', svg);
    const st = Object.assign({ x: 540, y: 960, s: 1, r: 240, rot: 0, white: 0, coral: 0, thin: 1, alpha: 1, shockR: 0, shockA: 0 }, init);
    let key = '';
    updaters.push(() => {
      g.setAttribute('transform', `translate(${st.x.toFixed(2)} ${st.y.toFixed(2)}) scale(${st.s.toFixed(4)})`);
      svg.style.opacity = st.alpha.toFixed(3);
      if (shock) {
        shock.setAttribute('cx', st.x.toFixed(1));
        shock.setAttribute('cy', st.y.toFixed(1));
        shock.setAttribute('r', Math.max(1, st.shockR).toFixed(1));
        shock.setAttribute('opacity', st.shockA.toFixed(3));
      }
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
  function textIn(sel, t, { stagger = 0.06, dur = 0.7, ease = 'expo.out', rot = 3 } = {}) {
    tl.fromTo(wordsOf(sel), { yPercent: 118, rotation: rot, autoAlpha: 1 },
      { yPercent: 0, rotation: 0, duration: dur, ease, stagger, immediateRender: false }, t);
  }
  function textOut(sel, t, { stagger = 0.03, dur = 0.36, ease = 'power3.in' } = {}) {
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
  function redPulse(t, peak = 0.9) {
    tl.fromTo('#redPulse', { opacity: 0 }, { opacity: peak, duration: 0.06, ease: 'none', immediateRender: false }, t)
      .to('#redPulse', { opacity: 0, duration: 0.6, ease: 'power2.out' }, t + 0.06);
  }
  // RGB-split jitter on an element for n frames of ~40 ms
  function glitch(el, t, n = 6) {
    const r = rng(Math.round(t * 1000));
    for (let k = 0; k < n; k++) {
      const a = (4 + r() * 9).toFixed(0), b = (4 + r() * 9).toFixed(0);
      tl.set(el, { x: (r() - 0.5) * 30, textShadow: `${a}px 0 rgba(255,60,80,.85), -${b}px 0 rgba(70,200,255,.75)` }, t + k * 0.04);
    }
    tl.set(el, { x: 0, textShadow: 'none' }, t + n * 0.04);
  }
  function popIn(el, t, sound = 'blip', fromY = 30) {
    tl.fromTo(el, { opacity: 0, y: fromY, scale: 0.94 }, { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: 'back.out(1.5)', immediateRender: false }, t);
    if (sound) cue(t, sound);
  }
  // a number that counts up, written by an updater
  function counter(el, from, to, t, dur, fmt = (v) => String(Math.round(v))) {
    const p = { v: from };
    tl.fromTo(p, { v: from }, { v: to, duration: dur, ease: 'power2.out', immediateRender: false }, t);
    updaters.push(() => { const s = fmt(p.v); if (el.textContent !== s) el.textContent = s; });
    return p;
  }

  /* ───────────────────────── build ───────────────────────── */

  function build() {
    tl = gsap.timeline({ paused: true });

    gsap.set($$('.wi'), { yPercent: 118, autoAlpha: 0 });
    gsap.set($$('.wordmark .ch'), { yPercent: 110, autoAlpha: 0 });
    gsap.set(['#stop', '#four'], { autoAlpha: 0 });
    gsap.set($$('.pair, .prob, .sol'), { autoAlpha: 0 });
    gsap.set($$('.tag, .illo, .demo, .pop, .msg.ai, .bubble, .book .q, .chip, .stack .sheet, .stack .counter, .group .gmsg, .group .gmeta, .group .gnone, .exam .grade'), { opacity: 0 });
    gsap.set('#g1', { x: 540, y: 900, scale: 1, opacity: 0.25 });
    gsap.set('#g2', { x: 180, y: 320, opacity: 0 });
    gsap.set('#gBad', { x: 540, y: 1050, opacity: 0 });
    gsap.set('#grid', { opacity: 0.6 });
    gsap.set('#cta', { opacity: 0, scale: 0.3 });
    gsap.set('#cta .shine', { x: -260, rotation: 18 });

    /* ============ HOOK ============ */
    cue(0, 'slam');
    tl.fromTo('#stop', { autoAlpha: 0, scale: 2.6 }, { autoAlpha: 1, scale: 1, duration: 0.26, ease: 'expo.out' }, 0);
    shake(0.04, 22);
    flash(0.02, 0.25);
    redPulse(0.02, 0.8);
    tl.to('#stop', { scale: 0.55, autoAlpha: 0, duration: 0.18, ease: 'power2.in' }, 0.6);

    cue(0.74, 'hit');
    tl.fromTo('#four', { autoAlpha: 0, scale: 1.9, rotation: -14, yPercent: -12 }, { autoAlpha: 1, scale: 1, rotation: 0, yPercent: 0, duration: 0.5, ease: 'back.out(1.5)' }, 0.72);
    shake(0.76, 12);
    tl.to('#g1', { opacity: 0.8, y: 620, scale: 1.2, duration: 0.5, ease: 'expo.out' }, 0.72);
    textIn('#fourTxt', 0.92, { stagger: 0.07, dur: 0.6 });
    textIn('#fourSub', 1.6, { stagger: 0.05, dur: 0.55 });
    cue(1.6, 'pop');
    tl.to('#four', { scale: 1.06, duration: 1.5, ease: 'none' }, 1.1);
    cue(2.0, 'riser', { until: P0 });
    tl.to('#hook', { scale: 1.25, autoAlpha: 0, filter: 'blur(14px)', duration: 0.3, ease: 'power2.in', transformOrigin: '50% 45%' }, 2.3);

    /* ============ PROBLEM → SOLUTION ============ */
    PAIRS.forEach((S, i) => {
      const pair = $(`#p${i + 1}`);
      const prob = $('.prob', pair), sol = $('.sol', pair);
      const ph = $('.ph', prob), illo = $('.illo', prob);
      const S2 = S + SOL;

      // ---- problem ----
      tl.set([pair, prob], { autoAlpha: 1 }, S);
      tl.to('#g1', { opacity: 0.08, duration: 0.3 }, S - 0.05);
      tl.to('#gBad', { opacity: 0.95, duration: 0.3, ease: 'power2.out' }, S);
      tl.to('#grid', { opacity: 0.3, duration: 0.3 }, S);
      cue(S, 'glitch', { i });
      tl.fromTo($('.tag', prob), { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(2)', immediateRender: false }, S);
      textIn(ph, S + 0.04, { stagger: 0.05, dur: 0.55 });
      glitch(ph, S + 0.06, 7);
      tl.fromTo(illo, { opacity: 0, y: 90, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: 'expo.out', immediateRender: false }, S + 0.15);

      if (i === 0) {
        $$('.book .q', illo).forEach((q, k) => {
          tl.fromTo(q, { opacity: 0, scale: 0, rotation: -40 }, { opacity: 1, scale: 1, rotation: [-10, 12, -6][k], duration: 0.45, ease: 'back.out(2.5)', immediateRender: false }, S + 0.55 + k * 0.18);
          cue(S + 0.55 + k * 0.18, 'blipBad');
          tl.to(q, { y: -18, duration: 0.5, yoyo: true, repeat: 1, ease: 'sine.inOut' }, S + 1.0 + k * 0.1);
        });
        popIn($('.chip', illo), S + 1.15, null, 20);
        cue(S + 1.15, 'buzz');
      } else if (i === 1) {
        $$('.stack .sheet', illo).forEach((sh, k, all) => {
          const n = all.length - 1 - k; // back sheets first
          tl.fromTo(sh, { opacity: 0, y: -260, rotation: (k - 2) * 7 }, { opacity: 1, y: n * -14, x: n * 10, rotation: (k - 2) * 3, duration: 0.45, ease: 'back.out(1.4)', immediateRender: false }, S + 0.12 + (all.length - 1 - n) * 0.07);
        });
        cue(S + 0.3, 'thud');
        tl.fromTo($('.counter', illo), { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(2)', immediateRender: false }, S + 0.3);
        counter($('#pages'), 0, 80, S + 0.3, 0.9);
        cue(S + 0.3, 'count', { until: S + 1.2 });
        popIn($('.chip', illo), S + 1.2, null, 20);
        cue(S + 1.2, 'buzz');
      } else if (i === 2) {
        popIn($('.gmsg', illo), S + 0.5, 'bubble', 20);
        popIn($('.gmeta', illo), S + 0.8, 'seen', 10);
        popIn($('.gnone', illo), S + 1.15, null, 10);
        popIn($('.chip', illo), S + 1.3, null, 20);
        cue(S + 1.15, 'buzz');
        tl.to($('.gcard', illo), { x: 10, duration: 0.05, yoyo: true, repeat: 5, ease: 'sine.inOut' }, S + 1.15);
      } else {
        tl.fromTo($('.grade', illo), { opacity: 0, scale: 2.6, rotation: -32 }, { opacity: 1, scale: 1, rotation: -9, duration: 0.3, ease: 'power4.in', immediateRender: false }, S + 0.6);
        cue(S + 0.9, 'stamp');
        shake(S + 0.9, 18);
        cue(S + 0.9, 'buzz');
      }
      redPulse(S + 0.92, 0.75);
      glitch(ph, S + 0.95, 4);

      // strike the problem out, then cut to the solution
      $$('.strike i', prob).forEach((ln, k) => {
        tl.to(ln, { scaleX: 1, duration: 0.26, ease: 'power3.out' }, S + 1.72 + k * 0.1);
      });
      cue(S + 1.72, 'swipe');
      tl.to(prob, { scale: 0.9, autoAlpha: 0, filter: 'blur(12px)', duration: 0.24, ease: 'power2.in', transformOrigin: '50% 40%' }, S + 2.08);

      // ---- solution ----
      cue(S2, 'drop', { i });
      flash(S2, 0.16);
      tl.set(sol, { autoAlpha: 1 }, S2);
      tl.to('#gBad', { opacity: 0, duration: 0.3 }, S2);
      tl.to('#g1', { opacity: 0.95, y: 1150, scale: 1.2, duration: 0.5, ease: 'expo.out' }, S2);
      tl.to('#g2', { opacity: 0.7, duration: 0.5 }, S2);
      tl.to('#grid', { opacity: 0.9, duration: 0.5 }, S2);
      tl.fromTo($('.tag', sol), { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.45, ease: 'back.out(2)', immediateRender: false }, S2);
      textIn($('.sh', sol), S2 + 0.03, { stagger: 0.055, dur: 0.6 });
      tl.fromTo($('.demo', sol), { opacity: 0, y: 140, scale: 0.94 }, { opacity: 1, y: 0, scale: 1, duration: 0.65, ease: 'expo.out', immediateRender: false }, S2 + 0.1);

      const bubble = $('.bubble', sol), ai = $('.msg.ai', sol);
      if (bubble) {
        tl.fromTo(bubble, { opacity: 0, scale: 0.6, y: 50 }, { opacity: 1, scale: 1, y: 0, duration: 0.5, ease: 'back.out(1.5)', immediateRender: false }, S2 + 0.25);
        cue(S2 + 0.25, 'bubble');
      }
      if (ai) {
        tl.fromTo(ai, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out', immediateRender: false }, S2 + 0.5);
        tl.fromTo($('.avatar svg', ai), { rotation: 0 }, { rotation: 720, duration: 0.6, ease: 'power2.inOut', immediateRender: false }, S2 + 0.45);
        tl.fromTo($$('.sw', ai), { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.2, ease: 'power2.out', stagger: 0.045, immediateRender: false }, S2 + 0.62);
        cue(S2 + 0.62, 'reply');
      }

      if (i === 0) {
        $$('.pop', sol).forEach((el, k) => popIn(el, S2 + 1.55 + k * 0.16));
      } else if (i === 1) {
        $$('.bullet', sol).forEach((el, k) => popIn(el, S2 + 0.95 + k * 0.3));
      } else if (i === 2) {
        popIn($('.card', sol), S2 + 0.95, null);
        $$('.step', sol).forEach((el, k) => popIn(el, S2 + 0.97 + k * 0.32));
        popIn($('.result', sol), S2 + 1.65, 'ding');
      } else {
        popIn($('.rhead', sol), S2 + 0.3, 'pop');
        const arc = $('.arc', sol);
        const p = counter($('#score', sol), 0, 80, S2 + 0.45, 0.9, (v) => `${Math.round(v / 10)}/10`);
        updaters.push(() => arc.setAttribute('stroke-dasharray', `${p.v.toFixed(2)} 100`));
        $$('.rrow', sol).forEach((el, k) => popIn(el, S2 + 1.0 + k * 0.2, k === 2 ? 'warn' : 'blip'));
        popIn($('.rbtn', sol), S2 + 1.8, 'pop');
        tl.fromTo($('.rbtn', sol), { scale: 1 }, { scale: 1.05, duration: 0.18, yoyo: true, repeat: 1, ease: 'power2.out', immediateRender: false }, S2 + 2.5);
      }

      // gentle push-in while the answer plays, then clear
      tl.fromTo($('.demo', sol), { rotation: 0 }, { rotation: i % 2 ? 0.8 : -0.8, duration: 3, ease: 'sine.inOut', immediateRender: false }, S2 + 0.3);
      tl.to(sol, { autoAlpha: 0, y: -50, duration: 0.24, ease: 'power2.in' }, S + PD - 0.26);
      tl.set(pair, { autoAlpha: 0 }, S + PD);
      if (i < 3) cue(S + PD - 0.28, 'whoosh');
    });

    /* ============ OUTRO ============ */
    const O = T.outro;
    cue(O - 0.3, 'whoosh');
    tl.to('#g1', { opacity: 0.6, y: 900, scale: 1, duration: 0.6 }, O);
    textIn('#every', O + 0.02, { stagger: 0.09, dur: 0.65 });
    cue(O + 0.4, 'success');
    textOut('#every', O + 1.05, { stagger: 0.04 });
    cue(O + 0.35, 'build', { until: T.logo });

    const L = T.logo;
    const RB = ringView($('#ringB'), { x: 540, y: 655, r: 175, thin: 0.3, rot: -560 });
    cue(L, 'impact');
    flash(L, 0.14);
    shake(L, 12);
    tl.set(RB, { white: 0.28, coral: 0.22 }, L - 0.02);
    tl.to(RB, { white: 1, duration: 0.9, ease: 'power3.inOut' }, L);
    tl.to(RB, { coral: 1, duration: 0.85, ease: 'power3.inOut' }, L + 0.05);
    tl.to(RB, { thin: 1, duration: 0.6, ease: 'power2.inOut' }, L + 0.25);
    tl.to(RB, { rot: 0, duration: 1.05, ease: 'expo.out' }, L - 0.02);
    tl.fromTo(RB, { shockR: 180, shockA: 0.8 }, { shockR: 900, shockA: 0, duration: 1.1, ease: 'expo.out', immediateRender: false }, L + 0.85);
    cue(L + 0.85, 'chime');
    tl.set('#g1', { y: 680 }, L - 0.05);
    tl.to('#g1', { opacity: 0.95, scale: 1.1, duration: 1.2, ease: 'expo.out' }, L + 0.7);
    tl.fromTo($$('#endWordmark .ch'), { yPercent: 110, autoAlpha: 1 }, { yPercent: 0, duration: 0.85, ease: 'expo.out', stagger: 0.05, immediateRender: false }, L + 0.55);
    textIn('#slogan', L + 1.0, { stagger: 0.08 });
    tl.to('#cta', { opacity: 1, scale: 1, duration: 0.75, ease: 'back.out(1.7)' }, L + 1.55);
    cue(L + 1.55, 'pop');
    [L + 2.3, L + 3.2].forEach((t) => tl.fromTo('#cta .shine', { x: -260 }, { x: 900, duration: 0.85, ease: 'power2.inOut', immediateRender: false }, t));
    tl.to('#cta', { scale: 1.045, duration: 0.18, yoyo: true, repeat: 1, ease: 'power2.out' }, L + 2.8);
    tl.to('#outro', { scale: 1.03, duration: 3.6, ease: 'sine.inOut', transformOrigin: '50% 45%' }, L + 0.3);

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

  window.ORIN = { id: 'v2', soundtrack: 'soundtrack_v2.py', ready, seek, cues, T, W, H, FPS, BPM, get duration() { return DURATION; } };

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
