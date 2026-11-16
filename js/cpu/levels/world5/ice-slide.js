/* Pip & Bo - Computer partner: ice slide. */
'use strict';

/* 5-3 Ice Slide (MODES.ice). The rooms are sliding puzzles for two, so the brain solves them like a puzzle:
   - A copy of the mode's own ice rules (slides, hops, drops through shelves, snow walking, buttons and gates, go back)
     tries every move of either player from every spot the two of you can rest in, one room at a time. It runs a little
     each step (mostly while the room card is up) and is shared by both players when the computer plays both.
   - From that map it knows how many moves every pair of spots is from the door. When both of you stand still, it looks
     at the moves that get closer: if one is its own, it makes it (after a short think); if only the partner's move
     helps, it waits for the partner (and after a while says "Your turn!", later which way to go). When either of you
     could go, a person gets a moment to go first; two computers let Pip go first.
   - Whatever the partner really does (another order, a wrong slide, a splash), it just looks again from where you both
     stand. When nothing works any more it holds ▼ to go back to its start, or asks the partner to. */
(() => {
  const ICE_K = {
    budget: 2,          // ms of map building per step (more while the room card is up)
    budgetIntro: 4,
    maxSim: 8,          // s: a move that takes longer than this doesn't count
    yourTurn: 2.5,      // s the partner stands still on their turn before "Your turn!"
    tellWay: 8,         // ... before saying which way (well before the level's own arrows)
    sayEvery: 6,        // s between those bubbles
    courtesy: 0.45,     // s a person gets to take a move either of you could make (Gavyn, Nov 2026: it felt slow at 1.2 s)
    react: 0.15,        // s it stands still before its own move
    ownAfter: 1.6,      // s: when the partner's move would be best but they don't make it, take its own helpful move instead
  };
  const ICE_SAY = { L: 'Slide left!', R: 'Slide right!', U: 'Hop up!', D: 'Drop down!', B: 'Hold ▼ to go back' };

  /* ---------- the copy of the ice rules (tiles + the two players, no sounds) ---------- */
  function iceWorld() {
    const L = G.level, st = G.mst;
    const sw = {};
    for (const ch in L.sw) sw[ch] = { plate: L.sw[ch].plate, type: L.sw[ch].type, tiles: L.sw[ch].tiles.slice() };
    return { L, grid: L.grid.map(r => r.slice()), snow: st.snow, plates: L.plates.map(pl => ({ x: pl.x, y: pl.y, letter: pl.letter })),
      sw, door: L.door, spawns: L.spawns.map(s => ({ x: s.x, y: s.y })) };
  }
  function wTile(W, tx, ty) {
    if (tx < 0 || tx >= COLS || ty < 0) return '#';
    if (ty >= ROWS) return '.';
    return W.grid[ty][tx];
  }
  function wSolid(W, S, ch, id) {
    if (ch === '#' || ch === 'P') return true;
    if (ch === 'o') return id === 0;
    if (ch === 'u') return id === 1;
    const s = W.sw[ch];
    if (s) return s.type === 'gate' ? !S.on[ch] : !!S.on[ch];
    return ch === 'X';
  }
  const wOv = (a, b) => a.x < b.x + PW - 0.001 && a.x + PW > b.x + 0.001 && a.y < b.y + PH - 0.001 && a.y + PH > b.y + 0.001;
  const wHit = (p, x, y, w, h) => p.x < x + w && p.x + PW > x && p.y < y + h && p.y + PH > y;
  function wMoveX(W, S, p, dx) {
    if (dx === 0) return 0;
    const x0 = p.x;
    p.x += dx;
    const ty1 = Math.floor((p.y + 0.01) / T), ty2 = Math.floor((p.y + PH - 0.01) / T);
    if (dx > 0) {
      const tx = Math.floor((p.x + PW - 0.001) / T);
      for (let ty = ty1; ty <= ty2; ty++) if (wSolid(W, S, wTile(W, tx, ty), p.id)) { p.x = tx * T - PW; break; }
    } else {
      const tx = Math.floor((p.x + 0.001) / T);
      for (let ty = ty1; ty <= ty2; ty++) if (wSolid(W, S, wTile(W, tx, ty), p.id)) { p.x = (tx + 1) * T; break; }
    }
    const o = S.b[1 - p.id];
    if (wOv(p, o)) { if (dx > 0) p.x = Math.max(x0, o.x - PW); else p.x = Math.min(x0, o.x + PW); }
    return p.x - x0;
  }
  function wMoveY(W, S, p, dy) {
    if (dy === 0) return;
    const prevBottom = p.y + PH;
    p.y += dy;
    const tx1 = Math.floor((p.x + 0.01) / T), tx2 = Math.floor((p.x + PW - 0.01) / T), o = S.b[1 - p.id];
    if (dy > 0) {
      const ty = Math.floor((p.y + PH - 0.001) / T), top = ty * T;
      for (let tx = tx1; tx <= tx2; tx++) {
        const ch = wTile(W, tx, ty);
        if (wSolid(W, S, ch, p.id) || (ch === '=' && prevBottom <= top + 0.5 && p.dropT <= 0)) { p.y = top - PH; p.vy = 0; break; }
      }
      if (wOv(p, o) && prevBottom <= o.y + 1) { p.y = o.y - PH; p.vy = o.vy; }
    } else {
      const ty = Math.floor((p.y + 0.001) / T);
      for (let tx = tx1; tx <= tx2; tx++) if (wSolid(W, S, wTile(W, tx, ty), p.id)) { p.y = (ty + 1) * T; p.vy = 0; break; }
      if (wOv(p, o) && o.y < p.y) S.bad = true; // (hopping up into a partner: not a move the map uses)
    }
  }
  function wProbe(W, S, p) {
    const by = p.y + PH, ty = Math.floor((by + 1) / T), top = ty * T;
    const tx1 = Math.floor((p.x + 0.01) / T), tx2 = Math.floor((p.x + PW - 0.01) / T);
    let tileG = false, one = false;
    for (let tx = tx1; tx <= tx2; tx++) {
      const ch = wTile(W, tx, ty);
      if (wSolid(W, S, ch, p.id)) tileG = true;
      else if (ch === '=' && p.dropT <= 0 && by <= top + 0.5) { tileG = true; one = true; }
    }
    const o = S.b[1 - p.id];
    const part = Math.abs(by - o.y) <= 1.5 && p.x < o.x + PW - 0.001 && p.x + PW > o.x + 0.001 && !(p.vy > 150 && p.vy - o.vy > 150);
    p.tileGround = tileG; p.onOneWay = one; p.onPartner = part; p.grounded = tileG || part;
  }
  function wSurf(W, p) {
    if (!p.grounded) return null;
    const cx = Math.floor((p.x + PW / 2) / T), ty = Math.floor((p.y + PH + 1) / T);
    return p.tileGround && W.snow && W.snow.has(ty * COLS + cx) && Math.abs(p.y + PH - ty * T) < 1 ? 'snow' : 'ice';
  }
  function wSnap(W, S, p) {
    const tx = Math.floor((p.x + PW / 2) / T) * T + (T - PW) / 2;
    if (Math.abs(tx - p.x) > 0.001) wMoveX(W, S, p, tx - p.x);
  }
  function wSettle(W, S, p, maxStep) {
    const o = S.b[1 - p.id];
    let tx = Math.floor((p.x + PW / 2) / T) * T + (T - PW) / 2;
    if (Math.abs(tx - p.x) <= 0.5) { p.x = tx; return; }
    if (wHit(o, tx, p.y, PW, PH)) tx += p.x < o.x ? -T : T;
    wMoveX(W, S, p, maxStep ? clamp(tx - p.x, -maxStep, maxStep) : tx - p.x);
  }
  function wCanSlide(W, S, p, d) { const x0 = p.x, got = wMoveX(W, S, p, d * 10); p.x = x0; return Math.abs(got) >= 9; }
  function wStop(W, S, p) {
    wProbe(W, S, p); wSnap(W, S, p);
    p.vx = 0; p.dir = 0; p.v = 0;
    p.mode = p.grounded ? (wSurf(W, p) === 'snow' ? 'free' : 'rest') : 'hop';
  }
  function wOnPlate(W, p) { return W.plates.some(pl => wHit(p, pl.x * T + 3, pl.y * T + 18, T - 6, 12)); }
  function wGates(W, S, init) {
    for (const ch in W.sw) {
      const s = W.sw[ch];
      const want = W.plates.some(pl => pl.letter === s.plate && S.b.some(p => wHit(p, pl.x * T + 3, pl.y * T + 18, T - 6, 12)));
      const blocked = s.tiles.some(t => S.b.some(p => wHit(p, t.x * T, t.y * T, T, T)));
      if (init) S.on[ch] = want || blocked; // (someone standing in a gate: it must have been open)
      else if (want !== !!S.on[ch] && !blocked) S.on[ch] = want;
    }
  }
  // a fresh simulation from two resting spots ([col, feet] each)
  function wStart(W, pos) {
    const S = { b: [], on: {}, t: 0, bad: false };
    for (let k = 0; k < 2; k++) {
      S.b.push({ id: k, x: pos[k * 2] * T + (T - PW) / 2, y: pos[k * 2 + 1] - PH, vx: 0, vy: 0, mode: 'rest', v: 0, dir: 0, dropT: 0,
        grounded: false, tileGround: false, onPartner: false, onOneWay: false, walk: 0, walkBlockT: 0, jumping: false,
        qDir: 0, qDirT: 0, qJump: 0, jumpBuf: 0, coyote: 0, pendJ: false, inJump: false, inDown: false });
    }
    wGates(W, S, true);
    for (const p of S.b) { wProbe(W, S, p); p.mode = wSurf(W, p) === 'snow' ? 'free' : 'rest'; }
    return S;
  }
  // one step of MODES.ice.step; act = { k, dir, jump, down } is pressed by player k on the first step
  function wTick(W, S, act) {
    const dt = DT, b = S.b;
    for (const p of b) {
      p.qDirT -= dt; p.qJump -= dt;
      const a = act && p.id === act.k ? act : null;
      if (a && S.t === 0) {
        if (a.dir) { p.qDir = a.dir; p.qDirT = 0.15; if (p.mode === 'free') { p.walk = a.dir; p.walkBlockT = 0; } }
        if (a.jump) { if (p.mode !== 'free') p.qJump = 0.15; else p.pendJ = true; }
      }
      p.inDown = !!(a && a.down && S.t === 0);
      p.inJump = !!(a && a.jump && S.t < 0.45);
    }
    wGates(W, S, false);
    for (const p of b) {
      if (p.mode === 'free') {
        const mv = p.walk;
        if (mv) p.vx = approach(p.vx, mv * PHYS.maxRun, (p.grounded ? PHYS.accG : PHYS.accA) * dt);
        else p.vx = approach(p.vx, 0, (p.grounded ? PHYS.fricG : PHYS.fricA) * dt);
        p.coyote = p.grounded ? PHYS.coyote : p.coyote - dt;
        if (p.pendJ) { p.jumpBuf = PHYS.buffer; p.pendJ = false; } else p.jumpBuf -= dt;
        if (p.jumpBuf > 0 && p.coyote > 0) { p.vy = -PHYS.jumpV; p.jumpBuf = 0; p.coyote = 0; p.jumping = true; p.grounded = false; }
        if (p.jumping && !p.inJump && p.vy < 0) { p.vy *= PHYS.cut; p.jumping = false; }
        if (p.vy >= 0) p.jumping = false;
        p.vy = Math.min(p.vy + PHYS.g * dt, PHYS.maxFall);
        p.dropT -= dt;
        if (!p.grounded) p.vx = 0; // (no steering in the air off the snow, as in the mode)
        continue;
      }
      p.walk = 0; p.dropT -= dt;
      if (p.mode === 'rest') {
        p.vx = 0;
        if (!p.grounded) p.mode = 'hop';
        else if (p.qDir && p.qDirT > 0) {
          if (wCanSlide(W, S, p, p.qDir)) { p.mode = 'slide'; p.dir = p.qDir; p.v = 120; p.qDir = 0; p.qDirT = 0; }
        } else if (p.qJump > 0) { p.qJump = 0; p.mode = 'hop'; p.vy = -660; p.grounded = false; }
        else if (p.inDown && p.onOneWay && !p.onPartner) { p.mode = 'hop'; p.dropT = 0.2; p.grounded = false; }
      }
      if (p.mode === 'slide') { p.v = Math.min(300, p.v + 3000 * dt); p.vx = p.dir * p.v; } else p.vx = 0;
      p.vy = Math.min(p.vy + PHYS.g * dt, PHYS.maxFall);
    }
    // sideways: the one in front first
    const order = b[0].vx && Math.sign(b[0].vx) === Math.sign(b[1].vx)
      && (b[0].vx > 0 ? b[1].x > b[0].x : b[1].x < b[0].x) ? [b[1], b[0]] : [b[0], b[1]];
    for (const p of order) {
      if (!p.vx) continue;
      const want = p.vx * dt, got = wMoveX(W, S, p, want);
      if (p.mode === 'slide' && Math.abs(got - want) > 0.001) {
        const o = S.b[1 - p.id];
        const byP = Math.abs(p.dir > 0 ? o.x - (p.x + PW) : p.x - (o.x + PW)) < 0.5 && p.y < o.y + PH && p.y + PH > o.y;
        if (byP && o.mode === 'slide') { if (o.dir !== p.dir) S.bad = true; }
        else wStop(W, S, p);
      } else if (p.mode === 'free') {
        if (Math.abs(got - want) > 0.001) { p.vx = 0; if (p.walk && (p.walkBlockT += dt) >= 0.12) p.walk = 0; } else p.walkBlockT = 0;
      }
    }
    const [up, lo] = b[1].y < b[0].y ? [b[1], b[0]] : [b[0], b[1]];
    wMoveY(W, S, up, up.vy * dt); wMoveY(W, S, lo, lo.vy * dt);
    for (const p of b) {
      wProbe(W, S, p);
      if (p.y > H + 60) { S.bad = true; return; }
      const surf = wSurf(W, p);
      if (p.mode === 'slide') { if (surf === 'snow') wStop(W, S, p); }
      else if (p.mode === 'hop') { if (p.grounded && p.vy >= 0) { wSnap(W, S, p); p.vx = 0; p.mode = wSurf(W, p) === 'snow' ? 'free' : 'rest'; } }
      else if (p.mode === 'free' && p.grounded && surf === 'ice') {
        if (Math.abs(p.vx) >= 40) { p.mode = 'slide'; p.dir = Math.sign(p.vx); p.v = Math.max(Math.abs(p.vx), 120); }
        else { wSnap(W, S, p); p.vx = 0; p.mode = wSurf(W, p) === 'snow' ? 'free' : 'rest'; }
      }
      if (p.mode === 'rest') { wSettle(W, S, p); if (wSurf(W, p) === 'snow') p.mode = 'free'; }
      else if (p.mode === 'free' && p.grounded && surf === 'snow' && Math.abs(p.vx) < 1 && !p.walk) wSettle(W, S, p, 90 * dt);
      // icy water
      const tx1 = Math.floor(p.x / T), tx2 = Math.floor((p.x + PW) / T), ty1 = Math.floor(p.y / T), ty2 = Math.floor((p.y + PH) / T);
      for (let ty = ty1; ty <= ty2; ty++) for (let tx = tx1; tx <= tx2; tx++) {
        if (wTile(W, tx, ty) === 'w' && wHit(p, tx * T + 2, ty * T + 10, T - 4, T - 10)) { S.bad = true; return; }
      }
    }
    S.t += dt;
  }
  const wCentred = p => Math.abs(p.x - (Math.floor((p.x + PW / 2) / T) * T + (T - PW) / 2)) <= 0.5;
  const wAtRest = p => p.grounded && (p.mode === 'rest' || (p.mode === 'free' && Math.abs(p.vx) < 1 && !p.walk && wCentred(p)));
  const wPos = S => [0, 1].flatMap(k => { const p = S.b[k]; return [Math.floor((p.x + PW / 2) / T), Math.round(p.y + PH)]; });
  // where a move of player k ends: { pos, t } or null (no move, a splash, too long)
  function wMove(W, pos, k, m) {
    const S = wStart(W, pos), p = S.b[k], o = S.b[1 - k];
    if (!p.grounded) return null;
    let act = null;
    if (m === 'L' || m === 'R') act = { k, dir: m === 'L' ? -1 : 1 };
    else if (m === 'U') act = { k, jump: true };
    else if (m === 'D') { if (p.mode !== 'rest' || !p.onOneWay || p.onPartner) return null; act = { k, down: true }; }
    else if (m === 'B') {
      // hold ▼ 1 s: back to the start spot (a partner standing on it goes to theirs)
      if (p.onOneWay || p.onPartner || wOnPlate(W, p)) return null;
      const sp = W.spawns[k];
      if (Math.abs(p.x - sp.x) < 1 && Math.abs(p.y - sp.y) < 1) return null;
      p.x = sp.x; p.y = sp.y; p.mode = 'hop';
      if (wHit(o, sp.x, sp.y, PW, PH)) { o.x = W.spawns[1 - k].x; o.y = W.spawns[1 - k].y; o.mode = 'hop'; }
      wProbe(W, S, p); wProbe(W, S, o);
    }
    let n = 0, calm = 0, last = '';
    for (; S.t < ICE_K.maxSim; n++) {
      wTick(W, S, act);
      if (S.bad) return null;
      // done when both have stood still (and not moved) for a few steps
      const here = S.b[0].x + ',' + S.b[0].y + ',' + S.b[1].x + ',' + S.b[1].y;
      calm = n >= 2 && wAtRest(S.b[0]) && wAtRest(S.b[1]) && here === last ? calm + 1 : 0;
      last = here;
      if (calm >= 3) break;
    }
    if (S.t >= ICE_K.maxSim) return null;
    const out = wPos(S);
    if (out.every((v, i) => v === pos[i])) return null;
    return { pos: out, t: S.t + (m === 'B' ? 1.1 : 0) };
  }
  function wGoal(W, pos) {
    const d = W.door;
    if (!d) return false;
    for (let k = 0; k < 2; k++) {
      const cx = pos[k * 2] * T + T / 2, cy = pos[k * 2 + 1] - PH / 2;
      if (!(cx > d.x + 2 && cx < d.x + d.w - 2 && cy > d.y && cy < d.y + d.h)) return false;
    }
    return true;
  }

  /* ---------- the map of the room (shared by both computer players) ---------- */
  let ICE_MAP = null;
  const ICE_MOVES = ['L', 'R', 'U', 'D', 'B'];
  function iceMap() {
    if (!ICE_MAP || ICE_MAP.L !== G.level || ICE_MAP.mst !== G.mst) {
      if (!G.mst.snow) return null;
      ICE_MAP = { L: G.level, mst: G.mst, W: iceWorld(), nodes: new Map(), queue: [], dist: null, sims: 0, hit: 0, miss: [] };
    }
    return ICE_MAP;
  }
  function iceNode(M, pos) {
    const key = pos.join(',');
    let n = M.nodes.get(key);
    if (!n) { n = { key, pos, edges: null, goal: wGoal(M.W, pos) }; M.nodes.set(key, n); M.queue.push(n); M.dist = null; }
    return n;
  }
  // build some more of the map; returns true when it is complete
  function iceGrow(M, ms) {
    const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
    const t0 = now();
    while (M.queue.length) {
      if (now() - t0 > ms) return false;
      const n = M.queue.shift();
      n.edges = [];
      for (let k = 0; k < 2; k++) for (const m of ICE_MOVES) {
        const r = wMove(M.W, n.pos, k, m);
        M.sims++;
        if (r) n.edges.push({ k, m, t: r.t, to: iceNode(M, r.pos) });
      }
    }
    if (!M.dist) {
      // moves to the door, counted backwards from every spot in the door (a go back counts as 1.5 moves)
      const back = new Map();
      for (const n of M.nodes.values()) { n.d = Infinity; for (const e of n.edges || []) { if (!back.has(e.to)) back.set(e.to, []); back.get(e.to).push({ from: n, c: e.m === 'B' ? 1.5 : 1 }); } }
      const open = [];
      for (const n of M.nodes.values()) if (n.goal) { n.d = 0; open.push(n); }
      while (open.length) {
        let bi = 0;
        for (let i = 1; i < open.length; i++) if (open[i].d < open[bi].d) bi = i;
        const n = open.splice(bi, 1)[0];
        for (const e of back.get(n) || []) if (n.d + e.c < e.from.d) { e.from.d = n.d + e.c; open.push(e.from); }
      }
      M.dist = true;
    }
    return true;
  }

  /* ---------- the brain ---------- */
  // a player standing still, as the mode sees it (resting on ice, or standing on snow in the middle of a tile)
  function iceStill(p) {
    const s = G.mst.ps && G.mst.ps[p.id];
    // (vy: landing on a shelf is still for a tick; standing on a head keeps the partner's one step of gravity)
    if (!s || !p.alive || !p.grounded || s.boing || Math.abs(p.vy) > (p.onPartner ? PHYS.g * DT + 1 : 1)) return false;
    if (s.mode === 'rest') return true;
    return s.mode === 'free' && Math.abs(p.vx) < 1 && !s.walk && wCentred(p);
  }
  const icePosOf = ps => [0, 1].flatMap(k => [Math.floor(cpuCx(ps[k]) / T), Math.round(cpuFeet(ps[k]))]);
  // what to press for each step of a move
  function iceScript(m, snow) {
    if (m === 'L' || m === 'R') return { m, n: 3, keys: { left: m === 'L', right: m === 'R' } };
    if (m === 'U') return { m, n: snow ? 54 : 3, keys: { jump: true } };
    if (m === 'D') return { m, n: 3, keys: { down: true } };
    return { m, n: 140, keys: { down: true }, gap: 2 }; // B: let go a moment, then hold ▼ for 1.1 s
  }

  cpuBrain('ice', {
    reset(st) { st.act = null; st.stillT = 0; st.sayT = 0; },
    think(st, p, o, dt, info) {
      const out = {};
      const M = iceMap();
      if (!M) return out;
      if (iceStill(p) && iceStill(o)) iceNode(M, icePosOf(G.players)); // (from the start spots while the room card is up)
      const done = iceGrow(M, G.introT > 0 ? ICE_K.budgetIntro : ICE_K.budget);
      if (st.sayT > 0) st.sayT -= dt;
      // a move under way: press its keys, then wait for it to start
      if (st.act) {
        const a = st.act;
        a.i++;
        if (a.gap && a.i <= a.gap) return out;
        if (a.i <= a.n + (a.gap || 0)) return Object.assign(out, a.keys);
        if (!iceStill(p) || a.i > a.n + (a.gap || 0) + 40) st.act = null;
        return out;
      }
      if (info.intro && G.introT > 0.5) return out;
      if (!iceStill(p) || !iceStill(o)) { st.stillT = 0; return out; }
      st.stillT += dt;
      if (!done) return out; // still thinking
      const n = iceNode(M, icePosOf(G.players));
      if (st.pred) { if (st.pred === n.key) M.hit++; else if (M.miss.length < 20) M.miss.push(st.pred + ' -> ' + n.key); st.pred = null; } // (tests: did the move end where the map said?)
      if (!n.edges) return out; // a new spot: it is added to the map next steps
      if (n.goal) return out;
      const best = k => {
        const es = n.edges.filter(e => e.k === k && e.to.d < Infinity);
        if (!es.length) return [];
        const dmin = Math.min(...es.map(e => e.to.d));
        // a move helps when it gets closer to the door (when nothing is finite from here, the best finite one)
        if (n.d < Infinity && dmin >= n.d) return [];
        return es.filter(e => e.to.d === dmin).sort((a, b) => a.t - b.t);
      };
      const mine = best(p.id), theirs = best(o.id);
      const react = ICE_K.react + (1 - info.skill) * 0.35; // (quick enough to get a turn with a partner who keeps sliding about)
      let go = null;
      if (mine.length && !theirs.length) go = mine[0];
      else if (mine.length && theirs.length) {
        const mineD = mine[0].to.d, theirD = theirs[0].to.d;
        if (mineD < theirD) go = mine[0];
        else if (mineD === theirD) {
          // either of us could go: Pip goes first between two computers; a person gets a moment first
          if (info.partnerCpu ? p.id === 0 : st.stillT >= react + ICE_K.courtesy) go = mine[0];
        } else if (!info.partnerCpu && st.stillT >= ICE_K.ownAfter) go = mine[0]; // (the person's move is better, but they wait for me)
      }
      if (go) {
        if (st.stillT < react) return out;
        const snow = G.mst.ps[p.id].mode === 'free';
        st.act = Object.assign({ i: 0 }, iceScript(go.m, snow));
        st.pred = info.partnerCpu ? go.to.key : null;
        st.stillT = 0;
        return out;
      }
      // the partner's turn: wait, and help a person who seems stuck
      if (theirs.length && !info.partnerCpu && st.sayT <= 0 && info.partnerIdle < CPU.idleStop) {
        const idle = Math.min(info.partnerIdle, st.stillT);
        if (idle >= ICE_K.tellWay) { cpuSay(p, ICE_SAY[theirs[0].m], 2.5); st.sayT = ICE_K.sayEvery; }
        else if (idle >= ICE_K.yourTurn) { cpuSay(p, 'Your turn!', 2); st.sayT = ICE_K.sayEvery; }
      }
      return out;
    },
  });
  // the level's "who moves next" arrows: the best move from where you both stand, { id, a } (a: L R U D B), or null
  // (still thinking, at the door, or no way on). Both must be standing still. Between moves that are equally good, the
  // quicker one, then Pip's.
  function iceGuide() {
    const M = iceMap();
    if (!M) return null;
    const n = iceNode(M, icePosOf(G.players));
    if (!iceGrow(M, 1.5) || !n.edges || n.goal || n.d === Infinity) return null;
    let best = null;
    for (const e of n.edges) {
      if (!(e.to.d < n.d)) continue;
      if (!best || e.to.d < best.to.d || (e.to.d === best.to.d && (e.t < best.t - 0.05 || (Math.abs(e.t - best.t) <= 0.05 && e.k < best.k)))) best = e;
    }
    return best && { id: best.k, a: best.m };
  }
  // (tests read the model: CPU.brains.ice.model)
  CPU.brains.ice.model = { wMove, iceWorld, iceMap, iceGrow, iceNode, icePosOf, iceStill, guide: iceGuide };
})();
