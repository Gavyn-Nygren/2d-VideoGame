/* Pip & Bo - Level 28-1 Rolling Boulder Run (team, World 28 Pyramid Sands). */
'use strict';

/* ===== 28-1 Rolling Boulder Run (mode 'boulderrun', team, scrolls right) — Gavyn's pick =====
   "A giant boulder chases you down a tomb corridor. One player pulls levers to open doors ahead, the other clears
   rubble." Gavyn wants strong effects, like a classic adventure-movie tomb escape: screen shake, dust, falling debris,
   crumbling floors, a close-call feel. The look is our own: Pip and Bo in a sandstone tomb, nobody from any film.
   def.ownStep + def.ownHUD: the mode runs the tick, the camera, the picture and the HUD. Pip and Bo run and jump with
   the engine's own control() over solid boxes in WORLD coordinates (js/levels/world28/pyramid-kit.js, pyrRun), so the
   jump feels like every other level.
   Each room is a "Run" (def.roomWord): a long corridor built from its course tokens (below). Jobs (they swap every run):
     PULLER  (act label 'pull'): stand at a lever and HOLD the action (0.35 s) to swing it: the stone door ahead grinds
             up. Only the puller can work levers ("Pip pulls the levers!").
     SMASHER (act label 'smash'): press the action next to a rubble pile, 3 good whacks and it bursts. Only the
             smasher can smash.
   The boulder: it drops from the ceiling at the start of each run with a crash and rolls after you (Run 1 about
   150 px/s, Run 2 160, Run 3 170; you run at 220). It never falls more than about 520 px behind the slower runner
   (it is always coming), and it rolls straight through doors, rubble, gaps and crumbled floor.
     Squish!  if it catches someone they go flat as a pancake for a moment (a cartoon squash, never hurt), the boulder
              bounces back about 220 px and wobbles for a second. Squishes are counted (medal).
     Gold help (announced): after 3 squishes in one run the boulder gets tired: 15% slower for the rest of that run.
   Hazards:
     gaps (jump them), steps (jump up), crumbling floor (it shakes when stepped on and falls 0.55 s later: keep
     running), falling ceiling rocks (a shadow and "Look out!" warn 0.8 s before; a hit is a dizzy "Bonk!").
     Falling into a gap is a "Whoops!": you pop back up on the far side after 0.8 s (counted).
   Close call: someone gets through a door, over a gap or across the chasm with the boulder under 150 px behind:
   the game slows down for half a second ("Close call!").
   The end of each run: a wide chasm, then daylight through a doorway. Jump the chasm: the boulder can't, and plunges
   into it with a huge crash and a cloud of dust ("Phew!"). Both in the doorway: the run is done. After Run 3 the
   doorway opens onto the desert.
   "Wait for me!": nobody can get more than 560 px ahead of their partner.
   Results: time, squishes, whoopses, levers and rubble per player, close calls.
   Medal goals (MODES.boulderrun.medals, js/medals.js): Gold <= 3:20 with <= 1 squish; Silver <= 5:30 with <= 5.
   Course tokens (room def `course`, an array; x grows to the right, the floor is at BR.floor):
     'fN' floor N px; 'g' a gap (90 px); 'cN' crumbling floor N px (60 px tiles); 'D' a lever and its door; 'R' a
     rubble pile; 'S' a step (a block 50 px high); 'X' a falling ceiling rock; 'E' the chasm and the exit.
   Every top-level name starts with br / BR (Sfx.extra.br*); level state lives in G.mst. */
const BR = {
  floor: 440, ceil: 222, pitY: 560,
  r: 104,                      // the boulder's radius (it nearly fills the corridor)
  speeds: [150, 160, 170], tired: 0.85, maxGap: 520, startGap: 430,
  leverHold: 0.35, doorOpen: 0.55, rubbleHp: 3, smashCd: 0.16, reach: 34,
  crumbleT: 0.55, rockWarn: 0.8, rockSee: 230, rockStun: 0.7,
  flatT: 1.0, bounce: 220, bounceT: 1.0, whoopsT: 0.8,
  maxSep: 560, close: 150, slowT: 0.55, slowK: 0.35,
  goldSquish: 3, clearT: 1.9, introHold: 0.4,
};
const BR_RUNS = 3;

/* ---------- the course ---------- */
function brBuild(def) {
  const c = { solids: [], floors: [], crumbles: [], doors: [], rubble: [], rocks: [], gaps: [], steps: [], torches: [], len: 0, chasm: null, exitX: 0 };
  const F = BR.floor;
  const floor = (x0, x1) => { const s = { x0, y0: F, x1, y1: BR.pitY + 200, kind: 'floor' }; c.solids.push(s); c.floors.push(s); return s; };
  let x = -900;
  floor(x, 0); x = 0;
  for (const tok of def.course) {
    const k = tok[0], n = +tok.slice(1) || 0;
    if (k === 'f') { floor(x, x + n); x += n; }
    else if (k === 'g') { c.gaps.push({ x0: x, x1: x + 90 }); x += 90; }
    else if (k === 'c') {
      const tiles = Math.max(1, Math.round(n / 60));
      for (let i = 0; i < tiles; i++) {
        const s = { x0: x + i * 60, y0: F, x1: x + i * 60 + 60, y1: F + 60, kind: 'crumble', st: 'ok', t: 0, off: false, fall: 0 };
        c.solids.push(s); c.crumbles.push(s);
      }
      c.gaps.push({ x0: x, x1: x + tiles * 60, crumble: true });
      x += tiles * 60;
    }
    else if (k === 'D') {
      floor(x, x + 260);
      const door = { x0: x + 200, y0: BR.ceil, x1: x + 234, y1: F, kind: 'door', off: false, open: 0, lever: { x: x + 70, k: 0, done: false, hold: 0 }, id: c.doors.length };
      c.solids.push(door); c.doors.push(door);
      x += 260;
    }
    else if (k === 'R') {
      floor(x, x + 220);
      const r = { x0: x + 110, y0: F - 150, x1: x + 176, y1: F, kind: 'rubble', off: false, hp: BR.rubbleHp, hitT: 9, id: c.rubble.length };
      c.solids.push(r); c.rubble.push(r);
      x += 220;
    }
    else if (k === 'S') {
      floor(x, x + 260);
      const s = { x0: x + 40, y0: F - 50, x1: x + 220, y1: F, kind: 'step' };
      c.solids.push(s); c.steps.push(s);
      x += 260;
    }
    else if (k === 'X') { floor(x, x + 240); c.rocks.push({ x: x + 150, st: 'up', t: 0, y: BR.ceil + 10, vy: 0, hit: [false, false] }); x += 240; }
    else if (k === 'E') {
      floor(x, x + 120); x += 120;
      c.chasm = { x0: x, x1: x + 122 }; c.gaps.push({ x0: x, x1: x + 122, chasm: true }); x += 122;
      floor(x, x + 520); c.exitX = x + 300; x += 520;
      floor(x, x + 900);
      // the far wall: nobody runs on past the doorway
      c.solids.push({ x0: c.exitX + 130, y0: BR.ceil - 10, x1: c.exitX + 1200, y1: BR.floor + 1, kind: 'wall' });
    }
  }
  c.len = x;
  // ceiling (a solid, so a jump onto a step can bump it)
  c.solids.push({ x0: -900, y0: BR.ceil - 200, x1: x + 900, y1: BR.ceil, kind: 'ceil' });
  for (let tx = 140; tx < c.len; tx += 420) c.torches.push(tx);
  return c;
}
const brGapAt = (c, x) => c.gaps.find(g => x > g.x0 && x < g.x1 && (!g.crumble || c.crumbles.some(s => s.off && x > s.x0 && x < s.x1))) || null;

