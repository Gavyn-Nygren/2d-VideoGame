/* Pip & Bo - Level 43-2 Pinball Panic (team, World 43 Arcade Cabinet, 3D, two glass pinballs). */
'use strict';

/* ===== 43-2 Pinball Panic (mode 'arcadepinball', team, view3d, one continuous climb) =====
   The START button from Coin Drop wakes the machine and the first game to light up is a pinball table, Comet Carnival
   (made up). Pip and Bo are each sealed in a see-through pinball and climb the table from the great flippers to the
   comet's mouth at the backboard, in two lanes side by side. Each lane holds the switches for the OTHER lane: neither
   can climb without the other opening the way (Gavyn: "one teammate needs to get to one point to open a gate for the
   other partner").
     ROLL     the stick or direction keys push the ball any way on the table. The hero runs inside the glass like a
              hamster ball: pushing drives it up to their running speed (S.ACC, S.VRUN) and their feet grip, so a turn is
              crisp (S.GRIP); let go and the glass rolls free on the table, carrying on and then rolling back down the
              slope, faster and faster (S.ROLL_K, S.ROLL_F, S.SLOPE). Bumpers and launches can throw it faster than
              anyone can run.
     BOUNCE   rails, posts and rubber give back a share of a hit (S.E_*), less and less for gentle touches so a ball
              resting on a rail never chatters; a hit at an angle rubs off a little speed along the rail (S.MU). The
              two balls clack off each other like glass (S.E_PAIR); a ball sitting in a cup is as solid as a post.
     AIR      one gravity for everything off the table (S.GRAV): hops, throws, launches and wire ramps. A launch's time
              in the air comes from its height; a hard landing bounces (S.E_FLOOR) and carries its speed on, skidding
              down to S.LAND_VMAX on the landing pads; a wire ramp is fast low down and slow up high (S.RIDE_G).
     HOP      jump hops the ball (S.HOP_T s of air): over kerbs, out of cups and cradles, over a magnet or a silver ball.
     THE TABLE fires by itself: bumpers, slingshots, the great flippers and kickers glow and tick S.TELL s before they
              throw a ball, so a throw is never a surprise. Thrown balls can be nudged a little in the air.
     GATES    (PINBALL_TABLE): star roll-over (lifts a gate for good), hold cup (a drop gate stays down while a ball sits
              in the cup; hop to leave), target bank (each target down raises one step of a staircase; they pop back
              one every S.POP s), flipper for a friend (a button fires the flipper in the other lane; a ball sitting in
              its cradle is launched over a ledge), spinner bridge (roll through fast: a bridge of light over a gap for
              S.BRIDGE s), detour (one lane is kicked up to the high lever, which works only while the other holds the
              button below). Whatever a ball has passed stays open for good (gates, stairs, ledges, bridges latch).
     TOGETHER the twin flippers at the end of each part fire both balls up to the next part once both sit in their
              cradles; the Comet Jackpot needs both scoops at once, then MULTIBALL and the final ramp.
     DRAINS   an outlane drains a ball: S.DRAIN_T s later the plunger shoots it back in at the start of its section. A
              partner sitting on a save post meanwhile kicks it straight back out ("SAVED!"). On the chrome rails
              (part 3) a gap is only a drop to the catch pocket, never a drain.
     HAZARDS  roaming magnets carry a grounded ball a little way back; silver balls served down a lane (lit path and
              rumble 1.5 s first) knock a ball back to the catch pocket; TILT (authored, 2 s warning) shoves everything
              sideways; the rocket's wash on the rails.
     HELP     gold and announced: 90 s in one section or 3 drains there slows its hazards by a quarter, lights a gold
              guide line from each switch to its gate and stops the targets popping back.
   One room; the four parts are places up the table (never cards). State lives in G.mst; the rules never read the
   renderer (K3D.noRender plays the same). Every name is prefixed arcadepinball / PINBALL. */

