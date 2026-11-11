/* Pip & Bo - Level 34-2 Ice Fortress Raid (team, World 34 Viking Voyage). */
'use strict';

/* ===== 34-2 Ice Fortress Raid (mode 'icefort', team, climbs up, Gavyn's pick) =====
   Climb the frozen cliff under an ice fortress while its defenders rain arrows and ice down. One hero holds the big
   round shield overhead, the other hacks handholds with an axe, and you swap at every ledge.
   THE WALL is a grid of cells (S.cols columns of S.cw px, rows S.rh px apart, row 0 at the bottom; world y = -row * rh).
   Each stretch (room) is 18 rows tall with a timber ledge every 6 rows (rows 0, 6, 12, 18). Heroes hang on cells that
   are HOLDS ('H', chopped) or LEDGES ('L'), and move one cell at a time with the direction keys (▲ is up; ▲ with ◀ or ▶
   goes up diagonally; ◀ ▶ sideways; ▼ down). Two heroes can share a hold. Player-paced: the camera follows the lower
   hero. The mode owns the tick, the picture and the HUD (ownStep + ownHUD + noFalls).
   CELLS: 'I' ice (2 chops), 'B' hard blue ice (4), 'N' snow (1, but a snow hold crumbles 3 s after someone first uses
     it: that hero drops a row), 'R' rock (no chopping: go round), 'U' a rune stone frozen in the ice (2 chops frees it:
     a collectable, and the cell becomes a hold), 'K' a frozen rope knot (2 chops frees the rope above: the 'P' rope
     cells in the rock become climbable), 'G' the gate rope (last stretch, 3 chops ends the level), 'L' ledge.
   THE AXE HERO (G.mst.axe): tap the action to chop the cell in the direction held (▲ up by default; ◀ ▶, ▼ and the
     diagonals too). Chopping also knocks a hanging icicle loose safely.
   THE SHIELD HERO: HOLD the action to raise the big round shield overhead. It covers a roof S.cover px wide: arrows thunk
     in, ice shatters, and it covers the partner when they are on the same hold, beside, or one row below. With the
     shield up the hero climbs slowly (one move upward per 0.6 s). ◀ ▶ while it's up TILT it, so rolling snowballs and
     barrels slide off to that side instead of knocking you down a row.
   HAZARDS (each with a tell): ARROW VOLLEYS (a horn and shadows on the wall 1 s before, 0.8 s of rain across a 200 px
     band: unshielded = a TUMBLE back to the last ledge); ICICLES (shake when someone is below in their column, fall
     0.8 s later); ROLLING SNOWBALLS and BARRELS (a rumble and a marker at the top of their chute 1.2 s before: tilt the
     shield or be pushed down a row); BOILING-WATER SPOUTS (the defenders pour kettles through gargoyle heads: a steam
     puff warns, then a 1 s gush down one column that the shield does NOT stop, and it melts the holds in that column for
     4 s); WIND GUSTS (the last two stretches: snow streaks warn, hold ▼ to cling or be blown a hold sideways).
   THE FROST: after the pair leaves a ledge, frost creeps up from it (S.frostWait, then a row every S.frostRow s): holds
     below the frost line turn slick and can't be used, and a hero it reaches slips (a Tumble). A Tumble (or both back on
     the ledge) puts the frost back down at the ledge, and the holds come back.
   SWAPS: when both heroes reach the next ledge, a horn toots and they hand over axe and shield.
   STRETCHES: The Ice Foot (arrows only), Frozen Falls (icicles, blue ice, snow holds), The Scaffolds (a frozen rope,
     barrels, spouts), Under the Walls (everything, gusts, and the gate rope: chop it and the drawbridge crashes down).
   RUNE STONES: 20 (5 a stretch), several off the safe line.
   GOLD HELP (only while both are playing, announced, counted): 3 Tumbles in a stretch = a gold shield, twice as wide and
     no slow-down for the rest of the stretch.
   IDLE: no person presses anything for 12 s: "Taking a break", the wall waits and the clock stops.
   MEDAL: by time: Gold <= 200 s, Silver <= 340 s.
   MODES.icefort.plan(st) says what each job should do now (the prompts, the HUD chips and the computer brain read it).
   Everything lives inside this block; sounds are Sfx.extra.icefort*. */
