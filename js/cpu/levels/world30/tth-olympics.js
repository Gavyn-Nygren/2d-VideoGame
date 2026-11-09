/* Pip & Bo - Computer partner: 30-1 The Time Thief, era 'olympics' (The First Olympics, 776 BC). */
'use strict';

/* The plan (a helpful teammate at full skill, either job; the game says who drives: S.ph.driver, swapped every lap).
   It reads only what a person can see: things on screen (plus a discus's "!" at the edge), the chariot's speed and
   lane, the hook, the swinging wreath, the Thief's lane arrow, the gold help that was announced.
   - DRIVER. For each lane it works out the free run: how far the chariot can go before something solid (amphora,
     hurdle, landed or falling gear, a discus rolling at it, a rival chariot and the lane that rival points to).
     Its goal lane is the next olive branch's lane (the Thief's lane in the tease). If its own lane's free run is
     short it leaves for the better neighbour; else it steps toward the goal when that neighbour is clear; mud is
     dodged when that costs nothing. Like a hand on a stick: 0.14 s to react, one lane press at a time, 0.22 s apart.
     Pace: it gallops; before a turning post it reins in to just under the skid speed and feathers through; in the
     tease it keeps galloping under the Thief. For a person who missed a branch it trots past the next ones.
   - GRABBER. It holds the hook out about 0.75 s before a branch in the chariot's lane and lets go as the branch
     reaches the hook (each one a few hundredths early or late, never frame-perfect); it leaves socks alone. In the
     tease it holds, and lets go about 0.1 s after the wreath swings into the ring. With the golden hook it just holds.
   - It never clears alone: an idle driver's horses stop by themselves, and the core brain mutes it while the person
     is away. Bubbles (1-player only, short): lane call-outs for a person driving, "Gallop!", "Slow for the turn!",
     "Follow him!"; for a person grabbing: "Branch coming! Hook out!", "Snatch the wreath!", "Not the sock!". */
