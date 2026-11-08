/* Pip & Bo - Computer partner brain for 21-2 Kite Tandem. */
'use strict';

(() => {
  /* 21-2 Kite Tandem (MODES.kite): G.mst.runner says who runs this stretch; the other rides the kite. Both jobs read
     MODES.kite.plan(st), the same plan the prompts and the HUD panels read: the kite's target height past the obstacles
     ahead (the nearest free height between them, or a ring, a star or the flag when the sky is clear), the string
     length that would put the kite there without leaning, and the next gap or wall in front of the runner.
     RUNNER: holds ▶ all the way (the kite only flies while it runs), taps jump about 20 px before a gap's edge and
     about 44 px before a wall (chimney, crate, fence, step), and holds ▼ (reel) while the string is longer than the plan
     wants; it lets go so the wind lets the string out again. At the end it stops on the landing pad where the kite,
     with the string all the way out, sits right under the flag (it never reels in there).
     RIDER: holds ▲ while the kite is lower than the target and ▼ while it is higher (a small dead zone), slides ◀ ▶
     toward the flag at the tower, and tucks (the action) when birds are about to meet the kite and it is still in
     their way.
     It never cheats: it reads the same plan a person sees as prompts. It can't finish a stretch alone: as the rider it
     can't move the pair; as the runner the flag hangs higher than the kite flies without the rider leaning up.
     With a person it says short things ("Keep running!", "Reel in!", "Fly up!", "Grab the flag!"); bubbles only show in
     1-player mode (cpuSay). Team brains always play at full skill. */
  const M = () => MODES.kite;

  cpuBrain('kite', {
    reset(S) { S.said = 0; },
    think(S, p, o, dt, info) {
      const out = {}, st = info.mst;
      if (!st || !st.c || info.intro || st.state !== 'run') return out;
      const K = M().KITE, pl = M().plan(st), human = !info.partnerCpu, e = st.c.end;
      if (p.id === st.runner) {
        if (st.oops) return out;
        // run (and stop on the landing pad at the right spot)
        if (e && st.rx > e.x0 + 300) {
          const want = e.got ? clamp(st.rx, e.pad0 + 20, e.pad1 - 20) : clamp(e.flagX + st.L * Math.cos(st.th), e.pad0 + 20, e.pad1 - 20);
          const d = want - st.rx, stop = (st.vx * st.vx) / (2 * K.fric);
          if (d > 6 && (st.vx <= 0 || stop < d - 4)) out.right = true;
          else if (d < -6 && (st.vx >= 0 || stop < -d - 4)) out.left = true;
        } else out.right = true;
        // jump gaps and walls
        const j = pl.jump;
        if (j && st.grounded) {
          if (j.kind === 'gap' && j.dist < 22 && st.vx > 120) out.jump = 'tap';
          else if (j.kind === 'wall' && j.dist < 44) out.jump = 'tap';
        }
        // reel in while the string is longer than the plan wants (never at the flag)
        if (pl.needL != null && pl.why !== 'flag' && st.L > pl.needL + 10 && !(e && e.got)) out.down = true;
        if (human) {
          const r = o;
          if (pl.why === 'flag' && st.ky - pl.ty > 20) cpuSay(p, 'Fly up! Grab the flag!');
          else if (pl.why === 'dodge' && pl.dist < 300 && st.ky - pl.ty > 30) cpuSay(p, 'Fly up!', 1.2);
          else if (pl.why === 'dodge' && pl.dist < 300 && st.ky - pl.ty < -30) cpuSay(p, 'Go under!', 1.2);
          else if (st.tangle > 0) cpuSay(p, 'Oops! Tangled!', 1.2);
          void r;
        }
        return out;
      }
      // the rider: lean toward the target height, slide toward the flag, tuck past birds
      if (pl.ty != null) {
        const dy = st.ky - pl.ty, dead = pl.why === 'flag' ? 3 : 6;
        if (dy > dead) out.up = true;
        else if (dy < -dead) out.down = true;
      }
      if (pl.why === 'flag' && e) {
        const dx = e.flagX - st.kx;
        if (dx > 5) out.right = true; else if (dx < -5) out.left = true;
      }
      // birds about to meet the kite while it's still in their way: tuck
      for (const ob of st.c.obs) {
        if (ob.kind !== 'birds' || st.c.groups[ob.group].gold) continue;
        const ahead = ob.x0 - st.kx;
        if (ahead > 70 || ob.x1 < st.kx - 20) continue;
        if (st.ky > ob.top - K.kR && st.ky < ob.bot + K.kR && st.tuck <= 0 && st.tuckCd <= 0) { out.act = 'tap'; break; }
      }
      if (human) {
        if (st.lift < 0.5 && !M().onPad(st) && st.roomT > 5 && Math.abs(st.vx) < 40) cpuSay(p, 'Keep running!');
        else if (pl.needL != null && pl.why !== 'flag' && st.L > pl.needL + 50 && pl.dist < 360 && !st.reeling) cpuSay(p, 'Reel in! Hold down!', 1.4);
        else if (e && e.got && !M().onPad(st)) cpuSay(p, 'Got it! To the pad!');
        else if (e && !e.got && M().onPad(st) && st.reeling) cpuSay(p, 'Let the string out!');
      }
      return out;
    },
  });
})();
