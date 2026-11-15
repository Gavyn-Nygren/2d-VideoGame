/* Pip & Bo - Computer partner: 40-1 Part 4 'boiler' (The Boiler). World coords (see the core brain). */
'use strict';

/* Follows ironBoilerPlan. As holder: stands on its valve and holds; when the dial gets to 0.8 and the dasher is
   somewhere safe (a SAFE arch or a valve) it lets go to bleed it down to 0.25, then holds again (at 0.95 it bleeds
   whatever, a bleed beats a kick). As dasher: hops from safe spot to safe spot, and only starts a hop when the steam
   on it is off, the holder is holding, and the dial leaves the time to get there. At the core: turns its wheel and
   jumps the furnace's breath. */
IRON_BRAINS.boiler = {
  reset(bst) { bst.bleed = false; bst.run = null; },
  think(bst, p, o, dt, info, S) {
    const ph = S.ph, K = IRONBOILER, out = {}, cx = cpuCx(p);
    if (!p.alive || !ph.valves) return out;
    const P = ironBoilerPlan(S)[p.id] || {}, w = P.why;
    if (w === 'wheel') {
      const b = ph.core.breath;
      if (Math.abs(cx - P.x) > 10) ironLegNear(bst, out, p, P.x, 6);
      else out.act = true;
      if (b.st === 'go') { const d = (cx - b.x) * b.dir; if (d > 0 && d < 70) { out.act = false; ironBrainJump(bst, out, p, 0.3); } }
      return ironBrainJumpHold(bst, out);
    }
    if (w === 'hold') {
      const v = ph.valves[ph.n], dash = G.players[1 - p.id];
      if (Math.abs(cx - v.x) > 12) { bst.bleed = false; ironLegNear(bst, out, p, v.x, 8); return ironBrainHop(bst, out, p); }
      const dx = cpuCx(dash), safe = !dash.alive || (dash.grounded && (ironBoilerInAlcove(dx) || ironBoilerStretchAt(dx) < 0));
      if (!ironHasGold(S, 'boiler') && !bst.bleed && (v.p >= 0.95 || (v.p >= 0.8 && safe))) bst.bleed = true;
      if (bst.bleed && v.p <= 0.25) bst.bleed = false;
      if (!bst.bleed && v.kick <= 0) out.act = true;
      return out;
    }
    if (w === 'dash') {
      bst.bleed = false;
      // mid-hop: keep going to the spot it picked
      // caught out in a stretch with its valve let go: the steam is coming, get to the nearest safe spot
      const jHere = ironBoilerStretchAt(cx);
      if (jHere >= 0 && !ironBoilerInAlcove(cx) && ph.valves[ph.n].held < 0) {
        const s = ironBoilerStretch(jHere), spots = [s.a - 24, s.b + 24, ...s.alc];
        bst.run = spots.reduce((a, c) => (Math.abs(c - cx) < Math.abs(a - cx) ? c : a));
      }
      if (bst.run != null) {
        if (Math.abs(cx - bst.run) < 8 || !p.alive) bst.run = null;
        else { if (Math.abs(cx - bst.run) > 40) ironBrainSeek(out, p, bst.run, 4); else ironLegNear(bst, out, p, bst.run, 6); return ironBrainHop(bst, out, p); }
      }
      const next = ironBoilerNextSafe(cx, P.x);
      if (next == null) return out;
      const j = ironBoilerStretchAt((cx + next) / 2);
      if (j < 0) { bst.run = next; return out; }   // no steam between here and there
      const J = ph.jets[j], v = ph.valves[ph.n];
      const left = ironHasGold(S, 'boiler') ? 99 : (0.8 - v.p) * ironBoilerRedT(S) + 0.3, need = Math.abs(next - cx) / 200 + 0.2;
      if (!J.on && v.held >= 0 && v.kick <= 0 && left > need && p.grounded) bst.run = next;
      else if (Math.abs(cx - (bst.wait != null ? bst.wait : cx)) > 6) ironLegNear(bst, out, p, bst.wait, 5);
      if (bst.run == null) bst.wait = ironBoilerInAlcove(cx) ? ironBoilerAlcoveAt(cx) : cx;
      return out;
    }
    return out;
  },
};
// the next safe spot (an arch centre or just inside a valve zone) from x on the way to the goal
function ironBoilerNextSafe(x, goal) {
  const K = IRONBOILER, dir = Math.sign(goal - x) || 1, pts = [goal];
  for (let j = 0; j < 5; j++) { const s = ironBoilerStretch(j); pts.push(...s.alc, s.a - 24, s.b + 24); }
  let best = null;
  for (const q of pts) { const d = (q - x) * dir; if (d > 12 && (q - goal) * dir <= 0.1 && (best == null || d < (best - x) * dir)) best = q; }
  return best;
}
function ironBoilerAlcoveAt(x) { const j = ironBoilerStretchAt(x); return ironBoilerStretch(j).alc.reduce((a, c) => (Math.abs(c - x) < Math.abs(a - x) ? c : a)); }
