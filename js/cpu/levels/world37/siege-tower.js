/* Pip & Bo - Computer partner brain for 37-3 Siege Tower Push (mode 'siegetower'). */
'use strict';

(() => {
  /* 37-3 Siege Tower Push (MODES.siegetower): G.mst.push is on the bar, the other is the tower hero. Both jobs read
     MODES.siegetower.plan(st), the same plan the prompts and the HUD chips read; plan.he.nav / plan.pu.nav say which
     way to walk and when to climb.
     PUSHER: pushes when it's safe, ducks for an uncovered volley and for barrels, stops (and brakes on a slope) short
     of boulder shadows with a margin, before porridge spouts, at a jammed wheel or an unplanked trench, heaves at a
     rut, and lets go to fetch a ground shield only on flat ground with nothing coming.
     TOWER HERO: roof first in a volley, then the fire closest to burning through (a bucket for a big one), then a
     jammed wheel, trench planks, the ram for a barrel, the second bar in the mud, a chock on a slope, high shields;
     otherwise it waits on the top deck for the next volley. A 0.1 s beat after letting the roof down before climbing.
     With a person as pusher: if the person hasn't come to a two-person job (the mud bar, holding the tower at the
     wall) in 6 s it says "Over here!" and waits.
     It can't finish alone: the level takes a break after 12 s with no person pressing anything. */
  const M = () => MODES.siegetower;
  const walk = (out, n) => {
    if (!n) return;
    if (n.dir > 0) out.right = true; else if (n.dir < 0) out.left = true;
    if (n.up) out.jump = 'tap'; else if (n.down) out.down = 'tap';
  };
  cpuBrain('siegetower', {
    reset(s) { s.wait = 0; s.tapT = 0; s.lastWhy = null; s.whyT = 0; },
    think(s, p, o, dt, info) {
      const out = {}, st = info.mst;
      if (!st || !st.pu || info.intro || (st.state !== 'go' && st.state !== 'bridge') || st.waiting) return out;
      const pl = M().plan(st);
      // a 'down' tap: pressed this step if it was up last step
      const fixDown = () => { if (out.down === 'tap') { out.down = !s.lastDown; } s.lastDown = !!out.down; };
      if (p.id === st.push) {
        const Pu = pl.pu, u = st.pu;
        if (st.pu2) { walk(out, Pu.nav); fixDown(); return out; }
        if (u.knock > 0) return out;
        if (u.at) {
          if (Pu.duck) out.down = true;
          else if (Pu.letGo) out.jump = 'tap';
          else if (Pu.brake) out.left = true;
          else if (Pu.push) out.right = true;
          if (Pu.heave && !Pu.duck) out.act = 'tap';
        } else if (Pu.walkTo !== null) {
          const dx = Pu.walkTo - u.x;
          if (Math.abs(dx) > 4) out[dx > 0 ? 'right' : 'left'] = true;
          if (Pu.duck) { out.down = true; out.left = out.right = false; }
        }
        if (!info.partnerCpu && Pu.why === 'wait') {
          s.wait += dt; if (s.wait > 6) cpuSay(p, 'Over here! Help push through the mud!', 1.6);
        } else s.wait = 0;
        fixDown();
        return out;
      }
      // ---- the tower hero
      const He = pl.he, h = st.he;
      if (h.knock > 0 || h.climb) return out;
      if (h.beat > 0) return out;
      walk(out, He.nav);
      if (He.nav && He.nav.at) {
        if (He.hold) out.act = true;
        else if (He.act) { s.tapT -= dt; if (s.tapT <= 0) { out.act = 'tap'; s.tapT = 0.18; } }
        if (He.bar) out.right = true;
      }
      if (st.state === 'bridge' && He.why === 'bridge' && !info.partnerCpu && !st.pu2 && !G.players[st.push].input.right) {
        s.wait += dt; if (s.wait > 6) cpuSay(p, 'Hold the tower against the wall! (push)', 1.6);
      } else if (He.why !== 'mud') s.wait = 0;
      if (!info.partnerCpu && He.why === 'mud' && !G.players[st.push].input.right) { s.wait += dt; if (s.wait > 6) cpuSay(p, 'Over here! Push with me!', 1.6); }
      fixDown();
      return out;
    },
  });
})();
