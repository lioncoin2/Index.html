/*
 * Orin — ad v5 "تحدّي 3 أسئلة" (play-along quiz, 34.5s, 1080×1920).
 *
 * The viewer plays along: three trick questions, each with a 3-second countdown.
 * The countdown timer IS the Orin ring — on every reveal it snaps into the logo and
 * flies into the explanation card as Orin's avatar. Question 3 is the trap (the
 * bat-and-ball problem): the answer "most people picked" gets stamped wrong first,
 * then the real one lands. Ends on a self-score table (comment bait: "اكتب نتيجتك
 * بالتعليقات 👇") and the brand end card.
 *
 *   0.00–2.50   hook: "3" slam, "أسئلة بس…", warning sticker, fly-through the 3
 *   2.50–10.0   Q1 (سهل)    countdown 4.0→7.0, reveal 7.0
 *   10.0–17.5   Q2 (متوسط)  countdown 11.5→14.5, reveal 14.5
 *   17.5–27.5   Q3 (صعب)    countdown 19.5→22.5, trap 22.5, real reveal 23.5
 *   27.5–30.75  "كم جبت؟" score table + comment prompt
 *   30.75–34.5  pitch → logo → wordmark → CTA
 *
 * Same conventions as v4 (shared Cinema toolkit, deterministic seek(t), one owner per
 * transform: #world = GSAP shakes, #rig = updater handheld, #push = GSAP push-ins).
 */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const RENDER = new URLSearchParams(location.search).has('render');
  if (RENDER) document.body.classList.add('render');

  const W = 1080, H = 1920, DURATION = 34.5, FPS = 60, BPM = 120;
  // s = question in, c0 = countdown starts, r = time's up, rv = answer revealed, end = whip out
  const Q = [
    { s: 2.5, c0: 4.0, r: 7.0, rv: 7.0, end: 10.0 },
    { s: 10.0, c0: 11.5, r: 14.5, rv: 14.5, end: 17.5 },
    { s: 17.5, c0: 19.5, r: 22.5, rv: 23.5, end: 27.5, trap: true },
  ];
  const T = { hook: 0, zoom: 1.95, q: Q, score: 27.5, end: 30.75, logo: 32.15 };
  // timer sits *below* the answers: once the wrong answers leave, its logo flies up into the
  // explanation card through empty space instead of across the answer card
  const RING = { x: 540, y: 1228, r: 92 };
  const CH_TOP = 650, SLOT = 156;
  const AVATAR_LOGO = 46; // px size of the static logo inside the explanation card's avatar

  const cues = [];
  const cue = (t, type, extra = {}) => cues.push({ t: Math.round(t * 1000) / 1000, type, ...extra });
  const updaters = [];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  const CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.8l4.4 4.4L19 7.6"/></svg>';
  const CROSS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"><path d="M6.6 6.6l10.8 10.8M17.4 6.6L6.6 17.4"/></svg>';

  /* ───────────────────────── DOM prep (shared pattern with v2–v4) ───────────────────────── */

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

    // answer cards: stack them, give each a clipped shine layer, and a ✓ / ✗ mark
    $$('.q').forEach((q) => {
      const ci = +q.dataset.correct;
      const trap = q.dataset.trap != null ? +q.dataset.trap : -1;
      $$('.choice', q).forEach((c, k) => {
        c.style.top = `${CH_TOP + k * SLOT}px`;
        const clip = document.createElement('i');
        clip.className = 'sclip';
        c.appendChild(clip);
        const mark = $('.mark', c);
        if (k === ci) { mark.classList.add('good'); mark.innerHTML = CHECK; }
        if (k === trap) {
          mark.classList.add('bad');
          mark.innerHTML = CROSS;
          const rg = document.createElement('i');
          rg.className = 'rglow';
          c.insertBefore(rg, c.firstChild); // under the content, like .cglow
        }
      });
    });

    const dust = $('#dust');
    const r = (() => { let s = 5; return () => { s = (s + 0x6D2B79F5) | 0; let x = Math.imul(s ^ (s >>> 15), 1 | s); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; })();
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

    Cinema.grain($('#grain'), 77, 0.13);
  }

  function stagePos(el) {
    const sr = $('#stage').getBoundingClientRect();
    const k = sr.width / W;
    const r = el.getBoundingClientRect();
    return { x: (r.left + r.width / 2 - sr.left) / k, y: (r.top + r.height / 2 - sr.top) / k, w: r.width / k, h: r.height / k };
  }

  /* Procedural ring: countdown timer (track + depleting arc + red halo) that can grow
     the two logo arcs in place and fly anywhere — all state is a plain object that
     GSAP tweens and the updater writes into the SVG each frame. */
  function ringView(svg, init) {
    const g = $('.ring-g', svg), shock = $('.shock', svg), pw = $('.pw', svg), pc = $('.pc', svg);
    const track = $('.track', svg), prog = $('.prog', svg), halo = $('.halo', svg);
    const st = Object.assign({
      x: 540, y: 960, s: 1, r: 240, rot: 0, white: 0, coral: 0, thin: 1, alpha: 1, shockR: 0, shockA: 0,
      track: 0, prog: 1, progLen: 0, hot: 0, halo: 0,
    }, init);
    const cr = (st.r * 0.972).toFixed(2);
    [track, prog, halo].forEach((c) => c && c.setAttribute('r', cr));
    let key = '';
    updaters.push(() => {
      g.setAttribute('transform', `translate(${st.x.toFixed(2)} ${st.y.toFixed(2)}) scale(${st.s.toFixed(4)})`);
      svg.style.opacity = clamp(st.alpha).toFixed(3);
      shock.setAttribute('cx', st.x.toFixed(1));
      shock.setAttribute('cy', st.y.toFixed(1));
      shock.setAttribute('r', Math.max(1, st.shockR).toFixed(1));
      shock.setAttribute('opacity', clamp(st.shockA).toFixed(3));
      if (track) track.style.opacity = clamp(st.track).toFixed(3);
      if (halo) halo.style.opacity = clamp(st.halo).toFixed(3);
      if (prog) {
        // the remaining time is the arc from the "hand" clockwise back to 12 o'clock,
        // so the empty part grows clockwise like a real timer
        const L = clamp(st.progLen);
        prog.style.opacity = (L > 0.002 ? st.prog : 0).toFixed(3);
        prog.setAttribute('stroke-dasharray', `${(L * 1000).toFixed(1)} 1000`);
        prog.setAttribute('stroke-dashoffset', (-(1 - L) * 1000).toFixed(1));
        const h = clamp(st.hot);
        prog.setAttribute('stroke', `rgb(247,${Math.round(247 - 170 * h)},${Math.round(247 - 153 * h)})`);
      }
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

  let tl, R;
  const wordsOf = (sel) => $$('.wi', typeof sel === 'string' ? $(sel) : sel);
  function textIn(sel, t, { stagger = 0.06, dur = 0.7, ease = 'orinIn', rot = 3 } = {}) {
    tl.fromTo(wordsOf(sel), { yPercent: 118, rotation: rot, autoAlpha: 1 },
      { yPercent: 0, rotation: 0, duration: dur, ease, stagger, immediateRender: false }, t);
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
  // camera tension: ramps up through each countdown, holds through the trap, then eases off
  function tension(t) {
    let v = 0;
    for (const q of Q) {
      if (t >= q.c0 && t < q.r) v = Math.max(v, (t - q.c0) / (q.r - q.c0));
      else if (t >= q.r && t < q.rv) v = Math.max(v, 1);
      else if (t >= q.rv) v = Math.max(v, Math.exp(-(t - q.rv) / 0.3));
    }
    return v;
  }

  /* ───────────────────────── question beats ───────────────────────── */

  function morphToLogo(t, big) {
    tl.to(R, { track: 0, duration: 0.28, ease: 'power2.in' }, t);
    tl.to(R, { hot: 0, halo: 0, duration: 0.2, ease: 'power2.out' }, t);
    tl.set(R, { progLen: 0 }, t);
    tl.fromTo(R, { white: 0, coral: 0, rot: -250, thin: 0.3 },
      { white: 1, coral: 1, rot: 0, thin: 1, duration: 0.62, ease: 'expo.out', immediateRender: false }, t);
    tl.fromTo(R, { shockR: RING.r, shockA: 0.85 },
      { shockR: RING.r * (big ? 6.5 : 4), shockA: 0, duration: 0.75, ease: 'expo.out', immediateRender: false }, t);
    flash(t, big ? 0.3 : 0.16);
    if (big) {
      shake(t, 16);
      Cinema.flarePulse(tl, $('#push'), RING.x, RING.y, t, { peak: 0.95, dur: 0.95, color: '255,107,86' });
    }
    tl.to('#push', { scale: 1, duration: 0.55, ease: 'expo.out' }, t);
    tl.to('#alarm', { opacity: 0, duration: 0.3, ease: 'power2.out' }, t);
    tl.fromTo('#g1', { opacity: 0.8, scale: 1.3 }, { opacity: 0.22, scale: 1, duration: 1.1, ease: 'power2.out', immediateRender: false }, t);
  }

  // the logo shrinks into the explanation card's avatar, spinning once on the way
  function flyRing(t, av, avatarEl) {
    const D = 0.5;
    tl.to(R, { x: av.x, duration: D, ease: 'power2.inOut' }, t);
    tl.to(R, { y: av.y, duration: D, ease: 'power2.out' }, t); // rises first, then curls into the seat
    tl.to(R, { s: (0.48 * AVATAR_LOGO) / RING.r, duration: D, ease: 'power2.out' }, t); // small before it reaches the label
    tl.to(R, { rot: 360, duration: D, ease: 'power2.inOut' }, t);
    cue(t, 'fly');
    tl.set(R, { alpha: 0 }, t + D);
    tl.set($('svg', avatarEl), { opacity: 1 }, t + D);
    tl.fromTo(avatarEl, { scale: 1.45 }, { scale: 1, duration: 0.45, ease: 'back.out(3)', immediateRender: false }, t + D);
    cue(t + D, 'land');
  }

  function trapBeat(q, trapEl) {
    const r = q.r, tw = r + 0.5;
    // time's up → the crowd favourite lights amber
    tl.to($('.let', trapEl), { backgroundColor: 'rgba(255,181,71,1)', color: '#140907', duration: 0.18 }, r);
    tl.fromTo($('.crowd', trapEl), { opacity: 0, scale: 0.4, rotation: -12 },
      { opacity: 1, scale: 1, rotation: -3, duration: 0.42, ease: 'uiPop', immediateRender: false }, r + 0.02);
    tl.fromTo(R, { halo: 0.6 }, { halo: 0.15, duration: 0.45, ease: 'power2.out', immediateRender: false }, r);
    const tu = $('#count .tu'); // ⏰ rings inside the empty timer while we hang on the mistake
    tl.fromTo(tu, { opacity: 0, scale: 1.7, rotation: 0 }, { opacity: 1, scale: 1, duration: 0.3, ease: 'expo.out', immediateRender: false }, r);
    [14, -12, 10, -8, 5, 0].forEach((v, k) => tl.to(tu, { rotation: v, duration: 0.06, ease: 'sine.inOut' }, r + 0.05 + k * 0.06));
    tl.to(tu, { opacity: 0, scale: 0.5, duration: 0.14, ease: 'power2.in' }, q.rv - 0.14);
    tl.to('#push', { scale: 1.085, duration: q.rv - r, ease: 'sine.inOut' }, r);
    cue(r, 'trapPick');
    // …stamped wrong
    tl.to($('.rglow', trapEl), { opacity: 1, duration: 0.1 }, tw);
    tl.to($('.let', trapEl), { backgroundColor: 'rgba(255,77,94,1)', color: '#ffffff', duration: 0.1 }, tw);
    tl.to($('.mark', trapEl), { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(3)' }, tw);
    [1, -0.8, 0.6, -0.4, 0.2, 0].forEach((v, k) => tl.to(trapEl, { x: v * 24, duration: 0.05, ease: 'sine.inOut' }, tw + k * 0.05));
    shake(tw, 14);
    Cinema.chromaBurst(tl, trapEl, tw, { amp: 22, size: 520 });
    tl.fromTo('#alarm', { opacity: 1 }, { opacity: 0.35, duration: 0.5, ease: 'power2.out', immediateRender: false }, tw);
    cue(tw, 'wrong');
  }

  function buildQuestion(q, i, lay) {
    const el = $(`#q${i + 1}`);
    const choices = $$('.choice', el);
    const ci = +el.dataset.correct;
    const trap = el.dataset.trap != null ? +el.dataset.trap : -1;
    const good = choices[ci];
    const xc = $('.xcard', el);
    const segFill = $$('#hud .segs b')[i];

    /* ---- in ---- */
    cue(q.s, 'qIn', { i });
    if (i === 0) {
      tl.fromTo(el, { autoAlpha: 0, scale: 0.8 }, { autoAlpha: 1, scale: 1, duration: 0.6, ease: 'expo.out', immediateRender: false }, q.s - 0.05);
      tl.fromTo('#hud', { autoAlpha: 0, y: -50 }, { autoAlpha: 1, y: 0, duration: 0.55, ease: 'expo.out', immediateRender: false }, q.s + 0.05);
      flash(q.s - 0.04, 0.22);
    } else {
      tl.set(el, { autoAlpha: 1 }, q.s - 0.01);
      tl.fromTo(el, { x: -1150 }, { x: 0, duration: 0.55, ease: 'expo.out', immediateRender: false }, q.s);
      tl.to('#hud .roll', { y: -46 * i, duration: 0.45, ease: 'back.out(2)' }, q.s + 0.05);
      tl.fromTo('#hud .hlabel', { scale: 1.14 }, { scale: 1, duration: 0.4, ease: 'power2.out', immediateRender: false }, q.s + 0.05);
    }
    tl.to(segFill, { scaleX: 1, duration: q.end - q.s, ease: 'none' }, q.s);
    // Q1 builds its text after zooming in; Q2/Q3 arrive already written, so the whip pan
    // carries a real card across the frame instead of an empty one
    const dc = i === 0 ? 0.62 : 0.3;
    if (i === 0) {
      popIn($('.lvl', el), q.s + 0.12, { from: 16 });
      textIn($('.qtext', el), q.s + 0.14, { stagger: 0.03, dur: 0.5 });
    } else {
      tl.set($('.lvl', el), { opacity: 1 }, q.s - 0.01);
      tl.set(wordsOf($('.qtext', el)), { yPercent: 0, rotation: 0, autoAlpha: 1 }, q.s - 0.01);
    }
    if (i === 2) {
      cue(q.s, 'hard');
      tl.to($('.lvl', el), { scale: 1.12, duration: 0.12, yoyo: true, repeat: 3, ease: 'sine.inOut' }, q.s + 0.5);
    }
    choices.forEach((c, k) => {
      const tk = q.s + dc + k * 0.11;
      tl.fromTo(c, { opacity: 0, y: 50, scale: 0.94 }, { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: 'orinIn', immediateRender: false }, tk);
      cue(tk, 'opt', { k });
    });

    /* ---- countdown: the ring charges, then drains over 3 seconds ---- */
    const { c0, r } = q;
    tl.set(R, { x: RING.x, y: RING.y, s: 0.6, rot: 0, white: 0, coral: 0, thin: 1, alpha: 1, track: 0, prog: 1, progLen: 0, hot: 0, halo: 0 }, c0 - 0.42);
    tl.to(R, { track: 1, duration: 0.3, ease: 'power2.out' }, c0 - 0.4);
    tl.to(R, { progLen: 1, duration: 0.4, ease: 'expo.out' }, c0 - 0.4);
    tl.to(R, { s: 1, duration: 0.45, ease: 'back.out(2.2)' }, c0 - 0.4);
    cue(c0 - 0.4, 'charge');
    tl.to(R, { progLen: 0, duration: r - c0, ease: 'none' }, c0);
    tl.to(R, { hot: 1, duration: 1.1, ease: 'power1.in' }, c0 + 1.5);
    tl.fromTo('#push', { scale: 1 }, { scale: 1.06, duration: r - c0, ease: 'sine.in', immediateRender: false }, c0);
    $$('#count span:not(.tu)').forEach((d, k) => {
      const tk = c0 + k;
      tl.fromTo(d, { opacity: 0, scale: 1.8 }, { opacity: 1, scale: 1, duration: 0.32, ease: 'expo.out', immediateRender: false }, tk);
      tl.to(d, { opacity: 0, scale: 0.5, duration: 0.16, ease: 'power2.in' }, tk + 0.84);
      tl.fromTo('#g1', { opacity: 0.5, scale: 1.12 }, { opacity: 0.22, scale: 1, duration: 0.8, ease: 'power2.out', immediateRender: false }, tk);
      cue(tk, 'count', { n: 3 - k });
    });
    // last second: heartbeat — red edge + halo pulse twice
    [c0 + 2.0, c0 + 2.5].forEach((tb) => {
      tl.fromTo('#alarm', { opacity: 0.95 }, { opacity: 0.25, duration: 0.45, ease: 'power2.out', immediateRender: false }, tb);
      tl.fromTo(R, { halo: 0.55 }, { halo: 0.08, duration: 0.45, ease: 'power2.out', immediateRender: false }, tb);
      cue(tb, 'heart');
    });

    /* ---- reveal ---- */
    if (trap >= 0) trapBeat(q, choices[trap]);
    const t = q.rv;
    morphToLogo(t, i === 2);
    tl.to($('.cglow', good), { opacity: 1, duration: 0.22, ease: 'power2.out' }, t);
    tl.to($('.let', good), { backgroundColor: 'rgba(52,211,153,1)', color: '#052016', duration: 0.22 }, t);
    tl.fromTo(good, { scale: 1 }, { scale: 1.05, duration: 0.13, yoyo: true, repeat: 1, ease: 'power2.out', immediateRender: false }, t);
    tl.to($('.mark', good), { opacity: 1, scale: 1, duration: 0.5, ease: 'uiPop' }, t + 0.06);
    Cinema.sweep(tl, $('.sclip', good), t + 0.12, { dur: 0.6, color: 'rgba(170,255,220,.42)' });
    const others = choices.filter((c) => c !== good);
    tl.to(others, { opacity: 0.28, duration: 0.3, ease: 'power2.out' }, t + 0.02);
    cue(t, 'correct', { big: i === 2 });

    // collapse: the others leave, the right answer rises into the top slot
    tl.to(others, { x: -160, opacity: 0, duration: 0.3, ease: 'power2.in', stagger: 0.05 }, t + 0.5);
    if (ci > 0) tl.to(good, { y: -ci * SLOT, duration: 0.5, ease: 'expo.inOut' }, t + 0.55);
    cue(t + 0.5, 'collapse');

    // explanation card pops in where the wrong answers were; the logo flies up into its avatar
    tl.fromTo(xc, { opacity: 0, y: 70, scale: 0.94 }, { opacity: 1, y: 0, scale: 1, duration: 0.55, ease: 'uiPop', immediateRender: false }, t + 0.95);
    cue(t + 0.95, 'card');
    flyRing(t + 1.0, lay.av, $('.xav', xc));
    tl.fromTo($$('.sw', xc), { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.22, ease: 'power2.out', stagger: 0.04, immediateRender: false }, t + 1.45);
    Cinema.sweep(tl, xc, t + 1.6, { dur: 0.8, color: 'rgba(255,255,255,.16)' });

    /* ---- out ---- */
    if (i < Q.length - 1) {
      tl.to(el, { x: 1150, duration: 0.4, ease: 'power2.in' }, q.end - 0.4);
      tl.set(el, { autoAlpha: 0 }, q.end);
      cue(q.end - 0.36, 'whip');
    } else {
      // autoAlpha (not opacity + a later autoAlpha set) so scrubbing backwards restores visibility too
      tl.to(el, { scale: 0.9, autoAlpha: 0, duration: 0.35, ease: 'power2.in' }, q.end - 0.35);
      tl.to('#hud', { y: -60, autoAlpha: 0, duration: 0.3, ease: 'power2.in' }, q.end - 0.35);
    }
  }

  /* ───────────────────────── build ───────────────────────── */

  function build() {
    // Always write 2D transforms and let nothing be promoted to its own compositor layer
    // (see v5.css): a promoted layer keeps the raster scale it was created at, so text
    // inside a push-in rendered slightly differently depending on the seek history
    // (frame-by-frame vs. a worker jumping straight to its first frame).
    gsap.config({ force3D: false });
    tl = gsap.timeline({ paused: true });

    // measure layout before any transform exists: where each card's avatar sits (the ring's flight target)
    const layout = $$('.q').map((q) => ({ av: stagePos($('.xav', q)) }));

    gsap.set($$('.wi'), { yPercent: 118, autoAlpha: 0 });
    gsap.set($$('.wordmark .ch'), { yPercent: 110, autoAlpha: 0 });
    gsap.set('#hud, .q, #score, #end', { autoAlpha: 0 });
    gsap.set('.lvl, .choice, .xcard, .tier, #point, #sticker', { opacity: 0 });
    gsap.set('.mark', { opacity: 0, scale: 0.3 });
    gsap.set('.crowd', { opacity: 0, scale: 0.4 });
    gsap.set('.xav svg', { opacity: 0 }); // the flying ring becomes this logo on landing
    gsap.set('#count span', { xPercent: -50, yPercent: -50, opacity: 0 });
    gsap.set('#cta', { opacity: 0, scale: 0.3 });
    gsap.set('#cta .shine', { x: -260, rotation: 18 });
    gsap.set('#big3', { scale: 1.45, transformOrigin: '48.7% 63%' }); // origin = the open mouth of the 3's lower bowl, so the zoom flies *through* it
    gsap.set('#g1', { x: 540, y: 800, scale: 1.3, opacity: 0.75 });
    gsap.set('#g2', { x: 880, y: 330, opacity: 0.16 });
    gsap.set('#grid', { opacity: 0.32 });
    gsap.set('#alarm', { opacity: 0 });
    gsap.set('#push', { transformOrigin: '540px 940px' }); // between the answers and the timer
    gsap.set('#pitch', { y: 470 });
    gsap.set('#hud .segs b', { scaleX: 0 });

    R = ringView($('#ringQ'), { x: RING.x, y: RING.y, r: RING.r, alpha: 0 });

    /* ================= HOOK ================= */
    cue(0, 'slam', { big: true });
    flash(0, 0.24);
    shake(0.02, 22);
    Cinema.chromaBurst(tl, $('#big3 .ltr'), 0.02, { amp: 18 });
    tl.to('#big3', { scale: 1, duration: 0.42, ease: 'orinIn' }, 0);
    tl.to('#big3', { scale: 1.05, duration: T.zoom - 0.44, ease: 'none' }, 0.44);
    tl.to('#g1', { opacity: 0.34, scale: 1, duration: 1.2, ease: 'power2.out' }, 0);
    textIn('#hkA', 0.22, { stagger: 0.08, dur: 0.55 });
    cue(0.22, 'word');
    textIn('#hkB', 0.72, { stagger: 0.05, dur: 0.5 });
    cue(0.72, 'tickTock', { until: T.zoom });
    // warning sticker slapped on
    tl.fromTo('#sticker', { opacity: 0, scale: 2.4, rotation: 10 }, { opacity: 1, scale: 1, rotation: 0, duration: 0.26, ease: 'power4.in', immediateRender: false }, 1.2);
    tl.to('#sticker', { scale: 1.05, duration: 0.07, yoyo: true, repeat: 1, ease: 'power2.out' }, 1.46);
    shake(1.46, 12);
    cue(1.46, 'slap');
    Cinema.sweep(tl, $('#sticker span'), 1.6, { dur: 0.5, color: 'rgba(255,255,255,.9)' });
    // fly through the "3" into question 1
    cue(T.zoom, 'zoom', { until: Q[0].s });
    tl.to('#hkA', { y: 160, opacity: 0, duration: 0.32, ease: 'power2.in' }, T.zoom);
    tl.to('#hkB', { y: 200, opacity: 0, duration: 0.3, ease: 'power2.in' }, T.zoom);
    tl.to('#sticker', { y: -240, scale: 1.3, opacity: 0, duration: 0.32, ease: 'power2.in' }, T.zoom);
    tl.to('#big3', { scale: 22, duration: 0.55, ease: 'expo.in' }, T.zoom);
    tl.to('#big3', { opacity: 0, duration: 0.1, ease: 'none' }, Q[0].s - 0.1);
    tl.set('#hook', { autoAlpha: 0 }, Q[0].s + 0.02);

    /* ================= QUESTIONS ================= */
    tl.set('#g1', { y: RING.y }, Q[0].s - 0.1);
    Q.forEach((q, i) => buildQuestion(q, i, layout[i]));

    /* ================= SCORE ================= */
    const S = T.score;
    tl.set('#score', { autoAlpha: 1 }, S - 0.02);
    cue(S, 'scoreIn');
    flash(S, 0.14);
    textIn('#scTitle', S + 0.02, { stagger: 0.08, dur: 0.5 });
    tl.fromTo('#scTitle', { scale: 1.35 }, { scale: 1, duration: 0.45, ease: 'orinIn', immediateRender: false }, S + 0.02);
    ['#t3', '#t2', '#t1'].forEach((id, k) => {
      const tk = S + 0.42 + k * 0.2;
      tl.fromTo(id, { opacity: 0, x: -90, scale: 0.94 }, { opacity: 1, x: 0, scale: 1, duration: 0.42, ease: 'orinIn', immediateRender: false }, tk);
      cue(tk, 'tier', { n: k });
    });
    const hot = S + 1.05;
    tl.fromTo('#t0', { opacity: 0, scale: 1.5, rotation: -3 }, { opacity: 1, scale: 1, rotation: 0, duration: 0.25, ease: 'power4.in', immediateRender: false }, hot);
    shake(hot + 0.25, 14);
    cue(hot + 0.25, 'rimshot');
    Cinema.chromaBurst(tl, $('#t0'), hot + 0.25, { amp: 14, size: 380 });
    Cinema.sweep(tl, $('#t0'), hot + 0.45, { dur: 0.6 });
    textIn('#scCtaT', S + 1.6, { stagger: 0.07, dur: 0.5 });
    cue(S + 1.6, 'prompt');
    tl.fromTo('#point', { opacity: 0, y: -40, scale: 0.5 }, { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: 'uiPop', immediateRender: false }, S + 1.9);
    tl.to('#point', { y: 18, duration: 0.2, ease: 'sine.inOut', yoyo: true, repeat: 5 }, S + 2.35);
    tl.to('#score', { autoAlpha: 0, scale: 0.95, duration: 0.3, ease: 'power2.in' }, T.end - 0.3);

    /* ================= END CARD ================= */
    const E = T.end, L = T.logo;
    tl.set('#end', { autoAlpha: 1 }, E - 0.02);
    cue(E, 'endIn', { until: L });
    textIn('#p1', E + 0.02, { stagger: 0.06, dur: 0.55 });
    textIn('#p2', E + 0.36, { stagger: 0.07, dur: 0.55 });
    cue(E + 0.36, 'pop');
    tl.to('#pitch', { y: 0, duration: 0.7, ease: 'camera' }, E + 0.95);
    tl.set('#g1', { y: 812 }, E - 0.02);
    tl.fromTo('#g1', { opacity: 0 }, { opacity: 0.3, duration: 0.6, ease: 'power2.out', immediateRender: false }, E);

    const RB = ringView($('#ringB'), { x: 540, y: 812, r: 150, thin: 0.3, rot: -560 });
    cue(L, 'impact', { big: true });
    flash(L, 0.16);
    shake(L, 12);
    Cinema.flarePulse(tl, $('#end'), 540, 812, L + 0.05, { peak: 0.9, dur: 1.1, color: '255,107,86' });
    tl.set(RB, { white: 0.28, coral: 0.22 }, L - 0.02);
    tl.to(RB, { white: 1, duration: 0.9, ease: 'power3.inOut' }, L);
    tl.to(RB, { coral: 1, duration: 0.85, ease: 'power3.inOut' }, L + 0.05);
    tl.to(RB, { thin: 1, duration: 0.6, ease: 'power2.inOut' }, L + 0.25);
    tl.to(RB, { rot: 0, duration: 1.05, ease: 'expo.out' }, L - 0.02);
    tl.fromTo(RB, { shockR: 160, shockA: 0.8 }, { shockR: 900, shockA: 0, duration: 1.1, ease: 'expo.out', immediateRender: false }, L + 0.85);
    cue(L + 0.85, 'chime');
    tl.to('#g1', { opacity: 0.9, scale: 1.1, duration: 1.2, ease: 'expo.out' }, L + 0.4);
    tl.fromTo($$('#endWordmark .ch'), { yPercent: 110, autoAlpha: 1 }, { yPercent: 0, duration: 0.85, ease: 'expo.out', stagger: 0.05, immediateRender: false }, L + 0.45);
    const cta = $('#cta');
    tl.to(cta, { opacity: 1, scale: 1, duration: 0.7, ease: 'uiPop' }, L + 0.8);
    cue(L + 0.8, 'cta');
    [L + 1.35, L + 2.2].forEach((t) => Cinema.sweep(tl, cta, t, { dur: 0.75, color: 'rgba(255,255,255,.7)' }));
    tl.to(cta, { scale: 1.045, duration: 0.18, yoyo: true, repeat: 1, ease: 'power2.out' }, L + 1.9);

    /* ================= CAMERA ================= */
    const rig = $('#rig'), camPost = $('#camPost');
    updaters.push((t) => {
      const k = tension(t);
      const h = Cinema.handheld(t, { amp: 1.6 + 3.4 * k, rotAmp: 0.16 + 0.34 * k, seed: 7 });
      Cinema.applyCamera(rig, { x: h.x, y: h.y, rot: h.rot, scale: 1 });
      const p = Cinema.handheld(t, { amp: 2.2, rotAmp: 0.25, seed: 41, speed: 0.8 });
      Cinema.applyCamera(camPost, { x: p.x, y: p.y, rot: p.rot, scale: 1 });
    });

    tl.set({}, {}, DURATION);
  }

  /* ───────────────────────── player ───────────────────────── */

  // The renderer only ever seeks forward (each worker jumps once to its first frame, then
  // steps), and forward seeks are exact. Seeking *backwards* (preview loop / scrubbing) makes
  // GSAP rewind startAt/autoAlpha states and Cinema's one-shot DOM helpers imperfectly, so a
  // backward seek rebuilds the whole composition from the pristine markup instead.
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
    await Promise.all(['700 100px Alexandria', '800 100px Alexandria', '400 30px Readex', '500 30px Readex', '600 30px Readex', '700 30px Readex', '600 30px Outfit', '700 30px Outfit', '800 30px Outfit']
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

  // v5.html and its dialect variants (e.g. v5-iq.html, <body data-ad="v5-iq">) share this timeline;
  // the id names their output files (cues-<id>.json, orin-ad-<id>-9x16-…mp4)
  const AD_ID = document.body.dataset.ad || 'v5';
  window.ORIN = { id: AD_ID, soundtrack: 'soundtrack_v5.py', ready, seek, cues, T, W, H, FPS, BPM, get duration() { return DURATION; } };

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
