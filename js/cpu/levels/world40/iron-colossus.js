/* Pip & Bo - Computer partner: 40-1 The Iron Colossus (core brain). */
'use strict';

/* 40-1 The Iron Colossus (mode 'colossus'): the core brain dispatches every step to the part's brain,
   IRON_BRAINS[S.phase] (js/cpu/levels/world40/iron-<part>.js), with a fresh sub-state (bst) per part:
     IRON_BRAINS.<phase> = {
       reset(bst, p, info)                       optional: the part (or a restart) began
       think(bst, p, o, dt, info, S) -> out      (WORLD coords) every step while the part plays
       back(bst, p, info, S)                     optional: the person came back after being away
     }
   p is the computer's player, o the partner (the opponent in the Thumb War), S = G.mst (S.ph is the part's state).
   out = { left, right, jump, down, up, act } as in cpu-core (jump / act: true held, 'tap' a fresh press), plus keep:
   true to go on while the person is away (only for work that clears nothing by itself).
   info is cpu-core's info plus info.vs (the Opponent setting: 0.35 / 0.7 / 1, for the Thumb War) and info.away (the
   person pressed nothing for IRON.idleAfter s: the giant winds down, and the computer waits too).
   Rules: full skill in team parts, take whichever job the person leaves, wait for a slow person, NEVER clear a part
   alone, read only what a person could see. A part that is still the core's stub is played by the stub brain.
   Helpers: ironBrainSay(bst, p, key, text, again)  ironBrainSeek(out, p, x, dead)  ironBrainHop(bst, out, p)
   ironBrainTap(bst, key, every)  ironBrainLate(bst, key, want, delay)  ironBrainJump(bst, out, p, hold) (a held jump). */
const IRON_BRAINS = {};
function ironVersusSkill(p) {
  const id = p && typeof p === 'object' ? p.id : p;
  if (id != null && CPU.skillOf[id]) return CPU_SKILL[CPU.skillOf[id]] || 0.7;
  return CPU_SKILL[CPU.cfg.skill] || 0.7;
}
function ironBrainSay(bst, p, key, text, again = 12) {
  const s = bst.said || (bst.said = {});
  if (s[key] != null && G.time - s[key] < again) return;
  s[key] = G.time; cpuSay(p, text, 2);
}
const ironBrainSeek = (out, p, x, dead = 4) => cpuSeek(out, p, x, dead);
function ironBrainHop(bst, out, p) {
  const was = bst._hopX;
  bst._hopX = p.x;
  if ((bst._hopHold = (bst._hopHold || 0) - DT) > 0) { out.jump = true; return out; }
  if ((out.left || out.right) && p.grounded && was != null && Math.abs(p.x - was) < 0.2) { bst._hopT = (bst._hopT || 0) + DT; if (bst._hopT > 0.1) { out.jump = true; bst._hopHold = 0.3; bst._hopT = 0; } }
  else bst._hopT = 0;
  return out;
}
function ironBrainTap(bst, key, every) {
  const k = '_tap_' + key;
  bst[k] = (bst[k] == null ? 0 : bst[k]) - DT;
  if (bst[k] > 0) return false;
  bst[k] = every; return true;
}
function ironBrainLate(bst, key, want, delay) {
  const k = '_late_' + key, q = bst[k] || (bst[k] = { v: want, next: want, t: 0 });
  if (want !== q.next) { q.next = want; q.t = delay; }
  if (q.t > 0 && (q.t -= DT) <= 0) q.v = q.next;
  if (delay <= 0) q.v = want;
  return q.v;
}
// a jump held for `hold` s (a full-height jump; a one-tick tap is a small skip)
function ironBrainJump(bst, out, p, hold = 0.3) {
  if (p.grounded && !(bst._jh > 0)) bst._jh = hold;
  return out;
}
function ironBrainJumpHold(bst, out) { if ((bst._jh = (bst._jh || 0) - DT) > 0) out.jump = true; return out; }

const IRON_STUB_BRAIN = {
  think(bst, p, o, dt, info, S) {
    const out = {};
    if (S.part && S.part.versus) {
      if ((bst.rest = (bst.rest || 0) - dt) > 0) return out;
      if (cpuChance((1 - info.vs) * 0.8, dt)) bst.rest = 0.35;
      out.right = true;
      return ironBrainHop(bst, out, p);
    }
    ironBrainSeek(out, p, S.ph.goal + 40 + p.id * 30, 6);
    return ironBrainHop(bst, out, p);
  },
};
const IRON_FOLLOW_BRAIN = {
  think(bst, p, o) {
    const out = {};
    if (!o.alive || !p.alive) return out;
    const dx = cpuCx(o) - cpuCx(p);
    if (Math.abs(dx) > 50) cpuSeek(out, p, cpuCx(o) - Math.sign(dx) * 30, 6);
    return ironBrainHop(bst, out, p);
  },
};

cpuBrain('colossus', {
  get bubbleHidden() { const S = G.mst, ph = S && IRON_PHASES[S.phase]; return !!(ph && ph.bubbleHidden); },
  bubblePos(p) {
    const S = G.mst, ph = S && IRON_PHASES[S.phase];
    if (ph && typeof ph.bubblePos === 'function' && !(S.cut && S.cut.kind === 'end')) return ph.bubblePos(S, p);
    const y = p.y - ((S && S.tick && ironHeadLift(S, p)) || 0);
    return S && S.tick ? ironViewPt(S, cpuCx(p), y) : { x: cpuCx(p), y };
  },
  think(bst, p, o, dt, info) {
    const S = info.mst;
    if (!S || !S.tick || info.intro || S.cut || G.introT > IRON.introHold) return {};
    const ph = IRON_PHASES[S.phase], stub = !!(ph && ph.stub);
    const B = (stub ? IRON_STUB_BRAIN : IRON_BRAINS[S.phase]) || IRON_FOLLOW_BRAIN;
    const key = S.phase + (stub ? ':stub' : '') + ':' + (S.phaseNo || 0);
    info.vs = ironVersusSkill(p);
    info.away = !info.partnerCpu && !!S.idle;
    const fresh = bst.key !== key || bst.S !== S || (S.phT || 0) < (bst.phT || 0) || bst.ph !== S.ph;
    bst.S = S; bst.phT = S.phT || 0; bst.ph = S.ph;
    if (fresh) { bst.key = key; bst.sub = {}; if (typeof B.reset === 'function') B.reset(bst.sub, p, info); }
    if (bst.away && !info.away) { bst.away = false; if (typeof B.back === 'function') B.back(bst.sub, p, info, S); }
    const c = S.cam || { x: 0, y: 0 }, ps = G.players;
    for (const q of ps) { q.x += c.x; q.y += c.y; }
    let out;
    try { out = B.think(bst.sub, p, o, dt, info, S) || {}; } finally { for (const q of ps) { q.x -= c.x; q.y -= c.y; } }
    if (info.away && !out.keep) { bst.away = true; if (bst.sub.nav) bst.sub.nav = null; return {}; }
    return out;
  },
});
