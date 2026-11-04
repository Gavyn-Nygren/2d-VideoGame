/* Pip & Bo - Level 15-1 Tethered Spacewalk (World 15 Orbit Outpost). */
'use strict';

/* ===== 15-1 Tethered Spacewalk (mode 'spacewalk', World 15 "Orbit Outpost", team) =====
   Pip and Bo float outside a space station, tied together by a tether. Zero gravity: nobody walks or jumps. The mode
   owns the whole tick, the picture and the HUD (def.ownStep + def.ownHUD); the engine grid is empty apart from the spawns.
   GRAB (hold the action): next to a handhold (station rails, asteroid grips, satellite arms) you hold on while the button
   is held. A player holding on is the ANCHOR; the other is the FLOATER on the tether.
   The anchor swings the floater: ◀ ▶ spin it round (◀ one way, ▶ the other, with momentum), ▲ ▼ reel the tether in and
   out. The floater only has a tiny suit puff (◀ ▶ ▲ ▼, a small tank that refills), so nobody travels alone.
   Leapfrog: the floater holds grab as it passes the next handhold and holds on; then the old anchor lets go and becomes
   the floater, so the jobs swap all the time. A guide ring shows the next handhold (or panel) on the way.
   Broken solar panels: the floater holds grab near one and keeps still (no puffing) while the partner holds on; after a
   quarter second it bolts (about 0.85 s more), sparks, then a happy glow. A puff or letting go slips the bolt back. Every panel in the room fixed opens the airlock; both inside
   ends the room.
   Nothing hurts: rocks, satellite cores and the hull just bounce you ("Boing!", counted as bonks when fast). If both let
   go you drift; Bleep the tow robot tows you back to the last station rail after a few seconds (or right away: hold ▼).
   Rooms: Station Hull (static rails), Asteroid Belt (rocks drift and carry grips), Spinning Satellite (moving handholds
   and panels), Comet Run Home (all of it, the other way round).
   Gold help (announced): Gold grip after 2 tows or 45 s with no progress in a room (bigger grab and fix reach, quicker
   bolting), Super gold grip after 4 tows or another 45 s (bigger still, a longer tether).
   Room def: { title, tip, hull: [[x, y, w, h, 'module'|'truss']], holds: [[id, x, y, out]] (x, y = where the body
   floats while holding; out 'u' 'd' 'l' 'r' = which way the body sits from the grip), panels: [[id, x, y]],
   rocks: [{ x, y, r, ax, ay, per, ph, grips: ['l','r','u','d'], solid }], sats: [{ x, y, r, w, a0, arms: [[ang, len]],
   holds: [[id, ang, rad]], panels: [[id, ang, rad]] }], lock: [x, y, face], start: [pipHold, boHold], dock: [x, y] }.
   Every global is prefixed spacewalk / SPACEWALK (and Sfx.extra.spacewalk*); all state lives in G.mst. */
const SPACEWALK = {
  Lmax: 150, Lmin: 40, reelV: 130, Lhelp: 176,       // tether length (px), reel speed; Super gold grip lets it out further
  spinA: 440, vMax: 340, damp: 0.4, dampFree: 0.22,  // the anchor's spin push (px/s²), top speed, space "friction"
  puffA: 200, fuel: 1.3, fuelBack: 0.55, fuelHold: 2.2, // the floater's suit puff, its tank (s), refill per s (free / holding)
  grabR: 28, grabR1: 42, grabR2: 54,                  // grab reach: normal, Gold grip, Super gold grip
  fixR: 34, fixR1: 46, fixR2: 54, fixNeed: 0.85, fixNeed1: 0.5, fixDecay: 1.5,
  steady: 0.5, still: 0.25,                          // a bolt needs the anchor holding on, and the floater still, this long
  bodyR: 12, out: 13, grace: 0.12, regrab: 0.35, bonkV: 70, bounce: 0.55,
  towWait: 3.2, towCall: 1.0, parkV: 14,
  lockR: 56, lockHold: 0.35, finT: 1.7,
  help1Tows: 2, help2Tows: 4, stuck: 45,
  hintLife: 2.8,
};
const SPACEWALK_DIRS = { u: [0, -1], d: [0, 1], l: [-1, 0], r: [1, 0] };
const spacewalkWrap = a => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };

// each player's own keys, for prompts and the HUD (a player with a controller is shown its buttons)
function spacewalkKey(id, what) {
  const how = actKey(id), touch = how === 'touch', pad = how === 'pad';
  if (what === 'act') return pad ? glyph('act') : touch ? '●' : id === 0 ? 'F' : '/';
  if (what === 'lr') return pad ? '◀ ▶' : touch ? '◀ ▶' : id === 0 ? 'A D' : '← →';
  if (what === 'left') return pad || touch ? '◀' : id === 0 ? 'A' : '←';
  if (what === 'right') return pad || touch ? '▶' : id === 0 ? 'D' : '→';
  if (what === 'up') return pad ? '▲' : touch ? '▲' : id === 0 ? 'W' : '↑';
  if (what === 'down') return pad ? '▼' : touch ? '▼' : id === 0 ? 'S' : '↓';
  if (what === 'ud') return pad || touch ? '▲ ▼' : id === 0 ? 'W S' : '↑ ↓';
  return pad ? 'stick' : touch ? '◀ ▶ ▲ ▼' : id === 0 ? 'W A S D' : '← → ↑ ↓';
}
// 1-player mode: the computer's own side gets no key hints or prompts (it knows what to do)
const spacewalkQuiet = id => typeof cpuSolo === 'function' && cpuSolo() && cpuOn(id);
const spacewalkGrabR = st => [SPACEWALK.grabR, SPACEWALK.grabR1, SPACEWALK.grabR2][st.help || 0];
const spacewalkFixR = st => [SPACEWALK.fixR, SPACEWALK.fixR1, SPACEWALK.fixR2][st.help || 0];
const spacewalkFixNeed = st => (st.help ? SPACEWALK.fixNeed1 : SPACEWALK.fixNeed);
const spacewalkLmax = st => (st.help >= 2 ? SPACEWALK.Lhelp : SPACEWALK.Lmax);

/* ---------- a room: build the station parts from the def ---------- */
function spacewalkRoom(st, L, k) {
  const S = SPACEWALK, def = L.def;
  st.k = k; st.title = def.title || '';
  st.hull = (def.hull || []).map(([x, y, w, h, kind]) => ({ x, y, w, h, kind: kind || 'module' }));
  st.holds = []; st.hid = {};
  const addHold = h => { h.i = st.holds.length; st.holds.push(h); st.hid[h.id] = h; return h; };
  for (const [id, x, y, out] of def.holds || []) {
    const [ox, oy] = SPACEWALK_DIRS[out] || SPACEWALK_DIRS.u;
    addHold({ id, kind: 'rail', x, y, vx: 0, vy: 0, ox, oy, gx: x - ox * S.out, gy: y - oy * S.out, static: true });
  }
  st.rocks = (def.rocks || []).map((r, n) => {
    const rock = { ...r, n, cx: r.x, cy: r.y, vx: 0, vy: 0, ax: r.ax || 0, ay: r.ay || 0, per: r.per || 12, ph: r.ph || 0, solid: r.solid !== false, seed: 7 + n * 13, holds: [] };
    for (const g of r.grips || []) {
      const [ox, oy] = SPACEWALK_DIRS[g];
      rock.holds.push(addHold({ id: 'r' + n + g, kind: 'rock', body: rock, ox, oy, x: 0, y: 0, vx: 0, vy: 0, gx: 0, gy: 0 }));
    }
    return rock;
  });
  st.panels = [];
  for (const [id, x, y] of def.panels || []) st.panels.push({ id, x, y, ang: 0, prog: 0, fixed: false, fixT: 0, work: 0, who: -1, static: true });
  st.sats = (def.sats || []).map((s, n) => {
    const sat = { ...s, n, ang: s.a0 || 0, holds: [], pans: [] };
    for (const [id, a, rad] of s.holds || []) sat.holds.push(addHold({ id, kind: 'sat', body: sat, a, rad, x: 0, y: 0, vx: 0, vy: 0, ox: 0, oy: 0, gx: 0, gy: 0 }));
    for (const [id, a, rad] of s.panels || []) { const p = { id, a, rad, x: 0, y: 0, ang: 0, prog: 0, fixed: false, fixT: 0, work: 0, who: -1, body: sat }; sat.pans.push(p); st.panels.push(p); }
    return sat;
  });
  const [lx, ly, face] = def.lock || [896, 300, -1];
  st.lock = { x: lx, y: ly, face, open: false, openT: 0, inT: 0 };
  addHold({ id: 'lk', kind: 'rail', lock: true, x: lx + face * (S.out + 8), y: ly, vx: 0, vy: 0, ox: face, oy: 0, gx: lx + face * 8, gy: ly, static: true });
  // masts: a static handhold or panel stands on a strut from the nearest hull below/behind it, or floats on a buoy
  for (const h of st.holds) if (h.static && !h.lock) h.mast = spacewalkMast(st, h.gx, h.gy, -h.ox, -h.oy);
  for (const p of st.panels) if (p.static) p.mast = spacewalkMast(st, p.x, p.y + 15, 0, 1);
  // a strut that runs down past another strut's top joins it there (no double struts)
  const masts = st.holds.concat(st.panels).map(o => o.mast).filter(m => m && m.x0 === m.x1 && m.y1 > m.y0);
  for (const m of masts) {
    let j = null;
    for (const o of masts) if (o !== m && Math.abs(o.x0 - m.x0) < 18 && o.y0 > m.y0 + 10 && o.y0 < m.y1 && (!j || o.y0 < j.y0)) j = o;
    if (j) { m.x1 = j.x0; m.y1 = j.y0; }
  }
  st.dock = def.dock ? { x: def.dock[0], y: def.dock[1] } : { x: 32, y: 120 };
  st.bt = 0;
  spacewalkBodies(st, 0);
  // both start beside their start rails, still (parked)
  const start = def.start || ['s0', 's1'];
  st.pl = [0, 1].map(id => {
    const h = st.hid[start[id]] || st.holds[id];
    return { id, x: h.x + h.ox * 6, y: h.y + h.oy * 6, vx: 0, vy: 0, hold: null, since: 0, grace: 0, fuel: S.fuel, rot: id ? 0.25 : -0.25, vr: 0, puff: 0, puffX: 0, puffY: 0,
      bonkCD: 0, regrab: null, want: false, spin: 0, reel: 0, callT: 0 };
  });
  st.L = S.Lmax; st.lastRail = st.hid[start[0]] || st.holds[0];
  st.freeT = 0; st.tow = null; st.fin = null; st.help = 0; st.roomTows = 0; st.progT = 0; st.seen = {};
  st.parts = []; st.pops = []; st.hints = [null, null]; st.hinted = {}; st.msg = null; st.roomT = 0; st.planN = -1; st.plan = null;
  st.inT = [-99, -99]; st.noPathT = 0; st.spinSnd = 0; st.boltSnd = 0;
  st.stats.roomT[k] = null; st.stats.roomTitles[k] = st.title;
  spacewalkMirror(st);
}
// a strut from (x, y) along (dx, dy) to the first hull part it meets (within 330 px), or null (a floating buoy)
function spacewalkMast(st, x, y, dx, dy) {
  let best = null;
  for (const r of st.hull) {
    let t = null;
    if (dy > 0 && x >= r.x && x <= r.x + r.w && r.y >= y) t = r.y - y;
    else if (dy < 0 && x >= r.x && x <= r.x + r.w && r.y + r.h <= y) t = y - (r.y + r.h);
    else if (dx > 0 && y >= r.y && y <= r.y + r.h && r.x >= x) t = r.x - x;
    else if (dx < 0 && y >= r.y && y <= r.y + r.h && r.x + r.w <= x) t = x - (r.x + r.w);
    if (t != null && t >= 0 && (best === null || t < best)) best = t;
  }
  return best !== null && best <= 330 ? { x0: x, y0: y, x1: x + dx * best, y1: y + dy * best } : null;
}
// moving parts at body time t: rocks drift to and fro, satellites turn; their handholds and panels go with them
function spacewalkBodies(st, t) {
  const S = SPACEWALK;
  for (const r of st.rocks) {
    const w = (Math.PI * 2) / r.per, s = Math.sin(w * t + r.ph), c = Math.cos(w * t + r.ph);
    r.cx = r.x + r.ax * s; r.cy = r.y + r.ay * s; r.vx = r.ax * w * c; r.vy = r.ay * w * c;
    for (const h of r.holds) {
      h.gx = r.cx + h.ox * r.r; h.gy = r.cy + h.oy * r.r;
      h.x = h.gx + h.ox * S.out; h.y = h.gy + h.oy * S.out; h.vx = r.vx; h.vy = r.vy;
    }
  }
  for (const s of st.sats) {
    s.ang = (s.a0 || 0) + s.w * t;
    for (const h of s.holds) {
      const a = s.ang + h.a, ca = Math.cos(a), sa = Math.sin(a), R = h.rad;
      h.ox = ca; h.oy = sa; h.gx = s.x + ca * (R - S.out); h.gy = s.y + sa * (R - S.out);
      h.x = s.x + ca * R; h.y = s.y + sa * R; h.vx = -sa * R * s.w; h.vy = ca * R * s.w;
    }
    for (const p of s.pans) { const a = s.ang + p.a; p.x = s.x + Math.cos(a) * p.rad; p.y = s.y + Math.sin(a) * p.rad; p.ang = a; }
  }
}

