/* Pip & Bo - Computer partner brain for 17-3 Waterfall Climb. */
'use strict';

/* How the computer plays Waterfall Climb
   It reads the level's route (def.route, built into G.mst.route): one step per ledge saying how to move on from it, and
   the mode's tracking of which step each player is on (G.mst.pl[id].step). It works in climb coordinates (p.y + camY).
   - jump steps: walk to the take-off spot, wait for the stream to be dry with time to spare (stream steps), jump holding
     jump, and in the air steer to the landing spot (but never in under the ledge it is jumping up to).
   - log: wait at the pool's edge for the log, step on, ride in the middle, step off at the far side.
   - geyser: stand on the vent and wait for the puff; at the top steer onto the ledge. frog: hop onto the frog from the
     side away from the ledge, then steer onto the ledge. nest: walk to its own side of the nest.
   - boost walls (the teamwork): with the partner at the foot of the wall it works out its job from the role:
     the partner stands on its head -> it braces (after walking to the wall, carrying them); the partner braces by the
     wall -> it hops onto their hands and jumps, steering onto the ledge; otherwise with a person it braces by the wall
     and asks them to hop on ("Hop on my hands!"), and if both keep bracing for a while it gives way and rides. Two
     computers split the job by the wall's number (Pip braces at walls 1, 3, 5, 7), so they never wait for each other.
     On top it drops the vine at the post and holds the action to heave while the partner climbs; at the foot with the
     partner up it grabs the vine once it is down and climbs. A partner who is not at the wall yet is waited for.
   It never reads anything a person couldn't see: positions, the stream's water, the log, the geyser's bubbles. */
const WFALL_BOT = { look: 0.06, mountGap: 46, yield: 1.5 };

function wfallBotCtx(st, p) {
  const cam = st.camY;
  return { cx: p.x + p.w / 2, feet: p.y + cam + p.h, top: p.y + cam, vx: p.vx, vy: p.vy, grounded: p.grounded, alive: p.alive };
}
// the route step (and its ledge) whose ledge holds the point (x, feet)
function wfallBotLedgeAt(st, x, feet) {
  for (const s of st.route) if (Math.abs(s.feet - feet) < 3 && x > s.x0 - 4 && x < s.x1 + 4) return s;
  return null;
}
// steer in the air toward x, but don't move in under a ledge we are still below (a head bonk); brake to stop on x
function wfallBotAir(out, st, p, me, tx, tFeet) {
  out.left = out.right = false;
  const dx = tx - me.cx, dir = Math.sign(dx);
  if (Math.abs(dx) < 4) { if (Math.abs(me.vx) > 40) { out.left = me.vx > 0; out.right = me.vx < 0; } return; }
  const led = wfallBotLedgeAt(st, tx, tFeet);
  if (led && me.top > tFeet + T - 3) {
    const nx = p.x + me.vx * WFALL_BOT.look + dir * 3;
    if (nx < led.x1 - 8 && nx + p.w > led.x0 + 8) { if (Math.abs(me.vx) > 30) { out.left = me.vx > 0; out.right = me.vx < 0; } return; }
  }
  if (me.feet <= tFeet + 1 && Math.sign(me.vx) === dir && (me.vx * me.vx) / (2 * PHYS.accA) >= Math.abs(dx) - 2) { out.left = me.vx > 0; out.right = me.vx < 0; return; }
  out.left = dir < 0; out.right = dir > 0;
}
function wfallBotSeek(out, p, x, dead = 3) { return cpuSeek(out, p, x, dead); }

