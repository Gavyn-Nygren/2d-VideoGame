/* Pip & Bo - Level 15-2 Gravity Flip Station (team, World 15 Orbit Outpost). */
'use strict';

/* ===== 15-2 Gravity Flip Station (mode 'gravflip', team) — Gavyn's pick =====
   "A low-gravity station where your switches flip your PARTNER's gravity, so one of you walks on the ceiling to reach
   things the other can't." Friendly and floaty: nothing hurts, a slip is a "Whoopsie!" and a hop back to your beacon.
   - Low gravity: jumps are floatier and longer than in other levels (GRAVFLIP.g / jumpV / maxFall stand in for PHYS
     while the station moves anyone).
   - Gravity switches: Pip's ORANGE switches (map x) flip Bo, Bo's BLUE switches (map y) flip Pip. Stand at one of your
     own and press the action ('flip'). Nobody can flip themselves, and there is no free flip. A switch sits on a floor
     or on a ceiling (a flipped player uses the ceiling ones). A flipped player falls up, walks on the ceiling (drawn
     upside down), ◀ ▶ work as usual and jump pushes away from the ceiling. A flip in mid-air turns a jump around.
   - Partners float through each other here (no standing on heads), whatever their gravity.
   - Buttons (map m, on a floor or a ceiling) open the force fields (map f) while someone stands on them.
   - Zap goo (map z) and falling out into space are a soft "Whoopsie!": back to your own last beacon (map F, lit by
     standing near it, on the floor or the ceiling above it), right way up. Hold ▼ for 1 s to go back there yourself
     (gravity reset), so nobody is ever stuck on a ceiling.
   - Each room has a keycard (map K) that unlocks its exit (map E: a floor airlock, or in the last room a ceiling hatch
     both must stand in, flipped). Stars (map S) are a bonus.
   - Rooms: Docking Bay (over a wall on the ceiling), Hydro Garden (a gap into space, a ceiling button and a floor
     button), Star Lab (goo on the ceiling: jump off and get flipped mid-air onto a floating island), Command Deck (run,
     jump and get flipped up over the goo, two buttons, the ceiling hatch).
   - Help: Blip the friendly robot shows the next job when you are stuck on a step; Gold float (announced) after 3
     whoopsies in a room, or a long time on one step: everything drifts slower (same heights), so mid-air flips are easier.
   Room def: { title, tip, goer: 0|1 (who goes up first, role A), style, plan: [step...], doorSay }. A plan step is
   { A: cond, B: cond, key: true (needs the keycard), jump: [{ x, dir }] (a mid-air flip: where a jumper takes off, for the computer), say: { A: text, B: text } }; a cond is
   { g: 0|1 (gravity: 1 = on the ceiling), zone: [col0, col1] (standing with your centre in those columns), hold: i
   (standing on button i, in reading order), door: true }. The room's progress is the last step whose conds hold (roles
   A and B go to whichever player fits better), worked out only while both are standing. Hints, Blip and the computer
   all read it (gravflipPlan). The exit step is added at the end.
   Every top-level name starts with gravflip / GRAVFLIP (Sfx.extra.gravflip* too); level state lives in G.mst. */
const GRAVFLIP = {
  // low gravity (normal levels: g 2000, jumpV 660, maxFall 900): jumps about 136 px high, about 1 s in the air
  g: 1150, jumpV: 560, maxFall: 560,
  // gold float: gravity times this (jumps keep their height, everything is slower), falls capped lower
  floatG: 0.55, floatFall: 0.75, floatWhoops: 3, floatStuck: 70,
  // switches: a short rest between flips, and a small nudge off the surface
  flipCD: 0.45, flipKick: 50, swReach: 15,
  // whoopsies and going back
  respawn: 0.9, backHold: 1.0, backShow: 0.18, space: 36,
  // flow
  introHold: 0.4, exitHold: 0.35, winHold: 1.6, newsLife: 3.8, blipAfter: 24, chipT: 7, chipAgain: 16,
};
const gravflipBig = () => (typeof hudBig === 'function' && hudBig());
const gravflipCpu = id => typeof cpuSolo === 'function' && cpuSolo() && cpuOn(id);   // 1-player mode: the computer's character
const gravflipIx = (c, r) => r * COLS + c;
const gravflipSolid = (c, r) => tile(c, r) === '#';

/* ---------- each player's own keys (keyboard, controller or touch) for the hint chips ---------- */
function gravflipDev(id) { try { return actKey(id); } catch (e) { return 'kb'; } }
function gravflipKey(id) {
  const d = gravflipDev(id);
  if (d === 'pad') return glyph('act');
  if (d === 'touch') return 'the flip button';
  if (typeof cpuSolo === 'function' && cpuSolo()) return 'F';
  return id === 0 ? 'F' : '/';
}
function gravflipBackKey(id) {
  const d = gravflipDev(id);
  if (d === 'pad') return 'hold the stick down';
  if (d === 'touch') return 'hold ▼';
  if (typeof cpuSolo === 'function' && cpuSolo()) return 'hold S or ↓';
  return id === 0 ? 'hold S' : 'hold ↓';
}
const gravflipColWord = id => (id === 0 ? 'orange' : 'blue');

/* ---------- the room: switches, buttons, goo, keycard, stars, beacons, the exit ---------- */
function gravflipRoom(st, L) {
  const def = L.def, g = L.grid;
  st.k = def.roomIndex || 0;
  st.style = def.style || 'dock';
  st.switches = []; st.buttons = []; st.stars = []; st.key = null; st.gooCells = [];
  st.goo = new Uint8Array(COLS * ROWS);
  const solid = (c, r) => r < 0 || r >= ROWS || c < 0 || c >= COLS || g[r][c] === '#';
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const ch = g[r][c], ceil = solid(c, r - 1) && !solid(c, r + 1);
    if (ch === 'x' || ch === 'y') st.switches.push({ i: st.switches.length, owner: ch === 'x' ? 0 : 1, c, r, ceil, x: c * T + T / 2, surf: ceil ? r * T : (r + 1) * T, flash: 0, near: 0 });
    else if (ch === 'm') st.buttons.push({ i: st.buttons.length, c, r, ceil, x: c * T + T / 2, surf: ceil ? r * T : (r + 1) * T, down: false, by: [false, false], anim: 0 });
    else if (ch === 'z') { st.goo[gravflipIx(c, r)] = ceil ? 2 : 1; st.gooCells.push({ c, r, ceil, ph: (hash(c, r) % 100) / 15 }); }
    else if (ch === 'S') st.stars.push({ x: c * T + T / 2, y: r * T + T / 2, got: false, ph: (hash(r, c) % 100) / 16, pop: 0 });
    else if (ch === 'K') st.key = { x: c * T + T / 2, y: r * T + T / 2, got: false };
    if ('xymSK'.includes(ch)) g[r][c] = '.';
  }
  st.keyGot = !st.key;
  // beacons (map F, parsed by the engine as flags): checkpoints, sorted left to right
  st.beacons = L.flags.map(f => ({ c: Math.round(f.x / T), x: f.x + T / 2, feet: f.y + T, on: [false, false] })).sort((a, b) => a.x - b.x);
  L.flags = [];
  for (const b of st.beacons) b.spots = [0, 1].map(id => gravflipSpot(st, b.x + (id === 0 ? -16 : 16), b.feet));
  // the exit: a floor airlock, or a ceiling hatch when there is hull right above it
  st.exit = L.door; L.door = null;
  st.hatch = !!st.exit && solid(Math.floor(st.exit.x / T), Math.floor(st.exit.y / T) - 1);
  st.grid = g; st.mgrid = g.slice().reverse();   // (the station seen upside down, for anyone whose gravity is flipped)
  // the plan, plus the exit step
  const dg = st.hatch ? 1 : 0;
  st.goer = def.goer || 0;
  st.steps = (def.plan || []).concat([{ A: { g: dg, door: true }, B: { g: dg, door: true }, key: true, exit: true, say: { A: def.doorSay || 'Both into the exit!', B: def.doorSay || 'Both into the exit!' } }]);
  st.idx = -1; st.mapA = st.goer; st.plan = null; st.planTick = -1; st.stepT = 0;
  // per room
  st.grav = [0, 0];
  st.pl = [0, 1].map(id => ({ dead: false, deadT: 0, downT: 0, cd: 0, beacon: -1, spot: { x: L.spawns[id].x, y: L.spawns[id].y }, flipFx: 0, wrongCD: 0, stillT: 0, lastX: 0 }));
  st.roomT = 0; st.roomWhoops = 0; st.float = false; st.phase = 'play'; st.winT = 0; st.exitT = 0; st.doorIn = [false, false];
  st.pops = []; st.news = null; st.winTick = 0;
  st.blip = st.blip || { x: W / 2, y: -50, on: false, t: 0, say: '', face: 1 };
  st.blip.on = false;
  st.stats.roomT[st.k] = 0;
  for (const p of G.players) { p.face = 1; p.downLatch = true; }
}
// a standing spot near x on the floor at feet: clean floor under it, no goo, no field, not on a switch or a button
function gravflipSpot(st, x, feet) {
  const r = Math.round(feet / T) - 1;
  const ok = cx => {
    const x0 = cx - PW / 2, c1 = Math.floor((x0 + 1) / T), c2 = Math.floor((x0 + PW - 1) / T);
    for (let c = c1; c <= c2; c++) {
      if (!gravflipSolid(c, r + 1) || tile(c, r) === '#' || tile(c, r) === 'f' || st.goo[gravflipIx(c, r)]) return false;
      if (st.buttons.some(b => b.c === c && b.r === r) || st.switches.some(s => s.c === c && s.r === r)) return false;
    }
    return true;
  };
  for (let k = 0; k <= 90; k += 2) for (const d of [1, -1]) if (ok(x + d * k)) return { x: x + d * k - PW / 2, y: feet - PH };
  return { x: x - PW / 2, y: feet - PH };
}

