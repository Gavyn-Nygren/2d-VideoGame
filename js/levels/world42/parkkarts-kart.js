/* Pip & Bo - 42-4 Go-Kart Grand Prix: how a kart drives. Plain JavaScript, always loaded (the rules, the computer
   opponent and the bot tests use it with drawing switched off). The models are in parkkarts-kart3d.js.

   A kart is a point with a heading (yaw: radians about Y, 0 = toward +Z, the forward way is (sin yaw, cos yaw)), a
   forward speed v and a push (a sideways shove from a bump that fades). It drives forward by itself up to top speed.
     STEER    the stick (or ◀ ▶): turns it at a rate that falls with speed (grip). Left is always left on screen: a kart
              facing back down the road has its steering turned round.
     BRAKE    pull the stick back (or ▼).
     DRIFT    hold jump while steering above S.DRIFT_V: a hop, the tail kicks out and it turns tighter than it can
              steer (the stick picks how tight, from wide to sharp). Sparks: yellow after S.SPARK1 s, pink after S.SPARK2.
              Let go: a boost (S.BOOST1 or S.BOOST2 s). Boosts within S.CHAIN s of each other make a chain.
     WALLS    the road's edge (tyres, bales): the kart is held inside and the part of its heading into the wall is
              bounced off with a loss of speed (less while drifting: it scrapes along). Never a dead stop.
     VERGE    beyond the tarmac (grass, sand, wet boards): top speed S.VERGE.
     PADS     boost pads in the road: a short boost.
     SLIPSTREAM  close behind another kart (anyone's, the robots' too) for S.SLIP_T s: wind lines and top speed
              x S.SLIP_K while it lasts. It only ever helps the one behind.
     CRANE    stopped, or facing the wrong way, for S.STUCK_T s: the wind-up crane lifts it (S.CRANE_T s) and sets it
              on the road facing the right way, rolling.
   PARKKARTS_KART.make(id, s, lat)   a fresh kart on the road
   PARKKARTS_KART.step(k, inp, dt, o)  one physics step. inp = { steer -1..1, brake, drift (held), }; o = { mul: extra
              top-speed factor (prizes), noSteer }
   PARKKARTS_KART.bump(a, b, o)       two karts touching: pushed apart, the faster or heavier winning by a little
   PARKKARTS_KART.place(k, s, lat, v) put a kart on the road (the crane, the rolling restart) */
'use strict';

