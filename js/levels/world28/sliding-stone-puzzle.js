/* Pip & Bo - Level 28-3 Sliding Stone Puzzle (team, World 28 Pyramid Sands). */
'use strict';

/* ===== 28-3 Sliding Stone Puzzle (mode 'stonepuzzle', team) — Gavyn's pick =====
   "Push heavy stone blocks together to match the hieroglyph picture and open the secret door."
   Seen from above: a stone floor in a tomb, made of square cells. Three puzzles (def.roomWord 'Puzzle'). def.ownStep +
   def.ownHUD: the mode moves Pip and Bo cell by cell, draws the room and the HUD.
   - Move: ◀ ▶ ▲ ▼ (▲ is also W / ↑ / jump). One step takes 0.17 s; hold to keep walking.
   - Push: walk into a carved stone. A small stone slides one cell if the cell behind it is free.
     A HEAVY stone (bigger, darker, with two hand prints) only moves when both push together: one stands against it,
     the other right behind them, and both press the same way.
   - Pull: hold the action, face a small stone and step away from it: it follows you (to fix a stone stuck by a wall).
   - Start again: stand on the reset tile (a round lever plate in the corner) and hold the action for 1 s: every stone
     slides back to where it started ("The stones slide back!").
   - The picture: a stone tablet above the room shows which glyph goes where. The floor only shows empty sockets. Every
     glyph on its socket: the secret door in the top wall grinds open in a cloud of dust. Both walk into the doorway
     (the door cell and the cell in front of it) to go on.
   - Gold help (announced): after 75 s on one puzzle the sockets show their glyphs faintly.
   Room def: { title, tip, rows, slots: [[x, y, glyph]] }. rows: '#' wall, '.' floor, 'p' 'q' Pip's and Bo's starts,
   'R' the reset tile, 'D' the secret door (in a wall), and a stone: e eye, b bird, s scarab, u sun, n snake, c cat
   (capital letter = heavy stone of that glyph). Every stone's glyph has one socket.
   Every top-level name starts with sp / SP (Sfx.extra.sp*); level state lives in G.mst. */
const SP = { moveT: 0.17, bumpCd: 0.35, resetHold: 1.0, goldAfter: 75, openT: 1.4, clearT: 1.6, introHold: 0.4 };
const SP_DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const SP_GLYPH = { e: 'eye', b: 'bird', s: 'scarab', u: 'sun', n: 'snake', c: 'cat' };

/* ---------- the board ---------- */
function spBuild(st, def) {
  const rows = def.rows, h = rows.length, w = rows[0].length;
  const b = { w, h, wall: [], stones: [], slots: [], starts: [], reset: null, door: null };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const ch = rows[y][x];
    b.wall[y * w + x] = ch === '#' || ch === 'D';
    if (ch === 'D') b.door = { x, y };
    else if (ch === 'R') b.reset = { x, y };
    else if (ch === 'p') b.starts[0] = { x, y };
    else if (ch === 'q') b.starts[1] = { x, y };
    else if (/[a-zA-Z]/.test(ch)) b.stones.push({ g: ch.toLowerCase(), heavy: ch !== ch.toLowerCase(), x, y, x0: x, y0: y, fx: x, fy: y, t: 1, id: b.stones.length, onT: 0 });
  }
  for (const [x, y, g] of def.slots) b.slots.push({ x, y, g });
  // screen layout: as big as fits under the picture tablet
  b.cs = Math.floor(Math.min(64, 860 / w, 368 / h));
  b.ox = Math.round((W - w * b.cs) / 2); b.oy = H - h * b.cs - 14;
  st.b = b;
}
const spWall = (b, x, y) => x < 0 || y < 0 || x >= b.w || y >= b.h || (b.wall[y * b.w + x] && !(b.door && b.door.x === x && b.door.y === y && b.doorOpen));
const spStoneAt = (b, x, y) => (b.sunk ? null : b.stones.find(s => s.x === x && s.y === y) || null);
const spPlayerAt = (st, x, y, not) => st.pl.find((P, k) => k !== not && P.x === x && P.y === y) || null;
const spOnReset = (b, x, y) => !!b.reset && b.reset.x === x && b.reset.y === y;
const spFree = (st, x, y) => !spWall(st.b, x, y) && !spStoneAt(st.b, x, y) && !spPlayerAt(st, x, y);
const spSolved = b => b.stones.every(s => b.slots.some(o => o.x === s.x && o.y === s.y && o.g === s.g));
const spCellXY = (b, x, y) => ({ x: b.ox + (x + 0.5) * b.cs, y: b.oy + (y + 0.5) * b.cs });

