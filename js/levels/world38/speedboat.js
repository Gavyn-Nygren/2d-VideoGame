/* Pip & Bo - Level 38-4 Speedboat Getaway (team, World 38 Operation Midnight). */
'use strict';

/* ===== 38-4 Speedboat Getaway (mode 'spyboat', team, fast auto-scrolling) =====
   Act four: out of the boathouse in Count Zero's own speedboat, his fleet behind, to the seaplane past the breakwater.
   Side view across the night harbour. The world runs along d (px); the boat sits at screen x S.bx and the harbour
   slides past at the boat's speed. The water has three CHANNELS (lanes 0 near, 1 middle, 2 far; stretch 1 has only
   0 and 1), drawn in depth: a nearer channel is lower on the screen and a little bigger. The mode owns the tick, the
   picture and the HUD (ownStep + ownHUD + noFalls).
   ROLES swap each stretch (Pip steers in stretches 1 and 3, Bo in 2 and 4):
   - STEERER: ▲ ▼ change channel (S.laneT s a move; held, it keeps going), ▶ throttle up, ◀ ease off (never below
     S.thrMin). ACTION = horn (S.hornCd s cooldown): gulls fly off and fishing boats pull aside within S.hornR px.
   - GADGETS: ◀ ▶ pick a gadget on the brass control box, ACTION = use it. Smoke (blinds the chasers behind for
     S.smokeT s: they hold their line, drop back, jet skis spin out; the helicopter's light loses the boat), Oil (a
     slick in our channel: the first boat over it spins out; jet skis jump it), Boost (S.boostT s of S.boostV) and,
     from stretch 3, Magnet (a floating mine within S.magR px flies at the nearest chaser). Brass crates refill +1 of
     each (the steerer drives through them).
   CHASERS: Zero boats come from behind and close in; they copy our channel S.lagT s late (by distance: the channel
   we had S.lagT s of travel ago), so a late dodge round a buoy wrecks them. One that draws level BUMPS us (Chase
   meter up, a lurch) and drops back. Jet skis (stretch 2 on) weave and jump oil. The helicopter (stretches 3, 4): its
   light slides to the boat, locks (S.netLock s), and S.netDelay s later drops a net on the channel it's on (S.netFall s
   to land): change channel as it drops, or be in smoke. THE GRAB (stretch 4): the claw comes down on the briefcase;
   the gadget agent HOLDS the action (tug bar) while the steerer takes the marked low arch of the bridge ahead, which
   knocks the claw off. Ramps clear what's behind them at S.rampV or on a Boost; closing gates need a Boost (each ramp
   and gate before stretch 4 has a slower way round over sandbars). Wakes toss the boat a channel unless the steerer
   holds into them.
   CHASE METER (0-100): bumps, nets and slow driving fill it, wrecks and clean driving drain it. Full: Caught, back to
   the checkpoint. A shut gate, the claw winning or falling short of the seaplane also go back to the checkpoint.
   GOLD HELP (3 bumps in a stretch, both playing): a gold boat; gadgets recharge by themselves (one every S.goldRe s),
   chasers close 25% slower and gate countdowns run 0.5 s longer. Computer partner: js/cpu/levels/world38/speedboat.js. */
