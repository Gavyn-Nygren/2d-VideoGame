/* Pip & Bo - Computer partner: 30-1 The Time Thief, era 'wright' (The First Flight, 1903). */
'use strict';

/* The plan (rules: js/levels/world30/tth-wright.js). The jobs are fixed per flight (S.ph.bal levels the wings, S.ph.eng
   pedals the engine) and swap after every landing, so the computer simply plays whichever seat its player sits in.
   It reads only what a person sees: the Flyer's tilt and height, the gust arrow, the pedal ring, the gauges, the sand
   ahead, the seagulls, the falling sandbag and its red target ring, the Thief's height in the catch.
   - On the launch rail it holds right. The Flyer only rolls while BOTH hold right, so it never takes off alone; in
     1-player mode it asks ("Hold right with me!").
   - WINGS: it leans against the tilt it saw about 0.14 s ago (plus a little of how fast the tilt is moving, the way
     a person lets go early), and into a gust that is blowing. It rings the bell only when a flock is close and the
     Flyer is still at the flock's height (so the engineer gets the first go at steering round it).
   - ENGINE: a steady tap every 0.5-0.62 s (when the pedal ring is home), never while the engine is flooded. Height:
     it holds the cruise height, climbs over the sand it sees ahead, dives under high flocks, climbs over low flocks
     and over a sandbag's red ring, holds up against a downdraft (it just sees the plane sink), and lets a hot
     engine cool unless the sand is close. In the catch it flies to the height under the Thief's claw and its next
     tap after the ring is full is the grab.
   It never clears alone: take-off needs both, nobody at the wings scrapes before the next flag, nobody pedalling
   sets the Flyer down, and the catch needs level wings AND the right height. While the person is away the core
   brain presses nothing for it. Short bubbles (1-player mode only) say what the person's job needs right now. */