/* ---------- the plan: the next handhold (or panel) on the way, as the guide ring shows it ----------
   A breadth-first search over the handholds (two are linked when the tether reaches between them) from the ones next
   to an unfixed panel (or the airlock handle when every panel is done). The computer partner reads the same plan. */
function spacewalkPlan(st) {
  if (st.planN === G.tickN && st.plan) return st.plan;
  const S = SPACEWALK, hs = st.holds, n = hs.length, Lm = spacewalkLmax(st), reach = Lm - 8, fixReach = Lm - 10;
  const open = st.panels.filter(p => !p.fixed);
  const goalOf = new Array(n).fill(null);
  const near = (a, b, r) => Math.hypot(a.x - b.x, a.y - b.y) <= r;
  if (open.length) {
    for (const h of hs) {
      let best = null, bd = Infinity;
      for (const p of open) { const d = Math.hypot(p.x - h.x, p.y - h.y); if (d <= fixReach && d > 34 && d < bd) { bd = d; best = p; } }
      goalOf[h.i] = best;
    }
  } else goalOf[st.hid.lk.i] = 'lock';
  const bfs = r => {
    const dist = new Array(n).fill(Infinity), q = [];
    for (let i = 0; i < n; i++) if (goalOf[i]) { dist[i] = 0; q.push(i); }
    for (let qi = 0; qi < q.length; qi++) {
      const a = q[qi];
      for (let b = 0; b < n; b++) if (dist[b] === Infinity && near(hs[a], hs[b], r)) { dist[b] = dist[a] + 1; q.push(b); }
    }
    return dist;
  };
  const dist = bfs(reach), slack = bfs(reach + 70);   // (slack: with a moving part that may come closer soon)
  const held = st.pl.map(q => (q.hold != null ? hs[q.hold] : null));
  const plan = { dist, slack, goalOf, target: null, anchor: -1, floater: -1, releaser: -1, wait: false, noPath: false };
  const score = h => (h ? dist[h.i] * 10 + Math.min(9.9, slack[h.i]) : Infinity);
  if (held[0] && held[1]) {
    // both holding: the one further along stays, the other lets go (a tie: the one that has held longer lets go)
    const s0 = score(held[0]), s1 = score(held[1]);
    plan.releaser = s0 === s1 ? (st.pl[0].since <= st.pl[1].since ? 0 : 1) : s0 > s1 ? 0 : 1;
    if (!open.length && held[1 - plan.releaser].id !== 'lk' && (held[0].id === 'lk' || held[1].id === 'lk')) plan.releaser = held[0].id === 'lk' ? 1 : 0;
    plan.anchor = 1 - plan.releaser; plan.floater = plan.releaser;
  } else if (held[0] || held[1]) {
    const a = held[0] ? 0 : 1, h = held[a], f = st.pl[1 - a];
    plan.anchor = a; plan.floater = 1 - a;
    if (goalOf[h.i]) {
      const g = goalOf[h.i];
      plan.target = g === 'lock' ? { kind: 'lock', x: st.lock.x + st.lock.face * 14, y: st.lock.y - 34 } : { kind: 'panel', x: g.x, y: g.y, panel: g };
    } else {
      // the next handhold one hop nearer the goal (the nearest to the floater of those); else a moving one to wait for
      let best = null, bd = Infinity;
      for (const d of [dist, slack]) {
        if (best) break;
        const r = d === dist ? reach : reach + 70;
        if (d[h.i] === Infinity) continue;
        for (const o of hs) {
          if (o === h || o === held[1 - a] || d[o.i] !== d[h.i] - 1 || !near(o, h, r)) continue;
          const dd = Math.hypot(o.x - f.x, o.y - f.y);
          if (dd < bd) { bd = dd; best = o; }
        }
        if (best && d === slack) plan.wait = !near(best, h, reach);
      }
      if (best) plan.target = { kind: 'hold', x: best.x, y: best.y, hold: best };
      else plan.noPath = true;
    }
  } else {
    // both drifting: the best handhold within reach of either of you
    const R = spacewalkGrabR(st) * 1.6;
    let best = null, bs = Infinity;
    for (const h of hs) {
      if (!st.pl.some(q => Math.hypot(h.x - q.x, h.y - q.y) <= R)) continue;
      const s = score(h);
      if (s < bs) { bs = s; best = h; }
    }
    if (best) plan.target = { kind: 'hold', x: best.x, y: best.y, hold: best };
  }
  st.plan = plan; st.planN = G.tickN;
  return plan;
}

