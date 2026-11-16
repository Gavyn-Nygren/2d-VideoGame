/* Pip & Bo - Level 40-1 The Iron Colossus: Part 3 'fists' (The Fists). */
'use strict';

/* ===== 40-1 Part 3: The Fists (IRON_PHASES.fists) ====================================================================
   It has noticed you. Make it punch itself. A wide stage on the Colossus's chest (two screens, the camera slides
   sideways): the chest ledge, split in two by the breastbone pillar, and the sternum plate above it. Its head leans in
   at the top with the LANTERN EYE; Superhero City at dusk goes by far below, mirrored in its glass towers.
   THE EYE (the spotlight): a cone of bare paper that hunts a hero in the live lock's zone. A taunt LOCKS it on: it
   follows the last hero to taunt until they leave the zone (a partner walking about never steals it); with no taunt
   it drifts after whoever moved last but never narrows. Held on the taunter `hold` s (a rust ring closes round the
   pool), it NARROWS: a fist rises (`rise` s, a "skree..." and its shadow) and slams where that hero stood when it
   narrowed (anywhere within `snapR` of the lock snaps to the lock): KLANG. Under it (within `hitR`) is a Clang.
   A yellow arrow over the lock ("PIP: TAUNT HERE!") and over the elbow ("BO: HOLD HERE TO PULL!") name the jobs.
   THE THREE CHEST LOCKS. A slam within `crackR` of a lock cracks it (three cracks break it). After a slam the fist is
   STUCK for `stuck` s: its forearm is a ramp up to the elbow, and a hero holding the action on the elbow for `pullT` s
   pulls the elbow pin a third of the way out. The eye stays on its target the whole time it is stuck, and anyone it
   sees on the arm is shrugged off: so one is the DECOY (taunt on the lock, step off once it narrows, stay in sight
   and off the arm) and one is the PULLER (wait beside the lock on the arm's side, run up the arm the moment it lands).
   Nobody can do both. No pull in time: the fist pulls back and SWEEPS the zone at floor height (jump it).
   A lock is done when it has three cracks and three pulls: its arm drops LIMP across the gap, the bridge to the next
   one, and the jobs swap. Lock 1 (left ledge): the right fist. Lock 2 (right ledge): the left fist. Lock 3 (on the
   sternum plate): both fists, taking turns. Then the chest hatch falls open: both jump in.
   From lock 2 Tick drops WIND-UP MICE (they trip you; land on one to wind it down). At lock 3 the chimney coughs SOOT
   clouds over the plate for 3 s (they only hide things; the eye's light still cuts through).
   GOLD HELP after IRON.goldAfter misses (Clangs, sweeps): the fist stays stuck `goldStuck` s, and a gold ring shows
   where a slam will land.   Rivets: 8.   Stats (st.stats.fists): slams, pulls, mice.
   Names: ironFist* / IRONFIST*, sounds ironfist*. */
const IRONFIST = {
  W: 1920, camY: -470, plateY: -190, plate: [740, 1180], pillar: [940, 980],
  eye: { x: 960, y: -428, v: 560, vStuck: 320, hold: 0.8, near: 40, see: 36 },
  rise: 1.3, goldRise: 1.8, hitR: 56, crackR: 40, snapR: 74, stuck: 4.2, goldStuck: 7, goldHold: 3, pullT: 1.5, tellT: 0.8, sweepV: 820, cool: 1.0, taunt: 3.0,
  fist: { hw: 50, h: 90 }, elbowW: 80, elbowUp: 150,
  // the locks: x, the surface they sit on, the zone, the elbow side of each slam in turn, forearm length, slam range
  locks: [
    { x: 380, y: 0, zone: 0, sides: [1], len: 216, range: [80, 600], safe: 150 },
    { x: 1540, y: 0, zone: 1, sides: [-1], len: 216, range: [1320, 1860], safe: 1790 },
    { x: 960, y: -190, zone: 2, sides: [-1, 1], len: 120, range: [900, 1020], safe: 0 },
  ],
  mice: { every: 6, max: 2, v: 82, w: 22, h: 13 },
  soot: { every: 7, life: 3 },
  rivets: [[200, -14], [520, -118], [690, -168], [700, -186], [1400, -118], [1620, -14], [866, -309], [1150, -353]],
};
const ironFistLock = (ph) => ph.locks[Math.min(ph.li, 2)];
const ironFistStuckT = st => (ironHasGold(st, 'fists') ? IRONFIST.goldStuck : IRONFIST.stuck);
const ironFistRiseT = st => (ironHasGold(st, 'fists') ? IRONFIST.goldRise : IRONFIST.rise);
// which zone a hero is in: 0 the left ledge, 1 the right ledge, 2 the sternum plate (and its elbows)
function ironFistZone(p) {
  const cx = p.x + p.w / 2, feet = p.y + p.h;
  if (feet < -120 && cx > 700 && cx < 1220) return 2;
  return cx < 960 ? 0 : 1;
}

