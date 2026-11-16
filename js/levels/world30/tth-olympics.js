/* Pip & Bo - Level 30-1 The Time Thief: era 'olympics' (The First Olympics, 776 BC). */
'use strict';

/* ===== 30-1 era 4: The First Olympics, 776 BC (TTH_PHASES.olympics) — Gavyn's pick =====
   "A chariot chase through the stadium. One drives the horses, the other grabs the stolen gold wreath."
   The Time Thief flies ahead over the track at Olympia with the champion's wreath swinging on his claw. Pip and Bo
   ride ONE chariot behind two horses (the era draws them itself: hide() is true) and chase him for 3 laps. The view
   scrolls right; the track has 3 lanes. Each lap is one stretch: catch up, tease, snatch, then the lap line where the
   jobs swap ("Swap jobs!", "Swap reins!" in the news). Room field `first` says who drives lap 1.

   THE TWO JOBS
     DRIVER   ▲ / ▼ (up = the jump button, tthUp) change lanes, one lane per press (held: repeats every 0.32 s).
              ▶ held = gallop. The action button ("gallop") is a spur: one press gallops for 1.2 s, so a touch player
              can tap it and keep a thumb free for the lanes. ◀ held = rein in (brake down to a trot).
              With nothing pressed the horses slowly ease to a stop (75 px/s²), so an idle driver stalls everything,
              but letting go for a lane change costs nothing you can feel. Never two directions at once.
     GRABBER  the action button ("grab"): HOLD it to swing the long hook out (0.2 s), LET GO to snatch. The snatch
              takes an olive branch whose pole is passing the hook (a window of about 0.4 s at a gallop, 0.3 s in a
              boost; the branch glows while it can be taken) if the
              chariot is in that branch's lane. A quick tap does nothing (the hook must be out); a snatch at nothing
              rests the arm for 0.55 s, so mashing loses to timing.
   They need each other all the time: only the driver can put the chariot in the branch's lane and keep it out of the
   junk, only the grabber can take the branch. Each olive branch is one leaf on the "Catch up!" gauge and a speed
   burst ("Olive boost!"). When the gauge is full the Thief comes down to tease.

   THE TEASE (the end of every lap)  He hovers just ahead and dangles the wreath on a rope: it swings like a pendulum
   and passes the hook ring at the near end of every swing. The grabber lets go as it swings in (the ring turns gold:
   "NOW!"); the driver must stay under him: keep galloping (below 380 px/s he drifts ahead, out of reach) and, from
   lap 2, follow him when he weaves to another lane (a pointing arrow 0.8 s before he moves).
   Lap 1 and 2: the snatch tears off one of the wreath's two ribbons ("RRRIP!"); he yanks the wreath away and jets off,
   dropping clock gears on the track (a shadow and "!" on the landing spot 1.1 s before each lands). Then the lap line.
   Lap 3: the snatch takes the whole wreath. The horses pull up, the crowd goes wild, tthPhaseDone.

   THE THREE LAPS (TTHOLY.laps; each adds something)
     1  amphorae (one or two lanes), mud, two turning posts. 10 branches. A plain swing.
     2  + fallen hurdles (two lanes wide), rolling discuses, the Thief's old socks on some poles; 11 branches; he
        weaves in the tease. (Fleeing, he drops 4 gears after lap 1 and 6 after lap 2.)
     3  + rival chariots that weave; more socks; faster horses; 12 branches; a faster swing and more weaving.
   HAZARDS (all soft: nobody is hurt)
     amphora / hurdle / gear / discus   "Crash!": tthBump (the team's bump), the thing shatters, the chariot wobbles
              and drops to 40% speed. A discus rolls toward you along its lane ("!" at the edge 0.8 s before it shows).
     mud      no bump: the horses plod (210 px/s) while they are in it.
     rival    another chariot, slower than a gallop, that changes lane now and then: its driver points and chevrons
              blink on that side for 0.75 s first. Touching it is a "Bump!" (it gets shoved ahead). It never weaves
              into a chariot that is already beside it.
     turning post   a marked "rein in" zone (440 px of chevrons), then the post's line. Cross the line faster than
              330 px/s: "Skid!" (a bump, a spin, down to 100 px/s). At the right speed: "Clean turn!".
     sock     looks like a branch pole, but holds the Thief's smelly sock. Grabbing it: "Yuck!" (tthBonk for the
              grabber, the arm rests 1 s). Just don't grab it.
     Everything is telegraphed at least 0.6 s: static things scroll in from the right edge (0.9 s away even in a
     boost), and a one-way row (two amphorae side by side, or a hurdle: it may take two lane changes) blinks "!" at
     the edge of its blocked lanes 0.55 s before it scrolls in.
     In a calm moment (card, cutscene, idle) nothing moves or drops; with nobody playing the horses stop.
     A lane change that clears a thing by less than 130 px (about 0.3 s) is a "Close one!" (the crowd cheers).
   GOLD HELP (announced with tthHelp; per lap, because the jobs swap)
     3 branches missed in the right lane   a golden hook: just HOLD the button, it grabs by itself (never a sock);
                                           it flies out at once, so even a quick tap at the right moment grabs
     3 branches missed in the wrong lane   a long golden hook: it reaches the next lane too
     3 crashes in a lap                    a clearer track (45% of the junk beats stay empty)
     2 skids by the same driver            the horses slow for turns by themselves
     3 whiffs at the wreath (or 16 s)      a slower swing and a bigger ring; 6 whiffs (or 30 s): the golden hook
                                           (6 taps too quick to swing the hook out count as 3 whiffs: for mashers)
     60 s in one lap's chase               the crowd throws a branch every 8 s while the chariot is moving
   The era can never be cleared alone: an idle driver stops the chariot; an idle grabber never takes the wreath.
   HISTORY (the news line and his taunts): the first Olympics in 776 BC had one event, a foot race of about 192 m;
   chariot races joined in 680 BC; winners got a wreath of olive leaves, not gold.
   Stats (st.stats.olympics): laps [s], branches, missed, crashes, skids, whiffs, socks, mud, close (close calls).
   Names: tthOly* / TTHOLY*; sounds Sfx.extra.tthOly*. All state lives in st.ph (fresh every start); gameplay
   randomness only through tthRand(). The brain (js/cpu/levels/world30/tth-olympics.js) reads TTHOLY and st.ph. */
const TTHOLY = {
  chX: 236,                              // the chariot's spot on screen (the car's centre)
  laneY: [356, 420, 484], laneH: 64,     // the wheel line of each lane
  trackTop: 318,
  front: 124, back: 34, floor: 26,       // the rig ahead of / behind the car's centre; the car's floor over the ground
  laps: [
    { need: 10, vMax: 440, gap: 500, branchEvery: 3, postFirst: 10, postEvery: 16, sock: 0, swing: 2.0, weave: 0, junk: 4,
      haz: { a1: 5, a2: 2, mud: 3 }, fact: '776 BC: the first Olympics had ONE event, a 192 m foot race!' },
    { need: 11, vMax: 470, gap: 480, branchEvery: 3, postFirst: 8, postEvery: 15, sock: 0.16, swing: 1.75, weave: 3.4, junk: 6,
      haz: { a1: 3, a2: 2, hu: 2, mud: 2, disc: 4 }, fact: 'Chariot races joined the Olympics in 680 BC: 96 years later!' },
    { need: 12, vMax: 500, gap: 460, branchEvery: 3, postFirst: 7, postEvery: 13, sock: 0.22, swing: 1.55, weave: 2.6, junk: 0,
      haz: { a1: 3, a2: 2, hu: 2, mud: 1, disc: 3, rival: 4 }, fact: 'Olympic winners got a wreath of olive leaves, not gold.' },
  ],
  acc: 420, brake: 640, decay: 75, vRein: 150, vBoost: 690, boostT: 1.3, spurT: 1.2,
  laneT: 0.16, laneRepeat: 0.32,
  crashK: 0.4, crashMin: 120, wobT: 0.75, mudV: 210, mudLen: 190, closeD: 130,
  skidV: 330, zone: 440, skidT: 1.0, skidTo: 100,
  hookDx: 104, hookUp: 96, handDx: -12, handUp: 42,             // the hook's tip at full reach; the grabber's hand
  reachUp: 0.2, reachDown: 0.14, minReach: 0.6, winBack: 56, winFront: 60, winLead: 0.13, swipeT: 0.16, cool: 0.3, whiffCool: 0.55, sockStun: 1.0,
  tease: { rope: 70, amp: 1.2, R: 30, goldR: 46, goldSlow: 1.45, keepV: 380, lagMax: 300, tell: 0.8, move: 0.4, s: 0.62 },
  disc: { v: 170, warn: 0.8 }, rowWarn: 0.55,
  rival: { v: 215, tell: 0.75, move: 0.35, every: [1.5, 2.3], shove: 0.8 },
  gear: { fall: 1.1, every: 0.75 },
  gold: { hook: 3, lane: 3, crash: 3, skid: 2, whiff: 3, whiff2: 6, taps: 6, teaseT: 16, teaseT2: 30, chaseT: 60, chaseEvery: 8, clearK: 0.45 },
  wonT: 2.1,
};
const TTHOLY_TAUNTS = ['Too slow, slowpokes!', 'My horse has a JET! Ha ha!', 'Chariots, 96 years early. You\'re welcome!', 'One foot race? Boring! I added chariots!',
  'Giddy-up! Ha ha ha!', 'Mind the pottery!'];
const TTHOLY_PAL = {
  hero: { h1: '#b8793f', h1d: '#8a5326', h2: '#8c5a2e', h2d: '#683f1c', mane: '#3a2413', car: '#c0392b', carDk: '#8e2a20', trim: '#ffd23f', wheel: '#7a4a1e' },
  rival: { h1: '#f1ece0', h1d: '#c9c2b2', h2: '#d8d2c4', h2d: '#aaa392', mane: '#8d8676', car: '#3d7fc4', carDk: '#2a5a8e', trim: '#f1ece0', wheel: '#5a4630' },
};
let tthOlyTiles = null;   // pre-drawn pictures (crowd, sand, wall): static art only, never game state

const tthOlyLaneY = ly => TTHOLY.laneY[0] + ly * TTHOLY.laneH;
const tthOlyLapK = ph => TTHOLY.laps[Math.min(ph.lap, TTHOLY.laps.length - 1)];
const tthOlyIsCpu = id => typeof cpuSolo === 'function' && cpuSolo() && cpuOn(id);
// the action button in a hint: on touch it is named by its word ("the grab button")
const tthOlyAct = (st, id) => (tthDev(id) === 'touch' ? 'the ' + (id === st.ph.driver ? 'gallop' : 'grab') + ' button' : tthKey(id, 'act'));
// the hook's tip at full reach (world): where a branch is taken and where the wreath must swing to
const tthOlyTip = ph => ({ x: ph.x + TTHOLY.hookDx, y: tthOlyLaneY(ph.ly) - TTHOLY.hookUp });
// a hint, at most once every `again` s per key
function tthOlyTipOnce(st, id, key, text, again = 8, o = {}) {
  const ph = st.ph, k = id + key;
  if (ph.tipT[k] != null && st.phT - ph.tipT[k] < again) return;
  ph.tipT[k] = st.phT;
  tthHint(st, id, text, o);
}

/* ---------- the track: beats of junk and olive branches, made as the chariot comes near ---------- */
function tthOlyNewGen(x, LK) { return { on: true, x, n: 0, sinceB: 1, post: LK.postFirst, skip: 0, free: -1, one: false, lastB: -1, rivalCD: 3 }; }
function tthOlyBeat(st) {
  const ph = st.ph, g = ph.gen, LK = tthOlyLapK(ph), K = TTHOLY, R = tthRand, x = g.x;
  const add = o => { ph.obs.push(o); return o; };
  const wasOne = g.one, wasFree = g.free;
  g.n++; g.one = false; g.free = -1; g.rivalCD--;
  let gap = LK.gap + R() * 60;
  // a turning post: the "rein in" zone, then its line; the next beat is a branch (slow and easy)
  if (g.n >= g.post && g.skip <= 0) {
    g.post = g.n + LK.postEvery;
    add({ kind: 'post', x: x + K.zone, lane: -1 });
    g.x = x + K.zone + 330; g.sinceB = LK.branchEvery;
    return;
  }
  // an olive branch every few beats (after a one-way row: in a lane next to its free lane; not the same lane twice mostly)
  if (++g.sinceB >= LK.branchEvery) {
    g.sinceB = 0;
    let lanes = [0, 1, 2].filter(l => !wasOne || Math.abs(l - wasFree) <= 1);
    if (lanes.length > 1 && R() < 0.7) lanes = lanes.filter(l => l !== g.lastB);
    const lane = lanes[Math.floor(R() * lanes.length)];
    add({ kind: 'branch', x, lane, sock: false });
    g.lastB = lane; g.x = x + gap;
    return;
  }
  g.x = x + gap;
  if (g.skip > 0) { g.skip--; return; }                      // room for a rival chariot
  if (ph.gold.clear && R() < K.gold.clearK) return;          // gold help: a clearer track
  // one of the Thief's old socks on a branch pole
  if (LK.sock && R() < LK.sock) { add({ kind: 'branch', x, lane: Math.floor(R() * 3), sock: true }); return; }
  let tot = 0, kind = 'a1';
  for (const k in LK.haz) tot += LK.haz[k];
  let r = R() * tot;
  for (const k in LK.haz) { if ((r -= LK.haz[k]) < 0) { kind = k; break; } }
  if (kind === 'rival' && (g.rivalCD > 0 || g.post - g.n < 4)) kind = 'a1';
  if ((kind === 'a2' || kind === 'hu') && wasOne) kind = 'a1';   // never two one-way rows in a row
  const any = () => Math.floor(R() * 3), mine = k => (R() < k ? ph.lane : any());
  switch (kind) {
    case 'a1': add({ kind: 'amph', x, lane: mine(0.5), r: 17 }); break;
    case 'a2': { const free = any(); for (let l = 0; l < 3; l++) if (l !== free) add({ kind: 'amph', x: x + (R() - 0.5) * 50, lane: l, r: 17, warn: true }); g.one = true; g.free = free; g.x += 70; break; }
    case 'hu': { const top = R() < 0.5 ? 0 : 1; add({ kind: 'hurdle', x, lane: top, r: 18, warn: true }); g.one = true; g.free = top ? 0 : 2; g.x += 70; break; }
    case 'mud': { const lane = any(); add({ kind: 'mud', x, lane, len: K.mudLen }); if (R() < 0.5) add({ kind: 'amph', x: x + 95, lane: (lane + 1 + Math.floor(R() * 2)) % 3, r: 17 }); break; }
    case 'disc': add({ kind: 'disc', x: x + 120, lane: mine(0.6), r: 15, roll: false, rot: 0 }); break;
    case 'rival': { const lane = any(); add({ kind: 'rival', x, lane, ly: lane, v: K.rival.v, gal: R() * 6, wheel: 0, tell: 0, dir: 0, next: 1.2 + R(), shove: 0, wob: 0 }); g.skip = 2; g.rivalCD = 8; break; }
  }
}

