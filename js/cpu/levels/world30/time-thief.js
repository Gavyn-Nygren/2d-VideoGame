/* Pip & Bo - Computer partner: 30-1 The Time Thief (core brain). */
'use strict';

/* 30-1 The Time Thief (mode 'timethief'): the core brain dispatches every step to the era's brain,
   TTH_BRAINS[S.phase] (js/cpu/levels/world30/tth-dino.js ... tth-race.js), with a fresh sub-state (bst) per room:
     TTH_BRAINS.<phase> = {
       reset(bst, p, info)                       optional: the room (or a restart) began
       think(bst, p, o, dt, info, S) -> out      every step while the era plays (not during cards or cutscenes)
       back(bst, p, info, S)                     optional: the person came back after being away (plan afresh)
     }
   p is the computer's player, o the partner (or the opponent in the race), S = G.mst (S.ph is the era's own state).
   out = { left, right, jump, down, up, act } as in cpu-core (jump / act: true held, 'tap' a fresh press: asking for
   'tap' every step presses every other step), plus keep: true to go on while the person is away (only for work that
   clears nothing by itself). W / ↑ / ▲ are "jump" for a person, so a brain that wants "up" sets jump (the era reads
   tthUp(p)).
   info is cpu-core's info (skill is always 1 in this team level) plus:
     info.vs     tthVersusSkill(p): 0.35 / 0.7 / 1 from the saved Opponent setting (Easy / Normal / Hard), or the bot
                 test's --skills; the portal race (versus inside this team level) uses it.
     info.away   the person pressed nothing for TTH.idleAfter (10) s: the Thief waits, and so does the computer (the
                 core brain returns {} unless out.keep). While it throws an output away, the core also drops the era
                 brain's cpuNav plan (bst.nav), and when the person is back it calls back() if there is one.
   An era that is still the core's stub (TTH_PHASES[phase].stub) is played by TTH_STUB_BRAINS[phase]; a real era
   with no brain by a follow-the-partner fallback, so the level never breaks.
   Rules for team eras: full skill, take whichever job the person leaves (never fight over a job), wait for a slow
   person, NEVER clear an era alone (an idle person must not get carried through), short cpuSay bubbles only in
   1-player mode (tthBrainSay). The computer never cheats with hidden state: it may read what a person could see.
   Helpers: tthBrainSay(bst, p, key, text, again) a short bubble (once per key every `again` s);
   tthBrainSeek(out, p, x, dead) walk to x (cpuSeek); tthBrainHop(bst, out, p) a hop when pushing into a wall;
   tthBrainTap(bst, key, every) -> true once every `every` s (for steady tapping at a human pace);
   tthBrainLate(bst, key, want, delay) -> `want` delayed by `delay` s (a human-like reaction time for versus). */
const TTH_BRAINS = {};
const TTH_STUB_BRAINS = {};
// the opponent's skill for versus play inside this team level (cpuSkill gives 1 in team levels)
function tthVersusSkill(p) {
  const id = p && typeof p === 'object' ? p.id : p;
  if (id != null && CPU.skillOf[id]) return CPU_SKILL[CPU.skillOf[id]] || 0.7;
  return CPU_SKILL[CPU.cfg.skill] || 0.7;
}
function tthBrainSay(bst, p, key, text, again = 12) {
  const s = bst.said || (bst.said = {});
  if (s[key] != null && G.time - s[key] < again) return;
  s[key] = G.time; cpuSay(p, text, 2);
}
const tthBrainSeek = (out, p, x, dead = 4) => cpuSeek(out, p, x, dead);
// pushing into something without moving: hop
function tthBrainHop(bst, out, p) {
  const was = bst._hopX;
  bst._hopX = p.x;
  if ((bst._hopHold = (bst._hopHold || 0) - DT) > 0) { out.jump = true; return out; }   // (held: a full jump)
  if ((out.left || out.right) && p.grounded && was != null && Math.abs(p.x - was) < 0.2) { bst._hopT = (bst._hopT || 0) + DT; if (bst._hopT > 0.1) { out.jump = true; bst._hopHold = 0.3; bst._hopT = 0; } }
  else bst._hopT = 0;
  return out;
}
// true once every `every` s (call it every step)
function tthBrainTap(bst, key, every) {
  const k = '_tap_' + key;
  bst[k] = (bst[k] == null ? 0 : bst[k]) - DT;
  if (bst[k] > 0) return false;
  bst[k] = every; return true;
}
// `want` (anything comparable with ===), seen `delay` s late
function tthBrainLate(bst, key, want, delay) {
  const k = '_late_' + key, q = bst[k] || (bst[k] = { v: want, next: want, t: 0 });
  if (want !== q.next) { q.next = want; q.t = delay; }
  if (q.t > 0 && (q.t -= DT) <= 0) q.v = q.next;
  if (delay <= 0) q.v = want;
  return q.v;
}

