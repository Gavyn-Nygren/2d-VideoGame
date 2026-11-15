/* Pip & Bo - Level 38-2 Laser Vault Heist (team, World 38 Operation Midnight). */
'use strict';

/* ===== 38-2 Laser Vault Heist (mode 'spyvault', team, scrolls sideways, player-paced) =====
   Act two: the vault hall. Every beam is visible: thin red lines with a glow, a sparkle where they land, green receiver
   lenses on the walls. Side view; world x grows to the right, world y is height above the polished floor (screen
   y = FY - y). The camera sits between the two; they stay within S.leash px of each other. The mode owns the tick, the
   picture and the HUD (ownStep + ownHUD + noFalls).
   ROLES swap each stretch (Pip is the MIRROR in stretches 1 and 3, Bo in 2 and 4):
   - MIRROR: walks and jumps. ACTION HELD = raise the brass mirror: a beam that meets it stops there and bounces off
     the way it's tilted (▲ ▼ while holding turn the bounce through five directions: forward, up-forward, up, up-back,
     back; it starts at up). While it's up the agent is safe from beams, walks at half speed and can't jump.
   - RUNNER: faster. ▲ jump, ▼ duck and crawl, ▼ while running = slide (S.slideT s, under waist and head beams,
     S.slideCD s cooldown). ACTION = grab a case or press a button (and the long hold on the diamond's pedestal).
   BEAMS are rays from emitters (traced each step: they stop at the floor, the ceiling, a shut door, a receiver, or an
   agent, and bounce off the hand mirror and the fixed wall mirrors): still beams (ankle: jump; waist and head: duck,
   slide, or walk through behind the raised mirror), upright beams from the ceiling (only the mirror stops them: the
   runner goes under the caught beam), sweepers (a ceiling wiper: go when it's up), blinkers (on S.blinkOn s, off
   S.blinkOff s, a rising hum first), curtains (a wall of beams, powered by one upright source beam: catch the source
   and the curtain dies while it's held), moving grids (a cage that tracks along the hall: light its receiver to power
   it down), receiver doors (open while their receivers are lit; some need two at once, one from a wall mirror that a
   floor button turns), pressure floors (stretch 3 on: a tile sinks S.tileT s after you stand on it and a trap beam
   fires; keep moving or slide). A far-side button latches a curtain, grid or door off (and its source beam with it),
   so the mirror agent can follow.
   ZAP: touching a beam buzzes, frizzes hair and ears for 2 s, hops the agent back S.hop px, fills the shared ALARM
   meter by a third and starts the SHUTTER, a steel wall behind the pair that rumbles forward for S.shutT s. If it
   reaches an agent, or the Alarm fills, it's a LOCKDOWN: back to the stretch's checkpoint (halfway) or start.
   COLLECTABLES: 20 keycards and gems in display cases (5 a stretch; the runner grabs them).
   DIAMOND ROOM (stretch 4): three receivers light up one at a time; the mirror bounces the beam into each for S.rcvT s,
   and the cage around the Sunrise Diamond opens a side each time. The runner holds the action S.swapT s on the
   pedestal (letting go early resets the needle) to swap the diamond for a snow globe. Then both walk out pleased, the
   cat wakes up and presses the big red button: the alarm, the chase song, a vent pops open and both jump in.
   GOLD HELP (3 Zaps in a stretch, both playing): a gold mirror: a bigger catch area, the blinkers hum earlier and the
   shutter moves 30% slower, for the rest of the stretch.
   MODES.spyvault.plan(st) is what each agent should do now: the prompts, the HUD and the computer brain read it. */