/* ---------- moving: everyone in low gravity; a flipped player moves in the station seen upside down ---------- */
function gravflipPhys(st, fn) {
  const s0 = PHYS.g, s1 = PHYS.jumpV, s2 = PHYS.maxFall, k = st && st.float ? GRAVFLIP.floatG : 1;
  PHYS.g = GRAVFLIP.g * k; PHYS.jumpV = GRAVFLIP.jumpV * Math.sqrt(k); PHYS.maxFall = GRAVFLIP.maxFall * (st && st.float ? GRAVFLIP.floatFall : 1);
  try { return fn(); } finally { PHYS.g = s0; PHYS.jumpV = s1; PHYS.maxFall = s2; }
}
function gravflipMirror(p) { p.y = H - p.y - p.h; p.vy = -p.vy; }
function gravflipMove(st, p, dt) {
  const L = G.level, o = other(p), oa = o.alive, flip = st.grav[p.id] === 1, was = p.grounded, n0 = G.particles.length;
  o.alive = false;   // (partners float through each other)
  if (flip) { L.grid = st.mgrid; gravflipMirror(p); }
  let landV = 0;
  try {
    gravflipPhys(st, () => {
      control(p, dt);
      const vy0 = p.vy;
      moveX(p, p.vx * dt, true);
      moveY(p, p.vy * dt, true);
      const pr = probe(p);
      p.tileGround = pr.tile; p.onPartner = false; p.onOneWay = pr.oneway; p.grounded = pr.tile;
      if (p.grounded && !was) landV = vy0;
    });
  } finally {
    if (flip) { gravflipMirror(p); L.grid = st.grid; }
    o.alive = oa;
  }
  // a jump puff made in the upside-down station belongs at the real feet
  if (flip) for (let i = n0; i < G.particles.length; i++) { const q = G.particles[i]; q.y = H - q.y; q.vy = -q.vy; q.grav = -q.grav; }
  if (landV > 220) {
    p.sx = 1.22; p.sy = 0.8;
    puff(p.x + p.w / 2, flip ? p.y : p.y + p.h, 5, 'rgba(220,215,255,0.8)');
    if (flip) for (let i = G.particles.length - 5; i < G.particles.length; i++) if (G.particles[i]) { G.particles[i].vy = -G.particles[i].vy; G.particles[i].grav = -G.particles[i].grav; }
    Sfx.play('land');
  }
}

/* ---------- switches, buttons, fields ---------- */
// a body (x, y, w, h, real coordinates) standing on a surface thing at (x, surf), mounted on a ceiling or a floor
function gravflipStandsOn(thing, box, grav, grounded, reach) {
  if (!grounded || grav !== (thing.ceil ? 1 : 0)) return false;
  if (Math.abs(box.x + box.w / 2 - thing.x) > reach) return false;
  return thing.ceil ? Math.abs(box.y - thing.surf) < 3 : Math.abs(box.y + box.h - thing.surf) < 3;
}
function gravflipSwitchAt(st, p) {
  if (!p.alive) return null;
  for (const sw of st.switches) if (gravflipStandsOn(sw, p, st.grav[p.id], p.grounded, GRAVFLIP.swReach)) return sw;
  return null;
}
function gravflipFlip(st, o, by, sw) {
  const up = (st.grav[o.id] ^= 1) === 1;
  o.grounded = false; o.tileGround = false; o.coyote = 0; o.jumping = false; o.jumpBuf = 0; o.pendingJump = false;
  o.vy += (up ? -1 : 1) * GRAVFLIP.flipKick;
  o.sx = 0.75; o.sy = 1.3;
  st.pl[by.id].cd = GRAVFLIP.flipCD; st.pl[o.id].flipFx = 1;
  if (sw) sw.flash = 1;
  st.stats.flips[by.id]++;
  gravflipPop(st, o.x + o.w / 2, up ? o.y + o.h + 22 : o.y - 16, up ? 'Wheee!' : 'Flip!', PCOL[by.id], 18, up ? 1 : -1);
  Sfx.play(up ? 'gravflipUp' : 'gravflipDown', o.id); rumble(o.id, 0.2, 0.5, 120); rumble(by.id, 0, 0.25, 60);
  for (let i = 0; i < 10; i++) G.particles.push({ x: o.x + o.w / 2, y: o.y + o.h / 2, vx: (Math.random() - 0.5) * 160, vy: (Math.random() - 0.5) * 160, life: 0.5, max: 0.5, col: PCOL[by.id], size: 3 + Math.random() * 3, grav: 0, kind: 'dot' });
}
function gravflipAct(st, p) {
  if (!p.pendingAct) return;
  p.pendingAct = false;
  if (!p.alive || st.phase !== 'play') return;
  const P = st.pl[p.id], sw = gravflipSwitchAt(st, p);
  if (!sw) {
    if (P.wrongCD <= 0) { P.wrongCD = 2.2; gravflipPop(st, p.x + p.w / 2, st.grav[p.id] ? p.y + p.h + 20 : p.y - 14, 'Find your ' + gravflipColWord(p.id) + ' switch', PCOL[p.id], 14, st.grav[p.id] ? 1 : -1); Sfx.play('gravflipNope', p.id); }
    return;
  }
  if (sw.owner !== p.id) {
    if (P.wrongCD <= 0) { P.wrongCD = 1.2; gravflipPop(st, sw.x, sw.ceil ? sw.surf + 50 : sw.surf - 44, 'That’s ' + NAMES[sw.owner] + '’s switch!', PCOL[sw.owner], 15, sw.ceil ? 1 : -1); Sfx.play('gravflipNope', p.id); }
    return;
  }
  const o = other(p);
  if (P.cd > 0 || !o.alive) return;
  gravflipFlip(st, o, p, sw);
}
function gravflipButtons(st, dt) {
  for (const b of st.buttons) {
    const was = b.down;
    b.by = G.players.map(p => p.alive && gravflipStandsOn(b, p, st.grav[p.id], p.grounded, T / 2 + 2));
    b.down = b.by[0] || b.by[1];
    if (b.down && !was) Sfx.play('press');
    b.anim = approach(b.anim, b.down ? 1 : 0, dt * 8);
  }
  const s = G.level.sw.f;
  if (!s) return;
  const want = st.buttons.some(b => b.down);
  if (want !== s.on) {
    // (a field never closes on someone)
    const blocked = !want && s.tiles.some(t => G.players.some(p => p.alive && rectHit(p, t.x * T, t.y * T, T, T)));
    if (!blocked) { s.on = want; Sfx.play(want ? 'gravflipFieldOff' : 'gravflipFieldOn'); }
  }
  s.anim = approach(s.anim, s.on ? 1 : 0, dt * 6);
}

/* ---------- keycard, stars, beacons ---------- */
function gravflipItems(st) {
  for (const p of G.players) {
    if (!p.alive) continue;
    const k = st.key;
    if (k && !k.got && rectHit(p, k.x - 14, k.y - 14, 28, 28)) {
      k.got = true; st.keyGot = true;
      Sfx.play('gravflipKey'); burst(k.x, k.y, C.gold, 18); rumble(0, 0, 0.4, 90); rumble(1, 0, 0.4, 90);
      gravflipPop(st, k.x, k.y - 20, 'Keycard!', C.gold, 20, -1);
      gravflipNews(st, st.hatch ? 'Keycard! The hatch is open' : 'Keycard! The airlock is open', false);
    }
    for (const s of st.stars) if (!s.got && rectHit(p, s.x - 13, s.y - 13, 26, 26)) {
      s.got = true; s.pop = 1; st.stats.stars++;
      Sfx.play('gravflipStar'); burst(s.x, s.y, '#fff3a8', 10);
    }
  }
}
function gravflipBeacons(st) {
  for (const p of G.players) {
    if (!p.alive || !p.grounded) continue;
    const P = st.pl[p.id], cx = p.x + p.w / 2;
    st.beacons.forEach((b, i) => {
      if (i <= P.beacon || Math.abs(cx - b.x) > 40) return;
      P.beacon = i; P.spot = b.spots[p.id]; b.on[p.id] = true;
      Sfx.play('gravflipBeacon', p.id);
      burst(b.x, b.feet - 46, PCOL[p.id], 8);
    });
  }
}