/* ---------- the tick (def.ownStep: this is all of it) ---------- */
function spacewalkStep(st, dt) {
  if (!st.pl) return;
  const S = SPACEWALK, ps = G.players;
  for (const k of [0, 1]) {
    const i = ps[k].input;
    if (i.left || i.right || i.jump || i.down || i.act || i.up) st.inT[k] = G.time;
    ps[k].pendingJump = false;
  }
  if (G.introT > 0) { for (const p of ps) p.pendingAct = false; spacewalkFx(st, dt); spacewalkMirror(st); return; }
  st.roomT += dt; st.progT += dt;
  st.bt += dt;
  spacewalkBodies(st, st.bt);
  if (st.fin) { spacewalkFinStep(st, dt); spacewalkFx(st, dt); spacewalkMirror(st); return; }
  if (st.tow) spacewalkTowStep(st, dt);
  else spacewalkFloat(st, dt);
  spacewalkFx(st, dt);
  spacewalkMirror(st);
}
function spacewalkFloat(st, dt) {
  const S = SPACEWALK, ps = G.players, pl = st.pl, Lm = spacewalkLmax(st), gR = spacewalkGrabR(st), fR = spacewalkFixR(st);
  // what each player is pressing (a grab let go for under `grace` s still counts: a flicker doesn't drop you)
  const inp = ps.map(p => p.input);
  for (const q of pl) {
    const i = inp[q.id];
    if (i.act) q.grace = S.grace; else q.grace = Math.max(0, q.grace - dt);
    q.want = i.act || q.grace > 0;
    q.ix = (i.right ? 1 : 0) - (i.left ? 1 : 0); q.iy = (i.down ? 1 : 0) - (i.jump || i.up ? 1 : 0);
    q.stillT = q.want && !q.ix && !q.iy ? (q.stillT || 0) + dt : 0;
    q.bonkCD = Math.max(0, q.bonkCD - dt);
    if (q.regrab && (q.regrab.t -= dt) <= 0) q.regrab = null;
  }
  // holding on follows the handhold (rocks and satellites move)
  for (const q of pl) if (q.hold != null) { const h = st.holds[q.hold]; q.x = h.x; q.y = h.y; q.vx = h.vx; q.vy = h.vy; }
  // let go
  for (const q of pl) {
    if (q.hold == null || q.want) continue;
    const h = st.holds[q.hold];
    q.hold = null; q.regrab = { h: h.i, t: S.regrab };
    q.vx = h.vx; q.vy = h.vy; q.vr = (Math.random() - 0.5) * 1.2;
    const o = pl[1 - q.id];
    if (o.hold != null) st.L = Math.max(Math.hypot(q.x - o.x, q.y - o.y), Lm); // a new floater: the tether lets itself out
    Sfx.play('spacewalkLetGo', q.id);
    spacewalkPart(st, q.x, q.y, 0, 0, 0.3, 'rgba(255,255,255,0.7)', 5, 'ring');
  }
  // grab: hold the action next to a free handhold (not while bolting a panel)
  for (const q of pl) {
    if (q.hold != null || !q.want) continue;
    const o = pl[1 - q.id];
    if (o.hold != null && st.panels.some(p => !p.fixed && Math.hypot(p.x - q.x, p.y - q.y) < fR)) continue;
    let best = null, bd = gR;
    for (const h of st.holds) {
      if (pl.some(z => z.hold === h.i) || (q.regrab && q.regrab.h === h.i)) continue;
      const d = Math.hypot(h.x - q.x, h.y - q.y);
      if (d < bd) { bd = d; best = h; }
    }
    if (!best) continue;
    q.hold = best.i; q.since = G.time; q.x = best.x; q.y = best.y; q.vx = best.vx; q.vy = best.vy; q.vr *= 0.2;
    st.stats.grabs[q.id]++;
    if (best.static) st.lastRail = best;
    if (!st.seen[best.id]) { st.seen[best.id] = true; st.progT = 0; }
    if (o.hold != null) st.L = Math.max(st.L, Math.hypot(q.x - o.x, q.y - o.y));
    Sfx.play('spacewalkGrab', q.id);
    spacewalkSparks(st, best.gx, best.gy, PCOL[q.id], 6);
    rumble(q.id, 0.1, 0.3, 60);
  }
  const anc = pl.filter(q => q.hold != null);
  // the controls: the anchor spins and reels, the floater puffs
  for (const q of pl) { q.spin = 0; q.reel = 0; q.puff = Math.max(0, q.puff - dt * 4); }
  if (anc.length === 1) {
    const a = anc[0], f = pl[1 - a.id];
    const dx = f.x - a.x, dy = f.y - a.y, d = Math.hypot(dx, dy);
    if (a.ix && d > 20) {
      const tx = -dy / d, ty = dx / d, k = clamp((d / st.L - 0.25) / 0.5, 0.35, 1) * (st.help ? 1.15 : 1);
      f.vx += tx * a.ix * S.spinA * k * dt; f.vy += ty * a.ix * S.spinA * k * dt;
      a.spin = a.ix;
      st.stats.spinT[a.id] += dt;
    }
    if (a.iy) {
      st.L = clamp(st.L + a.iy * S.reelV * dt, S.Lmin, Lm);
      if (a.iy < 0) st.L = Math.max(st.L, Math.min(d, S.Lmin)); // (it can't reel shorter than the floater is close)
      a.reel = a.iy;
    }
    // the floater's tiny suit puff
    if ((f.ix || f.iy) && f.fuel > 0) {
      const m = Math.hypot(f.ix, f.iy);
      f.vx += (f.ix / m) * S.puffA * dt; f.vy += (f.iy / m) * S.puffA * dt;
      f.fuel = Math.max(0, f.fuel - dt); f.puff = 1; f.puffX = f.ix / m; f.puffY = f.iy / m;
      if (Math.random() < dt * 30) spacewalkPart(st, f.x - f.puffX * 14, f.y - f.puffY * 14, -f.puffX * 90 + (Math.random() - 0.5) * 30, -f.puffY * 90 + (Math.random() - 0.5) * 30, 0.35, 'rgba(235,240,255,0.85)', 3 + Math.random() * 2, 'smoke');
      if (Math.random() < dt * 6) Sfx.play('spacewalkPuff', f.id);
    } else f.fuel = Math.min(S.fuel, f.fuel + S.fuelBack * dt);
    a.fuel = Math.min(S.fuel, a.fuel + S.fuelHold * dt);
  } else if (anc.length === 2) {
    for (const q of pl) q.fuel = Math.min(S.fuel, q.fuel + S.fuelHold * dt);
    st.L = Math.max(st.L, Math.hypot(pl[0].x - pl[1].x, pl[0].y - pl[1].y));
  } else {
    for (const q of pl) q.fuel = Math.min(S.fuel, q.fuel + S.fuelBack * dt);
  }
  // move whoever is floating
  for (const q of pl) {
    if (q.hold != null) continue;
    const damp = Math.exp(-(anc.length ? S.damp : S.dampFree) * dt);
    q.vx *= damp; q.vy *= damp;
    const sp = Math.hypot(q.vx, q.vy);
    if (sp > S.vMax) { q.vx *= S.vMax / sp; q.vy *= S.vMax / sp; }
    q.x += q.vx * dt; q.y += q.vy * dt;
    q.rot += q.vr * dt; q.vr *= Math.exp(-0.6 * dt);
    // swung on a tight tether: head to the anchor, feet out (like a hammer throw)
    const o = pl[1 - q.id];
    if (o.hold != null) {
      const dx = q.x - o.x, dy = q.y - o.y, d = Math.hypot(dx, dy);
      if (d > st.L * 0.9 && sp > 70) { const r = Math.atan2(-dx / d, dy / d), rr2 = r + Math.round((q.rot - r) / (Math.PI * 2)) * Math.PI * 2; q.rot += (rr2 - q.rot) * Math.min(1, dt * 4); q.vr *= 1 - dt * 3; }
    }
  }
  spacewalkTether(st);
  for (const q of pl) if (q.hold == null) spacewalkCollide(st, q);
  spacewalkTether(st);
  // panels: the floater holds grab near one while the partner holds on
  const need = spacewalkFixNeed(st);
  for (const p of st.panels) {
    if (p.fixed) { p.fixT += dt; continue; }
    // a steady job: the floater holds grab and keeps still (a puff slips the bolt), the anchor has held on a moment
    let on = null, wait = false;
    for (const q of pl) {
      const a = pl[1 - q.id];
      if (q.hold != null || !q.want || a.hold == null || Math.hypot(p.x - q.x, p.y - q.y) >= fR) continue;
      if (q.ix || q.iy) continue;
      q.vx *= Math.exp(-2.5 * dt); q.vy *= Math.exp(-2.5 * dt);   // (a hand on the panel slows you down a little)
      if (G.time - a.since < S.steady || q.stillT < S.still) wait = true; else on = q;
    }
    p.work = Math.max(0, p.work - dt * 3);
    if (on) {
      p.prog += dt; p.who = on.id; p.work = 1;
      if ((st.boltSnd -= dt) <= 0) { st.boltSnd = 0.13; Sfx.play('spacewalkBolt', on.id); spacewalkSparks(st, p.x + (Math.random() - 0.5) * 30, p.y + (Math.random() - 0.5) * 16, '#ffe27a', 3); }
      if (p.prog >= need) spacewalkFixed(st, p, on);
    } else if (!wait) p.prog = Math.max(0, p.prog - S.fixDecay * dt);
  }
  // the airlock
  const lk = st.lock;
  if (!lk.open && st.panels.every(p => p.fixed)) {
    lk.open = true; Sfx.play('spacewalkOpen');
    spacewalkMsg(st, 'Every panel fixed! The airlock is open: both get inside!', '#8fe3b0', 3.5);
    spacewalkPop(st, lk.x + lk.face * 70, lk.y - 50, 'Airlock open!', '#8fe3b0', 24);
  }
  if (lk.open) {
    lk.openT += dt;
    const inside = pl.every(q => Math.hypot(q.x - lk.x, q.y - lk.y) < S.lockR);
    lk.inT = inside ? lk.inT + dt : 0;
    if (lk.inT >= S.lockHold) spacewalkStartFin(st);
  }
  // drifting: Bleep tows you back to the last rail (hold ▼ to call him right away)
  if (!anc.length) {
    const parked = pl.every(q => Math.hypot(q.vx, q.vy) < S.parkV) && st.holds.some(h => pl.some(q => Math.hypot(h.x - q.x, h.y - q.y) <= gR + 6));
    st.freeT = parked ? 0 : st.freeT + dt;
    for (const q of pl) q.callT = inp[q.id].down ? q.callT + dt : 0;
    if (st.freeT > S.towWait || pl.some(q => q.callT >= S.towCall && !parked)) spacewalkStartTow(st);
  } else { st.freeT = 0; for (const q of pl) q.callT = 0; }
  // no way on from here (a moving handhold drifted off): after a while, say to let go
  const plan = spacewalkPlan(st);
  st.noPathT = anc.length === 1 && plan.noPath ? st.noPathT + dt : 0;
  // gold help
  if (st.help < 2 && (st.progT > S.stuck || st.roomTows >= (st.help ? S.help2Tows : S.help1Tows))) spacewalkHelp(st);
  // sounds and little things
  const a1 = anc.length === 1 ? anc[0] : null;
  if (a1 && a1.spin) {
    const f = pl[1 - a1.id], sp = Math.hypot(f.vx, f.vy);
    if ((st.spinSnd -= dt) <= 0 && sp > 120) { st.spinSnd = clamp(2.2 - sp / 200, 0.45, 1); Sfx.play('spacewalkSwish', a1.id); }
  }
  if (a1 && a1.reel && (st.reelSnd = (st.reelSnd || 0) - dt) <= 0) { st.reelSnd = 0.12; Sfx.play('spacewalkReel'); }
  spacewalkNudges(st, plan);
}
// the tether: a rope (never longer than st.L), so a floater circles its anchor, and two drifters pull on each other
function spacewalkTether(st) {
  const pl = st.pl, a = pl[0], b = pl[1], L = st.L;
  const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
  if (d <= L || d < 0.001) return;
  const nx = dx / d, ny = dy / d;
  if (a.hold != null && b.hold != null) { st.L = d; return; }
  if (a.hold != null || b.hold != null) {
    const A = a.hold != null ? a : b, F = A === a ? b : a, s = A === a ? 1 : -1;
    F.x = A.x + nx * s * L; F.y = A.y + ny * s * L;
    const vr = ((F.vx - A.vx) * nx + (F.vy - A.vy) * ny) * s;
    if (vr > 0) { F.vx -= nx * s * vr * 1.04; F.vy -= ny * s * vr * 1.04; }
    return;
  }
  const c = (d - L) / 2;
  a.x += nx * c; a.y += ny * c; b.x -= nx * c; b.y -= ny * c;
  const vr = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
  if (vr > 0) { const j = vr / 2; b.vx -= nx * j; b.vy -= ny * j; a.vx += nx * j; a.vy += ny * j; }
}
// soft bumps off rocks, satellite cores, the hull and the edge of the screen (fast ones are "Boing!" bonks)
function spacewalkCollide(st, q) {
  const S = SPACEWALK, R = S.bodyR;
  const hit = (nx, ny, bvx, bvy, pen, kind) => {
    q.x += nx * pen; q.y += ny * pen;
    const vn = (q.vx - bvx) * nx + (q.vy - bvy) * ny;
    if (vn >= 0) return;
    q.vx -= nx * vn * (1 + S.bounce); q.vy -= ny * vn * (1 + S.bounce);
    q.vr += (Math.random() - 0.5) * 3;
    if (kind === 'edge') { if (-vn > 60) Sfx.play('spacewalkBoop'); return; }
    if (-vn > S.bonkV && q.bonkCD <= 0) {
      q.bonkCD = 0.7; st.stats.bonks++;
      spacewalkPop(st, q.x, q.y - 26, ['Boing!', 'Bonk!', 'Boing!', 'Oof, boing!'][st.stats.bonks % 4], '#ffd2f0', 22);
      Sfx.play('spacewalkBoing', q.id); rumble(q.id, 0.2, 0.4, 90);
      spacewalkSparks(st, q.x - nx * R, q.y - ny * R, '#ffffff', 5);
    } else if (-vn > 25) Sfx.play('spacewalkBump', q.id);
  };
  for (const r of st.rocks) {
    if (!r.solid) continue;
    const dx = q.x - r.cx, dy = q.y - r.cy, d = Math.hypot(dx, dy), m = r.r + R;
    if (d < m && d > 0.01) hit(dx / d, dy / d, r.vx, r.vy, m - d, 'rock');
  }
  for (const s of st.sats) {
    const dx = q.x - s.x, dy = q.y - s.y, d = Math.hypot(dx, dy), m = s.r + R;
    if (d < m && d > 0.01) hit(dx / d, dy / d, 0, 0, m - d, 'sat');
  }
  for (const h of st.hull) {
    const cx = clamp(q.x, h.x, h.x + h.w), cy = clamp(q.y, h.y, h.y + h.h), dx = q.x - cx, dy = q.y - cy, d = Math.hypot(dx, dy);
    if (d < R) {
      if (d > 0.01) hit(dx / d, dy / d, 0, 0, R - d, 'hull');
      else hit(0, -1, 0, 0, R, 'hull');
    }
  }
  if (q.x < 14) hit(1, 0, 0, 0, 14 - q.x, 'edge'); else if (q.x > W - 14) hit(-1, 0, 0, 0, q.x - (W - 14), 'edge');
  if (q.y < 14) hit(0, 1, 0, 0, 14 - q.y, 'edge'); else if (q.y > H - 14) hit(0, -1, 0, 0, q.y - (H - 14), 'edge');
}
function spacewalkFixed(st, p, q) {
  p.fixed = true; p.fixT = 0; p.prog = spacewalkFixNeed(st);
  st.stats.fixes[q.id]++; st.progT = 0;
  Sfx.play('spacewalkFixed', q.id); rumble(0, 0.2, 0.4, 120); rumble(1, 0.2, 0.4, 120);
  const left = st.panels.filter(z => !z.fixed).length;
  spacewalkPop(st, p.x, p.y - 30, left ? 'Fixed!' : 'All fixed!', '#9fe6ff', 26);
  spacewalkSparks(st, p.x, p.y, '#9fe6ff', 16);
  spacewalkSparks(st, p.x, p.y, '#ffe27a', 10);
}

