/* Pip & Bo - Computer partner brain for 16-3 Chocolate River Raft. */
'use strict';

(() => {
  /* 16-3 Chocolate River Raft (MODES.raft): the level says who paddles (G.mst.pad) and who hooks (G.mst.hook); the
     computer does the job it has and reads what that job needs from MODES.raft.needs (the same thing the prompts read):
     where across the river to be, how fast, where to stop, and what the hook should go for.
     PADDLER: steers toward the wanted line (▲ ▼, letting go early so it doesn't overshoot), keeps a speed with ▶ / ◀
     (◀ against the current to stop short of a log jam, beside a toffee ring or at the pier), lines up the fudge ramp and
     paddles hard (strokes) just before it, and strokes its way out of a whirlpool it drifts into. It slows down beside
     candy so the hook can get it (more for a person on the hook).
     HOOKER: moves the hook tip (braking early so it stops on target, leading a moving target a little) to what the job
     needs: the toffee ring (and holds the action), the log jam (shoves), whatever is on a collision course (shoves),
     the nearest candy in reach (hooks); otherwise it rests the hook ahead, on the side of the next candy.
     With a person partner: the computer paddler waits at jams and gates and says what the hook should do; the computer
     hooker says where the raft should go (the ring, the pier, the ramp, closer to candy). A person who takes the other
     job's keys first simply gets followed: the needs change and the computer does what the new ones say. A person who
     does nothing: the raft never gets past the first log jam (computer paddler) or the first dock (computer hooker).
     Team levels always run it at full skill; skill only sets how quickly it reacts. */
  const M = () => MODES.raft;
  const RF = () => MODES.raft.RAFT;

  /* ---------- the paddler ---------- */
  function paddle(st, S, p, o, dt, info) {
    const out = {}, R = RF(), b = st.raft, nd = M().needs(st), human = !info.partnerCpu, Hk = o.id;
    const speed = Math.hypot(b.vx, b.vy);
    // across the river: steer to the wanted line (predicting the drift so it settles instead of swinging)
    if (nd.ty != null) {
      const e = nd.ty - (b.y + b.vy * 0.42), dz = nd.pad === 'ramp' ? 4 : nd.pad === 'hold' ? 8 : 12;
      if (e > dz) out.down = true; else if (e < -dz) out.up = true;
    }
    // along it: a speed, or a stop at a spot
    let vWant = nd.vx != null ? nd.vx : M().cs(st, b.x) + 80;
    if (nd.stopX != null) {
      const d = nd.stopX - b.x;
      vWant = Math.sign(d) * Math.min(Math.sqrt(2 * 170 * Math.abs(d)), 140);
      if (Math.abs(d) < 10) vWant = 0;
    }
    // slow down beside candy the hook is going for (a person needs a bit longer)
    if (nd.hook === 'candy' && nd.pad !== 'ramp' && nd.target) {
      const ax = nd.target.x - b.x;
      if (ax > -40 && ax < 160) vWant = Math.min(vWant, M().cs(st, b.x) * (human ? 0.15 : 0.6));
      if (human && info.partnerIdle < 10 && ax < 120) cpuSay(p, (nd.candy && nd.candy.kind === 'gummy' ? 'A gummy bear! Hook it ' : 'Hook the candy! ') + M().key(Hk, 'act'), 2);
    }
    if (nd.hook === 'shove' && human && nd.threat && nd.threat.ax < 200) vWant = Math.min(vWant, M().cs(st, b.x) * 0.3);
    if (b.vx < vWant - 12) out.right = true;
    else if (b.vx > vWant + 12) out.left = true;
    // the fudge ramp: strokes straight on, right before it
    if (nd.pad === 'ramp' && nd.stroke && Math.abs(nd.ty - b.y) < 22 && Math.abs(b.vy) < 60) {
      out.right = true; out.left = false; out.up = out.down = false;
      if (b.strokeCD <= 0) out.act = 'tap';
    }
    // drifting into a whirlpool's middle: stroke out to the side
    for (const pl of st.c.pools) {
      const py = M().ly(st, pl.x, pl.l), d = Math.hypot(b.x - pl.x, b.y - py);
      if (d < pl.R * 0.75) {
        const s = nd.ty != null ? Math.sign(nd.ty - py) || 1 : (b.y >= py ? 1 : -1);
        out.up = s < 0; out.down = s > 0; out.right = true; out.left = false;
        if (b.strokeCD <= 0) out.act = 'tap';
      }
    }
    // stuck against something with nothing to wait for: back off and go round
    const waiting = nd.pad === 'jam' || nd.pad === 'hold' || nd.pad === 'gate' || nd.pad === 'dock';
    if (b.x > (S.bestX == null ? -1e9 : S.bestX) + 25) { S.bestX = b.x; S.progT = 0; } else if (!waiting) S.progT = (S.progT || 0) + dt;
    if (S.progT > 4 || S.unstick > 0) {
      if (!(S.unstick > 0)) { S.unstick = 0.8; S.unDir = Math.random() < 0.5 ? -1 : 1; }
      S.unstick -= dt; S.progT = 0;
      out.left = true; out.right = false; out.up = S.unDir < 0; out.down = S.unDir > 0;
    }
    // with a person on the hook: say what the hook has to do (once they've had a moment)
    if (human && info.partnerIdle < 20) {
      if (S.hookNeed !== nd.hook) { S.hookNeed = nd.hook; S.hookNeedT = 0; }
      S.hookNeedT += dt;
      const slow = S.hookNeedT > 2.5;
      if (nd.hook === 'jam' && slow) cpuSay(p, 'Shove the log jam with the hook! ' + M().key(Hk, 'act'), 2.2);
      else if (nd.hook === 'ring' && slow) cpuSay(p, 'Hook the ring and hold ' + M().key(Hk, 'act') + '!', 2.2);
      else if (nd.hook === 'shove' && slow) cpuSay(p, 'Shove it out of the way!', 2.2);
    }
    void speed;
    return out;
  }

  /* ---------- the hooker ---------- */
  // press toward a hook position (world px), braking early to stop on it; returns how far off it is
  function hookTo(out, st, tx, ty, dz) {
    const R = RF(), b = st.raft, hk = st.hk, reach = M().reach(st) - 2;
    let ox = tx - b.x, oy = ty - b.y;
    const d = Math.hypot(ox, oy);
    if (d > reach) { ox *= reach / d; oy *= reach / d; }
    const ex = ox - hk.ox, ey = oy - hk.oy, acc = R.hookAcc;
    const stopX = Math.sign(hk.vx) === Math.sign(ex) ? hk.vx * hk.vx / (2 * acc) : 0;
    const stopY = Math.sign(hk.vy) === Math.sign(ey) ? hk.vy * hk.vy / (2 * acc) : 0;
    if (Math.abs(ex) > dz + stopX) { out.right = ex > 0; out.left = ex < 0; }
    if (Math.abs(ey) > dz + stopY) { out.down = ey > 0; out.up = ey < 0; }
    return Math.hypot(tx - hk.wx, ty - hk.wy);
  }
  function hook(st, S, p, o, dt, info) {
    const out = {}, R = RF(), b = st.raft, nd = M().needs(st), hk = st.hk, human = !info.partnerCpu, P = o.id;
    const react = 0.05 + (1 - info.skill) * 0.25;
    const settle = (key, cond) => cpuFor(S, key, cond, dt) > react;
    const catchR = st.goldHook ? R.catchRGold : R.catchR;
    const t = nd.target;
    // lead a target a little: things drift past the raft
    const lead = (x, vx) => x + (vx - b.vx) * 0.12;
    switch (nd.hook) {
      case 'ring': {
        const d = hookTo(out, st, t.x, t.y, 3);
        if (d < (nd.gate.gold ? R.ringRGold : R.ringR) + 4) out.act = true;
        break;
      }
      case 'jam': {
        const d = hookTo(out, st, t.x - 6, t.y, 4);
        if (settle('gJ', d < 26) && hk.cd <= 0) out.act = 'tap';
        break;
      }
      case 'shove': {
        const ob = nd.obj, kind = nd.threat.kind;
        const vx = kind === 'rock' ? 0 : M().cs(st, t.x) * (kind === 'log' ? 0.4 : 0.38);
        const d = hookTo(out, st, lead(t.x, vx), t.y, 4);
        if (settle('gS', d < (nd.threat.r || 14) + 12) && hk.cd <= 0) out.act = 'tap';
        void ob;
        break;
      }
      case 'candy': {
        const cd = nd.candy, vx = cd.pool ? 0 : M().cs(st, cd.x) * cd.drift;
        const d = hookTo(out, st, lead(t.x, vx), t.y, 3);
        if (d < catchR + cd.r - 6 && hk.cd <= 0) out.act = 'tap';
        break;
      }
      default: {
        // ready: ahead of the raft, on the side of the next candy coming
        let best = null;
        for (const cd of st.c.candy) if (!cd.got && !cd.gone && cd.x > b.x && cd.x < b.x + 600 && (!best || cd.x < best.x)) best = cd;
        let ty = b.y, tx = b.x + 100;
        if (best) { const cp = M().candyPos(st, best); ty = b.y + clamp(cp.y - b.y, -90, 90); }
        hookTo(out, st, tx, ty, 10);
      }
    }
    // with a person paddling: say where the raft has to go
    if (human && info.partnerIdle < 20 && st.state === 'ride' && !st.air) {
      if (S.padNeed !== nd.pad) { S.padNeed = nd.pad; S.padNeedT = 0; }
      S.padNeedT += dt;
      const slow = S.padNeedT > 2.5, speed = Math.hypot(b.vx, b.vy);
      if (nd.pad === 'gate' && slow) cpuSay(p, 'Paddle me over to the toffee ring!', 2.2);
      else if (nd.pad === 'hold' && speed > R.ringStill && nd.hook === 'ring') cpuSay(p, 'Hold still! ' + M().key(P, 'left') + ' against the current', 2.2);
      else if (nd.pad === 'dock' && slow) cpuSay(p, 'Dock at the pier! Up by the top bank', 2.2);
      else if (nd.pad === 'ramp' && nd.ramp.x0 - b.x < 700) cpuSay(p, nd.stroke ? 'Paddle hard! ' + M().key(P, 'act') : 'Line up with the fudge ramp!', 2);
      else if (nd.pad === 'candy' && slow && nd.far) cpuSay(p, 'Closer to the candy, please!', 2);
    }
    return out;
  }

  cpuBrain('raft', {
    reset(S) { S.bestX = null; S.progT = 0; S.unstick = 0; },
    think(S, p, o, dt, info) {
      const st = info.mst;
      if (!st || !st.raft || info.intro || st.state !== 'ride') return {};
      return p.id === st.pad ? paddle(st, S, p, o, dt, info) : hook(st, S, p, o, dt, info);
    },
  });
})();