/* ---------- moving ---------- */
function spDirOf(p) {
  const i = p.input;
  if (i.left && !i.right) return [-1, 0];
  if (i.right && !i.left) return [1, 0];
  if ((i.up || i.jump) && !i.down) return [0, -1];
  if (i.down && !(i.up || i.jump)) return [0, 1];
  return null;
}
function spGo(P, dx, dy) { P.fx = P.x; P.fy = P.y; P.x += dx; P.y += dy; P.t = 0; P.steps++; }
function spSlide(st, s, dx, dy, who) {
  s.fx = s.x; s.fy = s.y; s.x += dx; s.y += dy; s.t = 0;
  st.stat.pushes[who]++; st.moves++;
  Sfx.play('spScrape', s.heavy ? 0.7 : 1);
  const c = spCellXY(st.b, s.fx, s.fy);
  pyrDust(st, c.x - dx * st.b.cs * 0.4, c.y + st.b.cs * 0.3, s.heavy ? 5 : 2, st.b.cs * 0.5);
  if (s.heavy) pyrShake(0.08);
}
function spBump(st, P, p, msg) {
  if (P.bumpCd > 0) return;
  P.bumpCd = SP.bumpCd;
  if (msg) { const c = spCellXY(st.b, P.x, P.y); pyrPop(st, msg, c.x, c.y - st.b.cs * 0.8, '#ffe6a8', 15); Sfx.play('bonk'); }
}
function spPlayer(st, p, dt) {
  const P = st.pl[p.id], b = st.b;
  P.bumpCd -= dt; P.heavyCd -= dt;
  if (P.t < 1) { P.t = Math.min(1, P.t + dt / SP.moveT); if (P.t < 1) return; }
  if (st.state === 'clear') return;
  const d = spDirOf(p);
  if (!d) return;
  const [dx, dy] = d, tx = P.x + dx, ty = P.y + dy;
  // pull: hold the action, face a small stone, step away from it
  if (p.input.act && dx === -P.face[0] && dy === -P.face[1]) {
    const s = spStoneAt(b, P.x + P.face[0], P.y + P.face[1]);
    if (s && s.t >= 1) {
      if (s.heavy) { spBump(st, P, p, 'Too heavy to pull!'); return; }
      if (!spFree(st, tx, ty)) return;
      if (spOnReset(b, P.x, P.y)) { spBump(st, P, p, 'Stuck!'); return; }
      spGo(P, dx, dy); spSlide(st, s, dx, dy, p.id); st.stat.pulls[p.id]++;
      return;
    }
  }
  P.face = [dx, dy];
  if (spWall(b, tx, ty) || spPlayerAt(st, tx, ty, p.id)) { spBump(st, P, p, ''); return; }
  const s = spStoneAt(b, tx, ty);
  if (!s) { spGo(P, dx, dy); return; }
  if (s.t < 1) return;
  const bx = tx + dx, by = ty + dy;
  if (!spFree(st, bx, by)) { spBump(st, P, p, s.heavy ? '' : 'Stuck!'); return; }
  if (spOnReset(b, bx, by)) { spBump(st, P, p, 'Stuck!'); return; } // (a stone never slides onto the reset tile: it must stay free to stand on)
  if (!s.heavy) { spGo(P, dx, dy); spSlide(st, s, dx, dy, p.id); return; }
  // heavy: the partner must be right behind, pushing the same way
  const Q = st.pl[1 - p.id], q = G.players[1 - p.id], qd = spDirOf(q);
  if (Q.x === P.x - dx && Q.y === P.y - dy && Q.t >= 1 && qd && qd[0] === dx && qd[1] === dy) {
    spGo(P, dx, dy); spGo(Q, dx, dy); Q.face = [dx, dy];
    spSlide(st, s, dx, dy, p.id); st.stat.pushes[q.id]++; st.stat.heavy++;
    pyrPop(st, 'Heave!', spCellXY(b, s.x, s.y).x, spCellXY(b, s.x, s.y).y - b.cs * 0.7, C.gold, 16);
  } else if (P.heavyCd <= 0) {
    P.heavyCd = 2.2;
    const c = spCellXY(b, P.x, P.y);
    pyrPop(st, 'Heavy! ' + NAMES[1 - p.id] + ', push behind ' + NAMES[p.id] + '!', c.x, c.y - b.cs * 0.8, '#ffe6a8', 15);
    Sfx.play('bonk');
    if (typeof cpuSay === 'function' && cpuOn(1 - p.id)) cpuSay(q, 'Coming!');
  }
}
function spReset(st) {
  for (const s of st.b.stones) { s.fx = s.x; s.fy = s.y; s.x = s.x0; s.y = s.y0; s.t = 0; }
  // anyone standing where a stone comes back steps aside
  for (const P of st.pl) {
    if (!spStoneAt(st.b, P.x, P.y)) continue;
    for (const [dx, dy] of SP_DIRS) if (spFree(st, P.x + dx, P.y + dy)) { P.x += dx; P.y += dy; P.fx = P.x; P.fy = P.y; break; }
  }
  st.stat.resets++;
  Sfx.play('pyrStone');
  const c = spCellXY(st.b, st.b.reset.x, st.b.reset.y);
  pyrPop(st, 'The stones slide back!', W / 2, st.b.oy - 6, C.gold, 18);
  pyrDust(st, c.x, c.y, 6, 30);
}

