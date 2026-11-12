/* Pip & Bo - Computer partner brain for 34-1 Sea Serpent Chase (mode 'serpentchase'). */
'use strict';

(() => {
  /* 34-1 Sea Serpent Chase (MODES.serpentchase): G.mst.helm says who steers this stretch; the other is the harpooner.
     Both jobs read MODES.serpentchase.plan(st), the same plan the prompts and the HUD chips read.
     HELM: reads the threat list and steers into the row with the longest clear run, at least 0.5 s before trouble; uses
       Row! for closing loops, a snap with nowhere to go, or when the gap is low. While a lunge is in its tell and the
       harpooner is cranking at the mouth it holds its row (it only dodges in the last 0.3 s), so it never spoils a
       person's shot.
     HARPOONER: aims at the threat that lands soonest (mouth, tail tip, glob, throat), else a glowing scale; it works out
       the aim and crank with a quick bolt simulation, swings, cranks and lets go. It never wastes a crank on hide.
     Twitch guard: a row or an aim is kept for at least 0.3 s once chosen.
     With a person partner it says what it needs. It can't finish alone: the level takes a break after 12 s with no
     person pressing anything. Team brains always play at full skill. */
  const M = () => MODES.serpentchase;
  cpuBrain('serpentchase', {
    reset(s) { s.rowT = 0; s.aimT = 0; s.row = null; s.aim = null; s.tapUp = 0; s.tapDn = 0; },
    think(s, p, o, dt, info) {
      const out = {}, st = info.mst;
      if (!st || !st.ship || info.intro || st.state !== 'go' || st.waiting) return out;
      const pl = M().plan(st), sh = st.ship;
      s.rowT = Math.max(0, (s.rowT || 0) - dt); s.aimT = Math.max(0, (s.aimT || 0) - dt);
      if (p.id === st.helm) {
        // commit to a row for 0.3 s
        if (s.row === null || s.row === undefined || s.rowT <= 0) { if (pl.helm.row !== s.row) s.rowT = 0.3; s.row = pl.helm.row; }
        if (s.row < sh.row) out.jump = 'tap';
        else if (s.row > sh.row) { s.tapDn = (s.tapDn || 0) + 1; out.down = s.tapDn % 2 === 1; }
        else s.tapDn = 0;
        if (pl.helm.act) out.act = 'tap';
        const dx = pl.helm.x - sh.x;
        if (sh.burst <= 0) { if (dx > 12) out.right = true; else if (dx < -12) out.left = true; }
        if (!info.partnerCpu) {
          const lunge = st.threats.find(q => q.kind === 'lunge' && q.state === 'tell');
          if (lunge) cpuSay(p, 'Shoot the open mouth!', 1.2);
          else if (st.threats.some(q => q.kind === 'spit' && q.state === 'fly')) cpuSay(p, 'Pop that glob!', 1.0);
        }
      } else {
        const h = pl.harp;
        if (s.aim === null || s.aim === undefined || s.aimT <= 0) { if (h.aim !== s.aim) s.aimT = 0.3; s.aim = h.aim; }
        if (st.aim < s.aim) out.right = true; else if (st.aim > s.aim) out.left = true;
        if (h.target && st.reload <= 0) {
          if (st.goldBolts > 0) { if (st.aim === s.aim && st.aim === h.aim) out.act = 'tap'; }
          else if (!st.cranking) { if (st.aim === h.aim && h.crank > 0) out.act = true; }
          else out.act = !(h.fire || st.aim !== h.aim && st.crank > 0.95);
        }
        if (!info.partnerCpu) {
          const near = st.threats.find(q => (q.kind === 'coil' || q.kind === 'rock' || q.kind === 'arch') && q.x > sh.x && q.x - sh.x < 380 && !q.hit);
          if (near && near.kind === 'arch') cpuSay(p, 'Row! Get under the loop!', 1.2);
          else if (st.threats.some(q => q.kind === 'tail' && q.state === 'shadow' && q.row === Math.round(sh.ry))) cpuSay(p, 'Tail! Steer off the shadow!', 1.2);
          else if (st.threats.some(q => q.kind === 'dive' && q.state === 'bubbles' && q.row === Math.round(sh.ry))) cpuSay(p, 'Bubbles! Move the ship!', 1.2);
        }
      }
      return out;
    },
  });
})();