/* ---------- Bleep the tow robot ---------- */
function spacewalkStartTow(st) {
  const S = SPACEWALK, pl = st.pl, h = st.lastRail;
  st.tow = { t: 0, phase: 'come', bx: st.dock.x, by: st.dock.y, h, from: pl.map(q => ({ x: q.x, y: q.y })) };
  st.freeT = 0; st.stats.tows++; st.roomTows++;
  for (const q of pl) { q.hold = null; q.callT = 0; }
  spacewalkMsg(st, 'Whoopsie! Bleep is coming to tow you back.', '#bfe3ff', 2.6);
  Sfx.play('spacewalkBeep');
}
function spacewalkTowStep(st, dt) {
  const tw = st.tow, pl = st.pl, h = tw.h;
  tw.t += dt;
  const mid = { x: (pl[0].x + pl[1].x) / 2, y: (pl[0].y + pl[1].y) / 2 };
  if (tw.phase === 'come') {
    // drifting on slowly while Bleep flies over
    for (const q of pl) { q.vx *= Math.exp(-1.5 * dt); q.vy *= Math.exp(-1.5 * dt); q.x += q.vx * dt; q.y += q.vy * dt; spacewalkCollide(st, q); }
    spacewalkTether(st);
    const u = clamp(tw.t / 0.9, 0, 1), e = u * u * (3 - 2 * u);
    tw.x = tw.bx + (mid.x - tw.bx) * e; tw.y = tw.by + (mid.y - 30 - tw.by) * e - Math.sin(u * Math.PI) * 30;
    if (u >= 1) {
      tw.phase = 'tow'; tw.t = 0; tw.from = pl.map(q => ({ x: q.x, y: q.y }));
      const d = Math.hypot(mid.x - h.x, mid.y - h.y);
      tw.dur = clamp(d / 230, 0.7, 2.2);
      // where each of you ends up: beside that rail, still, close enough to grab it
      const px = -h.oy, py = h.ox;
      tw.to = [0, 1].map(k => ({ x: h.x + h.ox * 7 + px * (k ? 9 : -9), y: h.y + h.oy * 7 + py * (k ? 9 : -9) }));
      // whoever is nearer the rail goes next to it first
      const d0 = Math.hypot(pl[0].x - h.x, pl[0].y - h.y), d1 = Math.hypot(pl[1].x - h.x, pl[1].y - h.y);
      if (d1 < d0) tw.to.reverse();
      Sfx.play('spacewalkTow');
    }
  } else if (tw.phase === 'tow') {
    const u = clamp(tw.t / tw.dur, 0, 1), e = u * u * (3 - 2 * u);
    for (const q of pl) {
      const a = tw.from[q.id], b = tw.to[q.id];
      const nx = a.x + (b.x - a.x) * e, ny = a.y + (b.y - a.y) * e - Math.sin(u * Math.PI) * 20;
      q.vx = (nx - q.x) / dt; q.vy = (ny - q.y) / dt; q.x = nx; q.y = ny; q.rot *= 1 - dt * 2;
    }
    const m2 = { x: (pl[0].x + pl[1].x) / 2, y: (pl[0].y + pl[1].y) / 2 };
    tw.x = m2.x; tw.y = m2.y - 30;
    if (u >= 1) { tw.phase = 'go'; tw.t = 0; for (const q of pl) { q.vx = 0; q.vy = 0; } st.L = SPACEWALK.Lmax; Sfx.play('spacewalkBeep'); }
  } else {
    const u = clamp(tw.t / 0.8, 0, 1);
    tw.x += (tw.bx - tw.x) * Math.min(1, dt * 4); tw.y += (tw.by - tw.y) * Math.min(1, dt * 4) - 40 * dt;
    if (u >= 1) st.tow = null;
  }
}

/* ---------- gold help ---------- */
function spacewalkHelp(st) {
  st.help = (st.help || 0) + 1; st.progT = 0; st.stats.helps++;
  if (st.help === 1) spacewalkMsg(st, 'Gold grip! Bigger grabs and quicker bolting.', C.gold, 4);
  else { spacewalkMsg(st, 'Super gold grip! Even bigger grabs and a longer tether.', C.gold, 4); st.L = Math.max(st.L, spacewalkLmax(st)); }
  Sfx.play('spacewalkGold');
  for (const q of st.pl) spacewalkSparks(st, q.x, q.y, C.gold, 10);
}

/* ---------- the room end: both float into the open airlock ---------- */
function spacewalkStartFin(st) {
  st.fin = { t: 0, from: st.pl.map(q => ({ x: q.x, y: q.y })) };
  st.stats.roomT[st.k] = st.roomT;
  for (const q of st.pl) { q.hold = null; q.vx = 0; q.vy = 0; }
  Sfx.play('spacewalkHiss');
  spacewalkPop(st, st.lock.x + st.lock.face * 90, st.lock.y - 60, G.room + 1 < (G.level.def.roomCount || 1) ? 'Next stop!' : 'Home sweet home!', '#ffffff', 26);
}
function spacewalkFinStep(st, dt) {
  const fin = st.fin, lk = st.lock;
  fin.t += dt;
  const u = clamp(fin.t / 0.9, 0, 1), e = u * u * (3 - 2 * u);
  st.pl.forEach((q, k) => {
    const a = fin.from[k];
    q.x = a.x + (lk.x - a.x) * e + (k ? 4 : -4) * (1 - e); q.y = a.y + (lk.y - a.y) * e; q.rot *= 1 - dt * 3;
  });
  if (fin.t >= SPACEWALK.finT && !fin.done) {
    fin.done = true;
    if (G.room + 1 < (G.level.def.roomCount || 1)) nextRoom();
    else {
      G.level.goal = { x: lk.x + lk.face * 40, y: lk.y - 40 };
      for (let i = 0; i < 40; i++) confetti(lk.x + lk.face * 40, lk.y - 20);
      levelClear();
    }
  }
}

/* ---------- prompts ---------- */
function spacewalkHint(st, id, text, life) { if (id < 0 || spacewalkQuiet(id) || !text) return; st.hints[id] = { text, t: 0, life: life || SPACEWALK.hintLife }; }
function spacewalkHintOnce(st, key, id, text) { if (st.hinted[key]) return; st.hinted[key] = true; spacewalkHint(st, id, text); }
function spacewalkMsg(st, text, col, life) { st.msg = { text, col, t: 0, life }; }
function spacewalkPop(st, x, y, s, col, size) { st.pops.push({ x, y, s, col: col || '#ffffff', size: size || 18, t: 0 }); if (st.pops.length > 10) st.pops.shift(); }
function spacewalkPart(st, x, y, vx, vy, life, col, size, kind) {
  if (st.parts.length > 260) st.parts.shift();
  st.parts.push({ x, y, vx, vy, life, max: life, col, size, kind: kind || 'dot', r: Math.random() * 6 });
}
function spacewalkSparks(st, x, y, col, n) {
  for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, s = 40 + Math.random() * 120; spacewalkPart(st, x, y, Math.cos(a) * s, Math.sin(a) * s, 0.45 + Math.random() * 0.3, col, 2 + Math.random() * 2, 'spark'); }
}
// the gentle lessons, once each room, when they first matter
function spacewalkNudges(st, plan) {
  const pl = st.pl;
  if (plan.releaser >= 0 && pl[0].hold != null && pl[1].hold != null && G.time - Math.max(pl[0].since, pl[1].since) > 2.5)
    spacewalkHintOnce(st, 'let' + plan.releaser, plan.releaser, 'Let go so ' + NAMES[1 - plan.releaser] + ' can swing you!');
  if (st.noPathT > 6) spacewalkHintOnce(st, 'nopath', plan.anchor, 'No way on from here: let go, Bleep tows you back');
}
function spacewalkFx(st, dt) {
  for (let i = st.parts.length - 1; i >= 0; i--) {
    const q = st.parts[i];
    if ((q.life -= dt) <= 0) { st.parts.splice(i, 1); continue; }
    q.x += q.vx * dt; q.y += q.vy * dt; q.r += dt * 4;
    if (q.kind === 'smoke') { q.vx *= 1 - dt * 2.5; q.vy *= 1 - dt * 2.5; }
  }
  for (const q of st.pops) q.t += dt;
  st.pops = st.pops.filter(q => q.t < 1.2);
  for (const k of [0, 1]) { const h = st.hints[k]; if (h && (h.t += dt) >= h.life) st.hints[k] = null; }
  if (st.msg && (st.msg.t += dt) >= st.msg.life) st.msg = null;
  for (const q of st.pl) if (q.hold != null) q.rot += (spacewalkHoldRot(st, q) - q.rot) * Math.min(1, dt * 8);
}
// a player holding on has their feet toward the grip (the nearest turn to how they float now)
function spacewalkHoldRot(st, q) {
  const h = st.holds[q.hold], r = Math.atan2(h.ox, -h.oy);
  return r + Math.round((q.rot - r) / (Math.PI * 2)) * Math.PI * 2;
}
// copy the floating bodies into the engine players: name tags, bubbles and the CPU read p.x / p.y
function spacewalkMirror(st) {
  for (const p of G.players) {
    const q = st.pl[p.id];
    p.x = q.x - PW / 2; p.y = q.y - PH / 2; p.vx = q.vx; p.vy = 0;
    p.alive = true; p.grounded = false; p.stompSafe = 0; p.stun = 0;
    if (Math.abs(q.vx) > 8) p.face = q.vx > 0 ? 1 : -1;
  }
}

