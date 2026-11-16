/* Pip & Bo - Level 31-4 Snail Race (versus, World 31 Shrunk in the Backyard). */
'use strict';

/* ===== 31-4 Snail Race (mode 'snailrace', versus, best of 5, Gavyn's pick) =====
   Gavyn's pick: "steer snails over a garden obstacle course. Mash to speed up, but if you go too fast, your snail hides
   in its shell."
   def.ownStep: the mode runs the whole live tick and draws everything itself (the engine bodies are hidden and only
   follow along for name tags and speech bubbles). The screen is split in two lanes: Pip rides the top lane, Bo the
   bottom one. Both lanes have the very same course, each with its own camera, and a strip in the middle shows how far
   along each snail is.
   SPEED: every press of the action ('go') gives your snail a nudge (+22 px/s); it slows by itself. The speed meter by
     your snail has a green part and a red part. Over the line (110 px/s; gold shell 128) your snail gets NERVOUS: the
     nerve ring fills (faster the further over you are) and when it is full: "EEK!" it hides in its shell for 1.3 s and
     stops dead. Under the line the ring empties again. So: tap in a steady rhythm just under the line; wild mashing
     always ends in the shell.
   STEER ▲ ▼ between the 3 paths of your lane (far, middle, near). A jump press also steers up, so a quick tap is never lost.
   THE COURSE: pebbles (bump one and your snail hides for 0.8 s: steer round them), puddles (a slippery splash: +70 px/s
     at once, so ease off before one, or it tips you over the line), lettuce leaves (your snail stops to munch for 0.6 s:
     "Yum!"), ladybugs that wander across the paths (a bump is a 0.8 s hide), and hills: uphill slows you, downhill speeds
     you up by itself (careful near the line).
   ROUNDS (def.match: best of 5, 60 s each): 1 Garden Path, 2 Mossy Hill, 3 Puddle Run, 4 Ladybug Crossing, 5 Grand
     Garden Prix (everything). First over the finish line wins the round; both in the same tick is a tie.
   TIME UP: the snail further along wins (by more than 20 px), else a tie. tiebreak(): fewer hides this match, then
     more rounds' total distance. Sudden death: the next win takes it.
   CATCH-UP HELP (gold, announced at GO, counted, off in sudden death, for whoever is behind, the computer too):
     1 round behind = a gold shell (the line is 128 instead of 110 and nerves fill slower).
   CONTROLS (p.input / p.pendingAct only, so keyboard, controller and touch all work): action = go (tap), ▲ ▼ steer.
   MODES.snailrace.plan(st, id) (speed, the line, nerve, what is ahead on each path) feeds the prompts, the meter and the
     computer brain. Everything lives inside this block; sounds are Sfx.extra.snailrace*. */
