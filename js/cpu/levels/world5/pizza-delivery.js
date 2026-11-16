/* Pip & Bo - Computer partner: pizza delivery. */
'use strict';

(() => {
  /* 5-2 Pizza Delivery (the Nov 2026 rework): both carry one tray up and down hilly streets. The tray only moves when
     both walk the same way, and each player raises (▲) or lowers (▼) their own end. A tilted tray makes the stack slide
     toward the low end; a pizza is only lost when it slides off. So the computer:
     - Keeps the tray level against the partner's end as it really is (it can't move their hands), looking a little
       ahead so it is already raised or lowered when the slope arrives. If the stack has slid, it tilts the tray back
       a little to bring it to the middle. In the wind it tilts into the gust.
     - Low awnings: it lowers its end, but never more than a few px below the partner's (so the tray stays level); the
       partner then follows, step by step. It stops short of the awning until the stack fits.
     - Dogs: the same, raising.
     - When its own end can't go far enough (the partner's end is too high or too low), it asks: "Raise your end!" /
       "Lower your end!".
     - Walking: it walks while the stack is safe and stops while it slides near an edge (then fixes the tilt first).
       With a person it walks when they walk, takes the first step after a moment ("Walk with me!"), and lets go again
       if they don't come along: walking alone never moves the tray. */
  const P = () => MODES.pizza.PZ;
  const M = () => MODES.pizza;

  function say(S, p, text, secs, gap, urgent) {
    const b = CPU.bubbles[p.id], now = G.time, said = S.said || (S.said = {});
    if (b && b.t > 0 && b.text === text) { cpuSay(p, text, secs); return; }
    if (now - (said[text] == null ? -99 : said[text]) < gap || (!urgent && now - (S.sayAt == null ? -99 : S.sayAt) < 2.5)) return;
    said[text] = now; S.sayAt = now; cpuSay(p, text, secs);
  }
  const walking = (i, dir) => (dir > 0 ? i.right && !i.left : i.left && !i.right);

  function think(S, p, o, dt, info) {
    const m = info.mst, out = {};
    if (!m || !m.pc || !m.R || m.phase !== 'play') return out;
    const Z = P(), R = m.R, me = m.pc[p.id], pal = m.pc[o.id], amR = p.id === m.right;
    const door = R.door ? R.door.cx : R.len, dir = door - 8 >= m.X ? 1 : -1;
    const person = !info.partnerCpu, theyWalk = walking(o.input, dir), v = Math.abs(m.V);
    const step = k => { out.right = k > 0; out.left = k < 0; };
    const sideSign = amR ? 1 : -1;                           // + : my end is the right one

    // ----- where my hands should be
    const look = Math.max(10, v) * 0.32;
    const feetAhead = pc => Math.min(pc.feet + 30, M().support(R, pc.xc + dir * look));
    const myFeet = feetAhead(me), palFeet = feetAhead(pal);
    const palHand = M().handAt(palFeet, pal.lift);
    // the tilt we want (+ : right end lower): back to the middle if it has slid, into the wind in a gust
    let tau = 0;
    if (Math.abs(m.s) > 0.12) tau = -Math.sign(m.s) * Math.min(Z.dead + 0.1, Z.dead + Math.abs(m.s) * 0.18);
    let windA = 0;
    if (R.wind && m.X > R.wind.x0 - 40 && m.X < R.wind.x1) {
      const Wd = Z.wind, t = m.windT0 == null ? -1 : m.roomT - m.windT0;
      if (t >= 0) {
        const c = t % Wd.period;
        if (c > Wd.warn - 0.35 && c < Wd.warn + Wd.gust) windA = R.wind.dir * Wd.force * m.windMul * (c < Wd.warn + Wd.ramp ? 0.75 : 1);
      }
    }
    if (windA) tau = -Math.sign(windA) * (Z.dead + Math.abs(windA) / Z.kSlide + 0.02) + (Math.abs(m.s) > 0.2 ? -Math.sign(m.s) * 0.05 : 0);
    // level against the partner's end: hr - hl = tau * span
    let target = palHand + sideSign * tau * Z.span;
    // awnings ahead: the mean hand height must come down enough for the stack to fit under
    const ahead = v * 0.9 + 46;
    const ceil = M().ceil(R, m.X - 30 + (dir < 0 ? -ahead : 0), m.X + 30 + (dir > 0 ? ahead : 0));
    const stackH = Z.trayTh + m.n * Z.boxH + 5;
    const meanMin = ceil + stackH;                             // mean hand y must be >= this (y down)
    let awnNeed = false, dogNeed = false;
    if (m.n > 0 && ceil > -1e8) {
      const meanNow = (target + palHand) / 2;
      if (meanNow < meanMin) { awnNeed = true; target = Math.min(palHand + 4 + sideSign * tau * Z.span, Math.max(target, 2 * meanMin - palHand)); }
    }
    // a dog ahead: raise the tray out of its reach
    const dog = R.dogs.find(d => (dir > 0 ? d.x > m.X - Z.span / 2 - 10 && d.x < m.X + 120 : d.x < m.X + Z.span / 2 + 10 && d.x > m.X - 120));
    if (dog && m.n > 0 && !awnNeed) {
      const reachY = M().gAt(R, dog.x) - Z.dog.reach - 6;
      if (Math.max(target, palHand) > reachY) { dogNeed = true; target = Math.max(palHand - 4 + sideSign * tau * Z.span, Math.min(target, reachY)); }
    }
    const lift = target - (myFeet - Z.handUp);
    const want = clamp(lift, Z.liftMin, Z.liftMax);
    if (me.lift > want + 1.2) out.jump = true;               // raise (hands up = smaller y)
    else if (me.lift < want - 1.2) out.down = true;
    // my end can't go far enough: ask the partner to help
    if (person && !info.intro) {
      if (lift < Z.liftMin - 4 && me.lift <= Z.liftMin + 1) say(S, p, 'Lower your end!', 1.4, 4);
      else if (lift > Z.liftMax + 4 && me.lift >= Z.liftMax - 1) say(S, p, 'Raise your end!', 1.4, 4);
      else if (awnNeed && pal.lift < Z.liftMax - 2 && v < 20) say(S, p, 'Both lower!', 1.4, 5);
      else if (dogNeed && pal.lift > Z.liftMin + 2) say(S, p, 'Raise it high!', 1.4, 5);
    }

    // ----- walk or stop
    let go = true;
    if (dir > 0 ? m.X >= door - 8 : m.X <= door + 8) go = false;           // at the door: settle
    // sliding near an edge, and still going the wrong way: stop and fix the tilt first
    if (Math.abs(m.s) > 0.55 && m.sv * m.s > -0.05) go = false;
    if (S.fixing && Math.abs(m.s) > 0.3) go = false; else S.fixing = false;
    if (!go && Math.abs(m.s) > 0.55) S.fixing = true;
    // an awning just ahead that the stack doesn't clear yet: wait for it to come down
    const hl = M().hand(m.pc[m.left]), hr = M().hand(m.pc[m.right]);
    const topNow = M().stackTop(m, hl, hr, m.n);
    const nearCeil = M().ceil(R, m.X - 30 + (dir < 0 ? -(v * 0.35 + 22) : 0), m.X + 30 + (dir > 0 ? v * 0.35 + 22 : 0));
    if (m.n > 0 && topNow - 1 < nearCeil) go = false;
    // a dog right ahead and the tray still low: wait a moment for it to go up
    if (dogNeed && dog && Math.abs(dog.x - (m.X + dir * 60)) < 50 && Math.max(hl, hr) > M().gAt(R, dog.x) - Z.dog.reach - 2) go = false;
    // a hand that has to move a long way for the next bit of slope: slow down by waiting a moment
    if (Math.abs(lift - me.lift) > 14 && Math.abs(m.s) > 0.25) go = false;

    // ----- with a person: walk when they walk, take the first step after a short wait
    if (person) {
      if (go && !theyWalk) {
        S.lead = info.intro ? 0 : (S.lead || 0) + dt;
        if (info.intro || S.lead < 0.6 || S.lead % 2.6 > 1.4 || info.partnerIdle > 20) go = false;
        if (S.lead > 1.6 && info.partnerIdle < 20) say(S, p, 'Walk with me!', 1.6, 6);
      } else S.lead = theyWalk ? 1 : 0;
      // they walk on while it slides: go along (stopping alone doesn't stop the tray), but say so
      if (theyWalk && !go && Math.abs(m.s) > 0.55) { say(S, p, 'Level it first!', 1.2, 4, true); go = true; }
    } else if (info.intro) go = false;

    if (go) step(dir);
    return out;
  }

  cpuBrain('pizza', {
    think,
    bubblePos: p => ({ x: cpuCx(p), y: p.y - 40 }),
  });
})();