MODES.spacewalk = {
  SPACEWALK,
  plan: spacewalkPlan, key: spacewalkKey, grabR: spacewalkGrabR, fixR: spacewalkFixR, Lmax: spacewalkLmax,
  setup(st, L) {
    st.stats = { bonks: 0, tows: 0, helps: 0, grabs: [0, 0], fixes: [0, 0], spinT: [0, 0], roomT: [], roomTitles: [] };
    spacewalkRoom(st, L, 0);
  },
  room(k, L) { spacewalkRoom(G.mst, L, k); },
  step(dt) { spacewalkStep(G.mst, dt); },
  // the engine draws the players between draw() and drawTop(): they are hidden then and drawn by the mode instead
  draw() {
    const st = G.mst;
    if (!st.pl) return;
    spacewalkDrawWorld(st);
    st.hidAlive = G.players.map(p => p.alive);
    for (const p of G.players) p.alive = false;
  },
  drawTop() {
    const st = G.mst;
    if (st.hidAlive) { G.players.forEach((p, i) => { p.alive = st.hidAlive[i]; }); st.hidAlive = null; }
    if (!st.pl) return;
    spacewalkDrawFront(st);
  },
  hud() { const st = G.mst; if (st.pl) spacewalkHud(st); },
  stats() {
    const s = G.mst.stats;
    if (!s) return [];
    const oops = s.bonks + s.tows, t = G.time;
    const medal = t <= 210 && oops <= 6 ? 'Gold' : t <= 400 && oops <= 15 ? 'Silver' : 'Bronze';
    const out = [
      { label: 'Panels fixed', values: s.fixes.slice() },
      { label: 'Bonks', value: s.bonks },
      { label: 'Tows', value: s.tows },
      { label: 'Medal', value: medal },
    ];
    const words = oops === 0 ? 'Not one bonk or tow. Smooth spacewalkers!' : oops <= 4 ? 'Swing, grab, swap: great teamwork out there!' : 'Lots of boings, and you fixed the whole station together!';
    out.push(words + ' Handles grabbed: Pip ' + s.grabs[0] + ', Bo ' + s.grabs[1] + '.');
    if (s.helps) out.push('Gold help: ' + s.helps + (s.helps === 1 ? ' time' : ' times') + '. Next time, try it without!');
    return out;
  },
};

