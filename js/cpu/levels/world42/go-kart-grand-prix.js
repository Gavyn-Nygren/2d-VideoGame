/* Pip & Bo - computer opponent for 42-4 Go-Kart Grand Prix (mode 'parkkarts', versus).

   The plan: drive a racing line. It looks a speed-based distance down the road (PARKKARTS_TRACK), aims at a point
   there on its line (toward the inside of the bend ahead, by how tight the bend is), and steers at it with the stick,
   smoothly (a steering value that eases, with a dead zone, so it never wobbles down a straight). It never reads the
   other player's buttons and plays by the same rules and speeds: no hidden speed, no free prizes.
     DRIFT   ahead of a tight bend it holds jump while steering in, keeps holding through the bend and lets go at the
             exit (for the boost). Hard drifts every bend worth it and holds for pink sparks; Normal drifts the big
             ones; Easy rarely drifts and brakes a little into the tightest bends instead.
     LINES   Hard and Normal cut to the inside; Easy keeps nearer the middle and wider. Hard and Normal take the ring-
             toss shortcut (Hard always, Normal when the way in is clear); Easy never does.
     PRIZES  boost (Popcorn) on a straight, drop the Teddy or the Candy Floss when the person is close behind in line,
             throw balloons or a rocket when the person is ahead and in line, a Magnet when well behind, a Bumper Ring
             when side by side. Easy uses them late.
     SKILL   (info.skill: 0.35 Easy, 0.7 Normal, 1 Hard) sets the line, the drifts, prize sense, reaction, and a rate of
             believable mistakes (an exit run wide for a second, a wall scraped), never a stop. Easy also eases off
             when it is well ahead, so a young player who keeps the kart on the road can win.
     NEVER   drives the wrong way (the crane fixes it), parks, or rams on purpose: it keeps a gap to the side when level.
   If the person presses nothing for 30 s (CPU.idleStop) it stops pressing too, as in every versus level.
   1-player bubbles, sparing: "Catch me!", "Nice drift!", "Hey!". */
'use strict';

