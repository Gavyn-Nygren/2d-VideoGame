/* Pip & Bo - Computer partner brain for 18-1 Runaway Ship (mode 'runship'). */
'use strict';

/* 18-1 Runaway Ship. The room def says who steers (m.helm) and the jobs swap at every buoy, so the brain plays the job
   it has this stretch. It reads what the screen, the sea chart and the prompts show (MODES.runship.needs: the lane with
   the least trouble in sight ahead, whether fog hides it, the next big wave and how soon it hits, and the deckhand's most
   useful job), plus the ship's speed, water and sail, and presses keys like a person.
   Not cheating: the helm only counts rocks it could see (needs() leaves out rocks hidden in fog unless the deckhand is in
   the crow's nest, or the gold spyglass shows them on the chart), and it reads the wave's distance off the screen.
   - Helm: taps ▲ / ▼ one lane at a time toward the best lane (a short press, then lets go), holds ◀ to ease off when fog
     hides the way and nobody is looking out, and rings the bell when the wave is about to hit the bow.
   - Deckhand: does the job needs() names. It walks along the deck and hops up onto the quarterdeck or the forecastle,
     climbs the rope ladder (to a tangle, or to the crow's nest in fog) and climbs down again, holds the action on a leak
     or a knot, taps it at the pump and at the glowing cleat, walks over coins, and holds ▼ when a wave is about to hit
     and the bell hasn't rung.
   - At the anchor (the end) it runs to the capstan and holds the action until both pull it down.
   Waiting for a slow person: it never does the person's job. With a person it says what the ship needs in a short bubble
   ("Steer away from the reef!", "Climb to the crow's nest, please!"), not too often. Skill only changes how quickly it
   reacts; it plays well at every skill. */