/* ---------- drawing ---------- */
let spacewalkStars = null, spacewalkSkyG = null;
function spacewalkDrawWorld(st) {
  spacewalkDrawSky(st);
  for (const h of st.hull) spacewalkDrawHull(st, h);
  spacewalkDrawLock(st);
  spacewalkDrawDock(st);
  for (const h of st.holds) if (h.mast) spacewalkDrawMast(h.mast);
  for (const p of st.panels) if (p.mast) spacewalkDrawMast(p.mast);
  for (const p of st.panels) if (p.static && !p.mast) spacewalkDrawBuoy(p.x, p.y + 22, p.id);
  for (const s of st.sats) spacewalkDrawSat(st, s);
  for (const p of st.panels) spacewalkDrawPanel(st, p);
  for (const r of st.rocks) spacewalkDrawRock(st, r);
  for (const h of st.holds) spacewalkDrawHold(st, h);
  spacewalkDrawGuide(st);
}
function spacewalkDrawFront(st) {
  spacewalkDrawTether(st);
  for (const q of st.pl) spacewalkDrawBody(st, q);
  spacewalkDrawBot(st);
  for (const q of st.parts) {
    const a = clamp(q.life / q.max, 0, 1);
    ctx.globalAlpha = q.kind === 'smoke' ? a * 0.8 : a; ctx.fillStyle = q.col; ctx.strokeStyle = q.col;
    if (q.kind === 'spark') { spacewalkStar(q.x, q.y, q.size * 1.8, q.size * 0.7, q.r); ctx.fill(); }
    else if (q.kind === 'ring') { ctx.lineWidth = 2; circle(q.x, q.y, q.size + (1 - a) * 18); ctx.stroke(); }
    else if (q.kind === 'smoke') { circle(q.x, q.y, q.size * (1.4 - 0.6 * a)); ctx.fill(); }
    else { circle(q.x, q.y, q.size * (0.5 + 0.5 * a)); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
  const big = hudBig();
  for (const q of st.pops) {
    const x = clamp(q.x, 90, W - 90), y = clamp(q.y - q.t * 30, 90, H - 90);
    ctx.globalAlpha = clamp((1.2 - q.t) / 0.3, 0, 1);
    bigText(q.s, x, y, q.size * (big ? 1.3 : 1), q.col, 1 + 0.25 * Math.max(0, 1 - q.t / 0.15));
    ctx.globalAlpha = 1;
  }
}
function spacewalkStar(x, y, ro, ri, rot) {
  ctx.beginPath();
  for (let k = 0; k < 8; k++) { const a = rot + k * Math.PI / 4, r = k % 2 ? ri : ro; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
  ctx.closePath();
}
function spacewalkDrawSky(st) {
  if (!spacewalkSkyG) {
    spacewalkSkyG = ctx.createLinearGradient(0, 0, 0, H);
    spacewalkSkyG.addColorStop(0, '#0b0d2e'); spacewalkSkyG.addColorStop(0.6, '#1d1a52'); spacewalkSkyG.addColorStop(1, '#3a2c6e');
  }
  ctx.fillStyle = spacewalkSkyG; ctx.fillRect(0, 0, W, H);
  // a soft nebula
  for (const [x, y, r, col] of [[220, 120, 220, 'rgba(160,110,255,0.10)'], [700, 420, 260, 'rgba(90,170,255,0.08)'], [520, 60, 160, 'rgba(255,140,200,0.06)']]) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  if (!spacewalkStars) {
    spacewalkStars = [];
    for (let i = 0; i < 140; i++) { const h = hash(i, 151); spacewalkStars.push({ x: h % W, y: (h >>> 10) % H, r: 0.6 + ((h >>> 4) % 10) / 9, ph: (h >>> 6) % 628 / 100 }); }
  }
  const t = G.clock;
  for (const s of spacewalkStars) {
    ctx.globalAlpha = 0.45 + 0.4 * Math.sin(t * 1.3 + s.ph);
    ctx.fillStyle = '#ffffff'; circle(s.x, s.y, s.r); ctx.fill();
  }
  ctx.globalAlpha = 1;
  // a big friendly ringed planet, and a little moon
  const px = [780, 220, 360, 220][st.k] || 780, py = [118, 118, 95, 118][st.k] || 118;
  ctx.save(); ctx.translate(px, py);
  ctx.strokeStyle = 'rgba(255,214,160,0.55)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(0, 0, 92, 20, -0.35, Math.PI * 1.02, Math.PI * 1.98); ctx.stroke();
  const pg = ctx.createRadialGradient(-16, -18, 6, 0, 0, 56);
  pg.addColorStop(0, '#f6c8ff'); pg.addColorStop(0.6, '#b98ae6'); pg.addColorStop(1, '#6d4fb0');
  ctx.fillStyle = pg; circle(0, 0, 54); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.beginPath(); ctx.ellipse(-6, -14, 46, 7, -0.35, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(4, 10, 50, 6, -0.35, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,214,160,0.75)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(0, 0, 92, 20, -0.35, -0.02, Math.PI * 1.02); ctx.stroke();
  ctx.restore();
  ctx.fillStyle = '#cfd3e6'; circle(px + (st.k % 2 ? 130 : -130), py + 40, 11); ctx.fill();
  ctx.fillStyle = 'rgba(80,80,120,0.35)'; circle(px + (st.k % 2 ? 127 : -133), py + 37, 3); ctx.fill();
}
function spacewalkDrawHull(st, h) {
  if (h.kind === 'truss') {
    ctx.fillStyle = '#5c6688'; ctx.fillRect(h.x, h.y + 4, h.w, h.h - 8);
    ctx.strokeStyle = '#9aa6c4'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(h.x, h.y + 3); ctx.lineTo(h.x + h.w, h.y + 3); ctx.moveTo(h.x, h.y + h.h - 3); ctx.lineTo(h.x + h.w, h.y + h.h - 3); ctx.stroke();
    ctx.lineWidth = 2; ctx.beginPath();
    for (let x = h.x; x < h.x + h.w; x += 24) { ctx.moveTo(x, h.y + 3); ctx.lineTo(x + 12, h.y + h.h - 3); ctx.lineTo(x + 24, h.y + 3); }
    ctx.stroke();
    return;
  }
  // a white module with blue trim, rivets and a round window
  const g = ctx.createLinearGradient(h.x, 0, h.x + h.w, 0);
  g.addColorStop(0, '#dfe5f5'); g.addColorStop(0.5, '#f7f9ff'); g.addColorStop(1, '#c3cbe2');
  ctx.fillStyle = g; rr(h.x - 2, h.y, h.w + 4, h.h, 10); ctx.fill();
  ctx.strokeStyle = '#7f88b0'; ctx.lineWidth = 2; rr(h.x - 2, h.y, h.w + 4, h.h, 10); ctx.stroke();
  ctx.fillStyle = '#5b95ff';
  for (let y = h.y + 24; y < h.y + h.h - 10; y += 70) ctx.fillRect(h.x, y, h.w, 5);
  ctx.fillStyle = '#9aa6c4';
  for (let y = h.y + 12; y < h.y + h.h; y += 22) { circle(h.x + 7, y, 1.6); ctx.fill(); circle(h.x + h.w - 7, y, 1.6); ctx.fill(); }
  const wx = h.x + h.w / 2, wy = h.y + h.h - 60;
  ctx.fillStyle = '#7f88b0'; circle(wx, wy, 15); ctx.fill();
  ctx.fillStyle = '#1b2a5a'; circle(wx, wy, 11); ctx.fill();
  ctx.fillStyle = 'rgba(160,220,255,0.5)'; ctx.beginPath(); ctx.arc(wx - 3, wy - 3, 6, Math.PI, Math.PI * 1.6); ctx.lineTo(wx - 3, wy - 3); ctx.fill();
}
function spacewalkDrawLock(st) {
  const lk = st.lock, x = lk.x, y = lk.y, f = lk.face, open = lk.open ? clamp(lk.openT / 0.8, 0, 1) : 0;
  ctx.save(); ctx.translate(x, y);
  // the frame: a round hatch on the module face, yellow and black stripes
  ctx.fillStyle = '#2b2850'; ctx.beginPath(); ctx.ellipse(0, 0, 10, 38, 0, 0, Math.PI * 2); ctx.fill();
  ctx.lineWidth = 6; ctx.setLineDash([7, 6]);
  ctx.strokeStyle = '#ffc53d'; ctx.beginPath(); ctx.ellipse(0, 0, 12, 40, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = '#1c1a36'; ctx.lineDashOffset = 6.5; ctx.beginPath(); ctx.ellipse(0, 0, 12, 40, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]); ctx.lineDashOffset = 0;
  // the door slides open
  if (open < 1) {
    ctx.fillStyle = '#c3cbe2'; ctx.beginPath(); ctx.ellipse(f * open * 2, -open * 30, 9 * (1 - open * 0.3), 36 * (1 - open), 0, 0, Math.PI * 2); ctx.fill();
  } else {
    const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 40); g.addColorStop(0, 'rgba(255,240,180,0.9)'); g.addColorStop(1, 'rgba(255,200,90,0)');
    ctx.fillStyle = g; circle(0, 0, 40 + Math.sin(G.clock * 4) * 3); ctx.fill();
  }
  // the light over it: red shut, green open
  const on = Math.sin(G.clock * 5) > 0;
  ctx.fillStyle = lk.open ? '#8fe3b0' : on ? '#ff6b6b' : '#a04848'; circle(-f * 2, -50, 6); ctx.fill();
  ctx.restore();
  // the big green arrow once it opens
  if (lk.open && !st.fin) {
    const bob = Math.sin(G.clock * 5) * 5, ax = x + f * (66 + bob);
    ctx.fillStyle = '#8fe3b0'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(ax - f * 22, y - 8); ctx.lineTo(ax - f * 6, y - 8); ctx.lineTo(ax - f * 6, y - 18); ctx.lineTo(ax + f * 12, y); ctx.lineTo(ax - f * 6, y + 18); ctx.lineTo(ax - f * 6, y + 8); ctx.lineTo(ax - f * 22, y + 8); ctx.closePath();
    ctx.fill(); ctx.stroke();
  }
}
function spacewalkDrawDock(st) {
  // Bleep's little garage on the start module: a round porthole he peeks out of
  const d = st.dock;
  if (st.tow) return;
  ctx.fillStyle = '#7f88b0'; circle(d.x, d.y, 14); ctx.fill();
  ctx.fillStyle = '#1b2a5a'; circle(d.x, d.y, 10); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(d.x, d.y, 10, 0, Math.PI * 2); ctx.clip();
  spacewalkBleep(d.x, d.y + 3 + Math.sin(G.clock * 2) * 1.5, 0.55, 0, false);
  ctx.restore();
}
function spacewalkDrawMast(m) {
  ctx.strokeStyle = '#4a5374'; ctx.lineWidth = 6; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(m.x0, m.y0); ctx.lineTo(m.x1, m.y1); ctx.stroke();
  ctx.strokeStyle = '#9aa6c4'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(m.x0, m.y0); ctx.lineTo(m.x1, m.y1); ctx.stroke();
  // little rungs
  const len = Math.hypot(m.x1 - m.x0, m.y1 - m.y0), ux = (m.x1 - m.x0) / (len || 1), uy = (m.y1 - m.y0) / (len || 1);
  ctx.strokeStyle = '#6a7398'; ctx.lineWidth = 2;
  for (let s = 18; s < len - 6; s += 22) { const x = m.x0 + ux * s, y = m.y0 + uy * s; ctx.beginPath(); ctx.moveTo(x - uy * 5, y + ux * 5); ctx.lineTo(x + uy * 5, y - ux * 5); ctx.stroke(); }
  ctx.lineCap = 'butt';
}
function spacewalkDrawBuoy(x, y, id) {
  ctx.fillStyle = '#c3cbe2'; rr(x - 10, y - 6, 20, 12, 5); ctx.fill();
  ctx.strokeStyle = '#7f88b0'; ctx.lineWidth = 1.5; rr(x - 10, y - 6, 20, 12, 5); ctx.stroke();
  ctx.fillStyle = Math.sin(G.clock * 3 + id.length) > 0.4 ? '#ffd75e' : '#806a30'; circle(x, y + 9, 3); ctx.fill();
}
function spacewalkDrawHold(st, h) {
  const held = st.pl.some(q => q.hold === h.i), gold = st.help > 0;
  ctx.save(); ctx.translate(h.gx, h.gy); ctx.rotate(Math.atan2(h.oy, h.ox));
  // a U-shaped grab bar standing out from its part (+x is out)
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#2b2850'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(-6, -9); ctx.lineTo(5, -9); ctx.lineTo(5, 9); ctx.lineTo(-6, 9); ctx.stroke();
  ctx.strokeStyle = gold ? C.gold : h.lock ? '#8fe3b0' : '#ffc53d'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-6, -9); ctx.lineTo(5, -9); ctx.lineTo(5, 9); ctx.lineTo(-6, 9); ctx.stroke();
  ctx.strokeStyle = '#1c1a36'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(5, -3); ctx.lineTo(5, 0); ctx.stroke();
  ctx.lineCap = 'butt';
  ctx.restore();
  if (!held && gold) { ctx.globalAlpha = 0.25 + 0.15 * Math.sin(G.clock * 5); ctx.fillStyle = C.gold; circle(h.x, h.y, spacewalkGrabR(st)); ctx.fill(); ctx.globalAlpha = 1; }
}
function spacewalkDrawPanel(st, p) {
  const t = G.clock;
  ctx.save(); ctx.translate(p.x, p.y);
  if (p.body) ctx.rotate(p.ang + Math.PI / 2);
  const w = 50, h = 30;
  // the frame and the cells
  ctx.fillStyle = '#c9b06a'; rr(-w / 2 - 3, -h / 2 - 3, w + 6, h + 6, 4); ctx.fill();
  if (p.fixed) {
    const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2); g.addColorStop(0, '#5fb8ff'); g.addColorStop(1, '#2459c9');
    ctx.fillStyle = g;
  } else ctx.fillStyle = '#39405e';
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.strokeStyle = p.fixed ? 'rgba(220,240,255,0.55)' : 'rgba(150,160,200,0.35)'; ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = -w / 2 + 10; x < w / 2; x += 10) { ctx.moveTo(x, -h / 2); ctx.lineTo(x, h / 2); }
  ctx.moveTo(-w / 2, 0); ctx.lineTo(w / 2, 0); ctx.stroke();
  if (!p.fixed) {
    // cracks, a dangling cell and a sputtering spark
    ctx.strokeStyle = '#d9dbe8'; ctx.lineWidth = 1.5; ctx.beginPath();
    ctx.moveTo(-14, -15); ctx.lineTo(-6, -4); ctx.lineTo(-11, 4); ctx.lineTo(-2, 15); ctx.moveTo(-6, -4); ctx.lineTo(6, -2); ctx.lineTo(12, 8); ctx.stroke();
    ctx.fillStyle = '#5a6080'; ctx.save(); ctx.translate(14, 8); ctx.rotate(0.5 + Math.sin(t * 2) * 0.15); ctx.fillRect(-1, 0, 9, 8); ctx.restore();
    if (Math.sin(t * 9 + p.x) > 0.6) { ctx.fillStyle = '#ffe27a'; spacewalkStar(4, -2, 6, 2, t * 4); ctx.fill(); }
  } else {
    // happy glow and a smiley sticker
    const glow = 0.3 + 0.2 * Math.sin(t * 3 + p.x);
    ctx.fillStyle = 'rgba(160,230,255,' + glow + ')'; ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.fillStyle = '#ffd75e'; circle(0, 0, 7); ctx.fill();
    ctx.strokeStyle = C.ink; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(0, 0.5, 3.6, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke();
    ctx.fillStyle = C.ink; circle(-2.3, -1.8, 1); ctx.fill(); circle(2.3, -1.8, 1); ctx.fill();
  }
  ctx.restore();
  // the bolting ring
  if (!p.fixed && p.prog > 0) {
    const f = clamp(p.prog / spacewalkFixNeed(st), 0, 1);
    ctx.strokeStyle = 'rgba(28,26,54,0.7)'; ctx.lineWidth = 7; circle(p.x, p.y, 32); ctx.stroke();
    ctx.strokeStyle = p.work > 0.5 ? '#ffe27a' : '#c9b06a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(p.x, p.y, 32, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * f); ctx.stroke();
  }
  if (p.fixed && p.fixT < 1) {
    ctx.globalAlpha = 1 - p.fixT; ctx.strokeStyle = '#9fe6ff'; ctx.lineWidth = 3; circle(p.x, p.y, 20 + p.fixT * 50); ctx.stroke(); ctx.globalAlpha = 1;
  }
}
function spacewalkDrawRock(st, r) {
  const x = r.cx, y = r.cy, R = r.r;
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = r.solid ? '#8a7f8f' : '#6f6a80';
  ctx.beginPath();
  for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2, rr2 = R * (0.9 + ((hash(r.seed, k) % 100) / 100) * 0.16); ctx.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2); }
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#4e4658'; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.beginPath(); ctx.ellipse(-R * 0.3, -R * 0.35, R * 0.45, R * 0.25, -0.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#6a6070';
  for (let k = 0; k < 3; k++) { const h = hash(r.seed + 3, k); circle(((h % 100) / 100 - 0.5) * R, (((h >>> 8) % 100) / 100 - 0.4) * R, R * (0.12 + (h % 7) / 50)); ctx.fill(); }
  ctx.restore();
}
function spacewalkDrawSat(st, s) {
  ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.ang);
  // arms and solar wings
  for (const [a, len, wing] of s.arms || []) {
    ctx.save(); ctx.rotate(a);
    ctx.strokeStyle = '#4a5374'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len, 0); ctx.stroke();
    ctx.strokeStyle = '#c3cbe2'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len, 0); ctx.stroke();
    if (wing) { ctx.fillStyle = 'rgba(70,90,160,0.55)'; ctx.fillRect(s.r + 6, -20, len - s.r - 10, 40); ctx.strokeStyle = '#9aa6c4'; ctx.lineWidth = 1.5; ctx.strokeRect(s.r + 6, -20, len - s.r - 10, 40); }
    ctx.restore();
  }
  // the core: gold foil with a dish
  ctx.fillStyle = '#d9a84a'; rr(-s.r, -s.r, s.r * 2, s.r * 2, 8); ctx.fill();
  ctx.strokeStyle = '#8a6420'; ctx.lineWidth = 2; rr(-s.r, -s.r, s.r * 2, s.r * 2, 8); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,240,190,0.5)'; ctx.lineWidth = 1.5; ctx.beginPath();
  for (let k = -s.r + 8; k < s.r; k += 10) { ctx.moveTo(k, -s.r + 4); ctx.lineTo(k + 5, s.r - 4); }
  ctx.stroke();
  ctx.fillStyle = '#f2f2ff'; ctx.beginPath(); ctx.ellipse(0, 0, s.r * 0.55, s.r * 0.55, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#c3cbe2'; circle(0, 0, s.r * 0.32); ctx.fill();
  ctx.fillStyle = Math.sin(G.clock * 4) > 0 ? '#ff6b6b' : '#ffd75e'; circle(0, 0, 4); ctx.fill();
  ctx.restore();
}
function spacewalkDrawGuide(st) {
  if (G.introT > 0 || st.tow || st.fin) return;
  const plan = spacewalkPlan(st), pl = st.pl, t = G.clock;
  // the anchor's reach: a faint dotted circle of the tether
  if (plan.anchor >= 0 && pl[plan.anchor].hold != null && pl[1 - plan.anchor].hold == null) {
    const a = pl[plan.anchor];
    ctx.strokeStyle = 'rgba(220,225,255,0.18)'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 7]); circle(a.x, a.y, st.L); ctx.stroke(); ctx.setLineDash([]);
  }
  const tg = plan.target;
  if (!tg) return;
  const r = tg.kind === 'panel' ? 30 : tg.kind === 'lock' ? 46 : spacewalkGrabR(st) + 4;
  ctx.save(); ctx.translate(tg.x, tg.y); ctx.rotate(t * 1.2);
  ctx.strokeStyle = plan.wait ? 'rgba(255,197,61,0.45)' : C.gold; ctx.lineWidth = 3; ctx.setLineDash([8, 6]);
  circle(0, 0, r + Math.sin(t * 5) * 2); ctx.stroke(); ctx.setLineDash([]);
  ctx.restore();
}
function spacewalkDrawTether(st) {
  const [a, b] = st.pl, d = Math.hypot(b.x - a.x, b.y - a.y), slack = Math.max(0, st.L - d);
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, nx = d > 1 ? -(b.y - a.y) / d : 0, ny = d > 1 ? (b.x - a.x) / d : 1;
  const wob = Math.min(28, slack * 0.45) * Math.sin(G.clock * 2.2);
  const path = () => { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo(mx + nx * wob, my + ny * wob, b.x, b.y); };
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#3a3f66'; ctx.lineWidth = 5; path(); ctx.stroke();
  const taut = slack < 3 && st.pl.some(q => q.hold != null);
  ctx.strokeStyle = st.help ? C.gold : taut ? '#ffffff' : '#d9dcf5'; ctx.lineWidth = 2.5; path(); ctx.stroke();
  ctx.setLineDash([2, 6]); ctx.strokeStyle = 'rgba(255,107,74,0.8)'; ctx.lineWidth = 2; path(); ctx.stroke(); ctx.setLineDash([]);
  ctx.lineCap = 'butt';
  // the spin arrows round an anchor that's spinning
  for (const q of st.pl) {
    if (q.hold == null || !q.spin) continue;
    ctx.strokeStyle = PCOL[q.id]; ctx.lineWidth = 3; const a0 = G.clock * 6 * q.spin;
    ctx.beginPath(); ctx.arc(q.x, q.y, 24, a0, a0 + q.spin * 1.6, q.spin < 0); ctx.stroke();
    const ae = a0 + q.spin * 1.6, ex = q.x + Math.cos(ae) * 24, ey = q.y + Math.sin(ae) * 24, tx = -Math.sin(ae) * q.spin, ty = Math.cos(ae) * q.spin;
    ctx.fillStyle = PCOL[q.id]; ctx.beginPath(); ctx.moveTo(ex + tx * 7, ey + ty * 7); ctx.lineTo(ex - ty * 5 - tx * 2, ey + tx * 5 - ty * 2); ctx.lineTo(ex + ty * 5 - tx * 2, ey - tx * 5 - ty * 2); ctx.closePath(); ctx.fill();
  }
}
function spacewalkDrawBody(st, q) {
  const p = G.players[q.id], fin = st.fin;
  let s = 1;
  if (fin) s = clamp(1 - (fin.t - 0.7) / 0.6, 0, 1);
  if (s <= 0) return;
  ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot); ctx.scale(s, s);
  // the backpack and its puff jet
  ctx.fillStyle = '#c3cbe2'; ctx.strokeStyle = '#7f88b0'; ctx.lineWidth = 1.5;
  const bx = -p.face * 13;
  rr(bx - 5, -9, 10, 18, 3); ctx.fill(); ctx.stroke();
  // the body (the game's own sprite), feet at +PH/2
  drawPlayer(Object.assign({}, p, { alive: true, x: -PW / 2, y: -PH / 2, vy: 0, stun: 0, stompSafe: 0, sx: p.sx, sy: p.sy }));
  // the fishbowl helmet
  ctx.strokeStyle = 'rgba(230,240,255,0.85)'; ctx.lineWidth = 2; circle(0, -2, 19); ctx.stroke();
  ctx.fillStyle = 'rgba(200,225,255,0.10)'; circle(0, -2, 19); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, -2, 14, -2.6, -1.9); ctx.stroke();
  ctx.restore();
  // a hand on the handhold
  if (q.hold != null && !fin) {
    const h = st.holds[q.hold];
    ctx.strokeStyle = PDARK[q.id]; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(q.x - h.ox * 8, q.y - h.oy * 8); ctx.lineTo(h.gx + h.ox * 4, h.gy + h.oy * 4); ctx.stroke();
    ctx.fillStyle = PCOL[q.id]; circle(h.gx + h.ox * 4, h.gy + h.oy * 4, 4); ctx.fill();
    ctx.lineCap = 'butt';
  }
  // reaching out while holding grab (floating)
  if (q.hold == null && q.want && !st.tow && !fin) {
    ctx.strokeStyle = PCOL[q.id]; ctx.globalAlpha = 0.5 + 0.3 * Math.sin(G.clock * 12); ctx.lineWidth = 2;
    circle(q.x, q.y, spacewalkGrabR(st) - 4); ctx.stroke(); ctx.globalAlpha = 1;
  }
}
// Bleep the tow robot: a round white robot with a screen face, an antenna and little jets
function spacewalkBleep(x, y, s, tilt, jets) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.rotate(tilt);
  if (jets) {
    ctx.fillStyle = 'rgba(140,210,255,0.8)';
    for (const sx of [-10, 10]) { ctx.beginPath(); ctx.moveTo(sx - 4, 14); ctx.lineTo(sx + 4, 14); ctx.lineTo(sx, 24 + Math.random() * 6); ctx.closePath(); ctx.fill(); }
  }
  ctx.strokeStyle = '#7f88b0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(0, -25); ctx.stroke();
  ctx.fillStyle = Math.sin(G.clock * 6) > 0 ? '#ff6b6b' : '#ffd75e'; circle(0, -26, 3.5); ctx.fill();
  ctx.fillStyle = '#f7f9ff'; circle(0, 0, 17); ctx.fill(); ctx.strokeStyle = '#7f88b0'; ctx.lineWidth = 2; circle(0, 0, 17); ctx.stroke();
  ctx.fillStyle = '#1b2a5a'; rr(-11, -8, 22, 14, 6); ctx.fill();
  ctx.fillStyle = '#7fe0ff'; rr(-7, -5, 4, 6, 2); ctx.fill(); rr(3, -5, 4, 6, 2); ctx.fill();
  ctx.strokeStyle = '#7fe0ff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 1, 4, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke();
  ctx.restore();
}
function spacewalkDrawBot(st) {
  const tw = st.tow;
  if (!tw || tw.x == null) return;
  const pl = st.pl, mid = { x: (pl[0].x + pl[1].x) / 2, y: (pl[0].y + pl[1].y) / 2 };
  if (tw.phase === 'tow') {
    ctx.strokeStyle = '#ffd75e'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(tw.x, tw.y + 14); ctx.lineTo(mid.x, mid.y); ctx.stroke(); ctx.setLineDash([]);
  }
  spacewalkBleep(tw.x, tw.y, 1, Math.sin(G.clock * 3) * 0.15, true);
}

