/* Pip & Bo - Level 28-2 Tomb Torch Explorers (team, World 28 Pyramid Sands). */
'use strict';

/* ===== 28-2 Tomb Torch Explorers (mode 'tombtorch', team) — Gavyn's pick =====
   "A dark tomb. One holds the torch to light the way, the other finds hidden switches and traps."
   A normal platform level (the engine moves Pip and Bo over the tile map), three rooms ("Chamber"), each one dark.
   The mode draws the whole tomb itself (over the engine's tiles) and lays a darkness layer on top with holes of
   light. Jobs (they swap every chamber; def room `torch` says who holds it):
     TORCH  (act label 'light'): carries a big flickering torch (light about 175 px round them). Press the action next
            to a brazier to light it: it then lights its corner of the room for good. The torch can't work switches.
     SEEKER (act label 'press'): has only a tiny glow (55 px). Switches are carved scarab stones in the walls that can
            only be seen in light; once seen they stay faintly marked. Press the action at a seen switch: its stone
            gate grinds down into the floor. The seeker also disarms traps: press the action next to a seen trap
            ("Click! Trap off.").
   Traps are loose floor tiles with spikes under them, hidden until lit (then marked). Stepping on an armed trap pops
   the spikes: "Ouch!", a bounce back and a dizzy moment (a cartoon bump, counted). A sprung trap re-arms after 1.5 s.
   Gems (lit or not, you can grab them by walking into them) count for the medal. Medal goals (MODES.tombtorch.medals,
   js/medals.js): Gold <= 4:00 with <= 2 ouches and >= 60% of the gems; Silver <= 6:40 with <= 8 ouches.
   Each chamber: open its gates in any order; the exit doorway (engine door 'E') lights up once every gate is open;
   both in the doorway moves on. Chamber 3 ends at a golden treasure chest.
   Room def: { title, torch: 0|1, tip, act, rows } where rows is the chamber layout (32×18, see world.js):
     '#' stone, '=' plank (jump up through), '1' '2' starts, 'E' exit (bottom-left cell of a 2×2 doorway),
     'a' 'b' 'c' switches (the cell a seeker stands in to press it), 'A' 'B' 'C' the gates they open (cells),
     'Y' a brazier (stands in that cell), '^' a hidden trap (the cell above the floor), '*' a gem, '$' the chest.
   Every top-level name starts with tt / TT (Sfx.extra.tt*); level state lives in G.mst. */
const TT = {
  torchR: 175, seekR: 55, brazierR: 190, exitR: 150, seeAt: 0.3,
  reach: 34, rearm: 1.5, ouchStun: 0.6, gateT: 0.7, introHold: 0.4,
};
// split a chamber layout into the engine's map (stone, planks, starts, exit) and the mode's things
function ttSplit(rows) {
  const map = rows.map(r => r.split('').map(ch => ('#=12E'.includes(ch) ? ch : '.')).join(''));
  return map;
}

/* ---------- light ---------- */
function ttLights(st) {
  const ls = [], t = G.clock;
  for (const p of G.players) {
    if (!p.alive) continue;
    const torch = p.id === st.torch, fl = torch ? 1 + Math.sin(t * 13 + p.id) * 0.03 + Math.sin(t * 7.3) * 0.03 : 1;
    ls.push({ x: p.x + p.w / 2 + (torch ? p.face * 10 : 0), y: p.y + (torch ? -4 : p.h / 2), r: (torch ? TT.torchR : TT.seekR) * fl, warm: torch ? 1 : 0, k: 1 });
  }
  for (const b of st.braziers) if (b.lit) ls.push({ x: b.x, y: b.y - 30, r: TT.brazierR * (1 + Math.sin(t * 9 + b.x) * 0.02), warm: 1, k: 1 });
  if (st.exitOpen) ls.push({ x: st.exit.x + T, y: st.exit.y + T, r: TT.exitR, warm: 0.6, k: 0.9 });
  return ls;
}
function ttLightAt(ls, x, y) {
  let m = 0;
  for (const l of ls) { const d = Math.hypot(x - l.x, y - l.y); if (d < l.r) m = Math.max(m, 1 - d / l.r); }
  return m;
}

