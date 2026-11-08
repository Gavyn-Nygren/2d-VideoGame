/* Pip & Bo - Computer partner brain for 22-1 Submarine Duo. */
'use strict';

(() => {
  /* 22-1 Submarine Duo (MODES.subduo): G.mst.steer says who steers this stretch; the other works the claw. Both jobs read
     MODES.subduo.plan(st), the same plan the prompts and the HUD chips read: where the sub should sit (sx, sy) so the claw
     can reach the next thing, where the claw tip should go (tx, ty), and whether to grab or let go there. The things, in
     order: a pearl or shell a little ahead, the boulder (then the sandy hole while it is held), the floaty log (then a spot
     a bit further down its swing while it is held, and "let go" once it is nearly flat), Clammy's conch (then her mouth),
     and the buoy ring or the treasure chest at the end.
     STEERER: far from the spot it cruises at full speed along a free lane (MODES.subduo.lane: the heights between the roof,
     the floor, coral heads, boulders, turtles and pufferfish over the next 260 px), and near it it slows to a stop on the
     spot (a simple speed controller: it presses toward the speed it wants). Carrying a boulder or pulling a log it goes
     slowly. It toots when a sleepy pufferfish is just ahead in its way. It waits on the spot for the grabber, however slow.
     GRABBER: moves the claw toward the plan's tip spot (a small dead zone) and presses grab when MODES.subduo.canGrab says
     the press would catch the planned thing (or any pearl it passes); it presses again when the plan says let go. While
     the sub is still travelling the claw rests in front of the sub.
     The one shortcut: a pearl that the pair hasn't managed to grab after a while (7 s, 14 s with a person) is marked
     skip on the level state, so the plan, the prompts and both seats move on together.
     It can't finish a stretch alone: as the steerer it can't move a blocker or clip the ring; as the grabber it can't move
     the sub. In 1-player mode it says short things ("Grab it!", "Back up a bit!", "Pull it down!"). Team brains always play
     at full skill. */
  const M = () => MODES.subduo;
  const kindFor = { pearl: 'pearl', boulder: 'boulder', log: 'log', conch: 'conch', ring: 'ring', chest: 'chest' };

  cpuBrain('subduo', {
    reset(S) { S.pearl = null; S.pearlT = 0; S.tootCd = 0; S.stuckT = 0; S.lastX = 0; S.jig = 0; },
    think(S, p, o, dt, info) {
      const out = {}, st = info.mst;
      if (!st || !st.c || info.intro || st.state !== 'go' || st.waiting) return out;
      const D = M().SUBD, pl = M().plan(st), human = !info.partnerCpu, s = st.sub, cl = st.claw;
      // a pearl nobody manages to grab is skipped after a while (both seats and the prompts move on)
      if (pl.pearl) {
        if (S.pearl !== pl.pearl) { S.pearl = pl.pearl; S.pearlT = 0; }
        S.pearlT += dt;
        if (S.pearlT > (human ? 14 : 7)) pl.pearl.skip = true;
      } else S.pearl = null;
      if (p.id === st.steer) {
        // where to go: the plan's spot, or on along the canyon
        let sx = pl.sx, sy = pl.sy;
        if (sx == null || pl.why === 'none') { sx = s.x + 400; sy = s.y; }
        const dx = sx - s.x, far = Math.abs(dx) > 150, dir = dx >= 0 ? 1 : -1;
        const look = far ? 260 : Math.max(30, Math.abs(dx));
        const ly = M().lane(st, s.x, s.x + dir * look, far ? sy : sy);
        const cap = pl.why === 'carry' ? 120 : pl.why === 'pull' ? 95 : pl.why === 'give' ? 150 : 205;
        let vxD = far ? dir * cap : clamp(dx * 1.7, -cap, cap), vyD = clamp((ly - s.y) * 2.3, -170, 170);
        if (pl.why === 'wait') { vxD = 0; vyD = 0; }
        // stuck against something while travelling: wiggle up or down a moment
        if (far && Math.abs(s.x - S.lastX) < 0.3 && Math.abs(s.vx) < 15) S.stuckT += dt; else S.stuckT = Math.max(0, S.stuckT - dt);
        S.lastX = s.x;
        if (S.stuckT > 1.5) { S.jig = 0.8; S.jigDir = s.y > (M().ceil(st, s.x) + M().floor(st, s.x)) / 2 ? -1 : 1; S.stuckT = 0; }
        if (S.jig > 0) { S.jig -= dt; vyD = S.jigDir * 150; vxD = -dir * 60; }
        if (vxD - s.vx > 16) out.right = true; else if (vxD - s.vx < -16) out.left = true;
        if (vyD - s.vy > 16) out.down = true; else if (vyD - s.vy < -16) out.up = true;
        // toot a sleepy pufferfish out of the way
        if (S.tootCd > 0) S.tootCd -= dt;
        if (S.tootCd <= 0 && st.c.puffers.some(f => f.away <= 0 && f.x > s.x && f.x - s.x < 300 && Math.abs(f.y - s.y) < 110)) { out.act = 'tap'; S.tootCd = 3; }
        if (human) {
          const g = M().canGrab(st);
          if (g && (g.kind === kindFor[pl.why] || g.kind === 'pearl') && Math.hypot(s.vx, s.vy) < 50) cpuSay(p, g.kind === 'ring' ? 'Clip the ring!' : g.kind === 'chest' ? 'Grab the chest!' : 'Grab it!', 1.6);
          else if (pl.why === 'carry' && cl.hold && Math.abs(cl.x - pl.tx) < 50) cpuSay(p, 'Lower it in!', 1.6);
          else if (pl.why === 'pull') cpuSay(p, 'Pull it down!', 1.6);
          else if (pl.why === 'give') cpuSay(p, 'Pop it in her mouth!', 1.6);
          else if (s.wob > 0.6) cpuSay(p, 'Oops! Bonk!', 1.2);
        }
        return out;
      }
      // the grabber: the claw toward the plan's tip spot
      const sh = M().shoulder(st);
      let tx = pl.tx, ty = pl.ty;
      const reachable = tx != null && Math.hypot(tx - sh.x, ty - sh.y) < D.reach + 60;
      if (!cl.hold && !reachable) { tx = sh.x + 72; ty = sh.y + 44; }
      if (tx != null) {
        const want = cl.hold && cl.hold.kind === 'log' ? { ox: tx - sh.x, oy: ty - sh.y } : M().clampOff(tx - sh.x, ty - sh.y);
        const cx = cl.x - sh.x, cy = cl.y - sh.y;
        const ddx = want.ox - cx, ddy = want.oy - cy, dead = 5;
        if (ddx > dead) out.right = true; else if (ddx < -dead) out.left = true;
        if (ddy > dead) out.down = true; else if (ddy < -dead) out.up = true;
      }
      const g = M().canGrab(st);
      if (!cl.hold && g && (g.kind === 'pearl' || (pl.act === 'grab' && g.kind === kindFor[pl.why]))) out.act = 'tap';
      if (cl.hold && pl.act === 'release') out.act = 'tap';
      if (human) {
        const sx = pl.sx, far = sx != null && Math.hypot(sx - s.x, pl.sy - s.y) > 60 && Math.abs(sx - s.x) < 600;
        if (pl.why === 'carry' && far) cpuSay(p, 'Back up to the hole!', 1.8);
        else if (pl.why === 'pull' && far) cpuSay(p, 'Back up a bit!', 1.6);
        else if (pl.why === 'give' && far) cpuSay(p, 'Take me to Clammy!', 1.8);
        else if (pl.why === 'conch' && far) cpuSay(p, 'Get the conch!', 1.8);
        else if ((pl.why === 'boulder' || pl.why === 'log') && far) cpuSay(p, 'Steer closer!', 1.6);
        else if ((pl.why === 'ring' || pl.why === 'chest') && far) cpuSay(p, 'To the ring!', 1.6);
        else if (pl.why === 'pearl' && far && Math.abs(sx - s.x) < 200) cpuSay(p, 'A pearl! Slow down!', 1.4);
      }
      return out;
    },
  });
})();
