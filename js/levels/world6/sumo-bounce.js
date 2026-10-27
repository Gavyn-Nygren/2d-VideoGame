/* Pip & Bo - Level 6-4 Sumo Bounce (versus). */
'use strict';

/* ===== 6-4 Sumo Bounce (mode 'sumo', versus, best of 7): two bouncy balls on a domed sumo mat over a splash pool =====
   Physics and rules = the measured prototype (w6/sumo/SPEC.md, Appendix A). Everything here is prefixed sumo / SUMO. */
const SUMO = {
  // ball + world
  g: 1800, r: 18, maxFall: 1100,
  rollAcc: 1300, airAcc: 800, maxRoll: 300, rollFric: 800,
  eMat: 0.45, eMin: 140, eBall: 0.4, eHeavy: 0.7, sepMin: 160, lift: 0.1, liftMax: 260, bigBump: 350,
  sepDash: false,   // a boing gets no separation top-up in a bump (its own speed does the work)
  // jump, air hop
  jumpV: 640, hopV: 600, coyote: 0.08, buffer: 0.12,
  // heavy (hold down)
  heavyMass: 2.5, heavyMax: 0.6, heavyCD: 0.9, heavyG: 2.2, heavyRoll: 0.35, heavyFric: 1600,
  slamMin: 500, slamR: 100, slamPop: 260, slamPush: 90,
  // boing (act): tap dash / hold to charge
  tapT: 0.15, chargeT: 0.7, dashTap: 280, dashMax: 500, dashCool: 0.45, autoFire: 1.2, chargeRoll: 0.55,
  dashAir: 0.7, dashTapT: 0.12, dashFullT: 0.3, dashFric: 0.15,
  tapTire: 0.45, tapWin: 2.5,    // taps in a row tire you: each tap within 2.5 s of the last one adds 0.45 s of cooldown
  offBal: 0.45, offMass: 0.6, offRun: 1,   // a missed tap boing that follows another tap within tapWin (taps in a row = offRun or more
                                           // before it) leaves you off balance: 0.45 s of no rolling and no squat, lighter
  hitterCalm: true, dizzyMin: 200, dizzyBase: 0.12, dizzyMax: 0.3, dizzySpan: 300, dizzyFric: 0.5,
  plantMass: 1.6, plantDizzy: 300, plantStill: true,   // the plant braces only a ball that isn't rolling
  // mat: the squeeze runs at (hw - hwMin) / squeezeDur px/s (the straw bales fade on the way to hwMin), on down to hwEnd,
  // where only one ball still fits on the top
  hw: 280, hwMin: 50, hwEnd: 8, lipR: 12, lipDrop: 2, squeezeAt: 25, squeezeDur: 6, capThick: 16,
  // kind edges: near the rim a ball nobody pushed rimward for 0.6 s brakes against the slope too and can't roll itself off;
  // falling in by yourself (nobody pushed you rimward for 1 s, no charged boing of your own; the 1 s waits while a push still
  // carries you rimward faster than pushCarry) while the mat is still full size = a free "Oops!" bubble (oops per round:
  // 99 = no limit); once the squeeze starts every splash counts
  edgeGrip: 90, gripCalm: 0.6, oops: 99, oopsT: 1, pushCarry: 320,
  // comeback + floaties
  goldFloats: true, goldMin: 2, goldMax: 2, floats: 1, rescueV: 950, rescueX: 150, ghostAfter: 0.5, creditT: 2.5,
  // beach ball twist
  beachR: 26, beachM: 0.45, beachE: 0.85, beachG: 900, beachWait: 1.2, beachStill: 4, beachPop: 500,
};
const SUMO_TWISTS = {
  classic: { name: 'Classic Bout', hint: 'Bump the other ball into the pool!', P: {} },
  bouncy: { name: 'Bouncy Castle', hint: 'The mat is extra boingy!', P: { eMat: 0.75, eMin: 100, vertBounce: true } },
  beach: { name: 'Beach Ball', hint: 'A big beach ball joins the fight!', P: { beach: true } },
  soap: { name: 'Soapy Mat', hint: 'Slippery! Hard to stop.', P: { rollFric: 320, rollAcc: 900, heavyFric: 1100 } },
  giant: { name: 'Giant Balls', hint: 'You are huge! Less room to roll.', P: { r: 26 } },
  moon: { name: 'Moon Bounce', hint: 'Low gravity: big floaty hops!', P: { g: 1200, jumpV: 520, hopV: 460, airAcc: 450, rescueV: 780 } },
  tiny: { name: 'Tiny Mat', hint: 'Final round: the mat shrinks from the start!', P: { squeezeAt: 0, squeezeDur: 15 } },
  sudden: { name: 'Sudden Death', hint: 'No floaties. First splash loses!', P: { hw: 160, hwMin: 40, squeezeAt: 0, squeezeDur: 8, floats: 0, oops: 0 } },
};
const SUMO_MIX = ['bouncy', 'beach', 'soap', 'giant', 'moon'];
const SUMO_CLAY = '#ecd29c', SUMO_CLAY_HI = '#f6e4b8', SUMO_SIDE = '#b8733f', SUMO_SIDE_DK = '#8d5329', SUMO_DROP = '#bfe8ff';
const SUMO_BEACH_COLS = ['#ff5f6d', '#fff6e0', '#3fb6ff', '#fff6e0', '#ffd23f', '#fff6e0'];
const sumoP = () => G.mst.P || SUMO;
function sumoSurfY(x) { const st = G.mst, g = st.geo; const dx = x - g.cx; return st.cy - Math.sqrt(Math.max(0, g.R * g.R - dx * dx)); }
function sumoRimY() { const st = G.mst; return st.cy - Math.sqrt(st.geo.R * st.geo.R - st.hw * st.hw); }
function sumoMakeBall(k) {
  const P = sumoP(), L = G.level, s = L.spawns[k], x = s.x + PW / 2, r = P.r;
  const st = G.mst, R = st.geo.R, nx = (x - st.geo.cx) / (R + r), ny = -Math.sqrt(1 - nx * nx);
  return { id: k, x, y: st.cy + ny * (R + r), vx: 0, vy: 0, r, onMat: true, nx, ny, coyote: P.coyote, jumpBuf: 0, hop: true,
    heavy: false, heavyT: 0, heavyCD: 0, heavyLatch: true, charging: false, holdT: 0, charge: 0, cool: 0, dashT: 0, face: k ? -1 : 1,
    out: false, outT: 0, spin: 0, dizzy: 0, floats: P.floats, ghost: 0, rescue: false, lastHitBy: -1, lastHitT: 9, lastHitKind: 'bump', beachT: 9, airT: 0,
    lastCharge: 0, wasOn: true, landV: 0, offT: 0, dashHit: false, tapRun: 0, tapLast: -9, rollIn: false, pushT: 9, carryT: 9,
    // looks only (never read by the rules): squash spring, timers for sounds/puffs/blinks, face
    sq: 0, sqv: -3.2, sqX: nx, sqY: ny, sqBot: true, sndLand: 0, sndBale: 0, tickT: 0, fullT: -1, puffN: 0, puffT: 0, bubT: 0.2,
    blink: 0, blinkT: 1.2 + k * 1.7, look: 0, popT: 9, hopT: 9, cheer: 0, sad: 0, dizzySaid: false, teeter: 0, gripFx: false, skidT: 0, huffT: 0 };
}
// planted = holding boing past a tap (charging) and not rolling: heavier and harder to dizzy
function sumoPlanted(b) { const P = sumoP(); return b.charging && b.holdT >= P.tapT && !(P.plantStill && b.rollIn); }
function sumoMass(b) {
  const P = sumoP();
  return b.offT > 0 ? P.offMass : b.heavy ? P.heavyMass : sumoPlanted(b) ? P.plantMass : 1;
}
function sumoSolidPt(b, px, py, rad, e) { // a ball against a fixed round thing (straw bale)
  const P = sumoP(), dx = b.x - px, dy = b.y - py, d = Math.hypot(dx, dy), min = b.r + rad;
  if (d >= min || d < 1e-6) return null;
  const nx = dx / d, ny = dy / d;
  b.x = px + nx * min; b.y = py + ny * min;
  const vn = b.vx * nx + b.vy * ny;
  if (vn < 0) { const ee = -vn > P.eMin ? e : 0; b.vx -= (1 + ee) * vn * nx; b.vy -= (1 + ee) * vn * ny; }
  return { nx, ny, vn };
}
function sumoCollideMat(b, e) {
  const st = G.mst, g = st.geo, R = g.R, P = sumoP();
  let hit = null;
  if (b.x < T + b.r) { b.x = T + b.r; if (b.vx < 0) b.vx = -b.vx * 0.6; }
  if (b.x > W - T - b.r) { b.x = W - T - b.r; if (b.vx > 0) b.vx = -b.vx * 0.6; }
  if (b.rescue && b.vy < 0) return null;   // a rescued ball on its way up passes the rim corner (it lands on the way down)
  const dx = b.x - g.cx, dy = b.y - st.cy, d = Math.hypot(dx, dy), ry = sumoRimY();
  // the top arc, only for a centre above the rim chord: a ball under the mat is never lifted through it (build fix: the
  // prototype's sector test pulled a ball that fell past a shrunken mat and steered in, from under the cap onto the top)
  if (d < R + b.r && dy < 0 && Math.abs(dx) / d <= st.hw / R && b.y < ry) {
    const nx = dx / d, ny = dy / d;
    b.x = g.cx + nx * (R + b.r); b.y = st.cy + ny * (R + b.r);
    const vn = b.vx * nx + b.vy * ny;
    if (vn < 0) {
      const ee = -vn > P.eMin ? e : 0; b.vx -= (1 + ee) * vn * nx; b.vy -= (1 + ee) * vn * ny;
      if (P.vertBounce && ee > 0) { b.vx += ee * vn * nx; b.vy = Math.min(b.vy, ee * vn); } // trampoline: the rebound goes straight up
    }
    hit = { nx, ny, vn };
  }
  if (b.rescue) return hit;   // a rescued ghost only lands on the top of the mat
  for (const sx of [-1, 1]) {
    // the straw bale, or once it has faded the bare rim corner (a point): a ball falling past the corner glances off it
    const bale = st.lip > 0.5, h = sumoSolidPt(b, g.cx + sx * st.hw, ry, bale ? st.lip : 0, e);
    if (h && h.ny < -0.3 && !hit) { hit = h; h.edge = !bale; }   // a bare corner holds nobody: no friction there
    if (bale && h && h.vn < -150 && b.sndBale !== undefined && b.sndBale <= 0) { b.sndBale = 0.12; st.fx.push({ kind: 'bale', x: g.cx + sx * st.hw, y: ry, id: b.id }); }
  }
  // the cap's underside and side edges (for a centre below the rim chord): a ceiling that pushes down into the pool
  if (b.y > ry) {
    const qx = clamp(b.x, g.cx - st.hw, g.cx + st.hw), qy = Math.min(b.y, ry + P.capThick), ex = b.x - qx, ey = b.y - qy, ed = Math.hypot(ex, ey);
    if (ed < 1e-6) { // the centre is inside the cap's slab: leave by the shortest way (up onto the top, out sideways, or down)
      const sx = Math.sign(b.x - g.cx) || 1, up = b.y - ry + b.r, side = st.hw + b.r - Math.abs(b.x - g.cx), down = ry + P.capThick + b.r - b.y;
      if (up <= side && up <= down) { const d2 = Math.hypot(b.x - g.cx, b.y - st.cy) || 1, ux = (b.x - g.cx) / d2, uy = (b.y - st.cy) / d2; b.x = g.cx + ux * (R + b.r); b.y = st.cy + uy * (R + b.r); const vn = b.vx * ux + b.vy * uy; if (vn < 0) { b.vx -= vn * ux; b.vy -= vn * uy; } }
      else if (side <= down) { b.x = g.cx + sx * (st.hw + b.r); if (b.vx * sx < 0) b.vx = 0; }
      else { b.y = ry + P.capThick + b.r; if (b.vy < 0) b.vy = 0; }
    }
    else if (ed < b.r) {
      const ux = ex / ed, uy = ey / ed, vn = b.vx * ux + b.vy * uy;
      b.x = qx + ux * b.r; b.y = qy + uy * b.r;
      if (vn < 0) { b.vx -= vn * ux; b.vy -= vn * uy; }
    }
  }
  return hit;
}
// two round bodies bump (players, beach ball). Returns the closing speed (0 if none).
function sumoBump(a, c, ma, mc, e, skip) {
  const P = sumoP(), dx = c.x - a.x, dy = c.y - a.y, d = Math.hypot(dx, dy), min = a.r + c.r;
  if (d >= min || d < 1e-6) return 0;
  const nx = dx / d, ny = dy / d, ov = min - d;
  a.x -= nx * ov * mc / (ma + mc); a.y -= ny * ov * mc / (ma + mc);
  c.x += nx * ov * ma / (ma + mc); c.y += ny * ov * ma / (ma + mc);
  const vrel = (c.vx - a.vx) * nx + (c.vy - a.vy) * ny;
  if (vrel >= 0) return 0;
  let j = -(1 + e) * vrel / (1 / ma + 1 / mc);
  const sep = -e * vrel; if (sep < P.sepMin && (P.sepDash || !(a.dashT > 0 || c.dashT > 0))) j += (P.sepMin - sep) / (1 / ma + 1 / mc);
  a.vx -= j / ma * nx; a.vy -= j / ma * ny; c.vx += j / mc * nx; c.vy += j / mc * ny;
  for (const [b, dv] of [[a, j / ma], [c, j / mc]]) {
    if (b.onMat && dv > 150) b.vy -= Math.min(P.liftMax, P.lift * dv);
    if (b.dizzy !== undefined && b !== skip && !b.heavy && dv >= (sumoPlanted(b) ? P.plantDizzy : P.dizzyMin)) {
      b.dizzy = Math.max(b.dizzy, P.dizzyBase + P.dizzyMax * Math.min(1, (dv - P.dizzyMin) / P.dizzySpan)); b.charging = false; b.charge = 0; b.holdT = 0;
      if (b.dizzy >= 0.25 && !b.dizzySaid) { b.dizzySaid = true; G.mst.fx.push({ kind: 'dizzy', id: b.id }); }
    }
  }
  // looks: both bodies squash along the hit line
  for (const b of [a, c]) if (b.sqv !== undefined) { b.sqX = nx; b.sqY = ny; b.sqBot = false; b.sqv += Math.min(5, -vrel * 0.008); }
  return -vrel;
}
function sumoCollideBalls(a, c, live) {
  const st = G.mst, P = sumoP();
  if (a.out || c.out || a.ghost > 0 || c.ghost > 0) return;
  const pa = Math.hypot(a.vx, a.vy) + (a.dashT > 0 ? 400 : 0), pc = Math.hypot(c.vx, c.vy) + (c.dashT > 0 ? 400 : 0);
  const hitter = Math.abs(pa - pc) < 1 ? (G.tickN & 1 ? c : a) : pa > pc ? a : c, vict = hitter === a ? c : a;
  const v0 = [a.vx, c.vx];
  const imp = sumoBump(a, c, sumoMass(a), sumoMass(c), a.heavy || c.heavy ? P.eHeavy : P.eBall, P.hitterCalm ? hitter : null);
  // a boing that touched someone; a bump that pushed a ball toward its rim (the edge grip and the Oops! bubble don't cover that)
  if (imp > 0) [a, c].forEach((b, i) => { if (b.dashT > 0) b.dashHit = true; if (imp > 60 && (b.vx - v0[i]) * (Math.sign(b.x - st.geo.cx) || 1) > 60) { b.pushT = 0; b.carryT = 0; } });
  if (imp <= 120) return;
  vict.lastHitBy = hitter.id; vict.lastHitT = 0; vict.lastHitKind = hitter.dashT > 0 && hitter.lastCharge >= 1 ? 'super' : 'bump';
  if (live && imp >= P.bigBump) { st.stat.bumps[hitter.id]++; st.rbumps[hitter.id]++; st.stat.best[hitter.id] = Math.max(st.stat.best[hitter.id], Math.round(imp)); }
  const d = Math.hypot(c.x - a.x, c.y - a.y) || 1;
  st.fx.push({ kind: 'bump', x: (a.x + c.x) / 2, y: (a.y + c.y) / 2, imp, hit: hitter.id, vic: vict.id, nx: (c.x - a.x) / d, ny: (c.y - a.y) / d });
}
function sumoFire(b, p) {
  const st = G.mst, P = sumoP(), o = st.b[1 - b.id], inp = p.input;
  const mv = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
  const dir = mv || (o.out ? b.face : Math.sign(o.x - b.x) || b.face);
  const tap = b.holdT < P.tapT, sp = tap ? P.dashTap : P.dashTap + (P.dashMax - P.dashTap) * b.charge;
  b.face = dir;
  if (b.onMat) {
    const tx = -b.ny, ty = b.nx, vt = b.vx * tx + b.vy * ty, want = dir * sp;
    if (vt * dir < sp) { b.vx += (want - vt) * tx; b.vy += (want - vt) * ty; }
  } else { // in the air: a dive, down and forward (at the other ball when no direction is held)
    let ax = dir, ay = 1;
    if (!mv && !o.out) { ax = o.x - b.x; ay = o.y - b.y; }
    ay = Math.max(ay, 0.5 * Math.abs(ax), 1);
    const d = Math.hypot(ax, ay), v = sp * P.dashAir;
    b.vx = ax / d * v; b.vy = Math.max(b.vy, ay / d * v);
  }
  const ch = tap ? 0 : b.charge;
  // taps in a row tire you (each one within tapWin of the last adds tapTire of cooldown); a charged boing rests you
  if (tap) { b.tapRun = G.time - b.tapLast < P.tapWin ? b.tapRun + 1 : 0; b.tapLast = G.time; } else { b.tapRun = 0; b.carryT = 0; }
  b.dashT = tap ? P.dashTapT : P.dashTapT + (P.dashFullT - P.dashTapT) * b.charge; b.cool = P.dashCool + (tap ? P.tapTire * b.tapRun : 0);
  b.charging = false; b.lastCharge = tap ? 0 : b.charge; b.charge = 0; b.holdT = 0; b.dashHit = false;
  if (st.live) { st.stat.boings[b.id]++; if (!tap && b.lastCharge >= 1) st.stat.full[b.id]++; }
  st.fx.push({ kind: 'boing', id: b.id, ch, dir, air: !b.onMat });
}
function sumoBeachStep(dt) {
  const st = G.mst, P = sumoP(), bb = st.beach; if (!bb) return;
  if (bb.wait > 0) { bb.wait -= dt; if (bb.wait <= 0) { Object.assign(bb, { x: bb.nextX, y: -40, vx: bb.nextVx, vy: 0, inPool: false, stillT: 0 }); st.fx.push({ kind: 'beachIn' }); } return; }
  if (bb.inPool) { bb.poolT += dt; bb.y += ((st.waterY - bb.r * 0.4) - bb.y) * 6 * dt; bb.spin += bb.vx * dt / bb.r; bb.vx *= 1 - 2 * dt; if (bb.poolT > P.beachWait) { bb.wait = 0.01; } return; }
  bb.vy = Math.min(bb.vy + P.beachG * dt, P.maxFall);
  const n = Math.max(1, Math.ceil(Math.hypot(bb.vx, bb.vy) * dt / 3));
  for (let i = 0; i < n; i++) {
    bb.x += bb.vx * dt / n; bb.y += bb.vy * dt / n;
    const h = sumoCollideMat(bb, P.beachE);
    if (h) { const tx = -h.ny, ty = h.nx; let vt = bb.vx * tx + bb.vy * ty; const vn = bb.vx * h.nx + bb.vy * h.ny; vt = approach(vt, 0, 150 * dt / n); bb.vx = vt * tx + vn * h.nx; bb.vy = vt * ty + vn * h.ny; if (-h.vn > 180) bb.sqv = Math.min(5, -h.vn * 0.008); }
    for (const b of st.b) if (!b.out && b.ghost <= 0) { const imp = sumoBump(b, bb, sumoMass(b), P.beachM, P.beachE); if (imp > 0 && b.dashT > 0) b.dashHit = true; if (imp > 150) { b.beachT = 0; st.fx.push({ kind: 'beach', x: (bb.x + b.x) / 2, y: (bb.y + b.y) / 2, imp, id: b.id }); } }
  }
  bb.spin += bb.vx * dt / bb.r;
  bb.stillT = Math.hypot(bb.vx, bb.vy) < 20 ? (bb.stillT || 0) + dt : 0;
  if (bb.stillT > P.beachStill) { bb.stillT = 0; bb.vy = -P.beachPop; bb.vx = (MODES.sumo.rand() < 0.5 ? -1 : 1) * 100; st.fx.push({ kind: 'beachPop', x: bb.x, y: bb.y }); }
  if (bb.y > st.waterY) {
    bb.inPool = true; bb.poolT = 0; bb.vx *= 0.3; bb.vy = 0; st.fx.push({ kind: 'beachSplash', x: bb.x, y: st.waterY });
    // where it drops in next (picked now, so a little arrow can show it while it bobs)
    bb.nextX = st.geo.cx + (MODES.sumo.rand() * 2 - 1) * 120; bb.nextVx = (MODES.sumo.rand() * 2 - 1) * 80;
  }
}
function sumoTick(dt, live) {
  const st = G.mst, g = st.geo, m = G.match, P = sumoP();
  st.live = live;
  if (live) {
    // the squeeze: from squeezeAt the mat shrinks at a steady speed; the straw bales fade on the way to hwMin, and it goes on
    // down to hwEnd, where only one ball still fits on the top (so a careful pair can't sit it out to the clock)
    const el = m.roundT - P.squeezeAt, f = clamp(el / P.squeezeDur, 0, 1), rate = (P.hw - P.hwMin) / P.squeezeDur;
    st.squeeze = el >= 0 ? f : 0;
    st.hw = el > 0 ? Math.max(Math.min(P.hwEnd, P.hw), P.hw - rate * el) : P.hw;
    st.shrink = el > 0 && st.hw > P.hwEnd + 1e-6;   // still shrinking (crumbs, the "Squeeze!" chip)
    st.lip = P.lipR * Math.max(0, 1 - f * P.lipDrop);
    if (st.squeeze > 0 && !st.squeezeSaid) { st.squeezeSaid = true; st.fx.push({ kind: 'squeeze' }); }
  }
  for (const b of st.b) {
    const dash0 = b.dashT;
    b.dizzy = Math.max(0, b.dizzy - dt); if (b.dizzy <= 0) b.dizzySaid = false;
    const p = G.players[b.id], inp = live && !b.out && !b.rescue && b.dizzy <= 0 ? p.input : NO_INPUT;
    b.cool -= dt; b.heavyCD -= dt; b.dashT -= dt; b.lastHitT += dt; b.beachT += dt; b.pushT += dt; b.offT -= dt;
    // the Oops! timer (since a rimward push or your own charged boing) waits while the ball is still carried rimward faster than
    // pushCarry: a long flight after a push or a charged boing still counts as pushed
    if (!(b.vx * (Math.sign(b.x - g.cx) || 1) > P.pushCarry)) b.carryT += dt;
    if (b.out) continue;
    // a tap boing that ended without touching anybody: off balance for a moment (no rolling, no squat, lighter)
    if (live && dash0 > 0 && b.dashT <= 0 && !(b.lastCharge > 0) && !b.dashHit && !b.rescue && P.offBal > 0 && b.tapRun >= P.offRun) { b.offT = P.offBal; st.fx.push({ kind: 'whoa', id: b.id }); }
    const off = b.offT > 0;
    // the ▼ latch follows the real button, not the no-input of a dizzy or a rescue: release ▼ to squat again
    const realDown = live && !!p.input.down;
    if (!realDown) b.heavyLatch = false;
    if (inp.down && !b.heavy && b.heavyCD <= 0 && !b.heavyLatch && !off) { b.heavy = true; b.heavyT = 0; if (b.charging) { b.charging = false; b.charge = 0; b.holdT = 0; } st.fx.push({ kind: 'heavy', id: b.id, x: b.x, y: b.y + b.r, on: b.onMat }); }
    if (b.heavy) { b.heavyT += dt; if (!inp.down || b.heavyT >= P.heavyMax) { b.heavy = false; b.heavyCD = P.heavyCD; if (realDown) b.heavyLatch = true; } }
    // boing: a fresh press starts a charge (never while dizzy, in the rescue bubble or still a ghost after it); the press is used up either way
    if (live && p.pendingAct) { p.pendingAct = false; if (b.cool <= 0 && !b.heavy && !b.charging && !b.rescue && b.dizzy <= 0 && b.ghost <= 0) { b.charging = true; b.holdT = 0; b.charge = 0; b.tickT = 0; b.fullT = -1; } }
    if (b.charging) {
      if (inp.act) {
        b.holdT += dt; b.charge = clamp((b.holdT - P.tapT) / P.chargeT, 0, 1);
        if (b.charge > 0 && b.charge < 1) { b.tickT -= dt; if (b.tickT <= 0) { b.tickT = 0.1; st.fx.push({ kind: 'ctick', id: b.id, ch: b.charge }); } }
        if (b.charge >= 1 && b.fullT < 0) { b.fullT = 0; st.fx.push({ kind: 'full', id: b.id }); }
        if (b.holdT >= P.tapT + P.chargeT + P.autoFire) sumoFire(b, p);
      }
      else if (live) sumoFire(b, p);
      else { b.charging = false; b.charge = 0; b.holdT = 0; }   // the round is over: a held charge fizzles, it never fires
    }
    if (live && p.pendingJump) { p.pendingJump = false; if (!b.rescue && b.dizzy <= 0) b.jumpBuf = P.buffer; } else b.jumpBuf -= dt;
    b.coyote = b.onMat ? P.coyote : b.coyote - dt;
    if (b.jumpBuf > 0 && !b.heavy) {
      if (b.coyote > 0) { b.vy = Math.max(Math.min(b.vy, 0) - P.jumpV, -P.jumpV * 1.1); b.coyote = 0; b.jumpBuf = 0; b.onMat = false; st.fx.push({ kind: 'jump', id: b.id, x: b.x, y: b.y + b.r }); }
      else if (b.hop && !b.onMat) { b.vy = Math.min(b.vy, -P.hopV); b.hop = false; b.jumpBuf = 0; st.fx.push({ kind: 'hop', id: b.id, x: b.x, y: b.y + b.r }); if (live) st.stat.hops[b.id]++; }
    }
    let mv = off ? 0 : (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    if (mv) b.face = mv;
    // edge grip: a ball on the top that nobody bumped for gripCalm (and isn't dashing or dizzy) can't roll or coast itself off:
    // near the rim it also brakes against the slope, and holding outward stops counting where it could no longer stop
    const ox = Math.sign(b.x - g.cx) || 1, adx = Math.abs(b.x - g.cx), fr0 = b.heavy ? P.heavyFric : P.rollFric, vOut = Math.max(0, b.vx * ox);
    const gripOK = live && P.edgeGrip > 0 && b.onMat && b.dashT <= 0 && b.dizzy <= 0 && b.pushT > P.gripCalm && b.beachT > P.gripCalm && adx <= st.hw;
    const need = vOut * vOut / (2 * fr0) + 12, grip = gripOK && adx > st.hw - Math.max(P.edgeGrip, need);
    if (grip && mv === ox && adx > st.hw - need) { mv = 0; b.teeter = 0.2; }
    b.rollIn = !!mv;
    const rollK = (b.heavy ? P.heavyRoll : 1) * (b.charging && b.holdT >= P.tapT ? P.chargeRoll : 1);
    b.vy = Math.min(b.vy + P.g * (b.heavy && !b.onMat ? P.heavyG : 1) * dt, P.maxFall * (b.heavy ? 1.6 : 1));
    if (b.onMat) {
      const tx = -b.ny, ty = b.nx, vn = b.vx * b.nx + b.vy * b.ny, max = P.maxRoll * rollK;
      const fric = !live ? 2600 : b.edge ? 0 : fr0 * (b.dashT > 0 ? P.dashFric : 1) * (b.dizzy > 0 ? P.dizzyFric : 1) + (grip && vOut > 0 ? P.g * Math.abs(b.nx) : 0);   // round over: plant and stay put
      if (grip && vOut > 40) b.gripFx = true;
      let vt = b.vx * tx + b.vy * ty;
      if (mv) {
        if (vt * mv < 0) vt = Math.min(vt * mv + (fric + P.rollAcc * rollK) * dt, max) * mv;   // steering against the roll brakes harder
        else if (vt * mv < max) vt = Math.min(vt * mv + P.rollAcc * rollK * dt, max) * mv;
        else vt = approach(vt, mv * max, fric * dt);
      } else vt = approach(vt, 0, fric * dt);
      b.vx = vt * tx + vn * b.nx; b.vy = vt * ty + vn * b.ny;
    } else if (mv) {
      const max = P.maxRoll * rollK;
      if (b.vx * mv < max) b.vx = Math.min(b.vx * mv + P.airAcc * rollK * dt, max) * mv;
    }
    b.wasOn = b.onMat; b.landV = 0;
  }
  const sp = Math.max(...st.b.map(b => Math.hypot(b.vx, b.vy)));
  const n = Math.max(1, Math.ceil(sp * dt / 3));
  for (const b of st.b) { b.onMat = false; b.edge = false; }
  for (let i = 0; i < n; i++) {
    for (const b of st.b) {
      if (b.out) continue;
      b.x += b.vx * dt / n; b.y += b.vy * dt / n;
      const h = sumoCollideMat(b, P.eMat);
      if (h && h.ny < -0.3) { b.onMat = true; b.nx = h.nx; b.ny = h.ny; b.edge = !!h.edge; if (-h.vn > b.landV) b.landV = -h.vn; }
    }
    sumoCollideBalls(st.b[0], st.b[1], live);
  }
  // the last ball-ball push can nudge a ball into the mat: one more mat pass
  const matPass = () => { for (const b of st.b) if (!b.out) { const h = sumoCollideMat(b, P.eMat); if (h && h.ny < -0.3) { b.onMat = true; b.nx = h.nx; b.ny = h.ny; b.edge = !!h.edge; } } };
  matPass();
  { const [a, c] = st.b;   // ... and that pass can nudge it back into the other ball: separate positions only (no new bump)
    if (!a.out && !c.out && a.ghost <= 0 && c.ghost <= 0) { const dx = c.x - a.x, dy = c.y - a.y, d = Math.hypot(dx, dy), ov = a.r + c.r - d;
      if (ov > 0 && d > 1e-6) { const ma = sumoMass(a), mc = sumoMass(c); a.x -= dx / d * ov * mc / (ma + mc); a.y -= dy / d * ov * mc / (ma + mc); c.x += dx / d * ov * ma / (ma + mc); c.y += dy / d * ov * ma / (ma + mc); matPass(); } } }
  if (P.beach) {   // a beach-ball shove can push one ball into the other or into the mat: separate them again this tick
    sumoBeachStep(dt); matPass(); sumoCollideBalls(st.b[0], st.b[1], live); matPass();
  }
  const outs = [];
  for (const b of st.b) {
    if (b.out) {
      b.outT += dt; b.vy += (st.waterY - b.r * 0.35 - b.y) * 30 * dt - b.vy * 4 * dt; b.vx *= 1 - 2 * dt; b.x += b.vx * dt; b.y += b.vy * dt;
      b.x = clamp(b.x, T + b.r, W - T - b.r); continue;
    }
    if (b.onMat) { b.hop = true; b.airT = 0; if (b.rescue) { b.rescue = false; b.ghost = P.ghostAfter; st.fx.push({ kind: 'touch', id: b.id }); } } else b.airT += dt;
    if (!b.rescue && b.ghost > 0) {   // a ghost stays a ghost while it overlaps the other ball, and slides out of it
      b.ghost -= dt; const o = st.b[1 - b.id];
      if (!o.out && Math.hypot(o.x - b.x, o.y - b.y) < b.r + o.r + 2) { if (b.ghost <= 0) b.ghost = 0.05; const s = Math.sign(b.x - o.x) || (b.x < g.cx ? -1 : 1); b.vx = approach(b.vx, s * 180, 1600 * dt); }
    }
    let slam = false;
    if (b.onMat && !b.wasOn && b.heavy && b.landV > P.slamMin) {
      slam = true;
      const o = st.b[1 - b.id];
      let hitO = false;
      if (!o.out && o.ghost <= 0 && o.onMat && Math.abs(o.x - b.x) < P.slamR) {
        const f = 1 - 0.5 * Math.abs(o.x - b.x) / P.slamR, s = Math.sign(o.x - b.x) || (o.x < g.cx ? -1 : 1);
        o.vy = Math.min(o.vy, -P.slamPop * f); o.vx += s * P.slamPush * f; o.onMat = false;
        o.lastHitBy = b.id; o.lastHitT = 0; o.lastHitKind = 'slam'; o.pushT = 0; o.carryT = 0;
        if (live) st.stat.slams[b.id]++;
        hitO = true;
      }
      st.fx.push({ kind: 'slam', id: b.id, x: b.x, y: b.y + b.r, hitO, oid: o.id });
    }
    if (b.onMat && !b.wasOn && b.landV > 120 && !b.rescue) { // looks: land squash (+ a thud for a hard landing)
      b.sqX = b.nx; b.sqY = b.ny; b.sqBot = true; b.sqv += Math.min(6, b.landV * 0.006);
      if (!slam && b.landV > 300 && b.sndLand <= 0) { b.sndLand = 0.15; st.fx.push({ kind: 'land', id: b.id, x: b.x, y: b.y + b.r, v: b.landV }); }
    }
    b.spin += b.vx * dt / b.r;
    if (b.y > st.waterY) {
      const credit = b.lastHitT < P.creditT ? b.lastHitBy : -1;
      // fell in by yourself (for oopsT nobody pushed you rimward, no beach ball, no charged boing of your own) while the mat is
      // still full size: a free "Oops!" bubble, oops per round; the floatie stays on
      const calm = t => t >= P.oopsT;
      const oops = live && st.oopsLeft[b.id] > 0 && st.hw >= P.hw - 0.5 && calm(b.carryT) && calm(b.beachT);
      if (live && !oops && credit >= 0 && credit !== b.id) st.stat.offs[credit]++;
      const x0 = b.x;
      if (!live || oops || b.floats > 0) {   // round over: the pool bounces a still-dry ball back for free (looks only, no floatie used)
        const gold = live && !oops && b.floats <= st.gold[b.id];   // the gold floaties pop first
        if (oops) { st.oopsLeft[b.id]--; st.stat.oops[b.id]++; } else if (live) b.floats--;
        b.rescue = true; b.ghost = 9; b.heavy = false; b.heavyLatch = true; b.charging = false; b.charge = 0; b.holdT = 0; b.jumpBuf = 0; b.dizzy = 0; b.dashT = 0; b.offT = 0;
        const side = Math.sign(b.x - g.cx) || 1, xt = g.cx + side * clamp(st.hw - 60, 0, P.rescueX);
        if (Math.abs(b.x - g.cx) < st.hw + b.r + 6) b.x = g.cx + side * (st.hw + b.r + 6);   // start outside the rim, never under the mat
        const ym = sumoSurfY(xt) - b.r, vy = -P.rescueV, tF = (-vy + Math.sqrt(vy * vy + 2 * P.g * (ym - st.waterY))) / P.g;
        b.vy = vy; b.vx = (xt - b.x) / tF; b.y = st.waterY;
        st.fx.push({ kind: 'save', id: b.id, x: b.x, x0, y: st.waterY, gold, free: !live || oops, oops });
        if (live && !oops) { st.stat.saves[b.id]++; st.rsplash[b.id]++; }
      } else { b.out = true; b.outT = 0; b.vy *= 0.2; b.charging = false; b.charge = 0; b.holdT = 0; b.heavy = false; b.dashT = 0; b.dizzy = 0; b.offT = 0; outs.push(b); st.fx.push({ kind: 'splash', id: b.id, x: b.x, y: st.waterY }); }
    }
  }
  if (live) {
    let w = null;
    if (outs.length === 2) { if (matchRoundEnd(-1, 'Double splash!')) w = -1; }
    else if (outs.length === 1) {
      const loser = outs[0], ww = 1 - loser.id, hit = loser.lastHitBy === ww && loser.lastHitT < P.creditT;
      const beach = loser.beachT < P.creditT && (!hit || loser.beachT < loser.lastHitT);
      // the results list prints the round winner first, so the reason names the loser
      const ln = NAMES[loser.id];
      if (matchRoundEnd(ww, beach ? 'Beach-balled ' + ln + ' into the pool!' : hit ? { bump: 'Bounced ' + ln + ' into the pool!', super: 'Super boing! ' + ln + ' splashed!', slam: 'Slammed ' + ln + ' into the pool!' }[loser.lastHitKind]
        : st.squeeze > 0 ? 'Squeezed ' + ln + ' off the mat!' : ln + ' rolled off the edge!')) w = ww;
    }
    if (w !== null) sumoRoundOver(w);
  }
}
// the round was just decided: the winner's own celebration (the framework skips it for hidden players)
function sumoRoundOver(w) {
  const st = G.mst;
  st.cheer = { w, hop: 0, conf: 0 };
  if (w < 0) { for (const b of st.b) b.sad = 1; return; }
  const b = st.b[w], o = st.b[1 - w];
  burst(b.x, b.y, PCOL[w], 16); b.cheer = 1; o.sad = 1;
  for (let k = 0; k < 18; k++) confetti(b.x, b.y - b.r);
}
function sumoDrops(x, y, n, spd, col) { // water droplets flying up out of the pool
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.5, s = spd * (0.45 + Math.random() * 0.75);
    G.particles.push({ x: x + (Math.random() - 0.5) * 14, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.75, max: 0.75, col: col || SUMO_DROP, size: 2.5 + Math.random() * 3, grav: 1100, kind: 'dot' });
  }
}
function sumoVfx(kind, x, y, d, extra) { G.mst.vfx.push(Object.assign({ kind, x, y, t: 0, d }, extra || {})); }
const sumoShake = s => { if (!reduceMotion) G.shake = Math.max(G.shake, s); };
// sounds, particles and rumble for what happened this tick (the rules push events into st.fx)
function sumoFxRun() {
  const st = G.mst, P = sumoP();
  for (const e of st.fx) {
    const b = e.id !== undefined ? st.b[e.id] : null;
    switch (e.kind) {
      case 'bump': {
        const big = e.imp >= P.bigBump;
        burst(e.x, e.y, '#fff', Math.round(6 + e.imp / 60));
        if (big) {
          burst(e.x, e.y, C.gold, 4); sumoShake(0.12); Sfx.play('sumoBig');
          sumoVfx('star', e.x, e.y, 0.2, { s: Math.min(1.5, e.imp / 450) });
          rumble(e.vic, 0.6, 0.4, 120); rumble(e.hit, 0.2, 0.3, 80);
        } else {
          if (st.sndBump <= 0) { st.sndBump = 0.08; Sfx.play('sumoBump'); }
          rumble(0, 0, 0.25, 50); rumble(1, 0, 0.25, 50);
          sumoVfx('star', e.x, e.y, 0.12, { s: 0.45 });
        }
        break;
      }
      case 'dizzy': Sfx.play('sumoDizzy', e.id); break;
      case 'whoa': Sfx.play('sumoWhoa', e.id); b.sqX = 0; b.sqY = -1; b.sqBot = false; b.sqv += 2.5; break;   // a tap that hit nothing: wobble
      case 'heavy':
        Sfx.play('sumoHeavy', e.id); rumble(e.id, 0.2, 0, 60);
        if (e.on) { puff(e.x - 10, e.y, 1, SUMO_CLAY); puff(e.x + 10, e.y, 1, SUMO_CLAY); }
        break;
      case 'ctick': Sfx.tone((300 + 400 * e.ch) * (e.id ? 0.84 : 1), 0.05, 'square', 0.02); break;
      case 'full': Sfx.play('sumoFull', e.id); rumble(e.id, 0, 0.25, 50); break;
      case 'boing':
        if (e.ch > 0) { Sfx.play('sumoBoingBig', e.id); rumble(e.id, 0.3 * e.ch, 0.2, 80); } else Sfx.play('boing', e.id);
        b.puffN = 3; b.puffT = 0;
        if (!e.air) { b.sqX = 1; b.sqY = 0; b.sqBot = false; b.sqv -= 2 + 2.5 * e.ch; }
        if (e.ch >= 1) sumoVfx('ring', b.x, b.y, 0.22, { r0: b.r, r1: b.r + 22, col: C.gold });
        break;
      case 'jump':
        Sfx.play('jump', e.id); puff(e.x, e.y, 3, '#fff');
        b.sqX = b.nx; b.sqY = b.ny; b.sqBot = true; b.sqv = Math.min(b.sqv, 0) - 3.6;
        break;
      case 'hop':
        Sfx.play('sumoHop', e.id); puff(e.x, e.y, 3, '#fff');
        sumoVfx('ring', b.x, b.y, 0.15, { r0: b.r, r1: b.r + 10, col: '#fff' });
        b.sqX = 0; b.sqY = -1; b.sqBot = false; b.sqv = Math.min(b.sqv, 0) - 3;
        break;
      case 'land': Sfx.play('land', e.id); if (e.v > 500) puff(e.x, e.y, 2, SUMO_CLAY); break;
      case 'slam':
        Sfx.play('sumoSlam'); puff(e.x, e.y, 10, '#d2ad72'); sumoShake(0.15);
        sumoVfx('shock', e.x, e.y, 0.32);
        rumble(e.id, 0.5, 0.3, 120);
        if (e.hitO) { rumble(e.oid, 0.7, 0.5, 150); const o = st.b[e.oid]; o.sqX = 0; o.sqY = -1; o.sqBot = false; o.sqv -= 3; }
        break;
      case 'bale': Sfx.play('bonk'); puff(e.x, e.y - 4, 3, C.rope); break;
      case 'save': {
        const col = e.gold ? C.gold : '#ff5f6d';
        Sfx.play('splash'); Sfx.play('sumoSave', e.id); if (!e.free) rumble(e.id, 0.4, 0.4, 150);
        burst(e.x0, e.y, '#fff', 8); sumoDrops(e.x0, e.y, 12, 420);
        if (Math.abs(e.x - e.x0) > 20) sumoDrops(e.x, e.y, 6, 300);
        sumoVfx('ripple', e.x0, e.y + 3, 0.8);
        if (!e.free) { burst(e.x0, e.y, col, 8); sumoVfx('pop', e.x0, e.y - 34, 0.7, { col: e.gold ? C.gold : '#fff' }); sumoVfx('popring', e.x0, e.y - 4, 0.3, { col, r: b.r + 4 }); }
        if (e.oops) { Sfx.play('sumoOops', e.id); sumoVfx('pop', clamp(e.x0, 70, W - 70), e.y - 34, 0.9, { col: SUMO_DROP, txt: 'Oops!' }); }   // a free bubble: the floatie stays on
        b.popT = 0; b.sqX = 0; b.sqY = -1; b.sqBot = false; b.sqv = -4.5;
        break;
      }
      case 'touch': if (b) { puff(b.x, b.y + b.r, 3, '#e8f8ff'); } break;
      case 'splash':
        Sfx.play('splash'); Sfx.play('sumoBlub', e.id); sumoShake(0.1);
        sumoDrops(e.x, e.y, 20, 520); sumoVfx('ripple', e.x, e.y + 3, 1.0); sumoVfx('ripple', e.x, e.y + 3, 0.7, { s: 0.6 });
        if (st.live) rumble(e.id, 0.8, 0.6, 250);
        break;
      case 'squeeze': Sfx.play('sumoSqueeze'); break;
      case 'beach': burst(e.x, e.y, '#fff', 5); Sfx.play('sumoBeach'); break;
      case 'beachPop': Sfx.play('sumoBeach'); puff(e.x, e.y + 20, 4, '#fff'); break;
      case 'beachIn': Sfx.play('sumoBeachIn'); break;
      case 'beachSplash': sumoDrops(e.x, e.y, 10, 380); sumoVfx('ripple', e.x, e.y + 3, 0.7); Sfx.play('splash'); break;
    }
  }
  st.fx = [];
}
// looks only, every tick in every phase: squash springs, blinks, dash puffs, bubbles, crumbs, effect timers
function sumoLooks(dt) {
  const st = G.mst; if (!st.b) return;
  st.sndBump -= dt;
  for (const b of st.b) {
    b.sqv += (-420 * b.sq - 14 * b.sqv) * dt; b.sq = clamp(b.sq + b.sqv * dt, -0.32, 0.36);
    b.sndLand -= dt; b.sndBale -= dt; b.popT += dt; b.hopT += dt; if (b.fullT >= 0) b.fullT += dt;
    b.look = approach(b.look, clamp(b.vx / 200, -1, 1) * 3 + b.face * 1.5, dt * 30);
    b.blinkT -= dt; b.blink -= dt;
    if (b.blinkT <= 0) { b.blink = 0.12; b.blinkT = 1.8 + Math.random() * 3; }
    if (b.cheer > 0) b.cheer = Math.min(1, b.cheer + dt);
    b.teeter -= dt; b.skidT -= dt; b.huffT -= dt;
    if (b.gripFx) { b.gripFx = false; if (b.skidT <= 0 && !b.out) { b.skidT = 0.08; puff(b.x + Math.sign(b.vx) * b.r * 0.5, b.y + b.r, 1, SUMO_CLAY_HI); } }   // the grip digs in
    if (b.tapRun >= 2 && b.cool > 0.15 && !b.out && b.huffT <= 0) { b.huffT = 0.25; puff(b.x + b.face * b.r * 0.7, b.y + 2, 1, '#fff'); }   // tired from tapping: huff
    if (b.puffN > 0) { b.puffT -= dt; if (b.puffT <= 0) { b.puffT = 0.04; b.puffN--; puff(b.x - Math.sign(b.vx || b.face) * b.r, b.y + b.r * 0.4, 1, '#fff'); } }
    if (b.out) { b.bubT -= dt; if (b.bubT <= 0) { b.bubT = 0.4; G.particles.push({ x: b.x + (Math.random() - 0.5) * b.r, y: st.waterY + 2, vx: (Math.random() - 0.5) * 20, vy: -40 - Math.random() * 30, life: 0.6, max: 0.6, col: 'rgba(230,246,255,0.9)', size: 2.5 + Math.random() * 2.5, grav: -20, kind: 'dot' }); } }
  }
  if (st.beach) { const bb = st.beach; bb.sqv = (bb.sqv || 0) + (-300 * (bb.sq || 0) - 12 * (bb.sqv || 0)) * dt; bb.sq = clamp((bb.sq || 0) + bb.sqv * dt, -0.25, 0.3); }
  if (st.shrink && G.match.phase === 'live') {
    st.crumbT -= dt;
    if (st.crumbT <= 0) { st.crumbT = 0.15; const ry = sumoRimY(); for (const s of [-1, 1]) puff(st.geo.cx + s * st.hw, ry + 8, 1, SUMO_SIDE); }
  }
  for (const e of st.vfx) e.t += dt;
  st.vfx = st.vfx.filter(e => e.t < e.d);
}

