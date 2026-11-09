/* Pip & Bo - Computer partner brain for 23-2 Runaway Pigs (mode 'pigherd'). */
'use strict';

(() => {
  /* 23-2 Runaway Pigs (MODES.pigherd): G.mst.herder says who herds this chase; the other keeps the gates. Both jobs
     read MODES.pigherd.plan(st), the same "what's next" the hint chips read: the herd (the free pigs, their middle and
     how far along the farm track they are), the next gate job and a shut gate the herd is up against.
     WALKING: a path over a 15 px grid of the chase (fences, haystacks, barns, stalls, the corn, the pond and the other
     places people can't walk; gates don't count, people climb them), re-planned every 0.25 s, steered with a speed
     controller (it presses toward the speed it wants and lets go, so it stops on a spot).
     HERDER (the pigs run from it): like a sheepdog. A pig in the mud first: walk right up to it and clap. Then, if a
     pig has strayed far from the others (or is close to an open side gate), it goes round behind that pig (on the far
     side from the herd) and walks it back; otherwise it walks behind the whole herd, on the far side from where the
     herd should go (along the track, then into the pen), and claps when it is close behind and the herd is slow.
     When a shut gate is in front of the herd it hangs back (about 230 px) so the pigs settle there, and waits.
     GATEKEEPER (the pigs ignore it): walks to the next job and stands by it on the track side: opens a forward gate,
     shuts a side gate, pulls a fork lever the right way, rolls the hay bale into the broken fence (walks round behind
     it and pushes), pulls the barn door rope when the herd is close (and again if it is about to shut on them), opens
     the pen and shuts it once every pig is in.
     It can't finish alone: pigs ignore the gatekeeper, and the herder can't open gates; gold help only comes while
     both are playing (in 1-player the person must have pressed something in the last 10 s). idleStop is 90 s here
     (a person keeping the gates often waits by a gate without pressing anything). With a person it says short things ("Open the gate!", "Clap behind them!"); bubbles only show in
     1-player mode (cpuSay). Team brains always play at full skill. */
  const M = () => MODES.pigherd;
  const CELL = 15;
  let gridCache = null;

  function grid(st) {
    const PHc = M().PH;
    const sig = st.k + ':' + st.len + ':' + st.hays.map(h => Math.round(h.x0 / 5) + ',' + Math.round(h.y0 / 5)).join(';');
    if (gridCache && gridCache.sig === sig && gridCache.st === st) return gridCache;
    const top = PHc.top - 8, cols = Math.ceil(st.len / CELL), rows = Math.ceil((PHc.bot - top) / CELL);
    const free = new Uint8Array(cols * rows), sol = M().playerSolids(st);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const cx = c * CELL + CELL / 2, cy = top + r * CELL + CELL / 2;
      const x0 = cx - PW / 2 - 1, x1 = cx + PW / 2 + 1, y0 = cy - PH / 2 - 1, y1 = cy + PH / 2 + 1;
      let ok = y0 >= top - 1 && y1 <= PHc.bot + 1 && x0 >= 0 && x1 <= st.len;
      if (ok) for (const s of sol) if (x0 < s.x1 && x1 > s.x0 && y0 < s.y1 && y1 > s.y0) { ok = false; break; }
      free[r * cols + c] = ok ? 1 : 0;
    }
    gridCache = { sig, st, cols, rows, free, top };
    return gridCache;
  }
  const cellOf = (g, x, y) => ({ c: clamp(Math.floor(x / CELL), 0, g.cols - 1), r: clamp(Math.floor((y - g.top) / CELL), 0, g.rows - 1) });
  const cellXY = (g, c, r) => ({ x: c * CELL + CELL / 2, y: g.top + r * CELL + CELL / 2 });
  // the nearest free cell to a spot (searching a few cells round it), or -1
  function nearFree(g, c0, r0, R) {
    let best = -1, bd = 1e9;
    for (let r = Math.max(0, r0 - R); r <= Math.min(g.rows - 1, r0 + R); r++) for (let c = Math.max(0, c0 - R); c <= Math.min(g.cols - 1, c0 + R); c++) {
      const i = r * g.cols + c; if (!g.free[i]) continue;
      const d = (r - r0) ** 2 + (c - c0) ** 2; if (d < bd) { bd = d; best = i; }
    }
    return best;
  }
  // breadth-first path from (x, y) to (tx, ty): a list of world points, or null
  function path(st, x, y, tx, ty) {
    const g = grid(st), n = g.cols * g.rows;
    const s = cellOf(g, x, y);
    let s0 = s.r * g.cols + s.c;
    if (!g.free[s0]) { s0 = nearFree(g, s.c, s.r, 8); if (s0 < 0) return null; }   // (squeezed into a corner: from the nearest free spot)
    const t = cellOf(g, tx, ty);
    let ti = t.r * g.cols + t.c;
    if (!g.free[ti]) { ti = nearFree(g, t.c, t.r, 6); if (ti < 0) return null; }
    if (ti === s0) return [cellXY(g, ti % g.cols, Math.floor(ti / g.cols))];
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
        if (prev[j] >= 0 || !g.free[j]) continue;
        if (dc && dr && !(g.free[r * g.cols + nc] && g.free[nr * g.cols + c])) continue;   // no corner cutting
        prev[j] = i; q.push(j);
      }
    }
    if (prev[ti] < 0) return null;
    const out = [];
    for (let i = ti; i !== s0; i = prev[i]) out.push(cellXY(g, i % g.cols, Math.floor(i / g.cols)));
    out.reverse();
    return out;
  }
  // press toward the speed that gets to (tx, ty), letting go near it
  function steer(out, p, cx, cy, tx, ty, dead, slowR) {
    const dx = tx - cx, dy = ty - cy, d = Math.hypot(dx, dy);
    const sp = d < dead ? 0 : Math.min(M().PH.walk, (d - dead * 0.5) * (slowR || 4.5));
    const vx = d > 0 ? dx / d * sp : 0, vy = d > 0 ? dy / d * sp : 0;
    const band = Math.min(28, sp * 0.6 + 4);
    if (vx - p.vx > band) out.right = true; else if (vx - p.vx < -band) out.left = true;
    if (vy - p.vy > band) out.down = true; else if (vy - p.vy < -band) out.up = true;
    return d < dead;
  }
  // follow a path to (tx, ty) (re-planned every 0.25 s); true when there
  function go(S, out, p, st, cx, cy, tx, ty, dead, dt) {
    S.pathT -= dt;
    const moved = !S.goal || Math.hypot(S.goal.x - tx, S.goal.y - ty) > 14;
    if (S.pathT <= 0 || moved) { S.pathT = 0.25; S.goal = { x: tx, y: ty }; S.path = path(st, cx, cy, tx, ty); }
    if (Math.hypot(tx - cx, ty - cy) < dead + 2) return steer(out, p, cx, cy, tx, ty, dead);
    const pt = S.path;
    if (!pt || !pt.length) { steer(out, p, cx, cy, tx, ty, dead); return false; }
    while (pt.length > 1 && Math.hypot(pt[0].x - cx, pt[0].y - cy) < CELL * 0.9) pt.shift();
    const k = Math.min(pt.length - 1, 2), w = pt[k];
    const last = pt.length - 1 <= 2;
    steer(out, p, cx, cy, last ? tx : w.x, last ? ty : w.y, last ? dead : 2, last ? 4.5 : 9);
    S.stuckT = Math.hypot(p.vx, p.vy) < 15 && (out.left || out.right || out.up || out.down) ? (S.stuckT || 0) + dt : 0;
    if (S.stuckT > 1.2) { S.wig = 0.4; S.wigD = (S.wigD || 1) * -1; S.stuckT = 0; }
    if (S.wig > 0) { S.wig -= dt; if (out.left || out.right) { out.up = S.wigD < 0; out.down = S.wigD > 0; } else { out.left = S.wigD < 0; out.right = S.wigD > 0; } }
    return false;
  }
  const bandY = y => clamp(y, M().PH.top + 10, M().PH.bot - 16);
  const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

  /* ---------- the herder ---------- */
  function herder(S, p, o, st, out, dt, cx, cy, human) {
    const PHc = M().PH, P = st.pl[p.id], pl = M().plan(st), hd = pl.herd;
    const clapNow = () => { if (P.cd <= 0) out.act = 'tap'; };
    // a pig in the mud: right up to it, then clap
    const mud = st.pigs.filter(q => q.state === 'wallow').sort((a, b) => dist(a.x, a.y, cx, cy) - dist(b.x, b.y, cx, cy))[0];
    if (mud) {
      const f = M().flowAt(st, mud.x, mud.y);
      const tx = mud.x - f.x * 46, ty = bandY(mud.y - f.y * 46);
      go(S, out, p, st, cx, cy, tx, ty, 10, dt);
      if (dist(cx, cy, mud.x, mud.y) < PHc.wallowNear - 25) clapNow();
      if (human) cpuSay(p, mud.name + ' is in the mud!');
      return;
    }
    if (!hd.n) {
      // every free pig is lost (Farmer Fran brings them back) or home: wait near the track
      const a = M().routeAt(st, Math.max(0, M().progress(st, cx, cy)));
      go(S, out, p, st, cx, cy, cx, bandY(a.y), 30, dt);
      return;
    }
    const pigs = hd.pigs.filter(q => q.state === 'run');
    if (!pigs.length) { go(S, out, p, st, cx, cy, hd.cx - 160, bandY(hd.cy), 30, dt); return; }   // (only gold-ribbon pigs: follow them home)
    // a shut gate in front of the herd: hang back so they settle there
    if (pl.block) {
      const g = pl.block, f = M().flowAt(st, hd.cx, hd.cy);
      const tx = Math.min(hd.minX - 150, g.cx - 260), ty = bandY(hd.cy - f.y * 120);
      go(S, out, p, st, cx, cy, tx, ty, 30, dt);
      if (human) cpuSay(p, 'Open the gate, ' + NAMES[st.keeper] + '!');
      return;
    }
    const goal = pl.goal;
    // the herd's body: far-off leaders (well ahead along the track) are left to trot on
    const sOf = q => M().progress(st, q.x, q.y);
    const ss = pigs.map(sOf).sort((a, b) => a - b), med = ss[Math.floor(ss.length / 2)];
    const body = pigs.filter(q => sOf(q) < med + 230);
    let mx = 0, my = 0;
    for (const q of body) { mx += q.x; my += q.y; }
    mx /= body.length; my /= body.length;
    const opens = M().openings(st);
    let stray = null, worst = 0;
    const loose = 70 + 22 * Math.sqrt(body.length), mys = M().progress(st, cx, cy);
    for (const q of pigs) {
      const lead = sOf(q) > med + 40;
      let score = lead ? -1 : dist(q.x, q.y, mx, my) - loose;
      for (const op of opens) { const d = dist(q.x, q.y, op.x, op.y); if (d < 150) score = Math.max(score, 160 - d); }
      // (a pig behind the herder: fetch it)
      if (sOf(q) < mys - 40) score = Math.max(score, 60);
      if (score > worst) { worst = score; stray = q; }
    }
    // a free spot about R px from (px, py) in the direction (dx, dy), turned a little if that is blocked
    const free = (x, y) => { const g = grid(st), c = cellOf(g, x, y); return y > PHc.top + 8 && y < PHc.bot - 12 && x > 10 && x < st.len - 10 && g.free[c.r * g.cols + c.c]; };
    const behind = (px, py, dx, dy, R) => {
      const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
      for (const a of [0, 0.45, -0.45, 0.9, -0.9, 1.35, -1.35, 1.8, -1.8]) {
        const c = Math.cos(a), sn = Math.sin(a), rx = dx * c - dy * sn, ry = dx * sn + dy * c;
        if (free(px + rx * R, py + ry * R) && free(px + rx * R * 0.6, py + ry * R * 0.6)) return { x: px + rx * R, y: py + ry * R };
      }
      return { x: px + dx * R, y: py + dy * R };
    };
    let tx, ty, aimX, aimY, near;
    if (stray) {
      // round behind the stray, on the far side from where it should go (the herd's middle, or away from the opening)
      let gx = mx, gy = my;
      for (const op of opens) if (dist(stray.x, stray.y, op.x, op.y) < 150) { gx = stray.x + (stray.x - op.x); gy = stray.y + (stray.y - op.y); }
      if (body.length <= 1) { const f = M().flowAt(st, stray.x, stray.y); gx = stray.x + f.x * 100; gy = stray.y + f.y * 100; }
      const b = behind(stray.x, stray.y, stray.x - gx, stray.y - gy, 62);
      tx = b.x; ty = b.y; aimX = stray.x; aimY = stray.y;
      near = dist(cx, cy, stray.x, stray.y) < 95;
    } else {
      // drive: behind the herd, on the far side from the goal
      const back = 50 + 16 * Math.sqrt(body.length);
      const b = behind(mx, my, mx - goal.x, my - goal.y, back);
      tx = b.x; ty = b.y; aimX = mx; aimY = my;
      near = body.some(q => dist(cx, cy, q.x, q.y) < 120);
    }
    ty = bandY(ty);
    // walking round the herd (not through it): on the wrong side of the pigs, go round them sideways first
    const ux = tx - aimX, uy = ty - aimY, uL = Math.hypot(ux, uy) || 1;
    const wrongSide = (cx - aimX) * ux + (cy - aimY) * uy < -0.15 * uL * dist(cx, cy, aimX, aimY);
    if (wrongSide && dist(cx, cy, aimX, aimY) < 230) {
      let sx = -uy / uL, sy = ux / uL;
      if ((cx - aimX) * sx + (cy - aimY) * sy < 0) { sx = -sx; sy = -sy; }
      const R = 125;
      let wx = aimX + sx * R, wy = aimY + sy * R;
      if (!free(wx, wy)) { wx = aimX - sx * R; wy = aimY - sy * R; }
      if (free(wx, wy)) { tx = wx + ux / uL * 30; ty = bandY(wy + uy / uL * 30); }
    }
    S.dbg = (stray ? 'stray ' + stray.name : 'drive') + ' ' + (tx | 0) + ',' + (ty | 0);
    go(S, out, p, st, cx, cy, tx, ty, 12, dt);
    // clap when close behind and the herd is slow (or a stray is near trouble)
    const slow = body.reduce((m, q) => m + Math.hypot(q.vx, q.vy), 0) / body.length < 70;
    const isBehind = mys < M().progress(st, aimX, aimY);
    if (near && isBehind && (slow || (stray && worst > 80))) {
      S.clapGap = (S.clapGap || 0) - dt;
      if (S.clapGap <= 0) { clapNow(); S.clapGap = 1.1; }
    }
    if (human) cpuSay(p, stray && worst > 80 ? 'Come back, ' + stray.name + '!' : 'Go on, piggies! Home!');
  }

  /* ---------- the gatekeeper ---------- */
  function keeper(S, p, o, st, out, dt, cx, cy, human) {
    const PHc = M().PH, pl = M().plan(st), hd = pl.herd, j = pl.job;
    const reach = () => M().reachable(st, Object.assign({}, p, { x: cx - p.w / 2, y: cy - p.h / 2 }));
    const tap = () => { if (!S.tapT || S.tapT <= 0) { out.act = 'tap'; S.tapT = 0.35; } };
    S.tapT = (S.tapT || 0) - dt;
    if (!j) { go(S, out, p, st, cx, cy, Math.min(st.len - 60, hd.maxX + 160), bandY(300), 40, dt); return; }
    if (j.kind === 'hay') { hay(S, p, st, out, dt, cx, cy, j.hay, human); return; }
    let tx, ty;
    const g = j.gate, lv = j.lever;
    if (lv) { tx = lv.x - 22; ty = lv.y; }
    else if (g.vert) { tx = g.cx - 26; ty = clamp(g.cy, Math.min(g.hy, g.ey) + 20, Math.max(g.hy, g.ey) - 20); }
    else {
      // a side gate on a fence along the field: stand on the track side of it
      const z = st.zones.find(q => q.id === g.zone), up = z ? (z.y0 + z.y1) / 2 < g.cy : g.cy < 300;
      tx = g.cx; ty = g.cy + (up ? 28 : -28);
    }
    ty = bandY(ty);
    go(S, out, p, st, cx, cy, tx, ty, 8, dt);
    const r = reach();
    const at = r && ((lv && r.lever === lv) || (g && r.gate === g));
    if (!at) {
      if (human && dist(cx, cy, tx, ty) < 200) cpuSay(p, { open: 'Opening the gate!', shut: 'I’ll shut the side gate!', lever: 'I’ll pull the lever!', barn: 'I’ll get the barn door!', pen: 'To the pen!' }[j.kind] || 'On my way!');
      return;
    }
    if (j.kind === 'open' && !g.open) tap();
    else if (j.kind === 'shut' && g.open) tap();
    else if (j.kind === 'lever' && !lv.b.open) tap();
    else if (j.kind === 'barn') {
      const close = hd.maxX > g.cx - 210 && hd.n;
      if (!g.open && close) tap();
      else if (g.open && g.openT < 1.4 && st.pigs.some(q => (q.state === 'run' || q.state === 'wallow') && q.x < j.passX)) tap();
      if (human && !g.open && !close) cpuSay(p, 'Bring them to the barn!');
    } else if (j.kind === 'pen') {
      const allPen = st.pigs.every(q => q.state === 'pen');
      if (allPen && g.open) tap();
      else if (!allPen && !g.open) tap();
      if (human && !allPen) cpuSay(p, 'Into the pen, piggies!');
    }
  }
  // rolling the hay bale into the gap: walk round to the far side of the bale from the gap, then push toward it
  function hay(S, p, st, out, dt, cx, cy, h, human) {
    const hx = h.x0 + h.w / 2, hy = h.y0 + h.h / 2, sx = h.slot.cx, sy = h.slot.cy;
    const dx = sx - hx, dy = sy - hy;
    let axis = Math.abs(dx) > 5 ? 'x' : 'y';
    if (Math.abs(dy) > 120 && Math.abs(dx) <= 30) axis = 'y';
    const dir = axis === 'x' ? Math.sign(dx) : Math.sign(dy);
    // the spot just behind the bale
    const bx = axis === 'x' ? (dir > 0 ? h.x0 - PW / 2 - 2 : h.x0 + h.w + PW / 2 + 2) : hx;
    const by = axis === 'y' ? (dir > 0 ? h.y0 - PH / 2 - 2 : h.y0 + h.h + PH / 2 + 2) : hy;
    const there = axis === 'x' ? Math.abs(cx - bx) < 10 && Math.abs(cy - by) < 12 : Math.abs(cy - by) < 10 && Math.abs(cx - bx) < 12;
    if (there || S.pushing) {
      S.pushing = there || (S.pushing && (axis === 'x' ? Math.abs(cy - by) < 16 : Math.abs(cx - bx) < 16));
      if (axis === 'x') { out.right = dir > 0; out.left = dir < 0; if (cy < by - 3) out.down = true; else if (cy > by + 3) out.up = true; }
      else { out.down = dir > 0; out.up = dir < 0; if (cx < bx - 3) out.right = true; else if (cx > bx + 3) out.left = true; }
      if (human) cpuSay(p, 'Rolling the hay!');
      return;
    }
    go(S, out, p, st, cx, cy, bx, bandY(by), 6, dt);
  }

  cpuBrain('pigherd', {
    // a person keeping the gates often just waits by a gate or the pen (the hint says "Wait by the pen gate"), so the
    // computer herder keeps going for 90 s of no presses, not 30. It still can't finish alone: pigs only go through
    // gates the person opens, and no gold help comes while the person is away.
    idleStop: 90,
    reset(S) { S.path = null; S.pathT = 0; S.goal = null; S.wig = 0; S.pushing = false; S.tapT = 0; S.clapGap = 0; },
    think(S, p, o, dt, info) {
      const out = {}, st = info.mst;
      if (!st || !st.walls || info.intro || st.state !== 'play' || G.introT > M().PH.introHold) return out;
      const cam = st.camX;
      const cx = p.x + cam + p.w / 2, cy = p.y + p.h / 2;
      const human = !info.partnerCpu;
      if (p.id === st.herder) herder(S, p, o, st, out, dt, cx, cy, human);
      else keeper(S, p, o, st, out, dt, cx, cy, human);
      return out;
    },
  });
})();
