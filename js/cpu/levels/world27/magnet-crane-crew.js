/* Pip & Bo - Computer partner brain for 27-3 Magnet Crane Crew (mode 'magcrane'). */
'use strict';

(() => {
  /* 27-3 Magnet Crane Crew (MODES.magcrane): G.mst.op drives the crane, G.mst.rider rides the magnet. Both follow the
     bay's plan (room def plan: [[column, height]], the path in the order the computer builds it): the next column that
     still needs crates is the target; the source is the nearest column with crates that isn't on the path (or the chute,
     when there are none).
     OPERATOR: with the rider off the magnet it parks the magnet level with the rider's feet next to them. Otherwise it
     raises the magnet clear of every stack on the way, drives over the source (empty) or the target (carrying), and
     lowers it onto the top crate (to grab) or just above the stack (to drop), then holds still for the rider. With the
     path done it lowers the rider onto the path so they can walk out. No crates left: it calls one from the chute.
     RIDER: grabs when the magnet holds still on a crate that isn't part of the path, drops when it holds still over a
     column the path still needs. Off the magnet with the path unfinished, it walks to the magnet and hops on. With the
     path done (or standing on it), it walks to the exit. With a person at the crane, it says what it needs ("Lower me
     onto a crate!", "Over to the pit!").
     It can't finish a bay alone: the rider can't move the magnet and the operator can't grab. Team brains play at full
     skill. */
  const MC = () => MODES.magcrane;
  const colX = c => c * 60 + 30;
  function target(st) { for (const [c] of st.plan) if (MC().deficit(st, c) > 0) return c; return null; }
  function source(st) {
    const planCols = new Set(st.plan.map(q => q[0]));
    let best = null;
    for (let c = 0; c < 16; c++) {
      if (!st.stacks[c] || planCols.has(c)) continue;
      if (best == null || Math.abs(colX(c) - st.mag.x) < Math.abs(colX(best) - st.mag.x)) best = c;
    }
    return best;
  }
  // the first spot on the walk from START to the exit that is too steep to climb (or a hole too wide to jump)
  function routeBlock(st) {
    const h = c => MC().curHeight(st, c);
    let holes = 0, prev = h(st.start);
    for (let c = st.start + 1; c <= st.exit; c++) {
      if (h(c) <= -2) { if (++holes >= 2) return { c, hole: true }; continue; }
      if (h(c) - prev > 1) return { c };
      prev = h(c); holes = 0;
    }
    return null;
  }
  // the next crate move: { src, dst } (src null: call one from the chute), or null when the walk is clear
  function work(st) {
    const t = target(st);
    if (t != null) return { src: source(st), dst: t };
    const b = routeBlock(st);
    if (!b) return null;
    const planCols = new Set(st.plan.map(q => q[0]));
    if (!b.hole && st.stacks[b.c] > 0 && !planCols.has(b.c)) return { src: b.c, dst: 0 };
    return { src: source(st), dst: b.hole ? b.c : b.c - 1 };
  }
  // the highest point (smallest y) of the columns between two x's
  function ceilBetween(st, x0, x1) {
    const a = MC().colOf(Math.min(x0, x1) - 29), b = MC().colOf(Math.max(x0, x1) + 29);
    let m = 1e9; for (let c = a; c <= b; c++) m = Math.min(m, MC().colTop(st, c));
    return m;
  }
  cpuBrain('magcrane', {
    reset(S) { S.still = 0; S.call = 0; },
    think(S, p, o, dt, info) {
      const out = {}, st = info.mst;
      if (!st || !st.stacks || info.intro || st.state !== 'play' || st.onBreak) return out;
      const K = MC().CRANE, m = st.mag, human = !info.partnerCpu, wk = work(st), done = !wk && !st.carry;
      const R = G.players[st.rider];
      if (p.id === st.op) {
        let tx = m.x, ty = m.y, wantLow = false;
        const carryH = K.magH + (st.carry ? 60 : 0);
        if (st.boing) return out;
        if (st.riding) S.park = null;
        if (!st.riding) {
          if (done) return out;
          // park the magnet next to the rider, its top level with their feet
          const rc = MC().colOf(R.x + R.w / 2), feet = R.y + R.h;
          const ok = c => c != null && c >= 0 && c < 16 && Math.abs(c - rc) <= 2 && Math.abs(MC().colTop(st, c) - feet) < 40;
          const side = ok(S.park) ? S.park : (S.park = [rc + 1, rc - 1, rc].find(ok));
          if (side == null) return out;
          tx = colX(side); ty = Math.min(feet, MC().colTop(st, side) - carryH); wantLow = true;
        } else if (done) {
          const c = st.room.start != null ? st.room.start : 1; tx = colX(c); ty = MC().colTop(st, c) - K.magH; wantLow = true;
        } else if (st.carry) {
          const c = wk ? wk.dst : 0; tx = colX(c); ty = MC().colTop(st, c) - carryH - 4; wantLow = true;
        } else {
          const c = wk.src;
          if (c == null) {
            if (!st.falling.length && st.chuteT <= 0) out.act = 'tap';
            return out;
          }
          tx = colX(c); ty = MC().colTop(st, c) - K.magH; wantLow = true;
        }
        const safe = Math.max(K.railY + K.cableMin + 2, ceilBetween(st, m.x, tx) - carryH - 26);
        tx = clamp(tx, 34, 960 - 34);
        const dx = tx - m.x;
        if (Math.abs(dx) > 3) {
          // clear of everything on the way first
          if (m.y > safe) { out.up = true; return out; }
          const stop = (m.vx * m.vx) / (2 * 900);
          if (Math.sign(m.vx) === Math.sign(dx) && stop >= Math.abs(dx) - 2) { if (m.vx > 0) out.left = true; else out.right = true; }
          else if (dx > 0) out.right = true; else out.left = true;
          return out;
        }
        if (Math.abs(m.vx) > 20) { if (m.vx > 0) out.left = true; else out.right = true; return out; }
        if (m.y < ty - 2) out.down = true; else if (m.y > ty + 2 && !wantLow) out.up = true;
        if (human && st.riding) {
          if (MC().canGrab(st) && !st.carry) cpuSay(p, 'Grab it!', 1.6);
          else if (st.carry && Math.abs(m.y - ty) < 4) cpuSay(p, 'Drop it here!', 1.6);
          else if (done) cpuSay(p, 'Walk to the exit!', 1.8);
        }
        return out;
      }
      // the rider
      if (st.boing || !p.alive) return out;
      const still = Math.abs(m.vx) < 4 && Math.abs(m.vy) < 1;
      S.still = still ? S.still + dt : 0;
      if (done) {
        // walk out (from the magnet once it's down on the path)
        const ex = st.exit;
        if (st.riding) {
          // step off once the magnet is down by the start (the way is mapped from the ground)
          if (m.y + K.magH < MC().colTop(st, MC().colOf(m.x)) - 6 || S.still < 0.2) { if (human && S.still > 2) cpuSay(p, 'Lower me down!', 1.6); return out; }
          out.right = true; return out;
        }
        // (the door only opens for a rider who walked from the START pad)
        const goal = st.walked ? ex : st.start;
        return cpuNav(S, p, colX(goal), MC().colTop(st, goal), { tol: 8 }) || out;
      }
      if (!st.riding) {
        const dx = m.x - (p.x + p.w / 2);
        if (Math.abs(dx) < 140 && Math.abs(m.y - (p.y + p.h)) < 96) {
          if (dx > 4) out.right = true; else if (dx < -4) out.left = true;
          if (Math.abs(dx) < 60 && p.grounded && m.y < p.y + p.h + 4) out.jump = true;
          if (!p.grounded && p.vy < 0) out.jump = true; // (hold it for the full jump)
        } else if (human) cpuSay(p, 'Bring the magnet to me!', 1.8);
        return out;
      }
      // riding: stand in the middle of the magnet
      const d = m.x - (p.x + p.w / 2);
      if (d > 6) out.right = true; else if (d < -6) out.left = true;
      const c = MC().colOf(m.x), planCol = st.plan.some(q => q[0] === c);
      if (S.still > 0.25) {
        if (st.carry && ((wk && wk.dst === c) || MC().deficit(st, c) > 0 || (!wk && c === 0))) out.act = 'tap';
        else if (!st.carry && MC().canGrab(st) && (wk ? wk.src === c : false) && !(wk && wk.dst === c)) out.act = 'tap';
        else if (human && S.still > 2.5) cpuSay(p, st.carry ? 'Over to the path!' : 'Lower me onto a crate!', 1.8);
      }
      return out;
    },
  });
})();
