/* Pip & Bo - Computer partner: 30-1 The Time Thief, era 'henge' (Building Stonehenge, 2500 BC). */
'use strict';

/* (The brain thinks between ticks, when p.x / p.y are SCREEN coords: tthHengeBrainX / Feet add the camera.)
   The plan (a helpful teammate at full skill, either job; the game says who pushes: S.ph.pusher, swapped at each rest
   post). It reads only what a person can see: the stone, the logs on the ground, the "!" at the nose, sheep, mud, the
   piles, the stream's free places, the Thief's claw and rope, the gold rings.
   - PUSHER. Stands at the back end of the stone and holds toward it, all the time (uphill it never lets go). When the
     stone tips over the crest of the downhill it hops over the stone (a held jump at its end, a run along the top) and
     brakes from the front: holds back toward the stone until the ground is flat again, then hops back behind it.
     It whacks the Thief's claw when the claw comes within its reach (0.2 s to react), and shoos a sheep itself only if
     nobody else has for 3 s (never on a hill).
   - ROLLER. A loop: walk to a log lying free behind the stone, grab it (0.15 s to react to a new one), jump up on the
     stone, run to its front third, drop it, walk back over the top. Other chores in between, most urgent first: get
     off the stone and haul when the lasso is on; whack the claw that dangles a stolen log; lay 3 logs from the pile in
     the stream (the stone's own next log first whenever its nose shows the "!"); shoo sheep off the track; fetch a
     spare from a pile when the mud ate a log. With nothing to do it waits just behind the stone, where logs roll out.
   - LASSO: both hold away from him (right) on the ground near the stone.
   - THE LINTEL: each takes one gold ring (two computers: the left one takes the left ring; with a person: the ring
     the person is not at) and holds the action.
   - WALKING: it runs to a thing and takes the last 80 px in short careful steps (a person lines up with a log or a
     ring like that; a run that brakes exactly on the spot would be a frame-perfect trick). Its answer always says
     left and right, pressed or not.
   - It never clears alone: the stone only moves for the pusher and only rolls on the roller's logs, the tug and the
     lintel need both, and the core brain mutes it while the person is away.
   - Bubbles (1-player only, short): "Push the stone!", "Keep holding!", "Brake it from the front!", "A log in front,
     please!", "Logs in the stream!", "Haul with me!", "Take the other ring!". */
