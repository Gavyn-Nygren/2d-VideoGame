/* Pip & Bo - Computer opponent brain for 29-4 Throwing Star Duel (mode 'starduel'). */
'use strict';

(() => {
  /* 29-4 Throwing Star Duel (MODES.starduel): the computer duels like a person: it sees a star only a moment after it
     is thrown or batted back (Easy about 0.42 s, Normal 0.26 s, Hard 0.13 s), then makes up its mind once per star:
     deflect it (Hard mostly, Easy hardly ever), dodge it (duck under a high star, hop a low one), or blunder (stand
     there, or make the wrong move). It reads everything through MODES.starduel.plan(st, id), the same summary the
     prompts and panels use, and presses the same buttons a person would: ▼ to duck, ▲ to hop, the action to throw or
     swing. A deflect is a swing aimed at a moment inside the window, with some wobble: Hard's is small, Easy's often
     comes too early (a whiff).
     How to out-think it (on purpose, so Hard is beatable): two stars close together in different lanes muddle it, a
     quick duck-then-stand feint before a high throw makes it expect a low one, long rallies get harder for it too, and
     it can't swing while it is in the air or in the middle of its own throw.
     Its own throws: it waits a beat between stars (Hard 0.9-1.7 s, Normal about 1.3-2.6 s, Easy 2-4 s), mixes high and
     low (Easy mostly high), sometimes follows a star with one in the other lane, throws low at a ducking foe and high
     at a hopping one, and looks where the middle lantern
     will be before throwing (Hard nearly always, Easy seldom). It shuffles along its half now and then. Against a foe
     who camps in a duck, Normal and Hard often send two low stars close together (the second lands as the hop ends).
     It never touches level state: it only reads st and plan(). Both sides run the same code, mirrored. */
  const lerp = (a, b, u) => a + (b - a) * u;
  cpuBrain('starduel', {
    reset(S) { S.seen = {}; S.next = 1 + Math.random(); S.pend = null; S.goal = null; S.goalT = 0; S.foeDuck = -9; S.camp = 0; S.said = 0; S.round = 0; },
    bubblePos(p) { return { x: cpuCx(p), y: p.y - 14 }; },
    think(S, p, o, dt, info) {
      const out = {}, st = info.mst, M = MODES.starduel;
      if (!st || !st.pl || !M || !G.match) return out;
      const id = p.id, me = st.pl[id], foe = st.pl[1 - id], dir = id ? -1 : 1, D = M.test.SD;
      if (!S.seen) this.reset(S);
      if (S.round !== st.round || G.match.phase !== 'live') {
        // a new round (or a banner): forget the stars, wait a beat before the first throw
        S.round = st.round; S.seen = {}; S.pend = null; S.next = 0.5 + Math.random() * 0.9 + (1 - info.skill) * 0.8;
        if (G.match.phase === 'end' && st.res && st.res.winner === id) cpuSay(p, 'Good duel!', 1.6);
        if (G.match.phase !== 'live') return out;
      }
      if (st.res) return out;
      const sk = info.skill, u = clamp((sk - 0.35) / 0.65, 0, 1);   // 0 Easy, about 0.54 Normal, 1 Hard
      const u2 = Math.pow(u, 0.75);                                  // the same, bent so Normal sits a little nearer Hard
      const pl = M.plan(st, id);
      if (foe.duck) S.foeDuck = G.time;
      S.camp = foe.duck ? (S.camp || 0) + dt : 0;                    // how long the foe has sat in a duck
      if (me.dizzy > 0) { S.pend = null; return out; }
      const lag = lerp(0.42, 0.13, u);
      // notice the stars flying at me and decide, once per star (and again when it has been batted back)
      const coming = [];
      for (const s of st.stars) {
        if (s.dead || s.passed || s.dir !== -dir) continue;
        const key = s.id + ':' + s.bounces;
        let m = S.seen[key];
        if (!m) m = S.seen[key] = { at: G.time, plan: null, done: false };
        coming.push({ s, m, t: M.test.tti(s, me) });
      }
      coming.sort((a, b) => a.t - b.t);
      for (const c of coming) {
        if (c.m.plan || G.time - c.m.at < lag) continue;
        let blunder = lerp(0.34, 0.05, u2) + 0.035 * c.s.bounces;
        // muddled by a second star in the other lane close behind (or ahead of) this one
        if (coming.some(q => q !== c && q.s.lane !== c.s.lane && Math.abs(q.t - c.t) < 0.42)) blunder += lerp(0.3, 0.2, u);
        // fooled by a feint: the foe was ducking a moment before a fresh HIGH star
        if (c.s.lane === 0 && c.s.bounces === 0 && G.time - S.foeDuck < c.s.age + 0.3 && c.s.age < 0.6) blunder += lerp(0.32, 0.2, u);
        const parry = lerp(0.06, 0.72, u), r = Math.random();
        if (r < blunder) c.m.plan = Math.random() < 0.5 ? 'none' : 'wrong';
        else if (r < blunder + (1 - blunder) * parry) { c.m.plan = 'parry'; c.m.aim = 0.035 + Math.random() * lerp(0.2, 0.085, u); }
        else c.m.plan = 'dodge';
        if (c.m.plan === 'parry' && cpuSolo() && Math.random() < 0.15) cpuSay(p, 'Hi-yah!', 0.9);
      }
      for (const key in S.seen) if (!coming.some(c => c.s.id + ':' + c.s.bounces === key)) delete S.seen[key];
      // act on the most urgent star I have made up my mind about
      const c = coming.find(q => q.m.plan && q.t < 0.6);
      if (c) {
        S.pend = null;
        const low = c.s.lane === 1, t = c.t, kind = c.m.plan;
        if (kind === 'dodge') {
          if (low) { if (t <= 0.2 && pl.grounded) out.jump = 'tap'; }
          else if (t <= 0.3) out.down = true;
        } else if (kind === 'wrong') {
          if (low) { if (t <= 0.3) out.down = true; }
          else if (t <= 0.2 && pl.grounded) out.jump = 'tap';
        } else if (kind === 'parry') {
          if (low && t <= 0.36) out.down = true;
          if (!c.m.done && t <= c.m.aim && pl.grounded && pl.canAct && me.duck === low) { out.act = 'tap'; if (!CPU.last[id].act) c.m.done = true; }
        }
        return out;
      }
      // my own throws
      S.next -= dt;
      if (S.pend) {
        const q = S.pend;
        q.t += dt;
        out.down = q.low;
        if (q.t > 0.07 && me.duck === q.low && pl.grounded) { if (pl.canThrow) { out.act = 'tap'; if (!CPU.last[id].act) { S.pend = null; S.next = lerp(2.0, 0.9, u2) + Math.random() * lerp(2.0, 0.8, u2); if (S.combo) { S.combo = false; } else if (q.low && S.camp > 1 && Math.random() < 0.15 + 0.5 * u) { S.combo = true; S.next = 0.3; S.comboLow = true; } else if (Math.random() < 0.3 * u) { S.combo = true; S.next = 0.36; S.comboLow = !q.low; } } } }
        if (q.t > 0.8) S.pend = null;
        return out;
      }
      if (S.next <= 0 && pl.canThrow && pl.grounded && G.match.timeLeft > 0.4) {
        let low = Math.random() < lerp(0.25, 0.5, u);
        if (S.combo) low = S.comboLow;
        else if (Math.random() < 0.25 + 0.6 * u) {
          // aim where the foe is weak: high at a hopper (a hop clears low stars), low at a ducker
          if (foe.duck) low = true; else if (foe.h > 4) low = false;
        }
        // mind the lantern (Hard nearly always looks, Easy seldom)
        if (Math.random() < lerp(0.2, 0.92, u)) {
          if (pl.blocked[low ? 1 : 0]) { if (!pl.blocked[low ? 0 : 1]) low = !low; else { S.next = 0.12; low = null; } }
        }
        if (low !== null) S.pend = { low, t: 0 };
      }
      // shuffle along my half now and then (never while ducking for a throw)
      S.goalT -= dt;
      if (S.goalT <= 0) {
        S.goalT = 1.5 + Math.random() * 3;
        const [lo, hi] = D.side[id], span = hi - lo, r = Math.random();
        // the far third is safest; Hard likes the middle third, where its stars arrive sooner
        const back = id ? hi - span * r * 0.6 : lo + span * r * 0.6, mid = (lo + hi) / 2 + (Math.random() - 0.5) * span * 0.5;
        S.goal = Math.random() < 0.35 + 0.3 * u ? mid : back;
        if (Math.random() < 0.3) S.goal = null;
      }
      if (S.goal != null && !S.pend) { const dx = S.goal - me.x; if (Math.abs(dx) > 10) { out.left = dx < 0; out.right = dx > 0; } }
      return out;
    },
  });
})();
