/* Pip & Bo - Level 38-3 Air Vent Crawl (team, World 38 Operation Midnight). */
'use strict';

/* ===== 38-3 Air Vent Crawl (mode 'spyvents', team, a scrolling maze in the dark, player-paced) =====
   Act three: the alarm is howling, so down through the ducts, in the dark, with one torch and the diamond.
   A side cut-away of the tower's ducts on a grid of S.Z px cells (world y grows DOWN here, like the screen). Ducts are
   one cell high, shafts one cell wide; agents move like on rails: along a duct, and up or down a shaft once lined up
   with it (a turn is taken a few px early). Very dark: an overlay of S.dark, lit by the torch's cone, the hacker's
   tiny green wrist screen, the briefcase's glow, light coming up through floor grates and the red alarm strobe
   (S.strobeT s every S.strobeEvery s). The mode owns the tick, the picture and the HUD (ownStep + ownHUD + noFalls).
   ROLES swap each stretch (Pip has the torch in stretches 1 and 3, Bo in 2 and 4):
   - LIGHT: the torch shines the way they last pressed. ACTION HELD = cover it with a hand (a faint glow only). At a
     junction the right branch shows a small arrow, but only inside the torch cone.
   - HACKER: carries the briefcase (a little slower). ACTION at a panel (a vent door, a fan box, a shaft hatch, or the
     far side of a door to shut it again) opens the wrist screen: S.arrows[k] arrows to press in order with ◀ ▶ ▲ ▼.
     They can only be read while the torch cone is on the panel (dim dots in the dark). A wrong press buzzes, makes a
     little Noise and starts the pattern again. ACTION again closes the screen.
   THE DUCTS: floor grates over lit rooms (torchlight through a grate while the Zero below is under it makes him look
   up: Noise jumps; cover the torch or wait), thin metal (crawling at full speed booms: tap to creep; a creep never
   reaches S.boomV), fans (spinning, they block the duct: hack the fan box for S.fanStop s, or a fan on the failing
   circuit stops by itself for S.failStop s after each strobe), steam vents (a hiss S.hiss s first, then a burst:
   "Yow!", a hop back and some Noise), drop shafts (you fall; hold ▼ to brake, or land with a boom on metal), squeezes
   (the briefcase won't fit with the hacker: ACTION pushes it through; the light catches it on the far side, else it
   slides down a side chute to be fetched), dead ends with cobwebs and rat's nests, reels in side ducts.
   THE SNIFFER (stretch 2 on; two in stretch 4): a low robot with red eye-lamps that follows the pair through the ducts
   a little slower than a crawl (faster with high Noise). A shut vent door stops it for S.cutT s while it cuts through.
   If it reaches an agent: CAUGHT, back to the checkpoint. NOISE full: a broom bangs the duct from below: HEARD, back
   to the checkpoint.
   GOLD HELP (3 bad events in a stretch, both playing): a gold torch: guards react 50% slower, patterns stay readable
   S.goldRead s after the cone leaves them, and the Sniffer is 20% slower.
   MODES.spyvents.plan(st) is what each agent should do now: the prompts, the HUD and the computer brain read it. */
