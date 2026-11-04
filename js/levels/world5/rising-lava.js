/* Pip & Bo - Level 5-4 Rising Lava (team). */
'use strict';

/* ===== MODES.lava — 5-4 Rising Lava (World 5 "Road Trip", teamwork) =====
   Climb a volcano tower, four floors, while the lava rises. Every button builds steps in your PARTNER's colour
   (orange blocks hold only Pip, blue blocks only Bo), so you leapfrog up: I press, you climb. Kid-friendly lava:
   it waits for the card, never reaches the top walkway, sinks back and slows down after an ouch, takes a breather,
   can't touch you while you hold a plate, and waits when nobody plays or while one of you waits for the other to come
   back. Standing where your own step should pop in? The rest pops in, and after a moment the step lifts you
   up onto it ("boing") or, with no room above, a hint + arrow say "scoot over".
   Spec: team/lava/SPEC.md (lead-reviewed).
   Map chars (this mode parses them itself): d e f g = Pip's buttons -> blue groups 3 4 5 6; h i j m = Bo's buttons
   -> orange groups 7 8 9 0; y / z = star buttons; Y = hatch; + = ice pop. room.lava.holds lists the hold plates.
   Every global here is prefixed (LAVA, LAVA_BTN, lavaKey, Sfx.extra.lava*); all state lives in G.mst. */
