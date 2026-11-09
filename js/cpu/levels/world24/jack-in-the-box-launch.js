/* Pip & Bo - Computer partner brain for 24-2 Jack-in-the-Box Launch (mode 'jackbox'). */
'use strict';

(() => {
  /* 24-2 Jack-in-the-Box Launch (MODES.jackbox): the computer does whichever job this launch gives it (G.mst.cranker
     and G.mst.jumper say who; they swap after every launch) and reads what the team needs from G.mst.plan, made once a
     step by MODES.jackbox.plan (the same thing the prompts and the job panels read).
     CRANKER: it presses the action right on the beat (it watches the beat clock like a person watching the beat ball
       and listening to the tick, pressing about a twentieth of a second early so the press lands on the beat; one press
       per beat; before the last note, which pops the lid, it waits up to 4 beats while MODES.jackbox.risk says the
       pop's arc would run into the car, the mobile or the cat's tail), and taps ◀ / ▶ until the box's tilt matches the plan's tilt (the tilt whose no-steering arc lands
       nearest the yo-yo hook, worked out with MODES.jackbox.predict, the same arc the level draws for people). When
       the yo-yo has come down it presses the action to hook the box.
     JUMPER: in the box it holds ▼ to squish the spring once the tune is half played. In the air it presses ◀ ▶ toward
       the plan's wanted speed (to a star on the way up when one is in reach, then to the landing spot near the hook,
       leaning against a fan and away from the car, mobile or tail) and hops (▲) when the plan says the arc won't reach
       the shelf. On the shelf it walks to the gold hook, drops the yo-yo, and hauls with a press about every 0.16 s
       (a quick, steady person).
     It can never climb alone: as the cranker it can't haul the box up, and as the jumper it can't crank or hook. With a
     person who does nothing it waits too (CPU.idleStop), and the gold help in the level only comes while both are
     pressing things. With a person it says short things ("Crank on the beat!", "Hook the box!", "Haul me up!",
     "Wheee!"). Bubbles only show in 1-player mode (cpuSay). Team brains always play at full skill. */
  const M = () => MODES.jackbox;

  cpuBrain('jackbox', {
    reset(S) { S.tapT = 0; S.haulT = 0; S.boings = null; S.waitT = 0; S.lastSlot = -99; S.tune = null; },
    bubblePos(p) { return M().bubblePos(p); },
    think(S, p, o, dt, info) {
      const out = {}, st = info.mst;
      if (S.tapT == null) this.reset(S); // (a brain switched on without a reset still starts its timers at 0, not NaN)
      if (!st || !st.c || !st.plan || info.intro || st.state !== 'play' || st.waiting) return out;
      const D = M().JBOX, pl = st.plan, human = !info.partnerCpu, ph = st.phase;
      S.tapT -= dt;
      if (p.id === st.cranker) {
        if (ph === 'crank' && !st.pop) {
          // (a new tune, after a boing or on a new launch, starts its beats from 0 again)
          if (S.tune !== st.grades) { S.tune = st.grades; S.lastSlot = -99; }
          // aim first (a tap per step change), then crank on the beat
          if (st.box.tilt !== pl.tilt && S.tapT <= 0) { if (pl.tilt < st.box.tilt) out.left = true; else out.right = true; S.tapT = 0.12; }
          const bt = (G.time - st.beat0) / D.beatT, slot = Math.round(bt), off = G.time - (st.beat0 + slot * D.beatT);
          if (slot >= 0 && slot !== st.lastSlot && slot !== S.lastSlot && off > -0.05 && off < 0.04) {
            S.lastSlot = slot;
            // the last note pops the lid: wait a beat (up to 4) while the car, mobile or tail would be in the way
            const last = st.note === st.c.tune.length - 1;
            if (S.noteAt !== st.note) { S.noteAt = st.note; S.held = 0; }
            if (last && S.held < 4 && M().risk(st, st.box.tilt, M().power(st, true) + D.pK / st.c.tune.length + 0.06, D.popT * 0.5)) S.held++;
            else out.act = 'tap';
          }
          if (human && st.note === 0 && st.phaseT > 3) cpuSay(p, 'Hop in! Here we go!');
        } else if (ph === 'hook' && st.yoyo && st.yoyo.t > D.yoyoT + 0.15) {
          if (S.tapT <= 0) { out.act = 'tap'; S.tapT = 0.3; }
        } else if (ph === 'yoyo' && human) {
          S.waitT += dt;
          if (S.waitT > 5) cpuSay(p, 'Drop the yo-yo to me!');
        }
        if (ph !== 'yoyo') S.waitT = 0;
        if (human && ph === 'fly') cpuSay(p, 'Steer to the shelf!');
        if (human && ph === 'haul') cpuSay(p, 'Haul me up!');
      } else {
        if (ph === 'crank') {
          if (st.note >= st.c.tune.length / 2 || st.pop) out.down = true;
          if (human && st.note === 0 && st.phaseT > 4) cpuSay(p, 'Crank on the beat!');
        } else if (ph === 'fly') {
          if (pl.steer > 0) out.right = true; else if (pl.steer < 0) out.left = true;
          if (pl.hop) out.jump = 'tap';
          if (human && st.flyT < 0.4) cpuSay(p, 'Wheee!', 1.2);
        } else if (ph === 'yoyo') {
          if (pl.walk > 0) out.right = true; else if (pl.walk < 0) out.left = true;
          if (pl.atHook && S.tapT <= 0) { out.act = 'tap'; S.tapT = 0.3; }
        } else if (ph === 'hook') {
          if (human && st.yoyo && st.yoyo.t > 2) cpuSay(p, 'Hook the box!');
        } else if (ph === 'haul') {
          S.haulT -= dt;
          if (S.haulT <= 0) { out.act = 'tap'; S.haulT = 0.16; }
        }
      }
      if (human) {
        const b = st.stats.boings;
        if (S.boings != null && b > S.boings) cpuSay(p, p.id === st.jumper ? 'Boing! Again!' : 'Boing! You okay?', 1.6);
        S.boings = b;
      }
      return out;
    },
  });
})();
