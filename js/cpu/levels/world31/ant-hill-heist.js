/* Pip & Bo - Computer partner brain for 31-2 Ant Hill Heist (mode 'antheist'). */
'use strict';

(() => {
  /* 31-2 Ant Hill Heist (MODES.antheist): both carry the crumb; there are no separate jobs. Both read
     MODES.antheist.plan(st), the same plan the prompts and HUD chips read. It runs the ants' own movement a moment
     ahead, so the computer freezes (▼) before an ant's zone reaches the crumb, waits while an ant or a column is in the
     way, lifts (▲) at steps, and pushes ▶ when the way is clear.
     With a person partner it never pushes alone (that drags the crumb and the scrape wakes sleeping soldiers): it pushes
     only while the person pushes too (or tapped ▶ in the last 0.35 s), and asks "Push with me!" when the way is clear and the person waits. At a step it
     presses ▲ right after the person does (or every 0.9 s, so a person pressing ▲ will meet it).
     It can't finish alone: the crumb only moves with two pushing, the level takes a break after 12 s with no person
     pressing anything, and the shared idle stop (CPU.idleStop) waits as well. Team brains always play at full skill. */
  const M = () => MODES.antheist;
  cpuBrain('antheist', {
    reset(S) { S.liftT = 0; S.react = 0; S.since = 9; S.hold = 0; },
    think(S, p, o, dt, info) {
      const out = {}, st = info.mst;
      if (!st || !st.c || info.intro || st.state !== 'go' || st.waiting || st.grab) return out;
      const pl = M().plan(st), cr = st.cr, human = !info.partnerCpu;
      S.liftT -= dt;
      // how long since the person last pushed ▶ (a person who taps ▶ instead of holding it still gets a partner)
      S.since = cr.push[o.id] > 0 ? 0 : S.since + dt;
      if (pl.act === 'freeze') { out.down = true; if (human && !cr.frozen[o.id]) cpuSay(p, 'Freeze! Hold ▼!', 1.2); return out; }
      if (pl.act === 'lift') {
        const mateJust = st.clock - st.liftAt[o.id] < 0.3;
        if (mateJust || S.liftT <= 0) { out.jump = 'tap'; S.liftT = 0.9; }
        if (human) cpuSay(p, 'Lift on three! ▲', 1.2);
        return out;
      }
      // after a "wait" it holds off for a moment, so following close behind an ant is a few clear pushes and not a
      // push on every other step
      if (pl.act === 'wait') S.hold = 0.3; else if (S.hold > 0) S.hold -= dt;
      if (pl.act === 'go') {
        if (S.hold > 0) return out;
        if (!human || S.since < 0.35) { S.react += dt; if (!human || S.react > 0.06) out.right = true; }
        else { S.react = 0; if (human) cpuSay(p, 'All clear! Push ▶ with me!', 1.4); }
        return out;
      }
      S.react = 0;
      if (human && pl.act === 'wait' && cr.push[o.id]) cpuSay(p, pl.why === 'march' ? 'Wait! The column!' : 'Wait! Let the ant pass!', 1.2);
      return out;
    },
  });
})();