/* ---------- the driver: lanes and pace ---------- */
function tthOlyDrive(st, dt) {
  const ph = st.ph, K = TTHOLY, p = G.players[ph.driver], inp = p.input, LK = tthOlyLapK(ph);
  const frozen = ph.mode === 'won' || ph.mode === 'done';
  // lanes: one per press, a held button repeats
  const up = !frozen && tthUp(p), dn = !frozen && !!inp.down && !up;
  let d = 0;
  if (up && !ph.prevUp) { d = -1; ph.repT = 0; } else if (dn && !ph.prevDn) { d = 1; ph.repT = 0; }
  else if (up || dn) { if ((ph.repT += dt) >= K.laneRepeat) { ph.repT = 0; d = up ? -1 : 1; } }
  ph.prevUp = up; ph.prevDn = dn; p.pendingJump = false;
  if (d && ph.spin <= 0) {
    const to = clamp(ph.lane + d, 0, 2);
    if (to !== ph.lane) { ph.laneFrom = ph.lane; ph.lane = to; ph.laneX = ph.x; ph.lean = d; Sfx.play('tthOlyLane'); }
    else ph.edge = 0.25;
  }
  ph.ly = approach(ph.ly, ph.lane, dt / K.laneT);
  if (ph.ly === ph.lane) ph.lean = 0;
  // pace
  if (p.pendingAct) { p.pendingAct = false; if (!frozen) { ph.spurT = K.spurT; if (ph.v < 200) Sfx.play('tthOlyYah', p.id); } }
  ph.spurT = Math.max(0, ph.spurT - dt); ph.boostT = Math.max(0, ph.boostT - dt);
  const rein = !frozen && !!inp.left, go = !frozen && !rein && (inp.right || inp.act || ph.spurT > 0);
  const top = LK.vMax;
  let v = ph.v;
  if (frozen) v = approach(v, 0, 400 * dt);
  else if (st.idle) v = approach(v, 0, 260 * dt);
  else if (ph.spin > 0) v = approach(v, K.skidTo, 900 * dt);
  else if (rein) v = v > K.vRein ? approach(v, K.vRein, K.brake * dt) : approach(v, 0, K.decay * dt);
  else if (ph.boostT > 0) v = approach(v, K.vBoost, 1300 * dt);
  else if (go) v = approach(v, top, (v > top ? 320 : K.acc) * dt);
  else v = approach(v, 0, (v > top ? 320 : K.decay) * dt);
  if (ph.inMud) v = Math.min(v, approach(ph.v, K.mudV, 1600 * dt));
  // gold help: the horses slow for a turn by themselves
  if (ph.gold.turn[ph.driver] && ph.postD < K.zone + 60 && v > K.skidV - 30) v = Math.min(v, approach(ph.v, K.skidV - 30, K.brake * dt));
  if (go && ph.v < 40 && v >= 40 && !frozen) { Sfx.play('tthOlyNeigh'); ph.rear = 0.4; }
  ph.v = v; ph.x += v * dt;
  for (const q of st.pops) q.x += v * dt;                  // pop words ride along with the chariot
  ph.gal += dt * (v > 20 ? 5 + v / 34 : 0); ph.wheel += v * dt / 15;
  ph.wob = Math.max(0, ph.wob - dt); ph.spin = Math.max(0, ph.spin - dt); ph.edge = Math.max(0, ph.edge - dt); ph.rear = Math.max(0, ph.rear - dt);
  // hooves and dust
  if (v > 60 && (ph.hoofT -= dt * v / 420) <= 0) { ph.hoofT = 0.2; Sfx.play('tthOlyHoof'); }
  if (v > 140 && (ph.dustT -= dt) <= 0) {
    ph.dustT = ph.boostT > 0 ? 0.03 : 0.06;
    const y = tthOlyLaneY(ph.ly);
    G.particles.push({ x: ph.x - 10 + Math.random() * 90, y: y - 2 - Math.random() * 6, vx: -v * (0.5 + Math.random() * 0.4), vy: -20 - Math.random() * 50, life: 0.45, max: 0.45,
      col: ph.inMud ? 'rgba(110,74,40,0.9)' : ph.boostT > 0 ? 'rgba(190,230,150,0.9)' : 'rgba(240,222,180,0.85)', size: 4 + Math.random() * 5, grav: 60, kind: 'dot' });
  }
}

/* ---------- the grabber: hold to reach out, let go to snatch ---------- */
function tthOlyGrab(st, dt) {
  const ph = st.ph, K = TTHOLY, g = G.players[1 - ph.driver];
  g.pendingAct = false; g.pendingJump = false;
  ph.cool = Math.max(0, ph.cool - dt); ph.stunT = Math.max(0, ph.stunT - dt); ph.swipe = Math.max(0, ph.swipe - dt);
  const can = ph.cool <= 0 && ph.stunT <= 0 && (ph.mode === 'chase' || ph.mode === 'tease' || ph.mode === 'flee' || ph.mode === 'toLine' || ph.mode === 'start');
  if (g.input.act && can) {
    if (!ph.held) { ph.held = true; Sfx.play('tthOlyReach', g.id); }
    ph.reach = Math.min(1, ph.reach + dt / (ph.gold.hook ? K.reachUp * 0.25 : K.reachUp));
    // gold help: the golden hook flies out at once (a quick tap counts too) and grabs by itself while it is out
    if (ph.gold.hook && ph.reach >= K.minReach) tthOlySnatch(st, true);
  } else {
    if (ph.held) {
      ph.held = false;
      if (can && ph.reach >= K.minReach) tthOlySnatch(st, false);
      else if (can && !ph.gold.hook && ph.mode !== 'start') {
        // a tap too quick for the hook to swing out: say so; a masher at the wreath gets the gold help sooner
        tthOlyTipOnce(st, g.id, 'hold', 'HOLD ' + tthOlyAct(st, g.id) + ' a moment, then let go!', 6);
        if (++ph.miss.tap % K.gold.taps === 0 && ph.mode === 'tease' && ph.tease && ph.tease.live) { ph.miss.whiff += K.gold.whiff; tthOlyTeaseGold(st); }
      }
    }
    ph.reach = Math.max(0, ph.reach - dt / K.reachDown);
  }
}
// the branch (or sock) the hook could take right now
function tthOlyInReach(st, noSock) {
  const ph = st.ph, K = TTHOLY, hookX = ph.x + K.hookDx, tol = ph.gold.long ? 1.2 : 0.55;
  let best = null;
  for (const o of ph.obs) {
    if (o.kind !== 'branch' || o.got || o.passed || (noSock && o.sock) || Math.abs(ph.ly - o.lane) >= tol) continue;
    const d = o.x - hookX;
    if (d > -K.winBack && d < K.winFront + ph.v * K.winLead && (!best || Math.abs(d) < Math.abs(best.x - hookX))) best = o;
  }
  return best;
}
// the dangling wreath (world) and whether the hook can take it
function tthOlyWreathAt(st) {
  const ph = st.ph, t = ph.tease, c = st.thief, K = TTHOLY.tease;
  if (!t) return null;
  const pv = tthThiefPts(c).claw, th = -K.amp * Math.cos(t.phi), L = K.rope * t.out;
  return { px: pv.x, py: pv.y, x: pv.x + Math.sin(th) * L, y: pv.y + Math.cos(th) * L, th };
}
function tthOlyWreathNear(st) {
  const ph = st.ph, t = ph.tease;
  if (!t || !t.live) return false;
  const w = tthOlyWreathAt(st), tip = tthOlyTip(ph), R = ph.gold.swing ? TTHOLY.tease.goldR : TTHOLY.tease.R;
  return Math.hypot(w.x - tip.x, w.y - tip.y) < R;
}
function tthOlySnatch(st, auto) {
  const ph = st.ph, K = TTHOLY, g = G.players[1 - ph.driver], s = tthStats(st), tip = tthOlyTip(ph);
  const o = tthOlyInReach(st, auto);
  if (o) {
    o.got = true; o.gotT = 0; ph.swipe = K.swipeT; ph.cool = K.cool; ph.held = false; ph.reach = Math.min(ph.reach, 0.5);
    if (o.sock) {
      s.socks++; ph.stunT = K.sockStun; ph.v *= 0.8;
      tthBonk(st, g, { still: true, word: 'Yuck! A sock!', kind: 'sock', at: { x: tip.x, y: tip.y - 20 } });
      Sfx.play('tthOlyYuck'); tthReact(st, 'happy', 'Ha! My smelly old sock!', 1.8); st.thief.pose = 'laugh'; ph.poseT = 1.6;
      return true;
    }
    ph.got++; s.branches++; ph.boostT = K.boostT; ph.cheerT = 1.2; ph.leafT = 0.5;
    tthPop(st, tip.x, tip.y - 26, ph.got >= ph.need ? 'Caught up!' : s.branches === 1 ? 'Olive boost!' : 'Boost!', '#bff29a', 22);
    for (let k = 0; k < 9; k++) G.particles.push({ x: tip.x, y: tip.y, vx: -ph.v * 0.5 + (Math.random() - 0.5) * 260, vy: -60 - Math.random() * 200, life: 0.7, max: 0.7, col: k % 3 ? '#6fb04a' : '#bff29a', size: 4 + Math.random() * 3, grav: 500, kind: 'conf', rot: Math.random() * 6, vr: 9 });
    Sfx.play('tthOlyGrab', g.id); rumble(g.id, 0.3, 0.5, 120);
    return true;
  }
  if (tthOlyWreathNear(st)) { tthOlyTakeWreath(st); return true; }
  if (auto) return false;
  // a snatch at nothing: the arm rests a moment
  ph.swipe = K.swipeT; ph.cool = K.whiffCool; ph.reach = Math.min(ph.reach, 0.5); Sfx.play('tthOlySwish');
  if (ph.tease && ph.tease.live && ph.mode === 'tease') {
    ph.miss.whiff++; s.whiffs++;
    tthPop(st, tip.x, tip.y - 24, 'Whiff!', '#ffffff', 20);
    if (ph.miss.whiff === 1) tthReact(st, 'happy', 'Missed! Ha ha!', 1.4);
    tthOlyTeaseGold(st);
  }
  return false;
}
function tthOlyTeaseGold(st) {
  const ph = st.ph, K = TTHOLY.gold, g = 1 - ph.driver, t = ph.tease;
  if (!ph.gold.swing && (ph.miss.whiff >= K.whiff || t.T >= K.teaseT)) {
    ph.gold.swing = 1;
    tthHelp(st, 'Gold help: a slower swing and a bigger ring!', { id: g, hint: 'Let go when the ring turns gold!' });
  } else if (ph.gold.swing && !ph.gold.hook && (ph.miss.whiff >= K.whiff2 || t.T >= K.teaseT2)) {
    ph.gold.hook = true;
    tthHelp(st, 'Gold help: a golden hook! Just HOLD the button.', { id: g, hint: 'Just hold ' + tthOlyAct(st, g) + '!' });
  }
}
// the snatch at the wreath: a ribbon (laps 1 and 2), then the whole wreath
function tthOlyTakeWreath(st) {
  const ph = st.ph, K = TTHOLY, g = G.players[1 - ph.driver], s = tthStats(st), c = st.thief, tip = tthOlyTip(ph), last = ph.lap >= K.laps.length - 1;
  ph.swipe = K.swipeT; ph.cool = 0.6; ph.held = false; ph.cheerT = 2.5;
  rumble(0, 0.7, 0.7, 260); rumble(1, 0.7, 0.7, 260);
  if (!reduceMotion) G.shake = Math.max(G.shake, last ? 0.5 : 0.3);
  for (let k = 0; k < (last ? 40 : 16); k++) confetti(tip.x + (Math.random() - 0.5) * 80, tip.y);
  s.laps.push(Math.round((st.phT - ph.lapT0) * 10) / 10);
  st.hints[0] = null; st.hints[1] = null;
  if (!last) {
    ph.ribbons++; ph.mode = 'flee'; ph.modeT = 0; ph.flee = { n: tthOlyLapK(ph).junk, dropT: 1.0, endT: 0 }; ph.tease.live = false; ph.tease.yank = 0.01;
    tthPop(st, tip.x + 50, tip.y - 30, 'RRRIP! A ribbon!', '#ff8fc7', 28);
    tthNews(st, 'A ribbon! He yanked the wreath away. After him!', false, 3);
    tthReact(st, 'shocked', ph.ribbons === 1 ? 'Hey! My ribbon! Hands off!' : 'Not AGAIN! Eat my junk!', 2); c.pose = 'shock'; ph.poseT = 1.2;
    Sfx.play('tthOlyRip', g.id); Sfx.play('tthOlyCheer');
    tthCelebrate(st, 0.8);
    return;
  }
  ph.mode = 'won'; ph.modeT = 0; ph.wreathOn = true; ph.tease.live = false; ph.tease = null; ph.reach = 1;
  tthPop(st, tip.x + 40, tip.y - 34, 'THE WREATH!', C.gold, 34);
  tthReact(st, 'shocked', 'NOOO! My shiny wreath!', 2.2); c.pose = 'shock'; c.item = null;
  Sfx.play('tthOlyWin'); Sfx.play('tthOlyCheer');
  tthCelebrate(st, K.wonT + 0.3);
}

