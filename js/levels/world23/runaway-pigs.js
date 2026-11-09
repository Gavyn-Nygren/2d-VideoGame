/* Pip & Bo - Level 23-2 Runaway Pigs (team, World 23 Barnyard Fair). */
'use strict';

/* ===== 23-2 Runaway Pigs (mode 'pigherd', team) — Gavyn's pick (Nov 2026) =====
   "Greased pigs escape across the farm. One opens and closes gates ahead, the other chases and herds them back toward
   the pen."
   A top-down farm that scrolls right through four chases. The mode owns the tick, the camera, the picture and the HUD
   (def.ownStep + def.ownHUD + def.noFalls; the engine grid is only the two spawns). Pip and Bo WALK in four
   directions: ◀ ▶ and ▲ (jump counts as up) / ▼, in WORLD coordinates (x along the chase, y on screen; the camera only
   scrolls sideways). Between steps p.x is on screen (world x - camX), so the engine draws them, their name tags and
   the computer's bubbles in the right place.
   - THE PIGS (4-6 a chase, each with a name: Rosie, Peanut...) are slippery: they skid and slide. They run away from
     the HERDER (within about 140 px; nearer means faster), keep loosely together, and graze and wander when nobody is
     near. Running pigs lean toward the way home along the farm track and dash for an open gate in front of them. They
     ignore the gatekeeper (they slip between the gatekeeper's legs), so only the herder can move them.
   - THE HERDER's action ('clap') is a big clap: every pig within 200 px dashes away from the herder (0.75 s rest).
     A clap close by (120 px) also gets a pig out of a mud puddle.
   - THE GATEKEEPER's action ('gate') swings the gate (or flips the lever) they stand by (within about 54 px).
     People climb over gates, so a gate only ever stops pigs.
       forward gates start shut: open them so the pigs can go on;
       side gates start open: shut them, or curious pigs trot into the cornfield, the duck pond, the vegetable patch
         or the pie tent ("Oops! Peanut ran into the cornfield!"); after about 5.5 s Farmer Fran pops up ("Shoo,
         piggy!") and the pig runs back out to the track. That costs time and counts as a wrong turn; no pig is ever
         lost for good;
       a lever pair: two gates at a fork, only one open at a time; the lever picks the way (one way is a dead end);
       the barn door slides open when its rope is pulled and slides shut again after 6.5 s (never on a pig), so open
         it when the herd is close;
       the pen gate: open it, and when every pig is in, shut it: "All in!". Penned pigs trot to the trough and stay.
     The gatekeeper also rolls the hay bale by walking into it, to fill a broken fence gap (it snaps into the gap).
   - Mud puddles: a pig that reaches one flops down to wallow ("Oink!") until the herder comes close and claps. People
     walk slowly through mud.
   - Each chase ends at a pen: all in, the gate shut, confetti, then the jobs swap (Pip herds chases 1 and 3). The last
     pen is at the county fair, where the pigs win the "Best Pigs" ribbon.
   Chases (def.roomWord 'Chase'): Barnyard (a gate, a mud puddle, one side gate), Duck Pond (two side gates by the
   pond, a gate, a broken fence for the hay bale, another gate), Cornfield Maze (a lever fork, two side gates, two
   puddles, a gate), Fairground (the sliding barn door, a lever fork, a side gate by the pie tent, the big pen).
   - Gold help, always announced and only while both players are playing (pressed something in the last 10 s; in
     2-player a gatekeeper waiting by a gate counts as playing for 90 s): a pig that makes no headway for 40 s, or
     sits in the mud for 25 s, gets a gold ribbon and trots home by itself along the track (it still waits at shut
     gates; ribbons count as one gold help a chase); 2 wrong turns in a chase or 22 s on one gate job with the herd
     near shows a gold arrow over the gate to work next; 3 wrong turns through the same side gate (or down the wrong
     fork) make it shut (or the lever flip) by itself, and the hay rolls into a broken fence by itself; the herd
     waiting 25 s at a shut gate, fork, barn door or pen makes that way a gold gate that opens and stays open; every
     pig in and the pen still open for 20 s, the pen gate shuts itself. Gold gates and levers stay put (the gatekeeper
     can't undo them). 85 s in one chase, or the herder far from the pigs for 30 s, gives gold oats: the pigs are full
     and trot slower for the rest of the chase.
   - Rest: when every person playing has pressed nothing for 15 s the clock waits ("RESTING" chip).
   - Leash: the two can't be more than 800 px apart; the camera always keeps both on screen. The gatekeeper running
     too far ahead waits ("Wait for Bo!"); the herder going back for a straggler pulls the gatekeeper along ("Come on,
     Bo!"), so a gatekeeper waiting by the pen never blocks the herding.
   Medal: Gold at <= 3:45 with <= 3 wrong turns and <= 1 gold help, Silver at <= 5:45 with <= 9 wrong turns, else
   Bronze. Results: Pigs penned, Wrong turns, Gold help, Medal, and a line with the quickest chase and the claps.
   Room def: { title, herder: 0|1, look, tip, news, act, len, pigs: [names], spots: [indexes], items: [...] } with items
   (world coords; the field is y 104 to 492):
     ['fence', x0, y0, x1, y1]                   a wooden fence along a straight line (12 thick)
     ['gate', id, x0, y0, x1, y1, { kind, open, zone, swing }]   a gate hinged at (x0, y0); kind 'fwd' | 'side' |
                                                 'fork' | 'barn' (side gates name the zone behind them)
     ['lever', id, x, y, [a, b]]                 flips gates a and b (exactly one open; b is the right way)
     ['zone', id, kind, x0, y0, x1, y1, backX, backY]   an off-track place (kind 'corn' | 'pond' | 'veg' | 'pie');
                                                 people can't walk in; a pig inside is a wrong turn and comes back at
                                                 (backX, backY)
     ['mud', x, y, r]                            a mud puddle (an ellipse r wide, 0.6 r tall)
     ['hay', x, y, [x0, y0, x1, y1], zone]       a hay bale (64 x 44) and the fence gap it fills (into zone)
     ['solid', x, y, w, h, look]                 a block for everyone (look 'haystack' | 'barn' | 'tent' | 'stall' |
                                                 'corn' | 'tractor' | 'trough' | 'tree')
     ['pen', x0, y0, x1, y1, final]              the pen (its gate is on the left side, in the middle)
     ['route', [[x, y], ...]]                    the farm track to the pen (pig flow, ribbons, the computer)
     ['pigs', x, y]                              where the herd starts
     ['sign', x, y, text, cpuText]               words on the grass ({H} / {K} herder / gatekeeper names, {Ha} / {Ka}
                                                 their action keys; cpuText when that role is the computer)
     ['decor', kind, x, y, o]                    looks only (chickens, flowers, ducks, bunting, balloons, ...)
   MODES.pigherd exposes plan / jobs / helpers the computer brain reads; state lives in G.mst. Every top-level name
   starts with pigherd / PIGHERD (Sfx.extra.pigherd* too). */
const PIGHERD = {
  top: 104, bot: 492, ft: 12,
  walk: 215, acc: 1900, dec: 2600, mudSlow: 0.55,
  pigR: 13, fleeR: 140, fleeA: 950, clapR: 200, clapV: 255, clapCD: 0.75,
  calmMax: 42, runMax: 182, dashMax: 270, fricCalm: 3.4, fricRun: 1.15,
  flowA: 300, gapA: 320, curiousR: 230, curiousA: 75, curiousRunR: 150, curiousRunA: 210,
  sepR: 31, cohR: 170, cohA: 42,
  wallowNear: 120, mudCD: 4,
  lostT: 5.5, zoneCD: 7,
  gateReach: 54, barnT: 6.5,
  ribbonT: 40, ribbonV: 82, mudGoldT: 25, blockGoldT: 25, penGoldT: 20, arrowT: 22, oatsT: 85, farT: 30, farD: 330, oatsMul: 0.72, goldGate: 3,
  leash: 800, idleRest: 15, activeT: 10, keeperWaitT: 90,
  introHold: 0.4, newsLife: 3.8, clearT: 2.4, finT: 5.2, chipAgain: 14,
  hayW: 64, hayH: 44,
};

