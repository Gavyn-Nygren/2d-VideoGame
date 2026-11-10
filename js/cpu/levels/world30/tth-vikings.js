/* Pip & Bo - Computer partner: 30-1 The Time Thief, era 'vikings' (Viking Voyage, 1000 AD). */
'use strict';

/* The era gives each player a job (S.ph.rower rows, the other is the lookout) and swaps them at the two buoys, so
   the computer plays whichever job its player has right now, at full skill but like a person:
     ROWER    one press per drum beat, aimed at the beat with a small human error (most strokes "Perfect!", some
              "Good!"); never a second press on the same beat. It does not row a swamped ship (it waits for the
              bailing) and not during its hop to the bench. STEERING: it reads only what the fog has given up
              (h.seen: close to the bow, or spotted from the mast) and the Thief's jet-wave "!" lane, 0.16 s late
              (TTHVIKB.react), then taps up / down one lane at a time (about 4 taps a second at most) to the open
              lane of the next row of icebergs / the serpent's hoop, and out of a jet wave's lane.
     LOOKOUT  juggles the bucket and the mast. Stretch 1 (no fog dangers): stands at the bucket and bails whenever
              there is water. Later: up the mast until the hull is about half full (sooner in the rain), then slides
              down, bails it nearly dry (one press every 0.36 s) and climbs again. The grab: bails between the big
              waves, is on the mast top in time for each wave, and presses the action 0.14 s after the sunstone
              comes into reach (the gold ring); it never swipes early.
   It never clears the era alone: with an idle rower the ship does not move (the lookout cannot row), with an idle
   lookout the hull fills, the ship is swamped and the rower waits; the grab needs the rower's speed AND the
   lookout's hand. When the person is away the core brain stops the computer (no keep).
   In 1-player mode it says short bubbles: what it does, and what it needs ("Bail, please!", "Up the mast!",
   "Row on the beat!", "Grab it!"). It reads the same things a person sees or hears: the beat, the water gauge,
   the raven, spotted things, the wave, the reach ring. */
const TTHVIKB = { react: 0.16, grabReact: 0.14, err: 0.105, tap: 0.12, rest: 0.13, scoop: 0.36, bailHi: [0.22, 0.5, 0.5], bailRain: 0.34, bailLo: 0.06 };

