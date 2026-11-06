/* Pip & Bo - Computer partner brain for 17-2 River Rapids Canoe (mode 'canoe'). */
'use strict';

/* 17-2 River Rapids Canoe. Both ride one canoe; the room def says who paddles (m.paddler) and the jobs swap every
   stretch, so the brain plays the job it has this stretch. It reads what the prompts and panels show
   (MODES.canoe.needs: the paddler's best line down the river, the jam ahead, the next thing the oar should poke and
   which notch reaches it), the water meter and the bucket, and presses keys like a person.
   - Paddler: steers toward the best line with paddle strokes on a steady beat (a stroke on the side it needs to go,
     otherwise left and right in turn for Swish speed), holds ◀ or ▶ for big corrections, and paddles away from a bank
     or sandbar when beached. It slows down (▼) in front of a jam that isn't open yet, in white water when the canoe is
     getting full, and, with a person bailing, before something the person still has to poke.
   - Bailer: scoops when the bucket is full (gold) and there is water to bail (sooner in white water, at once when the
     canoe is nearly swamped), aims the oar one notch at a time at the next thing in the way (or fruit off to the side)
     and pokes when the dotted line reaches it.
   Waiting for a slow person: it never does the person's job. As the paddler it stops at a jam until the person pokes
   it open and slows down for things the person should poke; with a person it says what it needs in a short bubble
   ("Poke the branches!", "Bail, please!", "Paddle away from the bank!"), not too often. Skill only changes how quickly it
   reacts; it plays well at every skill. */
