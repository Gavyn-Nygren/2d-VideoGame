/* Pip & Bo - Computer partner: hot potato volleyball. */
'use strict';

(() => {
  /* Hot Potato Volleyball is head-to-head: the computer plays against you. It watches the potato a moment late.
     - Reading the potato: it flies the potato ahead with the level's own physics (MODES.potato.potPhys) from what it saw
       a moment ago, about 2.5 s ahead. The flight is only worked out again when the potato does something new (a hit, a
       bonk, the net), so it is cheap.
     - Where to meet it: the first point on its own half it can get to in time, low enough to hit standing up (or, when
       it likes, high near the net for a jump SPIKE). With a red-hot potato it only takes points before the first
       landing. Nothing coming its way: it waits in the middle of its half.
     - The swing: it taps when the potato is in reach (a bump), or winds up early enough to have the power it wants
       and lets go as the potato comes into reach. It holds toward the net (deep) or back (short) to aim away from you.
     - Playing the fuse (the fuse is on the potato and in the HUD): with a few seconds left it picks the shot that
       crosses before the BOOM but leaves you too little time to send it back, or one that hands you the potato with
       too much fuse to win it back right away (see chooseShot).
     - Set and spike (normal and hard, now and then): ▼ + hit pops the potato up by the net, then it jumps and spikes.
     Skill: easy sees late, often notices a potato coming over the net a moment late (like a kid looking elsewhere),
     misjudges where it comes down (and fixes it late), swings too early now and then, stumbles while chasing, mostly
     bumps and never aims or plays the fuse; hard sees quickly, picks the shot that is
     hardest for you to reach, spikes whenever it can and always plays the fuse. */
  const SK = s => ({
    lag: s > 0.9 ? 0.12 : 0.42 - 0.35 * s, // how late it sees the potato: easy 0.30 s, normal 0.18 s, hard 0.12 s
    err: 4 + 70 * (1 - s),                // how far off its first guess of the landing spot is (px, shrinks as it comes)
    resid: 0.9 * (1 - s) * (1 - s),       // ...down to this part of it (easy can end up a step off)
    whiff: 0.01 + 0.55 * (1 - s) * (1 - s), // chance a swing goes off too early (easy 24 %, normal 6 %, hard 1 %)
    power: 0.08 + 0.85 * s,               // chance it winds up a power shot when there is time
    aim: s * s,                           // chance it aims a shot away from you on purpose
    spike: s < 0.5 ? 0.04 : s * s,        // chance it jumps for a spike it can reach (easy 4 %, normal 49 %, hard 100 %)
    air: s >= 0.6,                        // jumps to hit a high potato early (not only for spikes)
    setSpike: s > 0.9 ? 0.3 : s > 0.6 ? 0.1 : 0, // chance it sets for its own spike (fuse long)
    dawdle: 0.5 * (1 - s),                // a short stop this often per second while nothing is coming (none on hard)
    fuse: s < 0.5 ? 0 : s < 0.9 ? 0.65 : 1, // chance it plays the fuse on a shot (see chooseShot)
    stumble: 0.9 * (1 - s) * (1 - s),     // easy stops for a moment while chasing this often per second
    late: s < 0.5 ? 0.4 : s < 0.9 ? 0.06 : 0, // chance it notices a potato coming over the net late (easy 40 %)
  });
  const HOR = 2.5;                        // seconds of flight it looks ahead
  const K = () => MODES.potato.K;
  const fixRnd = () => 0.75;              // the net-top nudge in its guesses always rolls the same way
  const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 0.5;

  // what it sees of a potato (cpuLag keeps these a moment)
  const look = pt => ({ x: pt.x, y: pt.y, vx: pt.vx, vy: pt.vy, r: pt.r, g: pt.g, rest: pt.rest, hover: pt.hover, alive: pt.alive,
    fuse: pt.fuse, setUsed: pt.setUsed.slice(), ramp: pt.ramp, tMul: pt.tMul, cd: pt.cd.slice(), cross: pt.crossings, t: G.time });
  // the potato's flight from a seen state: positions once per physics step
  function predict(s) {
    const n = Math.round(HOR / DT), xs = new Float32Array(n + 1), ys = new Float32Array(n + 1);
    const q = { x: s.x, y: s.y, vx: s.vx, vy: s.vy, r: s.r, g: s.g, rest: s.rest, hover: false, alive: true };
    for (let i = 0; i <= n; i++) { xs[i] = q.x; ys[i] = q.y; if (i < n) MODES.potato.potPhys(q, DT, null, fixRnd); }
    return { t0: s.t, n, xs, ys, r: s.r };
  }
  // the flight for potato i: the old one while the potato still follows it, else a new one
  function pathFor(st, i, s) {
    const P = st.paths[i];
    if (P) {
      const k = Math.round((s.t - P.t0) / DT);
      if (k >= 0 && k <= P.n - 30 && Math.abs(P.xs[k] - s.x) < 1.5 && Math.abs(P.ys[k] - s.y) < 1.5) return P;
    }
    const Q = st.paths[i] = predict(s);
    Q.id = st.pathN = (st.pathN || 0) + 1;
    return Q;
  }
  // the time from standing still to the ground at body top y (holding jump all the way up): the rising root
  function jumpTime(yb) {
    const y0 = K().floorY - PH, d = PHYS.jumpV * PHYS.jumpV - 2 * PHYS.g * (y0 - yb);
    return d < 0 ? -1 : (PHYS.jumpV - Math.sqrt(d)) / PHYS.g;
  }

  /* where to meet one potato: { t (s from now), x, y, kind: 'ground' | 'jump', spike, M (s to get there) } or null */
  function meet(st, p, P, s, sk, mst, opts) {
    const k = p.id, KK = K(), fwd = k === 0 ? 1 : -1, help = (mst.help ? mst.help[k] : 0) * KK.helpReach;
    const j = Math.max(0, Math.round((G.time - P.t0) / DT)), r = P.r;
    const xmin = k === 0 ? KK.left + PW / 2 + 1 : KK.netX + KK.netHalf + PW / 2 + 1;
    const xmax = k === 0 ? KK.netX - KK.netHalf - PW / 2 - 1 : KK.right - PW / 2 - 1;
    const reach = PW / 2 + KK.reachX + help + r - 8;
    const yG = KK.floorY - PH - KK.reachUp - help - r + 4;      // standing reach (potato centre at or below)
    const cx = cpuCx(p);
    const fuseAt = t => s.fuse - (G.time - s.t) - t, cdT = s.cd[k] - (G.time - s.t);
    // the first landing (red-hot: it must be hit before that)
    let land = -1;
    for (let i = j; i <= P.n; i++) if (P.ys[i] >= KK.floorY - r - 0.5) { land = i; break; }
    const hotLand = land >= 0 && fuseAt((land - j) * DT) <= KK.hotAt;
    let g0 = null, s0 = null, a0 = null, late = null;
    for (let i = j; i <= P.n; i++) {
      const x = P.xs[i], y = P.ys[i];
      if (potSide(x) !== k || Math.abs(x - KK.netX) < 1) continue;
      if (hotLand && i > land) break;
      const t = (i - j) * DT, sx = clamp(x - fwd * 6, xmin, xmax);
      if (Math.abs(x - sx) > reach || t < cdT) continue;
      const d = Math.abs(sx - cx), back = Math.sign(sx - cx) !== Math.sign(p.vx) ? Math.abs(p.vx) / PHYS.fricG : 0;
      const M = d < 3 ? 0 : d / PHYS.maxRun + 0.08 + back;
      if (y >= yG) {
        if (M <= t + 0.02) { if (!g0) g0 = { t, x, y, sx, kind: 'ground', M, i }; }
        else if (!late) late = { t, x, y, sx, kind: 'ground', M, i };
      } else if (opts.jump && p.grounded) {
        const yb = y + r + KK.reachUp + help - 10, tj = yb < KK.floorY - PH - 108 ? -1 : jumpTime(yb);
        if (tj < 0 || tj > t || M > t + 0.03) continue;
        const spike = y < potNetTop() - 8 && Math.abs(x - KK.netX) < KK.spikeZone - 10;
        if (spike && !s0) s0 = { t, x, y, sx, kind: 'jump', spike, M, tj, i };
        if (!spike && !a0) a0 = { t, x, y, sx, kind: 'jump', spike, M, tj, i };
      }
      if (g0 && (s0 || !opts.jump)) break;
    }
    if (s0 && opts.spike) return s0;
    if (opts.air && a0 && (!g0 || hotLand || a0.t + 0.25 < g0.t)) return a0;
    if (g0) return g0;
    if (s0 && hotLand) return s0;
    return a0 || late;
  }

  /* the shot: { mode: 'tap' | 'pow' | 'set', P (power), aim (+1 deep, -1 short) }.
     Every shot it could make is scored with the level's own shot numbers: when the potato crosses the net (Tc), when you
     could reach it at the earliest, and the fuse you would have then. Playing the fuse (normal sometimes, hard always,
     with under 5.5 s left) it picks the best fuse score: a shot that crosses before the BOOM and leaves you no time to
     answer, or hands you the potato with 1.5-3 s left (too much to win it back at once, and your answer then comes
     back to it in time for its own winning shot). Otherwise it picks the shot that is hardest for you to reach (or
     just bumps it, on easy). */
  function chooseShot(st, p, o, sk, plan, s, mst, info) {
    const KK = K(), k = p.id, half = KK.right - KK.netX - KK.netHalf;
    const fuseC = s.fuse - (G.time - s.t) - plan.t;
    const oD = Math.abs(cpuCx(o) - KK.netX), dC = Math.max(1, Math.abs(plan.x - KK.netX));
    const ramp = s.ramp, ramp2 = Math.min(KK.rampMax, ramp + KK.rampPer);
    // how you could answer a shot landing L px past the net after T s: whether you get there before it lands, when you
    // hit it, the fuse you would have then, and how quickly your answer could cross back
    const yours = (L, T, Tc, f) => {
      const run = Math.max(0, Math.abs(L - oD) - 35) / PHYS.maxRun + 0.25, reach = run <= T - 0.1;
      const Te = reach ? Math.max(T - 0.15, run) : run, fo = f - Te - (reach ? 0 : KK.sizzle);
      const qc = KK.driveT * (1 - ramp2) * s.tMul * (L / (L + 150));
      // fuse play: BOOM on its own side (lost), a red-hot landing or no time for you to answer (won), or the fuse you
      // get it with: about 0.4-1.5 s lets you win it back (bad), 1.5-3 s means your answer reaches it in that window (good)
      let fs;
      if (Tc + 0.1 >= f) fs = 100;
      else if (!reach && f - T <= KK.hotAt) fs = -10;
      else if (fo < qc + 0.1) fs = -5;
      else if (fo < 1.5) fs = 5;
      else if (fo < 3.2) fs = 0;
      else fs = 2;
      return { run, Te, fs };
    };
    const opts = [];
    const add = (mode, P, aim, L, T, delay = 0) => {
      const Tc = delay + T * (delay ? 1 : dC / (dC + L)), y = yours(L, delay + T, Tc, fuseC);
      opts.push({ mode, P, aim, Tc, T, fs: y.fs, press: T - y.run });
    };
    if (plan.spike) {
      for (const aim of [-1, 0, 1]) {
        const L = clamp(KK.spikeD0 + aim * KK.aimSpike, KK.spikeMin, half - s.r - 8);
        add('tap', 0, aim, L, KK.spikeT0 * (1 - ramp) * s.tMul);
      }
    } else {
      const ct = KK.chargeT * Math.pow(KK.helpCharge, mst.help ? mst.help[k] : 0), spare = plan.t - plan.M;
      for (const P of [0, 0.5, 1]) {
        if (P > 0 && (spare < KK.tapWin + ct * P + 0.08 || plan.kind !== 'ground')) continue;
        for (const aim of [-1, 0, 1]) {
          const L = clamp(KK.lobD + (KK.deepD - KK.lobD) * P + (aim > 0 ? KK.aimLong : aim < 0 ? -KK.aimShort : 0), KK.minD, KK.maxD) * half;
          const T = (KK.lobT + (KK.driveT - KK.lobT) * P) * (1 - ramp) * s.tMul * (aim > 0 ? 1 + KK.aimT * KK.aimLong : aim < 0 ? 1 - KK.aimTS * KK.aimShort : 1);
          add(P > 0 ? 'pow' : 'tap', P, aim, L, T);
        }
      }
    }
    // a set by the net for its own spike: about a second later a spike crosses at once and lands close to the net
    const canSet = plan.kind === 'ground' && !plan.spike && !s.setUsed[k] && dC < 180 && plan.t - plan.M > 0.05 && fuseC > KK.hotAt + 1.3;
    if (canSet) add('set', 0, 0, KK.spikeD0, KK.spikeT0 * (1 - ramp2) * s.tMul, 1.05);
    // playing the fuse: the shot with the best fuse score (the hardest to reach among equals)
    if (fuseC < 5.5 && Math.random() < sk.fuse) return opts.reduce((a, b) => (b.fs < a.fs || (b.fs === a.fs && b.press < a.press - 0.02) ? b : a));
    // set and spike now and then while the fuse is long
    if (canSet && fuseC > 6 && Math.random() < sk.setSpike) return opts.find(q => q.mode === 'set');
    const plain = opts.filter(q => q.mode !== 'set');
    if (plan.spike) return Math.random() < sk.aim ? plain.reduce((a, b) => (b.press < a.press ? b : a)) : plain[1];
    const aimIt = Math.random() < sk.aim, powIt = Math.random() < sk.power;
    const pw = plain.filter(q => q.P > 0), pool = powIt && pw.length ? pw : plain.filter(q => q.P === 0);
    // aiming: the shot that is hardest to reach; not aiming: a straight one (easy now and then holds a direction anyway)
    if (aimIt) return pool.reduce((a, b) => (b.press < a.press ? b : a));
    const straight = pool.filter(q => q.aim === 0), pick = straight[Math.floor(Math.random() * straight.length)];
    return { mode: pick.mode, P: pick.P, aim: Math.random() < 0.12 * (1 - info.skill) ? (Math.random() < 0.5 ? -1 : 1) : 0 };
  }

  // is a potato inside p's swing box a few steps from now (p standing where it is)?
  function soon(p, P, steps, pt) {
    if (!pt || pt.cd[p.id] > 0) return false;
    const hb = potHitbox(p), j = Math.round((G.time - P.t0) / DT);
    for (let i = Math.max(0, j); i <= Math.min(P.n, j + steps); i++) {
      const x = P.xs[i], y = P.ys[i];
      if (potSide(x) !== p.id) continue;
      const hx = clamp(x, hb.x0, hb.x1), hy = clamp(y, hb.y0, hb.y1);
      if ((x - hx) ** 2 + (y - hy) ** 2 <= P.r * P.r) return true;
    }
    return false;
  }

  cpuBrain('potato', {
    noIdleStop: true, // the level has no idle pause: a match against nobody plays out and ends (the computer wins)
    reset(st) { st.pots = null; },
    think(st, p, o, dt, info) {
      const out = {}, M = G.match, mst = info.mst;
      if (!M || !mst || !mst.pots || !mst.sw) return out;
      const sk = SK(info.skill), KK = K(), k = p.id, fwd = k === 0 ? 1 : -1, sw = mst.sw[k];
      // a new round (or a replay): forget the old potatoes
      if (st.pots !== mst.pots) {
        st.pots = mst.pots; st.paths = []; st.shot = null; st.shotFor = ''; st.hold = 0; st.err = 0; st.errFor = 0;
        st.dawT = 0; st.whiff = null; st.spikeFor = 0; st.jumped = false; st.forceSpike = false; st.lateFor = []; st.lateT = 0;
        for (const key in st) if (key.startsWith('_lag_')) delete st[key];
      }
      if (M.phase !== 'live') { st.hold = 0; return out; }
      if (!p.alive) return out;
      // what it sees of each potato (a moment late), and the flight from there
      let plan = null, pi = -1;
      const views = mst.pots.map((pt, i) => cpuLag(st, 'pt' + i, look(pt), sk.lag));
      for (let i = 0; i < mst.pots.length; i++) {
        const s = views[i];
        if (!s.alive || !mst.pots[i].alive) { st.paths[i] = null; continue; }
        const P = pathFor(st, i, s);
        // one roll per flight: does it go for a spike on this one? (always right after its own set)
        if (st.spikeFor !== P.id) { st.spikeFor = P.id; st.spikeGo = st.forceSpike || Math.random() < sk.spike; }
        const m = meet(st, p, P, s, sk, mst, { jump: sk.air || st.spikeGo, spike: st.spikeGo, air: sk.air });
        if (m && (!plan || m.t < plan.t)) { plan = m; plan.P = P; plan.s = s; pi = i; }
      }
      if (st.forceSpike && !mst.pots.some(q => q.alive && potSide(q.x) === k)) st.forceSpike = false;
      const swinging = sw.s === 'tap' || sw.s === 'pow';

      /* ---- moving ---- */
      let tx;
      if (plan) {
        // its guess of the spot is off at first (easy most) and gets better as the potato comes
        const key = plan.P.id;
        if (st.errFor !== key) { st.errFor = key; st.err = gauss() * sk.err; }
        tx = plan.sx + st.err * Math.max(sk.resid, clamp((plan.t - 0.2) / 0.8, 0, 1));
        // a potato that just came over the net: easy sometimes notices it late (like a kid looking elsewhere)
        if (st.lateFor[pi] !== plan.s.cross) { st.lateFor[pi] = plan.s.cross; st.lateT = Math.random() < sk.late ? 0.3 + Math.random() * 0.5 : 0; }
        if (st.lateT > 0) { st.lateT -= dt; tx = cpuCx(p); }
        // easy stumbles now and then on the way
        else if (st.dawT > 0) { st.dawT -= dt; tx = cpuCx(p); }
        else if (cpuChance(sk.stumble, dt)) st.dawT = 0.12 + Math.random() * 0.12;
      } else {
        // nothing coming: back to the middle of its half (a little toward the net)
        const mid = k === 0 ? (KK.left + KK.netX) / 2 + 20 : (KK.netX + KK.right) / 2 - 20;
        tx = mid;
        if (st.dawT > 0) { st.dawT -= dt; tx = cpuCx(p); }
        else if (cpuChance(sk.dawdle, dt)) st.dawT = 0.2 + Math.random() * 0.5;
      }
      const lim0 = k === 0 ? KK.left + PW / 2 + 1 : KK.netX + KK.netHalf + PW / 2 + 1;
      const lim1 = k === 0 ? KK.netX - KK.netHalf - PW / 2 - 1 : KK.right - PW / 2 - 1;
      tx = clamp(tx, lim0, lim1);
      cpuSeek(out, p, tx, 3);
      // the jump for a jump hit: leave the ground just in time to meet it at the top of the swing box
      if (p.grounded) st.jumped = false;
      if (plan && plan.kind === 'jump' && p.grounded && !CPU.last[k].jump && plan.t <= plan.tj + DT * 0.6) { out.jump = true; st.jumped = true; }
      if (!p.grounded && st.jumped && p.vy < 0) out.jump = true;

      /* ---- swinging ---- */
      const P = plan && plan.P, s = plan && plan.s;
      const shotKey = plan ? plan.P.id + ':' + plan.kind : '';
      if (plan && st.shotFor !== shotKey && !swinging && sw.s !== 'wind' && (p.grounded || !st.shot)) {
        st.shotFor = shotKey;
        st.shot = chooseShot(st, p, o, sk, plan, s, mst, info);
        st.whiff = Math.random() < sk.whiff ? 0.17 + Math.random() * 0.2 : null;
      }
      const shot = st.shot;
      const inReach = potInReach(p, mst) || (P && soon(p, P, 2, mst.pots[pi]));
      const ready = sw.s === 'idle' && p.stun <= 0;
      if (sw.s === 'wind' || (sw.s === 'tap' && st.hold > 0)) {
        // winding up: let go as the potato comes into reach (or when the plan is gone for a while)
        st.hold += dt;
        out.act = !(inReach || st.hold > 2.2 || (!plan && st.hold > 0.6));
        if (!out.act) st.hold = 0;
      } else {
        st.hold = 0;
        if (plan && shot && ready) {
          if (shot.mode === 'pow' && st.lateT <= 0 && plan.t <= KK.tapWin + KK.chargeT * Math.pow(KK.helpCharge, mst.help[k]) * shot.P + 0.03
              && Math.abs(cpuCx(p) - tx) < 30) { out.act = true; st.hold = dt; }
          else if (st.whiff !== null && plan.t <= st.whiff && plan.t > 0.12) { out.act = 'tap'; st.whiff = null; }
          else if (inReach) out.act = 'tap';
        }
      }
      // aim and ▼ while the swing can connect
      if ((swinging || out.act === 'tap' || (out.act === false && st.hold === 0 && sw.s === 'wind')) && shot) {
        if (shot.mode === 'set') { out.down = true; out.left = out.right = false; }
        else if (shot.aim) { out.left = shot.aim * fwd < 0; out.right = shot.aim * fwd > 0; }
        else if (inReach) { out.left = out.right = false; }
      }
      if (shot && shot.mode === 'set' && swinging) st.forceSpike = true;
      // the person walked off and the potato sits on their side: once a match it says what to do
      if (!info.partnerCpu && info.partnerIdle > 10 && !st.said && mst.pots.some(q => q.alive && potSide(q.x) === o.id)) { st.said = true; cpuSay(p, 'Hit it back!'); }
      return out;
    },
  });
})();