const PINBALL = (function () {
  const TB = PINBALL_TABLE, R = TB.T.R;
  const S = {
    // rolling (see ROLL above): drive, running speed, how fast the drive fades near it, the feet's grip across the push,
    // the glass's rolling drag (per second, and a small steady rub), the slope's pull down the table
    ACC: 9.0, VRUN: 5.2, RUN_FADE: 1.2, GRIP: 2.6, ROLL_K: 0.55, ROLL_F: 0.2, SLOPE: 1.6, AIR_ACC: 3.2, VMAX: 11,
    // the air: one gravity; a hop is HOP_V up (about 1.2 high, HOP_T s)
    GRAV: 25, HOP_V: 7.8, HOP_T: 0.62, KERB_TOP: 0.46, HOP_LUNGE: 1.8,
    // bounces: share of a hit given back by rails, posts, bumper skirts and the other ball; it fades in between E_SLOW
    // and E_FULL u/s of impact (a gentle touch gives nothing back); MU the rub along a rail on a hit
    E_RAIL: 0.5, E_POST: 0.6, E_BUMPER: 0.7, E_PAIR: 0.78, E_SLOW: 0.5, E_FULL: 2.0, MU: 0.1,
    // landings: a drop faster than BOUNCE_V bounces back E_FLOOR of it (at most BOUNCE_MAX); a launch's landing pad lets it
    // skid down to LAND_VMAX (SKID_K per second), a soft pad (knock-backs, the plunger) to LAND_SOFT
    E_FLOOR: 0.3, BOUNCE_V: 2.6, BOUNCE_MAX: 4.0, LAND_VMAX: 4.2, LAND_SOFT: 1.2, SKID_K: 16,
    // wire ramps: the gravity along a wire (speed from height) and the slowest a ball crawls over a top
    RIDE_G: 9, RIDE_VMIN: 2.4,
    // TILT and the rocket's wash push a free-rolling ball (scaled for its low drag); a caught ball settles into a cup on a
    // spring (SEAT_K, damping SEAT_Z: one small rattle); a magnet draws a ball in (MAG_EASE) and lifts it MAG_LIFT
    PUSH_K: 0.7, SEAT_K: 90, SEAT_Z: 0.5, MAG_EASE: 7, MAG_LIFT: 0.3,
    TELL: 0.4, BUMP_V: 7.2, BUMP_COOL: 0.75, SLING_V: 6.6, GREAT_V: 6.8,
    SEAT_R: 1.0, SEAT_V: 5.2, SEAT_COOL: 0.9, LEAVE_V: 2.6, TARGET_V: 0.55, POP: 8, BRIDGE: 6, SPIN_V: 3.0,
    DRAIN_T: 2.0, SHOOT_T: 1.35, DROP_T: 1.0, KNOCK_T: 1.1, MAG_T: 1.25, MAG_BACK: 4.0, MAG_COOL: 2.6, MAG_R: 1.35,
    LOOSE_V: 4.6, LOOSE_WARN: 1.6, FLOOD_V: 4.0, FLOOD_BACK: 3.2, FLOOD_HIT: 0.86, TILT_WARN: 2.0, TILT_T: 2.0, TILT_A: 5.4,
    TWIN_T: 1.0, HELP_T: 90, HELP_DRAINS: 3, HELP_KNOCKS: 8, HELP_SLOW: 0.75, OPEN_T: 10.5, JACK_T: 2.6, FINISH_T: 6.5, FLIP_COOL: 1.0,
    IMMUNE: 0.5, NUDGE: 1.4, NUDGE_V: 1.6, STAR_R: 1.25,
  };
  const CO = { S, TB };
  const hyp = Math.hypot, clampv = (v, a, b) => (v < a ? a : v > b ? b : v);
  const laneOf = x => (x < 0 ? -1 : 1);

  /* ---------- a fresh climb ---------- */
  function fresh(st) {
    Object.assign(st, {
      t: 0, phase: 'open', phaseT: 0, fx: [], fxN: 0, score: 0,
      gate: {}, stairs: {}, bank: {}, bridge: {}, ledge: {}, flip: {}, twin: {}, kick: {}, bump: TB.posts.map(() => ({ ch: 0, cool: 0 })),
      sling: TB.slings.map(() => ({ ch: 0, cool: 0 })), pad: {}, seat: {}, spun: {}, credit: {},
      magnets: TB.magnets.map(m => ({ x: m.x0 + (m.x1 - m.x0) * m.ph, dir: 1, cool: 0, hold: -1 })),
      loose: [], looseOn: {}, flood: [], floodOn: false, floodT: 0,
      tilt: { i: -1, warn: 0, t: 0, dir: 1, done: TB.tilts.map(() => false) }, wind: 0,
      got: TB.stars.map(() => 0), stars: 0, drains: 0, saves: 0, drops: 0, knocks: 0, partDrains: [0, 0, 0, 0], opened: [0, 0],
      both: -1, lead: 0, secT: TB.sections.map(() => 0), secDrains: TB.sections.map(() => 0), help: TB.sections.map(() => false), helpN: 0, secKnocks: [],
      helpMsgT: -99, helpMsg: '', says: [], sayT: -99, jack: 0, finished: false, prompt: null,
    });
    for (const g of TB.gates) st.gate[g.id] = { open: false, latched: false, t: 0 };
    for (const s of TB.stairs) st.stairs[s.id] = { latched: false };
    for (const c of TB.controls) if (c.kind === 'targets') st.bank[c.id] = { down: c.targets.map(() => false), n: 0, popT: S.POP, order: [] };
    for (const b of TB.bridges) st.bridge[b.id] = { t: 0, latched: false, by: -1 };
    for (const f of TB.flippers) st.flip[f.id] = { ch: 0, cool: 0 };
    for (const f of TB.flippers) st.ledge[f.id] = { latched: false };
    for (const t of TB.twins) st.twin[t.id] = { ring: 0 };
    for (const k of TB.kickers) st.kick[k.id] = { ch: 0, cool: 0, who: -1 };
    st.balls = [0, 1].map(k => {
      const sp = TB.sections[0].spawn[k];
      return { id: k, x: sp[0], d: sp[1], vx: 0, vd: 0, h: 0, vh: 0, air: false, mode: 'roll', t: 0, seat: null, seatCool: 0,
        ride: null, imm: 0, sec: 0, spin: 0, rollA: 0, face: 0, land: 0, bumped: 0, lane: laneOf(sp[0]), jumpBuf: 0, carry: null, kickId: null, magCool: {} };
    });
    for (const p of G.players) { p.alive = true; p.pendingJump = false; }
  }
  CO.fresh = fresh;
  const fx = (st, k, o) => { st.fx.push(Object.assign({ k, t: st.t, n: ++st.fxN }, o || {})); if (st.fx.length > 80) st.fx.shift(); };
  CO.fx = fx;
  const say = (st, text, who) => { st.says.push({ text, t: st.t, who }); if (st.says.length > 3) st.says.shift(); };
  const addScore = (st, n) => { st.score += n; };

  /* ---------- state queries (the brain and the scenery use these too) ---------- */
  const gateShut = (st, id) => { const g = st.gate[id]; return !g.open && !g.latched; };
  const bankN = (st, id) => st.bank[id].n;
  const stepUp = (st, s, i) => st.stairs[s.id].latched || bankN(st, s.by) >= i;
  const bridgeOn = (st, id) => st.bridge[id].latched || st.bridge[id].t > 0;
  const seated = (st, cid) => st.balls.find(b => b.mode === 'seat' && b.seat === cid);
  const onPad = (st, c, r = 1.1) => st.balls.find(b => b.mode === 'roll' && b.h < 0.35 && hyp(b.x - c.x, b.d - c.d) < r);
  const helpOn = (st, d) => st.help[TB.secAt(d).i];
  const hzSlow = (st, d) => (helpOn(st, d) ? S.HELP_SLOW : 1);
  Object.assign(CO, { gateShut, bankN, stepUp, bridgeOn, seated, onPad, helpOn, laneOf });
  // is a wall solid for this ball right now?
  function wallOn(st, w, b) {
    switch (w.kind) {
      case 'rail': return true;
      case 'ledge': { const f = ledgeOf(w); return !(f && st.ledge[f.id].latched); }
      case 'kerb': return b.h < S.KERB_TOP && !(b.air && b.vh > 0); // (a ball on its way up is already clear of it)
      case 'gate': return gateShut(st, w.gate);
      case 'step': { const s = TB.byId[w.stairs]; return !stepUp(st, s, w.step); }
      case 'oneway': return st.both >= w.sec && st.balls[0].lane !== st.balls[1].lane && b.d > w.a[1];
      case 'target': return !st.bank[w.bank].down[w.ti];
    }
    return true;
  }
  const ledgeMap = new Map();
  function ledgeOf(w) {
    if (ledgeMap.has(w)) return ledgeMap.get(w);
    let best = null;
    for (const f of TB.flippers) { const c = TB.byId[f.cradle]; if (Math.sign(c.x) === Math.sign(w.a[0] + w.b[0]) && Math.abs(c.d + 3 - w.a[1]) < 3.5) best = f; }
    ledgeMap.set(w, best); return best;
  }
  CO.wallOn = wallOn;
  // is a ball centre at (x, d) clear of every solid (for the brain's planner and the spawn checks)? pad adds room
  CO.free = function (st, x, d, pad = 0, h = 0) {
    const fake = { h, d };
    for (let bk = -1; bk <= 1; bk++) {
      const N = TB.near(d + bk * 8);
      for (const w of N.walls) {
        if (!wallOn(st, w, fake)) continue;
        if (segDist(x, d, w.a[0], w.a[1], w.b[0], w.b[1]) < R + w.r + pad) return false;
      }
      for (const p of N.posts) if (hyp(x - p.x, d - p.d) < R + p.r + pad) return false;
    }
    return true;
  };
  CO.inHole = function (st, x, d, pad = 0) {
    for (const h of TB.holes) {
      if (h.bridge && bridgeOn(st, h.bridge)) continue;
      if (h.r != null ? hyp(x - h.x, d - h.d) < h.r + pad : (x > h.x0 - pad && x < h.x1 + pad && d > h.d0 - pad && d < h.d1 + pad)) return h;
    }
    return null;
  };
  function segDist(px, pd, ax, ad, bx, bd) {
    const vx = bx - ax, vd = bd - ad, L = vx * vx + vd * vd;
    let u = L ? ((px - ax) * vx + (pd - ad) * vd) / L : 0; u = u < 0 ? 0 : u > 1 ? 1 : u;
    return hyp(px - (ax + vx * u), pd - (ad + vd * u));
  }
  CO.segDist = segDist;

  /* ---------- collisions ---------- */
  // how much of a hit comes back: E for a hard hit, fading smoothly to nothing for a gentle touch (no chatter at rest)
  const eOf = (E, vn) => { const k = clampv((vn - S.E_SLOW) / (S.E_FULL - S.E_SLOW), 0, 1); return E * k * k * (3 - 2 * k); };
  CO.eOf = eOf;
  // bounce a ball off a surface with outward normal (nx, nd): returns the impact speed (0 if it was moving away)
  function bounce(b, nx, nd, E) {
    const vn = b.vx * nx + b.vd * nd;
    if (vn >= 0) return 0;
    const e = eOf(E, -vn), tx = -nd, td = nx, vt = b.vx * tx + b.vd * td;
    // a hit at an angle rubs a little speed off along the surface (never more than a third of it)
    const rub = Math.min(Math.abs(vt) * 0.33, S.MU * (1 + e) * -vn) * Math.sign(vt);
    b.vx += -(1 + e) * vn * nx - rub * tx; b.vd += -(1 + e) * vn * nd - rub * td;
    return -vn;
  }
  // the clack of a hit: rails ring, rubber thuds (the sound and the scenery's flash scale with the impact)
  function hitFx(st, b, v, kind, nx, nd) {
    if (v < 1.6 || st.t - (b.hitT || -9) < 0.07) return;
    b.hitT = st.t; b.squash = Math.min(1, v / 8); b.sqN = [nx, nd];
    fx(st, 'clack', { x: b.x - nx * R, d: b.d - nd * R, v, who: b.id, kind });
    Sfx.play('arcadepinballClack', Math.min(1, v / 8) + (kind === 'post' || kind === 'bumper' || kind === 'sling' ? 2 : 0));
  }
  // walls and posts: a ball only meets what is in its own bucket (each bucket holds everything within reach of it);
  // two passes settle a ball wedged in a corner or between a rail and a post without shaking
  function collide(st, b, prevD) {
    for (let pass = 0; pass < 2; pass++) {
      const N = TB.near(b.d);
      let hit = false;
      for (const w of N.walls) {
        if (!wallOn(st, w, b)) continue;
        const ax = w.a[0], ad = w.a[1], vx = w.b[0] - ax, vd = w.b[1] - ad, L = vx * vx + vd * vd;
        let u = L ? ((b.x - ax) * vx + (b.d - ad) * vd) / L : 0; u = u < 0 ? 0 : u > 1 ? 1 : u;
        const cx = ax + vx * u, cd = ad + vd * u;
        let nx = b.x - cx, nd = b.d - cd, dist = hyp(nx, nd);
        // a kerb is low: it only meets the lower part of the ball, less and less as the ball hops (gone above KERB_TOP)
        const min = w.kind === 'kerb' ? w.r + Math.sqrt(Math.max(0, R * R - Math.pow(R + b.h - S.KERB_TOP, 2))) : R + w.r;
        // a standing target falls to a brush as well as a hit: a ball rolling along the bank within a hair of its face
        if (w.kind === 'target' && dist < min + 0.18 && !st.bank[w.bank].down[w.ti] && hyp(b.vx, b.vd) >= 1.0) knockTarget(st, w.bank, w.ti, b);
        if (dist >= min) continue;
        if (w.kind === 'oneway') { nx = 0; nd = 1; dist = b.d - cd; if (dist < -min) continue; }
        else if (dist < 1e-6) { nx = 0; nd = prevD > cd ? 1 : -1; dist = 0; }
        else { nx /= dist; nd /= dist; }
        // a hop that comes down on top of a kerb rolls off it the way it was going (not back the way it came), a little
        // each frame: so a hop from a standstill against the kerb gets over it even with a gentle push
        let push = min - dist;
        if (w.kind === 'kerb' && dist < 0.75) {
          if (pass) continue;
          if (b.vx * nx + b.vd * nd < -0.15) { nx = -nx; nd = -nd; push = min + dist; }
          push = Math.min(0.11, push); b.x += nx * push; b.d += nd * push; hit = true; continue;
        }
        if (w.kind === 'kerb') push = pass ? 0 : Math.min(0.14, push); // (it is low and round: a ball eases off it, never a snap)
        b.x += nx * push; b.d += nd * push; hit = true;
        const vn = b.vx * nx + b.vd * nd;
        if (w.kind === 'target' && !st.bank[w.bank].down[w.ti] && (Math.abs(vn) >= S.TARGET_V || hyp(b.vx, b.vd) >= 1.0)) knockTarget(st, w.bank, w.ti, b);
        const v = bounce(b, nx, nd, w.sling ? S.E_POST : S.E_RAIL);
        if (v) hitFx(st, b, v, w.sling ? 'sling' : w.kind, nx, nd);
      }
      for (const p of N.posts) {
        let nx = b.x - p.x, nd = b.d - p.d; const dist = hyp(nx, nd), min = R + p.r;
        if (dist >= min) continue;
        if (dist < 1e-6) { nx = 0; nd = -1; } else { nx /= dist; nd /= dist; }
        b.x = p.x + nx * min; b.d = p.d + nd * min; hit = true;
        const v = bounce(b, nx, nd, p.kind === 'bumper' ? S.E_BUMPER : S.E_POST);
        if (v) hitFx(st, b, v, p.kind === 'bumper' ? 'bumper' : 'post', nx, nd);
      }
      if (!hit) break;
    }
  }
  function knockTarget(st, bankId, ti, b) {
    const B = st.bank[bankId];
    if (B.down[ti]) return;
    B.down[ti] = true; B.n++; B.order.push(ti); B.popT = S.POP; B.by = b.id;
    fx(st, 'target', { bank: bankId, ti, who: b.id }); addScore(st, 750);
    Sfx.play('arcadepinballTarget', B.n);
    const s = TB.stairs.find(q => q.by === bankId);
    if (s && !st.stairs[s.id].latched) fx(st, 'step', { stairs: s.id, n: B.n });
  }

  /* ---------- one ball's step ---------- */
  function ballStep(st, b, p, dt) {
    b.t += dt; b.imm = Math.max(0, b.imm - dt); b.seatCool = Math.max(0, b.seatCool - dt); b.land = Math.max(0, b.land - dt); b.bumped = Math.max(0, b.bumped - dt);
    if (b.squash) b.squash = Math.max(0, b.squash - dt * 7); // (the glass's squash after a hit: display only)
    for (const k in b.magCool) b.magCool[k] = Math.max(0, b.magCool[k] - dt);
    const live = st.phase === 'play';
    const dir = live ? K3D.moveDir(p) : { x: 0, z: 0, s: 0 };
    const ix = dir.x * dir.s, id = -dir.z * dir.s;
    if (p.pendingJump) { b.jumpBuf = 0.15; p.pendingJump = false; }
    else b.jumpBuf = Math.max(0, b.jumpBuf - dt);
    if (!live) b.jumpBuf = 0;
    switch (b.mode) {
      case 'seat': {
        const c = TB.byId[b.seat];
        // a caught ball swirls down into the middle of its cup on a spring (one small rattle), never a snap
        const o = b.so;
        if (o) {
          const k = o[4] || S.SEAT_K, damp = 2 * S.SEAT_Z * Math.sqrt(k);
          o[2] += (-k * o[0] - damp * o[2]) * dt; o[3] += (-k * o[1] - damp * o[3]) * dt; o[0] += o[2] * dt; o[1] += o[3] * dt;
          if (hyp(o[0], o[1]) < 0.004 && hyp(o[2], o[3]) < 0.06) b.so = null;
        }
        b.x = (b.seatX != null ? b.seatX : c.x) + (b.so ? b.so[0] : 0); b.d = (b.seatD != null ? b.seatD : c.d) + (b.so ? b.so[1] : 0); b.vx = b.vd = 0; b.h = 0;
        if (b.jumpBuf > 0 && !b.locked) {
          b.jumpBuf = 0; b.mode = 'roll'; b.air = true; b.vh = S.HOP_V; b.seatCool = S.SEAT_COOL; b.so = null;
          const s = hyp(ix, id);
          b.vx = s > 0.2 ? ix / s * S.LEAVE_V : 0; b.vd = s > 0.2 ? id / s * S.LEAVE_V : S.LEAVE_V * 0.8;
          fx(st, 'unseat', { id: c.id, who: b.id }); Sfx.play('arcadepinballCupOut');
          b.seat = null;
        }
        return;
      }
      case 'ride': return rideStep(st, b, ix, dt);
      case 'kick': {
        const k = TB.byId[b.kickId];
        b.x += (k.x - b.x) * Math.min(1, dt * 10); b.d += (k.d - b.d) * Math.min(1, dt * 10); b.vx = b.vd = 0;
        return;
      }
      case 'drain': {
        b.t2 = (b.t2 || 0) + dt; b.h = Math.max(0, b.h - dt * 7); // (from a hop: down onto the rim first)
        // it rolls on over the rim and spirals down into the hole (display: the rules only wait)
        const h = b.hole, cx = h.r != null ? h.x : clampv(b.x, h.x0, h.x1), cd = h.r != null ? h.d : clampv(b.d, h.d0, h.d1), k = Math.min(1, dt * 7);
        b.dvx = (b.dvx || 0) * Math.pow(0.02, dt); b.dvd = (b.dvd || 0) * Math.pow(0.02, dt);
        b.x += b.dvx * dt + (cx - b.x) * k; b.d += b.dvd * dt + (cd - b.d) * k;
        if (b.t2 >= S.DRAIN_T) startShoot(st, b);
        return;
      }
      case 'drop': {
        // (a ball that fell in from a hop carries on down from the height and fall it had: no snap)
        b.t2 = (b.t2 || 0) + dt; b.h = (b.h0 || 0) + (b.vh0 || 0) * b.t2 - 8 * Math.pow(b.t2 / S.DROP_T, 2);
        // falling off the edge carries on the way it was rolling, slowing as it drops (display only)
        b.x += (b.dvx || 0) * dt * Math.max(0, 1 - b.t2 / S.DROP_T); b.d += (b.dvd || 0) * dt * Math.max(0, 1 - b.t2 / S.DROP_T);
        if (b.t2 >= S.DROP_T) startShoot(st, b, true);
        return;
      }
      case 'magnet': {
        const m = st.magnets[b.carry], M = TB.magnets[b.carry];
        b.t2 = (b.t2 || 0) + dt;
        const sec = TB.secAt(M.d);
        // drawn in under the magnet and lifted a little, then carried back (the carry eases in)
        const ease = Math.min(1, dt * S.MAG_EASE);
        b.x += (m.x - b.x) * ease; b.h += (S.MAG_LIFT - b.h) * Math.min(1, dt * 8);
        b.d = Math.max(sec.d0 + 1.4, b.d - S.MAG_BACK / S.MAG_T * Math.min(1, b.t2 / 0.25) * dt * hzSlow(st, M.d));
        if (b.t2 >= S.MAG_T) {
          b.mode = 'roll'; b.vx = (m.x - b.x) * 2; b.vd = -0.6; b.air = true; b.vh = 0; b.magCool[b.carry] = 1.6; m.hold = -1; m.cool = S.MAG_COOL; b.imm = 0.4;
          fx(st, 'magDrop', { m: b.carry, who: b.id }); Sfx.play('arcadepinballMagnetDrop');
        }
        return;
      }
    }
    // rolling
    const prevX = b.x, prevD = b.d;
    if (b.jumpBuf > 0 && !b.air && b.mode === 'roll') { b.jumpBuf = 0; b.air = true; b.vh = S.HOP_V; b.vx += ix * S.HOP_LUNGE; b.vd += id * S.HOP_LUNGE; fx(st, 'hop', { who: b.id }); Sfx.play('arcadepinballHop'); }
    if (!b.air) {
      // the free glass: rolling drag, a small steady rub, and the slope pulling it back down the table
      const sp0 = hyp(b.vx, b.vd);
      let ax = -S.ROLL_K * b.vx, ad = -S.ROLL_K * b.vd - S.SLOPE;
      if (sp0 > 1e-3) { const f = Math.min(S.ROLL_F, sp0 / dt); ax -= b.vx / sp0 * f; ad -= b.vd / sp0 * f; }
      // the hero running inside: drives the push's way up to their running speed (a little brake past it), and their
      // feet grip across it so the ball turns where it is pushed instead of sliding on
      const s = Math.min(1, hyp(ix, id));
      b.push = s; if (s > 0.1) b.pa = Math.atan2(ix, id); // (for the hero inside: running the push's way)
      if (s > 0.02) {
        const m = hyp(ix, id), ux = ix / m, ud = id / m, along = b.vx * ux + b.vd * ud;
        const drive = S.ACC * s * clampv((S.VRUN - along) / S.RUN_FADE, -0.35, 1), g = S.GRIP * Math.min(1, s * 1.5);
        ax += ux * drive - (b.vx - along * ux) * g; ad += ud * drive - (b.vd - along * ud) * g;
      }
      // TILT and the rocket's wash push grounded balls sideways
      if (st.tilt.t > 0) ax += st.tilt.dir * S.TILT_A * S.PUSH_K * hzSlow(st, b.d);
      if (st.wind) ax += st.wind * S.PUSH_K * hzSlow(st, b.d);
      b.vx += ax * dt; b.vd += ad * dt;
    } else {
      b.push = 0;
      b.vx += ix * S.AIR_ACC * dt; b.vd += id * S.AIR_ACC * dt - S.SLOPE * 0.25 * dt;
      b.h += b.vh * dt; b.vh -= S.GRAV * dt;
      if (b.h <= 0) {
        b.h = 0;
        // a hard landing bounces (smaller each time); a soft one settles and rolls on
        if (b.vh < -S.BOUNCE_V) {
          const v = -b.vh; b.vh = Math.min(S.BOUNCE_MAX, v * S.E_FLOOR); b.vx *= 0.97; b.vd *= 0.97; b.land = 0.3;
          fx(st, 'land', { who: b.id, x: b.x, d: b.d, v }); Sfx.play('arcadepinballLand', v > 9 ? 1 : 0);
        } else {
          const v = -b.vh; b.vh = 0; b.air = false; b.land = Math.max(b.land, 0.25);
          if (v > 1.2) { fx(st, 'land', { who: b.id, x: b.x, d: b.d, v }); Sfx.play('arcadepinballLand'); }
        }
      }
    }
    // a launch's landing pad: the ball skids down to the pad's speed over a moment (dust flies)
    if (b.skid > 0) {
      b.skid -= dt;
      const sk = hyp(b.vx, b.vd), cap = b.skidV || S.LAND_VMAX;
      if (sk > cap) { const k = Math.max(cap / sk, 1 - S.SKID_K * dt); b.vx *= k; b.vd *= k; }
    }
    const sp = hyp(b.vx, b.vd);
    if (sp > S.VMAX) { b.vx *= S.VMAX / sp; b.vd *= S.VMAX / sp; }
    // the glass rumbling over the playfield, louder the faster it rolls
    b.rollSnd = (b.rollSnd || 0) - dt;
    if (!b.air && sp > 1.2 && b.rollSnd <= 0) { b.rollSnd = 0.1; Sfx.play('arcadepinballRoll', Math.min(1, sp / 8)); }
    b.x += b.vx * dt; b.d += b.vd * dt;
    collide(st, b, prevD);
    // display: spin and the way the hero faces (scenery only, but cheap)
    b.spin += (b.d - prevD) / R; b.rollA += (b.x - prevX) / R;
    if (sp > 0.4) b.face = Math.atan2(b.vx, -b.vd);
    // spinners: crossed fast this step?
    for (const c of TB.controls) if (c.kind === 'spinner' && (prevD - c.d) * (b.d - c.d) <= 0 && prevD !== b.d && b.x > c.x0 && b.x < c.x1) {
      const v = Math.abs(b.vd);
      st.spun[c.id] = Math.min(12, (st.spun[c.id] || 0) + v * 2.2);
      if (v >= S.SPIN_V && !b.air) {
        const br = st.bridge[c.bridge];
        if (!br.latched) { const was = br.t; br.t = S.BRIDGE; br.by = b.id; fx(st, was > 0 ? 'bridgeTop' : 'bridgeOut', { id: c.bridge, who: b.id }); Sfx.play('arcadepinballBridgeOut'); }
        Sfx.play('arcadepinballSpinner'); addScore(st, 1500);
      } else Sfx.play('arcadepinballSpinner', 1);
    }
    // holes: drains and drops. A round outlane only takes a ball rolling on the table (a hop clears it). A strip (a
    // spinner gap, the outlane under a bridge of light, the rail edges) is too wide to hop: a ball in the air over one
    // falls in as soon as it is on its way down, so the only way over is the partner's bridge.
    if (b.imm <= 0) {
      const grounded = !b.air && b.h < 0.15;
      if (grounded || (b.air && b.vh <= 0)) {
        const h = CO.inHole(st, b.x, b.d, -0.05);
        if (h && (grounded || h.r == null)) { if (h.kind === 'gap') startDrop(st, b, h); else startDrain(st, b, h); return; }
      }
    }
  }

  /* ---------- seats, pads, switches ---------- */
  function seatCheck(st, b) {
    if (b.mode !== 'roll' || b.air || b.seatCool > 0) return;
    for (const c of TB.controls) {
      if (c.kind !== 'cup' && c.kind !== 'cradle' && c.kind !== 'scoop') continue;
      if (hyp(b.x - c.x, b.d - c.d) > S.SEAT_R || hyp(b.vx, b.vd) > S.SEAT_V || seated(st, c.id)) continue;
      if (c.kind === 'scoop' && st.phase !== 'play') continue;
      // caught: it keeps its place and speed and swirls into the middle (see the seat case in ballStep)
      b.mode = 'seat'; b.seat = c.id; b.so = [b.x - c.x, b.d - c.d, b.vx, b.vd]; b.vx = b.vd = 0; b.seatX = b.seatD = null;
      fx(st, 'seat', { id: c.id, who: b.id, kind: c.kind });
      Sfx.play(c.kind === 'cup' ? 'arcadepinballCupIn' : c.kind === 'scoop' ? 'arcadepinballScoop' : 'arcadepinballTwinReady');
      return;
    }
  }
  function credit(st, who, why) { if (who >= 0) { st.opened[who]++; fx(st, 'credit', { who, why }); } }
  function openGate(st, id, by, latch) {
    const g = st.gate[id];
    if (g.latched) return;
    const was = g.open; g.open = true;
    if (latch) { g.latched = true; }
    if (!was) { g.t = 0; g.by = by; fx(st, 'gateUp', { id, who: by }); Sfx.play('arcadepinballGateUp'); addScore(st, 2500); }
  }
  function switches(st, dt) {
    const B = st.balls;
    // star roll-overs
    for (const c of TB.controls) if (c.kind === 'star') {
      const g = TB.gates.find(q => q.by === c.id);
      if (!g || st.gate[g.id].latched) continue;
      const b = B.find(q => (q.mode === 'roll' || q.mode === 'seat') && q.h < 0.8 && hyp(q.x - c.x, q.d - c.d) < S.STAR_R);
      if (b) { openGate(st, g.id, b.id, true); credit(st, b.id, 'star'); fx(st, 'star', { id: c.id, who: b.id }); Sfx.play('arcadepinballRollOver'); }
    }
    // hold cups: a drop gate stays down while a ball sits in its cup; a gate cannot close on a ball
    for (const g of TB.gates) if (g.hold) {
      const G2 = st.gate[g.id];
      if (G2.latched) continue;
      const holder = seated(st, g.by);
      if (holder && !G2.open) { G2.open = true; G2.t = 0; G2.by = holder.id; fx(st, 'gateDown', { id: g.id, who: holder.id }); Sfx.play('arcadepinballGateDown'); }
      else if (!holder && G2.open) {
        const blocked = B.some(q => Math.abs(q.d - g.d) < R + 0.3 && q.x > g.x0 - R && q.x < g.x1 + R);
        if (!blocked) { G2.open = false; G2.t = 0; fx(st, 'gateUp2', { id: g.id }); Sfx.play('arcadepinballGateUp', 1); }
      }
    }
    // latching: whatever a ball has fully passed stays open
    for (const g of TB.gates) {
      const G2 = st.gate[g.id];
      if (G2.latched || !G2.open) continue;
      const b = B.find(q => q.mode === 'roll' && q.d > g.d + R + 0.15 && q.x > g.x0 && q.x < g.x1);
      if (b) { G2.latched = true; if (g.hold) credit(st, G2.by, 'cup'); fx(st, 'latch', { id: g.id, who: b.id }); }
    }
    for (const s of TB.stairs) {
      const S2 = st.stairs[s.id];
      if (S2.latched) continue;
      const top = s.steps[s.steps.length - 1];
      const b = B.find(q => q.mode === 'roll' && q.d > top + R + 0.2 && q.x > s.x0 && q.x < s.x1 && q.d < top + 8);
      if (b) { S2.latched = true; credit(st, st.bank[s.by].by, 'targets'); fx(st, 'stairsDone', { id: s.id, who: b.id }); Sfx.play('arcadepinballStairStep', 5); }
    }
    for (const br of TB.bridges) {
      const S2 = st.bridge[br.id];
      if (S2.latched) continue;
      const lane = br.lane;
      const b = B.find(q => q.mode === 'roll' && laneOf(q.x) === lane && q.d > br.d1 + R + 0.1 && q.d < br.d1 + 10);
      if (b && S2.t > 0) { S2.latched = true; credit(st, S2.by, 'spinner'); fx(st, 'bridgeLatch', { id: br.id, who: b.id }); }
    }
    // target banks pop back up one at a time (not while gold help is on, not with a ball against it)
    for (const c of TB.controls) if (c.kind === 'targets') {
      const Bk = st.bank[c.id];
      const s = TB.stairs.find(q => q.by === c.id);
      if (!Bk.n || (s && st.stairs[s.id].latched) || helpOn(st, c.d)) continue;
      Bk.popT -= dt;
      if (Bk.popT <= 0) {
        const ti = Bk.order[Bk.order.length - 1], tg = c.targets[ti];
        if (B.some(q => hyp(q.x - tg.x, q.d - tg.d) < R + 0.9)) { Bk.popT = 0.5; continue; }
        // a ball part-way up the staircase keeps its step: the top step only drops when nobody stands above it
        if (s && B.some(q => laneOf(q.x) === s.lane && q.d > s.steps[Bk.n - 1] - 0.4 && q.d < s.steps[s.steps.length - 1] + R + 0.2)) { Bk.popT = 0.5; continue; }
        Bk.order.pop(); Bk.down[ti] = false; Bk.n--; Bk.popT = S.POP;
        fx(st, 'targetUp', { bank: c.id, ti }); Sfx.play('arcadepinballTargetReset');
      }
    }
    // flippers for a friend: a fresh press of the button fires the other lane's flipper (after the glow)
    for (const f of TB.flippers) {
      const F = st.flip[f.id], btn = TB.byId[f.button], cr = TB.byId[f.cradle];
      const on = onPad(st, btn, 1.2);
      const P = st.pad[btn.id] || (st.pad[btn.id] = { on: false });
      F.cool = Math.max(0, F.cool - dt);
      if (on && !P.on && F.ch <= 0 && F.cool <= 0) { F.ch = S.TELL; F.by = on.id; fx(st, 'flipCharge', { id: f.id, who: on.id }); Sfx.play('arcadepinballFlipperCharge'); Sfx.play('arcadepinballButton'); }
      P.on = !!on;
      if (F.ch > 0) {
        F.ch -= dt;
        if (F.ch <= 0) {
          F.ch = 0; F.cool = S.FLIP_COOL;
          const rider = seated(st, cr.id);
          fx(st, 'flip', { id: f.id, who: rider ? rider.id : -1 }); Sfx.play('arcadepinballFlipperFire');
          if (rider) { rider.locked = false; startArc(st, rider, f.to, f.apex, f.dur, 'flip'); st.ledge[f.id].launched = true; credit(st, F.by, 'flipper'); addScore(st, 5000); }
        }
      }
      // the ledge latches once a ball from this lane is above it (a ramp folds down: falling back never needs the flipper again)
      if (!st.ledge[f.id].latched && B.some(q => q.mode === 'roll' && laneOf(q.x) === cr.lane && q.d > cr.d + 3.4 && q.d < cr.d + 14)) { st.ledge[f.id].latched = true; fx(st, 'ledgeDown', { id: f.id }); }
    }
    // the detour lever: works only while the button below is held
    const lev = TB.byId.lever;
    if (lev) {
      const P = st.pad.lever || (st.pad.lever = { on: false });
      const on = onPad(st, lev, 1.15);
      // a ball on the lever pulls it the moment the button below is held, whichever of the two got there first
      if (on && !st.gate[lev.gate].latched) {
        const held = onPad(st, TB.byId[lev.needs], 1.2);
        if (held) { openGate(st, lev.gate, on.id, true); credit(st, on.id, 'lever'); fx(st, 'lever', { ok: true, who: on.id }); Sfx.play('arcadepinballLever'); }
        else if (!P.on) { fx(st, 'lever', { ok: false, who: on.id }); Sfx.play('arcadepinballLever', 1); }
      }
      P.on = !!on;
    }
    // save posts: sitting on your section's post while your partner drains kicks them straight back out
    for (const b of B) {
      if (b.mode !== 'drain' || b.t2 > S.DRAIN_T - 0.05) continue;
      const o = B[1 - b.id];
      if (o.mode !== 'roll' || o.air) continue;
      const sec = TB.secAt(o.d);
      if (!sec.save) continue;
      const post = sec.save.find(s => hyp(o.x - s[0], o.d - s[1]) < 1.15);
      if (post) saveBall(st, b, o);
    }
    // twin flippers: both seated, a ring fills, both fly
    for (const t of TB.twins) {
      const T2 = st.twin[t.id];
      const a = seated(st, t.cradles[0]), c = seated(st, t.cradles[1]);
      if (a && c) {
        if (T2.ring === 0) fx(st, 'twinRing', { id: t.id });
        T2.ring += dt;
        if (T2.ring >= S.TWIN_T) {
          T2.ring = 0;
          fx(st, 'twinFire', { id: t.id }); Sfx.play('arcadepinballFlipperFire'); Sfx.play('arcadepinballTwinFire');
          startArc(st, a, t.to[0], t.apex, t.dur, 'twin', t.loop); startArc(st, c, t.to[1], t.apex, t.dur, 'twin', t.loop); addScore(st, 10000);
        }
      } else T2.ring = 0;
    }
    // the Comet Jackpot: both scoops at once
    if (st.phase === 'play') {
      const a = seated(st, 'scoopL'), c = seated(st, 'scoopR');
      if (a && c) { st.phase = 'jackpot'; st.phaseT = 0; a.locked = c.locked = true; fx(st, 'jackpotHush'); Music.cue && Music.cue({ song: null }); }
    }
  }

  /* ---------- the table firing by itself: bumpers, slingshots, the great flippers, kickers ---------- */
  function table(st, dt) {
    const B = st.balls;
    TB.posts.forEach((p, k) => {
      if (p.kind !== 'bumper') return;
      const S2 = st.bump[k];
      S2.cool = Math.max(0, S2.cool - dt);
      if (S2.ch > 0) {
        S2.ch -= dt;
        if (S2.ch <= 0) {
          S2.ch = 0; S2.cool = S.BUMP_COOL; let hit = false;
          for (const b of B) {
            if (b.mode !== 'roll' || b.h > 1.2) continue;
            const dx = b.x - p.x, dd = b.d - p.d, dist = hyp(dx, dd);
            if (dist > p.r + R + 0.6) continue;
            const nx = dist > 1e-4 ? dx / dist : 0, nd = dist > 1e-4 ? dd / dist : -1;
            // thrown straight out from the bumper, keeping most of the speed it had across it
            const vn = b.vx * nx + b.vd * nd, tx = b.vx - vn * nx, td = b.vd - vn * nd;
            b.vx = nx * S.BUMP_V + tx * 0.8; b.vd = nd * S.BUMP_V + td * 0.8; b.air = true; b.vh = 3.2; b.bumped = S.IMMUNE; b.imm = Math.max(b.imm, 0.25);
            b.squash = 1; b.sqN = [nx, nd];
            hit = true;
          }
          fx(st, 'bumper', { bk: k, hit }); Sfx.play('arcadepinballBumper', k % 4); if (hit) addScore(st, 1000);
        }
      } else if (S2.cool <= 0 && B.some(b => b.mode === 'roll' && b.h < 1 && hyp(b.x - p.x, b.d - p.d) < p.r + R + 0.35)) { S2.ch = S.TELL; fx(st, 'bumpCharge', { bk: k }); }
    });
    TB.slings.forEach((s, k) => {
      const S2 = st.sling[k];
      S2.cool = Math.max(0, S2.cool - dt);
      const near = b => b.mode === 'roll' && b.h < 1 && segDist(b.x, b.d, s.a[0], s.a[1], s.b[0], s.b[1]) < R + 0.75;
      if (S2.ch > 0) {
        S2.ch -= dt;
        if (S2.ch <= 0) {
          S2.ch = 0; S2.cool = S.BUMP_COOL;
          for (const b of B) if (near(b)) {
            // the rubber kicks the ball off its face, keeping a little of its speed along the face
            const along = (b.vx * -s.n[1] + b.vd * s.n[0]) * 0.4;
            b.vx = s.n[0] * S.SLING_V - s.n[1] * along; b.vd = s.n[1] * S.SLING_V + s.n[0] * along + 1.2; b.air = true; b.vh = 2.6; b.imm = Math.max(b.imm, 0.4);
            b.squash = 1; b.sqN = [s.n[0], s.n[1]];
          }
          fx(st, 'sling', { sk: k }); Sfx.play('arcadepinballSlingshot');
        }
      } else if (S2.cool <= 0 && B.some(near)) { S2.ch = S.TELL; fx(st, 'slingCharge', { sk: k }); }
    });
    for (const k of TB.kickers) {
      const K = st.kick[k.id];
      K.cool = Math.max(0, K.cool - dt);
      if (k.great) {
        if (K.ch > 0) {
          K.ch -= dt;
          if (K.ch <= 0) { K.ch = 0; K.cool = 0.9; for (const b of B) if (b.mode === 'roll' && hyp(b.x - k.x, b.d - k.d) < k.r + 0.4) { b.vx = k.kick[0] + (b.x - k.x) * 0.5; b.vd = k.kick[1]; b.air = true; b.vh = 3.4; b.squash = 1; b.sqN = [0, 1]; } fx(st, 'great', { id: k.id }); Sfx.play('arcadepinballFlipperFire'); }
        } else if (K.cool <= 0 && st.phase === 'play' && B.some(b => b.mode === 'roll' && !b.air && hyp(b.x - k.x, b.d - k.d) < k.r && b.vd < 0.6)) { K.ch = S.TELL; fx(st, 'greatCharge', { id: k.id }); Sfx.play('arcadepinballFlipperCharge'); }
        continue;
      }
      // ride kickers (the detour, the crossings): a ball that rolls in is held, glows, then rides
      if (K.ch > 0) {
        K.ch -= dt;
        const b = B[K.who];
        if (K.ch <= 0) { K.ch = 0; K.cool = 0.6; if (b && b.mode === 'kick') { startRide(st, b, TB.byId[k.ride]); fx(st, 'kicker', { id: k.id, who: b.id }); Sfx.play('arcadepinballKicker'); Sfx.play('arcadepinballWireRamp'); } }
        continue;
      }
      if (K.cool > 0) continue;
      for (const b of B) {
        if (b.mode !== 'roll' || b.air || hyp(b.x - k.x, b.d - k.d) > k.r) continue;
        if (!kickerReady(st, k, b)) { k._why = kickerWhy(st, k, b); continue; }
        b.mode = 'kick'; b.kickId = k.id; K.ch = 0.45; K.who = b.id; b.vx = b.vd = 0;
        fx(st, 'kickCharge', { id: k.id, who: b.id }); Sfx.play('arcadepinballFlipperCharge');
        break;
      }
    }
  }
  // a crossing or the detour only fires when the partner is in the other lane (two balls in one lane would both end up
  // on one side for good); the detour's way back down only once its gate is open
  function kickerReady(st, k, b) {
    const o = st.balls[1 - b.id];
    if (k.needs) return !gateShut(st, k.needs);
    if (k.cross) {
      // where will the partner be once it is over (or is over already)? Riding this crossing: where its wire lands.
      // Already above the crossing: the lane it is in. Still below it: the other lane from the one it is in now.
      // (The review found the old test only looked at a partner close by below, so once one ball was over, the other
      // could come round to the same kicker and follow it: both in one lane above the divider, with no way back.)
      const ro = o.mode === 'ride' && o.ride && o.ride.id && TB.byId[o.ride.id], rp = ro && ro.pts[ro.pts.length - 1];
      const over = o.mode === 'kick' ? false : o.d > k.d + 2.8;
      const oEnd = rp && Math.abs(ro.pts[0][1] - k.d) < 1 ? laneOf(rp[0]) : over ? laneOf(o.x) : -laneOf(o.x);
      return oEnd !== -laneOf(k.x);
    }
    if (k.pair) return laneOf(o.x) !== laneOf(b.x) || o.d > k.d + 4;
    return true;
  }
  function kickerWhy(st, k) { return k.needs ? 'gate' : 'lane'; }
  CO.kickerReady = kickerReady;

  /* ---------- rides, launches, drains ---------- */
  // a wire ride's timing table: arc length along the path and the starting speed that makes the ride take its dur when
  // the ball runs fast low down and slow up high (energy: v^2 = v0^2 - 2 g (h - h0), never below RIDE_VMIN)
  function rideTable(r) {
    if (r._tab) return r._tab;
    const n = Math.max(24, (r.pts.length - 1) * 24), us = [0], ss = [0], hs = [];
    let q0 = TB.rideAt(r, 0), len = 0; hs.push(q0[2]);
    for (let k = 1; k <= n; k++) { const q = TB.rideAt(r, k / n); len += hyp(q[0] - q0[0], q[1] - q0[1], q[2] - q0[2]); us.push(k / n); ss.push(len); hs.push(q[2]); q0 = q; }
    const h0 = hs[0], vAt = (v0, h) => Math.sqrt(Math.max(S.RIDE_VMIN * S.RIDE_VMIN, v0 * v0 - 2 * S.RIDE_G * (h - h0)));
    const time = v0 => { let t = 0; for (let k = 1; k <= n; k++) t += (ss[k] - ss[k - 1]) / vAt(v0, (hs[k] + hs[k - 1]) / 2); return t; };
    let lo = 0.05, hi = 400;
    for (let i = 0; i < 48; i++) { const m = (lo + hi) / 2; if (time(m) > r.dur) lo = m; else hi = m; }
    const tab = { us, ss, hs, h0, len, v0: (lo + hi) / 2, vAt };
    Object.defineProperty(r, '_tab', { value: tab, enumerable: false, configurable: true });
    return tab;
  }
  const uAt = (T, s) => {
    let a = 0, b = T.ss.length - 1;
    if (s >= T.len) return 1;
    while (b - a > 1) { const m = (a + b) >> 1; if (T.ss[m] > s) b = m; else a = m; }
    const f = (s - T.ss[a]) / ((T.ss[b] - T.ss[a]) || 1);
    return T.us[a] + (T.us[b] - T.us[a]) * f;
  };
  CO.rideTable = rideTable;
  function startRide(st, b, r, soft) {
    b.mode = 'ride'; b.ride = { pts: r.pts, dur: r.dur, t: 0, id: r.id, nx: 0, s: 0, tab: rideTable(r), soft: !!(soft || r.soft) }; b.air = true; b.kickId = null; b.skid = 0;
  }
  function startArc(st, b, to, apex, dur, why, loop) {
    const x0 = b.x, d0 = b.d, x1 = to[0], d1 = to[1];
    b.mode = 'ride'; b.seat = null; b.air = true; b.so = null; b.skid = 0; b.seatCool = S.SEAT_COOL;
    if (loop) {
      const pts = [[x0, d0, 0], [x0 * 0.9, d0 + 4, apex], [x0 * 0.6, d0 + 7, apex + 7], [x0 * 0.3, d0 + 4.5, apex + 11], [x0 * 0.4, d0 + 1.5, apex + 6], [x1 * 0.6, d0 + 7, 3 - TB.T.LIFT3 * 0.5], [x1, d1 - 3, 0.6 - TB.T.LIFT3 * 0.1], [x1, d1, 0]];
      const r = { pts, dur, t: 0, nx: 0, s: 0, why };
      r.tab = rideTable(r); b.ride = r;
      return;
    }
    // a true throw: the time in the air comes from its height under the one gravity (up and down again)
    const T = 2 * Math.sqrt(2 * apex / S.GRAV);
    // how far a nudge may carry it: only as far as the landing stays clear of rails, posts and holes in its own lane
    const lane = laneOf(x1), rw = TB.secAt(d1).rail || TB.T.RAIL, ok = x => laneOf(x) === lane && Math.abs(x) >= 1.25 && Math.abs(x) <= rw - 1.2 && CO.free(st, x, d1, 0.15) && !CO.inHole(st, x, d1, 0.4);
    let lo = 0, hi = 0;
    while (lo > -S.NUDGE && ok(x1 + lo - 0.1)) lo -= 0.1;
    while (hi < S.NUDGE && ok(x1 + hi + 0.1)) hi += 0.1;
    b.ride = { arc: true, x0, d0, x1, d1, apex, dur: T, t: 0, nx: 0, lo, hi, why };
  }
  // land off a ride: carry the speed it arrived with (a pad lets it skid down), bounce if it came down hard
  function landRide(st, b, vx, vd, vh, soft) {
    b.mode = 'roll'; b.h = 0; b.rideH = 0; b.ride = null; b.seatCool = 0.2; b.land = 0.3;
    b.vx = vx; b.vd = vd; b.skid = 0.5; b.skidV = soft ? S.LAND_SOFT : S.LAND_VMAX;
    if (-vh > S.BOUNCE_V) { b.air = true; b.vh = Math.min(S.BOUNCE_MAX, -vh * S.E_FLOOR); } else { b.air = false; b.vh = 0; }
    b.squash = Math.min(1, -vh / 14); b.sqN = [0, 0];
    collide(st, b, b.d);
    fx(st, 'land', { who: b.id, x: b.x, d: b.d, big: true, v: Math.max(-vh, 0), sk: hyp(vx, vd) }); Sfx.play('arcadepinballLand', 1);
  }
  function rideStep(st, b, ix, dt) {
    const r = b.ride;
    r.t += dt;
    let x, d, h, done;
    const pd = b.d, px = b.x, ph = b.rideH || 0;
    if (r.arc) {
      const u = Math.min(1, r.t / r.dur);
      r.nx = clampv(r.nx + ix * S.NUDGE_V * dt, r.lo, r.hi);
      x = r.x0 + (r.x1 - r.x0) * u + r.nx * u; d = r.d0 + (r.d1 - r.d0) * u; h = 4 * r.apex * u * (1 - u);
      done = u >= 1;
    } else {
      // along the wire at the speed its height allows
      const T = r.tab || (r.tab = rideTable(r));
      const s1 = (r.s || 0) + T.vAt(T.v0, ph) * dt;
      r.over = Math.max(0, s1 - T.len); r.s = Math.min(T.len, s1);
      [x, d, h] = TB.rideAt(r, uAt(T, r.s));
      done = r.s >= T.len - 1e-6;
    }
    b.x = x; b.d = d; b.h = Math.max(0, h); b.rideH = h;
    b.spin += (d - pd) / R * 1.4; b.rollA += (x - px) / R;
    if (done) {
      let vx, vd, vh;
      if (r.arc) {
        vx = (r.x1 - r.x0 + r.nx) / r.dur; vd = (r.d1 - r.d0) / r.dur; vh = -4 * r.apex / r.dur;
        const over = r.t - r.dur; if (over > 0) { b.x += vx * over; b.d += vd * over; }
      }
      else {
        // the wire's last direction at the speed it ends with
        const T = r.tab, a = TB.rideAt(r, 0.995), z = TB.rideAt(r, 1), L = hyp(z[0] - a[0], z[1] - a[1], z[2] - a[2]) || 1, v = T.vAt(T.v0, z[2]);
        vx = (z[0] - a[0]) / L * v; vd = (z[1] - a[1]) / L * v; vh = (z[2] - a[2]) / L * v;
        // a wire whose end curls into a guide (r.exit) sends the ball off that way at the same speed
        const ex = r.exit || (r.id && TB.byId[r.id] && TB.byId[r.id].exit);
        if (ex) { const sp = hyp(vx, vd), el = hyp(ex[0], ex[1]); vx = ex[0] / el * sp; vd = ex[1] / el * sp; }
        // the bit of the last step past the wire's end is rolled on the table (no hitch in the landing frame)
        if (r.over) { const sp = hyp(vx, vd) || 1, k = r.over * Math.min(1, sp / v); b.x += vx / sp * k; b.d += vd / sp * k; }
      }
      landRide(st, b, vx, vd, vh, r.soft || r.knock || r.shoot);
      b.imm = r.knock ? 1.0 : 0.4;
    }
  }
  function spawnFor(st, b, d, lane) {
    const sec = TB.secAt(d);
    const sp = sec.spawn[lane < 0 ? 0 : 1];
    const o = st.balls[1 - b.id];
    let sx = sp[0], sd = sp[1];
    if (hyp(o.x - sx, o.d - sd) < 2.2) sd += 2.2;
    return [sx, sd, sec];
  }
  function startDrain(st, b, h) {
    b.mode = 'drain'; b.t2 = 0; b.hole = h; b.dvx = b.vx; b.dvd = b.vd; b.vx = b.vd = 0; b.air = false; b.vh = 0;
    const sec = TB.secAt(b.d);
    st.drains++; st.partDrains[sec.part]++; st.secDrains[sec.i]++;
    fx(st, 'drain', { who: b.id, x: b.x, d: b.d }); Sfx.play('arcadepinballDrain');
    checkHelp(st, sec.i);
  }
  function startDrop(st, b, h) {
    b.mode = 'drop'; b.t2 = 0; b.hole = h; b.dvx = b.vx; b.dvd = b.vd; b.vx = b.vd = 0; b.h0 = b.h; b.vh0 = Math.min(0, b.vh); b.air = false; b.vh = 0;
    st.drops++; st.secDrains[TB.secAt(b.d).i] += 0.5;
    fx(st, 'drop', { who: b.id, x: b.x, d: b.d }); Sfx.play('arcadepinballDrain', 1);
  }
  function startShoot(st, b, fromDrop) {
    const lane = b.hole && b.hole.r != null ? laneOf(b.hole.x) : laneOf(b.x);
    const [sx, sd] = spawnFor(st, b, b.d, lane);
    const rw = TB.secAt(sd).rail || TB.T.RAIL;
    b.mode = 'ride'; b.air = true; b.h = 0;
    b.ride = { pts: [[rw + 1.6, sd - 9, 0.2], [rw + 1.6, sd - 3, 0.2], [rw + 1.3, sd + 0.6, 1.4], [(rw + sx) * 0.5, sd + 1.6, 2.4], [sx, sd, 0]], dur: S.SHOOT_T, t: 0, nx: 0, shoot: true };
    b.x = rw + 1.6; b.d = sd - 9;
    fx(st, 'plunger', { who: b.id }); Sfx.play('arcadepinballPlunger');
  }
  function saveBall(st, b, saver) {
    const h = b.hole, s = laneOf(h.r != null ? h.x : (h.x0 + h.x1) / 2);
    b.mode = 'roll'; b.x = h.r != null ? h.x - s * 1.7 : s * 4; b.d = h.r != null ? h.d + 0.4 : h.d1 + 1.2; b.vx = -s * 4; b.vd = 1.2; b.air = true; b.vh = 4.5; b.imm = 1.2;
    st.saves++; st.drains--; const sec = TB.secAt(b.d); st.partDrains[sec.part] = Math.max(0, st.partDrains[sec.part] - 1); st.secDrains[sec.i] = Math.max(0, st.secDrains[sec.i] - 1);
    fx(st, 'saved', { who: b.id, by: saver.id, x: b.x, d: b.d }); Sfx.play('arcadepinballSaved'); addScore(st, 5000);
  }
  function knockBack(st, b, why) {
    const [sx, sd] = spawnFor(st, b, b.d, laneOf(b.x));
    b.mode = 'ride'; b.air = true;
    b.ride = { pts: [[b.x, b.d, 0], [(b.x + sx) / 2, (b.d + sd) / 2 + 0.6, 1.6], [sx, sd, 0]], dur: S.KNOCK_T, t: 0, nx: 0, knock: true };
    st.knocks++; fx(st, 'knocked', { who: b.id, why }); Sfx.play('arcadepinballLooseHit');
  }

  /* ---------- hazards: magnets, silver balls, the flood, TILT, the rocket's wash ---------- */
  function hazards(st, dt) {
    const B = st.balls, lead = Math.max(B[0].d, B[1].d);
    TB.magnets.forEach((M, k) => {
      const m = st.magnets[k];
      const sec = TB.secAt(M.d);
      if (lead < sec.d0) return;
      m.cool = Math.max(0, m.cool - dt);
      if (m.hold >= 0) return;
      m.x += m.dir * M.v * hzSlow(st, M.d) * dt;
      if (m.x > M.x1) { m.x = M.x1; m.dir = -1; } else if (m.x < M.x0) { m.x = M.x0; m.dir = 1; }
      if (m.cool > 0) return;
      for (const b of B) {
        if (b.mode !== 'roll' || b.air || b.h > 0.2 || b.magCool[k] > 0 || b.imm > 0) continue;
        if (hyp(b.x - m.x, b.d - M.d) < S.MAG_R) { b.mode = 'magnet'; b.carry = k; b.t2 = 0; m.hold = b.id; fx(st, 'magGrab', { m: k, who: b.id }); Sfx.play('arcadepinballMagnetGrab'); break; }
      }
    });
    // silver balls served down a lane: a lit path for S.LOOSE_WARN s, then the ball rolls down its track
    for (const L of TB.loose) {
      const sec = TB.sections[L.sec];
      const on = lead >= sec.d0 && !(B[0].d > sec.d1 && B[1].d > sec.d1);
      if (on && st.looseOn[L.id] == null) st.looseOn[L.id] = st.t;
      if (!on || st.looseOn[L.id] == null) continue;
      const per = L.per / hzSlow(st, L.d0), c = (st.t - st.looseOn[L.id] + L.ph) % per, cPrev = (st.t - dt - st.looseOn[L.id] + L.ph) % per;
      if (c < cPrev) { st.loose.push({ id: L.id, x: L.x, d: L.d0, d1: L.d1, v: S.LOOSE_V * hzSlow(st, L.d0), spin: 0, n: st.fxN + 1 }); fx(st, 'looseOut', { id: L.id }); Sfx.play('arcadepinballKicker', 1); }
    }
    stepSilver(st, st.loose, dt, false);
    if (st.floodOn) {
      st.floodT += dt;
      for (const f of TB.flood) {
        const c = (st.floodT + f.ph) % f.per, cPrev = (st.floodT - dt + f.ph) % f.per;
        if (c < cPrev && st.floodT > 0.2) {
          const n = Math.floor((st.floodT + f.ph) / f.per);
          // help on the ramp: every other row stays home
          if (!(helpOn(st, 390) && n % 2 === 1)) st.flood.push({ x: f.xs[f.pattern[n % f.pattern.length]], half: f.half, d: f.d0, d1: f.d1, v: S.FLOOD_V * hzSlow(st, 390), spin: 0 });
        }
      }
      stepSilver(st, st.flood, dt, true);
    }
    // TILT, authored: when the leading ball first passes `at` (never while a ball is on a spinner bridge)
    const T2 = st.tilt;
    if (T2.t > 0) { T2.t -= dt; if (T2.t <= 0) { T2.t = 0; fx(st, 'tiltEnd'); } }
    else if (T2.warn > 0) {
      T2.warn -= dt;
      if (T2.warn <= 0) { T2.warn = 0; T2.t = S.TILT_T; fx(st, 'tilt', { dir: T2.dir }); Sfx.play('arcadepinballTilt'); }
    } else {
      TB.tilts.forEach((tl, k) => {
        if (T2.done[k] || lead < tl.at || T2.warn > 0) return;
        const onBridge = B.some(b => TB.bridges.some(br => laneOf(b.x) === br.lane && b.d > br.d0 - 2.5 && b.d < br.d1 + 1.5 && st.bridge[br.id].t > 0));
        if (onBridge || st.phase !== 'play') return;
        T2.done[k] = true; T2.i = k; T2.dir = tl.dir; T2.warn = S.TILT_WARN; fx(st, 'tiltWarn', { dir: tl.dir }); Sfx.play('arcadepinballTiltWarning');
      });
    }
    // the rocket's wash across the rails
    st.wind = 0;
    for (const w of TB.winds) {
      if (!B.some(b => b.d > w.d0 && b.d < w.d1)) continue;
      const c = (st.t + w.ph) % w.per, n = Math.floor((st.t + w.ph) / w.per);
      if (c < w.on) st.wind = (n % 2 ? -1 : 1) * w.push;
    }
  }
  function stepSilver(st, list, dt, flood) {
    for (let i = list.length - 1; i >= 0; i--) {
      const s = list[i];
      s.d -= s.v * dt; s.spin += s.v * dt / TB.T.LOOSE_R;
      if (s.d < s.d1) { list.splice(i, 1); continue; }
      for (const b of st.balls) {
        if (b.mode !== 'roll' || b.h > 0.95 || b.imm > 0) continue;
        if (hyp(b.x - s.x, b.d - s.d) < (R + TB.T.LOOSE_R) * (flood ? S.FLOOD_HIT : 1)) {
          if (flood) {
            b.mode = 'ride'; b.air = true; const td = Math.max(382.6, b.d - S.FLOOD_BACK);
            b.ride = { pts: [[b.x, b.d, 0], [b.x, (b.d + td) / 2, 1.4], [b.x, td, 0]], dur: 0.8, t: 0, nx: 0, knock: true };
            st.knocks++; fx(st, 'knocked', { who: b.id, why: 'flood' }); Sfx.play('arcadepinballLooseHit');
            // a knock on the ramp counts toward gold help there (eight knocks light it), and the ball gets a breather
            const si = TB.secAt(b.d).i; st.secKnocks[si] = (st.secKnocks[si] || 0) + 1; checkHelp(st, si);
          } else knockBack(st, b, 'loose');
          b.imm = 0.6;
        }
      }
    }
  }

  /* ---------- sections, help, the finish ---------- */
  function sections(st, dt) {
    const B = st.balls;
    for (const b of B) {
      if (b.mode === 'roll' || b.mode === 'seat') { b.sec = TB.secAt(b.d).i; b.lane = laneOf(b.x); }
    }
    st.lead = Math.max(B[0].d, B[1].d);
    const both = Math.min(B[0].sec, B[1].sec);
    if (both > st.both && B[0].lane !== B[1].lane && B.every(b => b.mode === 'roll' || b.mode === 'seat')) st.both = both;
    // time in a section that is not yet behind both balls
    const cur = new Set(B.map(b => b.sec));
    for (const i of cur) {
      if (i <= st.both - 1) continue;
      st.secT[i] += dt / cur.size;
      checkHelp(st, i);
    }
  }
  function checkHelp(st, i) {
    if (st.help[i]) return;
    if (st.secT[i] >= S.HELP_T || st.secDrains[i] >= S.HELP_DRAINS || (st.secKnocks[i] || 0) >= S.HELP_KNOCKS) {
      st.help[i] = true; st.helpN++; st.helpMsgT = st.t;
      st.helpMsg = st.secDrains[i] >= S.HELP_DRAINS ? 'Gold help: the table calms down here and the lights show the way' : 'Gold help: gold lights show what opens what, and the hazards slow down';
      fx(st, 'help', { sec: i }); Sfx.play('arcadepinballHelp');
    }
  }
  CO.say = say;

  /* ---------- the step ---------- */
  CO.step = function (st, dt) {
    const ps = G.players;
    st.t += dt; st.phaseT += dt; st.cn = (st.cn || 0) + 1;
    K3D.heading = 0;
    if (st.phase === 'open') {
      const skip = ps.some(p => p.pendingJump) && (G.results[G.levelIndex] || store.get('done:' + G.level.def.name));
      for (const p of ps) { p.pendingJump = false; p.pendingAct = false; }
      if (st.phaseT >= S.OPEN_T || skip) { st.phase = 'play'; st.phaseT = 0; fx(st, 'go'); Sfx.play('arcadepinballPlunger'); }
      return;
    }
    if (st.phase === 'finish') {
      for (const p of ps) { p.pendingJump = false; p.pendingAct = false; }
      if (st.phaseT >= S.FINISH_T && !st.finished) { st.finished = true; levelClear(); }
      return;
    }
    if (st.phase === 'jackpot') {
      if (st.phaseT >= 1.1 && !st.jack) { st.jack = 1; fx(st, 'multiball'); Sfx.play('arcadepinballMultiball'); Sfx.play('arcadepinballJackpot'); addScore(st, 250000); st.floodOn = true; st.floodT = 0; }
      if (st.phaseT >= S.JACK_T && st.jack === 1) {
        st.jack = 2; st.phase = 'play'; st.phaseT = 0;
        for (const b of st.balls) { b.locked = false; b.seat = null; startRide(st, b, TB.byId[b.x < 0 ? 'rJackL' : 'rJackR']); }
      }
    }
    for (const p of ps) ballStep(st, st.balls[p.id], p, dt);
    pairBump(st);
    for (const b of st.balls) seatCheck(st, b);
    for (const b of st.balls) starCheck(st, b);
    switches(st, dt);
    table(st, dt);
    hazards(st, dt);
    for (const id in st.bridge) { const br = st.bridge[id]; if (br.t > 0 && !br.latched) { const was = br.t; br.t = Math.max(0, br.t - dt * (helpOn(st, TB.byId[id].d0) ? 0.75 : 1)); if (Math.ceil(was) !== Math.ceil(br.t)) { fx(st, br.t > 0 ? 'bridgeCount' : 'bridgeGone', { id, n: Math.ceil(br.t) }); Sfx.play(br.t > 0 ? 'arcadepinballBridgeCount' : 'arcadepinballBridgeGone', Math.ceil(br.t)); } } }
    sections(st, dt);
    // the comet's mouth: the first ball in is caught and held safe from the flood (its own side of the mouth),
    // and when the partner rolls in too, the finish
    const m = TB.byId.mouth;
    if (st.phase === 'play') {
      for (const b of st.balls) {
        if (b.mode !== 'roll' || b.d <= 404.8 || hyp(b.x - m.x, b.d - m.d) >= m.r + 0.5) continue;
        const o = st.balls[1 - b.id], oIn = o.mode === 'seat' && o.seat === 'mouth';
        let side = b.x < m.x ? -1 : 1;
        if (oIn && Math.sign(o.seatX - m.x) === side) side = -side;
        b.seatX = m.x + side * 1.7; b.seatD = m.d - 0.4;
        b.so = [b.x - b.seatX, b.d - b.seatD, b.vx, b.vd, 22];
        b.mode = 'seat'; b.seat = 'mouth'; b.locked = true; b.vx = b.vd = 0; b.air = false; b.h = 0;
        fx(st, 'seat', { id: 'mouth', who: b.id, kind: 'mouth' }); Sfx.play('arcadepinballScoop');
      }
      if (st.balls.every(b => b.mode === 'seat' && b.seat === 'mouth')) {
        st.phase = 'finish'; st.phaseT = 0; st.floodOn = false; fx(st, 'finish'); Sfx.play('arcadepinballFinish'); addScore(st, 1000000);
      }
    }
  };
  function starCheck(st, b) {
    if (b.mode !== 'roll' && b.mode !== 'ride' && b.mode !== 'seat') return;
    const bh = b.mode === 'ride' ? (b.rideH || 0) : b.h;
    for (let i = 0; i < TB.stars.length; i++) {
      if (st.got[i]) continue;
      const s = TB.stars[i];
      if (Math.abs(s[1] - b.d) > 1.6 || Math.abs(s[0] - b.x) > 1.6) continue;
      if (hyp(s[0] - b.x, s[1] - b.d) < R + 0.45 && (s[2] <= 0 ? bh < 1.4 : Math.abs(bh - s[2]) < 0.75)) {
        st.got[i] = 1; st.stars++; fx(st, 'starGot', { i, who: b.id }); Sfx.play('arcadepinballStar'); addScore(st, 500);
      }
    }
  }
  // the two glass balls meeting: a real clack (equal weights, momentum kept, E_PAIR of the hit given back). A ball sitting
  // in a cup or held by a kicker is as solid as a post. Afterwards both settle against the walls again, so a clack can
  // never shove a ball into a rail.
  function pairBump(st) {
    const [a, c] = st.balls;
    const moves = q => q.mode === 'roll', solid = q => moves(q) || (q.mode === 'seat' && q.seat !== 'mouth') || q.mode === 'kick';
    if (!solid(a) || !solid(c) || !(moves(a) || moves(c)) || Math.abs(a.h - c.h) > 1.3) return;
    let nx = c.x - a.x, nd = c.d - a.d; const dist = hyp(nx, nd);
    if (dist >= 2 * R || dist < 1e-6) return;
    nx /= dist; nd /= dist;
    const ma = moves(a) ? 1 : 0, mc = moves(c) ? 1 : 0, m = ma + mc, push = 2 * R - dist;
    a.x -= nx * push * ma / m; a.d -= nd * push * ma / m; c.x += nx * push * mc / m; c.d += nd * push * mc / m;
    const rel = (a.vx * nx + a.vd * nd) * ma - (c.vx * nx + c.vd * nd) * mc;
    if (rel > 0) {
      const j = (1 + eOf(S.E_PAIR, rel)) * rel / m;
      a.vx -= j * nx * ma; a.vd -= j * nd * ma; c.vx += j * nx * mc; c.vd += j * nd * mc;
      if (rel > 1.2) {
        // a real clack keeps both out of trouble for a moment (a bump never knocks a ball down a hole unfairly); a
        // steady shove does not, or two balls leaning on each other could roll straight over a gap or an outlane
        if (ma) a.imm = Math.max(a.imm, S.IMMUNE); if (mc) c.imm = Math.max(c.imm, S.IMMUNE);
        for (const q of [a, c]) { q.squash = Math.min(1, rel / 7); q.sqN = q === a ? [-nx, -nd] : [nx, nd]; }
        fx(st, 'ballBump', { x: (a.x + c.x) / 2, d: (a.d + c.d) / 2, v: rel }); Sfx.play('arcadepinballBallBump', Math.min(1, rel / 7));
      }
    }
    if (ma) collide(st, a, a.d);
    if (mc) collide(st, c, c.d);
  }

  /* ---------- what the scenery and the brain want to know ---------- */
  // where the camera should look: both balls' spots in (x, d, h)
  CO.spots = st => st.balls.map(b => ({ x: b.x, d: b.d, h: b.mode === 'ride' ? (b.rideH || 0) : b.h }));
  CO.secOf = d => TB.secAt(d);
  CO.starsMax = () => TB.stars.length;
  // test hooks (tools/w43/pinball-physics.js drives single balls through these)
  CO._t = { ballStep, collide, pairBump, startRide, startArc, seatCheck, table, hazards };
  return CO;
})();