/* ---------- the tick ---------- */
function spTick(st, dt) {
  const b = st.b, ps = G.players;
  st.t += dt;
  pyrFxTick(st, dt);
  for (const s of b.stones) { if (s.t < 1) s.t = Math.min(1, s.t + dt / SP.moveT); const on = b.slots.some(o => o.x === s.x && o.y === s.y && o.g === s.g); if (on && s.t >= 1) { if (s.onT === 0) { Sfx.play('pyrClick', 1.2); const c = spCellXY(b, s.x, s.y); for (let i = 0; i < 8; i++) pyrFx(st, c.x, c.y, (pyrVR() - 0.5) * 140, (pyrVR() - 0.5) * 140, 0.6, C.gold, 2.4, 0, 'spark'); } s.onT += dt; } else s.onT = 0; }
  if (st.state === 'clear') { st.clearT += dt; for (const p of ps) spPlayer(st, p, dt); spMirror(st); if (st.clearT > SP.clearT) st.goNext = true; return; }
  if (G.introT > SP.introHold) { for (const p of ps) { p.pendingAct = false; p.pendingJump = false; } spMirror(st); return; }
  st.puzT += dt;
  for (const p of ps) spPlayer(st, p, dt);
  // the reset tile
  if (b.reset && st.state === 'play') {
    const on = st.pl.findIndex((P, k) => P.x === b.reset.x && P.y === b.reset.y && P.t >= 1 && ps[k].input.act);
    if (on >= 0) { st.resetT += dt; if (st.resetT >= SP.resetHold) { st.resetT = 0; spReset(st); } } else st.resetT = 0;
  }
  // solved?
  if (st.state === 'play' && b.stones.every(s => s.t >= 1) && spSolved(b)) {
    st.state = 'open'; st.openT = 0; st.stat.solveT.push(st.puzT);
    b.sunk = true; // the stones sink into their sockets: you can walk over them now
    Sfx.play('pyrFanfare'); Sfx.play('pyrStone'); pyrShake(0.3);
    const c = spCellXY(b, b.door.x, b.door.y);
    pyrPop(st, 'The secret door opens!', c.x, c.y + b.cs * 1.2, C.gold, 22);
    for (const p of ps) rumble(p.id, 0.5, 0.5, 400);
  }
  if (st.state === 'open') {
    st.openT += dt;
    const c = spCellXY(b, b.door.x, b.door.y);
    if (pyrVR() < dt * 30) pyrFx(st, c.x + (pyrVR() - 0.5) * b.cs, c.y + b.cs * 0.4, (pyrVR() - 0.5) * 60, 20 + pyrVR() * 40, 1.2, 'rgba(222,196,150,0.6)', 6 + pyrVR() * 8, -10, 'dust');
    if (st.openT >= SP.openT && !b.doorOpen) { b.doorOpen = true; st.state = 'exit'; pyrShake(0.2); }
  }
  if (st.state === 'exit') {
    const at = P => (P.x === b.door.x && (P.y === b.door.y || P.y === b.door.y + 1)) && P.t >= 1;
    if (st.pl.every(at)) { st.state = 'clear'; st.clearT = 0; Sfx.play('pyrGold'); }
  }
  // gold help
  if (!st.gold && st.state === 'play' && st.puzT > SP.goldAfter && !st.noHelp) {
    st.gold = true; st.goldUsed++;
    pyrPop(st, 'Gold help: the sockets show their glyphs!', W / 2, b.oy + 20, C.gold, 18); Sfx.play('pyrGold');
  }
  spMirror(st);
}
// the platformer bodies follow the picture (so name tags, bubbles and confetti are in the right place)
function spMirror(st) {
  const b = st.b;
  for (const p of G.players) {
    const P = st.pl[p.id], u = pyrEase(P.t);
    const x = pyrLerp(P.fx, P.x, u), y = pyrLerp(P.fy, P.y, u);
    p.x = b.ox + (x + 0.5) * b.cs - p.w / 2; p.y = b.oy + (y + 0.5) * b.cs + b.cs * 0.28 - p.h - Math.abs(Math.sin(u * Math.PI)) * 3;
    p.face = P.face[0] || p.face; p.vx = 0; p.vy = 0; p.grounded = true; p.alive = true;
  }
}