/* ---------- the HUD ---------- */
function spacewalkHud(st) {
  const S = SPACEWALK, big = hudBig(), z = big ? 1.4 : 1, ps = G.players, pl = st.pl, play = G.mode === 'play' || G.mode === 'paused', t = G.clock;
  // time, bonks and tows: top right
  let timeX0 = W - 14;
  {
    const fs = big ? 20 : 14, h = big ? 40 : 28, tm = fmtTime(G.time), nb = String(st.stats.bonks), nt = String(st.stats.tows);
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const tw = ctx.measureText(tm).width, bw = ctx.measureText(nb).width, ttw = ctx.measureText(nt).width, ic = fs * 1.2, gap = fs * 0.8;
    const w = tw + gap + ic + 4 + bw + gap + ic + 4 + ttw + 30, x0 = pill(W - 14, 12, w, h, 'right'), cy = 12 + h / 2 + 0.5;
    text(tm, x0 + 15, cy, fs, C.paper, 'left', 'body');
    let x = x0 + 15 + tw + gap + ic / 2;
    ctx.fillStyle = '#ffd2f0'; spacewalkStar(x, cy, ic * 0.5, ic * 0.22, t * 0.5); ctx.fill();
    text(nb, x + ic / 2 + 4, cy, fs, '#ffd2f0', 'left', 'body');
    x += ic / 2 + 4 + bw + gap + ic / 2;
    spacewalkBleep(x, cy + 1, fs / 44, 0, false);
    text(nt, x + ic / 2 + 4, cy, fs, '#bfe3ff', 'left', 'body');
    timeX0 = x0;
  }
  // the panels to fix (or the open airlock): top centre
  const lk = st.lock;
  {
    const fs = big ? 18 : 13, h = big ? 36 : 26, n = st.panels.length, done = st.panels.filter(p => p.fixed).length;
    const label = lk.open ? 'Airlock open! Both get inside' : 'Fix the panels';
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const lw = ctx.measureText(label).width, iw = lk.open ? 0 : n * (fs * 1.5 + 4) + 6;
    const w = lw + iw + 28, cx = clamp(W / 2 + 30, 340 + w / 2, timeX0 - 10 - w / 2), y = 12;
    const x0 = pill(cx, y, w, h, 'center');
    text(label, x0 + 14, y + h / 2 + 0.5, fs, lk.open ? '#8fe3b0' : C.paper, 'left', 'body');
    if (!lk.open) st.panels.forEach((p, i) => {
      const px = x0 + 14 + lw + 10 + i * (fs * 1.5 + 4), py = y + h / 2 - fs * 0.45, pw = fs * 1.5, ph = fs * 0.9;
      ctx.fillStyle = p.fixed ? '#5fb8ff' : '#39405e'; rr(px, py, pw, ph, 2); ctx.fill();
      ctx.strokeStyle = p.fixed ? '#c9b06a' : '#7f88b0'; ctx.lineWidth = 1.5; rr(px, py, pw, ph, 2); ctx.stroke();
      if (!p.fixed && p.prog > 0) { ctx.fillStyle = '#ffe27a'; ctx.fillRect(px + 1, py + ph - 3, (pw - 2) * clamp(p.prog / spacewalkFixNeed(st), 0, 1), 2); }
    });
    st.topBot = y + h;
  }
  // the message line (gold help, Bleep), under the top pills
  if (st.msg) {
    let fs = big ? 18 : 14;
    const h = big ? 32 : 26, font = n => '700 ' + n + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    ctx.font = font(fs);
    let w = ctx.measureText(st.msg.text).width + 30;
    while (w > W - 40 && fs > 11) { fs--; ctx.font = font(fs); w = ctx.measureText(st.msg.text).width + 30; }
    const y = big ? 104 : 80;
    ctx.globalAlpha = clamp((st.msg.life - st.msg.t) / 0.3, 0, 1);
    pill(W / 2 + 40, y, w, h, 'center'); text(st.msg.text, W / 2 + 40, y + h / 2 + 0.5, fs, st.msg.col, 'center', 'body'); ctx.globalAlpha = 1;
  }
  if (!play) return;
  const plan = spacewalkPlan(st);
  // each player's job card, bottom corners: what you're doing and your keys
  for (const id of [0, 1]) {
    const q = pl[id], o = pl[1 - id], quiet = spacewalkQuiet(id);
    const role = st.tow ? 'tow' : q.hold != null && o.hold == null ? 'anchor' : q.hold != null ? 'hold' : o.hold != null ? 'float' : 'drift';
    const title = NAMES[id] + { anchor: ' holds on', hold: ' holds on', float: ' floats', drift: ' drifts', tow: ' gets towed' }[role] + (quiet ? ' (computer)' : '');
    const chips = [];
    if (!quiet) {
      if (role === 'anchor') chips.push([spacewalkKey(id, 'act') + ' hold', q.want, false], [spacewalkKey(id, 'lr') + ' spin', !!q.spin, plan.target && Math.hypot(o.vx, o.vy) < 50], [spacewalkKey(id, 'ud') + ' reel', !!q.reel, false]);
      else if (role === 'hold') chips.push([spacewalkKey(id, 'act') + ' hold', q.want, false], ['let go: release', false, plan.releaser === id]);
      else if (role === 'float') chips.push([spacewalkKey(id, 'act') + ' grab · fix', q.want, false], [spacewalkKey(id, 'all') + ' puff', q.puff > 0.5, false]);
      else if (role === 'drift') chips.push([spacewalkKey(id, 'act') + ' grab', q.want, plan.target && Math.hypot(plan.target.x - q.x, plan.target.y - q.y) < spacewalkGrabR(st) * 1.6], st.freeT > 0 ? ['hold ' + spacewalkKey(id, 'down') + ': Bleep', q.callT > 0, st.freeT > 1.5] : ['wait for a swing', false, false]);
    }
    const pw = Math.round((quiet ? 190 : 262) * z), ph = Math.round((quiet ? 30 : 52) * z), py = H - ph - 8;
    const px = id === 0 ? 10 : W - 10 - pw;
    ctx.fillStyle = 'rgba(28,26,54,0.8)'; rr(px, py, pw, ph, 12 * z); ctx.fill();
    ctx.strokeStyle = PCOL[id]; ctx.lineWidth = 2.5; rr(px, py, pw, ph, 12 * z); ctx.stroke();
    text(title, px + 12 * z, py + (quiet ? ph / 2 : 14 * z), 14 * z, PCOL[id], 'left');
    // the puff tank
    if (role === 'float' && !quiet) {
      const tw2 = 56 * z, tx = px + pw - 12 * z - tw2, ty = py + 9 * z;
      ctx.fillStyle = 'rgba(255,255,255,0.15)'; rr(tx, ty, tw2, 8 * z, 4 * z); ctx.fill();
      ctx.fillStyle = q.fuel > 0.2 ? '#bfe3ff' : '#ff9a9a'; rr(tx, ty, Math.max(4, tw2 * q.fuel / S.fuel), 8 * z, 4 * z); ctx.fill();
    }
    if (chips.length) {
      const cw = (pw - 24 * z - (chips.length - 1) * 6 * z) / chips.length;
      chips.forEach(([lab, doing, want], i) => {
        const cx = px + 12 * z + i * (cw + 6 * z), cy = py + 25 * z, chh = 20 * z;
        ctx.fillStyle = doing ? '#8fe3b0' : want ? (Math.sin(t * 12) > -0.3 ? C.gold : 'rgba(255,197,61,0.55)') : 'rgba(255,255,255,0.12)';
        rr(cx, cy, cw, chh, chh / 2); ctx.fill();
        let fs = 11.5 * z;
        ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
        while (ctx.measureText(lab).width > cw - 8 && fs > 8) { fs -= 0.5; ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif'; }
        text(lab, cx + cw / 2, cy + chh / 2 + 0.5, fs, doing || want ? C.ink : '#d9d3ef', 'center', 'body');
      });
    }
  }
  if (G.introT > 0 || st.tow || st.fin) { spacewalkHints(st); return; }
  // prompts over the heads
  const fs = 14 * z;
  const say = (id, str, col, pulse) => {
    if (spacewalkQuiet(id) || st.hints[id]) return;
    const q = pl[id];
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w = ctx.measureText(str).width + 20 * z, h = fs + 12 * z;
    let y = q.y - 30 * z - h;
    if (y < (st.topBot || 40) + 6) y = q.y + 28 * z;
    const x = clamp(q.x - w / 2, 4, W - w - 4), s = pulse ? 1 + 0.06 * Math.sin(t * 14) : 1;
    ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.scale(s, s);
    ctx.fillStyle = 'rgba(28,26,54,0.86)'; rr(-w / 2, -h / 2, w, h, h / 2); ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 2; rr(-w / 2, -h / 2, w, h, h / 2); ctx.stroke();
    text(str, 0, 0.5, fs, col, 'center', 'body');
    ctx.restore();
  };
  const gR = spacewalkGrabR(st), fR = spacewalkFixR(st), tg = plan.target;
  for (const id of [0, 1]) {
    const q = pl[id], o = pl[1 - id];
    if (q.hold != null && o.hold != null) {
      if (plan.releaser === id && G.time - Math.max(q.since, o.since) > 0.6) say(id, 'Let go of ' + spacewalkKey(id, 'act') + '!', C.gold, true);
    } else if (q.hold != null) {
      if (st.noPathT > 6) say(id, 'Let go: Bleep tows you', '#bfe3ff', false);
      else if (tg && tg.kind !== 'lock' && st.roomT > 0.5) {
        const f = o, ft = Math.hypot(tg.x - f.x, tg.y - f.y), want = Math.hypot(tg.x - q.x, tg.y - q.y);
        if (ft > gR * 1.3 && Math.hypot(f.vx, f.vy) < 40) say(id, 'Spin ' + NAMES[1 - id] + '! ' + spacewalkKey(id, 'lr'), '#ffe7a8', false);
        else if (want < st.L - gR - 4 && ft > gR && Math.abs(Math.hypot(f.x - q.x, f.y - q.y) - st.L) < 6) say(id, 'Reel in ' + spacewalkKey(id, 'up'), '#ffe7a8', false);
      } else if (tg && tg.kind === 'lock' && Math.hypot(o.x - lk.x, o.y - lk.y) > S.lockR - 4) say(id, 'Reel ' + NAMES[1 - id] + ' in ' + spacewalkKey(id, 'up'), C.gold, true);
    } else if (o.hold != null) {
      const nearP = st.panels.find(p => !p.fixed && Math.hypot(p.x - q.x, p.y - q.y) < fR + 16);
      if (nearP) say(id, !q.want ? 'Hold ' + spacewalkKey(id, 'act') + ': fix it!' : q.ix || q.iy ? 'Keep still to bolt!' : 'Bolting...', C.gold, !q.want || !!(q.ix || q.iy));
      else if (tg && tg.kind === 'hold' && Math.hypot(tg.x - q.x, tg.y - q.y) < gR * 2.2) say(id, 'Hold ' + spacewalkKey(id, 'act') + ': grab!', C.gold, true);
    } else if (tg && Math.hypot(tg.x - q.x, tg.y - q.y) < gR * 1.6) say(id, 'Hold ' + spacewalkKey(id, 'act') + ' to grab!', C.gold, true);
  }
  spacewalkHints(st);
}
function spacewalkHints(st) {
  const z = hudBig() ? 1.4 : 1, fs = 14 * z;
  for (const id of [0, 1]) {
    const h = st.hints[id];
    if (!h) continue;
    const q = st.pl[id];
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w = ctx.measureText(h.text).width + 22 * z, hh = fs + 14 * z;
    let y = q.y - 30 * z - hh;
    if (y < (st.topBot || 40) + 6) y = q.y + 28 * z;
    const x = clamp(q.x - w / 2, 4, W - w - 4);
    ctx.globalAlpha = clamp((h.life - h.t) / 0.3, 0, 1);
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = PCOL[id]; ctx.lineWidth = 2.5;
    rr(x, y, w, hh, hh / 2); ctx.fill(); ctx.stroke();
    text(h.text, x + w / 2, y + hh / 2 + 0.5, fs, C.ink, 'center', 'body');
    ctx.globalAlpha = 1;
  }
}

/* ---------- sounds ---------- */
Sfx.extra.spacewalkGrab = function (p) { this.tone(880 * p, 0.05, 'square', 0.04, 1320 * p); this.tone(1760 * p, 0.06, 'triangle', 0.03, null, 0.03); };
Sfx.extra.spacewalkLetGo = function (p) { this.tone(520 * p, 0.12, 'sine', 0.04, 300 * p); };
Sfx.extra.spacewalkSwish = function (p) { this.tone(240 * p, 0.25, 'sawtooth', 0.012, 520 * p); };
Sfx.extra.spacewalkPuff = function () { this.tone(1800 + Math.random() * 600, 0.05, 'sawtooth', 0.008, 900); };
Sfx.extra.spacewalkReel = function () { this.tone(1400, 0.02, 'square', 0.012); };
Sfx.extra.spacewalkBoing = function (p) { this.tone(160 / p, 0.32, 'sine', 0.09, 520 / p); this.tone(320 / p, 0.12, 'triangle', 0.03, 640 / p, 0.05); };
Sfx.extra.spacewalkBump = function () { this.tone(260, 0.06, 'triangle', 0.035, 200); };
Sfx.extra.spacewalkBoop = function () { this.tone(420, 0.08, 'sine', 0.03, 300); };
Sfx.extra.spacewalkBolt = function () { this.tone(1500 + Math.random() * 300, 0.03, 'square', 0.025, 900); };
Sfx.extra.spacewalkFixed = function () { [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.05, null, i * 0.06)); this.tone(2093, 0.3, 'sine', 0.03, null, 0.26); };
Sfx.extra.spacewalkOpen = function () { this.tone(200, 0.5, 'sawtooth', 0.02, 600); [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.14, 'triangle', 0.05, null, 0.3 + i * 0.08)); };
Sfx.extra.spacewalkHiss = function () { this.tone(3000, 0.5, 'sawtooth', 0.01, 1200); this.tone(180, 0.4, 'sine', 0.05, 90, 0.1); };
Sfx.extra.spacewalkBeep = function () { [988, 1319, 988].forEach((f, i) => this.tone(f, 0.07, 'square', 0.03, null, i * 0.09)); };
Sfx.extra.spacewalkTow = function () { this.tone(300, 0.6, 'sawtooth', 0.015, 600); this.tone(1200, 0.08, 'square', 0.02, null, 0.1); };
Sfx.extra.spacewalkGold = function () { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.05, null, i * 0.07)); };
