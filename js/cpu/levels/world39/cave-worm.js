/* Pip & Bo - Computer partner brain for 39-3 Cave Worm Chase (mode 'caveworm'). */
'use strict';

(() => {
  /* 39-3 Cave Worm Chase (MODES.caveworm): both read MODES.caveworm.plan(st), the same plan the prompts and chips read.
     plan.tx[id] is where along the tunnel this hero should be (it runs faster or slower to get there, and keeps each
     choice for at least 0.25 s so it never shakes); plan.jump / slide / strike / throwAim / grab say what to press now.
     FORKS: both take the true tunnel (plan.lane). With a person pathfinder, the computer lurer only knows the true
       tunnel once the echo crystal has been rung (and waits 0.3 s more, like a person would); if it has not been rung
       by the mouth, it says "Which way?", throws down the low tunnel and takes the high one. A computer pathfinder
       with a person lurer says "Gem! That way!" when no gem has gone the other way by the last moment. A computer
       that is not the pathfinder follows a person who has already gone into a tunnel, rather than splitting up.
     It never throws a person's gems or swings their pick (it only presses its own buttons). */
  const M = () => MODES.caveworm;
  cpuBrain('caveworm', {
    reset(s) { s.lr = 0; s.lrT = 0; s.jumpT = 0; s.slideT = 0; s.sayT = 0; },
    think(s, p, o, dt, info) {
      const out = {}, st = info.mst, id = p.id;
      if (!st || !st.h || info.intro || st.waiting) return out;
      const h = st.h[id], solo = !info.partnerCpu;
      if (st.state === 'final') return finalThink(st, id, out);
      if (st.state !== 'go' || h.gulpT > 0) return out;
      const pl = M().plan(st), S = M().S, f = pl.fork, lurer = id === st.lurer, oid = 1 - id;
      // which tunnel at the next fork
      let lane = f ? f.lane : null;
      if (f && solo && h.x < f.F) {
        const other = st.h[oid];
        if (other.lane && f.lanes[oid] && other.x >= f.F) lane = f.lanes[oid];           // follow a person already in
        else if (lurer && (f.known < 0 || st.T - f.known < 0.3)) lane = 'up';            // not rung: the high one by default
      }
      // run: faster or slower toward tx, each choice kept 0.25 s
      let want = 0;
      const d = pl.tx[id] - h.x;
      if (d > 14) want = 1; else if (d < -14) want = -1;
      if (st.inhale) want = 1;
      s.lrT -= dt;
      if (want !== s.lr && (s.lrT <= 0 || st.inhale)) { s.lr = want; s.lrT = 0.25; }
      if (s.lr > 0) out.right = true; else if (s.lr < 0) out.left = true;
      // the tunnel choice: jump for the high one, never jump near the mouth of a low one
      let jump = pl.jump[id];
      if (f && h.x < f.F) {
        const tF = (f.F - h.x) / Math.max(st.v * 0.6, h.vx || st.v);
        if (lane === 'up' && tF > 0.16 && tF < 0.42 && h.ground) jump = 'hold';
        if (lane === 'low' && tF < 0.5 && (pl.why[id] === 'gem' || pl.why[id] === 'up')) jump = 0;
        if (lane === 'up' && tF < 0.6) out.right = true, out.left = false;
      }
      if (jump && h.ground && s.jumpT <= 0) { s.jumpT = 0.35; s.hold = jump === 'hold' ? 0.5 : 0.1; }
      s.jumpT -= dt;
      if (s.hold > 0) { s.hold -= dt; out.jump = out.jump || true; }
      if (pl.why[id] === 'gap' && !h.ground) { out.right = true; out.left = false; }
      // slide under roots (held through)
      if (pl.slide[id]) s.slideT = 0.2;
      if (s.slideT > 0) { s.slideT -= dt; if (!out.jump) out.down = true; }
      // the job
      if (lurer) {
        let aim = pl.throwAim[id];
        if (aim && pl.forkThrow && solo && f && (f.known < 0 || st.T - f.known < 0.3)) {
          // a person pathfinder has not rung the echo: ask, then throw down the low tunnel by default
          if (f.F - h.x > 200) { aim = null; say(s, p, 'Which way?'); }
          else { const q = M().predict(st, h.x + 8, h.y - 24, h.lane, 'fwd'); aim = !q.lost && q.lane === 'low' && q.x > f.F + 20 ? 'fwd' : (M().predict(st, h.x + 8, h.y - 24, h.lane, 'low').lane === 'low' ? 'low' : null); }
        }
        if (aim && st.throwT <= 0 && st.gemsLeft > 0) {
          out.act = 'tap';
          if (aim === 'up') out.jump = out.jump || true;
          if (aim === 'low') out.down = true;
          if (aim === 'back') { out.left = true; out.right = false; } else out.left = false;
        }
      } else {
        if (pl.strike[id] && st.strikeT <= 0) out.act = 'tap';
        if (solo && f && h.x < f.F && f.F - h.x < 140 && !f.lure && st.throwT > -9) say(s, p, 'Gem! That way!');
      }
      if (pl.grab[id] && st.inhale) { out.act = true; out.right = false; out.left = false; }
      return out;
    },
  });
  function say(s, p, str) { cpuSay(p, str, 1.4); }
  function finalThink(st, id, out) {
    const F = st.final, h = st.h[id];
    if (id === st.finder) {
      if (F.ph === 'strike') { if (h.x < M().ENDX - 100) out.right = true; else out.act = 'tap'; }
      if (F.ph === 'chain' && F.t > 0.5) out.act = 'tap';
    } else if (F.ph === 'look') out.act = 'tap';
    return out;
  }
})();