function ironFistSetup(st, L) {
  const ph = st.ph, K = IRONFIST;
  ph.first = L.def.first || 0;
  ph.t = 0; ph.li = 0; ph.hatch = null;
  ph.locks = K.locks.map((q, i) => Object.assign({ i, cracks: 0, pins: 0, cycle: 0, done: false, limp: false, broke: false }, q));
  ph.eye = { st: 'wake', t: 0, x: K.locks[0].x, tgt: -1, holdT: 0, sx: 0, sy: 0, side: 1, fx: 0, fy: 0, lift: 0, pulled: false, pull: [0, 0], said: 0 };
  ph.taunt = [0, 0]; ph.moved = [-1, -1]; ph.tauntCd = [0, 0]; ph.lockOn = -1; ph.onLockT = 0;
  ph.mice = []; ph.miceT = 3; ph.soot = []; ph.sootT = 4;
  ph.arm = null; ph.limp = [];
  st.cam = { x: 0, y: K.camY };
  G.players.forEach((p, k) => Object.assign(p, { x: 120 + k * 50 - p.w / 2 - st.cam.x, y: -p.h - st.cam.y, vx: 0, vy: 0, face: 1, grounded: true, alive: true }));
  ironRivetsSetup(st, K.rivets);
  const s = ironStats(st); Object.assign(s, { slams: s.slams || 0, pulls: s.pulls || 0, mice: s.mice || 0 });
  Object.assign(st.tick, { hidden: false, x: 1268, y: -334, face: -1, pose: 'idle', s: 1, mood: 'cross' });
  ironFistBuild(ph);
  ph.prep = [];
  for (let l = 0; l < 3; l++) ph.prep.push(() => IRON_ART.city(l));
  for (let k = 0; k < 4; k++) ph.prep.push(() => IRON_ART.chestWall(k));
  ph.prep.push(() => IRON_ART.colossusHead(), () => IRON_ART.fist(1), () => IRON_ART.fist(-1), () => IRON_ART.forearm(), () => IRON_ART.elbow(),
    () => IRON_ART.padlock(0), () => IRON_ART.padlock(1), () => IRON_ART.padlock(2), () => IRON_ART.chestLedge(0), () => IRON_ART.chestLedge(1),
    () => IRON_ART.sternum(), () => IRON_ART.windMouse(0), () => IRON_ART.windMouse(1), () => IRON_ART.chestHatch());
}
// the stage's solids (world coords): the ledge, the walls, the pillar, the plate; then the live arm and the limp ones
function ironFistBuild(ph) {
  const K = IRONFIST, S = [];
  S.push({ x0: -60, y0: 0, x1: K.W + 60, y1: 80, kind: 'floor' });
  S.push({ x0: -60, y0: -900, x1: 0, y1: 80, kind: 'wall' }, { x0: K.W, y0: -900, x1: K.W + 60, y1: 80, kind: 'wall' });
  S.push({ x0: K.pillar[0], y0: K.plateY, x1: K.pillar[1], y1: 0, kind: 'pillar' });
  S.push({ x0: K.plate[0], y0: K.plateY, x1: K.plate[1], y1: K.plateY + 20, kind: 'plate' });
  ph.base = S;
  ph.solids = S.slice();
}
function ironFistSolids(ph) {
  ph.solids = ph.base.concat(...ph.limp, ph.arm ? ph.arm.solids : []);
}
// the arm of a fist that slammed at (sx, sy), its elbow on `side`: the fist, the forearm ramp, the elbow ledge
function ironFistArm(sx, sy, side, len, limpTo) {
  const K = IRONFIST, hw = K.fist.hw, fy = sy - K.fist.h, ey = sy - K.elbowUp;
  const fist = { x0: sx - hw, y0: fy, x1: sx + hw, y1: sy, kind: 'fist' };
  const a = sx + side * hw, b = sx + side * (hw + len);
  const ramp = side > 0 ? { slope: true, x0: a, x1: b, ya: fy, yb: ey, one: true, kind: 'arm', catch: true } : { slope: true, x0: b, x1: a, ya: ey, yb: fy, one: true, kind: 'arm', catch: true };
  if (limpTo) {
    // limp: the forearm lies from the fist across to the plate's edge
    const r = side > 0 ? { slope: true, x0: a, x1: limpTo[0], ya: fy, yb: limpTo[1], one: true, kind: 'limp', catch: true } : { slope: true, x0: limpTo[0], x1: a, ya: limpTo[1], yb: fy, one: true, kind: 'limp', catch: true };
    return [fist, r];
  }
  const e0 = Math.min(b, b + side * K.elbowW), e1 = Math.max(b, b + side * K.elbowW);
  const elbow = { x0: e0, y0: ey, x1: e1, y1: ey + 14, one: true, kind: 'elbow' };
  // the upper arm rising from the elbow: a stop, so nobody runs off its far end
  const ux = side > 0 ? e1 : e0 - 26, upper = { x0: ux, y0: ey - 120, x1: ux + 26, y1: ey + 14, kind: 'upper' };
  return { solids: [fist, ramp, elbow, upper], fist, ramp, elbow, sx, sy, side, ex: b + side * K.elbowW / 2, ey };
}