/* ---------- the chamber ---------- */
function ttRoom(st, L) {
  const def = L.def, rows = def.rows;
  st.torch = def.torch || 0; st.room = def;
  st.sw = []; st.gates = {}; st.braziers = []; st.traps = []; st.gems = []; st.chest = null;
  for (let ty = 0; ty < ROWS; ty++) for (let tx = 0; tx < COLS; tx++) {
    const ch = (rows[ty] || '')[tx];
    const cx = tx * T + T / 2, by = (ty + 1) * T;
    if ('abc'.includes(ch)) st.sw.push({ id: ch, tx, ty, x: cx, y: by - 16, seen: false, done: false, glow: 0 });
    else if ('ABC'.includes(ch)) {
      const g = st.gates[ch.toLowerCase()] || (st.gates[ch.toLowerCase()] = { id: ch.toLowerCase(), cells: [], open: false, k: 0 });
      g.cells.push({ tx, ty }); L.grid[ty][tx] = 'P';
    }
    else if (ch === 'Y') st.braziers.push({ tx, ty, x: cx, y: by, lit: false, litT: 0 });
    else if (ch === '^') st.traps.push({ tx, ty, x0: tx * T, x1: tx * T + T, y: by, seen: false, off: false, upT: 0, armT: 0 });
    else if (ch === '*') st.gems.push({ x: cx, y: by - 15, got: false, t: 0, seen: false });
    else if (ch === '$') st.chest = { x: cx, y: by, open: 0 };
  }
  st.exit = L.door; st.exitOpen = false; st.started = false; st.hintT = 0; st.chamberStart = G.time;
  st.pl = [0, 1].map(() => ({ wrongCD: 0 }));
  pyrFxNew(st);
}
const ttGatesLeft = st => Object.values(st.gates).filter(g => !g.open).length;
function ttOpenGate(st, g, who) {
  if (g.open) return;
  g.open = true;
  for (const c of g.cells) G.level.grid[c.ty][c.tx] = '.';
  Sfx.play('pyrStone'); pyrShake(0.15);
  const top = Math.min(...g.cells.map(c => c.ty)), bot = Math.max(...g.cells.map(c => c.ty)), gx = g.cells[0].tx * T + T / 2;
  pyrDust(st, gx, (bot + 1) * T, 10, 40);
  for (let i = 0; i < 10; i++) pyrFx(st, gx + (pyrVR() - 0.5) * 30, top * T + pyrVR() * 20, (pyrVR() - 0.5) * 30, 20, 1, 'rgba(225,195,140,0.85)', 1.8, 500, 'sand');
  pyrPop(st, 'The gate opens!', gx, top * T - 10, C.gold, 18);
  if (!ttGatesLeft(st)) {
    st.exitOpen = true;
    Sfx.play('pyrGold');
    pyrPop(st, 'The way out is open!', W / 2, 120, C.gold, 22);
  }
}