cpuBrain('waterfall', {
  reset(S) { S.run = false; S.air = null; S.roleT = 0; S.waitT = 0; S.mount = 0; S.stuck = 0; S.lastBest = -1; S.yieldT = 0; },
  think(S, p, o, dt, info) {
    dt = dt || 1 / 120;
    const st = info.mst, out = {};
    S.hopT = (S.hopT || 0) + dt;
    if (!st || !st.grid || st.phase !== 'play' || info.intro) return out;
    const P = st.pl[p.id], O = st.pl[o.id];
    if (!p.alive || P.splash) { S.air = null; return out; }
    const me = wfallBotCtx(st, p), them = wfallBotCtx(st, o), human = !info.partnerCpu;
    // on the vine: climb
    if (P.vine >= 0) { out.up = true; S.air = null; return out; }
    // in the air: finish the move we started
    if (!p.grounded) {
      // bouncing on a frog with no plan (we fell onto it from a geyser or a slip): steer for the frog's ledge, or the
      // frog would bounce us up and down for ever
      const sf = st.route[P.step];
      if (!S.air && sf && sf.go === 'frog') S.air = { kind: 'frog', phase: 1, fx: st.frogs[sf.frog].x, frogTop: st.frogs[sf.frog].top, to: { x: sf.to[0] * T, feet: st.feetOf(sf.to[1]) } };
      if (S.air) {
        const a = S.air;
        if (a.kind === 'frog' && a.phase === 0) {
          if (p.vy < -500 && me.feet < a.frogTop) a.phase = 1;
          else { wfallBotAir(out, st, p, me, a.fx, a.frogTop); return out; }   // a short hop (jump let go) onto the frog
        }
        if (a.kind === 'geyser') { if (me.feet < a.to.feet - 8 || p.vy > 60) wfallBotAir(out, st, p, me, a.to.x, a.to.feet); return out; }
        wfallBotAir(out, st, p, me, a.to.x, a.to.feet);
        out.jump = p.vy < 0;
        if (a.kind === 'boost' && me.feet > a.to.feet + 1) { out.left = a.side < 0; out.right = a.side > 0; }
      }
      return out;
    }
    S.air = null;
    if (P.onHead) return wfallBotRider(S, st, p, o, me, them, out, human);
    const s = st.route[P.step];
    if (!s) return out;
    // just climbed a wall the partner is still below: the vine
    const prev = st.route.slice(0, P.step).reverse().find(r => r.go === 'wall');
    // (also when the partner wandered off below the wall's foot or is floating back after a splash: drop the vine
    // anyway and wait by the post, so the way up is open whenever they come back)
    if (prev && P.step === prev.i + 1) {
      const w = st.walls[prev.wall];
      if (!w.done && (O.splash || !o.alive || O.step <= prev.i) && !O.onHead) return wfallBotTop(S, st, p, o, me, w, out, human, O.step === prev.i && !O.splash);
    }
    if (s.go === 'wall') return wfallBotWall(S, st, p, o, me, them, s, st.walls[s.wall], out, human, info);
    // the partner stands on our head away from a wall: we can't jump with them up there, so stand still and ask
    if (O.onHead) { if (human && cpuFor(S, 'hopoff', true, dt) > 0.8) cpuSay(p, 'Hop off my head, please!'); return out; }
    cpuFor(S, 'hopoff', false, 0);
    return wfallBotMove(S, st, p, o, me, s, out, human, dt, them);
  },
  bubblePos(p) { return { x: p.x + p.w / 2, y: p.y }; },
});

