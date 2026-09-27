/*
 * Orin ring logo, rebuilt procedurally from the app icon.
 *
 * The icon is two brush-like arcs that share one outer circle:
 *   - a white crescent (thick at the top, tapering towards both ends)
 *   - a coral arc on the right/bottom that overlaps the white one at 2 o'clock
 * Each arc is the band between an outer circle and an inner circle whose centre
 * is pushed downwards, which is what produces the tapering thickness.
 *
 * All geometry is normalised: ring centre at (0,0), outer radius = 1.
 * Angles are in degrees, screen space (0 = 3 o'clock, 90 = 6 o'clock).
 */
(function (global) {
  const ARCS = {
    white: {
      outer: [0, 0, 1],
      inner: [0.00178, 0.14777, 0.77956],
      from: 156, // round cap tip lands at ~150deg, like the icon
      to: 352,   // hidden under the coral cap
    },
    coral: {
      outer: [-0.00306, 0.01332, 0.9928],
      inner: [0.00389, 0.11118, 0.77446],
      from: 354,
      to: 485,   // = 125deg on the next turn
    },
  };

  const COLORS = { white: '#F7F7F7', coral: '#FF6B56', bg: '#08080A' };
  const RAD = Math.PI / 180;

  // Distance from the ring centre to a circle, along the ray at `deg`.
  function rayCircle(deg, [qx, qy, r]) {
    const ux = Math.cos(deg * RAD), uy = Math.sin(deg * RAD);
    const b = -(ux * qx + uy * qy);
    const c = qx * qx + qy * qy - r * r;
    return -b + Math.sqrt(b * b - c);
  }

  /*
   * SVG path for the part of an arc between angles a0..a1 (a0 < a1), with
   * round caps at both ends. `rot` rotates the thickness profile together
   * with the arc, `s` scales, and `thin` (0..1) squashes the band towards the
   * outer edge (used for the "drawing" look while an arc grows).
   */
  function bandPath(spec, a0, a1, { s = 1, cx = 0, cy = 0, rot = 0, thin = 1, step = 1.5 } = {}) {
    if (a1 - a0 < 0.01) a1 = a0 + 0.01;
    const f = (v) => v.toFixed(2);
    const P = (deg, r) => {
      const t = (deg + rot) * RAD;
      return [cx + Math.cos(t) * r * s, cy + Math.sin(t) * r * s];
    };
    const radii = (deg) => {
      const ro = rayCircle(deg, spec.outer);
      const ri = rayCircle(deg, spec.inner);
      return [ro, ro - (ro - ri) * thin];
    };
    const n = Math.max(2, Math.ceil((a1 - a0) / step));
    const outer = [], inner = [];
    for (let i = 0; i <= n; i++) {
      const a = a0 + ((a1 - a0) * i) / n;
      const [ro, ri] = radii(a);
      outer.push(P(a, ro));
      inner.push(P(a, ri));
    }
    const cap = (deg, forward) => {
      const [ro, ri] = radii(deg);
      const m = (ro + ri) / 2, h = (ro - ri) / 2;
      const t = (deg + rot) * RAD;
      const ux = Math.cos(t), uy = Math.sin(t);
      const tx = -uy, ty = ux; // clockwise tangent
      const mx = cx + ux * m * s, my = cy + uy * m * s;
      const pts = [];
      const k = 18;
      for (let i = 1; i < k; i++) {
        const p = (Math.PI * i) / k;
        const cu = Math.cos(p), su = Math.sin(p);
        const dx = forward ? cu * ux + su * tx : -cu * ux - su * tx;
        const dy = forward ? cu * uy + su * ty : -cu * uy - su * ty;
        pts.push([mx + dx * h * s, my + dy * h * s]);
      }
      return pts;
    };
    let d = `M${f(outer[0][0])} ${f(outer[0][1])}`;
    for (let i = 1; i < outer.length; i++) d += `L${f(outer[i][0])} ${f(outer[i][1])}`;
    for (const p of cap(a1, true)) d += `L${f(p[0])} ${f(p[1])}`;
    for (let i = inner.length - 1; i >= 0; i--) d += `L${f(inner[i][0])} ${f(inner[i][1])}`;
    for (const p of cap(a0, false)) d += `L${f(p[0])} ${f(p[1])}`;
    return d + 'Z';
  }

  /*
   * Full logo state. Progress values (0..1) grow each arc from its anchor:
   *   white grows from its top-right end backwards (counter-clockwise),
   *   coral grows from its top end forwards (clockwise).
   */
  function logoPaths({ white = 1, coral = 1, rot = 0, s = 1, cx = 0, cy = 0, thin = 1 } = {}) {
    const w = ARCS.white, c = ARCS.coral;
    const out = {};
    out.white = white > 0.001
      ? bandPath(w, w.to - (w.to - w.from) * white, w.to, { s, cx, cy, rot, thin })
      : '';
    out.coral = coral > 0.001
      ? bandPath(c, c.from, c.from + (c.to - c.from) * coral, { s, cx, cy, rot, thin })
      : '';
    return out;
  }

  // Static SVG markup (used for the favicon-sized marks inside the UI).
  function logoSVG(size = 64, { bg = null } = {}) {
    const p = logoPaths({ s: 96, cx: 100, cy: 100 });
    return `<svg viewBox="0 0 200 200" width="${size}" height="${size}" aria-hidden="true">` +
      (bg ? `<rect width="200" height="200" fill="${bg}"/>` : '') +
      `<path d="${p.white}" fill="${COLORS.white}"/><path d="${p.coral}" fill="${COLORS.coral}"/></svg>`;
  }

  global.OrinLogo = { ARCS, COLORS, bandPath, logoPaths, logoSVG };
})(window);