const tthHengeBrainX = p => cpuCx(p) + G.mst.cam.x;
const tthHengeBrainFeet = p => cpuFeet(p) + G.mst.cam.y;
// true once `on` has been true for `delay` s (a human-like reaction time)
function tthHengeBrainSeen(b, key, on, delay) { const s = b.seen || (b.seen = {}); s[key] = on ? (s[key] || 0) + DT : 0; return s[key] >= delay; }
// walk to x (the centre of the player); an end of the stone in the way: a held (full) jump up onto it.
// care: the last 80 px in short careful steps, like a person lining up with a log or a ring (a run that brakes on the
// spot is a frame-perfect trick, and it never settles for a player whose hands are half a second late)
function tthHengeBrainGo(b, out, p, ph, x, dead = 6, care = true) {
  const S = ph.stone, cam = G.mst.cam.x, cx = cpuCx(p) + cam, d = x - cx, ad = Math.abs(d), rear = S.x - S.hw, front = S.x + S.hw;
  if (b.jumpCd > 0) b.jumpCd -= DT;
  out.left = out.right = false;
  const wallR = !S.up && d > 0 && cx < rear && x > rear - 2, wallL = !S.up && d < 0 && cx > front && x < front + 2;
  if (ad > (care ? 80 : 70) || ((wallR || wallL) && ad > dead)) { out.right = d > 0; out.left = d < 0; b.stepT = 0; }
  else if (!care || !p.grounded || b.jumpT > 0) cpuSeek(out, p, x - cam, dead);
  else if (ad > dead) {
    b.stepT = (b.stepT || 0) - DT;
    if (b.stepT <= -0.2) b.stepT = clamp(Math.sqrt(ad / 2300) * 0.85, 0.02, 0.1);
    if (b.stepT > 0) { out.right = d > 0; out.left = d < 0; }
  }
  if (ad > dead) {
    const nearR = wallR && rear - (cx + p.w / 2) < 24, nearL = wallL && cx - p.w / 2 - front < 24;
    if ((nearR || nearL) && p.grounded && !(b.jumpT > 0) && !(b.jumpCd > 0)) b.jumpT = 0.34;
  }
  if (b.jumpT > 0) { b.jumpT -= DT; out.jump = true; if (b.jumpT <= 0) b.jumpCd = 0.14; }
  return ad <= dead;
}
// which gold ring is mine (0 left, 1 right)
function tthHengeBrainRing(b, p, o, info, ph) {
  const R = ph.rings, oc = tthHengeBrainX(o), mc = tthHengeBrainX(p), oR = ph.P[o.id].rope;
  if (info.partnerCpu) { if (b.ring == null) b.ring = mc < oc || (mc === oc && p.id === 0) ? 0 : 1; return b.ring; }
  if (oR >= 0) b.ring = 1 - oR;
  else if (Math.abs(oc - R[0].x) < 60) b.ring = 1;
  else if (Math.abs(oc - R[1].x) < 60) b.ring = 0;
  else if (b.ring == null) b.ring = Math.abs(oc - R[0].x) < Math.abs(oc - R[1].x) ? 1 : 0;
  return b.ring;
}
function tthHengeBrainFinale(b, p, o, info, S, out) {
  const ph = S.ph, F = ph.fin, solo = cpuSolo();
  if (F.stage === 3) return out;
  const i = tthHengeBrainRing(b, p, o, info, ph), at = tthHengeBrainGo(b, out, p, ph, ph.rings[i].x, 12);
  if (F.stage === 2 && (at || Math.abs(tthHengeBrainX(p) - ph.rings[i].x) < 30) && p.grounded) {
    out.act = true; out.left = out.right = false;
    if (solo && ph.P[o.id].rope < 0 && tthHengeBrainSeen(b, 'ringWait', true, 2.5)) tthBrainSay(b, p, 'ring', 'Take the other ring!', 7);
  } else tthHengeBrainSeen(b, 'ringWait', false, 9);
  return out;
}
// the claw within my reach (as the level checks it)?
function tthHengeBrainClaw(S, p) {
  const q = tthThiefPts(S.thief).claw, K = TTHHENGE.thief, dy = tthHengeBrainFeet(p) - q.y;
  return Math.abs(q.x - tthHengeBrainX(p)) < K.whackX - 10 && dy > -8 && dy < K.whackY - 8;
}
function tthHengeBrainPusher(b, p, o, dt, info, S, out) {
  const ph = S.ph, St = ph.stone, P = ph.P[p.id], th = ph.th, cx = tthHengeBrainX(p), rear = St.x - St.hw, front = St.x + St.hw, solo = cpuSolo(), Z = ph.lasso;
  const tow = !!(Z && Z.on);
  // the claw comes my way: whack it
  const clawOn = th.mode === 'hold' || (th.mode === 'pinch' && (th.sub === 'aim' || th.sub === 'reach'));
  if (tthHengeBrainSeen(b, 'claw', clawOn && tthHengeBrainClaw(S, p), 0.2) && tthBrainTap(b, 'whack', 0.3)) out.act = 'tap';
  // a sheep that nobody shoos (not on a hill): I go
  let sheep = null;
  for (const s of ph.sheep) if (s.s === 'graze' && s.x > front && (!sheep || s.x < sheep.x)) sheep = s;
  const mine = tthHengeBrainSeen(b, 'sheep', !!sheep && St.block === 'sheep' && St.grade === 0 && !tow, info.partnerCpu ? 6 : 3);
  if (mine && sheep) {
    if (solo) tthBrainSay(b, p, 'sheep', 'I\'ll shoo the sheep!', 8);
    if (tthHengeBrainGo(b, out, p, ph, sheep.x - 30, 22) || Math.abs(sheep.x - cx) < 50) { if (tthBrainTap(b, 'shoo', 0.3)) out.act = 'tap'; }
    return out;
  }
  // downhill: brake from the front (hold back toward the stone)
  const down = St.grade === -1 && !tow;
  if (down) {
    if (cx > front - 2 && !P.on) { out.left = true; out.right = false; }
    else tthHengeBrainGo(b, out, p, ph, front + p.w / 2 + 6, 3, false);
    return out;
  }
  // everywhere else (and for the tug of war): push from behind
  if (cx < rear + 2 && !P.on) { out.right = true; out.left = false; }
  else tthHengeBrainGo(b, out, p, ph, rear - p.w / 2 - 6, 3, false);
  // a person at the logs who needs a nudge
  if (solo && !info.partnerCpu) {
    if (tow && !ph.P[o.id].haul && tthHengeBrainSeen(b, 'lazyTow', true, 1.2)) tthBrainSay(b, p, 'haul', 'Haul with me!', 5);
    else if (!tow) tthHengeBrainSeen(b, 'lazyTow', false, 9);
    if (tthHengeBrainSeen(b, 'noLog', St.block === 'log' && !ph.P[o.id].log, 2.5)) tthBrainSay(b, p, 'log', 'A log in front, please!', 9);
    if (tthHengeBrainSeen(b, 'noBridge', St.block === 'stream', 3)) tthBrainSay(b, p, 'bridge', 'Logs in the stream!', 10);
  }
  return out;
}
function tthHengeBrainRoller(b, p, o, dt, info, S, out) {
  const ph = S.ph, K = TTHHENGE, St = ph.stone, P = ph.P[p.id], B = ph.brook, th = ph.th, cx = tthHengeBrainX(p), rear = St.x - St.hw, front = St.x + St.hw, solo = cpuSolo(), Z = ph.lasso;
  const tap = (key = 'act', every = 0.25) => { if (tthBrainTap(b, key, every)) out.act = 'tap'; };
  // the lasso is on: off the stone, feet on the ground, haul away from him
  if (Z && Z.on) {
    if (!tthHengeBrainSeen(b, 'tow', true, 0.18)) return out;
    if (P.on) { out.right = cx >= St.x; out.left = cx < St.x; } else out.right = true;
    if (solo && !ph.P[o.id].haul && tthHengeBrainSeen(b, 'lazyTow', true, 1.2)) tthBrainSay(b, p, 'haul', 'Haul with me!', 5);
    return out;
  }
  tthHengeBrainSeen(b, 'tow', false, 9); tthHengeBrainSeen(b, 'lazyTow', false, 9);
  // a person pushing who needs a nudge
  if (solo && !info.partnerCpu) {
    if (St.grade === -1 && St.run && St.v > 66) tthBrainSay(b, p, 'brake', 'Brake it from the front!', 6);
    else if (St.grade === 1 && St.v < -8) tthBrainSay(b, p, 'hold', 'Keep holding!', 6);
    else if (tthHengeBrainSeen(b, 'noPush', St.block === '' && Math.abs(St.v) < 2 && !St.push && !St.brake, 2.5)) tthBrainSay(b, p, 'push', St.grade === -1 ? 'Ease it down from the front!' : 'Push the stone!', 8);
  }
  // he dangles a stolen log: get under the claw and whack it
  if (th.mode === 'hold' && th.log && tthHengeBrainSeen(b, 'hold', true, 0.3)) {
    const q = tthThiefPts(S.thief).claw;
    if (tthHengeBrainClaw(S, p)) tap('whack', 0.3); else if (P.on) { out.left = q.x < St.x; out.right = !out.left; } else tthHengeBrainGo(b, out, p, ph, q.x, 30);
    return out;
  }
  if (th.mode !== 'hold') tthHengeBrainSeen(b, 'hold', false, 9);
  const pinch = th.mode === 'pinch' && (th.sub === 'aim' || th.sub === 'reach') ? th.log : null;
  let queued = false;
  for (const l of ph.logs) if (l.s === 'ground' && l.x > front + K.log.hi && l.x < front + K.log.hi + 70) queued = true;
  const hungry = St.block === 'log' || (St.block === '' && St.left < 100 && !queued);   // the nose shows (or will soon show) its "!"
  const nearBrook = !B.done && front > B.x0 - 340;
  let sheep = null;
  for (const s of ph.sheep) if (s.s !== 'flee' && s.x > front - 20 && s.x - front < 300 && (!sheep || s.x < sheep.x)) sheep = s;
  /* --- carrying a log --- */
  if (P.log) {
    if (pinch && tthHengeBrainClaw(S, p) && tthHengeBrainSeen(b, 'claw', true, 0.2)) { tap('whack', 0.3); return out; }
    if (!B.done && (St.block === 'stream' || (nearBrook && !hungry) || b.forBrook)) {
      // into the stream (from the bank, or from the front of the stone that waits there)
      if (cx > B.x0 - 36 && cx < B.x1 + 36) tap(); else tthHengeBrainGo(b, out, p, ph, B.x0 - 8, 8);
      return out;
    }
    if (cx > front - 4 && !P.on) {                       // on the ground in front of it
      if (cx < front + 170) { if (p.grounded) tap(); } else tthHengeBrainGo(b, out, p, ph, front + 60, 30);
      return out;
    }
    if (P.on && cx > front - K.log.topDrop + 14) { tap(); out.right = cx < front - 16; return out; }
    tthHengeBrainGo(b, out, p, ph, front - 22, 10, false);
    return out;
  }
  b.forBrook = false;
  /* --- empty hands: what next? --- */
  // a sheep on the track, close ahead (or it already stops the stone)
  if (sheep && (St.block === 'sheep' || (sheep.s === 'graze' && !hungry)) && tthHengeBrainSeen(b, 'sheep', true, 0.25)) {
    if (Math.abs(sheep.x - cx) < K.sheep.reach - 14 && !P.on) tap('shoo', 0.3); else if (P.on) out.right = true; else tthHengeBrainGo(b, out, p, ph, sheep.x - 26, 14);
    return out;
  }
  if (!sheep) tthHengeBrainSeen(b, 'sheep', false, 9);
  // the log to fetch: the one his claw wants first, else the nearest one lying free behind the stone
  let want = null;
  for (const l of ph.logs) {
    if (!tthHengeFree(ph, l) || l.lock > 0 || l.age < 0.15) continue;
    if (!(l.x < St.x || (St.block === 'log' && l.x > front + 150))) continue;
    if (l === pinch) { want = l; break; }
    if (!want || Math.abs(l.x - cx) < Math.abs(want.x - cx)) want = l;
  }
  // a pile: logs for the stream, or a spare after the mud ate one
  let pile = null;
  if (nearBrook && tthHengeLive(ph) < tthHengeMaxLogs(ph) + 1 && !(hungry && want)) pile = ph.piles.find(q => q.bridge);
  else if (tthHengeLive(ph) < tthHengeMaxLogs(ph) && !(hungry && want)) {
    for (const q of ph.piles) if (!q.bridge && q.x > S.cam.x + 20 && q.x < S.cam.x + W - 20 && (!pile || Math.abs(q.x - cx) < Math.abs(pile.x - cx))) pile = q;
  }
  // (things on the ground: first down from the stone, at the end nearer to them)
  const down = x => { if (!P.on) return false; out.left = x < St.x; out.right = !out.left; return true; };
  if (pile) {
    if (down(pile.x)) return out;
    if (Math.abs(pile.x - cx) < 34 && p.grounded) { tap('grab', 0.3); b.forBrook = pile.bridge; }
    else tthHengeBrainGo(b, out, p, ph, pile.x, 16);
    return out;
  }
  if (want) {
    if (down(want.x)) return out;
    if (Math.abs(want.x - cx) < K.log.reach - 10 && p.grounded) tap('grab', 0.3); else tthHengeBrainGo(b, out, p, ph, want.x, 12);
    return out;
  }
  // nothing to carry: wait where the next log rolls out, just behind the stone
  if (!down(rear - 44)) tthHengeBrainGo(b, out, p, ph, rear - 44, 16);
  return out;
}
TTH_BRAINS.henge = {
  reset(b) { b.seen = {}; b.ring = null; b.jumpT = 0; b.jumpCd = 0; b.stepT = 0; b.forBrook = false; },
  back(b) { b.seen = {}; b.jumpT = 0; },
  think(b, p, o, dt, info, S) {
    const ph = S.ph, out = { left: false, right: false };   // (always say both: "no key" is an answer too)
    if (!ph || !ph.stone || !p.alive) return out;
    if (ph.fin.stage > 0) return tthHengeBrainFinale(b, p, o, info, S, out);
    return p.id === ph.pusher ? tthHengeBrainPusher(b, p, o, dt, info, S, out) : tthHengeBrainRoller(b, p, o, dt, info, S, out);
  },
};