/* ---------- jobs ---------- */
const brPuller = st => st.room.puller;
const brJob = (st, id) => (id === brPuller(st) ? 'pull' : 'smash');
// the first door that is still shut and the first rubble pile still standing
const brNextDoor = st => st.c.doors.find(d => !d.lever.done) || null;
const brNextRubble = st => st.c.rubble.find(r => !r.off) || null;

/* ---------- one player ---------- */
function brPlayer(st, p, dt) {
  const P = st.pl[p.id];
  P.wrongCD -= dt; P.waitCD -= dt;
  if (P.whoops) {
    P.whoops.t -= dt;
    if (P.whoops.t <= 0) {
      const w = P.whoops; P.whoops = null;
      const input = p.input;
      Object.assign(p, { x: w.x, y: BR.floor - PH - 40, vx: 0, vy: 0, alive: true, grounded: false, jumping: false, stun: 0, sx: 0.6, sy: 1.4, input });
      p.pendingJump = false; p.pendingAct = false;
      pyrDust(st, p.x + p.w / 2, BR.floor, 6, 30);
    }
    return;
  }
  if (P.flat > 0) {
    P.flat -= dt; p.vx = 0; p.sx = 1.7; p.sy = 0.32; p.pendingJump = false; p.pendingAct = false;
    if (P.flat <= 0) { p.sx = 0.7; p.sy = 1.45; Sfx.play('boing', p.id); }
    // still falls if it was squished in the air
    p.vy = Math.min(p.vy + PHYS.g * dt, PHYS.maxFall); pyrMoveY(st.c.solids, p, p.vy * dt);
    p.grounded = !!pyrGroundOf(st.c.solids, p);
    return;
  }
  const r = pyrRun(st.c.solids, p, dt, { freeze: st.state !== 'run' });
  if (r.landed && r.landVy > 260) pyrDust(st, p.x + p.w / 2, p.y + p.h, 3, 16);
  if (p.grounded && r.ground && r.ground.kind === 'crumble' && r.ground.st === 'ok') { r.ground.st = 'shake'; r.ground.t = 0; Sfx.play('pyrClick', 0.6); }
  if (p.grounded) P.safeX = p.x;
  if (p.y > BR.floor + 120) brWhoops(st, p);
}
function brWhoops(st, p) {
  const P = st.pl[p.id], cx = p.x + p.w / 2;
  // pop back up on the far side of the gap you fell into
  const g = st.c.gaps.filter(g => cx > g.x0 - 30 && cx < g.x1 + 30).sort((a, b) => b.x1 - a.x1)[0];
  let nx = g ? g.x1 + 24 : cx + 60;
  // (past any crumbled tiles next to it)
  for (let k = 0; k < 20; k++) { const gg = brGapAt(st.c, nx + 11); if (!gg) break; nx = gg.x1 + 24; }
  P.whoops = { t: BR.whoopsT, x: nx - p.w / 2 };
  p.alive = false; p.vx = 0; p.vy = 0;
  st.stat.whoops[p.id]++;
  pyrPop(st, 'Whoops!', cx, BR.floor - 40, '#ffe6a8', 20);
  Sfx.play('heistWhoops' in Sfx.extra ? 'heistWhoops' : 'die', p.id);
  pyrDust(st, cx, BR.floor + 20, 8, 40);
}
function brLeash(st, xb) {
  const [a, b] = G.players;
  if (!a.alive || !b.alive) return;
  if (Math.abs(a.x - b.x) <= BR.maxSep) return;
  for (const p of [a, b]) {
    const o = other(p);
    if (Math.abs(p.x - o.x) > Math.abs(xb[p.id] - o.x) && p.x !== xb[p.id] && p.x > o.x) {
      p.x = xb[p.id]; p.vx = 0;
      const P = st.pl[p.id];
      if (P.waitCD <= 0) {
        P.waitCD = 3.5;
        pyrPop(st, 'Wait for ' + NAMES[o.id] + '!', p.x + p.w / 2, p.y - 30, PCOL[o.id], 16);
        if (typeof cpuSay === 'function' && cpuOn(o.id)) cpuSay(o, 'Wait for me!');
      }
    }
  }
}
function brWrong(st, p, what) {
  const P = st.pl[p.id];
  if (P.wrongCD > 0) return;
  P.wrongCD = 1.6;
  const o = 1 - p.id;
  pyrPop(st, what === 'lever' ? NAMES[o] + ' pulls the levers!' : NAMES[o] + ' smashes rubble!', p.x + p.w / 2, p.y - 34, PCOL[o], 15);
  Sfx.play('bonk');
}
function brActs(st, p, dt) {
  const P = st.pl[p.id], job = brJob(st, p.id), cx = p.x + p.w / 2;
  if (!p.alive || P.flat > 0 || st.state !== 'run') { p.pendingAct = false; return; }
  // levers: hold the action
  let atLever = null;
  for (const d of st.c.doors) if (!d.lever.done && Math.abs(cx - d.lever.x) < BR.reach && p.grounded) atLever = d;
  if (atLever) {
    const lv = atLever.lever;
    if (job !== 'pull') { if (p.pendingAct) brWrong(st, p, 'lever'); }
    else if (p.input.act) {
      lv.hold += dt; lv.k = Math.min(1, lv.hold / BR.leverHold);
      if (lv.k >= 1) {
        lv.done = true; st.stat.levers[p.id]++;
        Sfx.play('pyrLever', p.id === 1 ? 0.84 : 1); Sfx.play('pyrStone');
        pyrPop(st, 'Door open!', atLever.x0 + 17, BR.ceil + 60, C.gold, 18);
        pyrShake(0.12);
      }
    } else { lv.hold = Math.max(0, lv.hold - dt * 2); lv.k = lv.hold / BR.leverHold; }
  }
  // rubble: press the action
  if (p.pendingAct) {
    const rb = st.c.rubble.find(r => !r.off && cx > r.x0 - BR.reach - 8 && cx < r.x1 + BR.reach);
    if (rb) {
      p.pendingAct = false;
      if (job !== 'smash') brWrong(st, p, 'rubble');
      else if (P.smashCd <= 0) {
        P.smashCd = BR.smashCd; rb.hp--; rb.hitT = 0;
        p.sx = 1.3; p.sy = 0.8;
        pyrChips(st, cx < rb.x0 ? rb.x0 : rb.x1, BR.floor - 40 - pyrVR() * 60, 7, BR.floor - 2);
        pyrDust(st, (rb.x0 + rb.x1) / 2, BR.floor - 30, 3, 50);
        Sfx.play('pyrSmash', p.id === 1 ? 0.84 : 1);
        pyrShake(0.06);
        if (rb.hp <= 0) {
          rb.off = true; st.stat.rubble[p.id]++;
          pyrChips(st, (rb.x0 + rb.x1) / 2, BR.floor - 70, 22, BR.floor - 2);
          pyrDust(st, (rb.x0 + rb.x1) / 2, BR.floor - 40, 14, 80);
          pyrPop(st, 'Smash!', (rb.x0 + rb.x1) / 2, BR.floor - 170, C.gold, 22);
          Sfx.play('pyrCrumble'); pyrShake(0.18);
        } else pyrPop(st, ['', 'Whack!', 'Crack!'][rb.hp] || 'Whack!', (rb.x0 + rb.x1) / 2, BR.floor - 160, '#ffe6a8', 16);
      }
    }
  }
  P.smashCd -= dt;
}