(() => {
  const K = SPY, TAU = Math.PI * 2, COL = SPY.COL;
  const S = {
    Z: 40, crawl: 100, crawlH: 86, creep: 35, ramp: 0.35, boomV: 72, climb: 90, fall: 240, brake: 70, turn: 10, leash: 520,
    cone: 190, coneA: 0.5, dark: 0.95, strobeEvery: 4, strobeT: 0.3, arrows: [4, 4, 5, 6], closeArrows: 2,
    noiseGrate: 55, noiseBoom: 25, noiseYow: 15, noiseWrong: 12, noiseRat: 10, drain: 9, goldGuard: 0.5, goldRead: 3,
    fanStop: 5, failStop: 2.2, steamPer: 3.2, steamOn: 0.8, hiss: 0.6, snifV: 62, snifFast: 30, goldSnif: 0.8, cutT: 6,
    catchR: 22, heardT: 2.4, idleWait: 12, goldT: 240, silverT: 400, reels: 20,
  };
  const Z = S.Z, cx = c => c * Z + Z / 2, cy = r => r * Z + Z / 2;
  const DIRS = { r: [1, 0], l: [-1, 0], d: [0, 1], u: [0, -1] };

  /* ---------- the four stretches: carved from solid metal ---------- */
  function build(k) {
    const L = { k, g: [], rooms: [], panels: [], fans: [], steams: [], squeezes: [], reels: [], steps: [], arrows: [], doors: [], hatches: [], snif: [] };
    const cols = [50, 53, 53, 47][k], rows = [13, 12, 14, 15][k];
    for (let r = 0; r < rows; r++) L.g.push(Array(cols).fill('#'));
    L.cols = cols; L.rows = rows;
    const set = (c, r, ch) => { L.g[r][c] = ch; };
    const h = (r, c0, c1) => { for (let c = c0; c <= c1; c++) if (L.g[r][c] === '#') set(c, r, '.'); };
    const v = (c, r0, r1) => { for (let r = r0; r <= r1; r++) if (L.g[r][c] === '#') set(c, r, '.'); };
    const room = (c0, c1, r0, r1, o = {}) => L.rooms.push({ c0, c1, r0, r1, xa: cx(c0) + 6, xb: cx(c1) - 6, v: o.v || 32, ph: o.ph || 0, prop: o.prop || 'torch', say: o.say });
    const grate = (c, r) => set(c, r, 'g');
    const metal = (r, c0, c1) => { for (let c = c0; c <= c1; c++) set(c, r, 'm'); };
    const steam = (c, r, ph) => { set(c, r, 's'); L.steams.push({ c, r, ph: ph || 0 }); };
    const reel = (c, r) => { L.reels.push({ c, r }); L.steps.push({ t: 'reel', i: L.reels.length - 1, c, r }); };
    const go = (c, r) => L.steps.push({ t: 'go', c, r });
    const arrow = (c, r, d) => L.arrows.push({ c, r, d });
    // a panel: the hacker stands at (hc, hr), the light at (lc, lr) shining `ld` onto the panel point (px, py)
    const panel = (kind, target, hc, hr, ld, n, extra) => {
      const [dx, dy] = DIRS[ld], p = { id: L.panels.length, kind, target, hc, hr, lc: hc - dx, lr: hr - dy, ld, n,
        px: cx(hc) + dx * Z / 2, py: cy(hr) + dy * Z / 2, done: false, seq: [] };
      Object.assign(p, extra || {}); L.panels.push(p); return p;
    };
    const door = (c, r, from) => {
      set(c, r, 'D'); const d = { id: L.doors.length, c, r, open: false, cut: 0, broken: false }; L.doors.push(d);
      const [dx, dy] = DIRS[from];
      const p = panel('door', d.id, c - dx, r - dy, from, S.arrows[k]);
      L.steps.push({ t: 'hack', p: p.id });
      // the far-side panel to shut it again behind you (only worth it with a Sniffer close behind)
      const back = { r: 'l', l: 'r', d: 'u', u: 'd' }[from];
      const q = panel('close', d.id, c + dx, r + dy, back, S.closeArrows, { optional: true });
      L.steps.push({ t: 'close', p: q.id });
      return d;
    };
    const hatch = (c, r) => {
      set(c, r, 'H'); const d = { id: L.doors.length, c, r, open: false, cut: 0, broken: false, hatch: true }; L.doors.push(d);
      const p = panel('door', d.id, c, r - 1, 'd', S.arrows[k]);
      L.steps.push({ t: 'hack', p: p.id });
      return d;
    };
    // a fan: hacked at its box (stops S.fanStop s), or on the failing circuit (stops after each strobe)
    const fan = (c, r, from, failing) => {
      set(c, r, 'f'); const f = { id: L.fans.length, c, r, failing: !!failing, stopT: 0, ang: 0 }; L.fans.push(f);
      const [dx, dy] = DIRS[from];
      if (failing) L.steps.push({ t: 'fan', f: f.id, wc: c - dx, wr: r - dy, ac: c + dx, ar: r + dy });
      else { const p = panel('fan', f.id, c - dx, r - dy, from, S.arrows[k]); L.steps.push({ t: 'hack', p: p.id }); L.steps.push({ t: 'go', c: c + dx, r: r + dy, rush: f.id }); }
      return f;
    };
    // a squeeze: the light goes through first and catches the case; else it slides to the chute cell
    const squeeze = (c, r, chute) => {
      set(c, r, 'q'); const q = { id: L.squeezes.length, c, r, bc: c - 1, ac: c + 1, chute };
      L.squeezes.push(q); L.steps.push({ t: 'squeeze', q: q.id });
    };
    const drop = (c, r0, r1) => { for (let r = r0; r <= r1; r++) set(c, r, 'v'); };
    if (k === 0) {
      // Above the Vault: learn the torch, cover it at the grates, one junction, one door
      h(4, 1, 20); L.start = [2, 4];
      grate(7, 4); room(5, 9, 5, 7, { v: 26 });
      v(11, 2, 4); h(2, 11, 14);
      grate(15, 4); room(13, 17, 5, 7, { v: 30, ph: 2, say: true });
      reel(14, 2);
      // the junction at col 20: up to a webbed dead end, right over the break room, down is the way
      v(20, 1, 8); h(1, 20, 24); set(23, 1, 'w'); h(4, 20, 23); grate(22, 4); room(21, 24, 5, 7, { v: 22, ph: 1, prop: 'cup' });
      arrow(20, 4, 'd');
      reel(24, 1); reel(23, 4);
      go(20, 8);
      h(8, 20, 42); L.cp = { c: 25, r: 8 };
      go(25, 8);
      v(29, 8, 10); h(10, 29, 32);
      reel(32, 10);
      door(34, 8, 'r');
      grate(38, 8); room(36, 40, 9, 11, { v: 28 });
      v(42, 5, 8); h(5, 42, 48); v(44, 2, 5);
      go(42, 5);
      reel(44, 2);
      L.exit = [48, 5];
    } else if (k === 1) {
      // The Office Ducts: thin metal, steam, the first fan, and the Sniffer arrives
      h(3, 1, 18); L.start = [2, 3];
      metal(3, 6, 9);
      reel(9, 3);
      steam(12, 3, 0.4);
      v(15, 1, 3); h(1, 15, 18);
      reel(18, 1);
      v(18, 3, 7); h(7, 18, 46);
      arrow(18, 3, 'd');
      fan(24, 7, 'r');
      v(26, 5, 7); h(5, 26, 29);
      L.cp = { c: 27, r: 7 };
      reel(29, 5);
      grate(31, 7); room(29, 33, 8, 10, { v: 30, say: true });
      v(35, 7, 9); h(9, 35, 38); set(37, 9, 'n');
      reel(38, 9);
      steam(38, 7, 1.6); metal(7, 40, 41);
      door(43, 7, 'r');
      v(46, 4, 10); set(46, 9, 'w'); h(4, 46, 51);
      arrow(46, 7, 'u');
      reel(46, 10);
      go(46, 4);
      L.exit = [51, 4];
      L.snif = [{ c: 1, r: 3, after: 25, at: 4 }];
    } else if (k === 2) {
      // The Machine Floor: fans on the failing circuit, squeezes, a long drop onto metal, 5-arrow hacks
      h(3, 1, 20); L.start = [2, 3];
      fan(7, 3, 'r', true);
      v(10, 1, 3); h(1, 10, 12);
      reel(12, 1);
      v(11, 3, 5);
      squeeze(13, 3, [11, 5]);
      drop(20, 4, 8); h(9, 17, 46); metal(9, 19, 21);
      go(20, 9);
      reel(17, 9);
      v(23, 9, 11);
      reel(23, 11);
      L.cp = { c: 24, r: 9 };
      door(28, 9, 'r');
      v(30, 6, 9); h(6, 30, 33); set(33, 6, 'w');
      fan(32, 9, 'r', true);
      grate(35, 9); room(33, 37, 10, 12, { v: 34, say: true });
      v(37, 7, 9);
      squeeze(38, 9, [37, 7]);
      steam(42, 9, 0.8);
      v(44, 9, 11);
      reel(44, 11);
      v(46, 4, 9); h(4, 46, 51); v(48, 1, 4);
      go(46, 4);
      reel(48, 1);
      L.exit = [51, 4];
      L.snif = [{ c: 1, r: 3, after: 20, at: 6 }];
    } else {
      // The Long Drop: two Sniffers, everything, then three shaft hatches on the way down to the boathouse
      h(2, 1, 16); L.start = [2, 2];
      grate(6, 2); room(4, 8, 3, 5, { v: 30, say: true });
      metal(2, 10, 12); v(12, 1, 2);
      reel(12, 1);
      steam(14, 2, 0.2);
      v(16, 2, 6); h(6, 16, 44);
      fan(20, 6, 'r');
      v(22, 4, 6);
      reel(22, 4);
      L.cp = { c: 24, r: 6 };
      v(28, 4, 6);
      reel(28, 4);
      grate(30, 6); room(29, 31, 7, 9, { v: 24 });
      v(32, 4, 6);
      squeeze(33, 6, [32, 4]);
      v(35, 6, 8);
      reel(35, 8);
      fan(37, 6, 'r', true);
      reel(44, 6);
      go(40, 6);
      v(40, 6, 14);
      hatch(40, 8); hatch(40, 10); hatch(40, 12);
      L.exit = [40, 14];
      L.snif = [{ c: 1, r: 2, after: 17, at: 4 }, { c: 1, r: 2, after: 17, at: 16 }];
    }
    L.steps.push({ t: 'exit', c: L.exit[0], r: L.exit[1] });
    // where each step is (for the checkpoint's step: the first step at or past it)
    for (const s of L.steps) s.at = s.c != null ? s.c : s.p != null ? L.panels[s.p].hc : s.f != null ? s.wc : s.q != null ? L.squeezes[s.q].bc : 0;
    if (L.cp) L.cp.step = L.steps.findIndex(s => s.at >= L.cp.c);
    return L;
  }

  /* ---------- the grid ---------- */
  const chAt = (st, c, r) => (r < 0 || c < 0 || r >= st.L.rows || c >= st.L.cols) ? '#' : st.L.g[r][c];
  const cellOf = (x, y) => ({ c: Math.floor(x / Z), r: Math.floor(y / Z) });
  function doorAt(st, c, r) { for (const d of st.L.doors) if (d.c === c && d.r === r) return d; return null; }
  function fanAt(st, c, r) { for (const f of st.L.fans) if (f.c === c && f.r === r) return f; return null; }
  const fanSpin = (st, f) => f.stopT <= 0;
  // can agent a (or the Sniffer: a = null) be in cell (c, r)?
  function passable(st, c, r, a) {
    const ch = chAt(st, c, r);
    if (ch === '#') return false;
    if (ch === 'D' || ch === 'H') { const d = doorAt(st, c, r); return d.open || d.broken; }
    if (ch === 'f') return !fanSpin(st, fanAt(st, c, r));
    if (ch === 'q' && a && st.caseOn === a.id) return false;
    return true;
  }
  // grid distances from (c, r) over passable cells (BFS; the brain and the Sniffer use it)
  function bfs(st, c0, r0, a, opts) {
    const L = st.L, D = new Int32Array(L.cols * L.rows).fill(-1), q = [c0 + r0 * L.cols];
    D[q[0]] = 0;
    for (let i = 0; i < q.length; i++) {
      const id = q[i], c = id % L.cols, r = (id / L.cols) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nc = c + dx, nr = r + dy;
        if (nc < 0 || nr < 0 || nc >= L.cols || nr >= L.rows) continue;
        const nid = nc + nr * L.cols;
        if (D[nid] >= 0) continue;
        if (!passable(st, nc, nr, a) && !(opts && opts.thru && opts.thru(nc, nr))) continue;
        // drop shafts are one way (down). Distances run back from the target (how far each cell is from getting
        // there), so the step that's refused is climbing up out of a shaft cell into this one; opts.fwd for the other way
        if (opts && opts.fwd ? dy < 0 && chAt(st, c, r) === 'v' : dy > 0 && chAt(st, nc, nr) === 'v') continue;
        D[nid] = D[id] + 1; q.push(nid);
      }
    }
    return D;
  }

  /* ---------- state ---------- */
  function room(st, def, k) {
    st.k = k; st.L = build(k);
    st.lightId = k % 2 === 0 ? 0 : 1; st.hackId = 1 - st.lightId;
    st.rc = { bad: 0 }; st.gold = false; st.cp = null; st.cpTries = 0; st.segStart = G.time; st.state = 'go'; st.endT = 0;
    st.got = st.L.reels.map(() => false);
    for (const p of st.L.panels) p.seq = Array.from({ length: p.n }, () => 'lrud'[Math.floor(Math.random() * 4)]);
    place(st, false);
    K.fx(st);
    K.actLabels(st.lightId === 0 ? ['cover', 'hack'] : ['hack', 'cover'], 'hack');
    if (k === 0) st.radioDue = 0.5;
  }
  function place(st, atCp) {
    const L = st.L, cp = atCp && st.cp, at = cp ? [cp.c, cp.r] : L.start, step = cp ? cp.step : 0;
    st.ag = [0, 1].map(id => {
      const off = id === st.lightId ? 0 : -1;
      const c = passable(st, at[0] + off, at[1], null) ? at[0] + off : at[0];
      return { id, x: cx(c), y: cy(at[1]), dir: [1, 0], td: [1, 0], cover: false, holdT: 0, v: 0, boomT: 0, step, prevA: false, prevK: {}, inT: 0, web: 0, yowT: 0, fallV: 0, ratT: 0 };
    });
    st.T = 0; st.noise = 0; st.quietT = 0; st.hack = null; st.caseOn = st.hackId; st.caseAt = null;
    for (const f of L.fans) f.stopT = 0;
    // things past the checkpoint reset; doors and hatches before it stay open
    for (const d of L.doors) if (!cp || d.c > cp.c || (d.c === cp.c && d.r > cp.r)) { d.open = false; d.cut = 0; d.broken = false; }
    for (const p of L.panels) { const d = p.kind === 'door' || p.kind === 'close' ? L.doors[p.target] : null; if (!cp || (d ? d.c > cp.c : p.hc > cp.c)) p.done = false; }
    const back = cp ? backCell(st, cp.c, cp.r, 12) : null;
    st.snif = L.snif.map(s => ({ x: cx(cp ? back[0] : s.c), y: cy(cp ? back[1] : s.r), at: cp ? 6 + 2 * Math.min(4, st.cpTries || 0) + (s.at - L.snif[0].at) : s.at, after: cp ? null : s.after, cpx: cp ? cx(cp.c) : 0, cpy: cp ? cy(cp.r) : 0, grace: 6 + 3 * Math.min(4, st.cpTries || 0), armT: null, on: false, cutT: 0, eye: 0 }));
    st.camX = clamp(st.ag[0].x - W / 2, 0, L.cols * Z - W); st.camY = clamp(st.ag[0].y - H / 2, 0, Math.max(0, L.rows * Z - H));
    st.litT = {};
  }
  // (restarts from the stretch's start count too, so the Sniffer slows down for a team that keeps being caught there)
  function restart(st, why) { const key = (st.cp ? st.cp.c + ',' + st.cp.r : 'start') + ',' + st.k; st.cpTries = st.cpKey === key ? (st.cpTries || 0) + 1 : 1; st.cpKey = key; place(st, true); st.state = 'go'; K.msg(st, why, '#ffffff', 2.6); }

  /* ---------- light ---------- */
  const strobeOn = st => (st.T % S.strobeEvery) < S.strobeT;
  const strobeSince = st => st.T % S.strobeEvery;
  // is (x, y) inside the uncovered torch cone? (with a line of sight down the ducts)
  function inCone(st, x, y, lt) {
    lt = lt || st.ag[st.lightId];
    if (lt.cover) return false;
    const dx = x - lt.x, dy = y - lt.y, d = Math.hypot(dx, dy);
    if (d > S.cone) return false;
    if (d > 8) { const cos = (dx * lt.td[0] + dy * lt.td[1]) / d; if (cos < Math.cos(S.coneA)) return false; }
    for (let s = 6; s < d - 4; s += 8) { const c = cellOf(lt.x + dx * s / d, lt.y + dy * s / d); if (chAt(st, c.c, c.r) === '#') return false; }
    return true;
  }
  // a room's Zero: walking back and forth below its grates
  function zeroX(rm, T) {
    const span = rm.xb - rm.xa, per = 2 * span / rm.v + 3, u = ((T + rm.ph * 2.1) % per + per) % per;
    if (u < 1.5) return rm.xa;
    if (u < 1.5 + span / rm.v) return rm.xa + (u - 1.5) * rm.v;
    if (u < 3 + span / rm.v) return rm.xb;
    return rm.xb - (u - 3 - span / rm.v) * rm.v;
  }
  function grates(st) {
    const out = [];
    st.L.g.forEach((row, r) => row.forEach((ch, c) => { if (ch === 'g') out.push({ c, r, x: cx(c), y: cy(r) }); }));
    return out;
  }
  const roomUnder = (st, g) => st.L.rooms.find(rm => g.c >= rm.c0 && g.c <= rm.c1 && rm.r0 === g.r + 1);
  // would the cone light a grate with its Zero underneath (now, or within `ahead` s)?
  function grateRisk(st, lt, ahead) {
    for (const g of st.grates) {
      if (!inCone(st, g.x, g.y, Object.assign({}, lt, { cover: false }))) continue;
      const rm = roomUnder(st, g); if (!rm) continue;
      for (let t = 0; t <= ahead; t += 0.1) if (Math.abs(zeroX(rm, st.T + t) - g.x) < 30) return g;
    }
    return null;
  }
  function steamPhase(sv, T) { const u = ((T + sv.ph) % S.steamPer + S.steamPer) % S.steamPer; return u < S.steamOn ? 'on' : u > S.steamPer - S.hiss ? 'hiss' : 'off'; }
  const steamAt = (st, c, r) => st.L.steams.find(s => s.c === c && s.r === r);

  /* ---------- the tick ---------- */
  function tick(st, dt) {
    if (!st.L) return;
    K.track(st);
    st.waiting = st.state === 'go' && K.idle(st, dt, S.idleWait);
    const live = G.introT <= 0 && !st.waiting && st.state === 'go';
    st.clock += dt;
    if (live) {
      st.T += dt;
      if (st.radioDue != null && (st.radioDue -= dt) <= 0) { st.radioDue = null; K.control(st, K.STORY.spyvents); }
      st.made = 0;
      fans(st, dt);
      for (const a of st.ag) agent(st, a, dt);
      hackStep(st);
      lights(st, dt);
      caseStep(st);
      pickups(st);
      sniffers(st, dt);
      progress(st);
      if (st.made > 0) st.quietT = 0; else { st.quietT += dt; if (st.quietT > 0.6) st.noise = Math.max(0, st.noise - S.drain * dt); }
      if (st.noise >= 100) heard(st);
      if (st.state === 'go' && st.ag.every(a => { const c = cellOf(a.x, a.y); return Math.abs(c.c - st.L.exit[0]) <= 1 && c.r === st.L.exit[1] || (c.c === st.L.exit[0] && Math.abs(c.r - st.L.exit[1]) <= 1); })) {
        st.state = 'end'; st.endT = 0; st.stats.roomT[st.k] = G.time - st.segStart;
        Sfx.play(st.k === 3 ? 'spyventsHatchClang' : 'spySting');
        K.pop(st, W / 2, 180, st.k === 3 ? 'Into the boathouse!' : (G.level.def.rooms[st.k].done || 'Through!') + ' Next stretch!', '#ffffff', 22);
      }
    } else if (st.state === 'heard' || st.state === 'caught') { st.endT += dt; if (st.endT > S.heardT) restart(st, st.state === 'heard' ? 'Back to the checkpoint. Quietly now.' : 'Back to the checkpoint. Keep ahead of it!'); }
    else if (st.state === 'end') endStep(st, dt);
    K.tickControl(st, dt);
    for (const p of G.players) { p.pendingJump = false; p.pendingAct = false; }
    for (const a of st.ag) { if (a.web > 0) a.web -= dt * 0.15; if (a.yowT > 0) a.yowT -= dt; }
    camera(st, dt);
    K.tickFx(st, dt);
    mirrorOut(st);
  }
  function endStep(st, dt) {
    st.endT += dt;
    if (st.k === 3) {
      for (const a of st.ag) a.y += 300 * dt;
      if (st.endT > 0.8 && !st.splash) { st.splash = true; Sfx.play('spyventsBoatThump'); Sfx.play('spyCheer'); }
      if (st.endT > 2.4 && !st.cleared) { st.cleared = true; G.level.goal = { x: W / 2, y: 300 }; levelClear(); }
      return;
    }
    if (st.endT > 1.8) nextRoom();
  }
  function wants(id) {
    const i = G.players[id].input;
    return { x: (i.right ? 1 : 0) - (i.left ? 1 : 0), y: (i.down ? 1 : 0) - ((i.jump || i.up) ? 1 : 0), act: !!i.act, k: { l: !!i.left, r: !!i.right, u: !!(i.jump || i.up), d: !!i.down } };
  }
  const partnerOf = (st, a) => st.ag[1 - a.id];
  function makeNoise(st, n, x, y, why) {
    st.noise = Math.min(100, st.noise + n); st.made += n;
    if (why) K.pop(st, x - st.camX, y - st.camY - 24, why, '#ffd0c8', 15);
  }
  function bad(st) { st.rc.bad++; if (!st.gold && st.rc.bad >= 3 && K.both(st)) { st.gold = true; K.goldHelp(st, 'Gold torch! Guards are slower to notice, and the Sniffer is slower.'); } }
  function agent(st, a, dt) {
    const w = wants(a.id), isLight = a.id === st.lightId;
    // the wrist screen takes the arrows while it's open
    if (st.hack && st.hack.who === a.id) {
      for (const d of 'lrud') { if (w.k[d] && !a.prevK[d]) hackPress(st, d); }
      a.prevK = Object.assign({}, w.k);
      if (w.act && !a.prevA) { st.hack = null; Sfx.play('spyventsScreenOff'); }
      a.prevA = w.act; a.holdT = 0; return;
    }
    a.prevK = Object.assign({}, w.k);
    if (isLight) { const was = a.cover; a.cover = w.act; if (a.cover !== was) Sfx.play(a.cover ? 'spyventsTorchCover' : 'spyventsTorchClick'); }
    else {
      if (w.act && !a.prevA) hackerAct(st, a);
    }
    a.prevA = w.act;
    if (w.x || w.y) { a.td = w.y ? [0, w.y] : [w.x, 0]; }
    const c = cellOf(a.x, a.y), ch = chAt(st, c.c, c.r);
    // a drop shaft: fall (hold ▼ to brake)
    if (ch === 'v' && Math.abs(a.x - cx(c.c)) < 2) {
      a.x = cx(c.c);
      const v = w.y > 0 ? S.brake : S.fall; a.fallV = v; a.dir = [0, 1]; a.holdT = 0;
      const ny = a.y + v * dt, nr = cellOf(a.x, ny).r;
      if (nr === c.r || chAt(st, c.c, nr) === 'v') { a.y = ny; return; }
      // landing in the cell below the shaft
      if (!passable(st, c.c, nr, a)) { a.y = Math.min(ny, cy(c.r)); return; }
      a.y = cy(nr);
      if (chAt(st, c.c, nr) === 'm' && v > 150) { makeNoise(st, S.noiseBoom, a.x, a.y, 'BOOM!'); Sfx.play('spyventsMetalBoom'); st.stats.booms++; bad(st); }
      else Sfx.play('spyventsLandSoft');
      a.fallV = 0;
      return;
    }
    if (!w.x && !w.y) { a.holdT = 0; a.v = 0; return; }
    a.holdT += dt;
    const full = isLight ? S.crawl : S.crawlH, sp = S.creep + (full - S.creep) * Math.min(1, a.holdT / S.ramp);
    a.v = sp;
    let step = sp * dt;
    const o = partnerOf(st, a);
    const tryAxis = (dx, dy) => {
      const cc = cellOf(a.x, a.y), mx = cx(cc.c), my = cy(cc.r);
      if (dx) {
        if (Math.abs(a.y - my) > 0.5) return false;
        const nx = a.x + dx * step, beyond = (nx - mx) * dx > 0;
        if (beyond && !passable(st, cc.c + dx, cc.r, a)) { if ((a.x - mx) * dx < 0) { a.x = mx; return true; } bump(st, a, cc.c + dx, cc.r); return false; }
        if (Math.hypot(nx - o.x, a.y - o.y) > S.leash && Math.hypot(nx - o.x, a.y - o.y) > Math.hypot(a.x - o.x, a.y - o.y)) { a.leashT = (a.leashT || 0) + dt; return false; }
        a.x = nx; return true;
      }
      if (Math.abs(a.x - mx) > 0.5) return false;
      const ny = a.y + dy * step, beyond = (ny - my) * dy > 0;
      if (dy < 0 && chAt(st, cc.c, cc.r - 1) === 'v' && beyond) return false;
      if (beyond && !passable(st, cc.c, cc.r + dy, a)) { if ((a.y - my) * dy < 0) { a.y = my; return true; } bump(st, a, cc.c, cc.r + dy); return false; }
      if (Math.hypot(a.x - o.x, ny - o.y) > S.leash && Math.hypot(a.x - o.x, ny - o.y) > Math.hypot(a.x - o.x, a.y - o.y)) { a.leashT = (a.leashT || 0) + dt; return false; }
      a.y = ny; return true;
    };
    // line up for a turn a few px early, then go
    const cc = cellOf(a.x, a.y), mx = cx(cc.c), my = cy(cc.r);
    let moved = false;
    const px0 = a.x, py0 = a.y;
    if (w.y) {
      if (Math.abs(a.x - mx) <= S.turn && (passable(st, cc.c, cc.r + w.y, a) || (a.y - my) * w.y < 0)) { a.x = mx; moved = tryAxis(0, w.y); }
      else if (!w.x && Math.abs(a.x - mx) > 0.5 && Math.abs(a.x - mx) <= Z / 2) { const d = Math.sign(mx - a.x); if (Math.abs(a.x - mx) < step) a.x = mx; else a.x += d * step; moved = true; }
    }
    if (!moved && w.x) {
      if (Math.abs(a.y - my) <= S.turn) { a.y = my; moved = tryAxis(w.x, 0); }
      else if (Math.abs(a.y - my) <= Z / 2) { const d = Math.sign(my - a.y); if (Math.abs(a.y - my) < step) a.y = my; else a.y += d * step; moved = true; }
    }
    if (!moved) return;
    a.leashT = 0;
    // the way it really went (a held diagonal used to read as "up" at every cell's middle, so a steam burst there
    // hopped the agent back into the solid metal above the duct)
    { const mx2 = a.x - px0, my2 = a.y - py0; if (Math.abs(my2) > Math.abs(mx2)) a.dir = [0, Math.sign(my2)]; else if (mx2) a.dir = [Math.sign(mx2), 0]; }
    // what's underfoot
    const now = cellOf(a.x, a.y), ch2 = chAt(st, now.c, now.r);
    if (ch2 === 'm') {
      a.boomT -= dt;
      if (sp > S.boomV && a.boomT <= 0) { a.boomT = 0.6; makeNoise(st, S.noiseBoom, a.x, a.y, 'BOOM!'); Sfx.play('spyventsMetalBoom'); st.stats.booms++; bad(st); }
      else if (G.time - (a.dentT || 0) > 0.45) { a.dentT = G.time; Sfx.play('spyventsMetalCreak'); }
    } else if (G.time - (a.scuffT || 0) > 0.32) { a.scuffT = G.time; Sfx.play('spyventsCrawlScuff'); }
    if (ch2 === 'w' && a.web <= 0.2) { a.web = 1; Sfx.play('spyventsCobweb'); }
    if (ch2 === 'n') { if (G.time - a.ratT > 3) { a.ratT = G.time; makeNoise(st, S.noiseRat, a.x, a.y, 'Squeak!'); Sfx.play('spyventsRatSqueak'); } }
    const sv = steamAt(st, now.c, now.r);
    if (sv && steamPhase(sv, st.T) === 'on' && a.yowT <= 0) yow(st, a);
  }
  function yow(st, a) {
    a.yowT = 1.2;
    // a hop back one cell the way it came (never into solid metal: else it just stays put)
    const c0 = cellOf(a.x, a.y), bc = c0.c - a.dir[0], br = c0.r - a.dir[1], c = passable(st, bc, br, a) ? { c: bc, r: br } : c0;
    a.x = cx(c.c); a.y = cy(c.r);
    makeNoise(st, S.noiseYow, a.x, a.y, 'Yow!'); Sfx.play('spyventsSteamYow'); st.stats.yows++; bad(st);
  }
  function bump(st, a, c, r) { if (G.time - (a.bumpT || 0) > 0.8) { a.bumpT = G.time; if (chAt(st, c, r) === 'f') Sfx.play('spyventsFanThwack'); } }
  function hackerAct(st, a) {
    // push the briefcase through a squeeze
    for (const q of st.L.squeezes) if (st.caseOn === a.id && cellOf(a.x, a.y).c === q.bc && cellOf(a.x, a.y).r === q.r && Math.abs(a.x - cx(q.bc)) < 10) {
      const lt = st.ag[st.lightId];
      if (Math.hypot(lt.x - cx(q.ac), lt.y - cy(q.r)) < 30) { st.caseOn = lt.id; Sfx.play('spyventsCaseCatch'); K.pop(st, lt.x - st.camX, lt.y - st.camY - 30, 'Caught it!', '#8fe3b0', 16); }
      else { st.caseOn = null; st.caseAt = { x: cx(q.chute[0]), y: cy(q.chute[1]) }; Sfx.play('spyventsCaseSlide'); K.pop(st, a.x - st.camX, a.y - st.camY - 30, 'Down the chute! Go and get it.', '#ffd0c8', 16); st.stats.chutes++; }
      return;
    }
    // a panel
    for (const p of st.L.panels) if (!p.done && cellOf(a.x, a.y).c === p.hc && cellOf(a.x, a.y).r === p.hr && Math.hypot(a.x - cx(p.hc), a.y - cy(p.hr)) < 12) {
      if (p.kind === 'close' && !doorAt(st, st.L.doors[p.target].c, st.L.doors[p.target].r).open) continue;
      st.hack = { who: a.id, p: p.id, i: 0 }; Sfx.play('spyventsScreenOn'); return;
    }
  }
  const readable = (st, p) => inCone(st, p.px, p.py) || (st.gold && st.T - (st.litT[p.id] || -99) < S.goldRead);
  function hackPress(st, d) {
    const h = st.hack, p = st.L.panels[h.p];
    if (p.seq[h.i] === d) {
      h.i++; Sfx.play('spyventsKeyClick');
      if (h.i >= p.seq.length) {
        p.done = true; st.hack = null; Sfx.play('spyventsAccessGranted'); st.stats.hacks++;
        if (p.kind === 'door') { st.L.doors[p.target].open = true; Sfx.play(st.L.doors[p.target].hatch ? 'spyventsHatchClang' : 'spyventsDoorSlide'); }
        if (p.kind === 'close') { const dd = st.L.doors[p.target]; dd.open = false; dd.cut = 0; Sfx.play('spyventsDoorSlide'); K.pop(st, cx(dd.c) - st.camX, cy(dd.r) - st.camY - 30, 'Shut behind us!', '#8fe3b0', 16); }
        if (p.kind === 'fan') { const f = st.L.fans[p.target]; f.stopT = S.fanStop; p.done = false; Sfx.play('spyventsFanWhine'); }
      }
    } else { h.i = 0; Sfx.play('spyventsWrongBuzz'); makeNoise(st, S.noiseWrong, cx(p.hc), cy(p.hr), 'Bzzt!'); st.stats.wrong++; }
  }
  function fans(st, dt) {
    for (const f of st.L.fans) {
      if (f.failing && strobeSince(st) < dt * 1.5 && st.T > 0.5) { f.stopT = S.failStop; Sfx.play('spyventsFanWhine'); }
      // a hacked fan stays stopped while one of us is through and the other isn't (both must get through)
      const split = !f.failing && f.stopT > 0 && f.stopT < 1 && Math.sign(st.ag[0].x - cx(f.c)) !== Math.sign(st.ag[1].x - cx(f.c));
      if (split) f.stopT = 1;
      if (f.stopT > 0) { f.stopT -= dt; if (f.stopT <= 0) { // spinning again: push anyone in it out to the nearer side
        for (const a of st.ag) { const c = cellOf(a.x, a.y); if (c.c === f.c && c.r === f.r) { const side = a.x < cx(f.c) ? -1 : 1; a.x = cx(f.c + side); } }
        Sfx.play('spyventsFanSpinUp'); } }
      f.ang += (f.stopT > 0 ? 0.6 : 14) * dt;
    }
  }
  function hackStep(st) { if (st.hack) { const p = st.L.panels[st.hack.p], a = st.ag[st.hack.who]; if (Math.hypot(a.x - cx(p.hc), a.y - cy(p.hr)) > 14) st.hack = null; } }
  function lights(st, dt) {
    const lt = st.ag[st.lightId];
    for (const p of st.L.panels) if (inCone(st, p.px, p.py)) st.litT[p.id] = st.T;
    // a lit grate with a Zero under it: he looks up, Noise jumps
    st.looking = [];
    for (const g of st.grates) {
      if (!inCone(st, g.x, g.y, lt)) continue;
      const rm = roomUnder(st, g); if (!rm) continue;
      if (Math.abs(zeroX(rm, st.T) - g.x) < 30) {
        makeNoise(st, S.noiseGrate * (st.gold ? S.goldGuard : 1) * dt);
        st.looking.push(rm);
        if (G.time - (rm.heyT || 0) > 1.6) { rm.heyT = G.time; Sfx.play('spyHey'); K.pop(st, g.x - st.camX, g.y - st.camY + 34, 'Huh?', '#ffd0c8', 14); }
      }
    }
    // Count Zero on the tannoy, now and then, up through a grate on screen
    st.tannoy = (st.tannoy || 8) - dt;
    if (st.tannoy <= 0) {
      st.tannoy = 14 + Math.random() * 8;
      const vis = st.grates.filter(g => g.x > st.camX && g.x < st.camX + W && g.y > st.camY && g.y < st.camY + H);
      if (vis.length) { const g = vis[Math.floor(Math.random() * vis.length)]; K.pop(st, g.x - st.camX, g.y - st.camY + 50, ['FIND THEM!', 'CHECK THE VENTS!', 'MY DIAMOND!'][Math.floor(Math.random() * 3)], '#ffb0a0', 16); Sfx.play('spyventsTannoy'); }
    }
  }
  function caseStep(st) {
    const hk = st.ag[st.hackId];
    if (st.caseOn === st.lightId && Math.hypot(hk.x - st.ag[st.lightId].x, hk.y - st.ag[st.lightId].y) < 30) { const c = cellOf(hk.x, hk.y); if (chAt(st, c.c, c.r) !== 'q') st.caseOn = hk.id; }
    if (st.caseOn == null && st.caseAt && Math.hypot(hk.x - st.caseAt.x, hk.y - st.caseAt.y) < 20) { st.caseOn = hk.id; st.caseAt = null; Sfx.play('spyventsCaseCatch'); }
  }
  function pickups(st) {
    st.L.reels.forEach((e, i) => {
      if (st.got[i]) return;
      for (const a of st.ag) if (Math.hypot(a.x - cx(e.c), a.y - cy(e.r)) < 18) {
        st.got[i] = true; st.reels++; st.reelGot[st.k] = (st.reelGot[st.k] || 0) + 1;
        Sfx.play('spyIntel'); K.pop(st, cx(e.c) - st.camX, cy(e.r) - st.camY - 26, 'Microfilm ' + st.reels + '/' + S.reels, '#fff1c0', 16);
        break;
      }
    });
  }
  function sniffers(st, dt) {
    if (!st.snif.length) return;
    let D = null;
    for (const s of st.snif) {
      // it comes in S.at s after both are past column `after`
      if (s.armT == null) {
        // after a restart it comes in once both have moved off the checkpoint (or after a grace that grows with each try)
        const go = s.after == null ? st.T > s.grace || st.ag.every(a => Math.hypot(a.x - s.cpx, a.y - s.cpy) > Z * 2.5) : st.ag.every(a => a.x >= cx(s.after));
        if (go) s.armT = st.T; else continue;
      }
      if (!s.on) { if (st.T - s.armT >= s.at) { s.on = true; Sfx.play('spyventsSnifferBeep'); K.msg(st, 'Something\'s in the ducts behind you...', '#ffd0c8', 2.6); } else continue; }
      s.eye += dt;
      const sc = cellOf(s.x, s.y), mx = cx(sc.c), my = cy(sc.r);
      // cutting through a shut door
      if (s.cutting) {
        const d = s.cutting; d.cut += dt; if (Math.floor(d.cut * 5) !== Math.floor((d.cut - dt) * 5)) Sfx.play('spyventsSnifferCut');
        if (d.cut >= S.cutT) { d.broken = true; s.cutting = null; Sfx.play('spyventsDoorSlide'); }
        continue;
      }
      if (!D) { D = st.ag.map(a => { const c = cellOf(a.x, a.y); return bfs(st, c.c, c.r, null, { thru: (c2, r2) => { const ch = chAt(st, c2, r2); return ch === 'D' || ch === 'H' || ch === 'f'; } }); }); }
      const id = sc.c + sc.r * st.L.cols;
      const dist = D.map(d => d[id] < 0 ? 1e9 : d[id]), tgt = dist[0] <= dist[1] ? 0 : 1, Dm = D[tgt];
      // to the neighbour cell that's one closer (once lined up with the middle of this one)
      let best = null;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = (sc.c + dx) + (sc.r + dy) * st.L.cols; if (Dm[n] >= 0 && Dm[n] < Dm[id]) best = [dx, dy]; }
      const a = st.ag[tgt];
      let tx = a.x, ty = a.y;
      if (best && Dm[id] > 0) { tx = cx(sc.c + best[0]); ty = cy(sc.r + best[1]); const ch = chAt(st, sc.c + best[0], sc.r + best[1]);
        if ((ch === 'D' || ch === 'H') && !passable(st, sc.c + best[0], sc.r + best[1], null) && Math.hypot(s.x - mx, s.y - my) < 3) { s.cutting = doorAt(st, sc.c + best[0], sc.r + best[1]); continue; }
        if (ch === 'f' && !passable(st, sc.c + best[0], sc.r + best[1], null) && Math.hypot(s.x - mx, s.y - my) < 3) continue;
        // keep to the rails: first line up on the cell's middle
        if (best[0] && Math.abs(s.y - my) > 1) { tx = s.x; ty = my; } else if (best[1] && Math.abs(s.x - mx) > 1) { tx = mx; ty = s.y; }
      }
      // each catch at the same checkpoint slows it a little (down to 60%), so a team that keeps getting caught gets through
      const v = (S.snifV + (st.noise > 50 ? S.snifFast : 0)) * (st.gold ? S.goldSnif : 1) * Math.max(0.6, 1 - 0.1 * (st.cpTries || 0));
      const dx = tx - s.x, dy = ty - s.y, d = Math.hypot(dx, dy);
      if (d > 0.01) { const m = Math.min(d, v * dt); s.x += dx / d * m; s.y += dy / d * m; s.face = Math.sign(dx) || s.face || 1; }
      if (Math.floor(s.eye * 4) !== Math.floor((s.eye - dt) * 4) && Math.hypot(s.x - st.camX - W / 2, s.y - st.camY - H / 2) < 700) Sfx.play('spyventsSnifferTick');
      for (const q of st.ag) if (Math.hypot(q.x - s.x, q.y - s.y) < S.catchR) { caught(st); return; }
    }
  }
  function heard(st) { if (st.state !== 'go') return; st.state = 'heard'; st.endT = 0; st.stats.heard++; bad(st); st.hack = null; Sfx.play('spyventsBroomBang'); Sfx.play('spyGrumble'); K.msg(st, 'HEARD! A broom bangs the duct!', '#ffd0c8', 2.2); }
  function caught(st) { if (st.state !== 'go') return; st.state = 'caught'; st.endT = 0; st.stats.caught++; bad(st); st.hack = null; Sfx.play('spyventsSnifferNet'); K.msg(st, 'CAUGHT! The Sniffer\'s net!', '#ffd0c8', 2.2); }
  // each agent's step on the route, and the checkpoint
  function progress(st) {
    const R = st.L.steps;
    for (const a of st.ag) {
      let n = a.step;
      while (n < R.length - 1 && stepDone(st, a, R[n], n)) n++;
      a.step = n;
    }
    const cp = st.L.cp;
    if (cp && !st.cp && st.ag.every(a => a.step >= cp.step && cellOf(a.x, a.y).c >= cp.c - 1)) {
      st.cp = cp; st.cpTries = 0; Sfx.play('spyventsCheckpoint'); K.pop(st, cx(cp.c) - st.camX, cy(cp.r) - st.camY - 30, 'Checkpoint!', '#8fe3b0', 18);
    }
  }
  const atCell = (a, c, r, tol = 12) => Math.hypot(a.x - cx(c), a.y - cy(r)) < tol;
  // where a step happens (the cells a person would be standing in when they have got that far)
  function stepCells(st, s) {
    const L = st.L;
    if (s.t === 'hack' || s.t === 'close') { const p = L.panels[s.p]; return [[p.hc, p.hr], [p.lc, p.lr]]; }
    if (s.t === 'fan') return [[s.wc, s.wr]];
    if (s.t === 'squeeze') { const q = L.squeezes[s.q]; return [[q.bc, q.r]]; }
    return [[s.c, s.r]];
  }
  function stepDone(st, a, s, n) {
    const L = st.L;
    if (s.t === 'go') return atCell(a, s.c, s.r, 16) || (s.rush != null && atCell(a, s.c, s.r, 30));
    // (a side trip for a reel is skipped when a Sniffer is within 320 px)
    if (s.t === 'reel') {
      if (st.got[s.i] || st.snif.some(q => q.on && st.ag.some(b => Math.hypot(b.x - q.x, b.y - q.y) < 320))) return true;
      // reels are optional. A person who crawls on past the side duct has skipped it (their step used to wait on the
      // reel for ever: no checkpoint, no prompts, and the computer waiting at the side duct for them to come back);
      // the computer gives one up when the leash holds it back from it (its person is too far ahead)
      if (cpuOn(a.id)) return a.leashT > 1.2;
      let m = n + 1; while (m < L.steps.length - 1 && L.steps[m].t === 'reel') m++;
      return stepCells(st, L.steps[m]).some(([c, r]) => atCell(a, c, r, 20));
    }
    if (s.t === 'hack') { const p = L.panels[s.p]; if (p.kind === 'fan') return L.fans[p.target].stopT > 0; return p.done; }
    if (s.t === 'close') { const p = L.panels[s.p], d = L.doors[p.target]; return p.done || d.broken || (bothPast(st, p) && !snifNear(st, d)); }
    if (s.t === 'fan') return a.x > cx(s.ac) - 4 && cellOf(a.x, a.y).r === s.ar;
    if (s.t === 'squeeze') { const q = L.squeezes[s.q]; const hk = st.ag[st.hackId]; return st.caseOn === hk.id && cellOf(hk.x, hk.y).c >= q.ac; }
    return false;
  }
  // shutting a door behind us is only worth it with a Sniffer within 300 px of the door (and both through it)
  const snifNear = (st, d) => st.snif.some(s => s.on && Math.hypot(s.x - cx(d.c), s.y - cy(d.r)) < 300 && (s.x < cx(d.c) || s.y < cy(d.r)));
  const bothPast = (st, p) => { const d = st.L.doors[p.target]; return st.ag.every(a => (a.x - cx(d.c)) * (p.hc - d.c) + (a.y - cy(d.r)) * (p.hr - d.r) > Z * 0.6); };
  // a cell about n steps back toward the start from (c, r): where a Sniffer comes back in after a restart
  function backCell(st, c, r, n) {
    const L = st.L, D = bfs(st, L.start[0], L.start[1], null, { fwd: true, thru: (c2, r2) => '.DHfgmsvwnq'.includes(chAt(st, c2, r2)) });
    for (let i = 0; i < n; i++) {
      let best = null;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const id = (c + dx) + (r + dy) * L.cols; if (c + dx >= 0 && r + dy >= 0 && c + dx < L.cols && r + dy < L.rows && D[id] >= 0 && D[id] < D[c + r * L.cols]) best = [c + dx, r + dy]; }
      if (!best) break; [c, r] = best;
    }
    return [c, r];
  }

  /* ---------- camera and the engine bodies ---------- */
  function camera(st, dt) {
    const mx = (st.ag[0].x + st.ag[1].x) / 2, my = (st.ag[0].y + st.ag[1].y) / 2, L = st.L;
    st.camX = K.lerp(st.camX, clamp(mx - W / 2, 0, Math.max(0, L.cols * Z - W)), clamp(dt * 3, 0, 1));
    st.camY = K.lerp(st.camY, clamp(my - H / 2, -40, Math.max(0, L.rows * Z - H + 40)), clamp(dt * 3, 0, 1));
  }
  function mirrorOut(st) {
    const prog = (st.k + Math.min(1, (st.ag[0].x + st.ag[1].x) / 2 / (st.L.cols * Z))) / 4;
    st.spyLook = st.ag.map(a => ({ dust: prog, web: a.web }));
    for (const a of st.ag) K.place(a.id, a.x - st.camX, a.y - st.camY + 16);
    st.run = st.ag.map(a => ({ x: a.x, y: a.y }));
  }

  /* ---------- what to do next (the prompts, the HUD and the computer brain read this) ---------- */
  function plan(st) {
    if (st.planMemo && st.planMemo.n === G.tickN && st.planMemo.k === st.k) return st.planMemo.p;
    const p = planNow(st);
    st.planMemo = { n: G.tickN, k: st.k, p };
    return p;
  }
  function planNow(st) {
    const L = st.L, R = L.steps, out = { steps: R, ag: [], light: st.lightId, hack: st.hackId };
    for (const a of st.ag) {
      const s = R[Math.min(a.step, R.length - 1)], isLight = a.id === st.lightId;
      const P = { step: a.step, kind: s.t, to: null, face: null, cover: false, hack: null, act: false, why: 'go', wait: false };
      // a wrist screen is open: whatever step the light agent is on, the hacker needs the torch on that panel
      if (isLight && st.hack && !(s.t === 'hack' && s.p === st.hack.p)) { const p = L.panels[st.hack.p]; P.panel = p.id; P.to = [p.lc, p.lr]; P.face = DIRS[p.ld]; P.why = 'shine'; }
      else if (s.t === 'go' || s.t === 'reel' || s.t === 'exit') { P.to = [s.c, s.r]; P.why = s.t; }
      else if (s.t === 'hack') {
        const p = L.panels[s.p];
        P.panel = p.id;
        if (isLight) { P.to = [p.lc, p.lr]; P.face = DIRS[p.ld]; P.why = 'shine'; }
        else { P.to = [p.hc, p.hr]; P.why = 'hack'; P.hack = p.id; }
      } else if (s.t === 'close') {
        const p = L.panels[s.p];
        P.panel = p.id;
        if (!bothPast(st, p)) { P.to = isLight ? [p.lc, p.lr] : [p.hc, p.hr]; P.why = 'go'; }
        else if (isLight) { P.to = [p.lc, p.lr]; P.face = DIRS[p.ld]; P.why = 'shine'; }
        else { P.to = [p.hc, p.hr]; P.why = 'close'; P.hack = p.id; }
      } else if (s.t === 'fan') {
        const f = L.fans[s.f], other = partnerOf(st, a);
        // go while there's still time to get through before it spins again (from the waiting cell, at a crawl)
        const need = 2 * Z / (isLight ? S.crawl : S.crawlH) + 0.35, fresh = f.stopT > need;
        const otherReady = atCell(other, s.wc, s.wr, 30) || other.x > cx(s.wc) || other.step > a.step;
        if (a.x < cx(s.wc) + 2 && !(fresh && otherReady)) { P.to = [s.wc, s.wr]; P.why = 'waitFan'; P.wait = true; }
        else { P.to = [s.ac, s.ar]; P.why = 'rush'; }
        P.fan = f.id;
      } else if (s.t === 'squeeze') {
        const q = L.squeezes[s.q];
        if (isLight) { P.to = [q.ac, q.r]; P.why = 'catch'; if (st.caseOn == null && st.caseAt) { P.to = [q.ac, q.r]; } }
        else {
          if (st.caseOn === a.id) {
            P.to = [q.bc, q.r]; P.why = 'push';
            const lt = st.ag[st.lightId];
            if (atCell(a, q.bc, q.r, 8) && Math.hypot(lt.x - cx(q.ac), lt.y - cy(q.r)) < 28) P.act = 'tap'; else if (atCell(a, q.bc, q.r, 8)) P.wait = true;
          } else if (st.caseOn == null && st.caseAt) { P.to = [Math.floor(st.caseAt.x / Z), Math.floor(st.caseAt.y / Z)]; P.why = 'fetch'; }
          else { P.to = [q.ac, q.r]; P.why = 'go'; }
        }
      }
      out.ag[a.id] = P;
    }
    return out;
  }

  /* ---------- drawing ---------- */
  let darkCv = null;
  function draw(st) {
    const t = G.clock, L = st.L, ox = st.camX, oy = st.camY;
    ctx.fillStyle = '#101418'; ctx.fillRect(0, 0, W, H);
    const c0 = Math.max(0, Math.floor(ox / Z)), c1 = Math.min(L.cols - 1, Math.ceil((ox + W) / Z)), r0 = Math.max(0, Math.floor(oy / Z)), r1 = Math.min(L.rows - 1, Math.ceil((oy + H) / Z));
    // the rooms below the grates (lit), with their Zeroes
    for (const rm of L.rooms) {
      const x = rm.c0 * Z - ox, y = rm.r0 * Z - oy, w = (rm.c1 - rm.c0 + 1) * Z, h = (rm.r1 - rm.r0 + 1) * Z;
      if (x > W || x + w < 0 || y > H || y + h < 0) continue;
      ctx.fillStyle = '#4a4230'; ctx.fillRect(x, y, w, h);
      // striped wallpaper, a framed picture, a ceiling lamp, floorboards with a skirting board
      ctx.fillStyle = 'rgba(120,90,50,0.35)'; for (let k = x + 6; k < x + w; k += 18) ctx.fillRect(k, y, 6, h - 10);
      ctx.fillStyle = 'rgba(255,214,120,0.35)'; ctx.fillRect(x, y, w, h);
      { const lg = ctx.createRadialGradient(x + w / 2, y + 8, 2, x + w / 2, y + 8, Math.max(w, h) * 0.7); lg.addColorStop(0, 'rgba(255,230,160,0.35)'); lg.addColorStop(1, 'rgba(255,230,160,0)'); ctx.fillStyle = lg; ctx.fillRect(x, y, w, h); }
      ctx.fillStyle = '#2a2418'; ctx.fillRect(x + w / 2 - 1, y, 2, 8); ctx.fillStyle = '#ffe6a8'; ctx.beginPath(); ctx.moveTo(x + w / 2 - 9, y + 14); ctx.lineTo(x + w / 2 + 9, y + 14); ctx.lineTo(x + w / 2 + 5, y + 7); ctx.lineTo(x + w / 2 - 5, y + 7); ctx.closePath(); ctx.fill();
      if (w > 120) { const fx = x + 24, fy = y + 22; ctx.fillStyle = '#8a6a30'; ctx.fillRect(fx, fy, 30, 22); ctx.fillStyle = '#3a5a6a'; ctx.fillRect(fx + 3, fy + 3, 24, 16); ctx.fillStyle = '#5a8a5a'; ctx.beginPath(); ctx.moveTo(fx + 3, fy + 19); ctx.lineTo(fx + 12, fy + 9); ctx.lineTo(fx + 20, fy + 15); ctx.lineTo(fx + 27, fy + 8); ctx.lineTo(fx + 27, fy + 19); ctx.closePath(); ctx.fill(); }
      ctx.fillStyle = '#5a3e2a'; ctx.fillRect(x, y + h - 10, w, 10);
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; for (let k = x + 20; k < x + w; k += 34) ctx.fillRect(k, y + h - 10, 1.5, 10);
      ctx.fillStyle = '#3a281a'; ctx.fillRect(x, y + h - 14, w, 4); ctx.fillStyle = 'rgba(255,230,180,0.25)'; ctx.fillRect(x, y + h - 10, w, 1.5);
      if (rm.prop === 'cup') { ctx.fillStyle = '#6a4a30'; ctx.fillRect(x + w / 2 - 20, y + h - 30, 40, 20); ctx.fillStyle = '#f4f2ee'; ctx.fillRect(x + w / 2 - 6, y + h - 38, 8, 8); }
      const zx = zeroX(rm, st.T) - ox, look = st.looking && st.looking.includes(rm);
      K.zero(zx, y + h - 10, { s: 0.7, pose: look ? 'look' : 'walk', t: st.T * 3, face: Math.sign(zeroX(rm, st.T + 0.1) - zeroX(rm, st.T)) || 1, torch: rm.prop === 'torch' && !look, broom: rm.prop !== 'torch' });
    }
    // the ducts
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
      const ch = L.g[r][c], x = c * Z - ox, y = r * Z - oy;
      if (ch === '#') { if (!L.rooms.some(rm => c >= rm.c0 && c <= rm.c1 && r >= rm.r0 && r <= rm.r1)) { ctx.fillStyle = (c + r) % 2 ? '#2a3036' : '#283036'; ctx.fillRect(x, y, Z, Z); ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(x + 4, y + 4, 2, 2); ctx.fillRect(x + Z - 6, y + Z - 6, 2, 2); } continue; }
      ctx.fillStyle = '#1a2024'; ctx.fillRect(x, y, Z, Z);
      // sheet-metal seams and rivets inside the duct
      ctx.fillStyle = 'rgba(255,255,255,0.04)'; ctx.fillRect(x, y + 3, Z, Z * 0.3);
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x + Z - 1.5, y, 1.5, Z);
      ctx.fillStyle = 'rgba(150,165,175,0.25)'; circle(x + Z - 5, y + 6, 1.2); ctx.fill(); circle(x + Z - 5, y + Z - 6, 1.2); ctx.fill();
      ctx.fillStyle = '#5a646a';
      if (chAt(st, c, r - 1) === '#') ctx.fillRect(x, y, Z, 3);
      if (chAt(st, c, r + 1) === '#' && ch !== 'g') ctx.fillRect(x, y + Z - 3, Z, 3);
      if (chAt(st, c - 1, r) === '#') ctx.fillRect(x, y, 3, Z);
      if (chAt(st, c + 1, r) === '#') ctx.fillRect(x + Z - 3, y, 3, Z);
      if (ch === 'g') { ctx.fillStyle = 'rgba(255,214,120,0.5)'; ctx.fillRect(x + 2, y + Z - 5, Z - 4, 5); ctx.fillStyle = '#5a646a'; for (let k = 4; k < Z; k += 6) ctx.fillRect(x + k, y + Z - 5, 2, 5); }
      if (ch === 'm') { ctx.fillStyle = '#4a545a'; ctx.fillRect(x, y + Z - 5, Z, 5); ctx.fillStyle = 'rgba(0,0,0,0.4)'; circle(x + 12, y + Z - 3, 3); ctx.fill(); circle(x + 28, y + Z - 2, 2); ctx.fill(); }
      if (ch === 'v') { ctx.fillStyle = 'rgba(255,255,255,0.05)'; for (let k = 0; k < Z; k += 8) ctx.fillRect(x + 6, y + k, Z - 12, 2); }
      if (ch === 'w') { ctx.strokeStyle = 'rgba(230,230,230,0.5)'; ctx.lineWidth = 0.8; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(x + Z, y + k * 4); ctx.lineTo(x + Z - 18 + k * 3, y + 18); ctx.stroke(); } ctx.beginPath(); ctx.arc(x + Z - 6, y + 6, 8, 0, TAU); ctx.stroke(); }
      if (ch === 'n') { ctx.fillStyle = '#6a5a3a'; ctx.beginPath(); ctx.ellipse(x + Z / 2, y + Z - 6, 14, 6, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#9a9aa0'; circle(x + Z / 2 + 6, y + Z - 12, 4); ctx.fill(); ctx.fillStyle = '#ff6a6a'; circle(x + Z / 2 + 8, y + Z - 13, 1); ctx.fill(); }
      if (ch === 'q') { ctx.fillStyle = '#4a545a'; ctx.fillRect(x, y, Z, 12); ctx.fillRect(x, y + Z - 8, Z, 8); }
      if (ch === 'D' || ch === 'H') { const d = doorAt(st, c, r); if (!d.open && !d.broken) { ctx.fillStyle = '#6a747a'; ctx.fillRect(x + (d.hatch ? 0 : 14), y + (d.hatch ? 14 : 0), d.hatch ? Z : 12, d.hatch ? 12 : Z); ctx.fillStyle = 'rgba(0,0,0,0.3)'; for (let k = 4; k < Z; k += 7) ctx.fillRect(x + (d.hatch ? k : 16), y + (d.hatch ? 16 : k), d.hatch ? 2 : 8, d.hatch ? 8 : 2); if (d.cut > 0) { ctx.strokeStyle = '#ffb040'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x + Z / 2, y + Z / 2, 12, 0, TAU * d.cut / S.cutT); ctx.stroke(); } } else if (d.broken) { ctx.fillStyle = '#3a4248'; ctx.fillRect(x + 2, y + Z - 6, 14, 4); } }
      if (ch === 'f') drawFan(st, fanAt(st, c, r), x, y, t);
      const sv = steamAt(st, c, r);
      if (sv) { const ph = steamPhase(sv, st.T); ctx.fillStyle = '#3a4248'; ctx.fillRect(x + 12, y + Z - 6, 16, 6); if (ph !== 'off') { ctx.fillStyle = 'rgba(230,240,245,' + (ph === 'on' ? 0.75 : 0.25) + ')'; for (let k = 0; k < (ph === 'on' ? 6 : 2); k++) circle(x + 14 + K.hash(k + Math.floor(t * 8)) * 12, y + Z - 10 - k * 5, ph === 'on' ? 7 : 3), ctx.fill(); } }
    }
    // the junction arrows (only shown in the torch cone, below)
    // panels
    for (const p of L.panels) {
      if (p.kind === 'close' && !L.doors[p.target].open) continue;
      const x = p.px - ox, y = p.py - oy;
      ctx.fillStyle = p.kind === 'fan' ? '#6a5a2a' : '#3a4a52'; rr(x - 6, y - 6, 12, 12, 2); ctx.fill();
      ctx.fillStyle = p.done ? '#3a8a5a' : '#c84a3a'; circle(x, y, 2); ctx.fill();
    }
    // reels, the dropped briefcase
    L.reels.forEach((e, i) => { if (!st.got[i]) K.intel('reel', cx(e.c) - ox, cy(e.r) - oy + 6, 0.8, t); });
    if (st.caseAt) K.briefcase(st.caseAt.x - ox, st.caseAt.y - oy + 16, 0.7);
    // the agents and the Sniffers
    for (const a of st.ag) drawAgent(st, a, t);
    for (const s of st.snif) if (s.on || (s.armT != null && st.T - s.armT > s.at - 3)) drawSniffer(st, s, t);
    K.drawParts(st);
    // the darkness: a near-black sheet with the torch cone, small glows and grate light cut out of it
    darkness(st, t);
    // what only the torch shows: junction arrows and the panels' patterns
    for (const ar of L.arrows) if (inCone(st, cx(ar.c), cy(ar.r))) { const x = cx(ar.c) - ox, y = cy(ar.r) - oy, [dx, dy] = DIRS[ar.d]; ctx.fillStyle = 'rgba(93,255,154,0.85)'; ctx.beginPath(); ctx.moveTo(x + dx * 14, y + dy * 14); ctx.lineTo(x - dy * 7, y + dx * 7); ctx.lineTo(x + dy * 7, y - dx * 7); ctx.closePath(); ctx.fill(); }
    if (st.hack) drawScreen(st, t);
    // the red eyes show through the dark
    for (const s of st.snif) if (s.on) { const x = s.x - ox, y = s.y - oy + 6; ctx.fillStyle = 'rgba(255,40,40,' + (0.7 + 0.3 * Math.sin(t * 6)) + ')'; circle(x - 4 * (s.face || 1) + 4, y - 4, 2.6); ctx.fill(); circle(x + 4 * (s.face || 1) + 4, y - 4, 2.6); ctx.fill(); ctx.fillStyle = 'rgba(255,40,40,0.18)'; circle(x + 4, y - 4, 12); ctx.fill(); }
    if (strobeOn(st)) K.strobe(0.6);
    if (st.state === 'heard') { const sh = Math.sin(st.endT * 40) * 6 * Math.max(0, 1 - st.endT); ctx.save(); ctx.translate(sh, 0); bigText('HEARD!', W / 2, H / 2 - 40, 40, '#ffd0c8'); ctx.restore(); }
    if (st.state === 'caught') bigText('CAUGHT!', W / 2, H / 2 - 40, 40, '#ffd0c8');
    if (st.state === 'end' && st.k === 3) { ctx.fillStyle = 'rgba(10,40,50,' + clamp(st.endT / 1.5, 0, 0.8) + ')'; ctx.fillRect(0, 0, W, H); }
  }
  function darkness(st, t) {
    if (!darkCv) { darkCv = document.createElement('canvas'); darkCv.width = W; darkCv.height = H; }
    const g = darkCv.getContext('2d'), ox = st.camX, oy = st.camY, lt = st.ag[st.lightId];
    g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(2,4,6,' + S.dark + ')'; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'destination-out';
    const hole = (x, y, r, a) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(0,0,0,' + a + ')'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); };
    // the rooms below glow up through their grates, and are lit themselves
    for (const rm of st.L.rooms) { const x = rm.c0 * Z - ox, y = rm.r0 * Z - oy, w = (rm.c1 - rm.c0 + 1) * Z, h = (rm.r1 - rm.r0 + 1) * Z; g.fillStyle = 'rgba(0,0,0,0.7)'; g.fillRect(x, y, w, h); }
    for (const gt of st.grates) hole(gt.x - ox, gt.y - oy + 12, 34, 0.55);
    // the torch cone
    const lx = lt.x - ox, ly = lt.y - oy;
    if (!lt.cover) {
      const ang = Math.atan2(lt.td[1], lt.td[0]);
      const gr = g.createRadialGradient(lx, ly, 4, lx, ly, S.cone); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.75, 'rgba(0,0,0,0.85)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.beginPath(); g.moveTo(lx, ly); g.arc(lx, ly, S.cone, ang - S.coneA, ang + S.coneA); g.closePath(); g.fill();
      hole(lx, ly, 34, 0.7);
    } else hole(lx + lt.td[0] * 8, ly + lt.td[1] * 8, 18, 0.35);
    // the hacker's green wrist screen and the briefcase's glow; the other agent faintly
    const hk = st.ag[st.hackId];
    hole(hk.x - ox, hk.y - oy, st.hack ? 40 : 20, st.hack ? 0.6 : 0.35);
    if (st.caseAt) hole(st.caseAt.x - ox, st.caseAt.y - oy, 18, 0.4);
    if (strobeOn(st)) { g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, 0, W, H); }
    ctx.drawImage(darkCv, 0, 0);
    // a warm tint inside the cone
    if (!lt.cover) { const ang = Math.atan2(lt.td[1], lt.td[0]); ctx.fillStyle = st.gold ? 'rgba(255,214,90,0.08)' : 'rgba(255,240,190,0.06)'; ctx.beginPath(); ctx.moveTo(lx, ly); ctx.arc(lx, ly, S.cone, ang - S.coneA, ang + S.coneA); ctx.closePath(); ctx.fill(); }
  }
  function drawFan(st, f, x, y, t) {
    ctx.save(); ctx.translate(x + Z / 2, y + Z / 2);
    ctx.fillStyle = '#3a4248'; circle(0, 0, Z / 2 - 2); ctx.fill();
    ctx.rotate(f.ang); ctx.fillStyle = f.stopT > 0 ? '#9aa4aa' : 'rgba(170,180,186,0.6)';
    for (let k = 0; k < 4; k++) { ctx.rotate(TAU / 4); ctx.beginPath(); ctx.ellipse(0, -9, 4, 9, 0, 0, TAU); ctx.fill(); }
    ctx.restore();
    if (f.failing) { ctx.fillStyle = Math.sin(t * 20) > 0.6 ? '#ffcf3a' : '#5a4a1a'; circle(x + 6, y + 6, 2.5); ctx.fill(); }
    if (f.stopT > 0 && !f.failing) K.meter(x + 4, y - 6, Z - 8, 4, f.stopT / S.fanStop, COL.green);
  }
  function drawSniffer(st, s, t) {
    const x = s.x - st.camX, y = s.y - st.camY + 14;
    ctx.fillStyle = '#2a2e34'; rr(x - 14, y - 12, 28, 12, 4); ctx.fill();
    ctx.fillStyle = '#4a5058'; for (let k = 0; k < 4; k++) { circle(x - 10 + k * 7, y, 3.5); ctx.fill(); }
    ctx.fillStyle = '#3a3e44'; rr(x - 9, y - 22, 18, 11, 3); ctx.fill();
    // the twitching sensor nose
    ctx.strokeStyle = '#8a9096'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 9 * (s.face || 1), y - 16); ctx.lineTo(x + (16 + Math.sin(t * 18) * 2) * (s.face || 1), y - 18 + Math.sin(t * 13) * 2); ctx.stroke();
  }
  function drawAgent(st, a, t) {
    const x = a.x - st.camX, y = a.y - st.camY + 16, vert = Math.abs(a.dir[1]) > 0;
    const o = { face: a.td[0] || (a.id ? -1 : 1), s: 0.75 };
    if (!vert) { o.sy = 0.62; o.sx = 1.3; }
    K.hero(a.id, x, y, o);
    if (a.id === st.lightId) {
      // the torch in hand
      ctx.fillStyle = '#c8ccd2'; const tx = x + a.td[0] * 12, ty = y - 14 + a.td[1] * 10; rr(tx - 4, ty - 2.5, 8, 5, 1.5); ctx.fill();
      ctx.fillStyle = a.cover ? '#8a6a40' : '#fff6c0'; circle(tx + a.td[0] * 4, ty + a.td[1] * 3, 2); ctx.fill();
    } else {
      // the wrist screen (green) and the briefcase strapped on
      ctx.fillStyle = st.hack ? '#5dff9a' : '#2a8a5a'; ctx.fillRect(x + 6 * o.face, y - 12, 5, 4);
      if (st.caseOn === a.id) K.briefcase(x - 10 * o.face, y - 10, 0.5);
    }
    if (st.caseOn === st.lightId && a.id === st.lightId) K.briefcase(x - 10 * o.face, y - 10, 0.5);
  }
  function drawScreen(st, t) {
    const h = st.hack, p = st.L.panels[h.p], hk = st.ag[h.who], lit = readable(st, p);
    const n = p.seq.length, w = 34 + n * 26, x = clamp(hk.x - st.camX - w / 2, 8, W - w - 8), y = clamp(hk.y - st.camY - 84, 60, H - 120);
    ctx.fillStyle = 'rgba(8,24,16,0.92)'; rr(x, y, w, 46, 8); ctx.fill(); ctx.strokeStyle = '#2a8a5a'; ctx.lineWidth = 2; rr(x, y, w, 46, 8); ctx.stroke();
    const glyph = { l: '◀', r: '▶', u: '▲', d: '▼' };
    for (let i = 0; i < n; i++) {
      const gx = x + 22 + i * 26, gy = y + 24;
      if (i < h.i) text('✓', gx, gy, 16, '#5dff9a', 'center', 'body');
      else if (lit) text(glyph[p.seq[i]], gx, gy, 18, i === h.i ? '#ffffff' : '#5dff9a', 'center', 'body');
      else { ctx.fillStyle = 'rgba(93,255,154,0.25)'; circle(gx, gy, 3); ctx.fill(); }
    }
    if (!lit) text('Too dark to read. Light, please!', x + w / 2, y + 58, 12, '#8fe3b0', 'center', 'body');
  }

  /* ---------- HUD ---------- */
  function hud(st) {
    const big = hudBig(), z = big ? 1.25 : 1;
    let x0;
    {
      const fs = big ? 20 : 14, h = big ? 40 : 28, tm = fmtTime(G.time), n = '◎ ' + st.reels + ' / ' + S.reels;
      ctx.font = K.FONT(fs);
      const w = ctx.measureText(tm).width + ctx.measureText(n).width + fs + 30;
      x0 = pill(W - 14, 12, w, h, 'right');
      text(tm, x0 + 15, 12 + h / 2 + 0.5, fs, st.waiting ? '#aab' : C.paper, 'left', 'body');
      text(n, x0 + w - 15, 12 + h / 2 + 0.5, fs, '#fff1c0', 'right', 'body');
      K.alertBar(W - 14 - 230 * z, 12 + h + 8, 230, st.noise / 100, { icon: 'ear', label: 'Noise', flash: st.made > 0 });
      if (st.gold) K.chip(W - 14 - 120 * z, 12 + h + 40 * z, 120 * z, 22 * z, '★ gold torch', false, true, z);
    }
    K.drawMsg(st, st.waiting ? { text: K.BREAK, col: '#ffffff', t: 1, life: 2 } : st.msg, x0);
    K.drawControl(st);
    if (st.state !== 'go') return;
    const pl = plan(st), P = K.prompter(st);
    for (const a of st.ag) {
      const Pa = pl.ag[a.id], x = a.x - st.camX, y = a.y - st.camY - 26;
      let s = null, col = C.gold, pulse = false;
      const c = cellOf(a.x, a.y);
      if (a.id === st.lightId) {
        if (!a.cover && grateRisk(st, a, 0)) { s = 'Guard below! Cover the torch ' + K.key(a.id, 'act'); pulse = true; }
        else if (Pa.why === 'shine' && st.hack && !readable(st, st.L.panels[st.hack.p])) { s = 'Shine the torch on the panel!'; pulse = true; }
        else if (Pa.why === 'catch' && st.caseOn === st.hackId) s = 'Wait here to catch the case';
        else if (chAt(st, c.c, c.r) === 'm' || chAt(st, c.c + a.td[0], c.r) === 'm') s = 'Dented metal: tap to creep';
      } else {
        if (st.hack) s = readable(st, st.L.panels[st.hack.p]) ? 'Press the arrows!' : 'Too dark! ' + NAMES[st.lightId] + ', light please!';
        else if ((Pa.why === 'hack' || Pa.why === 'close') && atCell(a, Pa.to[0], Pa.to[1], 14)) { s = 'Press ' + K.key(a.id, 'act') + ' to hack'; pulse = true; }
        else if (Pa.why === 'push' && atCell(a, Pa.to[0], Pa.to[1], 14)) s = Pa.wait ? 'Wait for ' + NAMES[st.lightId] + ' on the far side' : 'Push the case through ' + K.key(a.id, 'act');
        else if (Pa.why === 'fetch') s = 'Fetch the briefcase!';
        else if (chAt(st, c.c, c.r) === 'm') s = 'Dented metal: tap to creep';
      }
      if (!s && chAt(st, c.c, c.r) === 'v') s = 'Hold ' + K.key(a.id, 'down') + ' to brake';
      if (!s && Pa.why === 'waitFan') s = 'Wait for the strobe: the fan stops';
      P.say(a.id, s, x, y, col, pulse);
    }
    for (const id of [0, 1]) {
      const b = K.panel(id, id === st.lightId ? 'torch' : 'hacker', 210, 46, z), a = st.ag[id];
      text(id === st.lightId ? (a.cover ? 'torch covered' : 'torch on') : (st.caseOn === id ? 'has the briefcase' : 'no briefcase!'), b.x + 12 * z, b.y + 32 * z, 12 * z, '#ffffff', 'left', 'body');
    }
  }

  const medal = t => K.medal(t <= S.goldT, t <= S.silverT);
  MODES.spyvents = {
    S, Z, plan, medal, build, bfs, passable, chAt, cellOf, inCone, grateRisk, zeroX, steamPhase, steamAt, readable, strobeSince, cx, cy, DIRS,
    medals: { bronze: 'Get the diamond down to the boathouse', goals: [{ key: 'time', gold: S.goldT, silver: S.silverT }, { key: 'heard', gold: 0, silver: 2, text: n => (n === 0 ? 'Never heard or caught' : 'Heard or caught ' + n + ' times at most'), gap: (v, n) => Math.ceil(v - n) + ' fewer times heard or caught' }, { key: 'reels', gold: S.reels, silver: 14, more: true, word: 'Microfilm reel' }] },
    medalValues() { const st = G.mst; return { heard: st.stats.heard + st.stats.caught, reels: st.reels }; },
    music() { const st = G.mst; if (!st || !st.snif) return null; const near = st.snif.some(s => s.on && st.ag.some(a => Math.hypot(a.x - s.x, a.y - s.y) < 250)); return { song: near ? 'spychase' : 'spysneakLow' }; },
    setup(st, L) {
      st.stats = { heard: 0, caught: 0, hacks: 0, wrong: 0, booms: 0, yows: 0, chutes: 0, helps: 0, roomT: [] };
      st.reels = 0; st.reelGot = []; st.inT = [G.time, G.time]; st.personT = G.time; st.clock = 0;
      room(st, L.def, 0); st.grates = grates(st);
    },
    room(k, L) { const st = G.mst; st.inT = [G.time, G.time]; st.personT = G.time; room(st, L.def, k); st.grates = grates(st); },
    step(dt) { tick(G.mst, dt); },
    draw() { const st = G.mst; if (!st.L) return; draw(st); K.hide(st); },
    drawTop() { const st = G.mst; K.unhide(st); if (st.L) K.drawPops(st, 0, 0); },
    hud() { const st = G.mst; if (st.L) hud(st); },
    stats() {
      const st = G.mst, s = st.stats;
      if (!s) return [];
      const out = [
        { label: 'Heard', value: String(s.heard) },
        { label: 'Caught', value: String(s.caught) },
        { label: 'Intel', value: st.reels + ' of ' + S.reels },
      ];
      out.push('Doors hacked: ' + s.hacks + '. Wrong presses: ' + s.wrong + '. Down into the boathouse with the diamond!');
      const hl = K.helpLine(s.helps); if (hl) out.push(hl);
      return out;
    },
  };

  /* ---------- the level ---------- */
  SPY.defs.spyvents = {
    name: 'Air Vent Crawl', world: 37, kind: 'team', mode: 'spyvents', outfit: 'spyvents', ownStep: true, ownHUD: true, noFalls: true, roomWord: 'Stretch',
    jobs: {
      light: { title: 'Light', act: 'cover', legend: '<kbd>A</kbd><kbd>D</kbd> crawl <kbd>W</kbd><kbd>S</kbd> climb',
        howTo: ['Your torch shows the way. Hold cover when a guard is under a grate.'] },
      hacker: { title: 'Hacker', act: 'hack', legend: '<kbd>A</kbd><kbd>D</kbd> crawl <kbd>W</kbd><kbd>S</kbd> climb',
        howTo: ['Press the action at a door, then the arrows in order.', 'You can only read them in the torch light.'] },
    },
    jobAlt: true, jobSwap: 'You swap jobs every stretch.',
    tip: 'Shine the torch on the panel so your partner can read it. Cover it over the grates.',
    howTo: [
      'Crawl gently on dented metal. Noise brings the guards, and the Sniffer.',
    ],
    act: { label: 'cover' },
    map: K.stubMap(),
    rooms: [
      { title: 'Above the Vault', done: 'Out of the vault ducts!', tip: 'Pip has the torch. Cover it while a guard is under a grate. Shine it on the door panel so Bo can read the arrows.' },
      { title: 'The Office Ducts', done: 'Through the offices!', tip: 'Bo has the torch now. Tap to creep on dented metal. Steam hisses before it bursts. Something is following you...' },
      { title: 'The Machine Floor', done: 'Past the machines!', tip: 'Some fans stop when the strobe flashes. At a squeeze, Pip goes first and catches the briefcase.' },
      { title: 'The Long Drop', done: 'Boathouse!', tip: 'Two Sniffers! Hack the three hatches on the way down. The last one opens over the boathouse.' },
    ],
  };

  /* ---------- sounds ---------- */
  Sfx.extra.spyventsCrawlScuff = function () { this.noise(0.06, { type: 'bandpass', f: 900, q: 2, vol: 0.008 }); };
  Sfx.extra.spyventsMetalCreak = function () { this.tone(320, 0.08, 'triangle', 0.008, 280); };
  Sfx.extra.spyventsMetalBoom = function () { this.tone(80, 0.6, 'sine', 0.07, 55); this.tone(160, 0.4, 'triangle', 0.03, 120); this.noise(0.3, { type: 'lowpass', f: 400, vol: 0.04 }); };
  Sfx.extra.spyventsTorchClick = function () { this.tone(2200, 0.02, 'square', 0.012); };
  Sfx.extra.spyventsTorchCover = function () { this.noise(0.05, { f: 1200, q: 1, vol: 0.01 }); };
  Sfx.extra.spyventsScreenOn = function () { this.tone(1800, 0.05, 'sine', 0.015); this.tone(2400, 0.06, 'sine', 0.012, null, 0.05); };
  Sfx.extra.spyventsScreenOff = function () { this.tone(1600, 0.06, 'sine', 0.012, 900); };
  Sfx.extra.spyventsKeyClick = function () { this.tone(2600, 0.025, 'square', 0.01); };
  Sfx.extra.spyventsWrongBuzz = function () { this.tone(140, 0.25, 'square', 0.03, 120); };
  Sfx.extra.spyventsAccessGranted = function () { [1046, 1318, 1568].forEach((f, i) => this.tone(f, 0.08, 'sine', 0.025, null, i * 0.06)); };
  Sfx.extra.spyventsDoorSlide = function () { this.noise(0.35, { type: 'bandpass', f: 600, q: 1.5, vol: 0.03, a: 0.05 }); this.tone(200, 0.3, 'sawtooth', 0.01, 140); };
  Sfx.extra.spyventsHatchClang = function () { this.tone(220, 0.5, 'triangle', 0.04, 200); this.tone(330, 0.4, 'triangle', 0.02, 300); this.noise(0.1, { type: 'highpass', f: 2000, vol: 0.02 }); };
  Sfx.extra.spyventsFanWhine = function () { this.tone(400, 0.6, 'sawtooth', 0.012, 120); };
  Sfx.extra.spyventsFanSpinUp = function () { this.tone(120, 0.5, 'sawtooth', 0.012, 380); };
  Sfx.extra.spyventsFanThwack = function () { this.noise(0.05, { type: 'bandpass', f: 1500, q: 3, vol: 0.03 }); };
  Sfx.extra.spyventsSteamYow = function () { this.noise(0.4, { type: 'highpass', f: 2500, vol: 0.04, a: 0.02 }); this.tone(700, 0.18, 'square', 0.025, 1100); };
  Sfx.extra.spyventsSteamHiss = function () { this.noise(0.5, { type: 'highpass', f: 4000, vol: 0.015, a: 0.2 }); };
  Sfx.extra.spyventsCobweb = function () { this.noise(0.15, { f: 3000, q: 1, vol: 0.008 }); };
  Sfx.extra.spyventsRatSqueak = function () { this.tone(2400, 0.06, 'sine', 0.025, 3000); this.tone(2600, 0.05, 'sine', 0.02, 3200, 0.1); };
  Sfx.extra.spyventsCaseSlide = function () { this.noise(0.6, { type: 'bandpass', f: 800, q: 2, vol: 0.03, a: 0.05 }); this.tone(300, 0.6, 'triangle', 0.012, 120); };
  Sfx.extra.spyventsCaseCatch = function () { this.tone(500, 0.06, 'sine', 0.03, 300); };
  Sfx.extra.spyventsLandSoft = function () { this.noise(0.08, { type: 'lowpass', f: 500, vol: 0.02 }); };
  Sfx.extra.spyventsSnifferTick = function () { this.tone(3000, 0.015, 'square', 0.005); };
  Sfx.extra.spyventsSnifferBeep = function () { this.tone(1400, 0.1, 'square', 0.025); this.tone(1100, 0.15, 'square', 0.02, null, 0.12); };
  Sfx.extra.spyventsSnifferCut = function () { this.noise(0.1, { type: 'highpass', f: 3500, vol: 0.02 }); this.tone(1800, 0.08, 'sawtooth', 0.008); };
  Sfx.extra.spyventsSnifferNet = function () { this.noise(0.3, { f: 1200, q: 0.8, vol: 0.04 }); [880, 1175, 1568].forEach((f, i) => this.tone(f, 0.1, 'square', 0.025, null, 0.25 + i * 0.08)); };
  Sfx.extra.spyventsBroomBang = function () { for (let i = 0; i < 3; i++) { this.tone(70, 0.25, 'sine', 0.07, 45, i * 0.22); this.noise(0.15, { type: 'lowpass', f: 300, vol: 0.05, delay: i * 0.22 }); } };
  Sfx.extra.spyventsTannoy = function () { this.noise(0.5, { type: 'bandpass', f: 1200, q: 4, vol: 0.02, a: 0.05 }); this.tone(240, 0.4, 'sawtooth', 0.012, 200); };
  Sfx.extra.spyventsCheckpoint = function () { this.tone(660, 0.12, 'triangle', 0.03); this.tone(990, 0.16, 'triangle', 0.03, null, 0.1); };
  Sfx.extra.spyventsBoatThump = function () { this.tone(90, 0.3, 'sine', 0.07, 60); this.noise(0.4, { type: 'lowpass', f: 800, vol: 0.04 }); };
})();
