/* Pip & Bo - Level 8-2 Roulette Wheel (versus). */
'use strict';

/* ===== World 8 (Lucky Casino): 8-2 Roulette Wheel (mode 'roulette', versus, best of 5) =====
   Pip and Bo stand on a giant carnival roulette wheel seen from a 3/4 view, and the wheel turns under their feet.
   A ball rattles round the track, slows, clatters into a pocket and lights that pocket's color wedge. At LOCK the player
   on the lit wedge who is closest to the ball wins a pretend chip (nobody on it: the one nearer the ball). First to 3 chips
   wins the round. act = bump (tap); a landed bump bounces both players apart (bumper cars).
   def.ownStep: this mode runs the whole live tick. Bodies live in the wheel's turning frame (st.pl[k].u / .v, floor px);
   every tick they are projected to p.x / p.y (they stay alive: the rim is a wall). The mode draws them itself, 1.15x (1.25x on a phone)
   and in painter's order with the turret; the engine's player pass is skipped by hiding p.alive between draw() and drawTop().
   One block: only MODES.roulette and Sfx.extra.roulette* leave it. Spec: w8/roulette/SPEC.md (lead review + revision box). */
{
  const ROULETTE = {
    // wheel (floor px, wheel frame) and the 3/4 projection: screen = (cx + X, cy + Y * k), X/Y = the wheel point turned by th
    cx: 480, cy: 315, k: 0.58, cyOff: 15,   // cx, cy are read from the 'y' marker: its left edge, half a tile down (so the name tags
                                             // under the level intro card stay clear of its text)
    hubR: 52, R: 285, trackR: 306, frameR: 340, pocketR: 266, wedges: 6, pockets: 4,
    spin: 0.42,                          // ★ wheel turn speed, rad/s (clockwise on screen); one turn in 15 s
    spinUp: 0.6,                         // s from standstill (GO) to full speed
    spawnR: 200,
    // running (floor px, s)
    rb: 13, maxV: 220, acc: 2400, fric: 2600, slideFric: 900, wallE: 0.35, hubE: 0.5, pushE: 0.1, fling: 0,
    // bump (act, tap only)
    lungeV: 500, lungeT: 0.13, bumpCD: 0.7, whiffT: 0.22, hitV: 450, hitStun: 0.4, recoil: 0.25, kickback: 250, safeT: 0, reach: 6,
    clashV: 300, clashStun: 0.15, assistR: 85, huffT: 0.25,  // aim help: a bump always homes on the other player within assistR
    wobT: 0.35,            // (revision) bumper cars: a landed bump bounces the bumper back too (kickback px/s) and they wobble this long
                           // (no control, no bump). Shadow-and-bump no longer beats reading the wheel (see REPORT: oracle|bully).
    // ball (rad/s in the world frame; the ball runs round the other way: negative)
    ballV0: 3.0, ballV0J: 0.3, ballVEnd: 0.9, rollT: 4.0, rollJ: 1.0, dropT: 0.7, hopMax: 0.2, lockT: 2.5, payT: 1.4,
    launchA: Math.PI / 2,  // fallback launch spot (front of the wheel) when launchRand is off
    launchRand: true,      // (lead review) every spin flicks the ball in at a random spot on the track
    // round
    chips: 3, maxSpins: 9, bumpCredit: 1.0,
    tickets: 2,                          // ★ the other player on the lit color gets a ticket; this many tickets = 1 chip (0 = off)
    ticketsKeep: false,                  // tickets carry over to the next round
    // comeback: this many rounds behind -> start the round with one gold Lucky chip
    luckyMin: 2, luckyChips: 1, luckyShare: 0.3,   // (lead review) ... or your share of this match's chips is under luckyShare and you aren't ahead
    lucky2Share: 0.22, lucky2Min: 4,               // (revision) far behind (share of ALL chips under lucky2Share, >= lucky2Min out, not ahead): 2 gold chips
    // NOTE (revision): every share here (Lucky chip, Lucky shoes) counts the chips won AT THE BALL (stat.ballChips); chips that
    // came from tickets are already a comeback and are left out on purpose. What players see ("Chips won", the tiebreak) counts both.
    nearest: true,         // (revision) nobody on the lit color at LOCK: the player nearer the ball wins the chip (no dead spins, no stalls)
    spinDown: 1.2,         // (revision) s for the wheel to coast to a stop during the round-end banner (the next round starts from there)
    // comeback 2: Lucky Shoes (gold). share = your chips / all chips this match (this round included), once >= shoeMin chips are out;
    // b = clamp((shoeHi - share) / (shoeHi - shoeLo), 0, 1); effects at b = 1 (linear in b)
    shoeHi: 0.35, shoeLo: 0.15, shoeMin: 2, shoeShow: 0, shoeRun: 0.12, shoeHit: 0.35, shoeReach: 8, shoeAssist: 25, shoeTake: 0.25,
    // touch diagonals: one arrow held on the touch pad and the lit ball 22.5°..touchAng off it -> run the diagonal on that side
    touchHelp: true, touchAng: 1.18,
    // twists
    pegs: false, pegR: 20, pegPos: 175, pegE: 1.1, pegMin: 260,
    hop: false, hopEvery: 1.0, hopWarn: 0.4, hopPockets: 2, hopAir: 0.25, hopMaxN: 2, hopLast: 1.0, hopTop: 1.6,
    callEarly: true,                     // light the wedge when the ball drops in (dropT s before it settles), not when it settles
    balls: 1, ballGap: 0.8,
  };
  const ROULETTE_TWISTS = {
    classic: { name: 'Roulette Wheel', hint: 'Run to the ball’s color! Closest wins a chip!', P: {} },
    fast: { name: 'Speedy Spin', hint: 'Fast and slippery! Hold on tight!', P: { spin: 1.0, acc: 1300, fric: 700, slideFric: 450, fling: 0.6 } },
    pegs: { name: 'Bumper Pegs', hint: 'Boing! Bump them into the pegs!', P: { pegs: true } },
    hop: { name: 'Hoppy Ball', hint: 'The ball keeps hopping! Chase it!', P: { hop: true, lockT: 3.2 } },
    double: { name: 'Double Trouble', hint: 'Two balls! Two chips up for grabs!', P: { balls: 2 } },
    sudden: { name: 'One Spin', hint: 'One chip wins the round!', P: { chips: 1, rollT: 2.6, rollJ: 0.6 } },
  };
  const ROULETTE_MIX = ['fast', 'pegs', 'hop'];
  // the six color wedges, clockwise from the right (wedge i covers wheel angles i·60° − 30° .. i·60° + 30°)
  const ROULETTE_WEDGES = [
    { name: 'Stars', col: '#ffcf3a', dk: '#c9971a', ink: '#7a5200', sym: 'star' },
    { name: 'Hearts', col: '#ff7ab8', dk: '#c74a86', ink: '#8a1f55', sym: 'heart' },
    { name: 'Clovers', col: '#5fd06e', dk: '#2f9a48', ink: '#1d5e2c', sym: 'clover' },
    { name: 'Moons', col: '#3d3a7a', dk: '#26235a', ink: '#ffd96b', sym: 'moon', txt: '#b8b2ff' },  // txt: a readable text color on dark pills
    { name: 'Diamonds', col: '#3fd0c4', dk: '#1f968c', ink: '#0f5a54', sym: 'diamond' },
    { name: 'Crowns', col: '#a274f2', dk: '#6c45b8', ink: '#3d1f7a', sym: 'crown' },
  ];
  const ROULETTE_COLS = { velvet: '#4a1a5c', velvetDk: '#2c0f3c', velvetHi: '#6d2a7e', felt: '#1f7a52', feltDk: '#145a3b', wood: '#8a4b2a',
    woodDk: '#5a2e1a', woodHi: '#b06a3a', track: '#f3e2c0', trackDk: '#d9c193', gold: '#ffc53d', goldDk: '#b9850f', ball: '#fbfbff', peg: '#e8384f', pegDk: '#9c1f30',
    ticket: '#ff8fc7', ticketInk: '#7a1f4a', bulb: '#fff6c8', bulbOff: '#b98a3a' };
  const ROULETTE_TAU = Math.PI * 2;
  const ROULETTE_DIAMOND0 = Math.PI / 8;   // the 8 gold diamonds on the ball track (world frame, they don't turn)
  const rouletteP = () => G.mst.P || ROULETTE;
  const rouletteWrap = a => { a %= ROULETTE_TAU; return a < 0 ? a + ROULETTE_TAU : a; };
  const rouletteAngDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= ROULETTE_TAU; while (d < -Math.PI) d += ROULETTE_TAU; return d; };
  // wedge index of a wheel-frame angle (the upper side owns a border)
  const rouletteWedgeAt = a => Math.floor(rouletteWrap(a + Math.PI / 6) / (Math.PI / 3)) % 6;
  // centre angle of pocket j (0..23), wheel frame
  const roulettePocketA = j => -Math.PI / 6 + (j + 0.5) * (ROULETTE_TAU / 24);
  const roulettePocketAt = a => Math.floor(rouletteWrap(a + Math.PI / 6) / (ROULETTE_TAU / 24)) % 24;
  // phones (hudBig: the stage is drawn under 0.6 of its size): bigger ball, players, text and rings
  const rouletteBig = () => hudBig();
  const rouletteSpriteS = () => (rouletteBig() ? 1.25 : 1.15);    // players are drawn this much bigger (feet stay put)

  // wheel frame -> floor plane (screen-aligned) -> screen
  function rouletteToFloor(u, v, th) { const c = Math.cos(th), s = Math.sin(th); return { X: u * c - v * s, Y: u * s + v * c }; }
  function rouletteToWheel(X, Y, th) { const c = Math.cos(th), s = Math.sin(th); return { u: X * c + Y * s, v: -X * s + Y * c }; }
  function rouletteProj(u, v) {
    const st = G.mst, P = rouletteP(), f = rouletteToFloor(u, v, st.th || 0);
    return { x: st.cx + f.X, y: st.cy + f.Y * P.k };
  }
  // a ball's wheel-frame position
  function rouletteBallUV(b) {
    const st = G.mst;
    if (b.state === 'roll') { const a = b.phi - st.th; return { u: b.r * Math.cos(a), v: b.r * Math.sin(a) }; }
    return { u: b.r * Math.cos(b.a), v: b.r * Math.sin(b.a) };
  }
  function rouletteOnPad(id) { try { return Pads.kind === 'pad' && !!padFor(padSlots(), id); } catch (e) { return false; } }
  function rouletteOnTouch(id) {
    const tt = MODES.roulette.testTouch; if (tt) return !!tt[id];
    try { const t = touchState[id]; return !!(t && (t.left || t.right || t.jump || t.down)); } catch (e) { return false; }
  }
  // the held direction in the floor plane (screen-aligned), unit length or zero. Keyboard W/Space/↑ and touch ▲ arrive as
  // input.jump and mean "up" here; on a controller the stick gives input.up and A (pendingJump) bumps.
  function rouletteInput(p) {
    const i = p.input, up = i.up || (i.jump && !rouletteOnPad(p.id));
    let dx = (i.right ? 1 : 0) - (i.left ? 1 : 0), dy = (i.down ? 1 : 0) - (up ? 1 : 0);
    const P = rouletteP(), st = G.mst;
    // touch has no diagonals with one thumb: a single arrow whose side the lit ball is on turns into that diagonal
    if (P.touchHelp && (dx !== 0) !== (dy !== 0) && st.pl && rouletteOnTouch(p.id)) {
      const b = rouletteTarget(p.id);
      if (b) {
        const s = st.pl[p.id], q = rouletteBallUV(b), f0 = rouletteToFloor(s.u, s.v, st.th), f1 = rouletteToFloor(q.u, q.v, st.th);
        const da = rouletteAngDiff(Math.atan2(dy, dx), Math.atan2(f1.Y - f0.Y, f1.X - f0.X));
        if (Math.abs(da) > Math.PI / 8 && Math.abs(da) <= P.touchAng) { const sg = Math.sign(da); const nx = dx - sg * dy, ny = dy + sg * dx; dx = nx; dy = ny; }
      }
    }
    const n = Math.hypot(dx, dy);
    return n ? { x: dx / n, y: dy / n, any: true } : { x: 0, y: 0, any: false };
  }
  // the lit ball this player would chase (nearest one sitting in a pocket), or null
  function rouletteTarget(k) {
    const st = G.mst; let best = null, bd = 1e9;
    for (const b of st.balls || []) if (b.state === 'set') {
      const q = rouletteBallUV(b), s = st.pl[k], d = Math.hypot(q.u - s.u, q.v - s.v);
      if (d < bd) { bd = d; best = b; }
    }
    return best;
  }
  function rouletteMakePl(k) {   // Pip on the left, Bo on the right of the screen, whatever way the wheel stopped
    const P = rouletteP(), a = (k === 0 ? Math.PI : 0) - (G.mst.th || 0);
    return { id: k, u: P.spawnR * Math.cos(a), v: P.spawnR * Math.sin(a), wu: 0, wv: 0, stun: 0, lungeT: 0, cd: 0,
      dir: { x: k === 0 ? 1 : -1, y: 0 }, whiff: 0, wob: 0, safe: 0, hitBy: -1, hitAgo: 9, hitOn: -1, huff: 0, huffSnd: 0, wallSnd: 0, pegSnd: 0 };
  }

  // one fresh press of bump (act; A on a controller)
  function rouletteBump(k, inp) {
    const st = G.mst, P = st.P, s = st.pl[k], o = st.pl[1 - k];
    if (s.stun > 0 || s.lungeT > 0) return;               // dizzy (stars show) or mid-lunge: the press is used up
    if (s.cd > 0 || s.whiff > 0 || s.wob > 0) {            // stumbling, wobbling or resting: a little "hup!" puff and nothing else (C1: a tap always shows)
      s.huff = P.huffT; if (s.huffSnd <= 0) { Sfx.play('rouletteHuff', k); s.huffSnd = 0.3; }
      return;
    }
    const f = inp.any ? inp : s.dir;
    let d = rouletteToWheel(f.x, f.y, st.th); d = { x: d.u, y: d.v };
    // aim help: near the other player, the bump always goes at them (aim is optional); otherwise the held / facing way
    const ox = o.u - s.u, oy = o.v - s.v, dist = Math.hypot(ox, oy);
    if (dist < P.assistR + P.shoeAssist * st.shoe[k] && dist > 0.01) d = { x: ox / dist, y: oy / dist };
    s.wu = d.x * P.lungeV; s.wv = d.y * P.lungeV; s.lungeT = P.lungeT; s.cd = P.bumpCD;
    const fd = rouletteToFloor(d.x, d.y, st.th); s.dir = { x: fd.X, y: fd.Y };
    st.stat.tries[k]++;
    const p = G.players[k]; p.sx = 1.25; p.sy = 0.8;
    Sfx.play('rouletteBump', k);
  }

  function rouletteMove(k, dt, live) {
    const st = G.mst, P = st.P, s = st.pl[k], p = G.players[k];
    s.stun = Math.max(0, s.stun - dt); s.cd = Math.max(0, s.cd - dt); s.whiff = Math.max(0, s.whiff - dt); s.wob = Math.max(0, s.wob - dt);
    if (s.lungeT > 0) { s.lungeT -= dt; if (s.lungeT <= 0) { s.lungeT = 0; s.whiff = P.whiffT; st.stat.whiffs[k]++; p.sx = 1.15; p.sy = 0.88; } } // missed: a stumble
    s.hitAgo += dt; s.safe = Math.max(0, s.safe - dt); s.huff = Math.max(0, s.huff - dt); s.huffSnd -= dt; s.wallSnd -= dt; s.pegSnd -= dt;
    // C1: a fresh press is read and used up on every tick, whether or not it can do anything
    const press = live && (p.pendingAct || (p.pendingJump && rouletteOnPad(k)));
    p.pendingAct = false; p.pendingJump = false;
    const inp = live && s.stun <= 0 && s.whiff <= 0 && s.wob <= 0 ? rouletteInput(p) : { x: 0, y: 0, any: false };
    if (inp.any && s.lungeT <= 0) s.dir = { x: inp.x, y: inp.y };
    if (inp.any || press) st.didAct[k] = true;   // (revision) played this round: comeback help is earned (an AFK player gets none)
    if (press) { rouletteBump(k, inp); st.hinted[k] = true; st.hintT[k] = 0; }   // any press: they know the button now
    if (s.lungeT > 0) { /* the lunge keeps its speed */ }
    else if (s.stun > 0 || s.whiff > 0 || s.wob > 0 || !inp.any) {
      const sp = Math.hypot(s.wu, s.wv), fr = (s.stun > 0 || s.wob > 0 ? P.slideFric : P.fric) * dt;
      if (sp <= fr) { s.wu = 0; s.wv = 0; } else { s.wu -= s.wu / sp * fr; s.wv -= s.wv / sp * fr; }
    } else {
      const vmax = P.maxV * (1 + P.shoeRun * st.shoe[k]);
      const d = rouletteToWheel(inp.x, inp.y, st.th), tu = d.u * vmax, tv = d.v * vmax;
      const du = tu - s.wu, dv = tv - s.wv, dd = Math.hypot(du, dv), a = P.acc * dt;
      if (dd <= a) { s.wu = tu; s.wv = tv; } else { s.wu += du / dd * a; s.wv += dv / dd * a; }
    }
    if (P.fling > 0) { const w2 = st.w * st.w * P.fling * dt; s.wu += s.u * w2; s.wv += s.v * w2; } // a fast wheel throws you outward
    s.u += s.wu * dt; s.v += s.wv * dt;
  }

  // player vs player, hub, rim and pegs (all in the wheel frame)
  function rouletteCollide() {
    const st = G.mst, P = st.P, a = st.pl[0], b = st.pl[1];
    let dx = b.u - a.u, dy = b.v - a.v, d = Math.hypot(dx, dy);
    if (d < 0.01) { dx = 1; dy = 0; d = 0.01; }
    const nx = dx / d, ny = dy / d, min = 2 * P.rb;
    const aL = a.lungeT > 0 && a.wu * nx + a.wv * ny > 0 && b.safe <= 0, bL = b.lungeT > 0 && -(b.wu * nx + b.wv * ny) > 0 && a.safe <= 0;
    if ((aL || bL) && d < min + P.reach + P.shoeReach * (aL ? st.shoe[0] : st.shoe[1])) {
      if (aL && bL) { // two bumps meet: both bounce back, nobody wins it
        a.wu = -nx * P.clashV; a.wv = -ny * P.clashV; b.wu = nx * P.clashV; b.wv = ny * P.clashV;
        a.stun = Math.max(a.stun, P.clashStun); b.stun = Math.max(b.stun, P.clashStun); a.lungeT = 0; b.lungeT = 0;
        st.stat.clashes++;
        const m = rouletteProj((a.u + b.u) / 2, (a.v + b.v) / 2);
        burst(m.x, m.y - 14, '#ffffff', 12); rouletteSpark(m.x, m.y - 16, 1.4);
        Sfx.play('rouletteClash');
        rumble(0, 0.2, 0.3, 80); rumble(1, 0.2, 0.3, 80);
      } else rouletteHit(aL ? a : b, aL ? b : a);
    }
    // two passes: a wall (hub, rim, peg) can push one body back into the other; the second pass settles that (revision)
    for (let pass = 0; pass < 2; pass++) {
      dx = b.u - a.u; dy = b.v - a.v; d = Math.hypot(dx, dy);
      if (d < min) {
        if (d < 0.01) { dx = 1; dy = 0; d = 0.01; }
        const ux = dx / d, uy = dy / d, push = (min - d) / 2;
        a.u -= ux * push; a.v -= uy * push; b.u += ux * push; b.v += uy * push;
        const vrel = (b.wu - a.wu) * ux + (b.wv - a.wv) * uy;
        if (pass === 0 && vrel < 0) { const j = -(1 + P.pushE) * vrel / 2; a.wu -= j * ux; a.wv -= j * uy; b.wu += j * ux; b.wv += j * uy; }
      }
      for (const s of st.pl) rouletteWalls(s);
    }
  }
  function rouletteHit(s, o) {
    const st = G.mst, P = st.P;
    const dx = o.u - s.u, dy = o.v - s.v, d = Math.max(0.01, Math.hypot(dx, dy)), nx = dx / d, ny = dy / d;
    const tang = -(s.wu * ny) + s.wv * nx;           // the bumper's sideways speed carries over a little
    const v = P.hitV * (1 + P.shoeHit * st.shoe[s.id]) * (1 - P.shoeTake * st.shoe[o.id]);
    o.wu = nx * v - ny * tang * 0.3; o.wv = ny * v + nx * tang * 0.3;
    o.stun = Math.max(o.stun, P.hitStun * (1 + 0.3 * st.shoe[s.id])); o.lungeT = 0; o.hitBy = s.id; o.hitAgo = 0; o.hitOn = rouletteWedgeOf(o);
    s.lungeT = 0; s.wu = s.wu * P.recoil - nx * P.kickback; s.wv = s.wv * P.recoil - ny * P.kickback;
    s.wob = P.wobT; const ps = G.players[s.id]; ps.sx = 0.8; ps.sy = 1.2;   // bumper cars: the bumper bounces back and wobbles (no dizzy stars)
    o.safe = P.safeT;
    st.stat.landed[s.id]++;
    const q = rouletteProj(o.u, o.v), po = G.players[o.id];
    po.sx = 0.75; po.sy = 1.25;
    burst(q.x, q.y - 16, PCOL[s.id], 12); puff(q.x, q.y, 5, 'rgba(255,255,255,0.7)');
    rouletteSpark((q.x + rouletteProj(s.u, s.v).x) / 2, q.y - 18, 1.6);
    roulettePop({ text: 'BUMP!', x: q.x, y: q.y - 40 * rouletteSpriteS(), col: PCOL[s.id], t: 0, size: 15 });
    Sfx.play('rouletteHit', s.id);
    rumble(o.id, 0.45, 0.3, 120); rumble(s.id, 0.15, 0.2, 60);
    if (!reduceMotion) G.shake = Math.max(G.shake, 0.08);
  }
  function rouletteWalls(s) {
    const st = G.mst, P = st.P;
    let r = Math.hypot(s.u, s.v);
    if (r < 0.01) { s.u = 0.01; r = 0.01; }
    let ux = s.u / r, uy = s.v / r;
    const inner = P.hubR + P.rb, outer = P.R - P.rb;
    if (r < inner) {
      s.u = ux * inner; s.v = uy * inner;
      const vn = s.wu * ux + s.wv * uy; if (vn < 0) { s.wu -= (1 + P.hubE) * vn * ux; s.wv -= (1 + P.hubE) * vn * uy; }
    } else if (r > outer) {
      s.u = ux * outer; s.v = uy * outer;
      const vn = s.wu * ux + s.wv * uy;
      if (vn > 0) {
        s.wu -= (1 + P.wallE) * vn * ux; s.wv -= (1 + P.wallE) * vn * uy;
        if (vn > 200 && s.wallSnd <= 0) { s.wallSnd = 0.2; Sfx.play('rouletteWall'); const q = rouletteProj(s.u, s.v); puff(q.x, q.y, 5, 'rgba(255,240,210,0.8)'); }
      }
    }
    if (P.pegs) for (const pg of st.pegs) {
      const dx = s.u - pg.u, dy = s.v - pg.v, d = Math.hypot(dx, dy), m = P.pegR + P.rb;
      if (d < m && d > 0.01) {
        const nx = dx / d, ny = dy / d; s.u = pg.u + nx * m; s.v = pg.v + ny * m;
        const vn = s.wu * nx + s.wv * ny;
        if (vn < 30) {
          const out = Math.max(-vn * P.pegE, vn < -60 ? P.pegMin : 0);
          s.wu += (out - vn) * nx; s.wv += (out - vn) * ny;
          if (out > 0) {
            pg.hitT = 0;
            if (out >= P.pegMin) s.stun = Math.max(s.stun, 0.12);
            if (s.pegSnd <= 0) { s.pegSnd = 0.2; Sfx.play('roulettePeg'); const q = rouletteProj(pg.u, pg.v); rouletteSpark(q.x, q.y - 22, 1.2); }
          }
        }
      }
    }
    // final clamp: whatever happened above, the body ends the tick on the floor ring
    r = Math.hypot(s.u, s.v); ux = s.u / r; uy = s.v / r;
    if (r < inner) { s.u = ux * inner; s.v = uy * inner; } else if (r > outer) { s.u = ux * outer; s.v = uy * outer; }
  }

  // ---- the ball(s) ----
  function rouletteStartSpin() {
    const st = G.mst, P = st.P, R = MODES.roulette.rand;
    st.spinN++; st.stat.spins++;
    st.balls = [];
    const la = P.launchRand ? R() * ROULETTE_TAU : P.launchA;   // (lead review) a random launch spot every spin
    for (let i = 0; i < P.balls; i++) {
      const v0 = P.ballV0 + (R() * 2 - 1) * P.ballV0J;
      st.balls.push({ id: i, state: 'roll', t: 0, phi: la + i * Math.PI, psi0: -v0, psi: -v0,
        rollT: P.rollT + R() * P.rollJ + i * P.ballGap, r: P.trackR, z: 0, a: 0, a0: 0, a1: 0, j: 0, wedge: -1,
        lockLeft: 0, hops: 1, hopsDone: 0, hopT: 0, hopTo: -1, hopFrom: 0, hopAirT: 0, tickA: 0, rat: 0, leader: null, lead1: -1, setT: 0,
        firstIn: -1, payT: 0, win: null });
      const q = rouletteProj(P.trackR * Math.cos(la + i * Math.PI - st.th), P.trackR * Math.sin(la + i * Math.PI - st.th));
      rouletteSpark(q.x, q.y - 8, 1.2);
    }
    Sfx.play('rouletteLaunch');
  }
  function rouletteBall(b, dt, live) {
    const st = G.mst, P = st.P, R = MODES.roulette.rand;
    b.t += dt;
    if (b.state === 'roll') {
      const f = Math.min(1, b.t / b.rollT);
      b.psi = b.psi0 + (-P.ballVEnd - b.psi0) * f;   // after the round has ended (banner time) it just keeps rolling slowly
      b.phi += b.psi * dt;
      // the rattle: one soft tick every 2 pockets passed (it slows down as the ball does)
      const dA = Math.abs(b.psi - st.w) * dt;
      b.tickA += dA; b.rat += dA;
      if (b.tickA > ROULETTE_TAU / 12) { b.tickA = 0; Sfx.play('rouletteRoll'); }
      // the rattle you can see: the ball skips over the 8 gold diamonds on the track (looks only; it never changes the landing)
      const dn = Math.floor((b.phi - ROULETTE_DIAMOND0) / (ROULETTE_TAU / 8));
      if (b.dn === undefined) b.dn = dn;
      if (dn !== b.dn) {
        b.dn = dn; const sp = clamp((Math.abs(b.psi) - 0.6) / 2.6, 0, 1); b.zk = 4 + 8 * sp;
        if (live) { const q = rouletteProj(rouletteBallUV(b).u, rouletteBallUV(b).v); rouletteSpark(q.x, q.y - 4, 0.6 + 0.5 * sp); Sfx.play('rouletteSkip'); }
      }
      b.zk = Math.max(0, (b.zk || 0) - dt * 60);
      if (b.t >= b.rollT && live) {
        // drop: it falls into the pocket ring, rides on a little, hops 1-2 times and settles in the nearest pocket
        b.state = 'drop'; b.t = 0;
        b.a0 = b.phi - st.th;
        const rel = b.psi - st.w;
        b.hops = 1 + (R() < 0.5 ? 1 : 0);
        let off = 0; for (let h = 0; h < b.hops; h++) off += (R() * 2 - 1) * P.hopMax;
        const raw = b.a0 + rel * P.dropT / 2 + off;
        let j = roulettePocketAt(raw);
        // Double Trouble: two balls never light the same wedge (this one clatters on into the next wedge)
        const ob = st.balls.find(x => x !== b && x.wedge >= 0 && x.state !== 'done');
        if (ob && Math.floor(j / 4) === ob.wedge) j = (j + (rel < 0 ? 20 : 4)) % 24;
        b.j = j; b.a1 = b.a0 + rouletteAngDiff(b.a0, roulettePocketA(j));
        if (rel < 0 && b.a1 > b.a0 + 0.3) b.a1 -= ROULETTE_TAU; // keep travelling the way it rolled
        b.wedge = Math.floor(j / 4); // decided now
        b.firstIn = -1;
        if (P.callEarly) rouletteCall(b); // the wedge lights as the ball drops in (a head start for everyone)
      }
    } else if (b.state === 'drop') {
      const f = Math.min(1, b.t / P.dropT), e = 1 - (1 - f) * (1 - f);
      b.a = b.a0 + (b.a1 - b.a0) * e;
      b.r = P.trackR + (P.pocketR - P.trackR) * Math.min(1, f * 2.5);
      const hp = f * (b.hops + 1), ph = hp - Math.floor(hp);
      const zPrev = b.z; b.z = Math.abs(Math.sin(ph * Math.PI)) * 14 * (1 - f);
      if (zPrev > 0.5 && b.z <= 0.5 && f > 0.1) { Sfx.play('rouletteClack'); const q = rouletteProj(rouletteBallUV(b).u, rouletteBallUV(b).v); rouletteSpark(q.x, q.y - 6, 1); }
      if (f >= 1) {
        b.state = 'set'; b.t = 0; b.a = roulettePocketA(b.j); b.r = P.pocketR; b.z = 0;
        b.lockLeft = P.lockT; b.hopT = P.hopEvery; b.setT = 0;
        if (!live) { /* banner time: it just sits there */ } else {
          if (!P.callEarly) rouletteCall(b); else Sfx.play('rouletteClack');
          const q = rouletteProj(rouletteBallUV(b).u, rouletteBallUV(b).v);
          rouletteSpark(q.x, q.y - 6, 1.5); burst(q.x, q.y - 6, ROULETTE_WEDGES[b.wedge].txt || ROULETTE_WEDGES[b.wedge].col, 10);
          b.ping = 0;
        }
      }
    }
    if (!live && b.state !== 'pay') return;   // the round is over (or banner time): no race, no hops, no lock, no "No chip!"
    if (b.state === 'drop' && P.callEarly || b.state === 'set') {
      // who is already standing on the lit wedge, or gets there first (the race; both on the same tick: the nearer one)
      if (b.firstIn < 0) {
        const on = [0, 1].filter(k => rouletteWedgeOf(st.pl[k]) === b.wedge);
        if (on.length) {
          let k = on[0];
          if (on.length === 2) { const q = rouletteBallUV(b), d = on.map(j => Math.hypot(st.pl[j].u - q.u, st.pl[j].v - q.v)); k = d[1] < d[0] ? 1 : 0; }
          b.firstIn = k; if (!b.firstCounted) { b.firstCounted = true; st.stat.first[k]++; }   // one per ball (a hop re-runs the race)
        }
      }
    }
    if (b.state === 'set') {
      b.setT += dt;
      // Hoppy Ball: every hopEvery s the ball hops hopPockets pockets (its landing spot shows hopWarn s before). Hopping into
      // another wedge moves the light there and tops the lock up to hopTop s, so there is always time to get there.
      if (P.hop) {
        if (b.hopAirT > 0) {
          b.hopAirT -= dt;
          const f = 1 - Math.max(0, b.hopAirT) / P.hopAir;
          b.a = b.hopFrom + rouletteAngDiff(b.hopFrom, roulettePocketA(b.hopTo)) * f;
          b.z = Math.sin(f * Math.PI) * 22;
          if (b.hopAirT <= 0) {
            b.j = b.hopTo; b.a = roulettePocketA(b.j); b.z = 0; b.hopTo = -1; b.hopsDone++;
            const nw = Math.floor(b.j / 4);
            if (nw !== b.wedge && !st.balls.some(x => x !== b && x.state === 'set' && x.wedge === nw)) {
              b.wedge = nw; b.firstIn = -1; b.lockLeft = Math.max(b.lockLeft, P.hopTop); rouletteCall(b);
            }
            Sfx.play('rouletteClack');
            const q = rouletteProj(rouletteBallUV(b).u, rouletteBallUV(b).v); rouletteSpark(q.x, q.y - 6, 1.3); b.ping = 0;
          }
        } else if (b.hopsDone < P.hopMaxN) {
          b.hopT -= dt;
          if (b.hopTo < 0 && b.hopT <= P.hopWarn && b.lockLeft - b.hopT > P.hopLast) {
            b.hopTo = (b.j + (R() < 0.5 ? -P.hopPockets : P.hopPockets) + 24) % 24;
            Sfx.play('rouletteHopWarn');
          }
          if (b.hopTo >= 0 && b.hopT <= 0) { b.hopAirT = P.hopAir; b.hopFrom = b.a; b.hopT = P.hopEvery + P.hopAir; }
        }
      }
      b.leader = rouletteLeader(b);
      if (b.lockLeft > P.bumpCredit) b.lead1 = b.leader ? b.leader.k : -1; // who led a moment before the lock (for "Last-second bump!")
      const before = b.lockLeft;
      b.lockLeft -= dt;
      for (const s of [1.5, 1.0, 0.5]) if (before > s && b.lockLeft <= s) Sfx.play('rouletteTick');
      if (b.lockLeft <= 0 && b.hopAirT <= 0) rouletteLock(b, live);
    } else if (b.state === 'pay') {
      b.payT += dt;
      if (b.payT >= P.payT) b.state = 'done';
    }
  }
  function rouletteCall(b) {
    const st = G.mst, w = ROULETTE_WEDGES[b.wedge];
    st.call = { text: w.name.toUpperCase() + '!', col: w.txt || w.col, wedge: b.wedge, t: 0 };
    st.litT[b.wedge] = 0;                         // the symbol stamps in
    st.stat.calls[b.wedge]++;
    const a = b.wedge * Math.PI / 3, q = rouletteProj(168 * Math.cos(a), 168 * Math.sin(a));
    burst(q.x, q.y, w.txt || w.col, 14); burst(q.x, q.y, '#ffffff', 6);
    Sfx.play('rouletteCall');
  }
  function rouletteWedgeOf(s) { return rouletteWedgeAt(Math.atan2(s.v, s.u)); }
  // who would win this ball's chip right now: { k, how } or null
  function rouletteLeader(b) {
    const st = G.mst, on = [0, 1].filter(k => rouletteWedgeOf(st.pl[k]) === b.wedge);
    if (!on.length) {   // (revision) nobody on the color: the one nearer the ball (the lock ring shows it), so no spin is ever wasted
      if (!st.P.nearest) return null;
      const q = rouletteBallUV(b), d = [0, 1].map(k => Math.hypot(st.pl[k].u - q.u, st.pl[k].v - q.v));
      return { k: Math.abs(d[0] - d[1]) < 0.5 ? (G.tickN || 0) & 1 : d[0] < d[1] ? 0 : 1, how: 'near' };
    }
    if (on.length === 1) return { k: on[0], how: 'alone' };
    const q = rouletteBallUV(b), d = on.map(k => Math.hypot(st.pl[k].u - q.u, st.pl[k].v - q.v));
    if (Math.abs(d[0] - d[1]) < 0.5) return { k: (G.tickN || 0) & 1, how: 'closer' };
    return { k: d[0] < d[1] ? 0 : 1, how: 'closer' };
  }
  function rouletteLock(b, live) {
    const st = G.mst, P = st.P;
    b.state = 'pay'; b.payT = 0;
    const w = live ? rouletteLeader(b) : null;
    b.win = w;
    const uv = rouletteBallUV(b), q = rouletteProj(uv.u, uv.v);
    Sfx.play('rouletteLock');
    if (!w) {
      roulettePop({ text: 'No chip!', x: q.x, y: q.y - 30, col: C.paper, t: 0 });
      Sfx.play('rouletteNoChip', 0); st.stat.nochip++;
      return;
    }
    const k = w.k, j = 1 - k, o = st.pl[j];
    st.chips[k]++; st.stat.ballChips[k]++; st.stat.colorWins[b.wedge]++;
    // how it was won (for the round banner): a bump by the winner on the loser in the last bumpCredit s counts
    const bumped = o.hitBy === k && o.hitAgo <= P.bumpCredit, offIt = rouletteWedgeOf(o) !== b.wedge;
    const nm = ROULETTE_WEDGES[b.wedge].name;
    const how = bumped && offIt && o.hitOn === b.wedge ? 'Bumped ' + NAMES[j] + ' off the ' + nm + '!' : bumped && b.lead1 === j ? 'Last-second bump!' :
      w.how === 'alone' ? 'Alone on the ' + nm + '!' : w.how === 'near' ? 'Nearest to the ball!' : 'Closest to the ball!';
    if (bumped && ((offIt && o.hitOn === b.wedge) || b.lead1 === j)) st.stat.steals[k]++;
    st.flying.push({ k, t: 0, x0: q.x, y0: q.y - 8, slot: st.chips[k] - 1 });
    burst(q.x, q.y - 6, C.gold, 14); rouletteSpark(q.x, q.y - 10, 2);
    rumble(k, 0.2, 0.5, 140);
    if (st.chips[k] >= P.chips) { st.ended = true; matchRoundEnd(k, how); return; } // the winning chip comes first
    // the runner-up on the lit color gets a pretend ticket; `tickets` tickets turn into a chip
    if (P.tickets > 0 && w.how === 'closer') {
      st.tix[j]++; st.stat.tix[j]++;
      const pj = G.players[j], hy = pj.y + pj.h - pj.h * rouletteSpriteS();
      roulettePop({ text: 'Ticket!', x: pj.x + pj.w / 2, y: hy - 14, col: ROULETTE_COLS.ticket, t: 0 });
      Sfx.play('rouletteTicket', j);
      if (st.tix[j] >= P.tickets) {
        st.tix[j] = 0; st.chips[j]++; st.stat.tixChips[j]++;
        st.flying.push({ k: j, t: -0.25, x0: pj.x + pj.w / 2, y0: pj.y, slot: st.chips[j] - 1, ticket: true });
        if (st.chips[j] >= P.chips) { st.ended = true; matchRoundEnd(j, 'Saved up tickets!'); }
      }
    }
  }
  function rouletteSync() {
    const st = G.mst;
    for (const k of [0, 1]) {
      const s = st.pl[k], p = G.players[k], q = rouletteProj(s.u, s.v);
      p.x = q.x - p.w / 2; p.y = q.y - p.h; p.vy = 0; p.vx = 0; p.grounded = true; p.alive = true;
      p.stun = s.stun;
      if (s.dir.x > 0.3) p.face = 1; else if (s.dir.x < -0.3) p.face = -1;
    }
  }

  // the whole tick (live: inputs and rules on; otherwise the world just moves: banner time)
  function rouletteTick(dt, live) {
    const st = G.mst, P = st.P;
    st.t += dt;
    if (live) { rouletteShoes(); rouletteHintTick(dt); }
    if (live) st.w = Math.min(P.spin, (st.w || 0) + P.spin * dt / P.spinUp);   // the wheel spins up over spinUp s after GO
    else st.w = Math.max(0, (st.w || 0) - P.spin * dt / P.spinDown);           // (revision) and coasts to a stop in the round-end banner
    st.th += st.w * dt;
    for (const k of [0, 1]) rouletteMove(k, dt, live);
    rouletteCollide();
    for (const b of st.balls) rouletteBall(b, dt, live && !st.ended);
    if (live && !st.ended && st.balls.length && st.balls.every(b => b.state === 'done')) {
      if (st.spinN >= P.maxSpins) rouletteCapEnd();
      else rouletteStartSpin();
    }
    rouletteFx(dt);
    rouletteSync();
  }
  // Lucky Shoes: whoever has won clearly fewer chips this match runs a bit faster and bumps harder (gold = help)
  function rouletteShoes() {
    const st = G.mst, P = st.P, c = st.stat.ballChips, tot = c[0] + c[1];
    for (const k of [0, 1]) {
      let b = 0;
      if (!G.match.suddenDeath && tot >= P.shoeMin && P.shoeHi > P.shoeLo) b = clamp((P.shoeHi - c[k] / tot) / (P.shoeHi - P.shoeLo), 0, 1);
      if (b < P.shoeShow) b = 0;        // optional floor (0 = off: any help shows as shoes)
      st.shoe[k] = b;
      if (b > 0 && !st.shoeSaid[k]) {
        st.shoeSaid[k] = true; const p = G.players[k];
        roulettePop({ text: 'Lucky shoes!', x: p.x + p.w / 2, y: p.y - 46, col: C.gold, t: 0, gold: true });
        Sfx.play('rouletteLucky', k);
      }
    }
  }
  // a shy player who hasn't bumped once 10 s into the match (and is near the other one, or got bumped) gets one friendly
  // bubble with their own key: "Press F to bump!" (once per match; it goes away at their first bump)
  function rouletteHintTick(dt) {
    const st = G.mst, s = st.stat;
    for (const k of [0, 1]) {
      if (s.tries[k] > 0) { st.hintT[k] = 0; continue; }
      if (typeof cpuSolo === 'function' && cpuSolo() && cpuOn(k)) continue;   // 1-player mode: no key hint over the computer
      st.noBumpT[k] += dt;
      if (st.hintT[k] > 0) { st.hintT[k] -= dt; continue; }
      if (!st.hinted[k] && st.noBumpT[k] > 10) {
        const a = st.pl[k], o = st.pl[1 - k];
        if (s.landed[1 - k] > 0 || Math.hypot(a.u - o.u, a.v - o.v) < 120) { st.hinted[k] = true; st.hintT[k] = 3.5; }
      }
    }
  }
  function rouletteHintText(k) {
    let how = 'kb'; try { how = actKey(k); } catch (e) { /* keyboard */ }
    return how === 'pad' ? 'Press ' + glyph('act') + ' to bump!' : how === 'touch' ? 'Tap the bump button!' : 'Press ' + (k === 0 ? 'F' : '/') + ' to bump!';
  }
  // every chip won this match: at the ball + from tickets (what players see: the "Chips won" tile and the tiebreak)
  function rouletteChipsWon() { const s = G.mst.stat; return [0, 1].map(k => s.ballChips[k] + s.tixChips[k]); }
  function rouletteCapEnd() {
    const st = G.mst, c = st.chips;
    if (c[0] !== c[1]) matchRoundEnd(c[0] > c[1] ? 0 : 1, 'More chips after ' + st.P.maxSpins + ' spins!');
    else matchRoundEnd(-1, 'Dead even!');
    st.ended = true;
  }
  // (revision) a text pop that never lands on another live one: it moves up a line for each pop still near that spot
  function roulettePop(q) {
    const st = G.mst, gap = rouletteBig() ? 26 : 20;
    for (let n = 0; n < 8 && q.y > 70; n++) {   // (a rare pile-up near the top just stops there)
      const hit = st.pops.some(o => o.t < 0.85 && Math.abs(o.x - q.x) < 50 && Math.abs((o.y - o.t * 34) - q.y) < gap);
      if (!hit) break;
      q.y -= gap;
    }
    st.pops.push(q);
  }
  // a little white star flash (clacks, launches, bumps); s = size
  function rouletteSpark(x, y, s) { const st = G.mst; if (st.sparks && st.sparks.length < 24) st.sparks.push({ x, y, s, t: 0 }); }
  function rouletteFx(dt) {
    const st = G.mst;
    for (const f of st.flying) {
      f.t += dt;
      if (f.t >= 0.6 && !f.landed) { f.landed = true; st.shown[f.k]++; st.stackPop[f.k] = 0; Sfx.play('rouletteChip', f.k); }
    }
    st.flying = st.flying.filter(f => f.t < 0.7);
    for (const q of st.pops) q.t += dt;
    st.pops = st.pops.filter(q => q.t < 0.9);
    for (const q of st.sparks) q.t += dt;
    st.sparks = st.sparks.filter(q => q.t < 0.28);
    if (st.call) { st.call.t += dt; if (st.call.t > 1.1) st.call = null; }
    for (let i = 0; i < 6; i++) st.litT[i] += dt;
    for (const k of [0, 1]) st.stackPop[k] += dt;
    for (const pg of st.pegs || []) pg.hitT = (pg.hitT || 0) + dt;
    for (const b of st.balls || []) if (b.ping !== undefined) b.ping += dt;
  }

  MODES.roulette = {
    rand: Math.random,
    setup(st, L) {
      // the map is decoration only: read the wheel centre ('y') and blank the grid so the core draws and collides with nothing
      st.cx = ROULETTE.cx; st.cy = ROULETTE.cy;
      L.grid.forEach((row, ty) => row.forEach((ch, tx) => { if (ch === 'y') { st.cx = tx * T; st.cy = ty * T + ROULETTE.cyOff; } }));
      for (const row of L.grid) row.fill('.');
      st.stat = { ballChips: [0, 0], landed: [0, 0], tries: [0, 0], whiffs: [0, 0], tix: [0, 0], tixChips: [0, 0], first: [0, 0], steals: [0, 0], clashes: 0, spins: 0, nochip: 0,
        calls: [0, 0, 0, 0, 0, 0], colorWins: [0, 0, 0, 0, 0, 0] };
      const mix = ROULETTE_MIX.slice();
      for (let i = mix.length - 1; i > 0; i--) { const j = Math.floor(this.rand() * (i + 1)); [mix[i], mix[j]] = [mix[j], mix[i]]; }
      st.order = ['classic', ...mix, 'double', mix[0], mix[1]];   // best of 7: rounds 6 and 7 repeat the shuffle (never the same twist twice in a row)
      st.over = this.testOver || null; st.forceTwist = this.testTwist || null;
      st.th = 0; st.t = 0; st.balls = []; st.flying = []; st.pops = []; st.pegs = []; st.sparks = [];
      st.litT = [9, 9, 9, 9, 9, 9]; st.stackPop = [9, 9];
      st.hinted = [false, false]; st.noBumpT = [0, 0]; st.hintT = [0, 0]; st.didAct = [false, false];
    },
    resetRound(n, info) {
      const st = G.mst, m = G.match;
      st.twist = info.suddenDeath ? 'sudden' : (st.forceTwist || st.order[Math.min(n, st.order.length) - 1]);
      st.P = Object.assign({}, ROULETTE, ROULETTE_TWISTS[st.twist].P, st.over || {});
      st.w = 0; st.t = 0; st.spinN = 0; st.ended = false; st.balls = []; st.flying = []; st.pops = []; st.call = null; st.sparks = [];
      // (revision) st.th carries on from the last round (the wheel coasted to a stop in the banner): it never snaps back
      st.litT = [9, 9, 9, 9, 9, 9]; st.stackPop = [9, 9];
      st.pl = [0, 1].map(k => rouletteMakePl(k));
      st.hintT = [0, 0];
      const P = st.P;
      if (!st.tix || !P.ticketsKeep) st.tix = [0, 0];
      st.chips = [0, 0]; st.lucky = [0, 0]; st.shoe = [0, 0]; st.shoeSaid = [false, false];   // lucky[k] = gold Lucky chips k starts with
      for (const k of [0, 1]) {
        const behind = m.wins[1 - k] - m.wins[k], c = st.stat.ballChips, tot = c[0] + c[1];
        const weak = tot >= P.shoeMin && c[k] / tot < P.luckyShare && behind >= 0;
        // (revision) far behind on chips: a second gold chip (a young kid against a grown-up still gets a real shot). This one
        // counts ticket chips too, so a player who only farms tickets is never "far behind" (that was a free 2-chip head start)
        const all = rouletteChipsWon(), tot2 = all[0] + all[1];
        const far = tot2 >= P.lucky2Min && all[k] / tot2 < P.lucky2Share && behind >= 0;
        if (!info.suddenDeath && st.didAct[k] && (behind >= P.luckyMin || weak)) { st.chips[k] = P.luckyChips + (far ? 1 : 0); st.lucky[k] = st.chips[k]; }
      }
      st.didAct = [false, false];
      st.shown = st.chips.slice(); st.luckySaid = false;
      st.pegs = P.pegs ? [-Math.PI / 6, Math.PI / 2, Math.PI * 7 / 6].map(a => a - st.th).map(a => ({ u: P.pegPos * Math.cos(a), v: P.pegPos * Math.sin(a), hitT: 9 })) : [];  // same spots on screen at GO
      rouletteSync();
    },
    go() { rouletteStartSpin(); },
    step(dt) { rouletteTick(dt, true); },
    idle(dt) {
      const st = G.mst, m = G.match; if (!st.pl) return;
      if (m.phase === 'end') rouletteTick(dt, false);
      else { rouletteSync(); rouletteFx(dt); } // the wheel stands still for "Round N" and 3-2-1, players left and right
      if (m.phase === 'count' && !st.luckySaid && m.t >= 0.05) {
        st.luckySaid = true;
        for (const k of [0, 1]) if (st.lucky[k]) {
          const p = G.players[k];
          roulettePop({ text: st.lucky[k] > 1 ? 'Lucky chips!' : 'Lucky chip!', x: p.x + p.w / 2, y: p.y - 46, col: C.gold, t: 0, gold: true });
          Sfx.play('rouletteLucky', k);
        }
      }
    },
    tiebreak() {
      const s = G.mst.stat, c = rouletteChipsWon();
      if (c[0] !== c[1]) return { winner: c[0] > c[1] ? 0 : 1, reason: 'Most chips this match!' };
      if (s.landed[0] !== s.landed[1]) return { winner: s.landed[0] > s.landed[1] ? 0 : 1, reason: 'Most bumps this match!' };
      return -1;
    },
    // draw() paints the whole arena; the players are hidden from the engine's own pass (alive off between draw and
    // drawTop) and drawn in drawTop in painter's order with the turret, pegs and balls, a little bigger (the 3/4 view)
    draw() { rouletteDrawWorld(); rouletteHide(true); },
    drawTop() { rouletteHide(false); rouletteDrawTop(); },
    hud() { rouletteHud(); },
    stats() {
      const s = G.mst.stat;
      let best = 0; for (let i = 1; i < 6; i++) if (s.colorWins[i] > s.colorWins[best]) best = i;
      const tiles = [
        { label: 'Chips won', values: rouletteChipsWon() },   // at the ball + from tickets
        { label: 'Bumps landed', values: s.landed.slice() },
        { label: 'Got there first', values: s.first.slice() },
        { label: 'Bump steals', values: s.steals.slice() },
      ].filter((t, i) => i < 2 || t.values[0] + t.values[1] > 0);   // C6: drop all-zero tiles, keep at least 2
      return [...tiles,
        s.colorWins[best] > 0 ? 'Luckiest color: ' + ROULETTE_WEDGES[best].name + ' (' + s.colorWins[best] + ' chips)' : 'Spins in all: ' + s.spins,
      ];
    },
    // test hooks (C8): testOver = P overrides, testTwist = force every round's twist, testTouch = [bool, bool]
    testOver: null, testTwist: null, testTouch: null,
    test: { wedgeAt: rouletteWedgeAt, pocketA: roulettePocketA, ballUV: rouletteBallUV, proj: rouletteProj, pop: q => roulettePop(q), ROULETTE, WEDGES: ROULETTE_WEDGES },
  };

  /* ---------- drawing ---------- */
  function rouletteShade(hex, f) { // f < 0 darker, > 0 lighter
    const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const m = v => Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f);
    return 'rgb(' + m(r) + ',' + m(g) + ',' + m(b) + ')';
  }
  function rouletteSymPath(sym, s) { // the path of a symbol of size s at the origin
    ctx.beginPath();
    if (sym === 'star') { for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? s * 0.45 : s; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); }
    else if (sym === 'heart') { ctx.moveTo(0, s * 0.9); ctx.bezierCurveTo(-s * 1.3, -s * 0.1, -s * 0.55, -s * 1.0, 0, -s * 0.35); ctx.bezierCurveTo(s * 0.55, -s * 1.0, s * 1.3, -s * 0.1, 0, s * 0.9); ctx.closePath(); }
    else if (sym === 'clover') { for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + i * ROULETTE_TAU / 3, x = Math.cos(a) * s * 0.45, y = Math.sin(a) * s * 0.45; ctx.moveTo(x + s * 0.42, y); ctx.arc(x, y, s * 0.42, 0, ROULETTE_TAU); } ctx.rect(-s * 0.08, 0, s * 0.16, s); }
    else if (sym === 'moon') { ctx.arc(0, 0, s * 0.85, -2.2, 2.2, true); ctx.arc(s * 0.45, 0, s * 0.62, 1.95, -1.95, false); ctx.closePath(); }
    else if (sym === 'diamond') { ctx.moveTo(0, -s); ctx.lineTo(s * 0.7, 0); ctx.lineTo(0, s); ctx.lineTo(-s * 0.7, 0); ctx.closePath(); }
    else if (sym === 'crown') { ctx.moveTo(-s, s * 0.6); ctx.lineTo(-s, -s * 0.4); ctx.lineTo(-s * 0.5, s * 0.05); ctx.lineTo(0, -s * 0.75); ctx.lineTo(s * 0.5, s * 0.05); ctx.lineTo(s, -s * 0.4); ctx.lineTo(s, s * 0.6); ctx.closePath(); }
  }
  function rouletteSym(sym, s, col, edge) {
    rouletteSymPath(sym, s);
    if (edge) { ctx.strokeStyle = edge; ctx.lineWidth = s * 0.22; ctx.lineJoin = 'round'; ctx.stroke(); }
    ctx.fillStyle = col; ctx.fill();
  }
  // which wedges are lit now: a ball sitting in a pocket, dropping in (callEarly) or just paid out
  function rouletteLit() {
    const st = G.mst, P = rouletteP(), lit = new Set();
    for (const b of st.balls || []) if (b.wedge >= 0 && (b.state === 'set' || (b.state === 'drop' && P.callEarly) || (b.state === 'pay' && b.payT < 0.7))) lit.add(b.wedge);
    return lit;
  }
  function rouletteDrawWorld() {
    const st = G.mst, P = rouletteP(), K = ROULETTE_COLS, cx = st.cx, cy = st.cy, clk = G.clock;
    // the carnival tent: velvet with folds, a marquee of chasing bulbs, the green felt table
    // (a cached picture) velvet curtain: the dark-to-light drop, then rounded folds, each lit on its left and shaded on its
    // right with a soft sheen line down the crest, and a darker hem at the foot
    const vel = paLayer('roulvelvet|' + K.velvet + K.velvetDk, W, H, g => {
      const vg = g.createLinearGradient(0, 0, 0, H); vg.addColorStop(0, K.velvetDk); vg.addColorStop(1, K.velvet);
      g.fillStyle = vg; g.fillRect(0, 0, W, H);
      for (let x = 0; x < W; x += 40) {
        const fg = g.createLinearGradient(x, 0, x + 40, 0);
        fg.addColorStop(0, 'rgba(0,0,0,0.1)'); fg.addColorStop(0.3, 'rgba(255,255,255,0.06)'); fg.addColorStop(0.5, 'rgba(255,255,255,0.02)'); fg.addColorStop(0.8, 'rgba(0,0,0,0.12)'); fg.addColorStop(1, 'rgba(0,0,0,0.16)');
        g.fillStyle = fg; g.fillRect(x, 0, 40, H);
        g.fillStyle = 'rgba(255,255,255,0.07)'; g.fillRect(x + 11, 0, 1.5, H);
      }
      for (let i = 0; i < 260; i++) { const h = hash(i, 851); g.fillStyle = (h >>> 20) % 3 ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.06)'; g.fillRect(h % W, (h >>> 10) % H, 1.2, 2.5); }
      const hg = g.createLinearGradient(0, H - 70, 0, H); hg.addColorStop(0, 'rgba(0,0,0,0)'); hg.addColorStop(1, 'rgba(0,0,0,0.22)');
      g.fillStyle = hg; g.fillRect(0, H - 70, W, 70);
    });
    { const sm = ctx.imageSmoothingEnabled, m = ctx.getTransform(); if (vel.width === canvas.width && m.a === vel.width / W && m.b === 0 && m.c === 0) ctx.imageSmoothingEnabled = false; ctx.drawImage(vel, 0, 0, W, H); ctx.imageSmoothingEnabled = sm; }
    ctx.fillStyle = '#c2304f'; ctx.fillRect(0, 0, W, 30); ctx.fillStyle = K.gold; ctx.fillRect(0, 28, W, 4);
    for (let x = 15, i = 0; x < W; x += 30, i++) {
      const on = (i + Math.floor(clk * 6)) % 3 === 0;
      ctx.fillStyle = on ? K.bulb : K.bulbOff; circle(x, 15, 5); ctx.fill();
      if (on) { ctx.fillStyle = 'rgba(255,240,180,0.25)'; circle(x, 15, 10); ctx.fill(); }
    }
    if (!st.pl) return;
    const lit = rouletteLit(), anyLit = lit.size > 0, litCol = anyLit ? ROULETTE_WEDGES[[...lit][0]].col : null;
    // the felt table and the wooden bowl frame never move: one cached picture (felt nap, a padded rail, a lit rim, wood
    // grain rings, a lit top bevel, a shaded foot, bulb sockets), the bulbs and the track drawn live on top
    const tk = P.k, tw = 844, th = Math.ceil(30 + 870 * tk);
    paStamp('roultable|' + tk + '|' + P.frameR + '|' + P.trackR, cx - 422, cy - 425 * tk, tw, th, 2, g2 => {
      g2.translate(422, 425 * tk);
      g2.save(); g2.translate(0, 16); g2.scale(1, tk);
      g2.fillStyle = K.feltDk; paCirc(g2, 0, 18, 420); g2.fill();
      g2.strokeStyle = '#0c3a26'; g2.lineWidth = 2; g2.stroke();
      g2.fillStyle = K.felt; paCirc(g2, 0, 0, 415); g2.fill();
      const fg = g2.createRadialGradient(-80, -120, 60, 0, 0, 415); fg.addColorStop(0, 'rgba(255,255,255,0.06)'); fg.addColorStop(0.7, 'rgba(0,0,0,0)'); fg.addColorStop(1, 'rgba(0,30,20,0.25)');
      g2.fillStyle = fg; paCirc(g2, 0, 0, 415); g2.fill();
      for (let i = 0; i < 700; i++) {
        const hh = hash(i, 823), a = (hh % 6283) / 1000, r = 345 + (hh >>> 13) % 68;
        g2.fillStyle = (hh >>> 26) % 3 ? 'rgba(10,60,40,0.55)' : 'rgba(120,210,160,0.35)'; g2.fillRect(Math.cos(a) * r, Math.sin(a) * r, 1.6, 1.6);
      }
      g2.strokeStyle = 'rgba(255,255,255,0.14)'; g2.lineWidth = 3; g2.beginPath(); g2.arc(0, 0, 412, Math.PI * 1.05, Math.PI * 1.95); g2.stroke();
      g2.strokeStyle = 'rgba(255,215,120,0.5)'; g2.lineWidth = 3; paCirc(g2, 0, 0, 398); g2.stroke();
      g2.strokeStyle = 'rgba(255,215,120,0.22)'; g2.lineWidth = 1.2; paCirc(g2, 0, 0, 392); g2.stroke();
      g2.restore();
      g2.save(); g2.scale(1, tk);
      g2.fillStyle = K.woodDk; paCirc(g2, 0, 34, P.frameR); g2.fill();
      g2.strokeStyle = '#3a1c0e'; g2.lineWidth = 2; g2.stroke();
      // the bowl's side: vertical staves with a soft sheen
      g2.save(); paCirc(g2, 0, 34, P.frameR); g2.clip();
      g2.strokeStyle = 'rgba(0,0,0,0.18)'; g2.lineWidth = 1.5; g2.beginPath();
      for (let i = 0; i < 36; i++) { const a = i * Math.PI / 36, x = Math.cos(a) * P.frameR; g2.moveTo(x, Math.sin(a) * P.frameR); g2.lineTo(x, Math.sin(a) * P.frameR + 34); }
      g2.stroke(); g2.restore();
      g2.fillStyle = K.wood; paCirc(g2, 0, 0, P.frameR); g2.fill();
      // grain: broken rings of darker and lighter wood
      for (let i = 0; i < 26; i++) {
        const hh = hash(i, 829), r = P.trackR + 16 + hh % Math.max(1, P.frameR - P.trackR - 20), a0 = (hh >>> 8) % 628 / 100, len = 0.4 + (hh >>> 16) % 120 / 100;
        g2.strokeStyle = (hh >>> 24) % 2 ? 'rgba(60,24,10,0.35)' : 'rgba(255,190,130,0.18)'; g2.lineWidth = 1 + (hh >>> 28) % 2;
        g2.beginPath(); g2.arc(0, 0, r, a0, a0 + len); g2.stroke();
      }
      g2.strokeStyle = 'rgba(255,255,255,0.22)'; g2.lineWidth = 3; g2.beginPath(); g2.arc(0, 0, P.frameR - 2, Math.PI * 1.02, Math.PI * 1.98); g2.stroke();
      g2.strokeStyle = 'rgba(40,14,4,0.35)'; g2.lineWidth = 3; g2.beginPath(); g2.arc(0, 0, P.frameR - 2, Math.PI * 0.05, Math.PI * 0.95); g2.stroke();
      g2.strokeStyle = K.woodHi; g2.lineWidth = 4; paCirc(g2, 0, 0, P.frameR - 6); g2.stroke();
      for (let i = 0; i < 24; i++) {
        const a = i * ROULETTE_TAU / 24, x = Math.cos(a) * (P.frameR - 15), y = Math.sin(a) * (P.frameR - 15);
        g2.fillStyle = '#3a1c0e'; paCirc(g2, x, y, 7.5); g2.fill();
        g2.strokeStyle = K.goldDk; g2.lineWidth = 1.5; paCirc(g2, x, y, 7.5); g2.stroke();
      }
      g2.strokeStyle = '#3a1c0e'; g2.lineWidth = 2.5; paCirc(g2, 0, 0, P.frameR); g2.stroke();
      g2.restore();
    });
    // the bowl: side, wooden frame with bulbs, the ball track (none of these turn)
    ctx.save(); ctx.translate(cx, cy); ctx.scale(1, P.k);
    // 24 frame bulbs: they chase round the way the ball rolls while it rolls, and flash in the lit color once it lands
    const rolling = (st.balls || []).some(b => b.state === 'roll');
    const chase = Math.floor(clk * (rolling ? 16 : 5)), blink = reduceMotion ? 0 : Math.floor(clk * 5) % 2;   // blinks at 2.5 Hz (steady with reduce motion)
    for (let i = 0; i < 24; i++) {
      const a = i * ROULETTE_TAU / 24, x = Math.cos(a) * (P.frameR - 15), y = Math.sin(a) * (P.frameR - 15);
      const on = anyLit ? (i % 2 === blink) : ((i + chase) % 4 === 0);
      ctx.fillStyle = on ? (anyLit ? litCol : K.bulb) : K.bulbOff; circle(x, y, 5); ctx.fill();
      if (on) { ctx.fillStyle = anyLit ? 'rgba(255,255,255,0.35)' : 'rgba(255,240,180,0.3)'; circle(x, y, 9); ctx.fill(); }
    }
    ctx.fillStyle = K.track; circle(0, 0, P.trackR + 14); ctx.fill();
    ctx.strokeStyle = K.trackDk; ctx.lineWidth = 3; circle(0, 0, P.trackR + 13); ctx.stroke();
    ctx.fillStyle = K.trackDk; circle(0, 0, P.R + 4); ctx.fill();
    for (let i = 0; i < 8; i++) {  // the diamonds the ball rattles over
      const a = ROULETTE_DIAMOND0 + i * ROULETTE_TAU / 8, x = Math.cos(a) * (P.trackR + 2), y = Math.sin(a) * (P.trackR + 2);
      ctx.save(); ctx.translate(x, y); ctx.rotate(a);
      ctx.fillStyle = K.goldDk; ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(0, -5); ctx.lineTo(9, 0); ctx.lineTo(0, 5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = K.gold; ctx.beginPath(); ctx.moveTo(-7, -0.5); ctx.lineTo(0, -4); ctx.lineTo(7, -0.5); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    // the wheel head (turns): six wedges, pocket frets, symbols
    ctx.rotate(st.th);
    for (let i = 0; i < 6; i++) {
      const w = ROULETTE_WEDGES[i], a0 = i * Math.PI / 3 - Math.PI / 6, a1 = a0 + Math.PI / 3, on = lit.has(i);
      ctx.fillStyle = on ? rouletteShade(w.col, 0.14 + 0.1 * Math.sin(clk * 10)) : anyLit ? rouletteShade(w.col, -0.4) : w.col;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, P.R, a0, a1); ctx.closePath(); ctx.fill();
      // pocket ring: a darker band with frets
      ctx.fillStyle = on ? rouletteShade(w.dk, 0.15) : anyLit ? rouletteShade(w.dk, -0.4) : w.dk;
      ctx.beginPath(); ctx.arc(0, 0, P.R, a0, a1); ctx.arc(0, 0, P.pocketR - 16, a1, a0, true); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,230,160,0.8)'; ctx.lineWidth = 2;
      for (let j = 1; j < 4; j++) { const a = a0 + j * Math.PI / 12; ctx.beginPath(); ctx.moveTo(Math.cos(a) * (P.pocketR - 16), Math.sin(a) * (P.pocketR - 16)); ctx.lineTo(Math.cos(a) * P.R, Math.sin(a) * P.R); ctx.stroke(); }
    }
    // (richer props) the lacquered floor: a soft sheen ring and a darker ring toward the pockets, the step down into the
    // pockets (a shadow under the inner lip and a lit outer rim), a shadow beside every fret
    // (the rings are round, so they don't turn: one cached picture, already squashed to the 3/4 view, copied flat)
    ctx.save(); ctx.rotate(-st.th); ctx.scale(1, 1 / P.k);
    paStamp('roulrings|' + P.k + '|' + P.R + '|' + P.pocketR + '|' + P.hubR, -P.R - 2, -(P.R + 2) * P.k, 2 * P.R + 4, Math.ceil(2 * (P.R + 2) * P.k), 2, g2 => {
      g2.translate(P.R + 2, (P.R + 2) * P.k); g2.scale(1, P.k);
      const ring = (r, w, col) => { g2.strokeStyle = col; g2.lineWidth = w; paCirc(g2, 0, 0, r); g2.stroke(); };
      ring(P.hubR + (P.pocketR - 16 - P.hubR) * 0.45, 34, 'rgba(255,255,255,0.07)');
      ring(P.hubR + (P.pocketR - 16 - P.hubR) * 0.45 - 4, 10, 'rgba(255,255,255,0.05)');
      ring(P.pocketR - 24, 14, 'rgba(20,10,30,0.12)');
      ring(P.pocketR - 13, 6, 'rgba(20,10,30,0.28)');
      ring(P.R - 1.5, 2, 'rgba(255,255,255,0.22)');
    });
    ctx.restore();
    ctx.strokeStyle = 'rgba(20,10,30,0.3)'; ctx.lineWidth = 2; ctx.beginPath();
    for (let j = 0; j < 24; j++) { if (j % 4 === 0) continue; const a = -Math.PI / 6 + j * Math.PI / 12 + 0.012; ctx.moveTo(Math.cos(a) * (P.pocketR - 16), Math.sin(a) * (P.pocketR - 16)); ctx.lineTo(Math.cos(a) * P.R, Math.sin(a) * P.R); }
    ctx.stroke();
    // gold wedge borders (a dark bed, the gold bar, a lit line along it) and the pocket ring line
    ctx.lineCap = 'round';
    ctx.strokeStyle = K.goldDk; ctx.lineWidth = 5.5;
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 - Math.PI / 6; ctx.beginPath(); ctx.moveTo(Math.cos(a) * P.hubR, Math.sin(a) * P.hubR); ctx.lineTo(Math.cos(a) * P.R, Math.sin(a) * P.R); ctx.stroke(); }
    ctx.strokeStyle = K.gold; ctx.lineWidth = 3;
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 - Math.PI / 6; ctx.beginPath(); ctx.moveTo(Math.cos(a) * P.hubR, Math.sin(a) * P.hubR); ctx.lineTo(Math.cos(a) * P.R, Math.sin(a) * P.R); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(255,250,220,0.6)'; ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 - Math.PI / 6 - 0.006; ctx.beginPath(); ctx.moveTo(Math.cos(a) * P.hubR, Math.sin(a) * P.hubR); ctx.lineTo(Math.cos(a) * (P.R - 2), Math.sin(a) * (P.R - 2)); ctx.stroke(); }
    ctx.lineCap = 'butt';
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 - Math.PI / 6; paStamp('roulstud', Math.cos(a) * (P.pocketR - 16) - 3.2, Math.sin(a) * (P.pocketR - 16) - 3.2, 6.4, 6.4, 1, g2 => paStud(g2, 3.2, 3.2, 3.2, '#ffd34a', { collar: false })); }
    ctx.strokeStyle = 'rgba(255,230,160,0.9)'; ctx.lineWidth = 2; circle(0, 0, P.pocketR - 16); ctx.stroke();
    // a fast wheel shows speed streaks
    if (st.w > 0.6) {
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.1 + 0.12 * (st.w - 0.6) / 0.4).toFixed(3) + ')'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + 0.25, r = 110 + (i % 3) * 45; ctx.beginPath(); ctx.arc(0, 0, r, a - 0.5, a); ctx.stroke(); }
      ctx.lineCap = 'butt';
    }
    // the lit wedge: a glowing white edge and chasing bulbs round its rim
    for (const i of lit) {
      const a0 = i * Math.PI / 3 - Math.PI / 6, a1 = a0 + Math.PI / 3;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 16; ctx.beginPath(); ctx.moveTo(Math.cos(a0) * P.hubR, Math.sin(a0) * P.hubR); ctx.arc(0, 0, P.R - 6, a0, a1); ctx.lineTo(Math.cos(a1) * P.hubR, Math.sin(a1) * P.hubR); ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(Math.cos(a0) * P.hubR, Math.sin(a0) * P.hubR); ctx.arc(0, 0, P.R - 3, a0, a1); ctx.lineTo(Math.cos(a1) * P.hubR, Math.sin(a1) * P.hubR); ctx.stroke();
      const ch = Math.floor(clk * 12);
      for (let j = 0; j < 9; j++) {
        const a = a0 + (j + 0.5) * Math.PI / 27, on = (j + ch) % 3 === 0;
        ctx.fillStyle = on ? '#ffffff' : K.gold; circle(Math.cos(a) * (P.R - 9), Math.sin(a) * (P.R - 9), on ? 5 : 3.5); ctx.fill();
      }
    }
    // the symbols, painted on the floor (kept upright); the lit one stamps in big and keeps a gentle pulse
    for (let i = 0; i < 6; i++) {
      const w = ROULETTE_WEDGES[i], am = i * Math.PI / 3, on = lit.has(i), t = st.litT[i];
      let sc = 1;
      if (on) sc = t < 0.4 ? 1 + 0.7 * Math.sin(Math.min(1, t / 0.4) * Math.PI) * (1 - t / 0.8) + 0.12 * (t / 0.4) : 1.12 + 0.06 * Math.sin(clk * 8);
      ctx.save(); ctx.translate(Math.cos(am) * 168, Math.sin(am) * 168); ctx.rotate(-st.th); ctx.scale(sc, sc * 1.15);
      ctx.globalAlpha = on ? 1 : anyLit ? 0.45 : 0.85;
      // an inlaid symbol: a dark cut under it, the symbol, then a lit upper edge
      ctx.save(); ctx.translate(1.5, 2); rouletteSymPath(w.sym, 34); ctx.fillStyle = 'rgba(20,10,30,0.28)'; ctx.fill(); ctx.restore();
      ctx.save(); ctx.translate(-1, -1.3); rouletteSymPath(w.sym, 34); ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fill(); ctx.restore();
      rouletteSym(w.sym, 34, w.ink, on ? '#ffffff' : null);
      ctx.restore();
    }
    // hub base
    ctx.fillStyle = K.goldDk; circle(0, 0, P.hubR + 4); ctx.fill();
    ctx.fillStyle = K.gold; ctx.beginPath(); ctx.arc(0, 0, P.hubR + 2.5, Math.PI * 0.9, Math.PI * 1.9); ctx.arc(0, 0, P.hubR, Math.PI * 1.9, Math.PI * 0.9, true); ctx.fill();
    ctx.fillStyle = K.wood; circle(0, 0, P.hubR); ctx.fill();
    ctx.strokeStyle = 'rgba(60,24,10,0.4)'; ctx.lineWidth = 1.2;
    for (const r of [P.hubR * 0.35, P.hubR * 0.6, P.hubR * 0.82]) { ctx.beginPath(); ctx.arc(0, 0, r, 0.3, 2.4); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, r + 2, 3.4, 5.6); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, P.hubR - 2, Math.PI * 1.05, Math.PI * 1.85); ctx.stroke();
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + Math.PI / 8; paStamp('roulhubstud', Math.cos(a) * (P.hubR + 1.5) - 1.8, Math.sin(a) * (P.hubR + 1.5) - 1.8, 3.6, 3.6, 1, g2 => paStud(g2, 1.8, 1.8, 1.8, '#ffe08a', { collar: false })); }
    ctx.strokeStyle = '#5a3a08'; ctx.lineWidth = 1.5; circle(0, 0, P.hubR + 4); ctx.stroke();
    ctx.restore();
    const big = rouletteBig();
    // the ball's landing shadow (Hoppy Ball: where it hops next)
    for (const b of st.balls || []) if (b.state === 'set' && b.hopTo >= 0 && b.hopAirT <= 0) {
      const a = roulettePocketA(b.hopTo), q = rouletteProj(P.pocketR * Math.cos(a), P.pocketR * Math.sin(a)), r = big ? 15 : 11;
      ctx.globalAlpha = 0.5 + 0.3 * Math.sin(clk * 20); ctx.fillStyle = 'rgba(28,26,54,0.6)';
      ctx.beginPath(); ctx.ellipse(q.x, q.y, r, r * P.k, 0, 0, ROULETTE_TAU); ctx.fill(); ctx.globalAlpha = 1;
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.ellipse(q.x, q.y, r + 4, (r + 4) * P.k, 0, 0, ROULETTE_TAU); ctx.stroke(); ctx.setLineDash([]);
    }
    // floor marks under the players: a ring under whoever stands on a lit wedge ("I made it!")
    for (const s of st.pl) if (lit.has(rouletteWedgeOf(s))) {
      const q = rouletteProj(s.u, s.v), r = (big ? 21 : 17) + Math.sin(clk * 9 + s.id) * 1.5;
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = big ? 4 : 3; ctx.beginPath(); ctx.ellipse(q.x, q.y, r, r * P.k, 0, 0, ROULETTE_TAU); ctx.stroke();
      ctx.strokeStyle = PCOL[s.id]; ctx.lineWidth = big ? 2.5 : 2; ctx.beginPath(); ctx.ellipse(q.x, q.y, r - 3, (r - 3) * P.k, 0, 0, ROULETTE_TAU); ctx.stroke();
    }
    // lock rings on the floor around settled balls: they drain to LOCK, in the color of whoever would win it, and a "ping"
    // ring goes out from the ball as it lands so the eye finds it
    for (const b of st.balls || []) if (b.state === 'set') {
      const uv = rouletteBallUV(b), q = rouletteProj(uv.u, uv.v), f = clamp(b.lockLeft / P.lockT, 0, 1), R0 = big ? 34 : 27;
      ctx.save(); ctx.translate(q.x, q.y); ctx.scale(1, P.k);
      if (b.ping !== undefined && b.ping < 0.6) { const u = b.ping / 0.6; ctx.globalAlpha = 1 - u; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 5; circle(0, 0, R0 + 60 * u); ctx.stroke(); ctx.globalAlpha = 1; }
      ctx.strokeStyle = 'rgba(28,26,54,0.5)'; ctx.lineWidth = big ? 9 : 7; circle(0, 0, R0); ctx.stroke();
      const hurry = !reduceMotion && b.lockLeft < 0.6 && Math.floor(clk * 8) % 2 === 0;
      ctx.strokeStyle = hurry ? '#ffffff' : b.leader ? PCOL[b.leader.k] : '#ffffff'; ctx.lineWidth = big ? 7 : 5.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(0, 0, R0, -Math.PI / 2, -Math.PI / 2 + ROULETTE_TAU * f); ctx.stroke();
      ctx.restore();
    }
  }
  function rouletteDrawTurret() {
    const st = G.mst, P = rouletteP(), K = ROULETTE_COLS, cx = st.cx, cy = st.cy;
    ctx.fillStyle = K.goldDk; ctx.beginPath(); ctx.moveTo(cx - 30, cy); ctx.lineTo(cx - 7, cy - 44); ctx.lineTo(cx + 7, cy - 44); ctx.lineTo(cx + 30, cy); ctx.closePath(); ctx.fill();
    ctx.fillStyle = K.gold; ctx.beginPath(); ctx.moveTo(cx - 22, cy - 2); ctx.lineTo(cx - 5, cy - 44); ctx.lineTo(cx + 2, cy - 44); ctx.lineTo(cx - 6, cy - 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(90,58,8,0.35)'; ctx.beginPath(); ctx.moveTo(cx + 9, cy - 2); ctx.lineTo(cx + 3, cy - 44); ctx.lineTo(cx + 7, cy - 44); ctx.lineTo(cx + 30, cy); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#5a3a08'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cx - 30, cy); ctx.lineTo(cx - 7, cy - 44); ctx.lineTo(cx + 7, cy - 44); ctx.lineTo(cx + 30, cy); ctx.stroke();
    ctx.fillStyle = K.goldDk; ctx.beginPath(); ctx.ellipse(cx, cy, 30, 30 * P.k, 0, 0, Math.PI); ctx.fill();
    ctx.strokeStyle = '#5a3a08'; ctx.stroke();
    for (let i = 0; i < 5; i++) { const a = 0.35 + i * 0.6; paStamp('roulturstud', cx + Math.cos(a) * 25 - 1.4, cy + Math.sin(a) * 25 * P.k - 1.4, 2.8, 2.8, 1, g2 => paStud(g2, 1.4, 1.4, 1.4, '#ffe08a', { collar: false })); }
    // the turning handle on top
    for (let i = 0; i < 4; i++) {
      const a = st.th + i * Math.PI / 2, ex = cx + Math.cos(a) * 34, ey = cy - 46 + Math.sin(a) * 34 * P.k;
      ctx.strokeStyle = K.goldDk; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(cx, cy - 46); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.fillStyle = K.gold; circle(ex, ey, 6); ctx.fill();
    }
    ctx.fillStyle = K.bulb; circle(cx, cy - 48, 7); ctx.fill();
  }
  function rouletteBallR() { return rouletteBig() ? 11 : 8.5; }
  function rouletteDrawBall(b) {
    const st = G.mst, P = rouletteP(), uv = rouletteBallUV(b), q = rouletteProj(uv.u, uv.v), r = rouletteBallR();
    // rolling: a rattle (little bounces, faster when the ball is fast) and a fading trail behind it
    let z = b.z;
    if (b.state === 'roll') {
      const sp = clamp((Math.abs(b.psi) - 0.6) / 2.6, 0, 1), zk = b.zk || 0;
      z += Math.abs(Math.sin(b.rat * 12)) * (1 + 2 * sp) + Math.sin(Math.min(1, zk / 12) * Math.PI / 2) * zk;
      // a motion streak along the track behind it (longer when it is fast)
      const a0 = b.phi - st.th, len = 0.08 + 0.32 * sp, dirn = b.psi < 0 ? 1 : -1;
      for (let i = 6; i >= 1; i--) {
        const a = a0 + dirn * len * i / 6, tq = rouletteProj(b.r * Math.cos(a), b.r * Math.sin(a));
        ctx.fillStyle = 'rgba(122,130,170,' + (0.07 * (7 - i)).toFixed(3) + ')'; circle(tq.x, tq.y - r + 1, r * (1 - i * 0.1)); ctx.fill();
      }
    }
    ctx.fillStyle = 'rgba(28,26,54,0.35)'; ctx.beginPath(); ctx.ellipse(q.x, q.y + 2, r * (1 - Math.min(0.5, z / 40)), r * P.k * (1 - Math.min(0.5, z / 40)), 0, 0, ROULETTE_TAU); ctx.fill();
    const y = q.y - r + 1 - z;
    ctx.fillStyle = ROULETTE_COLS.ball; circle(q.x, y, r); ctx.fill();
    ctx.strokeStyle = '#8a90aa'; ctx.lineWidth = 2; circle(q.x, y, r); ctx.stroke();
    ctx.fillStyle = '#ffffff'; circle(q.x - r * 0.35, y - r * 0.35, r * 0.38); ctx.fill();
    if (b.id === 1) { ctx.strokeStyle = '#ff7ab8'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(q.x, y, r * 0.62, 0.3, 2.8); ctx.stroke(); } // the second ball has a pink stripe
  }
  // a light beam over a ball sitting in a pocket, and a bobbing arrow at its top: "the ball is HERE"
  function rouletteDrawBeacon(b) {
    const P = rouletteP(), uv = rouletteBallUV(b), q = rouletteProj(uv.u, uv.v), w = ROULETTE_WEDGES[b.wedge], big = rouletteBig();
    const hgt = Math.min(big ? 120 : 96, q.y - (big ? 70 : 62)), bw = big ? 30 : 22, pulse = 0.75 + 0.25 * Math.sin(G.clock * 7);
    const g = ctx.createLinearGradient(0, q.y - hgt, 0, q.y);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,' + (0.38 * pulse).toFixed(3) + ')');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(q.x - bw / 2, q.y); ctx.lineTo(q.x - bw * 0.3, q.y - hgt); ctx.lineTo(q.x + bw * 0.3, q.y - hgt); ctx.lineTo(q.x + bw / 2, q.y); ctx.closePath(); ctx.fill();
    const ay = q.y - hgt + 10 + (reduceMotion ? 0 : Math.sin(G.clock * 6) * 5), s = big ? 1.35 : 1;
    ctx.save(); ctx.translate(q.x, ay); ctx.scale(s, s);
    ctx.beginPath(); ctx.moveTo(-11, -9); ctx.lineTo(11, -9); ctx.lineTo(0, 6); ctx.closePath();
    ctx.lineJoin = 'round'; ctx.strokeStyle = C.ink; ctx.lineWidth = 5; ctx.stroke(); ctx.fillStyle = w.txt || w.col; ctx.fill();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.restore();
  }
  function rouletteDrawPeg(pg) {
    const P = rouletteP(), q = rouletteProj(pg.u, pg.v), K = ROULETTE_COLS, s = pg.hitT < 0.15 ? 1 + 0.25 * (1 - pg.hitT / 0.15) : 1, r = P.pegR * s, h = 20;
    ctx.fillStyle = K.pegDk; ctx.beginPath(); ctx.ellipse(q.x, q.y, r, r * P.k, 0, 0, ROULETTE_TAU); ctx.fill();
    ctx.fillRect(q.x - r, q.y - h, 2 * r, h);
    ctx.fillStyle = pg.hitT < 0.15 ? '#ff8a9a' : K.peg; ctx.beginPath(); ctx.ellipse(q.x, q.y - h, r, r * P.k, 0, 0, ROULETTE_TAU); ctx.fill();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(q.x, q.y - h, r * 0.55, r * 0.55 * P.k, 0, 0, ROULETTE_TAU); ctx.stroke();
  }
  // a player, drawn a little bigger around the feet (the engine's drawPlayer), with Lucky Shoes when they have them
  function rouletteDrawPlayer(p) {
    const st = G.mst, s = rouletteSpriteS(), fx = p.x + p.w / 2, fy = p.y + p.h;
    ctx.save(); ctx.translate(fx, fy); ctx.scale(s, s); ctx.translate(-fx, -fy);
    drawPlayer(p);
    if (st.shoe && st.shoe[p.id] > 0 && p.alive) rouletteDrawShoes(p, st.shoe[p.id]);
    ctx.restore();
  }
  // the engine draws the players between draw() and drawTop(): they are hidden there (alive off for that moment only) and
  // drawn in drawTop in painter's order instead. Nothing reads alive in between; the name tags come later.
  function rouletteHide(on) {
    const st = G.mst;
    if (on) { if (!st.pl) return; st.hid = G.players.map(p => p.alive); for (const p of G.players) p.alive = false; }
    else if (st.hid) { G.players.forEach((p, i) => { if (st.hid[i]) p.alive = true; }); st.hid = null; }
  }
  function rouletteHeadY(p) { return p.y + p.h - p.h * rouletteSpriteS(); }
  function rouletteDrawTop() {
    const st = G.mst, P = rouletteP(); if (!st.pl) return;
    const big = rouletteBig();
    // painter's order for everything that stands up: the turret, pegs, balls (with their beacons) and the two players
    const items = [{ y: st.cy, f: rouletteDrawTurret }];
    for (const pg of st.pegs || []) items.push({ y: rouletteProj(pg.u, pg.v).y, f: () => rouletteDrawPeg(pg) });
    for (const b of st.balls || []) if (b.state !== 'done') {
      const uv = rouletteBallUV(b);
      items.push({ y: rouletteProj(uv.u, uv.v).y + 1, f: () => { if (b.state === 'set') rouletteDrawBeacon(b); rouletteDrawBall(b); } });
    }
    if (G.mode !== 'title') for (const p of G.players) items.push({ y: p.y + p.h, f: () => rouletteDrawPlayer(p) });
    items.sort((a, b) => a.y - b.y);
    for (const it of items) it.f();
    // a "hup" puff for a bump pressed while resting, and a speed streak while lunging
    for (const s of st.pl) {
      const p = G.players[s.id], hy = rouletteHeadY(p), mid = (hy + p.y + p.h) / 2;
      if (s.huff > 0) { ctx.globalAlpha = s.huff / P.huffT; ctx.fillStyle = '#ffffff'; circle(p.x + p.w / 2 - p.face * 16, p.y + p.h - 5, 5 + 7 * (1 - s.huff / P.huffT)); ctx.fill(); ctx.globalAlpha = 1; }
      if (s.lungeT > 0) {
        const n = Math.hypot(s.dir.x, s.dir.y * P.k) || 1, dx = s.dir.x / n, dy = s.dir.y * P.k / n;
        ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
        for (const o of [-9, 0, 9]) { const ox = p.x + p.w / 2 - dy * o, oy = mid + dx * o; ctx.beginPath(); ctx.moveTo(ox - dx * 20, oy - dy * 20); ctx.lineTo(ox - dx * 40, oy - dy * 40); ctx.stroke(); }
        ctx.lineCap = 'butt';
      }
    }
    // who would win the chip right now: a spinning chip over their head
    for (const b of st.balls || []) if (b.state === 'set' && b.leader) {
      const p = G.players[b.leader.k], x = p.x + p.w / 2, y = rouletteHeadY(p) - (big ? 16 : 13) + Math.sin(G.clock * 6) * 2;
      rouletteChipIcon(x, y, big ? 12 : 9.5, PCOL[b.leader.k], Math.abs(Math.cos(G.clock * 5)));
    }
    // the "Press F to bump!" bubble (gold-on-dark, bobbing a little)
    if (G.match && G.match.phase === 'live') for (const k of [0, 1]) if (st.hintT[k] > 0) {
      const p = G.players[k], msg = rouletteHintText(k), fs = big ? 18 : 14;
      ctx.globalAlpha = clamp(st.hintT[k] / 0.4, 0, 1) * clamp((3.5 - st.hintT[k]) / 0.2, 0, 1);
      ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
      const w = ctx.measureText(msg).width + 24, x = clamp(p.x + p.w / 2, w / 2 + 8, W - w / 2 - 8), y = rouletteHeadY(p) - (big ? 52 : 44) + (reduceMotion ? 0 : Math.sin(G.clock * 5) * 2);
      pill(x, y, w, fs + 12, 'center'); text(msg, x, y + (fs + 12) / 2 + 0.5, fs, C.gold, 'center', 'body');
      ctx.globalAlpha = 1;
    }
    // clack sparks
    for (const q of st.sparks) {
      const u = q.t / 0.28, r = (5 + 10 * u) * q.s;
      ctx.globalAlpha = 1 - u; ctx.fillStyle = '#ffffff';
      ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + 0.4, rr2 = i % 2 ? r * 0.28 : r; ctx.lineTo(q.x + Math.cos(a) * rr2, q.y + Math.sin(a) * rr2); } ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
    }
    // the call ("STARS!") pops up over the turret in the middle, where nobody stands, so it never hides the scrum
    if (st.call) {
      const t = st.call.t, pop = t < 0.16 ? 0.6 + 0.65 * (t / 0.16) : 1.25 - 0.2 * Math.min(1, (t - 0.16) / 0.2);
      ctx.globalAlpha = clamp((1.1 - t) / 0.3, 0, 1);
      bigText(st.call.text, st.cx, st.cy - (big ? 70 : 66) - t * 14, big ? 40 : 32, st.call.col, pop);
      ctx.globalAlpha = 1;
    }
    for (const q of st.pops) {
      ctx.globalAlpha = clamp((0.9 - q.t) / 0.3, 0, 1);
      const sz = (q.size || 17) * (big ? 1.3 : 1), sc = q.t < 0.12 ? 0.6 + 0.4 * q.t / 0.12 : 1;
      bigText(q.text, q.x, q.y - q.t * 34, sz, q.col, sc); ctx.globalAlpha = 1;
    }
  }
  // Lucky Shoes: two gold shoes at the feet and a twinkle (gold = help, C9)
  function rouletteDrawShoes(p, b) {
    const x = p.x + p.w / 2, y = p.y + p.h;
    ctx.fillStyle = C.goldDark; for (const o of [-6, 6]) { ctx.beginPath(); ctx.ellipse(x + o + p.face * 2, y - 1, 6.5, 3.5, 0, 0, ROULETTE_TAU); ctx.fill(); }
    ctx.fillStyle = C.gold; for (const o of [-6, 6]) { ctx.beginPath(); ctx.ellipse(x + o + p.face * 2, y - 2.5, 5.5, 2.8, 0, 0, ROULETTE_TAU); ctx.fill(); }
    const tw = (G.clock * 3 + p.id * 0.5) % 1, sx = x + (tw < 0.5 ? -12 : 12), sy = y - 6 - tw * 6;
    ctx.globalAlpha = (0.5 + 0.5 * b) * Math.sin(tw * Math.PI); ctx.fillStyle = ROULETTE_COLS.bulb;
    ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r = i % 2 ? 1.2 : 4; ctx.lineTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r); } ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
  }
  function rouletteChipIcon(x, y, r, col, sq) { // a pretend poker chip: colored disc, white notches, gold rim
    ctx.save(); ctx.translate(x, y); ctx.scale(Math.max(0.15, sq), 1);
    ctx.fillStyle = col; circle(0, 0, r); ctx.fill();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = r * 0.28; ctx.setLineDash([r * 0.5, r * 0.55]); circle(0, 0, r * 0.8); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = ROULETTE_COLS.goldDk; ctx.lineWidth = 1.5; circle(0, 0, r); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; circle(0, 0, r * 0.32); ctx.fill();
    ctx.restore();
  }
  // a pretend ticket in the HUD (the world's pink stub): filled = held, dashed = still to collect
  function rouletteTicketIcon(x, y, s, has) {
    const w = 24 * s, h = 14 * s;
    if (has) {
      ctx.fillStyle = ROULETTE_COLS.ticket; rr(x - w / 2, y - h / 2, w, h, 3 * s); ctx.fill();
      ctx.fillStyle = 'rgba(28,26,54,0.9)'; circle(x - w / 2, y, 3.5 * s); ctx.fill(); circle(x + w / 2, y, 3.5 * s); ctx.fill();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5 * s; ctx.setLineDash([2 * s, 2 * s]); ctx.beginPath(); ctx.moveTo(x, y - h / 2 + 2 * s); ctx.lineTo(x, y + h / 2 - 2 * s); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = ROULETTE_COLS.ticketInk; circle(x - w * 0.22, y, 2 * s); ctx.fill(); circle(x + w * 0.22, y, 2 * s); ctx.fill();
    } else { ctx.strokeStyle = 'rgba(246,239,223,0.4)'; ctx.lineWidth = 2 * s; ctx.setLineDash([4, 3]); rr(x - w / 2, y - h / 2, w, h, 3 * s); ctx.stroke(); ctx.setLineDash([]); }
  }
  // where chip `slot` of player k sits in their stack (screen px)
  function rouletteSlot(k, slot) {
    const s = rouletteBig() ? 1.35 : 1;
    return { x: k === 0 ? 58 * s : W - 58 * s, y: 452 - slot * 22 * s };
  }
  function rouletteHud() {
    const st = G.mst, m = G.match, P = rouletteP(); if (!st.pl || !m) return;
    const big = rouletteBig(), s = big ? 1.35 : 1;
    // the two chip stacks on the table edges: goal slots, won chips (gold = the Lucky chip), and the ticket row
    for (const k of [0, 1]) {
      const x = k === 0 ? 58 * s : W - 58 * s, need = P.chips;
      const tk = P.tickets > 0 && need > 1 ? P.tickets : 0;   // a ticket row under the stack (not in One Spin)
      ctx.fillStyle = 'rgba(28,26,54,0.6)'; rr(x - 38 * s, 452 - (need - 1) * 22 * s - 52 * s, 76 * s, (need - 1) * 22 * s + 80 * s + (tk ? 24 * s : 0), 14 * s); ctx.fill();
      for (let i = 0; i < tk; i++) rouletteTicketIcon(x + (i - (tk - 1) / 2) * 30 * s, 452 + 38 * s, s, i < st.tix[k]);
      text(NAMES[k], x, 452 - (need - 1) * 22 * s - 34 * s, 17 * s, PCOL[k], 'center');
      for (let i = 0; i < need; i++) {
        const y = 452 - i * 22 * s, has = i < st.shown[k], top = has && i === st.shown[k] - 1, pt = st.stackPop[k];
        const pop = top && pt < 0.3 ? 1 + 0.25 * Math.sin(pt / 0.3 * Math.PI) : 1;
        ctx.save(); ctx.translate(x, y); ctx.scale(pop, 0.42 * pop);
        if (has) {
          const gold = i < st.lucky[k], col = gold ? C.gold : PCOL[k];
          ctx.fillStyle = gold ? C.goldDark : PDARK[k]; circle(0, 14 * s, 24 * s); ctx.fill();
          ctx.fillStyle = col; circle(0, 0, 24 * s); ctx.fill();
          ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 6 * s; ctx.setLineDash([9 * s, 10 * s]); circle(0, 0, 19 * s); ctx.stroke(); ctx.setLineDash([]);
        } else { ctx.strokeStyle = 'rgba(246,239,223,0.4)'; ctx.lineWidth = 3 * s; ctx.setLineDash([6, 6]); circle(0, 0, 24 * s); ctx.stroke(); ctx.setLineDash([]); }
        ctx.restore();
        if (top && pt < 0.35) { // a sparkle as the chip lands
          const u = pt / 0.35; ctx.globalAlpha = 1 - u; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3 * s;
          ctx.beginPath(); ctx.ellipse(x, y, (26 + 22 * u) * s, (11 + 9 * u) * s, 0, 0, ROULETTE_TAU); ctx.stroke(); ctx.globalAlpha = 1;
        }
      }
    }
    // chips flying into the stacks (drawn over the stack panels)
    for (const f of st.flying) {
      if (f.t < 0) continue;
      const to = rouletteSlot(f.k, f.slot), u = Math.min(1, f.t / 0.6), x = f.x0 + (to.x - f.x0) * u, y = f.y0 + (to.y - f.y0) * u - Math.sin(u * Math.PI) * 90;
      rouletteChipIcon(x, y, (big ? 14 : 11) * (1 + 0.3 * Math.sin(u * Math.PI)), PCOL[f.k], Math.abs(Math.cos(f.t * 9)) * 0.7 + 0.3);
    }
    // twist pill (twist rounds only)
    if (st.twist && st.twist !== 'classic') {
      const nm = ROULETTE_TWISTS[st.twist].name;
      ctx.font = '700 13px "Atkinson Hyperlegible", system-ui, sans-serif';
      pill(14, 46, ctx.measureText(nm).width + 28, 26); text(nm, 28, 59.5, 13, C.gold, 'left', 'body');
    }
    // top right: one live alert chip (spin number, then the called color and the lock countdown); bigger on phones,
    // and kept clear of the match pill
    if (m.phase === 'live' && !st.ended) {
      const setBs = (st.balls || []).filter(b => b.state === 'set').sort((a, b) => a.lockLeft - b.lockLeft), setB = setBs[0];
      let msg = 'Spin ' + st.spinN + (st.spinN >= P.maxSpins ? ' · last spin!' : ''), col = C.paper;
      if (setB) { msg = setBs.map(b => ROULETTE_WEDGES[b.wedge].name).join(' + ') + '! LOCK in ' + Math.max(1, Math.ceil(setB.lockLeft)); const w = ROULETTE_WEDGES[setB.wedge]; col = w.txt || w.col; }
      let fs = big ? 18 : 14, hh = big ? 36 : 28;
      ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
      let w = ctx.measureText(msg).width + 28;
      const box = G.matchHudBox, room = box ? W - 14 - box.x1 - 8 : 1e9;
      if (w > room && big) { fs = 14; hh = 30; ctx.font = '700 14px "Atkinson Hyperlegible", system-ui, sans-serif'; w = ctx.measureText(msg).width + 28; }
      pill(W - 14, 12, w, hh, 'right'); text(msg, W - 28, 12 + hh / 2 + 0.5, fs, col, 'right', 'body');
    }
    // the twist card, every round, during "Round N" and 3-2-1 (C4)
    if (m.phase === 'ready' || m.phase === 'count') {
      const tw = ROULETTE_TWISTS[st.twist];
      ctx.font = '700 14px "Atkinson Hyperlegible", system-ui, sans-serif';
      const w = Math.max(300, ctx.measureText(tw.hint).width + 48);
      ctx.globalAlpha = m.phase === 'ready' ? clamp(m.t / 0.25, 0, 1) : 1;
      ctx.fillStyle = 'rgba(28,26,54,0.82)'; rr(W / 2 - w / 2, 284, w, 60, 16); ctx.fill();
      text(tw.name, W / 2, 305, 26, C.gold, 'center'); text(tw.hint, W / 2, 330, 14, C.paper, 'center', 'body');
      ctx.globalAlpha = 1;
    }
  }

  /* ---------- sounds (Sfx.extra, 'roulette' prefix; vol ≤ 0.1, repeating ≤ 0.03) ---------- */
  let rouletteRollN = 0;   // a little pitch wobble for the rattle without touching any random stream
  Sfx.extra.rouletteRoll = function () { rouletteRollN = (rouletteRollN + 7) % 11; this.tone(1900 + rouletteRollN * 30, 0.018, 'square', 0.018); };
  Sfx.extra.rouletteSkip = function () { this.tone(2900, 0.012, 'square', 0.02); this.tone(1500, 0.03, 'triangle', 0.025, 900); };
  Sfx.extra.rouletteLaunch = function () { this.tone(300, 0.12, 'square', 0.04, 900); };
  Sfx.extra.rouletteClack = function () { this.tone(980, 0.05, 'triangle', 0.06, 620); this.tone(2400, 0.02, 'square', 0.02); };
  Sfx.extra.rouletteCall = function () { this.tone(880, 0.1, 'triangle', 0.06); this.tone(1320, 0.16, 'triangle', 0.06, null, 0.09); };
  Sfx.extra.rouletteTick = function () { this.tone(760, 0.05, 'square', 0.03); };
  Sfx.extra.rouletteLock = function () { this.tone(220, 0.14, 'square', 0.06, 110); this.tone(660, 0.08, 'triangle', 0.05); };
  Sfx.extra.rouletteChip = function (p) { this.tone(1760 * p, 0.06, 'triangle', 0.05); this.tone(2350 * p, 0.08, 'triangle', 0.04, null, 0.05); };
  Sfx.extra.rouletteTicket = function (p) { this.tone(990 * p, 0.05, 'triangle', 0.04); this.tone(1480 * p, 0.07, 'triangle', 0.035, null, 0.05); };
  Sfx.extra.rouletteNoChip = function () { this.tone(330, 0.25, 'sine', 0.05, 190); };
  Sfx.extra.rouletteBump = function (p) { this.tone(260 * p, 0.09, 'square', 0.04, 140 * p); };
  Sfx.extra.rouletteHit = function (p, id) { this.play('bonk', id); this.tone(120, 0.1, 'sine', 0.08, 70); };
  Sfx.extra.rouletteClash = function () { this.tone(520, 0.07, 'square', 0.05, 300); this.tone(1040, 0.06, 'triangle', 0.04); };
  Sfx.extra.rouletteHuff = function (p) { this.tone(420 * p, 0.05, 'sine', 0.03, 300 * p); };
  Sfx.extra.roulettePeg = function () { this.play('boing'); };
  Sfx.extra.rouletteWall = function () { this.tone(140, 0.08, 'sine', 0.05, 90); };
  Sfx.extra.rouletteHopWarn = function () { this.tone(600, 0.08, 'triangle', 0.04, 900); };
  Sfx.extra.rouletteLucky = function (p) { this.tone(1320 * p, 0.08, 'triangle', 0.05); this.tone(1760 * p, 0.08, 'triangle', 0.05, null, 0.07); this.tone(2093 * p, 0.14, 'triangle', 0.05, null, 0.14); };
}
/* ===== end of World 8: Roulette Wheel ===== */

