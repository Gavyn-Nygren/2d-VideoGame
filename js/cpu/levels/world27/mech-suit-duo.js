/* Pip & Bo - Computer partner brain for 27-1 Mech Suit Duo (mode 'mechduo'). */
'use strict';

(() => {
  /* 27-1 Mech Suit Duo (MODES.mechduo): G.mst.legs says who works the legs this zone; the other works the arms. Both
     read MODES.mechduo.plan(st), the same plan the job panels show: the next thing ahead (wall, gap, step, ledge, beam),
     how far it is from the mech's front, whether falling crates are about, and the arm height wanted.
     LEGS: walks right; stops at a standing wall or a ledge and waits for the arms; jumps a gap from just before its
     edge and a step from close to its face; holds ▼ from just before a low beam until the mech is past it. It waits
     while the mech wobbles after a Clonk.
     ARMS: taps ▲ / ▼ toward the wanted height (high under crates and at a ledge, the wall's spot at a wall), punches a
     wall in reach once the arm is there (about every 0.4 s), and grabs a ledge in reach with the arm high.
     It can't finish a zone alone: as the legs it can't punch or grab, as the arms it can't walk. In 1-player mode it
     says short things ("Punch the glowing spot!", "Arm up, grab the ledge!", "Walk on!"). Team brains play at full
     skill; it only reads what the panels show. */
  const MD = () => MODES.mechduo;
  cpuBrain('mechduo', {
    reset(S) { S.tap = 0; S.wait = 0; },
    think(S, p, o, dt, info) {
      const out = {}, st = info.mst;
      if (!st || !st.m || info.intro || st.state !== 'play' || st.onBreak) return out;
      const M = MD().MECH, pl = MD().plan(st), m = st.m, human = !info.partnerCpu;
      S.tap -= dt;
      if (st.climb || st.boing) return out;
      if (p.id === st.legs) {
        if (m.stun > 0) return out;
        let go = true;
        if (pl.kind === 'wall' && pl.dist < 8) go = false;
        if (pl.kind === 'ledge' && pl.dist < 6) go = false;
        if (go) out.right = true;
        if (pl.kind === 'gap' && pl.dist < 14 && pl.dist > -60 && m.grounded) out.jump = 'tap';
        if (pl.kind === 'step' && pl.dist < 30 && m.grounded) out.jump = 'tap';
        const beam = st.beams.find(b => b.x1 > m.x - 4 && b.x0 - (m.x + M.w) < 50);
        if (beam) out.down = true;
        if (human) {
          if (pl.kind === 'wall' && pl.dist < 10) cpuSay(p, pl.o.spot === 2 ? 'Punch up high!' : pl.o.spot === 0 ? 'Punch down low!' : 'Punch the middle!', 1.8);
          else if (pl.kind === 'ledge' && pl.dist < 10) cpuSay(p, 'Arm up, grab the ledge!', 1.8);
          else if (pl.crates && st.arm < 2) cpuSay(p, 'Arm up! Crates!', 1.6);
        }
        return out;
      }
      // the arms
      if (S.tap <= 0) {
        if (st.arm < pl.want) { out.jump = 'tap'; S.tap = 0.12; } else if (st.arm > pl.want) { out.down = true; S.tap = 0.12; }
      }
      if (pl.kind === 'wall' && pl.dist < M.reach - 6 && pl.dist > -6 && (st.arm === pl.o.spot || pl.o.gold) && st.punchCD <= -0.05) out.act = 'tap';
      if (pl.kind === 'ledge' && pl.dist < M.reach - 6 && st.arm === 2 && st.punchCD <= -0.05) out.act = 'tap';
      if (human) {
        const stopped = Math.abs(m.vx) < 5 && m.grounded;
        if (S.wait == null) S.wait = 0;
        S.wait = stopped && !(pl.kind === 'wall' && pl.dist < 10) && !(pl.kind === 'ledge' && pl.dist < 10) ? S.wait + dt : 0;
        if (S.wait > 2.5) cpuSay(p, pl.kind === 'gap' && pl.dist < 150 ? 'Jump the gap!' : pl.kind === 'beam' && pl.dist < 120 ? 'Duck under it!' : 'Walk on!', 1.8);
      }
      return out;
    },
  });
})();