/* ---------- HUD (ownHUD): stars, the map strip, banners and prompts ---------- */
PINBALL.hud = function (st) {
  if (!st || !st.balls) return;
  const TB = PINBALL_TABLE, t = G.clock || 0;
  // stars (shared)
  ctx.save();
  ctx.fillStyle = 'rgba(23,25,29,0.78)'; rr(14, 46, 132, 32, 16); ctx.fill();
  ctx.strokeStyle = 'rgba(255,215,110,0.5)'; ctx.lineWidth = 1.5; ctx.stroke();
  arcadepinballStarIcon(33, 62, 10, t);
  text(st.stars + ' / ' + TB.stars.length, 88, 62.5, 17, '#ffe9a8', 'center', 'body');
  ctx.restore();
  // the map strip up the left edge: the four parts, both balls
  const x0 = 22, y0 = 104, y1 = 470, L = TB.END + 4;
  ctx.save();
  ctx.fillStyle = 'rgba(23,25,29,0.6)'; rr(x0 - 8, y0 - 10, 20, y1 - y0 + 20, 10); ctx.fill();
  const yOf = d => y1 - (d / L) * (y1 - y0);
  const cols = ['#ff8a5a', '#ffd24a', '#7fe0ff', '#ff6ad5'];
  TB.parts.forEach((p, k) => { ctx.fillStyle = cols[k]; ctx.globalAlpha = 0.55; ctx.fillRect(x0 - 2, yOf(p.d1), 8, yOf(p.d0) - yOf(p.d1)); });
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x0 + 2, yOf(408), 4, 0, Math.PI * 2); ctx.fill();
  for (const b of st.balls) {
    const y = yOf(Math.max(0, b.d)), x = x0 + 2 + (b.x < 0 ? -4 : 4);
    ctx.fillStyle = PCOL[b.id]; ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(x, y, 5.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
  // TILT warning and TILT
  const T2 = st.tilt;
  if (T2.warn > 0 || T2.t > 0) {
    const flash = T2.t > 0 ? (Math.floor(t * 8) % 2 ? 1 : 0.55) : 0.5 + 0.5 * Math.sin(t * (10 + (2 - T2.warn) * 8));
    ctx.save(); ctx.globalAlpha = flash;
    ctx.fillStyle = T2.t > 0 ? 'rgba(160,20,30,0.9)' : 'rgba(90,30,20,0.85)'; rr(W / 2 - 110, 60, 220, 46, 12); ctx.fill();
    ctx.strokeStyle = '#ffd24a'; ctx.lineWidth = 2.5; ctx.stroke();
    text(T2.t > 0 ? 'TILT!' : 'TILT WARNING', W / 2, 84, T2.t > 0 ? 32 : 22, '#fff4cc', 'center', 'body');
    ctx.restore();
    if (T2.warn > 0) text('Sit in a cup or cradle, or hold on!', W / 2, 122, 15, '#ffe9a8', 'center', 'body');
  }
  // gold help banner
  if (st.t - st.helpMsgT < 5) {
    const a = Math.min(1, (5 - (st.t - st.helpMsgT)) * 2);
    ctx.save(); ctx.globalAlpha = a; ctx.font = '700 17px "Atkinson Hyperlegible", system-ui, sans-serif';
    const mw = ctx.measureText(st.helpMsg).width + 40;
    ctx.fillStyle = 'rgba(120,84,10,0.92)'; rr(W / 2 - mw / 2, 140, mw, 34, 17); ctx.fill(); ctx.strokeStyle = C.gold; ctx.lineWidth = 2; ctx.stroke();
    text(st.helpMsg, W / 2, 157.5, 17, '#ffe9a8', 'center', 'body'); ctx.restore();
  }
  // the opening: what to do, while the balls bounce down
  if (st.phase === 'open') {
    const a = clamp(Math.min((st.phaseT - 1.2) * 2, (PINBALL.S.OPEN_T - st.phaseT) * 2), 0, 1);
    if (a > 0) {
      ctx.save(); ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(23,25,29,0.82)'; rr(W / 2 - 250, H - 128, 500, 96, 16); ctx.fill();
      ctx.strokeStyle = 'rgba(255,215,110,0.55)'; ctx.lineWidth = 1.5; ctx.stroke();
      text('HOW TO PLAY', W / 2, H - 108, 14, '#ffd24a', 'center', 'body');
      for (const k of [0, 1]) {
        if (cpuSolo() && cpuOn(k)) continue;
        const x = cpuSolo() ? W / 2 : W / 2 + (k ? 125 : -125);
        text(NAMES[k], x, H - 84, 16, PCOL[k], 'center', 'body');
        // (rolling is every way, so the card shows all four keys: the review found it showing only left and right)
        const mv = playerDevice(k).kind === 'kb' ? ['jump', 'left', 'down', 'right'].map(w => btnLabel(k, w)).join(' ') : 'stick';
        text(mv + ' roll   ' + btnLabel(k, 'hop') + ' hop', x, H - 60, 15, '#f2ecdf', 'center', 'body');
      }
      ctx.restore();
    }
    if (G.results[G.levelIndex] || store.get('done:' + G.level.def.name)) text('Jump to skip', W - 80, H - 18, 13, 'rgba(255,255,255,0.7)', 'center', 'body');
  }
  // the computer's or the table's words
  const sy = st.says[st.says.length - 1];
  if (sy && st.t - sy.t < 4) {
    ctx.save(); ctx.globalAlpha = Math.min(1, (4 - (st.t - sy.t)) * 2);
    text(sy.text, W / 2, H - 40, 17, '#fff4cc', 'center', 'body');
    ctx.restore();
  }
};
function arcadepinballStarIcon(x, y, r, t) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * 2) * 0.12);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.8); g.addColorStop(0, 'rgba(255,220,120,0.6)'); g.addColorStop(1, 'rgba(255,200,90,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r * 1.8, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr2 = i % 2 ? r * 0.45 : r; ctx.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2); }
  ctx.closePath(); ctx.fillStyle = '#ffd24a'; ctx.fill(); ctx.strokeStyle = '#7a4a08'; ctx.lineWidth = 1.4; ctx.stroke();
  ctx.restore();
}