/* ---------- whoopsies (goo, space) and going back ---------- */
function gravflipHazards(st, p) {
  if (!p.alive) return;
  if (p.y > H + GRAVFLIP.space || p.y + p.h < -GRAVFLIP.space) { gravflipWhoops(st, p, 'space'); return; }
  const c1 = Math.floor((p.x + 2) / T), c2 = Math.floor((p.x + p.w - 2) / T), r1 = Math.floor(p.y / T), r2 = Math.floor((p.y + p.h) / T);
  for (let r = Math.max(0, r1); r <= Math.min(ROWS - 1, r2); r++) for (let c = Math.max(0, c1); c <= Math.min(COLS - 1, c2); c++) {
    const gz = st.goo[gravflipIx(c, r)];
    if (!gz) continue;
    // the fizzy layer is the 12 px next to the floor (or the ceiling)
    const y0 = gz === 2 ? r * T : (r + 1) * T - 12;
    if (rectHit(p, c * T + 3, y0, T - 6, 12)) { gravflipWhoops(st, p, 'goo'); return; }
  }
}
function gravflipWhoops(st, p, why) {
  if (!p.alive) return;
  const P = st.pl[p.id], cx = p.x + p.w / 2, cy = clamp(p.y + p.h / 2, 20, H - 20);
  p.alive = false; P.dead = true; P.deadT = GRAVFLIP.respawn;
  st.stats.whoops[p.id]++; st.roomWhoops++;
  gravflipPop(st, cx, clamp(cy, 110, H - 60), why === 'goo' ? 'Zap! Whoopsie!' : 'Whoopsie!', why === 'goo' ? '#b6ff8a' : '#d6ccff', 22, cy < H / 2 ? 1 : -1);
  for (let i = 0; i < 16; i++) G.particles.push({ x: cx, y: cy, vx: (Math.random() - 0.5) * 200, vy: (Math.random() - 0.5) * 200, life: 0.8, max: 0.8, col: why === 'goo' ? '#9dff6a' : PCOL[p.id], size: 3 + Math.random() * 4, grav: 0, kind: 'dot' });
  Sfx.play(why === 'goo' ? 'gravflipZap' : 'gravflipWhoops', p.id); rumble(p.id, 0.5, 0.5, 160);
  if (!st.float && st.roomWhoops >= GRAVFLIP.floatWhoops) gravflipFloat(st);
}
// back on your own beacon, the right way up
function gravflipRespawn(st, p, tow) {
  const P = st.pl[p.id], s = P.spot, input = p.input;
  st.grav[p.id] = 0;
  Object.assign(p, { x: s.x, y: s.y, vx: 0, vy: 0, alive: true, grounded: false, jumping: false, jumpBuf: 0, pendingJump: false, coyote: 0, stun: 0, dropT: 0, sx: 0.6, sy: 1.4, carryVx: 0, offT: 0, knockT: 0, input });
  p.pendingAct = false; p.downLatch = true;
  P.dead = false; P.downT = 0; st.fresh = true;   // (a fresh look at the plan: someone is back at a beacon)
  for (let i = 0; i < 12; i++) G.particles.push({ x: p.x + p.w / 2, y: p.y + p.h / 2, vx: (Math.random() - 0.5) * 140, vy: (Math.random() - 0.5) * 140, life: 0.5, max: 0.5, col: tow ? '#9fe8ff' : 'rgba(255,255,255,0.9)', size: 3 + Math.random() * 3, grav: 0, kind: 'dot' });
  gravflipPop(st, p.x + p.w / 2, p.y - 14, tow ? 'Tow!' : 'Boing!', '#9fe8ff', 17, -1);
  Sfx.play('gravflipBack', p.id);
}
function gravflipBackStep(st, p, dt) {
  const P = st.pl[p.id];
  if (p.alive && p.input.down && !p.downLatch && st.phase === 'play') {
    P.downT += dt;
    if (P.downT >= GRAVFLIP.backHold) { P.downT = 0; st.stats.backs++; gravflipRespawn(st, p, true); }
  } else P.downT = 0;
}

/* ---------- the plan: what the room needs next (hints, Blip and the computer all read it) ---------- */
function gravflipCondAt(st, c, box, grav, grounded) {
  if (!c) return true;
  if (c.g != null && grav !== c.g) return false;
  if (c.zone) { if (!grounded) return false; const col = Math.floor((box.x + box.w / 2) / T); if (col < c.zone[0] || col > c.zone[1]) return false; }
  if (c.hold != null) { const b = st.buttons[c.hold]; if (!b || !gravflipStandsOn(b, box, grav, grounded, T / 2 + 2)) return false; }
  if (c.door && !gravflipInExit(st, box)) return false;
  return true;
}
const gravflipCondOk = (st, p, c) => !c || (p.alive && gravflipCondAt(st, c, p, st.grav[p.id], p.grounded));
function gravflipInExit(st, box) {
  const d = st.exit;
  if (!d) return false;
  const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
  return cx > d.x + 2 && cx < d.x + d.w - 2 && cy > d.y && cy < d.y + d.h;
}
function gravflipMet(st, s, A, B) { return (!s.key || st.keyGot) && gravflipCondOk(st, A, s.A) && gravflipCondOk(st, B, s.B); }
// only the gravity part of a step (and the keycard)
function gravflipSoftMet(st, s, A, B) {
  const ok = (p, c) => !c || c.g == null || (p.alive && st.grav[p.id] === c.g);
  return !!s && (!s.key || st.keyGot) && ok(A, s.A) && ok(B, s.B);
}
// { idx (the last step done, -1 none), si (the step to do), step, A, B (player ids in those roles), role(id) }
function gravflipPlan(st) {
  if (st.plan && st.planTick === G.tickN) return st.plan;
  st.planTick = G.tickN;
  const ps = G.players;
  // (only while both stand: a jump or a fall in the middle of a flip doesn't count as going back)
  if (!st.plan || ps.every(p => p.alive && p.grounded)) {
    const prog = a => { const A = ps[a], B = ps[1 - a]; for (let i = st.steps.length - 1; i >= 0; i--) if (gravflipMet(st, st.steps[i], A, B)) return i; return -1; };
    const pg = prog(st.goer), po = prog(1 - st.goer);
    let a = st.mapA;
    if (pg > po) a = st.goer; else if (po > pg) a = 1 - st.goer;
    let idx = a === st.goer ? pg : po;
    // on the way between two zones nothing is met: the step done stays done while its gravity still holds
    if (a === st.mapA && !st.fresh && idx < st.idx && gravflipSoftMet(st, st.steps[st.idx], ps[a], ps[1 - a])) idx = st.idx;
    if (idx !== st.idx || a !== st.mapA) { st.idx = idx; st.mapA = a; st.stepT = 0; }
    st.fresh = false;
  }
  const si = Math.min(st.idx + 1, st.steps.length - 1), a = st.mapA;
  st.plan = { idx: st.idx, si, step: st.steps[si], A: a, B: 1 - a, role: id => (id === a ? 'A' : 'B') };
  return st.plan;
}
// what one player still has to do in the step: 'flip' (be flipped), 'flipper' (flip the partner), 'move', or ''
function gravflipJob(st, pl, id) {
  const p = G.players[id], o = G.players[1 - id], R = pl.role(id), Q = R === 'A' ? 'B' : 'A';
  const cMe = pl.step[R], cQ = pl.step[Q];
  if (cQ && cQ.g != null && st.grav[o.id] !== cQ.g) return 'flipper';
  if (cMe && cMe.g != null && st.grav[id] !== cMe.g) return 'flip';
  if (cMe && !gravflipCondOk(st, p, cMe)) return 'move';
  return '';
}
// a hint line with names and each player's own keys filled in
function gravflipFill(st, s, pl) {
  const a = pl.A, b = pl.B;
  return s.replace(/\{A\}/g, NAMES[a]).replace(/\{B\}/g, NAMES[b]).replace(/\{Akey\}/g, gravflipKey(a)).replace(/\{Bkey\}/g, gravflipKey(b))
    .replace(/\{Acol\}/g, gravflipColWord(a)).replace(/\{Bcol\}/g, gravflipColWord(b));
}

/* ---------- help: gold float, Blip the robot, news ---------- */
function gravflipFloat(st) {
  st.float = true;
  gravflipNews(st, 'Gold float! Everything drifts slower in this room', true);
  Sfx.play('gravflipGold');
  st.blip.say = 'Floaty mode on!'; st.blip.sayT = 2.5;
}
function gravflipNews(st, s, gold, life) { st.news = { s, gold: !!gold, t: 0, life: life || GRAVFLIP.newsLife }; }
function gravflipPop(st, x, y, s, col, size, dir) { st.pops.push({ x, y, s, col: col || C.gold, size: size || 18, t: 0, dir: dir || -1 }); }
// where Blip points: the flipper's nearest own switch (that they can use the way up they are), or the mover's goal
function gravflipFocus(st, pl) {
  for (const id of [pl.A, pl.B]) {
    const job = gravflipJob(st, pl, id), p = G.players[id];
    if (job === 'flipper') {
      let best = null, bd = Infinity;
      for (const sw of st.switches) if (sw.owner === id && sw.ceil === (st.grav[id] === 1)) { const d = Math.abs(sw.x - (p.x + p.w / 2)) + Math.abs(sw.surf - p.y); if (d < bd) { bd = d; best = sw; } }
      if (best) return { id, x: best.x, y: best.ceil ? best.surf + 70 : best.surf - 70, dir: best.ceil ? -1 : 1 };
    }
  }
  for (const id of [pl.A, pl.B]) {
    const job = gravflipJob(st, pl, id), c = pl.step[pl.role(id)];
    if ((job === 'move' || job === 'flip') && c) {
      const up = c.g === 1;
      if (c.hold != null && st.buttons[c.hold]) { const b = st.buttons[c.hold]; return { id, x: b.x, y: b.ceil ? b.surf + 70 : b.surf - 70, dir: b.ceil ? -1 : 1 }; }
      if (c.door && st.exit) return { id, x: st.exit.x + st.exit.w / 2, y: st.hatch ? st.exit.y + st.exit.h + 50 : st.exit.y - 40, dir: st.hatch ? -1 : 1 };
      if (c.zone) return { id, x: (c.zone[0] + c.zone[1] + 1) * T / 2, y: up ? 140 : 400, dir: up ? -1 : 1 };
    }
  }
  return null;
}
function gravflipHelp(st, pl, dt) {
  st.stepT += dt;
  if (!st.float && st.stepT >= GRAVFLIP.floatStuck) gravflipFloat(st);
  const b = st.blip, f = gravflipFocus(st, pl);
  b.t += dt; if (b.sayT > 0) b.sayT -= dt;
  b.on = st.phase === 'play' && st.stepT >= GRAVFLIP.blipAfter && !!f;
  if (b.on) {
    const tx = clamp(f.x, 50, W - 50), ty = clamp(f.y, 110, H - 60);
    b.face = tx > b.x ? 1 : -1;
    b.x += (tx - b.x) * Math.min(1, dt * 2); b.y += (ty + Math.sin(b.t * 3) * 6 - b.y) * Math.min(1, dt * 2);
    b.dir = f.dir;
    if (Math.floor(b.t / 4) !== Math.floor((b.t - dt) / 4)) Sfx.play('gravflipBlip');
  } else { b.x += (W / 2 - b.x) * Math.min(1, dt); b.y += (-60 - b.y) * Math.min(1, dt); }
}

