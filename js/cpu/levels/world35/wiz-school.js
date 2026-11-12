/* Pip & Bo - Computer partner: 35-1 Moonwick Academy (core brain). */
'use strict';

/* 35-1 Moonwick Academy (mode 'wizschool'): the core brain dispatches every step to the class's brain,
   WIZ_BRAINS[S.phase] (js/cpu/levels/world35/wiz-broom.js ... wiz-duel.js), with a fresh sub-state (bst) per room:
     WIZ_BRAINS.<phase> = {
       reset(bst, p, info)                       optional: the room (or a restart) began
       think(bst, p, o, dt, info, S) -> out      (world coords) every step while the class plays (not during cards or cutscenes)
       back(bst, p, info, S)                     optional: the person came back after being away (plan afresh)
     }
   p is the computer's player, o the partner (or the opponent in the duel), S = G.mst (S.ph is the class's own state).
   out = { left, right, jump, down, up, act } as in cpu-core (jump / act: true held, 'tap' a fresh press: asking for
   'tap' every step presses every other step), plus keep: true to go on while the person is away (only for work that
   clears nothing by itself). W / ↑ / ▲ are "jump" for a person, so a brain that wants "up" sets jump (the class reads
   wizUp(p)).
   info is cpu-core's info (skill is always 1 in this team level) plus:
     info.vs     wizVersusSkill(p): 0.35 / 0.7 / 1 from the saved Opponent setting (Easy / Normal / Hard), or the bot
                 test's --skills; the graduation duel (versus inside this team level) uses it.
     info.away   the person pressed nothing for WIZ.idleAfter (12) s in this class (the core's S.idle, so both always
                 agree): Thimblewick waits, and so does the computer (the core brain returns {} unless out.keep). While it throws an output away, the core also drops the class
                 brain's cpuNav plan (bst.nav), and when the person is back it calls back() if there is one.
   An class that is still the core's stub (WIZ_PHASES[phase].stub) is played by WIZ_STUB_BRAINS[phase]; a real class
   with no brain by a follow-the-partner fallback, so the level never breaks.
   Rules for team classes: full skill, take whichever job the person leaves (never fight over a job), wait for a slow
   person, NEVER clear an class alone (an idle person must not get carried through), short cpuSay bubbles only in
   1-player mode (wizBrainSay). The computer never cheats with hidden state: it may read what a person could see.
   Helpers: wizBrainSay(bst, p, key, text, again) a short bubble (once per key every `again` s);
   wizBrainSeek(out, p, x, dead) walk to x (cpuSeek); wizBrainHop(bst, out, p) a hop when pushing into a wall;
   wizBrainTap(bst, key, every) -> true once every `every` s (for steady tapping at a human pace);
   wizBrainLate(bst, key, want, delay) -> `want` delayed by `delay` s (a human-like reaction time for versus). */
const WIZ_BRAINS = {};
const WIZ_STUB_BRAINS = {};
// the opponent's skill for versus play inside this team level (cpuSkill gives 1 in team levels)
function wizVersusSkill(p) {
  const id = p && typeof p === 'object' ? p.id : p;
  if (id != null && CPU.skillOf[id]) return CPU_SKILL[CPU.skillOf[id]] || 0.7;
  return CPU_SKILL[CPU.cfg.skill] || 0.7;
}
function wizBrainSay(bst, p, key, text, again = 12) {
  const s = bst.said || (bst.said = {});
  if (s[key] != null && G.time - s[key] < again) return;
  s[key] = G.time; cpuSay(p, text, 2);
}
const wizBrainSeek = (out, p, x, dead = 4) => cpuSeek(out, p, x, dead);
// pushing into something without moving: hop
function wizBrainHop(bst, out, p) {
  const was = bst._hopX;
  bst._hopX = p.x;
  if ((bst._hopHold = (bst._hopHold || 0) - DT) > 0) { out.jump = true; return out; }   // (held: a full jump)
  if ((out.left || out.right) && p.grounded && was != null && Math.abs(p.x - was) < 0.2) { bst._hopT = (bst._hopT || 0) + DT; if (bst._hopT > 0.1) { out.jump = true; bst._hopHold = 0.3; bst._hopT = 0; } }
  else bst._hopT = 0;
  return out;
}
// true once every `every` s (call it every step)
function wizBrainTap(bst, key, every) {
  const k = '_tap_' + key;
  bst[k] = (bst[k] == null ? 0 : bst[k]) - DT;
  if (bst[k] > 0) return false;
  bst[k] = every; return true;
}
// `want` (anything comparable with ===), seen `delay` s late
function wizBrainLate(bst, key, want, delay) {
  const k = '_late_' + key, q = bst[k] || (bst[k] = { v: want, next: want, t: 0 });
  if (want !== q.next) { q.next = want; q.t = delay; }
  if (q.t > 0 && (q.t -= DT) <= 0) q.v = q.next;
  if (delay <= 0) q.v = want;
  return q.v;
}