/* ---------- the tick (runs after the engine moved the players) ---------- */
function ttWrong(st, p, what) {
  const P = st.pl[p.id];
  if (P.wrongCD > 0) return;
  P.wrongCD = 1.6;
  const o = 1 - p.id;
  pyrPop(st, what === 'brazier' ? NAMES[o] + ' has the torch!' : NAMES[o] + ' works the switches!', p.x + p.w / 2, p.y - 30, PCOL[o], 15);
  Sfx.play('bonk');
}
function ttStep(st, dt) {
  const ps = G.players, ls = ttLights(st);
  st.t += dt;
  if (!st.started && G.introT <= TT.introHold) st.started = true;
  for (const P of st.pl) P.wrongCD -= dt;
  // seeing things in the light
  for (const s of st.sw) {
    const l = ttLightAt(ls, s.x, s.y);
    s.glow = l;
    if (!s.seen && l > TT.seeAt) { s.seen = true; Sfx.play('pyrClick', 1.3); pyrPop(st, 'A switch!', s.x, s.y - 30, '#ffe08a', 15); st.stat.found++; }
  }
  for (const tr of st.traps) if (!tr.seen && ttLightAt(ls, tr.x0 + T / 2, tr.y - 6) > TT.seeAt) { tr.seen = true; if (!tr.off) pyrPop(st, 'Trap!', tr.x0 + T / 2, tr.y - 40, '#ff9a7a', 15); }
  for (const g of st.gems) if (!g.seen && ttLightAt(ls, g.x, g.y) > 0.2) g.seen = true;
  // actions
  for (const p of ps) {
    if (!p.alive || !p.pendingAct) continue;
    const cx = p.x + p.w / 2, feet = p.y + p.h, torch = p.id === st.torch;
    const b = st.braziers.find(b => !b.lit && Math.abs(b.x - cx) < 40 && Math.abs(b.y - feet) < 24);
    const s = st.sw.find(s => !s.done && Math.abs(s.x - cx) < TT.reach && Math.abs((s.ty + 1) * T - feet) < 26);
    const tr = st.traps.find(tr => !tr.off && tr.seen && Math.abs(tr.x0 + T / 2 - cx) < 46 && Math.abs(tr.y - feet) < 24);
    if (b) {
      p.pendingAct = false;
      if (!torch) { ttWrong(st, p, 'brazier'); continue; }
      b.lit = true; b.litT = 0; st.stat.braziers[p.id]++;
      Sfx.play('pyrFwoosh');
      for (let i = 0; i < 16; i++) pyrFx(st, b.x + (pyrVR() - 0.5) * 20, b.y - 34, (pyrVR() - 0.5) * 90, -60 - pyrVR() * 120, 0.9, i % 2 ? '#ffb347' : '#ffe08a', 2.5, -40, 'ember');
      continue;
    }
    if (s && s.seen) {
      p.pendingAct = false;
      if (torch) { ttWrong(st, p, 'switch'); continue; }
      s.done = true; st.stat.switches[p.id]++;
      Sfx.play('pyrClick', 1); Sfx.play('pyrLever', 1);
      const g = st.gates[s.id];
      if (g) ttOpenGate(st, g, p.id);
      continue;
    }
    if (tr) {
      p.pendingAct = false;
      if (torch) { ttWrong(st, p, 'trap'); continue; }
      tr.off = true; st.stat.disarmed[p.id]++;
      Sfx.play('pyrClick', 0.8);
      pyrPop(st, 'Click! Trap off.', tr.x0 + T / 2, tr.y - 40, '#9be7a0', 15);
      continue;
    }
  }
  // traps underfoot
  for (const tr of st.traps) {
    tr.upT = Math.max(0, tr.upT - dt);
    if (tr.off || tr.upT > 0) continue;
    for (const p of ps) {
      if (!p.alive || !p.grounded) continue;
      const cx = p.x + p.w / 2;
      if (Math.abs(p.y + p.h - tr.y) < 2 && cx > tr.x0 + 2 && cx < tr.x1 - 2) {
        tr.upT = TT.rearm; tr.seen = true; st.stat.ouch[p.id]++;
        const dir = p.vx > 10 ? -1 : p.vx < -10 ? 1 : -p.face;
        knock(p, dir * 230, -460, TT.ouchStun, 0.3);
        pyrPop(st, 'Ouch!', cx, p.y - 26, '#ffb0a0', 20);
        Sfx.play('pyrSquish', p.id === 1 ? 0.84 : 1); pyrShake(0.12); rumble(p.id, 0.5, 0.4, 160);
        pyrChips(st, cx, tr.y - 4, 6, tr.y - 1, '#d9d4c4');
      }
    }
  }
  // gems
  for (const g of st.gems) {
    g.t += dt;
    if (g.got) continue;
    for (const p of ps) if (p.alive && Math.abs(p.x + p.w / 2 - g.x) < 18 && Math.abs(p.y + p.h / 2 - g.y) < 22) {
      g.got = true; st.stat.gems[p.id]++;
      Sfx.play('pyrGold'); pyrPop(st, '+1 gem', g.x, g.y - 20, '#8fe3ff', 15);
      for (let i = 0; i < 10; i++) pyrFx(st, g.x, g.y, (pyrVR() - 0.5) * 160, (pyrVR() - 0.5) * 160, 0.6, i % 2 ? '#8fe3ff' : '#ffffff', 2.2, 0, 'spark');
      break;
    }
  }
  // gates sinking, braziers, embers from the torch
  for (const g of Object.values(st.gates)) if (g.open) g.k = Math.min(1, g.k + dt / TT.gateT);
  for (const b of st.braziers) { if (b.lit) { b.litT += dt; if (pyrVR() < dt * 6) pyrFx(st, b.x + (pyrVR() - 0.5) * 14, b.y - 38, (pyrVR() - 0.5) * 20, -40 - pyrVR() * 30, 1.2, '#ffb347', 1.8, -20, 'ember'); } }
  const th = ps[st.torch];
  if (th.alive && pyrVR() < dt * 9) pyrFx(st, th.x + th.w / 2 + th.face * 12, th.y - 18, (pyrVR() - 0.5) * 30, -50 - pyrVR() * 40, 0.9, pyrVR() < 0.5 ? '#ffb347' : '#ffe08a', 1.6, -30, 'ember');
  // dust motes drifting in the light
  if (pyrVR() < dt * 8) { const l = ls[Math.floor(pyrVR() * ls.length)]; if (l) pyrFx(st, l.x + (pyrVR() - 0.5) * l.r, l.y + (pyrVR() - 0.5) * l.r, (pyrVR() - 0.5) * 10, (pyrVR() - 0.5) * 10, 3, 'rgba(255,235,190,0.6)', 1.1, 0, 'spark'); }
  if (st.chest && st.exitOpen) st.chest.open = Math.min(1, st.chest.open + dt / 0.8);
  // a hint after a while with nothing found
  st.hintT += dt;
  pyrFxTick(st, dt);
}