/* ---------- the exit ---------- */
function gravflipExitStep(st, dt) {
  const d = st.exit;
  if (!d) return;
  const dg = st.hatch ? 1 : 0;
  st.doorIn = G.players.map(p => p.alive && st.grav[p.id] === dg && gravflipInExit(st, p));
  if (st.keyGot && st.doorIn[0] && st.doorIn[1]) { st.exitT += dt; if (st.exitT >= GRAVFLIP.exitHold) gravflipWin(st); }
  else st.exitT = 0;
}
function gravflipWin(st) {
  st.phase = 'won'; st.winT = 0;
  st.stats.roomT[st.k] = st.roomT;
  const d = st.exit;
  Sfx.play('gravflipRoom'); rumble(0, 0.3, 0.6, 250); rumble(1, 0.3, 0.6, 250);
  for (let i = 0; i < 40; i++) confetti(d.x + d.w / 2, st.hatch ? d.y + d.h : d.y + 10);
}

/* ---------- the tick (ownStep) ---------- */
function gravflipStep(st, dt) {
  if (st.phase === 'won') {
    st.winT += dt; st.winTick++;
    for (const p of G.players) { p.pendingAct = false; p.pendingJump = false; }
    if (st.winT < 1.0 && st.winTick % 14 === 0 && st.exit) confetti(st.exit.x + st.exit.w / 2, st.hatch ? st.exit.y + st.exit.h : st.exit.y);
    if (st.winT >= GRAVFLIP.winHold) { const L = G.level; if (L.def.roomIndex < L.def.roomCount - 1) nextRoom(); else levelClear(); }
    return;
  }
  if (G.introT > GRAVFLIP.introHold) { for (const p of G.players) { p.pendingAct = false; p.pendingJump = false; } return; }
  st.roomT += dt;
  for (const p of G.players) {
    const P = st.pl[p.id];
    P.cd = Math.max(0, P.cd - dt); P.wrongCD -= dt; P.flipFx = Math.max(0, P.flipFx - dt * 2);
    if (P.dead) { p.pendingAct = false; p.pendingJump = false; P.deadT -= dt; if (P.deadT <= 0) gravflipRespawn(st, p, false); continue; }
    gravflipMove(st, p, dt);
    gravflipHazards(st, p);
    gravflipBackStep(st, p, dt);
    if (p.alive && st.grav[p.id]) st.stats.ceilT[p.id] += dt;
  }
  for (const p of G.players) gravflipAct(st, p);
  gravflipButtons(st, dt);
  gravflipItems(st);
  gravflipBeacons(st);
  for (const sw of st.switches) { sw.flash = Math.max(0, sw.flash - dt * 2.5); sw.near = approach(sw.near, G.players.some(p => gravflipSwitchAt(st, p) === sw && p.id === sw.owner) ? 1 : 0, dt * 6); }
  for (const s of st.stars) s.pop = Math.max(0, s.pop - dt * 2);
  const pl = gravflipPlan(st);
  gravflipHelp(st, pl, dt);
  gravflipExitStep(st, dt);
  st.pops = st.pops.filter(q => (q.t += dt) < 1.3);
  if (st.news) { st.news.t += dt; if (st.news.t > st.news.life) st.news = null; }
}