/* ---------- moving on along the route ---------- */
function wfallBotMove(S, st, p, o, me, s, out, human, dt, them) {
  const T2 = T, O = st.pl[o.id];
  if (s.go === 'jump') {
    // a run-up: back off a little, then run and jump as we cross the take-off spot
    const fx = s.from * T2, tx = s.to[0] * T2, dir = Math.sign(tx - fx) || 1;
    const back = clamp(fx - dir * 46, s.x0 + 20, s.x1 - 20);
    let ok = true;
    // the partner is on the take-off spot (or just jumped from it): let them go first, so we never land on their head
    // on a small stepping stone (two computers: Pip goes first)
    // (a person who just stands there for a while: go anyway, hopping off their head if we land on it)
    const first = o.alive && !O.splash && O.step === s.i && !O.onHead && O.vine < 0 && (human || p.id === 1) &&
      (!o.grounded || (Math.abs(them.cx - fx) < 30 && Math.abs(them.feet - me.feet) < 3));
    if (first && cpuFor(S, 'first', true, dt) < 4) ok = false;
    if (!first) cpuFor(S, 'first', false, 0);
    if (s.stream != null) {
      const sm = st.streams[s.stream];
      // jump only into a dry stream with time to spare (a jump at the end of the dry spell is a soaking)
      const dry = !sm.on && sm.dryLeft > 1.0;
      ok = ok && dry;
      if (!dry && human && Math.abs(o.x - p.x) < 200) cpuSay(p, 'Wait for the log...');
    }
    // a short hop straight up beside an overhanging ledge: no run-up (it would carry us in under it)
    if (s.hop || Math.abs(tx - fx) < 60) {
      S.run = false;
      if (!wfallBotSeek(out, p, fx, 2) || Math.abs(me.vx) > 20 || !ok) return out;
      out.jump = 'tap'; S.air = { kind: 'jump', to: { x: tx, feet: st.feetOf(s.to[1]) } };
      return out;
    }
    if (S.run && ok) {
      out.left = dir < 0; out.right = dir > 0;
      if ((me.cx - fx) * dir >= -2) { out.jump = 'tap'; S.run = false; S.air = { kind: 'jump', to: { x: tx, feet: st.feetOf(s.to[1]) } }; }
      return out;
    }
    S.run = false;
    if ((me.cx - back) * dir > 3) { wfallBotSeek(out, p, back, 3); return out; }
    if (!ok) { wfallBotSeek(out, p, back, 3); return out; }
    S.run = true; out.left = dir < 0; out.right = dir > 0;
    return out;
  }
  if (s.go === 'log') {
    const ln = st.lanes[s.lane], P = st.pl[p.id];
    if (P.onLog === ln.i) {
      const far = ln.x + ln.w >= ln.x1 - 2;
      if (far) wfallBotSeek(out, p, s.to[0] * T2, 6);
      else wfallBotSeek(out, p, ln.x + ln.w / 2, 6);
      return out;
    }
    // on the near bank: wait at the edge, step on when the log is here (and staying a moment)
    const edge = ln.x0 - 14;
    const here = ln.x <= ln.x0 + 2 && (ln.pause > 0.25 || ln.dir > 0);
    if (here) { wfallBotSeek(out, p, ln.x + ln.w / 2, 6); return out; }
    if (me.cx > ln.x0 - 4) { out.left = true; return out; }   // (never walk off into the pool)
    wfallBotSeek(out, p, edge, 4);
    return out;
  }
  if (s.go === 'geyser') {
    const gy = st.geysers[s.gey], gx = (gy.x0 + gy.x1) / 2;
    wfallBotSeek(out, p, gx, 4);
    S.air = { kind: 'geyser', to: { x: s.to[0] * T2, feet: st.feetOf(s.to[1]) } };
    if (gy.phase !== 'puff' && human && Math.abs(me.cx - gx) < 10) cpuSay(p, 'Wait for the puff!');
    return out;
  }
  if (s.go === 'frog') {
    const f = st.frogs[s.frog], tx = s.to[0] * T2, dir = Math.sign(tx - f.x) || 1, sx = f.x - dir * 36;
    if (!wfallBotSeek(out, p, sx, 4)) return out;
    out.jump = 'tap';
    S.air = { kind: 'frog', phase: 0, fx: f.x, frogTop: f.top, to: { x: tx, feet: st.feetOf(s.to[1]) } };
    return out;
  }
  if (s.go === 'nest') {
    const n = st.nest;
    wfallBotSeek(out, p, n.x + (p.id === 0 ? -26 : 26), 4);
    return out;
  }
  return out;
}

/* ---------- on top of a wall, the partner still below ---------- */
function wfallBotTop(S, st, p, o, me, w, out, human, atFoot) {
  const O = st.pl[o.id];
  if (!wfallBotSeek(out, p, w.postX + w.side * 4, 4)) return out;
  if (!w.down) { out.act = 'tap'; if (human) cpuSay(p, 'Vine coming!'); return out; }
  // heave while they climb
  if (O.vine === w.i) { out.act = true; if (human) cpuSay(p, 'Climb up! I’ll heave!'); }
  else if (human && atFoot) cpuSay(p, 'Grab the vine and climb!');
  else if (human && cpuFor(S, 'waitTop', true, 1 / 120) > 4) cpuSay(p, 'I’ll wait up here!');
  return out;
}