MODES.tombtorch = {
  TT,
  medals: { bronze: 'Find the treasure chest', goals: [
    { key: 'time', gold: 240, silver: 400 },
    { key: 'ouch', gold: 2, silver: 8, word: 'Ouch' },
    { key: 'gems', gold: 0.6, more: true, pct: true, word: 'the gems' },
  ] },
  medalValues() {
    const st = G.mst, s = st.stat;
    return s ? { ouch: s.ouch[0] + s.ouch[1], gems: st.gemTotal ? (s.gems[0] + s.gems[1]) / st.gemTotal : 1 } : {};
  },
  setup(st, L) {
    st.stat = { gems: [0, 0], ouch: [0, 0], switches: [0, 0], braziers: [0, 0], disarmed: [0, 0], found: 0 };
    st.t = 0; st.gemTotal = 0;
    for (const r of L.def.rooms || [L.def]) for (const row of r.rows) st.gemTotal += (row.match(/\*/g) || []).length;
    ttRoom(st, L);
  },
  room(k, L) { ttRoom(G.mst, L); },
  step(dt) { const st = G.mst; if (st.sw) ttStep(st, dt); },
  draw() { const st = G.mst; if (st.sw) ttDraw(st); },
  drawTop() { const st = G.mst; if (st.sw) ttDrawTop(st); },
  hud() { const st = G.mst; if (st.sw) ttHud(st); },
  stats() {
    const st = G.mst, s = st.stat;
    if (!s) return [];
    const gems = s.gems[0] + s.gems[1], ouch = s.ouch[0] + s.ouch[1];
    const words = ouch === 0 ? 'Not one trap sprung! Careful explorers!' : ouch <= 3 ? 'A few pokes, but you found the way!' : 'Ouch, ouch! But you made it through the dark!';
    return [
      { label: 'Gems', values: s.gems.slice() },
      { label: 'Switches found', values: s.switches.slice() },
      { label: 'Traps disarmed', values: s.disarmed.slice() },
      words + ' Gems: ' + gems + ' of ' + st.gemTotal + ' · Ouches: ' + ouch + ' · Braziers lit: ' + (s.braziers[0] + s.braziers[1]),
    ];
  },
  test: { lights: ttLights, lightAt: ttLightAt, gatesLeft: ttGatesLeft },
};

