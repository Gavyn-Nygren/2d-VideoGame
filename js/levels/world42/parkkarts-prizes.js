/* Pip & Bo - 42-4 Go-Kart Grand Prix: the prizes. Plain JavaScript, always loaded (rules only; the 3D look of the
   boxes, the wheel and every prize is in parkkarts-scenery.js / parkkarts-kart3d.js).

   Prize boxes (striped fairground gift boxes with a bow) sit in rows across the road (PARKKARTS_TRACK.boxes) and come
   back S.BOX_BACK s after they are taken. Driving through one with empty hands spins a little wheel of fortune over the
   kart for S.SPIN s and gives one prize, held until used (the action button). Every prize is a thing from the park, and
   none takes control away for more than a second:
     popcorn   Popcorn Popper: a burst of speed for S.POP_T s, popcorn firing out of the exhaust
     floss     Candy Floss: a pink cloud dropped behind; a kart that drives into it is wrapped in floss (slowed, its
               headlamp beam hidden) for S.FLOSS_T s
     balloons  Water Balloons: three, thrown ahead one per press, bouncing down the road; a hit makes a kart skid wide
               for S.SKID_T s (no drift, a wobble, slower)
     teddy     Giant Teddy: an enormous plush bear set down behind as a roadblock for S.TEDDY_LIFE s (it waves). A kart
               that hits it bounces softly off and loses speed
     ring      Bumper Ring: the bumper blows up into a big rubber ring for S.RING_T s: bumps throw the other kart sideways
               three times as hard, and prizes bounce off it
     magnet    Magnet (only for the kart behind): pulls it toward the kart ahead for S.MAG_T s
     rocket    Fireworks (only for the kart behind): one rocket that follows the road and bursts beside the kart ahead in
               a harmless dazzling flash that knocks it out of its drift (no boost) and checks it a little
   Fairness: the wheel of the kart in front leans to Popcorn and the Teddy; the one behind gets the strong ones, more
   so the further back it is. A flag's rolling restart clears everything on the road. No hit can cost a flag in under
   a second (the danger band always takes its full 1.5 s).
   Uses the level's own seeded random (st.rng) so a race plays the same with drawing off. */
'use strict';