function ironFistStep(st, dt) {
  const ph = st.ph, K = IRONFIST, ps = G.players;
  ph.t += dt;
  if (st.idle) { ironCoast(st, dt, ph.solids); ironFistCamera(st, dt); return; }
  for (const p of ps) {
    const i = p.input;
    if (i.left || i.right || i.jump || i.up) ph.moved[p.id] = ph.t;
    ph.taunt[p.id] = Math.max(0, ph.taunt[p.id] - dt); ph.tauntCd[p.id] = Math.max(0, ph.tauntCd[p.id] - dt);
  }
  ironFistTaunts(st);
  ironFistEye(st, dt);
  for (const p of ps) ironBody(p, dt, ph.solids, { partner: true });
  ironTrack(st);
  ironFistMice(st, dt);
  ironFistSoot(st, dt);
  // the hatch: both in it
  if (ph.hatch) {
    ph.hatch.t += dt;
    const inn = ps.every(p => p.alive && p.grounded && Math.abs(p.x + p.w / 2 - 960) < 64 && Math.abs(p.y + p.h - K.plateY) < 4);
    ph.hatch.inT = inn ? ph.hatch.inT + dt : 0;
    if (ph.hatch.inT > 0.5 && !st.cut) ironPhaseDone(st, { say: 'NOT IN THERE! I JUST TIDIED IN THERE!' });
  }
  ironFistCamera(st, dt);
  ironRivetsStep(st, dt);
  ironFistHints(st);
  // Tick's pose on his collar
  const c = st.tick;
  if (c.shoutT <= 0 && c.pose !== 'stamp') c.pose = ph.eye.st === 'rise' || ph.eye.st === 'stuck' ? 'point' : 'idle';
  if (c.pose === 'stamp' && (c.stampT = (c.stampT || 0) - dt) <= 0) c.pose = 'idle';
  if (c.shoutT > 0) c.pose = 'shout';
}
function ironFistGold(st) { ironGoldOnce(st, 'fists', 'Gold help! The fist rises slower, stays stuck longer and stops sweeping, and a gold ring shows where it will land.'); }
function ironFistMiss(st) { if (ironMiss(st, 'fists') >= IRON.goldAfter) ironFistGold(st); }
// the taunt: a tap of the action anywhere but on an elbow (a raspberry and a wave)
function ironFistTaunts(st) {
  const ph = st.ph;
  for (const p of G.players) {
    if (!p.alive || !p.pendingAct && !(p.input.act && !p.actWas)) { p.actWas = p.input.act; continue; }
    p.actWas = p.input.act;
    p.pendingAct = false;
    if (ph.tauntCd[p.id] > 0 || p.grounded && p.ground && p.ground.kind === 'elbow') continue;
    ph.taunt[p.id] = IRONFIST.taunt; ph.tauntCd[p.id] = 0.5; ph.tauntAt = p.id;
    ph.lockOn = p.id;   // the eye stays on whoever taunted last, however their partner moves
    p.tauntT = 0.5;
    Sfx.play('ironfistTaunt', p.id);
    ironPop(st, p.x + p.w / 2, p.y - 10, p.id === 0 ? 'PBBT!' : 'NYAH!', { size: 13 });
  }
}
/* --- the eye and the fists --- */
function ironFistEye(st, dt) {
  const ph = st.ph, K = IRONFIST, E = ph.eye, lk = ironFistLock(ph), ps = G.players;
  E.t += dt;
  if (E.st === 'wake') {
    if (E.t > 1.2) { E.st = 'hunt'; E.t = 0; ironSay(st, IRON_PARTS.fists.line, 3.4); ironNews(st, 'Make it punch its own locks! Taunt on the lock, the spotlight follows you, then jump clear.', false, 7); }
    return;
  }
  if (E.st === 'done') { E.x += (960 - E.x) * Math.min(1, dt * 2); return; }
  const inZone = ps.filter(p => p.alive && ironFistZone(p) === lk.zone);
  if (E.st === 'hunt') {
    // who: the taunter, else whoever moved last (an idle hero is never picked)
    // (a taunt LOCKS it on: it stays on the last one to taunt until they leave the zone or the lock breaks, so a
    // partner walking about never steals it)
    if (ph.lockOn >= 0 && !inZone.some(p => p.id === ph.lockOn)) ph.lockOn = -1;
    let tgt = ph.lockOn;
    if (tgt < 0) { const mv = inZone.filter(p => ph.moved[p.id] >= 0); if (mv.length) tgt = mv.reduce((a, b) => (ph.moved[b.id] > ph.moved[a.id] ? b : a)).id; }
    if (tgt !== E.tgt) { E.tgt = tgt; E.holdT = 0; }
    const want = tgt >= 0 ? ps[tgt].x + ps[tgt].w / 2 : lk.x;
    E.x += clamp(want - E.x, -K.eye.v * dt, K.eye.v * dt);
    // it only narrows on someone who taunted it: the fist never comes for a hero who is just walking about
    if (tgt >= 0 && tgt === ph.lockOn && Math.abs(want - E.x) < K.eye.near && E.t > K.cool) E.holdT += dt; else E.holdT = Math.max(0, E.holdT - dt * 2);
    if (E.holdT >= K.eye.hold) {
      const p = ps[tgt], cx = p.x + p.w / 2;
      // anywhere on the lock counts: the slam snaps to its middle
      E.st = 'rise'; E.t = 0; E.sx = Math.abs(cx - lk.x) < K.snapR ? lk.x : clamp(cx, lk.range[0], lk.range[1]); E.sy = lk.y;
      E.side = lk.sides[lk.cycle % lk.sides.length];
      Sfx.play('ironfistEyeNarrow'); Sfx.play('ironfistFistRise');
      ironWord(st, 'skree...', E.sx + E.side * 60, E.sy - 230, 16, { life: ironFistRiseT(st), grow: 0.6, fill: SKETCH.PAL.ochre, key: 'skree' });
    }
    return;
  }
  if (E.st === 'rise') {
    E.x += clamp(E.sx - E.x, -K.eye.v * dt, K.eye.v * dt);
    if (E.t >= ironFistRiseT(st)) ironFistSlam(st);
    return;
  }
  if (E.st === 'stuck') {
    // the eye stays on the one it went for: anyone it sees on the arm is shrugged off
    const tp = ps[E.tgt];
    if (tp && tp.alive) E.x += clamp(tp.x + tp.w / 2 - E.x, -K.eye.vStuck * dt, K.eye.vStuck * dt);
    const A = ph.arm;
    for (const p of ps) {
      if (!p.alive || !p.grounded || !p.ground || !A.solids.includes(p.ground)) continue;
      if (Math.abs(p.x + p.w / 2 - E.x) < K.eye.see) {
        p.vy = -300; p.vx = -A.side * 200; p.grounded = false; p.ground = null; p.stun = Math.max(p.stun, 0.35); p.offT = 0.1;
        Sfx.play('ironfistShrug');
        ironPop(st, p.x + p.w / 2, p.y - 12, 'SHRUG!', { size: 13 });
        if (ph.t - E.said > 4) { E.said = ph.t; ironSay(st, 'I SEE YOU ON MY ARM!', 2.2); }
        continue;
      }
      if (p.ground === A.elbow && p.input.act) {
        // the pin stays as far out as it got (a pull cut short is not lost)
        lk.prog = (lk.prog || 0) + dt; E.pull = [lk.prog, 0];
        if (lk.prog >= K.pullT && !E.pulled) {
          lk.prog = 0;
          E.pulled = true; E.st = 'dazed'; E.t = 0;
          lk.pins = Math.min(3, lk.pins + 1); ironStats(st).pulls++;
          Sfx.play('ironfistPinPull');
          ironWord(st, 'CLANK!', A.ex, A.ey - 40, 22, { life: 0.9, rise: 10 });
          if (lk.pins < 3) ironNews(st, 'Pin ' + lk.pins + ' of 3 out!');
        }
      }
    }
    // with the gold help it waits (up to goldHold s more) while someone is on its arm
    if (E.st === 'stuck' && E.t >= ironFistStuckT(st) && ironHasGold(st, 'fists') && E.held < K.goldHold && ps.some(p => p.alive && p.grounded && A.solids.includes(p.ground))) { E.held += dt; E.t -= dt; }
    if (E.st === 'stuck' && E.t >= ironFistStuckT(st)) {
      // not pulled: it tears free and comes back angry
      // (with the gold help it only tears free and goes back up: no sweep)
      E.st = ironHasGold(st, 'fists') ? 'back' : 'tell'; E.t = 0; ph.arm = null; ironFistSolids(ph);
      E.fx = E.side > 0 ? lk.range[1] + 300 : lk.range[0] - 300; E.fy = E.sy;
      Sfx.play('ironfistSweep');
      ironSay(st, 'GRRR! GET OFF MY CHEST!', 2.2);
      ironFistMiss(st);
    }
    return;
  }
  if (E.st === 'dazed') {
    if (E.t >= 0.6) {
      ph.arm = null; ironFistSolids(ph);
      if (lk.pins >= 3 && lk.cracks >= 3) ironFistLockDone(st);
      else { E.st = 'back'; E.t = 0; }
    }
    return;
  }
  if (E.st === 'tell') {
    // the fist hangs back at the zone's edge (on the arm's side), then sweeps across it at floor height
    if (E.t >= K.tellT) { E.st = 'sweep'; E.t = 0; }
    return;
  }
  if (E.st === 'sweep') {
    E.fx -= E.side * K.sweepV * dt;
    const hw = K.fist.hw + 4;
    for (const p of ps) {
      if (!p.alive || st.safe[p.id] > 0) continue;
      const feet = p.y + p.h;
      if (feet > E.sy - 40 && feet <= E.sy + 2 && p.x + p.w > E.fx - hw && p.x < E.fx + hw && Math.abs(feet - E.sy) < 44) {
        if (ironClang(st, p, { kind: 'sweep', word: 'WHUMP!', fromX: E.fx })) ironFistMiss(st);
      }
    }
    const zone = lk.zone === 2 ? K.plate : lk.zone === 0 ? [0, K.pillar[0]] : [K.pillar[1], K.W];
    if (E.side > 0 ? E.fx < zone[0] - 200 : E.fx > zone[1] + 200) { E.st = 'back'; E.t = 0; }
    return;
  }
  if (E.st === 'back') {
    if (E.t >= K.cool) { E.st = 'hunt'; E.t = 0; E.holdT = 0; }
  }
}
function ironFistSlam(st) {
  const ph = st.ph, K = IRONFIST, E = ph.eye, lk = ironFistLock(ph);
  E.st = 'stuck'; E.t = 0; E.pulled = false; E.pull = [lk.prog || 0, 0]; E.held = 0;
  lk.cycle++;
  ironStats(st).slams++;
  Sfx.play('ironfistFistSlam'); rumble(0, 0.8, 0.5, 220); rumble(1, 0.8, 0.5, 220);
  if (!reduceMotion) G.shake = Math.max(G.shake, 0.35);
  ironWord(st, 'KLANG!', E.sx, E.sy - 110, 44, { life: 1, grow: 0.3, rise: 10 });
  ironImpact(st, 'KLANG!');
  for (const p of G.players) {
    if (!p.alive) continue;
    const cx = p.x + p.w / 2, feet = p.y + p.h;
    if (Math.abs(cx - E.sx) < K.hitR && feet > E.sy - 80 && feet < E.sy + 4) {
      const safe = lk.zone === 2 ? E.sx - E.side * 170 : lk.safe;
      if (ironClang(st, p, { kind: 'slam', word: 'SPLAT!', to: { x: safe, y: E.sy } })) ironFistMiss(st);
    }
  }
  if (Math.abs(E.sx - lk.x) < K.crackR && lk.cracks < 3) {
    lk.cracks++;
    Sfx.play(lk.cracks >= 3 ? 'ironfistLockBreak' : 'ironfistLockCrack');
    if (lk.cracks >= 3) { lk.broke = true; ironWord(st, 'CRACK!', lk.x, lk.y - 150, 30, { life: 1.1, rise: 16 }); ironNews(st, lk.pins >= 3 ? 'The lock breaks!' : 'The lock is broken! Now pull the last pins.'); }
    else ironNews(st, 'Crack ' + lk.cracks + ' of 3!');
  } else if (Math.abs(E.sx - lk.x) >= K.crackR) { ironSay(st, 'HA! MISSED THE LOCK!', 2); }
  ph.arm = ironFistArm(E.sx, E.sy, E.side, lk.len);
  ironFistSolids(ph);
}
function ironFistLockDone(st) {
  const ph = st.ph, K = IRONFIST, E = ph.eye, lk = ironFistLock(ph);
  lk.done = true; lk.limp = true;
  Sfx.play('ironfistArmLimp');
  ironCelebrate(st, 0.8);
  if (lk.i < 2) {
    // the arm drops limp across to the sternum plate: the bridge up to it
    const side = lk.sides[0], to = side > 0 ? [K.plate[0], K.plateY] : [K.plate[1], K.plateY];
    ph.limp.push(ironFistArm(lk.x, lk.y, side, lk.len, to));
    ironFistSolids(ph);
    ph.li++;
    E.st = 'back'; E.t = -1; E.tgt = -1; ph.lockOn = -1;
    ironSwap(st);
    ironNews(st, lk.i === 0 ? 'Lock 1 broken! Its arm is a bridge: up it, over to the other side.' : 'Lock 2 broken! Up the limp arm to the last lock.');
    ironSay(st, lk.i === 0 ? 'MY ARM! IT HAS GONE ALL FLOPPY!' : 'NOT THE OTHER ONE TOO!', 2.6);
    st.tick.pose = 'stamp'; st.tick.stampT = 1.6;
  } else {
    ph.li = 3; E.st = 'done'; E.t = 0;
    ph.hatch = { t: 0, inT: 0 };
    Sfx.play('ironfistHatchDrop');
    ironWord(st, 'KA-CHUNK!', 960, K.plateY - 120, 30, { life: 1.2, rise: 12 });
    ironNews(st, 'The chest hatch is open! Both of you, jump in!');
    ironSay(st, 'EEEEK! NOT THE HATCH!', 2.6);
    st.tick.pose = 'gasp';
  }
}
/* --- wind-up mice (from lock 2) and soot clouds (at lock 3) --- */
function ironFistMice(st, dt) {
  const ph = st.ph, K = IRONFIST, M = K.mice, lk = ironFistLock(ph);
  if (ph.li >= 1 && ph.li < 3 && !ph.hatch) {
    ph.miceT -= dt;
    const live = ph.mice.filter(m => !m.dead);
    if (ph.miceT <= 0 && live.length < M.max) {
      ph.miceT = M.every;
      const z = lk.zone, x = z === 2 ? K.plate[1] - 16 : K.W - 40, y = z === 2 ? K.plateY : 0;
      ph.mice.push({ x, y, dir: -1, t: 0, dead: 0, bump: 0, zone: z, turnT: 0 });
      Sfx.play('ironfistMouseScurry');
      if (ph.t - (ph.miceSaid || -9) > 10) { ph.miceSaid = ph.t; ironSay(st, 'GO, MY LITTLE MICE! TRIP THEM UP!', 2.4); }
    }
  }
  for (const m of ph.mice) {
    m.t += dt;
    if (m.dead) { m.dead += dt; continue; }
    if (ph.hatch || m.zone !== lk.zone) { m.dead = 0.01; continue; }
    m.bump = Math.max(0, m.bump - dt); m.turnT = Math.max(0, m.turnT - dt);
    // scurry toward the nearest hero on its floor, turning at most twice a second
    const rng = m.zone === 2 ? [K.plate[0] + 10, K.plate[1] - 10] : m.zone === 0 ? [10, K.pillar[0] - 10] : [K.pillar[1] + 10, K.W - 10];
    const near = G.players.filter(p => p.alive && Math.abs(p.y + p.h - m.y) < 6).sort((a, b) => Math.abs(a.x - m.x) - Math.abs(b.x - m.x))[0];
    if (near && m.turnT <= 0) { const want = Math.sign(near.x + near.w / 2 - m.x) || m.dir; if (want !== m.dir) { m.dir = want; m.turnT = 0.5; } }
    m.x += m.dir * M.v * dt;
    if (m.x < rng[0]) { m.x = rng[0]; m.dir = 1; } if (m.x > rng[1]) { m.x = rng[1]; m.dir = -1; }
    for (const p of G.players) {
      if (!p.alive) continue;
      const feet = p.y + p.h, ox = p.x + p.w > m.x - M.w / 2 && p.x < m.x + M.w / 2;
      if (!ox) continue;
      if (p.vy > 0 && feet >= m.y - M.h - 4 && feet <= m.y - M.h + 12) {
        m.dead = 0.01; p.vy = -330; p.grounded = false;
        Sfx.play('ironfistMouseWindDown'); ironPop(st, m.x, m.y - 30, 'BOING!', { size: 13 }); ironStats(st).mice++;
      } else if (p.grounded && Math.abs(feet - m.y) < 4 && m.bump <= 0) {
        m.bump = 0.8; p.stun = Math.max(p.stun, 0.5); p.vx = m.dir * 170; m.dir = -m.dir; m.turnT = 0.8;
        Sfx.play('ironfistMouseScurry'); ironPop(st, p.x + p.w / 2, p.y - 10, 'TRIP!', { size: 12 });
      }
    }
  }
  ph.mice = ph.mice.filter(m => !m.dead || m.dead < 1.2);
}
function ironFistSoot(st, dt) {
  const ph = st.ph, K = IRONFIST;
  if (ph.li === 2) {
    ph.sootT -= dt;
    if (ph.sootT <= 0) {
      ph.sootT = K.soot.every;
      ph.soot.push({ x: K.plate[0] + 60 + ironRand() * (K.plate[1] - K.plate[0] - 120), y: K.plateY - 70, t: 0 });
      Sfx.play('ironfistSootCough');
    }
  }
  for (const s of ph.soot) s.t += dt;
  ph.soot = ph.soot.filter(s => s.t < K.soot.life);
}
// the camera slides to keep both heroes in view (they are kept inside it)
function ironFistCamera(st, dt) {
  const ps = G.players.filter(p => p.alive);
  if (!ps.length) return;
  const mid = ps.reduce((a, p) => a + p.x + p.w / 2, 0) / ps.length;
  const want = clamp(mid - W / 2, 0, IRONFIST.W - W);
  st.cam.x += (want - st.cam.x) * Math.min(1, dt * 3);
  st.cam.y = IRONFIST.camY;
  for (const p of G.players) if (p.alive) p.x = clamp(p.x, st.cam.x + 6, st.cam.x + W - 6 - p.w);
}