/* ---------- soft fails ---------- */
function tthOlyShards(x, y, col, n, v) {
  for (let k = 0; k < n; k++) G.particles.push({ x, y: y - 14, vx: -v * 0.4 + (Math.random() - 0.3) * 320, vy: -120 - Math.random() * 260, life: 0.7, max: 0.7, col: k % 3 ? col : '#2a2233', size: 4 + Math.random() * 5, grav: 900, kind: 'conf', rot: Math.random() * 6, vr: (Math.random() - 0.5) * 20 });
}
function tthOlyCrash(st, o, word) {
  const ph = st.ph, K = TTHOLY, s = tthStats(st), y = tthOlyLaneY(o.kind === 'rival' ? o.ly : o.lane);
  if (o.kind !== 'rival') { o.dead = true; tthOlyShards(o.x, y, o.kind === 'gear' ? '#d9a441' : o.kind === 'disc' ? '#c98a3a' : o.kind === 'hurdle' ? '#f4f0e6' : '#d9773a', 12, ph.v); }
  Sfx.play('tthOlyCrash');
  if (!tthBump(st, { word, x: Math.min(o.x, ph.x + K.front), y: y - 60, kind: o.kind })) { ph.v *= 0.85; return false; }
  ph.v = Math.max(K.crashMin, ph.v * K.crashK); ph.wob = K.wobT; ph.boostT = 0; ph.spurT = 0;
  ph.miss.crash++; s.crashes++;
  if (!reduceMotion) G.shake = Math.max(G.shake, 0.3);
  if (ph.miss.crash >= K.gold.crash && !ph.gold.clear) { ph.gold.clear = true; tthHelp(st, 'Gold help: a clearer track for this lap!'); }
  return true;
}

/* ---------- everything on the track ---------- */
function tthOlyWorld(st, dt) {
  const ph = st.ph, K = TTHOLY, s = tthStats(st), g = ph.gen, calm = tthCalm(st);
  while (g.on && g.x < st.cam.x + W + 240) tthOlyBeat(st);
  const front = ph.x + K.front, back = ph.x - K.back, hookX = ph.x + K.hookDx;
  const inLane = l => Math.abs(ph.ly - l) < 0.55;
  ph.inMud = false; ph.postD = Infinity;
  for (const o of ph.obs) {
    if (o.dead) { o.deadT = (o.deadT || 0) + dt; continue; }
    // a close call: the chariot left this thing's lane with less than K.closeD px to spare
    if (o.r && !o.by && o.kind !== 'rival' && o.x + o.r < back) {
      o.by = true;
      const was = o.lane === ph.laneFrom || (o.kind === 'hurdle' && o.lane + 1 === ph.laneFrom);
      if (was && ph.lane !== ph.laneFrom && !(o.fall > 0) && o.x - o.r - (ph.laneX + K.front) < K.closeD && st.phT - ph.closeAt > 2.5 && !calm) {
        ph.closeAt = st.phT; s.close++; ph.cheerT = Math.max(ph.cheerT, 0.7);
        tthPop(st, ph.x + 50, tthOlyLaneY(ph.ly) - 84, 'Close one!', '#ffe08a', 20); Sfx.play('tthOlyWhoa');
        if (!reduceMotion) G.shake = Math.max(G.shake, 0.08);
      }
    }
    switch (o.kind) {
      case 'amph': case 'hurdle':
        if (front > o.x - o.r && back < o.x + o.r && (inLane(o.lane) || (o.kind === 'hurdle' && inLane(o.lane + 1)))) tthOlyCrash(st, o, 'Crash!');
        break;
      case 'gear':
        if (o.fall > 0) {
          if (!calm) o.fall -= dt;
          if (o.fall <= 0) { Sfx.play('tthOlyGear'); puff(o.x, tthOlyLaneY(o.lane) - 4, 8, 'rgba(240,222,180,0.9)'); if (!reduceMotion) G.shake = Math.max(G.shake, 0.08); }
        } else if (front > o.x - o.r && back < o.x + o.r && inLane(o.lane)) tthOlyCrash(st, o, 'Clonk!');
        break;
      case 'disc':
        if (!o.roll && o.x < st.cam.x + W - 6) { o.roll = true; Sfx.play('tthOlyDisc'); }
        if (o.roll && !calm) { o.x -= K.disc.v * dt; o.rot -= dt * 9; }
        if (front > o.x - o.r && back < o.x + o.r && inLane(o.lane)) tthOlyCrash(st, o, 'Clang!');
        break;
      case 'mud':
        if (front > o.x && back < o.x + o.len && inLane(o.lane)) {
          ph.inMud = true;
          if (!o.hit) { o.hit = true; s.mud++; tthPop(st, front - 30, tthOlyLaneY(o.lane) - 70, 'Splat! Mud!', '#c79a6a', 20); Sfx.play('tthOlySplat'); }
        }
        break;
      case 'rival': tthOlyRival(st, o, dt, calm); break;
      case 'post':
        if (!o.done) {
          ph.postD = Math.min(ph.postD, o.x - front);
          if (front >= o.x) {
            o.done = true;
            if (ph.v > K.skidV) {
              Sfx.play('tthOlySkid');
              if (tthBump(st, { word: 'Skid!', x: ph.x + 40, y: tthOlyLaneY(ph.ly) - 70, kind: 'skid' })) {
                ph.spin = K.skidT; ph.boostT = 0; ph.spurT = 0; s.skids++;
                if (!reduceMotion) G.shake = Math.max(G.shake, 0.35);
                if (++ph.skids[ph.driver] >= K.gold.skid && !ph.gold.turn[ph.driver]) { ph.gold.turn[ph.driver] = true; tthHelp(st, 'Gold help: the horses slow down for turns by themselves.'); }
              }
            } else { tthPop(st, ph.x + 40, tthOlyLaneY(ph.ly) - 76, 'Clean turn!', '#bff29a', 20); ph.cheerT = Math.max(ph.cheerT, 0.8); Sfx.play('tthDing'); }
          }
        }
        break;
      case 'line':
        if (!o.done && front >= o.x) { o.done = true; tthOlyLapLine(st); }
        break;
      case 'branch':
        if (o.got) { o.gotT += dt; break; }
        if (!o.passed && o.x < hookX - K.winBack - 4) {
          o.passed = true;
          if (!o.sock && ph.mode === 'chase') {
            s.missed++;
            const mine = Math.abs(ph.ly - o.lane) < (ph.gold.long ? 1.2 : 0.55), grab = 1 - ph.driver;
            if (mine) {
              tthPop(st, hookX - 40, tthOlyLaneY(ph.ly) - K.hookUp - 20, 'Missed!', '#ffffff', 18);
              if (++ph.miss.hook >= K.gold.hook && !ph.gold.hook) {
                ph.gold.hook = true;
                tthHelp(st, 'Gold help: a golden hook! Just HOLD the button.', { id: grab, hint: 'Just hold ' + tthOlyAct(st, grab) + '!' });
              } else if (!ph.gold.hook) tthOlyTipOnce(st, grab, 'late', 'Hold ' + tthOlyAct(st, grab) + ' early, let go AT the branch!', 7);
            } else if (++ph.miss.lane >= K.gold.lane && !ph.gold.long) {
              ph.gold.long = true;
              tthHelp(st, 'Gold help: a long golden hook! It reaches the next lane too.');
            } else if (!ph.gold.long) tthOlyTipOnce(st, ph.driver, 'lane', 'Steer under the olive branches! ' + tthKey(ph.driver, 'up') + ' / ' + tthKey(ph.driver, 'down'), 7, { cpu: null });
          }
        }
        break;
    }
  }
  if ((ph.cullT -= dt) <= 0) { ph.cullT = 0.5; const lo = st.cam.x - 320; ph.obs = ph.obs.filter(o => o.x + (o.len || 0) > lo && !(o.dead && o.deadT > 0.5)); }
}
// a rival chariot: slower than a gallop, weaves with a 0.75 s tell, never into a chariot already beside it
function tthOlyRival(st, o, dt, calm) {
  const ph = st.ph, K = TTHOLY, RK = K.rival;
  const overlap = o.x - K.back < ph.x + K.front + 6 && o.x + K.front > ph.x - K.back - 6;
  if (!calm) {
    o.shove = Math.max(0, o.shove - dt); o.wob = Math.max(0, o.wob - dt);
    const v = o.shove > 0 ? 470 : o.v;
    o.x += v * dt; o.gal += dt * (5 + v / 34); o.wheel += v * dt / 15;
    const seen = o.x < st.cam.x + W - 40 && o.x > st.cam.x + 40;
    if (o.tell > 0) {
      if ((o.tell -= dt) <= 0) {
        const to = o.lane + o.dir;
        if (overlap && Math.abs(ph.ly - to) < 0.9) o.next = 0.5; else o.lane = to;
        o.dir = 0;
      }
    } else if (seen && o.ly === o.lane && (o.next -= dt) <= 0) {
      o.next = RK.every[0] + tthRand() * (RK.every[1] - RK.every[0]);
      const dir = o.lane === 0 ? 1 : o.lane === 2 ? -1 : tthRand() < 0.5 ? -1 : 1;
      if (!(overlap && Math.abs(ph.ly - (o.lane + dir)) < 0.9)) { o.dir = dir; o.tell = RK.tell; }
    }
    o.ly = approach(o.ly, o.lane, dt / RK.move);
  }
  if (overlap && Math.abs(ph.ly - o.ly) < 0.62) {
    const side = Math.abs(ph.x - o.x) < 110;
    if (tthOlyCrash(st, o, 'Bump!')) { ph.v = Math.min(ph.v, o.v - 50); o.wob = 0.6; }
    o.shove = Math.max(o.shove, RK.shove);
    if (side && ph.lane !== ph.laneFrom && Math.abs(o.ly - ph.laneFrom) > 0.5) ph.lane = ph.laneFrom;   // bounced back to its own lane
  }
}

/* ---------- the lap line: jobs swap ---------- */
function tthOlyLapLine(st) {
  const ph = st.ph, K = TTHOLY;
  ph.lap++; ph.driver = 1 - ph.driver;
  const LK = tthOlyLapK(ph);
  ph.got = 0; ph.need = LK.need; ph.mode = 'chase'; ph.modeT = 0; ph.chaseT = 0; ph.freeT = 0; ph.lapT0 = st.phT;
  ph.miss = { hook: 0, lane: 0, crash: 0, whiff: 0, tap: 0 };
  ph.gold.hook = false; ph.gold.long = false; ph.gold.clear = false; ph.gold.swing = 0; ph.gold.crowd = false;
  ph.gen = tthOlyNewGen(ph.x + 1150, LK);
  ph.held = false; ph.reach = 0; ph.cool = 0.4; ph.spurT = 0; ph.prevUp = true; ph.prevDn = true; ph.swapA = 1; ph.tease = null; ph.tipT = {};
  tthSwap(st);
  tthNews(st, 'Lap ' + (ph.lap + 1) + ' of 3: swap reins!', false, 2.8);
  ph.newsQ = { text: LK.fact, at: st.phT + 3 };
  ph.cheerT = 1.5; Sfx.play('tthOlyHorn');
  ph.tauntT = 5; ph.hintT = 0;
}