/* ---------- the room ---------- */
function spRoom(st, L) {
  const def = L.def;
  st.room = def; st.k = def.roomIndex || 0;
  spBuild(st, def);
  const b = st.b;
  st.pl = [0, 1].map(k => ({ x: b.starts[k].x, y: b.starts[k].y, fx: b.starts[k].x, fy: b.starts[k].y, t: 1, face: [0, -1], bumpCd: 0, heavyCd: 0, steps: 0 }));
  st.state = 'play'; st.clearT = 0; st.openT = 0; st.puzT = 0; st.resetT = 0; st.gold = false; st.moves = 0;
  pyrFxNew(st);
  G.players.forEach((p, i) => { const input = p.input; Object.assign(p, makePlayer(i), { input, prevJump: true, prevAct: true }); });
  spMirror(st);
}
MODES.stonepuzzle = {
  SP,
  setup(st, L) {
    st.stat = { pushes: [0, 0], pulls: [0, 0], heavy: 0, resets: 0, solveT: [] };
    st.t = 0; st.goldUsed = 0; st.noHelp = !!MODES.stonepuzzle.testNoHelp;
    spRoom(st, L);
  },
  room(k, L) { spRoom(G.mst, L); },
  step(dt) {
    const st = G.mst;
    if (!st.b) return;
    spTick(st, dt);
    if (st.goNext) {
      st.goNext = false;
      const L = G.level;
      if (L.def.rooms && L.def.roomIndex < L.def.roomCount - 1) nextRoom(); else levelClear();
    }
  },
  draw() { const st = G.mst; if (st.b) spDraw(st); },
  drawTop() { const st = G.mst; if (st.b) spDrawTop(st); },
  hud() { const st = G.mst; if (st.b) spHud(st); },
  stats() {
    const st = G.mst, s = st.stat;
    if (!s) return [];
    const t = G.time, medal = t <= 240 && !st.goldUsed && s.resets <= 1 ? 'Gold' : t <= 420 && st.goldUsed <= 1 ? 'Silver' : 'Bronze';
    const words = s.resets === 0 && !st.goldUsed ? 'Not one reset! Master tomb builders!' : 'Puzzled it out together!';
    return [
      { label: 'Stones pushed', values: s.pushes.slice() },
      { label: 'Stones pulled', values: s.pulls.slice() },
      { label: 'Heavy heaves', value: s.heavy },
      { label: 'Medal', value: medal },
      words + ' Resets: ' + s.resets + (st.goldUsed ? ' · Gold help: ' + st.goldUsed + ' time' + (st.goldUsed > 1 ? 's' : '') : ''),
    ];
  },
  test: { wall: spWall, stoneAt: spStoneAt, free: spFree, solved: spSolved, DIRS: SP_DIRS },
};