/* ---------- drawing ---------- */
let gravflipBack = null;
const GRAVFLIP_STYLE = {
  dock: { wall: ['#262a62', '#1a1c46'], panel: 'rgba(160,170,255,0.06)', trim: '#7fe3ff' },
  garden: { wall: ['#1d3b4f', '#142a3a'], panel: 'rgba(150,255,210,0.06)', trim: '#8dffb8' },
  lab: { wall: ['#2e2560', '#1d1844'], panel: 'rgba(220,170,255,0.07)', trim: '#e0a8ff' },
  deck: { wall: ['#1f2b5a', '#151c40'], panel: 'rgba(150,200,255,0.06)', trim: '#ffd77a' },
};
function gravflipSpace(c, x, y, w, h, seed) {
  c.fillStyle = '#0b0d2c'; c.fillRect(x, y, w, h);
  c.fillStyle = '#ffffff';
  for (let i = 0; i < w * h / 700; i++) { const sx = x + hash(i, seed) % Math.max(1, w), sy = y + hash(seed, i * 7) % Math.max(1, h), r = (hash(i, i + seed) % 10) / 10; c.globalAlpha = 0.4 + r * 0.6; c.fillRect(sx, sy, r > 0.8 ? 2 : 1.2, r > 0.8 ? 2 : 1.2); }
  c.globalAlpha = 1;
}
function gravflipPaintBack(c, st, L) {
  const S = GRAVFLIP_STYLE[st.style] || GRAVFLIP_STYLE.dock, g = L.grid;
  // space behind everything (it shows through the holes and the windows)
  gravflipSpace(c, 0, 0, W, H, 3);
  // the station's inner wall
  const gr = c.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, S.wall[0]); gr.addColorStop(1, S.wall[1]);
  c.fillStyle = gr;
  const spaceCell = (cc, r) => g[r][cc] !== '#' && (r <= 1 || r >= ROWS - 2);
  for (let r = 0; r < ROWS; r++) for (let cc = 0; cc < COLS; cc++) if (!spaceCell(cc, r)) c.fillRect(cc * T - 0.5, r * T - 0.5, T + 1, T + 1);
  // wall panels with seams and rivets
  c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 2;
  for (let x = 60; x < W - 60; x += 120) { c.beginPath(); c.moveTo(x, 60); c.lineTo(x, H - 60); c.stroke(); }
  c.fillStyle = S.panel;
  for (let x = 66; x < W - 120; x += 120) for (let y = 70; y < H - 120; y += 140) c.fillRect(x, y, 108, 126);
  c.fillStyle = 'rgba(255,255,255,0.08)';
  for (let x = 66; x < W - 120; x += 120) for (let y = 70; y < H - 120; y += 140) for (const [dx, dy] of [[5, 5], [103, 5], [5, 121], [103, 121]]) { c.beginPath(); c.arc(x + dx, y + dy, 2, 0, Math.PI * 2); c.fill(); }
  // round windows onto space (and the ringed planet)
  const wins = { dock: [[200, 180], [500, 160], [770, 190]], garden: [[150, 165], [420, 290], [650, 170]], lab: [[110, 180], [640, 150], [840, 270]], deck: [[300, 180], [520, 340]] }[st.style] || [];
  wins.forEach(([x, y], i) => gravflipWindow(c, x, y, 34, i + st.k * 3));
  if (st.style === 'deck') gravflipBigWindow(c, 610, 190);
  gravflipDeco(c, st);
  // the hull: metal panels, a lit walkway trim on every floor AND every ceiling (people walk on both here)
  for (let r = 0; r < ROWS; r++) for (let cc = 0; cc < COLS; cc++) {
    if (g[r][cc] !== '#') continue;
    const x = cc * T, y = r * T, edge = cc <= 1 || cc >= COLS - 2 || r <= 0 || r >= ROWS - 1;
    c.fillStyle = edge ? C.stoneEdge : C.stone; c.fillRect(x - 0.5, y - 0.5, T + 1, T + 1);
    c.fillStyle = 'rgba(255,255,255,0.07)'; c.fillRect(x + 2, y + 2, T - 4, 3);
    c.fillStyle = 'rgba(0,0,0,0.16)'; c.fillRect(x + 2, y + T - 4, T - 4, 2);
    if ((cc + r) % 2 === 0) { c.fillStyle = 'rgba(255,255,255,0.12)'; for (const [dx, dy] of [[5, 6], [T - 5, 6], [5, T - 6], [T - 5, T - 6]]) { c.beginPath(); c.arc(x + dx, y + dy, 1.4, 0, Math.PI * 2); c.fill(); } }
    const openAbove = r > 0 && g[r - 1][cc] !== '#', openBelow = r < ROWS - 1 && g[r + 1][cc] !== '#';
    if (openAbove && !(r - 1 <= 1 && spaceCell(cc, r - 1))) { c.fillStyle = C.grassDark; c.fillRect(x, y, T, 7); c.fillStyle = C.grass; c.fillRect(x, y, T, 4); c.fillStyle = S.trim; c.globalAlpha = 0.5; c.fillRect(x + 4, y + 5, T - 8, 1.5); c.globalAlpha = 1; }
    if (openBelow && !(r + 1 >= ROWS - 2 && spaceCell(cc, r + 1))) { c.fillStyle = C.grassDark; c.fillRect(x, y + T - 7, T, 7); c.fillStyle = C.grass; c.fillRect(x, y + T - 4, T, 4); c.fillStyle = S.trim; c.globalAlpha = 0.5; c.fillRect(x + 4, y + T - 6.5, T - 8, 1.5); c.globalAlpha = 1; }
    // yellow and dark stripes at the edge of a hole into space
    for (const d of [-1, 1]) {
      const nc = cc + d;
      if (nc < 0 || nc >= COLS || !spaceCell(nc, r)) continue;
      if (!(r >= ROWS - 2 && openAbove) && !(r <= 1 && openBelow)) continue;
      c.save(); c.beginPath(); c.rect(x, r >= ROWS - 2 ? y : y + T - 8, T, 8); c.clip();
      for (let k = -2; k < 6; k++) { c.fillStyle = k % 2 ? '#2a2440' : '#ffd23f'; c.beginPath(); const sx = x + k * 8; c.moveTo(sx, y + (r >= ROWS - 2 ? 8 : T)); c.lineTo(sx + 8, y + (r >= ROWS - 2 ? 0 : T - 8)); c.lineTo(sx + 16, y + (r >= ROWS - 2 ? 0 : T - 8)); c.lineTo(sx + 8, y + (r >= ROWS - 2 ? 8 : T)); c.fill(); }
      c.restore();
    }
  }
}
function gravflipWindow(c, x, y, r, seed) {
  c.fillStyle = '#3a3f66'; c.beginPath(); c.arc(x, y, r + 7, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#8f95bf'; c.beginPath(); c.arc(x, y, r + 4, 0, Math.PI * 2); c.fill();
  c.save(); c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.clip();
  gravflipSpace(c, x - r, y - r, 2 * r, 2 * r, seed + 11);
  if (seed % 3 === 1) { c.fillStyle = '#ff9fb8'; c.beginPath(); c.arc(x + r * 0.35, y + r * 0.2, r * 0.42, 0, Math.PI * 2); c.fill(); c.fillStyle = 'rgba(255,255,255,0.25)'; c.beginPath(); c.arc(x + r * 0.25, y + r * 0.08, r * 0.15, 0, Math.PI * 2); c.fill(); }
  if (seed % 3 === 2) { c.fillStyle = '#9fd6ff'; c.beginPath(); c.arc(x - r * 0.3, y - r * 0.25, r * 0.22, 0, Math.PI * 2); c.fill(); }
  c.fillStyle = 'rgba(255,255,255,0.12)'; c.beginPath(); c.ellipse(x - r * 0.35, y - r * 0.4, r * 0.35, r * 0.16, -0.6, 0, Math.PI * 2); c.fill();
  c.restore();
  c.fillStyle = 'rgba(255,255,255,0.35)'; for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; c.beginPath(); c.arc(x + Math.cos(a) * (r + 5.5), y + Math.sin(a) * (r + 5.5), 1.4, 0, Math.PI * 2); c.fill(); }
}
// the Command Deck's big window with the ringed planet
function gravflipBigWindow(c, x, y) {
  const w = 200, h = 110;
  c.fillStyle = '#3a3f66'; c.beginPath(); c.roundRect ? c.roundRect(x - w / 2 - 8, y - h / 2 - 8, w + 16, h + 16, 24) : c.rect(x - w / 2 - 8, y - h / 2 - 8, w + 16, h + 16); c.fill();
  c.save(); c.beginPath(); c.roundRect ? c.roundRect(x - w / 2, y - h / 2, w, h, 18) : c.rect(x - w / 2, y - h / 2, w, h); c.clip();
  gravflipSpace(c, x - w / 2, y - h / 2, w, h, 77);
  c.fillStyle = '#c9a7ff'; c.beginPath(); c.arc(x + 30, y + 10, 34, 0, Math.PI * 2); c.fill();
  c.fillStyle = 'rgba(120,80,200,0.35)'; c.fillRect(x - 10, y + 2, 80, 6); c.fillRect(x - 4, y + 18, 70, 5);
  c.strokeStyle = '#ffe2a8'; c.lineWidth = 4; c.beginPath(); c.ellipse(x + 30, y + 12, 58, 13, -0.25, 0, Math.PI * 2); c.stroke();
  c.fillStyle = '#ffe9a0'; c.beginPath(); c.arc(x - 60, y - 20, 9, 0, Math.PI * 2); c.fill();
  c.restore();
  c.strokeStyle = '#8f95bf'; c.lineWidth = 3; c.beginPath(); c.moveTo(x, y - h / 2); c.lineTo(x, y + h / 2); c.stroke();
}
function gravflipDeco(c, st) {
  if (st.style === 'dock') {
    // cargo crates and a parked shuttle silhouette
    for (const [x, w, h, col] of [[100, 50, 40, '#7a6a9a'], [700, 60, 46, '#5f7aa8'], [756, 40, 30, '#8a6a7a']]) {
      c.fillStyle = col; c.fillRect(x, 480 - h, w, h); c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 2; c.strokeRect(x + 1, 480 - h + 1, w - 2, h - 2);
      c.beginPath(); c.moveTo(x + 2, 480 - h + 2); c.lineTo(x + w - 2, 478); c.moveTo(x + w - 2, 480 - h + 2); c.lineTo(x + 2, 478); c.stroke();
    }
    c.fillStyle = 'rgba(255,215,120,0.18)'; c.font = '700 13px "Atkinson Hyperlegible", sans-serif'; c.textAlign = 'center'; c.fillText('DOCK 7', 560, 300);
  } else if (st.style === 'garden') {
    // hanging planters (they hang from the ceiling, of course) and floor pots
    for (const x of [140, 300, 560]) {
      c.strokeStyle = 'rgba(200,255,220,0.35)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x, 90); c.lineTo(x, 124); c.stroke();
      c.fillStyle = '#c47a4a'; c.beginPath(); c.moveTo(x - 14, 124); c.lineTo(x + 14, 124); c.lineTo(x + 10, 142); c.lineTo(x - 10, 142); c.closePath(); c.fill();
      c.fillStyle = '#5fd18a'; for (let k = -2; k <= 2; k++) { c.beginPath(); c.ellipse(x + k * 6, 148 + Math.abs(k) * 4, 4, 10, k * 0.3, 0, Math.PI * 2); c.fill(); }
    }
    for (const x of [90, 220, 800]) {
      c.fillStyle = '#b8693e'; c.fillRect(x - 12, 462, 24, 18);
      c.fillStyle = '#4fc47c'; for (let k = -2; k <= 2; k++) { c.beginPath(); c.ellipse(x + k * 5, 452 - Math.abs(k) * 3, 4, 11, k * 0.3, 0, Math.PI * 2); c.fill(); }
      c.fillStyle = '#ff8fc7'; c.beginPath(); c.arc(x, 440, 4, 0, Math.PI * 2); c.fill();
    }
  } else if (st.style === 'lab') {
    // screens with wiggly graphs and bubbling tubes
    for (const [x, y] of [[250, 300], [760, 140]]) {
      c.fillStyle = '#141236'; c.fillRect(x - 40, y - 26, 80, 52); c.strokeStyle = '#8f95bf'; c.lineWidth = 3; c.strokeRect(x - 40, y - 26, 80, 52);
      c.strokeStyle = '#7dffb0'; c.lineWidth = 2; c.beginPath(); for (let k = 0; k <= 16; k++) c.lineTo(x - 34 + k * 4.25, y + Math.sin(k * 0.9 + x) * 12); c.stroke();
    }
    for (const x of [790, 820, 850]) {
      c.fillStyle = 'rgba(200,220,255,0.25)'; c.fillRect(x - 6, 430, 12, 50);
      c.fillStyle = x === 820 ? '#ff8fc7' : '#7dd6ff'; c.fillRect(x - 5, 452, 10, 27);
    }
  } else if (st.style === 'deck') {
    // control consoles with blinking-light panels (the lights are drawn live)
    for (const x of [120, 330]) { c.fillStyle = '#3d4472'; c.fillRect(x - 40, 440, 80, 40); c.fillStyle = '#2a2f55'; c.fillRect(x - 36, 444, 72, 14); }
  }
}
function gravflipDrawBack(st) {
  const L = G.level, cw = canvas.width, ch = canvas.height;
  try {
    if (!gravflipBack || gravflipBack.L !== L || gravflipBack.cv.width !== cw || gravflipBack.cv.height !== ch) {
      const cv = (gravflipBack && gravflipBack.cv) || document.createElement('canvas');
      cv.width = cw; cv.height = ch;
      const c = cv.getContext('2d');
      c.setTransform(cw / W, 0, 0, ch / H, 0, 0); c.clearRect(0, 0, W, H);
      gravflipPaintBack(c, st, L);
      gravflipBack = { cv, L };
    }
    ctx.drawImage(gravflipBack.cv, 0, 0, W, H);
  } catch (e) { gravflipBack = null; gravflipPaintBack(ctx, st, L); }
}
function gravflipDrawField(st, t) {
  const s = G.level.sw.f;
  if (!s) return;
  const a = s.anim;
  for (const tl of s.tiles) {
    const x = tl.x * T, y = tl.y * T;
    if (a < 0.98) {
      ctx.save(); ctx.globalAlpha = 0.85 * (1 - a);
      ctx.fillStyle = 'rgba(94,240,255,0.22)'; ctx.fillRect(x + 2, y, T - 4, T);
      for (let k = 0; k < 3; k++) {
        const fl = reduceMotion ? 0.7 : 0.5 + 0.5 * Math.sin(t * 9 + k * 2 + tl.y);
        ctx.fillStyle = 'rgba(160,250,255,' + (0.45 + 0.4 * fl).toFixed(2) + ')'; ctx.fillRect(x + 5 + k * 8.5, y, 3, T);
      }
      ctx.restore();
    }
    ctx.save(); ctx.globalAlpha = 0.35 + 0.25 * (1 - a); ctx.strokeStyle = '#5ef0ff'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]);
    ctx.strokeRect(x + 2, y + 1, T - 4, T - 2); ctx.restore();
  }
}
// a gravity switch: a little console in its owner's colour, with ⇅ on its screen (mirrored on a ceiling)
function gravflipDrawSwitch(st, sw, t) {
  const col = PCOL[sw.owner], dark = PDARK[sw.owner], lit = Math.max(sw.near, sw.flash);
  ctx.save(); ctx.translate(sw.x, sw.surf); if (sw.ceil) ctx.scale(1, -1);
  ctx.fillStyle = '#2b2d50'; rr(-12, -6, 24, 6, 2); ctx.fill();
  ctx.fillStyle = '#4a4e7e'; ctx.fillRect(-3, -20, 6, 15);
  ctx.fillStyle = dark; rr(-12, -34, 24, 16, 6); ctx.fill();
  ctx.fillStyle = col; rr(-10, -32, 20, 12, 5); ctx.fill();
  if (lit > 0) { ctx.globalAlpha = 0.5 * lit; ctx.fillStyle = '#fff'; rr(-10, -32, 20, 12, 5); ctx.fill(); ctx.globalAlpha = 1; }
  // ⇅ arrows
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-4, -22.5); ctx.lineTo(-4, -29.5); ctx.moveTo(-6.5, -27); ctx.lineTo(-4, -29.5); ctx.lineTo(-1.5, -27);
  ctx.moveTo(4, -29.5); ctx.lineTo(4, -22.5); ctx.moveTo(1.5, -25); ctx.lineTo(4, -22.5); ctx.lineTo(6.5, -25); ctx.stroke();
  ctx.lineCap = 'butt';
  if (sw.flash > 0) { ctx.globalAlpha = sw.flash; ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, -26, 16 + (1 - sw.flash) * 18, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1; }
  ctx.restore();
}
function gravflipDrawButton(b) {
  ctx.save(); ctx.translate(b.x, b.surf); if (b.ceil) ctx.scale(1, -1);
  ctx.fillStyle = '#2b2d50'; rr(-13, -5, 26, 5, 2); ctx.fill();
  const h = 7 - b.anim * 4;
  ctx.fillStyle = b.down ? '#bffaff' : '#5ef0ff'; rr(-10, -5 - h, 20, h + 1, 3); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(-7, -4 - h, 14, 1.5);
  ctx.restore();
}
function gravflipDrawGoo(st, t) {
  for (const gc of st.gooCells) {
    const x = gc.c * T, base = gc.ceil ? gc.r * T : (gc.r + 1) * T, s = gc.ceil ? 1 : -1;
    const wob = k => (reduceMotion ? 0 : Math.sin(t * 4 + gc.ph + k) * 1.5);
    ctx.fillStyle = '#4fd65a';
    ctx.beginPath(); ctx.moveTo(x, base);
    for (let k = 0; k <= 6; k++) ctx.lineTo(x + k * 5, base + s * (9 + wob(k) + (k % 2) * 2));
    ctx.lineTo(x + T, base); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#9dff6a'; ctx.fillRect(x, gc.ceil ? base : base - 4, T, 4);
    // fizzy bubbles drifting away from the surface
    for (let k = 0; k < 2; k++) {
      const ph = ((t * 0.8 + gc.ph * 0.3 + k * 0.5) % 1);
      ctx.globalAlpha = 1 - ph; ctx.fillStyle = '#c9ffb0';
      circle(x + 8 + k * 13 + Math.sin(t * 3 + k) * 2, base + s * (8 + ph * 18), 2 + k * 0.6); ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (!reduceMotion && hash(gc.c, Math.floor(t * 6)) % 9 === 0) { ctx.strokeStyle = '#ffffa0'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x + 10, base + s * 4); ctx.lineTo(x + 15, base + s * 11); ctx.lineTo(x + 12, base + s * 12); ctx.lineTo(x + 18, base + s * 19); ctx.stroke(); }
  }
}
function gravflipDrawKey(st, t) {
  const k = st.key;
  if (!k || k.got) return;
  const bob = reduceMotion ? 0 : Math.sin(t * 3) * 3, x = k.x, y = k.y + bob;
  ctx.fillStyle = 'rgba(255,215,90,0.28)'; circle(x, y, 17 + (reduceMotion ? 0 : Math.sin(t * 5) * 2)); ctx.fill();
  ctx.save(); ctx.translate(x, y); ctx.rotate(reduceMotion ? 0 : Math.sin(t * 2) * 0.15);
  ctx.fillStyle = C.gold; ctx.strokeStyle = C.goldDark; ctx.lineWidth = 2; rr(-11, -8, 22, 16, 3); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#2b2d50'; ctx.fillRect(-11, -4, 22, 3);
  ctx.fillStyle = '#7fe3ff'; rr(-7, 1, 7, 5, 1); ctx.fill();
  ctx.restore();
}
function gravflipStarShape(x, y, r) {
  ctx.beginPath();
  for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rad = k % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad); }
  ctx.closePath();
}
function gravflipDrawStars(st, t) {
  for (const s of st.stars) {
    if (s.got) { if (s.pop > 0) { ctx.save(); ctx.globalAlpha = s.pop; ctx.strokeStyle = '#fff3a8'; ctx.lineWidth = 2; circle(s.x, s.y, 8 + (1 - s.pop) * 20); ctx.stroke(); ctx.restore(); } continue; }
    const tw = reduceMotion ? 1 : 0.85 + 0.15 * Math.sin(t * 4 + s.ph), y = s.y + (reduceMotion ? 0 : Math.sin(t * 2 + s.ph) * 2);
    ctx.fillStyle = 'rgba(255,230,120,0.25)'; circle(s.x, y, 14 * tw); ctx.fill();
    ctx.fillStyle = '#ffd84a'; ctx.strokeStyle = '#b9850f'; ctx.lineWidth = 1.5; gravflipStarShape(s.x, y, 9 * tw); ctx.fill(); ctx.stroke();
  }
}
function gravflipDrawBeacon(b, t) {
  const x = b.x, y = b.feet;
  ctx.fillStyle = '#4a4e7e'; ctx.fillRect(x - 2, y - 40, 4, 40); ctx.fillStyle = '#2b2d50'; rr(x - 9, y - 5, 18, 5, 2); ctx.fill();
  ctx.fillStyle = '#2b2d50'; rr(x - 11, y - 50, 22, 12, 5); ctx.fill();
  for (let i = 0; i < 2; i++) {
    const lx = x + (i ? 5 : -5), on = b.on[i], k = on ? (reduceMotion ? 1 : 0.7 + 0.3 * Math.sin(t * 5 + i)) : 0;
    if (on) { ctx.fillStyle = PCOL[i]; ctx.globalAlpha = 0.3 * k; circle(lx, y - 44, 9); ctx.fill(); ctx.globalAlpha = 1; }
    ctx.fillStyle = on ? PCOL[i] : '#5a5e86'; circle(lx, y - 44, 3.5); ctx.fill();
  }
}
// the exit: an airlock on the floor, or the shuttle hatch on the ceiling (drawn upside down)
function gravflipDrawExit(st, t) {
  const d = st.exit;
  if (!d) return;
  const open = st.keyGot, won = st.phase === 'won';
  ctx.save();
  ctx.translate(d.x + d.w / 2, d.y + d.h / 2); if (st.hatch) ctx.scale(1, -1);
  const w = d.w, h = d.h;
  ctx.fillStyle = '#2b2d50'; rr(-w / 2 - 5, -h / 2 - 8, w + 10, h + 8, 14); ctx.fill();
  ctx.fillStyle = C.gold; rr(-w / 2 - 2, -h / 2 - 5, w + 4, h + 5, 12); ctx.fill();
  if (open) { const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2); g.addColorStop(0, won ? '#ffffff' : '#fff2c4'); g.addColorStop(1, C.glow); ctx.fillStyle = g; }
  else ctx.fillStyle = '#1c1a36';
  rr(-w / 2 + 3, -h / 2 - 1, w - 6, h + 1, 9); ctx.fill();
  if (!open) {
    // hazard stripes and a card slot
    ctx.save(); ctx.beginPath(); rr(-w / 2 + 3, -h / 2 - 1, w - 6, h + 1, 9); ctx.clip();
    for (let k = -6; k < 6; k++) { ctx.fillStyle = k % 2 ? 'rgba(255,210,63,0.5)' : 'rgba(0,0,0,0)'; ctx.beginPath(); ctx.moveTo(k * 10, h / 2); ctx.lineTo(k * 10 + 10, h / 2); ctx.lineTo(k * 10 + 30, -h / 2); ctx.lineTo(k * 10 + 20, -h / 2); ctx.fill(); }
    ctx.restore();
    ctx.fillStyle = '#2b2d50'; rr(-12, -10, 24, 18, 4); ctx.fill();
    ctx.fillStyle = C.gold; ctx.fillRect(-7, -3, 14, 3);
  } else if (!reduceMotion) {
    ctx.globalAlpha = 0.35 + 0.15 * Math.sin(t * 4); ctx.fillStyle = '#fff'; rr(-w / 2 + 8, -h / 2 + 4, w - 16, 6, 3); ctx.fill(); ctx.globalAlpha = 1;
  }
  ctx.restore();
  // who is in
  for (let i = 0; i < 2; i++) {
    const cx = d.x + d.w / 2 + (i === 0 ? -9 : 9), cy = st.hatch ? d.y + d.h + 14 : d.y - 16;
    circle(cx, cy, 6);
    if (st.doorIn[i]) { ctx.fillStyle = PCOL[i]; ctx.fill(); }
    else { ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fill(); ctx.strokeStyle = PCOL[i]; ctx.lineWidth = 2; ctx.stroke(); }
  }
  if (st.hatch) text('SHUTTLE', d.x + d.w / 2, d.y + d.h + 32, gravflipBig() ? 15 : 11, C.gold, 'center');
}
// one player, drawn by the engine's drawPlayer; upside down when their gravity is flipped
function gravflipDrawPlayer(st, p, t) {
  if (!p.alive) return;
  const up = st.grav[p.id] === 1, P = st.pl[p.id], cx = p.x + p.w / 2;
  if (up) {
    // a soft swirl in the partner's colour: they flipped you
    ctx.save(); ctx.globalAlpha = 0.28 + 0.12 * (reduceMotion ? 0 : Math.sin(t * 5));
    ctx.strokeStyle = PCOL[1 - p.id]; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(cx, p.y + p.h / 2, p.w * 0.85, p.h * 0.75, 0, t * 2, t * 2 + 4.2); ctx.stroke();
    ctx.restore();
    ctx.save(); ctx.translate(0, 2 * p.y + p.h); ctx.scale(1, -1);
    drawPlayer(Object.assign({}, p, { alive: true, vy: -p.vy, stompSafe: 0 }));
    ctx.restore();
  } else drawPlayer(Object.assign({}, p, { alive: true, stompSafe: 0 }));
  if (P.flipFx > 0) { ctx.save(); ctx.globalAlpha = P.flipFx; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; circle(cx, p.y + p.h / 2, 16 + (1 - P.flipFx) * 22); ctx.stroke(); ctx.restore(); }
  // hold ▼ ring (going back)
  if (P.downT > GRAVFLIP.backShow) {
    const f = clamp(P.downT / GRAVFLIP.backHold, 0, 1), rs = gravflipBig() ? 1.5 : 1, ry = up ? p.y + p.h + 14 * rs : p.y - 14 * rs;
    ctx.lineWidth = 3 * rs; ctx.strokeStyle = 'rgba(255,255,255,0.4)'; circle(cx, ry, 9 * rs); ctx.stroke();
    ctx.strokeStyle = '#9fe8ff'; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(cx, ry, 9 * rs, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * f); ctx.stroke(); ctx.lineCap = 'butt';
  }
}
// Blip, the friendly helper robot: a round body, a screen face, a little antenna and a jet
function gravflipDrawBlip(b, t) {
  if (b.y < -30) return;
  const s = gravflipBig() ? 1.3 : 1, x = b.x, y = b.y;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  if (!reduceMotion) { ctx.fillStyle = 'rgba(255,190,90,0.8)'; ctx.beginPath(); ctx.moveTo(-5, 14); ctx.lineTo(5, 14); ctx.lineTo(0, 22 + Math.sin(t * 30) * 3); ctx.closePath(); ctx.fill(); }
  ctx.fillStyle = '#e9ecff'; ctx.strokeStyle = '#6a6f9c'; ctx.lineWidth = 2; circle(0, 0, 15); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#23285a'; rr(-10, -7, 20, 12, 5); ctx.fill();
  const blink = (t % 3) < 0.12;
  ctx.fillStyle = '#7fe3ff';
  if (blink) { ctx.fillRect(-6, -2, 4, 1.5); ctx.fillRect(2, -2, 4, 1.5); }
  else { circle(-4 + b.face, -1.5, 2.2); ctx.fill(); circle(4 + b.face, -1.5, 2.2); ctx.fill(); }
  ctx.strokeStyle = '#7fe3ff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(b.face, 1.5, 3, 0.2, Math.PI - 0.2); ctx.stroke();
  ctx.strokeStyle = '#6a6f9c'; ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(0, -22); ctx.stroke();
  ctx.fillStyle = (t % 1) < 0.5 ? '#ff6b8a' : '#ffd84a'; circle(0, -24, 3); ctx.fill();
  ctx.restore();
  // an arrow toward the spot
  if (b.on && b.dir) {
    const ay = y + b.dir * 30 * s + (reduceMotion ? 0 : Math.sin(t * 6) * 3);
    ctx.fillStyle = C.gold; ctx.strokeStyle = C.goldDark; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x, ay + b.dir * 10); ctx.lineTo(x - 8, ay); ctx.lineTo(x + 8, ay); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  const say = b.sayT > 0 ? b.say : b.on ? b.hint : '';
  if (say) {
    const fs = gravflipBig() ? 17 : 13;
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w = ctx.measureText(say).width + 18, h = fs + 10, bx = clamp(x - w / 2, 6, W - w - 6);
    const by = b.dir < 0 ? y - 26 * s - h - 6 : y - 26 * s - h - 6;
    ctx.fillStyle = '#fffaf0'; ctx.strokeStyle = C.gold; ctx.lineWidth = 2; rr(bx, Math.max(76, by), w, h, 9); ctx.fill(); ctx.stroke();
    text(say, bx + w / 2, Math.max(76, by) + h / 2 + 0.5, fs, '#3a3070', 'center', 'body');
  }
}
// a dark chip with a coloured title and an optional key line (step hints)
function gravflipChip(t1, t2, x, y, col, avoid, below) {
  const z = gravflipBig() ? 1.45 : 1, f1 = Math.round(13 * z), f2 = Math.round(12 * z);
  ctx.font = '700 ' + f1 + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
  let w = ctx.measureText(t1).width;
  if (t2) { ctx.font = '700 ' + f2 + 'px "Atkinson Hyperlegible", system-ui, sans-serif'; w = Math.max(w, ctx.measureText(t2).width); }
  w += 22 * z; const h = (t2 ? 38 : 22) * z;
  const x0 = clamp(x - w / 2, 8, W - 8 - w);
  let y0 = clamp(below ? y : y - h, 78, H - 8 - h);
  for (const b of avoid || []) if (x0 < b.x1 + 4 && x0 + w > b.x0 - 4 && y0 < b.y1 + 4 && y0 + h > b.y0 - 4) y0 = below ? (b.y1 + 6 + h <= H - 8 ? b.y1 + 6 : b.y0 - h - 6) : (b.y0 - h - 6 >= 78 ? b.y0 - h - 6 : b.y1 + 6);
  ctx.fillStyle = 'rgba(28,26,54,0.86)'; rr(x0, y0, w, h, 10 * z); ctx.fill();
  ctx.strokeStyle = col; ctx.lineWidth = 2; rr(x0, y0, w, h, 10 * z); ctx.stroke();
  text(t1, x0 + w / 2, y0 + 11 * z, f1, col, 'center', 'body');
  if (t2) text(t2, x0 + w / 2, y0 + 28 * z, f2, C.paper, 'center', 'body');
  return { x0, y0, x1: x0 + w, y1: y0 + h };
}
function gravflipDraw() {
  const st = G.mst;
  if (!st.switches) return;
  const t = G.clock;
  gravflipDrawBack(st);
  // live bits: blinking console lights on the deck, a glow at each window
  if (st.style === 'deck') for (const x0 of [90, 300]) for (let k = 0; k < 6; k++) { ctx.fillStyle = ['#ff6b8a', '#7fe3ff', '#ffd84a'][(k + Math.floor(t * 2 + x0)) % 3]; ctx.globalAlpha = 0.55 + 0.45 * ((Math.floor(t * 3) + k) % 2); circle(x0 + 6 + k * 10, 451, 2.6); ctx.fill(); }
  ctx.globalAlpha = 1;
  for (const b of st.beacons) gravflipDrawBeacon(b, t);
  gravflipDrawExit(st, t);
  gravflipDrawField(st, t);
  for (const b of st.buttons) gravflipDrawButton(b);
  for (const sw of st.switches) gravflipDrawSwitch(st, sw, t);
  gravflipDrawGoo(st, t);
  gravflipDrawKey(st, t);
  gravflipDrawStars(st, t);
  // the engine draws the players between draw() and drawTop(): they are hidden then, and drawn here instead
  st.hid = G.players.map(p => p.alive);
  for (const p of G.players) gravflipDrawPlayer(st, p, t);
  for (const p of G.players) p.alive = false;
}
function gravflipDrawTop() {
  const st = G.mst;
  if (st.hid) { G.players.forEach((p, i) => { p.alive = st.hid[i]; }); st.hid = null; }
  if (!st.switches) return;
  const t = G.clock, big = gravflipBig(), z = big ? 1.4 : 1, boxes = [];
  // (hint chips keep clear of the exit's who-is-in lights)
  const d = st.exit;
  if (d) boxes.push(st.hatch ? { x0: d.x - 8, y0: d.y + d.h, x1: d.x + d.w + 8, y1: d.y + d.h + 40 } : { x0: d.x - 8, y0: d.y - 26, x1: d.x + d.w + 8, y1: d.y - 6 });
  // the switch prompt under a person standing at their own switch
  for (const p of G.players) {
    const sw = gravflipSwitchAt(st, p);
    if (!sw || sw.owner !== p.id || gravflipCpu(p.id) || st.phase !== 'play' || G.introT > GRAVFLIP.introHold) continue;
    const s = gravflipKey(p.id) + ': flip ' + NAMES[1 - p.id], fs = Math.round(13 * z);
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w = ctx.measureText(s).width + 16, h = fs + 10, x0 = clamp(sw.x - w / 2, 6, W - 6 - w), y0 = sw.ceil ? sw.surf + 44 : sw.surf - 52 - h;
    ctx.fillStyle = 'rgba(28,26,54,0.82)'; rr(x0, y0, w, h, 8); ctx.fill();
    text(s, x0 + w / 2, y0 + h / 2 + 0.5, fs, PCOL[p.id], 'center', 'body');
    boxes.push({ x0, y0, x1: x0 + w, y1: y0 + h });
  }
  // the step hints, over each person who has a job in it
  if (st.phase === 'play' && G.introT <= GRAVFLIP.introHold) {
    const pl = gravflipPlan(st), say = pl.step.say || {};
    const show = st.k === 0 ? st.stepT < 40 : (st.stepT < GRAVFLIP.chipT || st.stepT > GRAVFLIP.chipAgain);
    if (show) {
      ctx.save(); if (st.stepT > GRAVFLIP.chipAgain) ctx.globalAlpha = 0.8 + 0.2 * Math.sin(t * 5);
      const pa = G.players[pl.A], pb = G.players[pl.B];
      // the same words for both people: one chip between them
      if (say.A && say.A === say.B && pa.alive && pb.alive && !gravflipCpu(pa.id) && !gravflipCpu(pb.id)) {
        const up = st.grav[pa.id] === 1 && st.grav[pb.id] === 1, x = (pa.x + pb.x + PW) / 2;
        boxes.push(gravflipChip(gravflipFill(st, say.A, pl), '', x, up ? Math.max(pa.y, pb.y) + PH + 18 : Math.min(pa.y, pb.y) - 20, C.gold, boxes, up));
      } else for (const id of [pl.A, pl.B]) {
        const p = G.players[id], s = say[pl.role(id)];
        if (!p.alive || !s || gravflipCpu(id)) continue;
        const up = st.grav[id] === 1, stuck = st.stepT > 30 && gravflipJob(st, pl, id);
        boxes.push(gravflipChip(NAMES[id] + ': ' + gravflipFill(st, s, pl), stuck ? 'Stuck? ' + gravflipBackKey(id) + ' to go back' : '', p.x + p.w / 2, up ? p.y + p.h + 18 : p.y - 20, PCOL[id], boxes, up));
      }
      ctx.restore();
    }
  }
  gravflipDrawBlip(st.blip, t);
  if (st.blip.on) {
    const pl = gravflipPlan(st), f = gravflipFocus(st, pl);
    st.blip.hint = f ? (gravflipJob(st, pl, f.id) === 'flipper' ? (gravflipCpu(f.id) ? NAMES[f.id] + ' flips from here!' : NAMES[f.id] + ': flip from here!') : (gravflipCpu(f.id) ? NAMES[f.id] + ' goes here!' : NAMES[f.id] + ': over here!')) : '';
  }
  // pops (Wheee!, Whoopsie!, That's Bo's switch!)
  for (const q of st.pops) {
    const size = q.size * (big ? 1.3 : 1);
    ctx.font = size + 'px "Lilita One", "Arial Rounded MT Bold", sans-serif';
    const w = ctx.measureText(q.s).width + size * 0.3, x = clamp(q.x, w / 2 + 6, W - w / 2 - 6), y = clamp(q.y + q.dir * q.t * 26, 86, H - 20);
    ctx.save(); ctx.globalAlpha = clamp(Math.min(q.t / 0.1, (1.3 - q.t) / 0.4), 0, 1);
    bigText(q.s, x, y, Math.round(size), q.col);
    ctx.restore();
  }
  if (st.phase === 'won') {
    const k = Math.min(1, st.winT / 0.3), last = G.level.def.roomIndex >= G.level.def.roomCount - 1;
    bigText(last ? 'Station cleared!' : 'Room clear!', W / 2, 230, 44, C.gold, 0.6 + 0.4 * k);
  }
}
function gravflipHud() {
  const st = G.mst;
  if (!st.stats) return;
  const big = gravflipBig(), fs = big ? 20 : 14, h = big ? 40 : 28;
  const wh = st.stats.whoops[0] + st.stats.whoops[1];
  const parts = [[fmtTime(G.time), C.paper], ['★ ' + st.stats.stars, '#ffd84a'], ['Whoopsies ' + wh, wh ? '#d6ccff' : C.paper]];
  ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
  const ws = parts.map(q => ctx.measureText(q[0]).width), gap = fs * 1.0, kw = st.key ? fs * 1.6 : 0;
  const w = ws.reduce((a, b) => a + b, 0) + gap * 2 + 30 + kw, x0 = pill(W - 14, 12, w, h, 'right'), cy = 12 + h / 2 + 0.5;
  let x = x0 + 15;
  parts.forEach((q, i) => { text(q[0], x, cy, fs, q[1], 'left', 'body'); x += ws[i] + gap; });
  if (st.key) {
    // the room's keycard: grey until someone grabs it
    const s = fs / 14;
    ctx.save(); ctx.translate(x + 2 + 10 * s, cy); ctx.scale(s, s);
    ctx.globalAlpha = st.keyGot ? 1 : 0.4; ctx.fillStyle = st.keyGot ? C.gold : '#b9b6cc'; rr(-10, -7, 20, 14, 3); ctx.fill();
    ctx.fillStyle = '#2b2d50'; ctx.fillRect(-10, -3, 20, 2.5);
    ctx.restore();
  }
  const n = st.news;
  if (n && G.mode === 'play') {
    const a = clamp(Math.min(n.t / 0.2, (n.life - n.t) / 0.3), 0, 1), nfs = big ? 19 : 14, nh = big ? 34 : 26, ny = big ? 60 : 50;
    ctx.font = '700 ' + nfs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const nw = ctx.measureText(n.s).width + 32;
    ctx.save(); ctx.globalAlpha = a;
    const px = pill(W / 2, ny, nw, nh, 'center');
    if (n.gold) { ctx.strokeStyle = C.gold; ctx.lineWidth = 2; rr(px, ny, nw, nh, nh / 2); ctx.stroke(); }
    text(n.s, W / 2, ny + nh / 2 + 0.5, nfs, n.gold ? C.gold : C.paper, 'center', 'body');
    ctx.restore();
  }
  if (st.float) {
    const fs2 = big ? 15 : 11, s = 'GOLD FLOAT';
    ctx.font = '700 ' + fs2 + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w2 = ctx.measureText(s).width + 20;
    pill(W - 14, 12 + h + 6, w2, fs2 + 10, 'right');
    text(s, W - 24, 12 + h + 6 + (fs2 + 10) / 2 + 0.5, fs2, C.gold, 'right', 'body');
  }
}

