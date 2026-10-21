// Builds the isometric half-section engine with the Anatomy kit and writes src/art.js:
// static SVG layers + per-crank-angle SVG for the parts whose shape changes (crank web, rod, gas).
import { writeFileSync } from "node:fs";
import * as k from "../.claude/skills/anatomy/kit/iso-kit.mjs";
import * as G from "../.claude/skills/anatomy/kit/lathe.mjs";

const W = 1000, H = 1180;
const CZ = 70, R = 36, L = 128, BORE = 40, PIN_UP = 22, PIST_H = 54;
const DECK = 262, HEAD_TOP = 306, VX = 21, VALVE_R = 14, LIFT = 11;
const pinZ = (deg) => { const a = deg * Math.PI / 180; return CZ + R * Math.cos(a) + Math.sqrt(L * L - R * R * Math.sin(a) ** 2); };
const crown = (deg) => pinZ(deg) - PIN_UP + PIST_H;           // TDC crown = 256, clearance 6

const BASE = { x: -150, y: -110, w: 300, d: 220, r: 10 };
const P = k.fitProjection([...k.boxCorners(BASE, -22, 0), [0, -70, 390], [-100, 0, 300], [100, 0, 300]], W, H, { pad: 40, azimuth: 42 });
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const Ln = (d, style) => k.lineSvg(d, style);
const Dt = (pts, style) => k.dotsSvg(pts, style);
const face = (pts) => k.pathOf(pts.map(([x, z]) => at([x, 0, z])), true);  // polygon on the cut plane y = 0
const Fy = (o) => G.frameOf(o, [0, 1, 0], [1, 0, 0], [0, 0, 1]);            // axis along y, u = x, v = z
const circ = (cx, cz, r, n = 28) => Array.from({ length: n }, (_, i) => [cx + r * Math.cos(i / n * 2 * Math.PI), cz + r * Math.sin(i / n * 2 * Math.PI)]);

function base() {
  const o = [`<path class="iso-halo" d="${k.haloOf(BASE, -22, 22, P)}"/>`];
  for (const [x, y] of k.corners(BASE, 26).sort((a, b) => k.depthOf([...a, 0], P) - k.depthOf([...b, 0], P))) {
    o.push(S(k.cylinder(x, y, 9, -22, 2, P, 28), { tone: "lo" }), S(k.cylinder(x, y, 7, -20, 6, P, 28), { tone: "mid" }));
  }
  o.push(S(k.slabOf(BASE, -14, 14, P, 8, 1.4), { tone: "mid" }));
  o.push(Ln(k.planOutline(k.insetPlan(BASE, 6), 0, P), { tone: "lo" }));
  const sc = k.corners(BASE, 12);
  o.push(Ln(sc.map(([x, y]) => k.ring(x, y, 2.6, 0, P, 16)).join(""), { tone: "lo" }), Dt(sc.map(([x, y]) => at([x, y, 0])), { size: 0.6 }));
  const strip = { x: -130, y: BASE.y + BASE.d - 18, w: 260, d: 8, r: 1 };
  o.push(S(k.slabOf(strip, 0, 0.8, P, 3), { tone: "lo", crease: "none" }));
  const t = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 5, 5, strip.y + 0.8, 0.8, [2.2, 4], P);
  o.push(Ln(t.minor, { tone: "lo" }), Ln(t.major, { tone: "mid" }));
  return o.join("");
}

