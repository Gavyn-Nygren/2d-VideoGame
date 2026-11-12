/* Pip & Bo - Computer partner brain for 34-3 Mead Hall Feast Brawl (mode 'meadhall'). */
'use strict';

(() => {
  /* 34-3 Mead Hall Feast Brawl (MODES.meadhall): both read MODES.meadhall.plan(st), the same orders, rack pick and
     jobs the prompts and HUD chips read.
     JOBS: a RUNNER (at the kitchen rack: picks the food the most urgent order needs, tosses it to the server) and a
     SERVER (on the serving step of the most urgent order's table: catches, charges to the right distance with a small
     error and lets go). Two computers: Pip runs in feasts 1 and 3, Bo in 2 and 4. With a person it takes the job the
     person isn't doing (the person on a step or out at the tables = server, on the floor by the rack = runner), and
     switches only after the person has stayed in the other job for 2 s.
     EVERYONE: ducks a thrown roast (holds ▼ in the last 0.3 s of its flight, and never starts a charge while one is
     aimed at it); goes to its handle of the chieftain's platter at once and waits there ("Over here!"), then walks the
     platter under the steps and presses ▲ every 0.25 s so a person's press lands together with it; carries the barrel
     to the SKOL table and rolls it when the mugs go up; for an arm-wrestle it takes the end the partner isn't at and
     slides only when the partner is ready at the other end (or has just slid).
     A runner with food the server can't take for 3 s delivers it itself. Never picks up a rack item the person is
     walking toward (gives way inside 50 px). Twitch guard: a job or a table is kept for at least 0.3 s.
     It can't finish alone: the hall takes a break after 12 s with no person pressing anything. Team brains always
     play at full skill. */
  const M = () => MODES.meadhall;
  const LX = 200, RX = 872; // the middle of the left / right serving steps
  function stepX(id) { return id[0] === 'L' ? LX : RX; }
  function steer(out, h, x, dead = 6) {
    const d = x - h.x, v = h.vx;
    if (Math.abs(d) <= dead) { if (Math.abs(v) > 50) { out.left = v > 0; out.right = v < 0; } return Math.abs(v) <= 60; }
    const stopD = (v * v) / (2 * 3000);
    if (Math.sign(v) === Math.sign(d) && stopD >= Math.abs(d) - dead * 0.5) { out.left = v > 0; out.right = v < 0; }
    else { out.left = d < 0; out.right = d > 0; }
    return false;
  }
  // walk / climb to a spot: level 'floor' or a step id ('L0'..'R2')
  function go(s, out, h, level, x) {
    const cur = h.ground;
    if (!cur) { if (x !== undefined) steer(out, h, x, 10); return false; }
    if (cur === level) return x === undefined ? true : steer(out, h, x, 8);
    if (level === 'floor') {
      if (cur[0] === 'L') { out.left = true; return false; }
      out.right = true; return false;
    }
    const side = level[0], k = +level[1];
    if (cur !== 'floor' && cur[0] !== side) { if (cur[0] === 'L') out.left = true; else out.right = true; return false; }
    if (cur !== 'floor' && +cur[1] > k) { if (s.jcd <= 0) { out.down = true; out.jump = 'tap'; s.jcd = 0.3; } return false; }
    // below it on this side: stand under the steps and hop up
    const at = steer(out, h, stepX(level), 14);
    if (Math.abs(h.x - stepX(level)) < 22 && s.jcd <= 0) { out.jump = 'tap'; s.jcd = 0.4; out.left = out.right = false; }
    return at && false;
  }
  cpuBrain('meadhall', {
    reset(s) { s.jcd = 0; s.cd = 0; s.charge = false; s.cT = 0; s.role = null; s.roleT = 0; s.pj = null; s.pjT = 0; s.waitT = 0; s.noneT = 0; s.serve = null; s.serveT = 0; s.side = null; s.idleT = 0; s.solo = 0; },
    think(s, p, o, dt, info) {
      const out = {}, st = info.mst;
      if (!st || !st.h || info.intro || st.state !== 'go' || st.waiting || st.brawl > 0) { s.charge = false; return out; }
      const MM = M(), pl = MM.plan(st), h = st.h[p.id], oh = st.h[o.id], human = !info.partnerCpu;
      s.jcd -= dt; s.cd -= dt; s.roleT -= dt; s.serveT -= dt;
      if (h.stun > 0) { s.charge = false; return out; }
      // ---- the job: runner or server
      let role;
      if (!human) role = (st.k % 2 === 0 ? 0 : 1) === p.id ? 'runner' : 'server';
      else {
        const pj = oh.ground && oh.ground !== 'floor' || oh.x > 270 ? 'server' : 'runner';
        if (s.pj === null) s.pj = pj;
        if (pj !== s.pj) { s.pjT += dt; if (s.pjT > 2) { s.pj = pj; s.pjT = 0; } } else s.pjT = 0;
        role = s.pj === 'server' ? 'runner' : 'server';
      }
      if (s.role !== role && s.roleT <= 0) { s.role = role; s.roleT = 0.3; }
      role = s.role || role;
      // ---- a roast thrown at me: duck
      const ft = st.fight, aimed = ft && ft.to === p.id;
      if (aimed && ft.state === 'fly' && ft.t > MM.S.throwFly - 0.32 && h.handle === null && !h.charging) { out.down = true; return out; }
      // ---- charging: hold until the charge reaches the aim, then let go
      if (h.charging) {
        if (h.charge >= s.cT) { out.act = false; s.charge = false; s.cd = 0.15; }
        else out.act = true;
        return out;
      }
      // ---- the chieftain's platter
      const pt = st.platter;
      if (pt) {
        if (h.handle !== null) {
          if (pt.state !== 'carry') { if (human) cpuSay(p, 'Over here! Grab the other handle!', 1.4); return out; }
          if (Math.abs(pt.x - LX) > 10) { out.left = pt.x > LX; out.right = pt.x < LX; }
          else if (s.jcd <= 0) { out.jump = 'tap'; s.jcd = 0.25; if (human) cpuSay(p, 'Jump together!', 1.2); }
          return out;
        }
        if (pt.state === 'floor' && h.handle === null) {
          // (a food in hand is put down by grabbing the handle; one about to be slid goes first)
          const l = h.carry && MM.servingAt(st, h), b = l && h.carry.k !== 'barrel' && MM.best(st, h.carry.k, l.side);
          if (!(b && b.t === l.k && !b.wrestle)) {
            let k = pt.held[0] === null ? 0 : 1;
            if (pt.held[0] === null && pt.held[1] === null) {
              if (human) { const dA = Math.abs(oh.x - (pt.x - MM.S.handle)), dB = Math.abs(oh.x - (pt.x + MM.S.handle)); k = dA < dB ? 1 : 0; }
              else k = p.id;
            }
            const hx = pt.x + (k ? MM.S.handle : -MM.S.handle);
            if (go(s, out, h, 'floor', hx) && Math.abs(h.x - hx) < 12 && s.cd <= 0) { out.act = 'tap'; s.cd = 0.3; }
            return out;
          }
        }
      }
      // ---- carrying something
      if (h.carry) s.solo = 0;
      if (h.carry) {
        const k = h.carry.k;
        if (k === 'barrel') {
          const sk = st.skol;
          if (!sk) { if (go(s, out, h, 'floor', 110) && s.cd <= 0) { out.act = 'tap'; s.cd = 0.3; } return out; }
          const lv = 'L' + sk.table;
          if (go(s, out, h, lv, 230) || h.ground === lv) {
            if (sk.state === 'up' && s.cd <= 0 && !aimed) { out.act = true; s.cT = 0.25; s.charge = true; }
          }
          return out;
        }
        // an arm-wrestle food: take the end the partner isn't at
        const w = pl.wrestle;
        // both ends still need it and the partner has none yet: a runner tosses this one to the partner first
        const oHas = oh.carry && oh.carry.k === k || st.fly.some(f => f.to === o.id && f.item.k === k);
        const oCatch = oh.ground && oh.ground !== 'floor' && !oh.carry && oh.handle === null && !oh.charging && Math.hypot(oh.x - h.x, oh.y - h.y) < MM.S.tossMax - 60;
        const feed = w && w.food === k && w.need.length === 2 && role === 'runner' && !oHas && oCatch;
        if (w && w.food === k && w.need.length && !feed) {
          let side;
          if (w.need.length === 1) side = w.need[0];
          else {
            const oOn = oh.ground && oh.ground !== 'floor' && +oh.ground[1] === w.t ? oh.ground[0] : null;
            side = oOn ? (oOn === 'L' ? 'R' : 'L') : role === 'runner' ? 'R' : 'L';
          }
          const lv = side + w.t, wst = st.wrestle;
          if (h.ground === lv) {
            const other = side === 'L' ? 'R' : 'L', oReady = oh.ground === other + w.t && oh.carry && oh.carry.k === k;
            const otherGot = wst && wst.got[side === 'L' ? 1 : 0];
            if ((oReady || otherGot || w.need.length === 1 && !otherGot && false) && s.cd <= 0 && !aimed) {
              const b = MM.best(st, k, side);
              if (b) { out.act = true; s.cT = b.c + (Math.random() - 0.5) * 0.03; s.charge = true; return out; }
            }
            if (human && !oReady && !otherGot) cpuSay(p, 'Bring ' + k + ' to the other end, together!', 1.6);
            // the other side already got his: slide now
            if (w.need.length === 1 && s.cd <= 0 && !aimed) { const b = MM.best(st, k, side); if (b) { out.act = true; s.cT = b.c; s.charge = true; } }
            return out;
          }
          go(s, out, h, lv, side === 'L' ? 230 : 850);
          return out;
        }
        // a runner tosses to a server who is up on a step with free hands
        if (role === 'runner') {
          const oReady = oh.ground && oh.ground !== 'floor' && !oh.carry && oh.handle === null && !oh.charging && Math.hypot(oh.x - h.x, oh.y - h.y) < MM.S.tossMax - 60;
          if (oReady && h.ground && !MM.servingAt(st, h) && !MM.atRack(h)) { if (s.cd <= 0) { out.act = 'tap'; s.cd = 0.3; s.waitT = 0; if (human) cpuSay(p, 'Catch!', 0.8); } return out; }
          s.waitT += dt;
          if (s.waitT < 3) { go(s, out, h, 'floor', 168); return out; }
        } else s.waitT = 0;
        // deliver it: the most urgent Viking who wants it, from the left step (or the step it's on)
        const cur = h.ground && h.ground !== 'floor' ? h.ground : null;
        let b = cur ? MM.best(st, k, cur[0]) : null, side = cur ? cur[0] : 'L';
        if (!b) { b = MM.best(st, k, 'L'); side = 'L'; }
        if (!b) {
          s.noneT += dt;
          // nobody wants what I hold: take it back to the rack, to the slot of the food that IS wanted if there is one
          // (a full rack swaps the two)
          const pk = pl.pick && pl.pick.slot !== 'barrel' ? MM.S.rack[pl.pick.slot] : 110;
          if (s.noneT > (pl.pick ? 1.2 : 3)) { if (go(s, out, h, 'floor', pk) && Math.abs(h.x - pk) < 12 && s.cd <= 0) { out.act = 'tap'; s.cd = 0.3; s.noneT = 0; } }
          return out;
        }
        s.noneT = 0;
        const lv = side + b.t;
        if (h.ground === lv) {
          if (s.cd <= 0 && !aimed && Math.abs(h.vx) < 80) { out.act = true; s.cT = b.c + (Math.random() - 0.5) * 0.04; s.charge = true; }
          return out;
        }
        go(s, out, h, lv, side === 'L' ? 230 : 850);
        return out;
      }
      s.waitT = 0; s.noneT = 0;
      // ---- empty hands
      // a server whose person runner hasn't brought anything for 6 s goes and gets one itself
      if (human && role === 'server') {
        const coming = oh.carry || st.fly.some(f => f.to === p.id);
        if (!coming && pl.orders.length && h.ground && h.ground !== 'floor') s.idleT = (s.idleT || 0) + dt; else if (coming) s.idleT = 0;
        if (s.idleT > 6) { s.solo = 1; s.idleT = 0; cpuSay(p, 'I\'ll get this one!', 1.2); }
      }
      // an arm-wrestle with the partner already holding its food (on the way to one end): fetch the second one myself
      // (review: a server kept waiting on its step for a runner who was standing at the far end with the first one, and
      // the wrestle ran out after 20 s with the food it needed sitting on the rack)
      const wr = pl.wrestle, fetch2 = wr && wr.carrying < wr.need.length && oh.carry && oh.carry.k === wr.food;
      if (role === 'runner' || s.solo > 0 || fetch2) {
        // food on the floor first (before the dog gets it)
        const fl = st.floorItems.filter(f => f.land).sort((a, b) => Math.abs(a.x - h.x) - Math.abs(b.x - h.x))[0];
        if (fl && Math.abs(fl.x - h.x) < 400) { if (go(s, out, h, 'floor', fl.x) || h.ground === 'floor' && Math.abs(fl.x - h.x) < 14) { if (s.cd <= 0) { out.act = 'tap'; s.cd = 0.3; } } return out; }
        const pk = pl.pick;
        if (!pk) { go(s, out, h, 'floor', 110); return out; }
        const x = pk.slot === 'barrel' ? MM.S.barrelX : MM.S.rack[pk.slot];
        // give way to a person heading for the same item
        if (human && oh.ground === 'floor' && !oh.carry && Math.abs(oh.x - x) < 50 && Math.sign(oh.vx) === Math.sign(x - oh.x)) { go(s, out, h, 'floor', x + (x < 80 ? 60 : -60)); return out; }
        if (go(s, out, h, 'floor', x) && Math.abs(h.x - x) < 12 && s.cd <= 0) { out.act = 'tap'; s.cd = 0.3; }
        return out;
      }
      // server: wait on the step of the most urgent order (or the wrestle's left end)
      const want = pl.wrestle && pl.wrestle.need.includes('L') ? { t: pl.wrestle.t } : pl.serve;
      if (want && (s.serve === null || s.serveT <= 0) && want.t !== s.serve) { s.serve = want.t; s.serveT = 1.0; }
      const t = s.serve === null ? 0 : s.serve;
      go(s, out, h, 'L' + t, 222);
      if (human && h.ground === 'L' + t && oh.carry && oh.ground === 'floor') cpuSay(p, 'Toss it to me!', 1.2);
      return out;
    },
  });
})();
