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
     Steering has a start and a stop distance (6 px and 2 px) so it never flips on the edge of one deadband.
     Link flapping guard: no new hand tap for 0.35 s after a link or a let-go (the plan's), and one tap a beat here.
     It can't finish alone: the level takes a break after 12 s with no person pressing anything. */
  const M = () => MODES.stuntfall;
  cpuBrain('stuntfall', {
    reset(s) { s.tapT = 0; s.dir = 0; },
    think(s, p, o, dt, info) {
      const out = {}, st = info.mst;
      if (!st || !st.hs || info.intro || st.state !== 'go' || st.waiting || st.intro > 1.0) return out;
      const m = M(), S = m.S, pl = m.plan(st), h = st.hs[p.id], q = st.hs[o.id], P = pl.h[p.id];
      s.tapT = Math.max(0, s.tapT - dt);
      if (h.landed || h.chute > 0) return out;
      let tx = P.tx, chase = false;
      const person = !info.partnerCpu, oi = o.input || {};
      if (person && !st.link && pl.next && pl.next.need === 'link' && q.chute <= 0 && !q.landed) {
        // the computer does the travelling
        tx = q.x + (h.x < q.x ? -1 : 1) * S.gap / 2; chase = true;
        if (Math.abs(h.y - q.y) > 30) { if (h.y < q.y) out.down = true; else out.up = true; }
      }
      // a beam with a person partner: the plan's gap (the one the person is further from) if it can still be reached,
      // otherwise the nearest one (a person who stays by the wall used to send it to a gap too far to make)
      if (person && !st.link && pl.next && pl.next.need === 'apart' && pl.next.r.gaps) {
        const tB = (pl.next.r.y - h.y) / Math.max(80, h.vy), can = g => Math.abs(g - h.x) / S.steer < tB - 0.12;
        if (!can(tx)) tx = pl.next.r.gaps.slice().sort((g1, g2) => Math.abs(g1 - h.x) - Math.abs(g2 - h.x))[0];
      }
      const tap = () => { if (s.tapT <= 0) { out.act = 'tap'; s.tapT = 0.2; } };
      if (P.link && !st.link) tap();
      if (P.release && st.link) tap();
      if (st.link && person && (oi.left || oi.right)) {
        // linked with a person who is steering: steer with them
        if (oi.left) out.left = true; else out.right = true;
      } else {
        // steer until nearly there, start again only when well off (a plain deadband flipped the key every other
        // step on its edge when a linked pair crept along at half speed)
        // (and it lets go one stopping distance early, so it doesn't sail past a gap and come back)
        // (chasing a person, the speed that counts is the closing speed)
        const dx = tx - h.x, rv = h.vx - (chase ? q.vx : 0), toward = dx * rv > 0, coast = toward ? rv * rv / (2 * S.acc) : 0;
        if (Math.abs(dx) <= Math.max(2, coast) || (s.dir && Math.sign(dx) !== s.dir)) s.dir = 0;
        else if (Math.abs(dx) > 6 + coast) s.dir = Math.sign(dx);
        if (s.dir > 0) out.right = true; else if (s.dir < 0) out.left = true;
      }
      if (P.tuck && !out.up) out.down = true; else if (P.spread && !out.down) out.up = true;
      if (person && pl.next && pl.next.need === 'link' && !st.link && pl.next.eta < 1.4) cpuSay(p, 'Hold hands for the glass!', 1.2);
      return out;
    },
  });
})();
