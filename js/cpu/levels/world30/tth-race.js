/* Pip & Bo - Computer partner: 30-1 The Time Thief, era 'race' (Portal Race Home, versus). */
'use strict';

/* The computer is the OPPONENT here (versus inside the team level), at the saved Opponent setting: info.vs from
   tthVersusSkill (0.35 Easy / 0.7 Normal / 1 Hard), not cpuSkill (always 1 in a team level). It runs like a person who
   watches its own lane: its own runner (where it is, how fast, sliding or in the air, the dash bar under its feet) and
   the things coming up in the lane (about 700 px ahead, as the lane shows them), never the other lane. The same code
   drives Pip and Bo, so there is no side bias. Gold shoes and gold boosts help it exactly like a person.
     run     holds ▶ (Easy starts a moment after GO and lets go now and then, like a kid looking around).
     hop     logs, stones, hurdles, hot meteor rocks: taps ▲ so the top of the hop is over the thing (a floaty hop on the
             Moon), with a human timing error: a habit for this race plus a fresh wobble each time. Easy sometimes forgets.
     gaps    jumps from the middle of the stretch that clears the gap at its speed (inside the updraft where there is
             one, so the jump floats). Too slow to clear it: it jumps at the very edge anyway and hopes.
     slide   holds ▼ a moment before a lintel (Hard late and short, Easy early: slower but safe) and lets go once it is
             through. While ▼ is down it lets go of ▶, like a thumb on a touch pad.
     ice     once it is up to speed it keeps ▼ down for the long slide (the fast way), hopping the ice blocks out of the
             slide. Hard always, Normal mostly, Easy only under the arches.
     wind    ducks (▼) through a gust. Easy notices late ("Whoa!").
     dash    presses the action a moment after the bar is full (Hard at once, Easy a good while later), but keeps it
             for after a gust or a lintel that is right ahead.
   Nothing is frame-perfect: every press has its timing error (Hard about 0.02 s, Easy 0.075 s), and GO is answered
   after 0.13 s (Hard) to 0.5 s (Easy).
   In 1-player mode it says a few short things ("Race you home!", "Woohoo!", "Good race!"). While the person is away
   the core brain returns {} and the race freezes (the Thief waits), so it never wins alone.
   Tuning (bot runs, see the era's notes): Hard beats Easy nearly always from both sides; a kid-like scripted player
   (the 'kid' profile below, driven through this same code by tools/w30/race-balance.js) beats Easy most of the time. */
const TTHRACE_SK = {
  //        hop / jump timing spread and habit (s), forget, slide: lead before the lintel (s) + spread, wind: s late,
  //        dash: wait after the bar is full [from, to] s, ice: chance per lap to use the long slide, lapses per s, GO delay
  easy:   { sig: 0.075, bias: 0.03, miss: 0.14, lead: 0.36, lsig: 0.1, wind: 0.45, dash: [2.5, 7], ice: 0.25, lapse: 0.13, react: 0.5 },
  normal: { sig: 0.045, bias: 0.015, miss: 0.03, lead: 0.26, lsig: 0.06, wind: 0.12, dash: [0.5, 2], ice: 0.8, lapse: 0.025, react: 0.24 },
  hard:   { sig: 0.022, bias: 0.008, miss: 0, lead: 0.16, lsig: 0.03, wind: 0, dash: [0.12, 0.4], ice: 1, lapse: 0, react: 0.13 },
  // a kid-like person, for bot tests only (between Easy and Normal: sloppy timing, forgets sometimes, dashes when it remembers)
  kid:    { sig: 0.06, bias: 0.025, miss: 0.07, lead: 0.32, lsig: 0.08, wind: 0.3, dash: [1.2, 4], ice: 0.5, lapse: 0.06, react: 0.38 },
};
const tthRaceSkOf = s => (s <= 0.4 ? TTHRACE_SK.easy : s < 0.9 ? TTHRACE_SK.normal : TTHRACE_SK.hard);
const tthRaceGauss = () => (Math.random() + Math.random() + Math.random() - 1.5) * 2;   // about N(0, 1)

