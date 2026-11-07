/* Pip & Bo - Computer partner: 20-1 Volcano Dragon (core brain). */
'use strict';

/* 20-1 Volcano Dragon (mode 'dragon'): the core brain dispatches every step to the phase's brain,
   VD_BRAINS[S.phase] (js/cpu/levels/world20/vd-climb.js ... vd-surf.js), with a fresh sub-state (bst) per room:
     VD_BRAINS.<phase> = {
       reset(bst, p, info)                       optional: the room (or a restart) began
       think(bst, p, o, dt, info, S) -> out      every step while the phase plays (not during cards or cutscenes)
     }
   out = { left, right, jump, down, up, act } as in cpu-core (jump / act: true held, 'tap' a fresh press), plus
   keep: true to go on while the person is away (only for work that clears nothing by itself).
   info is cpu-core's info (skill is always 1 in this team level) plus:
     info.vs     vdVersusSkill(p): 0.35 / 0.7 / 1 from the saved Opponent setting (Easy / Normal / Hard), or the bot
                 test's --skills; the surf race (versus inside this team level) uses it.
     info.away   the person pressed nothing for VD.idleAfter (10) s: Cinder waits, and so does the computer (the core
                 brain returns {} unless out.keep).
   A phase that is still the core's stub (VD_PHASES[phase].stub) is played by VD_STUB_BRAINS[phase]; a real phase
   with no brain by a follow-the-partner fallback, so the level never breaks.
   Helpers for phase brains: vdBrainSay(bst, p, key, text, again) a short bubble (1-player mode only, once per key
   every `again` s); vdBrainSeek(out, p, x, dead) walk to x (cpuSeek); vdBrainFire(S, p) the fire about to land on p
   (or null); vdBrainShelter(S, p) the x of a raised partner shield (or null); vdBrainHop(bst, out, p) a hop when
   pushing into a wall. */
const VD_BRAINS = {};
const VD_STUB_BRAINS = {};
// the opponent's skill for versus play inside this team level (cpuSkill gives 1 in team levels)
function vdVersusSkill(p) {
  const id = p && typeof p === 'object' ? p.id : p;
  if (id != null && CPU.skillOf[id]) return CPU_SKILL[CPU.skillOf[id]] || 0.7;
  return CPU_SKILL[CPU.cfg.skill] || 0.7;
}
function vdBrainSay(bst, p, key, text, again = 12) {
  const s = bst.said || (bst.said = {});
  if (s[key] != null && G.time - s[key] < again) return;
  s[key] = G.time; cpuSay(p, text, 2);
}
const vdBrainSeek = (out, p, x, dead = 4) => cpuSeek(out, p, x, dead);
// a fire whose zone p stands in (still inhaling or breathing), or null
function vdBrainFire(S, p) {
  for (const f of S.fires || []) {
    if (f.phase === 'out') continue;
    const z = vdFireZone(f);
    if (rectHit(p, z.x0 - 8, z.y0, z.x1 - z.x0 + 16, z.y1 - z.y0)) return f;
  }
  return null;
}
function vdBrainShelter(S, p) { const b = vdShieldBox(S, 1 - p.id); return b ? b.cx : null; }
// pushing into something without moving: hop
function vdBrainHop(bst, out, p) {
  const was = bst._hopX;
  bst._hopX = p.x;
  if ((bst._hopHold = (bst._hopHold || 0) - DT) > 0) { out.jump = true; return out; }   // (held: a full jump)
  if ((out.left || out.right) && p.grounded && was != null && Math.abs(p.x - was) < 0.2) { bst._hopT = (bst._hopT || 0) + DT; if (bst._hopT > 0.1) { out.jump = true; bst._hopHold = 0.3; bst._hopT = 0; } }
  else bst._hopT = 0;
  return out;
}

/* --- stub brains (they play the core's stub phases) --- */
VD_STUB_BRAINS.climb = {
  think(bst, p, o, dt, info, S) {
    const out = {}, sh = S.ph.sh === p.id, f = vdBrainFire(S, p) || vdBrainFire(S, o);
    if (sh) out.act = !!f || !!(S.fires && S.fires.length);
    let x = S.ph.goal + 30 + p.id * 30;
    const mine = vdBrainFire(S, p);
    if (!sh && mine) { const cx = vdBrainShelter(S, p); x = cx != null ? cx : (mine.x0 - 30 > 20 ? mine.x0 - 30 : mine.x1 + 30); }
    vdBrainSeek(out, p, x, 6);
    return vdBrainHop(bst, out, p);
  },
};
VD_STUB_BRAINS.levers = {
  think(bst, p, o, dt, info, S) { const out = {}; vdBrainSeek(out, p, 300 + p.id * 40, 8); out.act = true; return out; },
};
VD_STUB_BRAINS.golf = {
  think(bst, p, o, dt, info, S) {
    const out = {}, gx = S.ph.gx;
    vdBrainSeek(out, p, gx - 40 + p.id * 50, 6);
    vdBrainHop(bst, out, p);
    if (Math.abs(cpuCx(o) - gx) < 80 && Math.abs(cpuCx(p) - gx) < 80) out.act = 'tap';
    return out;
  },
};
VD_STUB_BRAINS.surf = {
  think(bst, p, o, dt, info, S) {
    const out = {};
    if ((bst.rest = (bst.rest || 0) - dt) > 0) return out;
    if (cpuChance((1 - info.vs) * 0.8, dt)) bst.rest = 0.35;   // Easy dawdles
    out.right = true;
    return vdBrainHop(bst, out, p);
  },
};
VD_STUB_BRAINS.follow = {
  think(bst, p, o) {
    const out = {};
    if (!o.alive || !p.alive) return out;
    const dx = cpuCx(o) - cpuCx(p);
    if (Math.abs(dx) > 50) cpuSeek(out, p, cpuCx(o) - Math.sign(dx) * 30, 6);
    return vdBrainHop(bst, out, p);
  },
};

cpuBrain('dragon', {
  // a phase that hides the players (split screen) can still show the computer's bubbles
  get bubbleHidden() { const S = G.mst, ph = S && VD_PHASES[S.phase]; return !!(ph && ph.bubbleHidden); },
  bubblePos(p) {
    const S = G.mst, ph = S && VD_PHASES[S.phase];
    if (ph && typeof ph.bubblePos === 'function' && !(S.cut && S.cut.kind === 'end')) return ph.bubblePos(S, p);
    return { x: cpuCx(p), y: p.y - (S && vdShieldUp(S, p.id) ? VD.shield.lift + VD.shield.ry : 0) };
  },
  think(bst, p, o, dt, info) {
    const S = info.mst;
    if (!S || !S.cinder || info.intro || S.cut || G.introT > VD.introHold) return {};
    const ph = VD_PHASES[S.phase], stub = !!(ph && ph.stub);
    const B = (stub ? VD_STUB_BRAINS[S.phase] : VD_BRAINS[S.phase]) || VD_STUB_BRAINS.follow;
    const key = S.phase + (stub ? ':stub' : '') + ':' + (S.phaseNo || 0);
    info.vs = vdVersusSkill(p);
    info.away = !info.partnerCpu && info.partnerIdle > VD.idleAfter;
    if (bst.key !== key) { bst.key = key; bst.sub = {}; if (typeof B.reset === 'function') B.reset(bst.sub, p, info); }
    const out = B.think(bst.sub, p, o, dt, info, S) || {};
    return info.away && !out.keep ? {} : out;
  },
});