(() => {
  const K = SHRUNK, TAU = Math.PI * 2, FONT = K.FONT;
  const SR = {
    tap: 22, vMax: 220, drag: 0.9, drag0: 8, line: 110, goldLine: 128, nerveT: 0.55, goldNerve: 0.75, calm: 0.8,
    hideT: 1.3, bonkT: 0.8, munchT: 0.6, splash: 70, upK: 34, downK: 52, rowT: 0.22, len: 60, start: 160, startX: 120,
    band: [[82, 300], [312, 530]], rowY: [148, 170, 192], roundTime: 60, finishPad: 20,
  };
  const ROUNDS = [
    { title: 'Garden Path', len: 3600, items: ['p500:1', 'L800:0', 'p950:2', 'p1250:0', 'L1500:1', 'p1700:2', 'p1720:1', 'L2100:2', 'p2400:0', 'p2600:1', 'L2900:0', 'p3150:2'] },
    { title: 'Mossy Hill', len: 3600, hills: [[700, 1200, 1], [1300, 1700, -1], [2200, 2700, 1], [2800, 3300, -1]],
      items: ['p550:2', 'L900:1', 'p1450:0', 'p1500:2', 'L1900:0', 'p2350:1', 'L2600:2', 'p3000:0', 'p3050:1'] },
    { title: 'Puddle Run', len: 3700, items: ['w500:1', 'p800:0', 'w1000:2', 'L1250:1', 'w1500:0', 'p1700:1', 'w1950:1', 'p2200:2', 'w2400:0', 'L2600:1', 'w2900:2', 'p3100:0', 'w3300:1'] },
    { title: 'Ladybug Crossing', len: 3600, items: ['b700', 'p900:0', 'L1100:2', 'b1400', 'p1650:1', 'b2000', 'L2300:0', 'b2600', 'p2850:2', 'b3150'] },
    { title: 'Grand Garden Prix', len: 4000, hills: [[1300, 1700, 1], [1800, 2200, -1]],
      items: ['p500:1', 'w800:0', 'b1050', 'L1250:2', 'p1500:0', 'w1950:1', 'p2150:2', 'b2450', 'L2700:1', 'w3000:2', 'p3250:0', 'b3500', 'p3750:1'] },
  ];
  function compile(R) {
    const items = R.items.map((tok, i) => {
      const k = tok[0], a = tok.slice(1).split(':').map(Number);
      const kind = { p: 'pebble', L: 'leaf', w: 'puddle', b: 'bug' }[k];
      return { kind, x: a[0], row: a[1] === undefined ? 1 : a[1], w: kind === 'puddle' ? 70 : kind === 'leaf' ? 50 : kind === 'bug' ? 34 : 40, i, ph: K.hash(a[0]) * 6 };
    });
    return { len: R.len, items, hills: R.hills || [], title: R.title };
  }
  // the slope at x: +1 uphill, -1 downhill, 0 flat (ramped at the ends)
  const slope = (c, x) => { for (const [a, b, s] of c.hills) if (x >= a && x <= b) return s * Math.min(1, (x - a) / 60, (b - x) / 60); return 0; };
  // a ladybug's path right now (it wanders between the 3 paths)
  const bugRow = (q, t) => 1 + Math.sin(t * 1.4 + q.ph) * 1.25;

  function newRound(st, n, info) {
    const k = st.forceRound != null ? st.forceRound : Math.min(n - 1, ROUNDS.length - 1);
    st.c = compile(ROUNDS[k]); st.round = n; st.t = 0;
    const w = info.wins || [0, 0];
    st.pl = [0, 1].map(id => ({
      id, x: SR.startX, v: 0, row: 1, ry: 1, hide: 0, nerve: 0, munch: 0, bonk: 0, gold: info.suddenDeath || st.noHelp ? 0 : (w[1 - id] - w[id] >= 1 ? 1 : 0),
      done: false, hit: {}, taps: 0, tapT: 0, wob: 0, top: 0,
    }));
    st.cam = [0, 0]; st.res = null;
    K.fx(st);
    mirror(st);
  }
  const lineOf = P => (P.gold ? SR.goldLine : SR.line);

  /* ---------- the tick ---------- */
  function tick(st, dt, live) {
    if (!st.pl) return;
    st.t += dt;
    for (const P of st.pl) snail(st, P, dt, live);
    for (const p of G.players) { p.pendingJump = false; p.pendingAct = false; }
    if (live && !st.res) {
      const fin = st.pl.filter(P => P.x >= st.c.len);
      if (fin.length) {
        st.res = true;
        const w = fin.length === 2 ? (Math.abs(st.pl[0].x - st.pl[1].x) < 1 ? -1 : st.pl[0].x > st.pl[1].x ? 0 : 1) : fin[0].id;
        if (w >= 0) st.stat.wins[w]++;
        Sfx.play('snailraceFinish');
        matchRoundEnd(w, w < 0 ? 'A photo finish: dead heat!' : NAMES[w] + '\'s snail crossed the line first!');
      }
    }
    for (const k of [0, 1]) st.cam[k] = clamp(st.pl[k].x - 300, 0, st.c.len + 200 - W);
    K.tickFx(st, dt);
    mirror(st);
  }
  function snail(st, P, dt, live) {
    const p = G.players[P.id], i = live ? p.input : NO_INPUT, act = live && p.pendingAct, c = st.c;
    if (P.wob > 0) P.wob -= dt;
    if (P.tapT > 0) P.tapT -= dt;
    // steering between the 3 paths
    if (live && P.hide <= 0) {
      if (((i.up && !P.upHeld) || p.pendingJump) && P.row > 0) { P.row--; Sfx.play('snailraceSteer', P.id); }
      if (i.down && !P.downHeld && P.row < 2) { P.row++; Sfx.play('snailraceSteer', P.id); }
    }
    P.upHeld = !!i.up; P.downHeld = !!i.down;
    P.ry = approach(P.ry, P.row, dt / SR.rowT);
    if (P.hide > 0) {
      P.hide -= dt; P.v = 0;
      if (act) { P.wob = 0.2; K.hintOnce(st, 'hid' + P.id + st.round, P.id, 'Wait for it to peek out!'); }
      if (P.hide <= 0) Sfx.play('snailracePeek', P.id);
      return;
    }
    if (P.munch > 0) { P.munch -= dt; P.v = Math.min(P.v, 12); }
    else if (act) { P.v = Math.min(SR.vMax, P.v + SR.tap); P.taps++; P.tapT = 0.12; Sfx.play('snailraceTap', P.id); }
    // drag and hills
    const sl = slope(c, P.x);
    P.v -= (P.v * SR.drag + SR.drag0) * dt;
    if (sl > 0) P.v -= SR.upK * sl * dt; else if (sl < 0 && P.x > SR.startX + 10) P.v += -sl * SR.downK * dt;
    P.v = clamp(P.v, 0, SR.vMax);
    if (!live) { P.v = 0; return; }
    // nerves
    const line = lineOf(P);
    if (P.v > line) P.nerve += dt * (1 + (P.v - line) / 30) / (P.gold ? SR.goldNerve : SR.nerveT);
    else P.nerve = Math.max(0, P.nerve - dt / SR.calm);
    if (P.nerve >= 1) hide(st, P, SR.hideT, 'EEK!');
    // move and meet things
    const nx = P.x + P.v * dt;
    for (const q of c.items) {
      if (P.hit[q.i]) continue;
      const row = q.kind === 'bug' ? bugRow(q, st.t) : q.row;
      if (Math.abs(P.ry - row) > 0.5) continue;
      const front = nx + SR.len / 2, back = nx - SR.len / 2;
      if (front < q.x || back > q.x + q.w) continue;
      if (q.kind === 'pebble' || q.kind === 'bug') {
        P.x = q.x - SR.len / 2 - 1; P.hit[q.i] = true; st.stat.bonks[P.id]++;
        hide(st, P, SR.bonkT, 'Bonk!'); Sfx.play('shrunkThud');
        return;
      }
      P.hit[q.i] = true;
      if (q.kind === 'puddle') { P.v = Math.min(SR.vMax, P.v + SR.splash); Sfx.play('snailraceSplash'); K.pop(st, P.x, P.id, 'Splash!', '#bfeaff', 18); }
      else if (q.kind === 'leaf') { P.munch = SR.munchT; Sfx.play('snailraceMunch'); K.pop(st, P.x, P.id, 'Yum!', '#9be07a', 18); st.stat.munch[P.id]++; }
    }
    P.x = nx;
    P.top = Math.max(P.top, P.v);
    st.stat.top[P.id] = Math.max(st.stat.top[P.id], P.v);
  }
  function hide(st, P, t, word) {
    P.hide = t; P.v = 0; P.nerve = 0; P.wob = 0.3;
    if (word === 'EEK!') { st.stat.hides[P.id]++; Sfx.play('snailraceEek'); }
    K.pop(st, P.x, P.id, word, word === 'EEK!' ? '#ffd84a' : '#ffffff', 22);
    rumble(P.id, 0.2, 0.4, 120);
  }
  // the y of a snail's foot line in screen px (its lane, its path)
  const laneY = P => SR.band[P.id][0] + SR.rowY[0] + P.ry * (SR.rowY[1] - SR.rowY[0]);
  function mirror(st) {
    for (const P of st.pl) K.place(P.id, clamp(P.x - st.cam[P.id], 40, W - 40), laneY(P) - 44);
  }

  /* ---------- what's ahead ----------
     plan(st, id): { v, line, nerve, hide, munch, slope, ahead (the next thing on each path within 400 px: [{ kind, d }]),
       safeRows (paths with no pebble or bug in the next `look` px), tapNow (a person would tap now to hold just under
       the line) } */
  function plan(st, id, look = 260) {
    const P = st.pl[id], c = st.c, line = lineOf(P);
    const ahead = [null, null, null];
    for (const q of c.items) {
      if (P.hit[q.i]) continue;
      const d = q.x - (P.x + SR.len / 2);
      if (d < -q.w - SR.len || d > 500) continue;
      if (q.kind === 'bug') { for (let r = 0; r < 3; r++) if (!ahead[r] || ahead[r].d > d) { const tt = Math.max(0, d) / Math.max(40, P.v); if (Math.abs(bugRow(q, st.t + tt) - r) < 0.75) ahead[r] = { kind: 'bug', d, q }; } continue; }
      if (!ahead[q.row] || ahead[q.row].d > d) ahead[q.row] = { kind: q.kind, d, q };
    }
    const bad = r => ahead[r] && (ahead[r].kind === 'pebble' || ahead[r].kind === 'bug' || ahead[r].kind === 'leaf') && ahead[r].d < look && ahead[r].d > -SR.len;
    const safeRows = [0, 1, 2].filter(r => !bad(r));
    const sl = slope(c, P.x + 60);
    return { v: P.v, line, nerve: P.nerve, hide: P.hide, munch: P.munch, slope: sl, ahead, safeRows, row: P.row, tapNow: P.v < line - (sl < 0 ? 26 : 12) && P.hide <= 0 && P.munch <= 0 };
  }

  MODES.snailrace = {
    plan, SR, ROUNDS,
    setup(st, L) {
      for (const row of L.grid) row.fill('.');
      st.stat = { wins: [0, 0], hides: [0, 0], bonks: [0, 0], munch: [0, 0], top: [0, 0], dist: [0, 0] };
      st.stats = { helps: 0 };
      st.forceRound = this.testRound != null ? this.testRound : null;
      st.noHelp = !!this.testNoHelp;
      st.t = 0;
      K.fx(st);
    },
    resetRound(n, info) { const st = G.mst; newRound(st, n, info); G.particles.length = 0; },
    go() {
      const st = G.mst;
      Sfx.play('snailraceGo');
      const g = st.pl.filter(P => P.gold);
      if (g.length) K.goldHelp(st, 'Gold shell for ' + NAMES[g[0].id] + ': a calmer snail (the line is higher)!');
      else if (st.round === 1) K.msg(st, 'Tap the action to go. Stay out of the red or your snail hides!', '#ffffff', 4);
      else K.msg(st, 'Round ' + st.round + ': ' + st.c.title, '#ffffff', 2.6);
    },
    step(dt) { tick(G.mst, dt, true); },
    idle(dt) { const st = G.mst; if (st.pl) tick(st, dt, false); },
    timeUp() {
      const st = G.mst, [A, B] = st.pl;
      const w = Math.abs(A.x - B.x) <= SR.finishPad ? -1 : A.x > B.x ? 0 : 1;
      if (w >= 0) st.stat.wins[w]++;
      st.res = true;
      return { winner: w, reason: w < 0 ? 'Time! Neck and neck!' : 'Time! ' + NAMES[w] + '\'s snail got further!' };
    },
    tiebreak() {
      const s = G.mst.stat;
      if (s.hides[0] !== s.hides[1]) return { winner: s.hides[0] < s.hides[1] ? 0 : 1, reason: 'The calmer snail wins the tiebreak!' };
      return -1;
    },
    draw() { const st = G.mst; if (!st.pl) return; drawWorld(st); K.hide(st); },
    drawTop() { const st = G.mst; K.unhide(st); if (st.pl) drawTop(st); },
    hud() { const st = G.mst; if (st.pl && G.match) hud(st); },
    stats() {
      const st = G.mst, s = st.stat;
      if (!s) return [];
      const out = [
        { label: 'Rounds won', values: (G.match ? G.match.wins : s.wins).slice() },
        { label: 'Shell scares', values: s.hides.slice() },
        { label: 'Bonks', values: s.bonks.slice() },
        { label: 'Top speed', values: s.top.map(v => Math.round(v) + '') },
      ];
      const h = s.hides;
      out.push(h[0] === h[1] ? '★ Lettuce leaves munched: ' + (s.munch[0] + s.munch[1]) + '. Snails love lettuce!' : '★ Calmest snail: ' + NAMES[h[0] < h[1] ? 0 : 1] + ' (only ' + Math.min(h[0], h[1]) + ' shell scares)');
      const hl = K.helpLine(st.stats ? st.stats.helps : 0);
      if (hl) out.push(hl);
      return out;
    },
    test: { compile, slope, bugRow },
  };

  /* ---------- drawing ---------- */
  function drawWorld(st) {
    const t = st.t;
    ctx.fillStyle = '#2a3a28'; ctx.fillRect(0, 0, W, H);
    for (const k of [0, 1]) drawLane(st, k, t);
  }
  function drawLane(st, k, t) {
    const [y0, y1] = SR.band[k], cx = st.cam[k], c = st.c, P = st.pl[k];
    ctx.save();
    ctx.beginPath(); rr(6, y0, W - 12, y1 - y0, 14); ctx.clip();
    // sky and far garden
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, '#8ccff2'); g.addColorStop(1, '#dff3d8');
    ctx.fillStyle = g; ctx.fillRect(0, y0, W, y1 - y0);
    ctx.save(); ctx.translate(0, y0 - 250);
    K.farGrass(cx, { y: 330, par: 0.25, n: 20 });
    ctx.restore();
    // flowers and stems at the back
    for (let i = Math.floor(cx * 0.6 / 160) - 1; i <= Math.ceil((cx * 0.6 + W) / 160) + 1; i++) {
      const x = i * 160 - cx * 0.6 + K.hash(i) * 60;
      if (K.hash(i + 3) < 0.5) K.daisy(x, y0 + SR.rowY[0] - 4, 70 + K.hash(i + 4) * 40, t, { col: K.hash(i + 5) < 0.5 ? '#ffffff' : '#ffb0d0' });
      else K.blade(x, y0 + SR.rowY[0] - 2, 90 + K.hash(i + 6) * 50, (K.hash(i + 7) - 0.5) * 40, { w: 14, col: 'rgba(80,160,70,0.8)', dark: false });
    }
    ctx.save(); ctx.translate(-Math.round(cx), y0);
    // the 3 paths: a wide strip of packed earth with lines between
    const top = SR.rowY[0] - 14, bot = SR.rowY[2] + 16;
    ctx.fillStyle = '#9a7650'; ctx.fillRect(cx - 10, top, W + 20, bot - top);
    ctx.fillStyle = '#6b4a32'; ctx.fillRect(cx - 10, bot, W + 20, (y1 - y0) - bot);
    // packed earth: speckles and tiny stones, a slime trail shine, a grass fringe along both edges
    for (let i = Math.floor((cx - 20) / 46); i <= Math.ceil((cx + W + 20) / 46); i++) {
      const sx = i * 46 + K.hash(i + 61) * 40, sy = top + 6 + K.hash(i + 62) * (bot - top - 12);
      ctx.fillStyle = K.hash(i + 63) < 0.5 ? 'rgba(70,46,26,0.35)' : 'rgba(255,236,200,0.18)';
      ctx.beginPath(); ctx.ellipse(sx, sy, 2 + K.hash(i + 64) * 4, 1.5 + K.hash(i + 65) * 2, 0, 0, TAU); ctx.fill();
      if (K.hash(i + 66) < 0.12) { ctx.fillStyle = '#b4aa9a'; ctx.beginPath(); ctx.ellipse(sx + 10, sy, 5, 3.5, 0, 0, TAU); ctx.fill(); }
    }
    ctx.fillStyle = '#5aa848';
    for (let x = Math.floor((cx - 20) / 9) * 9; x < cx + W + 20; x += 9) {
      const h1 = 6 + K.hash(x * 0.37) * 8, h2 = 5 + K.hash(x * 0.53) * 7;
      ctx.beginPath(); ctx.moveTo(x, top + 2); ctx.lineTo(x + 3, top - h1); ctx.lineTo(x + 6, top + 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x, bot + 2); ctx.lineTo(x + 3, bot - h2); ctx.lineTo(x + 6, bot + 2); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255,240,210,0.25)'; ctx.lineWidth = 2; ctx.setLineDash([14, 12]);
    for (const r of [0.5, 1.5]) { const yy = SR.rowY[0] + r * (SR.rowY[1] - SR.rowY[0]); ctx.beginPath(); ctx.moveTo(cx - 10, yy); ctx.lineTo(cx + W + 10, yy); ctx.stroke(); }
    ctx.setLineDash([]);
    // hills: a shaded tint and arrows
    for (const [a, b, s] of c.hills) {
      if (b < cx - 20 || a > cx + W + 20) continue;
      ctx.fillStyle = s > 0 ? 'rgba(80,60,30,0.25)' : 'rgba(255,255,220,0.18)'; ctx.fillRect(a, top, b - a, bot - top);
      for (let x = a + 40; x < b; x += 120) text(s > 0 ? '⬈' : '⬊', x, top - 10, 18, s > 0 ? '#5a3a20' : '#fff6c0', 'center');
      text(s > 0 ? 'UPHILL' : 'DOWNHILL: ease off!', a + 8, top - 30, 12, s > 0 ? '#3a2410' : '#5a4010', 'left', 'body');
    }
    // start and finish lines
    for (const [x, col] of [[SR.startX + 30, '#ffffff'], [c.len, '#ffffff']]) {
      if (x < cx - 20 || x > cx + W + 20) continue;
      for (let j = 0; j < 8; j++) { ctx.fillStyle = (j % 2) ? '#1c1a36' : col; ctx.fillRect(x - 6, top + j * (bot - top) / 8, 12, (bot - top) / 8); }
    }
    if (c.len > cx - 40 && c.len < cx + W + 40) { K.daisy(c.len - 30, top, 60, t, { col: '#ffd84a' }); text('FINISH', c.len, top - 54, 16, '#1c1a36', 'center'); }
    // the course (far path first so nearer things overlap)
    for (let r = 0; r < 3; r++) {
      for (const q of c.items) {
        if (q.kind === 'bug' || q.row !== r || q.x > cx + W + 60 || q.x + q.w < cx - 60) continue;
        const yy = SR.rowY[r];
        if (q.kind === 'pebble') K.pebble(q.x + q.w / 2, yy + 3, q.w, 30, { seed: q.x });
        else if (q.kind === 'puddle') { ctx.fillStyle = 'rgba(140,210,255,0.85)'; ctx.beginPath(); ctx.ellipse(q.x + q.w / 2, yy - 2, q.w / 2, 7, 0, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(q.x + q.w / 2 - 14, yy - 5, 16, 2); }
        else if (q.kind === 'leaf') { if (!P.hit[q.i]) { K.leaf(q.x + q.w / 2, yy - 4, q.w + 10, -0.1, { col: '#8fd04a', curl: 0.5 }); } else K.leaf(q.x + q.w / 2, yy - 2, q.w * 0.5, 0, { col: '#8fd04a' }); }
      }
      // the snail on this path draws between the rows
      if (Math.round(P.ry) === r) drawSnail(st, P, t);
    }
    for (const q of c.items) {
      if (q.kind !== 'bug' || q.x > cx + W + 60 || q.x < cx - 60) continue;
      const ry = bugRow(q, st.t), yy = SR.rowY[0] + ry * (SR.rowY[1] - SR.rowY[0]);
      ladybug(q.x + q.w / 2, yy, st.t, Math.cos(st.t * 1.4 + q.ph) > 0 ? 1 : -1);
    }
    ctx.restore();
    ctx.restore();
    // the lane's frame
    ctx.strokeStyle = PCOL[k]; ctx.lineWidth = 3; rr(6, y0, W - 12, y1 - y0, 14); ctx.stroke();
  }
  function ladybug(x, y, t, f) {
    ctx.save(); ctx.translate(x, y);
    ctx.strokeStyle = '#1c1a1a'; ctx.lineWidth = 2;
    for (let k = 0; k < 3; k++) { const sw = Math.sin(t * 16 + k) * 3; ctx.beginPath(); ctx.moveTo(-8 + k * 8, -4); ctx.lineTo(-10 + k * 8 + sw, 2); ctx.stroke(); }
    ctx.fillStyle = '#d8231e'; ctx.beginPath(); ctx.ellipse(0, -12, 18, 13, 0, Math.PI, 0); ctx.lineTo(18, -4); ctx.lineTo(-18, -4); ctx.fill();
    ctx.fillStyle = '#1c1a1a'; ctx.beginPath(); ctx.ellipse(f * 18, -9, 7, 6, 0, 0, TAU); ctx.fill();
    ctx.fillRect(-0.8, -25, 1.6, 21);
    for (const [dx, dy] of [[-9, -15], [8, -16], [-5, -8], [10, -8]]) { circle(dx, dy, 2.8); ctx.fill(); }
    ctx.fillStyle = '#ffffff'; circle(f * 21, -11, 1.8); ctx.fill();
    ctx.restore();
  }
  function drawSnail(st, P, t) {
    const yy = SR.rowY[0] + P.ry * (SR.rowY[1] - SR.rowY[0]), x = P.x, id = P.id, hid = P.hide > 0;
    const wob = P.wob > 0 ? Math.sin(t * 50) * 3 : 0, crawl = Math.sin(t * (4 + P.v * 0.08)) * (hid ? 0 : 2.5);
    ctx.save(); ctx.translate(x + wob, yy);
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(0, 1, 34, 5, 0, 0, TAU); ctx.fill();
    // a slime trail
    if (P.v > 20) { ctx.fillStyle = 'rgba(220,255,240,0.35)'; ctx.fillRect(-90, -2, 60, 3); }
    // body
    if (!hid) {
      ctx.fillStyle = P.gold ? '#f2e6a0' : '#d8d49a'; ctx.strokeStyle = '#8a8250'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-30, 0); ctx.quadraticCurveTo(-10, -6 + crawl, 22, -4); ctx.quadraticCurveTo(36, -6, 38, -22); ctx.quadraticCurveTo(40, -30, 30, -28); ctx.lineTo(24, -12); ctx.lineTo(-28, -8); ctx.closePath(); ctx.fill(); ctx.stroke();
      // eye stalks (they droop when nervous)
      const nv = P.nerve, d = nv * 10;
      ctx.strokeStyle = '#8a8250'; ctx.lineWidth = 3;
      for (const k of [0, 1]) { const ex = 34 + k * 6, ey = -44 + d + Math.sin(t * 5 + k) * 2; ctx.beginPath(); ctx.moveTo(32 + k * 2, -24); ctx.lineTo(ex, ey); ctx.stroke(); ctx.fillStyle = '#f2eec0'; circle(ex, ey, 4); ctx.fill(); ctx.fillStyle = '#1c1a1a'; circle(ex + 1, ey, 2); ctx.fill(); }
      if (nv > 0.35) { ctx.fillStyle = '#9fe8ff'; ctx.beginPath(); ctx.ellipse(28, -18, 2.5, 4, 0, 0, TAU); ctx.fill(); }
    } else {
      // only a lip of foot shows
      ctx.fillStyle = '#c8c48a'; ctx.beginPath(); ctx.ellipse(0, -2, 22, 4, 0, 0, TAU); ctx.fill();
    }
    // the shell, in the rider's colour
    const sy = hid ? -20 : -26 + crawl * 0.3, rot = hid ? Math.sin(t * 9) * 0.06 : 0;
    ctx.save(); ctx.translate(-6, sy); ctx.rotate(rot);
    ctx.fillStyle = P.gold ? C.gold : PCOL[id]; ctx.strokeStyle = PDARK[id]; ctx.lineWidth = 3;
    circle(0, 0, 22); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 3; ctx.beginPath();
    for (let a = 0; a < TAU * 2.2; a += 0.2) { const r = 18 - a * 2.4; if (r < 1) break; ctx.lineTo(Math.cos(a + 1) * r, Math.sin(a + 1) * r); }
    ctx.stroke();
    ctx.restore();
    // the rider
    const ry = sy - 18, tilt = hid ? -0.5 + Math.sin(t * 6) * 0.1 : -0.08 - Math.min(0.25, P.v / 600);
    K.hero(id, -6, ry, { face: 1, rot: tilt, s: 0.85, stun: hid });
    // reins: the rider holds the eye stalks
    if (!hid) { ctx.strokeStyle = PDARK[id]; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(2, ry - 12); ctx.quadraticCurveTo(20, ry - 4, 34, -40 + P.nerve * 10); ctx.stroke(); }
    ctx.restore();
  }
  function drawTop(st) {
    for (const k of [0, 1]) {
      const P = st.pl[k], y0 = SR.band[k][0];
      // pops in this lane
      for (const q of st.pops) {
        if (q.y !== k) continue;
        const x = clamp(q.x - st.cam[k], 80, W - 80), y = y0 + 60 - q.t * 30;
        ctx.globalAlpha = clamp((1.3 - q.t) / 0.3, 0, 1);
        bigText(q.s, x, y, q.size * (hudBig() ? 1.3 : 1), q.col, 1 + 0.25 * Math.max(0, 1 - q.t / 0.15));
        ctx.globalAlpha = 1;
      }
      void P;
    }
  }

  /* ---------- HUD ---------- */
  function hud(st) {
    const big = hudBig(), z = big ? 1.3 : 1, live = G.match && G.match.phase === 'live';
    K.drawMsg(st, st.msg, W - 14);
    // the progress strip between the lanes
    const sx = 120, sw = W - 240, sy = (SR.band[0][1] + SR.band[1][0]) / 2;
    ctx.fillStyle = 'rgba(28,26,54,0.85)'; rr(sx - 10, sy - 7, sw + 20, 14, 7); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.fillRect(sx + sw - 2, sy - 7, 4, 14);
    for (const P of st.pl) { const u = clamp((P.x - SR.startX) / (st.c.len - SR.startX), 0, 1); ctx.fillStyle = P.gold ? C.gold : PCOL[P.id]; circle(sx + u * sw, sy + (P.id ? 2 : -2), 6); ctx.fill(); }
    // each lane: speed meter with the line, and the nerve ring
    for (const P of st.pl) {
      const y0 = SR.band[P.id][0], mx = 22, my = y0 + 52, mw = 150 * z, mh = 14 * z, line = lineOf(P), pl = plan(st, P.id);
      ctx.fillStyle = 'rgba(28,26,54,0.82)'; rr(mx - 8, my - 30 * z, mw + 70 * z, 50 * z, 12); ctx.fill();
      text(NAMES[P.id] + (K.quiet(P.id) ? ' (computer)' : ''), mx, my - 18 * z, 13 * z, PCOL[P.id], 'left', 'body');
      // green to the line, red after
      const lf = line / SR.vMax;
      ctx.fillStyle = 'rgba(143,227,176,0.35)'; rr(mx, my, mw * lf, mh, mh / 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,90,74,0.35)'; ctx.fillRect(mx + mw * lf, my, mw * (1 - lf), mh);
      const vf = clamp(P.v / SR.vMax, 0, 1);
      ctx.fillStyle = P.v > line ? '#ff5a4a' : '#8fe3b0'; rr(mx, my, Math.max(mh, mw * vf), mh, mh / 2); ctx.fill();
      ctx.fillStyle = P.gold ? C.gold : '#ffffff'; ctx.fillRect(mx + mw * lf - 1.5, my - 4, 3, mh + 8);
      // nerve ring
      const rx = mx + mw + 30 * z, rcy = my + mh / 2 - 6 * z, rad = 14 * z;
      ctx.fillStyle = 'rgba(255,255,255,0.15)'; circle(rx, rcy, rad); ctx.fill();
      if (P.hide > 0) text('🐌', rx, rcy + 1, 16 * z, '#ffffff', 'center', 'body');
      else if (P.nerve > 0) { ctx.fillStyle = P.nerve > 0.6 ? '#ff5a4a' : '#ffd84a'; ctx.beginPath(); ctx.moveTo(rx, rcy); ctx.arc(rx, rcy, rad, -Math.PI / 2, -Math.PI / 2 + TAU * P.nerve); ctx.closePath(); ctx.fill(); }
      // a prompt
      if (live && !K.quiet(P.id) && (st.round <= 2 || P.gold)) {
        let s = null, col = '#ffe7a8';
        if (P.hide > 0) s = 'Hiding... wait';
        else if (P.nerve > 0.3) { s = 'Too fast! Ease off'; col = '#ffb0a0'; }
        else if (pl.safeRows.length < 3 && !pl.safeRows.includes(P.row)) { const r = pl.safeRows.length ? pl.safeRows.reduce((a, b) => (Math.abs(b - P.row) < Math.abs(a - P.row) ? b : a)) : P.row; s = 'Steer ' + K.key(P.id, r < P.row ? 'up' : 'down'); col = C.gold; }
        else if (pl.tapNow) s = 'Tap ' + K.key(P.id, 'act') + ' in rhythm';
        if (s) { ctx.font = FONT(13 * z); const w = ctx.measureText(s).width + 20; pill(W - 20 - w, y0 + 12, w, 24 * z, 'left'); text(s, W - 20 - w / 2, y0 + 12 + 12 * z, 13 * z, col, 'center', 'body'); }
      }
    }
  }

  /* ---------- sounds ---------- */
  Sfx.extra.snailraceTap = function (id) { this.tone(id ? 300 : 340, 0.04, 'triangle', 0.02, id ? 360 : 400); };
  Sfx.extra.snailraceSteer = function (id) { this.tone(id ? 500 : 560, 0.05, 'sine', 0.02, id ? 600 : 660); };
  Sfx.extra.snailraceEek = function () { this.tone(1400, 0.12, 'square', 0.03, 2000); this.tone(600, 0.3, 'triangle', 0.04, 200, 0.1); };
  Sfx.extra.snailracePeek = function (id) { this.tone(id ? 500 : 560, 0.1, 'sine', 0.03, id ? 800 : 880); };
  Sfx.extra.snailraceSplash = function () { this.tone(900, 0.16, 'sine', 0.03, 300); this.tone(1400, 0.06, 'triangle', 0.015, 600, 0.03); };
  Sfx.extra.snailraceMunch = function () { [0, 0.1, 0.2].forEach(d => this.tone(220, 0.05, 'square', 0.02, 180, d)); };
  Sfx.extra.snailraceGo = function () { this.tone(523, 0.1, 'triangle', 0.04); this.tone(784, 0.16, 'triangle', 0.04, null, 0.08); };
  Sfx.extra.snailraceFinish = function () { [659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.05, null, i * 0.08)); };

  /* ---------- the level ---------- */
  SHRUNK.defs.snailrace = {
    name: 'Snail Race', world: 30, kind: 'versus', mode: 'snailrace', ownStep: true,
    match: { bestOf: 5, roundTime: SR.roundTime },
    act: { label: 'go' },   // (one tap, not mashing: the card says so)
    tagLift: 30,
    legend: {
      pip: '<kbd>W</kbd><kbd>S</kbd> steer',
      bo: '<kbd>↑</kbd><kbd>↓</kbd> steer',
      pad: 'stick steers,',
    },
    tip: 'Tap the action to speed your snail up, but stay out of the red or it hides in its shell! ▲ ▼ steer round pebbles.',
    switches: {}, signs: [],
    map: K.stubMap(),
  };
})();