const TTHOLY_LANE_NAMES = ['Top lane!', 'Middle lane!', 'Bottom lane!'];
// the next real olive branch the hook has not passed yet, as seen on screen
function tthOlyBrainBranch(S, socks) {
  const ph = S.ph, K = TTHOLY, lo = ph.x + K.hookDx - K.winBack, hi = S.cam.x + W + 10;
  let best = null;
  for (const o of ph.obs) if (o.kind === 'branch' && !o.got && !o.passed && !!o.sock === !!socks && o.x > lo && o.x < hi && (!best || o.x < best.x)) best = o;
  return best;
}
function tthOlyBrainDrive(b, p, dt, info, S, solo) {
  const ph = S.ph, K = TTHOLY, out = {}, v = Math.max(ph.v, 140), X = ph.x, front = X + K.front, back = X - K.back, edge = S.cam.x + W + 10, cur = ph.lane;
  // how far each lane is clear (in px of the chariot's own travel); soft: mud
  const run = [9999, 9999, 9999], soft = [9999, 9999, 9999];
  const block = (l, d) => { if (l >= 0 && l <= 2 && d < run[l]) run[l] = d; };
  for (const o of ph.obs) {
    if (o.dead || o.x > edge + (o.kind === 'disc' ? 260 : 0)) continue;
    if (o.kind === 'amph' || o.kind === 'hurdle' || o.kind === 'gear') {
      if (o.x + o.r < back) continue;
      const d = Math.max(0, o.x - o.r - front);
      block(o.lane, d); if (o.kind === 'hurdle') block(o.lane + 1, d);
    } else if (o.kind === 'disc') {
      if (o.x + o.r < back) continue;
      block(o.lane, Math.max(0, o.x - o.r - front) * v / (v + K.disc.v));
    } else if (o.kind === 'rival') {
      if (o.x + K.front < back) continue;
      const gap = o.x - K.back - front, rel = v - o.v, d = gap <= 0 ? 0 : rel > 30 ? gap * v / rel : 9999;
      block(Math.floor(o.ly), d); block(Math.ceil(o.ly), d); block(o.lane, d);
      if (o.dir) block(o.lane + o.dir, d);
    } else if (o.kind === 'mud') {
      if (o.x + o.len < back) continue;
      soft[o.lane] = Math.min(soft[o.lane], Math.max(0, o.x - front));
    }
  }
  // the goal lane: the next olive branch, or the Thief in the tease
  const br = tthOlyBrainBranch(S, false), ts = ph.mode === 'tease' ? ph.tease : null;
  let goal = cur;
  if (ts) goal = clamp(ts.lane + (ts.tell > 0 && ts.tell < 0.45 ? ts.dir : 0), 0, 2);
  else if (br && ph.mode === 'chase') goal = ph.gold.long && Math.abs(br.lane - cur) <= 1 && run[cur] > br.x - front + 200 ? cur : br.lane;
  const need = v * 0.62 + 90;
  let want = cur;
  if (run[cur] < need) {
    // something ahead in my lane: the neighbour with the longer free run (toward the goal on a tie)
    let best = cur, bestRun = run[cur] + 40;
    for (const l of [cur + Math.sign(goal - cur || 1), cur - Math.sign(goal - cur || 1)]) if (l >= 0 && l <= 2 && run[l] > bestRun + (best !== cur ? 60 : 0)) { best = l; bestRun = run[l]; }
    want = best;
  } else if (goal !== cur) {
    const step = cur + Math.sign(goal - cur);
    if (run[step] >= need) want = step;
  } else if (soft[cur] < need && !(br && br.lane === cur && br.x - front < soft[cur] + 260)) {
    for (const l of [cur - 1, cur + 1]) if (l >= 0 && l <= 2 && run[l] >= need * 1.4 && soft[l] >= need * 1.4) { want = l; break; }
  }
  // a hand on the stick: a short reaction, one lane press at a time
  const dir = Math.sign(want - cur);
  b.pressCD = Math.max(0, (b.pressCD || 0) - dt);
  if ((b.holdT = (b.holdT || 0) - dt) > 0) { if (b.holdDir < 0) out.jump = true; else out.down = true; }
  else if (dir !== b.dir) { b.dir = dir; b.dirT = 0.14; }
  else if (dir && (b.dirT -= dt) <= 0 && b.pressCD <= 0) { b.holdT = 0.08; b.holdDir = dir; b.pressCD = 0.22; b.dir = 0; if (dir < 0) out.jump = true; else out.down = true; }
  // pace
  let gallop = true, rein = false;
  if (ph.postD < 1000 && !ph.gold.turn[p.id]) {
    const vs = K.skidV - 35, brakeD = Math.max(0, (ph.v * ph.v - vs * vs) / (2 * K.brake)) + ph.v * 0.22 + 40;
    if (ph.postD < brakeD) { if (ph.v > vs) rein = true; if (ph.v > vs - 45) gallop = false; }
  }
  // a person who missed a branch: trot past the next ones so the timing is easier
  if (solo && ph.mode === 'chase' && ph.miss.hook > 0 && !ph.gold.hook && br && br.lane === cur && br.x - X < 760) { if (ph.v > 390) rein = true; if (ph.v > 330) gallop = false; }
  out.right = gallop && !rein; out.left = rein;
  if (solo) {
    const d = br ? br.x - (X + K.hookDx) : 9999;
    if (ts && ts.live) tthBrainSay(b, p, 'snatch', 'Snatch the wreath!', 9);
    else if (ph.mode === 'chase' && br && br.lane === cur && d < v * 1.3 && d > v * 0.6) tthBrainSay(b, p, 'br', 'Branch coming! Hook out!', 8);
    const sock = tthOlyBrainBranch(S, true);
    if (sock && sock.lane === cur && sock.x - X < 500) tthBrainSay(b, p, 'sock', 'Not the sock!', 12);
  }
  return out;
}
function tthOlyBrainGrab(b, p, dt, info, S, solo) {
  const ph = S.ph, K = TTHOLY, out = {}, v = Math.max(ph.v, 60), hookX = ph.x + K.hookDx, tol = ph.gold.long ? 1.2 : 0.55;
  if (solo) {
    // help a person who drives
    b.stall = ph.v < 60 && ph.mode !== 'won' ? (b.stall || 0) + dt : 0;
    const br = tthOlyBrainBranch(S, false);
    if (b.stall > 2.5) tthBrainSay(b, p, 'go', ph.mode === 'start' ? 'Ready! Gallop!' : 'Giddy-up! Gallop!', 6);
    else if (ph.mode === 'tease' && ph.tease && ph.tease.live && ph.tease.lag > 60) tthBrainSay(b, p, 'keep', 'Faster! Stay under him!', 6);
    else if (ph.mode === 'tease' && ph.tease && ph.tease.live && ph.tease.tell <= 0 && ph.tease.lane !== ph.lane) tthBrainSay(b, p, 'follow', 'Follow him! ' + TTHOLY_LANE_NAMES[ph.tease.lane], 4);
    else if (ph.postD < 600 && ph.v > K.skidV + 30 && !ph.gold.turn[1 - p.id]) tthBrainSay(b, p, 'turn', 'Slow down for the turn!', 5);
    else if (ph.mode === 'chase' && br && Math.abs(br.lane - ph.lane) > (ph.gold.long ? 1 : 0) && br.x - hookX < 900 && br.x - hookX > 200) tthBrainSay(b, p, 'lane' + br.lane, TTHOLY_LANE_NAMES[br.lane], 3);
  }
  if (ph.cool > 0 || ph.stunT > 0) { b.relT = 0; return out; }
  // the wreath: hold, and let go a moment after it swings into the ring
  if (ph.mode === 'tease' && ph.tease && ph.tease.live) {
    out.act = true;
    if (!ph.gold.hook && ph.reach >= K.minReach + 0.05) {
      const w = tthOlyWreathAt(S), tip = tthOlyTip(ph), R = ph.gold.swing ? K.tease.goldR : K.tease.R;
      if (Math.hypot(w.x - tip.x, w.y - tip.y) < R * 0.62) { if ((b.relT = (b.relT || 0) + dt) >= 0.1) { out.act = false; b.relT = 0; } } else b.relT = 0;
    }
    return out;
  }
  if (ph.mode !== 'chase') return out;
  // an olive branch in the chariot's lane (or the lane it is steering to): hook out early, let go at the branch
  let br = null;
  for (const o of ph.obs) if (o.kind === 'branch' && !o.sock && !o.got && !o.passed && o.x > hookX - K.winBack + 8 && (Math.abs(ph.lane - o.lane) < tol || Math.abs(ph.ly - o.lane) < tol) && (!br || o.x < br.x)) br = o;
  if (!br) return out;
  const tt = (br.x - hookX) / v;
  if (tt > (ph.gold.hook ? 1.1 : 0.75)) return out;
  out.act = true;
  if (b.brFor !== br) { b.brFor = br; b.err = (Math.random() - 0.5) * 0.08; }
  if (!ph.gold.hook && tt <= 0.07 + b.err && ph.reach >= K.minReach + 0.05 && Math.abs(ph.ly - br.lane) < tol) out.act = false;
  return out;
}
TTH_BRAINS.olympics = {
  reset(b) { b.t = 0; b.dir = 0; b.dirT = 0; b.pressCD = 0; b.holdT = 0; b.holdDir = 0; b.relT = 0; b.stall = 0; b.brFor = null; b.err = 0; },
  back(b) { b.dir = 0; b.dirT = 0; b.holdT = 0; b.relT = 0; b.stall = 0; },
  think(b, p, o, dt, info, S) {
    const ph = S.ph;
    if (!ph || ph.obs == null || ph.mode === 'won' || ph.mode === 'done') return {};
    b.t += dt;
    const solo = !info.partnerCpu;
    return ph.driver === p.id ? tthOlyBrainDrive(b, p, dt, info, S, solo) : tthOlyBrainGrab(b, p, dt, info, S, solo);
  },
};