/* --- the plan --- */
// the way to a zone from where a hero is: up the limp arms (walk into the fist and hop it)
function ironFistRoute(ph, p, z) {
  const K = IRONFIST, cx = p.x + p.w / 2, at = ironFistZone(p), floor = p.y + p.h > -30;
  if (at === z) return null;
  if (z === 2 || z === 1 && at === 0) {
    // (walk into the fist from the far side of it and hop it: the ramp starts on its top)
    if (at === 0) return floor && cx > 390 ? 290 : (z === 2 ? 900 : 1240);
    if (at === 1) return floor && cx < 1530 ? 1630 : 1000;
  }
  if (at === 2) return z === 1 ? 1240 : 700;
  return z === 0 ? 700 : 1240;
}
function ironFistPlan(st) {
  const ph = st.ph, K = IRONFIST, ps = G.players, E = ph.eye, out = [{}, {}];
  if (ph.hatch) { for (const id of [0, 1]) out[id] = { why: 'hatch', x: 940 + id * 40, say: 'Into the hatch!' }; return out; }
  const lk = ironFistLock(ph), decoy = (ph.first + lk.i) % 2;
  const side = E.st === 'rise' || E.st === 'stuck' || E.st === 'dazed' ? E.side : lk.sides[lk.cycle % lk.sides.length];
  for (const id of [0, 1]) {
    const p = ps[id], cx = p.x + p.w / 2;
    const r = ironFistRoute(ph, p, lk.zone);
    if (r != null) { out[id] = { why: 'go', x: r, say: lk.i === 0 ? null : 'Up the limp arm, onto the next lock!' }; continue; }
    if (E.st === 'tell' || E.st === 'sweep') { out[id] = { why: 'dodge', x: cx, say: 'Jump the fist!' }; continue; }
    if (E.st === 'stuck' || E.st === 'dazed') {
      const A = ph.arm;
      if (id !== E.tgt && A && E.st === 'stuck') out[id] = { why: 'pull', x: A.ex, hold: 'act', onElbow: !!(p.grounded && p.ground === A.elbow), say: 'Up its arm to the elbow! Hold ' + ironKey(id, 'act') + ': pull the pin!' };
      else out[id] = { why: 'watch', x: ironFistClearX(lk, E, side), say: 'Keep the eye on you, off the arm!' };
      continue;
    }
    if (id === decoy) {
      const onLock = ironFistZone(p) === lk.zone && Math.abs(cx - lk.x) < K.snapR && p.y + p.h > lk.y - 30;
      if (E.st === 'rise' && E.tgt === id) out[id] = { why: 'clear', x: ironFistClearX(lk, E, side), say: 'The fist is coming! Jump off the lock!' };
      else if (onLock && E.tgt === id && ph.lockOn === id) out[id] = { why: 'lure', x: lk.x, tap: 'act', say: 'The spotlight is on you. Stay on the lock...' };
      else out[id] = { why: 'lure', x: lk.x, tap: 'act', say: 'Stand on the lock and tap ' + ironKey(id, 'act') + ' to taunt: the spotlight follows you!' };
    } else {
      const rx = lk.x + side * 92;
      out[id] = { why: 'ready', x: rx, say: E.st === 'rise' ? 'Get ready to run up its arm!' : 'Wait by the lock. When the fist lands, run up its arm!' };
    }
  }
  return out;
}
// where the decoy goes once the eye narrows: off the lock, away from the arm's side
function ironFistClearX(lk, E, side) {
  const K = IRONFIST, x = (E.st === 'hunt' ? lk.x : E.sx) - side * 118;
  if (lk.zone === 2) return clamp(x, K.plate[0] + 16, K.plate[1] - 16);
  return clamp(x, lk.zone === 0 ? 30 : K.pillar[1] + 20, lk.zone === 0 ? K.pillar[0] - 20 : K.W - 30);
}
function ironFistHints(st) {
  const ph = st.ph, P = ironFistPlan(st);
  for (const id of [0, 1]) {
    const s = P[id] && P[id].say;
    if (s && ph['said' + id] !== s) { ph['said' + id] = s; ironHint(st, id, s, { life: 3.2, cpu: '' }); }
    if (!s) ph['said' + id] = null;
  }
}

