/*
 * Orin — 30s vertical ad (1080×1920).
 *
 * Every visual is a pure function of time `t` (seconds): a paused GSAP timeline
 * plus a few "updaters" for things that are easier to compute than to tween
 * (typing, the procedural logo, floating dust). The same `seek(t)` drives the
 * live preview and the frame-by-frame renderer, so both are identical.
 *
 * `cues` collects sound-design events (typing keys, whooshes, impacts …) with
 * their exact times; render/render.mjs exports them for render/soundtrack.py.
 */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const params = new URLSearchParams(location.search);
  const RENDER = params.has('render');
  if (RENDER) document.body.classList.add('render');

  const W = 1080, H = 1920;
  const DURATION = 30;
  const FPS = 60;
  const BPM = 120;

  // Key moments (seconds). The music is built on the same grid.
  const T = {
    ring: 0.0, shot2: 1.55, shot3: 3.05, shot4: 4.55, morph: 5.3,
    impact: 6.0,            // logo lands, beat drops
    lockOut: 7.6, phoneIn: 7.7,
    f1: 8.0, f2: 11.0, f3: 14.0, f4: 17.0,
    montage: 20.0, allInOne: 22.0, end: 24.0,
  };

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

  // Wrap every word in a mask (.w) + mover (.wi) — or in a single .sw span
  // for "streamed" AI text. Nested spans (accent, bold) are preserved.
  function splitText(el, mode) {
    const out = [];
    const walk = (node) => {
      for (const child of Array.from(node.childNodes)) {
        if (child.nodeType === Node.TEXT_NODE) {
          const frag = document.createDocumentFragment();
          for (const part of child.textContent.split(/(\s+)/)) {
            if (!part) continue;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); continue; }
            const inner = document.createElement('span');
            inner.textContent = part;
            if (mode === 'stream') {
              inner.className = 'sw';
              frag.appendChild(inner);
            } else {
              inner.className = 'wi';
              const mask = document.createElement('span');
              mask.className = 'w';
              mask.appendChild(inner);
              frag.appendChild(mask);
            }
            out.push(inner);
          }
          child.replaceWith(frag);
        } else if (child.nodeType === Node.ELEMENT_NODE && !child.classList.contains('ltr')) {
          walk(child);
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          // keep bidi-isolated runs (math, numbers) as one unit
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
          out.push(wrap);
        }
      }
    };
    walk(el);
    return out;
  }

  function splitLetters(el) {
    const txt = el.textContent.trim();
    el.textContent = '';
    return Array.from(txt).map((ch) => {
      const clip = document.createElement('span');
      clip.className = 'clip';
      const c = document.createElement('span');
      c.className = 'ch';
      c.textContent = ch;
      clip.appendChild(c);
      el.appendChild(clip);
      return c;
    });
  }

  function prepDOM() {
    $$('[data-logo]').forEach((el) => { el.innerHTML = OrinLogo.logoSVG(+el.dataset.logo); });
    $$('[data-split]').forEach((el) => splitText(el, 'mask'));
    $$('[data-stream]').forEach((el) => splitText(el, 'stream'));
    $$('[data-letters]').forEach((el) => splitLetters(el));

    // floating dust
    const dust = $('#dust');
    const r = rng(7);
    for (let i = 0; i < 38; i++) {
      const d = document.createElement('i');
      const size = 2 + r() * 5;
      Object.assign(d.style, {
        position: 'absolute', left: '0', top: '0', width: size + 'px', height: size + 'px',
        borderRadius: '50%', background: r() < 0.25 ? '#FF8A70' : '#FFFFFF',
      });
      d._p = { x: r() * W, y: r() * (H + 200), v: 18 + r() * 46, a: 0.12 + r() * 0.3, f: 0.2 + r() * 0.5, ph: r() * 6.28, amp: 10 + r() * 30 };
      dust.appendChild(d);
    }
    updaters.push((t) => {
      for (const d of dust.children) {
        const p = d._p;
        const y = ((p.y - p.v * t) % (H + 200) + (H + 200)) % (H + 200) - 100;
        const x = p.x + Math.sin(t * p.f + p.ph) * p.amp;
        d.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
        d.style.opacity = (p.a * (0.6 + 0.4 * Math.sin(t * 1.3 + p.ph))).toFixed(3);
      }
    });

    // static grain tile (seeded, so every render is identical)
    {
      const cv = document.createElement('canvas');
      cv.width = cv.height = 256;
      const cx = cv.getContext('2d');
      const img = cx.createImageData(256, 256);
      const gr = rng(99);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = 128 + ((gr() + gr() + gr()) / 3 - 0.5) * 255;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
      cx.putImageData(img, 0, 0);
      $('#grain').style.backgroundImage = `url(${cv.toDataURL('image/png')})`;
    }

    // confetti pieces (positioned later, once layout is known)
    const conf = $('#confetti');
    const colors = ['#FF6B56', '#FFFFFF', '#34D399', '#FFD166', '#FF9A85'];
    for (let i = 0; i < 30; i++) {
      const c = document.createElement('i');
      c.style.background = colors[i % colors.length];
      conf.appendChild(c);
    }
  }

  // Stage position of an element's centre, in 1080×1920 space.
  function stagePos(el) {
    const sr = $('#stage').getBoundingClientRect();
    const k = sr.width / W;
    const r = el.getBoundingClientRect();
    return { x: (r.left + r.width / 2 - sr.left) / k, y: (r.top + r.height / 2 - sr.top) / k, w: r.width / k, h: r.height / k };
  }

  /* ───────────────────────── Procedural ring ───────────────────────── */

  function ringView(svg, init) {
    const g = $('.ring-g', svg);
    const track = $('.track', svg), prog = $('.prog', svg), shock = $('.shock', svg);
    const pw = $('.pw', svg), pc = $('.pc', svg);
    const st = Object.assign({
      x: 540, y: 960, s: 1, r: 240, rot: 0, white: 0, coral: 0, thin: 1,
      track: 0, prog: 0, progLen: 0, alpha: 1, shockR: 0, shockA: 0,
    }, init);
    let key = '';
    updaters.push(() => {
      g.setAttribute('transform', `translate(${st.x.toFixed(2)} ${st.y.toFixed(2)}) scale(${st.s.toFixed(4)})`);
      svg.style.opacity = st.alpha.toFixed(3);
      if (track) {
        track.setAttribute('r', (st.r * 0.972).toFixed(2));
        track.style.opacity = st.track.toFixed(3);
      }
      if (prog) {
        prog.setAttribute('r', (st.r * 0.972).toFixed(2));
        prog.style.opacity = (st.progLen > 0.002 ? st.prog : 0).toFixed(3);
        prog.setAttribute('stroke-dasharray', `${(st.progLen * 1000).toFixed(1)} 1000`);
      }
      if (shock) {
        shock.setAttribute('cx', st.x.toFixed(1));
        shock.setAttribute('cy', st.y.toFixed(1));
        shock.setAttribute('r', Math.max(1, st.shockR).toFixed(1));
        shock.setAttribute('opacity', st.shockA.toFixed(3));
      }
      const k = [st.white, st.coral, st.thin, st.rot, st.r].map((v) => v.toFixed(4)).join('|');
      if (k !== key) {
        key = k;
        const p = OrinLogo.logoPaths({ white: st.white, coral: st.coral, rot: st.rot, s: st.r, thin: st.thin });
        pw.setAttribute('d', p.white);
        pc.setAttribute('d', p.coral);
      }
    });
    return st;
  }

  /* ───────────────────────── Timeline helpers ───────────────────────── */

  const wordsOf = (sel) => $$('.wi', typeof sel === 'string' ? $(sel) : sel);

  // Words rest invisible (autoAlpha 0) outside their mask so no stray
  // diacritics peek through the mask padding; they only show while moving in.
  function textIn(tl, sel, t, o = {}) {
    const { stagger = 0.06, dur = 0.75, ease = 'expo.out', rot = 4 } = o;
    tl.fromTo(wordsOf(sel), { yPercent: 118, rotation: rot, autoAlpha: 1 },
      { yPercent: 0, rotation: 0, duration: dur, ease, stagger, immediateRender: false }, t);
  }
  function textOut(tl, sel, t, o = {}) {
    const { stagger = 0.035, dur = 0.42, ease = 'power3.in' } = o;
    const words = wordsOf(sel);
    tl.to(words, { yPercent: -125, rotation: -3, duration: dur, ease, stagger }, t);
    tl.set(words, { autoAlpha: 0, stagger }, t + dur);
  }
  function lettersIn(tl, sel, t) {
    tl.fromTo($$(sel), { yPercent: 110, autoAlpha: 1 }, { yPercent: 0, duration: 0.85, ease: 'expo.out', stagger: 0.05, immediateRender: false }, t);
  }
  function shake(tl, t, amp = 16) {
    const k = [1, -0.85, 0.62, -0.42, 0.26, -0.12, 0];
    k.forEach((v, i) => tl.to('#world', { x: v * amp, y: -v * amp * 0.55, duration: 0.045, ease: 'sine.inOut' }, t + i * 0.045));
  }
  function flash(tl, t, peak = 0.22) {
    tl.fromTo('#flash', { opacity: 0 }, { opacity: peak, duration: 0.05, ease: 'none', immediateRender: false }, t)
      .to('#flash', { opacity: 0, duration: 0.55, ease: 'power2.out' }, t + 0.05);
  }

  /* ───────────────────────── Build ───────────────────────── */

  function build() {
    const tl = gsap.timeline({ paused: true });

    /* ---------- initial states ---------- */
    gsap.set($$('.wi'), { yPercent: 118, autoAlpha: 0 });
    gsap.set($$('.wordmark .ch'), { yPercent: 110, autoAlpha: 0 });
    gsap.set(['#ch1', '#ch2', '#ch3'], { y: -1200, opacity: 0 });
    gsap.set('#g1', { x: 540, y: 800, scale: 0.8, opacity: 0.0 });
    gsap.set('#g2', { x: 160, y: 300, scale: 1, opacity: 0 });
    gsap.set('#g3', { x: 920, y: 1650, scale: 1, opacity: 0.35 });
    gsap.set('#grid', { opacity: 0.5 });
    gsap.set('#headerLogo', { opacity: 0 });
    gsap.set($$('.msg.ai'), { opacity: 0 });
    gsap.set($$('.bubble'), { opacity: 0 });
    gsap.set($$('.pop'), { opacity: 0 });
    gsap.set('#cta', { opacity: 0, scale: 0.3 });
    gsap.set('#cta .shine', { x: -260, rotation: 18 });
    gsap.set('#allInOne .l2', { opacity: 0, scale: 0.4 });
    gsap.set($$('.mword'), { opacity: 0 });

    /* ================= 1) HOOK — 2 AM, exam at 8 ================= */
    const R = ringView($('#ringA'), { x: 540, y: 800, r: 240, thin: 0.14, rot: -230 });
    const clockEl = $('#clock');
    const C = { a: 0 };
    updaters.push(() => {
      clockEl.style.transform = `translate(${R.x.toFixed(2)}px, ${R.y.toFixed(2)}px) scale(${R.s.toFixed(4)})`;
      clockEl.style.opacity = C.a.toFixed(3);
    });

    cue(0, 'tension');
    tl.to('#g1', { opacity: 0.45, scale: 1, duration: 1.2, ease: 'power2.out' }, 0);
    tl.fromTo(R, { track: 0.4 }, { track: 1, duration: 0.3, ease: 'power2.out' }, 0.0);
    tl.fromTo(R, { prog: 1, progLen: 0.05 }, { progLen: 0.86, duration: 0.7, ease: 'expo.out' }, 0.0);
    tl.fromTo(C, { a: 0.3 }, { a: 1, duration: 0.3, ease: 'power2.out' }, 0.0);
    tl.fromTo('#clock .digits', { filter: 'blur(10px)' }, { filter: 'blur(0px)', duration: 0.45, ease: 'power2.out' }, 0.0);

    // clock ticks: progress arc loses a notch every half second
    let pl = 0.86;
    cue(0.0, 'tick', { i: 0 });
    for (let i = 1, t = 0.5; t < T.shot4 - 0.01; i++, t += 0.5) {
      pl -= 0.08;
      tl.to(R, { progLen: pl, duration: 0.2, ease: 'back.out(3)' }, t);
      cue(t, 'tick', { i });
    }
    // colon blink
    for (let t = 0.5; t < 4.6; t += 1) {
      tl.set('#colon', { opacity: 0.2 }, t);
      tl.set('#colon', { opacity: 1 }, t + 0.5);
    }
    // 01:59 → 02:00 odometer roll
    tl.to(['#dg1', '#dg2', '#dg3'], { yPercent: -50, duration: 0.5, ease: 'expo.inOut', stagger: { each: 0.06, from: 'end' } }, 0.7);
    cue(0.78, 'roll');

    textIn(tl, '#h1', 0.12, { stagger: 0.08 });
    cue(0.12, 'textIn');
    textOut(tl, '#h1', 1.4);

    // shot 2 — ring shrinks to the top, exam line
    tl.to(R, { y: 400, s: 0.5, duration: 0.75, ease: 'expo.inOut' }, 1.4);
    tl.to('#g1', { y: 400, opacity: 0.35, duration: 0.9, ease: 'expo.inOut' }, 1.4);
    textIn(tl, '#h2', T.shot2 + 0.05, { stagger: 0.07 });
    cue(T.shot2, 'whoosh', { v: 0.5 });
    textOut(tl, '#h2', 2.72, { stagger: 0.03, dur: 0.34 });

    // shot 3 — three unread chapters drop in and panic-shake
    const chs = ['#ch1', '#ch2', '#ch3'];
    const chPose = [
      { x: 250, y: 40, r: 9 },
      { x: 0, y: -18, r: -2 },
      { x: -250, y: 46, r: -11 },
    ];
    chs.forEach((c, i) => {
      const t = T.shot3 + 0.08 + i * 0.12;
      tl.fromTo(c, { y: chPose[i].y + 260, x: chPose[i].x * 0.7, rotation: chPose[i].r * 4, scale: 0.3, opacity: 0 },
        { y: chPose[i].y, x: chPose[i].x, rotation: chPose[i].r, scale: 1, opacity: 1, duration: 0.55, ease: 'back.out(1.6)', immediateRender: false }, t);
      cue(t + 0.08, 'thud', { i });
      tl.to(c, { rotation: `+=${i === 1 ? 3 : -3}`, duration: 0.07, repeat: 7, yoyo: true, ease: 'sine.inOut' }, 3.9 + i * 0.03);
    });
    textIn(tl, '#h3', T.shot3 + 0.12, { stagger: 0.07 });
    // alarm glow on the ticks
    for (let t = 3.5; t < 4.5; t += 0.5) {
      tl.to('#g1', { opacity: 0.7, duration: 0.06, ease: 'none' }, t).to('#g1', { opacity: 0.32, duration: 0.4, ease: 'power2.out' }, t + 0.06);
    }
    textOut(tl, '#h3', 4.3, { stagger: 0.025, dur: 0.36 });
    chs.forEach((c, i) => {
      tl.to(c, { y: '+=520', opacity: 0, rotation: (i - 1) * 25, duration: 0.45, ease: 'power3.in' }, 4.36 + i * 0.03);
    });

    // shot 4 — "don't worry…" — ring returns to the centre, clock fades
    tl.to(C, { a: 0, duration: 0.3, ease: 'power2.in' }, 4.4);
    tl.to(R, { y: 800, s: 0.84, duration: 0.8, ease: 'expo.inOut' }, 4.45);
    tl.to('#g1', { y: 800, opacity: 0.22, duration: 0.8, ease: 'expo.inOut' }, 4.45);
    textIn(tl, '#h4', 4.72, { stagger: 0.1, dur: 0.9, rot: 2 });
    cue(T.shot4, 'hush');
    textOut(tl, '#h4', 5.62, { stagger: 0.04, dur: 0.35 });

    // morph — the timer ring becomes the Orin logo
    tl.to(R, { track: 0, progLen: 0, duration: 0.4, ease: 'power2.in' }, T.morph);
    tl.to(R, { white: 1, duration: 0.72, ease: 'expo.inOut' }, 5.26);
    tl.to(R, { coral: 1, duration: 0.64, ease: 'expo.inOut' }, 5.34);
    tl.to(R, { thin: 1, duration: 0.5, ease: 'power2.inOut' }, 5.5);
    tl.to(R, { rot: 0, duration: 0.78, ease: 'expo.inOut' }, 5.24);
    tl.to(R, { s: 1, duration: 0.5, ease: 'back.out(2)' }, 5.72);
    cue(5.2, 'riser', { until: T.impact });

    /* ================= 2) IMPACT + LOCKUP ================= */
    cue(T.impact, 'impact');
    flash(tl, T.impact, 0.2);
    shake(tl, T.impact, 18);
    tl.fromTo(R, { shockR: 240, shockA: 0.65 }, { shockR: 1150, shockA: 0, duration: 1.0, ease: 'expo.out', immediateRender: false }, T.impact);
    tl.to('#g1', { opacity: 1, scale: 1.35, duration: 0.12, ease: 'power2.out' }, T.impact)
      .to('#g1', { scale: 1.0, opacity: 0.85, y: 760, duration: 1.4, ease: 'expo.out' }, T.impact + 0.12);
    tl.to('#grid', { opacity: 1, duration: 0.8 }, T.impact);
    tl.to(R, { y: 760, duration: 1.0, ease: 'expo.out' }, T.impact + 0.05);

    lettersIn(tl, '#wordmark .ch', T.impact + 0.12);
    textIn(tl, '#tagline', T.impact + 0.45, { stagger: 0.08 });

    // lockup out: ring flies into the phone's header logo, text leaves upward
    const hdr = stagePos($('#headerLogo'));
    const textOutT = T.lockOut - 0.28;
    tl.to($$('#wordmark .ch'), { yPercent: -115, duration: 0.4, ease: 'power3.in', stagger: 0.03 }, textOutT);
    tl.set($$('#wordmark .ch'), { autoAlpha: 0, stagger: 0.03 }, textOutT + 0.4);
    textOut(tl, '#tagline', textOutT, { stagger: 0.03, dur: 0.36 });
    tl.to(R, { x: hdr.x, y: hdr.y, s: (hdr.w * 0.48) / 240, duration: 0.85, ease: 'expo.inOut' }, T.lockOut + 0.05);
    tl.to(R, { rot: 360, duration: 0.85, ease: 'expo.inOut' }, T.lockOut + 0.05);
    tl.set(R, { alpha: 0 }, T.lockOut + 0.9);
    tl.set('#headerLogo', { opacity: 1 }, T.lockOut + 0.9);

    /* ================= 3) PHONE — four features ================= */
    gsap.set('#phoneWrap', { y: 1500 });
    gsap.set('#phone', { rotationX: 30, rotationZ: -5 });
    tl.to('#phoneWrap', { y: 0, duration: 1.0, ease: 'expo.out' }, T.phoneIn);
    tl.to('#phone', { rotationX: 0, rotationZ: 0, duration: 1.1, ease: 'expo.out' }, T.phoneIn);
    cue(T.phoneIn - 0.1, 'whoosh', { v: 0.8 });
    tl.to('#g1', { y: 1180, x: 540, scale: 1.15, opacity: 0.8, duration: 1.2, ease: 'expo.inOut' }, T.phoneIn - 0.1);
    tl.to('#g2', { opacity: 0.85, x: 170, y: 330, duration: 1.2, ease: 'power2.out' }, T.phoneIn);
    tl.to('#g3', { opacity: 0.5, x: 930, y: 1500, duration: 1.2, ease: 'power2.out' }, T.phoneIn);
    tl.to('#g2', { x: 330, y: 260, duration: 11, ease: 'sine.inOut' }, 8.8);

    // gentle hand-held float
    const drift = [
      [8.8, { rotationY: -5, rotationX: 3, duration: 2.2 }],
      [11.0, { rotationY: 4, rotationX: -2, duration: 3.0 }],
      [14.0, { rotationY: -4, rotationX: 2, duration: 3.0 }],
      [17.0, { rotationY: 3, rotationX: -2, duration: 2.9 }],
    ];
    drift.forEach(([t, v]) => tl.to('#phone', { ...v, ease: 'sine.inOut' }, t));
    tl.to('#phoneWrap', { y: -14, duration: 2.8, ease: 'sine.inOut', yoyo: true, repeat: 3 }, 8.7);

    // captions
    const caps = ['#c1', '#c2', '#c3', '#c4'];
    const fT = [T.f1, T.f2, T.f3, T.f4];
    caps.forEach((c, i) => {
      textIn(tl, c, fT[i] + 0.02, { stagger: 0.055 });
      if (i > 0) cue(fT[i] - 0.05, 'whoosh', { v: 0.55 });
      textOut(tl, c, i < 3 ? fT[i + 1] - 0.3 : 19.55, { stagger: 0.025, dur: 0.36 });
    });

    // chat — composer typing sessions
    const sessions = [
      { b: '#b1', t0: 8.4, t1: 9.1, send: 9.2, stream: 9.62, dt: 0.042 },
      { b: '#b2', t0: 11.3, t1: 11.78, send: 11.88, stream: 12.25, dt: 0.07 },
      { b: '#b3', t0: 14.32, t1: 14.8, send: 14.9, stream: 15.32, dt: 0.07, file: true },
      { b: '#b4', t0: 17.28, t1: 17.6, send: 17.7, stream: 18.05, dt: 0.08 },
    ];
    sessions.forEach((s) => {
      s.el = $(s.b);
      s.text = s.el.dataset.prompt;
      s.chars = Array.from(s.text);
    });

    const composer = $('#composer');
    const field = $('.field', composer), inner = $('.inner', composer), typedEl = $('.typed', composer);
    const ph = $('.ph', composer), caret = $('.caret', composer), sendBtn = $('.send', composer), fchip = $('.fchip', composer);
    updaters.push((t) => {
      let s = null;
      for (const x of sessions) if (t >= x.t0 - 0.35) s = x;
      let text = '', active = false, file = false;
      if (s && t < s.send) {
        const n = Math.floor(clamp((t - s.t0) / (s.t1 - s.t0)) * s.chars.length);
        text = s.chars.slice(0, n).join('');
        active = true;
        file = !!s.file && t >= s.t0 - 0.2;
      }
      if (typedEl.textContent !== text) typedEl.textContent = text;
      ph.style.opacity = text || file ? 0 : 1;
      fchip.style.display = file ? 'inline-flex' : 'none';
      sendBtn.classList.toggle('on', text.length > 0);
      let cOn = 0;
      if (active) cOn = t >= s.t0 && t <= s.t1 + 0.05 ? 1 : (Math.floor(t * 2.4) % 2 ? 0 : 1);
      caret.style.opacity = cOn;
      const over = inner.scrollWidth - field.clientWidth;
      inner.style.transform = over > 0 ? `translateX(${over}px)` : 'none';
    });
    sessions.forEach((s) => {
      const n = s.chars.length;
      s.chars.forEach((ch, i) => cue(s.t0 + ((i + 1) / n) * (s.t1 - s.t0), ch === ' ' ? 'space' : 'key'));
      cue(s.send, 'send');
      tl.fromTo(sendBtn, { scale: 1 }, { scale: 0.82, duration: 0.07, ease: 'power2.out', immediateRender: false }, s.send - 0.07)
        .to(sendBtn, { scale: 1, duration: 0.3, ease: 'back.out(3)' }, s.send);
    });

    tl.to('#welcome', { opacity: 0, y: -60, scale: 0.96, duration: 0.4, ease: 'power2.in' }, sessions[0].send - 0.12);

    sessions.forEach((s, i) => {
      const b = s.el;
      const bubble = $('.bubble', b);
      const ai = $('.msg.ai', b);
      const avatar = $('.avatar svg', ai);
      const thinking = $('.thinking', ai);
      const words = $$('.sw', ai);
      const scrollY = -(b.offsetTop - 30);

      tl.to('#chatCol', { y: scrollY, duration: 0.6, ease: 'expo.out' }, s.send);
      tl.fromTo(bubble, { opacity: 0, scale: 0.55, y: 110 }, { opacity: 1, scale: 1, y: 0, duration: 0.55, ease: 'back.out(1.4)', immediateRender: false }, s.send);
      tl.fromTo(ai, { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out', immediateRender: false }, s.send + 0.16);
      tl.fromTo(thinking, { opacity: 0 }, { opacity: 1, duration: 0.12, ease: 'power1.out', immediateRender: false }, s.send + 0.2);
      tl.set(thinking, { opacity: 0 }, s.stream);
      tl.fromTo(avatar, { rotation: 0 }, { rotation: 720, duration: s.stream - s.send, ease: 'power1.inOut', immediateRender: false }, s.send + 0.1);
      tl.fromTo(words, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.22, ease: 'power2.out', stagger: s.dt, immediateRender: false }, s.stream);
      cue(s.stream, 'reply', { i });
    });

    // camera: push in on the answer, pull back out for the next prompt
    gsap.set('#phoneWrap', { transformOrigin: '50% 430px' });
    sessions.forEach((s, i) => {
      tl.to('#phoneWrap', { scale: 1.13, duration: 0.9, ease: 'expo.inOut' }, s.send + 0.1);
      if (i < sessions.length - 1) tl.to('#phoneWrap', { scale: 1, duration: 0.7, ease: 'expo.inOut' }, fT[i + 1] - 0.35);
    });

    // helpers for the .pop elements of each block
    const popIn = (el, t, sound = 'pop', fromY = 30) => {
      tl.fromTo(el, { opacity: 0, y: fromY, scale: 0.94 }, { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: 'back.out(1.5)', immediateRender: false }, t);
      if (sound) cue(t, sound);
    };

    // F1 — equation chips
    $$('#b1 .pop').forEach((el, i) => popIn(el, 10.24 + i * 0.12, 'blip'));

    // F2 — steps + result
    const b2 = $('#b2');
    popIn($('.card', b2), 12.52, null);
    $$('.step', b2).forEach((el, i) => popIn(el, 12.56 + i * 0.4, 'blip'));
    popIn($('.result', b2), 13.34, 'ding');
    tl.fromTo($('.result', b2), { boxShadow: '0 0 0px rgba(255,107,86,0)' }, { boxShadow: '0 0 60px rgba(255,107,86,.45)', duration: 0.25, yoyo: true, repeat: 1, ease: 'power2.out', immediateRender: false }, 13.45);

    // F3 — summary bullets
    $$('#b3 .bullet').forEach((el, i) => popIn(el, 15.62 + i * 0.3, 'blip'));

    // F4 — quiz
    const b4 = $('#b4');
    popIn($('.quiz', b4), 18.2, 'pop');
    $$('.opt', b4).forEach((el, i) => popIn(el, 18.34 + i * 0.1, null, 18));
    const correct = $('#correct');
    tl.fromTo($('.tapdot', correct), { opacity: 0, scale: 1.8 }, { opacity: 1, scale: 1, duration: 0.14, ease: 'power2.out', immediateRender: false }, 18.84)
      .to($('.tapdot', correct), { opacity: 0, scale: 1.4, duration: 0.3, ease: 'power2.out' }, 19.0);
    tl.fromTo(correct, { scale: 1 }, { scale: 0.97, duration: 0.08, yoyo: true, repeat: 1, ease: 'power1.inOut', immediateRender: false }, 18.96);
    cue(18.92, 'tap');
    tl.fromTo($('.ripple', correct), { scale: 0, opacity: 1 }, { scale: 1, opacity: 0.0, duration: 0.7, ease: 'power2.out', immediateRender: false }, 18.96);
    tl.to(correct, { borderColor: '#34D399', backgroundColor: 'rgba(52,211,153,0.14)', duration: 0.25, ease: 'power2.out' }, 18.98);
    tl.to($('.l', correct), { backgroundColor: '#34D399', color: '#06140D', duration: 0.25 }, 18.98);
    tl.to($('.ok', correct), { opacity: 1, scale: 1, duration: 0.45, ease: 'back.out(2.6)' }, 19.02);
    tl.fromTo($('.verdict', b4), { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.4, ease: 'back.out(2)', immediateRender: false }, 19.14);
    cue(19.0, 'success');

    // confetti burst from the tapped answer
    {
      // #correct's offsetParent is its .ai-body, same as #confetti's
      const ox = correct.offsetLeft + correct.offsetWidth * 0.24;
      const oy = correct.offsetTop + correct.offsetHeight / 2;
      const r = rng(42);
      $$('#confetti i').forEach((p, i) => {
        const ang = (-160 + r() * 140) * Math.PI / 180;
        const dist = 140 + r() * 260;
        const dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist;
        const t = 19.04 + r() * 0.06;
        const rot = (r() - 0.5) * 720;
        gsap.set(p, { x: ox, y: oy, opacity: 0, rotation: 0, scale: 0.6 + r() * 0.7 });
        tl.fromTo(p, { x: ox, y: oy, opacity: 1, rotation: 0 },
          { x: ox + dx, y: oy + dy, rotation: rot * 0.5, duration: 0.5, ease: 'power3.out', immediateRender: false }, t)
          .to(p, { y: oy + dy + 260 + r() * 180, x: ox + dx * 1.2, rotation: rot, duration: 0.9, ease: 'power1.in' }, t + 0.5)
          .to(p, { opacity: 0, duration: 0.3 }, t + 1.1);
      });
    }

    // beat pulses on the key-light while the groove plays
    for (let t = 9.0; t < T.montage - 0.2; t += 0.5) {
      tl.to('#g1', { opacity: '+=0.12', duration: 0.05, ease: 'none' }, t).to('#g1', { opacity: '-=0.12', duration: 0.38, ease: 'power2.out' }, t + 0.05);
    }

    /* ================= 4) SUBJECT MONTAGE ================= */
    const RM = ringView($('#ringM'), { x: 540, y: 960, r: 420, white: 1, coral: 1, rot: 0, alpha: 0 });
    tl.set(RM, { alpha: 1 }, T.montage - 0.02);
    tl.set('#phoneScene', { autoAlpha: 0 }, T.montage + 0.02);
    tl.fromTo('#wipeCoral', { scale: 0 }, { scale: 1, duration: 0.42, ease: 'power2.in', immediateRender: false }, T.montage - 0.42);
    cue(T.montage - 0.42, 'whooshBig', { until: T.montage });
    cue(T.montage, 'drop2');
    tl.to('#phoneWrap', { scale: 0.8, y: -120, opacity: 0, duration: 0.42, ease: 'power2.in' }, T.montage - 0.42);

    const mwords = $$('.mword');
    const mcount = $('#mcount');
    mwords.forEach((w, i) => {
      const t = T.montage + i * 0.25;
      tl.set(w, { opacity: 1 }, t);
      if (i < mwords.length - 1) tl.set(w, { opacity: 0 }, t + 0.25);
      else tl.to(w, { opacity: 0, scale: 0.9, duration: 0.15, ease: 'power2.in' }, t + 0.24);
      tl.fromTo(w, { scale: 1.22 }, { scale: 1, duration: 0.3, ease: 'expo.out', immediateRender: false }, t);
      tl.to(RM, { rot: -40 * (i + 1), duration: 0.24, ease: 'expo.out' }, t);
      cue(t, 'stab', { i });
    });
    tl.fromTo(RM, { s: 0.7 }, { s: 1, duration: 0.6, ease: 'expo.out', immediateRender: false }, T.montage);
    updaters.push((t) => {
      const i = Math.floor((t - T.montage) / 0.25);
      const on = t >= T.montage && i < mwords.length;
      mcount.textContent = on ? `${String(i + 1).padStart(2, '0')} / ${String(mwords.length).padStart(2, '0')}` : '';
    });

    textIn(tl, '#allInOne .l1', T.allInOne + 0.02, { stagger: 0.09 });
    cue(T.allInOne, 'whoosh', { v: 0.6 });
    tl.to('#allInOne .l2', { opacity: 1, scale: 1, duration: 0.65, ease: 'back.out(1.8)' }, T.allInOne + 0.4);
    cue(T.allInOne + 0.4, 'pop');
    tl.to(RM, { rot: -40 * 8 - 70, duration: 2.0, ease: 'power1.inOut' }, T.allInOne);
    tl.to('#allInOne', { scale: 1.06, duration: 1.8, ease: 'none' }, T.allInOne + 0.1);
    cue(T.end - 1.5, 'build', { until: T.end });

    /* ================= 5) END CARD ================= */
    tl.fromTo('#wipeDark', { scale: 0 }, { scale: 1, duration: 0.4, ease: 'power2.in', immediateRender: false }, T.end - 0.4);
    cue(T.end - 0.4, 'whooshBig', { until: T.end });
    cue(T.end, 'impact', { big: true });
    shake(tl, T.end, 12);
    tl.set('#g1', { x: 540, y: 680, scale: 0.6, opacity: 0 }, T.end - 0.05);
    tl.set('#g2', { x: 180, y: 1560, opacity: 0 }, T.end - 0.05);
    tl.set('#g3', { x: 920, y: 380, opacity: 0 }, T.end - 0.05);
    tl.set(['#montage', '#wipeDark'], { autoAlpha: 0 }, T.end + 0.01);

    // end logo: a fast "loading" spinner that decelerates and locks into the mark
    const RB = ringView($('#ringB'), { x: 540, y: 655, r: 175, thin: 0.3, rot: -560, white: 0, coral: 0 });
    tl.set(RB, { white: 0.28, coral: 0.22 }, T.end - 0.02);
    tl.to(RB, { white: 1, duration: 0.9, ease: 'power3.inOut' }, T.end);
    tl.to(RB, { coral: 1, duration: 0.85, ease: 'power3.inOut' }, T.end + 0.05);
    tl.to(RB, { thin: 1, duration: 0.6, ease: 'power2.inOut' }, T.end + 0.25);
    tl.to(RB, { rot: 0, duration: 1.05, ease: 'expo.out' }, T.end - 0.02);
    flash(tl, T.end, 0.12);
    tl.fromTo(RB, { s: 0.7 }, { s: 1, duration: 0.7, ease: 'back.out(1.8)', immediateRender: false }, T.end + 0.35);
    tl.fromTo(RB, { shockR: 180, shockA: 0.8 }, { shockR: 900, shockA: 0, duration: 1.1, ease: 'expo.out', immediateRender: false }, T.end + 0.85);
    cue(T.end + 0.85, 'chime');

    lettersIn(tl, '#endWordmark .ch', T.end + 0.55);
    textIn(tl, '#slogan', T.end + 1.0, { stagger: 0.08 });
    tl.to('#cta', { opacity: 1, scale: 1, duration: 0.75, ease: 'back.out(1.7)' }, T.end + 1.6);
    cue(T.end + 1.6, 'pop');
    [26.5, 28.0, 29.3].forEach((t) => tl.fromTo('#cta .shine', { x: -260 }, { x: 900, duration: 0.85, ease: 'power2.inOut', immediateRender: false }, t));
    [27.2, 28.7].forEach((t) => tl.to('#cta', { scale: 1.045, duration: 0.18, yoyo: true, repeat: 1, ease: 'power2.out' }, t));

    // end-card lighting
    tl.to('#g1', { opacity: 0.9, scale: 1.1, duration: 1.4, ease: 'expo.out' }, T.end + 0.8);
    tl.to('#g2', { opacity: 0.6, duration: 2, ease: 'power2.out' }, T.end + 0.8);
    tl.to('#g3', { opacity: 0.35, duration: 2, ease: 'power2.out' }, T.end + 0.8);
    tl.to('#g1', { scale: 1.2, duration: 4, ease: 'sine.inOut' }, T.end + 2.2);
    tl.to('#end', { scale: 1.03, duration: 5.5, ease: 'sine.inOut', transformOrigin: '50% 45%' }, T.end + 0.5);

    // pad the timeline to the full duration
    tl.set({}, {}, DURATION);
    return tl;
  }

  /* ───────────────────────── Player ───────────────────────── */

  let tl = null;
  function seek(t) {
    t = clamp(t, 0, DURATION);
    tl.seek(t, false);
    for (const u of updaters) u(t);
  }

  async function loadFonts() {
    const probes = [
      '700 100px Alexandria', '800 100px Alexandria',
      '400 30px Readex', '500 30px Readex', '600 30px Readex',
      '500 30px Outfit', '600 30px Outfit',
    ];
    await Promise.all(probes.map((f) => document.fonts.load(f, 'Orin 0123456789 …عربي')));
    await document.fonts.ready;
  }

  const ready = (async () => {
    await loadFonts();
    prepDOM();
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    tl = build();
    cues.sort((a, b) => a.t - b.t);
    seek(0);
    return true;
  })();

  window.ORIN = {
    ready, seek, cues, T, W, H, FPS, BPM,
    get duration() { return DURATION; },
  };

  if (RENDER) return;

  /* preview mode: fit to window, play/pause/scrub, optional soundtrack */
  const stage = $('#stage');
  function fit() {
    const k = Math.min(innerWidth / W, (innerHeight - 64) / H);
    Object.assign(stage.style, { position: 'absolute', left: '50%', top: 'calc(50% - 26px)', transform: `translate(-50%, -50%) scale(${k})` });
  }
  addEventListener('resize', fit);
  fit();

  const playBtn = $('#play'), scrub = $('#scrub'), label = $('#tlabel'), audio = $('#music'), muteBtn = $('#mute');
  let playing = true, cur = 0, last = null, soundOn = false;
  audio.muted = true;
  const syncAudio = () => {
    if (!soundOn) return;
    if (Math.abs(audio.currentTime - cur) > 0.08) audio.currentTime = cur;
    if (playing && audio.paused) audio.play().catch(() => {});
    if (!playing && !audio.paused) audio.pause();
  };
  playBtn.onclick = () => { playing = !playing; playBtn.textContent = playing ? '⏸' : '▶'; syncAudio(); };
  muteBtn.onclick = () => { soundOn = !soundOn; audio.muted = !soundOn; muteBtn.textContent = soundOn ? '🔊' : '🔇'; if (!soundOn) audio.pause(); syncAudio(); };
  muteBtn.textContent = '🔇';
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
