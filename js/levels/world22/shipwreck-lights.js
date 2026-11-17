/* Pip & Bo - Level 22-3 Shipwreck Lights (team, World 22 Coral Deep). */
'use strict';

/* ===== 22-3 Shipwreck Lights (mode 'shipwreck', team) — Gavyn's pick =====
   "A dark sunken ship. One carries a glowing lantern fish that lights the way, the other opens doors and grabs
   treasure. Neither can do it alone. Swap roles between sections."
   Side view inside a cosy sunken ship (sleepy crabs, a hermit crab, glowing plankton, portholes); the scene scrolls
   rightward through four sections. The mode owns the tick, the camera, the picture and the HUD (def.ownStep +
   def.ownHUD + def.noFalls; the engine grid is only the two spawns). Pip and Bo SWIM: ◀ ▶ and ▲ (jump) / ▼ push them
   through the water in any direction (no gravity; they drift to a stop), in WORLD coordinates (x along the section,
   y on screen; the camera only scrolls sideways). Between steps p.x is on screen (world x - camX), so the engine
   draws them, their name tags and the computer's bubbles in the right place. Partners swim through each other.
   It is very dark (Gavyn, Nov 2026: darker so the lantern matters): a near-black blue overlay covers the ship, with
   soft light circles. Outside Glimmer's light the walls, doors and crates are barely visible;
   the small hidden things (levers, wheel valves, keys, treasure, prickly coral and sea urchins) only show inside the
   lantern light, and fade out again after it moves on (a lever or key that was seen once leaves a faint outline).
   - THE LANTERN (one job per section) carries Glimmer the lantern fish. Glimmer's light (radius 160) shows and WAKES
     things: the grabber can only use something that is in Glimmer's light. The action ('flash') is a big bright
     flash (radius 330 for about a second, then 3 s to recharge) that wakes a sleepy glowing anemone (a switch: it
     opens its door) and shoos a grumpy pufferfish out of a hatch it is blocking (it puffs up "Eek!" and swims off to
     a corner, happy). Both have to be within 290 px of Glimmer when the flash goes off. The lantern can't open or
     grab anything, can't carry keys and can't push crates.
   - THE GRABBER has the grabby claw. In the light it pulls levers (a press of the action, 'grab'), turns wheel valves
     (hold the action about 1.3 s; let go and the turn is kept), picks up keys and treasure (swim into them) and opens
     a locked door by swimming to its keyhole with the key. It pushes crates out of low tunnels (swim into the side).
     In the dark the claw finds nothing: "Too dark! Bring Glimmer here!".
   - A door opens when all its switches are on (a lever, a wheel, a key, an anemone, or two of them). A section ends
     when both swim through its exit door at the right side; the jobs swap each section (Pip lights 1 and 3). The last
     one ends at the big treasure chest: the grabber holds the action in the light to open it.
   - Soft fails only: touching prickly coral, an urchin or a pufferfish is a "Bonk!": bubbles, a short dizzy wobble
     and a push back (1.4 s of safety after). Counted as Bonks, never a game over.
   - Gold help, always announced: 3 bonks on the same prickly thing make it glow gold (visible in the dark, and it
     stops bonking); 10 bonks in one section turn them all gold. 40 s stuck on one step (someone pressing keys) makes the thing
     needed GOLD: a gold lever, wheel, key or keyhole glows in the dark and works without light, a gold anemone wakes
     and a gold pufferfish leaves when Glimmer swims near (no flash needed), a gold crate slides easily. 22 s without
     progress: a gold hint line for whoever is stuck.
   - Leash: you can't swim more than 600 px ahead of your partner ("Wait for Bo!").
   - Rest: when every person playing has pressed nothing for 15 s the clock waits ("RESTING" chip). A lantern who just
     keeps still, holding the light for a partner, is still playing: the clock, the hints and gold help go on.
   - A crate out of its tunnel can't be pushed back in (that would shut the lantern out).
   Sections (def.roomWord 'Section'): Cargo Hold (a lever, a crate in a low tunnel, a wheel), Galley (a pufferfish in
   the serving hatch, a hidden key, bobbing urchins, a lever, a second pufferfish), Captain's Cabin (sleepy anemones
   with a lever on one door, a zigzag of prickly coral, a crate, a key on the bookshelf, an anemone + wheel door),
   Treasure Room (a bit of everything, then the chest).
   Medal (MODES.shipwreck.medals, js/medals.js; medalOf is kept for the tools): Gold at <= 3:45 with <= 5
   bonks and >= 60% of the treasure, Silver at <= 5:30 with <= 14 bonks, else Bronze.
   Results: Bonks and treasure per player, flashes per player, the treasure count and the gold help.
   Room def: { title, lantern: 0|1, look, tip, news, act, len, exit, items: [...] } with items (world coords, y on
   screen; the ship's ceiling is y 104 and its floor y 476):
     ['wall', x, y, w, h, look]                 solid timber (look: 'wood' | 'crates' | 'table' | 'shelf' | 'pipe')
     ['bulk', x, top, bottom, { door, need, lock }]   a bulkhead (36 wide) with an opening from top to bottom; a door
                                               id fills the opening and opens when every switch id in need is on
                                               (lock: it has a keyhole and its key is one of the needs)
     ['lever' | 'wheel' | 'key' | 'glow', id, x, y]   a switch (glow = a sleepy glowing anemone on the floor)
     ['puffer', x, y, toX, toY]                 a grumpy pufferfish blocking a hatch; flashed, it swims to toX, toY
     ['coral', x, y, r, side]                   prickly coral (side 'floor' | 'ceil')
     ['urchin', x, y, { dx, dy, per, ph }]       a sea urchin that sways dx / dy px every per seconds
     ['gem', x, y, kind] / ['gems', x, y, n, dx, dy, kind]   treasure (kind 'coin' | 'pearl' | 'gem')
     ['crate', x, clearX]                       a crate on the floor; its step is done once its left side is past clearX
     ['sign', x, y, text, cpuText]              a hint written in the water ({L} / {G} lantern / grabber names,
                                               {La} / {Ga} their action keys; cpuText when that player is the computer)
     ['port', x, y]                             a porthole (decoration) and ['decor', kind, x, y]
     ['chest', x]                               the big treasure chest (last section)
   MODES.shipwreck exposes the helpers the computer brain reads (need, solids, isLit, wx, fish); state lives in G.mst.
   Every top-level name starts with shipwreck / SHIPWRECK (Sfx.extra.shipwreck* too). Rules have no randomness at
   all (only the looks use Math.random). */
const SHIPWRECK = {
  ceil: 104, floor: 476, bw: 36,
  acc: 1150, brake: 1700, vmax: 205, drag: 3.4, pushV: 120,
  lightR: 160, flashR: 330, flashCD: 3.0, flashReach: 290, flashUp: 0.12, flashHold: 0.42, flashDown: 0.7,
  reach: 58, wheelT: 1.3, chestT: 1.4, touchR: 24,
  bonkStun: 0.6, bonkSafe: 1.4, bonkV: 270,
  maxSep: 600, goldBonks: 3, goldAll: 10, goldSlow: 40, stuckHint: 22, goldNear: 220, idleRest: 15,
  crate: 60, crateG: 900,
  introHold: 0.4, newsLife: 3.8, clearT: 1.8, finT: 4.8, chipAgain: 14,
};