/* --- drawing --- */
function ironFistDrawSky(st) {
  // dusk: the sky deepening up from a warm band at the horizon; Superhero City far below, its glass towers holding
  // the giant's reflection; all of it slides slowly left (the giant is walking)
  SKETCH.paper(ctx, 'dusk');
  const gr = ctx.createLinearGradient(0, 0, 0, 540);
  gr.addColorStop(0, 'rgba(52,66,104,0.62)'); gr.addColorStop(0.35, 'rgba(120,110,128,0.3)'); gr.addColorStop(0.62, 'rgba(236,150,92,0.34)'); gr.addColorStop(1, 'rgba(236,150,92,0.2)');
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = gr; ctx.fillRect(0, 0, 960, 540); ctx.restore();
  SKETCH.glow(ctx, 760, 300, 520, '255,170,110', 0.36);
  SKETCH.glow(ctx, 760, 300, 90, '255,226,170', 0.6);
  const cx = st.cam.x, drift = G.clock * 6;
  for (const [l, par, y] of [[0, 0.08, 40], [1, 0.18, 90], [2, 0.32, 150]]) {
    const off = -((cx * par + drift * (l + 1) * 0.5) % 960);
    for (const x of [off, off + 960]) SKETCH.blit(ctx, IRON_ART.city(l), x, y);
  }
}
function ironFistDrawBack(st) {
  const ph = st.ph, K = IRONFIST, d = SKETCH.live(ctx, 5140, SKETCH.boil()), E = ph.eye;
  const x0 = st.cam.x - 40, x1 = st.cam.x + W + 40;
  // the chest: an opaque underpaint, then four bands of plates (with the locks' mounts), shoulder to shoulder
  for (let k = 0; k < 4; k++) { const bx = k * 480; if (bx > x1 || bx + 480 < x0) continue; SKETCH.blit(ctx, IRON_ART.chestWall(k), bx, -380); }
  // the head leaning in at the top: the lantern eye (its glow pulses; narrowed it is a slit)
  SKETCH.blit(ctx, IRON_ART.colossusHead(), K.eye.x, K.eye.y, { sx: 0.86, sy: 0.86 });
  ironFistDrawEyeLight(st, d);
  // the ledges and the sternum plate on its pillar
  SKETCH.blit(ctx, IRON_ART.sternum(), K.plate[0], K.plateY);
  for (const [k, a, b] of [[0, 0, K.pillar[0]], [1, K.pillar[1], K.W]]) SKETCH.blit(ctx, IRON_ART.chestLedge(k), a, 0);
  // the locks
  for (const lk of ph.locks) {
    if (lk.broke && lk.done) { SKETCH.blit(ctx, IRON_ART.padlock(2), lk.x, lk.y, { rot: 0.5 }); continue; }
    SKETCH.blit(ctx, IRON_ART.padlock(Math.min(1, lk.cracks >> 1)), lk.x, lk.y);
    for (let c = 0; c < lk.cracks; c++) { const cxx = lk.x - 14 + c * 14; d.stroke([[cxx, lk.y - 46], [cxx + 5, lk.y - 34], [cxx - 3, lk.y - 26], [cxx + 4, lk.y - 14]], { w: 2.2, sh: 0 }); }
    // pins: three little pegs above the lock
    for (let k = 0; k < 3; k++) { const px = lk.x - 18 + k * 18, py = lk.y - 76; d.ellipse(px, py, 4.5, 4.5, { fill: k < lk.pins ? SKETCH.PAL.core : IRON_P.soot, w: 1.4 }); }
  }
  // the chest hatch
  if (ph.hatch) SKETCH.blit(ctx, IRON_ART.chestHatch(), 960, K.plateY, { sy: Math.max(0.15, 1 - ph.hatch.t * 2) });
}
// the eye's light: a cone from the lantern to a pool of bare paper where it looks
function ironFistDrawEyeLight(st, d) {
  const ph = st.ph, K = IRONFIST, E = ph.eye, lk = ironFistLock(ph);
  if (E.st === 'done' || E.st === 'wake' && E.t < 0.6) return;
  const sy = lk.y, narrow = E.st === 'rise' || E.st === 'stuck', r = narrow ? 34 : 52;
  const ex = K.eye.x, ey = K.eye.y + 10;
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = narrow ? 'rgba(255,214,120,0.4)' : 'rgba(255,236,190,0.34)';
  ctx.beginPath(); ctx.moveTo(ex - 12, ey); ctx.lineTo(E.x - r, sy); ctx.lineTo(E.x + r, sy); ctx.lineTo(ex + 12, ey); ctx.closePath(); ctx.fill();
  ctx.fillStyle = narrow ? 'rgba(255,220,130,0.7)' : 'rgba(255,244,214,0.66)';
  ctx.beginPath(); ctx.ellipse(E.x, sy - 4, r + 6, 11, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  d.stroke(SKETCH.ell(E.x, sy - 4, r + 6, 11, 16, 0), { w: 1.8, curve: true, alpha: 0.85, sh: 0, col: narrow ? SKETCH.PAL.rust : SKETCH.INK });
  // the eye locking on: a rust ring drawn round the pool as it holds (it narrows when the ring closes)
  if (E.st === 'hunt' && E.holdT > 0.02) {
    const k = Math.min(1, E.holdT / K.eye.hold);
    d.stroke(SKETCH.ell(E.x, sy - 4, r + 14, 17, 22, 0, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2), { w: 3.2, curve: true, sh: 0, col: SKETCH.PAL.rust });
  }
  // the cone's edges: two dry, broken strokes, so the beam is drawn and not a flat shape
  for (const sg of [-1, 1]) d.stroke([[ex + sg * 10, ey], [(ex + E.x) / 2 + sg * (r + 10) / 2, (ey + sy) / 2], [E.x + sg * r, sy - 4]], { w: 1.1, alpha: 0.4, sh: 0, brk: 1.6, col: narrow ? SKETCH.PAL.rust : '#8a7a58', p: [0.2, 1, 0.6] });
}
function ironFistDraw(st) {
  const ph = st.ph, K = IRONFIST, E = ph.eye, d = SKETCH.live(ctx, 5150, SKETCH.boil()), lk = ironFistLock(ph);
  // limp arms lying across to the plate
  for (const L of ph.limp) ironFistDrawArm(L[1], L[0], d, true);
  // the live fist
  if (E.st === 'rise') {
    const k = E.t / ironFistRiseT(st), h = 260 - Math.sin(k * Math.PI * 0.5) * 60 + (k > 0.85 ? (k - 0.85) / 0.15 * 230 : 0);
    // its shadow on the plates, growing as it comes
    const sr = 26 + k * 44;
    d.spot(SKETCH.ell(E.sx, E.sy - 3, sr, 7, 14, 0), { alpha: 0.25 + k * 0.4 });
    if (ironHasGold(st, 'fists')) d.stroke(SKETCH.ell(E.sx, E.sy - 4, K.hitR, 12, 18, 0), { w: 3, col: SKETCH.PAL.core, curve: true, sh: 0 });
    const fy = E.sy - h + K.fist.h;
    SKETCH.blit(ctx, IRON_ART.forearm(), E.sx + E.side * 40, fy - 56, { rot: Math.atan2(-0.83, E.side * 0.56), sx: 1.8, sy: 1.25 });
    SKETCH.blit(ctx, IRON_ART.fist(E.side), E.sx, fy, { sx: 0.84, sy: 0.84 });
  } else if (ph.arm) {
    const A = ph.arm;
    ironFistDrawArm(A.ramp, A.fist, d, false, A);
    // the pull: the pin coming out
    const pl = Math.max(ph.eye.pull[0], ph.eye.pull[1]) / K.pullT;
    if (pl > 0) d.stroke([[A.ex, A.ey - 10], [A.ex, A.ey - 10 - pl * 26]], { w: 5, col: SKETCH.PAL.core, sh: 0 });
    if (E.st === 'stuck') { const left = 1 - E.t / ironFistStuckT(st); d.stroke(SKETCH.ell(A.sx, A.sy - 90, 14, 14, 20, 0, -Math.PI / 2, -Math.PI / 2 + Math.max(0.05, left) * Math.PI * 2), { w: 3, col: left < 0.3 ? SKETCH.PAL.rust : SKETCH.PAL.ochre, sh: 0, curve: true }); }
  } else if (E.st === 'tell' || E.st === 'sweep') {
    const shake = E.st === 'tell' ? Math.sin(G.clock * 60) * 3 : 0;
    SKETCH.blit(ctx, IRON_ART.fist(E.side), E.fx + shake, E.sy, { sx: 0.84, sy: 0.84 });
    if (E.st === 'sweep') d.speed(E.fx + E.side * 40, E.sy - 30, E.side * 120, 0, 5, { w: 1.4 });
    else d.word('!', E.fx - E.side * 70, E.sy - 80, 28, { align: 'center', fill: SKETCH.PAL.core, w: 3 });
  }
  // mice
  for (const m of ph.mice) {
    const a = m.dead ? Math.max(0, 1 - m.dead / 1.2) : 1;
    SKETCH.blit(ctx, IRON_ART.windMouse(((m.t * 10) | 0) % 2), m.x, m.y, { sx: m.dir > 0 ? 1 : -1, alpha: a, rot: m.dead ? m.dead * 8 : 0 });
  }
  // Tick on his collar
  ironTickDrawAt(st);
  void lk;
}
// a stuck (or limp) arm: the forearm along its ramp, the fist at the bottom, the elbow joint at the top
function ironFistDrawArm(ramp, fist, d, limp, A) {
  const sx = (fist.x0 + fist.x1) / 2, sy = fist.y1;
  const up = ramp.ya < ramp.yb ? [ramp.x0, ramp.ya] : [ramp.x1, ramp.yb];   // the high end
  const lo = ramp.ya < ramp.yb ? [ramp.x1, ramp.yb] : [ramp.x0, ramp.ya];
  // drawn from the ramp's left end along it (the sheet's top edge is the walking line)
  const ang = Math.atan2(ramp.yb - ramp.ya, ramp.x1 - ramp.x0), len = Math.hypot(ramp.x1 - ramp.x0, ramp.yb - ramp.ya);
  SKETCH.blit(ctx, IRON_ART.forearm(), ramp.x0 - Math.cos(ang) * 6, ramp.ya - Math.sin(ang) * 6, { rot: ang, sx: (len + 12) / 246 });
  void up; void lo;
  SKETCH.blit(ctx, IRON_ART.fist(up[0] > sx ? 1 : -1), sx, sy, { rot: limp ? 0.08 : 0, sx: 0.84, sy: 0.84 });
  if (A) SKETCH.blit(ctx, IRON_ART.elbow(), A.ex, A.ey);
  void d;
}
function ironFistDrawTop(st) {
  const ph = st.ph, d = SKETCH.live(ctx, 5160, SKETCH.boil());
  // soot clouds: heavy hatching that hides the plate under it for a few seconds
  for (const s of ph.soot) {
    const k = s.t / IRONFIST.soot.life, a = Math.min(1, s.t * 3, (1 - k) * 3);
    ctx.save(); ctx.globalAlpha *= a * 0.9;
    for (let i = 0; i < 5; i++) d.cloud(s.x - 70 + i * 35, s.y + Math.sin(i * 2.1) * 16 - k * 30, 30 + (i % 2) * 10, { fill: '#3b3430', puffs: 7, w: 1.6, curls: 2 });
    ctx.restore();
  }
  // the eye's light cuts through the soot
  const E = ph.eye;
  if (ph.soot.length && E.st !== 'done') ironFistDrawEyeLight(st, d);
  ironFistDrawMarks(st);
}
// the job marks, so the goal reads at a glance: a hand-drawn arrow bobbing over the live lock ("PIP: TAUNT HERE!")
// while the eye hunts, and over the elbow ("BO: HOLD - PULL!") while the fist is stuck
function ironFistDrawMarks(st) {
  const ph = st.ph, K = IRONFIST, E = ph.eye;
  if (ph.hatch || ph.li > 2 || E.st === 'wake' || E.st === 'done' || st.cut) return;
  const lk = ironFistLock(ph), P = ironFistPlan(st), d = SKETCH.live(ctx, 5170, SKETCH.boil());
  const name = id => (id === 0 ? 'PIP' : 'BO'), bob = reduceMotion ? 0 : Math.sin(G.clock * 5) * 5;
  // (solid paper and a solid yellow arrow under the ink, so it reads over the busy chest plates)
  const blob = (pts, col) => { ctx.save(); ctx.fillStyle = col; ctx.beginPath(); SKETCH.spline(pts, true, 3).forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.fill(); ctx.restore(); };
  const mark = (x, yTip, text) => {
    const y = yTip - 8 + bob, arrow = [[x - 14, y - 30], [x + 14, y - 30], [x + 14, y - 14], [x + 27, y - 14], [x, y + 8], [x - 27, y - 14], [x - 14, y - 14]];
    ctx.save(); ctx.fillStyle = SKETCH.PAL.core; ctx.beginPath(); arrow.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.closePath(); ctx.fill(); ctx.restore();
    d.shape(arrow, { w: 2.2, corner: 50 });
    const tw = SKETCH.wordWidth(text, 16) + 22, ty = y - 50, box = [[x - tw / 2, ty - 15], [x, ty - 17], [x + tw / 2, ty - 14], [x + tw / 2 + 3, ty], [x + tw / 2, ty + 14], [x, ty + 16], [x - tw / 2, ty + 14], [x - tw / 2 - 3, ty]];
    blob(box, SKETCH.PAL.cream);
    d.stroke(SKETCH.spline(box, true, 3).concat([SKETCH.spline(box, true, 3)[0]]), { w: 1.8, sh: 0 });
    d.word(text, x, ty + 6, 16, { align: 'center', w: 2.3, bounce: 0.04 });
  };
  if (E.st === 'hunt' || E.st === 'back') {
    const id = [0, 1].find(k => P[k] && P[k].why === 'lure');
    if (id != null) mark(lk.x, lk.y - 168, name(id) + ': TAUNT HERE!');
  } else if (E.st === 'stuck' && ph.arm) {
    const id = [0, 1].find(k => P[k] && P[k].why === 'pull');
    const p = id != null && G.players[id], onArm = p && p.grounded && ph.arm.solids.includes(p.ground);
    if (id != null && !onArm) mark(ph.arm.ex, ph.arm.ey - 24, name(id) + ': HOLD HERE TO PULL!');
  }
}
function ironFistHeroO(st, p) {
  if (p.tauntT > 0) { p.tauntT -= DT * 2; return { mood: 'cheeky', sy: 1.06 }; }
  return null;
}

IRON_PHASES.fists = {
  setup(st, L) { ironFistSetup(st, L); },
  wait(st, dt) { const ph = st.ph; if (ph.prep && ph.prep.length) ph.prep.shift()(); ironCoast(st, dt, ph.solids); },
  step(st, dt) { const ph = st.ph; if (ph.prep && ph.prep.length) ph.prep.shift()(); ironFistStep(st, dt); },
  plan(st) { return ironFistPlan(st); },
  labels(st) { const P = ironFistPlan(st); return [0, 1].map(id => (P[id] && P[id].why === 'pull' ? 'pull' : 'taunt')); },
  hudText(st) {
    const ph = st.ph;
    if (ph.hatch) return 'The hatch is open!';
    const lk = ironFistLock(ph);
    return 'Lock ' + (lk.i + 1) + ' of 3  ·  Cracks ' + lk.cracks + '/3  ·  Pins ' + lk.pins + '/3';
  },
  drawSky(st) { ironFistDrawSky(st); },
  drawBack(st) { ironFistDrawBack(st); },
  draw(st) { ironFistDraw(st); },
  drawTop(st) { ironFistDrawTop(st); },
  heroO(st, p) { return ironFistHeroO(st, p); },
  music() { return { song: 'ironmarch3', amb: 'ironCity' }; },
  stat(st) { const s = st.stats.fists; return s && s.slams ? { label: 'Fists tricked', value: s.slams } : null; },
  leave() { for (const k of ['iron:city', 'iron:chestwall', 'iron:head', 'iron:fist', 'iron:forearm', 'iron:elbow', 'iron:padlock', 'iron:chestledge', 'iron:sternum', 'iron:windmouse', 'iron:chesthatch']) SKETCH.forget(k); },
};

/* --- sounds --- */
Sfx.extra.ironfistEyeNarrow = function () { this.tone(1400, 0.04, 'square', 0.03, 900); this.noise(0.05, { type: 'highpass', f: 3000, vol: 0.03, delay: 0.03 }); };
Sfx.extra.ironfistFistRise = function () { this.tone(500, 1.05, 'sine', 0.022, 1500); this.tone(510, 1.05, 'triangle', 0.012, 1530); };
Sfx.extra.ironfistFistSlam = function () { this.tone(60, 0.6, 'sine', 0.11, 34); this.tone(300, 0.3, 'square', 0.03, 140); this.noise(0.5, { type: 'lowpass', f: 1600, to: 160, vol: 0.07 }); };
Sfx.extra.ironfistLockCrack = function () { this.noise(0.12, { type: 'highpass', f: 2200, vol: 0.05 }); this.tone(900, 0.08, 'square', 0.02, 600, 0.04); };
Sfx.extra.ironfistLockBreak = function () { for (let k = 0; k < 3; k++) this.noise(0.1, { type: 'highpass', f: 2000 - k * 400, vol: 0.05, delay: k * 0.07 }); this.tone(220, 0.5, 'triangle', 0.04, 110, 0.15); };
Sfx.extra.ironfistTaunt = function () { this.tone(140, 0.28, 'sawtooth', 0.03, 120); this.noise(0.26, { f: 300, q: 2, vol: 0.03 }); };
Sfx.extra.ironfistPinPull = function () { for (let k = 0; k < 3; k++) this.tone(300 + k * 120, 0.08, 'square', 0.04, null, k * 0.11); };
Sfx.extra.ironfistArmLimp = function () { this.tone(120, 1.0, 'sawtooth', 0.03, 50); this.noise(0.8, { f: 300, q: 3, vol: 0.02, a: 0.2 }); };
Sfx.extra.ironfistSweep = function () { this.noise(0.7, { f: 700, q: 1.2, vol: 0.04, a: 0.4 }); this.tone(90, 0.6, 'sawtooth', 0.02, 160); };
Sfx.extra.ironfistShrug = function () { this.tone(180, 0.18, 'square', 0.03, 260); this.noise(0.12, { f: 800, vol: 0.02 }); };
Sfx.extra.ironfistMouseScurry = function () { for (let k = 0; k < 6; k++) this.tone(1800 + (k % 2) * 300, 0.025, 'square', 0.012, null, k * 0.05); };
Sfx.extra.ironfistMouseWindDown = function () { for (let k = 0; k < 8; k++) this.tone(900 - k * 70, 0.04, 'square', 0.015, null, k * 0.06 + k * k * 0.004); };
Sfx.extra.ironfistSootCough = function () { this.noise(0.25, { type: 'lowpass', f: 500, vol: 0.05 }); this.noise(0.3, { type: 'lowpass', f: 400, vol: 0.04, delay: 0.3 }); };
Sfx.extra.ironfistHatchDrop = function () { this.tone(90, 0.4, 'square', 0.05, 50); this.noise(0.4, { type: 'lowpass', f: 900, vol: 0.06, delay: 0.1 }); };

ironRoom('fists', {
  jobs: {
    both: { act: ['taunt', 'pull'], legend: '<kbd>A</kbd><kbd>D</kbd> move <kbd>W</kbd> jump <kbd>F</kbd> taunt, or hold to pull',
      howTo: ['Taunt on the lock so the fist punches it. Jump clear!', 'Then the other runs up the arm and holds pull at the elbow.'] },
  },
  act: { label: 'taunt', labels: ['taunt', 'pull'] },
  tip: IRON_PARTS.fists.tip,
});