/* ---------- the world: doors, crumbling floor, ceiling rocks ---------- */
function brWorld(st, dt) {
  const c = st.c, ps = G.players;
  for (const d of c.doors) {
    if (d.lever.done && d.open < 1) {
      d.open = Math.min(1, d.open + dt / BR.doorOpen);
      if (pyrVR() < dt * 30) pyrFx(st, d.x0 + pyrVR() * 34, BR.ceil + 4, (pyrVR() - 0.5) * 20, 30, 0.8, 'rgba(230,200,150,0.7)', 2, 400, 'sand');
      if (d.open > 0.6) d.off = true;
    }
  }
  for (const s of c.crumbles) {
    if (s.st === 'shake') {
      s.t += dt;
      if (pyrVR() < dt * 20) pyrFx(st, s.x0 + pyrVR() * 60, BR.floor + 2, (pyrVR() - 0.5) * 40, 40, 0.6, '#c99a5c', 2.5, 900, 'sand');
      if (s.t >= BR.crumbleT) {
        s.st = 'gone'; s.off = true; s.fall = 0;
        pyrChips(st, (s.x0 + s.x1) / 2, BR.floor + 6, 10, BR.pitY + 400, '#b98a50');
        pyrDust(st, (s.x0 + s.x1) / 2, BR.floor + 10, 5, 50);
        Sfx.play('pyrCrumble'); pyrShake(0.1);
      }
    } else if (s.st === 'gone') s.fall += dt;
  }
  for (const r of c.rocks) {
    if (r.st === 'up') {
      if (ps.some(p => p.alive && r.x - (p.x + p.w / 2) < BR.rockSee && r.x - (p.x + p.w / 2) > -40)) {
        r.st = 'warn'; r.t = 0; Sfx.play('pyrCrumble');
        pyrPop(st, 'Look out!', r.x, BR.ceil + 46, '#ffcf6a', 16);
      }
    } else if (r.st === 'warn') {
      r.t += dt;
      if (pyrVR() < dt * 40) pyrFx(st, r.x + (pyrVR() - 0.5) * 40, BR.ceil + 8, (pyrVR() - 0.5) * 20, 20, 0.7, 'rgba(230,200,150,0.8)', 2, 700, 'sand');
      if (r.t >= BR.rockWarn) { r.st = 'fall'; r.vy = 0; }
    } else if (r.st === 'fall') {
      r.vy += 2400 * dt; r.y += r.vy * dt;
      for (const p of ps) {
        if (!p.alive || r.hit[p.id] || st.pl[p.id].flat > 0) continue;
        if (Math.abs(p.x + p.w / 2 - r.x) < 26 && r.y + 18 > p.y && r.y - 18 < p.y + p.h) {
          r.hit[p.id] = true; st.stat.bonks[p.id]++;
          p.stun = Math.max(p.stun, BR.rockStun); p.vx = 0;
          pyrPop(st, 'Bonk!', p.x + p.w / 2, p.y - 24, '#ffe6a8', 18);
          Sfx.play('heistBonk' in Sfx.extra ? 'heistBonk' : 'bonk', p.id); rumble(p.id, 0.4, 0.4, 150);
        }
      }
      if (r.y >= BR.floor - 16) {
        r.st = 'down'; r.y = BR.floor - 16;
        pyrChips(st, r.x, BR.floor - 10, 12, BR.floor - 2); pyrDust(st, r.x, BR.floor - 6, 8, 40);
        Sfx.play('pyrSmash', 0.7); pyrShake(0.2);
      }
    }
  }
}

/* ---------- the boulder ---------- */
function brBoulder(st, dt) {
  const B = st.b, c = st.c, ps = G.players;
  if (B.state === 'wait') { B.t += dt; if (B.t >= 0.9) brDrop(st); return; }
  if (B.state === 'drop') {
    B.vy += 2600 * dt; B.y += B.vy * dt;
    if (B.y >= BR.floor - BR.r) {
      B.y = BR.floor - BR.r; B.state = 'roll'; B.vy = 0;
      Sfx.play('pyrCrash'); pyrShake(0.55);
      pyrDust(st, B.x, BR.floor - 10, 24, 220); pyrChips(st, B.x, BR.floor - 30, 20, BR.floor - 2);
      pyrPop(st, 'RUN!', B.x + 200, BR.ceil + 80, '#ff8a5a', 30);
      for (const p of ps) rumble(p.id, 0.8, 0.6, 400);
    }
    return;
  }
  if (B.state === 'fall') {
    B.vy += 1800 * dt; B.y += B.vy * dt; B.x += 60 * dt; B.rot += dt * 2;
    if (!B.crashed && B.y > BR.floor + 260) {
      B.crashed = true;
      Sfx.play('pyrCrash'); pyrShake(0.7);
      const cx = (c.chasm.x0 + c.chasm.x1) / 2;
      for (let i = 0; i < 40; i++) pyrFx(st, cx + (pyrVR() - 0.5) * 120, BR.floor + 40, (pyrVR() - 0.5) * 400, -200 - pyrVR() * 420, 1.6 + pyrVR(), i % 2 ? 'rgba(222,196,150,0.75)' : 'rgba(190,160,112,0.7)', 14 + pyrVR() * 18, 120, 'dust');
      pyrChips(st, cx, BR.floor, 30, BR.floor + 400);
      pyrPop(st, 'Phew!', cx, BR.ceil + 70, C.gold, 30);
      for (const p of ps) rumble(p.id, 1, 0.8, 500);
    }
    return;
  }
  if (B.state !== 'roll') return;
  B.pause = Math.max(0, B.pause - dt);
  const live = ps.filter(p => p.alive || st.pl[p.id].whoops);
  const px = id => (st.pl[id].whoops ? st.pl[id].whoops.x : G.players[id].x);
  const trail = live.length ? Math.min(...live.map(p => px(p.id))) : B.x;
  let v = st.state === 'clear' ? 320 : st.speed * (st.tired ? BR.tired : 1);
  if (B.pause > 0) v = B.pause > BR.bounceT * 0.6 ? -BR.bounce / (BR.bounceT * 0.4) : 0;
  B.x += v * dt;
  // always coming: never more than maxGap behind the slower runner
  B.x = Math.max(B.x, trail - BR.maxGap - BR.r);
  B.rot += (v > 0 ? v : Math.max(v, 0)) * dt / BR.r;
  B.v = v;
  // the chasm: it rolls in
  if (c.chasm && B.x > c.chasm.x0 + 30) { B.state = 'fall'; B.vy = 0; Sfx.play('pyrWhoosh'); return; }
  // squish!
  const front = B.x + BR.r - 6;
  for (const p of ps) {
    const P = st.pl[p.id];
    if (!p.alive || P.flat > 0 || B.pause > 0) continue;
    if (p.x < front - 10 && p.y + p.h > B.y - BR.r * 0.6) {
      P.flat = BR.flatT; st.stat.squish[p.id]++; st.roomSquish++;
      pyrMoveX(st.c.solids, p, Math.max(0, front - 8 - p.x)); p.vx = 0; p.stun = 0; // (a shove that stops at a door or rubble)
      B.pause = BR.bounceT;
      pyrPop(st, 'Squish!', p.x + p.w / 2, p.y - 30, '#ffb0c8', 24);
      Sfx.play('pyrSquish', p.id === 1 ? 0.84 : 1); pyrShake(0.35); rumble(p.id, 0.9, 0.7, 300);
      pyrDust(st, front, BR.floor - 20, 10, 40);
      if (!st.tired && st.roomSquish >= BR.goldSquish && !st.noHelp) {
        st.tired = true; st.goldUsed++;
        pyrPop(st, 'Gold help: the boulder is getting tired!', st.camX + W / 2, BR.ceil + 120, C.gold, 18);
        Sfx.play('pyrGold');
      }
    }
  }
}
function brDrop(st) {
  const B = st.b;
  B.state = 'drop'; B.vy = 0; B.y = BR.ceil - 260;
  Sfx.play('pyrCrumble'); pyrShake(0.2);
  for (let i = 0; i < 16; i++) pyrChips(st, B.x + (pyrVR() - 0.5) * 160, BR.ceil + 4, 1, BR.floor - 2);
}

