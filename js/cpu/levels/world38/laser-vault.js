/* Pip & Bo - Computer partner brain for 38-2 Laser Vault Heist (mode 'spyvault'). */
'use strict';

(() => {
  /* 38-2 (MODES.spyvault): the brain reads MODES.spyvault.plan(st), each agent's step on the stretch's route (where to
     stand, the pose, the mirror and its tilt, when to press), and on top of it:
     - timed beams (sweepers, blinkers): it waits at the plan's safe spot and only sets off when MODES.spyvault.pathClear
       says the whole crossing is clear at its own speed (the beams predicted from the level's own clock), then commits;
     - as MIRROR it walks to the catch spot, faces forward, raises the mirror, sets the tilt once and holds it until the
       runner is through (plus 0.4 s, in the plan), and never lowers it while lowering would zap anybody (safeToLower);
     - as RUNNER it waits at the mark until the way is open, checks the crossing is clear, goes, and presses far-side
       buttons at once; it ducks (or slides) under waist and head beams and jumps the ankle ones;
     - with a person: "Go!" if the person runner hasn't gone 5 s after the way opened, the tilt the lens needs if the
       person mirror holds the wrong one. It never does the person's job. */
  const M = () => MODES.spyvault;
  cpuBrain('spyvault', {
    reset(s) { s.commit = false; s.chk = 0; s.ok = false; s.tapT = 0; s.openT = 0; s.sayT = 0; },
    think(s, p, o, dt, info) {
      const out = {}, st = info.mst;
      if (!st || !st.ag || info.intro || st.state !== 'go' || st.waiting) return out;
      const m = M(), S = m.S, pl = m.plan(st), a = st.ag[p.id], b = st.ag[1 - p.id], P = pl.ag[p.id];
      if (!P) return out;
      const isMir = p.id === st.mirId;
      s.tapT -= dt; s.chk -= dt;
      // the mirror
      if (isMir && P.mirror) {
        if (!a.mirror && a.face < 0) { out.right = true; return out; }
        out.act = true;
        if (a.mirror && P.tilt != null && a.tilt !== P.tilt && s.tapT <= 0) { s.tapT = 0.45; if (P.tilt > a.tilt) out.jump = true; else out.down = true; }
      }
      // partner talk (a person partner only)
      if (!info.partnerCpu) talk(s, p, a, b, P, pl, st, dt);
      if (P.act) out.act = P.act;
      if (P.to == null) return out;
      const dx = P.to - a.x, dir = Math.sign(dx);
      if (Math.abs(dx) < 3) { s.commit = false; return out; }
      const speed = isMir ? (a.mirror ? S.slow : S.walk) : (P.pose === 'duck' ? S.crawl : S.run);
      // timed beams: wait at the safe spot until the whole crossing is clear, then commit
      if (P.why === 'time') {
        if (s.commit !== P.step) s.commit = false;
        if (!s.commit) {
          if (a.mirror) return out; // (lower it first: the crossing is timed at walking speed)
          if (a.x < P.wx - 3) { move(out, a.x < P.wx ? 1 : -1); return out; }
          if (s.chk <= 0) { s.chk = 0.08; s.ok = m.pathClear(st, a, P.to, isMir ? S.walk : S.run, 'stand', 0, 5); }
          if (!s.ok) return out;
          s.commit = P.step;
        }
        move(out, dir); return out;
      }
      s.commit = false;
      // the runner crossing an opened way: check it's really clear first (a gate held by a person can drop)
      if (!isMir && (P.why === 'under' || P.why === 'button') && !P.crossing) {
        if (s.chk <= 0) { s.chk = 0.08; s.ok = m.pathClear(st, a, Math.min(P.to, a.x + 140), speed, 'stand', 0.05, 1.2); }
        if (!s.ok && !inZone(st, a)) return out;
      }
      if (P.jumpAt != null && a.ground && a.x >= P.jumpAt - 2 && a.x < P.jumpAt + 24) out.jump = 'tap';
      if (P.pose === 'duck') out.down = true;
      move(out, dir);
      return out;
    },
  });
  const move = (out, d) => { if (d > 0) out.right = true; else if (d < 0) out.left = true; };
  // already under a held beam: keep going rather than stop inside it
  function inZone(st, a) {
    const pl = MODES.spyvault.plan(st), P = pl.ag[a.id];
    return P.spot != null && a.x > P.spot - 30;
  }
  function talk(s, p, a, b, P, pl, st, dt) {
    const Pb = pl.ag[b.id];
    s.sayT -= dt;
    if (p.id === st.mirId && P.why === 'hold' && a.mirror && (Pb.why === 'under' || Pb.why === 'button')) {
      s.openT += dt;
      if (s.openT > 5 && s.sayT <= 0) { s.sayT = 4; cpuSay(p, 'Go! I\'ve got the beam.', 1.8); }
    } else s.openT = 0;
    if (p.id === st.runId && (Pb.why === 'hold' || Pb.why === 'aim') && b.mirror && Pb.tilt != null && b.tilt !== Pb.tilt && s.sayT <= 0) {
      s.sayT = 4; cpuSay(p, (Pb.tilt > b.tilt ? 'Tilt it up' : 'Tilt it down') + ', toward the green lens!', 1.8);
    }
  }
})();