cpuBrain('parkkarts', {
  reset(b) { b.steer = 0; b.drifting = false; b.mistake = 0; b.mistakeT = 3 + Math.random() * 6; b.useT = 0; b.lastSign = 0; b.flips = []; b.wide = 0; b.bubbleT = 0; b.lastHits = 0; },
  bubblePos(p) {
    const st = G.mst; if (!st || !st.karts || typeof PARKKARTS_SCENE === 'undefined') return null;
    const k = st.karts[p.id], q = K3D.toScreen(k.x, 1.9, k.z); return q.z < 1 ? { x: q.x, y: q.y - 14 } : null;
  },
  bubbleHidden: true,
  think(b, p, o, dt, info) {
    const st = G.mst, TR = PARKKARTS_TRACK, KK = PARKKARTS_KART, sk = info.skill;
    if (!st || !st.karts) return {};
    const k = st.karts[p.id], other = st.karts[1 - p.id];
    const out = { left: false, right: false, jump: false, down: false, act: false };
    if (st.phase !== 'race' && st.phase !== 'roll') { b.drifting = false; return out; }
    // the bend ahead: how much the road turns over the next stretch (+ left)
    const look = 6 + k.v * (0.55 + 0.2 * sk);
    let turn = 0; for (let d = 2; d < 22; d += 2) turn += TR.at(k.s + d).turn * 2;
    const tight = Math.abs(turn);
    // the line: toward the inside of the bend ahead (Easy: less, and wider overall)
    const f = TR.at(k.s + look), hw = f.hw;
    let lineLat = -Math.sign(turn) * Math.min(1, tight / 1.2) * hw * (0.12 + 0.3 * sk);
    // aiming at a point round a bend cuts the corner by about look^2 / 8R: aim that much wider
    const cMid = TR.at(k.s + look * 0.5).turn, cut = Math.max(-2.5, Math.min(2.5, cMid * look * look / 8));
    // the ring-toss shortcut
    const B = TR.ringToss; let useShort = false;
    if (sk >= 0.6) { const ds = PARKKARTS_PRIZES.sd(B.s0, k.s); if (ds > -1 && ds < 26 && (sk >= 0.95 || Math.abs(other.lat - (-hw)) > 2.5)) useShort = true; }
    if (k.on >= 0) useShort = true;
    // keep clear of the other kart when side by side (no ramming)
    const dsO = PARKKARTS_PRIZES.sd(other.s, k.s);
    if (Math.abs(dsO) < 2.5 && Math.abs(other.lat - lineLat) < 1.6) lineLat = other.lat + (other.lat > lineLat ? -1.8 : 1.8);
    // robots ahead in the line: go round them
    for (const r of st.robots) { const ds = PARKKARTS_PRIZES.sd(r.s, k.s); if (ds > 0 && ds < look + 3 && Math.abs(r.lat - lineLat) < 1.7) lineLat = r.lat + (r.lat > 0 ? -2.0 : 2.0); }
    // mistakes: now and then an exit run wide (more for Easy)
    b.mistakeT -= dt;
    if (b.mistakeT <= 0) { b.mistakeT = 4 + Math.random() * 10 * (0.4 + sk); if (Math.random() < 0.8 - sk * 0.6) b.mistake = 0.8 + Math.random() * 0.8; }
    if (b.mistake > 0) { b.mistake -= dt; lineLat += Math.sign(turn || 1) * hw * 0.6; }
    lineLat = Math.max(-hw + 1.2, Math.min(hw - 1.2, lineLat + cut));
    let tx, tz;
    if (useShort) {
      // aim along the shortcut's own middle
      let bs; if (k.on >= 0) bs = k.bs + look; else bs = Math.max(0, look - PARKKARTS_PRIZES.sd(B.s0, k.s));
      if (bs < B.len) { const g = B.at(bs); tx = g.x; tz = g.z; }
    }
    if (tx == null) { const p2 = TR.pos(k.s + look, lineLat); tx = p2[0]; tz = p2[1]; }
    // steer at it
    const want = Math.atan2(tx - k.x, tz - k.z);
    let err = Math.atan2(Math.sin(want - k.yaw), Math.cos(want - k.yaw));
    let s = Math.max(-1, Math.min(1, -err * (1.7 + 0.8 * sk)));
    // drift into tight bends (the kart turns harder than it steers): hold through, let go out of it
    const drifty = sk >= 0.95 ? 0.55 : sk >= 0.6 ? 0.85 : 1.6;
    if (!b.drifting && tight > drifty && k.v > KK.S.DRIFT_V + 1 && Math.abs(err) > 0.05 && !useShort) { b.drifting = true; b.driftDir = -Math.sign(turn); }
    if (b.drifting) {
      const inside = -b.driftDir * k.lat, tooIn = inside > hw - 0.6 - (1 - sk) * 0.8;
      const exitDone = tight < drifty * 0.45 || (k.spark === 2 && sk < 0.95 && tight < drifty) || k.skidT > 0 || (tooIn && k.spark > 0) || k.verge;
      if (exitDone || (k.drift === 0 && k.driftT === 0 && b.heldT > 0.4)) { b.drifting = false; b.heldT = 0; }
      else { out.jump = true; b.heldT = (b.heldT || 0) + dt; if (k.drift === 0) s = b.driftDir * Math.max(0.5, Math.abs(s)); }
    }
    // Easy brakes a touch for the tightest bends
    if (sk < 0.5 && tight > 1.4 && k.v > 10) out.down = true;
    // Easy eases off when well ahead
    if (sk < 0.5 && st.lead === p.id && st.gap > 14) out.down = k.v > 9;
    // ease the stick (never wobbling: a dead zone and a rate limit)
    const rate = 4 + 4 * sk;
    // a hand on the wheel, not a twitch: a turn the other way waits until the last one has had half a second, and a
    // small one the other way waits until it is worth making
    b.sinceFlip = (b.sinceFlip || 0) + dt;
    if (b.lastNZ && Math.sign(s) === -b.lastNZ && (b.sinceFlip < 0.56 || Math.abs(s) < (b.drifting ? 0.45 : 0.22))) s = 0;
    if (Math.abs(s) < 0.08 && !b.drifting) s = 0;
    b.steer += Math.max(-rate * dt, Math.min(rate * dt, s - b.steer));
    if (Math.abs(b.steer) > 0.05 && Math.sign(b.steer) !== b.lastNZ) { b.lastNZ = Math.sign(b.steer); b.sinceFlip = 0; }
    out.ax = b.steer;
    // prizes
    if (k.prize) {
      b.useT += dt;
      const delay = 0.3 + (1 - sk) * 2.5;
      if (b.useT > delay) {
        const behindClose = dsO < 0 && dsO > -12 && Math.abs(other.lat - k.lat) < 2.5, ahead = dsO > 0 && dsO < 30;
        let go = false;
        switch (k.prize) {
          case 'popcorn': go = tight < 0.4; break;
          case 'teddy': case 'floss': go = behindClose || b.useT > 8; break;
          case 'balloons': go = (ahead && Math.abs(other.lat - k.lat) < 1.4) || b.useT > 9; break;
          case 'rocket': go = ahead || b.useT > 4; break;
          case 'magnet': go = dsO > 8 || b.useT > 6; break;
          case 'ring': go = Math.abs(dsO) < 4 || b.useT > 6; break;
        }
        if (go) { out.act = 'tap'; b.useT = 0; }
      }
    } else b.useT = 0;
    // bubbles (1-player only; the core keeps them sparing)
    if (cpuSolo()) {
      b.bubbleT -= dt;
      if (b.bubbleT <= 0) {
        if (st.lead === p.id && st.gap > 12) { cpuSay(p, 'Catch me!'); b.bubbleT = 20; }
        else if (other.boostedAt && st.t - other.boostedAt < 0.1 && other.boost === 2) { cpuSay(p, 'Nice drift!'); b.bubbleT = 20; }
        else if ((k.hits || 0) > b.lastHits) { cpuSay(p, 'Hey!'); b.bubbleT = 15; }
      }
      b.lastHits = k.hits || 0;
    }
    return out;
  },
});
