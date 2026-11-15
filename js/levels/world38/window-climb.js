/* Pip & Bo - Level 38-1 Skyscraper Window Climb (team, World 38 Operation Midnight). */
'use strict';

/* ===== 38-1 Skyscraper Window Climb (mode 'spyclimb', team, scrolls up, Gavyn's pick) =====
   Act one: break in. Forty floors of Zero Tower's glass at midnight, two agents on suction cups, one rope between them.
   Front view of the glass face, scrolling up, player-paced: the camera follows the LOWER agent, so nobody is dragged.
   The wall is 22 panes wide (W_.c0 .. W_.c1); world y counts up from the bottom of the stretch (screen y = GY - (y - camY)).
   The mode owns the tick, the picture and the HUD (ownStep + ownHUD + noFalls). Both agents do the same job.
   CLIMB: ◀ ▶ ▲ ▼ on glass (S.climb px/s, a cup squeak each step). Moves are checked one axis at a time, so a diagonal
     never cuts a corner. ACTION HELD = CLAMP: flat and still; a clamped agent can't be seen by a light, can't be blown
     off, and is the rope's anchor. The rope is S.rope px: at full stretch the leader can't go on ("Rope!").
   THE ROPE SWING (the two-person beat): concrete bands, wet panes, vent louvres and the neon letters don't hold a cup.
     Moving onto one with the partner CLAMPED lets go into a hang: a pendulum under the partner. Hold ◀ ▶ to swing (the
     push is strong enough that holding the way you want to go reaches the far side in one swing), ▲ / ▼ climb or let
     out rope. You stick by yourself on good glass the way you were going (anywhere after S.stickAny s). Without a
     clamped partner the cups just squeak at the edge and "Clamp!" shows over the partner. If the anchor lets go while
     the partner hangs, both SLIDE down to the ledge below. Every swing gap is two panes wide with its marks: s1 (the
     anchor spot on the near edge), sw (the swinger's start, S.swingL below s1) and s2 (the anchor spot on the far edge).
   TROUBLE: searchlights (a MOVING agent inside a beam fills the shared Spotted meter; a still or clamped one is
     invisible; a hanging one counts as moving), windows that open (yellow glow S.winTell s first; an agent on the pane
     when it opens SLIPS: they dangle from the rope if the partner is clamped, else both SLIDE; then the Zero looks round
     and anything moving within two panes fills Spotted), wind gusts (flags snap and a whoosh 1 s first; unclamped agents
     are blown two panes sideways; onto bad surface or off the edge is a Slip), the window cleaners' cradle (stretch 2:
     a free lift when both are on it; its robot leaves the panes beside it wet for 4 s), pigeons (moving for more than
     S.pigeonT s right beside them startles them: a little Spotted; creep in short steps), and the helicopter (stretches
     3 and 4: a thud first, then a wide beam follows the higher agent; anyone not clamped in it fills Spotted fast).
   SPOTTED full: shutters rattle down, a Zero leans out with a net and both slide back to the last checkpoint ledge.
   END JOB of each stretch: at the hook, the stretch's hooker (alternating) holds the action S.hookT s while the partner
     is clamped too; at the top of stretch 4 Bo cuts a glass circle the same way (S.cutT s) and both climb in.
   INTEL: 20 envelopes (5 a stretch), one in every swing gap, on the swing's path.
   GOLD HELP (3 Slips / Slides / Spotteds in a stretch, while both are playing): gold suction cups: lights fill Spotted
     40% slower and window and gust tells show 0.5 s earlier for the rest of the stretch.
   CHECKPOINT halfway through each stretch (after its first swing or band). MEDAL by time: Gold <= S.goldT s, Silver <= S.silverT s.
   OUTFITS (Gavyn's rule, the shared system, 'spyclimb' in spy-kit.js): night climbers: Pip a charcoal harness with
     brass buckles, a rolled-up knit cap and a yellow chalk bag; Bo a harness with silver buckles, a headlamp band and
     teal knee pads; both big white suction cups (flat when clamped). After a Slip the cap or band sits crooked.
   MODES.spyclimb.plan(st) is what each agent should do now: the prompts, the HUD and the computer brain read it.
   Story: Control's line on the radio at the start; ends with both stepping through the cut circle into floor 40. */
