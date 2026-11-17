/* Pip & Bo - Level 27-1 Mech Suit Duo (team, World 27 Robot Factory). */
'use strict';

/* ===== 27-1 Mech Suit Duo (mode 'mechduo', team) — Gavyn's pick =====
   "Both drive one big robot. One works the legs to walk and jump, the other works the arms to punch walls, grab ledges
   and block falling crates." Side view, scrolls right through four factory zones (def.roomWord 'Zone').
   The mode owns the tick, the camera, the picture and the HUD (ownStep, ownHUD, noFalls). Pip and Bo sit inside the mech:
   between steps p.x / p.y are their seats on screen (the arms pilot in the head dome, the legs pilot in the chest
   window), so the engine draws them, their name tags and the computer's bubbles there.
   - THE LEGS PILOT: ◀ ▶ walk the mech (slow and heavy), ▲ (or the action, 'jump') jumps, hold ▼ to duck under low beams
     and steam pipes. A ducking mech can't jump and walks slower; standing up under a beam waits until it's clear.
   - THE ARMS PILOT: ▲ / ▼ raise and lower the big arm between three heights (low, middle, high; a gauge by their panel
     shows it). The action ('punch') punches at that height. A cracked wall has a glowing weak spot at one height: a
     punch there knocks a chunk out (3 punches smash it), a punch at the wrong height is a "Clang!" with a "Higher!" /
     "Lower!" hint. With the arm high, the action next to a tall ledge grabs it and hauls the mech up (ledges are too
     tall to jump). An arm held high is also a shield: falling crates bonk off it ("Bonk!"); a crate that lands on the
     mech's head is a "Clonk!" (a dent: the mech wobbles for a moment and steps back).
   - Gaps are jumped (all are narrower than a jump). Missing one is a soft "Boing!": a spring pad pops the mech back to
     the floor before the gap. Steps up to 100 px are jumped; taller ones are ledges.
   - Bolts float along the way (some high, for a jump): the mech collects them by touching them.
   - The roles swap every zone: Pip works the legs in zones 1 and 3. Zones: Bolt Alley, Crate Drop, Steam Pipes,
     Big Bay Door (a triple wall: low, middle, high spots in a row). A zone ends when the mech walks through its door.
   - Gold help (announced, only while both play): 18 s at one wall makes a gold fist (any height works, every punch
     smashes); 2 Boings at one gap lay a gold plank over it; 2 Clonks in one crate zone give a gold umbrella (crates
     bonk off whatever the arm does) for that zone; 15 s at one ledge raises a gold lift under the mech.
   - Idle: 12 s with no person pressing anything is "Taking a break" and the clock stops.
   Medal goals (MECH.medal, MODES.mechduo.medals, js/medals.js; the mech clock, st.stats.time): Gold <= 3:30, <= 3
   Boings + Clonks and >= 50% of the bolts; Silver <= 5:30 with <= 10. Results tiles: Bolts, Walls smashed, Boings,
   Clonks.
   Room def: { title, legs: 0|1, look, tip, act, course: [items] }. Items, left to right (x is a cursor; y is the floor
   top, 440 at the start; up is smaller y):
     ['f', len]                  floor
     ['g', w]                    a gap (the floor goes on at the same height after it)
     ['up', dy, len]             a floor dy px higher (dy > 100 is a ledge to grab)   ['down', dy, len]  lower
     ['wall', spot, hp]          a cracked wall at the cursor (spot 0 low, 1 middle, 2 high)
     ['beam', len]               a low beam over the next len px of floor
     ['crates', len, every]      falling crates over the next len px, one every `every` s while the mech is under them
     ['bolts', n, dy]            n bolts in a row from the cursor, dy px above the floor
     ['sign', text]              a sign on the wall ({L} legs pilot, {A} arms pilot)
     ['end']                     the zone's door
   MODES.mechduo exposes plan(st) (the next thing ahead and what each pilot should do), MECH and helpers for the brain.
   Every top-level name starts with mech / MECH. */
const MECH = {
  w: 96, h: 150, hDuck: 104, walk: 150, duckWalk: 90, acc: 700, fric: 900, g: 1500, jumpV: 640, maxFall: 1000,
  jumpMax: 100, floor0: 440, punchT: 0.26, punchCD: 0.34, reach: 70, climbT: 0.9, stunT: 0.7, fallY: 320,
  crateW: 44, crateWarn: 1.1, crateDrop: 420, boltR: 11,
  goldWall: 18, goldLedge: 15, goldBoings: 2, goldClonks: 2, idleBreak: 12,
  medal: { gold: [210, 3, 0.5], silver: [330, 10] }, clearT: 1.6,
};

