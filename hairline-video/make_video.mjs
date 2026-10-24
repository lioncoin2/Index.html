// Turns the Hairline bench page into a renderable 9:16 film page. The figure, kernel and bench are untouched:
// a virtual clock replaces requestAnimationFrame/performance.now, a scripted pointer walks the stage, and
// window.ORIN exposes seek(t) for orin-ad/render/render.mjs.
import { readFileSync, writeFileSync } from "node:fs";
const page = readFileSync(new URL("./hairline-morph.html", import.meta.url), "utf8");
const shim = `<script>(() => {
  let now = 0; const q = [];
  performance.now = () => now; Date.now = () => 1.7e12 + now;
  window.requestAnimationFrame = (cb) => { q.push(cb); return q.length; };
  window.cancelAnimationFrame = () => {};
  window.__advance = (ms) => { now += ms; q.splice(0).forEach((cb) => cb(now)); };
  window.__now = () => now;
})();</script>`;
const css = `<style>
  @font-face { font-family: 'Alexandria'; src: url(../orin-ad/assets/fonts/alexandria-arabic-wght-normal.woff2) format('woff2'); font-weight: 100 900; }
  html, body { width: 1080px; height: 1920px; overflow: hidden; }
  body { padding: 0 !important; place-items: start !important; }
  main { position: absolute; left: 20px; top: 560px; width: 1040px; max-width: 1040px !important; }
  #stage { --hairline-stroke: 2.8; }
  #stage, #stage svg { width: 1040px !important; height: 832px !important; max-width: none !important; }
  .plate { border: none !important; background: transparent !important; box-shadow: none !important; padding: 0 !important; }
  .controls, #means, #rules, .tag, #error { display: none !important; }
  #cap { position: fixed; left: 0; right: 0; top: 190px; text-align: center; direction: rtl; font-family: 'Alexandria'; font-weight: 800; font-size: 66px; line-height: 1.3; color: #F2F2F4; white-space: nowrap; }
  #cap2 { position: fixed; left: 0; right: 0; top: 330px; text-align: center; direction: rtl; font-family: 'Alexandria'; font-weight: 600; font-size: 44px; color: #8E8E96; white-space: nowrap; }
  #cap span, #cap2 span { display: inline-block; }
</style>`;
const orin = `<div id="cap"></div><div id="cap2"></div>
<script type="module">
  const DURATION = 20, FPS = 60, STEP = 1000 / 240;
  const ease = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
  // the unseen hand: null = away; x in viewBox units (70 plane · 200 parts · 330 helicopter)
  const hand = (t) => t < 2 ? null : t < 4.5 ? 70 : t < 8.5 ? 70 + 130 * ease((t - 4.5) / 4) : t < 11 ? 200 : t < 15 ? 200 + 130 * ease((t - 11) / 4) : 330;
  const CAPS = [[0.3, 4.4, 'طيارة ✈️', ''], [4.9, 10.8, 'تتفكك… لـ 8 قطع', 'جناح، ذيل، زعنفة، محرّكين…'], [11.4, 20, 'نفس القطع… صارت هليكوبتر 🚁', 'الجناح صار مروحة · والمحرّكين صاروا زلّاجات']];
  const cues = [];
  [[4.6, 'whoosh'], [11.1, 'whoosh'], [8.4, 'settle'], [15.0, 'lock'], [2.0, 'pop']].forEach(([t, type]) => cues.push({ t, type }));
  CAPS.forEach(([a]) => cues.push({ t: a, type: 'cap' }));
  cues.sort((a, b) => a.t - b.t);
  document.documentElement.dataset.theme = 'dark';
  const stage = document.getElementById('stage');
  let last = undefined;
  function point(x) {
    if (x === last) return; last = x;
    const r = stage.getBoundingClientRect();
    if (x === null) { stage.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse', pointerId: 1, bubbles: true })); return; }
    stage.dispatchEvent(new PointerEvent('pointermove', { pointerType: 'mouse', pointerId: 1, bubbles: true, clientX: r.left + (x / 400) * r.width, clientY: r.top + (160 / 320) * r.height }));
  }
  const cap = document.getElementById('cap'), cap2 = document.getElementById('cap2');
  function caption(t) {
    const c = CAPS.find(([a, b]) => t >= a && t < b);
    const txt = c ? c[2] : '', sub = c ? c[3] : '';
    if (cap.textContent !== txt) cap.textContent = txt;
    if (cap2.textContent !== sub) cap2.textContent = sub;
    const k = c ? Math.min(ease((t - c[0]) / 0.35), 1 - ease((t - c[1] + 0.3) / 0.3)) : 0;
    cap.style.opacity = cap2.style.opacity = k.toFixed(3);
    cap.style.transform = 'translateY(' + ((1 - k) * 30).toFixed(1) + 'px)';
  }
  let cur = 0;
  function seek(t) {
    const target = t * 1000;
    if (target < cur - 1e-6) throw new Error('seek backwards: open a fresh page');
    while (window.__now() + STEP <= target + 1e-6) { point(hand(window.__now() / 1000)); window.__advance(STEP); }
    cur = target; caption(t);
  }
  const ready = document.fonts.load('800 96px Alexandria', 'طيارة').then(() => document.fonts.ready).then(() => { seek(0); return true; });
  window.ORIN = { id: '', prefix: 'hairline-morph', soundtrack: 'soundtrack_morph.py', ready, seek, cues, T: {}, W: 1080, H: 1920, FPS, BPM: 90, get duration() { return DURATION; } };
</script>`;
let out = page.replace("<head>", "<head>" + shim).replace("</head>", css + "</head>").replace("</body>", orin + "</body>");
writeFileSync(new URL("./video.html", import.meta.url), out);
console.log("video.html written");