/* ---------- close calls, the end of a run ---------- */
function brClose(st, dt, xb) {
  const B = st.b, c = st.c;
  if (B.state !== 'roll') return;
  const marks = c.doors.map(d => d.x1).concat(c.gaps.map(g => g.x1));
  for (const p of G.players) {
    if (!p.alive) continue;
    const gap = p.x - (B.x + BR.r);
    if (gap > BR.close || gap < -6) continue;
    for (const m of marks) if (xb[p.id] < m && p.x >= m) {
      st.slowT = BR.slowT; st.stat.close++;
      pyrPop(st, 'Close call!', p.x + p.w / 2, p.y - 44, '#ff9a6a', 22);
      Sfx.play('pyrWhoosh', 1); rumble(p.id, 0.3, 0.6, 200);
      break;
    }
  }
}
function brEnd(st, dt) {
  const c = st.c, ps = G.players;
  if (st.state === 'run' && ps.every(p => p.alive && p.x > c.exitX - 40)) {
    st.state = 'clear'; st.clearT = 0;
    st.stat.runT.push(G.time - st.runStart);
    Sfx.play('pyrFanfare');
    for (const p of ps) { p.sx = 0.7; p.sy = 1.4; }
  }
}

/* ---------- camera ---------- */
function brCamera(st, dt, snap) {
  const xs = G.players.map(p => (st.pl[p.id].whoops ? st.pl[p.id].whoops.x : p.x));
  let tx = (xs[0] + xs[1]) / 2 - W * 0.42;
  // keep the boulder in view when it is close
  if (st.b && (st.b.state === 'wait' || st.b.state === 'drop')) tx = Math.min(tx, st.b.x - 170);
  if (st.b && st.b.state === 'roll') tx = Math.min(tx, Math.max(st.b.x - BR.r * 0.4, Math.min(xs[0], xs[1]) - W * 0.55));
  const lo = Math.min(xs[0], xs[1]), hi = Math.max(xs[0], xs[1]);
  tx = Math.min(tx, lo - 60); tx = Math.max(tx, hi + 90 - W);
  tx = clamp(tx, -260, st.c.len - W + 200);
  st.camX = snap ? tx : st.camX + (tx - st.camX) * Math.min(1, dt * 5);
}

/* ---------- looks: dust trail, sand trickles, rumble sounds ---------- */
function brLooks(st, dt) {
  pyrFxTick(st, dt);
  st.t += dt;
  const B = st.b;
  if (B && B.state === 'roll') {
    const front = B.x + BR.r;
    if (pyrVR() < dt * 26) pyrFx(st, B.x - BR.r * 0.6 + pyrVR() * 60, BR.floor - 6, -40 - pyrVR() * 60, -30 - pyrVR() * 40, 1.2, 'rgba(210,180,130,0.55)', 10 + pyrVR() * 10, -8, 'dust');
    if (pyrVR() < dt * 14) pyrFx(st, front - 10, BR.floor - 4, 60 + pyrVR() * 80, -40 - pyrVR() * 80, 0.8, '#b98a50', 2 + pyrVR() * 2, 1400, 'rock', BR.floor - 2);
    // sand trickling from the ceiling near the boulder
    if (pyrVR() < dt * 10) {
      const sx = front + (pyrVR() - 0.3) * 500;
      for (let i = 0; i < 6; i++) pyrFx(st, sx + (pyrVR() - 0.5) * 8, BR.ceil + 2, 0, 40 + i * 10, 0.9, 'rgba(225,195,140,0.85)', 1.8, 600, 'sand');
    }
    // the shake and the rumble get stronger as it comes closer
    const xs = G.players.filter(p => p.alive).map(p => p.x);
    const gap = xs.length ? Math.min(...xs) - front : 999;
    const near = clamp(1 - gap / 520, 0, 1);
    st.near = near;
    pyrShake(0.04 + near * near * 0.22);
    st.rumbleT -= dt;
    if (st.rumbleT <= 0) { st.rumbleT = 0.42; Sfx.play('pyrRumble', 1, near); if (near > 0.6) for (const p of G.players) rumble(p.id, 0.2 * near, 0.3 * near, 380); }
  } else st.near = 0;
}

