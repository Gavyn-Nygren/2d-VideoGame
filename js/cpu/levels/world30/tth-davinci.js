/* Pip & Bo - Computer partner: 30-1 The Time Thief, era 'davinci' (Leonardo's Flying Machine, the 1490s). */
'use strict';

/* The flying machine has two jobs and the era hands them out (they swap seats on both towers), so the brain plays
   whichever job its player has right now (S.ph.flap is the flapper's id) and never has to choose or fight over one.
   It reads only what a person sees on the screen: the machine's height and speed, the wing meter, the trail of
   pages (tthVinciAim), the towers / clouds / banners that are on screen, a flock of pigeons once it flies in, the
   Thief's slipstream and the plans case in his claw.

   FLAPPER (tthVinciBrainFlap)
   - A steady beat like a person tapping in time: one press every TTHVINCI_BOT.beat s (about 2 a second, which the
     wing meter can keep up for ever), never while the meter is too low for a full beat, never while the wings are
     tired, a short breath after a bump. On a tower it waits a human moment, then takes off with the first beat.
   - A slow person at the tiller: after 2 bumps in a short while it flaps a slower beat for a few seconds (the
     machine flies slower, so the person has more time to steer) and says so.
   - It cannot steer: with nobody at the tiller the machine flies level into the next tower and pops back, for ever.
   STEERER (tthVinciBrainSteer)
   - It looks at where the trail is a little ahead (further ahead when fast), compares it with where the machine will
     be in a moment, sees that 0.14 s late (a person's reaction time) and holds up or down until it is close (with a
     little slack so it does not flutter). It keeps clear of the tower, cloud or banner right in front of it.
   - In the chase it aims for the middle of the Thief's slipstream; when his jet sputters, for the plans case.
   - Pigeons: it follows the trail (which goes round them) and toots the horn 0.25 s after a flock in front of it
     comes close to its height.
   - With no wingbeats it holds the nose up (a longer glide) and asks for flaps; on the ground it waits for the
     flapper. So it never gets anywhere alone either.
   The core brain already stops everything while the person is away (info.away) and during cards and cutscenes. */
const TTHVINCI_BOT = { beat: 0.5, jitter: 0.08, slowBeat: 0.72, takeOff: 0.45, react: 0.14, dead: 13, keep: 4, toot: 0.25 };

function tthVinciBrainFlap(bst, p, o, dt, info, S) {
  const K = TTHVINCI, B = K.beat, Q = TTHVINCI_BOT, ph = S.ph, g = ph.g, out = {};
  bst.cool = Math.max(0, (bst.cool || 0) - dt);
  bst.slowT = Math.max(0, (bst.slowT || 0) - dt);
  if (ph.mode === 'perch') {
    const wait = cpuFor(bst, 'ready', !!ph.perch.ready, dt);
    if (wait > Q.takeOff && bst.cool <= 0) { out.act = 'tap'; bst.cool = Q.beat; tthBrainSay(bst, p, 'go', 'Here we go! You steer!', 20); }
    return out;
  }
  if (ph.mode !== 'fly') return out;
  // bumps seen: after two in a short while, a slower beat for the person at the tiller
  const bumps = S.stats.team;
  if (bst.bumps != null && bumps > bst.bumps) {
    bst.cool = Math.max(bst.cool, 0.35);
    if (!info.partnerCpu) {
      if (info.time - (bst.lastBump || -99) < 9) { bst.slowT = 7; tthBrainSay(bst, p, 'slow', 'I\'ll flap slower. Take your time!', 14); }
      bst.lastBump = info.time;
    }
  }
  bst.bumps = bumps;
  if (g.bounce) return out;
  if (g.tired > 0) { bst.cool = Math.max(bst.cool, 0.25); return out; }
  if (bst.cool <= 0 && g.en >= B.cost + 0.04) {
    out.act = 'tap'; bst.cool = (bst.slowT > 0 && !g.landed ? Q.slowBeat : Q.beat) + (Math.random() - 0.5) * Q.jitter;   // (nobody taps like a metronome)
    if (g.landed) tthBrainSay(bst, p, 'up', 'Up we go again!', 10);
  }
  const ch = ph.chase;
  if (ch && ch.phase === 'dive') tthBrainSay(bst, p, 'dive', 'Dive! Dive!', 12);
  else if (ch && ch.phase === 'tail' && !ch.in && ch.t > 6) tthBrainSay(bst, p, 'tail', 'Get right behind his jet!', 12);
  return out;
}

