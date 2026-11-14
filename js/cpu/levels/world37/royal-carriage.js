/* Pip & Bo - Computer partner brain for 37-1 Runaway Royal Carriage (mode 'royalcarriage'). */
'use strict';

(() => {
  /* 37-1 Runaway Royal Carriage (MODES.royalcarriage): G.mst.drv drives this stretch, the other is the roof hero. Both
     jobs read MODES.royalcarriage.plan(st), the same plan the prompts and the HUD chips read.
     DRIVER: holds the speed the plan asks for (Hyah before a ramp or gap with margin, whoa for the ox cart and at the royal
       stand), leans against the tilt's trend with a dead band and a little hysteresis so it does not flutter, holds the
       lean and speed steady while the partner is on the pole hitching, cracks the whip at animals, and takes the smoother
       (lower) road at forks. With a person on the roof who is still standing 0.5 s before a "Duck!" it slows down (longer
       tells). Patience: if the person has not gone for a loose strap in 4 s it slows to the minimum and says "The strap!";
       it never does the person's job for them.
     ROOF HERO: does the soonest thing (be on the roof for a jump, duck, the bandit on the horses, the crown, the luggage,
       a loose strap, then favours when nothing else is close). Commits to a target for at least 0.3 s.
     It can't finish alone: the level takes a break after 12 s with no person pressing anything. */
  const M = () => MODES.royalcarriage;
  cpuBrain('royalcarriage', {
    reset(s) { s.lean = 0; s.tgt = null; s.tgtT = 0; s.strapT = 0; s.lastDir = 0; },
    think(s, p, o, dt, info) {
      const out = {}, st = info.mst;
      if (!st || !st.car || info.intro || st.state !== 'go' || st.waiting) return out;
      const pl = M().plan(st), c = st.car, h = st.hero, rev = c.rev > 0;
      if (p.id === st.drv) {
        const D = pl.drv;
        let speed = D.speed;
        // a person on the roof who hasn't ducked yet: slow down so the tell is longer
        if (!info.partnerCpu) {
          const low = pl.ahead.find(a => a.kind === 'low' && a.t > 0 && a.t < 0.6);
          if (low && h.zone === 'roof' && !h.duck && speed === 'cruise') speed = 'slow';
          if (c.loose) { s.strapT += dt; if (s.strapT > 4 && h.zone !== 'pole') { speed = speed === 'fast' ? speed : 'slow'; cpuSay(p, 'The strap! Hop onto the pole!', 1.5); } } else s.strapT = 0;
          if (st.bandits.some(b => b.zone === 'horse' && b.state === 'reins')) cpuSay(p, 'Bandit on the horses! Shove him off!', 1.4);
        }
        // the speed (left / right are swapped while a bandit has the reins)
        const R_ = rev ? 'left' : 'right', L_ = rev ? 'right' : 'left';
        if (speed === 'fast') out[R_] = true;
        else if (speed === 'slow' || speed === 'stop') out[L_] = true;
        // the lean: hysteresis so it holds a side until the tilt is well back
        const trend = c.tilt + c.kickV * 0.25 + (st.bank ? st.bank.amt : 0) * 0.5 + (c.loose ? c.loose.side * 0.25 : 0) + c.push * 0.3;
        if (s.lean === 0) { if (trend > 0.12) s.lean = 1; else if (trend < -0.12) s.lean = -1; }
        else if (s.lean * trend < 0.03) s.lean = 0;
        const fk = pl.ahead.find(a => a.kind === 'fork' && !a.picked && a.t < 1.8);
        if (!fk) {
          const L = rev ? -s.lean : s.lean;
          if (L > 0) out.down = true; else if (L < 0) out.jump = true;
        }
        if (D.whip) out.act = 'tap';
        return out;
      }
      // ---- the roof hero
      const Rf = pl.roof;
      s.tgtT -= dt;
      if (!s.tgt || s.tgtT <= 0 || Rf.why === 'duck' || Rf.why === 'ramp') { const nt = { zone: Rf.zone, x: Rf.x }; if (!s.tgt || nt.zone !== s.tgt.zone || Math.abs(nt.x - s.tgt.x) > 12) s.tgtT = 0.3; s.tgt = nt; }
      const T = s.tgt;
      if (h.tumble > 0 || h.hop) return out;
      if (Rf.duck) { out.down = true; return out; }
      if (h.zone === 'roof') {
        if (T.zone === 'roof') {
          // arrive within 6 px, then stay put until the spot is 16 px away (turning to face steps a little, and must
          // not start a walk back the other way)
          const dx = T.x - h.x;
          if (Math.abs(dx) > (s.at ? 16 : 6)) { s.at = false; out[dx > 0 ? 'right' : 'left'] = true; }
          else { s.at = true; if (Rf.face && Rf.face !== h.face) out[Rf.face > 0 ? 'right' : 'left'] = true; }
        } else {
          out.right = true;
          if (h.x > M().R.roofR - 22) out.jump = 'tap';
        }
      } else if (h.zone === 'pole') {
        if (T.zone === 'horse') { out.right = true; out.jump = 'tap'; }
        else if (T.zone === 'roof') { out.left = true; out.jump = 'tap'; }
      } else if (h.zone === 'horse') {
        if (T.zone !== 'horse') { out.left = true; out.jump = 'tap'; }
      }
      // (a shove at most every 0.25 s, like a person, not a press every other step)
      s.shoveT = (s.shoveT || 0) - dt;
      if (Rf.hold) out.act = true;
      else if (Rf.act && s.shoveT <= 0) { out.act = 'tap'; s.shoveT = 0.25; }
      if (!info.partnerCpu) {
        if (Math.abs(c.tilt) > 0.6) cpuSay(p, 'Lean! We\'re tipping!', 1.2);
        else if (pl.drv.speed === 'fast' && st.v < M().S.rampV && pl.ahead.some(a => a.kind === 'ramp' && a.t < 1.6)) cpuSay(p, 'Faster! Jump coming!', 1.2);
        else if (pl.ahead.some(a => a.kind === 'ox' && a.t < 3)) cpuSay(p, 'Whoa! Ox cart!', 1.2);
      }
      return out;
    },
  });
})();
