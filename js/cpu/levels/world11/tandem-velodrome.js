/* Pip & Bo - Computer partner brain for 11-2 Tandem Velodrome (mode 'tandem'). */
'use strict';

/* 11-2 Tandem Velodrome. Both ride one tandem; the race (room) says who pedals (m.ped) and who leans (m.lean), and the
   jobs swap every race, so the brain just plays the seat it sits in.
   - Pedaler: presses ◀ and ▶ in turn on the drum beats it can see and hear (the beat lane in its panel and Bongo's
     drum), aiming each press at a beat with a small timing error (Hard about 18 ms, Normal 30 ms, Easy 45 ms, so even
     Easy lands nearly every press as Good or Perfect), one press per beat, never mashing. It starts on the GO beat. On
     the rail it stops pressing (the pedals do nothing there) and asks for a lean.
   - Leaner: holds ▲ (jump) to lean in or ▼ to sit up so the lean stays inside the gold wedge, aiming at the wedge a
     little ahead along the track (where the bike will be in a few hundredths of a second, a little more on Easy), so it is already leaning
     as a turn starts and sitting up as it ends. Off the line it leans a touch more (high on the bank) or less (on the
     apron) inside the wedge; on the rail it leans in until the bike pushes off.
   - With a person: the computer's seat helps from its own side only (it never presses the other job's keys). It waits
     for a slow pedaler (the lean follows whatever speed the bike has) and talks only when it helps: a leaner who left
     the bike on the rail ("Lean in!", only while the level's own hint pill is not up), a pedaler who stopped ("Pedal on the beat!"), mashes ("One press a beat!") or
     keeps pressing the same foot, a leaner leaning far too much ("Sit up a bit!"). At most one bubble every few seconds, less often when repeated.
   Reads only what is on screen: the beat lane and drum, the lean gauge and its wedge (the bank and speed), the bike. */
(() => {
  const K = () => TANDEM;
  // a short bubble for the person, at most one every few seconds (less and less often for the same words)
  function say(st, p, text, gap = 5) {
    const n = st.sayN && st.sayN.text === text ? st.sayN.n : 0;
    if (G.time - (st.saidT == null ? -99 : st.saidT) < gap * (1 + Math.floor(n / 3))) return;
    st.saidT = G.time; st.sayN = { text, n: n + 1 }; cpuSay(p, text, 1.8);
  }
  // the level is showing (or about to show) the leaner a hint pill (on the rail it shows two in a row)
  const leanHint = m => !!(m.hints[m.lean] || m.hintPend || (m.bike.rail && !m.hinted['rail' + m.k]));
  const gauss = () => { let u = 0; for (let i = 0; i < 4; i++) u += Math.random(); return (u - 2) / 0.577; };

  /* ---------- the pedaler ---------- */
  function pedal(st, p, o, m, dt, info) {
    const out = {}, bt = m.beat, b = m.bike;
    if (m.phase !== 'count' && m.phase !== 'race') { st.plan = null; return out; }
    if (st.hold > 0) { st.hold -= dt; out[st.holdKey] = true; return out; }
    if (b.rail) {
      st.plan = null;
      // (not while the level's own hint pill for the leaner is up or about to show: one message at a time)
      if (!info.partnerCpu && b.railT > 0.8 && !leanHint(m)) say(st, p, 'Lean in!', 4);
      return out;
    }
    // the next beat to aim at: from the GO beat on, one after the last press
    const first = K().count - 1, sd = 0.018 + (1 - info.skill) * 0.042;
    if (!st.plan || st.plan.P !== bt.P || st.plan.base !== bt.base || st.plan.k <= bt.judged) {
      let k = Math.max(first, bt.judged + 1, Math.ceil((m.rt - bt.base) / bt.P - 0.1));
      // (a beat already too close to reach in time: the one after)
      if (bt.base + k * bt.P - m.rt < 0.02) k++;
      st.plan = { k, P: bt.P, base: bt.base, at: bt.base + k * bt.P + clamp(gauss() * sd, -0.12, 0.12) };
    }
    if (m.rt >= st.plan.at) {
      const foot = b.lastFoot === 0 ? 'right' : 'left';
      st.hold = 3 / 120; st.holdKey = foot; out[foot] = true;
      st.plan = { k: st.plan.k + 1, P: bt.P, base: bt.base, at: bt.base + (st.plan.k + 1) * bt.P + clamp(gauss() * sd, -0.12, 0.12) };
    }
    // a person leaner who is way off: say so (now and then)
    if (!info.partnerCpu && m.phase === 'race') {
      const need = tandemNeed(tandemWrap(b.s0 + b.d), b.v), tol = m.helpLean ? K().tolHelp : K().tol;
      if (b.lean - need > tol + 0.25 && b.apron) say(st, p, 'Sit up a bit!');
      // (no "Lean in!" before the rail: the level's own gold "Lean in! ↑" prompt is already over the leaner's head)
    }
    return out;
  }

  /* ---------- the leaner ---------- */
  function lean(st, p, o, m, dt, info) {
    const out = {}, b = m.bike, Kk = K();
    if (m.phase === 'wait' || m.phase === 'podium') return out;
    const s = tandemWrap(b.s0 + b.d);
    if (b.rail) { out.jump = true; return out; }
    if (b.done) return out;
    // aim at the wedge a little ahead (reaction plus the time the lean takes to move)
    const look = 0.03 + (1 - info.skill) * 0.05;
    const vLag = cpuLag(st, 'v', b.v, 0.08 + (1 - info.skill) * 0.1);
    let target = tandemNeed(s + b.v * look, vLag);
    const tol = m.helpLean ? Kk.tolHelp : Kk.tol;
    // off the racing line: a touch more lean when high on the bank, less when low (still inside the wedge)
    if (b.pos > Kk.line + 0.15) target += tol * 0.45;
    if (b.pos < Kk.line - 0.15) target -= tol * 0.45;
    target = clamp(target, 0, Kk.leanMax);
    const dead = 0.035 + (1 - info.skill) * 0.03;
    if (b.lean < target - dead) out.jump = true;
    else if (b.lean > target + dead) out.down = true;
    // a person pedaler who stopped or keeps pressing one foot: say so
    if (!info.partnerCpu && m.phase === 'race') {
      if (m.rt - m.lastStroke > 2.5 && b.v < 150) say(st, p, 'Pedal on the beat!');
      // (a masher: the pedal panel just said "Easy! One press a beat")
      else if (m.uiPop && m.uiPop.t < 0.1 && /One press/.test(m.uiPop.s)) say(st, p, 'One press a beat!', 6);
      else if (m.grade && m.grade.word === 'Other foot!' && m.grade.t < 0.1) {
        st.sameN = (st.sameN || 0) + 1;
        if (st.sameN >= 3) { st.sameN = 0; say(st, p, 'Left, right, left!', 6); }
      }
    }
    return out;
  }

  cpuBrain('tandem', {
    bubbleHidden: true,
    // over the rider's head on the bike (the level puts p.x / p.y there)
    bubblePos(p) { return { x: p.x + PW / 2, y: p.y - 4 }; },
    reset(st) { st.plan = null; st.hold = 0; },
    think(st, p, o, dt, info) {
      const m = info.mst;
      if (!m || !m.bike) return {};
      return p.id === m.ped ? pedal(st, p, o, m, dt, info) : lean(st, p, o, m, dt, info);
    },
  });
})();