/* ---------- prompts over the 3D picture ---------- */
PINBALL.drawTop = function (st) {
  if (!st || !st.balls) return;
  const TB = PINBALL_TABLE, scr = (x, d, h = 0) => K3D.toScreen(x, TB.yAt(d) + h, -d);
  const B = st.balls, t = G.clock || 0;
  // name tags follow the balls
  for (const p of G.players) { const b = B[p.id]; const q = scr(b.x, b.d, (b.mode === 'ride' ? (b.rideH || 0) : b.h) + 2.4); if (q.z < 1) { p.x = q.x; p.y = q.y; } }
  if (st.phase !== 'play') return;
  const tip = (x, d, h, s, col = '#ffe9a8') => { const q = scr(x, d, h); if (q.z < 1) text(s, clamp(q.x, 100, W - 100), clamp(q.y, 70, H - 50) + Math.sin(t * 5) * 2, 14, col, 'center', 'body'); };
  const person = k => !(cpuSolo() && cpuOn(k));
  for (const b of B) {
    if (!person(b.id)) continue;
    if (b.mode === 'seat' && b.seat) {
      const c = TB.byId[b.seat];
      if (c && c.kind === 'cup') tip(c.x, c.d, 2.8, 'Hop to leave the cup');
      if (c && c.kind === 'mouth' && st.phase === 'play') tip(b.x, b.d, 2.8, 'Waiting for ' + NAMES[1 - b.id]);
      if (c && c.kind === 'cradle' && c.twin && !B.every(q => q.mode === 'seat' && TB.byId[q.seat] && TB.byId[q.seat].twin === c.twin)) tip(c.x, c.d, 2.8, 'Waiting for ' + NAMES[1 - b.id]);
    }
    if (b.mode === 'drain') { const q = scr(b.x, b.d, 1.5); if (q.z < 1) text('DRAIN!', q.x, q.y, 22, '#ff8a6a', 'center', 'body'); }
  }
  // the twin flippers: both sit
  for (const tw of TB.twins) {
    const c0 = TB.byId[tw.cradles[0]];
    if (B.some(b => b.d > c0.d - 9 && b.d < c0.d + 2 && b.mode !== 'seat') && B.some(b => b.d > c0.d - 22)) {
      const ring = st.twin[tw.id].ring;
      tip(0, c0.d, 3.2, ring > 0 ? 'Get ready...' : 'Both sit on the flippers to fly up!');
    }
  }
  // a kicker that will not fire yet says why
  for (const k of TB.kickers) {
    if (!k._why || k.great) continue;
    const near = B.find(b => b.mode === 'roll' && Math.hypot(b.x - k.x, b.d - k.d) < k.r + 0.4);
    if (!near) { k._why = null; continue; }
    tip(k.x, k.d, 2.8, k._why === 'gate' ? 'The way down opens with the gate' : 'One of you take the other lane!');
  }
  // the detour lever
  const lev = TB.byId.lever;
  if (lev && st.gate.gDet && !st.gate.gDet.latched && B.some(b => b.d > 236.4 && b.d < 247 && b.x < 0)) {
    const held = PINBALL.onPad(st, TB.byId.btnD, 1.2);
    tip(lev.x, lev.d, 2.6, held ? 'Pull the lever now!' : 'The lever works while the button is held');
    if (!held) tip(TB.byId.btnD.x, TB.byId.btnD.d, 2.6, 'Hold the button!');
  }
  // spinner bridges counting down
  for (const br of TB.bridges) {
    const S2 = st.bridge[br.id];
    if (S2.latched || S2.t <= 0) continue;
    const q = scr(br.lane * 4, (br.d0 + br.d1) / 2, 2.2);
    if (q.z < 1) text(String(Math.ceil(S2.t)), q.x, q.y, 26, '#bff4ff', 'center', 'body');
  }
  // fresh events: SAVED!, star pops
  for (const f of st.fx) {
    const age = st.t - f.t;
    if (f.k === 'saved' && age < 1.6) { const q = scr(f.x, f.d, 2 + age * 1.4); if (q.z < 1) { ctx.save(); ctx.globalAlpha = Math.min(1, (1.6 - age) * 2); text('SAVED!', q.x, q.y, 26, '#ffe066', 'center', 'body'); ctx.restore(); } }
    if (f.k === 'gateUp' && age < 1.2 && f.who >= 0) { const g = TB.byId[f.id]; const q = scr((g.x0 + g.x1) / 2, g.d, 2.6 + age); if (q.z < 1) { ctx.save(); ctx.globalAlpha = Math.min(1, (1.2 - age) * 2); text('Gate open!', q.x, q.y, 17, '#fff4cc', 'center', 'body'); ctx.restore(); } }
  }
};

