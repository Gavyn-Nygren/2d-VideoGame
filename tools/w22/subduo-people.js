// Submarine Duo test "people": a browser script (added with page.addInitScript({ path })) that defines
// window.__subduoPeople.drive(id, kind, P, rnd), which holds keyboard keys (P.keys) for player id like a person would.
// Kinds: idle, mash (random keys), hold (▶ ▲ and the action held), act (taps the action), back (holds ◀),
//   wrong (the steerer just pushes ahead and up/down at random, the grabber grabs at nothing), kid (follows the prompts,
//   about 0.35 s late and not very exact), slowkid (0.5 s late, coarse, stops to look around now and then).
'use strict';
(() => {
  const KB = [{ left: 'KeyA', right: 'KeyD', up: 'KeyW', down: 'KeyS', act: 'KeyF' }, { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown', act: 'Slash' }];
  const mem = [{}, {}];
  function reset() { mem[0] = {}; mem[1] = {}; }
  function wantFor(id, kind, P, rnd) {
    const G = P.G, st = G.mst, M = P.MODES.subduo, m = mem[id], want = {};
    if (!st.c || G.mode !== 'play') return want;
    const dt = P.DT, isS = id === st.steer, s = st.sub, cl = st.claw;
    if (kind === 'idle') return want;
    if (kind === 'mash') { m.t = (m.t || 0) - dt; if (m.t <= 0) { m.t = 0.08 + rnd() * 0.2; m.held = {}; for (const k of ['left', 'right', 'up', 'down', 'act']) m.held[k] = rnd() < 0.4; } return Object.assign(want, m.held); }
    if (kind === 'hold') { want.right = true; want.up = true; want.act = true; return want; }
    if (kind === 'act') { m.t = (m.t || 0) - dt; if (m.t <= 0) m.t = 0.25; want.act = m.t > 0.15; return want; }
    if (kind === 'back') { want.left = true; return want; }
    if (kind === 'wrong') {
      if (isS) { want.right = true; m.t = (m.t || 0) - dt; if (m.t <= 0) { m.t = 0.5 + rnd(); m.v = rnd() < 0.5 ? 'up' : 'down'; } want[m.v] = true; }
      else { m.t = (m.t || 0) - dt; if (m.t <= 0) m.t = 0.4; want.act = m.t < 0.05; want.down = true; }
      return want;
    }
    // kid / slowkid: follow what the prompts say. A person looks, decides, presses for a moment, then looks again
    // (every 0.3-0.45 s, or 0.45-0.7 s for the slow kid), so they never steer with perfect timing.
    const slow = kind === 'slowkid', pl = M.plan(st);
    if (slow) { m.look = (m.look || 0) - dt; if (m.look <= -6 - rnd() * 6) m.look = 1 + rnd() * 2; if (m.look > 0) return want; }
    m.next = (m.next || 0) - dt;
    if (m.next <= 0) {
      m.next = slow ? 0.45 + rnd() * 0.25 : 0.3 + rnd() * 0.15;
      m.hold = {}; m.holdT = {};
      if (isS) {
        let sx = pl.sx, sy = pl.sy;
        if (sx == null || pl.why === 'none') { sx = s.x + 400; sy = s.y; }
        const dx = sx - s.x, far = Math.abs(dx) > 160, dir = dx >= 0 ? 1 : -1;
        const ly = M.lane(st, s.x, s.x + dir * (far ? 240 : Math.max(30, Math.abs(dx))), sy);
        const cap = pl.why === 'carry' || pl.why === 'pull' ? 90 : slow ? 130 : 170;
        const vxD = pl.why === 'wait' ? 0 : far ? dir * cap : clamp(dx * 1.2, -cap, cap), vyD = pl.why === 'wait' ? 0 : clamp((ly - s.y) * 1.6, -130, 130);
        const ex = vxD - s.vx, ey = vyD - s.vy, dead = slow ? 40 : 28;
        // (430 px/s² of thrust: hold about as long as the speed change needs, a bit too long or too short)
        const fudge = 0.7 + rnd() * 0.6;
        if (Math.abs(ex) > dead) { m.hold[ex > 0 ? 'right' : 'left'] = true; m.holdT.x = far && Math.abs(vxD) >= cap ? m.next : Math.abs(ex) / 430 * fudge; }
        if (Math.abs(ey) > dead) { m.hold[ey > 0 ? 'down' : 'up'] = true; m.holdT.y = Math.abs(ey) / 430 * fudge; }
        if (st.c.puffers.some(f => f.away <= 0 && f.x > s.x && f.x - s.x < 260) && rnd() < 0.15) m.hold.act = true;
      } else {
        const sh = M.shoulder(st);
        let tx = pl.tx, ty = pl.ty;
        if (tx == null || Math.hypot(tx - sh.x, ty - sh.y) > M.SUBD.reach + 40) { if (!cl.hold) { tx = sh.x + 70; ty = sh.y + 45; } }
        if (tx != null) {
          const dead = slow ? 16 : 10, ex = tx - cl.x, ey = ty - cl.y, fudge = 0.6 + rnd() * 0.6;
          if (Math.abs(ex) > dead) { m.hold[ex > 0 ? 'right' : 'left'] = true; m.holdT.x = Math.abs(ex) / 250 * fudge; }
          if (Math.abs(ey) > dead) { m.hold[ey > 0 ? 'down' : 'up'] = true; m.holdT.y = Math.abs(ey) / 250 * fudge; }
          if (cl.hold && cl.hold.kind === 'log') { m.holdT.x = m.next; m.holdT.y = m.next; }
        }
        const g = M.canGrab(st);
        if (!cl.hold && g && (g.kind === 'pearl' || pl.act === 'grab')) m.hold.act = true;
        if (cl.hold && pl.act === 'release') m.hold.act = true;
      }
      m.t0 = 0;
    }
    m.t0 = (m.t0 || 0) + dt;
    for (const k of ['left', 'right']) if (m.hold[k] && m.t0 < (m.holdT.x || 0)) want[k] = true;
    for (const k of ['up', 'down']) if (m.hold[k] && m.t0 < (m.holdT.y || 0)) want[k] = true;
    if (m.hold.act && m.t0 < 0.1) want.act = true;
    return want;
  }
  function drive(id, kind, P, rnd) {
    if (!kind) return;
    const m = mem[id];
    const want = wantFor(id, kind, P, rnd);
    void m;
    for (const k of ['left', 'right', 'up', 'down', 'act']) { const c = KB[id][k]; if (want[k]) P.keys.add(c); else P.keys.delete(c); }
  }
  window.__subduoPeople = { drive, reset, KB };
})();