const LAVA = {
  // rules, per floor (a room's def.lava overrides any of them)
  startY: 525, delay: 4, speed: 8, catchGap: 210, catchMul: 2.5, capY: 170,
  sinkGap: 120, pauseAfterOuch: 2.0, assistStep: 0.85, assistMin: 0.5, killDepth: 4,
  breatherN: 2, breatherWindow: 20, breatherWait: 4, freeze: 5, holdGrace: 0.5, twinHold: 0.25,
  returnHold: 1.0, returnShow: 0.15, afkPause: 10, waitStill: 3, waitBack: 30, autoReturn: 8, autoRows: 3, buildStep: 0.06, strandT: 3, holdShield: 30,
  surge: null, holds: '',
  // feedback only (s / px)
  heatGap: 45, hintLife: 2.5, lowHint: 3, strandHint: 1, nopeHint: 0.4, startMsg: 1.5, breatherMsg: 3, blockHint: 0.6,
};
// button char -> [owner, block group]; Pip's buttons build blue (Bo's) blocks, Bo's build orange (Pip's) blocks
const LAVA_BTN = { d: [0, '3'], e: [0, '4'], f: [0, '5'], g: [0, '6'], h: [1, '7'], i: [1, '8'], j: [1, '9'], m: [1, '0'] };
// the player's own "down" key for hint bubbles: "S" / "↓" (keyboard), "stick ↓" (controller), "▼" (touch); same test as golfKeys
function lavaKey(id) {
  const touch = document.documentElement.classList.contains('has-touch') && Pads.kind === 'touch';
  const pad = Pads.kind === 'pad' && padFor(padSlots(), id);
  return pad ? 'stick ↓' : touch ? '▼' : id === 0 ? 'S' : '↓';
}
MODES.lava = {
  rand: Math.random,   // cosmetic randomness only (bubbles, embers, smoke); tests swap in a seeded one
  setup(st, L) {       // match-long stats, then floor 1
    st.ouch = [0, 0]; st.presses = [0, 0]; st.ices = 0; st.closest = [999, 999]; st.near = [999, 999]; st.floorT = []; st.floorStart = 0; st.returns = [0, 0];
    st.breathers = 0; st.cpHits = 0; st.strands = 0; st.popN = 0; st.lifts = 0;
    MODES.lava.initFloor(st, L);
  },
  room(k, L) { const st = G.mst; MODES.lava.nearDone(st, 0); MODES.lava.nearDone(st, 1); st.floorT.push(G.time - st.floorStart); st.floorStart = G.time; MODES.lava.initFloor(st, L); },
  // everything per floor: parse the markers out of the grid (before the first draw), lava, checkpoints, feedback
  initFloor(st, L) {
    const cfg = st.cfg = Object.assign({}, LAVA, L.def.lava || {});
    st.buttons = []; st.groups = {}; st.icePops = []; st.hatch = []; st.twins = []; st.hatchOpen = false; st.twinT = 0;
    const onPlank = (c, r) => !!(L.grid[r + 1] && L.grid[r + 1][c] === '=');
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const ch = L.grid[r][c];
      if (LAVA_BTN[ch]) {
        const [owner, g] = LAVA_BTN[ch];
        st.buttons.push({ c, r, ch, owner, group: g, hold: cfg.holds.includes(ch), down: false, latched: false, odown: false, wig: 0, plank: onPlank(c, r) });
        L.grid[r][c] = '.';
      } else if (ch === 'y' || ch === 'z') {
        st.twins.push({ c, r, owner: ch === 'y' ? 0 : 1, down: false, odown: false, wig: 0, plank: onPlank(c, r) });
        L.grid[r][c] = '.';
      } else if ('34567890'.includes(ch)) {
        const blue = '3456'.includes(ch);
        (st.groups[ch] = st.groups[ch] || { g: ch, cells: [], state: 'hidden', fadeT: 0, buildT: 0, tile: blue ? 'u' : 'o', holder: blue ? 1 : 0,
          popN: 0, fresh: 0, waitK: -1, blockT: 0, blkDir: 0, btn: null, invite: false }).cells.push({ c, r, on: false, flash: 0 });
        L.grid[r][c] = '.';
      } else if (ch === 'Y') { st.hatch.push({ c, r }); L.grid[r][c] = 'P'; L.blockCol[r][c] = '#8a6a5a'; }
      else if (ch === '+') { st.icePops.push({ x: c * T + T / 2, y: r * T + T / 2, got: false, ph: ((c * 7 + r * 3) % 10) / 10 }); L.grid[r][c] = '.'; }
    }
    L.crack = null;
    // build order: nearest to its button first (ties keep map order)
    for (const b of st.buttons) {
      const gr = st.groups[b.group];
      if (gr) { gr.btn = b; gr.cells.sort((p, q) => Math.hypot(p.c - b.c, p.r - b.r) - Math.hypot(q.c - b.c, q.r - b.r)); }
    }
    st.lavaY = cfg.startY; st.wait = cfg.delay; st.freezeT = 0; st.assist = 1; st.surgeT = cfg.surge ? cfg.surge.every : 0; st.surging = 0;
    st.warned = false; st.started = false;
    st.cp = L.spawns.map(s => ({ c: Math.floor((s.x + PW / 2) / T), r: Math.round((s.y + PH) / T) - 1 }));
    st.zones = (L.def.cps || [[], []]).map(l => [null].concat(l)); st.cpIdx = [0, 0]; st.strand = L.def.strand || [[], []]; st.strandT = [0, 0];
    st.afk = [0, 0]; st.downT = [0, 0]; st.lowT = [0, 0]; st.paused = false; st.waitingFor = -1; st.ouchF = [0, 0]; st.ouchTimes = [[], []];
    st.best = L.spawns.map(sp => sp.y + PH); st.sinceUp = [0, 0];   // highest feet so far this floor; time since it rose
    st.prevDown = [true, true]; st.downOk = [false, false];   // a ▼ held into a new floor must be let go and pressed again
    // feedback state
    st.bubbles = []; st.embers = []; st.bubT = 0; st.embT = 0; st.bubSnd = 0; st.zips = [];
    st.hints = [null, null]; st.hinted = {}; st.nopeT = [0, 0]; st.heat = [false, false]; st.hotCD = [0, 0];
    st.startT = 0; st.breatherT = 0; st.ouchHint = [false, false];
  },
  // a button needs weight: its owner standing on the floor of the button's cell (not jumping through it, not on a head).
  // vy >= 0: the engine counts a player as grounded for a tick while their feet pass UP through a plank line
  standingOn(p, c, r) {
    return p.alive && p.grounded && p.tileGround && p.vy >= 0 && Math.abs(p.y + p.h - (r + 1) * T) < 1.5 && p.x < c * T + T - 4 && p.x + p.w > c * T + 4;
  },
  // standing on any button, hold plate or star (anyone's): the ▼-hold hop-back is off there
  onAnyButton(p) {
    const st = G.mst, M = MODES.lava;
    return st.buttons.some(b => M.standingOn(p, b.c, b.r)) || st.twins.some(tw => M.standingOn(p, tw.c, tw.r));
  },
  // the holder of a hold plate is safe: the lava stays below them
  shielded(p) { return G.mst.buttons.some(b => b.hold && b.down && b.owner === p.id); },
  // q stands on one of the group's built cells
  onGroup(q, gr) {
    return q.alive && q.grounded && gr.cells.some(cl => cl.on && Math.abs(q.y + q.h - cl.r * T) < 1.5 && q.x < cl.c * T + T && q.x + q.w > cl.c * T);
  },
  cellBlockedFor(cell, tileCh) {
    return G.players.some(p => p.alive && solidFor(tileCh, p) && rectHit(p, cell.c * T, cell.r * T, T, T));
  },
  // the holder stands where one of their steps should pop in: which way to scoot (nearest spot left or right that
  // overlaps none of the group's missing cells and that they can walk to; 0 = none within 4 cells)
  blockDir(gr, p) {
    const miss = gr.cells.filter(cl => !cl.on);
    const inMiss = x => miss.some(cl => x < cl.c * T + T && x + p.w > cl.c * T && p.y < cl.r * T + T && p.y + p.h > cl.r * T);
    const solidAt = x => {
      const c1 = Math.floor(x / T), c2 = Math.floor((x + p.w - 0.01) / T), r1 = Math.floor(p.y / T), r2 = Math.floor((p.y + p.h - 0.01) / T);
      for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) if (solidFor(tile(c, r), p)) return true;
      return false;
    };
    const open = { '-1': true, '1': true };
    for (let d = 2; d <= 4 * T; d += 2) for (const s of [-1, 1]) {
      if (!open[s]) continue;
      const x = p.x + s * d;
      if (solidAt(x)) { open[s] = false; continue; }
      if (!inMiss(x)) return s;
    }
    return 0;
  },
  buildCell(gr, cl) {
    const st = G.mst;
    cl.on = true; G.level.grid[cl.r][cl.c] = gr.tile; cl.flash = 0.15; gr.popN++; gr.fresh++;
    st.popN = gr.popN; Sfx.play('lavaBlock');
    puff(cl.c * T + T / 2, cl.r * T + T / 2, 6, PCOL[gr.holder]);
  },
  // the holder has stood in their own missing step(s) for blockHint s: lift them on top of that step (or of the
  // pillar it is the foot of, at most 3 cells), if there is room above (no solid tile, no other missing cell of the
  // group, not the partner). Returns true if lifted.
  liftHolder(gr, p) {
    if (!p.alive || !p.grounded) return false;
    const mine = gr.cells.filter(cl => !cl.on && rectHit(p, cl.c * T, cl.r * T, T, T));
    if (!mine.length) return false;
    const inGroup = (c, r) => gr.cells.some(cl => cl.c === c && cl.r === r);
    let top = 1e9;
    for (const cl of mine) { let r = cl.r; while (r > cl.r - 2 && inGroup(cl.c, r - 1)) r--; top = Math.min(top, r); }
    const y = top * T - p.h, x = p.x;
    if (y < 0) return false;
    const c1 = Math.floor(x / T), c2 = Math.floor((x + p.w - 0.01) / T), r1 = Math.floor(y / T), r2 = Math.floor((y + p.h - 0.01) / T);
    for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) if (solidFor(tile(c, r), p)) return false;
    const hit = (ax, ay, aw, ah) => x < ax + aw && x + p.w > ax && y < ay + ah && y + p.h > ay;
    if (gr.cells.some(cl => !cl.on && !mine.includes(cl) && hit(cl.c * T, cl.r * T, T, T))) return false;
    const o = other(p);
    if (o.alive && hit(o.x, o.y, o.w, o.h)) return false;
    p.y = y; p.vy = 0; p.grounded = false;
    puff(x + p.w / 2, y + p.h, 8, PCOL[p.id]);
    return true;
  },
  // standing on one of your own buttons, plates or stars (doing your job, even when standing still)
  onOwnButton(p) {
    const st = G.mst, M = MODES.lava;
    return st.buttons.some(b => b.owner === p.id && M.standingOn(p, b.c, b.r)) || st.twins.some(tw => tw.owner === p.id && M.standingOn(p, tw.c, tw.r));
  },
  setGroup(gr, on) {
    if (on) {
      if (gr.state === 'hidden' || gr.state === 'fading') { if (gr.state === 'hidden') { gr.buildT = 0; gr.popN = 0; } gr.fresh = 0; gr.state = 'building'; }
    } else if (gr.state === 'building' || gr.state === 'on') {
      gr.state = 'fading'; gr.fadeT = G.mst.cfg.holdGrace;
      if (gr.cells.some(cl => cl.on)) { Sfx.play('lavaBlink'); rumble(gr.holder, 0.2, 0.4, 150); }
    }
  },
  hint(k, text, opt = {}) {
    if (cpuSolo() && cpuOn(k) && !opt.always) return; // (1-player mode: no how-to hints over the computer's head)
    G.mst.hints[k] = { text, t: 0, life: opt.life || G.mst.cfg.hintLife, group: opt.group || null };
  },
  hintOnce(key, k, text) { const st = G.mst; if (st.hinted[key]) return; st.hinted[key] = true; MODES.lava.hint(k, text); },
  // pop back to your checkpoint (▼ hold, stranded, far below): no ouch
  hopBack(p) {
    const st = G.mst, k = p.id;
    st.returns[k]++; st.downT[k] = 0; st.lowT[k] = 0; st.strandT[k] = 0;
    respawn(p); MODES.lava.fixSpawn(p);
    Sfx.play('lavaPopBack', k); rumble(k, 0, 0.3, 80);
  },
  openHatch() {
    const st = G.mst, L = G.level;
    st.hatchOpen = true; L.crack = null;
    for (const h of st.hatch) { L.grid[h.r][h.c] = '.'; burst(h.c * T + T / 2, h.r * T + T / 2, '#8a6a5a', 10); }
    for (let i = 0; i < 36; i++) confetti(W / 2, 75);
    Sfx.play('lavaHatch'); rumble(0, 0.6, 0.6, 300); rumble(1, 0.6, 0.6, 300);
    if (!reduceMotion) G.shake = Math.max(G.shake, 0.15);
  },
  // before the players move: kids hold ▼ to "press harder", so ▼ never drops you through a plank while you stand on a button or star
  pre() {
    const st = G.mst, M = MODES.lava;
    if (!st.buttons) return;
    for (const p of G.players) {
      if (!p.alive || !p.grounded || !p.onOneWay) continue;
      if (st.buttons.some(b => b.plank && M.standingOn(p, b.c, b.r)) || st.twins.some(tw => tw.plank && M.standingOn(p, tw.c, tw.r))) p.downLatch = true;
    }
  },
  step(dt) {
    const st = G.mst, cfg = st.cfg, L = G.level, ps = G.players, M = MODES.lava;
    // --- buttons (owner only) ---
    for (const b of st.buttons) {
      const p = ps[b.owner], q = ps[1 - b.owner], gr = st.groups[b.group];
      const on = M.standingOn(p, b.c, b.r);
      if (on && !b.down) {
        puff(b.c * T + T / 2, b.r * T + 22, 5, PCOL[b.owner]);
        if (b.hold || !b.latched) {   // a press that does something (a latch's first, every hold-plate press) counts and chimes
          st.presses[b.owner]++; Sfx.play('lavaPress', b.owner); rumble(b.owner, 0.1, 0.35, 80);
          if (gr && gr.state === 'hidden') {
            const c0 = gr.cells[0];
            st.zips.push({ x0: b.c * T + T / 2, y0: b.r * T + 20, x1: c0.c * T + T / 2, y1: c0.r * T + T / 2, t: 0, col: PCOL[gr.holder] });
          }
        }
      }
      // stepping off a hold plate while the partner stands on its blocks
      if (b.hold && b.down && !on && gr && M.onGroup(q, gr)) M.hintOnce('stay' + b.ch, b.owner, 'Stay on it!');
      b.down = on;
      // the partner on your button: nothing happens (a wiggle and a "nope")
      const qOn = M.standingOn(q, b.c, b.r);
      if (qOn && !b.odown) { b.wig = 0.3; Sfx.play('lavaNope', q.id); }
      b.odown = qOn;
      if (!gr) continue;
      if (b.hold) M.setGroup(gr, on);
      else if (on && !b.latched) { b.latched = true; M.setGroup(gr, true); }
    }
    // standing on the partner's button for a moment: tell them whose it is (once per floor)
    for (const q of ps) {
      const theirs = st.buttons.some(b => b.owner !== q.id && M.standingOn(q, b.c, b.r)) || st.twins.some(tw => tw.owner !== q.id && M.standingOn(q, tw.c, tw.r));
      st.nopeT[q.id] = theirs ? st.nopeT[q.id] + dt : 0;
      if (st.nopeT[q.id] >= cfg.nopeHint) M.hintOnce('nope' + q.id, q.id, 'That’s ' + NAMES[1 - q.id] + '’s button!');
    }
    // --- groups: build one cell per buildStep, in order; a cell the player it holds is standing in is skipped and pops in
    //     as soon as they move (after blockHint s: a "scoot over" hint, an arrow and a soft bloop); fade ---
    for (const gr of Object.values(st.groups)) {
      for (const cl of gr.cells) if (cl.flash > 0) cl.flash -= dt;
      if (gr.state === 'building') {
        gr.buildT += dt;
        const want = Math.min(gr.cells.length, 1 + Math.floor(gr.buildT / cfg.buildStep));
        gr.waitK = -1;
        for (let k = 0; k < Math.min(want, gr.cells.length); k++) {
          const cl = gr.cells[k];
          if (cl.on) continue;
          if (M.cellBlockedFor(cl, gr.tile)) { if (gr.waitK < 0) gr.waitK = k; continue; }
          M.buildCell(gr, cl);
        }
        if (gr.waitK >= 0) {
          const was = gr.blockT;
          gr.blockT += dt;
          if (gr.blockT >= cfg.blockHint && M.liftHolder(gr, ps[gr.holder])) {
            // standing in it for a moment: the step pops in under your feet and lifts you up ("boing")
            for (let k = gr.waitK; k < Math.min(want, gr.cells.length); k++) { const cl = gr.cells[k]; if (!cl.on && !M.cellBlockedFor(cl, gr.tile)) M.buildCell(gr, cl); }
            gr.waitK = gr.cells.findIndex((cl, k) => k < want && !cl.on);
            st.lifts++; Sfx.play('lavaBoing', gr.holder); rumble(gr.holder, 0.15, 0.3, 90);
            if (gr.waitK < 0) gr.blockT = 0;
          } else {
            if (was < cfg.blockHint && gr.blockT >= cfg.blockHint) {   // nowhere to be lifted to: say "scoot over" (+ an arrow)
              M.hintOnce('blk' + gr.g, gr.holder, 'Scoot over! Your step pops in here');
              Sfx.play('lavaBloop', gr.holder); rumble(gr.holder, 0, 0.2, 60);
            }
            if (gr.blockT >= cfg.blockHint) gr.blkDir = M.blockDir(gr, ps[gr.holder]);
          }
        } else gr.blockT = 0;
        const all = gr.cells.every(cl => cl.on);
        if (all) {
          gr.state = 'on';
          if (gr.fresh > 0) { Sfx.play('lavaReady', gr.holder); rumble(gr.holder, 0, 0.3, 90); M.hint(gr.holder, 'Your steps!', { group: gr }); }
        }
      } else if (gr.state === 'fading') {
        gr.fadeT -= dt; gr.waitK = -1; gr.blockT = 0;
        if (gr.fadeT <= 0) { gr.state = 'hidden'; for (const cl of gr.cells) { cl.on = false; L.grid[cl.r][cl.c] = '.'; } Sfx.play('lavaFade'); }
      }
    }
    // --- star buttons -> hatch (both owners on their own star together for twinHold) ---
    if (st.twins.length) {
      for (const tw of st.twins) {
        const p = ps[tw.owner], q = ps[1 - tw.owner];
        const on = M.standingOn(p, tw.c, tw.r);
        if (on && !tw.down && !st.hatchOpen) {
          st.presses[tw.owner]++; Sfx.play('lavaStar', tw.owner); rumble(tw.owner, 0.1, 0.35, 80);
          puff(tw.c * T + T / 2, tw.r * T + 18, 6, C.gold);
        }
        tw.down = on;
        const qOn = M.standingOn(q, tw.c, tw.r);
        if (qOn && !tw.odown) { tw.wig = 0.3; Sfx.play('lavaNope', q.id); }
        tw.odown = qOn;
      }
      if (!st.hatchOpen) {
        if (st.twins.every(tw => tw.down)) {
          st.twinT += dt;
          if (!L.crack) { L.crack = {}; for (const h of st.hatch) L.crack[h.r * COLS + h.c] = 1; Sfx.play('crack'); }
          if (st.twinT >= cfg.twinHold) M.openHatch();
        } else { st.twinT = 0; L.crack = null; }
      }
    }
    // --- ice pops: freeze the lava (resets to `freeze` s, doesn't stack) ---
    for (const ic of st.icePops) {
      if (ic.got || !ps.some(p => p.alive && rectHit(p, ic.x - 12, ic.y - 12, 24, 24))) continue;
      ic.got = true; st.ices++; st.freezeT = cfg.freeze;
      Sfx.play('lavaFreeze'); rumble(0, 0.1, 0.25, 120); rumble(1, 0.1, 0.25, 120); burst(ic.x, ic.y, '#bff0ff', 14);
    }
    // --- checkpoints: designer zones per player (ordered, forward only, your own route); wrong-side strand boxes ---
    for (const p of ps) {
      if (!p.alive || !p.grounded || !p.tileGround) continue;
      const fr = Math.round((p.y + p.h) / T);
      if (Math.abs(p.y + p.h - fr * T) > 1.5) continue;
      const c = Math.floor((p.x + p.w / 2) / T), r = fr - 1, k = p.id, Z = st.zones[k];
      for (let z = Z.length - 1; z > st.cpIdx[k]; z--) {
        const zn = Z[z];
        if (r === zn.r && c >= zn.c0 && c <= zn.c1) {
          st.cpIdx[k] = z; st.cp[k] = { c: zn.at[0], r: zn.at[1] };
          G.spawnPts[k] = { x: zn.at[0] * T + (T - PW) / 2, y: (zn.at[1] + 1) * T - PH };
          st.cpHits++; Sfx.play('lavaCheck', k); puff(p.x + p.w / 2, p.y + p.h, 6, C.gold);
          break;
        }
      }
      const inStrand = (st.strand[k] || []).some(b => c >= b[0] && c <= b[2] && r >= b[1] && r <= b[3]);
      if (inStrand) {
        st.strandT[k] += dt;
        if (st.strandT[k] >= cfg.strandHint) M.hintOnce('low' + k, k, 'Hold ' + lavaKey(k) + ' to hop back up');
        if (st.strandT[k] >= cfg.strandT) { st.strands++; M.hopBack(p); }
      } else st.strandT[k] = 0;
    }
    // --- AFK, hold ▼ to hop back (a press that started where it may count; never on a button/plate/star), auto-return ---
    for (const p of ps) {
      const i = p.input, k = p.id;
      st.afk[k] = (i.left || i.right || i.jump || i.down || i.up) ? 0 : st.afk[k] + dt;
      const canHold = p.alive && p.grounded && !i.left && !i.right && !p.onOneWay && !M.onAnyButton(p);
      if (i.down && !st.prevDown[k]) st.downOk[k] = canHold;
      if (!i.down || !canHold) st.downOk[k] = false;
      st.prevDown[k] = i.down;
      if (st.downOk[k]) {
        st.downT[k] += dt;
        if (st.downT[k] >= cfg.returnHold) { st.downOk[k] = false; M.hopBack(p); }
      } else st.downT[k] = 0;
      if (p.alive && Math.floor((p.y + p.h - 1) / T) > st.cp[k].r + cfg.autoRows) {
        st.lowT[k] += dt;
        if (st.lowT[k] >= cfg.lowHint) M.hintOnce('low' + k, k, 'Hold ' + lavaKey(k) + ' to hop back up');
        if (st.lowT[k] >= cfg.autoReturn) M.hopBack(p);
      } else st.lowT[k] = 0;
    }
    st.paused = Math.min(st.afk[0], st.afk[1]) > cfg.afkPause;
    // one player gone for a while (no input for afkPause s, and not standing on their own button/plate/star) while the other
    // one stands where they got to (their highest point) and has not climbed for waitStill s: the lava waits (and backs off
    // to a fair gap), so the partner waiting for them isn't burned for it
    // (any key from the gone player, or the other one climbing on, and it rises again)
    for (const p of ps) {
      const feet = p.y + p.h;
      if (p.alive && p.grounded && feet < st.best[p.id] - T / 2) { st.best[p.id] = feet; st.sinceUp[p.id] = 0; }
      else st.sinceUp[p.id] += dt;
    }
    st.waitingFor = -1;
    if (!st.paused) for (const p of ps) {
      const o = ps[1 - p.id], atBest = o.alive && o.y + o.h <= st.best[o.id] + T;   // the other one is up where they got to, not fumbling below it
      if (st.afk[p.id] > cfg.afkPause && !(p.alive && M.onOwnButton(p)) && atBest && st.sinceUp[o.id] >= cfg.waitStill) st.waitingFor = p.id;
    }
    // --- the lava: waits for the card and its delay, then freeze / AFK pause / surges / assist / catch-up, capped ---
    if (G.introT <= 0) {
      if (st.wait > 0) st.wait -= dt;
      else if (st.freezeT > 0) { st.freezeT -= dt; if (st.freezeT <= 0) { st.freezeT = 0; Sfx.play('lavaThaw'); } }
      else if (!st.paused) {
        if (!st.started) { st.started = true; st.startT = cfg.startMsg; Sfx.play('lavaStart'); }
        let v = cfg.speed;
        if (cfg.surge && st.waitingFor < 0) {
          st.surgeT -= dt;
          if (st.surgeT <= cfg.surge.warn && !st.warned) { st.warned = true; Sfx.play('lavaRumble'); rumble(0, 0.15, 0.45, 400); rumble(1, 0.15, 0.45, 400); }
          if (st.surgeT <= 0) {
            st.surging = cfg.surge.time; st.surgeT = cfg.surge.every; st.warned = false;
            Sfx.play('lavaSurge'); rumble(0, 0.5, 0.6, 400); rumble(1, 0.5, 0.6, 400);
            if (!reduceMotion) G.shake = Math.max(G.shake, 0.12);
          }
          if (st.surging > 0) { st.surging -= dt; v = cfg.surge.speed; }
        }
        v *= st.assist;
        const feet = ps.map(p => p.alive ? p.y + p.h : (st.cp[p.id].r + 1) * T);
        if (st.lavaY - Math.max(...feet) > cfg.catchGap) v *= cfg.catchMul;
        if (st.waitingFor >= 0) {   // waiting for the gone player: hold still and ease back to a fair gap below the lowest player
          v = 0; st.surging = 0; const back = Math.min(cfg.startY, Math.max(...feet) + cfg.sinkGap);
          if (st.lavaY < back) st.lavaY = Math.min(back, st.lavaY + cfg.waitBack * dt);
        }
        st.lavaY = Math.max(cfg.capY, st.lavaY - v * dt);
      }
      // plate shield: whoever holds a hold plate is never punished for it
      for (const b of st.buttons) if (b.hold && b.down) { const q = ps[b.owner]; st.lavaY = Math.max(st.lavaY, q.y + q.h + cfg.holdShield); }
    }
    // --- ouch + closest call ---
    for (const p of ps) {
      if (!p.alive) continue;
      const gap = st.lavaY - (p.y + p.h);
      // a close call only counts once it is over and the player got away (an ouch is not a close call)
      if (gap > -cfg.killDepth && st.started && !M.shielded(p)) st.near[p.id] = Math.min(st.near[p.id], Math.max(0, gap));
      if (gap >= cfg.heatGap) M.nearDone(st, p.id);
      if (gap <= -cfg.killDepth) kill(p);
    }
    M.fx(dt);
  },
  // feedback that moves with the game clock: timers, heat warnings, bubbles, embers (cosmetic; MODES.lava.rand)
  fx(dt) {
    const st = G.mst, cfg = st.cfg, R = MODES.lava.rand, frozen = st.freezeT > 0, onScreen = st.lavaY < H;
    if (st.startT > 0) st.startT -= dt;
    if (st.breatherT > 0) st.breatherT -= dt;
    for (const b of st.buttons) if (b.wig > 0) b.wig -= dt;
    for (const tw of st.twins) if (tw.wig > 0) tw.wig -= dt;
    for (let i = st.zips.length - 1; i >= 0; i--) if ((st.zips[i].t += dt) >= 0.2) st.zips.splice(i, 1);
    for (const p of G.players) {
      const k = p.id, h = st.hints[k];
      if (h && (h.t += dt) >= h.life) st.hints[k] = null;
      if (st.hotCD[k] > 0) st.hotCD[k] -= dt;
      const hot = p.alive && !frozen && G.introT <= 0 && st.lavaY - (p.y + p.h) < cfg.heatGap && !MODES.lava.shielded(p);
      if (hot && !st.heat[k] && st.hotCD[k] <= 0) { Sfx.play('lavaHot', k); rumble(k, 0, 0.25, 80); st.hotCD[k] = 1.2; }
      st.heat[k] = hot;
    }
    if (st.bubSnd > 0) st.bubSnd -= dt;
    if (frozen || !onScreen) { st.bubbles.length = 0; }
    else {
      st.bubT -= dt;
      const every = st.warned ? 0.06 : 0.18;
      while (st.bubT <= 0) { st.bubT += every; if (st.bubbles.length < 60) st.bubbles.push({ x: 8 + R() * (W - 16), d: 6 + R() * 24, r: 2.5 + R() * 2.5 }); }
    }
    for (let i = st.bubbles.length - 1; i >= 0; i--) {
      const b = st.bubbles[i];
      b.d -= 30 * dt;
      if (b.d > 0) continue;
      st.bubbles.splice(i, 1);
      for (const s of [-1, 1]) st.embers.push({ x: b.x + s * 2, y: st.lavaY - 2, vx: s * (20 + R() * 25), vy: -50 - R() * 40, life: 0.35, max: 0.35, size: 1.8, col: '#ffcf6b', grav: 320 });
      if (st.bubSnd <= 0) { Sfx.play('lavaBubble'); st.bubSnd = 0.5; }
    }
    if (onScreen && !frozen && !reduceMotion) {
      st.embT -= dt;
      while (st.embT <= 0) {
        st.embT += 0.35;
        const life = 1.2 + R() * 0.8;
        st.embers.push({ x: R() * W, y: st.lavaY - 2, vx: (R() * 2 - 1) * 15, vy: -40 - R() * 50, life, max: life, size: 2, col: '#ffb04a', grav: 0 });
      }
    }
    for (let i = st.embers.length - 1; i >= 0; i--) {
      const e = st.embers[i];
      if ((e.life -= dt) <= 0) { st.embers.splice(i, 1); continue; }
      e.vy += e.grav * dt; e.x += e.vx * dt; e.y += e.vy * dt;
    }
    if (st.embers.length > 120) st.embers.splice(0, st.embers.length - 120);
  },
  nearDone(st, k) { st.closest[k] = Math.min(st.closest[k], st.near[k]); st.near[k] = 999; },
  onKill(p) {
    const st = G.mst, cfg = st.cfg, k = p.id, R = MODES.lava.rand;
    st.near[k] = 999;
    const ly = Math.min(st.lavaY, H - 6), x = p.x + p.w / 2;
    st.ouch[k]++; st.ouchF[k]++;
    // the lava sinks below the lower checkpoint and waits; each ouch makes it 15 % slower on this floor
    const low = Math.max((st.cp[0].r + 1) * T, (st.cp[1].r + 1) * T);
    st.lavaY = Math.max(st.lavaY, low + cfg.sinkGap);
    st.wait = Math.max(st.wait, cfg.pauseAfterOuch);
    // two ouches for the same player close together: the volcano takes a breather (lava drains to the bottom)
    const ts = st.ouchTimes[k]; ts.push(G.time); while (ts.length && G.time - ts[0] > cfg.breatherWindow) ts.shift();
    if (ts.length >= cfg.breatherN) {
      ts.length = 0; st.lavaY = Math.max(st.lavaY, cfg.startY); st.wait = Math.max(st.wait, cfg.breatherWait); st.breathers++;
      st.breatherT = cfg.breatherMsg; Sfx.play('lavaBreather');
    }
    st.assist = Math.max(cfg.assistMin, st.assist * cfg.assistStep);
    st.ouchHint[k] = true; st.downT[k] = 0; st.downOk[k] = false;
    Sfx.play('lavaSizzle');
    burst(x, ly, '#ff8a3d', 12);
    for (let i = 0; i < 6; i++) G.particles.push({ x: x + (R() - 0.5) * 16, y: ly, vx: (R() * 2 - 1) * 20, vy: -40 - R() * 30, life: 0.9, max: 0.9, col: 'rgba(90,80,90,0.6)', size: 5 + R() * 3, grav: -30, kind: 'dot' });
  },
  onRespawn(p) {
    const st = G.mst;
    MODES.lava.fixSpawn(p);
    if (st.ouchHint[p.id]) { st.ouchHint[p.id] = false; MODES.lava.hint(p.id, 'Ouch! Hot toes!', { life: 1.6, always: true }); }
  },
  // a block may have appeared on the checkpoint: slide to the nearest free spot on that row (right first), then rows above
  fixSpawn(p) {
    const free = (x, y) => {
      const c1 = Math.floor(x / T), c2 = Math.floor((x + PW - 0.01) / T), r1 = Math.floor(y / T), r2 = Math.floor((y + PH - 0.01) / T);
      for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) if (solidFor(tile(c, r), p)) return false;
      return true;
    };
    if (free(p.x, p.y)) return;
    for (let dr = 0; dr <= 3; dr++) for (let k = 1; k <= 8; k++) for (const s of [1, -1]) {
      const x = p.x + s * k * T, y = p.y - dr * T;
      if (free(x, y)) { p.x = x; p.y = y; return; }
    }
  },

  /* ---------- drawing ---------- */
  star(x, y, ro, ri) {   // a 5-point star path
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? ri : ro; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
    ctx.closePath();
  },
  // where things sit above a head: the go-back ring, then the heat "!", then a hint bubble
  // (on phones, hudBig(), the ring is 1.6x bigger so it reads on a small screen)
  headStack(p) {
    const st = G.mst, heat = st.heat[p.id], rs = hudBig() ? 1.6 : 1;
    const ring = st.downT[p.id] >= st.cfg.returnShow || (!st.hatchOpen && st.twins.some(tw => tw.down && tw.owner === p.id));
    const ringR = 9 * rs, ringY = p.y - 7 - ringR, heatY = ring ? ringY - ringR - 15 : p.y - 18;
    const top = Math.min(ring ? ringY - ringR - 2 : p.y - 6, heat ? heatY - 11 : 1e9);
    return { ring, heat, ringR, rs, ringY, heatY, bubbleBottom: top - 4 };
  },
  draw() {
    const st = G.mst, M = MODES.lava, t = G.clock, ps = G.players;
    if (!st.buttons) return;
    // ghosts: the steps a button will build, dashed in the colour of the player they will hold
    ctx.lineWidth = 2; ctx.setLineDash([4, 4]);
    for (const gr of Object.values(st.groups)) {
      const b = gr.btn, o = b && ps[b.owner];
      gr.invite = gr.state === 'hidden' && !!o && o.alive && Math.abs(o.x + o.w / 2 - (b.c * T + T / 2)) <= 4 * T && Math.abs(o.y + o.h - (b.r + 1) * T) <= 4 * T;
      const base = gr.invite && !reduceMotion ? 0.575 + 0.225 * Math.sin(t * Math.PI * 4) : 0.5;
      const blk = gr.state === 'building' && gr.waitK >= 0;
      for (let k = 0; k < gr.cells.length; k++) {
        const cl = gr.cells[k];
        if (cl.on) continue;
        const a = blk && k >= gr.waitK && M.cellBlockedFor(cl, gr.tile) ? (Math.floor(t * 12) % 2 ? 0.9 : 0.3) : base;
        ctx.globalAlpha = a * 0.16; ctx.fillStyle = PCOL[gr.holder]; ctx.fillRect(cl.c * T + 2, cl.r * T + 2, T - 4, T - 4);
        ctx.globalAlpha = a; ctx.strokeStyle = PCOL[gr.holder]; ctx.strokeRect(cl.c * T + 2, cl.r * T + 2, T - 4, T - 4);
      }
    }
    ctx.setLineDash([]); ctx.globalAlpha = 1;
    // pop-in flashes and the blink of a hold group that is about to vanish
    const blinkOn = Math.floor(t * 16) % 2 === 0;
    for (const gr of Object.values(st.groups)) for (const cl of gr.cells) {
      if (!cl.on) continue;
      let a = cl.flash > 0 ? 0.7 * cl.flash / 0.15 : 0;
      if (gr.state === 'fading' && blinkOn) a = Math.max(a, 0.5);
      if (a > 0) { ctx.globalAlpha = a; ctx.fillStyle = '#fff'; ctx.fillRect(cl.c * T, cl.r * T, T, T); }
    }
    ctx.globalAlpha = 1;
    // the colour rule, drawn: while a button's owner is near it and its steps are still ghosts, a dotted line in the
    // partner's colour flows from the button to the first step it will build
    for (const gr of Object.values(st.groups)) {
      const b = gr.btn, o = b && ps[b.owner];
      if (!b || gr.state !== 'hidden' || !o.alive || Math.abs(o.y + o.h - (b.r + 1) * T) > 1.5 * T || Math.abs(o.x + o.w / 2 - (b.c * T + T / 2)) > 6 * T) continue;
      const c0 = gr.cells[0], x0 = b.c * T + T / 2, y0 = b.r * T + 16, x1 = c0.c * T + T / 2, y1 = c0.r * T + T / 2;
      const mx = (x0 + x1) / 2, my = Math.min(y0, y1) - 30 - Math.abs(x1 - x0) * 0.08;
      ctx.lineCap = 'round'; ctx.setLineDash([2, 7]); ctx.lineDashOffset = reduceMotion ? 0 : -t * 22;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(mx, my, x1, y1);
      ctx.globalAlpha = 0.55; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 5; ctx.stroke();
      ctx.globalAlpha = 0.85; ctx.strokeStyle = PCOL[gr.holder]; ctx.lineWidth = 3; ctx.stroke();
      ctx.setLineDash([]); ctx.lineCap = 'butt'; ctx.globalAlpha = 1;
    }
    // buttons: cap in the owner's colour, a chip (and later a lamp) in the colour of the partner it builds for
    for (const b of st.buttons) {
      const x = b.c * T, y = b.r * T, own = PCOL[b.owner], par = PCOL[1 - b.owner], gr = st.groups[b.group];
      const wig = b.wig > 0 ? Math.sin(b.wig * 60) * 1.5 : 0;
      if (b.hold) {
        const fading = gr && gr.state === 'fading', py = y + 24 + (b.down ? 2 : 0);
        ctx.fillStyle = C.stoneEdge; rr(x + 1, y + 27, T - 2, 3, 1.5); ctx.fill();
        if (b.down) { ctx.shadowColor = own; ctx.shadowBlur = 8; }
        ctx.fillStyle = fading && blinkOn ? '#ffffff' : own; rr(x + 2 + wig, py, 26, 4, 2); ctx.fill();
        ctx.shadowBlur = 0; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; rr(x + 2 + wig, py, 26, 4, 2); ctx.stroke();
        ctx.fillStyle = par; ctx.fillRect(x + 13 + wig, py + 1, 4, 2);
        if (!b.down) { ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 11 + wig, y + 15, 2, 6); ctx.fillRect(x + 17 + wig, y + 15, 2, 6); }
        continue;
      }
      ctx.fillStyle = C.stoneEdge; rr(x + 2, y + 25, 26, 5, 2); ctx.fill();
      if (b.latched) {
        ctx.fillStyle = own; rr(x + 4 + wig, y + 23, 22, 3, 2); ctx.fill();
        const building = gr && gr.state === 'building';
        ctx.globalAlpha = building ? 0.8 + 0.2 * Math.sin(t * Math.PI * 4) : 1;
        ctx.fillStyle = par; circle(x + 15, y + 13, 3.5); ctx.fill();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.2; ctx.stroke();
        ctx.fillStyle = PDARK[1 - b.owner]; ctx.fillRect(x + 14, y + 17, 2, 6);
        ctx.globalAlpha = 1;
      } else {
        const bob = gr && gr.invite && !reduceMotion ? (Math.sin(t * Math.PI * 8) > 0 ? -1 : 0) : 0;
        const cy = y + 15 + bob;
        ctx.fillStyle = PDARK[b.owner]; rr(x + 4 + wig, cy + 2, 22, 9, 4); ctx.fill();
        ctx.fillStyle = own; rr(x + 4 + wig, cy, 22, 9, 4); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillRect(x + 7 + wig, cy + 1, 16, 2);
        ctx.fillStyle = par; rr(x + 9.5 + wig, cy + 2, 11, 6, 1.5); ctx.fill();   // a little block in the partner's colour
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.2; ctx.stroke();
      }
    }
    // star buttons and the hatch they open
    for (const tw of st.twins) {
      const cx = tw.c * T + 15 + (tw.wig > 0 ? Math.sin(tw.wig * 60) * 1.5 : 0), cy = tw.r * T + 21;
      ctx.fillStyle = C.stoneEdge; rr(tw.c * T + 4, tw.r * T + 27, 22, 3, 1.5); ctx.fill();
      ctx.fillStyle = PCOL[tw.owner]; circle(cx, cy, 9); ctx.fill();
      ctx.strokeStyle = PDARK[tw.owner]; ctx.lineWidth = 1.5; ctx.stroke();
      const lit = tw.down || st.hatchOpen, s = tw.down && !reduceMotion ? 1 + 0.15 * Math.sin(t * 10) : 1;
      ctx.fillStyle = lit ? C.gold : '#ffffff'; M.star(cx, cy, 6 * s, 2.6 * s); ctx.fill();
    }
    if (st.hatch.length && !st.hatchOpen) {
      const held = st.twins.filter(tw => tw.down);
      if (held.length === 1) {
        const tw = held[0], sx = tw.c * T + 15, sy = tw.r * T + 21;
        let best = null, bd = 1e9;
        for (const h of st.hatch) { const d = Math.hypot(h.c * T + 15 - sx, h.r * T + 15 - sy); if (d < bd) { bd = d; best = h; } }
        ctx.strokeStyle = C.gold; ctx.lineWidth = 2.5; ctx.setLineDash([4, 6]); ctx.lineDashOffset = -t * 30;
        ctx.beginPath(); ctx.moveTo(sx, sy - 10); ctx.lineTo(best.c * T + 15, best.r * T + 15); ctx.stroke();
        ctx.setLineDash([]);
      }
      const sh = st.twinT > 0 && !reduceMotion ? 2 : 0;
      ctx.strokeStyle = C.gold; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.8;
      for (const h of st.hatch) { M.star(h.c * T + 15 + (sh ? (M.rand() - 0.5) * 2 * sh : 0), h.r * T + 15, 6, 2.6); ctx.stroke(); }
      ctx.globalAlpha = 1;
    }
    // ice pops
    for (const ic of st.icePops) {
      if (ic.got) continue;
      const bob = reduceMotion ? 0 : Math.sin((t * 1.5 + ic.ph) * Math.PI * 2) * 2, x = ic.x, y = ic.y + bob;
      ctx.fillStyle = 'rgba(200,240,255,0.35)'; circle(x, y - 2, 14); ctx.fill();
      ctx.fillStyle = '#c98b5a'; ctx.fillRect(x - 1.5, y + 6, 3, 7);
      ctx.fillStyle = '#9fe8ff'; rr(x - 6, y - 10, 12, 16, 5); ctx.fill();
      ctx.strokeStyle = '#4fa9cf'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fillRect(x - 3.5, y - 7, 2, 10);
      const sp = ((t + ic.ph) % 0.8) / 0.8;
      if (sp < 0.35) {
        const s = 6 * Math.sin(sp / 0.35 * Math.PI), sx = x + 7, sy = y - 10;
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(sx - s, sy); ctx.lineTo(sx + s, sy); ctx.moveTo(sx, sy - s); ctx.lineTo(sx, sy + s); ctx.stroke();
      }
    }
    // a bright dot zips from a pressed button to the first step it builds
    for (const z of st.zips) {
      const f = z.t / 0.2, x = z.x0 + (z.x1 - z.x0) * f, y = z.y0 + (z.y1 - z.y0) * f;
      ctx.fillStyle = z.col; circle(x, y, 4); ctx.fill();
      ctx.fillStyle = '#ffffff'; circle(x, y, 2); ctx.fill();
    }
  },
  drawTop() {
    const st = G.mst, M = MODES.lava;
    if (!st.buttons) return;
    M.drawLava();
    // a player hides the plate or star under their feet: show that it is held
    const t = G.clock;
    for (const b of st.buttons) {
      if (!b.hold || !b.down) continue;
      const x = b.c * T, y = b.r * T + 26;
      ctx.shadowColor = PCOL[b.owner]; ctx.shadowBlur = 10;
      ctx.fillStyle = PCOL[b.owner]; rr(x, y, T, 4, 2); ctx.fill();
      ctx.shadowBlur = 0; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; rr(x, y, T, 4, 2); ctx.stroke();
    }
    for (const tw of st.twins) {
      if (!tw.down || st.hatchOpen) continue;
      const p = G.players[tw.owner], s = reduceMotion ? 1 : 1 + 0.12 * Math.sin(t * 10);
      ctx.shadowColor = C.gold; ctx.shadowBlur = 8;
      ctx.fillStyle = C.gold; M.star(p.x + p.w / 2, p.y - 14, 8 * s, 3.4 * s); ctx.fill();
      ctx.shadowBlur = 0; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.stroke();
    }
    // standing where your own step should pop in: a bouncing arrow beside you shows which way to scoot
    for (const gr of Object.values(st.groups)) {
      if (gr.state !== 'building' || gr.waitK < 0 || gr.blockT < st.cfg.blockHint || !gr.blkDir) continue;
      const p = G.players[gr.holder];
      if (!p.alive) continue;
      const s = hudBig() ? 1.4 : 1, bob = reduceMotion ? 0 : Math.abs(Math.sin(t * 7)) * 5;
      ctx.save(); ctx.translate(p.x + p.w / 2 + gr.blkDir * (p.w / 2 + 4 + bob), p.y + p.h / 2); ctx.scale(gr.blkDir * s, s);
      ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(9, -4); ctx.lineTo(9, -9); ctx.lineTo(19, 0); ctx.lineTo(9, 9); ctx.lineTo(9, 4); ctx.lineTo(0, 4); ctx.closePath();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.stroke();
      ctx.fillStyle = PCOL[gr.holder]; ctx.fill();
      ctx.restore();
    }
    for (const p of G.players) {
      if (!p.alive) continue;
      const hs = M.headStack(p), cx = p.x + p.w / 2;
      if (st.downT[p.id] >= st.cfg.returnShow) {   // the shared World 5 "go back" ring (same as Ice Slide's)
        const f = clamp(st.downT[p.id] / st.cfg.returnHold, 0, 1);
        ctx.lineWidth = 3 * hs.rs; ctx.strokeStyle = 'rgba(255,255,255,0.35)'; circle(cx, hs.ringY, hs.ringR); ctx.stroke();
        ctx.lineWidth = 3.5 * hs.rs; ctx.lineCap = 'round'; ctx.strokeStyle = PCOL[p.id];
        ctx.beginPath(); ctx.arc(cx, hs.ringY, hs.ringR, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * f); ctx.stroke(); ctx.lineCap = 'butt';
        text('↓', cx, hs.ringY + 0.5, 10 * hs.rs, C.ink, 'center', 'body');
      }
      if (hs.heat) {   // too close to the lava
        ctx.fillStyle = '#ffffff'; rr(cx - 9, hs.heatY - 9, 18, 18, 6); ctx.fill();
        ctx.beginPath(); ctx.moveTo(cx - 3, hs.heatY + 8); ctx.lineTo(cx + 3, hs.heatY + 8); ctx.lineTo(cx, hs.heatY + 12); ctx.fill();
        text('!', cx, hs.heatY + 1, 15, '#e5322d', 'center', 'display');
      }
    }
  },
  drawLava() {
    const st = G.mst, y0 = st.lavaY;
    if (y0 >= H) return;
    const t = G.clock, frozen = st.freezeT > 0, warn = st.warned && !frozen;
    const amp = frozen ? 0.25 : reduceMotion ? 0.33 : warn ? 2.5 : 1;
    const wave = x => y0 + amp * (3 * Math.sin(2 * Math.PI * (x / 60 + 0.7 * t)) + 1.5 * Math.sin(2 * Math.PI * (x / 23 - 1.3 * t)))
      + (warn && !reduceMotion ? 2 * Math.sin(x * 0.9 + t * 53) : 0);
    // heat glow above the surface
    const gl = ctx.createLinearGradient(0, y0 - 60, 0, y0);
    gl.addColorStop(0, frozen ? 'rgba(170,225,255,0)' : 'rgba(255,140,60,0)'); gl.addColorStop(1, frozen ? 'rgba(170,225,255,0.22)' : 'rgba(255,140,60,0.28)');
    ctx.fillStyle = gl; ctx.fillRect(0, y0 - 60, W, 60);
    // body
    const span = Math.max(1, H - y0 + 8), sp = v => clamp(v / span, 0, 1);
    const g = ctx.createLinearGradient(0, y0 - 8, 0, H);
    if (frozen) { g.addColorStop(0, '#8a6380'); g.addColorStop(sp(20), '#6f4a62'); g.addColorStop(1, '#4b3550'); }
    else { g.addColorStop(0, '#ffb347'); g.addColorStop(sp(32), '#ff6a2a'); g.addColorStop(sp(88), '#d8431f'); g.addColorStop(1, '#a8301c'); }
    ctx.beginPath(); ctx.moveTo(0, H + 2);
    for (let x = 0; x <= W; x += 8) ctx.lineTo(x, wave(x));
    ctx.lineTo(W, H + 2); ctx.closePath();
    ctx.fillStyle = g; ctx.fill();
    // slow glowing blobs inside the lava
    if (!frozen && H - y0 > 24) {
      ctx.fillStyle = 'rgba(255,214,120,0.18)';
      for (let i = 0; i < 7; i++) {
        const bx = ((i * 157 + t * (12 + i * 3)) % (W + 80)) - 40, by = y0 + 16 + ((i * 37) % 40) + Math.sin(t * 0.8 + i) * 4;
        if (by < H) { ctx.beginPath(); ctx.ellipse(bx, by, 26 + (i % 3) * 8, 5, 0, 0, Math.PI * 2); ctx.fill(); }
      }
    }
    // crest
    let crest = frozen ? '#c8f1ff' : '#ffe28a';
    if (frozen && st.freezeT < 1 && Math.floor(t * 8) % 2 === 0) crest = '#ffb347';   // thaw warning
    ctx.strokeStyle = crest; ctx.lineWidth = 5; ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let x = 0; x <= W; x += 8) { const y = wave(x) + 1.5; if (x) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
    ctx.stroke();
    if (frozen) {   // cracks in the crust
      ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 2;
      for (const cx of [120, 350, 610, 840]) {
        const y = wave(cx) + 3;
        ctx.beginPath(); ctx.moveTo(cx, y); ctx.lineTo(cx + 6, y + 10); ctx.lineTo(cx - 3, y + 20); ctx.lineTo(cx + 5, y + 32); ctx.lineTo(cx - 1, y + 42); ctx.stroke();
      }
    }
    // bubbles and embers
    for (const b of st.bubbles) {
      const by = y0 + b.d;
      if (by > H + 6) continue;
      ctx.fillStyle = '#ffcf6b'; circle(b.x, by, b.r); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.55)'; circle(b.x - b.r * 0.35, by - b.r * 0.35, b.r * 0.35); ctx.fill();
    }
    for (const e of st.embers) {
      ctx.globalAlpha = clamp(e.life / e.max, 0, 1); ctx.fillStyle = e.col;
      ctx.fillRect(e.x - e.size / 2, e.y - e.size / 2, e.size, e.size);
    }
    ctx.globalAlpha = 1;
  },
  hud() {
    const st = G.mst, M = MODES.lava, big = hudBig();
    if (!st.buttons) return;
    // one status pill, top centre: the most important lava news
    let msg = null, icon = null, shake = 0;
    if (G.mode === 'play' && G.introT <= 0) {
      if (st.paused) msg = 'Lava paused — move to go!';
      else if (st.breatherT > 0) msg = 'Phew! The lava takes a breather';
      else if (st.freezeT > 0) { msg = 'Frozen ' + Math.ceil(st.freezeT); icon = 'snow'; }
      else if (st.warned) { msg = 'Rumble!'; shake = reduceMotion ? 0 : 1; }
      else if (st.waitingFor >= 0 && !(cpuSolo() && cpuOn(st.waitingFor))) msg = NAMES[st.waitingFor] + ', still there? The lava waits for you'; // (1-player: the computer standing still is waiting for you, not gone)
      else if (st.startT > 0) msg = 'Here comes the lava!';
    }
    if (msg) {
      // top centre, kept clear of the door's two "who is in" dots when the door is up top (dots y 38..50 for a row-3 door)
      const d = G.level.door, dotTop = d && d.x < W / 2 + 200 && d.x + d.w > W / 2 - 200 ? d.y - 22 : 1e9;
      const fs = big ? 20 : 14, h = big ? 32 : 24, y = Math.max(2, Math.min(big ? 8 : 14, dotTop - 4 - h));
      ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
      const tw = ctx.measureText(msg).width, iw = icon ? fs + 6 : 0, w = tw + iw + 30;
      const px = pill(W / 2, y, w, h, 'center');
      const dx = shake ? Math.round(Math.sin(G.clock * 60)) : 0, dy = shake ? Math.round(Math.cos(G.clock * 47)) : 0;
      if (icon) {   // a little snowflake
        const sx = px + 15 + fs / 2, sy = y + h / 2, s = fs * 0.45;
        ctx.strokeStyle = '#c8f1ff'; ctx.lineWidth = big ? 2.4 : 1.6; ctx.lineCap = 'round';
        ctx.beginPath();
        for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3; ctx.moveTo(sx - Math.cos(a) * s, sy - Math.sin(a) * s); ctx.lineTo(sx + Math.cos(a) * s, sy + Math.sin(a) * s); }
        ctx.stroke(); ctx.lineCap = 'butt';
      }
      text(msg, px + 15 + iw + tw / 2 + dx, y + h / 2 + 0.5 + dy, fs, st.warned && !icon ? '#ffcf6b' : icon ? '#c8f1ff' : C.paper, 'center', 'body');
    }
    // hint bubbles above the players
    for (const p of G.players) {
      const h = st.hints[p.id];
      if (!h || !p.alive || G.mode !== 'play') continue;
      const a = clamp(Math.min(h.t, h.life - h.t) / 0.2, 0, 1);
      const fs = big ? 20 : 12;
      ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
      const tw = ctx.measureText(h.text).width + (big ? 22 : 16), th = fs + (big ? 14 : 10);
      const hs = M.headStack(p), px = p.x + p.w / 2, cx = clamp(px, tw / 2 + 4, W - tw / 2 - 4);
      const by = Math.max(th + 6, hs.bubbleBottom);
      ctx.save(); ctx.globalAlpha = a;
      ctx.fillStyle = '#ffffff'; ctx.strokeStyle = PCOL[p.id]; ctx.lineWidth = 2;
      rr(cx - tw / 2, by - th, tw, th, th / 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px - 5, by - 1); ctx.lineTo(px + 5, by - 1); ctx.lineTo(px, by + 5); ctx.closePath(); ctx.fill();
      text(h.text, cx, by - th / 2 + 0.5, fs, C.ink, 'center', 'body');
      if (h.group) {   // and a bouncing arrow over the first step
        const gr = h.group;
        let tc = gr.cells[0];
        for (const cl of gr.cells) if (cl.r > tc.r || (cl.r === tc.r && Math.abs(cl.c * T + 15 - px) < Math.abs(tc.c * T + 15 - px))) tc = cl;
        const ax = tc.c * T + T / 2, ay = tc.r * T - 6 - (reduceMotion ? 0 : Math.abs(Math.sin(G.clock * 7)) * 6), s = big ? 1.4 : 1;
        ctx.fillStyle = PCOL[gr.holder]; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(ax - 4 * s, ay - 14 * s); ctx.lineTo(ax + 4 * s, ay - 14 * s); ctx.lineTo(ax + 4 * s, ay - 7 * s); ctx.lineTo(ax + 9 * s, ay - 7 * s);
        ctx.lineTo(ax, ay); ctx.lineTo(ax - 9 * s, ay - 7 * s); ctx.lineTo(ax - 4 * s, ay - 7 * s); ctx.closePath(); ctx.stroke(); ctx.fill();
      }
      ctx.restore();
    }
  },
  stats() {
    const st = G.mst, tot = st.ouch[0] + st.ouch[1], time = G.time;
    const mmss = s => { const r = Math.round(s); return Math.floor(r / 60) + ':' + String(r % 60).padStart(2, '0'); };
    const floors = st.floorT.concat([time - st.floorStart]);
    MODES.lava.nearDone(st, 0); MODES.lava.nearDone(st, 1);
    const who = st.closest[0] <= st.closest[1] ? 0 : 1, cl = st.closest[who];
    const closest = cl >= 999 ? 'The lava never even got close. Cool!' : cl < 0.5 ? 'Closest call: ' + NAMES[who] + '’s toes touched the lava!'
      : cl < 40 ? 'Closest call: ' + NAMES[who] + ', ' + Math.round(cl) + ' px from the lava!'
      : 'Never closer than ' + Math.round(cl) + ' px to the lava. Cool!';
    const medal = time <= 120 && tot <= 1 ? 'Gold' : time <= 210 && tot <= 5 ? 'Silver' : 'Bronze';
    const words = tot === 0 ? 'Not one toe toasted!' : tot <= 3 ? 'Warm toes, cool heads!' : 'Hot stuff, and you made it together!';
    return [
      { label: 'Lava ouches', values: st.ouch.slice() },
      { label: 'Buttons pressed', values: st.presses.slice() },
      { label: 'Ice pops', value: st.ices },
      closest,
      'Floors: ' + floors.map(mmss).join(' · '),
      medal + ' medal · ' + words,
    ];
  },
};
Sfx.extra.lavaPress = function (pitch) { this.tone(520 * pitch, 0.05, 'square', 0.04); this.tone(780 * pitch, 0.09, 'triangle', 0.04, null, 0.04); };
Sfx.extra.lavaBlock = function () { const n = Math.min(12, (G.mst && G.mst.popN) || 0); this.tone(392 * Math.pow(2, n / 12), 0.07, 'triangle', 0.045); };
Sfx.extra.lavaReady = function (pitch) { [784, 988, 1175].forEach((f, i) => this.tone(f * pitch, 0.09, 'triangle', 0.05, null, i * 0.06)); };
Sfx.extra.lavaBlink = function () { this.tone(700, 0.03, 'square', 0.02); this.tone(700, 0.03, 'square', 0.02, null, 0.12); };
Sfx.extra.lavaFade = function () { this.tone(520, 0.12, 'triangle', 0.035, 260); };
Sfx.extra.lavaSizzle = function () { this.tone(1400, 0.3, 'sawtooth', 0.018, 300); this.tone(90, 0.35, 'square', 0.03, 50, 0.03); };
Sfx.extra.lavaHot = function () { this.tone(990, 0.04, 'square', 0.02); this.tone(990, 0.04, 'square', 0.02, null, 0.09); };
Sfx.extra.lavaStart = function () { this.tone(110, 0.45, 'sawtooth', 0.035, 165); this.tone(70, 0.5, 'triangle', 0.06, 55, 0.05); };
Sfx.extra.lavaRumble = function () { [0, 0.07, 0.14, 0.21, 0.28].forEach((d, i) => this.tone(75 - i * 5, 0.09, 'square', 0.04, 50, d)); };
Sfx.extra.lavaSurge = function () { this.tone(120, 0.6, 'sawtooth', 0.04, 260); this.tone(60, 0.6, 'triangle', 0.07, 90); };
Sfx.extra.lavaFreeze = function () { [1319, 1568, 2093].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.05, null, i * 0.05)); this.tone(2637, 0.35, 'sine', 0.02, 1319, 0.15); };
Sfx.extra.lavaThaw = function () { this.tone(330, 0.3, 'sine', 0.04, 660); };
Sfx.extra.lavaStar = function (pitch) { this.tone(880 * pitch, 0.08, 'triangle', 0.05); this.tone(1320 * pitch, 0.1, 'triangle', 0.04, null, 0.06); };
Sfx.extra.lavaHatch = function () { this.play('crumble'); [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.14, 'triangle', 0.05, null, 0.15 + i * 0.07)); };
Sfx.extra.lavaCheck = function (pitch) { this.tone(660 * pitch, 0.07, 'triangle', 0.045); this.tone(990 * pitch, 0.1, 'triangle', 0.045, null, 0.06); };
Sfx.extra.lavaPopBack = function (pitch) { this.tone(500 * pitch, 0.14, 'sine', 0.05, 1100 * pitch); };
Sfx.extra.lavaBreather = function () { [784, 659, 523, 392].forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.045, null, i * 0.11)); };
Sfx.extra.lavaBubble = function () { this.tone(170 + MODES.lava.rand() * 90, 0.05, 'sine', 0.012, 330); };
Sfx.extra.lavaNope = function (pitch) { this.tone(240 * pitch, 0.07, 'square', 0.03, 180 * pitch); };
Sfx.extra.lavaBoing = function (pitch) { this.tone(260 * pitch, 0.16, 'triangle', 0.05, 780 * pitch); this.tone(520 * pitch, 0.08, 'sine', 0.03, 1040 * pitch, 0.1); };
Sfx.extra.lavaBloop = function (pitch) { this.tone(330 * pitch, 0.12, 'sine', 0.045, 520 * pitch); this.tone(390 * pitch, 0.1, 'sine', 0.03, 620 * pitch, 0.13); };
/* ===== end of MODES.lava ===== */