/* ---------- drawing ---------- */
const TT_WALL = { lite: '#d2a76c', mid: '#bf9358', dark: '#a87c46', deep: '#2e1e10' };
const TT_BACK = [
  { band: '#2f6f8f', mural: ['eye', 'bird', 'sun', 'scarab'] },
  { band: '#8f3f2f', mural: ['snake', 'cat', 'reed', 'eye'] },
  { band: '#b8902a', mural: ['sun', 'scarab', 'bird', 'wave'] },
];
// the back wall and the stone tiles only change when a gate opens: drawn once, then copied each frame
let ttBg = { key: '' };
function ttDraw(st) {
  const L = G.level, t = G.clock;
  let gates = 0; for (const row of L.grid) for (const ch of row) if (ch === 'P') gates++;
  const key = [L.def.roomIndex || 0, gates, canvas.width, canvas.height, typeof artPlain === 'function' && artPlain()].join('|');
  if (ttBg.key === key && ttBg.level === L) ctx.drawImage(ttBg.cv, 0, 0, W, H);
  else {
    ttDrawRoom(L);
    const m = ctx.getTransform();
    if (!m.b && !m.c && !m.e && !m.f && Math.abs(m.a * W - canvas.width) < 1 && Math.abs(m.d * H - canvas.height) < 1 && ctx.globalAlpha === 1 && ctx.globalCompositeOperation === 'source-over') {
      const cv = document.createElement('canvas'); cv.width = canvas.width; cv.height = canvas.height; cv.getContext('2d').drawImage(canvas, 0, 0); ttBg = { key, level: L, cv };
    }
  }
  ttDrawLive(st);
}
function ttDrawRoom(L) {
  const look = TT_BACK[(L.def.roomIndex || 0) % TT_BACK.length];
  // the back wall
  pyrBlocks(0, 0, W, H, { lite: '#b08758', mid: '#9a7448', dark: '#7f5c36' }, 60, 30, 31 + (L.def.roomIndex || 0));
  ctx.fillStyle = look.band; ctx.fillRect(0, 96, W, 5); ctx.fillRect(0, 146, W, 5);
  ctx.fillStyle = 'rgba(255,220,150,0.18)'; ctx.fillRect(0, 101, W, 45);
  for (let i = 0; i < 14; i++) pyrGlyph(look.mural[i % look.mural.length], 34 + i * 68, 124, 1, 'rgba(50,28,10,0.5)');
  // big painted figures: a boat on the river and a pyramid
  ctx.strokeStyle = 'rgba(50,28,10,0.35)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(380, 300); ctx.quadraticCurveTo(470, 340, 560, 300); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(470, 318); ctx.lineTo(470, 250); ctx.lineTo(510, 290); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(650, 360); ctx.lineTo(720, 260); ctx.lineTo(790, 360); ctx.closePath(); ctx.stroke();
  ctx.fillStyle = 'rgba(30,16,6,0.38)'; ctx.fillRect(0, 0, W, H);
  // stone tiles
  for (let ty = 0; ty < ROWS; ty++) for (let tx = 0; tx < COLS; tx++) {
    const ch = L.grid[ty][tx], x = tx * T, y = ty * T;
    if (ch === '#') {
      const h = hash(tx, ty);
      ctx.fillStyle = h % 5 === 0 ? TT_WALL.lite : h % 7 === 0 ? TT_WALL.dark : TT_WALL.mid;
      ctx.fillRect(x, y, T, T);
      ctx.fillStyle = 'rgba(255,235,190,0.12)'; ctx.fillRect(x + 1, y + 1, T - 3, 2); ctx.fillRect(x + 1, y + 3, 2, T - 6);
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x, y + T - 3, T, 3); ctx.fillRect(x + T - 2, y, 2, T);
      if (h % 6 === 1) { ctx.fillStyle = 'rgba(40,20,8,0.3)'; circle(x + 6 + (h >> 4) % (T - 12), y + 6 + (h >> 8) % (T - 12), 1.3); ctx.fill(); }
      if (L.grid[ty - 1] && L.grid[ty - 1][tx] !== '#' && L.grid[ty - 1][tx] !== 'P') { ctx.fillStyle = '#c49a5e'; ctx.fillRect(x, y, T, 4); ctx.fillStyle = 'rgba(255,240,200,0.4)'; ctx.fillRect(x, y, T, 1.2); ctx.fillStyle = 'rgba(40,20,8,0.3)'; ctx.fillRect(x, y + 4, T, 2); }
    } else if (ch === '=') {
      ctx.fillStyle = '#8a6338'; rr(x, y + 2, T, 9, 3); ctx.fill();
      ctx.fillStyle = '#b98d58'; ctx.fillRect(x + 2, y + 3, T - 4, 3);
      ctx.strokeStyle = '#4a2c12'; ctx.lineWidth = 1.2; rr(x, y + 2, T, 9, 3); ctx.stroke();
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x + T / 2 - 2, y + 11, 4, 8);
    }
  }
}
function ttDrawLive(st) {
  const L = G.level, t = G.clock;
  // the exit doorway
  if (st.exit) {
    const d = st.exit;
    ctx.fillStyle = '#1a0e06'; rr(d.x + 4, d.y - 4, d.w - 8, d.h + 4, 8); ctx.fill();
    if (st.exitOpen) {
      const g = ctx.createLinearGradient(0, d.y, 0, d.y + d.h);
      g.addColorStop(0, '#ffe9a8'); g.addColorStop(1, '#ffb84a');
      ctx.fillStyle = g; rr(d.x + 8, d.y, d.w - 16, d.h, 6); ctx.fill();
    }
    ctx.strokeStyle = '#c49a5e'; ctx.lineWidth = 5; rr(d.x + 4, d.y - 4, d.w - 8, d.h + 4, 8); ctx.stroke();
    pyrGlyph('sun', d.x + d.w / 2, d.y - 16, 0.7, st.exitOpen ? C.gold : 'rgba(196,154,94,0.8)');
  }
  // gates
  for (const g of Object.values(st.gates)) {
    if (g.k >= 1) continue;
    const top = Math.min(...g.cells.map(c => c.ty)), bot = Math.max(...g.cells.map(c => c.ty)), x = g.cells[0].tx * T;
    const h = (bot - top + 1) * T, sink = pyrEase(g.k) * h, jig = g.open && g.k < 1 ? Math.sin(t * 50) * 1.5 : 0;
    ctx.save(); ctx.beginPath(); ctx.rect(x - 2, top * T, T + 4, h); ctx.clip();
    ctx.fillStyle = '#5e4128'; ctx.fillRect(x + jig, top * T + sink, T, h);
    ctx.fillStyle = '#7f5c36'; ctx.fillRect(x + 3 + jig, top * T + sink + 3, T - 6, h - 6);
    ctx.fillStyle = 'rgba(255,235,190,0.18)'; ctx.fillRect(x + 3 + jig, top * T + sink + 3, 3, h - 6);
    ctx.fillStyle = 'rgba(30,16,6,0.25)'; ctx.fillRect(x + T - 7 + jig, top * T + sink + 3, 4, h - 6);
    for (let i = 0; i < bot - top + 1; i++) pyrGlyph(['eye', 'scarab', 'reed', 'sun', 'bird'][i % 5], x + T / 2 + jig, top * T + sink + i * T + 15, 0.55, 'rgba(30,16,6,0.55)');
    ctx.restore();
  }
  // switches (only drawn where lit, or faintly once seen)
  for (const s of st.sw) {
    const vis = Math.max(s.glow > 0.05 ? Math.min(1, s.glow * 2.5) : 0, s.seen ? 0.55 : 0);
    if (vis <= 0) continue;
    ctx.save(); ctx.globalAlpha = vis;
    ctx.fillStyle = s.done ? '#5e4128' : '#9a7448'; rr(s.x - 13, s.y - 13, 26, 26, 4); ctx.fill();
    ctx.strokeStyle = s.done ? 'rgba(255,205,80,0.9)' : '#4a2c12'; ctx.lineWidth = 2; rr(s.x - 13, s.y - 13, 26, 26, 4); ctx.stroke();
    pyrGlyph('scarab', s.x, s.y + (s.done ? 2 : 0), 0.8, s.done ? C.gold : '#3a2010');
    if (s.seen && !s.done) { ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 5); ctx.strokeStyle = '#ffe08a'; ctx.lineWidth = 2; rr(s.x - 16, s.y - 16, 32, 32, 6); ctx.stroke(); }
    ctx.restore();
  }
  // traps
  for (const tr of st.traps) {
    const x = tr.x0, y = tr.y, lit = ttLightAt(ttLights(st), x + T / 2, y - 6);
    if (tr.upT > 0) {
      const k = Math.min(1, (TT.rearm - tr.upT) / 0.08) * Math.min(1, tr.upT / 0.3);
      ctx.fillStyle = '#d9d4c4'; ctx.strokeStyle = '#6a6458'; ctx.lineWidth = 1.2;
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(x + 3 + i * 7, y); ctx.lineTo(x + 6.5 + i * 7, y - 16 * k); ctx.lineTo(x + 10 + i * 7, y); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    }
    if (!(tr.seen || lit > 0.15)) continue;
    ctx.save(); ctx.globalAlpha = tr.seen ? 1 : Math.min(1, lit * 3);
    ctx.fillStyle = tr.off ? 'rgba(120,200,120,0.35)' : 'rgba(255,90,60,0.28)'; ctx.fillRect(x + 1, y - 3, T - 2, 3);
    ctx.fillStyle = 'rgba(20,10,4,0.75)'; for (let i = 0; i < 4; i++) { circle(x + 6 + i * 6, y + 3, 1.6); ctx.fill(); }
    if (tr.off) { ctx.strokeStyle = '#7fd08a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 9, y - 9); ctx.lineTo(x + 13, y - 5); ctx.lineTo(x + 21, y - 14); ctx.stroke(); }
    else if (tr.seen) { ctx.fillStyle = '#ff7a5a'; ctx.font = '700 13px "Atkinson Hyperlegible", sans-serif'; ctx.textAlign = 'center'; ctx.fillText('!', x + T / 2, y - 8); }
    ctx.restore();
  }
  // braziers
  for (const b of st.braziers) {
    ctx.fillStyle = 'rgba(20,10,4,0.3)'; ctx.beginPath(); ctx.ellipse(b.x + 1, b.y + 1, 14, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4a3020'; ctx.fillRect(b.x - 3, b.y - 24, 6, 24); ctx.fillRect(b.x - 10, b.y - 4, 20, 4);
    ctx.fillStyle = '#7a5a40'; ctx.fillRect(b.x - 3, b.y - 24, 2, 24);
    ctx.fillStyle = '#b8902a'; ctx.beginPath(); ctx.moveTo(b.x - 15, b.y - 30); ctx.lineTo(b.x + 15, b.y - 30); ctx.lineTo(b.x + 9, b.y - 20); ctx.lineTo(b.x - 9, b.y - 20); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#6e5418'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = 'rgba(255,240,180,0.45)'; ctx.fillRect(b.x - 13, b.y - 30, 26, 2);
    ctx.fillStyle = 'rgba(80,50,10,0.3)'; ctx.beginPath(); ctx.moveTo(b.x + 4, b.y - 28); ctx.lineTo(b.x + 15, b.y - 30); ctx.lineTo(b.x + 9, b.y - 20); ctx.lineTo(b.x + 3, b.y - 20); ctx.closePath(); ctx.fill();
    if (b.lit) pyrFlame(b.x, b.y - 28, 1.1 * Math.min(1, b.litT * 3), t + b.x, true);
    else { ctx.fillStyle = '#2a1a10'; ctx.fillRect(b.x - 10, b.y - 33, 20, 4); }
  }
  // gems
  for (const g of st.gems) {
    if (g.got) continue;
    const bob = Math.sin(g.t * 3 + g.x) * 3;
    ctx.fillStyle = 'rgba(20,10,4,0.22)'; ctx.beginPath(); ctx.ellipse(g.x, g.y + 16, 7 - bob * 0.5, 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.translate(g.x, g.y + bob);
    ctx.fillStyle = 'rgba(79,208,255,0.18)'; circle(0, 0, 13); ctx.fill();
    ctx.fillStyle = '#4fd0ff'; ctx.strokeStyle = '#1a6f9a'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(8, -2); ctx.lineTo(0, 10); ctx.lineTo(-8, -2); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#2a9ad0'; ctx.beginPath(); ctx.moveTo(0, -2); ctx.lineTo(8, -2); ctx.lineTo(0, 10); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.moveTo(-3, -5); ctx.lineTo(0, -8); ctx.lineTo(1, -3); ctx.closePath(); ctx.fill();
    const sp = Math.sin(t * 4 + g.x); if (sp > 0.6) { ctx.fillStyle = 'rgba(255,255,255,' + (sp - 0.6) * 2 + ')'; ctx.fillRect(5, -12, 1.5, 6); ctx.fillRect(2.75, -9.75, 6, 1.5); }
    ctx.restore();
  }
  // the treasure chest
  if (st.chest) {
    const c = st.chest, o = pyrEase(c.open);
    ctx.fillStyle = 'rgba(20,10,4,0.3)'; ctx.beginPath(); ctx.ellipse(c.x + 2, c.y + 1, 32, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#b8902a'; rr(c.x - 26, c.y - 30, 52, 30, 4); ctx.fill();
    ctx.fillStyle = '#8a6a1a'; ctx.fillRect(c.x + 14, c.y - 28, 10, 26); ctx.fillRect(c.x - 26, c.y - 8, 52, 6);
    ctx.fillStyle = '#e8c860'; ctx.fillRect(c.x - 24, c.y - 28, 48, 2); ctx.fillRect(c.x - 20, c.y - 30, 6, 30); ctx.fillRect(c.x + 14, c.y - 30, 6, 30);
    ctx.fillStyle = '#6e5418'; rr(c.x - 5, c.y - 22, 10, 10, 2); ctx.fill(); ctx.fillStyle = '#ffe08a'; circle(c.x, c.y - 17, 1.8); ctx.fill();
    ctx.strokeStyle = '#6e5418'; ctx.lineWidth = 2; rr(c.x - 26, c.y - 30, 52, 30, 4); ctx.stroke();
    ctx.save(); ctx.translate(c.x - 26, c.y - 30); ctx.rotate(-o * 1.1);
    ctx.fillStyle = '#d9b03a'; rr(0, -14, 52, 14, 6); ctx.fill(); ctx.strokeStyle = '#6e5418'; ctx.stroke();
    ctx.restore();
    if (o > 0.3) { ctx.fillStyle = 'rgba(255,220,100,' + 0.5 * o + ')'; circle(c.x, c.y - 34, 30 * o); ctx.fill(); }
  }
  pyrFxDraw(st, false);
}
function ttDrawTop(st) {
  const t = G.clock, th = G.players[st.torch];
  // the torch in its holder's hand
  if (th.alive) {
    const hx = th.x + th.w / 2 + th.face * 11, hy = th.y + 8;
    pyrTorchStick(hx, hy - 10, 22, th.face * 0.25);
    pyrFlame(hx - th.face * 2, hy - 12, 0.85, t, true);
  }
  // the seeker's little glow stone
  const sk = G.players[1 - st.torch];
  if (sk.alive) { ctx.fillStyle = 'rgba(160,230,255,0.85)'; circle(sk.x + sk.w / 2 + sk.face * 9, sk.y + 14, 3.5); ctx.fill(); }
  pyrFxDraw(st, true);
  // darkness with holes of light
  const ls = ttLights(st);
  pyrDarkness(0.94, ls);
  // the switches and gems that are seen stay faintly visible through the dark
  for (const s of st.sw) if (s.seen && !s.done) { ctx.save(); ctx.globalAlpha = 0.35 + 0.25 * Math.sin(t * 4); ctx.strokeStyle = '#ffe08a'; ctx.lineWidth = 2; rr(s.x - 15, s.y - 15, 30, 30, 6); ctx.stroke(); ctx.restore(); }
  for (const tr of st.traps) if (tr.seen && !tr.off) { ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = '#ff7a5a'; ctx.fillRect(tr.x0 + 4, tr.y - 2, T - 8, 2); ctx.restore(); }
  // name rings so nobody gets lost in the dark
  for (const p of G.players) if (p.alive) { ctx.strokeStyle = PCOL[p.id]; ctx.globalAlpha = 0.5; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(p.x + p.w / 2, p.y + p.h + 1, 14, 4, 0, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1; }
  pyrPopsDraw(st);
}
function ttHud(st) {
  const s = st.stat, big = pyrBig();
  const gems = s.gems[0] + s.gems[1];
  pyrPill(fmtTime(G.time) + '   Gems ' + gems + '/' + st.gemTotal, W - 14, 12, C.paper, 'right');
  pyrPill(st.exitOpen ? 'The way out is open!' : 'Gates to open: ' + ttGatesLeft(st), W - 14, big ? 52 : 46, st.exitOpen ? C.gold : C.paper, 'right');
  const tc = st.torch, sk = 1 - tc, y = big ? 92 : 80;
  const job = (id, word) => (pyrCpu(id) ? NAMES[id] + ' (computer) ' + word : NAMES[id] + ': ' + word);
  ctx.font = '700 ' + (big ? 16 : 12) + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
  const s1 = job(tc, 'torch (light the braziers)'), s2 = job(sk, 'find switches, disarm traps');
  const w = Math.max(ctx.measureText(s1).width, ctx.measureText(s2).width) + 26, h = big ? 50 : 40;
  pill(14, y, w, h, 'left');
  text(s1, 27, y + h * 0.3, big ? 16 : 12, PCOL[tc], 'left', 'body');
  text(s2, 27, y + h * 0.72, big ? 16 : 12, PCOL[sk], 'left', 'body');
}