/* ---------- labels and the room ---------- */
function brRoom(st, L, k) {
  const def = L.def;
  st.k = k; st.room = def;
  st.c = brBuild(def);
  st.state = 'run'; st.clearT = 0; st.slowT = 0; st.started = false; st.roomSquish = 0; st.tired = false;
  st.runStart = G.time; st.rumbleT = 0; st.near = 0;
  pyrFxNew(st);
  st.speed = BR.speeds[Math.min(k, BR.speeds.length - 1)];
  st.pl = [0, 1].map(() => ({ whoops: null, flat: 0, wrongCD: 0, waitCD: 0, smashCd: 0, safeX: 0 }));
  const sx = [430, 480];
  G.players.forEach((p, i) => {
    const input = p.input;
    Object.assign(p, makePlayer(i), { x: sx[i], y: BR.floor - PH, grounded: true, face: 1, input, prevJump: true, prevAct: true });
  });
  st.b = { x: sx[0] - 320, y: BR.ceil - 260, vy: 0, rot: 0, state: 'wait', t: 0, pause: 0, v: 0, crashed: false };
  st.camX = 0;
  pyrInWorld(st, () => brCamera(st, 0, true));
}
function brSetup(st, L) {
  st.stat = { squish: [0, 0], whoops: [0, 0], bonks: [0, 0], levers: [0, 0], rubble: [0, 0], close: 0, runT: [] };
  st.goldUsed = 0; st.t = 0; st.camX = 0;
  st.noHelp = !!MODES.boulderrun.testNoHelp;
  brRoom(st, L, 0);
}
function brTick(st, dt) {
  const ps = G.players;
  if (st.state === 'clear') {
    st.clearT += dt;
    for (const p of ps) { p.pendingAct = false; p.pendingJump = false; if (p.alive) pyrRun(st.c.solids, p, dt, { freeze: true }); }
    brBoulder(st, dt);
    brLooks(st, dt);
    brCamera(st, dt);
    if (st.clearT >= BR.clearT && (st.b.crashed || st.clearT > 4.5)) st.goNext = true;
    return;
  }
  if (G.introT > BR.introHold) { for (const p of ps) { p.pendingAct = false; p.pendingJump = false; } brLooks(st, dt); brCamera(st, dt); return; }
  // a close call slows the whole world for a moment
  if (st.slowT > 0) { st.slowT -= dt; dt *= BR.slowK; }
  st.rt = (st.rt || 0) + dt;
  const xb = ps.map(p => p.x);
  const wh = ps.map(p => !!st.pl[p.id].whoops);
  for (const p of ps) brPlayer(st, p, dt);
  // (a player who popped back from a Whoops this tick: the leash must not put them back over the gap)
  ps.forEach(p => { if (wh[p.id] && !st.pl[p.id].whoops) xb[p.id] = p.x; });
  brLeash(st, xb);
  for (const p of ps) brActs(st, p, dt);
  brWorld(st, dt);
  brBoulder(st, dt);
  brClose(st, dt, xb);
  brEnd(st, dt);
  brLooks(st, dt);
  brCamera(st, dt);
}

MODES.boulderrun = {
  medals: { bronze: 'Outrun the boulder through every run', goals: [
    { key: 'time', gold: 200, silver: 330 },
    { key: 'squish', gold: 1, silver: 5, word: 'squish', text: n => `At most ${n} squish${n === 1 ? '' : 'es'}` },
  ] },
  medalValues() { const s = G.mst.stat; return s ? { time: s.time || G.time, squish: s.squish[0] + s.squish[1] } : {}; },
  BR,
  setup(st, L) { brSetup(st, L); },
  room(k, L) { brRoom(G.mst, L, k); },
  step(dt) {
    const st = G.mst;
    if (!st.c) return;
    pyrInWorld(st, () => brTick(st, dt));
    if (st.goNext) {
      st.goNext = false;
      const L = G.level;
      if (L.def.rooms && L.def.roomIndex < L.def.roomCount - 1) nextRoom(); else { st.stat.time = G.time; levelClear(); }
    }
  },
  draw() { const st = G.mst; if (st.c) brDraw(st); },
  drawTop() { const st = G.mst; if (st.c) brDrawTop(st); },
  hud() { const st = G.mst; if (st.c) brHud(st); },
  stats() {
    const st = G.mst, s = st.stat;
    if (!s) return [];
    const sq = s.squish[0] + s.squish[1];
    const words = sq === 0 ? 'Not one squish! Fastest feet in the pyramid!' : sq <= 2 ? 'Only flattened a little. Great running!' : 'Lots of squishes, and you still got out!';
    return [
      { label: 'Squishes', values: s.squish.slice() },
      { label: 'Levers pulled', values: s.levers.slice() },
      { label: 'Rubble smashed', values: s.rubble.slice() },
      words + ' Close calls: ' + s.close + ' · Whoopses: ' + (s.whoops[0] + s.whoops[1]) + (st.goldUsed ? ' · Gold help: tired boulder ×' + st.goldUsed : ''),
    ];
  },
  // read-only access for the computer brain and the bot tests
  test: { brGapAt, brJob, brNextDoor, brNextRubble },
};