(() => {
  const SW = SHIPWRECK;
  const solo = () => typeof cpuSolo === 'function' && cpuSolo();
  const isCpu = id => solo() && cpuOn(id);
  const big = () => typeof hudBig === 'function' && hudBig();
  const lerp = (a, b, u) => a + (b - a) * u;
  const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
  const FONT = '"Atkinson Hyperlegible", system-ui, sans-serif';
  const TAU = Math.PI * 2;

  /* ---------- each player's own keys (keyboard, controller or touch) ---------- */
  function dev(id) { try { return actKey(id); } catch (e) { return 'kb'; } }
  function key(id, what) {
    const d = dev(id), s = solo();
    if (what === 'act') return d === 'pad' ? glyph('act') : d === 'touch' ? 'the ' + (G.mst && G.mst.lantern === id ? 'flash' : 'grab') + ' button' : s ? 'F' : id === 0 ? 'F' : '/';
    if (what === 'move') return d === 'pad' ? 'the stick' : d === 'touch' ? '◀ ▶ ▲ ▼' : s ? 'W A S D' : id === 0 ? 'W A S D' : 'the arrows';
    return '';
  }

  /* ---------- building a section from its items ---------- */
  function compile(st, def) {
    const C0 = SW.ceil, F0 = SW.floor;
    const walls = [], doors = [], trig = {}, hazards = [], puffers = [], crates = [], gems = [], signs = [], decor = [], ports = [];
    let chest = null;
    const nm = s => String(s).replace(/\{L\}/g, NAMES[st.lantern]).replace(/\{G\}/g, NAMES[st.grabber]);
    for (const it of def.items || []) {
      const k = it[0];
      if (k === 'wall') walls.push({ x0: it[1], y0: it[2], x1: it[1] + it[3], y1: it[2] + it[4], look: it[5] || 'wood' });
      else if (k === 'bulk') {
        const x = it[1], a = it[2], b = it[3], o = it[4] || {};
        if (a > C0 + 1) walls.push({ x0: x, x1: x + SW.bw, y0: C0 - 30, y1: a, look: 'bulk' });
        if (b < F0 - 1) walls.push({ x0: x, x1: x + SW.bw, y0: b, y1: F0 + 30, look: 'bulk' });
        if (o.door) doors.push({ id: o.door, x0: x + 3, x1: x + SW.bw - 3, y0: a, y1: b, need: o.need || [], lock: !!o.lock, open: 0, opening: false, gold: false, vis: 0 });
      } else if (k === 'lever' || k === 'wheel' || k === 'key' || k === 'glow') {
        trig[it[1]] = { id: it[1], kind: k, x: it[2], y: it[3], hx: it[2], hy: it[3], on: false, vis: 0, seen: false, gold: false, hold: 0, t: 0, got: false };
      } else if (k === 'puffer') puffers.push({ x: it[1], y: it[2], hx: it[1], hy: it[2], tx: it[3], ty: it[4], r: 33, state: 'block', t: 0, vis: 0, bonks: 0, gold: false, puff: 0, seen: false });
      else if (k === 'coral') {
        // (it sits on the ceiling or the floor; its bonk circle covers the drawn branches)
        const r = it[3] || 24, side = it[4] || 'floor', y = side === 'ceil' ? C0 + r * 0.9 : F0 - r * 0.9;
        hazards.push({ kind: 'coral', bx: it[1], by: y, x: it[1], y, r, side, bonks: 0, gold: false, vis: 0, seed: hazards.length * 7 + 3 });
      }
      else if (k === 'urchin') { const o = it[3] || {}; hazards.push({ kind: 'urchin', bx: it[1], by: it[2], x: it[1], y: it[2], r: 19, dx: o.dx || 0, dy: o.dy || 0, per: o.per || 4, ph: o.ph || 0, bonks: 0, gold: false, vis: 0, seed: hazards.length * 7 + 3 }); }
      else if (k === 'gem') gems.push({ x: it[1], y: it[2], kind: it[3] || 'coin', got: false, vis: 0, t: 0 });
      else if (k === 'gems') for (let n = 0; n < it[3]; n++) gems.push({ x: it[1] + n * it[4], y: it[2] + n * it[5], kind: it[6] || 'coin', got: false, vis: 0, t: 0 });
      else if (k === 'crate') crates.push({ x0: it[1], y0: F0 - SW.crate, w: SW.crate, h: SW.crate, clearX: it[2], vy: 0, pushT: 0, done: false, gold: false, sx: it[1] });
      else if (k === 'sign') signs.push({ x: it[1], y: it[2], raw: nm(it[3]), alt: it[4] != null ? nm(it[4]) : null });
      else if (k === 'port') ports.push({ x: it[1], y: it[2] });
      else if (k === 'decor') decor.push({ kind: it[1], x: it[2], y: it[3], o: it[4] || {}, seed: decor.length * 13 + 5, t: 0 });
      else if (k === 'chest') chest = { kind: 'chest', x: it[1], y: F0 - 34, open: false, hold: 0, vis: 0, seen: false, gold: false, t: 0 };
    }
    st.walls = walls; st.doors = doors; st.trig = trig; st.hazards = hazards; st.puffers = puffers; st.crates = crates;
    st.gems = gems; st.signs = signs; st.decor = decor; st.ports = ports; st.chest = chest;
    st.len = def.len || 2800; st.exitX = def.exit || st.len - 170;
    const steps = [];
    for (const d of doors) steps.push({ kind: 'door', ref: d, x: d.x0 });
    for (const q of puffers) steps.push({ kind: 'puffer', ref: q, x: q.x });
    for (const c of crates) steps.push({ kind: 'crate', ref: c, x: c.x0 });
    if (chest) steps.push({ kind: 'chest', ref: chest, x: chest.x });
    else steps.push({ kind: 'exit', ref: null, x: st.exitX });
    steps.sort((a, b) => a.x - b.x);
    st.steps = steps;
    // the exit door at the right end (purely a picture: it is always open once every step before it is done)
    st.gemsAll = gems.length;
  }

  /* ---------- solids ---------- */
  const doorRect = d => ({ x0: d.x0, x1: d.x1, y0: d.y0, y1: d.y1 - (d.y1 - d.y0) * d.open, door: d });
  function solids(st, withCrates = true) {
    const out = st.walls.slice();
    for (const d of st.doors) if (d.open < 0.97) out.push(doorRect(d));
    if (withCrates) for (const c of st.crates) out.push({ x0: c.x0, x1: c.x0 + c.w, y0: c.y0, y1: c.y0 + c.h, crate: c });
    return out;
  }
  const hit = (a, s) => a.x < s.x1 - 0.01 && a.x + a.w > s.x0 + 0.01 && a.y < s.y1 - 0.01 && a.y + a.h > s.y0 + 0.01;
  function bounds(st, p) {
    let h = false;
    if (p.y < SW.ceil) { p.y = SW.ceil; p.vy = Math.max(0, p.vy); h = true; }
    if (p.y + p.h > SW.floor) { p.y = SW.floor - p.h; p.vy = Math.min(0, p.vy); h = true; }
    if (p.x < 0) { p.x = 0; p.vx = Math.max(0, p.vx); h = true; }
    if (p.x + p.w > st.len) { p.x = st.len - p.w; p.vx = Math.min(0, p.vx); h = true; }
    return h;
  }
  // a crate tries to move by dx: true if it could (nothing in the way, the other player included)
  function crateFree(st, c, other) {
    const r = { x: c.x0, y: c.y0, w: c.w, h: c.h };
    if (r.x < 0 || r.x + r.w > st.len || r.y + r.h > SW.floor + 0.01) return false;
    for (const s of solids(st, false)) if (hit(r, s)) return false;
    for (const q of st.crates) if (q !== c && hit(r, { x0: q.x0, x1: q.x0 + q.w, y0: q.y0, y1: q.y0 + q.h })) return false;
    if (other && other.alive && hit(r, { x0: other.x, x1: other.x + other.w, y0: other.y, y1: other.y + other.h })) return false;
    return true;
  }
  function moveX(st, p, dx) {
    if (!dx) return;
    p.x += dx;
    const P = st.pl[p.id];
    for (const s of solids(st)) {
      if (!hit(p, s)) continue;
      // the grabber pushes a crate (only sideways, and only when mostly beside it)
      if (s.crate && p.id === st.grabber && Math.min(p.y + p.h, s.y1) - Math.max(p.y, s.y0) > 10) {
        const c = s.crate, amt = dx > 0 ? p.x + p.w - c.x0 : p.x - (c.x0 + c.w);
        const ox = c.x0;
        c.x0 += amt;
        // (a crate out of its tunnel can't be pushed back in: that would shut the lantern out for good)
        if ((!c.done || c.x0 >= c.clearX) && crateFree(st, c, G.players[st.lantern])) { c.pushT = 0.15; P.pushT = 0.15; if (Math.abs(c.x0 - (c.lastSnd || 0)) > 40) { c.lastSnd = c.x0; Sfx.play('shipwreckScrape'); } continue; }
        c.x0 = ox;
      }
      if (dx > 0) p.x = Math.min(p.x, s.x0 - p.w); else p.x = Math.max(p.x, s.x1);
      p.vx = 0;
    }
    bounds(st, p);
  }
  function moveY(st, p, dy) {
    if (!dy) return;
    p.y += dy;
    for (const s of solids(st)) {
      if (!hit(p, s)) continue;
      if (dy > 0) p.y = Math.min(p.y, s.y0 - p.h); else p.y = Math.max(p.y, s.y1);
      p.vy = 0;
    }
    bounds(st, p);
  }
  function crateStep(st, dt) {
    for (const c of st.crates) {
      c.pushT -= dt;
      // sinks gently to the floor (or onto whatever is under it)
      c.vy = Math.min(c.vy + SW.crateG * dt, 260);
      const oy = c.y0;
      c.y0 += c.vy * dt;
      if (!crateFree(st, c, null)) { c.y0 = oy; c.vy = 0; }
      if (!c.done && c.x0 >= c.clearX) {
        c.done = true; st.progressT = 0;
        pop(st, c.x0 + c.w / 2, c.y0 - 30, 'Tunnel clear!', C.gold, 20);
        Sfx.play('shipwreckThud');
        bubbles(st, c.x0 + c.w / 2, c.y0 + c.h, 10);
      }
    }
  }

  /* ---------- light ---------- */
  function flashEnv(t) {
    if (t == null) return 0;
    if (t < SW.flashUp) return t / SW.flashUp;
    if (t < SW.flashHold) return 1;
    return clamp(1 - (t - SW.flashHold) / SW.flashDown, 0, 1);
  }
  const lightRad = st => SW.lightR + (SW.flashR - SW.lightR) * flashEnv(st.flashT);
  // how lit a world spot is by Glimmer (0..1)
  function lightAt(st, x, y) {
    if (!st.fish) return 0;
    const r = lightRad(st), d = dist(st.fish.x, st.fish.y, x, y);
    return clamp((r - d) / (r * 0.3), 0, 1);
  }
  const isLit = (st, x, y) => lightAt(st, x, y) >= 0.4;
  function visStep(o, want, dt) { o.vis = want > o.vis ? Math.min(want, o.vis + dt * 6) : Math.max(want, o.vis - dt * 1.6); if (o.vis > 0.6) o.seen = true; }

  /* ---------- the lantern: Glimmer follows, the flash ---------- */
  function fishStep(st, dt) {
    const p = G.players[st.lantern];
    const tx = p.x + p.w / 2 + p.face * 25, ty = p.y + 8 + Math.sin(G.time * 3) * 2;
    if (!st.fish) st.fish = { x: tx, y: ty };
    const k = Math.min(1, dt * 12);
    st.fish.x += (tx - st.fish.x) * k; st.fish.y += (ty - st.fish.y) * k;
    if (st.flashT != null) { st.flashT += dt; if (st.flashT > SW.flashHold + SW.flashDown) st.flashT = null; }
  }
  function flash(st, p) {
    const P = st.pl[p.id];
    if (P.cd > 0) {
      if (P.noCD <= 0) { P.noCD = 1.2; pop(st, p.x + p.w / 2, p.y - 26, 'Glimmer is resting...', '#bfe6ff', 14); Sfx.play('shipwreckNo'); }
      return;
    }
    P.cd = SW.flashCD; st.flashT = 0; st.stats.flashes[p.id]++;
    Sfx.play('shipwreckFlash', p.id);
    const fx = st.fish.x, fy = st.fish.y;
    for (let i = 0; i < 14; i++) { const a = i / 14 * TAU; st.parts.push({ x: fx, y: fy, vx: Math.cos(a) * 260, vy: Math.sin(a) * 260, t: 0, life: 0.5, r: 3, kind: 'spark' }); }
    let woke = false;
    for (const tr of Object.values(st.trig)) {
      if (tr.kind !== 'glow' || tr.on || dist(fx, fy, tr.x, tr.y) > SW.flashReach) continue;
      wake(st, tr); woke = true;
    }
    for (const q of st.puffers) {
      if ((q.state !== 'block' && q.state !== 'puff') || dist(fx, fy, q.x, q.y) > SW.flashReach) continue;
      shoo(st, q); woke = true;
    }
    if (woke) st.progressT = 0;
  }
  function wake(st, tr) {
    tr.on = true; tr.t = 0;
    pop(st, tr.x, tr.y - 50, 'Awake!', '#9ff6ff', 20);
    Sfx.play('shipwreckWake');
    for (let i = 0; i < 12; i++) st.parts.push({ x: tr.x, y: tr.y - 16, vx: (Math.random() - 0.5) * 140, vy: -40 - Math.random() * 100, t: 0, life: 0.9, r: 2 + Math.random() * 2, kind: 'glow' });
  }
  function shoo(st, q) {
    q.state = 'leave'; q.t = 0; q.fx = q.x; q.fy = q.y;
    pop(st, q.x, q.y - 52, 'Eek!', '#ffe27a', 22);
    Sfx.play('shipwreckEek');
  }

  /* ---------- one player's swim (world coords) ---------- */
  function swim(st, p, dt) {
    const P = st.pl[p.id];
    P.stunT = Math.max(0, P.stunT - dt); P.safeT -= dt; P.pushT -= dt;
    let inp = p.input;
    if (st.state !== 'play' || G.introT > SW.introHold || P.stunT > 0) inp = NO_INPUT;
    if (st.state === 'end') inp = NO_INPUT;
    const ix = (inp.right ? 1 : 0) - (inp.left ? 1 : 0), iy = (inp.down ? 1 : 0) - (inp.jump || inp.up ? 1 : 0);
    const n = ix && iy ? Math.SQRT1_2 : 1;
    const vmax = P.pushT > 0 ? SW.pushV * (st.crates.some(c => c.gold && c.pushT > 0) ? 1.6 : 1) : SW.vmax;
    const axis = (v, i) => {
      if (i) {
        v += i * n * (Math.sign(v) === -i ? SW.brake : SW.acc) * dt;
        const lim = vmax * n * (i ? 1 : 0);
        if (Math.abs(v) > lim) v = Math.sign(v) * Math.max(lim, Math.abs(v) - SW.brake * dt);
      } else v *= Math.exp(-SW.drag * dt);
      return v;
    };
    p.vx = axis(p.vx, ix); p.vy = axis(p.vy, iy);
    if (!iy && P.stunT <= 0) p.vy += Math.sin(G.time * 2.2 + p.id * 2) * 9 * dt;   // a gentle bob
    if (ix) p.face = ix;
    moveX(st, p, p.vx * dt);
    moveY(st, p, p.vy * dt);
    p.grounded = false; p.tileGround = false; p.onPartner = false;
    p.stun = P.stunT;
    // little bubbles from swimming
    if ((ix || iy) && Math.random() < dt * 5) st.parts.push({ x: p.x + p.w / 2 - p.face * 10, y: p.y + 8, vx: -p.face * 20, vy: -30, t: 0, life: 1.0, r: 1.5 + Math.random() * 2, kind: 'bub' });
    P.swimT = ix || iy ? (P.swimT || 0) + dt : 0;
  }

  /* ---------- bonks: prickly coral, urchins, pufferfish ---------- */
  function hazardsStep(st, dt) {
    for (const h of st.hazards) {
      if (h.kind === 'urchin') {
        const u = Math.sin(st.t * TAU / h.per + h.ph);
        h.x = h.bx + h.dx * u; h.y = h.by + h.dy * u;
      }
      visStep(h, h.gold ? 1 : lightAt(st, h.x, h.y), dt);
    }
    for (const q of st.puffers) {
      q.t += dt; q.puff = Math.max(0, q.puff - dt);
      if (q.state === 'puff' && q.puff <= 0) q.state = 'block';
      if (q.state === 'leave') {
        const u = clamp((q.t - 0.5) / 1.6, 0, 1), e = u * u * (3 - 2 * u);
        q.x = lerp(q.fx, q.tx, e); q.y = lerp(q.fy, q.ty, e) - Math.sin(u * Math.PI) * 40;
        if (q.t > 2.2) { q.state = 'gone'; q.t = 0; Sfx.play('shipwreckPlink'); }
      }
      if (q.gold && (q.state === 'block' || q.state === 'puff') && st.fish && dist(st.fish.x, st.fish.y, q.x, q.y) < SW.goldNear) { shoo(st, q); st.progressT = 0; }
      visStep(q, Math.max(q.gold ? 1 : 0, lightAt(st, q.x, q.y)), dt);
    }
    for (const p of G.players) {
      const P = st.pl[p.id], cx = p.x + p.w / 2, cy = p.y + p.h / 2;
      // (the bonk circle is a little smaller than the drawing: a near miss is a miss)
      const list = st.hazards.map(h => ({ x: h.x, y: h.y, r: h.r * 0.86, h }))
        .concat(st.puffers.filter(q => q.state === 'block' || q.state === 'puff').map(q => ({ x: q.x, y: q.y, r: q.r * (q.state === 'puff' ? 1.15 : 1), q })));
      for (const o of list) {
        const nx = clamp(o.x, p.x, p.x + p.w), ny = clamp(o.y, p.y, p.y + p.h), d = dist(nx, ny, o.x, o.y);
        if (d >= o.r) continue;
        // pushed out (never through a prickly thing), and a bonk if not still safe
        let ux = cx - o.x, uy = cy - o.y; const L = Math.hypot(ux, uy) || 1; ux /= L; uy /= L;
        const push = o.r - d + 0.5;
        moveX(st, p, ux * push); moveY(st, p, uy * push);
        const gold = o.h ? o.h.gold : false;
        if (gold) { p.vx = ux * 120; p.vy = uy * 120; if (P.safeT <= 0) { P.safeT = 0.6; Sfx.play('shipwreckBoop'); } continue; }
        if (P.safeT > 0 || st.state !== 'play') continue;
        bonk(st, p, o, ux, uy);
      }
    }
  }
  function bonk(st, p, o, ux, uy) {
    const P = st.pl[p.id];
    P.stunT = SW.bonkStun; P.safeT = SW.bonkSafe;
    p.vx = ux * SW.bonkV; p.vy = uy * SW.bonkV;
    p.sx = 1.3; p.sy = 0.75;
    st.stats.bonks[p.id]++; st.secBonks++;
    bubbles(st, p.x + p.w / 2, p.y + p.h / 2, 12);
    const what = o.q ? 'Hmph!' : 'Bonk!';
    pop(st, p.x + p.w / 2, p.y - 24, what, o.q ? '#ffe27a' : '#ffffff', 20);
    Sfx.play(o.q ? 'shipwreckPuff' : 'shipwreckBonk', p.id);
    if (o.q) { o.q.state = 'puff'; o.q.puff = 1.0; o.q.bonks++; }
    if (o.h) {
      o.h.bonks++;
      if (o.h.bonks >= SW.goldBonks && !o.h.gold) {
        o.h.gold = true;
        news(st, 'Gold glow! That prickly ' + (o.h.kind === 'coral' ? 'coral' : 'urchin') + ' glows gold now: no more bonks', true, 4.5);
        st.goldUsed.push('prickly'); Sfx.play('shipwreckGold');
      }
    }
    if (st.secBonks >= SW.goldAll && !st.allGold) {
      st.allGold = true;
      for (const h of st.hazards) h.gold = true;
      news(st, 'Gold glow! Every prickly thing in this section glows gold now', true, 5);
      st.goldUsed.push('prickly'); Sfx.play('shipwreckGold');
    }
    if (isCpu(1 - p.id) && typeof cpuSay === 'function') cpuSay(G.players[1 - p.id], 'Bonk! You’re okay!');
  }

  /* ---------- the grabber: levers, wheels, keys, treasure, the chest ---------- */
  const usable = (st, o, x, y) => o.gold || isLit(st, x, y);
  function reachable(st, p) {
    // the switch or chest nearest the claw (world coords) within reach, or null
    const cx = p.x + p.w / 2 + p.face * 6, cy = p.y + p.h / 2;
    let best = null, bd = SW.reach;
    for (const tr of Object.values(st.trig)) {
      if (tr.on || (tr.kind !== 'lever' && tr.kind !== 'wheel')) continue;
      const d = dist(cx, cy, tr.x, tr.y);
      if (d < bd) { bd = d; best = tr; }
    }
    if (st.chest && !st.chest.open) { const d = dist(cx, cy, st.chest.x, st.chest.y); if (d < SW.reach + 24 && d < bd + 24) best = st.chest; }
    return best;
  }
  function grabber(st, p, dt) {
    const P = st.pl[p.id], inp = p.input;
    P.armT = Math.max(0, P.armT - dt); P.noCD -= dt;
    if (st.state !== 'play' || G.introT > SW.introHold || P.stunT > 0) { p.pendingAct = false; P.hold = null; return; }
    const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
    const tgt = reachable(st, p);
    if (p.pendingAct) {
      p.pendingAct = false; P.armT = 0.28;
      if (tgt && usable(st, tgt, tgt.x, tgt.y)) {
        if (tgt.kind === 'lever') { tgt.on = true; tgt.t = 0; st.stats.opened[p.id]++; st.progressT = 0; pop(st, tgt.x, tgt.y - 34, 'Clunk!', C.gold, 20); Sfx.play('shipwreckLever'); }
        else P.hold = tgt;
      } else if (tgt) {
        if (P.noCD <= 0) { P.noCD = 1.4; pop(st, cx, p.y - 26, 'Too dark! Bring Glimmer here!', '#bfe6ff', 15); Sfx.play('shipwreckNo'); }
      } else {
        Sfx.play('shipwreckSnap', p.id);
        if (P.noCD <= 0 && !lightAt(st, cx, cy)) { P.noCD = 2.5; pop(st, cx, p.y - 26, 'Too dark to see!', '#bfe6ff', 14); }
      }
    }
    if (P.hold) {
      const h = P.hold, near = tgt === h, lit = usable(st, h, h.x, h.y);
      if (inp.act && near && lit && !(h.on || h.open)) {
        h.hold += dt; P.armT = 0.2;
        if (Math.floor(h.hold * 4) !== Math.floor((h.hold - dt) * 4)) Sfx.play('shipwreckCreak', p.id);
        const need = h.kind === 'chest' ? SW.chestT : SW.wheelT;
        if (h.hold >= need) {
          if (h.kind === 'chest') { openChest(st, h); }
          else { h.on = true; h.t = 0; st.stats.opened[p.id]++; pop(st, h.x, h.y - 40, 'Turned!', C.gold, 20); Sfx.play('shipwreckLever'); }
          st.progressT = 0; P.hold = null;
        }
      } else if (!inp.act || !near) P.hold = null;
      else if (!lit && P.noCD <= 0) { P.noCD = 1.4; pop(st, cx, p.y - 26, 'Too dark! Bring Glimmer here!', '#bfe6ff', 15); }
    }
    // swim into keys and treasure to grab them (in the light)
    for (const tr of Object.values(st.trig)) {
      if (tr.kind !== 'key' || tr.got || tr.on) continue;
      if (dist(cx, cy, tr.x, tr.y) < SW.touchR + 6 && usable(st, tr, tr.x, tr.y)) {
        tr.got = true; st.carry = tr; st.progressT = 0;
        pop(st, tr.x, tr.y - 30, 'A key!', C.gold, 22); Sfx.play('shipwreckKey');
      }
    }
    for (const g of st.gems) {
      if (g.got || dist(cx, cy, g.x, g.y) > SW.touchR || !isLit(st, g.x, g.y)) continue;
      g.got = true; g.t = 0; st.stats.gems[p.id]++;
      pop(st, g.x, g.y - 22, g.kind === 'gem' ? 'Gem!' : g.kind === 'pearl' ? 'Pearl!' : '+1', C.gold, g.kind === 'coin' ? 16 : 19);
      Sfx.play(g.kind === 'coin' ? 'shipwreckCoin' : 'shipwreckGem', p.id);
      for (let i = 0; i < 7; i++) st.parts.push({ x: g.x, y: g.y, vx: (Math.random() - 0.5) * 160, vy: (Math.random() - 0.5) * 160, t: 0, life: 0.45, r: 2, kind: 'spark' });
    }
    // the key to its keyhole
    if (st.carry) {
      const k = st.carry, d = st.doors.find(q => q.lock && q.need.includes(k.id));
      if (d) {
        const kx = (d.x0 + d.x1) / 2, ky = keyholeY(d);
        if (dist(cx, cy, kx - 18, ky) < SW.reach + 10 && (d.gold || k.gold || isLit(st, kx, ky))) {
          k.on = true; st.carry = null; st.stats.opened[p.id]++; st.progressT = 0;
          pop(st, kx, ky - 40, 'Unlocked!', C.gold, 22); Sfx.play('shipwreckUnlock');
        } else if (dist(cx, cy, kx - 18, ky) < SW.reach + 10 && P.noCD <= 0) { P.noCD = 1.6; pop(st, cx, p.y - 26, 'Too dark to find the keyhole!', '#bfe6ff', 14); }
      }
    }
  }
  const keyholeY = d => clamp((d.y0 + d.y1) / 2, d.y0 + 40, d.y1 - 40);
  function lanternTouch(st, p, dt) {
    const P = st.pl[p.id];
    P.noCD -= dt;
    if (p.pendingAct) {
      p.pendingAct = false;
      if (st.state === 'play' && G.introT <= SW.introHold && P.stunT <= 0) flash(st, p);
    }
    P.cd = Math.max(0, P.cd - dt);
    // the lantern can't carry: a nudge to let the grabber do it
    if (P.hintCD > 0) P.hintCD -= dt;
    const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
    if (P.hintCD <= 0 && st.state === 'play') {
      const g = st.gems.find(q => !q.got && dist(cx, cy, q.x, q.y) < SW.touchR && isLit(st, q.x, q.y));
      const k = Object.values(st.trig).find(q => q.kind === 'key' && !q.got && dist(cx, cy, q.x, q.y) < SW.touchR + 6 && isLit(st, q.x, q.y));
      if (g || k) { P.hintCD = 3; pop(st, cx, p.y - 26, (k ? 'A key! ' : 'Treasure! ') + NAMES[st.grabber] + ' grabs that', PCOL[st.grabber], 14); }
    }
  }
  function openChest(st, c) {
    c.open = true; c.t = 0;
    st.state = 'end'; st.endT = 0; st.stats.time = G.time;
    st.stats.secT[st.k] = G.time - st.segStart;
    pop(st, c.x, c.y - 110, 'The treasure!', C.gold, 32);
    Sfx.play('shipwreckWin');
  }

  /* ---------- doors and switches ---------- */
  function doorsStep(st, dt) {
    for (const tr of Object.values(st.trig)) {
      tr.t += dt;
      if (tr.kind === 'glow' && tr.gold && !tr.on && st.fish && dist(st.fish.x, st.fish.y, tr.x, tr.y) < SW.goldNear) { wake(st, tr); st.progressT = 0; }
      if (tr.kind === 'key' && tr.got && !tr.on) { const g = G.players[st.grabber]; tr.x = g.x + g.w / 2 + g.face * 12; tr.y = g.y + g.h / 2 + 4; }
      visStep(tr, tr.gold || (tr.kind === 'key' && tr.got) ? 1 : lightAt(st, tr.x, tr.y), dt);
    }
    for (const d of st.doors) {
      const ready = d.need.every(id => st.trig[id] && st.trig[id].on);
      if (ready && !d.opening) {
        d.opening = true; st.progressT = 0;
        pop(st, (d.x0 + d.x1) / 2, d.y0 + 30, 'The door opens!', C.gold, 22);
        Sfx.play('shipwreckDoor');
        bubbles(st, (d.x0 + d.x1) / 2, d.y1, 14);
      }
      if (d.opening) d.open = Math.min(1, d.open + dt * 0.9);
      visStep(d, lightAt(st, (d.x0 + d.x1) / 2, keyholeY(d)), dt);
    }
    for (const g of st.gems) { g.t += dt; visStep(g, g.got ? 0 : lightAt(st, g.x, g.y), dt); }
    if (st.chest) { st.chest.t += dt; visStep(st.chest, st.chest.gold ? 1 : lightAt(st, st.chest.x, st.chest.y), dt); }
  }

  /* ---------- what's next: the step the team is on and what each job does for it ---------- */
  function stepDone(st, s) {
    if (s.kind === 'door') return s.ref.opening;
    if (s.kind === 'puffer') return s.ref.state === 'leave' || s.ref.state === 'gone';
    if (s.kind === 'crate') return s.ref.done;
    if (s.kind === 'chest') return s.ref.open;
    return false;
  }
  const curStep = st => st.steps.find(s => !stepDone(st, s)) || null;
  // the thing needed right now: { kind, ref, x, y, step } (kind: lever wheel glow key keyDoor puffer crate exit chest)
  function need(st) {
    const s = curStep(st);
    if (!s) return { kind: 'exit', x: st.exitX + 60, y: 380 };
    if (s.kind === 'door') {
      for (const id of s.ref.need) {
        const tr = st.trig[id];
        if (!tr || tr.on) continue;
        if (tr.kind === 'key') {
          if (tr.got) { const d = s.ref; return { kind: 'keyDoor', ref: tr, door: d, x: (d.x0 + d.x1) / 2 - 18, y: keyholeY(d), step: s }; }
          return { kind: 'key', ref: tr, x: tr.x, y: tr.y, step: s };
        }
        return { kind: tr.kind, ref: tr, x: tr.x, y: tr.y, step: s };
      }
      return { kind: 'wait', ref: s.ref, x: s.ref.x0 - 40, y: (s.ref.y0 + s.ref.y1) / 2, step: s };
    }
    if (s.kind === 'puffer') return { kind: 'puffer', ref: s.ref, x: s.ref.x, y: s.ref.y, step: s };
    if (s.kind === 'crate') return { kind: 'crate', ref: s.ref, x: s.ref.x0, y: s.ref.y0 + s.ref.h / 2, step: s };
    if (s.kind === 'chest') return { kind: 'chest', ref: s.ref, x: s.ref.x, y: s.ref.y, step: s };
    return { kind: 'exit', x: st.exitX + 60, y: 380, step: s };
  }
  const forGrabber = k => k === 'lever' || k === 'wheel' || k === 'key' || k === 'keyDoor' || k === 'chest' || k === 'crate';

  /* ---------- gold help and hints ---------- */
  function goldNeed(st, nd) {
    const o = nd.kind === 'keyDoor' ? nd.door : nd.ref;
    if (!o || o.gold) return;
    o.gold = true;
    const say = {
      lever: 'Gold lever! It glows in the dark and works without light',
      wheel: 'Gold wheel! It glows in the dark and turns without light',
      key: 'Gold key! It glows in the dark: grab it!',
      keyDoor: 'Gold keyhole! It works even in the dark',
      glow: 'Gold anemone! It wakes up when Glimmer swims close',
      puffer: 'Gold pufferfish! It swims away when Glimmer comes close',
      crate: 'Gold crate! It slides much more easily now',
      chest: 'Gold chest! It opens even in the dark',
    }[nd.kind];
    if (say) news(st, say, true, 5.5);
    st.goldUsed.push(nd.kind);
    pop(st, nd.x, nd.y - 50, 'Gold help!', C.gold, 22);
    Sfx.play('shipwreckGold');
  }
  function help(st, dt) {
    const nd = need(st), keyNow = nd.kind + ':' + (nd.ref ? (nd.ref.id || nd.ref.x0 || nd.ref.hx || nd.ref.x) : '');
    if (keyNow !== st.needKey) { st.needKey = keyNow; st.needT = 0; }
    const away = awayFor(10);
    if (!away && nd.kind !== 'exit' && nd.kind !== 'wait') { st.needT += dt; if (st.needT > SW.goldSlow) { goldNeed(st, nd); st.needT = -1e9; } }
    st.progressT += dt;
    if (st.progressT > SW.stuckHint && st.state === 'play' && !away) {
      st.progressT = 0;
      for (const id of [st.grabber, st.lantern].filter(i => !isCpu(i))) {
        const j = job(st, id), tx = j && jobText(st, id, j);
        if (tx && tx[0]) { news(st, 'Hint for ' + NAMES[id] + ': ' + tx[0], true, 5); st.stats.hints++; break; }
      }
    }
  }
  function news(st, s, gold, life) { st.news = { s, gold: !!gold, t: 0, life: life || SW.newsLife }; }
  function pop(st, x, y, s, col, size) { st.pops.push({ x, y, s, col: col || C.gold, size: size || 18, t: 0 }); if (st.pops.length > 14) st.pops.shift(); }
  function bubbles(st, x, y, n) { for (let i = 0; i < n; i++) st.parts.push({ x: x + (Math.random() - 0.5) * 20, y: y + (Math.random() - 0.5) * 16, vx: (Math.random() - 0.5) * 90, vy: -50 - Math.random() * 90, t: 0, life: 0.9 + Math.random() * 0.5, r: 2 + Math.random() * 4, kind: 'bub' }); }

  // what each player should do now (the chips over the heads and the stuck hint)
  const wx = (st, p) => p.x + p.w / 2 + (st.inTick ? 0 : st.camX);
  const wy = p => p.y + p.h / 2;
  function job(st, id) {
    if (st.state !== 'play') return null;
    const p = G.players[id], P = st.pl[id], nd = need(st);
    const x = wx(st, p), y = wy(p), lantern = id === st.lantern;
    const lit = nd.ref ? usable(st, nd.kind === 'keyDoor' ? nd.door : nd.ref, nd.x, nd.y) : false;
    const d = dist(x, y, nd.x, nd.y);
    if (nd.kind === 'exit') return x > st.exitX + 20 ? { k: 'waitExit' } : { k: 'toExit' };
    if (nd.kind === 'wait') return { k: 'toExit' };
    if (lantern) {
      if (nd.kind === 'glow' || nd.kind === 'puffer') {
        if (st.fish && dist(st.fish.x, st.fish.y, nd.x, nd.y) < SW.flashReach - 30) return P.cd > 0 ? { k: 'flashWait' } : { k: nd.kind === 'glow' ? 'flashGlow' : 'flashPuffer' };
        return { k: nd.kind === 'glow' ? 'toGlow' : 'toPuffer' };
      }
      if (nd.kind === 'crate') return { k: 'lightCrate' };
      if (lit && !nd.ref.gold) return { k: 'keepLight' };
      return { k: 'lightWay' };
    }
    // the grabber
    if (nd.kind === 'glow' || nd.kind === 'puffer') return { k: 'waitFlash' };
    if (nd.kind === 'crate') return { k: 'push' };
    const known = nd.ref && (nd.ref.seen || nd.ref.gold || lit);
    if (!known) return { k: 'dark' };
    if (nd.kind === 'key') return lit ? { k: 'getKey' } : { k: 'tooDark' };
    if (nd.kind === 'keyDoor') return lit || nd.door.gold ? { k: 'toLock' } : { k: 'tooDarkLock' };
    if (d > SW.reach + (nd.kind === 'chest' ? 20 : 0)) return lit ? { k: 'goTo', what: nd.kind } : { k: 'tooDark' };
    if (!lit) return { k: 'tooDark' };
    return { k: nd.kind === 'lever' ? 'pull' : nd.kind === 'chest' ? 'openChest' : 'turn', hold: P.hold };
  }
  function jobText(st, id, j) {
    const o = 1 - id, nm = NAMES[o], a = key(id, 'act');
    const what = { lever: 'lever', wheel: 'wheel', chest: 'chest' }[j.what] || 'lever';
    switch (j.k) {
      case 'lightWay': return ['Light the way for ' + nm + '!', 'Hidden things show in Glimmer’s light'];
      case 'keepLight': return ['Keep Glimmer near ' + nm, nm + ' can only grab in the light'];
      case 'lightCrate': return ['Swim along with ' + nm, nm + ' pushes the crate'];
      case 'toGlow': return ['Find the sleepy anemone', 'It glows softly in the dark'];
      case 'toPuffer': return ['Swim to the grumpy pufferfish', 'Then flash it away'];
      case 'flashGlow': return ['Press ' + a + ': flash!', 'Wake the sleepy anemone'];
      case 'flashPuffer': return ['Press ' + a + ': flash!', 'Shoo the pufferfish away'];
      case 'flashWait': return ['Glimmer is charging...', 'Flash again in a moment'];
      case 'waitFlash': return ['Wait for ' + nm + '’s flash', nm + ' shines Glimmer'];
      case 'push': return ['Push the crate ▶', 'Swim into its side'];
      case 'dark': return ['Stay in Glimmer’s light', 'Look for a lever, a wheel or a key'];
      case 'tooDark': return ['Too dark! Wait for the light', nm + ' brings Glimmer'];
      case 'tooDarkLock': return ['Find the keyhole in the light', 'Swim to the door with ' + nm];
      case 'getKey': return ['Grab the key!', 'Swim into it'];
      case 'toLock': return ['Take the key to the door!', 'Swim to the gold keyhole'];
      case 'goTo': return ['Swim to the ' + what + '!', ''];
      case 'pull': return ['Press ' + a + ': pull the lever!', ''];
      case 'turn': return ['Hold ' + a + ': turn the wheel!', 'Keep holding'];
      case 'openChest': return ['Hold ' + a + ': open the chest!', 'Keep holding'];
      case 'toExit': return ['Swim on ▶ together', ''];
      case 'waitExit': return ['Wait here for ' + nm, ''];
      default: return null;
    }
  }

  /* ---------- the camera, the leash, the rest ---------- */
  function camera(st, dt, snap) {
    const xs = G.players.map(p => wx(st, p));
    let tx = (xs[0] + xs[1]) / 2 - W / 2 + 40;
    if (st.state === 'end' && st.chest) tx = st.chest.x - W / 2;
    tx = clamp(tx, 0, Math.max(0, st.len - W));
    const lo = Math.min(xs[0], xs[1]), hi = Math.max(xs[0], xs[1]);
    tx = Math.min(tx, lo - 50); tx = Math.max(tx, hi + 50 - W);
    tx = clamp(tx, 0, Math.max(0, st.len - W));
    st.camX = snap ? tx : st.camX + (tx - st.camX) * Math.min(1, dt * 4);
  }
  function leash(st, xb, yb) {
    for (const p of G.players) {
      const o = G.players[1 - p.id];
      if (Math.abs(p.x - o.x) <= SW.maxSep) continue;
      if (Math.abs(p.x - o.x) <= Math.abs(xb[p.id] - o.x)) continue;
      p.x = xb[p.id]; p.vx = 0;
      // (if this step's up/down move only fitted at the new x, it goes back too: the swimmer used to be left 1 px inside a
      // wall corner, and the next step threw them right across the wall)
      if (yb && solids(st).some(s => hit(p, s))) { p.y = yb[p.id]; p.vy = 0; }
      const P = st.pl[p.id];
      if (P.waitCD <= 0) {
        P.waitCD = 3.5;
        pop(st, p.x + p.w / 2, p.y - 26, 'Wait for ' + NAMES[o.id] + '!', PCOL[o.id], 16);
        if (typeof cpuSay === 'function' && cpuOn(o.id)) cpuSay(o, 'Wait for me!');
      }
    }
  }
  // every person (not the computer) has pressed nothing for s seconds. (In 2-player mode a lantern who keeps still,
  // holding the light on a lever for a partner, is playing well: the clock, hints and gold help carry on for them.)
  function awayFor(s) {
    if (typeof CPU === 'undefined') return false;
    const ppl = [0, 1].filter(id => !cpuOn(id));
    return ppl.length > 0 && ppl.every(id => CPU.idle[id] > s);
  }
  function restStep(st, dt) {
    const away = awayFor(SW.idleRest);
    st.rest = away && st.state === 'play' && G.introT <= 0;
    if (st.rest) G.time -= dt;   // the clock waits for a person who stopped to rest
  }

  /* ---------- the tick (ownStep) ---------- */
  function stepAll(st, dt) {
    const ps = G.players;
    for (const p of ps) p.x += st.camX;
    st.inTick = true;
    const n0 = G.particles.length;
    try { tick(st, dt); } finally {
      st.inTick = false;
      for (const p of ps) p.x -= st.camX;
      for (let i = n0; i < G.particles.length; i++) G.particles[i].x -= st.camX;
    }
  }
  function fx(st, dt) {
    for (const q of st.pops) q.t += dt;
    st.pops = st.pops.filter(q => q.t < 1.4);
    if (st.news) { st.news.t += dt; if (st.news.t > st.news.life) st.news = null; }
    for (const q of st.parts) {
      q.t += dt; q.x += q.vx * dt; q.y += q.vy * dt;
      if (q.kind === 'bub') { q.vx *= 0.97; q.vy = Math.max(q.vy - 30 * dt, -70); q.x += Math.sin(q.t * 7 + q.r) * 0.4; if (q.y < SW.ceil + 4) q.t = q.life; }
      else { q.vx *= 0.94; q.vy *= 0.94; }
    }
    st.parts = st.parts.filter(q => q.t < q.life);
    if (st.parts.length > 300) st.parts.splice(0, st.parts.length - 300);
    for (const dc of st.decor) dc.t += dt;
  }
  function tick(st, dt) {
    const ps = G.players;
    st.tick++; st.t += dt;
    fx(st, dt);
    fishStep(st, dt);
    if (st.state === 'clear' || st.state === 'end') {
      for (const p of ps) { p.pendingAct = false; p.pendingJump = false; swim(st, p, dt); }
      doorsStep(st, dt); hazardsStep(st, dt); crateStep(st, dt);
      if (st.state === 'clear') {
        st.clearT += dt;
        // both drift on through the door
        for (const p of ps) { p.vx = Math.max(p.vx, 90); }
        if (st.clearT >= SW.clearT) st.goNext = true;
      } else endStep(st, dt);
      camera(st, dt);
      return;
    }
    if (G.introT > SW.introHold) { for (const p of ps) { p.pendingAct = false; p.pendingJump = false; } doorsStep(st, dt); hazardsStep(st, dt); camera(st, dt); return; }
    if (!st.started) { st.started = true; if (st.room.news) news(st, st.room.news, false, 5); }
    restStep(st, dt);
    for (const p of ps) st.pl[p.id].waitCD -= dt;
    lanternTouch(st, ps[st.lantern], dt);
    grabber(st, ps[st.grabber], dt);
    const xb = ps.map(p => p.x), yb = ps.map(p => p.y);
    for (const p of ps) swim(st, p, dt);
    leash(st, xb, yb);
    crateStep(st, dt);
    doorsStep(st, dt);
    hazardsStep(st, dt);
    for (const p of ps) p.pendingJump = false;
    // the exit: both through the far door
    const nd = need(st);
    if (nd.kind === 'exit' && ps.every(p => p.x > st.exitX)) {
      st.state = 'clear'; st.clearT = 0;
      st.stats.secT[st.k] = G.time - st.segStart;
      pop(st, st.exitX + 80, 200, 'Section clear!', C.gold, 30);
      Sfx.play('shipwreckClear');
      for (let i = 0; i < 26; i++) confetti(st.exitX + 60, 220);
    }
    help(st, dt);
    camera(st, dt);
  }
  // the treasure chest is open: gold everywhere, then the results
  function endStep(st, dt) {
    st.endT += dt;
    const c = st.chest;
    if (c && Math.random() < dt * 10) confetti(c.x + (Math.random() - 0.5) * 300, 140);
    if (c && Math.random() < dt * 24) st.parts.push({ x: c.x + (Math.random() - 0.5) * 50, y: c.y - 20, vx: (Math.random() - 0.5) * 240, vy: -160 - Math.random() * 160, t: 0, life: 1.1, r: 3 + Math.random() * 3, kind: 'coin' });
    if (st.endT >= SW.finT && !st.cleared) {
      st.cleared = true;
      G.level.goal = { x: c ? c.x : W / 2, y: 300 };   // (world x: the tick moves new particles on screen)
      levelClear();
    }
  }

  /* ---------- action labels: each player's touch button and legend show their own job ---------- */
  let labelEls = null;
  function actLabels(st) {
    try {
      if (!labelEls || !labelEls.every(o => document.contains(o.el))) labelEls = Array.from(document.querySelectorAll('[data-actlabel]')).map(el => {
        const box = el.closest('[data-p]') || el.closest('[data-legp]') || el.closest('.kb-only') || el.closest('.pad-only');
        const id = box && box.dataset.p !== undefined ? +box.dataset.p : box && box.dataset.legp !== undefined ? +box.dataset.legp : -1;
        return { el, id };
      });
      const word = id => (id < 0 ? 'flash / grab' : id === st.lantern ? 'flash' : 'grab');
      let changed = false;
      for (const o of labelEls) { const want = word(o.id); if (o.el.textContent !== want) { o.el.textContent = want; changed = true; } }
      if (changed && typeof fitActLabels === 'function') fitActLabels();
    } catch (e) { /* labels stay as the framework set them */ }
  }

  /* ---------- a section (room) ---------- */
  function room(st, L, k) {
    const def = L.def;
    st.k = k; st.room = def; st.final = k === (def.roomCount || 1) - 1;
    st.lantern = def.lantern || 0; st.grabber = 1 - st.lantern; st.look = def.look || 'hold';
    compile(st, def);
    st.parts = []; st.pops = []; st.news = null; st.carry = null; st.fish = null; st.flashT = null;
    st.state = 'play'; st.goNext = false; st.clearT = 0; st.endT = 0; st.started = false; st.progressT = 0; st.segStart = G.time;
    st.secBonks = 0; st.allGold = false; st.needKey = ''; st.needT = 0; st.t = 0; st.rest = false;
    st.stats.gemsAll += st.gems.length;
    st.pl = [0, 1].map(() => ({ stunT: 0, safeT: 0, pushT: 0, cd: 0, noCD: 0, hintCD: 0, hold: null, armT: 0, waitCD: 0, chipKey: '', chipAt: 0, swimT: 0 }));
    const sx = [], sy = [];
    sx[st.lantern] = 150; sy[st.lantern] = 300; sx[st.grabber] = 80; sy[st.grabber] = 340;
    G.players.forEach((p, i) => {
      const input = p.input;
      Object.assign(p, makePlayer(i), { x: sx[i] - PW / 2, y: sy[i] - PH / 2, face: 1, input, prevJump: true, prevAct: true });
    });
    st.camX = 0;
    st.inTick = true; fishStep(st, 0); camera(st, 0, true); st.inTick = false;
    for (const p of G.players) p.x -= st.camX;
    actLabels(st);
  }
  function setup(st, L) {
    st.stats = { bonks: [0, 0], gems: [0, 0], flashes: [0, 0], opened: [0, 0], gemsAll: 0, hints: 0, time: 0, secT: [] };
    st.goldUsed = []; st.tick = 0;
    room(st, L, 0);
  }
  function medalOf(st) {
    const s = st.stats, b = s.bonks[0] + s.bonks[1], g = s.gems[0] + s.gems[1], t = s.time || G.time;
    return t <= 225 && b <= 5 && g >= s.gemsAll * 0.6 ? 'Gold' : t <= 330 && b <= 14 ? 'Silver' : 'Bronze';
  }

  MODES.shipwreck = {
    SW,
    medals: { bronze: 'Find the treasure chest', goals: [{ key: 'time', gold: 225, silver: 330 }, { key: 'bonks', gold: 5, silver: 14, word: 'bonk' }, { key: 'treasure', gold: 0.6, more: true, pct: true, word: 'the treasure' }] },
    medalValues() { const s = G.mst.stats; return s ? { time: s.time || G.time, bonks: s.bonks[0] + s.bonks[1], treasure: (s.gems[0] + s.gems[1]) / (s.gemsAll || 1) } : {}; },
    need, curStep, solids, isLit, lightAt, lightRad, wx, reachable, job, jobText, medalOf,
    setup(st, L) { setup(st, L); },
    room(k, L) { room(G.mst, L, k); },
    step(dt) {
      const st = G.mst;
      if (!st.walls) return;
      stepAll(st, dt);
      if (st.goNext) {
        st.goNext = false;
        const L = G.level;
        if (L.def.rooms && L.def.roomIndex < L.def.roomCount - 1) nextRoom(); else levelClear();
        return;
      }
      if (st.tick % 15 === 0) actLabels(st);
    },
    draw() { const st = G.mst; if (st.walls) drawWorld(st); },
    drawTop() { const st = G.mst; if (st.walls) drawTop(st); },
    hud() { const st = G.mst; if (st.walls) drawHud(st); },
    stats() {
      const st = G.mst, s = st.stats;
      if (!s) return [];
      const b = s.bonks[0] + s.bonks[1], g = s.gems[0] + s.gems[1];
      const words = b === 0 ? 'Not one bonk! Brilliant lights and quick claws!' : b <= 5 ? 'Light, grab, swim: lovely teamwork in the dark!' : 'A few bonks, and you found the treasure together!';
      const goldNames = { prickly: 'Gold coral', lever: 'Gold lever', wheel: 'Gold wheel', key: 'Gold key', keyDoor: 'Gold keyhole', glow: 'Gold anemone', puffer: 'Gold pufferfish', crate: 'Gold crate', chest: 'Gold chest' };
      const gold = st.goldUsed.length ? ' · Gold help: ' + [...new Set(st.goldUsed.map(k => goldNames[k] || 'Gold'))].join(', ') : '';
      return [
        { label: 'Bonks', values: s.bonks.slice() },
        { label: 'Treasure grabbed', values: s.gems.slice() },
        { label: 'Flashes', values: s.flashes.slice() },
        words + ' Treasure: ' + g + ' of ' + s.gemsAll + gold,
      ];
    },
  };

  /* ===================================== drawing ===================================== */
  const LOOK = {
    hold: { wall: '#5f8fa0', wall2: '#578797', rib: '#3f6d7e', wood: '#a0744a', woodD: '#77522f', woodE: '#5a3b20', floor: '#c7a46a', floorD: '#9c7c48', accent: '#e9c46a' },
    galley: { wall: '#6a98a0', wall2: '#628f97', rib: '#476f78', wood: '#a87a4e', woodD: '#7c5632', woodE: '#5c3e22', floor: '#d2b07a', floorD: '#a58550', accent: '#f2a65a' },
    cabin: { wall: '#7d84b0', wall2: '#757ca8', rib: '#585e8c', wood: '#9c6a48', woodD: '#734a2e', woodE: '#55361f', floor: '#c49a6c', floorD: '#987044', accent: '#ff9fb5' },
    treasure: { wall: '#4f93a6', wall2: '#488b9e', rib: '#33707f', wood: '#a37a48', woodD: '#7a5530', woodE: '#5a3c1f', floor: '#e2c27a', floorD: '#b8984e', accent: '#ffd36b' },
  };
  const lookOf = st => LOOK[st.look] || LOOK.hold;
  const onScreen = (st, x, pad = 120) => x > st.camX - pad && x < st.camX + W + pad;

  function drawWorld(st) {
    const t = G.clock, lk = lookOf(st);
    drawBack(st, lk, t);
    ctx.save(); ctx.translate(-st.camX, 0);
    for (const dc of st.decor) if (onScreen(st, dc.x, 160)) drawDecor(st, dc, lk, t);
    for (const s of st.walls) if (s.x1 > st.camX - 40 && s.x0 < st.camX + W + 40) drawWall(st, s, lk);
    for (const d of st.doors) if (onScreen(st, d.x0)) drawDoor(st, d, lk, t);
    drawExit(st, lk, t);
    for (const c of st.crates) if (onScreen(st, c.x0)) drawCrate(c, lk);
    // the hidden things, faded in by the light
    for (const tr of Object.values(st.trig)) if (onScreen(st, tr.x) && tr.kind !== 'glow' && tr.vis > 0.01 && !(tr.kind === 'key' && (tr.got || tr.on))) { ctx.save(); ctx.globalAlpha = tr.vis; drawTrig(st, tr, t); ctx.restore(); }
    for (const g of st.gems) if (!g.got && g.vis > 0.01 && onScreen(st, g.x)) { ctx.save(); ctx.globalAlpha = g.vis; drawGem(g, t); ctx.restore(); }
    for (const h of st.hazards) if (h.vis > 0.01 && onScreen(st, h.x)) { ctx.save(); ctx.globalAlpha = h.vis; drawHazard(h, t); ctx.restore(); }
    if (st.chest) { ctx.save(); ctx.globalAlpha = Math.max(0.0, st.chest.vis); drawChest(st, st.chest, t); ctx.restore(); }
    ctx.restore();
    drawDark(st, t);
    drawSigns(st);
  }
  function drawBack(st, lk, t) {
    // the hull's back wall: planks, ribs and portholes (a touch of parallax)
    ctx.fillStyle = lk.wall; ctx.fillRect(0, 0, W, H);
    const px = st.camX * 0.85;
    for (let y = SW.ceil - 6, r = 0; y < SW.floor; y += 30, r++) {
      ctx.fillStyle = r % 2 ? lk.wall2 : lk.wall; ctx.fillRect(0, y, W, 30);
      ctx.fillStyle = 'rgba(20,40,60,0.18)'; ctx.fillRect(0, y + 28, W, 2);
      const off = ((r * 97) % 180) - (px % 180);
      for (let x = off - 180; x < W + 180; x += 180) ctx.fillRect(x, y, 2, 30);
      // grain and nails on each plank
      ctx.fillStyle = 'rgba(20,40,60,0.1)';
      for (let x = off - 180; x < W + 180; x += 180) { const h = hash(r, Math.round((x - off) / 180) + Math.floor(px / 180)); ctx.fillRect(x + 20 + (h % 40), y + 9 + (h % 8), 60 + (h % 50), 1.5); ctx.fillRect(x + 90 + (h % 30), y + 18 + (h % 6), 40 + (h % 30), 1.5); }
      ctx.fillStyle = 'rgba(230,200,140,0.22)';
      for (let x = off - 180; x < W + 180; x += 180) { circle(x + 7, y + 8, 1.6); ctx.fill(); circle(x + 7, y + 22, 1.6); ctx.fill(); }
    }
    if (st.look === 'cabin') { // wallpaper dots
      ctx.fillStyle = 'rgba(255,220,240,0.12)';
      for (let y = SW.ceil + 20; y < SW.floor - 40; y += 40) for (let x = -((px * 1) % 40); x < W; x += 40) { circle(x + ((y / 40) % 2) * 20, y, 4); ctx.fill(); }
    }
    for (let k = Math.floor(px / 260) - 1; k < Math.floor(px / 260) + 6; k++) {
      const x = k * 260 - px;
      ctx.fillStyle = lk.rib; ctx.fillRect(x, SW.ceil - 10, 22, SW.floor - SW.ceil + 10);
      ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(x + 3, SW.ceil, 4, SW.floor - SW.ceil);
    }
    // little fish far behind (seen through the gloom)
    for (let k = 0; k < 5; k++) {
      const span = W + 200, x = ((k * 233 + t * (14 + k * 3) - st.camX * 0.3) % span + span) % span - 100, y = 160 + (k * 61) % 260;
      ctx.fillStyle = 'rgba(200,240,255,0.18)';
      ctx.beginPath(); ctx.ellipse(x, y, 9, 4.5, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x - 8, y); ctx.lineTo(x - 15, y - 5); ctx.lineTo(x - 15, y + 5); ctx.fill();
    }
    // portholes on the back wall
    ctx.save(); ctx.translate(-st.camX, 0);
    for (const q of st.ports) if (onScreen(st, q.x)) {
      ctx.fillStyle = '#b8892e'; circle(q.x, q.y, 27); ctx.fill();
      ctx.fillStyle = '#e8c35a'; circle(q.x, q.y, 23); ctx.fill();
      const g = ctx.createRadialGradient(q.x - 6, q.y - 6, 2, q.x, q.y, 20); g.addColorStop(0, '#d9fbff'); g.addColorStop(1, '#4fc3dd');
      ctx.fillStyle = g; circle(q.x, q.y, 19); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.ellipse(q.x - 7, q.y - 7, 6, 3, -0.7, 0, TAU); ctx.fill();
      // a fish swims past outside
      const fx = q.x - 16 + ((t * 9 + q.x) % 40);
      ctx.fillStyle = '#ffb35c'; ctx.beginPath(); ctx.ellipse(fx, q.y + 5, 4, 2.5, 0, 0, TAU); ctx.fill();
      for (let a = 0; a < 6; a++) { ctx.fillStyle = '#8a6420'; circle(q.x + Math.cos(a / 6 * TAU) * 25, q.y + Math.sin(a / 6 * TAU) * 25, 1.8); ctx.fill(); }
    }
    ctx.restore();
    // the ceiling beams and the floor
    ctx.fillStyle = lk.woodE; ctx.fillRect(0, 0, W, SW.ceil);
    for (let x = -(((st.camX % 140) + 140) % 140); x < W; x += 140) ERICH.put('swbeam' + st.look, 144, 30, 2, 2, c => {
      ERICH.board(c, 0, 0, 140, 22, { col: lk.woodD, seed: 600, r: 0, nails: false, lw: 1.2, edge: lk.woodE });
      c.fillStyle = lk.wood; c.fillRect(0, 0, 140, 5); c.fillStyle = 'rgba(255,255,255,0.18)'; c.fillRect(0, 0, 140, 1.5);
      c.fillStyle = lk.woodE; c.fillRect(0, 0, 3, 22);
      c.fillStyle = 'rgba(10,6,0,0.3)'; c.fillRect(0, 22, 140, 4);
      ERICH.rivets(c, [[12, 11], [128, 11]], 2.4, '#d9b45a');
    }, x, SW.ceil - 22);
    const fh = H - SW.floor, fx0 = -(((st.camX % 240) + 240) % 240);
    for (let x = fx0; x < W; x += 240) ERICH.put('swfloor' + st.look, 244, fh + 4, 2, 2, c => {
      c.fillStyle = lk.floorD; c.fillRect(0, 0, 240, fh);
      const rows = [[0, 9, lk.floor], [9, 20, mixCol(lk.floor, lk.floorD, 0.45)], [29, 18, lk.floorD], [47, fh - 47, shade(lk.floorD, 0.12)]];
      rows.forEach(([y, hh, col], i) => {
        const joint = i % 2 ? 60 : 180;
        if (i === 0) { ERICH.board(c, -4, y, 248, hh, { col, seed: 500 + i, r: 0, nails: false, lw: 1, edge: lk.woodE, knots: 0 }); return; }
        ERICH.board(c, -4, y, joint + 4, hh, { col, seed: 510 + i, r: 0, nails: false, lw: 1, edge: lk.woodE, knots: i === 2 ? 1 : 0 });
        ERICH.board(c, joint, y, 244 - joint, hh, { col: mixCol(col, lk.floorD, 0.1), seed: 520 + i, r: 0, nails: false, lw: 1, edge: lk.woodE, knots: i === 3 ? 1 : 0 });
        ERICH.nails(c, [[joint + 5, y + Math.min(hh / 2, 9)], [joint - 5, y + Math.min(hh / 2, 9)]], 1.5);
      });
      c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(0, 0, 240, 1.5);
      c.fillStyle = 'rgba(20,10,0,0.25)'; c.fillRect(0, 9, 240, 2);
    }, x, SW.floor);
    // sand drifts and seaweed tufts on the floor
    for (let k = Math.floor(st.camX / 170) - 1; k < Math.floor(st.camX / 170) + 8; k++) {
      const x = k * 170 - st.camX + (hash(k, 5) % 60), h = hash(k, 9);
      ctx.fillStyle = '#e8d29a'; ctx.beginPath(); ctx.ellipse(x, SW.floor + 2, 40 + h % 30, 7, 0, Math.PI, TAU); ctx.fill();
      if (h % 3 === 0) {
        ctx.strokeStyle = '#4fae7a'; ctx.lineWidth = 4; ctx.lineCap = 'round';
        for (let s = 0; s < 3; s++) { const sx = x + 20 + s * 7; ctx.beginPath(); ctx.moveTo(sx, SW.floor + 2); ctx.quadraticCurveTo(sx + Math.sin(t * 1.5 + s + k) * 8, SW.floor - 20, sx + Math.sin(t * 1.2 + s) * 5, SW.floor - 36 - s * 6); ctx.stroke(); }
      }
    }
  }
  function drawWall(st, s, lk) {
    const w = Math.round(s.x1 - s.x0), h = Math.round(s.y1 - s.y0);
    // every wall is drawn once into a picture (all its planks, bands, rivets, barnacles and moss) and copied
    if (s.look === 'table') {
      ERICH.put('swtable' + st.look + w + 'x' + h + ':' + (SW.floor - s.y1), w + 12, SW.floor - s.y0 + 12, 6, 4, c => paintTable(c, w, h, SW.floor - s.y1, lk, s.x0 | 0), s.x0, s.y0);
      return;
    }
    ERICH.put('swwall' + st.look + s.look + ':' + (s.x0 | 0) + ':' + w + 'x' + h, w + 12, h + 12, 6, 6, c => {
      if (s.look === 'crates') paintCrates(c, w, h, lk, s.x0 | 0);
      else if (s.look === 'pipe') paintPipe(c, w, h, s.x0 | 0);
      else paintTimber(c, w, h, lk, s.x0 | 0);
    }, s.x0, s.y0);
  }
  // timber: planks with grain and knots, iron bands with rivets and rust streaks, barnacles and moss
  function paintTimber(c, w, h, lk, seed) {
    const vertical = h > w, F = ERICH.fr;
    c.fillStyle = lk.woodE; c.fillRect(0, 0, w, h);
    if (vertical) { const n = Math.max(1, Math.round(w / 12)), bw = w / n; for (let i = 0; i < n; i++) ERICH.board(c, i * bw + 0.5, 0, bw - 1, h, { col: i % 2 ? lk.wood : mixCol(lk.wood, lk.woodD, 0.25), seed: seed + i, vert: true, r: 1, nails: false, lw: 1, edge: lk.woodE }); }
    else { const n = Math.max(1, Math.round(h / 14)), bh = h / n; for (let i = 0; i < n; i++) ERICH.board(c, 0, i * bh + 0.5, w, bh - 1, { col: i % 2 ? lk.wood : mixCol(lk.wood, lk.woodD, 0.25), seed: seed + i, r: 1, nails: false, lw: 1, edge: lk.woodE }); }
    // the iron bands
    const bands = [];
    if (vertical) for (let y = 30; y < h - 10; y += 90) bands.push(y); else for (let x = 30; x < w - 10; x += 90) bands.push(x);
    for (const b of bands) {
      if (vertical) {
        const rg = c.createLinearGradient(0, b + 8, 0, b + 30); rg.addColorStop(0, 'rgba(150,80,40,0.4)'); rg.addColorStop(1, 'rgba(150,80,40,0)');
        c.fillStyle = rg; c.fillRect(2, b + 8, w - 4, 22);
        ERICH.metal(c, -1, b, w + 2, 8, { col: '#6c7684', seed: b, r: 1, rivets: false, lw: 1.2 });
        ERICH.rivets(c, [[5, b + 4], [w / 2, b + 4], [w - 5, b + 4]], 1.6, '#d9b45a');
      } else {
        ERICH.metal(c, b, -1, 8, h + 2, { col: '#6c7684', seed: b, r: 1, rivets: false, lw: 1.2 });
        ERICH.rivets(c, [[b + 4, 5], [b + 4, h / 2], [b + 4, h - 5]], 1.6, '#d9b45a');
      }
    }
    // barnacle clusters and moss patches
    for (let k = 0; k < Math.max(2, Math.floor((w + h) / 60)); k++) {
      const hx = hash(seed, k + 3), px = 4 + hx % Math.max(1, w - 8), py = 4 + (hx >>> 8) % Math.max(1, h - 8);
      if (k % 2) {
        c.fillStyle = '#3f7a52'; c.beginPath(); c.ellipse(px + 1, py + 1.5, 6 + hx % 4, 3.5, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#6cb87a'; c.beginPath(); c.ellipse(px, py, 5 + hx % 4, 2.8, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#b8f0b0'; c.beginPath(); c.arc(px - 2, py - 1, 1.1, 0, Math.PI * 2); c.fill();
      } else for (let i = 0; i < 3; i++) {
        const ax = px + (F(hx, i) - 0.5) * 9, ay = py + (F(hx, i + 5) - 0.5) * 7, br = 1.6 + F(hx, i + 9) * 1.4;
        c.fillStyle = '#e6dfcc'; c.beginPath(); c.arc(ax, ay, br, 0, Math.PI * 2); c.fill();
        c.strokeStyle = '#7a7262'; c.lineWidth = 0.7; c.stroke();
        c.fillStyle = '#4a4238'; c.beginPath(); c.arc(ax, ay, br * 0.35, 0, Math.PI * 2); c.fill();
      }
    }
    c.fillStyle = 'rgba(255,255,255,0.08)'; if (vertical) c.fillRect(1, 0, 3, h); else c.fillRect(0, 1, w, 3);
    c.strokeStyle = shade(lk.woodE, 0.2); c.lineWidth = 2; c.strokeRect(1, 1, w - 2, h - 2);
  }
  // a stack of cargo crates: each one framed, braced and nailed, some with a stencilled anchor or arrow
  function paintCrates(c, w, h, lk, seed) {
    c.fillStyle = lk.woodE; c.fillRect(0, 0, w, h);
    const n = Math.max(1, Math.round(w / 60)), cw = w / n, rows = Math.max(1, Math.round(h / 60)), ch = h / rows;
    for (let i = 0; i < n; i++) for (let j = 0; j < rows; j++) {
      const x = i * cw, y = j * ch, hs = hash(seed + i, j);
      ERICH.crate(c, x + 2, y + 2, cw - 4, ch - 4, { col: (i + j) % 2 ? lk.wood : '#ad8152', seed: hs % 997, flip: (i + j) % 2 === 1 });
      if (hs % 3 === 0) { // a stencilled anchor
        const sx = x + cw * 0.5, sy = y + ch * 0.5;
        c.strokeStyle = 'rgba(40,24,10,0.45)'; c.lineWidth = 2; c.lineCap = 'round';
        c.beginPath(); c.moveTo(sx, sy - 8); c.lineTo(sx, sy + 8); c.moveTo(sx - 5, sy - 4); c.lineTo(sx + 5, sy - 4); c.moveTo(sx - 8, sy + 3); c.quadraticCurveTo(sx, sy + 12, sx + 8, sy + 3); c.stroke();
        c.beginPath(); c.arc(sx, sy - 10, 2.2, 0, Math.PI * 2); c.stroke();
      }
      // a dark gap under each crate
      c.fillStyle = 'rgba(15,10,5,0.35)'; c.fillRect(x + 4, y + ch - 2, cw - 8, 2);
    }
  }
  // the galley table: a thick top with grain and nails, two legs and a shadow
  function paintTable(c, w, h, legH, lk, seed) {
    for (const lx of [10, w - 20]) { c.fillStyle = 'rgba(10,16,30,0.25)'; c.beginPath(); c.ellipse(lx + 5, h + legH, 9, 2.5, 0, 0, Math.PI * 2); c.fill(); ERICH.board(c, lx, h - 1, 10, legH + 1, { col: lk.woodD, seed: seed + lx, vert: true, r: 1, nails: false, lw: 1.2, edge: lk.woodE }); }
    c.fillStyle = 'rgba(10,16,30,0.3)'; c.fillRect(6, h, w - 12, 5);
    ERICH.board(c, 0, 0, w, h, { col: lk.wood, seed: seed, r: 4, lw: 2, edge: lk.woodE, knots: 1 });
    c.fillStyle = 'rgba(255,255,255,0.18)'; c.fillRect(4, 1.5, w - 8, 2);
  }
  // a big pipe: a rounded metal tube with a cylinder sheen, flanges with bolts and rust streaks
  function paintPipe(c, w, h, seed) {
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#a6b4c2'); g.addColorStop(0.3, '#8a9aac'); g.addColorStop(0.75, '#66778a'); g.addColorStop(1, '#4e5c6c');
    c.fillStyle = g; rrOn(c, 0, 0, w, h, Math.min(8, h / 2)); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.3)'; rrOn(c, 4, h * 0.14, w - 8, Math.max(2, h * 0.1), 2); c.fill();
    for (let x = 20; x < w - 10; x += 60) {
      const rg = c.createLinearGradient(0, 0, 0, h); rg.addColorStop(0, 'rgba(160,80,40,0)'); rg.addColorStop(1, 'rgba(160,80,40,0.35)');
      c.fillStyle = rg; c.fillRect(x + 8, 0, 14 + hash(seed, x) % 10, h);
      ERICH.metal(c, x - 2, -2, 12, h + 4, { col: '#6c7a8c', seed: x, r: 2, rivets: false, lw: 1.2 });
      ERICH.rivets(c, [[x + 4, 3], [x + 4, h - 3]], 1.5, '#b8c2d0');
    }
    c.strokeStyle = '#3e4a58'; c.lineWidth = 2; rrOn(c, 0, 0, w, h, Math.min(8, h / 2)); c.stroke();
  }
  function drawDoor(st, d, lk, t) {
    const H0 = d.y1 - d.y0, off = H0 * d.open;
    ctx.save();
    ctx.beginPath(); ctx.rect(d.x0 - 6, d.y0, d.x1 - d.x0 + 12, H0); ctx.clip();
    // the frame (the dark doorway behind)
    ctx.fillStyle = 'rgba(20,30,50,0.35)'; ctx.fillRect(d.x0, d.y0, d.x1 - d.x0, H0);
    const y0 = d.y0 - off, y1 = d.y1 - off;
    // the door panel (drawn once): planks, iron bands with rivets, a brass porthole
    const dw = Math.round(d.x1 - d.x0), dh = Math.round(y1 - y0);
    ERICH.put('swdoor' + dw + 'x' + dh, dw + 8, dh + 8, 4, 4, c => {
      const n = Math.max(1, Math.round((dw - 4) / 10)), bw = (dw - 4) / n;
      c.fillStyle = '#5a3b20'; c.fillRect(0, 0, dw, dh);
      for (let i = 0; i < n; i++) ERICH.board(c, 2 + i * bw + 0.5, 0, bw - 1, dh, { col: i % 2 ? '#a77a50' : '#9c7048', seed: 300 + i, vert: true, r: 1, nails: false, lw: 0.9, edge: '#4a321d' });
      for (let y = 20; y < dh - 10; y += 70) { ERICH.metal(c, -1, y, dw + 2, 8, { col: '#5e6876', seed: y, r: 1, rivets: false, lw: 1.1 }); ERICH.rivets(c, [[5, y + 4], [dw - 5, y + 4]], 1.5, '#d9b45a'); }
      c.strokeStyle = '#4a321d'; c.lineWidth = 3; c.strokeRect(1.5, 1.5, dw - 3, dh - 3);
      const wy = Math.min(60, dh * 0.3), cx = dw / 2;
      c.fillStyle = '#8a6420'; c.beginPath(); c.arc(cx + 0.8, wy + 1, 10, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#d9b45a'; c.beginPath(); c.arc(cx, wy, 9.5, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#f2d58a'; c.beginPath(); c.arc(cx - 2, wy - 2, 6, Math.PI, Math.PI * 1.5); c.lineTo(cx, wy); c.fill();
      const g = c.createRadialGradient(cx - 2, wy - 2, 1, cx, wy, 6.5); g.addColorStop(0, '#c8f4ff'); g.addColorStop(1, '#3f9fc0');
      c.fillStyle = g; c.beginPath(); c.arc(cx, wy, 6, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.7)'; c.beginPath(); c.ellipse(cx - 2.2, wy - 2.2, 2, 1, -0.7, 0, Math.PI * 2); c.fill();
      for (let a = 0; a < 6; a++) { c.fillStyle = '#7a5418'; c.beginPath(); c.arc(cx + Math.cos(a / 6 * Math.PI * 2) * 8, wy + Math.sin(a / 6 * Math.PI * 2) * 8, 1, 0, Math.PI * 2); c.fill(); }
    }, d.x0, y0);
    // switch lamps: one per switch it needs (lit gold when that switch is on)
    const n = d.need.length;
    d.need.forEach((id, i) => {
      const tr = st.trig[id], on = tr && tr.on, lx = d.x0 - 10, ly = d.y0 + 16 + i * 18;
      void lx; void ly;
      if (tr && tr.kind === 'key') return;
      const cx = (d.x0 + d.x1) / 2, cy = y1 - 22 - (n - 1 - i) * 18;
      ctx.fillStyle = on ? '#ffd36b' : '#3a3f55'; circle(cx, cy, 6); ctx.fill();
      ctx.strokeStyle = '#2a2a3a'; ctx.lineWidth = 1.5; circle(cx, cy, 6); ctx.stroke();
      // the switch's little picture on the lamp
      ctx.fillStyle = on ? '#8a5a12' : '#9aa0b8';
      if (tr && tr.kind === 'glow') { circle(cx, cy, 2.4); ctx.fill(); }
      else if (tr && tr.kind === 'wheel') { ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 1.5; circle(cx, cy, 3); ctx.stroke(); }
      else { ctx.fillRect(cx - 1, cy - 4, 2, 6); }
    });
    if (d.lock) {
      const kx = (d.x0 + d.x1) / 2, ky = keyholeY(d) - off, k = d.need.map(id => st.trig[id]).find(q => q && q.kind === 'key'), on = k && k.on;
      ctx.fillStyle = on ? '#ffd36b' : d.gold ? '#ffd36b' : '#e2b64a'; rr(kx - 10, ky - 15, 20, 30, 6); ctx.fill();
      ctx.strokeStyle = '#7a5520'; ctx.lineWidth = 2; rr(kx - 10, ky - 15, 20, 30, 6); ctx.stroke();
      ctx.fillStyle = '#3a2a14'; circle(kx, ky - 3, 4); ctx.fill(); ctx.fillRect(kx - 2, ky - 2, 4, 10);
    }
    ctx.restore();
  }
  function drawExit(st, lk, t) {
    if (st.chest) return;
    const x = st.exitX + 20, open = need(st).kind === 'exit';
    // a big round hatch to the next deck, glowing warm when it's time to go
    ctx.fillStyle = 'rgba(255,230,160,' + (open ? 0.22 + 0.08 * Math.sin(t * 3) : 0.08) + ')'; circle(x + 60, 300, 120); ctx.fill();
    ctx.fillStyle = lk.woodE; rr(x, 170, 120, 260, 60); ctx.fill();
    ctx.fillStyle = open ? '#2a5f78' : '#1d3346'; rr(x + 10, 180, 100, 240, 50); ctx.fill();
    if (open) { ctx.fillStyle = 'rgba(255,240,190,0.35)'; rr(x + 20, 190, 80, 220, 40); ctx.fill(); }
    ctx.strokeStyle = '#d9b45a'; ctx.lineWidth = 4; rr(x + 4, 174, 112, 252, 56); ctx.stroke();
  }
  function drawCrate(c, lk) {
    const x = c.x0, y = c.y0, s = c.w;
    ctx.fillStyle = 'rgba(10,16,30,0.3)'; ctx.beginPath(); ctx.ellipse(x + s / 2, y + s + 2, s * 0.55, 6, 0, 0, TAU); ctx.fill();
    // the push crate (drawn once): framed, braced and nailed, a rope handle, a shy starfish stuck on it
    ERICH.put('swcrate' + s + (c.gold ? 'g' : ''), s + 8, s + 8, 4, 4, q => {
      ERICH.crate(q, 0, 0, s, s, { col: c.gold ? '#ffd36b' : '#b5864f', seed: c.gold ? 77 : 41 });
      q.strokeStyle = c.gold ? '#a8781a' : '#d8c08a'; q.lineWidth = 2.2; q.beginPath(); q.arc(s / 2, s * 0.18, s * 0.12, Math.PI * 0.1, Math.PI * 0.9, true); q.stroke();
      q.fillStyle = '#ff9a7a'; q.strokeStyle = '#c0604a'; q.lineWidth = 1;
      q.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 3 : 7; q.lineTo(s - 14 + Math.cos(a) * r, 16 + Math.sin(a) * r); } q.closePath(); q.fill(); q.stroke();
      q.fillStyle = '#ffd8c8'; q.beginPath(); q.arc(s - 14, 16, 1.2, 0, Math.PI * 2); q.fill();
    }, x, y);
    void lk;
  }
  function starPath(x, y, ro, ri) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? ri : ro; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
    ctx.closePath();
  }
  function drawTrig(st, tr, t) {
    const x = tr.x, y = tr.y;
    if (tr.kind === 'lever') {
      ctx.fillStyle = '#56606c'; rr(x - 14, y - 6, 28, 22, 5); ctx.fill();
      ctx.fillStyle = '#7d8896'; rr(x - 11, y - 3, 22, 16, 4); ctx.fill();
      const a = tr.on ? 0.7 : -0.7;
      ctx.save(); ctx.translate(x, y + 6); ctx.rotate(a);
      ctx.fillStyle = '#d9b45a'; ctx.fillRect(-2.5, -28, 5, 28);
      ctx.fillStyle = '#ff6b6b'; circle(0, -30, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; circle(-2, -32, 2.5); ctx.fill();
      ctx.restore();
    } else if (tr.kind === 'wheel') {
      const a = tr.hold * 3.2 + (tr.on ? 0 : 0);
      ctx.fillStyle = '#56606c'; ctx.fillRect(x - 4, y, 8, SW.floor - y);
      ctx.save(); ctx.translate(x, y); ctx.rotate(a);
      ctx.strokeStyle = '#e0484f'; ctx.lineWidth = 6; circle(0, 0, 18); ctx.stroke();
      ctx.lineWidth = 4; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(k * Math.PI / 2) * 18, Math.sin(k * Math.PI / 2) * 18); ctx.stroke(); }
      ctx.fillStyle = '#ff8a8f'; for (let k = 0; k < 4; k++) { circle(Math.cos(k * Math.PI / 2 + Math.PI / 4) * 18, Math.sin(k * Math.PI / 2 + Math.PI / 4) * 18, 3.5); ctx.fill(); }
      ctx.fillStyle = '#d9b45a'; circle(0, 0, 5); ctx.fill();
      ctx.restore();
      if (tr.hold > 0 && !tr.on) { ctx.strokeStyle = C.gold; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y, 26, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(tr.hold / SW.wheelT, 0, 1)); ctx.stroke(); }
    } else if (tr.kind === 'key') {
      drawKey(x, y + Math.sin(t * 2.5) * 3, 1);
    }
  }
  function drawKey(x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.rotate(-0.3);
    ctx.fillStyle = '#ffd36b'; ctx.strokeStyle = '#a8781a'; ctx.lineWidth = 2;
    circle(-10, 0, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#a8781a'; circle(-10, 0, 3); ctx.fill();
    ctx.fillStyle = '#ffd36b'; ctx.fillRect(-3, -2.5, 20, 5); ctx.fillRect(12, 2, 3, 6); ctx.fillRect(7, 2, 3, 4);
    ctx.strokeRect(-3, -2.5, 20, 5);
    ctx.restore();
  }
  function drawGem(g, t) {
    const y = g.y + Math.sin(t * 2 + g.x * 0.05) * 2.5;
    if (g.kind === 'coin') {
      const sq = Math.abs(Math.cos(t * 2.5 + g.x * 0.03));
      ctx.fillStyle = '#e8a72a'; ctx.beginPath(); ctx.ellipse(g.x, y, 9 * (0.3 + 0.7 * sq), 9, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ffd96b'; ctx.beginPath(); ctx.ellipse(g.x, y, 6.5 * (0.3 + 0.7 * sq), 6.5, 0, 0, TAU); ctx.fill();
    } else if (g.kind === 'pearl') {
      ctx.fillStyle = '#c9a0d8'; ctx.beginPath(); ctx.ellipse(g.x, y + 7, 13, 5, 0, 0, Math.PI); ctx.fill();
      const gr = ctx.createRadialGradient(g.x - 3, y - 3, 1, g.x, y, 9); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#e6dcf2');
      ctx.fillStyle = gr; circle(g.x, y, 8); ctx.fill();
    } else {
      const col = ['#ff5f7e', '#4fd38a', '#5fb8ff'][Math.abs(g.x | 0) % 3];
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(g.x, y - 11); ctx.lineTo(g.x + 10, y - 3); ctx.lineTo(g.x, y + 11); ctx.lineTo(g.x - 10, y - 3); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.beginPath(); ctx.moveTo(g.x, y - 11); ctx.lineTo(g.x + 4, y - 3); ctx.lineTo(g.x - 4, y - 3); ctx.closePath(); ctx.fill();
    }
    if ((t * 1.3 + g.x * 0.01) % 2 < 0.2) { ctx.fillStyle = '#ffffff'; starPath(g.x + 7, y - 8, 4, 1.2); ctx.fill(); }
  }
  function drawHazard(h, t) {
    if (h.kind === 'coral') {
      const dir = h.side === 'ceil' ? 1 : -1, bx = h.x, by = h.side === 'ceil' ? SW.ceil : SW.floor, r = h.r;
      const col = h.gold ? '#ffd36b' : '#ff6fa8', dark = h.gold ? '#c9952a' : '#c8467e';
      ctx.strokeStyle = dark; ctx.lineCap = 'round';
      const arms = [[-0.5, 1], [0, 1.25], [0.5, 1]];
      for (const [ang, len] of arms) {
        const ex = bx + Math.sin(ang) * r * len, ey = by + dir * Math.cos(ang) * r * len * 1.5;
        ctx.lineWidth = 9; ctx.strokeStyle = col; ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx + Math.sin(ang) * r * 0.3, by + dir * r * 0.8, ex, ey); ctx.stroke();
        // white prickly tips
        ctx.fillStyle = '#ffffff';
        for (let k = -1; k <= 1; k++) { const a = Math.atan2(ey - by, ex - bx) + k * 0.6; ctx.beginPath(); ctx.moveTo(ex + Math.cos(a) * 11, ey + Math.sin(a) * 11); ctx.lineTo(ex + Math.cos(a + 1.6) * 3, ey + Math.sin(a + 1.6) * 3); ctx.lineTo(ex + Math.cos(a - 1.6) * 3, ey + Math.sin(a - 1.6) * 3); ctx.fill(); }
      }
      ctx.fillStyle = col; circle(bx, by + dir * 8, 13); ctx.fill();
      // a sleepy little face
      ctx.strokeStyle = '#7a2a52'; ctx.lineWidth = 1.6;
      const fy = by + dir * 9;
      ctx.beginPath(); ctx.arc(bx - 4.5, fy, 2.4, 0.2, Math.PI - 0.2); ctx.stroke(); ctx.beginPath(); ctx.arc(bx + 4.5, fy, 2.4, 0.2, Math.PI - 0.2); ctx.stroke();
      if (h.gold) { ctx.strokeStyle = 'rgba(255,211,107,0.7)'; ctx.lineWidth = 2; circle(h.x, h.y, h.r + 6 + Math.sin(t * 4) * 2); ctx.stroke(); }
      return;
    }
    // urchin: a round purple ball with spines and sleepy eyes
    const x = h.x, y = h.y, r = h.r - 4, col = h.gold ? '#ffd36b' : '#8a5fd0';
    ctx.strokeStyle = h.gold ? '#c9952a' : '#5a3a9a'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    for (let k = 0; k < 14; k++) { const a = k / 14 * TAU + t * 0.4; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); ctx.lineTo(x + Math.cos(a) * (r + 9), y + Math.sin(a) * (r + 9)); ctx.stroke(); }
    ctx.fillStyle = col; circle(x, y, r); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; circle(x - 4, y - 5, 4); ctx.fill();
    ctx.strokeStyle = '#2a1a4a'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(x - 4, y, 2.4, 0.2, Math.PI - 0.2); ctx.stroke(); ctx.beginPath(); ctx.arc(x + 4, y, 2.4, 0.2, Math.PI - 0.2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,140,190,0.5)'; circle(x - 8, y + 4, 2.5); ctx.fill(); circle(x + 8, y + 4, 2.5); ctx.fill();
    if (h.gold) { ctx.strokeStyle = 'rgba(255,211,107,0.7)'; ctx.lineWidth = 2; circle(x, y, h.r + 8 + Math.sin(t * 4) * 2); ctx.stroke(); }
  }
  function drawPuffer(q, t, alpha) {
    const puffed = q.state === 'puff' || (q.state === 'leave' && q.t < 0.6);
    const r = q.state === 'gone' ? 18 : q.r * (puffed ? 1.15 : 1);
    const x = q.x, y = q.y + Math.sin(t * 2 + q.hx) * 2;
    ctx.save(); ctx.globalAlpha = alpha;
    // tail and fins
    ctx.fillStyle = q.gold ? '#f2b23a' : '#f2a03a';
    ctx.beginPath(); ctx.moveTo(x + r * 0.8, y); ctx.lineTo(x + r * 1.35, y - r * 0.4 + Math.sin(t * 6) * 3); ctx.lineTo(x + r * 1.35, y + r * 0.4 - Math.sin(t * 6) * 3); ctx.closePath(); ctx.fill();
    if (puffed) { ctx.strokeStyle = '#c87a1a'; ctx.lineWidth = 2; for (let k = 0; k < 16; k++) { const a = k / 16 * TAU; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); ctx.lineTo(x + Math.cos(a) * (r + 7), y + Math.sin(a) * (r + 7)); ctx.stroke(); } }
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 2, x, y, r);
    g.addColorStop(0, q.gold ? '#fff3b0' : '#ffe9a0'); g.addColorStop(1, q.gold ? '#ffd36b' : '#ffc24a');
    ctx.fillStyle = g; circle(x, y, r); ctx.fill();
    ctx.fillStyle = 'rgba(200,120,40,0.35)'; for (let k = 0; k < 5; k++) { circle(x + Math.cos(k * 1.3) * r * 0.55, y + r * 0.2 + Math.sin(k * 1.3) * r * 0.35, r * 0.09); ctx.fill(); }
    // face: grumpy while blocking, worried while leaving, happy once gone
    const ex = x - r * 0.35, ey = y - r * 0.15;
    ctx.fillStyle = '#ffffff'; circle(ex - r * 0.18, ey, r * 0.2); ctx.fill(); circle(ex + r * 0.22, ey, r * 0.2); ctx.fill();
    ctx.fillStyle = '#1c1a36'; circle(ex - r * 0.2, ey + 1, r * 0.1); ctx.fill(); circle(ex + r * 0.2, ey + 1, r * 0.1); ctx.fill();
    ctx.strokeStyle = '#7a4a10'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    if (q.state === 'gone') { ctx.beginPath(); ctx.arc(ex, y + r * 0.25, r * 0.22, 0.2, Math.PI - 0.2); ctx.stroke(); }
    else if (q.state === 'leave') { circle(ex, y + r * 0.35, r * 0.12); ctx.stroke(); }
    else {
      ctx.beginPath(); ctx.moveTo(ex - r * 0.38, ey - r * 0.32); ctx.lineTo(ex - r * 0.05, ey - r * 0.22); ctx.moveTo(ex + r * 0.42, ey - r * 0.32); ctx.lineTo(ex + r * 0.08, ey - r * 0.22); ctx.stroke();
      ctx.beginPath(); ctx.arc(ex, y + r * 0.5, r * 0.18, Math.PI + 0.3, -0.3); ctx.stroke();
    }
    ctx.restore();
  }
  function drawAnemone(tr, t, dark) {
    const x = tr.x, y = SW.floor, on = tr.on;
    const col = on ? '#7ff6ff' : tr.gold ? '#ffd36b' : '#b58ad8';
    ctx.save(); ctx.globalAlpha = dark ? (on ? 1 : 0.55 + 0.25 * Math.sin(t * 2 + x)) : 1;
    ctx.lineCap = 'round';
    for (let k = 0; k < 9; k++) {
      const a = -Math.PI / 2 + (k - 4) * 0.22, len = 26 + (k % 3) * 6, sw = Math.sin(t * (on ? 3 : 1.2) + k) * (on ? 0.25 : 0.08);
      const ex = x + Math.cos(a + sw) * len, ey = y - 12 + Math.sin(a + sw) * len;
      ctx.strokeStyle = col; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x + (k - 4) * 2.5, y - 12); ctx.quadraticCurveTo(x + (k - 4) * 4, y - 26, ex, ey); ctx.stroke();
      ctx.fillStyle = on ? '#ffffff' : '#e6d4ff'; circle(ex, ey, 3.2); ctx.fill();
    }
    ctx.fillStyle = on ? '#3fb8c8' : '#7a5aa8'; rr(x - 16, y - 16, 32, 16, 7); ctx.fill();
    // face
    ctx.strokeStyle = '#2a1a4a'; ctx.lineWidth = 1.6; ctx.fillStyle = '#2a1a4a';
    if (on) { circle(x - 5, y - 9, 2); ctx.fill(); circle(x + 5, y - 9, 2); ctx.fill(); ctx.beginPath(); ctx.arc(x, y - 6, 3.5, 0.2, Math.PI - 0.2); ctx.stroke(); }
    else {
      ctx.beginPath(); ctx.arc(x - 5, y - 9, 2.4, 0.2, Math.PI - 0.2); ctx.stroke(); ctx.beginPath(); ctx.arc(x + 5, y - 9, 2.4, 0.2, Math.PI - 0.2); ctx.stroke();
      const zt = (t * 0.7 + x * 0.01) % 2;
      ctx.globalAlpha *= clamp(1 - zt / 2, 0, 1);
      text('z', x + 16 + zt * 6, y - 40 - zt * 14, 12 + zt * 3, '#e6d4ff', 'center', 'body');
    }
    ctx.restore();
  }
  function drawChest(st, c, t) {
    const x = c.x, y = SW.floor;
    ctx.fillStyle = 'rgba(255,211,107,0.25)'; circle(x, y - 40, 70); ctx.fill();
    // gold piles round it
    ctx.fillStyle = '#e8a72a'; ctx.beginPath(); ctx.ellipse(x, y, 120, 22, 0, Math.PI, TAU); ctx.fill();
    ctx.fillStyle = '#ffd96b'; for (let k = 0; k < 14; k++) { circle(x - 100 + k * 15, y - 6 - (hash(k, 4) % 12), 6); ctx.fill(); }
    ctx.fillStyle = '#8c5a30'; rr(x - 46, y - 56, 92, 52, 6); ctx.fill();
    ctx.fillStyle = '#ffd36b'; ctx.fillRect(x - 46, y - 40, 92, 6); ctx.fillRect(x - 6, y - 56, 12, 52);
    // the lid
    const a = c.open ? -1.2 * clamp(c.t / 0.5, 0, 1) : -clamp(c.hold / SW.chestT, 0, 1) * 0.25;
    ctx.save(); ctx.translate(x - 46, y - 56); ctx.rotate(a);
    ctx.fillStyle = '#a06a3a'; rr(0, -26, 92, 28, 12); ctx.fill();
    ctx.fillStyle = '#ffd36b'; ctx.fillRect(40, -26, 12, 28);
    ctx.restore();
    if (c.open) { ctx.fillStyle = 'rgba(255,240,170,0.8)'; ctx.beginPath(); ctx.moveTo(x - 40, y - 56); ctx.lineTo(x - 90, y - 220); ctx.lineTo(x + 90, y - 220); ctx.lineTo(x + 40, y - 56); ctx.fill(); }
    ctx.fillStyle = '#3a2a14'; circle(x, y - 34, 4); ctx.fill();
    if (c.hold > 0 && !c.open) { ctx.strokeStyle = C.gold; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(x, y - 30, 40, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(c.hold / SW.chestT, 0, 1)); ctx.stroke(); }
    void st;
  }
  function drawDecor(st, dc, lk, t) {
    const x = dc.x, y = dc.y, lit = lightAt(st, x, y) > 0.3;
    switch (dc.kind) {
      case 'barrel': {
        // a barrel (drawn once): bulging staves with grain, iron hoops with rivets, a bung, a soft shadow
        ERICH.put('swbarrel', 60, 68, 30, 62, c => {
          ERICH.shadow(c, 0, 0, 26, 4, 0.25);
          c.save(); rrOn(c, -22, -56, 44, 56, 12); c.clip();
          for (let i = 0; i < 6; i++) ERICH.board(c, -22 + i * 44 / 6, -58, 44 / 6, 60, { col: ['#9a6a3e', '#a4744a', '#93633a'][i % 3], seed: 700 + i, vert: true, r: 0, nails: false, lw: 0.8, knots: i === 2 ? 1 : 0 });
          c.fillStyle = 'rgba(30,15,5,0.3)'; c.beginPath(); c.ellipse(14, -28, 14, 40, 0, 0, Math.PI * 2); c.fill();
          c.fillStyle = 'rgba(255,255,255,0.14)'; c.fillRect(-15, -54, 5, 52);
          c.restore();
          c.strokeStyle = '#5a3b20'; c.lineWidth = 2; rrOn(c, -22, -56, 44, 56, 12); c.stroke();
          for (const hy of [-48, -17]) { ERICH.metal(c, -23, hy, 46, 5.5, { col: '#6c7684', seed: hy, r: 2, rivets: false, lw: 1 }); ERICH.rivets(c, [[-12, hy + 2.7], [12, hy + 2.7]], 1.1, '#c8ccd6'); }
          c.fillStyle = '#5a3b20'; c.beginPath(); c.arc(4, -32, 3, 0, Math.PI * 2); c.fill(); c.fillStyle = '#c9a26a'; c.beginPath(); c.arc(3.4, -32.6, 1.8, 0, Math.PI * 2); c.fill();
        }, x, y);
        break;
      }
      case 'crab': { // a sleeping crab that wakes up and waves in the light
        ctx.fillStyle = '#ff7a5c'; ctx.beginPath(); ctx.ellipse(x, y - 9, 16, 10, 0, Math.PI, TAU); ctx.fill(); ctx.fillRect(x - 16, y - 10, 32, 5);
        ctx.strokeStyle = '#d4553a'; ctx.lineWidth = 2.5; for (const s of [-1, 1]) for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(x + s * 10, y - 5); ctx.lineTo(x + s * (16 + k * 3), y); ctx.stroke(); }
        const wave = lit ? Math.sin(t * 8) * 0.5 : 0;
        for (const s of [-1, 1]) { ctx.save(); ctx.translate(x + s * 16, y - 12); ctx.rotate(s * (-0.6 - (lit ? 0.6 + wave : 0))); ctx.fillStyle = '#ff7a5c'; ctx.beginPath(); ctx.ellipse(s * 6, -4, 6, 4.5, 0, 0, TAU); ctx.fill(); ctx.restore(); }
        ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#1c1a36'; ctx.lineWidth = 1.4;
        for (const s of [-1, 1]) { ctx.fillStyle = '#d4553a'; ctx.fillRect(x + s * 5 - 1, y - 24, 2, 8); ctx.fillStyle = '#ffffff'; circle(x + s * 5, y - 25, 3.5); ctx.fill(); if (lit) { ctx.fillStyle = '#1c1a36'; circle(x + s * 5, y - 25, 1.6); ctx.fill(); } else { ctx.beginPath(); ctx.moveTo(x + s * 5 - 2.5, y - 25); ctx.lineTo(x + s * 5 + 2.5, y - 25); ctx.stroke(); } }
        if (!lit) { const zt = (t * 0.6 + x * 0.01) % 2; ctx.save(); ctx.globalAlpha = clamp(1 - zt / 2, 0, 1); text('z', x + 14 + zt * 6, y - 34 - zt * 12, 11 + zt * 3, '#ffe0d6', 'center', 'body'); ctx.restore(); }
        break;
      }
      case 'hermit': { // a hermit crab strolling back and forth with its shell
        const span = dc.o.span || 160, u = (Math.sin(dc.t * 0.35) + 1) / 2, hx = x + u * span, dir = Math.cos(dc.t * 0.35) >= 0 ? 1 : -1;
        ctx.fillStyle = '#f2c48a'; ctx.beginPath(); ctx.arc(hx - dir * 4, y - 14, 14, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#c9915a'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(hx - dir * 4, y - 14, 9, 0, 4.5); ctx.stroke(); ctx.beginPath(); ctx.arc(hx - dir * 4, y - 14, 4, 0, 4.5); ctx.stroke();
        ctx.fillStyle = '#ff9a7a'; circle(hx + dir * 11, y - 7, 6); ctx.fill();
        ctx.strokeStyle = '#d4553a'; ctx.lineWidth = 2; for (let k = 0; k < 3; k++) { const lg = Math.sin(dc.t * 8 + k) * 2; ctx.beginPath(); ctx.moveTo(hx + dir * (6 + k * 3), y - 4); ctx.lineTo(hx + dir * (8 + k * 4) + lg, y); ctx.stroke(); }
        ctx.fillStyle = '#ffffff'; circle(hx + dir * 14, y - 15, 3); ctx.fill(); ctx.fillStyle = '#1c1a36'; circle(hx + dir * 15, y - 15, 1.5); ctx.fill();
        break;
      }
      case 'pots': { // hanging pots and pans
        for (let k = 0; k < 4; k++) {
          const px = x + k * 46, sw = Math.sin(t * 1.3 + k) * 0.08, len = 40 + (k % 2) * 22;
          ctx.save(); ctx.translate(px, SW.ceil); ctx.rotate(sw);
          ctx.strokeStyle = '#8a8f9e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, len); ctx.stroke();
          ctx.fillStyle = k % 2 ? '#c87a4a' : '#9aa4b8'; ctx.beginPath(); ctx.ellipse(0, len + 12, 16, 12, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.beginPath(); ctx.ellipse(-5, len + 8, 5, 3, 0, 0, TAU); ctx.fill();
          ctx.restore();
        }
        break;
      }
      case 'stove': {
        // a cast-iron stove (drawn once): riveted body, a grated firebox door with a handle, a top plate, a stovepipe
        ERICH.put('swstove', 124, 212, 62, 204, c => {
          ERICH.shadow(c, 0, 0, 56, 5, 0.25);
          const pg = c.createLinearGradient(-10, 0, 10, 0); pg.addColorStop(0, '#3a404c'); pg.addColorStop(0.35, '#4c5462'); pg.addColorStop(1, '#22262e');
          c.fillStyle = pg; c.fillRect(-10, -200, 20, 124); c.strokeStyle = '#1a1d24'; c.lineWidth = 1.5; c.strokeRect(-10, -200, 20, 124);
          for (const py of [-170, -120]) { c.fillStyle = '#5c6470'; c.fillRect(-12, py, 24, 6); c.strokeRect(-12, py, 24, 6); }
          ERICH.metal(c, -50, -70, 100, 70, { col: '#5c6470', seed: 11, r: 6, lw: 2 });
          ERICH.metal(c, -38, -50, 76, 36, { col: '#3a3f4c', seed: 12, r: 6, rivets: false, lw: 1.6 });
          c.strokeStyle = '#22262e'; c.lineWidth = 2.5; for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(-28 + i * 11, -44); c.lineTo(-28 + i * 11, -20); c.stroke(); }
          c.fillStyle = 'rgba(255,160,80,0.25)'; rrOn(c, -32, -42, 64, 20, 4); c.fill();
          c.fillStyle = '#c8ccd6'; rrOn(c, -10, -58, 20, 5, 2.5); c.fill(); c.strokeStyle = '#4c5260'; c.lineWidth = 1; c.stroke();
          ERICH.metal(c, -56, -76, 112, 8, { col: '#7d8896', seed: 13, r: 2, rivets: false, lw: 1.4 });
          for (const lx of [-44, 38]) { c.fillStyle = '#3a3f4c'; c.fillRect(lx, -4, 6, 4); }
        }, x, y);
        break;
      }
      case 'plates': {
        // a plate rack (drawn once): a nailed board with brackets, plates with a rim, a glaze and a painted band
        ERICH.put('swplates' + st.look, 132, 40, 66, 26, c => {
          for (const bx of [-50, 44]) { c.fillStyle = lk.woodE; c.beginPath(); c.moveTo(bx, 8); c.lineTo(bx + 6, 8); c.lineTo(bx + 6, 14); c.closePath(); c.fill(); }
          ERICH.board(c, -60, 0, 120, 8, { col: lk.woodD, seed: 900, r: 1.5, lw: 1.2, edge: lk.woodE });
          for (let k = 0; k < 5; k++) {
            const col = ['#ffffff', '#9fd8ff', '#ffd6e0'][k % 3], px = -48 + k * 24;
            c.fillStyle = 'rgba(20,10,0,0.25)'; c.beginPath(); c.arc(px + 1.5, -9, 11, 0, Math.PI * 2); c.fill();
            c.fillStyle = col; c.beginPath(); c.arc(px, -10, 11, 0, Math.PI * 2); c.fill();
            c.strokeStyle = shade(col, 0.3); c.lineWidth = 1.2; c.stroke();
            c.fillStyle = shade(col, 0.08); c.beginPath(); c.arc(px, -10, 7, 0, Math.PI * 2); c.fill();
            c.strokeStyle = ['#5a9ae0', '#e0705a', '#6ac08a'][k % 3]; c.lineWidth = 1.2; c.beginPath(); c.arc(px, -10, 9, 0, Math.PI * 2); c.stroke();
            c.fillStyle = 'rgba(255,255,255,0.7)'; c.beginPath(); c.ellipse(px - 4, -15, 3, 1.5, -0.6, 0, Math.PI * 2); c.fill();
          }
        }, x, y);
        break;
      }
      case 'shelf': { // a bookshelf
        // a bookshelf (drawn once): a planked case with shelf boards, books with spine bands and labels, a leaning book
        ERICH.put('swshelf' + st.look, 132, 162, 66, 156, c => {
          ERICH.shadow(c, 0, 0, 62, 4, 0.25);
          c.fillStyle = shade(lk.woodD, 0.25); c.fillRect(-60, -150, 120, 150);
          for (let i = 0; i < 6; i++) ERICH.board(c, -54 + i * 18, -146, 18, 146, { col: shade(lk.woodD, 0.2), seed: 910 + i, vert: true, r: 0, nails: false, lw: 0.6, knots: 0 });
          for (let r = 0; r < 3; r++) {
            const sy = -150 + r * 50;
            for (let k = 0; k < 7; k++) {
              const col = ['#e05a5a', '#5a9ae0', '#e0c05a', '#6ac08a', '#b07ad8'][(k + r) % 5], bx = -54 + k * 15, by = sy + 12 + (k % 2) * 4, bh = 32 - (k % 2) * 4;
              if (k === 6 && r === 1) { c.save(); c.translate(bx + 12, sy + 44); c.rotate(-0.35); ERICH.board(c, -12, -30, 12, 30, { col, seed: 950, vert: true, r: 1.5, nails: false, lw: 1, knots: 0 }); c.restore(); continue; }
              c.fillStyle = col; rrOn(c, bx, by, 12, bh, 1.5); c.fill();
              c.fillStyle = shade(col, 0.2); c.fillRect(bx + 8, by, 4, bh);
              c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(bx + 1, by + 1, 2, bh - 2);
              c.fillStyle = '#f2d58a'; c.fillRect(bx, by + 4, 12, 2); c.fillRect(bx, by + bh - 6, 12, 2);
              c.fillStyle = 'rgba(255,255,255,0.75)'; c.fillRect(bx + 3, by + 11, 6, 6);
              c.strokeStyle = shade(col, 0.45); c.lineWidth = 1; rrOn(c, bx, by, 12, bh, 1.5); c.stroke();
            }
            ERICH.board(c, -60, sy + 44, 120, 6, { col: lk.woodE, seed: 960 + r, r: 0, lw: 1, edge: shade(lk.woodE, 0.3), knots: 0 });
          }
          ERICH.board(c, -62, -152, 124, 7, { col: lk.woodD, seed: 970, r: 2, lw: 1.2, edge: lk.woodE });
          c.strokeStyle = lk.woodE; c.lineWidth = 2; c.strokeRect(-60, -150, 120, 150);
        }, x, y);
        break;
      }
      case 'map': { // the captain's treasure map on the wall
        ctx.fillStyle = '#f2e2b0'; rr(x - 50, y - 34, 100, 68, 4); ctx.fill();
        ctx.strokeStyle = '#c9a457'; ctx.lineWidth = 2; rr(x - 50, y - 34, 100, 68, 4); ctx.stroke();
        ctx.setLineDash([4, 4]); ctx.strokeStyle = '#b05a3a'; ctx.beginPath(); ctx.moveTo(x - 36, y + 18); ctx.quadraticCurveTo(x - 10, y - 20, x + 26, y + 4); ctx.stroke(); ctx.setLineDash([]);
        ctx.strokeStyle = '#e05a5a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + 22, y); ctx.lineTo(x + 32, y + 10); ctx.moveTo(x + 32, y); ctx.lineTo(x + 22, y + 10); ctx.stroke();
        break;
      }
      case 'portrait': { // a portrait of a smiling captain fish
        ctx.fillStyle = '#d9b45a'; rr(x - 36, y - 44, 72, 88, 8); ctx.fill();
        ctx.fillStyle = '#5a7fa8'; rr(x - 28, y - 36, 56, 72, 6); ctx.fill();
        ctx.fillStyle = '#ffb35c'; ctx.beginPath(); ctx.ellipse(x, y + 4, 18, 14, 0, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x + 16, y + 4); ctx.lineTo(x + 26, y - 4); ctx.lineTo(x + 26, y + 12); ctx.fill();
        ctx.fillStyle = '#1c1a36'; ctx.fillRect(x - 16, y - 22, 26, 8); ctx.fillRect(x - 11, y - 30, 16, 9);
        ctx.fillStyle = '#ffffff'; circle(x - 7, y, 3.5); ctx.fill(); ctx.fillStyle = '#1c1a36'; circle(x - 7, y, 1.8); ctx.fill();
        ctx.strokeStyle = '#7a4a10'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(x - 6, y + 6, 4, 0.2, Math.PI - 0.2); ctx.stroke();
        break;
      }
      case 'bed': {
        // the captain's bunk (drawn once): a planked frame, a mattress, a stitched quilt with a patch, a plump pillow
        ERICH.put('swbed' + st.look, 152, 76, 76, 70, c => {
          ERICH.shadow(c, 0, 0, 72, 4, 0.25);
          for (let i = 0; i < 3; i++) ERICH.board(c, -70, -40 + i * 13.3, 140, 13.3, { col: [lk.woodD, mixCol(lk.woodD, lk.wood, 0.3), lk.woodD][i], seed: 980 + i, r: 0, lw: 1, edge: lk.woodE, nails: true });
          ERICH.board(c, -74, -46, 8, 46, { col: lk.wood, seed: 990, vert: true, r: 2, nails: false, lw: 1.2, edge: lk.woodE });
          ERICH.board(c, 66, -46, 8, 46, { col: lk.wood, seed: 991, vert: true, r: 2, nails: false, lw: 1.2, edge: lk.woodE });
          ERICH.cushion(c, -66, -54, 132, 18, { col: '#e8e0ff', r: 6, button: false });
          ERICH.cushion(c, -20, -58, 84, 24, { col: '#ff9fb5', r: 8, button: false });
          c.fillStyle = '#ffd6e0'; rrOn(c, 18, -52, 16, 12, 2); c.fill(); c.save(); c.setLineDash([2, 2]); c.strokeStyle = '#c8607a'; c.lineWidth = 1; c.stroke(); c.restore();
          ERICH.cushion(c, -64, -66, 38, 18, { col: '#ffffff', r: 8, button: false, edge: '#b8b0d0' });
        }, x, y);
        break;
      }
      case 'hat': { // the captain's hat on a hook
        ctx.fillStyle = '#5c6470'; circle(x, y - 22, 3); ctx.fill();
        ctx.fillStyle = '#2a2f4a'; ctx.beginPath(); ctx.ellipse(x, y, 30, 9, 0, 0, TAU); ctx.fill(); rr(x - 18, y - 22, 36, 22, 8); ctx.fill();
        ctx.fillStyle = '#ffd36b'; circle(x, y - 10, 5); ctx.fill();
        break;
      }
      case 'gold': { // treasure-room gold heaps
        ctx.fillStyle = '#e8a72a'; ctx.beginPath(); ctx.ellipse(x, y, 60, 26, 0, Math.PI, TAU); ctx.fill();
        for (let k = 0; k < 9; k++) { ctx.fillStyle = k % 3 ? '#ffd96b' : '#ffe9a8'; circle(x - 44 + k * 11, y - 8 - (hash(k + (x | 0), 3) % 14), 5.5); ctx.fill(); }
        if ((t + x * 0.01) % 1.6 < 0.15) { ctx.fillStyle = '#ffffff'; starPath(x + 10, y - 22, 5, 1.5); ctx.fill(); }
        break;
      }
      case 'column': {
        ctx.fillStyle = '#9fb8c8'; ctx.fillRect(x - 20, SW.ceil, 40, SW.floor - SW.ceil);
        ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(x - 14, SW.ceil, 6, SW.floor - SW.ceil);
        ctx.fillStyle = '#7f98a8'; ctx.fillRect(x - 26, SW.ceil, 52, 14); ctx.fillRect(x - 26, SW.floor - 14, 52, 14);
        ctx.fillStyle = 'rgba(90,200,140,0.5)'; for (let k = 0; k < 4; k++) { circle(x - 16 + (k * 13) % 30, SW.ceil + 60 + k * 70, 5); ctx.fill(); }
        break;
      }
      case 'anchor': {
        ctx.strokeStyle = '#6a7686'; ctx.lineWidth = 6; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x, y - 70); ctx.lineTo(x, y); ctx.stroke();
        ctx.beginPath(); ctx.arc(x, y - 22, 26, 0.3, Math.PI - 0.3); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x - 16, y - 56); ctx.lineTo(x + 16, y - 56); ctx.stroke();
        circle(x, y - 76, 6); ctx.stroke();
        break;
      }
      case 'net': {
        ctx.strokeStyle = 'rgba(230,220,180,0.55)'; ctx.lineWidth = 1.5;
        for (let k = 0; k < 7; k++) { ctx.beginPath(); ctx.moveTo(x + k * 16, SW.ceil); ctx.quadraticCurveTo(x + k * 16 + 10, SW.ceil + 50, x + k * 14 + 20, SW.ceil + 90); ctx.stroke(); }
        for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(x, SW.ceil + 20 + k * 20); ctx.quadraticCurveTo(x + 50, SW.ceil + 34 + k * 22, x + 110, SW.ceil + 20 + k * 20); ctx.stroke(); }
        break;
      }
      case 'sacks': {
        for (let k = 0; k < 3; k++) { ctx.fillStyle = k % 2 ? '#d9c08a' : '#c9ad72'; ctx.beginPath(); ctx.ellipse(x + k * 34 - (k === 2 ? 50 : 0), y - 18 - (k === 2 ? 30 : 0), 22, 18, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#9c7c48'; ctx.fillRect(x + k * 34 - 4 - (k === 2 ? 50 : 0), y - 38 - (k === 2 ? 30 : 0), 8, 6); }
        break;
      }
      default: break;
    }
  }

  /* ---------- the darkness: a deep blue overlay with soft light holes ---------- */
  let dk = null, dkx = null;
  function drawDark(st, t) {
    const S = 0.5, w = Math.round(W * S), h = Math.round(H * S);
    if (!dk) { try { dk = document.createElement('canvas'); dk.width = w; dk.height = h; dkx = dk.getContext('2d'); } catch (e) { dk = null; } }
    if (!dk || !dkx) return;
    const c = dkx;
    c.globalCompositeOperation = 'source-over';
    c.clearRect(0, 0, w, h);
    c.fillStyle = st.look === 'treasure' ? 'rgba(4,10,30,0.95)' : 'rgba(3,8,26,0.965)';
    c.fillRect(0, 0, w, h);
    c.globalCompositeOperation = 'destination-out';
    const hole = (x, y, r, a, inner = 0.45) => {
      const sx = (x - st.camX) * S, sy = y * S, sr = r * S;
      if (sx < -sr || sx > w + sr) return;
      const g = c.createRadialGradient(sx, sy, sr * inner, sx, sy, sr);
      g.addColorStop(0, 'rgba(0,0,0,' + a + ')'); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g; c.beginPath(); c.arc(sx, sy, sr, 0, TAU); c.fill();
    };
    if (st.fish) {
      hole(st.fish.x, st.fish.y, lightRad(st), 1, 0.55);
      hole(st.fish.x, st.fish.y, lightRad(st) * 1.25, 0.35, 0.6);
    }
    for (const p of G.players) hole(p.x + st.camX + p.w / 2, p.y + p.h / 2, 36, 0.3, 0.2);
    for (const q of st.ports) hole(q.x, q.y + 60, 100, 0.12, 0.1);
    for (const tr of Object.values(st.trig)) if (tr.kind === 'glow') hole(tr.x, SW.floor - 26, tr.on ? 110 : 46, tr.on ? 0.7 : 0.3, 0.2);
    for (const q of st.puffers) if (q.gold) hole(q.x, q.y, 70, 0.5, 0.2);
    for (const tr of Object.values(st.trig)) if (tr.gold && tr.kind !== 'glow') hole(tr.x, tr.y, 60, 0.6, 0.2);
    for (const h2 of st.hazards) if (h2.gold) hole(h2.x, h2.y, 50, 0.4, 0.2);
    if (st.chest) hole(st.chest.x, st.chest.y, st.chest.open ? 360 : 90, st.chest.open ? 1 : 0.4, 0.3);
    if (!st.chest && need(st).kind === 'exit') hole(st.exitX + 80, 300, 140, 0.55, 0.3);
    c.globalCompositeOperation = 'source-over';
    ctx.drawImage(dk, 0, 0, W, H);
    // a warm glow round Glimmer, and the porthole beams
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    if (st.fish) {
      const fx = st.fish.x - st.camX, fy = st.fish.y, r = lightRad(st);
      const g = ctx.createRadialGradient(fx, fy, 4, fx, fy, r);
      g.addColorStop(0, 'rgba(255,240,170,0.22)'); g.addColorStop(0.5, 'rgba(160,255,230,0.07)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; circle(fx, fy, r); ctx.fill();
      if (st.flashT != null) { const e = flashEnv(st.flashT); ctx.fillStyle = 'rgba(255,250,210,' + (0.25 * e) + ')'; circle(fx, fy, r); ctx.fill(); }
    }
    for (const q of st.ports) {
      if (!onScreen(st, q.x)) continue;
      const x = q.x - st.camX;
      const g = ctx.createLinearGradient(0, q.y, 0, SW.floor);
      g.addColorStop(0, 'rgba(170,240,255,0.07)'); g.addColorStop(1, 'rgba(170,240,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - 16, q.y); ctx.lineTo(x + 16, q.y); ctx.lineTo(x + 70 + Math.sin(t) * 6, SW.floor); ctx.lineTo(x + 10 + Math.sin(t) * 6, SW.floor); ctx.fill();
    }
    ctx.restore();
  }

  // signs written in the water (under the players, over the dark)
  function drawSigns(st) {
    const bg = big();
    ctx.save(); ctx.translate(-st.camX, 0);
    for (const sg of st.signs) {
      if (!onScreen(st, sg.x, 260)) continue;
      const s = sg.alt && isCpu(sg.raw.includes(NAMES[st.lantern] + ':') ? st.lantern : st.grabber) ? sg.alt : sg.raw;
      const str = s.replace(/\{La\}/g, key(st.lantern, 'act')).replace(/\{Ga\}/g, key(st.grabber, 'act'));
      const fs = bg ? 22 : 17;
      ctx.font = fs + 'px "Lilita One", "Arial Rounded MT Bold", sans-serif';
      const w = ctx.measureText(str).width + 26;
      ctx.fillStyle = 'rgba(10,30,60,0.55)'; rr(sg.x - w / 2, sg.y - fs * 0.9, w, fs * 1.8, fs * 0.9); ctx.fill();
      text(str, sg.x, sg.y + 1, fs, '#e6fbff', 'center');
    }
    ctx.restore();
  }

  /* ---------- on top of the darkness: glowing things, Glimmer, the claw, pops, chips ---------- */
  function drawTop(st) {
    const t = G.clock, bg = big();
    ctx.save(); ctx.translate(-st.camX, 0);
    // glowing plankton specks drifting in the dark
    for (let k = 0; k < 26; k++) {
      const bx = Math.floor(st.camX / 900) * 900 + ((k * 137) % 1800) - 400, y = SW.ceil + 30 + (k * 71) % 320;
      const x = bx + Math.sin(t * 0.4 + k) * 20, a = 0.35 + 0.35 * Math.sin(t * 2 + k * 1.7);
      if (!onScreen(st, x, 20)) continue;
      ctx.fillStyle = 'rgba(160,255,240,' + (a * 0.35) + ')'; circle(x, y + Math.cos(t * 0.6 + k) * 10, 5); ctx.fill();
      ctx.fillStyle = 'rgba(220,255,250,' + a + ')'; circle(x, y + Math.cos(t * 0.6 + k) * 10, 1.8); ctx.fill();
    }
    // anemones glow softly even in the dark (so the lantern can find them); pufferfish eyes peek out
    for (const tr of Object.values(st.trig)) if (tr.kind === 'glow' && onScreen(st, tr.x)) drawAnemone(tr, t, lightAt(st, tr.x, tr.y) < 0.5);
    for (const q of st.puffers) if (onScreen(st, q.x)) drawPuffer(q, t, Math.max(q.vis, q.state === 'gone' ? 0.3 : 0.15, q.gold ? 1 : 0));
    // seen switches leave a faint outline in the dark (a memory of where they were)
    for (const tr of Object.values(st.trig)) {
      if (tr.kind === 'glow' || tr.on || !tr.seen || tr.vis > 0.5 || (tr.kind === 'key' && tr.got) || !onScreen(st, tr.x)) continue;
      ctx.save(); ctx.globalAlpha = 0.28; ctx.strokeStyle = '#d9f4ff'; ctx.setLineDash([4, 4]); ctx.lineWidth = 2; circle(tr.x, tr.y, 22); ctx.stroke(); ctx.restore();
    }
    // gold help things glow on top of the dark
    for (const tr of Object.values(st.trig)) if (tr.gold && tr.kind !== 'glow' && !tr.on && !(tr.kind === 'key' && tr.got) && onScreen(st, tr.x)) {
      ctx.save(); ctx.fillStyle = 'rgba(255,211,107,0.25)'; circle(tr.x, tr.y, 30 + Math.sin(t * 4) * 3); ctx.fill(); drawTrig(st, tr, t); ctx.restore();
    }
    for (const h of st.hazards) if (h.gold && onScreen(st, h.x)) drawHazard(h, t);
    for (const d of st.doors) if (d.gold && d.lock && !d.opening) { const kx = (d.x0 + d.x1) / 2, ky = keyholeY(d); ctx.fillStyle = 'rgba(255,211,107,0.35)'; circle(kx, ky, 26 + Math.sin(t * 4) * 3); ctx.fill(); }
    if (st.chest && (st.chest.open || st.chest.gold)) drawChest(st, st.chest, t);
    if (!st.chest && need(st).kind === 'exit') text('Next deck ▶', st.exitX + 80, 150, big() ? 22 : 17, '#ffe9a8', 'center');
    // the claw and the carried key
    const gp = G.players[st.grabber], GP = st.pl[st.grabber];
    if (gp.alive) {
      const x = gp.x + st.camX + gp.w / 2, y = gp.y + gp.h * 0.55, f = gp.face, ext = GP.armT > 0 ? 14 * Math.sin(clamp(GP.armT / 0.28, 0, 1) * Math.PI) : 0;
      ctx.strokeStyle = '#d9b45a'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x + f * 6, y); ctx.lineTo(x + f * (18 + ext), y - 2); ctx.stroke();
      const cx = x + f * (20 + ext), cy = y - 2, op = GP.armT > 0 ? 0.3 : 0.75;
      ctx.strokeStyle = '#8a96a8'; ctx.lineWidth = 3;
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx, cy); ctx.quadraticCurveTo(cx + f * 6, cy + s * 7 * op, cx + f * 10, cy + s * 2 * op); ctx.stroke(); }
      if (st.carry) drawKey(x + f * 10, y + 10, 0.8);
    }
    // Glimmer the lantern fish
    if (st.fish) drawGlimmer(st, st.fish.x, st.fish.y, G.players[st.lantern].face, t);
    // particles and pops
    for (const q of st.parts) {
      const a = clamp(1 - q.t / q.life, 0, 1);
      ctx.globalAlpha = a;
      if (q.kind === 'bub') { ctx.strokeStyle = 'rgba(220,250,255,0.85)'; ctx.lineWidth = 1.4; circle(q.x, q.y, q.r); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,0.5)'; circle(q.x - q.r * 0.35, q.y - q.r * 0.35, q.r * 0.3); ctx.fill(); }
      else if (q.kind === 'coin') { ctx.fillStyle = '#ffd96b'; circle(q.x, q.y, q.r); ctx.fill(); }
      else { ctx.fillStyle = q.kind === 'glow' ? '#aaf8ff' : '#fff2b0'; circle(q.x, q.y, q.r * (0.6 + 0.4 * a)); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
    for (const q of st.pops) {
      const size = q.size * (bg ? 1.3 : 1);
      ctx.font = size + 'px "Lilita One", "Arial Rounded MT Bold", sans-serif';
      const w = ctx.measureText(q.s).width + size * 0.3, x = clamp(q.x, st.camX + w / 2 + 6, st.camX + W - w / 2 - 6), y = Math.max(100, q.y - q.t * 26);
      ctx.save(); ctx.globalAlpha = clamp(Math.min(q.t / 0.1, (1.4 - q.t) / 0.4), 0, 1);
      bigText(q.s, x, y, Math.round(size), q.col);
      ctx.restore();
    }
    ctx.restore();
    // hint chips over each person
    if (st.state === 'play' && G.introT <= SW.introHold) {
      const boxes = G.players.filter(p => p.alive).map(p => ({ x0: p.x - 2, y0: p.y - 6, x1: p.x + p.w + 2, y1: p.y + p.h })); // don't cover anyone
      for (const p of G.players) {
        const bb = isCpu(p.id) && typeof CPU !== 'undefined' && CPU.bubbles[p.id];
        if (!bb || bb.t <= 0 || !p.alive) continue;
        ctx.font = '700 ' + (bg ? 19 : 13) + 'px ' + FONT;
        const bw = ctx.measureText(bb.text).width + (bg ? 22 : 16), bh = bg ? 30 : 22;
        const bx = clamp(p.x + p.w / 2 - bw / 2, 4, W - bw - 4), by = clamp(p.y - 22 - bh, 4, H - bh - 4);
        boxes.push({ x0: bx, y0: by, x1: bx + bw, y1: by + bh + 6 });
      }
      for (const p of G.players) {
        if (!p.alive || isCpu(p.id)) continue;
        const P = st.pl[p.id], j = job(st, p.id);
        const k = j ? j.k : '';
        if (k !== P.chipKey) { P.chipKey = k; P.chipAt = G.time; }
        const chipT = G.time - (P.chipAt || 0);
        const lines = j && jobText(st, p.id, j);
        if (!lines || !lines[0]) continue;
        const urgent = ['flashGlow', 'flashPuffer', 'pull', 'turn', 'openChest', 'getKey', 'toLock', 'push'].includes(k);
        const done = p.id === st.lantern ? st.stats.flashes[p.id] : st.stats.opened[p.id];
        if (urgent && done >= 3 && chipT < 2.5) continue;
        if (!urgent && !(chipT > SW.chipAgain || (st.k === 0 && chipT < 4))) continue;
        ctx.save(); if (chipT > SW.chipAgain) ctx.globalAlpha = 0.8 + 0.2 * Math.sin(t * 5);
        boxes.push(chip(NAMES[p.id] + ': ' + lines[0], lines[1], p.x + p.w / 2, p.y - 30, PCOL[p.id], boxes, p.y + p.h + 14));
        ctx.restore();
      }
    }
    if (st.state === 'end') {
      const k = clamp((st.endT - 0.8) / 0.3, 0, 1);
      if (k > 0) {
        bigText('You found the treasure!', W / 2, 160, bg ? 40 : 38, C.gold, 0.6 + 0.4 * k);
        if (st.endT > 1.4) { pill(W / 2, 188, bg ? 420 : 340, 32, 'center'); text('Light and claw, together all the way!', W / 2, 204, bg ? 20 : 16, C.paper, 'center', 'body'); }
      }
    }
  }
  function drawGlimmer(st, x, y, face, t) {
    const r = 11, f = face >= 0 ? 1 : -1, wag = Math.sin(t * 9) * 0.25;
    // the glow
    const g = ctx.createRadialGradient(x, y, 2, x, y, 34);
    g.addColorStop(0, 'rgba(255,250,200,0.75)'); g.addColorStop(1, 'rgba(255,250,200,0)');
    ctx.fillStyle = g; circle(x, y, 34); ctx.fill();
    ctx.save(); ctx.translate(x, y); ctx.scale(f, 1);
    // tail
    ctx.save(); ctx.translate(-r * 0.9, 0); ctx.rotate(wag);
    ctx.fillStyle = '#ffc94a'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-10, -7); ctx.lineTo(-8, 0); ctx.lineTo(-10, 7); ctx.closePath(); ctx.fill();
    ctx.restore();
    // body
    const bgd = ctx.createRadialGradient(-3, -3, 1, 0, 0, r + 2);
    bgd.addColorStop(0, '#fffbd0'); bgd.addColorStop(1, '#ffd23f');
    ctx.fillStyle = bgd; ctx.beginPath(); ctx.ellipse(0, 0, r + 2, r, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(120,230,210,0.55)'; for (let k = 0; k < 3; k++) { circle(-5 + k * 4, 5, 1.6); ctx.fill(); }
    // fin
    ctx.fillStyle = '#ffb83a'; ctx.beginPath(); ctx.ellipse(-1, 2, 4, 2.5, 0.6 + Math.sin(t * 7) * 0.3, 0, TAU); ctx.fill();
    // the lantern lure on its stalk
    ctx.strokeStyle = '#d99a2a'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(4, -r + 2); ctx.quadraticCurveTo(10, -r - 10, 15, -r - 4); ctx.stroke();
    const pulse = 0.8 + 0.2 * Math.sin(t * 5);
    ctx.fillStyle = 'rgba(255,255,230,' + 0.5 * pulse + ')'; circle(15, -r - 3, 7); ctx.fill();
    ctx.fillStyle = '#ffffff'; circle(15, -r - 3, 3.4); ctx.fill();
    // face
    ctx.fillStyle = '#ffffff'; circle(5, -2, 4.6); ctx.fill();
    ctx.fillStyle = '#1c1a36'; circle(6, -2, 2.6); ctx.fill();
    ctx.fillStyle = '#ffffff'; circle(6.8, -3, 0.9); ctx.fill();
    ctx.strokeStyle = '#a86a1a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(7, 3.5, 3, 0.2, Math.PI - 0.6); ctx.stroke();
    ctx.fillStyle = 'rgba(255,130,150,0.5)'; circle(2, 3.5, 2); ctx.fill();
    ctx.restore();
    void st;
  }
  function chip(t1, t2, x, y, col, avoid, yBelow) {
    const z = big() ? 1.45 : 1, f1 = Math.round(13 * z), f2 = Math.round(12 * z);
    ctx.font = '700 ' + f1 + 'px ' + FONT;
    let w = ctx.measureText(t1).width;
    if (t2) { ctx.font = '700 ' + f2 + 'px ' + FONT; w = Math.max(w, ctx.measureText(t2).width); }
    w = Math.min(W - 16, w + 22 * z); const h = (t2 ? 38 : 22) * z;
    const x0 = clamp(x - w / 2, 8, W - 8 - w);
    let y0 = clamp(y - h, 92, H - 8 - h);
    // find a spot that covers no chip already placed and no one's head: above, below the feet, or stacked above/below a box
    const hits = yy => (avoid || []).some(b => x0 < b.x1 + 4 && x0 + w > b.x0 - 4 && yy < b.y1 + 4 && yy + h > b.y0 - 4);
    const cands = [y0];
    if (yBelow != null) cands.push(yBelow);
    for (const b of avoid || []) cands.push(b.y0 - h - 6, b.y1 + 6);
    const ok = cands.find(yy => yy >= 92 && yy <= H - 8 - h && !hits(yy));
    if (ok != null) y0 = ok;
    y0 = clamp(y0, 92, H - 8 - h);
    ctx.fillStyle = 'rgba(12,24,54,0.88)'; rr(x0, y0, w, h, 10 * z); ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 2; rr(x0, y0, w, h, 10 * z); ctx.stroke();
    text(t1, x0 + w / 2, y0 + 11 * z, f1, col, 'center', 'body');
    if (t2) text(t2, x0 + w / 2, y0 + 28 * z, f2, C.paper, 'center', 'body');
    return { x0, y0, x1: x0 + w, y1: y0 + h };
  }

  /* ---------- the HUD ---------- */
  function drawHud(st) {
    const bg = big(), fs = bg ? 20 : 14, h = bg ? 40 : 28;
    const bo = st.stats.bonks[0] + st.stats.bonks[1];
    const got = st.stats.gems[0] + st.stats.gems[1];
    const parts = [[fmtTime(G.time), st.rest ? '#9fd8ff' : C.paper], ['Bonks ' + bo, bo ? '#ffe9a8' : C.paper], ['◆ ' + got + '/' + st.stats.gemsAll, got ? C.gold : C.paper]];
    ctx.font = '700 ' + fs + 'px ' + FONT;
    const ws = parts.map(q => ctx.measureText(q[0]).width), gap = fs;
    const w = ws.reduce((a, b) => a + b, 0) + gap * (parts.length - 1) + 30, x0 = pill(W - 14, 12, w, h, 'right'), cy = 12 + h / 2 + 0.5;
    let x = x0 + 15;
    parts.forEach((q, i) => { text(q[0], x, cy, fs, q[1], 'left', 'body'); x += ws[i] + gap; });
    // the section map: the steps, Pip, Bo and the exit
    const mw = bg ? 200 : 260, mh = bg ? 30 : 24, mx = bg ? W / 2 - mw / 2 + 30 : W / 2 - mw / 2 + 10, my = 12;
    ctx.fillStyle = 'rgba(12,24,54,0.75)'; rr(mx - 10, my, mw + 20, mh + 4, (mh + 4) / 2); ctx.fill();
    const sx = v => mx + clamp(v / Math.max(1, st.len), 0, 1) * mw, ry = my + mh / 2 + 4;
    ctx.fillStyle = 'rgba(255,255,255,0.2)'; rr(mx, ry - 1.5, mw, 3, 1.5); ctx.fill();
    for (const s of st.steps) {
      if (s.kind === 'exit' || s.kind === 'chest') continue;
      const done = stepDone(st, s);
      ctx.fillStyle = done ? C.gold : 'rgba(255,255,255,0.45)';
      if (s.kind === 'door') rr(sx(s.x) - 2, ry - 7, 4, 14, 2); else { circle(sx(s.x), ry, 3.5); }
      ctx.fill();
    }
    G.players.forEach((p, i) => {
      const xx = sx(wx(st, p));
      ctx.fillStyle = PCOL[i]; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; circle(xx, ry - 6 + (i ? 1 : -1), bg ? 6 : 4.5); ctx.fill(); ctx.stroke();
    });
    ctx.fillStyle = C.gold; starPath(sx(st.chest ? st.chest.x : st.exitX + 60), ry - 2, 6, 2.6); ctx.fill();
    // gold help chips under the time pill
    const chips = [];
    if (st.hazards.some(q => q.gold)) chips.push('GOLD CORAL');
    if (Object.values(st.trig).some(q => q.gold && !q.on) || st.doors.some(d => d.gold && !d.opening) || st.puffers.some(q => q.gold && q.state !== 'gone') || st.crates.some(c => c.gold && !c.done)) chips.push('GOLD HELP');
    if (st.rest) chips.push('RESTING: THE CLOCK WAITS');
    let cy2 = 12 + h + 6;
    for (const c of chips) {
      const fs2 = bg ? 15 : 11;
      ctx.font = '700 ' + fs2 + 'px ' + FONT;
      const w2 = ctx.measureText(c).width + 20;
      pill(W - 14, cy2, w2, fs2 + 10, 'right');
      text(c, W - 24, cy2 + (fs2 + 10) / 2 + 0.5, fs2, c.startsWith('REST') ? '#9fd8ff' : C.gold, 'right', 'body');
      cy2 += fs2 + 14;
    }
    // job panels, bottom corners (the lantern's shows Glimmer's flash charge)
    for (const id of [0, 1]) {
      const lan = id === st.lantern, cpu = isCpu(id), P = st.pl[id];
      const t1 = NAMES[id] + ' · ' + (lan ? 'lantern' : 'grabber') + (cpu ? ' (computer)' : '');
      const kk = dev(id) === 'touch' ? 'round button' : key(id, 'act');
      const t2 = cpu ? (lan ? 'lights the way' : 'opens doors, grabs treasure') : (lan ? 'flash: ' + kk : 'grab: ' + kk);
      const pf = bg ? 17 : 13, pf2 = bg ? 15 : 12;
      ctx.font = '700 ' + pf + 'px ' + FONT;
      const pw = Math.max(ctx.measureText(t1).width, (ctx.font = '700 ' + pf2 + 'px ' + FONT, ctx.measureText(t2).width)) + 50;
      const ph = bg ? 50 : 40, px = id === 0 ? 12 : W - 12 - pw, py = H - ph - 10;
      ctx.fillStyle = 'rgba(12,24,54,0.78)'; rr(px, py, pw, ph, 12); ctx.fill();
      ctx.strokeStyle = PCOL[id]; ctx.lineWidth = 2; rr(px, py, pw, ph, 12); ctx.stroke();
      const ix = px + 20, iy = py + ph / 2;
      if (lan) {
        const ch = 1 - clamp(P.cd / SW.flashCD, 0, 1);
        ctx.fillStyle = 'rgba(255,255,255,0.15)'; circle(ix, iy, 12); ctx.fill();
        ctx.strokeStyle = ch >= 1 ? '#fff2a8' : 'rgba(255,242,168,0.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(ix, iy, 12, -Math.PI / 2, -Math.PI / 2 + TAU * ch); ctx.stroke();
        ctx.fillStyle = ch >= 1 ? '#ffd23f' : '#c9a83a'; ctx.beginPath(); ctx.ellipse(ix, iy, 7, 5.5, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#1c1a36'; circle(ix + 3, iy - 1, 1.5); ctx.fill();
      } else {
        ctx.strokeStyle = '#d9b45a'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(ix - 9, iy + 6); ctx.lineTo(ix + 2, iy - 2); ctx.stroke();
        ctx.strokeStyle = '#c8d4e4'; ctx.beginPath(); ctx.moveTo(ix + 2, iy - 2); ctx.lineTo(ix + 9, iy - 8); ctx.moveTo(ix + 2, iy - 2); ctx.lineTo(ix + 10, iy + 1); ctx.stroke();
        if (st.carry) drawKey(ix + 2, iy + 10, 0.55);
      }
      text(t1, px + 38, py + ph * 0.32, pf, PCOL[id], 'left', 'body');
      text(t2, px + 38, py + ph * 0.72, pf2, C.paper, 'left', 'body');
    }
    // news
    const n = st.news;
    if (n && G.mode === 'play') {
      const a = clamp(Math.min(n.t / 0.2, (n.life - n.t) / 0.3), 0, 1), nfs = bg ? 19 : 14, nh = bg ? 34 : 26, ny = bg ? 84 : 80;
      ctx.font = '700 ' + nfs + 'px ' + FONT;
      const nw = Math.min(W - 40, ctx.measureText(n.s).width + 32);
      const nx = W / 2;
      ctx.save(); ctx.globalAlpha = a;
      const px = pill(nx, ny, nw, nh, 'center');
      if (n.gold) { ctx.strokeStyle = C.gold; ctx.lineWidth = 2; rr(px, ny, nw, nh, nh / 2); ctx.stroke(); }
      text(n.s, nx, ny + nh / 2 + 0.5, nfs, n.gold ? C.gold : C.paper, 'center', 'body');
      ctx.restore();
    }
  }

  /* ---------- sounds ---------- */
  Sfx.extra.shipwreckFlash = function (p) { this.tone(660 * p, 0.25, 'sine', 0.05, 1500 * p); this.tone(1320 * p, 0.3, 'triangle', 0.025, 1980 * p, 0.05); };
  Sfx.extra.shipwreckWake = function () { [523, 784, 1047].forEach((f, i) => this.tone(f, 0.14, 'sine', 0.045, null, i * 0.07)); };
  Sfx.extra.shipwreckEek = function () { this.tone(900, 0.12, 'triangle', 0.05, 1400); this.tone(700, 0.2, 'sine', 0.04, 300, 0.12); };
  Sfx.extra.shipwreckPlink = function () { this.tone(1200, 0.06, 'sine', 0.03, 1600); };
  Sfx.extra.shipwreckBonk = function (p) { this.tone(260 * p, 0.14, 'sine', 0.06, 150 * p); this.tone(520 * p, 0.25, 'sine', 0.025, 900 * p, 0.08); };
  Sfx.extra.shipwreckPuff = function (p) { this.tone(180 * p, 0.25, 'sine', 0.06, 380 * p); };
  Sfx.extra.shipwreckBoop = function () { this.tone(500, 0.08, 'sine', 0.03, 700); };
  Sfx.extra.shipwreckLever = function () { this.tone(180, 0.1, 'square', 0.035, 120); this.tone(660, 0.12, 'triangle', 0.04, null, 0.08); };
  Sfx.extra.shipwreckCreak = function (p) { this.tone(140 * p, 0.12, 'sawtooth', 0.015, 190 * p); };
  Sfx.extra.shipwreckSnap = function (p) { this.tone(900 * p, 0.04, 'triangle', 0.025, 700 * p); };
  Sfx.extra.shipwreckKey = function () { [880, 1175, 1568].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.045, null, i * 0.06)); };
  Sfx.extra.shipwreckUnlock = function () { this.tone(330, 0.08, 'square', 0.03); [660, 990].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.045, null, 0.08 + i * 0.07)); };
  Sfx.extra.shipwreckDoor = function () { this.tone(110, 0.6, 'sawtooth', 0.02, 220); this.tone(330, 0.3, 'triangle', 0.03, 440, 0.3); };
  Sfx.extra.shipwreckCoin = function (p) { this.tone(1319 * p, 0.06, 'square', 0.025); this.tone(1760 * p, 0.09, 'square', 0.022, null, 0.05); };
  Sfx.extra.shipwreckGem = function (p) { [988 * p, 1319 * p, 1760 * p].forEach((f, i) => this.tone(f, 0.08, 'triangle', 0.04, null, i * 0.04)); };
  Sfx.extra.shipwreckScrape = function () { this.tone(90, 0.12, 'sawtooth', 0.018, 70); };
  Sfx.extra.shipwreckThud = function () { this.tone(110, 0.2, 'sine', 0.07, 60); };
  Sfx.extra.shipwreckNo = function () { this.tone(300, 0.1, 'triangle', 0.03, 220); };
  Sfx.extra.shipwreckGold = function () { [784, 988, 1319].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.05, null, i * 0.06)); };
  Sfx.extra.shipwreckClear = function () { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.13, 'triangle', 0.055, null, i * 0.08)); };
  Sfx.extra.shipwreckWin = function () { [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => this.tone(f, 0.18, 'triangle', 0.06, null, i * 0.1)); };
})();