/* ---------- MODES.arcadepinball ---------- */
MODES.arcadepinball = {
  medals: { bronze: 'Hit the Comet Jackpot', goals: [{ key: 'stars', gold: 0.85, silver: 0.55, more: true, pct: true, word: 'the stars' }, { key: 'drains', gold: 2, silver: 7, word: 'drain' }] },
  medalValues() { const st = G.mst; return { stars: Math.min(1, st.stars / PINBALL.starsMax()), drains: st.drains }; },
  scene3dOpts: { bg: '#07060f', fov: 40, near: 0.2, far: 2400 },
  setup(st) { PINBALL.fresh(st); },
  step(dt) { PINBALL.step(G.mst, dt); },
  hud() { PINBALL.hud(G.mst); },
  scene3d(K) { if (typeof PINBALL_SCENE !== 'undefined') PINBALL_SCENE.build(K, G.mst); },
  draw3d(K, dt) { if (typeof PINBALL_SCENE !== 'undefined') PINBALL_SCENE.update(K, G.mst, dt); },
  drawTop() { PINBALL.drawTop(G.mst); },
  resultTitle() { return 'COMET JACKPOT!'; },
  stats() {
    const st = G.mst, TB = PINBALL_TABLE;
    const out = [
      { label: 'Stars', value: st.stars + ' of ' + TB.stars.length },
      { label: 'Gates opened', value: NAMES[0] + ' ' + st.opened[0] + ' · ' + NAMES[1] + ' ' + st.opened[1] },
      { label: 'Drains', value: String(st.drains) },
      { label: 'Saves', value: String(st.saves) },
    ];
    let worst = -1, wn = 0; st.partDrains.forEach((n, k) => { if (n > wn) { wn = n; worst = k; } });
    out.push(worst >= 0 ? 'Most drains in ' + TB.parts[worst].name + ' (' + wn + ').' : 'Not one drain. The table never got you!');
    if (st.helpN) out.push('Gold help lit the way ' + (st.helpN === 1 ? 'once.' : st.helpN + ' times.'));
    return out;
  },
};

