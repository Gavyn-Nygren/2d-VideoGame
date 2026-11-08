/* Pip & Bo - Computer partner brain for 22-4 Dolphin Race (mode 'dolphinrace'). */
'use strict';

(() => {
  /* The computer is the other rider. It presses the same keys a person does: ▲ (jump) to swim up, ▼ (down) to dive,
     a fresh action press to leap (or flip in the air).
     The start: after a short reaction (Hard about 0.12 s, Normal 0.3, Easy 0.75 s, usually too late for it) it leaps off
     the line, so Hard and Normal usually get the "Great start!".
     Swimming, it re-plans every reaction time (Hard 0.06 s, Normal 0.16 s, Easy 0.42 s) by trying a few short plans
     in its head with the level's own movement rule (MODES.dolphinrace.test.move, the same maths the dolphin follows):
       hold ▲, hold nothing or hold ▼ for the next "look" seconds (Hard 1.3 s, Normal 1.0, Easy 0.6), each with or
       without a leap now (only when the leap is ready). Each plan is scored:
         - running into an obstacle it has noticed (where that obstacle will be by then): very bad, worse the sooner;
         - going through a gold hoop it wants: very good (Hard wants every hoop, Normal 80%, Easy 22%);
         - time in a fast current: good; a big splash landing: a little bad (it costs speed); a leap that buys
           nothing: a little bad (keep it for a hoop);
         - where it ends up: near the surface when a hoop it wants is coming, otherwise its comfy depth or the
           middle of a current ahead.
       It does the best plan (sticking with the last one when they're about level, so it doesn't twitch).
     Mistakes: Normal misses 10% of obstacles and Easy 35% (it just doesn't see them), Easy presses its leaps a bit
     early or late (up to 0.2 s, so it often misses high hoops), and Easy (a little Normal) has lapses where it lets
     go of everything for a moment, or fidgets ▲ / ▼, like a kid looking at the other dolphin.
     What it reads: the course (what is on screen and a little past it), its own dolphin, its leap ring. Never the
     other player's keys.
     It talks (1-player mode only) in short bubbles: "Eee-eee!", "Splash!", "Good race!". */
  const SK = {
    easy: { react: 0.42, hz: 0.6, see: 0.65, hoopP: 0.22, lapse: 0.12, lapseT: 1.0, kickJit: 0.2, startReact: 0.75, startSd: 0.25, fidget: 0.07 },
    normal: { react: 0.16, hz: 1.0, see: 0.9, hoopP: 0.8, lapse: 0.04, lapseT: 0.6, kickJit: 0.06, startReact: 0.3, startSd: 0.1, fidget: 0.04 },
    hard: { react: 0.06, hz: 1.3, see: 1, hoopP: 1, lapse: 0, lapseT: 0, kickJit: 0, startReact: 0.12, startSd: 0.03, fidget: 0 },
  };
  const skOf = s => (s <= 0.4 ? SK.easy : s < 0.9 ? SK.normal : SK.hard);
  const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 0.5;
  const T = () => MODES.dolphinrace.test;
  const SIM_DT = 1 / 60;

  // play one plan forward in its head and score it
  function score(S, st, me, plan, sk) {
    const q = T().DLR, c = st.course;
    const B = { slot: me.slot, x: me.x, y: me.y, vy: me.vy, sp: Math.max(me.sp, 120), air: me.air, kickT: me.kickT, tail: me.tail };
    if (plan.kick) B.kickT = q.kickT;
    const inp = { up: plan.dir === 'up', down: plan.dir === 'down' }, n = Math.round(sk.hz / SIM_DT);
    let sc = 0, t = st.rt, gotHoop = false, imm = me.immT;
    for (let i = 0; i < n; i++) {
      const px = B.x, py = B.y;
      const ev = T().move(B, inp, SIM_DT);
      t += SIM_DT; imm -= SIM_DT;
      if (ev === 'splash' && py < q.surf - q.bigLeap + q.surfD) sc -= 12;
      for (const g of c.hoops) {
        if (g.got[me.k] || px >= g.x || B.x < g.x || !S.want[g.id]) continue;
        if (Math.abs(B.y - g.y) <= q.hoopR - 5) { sc += 400 * (1 - 0.3 * i / n); gotHoop = true; }
      }
      if (!B.air && T().inCurrent(c, B.x, B.y)) sc += 60 * SIM_DT;
      if (imm <= 0) {
        const h = T().hitAt(c, B.x, B.y, t);
        if (h && S.seen[h.o.id]) { sc -= 1000 * (1 - 0.6 * i / n); return sc; }
      }
    }
    // where it ends up
    let comfy = q.surf + q.restD[me.slot];
    const nextHoop = c.hoops.find(g => !g.got[me.k] && S.want[g.id] && g.x > B.x && g.x - B.x < 700);
    if (nextHoop) comfy = q.surf + 24;
    else for (const u of c.curs) if (u.x1 > B.x + 100 && u.x0 < B.x + 500) { comfy = (u.y0 + u.y1) / 2; break; }
    if (!B.air) sc -= 0.12 * Math.abs(B.y - comfy);
    if (plan.kick && !gotHoop) sc -= 25;
    return sc;
  }

  cpuBrain('dolphinrace', {
    // the computer races on by itself; a person who walked away just loses the rounds (nothing gets stuck)
    noIdleStop: true,
    bubbleHidden: true,
    bubblePos(p) {
      const st = G.mst;
      if (!st || !st.cam || !st.pl) return null;
      const D = st.pl[p.id], x = D.x - st.cam.x;
      return x < 0 || x > W ? null : { x, y: Math.max(110, D.y - 52) };
    },
    reset(S) { S.pl = null; },
    think(S, p, o, dt, info) {
      const out = {}, st = info.mst, m = G.match;
      if (!st || !st.pl || !st.course || !m) return out;
      const sk = skOf(info.skill), me = st.pl[p.id], c = st.course;
      if (S.pl !== st.pl) {
        S.pl = st.pl; S.planT = 0; S.plan = { dir: 'none', kick: false }; S.lapse = 0; S.fidget = 0; S.kickAt = null;
        S.saidEnd = false; S.seen = {}; S.want = {}; S.lastHoops = st.stat.hoops[p.id];
        S.startAt = sk.startReact * (1 + gauss() * sk.startSd * 2);
      }
      if (info.frozen) {
        if (m.phase === 'end' && m.end && !S.saidEnd) {
          S.saidEnd = true;
          if (m.end.winner === p.id) cpuSay(p, 'Eee-eee!');
          else if (m.end.winner === o.id) cpuSay(p, 'Good race!');
        }
        return out;
      }
      if (me.done || st.ph === 'set') return out;
      if (st.stat.hoops[p.id] > S.lastHoops) { S.lastHoops = st.stat.hoops[p.id]; if (Math.random() < 0.25) cpuSay(p, 'Splash!'); }
      // the start: leap off the line
      if (!me.started && st.rt < 1.5) {
        if (st.rt >= S.startAt) out.act = 'tap';
        return out;
      }
      // a lapse: hands off for a moment (Easy, a little Normal)
      if (S.lapse > 0) { S.lapse -= dt; return out; }
      if (sk.lapse && Math.random() < sk.lapse * dt) { S.lapse = sk.lapseT * (0.6 + Math.random() * 0.8); return out; }
      // a fidget: a random ▲ or ▼ held for a moment
      if (S.fidget > 0) { S.fidget -= dt; if (S.fidgetUp) out.jump = true; else out.down = true; return out; }
      if (sk.fidget && Math.random() < sk.fidget * dt) { S.fidget = 0.2 + Math.random() * 0.4; S.fidgetUp = Math.random() < 0.5; return out; }
      // what it notices (once per thing, as it comes into view)
      const view = me.x + 760;
      for (const ob of c.obs) if (S.seen[ob.id] === undefined && T().span(ob)[0] < view) S.seen[ob.id] = Math.random() < sk.see;
      for (const g of c.hoops) if (S.want[g.id] === undefined && g.x < view) S.want[g.id] = Math.random() < sk.hoopP;
      // re-plan every reaction time
      S.planT -= dt;
      if (S.planT <= 0) {
        S.planT = sk.react * (0.8 + Math.random() * 0.4);
        const plans = [];
        for (const dir of ['up', 'none', 'down']) {
          plans.push({ dir, kick: false });
          if (!me.air && me.leapCd <= 0 && me.kickT <= 0) plans.push({ dir, kick: true });
        }
        let best = null, bestSc = -Infinity;
        for (const pl of plans) {
          let sc = score(S, st, me, pl, sk);
          if (pl.dir === S.plan.dir && !pl.kick) sc += 4;
          if (sc > bestSc) { bestSc = sc; best = pl; }
        }
        S.plan = { dir: best.dir, kick: false };
        if (best.kick && S.kickAt == null) S.kickAt = st.rt + (sk.kickJit ? (Math.random() * 2 - 0.6) * sk.kickJit : 0);
        if (!best.kick && S.kickAt != null && S.kickAt > st.rt + 0.02) S.kickAt = null;
      }
      if (S.kickAt != null && st.rt >= S.kickAt) { S.kickAt = null; if (!me.air && me.leapCd <= 0) out.act = 'tap'; }
      if (S.plan.dir === 'up') out.jump = true;
      else if (S.plan.dir === 'down') out.down = true;
      return out;
    },
  });
})();