/* ---- drawing ---- */
function sumoArcCap(cx, cy, R, a) { ctx.beginPath(); ctx.arc(cx, cy, R, -Math.PI / 2 - a, -Math.PI / 2 + a); ctx.closePath(); }
function sumoDrawBackdrop() {
  const st = G.mst, wy = st.waterY;
  // a garden fence behind the pool
  ctx.fillStyle = 'rgba(224,168,104,0.55)';
  for (let x = 38; x < W - 38; x += 26) { ctx.beginPath(); ctx.moveTo(x, wy); ctx.lineTo(x, wy - 54); ctx.lineTo(x + 8, wy - 62); ctx.lineTo(x + 16, wy - 54); ctx.lineTo(x + 16, wy); ctx.closePath(); ctx.fill(); }
  ctx.fillStyle = 'rgba(154,98,54,0.35)'; ctx.fillRect(30, wy - 42, W - 60, 6); ctx.fillRect(30, wy - 20, W - 60, 6);
  // party bunting from wall to wall
  const cols = [C.pip, C.gold, C.bo, '#ff8fc7', C.grass];
  for (const [y0, sag, x0, x1] of [[88, 34, 30, W / 2], [88, 34, W / 2, W - 30]]) {
    ctx.strokeStyle = 'rgba(122,82,50,0.7)'; ctx.lineWidth = 1.5; ctx.beginPath();
    for (let i = 0; i <= 16; i++) { const f = i / 16, x = x0 + (x1 - x0) * f, y = y0 + sag * 4 * f * (1 - f); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
    ctx.stroke();
    for (let i = 1; i < 12; i++) {
      const f = i / 12, x = x0 + (x1 - x0) * f, y = y0 + sag * 4 * f * (1 - f), sw = Math.sin(G.clock * 2 + i + x0) * 1.5;
      ctx.fillStyle = cols[(i + (x0 > 100 ? 2 : 0)) % cols.length];
      ctx.beginPath(); ctx.moveTo(x - 8, y); ctx.lineTo(x + 8, y); ctx.lineTo(x + sw, y + 16); ctx.closePath(); ctx.fill();
    }
  }
}
function sumoDrawMat() {
  const st = G.mst, g = st.geo, P = st.P, R = g.R, ry = sumoRimY(), wy = st.waterY;
  const aFull = Math.asin(Math.min(1, P.hw / R)), a = Math.asin(Math.min(1, st.hw / R)), ct = P.capThick;
  // pedestal: a stone stem standing in the pool
  const top = ry + ct - 2;
  ctx.fillStyle = C.stoneEdge; ctx.fillRect(g.cx - 40, top, 80, H - T - top);
  ctx.fillStyle = C.stone; ctx.fillRect(g.cx - 32, top, 64, H - T - top);
  ctx.fillStyle = C.stoneLight; ctx.fillRect(g.cx - 32, top, 10, H - T - top);
  ctx.fillStyle = C.stoneEdge; rr(g.cx - 52, top - 2, 104, 10, 4); ctx.fill();
  // ... the part under water looks under water
  ctx.fillStyle = 'rgba(70,150,220,0.62)'; ctx.fillRect(g.cx - 40, wy, 80, H - T - wy);
  ctx.fillStyle = 'rgba(190,230,255,0.9)'; ctx.beginPath(); ctx.moveTo(g.cx - 40, wy + 4);
  for (let i = 0; i <= 8; i++) ctx.lineTo(g.cx - 40 + i * 10, wy + Math.sin(G.clock * 3 + i * 0.9) * 1.6);
  ctx.lineTo(g.cx + 40, wy + 4); ctx.closePath(); ctx.fill();
  // the lost part of the mat (squeeze): a ghost of what is gone
  if (st.hw < P.hw - 0.5) {
    const ry0 = st.cy - Math.sqrt(R * R - P.hw * P.hw);
    ctx.fillStyle = 'rgba(120,90,60,0.25)'; sumoArcCap(g.cx, st.cy, R, aFull); ctx.fill(); ctx.fillRect(g.cx - P.hw, ry0, P.hw * 2, ct * 0.6);
    ctx.setLineDash([5, 6]); ctx.strokeStyle = 'rgba(120,90,60,0.35)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(g.cx, st.cy, R, -Math.PI / 2 - aFull, -Math.PI / 2 + aFull); ctx.stroke(); ctx.setLineDash([]);
  }
  // side band (the clay drum), then the light clay top
  ctx.fillStyle = SUMO_SIDE; sumoArcCap(g.cx, st.cy + ct, R, a); ctx.fill(); ctx.fillRect(g.cx - st.hw, ry, st.hw * 2, ct);
  ctx.fillStyle = SUMO_SIDE_DK; ctx.fillRect(g.cx - st.hw, ry + ct - 4, st.hw * 2, 4);
  ctx.fillStyle = SUMO_CLAY; sumoArcCap(g.cx, st.cy, R, a); ctx.fill();
  ctx.save(); sumoArcCap(g.cx, st.cy, R, a); ctx.clip();
  ctx.fillStyle = SUMO_CLAY_HI; ctx.beginPath(); ctx.arc(g.cx, st.cy, R, -Math.PI / 2 - a, -Math.PI / 2 + a); ctx.arc(g.cx, st.cy, R - 7, -Math.PI / 2 + a, -Math.PI / 2 - a, true); ctx.fill();
  ctx.restore();
  // the straw ring line (tawara) and the two starting lines (shikiri-sen)
  ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(g.cx, st.cy, R - 4, -Math.PI / 2 - a * 0.92, -Math.PI / 2 + a * 0.92); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  for (const s of [-1, 1]) { const x = g.cx + s * 40; if (Math.abs(x - g.cx) < st.hw - 6) ctx.fillRect(x - 1.5, sumoSurfY(x) + 7, 3, 8); }
  // crumbling edge while the squeeze runs
  if (st.shrink) { ctx.fillStyle = 'rgba(141,83,41,0.6)'; for (const s of [-1, 1]) ctx.fillRect(g.cx + s * st.hw - (s > 0 ? 4 : 0), ry, 4, ct); }
  // straw bales at the rim
  if (st.lip > 0.5) for (const s of [-1, 1]) {
    const x = g.cx + s * st.hw, r = st.lip;
    ctx.fillStyle = C.rope; circle(x, ry, r); ctx.fill(); ctx.strokeStyle = C.ropeDark; ctx.lineWidth = 2; circle(x, ry, r); ctx.stroke();
    ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x - r * 0.55, ry - r * 0.45); ctx.lineTo(x + r * 0.55, ry - r * 0.15); ctx.moveTo(x - r * 0.55, ry + r * 0.15); ctx.lineTo(x + r * 0.55, ry + r * 0.45); ctx.stroke();
  }
}
// a soft shadow on the mat under a ball (shows where a jumping ball comes down)
function sumoShadow(x, y, r) {
  const st = G.mst, g = st.geo;
  if (Math.abs(x - g.cx) > st.hw) return;
  const sy = sumoSurfY(x), h = sy - (y + r);
  if (h < -4) return;
  const k = clamp(1 - h / 260, 0.25, 1);
  ctx.fillStyle = 'rgba(28,26,54,' + (0.2 * k).toFixed(3) + ')';
  ctx.beginPath(); ctx.ellipse(x, sy + 1, r * (0.55 + 0.45 * k), 3.5 * k + 1, 0, 0, Math.PI * 2); ctx.fill();
}
function sumoDrawBeach() {
  const st = G.mst, bb = st.beach; if (!bb) return;
  const m = G.match, arrowX = bb.inPool && bb.poolT > st.P.beachWait - 0.6 ? bb.nextX : bb.y + bb.r < 0 || (m.phase !== 'live' && m.phase !== 'end' && bb.wait <= 0 && bb.y < 0) ? bb.x : null;
  if (arrowX != null) { // where it drops in next: a little striped arrow under the clock
    const ay = hudBig() ? 96 : 80, bob = Math.sin(G.clock * 6) * 2;
    ctx.fillStyle = '#ff5f6d'; ctx.strokeStyle = 'rgba(28,26,54,0.6)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(arrowX - 9, ay + bob); ctx.lineTo(arrowX + 9, ay + bob); ctx.lineTo(arrowX, ay + 11 + bob); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  if (bb.wait > 0 || bb.y + bb.r < -2) return;
  ctx.save();
  if (bb.inPool) { ctx.beginPath(); ctx.rect(0, 0, W, st.waterY + 2); ctx.clip(); }
  else sumoShadow(bb.x, bb.y, bb.r);
  ctx.translate(bb.x, bb.y);
  const s = bb.sq || 0; ctx.scale(1 + s, 1 - s); ctx.translate(0, bb.r * s);
  ctx.save(); ctx.rotate(bb.spin);
  for (let i = 0; i < 6; i++) { ctx.fillStyle = SUMO_BEACH_COLS[i]; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, bb.r, i * Math.PI / 3, (i + 1) * Math.PI / 3); ctx.closePath(); ctx.fill(); }
  ctx.fillStyle = '#fff6e0'; circle(0, 0, 4); ctx.fill();
  ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.ellipse(-bb.r * 0.38, -bb.r * 0.42, bb.r * 0.28, bb.r * 0.16, -0.6, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(28,26,54,0.5)'; ctx.lineWidth = 2; circle(0, 0, bb.r); ctx.stroke();
  ctx.restore();
}
// a squash s along the unit axis (ax, ay), anchored at (px, py): R(t) S R(-t), so the ball squashes without turning
function sumoSquash(s, ax, ay, px, py) {
  if (Math.abs(s) < 0.002) return;
  const t = Math.atan2(-ax, ay);
  ctx.translate(px, py); ctx.rotate(t); ctx.scale(1 + s, 1 - s); ctx.rotate(-t); ctx.translate(-px, -py);
}
function sumoFace(b, col, dark) {
  const r = b.r, k = r / 18, lx = b.look * k, ey = -6 * k, m = G.match;
  const win = b.cheer > 0, sadF = b.sad > 0 && !win;
  ctx.save(); ctx.scale(k, k);
  const l = lx / k;
  if (b.out) { // squint > <
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (const s of [-1, 1]) { const ex = s * 5 + l; ctx.beginPath(); ctx.moveTo(ex - 3 * s, -9); ctx.lineTo(ex + 1.5 * s, -6); ctx.lineTo(ex - 3 * s, -3); ctx.stroke(); }
  } else if (b.dizzy > 0) {
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (const ex of [-5, 5]) { ctx.beginPath(); ctx.moveTo(ex - 2.5 + l, -8.5); ctx.lineTo(ex + 2.5 + l, -3.5); ctx.moveTo(ex + 2.5 + l, -8.5); ctx.lineTo(ex - 2.5 + l, -3.5); ctx.stroke(); }
  } else if (b.offT > 0 || b.teeter > 0) { // whoa: wide eyes, tiny pupils
    for (const ex of [-5, 5]) { ctx.fillStyle = '#fff'; circle(ex + l, -6.5, 4.6); ctx.fill(); ctx.fillStyle = C.ink; circle(ex + l, -6.5, 1.4); ctx.fill(); }
  } else if (win && m && m.phase === 'end') { // happy ^ ^
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    for (const ex of [-5, 5]) { ctx.beginPath(); ctx.arc(ex + l, -5, 3, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
  } else if (b.blink > 0) {
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (const ex of [-5, 5]) { ctx.beginPath(); ctx.moveTo(ex - 3 + l, -6); ctx.lineTo(ex + 3 + l, -6); ctx.stroke(); }
  } else {
    const focus = b.charging && b.holdT > 0.15;
    for (const ex of [-5, 5]) {
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(ex + l, -6, 3.6, focus ? 3.4 : 4.4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = C.ink; circle(ex + l + b.face, -5.5, 2); ctx.fill();
    }
    if (focus) { ctx.strokeStyle = dark; ctx.lineWidth = 2; ctx.lineCap = 'round'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 2 + l, -11); ctx.lineTo(s * 8.5 + l, -12.5 + (b.face === s ? 0 : 0)); ctx.stroke(); } }
  }
  // cheeks and mouth
  ctx.fillStyle = 'rgba(255,120,140,' + (b.heavy ? 0.7 : 0.45) + ')'; circle(-8.5 + l * 0.6, 0, b.heavy ? 3.2 : 2.4); ctx.fill(); circle(8.5 + l * 0.6, 0, b.heavy ? 3.2 : 2.4); ctx.fill();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
  const mx = l * 0.7;
  if (win && m && m.phase === 'end') { ctx.fillStyle = '#7a2a3a'; ctx.beginPath(); ctx.arc(mx, 0.5, 4, 0, Math.PI); ctx.closePath(); ctx.fill(); }
  else if (b.out || sadF) { ctx.beginPath(); ctx.arc(mx, 4, 3, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }
  else if (b.offT > 0 || b.teeter > 0) { ctx.beginPath(); ctx.ellipse(mx, 2, 2.4, 3, 0, 0, Math.PI * 2); ctx.stroke(); }
  else if (b.dizzy > 0) { ctx.beginPath(); ctx.moveTo(mx - 4, 1.5); ctx.quadraticCurveTo(mx - 2, -0.5, mx, 1.5); ctx.quadraticCurveTo(mx + 2, 3.5, mx + 4, 1.5); ctx.stroke(); }
  else if (b.heavy) { ctx.beginPath(); ctx.ellipse(mx, 1.5, 2.2, 1.6, 0, 0, Math.PI * 2); ctx.stroke(); }
  else if (b.charging && b.holdT > 0.15) { ctx.beginPath(); ctx.moveTo(mx - 3, 1.5); ctx.lineTo(mx + 3, 1.5); ctx.stroke(); }
  else if (b.dashT > 0 || b.rescue) { ctx.fillStyle = '#7a2a3a'; circle(mx, 1.5, 2.3); ctx.fill(); }
  else { ctx.beginPath(); ctx.arc(mx, -0.5, 2.6, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke(); }
  ctx.restore();
}
function sumoFloatie(b, front, ix, gold) { // one swim ring around the ball's waist (front or back half); gold ones sit lower
  const r = b.r, y = gold ? 11.5 + 6 * ix : 4, rx = gold ? r + 5 - 3 * ix : r + 4, ry = gold ? 5 - 0.5 * ix : 6;
  ctx.lineWidth = gold ? 5 : 6; ctx.lineCap = 'butt';
  const a0 = front ? 0 : Math.PI, a1 = front ? Math.PI : Math.PI * 2;
  ctx.strokeStyle = gold ? C.gold : '#ffffff'; if (!front) ctx.globalAlpha *= 0.85;
  ctx.beginPath(); ctx.ellipse(0, y, rx, ry, 0, a0, a1); ctx.stroke();
  ctx.strokeStyle = gold ? '#fff1b8' : '#ff5f6d'; ctx.setLineDash([6, 6]);
  ctx.beginPath(); ctx.ellipse(0, y, rx, ry, 0, a0, a1); ctx.stroke(); ctx.setLineDash([]);
  if (front) { ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(0, y - 1.5, rx - 2, ry - 2, 0, 0.25 * Math.PI, 0.6 * Math.PI); ctx.stroke(); }
  if (!front) ctx.globalAlpha /= 0.85;
}
function sumoFloatCounts(b) { // [plain floaties left, gold floaties left]
  const st = G.mst, gold = st.gold ? st.gold[b.id] : 0, gl = Math.min(gold, b.floats);
  return [b.floats - gl, gl];
}
function sumoDrawBall(b) {
  const st = G.mst, P = st.P, col = PCOL[b.id], dark = PDARK[b.id], r = b.r, m = G.match;
  if (b.y - r > H) return;
  ctx.save();
  if (b.out) { ctx.beginPath(); ctx.rect(0, 0, W, st.waterY + 2); ctx.clip(); }
  const ghost = b.ghost > 0 || b.rescue;
  if (ghost) ctx.globalAlpha = 0.5 + 0.3 * Math.sin(G.clock * 18);
  let sx = 0;
  const warn = b.charging && b.holdT >= P.tapT + P.chargeT + P.autoFire - 0.5;
  if (warn && !reduceMotion) sx = (Math.floor(G.clock * 30) % 2 ? 1.5 : -1.5);
  ctx.translate(b.x + sx, b.y);
  // off balance (a tap that hit nothing) or teetering at the rim (the edge grip stopped you): a wobble about the bottom
  const wob = b.out ? 0 : (b.offT > 0 ? 0.3 * clamp(b.offT / P.offBal, 0, 1) : 0) + (b.teeter > 0 ? 0.12 : 0);
  if (wob > 0) { const a = Math.sin(G.clock * 34) * wob; ctx.translate(0, r); ctx.rotate(a); ctx.translate(0, -r); }
  // squash: heavy / planted (bottom stays on the mat), then the springy wobble
  const planted = sumoPlanted(b);
  const s0 = b.heavy ? 0.12 : planted ? 0.05 + 0.05 * b.charge : 0;
  const nX = b.onMat ? b.nx : 0, nY = b.onMat ? b.ny : -1;
  sumoSquash(s0, nX, nY, -nX * r, -nY * r);
  sumoSquash(b.sq, b.sqX, b.sqY, b.sqBot && b.onMat ? -b.nx * r : 0, b.sqBot && b.onMat ? -b.ny * r : 0);
  const [fl, gl] = sumoFloatCounts(b);
  // back halves of the floaties
  if (!b.out) { for (let i = 0; i < fl; i++) sumoFloatie(b, false, i, false); for (let i = 0; i < gl; i++) sumoFloatie(b, false, i, true); }
  // Bo's round ears / Pip's sprout (they sit on top, they don't roll)
  if (b.id === 1) { ctx.fillStyle = col; ctx.strokeStyle = dark; ctx.lineWidth = 2; for (const s of [-1, 1]) { circle(s * r * 0.62, -r * 0.8, r * 0.3); ctx.fill(); ctx.stroke(); } }
  else { ctx.strokeStyle = '#3f8f5c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -r + 1); ctx.lineTo(1, -r - 6); ctx.stroke(); ctx.fillStyle = '#5cc27f'; ctx.beginPath(); ctx.ellipse(5.5, -r - 8, 6.5, 3.2, -0.5, 0, Math.PI * 2); ctx.fill(); }
  // body
  ctx.fillStyle = b.heavy ? dark : col; circle(0, 0, r); ctx.fill();
  ctx.save(); circle(0, 0, r); ctx.clip();
  // the sumo belt (mawashi) rolls with the ball: that's what shows the spin
  ctx.save(); ctx.rotate(b.spin); ctx.fillStyle = b.heavy ? 'rgba(28,26,54,0.45)' : dark; ctx.fillRect(-r, r * 0.3, r * 2, 6);
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(-r, r * 0.3, r * 2, 1.5); ctx.restore();
  ctx.fillStyle = 'rgba(28,26,54,0.14)'; ctx.beginPath(); ctx.arc(r * 0.25, r * 0.3, r, 0, Math.PI * 2); ctx.arc(0, 0, r + 1, 0, Math.PI * 2, true); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.32)'; ctx.beginPath(); ctx.ellipse(-r * 0.4, -r * 0.45, r * 0.32, r * 0.2, -0.6, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = dark; ctx.lineWidth = 2.5; circle(0, 0, r); ctx.stroke();
  sumoFace(b, col, dark);
  if (!b.out && (b.offT > 0 || b.teeter > 0 || (b.tapRun >= 2 && b.cool > 0.15))) { // a sweat drop: whoa / careful / tired
    const dx = -b.face * r * 0.78, dy = -r * 0.62;
    ctx.fillStyle = '#9fdcff'; ctx.strokeStyle = 'rgba(28,26,54,0.45)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(dx, dy - 6); ctx.quadraticCurveTo(dx + 4, dy, dx, dy + 3); ctx.quadraticCurveTo(dx - 4, dy, dx, dy - 6); ctx.fill(); ctx.stroke();
  }
  // front halves of the floaties
  if (!b.out) { for (let i = 0; i < fl; i++) sumoFloatie(b, true, i, false); for (let i = 0; i < gl; i++) sumoFloatie(b, true, i, true); }
  ctx.restore();
  if (b.out) { ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(b.x, st.waterY + 2, r + 5 + Math.sin(G.clock * 4) * 1.5, 3.5, 0, 0, Math.PI * 2); ctx.stroke(); }
  if (ghost && !b.out) { // the rescue bubble
    ctx.save(); ctx.strokeStyle = 'rgba(190,232,255,0.8)'; ctx.lineWidth = 2; circle(b.x, b.y, r + 5); ctx.stroke();
    ctx.fillStyle = 'rgba(190,232,255,0.16)'; circle(b.x, b.y, r + 5); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(b.x, b.y, r + 1.5, -2.4, -1.7); ctx.stroke(); ctx.restore();
  }
  if (b.dizzy > 0 && !b.out) { // stars
    ctx.fillStyle = C.gold;
    for (let i = 0; i < 3; i++) { const a = G.clock * 8 + i * 2.1; sumoStar(b.x + Math.cos(a) * (r + 4), b.y - r - 4 + Math.sin(a) * 4, 3.4); }
  }
  if (b.dashT > 0 && !b.out) { // speed lines
    const d = -Math.sign(b.vx || b.face); ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (const [oy, len] of [[-8, 16], [0, 22], [8, 16]]) { ctx.beginPath(); ctx.moveTo(b.x + d * (r + 4), b.y + oy); ctx.lineTo(b.x + d * (r + 4 + len), b.y + oy); ctx.stroke(); }
  }
  if (b.charging && b.holdT > P.tapT) { // charge ring (C2, radius r + 8)
    const R2 = r + 8, full = b.charge >= 1;
    ctx.strokeStyle = 'rgba(28,26,54,0.35)'; ctx.lineWidth = 3; circle(b.x, b.y, R2); ctx.stroke();
    ctx.strokeStyle = warn ? (Math.floor(G.clock * 20) % 2 ? '#fff' : C.gold) : full ? (b.fullT >= 0 && b.fullT < 0.1 ? '#fff' : C.gold) : col;
    ctx.beginPath(); ctx.arc(b.x, b.y, R2, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * b.charge); ctx.stroke();
    if (full) { ctx.fillStyle = 'rgba(255,197,61,0.18)'; circle(b.x, b.y, R2 + 4); ctx.fill(); }
  }
  if (b.y + r < 0) { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(b.x, 6); ctx.lineTo(b.x - 7, 16); ctx.lineTo(b.x + 7, 16); ctx.closePath(); ctx.fill(); }
}
function sumoStar(x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr2 = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); }
  ctx.closePath(); ctx.fill();
}
function sumoDrawVfx(top) {
  for (const e of G.mst.vfx) {
    const f = e.t / e.d;
    if (!top && e.kind === 'ripple') {
      const rx = (10 + 70 * f) * (e.s || 1);
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.85 * (1 - f)).toFixed(3) + ')'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.ellipse(e.x, e.y, rx, rx * 0.2, 0, 0, Math.PI * 2); ctx.stroke();
    } else if (!top && e.kind === 'shock') {
      const rx = 12 + 95 * Math.sqrt(f);
      ctx.strokeStyle = 'rgba(141,83,41,' + (0.75 * (1 - f)).toFixed(3) + ')'; ctx.lineWidth = 4 * (1 - f) + 1.5;   // a dusty clay shock ring
      ctx.beginPath(); ctx.ellipse(e.x, e.y + 1, rx, 4 + 6 * f, 0, Math.PI, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.8 * (1 - f)).toFixed(3) + ')'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(e.x, e.y - 1, rx * 0.8, 3 + 5 * f, 0, Math.PI, Math.PI * 2); ctx.stroke();
    } else if (top && e.kind === 'ring') {
      ctx.strokeStyle = e.col; ctx.globalAlpha = 1 - f; ctx.lineWidth = 2.5; circle(e.x, e.y, e.r0 + (e.r1 - e.r0) * f); ctx.stroke(); ctx.globalAlpha = 1;
    } else if (top && e.kind === 'star') {
      const s = (8 + 14 * e.s) * (f < 0.4 ? f / 0.4 : 1);
      ctx.globalAlpha = f < 0.5 ? 1 : 2 * (1 - f);
      ctx.fillStyle = '#fff'; sumoStar(e.x, e.y, s); ctx.fillStyle = C.gold; sumoStar(e.x, e.y, s * 0.45); ctx.globalAlpha = 1;
    } else if (top && e.kind === 'popring') { // the popped floatie flies apart
      ctx.globalAlpha = 1 - f; ctx.strokeStyle = e.col; ctx.lineWidth = 5; ctx.lineCap = 'round';
      for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + 0.3, rr2 = e.r * (1 + 1.4 * f); ctx.beginPath(); ctx.ellipse(e.x, e.y, rr2, rr2 * 0.45, 0, a, a + 0.45); ctx.stroke(); }
      ctx.globalAlpha = 1;
    } else if (top && e.kind === 'pop') {
      ctx.globalAlpha = f < 0.7 ? 1 : (1 - f) / 0.3; bigText(e.txt || 'Pop!', e.x, e.y - 24 * f, 18, e.col, 0.8 + 0.4 * Math.min(1, f * 5)); ctx.globalAlpha = 1;
    }
  }
}
function sumoTag(b) {
  const x = b.x, y = b.y - b.r - 14;
  ctx.fillStyle = PCOL[b.id]; rr(x - 18, y - 8, 36, 16, 8); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x - 4, y + 8); ctx.lineTo(x + 4, y + 8); ctx.lineTo(x, y + 12); ctx.fill();
  text(NAMES[b.id], x, y, 11, '#fff', 'center', 'body');
}
function sumoRing(x, y, r, col, lw) { ctx.strokeStyle = col; ctx.lineWidth = lw; circle(x, y, r); ctx.stroke(); }