/* ---------- the 2D 'arcadepinball' outfit (previews, world page, ready card): the 3D one is pinball-outfits.js ----------
   Comet Carnival space-fair costumes. Pip: a silver and green retro spaceman suit with a ribbed collar, a round green
   chest light, a clear bubble visor pushed up like a headband with the sprout standing through it, little rocket fins
   on the boots. Bo: a ringmaster's short tailcoat in star-spangled midnight teal with gold piping and comet-tail coat
   tails, a gold star bow tie that lights up, a small tilted top hat between the ears with a planet on a spring.
   (Pip no blue, Bo no orange or red; eyes, sprout and ears clear.) */
defineOutfitPart('apSpaceSuit', { layer: 'body', draw(c) {
  const g = c.g, ink = OF_INK;
  ofRR(g, -11, -11, 22, 11, 3); ofFillStroke(g, '#c9d2cf', ink, 1);
  g.fillStyle = '#9aa7a3'; g.fillRect(-11, -6, 22, 1.3); g.fillRect(-11, -3.4, 22, 1.1);
  // ribbed collar
  g.fillStyle = '#5fbf6a'; ofRR(g, -9, -12.4, 18, 2.6, 1.3); g.fill(); g.strokeStyle = ink; g.lineWidth = 0.8; g.stroke();
  for (let i = -7; i <= 7; i += 2.2) { g.fillStyle = '#3e8f4a'; g.fillRect(i, -12.2, 0.7, 2.2); }
  // the round green chest light
  g.save(); g.shadowColor = '#7dff8a'; g.shadowBlur = 5; ofCircle(g, 0, -6.6, 2.4); ofFillStroke(g, '#8dff9a', ink, 0.8); g.restore();
  ofCircle(g, -0.7, -7.3, 0.7); g.fillStyle = '#ffffff'; g.fill();
  // rocket fins on the boots
  g.fillStyle = '#5fbf6a';
  for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * 9, -2.6); g.lineTo(s * 12.6, 0.4); g.lineTo(s * 8.6, 0.4); g.closePath(); g.fill(); g.strokeStyle = ink; g.lineWidth = 0.8; g.stroke(); }
} });
defineOutfitPart('apBubbleBand', { layer: 'head', lift: 0, draw(c) {
  const g = c.g, ink = OF_INK;
  // a clear bubble visor pushed up on the head like a headband: a glassy arc with a green rim, the sprout through it
  g.save(); g.globalAlpha = 0.55; g.fillStyle = '#d8fff0';
  g.beginPath(); g.ellipse(0, -25.5, 10.5, 4.6, 0, Math.PI, 0); g.closePath(); g.fill(); g.restore();
  g.strokeStyle = '#3e8f4a'; g.lineWidth = 1.8; g.beginPath(); g.ellipse(0, -25.5, 10.5, 4.6, 0, Math.PI, 0); g.stroke();
  g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 1; g.beginPath(); g.ellipse(-3, -27.2, 4, 1.6, -0.2, Math.PI * 1.1, Math.PI * 1.8); g.stroke();
  g.fillStyle = '#c9d2cf'; ofRR(g, -11, -24.6, 22, 2.2, 1.1); g.fill(); g.strokeStyle = ink; g.lineWidth = 0.8; g.stroke();
} });
defineOutfitPart('apTailcoat', { layer: 'back', draw(c) {
  const g = c.g, ink = OF_INK, sw = Math.sin(c.t * 4) * 1.2;
  // comet-tail coat tails behind
  for (const s of [-1, 1]) {
    g.beginPath(); g.moveTo(s * 3, -4); g.quadraticCurveTo(s * 11 + sw, 0, s * 14 + sw, 4); g.lineTo(s * 10 + sw, 2.4); g.quadraticCurveTo(s * 7, 1, s * 1.5, -2); g.closePath();
    ofFillStroke(g, '#14595a', ink, 1);
    g.fillStyle = '#ffe28a'; ofCircle(g, s * 12.6 + sw, 3.4, 1); g.fill();
  }
} });
defineOutfitPart('apRingCoat', { layer: 'body', draw(c) {
  const g = c.g, ink = OF_INK;
  // short tailcoat: teal panels either side, the blue body showing down the middle
  for (const s of [-1, 1]) {
    g.beginPath(); g.moveTo(s * 11, -12); g.lineTo(s * 2.5, -12); g.lineTo(s * 4.5, -1); g.lineTo(s * 11, -1); g.closePath();
    ofFillStroke(g, '#14595a', ink, 1);
    g.strokeStyle = '#e8b93a'; g.lineWidth = 1; g.beginPath(); g.moveTo(s * 2.6, -11.6); g.lineTo(s * 4.5, -1.4); g.stroke();
  }
  // star spangles
  g.fillStyle = '#ffe9a8';
  for (const [x, y] of [[-8, -9], [-6, -4], [7.5, -8], [8.5, -3.5], [-9, -2]]) { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 0.45 : 1.1; g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } g.closePath(); g.fill(); }
  // the gold star bow tie (lit)
  g.save(); g.shadowColor = '#ffd24a'; g.shadowBlur = 5;
  g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 1.3 : 3.0; g.lineTo(Math.cos(a) * r, -10.6 + Math.sin(a) * r); } g.closePath();
  ofFillStroke(g, '#ffd24a', ink, 0.8); g.restore();
} });
defineOutfitPart('apTopHat', { layer: 'head', draw(c) {
  const g = c.g, ink = OF_INK, bob = Math.sin(c.t * 5) * 1.4;
  g.save(); g.translate(1, -25); g.rotate(0.22);
  ofRR(g, -6.5, -1.2, 13, 2.4, 1.2); ofFillStroke(g, '#1c2a35', ink, 1);
  ofRR(g, -4.4, -9, 8.8, 8, 1.2); ofFillStroke(g, '#1c2a35', ink, 1);
  g.fillStyle = '#e8b93a'; g.fillRect(-4.4, -3, 8.8, 1.6);
  // a planet on a spring
  g.strokeStyle = '#c8c0a8'; g.lineWidth = 0.8; g.beginPath();
  for (let i = 0; i <= 8; i++) g.lineTo((i % 2 ? 1.2 : -1.2), -9 - i * 0.9 - (bob * i / 8)); g.stroke();
  const py = -17.5 - bob;
  ofCircle(g, 0, py, 2.4); ofFillStroke(g, '#7ad7a0', ink, 0.8);
  g.strokeStyle = '#ffe9a8'; g.lineWidth = 1; g.beginPath(); g.ellipse(0, py, 4, 1.1, -0.3, 0, Math.PI * 2); g.stroke();
  g.restore();
} });
defineOutfit('arcadepinball', { pip: [['apSpaceSuit', {}], ['apBubbleBand', {}]], bo: [['apTailcoat', {}], ['apRingCoat', {}], ['apTopHat', {}]] });