function tthWrightBrainWings(bst, p, out, S) {
  const ph = S.ph, K = TTHWRIGHT, TK = K.tilt, EK = K.eng;
  if (ph.mode !== 'fly') { bst.lastTilt = ph.tilt; return out; }
  const raw = (ph.tilt - (bst.lastTilt == null ? ph.tilt : bst.lastTilt)) / DT;
  bst.lastTilt = ph.tilt; bst.rate = (bst.rate || 0) * 0.9 + raw * 0.1;
  let lead = ph.tilt + 0.2 * bst.rate;
  const g = ph.gust;
  if (g && g.kind !== 'down' && g.tel <= 0) lead += g.dir * 0.1;
  const want = ph.down ? 0 : lead > 0.07 ? -1 : lead < -0.07 ? 1 : 0, w = tthBrainLate(bst, 'lean', want, 0.14);
  out.left = w < 0; out.right = w > 0;
  // the bell: a flock is close and we are still at its height
  let ring = false;
  for (const f of ph.obs) {
    if (f.kind !== 'gulls' || f.scat || f.warn > 0) continue;
    const dx = f.x - ph.x;
    if (dx < K.bell.r0 + 20 || dx > 250) continue;
    if (ph.y + 30 > f.y0 + K.gulls.slack && ph.y - 30 < f.y1 - K.gulls.slack) ring = true;
  }
  if (tthBrainLate(bst, 'bell', ring, 0.16) && ring && ph.bell <= 0) { out.act = 'tap'; tthBrainSay(bst, p, 'bell', 'Ding ding! Shoo, gulls!', 9); }
  // what the engineer (the person) should do
  if (ph.down) tthBrainSay(bst, p, 'out', 'Pedal us up! Tap on the beat.', 7);
  else if (ph.hot > 0) tthBrainSay(bst, p, 'hot', 'Too hot! Ease off the climbing.', 9);
  else if (ph.catch && ph.catch.near && ph.catch.fill >= 1) tthBrainSay(bst, p, 'grab', 'Grab it!', 4);
  else if (ph.catch && ph.catch.near && !ph.catch.inY) tthBrainSay(bst, p, 'under', 'Fly right under his claw!', 7);
  else if (ph.spin < EK.flyMin && ph.free <= 0) tthBrainSay(bst, p, 'weak', 'Keep pedalling on the beat!', 8);
  return out;
}
function tthWrightBrainEngine(bst, p, out, S) {
  const ph = S.ph, K = TTHWRIGHT, EK = K.eng, TK = K.tilt, m = ph.mode;
  if (m !== 'fly' && m !== 'climb' && m !== 'hop' && m !== 'back' && m !== 'slip') return out;
  // the beat: a tap when the ring has been home for a moment
  if (bst.beat == null) bst.beat = 0.52;
  const full = !!(ph.catch && ph.catch.fill >= 1 && m === 'fly');
  if (ph.cough <= 0 && (ph.since >= bst.beat || (tthBrainLate(bst, 'grab', full, 0.2) && full && ph.since > 0.2))) {
    out.act = 'tap'; bst.n = (bst.n || 0) + 1; bst.beat = 0.5 + ((bst.n * 0.37) % 1) * 0.12;
  }
  if (m !== 'fly' || ph.down) return out;
  // the height to hold
  let lo = -1e9, hi = 1e9, target = K.cruise + 4, sand = 1e9;
  for (let k = -20; k <= 330; k += 35) sand = Math.min(sand, tthWrightGround(ph, ph.x + k));
  const maxY = sand - K.belly - 32;
  for (const f of ph.obs) {
    const dx = f.x - ph.x;
    if (f.kind === 'gulls' && !f.scat && f.warn <= 0 && dx < 470 && dx > -f.w / 2 - 105) { if (f.hi) lo = Math.max(lo, f.y1 + 36); else hi = Math.min(hi, f.y0 - 36); }
    else if (f.kind === 'bag' && f.state === 'fall' && dx < 440 && dx > -115) {
      // over it (it falls away under us), or under it when we are already well below where it is going
      const by = dx > 100 ? f.ty : f.y, under = by + 58 + f.vy * 0.9;
      if (bst.bag !== f) { bst.bag = f; bst.bagOver = (ph.y + 0.35 * ph.vy <= by + 12 && ph.hot <= 0) || under > maxY; }
      if (bst.bagOver && by - 62 > K.ceil + 8) hi = Math.min(hi, by - 62); else lo = Math.max(lo, under);
    }
  }
  if (ph.catch) target = ph.th.cy + K.catch.dy;
  if (lo > -1e8) target = Math.max(target, lo);
  if (hi < 1e8) target = Math.min(target, hi);
  target = clamp(Math.min(target, maxY), K.ceil + 6, 1e9);
  const err = ph.y + 0.15 * ph.vy - target, urgent = ph.y > maxY - 6 || hi < 1e8;
  let want = err > 7 ? -1 : err < -9 ? 1 : 0;
  if (want < 0 && ph.heat > 0.86 && !urgent) want = 0;   // let it cool
  const w = tthBrainLate(bst, 'climb', want, 0.14);
  if (w < 0) out.jump = true; else if (w > 0) out.down = true;
  // what the balancer (the person) should do
  if (Math.abs(ph.tilt) > TK.warn) tthBrainSay(bst, p, 'lean', ph.tilt > 0 ? 'Lean back! The nose is dropping!' : 'Lean forward! The tail is dropping!', 6);
  else if (ph.catch && ph.catch.near && !ph.catch.inTilt) tthBrainSay(bst, p, 'lvl', 'Hold the wings level!', 6);
  return out;
}
TTH_BRAINS.wright = {
  reset(bst) { bst.beat = 0.52; bst.n = 0; bst.rate = 0; bst.lastTilt = null; },
  think(bst, p, o, dt, info, S) {
    // (every key is always there: a harness that replays the last non-empty output must see the releases too)
    const ph = S.ph, out = { left: false, right: false, jump: false, down: false, act: false };
    if (!ph || !ph.mode) return out;
    if (ph.mode === 'rail') {
      out.right = ph.swap <= 0;
      if (!o.input.right && ph.modeT > 2.5) tthBrainSay(bst, p, 'rail', 'Hold right with me!', 7);
      return out;
    }
    return p.id === ph.bal ? tthWrightBrainWings(bst, p, out, S) : tthWrightBrainEngine(bst, p, out, S);
  },
  back(bst) { bst.lastTilt = null; bst.rate = 0; },
};