/* ---------- the flow: chase, tease, flee, lap line, the win; the Thief ---------- */
function tthOlyFlow(st, dt) {
  const ph = st.ph, K = TTHOLY, c = st.thief, LK = tthOlyLapK(ph), s = tthStats(st);
  ph.modeT += dt;
  ph.cheerT = Math.max(0, ph.cheerT - dt); ph.poseT = Math.max(0, ph.poseT - dt); ph.swapA = Math.max(0, ph.swapA - dt / 0.5); ph.leafT = Math.max(0, ph.leafT - dt);
  if (ph.newsQ && st.phT >= ph.newsQ.at && ph.mode === 'chase') { tthNews(st, ph.newsQ.text, false, 5); ph.newsQ = null; }   // the lap's history fact, after "swap reins!"
  if (ph.mode === 'start' && ph.v > 30) { ph.mode = 'chase'; ph.modeT = 0; ph.gen = tthOlyNewGen(ph.x + 1000, LK); ph.lapT0 = st.phT; Sfx.play('tthOlyHorn'); ph.cheerT = 1.5; }
  if (ph.mode === 'chase') {
    if (!st.idle) ph.chaseT += dt;
    // gold help for a long lap: the crowd throws a branch now and then (only to a chariot that is moving)
    if (ph.chaseT > K.gold.chaseT && ph.v > 100 && !st.idle && ph.got < ph.need && (ph.freeT += dt) >= K.gold.chaseEvery) {
      ph.freeT = 0; ph.got++; ph.leafT = 0.5; ph.cheerT = 1;
      if (!ph.gold.crowd) { ph.gold.crowd = true; tthHelp(st, 'Gold help: the crowd throws you olive branches!'); }
      else { tthPop(st, ph.x + 40, tthOlyLaneY(ph.ly) - 120, 'From the crowd!', C.gold, 20); Sfx.play('tthDing'); }
    }
    if (ph.got >= ph.need) {
      ph.mode = 'tease'; ph.modeT = 0; ph.gen.on = false; ph.miss.whiff = 0; ph.miss.tap = 0;
      ph.tease = { phi: Math.PI, out: 0, live: false, lane: ph.lane, ly: ph.lane, lag: 0, wT: 2.6, tell: 0, dir: 0, T: 0, yank: 0, hintT: 0 };
      c.item = null;
      tthSay(st, ['Want it? Come and get it!', 'Look! Shiny! Can\'t reach!', 'Last lap! You\'ll NEVER get it!'][Math.min(ph.lap, 2)], 2.4);
      tthNews(st, 'You caught up! Stay under him and snatch the wreath!', false, 3.4);
      Sfx.play('tthOlyTease');
    } else if (!tthCalm(st) && (ph.tauntT -= dt) <= 0 && !st.say) {
      ph.tauntT = 9 + tthRand() * 4;
      tthSay(st, TTHOLY_TAUNTS[ph.tauntN++ % TTHOLY_TAUNTS.length], 2.2); c.pose = 'laugh'; ph.poseT = 1.5;
    }
  }
  if (ph.mode === 'tease') {
    const t = ph.tease, TK = K.tease;
    if (!st.idle) t.T += dt;
    t.out = Math.min(1, t.out + dt / 0.8);
    const period = LK.swing * (ph.gold.swing ? TK.goldSlow : 1);
    t.phi = (t.phi + dt * 2 * Math.PI / period) % (2 * Math.PI);
    // he drifts ahead of a slow chariot, and comes back to a fast one
    t.lag = clamp(t.lag + (TK.keepV - ph.v) * dt * (ph.v < TK.keepV ? 0.9 : 1.6), 0, TK.lagMax);
    // from lap 2: he weaves to another lane (an arrow first)
    if (LK.weave && t.live && !tthCalm(st)) {
      if (t.tell > 0) { if ((t.tell -= dt) <= 0) { t.lane += t.dir; t.dir = 0; Sfx.play('tthOlyLane'); } }
      else if (t.ly === t.lane && (t.wT -= dt) <= 0) {
        t.wT = LK.weave + tthRand() * 1.2;
        t.dir = t.lane === 0 ? 1 : t.lane === 2 ? -1 : tthRand() < 0.5 ? -1 : 1; t.tell = TK.tell;
        Sfx.play('tthTick');
      }
    }
    t.ly = approach(t.ly, t.lane, dt / TK.move);
    if (t.live && !ph.gold.hook && (t.T >= K.gold.teaseT && !ph.gold.swing || t.T >= K.gold.teaseT2)) tthOlyTeaseGold(st);
  }
  if (ph.mode === 'flee') {
    const f = ph.flee;
    if (ph.tease) { ph.tease.yank += dt; if (ph.tease.yank > 0.5) { ph.tease = null; c.item = st.era.loot; } }
    if (!tthCalm(st) && ph.v > 60) {
      if (f.n > 0 && (f.dropT -= dt) <= 0) {
        f.dropT = K.gear.every; f.n--;
        const x = ph.x + K.front + Math.max(ph.v, 260) * K.gear.fall + 50;
        const near = ph.obs.filter(o => o.kind === 'gear' && Math.abs(o.x - x) < 330).map(o => o.lane);
        let lane = tthRand() < 0.6 ? ph.lane : Math.floor(tthRand() * 3);
        if (new Set(near.concat(lane)).size >= 3) lane = near[0];   // always one lane left open
        ph.obs.push({ kind: 'gear', x, lane, r: 16, fall: K.gear.fall, rot: tthRand() * 6 });
        Sfx.play('tthOlyDrop'); c.pose = 'laugh'; ph.poseT = 0.5;
      }
      if (f.n <= 0 && (f.endT += dt) > 1.3) {
        ph.mode = 'toLine'; ph.modeT = 0; ph.flee = null;
        ph.obs.push({ kind: 'line', x: st.cam.x + W + 420, lane: -1, n: ph.lap + 2 });
      }
    }
  }
  if (ph.mode === 'won') {
    if (ph.modeT >= K.wonT && ph.v < 8) {
      ph.mode = 'done';
      tthPhaseDone(st, { say: 'Bah! Real winners got OLIVE leaves anyway!', portal: { x: st.cam.x + 800, y: 196 } });
      ph.wreathOn = false;
      return;
    }
    if ((G.tickN % 7) === 0) confetti(st.cam.x + 80 + Math.random() * (W - 160), 200 + Math.random() * 60);
  }
  tthOlyThief(st, dt);
}
// where the Thief flies (world coords): ahead while they chase, low over the horses when he teases
function tthOlyThief(st, dt) {
  const ph = st.ph, K = TTHOLY, c = st.thief, t = ph.tease, k = 1 - Math.exp(-dt * 4.5);
  let tx, ty, s = 0.66, claw = 0.3, face = 1, flame = 1;
  const near = clamp(ph.got / Math.max(1, ph.need), 0, 1);
  if (ph.mode === 'tease' && t) {
    const TK = K.tease, tip = tthOlyTip({ x: ph.x, ly: t.ly });
    s = TK.s; claw = 1; face = -1; flame = 0.6;
    tx = tip.x + Math.sin(TK.amp) * TK.rope + 16 * s + t.lag;
    ty = tip.y - Math.cos(TK.amp) * TK.rope - 52 * s;
    if (!t.live && Math.abs(c.x - tx) < 14 && Math.abs(c.y - ty) < 10 && t.out >= 1) t.live = true;
  } else if (ph.mode === 'flee') { tx = st.cam.x + 850; ty = 176; flame = 1.5; s = 0.62; }
  else if (ph.mode === 'won' || ph.mode === 'done') { tx = st.cam.x + 700; ty = 226; face = -1; flame = 0.5; }
  else { tx = st.cam.x + 850 - near * 150; ty = 232 + Math.sin(ph.t * 1.3) * 9; s = 0.62 + near * 0.06; if (st.say) face = -1; }
  c.x += ph.v * dt; c.x += (tx - c.x) * k; c.y += (ty - c.y) * k;
  c.s += (s - c.s) * k; c.claw += (claw - c.claw) * k; c.face = face; c.flame = flame; c.jet = true;
  if (ph.mode !== 'tease' && ph.mode !== 'won' && !ph.tease && !st.cut) c.item = st.era.loot;
  if (ph.poseT <= 0) c.pose = ph.mode === 'tease' ? (t && t.tell > 0 ? 'point' : 'laugh') : ph.mode === 'won' ? 'shock' : st.say ? 'point' : 'idle';
}

/* ---------- camera, seats, hints ---------- */
function tthOlySeat(ph, id) {
  const drv = id === ph.driver, to = drv ? 6 : -17, from = drv ? -17 : 6, a = ph.swapA > 0 ? 1 - ph.swapA : 1, e = a * a * (3 - 2 * a);
  return { dx: from + (to - from) * e, hop: ph.swapA > 0 ? Math.sin(a * Math.PI) * (drv ? 26 : 12) : 0 };
}
function tthOlyPlace(st, dt = DT) {
  const ph = st.ph, K = TTHOLY;
  const back = clamp((ph.v - 320) / 370, 0, 1) * 46;       // a fast chariot sits a little further back: more view ahead
  ph.camBack += (back - ph.camBack) * (1 - Math.exp(-dt * 3));
  st.cam.x = ph.x - K.chX + ph.camBack; st.cam.y = 0;
  const y = tthOlyLaneY(ph.ly);
  for (const p of G.players) {
    const seat = tthOlySeat(ph, p.id);
    p.x = ph.x + seat.dx - p.w / 2; p.y = y - K.floor - p.h - 3 - seat.hop;
    if (G.introT > 0 && p.id !== ph.driver) p.y -= 22;      // the era card: the two name tags stack instead of overlapping
    p.vx = 0; p.vy = 0; p.grounded = true; p.face = 1; p.alive = true; p.stun = 0; p.sx = 1; p.sy = 1;
    if ((p.blinkT = (p.blinkT || 0) - dt) <= 0) { p.blinkT = 2 + Math.random() * 2.5; p.blink = 0.12; } else p.blink = Math.max(0, (p.blink || 0) - dt);
  }
}
function tthOlyHints(st, dt) {
  const ph = st.ph, K = TTHOLY, d = ph.driver, g = 1 - d;
  if (tthCalm(st)) return;
  const R = tthKey(d, 'right'), U = tthKey(d, 'up'), Dn = tthKey(d, 'down');
  ph.stallT = ph.v < 60 && ph.mode !== 'won' && ph.mode !== 'done' ? ph.stallT + dt : 0;
  if (ph.mode === 'start') {
    tthOlyTipOnce(st, d, 'go', tthDev(d) === 'touch' ? 'Gallop: hold ' + R + ' or the gallop button!' : 'Hold ' + R + ' to gallop!', 5, { cpu: 'I\'ll drive!', life: 3.4 });
    tthOlyTipOnce(st, g, 'grab', 'Hold ' + tthOlyAct(st, g) + ', then let go to grab!', 5, { cpu: 'I\'ll grab!', life: 3.4 });
    return;
  }
  if (ph.stallT > 2.2) tthOlyTipOnce(st, d, 'go', 'Hold ' + R + ' to gallop!', 5);
  if (ph.mode === 'chase') {
    if (ph.modeT > 1.2) tthOlyTipOnce(st, d, 'lanes', U + ' / ' + Dn + ': change lanes', 999, { cpu: 'I\'ll drive!' });
    if (ph.modeT > 1.2) tthOlyTipOnce(st, g, 'how', 'Hold ' + tthOlyAct(st, g) + ', let go at a branch!', 999, { cpu: 'I\'ll grab!', life: 4 });
    // the turning post is coming and the chariot is too fast
    if (ph.postD < 760 && ph.postD > 60 && ph.v > K.skidV && !ph.gold.turn[d]) tthOlyTipOnce(st, d, 'turn', 'Turn! Hold ' + tthKey(d, 'left') + ' to rein in!', 4, { cpu: 'Whoa! Slow for the turn!', life: 2.2 });
    // the first socks
    const sock = ph.obs.find(o => o.kind === 'branch' && o.sock && !o.passed && !o.got && o.x - ph.x < 620 && o.x > ph.x);
    if (sock) tthOlyTipOnce(st, g, 'sock', 'A smelly sock! Don\'t grab it!', 30, { life: 2.2 });
  }
  if (ph.mode === 'tease' && ph.tease) {
    const t = ph.tease;
    if (t.live) tthOlyTipOnce(st, g, 'wreath', ph.gold.hook ? 'Just hold ' + tthOlyAct(st, g) + '!' : 'Hold ' + tthOlyAct(st, g) + ', let go at NOW!', 9, { life: 3.6, cpu: 'I\'ll snatch it!' });
    if (t.lag > 70) tthOlyTipOnce(st, d, 'keep', 'Faster! Hold ' + R + '!', 5, { cpu: null });
    else if (Math.abs(t.lane - ph.lane) >= 1 && t.tell <= 0 && (t.hintT += dt) > 1) tthOlyTipOnce(st, d, 'follow', 'Follow him! ' + (t.lane < ph.lane ? U : Dn), 4, { cpu: null });
    else if (t.live) { tthOlyTipOnce(st, d, 'under', 'Gallop: stay under him!', 12, { cpu: 'I\'ll stay under him!' }); }
    if (Math.abs(t.lane - ph.lane) < 1) t.hintT = 0;
  }
  if (ph.mode === 'flee' && ph.flee && ph.flee.n > 0) tthOlyTipOnce(st, d, 'junk', 'Junk is falling! Dodge the shadows!', 30, { cpu: null, life: 2.4 });
}

