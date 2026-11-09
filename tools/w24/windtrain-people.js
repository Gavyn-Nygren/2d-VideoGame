// Wind-Up Train Ride test "people": a browser script (added with page.addInitScript({ path })) that defines
// window.__windtrainPeople.drive(id, kind, P, rnd), which holds keyboard keys (P.keys) for player id like a person would.
// Kinds: idle, mash (random keys, fast), hold (▶ ▲ and the action held), act (taps the action every 0.5 s and nothing
//   else), back (holds ◀), wrong (does the other job: as the winder runs and jumps about, as the switcher taps the action
//   on a beat and holds ▼ like a winder), kid (follows the prompts, about 0.35 s late, winds every 0.45-0.8 s, misses a
//   jump now and then), slowkid (0.6 s late, winds every 0.7-1.2 s, looks away now and then).
'use strict';
(() => {
  const KB = [{ left: 'KeyA', right: 'KeyD', up: 'KeyW', down: 'KeyS', act: 'KeyF' }, { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown', act: 'Slash' }];
  const mem = [{}, {}];
  function reset() { mem[0] = {}; mem[1] = {}; }
  function wantFor(id, kind, P, rnd) {
    const G = P.G, st = G.mst, M = P.MODES.windtrain, m = mem[id], want = {}, dt = P.DT;
    if (!st.c || G.mode !== 'play') return want;
    const isW = id === st.wind;
    if (kind === 'idle') return want;
    if (kind === 'mash') { m.t = (m.t || 0) - dt; if (m.t <= 0) { m.t = 0.06 + rnd() * 0.12; m.held = {}; for (const k of ['left', 'right', 'up', 'down', 'act']) m.held[k] = rnd() < 0.45; } return Object.assign(want, m.held); }
    if (kind === 'hold') { want.right = true; want.up = true; want.act = true; return want; }
    if (kind === 'act') { m.t = (m.t || 0) - dt; if (m.t <= 0) m.t = 0.5; want.act = m.t > 0.42; return want; }
    if (kind === 'back') { want.left = true; return want; }
    if (kind === 'wrong') {
      if (isW) { m.t = (m.t || 0) - dt; if (m.t <= 0) { m.t = 0.4 + rnd(); m.v = rnd() < 0.5 ? 'left' : 'right'; } want[m.v] = true; return want; }
      m.t = (m.t || 0) - dt; if (m.t <= 0) m.t = 0.5; want.act = m.t > 0.44; want.down = rnd() < 0.5; return want;
    }
    // kid / slowkid: follow what the prompts and the HUD say, a little late
    const slow = kind === 'slowkid', pl = M.plan(st), lag = slow ? 0.6 : 0.35;
    if (slow) { m.look = (m.look || 0) - dt; if (m.look <= -7 - rnd() * 6) m.look = 1 + rnd() * 2; if (m.look > 0) return want; }
    // what the plan said a moment ago (people react late)
    m.hist = m.hist || []; m.hist.push({ brake: pl.brake || pl.hold, act: pl.act }); if (m.hist.length > Math.round(lag / dt)) m.hist.shift();
    const seen = m.hist[0];
    if (isW) {
      const tr = st.tr;
      m.gapT = (m.gapT || 0) - dt;
      if (seen.brake || (m.brakeHold || 0) > 0) { want.down = true; m.brakeHold = seen.brake ? 0.3 : (m.brakeHold || 0) - dt; }
      if (m.gapT <= 0 && (tr.spring < 0.93 || rnd() < 0.15)) { m.gapT = slow ? 0.7 + rnd() * 0.5 : 0.45 + rnd() * 0.35; m.press = 0.06; }
      if ((m.press || 0) > 0) { m.press -= dt; want.act = true; }
      return want;
    }
    const s = st.sw, F = M.WTR.FLOOR, tr = st.tr;
    m.next = (m.next || 0) - dt;
    if (m.next <= 0) {
      m.next = slow ? 0.45 + rnd() * 0.25 : 0.3 + rnd() * 0.15;
      let tx = tr.x + 150;
      if (pl.job && pl.rx != null && pl.job.x - tr.x < 1000) tx = pl.rx;
      m.dir = Math.abs(tx - s.x) > (slow ? 26 : 16) ? Math.sign(tx - s.x) : 0;
      m.ty = pl.job && pl.ry != null ? pl.ry : F;
    }
    if (m.dir > 0) want.right = true; else if (m.dir < 0) want.left = true;
    if (s.ground) {
      const look = slow ? 22 + rnd() * 30 : 28 + rnd() * 20, ahead = s.x + (m.dir || 1) * look;
      const footing = M.surfaces(st, ahead).some(q => Math.abs(q.y - s.feet) < 10);
      if (m.dir && !footing && rnd() < (slow ? 0.2 : 0.5)) m.jump = 0.4;
      if (!st.sleepy) for (const b of st.c.bunnies) if ((b.x - s.x) * (m.dir || 1) > 0 && Math.abs(b.x - s.x) < 80 && rnd() < (slow ? 0.03 : 0.08)) m.jump = 0.4;
      if (m.ty < s.feet - 24 && Math.abs(s.x - (pl.rx || s.x)) < 100 && rnd() < 0.05) m.jump = 0.4;
    }
    if ((m.jump || 0) > 0) { m.jump -= dt; want.up = true; }
    if (seen.act && pl.act) { m.actT = (m.actT || 0) - dt; if (m.actT <= 0) { m.actT = 0.3; want.act = true; } }
    return want;
  }
  function drive(id, kind, P, rnd) {
    if (!kind) return;
    const w = wantFor(id, kind, P, rnd), K = KB[id];
    for (const k of ['left', 'right', 'up', 'down', 'act']) { if (w[k]) P.keys.add(K[k]); else P.keys.delete(K[k]); }
  }
  window.__windtrainPeople = { drive, reset };
})();