// the half-section block: crankcase, cylinder, head (everything at y < 0), with the cut face showing the cavities
function block() {
  const o = [];
  const CASE = { x: -96, y: -78, w: 192, d: 78, r: 6 };
  o.push(S(k.slabOf(CASE, 0, 150, P, 4, 0.8), { tone: "mid" }));
  const BLK = { x: -66, y: -74, w: 132, d: 74, r: 4 };
  o.push(S(k.slabOf(BLK, 150, DECK - 150 - 2, P, 4, 0.8), { tone: "mid" }));
  // water-jacket fins on the block's side
  for (let z = 166; z < DECK - 8; z += 14) o.push(S(k.slabOf({ x: 66, y: -70, w: 4, d: 66, r: 1 }, z, 4, P, 2), { tone: "mid", crease: "none" }));
  o.push(S(k.slabOf({ x: -70, y: -78, w: 140, d: 78, r: 2 }, DECK - 2, 4, P, 2), { tone: "lo" }));       // head gasket
  const HEAD = { x: -84, y: -80, w: 168, d: 80, r: 6 };
  o.push(S(k.slabOf(HEAD, DECK + 2, HEAD_TOP - DECK - 2, P, 4, 0.8), { tone: "mid" }));
  const COVER = { x: -70, y: -70, w: 140, d: 70, r: 10 };
  o.push(S(k.slabOf(COVER, HEAD_TOP, 16, P, 8, 1), { tone: "mid" }));
  // cavities on the cut face (dark), then their rims
  const cav = [
    [...circ(0, CZ, 62, 40).filter(([, z]) => z <= CZ + 10), [-46, CZ + 40], [-BORE - 1, 150], [BORE + 1, 150], [46, CZ + 40]],
    [[-BORE - 1, 150], [BORE + 1, 150], [BORE + 1, DECK + 2], [-BORE - 1, DECK + 2]],
    [[-VX - VALVE_R + 2, DECK + 2], [-VX + VALVE_R - 2, DECK + 2], [-50, 296], [-84, 296], [-84, 276], [-58, 276]],
    [[VX - VALVE_R + 2, DECK + 2], [VX + VALVE_R - 2, DECK + 2], [58, 276], [84, 276], [84, 296], [50, 296]],
    [[-VX - 12, HEAD_TOP + 2], [VX + 12, HEAD_TOP + 2], [VX + 12, HEAD_TOP + 12], [-VX - 12, HEAD_TOP + 12]],
  ];
  for (const c of cav) o.push(`<path class="cav" d="${face(c)}"/>`, Ln(face(c), { tone: "lo" }));
  // cut-face hatching would be noise; bore wall lines instead
  for (const x of [-BORE + 6, BORE - 6]) o.push(Ln(k.pathOf([at([x, 0, 152]), at([x, 0, DECK])]), { tone: "faint" }));
  // bolts on the head and block top
  const bolts = [[-76, -8], [76, -8], [-76, -72], [76, -72]];
  o.push(Dt(bolts.map(([x, y]) => at([x, y, HEAD_TOP])), { size: 1.4, tone: "mid" }));
  o.push(Dt([[-88, -8], [88, -8], [-88, -70], [88, -70]].map(([x, y]) => at([x, y, 150])), { size: 1.2, tone: "lo" }));
  // main bearing boss behind the crank (on the back of the cavity)
  o.push(S(G.disc(-4, 0, 30, Fy([0, -30, CZ]), P), { tone: "lo" }));
  // port tubes leaving the head sides: intake (left, -x) and exhaust (right, +x)
  o.push(S(G.disc(0, 30, 13, G.frameAlong([-84, -20, 286], [-1, 0, 0]), P), { tone: "mid" }));
  o.push(S(G.disc(30, 36, 18, G.frameAlong([-84, -20, 286], [-1, 0, 0]), P), { tone: "mid" }));
  o.push(S(G.disc(0, 34, 14, G.frameAlong([84, -20, 286], [1, 0, 0]), P), { tone: "mid" }));
  o.push(S(G.disc(34, 40, 19, G.frameAlong([84, -20, 286], [1, 0, 0]), P), { tone: "mid" }));
  return o.join("");
}

function spark() {   // spark plug, standing at the centre of the head on the cut plane
  const o = [];
  o.push(S(k.cylinder(0, 0, 4, DECK - 2, HEAD_TOP - DECK + 12, P, 20), { tone: "mid", crease: "none" }));
  o.push(S(k.extrude(k.circleRing(0, 0, 10, 6), HEAD_TOP + 14, 12, P), { tone: "mid" }));
  o.push(S(k.cylinder(0, 0, 7, HEAD_TOP + 26, 34, P, 24), { tone: "hi" }));
  for (let z = HEAD_TOP + 32; z < HEAD_TOP + 56; z += 5) o.push(Ln(k.sideArc(0, 0, 7, z, P, 20), { tone: "faint" }));
  o.push(S(k.cylinder(0, 0, 3.5, HEAD_TOP + 60, 10, P, 16), { tone: "mid" }));
  return `<g data-part="plug">${o.join("")}</g>`;
}

