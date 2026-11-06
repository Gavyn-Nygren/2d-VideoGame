/* Pip & Bo - Computer partner brain for 16-2 Gumball Machine Puzzle. */
'use strict';

(() => {
  /* 16-2 Gumball Machine Puzzle (MODES.gumball): the level says who cranks (G.mst.crank) and who keeps the levers
     (G.mst.keep); the computer does the job it has and reads what the machine needs from MODES.gumball.needs (the same
     plan the prompts and the gold path read: every gumball's cheapest way to its own cup, and which levers that takes).
     CRANKER: slides the nozzle to the chute with the cheapest way for the next gumball (◀ ▶, one press at a time),
     swaps the next two (▼) when the second one can go straight in and the first needs flips, and turns the crank only
     when the next gumball's way is set (every flap/seesaw/spinner/belt on it already right), the board isn't busy with
     a gumball that still passes a lever, and, for a way through a trapdoor or the flipper, the keeper is standing at
     that lever. It never cranks blind into a wrong cup.
     KEEPER: walks and hops the wafer ledges (cpuNav) to the lever of the most urgent job (the gumball that gets to its
     device soonest, then the next one in the globe) and presses the action there: a flip when the device is set the
     wrong way, a trapdoor just before the gumball gets there (its look-ahead time), a flick when the gumball sits in
     the flipper's cradle. With nothing to do it waits by the lever the next gumball will need.
     With a person partner: a computer cranker waits for the person's flips and says which lever (by its picture), and
     cranks when the person shouts "Ready!" (a second "Ready!" cranks even if the way isn't set: the person decides);
     a computer keeper says "Crank it!" when the way is set and the person waits. A person who does nothing: no gumball
     ever drops (computer keeper), or only gumballs whose way needs no lever reach their cups (computer cranker), so
     the machine never fills.
     Skill sets reaction times (how soon after the way is set the crank turns, how long before a flip). */
  const M = () => MODES.gumball;
  const R = () => MODES.gumball.GUMBALL;

  /* ---------- the cranker ---------- */
  function crank(st, S, p, o, dt, info) {
    const out = {}, nd = M().needs(st), human = !info.partnerCpu, K = o.id;
    if (st.phase !== 'play' || !st.queue.length) return out;
    const react = 0.15 + (1 - info.skill) * 0.5;
    S.btnT = (S.btnT || 0) - dt;
    const feeding = st.balls.some(b => b.ph === 'feed');
    const live = st.balls.filter(M().live).length;
    const next = nd.next;
    // a swap: the second gumball can go in with no flips and the first needs some (not twice in a row)
    if (next && st.queue.length >= 2 && S.btnT <= 0 && !feeding && S.swapFor !== st.bid) {
      const second = st.queue[1];
      if (second !== next.col) {
        const costOf = col => {
          let best = Infinity;
          st.M.chutes.forEach((c, i) => { const bb = M().best(st, c.to, col, nd.lock); if (bb) best = Math.min(best, bb.cost + Math.abs(i - st.chute) * 0.2); });
          return best;
        };
        const a = next.bestAny ? next.bestAny.cost : Infinity, b = costOf(second);
        if (b === 0 && a >= 1 && cpuFor(S, 'swapThink', true, dt) > react) { out.down = 'tap'; S.btnT = 0.35; S.swapFor = st.bid; return out; }
      }
    }
    // the nozzle: to the chute with the cheapest way
    if (next && next.chuteBest >= 0 && next.chuteBest !== st.chute && !feeding) {
      if (S.btnT <= 0 && cpuFor(S, 'chuteThink', true, dt) > react * 0.6) {
        if (next.chuteBest > st.chute) out.right = 'tap'; else out.left = 'tap';
        S.btnT = 0.22;
      }
      return out;
    }
    cpuFor(S, 'chuteThink', false, dt);
    // a person shouted "Ready!"
    const readyNow = st.lastReady != null && st.lastReady > (S.seenReady || -1) && G.time - st.lastReady < 1.5;
    if (readyNow) { S.seenReady = st.lastReady; S.readyCount = (S.readyFresh && G.time - S.readyFresh < 5) ? (S.readyCount || 0) + 1 : 1; S.readyFresh = G.time; S.answer = true; }
    // is the next gumball's way set, and is the keeper where the timed press will be?
    const timedReq = next && next.best ? next.best.req.filter(([d, s]) => s === 1 && (st.pc[d].t === 'flip' || st.pc[d].timed)) : [];
    const kpLever = M().leverAt(st, o);
    const atTimed = timedReq.every(([d]) => kpLever && kpLever.dev === d);
    const boardTimed = nd.jobs.some(j => j.b && (j.kind === 'time' || j.kind === 'flick'));
    const quiet = nd.busy === 0 || (!timedReq.length && !boardTimed && nd.jobs.every(j => !j.b || j.kind !== 'flip' || j.lever === null));
    let go = nd.ready && atTimed && quiet && live < R().maxBalls && st.crankCD <= 0;
    if (human && S.answer && live < R().maxBalls && st.crankCD <= 0) {
      if (nd.ready || S.readyCount >= 2) go = true;
      else if (next) {
        const job = nd.jobs.find(j => !j.b && j.lever);
        if (job) cpuSay(p, 'Not yet! ' + (job.kind === 'flip' ? (st.pc[job.dev].timed ? 'Shut ' : 'Flip ') : 'Stand at ') + M().leverName(job.lever) + ' first', 2.4);
        S.answer = false;
      }
    }
    if (go) {
      if (cpuFor(S, 'crankThink', true, dt) > react) { out.act = 'tap'; S.answer = false; S.readyCount = 0; cpuFor(S, 'crankThink', false, dt); }
    } else cpuFor(S, 'crankThink', false, dt);
    // with a person keeping the levers: say which lever the next gumball needs
    if (human && info.partnerIdle < 25 && next && !go) {
      const wait = cpuFor(S, 'waitSay', true, dt);
      const job = nd.jobs.find(j => j.lever && j.kind === 'flip') || nd.jobs.find(j => j.lever && !j.b);
      if (job && wait > 2.5) {
        const c = GUMBALL_COL[job.b ? job.b.col : next.col];
        if (job.kind === 'flip') cpuSay(p, c.name + ' next: ' + (st.pc[job.dev].timed ? 'shut ' : 'flip ') + M().leverName(job.lever) + ' ' + M().key(K, 'act'), 2.6);
        else if (job.kind === 'time') cpuSay(p, 'Stand at ' + M().leverName(job.lever) + ', open it as the gumball comes!', 2.6);
        else if (job.kind === 'flick') cpuSay(p, 'Stand at ' + M().leverName(job.lever) + ' and flick it!', 2.6);
      }
    } else cpuFor(S, 'waitSay', false, dt);
    return out;
  }

  /* ---------- the gate keeper ---------- */
  // with no job it can make in time: what every gumball still to come (in the globe or on the board) wants of each
  // device, on its cheapest way from any chute. One way only: set it now ('flip'). Both ways (or a trapdoor or the
  // flipper to work): wait at that lever ('wait').
  function prep(st, nd, travel) {
    const cols = st.queue.concat(st.balls.filter(M().live).map(b => b.col));
    const wants = {};
    for (const col of cols) {
      let best = null;
      for (const c of st.M.chutes) { const bb = M().best(st, c.to, col, null); if (bb && (!best || bb.cost < best.cost)) best = bb; }
      if (!best) continue;
      for (const [d, s] of best.req) { const w = wants[d] || (wants[d] = [0, 0]); w[s]++; }
    }
    const leverOf = d => st.levers.find(l => l.dev === d) || null;
    let flip = null, wait = null, waitN = 0;
    for (const d of Object.keys(wants)) {
      const pc = st.pc[d], w = wants[d], lv = leverOf(d);
      if (!lv || pc.t === 'see') continue;
      const timed = pc.timed || pc.t === 'flip';
      if (!timed && (!w[0] || !w[1])) {
        const want = w[1] ? 1 : 0;
        if (M().state(st, d) !== want && (nd.lock[d] == null || nd.lock[d] === want) && (!flip || travel(lv) < travel(flip.lever))) flip = { dev: d, kind: 'flip', want, b: null, lever: lv };
      } else {
        const n = timed ? w[1] : Math.min(w[0], w[1]);
        if (n > waitN) { waitN = n; wait = { dev: d, kind: 'wait', b: null, lever: lv }; }
      }
    }
    return flip || wait;
  }
  function keep(st, S, p, o, dt, info) {
    const out = {}, nd = M().needs(st), human = !info.partnerCpu, C = o.id, sc = st.slow ? R().slow : 1;
    const react = 0.08 + (1 - info.skill) * 0.25;
    // how long the run to a lever takes from here (the nav map's time, or a rough guess while in the air)
    const here0 = M().leverAt(st, p), tt = {};
    const travel = l => {
      if (tt[l.id] != null) return tt[l.id];
      let s = here0 === l ? 0 : p.grounded ? cpuNavReach(p, l.x, l.feet) : Infinity;
      if (s === Infinity) s = Math.abs(l.x - cpuCx(p)) / 200 + Math.abs(l.feet - cpuFeet(p)) / 120 + 0.3;
      return (tt[l.id] = s);
    };
    // the most urgent job it can still make in time: the gumball that gets to its device soonest, then the next one in
    // the globe. A gumball it can't reach in time is let go (it bloops and comes back) instead of chasing it from one
    // side of the machine to the other while the next one rolls past too.
    let job = null, jobEta = Infinity;
    for (const j of nd.jobs) {
      if (!j.lever) continue;
      const eta = j.b ? M().eta(st, j.b, j.dev) : 50;
      if (eta === Infinity && j.b) continue;
      if (j.b) {
        const slack = j.kind === 'flick' ? R().restT / sc - 0.3 : -react;
        if (travel(j.lever) > eta + slack) continue;
      }
      if (eta < jobEta) { job = j; jobEta = eta; }
    }
    // nothing it can make: get ready for what is left. A device every gumball still to come wants the same way gets set
    // now; otherwise it waits at the lever of the device the gumballs disagree on (it will flip it between gumballs).
    if (!job && st.phase === 'play') job = prep(st, nd, travel);
    const lv = job && job.lever;
    if (!lv) {
      // nothing to do: wait by the floor in the middle of the left side, ready to run
      cpuFor(S, 'atLever', false, dt);
      if (!p.grounded || Math.abs(cpuFeet(p) - 17 * T) > 4 || Math.abs(cpuCx(p) - S.homeX) > 40) {
        S.homeX = S.homeX || 92;
        const nav = cpuNav(S, p, S.homeX, 17 * T);
        Object.assign(out, nav);
      }
      if (human && st.phase === 'play' && info.partnerIdle < 25 && nd.ready && st.queue.length && st.balls.filter(M().live).length < R().maxBalls) {
        if (cpuFor(S, 'readySay', true, dt) > 2.5) cpuSay(p, 'Ready! Crank it! ' + M().key(C, 'act'), 2.4);
      } else cpuFor(S, 'readySay', false, dt);
      return out;
    }
    cpuFor(S, 'readySay', false, dt);
    S.homeX = lv.x < 480 ? 92 : 868;
    const here = M().leverAt(st, p);
    if (here !== lv) {
      cpuFor(S, 'atLever', false, dt);
      Object.assign(out, cpuNav(S, p, lv.x, lv.feet, { tol: 6 }));
      return out;
    }
    // at the lever: stand still and press when it's time
    cpuSeek(out, p, lv.x, 4);
    const at = cpuFor(S, 'atLever', true, dt);
    if (at < react || st.flipCD[p.id] > 0) return out;
    if (job.kind === 'flip') {
      if (M().state(st, job.dev) !== job.want) out.act = 'tap';
    } else if (job.kind === 'time') {
      const pc = st.pc[job.dev];
      if (job.b && pc.open <= 0) {
        const win = R().openT / sc - 0.6;
        if (jobEta <= win && jobEta >= 0) out.act = 'tap';
      }
    } else if (job.kind === 'flick') {
      const b = job.b;
      if (b && b.ph === 'rest' && b.piece === job.dev) {
        if (cpuFor(S, 'restSeen', true, dt) > 0.18 + (1 - info.skill) * 0.3) { out.act = 'tap'; cpuFor(S, 'restSeen', false, dt); }
      } else cpuFor(S, 'restSeen', false, dt);
    }
    // with a person cranking: at the lever and the way is set, say so
    if (human && !out.act && st.phase === 'play' && info.partnerIdle < 25 && !job.b && nd.ready && st.balls.filter(M().live).length < R().maxBalls) {
      if (cpuFor(S, 'crankSay', true, dt) > 2) cpuSay(p, 'Ready! Crank it! ' + M().key(C, 'act'), 2.4);
    } else cpuFor(S, 'crankSay', false, dt);
    return out;
  }

  cpuBrain('gumball', {
    reset(S) { S.homeX = 92; S.btnT = 0; },
    think(S, p, o, dt, info) {
      const st = info.mst;
      if (!st || !st.pc || info.intro || st.phase !== 'play') return {};
      return p.id === st.crank ? crank(st, S, p, o, dt, info) : keep(st, S, p, o, dt, info);
    },
  });
})();
