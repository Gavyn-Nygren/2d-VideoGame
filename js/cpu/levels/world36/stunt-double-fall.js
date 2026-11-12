/* Pip & Bo - Computer partner brain for 36-3 Stunt Double Fall (mode 'stuntfall'). */
'use strict';

(() => {
  /* 36-3 Stunt Double Fall (MODES.stuntfall): no roles, both heroes fall. Reads MODES.stuntfall.plan(st), the same plan
     the prompts and the HUD chips read.
     For glass it steers to meet its partner (with a person partner it does the travelling: it goes to them) and taps
     the action to link as soon as they are in reach; linked, it steers the way the person steers (it adds its input to
     theirs, never against), otherwise to the plan's line (a foam box, a clear space, a star). For a beam it lets go
     0.6 s ahead (not earlier, so a person who wants the slow fall keeps it) and takes the gap the plan gives it (the
     other one from the person's). It tucks to catch up and spreads to wait. Stars only with 1.5 s to spare.
     Link flapping guard: no new hand tap for 0.35 s after a link or a let-go (the plan's), and one tap a beat here.
     It can't finish alone: the level takes a break after 12 s with no person pressing anything. */
  const M = () => MODES.stuntfall;
  cpuBrain('stuntfall', {
    reset(s) { s.tapT = 0; },
    think(s, p, o, dt, info) {
      const out = {}, st = info.mst;
      if (!st || !st.hs || info.intro || st.state !== 'go' || st.waiting || st.intro > 1.0) return out;
      const m = M(), S = m.S, pl = m.plan(st), h = st.hs[p.id], q = st.hs[o.id], P = pl.h[p.id];
      s.tapT = Math.max(0, s.tapT - dt);
      if (h.landed || h.chute > 0) return out;
      let tx = P.tx;
      const person = !info.partnerCpu, oi = o.input || {};
      if (person && !st.link && pl.next && pl.next.need === 'link' && q.chute <= 0 && !q.landed) {
        // the computer does the travelling
        tx = q.x + (h.x < q.x ? -1 : 1) * S.gap / 2;
        if (Math.abs(h.y - q.y) > 30) { if (h.y < q.y) out.down = true; else out.up = true; }
      }
      const tap = () => { if (s.tapT <= 0) { out.act = 'tap'; s.tapT = 0.2; } };
      if (P.link && !st.link) tap();
      if (P.release && st.link) tap();
      if (st.link && person && (oi.left || oi.right)) {
        // linked with a person who is steering: steer with them
        if (oi.left) out.left = true; else out.right = true;
      } else {
        const dx = tx - h.x;
        if (dx > 6) out.right = true; else if (dx < -6) out.left = true;
      }
      if (P.tuck && !out.up) out.down = true; else if (P.spread && !out.down) out.up = true;
      if (person && pl.next && pl.next.need === 'link' && !st.link && pl.next.eta < 1.4) cpuSay(p, 'Hold hands for the glass!', 1.2);
      return out;
    },
  });
})();