MODES.gravflip = {
  setup(st, L) {
    const total = (LEVELS[G.levelIndex].rooms || []).reduce((n, r) => n + r.map.join('').split('S').length - 1, 0);
    st.stats = { whoops: [0, 0], flips: [0, 0], stars: 0, starsTotal: total, ceilT: [0, 0], backs: 0, roomT: [] };
    gravflipRoom(st, L);
  },
  room(k, L) { gravflipRoom(G.mst, L); },
  step(dt) { const st = G.mst; if (st.switches) gravflipStep(st, dt); },
  draw() { gravflipDraw(); },
  drawTop() { gravflipDrawTop(); },
  hud() { gravflipHud(); },
  stats() {
    const s = G.mst.stats, wh = s.whoops[0] + s.whoops[1], time = G.time;
    // (two computers: about 2:30 with no whoopsies; people on a first try take longer and slip now and then)
    const medal = time <= 240 && wh <= 4 ? 'Gold' : time <= 420 && wh <= 12 ? 'Silver' : 'Bronze';
    const words = wh === 0 ? 'Not one whoopsie! Perfect flipping!' : wh <= 4 ? 'Smooth flipping, space cadets!' : 'Lots of whoopsies, and you made it together!';
    return [
      { label: 'Whoopsies', values: s.whoops.slice() },
      { label: 'Stars', value: s.stars + ' of ' + s.starsTotal },
      medal + ' medal · ' + words,
      'Flips: Pip ' + s.flips[0] + ', Bo ' + s.flips[1] + ' · On the ceiling: Pip ' + Math.round(s.ceilT[0]) + ' s, Bo ' + Math.round(s.ceilT[1]) + ' s',
    ];
  },
};

