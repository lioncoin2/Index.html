/*
 * Orin — shared "cinema" toolkit: the techniques that separate motion graphics from
 * slideshow-with-tweens. Every composition (index/v2/v3/v4 .js) can import this and
 * get the same camera, grading and light language. Everything here is a pure function
 * of time or an explicit GSAP timeline — nothing depends on wall-clock/rAF, so it stays
 * frame-exact under the renderer's `seek(t)`.
 */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  /* ───────────────────────── custom eases ─────────────────────────
   * Registered once `gsap` + `CustomEase` are on the page. Named so any
   * composition can just write ease: 'orinIn' the same way it writes 'expo.out'.
   */
  function installEases() {
    if (!window.gsap || !window.CustomEase || installEases._done) return;
    installEases._done = true;
    gsap.registerPlugin(CustomEase);
    // gentle anticipation (gives a hair) then a confident arrival with a whisper of overshoot
    CustomEase.create('orinIn', 'M0,0 C0.11,-0.14 0.15,0.48 0.34,0.74 0.55,1.04 0.78,1.015 1,1');
    // mirror of orinIn for exits — a small pre-commit push before it leaves
    CustomEase.create('orinOut', 'M0,0 C0.22,0.02 0.32,0.18 0.44,0.42 0.58,0.72 0.78,0.94 1,1');
    // long, weighty glide for camera moves — no bounce, just glass-smooth deceleration
    CustomEase.create('camera', 'M0,0 C0.16,0.72 0.29,0.92 1,1');
    // snappy UI pop (buttons, chips) — quick in, soft settle
    CustomEase.create('uiPop', 'M0,0 C0.34,0 0.35,1.5 0.64,1.12 0.83,0.9 0.93,1 1,1');
  }

  /* ───────────────────────── handheld camera ─────────────────────────
   * Deterministic "perlin-ish" noise: a handful of incommensurate sine waves summed
   * together. Same t always gives the same offset, so it survives seek() scrubbing
   * and out-of-order frame rendering.
   */
  function noise1D(t, seed = 0) {
    const f = [0.37, 0.71, 1.27, 2.03]; // Hz, incommensurate so it never visibly loops
    const p = [seed * 1.7, seed * 3.1, seed * 0.6, seed * 4.4];
    const a = [0.5, 0.28, 0.15, 0.07];
    let v = 0;
    for (let i = 0; i < f.length; i++) v += a[i] * Math.sin(2 * Math.PI * f[i] * t + p[i]);
    return v; // ~[-1, 1]
  }

  /**
   * Continuous subtle handheld drift for a camera rig element. Call every tick from an
   * updater with the current time; returns {x,y,rot} in px/deg, already amplitude-scaled.
   * `amp` in px controls translation strength, roughly a third of that in degrees for rot.
   */
  function handheld(t, { amp = 3, rotAmp = null, seed = 0, speed = 1 } = {}) {
    const tt = t * speed;
    return {
      x: noise1D(tt, seed + 11) * amp,
      y: noise1D(tt, seed + 53) * amp * 0.72,
      rot: noise1D(tt, seed + 97) * (rotAmp ?? amp * 0.06),
    };
  }

  /** Apply {x,y,rot,scale} camera state to an element's transform in one write. */
  function applyCamera(el, cam, extra = '') {
    el.style.transform = `translate(${cam.x.toFixed(2)}px, ${cam.y.toFixed(2)}px) rotate(${(cam.rot || 0).toFixed(3)}deg) scale(${(cam.scale ?? 1).toFixed(4)}) ${extra}`;
  }

  /* ───────────────────────── film grade ─────────────────────────
   * One grading rig per stage: seeded grain, vignette, and a CSS filter on the world
   * layer for contrast/saturation "look". Two presets (warm/cool) are given but any
   * filter string works.
   */
  const GRADES = {
    neutral: 'contrast(1.06) saturate(1.08)',
    warm: 'contrast(1.1) saturate(1.14) sepia(0.06) hue-rotate(-4deg)',
    cool: 'contrast(1.08) saturate(0.92) hue-rotate(6deg)',
    crush: 'contrast(1.22) saturate(1.28) brightness(0.97)', // chaos/red-alert look
  };

  function grain(target, seed = 99, opacity = 0.13) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 256;
    const cx = cv.getContext('2d');
    const img = cx.createImageData(256, 256);
    let s = seed;
    const r = () => {
      s = (s + 0x6D2B79F5) | 0;
      let x = Math.imul(s ^ (s >>> 15), 1 | s);
      x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 128 + ((r() + r() + r()) / 3 - 0.5) * 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    cx.putImageData(img, 0, 0);
    target.style.backgroundImage = `url(${cv.toDataURL('image/png')})`;
    target.style.opacity = opacity;
  }

  /** Set (or tween) the world-layer grade. `key` is one of GRADES or a raw filter string. */
  function setGrade(el, key) {
    el.style.filter = GRADES[key] || key;
  }
  function tweenGrade(tl, el, key, t, dur = 0.6, ease = 'power2.inOut') {
    tl.to(el, { filter: GRADES[key] || key, duration: dur, ease }, t);
  }

  /* ───────────────────────── light sweep ─────────────────────────
   * A diagonal shine that crosses an element once — the same trick used on the CTA
   * button, generalised so it can run over titles, cards, logos, anything with
   * overflow hidden (or a wrapper you point it at).
   */
  // Only patch position/overflow when the element is genuinely static/visible —
  // `el.style.x ||= …` reads the *inline* style, which is empty (falsy) even when
  // an element is already positioned via a CSS class or rule, so that check would
  // blindly stomp a real `position:absolute` with an inline `position:relative`
  // (collapsing anything sized via top+bottom against it, clipped by overflow).
  // Always check the computed style instead.
  function ensurePositioned(el) {
    const cs = getComputedStyle(el);
    if (cs.position === 'static') el.style.position = 'relative';
    if (cs.overflow === 'visible') el.style.overflow = 'hidden';
  }

  function addSweep(el, { width = 140, angle = 18, color = 'rgba(255,255,255,.55)' } = {}) {
    const s = document.createElement('span');
    Object.assign(s.style, {
      position: 'absolute', top: `-40%`, left: '0', width: `${width}px`, height: '180%',
      background: `linear-gradient(90deg, rgba(255,255,255,0), ${color}, rgba(255,255,255,0))`,
      transform: `translateX(-160px) rotate(${angle}deg)`, pointerEvents: 'none', zIndex: 5,
    });
    ensurePositioned(el);
    el.appendChild(s);
    return s;
  }
  function sweep(tl, el, t, opts = {}) {
    const s = addSweep(el, opts);
    const w = el.getBoundingClientRect().width || 400;
    tl.fromTo(s, { x: -200 }, { x: w + 200, duration: opts.dur ?? 0.85, ease: opts.ease ?? 'power2.inOut' }, t);
    return s;
  }

  /* ───────────────────────── lens flare ─────────────────────────
   * A soft core + 2 axial streaks + a couple of small "ghost" rings along the line
   * from the light source through frame-centre — the classic anamorphic-adjacent look,
   * built from plain gradients so it costs nothing to render.
   */
  function buildFlare(parent, color = '255,138,112') {
    const wrap = document.createElement('div');
    wrap.className = 'flare';
    Object.assign(wrap.style, { position: 'absolute', left: '0', top: '0', width: '0', height: '0', pointerEvents: 'none', zIndex: 30 });
    wrap.innerHTML = `
      <i class="core" style="position:absolute;left:0;top:0;width:220px;height:220px;margin:-110px 0 0 -110px;border-radius:50%;background:radial-gradient(circle,rgba(${color},.95) 0%,rgba(${color},.35) 35%,rgba(${color},0) 70%);mix-blend-mode:screen;"></i>
      <i class="streak h" style="position:absolute;left:0;top:0;width:900px;height:5px;margin:-2.5px 0 0 -450px;background:linear-gradient(90deg,rgba(${color},0),rgba(${color},.8),rgba(${color},0));mix-blend-mode:screen;"></i>
      <i class="streak v" style="position:absolute;left:0;top:0;width:5px;height:900px;margin:-450px 0 0 -2.5px;background:linear-gradient(180deg,rgba(${color},0),rgba(${color},.5),rgba(${color},0));mix-blend-mode:screen;"></i>
      <i class="ghost g1" style="position:absolute;left:0;top:0;width:46px;height:46px;border-radius:50%;background:rgba(${color},.35);mix-blend-mode:screen;"></i>
      <i class="ghost g2" style="position:absolute;left:0;top:0;width:22px;height:22px;border-radius:50%;background:rgba(255,255,255,.4);mix-blend-mode:screen;"></i>`;
    parent.appendChild(wrap);
    return wrap;
  }
  /** One flare pulse at (x,y) in stage px, peaking at t. Ghosts sit along the vector to centre. */
  function flarePulse(tl, parent, x, y, t, { cx = 540, cy = 960, peak = 1, dur = 0.9, color } = {}) {
    const wrap = buildFlare(parent, color);
    wrap.style.transform = `translate(${x}px, ${y}px)`;
    const dx = cx - x, dy = cy - y;
    const g1 = $('.g1', wrap), g2 = $('.g2', wrap);
    g1.style.transform = `translate(${dx * 0.45}px, ${dy * 0.45}px)`;
    g2.style.transform = `translate(${dx * 0.75}px, ${dy * 0.75}px)`;
    // immediate (untimed) baseline: hidden from t=0 regardless of where the
    // timeline is first seeked to — only the tl.to below is scheduled/timed.
    gsap.set(wrap, { opacity: 0, scale: 0.5 });
    tl.set(wrap, { opacity: 0, scale: 0.5 }, t - 0.02);
    tl.to(wrap, { opacity: peak, scale: 1, duration: 0.12, ease: 'power2.out' }, t);
    tl.to(wrap, { opacity: 0, scale: 1.25, duration: dur, ease: 'power2.out' }, t + 0.12);
    tl.fromTo($('.core', wrap), { rotation: 0 }, { rotation: 40, duration: dur + 0.12, ease: 'none', immediateRender: false }, t);
    return wrap;
  }

  /* ───────────────────────── chromatic-aberration burst ─────────────────────────
   * Two soft red/cyan blobs at the target's centre spring apart and snap back —
   * reads unmistakably as a lens-CA impact, and (unlike cloning the element) never
   * depends on the target's own opacity/animation state at the moment it fires.
   * Position is read once, at build time: layout geometry is stable even while the
   * target is transitioning in via opacity/transform, so this is safe to call at
   * the same instant something starts revealing itself.
   */
  function chromaBurst(tl, target, t, { amp = 90, dur = 0.24, size } = {}) {
    const stage = document.getElementById('stage'); // always position:relative + overflow:hidden
    const tr = target.getBoundingClientRect(), sr = stage.getBoundingClientRect();
    const k = sr.width / 1080; // stage is always authored at 1080×1920
    const x = (tr.left + tr.width / 2 - sr.left) / k, y = (tr.top + tr.height / 2 - sr.top) / k;
    const s = size ?? Math.max(tr.width, tr.height) / k * 0.9;

    const holder = document.createElement('div');
    holder.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:25;';
    stage.appendChild(holder);

    const mk = (color) => {
      const i = document.createElement('i');
      Object.assign(i.style, {
        position: 'absolute', left: `${x}px`, top: `${y}px`, width: `${s}px`, height: `${s}px`,
        margin: `${-s / 2}px 0 0 ${-s / 2}px`, borderRadius: '50%', opacity: 0,
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`, mixBlendMode: 'screen',
      });
      holder.appendChild(i);
      return i;
    };
    const r = mk('rgba(255,60,70,.85)'), c = mk('rgba(70,190,255,.85)');

    tl.fromTo([r, c], { opacity: 1 }, { opacity: 0, duration: dur * 1.7, ease: 'power2.out', immediateRender: false }, t);
    tl.fromTo(r, { x: 0, y: 0 }, { x: -amp * 0.16, y: amp * 0.05, duration: dur, ease: 'power3.out', immediateRender: false }, t)
      .to(r, { x: 0, y: 0, duration: dur * 1.3, ease: 'power2.out' }, t + dur);
    tl.fromTo(c, { x: 0, y: 0 }, { x: amp * 0.16, y: -amp * 0.05, duration: dur, ease: 'power3.out', immediateRender: false }, t)
      .to(c, { x: 0, y: 0, duration: dur * 1.3, ease: 'power2.out' }, t + dur);
    tl.call(() => holder.remove(), null, t + dur * 2.4);
    return holder;
  }

  /* ───────────────────────── depth of field ───────────────────────── */
  function dof(tl, el, t, { blur = 10, dur = 0.5, ease = 'power2.inOut' } = {}) {
    tl.to(el, { filter: `blur(${blur}px)`, duration: dur, ease }, t);
  }
  function focus(tl, el, t, { dur = 0.5, ease = 'power2.inOut' } = {}) {
    tl.to(el, { filter: 'blur(0px)', duration: dur, ease }, t);
  }

  window.Cinema = {
    installEases, handheld, applyCamera, noise1D,
    GRADES, grain, setGrade, tweenGrade,
    addSweep, sweep, buildFlare, flarePulse, chromaBurst, dof, focus,
  };
})();