function valve(x) {  // built at rest (closed); moved with translateAlong
  const o = [];
  o.push(S(k.cylinder(x, 0, 3.2, DECK + 3, HEAD_TOP + 34 - DECK, P, 16), { tone: "hi", crease: "none" }));
  o.push(S(k.cylinder(x, 0, VALVE_R, DECK - 2, 4, P, 36), { tone: "hi" }));
  for (let z = HEAD_TOP + 14; z <= HEAD_TOP + 30; z += 4) o.push(Ln(k.sideArc(x, 0, 8, z, P, 20), { tone: "mid" }));
  o.push(S(k.cylinder(x, 0, 9, HEAD_TOP + 32, 3, P, 24), { tone: "mid" }));
  return o.join("");
}

function piston() {  // built with its crown at z = 0
  const o = [];
  o.push(S(k.cylinder(0, 0, BORE - 1.5, -PIST_H, PIST_H, P, 64, 0.8), { tone: "hi" }));
  for (const z of [-8, -14, -20]) o.push(Ln(k.sideArc(0, 0, BORE - 1.5, z, P, 48), { tone: "lo" }));
  o.push(Ln(k.ring(0, 0, BORE - 8, 0, P, 48), { tone: "faint" }));
  return o.join("");
}

function moving(deg) {  // crank web, crank pin, rod and gas column for one crank angle
  const a = deg * Math.PI / 180;
  const pin = [R * Math.sin(a), CZ + R * Math.cos(a)];
  const pz = pinZ(deg), top = crown(deg);
  const o = [];
  // crank web with counterweight (behind the rod)
  const cw = circ(-pin[0] * 0.75, CZ - (pin[1] - CZ) * 0.75, 40, 32).map(([x, z]) => [x, z]);
  const web = G.hullOf([...circ(0, CZ, 26, 24), ...circ(pin[0], pin[1], 18, 24), ...cw.filter(([x, z]) => Math.hypot(x, z - CZ) < 58)]);
  o.push(`<g data-part="crank">${S(G.prismOf(Fy([0, -26, 0]), web, 0, 12, P), { tone: "mid" })}${S(G.disc(-2, 26, 11, Fy([pin[0], -10, pin[1]]), P), { tone: "hi" })}</g>`);
  // connecting rod: tapered beam between the big end and the small end
  const rod = G.hullOf([...circ(pin[0], pin[1], 19, 28), ...circ(0, pz, 12, 24)]);
  o.push(`<g data-part="rod">${S(G.prismOf(Fy([0, -7, 0]), rod, 0, 14, P), { tone: "hi" })}</g>`);
  o.push(Dt([at([pin[0], 7, pin[1]]), at([0, 7, pz])], { size: 2.2, tone: "lo" }));
  const gas = k.cylinder(0, 0, BORE - 1.5, top, Math.max(0.5, DECK - top), P, 64);
  return { mech: o.join(""), gas: gas.fill };
}

const STEP = 0.5, N = 720;
const frames = Array.from({ length: N }, (_, i) => moving(i * STEP));
const fit = { pistonAt: (deg) => crown(deg) };
const art = {
  tip: at([0, 0, DECK - 6]), cyl: at([0, 0, 200]), crankAt: at([0, 0, CZ]), chamberRx: k.axisVector(P, [BORE, 0, 0]), ZV: k.axisVector(P, [0, 0, 1]), crown: Array.from({ length: N }, (_, i) => crown(i * STEP)), W, H, P, CZ, R, L, BORE, PIN_UP, PIST_H, DECK, VX, LIFT, STEP, N,
  base: base(), block: block(), spark: spark(), valveIn: valve(-VX), valveEx: valve(VX), piston: piston(),
  frames: frames.map((f) => f.mech), gas: frames.map((f) => f.gas),
  shaft: "",
};
writeFileSync(new URL("./src/art.js", import.meta.url), "window.ART=" + JSON.stringify(art) + ";\nwindow.ISO_CSS=" + JSON.stringify(k.ISO_CSS) + ";\n");
console.log("art.js written", (JSON.stringify(art).length / 1e6).toFixed(2), "MB");