(() => {
  function say(st, p, text, gap = 6) {
    const n = st.sayN && st.sayN.text === text ? st.sayN.n : 0, all = st.sayAll || 0;
    if (G.time - (st.saidT == null ? -99 : st.saidT) < gap * (1 + Math.floor(n / 3) + Math.floor(all / 10))) return;
    st.saidT = G.time; st.sayN = { text, n: n + 1 }; st.sayAll = all + 1; cpuSay(p, text, 1.8);
  }
  const keyOf = (id, what) => (typeof runshipKey === 'function' ? runshipKey(id, what) : '');

  /* ---------- the helm ---------- */
  function helm(st, p, o, m, nd, dt, info) {
    const P = MODES.runship.RUNSHIP, sh = m.ship, out = {};
    const lag = 0.08 + (1 - info.skill) * 0.15;
    // a lane press: down for a few steps, then up again (each press moves one lane)
    st.pressT = (st.pressT || 0) - dt;
    const want = cpuLag(st, 'lane', nd.lane, lag);
    if (st.pressT > 0.06) { out[st.pressDir < 0 ? 'jump' : 'down'] = true; }
    else if (st.pressT <= 0 && want !== sh.lane) { st.pressDir = want < sh.lane ? -1 : 1; st.pressT = 0.14; out[st.pressDir < 0 ? 'jump' : 'down'] = true; }
    if (nd.ease) out.left = true;
    // the bell: just before the wave reaches the bow
    if (nd.wave && !nd.wave.rang) {
      const win = m.bellGold ? P.waveWinGold : P.waveWin;
      if (nd.wave.tt <= win * 0.45 && nd.wave.tt > -0.1) out.act = 'tap';
    }
    // a person on deck: say what the ship needs
    if (!info.partnerCpu) {
      const j = nd.job, b = m.body[o.id];
      if (j && j.k === 'nest' && b.mode !== 'nest') say(st, p, 'Climb to the crow\'s nest, please!');
      else if (j && j.k === 'tangle' && m.tangle) say(st, p, 'Untangle the ropes up the ladder!');
      else if (j && j.k === 'trim') say(st, p, 'Pull the glowing rope! ' + keyOf(o.id, 'act'));
      else if (j && j.k === 'leak' && sh.water > 30) say(st, p, 'Patch the leak! Hold ' + keyOf(o.id, 'act'));
      else if (sh.water > 55) say(st, p, 'Pump the water out!');
      else if (j && j.k === 'hold') say(st, p, 'Big wave! Hold on!', 3);
    }
    return out;
  }

  /* ---------- the deckhand: walking, hopping, climbing ---------- */
  // walk to x on whichever deck it's on (hopping up a step on the way); true once there and stopped
  function walkTo(st, p, b, x, out, dead = 5) {
    const P = MODES.runship.RUNSHIP;
    if (b.mode === 'nest') { out.down = true; return false; }
    if (b.mode === 'climb') { out.down = true; if (Math.abs(b.x - P.mastX) > 26) out[b.x < P.mastX ? 'right' : 'left'] = true; return false; }
    const dx = x - b.x;
    const tgtGround = MODES.runship.groundAt(x, 8);
    // a step up on the way: hop it
    if (b.ground && b.mode === 'walk') {
      const upQd = x < P.qdX + 6 && b.x > P.qdX && b.y > P.qdY + 1 && b.x - P.qdX < 56;
      const upFc = x > P.fcX - 6 && b.x < P.fcX && b.y > P.fcY + 1 && P.fcX - b.x < 56;
      if ((upQd || upFc) && !(b.x > P.ratX0 - 8 && b.x < P.ratX1 + 8)) { out.jump = 'tap'; st.jumpHold = 0.3; }
    }
    if (st.jumpHold > 0) { st.jumpHold -= 1 / 120; out.jump = true; }
    if (Math.abs(dx) <= dead && Math.abs(b.y - tgtGround) < 2) {
      if (Math.abs(b.vx) > 50) { out.left = b.vx > 0; out.right = b.vx < 0; }
      return Math.abs(b.vx) <= 50 && b.ground;
    }
    if (Math.abs(dx) <= dead) return false;
    const stopD = (b.vx * b.vx) / (2 * P.fric);
    if (Math.sign(b.vx) === Math.sign(dx) && stopD >= Math.abs(dx) - dead * 0.5 && b.ground) { out.left = b.vx > 0; out.right = b.vx < 0; }
    else { out.left = dx < 0; out.right = dx > 0; }
    return false;
  }
  // climb the rope ladder to a spot (y = body middle) or into the crow's nest; true once there
  function climbTo(st, p, b, y, out, nest) {
    const P = MODES.runship.RUNSHIP;
    if (b.mode === 'nest') { if (nest) return true; out.down = true; return false; }
    if (b.mode !== 'climb') {
      if (Math.abs(b.x - P.mastX) > 14 || !b.ground) { walkTo(st, p, b, P.mastX, out, 8); return false; }
      if (b.y > P.deckY - 0.5 && b.ground) { out.up = true; out.jump = 'tap'; }
      else walkTo(st, p, b, P.mastX, out, 8);
      return false;
    }
    if (Math.abs(b.x - P.mastX) > 12) out[b.x < P.mastX ? 'right' : 'left'] = true;
    if (nest) { out.up = true; return false; }
    const c = b.y - 13;
    if (c > y + 5) out.up = true; else if (c < y - 5) out.down = true;
    return Math.abs(c - y) < 14;
  }
  function deckhand(st, p, o, m, nd, dt, info) {
    const P = MODES.runship.RUNSHIP, sh = m.ship, b = m.body[p.id], out = {};
    if (!b || b.mode === 'splash' || b.hop) return out;
    const lag = 0.06 + (1 - info.skill) * 0.15;
    const j = nd.job;
    if (!j) return out;
    st.job = cpuFor(st, 'job:' + j.k, true, dt) > lag ? j : (st.job || j);
    const J = st.job.k === j.k ? j : st.job;
    switch (J.k) {
      case 'hold':
        if (b.ground && b.mode === 'walk') out.down = true;
        break;
      case 'tangle':
        if (climbTo(st, p, b, J.y, out, false) && m.tangle) out.act = true;
        break;
      case 'nest':
        climbTo(st, p, b, P.nestY, out, true);
        break;
      case 'trim':
        if (walkTo(st, p, b, J.x, out, 8)) out.act = 'tap';
        break;
      case 'leak':
        if (walkTo(st, p, b, J.x, out, 7)) out.act = true;
        else if (Math.abs(b.x - J.x) < 12 && b.ground && Math.abs(b.y - J.y) < 2) out.act = true;
        break;
      case 'pump':
        if (walkTo(st, p, b, J.x, out, 8)) out.act = 'tap';
        break;
      case 'coin':
        walkTo(st, p, b, J.x, out, 4);
        break;
      default:
        if (b.mode === 'climb' || b.mode === 'nest') walkTo(st, p, b, J.x, out, 20);
        else if (Math.abs(b.x - J.x) > 60) walkTo(st, p, b, J.x, out, 30);
    }
    // a person at the helm: say what the ship needs
    if (!info.partnerCpu) {
      if (sh.aground) say(st, p, 'Steer away from the reef! ' + keyOf(o.id, 'ud'));
      else if (nd.wave && !nd.wave.rang && nd.wave.tt < 1.2 && nd.wave.tt > 0) say(st, p, 'Ring the bell as it hits! ' + keyOf(o.id, 'act'), 4);
      else if (nd.threat && nd.lane !== sh.lane) say(st, p, nd.lane < sh.lane ? 'Rock ahead! Steer up!' : 'Rock ahead! Steer down!', 4);
    }
    return out;
  }
  // the anchor: both run to the capstan on the forecastle and hold the action
  function anchor(st, p, o, m, dt) {
    const P = MODES.runship.RUNSHIP, b = m.body[p.id], out = {};
    if (!b || m.state !== 'anchor') return out;
    const spot = p.id === 0 ? P.anchorX - 16 : P.anchorX + 16;
    const there = b.ground && b.x > P.anchorX0 + 4 && b.x < P.anchorX1 - 4 && b.y < P.deckY - 1;
    if (there) { out.act = true; if (Math.abs(b.x - spot) > 10) walkTo(st, p, b, spot, out, 8); }
    else walkTo(st, p, b, spot, out, 8);
    if (!cpuOn(o.id) && there && cpuFor(st, 'waitAnchor', !m.anchorAt || !m.anchorAt[o.id], dt) > 2) say(st, p, 'Hold the action at the anchor with me!', 5);
    return out;
  }

  cpuBrain('runship', {
    reset(st) { st.pressT = 0; st.jumpHold = 0; st.job = null; },
    think(st, p, o, dt, info) {
      const m = info.mst;
      if (!m || !m.ship || info.intro) return {};
      if (m.state === 'anchor') return anchor(st, p, o, m, dt);
      if (m.state !== 'sail') return {};
      const nd = MODES.runship.needs(m);
      return p.id === m.helm ? helm(st, p, o, m, nd, dt, info) : deckhand(st, p, o, m, nd, dt, info);
    },
  });
})();
