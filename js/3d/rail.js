/* Pip & Bo - 3D levels: rails (RAIL3). A path through the world that a level's vehicle rides along, and the camera shot
   that follows it. Plain JavaScript, always loaded, no three.js: a level's rules, its computer brain and the bot tests
   use it with drawing switched off.

   Written for 42-1 Runaway Coaster (the second 3D rail ride). 41-3 Paper Dragon Flight has its own copy of the same
   table (popdragon-route.js) and can move onto this one: R.at / R.local / R.toLocal answer the same way, with the
   same rows, when no point banks or loops.

   const R = RAIL3.build(points, { step: 0.25 })
     points: [{ p: [x, y, z], v, bank, loop }, ...]  control points, joined by a centripetal Catmull-Rom curve (no cusps
             or loops on uneven spacing) and sampled every `step` units into R.tab. Each point may carry:
               v      speed (units/s) at that point, eased between points (the level may ignore it)
               bank   roll in degrees (+ dips the right side, as a right-hand turn banks), eased between points
               loop   true where the path goes up past vertical (a coaster's loop): there the frame is carried along
                      (parallel transport) instead of being kept level, so it turns upside down with the track
   R.len                       the whole length
   R.at(s) -> { s, p, t, r, u, br, bu, v, bank, yaw, turn, pitch }   the rail at distance s, between rows interpolated:
     p point, t the way it goes, r right and u up of the plain frame (level except in loops), br and bu the frame
     turned by the bank, yaw (radians about Y, 0 = toward +Z), turn (yaw per unit, + to the left), pitch (radians)
   R.local(s, ox, oy, fr)      a place across (ox, + right) and up (oy) from the rail -> [x, y, z] (plain frame)
   R.bankLocal(s, ox, oy, fr)  the same in the banked frame
   R.toLocal(x, y, z, s0, s1)  the nearest rail row within [s0, s1] -> { s, ox, oy, d }
   RAIL3.shot(R, s, o)         a chase shot along the rail: { eye, at, up } plain arrays (K3D.cams.ride smooths it)
     o = { back: 8, height: 3, ahead: 6, lift: 0, roll: 1 (how much of the bank the view takes), rollMax (degrees),
           side: 0 (move the eye to the right, units), tipAhead: 0 (look further down the slope over a crest),
           level (0 to 1: the eye toward level behind the train, for steep drops) }
*/
'use strict';

