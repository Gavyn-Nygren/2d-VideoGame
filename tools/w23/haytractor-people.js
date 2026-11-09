// Tractor & Trailer test "people": a browser script (added with page.addInitScript({ path })) that defines
// window.__haytPeople.drive(id, kind, P, rnd), which holds keyboard keys (P.keys) for player id like a person would.
// Kinds: idle, mash (random keys), hold (▶ ▲ and the action held), act (taps the action), back (holds ◀),
//   wrong (the driver floors it and never honks, the catcher stands still), racer (the driver floors it but honks; the
//   catcher plays like a kid), kid (follows the prompts about 0.3 s late and not very exact, forgets a bump now and then,
//   holds the load on half the bumps), slowkid (0.5 s late, coarse, drives slowly, stops to look around now and then).
'use strict';
(() => {
  const KB = [{ left: 'KeyA', right: 'KeyD', up: 'KeyW', down: 'KeyS', act: 'KeyF' }, { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown', act: 'Slash' }];
  const mem = [{}, {}];
  function reset() { mem[0] = {}; mem[1] = {}; }
  function wantFor(id, kind, P, rnd) {
    const G = P.G, st = G.mst, M = P.MODES.haytractor, m = mem[id], want = {};
    if (!st.c || G.mode !== 'play') return want;
    const dt = P.DT, isD = id === st.drive, tr = st.tr, c = st.cat;
    if (kind === 'idle') return want;
    if (kind === 'mash') { m.t = (m.t || 0) - dt; if (m.t <= 0) { m.t = 0.08 + rnd() * 0.2; m.held = {}; for (const k of ['left', 'right', 'up', 'down', 'act']) m.held[k] = rnd() < 0.4; } return Object.assign(want, m.held); }
    if (kind === 'hold') { want.right = true; want.up = true; want.act = true; return want; }
    if (kind === 'act') { m.t = (m.t || 0) - dt; if (m.t <= 0) m.t = 0.25; want.act = m.t > 0.15; return want; }
    if (kind === 'back') { want.left = true; return want; }
    if (kind === 'wrong') { if (isD) want.right = true; return want; }
    const slow = kind === 'slowkid', pl = M.plan(st);
    if (kind === 'racer' && isD) { want.right = true; if (pl.honk) { m.h = (m.h || 0) + dt; want.act = m.h % 0.5 < 0.1; } return want; }
    if (slow) { m.look = (m.look || 0) - dt; if (m.look <= -9 - rnd() * 8) m.look = 1 + rnd() * 1.5; if (m.look > 0) return want; }
    m.next = (m.next || 0) - dt;
    if (m.next <= 0) {
      m.next = slow ? 0.45 + rnd() * 0.25 : 0.28 + rnd() * 0.15;
      m.hold = {}; m.holdT = {};
      if (isD) {
        // a person keeps roughly to the pace, sometimes forgets to slow for a bump, honks when told (a little late)
        let vW = pl.vWant;
        if (pl.dWhy === 'bump') { if (m.bump !== pl.bump) { m.bump = pl.bump; m.forget = rnd() < (slow ? 0.2 : 0.3); } if (m.forget) vW = st.c.pace; }
        if (slow && vW > 0) vW = Math.min(vW, st.c.pace - 25);
        vW += (rnd() - 0.5) * (slow ? 50 : 34);
        const dv = vW - tr.v, dead = slow ? 30 : 20, fudge = 0.6 + rnd() * 0.8;
        if (dv > dead) { m.hold.right = true; m.holdT.x = Math.min(m.next, dv / 250 * fudge); }
        else if (dv < -dead) { if (vW < 0 && tr.v < 5) m.hold.left = true; else m.hold.down = true; m.holdT.x = Math.min(m.next, -dv / 430 * fudge + 0.05); }
        if (pl.honk) { m.honkWait = (m.honkWait || 0) + m.next; if (m.honkWait > (slow ? 1.2 : 0.6)) { m.hold.act = true; m.honkWait = 0; } } else m.honkWait = 0;
      } else {
        // a person walks to where the toss looks like it will come down (not exactly), jumps a bit early or late
        const err = (rnd() - 0.5) * (slow ? 50 : 30), du = pl.uWant + err - c.u, dead = slow ? 16 : 10;
        if (Math.abs(du) > dead) { m.hold[du > 0 ? 'right' : 'left'] = true; m.holdT.x = Math.abs(du) / 235 * (0.7 + rnd() * 0.5); }
        if (pl.cWhy === 'jump' && pl.jumpSoon) { const at = pl.item ? M.catchSpot(st, pl.item, tr.v) : null; if (at && at.jump) { m.jumpIn = at.jumpAt + (rnd() - 0.5) * (slow ? 0.24 : 0.14); m.jumpFor = pl.item; } }
        if (pl.holdNow) { if (m.holdBump !== pl.bump) { m.holdBump = pl.bump; m.willHold = rnd() < (slow ? 0.35 : 0.5); } if (m.willHold) { m.hold.act = true; m.holdT.a = 0.6; m.hold = { act: true }; } }
      }
      m.t0 = 0;
    }
    m.t0 = (m.t0 || 0) + dt;
    if (m.jumpIn != null) { m.jumpIn -= dt; if (m.jumpIn <= 0) { m.jumpIn = null; m.jumpT = 0.12; } }
    if (m.jumpT > 0) { m.jumpT -= dt; want.up = true; }
    for (const k of ['left', 'right', 'down']) if (m.hold[k] && m.t0 < (m.holdT.x || 0)) want[k] = true;
    if (m.hold.act && m.t0 < (m.holdT.a || 0.1)) want.act = true;
    return want;
  }
  function drive(id, kind, P, rnd) {
    if (!kind) return;
    const want = wantFor(id, kind, P, rnd);
    for (const k of ['left', 'right', 'up', 'down', 'act']) { const c = KB[id][k]; if (want[k]) P.keys.add(c); else P.keys.delete(c); }
  }
  window.__haytPeople = { drive, reset, KB };
})();