const PARKKARTS_KART = (function () {
  const TR = PARKKARTS_TRACK;
  const S = {
    VMAX: 13.5, ACC: 7.5, ACC_BOOST: 22, DEC: 6, BRAKE: 18, GRIP: 16, YAW_MAX: 2.4,
    DRIFT_V: 6, DRIFT_MIN: 0.8, DRIFT_RANGE: 1.25, DRIFT_SLOW: 0.965, HOP_T: 0.2,
    SPARK1: 0.45, SPARK2: 1.1, BOOST1: 0.7, BOOST2: 1.3, BOOST_K: 1.3, CHAIN: 2.2,
    VERGE: 0.6, PAD_T: 0.9,
    SLIP_T: 1.5, SLIP_K: 1.12, SLIP_D: 8, SLIP_W: 1.7, SLIP_HOLD: 0.8,
    R: 0.75, WALL_E: 0.3, WALL_LOSS: 0.5, WALL_LOSS_DRIFT: 0.18,
    STUCK_V: 1.5, STUCK_T: 2.0, WRONG: -0.25, CRANE_T: 1.4, CRANE_V: 7,
  };
  const KK = { S };
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const sgn = x => (x > 0 ? 1 : x < 0 ? -1 : 0);

  KK.make = function (id, s, lat) {
    const k = { id, x: 0, z: 0, yaw: 0, v: 0, px: 0, pz: 0, on: -1, s: 0, lat: 0, bs: 0, lap: 0, prog: 0,
      drift: 0, driftT: 0, hopT: 0, spark: 0, boostT: 0, boost: 0, padT: 0, chain: 0, bestChain: 0, lastBoost: -9, boosts: 0,
      slipC: 0, slipOn: 0, slipping: false, wallT: 0, walls: 0, verge: false, stuckT: 0, wrongT: 0, crane: null, cranes: 0,
      steer: 0, steerOut: 0, braking: false, t: 0, surf: 'road', heavy: 1 };
    KK.place(k, s, lat, 0);
    return k;
  };
  KK.place = function (k, s, lat, v) {
    const f = TR.at(s);
    k.x = f.x + f.rx * lat; k.z = f.z + f.rz * lat; k.yaw = f.yaw; k.v = v || 0; k.px = k.pz = 0;
    k.on = -1; k.s = TR.wrap(s); k.lat = lat; k.drift = 0; k.driftT = 0; k.spark = 0; k.stuckT = 0; k.wrongT = 0;
    // the lap count follows the place (so progress stays continuous: the caller passes a progress-based s when needed)
  };
  // progress: laps * L + s, kept continuous as s wraps
  function track(k, s) {
    const L = TR.L;
    if (k.s > L * 0.75 && s < L * 0.25) k.lap++;
    else if (k.s < L * 0.25 && s > L * 0.75) k.lap--;
    k.s = s; k.prog = k.lap * L + s;
  }
  KK.track = track;

  KK.step = function (k, inp, dt, o = {}) {
    k.t += dt;
    k.hopT = Math.max(0, k.hopT - dt); k.wallT = Math.max(0, k.wallT - dt); k.padT = Math.max(0, k.padT - dt);
    if (k.crane) return;
    const f0 = TR.at(k.s);
    const fx = Math.sin(k.yaw), fz = Math.cos(k.yaw);
    const facing = fx * f0.tx + fz * f0.tz;
    // left is always left on screen: turned round, the steering turns round too
    let steer = clamp(inp.steer || 0, -1, 1);
    if (facing < 0) steer = -steer;
    if (o.noSteer) steer = 0;
    k.steer = steer;
    // drifting: starts with jump held while steering at speed; lasts while held
    if (inp.drift && !k.drift && Math.abs(steer) > 0.3 && k.v > S.DRIFT_V && !o.noDrift) { k.drift = sgn(steer); k.driftT = 0; k.hopT = S.HOP_T; k.spark = 0; k.drifts = (k.drifts || 0) + 1; }
    if (k.drift && (!inp.drift || k.v < S.DRIFT_V * 0.6 || o.noDrift)) {
      // let go: the boost (a kart knocked out of its drift by a hit gets none)
      if (inp.drift === false && !o.noDrift && k.spark > 0) {
        const t = k.spark === 2 ? S.BOOST2 : S.BOOST1;
        k.boostT = Math.max(k.boostT, t); k.boost = k.spark;
        k.chain = k.t - k.lastBoost < t + S.CHAIN ? k.chain + 1 : 1; k.bestChain = Math.max(k.bestChain, k.chain); k.lastBoost = k.t; k.boosts++;
        k.boostedAt = k.t;
      }
      k.drift = 0; k.driftT = 0; k.spark = 0;
    }
    let w;
    if (k.drift) {
      k.driftT += dt;
      k.spark = k.driftT >= S.SPARK2 ? 2 : k.driftT >= S.SPARK1 ? 1 : 0;
      const u = clamp((steer * k.drift + 1) / 2, 0, 1);
      w = -k.drift * (S.DRIFT_MIN + S.DRIFT_RANGE * u);
    } else {
      w = -steer * Math.min(S.YAW_MAX, S.GRIP / Math.max(2.5, k.v)) * clamp(k.v / 2.5, 0.25, 1);
    }
    if (o.wobble) w += o.wobble;
    k.yaw += w * dt;
    k.yaw = Math.atan2(Math.sin(k.yaw), Math.cos(k.yaw));
    // speed
    k.boostT = Math.max(0, k.boostT - dt);
    let vt = S.VMAX * (o.mul || 1);
    if (k.verge) vt *= S.VERGE;
    if (k.boostT > 0 || k.padT > 0) vt *= S.BOOST_K;
    if (k.slipOn > 0) vt *= S.SLIP_K;
    if (k.drift) vt *= S.DRIFT_SLOW;
    k.braking = !!inp.brake;
    if (inp.brake) k.v = Math.max(0, k.v - S.BRAKE * dt);
    else if (k.v < vt) k.v = Math.min(vt, k.v + (k.boostT > 0 || k.padT > 0 ? S.ACC_BOOST : S.ACC * (k.v < 4 ? 1.4 : 1)) * dt);
    else k.v = Math.max(vt, k.v - S.DEC * dt);
    // move
    const nx = Math.sin(k.yaw), nz = Math.cos(k.yaw);
    k.x += (nx * k.v + k.px) * dt; k.z += (nz * k.v + k.pz) * dt;
    const pd = Math.exp(-5 * dt); k.px *= pd; k.pz *= pd;
    contain(k);
    // the surface under it
    const wh = k.where;
    k.verge = Math.abs(k.lat) > wh.hw + 0.05 && wh.on < 0;
    if (wh.on < 0) for (const pd2 of TR.pads) if (k.s > pd2.s0 && k.s < pd2.s1 && Math.abs(k.lat - pd2.lat) < pd2.w) { if (k.padT <= 0) k.padHit = k.t; k.padT = S.PAD_T; }
    // stuck or turned round: the crane comes
    const f = TR.at(k.s);
    const face2 = Math.sin(k.yaw) * f.tx + Math.cos(k.yaw) * f.tz;
    k.stuckT = k.v < S.STUCK_V ? k.stuckT + dt : 0;
    k.wrongT = face2 < S.WRONG ? k.wrongT + dt : 0;
    if (k.stuckT >= S.STUCK_T || k.wrongT >= S.STUCK_T) KK.craneStart(k, k.wrongT >= S.STUCK_T ? 'wrong' : 'stuck');
  };
  // held inside the roads; the heading into a wall bounced off
  function contain(k) {
    let wh = TR.where(k.x, k.z, k.s, k.on);
    const lim = wh.w - S.R;
    if (Math.abs(wh.lat) > lim) {
      const side = sgn(wh.lat), f = wh.f, nx = f.rx * side, nz = f.rz * side;
      const over = Math.abs(wh.lat) - lim;
      k.x -= nx * over; k.z -= nz * over;
      const fx = Math.sin(k.yaw), fz = Math.cos(k.yaw), dn = fx * nx + fz * nz;
      if (dn > 0) {
        let gx = fx - (1 + S.WALL_E) * dn * nx, gz = fz - (1 + S.WALL_E) * dn * nz;
        // never bounced round past the road's own direction (no spinning off a wall)
        const l = Math.hypot(gx, gz) || 1; gx /= l; gz /= l;
        k.yaw = Math.atan2(gx, gz);
        k.v *= 1 - (k.drift ? S.WALL_LOSS_DRIFT : S.WALL_LOSS) * dn;
        if (k.wallT <= 0) { k.walls++; k.wallHit = k.t; k.wallHard = dn; }
        k.wallT = 0.25;
      }
      const pn = k.px * nx + k.pz * nz; if (pn > 0) { k.px -= pn * nx * 1.3; k.pz -= pn * nz * 1.3; }
      wh = TR.where(k.x, k.z, k.s, wh.on);
    }
    k.on = wh.on; k.lat = wh.lat; k.bs = wh.bs; k.where = wh;
    track(k, wh.s);
  }
  KK.contain = contain;
  // two karts touching: pushed apart; the shove goes mostly to the slower or lighter one
  KK.bump = function (a, b, o = {}) {
    const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz), R2 = (a.r || S.R) + (b.r || S.R);
    if (d >= R2 || d < 1e-6) return 0;
    const nx = dx / d, nz = dz / d, over = R2 - d;
    const ma = a.heavy || 1, mb = b.heavy || 1, ka = mb / (ma + mb), kb = ma / (ma + mb);
    if (!a.fixed) { a.x -= nx * over * ka; a.z -= nz * over * ka; }
    if (!b.fixed) { b.x += nx * over * kb; b.z += nz * over * kb; }
    // relative speed along the line between them
    const va = [Math.sin(a.yaw) * a.v + a.px, Math.cos(a.yaw) * a.v + a.pz], vb = [Math.sin(b.yaw) * b.v + b.px, Math.cos(b.yaw) * b.v + b.pz];
    const rel = (va[0] - vb[0]) * nx + (va[1] - vb[1]) * nz;
    const hit = Math.max(1.2, rel) * 0.9;
    const sa = (o.ringA ? 3 : 1), sb = (o.ringB ? 3 : 1);
    if (!a.fixed) { a.px -= nx * hit * ka * sb; a.pz -= nz * hit * ka * sb; }
    if (!b.fixed) { b.px += nx * hit * kb * sa; b.pz += nz * hit * kb * sa; }
    // the one hit from behind loses nothing; the one that rams loses a little speed
    if (rel > 0) { if (!a.fixed) a.v *= 1 - 0.06 * Math.min(1, rel / 6); }
    return rel;
  };
  KK.craneStart = function (k, why) {
    k.crane = { t: 0, why, x: k.x, z: k.z, yaw: k.yaw };
    k.cranes++; k.drift = 0; k.spark = 0; k.v = 0; k.px = k.pz = 0; k.boostT = 0;
  };
  // the crane's put-back spot: the middle half of the road a little ahead, facing along it
  KK.craneEnd = function (k, s, lat) {
    const prog = k.prog;
    const f = TR.at(s);
    lat = clamp(lat, -f.hw * 0.5, f.hw * 0.5);
    KK.place(k, s, lat, S.CRANE_V);
    k.lap = Math.round((prog - TR.wrap(s)) / TR.L); k.s = TR.wrap(s); k.prog = k.lap * TR.L + k.s;
    k.crane = null;
  };
  return KK;
})();