/* ---------- the level ---------- */
PINBALL.def = {
  name: 'Pinball Panic', world: 42, kind: 'team', mode: 'arcadepinball', outfit: 'arcadepinball', music: 'arcadepinball', amb: 'arcadepinball',
  view3d: true, touch: 'stick', ownStep: true, ownHUD: true, noFalls: true, noTime: true,
  legend: {
    pip: '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> roll <kbd>Space</kbd> hop',
    bo: '<kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd> roll <kbd>Shift</kbd> hop',
  },
  tip: 'Your lane has the switches for your partner\'s lane.',
  howTo: ['Follow the lights from a switch to see what it opens.', 'Sit in a cup to hold a gate for your partner.', 'Both sit on the twin flippers to fly up.'],
  map: Array.from({ length: 18 }, () => '.'.repeat(32)),
};
PINBALL.def.map[16] = '.'.repeat(10) + '1' + '.'.repeat(10) + '2' + '.'.repeat(10);
LEVELS.push(PINBALL.def);

// the 3D-only files: the arcade kit (shared by every World 43 level; loaded once even if listed twice), outfits, scenery
// (a literal push, so tools/bundle.js finds them for the single-file build; the loader takes each file once)
K3D.files.push('js/levels/world43/arcade-kit.js', 'js/levels/world43/pinball-outfits.js', 'js/levels/world43/pinball-scene.js', 'js/levels/world43/pinball-life.js',
  'js/levels/world43/pinball-town.js', 'js/levels/world43/pinball-rails.js', 'js/levels/world43/pinball-top.js');