/* ---------- sounds ---------- */
Sfx.extra.gravflipUp = function (p) { this.tone(260 * p, 0.22, 'sine', 0.06, 760 * p); this.tone(520 * p, 0.12, 'triangle', 0.03, 1040 * p, 0.06); };
Sfx.extra.gravflipDown = function (p) { this.tone(760 * p, 0.22, 'sine', 0.06, 260 * p); this.tone(1040 * p, 0.12, 'triangle', 0.03, 520 * p, 0.06); };
Sfx.extra.gravflipNope = function (p) { this.tone(300 * p, 0.08, 'square', 0.03); this.tone(240 * p, 0.1, 'square', 0.03, null, 0.09); };
Sfx.extra.gravflipKey = function () { [660, 880, 1320, 1760].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.05, null, i * 0.06)); };
Sfx.extra.gravflipStar = function () { this.tone(1320, 0.08, 'triangle', 0.045, 1760); this.tone(1980, 0.1, 'sine', 0.03, null, 0.06); };
Sfx.extra.gravflipBeacon = function (p) { [523 * p, 784 * p].forEach((f, i) => this.tone(f, 0.1, 'sine', 0.045, null, i * 0.07)); };
Sfx.extra.gravflipWhoops = function (p) { this.tone(600 * p, 0.35, 'sine', 0.05, 200 * p); this.tone(900 * p, 0.2, 'triangle', 0.02, 300 * p, 0.05); };
Sfx.extra.gravflipZap = function (p) { this.tone(1400 * p, 0.05, 'sawtooth', 0.02, 700 * p); this.tone(500 * p, 0.25, 'sine', 0.05, 180 * p, 0.04); };
Sfx.extra.gravflipBack = function (p) { this.tone(400 * p, 0.14, 'sine', 0.05, 900 * p); this.tone(1200 * p, 0.08, 'triangle', 0.02, null, 0.1); };
Sfx.extra.gravflipFieldOff = function () { this.tone(500, 0.14, 'sine', 0.035, 200); };
Sfx.extra.gravflipFieldOn = function () { this.tone(200, 0.16, 'sine', 0.035, 520); this.tone(1200, 0.04, 'square', 0.012, null, 0.1); };
Sfx.extra.gravflipGold = function () { [784, 988, 1319].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.05, null, i * 0.06)); };
Sfx.extra.gravflipRoom = function () { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.06, null, i * 0.09)); };
Sfx.extra.gravflipBlip = function () { this.tone(1500, 0.05, 'square', 0.015); this.tone(2000, 0.06, 'square', 0.012, null, 0.07); };
MODES.gravflip.test = { GRAVFLIP, gravflipPlan, gravflipJob, gravflipCondAt, gravflipCondOk, gravflipSwitchAt, gravflipStandsOn, gravflipFlip, gravflipPhys };
