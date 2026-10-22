// The mystery box for ad v3, built with the Anatomy kit (dark theme): base, body, seams, bolts, latch,
// label plate and a lid that is moved as one piece. Writes src/box3.js.
import { writeFileSync } from "node:fs";
import * as k from "../.claude/skills/anatomy/kit/iso-kit.mjs";

const W = 900, H = 900;
const BASE = { x: -150, y: -150, w: 300, d: 300, r: 14 };
const BOX = { x: -110, y: -110, w: 220, d: 220, r: 8 };
const BOX_H = 150, LID_H = 34;
const P = k.fitProjection([...k.boxCorners(BASE, -18, 0), ...k.boxCorners(BOX, 0, BOX_H + LID_H + 10)], W, H, { pad: 70, azimuth: 45 });
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const Ln = (d, style) => k.lineSvg(d, style);
const Dt = (pts, style) => k.dotsSvg(pts, style);

function body() {
  const o = [`<path class="iso-halo" d="${k.haloOf(BASE, -18, 18, P)}"/>`];
  for (const [x, y] of k.corners(BASE, 22).sort((a, b) => k.depthOf([...a, 0], P) - k.depthOf([...b, 0], P)))
    o.push(S(k.cylinder(x, y, 9, -18, 4, P, 24), { tone: "lo" }));
  o.push(S(k.slabOf(BASE, -14, 14, P, 8, 1.2), { tone: "mid" }));
  o.push(Ln(k.planOutline(k.insetPlan(BASE, 8), 0, P), { tone: "lo" }));
  const sc = k.corners(BASE, 14);
  o.push(Dt(sc.map(([x, y]) => at([x, y, 0])), { size: 1.4 }));
  o.push(S(k.slabOf(BOX, 0, BOX_H, P, 6, 1), { tone: "mid" }));
  for (const z of [30, 75, 120]) o.push(Ln(k.sideSeam(BOX, z, P, 6), { tone: "lo" }));
  // corner straps and bolts
  for (const [x, y] of [[BOX.x + BOX.w, BOX.y + BOX.d]]) o.push(Ln(k.rise([x, y], 0, BOX_H, P), { tone: "hi" }));
  const bolts = [];
  for (const z of [16, BOX_H - 14]) for (const x of [BOX.x + 18, BOX.x + BOX.w - 18]) bolts.push(at([x, BOX.y + BOX.d, z]));
  for (const z of [16, BOX_H - 14]) for (const y of [BOX.y + 18, BOX.y + BOX.d - 18]) bolts.push(at([BOX.x + BOX.w, y, z]));
  o.push(Dt(bolts, { size: 2.2, tone: "hi" }));
  // label plate on the front (+y) face with a big "?"
  o.push(k.faceTextSvg(k.sideMatrix([0, BOX.y + BOX.d], 52, P, "y"), "?", { size: 64, tone: "hi", anchor: "middle" }));
  // latch on the +x face
  o.push(S(k.slabOf({ x: BOX.x + BOX.w, y: -16, w: 6, d: 32, r: 2 }, BOX_H - 34, 30, P, 3), { tone: "hi", lit: true }));
  return o.join("");
}
function lid() {
  const L = k.insetPlan(BOX, -6);
  const o = [S(k.slabOf(L, BOX_H, LID_H, P, 6, 1.2), { tone: "hi" })];
  o.push(Ln(k.planOutline(k.insetPlan(L, 12), BOX_H + LID_H, P), { tone: "lo" }));
  o.push(S(k.slabOf({ x: -40, y: -14, w: 80, d: 28, r: 12 }, BOX_H + LID_H, 10, P, 4), { tone: "mid" }));
  o.push(Dt(k.corners(L, 14).map(([x, y]) => at([x, y, BOX_H + LID_H])), { size: 2, tone: "mid" }));
  return o.join("");
}
const mouth = k.planOutline(BOX, BOX_H, P);
writeFileSync(new URL("./src/box3.js", import.meta.url), "window.BOX3=" + JSON.stringify({ W, H, body: body(), lid: lid(), mouth, ZV: k.axisVector(P, [0, 0, 1]), top: at([0, 0, BOX_H]) }) + ";\nwindow.ISO_CSS=" + JSON.stringify(k.ISO_CSS) + ";\n");
console.log("box3.js written");