/* --- stub brains (they play the core's stub classes): walk right to the door --- */
const wizStubBrain = {
  think(bst, p, o, dt, info, S) {
    const out = {};
    if (S.phase === 'duel') {
      if ((bst.rest = (bst.rest || 0) - dt) > 0) return out;
      if (cpuChance((1 - info.vs) * 0.8, dt)) bst.rest = 0.35;   // Easy dawdles
      out.right = true;
      return wizBrainHop(bst, out, p);
    }
    wizBrainSeek(out, p, S.ph.goal + 40 + p.id * 30, 6);
    return wizBrainHop(bst, out, p);
  },
};
for (const k of WIZ_ORDER) WIZ_STUB_BRAINS[k] = wizStubBrain;
WIZ_STUB_BRAINS.follow = {
  think(bst, p, o) {
    const out = {};
    if (!o.alive || !p.alive) return out;
    const dx = cpuCx(o) - cpuCx(p);
    if (Math.abs(dx) > 50) cpuSeek(out, p, cpuCx(o) - Math.sign(dx) * 30, 6);
    return wizBrainHop(bst, out, p);
  },
};

cpuBrain('wizschool', {
  // an class that draws the players itself (a vehicle, a split screen) can still show the computer's bubbles
  get bubbleHidden() { const S = G.mst, ph = S && WIZ_PHASES[S.phase]; return !!(ph && ph.bubbleHidden); },
  bubblePos(p) {
    const S = G.mst, ph = S && WIZ_PHASES[S.phase];
    if (ph && typeof ph.bubblePos === 'function' && !(S.cut && S.cut.kind === 'end')) return ph.bubblePos(S, p);
    return { x: cpuCx(p), y: p.y - ((S && S.hm && wizHeadLift(S, p)) || 0) };
  },
  think(bst, p, o, dt, info) {
    const S = info.mst;
    if (!S || !S.hm || info.intro || S.cut || G.introT > WIZ.introHold) return {};
    const ph = WIZ_PHASES[S.phase], stub = !!(ph && ph.stub);
    const B = (stub ? WIZ_STUB_BRAINS[S.phase] : WIZ_BRAINS[S.phase]) || WIZ_STUB_BRAINS.follow;
    const key = S.phase + (stub ? ':stub' : '') + ':' + (S.phaseNo || 0);
    info.vs = wizVersusSkill(p);
    // the core's own idle wait (S.idle: per class, never during a card or a cutscene), not cpu-core's partnerIdle, which
    // runs on through the cutscene and the class card: the computer waits exactly when Thimblewick does
    info.away = !info.partnerCpu && !!S.idle;
    // (a fresh brain per class, and again when the class restarts: a new level state, or its clock went back)
    const fresh = bst.key !== key || bst.S !== S || (S.phT || 0) < (bst.phT || 0);
    bst.S = S; bst.phT = S.phT || 0;
    if (fresh) { bst.key = key; bst.sub = {}; if (typeof B.reset === 'function') B.reset(bst.sub, p, info); }
    if (bst.away && !info.away) { bst.away = false; if (typeof B.back === 'function') B.back(bst.sub, p, info, S); }
    // class brains think in WORLD coords, like the class's tick and its plan(): the players shift by the camera and back
    const c = S.cam || { x: 0, y: 0 }, ps = G.players;
    for (const q of ps) { q.x += c.x; q.y += c.y; }
    let out;
    try { out = B.think(bst.sub, p, o, dt, info, S) || {}; } finally { for (const q of ps) { q.x -= c.x; q.y -= c.y; } }
    if (info.away && !out.keep) {
      // standing still while the person is away: no map plan may run on unplayed
      bst.away = true;
      if (bst.sub.nav) bst.sub.nav = null;
      return {};
    }
    return out;
  },
});
