/**
 * Morph: one kit of eight rounded parts. Assembled it is an airplane; pulled
 * apart, the parts float in a ring; pushed together again they are a
 * helicopter. The wing becomes the main rotor, the tailplane the second blade,
 * the rear fuselage the tail boom, the two engine pods the skids. The pointer's
 * x scrubs the build from plane (left) through parts (middle) to helicopter
 * (right) on one spring. The wing/rotor carries the bright stroke throughout.
 * The slider is the explode gap, in world units.
 *
 * The pattern: scrub. One spring on a continuous input, parts interpolated
 * between two target poses through an exploded one, depth re-sorted by moving
 * groups, and a hit test on the screen x of the pointer, which never moves.
 */
const {
  Cam, clamp, facing, fit, lerp, prism, proj, rings, spring, stepS,
  disposer, mk, pointer, put, register, solid,
} = HL;

// [x0, y0, x1, y1, z0, z1, r] for the plane and for the helicopter, plus the exploded direction
const PARTS = [
  { k: "nose",   pl: [-20, -9, 62, 9, 2, 17, 8],     he: [-22, -15, 24, 15, 4, 31, 13],  dir: [1, 0.2, 0.3] },
  { k: "rear",   pl: [-62, -7, -20, 7, 5, 16, 6],     he: [-80, -3, -22, 3, 18, 23, 2.5], dir: [-1, -0.2, 0.2] },
  { k: "wing",   pl: [-14, -66, 12, 66, 8, 11, 5],    he: [-5, -74, 5, 74, 40, 42, 3],    dir: [0.1, 0.9, 0.9] },
  { k: "tailpl", pl: [-64, -24, -52, 24, 14, 16.5, 3], he: [-74, -5, 74, 5, 42.5, 44.5, 3], dir: [-0.8, 0.6, 0.7] },
  { k: "fin",    pl: [-64, -1.6, -50, 1.6, 16, 38, 3], he: [-88, -1.6, -78, 1.6, 14, 34, 3], dir: [-0.9, -0.5, 0.9] },
  { k: "canopy", pl: [32, -6, 50, 6, 17, 22, 5],      he: [-3, -3, 3, 3, 31, 40, 2.4],    dir: [0.9, -0.6, 0.8] },
  { k: "podL",   pl: [-8, -36, 14, -24, 1, 8, 3.5],   he: [-30, -21, 32, -17, -5, -2, 1.8], dir: [0.3, -1, -0.1] },
  { k: "podR",   pl: [-8, 24, 14, 36, 1, 8, 3.5],     he: [-30, 17, 32, 21, -5, -2, 1.8],   dir: [0.3, 1, -0.1] },
];
const HI = "wing", REST = 0.16, BASE = [-100, -82, 100, 82];

/** Where each part is at build m (0 plane, 1 apart, 2 helicopter), with the explode gap g. */
function poseAt(p, m, g) {
  const shape = m < 0.85 ? p.pl : m > 1.15 ? p.he : p.pl.map((v, i) => lerp(v, p.he[i], smooth((m - 0.85) / 0.3)));
  const out = m <= 1 ? smooth(m) : smooth(2 - m);
  const [dx, dy, dz] = p.dir;
  const ox = dx * g * out, oy = dy * g * out, oz = 18 * out + dz * g * 0.6 * out;
  return [shape[0] + ox, shape[1] + oy, shape[2] + ox, shape[3] + oy, shape[4] + oz, shape[5] + oz, shape[6]];
}
const smooth = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  const C = Cam(45, 0.5, 1.42);
  const ext = [];
  for (const m of [0, 1, 2]) for (const p of PARTS) { const q = poseAt(p, m, 48); ext.push([q[0], q[1], q[4]], [q[2], q[3], q[5]], [q[0], q[3], q[4]], [q[2], q[1], q[5]]); }
  ext.push([BASE[0], BASE[1], -12], [BASE[2], BASE[3], -12], [BASE[0], BASE[3], -12], [BASE[2], BASE[1], -12]);
  fit(C, ext, 200, 166);
  const P = proj(C), front = facing(C);
  let gap = value, over = null;

  const g = mk("g", {}, svg);
  const [br, bi] = rings(BASE[0], BASE[1], BASE[2], BASE[3], 14, 2.2);
  put(solid(g), prism(P, front, br, bi, -12, -8));
  const parts = PARTS.map((p) => ({ p, el: solid(g), drawn: "", depth: 0 }));
  const sp = spring(REST, { eps: 0.002 });
  let order = "";

  function draw() {
    const m = sp.x;
    for (const q of parts) {
      const b = poseAt(q.p, m, gap);
      const key = b.map((v) => v.toFixed(2)).join(",");
      q.depth = (b[0] + b[2]) / 2 + (b[1] + b[3]) / 2 + b[4] * 0.6;
      if (key === q.drawn) continue;
      q.drawn = key;
      const bev = clamp(Math.min(b[2] - b[0], b[3] - b[1]) * 0.18, 0.4, 1.6);
      const [ring, inner] = rings(b[0], b[1], b[2], b[3], b[6], bev);
      put(q.el, prism(P, front, ring, inner, b[4], b[5]));
      q.el.sil.classList.toggle("hi", q.p.k === HI);
    }
    // paint back to front: re-append only when the order changes
    const sorted = [...parts].sort((a, b) => a.depth - b.depth), key = sorted.map((q) => q.p.k).join();
    if (key !== order) { order = key; sorted.forEach((q) => g.appendChild(q.el.g)); }
  }
  draw();

  const B = register(stage, (dt) => { const moving = stepS(sp, dt); draw(); return moving; });
  bag.add(B.unregister);

  function retarget() {
    if (!over) { sp.t = REST; read.textContent = "rest"; }
    else {
      sp.t = clamp((over[0] - 70) / 260, 0, 1) * 2;
      read.textContent = sp.t < 0.6 ? "plane" : sp.t > 1.4 ? "heli" : "parts 08";
    }
    B.wake();
  }
  bag.add(pointer(stage, {
    move: (pt) => { over = pt; retarget(); },
    leave: () => { over = null; retarget(); },
  }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { gap = v; parts.forEach((q) => (q.drawn = "")); B.wake(); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "morph",
  means: "Eight parts make an airplane; pull them apart and they rebuild as a helicopter.",
  rules: [1, 3, 5, 9],
  range: [28, 40, 48],
  tour: [[90, 160], [200, 160], [320, 160], null],
  mount,
});