(() => {
  const K = VIKING, TAU = Math.PI * 2;
  const S = {
    cols: 15, cw: 44, rh: 52, rowsPer: 18, ledgeEvery: 6, moveT: 0.2, ledgeMoveT: 0.15, shieldMoveT: 0.6, chopT: 0.2,
    cover: 110, coverGold: 220, raiseT: 0.12, volleyTell: 1.0, volleyRain: 0.8, volleyW: 200, icicleShake: 0.8,
    icicleV: 520, rollWarn: 1.2, rollV: 300, spoutRest: 4.5, spoutWarn: 1.0, spoutGush: 1.0, meltT: 4, gustWarn: 0.9,
    gustBlow: 0.35, frostWait: 4, frostRow: 4, snowCrumble: 3, tumbleT: 0.7, swapT: 0.9, idleWait: 12, goldT: 200, silverT: 340,
  };
  const NEED = { I: 2, B: 4, N: 1, U: 2, K: 2, G: 3 };
  const X0 = (W - (S.cols - 1) * S.cw) / 2;
  const cx = c => X0 + c * S.cw;
  const wy = r => -r * S.rh;
  const isLedgeRow = r => r % S.ledgeEvery === 0;
  const DIRS = { up: [0, 1], ul: [-1, 1], ur: [1, 1], l: [-1, 0], r: [1, 0], d: [0, -1], dl: [-1, -1], dr: [1, -1] };

  /* ---------- the wall for a stretch ---------- */
  function layout(k) {
    let n = 0;
    const R = () => K.hash(k * 977 + (n++) * 13.7 + 5.1);
    const rows = S.rowsPer + (k === 3 ? 2 : 1);
    const g = [];
    for (let r = 0; r < rows; r++) g.push(Array.from({ length: S.cols }, () => (isLedgeRow(r) && r <= S.rowsPer ? 'L' : 'I')));
    const set = (c, r, ch) => { if (c >= 0 && c < S.cols && r > 0 && r < rows && !isLedgeRow(r)) g[r][c] = ch; };
    const icicles = [], chutes = [], spouts = [];
    // above the top ledge: rock (or, in the last stretch, the palisade with the gate rope)
    for (let r = S.rowsPer + 1; r < rows; r++) for (let c = 0; c < S.cols; c++) g[r][c] = 'R';
    if (k === 3) g[S.rowsPer + 1][7] = 'G';
    const runes = [];
    for (let sec = 0; sec < 3; sec++) {
      const b = sec * S.ledgeEvery;
      // a couple of rock outcrops to steer round
      const nr = 1 + Math.floor(R() * 2);
      for (let i = 0; i < nr; i++) { const c = 2 + Math.floor(R() * 11), r = b + 1 + Math.floor(R() * 5), w = 1 + Math.floor(R() * 2); for (let j = 0; j < w; j++) set(c + j, r, 'R'); }
      if (k >= 1) {
        // hard blue ice in the middle, snow at the sides
        const bc = 4 + Math.floor(R() * 5), br = b + 2 + Math.floor(R() * 3);
        for (let j = 0; j < 3; j++) set(bc + j, br, 'B');
        for (let j = 0; j < 2; j++) set(Math.floor(R() * 3) + (R() < 0.5 ? 1 : 11), b + 1 + Math.floor(R() * 5), 'N');
        // an overhang with an icicle under it
        const ic = 3 + Math.floor(R() * 9), ir = b + 5;
        if (g[ir][ic] !== 'R') { set(ic, ir, 'R'); icicles.push({ c: ic, r: ir - 1, state: 'hang', t: 0, y: 0 }); }
      }
      if (k === 2 && sec === 1) {
        // the frozen rope: a band of rock with a rope hanging down through it; chop its knot to free it
        const rc = 3 + Math.floor(R() * 9);
        for (let r = b + 2; r <= b + 5; r++) for (let c = 0; c < S.cols; c++) set(c, r, 'R');
        for (let r = b + 2; r <= b + 5; r++) set(rc, r, 'P');
        set(rc, b + 1, 'K');
        // a long way round past the end of the band (a narrow gap at one side, blue ice)
        const side = rc < 7 ? S.cols - 1 : 0;
        for (let r = b + 2; r <= b + 5; r++) set(side, r, 'B');
      }
      // rune stones: two in the first two sections, one in the last; one near the middle, one out to a side
      const want = sec < 2 ? 2 : 1;
      for (let i = 0; i < want; i++) {
        for (let tries = 0; tries < 20; tries++) {
          const off = i === 0 ? Math.floor(R() * 5) - 2 : (R() < 0.5 ? -1 : 1) * (4 + Math.floor(R() * 3));
          const c = clamp(7 + off, 0, S.cols - 1), r = b + 1 + Math.floor(R() * 5);
          if (g[r][c] === 'I' || g[r][c] === 'B' || g[r][c] === 'N') { g[r][c] = 'U'; runes.push({ c, r }); break; }
        }
      }
    }
    if (k >= 2) { chutes.push(3 + Math.floor(R() * 3), 9 + Math.floor(R() * 3)); spouts.push(k === 2 ? 6 + Math.floor(R() * 3) : 7 + (R() < 0.5 ? -2 : 2)); if (k === 3) spouts.push(R() < 0.5 ? 2 : 12); }
    return { g, rows, icicles, chutes, spouts, runes: runes.length };
  }

  /* ---------- a stretch (one room) ---------- */
  function room(st, L, k) {
    const def = L.def;
    st.k = k; st.title = def.title || '';
    if (k === 0) st.axe = 0;
    st.shield = 1 - st.axe;
    const lay = layout(k);
    st.g = lay.g; st.rows = lay.rows; st.hits = lay.g.map(r => r.map(() => 0));
    st.melt = lay.g.map(r => r.map(() => 0)); st.snowT = lay.g.map(r => r.map(() => -1));
    st.icicles = lay.icicles; st.chutes = lay.chutes; st.spouts = lay.spouts.map((c, i) => ({ c, t: 1.5 + i * 2.2, state: 'rest' }));
    st.rollers = []; st.rollT = 3.5; st.volley = null; st.volleyT = def.volleyFirst || 3; st.gust = null; st.gustT = 6;
    st.volleyEvery = def.volleyEvery || 7; st.gusts = !!def.gusts; st.ropeFree = false;
    st.sec = 0; st.base = 0; st.frost = -0.4; st.frostT = 0; st.left = false;
    st.h = [0, 1].map(id => ({ id, c: id === 0 ? 6 : 8, r: 0, pc: id === 0 ? 6 : 8, pr: 0, mt: 0, mT: 1, stun: 0, chopT: 0, up: false, raise: 0, tilt: 0, sq: 0, flash: 0 }));
    st.state = 'go'; st.endT = 0; st.swapT = 0; st.party = false; st.cleared = false; st.lastRoom = false;
    st.rc = { bad: 0 }; st.goldUsed = false; st.gold = false; st.segStart = G.time;
    st.cam = st.cam || { y: 0 }; st.cam.y = -200;
    K.fx(st); labels(st); mirror(st);
  }
  function labels(st) { const w = []; w[st.axe] = 'chop'; w[st.shield] = 'shield'; K.actLabels(w, 'chop'); }
  const cell = (st, c, r) => (c < 0 || c >= S.cols || r < 0 || r >= st.rows ? 'R' : st.g[r][c]);
  const walkable = (st, c, r) => { const ch = cell(st, c, r); return (ch === 'H' || ch === 'L' || (ch === 'P' && st.ropeFree)) && st.melt[r][c] <= 0 && !(r < st.frost && ch !== 'L'); };
  const frosted = (st, r) => r < st.frost && r > st.base && !isLedgeRow(r);
  const choppable = ch => NEED[ch] !== undefined;
  const hx = (st, h) => { const other = st.h[1 - h.id], share = other.c === h.c && other.r === h.r && other.mt <= 0 && h.mt <= 0; return cx(K.lerp(h.pc, h.c, 1 - h.mt / h.mT)) + (share ? (h.id === st.shield ? 9 : -9) : 0); };
  const hy = (st, h) => wy(K.lerp(h.pr, h.r, 1 - h.mt / h.mT)) + 18;

  /* ---------- the tick ---------- */
  function tick(st, dt) {
    if (!st.g) return;
    K.track(st);
    st.waiting = st.state === 'go' && K.idle(st, dt, S.idleWait);
    const live = G.introT <= 0 && !st.waiting && st.state === 'go';
    st.clock += dt;
    if (live) {
      for (const h of st.h) hero(st, h, dt);
      hazards(st, dt);
      frost(st, dt);
      cells(st, dt);
      progress(st);
    } else if (st.state === 'swap') swapStep(st, dt);
    else if (st.state === 'end') endStep(st, dt);
    for (const h of st.h) { if (h.mt > 0 && !live && st.state !== 'swap') h.mt = Math.max(0, h.mt - dt); if (h.sq > 0) h.sq = Math.max(0, h.sq - dt * 3); if (h.flash > 0) h.flash -= dt; }
    for (const p of G.players) { p.pendingJump = false; p.pendingAct = false; }
    cam(st, dt);
    K.tickFx(st, dt);
    mirror(st);
  }
  function dirOf(i) {
    const up = i.jump, dn = i.down, l = i.left && !i.right, r = i.right && !i.left;
    if (up) return l ? 'ul' : r ? 'ur' : 'up';
    if (dn) return l ? 'dl' : r ? 'dr' : 'd';
    return l ? 'l' : r ? 'r' : null;
  }
  function hero(st, h, dt) {
    const p = G.players[h.id], i = p.input, isAxe = h.id === st.axe;
    if (h.stun > 0) h.stun -= dt;
    h.chopT = Math.max(-1, h.chopT - dt);
    if (h.mt > 0) { h.mt = Math.max(0, h.mt - dt); }
    // the shield: hold the action
    if (!isAxe) {
      h.up = !!i.act && h.stun <= 0;
      h.raise = approach(h.raise, h.up ? 1 : 0, dt / S.raiseT);
      h.tilt = h.up ? (i.left && !i.right ? -1 : i.right && !i.left ? 1 : 0) : 0;
    } else { h.up = false; h.raise = 0; h.tilt = 0; }
    if (h.stun > 0) return;
    let d = dirOf(i);
    const gusting = st.gust && (st.gust.state === 'warn' || st.gust.state === 'blow');
    if (gusting && d === 'd') d = null; // holding ▼ in a gust = clinging on
    // the axe: tap the action to chop in the held direction (up by default)
    if (isAxe && p.pendingAct && h.mt <= 0) {
      const cd = d || 'up', [dc, dr] = DIRS[cd];
      chop(st, h, h.c + dc, h.r + dr);
    }
    if (!d || h.mt > 0) return;
    if (!isAxe && h.up && (d === 'l' || d === 'r')) return; // tilting, not moving
    let [dc, dr] = DIRS[d];
    if (!isAxe && h.up) { if (dc && dr) dc = 0; } // shield up: straight up and down only
    const nc = h.c + dc, nr = h.r + dr;
    if (!walkable(st, nc, nr)) return;
    const slow = !isAxe && h.up && dr > 0 && !st.gold;
    h.pc = h.c; h.pr = h.r; h.c = nc; h.r = nr;
    h.mT = h.mt = slow ? S.shieldMoveT : (isLedgeRow(nr) && dr === 0 ? S.ledgeMoveT : S.moveT);
    if (cell(st, nc, nr) === 'H' && st.snowT[nr][nc] === -2) st.snowT[nr][nc] = S.snowCrumble; // a snow hold: it starts to give
    if (dr > 0 && Math.random() < 0.5) Sfx.play('icefortGrab', 0.9 + Math.random() * 0.2);
  }
  function chop(st, h, c, r) {
    if (h.chopT > 0) return;
    // an icicle hanging there: knock it loose, safely
    const ic = st.icicles.find(q => q.c === c && q.r === r && (q.state === 'hang' || q.state === 'shake'));
    if (ic) { ic.state = 'gone'; h.chopT = S.chopT; Sfx.play('vikingChop'); Sfx.play('icefortShatter'); K.spark(st, cx(c), wy(r), 8, ['#eaf8ff', '#bfe4f2']); K.pop(st, cx(c), wy(r) - 30, 'Knocked it loose!', '#d9ffd0', 16); return; }
    const ch = cell(st, c, r);
    if (!choppable(ch)) {
      h.chopT = S.chopT;
      if (ch === 'R') { Sfx.play('vikingClang'); K.hint(st, h.id, 'Rock! Chop round it', 1.2); }
      return;
    }
    h.chopT = S.chopT; st.hits[r][c]++; st.stats.chops++;
    Sfx.play('vikingChop', ch === 'B' ? 0.8 : ch === 'N' ? 1.3 : 1);
    for (let k = 0; k < 4; k++) K.part(st, cx(c) + (Math.random() - 0.5) * 20, wy(r) + (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 200, -60 - Math.random() * 120, 0.5, ch === 'N' ? '#ffffff' : '#cfeeff', 3, 600, 'star');
    if (st.hits[r][c] >= NEED[ch]) {
      st.hits[r][c] = 0;
      if (ch === 'G') { gate(st); return; }
      st.g[r][c] = 'H';
      st.snowT[r][c] = ch === 'N' ? -2 : -1;
      if (ch === 'U') { st.runes++; st.stats.runes = st.runes; Sfx.play('vikingPop', 1 + (st.runes % 5) * 0.07); K.pop(st, cx(c), wy(r) - 30, 'Rune stone ' + st.runes + '!', '#9fe8ff', 18); K.spark(st, cx(c), wy(r), 10, ['#9fe8ff', '#ffffff']); }
      if (ch === 'K') { st.ropeFree = true; Sfx.play('icefortRope'); K.pop(st, cx(c), wy(r) - 40, 'The rope is free! Climb it!', '#ffffff', 20); }
    }
  }
  function gate(st) {
    st.state = 'end'; st.endT = 0; st.lastRoom = true; st.stats.roomT[st.k] = G.time - st.segStart;
    Sfx.play('icefortDrawbridge'); G.shake = 0.6;
    K.pop(st, W / 2, wy(S.rowsPer) - 120, 'The drawbridge crashes down!', '#ffffff', 26);
  }
  function covered(st, h) {
    const S_ = st.h[st.shield];
    if (S_.raise < 0.9) return false;
    if (h === S_) return true;
    const w = (st.gold ? S.coverGold : S.cover) / 2 + 5;
    return Math.abs(hx(st, h) - hx(st, S_)) <= w && h.r <= S_.r && S_.r - h.r <= 1;
  }
  function tumble(st, h, why) {
    if (h.stun > 0 && h.tumbling) return;
    const ledge = st.base;
    if (h.r === ledge) { h.stun = 0.5; h.sq = 1; K.pop(st, hx(st, h), hy(st, h) - 40, 'Ow!', '#ffffff', 18); return; }
    st.stats.tumbles++; st.rc.bad++;
    (st.log = st.log || []).push([st.k, st.sec, +(G.time).toFixed(1), why, h.id === st.axe ? 'axe' : 'shield', h.c, h.r]);
    h.pc = h.c; h.pr = h.r; h.r = ledge; h.mT = h.mt = 0.45; h.stun = S.tumbleT; h.sq = 1; h.up = false; h.raise = 0;
    Sfx.play('icefortTumble'); Sfx.play('vikingThunk');
    K.pop(st, cx(h.c), wy(h.pr) - 30, why || 'Tumble!', '#ffb0a0', 22);
    // the frost goes back down to the ledge
    st.frost = ledge - 0.4; st.frostT = 0; st.left = false;
    if (st.rc.bad === 1) K.msg(st, why === 'Frosted!' ? 'The frost caught up! Keep climbing before it creeps over you.' : 'A Tumble! Stay under the shield when the horn blows.', '#ffd0c8', 3);
    if (st.rc.bad >= 3 && !st.goldUsed && K.both(st)) { st.goldUsed = true; st.gold = true; K.goldHelp(st, 'Gold shield! Twice as wide and no slowing down for the rest of the stretch'); }
  }
  function pushDown(st, h) {
    for (const [dc, dr] of [[0, -1], [-1, -1], [1, -1]]) if (walkable(st, h.c + dc, h.r + dr)) { h.pc = h.c; h.pr = h.r; h.c += dc; h.r += dr; h.mT = h.mt = 0.3; h.stun = 0.4; h.sq = 1; st.stats.knocks++; st.rc.bad += 0.5; Sfx.play('vikingThunk'); K.pop(st, hx(st, h), hy(st, h) - 40, 'Oof!', '#ffffff', 18); return; }
    tumble(st, h, 'Knocked off!');
  }
  function hazards(st, dt) {
    const A = st.h[0], B = st.h[1], lowR = Math.min(A.r, B.r), hiR = Math.max(A.r, B.r);
    // arrow volleys
    st.volleyT -= dt;
    if (!st.volley && st.volleyT <= 0) {
      const mid = (hx(st, A) + hx(st, B)) / 2;
      st.volley = { x: clamp(mid + (Math.random() - 0.5) * 120, X0 + 60, cx(S.cols - 1) - 60), state: 'tell', t: 0, n: 0 };
      Sfx.play('vikingHorn');
    }
    if (st.volley) {
      const v = st.volley; v.t += dt;
      if (v.state === 'tell' && v.t >= S.volleyTell) { v.state = 'rain'; v.t = 0; Sfx.play('icefortArrows'); }
      else if (v.state === 'rain') {
        for (const h of st.h) {
          if (Math.abs(hx(st, h) - v.x) > S.volleyW / 2) continue;
          if (covered(st, h)) { if (Math.random() < dt * 8) { st.stats.blocked++; Sfx.play('vikingThunk'); const S_ = st.h[st.shield]; K.spark(st, hx(st, S_) + (Math.random() - 0.5) * 50, hy(st, S_) - 50, 2, ['#c8a070', '#ffffff']); } }
          else if (h.stun <= 0) tumble(st, h, 'Arrows! Tumble!');
        }
        if (v.t >= S.volleyRain) { st.volley = null; st.volleyT = st.volleyEvery * (0.8 + Math.random() * 0.4); }
      }
    }
    // icicles: shake when someone is below in their column, then fall
    for (const q of st.icicles) {
      if (q.state === 'hang' && st.h.some(h => h.c === q.c && h.r < q.r && q.r - h.r <= 4)) { q.state = 'shake'; q.t = 0; Sfx.play('icefortCreak'); }
      else if (q.state === 'shake') { q.t += dt; if (q.t >= S.icicleShake) { q.state = 'fall'; q.y = wy(q.r); } }
      else if (q.state === 'fall') {
        q.y += S.icicleV * dt;
        for (const h of st.h) {
          if (h.c !== q.c || Math.abs(hy(st, h) - 40 - q.y) > 24) continue;
          q.state = 'gone'; Sfx.play('icefortShatter'); K.spark(st, cx(q.c), q.y, 10, ['#eaf8ff', '#bfe4f2']);
          if (covered(st, h)) { st.stats.blocked++; K.pop(st, cx(q.c), q.y - 20, 'Smash!', '#d9ffd0', 16); }
          else tumble(st, h, 'Icicle! Tumble!');
          break;
        }
        if (q.y > wy(lowR - 4)) q.state = 'gone';
      }
    }
    // rolling snowballs and barrels down the chutes
    if (st.chutes.length) {
      st.rollT -= dt;
      if (st.rollT <= 0) {
        st.rollT = 4 + Math.random() * 2.5;
        const c = st.chutes[Math.floor(Math.random() * st.chutes.length)];
        st.rollers.push({ c, state: 'warn', t: 0, y: wy(hiR + 5), kind: Math.random() < 0.5 ? 'snow' : 'barrel' });
        Sfx.play('icefortRumble');
      }
      for (const q of st.rollers) {
        q.t += dt;
        if (q.state === 'warn' && q.t >= S.rollWarn) { q.state = 'roll'; q.t = 0; }
        else if (q.state === 'roll') {
          q.y += S.rollV * dt;
          for (const h of st.h) {
            if (Math.abs(hx(st, h) - cx(q.c)) > 26 || Math.abs(hy(st, h) - 30 - q.y) > 22 || q.hitSet && q.hitSet.includes(h.id)) continue;
            (q.hitSet = q.hitSet || []).push(h.id);
            const S_ = st.h[st.shield];
            if (covered(st, h) && S_.tilt !== 0) { q.state = 'slide'; q.dir = S_.tilt; q.t = 0; st.stats.blocked++; Sfx.play('vikingThunk'); K.pop(st, cx(q.c), q.y - 20, 'Slid off!', '#d9ffd0', 16); break; }
            pushDown(st, h);
          }
          if (q.y > wy(lowR - 4)) q.gone = true;
        } else if (q.state === 'slide') { q.y += 120 * dt; q.slideX = (q.slideX || 0) + q.dir * 260 * dt; if (q.t > 0.8) q.gone = true; }
      }
      st.rollers = st.rollers.filter(q => !q.gone);
    }
    // spouts of boiling water
    for (const sp of st.spouts) {
      sp.t -= dt;
      if (sp.t > 0) continue;
      if (sp.state === 'rest') { sp.state = 'warn'; sp.t = S.spoutWarn; Sfx.play('icefortSteam'); }
      else if (sp.state === 'warn') { sp.state = 'gush'; sp.t = S.spoutGush; Sfx.play('icefortGush'); for (let r = 0; r < st.rows; r++) if (st.g[r][sp.c] !== 'L') st.melt[r][sp.c] = S.meltT; }
      else { sp.state = 'rest'; sp.t = S.spoutRest + Math.random(); }
    }
    for (const sp of st.spouts) if (sp.state === 'gush') for (const h of st.h) if (h.c === sp.c && h.r !== st.base && !isLedgeRow(h.r)) tumble(st, h, 'Hot water! Tumble!');
    // gusts
    if (st.gusts) {
      st.gustT -= dt;
      if (!st.gust && st.gustT <= 0) { st.gust = { dir: Math.random() < 0.5 ? -1 : 1, state: 'warn', t: 0 }; Sfx.play('icefortWind'); }
      if (st.gust) {
        const gq = st.gust; gq.t += dt;
        if (gq.state === 'warn' && gq.t >= S.gustWarn) {
          gq.state = 'blow'; gq.t = 0;
          for (const h of st.h) {
            const p = G.players[h.id];
            if (p.input.down || (h.id === st.shield && h.raise >= 0.9) || isLedgeRow(h.r) || h.mt > 0) continue;
            if (walkable(st, h.c + gq.dir, h.r)) { h.pc = h.c; h.pr = h.r; h.c += gq.dir; h.mT = h.mt = 0.25; K.pop(st, hx(st, h), hy(st, h) - 40, 'Whoosh!', '#ffffff', 16); }
            else { h.stun = 0.6; K.pop(st, hx(st, h), hy(st, h) - 40, 'Brrr!', '#ffffff', 16); }
            st.stats.blown++;
          }
        } else if (gq.state === 'blow' && gq.t >= S.gustBlow) { st.gust = null; st.gustT = 7 + Math.random() * 3; }
      }
    }
  }
  function frost(st, dt) {
    const off = st.h.every(h => h.r > st.base), back = st.h.every(h => h.r === st.base && h.mt <= 0);
    if (off) st.left = true;
    // both back on the ledge: the frost sinks back down to it (it only creeps while someone is up on the ice)
    if (back) { st.left = false; st.frostT = 0; st.frost = Math.max(st.base - 0.4, st.frost - dt * 2); }
    if (!st.left) return;
    st.frostT += dt;
    if (st.frostT < S.frostWait) return;
    st.frost += dt / S.frostRow;
    for (const h of st.h) if (h.r < st.frost && h.r !== st.base && !isLedgeRow(h.r) && h.mt <= 0) tumble(st, h, 'Frosted!');
  }
  function cells(st, dt) {
    for (let r = 0; r < st.rows; r++) for (let c = 0; c < S.cols; c++) {
      if (st.melt[r][c] > 0) st.melt[r][c] -= dt;
      if (st.snowT[r][c] > 0) {
        st.snowT[r][c] -= dt;
        if (st.snowT[r][c] <= 0) {
          st.snowT[r][c] = -1; st.g[r][c] = 'N'; st.hits[r][c] = 0;
          Sfx.play('icefortCrumble'); K.dust(st, cx(c), wy(r), '#ffffff', 8);
          for (const h of st.h) if (h.c === c && h.r === r) pushDown(st, h);
        }
      }
    }
  }
  function progress(st) {
    const next = st.base + S.ledgeEvery;
    if (st.k === 3 && st.base === S.rowsPer) return; // the gate rope ends the last stretch
    if (st.h.every(h => h.r === next && h.mt <= 0)) {
      st.state = 'swap'; st.swapT = 0;
      Sfx.play('vikingHorn');
      st.stats.ledges++;
      if (next === S.rowsPer && st.k < 3) { st.stats.roomT[st.k] = G.time - st.segStart; K.pop(st, W / 2, wy(next) - 110, (G.level.def.done || 'Top of the stretch!') + ' Swap!', '#ffffff', 24); }
      else K.pop(st, W / 2, wy(next) - 110, 'Ledge! Swap axe and shield!', '#ffffff', 22);
    }
  }
  function swapStep(st, dt) {
    st.swapT += dt;
    if (st.swapT < S.swapT) return;
    const next = st.base + S.ledgeEvery;
    st.axe = 1 - st.axe; st.shield = 1 - st.axe; labels(st);
    st.base = next; st.sec++; st.frost = next - 0.4; st.frostT = 0; st.left = false; st.volleyT = Math.max(st.volleyT, 2.5);
    for (const h of st.h) { h.up = false; h.raise = 0; }
    if (next === S.rowsPer && st.k < 3) { st.state = 'end'; st.endT = 0; st.lastRoom = false; return; }
    st.state = 'go';
    if (st.k === 3 && next === S.rowsPer) K.msg(st, NAMES[st.axe] + ': chop the gate rope above the ledge!', '#ffe7a8', 4);
  }
  function endStep(st, dt) {
    st.endT += dt;
    if (st.lastRoom) {
      if (st.endT > 0.8 && !st.party) { st.party = true; Sfx.play('icefortFanfare'); K.confetti(st, W / 2, wy(S.rowsPer) - 150, 50); K.pop(st, W / 2, wy(S.rowsPer) - 160, 'The fortress is ours! The defenders run!', '#ffffff', 26); }
      if (st.endT > 3.4 && !st.cleared) { st.cleared = true; G.level.goal = { x: W / 2, y: 300 }; levelClear(); }
    } else if (st.endT > 1.4) nextRoom();
  }
  function cam(st, dt) {
    const low = Math.min(...st.h.map(h => hy(st, h)));
    const lowest = Math.max(...st.h.map(h => hy(st, h)));
    let want = lowest - 400;
    // keep the higher hero on screen too
    want = Math.min(want, low - 110);
    want = Math.max(want, lowest - 470);
    if (st.state === 'end' && st.lastRoom) want = wy(S.rowsPer) - 330;
    st.cam.y = K.lerp(st.cam.y, want, Math.min(1, dt * 4));
  }
  function mirror(st) {
    for (const h of st.h) K.place(h.id, hx(st, h), hy(st, h) - st.cam.y);
    // (for the stuck test: progress up the wall)
    st.run = st.h.map(h => ({ x: hx(st, h), y: hy(st, h) - st.k * 1000 }));
  }

  /* ---------- what to do next ----------
     plan(st): { route (cells from the axe hero to its goal), goal ('rune' | 'ledge' | 'gate'), axe: { dir, chop, wait,
       why }, shield: { dir, up, tilt, why }, danger: { volley, axeCol, shieldCol } }
     dir is a DIRS key to hold (or null), chop = tap the action with dir held. */
  function stepCost(st, c, r, dr) {
    const ch = cell(st, c, r);
    if (ch === 'R' || ch === 'G' || frosted(st, r)) return null;
    let k = 1;
    if (ch === 'P' && !st.ropeFree) return null; // the rope hangs tied up until its knot is chopped
    if (ch === 'H' || ch === 'L' || ch === 'P') { if (st.melt[r][c] > 0) k += 2 + 2 * st.melt[r][c]; }
    else if (choppable(ch)) { if (dr < 0) k += 1.5; k += 0.35 * (NEED[ch] - st.hits[r][c]); if (ch === 'U') k -= 0.5; if (ch === 'N') k += 0.6; }
    else return null;
    if (st.snowT[r][c] > 0) k += 2;
    // a spout column, an icicle above
    for (const sp of st.spouts) if (sp.c === c) k += sp.state !== 'rest' ? 3 : 1.2;
    for (const q of st.icicles) if (q.c === c && q.state !== 'gone' && q.r > r && q.r - r <= 4) k += 1.2;
    return k;
  }
  function route(st, from, goalFn) {
    const N = S.cols * st.rows, dist = new Float64Array(N).fill(1e9), prev = new Int32Array(N).fill(-1), done = new Uint8Array(N);
    const id = (c, r) => r * S.cols + c;
    dist[id(from.c, from.r)] = 0;
    const open = [id(from.c, from.r)];
    let goal = -1;
    while (open.length) {
      let bi = 0; for (let i = 1; i < open.length; i++) if (dist[open[i]] < dist[open[bi]]) bi = i;
      const u = open[bi]; open.splice(bi, 1);
      if (done[u]) continue; done[u] = 1;
      const uc = u % S.cols, ur = (u - uc) / S.cols;
      if (goalFn(uc, ur)) { goal = u; break; }
      for (const [dc, dr] of Object.values(DIRS)) {
        const nc = uc + dc, nr = ur + dr;
        if (nc < 0 || nc >= S.cols || nr < st.base || nr >= st.rows) continue;
        const k = stepCost(st, nc, nr, dr);
        if (k === null) continue;
        const v = id(nc, nr);
        if (dist[u] + k < dist[v]) { dist[v] = dist[u] + k; prev[v] = u; open.push(v); }
      }
    }
    if (goal < 0) return null;
    const path = [];
    for (let v = goal; v >= 0; v = prev[v]) path.unshift({ c: v % S.cols, r: Math.floor(v / S.cols) });
    return path;
  }
  // a walk over holds only (no chopping): breadth first, for the shield hero and for getting under cover
  function walkRoute(st, from, to) {
    const seen = new Set([from.c + ',' + from.r]), q = [[{ c: from.c, r: from.r }]];
    for (let i = 0; i < q.length && i < 400; i++) {
      const path = q[i], u = path[path.length - 1];
      if (u.c === to.c && u.r === to.r) return path;
      for (const [dc, dr] of Object.values(DIRS)) {
        const c = u.c + dc, r = u.r + dr, key = c + ',' + r;
        if (seen.has(key) || !walkable(st, c, r)) continue;
        seen.add(key); q.push(path.concat([{ c, r }]));
      }
    }
    return null;
  }
  // a step out of a spout's column onto a hold
  function escape(st, h) {
    for (const d of ['l', 'r', 'ul', 'ur', 'dl', 'dr', 'd']) { const [dc, dr] = DIRS[d]; if (walkable(st, h.c + dc, h.r + dr) && !st.spouts.some(q => q.c === h.c + dc)) return d; }
    return null;
  }
  const dirKey = (dc, dr) => Object.keys(DIRS).find(k => DIRS[k][0] === dc && DIRS[k][1] === dr) || null;
  function threatAt(st, h) {
    // seconds until something lands on this hero (99 = nothing), and whether the shield helps
    const x = hx(st, h);
    let t = 99, shieldable = true, roll = false;
    const v = st.volley;
    if (v && Math.abs(x - v.x) <= S.volleyW / 2 + 20) t = Math.min(t, v.state === 'tell' ? S.volleyTell - v.t : 0);
    for (const q of st.icicles) if (q.c === h.c && q.r > h.r && q.r - h.r <= 5 && (q.state === 'shake' || q.state === 'fall')) t = Math.min(t, q.state === 'shake' ? S.icicleShake - q.t : 0);
    for (const q of st.rollers) if (q.c === h.c && (q.state === 'warn' || q.state === 'roll') && q.y < hy(st, h)) { t = Math.min(t, q.state === 'warn' ? S.rollWarn - q.t : 0); roll = true; }
    let spout = 99;
    for (const sp of st.spouts) if (sp.c === h.c && sp.state !== 'rest') spout = sp.state === 'warn' ? sp.t : 0;
    return { t, roll, spout, shieldable };
  }
  function plan(st) {
    if (st.planMemo && st.planMemo.n === G.tickN && st.planMemo.k === st.k) return st.planMemo.p;
    const p = planNow(st);
    st.planMemo = { n: G.tickN, k: st.k, p };
    return p;
  }
  function planNow(st) {
    const A = st.h[st.axe], Sh = st.h[st.shield], next = st.base + S.ledgeEvery;
    const out = { route: null, goal: 'ledge', axe: { dir: null, chop: false, wait: false, why: 'idle' }, shield: { dir: null, up: false, tilt: 0, why: 'idle' } };
    if (st.state !== 'go') return out;
    const lastGate = st.k === 3 && st.base === S.rowsPer;
    // ---- the axe hero's goal: a rune in this section, else the next ledge (or the gate rope)
    let goalFn = (c, r) => r === next;
    if (lastGate) { out.goal = 'gate'; goalFn = (c, r) => cell(st, c, r) === 'G'; }
    else {
      const runes = [];
      for (let r = st.base + 1; r < next; r++) for (let c = 0; c < S.cols; c++) if (st.g[r][c] === 'U') runes.push({ c, r });
      if (runes.length && st.frost < st.base + 1.2) {
        runes.sort((a, b) => (Math.abs(a.c - A.c) + Math.abs(a.r - A.r)) - (Math.abs(b.c - A.c) + Math.abs(b.r - A.r)));
        const R0 = runes[0];
        out.goal = 'rune'; goalFn = (c, r) => c === R0.c && r === R0.r;
      }
    }
    // the shield hero can't walk to us (a crumbled snow hold, a melt): chop a way back to them first
    const stranded = !walkRoute(st, Sh, A) && !(Sh.r === A.r && isLedgeRow(A.r));
    if (stranded && !lastGate) { out.goal = 'partner'; goalFn = (c, r) => (c === Sh.c && r === Sh.r) || (Math.abs(c - Sh.c) <= 1 && Math.abs(r - Sh.r) <= 1 && walkable(st, c, r) && walkRoute(st, Sh, { c, r })); }
    let path = route(st, A, goalFn);
    if (!path && out.goal === 'rune') { out.goal = 'ledge'; path = route(st, A, (c, r) => r === next); }
    out.route = path;
    // ---- the shield hero: onto the axe hero's hold (where the shield covers both)
    const tA = threatAt(st, A), tS = threatAt(st, Sh);
    const near = Sh.c === A.c && Sh.r === A.r, cov = Math.abs(hx(st, A) - hx(st, Sh)) <= S.cover / 2 && A.r <= Sh.r && Sh.r - A.r <= 1;
    const sWalk = walkRoute(st, Sh, A), sSteps = sWalk ? sWalk.length - 1 : 99;
    const shieldComes = !cov && sSteps * S.moveT + S.raiseT + 0.1 < tA.t;
    {
      let want = null;
      if (sWalk && sWalk.length > 1) want = dirKey(sWalk[1].c - Sh.c, sWalk[1].r - Sh.r);
      let up;
      if (tA.t < 1.3 && !cov && shieldComes) up = false;           // hurry over to the partner first
      else up = (tA.t < 1.3 && (cov || near)) || tS.t < 0.6;        // raise as a tell starts, keep up until clear
      out.shield.up = up;
      if (up && (tA.roll || tS.roll)) out.shield.tilt = Sh.c <= 7 ? -1 : 1;
      // move: with the shield up only straight up/down
      if (want && !(up && DIRS[want][0] !== 0)) out.shield.dir = want;
      if (cov && (up || tA.t < 1.3)) out.shield.dir = null;
      // never stand in a spout column when it's about to gush
      if (tS.spout < 1.15) { const d = escape(st, Sh); if (d) { out.shield.dir = d; out.shield.up = false; } }
      out.shield.why = up ? 'cover' : near ? 'with partner' : 'follow';
    }
    // ---- the axe hero
    if (path && path.length > 1) {
      const n1 = path[1], dc = n1.c - A.c, dr = n1.r - A.r, d = dirKey(dc, dr);
      const ch = cell(st, n1.c, n1.r);
      const free = walkable(st, n1.c, n1.r);
      if (!free && choppable(ch)) { out.axe.dir = d; out.axe.chop = true; out.axe.why = ch === 'U' ? 'rune' : 'chop'; }
      else if (free) { out.axe.dir = d; out.axe.why = 'climb'; }
      else { out.axe.wait = true; out.axe.why = 'wait for the melt'; }
      // an icicle hanging right above: knock it down first
      const ic = st.icicles.find(q => (q.state === 'hang' || q.state === 'shake') && q.r - A.r === 1 && Math.abs(q.c - A.c) <= 1 && q.c === n1.c);
      if (ic) { out.axe.dir = dirKey(ic.c - A.c, 1); out.axe.chop = true; out.axe.why = 'icicle'; }
      // something about to land that the shield can stop: stay put under it (chopping is fine), or go to the shield
      if (tA.t < 1.3 && tA.spout >= 1.3) {
        if (cov || shieldComes) { if (out.axe.dir && !out.axe.chop) out.axe.dir = null; out.axe.why = cov ? 'tuck' : 'wait for cover'; out.axe.wait = true; }
        else {
          const aWalk = walkRoute(st, A, Sh);
          out.axe.chop = false; out.axe.wait = true; out.axe.why = 'to cover';
          out.axe.dir = aWalk && aWalk.length > 1 ? dirKey(aWalk[1].c - A.c, aWalk[1].r - A.r) : null;
        }
      }
      // don't step into a column that's about to gush, or away from the shield (more than a step for it to follow)
      if (out.axe.dir && !out.axe.chop && out.axe.why === 'climb') {
        const [ddc, ddr] = DIRS[out.axe.dir], nc = A.c + ddc, nr = A.r + ddr;
        if (st.spouts.some(q => q.c === nc && q.state !== 'rest')) { out.axe.dir = null; out.axe.wait = true; out.axe.why = 'spout'; }
        else if (!isLedgeRow(nr) && sSteps >= 2 && sSteps < 99) { out.axe.dir = null; out.axe.wait = true; out.axe.why = 'wait for shield'; }
      }
      if (tA.spout < 1.15) {
        const e = escape(st, A);
        if (e) { out.axe.dir = e; out.axe.chop = false; out.axe.why = 'dodge spout'; }
        else {
          // no hold to step to: chop one to the side, fast
          for (const d2 of ['l', 'r']) { const [dc2] = DIRS[d2], c2 = A.c + dc2; if (choppable(cell(st, c2, A.r)) && !st.spouts.some(q => q.c === c2)) { out.axe.dir = d2; out.axe.chop = true; out.axe.why = 'dodge spout'; break; } }
        }
      }
    } else if (lastGate) {
      // the gate rope is right above
      const G_ = st.g[S.rowsPer + 1].indexOf('G');
      if (G_ >= 0) { const dc = clamp(G_ - A.c, -1, 1); if (Math.abs(G_ - A.c) <= 1) { out.axe.dir = dirKey(dc, 1); out.axe.chop = true; out.axe.why = 'gate'; } else { out.axe.dir = dc < 0 ? 'l' : 'r'; out.axe.why = 'to gate'; } }
    }
    // gusts: both cling
    if (st.gust && st.gust.state !== 'blow' || st.gust && st.gust.state === 'blow') { out.axe.cling = true; out.shield.cling = true; }
    out.danger = { axe: tA, shield: tS };
    return out;
  }

  /* ---------- drawing ---------- */
  const SKIES = [{}, { sleet: 0.4 }, { storm: 0.3, sleet: 0.6 }, { night: true, sleet: 0.3 }];
  function draw(st) {
    const t = st.clock, cy = st.cam.y;
    K.sky(0, t, SKIES[st.k] || {});
    // the fortress far above, getting closer as the raid goes on
    const prog = (st.k * S.rowsPer + Math.min(...st.h.map(h => h.r))) / (4 * S.rowsPer);
    drawFortress(W / 2, 40 + prog * 120 - (st.k === 3 ? clamp((-cy - wy(S.rowsPer) - 300) * 0.3, -120, 0) : 0), 0.5 + prog * 0.6, t, st);
    ctx.save(); ctx.translate(0, -cy);
    drawWall(st, t);
    ctx.restore();
  }
  function drawFortress(x, y, s, t, st) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = 'rgba(80,110,140,0.55)';
    ctx.fillRect(-260, 20, 520, 80);
    for (let k = -6; k <= 6; k++) { ctx.beginPath(); ctx.moveTo(k * 40 - 16, 20); ctx.lineTo(k * 40, -6); ctx.lineTo(k * 40 + 16, 20); ctx.closePath(); ctx.fill(); }
    for (const d of [-1, 1]) { ctx.fillRect(d * 240 - 30, -40, 60, 140); ctx.beginPath(); ctx.moveTo(d * 240 - 36, -40); ctx.lineTo(d * 240, -86); ctx.lineTo(d * 240 + 36, -40); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle = 'rgba(200,60,60,0.7)'; ctx.fillRect(-4, -60, 4, 40); ctx.beginPath(); ctx.moveTo(0, -60); ctx.lineTo(30 + Math.sin(t * 4) * 4, -52); ctx.lineTo(0, -44); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function drawWall(st, t) {
    const cy = st.cam.y, r0 = Math.max(0, Math.floor(-(cy + H) / S.rh) - 1), r1 = Math.min(st.rows - 1, Math.ceil(-cy / S.rh) + 1);
    // the ice face behind everything
    const top = wy(r1) - S.rh, bot = wy(r0) + S.rh;
    const g = ctx.createLinearGradient(0, top, 0, bot);
    g.addColorStop(0, '#a8d4ea'); g.addColorStop(1, '#7fb4cc');
    ctx.fillStyle = g; ctx.fillRect(X0 - S.cw * 0.5 - 30, top, (S.cols) * S.cw + 60, bot - top);
    // frozen-waterfall streaks
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 3;
    for (let k = 0; k < 12; k++) { const x = X0 - 20 + k * 58 + Math.sin(k) * 10; ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x + Math.sin(k * 3) * 14, bot); ctx.stroke(); }
    // dark rock walls at the sides
    ctx.fillStyle = '#4a4e56'; ctx.fillRect(0, top, X0 - S.cw * 0.5 - 30, bot - top); ctx.fillRect(cx(S.cols - 1) + S.cw * 0.5 + 30, top, W, bot - top);
    for (let r = r0; r <= r1; r++) for (let c = 0; c < S.cols; c++) drawCell(st, c, r, t);
    // the frost line
    if (st.frost > st.base) {
      const fy = wy(st.frost);
      const fg = ctx.createLinearGradient(0, fy - 20, 0, fy + 60);
      fg.addColorStop(0, 'rgba(240,250,255,0)'); fg.addColorStop(0.3, 'rgba(240,250,255,0.75)'); fg.addColorStop(1, 'rgba(220,240,255,0.9)');
      ctx.fillStyle = fg; ctx.fillRect(X0 - S.cw, fy - 20, S.cols * S.cw + S.cw, wy(st.base) - fy + 10);
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2; ctx.beginPath();
      for (let x = X0 - S.cw; x <= cx(S.cols); x += 12) ctx.lineTo(x, fy + Math.sin(x * 0.2 + t * 3) * 3);
      ctx.stroke();
      text('FROST', X0 - 40, fy + 10, 11, '#ffffff', 'center', 'body');
    }
    // the gargoyle spouts at the top of their columns, and their gush
    for (const sp of st.spouts) {
      const x = cx(sp.c), y = Math.min(wy(r1), cy + 70);
      if (sp.state === 'gush') {
        const gg = ctx.createLinearGradient(x - 16, 0, x + 16, 0);
        gg.addColorStop(0, 'rgba(255,255,255,0.2)'); gg.addColorStop(0.5, 'rgba(230,245,255,0.85)'); gg.addColorStop(1, 'rgba(255,255,255,0.2)');
        ctx.fillStyle = gg; ctx.fillRect(x - 16, y, 32, cy + H - y);
        for (let k = 0; k < 4; k++) { ctx.fillStyle = 'rgba(255,255,255,0.5)'; circle(x + Math.sin(t * 20 + k) * 14, cy + ((t * 500 + k * 130) % H), 6); ctx.fill(); }
      }
      if (sp.state === 'warn') for (let k = 0; k < 3; k++) { ctx.fillStyle = 'rgba(255,255,255,' + (0.5 - k * 0.12) + ')'; circle(x + Math.sin(t * 6 + k) * 8, y + 10 - k * 12 - (t * 30 % 12), 9 + k * 3); ctx.fill(); }
      // the gargoyle head
      ctx.fillStyle = '#6e737a'; ctx.strokeStyle = '#2e3036'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x - 18, y - 22); ctx.lineTo(x + 18, y - 22); ctx.lineTo(x + 14, y + 2); ctx.lineTo(x + 6, y + 8); ctx.lineTo(x - 6, y + 8); ctx.lineTo(x - 14, y + 2); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = sp.state === 'warn' ? '#ff6a3a' : '#2e3036'; circle(x - 7, y - 12, 3); ctx.fill(); circle(x + 7, y - 12, 3); ctx.fill();
      ctx.fillStyle = '#2e3036'; ctx.fillRect(x - 5, y + 2, 10, 5);
    }
    // icicles
    for (const q of st.icicles) {
      if (q.state === 'gone') continue;
      const x = cx(q.c) + (q.state === 'shake' ? Math.sin(t * 50) * 2 : 0), y = q.state === 'fall' ? q.y : wy(q.r) - S.rh / 2 + 4;
      ctx.fillStyle = '#e8f8ff'; ctx.strokeStyle = '#7fb4cc'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x - 10, y); ctx.lineTo(x + 10, y); ctx.lineTo(x + 2, y + 40); ctx.lineTo(x, y + 46); ctx.lineTo(x - 2, y + 40); ctx.closePath(); ctx.fill(); ctx.stroke();
      if (q.state === 'shake') { ctx.strokeStyle = 'rgba(255,90,70,0.8)'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(cx(q.c), y + 46); ctx.lineTo(cx(q.c), y + 46 + 4 * S.rh); ctx.stroke(); ctx.setLineDash([]); }
    }
    // the chutes and their rollers
    for (const c of st.chutes) { ctx.fillStyle = 'rgba(60,90,110,0.18)'; ctx.fillRect(cx(c) - 18, wy(r1) - S.rh, 36, bot - wy(r1) + S.rh); }
    for (const q of st.rollers) {
      const x = cx(q.c) + (q.slideX || 0);
      if (q.state === 'warn') {
        const y = cy + 92;
        ctx.fillStyle = 'rgba(255,90,70,' + (0.5 + 0.4 * Math.sin(t * 16)) + ')'; ctx.beginPath(); ctx.moveTo(x - 14, y); ctx.lineTo(x + 14, y); ctx.lineTo(x, y + 20); ctx.closePath(); ctx.fill();
        text(q.kind === 'snow' ? 'SNOWBALL!' : 'BARREL!', x, y - 10, 12, '#ffffff', 'center', 'body');
        continue;
      }
      ctx.save(); ctx.translate(x, q.y); ctx.rotate(q.y * 0.04);
      if (q.kind === 'snow') { ctx.fillStyle = '#ffffff'; circle(0, 0, 18); ctx.fill(); ctx.strokeStyle = '#bcd6e4'; ctx.lineWidth = 2; ctx.stroke(); }
      else { ctx.fillStyle = '#8a5a32'; rr(-16, -18, 32, 36, 6); ctx.fill(); ctx.fillStyle = '#4a4e56'; ctx.fillRect(-16, -10, 32, 3); ctx.fillRect(-16, 7, 32, 3); }
      ctx.restore();
    }
    // the arrow volley: shadows during the tell, arrows during the rain
    const v = st.volley;
    if (v) {
      const x0 = v.x - S.volleyW / 2;
      if (v.state === 'tell') {
        ctx.fillStyle = 'rgba(30,30,50,' + (0.12 + 0.18 * v.t) + ')'; ctx.fillRect(x0, cy, S.volleyW, H);
        ctx.strokeStyle = 'rgba(255,90,70,' + (0.5 + 0.4 * Math.sin(t * 18)) + ')'; ctx.lineWidth = 3; ctx.strokeRect(x0, cy + 4, S.volleyW, H - 8);
        for (let k = 0; k < 10; k++) { ctx.fillStyle = 'rgba(20,20,40,0.35)'; ctx.fillRect(x0 + 10 + k * 19, cy + ((k * 97 + t * 200) % H), 3, 16); }
      } else {
        ctx.strokeStyle = '#5a3418'; ctx.lineWidth = 2;
        for (let k = 0; k < 22; k++) { const ax = x0 + K.hash(k) * S.volleyW, ay = cy + ((K.hash(k + 9) * H + v.t * 900) % H); ctx.beginPath(); ctx.moveTo(ax, ay - 16); ctx.lineTo(ax, ay); ctx.stroke(); ctx.fillStyle = '#c8ccd6'; ctx.beginPath(); ctx.moveTo(ax - 3, ay); ctx.lineTo(ax, ay + 6); ctx.lineTo(ax + 3, ay); ctx.closePath(); ctx.fill(); }
      }
    }
    // the gate and the palisade in the last stretch
    if (st.k === 3) drawGate(st, t);
    // heroes
    for (const h of [st.h[st.axe], st.h[st.shield]]) drawHero(st, h, t);
    // the gust
    if (st.gust) {
      ctx.strokeStyle = 'rgba(255,255,255,' + (st.gust.state === 'blow' ? 0.8 : 0.4) + ')'; ctx.lineWidth = 2;
      for (let k = 0; k < 18; k++) { const y = cy + 60 + k * 26, x = ((K.hash(k) * W + st.gust.dir * t * 900) % W + W) % W; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + st.gust.dir * 50, y + 4); ctx.stroke(); }
      if (st.gust.state === 'warn') text(st.gust.dir < 0 ? '◀ WIND' : 'WIND ▶', W / 2, cy + 150, 22, '#ffffff', 'center');
    }
    K.drawParts(st, 0);
  }
  function drawGate(st, t) {
    const y = wy(S.rowsPer + 1) - S.rh / 2, open = st.state === 'end' ? K.smooth(st.endT / 0.8) : 0;
    // the palisade over the top ledge
    ctx.fillStyle = '#6a4a2a';
    for (let c = -1; c <= S.cols; c++) { const x = cx(c); ctx.fillRect(x - 16, y - 120, 32, 140); ctx.beginPath(); ctx.moveTo(x - 16, y - 120); ctx.lineTo(x, y - 140); ctx.lineTo(x + 16, y - 120); ctx.closePath(); ctx.fill(); }
    // defenders peeking over (helmets and arms), running away at the end
    for (let k = 0; k < 5; k++) {
      const x = cx(1 + k * 3) + (st.state === 'end' ? (k % 2 ? 1 : -1) * st.endT * 200 : 0), yy = y - 128 + Math.sin(t * 4 + k) * 4;
      ctx.fillStyle = '#9aa2ae'; ctx.beginPath(); ctx.arc(x, yy, 10, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#e8c8a0'; ctx.fillRect(x - 7, yy, 14, 6);
      if (Math.sin(t * 3 + k) > 0.3) { ctx.strokeStyle = '#e8c8a0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + 8, yy + 4); ctx.lineTo(x + 16, yy - 8 - Math.sin(t * 9 + k) * 4); ctx.stroke(); }
    }
    // the drawbridge (gate) over the gate rope cell
    const gc = 7, gx = cx(gc);
    ctx.save(); ctx.translate(gx, y + 20); ctx.rotate(open * Math.PI / 2 * 0.95);
    ctx.fillStyle = '#8a5a32'; ctx.fillRect(-46, -150, 92, 150); ctx.strokeStyle = '#3a2210'; ctx.lineWidth = 3; ctx.strokeRect(-46, -150, 92, 150);
    for (let k = 1; k < 4; k++) ctx.fillRect(-46 + k * 23, -150, 2, 150);
    ctx.restore();
    const hits = st.hits[S.rowsPer + 1][gc];
    if (st.g[S.rowsPer + 1][gc] === 'G') {
      ctx.strokeStyle = '#e8d8b0'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(gx - 40, y - 140); ctx.lineTo(gx, y + 10); ctx.lineTo(gx + 40, y - 140); ctx.stroke();
      ctx.fillStyle = '#ffd23a'; circle(gx, y + 10, 9); ctx.fill();
      text('CHOP ' + (3 - hits), gx, y + 30, 12, '#ffffff', 'center', 'body');
    }
  }
  function drawCell(st, c, r, t) {
    const ch = st.g[r][c], x = cx(c), y = wy(r), hw = S.cw / 2, hh = S.rh / 2;
    const melted = st.melt[r][c] > 0;
    if (ch === 'L') {
      if (c === 0) {
        ctx.fillStyle = '#6a4424'; ctx.fillRect(X0 - S.cw * 0.5 - 30, y + 10, S.cols * S.cw + 60, 14);
        ctx.fillStyle = '#9a6a3a'; ctx.fillRect(X0 - S.cw * 0.5 - 30, y + 8, S.cols * S.cw + 60, 5);
        for (let k = 0; k < S.cols + 1; k++) { ctx.fillStyle = '#4a2c14'; ctx.fillRect(X0 - S.cw * 0.5 - 20 + k * S.cw, y + 24, 6, 26); }
      }
      return;
    }
    if (ch === 'R') {
      ctx.fillStyle = '#5a5e66'; rr(x - hw + 1, y - hh + 1, S.cw - 2, S.rh - 2, 6); ctx.fill();
      ctx.fillStyle = '#6e737a'; rr(x - hw + 4, y - hh + 4, S.cw - 14, S.rh / 2 - 4, 4); ctx.fill();
      ctx.fillStyle = '#f2f6f8'; ctx.fillRect(x - hw + 2, y - hh + 1, S.cw - 4, 4);
      return;
    }
    if (ch === 'P') {
      ctx.fillStyle = '#5a5e66'; rr(x - hw + 1, y - hh + 1, S.cw - 2, S.rh - 2, 6); ctx.fill();
      ctx.strokeStyle = st.ropeFree ? '#e8d8b0' : '#cfe8f2'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x, y - hh); ctx.lineTo(x + Math.sin(t * 2 + r) * (st.ropeFree ? 3 : 0), y + hh); ctx.stroke();
      if (!st.ropeFree) { ctx.fillStyle = 'rgba(220,240,255,0.8)'; ctx.fillRect(x - 6, y - hh, 12, S.rh); }
      return;
    }
    if (ch === 'B') { ctx.fillStyle = 'rgba(60,140,210,0.75)'; rr(x - hw + 2, y - hh + 2, S.cw - 4, S.rh - 4, 6); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x - 10, y - 12); ctx.lineTo(x + 6, y + 10); ctx.stroke(); }
    else if (ch === 'N') { ctx.fillStyle = '#f4f8fb'; ctx.beginPath(); ctx.ellipse(x, y + 4, hw - 3, hh - 6, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#dce8f0'; ctx.beginPath(); ctx.ellipse(x + 4, y + 8, hw - 12, hh - 14, 0, 0, TAU); ctx.fill(); }
    else if (ch === 'U') {
      const pulse = 0.6 + 0.4 * Math.sin(t * 4 + c + r);
      ctx.fillStyle = 'rgba(120,200,255,' + 0.3 * pulse + ')'; circle(x, y, 16); ctx.fill();
      ctx.fillStyle = '#7a7f8a'; rr(x - 10, y - 13, 20, 26, 5); ctx.fill();
      ctx.strokeStyle = '#9fe8ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 4, y - 8); ctx.lineTo(x - 4, y + 8); ctx.moveTo(x - 4, y - 8); ctx.lineTo(x + 5, y - 2); ctx.lineTo(x - 4, y + 2); ctx.lineTo(x + 5, y + 8); ctx.stroke();
      ctx.fillStyle = 'rgba(220,240,255,0.45)'; rr(x - hw + 4, y - hh + 4, S.cw - 8, S.rh - 8, 6); ctx.fill();
    } else if (ch === 'K') {
      ctx.fillStyle = '#e8d8b0'; circle(x, y - 6, 10); ctx.fill(); ctx.strokeStyle = '#a08a5a'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = 'rgba(220,240,255,0.6)'; circle(x, y - 6, 12); ctx.fill();
      text('KNOT', x, y + 14, 9, '#2a4a5a', 'center', 'body');
    } else if (ch === 'H') {
      // a chopped notch
      ctx.fillStyle = melted ? 'rgba(200,230,250,0.6)' : '#3a5a72';
      ctx.beginPath(); ctx.moveTo(x - 13, y - 4); ctx.quadraticCurveTo(x, y + 8, x + 13, y - 4); ctx.lineTo(x + 10, y + 6); ctx.quadraticCurveTo(x, y + 12, x - 10, y + 6); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 13, y - 4); ctx.quadraticCurveTo(x, y + 8, x + 13, y - 4); ctx.stroke();
      if (st.snowT[r][c] > 0 || st.snowT[r][c] === -2) { ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(x, y + 8, 12, 4, 0, 0, TAU); ctx.fill(); if (st.snowT[r][c] > 0 && Math.sin(t * 20) > 0) text('!', x + 16, y - 6, 12, '#ff6a3a', 'center'); }
      if (melted) { ctx.fillStyle = 'rgba(255,255,255,0.6)'; for (let k = 0; k < 3; k++) { circle(x - 6 + k * 6, y + 10 + ((t * 40 + k * 7) % 14), 2); ctx.fill(); } }
    }
    // chop cracks
    const n = st.hits[r][c];
    if (n > 0 && choppable(ch)) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.beginPath(); for (let k = 0; k < n * 2; k++) { const a = K.hash(c * 31 + r * 7 + k) * TAU; ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * 15, y + Math.sin(a) * 15); } ctx.stroke(); }
  }
  function drawHero(st, h, t) {
    const x = hx(st, h), y = hy(st, h), isAxe = h.id === st.axe, climbing = h.mt > 0;
    const rot = h.stun > 0 ? Math.sin(t * 20) * 0.2 : climbing ? Math.sin((1 - h.mt / h.mT) * Math.PI) * 0.1 : 0;
    // arms up to the hold
    ctx.strokeStyle = PDARK[h.id]; ctx.lineWidth = 4; ctx.lineCap = 'round';
    if (!(h.raise > 0.3) && !isAxe) { ctx.beginPath(); ctx.moveTo(x - 6, y - 18); ctx.lineTo(x - 9, y - 30); ctx.moveTo(x + 6, y - 18); ctx.lineTo(x + 9, y - 30); ctx.stroke(); }
    ctx.lineCap = 'butt';
    K.viking(h.id, x, y, { face: isAxe ? 1 : -1, rot, sy: 1 - h.sq * 0.15, stun: h.stun > 0, arms: !isAxe && h.raise > 0.3 ? 'up' : null, cloakV: 0.2 });
    if (isAxe) {
      // the axe, swinging on a chop
      const sw = h.chopT > 0 ? h.chopT / S.chopT : 0;
      ctx.save(); ctx.translate(x + 8, y - 20); ctx.rotate(-1.2 + sw * 1.6);
      ctx.fillStyle = '#7a4a22'; ctx.fillRect(-2, -26, 4, 28);
      ctx.fillStyle = '#c8ccd6'; ctx.beginPath(); ctx.moveTo(2, -26); ctx.quadraticCurveTo(14, -30, 14, -18); ctx.lineTo(2, -16); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#4a4e56'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.restore();
    } else {
      // the big round shield: overhead when raised, on the back otherwise
      const up = h.raise, w = (st.gold ? S.coverGold : S.cover) / 2;
      if (up > 0.2) {
        const sy = y - 44 - 6 * up;
        ctx.save(); ctx.translate(x, sy); ctx.rotate(h.tilt * 0.35);
        ctx.fillStyle = st.gold ? 'rgba(255,197,61,0.25)' : 'rgba(255,255,255,0.12)'; ctx.fillRect(-w, -2, w * 2, 6);
        ctx.scale(1, 0.32);
        K.shield(0, 0, w * 0.62, { col: st.gold ? '#ffc53d' : '#c8323a', col2: st.gold ? '#fff2b0' : '#f2e6c8' });
        ctx.restore();
        // arrows stuck in it
        const n = Math.min(8, st.stats.blocked);
        ctx.strokeStyle = '#5a3418'; ctx.lineWidth = 2;
        for (let k = 0; k < n; k++) { const ax = x - w * 0.5 + K.hash(k * 3) * w; ctx.beginPath(); ctx.moveTo(ax, sy - 2); ctx.lineTo(ax + (K.hash(k) - 0.5) * 6, sy - 16); ctx.stroke(); }
      } else K.shield(x - 10, y - 14, 10, { col: st.gold ? '#ffc53d' : '#c8323a' });
    }
  }
  function drawTop(st) {
    K.drawPops(st, 0, st.cam.y);
  }

  /* ---------- HUD ---------- */
  function hud(st) {
    const big = hudBig(), z = big ? 1.35 : 1, play = G.mode === 'play' || G.mode === 'paused';
    let timeX0;
    {
      const fs = big ? 20 : 14, h = big ? 40 : 28, tm = fmtTime(G.time), n = 'ᚱ ' + st.runes + ' / 20';
      ctx.font = K.FONT(fs);
      const w = ctx.measureText(tm).width + ctx.measureText(n).width + fs + 30, x0 = pill(W - 14, 12, w, h, 'right'), cy = 12 + h / 2 + 0.5;
      text(tm, x0 + 15, cy, fs, st.waiting ? '#aab' : C.paper, 'left', 'body');
      text(n, x0 + w - 15, cy, fs, '#9fe8ff', 'right', 'body');
      timeX0 = x0;
    }
    K.drawMsg(st, st.waiting ? { text: K.BREAK, col: '#ffffff', t: 1, life: 2 } : st.msg, timeX0);
    if (!play || !st.h) return;
    const pl = plan(st), An = st.axe, Sn = st.shield, A = st.h[An], Sh = st.h[Sn];
    const kk = (id, what) => (K.quiet(id) ? '' : K.key(id, what) + ' ');
    {
      const bx = K.panel(An, 'axe', 236, 58, z), cy = bx.y + 27 * z, chh = 23 * z, cw = (bx.w - 24 * z - 6 * z) / 2, x0 = bx.x + 12 * z;
      K.chip(x0, cy, cw, chh, kk(An, 'act') + 'CHOP', !!pl.axe.chop, A.chopT > 0, z);
      K.chip(x0 + cw + 6 * z, cy, cw, chh, kk(An, 'up') + 'CLIMB', !!pl.axe.dir && !pl.axe.chop, A.mt > 0, z);
    }
    {
      const bx = K.panel(Sn, 'shield', 236, 58, z), cy = bx.y + 27 * z, chh = 23 * z, cw = (bx.w - 24 * z - 6 * z) / 2, x0 = bx.x + 12 * z;
      K.chip(x0, cy, cw, chh, kk(Sn, 'act') + 'SHIELD', !!pl.shield.up && Sh.raise < 0.9, Sh.raise >= 0.9, z);
      K.chip(x0 + cw + 6 * z, cy, cw, chh, kk(Sn, 'lr') + 'TILT', !!pl.shield.tilt && !Sh.tilt, !!Sh.tilt, z);
    }
    // the climb meter: ledges in this stretch
    {
      const x = W / 2, y = H - 30 * z;
      ctx.fillStyle = 'rgba(16,26,40,0.85)'; rr(x - 90 * z, y - 24 * z, 180 * z, 40 * z, 12 * z); ctx.fill();
      text(st.title, x, y - 10 * z, 12 * z, '#ffffff', 'center', 'body');
      for (let k = 0; k < 3; k++) { ctx.fillStyle = k < st.sec ? '#8fe3b0' : k === st.sec ? C.gold : 'rgba(255,255,255,0.25)'; rr(x - 50 * z + k * 36 * z, y + 2 * z, 28 * z, 9 * z, 4 * z); ctx.fill(); }
      if (st.gold) text('gold shield', x + 96 * z, y, 12 * z, C.gold, 'left', 'body');
    }
    if (G.introT > 0 || st.state !== 'go' || st.waiting) return;
    const P = K.prompter(st), cy = st.cam.y;
    const sx = h => clamp(hx(st, h), 70, W - 70), sy = h => hy(st, h) - cy - 56;
    const arrows = { up: '▲', ul: '◀▲', ur: '▲▶', l: '◀', r: '▶', d: '▼', dl: '◀▼', dr: '▼▶' };
    {
      let s = null, col = C.gold, pulse = false;
      if (pl.axe.why === 'tuck') { s = 'Stay under the shield!'; col = '#d9ffd0'; }
      else if (pl.axe.why === 'to cover') { s = 'Get under the shield!'; pulse = true; }
      else if (pl.axe.chop) { s = 'Chop ' + (pl.axe.dir && pl.axe.dir !== 'up' ? arrows[pl.axe.dir] + ' + ' : '') + K.key(An, 'act') + (pl.axe.why === 'rune' ? ' (rune!)' : pl.axe.why === 'gate' ? ' THE GATE ROPE!' : ''); pulse = pl.axe.why === 'gate'; }
      else if (pl.axe.dir && pl.axe.why === 'climb') { s = 'Climb ' + arrows[pl.axe.dir]; col = '#ffe7a8'; }
      else if (pl.axe.why === 'wait for shield') { s = 'Wait for ' + NAMES[Sn] + '\'s shield'; col = '#ffe7a8'; }
      P.say(An, s, sx(A), sy(A), col, pulse);
    }
    {
      let s = null, col = C.gold, pulse = false;
      if (pl.shield.up && Sh.raise < 0.9) { s = 'Shield up! Hold ' + K.key(Sn, 'act'); pulse = true; }
      else if (pl.shield.tilt && !Sh.tilt) { s = 'Tilt it! ' + K.key(Sn, pl.shield.tilt < 0 ? 'left' : 'right'); pulse = true; }
      else if (!pl.shield.up && Sh.raise >= 0.9 && pl.shield.dir) { s = 'Clear! Lower it and climb'; col = '#ffe7a8'; }
      else if (pl.shield.dir && !(Sh.c === A.c && Sh.r === A.r)) { s = 'Climb to ' + NAMES[An] + ' ' + arrows[pl.shield.dir]; col = '#ffe7a8'; }
      P.say(Sn, s, sx(Sh), sy(Sh), col, pulse);
    }
  }
  const medal = t => K.medal(t <= S.goldT, t <= S.silverT);

  MODES.icefort = {
    S, plan, medal, layout, covered,
    setup(st, L) {
      st.stats = { tumbles: 0, blocked: 0, runes: 0, chops: 0, knocks: 0, blown: 0, ledges: 0, helps: 0, roomT: [] };
      st.runes = 0; st.inT = [G.time, G.time]; st.personT = G.time; st.clock = 0; st.axe = 0;
      for (const row of L.grid) row.fill('.');
      room(st, L, 0);
    },
    room(k, L) { const st = G.mst; st.inT = [G.time, G.time]; st.personT = G.time; for (const row of L.grid) row.fill('.'); room(st, L, k); },
    step(dt) { tick(G.mst, dt); },
    draw() { const st = G.mst; if (!st.g) return; draw(st); K.hide(st); },
    drawTop() { const st = G.mst; K.unhide(st); if (st.g) drawTop(st); },
    hud() { const st = G.mst; if (st.g) hud(st); },
    stats() {
      const st = G.mst, s = st.stats;
      if (!s) return [];
      const out = [
        { label: 'Tumbles', value: String(s.tumbles) },
        { label: 'Arrows blocked', value: String(s.blocked) },
        { label: 'Rune stones', value: st.runes + ' of 20' },
        { label: 'Medal', value: medal(G.time) },
      ];
      out.push('Holds chopped: ' + s.chops + ' chops. Knocked down a row: ' + s.knocks + '. The ice fortress fell!');
      const hl = K.helpLine(s.helps); if (hl) out.push(hl);
      return out;
    },
  };

  /* ---------- the level ---------- */
  const acts = a => ({ label: 'chop', labels: a === 0 ? ['chop', 'shield'] : ['shield', 'chop'] });
  VIKING.defs.icefort = {
    name: 'Ice Fortress Raid', world: 33, kind: 'team', mode: 'icefort', ownStep: true, ownHUD: true, noFalls: true, roomWord: 'Stretch',
    legend: {
      pip: '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> climb',
      bo: '<kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd> climb',
      pad: 'stick or d-pad climbs,',
    },
    tip: 'Climb the ice! The axe hero taps the action to chop handholds; the shield hero holds the action to keep the arrows off you both. Swap at every ledge.',
    act: acts(0),
    map: K.stubMap(),
    rooms: [
      { title: 'The Ice Foot', volleyEvery: 7, volleyFirst: 4, done: 'Up the ice foot!', act: acts(0),
        tip: 'Pip chops holds (hold a direction, tap the action). Bo holds the action for the shield when the horn blows. Swap at each ledge!' },
      { title: 'Frozen Falls', volleyEvery: 8, done: 'Over the falls!', act: acts(1),
        tip: 'Blue ice takes 4 chops, snow 1 but it crumbles. Icicles shake before they fall: shield up, or chop them loose!' },
      { title: 'The Scaffolds', volleyEvery: 8, done: 'Past the scaffolds!', act: acts(0),
        tip: 'Chop the rope\'s knot to climb it. Tilt the shield (◀ ▶) for barrels. Hot-water spouts: the shield won\'t help, wait!' },
      { title: 'Under the Walls', volleyEvery: 7, gusts: true, done: 'Under the walls!', act: acts(1),
        tip: 'Everything at once, and wind: hold ▼ to cling. At the top, chop the gate rope!' },
    ],
  };

  /* ---------- sounds ---------- */
  Sfx.extra.icefortGrab = function (p) { p = p || 1; this.tone(520 * p, 0.04, 'triangle', 0.02, 700 * p); };
  Sfx.extra.icefortShatter = function () { [2400, 1800, 2900].forEach((f, i) => this.tone(f, 0.08, 'square', 0.012, f * 0.6, i * 0.03)); };
  Sfx.extra.icefortCreak = function () { this.tone(900, 0.4, 'sawtooth', 0.006, 700); };
  Sfx.extra.icefortArrows = function () { for (let i = 0; i < 6; i++) this.tone(1200 + i * 80, 0.06, 'sawtooth', 0.008, 500, i * 0.09); };
  Sfx.extra.icefortRumble = function () { this.tone(70, 0.8, 'sawtooth', 0.03, 50); };
  Sfx.extra.icefortSteam = function () { this.tone(3000, 0.5, 'sawtooth', 0.004, 2400); };
  Sfx.extra.icefortGush = function () { this.tone(400, 0.9, 'sawtooth', 0.015, 120); this.tone(2000, 0.8, 'square', 0.004, 900); };
  Sfx.extra.icefortWind = function () { this.tone(300, 1.0, 'sawtooth', 0.008, 600); };
  Sfx.extra.icefortTumble = function () { this.tone(500, 0.35, 'sawtooth', 0.03, 120); };
  Sfx.extra.icefortCrumble = function () { [0, 0.05, 0.1].forEach((d, i) => this.tone(300 - i * 60, 0.08, 'square', 0.02, 120, d)); };
  Sfx.extra.icefortRope = function () { this.tone(200, 0.2, 'triangle', 0.04, 500); this.tone(500, 0.2, 'triangle', 0.03, 800, 0.15); };
  Sfx.extra.icefortDrawbridge = function () { this.tone(80, 0.9, 'sawtooth', 0.05, 40); this.tone(160, 0.5, 'square', 0.03, 60, 0.3); };
  Sfx.extra.icefortFanfare = function () { [392, 523, 659, 784, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.17, 'triangle', 0.055, null, i * 0.12)); };
})();