TTH_BRAINS.race = {
  SK: TTHRACE_SK,
  reset(bst) { bst.race = null; },
  think(bst, p, o, dt, info, S) {
    const out = {}, ph = S.ph, K = TTHRACE;
    if (!ph || !ph.R || ph.state === 'crown') return out;
    const k = p.id, r = ph.R[k], T = ph.T, sk = bst.sk || tthRaceSkOf(info.vs);
    // a new race: a fresh habit, fresh plans
    if (bst.race !== ph.R) { bst.race = ph.R; bst.bias = tthRaceGauss() * sk.bias; bst.plans = {}; bst.lapse = 0; bst.goT = null; bst.dashAt = null; bst.iceLap = -1; bst.iceOn = false; bst.held = 0; }
    if (ph.state === 'card') {
      if (ph.cardT < 2 && ph.raceN === 1 && !ph.replay) tthBrainSay(bst, p, 'hi', 'Race you home!', 60);
      else if (ph.cardT < 2 && ph.help[k]) tthBrainSay(bst, p, 'shoes' + ph.raceN, 'Gold shoes! Thanks!', 30);
      return out;
    }
    if (r.fin != null) {
      if (ph.end && ph.end.w === k) tthBrainSay(bst, p, 'won' + ph.raceN, 'Woohoo!', 30);
      else if (ph.end && ph.end.w === 1 - k) tthBrainSay(bst, p, 'lost' + ph.raceN, 'Good race!', 30);
      return out;
    }
    if (bst.goT == null) bst.goT = ph.t;
    if (ph.t - bst.goT < sk.react) return out;
    if (bst.lapse > 0) { bst.lapse -= dt; return out; }
    if (sk.lapse && ph.t > 2 && !r.air && !r.low && cpuChance(sk.lapse, dt)) { bst.lapse = 0.45 + Math.random() * 0.45; return out; }
    out.right = true;
    if (r.fallT > 0) return out;
    const plan = (key, make) => bst.plans[key] || (bst.plans[key] = make());
    const v = Math.max(90, r.v), th = T.laps[r.lap].th;
    let down = false, busy = false;   // busy: something right ahead that the dash should wait for
    tthRaceNear(T, r, q => {
      const d0 = q.x0 - r.x;
      if (d0 > 700) return false;
      if (q.x1 + K.hb < r.x) return;
      const key = q.kind + q.x;
      if (q.kind === 'h' || q.kind === 'm') {
        // the top of the hop over the middle of the thing
        const P = plan(key, () => ({ err: bst.bias + tthRaceGauss() * sk.sig, miss: Math.random() < sk.miss }));
        if (P.miss || P.done || q.hit[k] || r.air || r.stun > 0) return;
        const air = tthRaceJumpOf(T, r).air;
        if ((q.x - r.x) / v <= air / 2 + P.err) { out.jump = 'tap'; P.done = true; }
      } else if (q.kind === 'g') {
        // a gap: from the middle of the stretch that clears it (in the updraft, if it has one)
        const P = plan(key, () => ({ err: bst.bias + tthRaceGauss() * sk.sig, miss: Math.random() < sk.miss * 0.5 }));
        if (P.miss || P.done || r.air || r.stun > 0) return;
        let up = null;
        tthRaceNear(T, r, u => { if (u.kind === 'u' && Math.abs(u.x1 - q.x0) < 30) up = u; });
        const flo = !!(th.float || up), air = 2 * (flo ? K.float.v / K.float.g : K.jumpV / K.g), D = v * air;
        let lo = q.x1 - K.edge - D + 10, hi = q.x0 + K.edge - 4;
        if (up) { lo = Math.max(lo, up.x0 + 2); hi = Math.min(hi, up.x1); }
        const at = lo < hi ? (lo + hi) / 2 : hi;
        if (d0 < 260 && lo > hi) busy = false;   // (too slow for it: a dash now is just what it needs)
        if (r.x >= at + P.err * v) { out.jump = 'tap'; P.done = true; }
      } else if (q.kind === 'd') {
        // a lintel: slide a moment before it, up again once through
        const P = plan(key, () => ({ lead: Math.max(0.05, sk.lead + tthRaceGauss() * sk.lsig), miss: Math.random() < sk.miss, out: (1 - info.vs) * 0.25 * Math.random() }));
        if (P.miss) return;
        const t0 = (q.x0 - K.hb - r.x) / v;
        if (t0 < 0.5) busy = true;
        if (t0 <= P.lead && r.x < q.x1 + K.hb + 4 + P.out * v) down = true;
      } else if (q.kind === 'w') {
        // a gust: duck through it
        const P = plan(key, () => ({ late: sk.wind * (0.5 + Math.random()) }));
        if (d0 < 200) busy = true;
        if (r.x >= q.x0 - 6 + P.late * v && r.x <= q.x1) down = true;
      }
    });
    // ice: the long slide is the fast way, once up to speed
    if (th.ice && !down) {
      if (bst.iceLap !== r.lap) { bst.iceLap = r.lap; bst.iceUse = Math.random() < sk.ice; bst.iceOn = false; }
      const top = K.run + K.flow * Math.min(1, r.clean / K.flowT);
      if (bst.iceUse && r.stun <= 0) {
        if (r.v >= top - 12) bst.iceOn = true; else if (r.v < top - 70) bst.iceOn = false;   // (run up to speed first, then slide)
        if (bst.iceOn) down = true;
      }
    }
    if (down && !r.air) { out.down = true; if (r.low) out.right = false; }
    // the dash: a moment after the bar is full, but not into a gust or a lintel
    if (r.dashCd <= 0 && r.stun <= 0) {
      if (bst.dashAt == null) bst.dashAt = ph.t + sk.dash[0] + Math.random() * (sk.dash[1] - sk.dash[0]);
      if (ph.t >= bst.dashAt && !busy && !r.wind) { out.act = 'tap'; bst.dashAt = null; }
    } else bst.dashAt = null;
    return out;
  },
};
