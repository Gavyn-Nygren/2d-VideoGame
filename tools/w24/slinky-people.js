// Slinky Stairs test "people": a browser script (added with page.addInitScript({ path })) that defines
// window.__slinkyPeople.drive(id, kind, P, rnd), which holds keyboard keys (P.keys) for player id like a person would.
// Kinds: idle, mash (random keys, fast), hold (▶ ▼ and the action held for ever), act (taps the action every 0.5 s and
//   nothing else), back (holds ◀), wrong (does the other job: as the flipper points and leans and presses ▼, as the
//   steerer holds and lets go of the action on a beat), kid (follows the prompts and the meter: lets go near the middle
//   of the green, about 0.07 of the meter off; points about 0.35 s late; leans most of the time; presses ▼ near the
//   landing, give or take 0.12 s), slowkid (0.12 off, 0.6 s late, looks away now and then, misses some sticks).
'use strict';
(() => {
  const KB = [{ left: 'KeyA', right: 'KeyD', up: 'KeyW', down: 'KeyS', act: 'KeyF' }, { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown', act: 'Slash' }];
  const mem = [{}, {}];
  function reset() { mem[0] = {}; mem[1] = {}; }
  const gauss = rnd => { let s = 0; for (let i = 0; i < 4; i++) s += rnd(); return (s - 2) / 0.58; };
  function wantFor(id, kind, P, rnd) {
    const G = P.G, st = G.mst, m = mem[id], want = {}, dt = P.DT;
    if (!st || !st.s || G.mode !== 'play') return want;
    const isF = id === st.flip, s = st.s, pl = st.plan;
    if (kind === 'idle') return want;
    if (kind === 'mash') { m.t = (m.t || 0) - dt; if (m.t <= 0) { m.t = 0.06 + rnd() * 0.12; m.held = {}; for (const k of ['left', 'right', 'up', 'down', 'act']) m.held[k] = rnd() < 0.45; } return Object.assign(want, m.held); }
    if (kind === 'hold') { want.right = true; want.down = true; want.act = true; return want; }
    if (kind === 'act') { m.t = (m.t || 0) - dt; if (m.t <= 0) m.t = 0.5; want.act = m.t > 0.42; return want; }
    if (kind === 'back') { want.left = true; return want; }
    if (kind === 'wrong') {
      if (isF) { m.t = (m.t || 0) - dt; if (m.t <= 0) { m.t = 0.4 + rnd(); m.v = ['left', 'right', 'down'][Math.floor(rnd() * 3)]; } want[m.v] = true; return want; }
      m.t = (m.t || 0) - dt; if (m.t <= 0) m.t = 1.3 + rnd(); want.act = m.t > 0.5; return want;
    }
    const slow = kind === 'slowkid', lag = slow ? 0.6 : 0.35;
    if (slow) { m.look = (m.look || 0) - dt; if (m.look <= -9 - rnd() * 6) m.look = 1 + rnd() * 2.5; if (m.look > 0) return want; }
    // what the plan said a moment ago (people react late)
    m.hist = m.hist || []; m.hist.push({ want: pl.want, ok: pl.pointOK, wait: pl.wait, state: s.state }); if (m.hist.length > Math.round(lag / dt)) m.hist.shift();
    const seen = m.hist[0];
    if (isF) {
      if (s.state !== 'rest') { m.holdK = null; return want; }
      if (!s.hold) {
        if (seen.state === 'rest' && seen.ok && !seen.wait && pl.target) { m.go = (m.go || 0) + dt; if (m.go > (slow ? 0.5 : 0.2)) want.act = true; }
        else m.go = 0;
        m.err = gauss(rnd) * (slow ? 0.12 : 0.07); m.early = rnd() < (slow ? 0.12 : 0.05);
        return want;
      }
      m.go = 0;
      const z = pl.zone;
      want.act = true;
      if (m.early && s.holdT > 0.3) { want.act = false; return want; }
      if (z && !pl.wait && pl.pointOK && Math.abs(s.m - (z.mc + m.err)) < 0.02) want.act = false;
      if (s.holdT > 8) want.act = false;
      return want;
    }
    // the steerer
    if (s.state === 'rest' || s.state === 'teeter') {
      if (seen.want && s.point !== seen.want && seen.state === 'rest') { if (seen.want > 0) want.right = true; else want.left = true; }
      if (s.state === 'teeter') { m.tt = (m.tt || 0) + dt; if (m.tt > (slow ? 0.55 : 0.3) + rnd() * 0.3 && !(slow && m.missTee)) want.down = true; }
      else { m.tt = 0; m.missTee = rnd() < 0.2; }
      if (pl.save && s.state === 'rest') { m.sv = (m.sv || 0) + dt; if (m.sv > lag) want.down = true; } else m.sv = 0;
      m.flyId = null;
      return want;
    }
    if (s.state === 'fly') {
      if (m.flyId !== s.fly) { m.flyId = s.fly; m.stickAt = 0.1 + gauss(rnd) * (slow ? 0.2 : 0.12); m.skipStick = rnd() < (slow ? 0.4 : 0.15); m.leanOn = rnd() < (slow ? 0.5 : 0.8); m.pressed = false; }
      if (m.leanOn && s.fly.t > lag * 0.6) { if (pl.lean > 0) want.right = true; else if (pl.lean < 0) want.left = true; }
      if (!m.skipStick && !m.pressed && pl.ttd < m.stickAt) { m.pressed = true; m.downT = 0.15; }
    }
    if ((m.downT || 0) > 0) { m.downT -= dt; want.down = true; }
    return want;
  }
  function drive(id, kind, P, rnd) {
    if (!kind) return;
    const w = wantFor(id, kind, P, rnd), K = KB[id];
    for (const k of ['left', 'right', 'up', 'down', 'act']) { if (w[k]) P.keys.add(K[k]); else P.keys.delete(K[k]); }
  }
  window.__slinkyPeople = { drive, reset };
})();