(() => {
  const PH0 = PIGHERD;
  const solo = () => typeof cpuSolo === 'function' && cpuSolo();
  const isCpu = id => solo() && cpuOn(id);
  const big = () => typeof hudBig === 'function' && hudBig();
  const lerp = (a, b, u) => a + (b - a) * u;
  const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
  const FONT = '"Atkinson Hyperlegible", system-ui, sans-serif';
  const DISP = '"Lilita One", "Arial Rounded MT Bold", sans-serif';
  const TAU = Math.PI * 2;

  /* ---------- each player's own keys (keyboard, controller or touch) ---------- */
  function dev(id) { try { return actKey(id); } catch (e) { return 'kb'; } }
  function key(id, what) {
    const d = dev(id), s = solo();
    if (what === 'act') return d === 'pad' ? glyph('act') : d === 'touch' ? 'the ' + (G.mst && G.mst.herder === id ? 'clap' : 'gate') + ' button' : s ? 'F' : id === 0 ? 'F' : '/';
    if (what === 'move') return d === 'pad' ? 'the stick' : d === 'touch' ? '◀ ▶ ▲ ▼' : s ? 'W A S D' : id === 0 ? 'W A S D' : 'the arrows';
    return '';
  }

  /* ---------- building a chase from its items ---------- */
  function fenceRect(x0, y0, x1, y1) {
    const h = PH0.ft / 2;
    return { x0: Math.min(x0, x1) - h, x1: Math.max(x0, x1) + h, y0: Math.min(y0, y1) - h, y1: Math.max(y0, y1) + h };
  }
  function compile(st, def) {
    const walls = [], gates = [], zones = [], muds = [], hays = [], levers = [], signs = [], decor = [];
    let pen = null, route = [[100, 300], [def.len || 2800, 300]], spawn = [400, 300];
    const nm = s => String(s).replace(/\{H\}/g, NAMES[st.herder]).replace(/\{K\}/g, NAMES[st.keeper]);
    for (const it of def.items || []) {
      const k = it[0];
      if (k === 'fence') walls.push(Object.assign(fenceRect(it[1], it[2], it[3], it[4]), { look: 'fence', vert: it[1] === it[3] }));
      else if (k === 'gate') {
        const o = it[6] || {}, vert = it[2] !== it[4] && it[1] === it[3];
        const g = Object.assign(fenceRect(it[2], it[3], it[4], it[5]), {
          id: it[1], hx: it[2], hy: it[3], ex: it[4], ey: it[5], vert, kind: o.kind || 'fwd', open: !!o.open, anim: o.open ? 1 : 0,
          zone: o.zone || null, swing: o.swing || -1, wrong: 0, gold: false, t: 0, openT: 0, len: 0, blockT: 0,
        });
        g.vert = it[2] === it[4];
        g.len = Math.hypot(it[4] - it[2], it[5] - it[3]);
        g.cx = (it[2] + it[4]) / 2; g.cy = (it[3] + it[5]) / 2;
        gates.push(g);
      } else if (k === 'lever') levers.push({ id: it[1], x: it[2], y: it[3], pair: it[4], t: 0, gold: false });
      else if (k === 'zone') zones.push({ id: it[1], kind: it[2], x0: it[3], y0: it[4], x1: it[5], y1: it[6], bx: it[7], by: it[8], wrong: 0, farmerT: -1, seed: zones.length * 17 + 3 });
      else if (k === 'mud') muds.push({ x: it[1], y: it[2], r: it[3], seed: muds.length * 11 + 5 });
      else if (k === 'hay') {
        const s = it[3];
        hays.push({ x0: it[1] - PH0.hayW / 2, y0: it[2] - PH0.hayH / 2, w: PH0.hayW, h: PH0.hayH, sx: it[1], sy: it[2], slot: { x0: s[0], y0: s[1], x1: s[2], y1: s[3], cx: (s[0] + s[2]) / 2, cy: (s[1] + s[3]) / 2 }, zone: it[4] || null, locked: false, wrong: 0, gold: false, pushT: 0, roll: 0 });
      } else if (k === 'solid') walls.push({ x0: it[1], y0: it[2], x1: it[1] + it[3], y1: it[2] + it[4], look: it[5] || 'haystack', seed: walls.length * 7 + 1 });
      else if (k === 'pen') {
        const x0 = it[1], y0 = it[2], x1 = it[3], y1 = it[4], cy = (y0 + y1) / 2, gh = 56;
        pen = { x0, y0, x1, y1, cy, final: !!it[5], tx: x1 - 56, ty: cy };
        walls.push(Object.assign(fenceRect(x0, y0, x1, y0), { look: 'fence', pen: true }), Object.assign(fenceRect(x0, y1, x1, y1), { look: 'fence', pen: true }),
          Object.assign(fenceRect(x1, y0, x1, y1), { look: 'fence', vert: true, pen: true }),
          Object.assign(fenceRect(x0, y0, x0, cy - gh), { look: 'fence', vert: true, pen: true }), Object.assign(fenceRect(x0, cy + gh, x0, y1), { look: 'fence', vert: true, pen: true }));
        const g = Object.assign(fenceRect(x0, cy - gh, x0, cy + gh), { id: 'pen', hx: x0, hy: cy - gh, ex: x0, ey: cy + gh, vert: true, kind: 'pen', open: false, anim: 0, zone: null, swing: -1, wrong: 0, gold: false, t: 0, openT: 0, len: gh * 2, blockT: 0, cx: x0, cy });
        gates.push(g); pen.gate = g;
      } else if (k === 'route') route = it[1];
      else if (k === 'pigs') spawn = [it[1], it[2]];
      else if (k === 'sign') signs.push({ x: it[1], y: it[2], raw: nm(it[3]), alt: it[4] != null ? nm(it[4]) : null, role: /\{K\}|\{Ka\}/.test(it[3]) ? 'k' : /\{H\}|\{Ha\}/.test(it[3]) ? 'h' : '' });
      else if (k === 'decor') decor.push({ kind: it[1], x: it[2], y: it[3], o: it[4] || {}, seed: decor.length * 13 + 5 });
    }
    st.walls = walls; st.gates = gates; st.zones = zones; st.muds = muds; st.hays = hays; st.levers = levers; st.signs = signs; st.decor = decor;
    st.pen = pen; st.len = def.len || 2800;
    // the farm track: segments with their lengths along the way (s)
    const segs = [];
    let s0 = 0;
    for (let i = 0; i < route.length - 1; i++) {
      const [ax, ay] = route[i], [bx, by] = route[i + 1], L = Math.hypot(bx - ax, by - ay);
      segs.push({ ax, ay, bx, by, L, ux: (bx - ax) / L, uy: (by - ay) / L, s0 }); s0 += L;
    }
    st.route = route; st.segs = segs; st.routeLen = s0;
    // the levers pick between their two gates (a open first, b shut: b is the right way)
    for (const lv of levers) {
      lv.a = gates.find(g => g.id === lv.pair[0]); lv.b = gates.find(g => g.id === lv.pair[1]);
      if (lv.a) { lv.a.open = true; lv.a.anim = 1; lv.a.lever = lv; }
      if (lv.b) { lv.b.open = false; lv.b.anim = 0; lv.b.lever = lv; }
    }
    // the gatekeeper's jobs along the way, in order
    const jobs = [];
    for (const g of gates) {
      if (g.kind === 'side') jobs.push({ kind: 'shut', gate: g, x: g.cx, y: g.cy, passX: Math.max(g.hx, g.ex) + 70 });
      else if (g.kind === 'fwd') jobs.push({ kind: 'open', gate: g, x: g.cx, y: g.cy, passX: g.cx + 50 });
      else if (g.kind === 'barn') jobs.push({ kind: 'barn', gate: g, x: g.cx, y: g.cy, passX: g.cx + (def.barnLen || 270) });
      else if (g.kind === 'pen') jobs.push({ kind: 'pen', gate: g, x: g.cx, y: g.cy, passX: 1e9 });
    }
    for (const lv of levers) jobs.push({ kind: 'lever', lever: lv, x: lv.x, y: lv.y, passX: Math.max(lv.b ? lv.b.cx : lv.x, lv.x) + 60 });
    for (const h of hays) jobs.push({ kind: 'hay', hay: h, x: h.slot.cx, y: h.slot.cy, passX: h.slot.x1 + 70 });
    jobs.sort((a, b) => a.x - b.x);
    for (const j of jobs) { j.pendT = 0; j.prog = progress(st, j.x, j.y); }
    st.jobs = jobs;
    // the pigs
    const names = def.pigs || ['Rosie', 'Peanut', 'Truffle', 'Biscuit'];
    st.pigs = names.map((n, i) => {
      const a = i / names.length * TAU + 0.4, r = 26 + (i % 2) * 22;
      const x = spawn[0] + Math.cos(a) * r * 1.4, y = spawn[1] + Math.sin(a) * r;
      return {
        name: n, i, x, y, vx: 0, vy: 0, face: i % 2 ? -1 : 1, state: 'run', alarm: 0, dashT: 0, wander: Math.random() * TAU, wanderT: Math.random() * 2,
        graze: 0, mudCD: 0, zoneCD: 0, muddy: false, spot: (def.spots || []).includes(i), gold: false, lostT: 0, zone: null, bestP: 0, strayT: 0,
        legT: Math.random() * 3, hitT: 0, oinkT: 1 + Math.random() * 4, slot: i, happyT: 0, squealCD: 0, skidT: 0, mood: 0,
      };
    });
    for (const p of st.pigs) p.bestP = progress(st, p.x, p.y);
    // static solid lists
    st.solP = walls.concat(zones.map(z => ({ x0: z.x0, y0: z.y0, x1: z.x1, y1: z.y1, zone: z })));
  }

  /* ---------- the farm track ---------- */
  // how far along the track a spot is (s), and the nearest segment
  function nearSeg(st, x, y) {
    let best = null, bd = 1e18, bs = 0;
    for (const g of st.segs) {
      const u = clamp((x - g.ax) * g.ux + (y - g.ay) * g.uy, 0, g.L), px = g.ax + g.ux * u, py = g.ay + g.uy * u;
      const d = (px - x) ** 2 + (py - y) ** 2;
      if (d < bd) { bd = d; best = g; bs = g.s0 + u; }
    }
    return { seg: best, s: bs, d: Math.sqrt(bd) };
  }
  const progress = (st, x, y) => nearSeg(st, x, y).s;
  // a point on the track at distance s
  function routeAt(st, s) {
    s = clamp(s, 0, st.routeLen);
    for (const g of st.segs) if (s <= g.s0 + g.L + 0.001) { const u = s - g.s0; return { x: g.ax + g.ux * u, y: g.ay + g.uy * u, ux: g.ux, uy: g.uy }; }
    const g = st.segs[st.segs.length - 1];
    return { x: g.bx, y: g.by, ux: g.ux, uy: g.uy };
  }
  // the way home at a spot: toward the track a little ahead (so pigs off to one side drift back to it)
  function flowAt(st, x, y) {
    const n = nearSeg(st, x, y), a = routeAt(st, n.s + 90);
    const dx = a.x - x, dy = a.y - y, L = Math.hypot(dx, dy) || 1;
    return { x: dx / L, y: dy / L, s: n.s };
  }

  /* ---------- solids ---------- */
  const gateRect = g => ({ x0: g.x0, x1: g.x1, y0: g.y0, y1: g.y1, gate: g });
  const hayRect = h => ({ x0: h.x0, x1: h.x0 + h.w, y0: h.y0, y1: h.y0 + h.h, hay: h });
  function pigSolids(st) {
    const out = st.walls.slice();
    for (const g of st.gates) if (!g.open) out.push(gateRect(g));
    for (const h of st.hays) out.push(hayRect(h));
    return out;
  }
  function playerSolids(st) {
    const out = st.solP.slice();
    for (const h of st.hays) out.push(hayRect(h));
    return out;
  }
  const hit = (a, s) => a.x < s.x1 - 0.01 && a.x + a.w > s.x0 + 0.01 && a.y < s.y1 - 0.01 && a.y + a.h > s.y0 + 0.01;
  function bounds(st, p) {
    if (p.y < PH0.top - 8) { p.y = PH0.top - 8; p.vy = Math.max(0, p.vy); }
    if (p.y + p.h > PH0.bot) { p.y = PH0.bot - p.h; p.vy = Math.min(0, p.vy); }
    if (p.x < 0) { p.x = 0; p.vx = Math.max(0, p.vx); }
    if (p.x + p.w > st.len) { p.x = st.len - p.w; p.vx = Math.min(0, p.vx); }
  }
  // a hay bale tries to sit at its new spot: true if nothing is in the way
  function hayFree(st, h) {
    const r = { x: h.x0, y: h.y0, w: h.w, h: h.h };
    if (r.x < 0 || r.x + r.w > st.len || r.y < PH0.top || r.y + r.h > PH0.bot) return false;
    for (const s of st.walls) if (hit(r, s)) return false;
    for (const z of st.zones) if (hit(r, z) && !(h.slot && z.id === h.zone && h.y0 + h.h * 0.5 < h.slot.cy + 30)) return false;
    for (const q of st.hays) if (q !== h && hit(r, { x0: q.x0, x1: q.x0 + q.w, y0: q.y0, y1: q.y0 + q.h })) return false;
    return true;
  }
  function moveAxis(st, p, d, axis) {
    if (!d) return;
    if (axis === 'x') p.x += d; else p.y += d;
    const P = st.pl[p.id];
    for (const s of playerSolids(st)) {
      if (!hit(p, s)) continue;
      // the gatekeeper rolls a hay bale (along the way they walk into it)
      if (s.hay && p.id === st.keeper && !s.hay.locked) {
        const h = s.hay, side = axis === 'x' ? Math.min(p.y + p.h, s.y1) - Math.max(p.y, s.y0) : Math.min(p.x + p.w, s.x1) - Math.max(p.x, s.x0);
        if (side > 8) {
          const amt = axis === 'x' ? (d > 0 ? p.x + p.w - h.x0 : p.x - (h.x0 + h.w)) : (d > 0 ? p.y + p.h - h.y0 : p.y - (h.y0 + h.h));
          const o = axis === 'x' ? h.x0 : h.y0;
          if (axis === 'x') h.x0 += amt; else h.y0 += amt;
          if (hayFree(st, h)) { h.pushT = 0.15; h.roll += Math.abs(amt); P.pushT = 0.15; if (h.roll - (h.lastSnd || 0) > 30) { h.lastSnd = h.roll; Sfx.play('pigherdHay'); } hayLock(st, h); continue; }
          if (axis === 'x') h.x0 = o; else h.y0 = o;
        }
      }
      if (s.hay && p.id === st.herder && !s.hay.locked && P.heavyCD <= 0) { P.heavyCD = 3; pop(st, p.x + p.w / 2, p.y - 24, 'Too heavy! ' + NAMES[st.keeper] + ' rolls hay', PCOL[st.keeper], 14); }
      if (axis === 'x') { if (d > 0) p.x = Math.min(p.x, s.x0 - p.w); else p.x = Math.max(p.x, s.x1); p.vx = 0; }
      else { if (d > 0) p.y = Math.min(p.y, s.y0 - p.h); else p.y = Math.max(p.y, s.y1); p.vy = 0; }
    }
    bounds(st, p);
  }
  function hayLock(st, h) {
    if (h.locked) return;
    const cx = h.x0 + h.w / 2, cy = h.y0 + h.h / 2;
    if (Math.abs(cx - h.slot.cx) < 36 && Math.abs(cy - h.slot.cy) < 40) {
      h.locked = true; h.x0 = h.slot.cx - h.w / 2; h.y0 = h.slot.cy - h.h / 2; st.progT = 0;
      pop(st, h.slot.cx, h.slot.cy - 50, 'Gap blocked!', C.gold, 22);
      Sfx.play('pigherdThud');
      dust(st, h.slot.cx, h.slot.cy, 14, '#e8c46a');
      // any person standing where the bale landed is nudged out of it
      for (const p of G.players) if (hit(p, hayRect(h))) { p.y = p.y + p.h / 2 < h.slot.cy ? h.y0 - p.h - 1 : h.y0 + h.h + 1; }
    }
  }

  /* ---------- people walking ---------- */
  function inMud(st, x, y) { return st.muds.some(m => ((x - m.x) / m.r) ** 2 + ((y - m.y) / (m.r * 0.6)) ** 2 < 1); }
  function walk(st, p, dt) {
    const P = st.pl[p.id];
    P.pushT -= dt; P.heavyCD -= dt;
    let inp = p.input;
    if (st.state !== 'play' || G.introT > PH0.introHold) inp = NO_INPUT;
    const ix = (inp.right ? 1 : 0) - (inp.left ? 1 : 0), iy = (inp.down ? 1 : 0) - (inp.jump || inp.up ? 1 : 0);
    const n = ix && iy ? Math.SQRT1_2 : 1;
    const mud = inMud(st, p.x + p.w / 2, p.y + p.h - 4);
    const vmax = PH0.walk * (mud ? PH0.mudSlow : 1) * (P.pushT > 0 ? 0.6 : 1);
    const axis = (v, i) => {
      if (i) {
        v += i * (Math.sign(v) === -i ? PH0.dec : PH0.acc) * dt;
        const lim = vmax * n;
        if (Math.abs(v) > lim) v = Math.sign(v) * Math.max(lim, Math.abs(v) - PH0.dec * dt);
      } else v = approach(v, 0, PH0.dec * dt);
      return v;
    };
    p.vx = axis(p.vx, ix); p.vy = axis(p.vy, iy);
    if (ix) p.face = ix;
    moveAxis(st, p, p.vx * dt, 'x');
    moveAxis(st, p, p.vy * dt, 'y');
    p.grounded = true; p.tileGround = true; p.onPartner = false; p.stun = 0;
    // climbing over a shut gate: a little lift (looks only)
    const onGate = st.gates.some(g => !g.open && hit(p, g));
    P.climb = approach(P.climb || 0, onGate ? 1 : 0, dt * 8);
    P.walkT = ix || iy ? (P.walkT || 0) + dt : 0;
    if (mud && (ix || iy) && Math.random() < dt * 6) st.parts.push({ x: p.x + p.w / 2 + (Math.random() - 0.5) * 12, y: p.y + p.h, vx: (Math.random() - 0.5) * 60, vy: -40 - Math.random() * 50, g: 300, t: 0, life: 0.5, r: 2 + Math.random() * 2, kind: 'mud' });
    else if ((ix || iy) && Math.random() < dt * 2.5) st.parts.push({ x: p.x + p.w / 2, y: p.y + p.h, vx: -p.vx * 0.1, vy: -10, g: 0, t: 0, life: 0.5, r: 3, kind: 'dust' });
  }

  /* ---------- the pigs ---------- */
  const free = q => q.state === 'run' || q.state === 'wallow' || q.state === 'ribbon';
  function pigCollide(st, q, sol) {
    const R = PH0.pigR;
    for (const s of sol) {
      if (q.x + R < s.x0 || q.x - R > s.x1 || q.y + R < s.y0 || q.y - R > s.y1) continue;
      const nx = clamp(q.x, s.x0, s.x1), ny = clamp(q.y, s.y0, s.y1);
      let dx = q.x - nx, dy = q.y - ny, d = Math.hypot(dx, dy);
      if (d >= R) continue;
      if (d < 0.001) {
        // (the centre got inside: out the nearest side)
        const l = q.x - s.x0, r = s.x1 - q.x, t = q.y - s.y0, b = s.y1 - q.y, m = Math.min(l, r, t, b);
        if (m === l) { dx = -1; dy = 0; d = -l; } else if (m === r) { dx = 1; dy = 0; d = -r; } else if (m === t) { dx = 0; dy = -1; d = -t; } else { dx = 0; dy = 1; d = -b; }
        q.x += dx * (R - d); q.y += dy * (R - d);
      } else { const ux = dx / d, uy = dy / d; q.x += ux * (R - d); q.y += uy * (R - d); dx = ux; dy = uy; }
      const vn = q.vx * dx + q.vy * dy;
      if (vn < 0) { q.vx -= 1.35 * vn * dx; q.vy -= 1.35 * vn * dy; }
      q.hitT = 0.25;
    }
    if (q.y < PH0.top + R) { q.y = PH0.top + R; q.vy = Math.abs(q.vy) * 0.3; q.hitT = 0.25; }
    if (q.y > PH0.bot - R) { q.y = PH0.bot - R; q.vy = -Math.abs(q.vy) * 0.3; q.hitT = 0.25; }
    if (q.x < R) { q.x = R; q.vx = Math.abs(q.vx) * 0.3; }
    if (q.x > st.len - R) { q.x = st.len - R; q.vx = -Math.abs(q.vx) * 0.3; }
  }
  // the open ways off the track (open side gates, the broken fence while its bale isn't in)
  function openings(st) {
    const out = [];
    for (const g of st.gates) if (g.open && g.zone) out.push({ x: g.cx, y: g.cy, zone: g.zone, gate: g });
    for (const g of st.gates) if (g.open && g.lever && g.lever.a === g) out.push({ x: g.cx, y: g.cy, zone: g.zone || null, gate: g, fork: true });
    for (const h of st.hays) if (!h.locked) out.push({ x: h.slot.cx, y: h.slot.cy, zone: h.zone, hay: h });
    return out;
  }
  function herderXY(st) { const p = G.players[st.herder]; return { x: p.x + p.w / 2, y: p.y + p.h / 2 + 4 }; }
  function pigsStep(st, dt) {
    const sol = pigSolids(st), hp = herderXY(st), opens = openings(st);
    // a gold-ribbon pig caught down the wrong fork when the lever flipped squeezes back through the shut fork gate
    const solR = sol.filter(r => !(r.gate && r.gate.lever && r.gate.lever.a === r.gate));
    const mul = st.oats ? PH0.oatsMul : 1;
    const herderLive = st.state === 'play' && G.introT <= PH0.introHold;
    const fr = st.pigs.filter(q => q.state === 'run' || q.state === 'ribbon');
    for (const q of st.pigs) {
      q.legT += dt * (1 + Math.hypot(q.vx, q.vy) / 40); q.hitT -= dt; q.mudCD -= dt; q.zoneCD -= dt; q.dashT -= dt; q.squealCD -= dt; q.happyT -= dt;
      q.oinkT -= dt;
      if (q.oinkT <= 0) { q.oinkT = 4 + Math.random() * 6; if (q.state !== 'lost' && Math.random() < 0.35 && onScreen(st, q.x, -40)) { pop(st, q.x, q.y - 26, 'oink', '#ffd6e4', 12); } }
      if (q.state === 'pen') { penPig(st, q, dt, sol); continue; }
      if (q.state === 'lost') { lostPig(st, q, dt); continue; }
      if (q.state === 'wallow') {
        // stuck in the mud a long time (both playing): a gold ribbon gets the pig out
        if (bothActive() && st.state === 'play' && G.introT <= PH0.introHold) q.wallowT = (q.wallowT || 0) + dt;
        if (q.wallowT > PH0.mudGoldT) { ribbon(st, q); continue; }
        q.vx *= Math.exp(-6 * dt); q.vy *= Math.exp(-6 * dt);
        q.x += q.vx * dt; q.y += q.vy * dt;
        if (Math.random() < dt * 1.2) st.parts.push({ x: q.x + (Math.random() - 0.5) * 30, y: q.y + 4, vx: 0, vy: -20, g: 0, t: 0, life: 0.8, r: 3, kind: 'bubble' });
        continue;
      }
      let ax = 0, ay = 0;
      const sp = Math.hypot(q.vx, q.vy);
      if (q.state === 'ribbon') {
        // a gold-ribbon pig trots home by itself along the track (it still waits at shut gates)
        const n = nearSeg(st, q.x, q.y), a = routeAt(st, n.s + 70);
        let dx = a.x - q.x, dy = a.y - q.y, L = Math.hypot(dx, dy) || 1;
        if (st.pen && q.x > st.pen.x0 - 90 && Math.abs(q.y - st.pen.cy) < 120) { dx = st.pen.tx - q.x; dy = st.pen.ty - q.y; L = Math.hypot(dx, dy) || 1; }
        const want = PH0.ribbonV;
        q.vx = approach(q.vx, dx / L * want, 600 * dt); q.vy = approach(q.vy, dy / L * want, 600 * dt);
        q.alarm = 0;
      } else {
        // run away from the herder
        const dx = q.x - hp.x, dy = q.y - hp.y, d = Math.hypot(dx, dy) || 1;
        if (herderLive && d < PH0.fleeR) {
          const k = 1 - d / PH0.fleeR;
          ax += dx / d * PH0.fleeA * (0.3 + k * 1.1); ay += dy / d * PH0.fleeA * (0.3 + k * 1.1);
          q.alarm = Math.max(q.alarm, 0.4 + k * 0.6);
          // boxed in by a fence with the herder right there: slip away sideways
          if (q.hitT > 0 && d < 70) { const sx = -dy / d, sy = dx / d, f0 = flowAt(st, q.x, q.y), sgn = sx * f0.x + sy * f0.y >= 0 ? 1 : -1; ax += sx * sgn * 700; ay += sy * sgn * 700; }
        }
        q.alarm = Math.max(0, q.alarm - dt * 0.55);
        const al = q.alarm;
        if (al > 0.05) {
          // running pigs lean toward the way home, and dash for an open gate in front of them
          const f = flowAt(st, q.x, q.y);
          ax += f.x * PH0.flowA * al; ay += f.y * PH0.flowA * al;
          for (const g of st.gates) {
            if (!g.open || g.kind === 'side' || !g.vert) continue;
            const ahead = g.cx - q.x;
            if (ahead < -10 || ahead > 170 || (g.lever && g.lever.a === g)) continue;
            const gy = clamp(q.y, Math.min(g.hy, g.ey) + 18, Math.max(g.hy, g.ey) - 18);
            ay += clamp((gy - q.y) / 40, -1, 1) * PH0.gapA * al;
            ax += PH0.gapA * 0.4 * al;
          }
        }
        // curious: open side gates (and a broken fence) smell of corn, cabbages and pie
        if (q.zoneCD <= 0) for (const o of opens) {
          const ox = o.x - q.x, oy = o.y - q.y, od = Math.hypot(ox, oy) || 1;
          const R = al > 0.05 ? PH0.curiousRunR : PH0.curiousR;
          if (od > R) continue;
          const A = (al > 0.05 ? PH0.curiousRunA : PH0.curiousA) * (o.fork ? 0.5 : 1);
          ax += ox / od * A; ay += oy / od * A;
        }
        // a loose herd: keep near the others, not on top of them
        let cx = 0, cy = 0, cn = 0;
        for (const o of fr) {
          if (o === q) continue;
          const ex = o.x - q.x, ey = o.y - q.y, e = Math.hypot(ex, ey) || 1;
          if (e < PH0.sepR) { ax -= ex / e * 500 * (1 - e / PH0.sepR); ay -= ey / e * 500 * (1 - e / PH0.sepR); }
          if (e < PH0.cohR) { cx += o.x; cy += o.y; cn++; }
        }
        if (cn) { const ex = cx / cn - q.x, ey = cy / cn - q.y, e = Math.hypot(ex, ey) || 1; if (e > 40) { ax += ex / e * PH0.cohA; ay += ey / e * PH0.cohA; } }
        // calm: graze and wander about
        if (al <= 0.05) {
          q.wanderT -= dt;
          if (q.wanderT <= 0) { q.wanderT = 1 + Math.random() * 2.5; q.wander += (Math.random() - 0.5) * 2.4; q.graze = Math.random() < 0.45 ? 1 + Math.random() * 1.5 : 0; }
          if (q.graze > 0) q.graze -= dt;
          else { ax += Math.cos(q.wander) * 60; ay += Math.sin(q.wander) * 60; }
        } else q.graze = 0;
        const fric = al > 0.05 || q.dashT > 0 ? PH0.fricRun : PH0.fricCalm;
        q.vx += ax * dt; q.vy += ay * dt;
        q.vx *= Math.exp(-fric * dt); q.vy *= Math.exp(-fric * dt);
        const cap = (q.dashT > 0 ? PH0.dashMax : al > 0.05 ? PH0.calmMax + (PH0.runMax - PH0.calmMax) * Math.min(1, al * 1.4) : PH0.calmMax) * mul;
        const s2 = Math.hypot(q.vx, q.vy);
        if (s2 > cap) { q.vx *= cap / s2; q.vy *= cap / s2; }
        // a skid: a fast pig turning hard throws up dust
        if (sp > 120 && (ax * q.vx + ay * q.vy) < -0.3 * Math.hypot(ax, ay) * sp && Math.random() < dt * 14) { q.skidT = 0.25; dust(st, q.x, q.y + 8, 1, '#d8c08a'); }
      }
      q.skidT -= dt;
      q.x += q.vx * dt; q.y += q.vy * dt;
      pigCollide(st, q, q.state === 'ribbon' ? solR : sol);
      if (Math.abs(q.vx) > 8) q.face = q.vx > 0 ? 1 : -1;
      // a mud puddle: flop down and wallow
      if (q.state === 'run' && q.mudCD <= 0 && inMud(st, q.x, q.y)) wallow(st, q);
      // off the track: a wrong turn
      if (q.state === 'run' || q.state === 'ribbon') {
        const z = st.zones.find(z2 => q.x > z2.x0 && q.x < z2.x1 && q.y > z2.y0 && q.y < z2.y1);
        if (z && q.state === 'run') lose(st, q, z);
        else if (z) { q.x = z.bx; q.y = z.by; }
      }
      // the pen
      if (st.pen && (q.state === 'run' || q.state === 'ribbon') && q.x > st.pen.x0 + 22 && q.x < st.pen.x1 && q.y > st.pen.y0 && q.y < st.pen.y1) penIn(st, q);
      // no headway for a long time: a gold ribbon (only while both are playing)
      if (q.state === 'run') {
        const s = progress(st, q.x, q.y);
        if (s > q.bestP + 30) { q.bestP = s; q.strayT = 0; }
        else if (bothActive() && st.state === 'play' && !atShutGate(st, q)) q.strayT += dt;
        if (q.strayT > PH0.ribbonT) ribbon(st, q);
      }
    }
    // pigs don't stand on each other
    const all = st.pigs.filter(q => q.state !== 'lost');
    for (let a = 0; a < all.length; a++) for (let b = a + 1; b < all.length; b++) {
      const p1 = all[a], p2 = all[b], dx = p2.x - p1.x, dy = p2.y - p1.y, d = Math.hypot(dx, dy) || 0.01, m = PH0.pigR * 2 - 4;
      if (d >= m) continue;
      const push = (m - d) / 2, ux = dx / d, uy = dy / d;
      const w1 = p1.state === 'wallow' ? 0 : 1, w2 = p2.state === 'wallow' ? 0 : 1;
      if (w1 + w2 === 0) continue;
      p1.x -= ux * push * 2 * w1 / (w1 + w2); p1.y -= uy * push * 2 * w1 / (w1 + w2);
      p2.x += ux * push * 2 * w2 / (w1 + w2); p2.y += uy * push * 2 * w2 / (w1 + w2);
    }
    for (const q of all) if (q.state !== 'pen') pigCollide(st, q, q.state === 'ribbon' ? solR : sol);
  }
  // is the pig waiting at a shut gate the gatekeeper should open? (no ribbon for waiting)
  function atShutGate(st, q) {
    return st.gates.some(g => !g.open && g.kind !== 'side' && Math.abs(g.cx - q.x) < 120 && q.x < g.cx + 10 && Math.abs(g.cy - q.y) < 150);
  }
  function wallow(st, q) {
    q.state = 'wallow'; q.muddy = true; q.alarm = 0; q.wallowT = 0;
    q.vx *= 0.3; q.vy *= 0.3;
    pop(st, q.x, q.y - 30, 'Oink! Mud!', '#c98a52', 18);
    Sfx.play('pigherdMud');
    for (let i = 0; i < 10; i++) st.parts.push({ x: q.x, y: q.y, vx: (Math.random() - 0.5) * 160, vy: -60 - Math.random() * 110, g: 420, t: 0, life: 0.7, r: 2.5 + Math.random() * 2.5, kind: 'mud' });
    if (isCpu(st.herder) && typeof cpuSay === 'function') cpuSay(G.players[st.herder], q.name + ' is in the mud!');
  }
  function lose(st, q, z) {
    q.state = 'lost'; q.zone = z; q.lostT = 0; q.alarm = 0; q.vx = q.vy = 0;
    q.lx = clamp(q.x, z.x0 + 20, z.x1 - 20); q.ly = clamp(q.y, z.y0 + 20, z.y1 - 20);
    st.stats.wrong++; st.secWrong++; z.wrong++;
    // which opening it went through (for the gold gate)
    // (a dead end past a fork: the fork gate the lever has open the wrong way)
    const fork = () => { let best = null, bd = 1e9; for (const lv of st.levers) if (lv.a && lv.a.open) { const d = Math.hypot(clamp(lv.a.cx, z.x0, z.x1) - lv.a.cx, clamp(lv.a.cy, z.y0, z.y1) - lv.a.cy); if (d < bd && d < 900) { bd = d; best = lv.a; } } return best; };
    const g = st.gates.find(g2 => g2.zone === z.id && g2.open) || st.gates.find(g2 => g2.zone === z.id) || fork();
    const h = st.hays.find(h2 => h2.zone === z.id && !h2.locked);
    const where = { corn: 'into the cornfield', pond: 'into the duck pond', veg: 'into the vegetable patch', pie: 'into the pie tent' }[z.kind] || 'off the track';
    news(st, 'Oops! ' + q.name + ' ran ' + where + '!', false, 3.6);
    pop(st, q.lx, q.ly - 26, z.kind === 'pond' ? 'Splash!' : z.kind === 'pie' ? 'Mmm, pie!' : z.kind === 'veg' ? 'Munch!' : 'Wheee!', '#ffffff', 18);
    Sfx.play(z.kind === 'pond' ? 'pigherdSplash' : 'pigherdOops');
    if (z.kind === 'pond') for (let i = 0; i < 12; i++) st.parts.push({ x: q.lx, y: q.ly, vx: (Math.random() - 0.5) * 170, vy: -80 - Math.random() * 120, g: 420, t: 0, life: 0.7, r: 2 + Math.random() * 3, kind: 'drop' });
    const opening = h || g;
    if (opening) {
      opening.wrong++;
      if (opening.wrong >= PH0.goldGate && !opening.gold && bothActive()) {
        opening.gold = true;
        if (h) { h.x0 = h.slot.cx - h.w / 2; h.y0 = h.slot.cy - h.h / 2; h.locked = true; news(st, 'Gold hay! The bale rolls into the gap by itself', true, 5); }
        else if (opening.lever) { setLever(st, opening.lever, true); opening.lever.gold = true; news(st, 'Gold lever! It flips to the right way by itself', true, 5); }
        else { opening.open = false; news(st, 'Gold gate! That side gate shuts itself now', true, 5); }
        st.goldUsed.push('gate'); Sfx.play('pigherdGold');
      }
    }
    if (st.secWrong >= 2 && !st.arrow) showArrow(st, 'Gold arrow! It points at the gate to work next');
  }
  function lostPig(st, q, dt) {
    q.lostT += dt;
    const z = q.zone;
    if (q.lostT > PH0.lostT - 1.1 && z.farmerT < 0) { z.farmerT = 0; z.fq = q; }
    if (q.lostT > PH0.lostT) {
      // Farmer Fran shoos the pig back out onto the track
      q.state = 'run'; q.x = z.bx; q.y = z.by;
      const dx = z.bx - (z.x0 + z.x1) / 2, dy = z.by - (z.y0 + z.y1) / 2, L = Math.hypot(dx, dy) || 1;
      q.vx = dx / L * 200; q.vy = dy / L * 200; q.dashT = 0.6; q.alarm = 0.8; q.zoneCD = PH0.zoneCD; q.strayT = Math.max(0, q.strayT - 10);
      q.zone = null;
      pop(st, z.bx, z.by - 34, 'Shoo, piggy!', '#fff3c4', 20);
      Sfx.play('pigherdShoo');
    }
  }
  function penIn(st, q) {
    q.state = 'pen'; q.alarm = 0; q.gold = q.gold || false; q.happyT = 2;
    st.stats.penned++;
    pop(st, q.x, q.y - 30, q.name + '!', '#ffd6e4', 16);
    Sfx.play('pigherdOink', 0.9 + Math.random() * 0.3);
    const left = st.pigs.filter(o => o.state !== 'pen').length;
    if (left > 0) news(st, q.name + ' is in! ' + left + ' to go', false, 2.6);
    else news(st, 'Every pig is in! ' + NAMES[st.keeper] + ': shut the pen gate!', false, 5);
  }
  function penPig(st, q, dt, sol) {
    const P = st.pen;
    // trot to a place at the trough, then munch
    const k = st.pigs.filter(o => o.state === 'pen').indexOf(q);
    const tx = P.tx - 34 - Math.floor(k / 3) * 34, ty = P.ty - 40 + (k % 3) * 40;
    const dx = tx - q.x, dy = ty - q.y, d = Math.hypot(dx, dy);
    const want = d > 6 ? Math.min(90, d * 3) : 0;
    q.vx = approach(q.vx, d ? dx / d * want : 0, 500 * dt); q.vy = approach(q.vy, d ? dy / d * want : 0, 500 * dt);
    q.x += q.vx * dt; q.y += q.vy * dt;
    pigCollide(st, q, sol);
    if (q.x < P.x0 + 20) q.x = P.x0 + 20;
    if (d < 8) q.face = 1;
    else if (Math.abs(q.vx) > 8) q.face = q.vx > 0 ? 1 : -1;
  }
  function ribbon(st, q) {
    const mud = q.state === 'wallow';
    q.state = 'ribbon'; q.gold = true; q.strayT = 0; q.wallowT = 0; q.mudCD = 99;
    st.stats.ribbons++;
    if (!st.ribbonUsed) { st.ribbonUsed = true; st.goldUsed.push('ribbon'); }   // (one gold help a chase, however many pigs)
    news(st, 'Gold ribbon! ' + q.name + (mud ? ' hops out of the mud and trots home' : ' trots home by herself'), true, 5);
    pop(st, q.x, q.y - 30, 'Gold ribbon!', C.gold, 18);
    Sfx.play('pigherdGold');
  }

  /* ---------- the herder: clap ---------- */
  function clap(st, p) {
    const P = st.pl[p.id];
    if (P.cd > 0) return;
    P.cd = PH0.clapCD; P.clapT = 0; st.stats.claps[p.id]++;
    Sfx.play('pigherdClap', 0.95 + Math.random() * 0.1);
    const hp = herderXY(st);
    st.rings.push({ x: hp.x, y: hp.y, t: 0 });
    let any = false;
    for (const q of st.pigs) {
      const dx = q.x - hp.x, dy = q.y - hp.y, d = Math.hypot(dx, dy) || 1;
      if (q.state === 'wallow' && d < PH0.wallowNear) {
        q.state = 'run'; q.mudCD = PH0.mudCD; q.vx = dx / d * PH0.clapV; q.vy = dy / d * PH0.clapV; q.dashT = 0.5; q.alarm = 1;
        pop(st, q.x, q.y - 30, 'Squeal!', '#ffd6e4', 16); any = true; st.progT = 0;
        for (let i = 0; i < 8; i++) st.parts.push({ x: q.x, y: q.y, vx: (Math.random() - 0.5) * 140, vy: -50 - Math.random() * 90, g: 400, t: 0, life: 0.6, r: 2 + Math.random() * 2, kind: 'mud' });
        continue;
      }
      if (q.state === 'wallow' && d < PH0.clapR && P.mudHintCD <= 0) { P.mudHintCD = 3; pop(st, q.x, q.y - 30, 'Come closer!', '#ffe9a8', 14); }
      if (q.state !== 'run' || d > PH0.clapR) continue;
      const k = 1 - d / PH0.clapR * 0.45;
      q.vx += dx / d * PH0.clapV * k; q.vy += dy / d * PH0.clapV * k; q.dashT = 0.55; q.alarm = 1;
      if (q.squealCD <= 0 && Math.random() < 0.35) { q.squealCD = 2; pop(st, q.x, q.y - 26, 'Wee!', '#ffd6e4', 14); }
      any = true;
    }
    if (any) Sfx.play('pigherdSqueal');
  }

  /* ---------- the gatekeeper: gates, levers, the barn door ---------- */
  function gateDist(g, x, y) {
    const nx = clamp(x, Math.min(g.hx, g.ex), Math.max(g.hx, g.ex)), ny = clamp(y, Math.min(g.hy, g.ey), Math.max(g.hy, g.ey));
    return dist(x, y, nx, ny);
  }
  // the gate or lever the gatekeeper can work from where they stand (or null)
  function reachable(st, p) {
    const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
    let best = null, bd = PH0.gateReach;
    for (const lv of st.levers) { const d = dist(cx, cy, lv.x, lv.y) - 6; if (d < bd) { bd = d; best = { lever: lv }; } }
    for (const g of st.gates) {
      if (g.lever) continue;   // (fork gates only move with their lever)
      const d = gateDist(g, cx, cy);
      if (d < bd) { bd = d; best = { gate: g }; }
    }
    return best;
  }
  const pigInGate = (st, g) => st.pigs.some(q => q.state !== 'lost' && q.x + PH0.pigR > g.x0 - 4 && q.x - PH0.pigR < g.x1 + 4 && q.y + PH0.pigR > g.y0 - 4 && q.y - PH0.pigR < g.y1 + 4);
  function setLever(st, lv, right) {
    const was = lv.b.open;
    lv.b.open = right; lv.a.open = !right;
    if (was !== right) { lv.t = 0; Sfx.play('pigherdLever'); }
  }
  function keeper(st, p, dt) {
    const P = st.pl[p.id];
    P.noCD -= dt;
    if (!p.pendingAct) return;
    p.pendingAct = false;
    if (st.state !== 'play' || G.introT > PH0.introHold) return;
    P.armT = 0.3;
    const r = reachable(st, p), cx = p.x + p.w / 2;
    if (!r) { if (P.noCD <= 0) { P.noCD = 1.4; pop(st, cx, p.y - 26, 'No gate here', '#fff3c4', 14); Sfx.play('pigherdNo'); } return; }
    if (r.lever) {
      const lv = r.lever, right = !lv.b.open;
      if (lv.gold) { pop(st, lv.x, lv.y - 34, 'Gold lever: this way!', C.gold, 15); return; }
      if (!right && pigInGate(st, lv.b)) { pop(st, lv.x, lv.y - 34, 'Piggy in the way!', '#ffe9a8', 15); Sfx.play('pigherdNo'); return; }
      if (right && pigInGate(st, lv.a)) { pop(st, lv.x, lv.y - 34, 'Piggy in the way!', '#ffe9a8', 15); Sfx.play('pigherdNo'); return; }
      setLever(st, lv, right);
      st.stats.gates[p.id]++; st.progT = 0;
      pop(st, lv.x, lv.y - 36, right ? 'This way!' : 'Click!', right ? C.gold : '#fff3c4', 18);
      return;
    }
    const g = r.gate;
    if (g.gold && st.state === 'play') { pop(st, g.cx, g.cy - 40, g.open ? 'Gold gate: open!' : 'Gold gate: shut!', C.gold, 15); return; }
    if (g.kind === 'barn') {
      if (g.open) { g.openT = PH0.barnT; pop(st, g.cx, g.y0 - 20, 'Still open!', '#fff3c4', 15); return; }
      g.open = true; g.openT = PH0.barnT; st.stats.gates[p.id]++; st.progT = 0;
      pop(st, g.cx, g.y0 - 20, 'Barn door open!', C.gold, 18); Sfx.play('pigherdBarn');
      return;
    }
    if (g.open) {
      if (pigInGate(st, g)) { pop(st, g.cx, g.cy - 40, 'Piggy in the way!', '#ffe9a8', 15); Sfx.play('pigherdNo'); return; }
      g.open = false; g.t = 0; st.stats.gates[p.id]++; st.progT = 0;
      Sfx.play('pigherdLatch');
      if (g.kind === 'pen' && st.pigs.every(q => q.state === 'pen')) allIn(st);
      else pop(st, g.cx, g.cy - 40, g.kind === 'side' ? 'Shut!' : 'Click!', g.kind === 'side' ? C.gold : '#fff3c4', 18);
    } else {
      g.open = true; g.t = 0; st.stats.gates[p.id]++; st.progT = 0;
      Sfx.play('pigherdGate');
      pop(st, g.cx, g.cy - 40, g.kind === 'side' ? 'Oops, open!' : 'Open!', g.kind === 'side' ? '#ffe9a8' : C.gold, 18);
    }
  }
  function gatesStep(st, dt) {
    for (const g of st.gates) {
      g.t += dt;
      if (g.kind === 'barn' && g.open && !g.gold) {
        g.openT -= dt;
        if (g.openT <= 0) {
          if (pigInGate(st, g)) g.openT = 0.3;
          else { g.open = false; g.t = 0; Sfx.play('pigherdBarn'); pop(st, g.cx, g.y0 - 20, 'Door shut', '#fff3c4', 14); }
        }
      }
      g.anim = approach(g.anim, g.open ? 1 : 0, dt * (g.kind === 'barn' ? 2.6 : 4.5));
    }
    for (const lv of st.levers) lv.t += dt;
    for (const h of st.hays) h.pushT -= dt;
    for (const z of st.zones) if (z.farmerT >= 0) { z.farmerT += dt; if (z.farmerT > 2.4) z.farmerT = -1; }
  }
  function allIn(st) {
    st.state = 'clear'; st.clearT = 0; st.news = null;
    st.stats.chaseT[st.k] = G.time - st.segStart;
    const P = st.pen;
    st.pops = [];   // (the big "All in!" says it all: no old pops on top of it)
    Sfx.play(st.final ? 'pigherdWin' : 'pigherdAllIn');
    for (const q of st.pigs) q.happyT = 3;
    if (!st.final) for (let i = 0; i < 34; i++) confetti(P.x0 + (P.x1 - P.x0) / 2, P.y0 + 20);
    else { st.state = 'end'; st.endT = 0; st.stats.time = G.time; }
  }

  /* ---------- the plan: where the herd is, what each job does next ---------- */
  function herd(st) {
    const fr = st.pigs.filter(q => q.state === 'run' || q.state === 'wallow');
    const all = st.pigs.filter(q => q.state !== 'pen');
    const L = fr.length ? fr : all.filter(q => q.state !== 'lost');
    if (!L.length) return { n: 0, cx: st.pen ? st.pen.x0 - 60 : st.len - 200, cy: 300, minX: st.len, maxX: st.len, minS: st.routeLen, maxS: st.routeLen, s: st.routeLen, pigs: [], lost: all.filter(q => q.state === 'lost').length, left: all.length };
    let cx = 0, cy = 0, minX = 1e9, maxX = -1e9, minS = 1e9, maxS = -1e9, ss = [];
    for (const q of L) { cx += q.x; cy += q.y; minX = Math.min(minX, q.x); maxX = Math.max(maxX, q.x); const s = progress(st, q.x, q.y); q.s = s; ss.push(s); minS = Math.min(minS, s); maxS = Math.max(maxS, s); }
    ss.sort((a, b) => a - b);
    return { n: L.length, cx: cx / L.length, cy: cy / L.length, minX, maxX, minS, maxS, s: ss[Math.floor(ss.length / 2)], pigs: L, lost: all.filter(q => q.state === 'lost').length, left: all.length };
  }
  function jobDone(st, j, hd) {
    const passed = hd.n > 0 ? st.pigs.every(q => q.state === 'pen' ? true : q.state === 'lost' ? false : q.x > j.passX) : true;
    if (j.kind === 'shut') return !j.gate.open || (passed && !st.pigs.some(q => q.state === 'lost' && q.zone && q.zone.id === j.gate.zone));
    if (j.kind === 'hay') return j.hay.locked || passed;
    if (j.kind === 'lever') return j.lever.b.open || passed;
    if (j.kind === 'open') return j.gate.open || passed;
    if (j.kind === 'barn') return passed;
    if (j.kind === 'pen') return st.state !== 'play';
    return true;
  }
  function plan(st) {
    const hd = herd(st);
    const job = st.jobs.find(j => !jobDone(st, j, hd)) || null;
    // a shut gate (or the wrong fork) the herd is up against: the herder waits for it
    let block = null;
    for (const g of st.gates) {
      const shut = g.lever ? (g.lever.b === g && !g.open) : (!g.open && (g.kind === 'fwd' || g.kind === 'barn' || g.kind === 'pen'));
      if (!shut) continue;
      if (g.kind === 'pen' && st.pigs.every(q => q.state === 'pen')) continue;
      const ahead = g.cx - hd.maxX;
      if (ahead > -30 && ahead < 260 && hd.n && g.cx > hd.minX - 40) { if (!block || g.cx < block.cx) block = g; }
    }
    // the place the herd is driven toward: along the track ahead of it
    const goal = routeAt(st, hd.s + 220);
    if (st.pen && hd.s > st.routeLen - 380) { goal.x = st.pen.tx; goal.y = st.pen.ty; }
    return { herd: hd, job, block, goal };
  }

  /* ---------- gold help and hints ---------- */
  // playing: pressed something in the last 10 s. In 2-player a gatekeeper waiting by a gate counts as playing for
  // 90 s (standing still is part of that job); in 1-player the person must keep pressing, so the computer can't win alone
  function active(id) {
    if ((typeof cpuOn === 'function' && cpuOn(id)) || typeof CPU === 'undefined') return true;
    const st = G.mst, waitT = !solo() && st && id === st.keeper ? PH0.keeperWaitT : PH0.activeT;
    return CPU.idle[id] < waitT;
  }
  function bothActive() { return active(0) && active(1); }
  function showArrow(st, say) {
    if (st.arrow || !bothActive()) return;
    st.arrow = true; st.goldUsed.push('arrow');
    news(st, say, true, 5);
    Sfx.play('pigherdGold');
  }
  function help(st, dt, pl) {
    if (st.state !== 'play' || G.introT > PH0.introHold) return;
    const both = bothActive();
    if (both) st.chaseActT += dt;
    // a gate job waiting long with the herd near: the gold arrow
    const j = pl.job;
    if (j && both && pl.herd.n && pl.herd.maxX > j.x - 450) { j.pendT += dt; if (j.pendT > PH0.arrowT && !st.arrow && j.kind !== 'pen') showArrow(st, 'Gold arrow! It shows ' + NAMES[st.keeper] + ' the gate to work next'); }
    // the herd waiting a long time at a shut way (both playing): a gold gate opens it and stays open
    const b = pl.block;
    if (b && both && !b.gold) {
      b.blockT += dt;
      if (b.blockT > PH0.blockGoldT) goldOpen(st, b);
    }
    // every pig in, and the pen gate still open: it shuts itself (gold) after a while
    if (st.pen && st.pen.gate.open && st.pigs.every(q => q.state === 'pen')) {
      if (both) st.penWaitT += dt;
      if (st.penWaitT > (st.pen.gate.gold ? 1.2 : PH0.penGoldT)) {
        if (!st.pen.gate.gold) { st.pen.gate.gold = true; st.goldUsed.push('gate'); }
        st.pen.gate.open = false; st.pen.gate.t = 0; Sfx.play('pigherdLatch');
        allIn(st);
        return;
      }
    } else st.penWaitT = 0;
    // gold oats: a long chase, or a herder far from the pigs
    const hp = herderXY(st), near = pl.herd.pigs.reduce((m, q) => Math.min(m, dist(q.x, q.y, hp.x, hp.y)), 1e9);
    if (both && pl.herd.n && near > PH0.farD) st.farT += dt;
    if (!st.oats && both && (st.chaseActT > PH0.oatsT || st.farT > PH0.farT)) {
      st.oats = true; st.goldUsed.push('oats');
      news(st, 'Gold oats! The pigs are full and trot slower now', true, 5);
      Sfx.play('pigherdGold');
    }
    // a hint after a while with no progress
    st.progT += dt;
    if (st.progT > 24 && !awayFor(10)) {
      st.progT = 0;
      for (const id of [st.herder, st.keeper].filter(i => !isCpu(i))) {
        const jb = job(st, id), tx = jb && jobText(st, id, jb);
        if (tx && tx[0]) { news(st, 'Hint for ' + NAMES[id] + ': ' + tx[0], true, 5); break; }
      }
    }
  }
  // a gold gate: the shut way the herd is waiting at opens by itself and stays open
  function goldOpen(st, g) {
    g.gold = true; st.goldUsed.push('gate'); st.progT = 0;
    if (g.lever) { setLever(st, g.lever, true); g.lever.gold = true; g.lever.a.gold = false; }
    else { g.open = true; g.t = 0; g.openT = PH0.barnT; }
    news(st, g.kind === 'barn' ? 'Gold barn door! It stays open for the pigs' : g.kind === 'pen' ? 'Gold pen gate! It opens for the pigs' : g.lever ? 'Gold lever! It flips to the right way by itself' : 'Gold gate! It opens by itself', true, 5);
    pop(st, g.cx, g.cy - 44, 'Gold gate!', C.gold, 22);
    Sfx.play('pigherdGold');
  }
  function news(st, s, gold, life) { st.news = { s, gold: !!gold, t: 0, life: life || PH0.newsLife }; }
  function pop(st, x, y, s, col, size) { st.pops.push({ x, y, s, col: col || C.gold, size: size || 18, t: 0 }); if (st.pops.length > 14) st.pops.shift(); }
  function dust(st, x, y, n, col) { for (let i = 0; i < n; i++) st.parts.push({ x: x + (Math.random() - 0.5) * 20, y: y + (Math.random() - 0.5) * 8, vx: (Math.random() - 0.5) * 70, vy: -20 - Math.random() * 30, g: 0, t: 0, life: 0.6 + Math.random() * 0.3, r: 4 + Math.random() * 4, kind: 'dust', col }); }

  // what each player should do now (the chips over the heads and the stuck hint)
  const wx = (st, p) => p.x + p.w / 2 + (st.inTick ? 0 : st.camX);
  const wy = p => p.y + p.h / 2;
  function job(st, id) {
    if (st.state !== 'play') return null;
    const p = G.players[id], pl = plan(st), hd = pl.herd, x = wx(st, p), y = wy(p);
    if (id === st.herder) {
      const mud = st.pigs.find(q => q.state === 'wallow');
      if (mud) return dist(x, y, mud.x, mud.y) < PH0.wallowNear - 10 ? { k: 'clapMud', q: mud } : { k: 'toMud', q: mud };
      if (!hd.n) return hd.lost ? { k: 'waitLost' } : null;
      if (pl.block) return { k: 'waitGate', g: pl.block };
      if (st.pen && hd.s > st.routeLen - 420) return { k: 'pen' };
      const behind = progress(st, x, y) < hd.minS - 10;
      if (!behind) return { k: 'getBehind' };
      const near = hd.pigs.some(q => dist(q.x, q.y, x, y) < PH0.clapR);
      return near ? { k: 'push' } : { k: 'closer' };
    }
    // the gatekeeper
    const j = pl.job;
    if (!j) return null;
    const tgt = j.lever ? { x: j.lever.x, y: j.lever.y } : j.hay ? { x: j.hay.x0 + j.hay.w / 2, y: j.hay.y0 + j.hay.h / 2 } : { x: j.gate.cx, y: j.gate.cy };
    const r = reachable(st, Object.assign({}, p, { x: x - p.w / 2 }));
    const at = r && ((j.lever && r.lever === j.lever) || (j.gate && r.gate === j.gate));
    if (j.kind === 'hay') return { k: 'hay' };
    if (j.kind === 'pen') {
      const allPen = st.pigs.every(q => q.state === 'pen');
      if (allPen) return at ? { k: 'penShut' } : { k: 'toPenShut' };
      if (j.gate.open) return { k: 'waitPen' };
      return at ? { k: 'penOpen' } : { k: 'toPen' };
    }
    if (j.kind === 'barn') {
      if (j.gate.open) return { k: 'barnOpen' };
      const near = hd.maxX > j.x - 230;
      return at ? (near ? { k: 'barnNow' } : { k: 'barnWait' }) : { k: 'toBarn' };
    }
    if (!at) return { k: dist(x, y, tgt.x, tgt.y) > 260 ? 'run' : 'toGate', what: j.kind };
    return { k: j.kind === 'shut' ? 'shut' : j.kind === 'lever' ? 'lever' : 'open' };
  }
  function jobText(st, id, j) {
    const o = id === st.herder ? st.keeper : st.herder, nm = NAMES[o], a = key(id, 'act');
    const cpuO = isCpu(o);
    switch (j.k) {
      case 'clapMud': return ['Press ' + a + ': clap!', 'Get ' + j.q.name + ' out of the mud'];
      case 'toMud': return [j.q.name + ' is in the mud!', 'Go close, then clap'];
      case 'waitLost': return ['Wait: Farmer Fran is coming', 'She shoos the pig back out'];
      case 'waitGate': return [cpuO ? nm + ' opens the gate...' : 'Wait for ' + nm + ' to open the gate', 'Keep the pigs together'];
      case 'pen': return ['Into the pen they go!', 'Walk behind them'];
      case 'getBehind': return ['Get behind the pigs!', 'They run away from you'];
      case 'closer': return ['Walk toward the pigs ▶', 'They run the other way'];
      case 'push': return ['Push them along ▶', 'Clap ' + a + ' to send them running'];
      case 'hay': return ['Roll the hay into the gap!', 'Walk into the bale to push it'];
      case 'penOpen': return ['Press ' + a + ': open the pen!', 'Let the pigs in'];
      case 'toPen': return ['Run to the pen gate ▶', 'Open it for the pigs'];
      case 'waitPen': return ['Wait by the pen gate', 'Shut it when every pig is in'];
      case 'penShut': return ['Press ' + a + ': shut the pen!', 'Every pig is in!'];
      case 'toPenShut': return ['All in! Shut the pen gate!', 'Stand by the gate'];
      case 'barnOpen': return ['The barn door is open!', 'It shuts again soon'];
      case 'barnNow': return ['Press ' + a + ': open the barn door!', 'The pigs are here!'];
      case 'barnWait': return ['Wait by the barn door', 'Open it when the pigs come'];
      case 'toBarn': return ['Run to the barn door ▶', ''];
      case 'run': return ['Run ahead to the next gate ▶', 'Look for the gold sparkle'];
      case 'toGate': return [j.what === 'shut' ? 'Shut the side gate!' : j.what === 'lever' ? 'Pull the lever!' : 'Open the gate!', 'Stand next to it'];
      case 'shut': return ['Press ' + a + ': shut the side gate!', 'Keep the pigs on the track'];
      case 'lever': return ['Press ' + a + ': pull the lever!', 'Open the right way'];
      case 'open': return ['Press ' + a + ': open the gate!', 'Let the pigs through'];
      default: return null;
    }
  }

  /* ---------- the camera, the leash, the rest ---------- */
  function camera(st, dt, snap) {
    const xs = G.players.map(p => wx(st, p));
    const pl = st.state === 'play' ? plan(st) : null;
    let focus = (xs[0] + xs[1]) / 2;
    if (pl && pl.herd.n) focus = focus * 0.45 + pl.herd.cx * 0.55;
    let tx = focus - W / 2 + 60;
    if (st.state !== 'play' && st.pen) tx = (st.pen.x0 + st.pen.x1) / 2 - W / 2;
    tx = clamp(tx, 0, Math.max(0, st.len - W));
    const lo = Math.min(xs[0], xs[1]), hi = Math.max(xs[0], xs[1]);
    tx = Math.min(tx, lo - 60); tx = Math.max(tx, hi + 60 - W);
    tx = clamp(tx, 0, Math.max(0, st.len - W));
    st.camX = snap ? tx : st.camX + (tx - st.camX) * Math.min(1, dt * 3.5);
  }
  function leash(st, xb) {
    for (const p of G.players) {
      const o = G.players[1 - p.id];
      if (Math.abs(p.x - o.x) <= PH0.leash) continue;
      if (Math.abs(p.x - o.x) <= Math.abs(xb[p.id] - o.x)) continue;
      // the herder going back for a straggler pulls the gatekeeper gently along (never the other way round, so a
      // gatekeeper waiting by the pen can't stop the herder fetching a pig from far behind)
      if (p.id === st.herder) {
        const want = p.x - o.x > 0 ? p.x - PH0.leash : p.x + PH0.leash;
        moveAxis(st, o, want - o.x, 'x');
        if (Math.abs(p.x - o.x) <= PH0.leash + 0.5) { const Q = st.pl[o.id]; if (Q.waitCD <= 0) { Q.waitCD = 3.5; pop(st, o.x + o.w / 2, o.y - 26, 'Come on, ' + NAMES[o.id] + '!', PCOL[p.id], 16); } continue; }
      }
      p.x = xb[p.id]; p.vx = 0;
      const P = st.pl[p.id];
      if (P.waitCD <= 0) {
        P.waitCD = 3.5;
        pop(st, p.x + p.w / 2, p.y - 26, 'Wait for ' + NAMES[o.id] + '!', PCOL[o.id], 16);
        if (typeof cpuSay === 'function' && cpuOn(o.id)) cpuSay(o, 'Wait for me!');
      }
    }
  }
  function awayFor(s) {
    if (typeof CPU === 'undefined') return false;
    const ppl = [0, 1].filter(id => !cpuOn(id));
    return ppl.length > 0 && ppl.every(id => CPU.idle[id] > s);
  }
  function restStep(st, dt) {
    st.rest = awayFor(PH0.idleRest) && st.state === 'play' && G.introT <= 0;
    if (st.rest) G.time -= dt;   // the clock waits for people who stopped to rest
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
    for (const q of st.parts) { q.t += dt; q.vy += (q.g || 0) * dt; q.x += q.vx * dt; q.y += q.vy * dt; }
    st.parts = st.parts.filter(q => q.t < q.life);
    if (st.parts.length > 260) st.parts.splice(0, st.parts.length - 260);
    for (const r of st.rings) r.t += dt;
    st.rings = st.rings.filter(r => r.t < 0.5);
  }
  function tick(st, dt) {
    const ps = G.players;
    st.tick++; st.t += dt;
    fx(st, dt);
    for (const id of [0, 1]) { const P = st.pl[id]; P.cd = Math.max(0, P.cd - dt); P.clapT += dt; P.armT -= dt; P.mudHintCD -= dt; P.waitCD -= dt; }
    if (st.state === 'clear' || st.state === 'end') {
      for (const p of ps) { p.pendingAct = false; p.pendingJump = false; walk(st, p, dt); }
      gatesStep(st, dt); pigsStep(st, dt);
      if (st.state === 'clear') {
        st.clearT += dt;
        if (Math.random() < dt * 6) confetti(st.pen.x0 + Math.random() * (st.pen.x1 - st.pen.x0), st.pen.y0);
        if (st.clearT >= PH0.clearT) st.goNext = true;
      } else endStep(st, dt);
      camera(st, dt);
      return;
    }
    if (G.introT > PH0.introHold) { for (const p of ps) { p.pendingAct = false; p.pendingJump = false; } gatesStep(st, dt); pigsStep(st, dt); camera(st, dt); return; }
    if (!st.started) { st.started = true; if (st.room.news) news(st, st.room.news, false, 5); }
    restStep(st, dt);
    // the herder claps
    const hp = ps[st.herder];
    if (hp.pendingAct) { hp.pendingAct = false; clap(st, hp); }
    keeper(st, ps[st.keeper], dt);
    const xb = ps.map(p => p.x);
    for (const p of ps) walk(st, p, dt);
    leash(st, xb);
    gatesStep(st, dt);
    pigsStep(st, dt);
    for (const p of ps) p.pendingJump = false;
    const pl = plan(st);
    help(st, dt, pl);
    camera(st, dt);
  }
  // the fair: the pigs win the Best Pigs ribbon, then the results
  function endStep(st, dt) {
    st.endT += dt;
    const P = st.pen;
    if (Math.random() < dt * 12) confetti(P.x0 + Math.random() * (P.x1 - P.x0), P.y0 - 10);
    if (st.endT >= PH0.finT && !st.cleared) {
      st.cleared = true;
      G.level.goal = { x: (P.x0 + P.x1) / 2, y: P.y0 + 40 };   // (world x: the tick moves new particles on screen)
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
      const word = id => (id < 0 ? 'clap / gate' : id === st.herder ? 'clap' : 'gate');
      let changed = false;
      for (const o of labelEls) { const want = word(o.id); if (o.el.textContent !== want) { o.el.textContent = want; changed = true; } }
      if (changed && typeof fitActLabels === 'function') fitActLabels();
    } catch (e) { /* labels stay as the framework set them */ }
  }

  /* ---------- a chase (room) ---------- */
  function room(st, L, k) {
    const def = L.def;
    st.k = k; st.room = def; st.final = k === (def.roomCount || 1) - 1;
    st.herder = def.herder || 0; st.keeper = 1 - st.herder; st.look = def.look || 'farm';
    compile(st, def);
    st.parts = []; st.pops = []; st.rings = []; st.news = null;
    st.state = 'play'; st.goNext = false; st.clearT = 0; st.endT = 0; st.started = false; st.progT = 0; st.segStart = G.time;
    st.secWrong = 0; st.arrow = false; st.oats = false; st.ribbonUsed = false; st.penWaitT = 0; st.chaseActT = 0; st.farT = 0; st.t = 0; st.rest = false;
    st.stats.pigsAll = st.stats.penned + st.pigs.length;   // (the pigs of the chases played so far)
    st.pl = [0, 1].map(() => ({ cd: 0, clapT: 9, armT: 0, noCD: 0, waitCD: 0, mudHintCD: 0, heavyCD: 0, pushT: 0, chipKey: '', chipAt: 0, walkT: 0, climb: 0 }));
    const sx = [], sy = [];
    sx[st.herder] = 110; sy[st.herder] = 300; sx[st.keeper] = 200; sy[st.keeper] = def.keeperY || 380;
    G.players.forEach((p, i) => {
      const input = p.input;
      Object.assign(p, makePlayer(i), { x: sx[i] - PW / 2, y: sy[i] - PH / 2, face: 1, input, prevJump: true, prevAct: true });
    });
    st.camX = 0;
    st.inTick = true; camera(st, 0, true); st.inTick = false;
    for (const p of G.players) p.x -= st.camX;
    actLabels(st);
  }
  function setup(st, L) {
    st.stats = { claps: [0, 0], gates: [0, 0], wrong: 0, penned: 0, ribbons: 0, pigsAll: 0, time: 0, chaseT: [] };
    st.goldUsed = []; st.tick = 0;
    room(st, L, 0);
  }
  function medalOf(st) {
    const s = st.stats, t = s.time || G.time, help = st.goldUsed.length;
    return t <= 225 && s.wrong <= 3 && help <= 1 ? 'Gold' : t <= 345 && s.wrong <= 9 ? 'Silver' : 'Bronze';
  }

  MODES.pigherd = {
    PH: PH0,
    plan, herd, progress, routeAt, flowAt, nearSeg, reachable, pigSolids, playerSolids, job, jobText, medalOf, openings, wx, jobDone, inMud,
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
      const medal = medalOf(st);
      const words = s.wrong === 0 ? 'Not one wrong turn! Super herding and gates!' : s.wrong <= 3 ? 'Clap, chase, open, shut: lovely teamwork!' : 'A few runaway snacks, and every pig got home!';
      const names = ['Barnyard', 'Duck Pond', 'Cornfield Maze', 'Fairground'];
      let best = -1;
      s.chaseT.forEach((v, i) => { if (v != null && (best < 0 || v < s.chaseT[best])) best = i; });
      const bestLine = best >= 0 ? ' Quickest chase: ' + ((LEVELS[G.levelIndex].rooms || [])[best] || { title: names[best] }).title + ' ' + fmtTime(s.chaseT[best]) + '.' : '';
      const goldNames = { ribbon: 'Gold ribbon', arrow: 'Gold arrow', gate: 'Gold gate', oats: 'Gold oats' };
      const gold = st.goldUsed.length ? ' Gold help: ' + [...new Set(st.goldUsed.map(k => goldNames[k] || 'Gold'))].join(', ') + '.' : '';
      return [
        { label: 'Pigs penned', value: s.penned + ' of ' + s.pigsAll },
        { label: 'Wrong turns', value: s.wrong },
        { label: 'Gold help', value: st.goldUsed.length },
        { label: 'Medal', value: medal },
        words + bestLine + ' Claps: Pip ' + s.claps[0] + ', Bo ' + s.claps[1] + '.' + gold,
      ];
    },
  };

  /* ===================================== drawing ===================================== */
  const LOOK = {
    farm: { grass: '#8fd264', grass2: '#86ca5c', track: '#e2c58c', trackE: '#c9a96a', hedge: '#4f9a42', hedgeD: '#3d7f34' },
    pond: { grass: '#90d66e', grass2: '#87ce66', track: '#e6cc96', trackE: '#c9ad74', hedge: '#4a9a4a', hedgeD: '#387c38' },
    corn: { grass: '#a2d066', grass2: '#99c75e', track: '#e8c98a', trackE: '#ccaa66', hedge: '#6a9a34', hedgeD: '#557d28' },
    fair: { grass: '#92d870', grass2: '#89d068', track: '#efd6a0', trackE: '#d2b478', hedge: '#4f9f4f', hedgeD: '#3c823c' },
  };
  const lookOf = st => LOOK[st.look] || LOOK.farm;
  function onScreen(st, x, pad = 120) { return x > st.camX - pad && x < st.camX + W + pad; }

  function drawWorld(st) {
    const t = G.clock, lk = lookOf(st);
    // the grass (mown stripes stuck to the world)
    ctx.fillStyle = lk.grass; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.translate(-st.camX, 0);
    ctx.fillStyle = lk.grass2;
    for (let x = Math.floor(st.camX / 120) * 120 - 120; x < st.camX + W + 120; x += 120) ctx.fillRect(x, PH0.top, 60, PH0.bot - PH0.top);
    // grass tufts and flowers
    for (let k = Math.floor(st.camX / 90) - 1; k < Math.floor(st.camX / 90) + 13; k++) {
      const h = hash(k, 31), x = k * 90 + (h % 70), y = PH0.top + 14 + ((h >> 8) % (PH0.bot - PH0.top - 28));
      ctx.strokeStyle = 'rgba(60,130,50,0.5)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 3, y - 7); ctx.moveTo(x + 3, y); ctx.lineTo(x + 4, y - 8); ctx.stroke();
      if (h % 4 === 0) { ctx.fillStyle = ['#fff7a8', '#ffffff', '#ffb3d1'][h % 3]; circle(x + 12, y - 3, 2.6); ctx.fill(); ctx.fillStyle = '#f2b23a'; circle(x + 12, y - 3, 1.1); ctx.fill(); }
    }
    // the farm track (a dirt path along the route)
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = lk.trackE; ctx.lineWidth = 104; drawRoute(st);
    ctx.strokeStyle = lk.track; ctx.lineWidth = 92; drawRoute(st);
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 3; ctx.setLineDash([10, 22]); drawRoute(st); ctx.setLineDash([]);
    // pebbles on the track
    for (let k = Math.floor(st.camX / 60) - 1; k < Math.floor(st.camX / 60) + 18; k++) {
      const h = hash(k, 77), s = (k * 60 + (h % 40)), pt = routeAtX(st, s);
      if (!pt) continue;
      ctx.fillStyle = 'rgba(150,120,70,0.35)'; circle(pt.x + ((h >> 6) % 30) - 15, pt.y + ((h >> 10) % 60) - 30, 2 + h % 2); ctx.fill();
    }
    for (const z of st.zones) if (z.x1 > st.camX - 40 && z.x0 < st.camX + W + 40) drawZone(st, z, t);
    for (const m of st.muds) if (onScreen(st, m.x)) drawMud(m, t);
    if (st.pen) drawPenFloor(st, st.pen, t);
    for (const dc of st.decor) if (onScreen(st, dc.x, 200) && !dc.o.top) drawDecor(st, dc, t);
    // walls and fences: shadows first, then the wood
    for (const s of st.walls) if (s.x1 > st.camX - 60 && s.x0 < st.camX + W + 60 && s.look === 'fence') { ctx.fillStyle = 'rgba(40,70,30,0.22)'; ctx.fillRect(s.x0 + 3, s.y0 + 5, s.x1 - s.x0, s.y1 - s.y0); }
    for (const s of st.walls) if (s.x1 > st.camX - 60 && s.x0 < st.camX + W + 60) drawWall(st, s, t);
    for (const g of st.gates) if (onScreen(st, g.cx)) drawGate(st, g, t);
    for (const lv of st.levers) if (onScreen(st, lv.x)) drawLever(st, lv, t);
    for (const h of st.hays) if (onScreen(st, h.x0)) drawHay(h, t);
    if (st.pen) drawPenFront(st, st.pen, t);
    // the pigs (behind the people), Farmer Fran
    for (const q of st.pigs) if (onScreen(st, q.x, 60) && !pigInFront(st, q)) drawPigAny(st, q, t);
    for (const z of st.zones) if (z.farmerT >= 0) drawFarmer(st, z, t);
    // signs on the grass
    drawSigns(st);
    ctx.restore();
    drawEdges(st, lk, t);
  }
  // the dirt track
  function drawRoute(st) { ctx.beginPath(); st.route.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); }
  function routeAtX(st, x) {
    for (const g of st.segs) {
      const x0 = Math.min(g.ax, g.bx), x1 = Math.max(g.ax, g.bx);
      if (x >= x0 && x <= x1 && x1 > x0) { const u = (x - g.ax) / (g.bx - g.ax); return { x, y: g.ay + (g.by - g.ay) * u }; }
    }
    return null;
  }
  // a pig standing lower on the screen than a person next to it is drawn in front of them
  function pigInFront(st, q) {
    return G.players.some(p => { const px = p.x + (st.inTick ? 0 : st.camX) + p.w / 2; return Math.abs(px - q.x) < 34 && q.y + 10 > p.y + p.h && q.y - 30 < p.y + p.h; });
  }
  function drawPigAny(st, q, t) {
    if (q.state === 'lost') { drawLostPig(st, q, t); return; }
    drawPig(q, t);
  }
  // the hedge along the top and the fence along the bottom, with farm things beyond (screen space)
  function drawEdges(st, lk, t) {
    const top = PH0.top, bot = PH0.bot;
    // the top strip: hedges, trees, barn roofs and (at the fair) a Ferris wheel far away
    ctx.fillStyle = '#9fd86e'; ctx.fillRect(0, 0, W, top - 14);
    const px = st.camX * 0.5;
    if (st.look === 'fair' || st.k === 3) drawFerris(W * 0.72 - st.camX * 0.04, top - 30, t);
    for (let k = Math.floor(px / 150) - 1; k < Math.floor(px / 150) + 9; k++) {
      const h = hash(k, 3), x = k * 150 - px + (h % 60);
      if (h % 5 === 0) { // a little red barn far away
        ctx.fillStyle = '#c8483c'; ctx.fillRect(x, top - 64, 54, 40); ctx.fillStyle = '#7e2a22'; ctx.beginPath(); ctx.moveTo(x - 6, top - 64); ctx.lineTo(x + 27, top - 86); ctx.lineTo(x + 60, top - 64); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(x + 18, top - 50, 18, 26); ctx.beginPath(); ctx.moveTo(x + 18, top - 50); ctx.lineTo(x + 36, top - 24); ctx.moveTo(x + 36, top - 50); ctx.lineTo(x + 18, top - 24); ctx.stroke();
      } else { // a round tree
        ctx.fillStyle = '#7a5530'; ctx.fillRect(x + 22, top - 40, 8, 20);
        ctx.fillStyle = h % 2 ? '#4fa04a' : '#5cb055'; circle(x + 26, top - 50, 24); ctx.fill(); circle(x + 10, top - 40, 15); ctx.fill(); circle(x + 42, top - 40, 15); ctx.fill();
        if (h % 3 === 0) { ctx.fillStyle = '#ff5a4a'; circle(x + 18, top - 52, 3); ctx.fill(); circle(x + 34, top - 44, 3); ctx.fill(); }
      }
    }
    // the hedge
    ctx.fillStyle = lk.hedgeD; ctx.fillRect(0, top - 22, W, 22);
    for (let x = -((st.camX) % 36) - 36; x < W + 36; x += 36) { ctx.fillStyle = lk.hedge; circle(x + 18, top - 18, 16); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.12)'; circle(x + 13, top - 24, 6); ctx.fill(); }
    // the bottom: a white fence with flowers below
    ctx.fillStyle = '#7fcf5a'; ctx.fillRect(0, bot, W, H - bot);
    for (let x = -(st.camX % 48) - 48; x < W + 48; x += 48) {
      ctx.fillStyle = '#f6f1e2'; ctx.fillRect(x, bot - 6, 8, 26); ctx.fillStyle = '#d8d0b8'; ctx.fillRect(x + 6, bot - 6, 2, 26);
      const h = hash(Math.round((x + st.camX) / 48), 9);
      ctx.fillStyle = ['#ff7aa8', '#ffd84a', '#ffffff', '#b98cff'][h % 4]; circle(x + 26, bot + 30, 4); ctx.fill(); circle(x + 34, bot + 38, 3.5); ctx.fill();
    }
    ctx.fillStyle = '#f6f1e2'; ctx.fillRect(0, bot + 2, W, 6); ctx.fillRect(0, bot + 12, W, 5);
  }
  function drawFerris(x, y, t) {
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3;
    circle(x, y - 10, 50); ctx.stroke();
    for (let k = 0; k < 8; k++) { const a = t * 0.3 + k / 8 * TAU; ctx.beginPath(); ctx.moveTo(x, y - 10); ctx.lineTo(x + Math.cos(a) * 50, y - 10 + Math.sin(a) * 50); ctx.stroke(); ctx.fillStyle = ['#ff6b6b', '#ffd84a', '#5bb8ff', '#8ee36a'][k % 4]; rr(x + Math.cos(a) * 50 - 6, y - 10 + Math.sin(a) * 50, 12, 9, 3); ctx.fill(); }
    ctx.strokeStyle = '#e8e0ff'; ctx.beginPath(); ctx.moveTo(x - 30, y + 50); ctx.lineTo(x, y - 10); ctx.lineTo(x + 30, y + 50); ctx.stroke();
    ctx.restore();
  }
  function drawWall(st, s, t) {
    const w = s.x1 - s.x0, h = s.y1 - s.y0;
    if (s.look === 'fence') {
      const vert = s.vert || h > w;
      ctx.fillStyle = '#a8743f';
      if (vert) { ctx.fillRect(s.x0 + 2, s.y0, 3, h); ctx.fillRect(s.x1 - 5, s.y0, 3, h); }
      else { ctx.fillRect(s.x0, s.y0 + 2, w, 3); ctx.fillRect(s.x0, s.y1 - 5, w, 3); }
      ctx.fillStyle = '#c99260';
      if (vert) { ctx.fillRect(s.x0 + 2, s.y0, 1.5, h); ctx.fillRect(s.x1 - 5, s.y0, 1.5, h); } else { ctx.fillRect(s.x0, s.y0 + 2, w, 1.5); ctx.fillRect(s.x0, s.y1 - 5, w, 1.5); }
      // posts
      const n = Math.max(1, Math.round((vert ? h : w) / 40));
      for (let i = 0; i <= n; i++) {
        const px = vert ? s.x0 + w / 2 : s.x0 + (w * i) / n, py = vert ? s.y0 + (h * i) / n : s.y0 + h / 2;
        ctx.fillStyle = '#7a4e26'; rr(px - 6, py - 6, 12, 12, 3); ctx.fill();
        ctx.fillStyle = '#9c6a3a'; rr(px - 4.5, py - 4.5, 9, 9, 2); ctx.fill();
      }
      return;
    }
    if (s.look === 'haystack') {
      const cx = s.x0 + w / 2, cy = s.y0 + h / 2;
      ctx.fillStyle = 'rgba(60,80,30,0.25)'; ctx.beginPath(); ctx.ellipse(cx + 4, cy + 8, w / 2, h / 2, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#e8b84a'; ctx.beginPath(); ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#f6d36a'; ctx.beginPath(); ctx.ellipse(cx - 4, cy - 4, w / 2 - 8, h / 2 - 8, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#c99430'; ctx.lineWidth = 1.5;
      for (let k = 0; k < 9; k++) { const a = k / 9 * TAU, r1 = 0.3, r2 = 0.85; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * w / 2 * r1, cy + Math.sin(a) * h / 2 * r1); ctx.lineTo(cx + Math.cos(a + 0.2) * w / 2 * r2, cy + Math.sin(a + 0.2) * h / 2 * r2); ctx.stroke(); }
      return;
    }
    if (s.look === 'barn') {
      ctx.fillStyle = 'rgba(40,60,30,0.25)'; ctx.fillRect(s.x0 + 6, s.y0 + 8, w, h);
      ctx.fillStyle = '#b8382e'; ctx.fillRect(s.x0, s.y0, w, h);
      // the roof seen from above: two slopes and a ridge
      ctx.fillStyle = '#d24a3e'; ctx.fillRect(s.x0, s.y0, w, h / 2);
      ctx.fillStyle = '#9a2e26'; ctx.fillRect(s.x0, s.y0 + h / 2 - 3, w, 6);
      ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 2;
      for (let x = s.x0 + 18; x < s.x1; x += 18) { ctx.beginPath(); ctx.moveTo(x, s.y0); ctx.lineTo(x, s.y1); ctx.stroke(); }
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4; ctx.strokeRect(s.x0 + 2, s.y0 + 2, w - 4, h - 4);
      // a weathervane rooster on top
      const cx = s.x0 + w / 2, cy = s.y0 + h / 2;
      ctx.fillStyle = '#3a3a4a'; ctx.fillRect(cx - 1, cy - 14, 2, 14);
      ctx.fillStyle = '#ffd36b'; ctx.beginPath(); ctx.ellipse(cx, cy - 16, 8, 5, Math.sin(t * 0.7) * 0.4, 0, TAU); ctx.fill();
      return;
    }
    if (s.look === 'tent' || s.look === 'stall') {
      ctx.fillStyle = 'rgba(40,60,30,0.25)'; ctx.fillRect(s.x0 + 6, s.y0 + 8, w, h);
      const stripes = Math.max(3, Math.round(w / 22));
      for (let i = 0; i < stripes; i++) { ctx.fillStyle = i % 2 ? '#ffffff' : (s.look === 'tent' ? '#ff5a6a' : '#5aa8ff'); ctx.fillRect(s.x0 + (w * i) / stripes, s.y0, w / stripes + 0.5, h); }
      ctx.fillStyle = 'rgba(0,0,0,0.08)'; ctx.fillRect(s.x0, s.y0 + h / 2, w, h / 2);
      ctx.strokeStyle = '#c03a4a'; ctx.lineWidth = 2; ctx.strokeRect(s.x0 + 1, s.y0 + 1, w - 2, h - 2);
      // scalloped edge and a flag
      ctx.fillStyle = s.look === 'tent' ? '#ff5a6a' : '#5aa8ff';
      for (let x = s.x0; x < s.x1 - 4; x += 16) { ctx.beginPath(); ctx.arc(x + 8, s.y1, 8, 0, Math.PI); ctx.fill(); }
      const fx = s.x0 + w / 2;
      ctx.fillStyle = '#5a4a3a'; ctx.fillRect(fx - 1, s.y0 - 18, 2, 18);
      ctx.fillStyle = '#ffd84a'; ctx.beginPath(); ctx.moveTo(fx + 1, s.y0 - 18); ctx.lineTo(fx + 14 + Math.sin(t * 5) * 2, s.y0 - 13); ctx.lineTo(fx + 1, s.y0 - 8); ctx.fill();
      return;
    }
    if (s.look === 'corn') { drawCornBlock(s.x0, s.y0, w, h, t, s.seed || 1, false); return; }
    if (s.look === 'tractor') {
      const cx = s.x0 + w / 2, cy = s.y0 + h / 2;
      ctx.fillStyle = 'rgba(40,60,30,0.25)'; rr(s.x0 + 6, s.y0 + 8, w, h, 10); ctx.fill();
      ctx.fillStyle = '#2a2a33'; rr(s.x0 - 4, s.y0 - 4, 24, 14, 4); ctx.fill(); rr(s.x0 - 4, s.y1 - 10, 24, 14, 4); ctx.fill(); rr(s.x1 - 22, s.y0 + 2, 16, 10, 3); ctx.fill(); rr(s.x1 - 22, s.y1 - 12, 16, 10, 3); ctx.fill();
      ctx.fillStyle = '#e04a3a'; rr(s.x0 + 4, s.y0 + 6, w - 8, h - 12, 8); ctx.fill();
      ctx.fillStyle = '#ffd36b'; rr(cx - 16, cy - 10, 26, 20, 5); ctx.fill();
      ctx.fillStyle = '#444'; circle(s.x1 - 14, cy - 6, 4); ctx.fill();
      return;
    }
    if (s.look === 'trough') {
      ctx.fillStyle = '#7a5530'; rr(s.x0, s.y0, w, h, 6); ctx.fill();
      ctx.fillStyle = '#e8c46a'; rr(s.x0 + 4, s.y0 + 4, w - 8, h - 8, 4); ctx.fill();
      return;
    }
    if (s.look === 'tree') {
      const cx = s.x0 + w / 2, cy = s.y0 + h / 2;
      ctx.fillStyle = 'rgba(40,60,30,0.25)'; circle(cx + 6, cy + 8, w / 2); ctx.fill();
      ctx.fillStyle = '#4a9a44'; circle(cx, cy, w / 2); ctx.fill();
      ctx.fillStyle = '#5cb055'; circle(cx - 6, cy - 6, w / 2 - 8); ctx.fill();
      ctx.fillStyle = '#ff5a4a'; for (let k = 0; k < 5; k++) { circle(cx + Math.cos(k * 1.3) * w * 0.3, cy + Math.sin(k * 1.3) * w * 0.3, 3); ctx.fill(); }
      return;
    }
    ctx.fillStyle = '#8a6a4a'; ctx.fillRect(s.x0, s.y0, w, h);
  }
  function drawCornBlock(x0, y0, w, h, t, seed, wiggleAt) {
    ctx.fillStyle = '#5f9a34'; ctx.fillRect(x0, y0, w, h);
    ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, w, h); ctx.clip();
    for (let y = y0 + 8; y < y0 + h + 10; y += 16) for (let x = x0 + ((y / 16) % 2) * 9; x < x0 + w + 10; x += 18) {
      const hh = hash(Math.round(x), Math.round(y) + seed);
      let sw = Math.sin(t * 1.4 + x * 0.05 + y * 0.03) * 1.5;
      if (wiggleAt && Math.hypot(x - wiggleAt.x, y - wiggleAt.y) < 40) sw += Math.sin(t * 22 + x) * 4;
      ctx.fillStyle = hh % 3 ? '#79b83e' : '#8cc94a';
      ctx.beginPath(); ctx.ellipse(x + sw, y, 8, 5, 0.6, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x + sw + 3, y + 2, 7, 4, -0.7, 0, TAU); ctx.fill();
      if (hh % 5 === 0) { ctx.fillStyle = '#ffd84a'; ctx.beginPath(); ctx.ellipse(x + sw + 1, y - 1, 2.5, 4.5, 0.3, 0, TAU); ctx.fill(); }
    }
    ctx.restore();
  }
  function drawZone(st, z, t) {
    const w = z.x1 - z.x0, h = z.y1 - z.y0;
    const lostHere = st.pigs.filter(q => q.state === 'lost' && q.zone === z);
    if (z.kind === 'corn') {
      drawCornBlock(z.x0, z.y0, w, h, t, z.seed, lostHere.length ? { x: lostHere[0].lx, y: lostHere[0].ly } : null);
    } else if (z.kind === 'pond') {
      ctx.fillStyle = '#7cc46a'; ctx.fillRect(z.x0, z.y0, w, h);
      ctx.fillStyle = '#d8c48a'; rr(z.x0 + 6, z.y0 + 6, w - 12, h - 8, 30); ctx.fill();
      ctx.fillStyle = '#4fb4e8'; rr(z.x0 + 14, z.y0 + 14, w - 28, h - 22, 26); ctx.fill();
      ctx.fillStyle = '#6ccaf2'; rr(z.x0 + 22, z.y0 + 20, w - 44, h - 36, 20); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 2;
      for (let k = 0; k < Math.floor(w / 70); k++) { const x = z.x0 + 40 + k * 70 + Math.sin(t + k) * 6, y = z.y0 + 40 + (k % 3) * 22; ctx.beginPath(); ctx.arc(x, y, 8 + ((t * 8 + k * 5) % 10), 0.2, Math.PI - 0.2); ctx.stroke(); }
      // lily pads
      for (let k = 0; k < Math.floor(w / 110); k++) { const x = z.x0 + 70 + k * 110, y = z.y1 - 30 - (k % 2) * 30; ctx.fillStyle = '#4caa4a'; ctx.beginPath(); ctx.arc(x, y, 11, 0.4, TAU - 0.2); ctx.lineTo(x, y); ctx.fill(); if (k % 2 === 0) { ctx.fillStyle = '#ffb3d1'; circle(x + 3, y - 2, 3.5); ctx.fill(); } }
      // reeds round the edge
      ctx.strokeStyle = '#4a8a3a'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      for (let x = z.x0 + 10; x < z.x1 - 6; x += 46) { ctx.beginPath(); ctx.moveTo(x, z.y1 - 4); ctx.lineTo(x - 3, z.y1 - 22); ctx.stroke(); ctx.fillStyle = '#8a5a30'; rr(x - 6, z.y1 - 30, 5, 10, 2); ctx.fill(); }
      // ducks paddling about
      for (let k = 0; k < Math.max(1, Math.floor(w / 220)); k++) {
        const dx = z.x0 + 50 + ((t * 18 + k * 140 + z.seed * 30) % Math.max(60, w - 100)), dy = z.y0 + h * 0.45 + Math.sin(t * 1.3 + k * 2) * 10 + k * 18;
        drawDuck(dx, dy, Math.cos(t * 0.2 + k) > -2 ? 1 : -1, t + k);
      }
    } else if (z.kind === 'veg') {
      ctx.fillStyle = '#9a6a3e'; ctx.fillRect(z.x0, z.y0, w, h);
      for (let y = z.y0 + 14; y < z.y1 - 6; y += 26) {
        ctx.fillStyle = '#7e5430'; ctx.fillRect(z.x0 + 6, y + 6, w - 12, 6);
        for (let x = z.x0 + 20; x < z.x1 - 14; x += 32) {
          const hh = hash(Math.round(x), Math.round(y));
          if (hh % 3 === 0) { ctx.fillStyle = '#5cbf4a'; circle(x, y + 4, 9); ctx.fill(); ctx.fillStyle = '#86d86a'; circle(x - 2, y + 2, 5); ctx.fill(); }
          else if (hh % 3 === 1) { ctx.fillStyle = '#ff8a2a'; ctx.beginPath(); ctx.moveTo(x - 4, y); ctx.lineTo(x + 4, y); ctx.lineTo(x, y + 12); ctx.fill(); ctx.fillStyle = '#4caa3a'; ctx.fillRect(x - 3, y - 6, 2, 6); ctx.fillRect(x + 1, y - 7, 2, 7); }
          else { ctx.fillStyle = '#e8484a'; circle(x, y + 4, 5); ctx.fill(); ctx.fillStyle = '#4caa3a'; ctx.fillRect(x - 1, y - 3, 2, 4); }
        }
      }
      // a scarecrow keeps watch
      const sx = z.x0 + w * 0.7, sy = z.y0 + h * 0.5;
      ctx.fillStyle = '#7a5530'; ctx.fillRect(sx - 2, sy - 10, 4, 26); ctx.fillRect(sx - 18, sy - 2, 36, 4);
      ctx.fillStyle = '#5a8adf'; rr(sx - 9, sy - 6, 18, 16, 4); ctx.fill();
      ctx.fillStyle = '#ffd9a8'; circle(sx, sy - 14, 7); ctx.fill();
      ctx.fillStyle = '#e8b84a'; ctx.beginPath(); ctx.ellipse(sx, sy - 19, 12, 4, 0, 0, TAU); ctx.fill(); rr(sx - 6, sy - 27, 12, 8, 3); ctx.fill();
    } else if (z.kind === 'pie') {
      ctx.fillStyle = '#9fd870'; ctx.fillRect(z.x0, z.y0, w, h);
      // a striped tent seen from above, pies on tables
      const stripes = Math.max(3, Math.round(w / 26));
      for (let i = 0; i < stripes; i++) { ctx.fillStyle = i % 2 ? '#fff6e6' : '#ff9ac0'; ctx.fillRect(z.x0 + 6 + ((w - 12) * i) / stripes, z.y0 + 6, (w - 12) / stripes + 0.5, h - 12); }
      ctx.fillStyle = 'rgba(255,255,255,0.45)'; rr(z.x0 + 20, z.y0 + h / 2 - 16, w - 40, 32, 8); ctx.fill();
      for (let x = z.x0 + 40; x < z.x1 - 30; x += 46) { ctx.fillStyle = '#c98a4a'; circle(x, z.y0 + h / 2, 12); ctx.fill(); ctx.fillStyle = '#e8a85a'; circle(x, z.y0 + h / 2, 9); ctx.fill(); ctx.fillStyle = '#d0485a'; circle(x, z.y0 + h / 2, 5); ctx.fill(); }
    }
    for (const q of lostHere) drawLostPig(st, q, t);
  }
  function drawDuck(x, y, f, t) {
    ctx.save(); ctx.translate(x, y); ctx.scale(f, 1);
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(0, 6, 14, 4, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(0, 0, 11, 7, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffffff'; circle(8, -6, 5.5); ctx.fill();
    ctx.fillStyle = '#ff9a2a'; ctx.beginPath(); ctx.moveTo(12, -6); ctx.lineTo(18, -5 + Math.sin(t * 6)); ctx.lineTo(12, -3); ctx.fill();
    ctx.fillStyle = '#1c1a36'; circle(9.5, -7.5, 1.2); ctx.fill();
    ctx.restore();
  }
  function drawMud(m, t) {
    ctx.fillStyle = '#7a5232'; ctx.beginPath(); ctx.ellipse(m.x, m.y, m.r + 6, m.r * 0.6 + 4, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#946240'; ctx.beginPath(); ctx.ellipse(m.x, m.y, m.r, m.r * 0.6, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.beginPath(); ctx.ellipse(m.x - m.r * 0.35, m.y - m.r * 0.2, m.r * 0.3, m.r * 0.1, -0.2, 0, TAU); ctx.fill();
    for (let k = 0; k < 3; k++) { const ph = (t * 0.7 + k * 0.33 + m.seed * 0.1) % 1; ctx.strokeStyle = 'rgba(70,40,20,' + (0.5 * (1 - ph)) + ')'; ctx.lineWidth = 1.5; circle(m.x + Math.cos(k * 2.1) * m.r * 0.4, m.y + Math.sin(k * 2.1) * m.r * 0.2, 2 + ph * 6); ctx.stroke(); }
  }
  function drawPenFloor(st, P, t) {
    ctx.fillStyle = '#e8c86a'; ctx.fillRect(P.x0, P.y0, P.x1 - P.x0, P.y1 - P.y0);
    ctx.strokeStyle = 'rgba(190,140,50,0.55)'; ctx.lineWidth = 1.6;
    for (let k = 0; k < 40; k++) { const h = hash(k, 51), x = P.x0 + 10 + (h % Math.max(1, P.x1 - P.x0 - 20)), y = P.y0 + 10 + ((h >> 8) % Math.max(1, P.y1 - P.y0 - 20)), a = (h % 7) * 0.5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * 9, y + Math.sin(a) * 9); ctx.stroke(); }
    // the trough
    ctx.fillStyle = '#7a5530'; rr(P.tx - 14, P.ty - 64, 28, 128, 8); ctx.fill();
    ctx.fillStyle = '#c9a050'; rr(P.tx - 9, P.ty - 58, 18, 116, 5); ctx.fill();
    ctx.fillStyle = '#ff8a3a'; for (let k = 0; k < 6; k++) { circle(P.tx - 3 + (k % 2) * 6, P.ty - 48 + k * 18, 3.5); ctx.fill(); }
    ctx.fillStyle = '#ffe9a8'; for (let k = 0; k < 5; k++) { circle(P.tx + 3 - (k % 2) * 6, P.ty - 40 + k * 18, 3); ctx.fill(); }
    // the sign
    const sx = (P.x0 + P.x1) / 2, sy = P.y0 - 22;
    ctx.fillStyle = '#7a5530'; ctx.fillRect(sx - 2, sy, 4, 16);
    ctx.fillStyle = P.final ? '#5a8aff' : '#c8483c'; rr(sx - 46, sy - 14, 92, 24, 6); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; rr(sx - 46, sy - 14, 92, 24, 6); ctx.stroke();
    text(P.final ? 'BEST PIGS' : 'PIG PEN', sx, sy - 1, 14, '#ffffff', 'center');
    if (P.final) drawRosette(P.x1 - 40, P.y0 + 30, 1, t);
  }
  function drawPenFront(st, P, t) { void st; void P; void t; }
  function drawRosette(x, y, s, t) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.rotate(Math.sin(t * 2) * 0.08);
    ctx.fillStyle = '#2f5fc4'; ctx.beginPath(); ctx.moveTo(-8, 6); ctx.lineTo(-14, 30); ctx.lineTo(-6, 26); ctx.lineTo(-2, 34); ctx.lineTo(0, 8); ctx.fill();
    ctx.beginPath(); ctx.moveTo(8, 6); ctx.lineTo(14, 30); ctx.lineTo(6, 26); ctx.lineTo(2, 34); ctx.lineTo(0, 8); ctx.fill();
    ctx.fillStyle = '#5b95ff'; for (let k = 0; k < 12; k++) { const a = k / 12 * TAU; circle(Math.cos(a) * 12, Math.sin(a) * 12, 6); ctx.fill(); }
    ctx.fillStyle = '#ffd84a'; circle(0, 0, 10); ctx.fill();
    ctx.fillStyle = '#b9850f'; ctx.font = '10px ' + DISP; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('1st', 0, 0.5);
    ctx.restore();
  }
  function drawGate(st, g, t) {
    // the posts, and the gate leaf swinging on its hinge
    const gold = g.gold;
    const L = g.len, ang0 = Math.atan2(g.ey - g.hy, g.ex - g.hx);
    const kind = g.kind;
    if (kind === 'barn') {
      // a sliding barn door: slides along into the wall
      const x = g.x0, y0 = Math.min(g.hy, g.ey), y1 = Math.max(g.hy, g.ey), off = (y1 - y0) * g.anim;
      ctx.fillStyle = '#5a2a1a'; ctx.fillRect(x - 2, y0, g.x1 - g.x0 + 4, y1 - y0);
      ctx.save(); ctx.beginPath(); ctx.rect(x - 10, y0 - 2, g.x1 - g.x0 + 20, y1 - y0 + 4); ctx.clip();
      ctx.fillStyle = '#d24a3e'; ctx.fillRect(x - 4, y0 - off, g.x1 - g.x0 + 8, y1 - y0);
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5; ctx.strokeRect(x - 3, y0 - off + 1, g.x1 - g.x0 + 6, y1 - y0 - 2);
      ctx.beginPath(); ctx.moveTo(x - 3, y0 - off + 1); ctx.lineTo(x + g.x1 - g.x0 + 3, y1 - off - 1); ctx.moveTo(x + g.x1 - g.x0 + 3, y0 - off + 1); ctx.lineTo(x - 3, y1 - off - 1); ctx.stroke();
      ctx.restore();
      // the rope with its timer ring while open
      const rx = x - 26, ry = y1 + 4;
      ctx.strokeStyle = '#e8d29a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 4, y1 - 8); ctx.quadraticCurveTo(rx + 4, ry - 6, rx, ry + 8); ctx.stroke();
      ctx.fillStyle = '#c99260'; circle(rx, ry + 10, 5); ctx.fill();
      if (g.open) { ctx.strokeStyle = C.gold; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(rx, ry + 10, 11, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(g.openT / PH0.barnT, 0, 1)); ctx.stroke(); }
      return;
    }
    const sw = g.swing * (Math.PI / 2) * 0.88 * g.anim;
    const ang = ang0 + sw;
    const ex = g.hx + Math.cos(ang) * L, ey = g.hy + Math.sin(ang) * L;
    // shadow
    ctx.strokeStyle = 'rgba(40,70,30,0.22)'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(g.hx + 3, g.hy + 5); ctx.lineTo(ex + 3, ey + 5); ctx.stroke();
    // the five-bar leaf (seen from above: a white plank with bars)
    const col = gold ? '#ffd36b' : kind === 'side' ? '#ffffff' : kind === 'pen' ? '#ffe2a8' : '#f2f0e8';
    const edge = gold ? '#b9850f' : kind === 'side' ? '#c8483c' : '#7a4e26';
    ctx.lineCap = 'round';
    ctx.strokeStyle = edge; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(g.hx, g.hy); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.strokeStyle = col; ctx.lineWidth = 5.5; ctx.beginPath(); ctx.moveTo(g.hx, g.hy); ctx.lineTo(ex, ey); ctx.stroke();
    // cross bars
    ctx.strokeStyle = edge; ctx.lineWidth = 1.5;
    const n = Math.max(2, Math.round(L / 22));
    for (let i = 1; i < n; i++) { const u = i / n, x = g.hx + (ex - g.hx) * u, y = g.hy + (ey - g.hy) * u, nx = -Math.sin(ang) * 3.2, ny = Math.cos(ang) * 3.2; ctx.beginPath(); ctx.moveTo(x - nx, y - ny); ctx.lineTo(x + nx, y + ny); ctx.stroke(); }
    // posts: the hinge post and the latch post
    const post = (x, y, latch) => { ctx.fillStyle = '#6a4220'; rr(x - 7, y - 7, 14, 14, 3); ctx.fill(); ctx.fillStyle = latch ? (gold ? '#ffd36b' : '#c9a050') : '#9c6a3a'; rr(x - 5, y - 5, 10, 10, 2); ctx.fill(); };
    post(g.hx, g.hy, false); post(g.ex, g.ey, true);
    // side gates that are open glow a warning, fork gates show a little arrow on the right way
    if (kind === 'side' && g.open) {
      const a = 0.35 + 0.25 * Math.sin(t * 6);
      ctx.strokeStyle = 'rgba(255,90,70,' + a + ')'; ctx.lineWidth = 3; ctx.setLineDash([6, 5]);
      ctx.beginPath(); ctx.moveTo(g.hx, g.hy); ctx.lineTo(g.ex, g.ey); ctx.stroke(); ctx.setLineDash([]);
    }
  }
  function drawLever(st, lv, t) {
    const right = lv.b.open, a = (right ? 0.7 : -0.7) * clamp(lv.t / 0.15, 0, 1) + (right ? 0 : 0);
    const x = lv.x, y = lv.y;
    ctx.fillStyle = 'rgba(40,70,30,0.25)'; ctx.beginPath(); ctx.ellipse(x + 3, y + 12, 18, 6, 0, 0, TAU); ctx.fill();
    if (lv.gold) { ctx.fillStyle = 'rgba(255,211,107,' + (0.35 + 0.15 * Math.sin(t * 5)) + ')'; circle(x, y + 2, 30); ctx.fill(); }
    ctx.fillStyle = lv.gold ? '#b9850f' : '#5c6470'; rr(x - 16, y - 2, 32, 16, 5); ctx.fill();
    ctx.fillStyle = '#7d8896'; rr(x - 13, y + 1, 26, 10, 4); ctx.fill();
    ctx.save(); ctx.translate(x, y + 6); ctx.rotate(right ? 0.75 : -0.75);
    ctx.fillStyle = '#d9b45a'; ctx.fillRect(-2.5, -30, 5, 30);
    ctx.fillStyle = right ? '#4caf50' : '#ff6b6b'; circle(0, -32, 8); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; circle(-2, -34, 2.5); ctx.fill();
    ctx.restore();
    void a; void t;
  }
  function drawHay(h, t) {
    const x = h.x0, y = h.y0, w = h.w, hh = h.h;
    ctx.fillStyle = 'rgba(40,70,30,0.25)'; rr(x + 4, y + 6, w, hh, 8); ctx.fill();
    ctx.fillStyle = h.gold ? '#ffd36b' : '#e8b84a'; rr(x, y, w, hh, 8); ctx.fill();
    ctx.fillStyle = h.gold ? '#fff0a8' : '#f6d36a'; rr(x + 3, y + 3, w - 6, hh * 0.5, 6); ctx.fill();
    ctx.strokeStyle = '#c99430'; ctx.lineWidth = 1.3;
    const roll = h.roll || 0;
    for (let k = 0; k < 7; k++) { const sx = x + 6 + ((k * 9 + roll * 0.6) % (w - 12)); ctx.beginPath(); ctx.moveTo(sx, y + 4); ctx.lineTo(sx + 3, y + hh - 4); ctx.stroke(); }
    ctx.strokeStyle = '#a0522d'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x + w * 0.3, y); ctx.lineTo(x + w * 0.3, y + hh); ctx.moveTo(x + w * 0.7, y); ctx.lineTo(x + w * 0.7, y + hh); ctx.stroke();
    void t;
  }
  function drawSigns(st) {
    const bg = big();
    for (const sg of st.signs) {
      if (!onScreen(st, sg.x, 260)) continue;
      const role = sg.role === 'k' ? st.keeper : sg.role === 'h' ? st.herder : -1;
      const s = sg.alt && role >= 0 && isCpu(role) ? sg.alt : sg.raw;
      const str = s.replace(/\{Ha\}/g, key(st.herder, 'act')).replace(/\{Ka\}/g, key(st.keeper, 'act'));
      const fs = bg ? 21 : 16;
      ctx.font = fs + 'px ' + DISP;
      const w = ctx.measureText(str).width + 26;
      // a little wooden sign on a post
      ctx.fillStyle = '#7a5530'; ctx.fillRect(sg.x - 2, sg.y + fs * 0.8, 4, 14);
      ctx.fillStyle = '#f6e7c4'; rr(sg.x - w / 2, sg.y - fs * 0.9, w, fs * 1.8, 8); ctx.fill();
      ctx.strokeStyle = '#a8743f'; ctx.lineWidth = 2.5; rr(sg.x - w / 2, sg.y - fs * 0.9, w, fs * 1.8, 8); ctx.stroke();
      text(str, sg.x, sg.y + 1, fs, '#6a3a1a', 'center');
    }
  }
  function drawDecor(st, dc, t) {
    const x = dc.x, y = dc.y;
    switch (dc.kind) {
      case 'chickens': {
        for (let k = 0; k < 3; k++) {
          const cx = x + k * 26 + Math.sin(t * 1.3 + k * 2) * 10, cy = y + (k % 2) * 16, peck = Math.max(0, Math.sin(t * 5 + k * 1.7)) * 3, f = Math.cos(t * 0.6 + k) > 0 ? 1 : -1;
          ctx.save(); ctx.translate(cx, cy); ctx.scale(f, 1);
          ctx.fillStyle = 'rgba(40,70,30,0.2)'; ctx.beginPath(); ctx.ellipse(0, 8, 9, 3, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(0, 0, 9, 7, 0, 0, TAU); ctx.fill();
          circle(6, -5 + peck, 4.5); ctx.fill();
          ctx.fillStyle = '#ff4a3a'; circle(6, -10 + peck, 2.2); ctx.fill();
          ctx.fillStyle = '#ffb32a'; ctx.beginPath(); ctx.moveTo(10, -5 + peck); ctx.lineTo(14, -4 + peck); ctx.lineTo(10, -3 + peck); ctx.fill();
          ctx.fillStyle = '#1c1a36'; circle(7, -6 + peck, 1); ctx.fill();
          ctx.restore();
        }
        break;
      }
      case 'flowers': {
        for (let k = 0; k < 6; k++) { const fx = x + (k % 3) * 16, fy = y + Math.floor(k / 3) * 14; ctx.fillStyle = ['#ff7aa8', '#ffd84a', '#ffffff', '#b98cff'][(k + (x | 0)) % 4]; for (let a = 0; a < 5; a++) { circle(fx + Math.cos(a * 1.26) * 3.5, fy + Math.sin(a * 1.26) * 3.5, 2.6); ctx.fill(); } ctx.fillStyle = '#f2b23a'; circle(fx, fy, 2); ctx.fill(); }
        break;
      }
      case 'bunting': {
        const w = dc.o.w || 300;
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + w / 2, y + 26, x + w, y); ctx.stroke();
        for (let k = 1; k < Math.floor(w / 22); k++) { const u = k * 22 / w, bx = x + w * u, by = y + 52 * u * (1 - u) * 1; ctx.fillStyle = ['#ff5a6a', '#ffd84a', '#5bb8ff', '#8ee36a', '#ffffff'][k % 5]; ctx.beginPath(); ctx.moveTo(bx - 7, by); ctx.lineTo(bx + 7, by); ctx.lineTo(bx, by + 12 + Math.sin(t * 3 + k) * 1.5); ctx.fill(); }
        break;
      }
      case 'balloons': {
        for (let k = 0; k < 3; k++) { const bx = x + k * 14 - 14, by = y - 30 + Math.sin(t * 1.5 + k) * 4 - (k % 2) * 8; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(bx, by + 10); ctx.stroke(); ctx.fillStyle = ['#ff5a6a', '#5bb8ff', '#ffd84a'][k]; ctx.beginPath(); ctx.ellipse(bx, by, 9, 11, 0, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.5)'; circle(bx - 3, by - 4, 2.5); ctx.fill(); }
        break;
      }
      case 'cow': { // a friendly cow watching over the fence
        const f = dc.o.f || 1;
        ctx.save(); ctx.translate(x, y); ctx.scale(f, 1);
        ctx.fillStyle = 'rgba(40,70,30,0.22)'; ctx.beginPath(); ctx.ellipse(0, 18, 26, 6, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#ffffff'; rr(-24, -10, 44, 26, 12); ctx.fill();
        ctx.fillStyle = '#2a2a33'; ctx.beginPath(); ctx.ellipse(-8, -2, 8, 6, 0.4, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(8, 8, 6, 4, -0.3, 0, TAU); ctx.fill();
        ctx.fillStyle = '#ffffff'; circle(22, -6, 10); ctx.fill();
        ctx.fillStyle = '#ffb3c6'; ctx.beginPath(); ctx.ellipse(28, -2, 6, 5, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#1c1a36'; circle(21, -9, 1.6); ctx.fill();
        ctx.fillStyle = '#e8d29a'; ctx.beginPath(); ctx.moveTo(16, -14); ctx.lineTo(12, -20); ctx.lineTo(19, -15); ctx.fill();
        ctx.restore();
        break;
      }
      case 'ribbonstage': {
        ctx.fillStyle = '#7a5530'; rr(x - 60, y - 8, 120, 20, 5); ctx.fill();
        ctx.fillStyle = '#c8483c'; rr(x - 56, y - 6, 112, 14, 4); ctx.fill();
        break;
      }
      default: break;
    }
  }
  function drawFarmer(st, z, t) {
    const k = z.farmerT, up = clamp(k / 0.3, 0, 1) * clamp((2.4 - k) / 0.3, 0, 1);
    const x = clamp(z.bx, z.x0 + 30, z.x1 - 30), inside = z.by > z.y1 ? z.y1 - 20 : z.y0 + 24, y = inside + (1 - up) * 20;
    ctx.save(); ctx.globalAlpha = up;
    ctx.fillStyle = 'rgba(40,70,30,0.25)'; ctx.beginPath(); ctx.ellipse(x, y + 22, 16, 5, 0, 0, TAU); ctx.fill();
    // overalls, arms waving, a big straw hat
    const wave = Math.sin(t * 12) * 0.6;
    ctx.strokeStyle = '#ffd9a8'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - 9, y); ctx.lineTo(x - 20, y - 14 + wave * 8); ctx.moveTo(x + 9, y); ctx.lineTo(x + 20, y - 14 - wave * 8); ctx.stroke();
    ctx.fillStyle = '#5a8adf'; rr(x - 11, y - 6, 22, 26, 6); ctx.fill();
    ctx.fillStyle = '#ff6b6b'; rr(x - 11, y - 8, 22, 8, 3); ctx.fill();
    ctx.fillStyle = '#ffd9a8'; circle(x, y - 16, 9); ctx.fill();
    ctx.fillStyle = '#1c1a36'; circle(x - 3, y - 17, 1.4); ctx.fill(); circle(x + 3, y - 17, 1.4); ctx.fill();
    ctx.strokeStyle = '#a0522d'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y - 14, 3.5, 0.2, Math.PI - 0.2); ctx.stroke();
    ctx.fillStyle = '#f2c94c'; ctx.beginPath(); ctx.ellipse(x, y - 24, 17, 5, 0, 0, TAU); ctx.fill(); rr(x - 8, y - 34, 16, 11, 4); ctx.fill();
    ctx.fillStyle = '#ff6b6b'; ctx.fillRect(x - 8, y - 27, 16, 3);
    ctx.restore();
  }

  /* ---------- the pigs ---------- */
  function drawPig(q, t) {
    const x = q.x, y = q.y, f = q.face || 1;
    const sp = Math.hypot(q.vx, q.vy), run = sp > 20, wal = q.state === 'wallow';
    const hop = run && !wal ? Math.abs(Math.sin(q.legT * 2.2)) * Math.min(3, sp / 50) : 0;
    const pink = q.gold ? '#ffd9a0' : '#ffb3c6', dark = q.gold ? '#e8a84a' : '#f08aa8', light = q.gold ? '#fff0c8' : '#ffd6e2';
    // shadow
    ctx.fillStyle = 'rgba(40,70,30,0.25)'; ctx.beginPath(); ctx.ellipse(x, y + 10, 17, 5, 0, 0, TAU); ctx.fill();
    if (q.gold) { ctx.fillStyle = 'rgba(255,211,107,0.35)'; circle(x, y, 24 + Math.sin(t * 5) * 2); ctx.fill(); }
    ctx.save(); ctx.translate(x, y - hop); ctx.scale(f, 1);
    if (wal) {
      // belly up in the mud, legs kicking happily
      ctx.rotate(Math.sin(t * 3 + q.i) * 0.15);
      ctx.fillStyle = dark; for (let k = 0; k < 4; k++) { const lx = -9 + k * 6, kick = Math.sin(t * 8 + k) * 2; ctx.fillRect(lx - 2, -14 + kick, 4, 8); }
      ctx.fillStyle = pink; ctx.beginPath(); ctx.ellipse(0, -2, 16, 11, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#7a5232'; ctx.beginPath(); ctx.ellipse(-4, 3, 9, 4, 0.2, 0, TAU); ctx.fill(); circle(6, -4, 3.5); ctx.fill();
      ctx.fillStyle = pink; circle(14, 0, 8); ctx.fill();
      ctx.fillStyle = dark; ctx.beginPath(); ctx.ellipse(20, 1, 4.5, 3.5, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#1c1a36'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(12, -2, 2, Math.PI + 0.3, -0.3); ctx.stroke(); ctx.beginPath(); ctx.arc(16, -3, 2, Math.PI + 0.3, -0.3); ctx.stroke();
      ctx.restore();
      return;
    }
    // legs (little trotting stubs)
    ctx.fillStyle = dark;
    for (let k = 0; k < 4; k++) { const lx = (k < 2 ? -9 : 7) + (k % 2) * 4, ph = Math.sin(q.legT * 4.4 + k * Math.PI / 2) * (run ? 3 : 0); ctx.fillRect(lx - 2, 4 + ph * 0.3, 4, 6 + ph * 0.5); }
    // curly tail
    ctx.strokeStyle = dark; ctx.lineWidth = 2; ctx.beginPath();
    const tw = Math.sin(t * 9 + q.i) * 0.6;
    ctx.arc(-17, -4, 3.5, tw, tw + 4.6); ctx.stroke();
    // body
    ctx.fillStyle = pink; ctx.beginPath(); ctx.ellipse(0, 0, 16, 10.5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = light; ctx.beginPath(); ctx.ellipse(-2, -4, 10, 4, 0, 0, TAU); ctx.fill();
    if (q.spot) { ctx.fillStyle = '#c86a7a'; ctx.beginPath(); ctx.ellipse(-6, -1, 5, 4, 0.3, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(4, 3, 3.5, 3, -0.2, 0, TAU); ctx.fill(); }
    if (q.muddy) { ctx.fillStyle = 'rgba(122,82,50,0.85)'; ctx.beginPath(); ctx.ellipse(-8, 4, 6, 4, 0.2, 0, TAU); ctx.fill(); circle(5, -4, 3); ctx.fill(); circle(-1, 6, 2.5); ctx.fill(); }
    if (q.gold) drawRosette(-4, -6, 0.42, t);
    // head
    ctx.fillStyle = pink; circle(13, -3, 9); ctx.fill();
    // ears
    ctx.fillStyle = dark; ctx.beginPath(); ctx.moveTo(8, -9); ctx.lineTo(10, -17 - (run ? 2 : 0)); ctx.lineTo(14, -10); ctx.fill();
    ctx.beginPath(); ctx.moveTo(14, -10); ctx.lineTo(18, -16 - (run ? 2 : 0)); ctx.lineTo(19, -8); ctx.fill();
    // snout
    ctx.fillStyle = dark; ctx.beginPath(); ctx.ellipse(20, -1, 4.5, 4, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#c05a7a'; circle(19, -1.5, 1.1); ctx.fill(); circle(21.5, -1.5, 1.1); ctx.fill();
    // eyes: happy arcs when calm or penned, wide when running
    const happy = q.state === 'pen' || q.happyT > 0 || (!run && q.alarm <= 0.05);
    ctx.fillStyle = '#1c1a36'; ctx.strokeStyle = '#1c1a36'; ctx.lineWidth = 1.5;
    if (happy) { ctx.beginPath(); ctx.arc(13, -5, 2, Math.PI + 0.4, -0.4); ctx.stroke(); }
    else { ctx.fillStyle = '#ffffff'; circle(13.5, -5, 2.8); ctx.fill(); ctx.fillStyle = '#1c1a36'; circle(14.3, -5, 1.5); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,120,150,0.6)'; circle(11, 0, 2); ctx.fill();
    // munching at the trough
    if (q.state === 'pen' && Math.hypot(q.vx, q.vy) < 10) { const m = Math.abs(Math.sin(t * 8 + q.i)); ctx.fillStyle = '#c05a7a'; ctx.fillRect(18, 3, 4, 1 + m * 2); }
    ctx.restore();
    // sweat drops when it's running scared
    if (q.alarm > 0.6 && run) { ctx.fillStyle = '#9fd8ff'; ctx.beginPath(); ctx.ellipse(x - f * 6, y - 18 - (t * 30 % 6), 2, 3, 0, 0, TAU); ctx.fill(); }
  }
  function drawLostPig(st, q, t) {
    const z = q.zone; if (!z) return;
    const x = q.lx + Math.sin(t * 2 + q.i) * 6, y = q.ly;
    if (z.kind === 'pond') {
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2; circle(x, y + 4, 14 + Math.sin(t * 6) * 2); ctx.stroke();
      ctx.fillStyle = '#ffb3c6'; circle(x, y, 9); ctx.fill();
      ctx.fillStyle = '#f08aa8'; ctx.beginPath(); ctx.ellipse(x + 7, y + 1, 4, 3.5, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#1c1a36'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(x + 1, y - 2, 2, Math.PI + 0.4, -0.4); ctx.stroke();
    } else if (z.kind === 'corn') {
      // just the ears and the curly tail poking out of the corn
      ctx.fillStyle = '#f08aa8'; ctx.beginPath(); ctx.moveTo(x - 6, y); ctx.lineTo(x - 3, y - 10); ctx.lineTo(x, y); ctx.fill(); ctx.beginPath(); ctx.moveTo(x + 2, y); ctx.lineTo(x + 5, y - 10); ctx.lineTo(x + 8, y); ctx.fill();
      ctx.strokeStyle = '#f08aa8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x - 18, y + 6, 3, 0, 4.6); ctx.stroke();
    } else {
      drawPig(Object.assign({}, q, { x, y, vx: 0, vy: 0, state: 'pen', happyT: 1 }), t);
      if (z.kind === 'pie') { ctx.fillStyle = '#e8a85a'; circle(x + 18, y - 2, 5); ctx.fill(); }
    }
  }

  /* ---------- on top: pigs in front of people, claps, pops, arrows, chips ---------- */
  function drawTop(st) {
    const t = G.clock, bg = big();
    ctx.save(); ctx.translate(-st.camX, 0);
    for (const q of st.pigs) if (onScreen(st, q.x, 60) && pigInFront(st, q) && q.state !== 'lost') drawPig(q, t);
    // the herder's clap rings
    for (const r of st.rings) {
      const k = r.t / 0.5;
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.8 * (1 - k)) + ')'; ctx.lineWidth = 5 * (1 - k) + 1;
      circle(r.x, r.y, 20 + k * (PH0.clapR - 20)); ctx.stroke();
      if (k < 0.5) { ctx.save(); ctx.globalAlpha = 1 - k * 2; text('CLAP!', r.x, r.y - 40 - k * 20, 18, '#ffffff', 'center'); ctx.restore(); }
    }
    // the herder's hands while clapping
    const hp = G.players[st.herder], HP = st.pl[st.herder];
    if (hp.alive && HP.clapT < 0.3) {
      const x = hp.x + st.camX + hp.w / 2, y = hp.y - 6, k = HP.clapT / 0.3, sp = Math.abs(Math.sin(k * Math.PI)) * 9;
      ctx.fillStyle = '#ffd9a8'; ctx.strokeStyle = PDARK[st.herder]; ctx.lineWidth = 1.5;
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(x + s * (3 + sp), y, 5, 7, s * 0.3, 0, TAU); ctx.fill(); ctx.stroke(); }
    }
    // a person climbing over a gate gets a little lift (drawn as a step stool of dust)
    // particles
    for (const q of st.parts) {
      const a = clamp(1 - q.t / q.life, 0, 1);
      ctx.globalAlpha = a;
      if (q.kind === 'mud') { ctx.fillStyle = '#7a5232'; circle(q.x, q.y, q.r); ctx.fill(); }
      else if (q.kind === 'drop') { ctx.fillStyle = '#9fdcff'; circle(q.x, q.y, q.r); ctx.fill(); }
      else if (q.kind === 'bubble') { ctx.strokeStyle = 'rgba(80,50,30,0.8)'; ctx.lineWidth = 1.2; circle(q.x, q.y, q.r * (1 + q.t)); ctx.stroke(); }
      else { ctx.fillStyle = q.col || 'rgba(220,200,150,0.7)'; ctx.globalAlpha = a * 0.6; circle(q.x, q.y, q.r * (1 + q.t)); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
    // the gold arrow over the gatekeeper's next job, and a soft sparkle there anyway
    const pl = st.state === 'play' ? plan(st) : null, j = pl && pl.job;
    if (j) {
      const tx = j.lever ? j.lever.x : j.hay ? j.hay.x0 + j.hay.w / 2 : j.gate.cx, ty = j.lever ? j.lever.y - 40 : j.hay ? j.hay.y0 - 6 : Math.min(j.gate.hy, j.gate.ey) - 8;
      const show = j.kind !== 'pen' || st.pigs.every(q => q.state === 'pen') || !j.gate.open;
      if (show && st.arrow) {
        const b = Math.sin(t * 6) * 6;
        ctx.fillStyle = C.gold; ctx.strokeStyle = '#7a5520'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(tx, ty - 4 + b); ctx.lineTo(tx - 16, ty - 26 + b); ctx.lineTo(tx - 6, ty - 26 + b); ctx.lineTo(tx - 6, ty - 46 + b); ctx.lineTo(tx + 6, ty - 46 + b); ctx.lineTo(tx + 6, ty - 26 + b); ctx.lineTo(tx + 16, ty - 26 + b); ctx.closePath(); ctx.fill(); ctx.stroke();
      } else if (show) {
        const a = 0.5 + 0.5 * Math.sin(t * 4);
        ctx.fillStyle = 'rgba(255,230,140,' + (0.55 * a) + ')'; starPath(tx + 14, ty - 8, 6 + a * 2, 2.4); ctx.fill();
      }
    }
    // pops
    for (const q of st.pops) {
      const size = q.size * (bg ? 1.3 : 1);
      ctx.font = size + 'px ' + DISP;
      const w = ctx.measureText(q.s).width + size * 0.3, x = clamp(q.x, st.camX + w / 2 + 6, st.camX + W - w / 2 - 6), y = Math.max(100, q.y - q.t * 26);
      ctx.save(); ctx.globalAlpha = clamp(Math.min(q.t / 0.1, (1.4 - q.t) / 0.4), 0, 1);
      bigText(q.s, x, y, Math.round(size), q.col);
      ctx.restore();
    }
    ctx.restore();
    // pigs off the screen: a little arrow at the edge
    if (st.state === 'play') for (const q of st.pigs) {
      if (q.state === 'pen' || q.state === 'lost') continue;
      const sx = q.x - st.camX;
      if (sx > -10 && sx < W + 10) continue;
      const right = sx >= W, ex = right ? W - 22 : 22, ey = clamp(q.y, 130, 440);
      ctx.fillStyle = 'rgba(28,26,54,0.7)'; circle(ex, ey, 16); ctx.fill();
      ctx.fillStyle = '#ffb3c6'; circle(ex, ey, 7); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.beginPath();
      if (right) { ctx.moveTo(W - 4, ey); ctx.lineTo(W - 12, ey - 7); ctx.lineTo(W - 12, ey + 7); } else { ctx.moveTo(4, ey); ctx.lineTo(12, ey - 7); ctx.lineTo(12, ey + 7); }
      ctx.fill();
    }
    // hint chips over each person
    if (st.state === 'play' && G.introT <= PH0.introHold) {
      const boxes = [];
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
        const P = st.pl[p.id], jb = job(st, p.id);
        const k = jb ? jb.k : '';
        if (k !== P.chipKey) { P.chipKey = k; P.chipAt = G.time; }
        const chipT = G.time - (P.chipAt || 0);
        const lines = jb && jobText(st, p.id, jb);
        if (!lines || !lines[0]) continue;
        const urgent = ['clapMud', 'penOpen', 'penShut', 'toPenShut', 'barnNow', 'shut', 'lever', 'open', 'hay'].includes(k);
        const done = p.id === st.herder ? st.stats.claps[p.id] : st.stats.gates[p.id];
        if (urgent && done >= 4 && chipT < 2.0) continue;
        if (!urgent && !(chipT > PH0.chipAgain || (st.k === 0 && chipT < 4))) continue;
        ctx.save(); if (chipT > PH0.chipAgain) ctx.globalAlpha = 0.8 + 0.2 * Math.sin(t * 5);
        boxes.push(chip(NAMES[p.id] + ': ' + lines[0], lines[1], p.x + p.w / 2, p.y - 30, PCOL[p.id], boxes));
        ctx.restore();
      }
    }
    if (st.state === 'end') {
      const k = clamp((st.endT - 0.6) / 0.3, 0, 1);
      if (k > 0) {
        bigText('Best Pigs at the fair!', W / 2, 160, bg ? 40 : 38, C.gold, 0.6 + 0.4 * k);
        if (st.endT > 1.2) { pill(W / 2, 188, bg ? 440 : 360, 32, 'center'); text('Clap and gate, together all the way!', W / 2, 204, bg ? 20 : 16, C.paper, 'center', 'body'); }
      }
    } else if (st.state === 'clear') {
      const k = clamp(st.clearT / 0.3, 0, 1);
      bigText('All in!', W / 2, 170, 44, C.gold, 0.6 + 0.4 * k);
      if (st.clearT > 0.6) { pill(W / 2, 198, bg ? 360 : 300, 32, 'center'); text('Swap jobs for the next chase!', W / 2, 214, bg ? 20 : 16, C.paper, 'center', 'body'); }
    }
  }
  function starPath(x, y, ro, ri) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? ri : ro; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
    ctx.closePath();
  }
  function chip(t1, t2, x, y, col, avoid) {
    const z = big() ? 1.45 : 1, f1 = Math.round(13 * z), f2 = Math.round(12 * z);
    ctx.font = '700 ' + f1 + 'px ' + FONT;
    let w = ctx.measureText(t1).width;
    if (t2) { ctx.font = '700 ' + f2 + 'px ' + FONT; w = Math.max(w, ctx.measureText(t2).width); }
    w = Math.min(W - 16, w + 22 * z); const h = (t2 ? 38 : 22) * z;
    const x0 = clamp(x - w / 2, 8, W - 8 - w);
    let y0 = clamp(y - h, 92, H - 8 - h);
    for (const b of avoid || []) if (x0 < b.x1 + 4 && x0 + w > b.x0 - 4 && y0 < b.y1 + 4 && y0 + h > b.y0 - 4) y0 = b.y0 - h - 6 >= 92 ? b.y0 - h - 6 : b.y1 + 6;
    ctx.fillStyle = 'rgba(28,26,54,0.88)'; rr(x0, y0, w, h, 10 * z); ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 2; rr(x0, y0, w, h, 10 * z); ctx.stroke();
    text(t1, x0 + w / 2, y0 + 11 * z, f1, col, 'center', 'body');
    if (t2) text(t2, x0 + w / 2, y0 + 28 * z, f2, C.paper, 'center', 'body');
    return { x0, y0, x1: x0 + w, y1: y0 + h };
  }
  // a tiny pig face for the HUD
  function pigIcon(x, y, s, col) {
    ctx.fillStyle = col || '#ffb3c6'; circle(x, y, 7 * s); ctx.fill();
    ctx.fillStyle = '#f08aa8'; ctx.beginPath(); ctx.moveTo(x - 6 * s, y - 3 * s); ctx.lineTo(x - 5 * s, y - 10 * s); ctx.lineTo(x - 1 * s, y - 5 * s); ctx.fill(); ctx.beginPath(); ctx.moveTo(x + 6 * s, y - 3 * s); ctx.lineTo(x + 5 * s, y - 10 * s); ctx.lineTo(x + 1 * s, y - 5 * s); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x, y + 2 * s, 3.5 * s, 2.6 * s, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#c05a7a'; circle(x - 1.2 * s, y + 2 * s, 0.8 * s); ctx.fill(); circle(x + 1.2 * s, y + 2 * s, 0.8 * s); ctx.fill();
    ctx.fillStyle = '#1c1a36'; circle(x - 2.6 * s, y - 2 * s, 0.9 * s); ctx.fill(); circle(x + 2.6 * s, y - 2 * s, 0.9 * s); ctx.fill();
  }

  /* ---------- the HUD ---------- */
  function drawHud(st) {
    const bg = big(), fs = bg ? 20 : 14, h = bg ? 40 : 28;
    const inPen = st.pigs.filter(q => q.state === 'pen').length;
    const wrong = st.stats.wrong;
    const parts = [[fmtTime(G.time), st.rest ? '#9fd8ff' : C.paper], ['   ' + inPen + '/' + st.pigs.length, inPen ? '#ffd6e4' : C.paper], ['Oops ' + wrong, wrong ? '#ffe9a8' : C.paper]];
    ctx.font = '700 ' + fs + 'px ' + FONT;
    const ws = parts.map(q => ctx.measureText(q[0]).width), gap = fs;
    const w = ws.reduce((a, b) => a + b, 0) + gap * (parts.length - 1) + 30, x0 = pill(W - 14, 12, w, h, 'right'), cy = 12 + h / 2 + 0.5;
    let x = x0 + 15;
    parts.forEach((q, i) => { text(q[0], x, cy, fs, q[1], 'left', 'body'); if (i === 1) pigIcon(x + fs * 0.55, cy, bg ? 1.25 : 0.9); x += ws[i] + gap; });
    // the chase map: the track, its gates, the pigs, Pip, Bo and the pen
    const mw = bg ? 190 : 250, mh = bg ? 30 : 24, mx = bg ? W / 2 - mw / 2 + 30 : W / 2 - mw / 2 + 10, my = 12;
    ctx.fillStyle = 'rgba(28,26,54,0.75)'; rr(mx - 10, my, mw + 20, mh + 4, (mh + 4) / 2); ctx.fill();
    const sx = v => mx + clamp(v / Math.max(1, st.len), 0, 1) * mw, ry = my + mh / 2 + 4;
    ctx.fillStyle = 'rgba(255,255,255,0.22)'; rr(mx, ry - 1.5, mw, 3, 1.5); ctx.fill();
    for (const g of st.gates) {
      if (g.kind === 'pen') continue;
      const good = g.kind === 'side' ? !g.open : g.lever ? (g.lever.b === g ? g.open : !g.open) : g.open;
      if (g.lever && g.lever.a === g) continue;
      ctx.fillStyle = good ? C.gold : g.kind === 'side' ? '#ff8a7a' : 'rgba(255,255,255,0.5)';
      if (g.kind === 'side') { circle(sx(g.cx), ry, 3.2); ctx.fill(); } else { rr(sx(g.cx) - 2, ry - 7, 4, 14, 2); ctx.fill(); }
    }
    for (const q of st.pigs) { if (q.state === 'pen') continue; ctx.fillStyle = q.gold ? '#ffd9a0' : '#ffb3c6'; circle(sx(q.state === 'lost' ? q.lx : q.x), ry + 6, bg ? 3.2 : 2.6); ctx.fill(); }
    G.players.forEach((p, i) => {
      const xx = sx(wx(st, p));
      ctx.fillStyle = PCOL[i]; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; circle(xx, ry - 6 + (i ? 1 : -1), bg ? 6 : 4.5); ctx.fill(); ctx.stroke();
    });
    if (st.pen) { ctx.fillStyle = '#e8c86a'; rr(sx(st.pen.x0), ry - 7, Math.max(6, sx(st.pen.x1) - sx(st.pen.x0)), 14, 3); ctx.fill(); pigIcon(sx((st.pen.x0 + st.pen.x1) / 2), ry, bg ? 0.75 : 0.6); }
    // gold help chips under the time pill
    const chips = [];
    if (st.arrow && st.state === 'play') chips.push('GOLD ARROW');
    if (st.oats) chips.push('GOLD OATS: SLOWER PIGS');
    if (st.pigs.some(q => q.state === 'ribbon')) chips.push('GOLD RIBBON');
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
    // job panels, bottom corners (the herder's shows the clap charge)
    for (const id of [0, 1]) {
      const hd = id === st.herder, cpu = isCpu(id), P = st.pl[id];
      const t1 = NAMES[id] + ' · ' + (hd ? 'herder' : 'gatekeeper') + (cpu ? ' (computer)' : '');
      const kk = dev(id) === 'touch' ? 'round button' : key(id, 'act');
      const t2 = cpu ? (hd ? 'chases the pigs home' : 'opens and shuts gates') : (hd ? 'clap: ' + kk : 'gate: ' + kk);
      const pf = bg ? 17 : 13, pf2 = bg ? 15 : 12;
      ctx.font = '700 ' + pf + 'px ' + FONT;
      const pw = Math.max(ctx.measureText(t1).width, (ctx.font = '700 ' + pf2 + 'px ' + FONT, ctx.measureText(t2).width)) + 50;
      const ph = bg ? 50 : 40, px = id === 0 ? 12 : W - 12 - pw, py = H - ph - 8;
      ctx.fillStyle = 'rgba(28,26,54,0.8)'; rr(px, py, pw, ph, 12); ctx.fill();
      ctx.strokeStyle = PCOL[id]; ctx.lineWidth = 2; rr(px, py, pw, ph, 12); ctx.stroke();
      const ix = px + 20, iy = py + ph / 2;
      if (hd) {
        const ch = 1 - clamp(P.cd / PH0.clapCD, 0, 1);
        ctx.strokeStyle = ch >= 1 ? '#fff2a8' : 'rgba(255,242,168,0.6)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(ix, iy, 12, -Math.PI / 2, -Math.PI / 2 + TAU * ch); ctx.stroke();
        ctx.fillStyle = '#ffd9a8'; ctx.beginPath(); ctx.ellipse(ix - 3, iy, 4, 6, -0.3, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(ix + 3, iy, 4, 6, 0.3, 0, TAU); ctx.fill();
      } else {
        // a little gate
        ctx.strokeStyle = '#f2f0e8'; ctx.lineWidth = 2.5; ctx.strokeRect(ix - 10, iy - 6, 20, 12);
        ctx.beginPath(); ctx.moveTo(ix - 10, iy - 6); ctx.lineTo(ix + 10, iy + 6); ctx.moveTo(ix - 10, iy); ctx.lineTo(ix + 10, iy); ctx.stroke();
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
      ctx.save(); ctx.globalAlpha = a;
      const px = pill(W / 2, ny, nw, nh, 'center');
      if (n.gold) { ctx.strokeStyle = C.gold; ctx.lineWidth = 2; rr(px, ny, nw, nh, nh / 2); ctx.stroke(); }
      text(n.s, W / 2, ny + nh / 2 + 0.5, nfs, n.gold ? C.gold : C.paper, 'center', 'body');
      ctx.restore();
    }
  }

  /* ---------- sounds ---------- */
  Sfx.extra.pigherdOink = function (p) { p = p || 1; this.tone(220 * p, 0.09, 'square', 0.03, 160 * p); this.tone(200 * p, 0.12, 'sawtooth', 0.02, 140 * p, 0.1); };
  Sfx.extra.pigherdSqueal = function () { this.tone(900, 0.16, 'triangle', 0.035, 1500); this.tone(1300, 0.14, 'sine', 0.02, 900, 0.12); };
  Sfx.extra.pigherdClap = function (p) { p = p || 1; this.tone(1800 * p, 0.03, 'square', 0.05, 600 * p); this.tone(1400 * p, 0.04, 'square', 0.04, 500 * p, 0.05); };
  Sfx.extra.pigherdGate = function () { this.tone(330, 0.15, 'sawtooth', 0.018, 420); this.tone(660, 0.1, 'triangle', 0.04, null, 0.12); };
  Sfx.extra.pigherdLatch = function () { this.tone(500, 0.05, 'square', 0.035, 300); this.tone(880, 0.1, 'triangle', 0.045, null, 0.06); };
  Sfx.extra.pigherdLever = function () { this.tone(180, 0.1, 'square', 0.035, 120); this.tone(660, 0.12, 'triangle', 0.04, null, 0.08); };
  Sfx.extra.pigherdBarn = function () { this.tone(110, 0.5, 'sawtooth', 0.02, 160); this.tone(220, 0.25, 'triangle', 0.025, 300, 0.2); };
  Sfx.extra.pigherdMud = function () { this.tone(140, 0.22, 'sine', 0.06, 70); this.tone(90, 0.2, 'triangle', 0.03, 60, 0.08); };
  Sfx.extra.pigherdSplash = function () { this.tone(500, 0.2, 'triangle', 0.035, 150); this.tone(1200, 0.15, 'sine', 0.02, 400, 0.05); };
  Sfx.extra.pigherdOops = function () { this.tone(520, 0.12, 'triangle', 0.04, 390); this.tone(390, 0.18, 'triangle', 0.04, 300, 0.12); };
  Sfx.extra.pigherdShoo = function () { this.tone(300, 0.08, 'square', 0.025, 380); this.tone(450, 0.12, 'square', 0.025, 360, 0.09); };
  Sfx.extra.pigherdHay = function () { this.tone(90, 0.1, 'sawtooth', 0.018, 70); };
  Sfx.extra.pigherdThud = function () { this.tone(110, 0.2, 'sine', 0.07, 60); };
  Sfx.extra.pigherdNo = function () { this.tone(300, 0.1, 'triangle', 0.03, 220); };
  Sfx.extra.pigherdGold = function () { [784, 988, 1319].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.05, null, i * 0.06)); };
  Sfx.extra.pigherdAllIn = function () { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.13, 'triangle', 0.055, null, i * 0.08)); this.tone(220, 0.1, 'square', 0.02, 160, 0.4); };
  Sfx.extra.pigherdWin = function () { [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => this.tone(f, 0.18, 'triangle', 0.06, null, i * 0.1)); };
})();
