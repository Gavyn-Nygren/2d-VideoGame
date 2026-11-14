/* Pip & Bo - Computer opponent brain for 37-4 Grand Joust (mode 'grandjoust', versus). */
'use strict';

(() => {
  /* 37-4 Grand Joust (MODES.grandjoust): the computer rides its own pass, reading MODES.grandjoust.plan(st, id), which
     holds only what a person can see (the pass clock, the hoofbeat, the other rider's lance and shield, hidden by the
     Sun twist, the gust warning). Versus brains use the Opponent setting (info.skill).
     FAIRNESS: it sees the other rider's lance and shield as they were a reaction time ago (Easy 0.5 s, Normal 0.3 s,
       Hard 0.2 s, never less), and nothing it sees from after the lock is used.
     GALLOP: one tap a beat, on the beat (within the window) with chance Easy 60%, Normal 82%, Hard 95%. Easy stops at
       Canter, Normal at Gallop, Hard rides for Thunder on most passes (65%).
     AIM AND GUARD: the best answer to what it sees is "lance where their shield isn't (High if it can: it hits
       harder), shield where their lance is".
       Easy picks early (favouring Middle) and holds; it looks once more at 1.3 s, half the time.
       Normal picks early, sometimes feints (goes one height and comes back), and answers once at a random moment
         60% of the time.
       Hard opens on the height the other rider leaves open most often this match (it remembers each lock), feints,
         keeps answering, and on most passes (70%) makes its last move just before the fumble window, timed for
         the steps it needs.
       Normal also keeps its shield on the other lance until 0.4 s before the lock.
     TWISTS: Crosswind: when the gust will come after the lock it aims one height higher and guards one lower (Normal
       half the rounds, Hard always). Sun: it keeps the last shield it saw. Champion's Lances: steps take longer,
       so it decides earlier.
     STRIKE: presses once at contact plus a random error with spread Easy 0.16 s, Normal 0.09 s, Hard 0.045 s. */
  const M = () => MODES.grandjoust;
  const gauss = () => { let u = 0; for (let k = 0; k < 4; k++) u += Math.random(); return (u - 2) / 0.577; }; // ~N(0, 1)
  cpuBrain('grandjoust', {
    noIdleStop: true, // (a versus match: if the person walks away the computer still rides, and the match ends)
    reset(S) { S.pass = null; S.habit = [0, 0, 0]; S.twistOk = {}; },
    think(S, p, o, dt, info) {
      const out = {}, st = info.mst;
      if (!st || !st.r || info.frozen || info.intro) return out;
      if (!G.match || G.match.phase !== 'live') return out;
      const pl = M().plan(st, p.id);
      if (!pl || pl.phase !== 'charge') { S.pass = null; return out; }
      const sk = info.skill, easy = sk < 0.5, hard = sk > 0.9, GJ = M().GJ;
      const id = p.id, fwd = id === 0 ? 'right' : 'left', back = id === 0 ? 'left' : 'right';
      const last = CPU.last[id] || {};
      const key = st.round + ':' + pl.pass + ':' + (G.match.round || 0);
      // ---- a new pass: plan it
      if (S.pass !== key) {
        S.pass = key; S.hist = []; S.tapN = -99; S.off = null; S.offN = null; S.struck = false; S.recorded = false;
        S.strikeAt = GJ.charge + gauss() * (easy ? 0.16 : hard ? 0.045 : 0.09);
        S.strikeAt = Math.max(GJ.charge - GJ.strikeOpen + 0.02, S.strikeAt);
        S.react = easy ? 0.5 : hard ? 0.2 : 0.3;
        const rk = st.round + ':' + (G.match.round || 0);
        if (S.twistOk[rk] === undefined) S.twistOk[rk] = hard || (!easy && Math.random() < 0.5);
        S.twist = S.twistOk[rk];
        // the opening choice
        let aim;
        if (easy) aim = Math.random() < 0.6 ? 1 : Math.random() < 0.5 ? 0 : 2;
        else if (hard && S.habit.some(n => n > 0)) aim = S.habit.indexOf(Math.max(...S.habit));
        else aim = Math.floor(Math.random() * 3);
        S.aim = aim; S.guard = aim === 2 ? 1 : 2;
        S.feint = !easy && Math.random() < (hard ? 0.5 : 0.3) ? { at: 0.5 + Math.random() * 0.4, back: 1.1 + Math.random() * 0.3, to: aim === 2 ? 1 : aim + 1, done: 0 } : null;
        S.answers = easy ? (Math.random() < 0.5 ? [1.3] : []) : hard ? [] : (Math.random() < 0.6 ? [1.1 + Math.random() * 0.7] : []);
        S.lastLook = -9; S.sharp = Math.random() < 0.7; S.goal = Math.random() < 0.65 ? 9 : 2.6; // (Hard: most passes it waits for the last moment)
      }
      // ---- what it sees, a reaction time late (and nothing from after the lock)
      const lockAt = GJ.charge - GJ.lock;
      if (pl.t < lockAt) S.hist.push({ t: pl.t, aim: pl.other.aim, guard: pl.other.guard });
      let seen = null;
      for (const h of S.hist) { if (h.t <= pl.t - S.react) seen = h; else break; }
      if (seen && seen.guard === null) { // hidden by the sun: the last shield it saw
        const lastSeen = S.hist.filter(h => h.t <= seen.t && h.guard !== null).pop();
        seen = { t: seen.t, aim: seen.aim, guard: lastSeen ? lastSeen.guard : null };
      }
      // the habit memory (Hard): which height the other rider leaves open at the lock
      if (pl.locked && !S.recorded) { S.recorded = true; if (pl.other.open !== null && pl.other.open !== undefined) S.habit[pl.other.open]++; }
      // ---- the best answer to what it saw
      const gustLate = pl.gust && pl.gust.afterLock && S.twist;
      const answer = sn => {
        if (!sn || sn.guard === null) return null;
        let theirGuard = sn.guard, theirAim = sn.aim;
        if (gustLate) theirAim = Math.max(0, theirAim - 1);
        const opts = [2, 1, 0].filter(h => h !== theirGuard);
        let aim = opts[0];
        if (gustLate) { // the gust will push my lance down a height: aim one above a hittable height
          const up = opts.map(h => h + 1).filter(h => h <= 2 && h - 1 !== theirGuard);
          aim = up.length ? Math.max(...up) : opts[0];
        }
        let guard = theirAim;
        if (guard === aim) guard = null; // (can't guard where my own lance is: keep the lance, the shield goes elsewhere)
        return { aim, guard };
      };
      if (pl.t < lockAt) {
        const stepT = pl.heavy ? GJ.heavyStep : GJ.step;
        // feints
        if (S.feint && !S.feint.done && pl.t >= S.feint.at) { S.feint.done = 1; S.feintFrom = S.aim; S.aim = S.feint.to; }
        if (S.feint && S.feint.done === 1 && pl.t >= S.feint.back) { S.feint.done = 2; S.aim = S.feintFrom; }
        // one-off answers (Easy, Normal)
        while (S.answers.length && pl.t >= S.answers[0]) {
          S.answers.shift();
          const a = answer(seen);
          if (a) { S.aim = a.aim; S.guard = a.guard; }
        }
        // Hard keeps answering, and makes its last move just before the fumble window
        // Normal keeps its shield on the other lance (until 0.4 s before the lock)
        if (!easy && !hard && pl.t > 0.8 && pl.toLock > 0.4 && seen && seen.guard !== null) {
          const ta = gustLate ? Math.max(0, seen.aim - 1) : seen.aim;
          if (ta !== S.aim) S.guard = ta;
        }
        if (hard && pl.t > 0.9 && (S.sharp || pl.toLock > 0.5)) {
          const a = answer(seen);
          if (a) {
            const steps = Math.abs(a.aim - pl.aim) + (a.guard !== null && a.guard !== pl.guard ? 1 : 0);
            const last = pl.toLock - GJ.fumbleWin - 0.03 - steps * stepT;
            if (last > 0 || steps === 0) { S.aim = a.aim; S.guard = a.guard; }
            else if (pl.toLock > GJ.fumbleWin + 0.02) { // not time for everything: the lance first
              if (Math.abs(a.aim - pl.aim) * stepT + 0.03 < pl.toLock - GJ.fumbleWin) S.aim = a.aim;
            }
          }
        }
        // Easy and Normal: a plain guard where the lance isn't, until they answer
        // never touch anything inside the fumble window (Normal and Hard know it; Easy is slow anyway)
        const late = pl.toLock < GJ.fumbleWin + 0.02;
        if (!late || easy && Math.random() < 0.02) {
          if (pl.want !== S.aim) {
            if (S.aim > pl.want) out.up = !last.up; else out.down = !last.down;
          } else if (!pl.stepping && S.guard !== null && S.guard !== pl.guard && S.guard !== pl.aim) {
            out[back] = !last[back];
          }
        }
      }
      // ---- the gallop: one tap a beat
      if (!pl.sd) {
        const goal = easy ? 1.6 : hard ? S.goal : 2.6;
        const b = pl.beat;
        if (S.offN !== b.n) {
          S.offN = b.n;
          const on = Math.random() < (easy ? 0.6 : hard ? 0.95 : 0.82);
          S.off = on ? (Math.random() - 0.5) * 1.6 * b.win : (Math.random() < 0.5 ? -1 : 1) * (b.win + 0.01 + Math.random() * 0.04);
        }
        if (pl.sp < goal && S.tapN !== b.n && b.d >= S.off && !b.tapped && !out[back] && !last[fwd]) { out[fwd] = true; S.tapN = b.n; }
      }
      // ---- the strike
      if (!S.struck && pl.t >= S.strikeAt) { S.struck = true; out.act = 'tap'; }
      return out;
    },
  });
})();