/* ---------- drawing ---------- */
function spDraw(st) {
  const b = st.b, cs = b.cs, t = G.clock;
  // the tomb around the room
  pyrBlocks(0, 0, W, H, { lite: '#7a5634', mid: '#6a482a', dark: '#553820' }, 80, 40, 41 + st.k);
  ctx.fillStyle = 'rgba(20,10,4,0.35)'; ctx.fillRect(0, 0, W, H);
  // floor and walls
  for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) {
    const X = b.ox + x * cs, Y = b.oy + y * cs, h = hash(x + st.k * 31, y);
    if (b.wall[y * b.w + x] && !(b.door && b.door.x === x && b.door.y === y)) {
      ctx.fillStyle = '#8f6436'; ctx.fillRect(X, Y, cs, cs);
      ctx.fillStyle = h % 3 ? '#b98d58' : '#c49a5e'; ctx.fillRect(X + 2, Y + 2, cs - 4, cs * 0.62);
      ctx.fillStyle = 'rgba(255,235,190,0.22)'; ctx.fillRect(X + 3, Y + 3, cs - 6, 4);
    } else {
      ctx.fillStyle = h % 4 === 0 ? '#e0bc82' : h % 5 === 0 ? '#c99d62' : '#d6ad72'; ctx.fillRect(X, Y, cs, cs);
      ctx.strokeStyle = 'rgba(90,60,28,0.45)'; ctx.lineWidth = 1.5; ctx.strokeRect(X + 0.75, Y + 0.75, cs - 1.5, cs - 1.5);
      if (h % 9 === 0) { ctx.strokeStyle = 'rgba(90,60,28,0.4)'; ctx.beginPath(); ctx.moveTo(X + cs * 0.2, Y + cs * 0.3); ctx.lineTo(X + cs * 0.45, Y + cs * 0.5); ctx.stroke(); }
    }
  }
  // the secret door
  if (b.door) {
    const X = b.ox + b.door.x * cs, Y = b.oy + b.door.y * cs, k = st.state === 'open' ? pyrEase(Math.min(1, st.openT / SP.openT)) : b.doorOpen ? 1 : 0;
    ctx.fillStyle = '#1a0e06'; ctx.fillRect(X + 3, Y + 2, cs - 6, cs - 2);
    if (k > 0) { const g = ctx.createLinearGradient(0, Y, 0, Y + cs); g.addColorStop(0, 'rgba(255,220,130,' + 0.8 * k + ')'); g.addColorStop(1, 'rgba(255,180,80,0)'); ctx.fillStyle = g; ctx.fillRect(X + 3, Y + 2, cs - 6, cs - 2); }
    const jig = st.state === 'open' ? Math.sin(t * 50) * 1.5 : 0;
    ctx.save(); ctx.beginPath(); ctx.rect(X, Y, cs, cs); ctx.clip();
    ctx.fillStyle = '#a87a46'; ctx.fillRect(X + 4 + jig, Y + 3 - k * cs, cs - 8, cs - 3);
    pyrGlyph('eye', X + cs / 2 + jig, Y + cs / 2 - k * cs, cs / 46, 'rgba(50,28,10,0.65)');
    ctx.restore();
  }
  // sockets
  for (const o of b.slots) {
    const c = spCellXY(b, o.x, o.y), r = cs * 0.38;
    ctx.fillStyle = 'rgba(60,34,14,0.35)'; rr(c.x - r, c.y - r, r * 2, r * 2, 6); ctx.fill();
    ctx.strokeStyle = 'rgba(60,34,14,0.6)'; ctx.lineWidth = 2; ctx.setLineDash([4, 3]); rr(c.x - r, c.y - r, r * 2, r * 2, 6); ctx.stroke(); ctx.setLineDash([]);
    if (st.gold) { ctx.globalAlpha = 0.45 + 0.2 * Math.sin(t * 3); pyrGlyph(SP_GLYPH[o.g], c.x, c.y, cs / 52, C.gold); ctx.globalAlpha = 1; }
  }
  // the reset tile
  if (b.reset) {
    const c = spCellXY(b, b.reset.x, b.reset.y), k = st.resetT / SP.resetHold;
    ctx.fillStyle = '#8a6338'; circle(c.x, c.y, cs * 0.36); ctx.fill();
    ctx.strokeStyle = '#e8d2a0'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(c.x, c.y, cs * 0.22, 0.6, Math.PI * 1.9); ctx.stroke();
    ctx.fillStyle = '#e8d2a0'; ctx.beginPath(); ctx.moveTo(c.x + cs * 0.2, c.y - cs * 0.02); ctx.lineTo(c.x + cs * 0.3, c.y - cs * 0.16); ctx.lineTo(c.x + cs * 0.1, c.y - cs * 0.15); ctx.fill();
    if (k > 0) { ctx.strokeStyle = C.gold; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(c.x, c.y, cs * 0.42, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); ctx.stroke(); }
  }
  // stones (back rows first)
  const ss = b.stones.slice().sort((a, c) => a.y - c.y);
  for (const s of ss) spDrawStone(st, s);
  pyrFxDraw(st, false);
}
function spDrawStone(st, s) {
  const b = st.b, cs = b.cs, u = pyrEase(s.t), x = pyrLerp(s.fx, s.x, u), y = pyrLerp(s.fy, s.y, u);
  const X = b.ox + x * cs, Y = b.oy + y * cs, pad = s.heavy ? 2 : 6, on = s.onT > 0;
  if (b.sunk) {
    // sunk into its socket: a flat glowing tile
    const k = st.state === 'open' ? Math.min(1, st.openT / 0.6) : 1;
    ctx.save(); ctx.translate(0, k * 4);
    ctx.fillStyle = '#c99d62'; rr(X + pad, Y + pad, cs - pad * 2, cs - pad * 2, 6); ctx.fill();
    ctx.strokeStyle = C.gold; ctx.lineWidth = 2; rr(X + pad, Y + pad, cs - pad * 2, cs - pad * 2, 6); ctx.stroke();
    pyrGlyph(SP_GLYPH[s.g], X + cs / 2, Y + cs / 2, cs / 54, '#b8860b');
    ctx.restore();
    return;
  }
  ctx.fillStyle = 'rgba(20,10,4,0.35)'; rr(X + pad + 3, Y + pad + 6, cs - pad * 2, cs - pad * 2, 6); ctx.fill();
  ctx.fillStyle = s.heavy ? '#7f5630' : '#a87a46'; rr(X + pad, Y + pad + 4, cs - pad * 2, cs - pad * 2 - 2, 6); ctx.fill();
  ctx.fillStyle = s.heavy ? '#a07444' : '#d2a76c'; rr(X + pad, Y + pad - 2, cs - pad * 2, cs - pad * 2 - 4, 6); ctx.fill();
  ctx.strokeStyle = on ? C.gold : 'rgba(60,34,14,0.7)'; ctx.lineWidth = on ? 3 : 2; rr(X + pad, Y + pad - 2, cs - pad * 2, cs - pad * 2 - 4, 6); ctx.stroke();
  pyrGlyph(SP_GLYPH[s.g], X + cs / 2, Y + cs / 2 - 3, cs / (s.heavy ? 46 : 54), on ? '#7a4a00' : 'rgba(50,28,10,0.8)');
  if (s.heavy) {
    // two hand prints: it needs two
    for (const hx of [-0.3, 0.3]) { ctx.fillStyle = 'rgba(50,28,10,0.45)'; circle(X + cs / 2 + hx * cs, Y + cs * 0.82 - 3, cs * 0.06); ctx.fill(); }
  }
  if (on) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,200,80,' + (0.12 + 0.08 * Math.sin(G.clock * 4)) + ')'; rr(X + pad, Y + pad - 2, cs - pad * 2, cs - pad * 2 - 4, 6); ctx.fill(); ctx.restore(); }
}
function spDrawTop(st) {
  const b = st.b, cs = b.cs;
  // the picture tablet: the sockets' shape, with each glyph where it belongs
  const xs = b.slots.map(o => o.x), ys = b.slots.map(o => o.y);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const tc = pyrBig() ? 40 : 34, tw = (x1 - x0 + 1) * tc + 30, th = (y1 - y0 + 1) * tc + 40;
  const tx = W - tw - 22, ty = 14;
  ctx.fillStyle = 'rgba(20,10,4,0.5)'; rr(tx + 4, ty + 6, tw, th, 10); ctx.fill();
  ctx.fillStyle = '#d9b47a'; rr(tx, ty, tw, th, 10); ctx.fill();
  ctx.strokeStyle = '#8f6436'; ctx.lineWidth = 3; rr(tx, ty, tw, th, 10); ctx.stroke();
  text('The picture', tx + tw / 2, ty + 13, pyrBig() ? 15 : 12, '#5a3a1c', 'center', 'body');
  for (const o of b.slots) {
    const cx = tx + 15 + (o.x - x0 + 0.5) * tc, cy = ty + 26 + (o.y - y0 + 0.5) * tc;
    const done = b.stones.some(s => s.x === o.x && s.y === o.y && s.g === o.g && s.t >= 1);
    ctx.fillStyle = done ? 'rgba(255,205,80,0.55)' : 'rgba(90,60,28,0.18)'; rr(cx - tc / 2 + 2, cy - tc / 2 + 2, tc - 4, tc - 4, 4); ctx.fill();
    pyrGlyph(SP_GLYPH[o.g], cx, cy, tc / 40, done ? '#7a4a00' : '#3a2010');
    const heavy = b.stones.some(s => s.g === o.g && s.heavy);
    if (heavy) { ctx.fillStyle = 'rgba(60,34,14,0.5)'; circle(cx - tc * 0.3, cy + tc * 0.33, 2); ctx.fill(); circle(cx + tc * 0.3, cy + tc * 0.33, 2); ctx.fill(); }
  }
  // the door glows the way out
  if (b.door && st.state !== 'play') { const c = spCellXY(b, b.door.x, b.door.y); ctx.save(); ctx.globalAlpha = 0.6 + 0.3 * Math.sin(G.clock * 5); bigText('▲', c.x, c.y + cs * 0.9, 22, C.gold); ctx.restore(); }
  pyrFxDraw(st, true);
  pyrPopsDraw(st);
  if (st.state === 'clear') {
    const k = clamp(st.clearT / 0.4, 0, 1);
    ctx.save(); ctx.globalAlpha = k; bigText(st.k >= 2 ? 'All three puzzles solved!' : 'Puzzle solved!', W / 2, b.oy - 30, pyrBig() ? 40 : 34, C.gold, 0.8 + 0.2 * k); ctx.restore();
  }
}
function spHud(st) {
  const big = pyrBig(), y = big ? 92 : 80;
  pyrPill(fmtTime(G.time), 14, y, C.paper, 'left');
  const tip = st.state === 'exit' ? 'Both into the doorway!' : st.state === 'play' ? 'Match the picture! Heavy stones need two.' : '';
  if (tip) pyrPill(tip, 14, y + (big ? 36 : 32), st.state === 'exit' ? C.gold : C.paper, 'left', big ? 15 : 12);
}
Sfx.extra.spScrape = function (p) { pyrNoise(this, 0.18, 0.08 / (p || 1), 700 * (p || 1), 0, 300); this.tone(110 * (p || 1), 0.14, 'triangle', 0.03, 80); };