(() => {
  function say(st, p, text, gap = 6) {
    const n = st.sayN && st.sayN.text === text ? st.sayN.n : 0, all = st.sayAll || 0;
    if (G.time - (st.saidT == null ? -99 : st.saidT) < gap * (1 + Math.floor(n / 3) + Math.floor(all / 8))) return;
    st.saidT = G.time; st.sayN = { text, n: n + 1 }; st.sayAll = all + 1; cpuSay(p, text, 1.8);
  }
  const keyOf = (id, what) => (typeof canoeKey === 'function' ? canoeKey(id, what) : '');

  /* ---------- the paddler ---------- */
  function paddler(st, p, o, m, nd, dt, info) {
    const P = MODES.canoe.CANOE, cn = m.cn, out = {};
    const beat = 0.42 + (1 - info.skill) * 0.12;
    if (st.pressT > 0) { st.pressT -= dt; out[st.pressDir < 0 ? 'left' : 'right'] = true; return out; }
    const stroke = dir => { st.pressT = 0.05; st.pressDir = dir; out[dir < 0 ? 'left' : 'right'] = true; };
    // beached: paddle away from the bank or the sandbar
    if (cn.beached) {
      if (G.time - cn.lastT > 0.3) stroke(cn.beached.dir);
      return out;
    }
    const e = nd.laneX - (cn.x + cn.vx * 0.45);
    let slow = false;
    if (nd.jam) {
      const dj = nd.jam.d - (cn.d + P.half), lx = nd.laneX;
      const free = !nd.jam.pieces.some(pc => !pc.gone && pc.x1 > lx - P.beam - 2 && pc.x0 < lx + P.beam + 2);
      if (dj < 190 && !free) slow = true;
      // stopped at it: keep still so the oar can reach what is in front of the canoe
      if (!free && cn.atJam && cn.v < 5) { out.down = true; if (!info.partnerCpu && dj < 120) say(st, p, 'Poke the ' + (nd.jam.hp > 1 ? 'logs' : 'branches') + '! ' + keyOf(o.id, 'poke')); return out; }
      if (!info.partnerCpu && dj < 120 && !free) say(st, p, 'Poke the ' + (nd.jam.hp > 1 ? 'logs' : 'branches') + '! ' + keyOf(o.id, 'poke'));
    }
    if (!info.partnerCpu && nd.poke && nd.poke.kind !== 'fruit' && nd.poke.far < 210) {
      slow = true;
      if (nd.poke.far < 170) say(st, p, nd.poke.aimed ? 'Poke it! ' + keyOf(o.id, 'poke') : 'Aim the oar at it!');
    }
    if (nd.rapidsAhead && cn.water > (info.partnerCpu ? 72 : 50)) slow = true;
    if (cn.water > (info.partnerCpu ? 80 : 60)) { slow = true; if (!info.partnerCpu) say(st, p, 'Bail, please! ' + keyOf(o.id, 'act')); }
    // big corrections: hold the way we need to go
    if (Math.abs(e) > 60) { out[e < 0 ? 'left' : 'right'] = true; return out; }
    if (slow) {
      out.down = true;
      // still line up (a short stroke sideways now and then)
      if (Math.abs(e) > 14 && G.time - cn.lastT > beat) stroke(Math.sign(e));
      return out;
    }
    if (G.time - cn.lastT > beat) stroke(e > 12 ? 1 : e < -12 ? -1 : -cn.lastSide || 1);
    return out;
  }

  /* ---------- the bailer ---------- */
  function bailer(st, p, o, m, nd, dt, info) {
    const P = MODES.canoe.CANOE, cn = m.cn, out = {};
    const lag = 0.04 + (1 - info.skill) * 0.1;
    // bail when the bucket is full and there's water to bail
    const goldAt = MODES.canoe.goldAt(m), thr = nd.rapidsAhead ? 8 : 20;
    if (cn.dip >= goldAt + lag * 2 && cn.water > thr) out.act = 'tap';
    else if (cn.water > 88 && cn.dip > 0.5) out.act = 'tap';
    // aim and poke
    const pk = nd.poke;
    const want = pk && pk.far < 330 ? pk.notch : 0;
    st.aimGap = (st.aimGap || 0) - dt;
    if (want !== cn.aim) {
      if (st.aimGap <= 0 && !st.aimHeld) { out[want < cn.aim ? 'left' : 'right'] = true; st.aimHeld = true; st.aimGap = 0.07; }
      else if (st.aimHeld) { st.aimHeld = false; }
    } else {
      st.aimHeld = false;
      if (pk && pk.reachable && cn.jabCd <= 0 && cn.jab <= 0 && cpuFor(st, 'aimed', true, dt) > lag) out.jump = 'tap';
    }
    if (want !== cn.aim || !pk) cpuFor(st, 'aimed', false, dt);
    // a person paddling: say what we need
    if (!info.partnerCpu) {
      if (cn.beached) say(st, p, 'Paddle away from the ' + (cn.beached.island ? 'sandbar!' : 'bank!'));
      else if (cn.v < 25 && !cn.atJam && cpuFor(st, 'stopped', true, dt) > 3) say(st, p, 'Paddle! Left, right, left, right!');
      else if (cn.v >= 25 || cn.atJam) cpuFor(st, 'stopped', false, dt);
      if (nd.rapidsAhead && cn.water > 70) say(st, p, 'Slow down ' + keyOf(o.id, 'down') + '! Too splashy!');
    }
    return out;
  }

  cpuBrain('canoe', {
    reset(st) { st.pressT = 0; st.aimHeld = false; },
    bubblePos(p) {
      const m = G.mst;
      if (!m || !m.cn) return null;
      const cy = typeof canoeSY === 'function' ? canoeSY(m, m.cn.d) : 372;
      const sideX = m.cn.x > W / 2 ? m.cn.x - 130 : m.cn.x + 130;
      return { x: sideX, y: cy + (p.id === m.bailer ? -10 : 40) };
    },
    think(st, p, o, dt, info) {
      const m = info.mst;
      if (!m || !m.cn || info.intro || m.cn.state !== 'go') return {};
      const nd = MODES.canoe.needs(m);
      return p.id === m.paddler ? paddler(st, p, o, m, nd, dt, info) : bailer(st, p, o, m, nd, dt, info);
    },
  });
})();