(() => {
  const K = SPY, COL = K.COL, TAU = Math.PI * 2, H_ = K.hash;
  const S = {
    vmax: 500, thrMin: 0.6, thr0: 0.9, thrRate: 0.9, accel: 700, boostV: 780, boostT: 1.5, rampV: 480, laneT: 0.35,
    airT: 1.05, airH: 74, bx: 240, bow: 52, chaseV: 515, chaseFar: 610, farGap: 260, lagT: 0.6, bumpGap: 10,
    hornCd: 3, hornR: 560, smokeT: 2.5, smokeR: 460, oilR: 380, oilLife: 7, magR: 650, netLock: 0.6, netDelay: 1.5,
    netFall: 0.5, netCd: 3.2, stallT: 0.6, stallV: 0.4, sandV: 0.55, idleWait: 12, restartT: 2.4, gateK: 0.94,
    bumpC: 18, netC: 18, gullC: 8, slowC: 4, wreckC: 12, drainC: 3, cleanT: 8, goldRe: 8, tugDrain: 0.3, tugFill: 0.3,
    goldT: 195, silverT: 300, bottles: 20,
  };
  const GADGETS = ['smoke', 'oil', 'boost', 'magnet'], GNAME = { smoke: 'Smoke', oil: 'Oil', boost: 'Boost', magnet: 'Magnet' };
  const MAXC = { smoke: 3, oil: 3, boost: 2, magnet: 2 };
  const LANE_Y = [456, 396, 344], LANE_S = [1.08, 0.97, 0.86];
  const laneY = l => { const i = clamp(Math.floor(l), 0, 1), f = clamp(l - i, 0, 1); return LANE_Y[i] + (LANE_Y[i + 1] - LANE_Y[i]) * f; };
  const laneS = l => { const i = clamp(Math.floor(l), 0, 1), f = clamp(l - i, 0, 1); return LANE_S[i] + (LANE_S[i + 1] - LANE_S[i]) * f; };
  const T = t => Math.round(t * S.vmax);
  const LEN = { buoy: 26, mine: 26, fish: 96, moored: 130, gulls: 70, crate: 34, bottle: 24, ramp: 60, chain: 22 };

  /* ---------- the four stretches (positions in seconds of full-speed travel) ---------- */
  function build(k) {
    const L = { k, lanes: k === 0 ? 2 : 3, obj: [], spawns: [], cps: [], len: 0, heli: null, grab: null, start: {} };
    const o = (t, type, lane, x) => { const ob = Object.assign({ d: T(t), type, lane, len: LEN[type] || 30, hit: false, id: L.obj.length }, x || {}); L.obj.push(ob); return ob; };
    const span = (t, type, lane, dur, x) => o(t, type, lane, Object.assign({ len: T(dur) }, x || {}));
    const spawn = (t, kind, lane, x) => L.spawns.push(Object.assign({ d: T(t), kind, lane, done: false }, x || {}));
    const ramp = (t, lane, low, look, airBottle) => {
      o(t, 'ramp', lane, { look });
      for (let l = 0; l < L.lanes; l++) if (l !== lane && l !== low) o(t + 0.78, 'chain', l, { look: look === 'whale' ? 'mines' : 'chain' });
      o(t + 0.78, 'chain', lane, { look: look === 'whale' ? 'mines' : 'chain', under: true });
      if (low != null) span(t - 0.6, 'sand', low, 2.4);
      if (airBottle) o(t + 0.45, 'bottle', lane, { air: true });
    };
    const gate = (t, lanes, low) => { o(t, 'gate', -1, { lanes, dist: 1400, st: 'open', left: 0, low }); if (low != null) span(t - 1.6, 'sand', low, 2.6); };
    if (k === 0) { // The Boathouse Canal: two channels, one boat at a time, learn oil and smoke
      L.len = T(38); L.start = { smoke: 2, oil: 2, boost: 0, magnet: 0 }; L.cps = [T(19)];
      o(0.15, 'doors', -1);
      o(2, 'bottle', 1); o(3, 'buoy', 0); o(4.5, 'buoy', 1); spawn(5.5, 'boat', 0);
      o(7, 'buoy', 0); o(8, 'bottle', 0); o(9.5, 'moored', 1); o(11, 'crate', 1); o(12.2, 'buoy', 1); o(13, 'bottle', 1);
      span(14.2, 'pier', 0, 2); o(17, 'gulls', 1); o(18.2, 'buoy', 0);
      spawn(20, 'boat', 1, { one: true }); o(21, 'bottle', 0); o(22.5, 'buoy', 0); o(24, 'buoy', 1); o(25, 'crate', 0); o(26.3, 'fish', 1);
      o(28, 'buoy', 0); o(29, 'bottle', 1); o(30.5, 'buoy', 1); spawn(31, 'boat', 0, { one: true }); o(33, 'buoy', 0); o(35, 'moored', 1);
    } else if (k === 1) { // The Docks: piers, the ferry, jet skis, the first gate and the first ramp
      L.len = T(40); L.start = { smoke: 2, oil: 2, boost: 1, magnet: 0 }; L.cps = [T(16)];
      o(1.5, 'bottle', 2); o(3, 'buoy', 1); span(4, 'pier', 2, 2.5); spawn(5, 'boat', 1); o(6, 'buoy', 0); o(7, 'bottle', 0); o(8.2, 'fish', 1);
      span(9.6, 'ferry', 2, 0.7, { lanes: [1, 2] }); spawn(10.5, 'ski', 2); o(11.6, 'buoy', 0); o(13, 'crate', 1); o(14, 'buoy', 2); o(15, 'bottle', 1);
      o(17.2, 'crate', 2); gate(21.5, [1, 2], 0);
      o(23.2, 'buoy', 1); spawn(24, 'boat', 2); o(25, 'bottle', 2); o(26.2, 'buoy', 0); span(27, 'pier', 1, 1.5); o(28.6, 'crate', 0);
      ramp(31, 1, 0, 'barge', true); spawn(33.5, 'ski', 0); o(35, 'buoy', 2); o(36.5, 'buoy', 0); o(38, 'buoy', 1);
    } else if (k === 2) { // Open Harbour: waves and wakes, mines and the Magnet, the helicopter's net, the whale
      L.len = T(40); L.start = { smoke: 2, oil: 2, boost: 1, magnet: 1 }; L.cps = [T(17)]; L.heli = { from: T(6), to: T(37) };
      o(2, 'bottle', 1); o(3, 'mine', 0); o(4, 'mine', 2); spawn(5, 'boat', 1); o(6.4, 'wake', -1, { dir: -1 }); o(8, 'mine', 1); o(9, 'bottle', 2);
      o(10, 'crate', 0); spawn(11, 'ski', 2); o(12, 'mine', 0); o(13, 'mine', 2); o(14.4, 'wake', -1, { dir: 1 }); o(15.6, 'mine', 1);
      o(18, 'crate', 1); o(19, 'bottle', 0); spawn(20, 'boat', 0); o(21, 'mine', 2); ramp(24, 2, 0, 'whale', true);
      o(27.4, 'wake', -1, { dir: -1 }); o(28.4, 'mine', 0); o(29.4, 'mine', 1); spawn(30, 'boat', 2); o(31, 'bottle', 1); o(32, 'crate', 2);
      o(33.2, 'mine', 0); o(34.6, 'mine', 2); o(36.2, 'wake', -1, { dir: 1 }); o(37.6, 'mine', 1);
    } else { // The Breakwater: everything, the grab under the bridge, three chasers, the last ramp to the seaplane
      L.len = T(40.5); L.start = { smoke: 2, oil: 2, boost: 1, magnet: 1 }; L.cps = [T(19.4), T(32)]; L.heli = { from: T(3), to: T(36) };
      o(1.5, 'bottle', 2); o(3, 'mine', 1); spawn(4, 'boat', 0); o(5, 'wake', -1, { dir: -1 }); span(6, 'pier', 2, 2); o(7, 'bottle', 0); o(8, 'crate', 1);
      o(9, 'mine', 0); L.grab = { d: T(10.6) }; o(12, 'buoy', 2); o(13.5, 'mine', 1); o(15, 'fish', 0); o(16.2, 'bottle', 0);
      L.bridge = o(18.2, 'bridge', -1, { arch: 0 });
      o(21, 'crate', 2); spawn(22, 'boat', 0, { three: true }); spawn(22, 'boat', 1); spawn(22, 'boat', 2);
      o(23.6, 'mine', 1); o(25, 'wake', -1, { dir: 1 }); o(26.2, 'buoy', 0); o(27.2, 'mine', 2); o(28.4, 'bottle', 2);
      span(29.4, 'ferry', 0, 0.7, { lanes: [0, 1] }); o(31, 'crate', 1); o(33.2, 'buoy', 2); o(34.2, 'crate', 0); o(35.4, 'bottle', 1);
      L.final = o(37.6, 'bigramp', -1, { len: 200 });
    }
    L.obj.sort((a, b) => a.d - b.d);
    return L;
  }
  const blocks = (ob, lane) => ob.lanes ? ob.lanes.includes(Math.round(lane)) : Math.abs(lane - ob.lane) < 0.55;

  /* ---------- state ---------- */
  function room(st, def, k) {
    st.k = k; st.L = build(k);
    st.steerId = k % 2 === 0 ? 0 : 1; st.gadId = 1 - st.steerId;
    st.rc = { bumps: 0 }; st.gold = false; st.cp = null; st.state = 'go'; st.endT = 0; st.segStart = G.time;
    st.ch = Object.assign({}, st.L.start); st.sel = st.ch.boost > 0 ? 'boost' : 'oil';
    place(st, 0);
    K.fx(st);
    K.actLabels(st.steerId === 0 ? ['horn', 'gadget'] : ['gadget', 'horn'], 'gadget');
    st.radioDue = k === 0 ? 0.6 : null;
    if (k === 1) K.control(st, 'The docks. Watch for the lock gate: Boost to beat it.');
    if (k === 2) K.control(st, 'Open water. Count Zero is in the helicopter. Change channel when the net drops!');
    if (k === 3) K.control(st, 'The breakwater. The seaplane is lifting off: Boost off the end!');
  }
  function place(st, d) {
    const L = st.L;
    st.b = { d, v: S.vmax * S.thr0, thr: S.thr0, ly: 0, tl: 0, moveT: 0, air: 0, airT: 0, boost: 0, stall: 0, stallV: 1, hornT: 0, lurch: 0, sand: false, drip: 0, splash: 0 };
    st.track = [{ d: d - 2000, l: 0 }, { d, l: 0 }];
    st.chasers = []; st.smoke = []; st.oil = []; st.flings = []; st.net = null; st.cleanT = 0; st.chase = 0;
    st.heli = { x: 2, phase: 'track', t: 0, lock: 0, on: false, sx: 760 }; st.grab = null; st.goldRe = 0; st.prevK = [{}, {}];
    st.loneT = 0;
    for (const ob of L.obj) if (ob.d >= d) { ob.hit = false; ob.aside = 0; ob.got = false; if (ob.type === 'gate') { ob.st = 'open'; ob.left = 0; } }
    for (const sp of L.spawns) if (sp.d >= d) sp.done = false;
    if (L.grab && L.grab.d >= d) L.grab.done = false;
    st.T = 0;
  }
  function restart(st, why) {
    const cp = st.cp;
    place(st, cp ? cp.d : 0);
    st.ch = Object.assign({}, cp ? cp.ch : st.L.start);
    if (st.ch.boost < 1) st.ch.boost = 1;
    for (const ob of st.L.obj) if (ob.type === 'bottle' && ob.d >= (cp ? cp.d : 0) && st.got[ob.id]) { ob.got = true; }
    st.state = 'go'; st.endT = 0;
    K.msg(st, why, '#ffffff', 2.6);
  }

  /* ---------- reading the water ahead (the plan, the brain and the prompts all use these) ---------- */
  // speed now (the target the boat is easing to)
  function speedNow(st) {
    const b = st.b;
    if (b.boost > 0) return S.boostV * (b.sand ? 0.8 : 1);
    return S.vmax * b.thr * (b.sand ? S.sandV : 1) * (b.stall > 0 ? S.stallV : 1);
  }
  // how far the boat gets in t s (boosting first if it is, or if `boostNow`)
  function reach(st, t, boostNow) {
    const b = st.b, v = S.vmax * Math.max(b.thr, 0.95);
    const bt = b.boost > 0 ? b.boost : boostNow ? S.boostT : 0;
    return Math.min(t, bt) * S.boostV + Math.max(0, t - bt) * v;
  }
  // can the boat get through a closing gate (its bow at the gate before it shuts)?
  function gateMakes(st, g, boostNow) {
    const dist = g.d - (st.b.d + S.bow);
    if (g.st === 'shut') return false;
    if (g.st === 'open') return true;
    return reach(st, g.left, boostNow) >= dist;
  }
  // the first hard thing ahead in channel `lane` within `far` px (distance from the bow), as the plan sees it
  function hazardIn(st, lane, far, opt = {}) {
    const b = st.b, bow = b.d + S.bow;
    let best = Infinity, what = null;
    for (const ob of st.L.obj) {
      if (ob.d + (ob.len || 0) < bow - 70) continue;
      if (ob.d > bow + far) break;
      if (ob.hit || ob.aside) continue;
      let hard = false;
      switch (ob.type) {
        case 'buoy': case 'mine': case 'moored': case 'pier': case 'ferry': hard = blocks(ob, lane); break;
        case 'fish': case 'gulls': hard = blocks(ob, lane) && (b.hornT > (ob.d - bow) / Math.max(300, b.v) - 0.1 || opt.noHorn); break;
        case 'chain': hard = blocks(ob, lane) && !(ob.under && opt.jump); break;
        case 'gate': hard = ob.lanes.includes(lane) && !opt.gateOk; break;
        case 'bridge': hard = st.grab && st.grab.on && lane !== ob.arch; break;
      }
      if (!hard) continue;
      const dd = Math.max(0, ob.d - bow);
      if (dd < best) { best = dd; what = ob; }
    }
    return { dist: best, ob: what };
  }
  const nextOf = (st, type, far) => { const bow = st.b.d + S.bow; return st.L.obj.find(o => o.type === type && !o.hit && o.d + (o.len || 0) > bow - 10 && o.d < bow + far); };
  const live = st => st.chasers.filter(c => !c.wreck);
  const gapOf = (st, c) => st.b.d - c.d;
  function trackLane(st, d) {
    const tr = st.track;
    for (let i = tr.length - 1; i >= 0; i--) if (tr[i].d <= d) return tr[i].l;
    return tr[0].l;
  }

  /* ---------- the plan: what each of us should do now ---------- */
  function plan(st) {
    if (st.planMemo && st.planMemo.n === G.tickN && st.planMemo.k === st.k) return st.planMemo.p;
    const p = planNow(st);
    st.planMemo = { n: G.tickN, k: st.k, p };
    return p;
  }
  function planNow(st) {
    const b = st.b, L = st.L, v = Math.max(360, b.v), bow = b.d + S.bow, gadCpu = cpuOn(st.gadId);
    const P = { steer: { lane: b.tl, thr: 1, horn: false, brace: 0, why: 'drive' }, gad: { pick: st.sel, use: null, hold: false, why: '' } };
    if (st.state !== 'go') return P;
    const cs = live(st), behind = cs.filter(c => gapOf(st, c) > -20 && gapOf(st, c) < 520);
    // --- the next thing that wants a Boost, and how many Boosts the rest of the stretch needs
    const gate = nextOf(st, 'gate', 2600), ramp = nextOf(st, 'ramp', 1400), fin = L.final && !L.final.hit && L.final.d > bow - 10 ? L.final : null;
    const reserve = (fin ? 1 : 0) + (gate && gate.st !== 'shut' ? 1 : 0);
    // will we jump the ramp? (full speed is enough; a stalled boat needs a Boost)
    const jumpOk = !!ramp && (b.boost > 0 || b.v >= S.rampV - 5 || st.ch.boost > 0);
    // is the gate's channel worth it? a computer gadget agent boosts at the countdown; a person gets 1 s to do it
    let gateOk = true;
    if (gate) {
      if (gate.st === 'open') gateOk = st.ch.boost > 0 || b.boost > 0;
      else if (gate.st === 'shut') gateOk = false;
      else gateOk = gateMakes(st, gate, false) || (st.ch.boost > 0 && gateMakes(st, gate, true) && (gadCpu || gate.t0 < 1.0));
    }
    // --- the steerer: the channel with the longest clear run, dodging late when a boat follows (to wreck it)
    const H = v * 2.2, hz = [];
    for (let l = 0; l < L.lanes; l++) hz[l] = hazardIn(st, l, H, { jump: jumpOk && ramp && ramp.lane === l, gateOk });
    // a net coming down closes its channel
    if (st.heli.phase === 'drop' && !smokeOn(st)) hz[st.heli.netLane] = { dist: 0, ob: null };
    const cur = b.tl;
    const follow = behind.some(c => c.kind === 'boat' && !c.blind && Math.abs(c.lane - b.ly) < 0.5 && gapOf(st, c) < 420);
    const need = v * (follow ? 0.5 : 0.85);
    const score = l => {
      let s = Math.min(hz[l].dist, H);
      const bowAt = d => d - bow;
      for (const ob of L.obj) {
        if (ob.d < bow - 10 || ob.got || ob.hit) continue;
        if (ob.d > bow + H) break;
        const near = bowAt(ob.d) < H;
        if (!near || ob.lane !== l) continue;
        if (ob.type === 'crate') s += 160 + (st.ch.boost === 0 ? 400 : 0);
        else if (ob.type === 'bottle' && (!ob.air || (ramp && ramp.lane === l && jumpOk))) s += 220;
        else if (ob.type === 'sand') s -= 140;
        else if (ob.type === 'ramp' && jumpOk) s += 120;
      }
      // line up a boat behind for the oil
      if (st.ch.oil > 0 && (st.sel === 'oil' || gadCpu)) for (const c of behind) if (c.kind === 'boat' && !c.blind && Math.round(c.lane) === l && gapOf(st, c) < S.oilR) s += 90;
      if (l === cur) s += 40;
      return s;
    };
    const reachable = l => l === cur || Math.abs(l - cur) === 1 || hz[(l + cur) / 2].dist > v * 0.45;
    let want = cur;
    const sc = [];
    for (let l = 0; l < L.lanes; l++) sc[l] = reachable(l) ? score(l) : -1e9;
    if (hz[cur].dist < need) {
      // must dodge: the clearest channel we can reach in time
      for (let l = 0; l < L.lanes; l++) if (sc[l] > sc[want] + 1 || (want === cur && l !== cur && hz[l].dist > hz[cur].dist)) want = l;
      if (want !== cur && hz[want].dist <= hz[cur].dist) want = cur;
      P.steer.why = 'dodge';
    } else {
      // not urgent: move only for something clearly better that is safe to reach
      for (let l = 0; l < L.lanes; l++) if (l !== cur && sc[l] > sc[want] + 120 && hz[l].dist > v * 1.1) want = l;
      if (want !== cur) P.steer.why = 'better';
    }
    // during the grab: head for the low arch early
    if (st.grab && st.grab.on && L.bridge && !L.bridge.hit) { const a = L.bridge.arch; if (hz[a].dist > v * 0.6 || hz[cur].dist < need) { want = a; P.steer.why = 'bridge'; } }
    // the net: when it drops on our channel, move
    if (st.heli.phase === 'drop' && Math.abs(b.ly - st.heli.netLane) < 0.6 && !smokeOn(st)) {
      let alt = -1;
      for (const l of [cur - 1, cur + 1]) if (l >= 0 && l < L.lanes && l !== st.heli.netLane && hz[l].dist > v * 0.5 && (alt < 0 || sc[l] > sc[alt])) alt = l;
      if (alt >= 0) { want = alt; P.steer.why = 'net'; }
    }
    // a wake: hold into it
    const wk = nextOf(st, 'wake', v * 0.45);
    if (wk && wk.d - bow > -10) { const into = -wk.dir; if (cur + into >= 0 && cur + into < L.lanes) P.steer.brace = into; }
    P.steer.lane = want;
    // the horn: gulls or a fishing boat ahead in our channel
    for (const ob of L.obj) {
      if (ob.d < bow || ob.d > bow + S.hornR) continue;
      if ((ob.type === 'gulls' || ob.type === 'fish') && !ob.aside && !ob.hit && (blocks(ob, b.ly) || blocks(ob, want))) { P.steer.horn = b.hornT <= 0; P.steer.why = P.steer.horn ? 'horn' : P.steer.why; }
    }
    if (ramp && ramp.lane === want && b.v < S.rampV) P.steer.why = P.steer.why === 'drive' ? 'ramp' : P.steer.why;
    if (gate && gate.st === 'closing' && !gateOk && gate.low != null) P.steer.why = 'low';
    // --- the gadget agent
    const g = P.gad, has = n => st.ch[n] > 0 && (n !== 'magnet' || st.k >= 2);
    const inGateLane = gate && gate.lanes.includes(want);
    let use = null, why = '';
    if (st.grab && st.grab.on && st.grab.down) { g.hold = true; g.why = 'tug'; P.gad = g; return P; }
    if (b.boost <= 0 && has('boost')) {
      if (gate && gate.st === 'closing' && inGateLane && !gateMakes(st, gate, false) && gateMakes(st, gate, true)) { use = 'boost'; why = 'gate'; }
      else if (fin && fin.d - bow < S.boostV * S.boostT * 0.9 && fin.d - bow > 0) { use = 'boost'; why = 'final'; }
      else if (ramp && ramp.lane === Math.round(b.ly) && ramp.lane === want && b.v < S.rampV - 5 && ramp.d - bow < v * 0.9 && ramp.d - bow > 0) { use = 'boost'; why = 'ramp'; }
      else if (st.chase > 70 && st.ch.boost > reserve) { use = 'boost'; why = 'away'; }
    }
    const near = behind.filter(c => gapOf(st, c) < S.smokeR);
    const netMe = (st.heli.phase === 'drop' || st.heli.phase === 'aim') && Math.abs(b.ly - st.heli.x) < 0.6;
    if (!use && has('smoke') && (near.length >= 2 || near.some(c => c.kind === 'ski' && gapOf(st, c) < 320) || (netMe && st.heli.phase === 'drop' && want === Math.round(b.ly)) || near.some(c => gapOf(st, c) < 140 && !(has('oil') && Math.abs(c.lane - b.ly) < 0.3)) || (st.loneT > 6 && !cpuOn(st.steerId)))) { use = 'smoke'; why = near.length >= 2 ? 'two' : netMe ? 'net' : 'ski'; }
    if (!use && has('oil') && b.moveT <= 0 && b.air <= 0) {
      const tgt = behind.find(c => c.kind === 'boat' && !c.blind && Math.abs(c.lane - b.ly) < 0.3 && gapOf(st, c) > 40 && gapOf(st, c) < S.oilR);
      if (tgt) { use = 'oil'; why = 'behind'; }
    }
    if (!use && has('magnet') && magnetTarget(st)) { use = 'magnet'; why = 'mine'; }
    g.use = use; g.why = why;
    // what to have ready: the next thing we'll want
    if (use) g.pick = use;
    else if (fin && has('boost') && fin.d - bow < 3200) g.pick = 'boost';
    else if (gate && has('boost') && gate.d - bow < 2600) g.pick = 'boost';
    else if (fin && has('boost') && fin.d - bow < 2000) g.pick = 'boost';
    else if (behind.some(c => c.kind === 'boat') && has('oil')) g.pick = 'oil';
    else if (behind.length && has('smoke')) g.pick = 'smoke';
    else g.pick = has(st.sel) ? st.sel : GADGETS.find(has) || st.sel;
    return P;
  }
  const smokeOn = st => st.smoke.some(s => s.t < S.smokeT);
  // a mine within reach and a chaser to fling it at
  function magnetTarget(st) {
    const b = st.b, cs = live(st).filter(c => gapOf(st, c) < 560 && gapOf(st, c) > -40);
    if (!cs.length) return null;
    const mine = st.L.obj.find(o => o.type === 'mine' && !o.hit && Math.abs(o.d - b.d) < S.magR);
    if (!mine) return null;
    return { mine, c: cs.reduce((a, c) => (gapOf(st, c) < gapOf(st, a) ? c : a)) };
  }

  /* ---------- the tick ---------- */
  function wants(id) {
    const i = G.players[id].input;
    return { l: !!i.left, r: !!i.right, u: !!(i.jump || i.up), d: !!i.down, act: !!i.act };
  }
  function tick(st, dt) {
    if (!st.L) return;
    K.track(st);
    st.waiting = st.state === 'go' && K.idle(st, dt, S.idleWait);
    const live_ = G.introT <= 0 && !st.waiting && (st.state === 'go' || st.state === 'end');
    if (live_) {
      st.T += dt;
      if (st.radioDue != null && (st.radioDue -= dt) <= 0) { st.radioDue = null; K.control(st, K.STORY.spyboat); }
      const w = [wants(0), wants(1)];
      if (st.state === 'go') { steer(st, w[st.steerId], st.prevK[st.steerId], dt); gadgets(st, w[st.gadId], st.prevK[st.gadId], dt); }
      st.prevK = w;
      boat(st, dt);
      if (st.state === 'go') { hits(st); chasers(st, dt); heli(st, dt); grab(st, w[st.gadId], dt); meter(st, dt); progress(st); }
      else chasers(st, dt);
    } else if (['caught', 'shut', 'claw', 'short'].includes(st.state)) {
      st.endT += dt; st.b.v *= 1 - dt * 2; st.b.d += st.b.v * dt * 0.3;
      if (st.endT > S.restartT) restart(st, { caught: 'Back to the checkpoint. Keep ahead of them!', shut: 'Back to the checkpoint. Boost for the gate!', claw: 'Back to the checkpoint. Hang on to the case!', short: 'Back to the checkpoint. Boost off the ramp!' }[st.state]);
    } else if (st.state === 'fly') flyStep(st, dt);
    if (st.state === 'end') { st.endT += dt; if (st.endT > 1.2) nextRoom(); }
    K.tickControl(st, dt);
    for (const p of G.players) { p.pendingJump = false; p.pendingAct = false; }
    K.tickFx(st, dt);
    st.spyLook = [0, 1].map(() => ({ drip: st.b.drip }));
    engineSound(st, dt);
  }
  function steer(st, w, pk, dt) {
    const b = st.b, L = st.L;
    if (w.r) b.thr = Math.min(1, b.thr + S.thrRate * dt);
    if (w.l) b.thr = Math.max(S.thrMin, b.thr - S.thrRate * dt);
    b.moveT -= dt;
    // a wake right at the bow: holding into it braces instead of changing channel
    const bow = b.d + S.bow, wk = st.L.obj.find(o => o.type === 'wake' && !o.hit && o.d - bow > -20 && o.d - bow < 150);
    b.brace = 0;
    const dir = w.u && !w.d ? 1 : w.d && !w.u ? -1 : 0;
    if (wk && dir === -wk.dir) b.brace = dir;
    else if (dir && b.air <= 0 && b.moveT <= 0 && (dir !== (pk.u ? 1 : pk.d ? -1 : 0) || b.moveT <= -0.0001)) {
      const nl = b.tl + dir;
      if (nl >= 0 && nl < L.lanes) { b.tl = nl; b.moveT = S.laneT; Sfx.play('spyboatChannelSwish'); }
    }
    if (w.act && !pk.act && b.hornT <= 0) horn(st);
  }
  function horn(st) {
    const b = st.b, bow = b.d + S.bow;
    b.hornT = S.hornCd; Sfx.play('spyboatHornHonk');
    K.pop(st, S.bx + 40, laneY(b.ly) - 90, 'HONK!', '#fff1c0', 18);
    for (const ob of st.L.obj) if ((ob.type === 'gulls' || ob.type === 'fish') && ob.d > bow - 20 && ob.d < bow + S.hornR && !ob.aside) {
      ob.aside = 0.001;
      if (ob.type === 'gulls') Sfx.play('spyboatGulls');
    }
  }
  function gadgets(st, w, pk, dt) {
    if (st.grab && st.grab.on && st.grab.down) return; // the action is the tug now
    const have = GADGETS.filter(n => n !== 'magnet' || st.k >= 2);
    const step = (w.r && !pk.r) ? 1 : (w.l && !pk.l) ? -1 : 0;
    if (step) { st.sel = have[(have.indexOf(st.sel) + step + have.length) % have.length]; Sfx.play('spyboatGadgetClick'); }
    if (w.act && !pk.act) useGadget(st, st.sel);
  }
  function useGadget(st, n) {
    const b = st.b;
    if (!(st.ch[n] > 0)) { Sfx.play('spyboatEmpty'); K.pop(st, S.bx - 30, laneY(b.ly) - 96, 'Empty!', '#ffd0c8', 15); return; }
    if (n === 'magnet') {
      const mt = magnetTarget(st);
      if (!mt) { K.pop(st, S.bx - 30, laneY(b.ly) - 96, 'No mines in reach', '#ffd0c8', 15); Sfx.play('spyboatEmpty'); return; }
      mt.mine.hit = true; st.flings.push({ from: mt.mine.d, fl: mt.mine.lane, c: mt.c, t: 0 }); Sfx.play('spyboatMagnetHum'); Sfx.play('spyboatMineFling');
    }
    st.ch[n]--; st.stats.gadgets++;
    if (n === 'smoke') {
      st.smoke.push({ d0: b.d - 380, d1: b.d - 20, t: 0 }); Sfx.play('spyboatSmokePuff');
      for (const c of live(st)) if (gapOf(st, c) < S.smokeR && gapOf(st, c) > -60) blind(st, c);
      if (st.heli.phase !== 'cool') { st.heli.lock = 0; if (st.heli.phase === 'aim') { st.heli.phase = 'track'; st.heli.t = 0; } }
      for (let i = 0; i < 14; i++) K.part(st, S.bx - 40 - Math.random() * 300, laneY(Math.random() * 2) - 20 - Math.random() * 40, -40 - Math.random() * 60, -10 - Math.random() * 20, 2 + Math.random(), 'rgba(200,204,210,0.8)', 22 + Math.random() * 16, -4, 'smoke');
    } else if (n === 'oil') {
      st.oil.push({ d: b.d - 30, lane: Math.round(b.ly), t: 0 }); Sfx.play('spyboatOilGlug');
    } else if (n === 'boost') {
      b.boost = S.boostT; Sfx.play('spyboatBoostRoar');
    }
  }
  function blind(st, c) {
    if (c.kind === 'ski') { wreck(st, c, 'spin'); return; }
    c.blind = S.smokeT;
  }
  function boat(st, dt) {
    const b = st.b, L = st.L;
    b.hornT -= dt; b.lurch = Math.max(0, b.lurch - dt); b.drip = Math.max(0, b.drip - dt); b.splash = Math.max(0, b.splash - dt);
    if (b.boost > 0) b.boost -= dt;
    if (b.stall > 0) b.stall -= dt;
    // sandbars
    const bow = b.d + S.bow;
    b.sand = b.air <= 0 && L.obj.some(o => o.type === 'sand' && Math.abs(b.ly - o.lane) < 0.55 && bow > o.d && bow - 80 < o.d + o.len);
    const tv = st.state === 'go' ? speedNow(st) : st.state === 'end' ? S.vmax * 0.8 : 0;
    b.v += clamp(tv - b.v, -S.accel * 2 * dt, S.accel * dt * (b.boost > 0 ? 2.4 : 1));
    b.d += b.v * dt;
    // channel change (no steering in the air)
    if (b.ly !== b.tl) { const s = dt / S.laneT; b.ly = Math.abs(b.tl - b.ly) <= s ? b.tl : b.ly + Math.sign(b.tl - b.ly) * s; }
    if (b.air > 0) { b.airT += dt; if (b.airT >= S.airT) { b.air = 0; b.airT = 0; Sfx.play('spyboatLandSplash'); b.drip = 2; b.splash = 0.5; splash(st, S.bx, laneY(b.ly), 14); } }
    const tr = st.track; if (b.d - tr[tr.length - 1].d > 12) { tr.push({ d: b.d, l: b.tl }); if (tr.length > 400) tr.splice(0, 100); }
    // spray and the wake
    if (Math.random() < dt * 30) K.part(st, S.bx - 50 + Math.random() * 10, laneY(b.ly) - 2 - airY(b) - 4, -b.v * 0.25 - Math.random() * 60, -30 - Math.random() * 50, 0.5, 'rgba(220,240,255,0.8)', 2 + Math.random() * 2, 260, 'dot');
  }
  const airY = b => (b.air > 0 ? 4 * S.airH * (b.airT / S.airT) * (1 - b.airT / S.airT) : 0);
  function splash(st, x, y, n) { for (let i = 0; i < n; i++) K.part(st, x + (Math.random() - 0.5) * 60, y - 4, (Math.random() - 0.5) * 160, -80 - Math.random() * 120, 0.7, 'rgba(210,235,255,0.9)', 2.5 + Math.random() * 3, 420, 'dot'); }
  function bump(st, why, chase, stall) {
    const b = st.b;
    st.stats.bumps++; st.rc.bumps++; b.lurch = 0.45; b.stall = Math.max(b.stall, stall || 0); st.chase = Math.min(100, st.chase + (chase == null ? S.bumpC : chase)); st.cleanT = 0;
    Sfx.play('spyboatBumpThud'); K.pop(st, S.bx + 10, laneY(b.ly) - 100 - airY(b), why || 'BUMP!', '#ffd0c8', 20);
    if (!st.gold && st.rc.bumps >= 3 && K.both(st)) { st.gold = true; K.goldHelp(st, 'Gold boat! Gadgets recharge by themselves, chasers are slower, gates stay open longer.'); }
  }
  // the boat meets things in the water
  function hits(st) {
    const b = st.b, bow = b.d + S.bow, L = st.L;
    for (const ob of L.obj) {
      if (ob.d > bow + 4) break;
      if (ob.hit || ob.d + (ob.len || 0) < bow - 90) continue;
      const inLane = ob.lane < 0 ? true : blocks(ob, b.ly);
      switch (ob.type) {
        case 'doors': ob.hit = true; Sfx.play('spyboatDoorsCrash'); K.spark(st, S.bx + 60, laneY(0.5) - 30, 18, ['#8a6a3a', '#c89a5a', '#ffffff']); break;
        case 'buoy': case 'mine': case 'moored':
          if (b.air > 0 || !inLane) break;
          ob.hit = true; bump(st, ob.type === 'mine' ? 'BOOM!' : 'BUMP!', S.bumpC, S.stallT);
          if (ob.type === 'mine') { Sfx.play('spyboatMineBoom'); splash(st, S.bx + 40, laneY(b.ly), 24); b.drip = 2; }
          break;
        case 'pier': case 'ferry':
          if (b.air > 0 || !inLane) break;
          ob.hit = true; bump(st, 'CRUNCH!', S.bumpC, 1);
          { let alt = -1; for (let l = 0; l < L.lanes; l++) if (!blocks(ob, l) && (alt < 0 || Math.abs(l - b.ly) < Math.abs(alt - b.ly))) alt = l; if (alt >= 0) { b.tl = alt; b.moveT = S.laneT; } }
          break;
        case 'fish':
          if (b.air > 0 || !inLane || ob.aside) break;
          ob.hit = true; bump(st, 'Sorry!', S.bumpC, S.stallT); break;
        case 'gulls':
          if (b.air > 0 || !inLane || ob.aside) break;
          ob.hit = true; ob.aside = 0.001; st.chase = Math.min(100, st.chase + S.gullC); b.stall = Math.max(b.stall, 0.4); Sfx.play('spyboatGulls'); K.pop(st, S.bx + 30, laneY(b.ly) - 90, 'Squawk!', '#ffffff', 16); break;
        case 'crate':
          if (b.air > 0 || !inLane) break;
          ob.hit = true; for (const n of GADGETS) if (n !== 'magnet' || st.k >= 2) st.ch[n] = Math.min(MAXC[n], st.ch[n] + 1);
          Sfx.play('spyboatCrateGrab'); K.pop(st, S.bx + 30, laneY(b.ly) - 90, 'Gadgets +1!', '#ffd76a', 17); break;
        case 'bottle':
          if (!inLane || ob.got || (ob.air ? b.air <= 0 : b.air > 0)) break;
          ob.got = true; ob.hit = true; st.got[ob.id] = true; st.bottles++; Sfx.play('spyboatBottleClink'); K.pop(st, S.bx + 30, laneY(b.ly) - 90 - airY(b), 'Intel!', '#fff1c0', 16); break;
        case 'ramp':
          if (!inLane || b.air > 0) break;
          ob.hit = true;
          if (b.v >= S.rampV - 5 || b.boost > 0) { b.air = 1; b.airT = 0; Sfx.play('spyboatRampLaunch'); K.pop(st, S.bx + 30, laneY(b.ly) - 120, 'AIRBORNE!', '#8fe3b0', 20); }
          else K.pop(st, S.bx + 30, laneY(b.ly) - 100, 'Too slow!', '#ffd0c8', 16);
          break;
        case 'chain':
          if (b.air > 0 || !inLane) break;
          ob.hit = true; bump(st, ob.look === 'mines' ? 'BOOM!' : 'CLANG!', S.bumpC, 1); break;
        case 'wake':
          ob.hit = true;
          if (b.air > 0) break;
          if (b.brace === -ob.dir || (b.moveT > 0 && Math.sign(b.tl - b.ly) === -ob.dir)) { K.pop(st, S.bx + 30, laneY(b.ly) - 96, 'Rode the wave!', '#8fe3b0', 16); Sfx.play('spyboatWaveSlap'); }
          else { const nl = b.tl + ob.dir; Sfx.play('spyboatWaveSlap'); splash(st, S.bx + 20, laneY(b.ly), 10); b.drip = 2; if (nl >= 0 && nl < L.lanes) { b.tl = nl; b.moveT = S.laneT; K.pop(st, S.bx + 30, laneY(b.ly) - 96, 'Whoa! Wave!', '#ffd0c8', 16); } }
          break;
        case 'gate':
          if (!ob.lanes.includes(Math.round(b.ly))) { if (bow > ob.d) ob.hit = true; break; }
          ob.hit = true;
          if (ob.st === 'shut') { st.state = 'shut'; st.endT = 0; st.stats.restarts++; Sfx.play('spyboatChaserCrash'); K.msg(st, 'The gate shut! Back we go.', '#ffd0c8', 2.2); }
          else { Sfx.play('spySting'); K.pop(st, S.bx + 30, laneY(b.ly) - 110, 'Made it!', '#8fe3b0', 20); }
          break;
        case 'bridge':
          ob.hit = true;
          if (st.grab && st.grab.on) {
            if (Math.round(b.ly) === ob.arch) { st.grab.on = false; st.grab.off = 0; Sfx.play('spyboatClawClank'); K.pop(st, S.bx, laneY(b.ly) - 130, 'Claw knocked off!', '#8fe3b0', 20); st.heli.phase = 'cool'; st.heli.t = -2; }
            else clawWins(st);
          }
          break;
        case 'bigramp':
          ob.hit = true;
          if (b.boost > 0) { st.state = 'fly'; st.endT = 0; st.fly = { t: 0, d0: b.d, y0: laneY(b.ly) }; Sfx.play('spyboatRampLaunch'); Sfx.play('spyboatSeaplaneDrone'); }
          else { st.state = 'short'; st.endT = 0; st.stats.restarts++; Sfx.play('spyboatLandSplash'); splash(st, S.bx + 60, laneY(b.ly), 30); K.msg(st, 'Not fast enough! It needs a Boost.', '#ffd0c8', 2.2); }
          break;
      }
    }
    for (const ob of L.obj) if (ob.aside > 0 && ob.aside < 1) ob.aside = Math.min(1, ob.aside + 1 / 60);
    // gates start closing as the boat comes up
    for (const g of L.obj) if (g.type === 'gate' && !g.hit) {
      if (g.st === 'open' && g.d - bow < g.dist) { g.st = 'closing'; g.left = g.dist / S.vmax * S.gateK + (st.gold ? 0.5 : 0); g.t0 = 0; Sfx.play('spyboatGateGrind'); }
      else if (g.st === 'closing') { g.left -= DT; g.t0 += DT; if (Math.floor((g.left + DT) * 2) !== Math.floor(g.left * 2)) Sfx.play('spyboatGateTick'); if (g.left <= 0) { g.st = 'shut'; Sfx.play('spyboatGateShut'); } }
    }
  }
  function clawWins(st) {
    st.state = 'claw'; st.endT = 0; st.stats.restarts++; Sfx.play('spyboatClawClank');
    K.msg(st, 'The claw got the briefcase!', '#ffd0c8', 2.2);
  }

  /* ---------- the chasers ---------- */
  function chasers(st, dt) {
    const b = st.b, L = st.L;
    // new ones come in from behind
    if (st.state === 'go') for (const sp of L.spawns) if (!sp.done && b.d >= sp.d) {
      if (sp.one && live(st).length) continue;
      sp.done = true;
      st.chasers.push({ kind: sp.kind, d: b.d - 560 - (sp.kind === 'ski' ? 60 : 0), lane: Math.min(sp.lane, L.lanes - 1), blind: 0, recover: 0, wreck: null, weaveT: 1, id: Math.random(), air: 0 });
      Sfx.play(sp.kind === 'ski' ? 'spyboatSkiWhine' : 'spyboatChaserRoar');
    }
    for (const c of st.chasers) {
      if (c.wreck) { c.wreck.t += dt; c.d += Math.max(0, b.v - 260 - c.wreck.t * 120) * dt * 0.4; continue; }
      const gap = b.d - c.d;
      let v = gap > S.farGap ? S.chaseFar : S.chaseV;
      if (c.kind === 'ski') v += 40;
      if (c.recover > 0) { c.recover -= dt; v = b.v - 150; }
      if (c.blind > 0) { c.blind -= dt; v = Math.min(v, b.v - 120); }
      if (st.gold && v > b.v) v = b.v + (v - b.v) * 0.75;
      if (st.state !== 'go') v = b.v * 0.8;
      const prev = c.d; c.d += v * dt;
      if (c.air > 0) c.air -= dt;
      // the channel: the one we had S.lagT s of travel ago (held while blinded); jet skis weave
      let tl = c.lane;
      if (c.kind === 'ski') { c.weaveT -= dt; if (c.weaveT <= 0) { c.weaveT = 0.9 + Math.random() * 0.8; c.tl = clamp(Math.round(c.lane) + (Math.random() < 0.5 ? -1 : 1), 0, L.lanes - 1); } tl = c.tl == null ? c.lane : c.tl; }
      else if (c.blind <= 0) tl = trackLane(st, c.d + 40 - S.lagT * Math.max(380, b.v));
      if (c.lane !== tl) { const s = dt / 0.3; c.lane = Math.abs(tl - c.lane) <= s ? tl : c.lane + Math.sign(tl - c.lane) * s; }
      // what it runs into
      for (const ob of L.obj) {
        if (ob.d > c.d + 40) break;
        if (ob.d + (ob.len || 0) < prev + 40 - 60) continue;
        const crossed = prev + 40 < ob.d + 1 && c.d + 40 >= ob.d, inside = ob.len > 60 && c.d + 40 > ob.d && c.d < ob.d + ob.len;
        if (!(crossed || inside)) continue;
        if (ob.lanes ? !ob.lanes.includes(Math.round(c.lane)) : ob.lane >= 0 && Math.abs(c.lane - ob.lane) > 0.5) continue;
        if (ob.type === 'ramp' && c.air <= 0) { c.air = S.airT; continue; }
        if (c.air > 0) continue;
        const kind = { buoy: 'crash', mine: 'boom', moored: 'crash', pier: 'crash', ferry: 'crash', fish: 'net', chain: ob.look === 'mines' ? 'boom' : 'crash', sand: 'sand' }[ob.type] || (ob.type === 'gate' && ob.st === 'shut' ? 'crash' : null);
        if (kind && !(ob.type === 'fish' && ob.aside)) { wreck(st, c, kind); break; }
      }
      if (c.wreck) continue;
      // an oil slick
      if (c.kind === 'boat') for (const s of st.oil) if (!s.used && Math.abs(c.lane - s.lane) < 0.5 && prev + 40 < s.d && c.d + 40 >= s.d) { s.used = true; wreck(st, c, 'spin'); break; }
      if (c.wreck) continue;
      // smoke it drives into
      for (const s of st.smoke) if (s.t < S.smokeT && c.d > s.d0 && c.d < s.d1 && c.blind <= 0) blind(st, c);
      if (c.wreck) continue;
      // draws level: a bump (not in the air)
      if (st.state === 'go' && c.recover <= 0 && gap <= S.bumpGap && b.air <= 0 && Math.abs(c.lane - b.ly) < 1.2) { c.recover = 1.4; bump(st, 'BUMP!', S.bumpC, 0.25); Sfx.play('spyboatZeroShout'); }
    }
    // flung mines
    for (const f of st.flings) { f.t += dt * 2.2; if (f.t >= 1 && !f.done) { f.done = true; if (!f.c.wreck) wreck(st, f.c, 'boom'); } }
    st.flings = st.flings.filter(f => f.t < 1.4);
    st.chasers = st.chasers.filter(c => !(c.wreck && c.wreck.t > 3.5) && b.d - c.d < 1400);
    for (const s of st.smoke) s.t += dt; st.smoke = st.smoke.filter(s => s.t < S.smokeT + 1.2);
    for (const s of st.oil) s.t += dt; st.oil = st.oil.filter(s => s.t < S.oilLife && !s.used);
    // one boat sat behind with no oil chance (a person steerer): the computer gadget agent falls back on smoke
    const cs = live(st);
    st.loneT = cs.length === 1 && b.d - cs[0].d < 300 ? st.loneT + dt : 0;
  }
  function wreck(st, c, kind) {
    c.wreck = { kind, t: 0, spin: Math.random() < 0.5 ? -1 : 1 };
    st.stats.wrecked++; st.chase = Math.max(0, st.chase - S.wreckC);
    Sfx.play(kind === 'spin' ? 'spyboatChaserSpin' : kind === 'boom' ? 'spyboatMineBoom' : 'spyboatChaserCrash');
    const x = S.bx - (st.b.d - c.d), y = laneY(c.lane);
    if (x > -40 && x < W + 40) { splash(st, x, y, 12); K.pop(st, x, y - 70, { spin: 'Spun out!', boom: 'KABOOM!', net: 'Netted!', sand: 'Beached!', crash: 'CRASH!' }[kind], '#8fe3b0', 17); }
  }

  /* ---------- the helicopter and the grab ---------- */
  function heli(st, dt) {
    const h = st.heli, b = st.b, L = st.L;
    const on = !!L.heli && b.d > L.heli.from && b.d < L.heli.to;
    h.on = on || !!(st.grab && st.grab.on);
    h.sx += ((h.on ? S.bx + 70 + Math.sin(st.T * 0.7) * 60 : W + 200) - h.sx) * Math.min(1, dt * 1.5);
    if (!on || (st.grab && st.grab.on)) { h.phase = 'track'; h.lock = 0; return; }
    h.t += dt;
    const sm = smokeOn(st);
    if (h.phase === 'track') {
      h.x += clamp(b.ly - h.x, -1.6 * dt, 1.6 * dt);
      if (!sm && Math.abs(h.x - b.ly) < 0.25) h.lock += dt; else h.lock = Math.max(0, h.lock - dt);
      if (sm) h.x += Math.sin(st.T * 3) * dt;
      // (it never nets us just before a ramp, a gate or the bridge: one thing at a time)
      const busy = L.obj.some(o => (o.type === 'ramp' || o.type === 'gate' || o.type === 'bridge') && o.d - b.d > -150 && o.d - b.d < 1900);
      if (h.lock >= S.netLock && !busy) { h.phase = 'aim'; h.t = 0; Sfx.play('spyboatHeliLock'); }
    } else if (h.phase === 'aim') {
      h.x += clamp(b.ly - h.x, -1.2 * dt, 1.2 * dt);
      if (sm) { h.phase = 'track'; h.t = 0; h.lock = 0; }
      else if (h.t >= S.netDelay) { h.phase = 'drop'; h.t = 0; h.netLane = clamp(Math.round(h.x), 0, L.lanes - 1); Sfx.play('spyboatNetDrop'); }
    } else if (h.phase === 'drop') {
      if (h.t >= S.netFall) {
        h.phase = 'cool'; h.t = 0;
        if (Math.abs(b.ly - h.netLane) < 0.5 && b.air <= 0 && !sm) { Sfx.play('spyboatNetWhump'); bump(st, 'NETTED!', S.netC, 1); b.drip = 1; }
        else K.pop(st, S.bx + 60, laneY(h.netLane) - 60, 'Missed us!', '#8fe3b0', 16);
      }
    } else if (h.phase === 'cool' && h.t >= S.netCd) { h.phase = 'track'; h.t = 0; h.lock = 0; }
  }
  function grab(st, w, dt) {
    const L = st.L, b = st.b;
    if (L.grab && !L.grab.done && b.d >= L.grab.d) { L.grab.done = true; st.grab = { on: true, t: 0, bar: 1, down: false }; Sfx.play('spyboatClawClank'); K.msg(st, 'The claw! ' + NAMES[st.gadId] + ': hold on to the case!', '#ffd0c8', 3); }
    const g = st.grab;
    if (!g) return;
    if (!g.on) { g.off = (g.off || 0) + dt; return; }
    g.t += dt;
    if (!g.down && g.t > 0.8) g.down = true;
    if (!g.down) return;
    if (w.act) { g.bar = Math.min(1, g.bar + S.tugFill * dt); g.held = true; } else { g.bar -= S.tugDrain * dt; g.held = false; }
    if (Math.random() < dt * 3) Sfx.play('spyboatTugCreak');
    if (g.bar <= 0) clawWins(st);
  }
  function meter(st, dt) {
    const b = st.b;
    st.cleanT += dt;
    if (b.thr < 0.75 && b.boost <= 0) st.chase = Math.min(100, st.chase + S.slowC * dt);
    if (st.cleanT > S.cleanT) st.chase = Math.max(0, st.chase - S.drainC * dt);
    if (st.chase >= 100) { st.state = 'caught'; st.endT = 0; st.stats.caught++; Sfx.play('spyboatCaughtSplash'); K.msg(st, 'CAUGHT! A boat hook on the rail!', '#ffd0c8', 2.2); }
    if (st.gold) { st.goldRe += dt; if (st.goldRe > S.goldRe) { st.goldRe = 0; const n = GADGETS.filter(n => (n !== 'magnet' || st.k >= 2) && st.ch[n] < MAXC[n]).sort((a, c) => st.ch[a] - st.ch[c])[0]; if (n) { st.ch[n]++; Sfx.play('spyboatGadgetClick'); } } }
  }
  function progress(st) {
    const b = st.b, L = st.L;
    for (const d of L.cps) if (b.d >= d && (!st.cp || st.cp.d < d)) { st.cp = { d, ch: Object.assign({}, st.ch) }; Sfx.play('spyventsCheckpoint'); K.pop(st, W / 2, 150, 'Checkpoint!', '#8fe3b0', 18); }
    if (b.d >= L.len && st.k < 3) {
      st.state = 'end'; st.endT = 0; st.stats.roomT[st.k] = G.time - st.segStart;
      Sfx.play('spySting'); K.pop(st, W / 2, 180, (G.level.def.rooms[st.k].done || 'Through!') + ' Next stretch!', '#ffffff', 22);
    }
  }
  // the ending: off the breakwater, into the seaplane's open cargo door as it lifts off
  function flyStep(st, dt) {
    const f = st.fly, b = st.b;
    f.t += dt; b.d += 420 * dt * Math.max(0, 1 - f.t / 2.4);
    if (f.t > 1.25 && !f.in) { f.in = true; Sfx.play('spyboatLandSplash'); Sfx.play('spyCheer'); }
    if (f.t > 2.6 && !f.ties) { f.ties = true; Sfx.play('spyboatFinalSting'); }
    if (f.t > 5.2 && !st.cleared) { st.cleared = true; st.stats.roomT[3] = G.time - st.segStart; G.level.goal = { x: W / 2, y: 300 }; levelClear(); }
  }
  let engT = 0, engV = { v: 400, boost: false };
  function engineSound(st, dt) {
    if ((engT -= dt) > 0 || G.introT > 0 || st.state === 'fly' || st.waiting) return;
    engT = 0.22;
    engV = { v: st.b.v, boost: st.b.boost > 0 }; Sfx.play('spyboatEngine');
  }

  /* ---------- the picture ---------- */
  const scrX = (st, d) => S.bx + (d - st.b.d);
  function draw(st) {
    const t = st.T, b = st.b, L = st.L, k = st.k;
    K.nightSky(G.clock, { moonX: 760, moonY: 76 });
    // the city and Zero Tower shrinking behind
    ctx.save(); ctx.translate(0, 300); ctx.scale(1, 0.5); ctx.translate(0, -300); ctx.globalAlpha = 0.85;
    K.skyline(b.d * 0.4 + k * 3000, 0, G.clock, { y: 300, par: 0.06 });
    ctx.restore();
    const tz = 1 - (k + Math.min(1, b.d / L.len)) / 4.4, tx = 120 - (k + b.d / L.len) * 30;
    ctx.fillStyle = '#081c24'; ctx.fillRect(tx - 18 * tz, 300 - 220 * tz, 36 * tz, 220 * tz);
    ctx.fillStyle = '#ff3a4a'; ctx.fillRect(tx - 2, 300 - 232 * tz, 4, 8 * tz);
    ctx.fillStyle = 'rgba(255,207,106,0.7)'; for (let i = 0; i < 12; i++) ctx.fillRect(tx - 12 * tz + (i % 3) * 10 * tz, 300 - 200 * tz + Math.floor(i / 3) * 40 * tz, 4 * tz, 6 * tz);
    // the far shore: cranes and ships (docks), the breakwater wall (stretch 4)
    farShore(st, t);
    water(st);
    if (k === 0) canalWalls(st);
    // things in the water, far channel first
    const items = [];
    for (const ob of L.obj) { const x = scrX(st, ob.d); if (x > -400 && x < W + 400) items.push({ z: ob.lane < 0 ? 2.5 : ob.lane, f: () => drawObj(st, ob, x) }); }
    for (const c of st.chasers) { const x = scrX(st, c.d); if (x > -160 && x < W + 100) items.push({ z: c.lane + 0.01, f: () => drawChaser(st, c, x) }); }
    for (const s of st.oil) items.push({ z: s.lane + 0.3, f: () => drawOil(st, s) });
    items.push({ z: b.ly - 0.02, f: () => drawBoat(st) });
    items.sort((a, c) => c.z - a.z);
    for (const it of items) it.f();
    for (const s of st.smoke) drawSmoke(st, s);
    for (const f of st.flings) { const x0 = scrX(st, f.from), x1 = scrX(st, f.c.d), u = Math.min(1, f.t), x = x0 + (x1 - x0) * u, y = laneY(f.fl) + (laneY(f.c.lane) - laneY(f.fl)) * u - Math.sin(u * Math.PI) * 120; drawMine(x, y, 0.9, true); }
    drawHeli(st);
    if (st.state === 'fly') drawEnding(st);
    K.drawParts(st);
    if (st.gold) { ctx.fillStyle = 'rgba(255,214,90,0.06)'; ctx.fillRect(0, 0, W, H); }
  }
  function farShore(st, t) {
    const b = st.b, k = st.k, off = b.d * 0.3;
    ctx.fillStyle = '#0a2630'; ctx.fillRect(0, 296, W, 10);
    for (let i = -1; i < 8; i++) {
      const span = 1400, x = ((i * 200 - off) % span + span) % span - 200, seed = Math.floor((i * 200 - off) / span) * 8 + i;
      if (k === 1 || k === 3 || H_(seed) > 0.5) { // a crane
        ctx.strokeStyle = '#123640'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x, 300); ctx.lineTo(x, 200); ctx.lineTo(x + 90, 200); ctx.moveTo(x - 30, 200); ctx.lineTo(x, 180); ctx.lineTo(x + 90, 200); ctx.stroke();
        ctx.fillStyle = Math.sin(G.clock * 2 + i) > 0 ? '#ff4a4a' : '#4a1a1a'; ctx.fillRect(x - 2, 176, 4, 4);
      }
      if (H_(seed + 3) > 0.45) { // a ship
        const sx = x + 80; ctx.fillStyle = '#0f3038'; ctx.beginPath(); ctx.moveTo(sx, 290); ctx.lineTo(sx + 150, 290); ctx.lineTo(sx + 140, 302); ctx.lineTo(sx + 8, 302); ctx.fill();
        ctx.fillRect(sx + 100, 270, 30, 20); ctx.fillStyle = 'rgba(255,207,106,0.6)'; for (let j = 0; j < 3; j++) ctx.fillRect(sx + 104 + j * 9, 276, 4, 4);
      }
    }
    if (k === 3) { ctx.fillStyle = '#16323a'; ctx.fillRect(0, 300, W, 14); ctx.fillStyle = '#20444c'; for (let i = 0; i < 20; i++) { const x = ((i * 70 - b.d * 0.5) % 1400 + 1400) % 1400 - 70; ctx.fillRect(x, 296, 40, 6); } }
  }
  function water(st) {
    const b = st.b;
    const g = ctx.createLinearGradient(0, 306, 0, H); g.addColorStop(0, '#0f3a48'); g.addColorStop(1, '#05151c');
    ctx.fillStyle = g; ctx.fillRect(0, 306, W, H - 306);
    // the moon's path on the water
    for (let i = 0; i < 18; i++) { const y = 312 + i * 12, w = 30 + i * 4 + Math.sin(G.clock * 2 + i) * 8; ctx.fillStyle = 'rgba(246,240,214,' + (0.16 - i * 0.007) + ')'; ctx.fillRect(760 - w / 2 + Math.sin(i * 1.7 + G.clock) * 6, y, w, 2); }
    // ripples sliding past at our speed
    for (let i = 0; i < 70; i++) {
      const lane = i % 3, y = laneY(lane) + 18 - (i % 7) * 5, sp = 1 + lane * -0.12;
      const x = ((H_(i) * 1800 - b.d * sp) % 1800 + 1800) % 1800 - 200;
      ctx.fillStyle = 'rgba(160,210,230,' + (0.08 + 0.06 * H_(i + 2)) + ')'; ctx.fillRect(x, y, 20 + H_(i + 4) * 30, 1.5);
    }
    // the channel markers: faint lines between the channels
    for (const y of [(LANE_Y[0] + LANE_Y[1]) / 2 + 12, (LANE_Y[1] + LANE_Y[2]) / 2 + 12]) for (let x = -((b.d * 0.9) % 80); x < W; x += 80) { ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(x, y, 34, 2); }
  }
  function canalWalls(st) {
    const off = st.b.d % 60;
    ctx.fillStyle = '#2a3236'; ctx.fillRect(0, 300, W, 72);
    ctx.fillStyle = '#343e44'; for (let y = 304; y < 368; y += 12) for (let x = -off - ((y / 12) % 2) * 30; x < W; x += 60) ctx.fillRect(x, y, 56, 9);
    for (let x = -(st.b.d * 1 % 300); x < W; x += 300) { ctx.fillStyle = '#5a646a'; ctx.fillRect(x, 270, 4, 34); ctx.fillStyle = 'rgba(255,214,120,0.9)'; circle(x + 2, 268, 5); ctx.fill(); ctx.fillStyle = 'rgba(255,214,120,0.12)'; circle(x + 2, 300, 40); ctx.fill(); }
  }
  function drawObj(st, ob, x) {
    const t = G.clock;
    if (ob.type === 'doors') { if (!ob.hit) { ctx.fillStyle = '#5a4028'; ctx.fillRect(x - 10, 330, 20, 150); } else for (let i = 0; i < 5; i++) { ctx.fillStyle = '#6a4a2a'; ctx.save(); ctx.translate(x + 40 + i * 30, 360 + i * 20 + Math.sin(i) * 10); ctx.rotate(i); ctx.fillRect(-12, -3, 24, 6); ctx.restore(); } return; }
    if (ob.type === 'gate') return drawGate(st, ob, x);
    if (ob.type === 'bridge') return drawBridge(st, ob, x);
    if (ob.type === 'bigramp') return drawBigRamp(st, ob, x);
    if (ob.type === 'wake') { for (let l = 0; l < st.L.lanes; l++) { const y = laneY(l) + 6, s = laneS(l); ctx.strokeStyle = 'rgba(220,240,255,0.7)'; ctx.lineWidth = 3 * s; ctx.beginPath(); for (let i = 0; i <= 8; i++) { const yy = y - Math.sin(i / 8 * Math.PI) * 10 * s; if (i) ctx.lineTo(x - 30 + i * 8, yy); else ctx.moveTo(x - 30, yy); } ctx.stroke(); } text(ob.dir > 0 ? '▲' : '▼', x, laneY(st.L.lanes - 1) - 40, 14, '#ffffff', 'center', 'body'); return; }
    const y = laneY(ob.lane), s = laneS(ob.lane);
    if (ob.type === 'buoy') { if (ob.hit) return; ctx.fillStyle = '#d83a2a'; ctx.beginPath(); ctx.moveTo(x - 9 * s, y); ctx.lineTo(x, y - 30 * s); ctx.lineTo(x + 9 * s, y); ctx.fill(); ctx.fillStyle = '#f4f2ea'; ctx.fillRect(x - 5 * s, y - 16 * s, 10 * s, 4 * s); ctx.fillStyle = Math.sin(t * 5 + ob.d) > 0 ? '#ffe07a' : '#6a5a2a'; circle(x, y - 32 * s, 3 * s); ctx.fill(); bob(x, y, s); }
    else if (ob.type === 'mine') { if (!ob.hit) { drawMine(x, y - 8 * s, s, false); bob(x, y, s); } }
    else if (ob.type === 'moored') { ctx.fillStyle = '#3a4a50'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 130 * s, y); ctx.lineTo(x + 120 * s, y - 18 * s); ctx.lineTo(x + 6 * s, y - 18 * s); ctx.fill(); ctx.fillStyle = '#5a6a70'; ctx.fillRect(x + 30 * s, y - 34 * s, 40 * s, 16 * s); }
    else if (ob.type === 'pier' || ob.type === 'ferry') {
      const len = ob.len;
      if (ob.type === 'pier') {
        ctx.fillStyle = '#4a3a2a'; for (let px = 0; px < len; px += 40) ctx.fillRect(x + px, y - 34 * s, 6 * s, 44 * s);
        ctx.fillStyle = '#6a5038'; ctx.fillRect(x - 6, y - 40 * s, len + 12, 9 * s);
        // the warning sign ahead
        const sx = x - 620; ctx.fillStyle = '#5a646a'; ctx.fillRect(sx, y - 50 * s, 3, 50 * s); ctx.fillStyle = '#ffd23f'; rr(sx - 16, y - 70 * s, 34, 22 * s, 4); ctx.fill(); text('PIER', sx + 1, y - 59 * s, 10 * s, COL.ink, 'center', 'body');
      } else {
        const top = laneY(Math.max(...ob.lanes)) - 50, bot = laneY(Math.min(...ob.lanes)) + 10;
        ctx.fillStyle = '#d8d4c8'; rr(x, top, len, bot - top, 10); ctx.fill(); ctx.fillStyle = '#2a6a8a'; ctx.fillRect(x, bot - 16, len, 8);
        ctx.fillStyle = 'rgba(255,214,120,0.9)'; for (let i = 0; i < 8; i++) ctx.fillRect(x + 20 + i * 32, top + 14, 12, 9);
        ctx.fillStyle = '#c83a2a'; ctx.fillRect(x + len / 2 - 10, top - 26, 20, 26); text('FERRY', x + len / 2, bot - 30, 13, '#2a3a4a', 'center', 'body');
      }
    }
    else if (ob.type === 'fish') {
      const dy = ob.aside ? -ob.aside * 50 : 0, a = 1 - (ob.aside || 0) * 0.7; ctx.globalAlpha = a;
      ctx.fillStyle = '#3a6a8a'; ctx.beginPath(); ctx.moveTo(x, y + dy); ctx.lineTo(x + 96 * s, y + dy); ctx.lineTo(x + 86 * s, y - 16 * s + dy); ctx.lineTo(x + 4 * s, y - 16 * s + dy); ctx.fill();
      ctx.fillStyle = '#e8e0c8'; ctx.fillRect(x + 50 * s, y - 34 * s + dy, 22 * s, 18 * s); ctx.strokeStyle = '#8a7a5a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 20 * s, y - 16 * s + dy); ctx.lineTo(x + 10 * s, y - 50 * s + dy); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    else if (ob.type === 'gulls') {
      for (let i = 0; i < 5; i++) {
        const gx = x + i * 14 * s, fly = ob.aside ? ob.aside * 160 : 0, gy = y - 4 - fly - (ob.aside ? i * 10 * ob.aside : 0);
        ctx.fillStyle = '#f4f4f0'; if (fly) { ctx.strokeStyle = '#f4f4f0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(gx - 6, gy + Math.sin(t * 20 + i) * 3); ctx.lineTo(gx, gy); ctx.lineTo(gx + 6, gy + Math.sin(t * 20 + i) * 3); ctx.stroke(); }
        else { ctx.beginPath(); ctx.ellipse(gx, gy, 6 * s, 4 * s, 0, 0, TAU); ctx.fill(); circle(gx + 5 * s, gy - 4 * s, 3 * s); ctx.fill(); ctx.fillStyle = '#ffb020'; ctx.fillRect(gx + 7 * s, gy - 4 * s, 3 * s, 1.5); }
      }
    }
    else if (ob.type === 'crate') { if (ob.hit) return; ctx.fillStyle = COL.brass; rr(x - 13 * s, y - 24 * s, 26 * s, 22 * s, 3); ctx.fill(); ctx.strokeStyle = COL.brassDark; ctx.lineWidth = 2; ctx.strokeRect(x - 10 * s, y - 21 * s, 20 * s, 16 * s); ctx.fillStyle = Math.sin(t * 8) > 0 ? '#5dff9a' : '#1a5a3a'; circle(x, y - 28 * s, 3 * s); ctx.fill(); bob(x, y, s); }
    else if (ob.type === 'bottle') { if (ob.got) return; const ay = ob.air ? S.airH * 0.9 : 0; ctx.save(); ctx.translate(x, y - 10 * s - ay); ctx.rotate(Math.sin(t * 2 + ob.d) * 0.3); K.intel('bottle', 0, 0, s, t); ctx.restore(); }
    else if (ob.type === 'sand') { ctx.fillStyle = 'rgba(200,180,120,0.55)'; ctx.beginPath(); ctx.ellipse(x + ob.len / 2, y + 2, ob.len / 2, 7 * s, 0, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(230,210,150,0.6)'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.ellipse(x + 40 + i * ob.len / 5, y - 1, 16, 3, 0, 0, TAU); ctx.fill(); } }
    else if (ob.type === 'ramp') {
      if (ob.look === 'whale') { ctx.fillStyle = '#2a3a4a'; ctx.beginPath(); ctx.ellipse(x + 30, y, 70 * s, 26 * s, 0, Math.PI, TAU); ctx.fill(); ctx.fillStyle = '#e8e8e8'; circle(x - 10, y - 8 * s, 2.5); ctx.fill(); text('z', x + 40, y - 40 - (t * 8) % 12, 11, '#ffffff', 'center', 'body'); ctx.fillStyle = 'rgba(200,230,255,0.6)'; ctx.fillRect(x + 40, y - 30 * s - (t * 30) % 20, 2, 8); }
      else { ctx.fillStyle = '#5a4a3a'; ctx.beginPath(); ctx.moveTo(x - 30 * s, y + 4); ctx.lineTo(x + 40 * s, y - 34 * s); ctx.lineTo(x + 40 * s, y + 4); ctx.fill(); ctx.fillStyle = '#7a6a52'; ctx.fillRect(x - 30 * s, y - 2, 70 * s, 4); }
      ctx.fillStyle = '#8fe3b0'; text('▶▶', x - 60, y - 6, 12 * s, '#8fe3b0', 'center', 'body');
    }
    else if (ob.type === 'chain') {
      if (ob.hit) return;
      if (ob.look === 'mines') { drawMine(x, y - 8 * s, s * 0.9, false); }
      else { ctx.fillStyle = '#5a646a'; ctx.fillRect(x - 4, y - 40 * s, 8, 44 * s); ctx.strokeStyle = '#a8b0b4'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y - 30 * s); ctx.quadraticCurveTo(x - 4, y - 4, x, y - 30 * s + 26 * s); ctx.stroke(); }
    }
  }
  function bob(x, y, s) { ctx.fillStyle = 'rgba(200,230,255,0.25)'; ctx.fillRect(x - 12 * s, y, 24 * s, 2); }
  function drawMine(x, y, s, flying) {
    ctx.fillStyle = '#2a2e34'; circle(x, y, 10 * s); ctx.fill();
    ctx.strokeStyle = '#2a2e34'; ctx.lineWidth = 2.5 * s; for (let i = 0; i < 6; i++) { const a = i * TAU / 6; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * 9 * s, y + Math.sin(a) * 9 * s); ctx.lineTo(x + Math.cos(a) * 14 * s, y + Math.sin(a) * 14 * s); ctx.stroke(); }
    ctx.fillStyle = Math.sin(G.clock * 9) > 0 || flying ? '#ff3a3a' : '#5a1a1a'; circle(x, y - 3 * s, 2.5 * s); ctx.fill();
  }
  function drawGate(st, g, x) {
    const top = laneY(st.L.lanes - 1) - 70, bot = laneY(0) + 14;
    ctx.fillStyle = '#3a4448'; ctx.fillRect(x - 14, top - 30, 28, bot - top + 30);
    const shut = g.st === 'shut' ? 1 : g.st === 'closing' ? 1 - g.left / (g.dist / S.vmax * S.gateK) : 0;
    for (const l of g.lanes) { const y = laneY(l), h = 64 * laneS(l); ctx.fillStyle = '#6a5038'; ctx.fillRect(x - 8, y - h + 8 - (1 - shut) * h, 16, h * Math.max(0.05, shut)); ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 2; ctx.strokeRect(x - 8, y - h + 8 - (1 - shut) * h, 16, h * Math.max(0.05, shut)); }
    if (g.low != null) { const y = laneY(g.low); ctx.fillStyle = '#8fe3b0'; text('slow way', x - 70, y - 26, 11, '#8fe3b0', 'center', 'body'); }
    if (g.st === 'closing') { const fr = g.left / (g.dist / S.vmax * S.gateK); K.meter(clamp(x - 60, 20, W - 140), top - 56, 120, 10, fr, fr < 0.35 ? '#ff5a5a' : '#ffd23f'); text('GATE', clamp(x, 80, W - 80), top - 66, 12, '#ffffff', 'center', 'body'); }
  }
  function drawBridge(st, br, x) {
    const top = 250;
    ctx.fillStyle = '#3a4246'; ctx.fillRect(x - 30, top, 120, 26);
    for (let l = 0; l < st.L.lanes; l++) {
      const y = laneY(l), low = l === br.arch, h = low ? 52 : 110;
      ctx.fillStyle = '#2e3438'; ctx.fillRect(x - 30, y - h, 120, 10); ctx.fillRect(x - 30, y - h, 10, h); ctx.fillRect(x + 80, y - h, 10, h);
      if (low && st.grab && st.grab.on) { ctx.fillStyle = Math.sin(G.clock * 10) > 0 ? '#8fe3b0' : '#3a7a5a'; rr(x - 90, y - h - 24, 60, 20, 6); ctx.fill(); text('LOW', x - 60, y - h - 14, 11, COL.ink, 'center', 'body'); }
    }
  }
  function drawBigRamp(st, ob, x) {
    const top = laneY(2) - 10, bot = laneY(0) + 16;
    ctx.fillStyle = '#4a545a'; ctx.beginPath(); ctx.moveTo(x - 200, bot); ctx.lineTo(x + ob.len, top - 60); ctx.lineTo(x + ob.len + 40, top - 60); ctx.lineTo(x + ob.len + 40, bot); ctx.fill();
    ctx.fillStyle = '#ffd23f'; for (let i = 0; i < 6; i++) ctx.fillRect(x - 160 + i * 60, bot - 10 - i * 14, 30, 4);
    if (st.state !== 'fly') { ctx.fillStyle = '#8fe3b0'; text('BOOST!', x - 120, top - 50, 14, '#8fe3b0', 'center', 'body'); }
  }
  function drawOil(st, s) {
    const x = scrX(st, s.d), y = laneY(s.lane) + 4, sc = laneS(s.lane), a = clamp((S.oilLife - s.t) / 1, 0, 1);
    const g = ctx.createLinearGradient(x - 40, y, x + 40, y); g.addColorStop(0, 'rgba(120,60,160,' + 0.5 * a + ')'); g.addColorStop(0.5, 'rgba(40,140,120,' + 0.6 * a + ')'); g.addColorStop(1, 'rgba(160,120,40,' + 0.5 * a + ')');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, 44 * sc, 8 * sc, 0, 0, TAU); ctx.fill();
  }
  function drawSmoke(st, s) {
    const a = s.t < S.smokeT ? Math.min(1, s.t * 4) : Math.max(0, 1 - (s.t - S.smokeT) / 1.2);
    for (let i = 0; i < 16; i++) {
      const d = s.d0 + (s.d1 - s.d0) * (i / 15), x = scrX(st, d) + Math.sin(s.t + i) * 10, y = laneY(i % 3) - 26 - (i % 4) * 8 - s.t * 6;
      ctx.fillStyle = 'rgba(206,210,216,' + 0.55 * a + ')'; circle(x, y, 30 + (i % 3) * 8 + s.t * 6); ctx.fill();
    }
  }
  // a Zero boat (black, a Zero or two) or a jet ski
  function drawChaser(st, c, x) {
    const y = laneY(c.lane) - (c.air > 0 ? 4 * S.airH * 0.6 * (c.air / S.airT) * (1 - c.air / S.airT) : 0), s = laneS(c.lane), w = c.wreck;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    if (w) {
      if (w.kind === 'spin') ctx.rotate(w.t * 9 * w.spin * Math.max(0, 1 - w.t / 2.5));
      if (w.kind === 'boom' || w.kind === 'crash') { ctx.translate(0, Math.min(20, w.t * 14)); ctx.rotate(w.spin * Math.min(0.6, w.t * 0.8)); }
      if (w.kind === 'sand') { ctx.translate(0, -4); ctx.rotate(-0.12); }
    }
    if (c.kind === 'ski') {
      ctx.fillStyle = '#16181c'; ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(24, 0); ctx.lineTo(16, -10); ctx.lineTo(-22, -10); ctx.fill();
      ctx.fillStyle = '#a8262e'; ctx.fillRect(-10, -12, 20, 3);
      if (!w || w.t < 0.6) K.zero(-4, -6, { s: 0.55, face: 1, pose: 'stand' });
    } else {
      ctx.fillStyle = '#121418'; ctx.beginPath(); ctx.moveTo(-60, 0); ctx.lineTo(56, 0); ctx.lineTo(70, -18); ctx.lineTo(-56, -18); ctx.fill();
      ctx.fillStyle = '#2a2e34'; ctx.fillRect(-56, -22, 120, 4); ctx.fillStyle = '#f2f2f2'; text('0', 40, -9, 12, '#f2f2f2', 'center', 'body');
      ctx.fillStyle = 'rgba(160,200,220,0.5)'; ctx.beginPath(); ctx.moveTo(16, -22); ctx.lineTo(30, -36); ctx.lineTo(34, -22); ctx.fill();
      if (!w || w.t < 0.5) { K.zero(-8, -14, { s: 0.6, face: 1, pose: c.recover > 0 ? 'fist' : 'look', t: G.clock }); if (c.blind > 0) { ctx.fillStyle = 'rgba(206,210,216,0.85)'; circle(-6, -44, 12); ctx.fill(); } }
    }
    ctx.restore();
    if (w) {
      // comic ends: bowler hats float, a fish net, a gull on the bow
      ctx.fillStyle = '#111316'; for (let i = 0; i < 2; i++) { const hx = x - 20 + i * 30 + w.t * 10, hy = y + 6 + Math.sin(G.clock * 3 + i) * 2; ctx.beginPath(); ctx.ellipse(hx, hy, 9 * s, 2.4 * s, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(hx, hy - 2, 6 * s, 5 * s, 0, Math.PI, TAU); ctx.fill(); }
      if (w.kind === 'net') { ctx.strokeStyle = 'rgba(220,220,200,0.8)'; ctx.lineWidth = 1; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(x - 40 + i * 14, y - 40 * s); ctx.lineTo(x - 30 + i * 14, y); ctx.stroke(); } ctx.fillStyle = '#c8d8e0'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(x - 30 + i * 16, y - 20 * s + Math.sin(G.clock * 8 + i) * 3, 5, 2.4, 0.3, 0, TAU); ctx.fill(); } }
      if (w.kind === 'sand') { ctx.fillStyle = '#f4f4f0'; ctx.beginPath(); ctx.ellipse(x + 40 * s, y - 28 * s, 6, 4, 0, 0, TAU); ctx.fill(); circle(x + 45 * s, y - 32 * s, 3); ctx.fill(); }
    }
  }
  // the speedboat: the steerer at the wheel in front, the gadget agent at the stern facing back, the briefcase between
  function drawBoat(st) {
    const b = st.b, s = laneS(b.ly), ay = airY(b), x = S.bx, y = laneY(b.ly) - ay;
    const tilt = b.air > 0 ? -0.18 + 0.36 * (b.airT / S.airT) : (b.v > 400 ? -0.04 : 0) + (b.lurch > 0 ? Math.sin(b.lurch * 30) * 0.06 : 0);
    // the wake behind
    if (ay < 10) { const wy = laneY(b.ly); for (let i = 0; i < 3; i++) { ctx.strokeStyle = 'rgba(220,240,255,' + (0.35 - i * 0.1) + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 60 * s, wy - 1); ctx.quadraticCurveTo(x - 120 - i * 30, wy + 2 + i * 3 + Math.sin(G.clock * 9 + i) * 1.5, x - 200 - i * 50, wy + 4 + i * 5); ctx.stroke(); } }
    ctx.save(); ctx.translate(x, y); ctx.rotate(tilt); ctx.scale(s, s);
    const lx = b.lurch > 0 ? Math.sin(b.lurch * 40) * 3 : 0;
    // the hull
    ctx.fillStyle = st.gold ? '#d8a640' : '#7a1e24'; ctx.beginPath(); ctx.moveTo(-64, 0); ctx.lineTo(54, 0); ctx.lineTo(78, -20); ctx.lineTo(-60, -20); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f4f2ea'; ctx.fillRect(-60, -22, 136, 4); ctx.fillStyle = '#16181c'; ctx.fillRect(-64, -8, 118, 3);
    ctx.fillStyle = 'rgba(160,200,220,0.55)'; ctx.beginPath(); ctx.moveTo(26, -22); ctx.lineTo(40, -40); ctx.lineTo(44, -22); ctx.fill();
    // the agents (seated: drawn from the waist up)
    ctx.save(); ctx.beginPath(); ctx.rect(-80, -120, 170, 101); ctx.clip();
    hero(st, st.steerId, 16 + lx, -13, 1, b.v);
    hero(st, st.gadId, -40 + lx, -13, -1, b.v);
    ctx.restore();
    // the wheel and the steerer's driving gloves; the brass control box on the gadget agent
    ctx.strokeStyle = '#2a2e34'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(30, -32, 7, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#3a2a20'; circle(28 + lx, -34, 3.2); ctx.fill(); circle(34 + lx, -30, 3.2); ctx.fill();
    ctx.fillStyle = COL.brass; rr(-30 + lx, -34, 16, 11, 2); ctx.fill(); ctx.fillStyle = '#ff4a4a'; circle(-26 + lx, -29, 1.6); ctx.fill(); ctx.fillStyle = '#5dff9a'; circle(-20 + lx, -29, 1.6); ctx.fill();
    ctx.strokeStyle = COL.brassDark; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-28 + lx, -34); ctx.lineTo(-36 + lx, -50); ctx.stroke();
    // the briefcase on the seat (gripped by the claw in the grab)
    K.briefcase(-8, -20, 0.8, { gold: 1 });
    // the motor
    ctx.fillStyle = '#2a2e34'; ctx.fillRect(-72, -26, 10, 20);
    if (b.boost > 0) { for (let i = 0; i < 3; i++) { ctx.fillStyle = ['#ffe07a', '#ff9a3a', '#ff4a3a'][i]; ctx.beginPath(); ctx.moveTo(-72, -20 + i * 3); ctx.lineTo(-100 - Math.random() * 30 - i * 10, -16); ctx.lineTo(-72, -12 - i * 2); ctx.fill(); } }
    ctx.restore();
    if (b.splash > 0) { ctx.fillStyle = 'rgba(220,240,255,' + b.splash + ')'; ctx.beginPath(); ctx.ellipse(x, laneY(b.ly), 80, 14, 0, 0, TAU); ctx.fill(); }
  }
  function hero(st, id, x, y, face, vx) {
    const p = G.players[id], save = p.vx; p.vx = vx;
    K.hero(id, x, y, { face, s: 1.35 });
    p.vx = save;
  }
  function drawHeli(st) {
    const h = st.heli;
    if (h.sx > W + 150) return;
    const x = h.sx, y = 78 + Math.sin(G.clock * 2) * 6, b = st.b;
    // the searchlight on the water
    if (h.on && !(st.grab && st.grab.on)) {
      const lx = S.bx + 10, ly = laneY(h.x) + 4, hot = h.phase === 'aim' || h.phase === 'drop';
      ctx.fillStyle = hot ? 'rgba(255,90,80,0.22)' : 'rgba(255,250,210,0.18)'; ctx.beginPath(); ctx.moveTo(x - 8, y + 20); ctx.lineTo(lx - 60, ly); ctx.lineTo(lx + 60, ly); ctx.closePath(); ctx.fill();
      ctx.fillStyle = hot ? 'rgba(255,120,100,0.35)' : 'rgba(255,250,220,0.3)'; ctx.beginPath(); ctx.ellipse(lx, ly, 64, 14, 0, 0, TAU); ctx.fill();
      if (h.phase === 'drop') { const u = h.t / S.netFall, ny = y + 30 + (laneY(h.netLane) - 40 - y - 30) * u; ctx.strokeStyle = 'rgba(230,230,210,0.9)'; ctx.lineWidth = 1.5; for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.moveTo(lx - 50 + i * 16, ny); ctx.lineTo(lx - 40 + i * 14, ny + 40); ctx.stroke(); } ctx.beginPath(); ctx.moveTo(lx - 50, ny); ctx.lineTo(lx + 50, ny); ctx.stroke(); }
    }
    // the claw on its cable
    if (st.grab && (st.grab.on || (st.grab.off || 0) < 1.2)) {
      const g = st.grab, bx = S.bx - 6, by = laneY(b.ly) - 24 * laneS(b.ly) - airY(b), down = Math.min(1, g.t / 0.8), off = g.on ? 0 : (g.off || 0) * 160;
      const cy = y + 30 + (by - y - 40) * down - off;
      ctx.strokeStyle = '#8a9096'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y + 26); ctx.lineTo(bx, cy); ctx.stroke();
      ctx.strokeStyle = '#c8ccd2'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(bx - 12, cy + 14); ctx.lineTo(bx - 8, cy); ctx.lineTo(bx + 8, cy); ctx.lineTo(bx + 12, cy + 14); ctx.stroke();
    }
    // the helicopter, Count Zero aboard shaking his fist
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = '#1a1c20'; ctx.beginPath(); ctx.ellipse(0, 0, 46, 20, 0, 0, TAU); ctx.fill(); ctx.fillRect(30, -6, 70, 8); ctx.fillRect(96, -18, 6, 20);
    ctx.fillStyle = 'rgba(160,200,220,0.6)'; ctx.beginPath(); ctx.ellipse(-22, -2, 16, 12, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#3a3e44'; ctx.lineWidth = 3; const r = Math.sin(G.clock * 40) * 70; ctx.beginPath(); ctx.moveTo(-r, -26); ctx.lineTo(r, -26); ctx.stroke(); ctx.fillRect(-2, -26, 4, 8);
    ctx.fillStyle = '#ff3a3a'; circle(98, -20, 2.5); ctx.fill();
    K.zero(-20, 8, { s: 0.45, face: -1, pose: 'fist', t: G.clock });
    ctx.restore();
  }
  function drawEnding(st) {
    const f = st.fly, t = f.t;
    // the seaplane lifting off ahead, its cargo door open
    const px = 640 - Math.max(0, t - 1.6) * 90, py = 330 - Math.max(0, t - 1.4) * 70;
    ctx.save(); ctx.translate(px, py);
    ctx.fillStyle = '#e8e4d8'; rr(-90, -26, 240, 46, 22); ctx.fill(); ctx.fillStyle = '#2a6a8a'; ctx.fillRect(-90, 2, 240, 6);
    ctx.fillStyle = '#d8d4c8'; ctx.fillRect(-20, -46, 160, 10); ctx.fillRect(130, -70, 20, 50);
    ctx.fillStyle = '#c8c4b8'; rr(-70, 22, 60, 10, 5); ctx.fill(); rr(70, 22, 60, 10, 5); ctx.fill();
    ctx.fillStyle = '#0a0c10'; ctx.fillRect(-80, -20, 50, 34);
    ctx.fillStyle = 'rgba(255,214,90,0.5)'; ctx.fillRect(-78, -18, 46, 30);
    const r = Math.sin(G.clock * 40) * 26; ctx.strokeStyle = '#4a4e54'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(150, -r); ctx.lineTo(150, r); ctx.stroke();
    ctx.restore();
    // the boat's arc into the door
    if (t < 1.25) {
      const u = t / 1.25, bx = S.bx + (px - 55 - S.bx) * u, by = f.y0 + (py - f.y0) * u - Math.sin(u * Math.PI) * 120;
      ctx.save(); ctx.translate(bx, by); ctx.rotate(-0.25 + 0.3 * u); ctx.scale(0.9, 0.9);
      ctx.fillStyle = st.gold ? '#d8a640' : '#7a1e24'; ctx.beginPath(); ctx.moveTo(-64, 0); ctx.lineTo(54, 0); ctx.lineTo(78, -20); ctx.lineTo(-60, -20); ctx.fill();
      hero(st, st.steerId, 16, -12, 1, 300); hero(st, st.gadId, -38, -12, -1, 300); K.briefcase(-8, -20, 0.8);
      ctx.restore();
    } else {
      // inside the door: both straighten their bow ties; the briefcase opens a crack and glows
      ctx.save(); ctx.beginPath(); ctx.rect(px - 80, py - 20, 50, 34); ctx.clip();
      hero(st, 0, px - 66, py + 14, 1, 0); hero(st, 1, px - 44, py + 14, -1, 0);
      ctx.restore();
      K.briefcase(px - 55, py + 12, 0.6, { open: t > 2.8 ? Math.min(1, (t - 2.8) * 0.8) : 0 });
      if (t > 2.6) text('✓', px - 55, py - 34, 16, '#ffd76a', 'center', 'body');
    }
    // Count Zero shaking his fist from the helicopter, left behind
    if (t > 1.6) { st.heli.sx = 140; st.heli.on = false; }
  }

  /* ---------- the HUD ---------- */
  function hud(st) {
    const big = hudBig(), z = big ? 1.25 : 1, b = st.b;
    let x0;
    {
      const fs = big ? 20 : 14, h = big ? 40 : 28, tm = fmtTime(G.time), n = '◆ ' + st.bottles + ' / ' + S.bottles;
      ctx.font = K.FONT(fs);
      const w = ctx.measureText(tm).width + ctx.measureText(n).width + fs + 30;
      x0 = pill(W - 14, 12, w, h, 'right');
      text(tm, x0 + 15, 12 + h / 2 + 0.5, fs, st.waiting ? '#aab' : C.paper, 'left', 'body');
      text(n, x0 + w - 15, 12 + h / 2 + 0.5, fs, '#fff1c0', 'right', 'body');
      K.alertBar(W - 14 - 230 * z, 12 + h + 8, 230, st.chase / 100, { icon: 'hat', label: 'Chase' });
      if (st.gold) K.chip(W - 14 - 120 * z, 12 + h + 40 * z, 120 * z, 22 * z, '★ gold boat', false, true, z);
    }
    K.drawMsg(st, st.waiting ? { text: K.BREAK, col: '#ffffff', t: 1, life: 2 } : st.msg, x0);
    K.drawControl(st);
    // the tug-of-war bar in the grab
    if (st.grab && st.grab.on && st.grab.down) { const w = 260 * z, x = W / 2 - w / 2, y = 70 * z; ctx.fillStyle = 'rgba(23,25,29,0.88)'; rr(x - 10, y - 22, w + 20, 40, 12); ctx.fill(); text('Hang on to the case!', W / 2, y - 10, 12 * z, '#ffffff', 'center', 'body'); K.meter(x, y, w, 10 * z, st.grab.bar, st.grab.bar < 0.35 ? '#ff5a5a' : '#8fe3b0'); }
    // the players' panels: the steerer's speed, the gadget agent's brass box
    {
      const pb = K.panel(st.steerId, 'steerer', 210, 58, z), sp = b.v / S.boostV, ok = b.v >= S.rampV - 5;
      text('speed', pb.x + 12 * z, pb.y + 32 * z, 11 * z, '#ffffff', 'left', 'body');
      K.meter(pb.x + 56 * z, pb.y + 28 * z, 110 * z, 9 * z, sp, b.boost > 0 ? '#ffb347' : ok ? '#8fe3b0' : '#ffffff', S.rampV / S.boostV);
      text(b.hornT > 0 ? 'horn ' + Math.ceil(b.hornT) : 'horn ready', pb.x + 12 * z, pb.y + 46 * z, 11 * z, b.hornT > 0 ? '#8a9096' : '#fff1c0', 'left', 'body');
    }
    {
      const have = GADGETS.filter(n => n !== 'magnet' || st.k >= 2), w = 64 + have.length * 58;
      const pb = K.panel(st.gadId, 'gadgets', w, 58, z);
      have.forEach((n, i) => {
        const x = pb.x + (12 + i * 58) * z, y = pb.y + 24 * z, on = st.sel === n;
        ctx.fillStyle = on ? COL.brass : 'rgba(216,166,64,0.25)'; rr(x, y, 52 * z, 26 * z, 6 * z); ctx.fill();
        if (on) { ctx.strokeStyle = '#fff1c0'; ctx.lineWidth = 2; rr(x, y, 52 * z, 26 * z, 6 * z); ctx.stroke(); }
        text(GNAME[n], x + 26 * z, y + 9 * z, 10 * z, on ? COL.ink : '#fff1c0', 'center', 'body');
        for (let j = 0; j < MAXC[n]; j++) { ctx.fillStyle = j < st.ch[n] ? (on ? COL.ink : '#fff1c0') : 'rgba(255,255,255,0.2)'; circle(x + 26 * z + (j - (MAXC[n] - 1) / 2) * 9 * z, y + 19 * z, 3 * z); ctx.fill(); }
      });
    }
    if (st.state !== 'go') return;
    // prompts over each agent
    const pl = plan(st), P = K.prompter(st), y = laneY(b.ly) - 110 - airY(b);
    {
      const id = st.steerId, Ps = pl.steer; let s = null, pulse = false;
      const up = K.key(id, 'up'), dn = K.key(id, 'down');
      if (Ps.why === 'horn') { s = 'Horn! ' + K.key(id, 'act'); pulse = true; }
      else if (Ps.why === 'net') { s = 'NET! Change channel ' + (Ps.lane > b.tl ? up : dn); pulse = true; }
      else if (Ps.why === 'bridge' && Ps.lane !== b.tl) { s = 'The low arch! ' + (Ps.lane > b.tl ? up : dn); pulse = true; }
      else if (Ps.brace) s = 'Wave! Hold ' + (Ps.brace > 0 ? up : dn) + ' into it';
      else if (Ps.why === 'dodge' && Ps.lane !== b.tl) s = 'Dodge ' + (Ps.lane > b.tl ? up : dn);
      else if (Ps.why === 'low' && Ps.lane !== b.tl) s = 'Take the slow way ' + (Ps.lane > b.tl ? up : dn);
      else if (Ps.why === 'ramp') s = 'Full speed for the ramp ' + K.key(id, 'right');
      else if (b.thr < 0.8) s = 'Faster ' + K.key(id, 'right');
      P.say(id, s, S.bx + 30, y, null, pulse);
    }
    {
      const id = st.gadId, Pg = pl.gad; let s = null, pulse = false;
      if (Pg.hold) { s = (st.grab.held ? 'Keep holding ' : 'HOLD ') + K.key(id, 'act') + '!'; pulse = !st.grab.held; }
      else if (Pg.use) {
        const why = { gate: ' for the gate!', final: ' off the ramp!', ramp: ' for the ramp!', away: ' to get away!', two: ': two behind!', net: ' to hide from the net!', ski: ' for the jet ski!', behind: ': one right behind!', mine: ': a mine in reach!' }[Pg.why] || '!';
        s = (st.sel === Pg.use ? GNAME[Pg.use] + ' now ' + K.key(id, 'act') : 'Pick ' + GNAME[Pg.use] + ' ' + K.key(id, 'lr')) + why; pulse = true;
      }
      else if (Pg.pick !== st.sel && Pg.pick) s = 'Get ' + GNAME[Pg.pick] + ' ready ' + K.key(id, 'lr');
      P.say(id, s, S.bx - 60, y - 30, null, pulse);
    }
  }

  const medal = t => K.medal(t <= S.goldT, t <= S.silverT);
  MODES.spyboat = {
    S, plan, medal, build, hazardIn, gateMakes, reach, magnetTarget, laneY, GADGETS, MAXC,
    medals: { bronze: 'Get the diamond to the seaplane', goals: [{ key: 'time', gold: S.goldT, silver: S.silverT }, { key: 'bumps', gold: 0, silver: 4, word: 'Bump' }, { key: 'bottles', gold: S.bottles, silver: 14, more: true, word: 'Intel bottle' }] },
    medalValues() { const st = G.mst; return { bumps: st.stats.bumps, bottles: st.bottles }; },
    music() { const st = G.mst; return { song: st && st.k === 3 ? 'spychaseUp' : 'spychase' }; },
    setup(st, L) {
      st.stats = { bumps: 0, caught: 0, restarts: 0, wrecked: 0, gadgets: 0, helps: 0, roomT: [] };
      st.bottles = 0; st.inT = [G.time, G.time]; st.personT = G.time; st.got = {};
      room(st, L.def, 0);
    },
    room(k, L) { const st = G.mst; st.inT = [G.time, G.time]; st.personT = G.time; room(st, L.def, k); if (typeof Music !== 'undefined' && Music.cue) Music.cue({ song: k === 3 ? 'spychaseUp' : 'spychase' }); },
    step(dt) { tick(G.mst, dt); },
    draw() { const st = G.mst; if (!st.L) return; draw(st); K.hide(st); },
    drawTop() { const st = G.mst; K.unhide(st); if (st.L) K.drawPops(st, 0, 0); },
    hud() { const st = G.mst; if (st.L) hud(st); },
    stats() {
      const st = G.mst, s = st.stats;
      if (!s) return [];
      const out = [
        { label: 'Bumps', value: String(s.bumps) },
        { label: 'Caught', value: String(s.caught) },
        { label: 'Intel', value: st.bottles + ' of ' + S.bottles },
      ];
      out.push('Chasers wrecked: ' + s.wrecked + '. Gadgets used: ' + s.gadgets + '.');
      out.push(K.STORY.last);
      const hl = K.helpLine(s.helps); if (hl) out.push(hl);
      return out;
    },
  };

  /* ---------- the level ---------- */
  SPY.defs.spyboat = {
    name: 'Speedboat Getaway', world: 37, kind: 'team', mode: 'spyboat', outfit: 'spyboat', music: 'spychase', ownStep: true, ownHUD: true, noFalls: true, roomWord: 'Stretch',
    jobs: {
      steerer: { title: 'Steerer', act: 'horn', legend: '<kbd>W</kbd><kbd>S</kbd> change channel <kbd>D</kbd> faster <kbd>A</kbd> slower',
        howTo: ['Dodge, honk at gulls and fish, and drive through brass crates to refill.'] },
      gadgets: { title: 'Gadgets', act: 'gadget', legend: '<kbd>A</kbd><kbd>D</kbd> pick a gadget',
        howTo: ['Smoke blinds them, Oil spins the boat behind you, Boost is for ramps and gates.'] },
    },
    jobAlt: true, jobSwap: 'You swap jobs every stretch.',
    tip: 'The steerer lines them up, the gadgets knock them out. Save a Boost for ramps and gates.',
    howTo: [
      'Chasers copy your channel a moment late. Dodge late and they hit what you missed.',
    ],
    act: { label: 'gadget' },
    map: K.stubMap(),
    rooms: [
      { title: 'The Boathouse Canal', done: 'Out of the canal!', tip: 'Pip steers, Bo has the gadgets. Oil the boat right behind you, smoke them when two come.' },
      { title: 'The Docks', done: 'Through the docks!', tip: 'Bo steers now. Boost to beat the lock gate. Full speed takes the ramp.' },
      { title: 'Open Harbour', done: 'Across the harbour!', tip: 'The helicopter! Change channel when the net drops. Hold into the waves. The Magnet flings mines.' },
      { title: 'The Breakwater', done: 'Seaplane!', tip: 'The claw! Hold on to the case and take the low arch. Then Boost off the end of the breakwater!' },
    ],
  };

  /* ---------- sounds ---------- */
  Sfx.extra.spyboatEngine = function () { const o = engV, v = o.v || 400, f = 50 + v * 0.09; this.tone(f, 0.24, 'sawtooth', o.boost ? 0.012 : 0.007, f * 1.04); this.noise(0.2, { type: 'lowpass', f: 400 + v, vol: 0.006 }); };
  Sfx.extra.spyboatWaveSlap = function () { this.noise(0.25, { type: 'lowpass', f: 900, vol: 0.05 }); this.tone(110, 0.2, 'sine', 0.03, 70); };
  Sfx.extra.spyboatSpraySplash = function () { this.noise(0.4, { type: 'highpass', f: 1800, vol: 0.03, a: 0.02 }); };
  Sfx.extra.spyboatChannelSwish = function () { this.noise(0.18, { type: 'bandpass', f: 1400, q: 1.2, vol: 0.02, a: 0.04 }); };
  Sfx.extra.spyboatHornHonk = function () { this.tone(233, 0.4, 'sawtooth', 0.035); this.tone(294, 0.4, 'sawtooth', 0.025); };
  Sfx.extra.spyboatGadgetClick = function () { this.tone(1600, 0.03, 'square', 0.015); this.tone(1100, 0.03, 'square', 0.01, null, 0.03); };
  Sfx.extra.spyboatEmpty = function () { this.tone(300, 0.12, 'square', 0.02, 220); };
  Sfx.extra.spyboatSmokePuff = function () { this.noise(0.8, { type: 'lowpass', f: 700, vol: 0.06, a: 0.03 }); this.tone(180, 0.2, 'sine', 0.03, 90); };
  Sfx.extra.spyboatOilGlug = function () { for (let i = 0; i < 3; i++) this.tone(220 - i * 30, 0.1, 'sine', 0.04, 140 - i * 20, i * 0.11); };
  Sfx.extra.spyboatBoostRoar = function () { this.tone(90, 1.2, 'sawtooth', 0.04, 260); this.noise(1.2, { type: 'lowpass', f: 1200, vol: 0.05, a: 0.05 }); };
  Sfx.extra.spyboatMagnetHum = function () { this.tone(120, 0.6, 'square', 0.015, 240); };
  Sfx.extra.spyboatMineFling = function () { this.noise(0.3, { type: 'bandpass', f: 1800, q: 2, vol: 0.03, a: 0.02 }); this.tone(500, 0.3, 'triangle', 0.02, 1200); };
  Sfx.extra.spyboatMineBoom = function () { this.tone(60, 0.8, 'sine', 0.09, 35); this.noise(0.8, { type: 'lowpass', f: 600, vol: 0.08 }); };
  Sfx.extra.spyboatCrateGrab = function () { [784, 988, 1175].forEach((f, i) => this.tone(f, 0.09, 'triangle', 0.03, null, i * 0.06)); };
  Sfx.extra.spyboatRampLaunch = function () { this.tone(140, 0.5, 'sawtooth', 0.03, 320); this.noise(0.3, { type: 'highpass', f: 1500, vol: 0.03 }); };
  Sfx.extra.spyboatLandSplash = function () { this.noise(0.6, { type: 'lowpass', f: 1400, vol: 0.07, a: 0.01 }); this.tone(90, 0.3, 'sine', 0.04, 55); };
  Sfx.extra.spyboatChaserSpin = function () { for (let i = 0; i < 4; i++) this.tone(600 - i * 80, 0.12, 'triangle', 0.025, 400 - i * 60, i * 0.1); this.noise(0.4, { type: 'highpass', f: 2000, vol: 0.02 }); };
  Sfx.extra.spyboatChaserCrash = function () { this.noise(0.6, { type: 'lowpass', f: 1000, vol: 0.07 }); this.tone(80, 0.4, 'square', 0.03, 50); };
  Sfx.extra.spyboatChaserRoar = function () { this.tone(70, 0.8, 'sawtooth', 0.02, 110); };
  Sfx.extra.spyboatSkiWhine = function () { this.tone(320, 0.7, 'sawtooth', 0.012, 520); };
  Sfx.extra.spyboatZeroShout = function () { this.tone(200, 0.2, 'sawtooth', 0.02, 160); this.tone(170, 0.25, 'sawtooth', 0.02, 130, 0.2); };
  Sfx.extra.spyboatBumpThud = function () { this.tone(70, 0.3, 'sine', 0.07, 45); this.noise(0.15, { type: 'lowpass', f: 500, vol: 0.05 }); };
  Sfx.extra.spyboatGulls = function () { for (let i = 0; i < 4; i++) this.tone(1300 + i * 120, 0.12, 'triangle', 0.015, 1700, i * 0.09); };
  Sfx.extra.spyboatDoorsCrash = function () { this.noise(0.6, { type: 'bandpass', f: 700, q: 0.8, vol: 0.08 }); this.tone(100, 0.4, 'square', 0.03, 60); };
  Sfx.extra.spyboatHeliLock = function () { this.tone(1200, 0.08, 'square', 0.02); this.tone(1200, 0.08, 'square', 0.02, null, 0.14); };
  Sfx.extra.spyboatNetDrop = function () { this.noise(0.5, { type: 'bandpass', f: 600, q: 1, vol: 0.03, a: 0.1 }); };
  Sfx.extra.spyboatNetWhump = function () { this.tone(90, 0.3, 'sine', 0.06, 60); this.noise(0.3, { f: 900, q: 0.8, vol: 0.05 }); };
  Sfx.extra.spyboatClawClank = function () { this.tone(400, 0.3, 'square', 0.03, 300); this.tone(620, 0.25, 'triangle', 0.02, 500, 0.05); };
  Sfx.extra.spyboatTugCreak = function () { this.tone(180 + Math.random() * 60, 0.15, 'sawtooth', 0.01, 140); };
  Sfx.extra.spyboatGateGrind = function () { this.noise(1.2, { type: 'bandpass', f: 300, q: 2, vol: 0.04, a: 0.1 }); this.tone(70, 1.2, 'sawtooth', 0.015, 60); };
  Sfx.extra.spyboatGateTick = function () { this.tone(1500, 0.04, 'square', 0.015); };
  Sfx.extra.spyboatGateShut = function () { this.tone(60, 0.6, 'square', 0.04, 40); this.noise(0.4, { type: 'lowpass', f: 400, vol: 0.06 }); };
  Sfx.extra.spyboatBottleClink = function () { this.tone(2200, 0.08, 'sine', 0.025); this.tone(3300, 0.1, 'sine', 0.015, null, 0.04); };
  Sfx.extra.spyboatSeaplaneDrone = function () { this.tone(110, 3, 'sawtooth', 0.02, 140); this.tone(220, 3, 'triangle', 0.01, 260); };
  Sfx.extra.spyboatCaughtSplash = function () { this.noise(0.8, { type: 'lowpass', f: 1200, vol: 0.08 }); [440, 349, 262].forEach((f, i) => this.tone(f, 0.18, 'square', 0.025, null, 0.3 + i * 0.15)); };
  Sfx.extra.spyboatFinalSting = function () { [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.04, null, i * 0.12)); };
})();