/* ---------- sounds: a pinball table at giant size (coils, chimes, bells, rubber, glass, wood) ---------- */
(function () {
  const X = Sfx.extra;
  X.arcadepinballRoll = function (_, k) { this.noise(0.13, { type: 'lowpass', f: 160 + k * 280, vol: 0.005 + k * 0.014 }); };
  X.arcadepinballHop = function () { this.tone(220, 0.12, 'triangle', 0.03, 330); this.noise(0.08, { type: 'bandpass', f: 1800, q: 4, vol: 0.012 }); };
  X.arcadepinballLand = function (_, big) { this.tone(big ? 90 : 120, 0.18, 'sine', big ? 0.09 : 0.05, 60); this.noise(0.1, { type: 'lowpass', f: 900, vol: 0.03 }); this.tone(2600, 0.25, 'sine', 0.008, 2550, 0.01); };
  X.arcadepinballBallBump = function (_, k) { const a = 0.45 + 0.55 * (k == null ? 1 : k); this.tone(1900, 0.3, 'sine', 0.025 * a, 1880); this.tone(2850, 0.22, 'sine', 0.012 * a, 2830); this.noise(0.05, { type: 'highpass', f: 3000, vol: 0.02 * a }); };
  // a ball hitting something, by how hard (0 to 1): a steel rail rings (v), rubber and posts thud (v + 2)
  X.arcadepinballClack = function (_, v) {
    const rub = v >= 2, k = Math.max(0, Math.min(1, rub ? v - 2 : v));
    if (rub) { this.tone(150 + k * 70, 0.1, 'sine', 0.02 + k * 0.035, 85); this.noise(0.05, { type: 'lowpass', f: 650, vol: 0.012 + k * 0.025 }); }
    else { this.tone(2300 + k * 700, 0.14, 'triangle', 0.006 + k * 0.016, 2250); this.tone(3600, 0.09, 'sine', 0.003 + k * 0.008, 3550); this.noise(0.03, { type: 'highpass', f: 3500, vol: 0.008 + k * 0.016 }); }
  };
  X.arcadepinballBumper = function (_, k) { const f = [523, 659, 784, 1046][k | 0] || 659; this.tone(f, 0.35, 'triangle', 0.05, f); this.tone(f * 2, 0.2, 'sine', 0.02, f * 2); this.noise(0.06, { type: 'bandpass', f: 400, q: 2, vol: 0.06 }); this.tone(70, 0.1, 'square', 0.03, 40); };
  X.arcadepinballSlingshot = function () { this.noise(0.05, { type: 'bandpass', f: 600, q: 3, vol: 0.07 }); this.tone(90, 0.12, 'square', 0.04, 50); this.tone(1200, 0.08, 'triangle', 0.015, 900); };
  X.arcadepinballFlipperCharge = function () { for (let k = 0; k < 4; k++) this.tone(1400 + k * 200, 0.03, 'square', 0.01, 1400 + k * 200, k * 0.1); this.tone(110, 0.4, 'sawtooth', 0.008, 160); };
  X.arcadepinballFlipperFire = function () { this.noise(0.09, { type: 'lowpass', f: 1200, vol: 0.09 }); this.tone(60, 0.16, 'square', 0.06, 35); this.tone(240, 0.08, 'sawtooth', 0.02, 120); };
  X.arcadepinballStar = function () { this.tone(1568, 0.1, 'triangle', 0.025, 1568); this.tone(2093, 0.16, 'triangle', 0.02, 2093, 0.05); };
  X.arcadepinballRollOver = function () { this.tone(880, 0.12, 'square', 0.02, 880); this.tone(1320, 0.12, 'square', 0.02, 1320, 0.08); this.tone(1760, 0.2, 'square', 0.02, 1760, 0.16); };
  X.arcadepinballGateUp = function (_, shut) { if (shut) { this.tone(300, 0.2, 'square', 0.02, 180); this.noise(0.1, { type: 'lowpass', f: 700, vol: 0.04 }); } else { this.tone(392, 0.12, 'triangle', 0.03, 392); this.tone(523, 0.12, 'triangle', 0.03, 523, 0.1); this.tone(784, 0.3, 'triangle', 0.03, 784, 0.2); this.noise(0.25, { type: 'bandpass', f: 1500, to: 3000, q: 3, vol: 0.02 }); } };
  X.arcadepinballGateDown = function () { this.tone(180, 0.25, 'sawtooth', 0.02, 90); this.noise(0.2, { type: 'lowpass', f: 500, vol: 0.05 }); };
  X.arcadepinballCupIn = function () { this.tone(140, 0.2, 'sine', 0.07, 80); this.noise(0.12, { type: 'lowpass', f: 600, vol: 0.05 }); this.tone(660, 0.15, 'triangle', 0.02, 660, 0.08); };
  X.arcadepinballCupOut = function () { this.tone(260, 0.15, 'triangle', 0.03, 520); this.noise(0.08, { type: 'lowpass', f: 900, vol: 0.03 }); };
  X.arcadepinballTarget = function (_, n) { this.noise(0.04, { type: 'bandpass', f: 2200, q: 4, vol: 0.06 }); this.tone(400 + (n | 0) * 90, 0.12, 'square', 0.02, 400 + (n | 0) * 90); };
  X.arcadepinballStairStep = function (_, n) { this.tone(300 + (n | 0) * 80, 0.1, 'triangle', 0.03, 300 + (n | 0) * 80); };
  X.arcadepinballTargetReset = function () { this.tone(500, 0.1, 'square', 0.015, 300); this.noise(0.05, { type: 'bandpass', f: 1500, q: 4, vol: 0.03 }); };
  X.arcadepinballSpinner = function (_, slow) { for (let k = 0; k < (slow ? 3 : 8); k++) this.tone(1800 - k * 60, 0.025, 'square', 0.008, 1700 - k * 60, k * 0.045); };
  X.arcadepinballBridgeOut = function () { this.tone(330, 0.5, 'sine', 0.03, 990); this.tone(660, 0.5, 'triangle', 0.015, 1320, 0.05); this.noise(0.4, { type: 'highpass', f: 4000, vol: 0.01 }); };
  X.arcadepinballBridgeCount = function (_, n) { this.tone(n <= 2 ? 1320 : 990, 0.08, 'sine', 0.025, n <= 2 ? 1320 : 990); };
  X.arcadepinballBridgeGone = function () { this.tone(990, 0.4, 'sine', 0.025, 220); this.noise(0.3, { type: 'highpass', f: 3000, vol: 0.012 }); };
  X.arcadepinballKicker = function (_, soft) { this.noise(0.06, { type: 'lowpass', f: 900, vol: soft ? 0.03 : 0.08 }); this.tone(80, 0.12, 'square', soft ? 0.02 : 0.05, 45); };
  X.arcadepinballWireRamp = function () { this.noise(1.2, { type: 'bandpass', f: 2600, to: 1800, q: 6, vol: 0.02 }); this.tone(1200, 1.1, 'sine', 0.006, 900); };
  X.arcadepinballLever = function (_, fail) { if (fail) { this.tone(200, 0.2, 'square', 0.02, 150); } else { this.noise(0.08, { type: 'lowpass', f: 700, vol: 0.06 }); this.tone(523, 0.1, 'triangle', 0.03, 523, 0.05); this.tone(784, 0.25, 'triangle', 0.03, 784, 0.14); } };
  X.arcadepinballButton = function () { this.tone(140, 0.08, 'square', 0.03, 100); this.tone(1000, 0.05, 'triangle', 0.015, 1000); };
  X.arcadepinballMagnetGrab = function () { this.tone(60, 0.5, 'sawtooth', 0.03, 90); this.tone(120, 0.5, 'square', 0.012, 180); this.noise(0.3, { type: 'bandpass', f: 300, q: 6, vol: 0.03 }); };
  X.arcadepinballMagnetDrop = function () { this.tone(180, 0.2, 'sawtooth', 0.02, 60); this.noise(0.1, { type: 'lowpass', f: 600, vol: 0.04 }); };
  X.arcadepinballLooseWarning = function () { this.noise(1.2, { type: 'lowpass', f: 120, vol: 0.05 }); this.tone(55, 1.2, 'sine', 0.03, 50); };
  X.arcadepinballLooseHit = function () { this.tone(1500, 0.4, 'sine', 0.03, 1480); this.noise(0.1, { type: 'bandpass', f: 1200, q: 3, vol: 0.06 }); this.tone(90, 0.2, 'sine', 0.06, 50); };
  X.arcadepinballDrain = function (_, drop) { if (drop) { this.tone(800, 0.6, 'sine', 0.025, 120); } else { for (let k = 0; k < 4; k++) this.tone([523, 466, 415, 349][k], 0.18, 'square', 0.02, [523, 466, 415, 349][k], k * 0.16); this.noise(0.4, { type: 'lowpass', f: 300, vol: 0.05, delay: 0.1 }); } };
  X.arcadepinballPlunger = function () { this.noise(0.3, { type: 'bandpass', f: 500, to: 2500, q: 2, vol: 0.05 }); this.tone(70, 0.2, 'square', 0.05, 40); this.tone(440, 0.4, 'triangle', 0.015, 880, 0.1); };
  X.arcadepinballSaved = function () { [784, 988, 1175, 1568].forEach((f, k) => this.tone(f, 0.14, 'square', 0.02, f, k * 0.07)); };
  X.arcadepinballTiltWarning = function () { this.tone(220, 2.0, 'sawtooth', 0.02, 660); this.tone(110, 2.0, 'square', 0.01, 330); };
  X.arcadepinballTilt = function () { this.noise(0.8, { type: 'lowpass', f: 400, vol: 0.12 }); this.tone(55, 0.8, 'square', 0.06, 35); this.tone(880, 0.5, 'square', 0.02, 220); };
  X.arcadepinballTwinReady = function () { this.tone(330, 0.12, 'triangle', 0.03, 330); this.tone(494, 0.18, 'triangle', 0.03, 494, 0.08); };
  X.arcadepinballTwinFire = function () { this.tone(262, 0.6, 'sawtooth', 0.02, 1046); this.noise(0.5, { type: 'bandpass', f: 800, to: 3000, q: 2, vol: 0.04 }); };
  X.arcadepinballScoop = function () { this.tone(110, 0.3, 'sine', 0.08, 70); this.tone(1046, 0.3, 'triangle', 0.02, 1046, 0.1); };
  X.arcadepinballJackpot = function () { [523, 659, 784, 1046, 1318, 1568].forEach((f, k) => this.tone(f, 0.25, 'square', 0.025, f, k * 0.09)); };
  X.arcadepinballMultiball = function () { this.noise(1.5, { type: 'bandpass', f: 1500, to: 4000, q: 1.5, vol: 0.05 }); for (let k = 0; k < 12; k++) this.tone(1200 + (k % 4) * 300, 0.08, 'sine', 0.012, 1200 + (k % 4) * 300, k * 0.08); };
  X.arcadepinballScoreReel = function () { for (let k = 0; k < 6; k++) this.tone(900, 0.02, 'square', 0.01, 700, k * 0.05); };
  X.arcadepinballHelp = function () { this.tone(659, 0.2, 'triangle', 0.025, 659); this.tone(988, 0.3, 'triangle', 0.025, 988, 0.12); };
  X.arcadepinballFinish = function () { [392, 523, 659, 784, 1046].forEach((f, k) => this.tone(f, 0.4, 'square', 0.02, f, k * 0.12)); this.noise(1.6, { type: 'highpass', f: 5000, vol: 0.02, delay: 0.5 }); };
})();