function tthVinciBrainSteer(bst, p, o, dt, info, S) {
  const K = TTHVINCI, Q = TTHVINCI_BOT, ph = S.ph, g = ph.g, c = ph.c, out = {};
  if (ph.mode === 'perch') { if (ph.perch.ready && cpuFor(bst, 'perch', true, dt) > 2.5) tthBrainSay(bst, p, 'flapgo', 'Flap, and I\'ll steer!', 9); return out; }
  cpuFor(bst, 'perch', false, dt);
  if (ph.mode !== 'fly' || g.bounce) { bst.dir = 0; return out; }
  if (g.landed) { bst.dir = 0; if (cpuFor(bst, 'down', true, dt) > 1.5) tthBrainSay(bst, p, 'landed', 'Flap us up, please!', 8); return out; }
  cpuFor(bst, 'down', false, dt);
  // where to fly: the trail a little ahead, the slipstream, the plans case; clear of what is right in front
  let aim = tthVinciAim(S, 50 + g.v * 0.42);
  for (const ob of c.obs) {
    if (ob.x0 > g.x + K.hw + 130) break;
    if (ob.x1 < g.x - K.hw - 6) continue;
    if (!ob.low) aim = Math.max(aim, ob.y + K.hh + 20);
    else aim = Math.min(aim, (ob.kind === 'dome' ? tthVinciBrainDome(ob, g.x) : ob.y) - K.hh - 20);
  }
  const lift = g.liftT > 0;
  // what a person sees, a moment late: how far the machine will be from that height shortly
  const err = cpuLag(bst, 'err', aim - (g.y + g.vy * 0.22), Q.react);
  const dir = bst.dir || 0;
  if (dir < 0) bst.dir = err < -Q.keep ? -1 : 0;
  else if (dir > 0) bst.dir = err > Q.keep ? 1 : 0;
  else bst.dir = err < -Q.dead ? -1 : err > Q.dead ? 1 : 0;
  // no wingbeats: glide with the nose up (unless the way is down) and ask for flaps
  const noLift = cpuFor(bst, 'nolift', !lift, dt);
  if (!lift && bst.dir === 0 && err < 30) bst.dir = -1;
  if (noLift > 1.2) tthBrainSay(bst, p, 'flap', g.tired > 0 ? 'Slow, steady beats!' : 'Flap, please!', 7);
  if (bst.dir < 0) out.jump = true; else if (bst.dir > 0) out.down = true;
  // pigeons in front, near this height: toot the horn
  let threat = false;
  for (const f of c.flocks) if (f.state === 2 && f.wx > g.x + 30 && f.wx < g.x + K.flock.shoo - 40 && Math.abs(f.y - g.y) < ph.flockR + 70) threat = true;
  if (cpuFor(bst, 'birds', threat, dt) > Q.toot && ph.shooCd <= 0) out.act = 'tap';
  const ch = ph.chase;
  if (ch && ch.phase === 'dive') tthBrainSay(bst, p, 'dive', 'Flap! I\'ll grab the plans!', 12);
  else if (ch && ch.phase === 'tail' && ch.in) tthBrainSay(bst, p, 'slip', 'We\'re in his slipstream!', 15);
  return out;
}
// the top of the dome under the machine (a person sees its round shape)
function tthVinciBrainDome(ob, x) {
  const K = TTHVINCI, cx = (ob.x0 + ob.x1) / 2, hw = (ob.x1 - ob.x0) / 2, a = x - K.hw - 30, b = x + K.hw + 130;
  if (a < cx + 13 && b > cx - 13) return ob.y - K.lantern;
  const u = Math.min(1, Math.abs(clamp(cx, a, b) - cx) / hw);
  return ob.base - (ob.base - ob.y) * Math.sqrt(1 - u * u);
}

TTH_BRAINS.davinci = {
  reset(bst) { bst.cool = 0.3; bst.dir = 0; bst.slowT = 0; bst.bumps = null; },
  think(bst, p, o, dt, info, S) {
    const ph = S.ph;
    if (!ph || !ph.g || ph.mode === 'won') return {};
    return p.id === ph.flap ? tthVinciBrainFlap(bst, p, o, dt, info, S) : tthVinciBrainSteer(bst, p, o, dt, info, S);
  },
  back(bst) { bst.cool = 0.4; bst.dir = 0; },
};
