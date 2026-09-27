/*
 * Orin — ad v3 "الكتاب يقول… وOrin يقول" (27s, 1080×1920).
 *
 *   0–8.2 s    hook round: "عندك 3 ثواني تفهم هالتعريف ⏱️" — a dense textbook page, a
 *              countdown, "خلص الوقت!", sad trombone… then the card flips to Orin's version
 *   8.2–20 s   two more rounds (biology, economics): textbook page → flip → Orin
 *   20–27 s    "نفس المعلومة… بس بلغتك 😌" → logo, slogan, download CTA
 *
 * Same contract as the other compositions: a pure function of time driven by
 * `ORIN.seek(t)`; `ORIN.cues` feeds render/soundtrack_v3.py.
 */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const RENDER = new URLSearchParams(location.search).has('render');
  if (RENDER) document.body.classList.add('render');

  const W = 1080, H = 1920, DURATION = 27, FPS = 60, BPM = 120;
  const FLIP = 0.7; // card flip duration
  const ROUNDS = [
    { s: 0.0, flip: 4.8, end: 7.9 },
    { s: 8.2, flip: 10.4, end: 13.9 },
    { s: 14.2, flip: 16.4, end: 19.9 },
  ].map((r) => ({ ...r, land: +(r.flip + FLIP).toFixed(3) }));
  const T = { rounds: ROUNDS, outro: 20.2, logo: 22.1 };

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

    const dust = $('#dust');
    const r = rng(3);
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
  function textIn(sel, t, { stagger = 0.06, dur = 0.7, ease = 'expo.out', rot = 3 } = {}) {
    tl.fromTo(wordsOf(sel), { yPercent: 118, rotation: rot, autoAlpha: 1 },
      { yPercent: 0, rotation: 0, duration: dur, ease, stagger, immediateRender: false }, t);
  }
  function textOut(sel, t, { stagger = 0.03, dur = 0.34, ease = 'power3.in' } = {}) {
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
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const mix = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
  const RED = hex('#FF4D5E'), AMBER = hex('#FFBE46'), GREEN = hex('#34D399');

  /* ───────────────────────── build ───────────────────────── */

  function build() {
    tl = gsap.timeline({ paused: true });

    gsap.set($$('.wi'), { yPercent: 118, autoAlpha: 0 });
    gsap.set($$('.wordmark .ch'), { yPercent: 110, autoAlpha: 0 });
    gsap.set($$('.rchip, .flip, #timer, #stamp, #meter, .orin .emoji, .orin .ok'), { autoAlpha: 0 });
    gsap.set('#g1', { x: 540, y: 1050, scale: 1, opacity: 0.18 });
    gsap.set('#g2', { x: 180, y: 320, opacity: 0.3 });
    gsap.set('#gPaper', { x: 540, y: 1040, opacity: 0 });
    gsap.set('#grid', { opacity: 0.45 });
    gsap.set('#cta', { opacity: 0, scale: 0.3 });
    gsap.set('#cta .shine', { x: -260, rotation: 18 });

    // understanding meter (0–100), drawn by an updater
    const M = { v: 0 };
    const fill = $('#meter .mfill'), emo = $('#meter .memo'), pct = $('#meter .mpct');
    updaters.push(() => {
      const v = clamp(M.v, 0, 100);
      const c = v < 50 ? mix(RED, AMBER, v / 50) : mix(AMBER, GREEN, (v - 50) / 50);
      fill.style.width = `${v.toFixed(2)}%`;
      fill.style.background = `rgb(${c.join(',')})`;
      fill.style.boxShadow = `0 0 30px rgba(${c.join(',')},.55)`;
      emo.style.right = `${v.toFixed(2)}%`;
      const e = v < 35 ? '😵' : v < 75 ? '🤔' : '😎';
      if (emo.textContent !== e) emo.textContent = e;
      const p = `${Math.round(v)}%`;
      if (pct.textContent !== p) pct.textContent = p;
      pct.style.color = `rgb(${c.join(',')})`;
    });
    tl.to('#meter', { autoAlpha: 1, duration: 0.4 }, 0.35);
    tl.to('#meter', { autoAlpha: 0, duration: 0.3 }, ROUNDS[2].end);

    ROUNDS.forEach((R, i) => {
      const n = i + 1;
      const card = $(`#r${n}`), c3 = $('.card3d', card);
      const front = $('.front', card), back = $('.back', card);
      const marks = $$('mark', front);

      // ---- chip + card in ----
      tl.fromTo(`#rc${n}`, { autoAlpha: 0, scale: 0.7 }, { autoAlpha: 1, scale: 1, duration: 0.4, ease: 'back.out(2)', immediateRender: false }, R.s + 0.08);
      if (i === 0) {
        cue(0, 'slam');
        tl.fromTo(card, { autoAlpha: 0.35, scale: 1.4, rotation: -7, y: -80 }, { autoAlpha: 1, scale: 1, rotation: -1.2, y: 0, duration: 0.38, ease: 'expo.out', immediateRender: false }, 0);
        shake(0.06, 20);
        flash(0.02, 0.12);
      } else {
        cue(R.s - 0.05, 'swish');
        tl.fromTo(card, { autoAlpha: 1, x: 1150, rotation: 14, scale: 1 }, { x: 0, rotation: i % 2 ? 1.2 : -1.2, duration: 0.6, ease: 'expo.out', immediateRender: false }, R.s);
      }
      tl.to('#gPaper', { opacity: 1, duration: 0.5 }, R.s);
      tl.to('#g1', { opacity: 0.12, duration: 0.5 }, R.s);

      // ---- book phase: headline, highlighter, pen note, meter creeping ----
      const hBook = i === 0 ? '#hHook' : `#hBook${n}`;
      textIn(hBook, R.s + 0.06, { stagger: 0.06, dur: 0.6 });
      const hlStart = i === 0 ? 0.7 : R.s + 0.45, hlGap = i === 0 ? 0.45 : 0.28;
      marks.forEach((m, k) => {
        const t = hlStart + k * hlGap;
        tl.fromTo(m, { backgroundSize: '0% 100%' }, { backgroundSize: '100% 100%', duration: 0.34, ease: 'power2.out', immediateRender: false }, t);
        cue(t, 'marker', { k });
      });
      const penT = i === 0 ? 1.95 : R.s + 1.4;
      tl.fromTo($('.pen', front), { clipPath: 'inset(-20% 0% -20% 100%)' }, { clipPath: 'inset(-20% 0% -20% 0%)', duration: 0.45, ease: 'power1.inOut', immediateRender: false }, penT);
      cue(penT, 'scribble');
      tl.to(M, { v: [12, 15, 8][i], duration: i === 0 ? 2.6 : 1.5, ease: 'power1.out' }, i === 0 ? 0.6 : R.s + 0.4);

      if (i === 0) {
        // countdown 3-2-1 on a ring, then "time's up"
        const TM = { p: 1 };
        const prog = $('#timer .tprog'), num = $('#tnum');
        updaters.push((t) => {
          prog.setAttribute('stroke-dasharray', `${(TM.p * 100).toFixed(2)} 100`);
          const k = String(clamp(3 - Math.floor(t - 0.35), 1, 3));
          if (num.textContent !== k) num.textContent = k;
        });
        tl.fromTo('#timer', { autoAlpha: 0, scale: 0.3 }, { autoAlpha: 1, scale: 1, duration: 0.4, ease: 'back.out(2.2)', immediateRender: false }, 0.2);
        tl.fromTo(TM, { p: 1 }, { p: 0, duration: 3.0, ease: 'none', immediateRender: false }, 0.35);
        [0.35, 1.35, 2.35].forEach((t, k) => {
          tl.fromTo('#tnum', { scale: 1.6 }, { scale: 1, duration: 0.35, ease: 'back.out(2)', immediateRender: false }, t);
          cue(t, 'tickBig', { k });
          cue(t + 0.5, 'tick');
        });
        tl.set('#timer .tprog', { stroke: '#FF4D5E' }, 2.35);
        tl.to('#timer', { autoAlpha: 0, scale: 0.4, duration: 0.25, ease: 'power2.in' }, 3.38);

        tl.fromTo('#stamp', { autoAlpha: 0, scale: 2.6, rotation: -26 }, { autoAlpha: 1, scale: 1, rotation: -11, duration: 0.2, ease: 'power4.in', immediateRender: false }, 3.3);
        cue(3.5, 'buzzer');
        shake(3.5, 16);
        tl.to(card, { rotation: -2.5, duration: 0.06, yoyo: true, repeat: 5, ease: 'sine.inOut' }, 3.5);
        tl.to('#stamp', { autoAlpha: 0, scale: 1.1, duration: 0.18 }, R.flip - 0.12);

        textOut('#hHook', 3.5, { stagger: 0.02, dur: 0.3 });
        textIn('#hHuh', 3.88, { stagger: 0.08, dur: 0.55 });
        cue(3.9, 'wahwah');
        textOut('#hHuh', R.flip - 0.12);
      } else {
        textOut(hBook, R.flip - 0.3);
        cue(R.flip - 0.62, 'wahwah', { short: true });
      }

      // ---- the flip ----
      cue(R.flip, 'flip');
      tl.to(c3, { rotationY: -180, duration: FLIP, ease: 'expo.inOut' }, R.flip);
      tl.to(card, { scale: 1.07, rotation: 0, duration: FLIP / 2, ease: 'power2.out' }, R.flip)
        .to(card, { scale: 1, duration: FLIP / 2, ease: 'back.out(2)' }, R.flip + FLIP / 2);
      tl.to('#gPaper', { opacity: 0, duration: 0.4 }, R.flip + 0.2);
      tl.to('#g1', { opacity: 0.95, scale: 1.25, duration: 0.6, ease: 'expo.out' }, R.land - 0.1);
      tl.to('#grid', { opacity: 0.9, duration: 0.5 }, R.land);

      // ---- Orin phase ----
      cue(R.land, 'drop', { i });
      flash(R.land - 0.02, 0.1);
      textIn(`#hOrin${n}`, R.flip + 0.06, { stagger: 0.07, dur: 0.6 });
      const emoji = $('.emoji', back);
      tl.fromTo(emoji, { autoAlpha: 0, scale: 0, rotation: -35 }, { autoAlpha: 1, scale: 1, rotation: 0, duration: 0.55, ease: 'back.out(2.6)', immediateRender: false }, R.land + 0.02);
      cue(R.land + 0.05, 'pop');
      tl.to(emoji, { y: -18, rotation: 6, duration: 0.25, yoyo: true, repeat: 5, ease: 'sine.inOut' }, R.land + 0.6);
      const sws = $$('.sw', back);
      tl.fromTo(sws, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.22, ease: 'power2.out', stagger: 0.05, immediateRender: false }, R.land - 0.05);
      $$('u', back).forEach((u, k) => {
        const t = R.land + 0.95 + k * 0.28;
        tl.fromTo(u, { backgroundSize: '0% 5px' }, { backgroundSize: '100% 5px', duration: 0.35, ease: 'power2.out', immediateRender: false }, t);
      });
      tl.to(M, { v: 100, duration: 1.2, ease: 'power2.out' }, R.land + 0.1);
      cue(R.land + 0.1, 'meterUp', { until: R.land + 1.3 });
      tl.fromTo($('.ok', back), { autoAlpha: 0, scale: 0.5 }, { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'back.out(2.4)', immediateRender: false }, R.land + 1.45);
      cue(R.land + 1.45, 'success');
      for (let t = R.land + 0.5; t < R.end - 0.2; t += 0.5) {
        tl.to('#g1', { opacity: '+=0.1', duration: 0.05, ease: 'none' }, t).to('#g1', { opacity: '-=0.1', duration: 0.38, ease: 'power2.out' }, t + 0.05);
      }

      // ---- out ----
      textOut(`#hOrin${n}`, R.end - 0.05);
      tl.to(`#rc${n}`, { autoAlpha: 0, scale: 0.8, duration: 0.25 }, R.end - 0.05);
      tl.to(card, { x: -1150, rotation: -14, duration: 0.45, ease: 'power3.in' }, R.end);
      tl.set(card, { autoAlpha: 0 }, R.end + 0.46);
      if (i < 2) tl.to(M, { v: 0, duration: 0.35, ease: 'power2.in' }, R.end);
      tl.to('#g1', { opacity: 0.2, scale: 1, duration: 0.4 }, R.end + 0.1);
    });

    /* ============ OUTRO ============ */
    const O = T.outro, L = T.logo;
    cue(O - 0.25, 'whoosh');
    tl.to('#g1', { opacity: 0.7, y: 900, duration: 0.6 }, O);
    textIn('#same', O + 0.05, { stagger: 0.09, dur: 0.7 });
    cue(O + 0.55, 'pop');
    textOut('#same', L - 0.4, { stagger: 0.04 });
    cue(O + 0.8, 'build', { until: L });

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
    [L + 2.3, L + 3.4].forEach((t) => tl.fromTo('#cta .shine', { x: -260 }, { x: 900, duration: 0.85, ease: 'power2.inOut', immediateRender: false }, t));
    tl.to('#cta', { scale: 1.045, duration: 0.18, yoyo: true, repeat: 1, ease: 'power2.out' }, L + 2.9);
    tl.to('#outro', { scale: 1.03, duration: 4.4, ease: 'sine.inOut', transformOrigin: '50% 45%' }, L + 0.3);

    tl.set({}, {}, DURATION);
  }

  /* ───────────────────────── player ───────────────────────── */

  function seek(t) {
    t = clamp(t, 0, DURATION);
    tl.seek(t, false);
    for (const u of updaters) u(t);
  }

  const ready = (async () => {
    await Promise.all(['700 100px Alexandria', '800 100px Alexandria', '400 30px Readex', '500 30px Readex', '600 30px Readex',
      '600 30px Outfit', '700 30px Outfit', '400 40px Amiri', '700 40px Amiri', '700 40px Ruqaa']
      .map((f) => document.fonts.load(f, 'Orin 0123456789 …عربي')));
    await document.fonts.ready;
    prepDOM();
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    build();
    cues.sort((a, b) => a.t - b.t);
    seek(0);
    return true;
  })();

  window.ORIN = { id: 'v3', soundtrack: 'soundtrack_v3.py', ready, seek, cues, T, W, H, FPS, BPM, get duration() { return DURATION; } };

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