/* ---------- drawing ---------- */
const BR_LOOK = [
  { wall: { lite: '#d9b47a', mid: '#c49a5e', dark: '#9a703c', deep: '#5a3a1c' }, band: '#2f6f8f', glyph: 'rgba(60,34,14,0.45)' },
  { wall: { lite: '#d2a974', mid: '#b98d58', dark: '#8f6436', deep: '#55361a' }, band: '#8f3f2f', glyph: 'rgba(60,34,14,0.45)' },
  { wall: { lite: '#e0bc82', mid: '#cba265', dark: '#a07440', deep: '#5e3e1e' }, band: '#3f7f5a', glyph: 'rgba(60,34,14,0.45)' },
];
const BR_GLYPHS = ['eye', 'bird', 'scarab', 'sun', 'snake', 'cat', 'reed', 'wave'];
function brDraw(st) {
  const look = BR_LOOK[st.k % BR_LOOK.length], cam = st.camX, c = st.c, t = G.clock;
  // deep background: the tomb's far wall (slower parallax)
  ctx.fillStyle = '#2a1a10'; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.translate(-cam * 0.5, 0);
  pyrBlocks(cam * 0.5 - 40, 0, W + 80, BR.ceil, { lite: '#7a5634', mid: '#6a482a', dark: '#553820' }, 90, 40, 3);
  ctx.restore();
  ctx.save(); ctx.translate(-cam, 0);
  const x0 = cam - 40, x1 = cam + W + 40;
  // the corridor's back wall with a painted band of glyphs
  pyrBlocks(x0, BR.ceil, x1 - x0, BR.floor - BR.ceil, look.wall, 60, 30, st.k * 7);
  ctx.fillStyle = look.band; ctx.fillRect(x0, BR.ceil + 34, x1 - x0, 6); ctx.fillRect(x0, BR.ceil + 86, x1 - x0, 6);
  ctx.fillStyle = 'rgba(255,220,150,0.25)'; ctx.fillRect(x0, BR.ceil + 40, x1 - x0, 46);
  for (let gx = Math.floor(x0 / 70) * 70; gx < x1; gx += 70) pyrGlyph(BR_GLYPHS[(hash(gx / 70 | 0, st.k) >>> 3) % BR_GLYPHS.length], gx + 35, BR.ceil + 63, 1, look.glyph);
  // big painted figures? no: tall columns every 420 px
  for (let tx = Math.floor(x0 / 420) * 420 + 300; tx < x1 + 40; tx += 420) {
    ctx.fillStyle = 'rgba(70,40,18,0.25)'; ctx.fillRect(tx - 22, BR.ceil, 44, BR.floor - BR.ceil);
    ctx.fillStyle = look.wall.lite; ctx.fillRect(tx - 18, BR.ceil, 36, BR.floor - BR.ceil);
    ctx.fillStyle = 'rgba(80,50,20,0.2)'; for (let y = BR.ceil + 10; y < BR.floor; y += 24) ctx.fillRect(tx - 18, y, 36, 3);
    // rounded shading, a lotus capital and a base block
    ctx.fillStyle = 'rgba(255,240,200,0.22)'; ctx.fillRect(tx - 14, BR.ceil, 6, BR.floor - BR.ceil);
    ctx.fillStyle = 'rgba(70,40,18,0.25)'; ctx.fillRect(tx + 8, BR.ceil, 10, BR.floor - BR.ceil);
    ctx.fillStyle = look.wall.mid; ctx.beginPath(); ctx.moveTo(tx - 18, BR.ceil + 30); ctx.quadraticCurveTo(tx - 30, BR.ceil + 6, tx - 30, BR.ceil); ctx.lineTo(tx + 30, BR.ceil); ctx.quadraticCurveTo(tx + 30, BR.ceil + 6, tx + 18, BR.ceil + 30); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = look.wall.deep; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = look.band; ctx.fillRect(tx - 18, BR.ceil + 30, 36, 5);
    ctx.fillStyle = look.wall.mid; ctx.fillRect(tx - 24, BR.floor - 14, 48, 14);
    ctx.fillStyle = 'rgba(255,240,200,0.25)'; ctx.fillRect(tx - 24, BR.floor - 14, 48, 3);
    ctx.strokeStyle = look.wall.deep; ctx.lineWidth = 1.5; ctx.strokeRect(tx - 24, BR.floor - 14, 48, 14);
  }
  // wall torches
  for (const tx of c.torches) {
    if (tx < x0 - 40 || tx > x1 + 40) continue;
    const g = ctx.createRadialGradient(tx, BR.ceil + 120, 4, tx, BR.ceil + 120, 120);
    g.addColorStop(0, 'rgba(255,190,90,0.35)'); g.addColorStop(1, 'rgba(255,160,60,0)');
    ctx.fillStyle = g; circle(tx, BR.ceil + 120, 120); ctx.fill();
    ctx.fillStyle = '#5a3a1c'; ctx.fillRect(tx - 7, BR.ceil + 128, 14, 6);
    pyrTorchStick(tx, BR.ceil + 120, 18, 0);
    pyrFlame(tx, BR.ceil + 120, 0.9, t + tx, true);
  }
  // the ceiling: huge dark blocks above the corridor, hanging roots, cracks
  pyrBlocks(x0, 0, x1 - x0, BR.ceil, { lite: look.wall.dark, mid: look.wall.deep, dark: '#3a2410' }, 120, 56, 17);
  const cg = ctx.createLinearGradient(0, 0, 0, BR.ceil);
  cg.addColorStop(0, 'rgba(10,4,0,0.75)'); cg.addColorStop(1, 'rgba(10,4,0,0.1)');
  ctx.fillStyle = cg; ctx.fillRect(x0, 0, x1 - x0, BR.ceil);
  pyrBlocks(x0, BR.ceil - 34, x1 - x0, 34, look.wall, 80, 17, 11);
  ctx.strokeStyle = 'rgba(90,60,30,0.8)'; ctx.lineWidth = 2;
  for (let rx = Math.floor(x0 / 190) * 190; rx < x1; rx += 190) {
    const hv = hash(rx / 190 | 0, 5), len = 14 + hv % 40, sw = Math.sin(t * 1.5 + rx) * 2;
    ctx.beginPath(); ctx.moveTo(rx + hv % 60, BR.ceil); ctx.quadraticCurveTo(rx + hv % 60 + sw, BR.ceil + len * 0.6, rx + hv % 60 + sw * 2, BR.ceil + len); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x0, BR.ceil, x1 - x0, 10);
  // the exit: daylight through a doorway
  if (c.exitX) {
    const ex = c.exitX + 40;
    if (ex > x0 - 200 && ex < x1 + 200) {
      const g = ctx.createRadialGradient(ex, BR.floor - 70, 10, ex, BR.floor - 70, 260);
      g.addColorStop(0, 'rgba(255,240,200,0.9)'); g.addColorStop(1, 'rgba(255,220,150,0)');
      ctx.fillStyle = g; ctx.fillRect(ex - 260, BR.ceil, 520, BR.floor - BR.ceil);
      ctx.fillStyle = '#ffe9b8'; rr(ex - 46, BR.floor - 150, 92, 150, 10); ctx.fill();
      ctx.fillStyle = '#9fd4f0'; ctx.fillRect(ex - 40, BR.floor - 144, 80, 70);
      ctx.fillStyle = '#f0cf86'; ctx.fillRect(ex - 40, BR.floor - 74, 80, 74);
      ctx.fillStyle = '#e2b56a'; ctx.beginPath(); ctx.moveTo(ex - 30, BR.floor - 74); ctx.lineTo(ex - 6, BR.floor - 110); ctx.lineTo(ex + 18, BR.floor - 74); ctx.fill();
      ctx.strokeStyle = look.wall.dark; ctx.lineWidth = 8; rr(ex - 46, BR.floor - 150, 92, 150, 10); ctx.stroke();
      // light rays
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = 'rgba(255,230,170,' + (0.06 + 0.03 * Math.sin(t * 1.3 + i)) + ')';
        ctx.beginPath(); ctx.moveTo(ex - 30 + i * 18, BR.floor - 140); ctx.lineTo(ex - 250 + i * 40, BR.floor); ctx.lineTo(ex - 190 + i * 40, BR.floor); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
  }
  // the far wall past the doorway
  if (c.exitX && c.exitX + 130 < x1) {
    pyrBlocks(c.exitX + 130, BR.ceil, 1200, BR.floor - BR.ceil, look.wall, 60, 30, 2);
    ctx.fillStyle = 'rgba(40,20,8,0.35)'; ctx.fillRect(c.exitX + 130, BR.ceil, 1200, BR.floor - BR.ceil);
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(c.exitX + 130, BR.ceil, 8, BR.floor - BR.ceil);
  }
  // floors (top face + body) and pits
  for (const s of c.floors) {
    if (s.x1 < x0 || s.x0 > x1) continue;
    pyrBlocks(Math.max(s.x0, x0), BR.floor, Math.min(s.x1, x1) - Math.max(s.x0, x0), H - BR.floor, look.wall, 60, 30, 5);
    ctx.fillStyle = look.wall.lite; ctx.fillRect(Math.max(s.x0, x0), BR.floor, Math.min(s.x1, x1) - Math.max(s.x0, x0), 6);
    ctx.fillStyle = 'rgba(255,245,215,0.35)'; ctx.fillRect(Math.max(s.x0, x0), BR.floor, Math.min(s.x1, x1) - Math.max(s.x0, x0), 1.5);
    ctx.fillStyle = 'rgba(50,26,10,0.3)'; ctx.fillRect(Math.max(s.x0, x0), BR.floor + 6, Math.min(s.x1, x1) - Math.max(s.x0, x0), 3);
  }
  for (const g of c.gaps) {
    if (g.x1 < x0 || g.x0 > x1 || g.crumble) continue;
    brPit(g.x0, g.x1, t, g.chasm);
  }
  for (const s of c.crumbles) {
    if (s.x1 < x0 || s.x0 > x1) continue;
    if (s.st === 'gone') {
      brPit(s.x0, s.x1, t, false);
      if (s.fall < 1.2) { ctx.save(); ctx.globalAlpha = 1 - s.fall / 1.2; ctx.translate(s.x0 + 30, BR.floor + 15 + s.fall * s.fall * 500); ctx.rotate(s.fall * 2); ctx.fillStyle = look.wall.mid; ctx.fillRect(-28, -14, 56, 28); ctx.restore(); }
      continue;
    }
    const jig = s.st === 'shake' ? Math.sin(t * 60 + s.x0) * 2 : 0;
    ctx.save(); ctx.translate(jig, s.st === 'shake' ? s.t * 6 : 0);
    ctx.fillStyle = look.wall.mid; ctx.fillRect(s.x0 + 1, BR.floor, 58, 40);
    ctx.fillStyle = look.wall.lite; ctx.fillRect(s.x0 + 1, BR.floor, 58, 6);
    ctx.strokeStyle = 'rgba(50,26,10,' + (s.st === 'shake' ? 0.9 : 0.5) + ')'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(s.x0 + 8, BR.floor + 2); ctx.lineTo(s.x0 + 22, BR.floor + 16); ctx.lineTo(s.x0 + 16, BR.floor + 34);
    ctx.moveTo(s.x0 + 40, BR.floor + 2); ctx.lineTo(s.x0 + 34, BR.floor + 18); ctx.lineTo(s.x0 + 50, BR.floor + 30); ctx.stroke();
    ctx.restore();
    if (s.st === 'ok') { brPit(s.x0, s.x1, t, false, BR.floor + 40); }
  }
  // steps
  for (const s of c.steps) {
    if (s.x1 < x0 || s.x0 > x1) continue;
    pyrBlocks(s.x0, s.y0, s.x1 - s.x0, s.y1 - s.y0, { lite: '#b98d58', mid: '#9a6c3e', dark: '#7f5630' }, 45, 25, 9);
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(s.x1, s.y0 + 4, 6, s.y1 - s.y0 - 4);
    ctx.fillStyle = look.wall.lite; ctx.fillRect(s.x0, s.y0, s.x1 - s.x0, 5);
    ctx.strokeStyle = look.wall.deep; ctx.lineWidth = 2; ctx.strokeRect(s.x0, s.y0, s.x1 - s.x0, s.y1 - s.y0);
  }
  // levers and doors
  for (const d of c.doors) {
    if (d.x1 < x0 - 200 || d.x0 > x1 + 40) continue;
    const lv = d.lever, hint = !lv.done && st.state === 'run';
    pyrLever(lv.x, BR.floor, lv.done ? 1 : lv.k, hint && Math.sin(t * 6) > 0);
    // a rope from the lever up to the door's pulley
    ctx.strokeStyle = 'rgba(120,80,40,0.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(lv.x, BR.ceil + 6); ctx.lineTo(d.x0 + 17, BR.ceil + 6); ctx.stroke();
    ctx.fillStyle = '#6e4a26'; circle(d.x0 + 17, BR.ceil + 8, 7); ctx.fill();
    const up = pyrEase(d.open) * (BR.floor - BR.ceil - 14);
    ctx.save(); ctx.beginPath(); ctx.rect(d.x0 - 4, BR.ceil, d.x1 - d.x0 + 8, BR.floor - BR.ceil); ctx.clip();
    const dy = BR.ceil - up;
    ctx.fillStyle = '#8a6338'; ctx.fillRect(d.x0, dy, d.x1 - d.x0, BR.floor - BR.ceil);
    ctx.fillStyle = '#a77a46'; ctx.fillRect(d.x0 + 3, dy + 3, d.x1 - d.x0 - 6, BR.floor - BR.ceil - 6);
    ctx.fillStyle = 'rgba(255,240,200,0.25)'; ctx.fillRect(d.x0 + 3, dy + 3, 4, BR.floor - BR.ceil - 6);
    ctx.fillStyle = 'rgba(60,34,14,0.25)'; ctx.fillRect(d.x1 - 9, dy + 3, 6, BR.floor - BR.ceil - 6);
    ctx.fillStyle = 'rgba(60,34,14,0.18)'; for (let yy = dy + 40; yy < dy + BR.floor - BR.ceil; yy += 46) ctx.fillRect(d.x0 + 3, yy, d.x1 - d.x0 - 6, 2);
    ctx.strokeStyle = '#4a2c12'; ctx.lineWidth = 2; ctx.strokeRect(d.x0 + 1, dy + 1, d.x1 - d.x0 - 2, BR.floor - BR.ceil - 2);
    pyrGlyph('eye', (d.x0 + d.x1) / 2, dy + 90, 0.9, 'rgba(60,34,14,0.6)');
    pyrGlyph('scarab', (d.x0 + d.x1) / 2, dy + 150, 0.8, 'rgba(60,34,14,0.6)');
    ctx.restore();
  }
  // rubble piles
  for (const r of c.rubble) {
    if (r.off || r.x1 < x0 || r.x0 > x1) continue;
    const j = r.hitT < 0.15 ? Math.sin(r.hitT * 120) * 3 : 0, k = r.hp / BR.rubbleHp;
    ctx.save(); ctx.translate(j, 0);
    const cx = (r.x0 + r.x1) / 2;
    for (let i = 0; i < 9; i++) {
      const bx = cx + ((hash(i, r.id) % 50) - 25), by = BR.floor - 16 - i * 15 * (0.6 + 0.4 * k), s = 18 + (hash(i, r.id + 3) % 12);
      if (by < BR.floor - 150) continue;
      ctx.fillStyle = ['#a8783e', '#c49a5e', '#8f6436'][i % 3]; ctx.strokeStyle = '#5a3a1c'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(bx - s, by + s * 0.5); ctx.lineTo(bx - s * 0.6, by - s * 0.6); ctx.lineTo(bx + s * 0.5, by - s * 0.7); ctx.lineTo(bx + s, by + s * 0.4); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,240,200,0.3)'; ctx.beginPath(); ctx.moveTo(bx - s * 0.6, by - s * 0.6); ctx.lineTo(bx + s * 0.5, by - s * 0.7); ctx.lineTo(bx + s * 0.2, by - s * 0.3); ctx.lineTo(bx - s * 0.5, by - s * 0.25); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(60,34,14,0.22)'; ctx.beginPath(); ctx.moveTo(bx + s * 0.5, by - s * 0.7); ctx.lineTo(bx + s, by + s * 0.4); ctx.lineTo(bx + s * 0.3, by + s * 0.45); ctx.lineTo(bx + s * 0.2, by - s * 0.3); ctx.closePath(); ctx.fill();
    }
    if (r.hp < BR.rubbleHp) { ctx.strokeStyle = 'rgba(40,20,8,0.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - 10, BR.floor - 120); ctx.lineTo(cx + 4, BR.floor - 80); ctx.lineTo(cx - 6, BR.floor - 40); ctx.stroke(); }
    ctx.restore();
  }
  // falling ceiling rocks
  for (const r of c.rocks) {
    if (r.x < x0 - 40 || r.x > x1 + 40) continue;
    if (r.st === 'warn' || r.st === 'fall') {
      const k = r.st === 'warn' ? r.t / BR.rockWarn : 1;
      ctx.fillStyle = 'rgba(30,14,4,' + (0.15 + 0.3 * k) + ')'; ctx.beginPath(); ctx.ellipse(r.x, BR.floor + 2, 14 + 16 * k, 5, 0, 0, Math.PI * 2); ctx.fill();
    }
    const jig = r.st === 'warn' ? Math.sin(t * 50) * 2 : 0;
    ctx.save(); ctx.translate(r.x + jig, r.y); if (r.st === 'down') ctx.rotate(0.3);
    ctx.fillStyle = '#9a703c'; ctx.strokeStyle = '#4a2c12'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-20, -10); ctx.lineTo(-6, -20); ctx.lineTo(16, -14); ctx.lineTo(22, 6); ctx.lineTo(4, 18); ctx.lineTo(-18, 10); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,240,200,0.3)'; ctx.beginPath(); ctx.moveTo(-18, -9); ctx.lineTo(-6, -18); ctx.lineTo(14, -12); ctx.lineTo(0, -4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(60,34,14,0.3)'; ctx.beginPath(); ctx.moveTo(20, 6); ctx.lineTo(4, 16); ctx.lineTo(2, 4); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  pyrFxDraw(st, false);
  ctx.restore();
}
function brPit(x0, x1, t, chasm, top) {
  const y0 = top || BR.floor;
  const g = ctx.createLinearGradient(0, y0, 0, H);
  g.addColorStop(0, '#2a160a'); g.addColorStop(1, '#070302');
  ctx.fillStyle = g; ctx.fillRect(x0, y0, x1 - x0, H - y0);
  if (!top) {
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(x0, y0, 6, H - y0); ctx.fillRect(x1 - 6, y0, 6, H - y0);
    if (chasm) { ctx.fillStyle = 'rgba(255,170,80,0.08)'; ctx.fillRect(x0, H - 40, x1 - x0, 40); }
  }
}
function brDrawBoulder(st) {
  const B = st.b;
  if (!B || B.state === 'wait') return;
  const x = B.x, y = B.y, r = BR.r;
  if (B.state === 'fall' && B.y > H + r + 40) return;
  // shadow
  if (B.state !== 'fall') { ctx.fillStyle = 'rgba(20,10,4,0.4)'; ctx.beginPath(); ctx.ellipse(x, BR.floor + 2, r * (B.state === 'drop' ? 0.6 : 0.95), 8, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.save(); ctx.translate(x, y); ctx.rotate(B.rot);
  const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
  g.addColorStop(0, '#d8b682'); g.addColorStop(0.6, '#a07444'); g.addColorStop(1, '#5e3e20');
  ctx.fillStyle = g; circle(0, 0, r); ctx.fill();
  ctx.strokeStyle = '#3e2610'; ctx.lineWidth = 4; circle(0, 0, r); ctx.stroke();
  // chiselled lines and chips so you can see it roll
  ctx.strokeStyle = 'rgba(60,34,14,0.55)'; ctx.lineWidth = 3;
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(0, 0, r * (0.35 + i * 0.22), i * 1.7, i * 1.7 + 1.6); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(-r * 0.8, -r * 0.2); ctx.lineTo(r * 0.3, r * 0.5); ctx.stroke();
  for (let i = 0; i < 6; i++) { ctx.fillStyle = 'rgba(60,34,14,0.4)'; circle(Math.cos(i * 2.1) * r * 0.6, Math.sin(i * 2.1) * r * 0.6, 6 + (i % 3) * 3); ctx.fill(); }
  pyrGlyph('sun', r * 0.2, -r * 0.3, 1.6, 'rgba(70,40,16,0.5)');
  ctx.restore();
  // motion lines in front of it when it is rolling fast and close
  if (B.state === 'roll' && st.near > 0.3) {
    ctx.strokeStyle = 'rgba(255,240,210,' + 0.35 * st.near + ')'; ctx.lineWidth = 3;
    for (let i = 0; i < 4; i++) { const yy = y - r * 0.6 + i * r * 0.4, ph = (G.clock * 3 + i * 0.3) % 1; ctx.beginPath(); ctx.moveTo(x - r - 30 - ph * 40, yy); ctx.lineTo(x - r - 70 - ph * 40, yy); ctx.stroke(); }
  }
}
function brDrawTop(st) {
  const cam = st.camX;
  ctx.save(); ctx.translate(-cam, 0);
  // someone in a whoops: a little dust where they'll pop up
  brDrawBoulder(st);
  pyrFxDraw(st, true);
  ctx.restore();
  // dark corners (the tomb is dim; the near edge glows red when the boulder is close)
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(10,4,0,0.55)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  if (st.near > 0.4) {
    const a = (st.near - 0.4) * 0.5 * (0.7 + 0.3 * Math.sin(G.clock * 10));
    const g = ctx.createLinearGradient(0, 0, 160, 0);
    g.addColorStop(0, 'rgba(255,90,40,' + a + ')'); g.addColorStop(1, 'rgba(255,90,40,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 160, H);
  }
  // the boulder off-screen to the left: an arrow and how far
  const B = st.b;
  if (B && B.state === 'roll' && B.x + BR.r < cam - 30) {
    const d = Math.round((cam - (B.x + BR.r)) / 30);
    ctx.fillStyle = 'rgba(28,26,54,0.75)'; rr(10, 360, 98, 34, 17); ctx.fill();
    ctx.fillStyle = '#ffb07a'; ctx.beginPath(); ctx.moveTo(18, 377); ctx.lineTo(32, 368); ctx.lineTo(32, 386); ctx.closePath(); ctx.fill();
    text('Boulder ' + d + ' m', 66, 377.5, 12, C.paper, 'center', 'body');
  }
  ctx.save(); ctx.translate(-cam, 0);
  pyrPopsDraw(st);
  ctx.restore();
  // close call: a white flash at the edges
  if (st.slowT > 0) { ctx.fillStyle = 'rgba(255,245,220,' + 0.25 * (st.slowT / BR.slowT) + ')'; ctx.fillRect(0, 0, W, H); }
  // the end of a run
  if (st.state === 'clear') {
    const k = clamp(st.clearT / 0.4, 0, 1);
    ctx.save(); ctx.globalAlpha = k;
    bigText(st.k >= BR_RUNS - 1 ? 'Out into the sunshine!' : 'Run ' + (st.k + 1) + ' done!', W / 2, 170, pyrBig() ? 48 : 42, C.gold, 0.8 + 0.2 * k);
    ctx.restore();
  }
}
function brHud(st) {
  const s = st.stat, big = pyrBig();
  const sq = s.squish[0] + s.squish[1];
  pyrPill(fmtTime(G.time) + '   Squishes ' + sq, W - 14, 12, C.paper, 'right');
  // jobs, under the room pill
  const pu = brPuller(st), sm = 1 - pu;
  const y = big ? 92 : 80;
  const job = (id, word) => (pyrCpu(id) ? NAMES[id] + ' (computer) ' + word : NAMES[id] + ': ' + word);
  ctx.font = '700 ' + (big ? 16 : 12) + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
  const s1 = job(pu, 'pulls levers (hold the action)'), s2 = job(sm, 'smashes rubble (press the action)');
  const w = Math.max(ctx.measureText(s1).width, ctx.measureText(s2).width) + 26, h = big ? 50 : 40;
  pill(14, y, w, h, 'left');
  text(s1, 27, y + h * 0.3, big ? 16 : 12, PCOL[pu], 'left', 'body');
  text(s2, 27, y + h * 0.72, big ? 16 : 12, PCOL[sm], 'left', 'body');
  if (st.tired) pyrPill('Gold help: tired boulder', W - 14, big ? 52 : 46, C.gold, 'right');
}