/* --- stub brains (they play the core's stub eras): walk right to the portal --- */
const tthStubBrain = {
  think(bst, p, o, dt, info, S) {
    const out = {};
    if (S.phase === 'race') {
      if ((bst.rest = (bst.rest || 0) - dt) > 0) return out;
      if (cpuChance((1 - info.vs) * 0.8, dt)) bst.rest = 0.35;   // Easy dawdles
      out.right = true;
      return tthBrainHop(bst, out, p);
    }
    tthBrainSeek(out, p, S.ph.goal + 40 + p.id * 30, 6);
    return tthBrainHop(bst, out, p);
  },
};
for (const k of TTH_ORDER) TTH_STUB_BRAINS[k] = tthStubBrain;
TTH_STUB_BRAINS.follow = {
  think(bst, p, o) {
    const out = {};
    if (!o.alive || !p.alive) return out;
    const dx = cpuCx(o) - cpuCx(p);
    if (Math.abs(dx) > 50) cpuSeek(out, p, cpuCx(o) - Math.sign(dx) * 30, 6);
    return tthBrainHop(bst, out, p);
  },
};

cpuBrain('timethief', {
  // an era that draws the players itself (a vehicle, a split screen) can still show the computer's bubbles
  get bubbleHidden() { const S = G.mst, ph = S && TTH_PHASES[S.phase]; return !!(ph && ph.bubbleHidden); },
  bubblePos(p) {
    const S = G.mst, ph = S && TTH_PHASES[S.phase];
    if (ph && typeof ph.bubblePos === 'function' && !(S.cut && S.cut.kind === 'end')) return ph.bubblePos(S, p);
    return { x: cpuCx(p), y: p.y - ((S && S.thief && tthHeadLift(S, p)) || 0) };
  },
  think(bst, p, o, dt, info) {
    const S = info.mst;
    if (!S || !S.thief || info.intro || S.cut || G.introT > TTH.introHold) return {};
    const ph = TTH_PHASES[S.phase], stub = !!(ph && ph.stub);
    const B = (stub ? TTH_STUB_BRAINS[S.phase] : TTH_BRAINS[S.phase]) || TTH_STUB_BRAINS.follow;
    const key = S.phase + (stub ? ':stub' : '') + ':' + (S.phaseNo || 0);
    info.vs = tthVersusSkill(p);
    info.away = !info.partnerCpu && info.partnerIdle > TTH.idleAfter;
    if (bst.key !== key) { bst.key = key; bst.sub = {}; if (typeof B.reset === 'function') B.reset(bst.sub, p, info); }
    if (bst.away && !info.away) { bst.away = false; if (typeof B.back === 'function') B.back(bst.sub, p, info, S); }
    const out = B.think(bst.sub, p, o, dt, info, S) || {};
    if (info.away && !out.keep) {
      // standing still while the person is away: no map plan may run on unplayed
      bst.away = true;
      if (bst.sub.nav) bst.sub.nav = null;
      return {};
    }
    return out;
  },
});