// the lane to be in: the open lane of the next row the fog has given up, and never the lane of a coming jet wave
function tthVikBrainLane(ph) {
  const K = TTHVIK, cur = ph.lane, blocked = [false, false, false];
  let x0 = null, any = false;
  for (let i = ph.hi; i < ph.haz.length; i++) {
    const h = ph.haz[i];
    if (h.kind === 'jetmark' || h.done) continue;
    if (x0 != null && h.x - x0 > 90) break;
    if (!h.seen) { if (x0 == null) break; continue; }
    if (x0 == null) x0 = h.x;
    any = true;
    if (h.kind === 'gate') { for (let l = 0; l < 3; l++) if (l !== h.lane) blocked[l] = true; }
    else blocked[h.lane] = true;
  }
  let jet = -1;
  if (ph.jet && ph.jet.state !== 'back') jet = ph.jet.lane;
  for (const h of ph.humps) if (h.kind === 'jet' && !h.hit && h.sx > K.sternX) jet = h.lane;
  if (!any && jet < 0) return cur;
  let best = -1, bestD = 9;
  for (let l = 0; l < 3; l++) {
    if (blocked[l] || l === jet) continue;
    const d = Math.abs(l - cur) + (l === 1 ? 0 : 0.1);
    if (d < bestD) { bestD = d; best = l; }
  }
  if (best < 0) for (let l = 0; l < 3; l++) if (!blocked[l]) best = l;   // (a row matters more than a splash)
  return best < 0 ? cur : best;
}
function tthVikBrainRow(bst, p, o, dt, info, S, out) {
  const ph = S.ph, K = TTHVIK, B = TTHVIKB, L = ph.L, solo = !info.partnerCpu;
  const hopping = ph.seat && ph.seat.id === p.id;
  // the beat: one press for the next beat nobody has used yet
  bst.gap = Math.max(0, (bst.gap || 0) - dt);
  if (!hopping && !ph.swamped) {
    const m = Math.max(ph.claim + 1, Math.ceil((ph.beatT - 0.14) / ph.P));
    if (bst.m !== m) { bst.m = m; bst.err = (Math.random() + Math.random() - 1) * B.err; }
    if (ph.beatT >= m * ph.P + bst.err && bst.gap <= 0) { out.act = 'tap'; bst.gap = 0.3; }
  }
  // steering: what it saw 0.16 s ago; one lane per tap
  const want = tthBrainLate(bst, 'lane', ph.state === 'finale' ? ph.lane : tthVikBrainLane(ph), B.react);
  bst.tapT = (bst.tapT || 0) - dt;
  if (want !== ph.lane && !hopping) {
    if (bst.tapT <= -B.rest) bst.tapT = B.tap;
    if (bst.tapT > 0) { if (want < ph.lane) out.jump = true; else out.down = true; }
  } else if (bst.tapT <= 0) bst.tapT = -B.rest;
  if (solo) {
    const F = ph.fin;
    if (ph.t < 6) tthBrainSay(bst, p, 'hi', 'I row. You bail!', 60);
    else if (ph.swamped) tthBrainSay(bst, p, 'swamp', 'Too heavy! Bail us out!', 7);
    else if (ph.water > 0.68 && (L.onMast || Math.abs(L.x - K.bucketX) > K.bucketR)) tthBrainSay(bst, p, 'bail', 'Bail at the bucket, please!', 8);
    else if (F && F.wave && !F.wave.got && tthVikAtTop(ph) && F.reach) tthBrainSay(bst, p, 'grab', 'Grab it now!', 4);
    else if (F && F.wave && !F.wave.got && !tthVikAtTop(ph) && ph.water < 0.7) tthBrainSay(bst, p, 'top', 'Up to the mast top!', 7);
    else if (ph.state === 'sail' && ph.k > 0 && ph.caw && ph.cawT > 1.2 && !L.onMast && ph.water < 0.5) tthBrainSay(bst, p, 'mast', 'Up the mast! I can\'t see!', 9);
    else if (ph.spotT > 0.3) tthBrainSay(bst, p, 'ty', 'I see it! Thanks!', 14);
  }
  return out;
}
function tthVikBrainLook(bst, p, o, dt, info, S, out) {
  const ph = S.ph, K = TTHVIK, B = TTHVIKB, L = ph.L, F = ph.fin, w = ph.water, solo = !info.partnerCpu, bow = tthVikBow();
  if (ph.seat && ph.seat.id !== p.id && ph.state === 'swap' && ph.stT < 0.5) return out;   // just stood up: a breath
  // where to be: at the bucket ('bail') or up the mast ('watch')
  let mode = bst.mode || 'bail';
  if (F) {
    const wv = F.wave, front = wv ? wv.sx - K.fin.plat / 2 - K.fin.ramp : 9999;
    const coming = wv && !wv.got && !wv.broke && front < bow + 540;
    if (ph.swamped || w > 0.8) mode = 'bail';
    else if (coming) mode = 'watch';
    else mode = w > 0.25 || mode === 'bail' && w > 0.04 ? 'bail' : 'watch';   // between waves: bail, or wait up there
  } else if (ph.k === 0) mode = 'bail';
  else {
    const hi = ph.rain && ph.rain.state !== 'out' ? B.bailRain : B.bailHi[ph.k] || 0.5;
    if (ph.swamped || w > hi) mode = 'bail';
    else if (mode === 'bail' && w <= B.bailLo) mode = 'watch';
    else if (mode !== 'bail') mode = 'watch';
  }
  bst.mode = mode;
  if (mode === 'watch') {
    // (up is held on the way: the mast is grabbed in passing, as a person does it)
    if (!L.onMast) { out.jump = true; if (Math.abs(L.x - K.mastX) > 5) { if (L.x < K.mastX) out.right = true; else out.left = true; } }
    else if (L.h < tthVikMastTop()) out.jump = true;
  } else if (L.onMast) out.down = true;
  else if (Math.abs(L.x - K.bucketX) > K.bucketR - 12) { if (L.x < K.bucketX) out.right = true; else out.left = true; }
  else if (w > 0.02 && tthBrainTap(bst, 'scoop', B.scoop)) out.act = 'tap';
  // the grab: a moment after the sunstone comes into reach
  if (F && L.onMast) {
    bst.reachT = F.reach ? (bst.reachT || 0) + dt : 0;
    bst.grabCd = Math.max(0, (bst.grabCd || 0) - dt);
    if (bst.reachT >= B.grabReact && bst.grabCd <= 0) { out.act = 'tap'; bst.grabCd = 0.45; }
  }
  if (solo) {
    const idleRow = !ph.swamped && ph.t - ph.lastStrokeT > 3 && ph.v < 40 && ph.state !== 'swap';
    if (ph.t < 6) tthBrainSay(bst, p, 'hi', ph.k === 0 ? 'I bail. You row on the beat!' : 'I bail and keep watch!', 60);
    else if (idleRow) tthBrainSay(bst, p, 'row', 'Row on the drum beat!', 8);
    else if (F && F.wave && F.wave.broke) tthBrainSay(bst, p, 'fast', 'Faster! Row up the wave!', 8);
    else if (F && F.reach) tthBrainSay(bst, p, 'mine', 'Got you!', 6);
    else if (ph.spotT > 0.3) tthBrainSay(bst, p, 'spot', ph.k === 2 ? 'Serpent ahead!' : 'Iceberg ahead!', 6);
    else if (ph.swamped) tthBrainSay(bst, p, 'swamp', 'I bail us out!', 7);
    else if (ph.state === 'sail' && ph.k > 0 && mode === 'watch' && tthVikAtTop(ph)) tthBrainSay(bst, p, 'see', 'I can see far from up here!', 30);
  }
  return out;
}
TTH_BRAINS.vikings = {
  reset(bst) { bst.mode = 'bail'; bst.m = -1; },
  think(bst, p, o, dt, info, S) {
    const ph = S.ph, out = {};
    if (!ph || !ph.L || ph.state === 'won') return out;
    if (bst.job !== ph.rower) { bst.job = ph.rower; bst.mode = 'bail'; bst.m = -1; bst.tapT = 0; bst.reachT = 0; }
    return ph.rower === p.id ? tthVikBrainRow(bst, p, o, dt, info, S, out) : tthVikBrainLook(bst, p, o, dt, info, S, out);
  },
  back(bst) { bst.m = -1; bst.tapT = 0; bst.reachT = 0; bst._late_lane = null; },
};
