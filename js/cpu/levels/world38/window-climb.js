/* Pip & Bo - Computer partner brain for 38-1 Skyscraper Window Climb (mode 'spyclimb'). */
'use strict';

(() => {
  /* 38-1 (MODES.spyclimb): both agents do the same job. The brain reads MODES.spyclimb.plan(st): each agent's leg of
     the stretch's route (climb to a point, a swing gap with its anchor and start marks, the hook), whether to clamp,
     and when to step off into a swing. On top of the plan it watches the live tells:
     - it clamps whenever a searchlight, a gust or the helicopter will reach it within 0.7 s (a still agent is already
       safe from lights, a clamped one from everything);
     - it steps off a window that is glowing or about to open, and never steps onto one;
     - it holds still while a Zero leans out of a window near it, and creeps (0.2 s on, 0.2 s off) past pigeons;
     - at a swing gap it starts only with no light, gust or helicopter due in the next 2.5 s; while hanging it holds
       the way it's going (the push is strong enough to reach in one swing), keeps the rope about S.swingL long, and
       after 1.2 s pumps with the swing; a dangle after a Slip climbs the rope back up to the partner;
     - as the anchor it stays clamped while the partner hangs, and says "Swing!" to a person who doesn't go;
     - it keeps within S.keep px of the partner when it's ahead, so the rope never drags anybody.
     With a person: whoever reaches a gap first swings; if the computer would swing and the person hasn't clamped at the
     gold ring in 5 s, the plan swaps them (the computer anchors). It knows the route and the light paths (the same
     ones a person sees sweeping). It can't finish alone: the level takes a break after 12 s with no person pressing. */
  const M = () => MODES.spyclimb;
  cpuBrain('spyclimb', {
    reset(s) { s.pulse = 0; s.waitT = 0; s.anT = 0; s.hold = 0; s.rope = false; },
    think(s, p, o, dt, info) {
      const out = {}, st = info.mst;
      if (!st || !st.ag || info.intro || st.state !== 'go' || st.waiting) return out;
      const m = M(), S = m.S, pl = m.plan(st), a = st.ag[p.id], b = st.ag[1 - p.id], P = pl.ag[p.id];
      if (!P) return out;
      // hanging: swing the way the plan goes, or climb back up after a slip
      if (a.st === 'hang') {
        if (!P.swingDir || !a.entry) { out.jump = true; return out; }
        let d = P.swingDir;
        if (a.hangT > 1.2) d = a.om > 0.3 ? 1 : a.om < -0.3 ? -1 : (s.pd || P.swingDir);
        s.pd = d;
        if (d > 0) out.right = true; else out.left = true;
        if (a.Lr < S.swingL - 12) out.down = true; else if (a.Lr > S.swingL + 14) out.jump = true;
        return out;
      }
      // the partner is hanging from the rope (a swing, or a dangle after a slip): we are the anchor, whatever the plan
      // says. Letting go would send both sliding down to the ledge.
      if (b.st === 'hang') { out.act = true; return out; }
      if (P.clamp) { out.act = true; anchorTalk(s, p, a, b, info, dt); return out; }
      // (a clamp for a tell is held at least 0.4 s, so it never flickers on and off)
      if (s.hold > 0) { s.hold -= dt; out.act = true; return out; }
      const clampFor = () => { s.hold = 0.4; out.act = true; return out; };
      const danger = m.dangerAt(st, a.x, a.y, 0.7);
      const myWin = m.winDanger(st, a.x, a.y, 0.6);
      if (myWin) return stepOff(st, m, a, P, out);
      if (danger) return clampFor();
      if (m.lookingNear(st, a.x, a.y)) return out;
      if (P.wait) {
        s.waitT += dt;
        if (!info.partnerCpu && s.waitT > 3) cpuSay(p, P.why === 'swing2' ? 'Clamp at the gold ring over there!' : 'Clamp at the gold ring! Then I swing.', 1.8);
        return out;
      }
      s.waitT = 0;
      if (P.swingDir) {
        // only go when nothing will catch us mid-swing
        const gx = P.swing.s1.x + P.swing.dir * S.swingL * 0.5, gy = P.swing.s1.y - 60;
        if (m.dangerAt(st, gx, gy, 2.5) || m.dangerAt(st, a.x, a.y, 2.5)) return clampFor();
        if (P.swingDir > 0) out.right = true; else out.left = true;
        return out;
      }
      if (!P.to) return out;
      // the rope is holding us short of where we're going: ask the person to come closer
      if (a.tautT > 1.2 && !info.partnerCpu) cpuSay(p, 'The rope is tight! Climb over this way.', 1.8);
      // keep the rope slack: the one ahead waits
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const ahead = a.leg > b.leg || (a.leg === b.leg && Math.hypot(a.x - P.to.x, a.y - P.to.y) < Math.hypot(b.x - P.to.x, b.y - P.to.y) - 10);
      if (s.rope && (d < S.keep - 30 || !ahead || P.kind !== 'go')) s.rope = false;
      if (d > S.keep && ahead && b.st !== 'hang' && P.kind === 'go') s.rope = true;
      if (s.rope) {
        const nx = a.x + Math.sign(P.to.x - a.x) * 6, ny = a.y + Math.sign(P.to.y - a.y) * 6;
        if (Math.hypot(nx - b.x, ny - b.y) > d) return out;
      }
      // creep past pigeons
      const nearPig = st.pig.some(q => !q.gone && Math.hypot(a.x - q.x, a.y - q.y) < 90);
      if (nearPig) { s.pulse = (s.pulse + dt) % 0.42; if (s.pulse > 0.2) return out; }
      const dx = P.to.x - a.x, dy = P.to.y - a.y;
      // creep the last few px onto a mark, so a late press doesn't overshoot it
      if (P.why !== 'climb' && Math.hypot(dx, dy) < 34) { s.pulse = (s.pulse + dt) % 0.2; if (s.pulse > 0.1) return out; }
      let mx = Math.abs(dx) > 3 ? Math.sign(dx) : 0, my = Math.abs(dy) > 3 ? Math.sign(dy) : 0;
      // never step onto a window that's glowing, open, or will open soon
      const look = 14;
      if (mx && m.winDanger(st, a.x + mx * look, a.y, 1.4) && !m.winDanger(st, a.x, a.y, 1.4)) mx = 0;
      if (my && m.winDanger(st, a.x, a.y + my * look, 1.4) && !m.winDanger(st, a.x, a.y, 1.4)) my = 0;
      // a light or gust coming soon where we're headed: wait clamped
      if ((mx || my) && m.dangerAt(st, a.x + mx * 30, a.y + my * 30, 0.5)) return clampFor();
      if (mx > 0) out.right = true; else if (mx < 0) out.left = true;
      if (my > 0) out.jump = true; else if (my < 0) out.down = true;
      return out;
    },
  });
  // off a glowing window: to the nearest good pane that isn't a window, the way we're going if we can
  function stepOff(st, m, a, P, out) {
    const W_ = m.W_, c = m.cellOf(a.x, a.y);
    const want = P.to ? [Math.sign(P.to.x - a.x), Math.sign(P.to.y - a.y)] : [0, 1];
    const opts = [[0, 1], [want[0] || 1, 0], [-(want[0] || 1), 0], [0, -1]];
    for (const [dc, dr] of opts) {
      const x = m.cx(c.c + dc), y = m.cy(c.r + dr);
      if (m.good(st, x, y) && !m.winDanger(st, x, y, 3) && Math.hypot(x - st.ag[1 - a.id].x, y - st.ag[1 - a.id].y) < m.S.rope - 4) {
        if (dc > 0) out.right = true; else if (dc < 0) out.left = true;
        if (dr > 0) out.jump = true; else if (dr < 0) out.down = true;
        return out;
      }
    }
    return out;
  }
  function anchorTalk(s, p, a, b, info, dt) {
    if (info.partnerCpu || b.st === 'hang') { s.anT = 0; return; }
    s.anT += dt;
    if (s.anT > 4) cpuSay(p, 'I\'m clamped! Swing across: hold toward the far glass.', 1.8);
  }
})();