(() => {
  const K = SPY, TAU = Math.PI * 2, COL = SPY.COL;
  const S = {
    run: 175, walk: 150, slow: 75, crawl: 80, slideV: 280, slideT: 0.5, slideCD: 1.0, grav: 1500, jumpV: 500, leash: 520,
    hStand: 46, hDuck: 24, hSlide: 16, hw: 9, mirH: 70, mirW: 12, goldMirW: 18, hop: 40, zapInv: 1.0, frizz: 2,
    alarmZap: 34, drain: 2.2, shutT: 6, shutV: 80, goldShut: 0.7, blinkOn: 1.5, blinkOff: 1.0, hum: 0.4, goldHum: 0.8,
    tileT: 0.4, trapT: 1.0, rcvT: 1.0, swapT: 1.5, lockT: 2.2, idleWait: 12, goldT: 185, silverT: 320, loot: 20,
  };
  const CH = 280, FY = 440;
  const TILT = [0, 45, 90, 135, 180].map(d => d * Math.PI / 180);
  const TILT_NAME = ['forward', 'up-forward', 'up', 'up-back', 'back'];

  /* ---------- the four stretches ---------- */
  // every beam is an emitter: { x, y, ang (0 = right, PI/2 = up), kind 'still' | 'sweep' | 'blink' | 'trap', len, ... }
  function build(k) {
    const L = { k, em: [], rcv: [], wm: [], doors: [], curt: [], grids: [], btns: [], cases: [], tiles: [], steps: [], len: 2400 };
    const em = o => { o.id = L.em.length; o.kind = o.kind || 'still'; o.len = o.len || 3000; L.em.push(o); return o; };
    const rcv = (x, y) => { const r = { id: L.rcv.length, x, y, r: 11 }; L.rcv.push(r); return r; };
    const flat = (x0, x1, y) => em({ x: x0, y, ang: 0, len: x1 - x0, post: [x0, x1] });       // a still beam between two posts
    const upright = x => em({ x, y: CH - 2, ang: -Math.PI / 2, up: true });                     // a still beam from the ceiling
    const caseAt = (x, kind) => { L.cases.push({ x, kind: kind || (L.cases.length % 2 ? 'gem' : 'card') }); L.steps.push({ t: 'case', x, i: L.cases.length - 1 }); };
    const pose = (x0, x1, p, ems) => L.steps.push({ t: 'pose', x0, x1, pose: p, ems });
    const timed = (x0, x1, wx, ems) => L.steps.push({ t: 'time', x0, x1, wx, ems });
    const cp = x => { L.cp = { x, step: L.steps.length }; };
    // hold: the mirror stands at `spot` with `tilt`; the runner waits at `wait`, then crosses to x1 (and the button)
    const hold = o => L.steps.push(Object.assign({ t: 'hold' }, o));
    const btn = (x, does) => { const b = { id: L.btns.length, x, does, n: 0 }; L.btns.push(b); return b; };
    if (k === 0) {
      // The Gallery: still beams, one curtain, the first receiver door
      caseAt(300);
      const a = flat(470, 540, 10); pose(470, 540, 'jump', [a.id]);
      const b = flat(700, 800, 30); pose(700, 800, 'duck', [b.id]);
      caseAt(900);
      const c = flat(1000, 1090, 42); pose(1000, 1090, 'duck', [c.id]);
      cp(1190);
      // the curtain: an upright source beam into its power box, five bars beyond it
      const src = upright(1330); const cu = { id: 0, x0: 1380, x1: 1440, src: src.id, off: false }; L.curt.push(cu); src.feeds = { curt: 0 };
      const b1 = btn(1520, { latch: 'curt', id: 0 });
      hold({ spot: 1330, tilt: 2, wait: 1270, x1: 1520, feed: src.id, target: { curt: 0 }, btn: b1.id });
      caseAt(1480);
      // the receiver door: an upright feed, bounced up-forward into a lens on the ceiling
      const f2 = upright(1700); const r1 = rcv(1700 + (CH - S.mirH), CH - 1);
      L.doors.push({ id: 0, x: 1960, rcv: [r1.id], open: false, latched: false });
      const b2 = btn(2000, { latch: 'door', id: 0 });
      hold({ spot: 1700, tilt: 1, wait: 1640, x1: 2000, feed: f2.id, target: { door: 0 }, btn: b2.id });
      caseAt(2060);
      const d = flat(2160, 2230, 42); pose(2160, 2230, 'duck', [d.id]);
      caseAt(2300);
      L.len = 2450;
    } else if (k === 1) {
      // The Coin Room: sweepers, blinkers, a wall mirror to turn
      caseAt(280);
      const s1 = em({ x: 560, y: CH - 2, ang: -Math.PI / 2, kind: 'sweep', len: 250, per: 4.4, ph: 0 }); timed(420, 700, 360, [s1.id]);
      const k1 = em({ x: 820, y: CH - 2, ang: -Math.PI / 2, kind: 'blink', ph: 0, up: true }); timed(808, 832, 770, [k1.id]);
      caseAt(900);
      const k2 = em({ x: 1000, y: CH - 2, ang: -Math.PI / 2, kind: 'blink', ph: 1.25, up: true }); timed(988, 1012, 950, [k2.id]);
      cp(1100);
      caseAt(1200);
      // a beam high on the wall hits the wall mirror: notch 0 sends it straight down (an upright beam across the hall),
      // notch 1 up-forward into the door's lens
      em({ x: 1160, y: 200, ang: 0, wall: true });
      const W1 = { id: 0, x: 1400, y: 200, notch: [-90, 45].map(d => d * Math.PI / 180), n: 0 }; L.wm.push(W1);
      const r1 = rcv(1400 + (CH - 200), CH - 1);
      L.doors.push({ id: 0, x: 1560, rcv: [r1.id], open: false, latched: false });
      const b1 = btn(1330, { turn: 0 });
      L.steps.push({ t: 'turn', btn: b1.id, wm: 0, want: 1, x: 1330 });
      caseAt(1640);
      // an upright beam: the mirror catches it and the runner goes under
      const g1 = upright(1800); hold({ spot: 1800, tilt: 2, wait: 1740, x1: 1830, feed: g1.id, target: null });
      const s2 = em({ x: 2040, y: CH - 2, ang: -Math.PI / 2, kind: 'sweep', len: 250, per: 4.0, ph: 1.3 }); timed(1900, 2180, 1880, [s2.id]);
      caseAt(2270);
      L.len = 2420;
    } else if (k === 2) {
      // The Hall of Mirrors: pressure floors, a moving grid (a long bounce off two wall mirrors), a two-lens door
      caseAt(260);
      const t1 = em({ x: 392, y: 28, ang: 0, len: 216, kind: 'trap', post: [392, 608] });
      for (let i = 0; i < 5; i++) L.tiles.push({ x0: 400 + i * 40, x1: 440 + i * 40, trap: t1.id });
      L.steps.push({ t: 'tiles', x0: 400, x1: 600 });
      caseAt(690);
      // the grid's lens: hand mirror (up-back) -> wall mirror 1 (right, high) -> wall mirror 2 (up) -> the lens
      const f1 = upright(800);
      L.wm.push({ id: 0, x: 800 - (210 - S.mirH), y: 210, notch: [0], n: 0, fixed: true });
      L.wm.push({ id: 1, x: 1300, y: 210, notch: [Math.PI / 2], n: 0, fixed: true });
      const rg = rcv(1300, CH - 1);
      L.grids.push({ id: 0, xa: 910, xb: 1150, w: 100, per: 6, rcv: rg.id, off: false, latched: false });
      const b1 = btn(1240, { latch: 'grid', id: 0 });
      hold({ spot: 800, tilt: 3, wait: 740, x1: 1240, feed: f1.id, target: { grid: 0 }, btn: b1.id, zone: [850, 1210] });
      caseAt(1275);
      cp(1330);
      // the two-lens door: one lens from the hand mirror, one from a wall mirror the runner turns
      em({ x: 1380, y: 160, ang: 0, wall: true });
      L.wm.push({ id: 2, x: 1560, y: 160, notch: [Math.PI / 2, Math.PI / 4], n: 0 });
      const rB = rcv(1560 + (CH - 160), CH - 1);
      const f2 = upright(1430); const rA = rcv(1430 + (CH - S.mirH), CH - 1);
      L.doors.push({ id: 0, x: 1730, rcv: [rA.id, rB.id], open: false, latched: false });
      const b2 = btn(1405, { turn: 2 });
      L.steps.push({ t: 'turn', btn: b2.id, wm: 2, want: 1, x: 1405 });
      const b3 = btn(1770, { latch: 'door', id: 0 });
      hold({ spot: 1430, tilt: 1, wait: 1390, x1: 1770, feed: f2.id, target: { door: 0 }, btn: b3.id });
      caseAt(1800);
      const t2 = em({ x: 1872, y: 28, ang: 0, len: 176, kind: 'trap', post: [1872, 2048] });
      for (let i = 0; i < 4; i++) L.tiles.push({ x0: 1880 + i * 40, x1: 1920 + i * 40, trap: t2.id });
      L.steps.push({ t: 'tiles', x0: 1880, x1: 2040 });
      caseAt(2120);
      L.len = 2280;
    } else {
      // The Diamond Room
      caseAt(250);
      const a = flat(400, 480, 30); pose(400, 480, 'duck', [a.id]);
      caseAt(545);
      const b = flat(600, 660, 10); pose(600, 660, 'jump', [b.id]);
      caseAt(740);
      const s1 = em({ x: 900, y: CH - 2, ang: -Math.PI / 2, kind: 'sweep', len: 250, per: 4.2, ph: 0.4 }); timed(760, 1040, 720, [s1.id]);
      cp(1110);
      caseAt(1160);
      // the feed and the three lenses: forward onto a post, up-forward and up-back onto the ceiling
      const F = 1300, f = upright(F);
      const r0 = rcv(1460, S.mirH), r1 = rcv(F + (CH - S.mirH), CH - 1), r2 = rcv(F - (CH - S.mirH), CH - 1);
      L.dia = { F, rcv: [r0.id, r1.id, r2.id], tilt: [0, 1, 3], ped: 1600, cage: [1550, 1650], feed: f.id, cat: 1780, exit: 1860 };
      L.steps.push({ t: 'dia', spot: F, wait: 1250, ped: 1600 });
      caseAt(1700);
      L.steps.push({ t: 'exit', x: 1850 });
      L.len = 1960;
    }
    if (k < 3) L.steps.push({ t: 'end', x: L.len - 60 });
    return L;
  }

  /* ---------- state ---------- */
  function room(st, def, k) {
    st.k = k; st.L = build(k);
    st.mirId = k % 2 === 0 ? 0 : 1; st.runId = 1 - st.mirId;
    st.rc = { zaps: 0 }; st.gold = false; st.cp = null; st.segStart = G.time; st.state = 'go'; st.endT = 0;
    st.got = st.L.cases.map(() => false);
    st.dia = st.L.dia ? { order: shuffle([0, 1, 2]), n: 0, hold: 0, swap: 0, swapped: false, cat: 0 } : null;
    place(st, false);
    K.fx(st);
    K.actLabels(st.mirId === 0 ? ['mirror', 'grab'] : ['grab', 'mirror'], 'grab');
    if (k === 0) st.radioDue = 0.5;
  }
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function place(st, atCp) {
    const L = st.L, x0 = atCp && st.cp ? st.cp.x : 90;
    st.ag = [0, 1].map(id => ({ id, x: x0 + (id === st.runId ? 40 : 0), y: 0, vy: 0, vx: 0, ground: true, face: 1, duck: false, slideT: 0, slideCD: 0,
      mirror: false, tilt: 2, inv: 0, frizz: 0, step: atCp && st.cp ? st.cp.step : 0, prevUp: false, prevDown: false, prevAct: false, onTile: -1, tileT: 0, walkT: 0 }));
    st.T = 0; st.alarm = 0; st.shut = null; st.trap = {}; st.sunk = {};
    if (!atCp || !st.cp) {
      for (const c of L.curt) c.off = false;
      for (const d of L.doors) { d.latched = false; d.open = false; }
      for (const g of L.grids) { g.latched = false; g.off = false; }
      for (const w of L.wm) w.n = 0;
      for (const e of L.em) e.dead = false;
    } else {
      // things past the checkpoint reset; things before it stay done
      for (const c of L.curt) if (c.x0 > st.cp.x) c.off = false;
      for (const d of L.doors) if (d.x > st.cp.x) { d.latched = false; d.open = false; }
      for (const g of L.grids) if (g.xa > st.cp.x) { g.latched = false; g.off = false; }
      for (const w of L.wm) if (w.x > st.cp.x && !w.fixed) w.n = 0;
      for (const e of L.em) if (e.x > st.cp.x) e.dead = false;
    }
    if (st.dia && !st.dia.swapped) { st.dia.n = 0; st.dia.hold = 0; st.dia.swap = 0; }
    st.camX = clamp(x0 - 300, 0, L.len - W);
    st.prevMir = [false, false];
    trace(st);
  }

  /* ---------- the beams ---------- */
  function emOn(st, e, T) {
    if (e.dead) return false;
    if (e.kind === 'blink') { const c = (T + e.ph) % (S.blinkOn + S.blinkOff); return c < S.blinkOn; }
    if (e.kind === 'trap') return (st.trap[e.id] || 0) > 0;
    if (e.feeds && e.feeds.curt != null && st.L.curt[e.feeds.curt].off) return false;
    return true;
  }
  // how far into the hum before a blinker comes on (0 = not humming)
  function humOf(st, e, T) {
    if (e.kind !== 'blink') return 0;
    const c = (T + e.ph) % (S.blinkOn + S.blinkOff), hum = st.gold ? S.goldHum : S.hum;
    const left = S.blinkOn + S.blinkOff - c;
    return c >= S.blinkOn && left < hum ? 1 - left / hum : 0;
  }
  function emAng(e, T) {
    if (e.kind === 'sweep') return -Math.PI / 2 + (Math.PI / 2) * Math.cos(TAU * (T / e.per) + e.ph);
    return e.ang;
  }
  const boxOf = (st, a) => {
    if (a.mirror) { const w = st.gold ? S.goldMirW : S.mirW; return { x0: a.x - w, x1: a.x + w, y0: a.y, y1: a.y + S.mirH, mir: true }; }
    const h = a.slideT > 0 ? S.hSlide : a.duck ? S.hDuck : S.hStand;
    return { x0: a.x - S.hw, x1: a.x + S.hw, y0: a.y, y1: a.y + h };
  };
  // the ray from (ox, oy) along angle ang: the nearest thing it meets. ag: the agents' boxes (null to skip)
  function cast(st, ox, oy, ang, maxL, boxes, skip) {
    const dx = Math.cos(ang), dy = Math.sin(ang), L = st.L;
    let best = maxL, hit = { t: 'air' };
    const consider = (t, h) => { if (t > 0.5 && t < best) { best = t; hit = h; } };
    if (dy < -1e-6) consider((0 - oy) / dy, { t: 'floor' });
    if (dy > 1e-6) consider((CH - oy) / dy, { t: 'ceil' });
    if (Math.abs(dx) > 1e-6) {
      for (const d of L.doors) if (!d.open) { const t = (d.x - ox) / dx, y = oy + dy * t; if (y >= 0 && y <= CH) consider(t, { t: 'door' }); }
      for (const wx of [0, L.len]) { const t = (wx - ox) / dx; consider(t, { t: 'wall' }); }
    }
    const circ = (cx, cy, r, h) => {
      const fx = ox - cx, fy = oy - cy, b = fx * dx + fy * dy, c = fx * fx + fy * fy - r * r, disc = b * b - c;
      if (disc >= 0) { const t = -b - Math.sqrt(disc); consider(t, h); }
    };
    for (const r of L.rcv) circ(r.x, r.y, r.r, { t: 'rcv', id: r.id });
    for (const w of L.wm) if (skip !== 'wm' + w.id) circ(w.x, w.y, 9, { t: 'wm', id: w.id });
    for (const c of L.curt) { const e = L.em[c.src]; if (e.feeds) circ(e.x, 6, 7, { t: 'power', id: c.id }); }
    if (boxes) for (const bx of boxes) {
      if (!bx || skip === 'a' + bx.id) continue;
      // ray against an axis box (slab method)
      let t0 = -1e9, t1 = 1e9;
      for (const [o, d, lo, hi] of [[ox, dx, bx.x0, bx.x1], [oy, dy, bx.y0, bx.y1]]) {
        if (Math.abs(d) < 1e-9) { if (o < lo || o > hi) { t0 = 1e9; break; } continue; }
        let a = (lo - o) / d, b = (hi - o) / d; if (a > b) [a, b] = [b, a];
        t0 = Math.max(t0, a); t1 = Math.min(t1, b);
      }
      if (t0 <= t1 && t1 > 0.5) consider(Math.max(t0, 0.6), { t: 'ag', id: bx.id, mir: bx.mir });
    }
    return { t: best, x: ox + dx * best, y: oy + dy * best, hit };
  }
  // traces every beam: the polylines to draw, which lenses are lit, which agents a beam reaches, which curtains are fed
  function traceAt(st, T, boxes) {
    const L = st.L, out = { lines: [], lit: new Set(), hits: [], fed: new Set(), caught: new Set() };
    for (const e of L.em) {
      if (!emOn(st, e, T)) continue;
      let ox = e.x, oy = e.y, ang = emAng(e, T), len = e.len, skip = null;
      const pts = [[ox, oy]];
      for (let bounce = 0; bounce < 6; bounce++) {
        const r = cast(st, ox, oy, ang, len, boxes, skip);
        pts.push([r.x, r.y]);
        const h = r.hit;
        if (h.t === 'rcv') { out.lit.add(h.id); break; }
        if (h.t === 'power') { out.fed.add(h.id); break; }
        if (h.t === 'wm') { const w = L.wm[h.id]; ox = w.x; oy = w.y; pts[pts.length - 1] = [ox, oy]; ang = w.notch[w.n]; skip = 'wm' + w.id; len = 3000; continue; }
        if (h.t === 'ag') {
          if (h.mir) {
            const a = st.ag[h.id]; out.caught.add(e.id);
            ox = r.x; oy = r.y; ang = a.face > 0 ? TILT[a.tilt] : Math.PI - TILT[a.tilt]; skip = 'a' + h.id; len = 3000;
            out.flash = out.flash || []; out.flash.push(h.id);
            continue;
          }
          out.hits.push({ id: h.id, em: e.id });
          break;
        }
        break;
      }
      out.lines.push({ e: e.id, pts, hum: 0 });
    }
    // humming blinkers (drawn faint)
    for (const e of L.em) if (!emOn(st, e, T) && humOf(st, e, T) > 0) {
      const r = cast(st, e.x, e.y, emAng(e, T), e.len, null, null);
      out.lines.push({ e: e.id, pts: [[e.x, e.y], [r.x, r.y]], hum: humOf(st, e, T) });
    }
    return out;
  }
  const liveBoxes = st => st.ag.map(a => a.inv > 0 && !a.mirror ? null : Object.assign(boxOf(st, a), { id: a.id }));
  function trace(st) {
    st.tr = traceAt(st, st.T, liveBoxes(st));
    const L = st.L;
    for (const d of L.doors) d.open = d.latched || d.rcv.every(r => st.tr.lit.has(r));
    // a door that opened changes the rays: trace once more so beams pass the open door this step
    st.tr = traceAt(st, st.T, liveBoxes(st));
    for (const c of L.curt) c.on = !c.off && st.tr.fed.has(c.id);
    for (const g of L.grids) g.off = g.latched || st.tr.lit.has(g.rcv);
  }
  // the moving grids' x now
  const gridX = (g, T) => g.xa + (g.xb - g.xa) * (0.5 - 0.5 * Math.cos(TAU * T / g.per));
  // the curtains, grids and trap tiles that would zap a box at time T (bars, not rays)
  function barHit(st, b, T, gridT) {
    const L = st.L;
    for (const c of L.curt) if (c.on && b.x1 > c.x0 && b.x0 < c.x1) return 'curtain';
    for (const g of L.grids) if (!g.off) { const gx = gridX(g, gridT == null ? T : gridT); if (b.x1 > gx - g.w / 2 && b.x0 < gx + g.w / 2) return 'grid'; }
    if (L.dia && st.dia.n < 3 && b.x1 > L.dia.cage[0] && b.x0 < L.dia.cage[1]) return 'cage';
    return null;
  }

  /* ---------- the tick ---------- */
  function tick(st, dt) {
    if (!st.L) return;
    K.track(st);
    st.waiting = st.state === 'go' && K.idle(st, dt, S.idleWait);
    const live = G.introT <= 0 && !st.waiting && (st.state === 'go' || st.state === 'out');
    st.clock += dt;
    if (live) {
      st.T += dt;
      if (st.radioDue != null && (st.radioDue -= dt) <= 0) { st.radioDue = null; K.control(st, K.STORY.spyvault); }
      for (const a of st.ag) agent(st, a, dt);
      tiles(st, dt);
      trace(st);
      zaps(st);
      buttons(st);
      progress(st);
      shutter(st, dt);
      if (st.dia) diamond(st, dt);
      st.alarm = Math.max(0, st.alarm - S.drain * dt);
      if (st.alarm >= 100) lockdown(st, 'The alarm! Lockdown!');
      if (st.state === 'go' && st.k < 3 && st.ag.every(a => a.x >= st.L.len - 90)) {
        st.state = 'end'; st.endT = 0; st.stats.roomT[st.k] = G.time - st.segStart; Sfx.play('spySting');
        K.pop(st, W / 2, 200, (G.level.def.rooms[st.k].done || 'Through!') + ' Next stretch!', '#ffffff', 22);
      }
    } else if (st.state === 'lock') { st.endT += dt; if (st.endT > S.lockT) { place(st, true); st.state = 'go'; K.msg(st, 'Back to the checkpoint. Steady now.', '#ffffff', 2.4); } }
    else if (st.state === 'end') { st.endT += dt; if (st.endT > 1.8) nextRoom(); }
    else if (st.state === 'cat') catStep(st, dt);
    K.tickControl(st, dt);
    for (const p of G.players) { p.pendingJump = false; p.pendingAct = false; }
    for (const a of st.ag) { if (a.frizz > 0) a.frizz -= dt; if (a.inv > 0) a.inv -= dt; }
    camera(st, dt);
    K.tickFx(st, dt);
    mirrorOut(st);
  }
  function wants(id) {
    const i = G.players[id].input;
    return { x: (i.right ? 1 : 0) - (i.left ? 1 : 0), up: !!(i.jump || i.up), down: !!i.down, act: !!i.act };
  }
  const partnerOf = (st, a) => st.ag[1 - a.id];
  function agent(st, a, dt) {
    const w = wants(a.id), o = partnerOf(st, a), isMir = a.id === st.mirId;
    const upP = w.up && !a.prevUp, downP = w.down && !a.prevDown;
    a.prevUp = w.up; a.prevDown = w.down;
    if (a.slideCD > 0) a.slideCD -= dt;
    let vx = 0;
    if (isMir) {
      const was = a.mirror;
      a.mirror = w.act && a.ground;
      if (a.mirror && !was) { a.tilt = 2; Sfx.play('spyvaultMirrorUp'); }
      if (a.mirror) {
        if (upP) { a.tilt = Math.min(4, a.tilt + 1); Sfx.play('spyvaultMirrorTilt'); }
        if (downP) { a.tilt = Math.max(0, a.tilt - 1); Sfx.play('spyvaultMirrorTilt'); }
        vx = w.x * S.slow;
      } else {
        vx = w.x * S.walk;
        if (w.x) a.face = w.x;
        if (upP && a.ground) { a.vy = S.jumpV; a.ground = false; Sfx.play('spyvaultJump'); }
      }
      a.duck = false;
    } else {
      a.mirror = false;
      if (a.slideT > 0) { a.slideT -= dt; vx = a.face * S.slideV; if (a.slideT <= 0) a.slideCD = S.slideCD; }
      else {
        a.duck = w.down && a.ground;
        if (w.x) a.face = w.x;
        if (downP && a.ground && w.x && a.slideCD <= 0) { a.slideT = S.slideT; a.duck = false; vx = a.face * S.slideV; Sfx.play('spyvaultSlide'); }
        else vx = w.x * (a.duck ? S.crawl : S.run);
        if (upP && a.ground && !a.duck) { a.vy = S.jumpV; a.ground = false; Sfx.play('spyvaultJump'); }
      }
      // grab or press
      if (w.act && !a.prevAct) runnerAct(st, a);
    }
    a.prevAct = w.act;
    // move along x: leash, the hall's ends, shut doors
    let nx = a.x + vx * dt;
    if (Math.abs(nx - o.x) > S.leash && Math.abs(nx - o.x) > Math.abs(a.x - o.x)) { nx = a.x; if (G.time - (a.leashT || 0) > 1.5) { a.leashT = G.time; K.pop(st, a.x - st.camX, FY - 80, 'Wait for ' + NAMES[o.id] + '!', '#ffffff', 15); } }
    nx = clamp(nx, 20, st.L.len - 20);
    for (const d of st.L.doors) if (!d.open) {
      if (a.x <= d.x - S.hw && nx > d.x - S.hw) nx = d.x - S.hw;
      if (a.x >= d.x + S.hw && nx < d.x + S.hw) nx = d.x + S.hw;
    }
    a.vx = (nx - a.x) / dt; a.x = nx;
    if (Math.abs(a.vx) > 5 && a.ground) { a.walkT += dt; if (a.walkT > 0.28) { a.walkT = 0; Sfx.play(a.slideT > 0 ? 'spyvaultSlide' : 'spyvaultStepTap'); } }
    // up and down
    if (!a.ground) { a.vy -= S.grav * dt; a.y += a.vy * dt; if (a.y <= 0) { a.y = 0; a.vy = 0; a.ground = true; } }
  }
  function runnerAct(st, a) {
    const L = st.L;
    // a case
    for (let i = 0; i < L.cases.length; i++) if (!st.got[i] && Math.abs(a.x - L.cases[i].x) < 24) {
      st.got[i] = true; st.loot++; st.lootGot[st.k] = (st.lootGot[st.k] || 0) + 1; st.stats.cards++;
      Sfx.play('spyIntel'); Sfx.play('spyvaultCaseOpen');
      K.pop(st, L.cases[i].x - st.camX, FY - 80, (L.cases[i].kind === 'gem' ? 'Gem ' : 'Keycard ') + st.loot + '/' + S.loot, '#fff1c0', 18);
      K.spark(st, L.cases[i].x - st.camX, FY - 52, 8);
      return;
    }
    // a button
    for (const b of L.btns) if (Math.abs(a.x - b.x) < 22) {
      const d = b.does;
      if (d.turn != null) { const wm = L.wm[d.turn]; wm.n = (wm.n + 1) % wm.notch.length; Sfx.play('spyvaultMirrorTurn'); K.pop(st, wm.x - st.camX, FY - wm.y - 26, 'Click!', '#ffffff', 15); }
      else if (!b.done) {
        b.done = true; Sfx.play('spyvaultButtonClunk');
        if (d.latch === 'curt') { L.curt[d.id].off = true; L.em[L.curt[d.id].src].dead = true; }
        if (d.latch === 'door') { L.doors[d.id].latched = true; for (const s of L.steps) if (s.target && s.target.door === d.id) L.em[s.feed].dead = true; }
        if (d.latch === 'grid') { L.grids[d.id].latched = true; for (const s of L.steps) if (s.target && s.target.grid === d.id) L.em[s.feed].dead = true; }
        st.stats.latched++;
        K.pop(st, b.x - st.camX, FY - 60, 'Shut off!', '#8fe3b0', 16);
      }
      return;
    }
  }
  function buttons(st) {
    // a fresh catch: the mirror flashes and a ping
    for (const a of st.ag) {
      const c = st.tr.flash && st.tr.flash.includes(a.id);
      if (c && !st.prevMir[a.id]) { Sfx.play('spyvaultMirrorPing'); st.stats.bent++; }
      st.prevMir[a.id] = c;
    }
    const lit = st.tr.lit.size;
    if (lit > (st.litN || 0)) { Sfx.play('spyvaultReceiverChime'); st.stats.lit += lit - (st.litN || 0); }
    st.litN = lit;
    for (const d of st.L.doors) { if (d.open !== d.was) Sfx.play(d.open ? 'spyvaultDoorOpen' : 'spyvaultDoorShut'); d.was = d.open; }
  }
  function tiles(st, dt) {
    for (const id in st.trap) if (st.trap[id] > 0) st.trap[id] -= dt;
    for (const a of st.ag) {
      let on = -1;
      if (a.ground && a.slideT <= 0) st.L.tiles.forEach((tl, i) => { if (a.x > tl.x0 && a.x < tl.x1) on = i; });
      if (on !== a.onTile) { a.onTile = on; a.tileT = 0; }
      if (on >= 0) {
        a.tileT += dt;
        if (a.tileT > S.tileT && !st.sunk[on]) {
          const tl = st.L.tiles[on]; st.sunk[on] = 1.2; st.trap[tl.trap] = S.trapT;
          Sfx.play('spyvaultTileSink'); Sfx.play('spyvaultSweepWhirr');
        }
      }
    }
    for (const i in st.sunk) if (st.sunk[i] > 0) st.sunk[i] -= dt;
  }
  function zaps(st) {
    if (st.state !== 'go') return;
    const hitIds = new Set(st.tr.hits.map(h => h.id));
    for (const a of st.ag) if (a.inv <= 0 && !hitIds.has(a.id) && barHit(st, boxOf(st, a), st.T)) hitIds.add(a.id);
    for (const id of hitIds) zap(st, st.ag[id]);
  }
  function zap(st, a) {
    if (a.inv > 0) return;
    a.inv = S.zapInv; a.frizz = S.frizz; a.mirror = false; a.slideT = 0;
    a.x = Math.max(20, a.x - S.hop); a.vy = 220; a.ground = false; a.y = Math.max(a.y, 1);
    st.alarm = Math.min(100, st.alarm + S.alarmZap); st.stats.zaps++; st.rc.zaps++;
    Sfx.play('spyvaultZapBuzz'); Sfx.play('spyvaultShutterRumble');
    K.pop(st, a.x - st.camX, FY - 80, 'Zap!', '#ffd0c8', 20); K.spark(st, a.x - st.camX, FY - 30 - a.y, 10);
    const minX = Math.min(st.ag[0].x, st.ag[1].x);
    if (!st.shut) st.shut = { x: Math.max(0, Math.min(st.camX - 20, minX - 260)), t: 0 }; else st.shut.t = 0;
    if (!st.gold && st.rc.zaps >= 3 && K.both(st)) { st.gold = true; K.goldHelp(st, 'Gold mirror! Bigger, and the shutter is slower.'); }
  }
  function shutter(st, dt) {
    const sh = st.shut;
    if (!sh || st.state !== 'go') return;
    sh.t += dt;
    if (sh.t < S.shutT) {
      sh.x += S.shutV * (st.gold ? S.goldShut : 1) * dt;
      if (st.ag.some(a => a.x - S.hw <= sh.x)) lockdown(st, 'The shutter got you! Lockdown!');
    } else { sh.x -= 260 * dt; if (sh.x < st.camX - 80) st.shut = null; }
  }
  function lockdown(st, why) {
    if (st.state !== 'go') return;
    st.state = 'lock'; st.endT = 0; st.stats.locks++; st.shut = null;
    Sfx.play('spyAlarm'); Sfx.play('spyvaultShutterSlam');
    K.msg(st, why, '#ffd0c8', 2.2);
  }
  // each agent's step on the route, and the checkpoint
  function progress(st) {
    const L = st.L, R = L.steps;
    for (const a of st.ag) {
      let n = a.step;
      while (n < R.length - 1 && stepDone(st, a, R[n])) n++;
      a.step = n;
    }
    if (L.cp && !st.cp && st.ag.every(a => a.x >= L.cp.x - 10 && a.step >= L.cp.step)) {
      st.cp = L.cp; Sfx.play('spyvaultCheckpoint'); K.pop(st, L.cp.x - st.camX, FY - 110, 'Checkpoint!', '#8fe3b0', 20);
    }
  }
  function stepDone(st, a, s) {
    const isRun = a.id === st.runId, o = partnerOf(st, a);
    if (s.t === 'case') return isRun ? st.got[s.i] || a.x > s.x + 60 : a.x > s.x - 40;
    if (s.t === 'pose' || s.t === 'time' || s.t === 'tiles') return a.x > s.x1 + 14 && !a.mirror;
    if (s.t === 'turn') return st.L.wm[s.wm].n === s.want;
    if (s.t === 'hold') {
      const b = s.btn != null ? st.L.btns[s.btn] : null;
      if (isRun) return b ? b.done : a.x > s.x1 + 14;
      return (b ? b.done : o.x > s.x1 + 14) && a.x > (b ? s.spot + 20 : s.x1 + 14) && !a.mirror;
    }
    if (s.t === 'dia') return st.dia.swapped && (isRun || !a.mirror);
    return false;
  }

  /* ---------- the Diamond Room ---------- */
  function diamond(st, dt) {
    const D = st.dia, L = st.L, dd = L.dia;
    if (D.n < 3) {
      const want = dd.rcv[D.order[D.n]];
      if (st.tr.lit.has(want)) { D.hold += dt; if (D.hold >= S.rcvT) { D.n++; D.hold = 0; Sfx.play('spyvaultCageOpen'); K.pop(st, dd.ped - st.camX, FY - 150, D.n < 3 ? 'One side open!' : 'The cage is open!', '#8fe3b0', 18); if (D.n >= 3) L.em[dd.feed].dead = true; } }
      else D.hold = Math.max(0, D.hold - dt * 2);
    } else if (!D.swapped) {
      const r = st.ag[st.runId], i = G.players[r.id].input;
      if (Math.abs(r.x - dd.ped) < 22 && i.act && r.ground) {
        D.swap += dt;
        if (Math.floor(D.swap * 6) !== Math.floor((D.swap - dt) * 6)) Sfx.play('spyvaultNeedle');
        if (D.swap >= S.swapT) { D.swapped = true; Sfx.play('spyvaultSwapDone'); K.pop(st, dd.ped - st.camX, FY - 130, 'Swapped! The diamond is ours.', '#fff1c0', 20); }
      } else if (D.swap > 0) { D.swap = 0; Sfx.play('spyvaultNeedleReset'); }
    } else if (st.state === 'go' && st.ag.every(a => a.x > dd.cat - 30)) {
      st.state = 'cat'; st.endT = 0; D.cat = 0; st.stats.roomT[st.k] = G.time - st.segStart; Sfx.play('spyvaultCatYawn');
    }
  }
  function catStep(st, dt) {
    const D = st.dia; D.cat += dt;
    if (D.cat > 1.4 && !D.button) { D.button = true; Sfx.play('spyvaultBigButton'); Sfx.play('spyAlarm'); if (typeof Music !== 'undefined' && Music.cue) Music.cue({ song: 'spychase' }); }
    if (D.cat > 2.4 && !D.vent) { D.vent = true; Sfx.play('spyvaultVentPop'); }
    if (D.cat > 2.8) for (const a of st.ag) { a.x = K.lerp(a.x, st.L.dia.exit, dt * 3); a.y = K.lerp(a.y, CH - 10, dt * (2 + a.id)); }
    if (D.cat > 4.4 && !st.cleared) { st.cleared = true; G.level.goal = { x: W / 2, y: 300 }; levelClear(); }
  }

  /* ---------- camera and the engine bodies ---------- */
  function camera(st, dt) {
    const mid = (st.ag[0].x + st.ag[1].x) / 2;
    st.camX = K.lerp(st.camX, clamp(mid - W / 2 + 60, 0, st.L.len - W), clamp(dt * 3, 0, 1));
  }
  function mirrorOut(st) {
    st.spyLook = st.ag.map(a => ({ frizz: a.frizz > 0 }));
    for (const a of st.ag) K.place(a.id, a.x - st.camX, FY - a.y);
    st.run = st.ag.map(a => ({ x: a.x, y: a.y, grounded: a.ground }));
  }

  /* ---------- what to do next (the prompts, the HUD and the computer brain read this) ---------- */
  function plan(st) {
    if (st.planMemo && st.planMemo.n === G.tickN && st.planMemo.k === st.k) return st.planMemo.p;
    const p = planNow(st);
    st.planMemo = { n: G.tickN, k: st.k, p };
    return p;
  }
  // will agent a be zapped walking from its x to x1 at speed v (pose: stand / duck), starting in `delay` s?
  function pathClear(st, a, x1, v, pose, delay, horizon) {
    const dir = Math.sign(x1 - a.x) || 1, dur = Math.min(horizon || 4, Math.abs(x1 - a.x) / v + 0.35);
    for (let t = 0; t <= dur + delay; t += 0.025) {
      const x = t < delay ? a.x : a.x + dir * Math.min(Math.abs(x1 - a.x) + 10, (t - delay) * v);
      const h = pose === 'duck' ? S.hDuck : S.hStand;
      const b = { x0: x - S.hw - 7, x1: x + S.hw + 7, y0: 0, y1: h + 5, id: a.id };
      const boxes = st.ag.map(q => q.id === a.id ? b : Object.assign(boxOf(st, q), { id: q.id }));
      const tr = traceAt(st, st.T + t, boxes);
      if (tr.hits.some(hh => hh.id === a.id)) return false;
      if (barHit(st, b, st.T + t)) return false;
    }
    return true;
  }
  // would lowering the mirror now zap anybody?
  function safeToLower(st, a) {
    const boxes = st.ag.map(q => Object.assign(q.id === a.id ? boxOf(st, Object.assign({}, q, { mirror: false })) : boxOf(st, q), { id: q.id }));
    for (const T of [st.T, st.T + 0.3]) { const tr = traceAt(st, T, boxes); if (tr.hits.length) return false; }
    return true;
  }
  function planNow(st) {
    const R = st.L.steps, out = { steps: R, ag: [], mir: st.mirId, run: st.runId };
    for (const a of st.ag) {
      const s = R[Math.min(a.step, R.length - 1)], isRun = a.id === st.runId, o = partnerOf(st, a);
      const P = { step: a.step, kind: s.t, to: null, pose: 'stand', mirror: false, tilt: null, act: false, why: 'go', jumpAt: null, wait: false, face: 1, hold: false };
      if (s.t === 'case') { P.to = s.x; if (isRun && Math.abs(a.x - s.x) < 14 && !st.got[s.i]) P.act = 'tap'; P.why = isRun ? 'case' : 'go'; }
      else if (s.t === 'end' || s.t === 'exit') P.to = s.x + (isRun ? 12 : -12);
      else if (s.t === 'pose') {
        P.to = s.x1 + 20;
        if (s.pose === 'jump') { P.jumpAt = (s.x0 + s.x1) / 2 - (isRun ? S.run : S.walk) * (S.jumpV / S.grav); P.why = 'jump'; }
        else if (isRun) { P.why = 'duck'; if (a.x > s.x0 - 26 && a.x < s.x1 + 14) P.pose = 'duck'; }
        else { P.why = 'shield'; if (a.x > s.x0 - 24 && a.x < s.x1 + 14) { P.mirror = true; P.tilt = 2; } else if (a.x >= s.x1 + 14 && a.mirror) P.mirror = !safeToLower(st, a); }
      } else if (s.t === 'time') {
        P.to = s.x1 + 20; P.why = 'time'; P.wx = s.wx;
      } else if (s.t === 'tiles') {
        P.to = s.x1 + 20; P.why = 'tiles';
        if (a.x < s.x0 - 4 && Object.values(st.trap).some(v => v > 0)) { P.to = s.x0 - 24; P.wait = true; }
      } else if (s.t === 'turn') {
        if (isRun) { P.to = s.x; P.why = 'turn'; if (Math.abs(a.x - s.x) < 12 && st.L.wm[s.wm].n !== s.want) P.act = 'tap'; }
        else { P.to = s.x - 60; P.why = 'wait'; P.wait = true; }
      } else if (s.t === 'hold') {
        const b = s.btn != null ? st.L.btns[s.btn] : null, open = holdOpen(st, s);
        P.target = s.target; P.spot = s.spot;
        if (isRun) {
          if (b && b.done) P.to = s.x1 + 20;
          else if (!open) { P.to = s.wait; P.why = 'waitOpen'; P.wait = true; }
          else { P.to = b ? b.x : s.x1 + 20; P.why = b ? 'button' : 'under'; if (b && Math.abs(a.x - b.x) < 12) P.act = 'tap'; }
        } else {
          const done = b ? b.done : o.x > s.x1 + 14;
          P.hold = true;
          if (!done || (st.doneT != null && G.time - st.doneT < 0.4)) {
            P.to = s.spot; P.why = 'hold';
            if (Math.abs(a.x - s.spot) < 18 || a.mirror) { P.mirror = true; P.tilt = s.tilt; }
          } else if (!b && a.x < s.x1 + 14) { P.to = s.x1 + 20; P.mirror = a.mirror || Math.abs(a.x - s.spot) < 14; P.tilt = s.tilt; P.why = 'through'; }
          else { P.to = s.x1 + 30; P.mirror = a.mirror && !safeToLower(st, a); P.tilt = s.tilt; P.why = 'follow'; }
          // never lower while the person is inside the path of that beam
          if (!P.mirror && a.mirror && !safeToLower(st, a)) P.mirror = true;
        }
      } else if (s.t === 'dia') {
        const D = st.dia, dd = st.L.dia;
        if (isRun) {
          if (D.n < 3) { P.to = s.wait; P.why = 'waitCage'; P.wait = true; }
          else if (!D.swapped) { P.to = dd.ped; P.why = 'swap'; if (Math.abs(a.x - dd.ped) < 12) P.act = true; }
          else P.to = dd.exit;
        } else {
          if (D.n < 3) { P.to = s.spot; P.why = 'aim'; if (Math.abs(a.x - s.spot) < 18 || a.mirror) { P.mirror = true; P.tilt = dd.tilt[D.order[D.n]]; } P.target = dd.rcv[D.order[D.n]]; }
          else { P.to = dd.exit - 30; P.mirror = a.mirror && !safeToLower(st, a); }
        }
      }
      out.ag[a.id] = P;
    }
    return out;
  }
  function holdOpen(st, s) {
    const L = st.L;
    if (!s.target) { const m = st.ag[st.mirId]; return m.mirror && st.tr.caught.has(s.feed) && Math.abs(m.x - s.spot) < 10 && m.tilt === s.tilt; }
    if (s.target.curt != null) return !L.curt[s.target.curt].on;
    if (s.target.door != null) return L.doors[s.target.door].open;
    if (s.target.grid != null) return L.grids[s.target.grid].off;
    return true;
  }

  /* ---------- drawing ---------- */
  const scrX = (st, x) => x - st.camX, scrY = y => FY - y;
  function draw(st) {
    const t = G.clock, L = st.L;
    // the hall: steel walls, panels, the portraits, the polished floor
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#10181c'); g.addColorStop(1, '#1c2830'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const top = scrY(CH);
    ctx.fillStyle = '#26323a'; ctx.fillRect(0, top, W, FY - top);
    const off = st.camX;
    for (let px = Math.floor(off / 120) * 120; px < off + W + 120; px += 120) {
      const x = px - off, h = K.hash(px * 0.37 + st.k);
      ctx.fillStyle = 'rgba(255,255,255,0.04)'; ctx.fillRect(x + 2, top + 8, 116, FY - top - 16);
      ctx.strokeStyle = '#33424a'; ctx.lineWidth = 2; ctx.strokeRect(x + 2, top + 8, 116, FY - top - 16);
      if (h > 0.55) portrait(x + 60, top + 70, h, t);
    }
    // ceiling and floor
    ctx.fillStyle = '#0e1418'; ctx.fillRect(0, 0, W, top);
    ctx.fillStyle = '#3a464e'; ctx.fillRect(0, top - 6, W, 6);
    const fg = ctx.createLinearGradient(0, FY, 0, H); fg.addColorStop(0, '#2a3a44'); fg.addColorStop(1, '#0e161a'); ctx.fillStyle = fg; ctx.fillRect(0, FY, W, H - FY);
    for (let px = Math.floor(off / 80) * 80; px < off + W + 80; px += 80) { ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(px - off, FY, 2, H - FY); }
    // the stretch's ends
    ctx.fillStyle = '#1a2228'; if (off < 40) ctx.fillRect(0 - off, top, 20, FY - top);
    exitDoor(st, scrX(st, L.len - 40), t);
    // pressure tiles
    L.tiles.forEach((tl, i) => { const sunk = st.sunk[i] > 0 ? 3 : 0; ctx.fillStyle = sunk ? '#05070a' : '#14181c'; ctx.fillRect(scrX(st, tl.x0) + 1, FY + sunk, tl.x1 - tl.x0 - 2, 6); ctx.strokeStyle = '#4a5258'; ctx.lineWidth = 1; ctx.strokeRect(scrX(st, tl.x0) + 1, FY + sunk, tl.x1 - tl.x0 - 2, 6); });
    // emitters, posts and boxes
    for (const e of L.em) {
      const x = scrX(st, e.x); if (x < -60 || x > W + 60) continue;
      if (e.post) for (const px of e.post) { ctx.fillStyle = '#5a666e'; ctx.fillRect(scrX(st, px) - 3, scrY(e.y + 14), 6, e.y + 14); ctx.fillStyle = e.kind === 'trap' ? '#8a3a3a' : '#2a3236'; circle(scrX(st, px), scrY(e.y), 4); ctx.fill(); }
      else if (e.wall) { ctx.fillStyle = '#5a666e'; rr(x - 10, scrY(e.y) - 7, 14, 14, 3); ctx.fill(); ctx.fillStyle = '#c83a3a'; circle(x + 3, scrY(e.y), 3); ctx.fill(); }
      else { ctx.fillStyle = '#5a666e'; rr(x - 9, top - 2, 18, 10, 3); ctx.fill(); ctx.fillStyle = e.kind === 'blink' ? '#ffb040' : '#c83a3a'; circle(x, top + 7, 3); ctx.fill(); }
      if (e.feeds) { ctx.fillStyle = '#4a545a'; rr(x - 12, FY - 12, 24, 12, 3); ctx.fill(); ctx.fillStyle = st.L.curt[e.feeds.curt].on ? '#ff5a5a' : '#3a2a2a'; circle(x, FY - 6, 3); ctx.fill(); }
    }
    // receivers (green lenses), wall mirrors, doors, buttons, cases
    for (const r of L.rcv) {
      const x = scrX(st, r.x), y = scrY(r.y), on = st.tr.lit.has(r.id);
      const want = st.dia && st.dia.n < 3 && L.dia.rcv[st.dia.order[st.dia.n]] === r.id;
      ctx.fillStyle = '#2a3236'; circle(x, y, 9); ctx.fill();
      ctx.fillStyle = on ? COL.green : '#1f5a3a'; circle(x, y, 6); ctx.fill();
      if (on || want) { ctx.fillStyle = 'rgba(93,255,154,' + (on ? 0.35 : 0.2 + 0.2 * Math.sin(t * 8)) + ')'; circle(x, y, 15); ctx.fill(); }
    }
    for (const w of L.wm) {
      const x = scrX(st, w.x), y = scrY(w.y), a = w.notch[w.n];
      ctx.fillStyle = '#5a666e'; ctx.fillRect(x - 2, y, 4, w.y > 100 ? 12 : FY - y);
      ctx.fillStyle = COL.brass; circle(x, y, 10); ctx.fill(); ctx.fillStyle = '#e8f4f8'; circle(x, y, 7); ctx.fill();
      // which way it sends a beam (a little brass arrow)
      ctx.strokeStyle = COL.brass; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * 17, y - Math.sin(a) * 17); ctx.stroke();
    }
    for (const d of L.doors) {
      const x = scrX(st, d.x); if (x < -40 || x > W + 40) continue;
      const u = d.open ? 1 : 0; d.anim = K.lerp(d.anim || 0, u, 0.15);
      const hgt = (FY - top) * (1 - d.anim);
      ctx.fillStyle = '#5a666e'; ctx.fillRect(x - 8, top, 16, hgt); ctx.fillStyle = 'rgba(0,0,0,0.25)'; for (let y = top + 10; y < top + hgt; y += 18) ctx.fillRect(x - 8, y, 16, 3);
      ctx.fillStyle = '#3a444a'; ctx.fillRect(x - 12, top - 2, 24, 6);
      d.rcv.forEach((rid, i) => { ctx.fillStyle = st.tr.lit.has(rid) ? COL.green : '#2a3a30'; circle(x - 4 + i * 8, top + 14, 3); ctx.fill(); });
    }
    for (const b of L.btns) {
      const x = scrX(st, b.x); ctx.fillStyle = '#3a444a'; rr(x - 12, FY - 4, 24, 4, 2); ctx.fill();
      ctx.fillStyle = b.does.turn != null ? COL.brass : b.done ? '#5a8a6a' : '#e04848'; rr(x - 8, FY - (b.done ? 6 : 9), 16, 6, 3); ctx.fill();
    }
    L.cases.forEach((c, i) => {
      const x = scrX(st, c.x); if (x < -40 || x > W + 40) return;
      ctx.fillStyle = '#3a2e22'; ctx.fillRect(x - 12, FY - 34, 24, 34); ctx.fillStyle = COL.brass; ctx.fillRect(x - 14, FY - 36, 28, 4);
      ctx.fillStyle = 'rgba(180,230,255,0.15)'; ctx.fillRect(x - 11, FY - 60, 22, 24); ctx.strokeStyle = 'rgba(220,240,255,0.5)'; ctx.lineWidth = 1; ctx.strokeRect(x - 11, FY - 60, 22, 24);
      if (!st.got[i]) K.intel(c.kind, x, FY - 48, 0.8, t);
    });
    // curtains and grids (bars)
    for (const c of L.curt) {
      const on = c.on;
      for (let bx = c.x0; bx <= c.x1; bx += 15) K.laser(scrX(st, bx), FY, scrX(st, bx), top + 4, { a: on ? 1 : 0.12, spark: false, dim: !on });
      ctx.fillStyle = '#3a444a'; ctx.fillRect(scrX(st, c.x0) - 6, FY - 6, c.x1 - c.x0 + 12, 6); ctx.fillRect(scrX(st, c.x0) - 6, top, c.x1 - c.x0 + 12, 6);
    }
    for (const gr of L.grids) {
      const gx = scrX(st, gridX(gr, st.T)), a = gr.off ? 0.12 : 1;
      ctx.fillStyle = '#3a444a'; ctx.fillRect(scrX(st, gr.xa - gr.w / 2), top, gr.xb - gr.xa + gr.w, 5);
      for (let k = -1; k <= 1; k++) K.laser(gx + k * gr.w / 2, top + 4, gx + k * gr.w / 2, FY, { a, spark: false, dim: gr.off });
      for (const y of [30, 70, 120, 180, 240]) K.laser(gx - gr.w / 2, scrY(y), gx + gr.w / 2, scrY(y), { a, spark: false, dim: gr.off, w: 1.6 });
      ctx.fillStyle = '#5a666e'; rr(gx - 16, top, 32, 10, 3); ctx.fill();
    }
    // the Diamond Room: the cage, the pedestal, the cat
    if (L.dia) drawDiamond(st, t, top);
    // the shutter
    if (st.shut) {
      const x = scrX(st, st.shut.x);
      ctx.fillStyle = '#5a646a'; ctx.fillRect(-10, top, x + 10, FY - top + 8);
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; for (let y = top + 6; y < FY; y += 16) ctx.fillRect(-10, y, x + 10, 4);
      ctx.fillStyle = '#ffcf3a'; for (let y = top; y < FY; y += 24) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 8, y + 12); ctx.lineTo(x, y + 24); ctx.fill(); }
    }
    // the beams
    for (const ln of st.tr.lines) {
      for (let i = 0; i < ln.pts.length - 1; i++) {
        const [x0, y0] = ln.pts[i], [x1, y1] = ln.pts[i + 1];
        K.laser(scrX(st, x0), scrY(y0), scrX(st, x1), scrY(y1), ln.hum ? { a: 0.15 + 0.4 * ln.hum, spark: false, dim: true } : { spark: i === ln.pts.length - 2 });
      }
    }
    // the agents
    for (const a of st.ag) drawAgent(st, a, t);
    K.drawParts(st);
    if (st.state === 'lock') { const u = clamp(st.endT / 0.5, 0, 1); ctx.fillStyle = 'rgba(60,66,70,0.95)'; ctx.fillRect(0, 0, W * u, H); if (u >= 1) bigText('LOCKDOWN!', W / 2, H / 2 - 30, 40, '#ffd0c8'); }
    if (st.state === 'cat' && st.dia.button) K.strobe(0.5 + 0.5 * Math.sin(t * 14));
    else if (st.alarm > 60) K.strobe((st.alarm - 60) / 80 * (0.5 + 0.5 * Math.sin(t * 10)));
  }
  function portrait(x, y, h, t) {
    ctx.fillStyle = COL.brass; ctx.fillRect(x - 26, y - 32, 52, 64); ctx.fillStyle = '#2a2018'; ctx.fillRect(x - 21, y - 27, 42, 54);
    // Count Zero's portrait collection: Count Zero in many poses, a bowler and a big 0
    ctx.fillStyle = '#f0c8a0'; circle(x, y - 4, 9); ctx.fill(); ctx.fillStyle = '#111316'; ctx.fillRect(x - 10, y - 14, 20, 4); ctx.fillRect(x - 6, y - 20, 12, 7);
    ctx.fillStyle = h > 0.8 ? '#5a2a3a' : '#23272e'; ctx.fillRect(x - 14, y + 6, 28, 20); text('0', x, y + 16, 10, '#ffffff', 'center', 'body');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 6, y - 6, 4, 2); ctx.fillRect(x + 2, y - 6, 4, 2);
  }
  function exitDoor(st, x, t) {
    if (x < -60 || x > W + 60) return;
    const top = scrY(CH);
    ctx.fillStyle = '#1a2228'; ctx.fillRect(x, top, 60, FY - top);
    ctx.fillStyle = '#3a4a52'; ctx.fillRect(x + 8, FY - 110, 40, 110); ctx.fillStyle = '#8fe3b0'; text('EXIT ▶', x + 28, FY - 124, 12, '#8fe3b0', 'center', 'body');
  }
  function drawDiamond(st, t, top) {
    const D = st.dia, dd = st.L.dia, px = scrX(st, dd.ped);
    // the pedestal and the diamond (or the snow globe)
    ctx.fillStyle = '#d8d0c0'; ctx.fillRect(px - 14, FY - 46, 28, 46); ctx.fillStyle = COL.brass; ctx.fillRect(px - 18, FY - 50, 36, 5);
    if (!D.swapped) {
      ctx.save(); ctx.translate(px, FY - 66); ctx.fillStyle = 'rgba(255,210,120,' + (0.3 + 0.15 * Math.sin(t * 4)) + ')'; circle(0, 0, 22); ctx.fill();
      ctx.fillStyle = '#ffdf8a'; ctx.beginPath(); ctx.moveTo(-12, -4); ctx.lineTo(-6, -12); ctx.lineTo(6, -12); ctx.lineTo(12, -4); ctx.lineTo(0, 14); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff6d0'; ctx.beginPath(); ctx.moveTo(-6, -12); ctx.lineTo(0, -4); ctx.lineTo(6, -12); ctx.fill(); ctx.restore();
    } else { ctx.fillStyle = 'rgba(220,240,255,0.6)'; circle(px, FY - 64, 11); ctx.fill(); ctx.fillStyle = '#6a7a8a'; ctx.fillRect(px - 4, FY - 66, 3, 8); ctx.fillRect(px + 1, FY - 70, 3, 12); ctx.fillStyle = '#8a5a3a'; ctx.fillRect(px - 9, FY - 54, 18, 5); }
    // the weight needle while swapping
    if (D.n >= 3 && !D.swapped && D.swap > 0) { const u = D.swap / S.swapT; K.meter(px - 30, FY - 104, 60, 7, u, C.gold); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px, FY - 88); ctx.lineTo(px + Math.sin(t * 22) * 6 * (1 - u), FY - 98); ctx.stroke(); }
    // the cage: four sides, one opens per lens
    const [c0, c1] = dd.cage, sides = [[c0, 'v'], [c1, 'v'], [null, 'h']];
    for (let i = 0; i < 3; i++) {
      const open = i < D.n, a = open ? 0.1 : 1;
      if (sides[i][1] === 'v') for (let k = 0; k < 2; k++) K.laser(scrX(st, sides[i][0]) + k * 6 * (i ? -1 : 1), top + 4, scrX(st, sides[i][0]) + k * 6 * (i ? -1 : 1), FY, { a, spark: false, dim: open });
      else for (const y of [90, 130]) K.laser(scrX(st, c0), scrY(y), scrX(st, c1), scrY(y), { a, spark: false, dim: open });
    }
    if (D.n < 3) { const r = st.L.rcv[dd.rcv[D.order[D.n]]]; const u = D.hold / S.rcvT; if (u > 0) K.meter(scrX(st, r.x) - 20, scrY(r.y) + 16, 40, 5, u, COL.green); }
    // the cat on its cushion, and the big red button
    const cx = scrX(st, dd.cat);
    ctx.fillStyle = '#7a2a3a'; rr(cx - 24, FY - 14, 48, 14, 6); ctx.fill();
    ctx.fillStyle = '#3a3e44'; rr(cx + 36, FY - 40, 16, 40, 3); ctx.fill(); ctx.fillStyle = D.button ? '#ff2a2a' : '#c82a2a'; circle(cx + 44, FY - 44, 7); ctx.fill();
    const st_ = st.state === 'cat' ? D.cat : 0, stretch = clamp(st_ / 1.2, 0, 1);
    ctx.fillStyle = '#f4f2ee';
    ctx.beginPath(); ctx.ellipse(cx, FY - 20 - stretch * 6, 16 + stretch * 6, 9 - stretch * 2, 0, 0, TAU); ctx.fill();
    circle(cx + 14 + stretch * 8, FY - 28 - stretch * 8, 7); ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx + 9 + stretch * 8, FY - 33 - stretch * 8); ctx.lineTo(cx + 11 + stretch * 8, FY - 41 - stretch * 8); ctx.lineTo(cx + 15 + stretch * 8, FY - 34 - stretch * 8); ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx + 15 + stretch * 8, FY - 34 - stretch * 8); ctx.lineTo(cx + 19 + stretch * 8, FY - 41 - stretch * 8); ctx.lineTo(cx + 21 + stretch * 8, FY - 32 - stretch * 8); ctx.fill();
    if (D.button) { ctx.strokeStyle = '#f4f2ee'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx + 20, FY - 30); ctx.lineTo(cx + 42, FY - 46); ctx.stroke(); }
    ctx.fillStyle = '#3a8a5a'; const eye = st.state === 'cat' && D.cat > 0.5 ? 2 : 0.6; ctx.fillRect(cx + 16 + stretch * 8, FY - 30 - stretch * 8, 3, eye);
    if (st.state !== 'cat') text('z', cx + 26, FY - 44 - (t * 8) % 10, 11, '#ffffff', 'center', 'body');
    // the vent in the ceiling
    const vx = scrX(st, dd.exit);
    ctx.fillStyle = D.vent ? '#05070a' : '#4a545a'; ctx.fillRect(vx - 26, top - 4, 52, 10);
    if (D.vent) { ctx.fillStyle = '#6a747a'; ctx.save(); ctx.translate(vx - 26, top + 6); ctx.rotate(0.9); ctx.fillRect(0, 0, 52, 5); ctx.restore(); }
  }
  function drawAgent(st, a, t) {
    const x = scrX(st, a.x), y = scrY(a.y), o = { face: a.face };
    if (a.slideT > 0) { o.sy = 0.42; o.sx = 1.4; o.rot = -0.2 * a.face; }
    else if (a.duck) { o.sy = 0.58; o.sx = 1.25; }
    if (a.inv > 0 && Math.floor(t * 16) % 2) ctx.globalAlpha = 0.6;
    K.hero(a.id, x, y, o);
    ctx.globalAlpha = 1;
    if (a.frizz > 0) for (let i = 0; i < 3; i++) { ctx.fillStyle = 'rgba(180,180,180,' + 0.4 * a.frizz / S.frizz + ')'; circle(x - 6 + i * 6 + Math.sin(t * 6 + i) * 3, y - 54 - ((t * 30 + i * 9) % 18), 4); ctx.fill(); }
    // role props: the brass hand mirror; the runner's keycard pouch
    if (a.id === st.mirId) {
      const caught = st.tr.flash && st.tr.flash.includes(a.id);
      const mx = x + a.face * 10, my = a.mirror ? y - S.mirH + 6 : y - 22;
      ctx.strokeStyle = COL.brassDark; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + a.face * 5, y - 26); ctx.lineTo(mx, my + 8); ctx.stroke();
      ctx.fillStyle = st.gold ? C.gold : COL.brass; circle(mx, my, a.mirror ? 9 : 6); ctx.fill();
      ctx.fillStyle = caught ? '#ffffff' : '#cfe8f0'; circle(mx, my, a.mirror ? 6.5 : 4); ctx.fill();
      if (caught) { ctx.fillStyle = 'rgba(255,255,255,0.5)'; circle(mx, my, 14 + Math.sin(t * 30) * 3); ctx.fill(); }
      if (a.mirror) {
        // the bounce arrow
        const an = a.face > 0 ? TILT[a.tilt] : Math.PI - TILT[a.tilt];
        ctx.strokeStyle = 'rgba(255,240,180,0.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx + Math.cos(an) * 22, my - Math.sin(an) * 22); ctx.stroke();
        ctx.fillStyle = 'rgba(255,240,180,0.8)'; circle(mx + Math.cos(an) * 22, my - Math.sin(an) * 22, 2.5); ctx.fill();
      }
    } else {
      const n = st.lootGot[st.k] || 0;
      ctx.fillStyle = '#3a2e22'; rr(x - a.face * 10 - 5, y - 18, 10, 8, 2); ctx.fill();
      for (let i = 0; i < Math.min(n, 5); i++) { ctx.fillStyle = i % 2 ? '#7ee0ff' : '#f2f2f2'; ctx.fillRect(x - a.face * 10 - 4 + i * 2, y - 21, 1.6, 4); }
    }
  }

  /* ---------- HUD ---------- */
  function hud(st) {
    const big = hudBig(), z = big ? 1.25 : 1;
    let x0;
    {
      const fs = big ? 20 : 14, h = big ? 40 : 28, tm = fmtTime(G.time), n = '◆ ' + st.loot + ' / ' + S.loot;
      ctx.font = K.FONT(fs);
      const w = ctx.measureText(tm).width + ctx.measureText(n).width + fs + 30;
      x0 = pill(W - 14, 12, w, h, 'right');
      text(tm, x0 + 15, 12 + h / 2 + 0.5, fs, st.waiting ? '#aab' : C.paper, 'left', 'body');
      text(n, x0 + w - 15, 12 + h / 2 + 0.5, fs, '#fff1c0', 'right', 'body');
      K.alertBar(W - 14 - 230 * z, 12 + h + 8, 230, st.alarm / 100, { icon: 'bell', label: 'Alarm', flash: !!st.shut });
      if (st.gold) K.chip(W - 14 - 120 * z, 12 + h + 40 * z, 120 * z, 22 * z, '★ gold mirror', false, true, z);
    }
    K.drawMsg(st, st.waiting ? { text: K.BREAK, col: '#ffffff', t: 1, life: 2 } : st.msg, x0);
    K.drawControl(st);
    if (st.state !== 'go') return;
    const pl = plan(st), P = K.prompter(st);
    for (const a of st.ag) {
      const Pa = pl.ag[a.id], x = scrX(st, a.x), y = scrY(a.y) - 64;
      let s = null, col = C.gold, pulse = false;
      if (a.id === st.mirId) {
        if (Pa.why === 'hold' || Pa.why === 'aim') {
          if (Math.abs(a.x - Pa.spot) > 10) s = 'Stand under the beam ▼';
          else if (!a.mirror) { s = 'Hold ' + K.key(a.id, 'act') + ' to raise the mirror'; pulse = true; }
          else if (Pa.tilt != null && a.tilt !== Pa.tilt) s = (Pa.tilt > a.tilt ? K.key(a.id, 'up') : K.key(a.id, 'down')) + ' tilt ' + TILT_NAME[Pa.tilt];
          else s = 'Hold it there!';
        } else if (Pa.why === 'shield' && Pa.mirror && !a.mirror) s = 'Raise the mirror ' + K.key(a.id, 'act') + ' and walk through';
        else if (Pa.why === 'jump' && a.x > Pa.jumpAt - 40 && a.x < Pa.jumpAt + 60) s = 'Jump the low beam ' + K.key(a.id, 'up');
        else if (Pa.why === 'time') s = 'Wait for the gap, then go';
      } else {
        if (Pa.why === 'duck' && a.x > Pa.to - 200) s = 'Duck or slide ' + K.key(a.id, 'down');
        else if (Pa.why === 'jump' && a.x > Pa.jumpAt - 40 && a.x < Pa.jumpAt + 60) s = 'Jump ' + K.key(a.id, 'up');
        else if (Pa.why === 'waitOpen' || Pa.why === 'waitCage') s = 'Wait for ' + NAMES[st.mirId] + '\'s mirror';
        else if (Pa.why === 'button') { s = 'Go! Press the button ' + K.key(a.id, 'act'); pulse = true; }
        else if (Pa.why === 'under') { s = 'Go under the beam!'; pulse = true; }
        else if (Pa.why === 'turn') s = 'Press ' + K.key(a.id, 'act') + ' to turn the wall mirror';
        else if (Pa.why === 'swap') { s = 'Hold ' + K.key(a.id, 'act') + ' to swap the diamond'; pulse = true; }
        else if (Pa.why === 'case' && Math.abs(a.x - Pa.to) < 40) s = 'Grab it ' + K.key(a.id, 'act');
        else if (Pa.why === 'time') s = 'Wait for the gap, then go';
        else if (Pa.why === 'tiles') s = 'Keep moving on the black tiles!';
      }
      P.say(a.id, s, x, y, col, pulse);
    }
    if (st.dia && st.dia.swapped && st.state === 'go') text('Walk out ▶', W / 2, 120, 18, '#fff1c0', 'center', 'body');
    for (const id of [0, 1]) {
      const b = K.panel(id, id === st.mirId ? 'mirror' : 'runner', 210, 46, z), a = st.ag[id];
      text(id === st.mirId ? (a.mirror ? 'mirror up · ' + TILT_NAME[a.tilt] : 'mirror down') : (a.slideT > 0 ? 'sliding' : a.duck ? 'ducking' : 'ready'), b.x + 12 * z, b.y + 32 * z, 12 * z, a.mirror ? '#fff1c0' : '#ffffff', 'left', 'body');
    }
  }

  const medal = t => K.medal(t <= S.goldT, t <= S.silverT);
  MODES.spyvault = {
    S, CH, TILT, plan, medal, build, pathClear, safeToLower, traceAt, boxOf, gridX, emOn, holdOpen,
    medals: { bronze: 'Escape with the Sunrise Diamond', goals: [{ key: 'time', gold: S.goldT, silver: S.silverT }, { key: 'zaps', gold: 0, silver: 3, word: 'Zap' }, { key: 'loot', gold: S.loot, silver: 14, more: true, word: 'Keycard and gem' }] },
    medalValues() { const st = G.mst; return { zaps: st.stats.zaps, loot: st.loot }; },
    setup(st, L) {
      st.stats = { zaps: 0, locks: 0, bent: 0, lit: 0, cards: 0, latched: 0, helps: 0, roomT: [] };
      st.loot = 0; st.lootGot = []; st.inT = [G.time, G.time]; st.personT = G.time; st.clock = 0;
      room(st, L.def, 0);
    },
    room(k, L) { const st = G.mst; st.inT = [G.time, G.time]; st.personT = G.time; room(st, L.def, k); },
    step(dt) { tick(G.mst, dt); },
    draw() { const st = G.mst; if (!st.L) return; draw(st); K.hide(st); },
    drawTop() { const st = G.mst; K.unhide(st); if (st.L) K.drawPops(st, 0, 0); },
    hud() { const st = G.mst; if (st.L) hud(st); },
    stats() {
      const st = G.mst, s = st.stats;
      if (!s) return [];
      const out = [
        { label: 'Zaps', value: String(s.zaps) },
        { label: 'Lockdowns', value: String(s.locks) },
        { label: 'Keycards', value: st.loot + ' of ' + S.loot },
      ];
      out.push('Beams bent: ' + s.bent + '. Lenses lit: ' + s.lit + '. The Sunrise Diamond is in the briefcase!');
      const hl = K.helpLine(s.helps); if (hl) out.push(hl);
      return out;
    },
  };

  /* ---------- the level ---------- */
  SPY.defs.spyvault = {
    name: 'Laser Vault Heist', world: 37, kind: 'team', mode: 'spyvault', outfit: 'spyvault', ownStep: true, ownHUD: true, noFalls: true, roomWord: 'Stretch',
    legend: {
      pip: '<kbd>A</kbd><kbd>D</kbd> move <kbd>W</kbd> jump <kbd>S</kbd> duck / slide <kbd>F</kbd> mirror (hold, <kbd>W</kbd><kbd>S</kbd> tilt) / grab',
      bo: '<kbd>←</kbd><kbd>→</kbd> move <kbd>↑</kbd> jump <kbd>↓</kbd> duck / slide <kbd>/</kbd> mirror (hold, <kbd>↑</kbd><kbd>↓</kbd> tilt) / grab',
    },
    tip: 'The mirror stops a beam and bends it. Light the green lenses to open the way.',
    howTo: [
      'MIRROR: hold the action in a beam to stop it. Up and down tilt where it bounces.',
      'RUNNER: jump, duck and slide through the gaps, and press the buttons on the far side.',
      'Every zap sends the steel shutter after you. Keep moving.',
    ],
    act: { label: 'mirror' },
    map: K.stubMap(),
    rooms: [
      { title: 'The Gallery', done: 'Through the Gallery!', tip: 'Pip has the mirror. Jump the low beam, duck the high ones. Catch the curtain\'s source beam so Bo can cross.' },
      { title: 'The Coin Room', done: 'Through the Coin Room!', tip: 'Bo has the mirror now. Go when the sweeper is up and the blinkers are off. Pip turns the wall mirror.' },
      { title: 'The Hall of Mirrors', done: 'Through the Hall of Mirrors!', tip: 'Don\'t stand on the black tiles. Bounce the beam off the wall mirrors to stop the moving cage.' },
      { title: 'The Diamond Room', done: 'Got it!', tip: 'Bounce the beam into each lens as it lights up. Then Pip holds the action on the pedestal to swap the diamond.' },
    ],
  };

  /* ---------- sounds ---------- */
  Sfx.extra.spyvaultMirrorUp = function () { this.tone(1200, 0.08, 'sine', 0.03, 1600); };
  Sfx.extra.spyvaultMirrorTilt = function () { this.tone(900, 0.04, 'square', 0.015, 1000); };
  Sfx.extra.spyvaultMirrorPing = function () { this.tone(2600, 0.25, 'sine', 0.03, 2400); this.tone(3900, 0.18, 'sine', 0.012, 3600, 0.02); };
  Sfx.extra.spyvaultMirrorTurn = function () { this.tone(400, 0.06, 'square', 0.03, 300); this.noise(0.05, { f: 1800, q: 3, vol: 0.02 }); };
  Sfx.extra.spyvaultReceiverChime = function () { this.tone(1320, 0.18, 'sine', 0.035); this.tone(1980, 0.22, 'sine', 0.025, null, 0.08); };
  Sfx.extra.spyvaultDoorOpen = function () { this.noise(0.5, { type: 'lowpass', f: 500, vol: 0.04, a: 0.1 }); this.tone(140, 0.4, 'sawtooth', 0.015, 220); };
  Sfx.extra.spyvaultDoorShut = function () { this.noise(0.3, { type: 'lowpass', f: 400, vol: 0.04 }); this.tone(120, 0.15, 'sine', 0.04, 70, 0.25); };
  Sfx.extra.spyvaultButtonClunk = function () { this.tone(220, 0.08, 'square', 0.04, 140); this.noise(0.06, { type: 'lowpass', f: 900, vol: 0.03 }); };
  Sfx.extra.spyvaultZapBuzz = function () { this.tone(120, 0.35, 'sawtooth', 0.05, 90); this.tone(240, 0.3, 'square', 0.02, 180); this.noise(0.3, { type: 'highpass', f: 3000, vol: 0.025 }); };
  Sfx.extra.spyvaultShutterRumble = function () { this.noise(1.2, { type: 'lowpass', f: 180, vol: 0.05, a: 0.2 }); this.tone(55, 1.0, 'sawtooth', 0.015, 50); };
  Sfx.extra.spyvaultShutterSlam = function () { this.noise(0.25, { type: 'lowpass', f: 300, vol: 0.07 }); this.tone(70, 0.3, 'sine', 0.06, 40); };
  Sfx.extra.spyvaultSlide = function () { this.noise(0.25, { f: 2200, q: 2, vol: 0.02, a: 0.02 }); };
  Sfx.extra.spyvaultStepTap = function () { this.tone(1800, 0.02, 'sine', 0.006, 1500); };
  Sfx.extra.spyvaultJump = function () { this.tone(500, 0.08, 'sine', 0.02, 800); };
  Sfx.extra.spyvaultTileSink = function () { this.tone(160, 0.2, 'sine', 0.04, 90); this.noise(0.1, { type: 'lowpass', f: 600, vol: 0.03 }); };
  Sfx.extra.spyvaultSweepWhirr = function () { this.tone(300, 0.6, 'sawtooth', 0.012, 900); };
  Sfx.extra.spyvaultBlinkHum = function () { this.tone(110, 0.4, 'sine', 0.012, 220); };
  Sfx.extra.spyvaultCaseOpen = function () { this.tone(1400, 0.05, 'sine', 0.02, 1700); this.noise(0.08, { type: 'highpass', f: 5000, vol: 0.012 }); };
  Sfx.extra.spyvaultCheckpoint = function () { this.tone(660, 0.12, 'triangle', 0.03); this.tone(990, 0.16, 'triangle', 0.03, null, 0.1); };
  Sfx.extra.spyvaultCageOpen = function () { this.tone(700, 0.15, 'sine', 0.03, 1100); this.tone(1050, 0.2, 'sine', 0.025, 1500, 0.1); };
  Sfx.extra.spyvaultNeedle = function () { this.tone(2200, 0.03, 'sine', 0.008, 2000); };
  Sfx.extra.spyvaultNeedleReset = function () { this.tone(600, 0.15, 'square', 0.02, 300); };
  Sfx.extra.spyvaultSwapDone = function () { this.tone(880, 0.2, 'sine', 0.035); this.tone(1320, 0.25, 'sine', 0.03, null, 0.1); this.tone(1760, 0.35, 'sine', 0.025, null, 0.2); };
  Sfx.extra.spyvaultCatYawn = function () { this.tone(700, 0.5, 'sine', 0.025, 380); this.tone(520, 0.2, 'sine', 0.015, 700, 0.5); };
  Sfx.extra.spyvaultBigButton = function () { this.tone(180, 0.1, 'square', 0.05, 120); };
  Sfx.extra.spyvaultVentPop = function () { this.noise(0.15, { type: 'lowpass', f: 1200, vol: 0.05 }); this.tone(300, 0.1, 'square', 0.03, 600); };
})();
