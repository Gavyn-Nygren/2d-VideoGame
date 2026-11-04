/* Pip & Bo - Computer partner: plinko drop. */
'use strict';

(() => {
  /* Roles swap every drop: G.mst.ball is the chip, G.mst.steer slides the paddles. The computer reads only what the board
     shows a person: the chip, the paddles, the landing ring (st.shadow), the shining third of the paddle (st.cue, with a
     POWER sign when st.cuePow) and the gold arrow by the chip (st.chipDir).
     Chip: waits a moment on the chute so the partner sees the swap, rolls toward the JACKPOT side and drops. While it
     falls it leans the way the gold arrow points (a little late, like a person), and under the last paddle it may use
     a hop to swing toward the JACKPOT when it is far off.
     Paddles: keeps the live paddle under the chip, with the shining third under where the chip will land; once the
     landing ring shows it slides the shine onto the ring, and presses for a POWER kick just before the chip lands
     when the paddle asks for one. Skill sets reaction time and how close it puts the shine; it plays well at every skill.
     There is no idle pause in this level (the chip drops by itself after 8 s), so the core's 30 s rule is enough. */
  const CFG = () => MODES.plinko.CFG;
  const LAG = s => 0.24 - 0.18 * s;   // reaction time: easy 0.18 s, normal 0.11 s, hard 0.06 s

  // slide the live paddle to x without overshooting (the paddle speeds up and slows down at padAcc)
  function padSeek(out, pad, x) {
    const P = CFG(), d = x - pad.x, v = pad.vx;
    if (Math.abs(d) < 3) return;
    if (Math.sign(v) === Math.sign(d) && (v * v) / (2 * P.padAcc) >= Math.abs(d) - 2) return;   // let go and glide in
    out.left = d < 0; out.right = d > 0;
  }

  function chip(st, p, M, dt, info, out) {
    const P = CFG(), B = M.B, b = M.b;
    if (M.phase === 'aim') {
      if (G.introT > P.introLock) return out;
      if (st.aimX == null) {
        // roll toward the JACKPOT (the chute is short, so this is only a nudge), a bit off on easy
        const jx = B.slots[M.jp].cx;
        st.aimX = clamp(jx + (Math.random() - 0.5) * 60 * (1.2 - info.skill), B.chute.x0, B.chute.x1);
        st.wait = 0.7 + Math.random() * 0.6 + (info.partnerCpu ? 0 : 0.4);
      }
      const d = st.aimX - b.x;
      out.left = d < -4; out.right = d > 4;
      if ((M.aimT || 0) > st.wait && Math.abs(d) <= 4) out.down = 'tap';
      return out;
    }
    if (M.phase !== 'fall') return out;
    st.aimX = null;
    const dir = cpuLag(st, 'cdir', M.chipDir, LAG(info.skill) + 0.05);
    out.left = dir < 0; out.right = dir > 0;
    // under the last paddle and far from the JACKPOT: a sideways hop (normal and hard only)
    const under = M.pads.some(q => !q.nap && q.y - P.padH / 2 >= b.y + P.r - 2);
    if (!under && b.hops > 0 && !b.heavy && info.skill > 0.5 && b.vy > 0 && b.y < B.slotTop - 70) {
      const t = (B.slotTop - b.y) / Math.max(60, b.vy), err = B.slots[M.jp].cx - (b.x + b.vx * t);
      if (Math.abs(err) > 110 && Math.sign(err) === dir && (st.hopCD || 0) <= 0) { out.jump = 'tap'; st.hopCD = 0.6; }
    }
    st.hopCD = (st.hopCD || 0) - dt;
    return out;
  }

  function paddles(st, p, M, dt, info, out) {
    const P = CFG(), b = M.b;
    if (M.phase !== 'aim' && M.phase !== 'fall') { st.noise = null; return out; }
    if (G.introT > P.introLock || M.live < 0) return out;
    const pad = M.pads[M.live];
    if (st.noise == null || st.noisePad !== M.live) { st.noise = (Math.random() - 0.5) * 2 * 16 * (1 - info.skill); st.noisePad = M.live; }
    const z = M.cue === -1 || M.cue === 1 ? M.cue : 0;
    // where the chip will meet the paddle: the ring once it shows, before that a guess from where the chip is going
    const hitX = M.shadow !== null ? M.shadow : b.x + clamp(b.vx, -120, 120) * 0.25;
    const want = clamp(hitX - z * pad.w / 3 + st.noise, pad.x0, pad.x1);
    padSeek(out, pad, cpuLag(st, 'pad' + M.live, want, LAG(info.skill)));
    // the POWER kick: press just before the chip lands (the paddle's bump lasts 0.2 s)
    if (M.phase === 'fall' && M.cuePow && M.shadow !== null && b.vy > 0) {
      const tHit = (pad.y - P.padH / 2 - (b.y + P.r)) / b.vy;
      if (st.powFor !== M.live + ':' + M.d) {
        if (tHit < 0.09 + 0.03 * (1 - info.skill) && tHit > 0 && Math.abs(M.shadow - (pad.x + z * pad.w / 3)) < pad.w / 6 + 4) {
          st.powFor = M.live + ':' + M.d;
          if (Math.random() < 0.3 + 0.7 * info.skill) out.act = 'tap';
        }
      }
    }
    return out;
  }

  cpuBrain('plinko', {
    reset(st) { st.aimX = null; st.noise = null; },
    // the players are not drawn in this level: the chip is, and the paddles are
    bubbleHidden: true,
    bubblePos(p) {
      const M = G.mst;
      if (!M || !M.b) return null;
      if (M.ball === p.id) return { x: M.b.x, y: M.b.y - 12 };
      const pad = M.pads && M.pads[Math.max(0, M.live)];
      return pad ? { x: pad.x, y: pad.y - 10 } : null;
    },
    think(st, p, o, dt, info) {
      const M = info.mst, out = {};
      if (!M || !M.B || !M.b) return out;
      if (M.ball === p.id) chip(st, p, M, dt, info, out);
      else paddles(st, p, M, dt, info, out);
      // a person on the chute who waits: say how to drop
      if (!info.partnerCpu && M.ball === o.id && M.phase === 'aim' && (M.aimT || 0) > 3.5) cpuSay(p, 'Drop when ready!');
      return out;
    },
  });
})();