/* ---------- art: tiles drawn once ---------- */
function tthOlyArt() {
  if (tthOlyTiles) return tthOlyTiles;
  const mk = (w, h) => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; return cv; };
  const A = { crowd: [mk(480, 104), mk(480, 104)], sand: mk(512, 222), wall: mk(240, 34) };
  // the crowd on the grassy bank (two frames: arms down / arms up)
  const cols = ['#f4efe2', '#e9d9b8', '#c8553d', '#4a86c8', '#8a9a4a', '#f2b36a', '#b56fb0', '#ffffff'];
  A.crowd.forEach((cv, f) => {
    const g = cv.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, 104); gr.addColorStop(0, '#9cba5e'); gr.addColorStop(1, '#7fa24a');
    g.fillStyle = gr; g.fillRect(0, 0, 480, 104);
    for (let r = 0; r < 5; r++) for (let k = 0; k < 20; k++) {
      const h = hash(k + r * 31, 7 + r), x = k * 24 + (r % 2 ? 12 : 0) + (h % 7) - 3, y = 22 + r * 18 + ((h >>> 4) % 5), up = ((h >>> 8) % 3 === 0) === (f === 0);
      const col = cols[(h >>> 12) % cols.length], skin = ['#f3d1a8', '#d9a676', '#b98556'][(h >>> 16) % 3];
      g.fillStyle = col; g.strokeStyle = 'rgba(28,26,54,0.65)'; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(x - 8, y + 16); g.lineTo(x - 7, y + 4); g.quadraticCurveTo(x, y - 1, x + 7, y + 4); g.lineTo(x + 8, y + 16); g.closePath(); g.fill(); g.stroke();
      if (up) { g.strokeStyle = skin; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(x - 6, y + 5); g.lineTo(x - 10, y - 8); g.moveTo(x + 6, y + 5); g.lineTo(x + 10, y - 8); g.stroke(); }
      g.fillStyle = skin; g.strokeStyle = 'rgba(28,26,54,0.65)'; g.lineWidth = 1.5; g.beginPath(); g.arc(x, y - (up ? 3 : 1), 6, 0, Math.PI * 2); g.fill(); g.stroke();
      g.fillStyle = ['#3a2a1a', '#1c1a36', '#7a5a2a', '#c9c2b2'][(h >>> 20) % 4]; g.beginPath(); g.arc(x, y - (up ? 5 : 3), 6, Math.PI, Math.PI * 2); g.fill();
    }
  });
  // sand: speckles and old wheel ruts
  {
    const g = A.sand.getContext('2d');
    g.fillStyle = '#ecd29a'; g.fillRect(0, 0, 512, 222);
    for (let k = 0; k < 260; k++) {
      const h = hash(k, 91), x = h % 512, y = (h >>> 9) % 222, r = 1 + ((h >>> 18) % 3);
      g.fillStyle = (h >>> 22) % 3 ? 'rgba(196,158,96,0.55)' : 'rgba(255,244,214,0.7)'; g.beginPath(); g.ellipse(x, y, r * 1.6, r * 0.7, 0, 0, Math.PI * 2); g.fill();
    }
    g.strokeStyle = 'rgba(196,158,96,0.35)'; g.lineWidth = 3;
    for (const y of [30, 52, 94, 116, 158, 180]) { g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= 512; x += 64) g.lineTo(x, y + Math.sin(x * 0.0245 + y) * 2.5); g.stroke(); }
  }
  // the marble wall with a meander band
  {
    const g = A.wall.getContext('2d');
    g.fillStyle = '#f6eedb'; g.fillRect(0, 0, 240, 34);
    g.fillStyle = '#e2d6ba'; g.fillRect(0, 28, 240, 6); g.fillStyle = '#fffaf0'; g.fillRect(0, 0, 240, 4);
    g.strokeStyle = '#c8553d'; g.lineWidth = 3; g.lineJoin = 'miter';
    for (let x = 0; x < 240; x += 24) { g.beginPath(); g.moveTo(x, 24); g.lineTo(x, 9); g.lineTo(x + 18, 9); g.lineTo(x + 18, 19); g.lineTo(x + 8, 19); g.lineTo(x + 8, 14); g.moveTo(x, 24); g.lineTo(x + 24, 24); g.stroke(); }
  }
  return (tthOlyTiles = A);
}
function tthOlyScenery(st, cam, t) {
  const A = tthOlyArt(), ph = st.ph, K = TTHOLY;
  tthSky('#2f8fe0', '#cdeafc', 0, 210);
  ctx.fillStyle = 'rgba(255,246,200,0.35)'; circle(150, 96, 54); ctx.fill(); ctx.fillStyle = '#fff6c4'; circle(150, 96, 32); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  for (const [cx, cy, s] of [[420, 60, 1], [860, 110, 0.8], [1240, 76, 1.1]]) { const x = ((cx - cam * 0.03) % 1400 + 1400) % 1400 - 200; circle(x, cy, 20 * s); ctx.fill(); circle(x + 24 * s, cy + 6, 15 * s); ctx.fill(); circle(x - 22 * s, cy + 7, 13 * s); ctx.fill(); }
  // far hills with cypress trees (the Hill of Kronos)
  const o1 = cam * 0.07;
  ctx.fillStyle = '#8fc49a'; ctx.beginPath(); ctx.moveTo(0, 220);
  for (let x = 0; x <= W; x += 40) ctx.lineTo(x, 168 - Math.sin((x + o1) * 0.0052) * 34 - Math.sin((x + o1) * 0.013) * 10);
  ctx.lineTo(W, 220); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#4f8f6a';
  for (let k = 0; k < 9; k++) {
    const wx = Math.floor(o1 / 130) * 130 + k * 130 + 40, x = wx - o1, y = 172 - Math.sin(wx * 0.0052) * 34 - Math.sin(wx * 0.013) * 10, hh = 22 + (hash(Math.floor(wx / 130), 3) % 14);
    ctx.beginPath(); ctx.moveTo(x - 6, y); ctx.quadraticCurveTo(x, y - hh * 1.9, x + 6, y); ctx.closePath(); ctx.fill();
  }
  // a temple now and then
  const o2 = cam * 0.16, tw = 1500;
  for (let k = -1; k < 2; k++) {
    const x = Math.floor(o2 / tw) * tw + k * tw + 620 - o2;
    if (x < -260 || x > W + 40) continue;
    ctx.fillStyle = '#f3ead2'; ctx.strokeStyle = 'rgba(28,26,54,0.55)'; ctx.lineWidth = 2;
    ctx.fillRect(x, 194, 220, 10); ctx.strokeRect(x, 194, 220, 10);
    for (let c2 = 0; c2 < 7; c2++) { ctx.fillRect(x + 10 + c2 * 31, 136, 13, 58); ctx.strokeRect(x + 10 + c2 * 31, 136, 13, 58); }
    ctx.fillRect(x + 2, 126, 216, 10); ctx.strokeRect(x + 2, 126, 216, 10);
    ctx.fillStyle = '#e8c9a0'; ctx.beginPath(); ctx.moveTo(x - 2, 126); ctx.lineTo(x + 110, 96); ctx.lineTo(x + 222, 126); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#c8553d'; ctx.beginPath(); ctx.moveTo(x + 40, 122); ctx.lineTo(x + 110, 104); ctx.lineTo(x + 180, 122); ctx.closePath(); ctx.fill();
  }
  // the grassy bank full of people (they hop when something big happens)
  const o3 = cam * 0.5, f = Math.floor(t * (ph.cheerT > 0 ? 7 : 2.2)) % 2, hop = ph.cheerT > 0 ? Math.abs(Math.sin(t * 14)) * 4 : 0;
  ctx.fillStyle = '#7fa24a'; ctx.fillRect(0, 204, W, 90);
  for (let x = -(((o3 % 480) + 480) % 480); x < W; x += 480) ctx.drawImage(A.crowd[f], x, 196 - hop);
  // flags along the top of the bank
  for (let k = 0; k < 5; k++) {
    const wx = Math.floor(o3 / 260) * 260 + k * 260 + 130, x = wx - o3, col = ['#c8553d', '#4a86c8', '#ffd23f'][Math.floor(wx / 260) % 3];
    ctx.strokeStyle = '#6b4a2a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, 202); ctx.lineTo(x, 160); ctx.stroke();
    ctx.fillStyle = col; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, 161); ctx.quadraticCurveTo(x + 14, 158 + Math.sin(t * 6 + k) * 3, x + 26, 168 + Math.sin(t * 6 + k + 1) * 3); ctx.lineTo(x, 177); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  // the wall and its columns (they fly past with the track)
  for (let x = -(((cam % 240) + 240) % 240); x < W; x += 240) ctx.drawImage(A.wall, x, 286);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(0, 286); ctx.lineTo(W, 286); ctx.moveTo(0, 320); ctx.lineTo(W, 320); ctx.stroke();
  for (let k = 0; k < 5; k++) {
    const wx = Math.floor(cam / 300) * 300 + k * 300 + 150, x = wx - cam;
    if (x < -30 || x > W + 30) continue;
    ctx.fillStyle = '#fffaf0'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
    rr(x - 13, 226, 26, 8, 3); ctx.fill(); ctx.stroke();
    ctx.fillRect(x - 9, 234, 18, 78); ctx.strokeRect(x - 9, 234, 18, 78);
    ctx.strokeStyle = 'rgba(28,26,54,0.25)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x - 3, 238); ctx.lineTo(x - 3, 308); ctx.moveTo(x + 3, 238); ctx.lineTo(x + 3, 308); ctx.stroke();
    ctx.fillStyle = '#e8dcc0'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; rr(x - 14, 310, 28, 10, 3); ctx.fill(); ctx.stroke();
  }
  // the sand and its lanes
  for (let x = -(((cam % 512) + 512) % 512); x < W; x += 512) ctx.drawImage(A.sand, x, K.trackTop + 2);
  ctx.fillStyle = 'rgba(160,120,60,0.28)'; ctx.fillRect(0, K.trackTop + 2, W, 8);
  ctx.fillStyle = 'rgba(255,250,232,0.75)';
  for (const y of [K.laneY[0] + 30, K.laneY[1] + 30]) for (let x = -(((cam % 140) + 140) % 140); x < W; x += 140) { rr(x, y - 3, 78, 6, 3); ctx.fill(); }
  ctx.fillStyle = '#d9b877'; ctx.fillRect(0, 522, W, 18); ctx.fillStyle = 'rgba(28,26,54,0.25)'; ctx.fillRect(0, 520, W, 3);
}
// things painted flat on the sand (world coords): mud, the turning zone and line, the lap line, rings and shadows
function tthOlyGround(st) {
  const ph = st.ph, K = TTHOLY, cam = st.cam.x, t = G.clock;
  for (const o of ph.obs) {
    if (o.x < cam - 500 || o.x > cam + W + 500) continue;
    if (o.kind === 'mud') {
      const y = tthOlyLaneY(o.lane) - 2, cx = o.x + o.len / 2;
      ctx.fillStyle = '#6e4a28'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.ellipse(cx, y - 4, o.len / 2, 21, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#8a6238'; ctx.beginPath(); ctx.ellipse(cx - 24, y - 9, o.len / 4, 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(cx - 40, y - 12, 14, 3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#8a6238'; for (const [dx, r] of [[-o.len / 2 - 8, 6], [o.len / 2 + 10, 5], [10, 4]]) { circle(cx + dx, y + 12 + (r % 2) * 3, r); ctx.fill(); }
    } else if (o.kind === 'post') {
      const x0 = o.x - K.zone, y0 = K.trackTop + 8, y1 = 518;
      // the "rein in" zone: chevrons pointing back, then the line
      ctx.save(); ctx.globalAlpha = o.done ? 0.35 : 1;
      ctx.fillStyle = 'rgba(200,85,61,0.16)'; ctx.fillRect(x0, y0, K.zone, y1 - y0);
      ctx.strokeStyle = 'rgba(200,85,61,0.75)'; ctx.lineWidth = 9; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      for (let k = 0; k < 4; k++) for (const ly of K.laneY) { const x = x0 + 50 + k * 104; ctx.beginPath(); ctx.moveTo(x + 22, ly - 24); ctx.lineTo(x, ly - 6); ctx.lineTo(x + 22, ly + 12); ctx.stroke(); }
      ctx.fillStyle = '#ffffff'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.fillRect(o.x - 7, y0, 14, y1 - y0); ctx.strokeRect(o.x - 7, y0, 14, y1 - y0);
      ctx.restore();
    } else if (o.kind === 'line') {
      const y0 = K.trackTop + 8, y1 = 518;
      for (let r = 0; r < 10; r++) for (let c2 = 0; c2 < 2; c2++) { ctx.fillStyle = (r + c2) % 2 ? '#ffffff' : '#c8553d'; ctx.fillRect(o.x - 14 + c2 * 14, y0 + r * (y1 - y0) / 10, 14, (y1 - y0) / 10); }
      ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.strokeRect(o.x - 14, y0, 28, y1 - y0);
    } else if (o.kind === 'branch' && !o.got && !o.passed) {
      // a ring on the sand under the branch: which lane to be in
      const y = tthOlyLaneY(o.lane) - 4;
      ctx.strokeStyle = o.sock ? 'rgba(150,90,170,0.7)' : 'rgba(90,160,60,0.9)'; ctx.lineWidth = 4; ctx.setLineDash([10, 8]); ctx.lineDashOffset = -t * 30;
      ctx.beginPath(); ctx.ellipse(o.x, y, 30, 10, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    } else if (o.kind === 'gear' && o.fall > 0) {
      // where a falling gear will land: a growing shadow and a "!"
      const y = tthOlyLaneY(o.lane) - 4, k = 1 - o.fall / K.gear.fall;
      ctx.fillStyle = 'rgba(28,26,54,' + (0.15 + 0.3 * k) + ')'; ctx.beginPath(); ctx.ellipse(o.x, y, 12 + 16 * k, 4 + 6 * k, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#ff5f6d'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(o.x, y, 34 - 6 * k, 12 - 2 * k, 0, 0, Math.PI * 2); ctx.stroke();
    } else if (o.warn && o.x - o.r > cam + W) {
      // a one-way row (two lanes blocked) is coming: "!" at the edge of each blocked lane, K.rowWarn s early
      if ((o.x - o.r - (cam + W)) / Math.max(ph.v, 200) < K.rowWarn) for (let l = o.lane; l <= o.lane + (o.kind === 'hurdle' ? 1 : 0); l++) bigText('!', cam + W - 26, tthOlyLaneY(l) - 30 - Math.abs(Math.sin(t * 12)) * 5, 34, '#ff5f6d', 1);
    } else if (o.kind === 'disc' && !o.roll) {
      // a discus is about to roll in: "!" at the edge of its lane
      const wd = (o.x - (cam + W)) / (ph.v + K.disc.v + 1);
      if (wd < K.disc.warn + 0.4) bigText('!', cam + W - 26, tthOlyLaneY(o.lane) - 30 - Math.abs(Math.sin(t * 12)) * 5, 34, '#ff5f6d', 1);
    }
  }
}

/* ---------- art: horses and chariots ---------- */
function tthOlyHorse(x, y, gal, run, col, dk, mane, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const bob = -Math.abs(Math.sin(gal)) * 5 * run, tilt = Math.sin(gal) * 0.07 * run;
  const leg = (hx, a, c2) => {
    const sw = Math.sin(a) * 18 * run, lift = Math.max(0, Math.cos(a)) * 10 * run, fx = hx + sw, fy = -3 - lift;
    for (const [w, sc] of [[8, C.ink], [4.5, c2]]) { ctx.strokeStyle = sc; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(hx, -24 + bob); ctx.quadraticCurveTo(hx + sw * 0.25 + 3, -12 + bob * 0.5, fx, fy); ctx.stroke(); }
    ctx.fillStyle = C.ink; rr(fx - 4, fy - 1, 9, 5, 2); ctx.fill();
  };
  leg(-19, gal + 0.55, dk); leg(13, gal + Math.PI + 0.55, dk);
  // tail
  ctx.strokeStyle = C.ink; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(-25, -36 + bob); ctx.quadraticCurveTo(-40 - run * 8, -38 + bob, -46 - run * 10, -24 + Math.sin(gal * 2) * 4); ctx.stroke();
  ctx.strokeStyle = mane; ctx.lineWidth = 5.5; ctx.stroke();
  ctx.save(); ctx.translate(0, bob); ctx.rotate(tilt);
  ctx.fillStyle = col; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.ellipse(-2, -31, 27, 12.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // neck and head
  ctx.beginPath(); ctx.moveTo(10, -40); ctx.quadraticCurveTo(21, -52, 25, -63); ctx.lineTo(30, -70); ctx.lineTo(32, -62); ctx.quadraticCurveTo(44, -58, 48, -49);
  ctx.quadraticCurveTo(49, -43, 42, -43); ctx.quadraticCurveTo(35, -47, 32, -45); ctx.quadraticCurveTo(29, -34, 23, -25); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(16, -33, 9, 8, 0, 0, Math.PI * 2); ctx.fill();   // (the join of neck and chest)
  // mane
  ctx.fillStyle = mane; ctx.beginPath(); ctx.moveTo(26, -64); ctx.quadraticCurveTo(14 - run * 6, -60, 9 - run * 8, -42); ctx.quadraticCurveTo(16, -46, 20, -54); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = C.ink; circle(36, -56, 2); ctx.fill(); circle(45, -47, 1.1); ctx.fill();
  // harness
  ctx.strokeStyle = '#c8553d'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(8, -42); ctx.quadraticCurveTo(14, -32, 12, -21); ctx.stroke();
  ctx.restore();
  leg(-15, gal + 0.05, col); leg(17, gal + Math.PI + 0.05, col);
  ctx.restore();
}
// a chariot and its two horses; (x, y): the car's centre on the ground. o: { gal, run, rot, wheel, pal, riders(), rear }
function tthOlyRig(x, y, o) {
  const P = o.pal;
  ctx.save(); ctx.translate(x, y); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.fillStyle = 'rgba(70,45,20,0.24)'; ctx.beginPath(); ctx.ellipse(44, 2, 92, 8, 0, 0, Math.PI * 2); ctx.fill();
  const up = o.rear ? Math.sin(o.rear / 0.4 * Math.PI) * -0.22 : 0;
  ctx.save(); ctx.translate(88, -9); ctx.rotate(up); tthOlyHorse(0, 0, o.gal + 1.2, o.run, P.h2, P.h2d, P.mane, 0.95); ctx.restore();
  // the pole to the yoke
  ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(22, -22); ctx.lineTo(72, -34); ctx.stroke();
  ctx.strokeStyle = P.wheel; ctx.lineWidth = 3; ctx.stroke();
  // the car
  ctx.save(); ctx.translate(-2, -15); ctx.rotate(o.rot || 0); ctx.translate(2, 15);
  if (o.riders) o.riders();
  ctx.fillStyle = P.car; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(-32, -22); ctx.lineTo(-32, -37); ctx.quadraticCurveTo(-10, -33, 10, -36); ctx.quadraticCurveTo(18, -40, 20, -57); ctx.quadraticCurveTo(29, -52, 27, -22); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = P.carDk; ctx.beginPath(); ctx.moveTo(-32, -22); ctx.lineTo(27, -22); ctx.lineTo(26, -27); ctx.lineTo(-32, -27); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = P.trim; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-29, -33); ctx.quadraticCurveTo(-10, -29, 10, -32); ctx.quadraticCurveTo(20, -36, 22, -52); ctx.stroke();
  ctx.fillStyle = P.trim; for (const dx of [-22, -10, 2]) { circle(dx, -28.5, 2); ctx.fill(); }
  // the wheel
  ctx.fillStyle = '#e8c27a'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; circle(-4, -15, 15); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = P.wheel; ctx.lineWidth = 4; circle(-4, -15, 12); ctx.stroke();
  ctx.lineWidth = 2.5; for (let k = 0; k < 4; k++) { const a = o.wheel + k * Math.PI / 4; ctx.beginPath(); ctx.moveTo(-4 - Math.cos(a) * 11, -15 - Math.sin(a) * 11); ctx.lineTo(-4 + Math.cos(a) * 11, -15 + Math.sin(a) * 11); ctx.stroke(); }
  ctx.fillStyle = P.trim; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; circle(-4, -15, 3.5); ctx.fill(); ctx.stroke();
  if (o.front) o.front();
  ctx.restore();
  ctx.save(); ctx.translate(76, 0); ctx.rotate(up); tthOlyHorse(0, 0, o.gal, o.run, P.h1, P.h1d, P.mane, 1); ctx.restore();
  // reins
  if (o.reins) { ctx.strokeStyle = 'rgba(28,26,54,0.8)'; ctx.lineWidth = 1.6; for (const [hx, hy] of [[118, -50 + up * 60], [128, -58 + up * 60]]) { ctx.beginPath(); ctx.moveTo(o.reins.x, o.reins.y); ctx.quadraticCurveTo(60, -44, hx, hy); ctx.stroke(); } }
  ctx.restore();
}
// the hook's pole: its hand and its tip (local to the chariot) for a reach of 0..1 (and the snatch swipe)
function tthOlyPole(ph) {
  const K = TTHOLY, hx = K.handDx, hy = -K.handUp, a1 = Math.atan2(-K.hookUp + K.handUp, K.hookDx - K.handDx), a0 = -1.95, len = Math.hypot(K.hookDx - K.handDx, K.hookUp - K.handUp);
  const e = ph.reach * ph.reach * (3 - 2 * ph.reach);
  let a = a0 + (a1 - a0) * e;
  if (ph.swipe > 0) a -= Math.sin(ph.swipe / K.swipeT * Math.PI) * 0.5;
  if (ph.wreathOn) a = -1.35 + Math.sin(ph.t * 9) * 0.08;
  return { hx, hy, tx: hx + Math.cos(a) * len, ty: hy + Math.sin(a) * len, a };
}
function tthOlyDrawChariot(st) {
  const ph = st.ph, K = TTHOLY, y = tthOlyLaneY(ph.ly), run = clamp(ph.v / 400, 0, 1.25), t = ph.t;
  const rot = (ph.wob > 0 ? Math.sin(ph.wob * 30) * 0.12 * (ph.wob / K.wobT) : 0) + (ph.spin > 0 ? Math.sin(ph.spin * 10) * 0.32 * (ph.spin / K.skidT) : 0) + (ph.edge > 0 ? Math.sin(ph.edge * 40) * 0.05 : 0) - ph.lean * 0.05;
  const gold = ph.gold.hook || ph.gold.long, hop = Math.abs(Math.sin(ph.gal)) * 2 * run, cheer = ph.mode === 'won' || ph.mode === 'done';
  const sx = ph.x + (ph.spin > 0 ? Math.sin(ph.spin * 10) * 10 : 0);
  tthOlyRig(sx, y, { gal: ph.gal, run, rot, wheel: ph.wheel, pal: TTHOLY_PAL.hero, rear: ph.rear, reins: { x: tthOlySeat(ph, ph.driver).dx + 10, y: -K.floor - 16 },
    riders() {
      for (const id of [1 - ph.driver, ph.driver]) {
        const seat = tthOlySeat(ph, id), ch = cheer ? Math.abs(Math.sin(t * 8 + id * 1.3)) * 9 : 0, stun = ph.wob > 0.25 || ph.spin > 0.2 || (id !== ph.driver && ph.stunT > 0);
        tthDrawHero(id, seat.dx, -K.floor - seat.hop - hop - ch, { face: 1, s: 1.12, stun, sx: 1 + hop * 0.02, sy: 1 - hop * 0.02 });
      }
    },
    front() {
      // the long hook (the grabber's), with the ribbons won so far
      const pl = tthOlyPole(ph);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 6.5; ctx.beginPath(); ctx.moveTo(pl.hx - Math.cos(pl.a) * 14, pl.hy - Math.sin(pl.a) * 14); ctx.lineTo(pl.tx, pl.ty); ctx.stroke();
      ctx.strokeStyle = gold ? C.gold : '#b8894a'; ctx.lineWidth = 3.5; ctx.stroke();
      // the crook
      ctx.save(); ctx.translate(pl.tx, pl.ty); ctx.rotate(pl.a);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 6.5; ctx.beginPath(); ctx.arc(0, 9, 9, -Math.PI / 2, Math.PI * 0.75); ctx.stroke();
      ctx.strokeStyle = gold ? C.gold : '#b8894a'; ctx.lineWidth = 3.5; ctx.stroke();
      ctx.restore();
      if (gold) { ctx.fillStyle = '#fff3c4'; for (let k = 0; k < 3; k++) { const u = (t * 1.4 + k / 3) % 1; circle(pl.hx + (pl.tx - pl.hx) * u, pl.hy + (pl.ty - pl.hy) * u - 6, 2.2 * Math.sin(u * Math.PI)); ctx.fill(); } }
      for (let k = 0; k < ph.ribbons; k++) tthOlyRibbon(pl.hx + (pl.tx - pl.hx) * (0.78 - k * 0.14), pl.hy + (pl.ty - pl.hy) * (0.78 - k * 0.14), k ? '#ff8fc7' : '#b28dff', t + k, -1 - run);
      if (ph.wreathOn) tthDrawLoot('wreath', pl.tx + 4, pl.ty + 12, 1.25, t);
      // the grabber's little hand on the pole
      ctx.fillStyle = PCOL[1 - ph.driver]; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; circle(pl.hx, pl.hy, 4.5); ctx.fill(); ctx.stroke();
    } });
}
// a ribbon tail fluttering from (x, y); dir -1 streams back
function tthOlyRibbon(x, y, col, t, dir) {
  ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + dir * 10, y + 8 + Math.sin(t * 9) * 4, x + dir * 20, y + 14 + Math.sin(t * 9 + 1) * 5); ctx.stroke();
  ctx.strokeStyle = col; ctx.lineWidth = 3.5; ctx.stroke();
}

/* ---------- art: the things on the track ---------- */
function tthOlyDrawObj(st, o) {
  const ph = st.ph, K = TTHOLY, t = G.clock, y = tthOlyLaneY(o.kind === 'rival' ? o.ly : o.lane);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (o.dead) return;
  switch (o.kind) {
    case 'amph': {
      ctx.save(); ctx.translate(o.x, y - 2);
      ctx.fillStyle = 'rgba(70,45,20,0.24)'; ctx.beginPath(); ctx.ellipse(0, 1, 18, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-5, -38); ctx.quadraticCurveTo(-17, -36, -13, -24); ctx.moveTo(5, -38); ctx.quadraticCurveTo(17, -36, 13, -24); ctx.stroke();
      ctx.fillStyle = '#e07f3c'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(-5, -41); ctx.lineTo(5, -41); ctx.lineTo(4, -34); ctx.bezierCurveTo(19, -29, 18, -10, 5, 0); ctx.lineTo(-5, 0); ctx.bezierCurveTo(-18, -10, -19, -29, -4, -34); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#2a2233'; ctx.beginPath(); ctx.moveTo(-14, -25); ctx.lineTo(14, -25); ctx.lineTo(14.5, -17); ctx.lineTo(-14.5, -17); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#f2b36a'; ctx.lineWidth = 1.6; ctx.beginPath(); for (let k = 0; k <= 6; k++) ctx.lineTo(-12 + k * 4, k % 2 ? -19 : -23); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(-8, -12, 2.5, 6, 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e07f3c'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; rr(-8, -45, 16, 5, 2); ctx.fill(); ctx.stroke();
      ctx.restore(); break;
    }
    case 'hurdle': {
      // a fallen hurdle across two lanes (one of the Thief's "improvements")
      const y1 = y + K.laneH;
      ctx.fillStyle = 'rgba(70,45,20,0.2)'; ctx.beginPath(); ctx.ellipse(o.x + 4, (y + y1) / 2 - 4, 22, 54, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = C.ink; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(o.x - 8, y - 30); ctx.lineTo(o.x - 22, y - 16); ctx.moveTo(o.x + 12, y1 - 2); ctx.lineTo(o.x - 4, y1 + 10); ctx.stroke();
      ctx.strokeStyle = '#8a8fa3'; ctx.lineWidth = 5; ctx.stroke();
      ctx.strokeStyle = C.ink; ctx.lineWidth = 15; ctx.beginPath(); ctx.moveTo(o.x - 8, y - 30); ctx.lineTo(o.x + 12, y1 - 2); ctx.stroke();
      ctx.strokeStyle = '#f4f0e6'; ctx.lineWidth = 10; ctx.stroke();
      ctx.strokeStyle = '#e0483c'; ctx.setLineDash([14, 14]); ctx.lineCap = 'butt'; ctx.stroke(); ctx.setLineDash([]); ctx.lineCap = 'round';
      break;
    }
    case 'gear': case 'disc': {
      const fall = o.kind === 'gear' && o.fall > 0, k = fall ? o.fall / K.gear.fall : 0, gy = y - 17 - k * k * 420, gear = o.kind === 'gear';
      if (!fall) { ctx.fillStyle = 'rgba(70,45,20,0.24)'; ctx.beginPath(); ctx.ellipse(o.x, y - 1, 16, 5, 0, 0, Math.PI * 2); ctx.fill(); }
      ctx.save(); ctx.translate(o.x, gear && !fall ? y - 12 : gy); ctx.rotate(gear ? (fall ? o.rot + k * 9 : 0.5) : o.rot);
      ctx.fillStyle = gear ? '#d9a441' : '#c98a3a'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
      if (gear) { ctx.beginPath(); for (let n = 0; n < 16; n++) { const a = n * Math.PI / 8, r = n % 2 ? 17 : 12.5; ctx.lineTo(Math.cos(a - 0.1) * r, Math.sin(a - 0.1) * r); ctx.lineTo(Math.cos(a + 0.1) * r, Math.sin(a + 0.1) * r); } ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#9a6f22'; circle(0, 0, 5); ctx.fill(); ctx.stroke(); }
      else { circle(0, 0, 15); ctx.fill(); ctx.stroke(); ctx.strokeStyle = '#8a5a1e'; ctx.lineWidth = 2; circle(0, 0, 9); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(9, 0); ctx.stroke(); ctx.fillStyle = '#f6d37a'; circle(-5, -6, 3); ctx.fill(); }
      ctx.restore();
      if (o.kind === 'disc' && o.roll) { ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 3; for (const dy of [-26, -16, -6]) { ctx.beginPath(); ctx.moveTo(o.x + 20, y + dy); ctx.lineTo(o.x + 34 + (dy % 5) * 2, y + dy); ctx.stroke(); } }
      break;
    }
    case 'branch': {
      if (o.got && o.gotT > 0.25) { tthOlyPoleArt(o.x, y, 1); break; }
      const hookX = ph.x + K.hookDx, d = o.x - hookX, now = !o.passed && !o.sock && d > -K.winBack && d < K.winFront + ph.v * K.winLead, sway = Math.sin(t * 3 + o.x) * 0.12;
      tthOlyPoleArt(o.x, y, 0);
      if (o.got) break;
      const bx = o.x, by = y - K.hookUp;
      ctx.save(); ctx.translate(bx, by - 14); ctx.rotate(sway); ctx.translate(0, 14);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(0, -4); ctx.stroke();
      if (o.sock) {
        ctx.fillStyle = '#9a6fc0'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(-6, -6); ctx.lineTo(6, -6); ctx.lineTo(6, 8); ctx.quadraticCurveTo(18, 9, 18, 16); ctx.quadraticCurveTo(16, 22, 4, 21); ctx.quadraticCurveTo(-6, 20, -6, 10); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#f4efe2'; ctx.fillRect(-6, -6, 12, 5); ctx.strokeRect(-6, -6, 12, 5);
        ctx.strokeStyle = '#6a4a8a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-5, 4); ctx.lineTo(5, 4); ctx.moveTo(-5, 10); ctx.lineTo(6, 10); ctx.stroke();
        ctx.strokeStyle = '#7fae3a'; ctx.lineWidth = 2.2; for (const dx of [-14, 0, 14]) { ctx.beginPath(); for (let q = 0; q <= 4; q++) ctx.lineTo(dx + 6 + Math.sin(t * 5 + q + dx) * 3, -12 - q * 5); ctx.stroke(); }
      } else {
        if (now) { ctx.fillStyle = 'rgba(255,214,90,' + (0.4 + 0.25 * Math.sin(t * 20)) + ')'; circle(0, 6, 25); ctx.fill(); }
        ctx.strokeStyle = '#6b4a2a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-17, 10); ctx.quadraticCurveTo(0, -3, 17, 8); ctx.stroke();
        for (let n = 0; n < 7; n++) {
          const u = n / 6, lx = -17 + 34 * u, ly = 10 - Math.sin(u * Math.PI) * 9 - (u > 0.5 ? 2 * (u - 0.5) * 2 : 0);
          ctx.save(); ctx.translate(lx, ly); ctx.rotate((n % 2 ? 1 : -1) * 0.9 + (u - 0.5));
          ctx.fillStyle = n % 2 ? '#6fb04a' : '#8fce5e'; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.ellipse(0, n % 2 ? 7 : -7, 3.4, 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore();
        }
        ctx.fillStyle = '#3d2a52'; for (const [ox, oy] of [[-6, 9], [5, 6]]) { circle(ox, oy, 3); ctx.fill(); }
        tthOlyRibbon(0, -4, '#ff8fc7', t + o.x, -1);
      }
      ctx.restore();
      break;
    }
    case 'rival': {
      const run = clamp(o.v / 400, 0, 1), rot = o.wob > 0 ? Math.sin(o.wob * 30) * 0.12 : 0;
      tthOlyRig(o.x, y, { gal: o.gal, run, rot: rot - o.dir * 0.08, wheel: o.wheel, pal: TTHOLY_PAL.rival, reins: { x: 12, y: -44 },
        riders() {
          // a racer in a bronze helmet
          ctx.fillStyle = '#f4efe2'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; rr(-8, -56, 20, 30, 7); ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#f3d1a8'; circle(3, -62, 9); ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#d9a441'; ctx.beginPath(); ctx.arc(3, -64, 10, Math.PI * 0.95, Math.PI * 2.05); ctx.lineTo(13, -58); ctx.lineTo(8, -60); ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#c8553d'; ctx.beginPath(); ctx.moveTo(-8, -66); ctx.quadraticCurveTo(-2, -84, 12, -74); ctx.quadraticCurveTo(4, -76, -2, -68); ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.fillStyle = C.ink; circle(8, -62, 1.6); ctx.fill();
          if (o.dir) { ctx.strokeStyle = '#f3d1a8'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(6, -46); ctx.lineTo(20, -46 + o.dir * 16); ctx.stroke(); }
        } });
      // the tell: chevrons blink on the side it will move to
      if (o.dir) {
        const a = 0.5 + 0.5 * Math.sin(t * 22), yy = y - 26 + o.dir * 34;
        ctx.save(); ctx.globalAlpha = 0.5 + 0.5 * a; ctx.strokeStyle = C.ink; ctx.lineWidth = 9;
        const chev = () => { ctx.beginPath(); for (const dx of [10, 46, 82]) { ctx.moveTo(o.x + dx - 12, yy - o.dir * 8); ctx.lineTo(o.x + dx, yy + o.dir * 4); ctx.lineTo(o.x + dx + 12, yy - o.dir * 8); } ctx.stroke(); };
        chev(); ctx.strokeStyle = '#ff5f6d'; ctx.lineWidth = 5; chev(); ctx.restore();
      }
      break;
    }
    case 'post': {
      // the turning post: three bronze cones on a stone base, at the wall
      const by = K.trackTop + 6;
      ctx.fillStyle = '#e8dcc0'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; rr(o.x - 34, by - 22, 68, 24, 5); ctx.fill(); ctx.stroke();
      for (const dx of [-20, 0, 20]) {
        ctx.fillStyle = dx ? '#c98a3a' : '#d9a441'; ctx.beginPath(); ctx.moveTo(o.x + dx - 8, by - 22); ctx.quadraticCurveTo(o.x + dx - 5, by - 70, o.x + dx, by - (dx ? 96 : 112)); ctx.quadraticCurveTo(o.x + dx + 5, by - 70, o.x + dx + 8, by - 22); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#f6d37a'; circle(o.x + dx, by - (dx ? 98 : 114), 4); ctx.fill(); ctx.stroke();
      }
      break;
    }
    case 'line': {
      // the lap line's column and its banner
      const by = K.trackTop + 6;
      ctx.fillStyle = '#fffaf0'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; ctx.fillRect(o.x - 8, by - 120, 16, 120); ctx.strokeRect(o.x - 8, by - 120, 16, 120); rr(o.x - 13, by - 128, 26, 9, 3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#c8553d'; ctx.beginPath(); ctx.moveTo(o.x + 8, by - 118); ctx.lineTo(o.x + 74, by - 112 + Math.sin(t * 7) * 3); ctx.lineTo(o.x + 60, by - 98); ctx.lineTo(o.x + 74, by - 84 + Math.sin(t * 7 + 1) * 3); ctx.lineTo(o.x + 8, by - 80); ctx.closePath(); ctx.fill(); ctx.stroke();
      text('LAP ' + o.n, o.x + 34, by - 98, 17, '#fff7d6', 'center');
      break;
    }
  }
}
// a branch's pole: planted behind its lane, bent over it; bare: the branch was taken
function tthOlyPoleArt(x, y, bare) {
  const K = TTHOLY;
  for (const [w, c2] of [[7, C.ink], [3.5, '#b8894a']]) { ctx.strokeStyle = c2; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x + 26, y - 30); ctx.quadraticCurveTo(x + 30, y - K.hookUp - 34, x, y - K.hookUp - 14); ctx.stroke(); }
  ctx.fillStyle = 'rgba(70,45,20,0.24)'; ctx.beginPath(); ctx.ellipse(x + 26, y - 29, 8, 3, 0, 0, Math.PI * 2); ctx.fill();
  if (bare) { ctx.strokeStyle = C.ink; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x, y - K.hookUp - 14); ctx.lineTo(x - 3, y - K.hookUp - 6); ctx.stroke(); }
}

/* ---------- the phase ---------- */
TTH_PHASES.olympics = {
  bubbleHidden: true,
  setup(st, L) {
    const ph = st.ph, K = TTHOLY, c = st.thief, LK = K.laps[0];
    Object.assign(ph, {
      t: 0, mode: 'start', modeT: 0, lap: 0, lapT0: 0, driver: L.def.first ? 1 : 0,
      x: K.chX, v: 0, lane: 1, ly: 1, laneFrom: 1, laneX: -9999, closeAt: -9, lean: 0, gal: 0, wheel: 0, camBack: 0,
      boostT: 0, spurT: 0, wob: 0, spin: 0, edge: 0, rear: 0, inMud: false, postD: Infinity, hoofT: 0, dustT: 0,
      prevUp: true, prevDn: true, repT: 0,
      reach: 0, held: false, swipe: 0, cool: 0, stunT: 0,
      obs: [], gen: tthOlyNewGen(0, LK), cullT: 0,
      got: 0, need: LK.need, ribbons: 0, wreathOn: false,
      miss: { hook: 0, lane: 0, crash: 0, whiff: 0, tap: 0 }, skids: [0, 0],
      gold: { hook: false, long: false, clear: false, turn: [false, false], swing: 0, crowd: false },
      chaseT: 0, freeT: 0, tease: null, flee: null, tauntT: 7, tauntN: 0, poseT: 0, cheerT: 0, leafT: 0,
      swapA: 0, stallT: 0, tipT: {}, said: false, newsQ: null,
    });
    ph.gen.on = false;
    st.cam = { x: 0, y: 0 };
    Object.assign(c, { x: 830, y: 232, s: 0.62, face: -1, pose: 'laugh', jet: true, item: st.era.loot, claw: 0.3, flame: 1 });
    Object.assign(tthStats(st), { laps: [], branches: 0, missed: 0, crashes: 0, skids: 0, whiffs: 0, socks: 0, mud: 0, close: 0 });
    // the start line under the horses' noses
    ph.obs.push({ kind: 'line', x: K.chX + K.front + 26, lane: -1, n: 1, done: true });
    tthOlyPlace(st);
  },
  step(st, dt) {
    const ph = st.ph;
    ph.t += dt;
    if (!ph.said) {
      ph.said = true;
      tthSay(st, 'Ha! I brought the chariots EARLY!', 3);
      tthNews(st, TTHOLY.laps[0].fact, false, 6);
    }
    tthOlyDrive(st, dt);
    tthOlyGrab(st, dt);
    tthOlyWorld(st, dt);
    tthOlyFlow(st, dt);
    if (st.ph !== ph) return;
    tthOlyPlace(st, dt);
    tthOlyHints(st, dt);
  },
  // cards and the portal cutscene: the horses pull up, nothing else moves
  coast(st, dt) {
    const ph = st.ph, K = TTHOLY;
    ph.t += dt;
    for (const p of G.players) { p.pendingJump = false; p.pendingAct = false; }
    ph.v = approach(ph.v, 0, 400 * dt); ph.x += ph.v * dt; for (const q of st.pops) q.x += ph.v * dt; ph.gal += dt * (ph.v > 20 ? 5 + ph.v / 34 : 0); ph.wheel += ph.v * dt / 15;
    ph.ly = approach(ph.ly, ph.lane, dt / K.laneT);
    ph.wob = Math.max(0, ph.wob - dt); ph.spin = Math.max(0, ph.spin - dt); ph.swipe = Math.max(0, ph.swipe - dt); ph.cheerT = Math.max(0, ph.cheerT - dt);
    if (!ph.wreathOn && ph.mode !== 'done') ph.reach = Math.max(0, ph.reach - dt / K.reachDown);
    ph.prevUp = true; ph.prevDn = true; ph.held = false;
    if (st.cut) { ph.cheerT = 1; if ((G.tickN % 10) === 0 && st.cut.t < 2.6) confetti(st.cam.x + 80 + Math.random() * (W - 160), 210 + Math.random() * 50); }
    else tthOlyThief(st, dt);
    tthOlyPlace(st, dt);
  },
  drawBack(st) {
    tthScreen(st, () => tthOlyScenery(st, st.cam.x, G.clock));
    tthOlyGround(st);
    for (const o of st.ph.obs) if ((o.kind === 'post' || o.kind === 'line') && o.x > st.cam.x - 120 && o.x < st.cam.x + W + 120) tthOlyDrawObj(st, o);
  },
  draw(st) {
    const ph = st.ph, K = TTHOLY, cam = st.cam.x, cl = Math.round(ph.ly), t = G.clock;
    for (let l = 0; l < 3; l++) {
      for (const o of ph.obs) {
        if (o.kind === 'mud' || o.kind === 'post' || o.kind === 'line' || o.x < cam - 200 || o.x > cam + W + 160) continue;
        if (Math.round(o.kind === 'rival' ? o.ly : o.lane) === l) tthOlyDrawObj(st, o);
      }
      if (l === cl) tthOlyDrawChariot(st);
    }
    // the tease: the wreath on its rope, the ring at the hook, his lane arrow
    const ts = ph.tease;
    if (ts) {
      const w = tthOlyWreathAt(st), tip = tthOlyTip(ph), near = tthOlyWreathNear(st), R = ph.gold.swing ? K.tease.goldR : K.tease.R;
      const yk = ts.yank > 0 ? clamp(ts.yank / 0.4, 0, 1) : 0, wx = w.x + (w.px - w.x) * yk, wy = w.y + (w.py - w.y) * yk;
      ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(w.px, w.py); ctx.lineTo(wx, wy - 10); ctx.stroke();
      for (let k = ph.ribbons; k < 2; k++) tthOlyRibbon(wx + (k ? 5 : -5), wy + 12, k ? '#ff8fc7' : '#b28dff', t + k, k ? 0.5 : -0.5);
      tthDrawLoot('wreath', wx, wy, 1.15, t);
      if (ts.live && ph.mode === 'tease') {
        ctx.save();
        ctx.strokeStyle = near ? C.gold : 'rgba(255,255,255,0.85)'; ctx.lineWidth = near ? 5 : 3; ctx.setLineDash(near ? [] : [7, 6]); ctx.lineDashOffset = -t * 24;
        if (near) { ctx.fillStyle = 'rgba(255,214,90,0.3)'; circle(tip.x, tip.y, R + 4); ctx.fill(); }
        circle(tip.x, tip.y, R); ctx.stroke(); ctx.setLineDash([]);
        ctx.restore();
        if (near) bigText('NOW!', tip.x, tip.y - R - 16, tthBig() ? 26 : 20, C.gold, 1 + 0.1 * Math.sin(t * 20));
      }
      if (ts.tell > 0) {
        const c = st.thief, a = Math.abs(Math.sin(t * 14));
        bigText(ts.dir < 0 ? '▲' : '▼', c.x - 10, c.y + (ts.dir < 0 ? -150 * c.s - 20 : 34) + ts.dir * a * 8, 34, '#ff5f6d', 1);
      }
    }
  },
  drawTop(st) {
    const ph = st.ph;
    // speed lines in a boost
    if (ph.boostT > 0 && !reduceMotion) {
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      for (let k = 0; k < 7; k++) {
        const h = hash(k, Math.floor(ph.t * 20)), x = st.cam.x + (h % W), y = 330 + ((h >>> 10) % 190), len = 50 + ((h >>> 20) % 70);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + len, y); ctx.stroke();
      }
    }
  },
  hide: () => true,
  hud(st) {
    const ph = st.ph, K = TTHOLY, big = tthBig(), z = big ? 1.4 : 1;
    if (G.introT > 0 || ph.mode === 'done') return;
    // the "Catch up!" gauge: one leaf per olive branch
    const tease = ph.mode === 'tease', label = ph.mode === 'won' ? 'Got it!' : tease ? 'Grab the wreath!' : ph.mode === 'flee' || ph.mode === 'toLine' ? 'To the lap line!' : 'Catch up!';
    const fs = Math.round(14 * z), h = Math.round(28 * z), pw = Math.round(15 * z), leaves = ph.mode === 'chase' || ph.mode === 'start';
    ctx.font = tthFont(fs);
    const lw = ctx.measureText(label).width, w = 18 * z + lw + (leaves ? 10 * z + ph.need * pw : 0) + 12 * z, x = 14, y = H - h - 6;   // bottom left, under the chariot: clear of the core HUD, the news and the hints
    const sb = st.say ? tthSayBox(st) : null;
    const under = (!!sb && sb.bx - sb.tw / 2 < x + w + 6 && sb.by - sb.th / 2 < y + h + 6 && sb.by + sb.th / 2 > y - 6) || (st.idle && x + w > W / 2 - 190);   // his speech bubble (or "...is waiting") is over it
    if (!under) {
      pill(x, y, w, h);
      if (tease) { ctx.strokeStyle = C.gold; ctx.lineWidth = 2; rr(x, y, w, h, h / 2); ctx.stroke(); }
      text(label, x + 14 * z, y + h / 2 + 0.5, fs, tease || ph.mode === 'won' ? C.gold : C.paper, 'left', 'body');
    }
    if (leaves && !under) for (let k = 0; k < ph.need; k++) {
      const lx = x + 14 * z + lw + 14 * z + k * pw, ly = y + h / 2, on = k < ph.got, pop = on && k === ph.got - 1 && ph.leafT > 0 ? 1 + ph.leafT : 1;
      ctx.save(); ctx.translate(lx, ly); ctx.rotate(-0.6); ctx.scale(z * pop, z * pop);
      ctx.fillStyle = on ? '#8fce5e' : 'rgba(255,255,255,0.22)'; ctx.beginPath(); ctx.ellipse(0, 0, 4, 8, 0, 0, Math.PI * 2); ctx.fill();
      if (on) { ctx.strokeStyle = '#3f7f2c'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(0, 6); ctx.stroke(); }
      ctx.restore();
    }
    // the turning post: is the chariot slow enough?
    if (ph.postD < 900 && ph.postD > -40 && ph.mode === 'chase') {
      const ok = ph.v <= K.skidV, msg = ok ? 'Turn: good speed!' : 'Turn! Rein in!', f2 = Math.round(17 * z);
      ctx.font = tthLilita(f2);
      const tw = ctx.measureText(msg).width + 30 * z, th = 30 * z, tx = W / 2 - tw / 2, ty = big ? (st.news ? 124 : 82) : st.news ? 132 : 104;
      ctx.fillStyle = ok ? 'rgba(63,143,92,0.92)' : 'rgba(200,60,50,0.94)'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; rr(tx, ty, tw, th, th / 2); ctx.fill(); ctx.stroke();
      text(msg, W / 2, ty + th / 2 + 1, f2, '#ffffff', 'center');
    }
  },
  hudText: st => (st.ph.mode === 'won' || st.ph.mode === 'done' ? 'Lap 3/3' : 'Lap ' + Math.min(3, st.ph.lap + 1) + '/3'),
  progress: st => ({ n: st.ph.mode === 'won' || st.ph.mode === 'done' ? 3 : st.ph.lap, of: 3 }),
  labels: st => (st.ph.driver === 0 ? ['gallop', 'grab'] : ['grab', 'gallop']),
  jobKeys: st => (st.ph.driver === 1 ? ['grabber', 'driver'] : ['driver', 'grabber']),
  legend(st) {
    const d = st.ph.driver, drive = (r, l, u, dn) => `<kbd>${r}</kbd> gallop <kbd>${l}</kbd> rein in <kbd>${u}</kbd><kbd>${dn}</kbd> lanes`, grab = 'hold, then let go:';
    return { pip: d === 0 ? drive('D', 'A', 'W', 'S') : grab, bo: d === 1 ? drive('→', '←', '↑', '↓') : grab,
      pad: 'driver: stick ▶ gallop, ◀ rein in, up / down lanes; grabber: hold, then let go:' };
  },
  roles: st => (st.ph.mode === 'done' ? null : st.ph.driver === 0 ? ['Drive!', 'Grab!'] : ['Grab!', 'Drive!']),
  // hints and badges: over the heads; over the hook's ring too on phones (big bubbles) and in the tease
  headLift: st => (tthBig() || st.ph.mode === 'tease' ? 62 : 4),
};
tthRoom('olympics', {
  jobs: {
    driver: { title: 'Driver', act: 'gallop', legend: '<kbd>D</kbd> gallop <kbd>A</kbd> rein in <kbd>W</kbd><kbd>S</kbd> change lanes',
      howTo: ['Steer into the lane of the glowing branch.'] },
    grabber: { title: 'Grabber', act: 'grab', legend: '<kbd>F</kbd> hold, let go to grab',
      howTo: ['Hold to swing the hook out. Let go as a glowing branch passes.'] },
  },
  tip: 'One drives: hold right to gallop, up and down change lanes. One grabs: hold the button, let go to snatch!',
  act: { label: 'grab', labels: ['grab', 'gallop'] },
  legend: { pip: 'hold, then let go:', bo: '<kbd>→</kbd> gallop <kbd>←</kbd> rein in <kbd>↑</kbd><kbd>↓</kbd> lanes', pad: 'driver: stick ▶ gallop, ◀ rein in, up / down lanes; grabber: hold, then let go:' },
  map: TTH_EMPTY_MAP,
});

/* ---------- sounds ---------- */
Sfx.extra.tthOlyHoof = function () { this.tone(170, 0.035, 'triangle', 0.03, 90); this.tone(150, 0.035, 'triangle', 0.025, 80, 0.07); };
Sfx.extra.tthOlyWhoa = function () { this.tone(500, 0.12, 'triangle', 0.035, 1000); this.tone(1000, 0.1, 'triangle', 0.025, 800, 0.1); };
Sfx.extra.tthOlyLane = function () { this.tone(300, 0.08, 'sawtooth', 0.016, 520); };
Sfx.extra.tthOlyYah = function (p) { this.tone(520 * p, 0.08, 'square', 0.03, 780 * p); };
Sfx.extra.tthOlyNeigh = function () { for (let k = 0; k < 5; k++) this.tone(900 - k * 90 + (k % 2) * 120, 0.07, 'sawtooth', 0.022, 700 - k * 80, k * 0.06); };
Sfx.extra.tthOlyReach = function (p) { this.tone(260 * p, 0.1, 'triangle', 0.03, 520 * p); };
Sfx.extra.tthOlySwish = function () { this.tone(700, 0.12, 'sawtooth', 0.014, 200); };
Sfx.extra.tthOlyGrab = function (p) { [660, 880, 1175, 1568].forEach((f, i) => this.tone(f * p, 0.09, 'triangle', 0.05, null, i * 0.045)); this.tone(200, 0.3, 'sawtooth', 0.02, 700, 0.05); };
Sfx.extra.tthOlyYuck = function () { this.tone(220, 0.3, 'sawtooth', 0.04, 90); this.tone(180, 0.3, 'square', 0.02, 70, 0.08); };
Sfx.extra.tthOlyCrash = function () { [1900, 1400, 2300, 1100, 1700].forEach((f, i) => this.tone(f, 0.05, 'square', 0.03, f * 0.6, i * 0.03)); this.tone(120, 0.25, 'triangle', 0.09, 50); };
Sfx.extra.tthOlySkid = function () { this.tone(900, 0.5, 'sawtooth', 0.03, 240); this.tone(140, 0.4, 'triangle', 0.06, 60, 0.05); };
Sfx.extra.tthOlySplat = function () { this.tone(260, 0.2, 'sine', 0.07, 70); this.tone(500, 0.12, 'sawtooth', 0.02, 120, 0.03); };
Sfx.extra.tthOlyDisc = function () { this.tone(1300, 0.3, 'triangle', 0.03, 900); };
Sfx.extra.tthOlyDrop = function () { this.tone(1200, 0.5, 'sine', 0.03, 300); };
Sfx.extra.tthOlyGear = function () { this.tone(150, 0.14, 'triangle', 0.08, 70); this.tone(1700, 0.06, 'square', 0.02, 1200, 0.02); };
Sfx.extra.tthOlyRip = function (p) { this.tone(1500 * p, 0.22, 'sawtooth', 0.04, 300); [784, 1047].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.05, null, 0.18 + i * 0.08)); };
Sfx.extra.tthOlyCheer = function () { [392, 494, 587, 784].forEach((f, i) => this.tone(f + Math.random() * 20, 0.5, 'sawtooth', 0.012, f * 1.12, i * 0.04)); };
Sfx.extra.tthOlyHorn = function () { [392, 392, 523, 659].forEach((f, i) => this.tone(f, i === 3 ? 0.3 : 0.11, 'sawtooth', 0.03, null, i * 0.12)); };
Sfx.extra.tthOlyTease = function () { [880, 784, 880, 784, 660].forEach((f, i) => this.tone(f, 0.09, 'square', 0.025, null, i * 0.09)); };
Sfx.extra.tthOlyWin = function () { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.18, 'triangle', 0.06, null, i * 0.1)); };