const RAIL3 = (function () {
  const len3 = a => Math.hypot(a[0], a[1], a[2]);
  const norm = a => { const l = len3(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
  function cr(p0, p1, p2, p3, t) {
    // centripetal Catmull-Rom (alpha 0.5)
    const d = (a, b) => Math.pow(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) || 1e-6, 0.5);
    const t0 = 0, t1 = t0 + d(p0, p1), t2 = t1 + d(p1, p2), t3 = t2 + d(p2, p3), u = t1 + (t2 - t1) * t;
    const L = (a, b, ta, tb) => a.map((v, i) => (tb - u) / (tb - ta) * v + (u - ta) / (tb - ta) * b[i]);
    const A1 = L(p0, p1, t0, t1), A2 = L(p1, p2, t1, t2), A3 = L(p2, p3, t2, t3);
    const B1 = L(A1, A2, t0, t2), B2 = L(A2, A3, t1, t3);
    return L(B1, B2, t1, t2);
  }
  function build(pts, o = {}) {
    const STEP = o.step || 0.25, n = pts.length, dense = [];
    const sm = u => u * u * (3 - 2 * u);
    for (let i = 0; i < n - 1; i++) {
      const p1 = pts[i].p, p2 = pts[i + 1].p;
      const p0 = i === 0 ? p1.map((v, k) => 2 * v - p2[k]) : pts[i - 1].p, p3 = i + 2 >= n ? p2.map((v, k) => 2 * v - p1[k]) : pts[i + 2].p;
      const segs = 64, a = pts[i], b = pts[i + 1];
      for (let k = 0; k < segs; k++) {
        const u = k / segs, e = sm(u);
        dense.push({ p: cr(p0, p1, p2, p3, u), v: (a.v || 0) + ((b.v || 0) - (a.v || 0)) * e, bank: (a.bank || 0) + ((b.bank || 0) - (a.bank || 0)) * e,
          loop: (a.loop || b.loop) ? 1 : 0 });
      }
    }
    const last = pts[n - 1];
    dense.push({ p: last.p.slice(), v: last.v || 0, bank: last.bank || 0, loop: last.loop ? 1 : 0 });
    const len = [0];
    for (let i = 1; i < dense.length; i++) len.push(len[i - 1] + Math.hypot(dense[i].p[0] - dense[i - 1].p[0], dense[i].p[1] - dense[i - 1].p[1], dense[i].p[2] - dense[i - 1].p[2]));
    const total = len[len.length - 1], tab = [];
    let j = 0;
    for (let s = 0; s <= total + 1e-9; s += STEP) {
      while (j < len.length - 2 && len[j + 1] < s) j++;
      const u = Math.max(0, Math.min(1, (s - len[j]) / ((len[j + 1] - len[j]) || 1))), a = dense[j], b = dense[j + 1];
      tab.push({ s, p: a.p.map((v, k) => v + (b.p[k] - v) * u), v: a.v + (b.v - a.v) * u, bank: a.bank + (b.bank - a.bank) * u, loop: u < 0.5 ? a.loop : b.loop });
    }
    // frames: tangent; right kept level (t x Y), except in loops where the last right is carried along
    let prevR = null;
    for (let i = 0; i < tab.length; i++) {
      const a = tab[Math.max(0, i - 2)].p, b = tab[Math.min(tab.length - 1, i + 2)].p;
      const t = norm([b[0] - a[0], b[1] - a[1], b[2] - a[2]]);
      let r;
      if (tab[i].loop && prevR) r = norm(add(prevR, t, -dot(prevR, t)));
      else { r = [-t[2], 0, t[0]]; if (Math.hypot(r[0], r[2]) < 1e-4) r = prevR || [1, 0, 0]; r = norm(r); }
      const u = cross(r, t), bk = tab[i].bank * Math.PI / 180, c = Math.cos(bk), sn = Math.sin(bk);
      prevR = r;
      Object.assign(tab[i], { t, r, u, br: norm(add(r.map(x => x * c), u, -sn)), bu: norm(add(u.map(x => x * c), r, sn)),
        yaw: Math.atan2(t[0], t[2]), pitch: Math.asin(Math.max(-1, Math.min(1, t[1]))) });
    }
    for (let i = 0; i < tab.length; i++) {
      const a = tab[Math.max(0, i - 8)], b = tab[Math.min(tab.length - 1, i + 8)];
      const flat = Math.abs(a.t[1]) < 0.9 && Math.abs(b.t[1]) < 0.9 && !tab[i].loop;
      tab[i].turn = flat ? Math.atan2(Math.sin(b.yaw - a.yaw), Math.cos(b.yaw - a.yaw)) / ((b.s - a.s) || 1) : 0;
    }
    const R = { tab, len: total, step: STEP };
    R.at = function (s) {
      const f = Math.max(0, Math.min(tab.length - 1.001, s / STEP)), i = Math.floor(f), u = f - i, a = tab[i], b = tab[i + 1] || a;
      const mix = (x, y) => [x[0] + (y[0] - x[0]) * u, x[1] + (y[1] - x[1]) * u, x[2] + (y[2] - x[2]) * u];
      return { s, p: mix(a.p, b.p), t: norm(mix(a.t, b.t)), r: norm(mix(a.r, b.r)), u: norm(mix(a.u, b.u)), br: norm(mix(a.br, b.br)), bu: norm(mix(a.bu, b.bu)),
        v: a.v + (b.v - a.v) * u, bank: a.bank + (b.bank - a.bank) * u, loop: a.loop || b.loop, pitch: a.pitch + (b.pitch - a.pitch) * u,
        yaw: a.yaw + Math.atan2(Math.sin(b.yaw - a.yaw), Math.cos(b.yaw - a.yaw)) * u, turn: a.turn + (b.turn - a.turn) * u };
    };
    R.local = function (s, ox, oy, fr) { const f = fr || R.at(s); return add(add(f.p, f.r, ox), f.u, oy); };
    R.bankLocal = function (s, ox, oy, fr) { const f = fr || R.at(s); return add(add(f.p, f.br, ox), f.bu, oy); };
    R.toLocal = function (x, y, z, s0 = 0, s1 = total) {
      let best = null;
      for (let i = Math.max(0, Math.floor(s0 / STEP)); i <= Math.min(tab.length - 1, Math.ceil(s1 / STEP)); i++) {
        const f = tab[i], d = [x - f.p[0], y - f.p[1], z - f.p[2]], along = dot(d, f.t);
        const off = len3(add(d, f.t, -along));
        if (!best || off + Math.abs(along) * 2 < best.k) best = { s: f.s + along, ox: dot(d, f.r), oy: dot(d, f.u), d: along, k: off + Math.abs(along) * 2 };
      }
      return best;
    };
    return R;
  }

  // a chase shot behind a place on the rail (plain arrays; the level's camera rig smooths it)
  function shot(R, s, o = {}) {
    const f = R.at(s), back = o.back != null ? o.back : 8, h = o.height != null ? o.height : 3, ahead = o.ahead != null ? o.ahead : 6;
    // look back along the rail itself (not straight behind), so the eye follows the track round a bend
    const fb = R.at(Math.max(0, s - back)), up0 = f.loop ? f.u : [0, 1, 0];
    const roll = (o.roll != null ? o.roll : 1), rmax = (o.rollMax != null ? o.rollMax : 15) * Math.PI / 180;
    const bk = Math.max(-rmax, Math.min(rmax, f.bank * Math.PI / 180 * roll));
    // the up of the shot: world up (or the loop's up), leaned by part of the bank
    const ur = norm(add(up0.map(x => x * Math.cos(bk)), f.r, Math.sin(bk)));
    let eye = add(fb.p, f.loop ? f.u : [0, 1, 0], h + (o.lift || 0));
    if (o.side) eye = add(eye, f.r, o.side);
    // level (0 to 1): move the eye toward a spot straight behind the train on the level (on a steep drop the rail
    // behind is high above, and the view would be all ground)
    if (o.level && !f.loop) {
      const hb = norm([f.t[0], 0, f.t[2]]), lv = [f.p[0] - hb[0] * back, f.p[1] + h + (o.lift || 0), f.p[2] - hb[2] * back];
      eye = eye.map((x, k) => x + (lv[k] - x) * o.level);
    }
    const fa = R.at(Math.min(R.len, s + ahead));
    let at = add(fa.p, f.loop ? f.u : [0, 1, 0], 0.8);
    if (o.tipAhead) { const fd = R.at(Math.min(R.len, s + ahead + o.tipAhead)); at = add(at.map((x, k) => x * 0.5 + fd.p[k] * 0.5), [0, 0, 0]); }
    return { eye, at, up: ur };
  }
  return { build, shot, cr, norm, cross, dot, add };
})();