(() => {
  const K = SPY, TAU = Math.PI * 2;
  const S = {
    climb: 110, rope: 170, keep: 120, grav: 900, pump: 900, damp: 0.1, reel: 90, minL: 40, stickT: 0.25, stickAny: 2.6, swingL: 110,
    spotLight: 55, spotZero: 45, spotHeli: 62, spotPigeon: 16, drain: 7, goldSlow: 0.6, winTell: 1.2, gustTell: 1.0, goldTell: 0.5,
    winOpen: 2.2, winLook: 2.0, gustT: 0.36, gustV: 220, pigeonT: 0.35, pigeonR: 56, heliWarn: 2.4, heliT: 4.6, heliR: 86, heliV: 64,
    hookT: 1.5, cutT: 2.0, hookR: 26, slideT: 1.5, spottedT: 2.4, idleWait: 12, goldT: 205, silverT: 340, intel: 20,
  };
  const W_ = { pw: 36, ph: 44, cols: 22, x0: 84, rows: 36 };
  W_.x1 = W_.x0 + W_.cols * W_.pw;
  const GY = 470;
  const cx = c => W_.x0 + (c + 0.5) * W_.pw, cy = r => (r + 0.5) * W_.ph;
  const BAD = '#wln';

  /* ---------- the four stretches: a grid (built from fills), the route, hazards ---------- */
  function build(k) {
    const g = [];
    for (let r = 0; r < W_.rows; r++) g.push(Array(W_.cols).fill('.'));
    const fill = (c0, c1, r0, r1, ch) => { for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) g[r][c] = ch; };
    const L = { grid: g, wins: [], pigeons: [], lights: [], gusts: null, heli: null, cradle: null, route: [], intel: [], letters: [] };
    const go = (c, r) => { const y = cy(r); L.route.push({ t: 'go', x: cx(c), y, ok: x => { const cc = Math.floor((x - W_.x0) / W_.pw), rr_ = Math.floor(y / W_.ph); return cc >= 0 && cc < W_.cols && !BAD.includes(g[rr_][cc]); } }); };
    const swing = (near, far, row) => {
      const dir = far > near ? 1 : -1, s1 = { x: cx(near), y: cy(row) }, s2 = { x: cx(far), y: cy(row) };
      const edge = W_.x0 + (dir > 0 ? far : far + 1) * W_.pw; // the far block's edge
      L.route.push({ t: 'swing', dir, s1, s2, sw: { x: s1.x, y: s1.y - S.swingL }, edge, n: L.route.length });
      L.intel.push({ x: s1.x + dir * W_.pw * 1.5, y: s1.y - 94, swing: true });
    };
    const env = (c, r) => { L.intel.push({ x: cx(c), y: cy(r) }); const lg = L.route[L.route.length - 1]; if (lg && lg.t === 'go' && lg.x === cx(c) && lg.y === cy(r)) lg.env = true; };
    const win = (c, r, per, off, prop) => { L.wins.push({ c, r, per, off, prop }); };
    if (k === 0) {
      // Lower Floors: learn climbing and clamping, one searchlight, the first small swing gap
      fill(0, 12, 11, 12, '#'); fill(9, 10, 13, 30, 'l'); fill(11, 21, 27, 28, '#');
      go(9, 1.5); go(4, 5); env(4, 5); go(16, 8); env(16, 8); go(16, 16); L.cp = { leg: L.route.length, at: [[15, 13.6], [17, 13.6]] };
      swing(11, 8, 24); go(5, 29); env(5, 29); go(8, 31); go(14, 32); go(19, 33); env(19, 33);
      L.hook = { x: cx(16), y: cy(34), who: 0 };
      L.lights.push({ x0: cx(10), ax: 300, w: 0.42, ph: 0, y0: cy(6), ay: 90, w2: 0.3, rx: 74, ry: 60 });
      L.start = [[8, 0.6], [10, 0.6]];
    } else if (k === 1) {
      // The Office Floors: windows that open, pigeons, the cleaners' cradle, two lights
      fill(10, 21, 9, 10, '#'); fill(11, 12, 11, 30, 'w'); fill(0, 10, 26, 27, '#');
      go(9, 1.5); go(4, 5); env(4, 5); go(3, 10); go(6, 14); env(6, 14); L.cp = { leg: L.route.length, at: [[5, 13.6], [7, 13.6]] };
      go(8, 17); swing(10, 13, 23); go(16, 29); env(16, 29); go(20, 32); env(20, 32);
      L.hook = { x: cx(15), y: cy(33), who: 1 };
      win(5, 4, 8, 1.5, 'rug'); win(3, 11, 9, 4, 'plant'); win(7, 16, 7.5, 2, 'moon'); win(15, 31, 8.5, 3, 'rug'); win(19, 30, 9.5, 6, 'plant');
      L.pigeons.push({ x: cx(2), y: cy(8) }, { x: cx(14), y: cy(27) });
      L.cradle = { c0: 18, c1: 19, lo: cy(12), hi: cy(26) };
      L.lights.push({ x0: cx(6), ax: 210, w: 0.46, ph: 1, y0: cy(5), ay: 70, w2: 0.33, rx: 70, ry: 56 });
      L.lights.push({ x0: cx(5), ax: 170, w: 0.38, ph: 2.5, y0: cy(18), ay: 110, w2: 0.27, rx: 70, ry: 56 });
      L.start = [[8, 0.6], [10, 0.6]];
    } else if (k === 2) {
      // The Neon Sign: swing between the giant letters of ZERO, wind, the helicopter once
      fill(0, 11, 8, 9, '#'); fill(12, 13, 10, 20, 'n'); fill(14, 21, 19, 20, '#'); fill(12, 13, 21, 31, 'n'); fill(0, 11, 30, 31, '#');
      L.letters.push({ c: 12, r0: 10, r1: 20, s: 'ZE' }, { c: 12, r0: 21, r1: 31, s: 'RO' });
      go(9, 1.5); go(4, 4); env(4, 4); go(16, 6); env(16, 6); go(16, 12); swing(14, 11, 16);
      L.cp = { leg: L.route.length, at: [[9, 17.6], [11, 17.6]] };
      go(5, 20); go(8, 24); swing(11, 14, 27); go(17, 31); go(10, 33); env(10, 33);
      L.hook = { x: cx(5), y: cy(34), who: 0 };
      L.gusts = { first: 7, every: 10.5 };
      L.heli = { row: 22 };
      L.lights.push({ x0: cx(10), ax: 280, w: 0.44, ph: 0.5, y0: cy(4), ay: 60, w2: 0.31, rx: 74, ry: 58 });
      L.start = [[8, 0.6], [10, 0.6]];
    } else {
      // The Penthouse: everything, cloud wisps below, long swings, and the vault-floor window at the top
      fill(9, 21, 7, 8, '#'); fill(9, 10, 9, 19, 'l'); fill(0, 8, 18, 19, '#'); fill(11, 12, 20, 32, 'w'); fill(13, 21, 30, 31, '#');
      go(6, 1.5); go(3, 6); env(3, 6); go(6, 11); swing(8, 11, 14);
      L.cp = { leg: L.route.length, at: [[12, 14.6], [14, 14.6]] };
      go(19, 18); env(19, 18); go(15, 22); swing(13, 10, 26); go(3, 30); env(3, 30);
      L.hook = { x: cx(6), y: cy(33), who: 1, cut: true };
      win(4, 3, 8, 2, 'rug'); win(2, 10, 9, 5, 'plant'); win(16, 15, 8.5, 1, 'moon'); win(6, 27, 7.5, 3, 'rug'); win(3, 31, 9, 6, 'plant');
      L.pigeons.push({ x: cx(18), y: cy(21) });
      L.gusts = { first: 9, every: 12 };
      L.heli = { row: 24 };
      L.lights.push({ x0: cx(4), ax: 140, w: 0.5, ph: 0, y0: cy(9), ay: 80, w2: 0.35, rx: 70, ry: 56 });
      L.lights.push({ x0: cx(16), ax: 190, w: 0.41, ph: 2, y0: cy(25), ay: 70, w2: 0.29, rx: 70, ry: 56 });
      L.start = [[5, 0.6], [7, 0.6]];
    }
    for (const w of L.wins) g[w.r][w.c] = 'x';
    L.route.push({ t: 'hook', x: L.hook.x, y: L.hook.y });
    L.top = W_.rows * W_.ph;
    return L;
  }

  /* ---------- the wall ---------- */
  const cellOf = (x, y) => ({ c: Math.floor((x - W_.x0) / W_.pw), r: Math.floor(y / W_.ph) });
  function surf(st, x, y) {
    const { c, r } = cellOf(x, y), L = st.L;
    if (c < 0 || c >= W_.cols || r < 0 || r >= W_.rows) return '#';
    const ch = L.grid[r][c];
    if (ch === 'x') { const w = st.winAt[r * 100 + c]; if (w && (w.ph === 'open' || w.ph === 'look')) return 'o'; }
    if (st.wet[r * 100 + c] > st.T) return 'w';
    return ch;
  }
  const good = (st, x, y) => !BAD.includes(surf(st, x, y)) && surf(st, x, y) !== 'o';

  /* ---------- a stretch ---------- */
  function room(st, def, k) {
    st.k = k; st.title = def.title || '';
    st.L = build(k);
    st.goldUsed = false; st.gold = false; st.rc = { bad: 0 };
    st.cp = null; st.segStart = G.time; st.intelAt0 = st.intelGot.slice();
    st.state = 'go'; st.T = 0; st.endT = 0;
    st.got = st.L.intel.map(() => false);
    place(st, st.L.start, 0);
    K.fx(st);
    if (k === 0) st.radioDue = 0.4;
  }
  function place(st, at, leg) {
    const L = st.L;
    st.ag = [0, 1].map(id => ({ id, x: cx(at[id][0]), y: cy(at[id][1]), st: 'climb', clamp: false, moved: false, moveT: 0, face: id ? -1 : 1,
      th: 0, om: 0, Lr: 0, hangT: 0, hdir: 0, entry: 0, crooked: 0, squeak: 0, leg, rope: 0, slideFrom: null, inT: 0 }));
    st.camY = Math.max(0, Math.min(st.ag[0].y, st.ag[1].y) - 150);
    st.spot = 0; st.roles = {}; st.hook = 0; st.heli = null; st.heliDone = st.heliDone && st.cp ? st.heliDone : false;
    st.gust = null; st.gustNext = L.gusts ? L.gusts.first : 1e9; st.wet = {}; st.zeroLook = [];
    st.winAt = {}; for (const w of L.wins) st.winAt[w.r * 100 + w.c] = { ...w, ph: 'shut', t: 0, slipDone: false };
    st.pig = L.pigeons.map(p => ({ ...p, gone: false, t: 0 }));
    st.crad = L.cradle ? { y: L.cradle.lo, dir: 1, robot: 0 } : null;
    st.prevAct = [false, false]; st.lit = [false, false];
  }
  function restart(st, why) {
    const L = st.L, cp = st.cp;
    place(st, cp ? cp.at : L.start, cp ? cp.leg : 0);
    st.state = 'go';
    K.msg(st, why, '#ffffff', 2.4);
  }

  /* ---------- the tick ---------- */
  function tick(st, dt) {
    if (!st.L) return;
    K.track(st);
    st.waiting = st.state === 'go' && K.idle(st, dt, S.idleWait);
    const live = G.introT <= 0 && !st.waiting && st.state === 'go';
    st.clock += dt;
    if (live) {
      st.T += dt;
      if (st.radioDue != null && (st.radioDue -= dt) <= 0) { st.radioDue = null; K.control(st, K.STORY.spyclimb); }
      hazards(st, dt);
      for (const a of st.ag) agent(st, a, dt);
      spotted(st, dt);
      pickups(st);
      progress(st);
      hookStep(st, dt);
    } else if (st.state === 'slide') slideStep(st, dt);
    else if (st.state === 'spotted') { st.endT += dt; if (st.endT > S.spottedT) restart(st, 'Back to the ledge. Clamp when a light comes!'); }
    else if (st.state === 'end') endStep(st, dt);
    K.tickControl(st, dt);
    for (const p of G.players) { p.pendingJump = false; p.pendingAct = false; }
    for (const a of st.ag) if (a.crooked > 0) a.crooked -= dt;
    camera(st, dt);
    K.tickFx(st, dt);
    mirror(st);
  }
  function wants(id) {
    const i = G.players[id].input;
    return { x: (i.right ? 1 : 0) - (i.left ? 1 : 0), y: ((i.jump || i.up) ? 1 : 0) - (i.down ? 1 : 0), act: !!i.act };
  }
  const partnerOf = (st, a) => st.ag[1 - a.id];
  const anchored = (st, a) => { const o = partnerOf(st, a); return o.st === 'climb' && o.clamp; };

  function agent(st, a, dt) {
    const w = wants(a.id), o = partnerOf(st, a);
    a.moved = false;
    if (a.st === 'climb') {
      a.clamp = w.act; a.clampT = a.clamp ? (a.clampT || 0) + dt : 0;
      if (a.clamp) { if (!st.prevAct[a.id]) Sfx.play('spyclimbClampThunk'); a.moveT = 0; st.prevAct[a.id] = true; return; }
      st.prevAct[a.id] = false;
      if (!w.x && !w.y) { a.moveT = 0; return; }
      let dx = w.x, dy = w.y; const n = Math.hypot(dx, dy); dx /= n; dy /= n;
      const sp = S.climb * (onCradle(st, a) && st.crad.moving ? 0.6 : 1), mx = dx * sp * dt, my = dy * sp * dt;
      if (w.x) a.face = w.x;
      const tryMove = (nx, ny, ax) => {
        if (Math.hypot(nx - o.x, ny - o.y) > S.rope && Math.hypot(nx - o.x, ny - o.y) > Math.hypot(a.x - o.x, a.y - o.y)) {
          if (G.time - a.rope > 1.2) { a.rope = G.time; Sfx.play('spyclimbRopeTwang'); K.pop(st, a.x, scrY(st, a.y) - 30, 'Rope!', '#ffffff', 16); }
          if (G.time - (a.tautAt || 0) > 0.5) a.tautT = 0;
          a.tautT = (a.tautT || 0) + dt / (mx && my ? 2 : 1); a.tautAt = G.time;
          return false;
        }
        if (nx < W_.x0 + 8 || nx > W_.x1 - 8 || ny < 16 || ny > st.L.top - 16) return false;
        const lead = ax === 'x' ? [nx + Math.sign(nx - a.x) * 9, ny] : [nx, ny + Math.sign(ny - a.y) * 12];
        if (good(st, lead[0], lead[1]) || onCradleAt(st, lead[0], lead[1])) { a.x = nx; a.y = ny; return true; }
        // bad surface ahead: let go into a hang if the partner is clamped, else squeak at the edge
        if (anchored(st, a) && Math.hypot(a.x - o.x, a.y - o.y) <= S.rope) { startHang(st, a, ax === 'x' ? Math.sign(nx - a.x) : 0); return true; }
        if (G.time - (a.edgeT || 0) > 0.6) { a.edgeT = G.time; Sfx.play('spyclimbCupSqueak'); }
        st.needClamp = { id: o.id, t: G.time };
        return false;
      };
      if (mx && tryMove(a.x + mx, a.y, 'x')) a.moved = true;
      if (a.st === 'climb' && my && tryMove(a.x, a.y + my, 'y')) a.moved = true;
      if (a.moved) a.tautT = 0;
      if (a.moved) { a.moveT += dt; a.squeak -= dt; if (a.squeak <= 0) { a.squeak = 0.22; a.sq2 = !a.sq2; Sfx.play(a.sq2 ? 'spyclimbCupSqueak' : 'spyclimbCupSqueakHi'); } }
      else a.moveT = 0;
      return;
    }
    if (a.st === 'hang') {
      a.clamp = false; a.clampT = 0; a.hangT += dt;
      if (!anchored(st, a)) { slide(st, 'The anchor let go! Slide!'); return; }
      const L = a.Lr;
      // the pendulum: theta from straight down (positive = to the right of the anchor)
      let acc = -(S.grav / L) * Math.sin(a.th) + (S.pump / L) * w.x * Math.cos(a.th) - S.damp * a.om;
      if (st.gust && st.gust.on) acc += st.gust.dir * 6;
      a.om += acc * dt; a.th += a.om * dt;
      a.th = clamp(a.th, -1.45, 1.45);
      if (Math.abs(a.th) >= 1.45) a.om *= -0.3;
      if (w.y > 0) a.Lr = Math.max(S.minL, a.Lr - S.reel * dt);
      if (w.y < 0) a.Lr = Math.min(S.rope, a.Lr + S.reel * dt);
      const nx = o.x + a.Lr * Math.sin(a.th), ny = o.y - a.Lr * Math.cos(a.th);
      a.x = clamp(nx, W_.x0 + 8, W_.x1 - 8); a.y = Math.max(16, ny);
      if (w.x) a.face = w.x;
      a.moved = true;
      if (Math.abs(a.om) > 1.4 && G.time - (a.whoosh || 0) > 0.6) { a.whoosh = G.time; Sfx.play('spyclimbSwingWhoosh'); }
      if (G.time - (a.creak || 0) > 0.9) { a.creak = G.time; Sfx.play('spyclimbRopeCreak'); }
      // stick on good glass the way you were going (anywhere after a while)
      if (a.hangT > S.stickT && good(st, a.x, a.y)) {
        const c = cellOf(a.x, a.y).c;
        if (!a.entry || a.hangT > S.stickAny || (c - a.entryC) * a.entry > 0) {
          a.st = 'climb'; a.om = 0; a.th = 0; Sfx.play('spyclimbClampThunk'); K.dust(st, a.x, scrY(st, a.y), 'rgba(220,240,255,0.6)', 4);
          if (a.entry) st.stats.swings++;
        }
      }
    }
  }
  function startHang(st, a, dir) {
    const o = partnerOf(st, a), d = Math.max(S.minL, Math.hypot(a.x - o.x, a.y - o.y));
    a.st = 'hang'; a.hangT = 0; a.entry = dir; a.entryC = cellOf(a.x, a.y).c; a.Lr = Math.min(S.rope, d);
    a.th = Math.atan2(a.x - o.x, o.y - a.y); a.om = 0; a.clamp = false;
    Sfx.play('spyclimbCupPop');
  }
  function slip(st, a, text) {
    if (a.st !== 'climb' || st.state !== 'go') return;
    st.stats.slips++; a.crooked = 3;
    bad(st, text || 'Slip!');
    Sfx.play('spyclimbSlipYelp');
    if (anchored(st, a) && Math.hypot(a.x - partnerOf(st, a).x, a.y - partnerOf(st, a).y) <= S.rope) { startHang(st, a, 0); a.entry = 0; }
    else slide(st, 'Slip! Nobody clamped: slide!');
  }
  function slide(st, text) {
    if (st.state !== 'go') return;
    st.state = 'slide'; st.slideT = 0; st.stats.slides++;
    bad(st, text);
    Sfx.play('spyclimbSlideSqueal');
    // the nearest ledge below the lower agent: the checkpoint if it's below, else the stretch start
    const low = Math.min(st.ag[0].y, st.ag[1].y), L = st.L;
    const cp = st.cp && cy(st.cp.at[0][1]) <= low + 4 ? st.cp : null;
    st.slideTo = cp ? { at: cp.at, leg: cp.leg } : { at: L.start, leg: 0 };
    for (const a of st.ag) { a.slideFrom = { x: a.x, y: a.y }; a.crooked = 3; }
  }
  function slideStep(st, dt) {
    st.slideT += dt;
    const u = K.smooth(st.slideT / S.slideT);
    st.ag.forEach((a, i) => { const to = st.slideTo.at[i]; a.x = K.lerp(a.slideFrom.x, cx(to[0]), u); a.y = K.lerp(a.slideFrom.y, cy(to[1]), u); a.st = 'climb'; a.clamp = false; });
    if (st.slideT >= S.slideT) {
      const keep = st.ag.map(a => a.crooked);
      place(st, st.slideTo.at, st.slideTo.leg);
      st.ag.forEach((a, i) => { a.crooked = keep[i]; });
      st.state = 'go';
      K.msg(st, 'Phew. On the ledge. Clamp first, then swing!', '#ffffff', 2.2);
    }
  }
  function bad(st, text) {
    st.rc.bad++;
    if (text) K.msg(st, text, '#ffd0c8', 2.4);
    if (st.rc.bad >= 3 && !st.goldUsed && K.both(st)) {
      st.goldUsed = true; st.gold = true;
      K.goldHelp(st, 'Gold suction cups! Lights spot you slower and windows and gusts warn earlier');
    }
  }

  /* ---------- hazards ---------- */
  const tellOf = (st, t) => t + (st.gold ? S.goldTell : 0);
  function lightAt(Lt, T) { return { x: Lt.x0 + Lt.ax * Math.sin(Lt.w * T + Lt.ph), y: Lt.y0 + Lt.ay * Math.sin(Lt.w2 * T + Lt.ph * 1.7), rx: Lt.rx, ry: Lt.ry }; }
  const inEllipse = (e, x, y, m = 0) => ((x - e.x) / (e.rx + m)) ** 2 + ((y - e.y) / (e.ry + m)) ** 2 <= 1;
  function winPhase(st, w, T) {
    const tell = tellOf(st, S.winTell), u = ((T + w.off) % w.per + w.per) % w.per;
    // the first cycle starts quietly: no window opens in the first few seconds of a stretch
    if (T + w.off < w.per) return { ph: 'shut', u };
    if (u < tell) return { ph: 'glow', u, left: tell - u };
    if (u < tell + S.winOpen) return { ph: 'open', u: u - tell };
    if (u < tell + S.winOpen + S.winLook) return { ph: 'look', u: u - tell - S.winOpen };
    return { ph: 'shut', u };
  }
  function hazards(st, dt) {
    const T = st.T, L = st.L;
    // windows
    for (const key in st.winAt) {
      const w = st.winAt[key], p = winPhase(st, w, T), was = w.ph;
      w.ph = p.ph; w.u = p.u; w.left = p.left;
      if (was !== 'open' && p.ph === 'open') {
        Sfx.play('spyclimbWindowSlide'); if (w.prop === 'rug') Sfx.play('spyclimbRugFlap');
        for (const a of st.ag) { const c = cellOf(a.x, a.y); if (a.st === 'climb' && c.c === w.c && c.r === w.r) slip(st, a, 'A window opened under ' + NAMES[a.id] + '! Slip!'); }
      }
      if (p.ph === 'look') {
        const wx = cx(w.c), wy = cy(w.r);
        for (const a of st.ag) if (a.moved && Math.abs(a.x - wx) < W_.pw * 2.2 && Math.abs(a.y - wy) < W_.ph * 2.2) { st.spot += S.spotZero * dt * (st.gold ? S.goldSlow : 1); w.saw = true; }
        if (w.saw && !w.hey) { w.hey = true; Sfx.play('spyHey'); }
      } else { w.saw = false; w.hey = false; }
    }
    // gusts
    if (L.gusts) {
      if (!st.gust && T >= st.gustNext - tellOf(st, S.gustTell)) { st.gust = { dir: (Math.floor(T / L.gusts.every) % 2) ? 1 : -1, t: 0, on: false, tell: tellOf(st, S.gustTell) }; Sfx.play('spyclimbWindGust'); }
      if (st.gust) {
        const g = st.gust; g.t += dt;
        if (g.t >= g.tell && g.t < g.tell + S.gustT) {
          g.on = true;
          for (const a of st.ag) if (a.st === 'climb' && !a.clamp && !onCradle(st, a)) {
            const nx = a.x + g.dir * S.gustV * dt;
            if (nx < W_.x0 + 8 || nx > W_.x1 - 8 || !good(st, nx, a.y)) slip(st, a, 'The wind blew ' + NAMES[a.id] + ' off the glass!');
            else a.x = nx;
          }
        } else g.on = false;
        if (g.t >= g.tell + S.gustT + 0.3) { st.gust = null; st.gustNext = T + L.gusts.every; }
      }
    }
    // lights
    st.lit = [false, false];
    const slow = st.gold ? S.goldSlow : 1;
    for (const Lt of L.lights) {
      const e = lightAt(Lt, T);
      for (const a of st.ag) if (inEllipse(e, a.x, a.y)) { st.lit[a.id] = true; if (a.moved && !a.clamp) st.spot += S.spotLight * dt * slow; }
    }
    // pigeons: moving for a while right beside them startles them
    for (const p of st.pig) {
      if (p.gone) { p.t += dt; continue; }
      for (const a of st.ag) if (a.moved && a.moveT > S.pigeonT && Math.hypot(a.x - p.x, a.y - p.y) < S.pigeonR) {
        p.gone = true; p.t = 0; st.spot += S.spotPigeon; st.stats.pigeons++; Sfx.play('spyclimbPigeonFlutter'); K.pop(st, p.x, scrY(st, p.y) - 30, 'Flap flap!', '#ffffff', 16);
        for (let i = 0; i < 8; i++) K.part(st, p.x, scrY(st, p.y), (Math.random() - 0.5) * 120, -Math.random() * 80, 0.8, '#d8d8e0', 3, -60, 'leaf');
        break;
      }
    }
    // the cradle: a free lift when both are on it
    if (st.crad) {
      const c = st.crad, cr = L.cradle, on = st.ag.filter(a => onCradle(st, a) && a.st === 'climb').length;
      const v = on === 2 ? 52 : on === 1 ? 0 : 26 * c.dir;
      c.moving = v !== 0;
      const ny = clamp(c.y + (on === 2 ? Math.abs(v) : v) * dt, cr.lo, cr.hi);
      const dy = ny - c.y; c.y = ny;
      if (on !== 2 && (c.y <= cr.lo || c.y >= cr.hi)) c.dir *= -1;
      if (dy) for (const a of st.ag) if (onCradle(st, a) && a.st === 'climb' && !a.clamp) a.y += dy;
      // the robot sprays the panes beside it: wet for 4 s
      c.robot += dt;
      const r = Math.floor(c.y / W_.ph);
      for (const rr_ of [r - 1, r]) for (const cc of [cr.c0 - 1, cr.c1 + 1]) if (rr_ >= 0 && cc >= 0 && cc < W_.cols) st.wet[rr_ * 100 + cc] = T + 4;
    }
    // the helicopter: thud, then a wide beam on the higher agent
    if (L.heli && !st.heliDone && !st.heli) {
      const hi = Math.max(st.ag[0].y, st.ag[1].y);
      if (hi > cy(L.heli.row)) { st.heli = { t: 0, x: st.ag[0].y > st.ag[1].y ? st.ag[0].x : st.ag[1].x, y: hi + 140 }; Sfx.play('spyclimbHelicopterThud'); K.msg(st, 'Helicopter! Everybody clamp!', '#ffd0c8', 2.6); }
    }
    if (st.heli) {
      const h = st.heli; h.t += dt;
      const hiA = st.ag[0].y > st.ag[1].y ? st.ag[0] : st.ag[1];
      if (h.t > S.heliWarn) {
        const ux = hiA.x - h.x, uy = hiA.y - h.y, d = Math.hypot(ux, uy) || 1, v = Math.min(d, S.heliV * dt);
        h.x += ux / d * v; h.y += uy / d * v;
        for (const a of st.ag) if (Math.hypot(a.x - h.x, a.y - h.y) < S.heliR && !a.clamp) { st.spot += S.spotHeli * dt * slow; st.lit[a.id] = true; }
      } else { h.y = hiA.y + 160 - h.t * 50; h.x = K.lerp(h.x, hiA.x, dt); }
      if (Math.floor(h.t * 2.2) !== Math.floor((h.t - dt) * 2.2)) Sfx.play('spyclimbHelicopterThud');
      if (h.t > S.heliWarn + S.heliT) { st.heli = null; st.heliDone = true; }
    }
  }
  const onCradleAt = (st, x, y) => { if (!st.crad) return false; const cr = st.L.cradle; return x > W_.x0 + cr.c0 * W_.pw && x < W_.x0 + (cr.c1 + 1) * W_.pw && y > st.crad.y - 6 && y < st.crad.y + W_.ph + 6; };
  const onCradle = (st, a) => onCradleAt(st, a.x, a.y);
  function spotted(st, dt) {
    const anyLit = st.lit[0] || st.lit[1] || st.zeroLook.length;
    if (!anyLit && !st.ag.some(a => a.moved && st.heli)) st.spot = Math.max(0, st.spot - S.drain * dt);
    st.spot = Math.min(100, st.spot);
    if (st.spot >= 100 && st.state === 'go') {
      st.state = 'spotted'; st.endT = 0; st.stats.spotted++;
      bad(st, 'Spotted! Shutters down: back to the last ledge');
      Sfx.play('spyclimbShutterRattle'); Sfx.play('spyHey'); G.shake = 0.3;
      st.spot = 0;
    }
  }
  function pickups(st) {
    st.L.intel.forEach((e, i) => {
      if (st.got[i]) return;
      for (const a of st.ag) if (Math.hypot(a.x - e.x, a.y - e.y) < 24) {
        st.got[i] = true; st.intelGot[st.k] = (st.intelGot[st.k] || 0) + 1; st.intel++;
        Sfx.play('spyIntel'); K.pop(st, e.x, scrY(st, e.y) - 30, 'Intel ' + st.intel + '/' + S.intel, '#fff1c0', 18); K.spark(st, e.x, scrY(st, e.y), 8);
        break;
      }
    });
  }
  // each agent's leg on the route, and the halfway checkpoint
  function progress(st) {
    const R = st.L.route;
    for (const a of st.ag) {
      let n = a.leg;
      while (n < R.length - 1) {
        const lg = R[n];
        // (a point also counts once you have climbed well past it: people don't follow the route's exact points, and
        // every route runs upward, so without this a free climber never got the checkpoint, the gold rings or the hook)
        if (lg.t === 'go') { const t = legPt(lg, a.id); if (Math.hypot(a.x - t.x, a.y - t.y) < 16 || (a.st === 'climb' && a.y > lg.y + 30)) { n++; continue; }
          // the computer gives a point up when the rope has held it short of it for 5 s (its partner is waiting somewhere else)
          if (cpuOn(a.id) && a.tautT > 5) { a.tautT = 0; n++; continue; } }
        else if (lg.t === 'swing') { if (crossed(st, a, lg) && crossed(st, partnerOf(st, a), lg)) { n++; continue; } }
        break;
      }
      a.leg = n;
    }
    const cp = st.L.cp;
    if (cp && !st.cp && st.ag.every(a => a.leg >= cp.leg && a.st === 'climb')) {
      st.cp = cp; Sfx.play('spyclimbClampThunk'); K.pop(st, (st.ag[0].x + st.ag[1].x) / 2, scrY(st, Math.max(st.ag[0].y, st.ag[1].y)) - 50, 'Checkpoint ledge!', '#8fe3b0', 20);
    }
  }
  // each agent's own spot at a route point: side by side, but never off the wall or on bad surface
  const legPt = (lg, id) => {
    // (on an envelope's point, Pip goes right onto it so the pair always picks it up)
    const xs = lg.env && !id ? [lg.x, lg.x + 20, lg.x - 20] : [lg.x + (id ? 20 : -20), lg.x - (id ? 20 : -20), lg.x];
    for (const x of xs) if (x > W_.x0 + 12 && x < W_.x1 - 12 && lg.ok(x)) return { x, y: lg.y };
    return { x: lg.x, y: lg.y };
  };
  const crossed = (st, a, lg) => a.st === 'climb' && (a.x - lg.edge) * lg.dir > 0;

  /* ---------- the end job: hook the rope (or cut the glass) ---------- */
  function hookStep(st, dt) {
    const H = st.L.hook, h = st.ag[H.who], o = st.ag[1 - H.who];
    const at = Math.hypot(h.x - H.x, h.y - H.y) < S.hookR && h.st === 'climb' && h.clamp;
    const ok = at && o.st === 'climb' && o.clamp;
    st.hookAt = at;
    if (ok) {
      st.hook += dt;
      if (H.cut && Math.floor(st.hook * 8) !== Math.floor((st.hook - dt) * 8)) Sfx.play('spyclimbGlassCut');
      const need = H.cut ? S.cutT : S.hookT;
      if (st.hook >= need) {
        st.state = 'end'; st.endT = 0; st.stats.roomT[st.k] = G.time - st.segStart;
        if (H.cut) { Sfx.play('spyclimbGlassPop'); K.pop(st, H.x, scrY(st, H.y) - 50, 'Pop! We\'re in!', '#ffffff', 24); }
        else { Sfx.play('spySting'); K.pop(st, H.x, scrY(st, H.y) - 50, (G.level.def.done || 'Hooked on!') + ' Next stretch!', '#ffffff', 22); }
      }
    } else st.hook = Math.max(0, st.hook - dt * 2);
  }
  function endStep(st, dt) {
    st.endT += dt;
    const H = st.L.hook;
    if (H.cut) {
      // both climb in through the circle and vanish into floor 40
      st.ag.forEach((a, i) => { a.x = K.lerp(a.x, H.x + (i ? 8 : -8), dt * 3); a.y = K.lerp(a.y, H.y, dt * 3); a.clamp = false; });
      if (st.endT > 1.2 && !st.party) { st.party = true; Sfx.play('spyCheer'); K.confetti(st, H.x, scrY(st, H.y), 30); }
      if (st.endT > 2.6 && !st.cleared) { st.cleared = true; G.level.goal = { x: W / 2, y: 300 }; levelClear(); }
      return;
    }
    if (st.endT > 2.0) nextRoom();
  }

  /* ---------- camera and the engine bodies ---------- */
  function camera(st, dt) {
    const low = Math.min(st.ag[0].y, st.ag[1].y);
    const want = clamp(low - 140, -10, st.L.top - (GY - 40));
    st.camY = K.lerp(st.camY, want, clamp(dt * 3, 0, 1));
  }
  const scrY = (st, y) => GY - (y - st.camY);
  function mirror(st) {
    st.spyLook = st.ag.map(a => ({ crooked: a.crooked > 0, clamp: a.clamp }));
    for (const a of st.ag) K.place(a.id, a.x, scrY(st, a.y) + 15);
    st.run = st.ag.map(a => ({ x: a.x, y: -a.y, st: a.st }));
  }

  /* ---------- what to do next (the prompts, the HUD and the computer brain all read this) ---------- */
  function plan(st) {
    if (st.planMemo && st.planMemo.n === G.tickN && st.planMemo.k === st.k) return st.planMemo.p;
    const p = planNow(st);
    st.planMemo = { n: G.tickN, k: st.k, p };
    return p;
  }
  // is a light, the helicopter or a gust going to reach (x, y) within `secs`?
  function dangerAt(st, x, y, secs) {
    for (const Lt of st.L.lights) for (let t = 0; t <= secs; t += 0.1) if (inEllipse(lightAt(Lt, st.T + t), x, y, 20)) return 'light';
    if (st.heli && st.heli.t > S.heliWarn - 0.8 && Math.hypot(x - st.heli.x, y - st.heli.y) < S.heliR + 90) return 'heli';
    if (st.heli && st.heli.t <= S.heliWarn - 0.8) return 'heli';
    if (st.gust && st.gust.t < st.gust.tell + S.gustT + 0.1) return 'gust';
    if (st.L.gusts && !st.gust && st.T >= st.gustNext - tellOf(st, S.gustTell) - secs) return 'gust';
    return null;
  }
  function winDanger(st, x, y, secs) {
    const { c, r } = cellOf(x, y), w = st.winAt[r * 100 + c];
    if (!w) return false;
    if (w.ph === 'glow' || w.ph === 'open' || w.ph === 'look') return true;
    const nx = winPhase(st, w, st.T + secs).ph;
    return nx !== 'shut';
  }
  function lookingNear(st, x, y) {
    for (const key in st.winAt) { const w = st.winAt[key]; if ((w.ph === 'look' || (w.ph === 'open' && w.u > S.winOpen - 0.4)) && Math.abs(x - cx(w.c)) < W_.pw * 2.8 && Math.abs(y - cy(w.r)) < W_.ph * 2.8) return true; }
    return false;
  }
  function planNow(st) {
    const R = st.L.route, out = { legs: R, ag: [] };
    for (const a of st.ag) {
      const o = partnerOf(st, a), lg = R[Math.min(a.leg, R.length - 1)];
      const P = { leg: a.leg, kind: lg.t, to: null, clamp: false, why: 'climb', swingDir: 0, wait: false, say: null, mark: null };
      if (lg.t === 'go') P.to = legPt(lg, a.id);
      else if (lg.t === 'hook') {
        const H = st.L.hook;
        // (the hooker waits for the partner's last point first, so the rope never holds the partner short of it; a
        // partner who is already up by the hook counts as there, whatever points they skipped on the way)
        const oUp = o.leg >= R.length - 1 || (o.st === 'climb' && Math.hypot(o.x - H.x, o.y - H.y) < S.rope - 30);
        if (H.who === a.id && !oUp) { P.to = null; P.why = 'follow'; }
        else if (H.who === a.id) { P.to = { x: H.x, y: H.y }; P.why = H.cut ? 'cut' : 'hook'; if (Math.hypot(a.x - H.x, a.y - H.y) < S.hookR - 6) P.clamp = true; P.mark = H; }
        else if (!oUp) { P.to = null; P.why = 'follow'; }
        else { P.to = { x: H.x + (H.x > W / 2 ? -60 : 60), y: H.y - 20 }; P.why = 'hold'; if (Math.hypot(a.x - P.to.x, a.y - P.to.y) < 30 || o.leg >= R.length - 1 && Math.hypot(o.x - H.x, o.y - H.y) < 60) P.clamp = Math.hypot(a.x - P.to.x, a.y - P.to.y) < 50; }
      } else {
        // a swing gap
        const meX = crossed(st, a, lg), oX = crossed(st, o, lg) || o.leg > lg.n;
        P.swing = lg;
        if (meX) { P.to = lg.s2; P.why = 'anchor2'; P.mark = lg.s2; if (Math.hypot(a.x - lg.s2.x, a.y - lg.s2.y) < 24 || o.st === 'hang') P.clamp = true; if (oX) { P.clamp = false; P.why = 'climb'; } }
        else if (oX) {
          P.to = lg.s1; P.why = 'swing2'; P.mark = lg.s2;
          const oReady = o.st === 'climb' && o.clamp && o.clampT > 0.25 && Math.hypot(o.x - lg.s2.x, o.y - lg.s2.y) < 34;
          if (a.st === 'hang') P.swingDir = lg.dir;
          else if (Math.hypot(a.x - lg.s1.x, a.y - lg.s1.y) < 14) { if (oReady) P.swingDir = lg.dir; else { P.wait = true; P.clamp = false; } }
        } else {
          const role = roles(st, lg);
          if (role.anchor === a.id) { P.to = lg.s1; P.why = 'anchor'; P.mark = lg.s1; if (Math.hypot(a.x - lg.s1.x, a.y - lg.s1.y) < 24 || o.st === 'hang') P.clamp = true; }
          else {
            P.to = lg.sw; P.why = 'swing'; P.mark = lg.s1;
            const oReady = o.st === 'climb' && o.clamp && o.clampT > 0.25 && Math.hypot(o.x - lg.s1.x, o.y - lg.s1.y) < 34;
            if (a.st === 'hang') P.swingDir = lg.dir;
            else if (Math.hypot(a.x - lg.sw.x, a.y - lg.sw.y) < 14) { if (oReady) P.swingDir = lg.dir; else P.wait = true; }
          }
        }
      }
      out.ag[a.id] = P;
    }
    return out;
  }
  // who swings first at a gap: whoever gets near it first swings, the other anchors. With a person and the computer:
  // if the computer is the swinger and the person hasn't clamped at the mark in 5 s, they swap (the computer anchors).
  function roles(st, lg) {
    let r = st.roles[lg.n];
    if (!r) {
      const d = st.ag.map(a => Math.hypot(a.x - lg.sw.x, a.y - lg.sw.y));
      if (Math.min(d[0], d[1]) > 160) return { anchor: d[0] <= d[1] ? 1 : 0, swinger: d[0] <= d[1] ? 0 : 1 };
      const sw = d[0] <= d[1] ? 0 : 1;
      r = st.roles[lg.n] = { swinger: sw, anchor: 1 - sw, waitT: 0, swapped: false };
    }
    const swA = st.ag[r.swinger], anA = st.ag[r.anchor];
    if (!r.swapped && cpuSolo() && cpuOn(r.swinger) && !cpuOn(r.anchor) && swA.st === 'climb' && Math.hypot(swA.x - lg.sw.x, swA.y - lg.sw.y) < 20 && !(anA.clamp && Math.hypot(anA.x - lg.s1.x, anA.y - lg.s1.y) < 46)) {
      r.waitT += DT;
      if (r.waitT > 5) { r.swapped = true; const t = r.swinger; r.swinger = r.anchor; r.anchor = t; }
    }
    return r;
  }

  /* ---------- drawing ---------- */
  function draw(st) {
    const t = G.clock, cam = st.camY;
    const height = (st.k * W_.rows * W_.ph + cam) / (4 * W_.rows * W_.ph); // 0 at the street, 1 at floor 40
    K.nightSky(t, { moonY: 70 + height * 20 });
    // the city far below, shrinking as they climb
    ctx.save(); const sc = 1 - height * 0.5; ctx.translate(W / 2, H + 40 - height * 60); ctx.scale(sc, sc); ctx.translate(-W / 2, -H);
    K.skyline(t * 4, 0, t, { y: H - 30, par: 0.05, harbour: false }); ctx.restore();
    if (st.k === 3) for (let i = 0; i < 6; i++) { const x = ((i * 233 + t * 18) % (W + 300)) - 150, y = H - 60 + Math.sin(i) * 30; ctx.fillStyle = 'rgba(220,235,240,0.35)'; ctx.beginPath(); ctx.ellipse(x, y, 120, 26, 0, 0, TAU); ctx.fill(); }
    // searchlight beams from the street
    for (const Lt of st.L.lights) { const e = lightAt(Lt, st.T); K.searchBeam(e.x * 0.4 + 200, H + 40, e.x, scrY(st, e.y), e.rx * 0.9, 1); }
    drawWall(st, t);
    drawRope(st);
    for (const a of st.ag) drawAgent(st, a, t);
    // light spots on top of everything on the wall
    for (const Lt of st.L.lights) {
      const e = lightAt(Lt, st.T), sy = scrY(st, e.y);
      const g = ctx.createRadialGradient(e.x, sy, 4, e.x, sy, e.rx);
      g.addColorStop(0, 'rgba(255,252,220,0.42)'); g.addColorStop(1, 'rgba(255,252,220,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(e.x, sy, e.rx, e.ry, 0, 0, TAU); ctx.fill();
    }
    if (st.heli) drawHeli(st, t);
    if (st.gust) drawGust(st, t);
    ctx.save(); ctx.translate(0, 0); K.drawParts(st, 0); ctx.restore();
    if (st.state === 'spotted') drawShutters(st);
  }
  function drawWall(st, t) {
    const L = st.L, r0 = Math.max(0, Math.floor((st.camY - 60) / W_.ph)), r1 = Math.min(W_.rows - 1, Math.ceil((st.camY + GY + 60) / W_.ph));
    // the tower's frame
    ctx.fillStyle = '#0d1c22'; ctx.fillRect(W_.x0 - 10, 0, W_.x1 - W_.x0 + 20, H);
    for (let r = r0; r <= r1; r++) for (let c = 0; c < W_.cols; c++) {
      const x = W_.x0 + c * W_.pw, y = scrY(st, (r + 1) * W_.ph), ch = L.grid[r][c], seed = st.k * 1000 + r * 31 + c * 7;
      pane(st, x, y, ch, seed, r, c, t);
    }
    // the neon letters of ZERO
    for (const Lt of L.letters) {
      const x = W_.x0 + Lt.c * W_.pw, y0 = scrY(st, (Lt.r1 + 1) * W_.ph), h = (Lt.r1 - Lt.r0 + 1) * W_.ph;
      for (let i = 0; i < Lt.s.length; i++) {
        const fl = Math.sin(t * 9 + i * 3) > -0.9 ? 1 : 0.4;
        ctx.save(); ctx.globalAlpha = fl;
        ctx.shadowColor = '#ff4a5a'; ctx.shadowBlur = 16; ctx.strokeStyle = '#ff6a7a'; ctx.lineWidth = 6;
        ctx.font = '900 ' + Math.round(h / 2.2) + 'px "Lilita One", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.strokeText(Lt.s[i], x + W_.pw, y0 + h * (i + 0.5) / Lt.s.length);
        ctx.restore();
      }
    }
    // ledges
    const ledge = (at) => { const y = scrY(st, cy(at[0][1]) - 18); ctx.fillStyle = '#7a8a90'; ctx.fillRect(cx(at[0][0]) - 30, y, cx(at[1][0]) - cx(at[0][0]) + 60, 5); };
    ledge(L.start); if (L.cp) ledge(L.cp.at);
    // the cradle
    if (st.crad) {
      const cr = L.cradle, x0 = W_.x0 + cr.c0 * W_.pw, x1 = W_.x0 + (cr.c1 + 1) * W_.pw, y = scrY(st, st.crad.y);
      ctx.strokeStyle = '#9aa8ae'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x0 + 4, 0); ctx.lineTo(x0 + 4, y - 30); ctx.moveTo(x1 - 4, 0); ctx.lineTo(x1 - 4, y - 30); ctx.stroke();
      ctx.fillStyle = '#c8a040'; ctx.fillRect(x0 - 4, y + 4, x1 - x0 + 8, 8); ctx.strokeStyle = '#c8a040'; ctx.lineWidth = 2; ctx.strokeRect(x0 - 4, y - 30, x1 - x0 + 8, 34);
      // the cleaning robot and its spray
      ctx.fillStyle = '#d8dce0'; rr(x0 + 22, y - 18, 20, 18, 4); ctx.fill(); ctx.fillStyle = '#3a4048'; ctx.fillRect(x0 + 26, y - 13, 12, 4);
      if (Math.sin(t * 10) > 0) { ctx.fillStyle = 'rgba(160,220,255,0.6)'; for (let i = 0; i < 5; i++) { ctx.fillRect(x0 - 16 - i * 3, y - 10 + i * 3, 3, 2); ctx.fillRect(x1 + 12 + i * 3, y - 10 + i * 3, 3, 2); } }
    }
    // pigeons
    for (const p of st.pig) {
      const x = p.x, y = scrY(st, p.y) + 14 - (p.gone ? p.t * 120 : 0);
      if (p.gone && p.t > 2) continue;
      ctx.fillStyle = '#9aa0ac'; ctx.beginPath(); ctx.ellipse(x, y - 6, 8, 6, 0, 0, TAU); ctx.fill(); circle(x + 6, y - 12, 4); ctx.fill();
      ctx.fillStyle = '#f0a040'; ctx.fillRect(x + 9, y - 12, 3, 1.6); ctx.fillStyle = '#111'; circle(x + 7, y - 13, 0.9); ctx.fill();
      if (p.gone) { ctx.fillStyle = '#c8ccd4'; ctx.beginPath(); ctx.ellipse(x - 6, y - 10, 9, 3, Math.sin(t * 30), 0, TAU); ctx.fill(); }
    }
    // intel
    L.intel.forEach((e, i) => { if (!st.got[i]) K.intel('envelope', e.x, scrY(st, e.y), 1, t); });
    // swing marks and the hook
    const pl = plan(st);
    const marks = new Set();
    for (const P of pl.ag) if (P.mark) marks.add(P.mark);
    for (const m of marks) { const y = scrY(st, m.y); ctx.strokeStyle = 'rgba(255,197,61,' + (0.5 + 0.3 * Math.sin(t * 6)) + ')'; ctx.lineWidth = 2.5; ctx.setLineDash([4, 4]); circle(m.x, y, 16); ctx.stroke(); ctx.setLineDash([]); }
    const Hk = L.hook, hy = scrY(st, Hk.y);
    if (Hk.cut) {
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; circle(Hk.x, hy, 22); ctx.stroke();
      const u = st.state === 'end' ? 1 : st.hook / S.cutT;
      if (u > 0) { ctx.strokeStyle = '#fff6c0'; ctx.lineWidth = 4; ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 10; ctx.beginPath(); ctx.arc(Hk.x, hy, 22, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(u, 0, 1)); ctx.stroke(); ctx.shadowBlur = 0; }
      if (st.state === 'end') { ctx.fillStyle = '#ffe9a0'; circle(Hk.x, hy, 21); ctx.fill(); ctx.fillStyle = 'rgba(255,240,190,0.4)'; circle(Hk.x, hy, 30); ctx.fill(); }
      text('VAULT FLOOR', Hk.x, hy - 36, 11, '#fff1c0', 'center', 'body');
    } else {
      ctx.fillStyle = '#c8ccd2'; ctx.fillRect(Hk.x - 3, hy - 14, 6, 14); ctx.strokeStyle = '#c8ccd2'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(Hk.x, hy - 18, 6, 0, TAU); ctx.stroke();
      if (st.hook > 0) K.meter(Hk.x - 26, hy - 40, 52, 7, st.hook / S.hookT, C.gold);
    }
  }
  function pane(st, x, y, ch, seed, r, c, t) {
    const pw = W_.pw, ph = W_.ph, h = K.hash(seed);
    if (ch === '#') {
      ctx.fillStyle = '#4a5458'; ctx.fillRect(x, y, pw, ph); ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x, y + ph - 4, pw, 4); ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(x + (h * 20 | 0), y + 10, 8, 3);
      return;
    }
    if (ch === 'l') {
      ctx.fillStyle = '#2e383c'; ctx.fillRect(x, y, pw, ph); ctx.fillStyle = '#5a666c'; for (let k = 4; k < ph; k += 7) ctx.fillRect(x + 2, y + k, pw - 4, 3);
      return;
    }
    if (ch === 'n') { ctx.fillStyle = '#121a1e'; ctx.fillRect(x, y, pw, ph); ctx.strokeStyle = '#2a3438'; ctx.lineWidth = 1; ctx.strokeRect(x + 2, y + 2, pw - 4, ph - 4); return; }
    const wet = ch === 'w' || st.wet[r * 100 + c] > st.T;
    // glass with a little office behind it
    const lit = h > 0.62;
    ctx.fillStyle = lit ? '#3a3420' : SPY.COL.glass; ctx.fillRect(x, y, pw, ph);
    if (lit) {
      ctx.fillStyle = 'rgba(255,207,106,0.55)'; ctx.fillRect(x + 2, y + 2, pw - 4, ph - 4);
      const kind = Math.floor(K.hash(seed + 3) * 4);
      if (kind === 0) { ctx.fillStyle = '#5a3a20'; ctx.fillRect(x + 6, y + ph - 14, 24, 4); ctx.fillStyle = COL_INK; circle(x + 18, y + ph - 18, 4); ctx.fill(); text('z', x + 26, y + ph - 28 - (t * 6 + seed) % 6, 9, '#ffffff', 'center', 'body'); }
      else if (kind === 1) { ctx.fillStyle = '#4ab0d0'; ctx.fillRect(x + 8, y + ph - 20, 20, 14); ctx.fillStyle = '#ff9a3a'; circle(x + 12 + Math.sin(t + seed) * 5 + 5, y + ph - 13, 2); ctx.fill(); }
      else if (kind === 2) { ctx.fillStyle = '#3a5a3a'; ctx.fillRect(x + 22, y + ph - 22, 6, 16); circle(x + 25, y + ph - 24, 6); ctx.fill(); }
      else { ctx.fillStyle = '#e8e0d0'; ctx.fillRect(x + 8, y + ph - 22, 4, 16); ctx.fillStyle = '#2a7a9a'; ctx.fillRect(x + 6, y + ph - 26, 8, 6); }
    } else { ctx.fillStyle = 'rgba(120,200,220,0.08)'; ctx.fillRect(x + 4, y + 4, 6, ph - 8); }
    // reflections and the mullions
    ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.beginPath(); ctx.moveTo(x + 4, y + ph - 4); ctx.lineTo(x + 14, y + 4); ctx.lineTo(x + 20, y + 4); ctx.lineTo(x + 10, y + ph - 4); ctx.fill();
    if (wet) { ctx.fillStyle = 'rgba(160,220,255,0.35)'; ctx.fillRect(x, y, pw, ph); ctx.fillStyle = 'rgba(220,245,255,0.7)'; for (let k = 0; k < 3; k++) { const dx = 6 + k * 11, dy = (t * 30 + seed * 7 + k * 13) % ph; ctx.fillRect(x + dx, y + dy, 2, 6); } }
    ctx.strokeStyle = '#7a8e96'; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, pw - 2, ph - 2);
    if (ch === 'x') {
      const w = st.winAt[r * 100 + c];
      if (!w) return;
      if (w.ph === 'glow') { ctx.fillStyle = 'rgba(255,214,90,' + (0.45 + 0.35 * Math.sin(t * 16)) + ')'; ctx.fillRect(x, y, pw, ph); }
      if (w.ph === 'open' || w.ph === 'look') {
        ctx.fillStyle = '#2a2418'; ctx.fillRect(x, y, pw, ph);
        ctx.fillStyle = 'rgba(160,200,210,0.6)'; ctx.beginPath(); ctx.moveTo(x + pw, y); ctx.lineTo(x + pw + 14, y + 6); ctx.lineTo(x + pw + 14, y + ph - 6); ctx.lineTo(x + pw, y + ph); ctx.fill();
        const pose = w.ph === 'look' ? 'look' : 'lean';
        ctx.save(); ctx.beginPath(); ctx.rect(x - 30, y - 30, pw + 60, ph + 30); ctx.clip();
        K.zero(x + pw / 2, y + ph + 22, { s: 0.55, face: w.ph === 'look' ? (Math.sin(t * 3) > 0 ? 1 : -1) : 1, pose, t });
        ctx.restore();
        if (w.ph === 'open') {
          if (w.prop === 'rug') { ctx.fillStyle = '#b8503a'; ctx.fillRect(x - 18 + Math.sin(t * 14) * 3, y + 10, 18, 12); }
          else if (w.prop === 'plant') { ctx.fillStyle = '#3a8a3a'; circle(x + pw + 6, y + 14, 6); ctx.fill(); ctx.fillStyle = 'rgba(160,220,255,0.7)'; ctx.fillRect(x + pw + 4, y + 20, 2, 10); }
          else text('☾', x + pw / 2, y - 6, 12, '#fff1c0', 'center', 'body');
        }
      }
    }
  }
  const COL_INK = '#15181c';
  function drawRope(st) {
    const a = st.ag[0], b = st.ag[1], ay = scrY(st, a.y), by = scrY(st, b.y), d = Math.hypot(a.x - b.x, a.y - b.y);
    const sag = a.st === 'hang' || b.st === 'hang' ? 0 : Math.max(0, (S.rope - d) * 0.35);
    ctx.strokeStyle = '#e8d8a8'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(a.x, ay + 8); ctx.quadraticCurveTo((a.x + b.x) / 2, (ay + by) / 2 + 8 + sag, b.x, by + 8); ctx.stroke();
    ctx.strokeStyle = 'rgba(120,90,40,0.6)'; ctx.lineWidth = 0.8; ctx.setLineDash([3, 4]); ctx.stroke(); ctx.setLineDash([]);
  }
  function drawAgent(st, a, t) {
    const sx = a.x, sy = scrY(st, a.y) + 15;
    const o = { face: a.face, s: 1.25 };
    if (a.clamp) { o.sy = 0.9; o.sx = 1.1; }
    if (a.st === 'hang') o.rot = -a.th * 0.6;
    K.hero(a.id, sx, sy, o);
  }
  function drawHeli(st, t) {
    const h = st.heli, sy = scrY(st, h.y);
    if (h.t > S.heliWarn) {
      const g = ctx.createRadialGradient(h.x, sy, 10, h.x, sy, S.heliR);
      g.addColorStop(0, 'rgba(255,255,230,0.5)'); g.addColorStop(1, 'rgba(255,255,230,0)'); ctx.fillStyle = g; circle(h.x, sy, S.heliR); ctx.fill();
      K.searchBeam(h.x + 120, 40, h.x, sy, S.heliR * 0.8, 1.2);
    }
    // the helicopter itself, up in the corner
    const hx = h.x + 120, hy = 46 + Math.sin(t * 2) * 4;
    ctx.fillStyle = '#1a1e22'; ctx.beginPath(); ctx.ellipse(hx, hy, 34, 16, 0, 0, TAU); ctx.fill(); ctx.fillRect(hx + 20, hy - 4, 50, 6);
    ctx.fillStyle = '#ffcf6a'; ctx.beginPath(); ctx.ellipse(hx - 14, hy - 2, 10, 8, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(200,200,200,0.7)'; ctx.lineWidth = 3; const sw = Math.sin(t * 40) * 60; ctx.beginPath(); ctx.moveTo(hx - sw, hy - 18); ctx.lineTo(hx + sw, hy - 18); ctx.stroke();
    // Count Zero's silhouette at the window
    ctx.fillStyle = '#0a0c0e'; circle(hx - 14, hy - 2, 5); ctx.fill();
  }
  function drawGust(st, t) {
    const g = st.gust, a = g.on ? 1 : clamp(g.t / g.tell, 0, 1) * 0.6;
    ctx.strokeStyle = 'rgba(230,245,255,' + 0.5 * a + ')'; ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) { const y = 60 + i * 55, x = ((g.t * 900 * g.dir + i * 140) % (W + 200) + W + 200) % (W + 200) - 100; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 40 * g.dir, y - 8, x + 90 * g.dir, y); ctx.stroke(); }
    // flags snapping at the tower's edges
    for (const fx of [W_.x0 - 10, W_.x1 + 10]) { ctx.strokeStyle = '#9aa8ae'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(fx, 140); ctx.lineTo(fx, 200); ctx.stroke(); ctx.fillStyle = '#c8323a'; ctx.beginPath(); ctx.moveTo(fx, 140); ctx.lineTo(fx + g.dir * (30 + Math.sin(t * 30) * 4), 146); ctx.lineTo(fx, 154); ctx.fill(); }
  }
  function drawShutters(st) {
    const u = clamp(st.endT / 0.6, 0, 1);
    ctx.fillStyle = 'rgba(60,66,70,0.95)'; ctx.fillRect(W_.x0, 0, W_.x1 - W_.x0, H * u);
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; for (let y = 0; y < H * u; y += 14) ctx.fillRect(W_.x0, y, W_.x1 - W_.x0, 3);
    if (u >= 1) { K.zero(W / 2, H / 2 + 40, { s: 1.4, pose: 'fist', t: G.clock, net: true }); bigText('SPOTTED!', W / 2, H / 2 - 70, 40, '#ffd0c8'); }
  }

  /* ---------- HUD ---------- */
  function hud(st) {
    const big = hudBig(), z = big ? 1.25 : 1;
    let x0;
    {
      const fs = big ? 20 : 14, h = big ? 40 : 28, tm = fmtTime(G.time), n = '✉ ' + st.intel + ' / ' + S.intel;
      ctx.font = K.FONT(fs);
      const w = ctx.measureText(tm).width + ctx.measureText(n).width + fs + 30;
      x0 = pill(W - 14, 12, w, h, 'right');
      text(tm, x0 + 15, 12 + h / 2 + 0.5, fs, st.waiting ? '#aab' : C.paper, 'left', 'body');
      text(n, x0 + w - 15, 12 + h / 2 + 0.5, fs, '#fff1c0', 'right', 'body');
      K.alertBar(W - 14 - 230 * z, 12 + h + 8, 230, st.spot / 100, { icon: 'eye', label: 'Spotted' });
      if (st.gold) K.chip(W - 14 - 120 * z, 12 + h + 40 * z, 120 * z, 22 * z, '★ gold cups', false, true, z);
    }
    K.drawMsg(st, st.waiting ? { text: K.BREAK, col: '#ffffff', t: 1, life: 2 } : st.msg, x0);
    K.drawControl(st);
    const pl = plan(st), P = K.prompter(st);
    for (const a of st.ag) {
      const Pa = pl.ag[a.id], x = a.x, y = scrY(st, a.y) - 18;
      let s = null, col = C.gold, pulse = false;
      if (st.needClamp && st.needClamp.id === a.id && G.time - st.needClamp.t < 1.4) { s = 'Clamp! Hold ' + K.key(a.id, 'act'); pulse = true; }
      else if (a.st === 'hang') s = 'Swing! Hold ' + (Pa.swing ? K.key(a.id, Pa.swing.dir > 0 ? 'right' : 'left') : K.key(a.id, 'move'));
      else if (partnerOf(st, a).st === 'hang' && !a.clamp) { s = 'KEEP CLAMPED! ' + K.key(a.id, 'act'); pulse = true; }
      else if (st.lit[a.id] && !a.clamp) { s = 'Light! Freeze or clamp ' + K.key(a.id, 'act'); pulse = true; col = '#fff6c0'; }
      else if (winOn(st, a)) { s = 'That window\'s opening! Move off!'; pulse = true; }
      else if (st.gust && !a.clamp) { s = 'Gust! Clamp ' + K.key(a.id, 'act'); pulse = true; }
      else if (Pa.why === 'hook' || Pa.why === 'cut') s = Math.hypot(a.x - st.L.hook.x, a.y - st.L.hook.y) < S.hookR ? 'Hold ' + K.key(a.id, 'act') + (Pa.why === 'cut' ? ' to cut the glass' : ' to hook the rope') : (Pa.why === 'cut' ? 'Cut the glass at the circle!' : 'Hook the rope at the top!');
      else if (Pa.why === 'hold' && st.hookAt && !a.clamp) { s = 'Clamp so ' + NAMES[1 - a.id] + ' can work! ' + K.key(a.id, 'act'); pulse = true; }
      else if (Pa.why === 'anchor' || Pa.why === 'anchor2') s = a.clamp ? 'Stay clamped for ' + NAMES[1 - a.id] : 'Clamp at the gold ring ' + K.key(a.id, 'act');
      else if (Pa.why === 'swing' && Pa.wait) s = 'Wait for ' + NAMES[1 - a.id] + ' to clamp';
      P.say(a.id, s, x, y, col, pulse);
    }
    for (const id of [0, 1]) {
      const job = st.L.hook.who === id ? (st.L.hook.cut ? 'cutter' : 'hooks the rope') : 'climber';
      const b = K.panel(id, job, 210, 46, z);
      const a = st.ag[id];
      text(a.st === 'hang' ? 'swinging' : a.clamp ? 'clamped ●' : 'climbing', b.x + 12 * z, b.y + 32 * z, 12 * z, a.clamp ? '#8fe3b0' : '#ffffff', 'left', 'body');
    }
  }
  function winOn(st, a) { const { c, r } = cellOf(a.x, a.y), w = st.winAt[r * 100 + c]; return a.st === 'climb' && w && w.ph === 'glow'; }

  const medal = t => K.medal(t <= S.goldT, t <= S.silverT);
  MODES.spyclimb = {
    S, W_, plan, medal, build, cx, cy, good, surf, dangerAt, winDanger, lookingNear, lightAt, inEllipse, cellOf,
    medals: { bronze: 'Climb in through the vault-floor window', goals: [{ key: 'time', gold: S.goldT, silver: S.silverT }, { key: 'slips', gold: 0, silver: 3, text: n => (n === 0 ? 'Never slipped or spotted' : 'Slipped or spotted ' + n + ' times at most'), gap: (v, n) => Math.ceil(v - n) + ' fewer slips or spottings' }, { key: 'intel', gold: S.intel, silver: 14, more: true, word: 'Intel envelope' }] },
    medalValues() { const st = G.mst; return { slips: st.stats.slips + st.stats.spotted, intel: st.intel }; },
    setup(st, L) {
      st.stats = { slips: 0, slides: 0, spotted: 0, swings: 0, pigeons: 0, helps: 0, roomT: [] };
      st.intel = 0; st.intelGot = []; st.inT = [G.time, G.time]; st.personT = G.time; st.clock = 0;
      for (const row of L.grid) row.fill('.');
      room(st, L.def, 0);
    },
    room(k, L) { const st = G.mst; st.inT = [G.time, G.time]; st.personT = G.time; for (const row of L.grid) row.fill('.'); room(st, L.def, k); },
    step(dt) { tick(G.mst, dt); },
    draw() { const st = G.mst; if (!st.L) return; draw(st); K.hide(st); },
    drawTop() { const st = G.mst; K.unhide(st); if (st.L) K.drawPops(st, 0, 0); },
    hud() { const st = G.mst; if (st.L) hud(st); },
    stats() {
      const st = G.mst, s = st.stats;
      if (!s) return [];
      const out = [
        { label: 'Slips', value: String(s.slips) },
        { label: 'Spotted', value: String(s.spotted) },
        { label: 'Intel', value: st.intel + ' of ' + S.intel },
      ];
      out.push('Slides: ' + s.slides + '. Swings: ' + s.swings + '. In through the vault-floor window!');
      const hl = K.helpLine(s.helps); if (hl) out.push(hl);
      return out;
    },
  };

  /* ---------- the level ---------- */
  SPY.defs.spyclimb = {
    name: 'Skyscraper Window Climb', world: 37, kind: 'team', mode: 'spyclimb', outfit: 'spyclimb', ownStep: true, ownHUD: true, noFalls: true, roomWord: 'Stretch',
    legend: {
      pip: '<kbd>A</kbd><kbd>D</kbd><kbd>W</kbd><kbd>S</kbd> climb',
      bo: '<kbd>←</kbd><kbd>→</kbd><kbd>↑</kbd><kbd>↓</kbd> climb',
    },
    tip: 'One clamps, one swings. Stay still when a light passes over you.',
    howTo: [
      'Hold the action to clamp. A clamped agent can\'t be seen or blown off.',
      'Cups don\'t stick on wet glass or concrete. Clamp, and your partner can swing across on the rope.',
      'A window glowing yellow is about to open. Get off it.',
    ],
    act: { label: 'clamp' },
    map: K.stubMap(),
    rooms: [
      { title: 'Lower Floors', done: 'Rope hooked!', tip: 'Climb up. Freeze or clamp in the searchlight. At the louvres, one clamps at the gold ring and the other swings across.' },
      { title: 'The Office Floors', done: 'Rope hooked!', tip: 'Windows glowing yellow are about to open. Creep past the pigeons. The cleaners\' cradle is a free lift if you both get on.' },
      { title: 'The Neon Sign', done: 'Rope hooked!', tip: 'Swing between the giant letters of ZERO. Clamp when the wind blows, and when the helicopter comes!' },
      { title: 'The Penthouse', done: 'In!', tip: 'Everything at once, way above the clouds. At the top, Bo cuts a circle in the vault-floor window while Pip clamps.' },
    ],
  };

  /* ---------- sounds ---------- */
  Sfx.extra.spyclimbCupSqueak = function () { this.tone(1500, 0.05, 'sine', 0.025, 1900); };
  Sfx.extra.spyclimbCupSqueakHi = function () { this.tone(1800, 0.05, 'sine', 0.022, 2200); };
  Sfx.extra.spyclimbCupPop = function () { this.tone(500, 0.06, 'sine', 0.05, 1200); };
  Sfx.extra.spyclimbClampThunk = function () { this.tone(160, 0.07, 'sine', 0.06, 90); this.noise(0.04, { type: 'lowpass', f: 800, vol: 0.03 }); };
  Sfx.extra.spyclimbRopeCreak = function () { this.tone(190, 0.18, 'sawtooth', 0.008, 150); };
  Sfx.extra.spyclimbRopeTwang = function () { this.tone(110, 0.25, 'triangle', 0.05, 90); this.tone(220, 0.15, 'sawtooth', 0.012, 200); };
  Sfx.extra.spyclimbSwingWhoosh = function () { this.noise(0.25, { f: 600, to: 1800, q: 1.2, vol: 0.03, a: 0.06 }); };
  Sfx.extra.spyclimbWindGust = function () { this.noise(1.4, { f: 400, to: 1400, q: 0.8, vol: 0.05, a: 0.5 }); };
  Sfx.extra.spyclimbWindowSlide = function () { this.noise(0.3, { f: 2000, q: 4, vol: 0.02 }); this.tone(300, 0.2, 'triangle', 0.02, 420); };
  Sfx.extra.spyclimbRugFlap = function () { for (let i = 0; i < 3; i++) this.noise(0.08, { f: 900, q: 1, vol: 0.03, delay: i * 0.12 }); };
  Sfx.extra.spyclimbPigeonFlutter = function () { for (let i = 0; i < 6; i++) this.noise(0.05, { f: 1400, q: 1.5, vol: 0.025, delay: i * 0.06 }); this.tone(700, 0.15, 'sine', 0.015, 500, 0.1); };
  Sfx.extra.spyclimbSearchlightHum = function () { this.tone(120, 0.5, 'sine', 0.012); };
  Sfx.extra.spyclimbHelicopterThud = function () { this.noise(0.12, { type: 'lowpass', f: 220, vol: 0.06 }); this.tone(60, 0.1, 'sine', 0.04, 45); };
  Sfx.extra.spyclimbSlipYelp = function (pitch) { this.tone(700 * pitch, 0.18, 'square', 0.03, 1100 * pitch); };
  Sfx.extra.spyclimbSlideSqueal = function () { this.tone(2200, 1.2, 'sine', 0.025, 900); this.tone(2600, 1.1, 'sine', 0.012, 1100, 0.05); };
  Sfx.extra.spyclimbShutterRattle = function () { for (let i = 0; i < 10; i++) this.noise(0.05, { type: 'highpass', f: 1800, vol: 0.03, delay: i * 0.06 }); this.tone(90, 0.6, 'sawtooth', 0.02, 70); };
  Sfx.extra.spyclimbGlassCut = function () { this.tone(2400 + Math.random() * 400, 0.12, 'sine', 0.015, 3200); };
  Sfx.extra.spyclimbGlassPop = function () { this.tone(900, 0.08, 'sine', 0.05, 2000); this.noise(0.2, { type: 'highpass', f: 4000, vol: 0.02 }); };
})();
