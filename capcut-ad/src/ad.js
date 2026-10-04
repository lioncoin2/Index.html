/*
 * حساب كاب كات برو — vertical ad (1080×1920, 24s, Iraqi dialect, VO-ready). Problem → the fix is here.
 *
 *   0.0–3.2    hook: an editor on a phone — "خلصت المونتاج…"; export; a watermark slams onto the
 *              video — "وطلعتلك العلامة المائية؟ 😤"
 *   3.2–7.1    the good tools lock one by one — "وكل الأدوات الحلوة… مقفولة 🔒"; a tap → "تحتاج برو"
 *   7.1–10.4   paying needs a card — "والاشتراك يريد فيزا 💳 ومنين تجيبها؟"; payment → "مرفوض ❌"
 *   10.4–15.4  "لا تحتار… الحل عدنا 👇"; the phone returns, locks burst off, the watermark wipes away,
 *              "برو 👑" — "حساب كاب كات برو… كل شي مفتوح، وبلا علامة مائية"
 *   15.4–20.0  "شهر كامل… بـ 6 آلاف بس!": 6 آلاف · مضمون شهر كامل · تسليم فوري · لجهاز واحد بس
 *   20.0–24.0  "اطلبه هسة 👇" — واتساب / انستغرام
 *
 * The name is written in Arabic and no official logo is drawn. Engine conventions as orin-ad:
 * deterministic seek(t), one owner per transform, no layer promotion, rebuild on backward seeks.
 */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const RENDER = new URLSearchParams(location.search).has('render');
  if (RENDER) document.body.classList.add('render');

  const W = 1080, H = 1920, DURATION = 24.0, FPS = 60, BPM = 120;
  const T = { hook: 0, export: 0.7, wm: 1.6, locks: 3.2, toast: 5.4, pay: 7.1, declined: 8.7, idea: 10.5, back: 11.45, unlock: 12.0, offer: 15.5, end: 20.0 };
  const VO = [
    [0.10, 2.90, 'خلصت المونتاج… وطلعتلك العلامة المائية؟'],
    [3.30, 5.30, 'وكل الأدوات الحلوة مقفولة!'],
    [7.40, 10.20, 'والاشتراك يريد فيزا… ومنين تجيبها؟'],
    [10.60, 11.50, 'لا تحتار… الحل عدنا.'],
    [12.10, 15.20, 'حساب كاب كات برو… كل شي مفتوح، وبلا علامة مائية.'],
    [15.70, 19.60, 'شهر كامل مضمون، وتسليم فوري… بس بستة آلاف!'],
    [20.10, 22.90, 'اطلبه هسة من الواتساب أو الانستغرام.'],
  ];
  T.vo = VO.map(([a, b, line]) => ({ t0: a, t1: b, line }));

  const cues = [];
  const cue = (t, type, extra = {}) => cues.push({ t: Math.round(t * 1000) / 1000, type, ...extra });
  const updaters = [];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const rnd = (i, s = 1) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };

  function splitText(el) {
    const walk = (node) => {
      for (const child of Array.from(node.childNodes)) {
        if (child.nodeType === Node.TEXT_NODE) {
          const frag = document.createDocumentFragment();
          for (const part of child.textContent.split(/(\s+)/)) {
            if (!part) continue;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); continue; }
            const inner = document.createElement('span'); inner.className = 'wi'; inner.textContent = part;
            const mask = document.createElement('span'); mask.className = 'w'; mask.appendChild(inner);
            frag.appendChild(mask);
          }
          child.replaceWith(frag);
        } else if (child.nodeType === Node.ELEMENT_NODE && child.classList.contains('ltr')) {
          const inner = document.createElement('span'); inner.className = 'wi';
          const mask = document.createElement('span'); mask.className = 'w';
          child.replaceWith(mask); mask.appendChild(inner); inner.appendChild(child);
        } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName !== 'BR') walk(child);
      }
    };
    walk(el);
  }

  function prepDOM() {
    Cinema.installEases();
    $('#wm').innerHTML = Array.from({ length: 18 }, () => '<span>كاب كات</span>').join('');
    $$('[data-split]').forEach(splitText);
    const dust = $('#dust');
    for (let i = 0; i < 26; i++) {
      const d = document.createElement('i');
      const s = 2 + rnd(i, 2) * 5;
      Object.assign(d.style, { position: 'absolute', left: '0', top: '0', width: s + 'px', height: s + 'px', borderRadius: '50%', background: rnd(i, 3) < 0.4 ? '#2EE6D6' : '#fff' });
      d._p = { x: rnd(i, 4) * W, y: rnd(i, 5) * (H + 200), v: 14 + rnd(i, 6) * 40, a: 0.08 + rnd(i, 7) * 0.2, ph: rnd(i, 8) * 6.28 };
      dust.appendChild(d);
    }
    updaters.push((t) => {
      for (const d of dust.children) {
        const p = d._p, y = ((p.y - p.v * t) % (H + 200) + (H + 200)) % (H + 200) - 100;
        d.style.transform = `translate(${(p.x + Math.sin(t * 0.4 + p.ph) * 20).toFixed(1)}px, ${y.toFixed(1)}px)`;
        d.style.opacity = (p.a * (0.6 + 0.4 * Math.sin(t * 1.3 + p.ph))).toFixed(3);
      }
    });
    Cinema.grain($('#grain'), 33, 0.1);
  }

  let tl;
  const wordsOf = (sel) => $$('.wi', typeof sel === 'string' ? $(sel) : sel);
  function textIn(words, t, { stagger = 0.06, dur = 0.55 } = {}) {
    tl.fromTo(words, { yPercent: 118, rotation: 3, autoAlpha: 1 }, { yPercent: 0, rotation: 0, duration: dur, ease: 'orinIn', stagger, immediateRender: false }, t);
    cue(t, 'cap');
  }
  function textOut(sel, t) {
    const w = wordsOf(sel);
    tl.to(w, { yPercent: -125, rotation: -3, duration: 0.24, ease: 'power3.in', stagger: 0.02 }, t);
    tl.set(w, { autoAlpha: 0, stagger: 0.02 }, t + 0.24);
  }
  const shakes = [];
  const shake = (t, a = 16) => shakes.push([t, a]);
  function shakeAt(t) {
    let x = 0, y = 0;
    for (const [t0, a] of shakes) {
      const d = t - t0; if (d < 0 || d > 0.36) continue;
      const env = Math.min(1, d / 0.02) * Math.exp(-d / 0.11);
      x += a * env * Math.cos(2 * Math.PI * 11 * d); y -= 0.55 * a * env * Math.cos(2 * Math.PI * 11 * d + 0.6);
    }
    return { x, y };
  }
  function flash(t, peak = 0.2, el = '#flash') {
    tl.fromTo(el, { opacity: 0 }, { opacity: peak, duration: 0.05, ease: 'none', immediateRender: false }, t)
      .to(el, { opacity: 0, duration: 0.45, ease: 'power2.out' }, t + 0.05);
  }
  function tap(x, y, t) { // pointer slides in, taps, leaves
    const p = $('#pointer');
    tl.fromTo(p, { x: x + 160, y: y + 220, opacity: 0, scale: 1 }, { x, y, opacity: 1, duration: 0.3, ease: 'power3.out', immediateRender: false }, t - 0.32);
    tl.to(p, { scale: 0.82, duration: 0.07, yoyo: true, repeat: 1 }, t);
    tl.to(p, { opacity: 0, x: x + 120, y: y + 160, duration: 0.25, ease: 'power2.in' }, t + 0.35);
    cue(t, 'tap');
  }

  function build() {
    gsap.config({ force3D: false });
    tl = gsap.timeline({ paused: true });
    gsap.set($$('.wi'), { yPercent: 118, autoAlpha: 0 });
    gsap.set('#payScene, #offer, #end', { autoAlpha: 0 });
    gsap.set('#gCyan', { x: 540, y: 1100, opacity: 0.55 });
    gsap.set('#gRed', { x: 540, y: 1100 });
    gsap.set('#gGold', { x: 540, y: 1050 });
    gsap.set('#pointer', { opacity: 0 });

    // ── hook: export → watermark ──
    const c1 = wordsOf('#c1');
    gsap.set(c1.slice(0, 2), { yPercent: 0, autoAlpha: 1 }); // first line is up at frame 0 (thumbnail)
    tl.fromTo('#phone', { scale: 1.05 }, { scale: 1, duration: 0.8, ease: 'power2.out', immediateRender: false }, 0);
    tap(700, 690, T.export - 0.15);
    tl.to('#exportProg', { opacity: 1, duration: 0.12 }, T.export);
    tl.fromTo('#exportProg .fill', { scaleX: 0 }, { scaleX: 1, duration: 0.75, ease: 'power1.in', immediateRender: false }, T.export + 0.05);
    cue(T.export, 'export', { until: T.wm });
    tl.to('#exportProg', { opacity: 0, duration: 0.1 }, T.wm - 0.08);
    tl.fromTo('#wm', { opacity: 1, scale: 1.6 }, { scale: 1, duration: 0.2, ease: 'power4.in', immediateRender: false }, T.wm - 0.2);
    tl.fromTo('#wmBig', { opacity: 1, scale: 2.4 }, { scale: 1, duration: 0.2, ease: 'power4.in', immediateRender: false }, T.wm - 0.15);
    cue(T.wm, 'stamp');
    shake(T.wm, 22); flash(T.wm, 0.18); flash(T.wm, 0.9, '#redFlash');
    textIn(c1.slice(2), T.wm + 0.05, { stagger: 0.07 });

    // ── locked tools ──
    textOut('#c1', T.locks - 0.15);
    textIn(wordsOf('#c2'), T.locks);
    tl.to('#gRed', { opacity: 1, duration: 0.6 }, T.locks + 0.1);
    tl.to('#gCyan', { opacity: 0.15, duration: 0.6 }, T.locks + 0.1);
    $$('#tools .tool').forEach((tool, k) => {
      const t = T.locks + 0.3 + k * 0.35;
      tl.fromTo($('.lock', tool), { opacity: 1, scale: 2.2, rotation: -30 }, { scale: 1, rotation: 0, duration: 0.25, ease: 'back.out(2.5)', immediateRender: false }, t);
      tl.to($('.dim', tool), { opacity: 1, duration: 0.2 }, t);
      tl.fromTo(tool, { x: 0 }, { x: 10, duration: 0.05, yoyo: true, repeat: 3, ease: 'sine.inOut', immediateRender: false }, t + 0.05);
      cue(t, 'lock', { k });
    });
    tap(660, 1290, T.toast - 0.2);
    tl.fromTo('#toast', { opacity: 1, scale: 0.4 }, { scale: 1, duration: 0.35, ease: 'back.out(2.5)', immediateRender: false }, T.toast);
    cue(T.toast, 'denied');
    shake(T.toast, 8);
    tl.to('#toast', { opacity: 0, duration: 0.2 }, T.pay - 0.6);

    // ── payment declined ──
    textOut('#c2', T.pay - 0.15);
    tl.to('#phone', { y: 1500, duration: 0.45, ease: 'power3.in' }, T.pay - 0.1);
    cue(T.pay - 0.1, 'whoosh');
    tl.set('#payScene', { autoAlpha: 1 }, T.pay + 0.1);
    gsap.set('#card', { x: 900, rotation: 12 });
    tl.to('#card', { x: 0, rotation: -4, duration: 0.55, ease: 'back.out(1.4)' }, T.pay + 0.15);
    cue(T.pay + 0.15, 'card');
    textIn(wordsOf('#c3'), T.pay + 0.3);
    gsap.set('#pay', { scale: 0 });
    gsap.set('#declined', { opacity: 0 });
    tl.to('#pay', { scale: 1, duration: 0.35, ease: 'back.out(2)' }, T.pay + 0.6);
    cue(T.pay + 0.6, 'spin', { until: T.declined });
    const spin = $('#spin');
    updaters.push((t) => { spin.style.transform = `rotate(${(t * 520).toFixed(1)}deg)`; });
    tl.fromTo('#declined', { opacity: 1, scale: 2.6, rotation: 14 }, { scale: 1, rotation: 0, duration: 0.2, ease: 'power4.in', immediateRender: false }, T.declined - 0.2);
    tl.to('#card', { rotation: 2, duration: 0.06, yoyo: true, repeat: 5 }, T.declined);
    cue(T.declined, 'declined');
    shake(T.declined, 20); flash(T.declined, 0.8, '#redFlash');
    textOut('#c3', T.idea - 0.25);
    tl.to('#payScene', { autoAlpha: 0, duration: 0.25 }, T.idea - 0.25);

    // ── the fix is here ──
    textIn(wordsOf('#c4'), T.idea, { stagger: 0.08 });
    flash(T.idea, 0.25);
    cue(T.idea, 'idea');
    tl.to('#gRed', { opacity: 0, duration: 0.5 }, T.idea);
    textOut('#c4', T.back - 0.1);
    tl.to('#phone', { y: 0, duration: 0.5, ease: 'back.out(1.3)' }, T.back);
    cue(T.back, 'whoosh');

    // ── unlock ──
    const U = T.unlock;
    cue(U, 'unlock');
    shake(U, 18); flash(U, 0.35);
    Cinema.chromaBurst(tl, $('#preview'), U, { amp: 30, size: 700 });
    tl.to('#gGold', { opacity: 1, duration: 0.6 }, U);
    tl.to('#gCyan', { opacity: 0, duration: 0.5 }, U);
    tl.to('#wm', { opacity: 0, scale: 1.4, duration: 0.35, ease: 'power2.in' }, U + 0.05);
    tl.to('#wmBig', { opacity: 0, scale: 0.4, duration: 0.25, ease: 'power2.in' }, U + 0.05);
    $$('#tools .tool').forEach((tool, k) => {
      const t = U + 0.15 + k * 0.12;
      tl.to($('.lock', tool), { x: (k % 2 ? -1 : 1) * -180, y: -260 - k * 30, rotation: k % 2 ? -200 : 200, opacity: 0, duration: 0.55, ease: 'power2.out' }, t);
      tl.to($('.dim', tool), { opacity: 0, duration: 0.25 }, t);
      tl.fromTo($('.ok', tool), { opacity: 1, scale: 0 }, { scale: 1, duration: 0.35, ease: 'back.out(3)', immediateRender: false }, t + 0.25);
      cue(t + 0.25, 'ok', { k });
    });
    tl.fromTo('#crown', { opacity: 1, scale: 0, rotation: -20 }, { scale: 1, rotation: 0, duration: 0.5, ease: 'back.out(2.5)', immediateRender: false }, U + 0.7);
    cue(U + 0.7, 'crown');
    textIn(wordsOf('#c5'), U + 0.15, { stagger: 0.055 });
    [U + 1.0, U + 2.3].forEach((t) => Cinema.sweep(tl, $('#crown'), t, { dur: 0.7, color: 'rgba(255,255,255,.8)' }));
    // gold sparks burst off the phone
    const burst = document.createElement('div'); burst.className = 'layer'; $('#push').appendChild(burst);
    for (let i = 0; i < 16; i++) {
      const s = document.createElement('i');
      Object.assign(s.style, { position: 'absolute', left: '540px', top: '1000px', width: '36px', height: '36px', margin: '-18px 0 0 -18px', borderRadius: '50%', opacity: 0, background: 'radial-gradient(circle, #FFF6CC 0%, #FFC83D 40%, rgba(255,160,40,0) 72%)' });
      burst.appendChild(s);
      const a = (i / 16) * Math.PI * 2 + rnd(i, 9) * 0.3, d = 420 + rnd(i, 4) * 260;
      tl.fromTo(s, { x: 0, y: 0, scale: 1.4, opacity: 1 }, { x: Math.cos(a) * d, y: Math.sin(a) * d, scale: 0.3, opacity: 0, duration: 0.9, ease: 'power3.out', immediateRender: false }, U + 0.05);
    }

    // ── offer ──
    const O = T.offer;
    textOut('#c5', O - 0.2);
    tl.to('#phone', { scale: 0.7, opacity: 0, duration: 0.4, ease: 'power2.in' }, O - 0.2);
    tl.set('#offer', { autoAlpha: 1 }, O);
    textIn(wordsOf('#c6'), O + 0.05, { stagger: 0.07 });
    $$('#offer .perk').forEach((p, k) => {
      gsap.set(p, { top: 600 + k * 190, x: 700, opacity: 0 });
      const t = O + 0.55 + k * 0.4;
      tl.to(p, { x: 0, opacity: 1, duration: 0.45, ease: 'back.out(1.6)' }, t);
      cue(t, 'perk', { k });
    });
    tl.to('#gGold', { opacity: 0.6, duration: 0.5 }, O);
    tl.fromTo('#p1', { scale: 1 }, { scale: 1.06, duration: 0.18, yoyo: true, repeat: 3, ease: 'power1.inOut', immediateRender: false }, O + 2.4);
    cue(O + 2.4, 'price');

    // ── CTA ──
    const E = T.end;
    textOut('#c6', E - 0.2);
    $$('#offer .perk').forEach((p, k) => tl.to(p, { x: -700, opacity: 0, duration: 0.3, ease: 'power2.in' }, E - 0.2 + k * 0.04));
    tl.set('#end', { autoAlpha: 1 }, E);
    tl.to('#gCyan', { opacity: 0.4, duration: 0.6 }, E);
    textIn(wordsOf('#c7'), E + 0.05, { stagger: 0.08 });
    gsap.set('#priceTag, #wa, #ig', { scale: 0 });
    tl.to('#priceTag', { scale: 1, duration: 0.45, ease: 'back.out(2.5)' }, E + 0.3);
    cue(E + 0.3, 'price');
    [['#wa', E + 0.6], ['#ig', E + 0.85]].forEach(([s, t], k) => {
      tl.to(s, { scale: 1, duration: 0.5, ease: 'uiPop' }, t);
      cue(t, 'btn', { k });
    });
    [[E + 1.6, '#wa'], [E + 2.0, '#ig'], [E + 2.7, '#wa'], [E + 3.1, '#ig']].forEach(([t, s]) => {
      Cinema.sweep(tl, $(s), t, { dur: 0.6, color: 'rgba(255,255,255,.6)' });
    });
    [[E + 1.9, '#wa'], [E + 2.4, '#ig'], [E + 3.0, '#wa'], [E + 3.5, '#ig']].forEach(([t, s]) => {
      tl.to(s, { scale: 1.05, duration: 0.15, yoyo: true, repeat: 1, ease: 'power2.out' }, t);
      cue(t, 'pulse');
    });

    // updaters: playhead, world shake, handheld rig
    const ph = $('#playhead');
    updaters.push((t) => { ph.style.left = `${((t % 4) / 4 * 536).toFixed(1)}px`; });
    const world = $('#world'), rig = $('#rig');
    updaters.push((t) => {
      const s = shakeAt(t);
      world.style.transform = s.x || s.y ? `translate(${s.x.toFixed(2)}px, ${s.y.toFixed(2)}px)` : '';
      const h = Cinema.handheld(t, { amp: 3, rotAmp: 0.2, seed: 9 });
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
    await Promise.all(['800 86px Alexandria', '900 64px Alexandria', '700 32px Alexandria', '900 60px Outfit', '600 54px Outfit'].map((f) => document.fonts.load(f, 'گ 0123456789 …عربي')));
    await document.fonts.ready;
    RAW = $('#stage').innerHTML;
    prepDOM();
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    build(); cues.sort((a, b) => a.t - b.t); seek(0);
    return true;
  })();
  window.ORIN = { id: '', prefix: 'capcut-ad', soundtrack: 'soundtrack_capcut.py', ready, seek, cues, T, W, H, FPS, BPM, get duration() { return DURATION; } };

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