MODES.sumo = {
  rand: Math.random,
  testOver: null, testTwist: null,   // test hooks: an object merged over st.P every round / a twist key forced every round
  setup(st, L) {
    const d = Object.assign({ cx: 480, top: 348, R: 700 }, L.def.sumo || {});
    st.geo = d; st.cy = d.top + d.R;
    let wy = H; for (let y = 0; y < ROWS; y++) if (L.grid[y].includes('w')) { wy = y * T + 6; break; }
    st.waterY = wy;
    st.stat = { saves: [0, 0], offs: [0, 0], bumps: [0, 0], best: [0, 0], slams: [0, 0], boings: [0, 0], full: [0, 0], hops: [0, 0], oops: [0, 0] };
    const mix = SUMO_MIX.slice();
    for (let i = mix.length - 1; i > 0; i--) { const j = Math.floor(this.rand() * (i + 1)); [mix[i], mix[j]] = [mix[j], mix[i]]; }
    st.order = ['classic', ...mix, 'tiny'];
    st.over = this.testOver || null; st.forceTwist = this.testTwist || null;
    st.fx = []; st.vfx = [];
  },
  resetRound(n, info) {
    const st = G.mst, m = G.match;
    st.twist = info.suddenDeath ? 'sudden' : (st.forceTwist || st.order[Math.min(n, st.order.length) - 1]);
    st.P = Object.assign({}, SUMO, SUMO_TWISTS[st.twist].P, st.over || {});
    st.hw = st.P.hw; st.lip = st.P.lipR; st.squeeze = 0; st.shrink = false; st.rbumps = [0, 0]; st.rsplash = [0, 0]; st.oopsLeft = [st.P.oops, st.P.oops];
    st.squeezeSaid = false; st.goldSaid = false; st.cheer = null; st.crumbT = 0; st.sndBump = 0; st.fx = []; st.vfx = [];
    const lead = m.wins[0] - m.wins[1];
    st.b = [0, 1].map(k => sumoMakeBall(k));
    const deficit = [Math.max(0, -lead), Math.max(0, lead)];
    st.gold = [0, 0];
    if (!info.suddenDeath && st.P.goldFloats) for (const k of [0, 1]) { const extra = deficit[k] >= st.P.goldMin ? Math.min(st.P.goldMax, deficit[k] - st.P.goldMin + 1) : 0; st.gold[k] = extra; st.b[k].floats += extra; }
    st.beach = st.P.beach ? { x: st.geo.cx, y: -40, vx: 0, vy: 0, r: st.P.beachR, spin: 0, wait: 0, inPool: false, poolT: 0, nextX: st.geo.cx, nextVx: 0, sq: 0, sqv: 0 } : null;
    for (const p of G.players) Object.assign(p, { alive: false, respawnT: Infinity });
  },
  go() { const st = G.mst; if (st.beach) { st.beach.vx = (this.rand() * 2 - 1) * 80; Sfx.play('sumoBeachIn'); } },
  step(dt) {
    const st = G.mst;
    if (st.sawPause) { st.sawPause = false; for (const b of st.b) if (b.charging && !G.players[b.id].input.act) { b.charging = false; b.charge = 0; b.holdT = 0; } }
    sumoTick(dt, true);
    sumoFxRun(); sumoLooks(dt);
  },
  idle(dt) {
    const st = G.mst, m = G.match; if (!st.b) return;
    if (m.phase === 'end') {
      if (!st.cheer && m.end) sumoRoundOver(m.end.winner);   // a round the framework ended (time's up): celebrate too
      sumoTick(dt, false);
      const c = st.cheer;
      if (c && c.w >= 0) {
        const b = st.b[c.w];
        // two little happy hops (small, so the winner stays in sight under the round banner)
        if (c.hop < 2 && m.t >= 0.25 + 0.55 * c.hop && b.onMat && !b.out && Math.abs(b.x - st.geo.cx) < st.hw - 24) { c.hop++; b.vy = -300; b.onMat = false; b.sqX = b.nx; b.sqY = b.ny; b.sqBot = true; b.sqv = -4; puff(b.x, b.y + b.r, 3, '#fff'); }
        if (m.end && m.end.final && (c.conf === 0 || (c.conf === 1 && m.t >= 0.6))) { c.conf++; for (let k = 0; k < 30; k++) confetti(b.x, b.y - 20); }
      }
      sumoFxRun();
    }
    if (m.phase === 'count' && !st.goldSaid && m.t >= 0.05) {
      st.goldSaid = true;
      for (const k of [0, 1]) if (st.gold[k] > 0) { Sfx.play('sumoGold', k); const b = st.b[k]; burst(b.x, b.y + 10, C.gold, 10); b.sqv = -3; }
    }
    sumoLooks(dt);
  },
  timeUp() {
    const st = G.mst, rb = st.rbumps, rs = st.rsplash;
    if (rs[0] !== rs[1]) return { winner: rs[0] < rs[1] ? 0 : 1, reason: 'Fewer splashes!' };
    if (rb[0] !== rb[1]) return { winner: rb[0] > rb[1] ? 0 : 1, reason: 'More big bumps!' };
    const d = st.b.map(b => Math.abs(b.x - st.geo.cx));
    if (Math.abs(d[0] - d[1]) < 6) return { winner: -1, reason: 'Dead even!' };
    return { winner: d[0] < d[1] ? 0 : 1, reason: 'Closer to the middle!' };
  },
  tiebreak() {
    const s = G.mst.stat.bumps; if (s[0] === s[1]) return -1;
    return { winner: s[0] > s[1] ? 0 : 1, reason: 'Most big bumps this match!' };
  },
  draw() {
    const st = G.mst; if (G.mode === 'paused') st.sawPause = true; if (!st.b) return;
    sumoDrawBackdrop();
    sumoDrawMat();
    sumoDrawVfx(false);
    for (const b of st.b) if (!b.out) sumoShadow(b.x, b.y, b.r);
    sumoDrawBeach();
  },
  drawTop() {
    const st = G.mst, m = G.match; if (!st.b) return;
    // the ball in front: the one that moved last... keep it simple: an out ball first, then a ghost, then the others
    const order = st.b.slice().sort((a, c) => (a.out ? 0 : a.ghost > 0 ? 1 : 2) - (c.out ? 0 : c.ghost > 0 ? 1 : 2));
    for (const b of order) sumoDrawBall(b);
    sumoDrawVfx(true);
    // name tags: fade in as the intro card fades out (the card sits right over the balls), then through ready + count
    const tagA = G.introT > 0 ? 1 - clamp(G.introT / 0.5, 0, 1) : m && (m.phase === 'ready' || m.phase === 'count') ? 1 : 0;
    if (tagA > 0) { ctx.globalAlpha = tagA; for (const b of st.b) sumoTag(b); ctx.globalAlpha = 1; }
    if (m && m.phase === 'count' && m.t < 0.9) for (const b of st.b) if (st.gold[b.id] > 0) {
      const k = m.t / 0.9; ctx.globalAlpha = 1 - k * k; bigText(st.gold[b.id] > 1 ? 'Gold floaties!' : 'Gold floatie!', b.x, b.y - b.r - 40 - 30 * k, 17, C.gold); ctx.globalAlpha = 1;
    }
  },
  hud() {
    const st = G.mst, m = G.match; if (!st.b) return;
    const big = hudBig(), tw = SUMO_TWISTS[st.twist], P = st.P;
    // twist pill, top left under the level pill (twist rounds only)
    if (st.twist !== 'classic') {
      const fs = big ? 20 : 13, h = big ? 36 : 26, y = big ? 48 : 46;
      ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
      const w = ctx.measureText(tw.name).width + 28; pill(14, y, w, h); text(tw.name, 28, y + h / 2 + 0.5, fs, C.gold, 'left', 'body');
    }
    // twist card, every round, while "Round N" and 3-2-1 show (at y 384: at 284 it would cover the balls)
    if (m.phase === 'ready' || m.phase === 'count') {
      const nf = big ? 34 : 26, hf = big ? 20 : 14, ch = big ? 80 : 60, cy = big ? 380 : 384;
      ctx.font = '700 ' + hf + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
      const w = Math.max(300, ctx.measureText(tw.hint).width + 48);
      ctx.globalAlpha = m.phase === 'ready' ? clamp(m.t / 0.25, 0, 1) : 1;
      ctx.fillStyle = 'rgba(28,26,54,0.82)'; rr(W / 2 - w / 2, cy, w, ch, 16); ctx.fill();
      text(tw.name, W / 2, cy + ch * 0.35, nf, C.gold, 'center'); text(tw.hint, W / 2, cy + ch * 0.77, hf, C.paper, 'center', 'body');
      ctx.globalAlpha = 1;
    }
    // top-right alert chip: the squeeze
    let chip = null;
    if (m.phase === 'live') {
      if (P.squeezeAt > 0 && m.roundT >= P.squeezeAt - 3 && m.roundT < P.squeezeAt) chip = 'Squeeze in ' + Math.ceil(P.squeezeAt - m.roundT) + '…';
      else if (st.shrink) chip = 'Squeeze!';
    }
    if (chip) {
      const fs = big ? 22 : 15, h = big ? 40 : 28;
      ctx.font = fs + 'px "Lilita One", "Arial Rounded MT Bold", sans-serif';
      const w = ctx.measureText(chip).width + 30, x = pill(W - 14, 12, w, h, 'right');
      const pulse = st.squeeze > 0 ? 0.5 + 0.5 * Math.sin(G.clock * 8) : 0;
      if (pulse) { ctx.strokeStyle = 'rgba(255,197,61,' + (0.35 + 0.4 * pulse).toFixed(3) + ')'; ctx.lineWidth = 2; rr(x, 12, w, h, h / 2); ctx.stroke(); }
      text(chip, x + w / 2, 12 + h / 2 + 0.5, fs, C.gold, 'center');
    }
    // floatie panels over the stone floor: name + one ring per floatie this round (gold ones pop first)
    for (const k of [0, 1]) {
      const b = st.b[k], gold = st.gold[k], total = P.floats + gold, [fl, gl] = sumoFloatCounts(b);
      const h = big ? 34 : 24, y = big ? 500 : 512, fs = big ? 18 : 13, ir = big ? 10 : 7, lw = big ? 5 : 4, gap = ir * 2 + 8;
      ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
      const many = total > 4, nw = ctx.measureText(NAMES[k]).width, w = 16 + nw + 10 + (many ? gap + fs * 1.8 : Math.max(1, total) * gap) + 4;   // (only test setups have more than 3)
      const x0 = pill(k ? W - 14 : 14, y, w, h, k ? 'right' : 'left');
      text(NAMES[k], k ? x0 + w - 14 : x0 + 14, y + h / 2 + 0.5, fs, PCOL[k], k ? 'right' : 'left', 'body');
      if (!total) { text('–', k ? x0 + 14 + ir : x0 + w - 14 - ir, y + h / 2, fs, 'rgba(246,239,223,0.5)', 'center', 'body'); continue; }
      if (many) {
        const cx = k ? x0 + w - 14 - nw - 10 - ir : x0 + 14 + nw + 10 + ir, cy = y + h / 2;
        sumoRing(cx, cy, ir, gl ? C.gold : '#fff', lw); ctx.save(); ctx.setLineDash([ir * 0.9, ir * 0.9]); sumoRing(cx, cy, ir, gl ? '#fff6d0' : '#ff5f6d', lw); ctx.restore();
        text('×' + (fl + gl), k ? cx - ir - 4 : cx + ir + 4, cy + 0.5, fs, C.paper, k ? 'right' : 'left', 'body'); continue;
      }
      for (let i = 0; i < total; i++) {
        // icon i: plain ones first, then gold, from the name outward; popped = faded
        const isGold = i >= P.floats, left = isGold ? (i - P.floats) < gl : i < fl;
        const cx = k ? x0 + w - 14 - nw - 10 - ir - i * gap : x0 + 14 + nw + 10 + ir + i * gap, cy = y + h / 2;
        if (!left) { sumoRing(cx, cy, ir, 'rgba(255,255,255,0.25)', lw); continue; }
        sumoRing(cx, cy, ir, isGold ? C.gold : '#fff', lw);
        ctx.save(); ctx.setLineDash([ir * 0.9, ir * 0.9]); sumoRing(cx, cy, ir, isGold ? '#fff6d0' : '#ff5f6d', lw); ctx.restore();
      }
    }
  },
  stats() {
    const s = G.mst.stat;
    const tiles = [{ label: 'Knock-offs', values: s.offs.slice() }, { label: 'Big bumps', values: s.bumps.slice() }, { label: 'Super boings', values: s.full.slice() }, { label: 'Slams', values: s.slams.slice() }];
    const out = tiles.filter((t, i) => i < 2 || t.values[0] + t.values[1] > 0);
    out.push('Floaties popped: Pip ' + s.saves[0] + ' · Bo ' + s.saves[1]);
    return out;
  },
};
Sfx.extra.sumoBump = function () { this.tone(240, 0.08, 'sine', 0.07, 150); };
Sfx.extra.sumoBig = function () { this.tone(170, 0.18, 'sine', 0.1, 80); this.tone(720, 0.05, 'square', 0.03, 300); };
Sfx.extra.sumoBoingBig = function (p) { this.tone(130 * p, 0.3, 'sine', 0.09, 600 * p); this.tone(260 * p, 0.18, 'triangle', 0.04, 900 * p, 0.05); };
Sfx.extra.sumoFull = function (p) { this.tone(1320 * p, 0.1, 'triangle', 0.05); this.tone(1760 * p, 0.12, 'triangle', 0.04, null, 0.05); };
Sfx.extra.sumoDizzy = function (p) { this.tone(880 * p, 0.1, 'sine', 0.03, 620 * p); this.tone(660 * p, 0.12, 'sine', 0.03, 990 * p, 0.09); };
Sfx.extra.sumoHeavy = function (p) { this.tone(110 * p, 0.12, 'square', 0.04, 70 * p); };
Sfx.extra.sumoSlam = function () { this.tone(85, 0.28, 'triangle', 0.1, 40); this.tone(380, 0.06, 'square', 0.04, 110); };
Sfx.extra.sumoHop = function (p) { this.tone(520 * p, 0.08, 'triangle', 0.045, 880 * p); };
Sfx.extra.sumoSave = function (p) { this.tone(392 * p, 0.1, 'triangle', 0.06, 523 * p); this.tone(659 * p, 0.14, 'triangle', 0.05, 784 * p, 0.09); };
Sfx.extra.sumoBlub = function (p) { [0, 0.11, 0.22].forEach((d, i) => this.tone((330 - 70 * i) * p, 0.07, 'sine', 0.05, null, d)); };
Sfx.extra.sumoSqueeze = function () { this.tone(320, 0.3, 'sawtooth', 0.03, 160); this.tone(160, 0.35, 'triangle', 0.06, 90, 0.08); };
Sfx.extra.sumoBeach = function () { this.tone(400, 0.09, 'sine', 0.06, 280); };
Sfx.extra.sumoBeachIn = function () { this.tone(1400, 0.45, 'sine', 0.025, 600); };
Sfx.extra.sumoWhoa = function (p) { this.tone(500 * p, 0.07, 'triangle', 0.035, 380 * p); this.tone(430 * p, 0.09, 'triangle', 0.03, 300 * p, 0.07); };
Sfx.extra.sumoOops = function (p) { this.tone(700 * p, 0.12, 'sine', 0.05, 350 * p); this.tone(520 * p, 0.16, 'sine', 0.045, 780 * p, 0.12); };
Sfx.extra.sumoGold = function (p) { [784, 988, 1319].forEach((f, i) => this.tone(f * p, 0.1, 'triangle', 0.05, null, i * 0.07)); };
/* ===== end Sumo Bounce ===== */

