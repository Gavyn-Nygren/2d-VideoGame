/* Pip & Bo - Computer partner brain for 22-3 Shipwreck Lights. */
'use strict';

(() => {
  /* 22-3 Shipwreck Lights (MODES.shipwreck): G.mst.lantern says who carries Glimmer this section; the other grabs.
     Both jobs read MODES.shipwreck.need(st), the same "what's next" the hint chips read: a lever, a wheel, a key (then
     its keyhole), a sleepy anemone, a pufferfish, a crate, the exit or the chest.
     SWIMMING: a path over a 15 px grid of the section (walls, closed doors and crates are solid; prickly coral, urchins
     and pufferfish are kept clear of by about 16 px at where they are now, so a bobbing urchin's gap opens and closes
     as it moves), re-planned every 0.2 s, steered with a speed controller (it presses toward the speed it wants and
     lets go, so it stops on a spot). No path (an urchin is in the gap): it hangs back and waits for the gap.
     LANTERN: swims to where the needed thing can be lit (just up and left of it) and stays there while the grabber
     works; for an anemone or a pufferfish it swims within about 200 px and flashes (the action) when Glimmer is
     charged. It sweeps treasure on the way when the grabber is close (lights it so the grabber can grab it), at most
     6 s per piece. It KNOWS where the hidden things are (it "remembers the ship"): the one place it reads level state
     a person can't see, so in 1-player mode it can guide a person who is lost ("Over here! A lever!").
     GRABBER: only goes for things it has seen (lit at least once) or that are lit or gold now; otherwise it stays in
     Glimmer's light, just behind the lantern. In reach and lit: a tap for a lever, a hold for a wheel or the chest.
     It grabs lit treasure within about 200 px, takes a key to its keyhole and pushes a crate from its left side until
     the tunnel is clear.
     Waiting: if the partner (a person) is far behind, it swims back toward them instead of racing ahead; the leash
     stops anyone getting more than 600 px apart anyway. It can't finish alone: as the lantern it can't open anything;
     as the grabber nothing works in the dark and it can't flash. With a person it says short things ("Over here! A
     lever!", "Flash the pufferfish!", "Bring Glimmer here!"); bubbles only show in 1-player mode (cpuSay).
     Team brains always play at full skill. */
  const M = () => MODES.shipwreck;
  const CELL = 15;
  let gridCache = null;

  // the free cells of the section for a player-sized box (walls, closed doors, crates), cached by what's open
  function grid(st) {
    const SW = M().SW;
    const sig = st.k + ':' + st.len + ':' + st.doors.map(d => d.open > 0.97 ? 1 : 0).join('') + ':' + st.crates.map(c => Math.round(c.x0 / 5) + ',' + Math.round(c.y0 / 5)).join(';');
    if (gridCache && gridCache.sig === sig && gridCache.st === st) return gridCache;
    const cols = Math.ceil(st.len / CELL), rows = Math.ceil((SW.floor - SW.ceil) / CELL);
    const free = new Uint8Array(cols * rows), sol = M().solids(st);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const cx = c * CELL + CELL / 2, cy = SW.ceil + r * CELL + CELL / 2;
      const x0 = cx - PW / 2 - 1, x1 = cx + PW / 2 + 1, y0 = cy - PH / 2 - 1, y1 = cy + PH / 2 + 1;
      let ok = y0 >= SW.ceil - 1 && y1 <= SW.floor + 1 && x0 >= 0 && x1 <= st.len;
      if (ok) for (const s of sol) if (x0 < s.x1 && x1 > s.x0 && y0 < s.y1 && y1 > s.y0) { ok = false; break; }
      free[r * cols + c] = ok ? 1 : 0;
    }
    gridCache = { sig, st, cols, rows, free };
    return gridCache;
  }
  const cellOf = (g, x, y) => ({ c: clamp(Math.floor(x / CELL), 0, g.cols - 1), r: clamp(Math.floor((y - M().SW.ceil) / CELL), 0, g.rows - 1) });
  const cellXY = (c, r) => ({ x: c * CELL + CELL / 2, y: M().SW.ceil + r * CELL + CELL / 2 });
  // prickly things where they are now (plus a margin), as blocked cells
  function hazardMask(st, g, tight) {
    const mask = new Uint8Array(g.cols * g.rows);
    // (a swaying urchin is kept clear of where it is now and where it will be in 0.3 and 0.6 s)
    const list = [];
    for (const h of st.hazards) {
      if (h.gold) continue;
      if (tight) { list.push({ x: h.x, y: h.y, r: h.r * 0.95 }); continue; }
      if (!(h.dx || h.dy)) { list.push({ x: h.x, y: h.y, r: h.r + 12 }); continue; }
      for (const ahead of [0, 0.3, 0.6]) { const u = Math.sin((st.t + ahead) * Math.PI * 2 / h.per + h.ph); list.push({ x: h.bx + h.dx * u, y: h.by + h.dy * u, r: h.r + 12 }); }
    }
    list.push(...st.puffers
.filter(q => q.state === 'block' || q.state === 'puff').map(q => ({ x: q.x, y: q.y, r: q.r * 1.15 + 12 })));
    for (const h of list) {
      const R = h.r + Math.max(PW, PH) / 2;
      const c0 = Math.max(0, Math.floor((h.x - R) / CELL)), c1 = Math.min(g.cols - 1, Math.floor((h.x + R) / CELL));
      const r0 = Math.max(0, Math.floor((h.y - R - M().SW.ceil) / CELL)), r1 = Math.min(g.rows - 1, Math.floor((h.y + R - M().SW.ceil) / CELL));
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
        const q = cellXY(c, r), nx = clamp(h.x, q.x - PW / 2, q.x + PW / 2), ny = clamp(h.y, q.y - PH / 2, q.y + PH / 2);
        if (Math.hypot(nx - h.x, ny - h.y) < h.r) mask[r * g.cols + c] = 1;
      }
    }
    return mask;
  }
  // breadth-first path from (x, y) to (tx, ty): a list of world points, or null
  // (first with a safe margin round prickly things; boxed in by the margins, again with tight ones)
  function path(st, x, y, tx, ty) {
    return path1(st, x, y, tx, ty, false) || path1(st, x, y, tx, ty, true);
  }
  function path1(st, x, y, tx, ty, tight) {
    const g = grid(st), mask = hazardMask(st, g, tight), n = g.cols * g.rows;
    const ok = i => g.free[i] && !mask[i];
    const s = cellOf(g, x, y), s0 = s.r * g.cols + s.c;
    // the goal: its cell, or the nearest free one around it
    let t = cellOf(g, tx, ty), ti = t.r * g.cols + t.c;
    if (!g.free[ti]) {
      let best = -1, bd = 1e9;
      for (let r = Math.max(0, t.r - 5); r <= Math.min(g.rows - 1, t.r + 5); r++) for (let c = Math.max(0, t.c - 5); c <= Math.min(g.cols - 1, t.c + 5); c++) {
        const i = r * g.cols + c; if (!g.free[i]) continue;
        const d = (r - t.r) ** 2 + (c - t.c) ** 2; if (d < bd) { bd = d; best = i; }
      }
      if (best < 0) return null;
      ti = best;
    }
    if (ti === s0) return [cellXY(ti % g.cols, Math.floor(ti / g.cols))];
    const prev = new Int32Array(n).fill(-1);
    prev[s0] = s0;
    const q = [s0];
    for (let h = 0; h < q.length; h++) {
      const i = q[h];
      if (i === ti) break;
      const c = i % g.cols, r = (i - c) / g.cols;
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const nc = c + dc, nr = r + dr;
        if (nc < 0 || nr < 0 || nc >= g.cols || nr >= g.rows) continue;
        const j = nr * g.cols + nc;
        if (prev[j] >= 0) continue;
        if (!(ok(j) || j === ti)) continue;
        if (dc && dr && !(g.free[r * g.cols + nc] && g.free[nr * g.cols + c])) continue;   // no corner cutting
        prev[j] = i; q.push(j);
      }
    }
    if (prev[ti] < 0) return null;
    const out = [];
    for (let i = ti; i !== s0; i = prev[i]) out.push(cellXY(i % g.cols, Math.floor(i / g.cols)));
    out.reverse();
    return out;
  }
  // press toward the speed that gets to (tx, ty) and lets go near it (a stop within about `dead` px)
  function steer(out, p, cx, cy, tx, ty, dead, slowR) {
    const SW = M().SW, dx = tx - cx, dy = ty - cy, d = Math.hypot(dx, dy);
    const sp = d < dead ? 0 : Math.min(SW.vmax, (d - dead * 0.5) * (slowR || 4.5));
    const vx = d > 0 ? dx / d * sp : 0, vy = d > 0 ? dy / d * sp : 0;
    // (a small dead band, smaller when it wants to creep the last few px)
    const band = Math.min(28, sp * 0.6 + 4);
    if (vx - p.vx > band) out.right = true; else if (vx - p.vx < -band) out.left = true;
    if (vy - p.vy > band) out.down = true; else if (vy - p.vy < -band) out.up = true;
    return d < dead;
  }
  // follow a path to the goal (re-planned every 0.2 s); returns true when there
  function go(S, out, p, st, cx, cy, tx, ty, dead, dt) {
    S.pathT -= dt;
    const moved = !S.goal || Math.hypot(S.goal.x - tx, S.goal.y - ty) > 12;
    if (S.pathT <= 0 || moved) { S.pathT = 0.2; S.goal = { x: tx, y: ty }; S.path = path(st, cx, cy, tx, ty); }
    if (Math.hypot(tx - cx, ty - cy) < dead + 2) return steer(out, p, cx, cy, tx, ty, dead);
    const pt = S.path;
    if (!pt || !pt.length) {
      // no way through right now (an urchin in the gap): hang back and wait for it to move
      steer(out, p, cx, cy, cx, cy, 6); S.waiting = (S.waiting || 0) + dt;
      return false;
    }
    S.waiting = 0;
    // the farthest of the next few points that is still close: smooth enough, and it never cuts round a wall
    while (pt.length > 1 && Math.hypot(pt[0].x - cx, pt[0].y - cy) < CELL * 0.9) pt.shift();
    const k = Math.min(pt.length - 1, 2), w = pt[k];
    const last = pt.length - 1 <= 2;
    steer(out, p, cx, cy, last ? tx : w.x, last ? ty : w.y, last ? dead : 2, last ? 4.5 : 9);
    // stuck against something for a while: a little wiggle
    S.stuckT = Math.hypot(p.vx, p.vy) < 15 && (out.left || out.right || out.up || out.down) ? (S.stuckT || 0) + dt : 0;
    if (S.stuckT > 1.2) { S.wig = 0.4; S.wigD = (S.wigD || 1) * -1; S.stuckT = 0; }
    if (S.wig > 0) { S.wig -= dt; if (out.left || out.right) { out.up = S.wigD < 0; out.down = S.wigD > 0; } else { out.left = S.wigD < 0; out.right = S.wigD > 0; } }
    return false;
  }
  const bandY = y => clamp(y, M().SW.ceil + 24, M().SW.floor - 24);

  cpuBrain('shipwreck', {
    reset(S) { S.path = null; S.pathT = 0; S.goal = null; S.gem = null; S.gemT = 0; S.skip = new Set(); S.wig = 0; },
    think(S, p, o, dt, info) {
      const out = {}, st = info.mst;
      if (!st || !st.walls || info.intro || st.state !== 'play' || G.introT > M().SW.introHold) return out;
      const SW = M().SW, cam = st.camX;
      const cx = p.x + cam + p.w / 2, cy = p.y + p.h / 2, ox = o.x + cam + o.w / 2, oy = o.y + o.h / 2;
      const nd = M().need(st), human = !info.partnerCpu, lantern = p.id === st.lantern;
      const P = st.pl[p.id];
      if (P.stunT > 0) return out;
      const stepX = nd.step ? nd.step.x : st.len;
      // a person far behind: swim back toward them (never race ahead out of the light)
      if (human && info.partnerIdle < 8 && ox < cx - 380) {
        go(S, out, p, st, cx, cy, ox + 160, bandY(oy - 20), 30, dt);
        cpuSay(p, lantern ? 'This way! Follow the light!' : 'Come on, bring Glimmer!');
        return out;
      }
      // treasure on the way (only when the partner is close by; at most 6 s for a piece)
      const pickGem = () => {
        if (S.gem && (S.gem.got || S.skip.has(S.gem))) S.gem = null;
        if (S.gem) { S.gemT += dt; if (S.gemT > 6) { S.skip.add(S.gem); S.gem = null; } }
        if (!S.gem) {
          let best = null, bd = 1e9;
          for (const g of st.gems) {
            if (g.got || S.skip.has(g) || g.x > stepX - 10 || g.x < Math.min(cx, ox) - 140) continue;
            if (!lantern && !(M().isLit(st, g.x, g.y))) continue;
            const d = Math.hypot(g.x - cx, g.y - cy);
            if (d < (lantern ? 300 : 210) && d < bd) { bd = d; best = g; }
          }
          if (best) { S.gem = best; S.gemT = 0; }
        }
        return S.gem;
      };
      if (lantern) {
        let tx = nd.x, ty = nd.y, dead = 18;
        const k = nd.kind;
        if (k === 'glow' || k === 'puffer') {
          // close enough for a flash, from the near side
          tx = nd.x - (k === 'glow' ? 120 : 170); ty = bandY(nd.y - (k === 'glow' ? 90 : 20));
          const fd = st.fish ? Math.hypot(st.fish.x - nd.x, st.fish.y - nd.y) : 1e9;
          if (fd < SW.flashReach - 50 && P.cd <= 0) { out.act = 'tap'; if (human) cpuSay(p, 'Flash!', 1.2); }
          else if (human && fd < SW.flashReach) cpuSay(p, k === 'glow' ? 'Wake up, anemone!' : 'Shoo, grumpy puffer!');
          go(S, out, p, st, cx, cy, tx, ty, 20, dt);
          return out;
        }
        if (k === 'crate') {
          // swim along behind the grabber
          tx = Math.min(ox - 45, nd.x - 50); ty = bandY(oy);
          if (human) cpuSay(p, 'Push the crate! Swim into it!');
        } else if (k === 'exit' || k === 'wait') {
          tx = k === 'exit' ? st.exitX + 100 : nd.x - 50; ty = bandY(330); dead = 30;
          if (human && k === 'exit' && cx > st.exitX - 100) cpuSay(p, 'Through the door! Next deck!');
        } else {
          // light the thing: hover just up and to the left of it
          const g = pickGem();
          if (g && !(human && o.vx === 0 && o.vy === 0 && Math.hypot(ox - cx, oy - cy) > 260) && Math.hypot(ox - cx, oy - cy) < 260) {
            go(S, out, p, st, cx, cy, g.x - 10, bandY(g.y - 30), 14, dt);
            return out;
          }
          tx = nd.x - 50; ty = bandY(nd.y - 45);
          if (k === 'keyDoor') { tx = nd.x - 70; ty = bandY(nd.y - 50); }
          if (human) {
            const lit = M().isLit(st, nd.x, nd.y);
            if (lit) cpuSay(p, { lever: 'Over here! A lever!', wheel: 'A wheel! Hold the button!', key: 'A key! Grab it!', keyDoor: 'To the keyhole!', chest: 'The chest! Hold the button!' }[k] || 'Over here!');
          }
        }
        go(S, out, p, st, cx, cy, tx, ty, dead, dt);
        return out;
      }
      // the grabber
      const k = nd.kind, ref = nd.ref;
      const usableNow = ref && (ref.gold || M().isLit(st, nd.x, nd.y) || (k === 'keyDoor' && nd.door.gold));
      const known = ref && (ref.seen || usableNow || (k === 'keyDoor'));
      const behindLight = () => {
        const fx = st.fish ? st.fish.x : ox, fy = st.fish ? st.fish.y : oy;
        go(S, out, p, st, cx, cy, fx - 45, bandY(fy + 28), 24, dt);
      };
      const g = pickGem();
      if (g && M().isLit(st, g.x, g.y) && k !== 'crate') { go(S, out, p, st, cx, cy, g.x, g.y, 6, dt); return out; }
      if (k === 'glow' || k === 'puffer') {
        behindLight();
        if (human) cpuSay(p, k === 'glow' ? 'Flash the sleepy anemone!' : 'Flash the pufferfish!');
        return out;
      }
      if (k === 'crate') {
        const c = ref, side = c.x0 - PW / 2 - 1, mid = c.y0 + c.h - PH / 2 - 2;
        if (cx > c.x0) { behindLight(); return out; }
        if (Math.abs(cx - side) < 16 && Math.abs(cy - mid) < 14) { out.right = true; if (cy < mid - 3) out.down = true; return out; }
        go(S, out, p, st, cx, cy, side, mid, 6, dt);
        return out;
      }
      if (k === 'exit' || k === 'wait') {
        go(S, out, p, st, cx, cy, k === 'exit' ? st.exitX + 70 : nd.x - 70, bandY(360), 30, dt);
        return out;
      }
      if (!known) {
        behindLight();
        if (human) cpuSay(p, 'Light the way! I’ll follow.');
        return out;
      }
      // go to it; act once it's lit and in reach
      let tx = nd.x - 26, ty = nd.y;
      if (k === 'key') { tx = nd.x; ty = nd.y; }
      if (k === 'keyDoor') { tx = nd.x - 12; ty = nd.y; }
      if (k === 'chest') { tx = nd.x - 40; ty = SW.floor - 30; }
      const there = go(S, out, p, st, cx, cy, tx, ty, k === 'key' ? 4 : 8, dt);
      const reach = M().reachable(Object.assign({}, st, { inTick: true }), Object.assign({}, p, { x: p.x + cam }));
      if (!usableNow) { if (human && (there || Math.hypot(tx - cx, ty - cy) < 60)) cpuSay(p, 'Bring Glimmer here!'); return out; }
      if (reach === ref) {
        if (k === 'lever') out.act = 'tap';
        else out.act = P.hold === ref || !CPU.last[p.id].act ? true : false;
        if (P.hold !== ref && CPU.last[p.id].act) out.act = false;   // (let go once so the next press is fresh)
        if (k === 'wheel' || k === 'chest') { out.left = out.right = out.up = out.down = false; steer(out, p, cx, cy, cx, cy, 3); }
      }
      void there;
      return out;
    },
  });
})();