/* ---------- at the foot of a boost wall ---------- */
function wfallBotWall(S, st, p, o, me, them, s, w, out, human, info) {
  const P = st.pl[p.id], O = st.pl[o.id], side = w.side;
  const oUp = o.alive && !O.splash && O.step > P.step && O.vine < 0;
  // the partner is up there: wait for the vine, then grab it and climb
  if (oUp) {
    if (w.down && w.roll > 0.95) {
      if (wfallBotSeek(out, p, w.vineX, 3)) out.up = true;
      return out;
    }
    wfallBotSeek(out, p, w.vineX - side * 40, 6);
    if (human && cpuFor(S, 'askvine', true, 1 / 120) > 1.5) cpuSay(p, 'Drop the vine at the post!');
    return out;
  }
  cpuFor(S, 'askvine', false, 0);
  if (O.vine >= 0) { wfallBotSeek(out, p, w.vineX - side * 50, 6); return out; }
  const atBase = o.alive && !O.splash && (O.step === P.step || O.onHead) && Math.abs(them.feet - w.baseFeet) < 4;
  // the partner is on our head: carry them to the wall and brace
  if (O.onHead) {
    if (Math.abs(me.cx - w.boostX) > 4 && !P.brace) { wfallBotSeek(out, p, w.boostX, 3); return out; }
    out.down = true;
    if (human && cpuFor(S, 'onhead', true, 1 / 120) > 1.2) cpuSay(p, 'Now jump!');
    return out;
  }
  cpuFor(S, 'onhead', false, 0);
  // who braces
  const oBracedNear = O.brace && Math.abs(them.cx - w.boostX) < 60;
  const both = oBracedNear && P.brace;
  S.yieldT = both ? S.yieldT + 1 / 120 : 0;
  let booster;
  if (!atBase) booster = human ? p.id : (w.i % 2 === 0 ? 0 : 1);
  // they brace and we don't: ride
  else if (oBracedNear && !P.brace) booster = o.id;
  // both bracing at once: we give way after a moment and ride (two computers: Bo gives way). Deciding only on what
  // the partner does this very moment would have us both let go and both jump at once, over and over.
  else if (both) booster = S.yieldT > (human ? WFALL_BOT.yield : 0.5) && (human || p.id === 1) ? o.id : p.id;
  else if (!human) booster = w.i % 2 === 0 ? 0 : 1;
  else booster = p.id;
  if (booster === p.id) {
    if (!wfallBotSeek(out, p, w.boostX, 3) && !P.brace) return out;
    // brace when the partner is close (a person: as soon as they are at the foot of the wall)
    if (atBase || (them.feet > w.baseFeet - 8 * T && Math.abs(them.feet - w.baseFeet) < 3 * T && Math.abs(them.cx - w.boostX) < 10 * T)) {
      out.down = true;
      if (human) cpuSay(p, cpuFor(S, 'brace', true, 1 / 120) > 5 ? 'Jump on my hands, then jump again!' : 'Hop on my hands!');
    } else if (human && cpuFor(S, 'callT', true, 1 / 120) > 3) cpuSay(p, 'Come on up!');
    return out;
  }
  // the rider: wait for the booster to brace by the wall, then hop on
  if (!O.brace || Math.abs(them.cx - w.boostX) > 60) {
    wfallBotSeek(out, p, w.boostX - side * (WFALL_BOT.mountGap + 20), 6);
    return out;
  }
  const mx = them.cx - side * WFALL_BOT.mountGap;
  if (Math.abs(me.cx - them.cx) < 10) { out.jump = 'tap'; S.air = { kind: 'mount', to: { x: them.cx, feet: them.top } }; return out; }
  if (!wfallBotSeek(out, p, mx, 5)) return out;
  out.jump = 'tap';
  S.air = { kind: 'mount', to: { x: them.cx, feet: them.top } };
  if (human) cpuSay(p, 'Here I come!');
  return out;
}
// standing on the partner's head
function wfallBotRider(S, st, p, o, me, them, out, human) {
  const P = st.pl[p.id], O = st.pl[o.id], s = st.route[O.step];
  const w = s && s.go === 'wall' ? st.walls[s.wall] : null;
  if (!w) { wfallBotHopOff(S, p, me, them, s && s.to ? -Math.sign(s.to[0] * T - them.cx) : 0, out); return out; }   // (not at a wall: hop off, away from where they jump)
  // stay over their middle while they walk us to the wall; jump when they brace there
  if (!O.brace || Math.abs(them.cx - w.boostX) > 8) {
    wfallBotSeek(out, p, them.cx, 3);
    S.mount += 1 / 120;
    if (S.mount > 3 && human) cpuSay(p, 'Brace by the wall, please!');
    if (S.mount > 7) { wfallBotHopOff(S, p, me, them, -w.side, out); if (S.mount > 9) S.mount = 0; }   // (hop down, away from the wall: something is off)
    return out;
  }
  S.mount = 0;
  if (Math.abs(me.cx - them.cx) > 6) { wfallBotSeek(out, p, them.cx, 3); return out; }
  out.jump = 'tap';
  out.left = w.side < 0; out.right = w.side > 0;
  S.air = { kind: 'boost', side: w.side, to: { x: w.postX + w.side * 34, feet: w.topFeet } };
  return out;
}
// step off the partner's head sideways: the way asked (pref), else away from their middle; if a ledge above blocks
// that way (a low ceiling over a stepping stone), turn round after a moment
function wfallBotHopOff(S, p, me, them, pref, out) {
  if (!S.hopDir || S.hopT > 1.5) S.hopDir = pref || Math.sign(me.cx - them.cx) || 1;
  if (S.hopX == null || Math.abs(me.cx - S.hopX) > 1.5) { S.hopX = me.cx; S.hopStill = 0; } else S.hopStill = (S.hopStill || 0) + 1 / 120;
  if (S.hopStill > 0.3) { S.hopDir = -S.hopDir; S.hopStill = 0; }
  S.hopT = 0;
  out.left = S.hopDir < 0; out.right = S.hopDir > 0;
}