const PARKKARTS_PRIZES = (function () {
  const TR = PARKKARTS_TRACK;
  const S = {
    BOX_BACK: 4, BOX_R: 1.1, SPIN: 0.7,
    POP_T: 1.5, FLOSS_T: 1.5, FLOSS_R: 2.0, FLOSS_LIFE: 7, FLOSS_K: 0.6,
    BALLOONS: 3, BALL_V: 10, BALL_LIFE: 2.4, BALL_R: 1.05, SKID_T: 1.0,
    TEDDY_LIFE: 8, TEDDY_R: 1.25, RING_T: 5, MAG_T: 2, MAG_PULL: 7, MAG_K: 1.15,
    ROCKET_V: 27, ROCKET_LIFE: 4, FLASH_T: 0.8, HIT_SAFE: 1.0,
  };
  const KINDS = ['popcorn', 'floss', 'balloons', 'teddy', 'ring', 'magnet', 'rocket'];
  const NAMES = { popcorn: 'Popcorn Popper', floss: 'Candy Floss', balloons: 'Water Balloons', teddy: 'Giant Teddy', ring: 'Bumper Ring', magnet: 'Magnet', rocket: 'Fireworks' };
  const PZ = { S, KINDS, NAMES };

  PZ.fresh = function (st) {
    st.boxes = TR.boxes.map(r => r.lats.map(() => 0)); // seconds until each box is back (0: there)
    st.items = [];
  };
  // the wheel's weights for a kart: in front, just behind, or well behind
  function pick(st, k, place, gap) {
    const W = place === 0 ? { popcorn: 3, teddy: 3, floss: 2, balloons: 2, ring: 1 }
      : gap < 10 ? { popcorn: 2, balloons: 3, floss: 2, teddy: 1, ring: 2, magnet: 1, rocket: 1 }
        : { popcorn: 2, balloons: 2, ring: 1, magnet: 3, rocket: 3 };
    let tot = 0; for (const n in W) tot += W[n];
    let x = st.rng() * tot;
    for (const n in W) { x -= W[n]; if (x < 0) return n; }
    return 'popcorn';
  }
  // boxes: a kart with empty hands that drives into one
  PZ.boxes = function (st, dt, karts, placeOf, gap) {
    for (let r = 0; r < TR.boxes.length; r++) for (let i = 0; i < st.boxes[r].length; i++) if (st.boxes[r][i] > 0) st.boxes[r][i] = Math.max(0, st.boxes[r][i] - dt);
    for (const k of karts) {
      if (k.crane || k.lock) continue;
      for (let r = 0; r < TR.boxes.length; r++) {
        const row = TR.boxes[r];
        let ds = k.s - row.s; if (ds > TR.L / 2) ds -= TR.L; if (ds < -TR.L / 2) ds += TR.L;
        if (Math.abs(ds) > 2.5) continue;
        for (let i = 0; i < row.lats.length; i++) {
          if (st.boxes[r][i] > 0) continue;
          const p = TR.pos(row.s, row.lats[i]);
          if (Math.hypot(k.x - p[0], k.z - p[1]) > S.BOX_R + 0.5) continue;
          st.boxes[r][i] = S.BOX_BACK;
          st.fx.push({ k: 'box', t: st.t, who: k.id, r, i });
          if (!k.prize && !k.spinT) { k.spinT = S.SPIN; k.spinPrize = pick(st, k, placeOf(k), gap); k.boxes = (k.boxes || 0) + 1; Sfx.play('parkkartsBox'); Sfx.play('parkkartsWheel'); }
          else Sfx.play('parkkartsBox');
        }
      }
    }
  };
  // a kart's held prize, its timers and effects (called every step for each kart)
  PZ.kart = function (st, k, dt) {
    if (k.spinT > 0) { k.spinT -= dt; if (k.spinT <= 0) { k.spinT = 0; k.prize = k.spinPrize; k.charges = k.prize === 'balloons' ? S.BALLOONS : 1; } }
    for (const n of ['popT', 'flossT', 'skidT', 'ringT', 'magT', 'flashT', 'hitSafe']) if (k[n] > 0) k[n] = Math.max(0, k[n] - dt);
  };
  // what the effects do to the kart's driving this step
  PZ.drive = function (k) {
    let mul = 1, noDrift = false, wobble = 0;
    if (k.flossT > 0) mul *= S.FLOSS_K;
    if (k.skidT > 0) { mul *= 0.8; noDrift = true; wobble = Math.sin(k.skidT * 18) * 2.2 * (k.skidDir || 1); }
    if (k.flashT > 0) { mul *= 0.88; noDrift = true; }
    if (k.magT > 0) mul *= S.MAG_K;
    return { mul, noDrift, wobble };
  };
  // the action button: use the held prize. other: the other player's kart
  PZ.use = function (st, k, other) {
    if (!k.prize || k.crane || k.lock) return false;
    const n = k.prize, f = TR.at(k.s), back = (d) => { const s = k.s - d; return { s, lat: k.lat }; };
    st.fx.push({ k: 'use', t: st.t, who: k.id, n });
    k.used = (k.used || 0) + 1;
    if (n === 'popcorn') { k.popT = S.POP_T; k.boostT = Math.max(k.boostT, S.POP_T); Sfx.play('parkkartsPopcorn'); }
    else if (n === 'floss') { const b = back(2.4); st.items.push({ kind: 'floss', s: b.s, lat: b.lat, t: 0, life: S.FLOSS_LIFE, owner: k.id, r: S.FLOSS_R, hit: [] }); Sfx.play('parkkartsFloss'); }
    else if (n === 'teddy') { const b = back(2.8); st.items.push({ kind: 'teddy', s: b.s, lat: Math.max(-f.hw + 1, Math.min(f.hw - 1, b.lat)), t: 0, life: S.TEDDY_LIFE, owner: k.id, r: S.TEDDY_R }); Sfx.play('parkkartsTeddy'); }
    else if (n === 'balloons') { st.items.push({ kind: 'balloon', s: k.s + 1.4, lat: Math.max(-f.hw + 0.6, Math.min(f.hw - 0.6, k.lat)), v: k.v + S.BALL_V, t: 0, life: S.BALL_LIFE, owner: k.id, r: S.BALL_R }); Sfx.play('parkkartsBalloon'); }
    else if (n === 'ring') { k.ringT = S.RING_T; Sfx.play('parkkartsRing'); }
    else if (n === 'magnet') { k.magT = S.MAG_T; Sfx.play('parkkartsMagnet'); }
    else if (n === 'rocket') { st.items.push({ kind: 'rocket', s: k.s + 1, lat: k.lat, t: 0, life: S.ROCKET_LIFE, owner: k.id, target: other.id, r: 1.2 }); Sfx.play('parkkartsRocket'); }
    if (--k.charges <= 0) k.prize = null;
    return true;
  };
  // a hit on a kart (anything but its own prize; a Bumper Ring turns it away)
  function hit(st, k, kind, item) {
    if (k.hitSafe > 0 || k.crane || k.lock) return false;
    if (k.ringT > 0 && kind !== 'floss') { st.fx.push({ k: 'deflect', t: st.t, who: k.id }); Sfx.play('parkkartsBump'); return true; }
    k.hitSafe = S.HIT_SAFE; k.hits = (k.hits || 0) + 1;
    if (kind === 'balloon') { k.skidT = S.SKID_T; k.skidDir = k.lat >= 0 ? 1 : -1; k.drift = 0; k.spark = 0; Sfx.play('parkkartsSplat'); }
    else if (kind === 'floss') { k.flossT = S.FLOSS_T; Sfx.play('parkkartsFloss'); }
    else if (kind === 'teddy') { k.v *= 0.5; const f = TR.at(k.s); const side = k.lat >= (item ? item.lat : 0) ? 1 : -1; k.px += f.rx * side * 3; k.pz += f.rz * side * 3; k.drift = 0; Sfx.play('parkkartsTeddy'); }
    else if (kind === 'rocket') { k.flashT = S.FLASH_T; k.drift = 0; k.spark = 0; Sfx.play('parkkartsSplat'); }
    st.fx.push({ k: 'hit', t: st.t, who: k.id, kind });
    return true;
  }
  PZ.hit = hit;
  // things on the road: clouds, bears, balloons, rockets
  PZ.items = function (st, dt, karts, robots) {
    for (const it of st.items) {
      it.t += dt;
      if (it.kind === 'balloon') {
        it.s = TR.wrap(it.s + it.v * dt);
        for (const rb of robots) if (Math.abs(sd(rb.s, it.s)) < 1.2 && Math.abs(rb.lat - it.lat) < 1.2) { it.t = it.life; st.fx.push({ k: 'pop', t: st.t, s: it.s, lat: it.lat }); Sfx.play('parkkartsSplat'); }
      } else if (it.kind === 'rocket') {
        const tg = karts[it.target];
        it.s = TR.wrap(it.s + S.ROCKET_V * dt);
        it.lat += (tg.lat - it.lat) * Math.min(1, dt * 5);
        if (sd(tg.s, it.s) < 0.6 && !tg.crane) { if (hit(st, tg, 'rocket', it)) st.fx.push({ k: 'flash', t: st.t, who: tg.id, s: tg.s, lat: tg.lat }); it.t = it.life; }
        continue;
      }
      if (it.t >= it.life) continue;
      const p = TR.pos(it.s, it.lat);
      for (const k of karts) {
        if (k.crane || k.lock) continue;
        if (it.kind === 'floss' && it.hit.includes(k.id)) continue;
        if ((it.kind === 'balloon') && it.owner === k.id && it.t < 0.4) continue;
        if (it.kind === 'teddy' && it.owner === k.id && it.t < 0.6) continue;
        if (Math.hypot(k.x - p[0], k.z - p[1]) > it.r + 0.6) continue;
        if (it.kind === 'floss') { it.hit.push(k.id); hit(st, k, 'floss', it); }
        else if (it.kind === 'balloon') { hit(st, k, 'balloon', it); it.t = it.life; st.fx.push({ k: 'pop', t: st.t, s: it.s, lat: it.lat }); }
        else if (it.kind === 'teddy') { if (k.teddyT == null || st.t - k.teddyT > 0.6) { k.teddyT = st.t; hit(st, k, 'teddy', it); k.hitSafe = 0; } }
      }
    }
    st.items = st.items.filter(it => it.t < it.life);
  };
  const sd = (a, b) => { let d = a - b; if (d > TR.L / 2) d -= TR.L; if (d < -TR.L / 2) d += TR.L; return d; };
  PZ.sd = sd;
  // a flag's rolling restart: the road is cleared
  PZ.clear = function (st) { st.items = []; };
  return PZ;
})();