(() => {
  const M = MECH;
  const key = rf27Key, isCpu = rf27IsCpu;
  const HN = ['low', 'middle', 'high'];

  /* ---------- building a zone from its course ---------- */
  function compile(st, def) {
    const floors = [], gaps = [], walls = [], beams = [], zones = [], bolts = [], signs = [];
    const nm = s => String(s).replace(/\{L\}/g, NAMES[st.legs]).replace(/\{A\}/g, NAMES[st.arms]);
    let x = 0, y = M.floor0, pend = null;
    const addFloor = (len, top) => { const f = { x0: x, x1: x + len, top, i: floors.length }; floors.push(f); x += len; return f; };
    for (const it of def.course || []) {
      const k = it[0];
      if (k === 'f') addFloor(it[1], y);
      else if (k === 'g') { gaps.push({ x0: x, x1: x + it[1], top: y, boings: 0, gold: false, i: gaps.length }); x += it[1]; }
      else if (k === 'up') { y -= it[1]; const f = addFloor(it[2], y); f.rise = it[1]; f.ledge = it[1] > M.jumpMax; f.waitT = 0; f.gold = false; }
      else if (k === 'down') { y += it[1]; addFloor(it[2], y); }
      else if (k === 'wall') walls.push({ x, top: y, spot: it[1], hp: it[2] || 3, max: it[2] || 3, broken: false, waitT: 0, gold: false, shake: 0, i: walls.length });
      else if (k === 'beam') beams.push({ x0: x, x1: x + it[1], top: y });
      else if (k === 'crates') zones.push({ x0: x, x1: x + it[1], every: it[2] || 1.6, t: 0.6, clonks: 0, gold: false });
      else if (k === 'bolts') for (let n = 0; n < it[1]; n++) bolts.push({ x: x + 40 + n * 46, y: y - (it[2] || 60), got: false });
      else if (k === 'sign') signs.push({ x: x + 60, y, s: nm(it[1]) });
      else if (k === 'end') { addFloor(520, y); st.door = { x: x - 300, top: y }; }
    }
    if (!st.door) { addFloor(520, y); st.door = { x: x - 300, top: y }; }
    Object.assign(st, { floors, gaps, walls, beams, zones, bolts, signs, len: x });
    st.crates = [];
    st.stats.boltsTotal += bolts.length;
  }
  // the solid rects the mech bumps into: floors, the faces of raised floors, standing walls and beams
  function solids(st) {
    const out = [];
    for (const f of st.floors) out.push({ x: f.x0, y: f.top, w: f.x1 - f.x0, h: 900, f });
    for (const w of st.walls) if (!w.broken) out.push({ x: w.x, y: w.top - 230, w: 36, h: 230, wall: w });
    for (const b of st.beams) out.push({ x: b.x0, y: b.top - 160, w: b.x1 - b.x0, h: 40, beam: b });
    for (const g of st.gaps) if (g.gold) out.push({ x: g.x0, y: g.top, w: g.x1 - g.x0, h: 900, plank: g }); // (the gold plank is a real bridge)
    return out;
  }
  const floorAt = (st, x) => st.floors.find(f => x >= f.x0 && x < f.x1) || st.gaps.find(g => g.gold && x >= g.x0 && x < g.x1) || null;
  const front = st => st.m.x + M.w;

  /* ---------- the plan: the next thing ahead and each pilot's job ---------- */
  function plan(st) {
    const m = st.m, fx = front(st), feet = m.y + m.h, out = { kind: 'walk', dist: 1e9 };
    const cand = [];
    for (const w of st.walls) if (!w.broken && w.x + 36 > m.x) cand.push({ kind: 'wall', x: w.x, o: w });
    for (const f of st.floors) if (f.rise && f.x0 >= fx - 8) cand.push({ kind: f.ledge && !f.gold ? 'ledge' : 'step', x: f.x0, o: f });
    for (const g of st.gaps) if (g.x1 > m.x && !g.gold) cand.push({ kind: 'gap', x: g.x0, o: g });
    for (const b of st.beams) if (b.x1 > m.x) cand.push({ kind: 'beam', x: b.x0, o: b });
    cand.sort((a, b) => a.x - b.x);
    const c = cand[0];
    if (c) { Object.assign(out, c); out.dist = c.x - fx; }
    // falling crates: is a crate zone over the mech (or just ahead)?
    out.crates = st.zones.find(z => fx > z.x0 - 120 && m.x < z.x1) || null;
    out.danger = st.crates.some(q => !q.done && Math.abs(q.x - (m.x + M.w / 2)) < 90);
    out.feet = feet;
    // the arm height the arms pilot wants
    let want = 1;
    if (c && c.kind === 'wall' && out.dist < 360) want = c.o.gold ? st.arm : c.o.spot;
    else if (c && c.kind === 'ledge' && out.dist < 260) want = 2;
    if ((out.crates && !out.crates.gold && !st.umbrella) && !(c && c.kind === 'wall' && out.dist < 80)) want = 2;
    out.want = want;
    return out;
  }
  // the hint lines on each pilot's panel
  function jobs(st) {
    const pl = plan(st), L = st.legs, A = st.arms, nA = NAMES[A], nL = NAMES[L];
    const lu = key(L, 'up'), ld = key(L, 'down'), au = key(A, 'up'), ad = key(A, 'down'), aa = key(A, 'act', 'punch');
    let legs = ['Walk ' + key(L, 'right') + ' to the right', ''], arms = ['Arm ' + au + ' up / ' + ad + ' down', aa + ' punches'];
    if (st.climb) { legs = ['Hold on! Climbing up', '']; arms = ['Up we go!', '']; return { legs, arms, pl }; }
    if (pl.kind === 'wall' && pl.dist < 140) {
      legs = [pl.dist < 12 ? 'Wait: ' + nA + ' punches the wall' : 'Walk up to the wall', ''];
      const w = pl.o, ok = w.gold || st.arm === w.spot;
      arms = ok ? ['Punch the glowing spot! ' + aa, 'Gold fist: any height smashes'.slice(0, w.gold ? 99 : 0) || (w.hp + ' more')]
        : ['Arm to the ' + HN[w.spot] + ' spot: ' + (st.arm < w.spot ? au : ad), 'Then punch ' + aa];
    } else if (pl.kind === 'gap' && pl.dist < 160) legs = ['Jump the gap! ' + lu, 'Or the jump button'];
    else if (pl.kind === 'step' && pl.dist < 150) legs = ['Jump up the step! ' + lu, ''];
    else if (pl.kind === 'ledge' && pl.dist < 200) {
      legs = [pl.dist < 10 ? 'Wait: ' + nA + ' grabs the ledge' : 'Walk up to the ledge', 'Too tall to jump'];
      arms = st.arm < 2 ? ['Arm up high: ' + au, 'Then grab the ledge ' + aa] : [pl.dist < M.reach ? 'Grab the ledge! ' + aa : 'Get close, then grab ' + aa, ''];
    } else if (pl.kind === 'beam' && pl.dist < 120) legs = ['Duck! Hold ' + ld, 'Under the low beam'];
    if (pl.crates && !st.umbrella && !pl.crates.gold) {
      arms = st.arm < 2 ? ['Crates! Arm up high ' + au, 'It blocks falling crates'] : ['Keep the arm up!', 'Crates bonk off it'];
      if (!(pl.kind === 'gap' || pl.kind === 'beam' || pl.kind === 'step')) legs = ['Keep walking ' + key(L, 'right'), nA + ' blocks the crates'];
    }
    return { legs, arms, pl };
  }

  /* ---------- the mech ---------- */
  function newMech(st) {
    const f = st.floors[0];
    st.m = { x: f.x0 + 120, y: f.top - M.h, w: M.w, h: M.h, vx: 0, vy: 0, grounded: true, duck: 0, ducking: false, stun: 0, walkT: 0, safe: f };
    st.arm = 1; st.armA = 0; st.punch = 0; st.punchCD = 0; st.climb = null; st.boing = null; st.umbrella = false;
  }
  function mechStep(st, dt, ctrl) {
    const m = st.m, sol = solids(st);
    m.stun = Math.max(0, m.stun - dt);
    if (st.climb) {
      const c = st.climb; c.t += dt;
      const u = Math.min(1, c.t / M.climbT), e = u < 0.6 ? (u / 0.6) : 1, f = u < 0.6 ? 0 : (u - 0.6) / 0.4;
      m.y = c.y0 + (c.y1 - c.y0) * e; m.x = c.x0 + (c.x1 - c.x0) * f;
      if (u >= 1) { st.climb = null; m.vy = 0; m.vx = 0; m.grounded = true; Sfx.play('land'); st.shake = 0.15; }
      return;
    }
    if (st.boing) {
      const b = st.boing; b.t += dt;
      if (b.t > 0.6 && !b.up) { b.up = true; m.x = b.sx; m.y = b.top + 260; m.vy = -1100; Sfx.play('rf27Boing'); rf27Pop(st, b.sx + M.w / 2, b.top - 60, 'Boing!', '#ff9fd6', 24); }
      if (b.up) {
        m.vy += M.g * dt; m.y += m.vy * dt;
        if (m.vy > 0 && m.y + m.h >= b.top) { m.y = b.top - m.h; m.vy = 0; m.grounded = true; st.boing = null; }
      }
      return;
    }
    // ducking: hold ▼ (stay ducked while a beam is overhead)
    const under = st.beams.some(b => m.x + M.w > b.x0 && m.x < b.x1);
    const wantDuck = (ctrl.down && m.grounded) || (m.ducking && under);
    if (wantDuck !== m.ducking) {
      if (wantDuck) { m.ducking = true; m.y += M.h - M.hDuck; m.h = M.hDuck; }
      else { m.ducking = false; m.y -= M.h - M.hDuck; m.h = M.h; }
    }
    m.duck = approach(m.duck, m.ducking ? 1 : 0, dt * 8);
    if (m.ducking && under && !ctrl.down && st.legsCD <= 0) { st.legsCD = 3; rf27Pop(st, m.x + M.w / 2, m.y - 30, 'Still ducking!', '#ffffff', 16); }
    const mv = m.stun > 0 ? 0 : (ctrl.right ? 1 : 0) - (ctrl.left ? 1 : 0);
    const max = m.ducking ? M.duckWalk : M.walk;
    m.vx = mv ? approach(m.vx, mv * max, M.acc * dt) : approach(m.vx, 0, M.fric * dt);
    if (ctrl.jump && m.grounded && !m.ducking && m.stun <= 0) { m.vy = -M.jumpV; m.grounded = false; Sfx.play('rf27Whirr', 0.8); st.stats.jumps++; puff(0, 0, 0); }
    m.vy = Math.min(m.vy + M.g * dt, M.maxFall);
    const hx = rf27Move(m, m.vx * dt, 0, sol);
    if (hx.x) { m.vx = 0; if (hx.wall && hx.wall.beam && st.legsCD <= 0) { st.legsCD = 2.5; rf27Pop(st, m.x + M.w, m.y, 'Bonk! Duck!', '#ffffff', 16); Sfx.play('rf27Bonk'); } }
    const vy = m.vy, hy = rf27Move(m, 0, m.vy * dt, sol);
    if (hy.y) m.vy = 0;
    const g = rf27Ground(m, sol);
    const was = m.grounded; m.grounded = !!g;
    if (g && g.f) m.safe = g.f;
    if (m.grounded && !was && vy > 300) { st.shake = 0.12; Sfx.play('rf27Clank', 0.7); }
    m.x = Math.max(m.x, -60);
    if (m.grounded && Math.abs(m.vx) > 10) m.walkT += dt * Math.abs(m.vx) / 60;
    // fell into a gap: the spring pad pops the mech back
    if (m.y > st.m.safe.top + M.fallY) startBoing(st);
  }
  function startBoing(st) {
    const m = st.m, f = m.safe, cx = m.x + M.w / 2;
    const g = st.gaps.reduce((b, q) => (!b || Math.abs((q.x0 + q.x1) / 2 - cx) < Math.abs((b.x0 + b.x1) / 2 - cx) ? q : b), null);
    st.boing = { t: 0, sx: clamp(f.x1 - M.w - 30, f.x0 + 4, f.x1 - M.w), top: f.top, up: false };
    m.vx = 0; m.vy = 0; m.grounded = false;
    if (m.ducking) { m.ducking = false; m.y -= M.h - M.hDuck; m.h = M.h; }
    st.stats.boings++;
    Sfx.play('rf27Drop');
    if (g) {
      g.boings++;
      if (!g.gold && g.boings >= M.goldBoings && rf27BothPlaying(st, 8)) {
        g.gold = true; st.goldUsed.push('plank');
        rf27News(st, 'Gold plank! It bridges the gap for you', true, 4.5); Sfx.play('rf27Ding');
      }
    }
  }
  function armsStep(st, dt, A) {
    const p = G.players[A], m = st.m;
    st.punchCD -= dt; st.punch = Math.max(0, st.punch - dt);
    const raise = p.pendingJump, lower = p.input.down && !st.armDown;
    st.armDown = p.input.down;
    p.pendingJump = false;
    if (st.climb || st.boing) { p.pendingAct = false; return; }
    if (raise && st.arm < 2) { st.arm++; Sfx.play('rf27Whirr', 1.3); }
    if (lower && st.arm > 0) { st.arm--; Sfx.play('rf27Whirr', 1.1); }
    const ta = [0.75, 0, -1.25][st.arm];
    st.armA += (ta - st.armA) * Math.min(1, dt * 14);
    if (p.pendingAct && st.punchCD <= 0 && m.stun <= 0) {
      p.pendingAct = false;
      st.punch = M.punchT; st.punchCD = M.punchCD;
      st.stats.punches++;
      punch(st);
    }
  }
  function punch(st) {
    const m = st.m, fx = front(st), feet = m.y + m.h;
    const w = st.walls.find(q => !q.broken && q.x - fx > -6 && q.x - fx < M.reach);
    const hy = m.y + 60 + [50, 0, -55][st.arm];
    if (w) {
      if (w.gold || w.spot === st.arm) {
        w.hp = w.gold ? 0 : w.hp - 1; w.shake = 0.25; st.shake = 0.1;
        rf27Sparks(st, w.x, hy, 10, '#ffd36b');
        if (w.hp <= 0) {
          w.broken = true; st.stats.walls++;
          rf27Pop(st, w.x + 18, w.top - 120, 'Smash!', C.gold, 26); Sfx.play('rf27Punch', 0.7); Sfx.play('rf27Clank', 0.6);
          for (let k = 0; k < 7; k++) st.debris.push({ x: w.x + 18, y: w.top - 30 - k * 28, vx: 120 + Math.random() * 220, vy: -200 - Math.random() * 300, r: Math.random() * 6, t: 0 });
        } else { rf27Pop(st, w.x + 18, hy - 20, 'Pow!', '#ffffff', 20); Sfx.play('rf27Punch'); }
      } else {
        st.stats.clangs++; w.shake = 0.12;
        rf27Pop(st, w.x + 18, hy - 20, st.arm < w.spot ? 'Clang! Higher!' : 'Clang! Lower!', '#d9e4ff', 18);
        Sfx.play('rf27Clank', 1.4);
      }
      return;
    }
    if (st.arm === 2) {
      const f = st.floors.find(q => q.ledge && q.x0 - fx > -6 && q.x0 - fx < M.reach && q.top < feet - 60);
      if (f) {
        st.climb = { t: 0, x0: m.x, y0: m.y, x1: f.x0 + 14, y1: f.top - m.h };
        // (rise first, then step onto the ledge)
        if (m.ducking) { m.ducking = false; m.y -= M.h - M.hDuck; m.h = M.h; st.climb.y0 = m.y; st.climb.y1 = f.top - M.h; }
        st.stats.grabs++;
        rf27Pop(st, f.x0, f.top - 40, 'Grab!', C.gold, 22); Sfx.play('rf27Clank', 1.1); Sfx.play('rf27Whirr', 0.7);
        return;
      }
    }
    Sfx.play('rf27Whirr', 1.6);
  }
  function cratesStep(st, dt) {
    const m = st.m, cx = m.x + M.w / 2;
    for (const z of st.zones) {
      const inside = m.x + M.w > z.x0 && m.x < z.x1;
      if (!inside || st.boing || st.climb) continue;
      z.t -= dt;
      if (z.t <= 0) {
        z.t = z.every;
        const tx = clamp(cx + m.vx * (M.crateWarn + 0.55), z.x0, z.x1);
        st.crates.push({ x: tx, y: (floorAt(st, tx) || { top: m.y + m.h }).top - M.crateDrop, vy: 0, warn: M.crateWarn, z, done: false, bonk: false, vx: 0, r: 0, t: 0 });
        Sfx.play('rf27Beep', 1.2);
      }
    }
    for (const q of st.crates) {
      q.t += dt;
      if (q.warn > 0) { q.warn -= dt; continue; }
      if (q.done) { q.vy += M.g * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.r += dt * 8; continue; }
      q.vy = Math.min(q.vy + M.g * dt, 900); q.y += q.vy * dt;
      const hs = M.crateW / 2;
      // the mech's head (or its raised arm)
      if (!st.boing && q.x + hs > m.x && q.x - hs < m.x + M.w && q.y + hs > m.y - (st.arm === 2 ? 40 : 0) && q.y < m.y + 40) {
        q.done = true;
        if (st.arm === 2 || st.umbrella || q.z.gold) {
          q.bonk = true; q.vy = -520; q.vx = -260 + Math.random() * 120; st.stats.bonks++;
          rf27Pop(st, q.x, q.y - 30, 'Bonk!', '#bff6ff', 22); Sfx.play('rf27Bonk', 1.2);
        } else {
          q.vy = -300; q.vx = 200; st.stats.clonks++; q.z.clonks++;
          m.stun = M.stunT; m.vx = -120; st.shake = 0.25;
          rf27Pop(st, q.x, q.y - 30, 'Clonk!', '#ffb0a0', 24); Sfx.play('rf27Clank', 0.5);
          if (!q.z.gold && q.z.clonks >= M.goldClonks && rf27BothPlaying(st, 8)) {
            q.z.gold = true; st.goldUsed.push('umbrella');
            rf27News(st, 'Gold umbrella! Crates bonk off on their own here', true, 4.5); Sfx.play('rf27Ding');
          }
        }
        continue;
      }
      const f = floorAt(st, q.x);
      if (f && q.y + hs >= f.top) { q.done = true; q.vy = -200; q.vx = (Math.random() - 0.5) * 200; rf27Sparks(st, q.x, f.top, 6, '#c4cee6'); Sfx.play('rf27Drop', 0.7); }
      if (q.y > 1400) q.done = true;
    }
    st.crates = st.crates.filter(q => q.t < 6);
  }
  function boltsStep(st) {
    const m = st.m;
    for (const b of st.bolts) {
      if (b.got) continue;
      if (b.x + M.boltR > m.x && b.x - M.boltR < m.x + M.w && b.y + M.boltR > m.y - 10 && b.y - M.boltR < m.y + m.h) {
        b.got = true; st.stats.bolts++; Sfx.play('rf27Ding', 1 + (st.stats.bolts % 5) * 0.05);
        rf27Sparks(st, b.x, b.y, 5, C.gold, 140);
      }
    }
  }
  // gold help for a wall or a ledge the team has been stuck at for a long time (only while both play)
  function goldHelp(st, dt) {
    const pl = plan(st), both = rf27BothPlaying(st, 6) && st.away < 6;
    if (pl.kind === 'wall' && pl.dist < 30) {
      const w = pl.o;
      if (both) w.waitT += dt;
      if (!w.gold && w.waitT > M.goldWall) { w.gold = true; st.goldUsed.push('fist'); rf27News(st, 'Gold fist! Any punch smashes this wall', true, 4.5); Sfx.play('rf27Ding'); }
    }
    if (pl.kind === 'ledge' && pl.dist < 30) {
      const f = pl.o;
      if (both) f.waitT += dt;
      if (!f.gold && f.waitT > M.goldLedge) {
        f.gold = true; st.goldUsed.push('lift');
        rf27News(st, 'Gold lift! Up you go', true, 4); Sfx.play('rf27Ding');
        const m = st.m;
        st.climb = { t: 0, x0: m.x, y0: m.y, x1: f.x0 + 14, y1: f.top - M.h, gold: true };
        if (m.ducking) { m.ducking = false; m.h = M.h; }
      }
    }
  }

  /* ---------- the tick ---------- */
  function seats(st) {
    // each pilot sits in the mech (screen coordinates, set between ticks)
    const m = st.m, A = G.players[st.arms], L = G.players[st.legs];
    const cx = m.x + M.w / 2 - PW / 2 - 4;
    A.x = cx - st.camX; A.y = m.y + 36 - PH - st.camY;
    L.x = cx - st.camX; L.y = m.y + 92 - PH - st.camY;
    for (const p of [A, L]) { p.vx = 0; p.vy = 0; p.grounded = true; p.face = 1; p.alive = true; }
    A.stun = L.stun = m.stun > 0 ? 0.1 : 0;
  }
  function camera(st, dt, snap) {
    const m = st.m;
    let tx = m.x - 250, ty = (st.boing ? st.boing.top : m.y + m.h) - M.floor0;
    if (st.state === 'clear') tx = st.door.x - 380;
    tx = clamp(tx, -40, Math.max(-40, st.len - W));
    const k = snap ? 1 : Math.min(1, dt * 4);
    st.camX += (tx - st.camX) * k; st.camY += (ty - st.camY) * Math.min(1, snap ? 1 : dt * 2.5);
  }
  function tick(st, dt) {
    st.tick++;
    rf27Fx(st, dt);
    rf27People(st, dt);
    st.shake = Math.max(0, (st.shake || 0) - dt);
    st.legsCD -= dt;
    for (const d of st.debris) { d.t += dt; d.vy += M.g * dt; d.x += d.vx * dt; d.y += d.vy * dt; }
    st.debris = st.debris.filter(d => d.t < 2);
    for (const w of st.walls) w.shake = Math.max(0, w.shake - dt);
    const L = G.players[st.legs], A = G.players[st.arms];
    if (st.state === 'clear') {
      st.clearT += dt;
      mechStep(st, dt, { right: true });
      for (const p of G.players) { p.pendingAct = false; p.pendingJump = false; }
      if (st.clearT >= M.clearT) st.goNext = true;
      camera(st, dt); return;
    }
    if (G.introT > 0.4) { for (const p of G.players) { p.pendingAct = false; p.pendingJump = false; } camera(st, dt); return; }
    if (!st.started) { st.started = true; if (st.room.news) rf27News(st, st.room.news, false, 4.5); }
    // nobody pressing anything for a while: take a break (the clock stops)
    if (st.away > M.idleBreak) {
      st.onBreak = true; G.time -= dt;
      for (const p of G.players) { p.pendingAct = false; p.pendingJump = false; }
      return;
    }
    st.onBreak = false;
    st.stats.time += dt;
    const ctrl = { left: L.input.left, right: L.input.right, down: L.input.down, jump: L.pendingJump || L.pendingAct };
    L.pendingJump = false; L.pendingAct = false;
    armsStep(st, dt, st.arms);
    mechStep(st, dt, ctrl);
    cratesStep(st, dt);
    boltsStep(st);
    goldHelp(st, dt);
    if (front(st) > st.door.x + 60 && st.m.grounded) {
      st.state = 'clear'; st.clearT = 0; Sfx.play('rf27Cheer');
      rf27Pop(st, st.door.x + 60, st.door.top - 200, st.final ? 'Out of the factory!' : 'Zone clear!', C.gold, 28);
      st.stats.zoneT.push(Math.round(G.time));
    }
    camera(st, dt);
    void A;
  }

  /* ---------- a zone (room) ---------- */
  function room(st, L, k) {
    const def = L.def;
    st.k = k; st.room = def; st.final = k === (def.roomCount || 1) - 1;
    st.legs = def.legs || 0; st.arms = 1 - st.legs; st.look = def.look || 'bolts';
    compile(st, def);
    newMech(st);
    st.debris = []; st.pops = []; st.sparks = []; st.news = null;
    st.state = 'play'; st.clearT = 0; st.goNext = false; st.started = false; st.legsCD = 0; st.away = 0; st.press = [0, 0];
    st.camX = 0; st.camY = 0; camera(st, 0, true);
    for (const p of G.players) { p.pendingAct = false; p.pendingJump = false; }
    seats(st);
    actLabels(st);
  }
  let labelEls = null;
  function actLabels(st) {
    try {
      if (!labelEls || !labelEls.every(o => document.contains(o.el))) labelEls = Array.from(document.querySelectorAll('[data-actlabel]')).map(el => {
        const box = el.closest('[data-p]') || el.closest('[data-legp]');
        const id = box && box.dataset.p !== undefined ? +box.dataset.p : box && box.dataset.legp !== undefined ? +box.dataset.legp : -1;
        return { el, id };
      });
      let changed = false;
      for (const o of labelEls) { const want = o.id < 0 ? 'jump / punch' : o.id === st.legs ? 'jump' : 'punch'; if (o.el.textContent !== want) { o.el.textContent = want; changed = true; } }
      if (changed && typeof fitActLabels === 'function') fitActLabels();
    } catch (e) { /* the framework's labels stay */ }
  }
  function medalValues(st) {
    const s = st.stats;
    return s ? { time: s.time, oops: s.boings + s.clonks, bolts: s.boltsTotal ? s.bolts / s.boltsTotal : 0 } : {};
  }

  MODES.mechduo = {
    MECH: M, plan, jobs, solids, floorAt, front,
    medals: { bronze: 'Pilot the mech out of the factory', goals: [
      { key: 'time', gold: M.medal.gold[0], silver: M.medal.silver[0] },
      { key: 'oops', gold: M.medal.gold[1], silver: M.medal.silver[1], word: 'bump', text: n => (n === 0 ? 'No Boings or Clonks' : `${n} or fewer Boings + Clonks`) },
      { key: 'bolts', gold: M.medal.gold[2], more: true, pct: true, word: 'the bolts' },
    ] },
    medalValues() { return medalValues(G.mst); },
    setup(st, L) {
      st.stats = { bolts: 0, boltsTotal: 0, walls: 0, boings: 0, clonks: 0, bonks: 0, punches: 0, clangs: 0, grabs: 0, jumps: 0, time: 0, zoneT: [] };
      st.goldUsed = []; st.tick = 0;
      room(st, L, 0);
    },
    room(k, L) { room(G.mst, L, k); },
    step(dt) {
      const st = G.mst;
      if (!st.m) return;
      tick(st, dt);
      seats(st);
      if (st.goNext) {
        st.goNext = false;
        const L = G.level;
        if (L.def.rooms && L.def.roomIndex < L.def.roomCount - 1) nextRoom();
        else { G.level.goal = { x: st.door.x + 60 - st.camX, y: st.door.top - 120 - st.camY }; levelClear(); }
        return;
      }
      if (st.tick % 20 === 0) actLabels(st);
    },
    draw() { const st = G.mst; if (st.m) drawWorld(st); },
    drawTop() { const st = G.mst; if (st.m) drawTop(st); },
    hud() { const st = G.mst; if (st.m) drawHud(st); },
    stats() {
      const st = G.mst, s = st.stats;
      if (!s) return [];
      const oops = s.boings + s.clonks;
      const words = oops === 0 ? 'Not one Boing or Clonk! Perfect piloting!' : oops <= 3 ? 'Legs and arms in perfect step!' : 'A bumpy ride, and you got the mech out together!';
      const gold = st.goldUsed.length ? ' · Gold help: ' + [...new Set(st.goldUsed)].map(k => ({ fist: 'gold fist', plank: 'gold plank', umbrella: 'gold umbrella', lift: 'gold lift' }[k])).join(', ') : '';
      return [
        { label: 'Bolts', value: s.bolts + ' / ' + s.boltsTotal },
        { label: 'Walls smashed', value: s.walls },
        { label: 'Boings', value: s.boings },
        { label: 'Clonks', value: s.clonks },
        words + (s.bonks ? ' Crates bonked: ' + s.bonks + '.' : '') + gold,
      ];
    },
  };

  /* ===================================== drawing ===================================== */
  function drawWorld(st) {
    const t = G.clock, lk = RF27.LOOKS[st.look] || RF27.LOOKS.bolts;
    rf27Backdrop(st.camX, st.camY, st.look, t);
    ctx.save();
    if (st.shake > 0) ctx.translate((Math.random() - 0.5) * st.shake * 30, (Math.random() - 0.5) * st.shake * 30);
    ctx.translate(-Math.round(st.camX), -Math.round(st.camY));
    const vx0 = st.camX - 100, vx1 = st.camX + W + 100;
    for (const s of st.signs) if (s.x > vx0 - 200 && s.x < vx1) drawSign(s);
    // the gaps: a spring pad down in each one (or a gold plank)
    for (const g of st.gaps) {
      if (g.x1 < vx0 || g.x0 > vx1) continue;
      ctx.fillStyle = 'rgba(20,18,40,0.55)'; ctx.fillRect(g.x0, g.top, g.x1 - g.x0, 600);
      const py = g.top + 240;
      ctx.fillStyle = '#ff7ab8'; rr(g.x0 + 10, py, g.x1 - g.x0 - 20, 12, 6); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.4)'; rr(g.x0 + 16, py + 2, g.x1 - g.x0 - 32, 3, 1.5); ctx.fill();
      ctx.strokeStyle = '#b8407a'; ctx.lineWidth = 1.5; rr(g.x0 + 10, py, g.x1 - g.x0 - 20, 12, 6); ctx.stroke();
      ctx.strokeStyle = '#d9dbe8'; ctx.lineWidth = 3; ctx.beginPath();
      for (let k = 0; k <= 6; k++) ctx.lineTo(g.x0 + 20 + ((g.x1 - g.x0 - 40) * k) / 6, py + 12 + (k % 2) * 14); ctx.stroke();
      if (g.gold) { ctx.fillStyle = C.gold; ctx.strokeStyle = C.goldDark; ctx.lineWidth = 3; rr(g.x0 - 10, g.top - 4, g.x1 - g.x0 + 20, 16, 4); ctx.fill(); ctx.stroke(); }
    }
    for (const d of st.debris) { ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(d.r + d.t * 6); ctx.fillStyle = '#b07a5a'; ctx.fillRect(-10, -7, 20, 14); ctx.fillStyle = 'rgba(255,230,200,0.35)'; ctx.fillRect(-10, -7, 20, 2); ctx.fillStyle = 'rgba(60,24,12,0.35)'; ctx.fillRect(-10, 4, 20, 3); ctx.fillRect(6, -7, 4, 14); ctx.strokeStyle = '#6a3a28'; ctx.lineWidth = 1; ctx.strokeRect(-10, -7, 20, 14); ctx.restore(); }
    for (const f of st.floors) if (f.x1 > vx0 && f.x0 < vx1) {
      rf27Floor(f.x0, f.top, f.x1 - f.x0, 700, st.look);
      if (f.rise) rf27Stripes(f.x0, f.top, 10, Math.min(f.rise, 200));
      if (f.ledge && !f.gold) { ctx.fillStyle = C.gold; rr(f.x0 - 6, f.top - 6, 22, 10, 4); ctx.fill(); }
      if (f.gold) { ctx.fillStyle = 'rgba(255,197,61,0.35)'; ctx.fillRect(f.x0 - 40, f.top, 40, f.rise); }
    }
    for (const b of st.beams) if (b.x1 > vx0 && b.x0 < vx1) drawBeam(b, t, lk);
    for (const w of st.walls) if (!w.broken && w.x > vx0 - 50 && w.x < vx1) drawWall(st, w, t);
    drawDoor(st, t);
    for (const b of st.bolts) if (!b.got && b.x > vx0 && b.x < vx1) drawBolt(b.x, b.y + Math.sin(t * 3 + b.x) * 3, t);
    for (const z of st.zones) if (z.x1 > vx0 && z.x0 < vx1) drawChutes(st, z, t);
    for (const q of st.crates) drawCrate(st, q, t);
    drawMech(st, t);
    rf27DrawPops(st);
    ctx.restore();
  }
  function drawSign(s) {
    ctx.font = '700 15px ' + RF27.FONT;
    const w = ctx.measureText(s.s).width + 26, y = s.y - 250;
    ctx.fillStyle = '#2a2f4f'; ctx.fillRect(s.x + w / 2 - 3, y + 30, 6, 40);
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(s.x + w / 2 - 3, y + 30, 2, 40);
    ctx.fillStyle = 'rgba(20,18,40,0.25)'; rr(s.x + 3, y + 4, w, 32, 8); ctx.fill();
    ctx.fillStyle = 'rgba(28,26,54,0.86)'; rr(s.x, y, w, 32, 8); ctx.fill();
    ctx.strokeStyle = C.gold; ctx.lineWidth = 2; rr(s.x, y, w, 32, 8); ctx.stroke();
    text(s.s, s.x + w / 2, y + 16.5, 15, C.paper, 'center', 'body');
  }
  function drawBeam(b, t, lk) {
    const y = b.top - 160, bw = b.x1 - b.x0;
    // two I-beam hangers: flanges with a lit edge, a shaded web and rivet rows
    for (const px of [b.x0, b.x1 - 14]) {
      ctx.fillStyle = '#4a5478'; ctx.fillRect(px, y - 300, 14, 300);
      ctx.fillStyle = '#6a76a0'; ctx.fillRect(px, y - 300, 3.5, 300); ctx.fillRect(px + 10.5, y - 300, 3.5, 300);
      ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.fillRect(px, y - 300, 1.2, 300);
      ctx.fillStyle = 'rgba(20,18,40,0.3)'; ctx.fillRect(px + 12.5, y - 300, 1.5, 300); ctx.fillRect(px + 3.5, y - 300, 1.5, 300);
      ctx.fillStyle = '#2a2f4f'; ctx.beginPath(); for (let ry = y - 290; ry < y - 4; ry += 18) { ctx.moveTo(px + 9, ry); ctx.arc(px + 7, ry, 1.6, 0, 7); } ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.beginPath(); for (let ry = y - 290; ry < y - 4; ry += 18) { ctx.moveTo(px + 7, ry - 0.6); ctx.arc(px + 6.4, ry - 0.6, 0.7, 0, 7); } ctx.fill();
      ctx.fillStyle = '#3a4262'; ctx.fillRect(px - 4, y - 8, 22, 8); ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(px - 4, y - 8, 22, 1.5);
    }
    // the beam: steel flanges top and bottom, a hazard face plate between them, bolted end caps, an outline
    ctx.fillStyle = 'rgba(20,18,40,0.25)'; ctx.fillRect(b.x0 + 4, y + 40, bw - 4, 6);
    rf27Stripes(b.x0, y + 7, bw, 26);
    ctx.fillStyle = 'rgba(20,18,40,0.18)'; ctx.fillRect(b.x0, y + 26, bw, 7);
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(b.x0, y + 7, bw, 3);
    for (const [fy, lit] of [[y, true], [y + 33, false]]) {
      ctx.fillStyle = '#5a6488'; ctx.fillRect(b.x0, fy, bw, 7);
      ctx.fillStyle = lit ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.12)'; ctx.fillRect(b.x0, fy, bw, 1.6);
      ctx.fillStyle = 'rgba(20,18,40,0.35)'; ctx.fillRect(b.x0, fy + 5.5, bw, 1.5);
      ctx.fillStyle = '#2a2f4f'; ctx.beginPath(); for (let rx = b.x0 + 26; rx < b.x1 - 20; rx += 24) { ctx.moveTo(rx + 1.4, fy + 3.5); ctx.arc(rx, fy + 3.5, 1.4, 0, 7); } ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); for (let rx = b.x0 + 26; rx < b.x1 - 20; rx += 24) { ctx.moveTo(rx, fy + 3); ctx.arc(rx - 0.5, fy + 3, 0.6, 0, 7); } ctx.fill();
    }
    for (const ex of [b.x0, b.x1 - 18]) {
      ctx.fillStyle = '#6a76a0'; ctx.fillRect(ex, y, 18, 40); ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(ex, y, 18, 1.5); ctx.fillRect(ex, y, 1.5, 40);
      ctx.fillStyle = 'rgba(20,18,40,0.3)'; ctx.fillRect(ex + 16, y, 2, 40);
      for (const [a, c2] of [[5, 7], [13, 7], [5, 33], [13, 33], [9, 20]]) { ctx.fillStyle = '#2a2f4f'; circle(ex + a, y + c2, 2); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.5)'; circle(ex + a - 0.6, y + c2 - 0.6, 0.8); ctx.fill(); }
    }
    ctx.strokeStyle = '#22263e'; ctx.lineWidth = 2.5; ctx.strokeRect(b.x0, y, bw, 40);
    // a scuff of paint knocked off by mechs that didn't duck
    ctx.fillStyle = 'rgba(200,205,220,0.5)'; ctx.fillRect(b.x0 + bw * 0.42, y + 30, 14, 2.5); ctx.fillRect(b.x0 + bw * 0.46, y + 28, 6, 2);
    // a little steam puff from the pipe
    for (let k = 0; k < 3; k++) {
      const u = ((t * 0.8 + k / 3) % 1);
      ctx.fillStyle = 'rgba(255,255,255,' + (0.35 * (1 - u)) + ')'; circle(b.x0 + 30 + k * 40, y + 44 + u * 30, 8 + u * 10); ctx.fill();
    }
    void lk;
  }
  function drawWall(st, w, t) {
    const sx = w.shake > 0 ? Math.sin(G.clock * 97) * 4 : 0, x = w.x + sx, top = w.top - 230;
    // the brick wall itself is a picture: bricks of a few shades with lit tops, chipped corners and deep mortar,
    // a steel cap and foot, a shaded right side
    rf27Blit(wallPic(), x - 2, top - 8, 40, 240);
    // cracks grow as it's punched
    ctx.strokeStyle = '#3a2016'; ctx.lineWidth = 2.5;
    const dmg = w.max - w.hp;
    for (let k = 0; k < dmg * 2; k++) { const yy = top + 30 + ((k * 61) % 180); ctx.beginPath(); ctx.moveTo(x + 4, yy); ctx.lineTo(x + 18, yy + 12); ctx.lineTo(x + 30, yy + 4); ctx.stroke(); }
    // the glowing weak spot
    const sy = w.top - [50, 110, 165][w.spot], pulse = 0.6 + 0.4 * Math.sin(t * 6);
    const col = w.gold ? C.gold : '#7affff';
    ctx.fillStyle = w.gold ? 'rgba(255,197,61,' + (0.35 * pulse) + ')' : 'rgba(122,255,255,' + (0.3 * pulse) + ')'; circle(x + 18, sy, 26); ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 3; circle(x + 18, sy, 14); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 8, sy); ctx.lineTo(x + 28, sy); ctx.moveTo(x + 18, sy - 10); ctx.lineTo(x + 18, sy + 10); ctx.stroke();
    if (w.gold) for (let y = top; y < w.top; y += 46) { ctx.fillStyle = 'rgba(255,197,61,0.3)'; ctx.fillRect(x, y, 36, 23); }
    // dots for the punches left
    for (let k = 0; k < w.max; k++) { ctx.fillStyle = k < w.hp ? '#ffffff' : 'rgba(255,255,255,0.25)'; circle(x + 8 + k * 10, top - 12, 4); ctx.fill(); }
    void st;
  }
  function wallPic() {
    return rf27Pic('w27wall', 40, 240, c => {
      c.translate(2, 8);
      c.fillStyle = '#6a3a28'; c.fillRect(0, 0, 36, 230);
      const cols = ['#b07a5a', '#a86e50', '#bc8664', '#9c6648', '#b8805c'];
      for (let r = 0; r * 23 < 230; r++) {
        const o = r % 2 ? -18 : 0;
        for (let bx = o; bx < 36; bx += 36) {
          const x0 = Math.max(0, bx) + 1, x1 = Math.min(36, bx + 36) - 1, y0 = r * 23 + 1, y1 = Math.min(230, r * 23 + 23) - 1.5, hh = hash(r, bx + 40);
          if (x1 - x0 < 2) continue;
          const bc = cols[hh % cols.length];
          c.fillStyle = bc; c.fillRect(x0, y0, x1 - x0, y1 - y0);
          c.fillStyle = 'rgba(255,230,200,0.28)'; c.fillRect(x0, y0, x1 - x0, 1.6);
          c.fillStyle = 'rgba(255,230,200,0.12)'; c.fillRect(x0, y0, 1.4, y1 - y0);
          c.fillStyle = 'rgba(60,24,12,0.3)'; c.fillRect(x0, y1 - 3, x1 - x0, 3);
          for (let k = 0; k < 4; k++) { const q = hash(r * 7 + k, bx); c.fillStyle = q % 2 ? 'rgba(60,24,12,0.3)' : 'rgba(255,230,200,0.25)'; c.fillRect(x0 + 2 + q % Math.max(1, x1 - x0 - 4), y0 + 3 + (q >>> 5) % Math.max(1, y1 - y0 - 6), 1.5, 1.2); }
          if (hh % 4 === 0) { c.fillStyle = '#6a3a28'; c.beginPath(); c.moveTo(x1, y0); c.lineTo(x1 - 4, y0); c.lineTo(x1, y0 + 4); c.closePath(); c.fill(); }
        }
      }
      c.fillStyle = 'rgba(20,18,40,0.28)'; c.fillRect(29, 0, 7, 230);
      c.fillStyle = '#5a6488'; c.fillRect(-1, 0, 38, 8); c.fillStyle = 'rgba(255,255,255,0.3)'; c.fillRect(-1, 0, 38, 1.6); c.fillStyle = 'rgba(20,18,40,0.35)'; c.fillRect(-1, 6, 38, 2);
      for (const bx of [4, 18, 32]) { c.fillStyle = '#2a2f4f'; c.beginPath(); c.arc(bx, 4, 1.4, 0, 7); c.fill(); }
      c.strokeStyle = '#5a2e1e'; c.lineWidth = 1.5; c.strokeRect(0.75, 0, 34.5, 230);
    });
  }
  function drawDoor(st, t) {
    const d = st.door, x = d.x, top = d.top - 230, open = st.state === 'clear' ? Math.min(1, st.clearT * 1.5) : 0;
    ctx.fillStyle = '#2a2f4f'; ctx.fillRect(x - 14, top - 14, 188, 244);
    ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.fillRect(x - 14, top - 14, 188, 3); ctx.fillRect(x - 14, top - 14, 3, 244);
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; for (const [a, b] of [[-7, -7], [167, -7], [-7, 222], [167, 222]]) { circle(x + a, top + b, 2); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,233,168,0.12)'; ctx.beginPath(); ctx.ellipse(x + 80, top + 232, 120, 16, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffe9a8'; ctx.fillRect(x, top, 160, 230);
    ctx.fillStyle = '#6a7296'; ctx.fillRect(x, top, 160, 230 * (0.92 - open * 0.92) + 18);
    ctx.fillStyle = 'rgba(20,18,40,0.15)'; for (let yy = top + 20; yy < top + 230 * (0.92 - open * 0.92); yy += 22) ctx.fillRect(x, yy, 160, 3);
    rf27Stripes(x, top + 230 * (0.92 - open * 0.92), 160, 18);
    text(st.final ? 'EXIT' : 'ZONE ' + (st.k + 2), x + 80, top - 32, 22, C.gold, 'center');
    const on = Math.sin(t * 5) > 0;
    ctx.fillStyle = on ? '#7aff9a' : '#2f6a3f'; circle(x + 172, top - 26, 7); ctx.fill();
  }
  function drawBolt(x, y, t) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(t * 2 + x * 0.01);
    ctx.fillStyle = C.gold; ctx.strokeStyle = C.goldDark; ctx.lineWidth = 2;
    ctx.beginPath(); for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; ctx.lineTo(Math.cos(a) * 10, Math.sin(a) * 10); } ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff3c4'; circle(0, 0, 3.5); ctx.fill();
    ctx.restore();
  }
  function drawChutes(st, z, t) {
    const f = floorAt(st, (z.x0 + z.x1) / 2) || { top: M.floor0 }, y = f.top - M.crateDrop - 60;
    for (let x = z.x0; x < z.x1; x += 120) {
      ctx.fillStyle = '#4a5270'; ctx.fillRect(x + 20, y - 400, 60, 400);
      ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.fillRect(x + 20, y - 400, 5, 400);
      ctx.fillStyle = 'rgba(20,18,40,0.25)'; ctx.fillRect(x + 70, y - 400, 10, 400);
      ctx.fillStyle = '#3a4260'; for (let yy = y - 380; yy < y; yy += 90) { ctx.fillRect(x + 16, yy, 68, 7); }
      ctx.fillStyle = 'rgba(255,255,255,0.22)'; for (let yy = y - 380; yy < y; yy += 90) ctx.fillRect(x + 16, yy, 68, 1.4);
      ctx.fillStyle = '#20243c'; ctx.beginPath(); for (let yy = y - 380; yy < y; yy += 90) for (const rx of [x + 22, x + 50, x + 78]) { ctx.moveTo(rx + 1.3, yy + 3.5); ctx.arc(rx, yy + 3.5, 1.3, 0, 7); } ctx.fill();
      ctx.fillStyle = 'rgba(20,18,40,0.18)'; ctx.fillRect(x + 48, y - 400, 2, 400);
      ctx.fillStyle = '#2a2f4f'; ctx.fillRect(x + 14, y, 72, 22);
      ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillRect(x + 14, y, 72, 2); ctx.fillStyle = '#0e0e1e'; ctx.fillRect(x + 22, y + 8, 56, 10);
      rf27Stripes(x + 14, y + 22, 72, 8);
    }
    if (z.gold) { ctx.fillStyle = 'rgba(255,197,61,0.25)'; ctx.fillRect(z.x0, y + 30, z.x1 - z.x0, 8); }
    void t;
  }
  function drawCrate(st, q, t) {
    const s = M.crateW;
    if (q.warn > 0) {
      // the warning: a flashing light and a target ring on the floor
      const f = floorAt(st, q.x) || { top: st.m.y + st.m.h }, on = Math.sin(t * 20) > 0;
      ctx.strokeStyle = on ? '#ff6b6b' : '#ffd36b'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(q.x, f.top - 4, 30, 8, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = on ? '#ff6b6b' : '#ffd36b'; circle(q.x, q.y - 40, 8); ctx.fill();
      text('!', q.x, q.y - 40, 13, '#1c1a36', 'center');
      return;
    }
    ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.r);
    rf27Crate(-s / 2, -s / 2, s, s, q.z.gold ? 'gold' : 'wood', t);
    ctx.restore();
  }
  function drawMech(st, t) {
    const m = st.m, x = m.x, y = m.y, cx = x + M.w / 2;
    const Lc = PCOL[st.legs], Ld = PDARK[st.legs], Ac = PCOL[st.arms], Ad = PDARK[st.arms];
    const feet = y + m.h, hip = y + 100, walk = m.walkT, sw = m.grounded ? Math.sin(walk * 2.2) : 0.5;
    { const f = floorAt(st, cx); if (f && f.top >= feet - 2) { const up = clamp((f.top - feet) / 200, 0, 1); ctx.fillStyle = 'rgba(20,18,40,' + (0.25 * (1 - up)) + ')'; ctx.beginPath(); ctx.ellipse(cx, f.top, 52 * (1 - up * 0.4), 7, 0, 0, Math.PI * 2); ctx.fill(); } }
    ctx.save();
    if (m.stun > 0) { ctx.translate(cx, feet); ctx.rotate(Math.sin(G.clock * 30) * 0.04); ctx.translate(-cx, -feet); }
    // legs: two thick piston legs (shorter when ducking)
    const legLen = feet - hip;
    for (const [k, off] of [[0, -22], [1, 22]]) {
      const ph = k ? -sw : sw, kx = cx + off + ph * 8, fx2 = cx + off + ph * 14;
      ctx.strokeStyle = k ? '#4a5270' : '#5a6488'; ctx.lineWidth = 16; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(cx + off * 0.6, hip); ctx.lineTo(kx + 8, hip + legLen * 0.5); ctx.lineTo(fx2, feet - 8); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(cx + off * 0.6 - 4, hip); ctx.lineTo(kx + 4, hip + legLen * 0.5); ctx.lineTo(fx2 - 4, feet - 8); ctx.stroke();
      ctx.fillStyle = Ld; rr(fx2 - 20, feet - 14, 40, 14, 5); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.25)'; rr(fx2 - 17, feet - 13, 34, 3, 1.5); ctx.fill();
      ctx.fillStyle = '#2a2f4f'; ctx.fillRect(fx2 - 20, feet - 3, 40, 3);
      ctx.fillStyle = Lc; circle(kx + 8, hip + legLen * 0.5, 7); ctx.fill();
    }
    // the back arm
    ctx.strokeStyle = '#4a5270'; ctx.lineWidth = 14;
    ctx.beginPath(); ctx.moveTo(x + 10, y + 56); ctx.lineTo(x - 2, y + 90); ctx.stroke();
    ctx.fillStyle = Ad; circle(x - 2, y + 94, 11); ctx.fill();
    // the torso (legs pilot's window) and the head dome (arms pilot)
    ctx.fillStyle = '#c4cee6'; ctx.strokeStyle = '#4a5270'; ctx.lineWidth = 3;
    rr(x + 4, y + 42, M.w - 8, 62, 12); ctx.fill();
    ctx.fillStyle = '#9aa8c8'; rr(x + M.w - 20, y + 44, 14, 58, 10); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; rr(x + 8, y + 46, 5, 46, 2.5); ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#7a86a8'; for (const [a, b] of [[12, 50], [M.w - 12, 50], [12, 90], [M.w - 12, 90]]) { circle(x + a, y + b, 2.2); ctx.fill(); }
    ctx.fillStyle = Lc; ctx.fillRect(x + 4, y + 96, M.w - 8, 8);
    ctx.fillStyle = 'rgba(20,30,60,0.75)'; rr(x + 20, y + 52, M.w - 40, 44, 8); ctx.fill();
    ctx.fillStyle = '#c4cee6'; rr(x + 14, y - 2, M.w - 28, 46, 18); ctx.fill(); ctx.stroke();
    ctx.fillStyle = Ac; ctx.fillRect(x + 14, y + 36, M.w - 28, 6);
    ctx.fillStyle = 'rgba(20,30,60,0.75)'; rr(x + 24, y + 4, M.w - 48, 34, 14); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.moveTo(x + 30, y + 34); ctx.lineTo(x + 44, y + 6); ctx.lineTo(x + 54, y + 6); ctx.lineTo(x + 40, y + 34); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + 26, y + 92); ctx.lineTo(x + 40, y + 54); ctx.lineTo(x + 50, y + 54); ctx.lineTo(x + 36, y + 92); ctx.fill();
    // antenna light
    ctx.strokeStyle = '#4a5270'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx + 26, y + 2); ctx.lineTo(cx + 30, y - 14); ctx.stroke();
    ctx.fillStyle = Math.sin(t * 6) > 0 ? '#ff6b6b' : '#ffd36b'; circle(cx + 30, y - 16, 4); ctx.fill();
    ctx.restore();
  }
  function drawArm(st, t) {
    const m = st.m, x = m.x, y = m.y;
    const sx = x + M.w - 12, sy = y + 58, a = st.armA, ext = st.punch > 0 ? Math.sin((1 - st.punch / M.punchT) * Math.PI) * 34 : 0;
    const len = 52 + ext, ex = sx + Math.cos(a) * len, ey = sy + Math.sin(a) * len;
    const Ac = PCOL[st.arms], Ad = PDARK[st.arms];
    ctx.strokeStyle = '#5a6488'; ctx.lineWidth = 16; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.fillStyle = Ac; circle(sx, sy, 10); ctx.fill();
    // the fist (with a shield plate when held high)
    ctx.fillStyle = Ad; ctx.strokeStyle = '#2a2f4f'; ctx.lineWidth = 3; circle(ex, ey, 16); ctx.fill(); ctx.stroke();
    ctx.fillStyle = Ac; circle(ex + 3, ey - 3, 7); ctx.fill();
    if (st.arm === 2 || st.umbrella) {
      ctx.save(); ctx.translate(ex - 30, ey - 14);
      ctx.fillStyle = st.umbrella ? C.gold : 'rgba(191,246,255,0.85)'; ctx.strokeStyle = '#2a2f4f'; ctx.lineWidth = 3;
      rr(-56, -8, 112, 14, 6); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    void t;
  }
  function drawTop(st) {
    const t = G.clock;
    ctx.save();
    ctx.translate(-Math.round(st.camX), -Math.round(st.camY));
    const m = st.m;
    // glass sheen over both seats
    ctx.fillStyle = 'rgba(190,240,255,0.18)'; rr(m.x + 24, m.y + 4, M.w - 48, 34, 14); ctx.fill(); rr(m.x + 20, m.y + 52, M.w - 40, 44, 8); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(m.x + 30, m.y + 8, 6, 12); ctx.fillRect(m.x + 26, m.y + 56, 6, 14);
    drawArm(st, t);
    ctx.restore();
  }
  function drawHud(st) {
    const s = st.stats, big = rf27Big();
    rf27TopPill([fmtTime(G.time), 'Bolts ' + s.bolts + '/' + s.boltsTotal, 'Boings ' + s.boings, 'Clonks ' + s.clonks]);
    rf27DrawNews(st, big ? 104 : 86);
    const j = jobs(st);
    const cpuL = isCpu(st.legs), cpuA = isCpu(st.arms);
    const lp = rf27Panel(st.legs, NAMES[st.legs] + ': LEGS' + (cpuL ? ' (computer)' : ''), cpuL ? 'Walks, jumps and ducks' : j.legs[0], cpuL ? '' : j.legs[1], st.legs === 0 ? 'left' : 'right');
    const ap = rf27Panel(st.arms, NAMES[st.arms] + ': ARMS' + (cpuA ? ' (computer)' : ''), cpuA ? 'Punches, grabs and blocks' : j.arms[0], cpuA ? '' : j.arms[1], st.arms === 0 ? 'left' : 'right');
    // the arm-height gauge beside the arms panel
    const sc = big ? 1.3 : 1, gx = st.arms === 0 ? ap.x + ap.w + 14 * sc : ap.x - 30 * sc, gy = ap.y + ap.h - 8;
    const want = j.pl.kind === 'wall' && j.pl.dist < 300 ? j.pl.o.spot : -1;
    ctx.fillStyle = 'rgba(28,26,54,0.8)'; rr(gx - 4, gy - 76 * sc, 24 * sc, 80 * sc, 8); ctx.fill();
    for (let k = 0; k < 3; k++) {
      const yy = gy - 10 * sc - k * 24 * sc;
      ctx.fillStyle = k === st.arm ? PCOL[st.arms] : 'rgba(255,255,255,0.18)'; rr(gx, yy - 9 * sc, 16 * sc, 18 * sc, 5); ctx.fill();
      if (k === want) { ctx.strokeStyle = '#7affff'; ctx.lineWidth = 2.5; rr(gx - 2, yy - 11 * sc, 20 * sc, 22 * sc, 6); ctx.stroke(); }
    }
    void lp;
    if (st.onBreak) rf27Break();
  }
})();
