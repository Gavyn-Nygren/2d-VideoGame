/* Pip & Bo - Level 33-3 Blizzard Whiteout (team, World 33 Storm Chasers). */
'use strict';

/* ===== 33-3 Blizzard Whiteout (mode 'whiteout', team, scrolls right, Gavyn's pick) =====
   A mountain road in a total whiteout. Pip and Bo are roped together; one has the only flare, the other the ice pick.
   You only see inside the flare's glow; everything else is blowing white. Lightning (every 6-9 s) thins the snow for a
   moment, so you get a quick look ahead.
   World px: x grows to the right along the road (st.camX follows the middle of the pair), y is screen y (no vertical
   scroll). The ground is a line of points (st.pts); icy slopes go up 100 px, gentle slopes go down. The mode owns the
   tick, the camera and the picture (def.ownStep + ownHUD + noFalls); the engine grid is only spawns.
   THE ROPE: 170 px. At full stretch it holds both: neither can go further (a hero crouching or bracing is an anchor).
   FLARE HERO (G.mst.flare): HOLD the action to raise the flare: light 240 px instead of 150, but it burns twice as
     fast and the hero walks at half speed (and jumps short). A flare lasts 35 s; orange crates on the road hold fresh
     ones (walk into one). When it is out the light shrinks to a 62 px glow.
   ICE HERO (G.mst.ice): TAP the action to swing the pick (it turns round if the target is behind): ice walls break in
     3 hits, an icy slope needs 2 hits to chip steps into it (before that you slide back down), a snow drift (half
     speed) clears in 2, an icicle smashes in 1. HOLD the action on a snowed-in crate to dig it out.
   Both run, jump (▲) and crouch (hold ▼).
   CREVASSES (and holes in the lake ice): fall in and the rope catches you for 1 s: if the partner presses the action
     in that second they BRACE, and the fallen one climbs out (hold ▲ to climb faster) on the partner's side. If not,
     both slide back to the last cairn (a slip).
   GUSTS: a whistle and streaks 1.2 s before, then 1 s of wind that blows anyone not crouching back 120 px (maybe into
     a crevasse). A raised flare gutters in a gust (-4 s of burn).
   ICICLES hang from rock overhangs, shake when someone walks under them and fall 0.8 s later (bonk, a short stun):
     the leader trips them and the one behind gets hit, unless the ice hero smashes them first.
   THIN ICE (Frozen Lake): every 40 px of lake cracks when first stepped on and breaks 2.8 s later. Keep moving.
   THE YETI (The Pass, Summit Station): comes out of the snow at the edge of the light. It won't step into the light
     (it shields its eyes and blocks the road), but a hero outside the light gets a snowball (thrown back 150 px).
     Raise the flare: in the big light it runs off.
   COLD: a shared meter that drains slowly, faster standing still or in the dark. Both at a cairn (a little fire) warm
     up, and it becomes the checkpoint (a burnt-out flare is relit there, half full). Empty: both are brought back to the last cairn (a slip).
   STRETCHES (the jobs swap): The Trailhead, Frozen Lake, The Pass, Summit Station (ends at the weather hut: either
     presses the action at its switch and the beacon clears the whole sky).
   SNOW PROBES: 16 flagged poles (some up on rocks: jump). GOLD HELP (3 slips / bonks / snowballs in a stretch, only
   while both are playing): a gold lantern, 240 px of light that never burns out, for the rest of the stretch.
   MEDAL (MODES.whiteout.medals, js/medals.js): Gold <= 200 s with 12+ probes, Silver <= 350 s.
   MODES.whiteout.plan(st) says what each hero should do now, using only what has been lit or shown by lightning (the
   prompts, the HUD chips and the computer brain read it). Sounds are Sfx.extra.whiteout*. */
(() => {
  const K = STORMCHASE, TAU = Math.PI * 2, FONT = K.FONT;
  const S = {
    base: 440, g: 1700, jumpV: 560, runV: 170, acc: 1800, maxFall: 900, rope: 170, burn: 35, lightR: 150, raisedR: 240, outR: 62,
    lanternR: 240, catchT: 1.0, climbV: 130, climbAuto: 45, slipT: 1.4, swingT: 0.3, swingCd: 0.34, reach: 50, iceReach: 64,
    wallHits: 3, chipHits: 2, driftHits: 2, digT: 1.3, gustWarn: 1.2, gustBlow: 1.0, gustPush: 120, trip: 28, shakeT: 0.8,
    tileT: 2.8, tileW: 40, cold: 1 / 85, cairnR: 70, yetiV: 80, idleWait: 12, goldT: 200, silverT: 350, slopeW: 120, downW: 160, rise: 100,
  };

  /* ---------- a stretch (one room) ---------- */
  function room(st, L, k) {
    const def = L.def;
    st.k = k; st.flare = def.flare || 0; st.ice = 1 - st.flare; st.def = def; st.title = def.title || '';
    st.state = 'go'; st.endT = 0; st.party = false; st.cleared = false; st.lastRoom = false; st.beacon = 0;
    st.rc = { bad: 0 }; st.segStart = G.time; st.goldUsed = false; st.lantern = false;
    st.stats.flares++;
    build(st, def);
    st.check = 120; st.cold = 1; st.burn = S.burn; st.lightR = S.lightR; st.raised = false;
    st.gust = { ph: 'none', t: 0, next: def.gust ? def.gust[0] : 1e9 };
    place(st, st.check);
    st.camX = 0; st.stT = 0;
    K.fx(st); labels(st); mirror(st);
  }
  function labels(st) { const w = []; w[st.flare] = 'flare'; w[st.ice] = 'pick'; K.actLabels(w, 'flare'); }
  function build(st, def) {
    const F = def.feats.slice().sort((a, b) => a.x - b.x);
    st.len = def.len; st.endX = def.len - 60;
    // the ground line
    let y = S.base;
    const pts = [[-400, y]];
    st.slopes = [];
    for (const f of F) {
      if (f.k === 'up') { pts.push([f.x, y]); y -= S.rise; pts.push([f.x + S.slopeW, y]); st.slopes.push({ x0: f.x, x1: f.x + S.slopeW, yLo: y + S.rise, yHi: y, chips: 0, chipped: false, seen: false }); }
      if (f.k === 'down') { pts.push([f.x, y]); y += S.rise; pts.push([f.x + S.downW, y]); }
    }
    pts.push([def.len + 600, y]);
    st.pts = pts;
    const gy = x => groundY(st, x);
    st.gaps = F.filter(f => f.k === 'crev').map(f => ({ x0: f.x, x1: f.x + f.w, y: gy(f.x), seen: false }));
    st.walls = F.filter(f => f.k === 'wall').map(f => ({ x: f.x, w: 34, h: 120, y: gy(f.x), hits: 0, gone: false, seen: false, shake: 0 }));
    st.icicles = F.filter(f => f.k === 'icicle').map(f => ({ x: f.x, y0: gy(f.x) - 150, st: 'hang', t: 0, y: 0, vy: 0, seen: false }));
    st.drifts = F.filter(f => f.k === 'drift').map(f => ({ x0: f.x, x1: f.x + f.w, y: gy(f.x), hits: 0, gone: false, seen: false }));
    st.crates = F.filter(f => f.k === 'crate').map(f => ({ x: f.x, y: gy(f.x), buried: !!f.buried, dig: 0, taken: false, seen: false }));
    st.cairns = F.filter(f => f.k === 'cairn').map(f => ({ x: f.x, y: gy(f.x), lit: false }));
    st.rocks = [];
    st.probes = F.filter(f => f.k === 'probe').map(f => {
      const g0 = gy(f.x);
      if (f.high) { const r = { x0: f.x - 30, x1: f.x + 30, y: g0 - 58 }; st.rocks.push(r); return { x: f.x, y: r.y, got: false, rock: r, seen: false }; }
      return { x: f.x, y: g0, got: false, rock: null, seen: false };
    });
    const lake = F.find(f => f.k === 'lake');
    st.lake = lake ? { x0: lake.x, x1: lake.x1, y: gy(lake.x), tiles: [] } : null;
    if (st.lake) for (let x = lake.x; x < lake.x1; x += S.tileW) st.lake.tiles.push({ x0: x, x1: Math.min(lake.x1, x + S.tileW), t: -1, hole: false });
    st.yetis = F.filter(f => f.k === 'yeti').map(f => ({ at: f.x, st: 'wait', x: 0, t: 0, seen: false, back: 0 }));
    const hut = F.find(f => f.k === 'hut');
    st.hut = hut ? { x: hut.x, y: gy(hut.x) } : null;
    if (st.hut) st.endX = hut.x;
  }
  function groundY(st, x) {
    const p = st.pts;
    for (let i = 1; i < p.length; i++) if (x <= p[i][0]) { const a = p[i - 1], b = p[i]; return K.lerp(a[1], b[1], clamp((x - a[0]) / (b[0] - a[0]), 0, 1)); }
    return p[p.length - 1][1];
  }
  // a crevasse or a lake hole under x: { x0, x1 } (lake holes next to each other count as one), else null
  function gapAt(st, x) {
    for (const g of st.gaps) if (x > g.x0 + 3 && x < g.x1 - 3) return g;
    if (st.lake && x > st.lake.x0 && x < st.lake.x1) {
      const T = st.lake.tiles, i = Math.floor((x - st.lake.x0) / S.tileW), tl = T[i];
      if (tl && tl.hole) {
        let a = i, b = i;
        while (a > 0 && T[a - 1].hole) a--;
        while (b < T.length - 1 && T[b + 1].hole) b++;
        const g = { x0: T[a].x0, x1: T[b].x1, lake: true };
        if (x > g.x0 + 3 && x < g.x1 - 3) return g;
      }
    }
    return null;
  }
  // the floor under a hero's feet: the ground (unless a gap) or the top of a rock (one-way, from above)
  function floorAt(st, x, y) {
    let f = gapAt(st, x) ? null : groundY(st, x);
    for (const r of st.rocks) if (x > r.x0 - 4 && x < r.x1 + 4 && y <= r.y + 8 && (f === null || r.y < f)) f = r.y;
    return f;
  }
  function place(st, x) {
    st.h = [0, 1].map(id => {
      const hx = x + (id === st.flare ? 30 : 0);
      return { id, x: hx, px: hx, y: groundY(st, hx), vx: 0, vy: 0, face: 1, grounded: true, st: 'free', t: 0, sq: 0, stun: 0, pushT: 0, swing: 0, swingCd: 0, dig: false };
    });
    st.catch = null; st.slipT = 0;
  }

  /* ---------- the tick ---------- */
  function tick(st, dt) {
    if (!st.pts) return;
    K.track(st);
    st.waiting = st.state === 'go' && K.idle(st, dt, S.idleWait);
    const live = G.introT <= 0 && !st.waiting && st.state === 'go';
    st.clock += dt;
    if (st.shake > 0) st.shake = Math.max(0, st.shake - dt * 2);
    if (!st.waiting && G.introT <= 0) {
      const was = st.bolt ? st.bolt.t : 9;
      K.bolts(st, dt, [6, 9]);
      if (st.bolt.t < was) reveal(st);
    }
    st.reveal = Math.max(0, (st.reveal || 0) - dt / 1.6);
    if (live) {
      st.stT += dt;
      if (st.slipT > 0) slipStep(st, dt);
      else {
        flare(st, dt);
        gusts(st, dt);
        for (const h of st.h) { if (st.slipT > 0) break; h.px = h.x; hero(st, h, dt); }
        if (st.slipT <= 0) { tether(st); catchStep(st, dt); }
        if (st.slipT <= 0) { icicles(st, dt); yetis(st, dt); lake(st, dt); crates(st); probes(st); cairns(st, dt); }
        seen(st);
        if (st.slipT <= 0 && !st.catch && !st.hut && st.h.every(h => h.x >= st.endX && h.st !== 'fall' && h.st !== 'hang')) finish(st);
      }
    } else if (st.state === 'end') endStep(st, dt);
    for (const p of G.players) { p.pendingJump = false; p.pendingAct = false; }
    cam(st, dt);
    K.tickFx(st, dt);
    mirror(st);
  }
  // the flare: burn, light radius
  function flare(st, dt) {
    const out = st.burn <= 0 && !st.lantern;
    if (!st.lantern && st.burn > 0) {
      st.burn -= dt * (st.raised ? 2 : 1);
      if (st.burn <= 0) { st.burn = 0; Sfx.play('whiteoutFizz'); K.msg(st, 'The flare is out! Find an orange crate for a new one.', '#ffd0c8', 3); }
    }
    let want = st.lantern ? (st.raised ? 300 : S.lanternR) : out ? S.outR : st.raised ? S.raisedR : S.lightR;
    if (st.gust.ph === 'blow' && st.raised && !st.lantern) want *= 0.6 + 0.2 * Math.sin(st.clock * 40);
    st.lightR = approach(st.lightR, want, 420 * dt);
  }
  // the light's centre (the flare in the flare hero's hand)
  function lightC(st) {
    const F = st.h[st.flare];
    return { x: F.x + F.face * 9, y: F.y - (st.raised ? 62 : 40) };
  }
  const isLit = (st, x, y) => { const c = lightC(st); return Math.hypot(x - c.x, (y - c.y) * 0.7) < st.lightR; };
  // what the heroes can see now (lit), or saw in a lightning flash: remembered
  function seen(st) {
    const c = lightC(st), r = st.lightR + 10, see = x => Math.abs(x - c.x) < r;
    for (const g of st.gaps) if (!g.seen && (see(g.x0) || see(g.x1))) g.seen = true;
    for (const o of st.walls) if (!o.seen && see(o.x - o.w / 2)) o.seen = true;
    for (const o of st.slopes) if (!o.seen && see(o.x0)) o.seen = true;
    for (const o of st.icicles) if (!o.seen && see(o.x)) o.seen = true;
    for (const o of st.drifts) if (!o.seen && see(o.x0)) o.seen = true;
    for (const o of st.crates) if (!o.seen && see(o.x)) o.seen = true;
    for (const o of st.probes) if (!o.seen && see(o.x)) o.seen = true;
    for (const y of st.yetis) if (y.st !== 'wait' && y.st !== 'gone') y.seen = Math.abs(y.x - c.x) < st.lightR + 120 || st.reveal > 0.5;
  }
  function reveal(st) {
    st.reveal = 1;
    const x0 = st.camX - 40, x1 = st.camX + W + 40, on = x => x > x0 && x < x1;
    for (const L of [st.gaps, st.drifts, st.slopes]) for (const o of L) if (on(o.x0)) o.seen = true;
    for (const L of [st.walls, st.icicles, st.crates, st.probes]) for (const o of L) if (on(o.x)) o.seen = true;
  }
  function gusts(st, dt) {
    const g = st.gust;
    if (g.ph === 'none') {
      if (st.stT >= g.next) { g.ph = 'warn'; g.t = 0; g.gutter = false; Sfx.play('whiteoutWhistle'); K.msg(st, 'GUST! Hold ' + K.key(0, 'down') + ' / ' + K.key(1, 'down') + ' to crouch!', '#ffffff', 2); }
    } else if (g.ph === 'warn') {
      g.t += dt;
      if (g.t >= S.gustWarn) { g.ph = 'blow'; g.t = 0; Sfx.play('stormWind', 1); st.shake = 0.5; }
    } else {
      g.t += dt;
      for (const h of st.h) {
        if (h.st === 'crouch' || h.st === 'brace' || h.st === 'fall' || h.st === 'hang') continue;
        h.x -= S.gustPush * dt;
        if (!st.hinted['gust' + h.id]) K.hintOnce(st, 'gust' + h.id, h.id, 'Crouch in a gust: hold ' + K.key(h.id, 'down'));
      }
      if (st.raised && !st.lantern && !g.gutter) { g.gutter = true; st.burn = Math.max(0, st.burn - 4); const F = st.h[st.flare]; K.pop(st, F.x, F.y - 80, 'The flare gutters!', '#ffd0a0', 16); }
      if (g.t >= S.gustBlow) { g.ph = 'none'; g.next = st.stT + st.def.gust[1] + (Math.random() - 0.5) * 3; }
    }
  }
  function hero(st, h, dt) {
    const p = G.players[h.id], i = p.input, isF = h.id === st.flare, jump = p.pendingJump;
    h.t += dt;
    if (h.sq > 0) h.sq = Math.max(0, h.sq - dt * 4);
    if (h.stun > 0) h.stun -= dt;
    if (h.pushT > 0) h.pushT -= dt;
    if (h.swing > 0) h.swing -= dt;
    if (h.swingCd > 0) h.swingCd -= dt;
    if (h.st === 'fall' || h.st === 'hang') { fallStep(st, h, p, dt); return; }
    // brace: a press while the partner hangs on the rope
    if (st.catch && st.catch.id !== h.id && h.st !== 'brace' && (p.pendingAct || i.act) && h.stun <= 0) {
      h.st = 'brace'; st.h[st.catch.id].st = 'hang'; st.catch.braced = true; h.vx = 0;
      Sfx.play('whiteoutCatch'); K.pop(st, h.x, h.y - 60, 'BRACED!', '#d9ffd0', 20);
      if (isF) st.raised = false;
      return;
    }
    if (h.st === 'brace') { h.vx = 0; return; }
    const crouch = i.down && h.grounded && h.stun <= 0;
    h.st = crouch ? 'crouch' : 'free';
    if (isF) st.raised = !!i.act && h.stun <= 0 && !crouch;
    let busy = crouch;
    if (!isF) {
      // (next to a snowed-in crate the action digs instead of swinging)
      const c = st.crates.find(c => c.buried && Math.abs(c.x - h.x) < 26);
      if (p.pendingAct && h.swingCd <= 0 && h.stun <= 0 && !crouch && !c) swing(st, h);
      h.dig = false;
      if (c && i.act && h.grounded && h.stun <= 0 && !crouch) {
        h.dig = true; busy = true; c.dig += dt;
        if (Math.random() < dt * 8) K.part(st, c.x + (Math.random() - 0.5) * 30, c.y - 10, (Math.random() - 0.5) * 160, -120 - Math.random() * 120, 0.6, '#ffffff', 3, 600, 'dot');
        if (c.dig >= S.digT) { c.buried = false; c.seen = true; Sfx.play('whiteoutCrate'); K.pop(st, c.x, c.y - 50, 'Dug out a crate!', '#ffd0a0', 18); }
      }
    }
    // the beacon switch at the weather hut
    if (st.hut && p.pendingAct && Math.abs(h.x - (st.hut.x + 34)) < 50 && h.grounded) {
      const o = st.h[1 - h.id];
      if (Math.abs(o.x - st.hut.x) < 110 && o.st !== 'fall' && o.st !== 'hang') finish(st);
      else K.hintOnce(st, 'hutWait' + h.id, h.id, 'Wait for ' + NAMES[o.id] + ' at the hut!');
    }
    let want = busy || h.stun > 0 ? 0 : (i.right ? 1 : 0) - (i.left ? 1 : 0);
    if (want) h.face = want;
    const inDrift = st.drifts.some(d => !d.gone && h.x > d.x0 && h.x < d.x1);
    const sp = S.runV * (isF && st.raised ? 0.5 : 1) * (inDrift && h.grounded ? 0.5 : 1);
    if (h.pushT <= 0) h.vx = approach(h.vx, want * sp, (h.grounded ? S.acc : S.acc * 0.6) * dt);
    if (jump && h.grounded && !crouch && h.stun <= 0) { h.vy = -S.jumpV; h.grounded = false; h.sq = 0.5; Sfx.play('whiteoutJump', h.id); }
    h.x += h.vx * dt;
    // an icy slope that has no steps: you slide back down
    const sl = st.slopes.find(s => !s.chipped && h.x > s.x0 + 2 && h.x < s.x1 - 2);
    if (sl && h.grounded) {
      h.vx = -230; h.pushT = 0.1;
      K.hintOnce(st, 'slope' + st.k + h.id, h.id, isF ? 'Too icy! ' + NAMES[st.ice] + ' can chip steps with the pick' : 'Too icy! Swing the pick at the slope: ' + K.key(h.id, 'act'));
    }
    // ice walls
    for (const w of st.walls) {
      if (w.gone || h.y < w.y - w.h + 4) continue;
      const lim = w.w / 2 + 11, d = h.x - w.x;
      if (Math.abs(d) < lim) { h.x = w.x + (h.px <= w.x ? -lim : lim); h.vx = 0; K.hintOnce(st, 'wall' + st.k + h.id, h.id, isF ? 'An ice wall! ' + NAMES[st.ice] + ' has the pick' : 'An ice wall! Tap ' + K.key(h.id, 'act') + ' to swing the pick'); }
    }
    // the yeti stands in the road
    for (const y of st.yetis) if ((y.st === 'come' || y.st === 'shield') && h.x > y.x - 34) { h.x = y.x - 34; h.vx = Math.min(h.vx, 0); }
    h.x = clamp(h.x, 20, st.len + 200);
    // below the edge of a crevasse: its walls hold you in it
    if (h.inGap) h.x = clamp(h.x, h.inGap.x0 + 4, h.inGap.x1 - 4);
    // up and down
    const gy = floorAt(st, h.x, h.y);
    if (h.grounded) {
      if (gy === null || gy > h.y + 14) h.grounded = false;
      else { h.y = gy; h.vy = 0; h.inGap = null; }
    }
    if (!h.grounded) {
      h.vy = Math.min(S.maxFall, h.vy + S.g * dt);
      const ny = h.y + h.vy * dt;
      if (h.vy >= 0 && gy !== null && h.y <= gy + 14 && ny >= gy) { h.y = gy; h.vy = 0; h.grounded = true; h.sq = 0.6; h.inGap = null; }
      else h.y = ny;
      const gp = gapAt(st, h.x);
      if (gp && h.y > groundY(st, h.x) + 1) h.inGap = { x0: gp.x0, x1: gp.x1 };
      if (h.inGap && h.y > groundY(st, h.x) + 24) startFall(st, h, h.inGap);
    }
  }
  // the pick: the nearest target in reach, in front (or behind: turn round)
  function swing(st, h) {
    h.swing = S.swingT; h.swingCd = S.swingCd;
    Sfx.play('whiteoutSwing');
    let best = null;
    const consider = (o, kind, x, reach) => { const d = Math.abs(x - h.x); if (d < reach && (!best || d < best.d)) best = { o, kind, d, x }; };
    for (const w of st.walls) if (!w.gone) consider(w, 'wall', w.x + (h.x < w.x ? -w.w / 2 : w.w / 2), S.reach);
    for (const s of st.slopes) if (!s.chipped) consider(s, 'slope', s.x0, S.reach);
    for (const d of st.drifts) if (!d.gone) consider(d, 'drift', h.x > d.x0 && h.x < d.x1 ? h.x : h.x < d.x0 ? d.x0 : d.x1, S.reach);
    for (const ic of st.icicles) if (ic.st === 'hang' || ic.st === 'shake') consider(ic, 'icicle', ic.x, S.iceReach);
    if (!best) { K.part(st, h.x + h.face * 22, h.y - 10, h.face * 80, -60, 0.4, '#ffffff', 3, 300, 'dot'); return; }
    if (best.x !== h.x) h.face = Math.sign(best.x - h.x);
    const o = best.o, px = best.x, py = best.kind === 'icicle' ? o.y0 + 20 : h.y - 20;
    for (let k = 0; k < 7; k++) K.part(st, px, py, (Math.random() - 0.5) * 200, -80 - Math.random() * 120, 0.5, k % 2 ? '#bfe6f4' : '#ffffff', 3, 600, 'dot');
    if (best.kind === 'wall') {
      o.hits++; o.shake = 0.2; Sfx.play('whiteoutChip');
      if (o.hits >= S.wallHits) { o.gone = true; Sfx.play('whiteoutShatter'); st.shake = 0.5; K.pop(st, o.x, o.y - 130, 'SMASH!', '#ffffff', 24); for (let k = 0; k < 18; k++) K.part(st, o.x, o.y - Math.random() * o.h, (Math.random() - 0.5) * 380, -100 - Math.random() * 260, 1, k % 2 ? '#bfe6f4' : '#e8f6ff', 5, 900, 'dot'); st.stats.smashed++; }
      else K.pop(st, o.x, o.y - 130, 'Crack! ' + (S.wallHits - o.hits) + ' more', '#e8f6ff', 16);
    } else if (best.kind === 'slope') {
      o.chips++; Sfx.play('whiteoutChip');
      if (o.chips >= S.chipHits) { o.chipped = true; Sfx.play('whiteoutShatter'); K.pop(st, o.x0 + 50, o.yLo - 80, 'Steps!', '#ffffff', 20); st.stats.smashed++; }
      else K.pop(st, o.x0, o.yLo - 60, 'Chip!', '#e8f6ff', 16);
    } else if (best.kind === 'drift') {
      o.hits++; Sfx.play('whiteoutThump');
      if (o.hits >= S.driftHits) { o.gone = true; K.pop(st, (o.x0 + o.x1) / 2, o.y - 60, 'Cleared!', '#ffffff', 18); for (let k = 0; k < 14; k++) K.part(st, K.lerp(o.x0, o.x1, Math.random()), o.y - 10, (Math.random() - 0.5) * 260, -120 - Math.random() * 160, 0.8, '#ffffff', 4, 700, 'dot'); }
      else K.pop(st, px, o.y - 50, 'Whump!', '#ffffff', 16);
    } else {
      o.st = 'gone'; Sfx.play('whiteoutShatter'); K.pop(st, o.x, o.y0 - 10, 'Smash!', '#e8f6ff', 18); st.stats.smashed++;
      for (let k = 0; k < 10; k++) K.part(st, o.x, o.y0 + 20, (Math.random() - 0.5) * 220, -40 - Math.random() * 100, 0.7, '#bfe6f4', 3, 900, 'dot');
    }
  }
  function startFall(st, h, gp) {
    h.st = 'fall'; h.vx = 0; h.gap = { x0: gp.x0, x1: gp.x1 }; h.edgeY = groundY(st, (gp.x0 + gp.x1) / 2);
    if (st.h[st.flare] === h) st.raised = false;
    const o = st.h[1 - h.id];
    Sfx.play('whiteoutFall'); K.pop(st, h.x, h.edgeY - 40, 'Whoa!', '#ffd0c8', 20);
    if (o.st === 'fall' || o.st === 'hang' || st.catch) { slip(st, 'Both fell in!'); return; }
    st.catch = { id: h.id, t: S.catchT, braced: false };
    K.hint(st, o.id, 'BRACE! Press ' + K.key(o.id, 'act') + '!', 1.2);
  }
  function fallStep(st, h, p, dt) {
    const i = p.input;
    if (h.st === 'fall') {
      // the rope goes tight 70 px down
      h.vy = Math.min(S.maxFall, h.vy + S.g * dt); h.y = Math.min(h.y + h.vy * dt, h.edgeY + 70);
      h.x = clamp(h.x, h.gap.x0 + 10, h.gap.x1 - 10);
      return;
    }
    // hanging: climb back up (faster holding ▲)
    const up = i.up || i.jump || p.pendingJump;
    h.y -= (up ? S.climbV : S.climbAuto) * dt;
    h.x = clamp(h.x, h.gap.x0 + 10, h.gap.x1 - 10);
    if (h.y <= h.edgeY + 2) {
      const o = st.h[1 - h.id], dir = Math.sign(o.x - h.x) || -1;
      let x = h.x, n = 0;
      while (gapAt(st, x) && n++ < 200) x += dir * 4;
      x += dir * 30;
      h.x = x; h.y = groundY(st, x); h.vy = 0; h.grounded = true; h.st = 'free'; h.sq = 1; h.face = -dir; h.inGap = null;
      o.st = 'free'; st.catch = null; st.stats.catches++;
      Sfx.play('whiteoutUp'); K.pop(st, h.x, h.y - 50, 'Phew!', '#ffffff', 18);
    }
  }
  function catchStep(st, dt) {
    const c = st.catch;
    if (!c || c.braced) return;
    c.t -= dt;
    // the partner is dragged toward the edge a little
    if (c.t <= 0) slip(st, 'Nobody braced!');
  }
  // the rope: at full stretch neither goes further (an anchored hero holds; else the one pulling away gives way)
  function tether(st) {
    const a = st.h[0], b = st.h[1];
    if ([a, b].some(h => h.st === 'fall' || h.st === 'hang' || h.inGap)) { st.tautNow = false; return; }
    const d = b.x - a.x, ad = Math.abs(d), s = Math.sign(d) || 1;
    st.tautNow = ad >= S.rope - 3;
    if (ad <= S.rope) return;
    const ex = ad - S.rope, anc = h => h.st === 'crouch' || h.st === 'brace' || h.stun > 0;
    const mA = -(a.x - a.px) * s, mB = (b.x - b.px) * s;
    let ka;
    if (anc(a) && !anc(b)) ka = 0; else if (anc(b) && !anc(a)) ka = 1;
    else if (mA > 0 && mB <= 0) ka = 1; else if (mB > 0 && mA <= 0) ka = 0;
    else ka = mA + mB > 0 ? mA / (mA + mB) : 0.5;
    a.x += s * ex * ka; b.x -= s * ex * (1 - ka);
    if (ka > 0) a.vx = s > 0 ? Math.max(a.vx, 0) : Math.min(a.vx, 0);
    if (ka < 1) b.vx = s > 0 ? Math.min(b.vx, 0) : Math.max(b.vx, 0);
  }
  function slip(st, why) {
    if (st.slipT > 0) return;
    st.slipT = S.slipT; st.stats.slips++; st.rc.bad++;
    Sfx.play('whiteoutSlip');
    K.msg(st, why + ' Back to the last cairn.', '#ffd0c8', 2.6);
    st.catch = null; st.raised = false;
    for (const h of st.h) { h.st = 'slide'; h.vx = 0; }
    gold(st);
  }
  function slipStep(st, dt) {
    st.slipT -= dt;
    if (st.slipT > 0) return;
    st.slipT = 0;
    place(st, st.check);
    st.cold = Math.max(st.cold, 0.75);
    if (st.lake) for (const tl of st.lake.tiles) { tl.t = -1; tl.hole = false; }
    for (const y of st.yetis) if (y.st !== 'gone') { y.st = 'wait'; y.t = 0; }
    for (const ic of st.icicles) if (ic.st === 'shake' || ic.st === 'fall') ic.st = 'hang';
    st.gust.ph = 'none'; st.gust.next = Math.max(st.gust.next, st.stT + 4);
    K.pop(st, st.check + 15, groundY(st, st.check) - 70, 'Try again!', '#ffffff', 22);
  }
  function gold(st) {
    if (st.rc.bad >= 3 && !st.goldUsed && K.both(st)) {
      st.goldUsed = true; st.lantern = true;
      K.goldHelp(st, 'Gold lantern! Big light that never burns out, for the rest of this stretch');
    }
  }
  function icicles(st, dt) {
    for (const ic of st.icicles) {
      if (ic.st === 'hang') {
        if (st.h.some(h => h.st !== 'fall' && h.st !== 'hang' && Math.abs(h.x - ic.x) < S.trip)) { ic.st = 'shake'; ic.t = 0; Sfx.play('whiteoutCreak'); }
      } else if (ic.st === 'shake') {
        ic.t += dt;
        if (ic.t >= S.shakeT) { ic.st = 'fall'; ic.y = ic.y0; ic.vy = 0; }
      } else if (ic.st === 'fall') {
        ic.vy += 1500 * dt; ic.y += ic.vy * dt;
        const tip = ic.y + 38;
        for (const h of st.h) {
          if (h.st === 'fall' || h.st === 'hang' || Math.abs(h.x - ic.x) > 16 || tip < h.y - 30 || ic.y > h.y) continue;
          ic.st = 'gone'; h.stun = 0.9; h.vx = 0; st.stats.bonks++; st.rc.bad++;
          Sfx.play('whiteoutBonk'); K.pop(st, h.x, h.y - 60, 'BONK!', '#ffd0c8', 22);
          K.hintOnce(st, 'icicle' + h.id, h.id, h.id === st.ice ? 'Smash icicles first: ' + K.key(h.id, 'act') + ' under them' : 'Wait for ' + NAMES[st.ice] + ' to smash the icicles!');
          gold(st);
        }
        if (ic.st === 'fall' && tip >= groundY(st, ic.x)) { ic.st = 'gone'; Sfx.play('whiteoutShatter'); for (let k = 0; k < 10; k++) K.part(st, ic.x, groundY(st, ic.x) - 4, (Math.random() - 0.5) * 220, -60 - Math.random() * 120, 0.7, '#bfe6f4', 3, 900, 'dot'); }
        if (ic.st === 'gone') for (let k = 0; k < 6; k++) K.part(st, ic.x, Math.min(ic.y + 30, groundY(st, ic.x) - 4), (Math.random() - 0.5) * 200, -50 - Math.random() * 100, 0.6, '#e8f6ff', 3, 900, 'dot');
      }
    }
  }
  function yetis(st, dt) {
    const c = lightC(st), front = Math.max(st.h[0].x, st.h[1].x);
    for (const y of st.yetis) {
      y.t += dt;
      if (y.st === 'wait') {
        if (front > y.at - 300) { y.st = 'come'; y.t = 0; y.x = front + Math.max(st.lightR, 150) + 220; Sfx.play('whiteoutGrowl'); K.msg(st, 'Something big is moving out there in the snow...', '#e8eef4', 3); st.shake = 0.3; }
        continue;
      }
      if (y.st === 'gone') continue;
      if (y.st === 'flee') { y.x += 240 * dt; if (y.t > 2) y.st = 'gone'; continue; }
      const dl = y.x - c.x;
      if (st.lightR >= 200 && dl < st.lightR + 40) {
        y.st = 'flee'; y.t = 0; st.stats.yetis++; Sfx.play('whiteoutRoar'); st.shake = 0.6;
        K.pop(st, y.x, groundY(st, y.x) - 150, 'RAAWR! It ran off!', '#ffffff', 22);
        continue;
      }
      if (y.back > 0) { y.back -= dt; y.x += 70 * dt; continue; }
      // it won't step into the light: it shields its eyes at the edge
      const edge = c.x + st.lightR + 8;
      if (y.x - 80 * dt <= edge && st.lightR > S.outR + 4) { y.st = 'shield'; y.x = Math.max(y.x, edge); }
      else { y.st = 'come'; y.x -= S.yetiV * dt; }
      if (y.st === 'shield' && y.t > 1.5 && !st.hinted['yeti' + st.k]) K.hintOnce(st, 'yeti' + st.k, st.flare, 'Raise the flare! HOLD ' + K.key(st.flare, 'act'));
      // a hero outside the light gets a snowball
      for (const h of st.h) {
        if (h.st === 'fall' || h.st === 'hang' || Math.abs(h.x - y.x) > 40) continue;
        if (isLit(st, h.x, h.y - 13) && st.lightR > S.outR + 4) continue;
        h.vx = -420; h.pushT = 0.36; h.stun = 0.6; h.vy = -200; h.grounded = false; st.stats.snowballs++; st.rc.bad++;
        Sfx.play('whiteoutSnowball'); K.pop(st, h.x, h.y - 60, 'SNOWBALL!', '#ffffff', 22);
        for (let k = 0; k < 12; k++) K.part(st, h.x, h.y - 20, (Math.random() - 0.5) * 300, -100 - Math.random() * 150, 0.7, '#ffffff', 4, 700, 'dot');
        y.back = 1.2; gold(st);
      }
    }
  }
  function lake(st, dt) {
    if (!st.lake) return;
    for (const tl of st.lake.tiles) {
      if (tl.hole) continue;
      if (tl.t < 0) { if (st.h.some(h => h.grounded && h.x >= tl.x0 && h.x < tl.x1)) { tl.t = 0; if (Math.random() < 0.5) Sfx.play('stormCrack'); } continue; }
      if (st.catch) continue;
      tl.t += dt;
      if (tl.t >= S.tileT) {
        tl.hole = true; Sfx.play('whiteoutBreak');
        for (let k = 0; k < 6; k++) K.part(st, K.lerp(tl.x0, tl.x1, Math.random()), st.lake.y, (Math.random() - 0.5) * 120, -60 - Math.random() * 80, 0.6, '#bfe6f4', 3, 700, 'dot');
        if (!st.hinted.lake) K.msg(st, 'The ice is breaking behind you: keep moving!', '#bfe6f4', 2.4), st.hinted.lake = true;
      }
    }
  }
  function crates(st) {
    const F = st.h[st.flare];
    for (const c of st.crates) {
      if (c.taken || c.buried || F.st === 'fall' || F.st === 'hang') continue;
      if (Math.abs(F.x - c.x) < 22 && Math.abs(F.y - c.y) < 30 && (st.burn < S.burn - 3 || st.lantern)) {
        if (st.lantern) continue;
        c.taken = true; st.burn = S.burn; st.stats.flares++;
        Sfx.play('whiteoutFlare'); K.pop(st, c.x, c.y - 60, 'Fresh flare!', '#ffb070', 20);
        for (let k = 0; k < 10; k++) K.part(st, c.x, c.y - 30, (Math.random() - 0.5) * 200, -100 - Math.random() * 140, 0.7, k % 2 ? '#ffb070' : '#ffe08a', 3, 400, 'star');
      }
    }
  }
  function probes(st) {
    for (const h of st.h) {
      if (h.st === 'fall' || h.st === 'hang' || h.st === 'slide') continue;
      for (const q of st.probes) {
        if (q.got || Math.abs(q.x - h.x) > 20 || Math.abs(q.y - h.y) > 30) continue;
        q.got = true; st.probeN++;
        Sfx.play('stormPop', 1 + (st.probeN % 5) * 0.06); K.spark(st, q.x, q.y - 40, 6, ['#ff7a5a', '#ffffff']);
        K.pop(st, q.x, q.y - 70, 'Snow probe!', '#ffffff', 16);
      }
    }
  }
  function cairns(st, dt) {
    let warm = false;
    for (const c of st.cairns) {
      const near = st.h.every(h => Math.abs(h.x - c.x) < S.cairnR && h.st !== 'fall' && h.st !== 'hang');
      if (near) {
        if (!c.lit) { c.lit = true; Sfx.play('whiteoutCairn'); K.pop(st, c.x, c.y - 70, 'Cairn! Warm up here', '#ffd0a0', 18); }
        if (st.check < c.x) st.check = c.x;
        warm = true;
        // a flare that has burnt out is relit at the cairn's fire (half a flare), so a stretch is never dark for good
        if (st.burn <= 0 && !st.lantern) {
          st.burn = S.burn * 0.5; st.stats.flares++; Sfx.play('whiteoutFlare');
          K.pop(st, c.x, c.y - 96, 'Flare relit at the fire!', '#ffb070', 18);
        }
      }
    }
    st.warm = warm;
    if (warm) { st.cold = Math.min(1, st.cold + 0.45 * dt); return; }
    const still = st.h.every(h => Math.abs(h.vx) < 15), dark = st.burn <= 0 && !st.lantern;
    st.cold -= S.cold * (still ? 1.5 : 1) * (dark ? 1.6 : 1) * dt;
    if (st.cold <= 0) { st.cold = 0; st.stats.colds++; slip(st, 'Too cold! Both start to shiver.'); }
  }
  function finish(st) {
    if (st.state !== 'go') return;
    st.state = 'end'; st.endT = 0;
    const last = !(G.level.def.rooms && G.level.def.roomIndex < G.level.def.roomCount - 1);
    st.lastRoom = last; st.stats.roomT[st.k] = G.time - st.segStart;
    Sfx.play('stormCheer');
    for (const h of st.h) { h.st = 'free'; h.vx = 0; }
    st.raised = false;
    if (st.hut) { st.beacon = 0.001; Sfx.play('whiteoutBeacon'); K.pop(st, st.hut.x, st.hut.y - 180, 'BEACON ON! The storm is clearing!', '#ffffff', 26); }
    else K.pop(st, st.endX, groundY(st, st.endX) - 120, (st.def.done || 'Through!') + ' Swap jobs!', '#ffffff', 26);
  }
  function endStep(st, dt) {
    st.endT += dt;
    if (st.beacon) st.beacon = Math.min(1, st.beacon + dt / 1.6);
    if (st.lastRoom) {
      if (st.endT > 0.8 && !st.party) { st.party = true; Sfx.play('whiteoutFanfare'); K.confetti(st, st.hut ? st.hut.x : st.endX, 200, 50); }
      if (st.endT > 3.2 && !st.cleared) { st.cleared = true; G.level.goal = { x: W / 2, y: 200 }; levelClear(); }
    } else if (st.endT > 2.2) nextRoom();
  }
  function cam(st, dt) {
    const mid = (st.h[0].x + st.h[1].x) / 2, want = clamp(mid - W * 0.42, 0, st.len + 200 - W);
    st.camX = st.camX === undefined ? want : K.lerp(st.camX, want, Math.min(1, dt * 5));
  }
  function mirror(st) { for (const h of st.h) K.place(h.id, h.x - st.camX, h.y); }

  /* ---------- what to do next ----------
     plan(st): { stage, flare: { x, act, jump, down, up, why }, ice: { ... }, obj } using only what was seen. */
  function nextThing(st, rear, front) {
    let best = null;
    const add = (kind, o, x) => { if (!best || x < best.x) best = { kind, o, x }; };
    for (const w of st.walls) if (!w.gone && w.seen && w.x + w.w / 2 > rear - 10) add('wall', w, w.x - w.w / 2);
    for (const s of st.slopes) if (!s.chipped && s.seen && s.x1 > rear) add('slope', s, s.x0);
    for (const d of st.drifts) if (!d.gone && d.seen && d.x1 > rear) add('drift', d, d.x0);
    for (const ic of st.icicles) if ((ic.st === 'hang' || ic.st === 'shake') && ic.seen && ic.x > rear - 20) add('icicle', ic, ic.x - 50);
    for (const c of st.crates) if (c.buried && c.seen && c.x > rear - 30) add('dig', c, c.x - 30);
    for (const g of st.gaps) if (g.seen && g.x1 > rear - 6 && g.x0 < front + 400) add('gap', g, g.x0);
    // holes in the lake ice ahead of the one behind (after a gust)
    if (st.lake) {
      const T = st.lake.tiles;
      for (let i2 = 0; i2 < T.length; i2++) {
        if (!T[i2].hole || T[i2].x1 <= rear - 6) continue;
        let b = i2; while (b < T.length - 1 && T[b + 1].hole) b++;
        if (T[b].x1 > rear - 6 && T[i2].x0 < front + 200) add('gap', { x0: T[i2].x0, x1: T[b].x1, lake: true }, T[i2].x0);
        i2 = b;
      }
    }
    for (const q of st.probes) if (!q.got && q.rock && q.seen && q.x > rear - 60 && q.x < front + 160) add('probe', q, q.x - 40);
    return best;
  }
  // a crevasse or lake hole somewhere between two x positions
  function between(st, a, b) {
    const lo = Math.min(a, b), hi = Math.max(a, b);
    for (let x = lo + 6; x < hi - 6; x += 8) if (gapAt(st, x)) return true;
    return false;
  }
  function plan(st) {
    const F = st.h ? st.h[st.flare] : null, I = st.h ? st.h[st.ice] : null;
    const out = { stage: 'wait', flare: { x: F ? F.x : 0, why: 'wait' }, ice: { x: I ? I.x : 0, why: 'wait' }, obj: null };
    if (!st.pts || st.state !== 'go' || st.slipT > 0 || !F) return out;
    const role = id => (id === st.flare ? 'flare' : 'ice');
    if (st.catch) {
      const f = st.h[st.catch.id], o = st.h[1 - st.catch.id];
      out.stage = 'catch';
      out[role(f.id)] = { x: f.x, up: true, why: 'climb' };
      out[role(o.id)] = { x: o.x, act: true, why: o.st === 'brace' ? 'braced' : 'brace' };
      return out;
    }
    const gu = st.gust;
    if (gu.ph === 'blow' || (gu.ph === 'warn' && gu.t > S.gustWarn - 0.4)) {
      out.stage = 'gust';
      out.flare = { x: F.x, down: true, why: 'gust' }; out.ice = { x: I.x, down: true, why: 'gust' };
      return out;
    }
    const rear = Math.min(F.x, I.x), front = Math.max(F.x, I.x), mid = (F.x + I.x) / 2, c = lightC(st);
    // the yeti: raise the flare; the ice hero comes into the light
    const ye = st.yetis.find(y => (y.st === 'come' || y.st === 'shield') && y.seen);
    if (ye) {
      out.stage = 'yeti'; out.obj = ye;
      out.flare = { x: F.x, act: true, why: 'yeti' };
      out.ice = { x: between(st, I.x, F.x) ? I.x : Math.min(I.x, F.x - 24), why: 'light' };
      return out;
    }
    // warm up at a cairn (when cold, or when passing one and not warm)
    const cn = st.cairns.find(k => Math.abs(k.x - mid) < 280);
    if (cn && (st.cold < 0.5 || (st.warm && st.cold < 0.95))) {
      out.stage = 'warm'; out.obj = cn;
      out.flare = { x: cn.x + 18, why: 'warm' }; out.ice = { x: cn.x - 18, why: 'warm' };
      return out;
    }
    // a fresh flare when it is low (a crate nearby that has been seen)
    if (!st.lantern && st.burn < S.burn * 0.3) {
      const cr = st.crates.filter(k => !k.taken && !k.buried && k.seen && Math.abs(k.x - F.x) < 500).sort((a, b) => Math.abs(a.x - F.x) - Math.abs(b.x - F.x))[0];
      if (cr) { out.stage = 'crate'; out.obj = cr; out.flare = { x: cr.x, why: 'crate' }; out.ice = { x: clamp(cr.x - 30, F.x - 120, F.x + 60), why: 'follow' }; return out; }
    }
    // the end (the weather hut)
    const T = nextThing(st, rear, front);
    if (!T) {
      if (st.hut) {
        const hx = st.hut.x;
        const both = st.h.every(h => Math.abs(h.x - hx) < 100);
        out.stage = 'hut';
        out.flare = { x: hx + 34, act: both && Math.abs(F.x - (hx + 34)) < 20 ? 'tap' : false, why: both ? 'beacon' : 'go' };
        out.ice = { x: hx - 10, why: 'go' };
        return out;
      }
      out.stage = 'walk';
      const goal = st.endX + 80;
      out.flare = { x: Math.min(goal, I.x + 110), why: 'go' };
      out.ice = { x: Math.min(goal, F.x - 30, c.x + st.lightR - 40), why: 'follow' };
      return out;
    }
    out.obj = T.o; out.stage = T.kind;
    const ahead = x => Math.min(x, c.x + Math.max(st.lightR, 120) - 30);
    if (T.kind === 'wall') {
      const fx = T.o.x - T.o.w / 2;
      out.ice = { x: ahead(fx - 30), act: Math.abs(I.x - (fx - 30)) < 10 ? 'tap' : false, why: 'pick' };
      out.flare = { x: fx - 85, why: 'light' };
    } else if (T.kind === 'slope') {
      out.ice = { x: ahead(T.o.x0 - 28), act: Math.abs(I.x - (T.o.x0 - 28)) < 10 ? 'tap' : false, why: 'pick' };
      out.flare = { x: T.o.x0 - 85, why: 'light' };
    } else if (T.kind === 'drift') {
      out.ice = { x: ahead(T.o.x0 - 26), act: Math.abs(I.x - (T.o.x0 - 26)) < 10 ? 'tap' : false, why: 'pick' };
      out.flare = { x: T.o.x0 - 85, why: 'light' };
    } else if (T.kind === 'icicle') {
      out.ice = { x: T.o.x - 46, act: Math.abs(I.x - (T.o.x - 46)) < 10 ? 'tap' : false, why: 'pick' };
      out.flare = { x: T.o.x - 115, why: 'light' };
    } else if (T.kind === 'dig') {
      out.ice = { x: T.o.x, act: Math.abs(I.x - T.o.x) < 14, why: 'dig' };
      out.flare = { x: T.o.x - 60, why: 'light' };
    } else if (T.kind === 'probe') {
      // whoever is nearer jumps up for it (the ice hero if it's a tie)
      const q = T.o, who = Math.abs(F.x - q.x) + 20 < Math.abs(I.x - q.x) ? F : I, other = who === F ? I : F;
      const r = role(who.id), at = Math.abs(who.x - q.x) < 16;
      out[r] = { x: q.x, jump: at && who.grounded && who.y > q.y + 4, why: 'probe' };
      out[role(other.id)] = { x: other.x < q.x - 70 ? q.x - 60 : other.x, why: other === F ? 'light' : 'wait' };
      if (r === 'ice') out.ice.x = ahead(q.x);
    } else if (T.kind === 'gap') {
      // one at a time: the one in front goes first; the other waits back from the edge
      const g = T.o, land = g.x1 + 34, take = g.x0 - 14;
      const across = h => h.x > g.x1;
      const first = across(F) || across(I) ? null : F.x >= I.x ? F : I;
      for (const h of [F, I]) {
        const r = role(h.id);
        if (across(h)) { out[r] = { x: land + (h === F ? 20 : 0), why: 'wait' }; continue; }
        // (the first one waits until the other is close behind: a rope pulled tight in mid-jump drags you into the crevasse)
        const go = first ? h === first && (h === F ? I : F).x > g.x0 - 100 : true;
        if (!go) { out[r] = { x: g.x0 - 40, why: 'wait' }; continue; }
        // run at it and jump at the edge (the flare low: a raised flare means half speed and a short jump)
        // too close to the edge to get up speed: back up for a run-up first
        // (not when the partner is already across: a short jump is caught and the rope brings you up on their side)
        if (h.grounded && h.x > g.x0 - 34 && h.vx < 120 && !across(h === F ? I : F)) { out[r] = { x: g.x0 - 56, why: 'runup' }; continue; }
        out[r] = { x: land + 40, jump: h.grounded && h.x > take - 4 && h.x < g.x0 && h.vx > 140, why: 'jump' };
      }
      // see further across the field while still back from the edge
      if (!across(F) && g.x0 - F.x > 170 && !st.lantern && st.burn > S.burn * 0.3) out.flare.act = true;
      if (out.ice.why === 'jump' && !across(F) && F.x < g.x0 - 60) out.ice.x = Math.min(out.ice.x, c.x + st.lightR + 120);
    }
    return out;
  }

  /* ---------- drawing ---------- */
  function draw(st) {
    const t = st.clock, cx = st.camX, sh = st.shake * 4 * Math.sin(t * 50), fl = K.flashA(st);
    K.sky(cx, t, { mood: 'snow', flash: fl, bolt: st.bolt, dark: st.beacon ? 0 : 0.15 });
    mountains(cx, t);
    ctx.save(); ctx.translate(-cx + sh, 0);
    drawGround(st, t);
    drawThings(st, t);
    ctx.restore();
  }
  function mountains(cx, t) {
    for (let layer = 0; layer < 2; layer++) {
      const par = [0.1, 0.25][layer], col = ['#b8c4d2', '#9eacbc'][layer], base = [300, 360][layer], hgt = [140, 110][layer];
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.moveTo(0, H);
      const span = 180, off = (cx * par) % span;
      for (let x = -off - span; x <= W + span; x += span / 2) {
        const k = Math.round((x + off) / (span / 2)) + Math.floor(cx * par / (span / 2)) + layer * 17;
        ctx.lineTo(x, base - (k % 2 ? hgt * (0.5 + K.hash(k) * 0.5) : hgt * 0.2 * K.hash(k + 3)));
      }
      ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
      // the shaded east face of each peak
      ctx.fillStyle = layer ? 'rgba(70,90,120,0.16)' : 'rgba(70,90,120,0.12)';
      {
        const pts = [];
        for (let x = -off - span; x <= W + span; x += span / 2) { const k = Math.round((x + off) / (span / 2)) + Math.floor(cx * par / (span / 2)) + layer * 17; pts.push([x, base - (k % 2 ? hgt * (0.5 + K.hash(k) * 0.5) : hgt * 0.2 * K.hash(k + 3)), k % 2]); }
        for (let i = 0; i < pts.length - 1; i++) if (pts[i][2]) { const [px, py] = pts[i], [nx, ny] = pts[i + 1]; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(nx, ny); ctx.lineTo(nx, base + 40); ctx.lineTo(px + 10, base + 40); ctx.closePath(); ctx.fill(); }
      }
      // snow caps
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      for (let x = -off - span; x <= W + span; x += span) { const k = Math.round((x + off) / span) + Math.floor(cx * par / span) + layer * 5; const px = x + span / 2, py = base - hgt * (0.5 + K.hash(k * 2 + 1 + layer * 17) * 0.5); ctx.beginPath(); ctx.moveTo(px - 30, py + 34); ctx.lineTo(px, py + 4); ctx.lineTo(px + 30, py + 34); ctx.closePath(); ctx.fill(); }
    }
    // a nearer band of snow-laden pines, half lost in the blizzard
    const par = 0.45, step = 46, off = cx * par, i0 = Math.floor(off / step) - 1;
    for (let i = i0; i < i0 + W / step + 3; i++) {
      if (K.hash(i * 11 + 4) < 0.35) continue;
      const x = i * step - off + K.hash(i * 3) * 20, h = 46 + K.hash(i * 5) * 40, by = 392 + K.hash(i * 7) * 14;
      ctx.fillStyle = 'rgba(96,116,140,0.7)';
      ctx.fillRect(x - 2, by - 8, 4, 10);
      for (let k = 0; k < 3; k++) { const w2 = (18 - k * 5) * h / 60, ty = by - 6 - k * h * 0.28; ctx.beginPath(); ctx.moveTo(x - w2, ty); ctx.lineTo(x, ty - h * 0.42); ctx.lineTo(x + w2, ty); ctx.closePath(); ctx.fill(); }
      ctx.fillStyle = 'rgba(250,252,255,0.75)';
      for (let k = 0; k < 3; k++) { const w2 = (18 - k * 5) * h / 60, ty = by - 6 - k * h * 0.28; ctx.beginPath(); ctx.moveTo(x - w2 * 0.8, ty - 2); ctx.lineTo(x, ty - h * 0.42); ctx.lineTo(x + w2 * 0.3, ty - h * 0.2); ctx.closePath(); ctx.fill(); }
    }
    const hz = ctx.createLinearGradient(0, 300, 0, 420); hz.addColorStop(0, 'rgba(230,236,244,0)'); hz.addColorStop(1, 'rgba(230,236,244,0.55)');
    ctx.fillStyle = hz; ctx.fillRect(0, 300, W, 120);
  }
  function drawGround(st, t) {
    const x0 = st.camX - 60, x1 = st.camX + W + 60;
    // the snowy ground with the gaps cut out
    const g = ctx.createLinearGradient(0, 220, 0, H);
    g.addColorStop(0, '#f4f8fc'); g.addColorStop(0.5, '#dfe8f2'); g.addColorStop(1, '#b8c8da');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(x0, H + 10);
    for (let x = x0; x <= x1; x += 10) ctx.lineTo(x, groundY(st, x) + Math.sin(x * 0.07) * 0.8);
    ctx.lineTo(x1, H + 10); ctx.closePath(); ctx.fill();
    // a crisp lip and sparkle
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.beginPath();
    for (let x = x0; x <= x1; x += 10) { const y = groundY(st, x); if (x === x0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
    ctx.stroke();
    ctx.fillStyle = 'rgba(160,190,220,0.5)';
    for (let x = Math.floor(x0 / 37) * 37; x < x1; x += 37) { const y = groundY(st, x); ctx.fillRect(x + K.hash(x) * 20, y + 10 + K.hash(x + 1) * 40, 10 + K.hash(x + 2) * 18, 2); }
    // wind-carved drifts with blue shadows on their lee side, a few stones and dry grass poking through, glints
    for (let x = Math.floor(x0 / 150) * 150; x < x1; x += 150) {
      const dx = x + K.hash(x + 5) * 80, y = groundY(st, dx); if (!(y < H)) continue;
      const w2 = 40 + K.hash(x + 6) * 40, dy = y + 30 + K.hash(x + 7) * 50;
      ctx.fillStyle = 'rgba(150,175,205,0.35)'; ctx.beginPath(); ctx.ellipse(dx + w2 * 0.25, dy + 4, w2, 7, 0, 0, Math.PI); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.ellipse(dx, dy, w2, 8, 0, Math.PI, 0); ctx.fill();
      if (K.hash(x + 8) < 0.45) {
        const sx = dx + w2 + 20, sy = groundY(st, sx) + 18;
        ctx.fillStyle = '#7a8290'; ctx.beginPath(); ctx.ellipse(sx, sy, 9, 6, 0, Math.PI, 0); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(sx - 1, sy - 5, 7, 2.4, 0, Math.PI, 0); ctx.fill();
        ctx.strokeStyle = 'rgba(150,130,90,0.7)'; ctx.lineWidth = 1.2; ctx.beginPath(); for (let k = 0; k < 4; k++) { ctx.moveTo(sx + 14 + k * 3, sy); ctx.lineTo(sx + 12 + k * 4, sy - 8 - k % 2 * 4); } ctx.stroke();
      }
    }
    ctx.fillStyle = '#ffffff';
    for (let x = Math.floor(x0 / 23) * 23; x < x1; x += 23) { if (Math.sin(t * 3 + x) < 0.8) continue; const y = groundY(st, x) + 6 + K.hash(x + 9) * 60; if (y < H) K.star(x, y, 3, 1, 0), ctx.fill(); }
    // the lake: grey-blue ice with cracks and holes
    if (st.lake && st.lake.x1 > x0 && st.lake.x0 < x1) {
      const L = st.lake;
      ctx.fillStyle = '#a8c4d8'; ctx.fillRect(L.x0, L.y - 2, L.x1 - L.x0, 10);
      const gi = ctx.createLinearGradient(0, L.y, 0, L.y + 70); gi.addColorStop(0, 'rgba(120,160,190,0.9)'); gi.addColorStop(1, 'rgba(120,160,190,0)');
      ctx.fillStyle = gi; ctx.fillRect(L.x0, L.y + 8, L.x1 - L.x0, 70);
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; for (let x = L.x0 + 20; x < L.x1; x += 90) ctx.fillRect(x, L.y, 40, 2);
      for (const tl of L.tiles) {
        if (tl.x1 < x0 || tl.x0 > x1) continue;
        if (tl.hole) {
          ctx.fillStyle = '#1e3a52'; ctx.fillRect(tl.x0, L.y - 2, tl.x1 - tl.x0, H - L.y + 4);
          ctx.strokeStyle = 'rgba(190,230,250,0.5)'; ctx.lineWidth = 1.5; const u = (t * 0.8 + tl.x0 * 0.01) % 1; ctx.beginPath(); ctx.ellipse((tl.x0 + tl.x1) / 2, L.y + 10, 6 + u * 14, 2 + u * 3, 0, 0, TAU); ctx.stroke();
          ctx.fillStyle = '#e8f4fc'; ctx.fillRect(tl.x0 - 2, L.y - 3, 3, 8); ctx.fillRect(tl.x1 - 1, L.y - 3, 3, 8);
        } else if (tl.t >= 0) {
          const u = tl.t / S.tileT;
          ctx.strokeStyle = 'rgba(40,70,100,' + (0.3 + u * 0.6) + ')'; ctx.lineWidth = 1 + u;
          ctx.beginPath(); const mx = (tl.x0 + tl.x1) / 2;
          ctx.moveTo(mx, L.y); ctx.lineTo(mx - 8 * u - 4, L.y + 4); ctx.lineTo(mx - 16 * u, L.y + 8);
          ctx.moveTo(mx, L.y); ctx.lineTo(mx + 10 * u + 3, L.y + 3); ctx.lineTo(mx + 18 * u, L.y + 7);
          if (u > 0.5) { ctx.moveTo(mx - 4, L.y); ctx.lineTo(mx - 2, L.y + 9); }
          ctx.stroke();
          if (u > 0.7) { ctx.fillStyle = 'rgba(30,58,82,' + (u - 0.7) * 2 + ')'; ctx.fillRect(tl.x0 + 6, L.y, tl.x1 - tl.x0 - 12, 3); }
        }
      }
    }
    // crevasses: deep blue cuts with icy lips
    for (const gp of st.gaps) {
      if (gp.x1 < x0 || gp.x0 > x1) continue;
      const y = gp.y, gg = ctx.createLinearGradient(0, y, 0, H);
      gg.addColorStop(0, '#5a86b0'); gg.addColorStop(0.4, '#1e3a5a'); gg.addColorStop(1, '#0a1626');
      ctx.fillStyle = gg;
      ctx.beginPath(); ctx.moveTo(gp.x0 - 2, y);
      for (let k = 0; k <= 6; k++) ctx.lineTo(gp.x0 + 2 + k * 3 + K.hash(gp.x0 + k) * 4, y + k * (H - y) / 6);
      for (let k = 6; k >= 0; k--) ctx.lineTo(gp.x1 - 2 - k * 3 - K.hash(gp.x1 + k) * 4, y + k * (H - y) / 6);
      ctx.lineTo(gp.x1 + 2, y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffffff';
      for (const ex of [gp.x0, gp.x1]) { ctx.beginPath(); ctx.ellipse(ex, y + 1, 12, 4, 0, 0, TAU); ctx.fill(); }
      ctx.fillStyle = '#cfeaf8'; for (let k = 0; k < 4; k++) { const ix = gp.x0 + 6 + k * 5; ctx.beginPath(); ctx.moveTo(ix, y + 2); ctx.lineTo(ix + 2, y + 10 + K.hash(k + gp.x0) * 10); ctx.lineTo(ix + 4, y + 2); ctx.fill(); }
    }
    // icy slopes (glassy until chipped into steps)
    for (const s of st.slopes) {
      if (s.x1 < x0 || s.x0 > x1) continue;
      if (!s.chipped) {
        const gs = ctx.createLinearGradient(s.x0, s.yLo, s.x1, s.yHi);
        gs.addColorStop(0, 'rgba(150,200,230,0.95)'); gs.addColorStop(1, 'rgba(200,236,252,0.95)');
        ctx.fillStyle = gs; ctx.beginPath(); ctx.moveTo(s.x0 - 4, s.yLo + 2); ctx.lineTo(s.x1 + 4, s.yHi + 2); ctx.lineTo(s.x1 + 4, s.yHi + 20); ctx.lineTo(s.x0 + 10, s.yLo + 14); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(s.x0 + 14, s.yLo - 8); ctx.lineTo(s.x0 + 50, s.yLo - 38); ctx.stroke();
        for (let k = 0; k < s.chips; k++) { ctx.fillStyle = '#8ab0cc'; ctx.fillRect(s.x0 + 6 + k * 14, s.yLo - 10 - k * 12, 10, 3); }
      } else {
        ctx.fillStyle = '#c8dcea';
        for (let k = 0; k < 6; k++) { const xx = s.x0 + k * 20, yy = K.lerp(s.yLo, s.yHi, (k + 1) / 6); ctx.fillRect(xx, yy, 20, 4); ctx.fillStyle = '#9ab8d0'; ctx.fillRect(xx, yy + 4, 20, 2); ctx.fillStyle = '#c8dcea'; }
      }
    }
  }
  function drawThings(st, t) {
    const x0 = st.camX - 80, x1 = st.camX + W + 80, on = x => x > x0 && x < x1;
    // rocks with probes on them, and rock overhangs with icicles
    for (const r of st.rocks) if (on(r.x0)) {
      const gy = groundY(st, (r.x0 + r.x1) / 2);
      ctx.fillStyle = '#7a8290'; ctx.beginPath(); ctx.moveTo(r.x0 - 6, gy); ctx.lineTo(r.x0, r.y + 6); ctx.quadraticCurveTo((r.x0 + r.x1) / 2, r.y - 4, r.x1, r.y + 6); ctx.lineTo(r.x1 + 6, gy); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#5e6672'; ctx.beginPath(); ctx.moveTo(r.x1 - 10, r.y + 10); ctx.lineTo(r.x1 + 6, gy); ctx.lineTo(r.x1 - 18, gy); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse((r.x0 + r.x1) / 2, r.y + 1, (r.x1 - r.x0) / 2 + 4, 6, 0, 0, TAU); ctx.fill();
    }
    for (const ic of st.icicles) if (on(ic.x)) {
      // the overhang: a rock shelf jutting out over the road
      const oy = ic.y0;
      ctx.fillStyle = '#6a7280'; ctx.beginPath(); ctx.moveTo(ic.x - 90, oy - 50); ctx.lineTo(ic.x + 60, oy - 40); ctx.lineTo(ic.x + 40, oy); ctx.lineTo(ic.x - 70, oy + 4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(ic.x - 92, oy - 50); ctx.quadraticCurveTo(ic.x - 10, oy - 64, ic.x + 62, oy - 40); ctx.lineTo(ic.x - 92, oy - 44); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#4a525e'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(ic.x - 90, oy - 50); ctx.lineTo(ic.x - 140, groundY(st, ic.x - 140)); ctx.stroke();
      // little icicles along the edge, and the big one
      ctx.fillStyle = '#cfeaf8';
      for (let k = 0; k < 5; k++) { const ix = ic.x - 60 + k * 22; if (Math.abs(ix - ic.x) < 12) continue; ctx.beginPath(); ctx.moveTo(ix - 3, oy + 1); ctx.lineTo(ix, oy + 10 + K.hash(k) * 8); ctx.lineTo(ix + 3, oy + 1); ctx.fill(); }
      if (ic.st !== 'gone') {
        const y = ic.st === 'fall' ? ic.y : oy, wob = ic.st === 'shake' ? Math.sin(t * 60) * 2 : 0;
        ctx.save(); ctx.translate(ic.x + wob, y);
        const gi = ctx.createLinearGradient(-7, 0, 7, 0); gi.addColorStop(0, '#9ad0ec'); gi.addColorStop(0.5, '#f0faff'); gi.addColorStop(1, '#7ab4d0');
        ctx.fillStyle = gi; ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(0, 40); ctx.lineTo(8, 0); ctx.closePath(); ctx.fill();
        ctx.restore();
        if (ic.st === 'shake') { ctx.fillStyle = '#ffffff'; for (let k = 0; k < 3; k++) { const u = (t * 3 + k / 3) % 1; circle(ic.x - 10 + k * 10, oy + 6 + u * 60, 2); ctx.fill(); } }
      }
    }
    // snow drifts
    for (const d of st.drifts) if (on(d.x0) || on(d.x1)) {
      if (d.gone) { ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.ellipse(d.x0 - 8, d.y, 14, 6, 0, Math.PI, TAU); ctx.ellipse(d.x1 + 8, d.y, 14, 6, 0, Math.PI, TAU); ctx.fill(); continue; }
      const hgt = 34 - d.hits * 10;
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(d.x0 - 16, d.y + 2);
      ctx.bezierCurveTo(d.x0 + 10, d.y - hgt, d.x1 - 30, d.y - hgt - 8, d.x1 + 16, d.y + 2); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(150,180,210,0.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(d.x0 + 10, d.y - hgt * 0.5); ctx.quadraticCurveTo((d.x0 + d.x1) / 2, d.y - hgt - 2, d.x1 - 10, d.y - hgt * 0.4); ctx.stroke();
      // the wind lifts snow off the crest
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; for (let k = 0; k < 4; k++) { const u = (t * 1.5 + k / 4) % 1; circle(d.x1 - 20 - u * 80, d.y - hgt - 4 - u * 20, 2); ctx.fill(); }
    }
    // ice walls
    for (const w of st.walls) if (!w.gone && on(w.x)) {
      const wx = w.x - w.w / 2 + (w.shake > 0 ? Math.sin(t * 80) * 2 : 0), top = w.y - w.h;
      if (w.shake > 0) w.shake -= 1 / 120;
      const gw = ctx.createLinearGradient(wx, 0, wx + w.w, 0); gw.addColorStop(0, '#8ec8e6'); gw.addColorStop(0.4, '#d8f2ff'); gw.addColorStop(1, '#6aa8cc');
      ctx.fillStyle = gw; ctx.beginPath(); ctx.moveTo(wx - 4, w.y); ctx.lineTo(wx, top + 10); ctx.lineTo(wx + 10, top); ctx.lineTo(wx + w.w - 6, top + 6); ctx.lineTo(wx + w.w + 4, w.y); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(wx + 8, top + 14); ctx.lineTo(wx + 10, w.y - 20); ctx.stroke();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(wx + w.w / 2, top + 2, w.w / 2 + 4, 6, 0.1, 0, TAU); ctx.fill();
      if (w.hits) { ctx.strokeStyle = 'rgba(30,70,110,0.75)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(wx, w.y - 60); ctx.lineTo(wx + 14, w.y - 54); ctx.lineTo(wx + 10, w.y - 40); if (w.hits > 1) { ctx.moveTo(wx, w.y - 30); ctx.lineTo(wx + 18, w.y - 70); ctx.lineTo(wx + 26, w.y - 90); ctx.moveTo(wx + 14, w.y - 54); ctx.lineTo(wx + 28, w.y - 50); } ctx.stroke(); }
    }
    // cairns: stacked stones and a little fire once lit
    for (const c of st.cairns) if (on(c.x)) {
      const y = c.y;
      ctx.fillStyle = '#6a7280';
      [[0, -6, 16, 7], [-2, -18, 12, 6], [1, -28, 9, 5], [0, -36, 6, 4]].forEach(([dx, dy, rx, ry]) => { ctx.beginPath(); ctx.ellipse(c.x + 22 + dx, y + dy, rx, ry, 0, 0, TAU); ctx.fill(); });
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(c.x + 22, y - 40, 6, 3, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#5e3e20'; ctx.fillRect(c.x - 14, y - 4, 22, 4);
      if (c.lit) {
        for (let k = 0; k < 3; k++) { const f = Math.sin(t * 14 + k * 2) * 3; ctx.fillStyle = ['#ff7a2a', '#ffb04a', '#ffe08a'][k]; ctx.beginPath(); ctx.moveTo(c.x - 12 + k * 3, y - 4); ctx.quadraticCurveTo(c.x - 3 + f, y - 30 + k * 7, c.x + 6 - k * 3, y - 4); ctx.fill(); }
      } else { ctx.fillStyle = '#4a3a2a'; ctx.fillRect(c.x - 10, y - 8, 14, 4); }
    }
    // supply crates (snowed in until dug out)
    for (const c of st.crates) if (on(c.x) && !c.taken) {
      const y = c.y;
      if (c.buried) {
        ctx.fillStyle = '#ff7a2a'; ctx.save(); ctx.translate(c.x + 8, y - 16); ctx.rotate(-0.25); ctx.fillRect(-10, -8, 20, 16); ctx.restore();
        const u = c.dig / S.digT;
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(c.x, y, 34, 26 * (1 - u * 0.6), 0, Math.PI, TAU); ctx.fill();
        if (u > 0) { ctx.strokeStyle = C.gold; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(c.x, y - 50, 10, -Math.PI / 2, -Math.PI / 2 + u * TAU); ctx.stroke(); }
        continue;
      }
      ctx.fillStyle = '#ff7a2a'; rr(c.x - 18, y - 28, 36, 28, 3); ctx.fill();
      ctx.strokeStyle = '#a84a10'; ctx.lineWidth = 2; rr(c.x - 18, y - 28, 36, 28, 3); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(c.x - 18, y - 14); ctx.lineTo(c.x + 18, y - 14); ctx.stroke();
      ctx.fillStyle = '#ffffff'; ctx.fillRect(c.x - 3, y - 25, 6, 9); ctx.fillStyle = '#ffe08a'; circle(c.x, y - 25, 3); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(c.x, y - 28, 20, 4, 0, Math.PI, TAU); ctx.fill();
    }
    // snow probes: striped poles with an orange flag
    for (const q of st.probes) if (!q.got && on(q.x)) {
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x, q.y - 54); ctx.stroke();
      ctx.strokeStyle = '#e8322a'; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x, q.y - 54); ctx.stroke(); ctx.setLineDash([]);
      const wv = Math.sin(t * 8 + q.x) * 4;
      ctx.fillStyle = '#ff8a3a'; ctx.beginPath(); ctx.moveTo(q.x, q.y - 54); ctx.quadraticCurveTo(q.x - 10, q.y - 50 + wv * 0.3, q.x - 20, q.y - 46 + wv); ctx.lineTo(q.x, q.y - 40); ctx.closePath(); ctx.fill();
    }
    // the end sign or the weather hut
    if (st.hut) drawHut(st, t);
    else if (on(st.endX)) {
      const x = st.endX + 30, y = groundY(st, x);
      ctx.fillStyle = '#5e3e20'; ctx.fillRect(x - 3, y - 70, 6, 70);
      ctx.fillStyle = '#9a6a3a'; ctx.beginPath(); ctx.moveTo(x - 30, y - 70); ctx.lineTo(x + 30, y - 70); ctx.lineTo(x + 42, y - 58); ctx.lineTo(x + 30, y - 46); ctx.lineTo(x - 30, y - 46); ctx.closePath(); ctx.fill();
      text('→', x + 4, y - 58, 16, '#ffffff', 'center');
      ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 32, y - 74, 64, 5);
    }
    // the yeti (hidden in the snow unless lit)
    for (const y of st.yetis) if (y.st !== 'wait' && y.st !== 'gone' && on(y.x)) drawYeti(st, y, t);
  }
  function drawHut(st, t) {
    const x = st.hut.x, y = st.hut.y;
    ctx.fillStyle = '#7a4e2a'; ctx.fillRect(x - 60, y - 80, 100, 80);
    ctx.strokeStyle = '#5e3e20'; ctx.lineWidth = 2; for (let k = 1; k < 5; k++) { ctx.beginPath(); ctx.moveTo(x - 60, y - k * 16); ctx.lineTo(x + 40, y - k * 16); ctx.stroke(); }
    ctx.fillStyle = '#3a4250'; ctx.beginPath(); ctx.moveTo(x - 72, y - 78); ctx.lineTo(x - 10, y - 120); ctx.lineTo(x + 52, y - 78); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(x - 74, y - 76); ctx.lineTo(x - 10, y - 122); ctx.lineTo(x + 54, y - 76); ctx.lineTo(x + 40, y - 80); ctx.lineTo(x - 10, y - 112); ctx.lineTo(x - 60, y - 80); ctx.closePath(); ctx.fill();
    ctx.fillStyle = st.beacon ? '#ffe08a' : '#3a5068'; ctx.fillRect(x - 40, y - 60, 22, 18);
    ctx.fillStyle = '#5e3e20'; ctx.fillRect(x - 6, y - 50, 22, 50);
    // the mast with a spinning wind cup gauge and the beacon lamp
    ctx.strokeStyle = '#8a8c94'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + 30, y - 80); ctx.lineTo(x + 30, y - 170); ctx.stroke();
    const sp = t * (st.beacon ? 3 : 12);
    for (let k = 0; k < 3; k++) { const a = sp + k * TAU / 3; ctx.beginPath(); ctx.moveTo(x + 30, y - 160); ctx.lineTo(x + 30 + Math.cos(a) * 14, y - 160 + Math.sin(a) * 4); ctx.stroke(); ctx.fillStyle = '#c8ccd4'; circle(x + 30 + Math.cos(a) * 14, y - 160 + Math.sin(a) * 4, 3); ctx.fill(); }
    const on = st.beacon > 0;
    ctx.fillStyle = on ? '#ffe08a' : '#8a3a2a'; circle(x + 30, y - 176, 8); ctx.fill();
    if (on) { ctx.save(); ctx.globalAlpha = 0.5 * st.beacon; ctx.fillStyle = '#fff4c0'; const a = t * 3; ctx.beginPath(); ctx.moveTo(x + 30, y - 176); ctx.lineTo(x + 30 + Math.cos(a) * 600, y - 176 + Math.sin(a) * 120 - 60); ctx.lineTo(x + 30 + Math.cos(a) * 600, y - 176 + Math.sin(a) * 120 + 60); ctx.closePath(); ctx.fill(); ctx.restore(); }
    // the switch box
    ctx.fillStyle = '#c8322a'; rr(x + 26, y - 50, 16, 22, 3); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 32, on ? y - 48 : y - 40, 4, 8);
  }
  function drawYeti(st, y, t) {
    const gy = groundY(st, y.x), sh = y.st === 'shield', fl = y.st === 'flee', b = Math.sin(t * 6) * 2, dir = fl ? 1 : -1;
    ctx.save(); ctx.translate(y.x, gy);
    ctx.fillStyle = '#e8eef4'; ctx.strokeStyle = '#a8b4c4'; ctx.lineWidth = 2;
    // a big shaggy body
    ctx.beginPath(); ctx.moveTo(-34, 0); ctx.quadraticCurveTo(-46, -80 + b, -24, -120); ctx.quadraticCurveTo(0, -140 + b, 24, -120); ctx.quadraticCurveTo(46, -80 + b, 34, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.moveTo(-30 + k * 12, -10 - (k % 2) * 8); ctx.lineTo(-26 + k * 12, 2); ctx.stroke(); }
    // the face
    ctx.fillStyle = '#7a8a9c'; ctx.beginPath(); ctx.ellipse(dir * 6, -100, 16, 13, 0, 0, TAU); ctx.fill();
    // arms: up over the eyes when shielding
    ctx.strokeStyle = '#e8eef4'; ctx.lineWidth = 14; ctx.lineCap = 'round';
    if (sh) { ctx.beginPath(); ctx.moveTo(-26, -80); ctx.lineTo(-8, -104); ctx.moveTo(26, -80); ctx.lineTo(10, -106); ctx.stroke(); }
    else { const sw = Math.sin(t * 5) * 0.4; ctx.beginPath(); ctx.moveTo(-28, -80); ctx.lineTo(-44 + sw * 10, -30); ctx.moveTo(28, -80); ctx.lineTo(44 - sw * 10, -30); ctx.stroke(); }
    ctx.lineCap = 'butt';
    ctx.restore();
  }
  // the whiteout: a fog layer with soft holes for the light (half size, drawn over the world)
  let fog = null, fogX = null;
  function drawFog(st, t) {
    const sc = 0.5, w = Math.round(W * sc), h = Math.round(H * sc);
    if (!fog) { try { fog = document.createElement('canvas'); fog.width = w; fog.height = h; fogX = fog.getContext('2d'); } catch (e) { fog = null; } }
    if (!fog || !fogX) return;
    const c = fogX, a = (0.97 - st.reveal * 0.5) * (1 - (st.beacon || 0));
    c.globalCompositeOperation = 'source-over'; c.clearRect(0, 0, w, h);
    { const fg = c.createLinearGradient(0, 0, 0, h); fg.addColorStop(0, 'rgba(178,190,206,' + a + ')'); fg.addColorStop(1, 'rgba(206,214,226,' + a + ')'); c.fillStyle = fg; c.fillRect(0, 0, w, h); }
    // moving swirls in the fog
    c.fillStyle = 'rgba(255,255,255,' + 0.25 * a + ')';
    for (let k = 0; k < 9; k++) { const x = ((K.hash(k) * (w + 200) - t * (40 + k * 6) * sc) % (w + 200) + w + 200) % (w + 200) - 100, y = K.hash(k + 7) * h; c.beginPath(); c.ellipse(x, y, 60 + K.hash(k + 3) * 50, 18 + K.hash(k + 5) * 12, 0, 0, TAU); c.fill(); }
    c.globalCompositeOperation = 'destination-out';
    const hole = (x, y, r, al, inner) => {
      const sx = (x - st.camX) * sc, sy = y * sc, sr = r * sc;
      if (sx < -sr || sx > w + sr) return;
      const g = c.createRadialGradient(sx, sy, sr * inner, sx, sy, sr);
      g.addColorStop(0, 'rgba(0,0,0,' + al + ')'); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g; c.beginPath(); c.arc(sx, sy, sr, 0, TAU); c.fill();
    };
    const L = lightC(st), fl = st.burn > 0 || st.lantern ? 1 + Math.sin(t * 23) * 0.02 + Math.sin(t * 9) * 0.02 : 1;
    hole(L.x, L.y, st.lightR * 1.12 * fl, 1, 0.62);
    for (const k of st.cairns) if (k.lit) hole(k.x - 4, k.y - 20, 90, 0.7, 0.2);
    if (st.hut && st.beacon) hole(st.hut.x + 30, st.hut.y - 176, 600 * st.beacon, 1, 0.5);
    c.globalCompositeOperation = 'source-over';
    ctx.drawImage(fog, 0, 0, W, H);
    // a warm glow round the flare
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const sx = L.x - st.camX, warmA = st.lantern ? 0.16 : st.burn > 0 ? 0.13 : 0.05, gl = ctx.createRadialGradient(sx, L.y, 4, sx, L.y, st.lightR);
    gl.addColorStop(0, st.lantern ? 'rgba(255,214,90,' + warmA * 2 + ')' : 'rgba(255,140,60,' + warmA * 2 + ')'); gl.addColorStop(1, 'rgba(255,120,40,0)');
    ctx.fillStyle = gl; ctx.fillRect(sx - st.lightR, L.y - st.lightR, st.lightR * 2, st.lightR * 2);
    ctx.restore();
  }
  function drawHero(st, h, t) {
    if (h.st === 'slide' && st.slipT > 0) { ctx.globalAlpha = clamp(st.slipT / S.slipT, 0, 1); }
    const isF = h.id === st.flare;
    let sy = 1 - h.sq * 0.16, rot = 0;
    if (h.st === 'crouch') sy = 0.66;
    if (h.st === 'brace') { sy = 0.8; rot = -Math.sign(st.h[1 - h.id].x - h.x) * 0.3; }
    if (h.st === 'hang' || h.st === 'fall') rot = Math.sin(t * 5) * 0.08;
    else if (!h.grounded) rot = h.face * clamp(h.vy / 2000, -0.15, 0.15);
    if (h.stun > 0) rot += Math.sin(t * 30) * 0.08;
    const L = lightC(st), lit = isLit(st, h.x, h.y - 13) || st.beacon ? 1 : 0.35;
    let arms = null, armA = 0.4;
    if (isF && st.raised) arms = 'up';
    else if (isF) { arms = 'bat'; armA = -0.6; }
    else if (h.swing > 0) { arms = 'bat'; armA = -1.6 + (1 - h.swing / S.swingT) * 2.4; }
    else if (h.dig) { arms = 'bat'; armA = 0.6 + Math.sin(t * 20) * 0.5; }
    else if (h.st === 'hang') arms = 'up';
    else { arms = 'bat'; armA = 0.9; }
    K.chaser(h.id, h.x, h.y, { face: h.face, rot, sy, sx: 2 - sy, vy: h.grounded ? 0 : h.vy, stun: h.stun > 0, arms, armA, hood: true, lit });
    // what's in the hand
    if (isF) {
      const fx = L.x, fy = L.y;
      ctx.strokeStyle = '#c8322a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx - h.face * 2, fy + 12); ctx.stroke();
      if (st.burn > 0 && !st.lantern) {
        ctx.fillStyle = '#ffe8c0'; circle(fx, fy - 2, 3.5); ctx.fill();
        for (let k = 0; k < 3; k++) { const u = (t * 5 + k / 3) % 1; ctx.fillStyle = 'rgba(255,' + (160 + k * 30) + ',80,' + (1 - u) + ')'; circle(fx + Math.sin(t * 13 + k) * 4 * u, fy - 3 - u * 14, 2.4 * (1 - u) + 0.6); ctx.fill(); }
        ctx.fillStyle = 'rgba(200,200,210,0.5)'; for (let k = 0; k < 2; k++) { const u = (t * 0.8 + k / 2) % 1; circle(fx - 20 * u, fy - 14 - u * 30, 3 + u * 6); ctx.fill(); }
      } else if (st.lantern) {
        ctx.fillStyle = C.gold; rr(fx - 6, fy - 10, 12, 14, 3); ctx.fill(); ctx.fillStyle = '#fff4c0'; circle(fx, fy - 3, 4); ctx.fill();
      }
    } else {
      // the ice pick
      const a = arms === 'bat' ? armA : 0.9, sx0 = h.x + h.face * (PW / 2 - 2), sy0 = h.y - PH * sy * 0.36 + 4;
      const ex = sx0 + Math.cos(a) * 16 * h.face, ey = sy0 + Math.sin(a) * 16;
      ctx.strokeStyle = '#7a5434'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex + Math.cos(a - 0.3) * 14 * h.face, ey + Math.sin(a - 0.3) * 14); ctx.stroke();
      const tx = ex + Math.cos(a - 0.3) * 14 * h.face, ty = ey + Math.sin(a - 0.3) * 14;
      ctx.strokeStyle = '#c8ccd4'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(tx - Math.cos(a + 1.2) * 7 * h.face, ty - Math.sin(a + 1.2) * 7); ctx.lineTo(tx + Math.cos(a + 1.2) * 9 * h.face, ty + Math.sin(a + 1.2) * 9); ctx.stroke();
    }
    if (h.st === 'brace') { ctx.strokeStyle = '#8fe3b0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(h.x, h.y - 2, 18, 5, 0, 0, TAU); ctx.stroke(); }
    ctx.globalAlpha = 1;
  }
  // the rope between them: sags when slack, straight when taut; down into a crevasse when someone hangs
  function drawRope(st, t) {
    const a = st.h[0], b = st.h[1];
    if (st.slipT > 0) return;
    const ya = a.y - 12, yb = b.y - 12, d = Math.abs(b.x - a.x), slack = clamp(1 - d / S.rope, 0, 1);
    const sag = 8 + slack * 46;
    const mx = (a.x + b.x) / 2, my = Math.max(ya, yb) + sag;
    ctx.strokeStyle = '#5a2a6a'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(a.x, ya);
    if (a.st === 'hang' || a.st === 'fall' || b.st === 'hang' || b.st === 'fall') {
      const f = a.st === 'hang' || a.st === 'fall' ? a : b, o = f === a ? b : a, ex = clamp(o.x, f.gap.x0, f.gap.x1);
      ctx.moveTo(o.x, o.y - 12); ctx.lineTo(ex === o.x ? o.x : (o.x < f.x ? f.gap.x0 : f.gap.x1), f.edgeY); ctx.lineTo(f.x, f.y - 20);
    } else ctx.quadraticCurveTo(mx, my, b.x, yb);
    ctx.stroke();
    ctx.strokeStyle = '#c86ad8'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]); ctx.stroke(); ctx.setLineDash([]); ctx.lineCap = 'butt';
    if (st.tautNow && slack === 0) { ctx.fillStyle = 'rgba(255,255,255,0.8)'; text('taut', mx, Math.min(ya, yb) - 8, 10, '#5a2a6a', 'center', 'body'); }
  }
  function drawTop(st) {
    const t = st.clock, cx = st.camX, sh = st.shake * 4 * Math.sin(t * 50), fl = K.flashA(st);
    drawFog(st, t);
    ctx.save(); ctx.translate(-cx + sh, 0);
    // yeti eyes glow through the fog
    for (const y of st.yetis) if ((y.st === 'come' || y.st === 'shield') && y.x > cx - 40 && y.x < cx + W + 40) {
      const gy = groundY(st, y.x) - 102;
      if (y.st === 'shield') { ctx.fillStyle = 'rgba(255,90,60,0.4)'; } else ctx.fillStyle = 'rgba(255,90,60,' + (0.7 + 0.3 * Math.sin(t * 6)) + ')';
      circle(y.x - 12, gy, 3.5); ctx.fill(); circle(y.x + 0, gy, 3.5); ctx.fill();
    }
    drawRope(st, t);
    for (const h of st.h) drawHero(st, h, t);
    K.drawParts(st, 0);
    ctx.restore();
    const gu = st.gust, wind = gu.ph === 'blow' ? 900 : gu.ph === 'warn' ? 500 : 300;
    K.snow(t, { wind: -wind, n: st.beacon ? 80 : 220, a: 0.9, big: true });
    if (gu.ph !== 'none') K.windStreaks(t * (gu.ph === 'blow' ? 2 : 1), { n: gu.ph === 'blow' ? 24 : 10, a: gu.ph === 'blow' ? 0.7 : 0.4, dir: -1, col: '#ffffff' });
    K.flashTop(fl * 0.5);
    K.drawPops(st, cx, 0);
  }

  /* ---------- HUD ---------- */
  function hud(st) {
    const big = hudBig(), z = big ? 1.35 : 1, play = G.mode === 'play' || G.mode === 'paused';
    let timeX0;
    {
      const fs = big ? 20 : 14, h = big ? 40 : 28, tm = fmtTime(G.time), n = '🚩 ' + st.probeN + ' / ' + st.totalP;
      ctx.font = FONT(fs);
      const w = ctx.measureText(tm).width + ctx.measureText(n).width + fs + 30, x0 = pill(W - 14, 12, w, h, 'right'), cy = 12 + h / 2 + 0.5;
      text(tm, x0 + 15, cy, fs, st.waiting ? '#aab' : C.paper, 'left', 'body');
      text(n, x0 + w - 15, cy, fs, '#ffb0a0', 'right', 'body');
      timeX0 = x0;
    }
    K.drawMsg(st, st.waiting ? { text: K.BREAK, col: '#ffffff', t: 1, life: 2 } : st.msg, timeX0);
    if (!play) return;
    const pl = plan(st), Fn = st.flare, In = st.ice, F = st.h[Fn], I = st.h[In];
    const kk = (id, what) => (K.quiet(id) ? '' : K.key(id, what) + ' ');
    {
      const bx = K.panel(Fn, 'flare', 236, 70, z), cy = bx.y + 24 * z, chh = 21 * z, cw = (bx.w - 24 * z - 6 * z) / 2, x0 = bx.x + 12 * z;
      K.chip(x0, cy, cw, chh, kk(Fn, 'act') + (pl.flare.why === 'brace' ? 'BRACE' : 'RAISE'), !!pl.flare.act && !st.raised && F.st !== 'brace', st.raised || F.st === 'brace', z);
      K.chip(x0 + cw + 6 * z, cy, cw, chh, kk(Fn, 'down') + 'CROUCH', !!pl.flare.down && F.st !== 'crouch', F.st === 'crouch', z);
      const fr = st.lantern ? 1 : st.burn / S.burn;
      K.meter(x0, cy + chh + 7 * z, bx.w - 24 * z, 7 * z, fr, st.lantern ? C.gold : fr < 0.25 ? '#ff5a4a' : '#ff9a4a');
    }
    {
      const bx = K.panel(In, 'ice pick', 236, 70, z), cy = bx.y + 24 * z, chh = 21 * z, cw = (bx.w - 24 * z - 6 * z) / 2, x0 = bx.x + 12 * z;
      K.chip(x0, cy, cw, chh, kk(In, 'act') + (pl.ice.why === 'dig' ? 'DIG' : pl.ice.why === 'brace' ? 'BRACE' : 'PICK'), !!pl.ice.act && I.st !== 'brace', I.swing > 0 || I.dig || I.st === 'brace', z);
      K.chip(x0 + cw + 6 * z, cy, cw, chh, kk(In, 'down') + 'CROUCH', !!pl.ice.down && I.st !== 'crouch', I.st === 'crouch', z);
      text(st.stats.slips ? 'slips ' + st.stats.slips : 'roped together', x0, cy + chh + 11 * z, 10 * z, '#aab', 'left', 'body');
    }
    // the cold meter
    {
      const w = 200 * z, x = W / 2 - w / 2, y = H - 40 * z;
      ctx.fillStyle = 'rgba(20,22,52,0.88)'; rr(x - 12, y - 18 * z, w + 24, 40 * z, 14 * z); ctx.fill();
      text(st.warm ? 'Warming up at the cairn' : st.cold < 0.3 ? 'SO COLD! Find a cairn!' : 'Warmth', W / 2, y - 7 * z, 10 * z, st.cold < 0.3 ? '#ff8a7a' : st.warm ? '#ffd0a0' : '#aab', 'center', 'body');
      K.meter(x, y + 2, w, 10 * z, st.cold, st.cold < 0.3 ? '#8fb8ff' : st.warm ? '#ffb04a' : '#ffd08a');
      if (st.lantern) text('gold lantern', x + w + 18, y + 7, 11 * z, C.gold, 'left', 'body');
    }
    if (G.introT > 0 || st.state !== 'go' || st.waiting || st.slipT > 0) return;
    const P = K.prompter(st), cx = st.camX;
    const say = (id, h, pp, isF) => {
      let s = null, col = C.gold, pulse = false;
      const dir = pp.x > h.x + 12 ? 'right' : pp.x < h.x - 12 ? 'left' : null;
      if (pp.why === 'brace') { s = 'BRACE! Press ' + K.key(id, 'act'); pulse = true; col = '#ffd0c8'; }
      else if (pp.why === 'braced') { s = 'Holding the rope!'; col = '#d9ffd0'; }
      else if (pp.why === 'climb') { s = 'Climb out! Hold ' + K.key(id, 'up'); pulse = true; }
      else if (pp.why === 'gust') { s = h.st === 'crouch' ? 'Stay down!' : 'GUST! Hold ' + K.key(id, 'down'); pulse = h.st !== 'crouch'; col = '#ffffff'; }
      else if (pp.why === 'yeti') { s = st.raised ? 'Keep it high!' : 'RAISE THE FLARE! Hold ' + K.key(id, 'act'); pulse = !st.raised; col = '#ffd0c8'; }
      else if (pp.why === 'pick') { s = dir ? 'To the ice ' + K.key(id, dir) : 'Swing the pick! ' + K.key(id, 'act'); pulse = !dir; }
      else if (pp.why === 'dig') { s = dir ? 'To the snowed-in crate ' + K.key(id, dir) : 'HOLD ' + K.key(id, 'act') + ' to dig'; pulse = !dir; }
      else if (pp.why === 'runup') { s = 'Back up for a run-up ' + (dir ? K.key(id, dir) : ''); col = '#e8f6ff'; }
      else if (pp.why === 'jump') { s = isF && st.raised ? 'Lower the flare to jump!' : 'Run and jump the crevasse! ' + K.key(id, 'up'); col = '#e8f6ff'; }
      else if (pp.why === 'warm') { s = dir ? 'To the cairn ' + K.key(id, dir) : 'Warm up...'; col = '#ffd0a0'; }
      else if (pp.why === 'crate') { s = 'Get a fresh flare ' + (dir ? K.key(id, dir) : ''); col = '#ffb070'; }
      else if (pp.why === 'probe') { s = dir ? 'Snow probe up there ' + K.key(id, dir) : 'Jump for it! ' + K.key(id, 'up'); }
      else if (pp.why === 'beacon') { s = dir ? 'To the switch ' + K.key(id, dir) : 'Switch on the beacon! ' + K.key(id, 'act'); pulse = !dir; }
      else if (pp.why === 'light' && dir && isF) { s = 'Light the way ' + K.key(id, dir); col = '#ffd0a0'; }
      if (!s) return;
      P.say(id, s, h.x - cx, h.y - 46, col, pulse);
    };
    say(Fn, F, pl.flare, true);
    say(In, I, pl.ice, false);
  }

  MODES.whiteout = {
    S, plan, groundY: (st, x) => groundY(st, x), gapAt: (st, x) => gapAt(st, x), lightC: st => lightC(st),
    medals: { bronze: 'Reach the weather hut', goals: [{ key: 'time', gold: S.goldT, silver: S.silverT }, { key: 'probes', gold: 12, more: true, word: 'snow probe' }] },
    medalValues() { return G.mst.stats ? { probes: G.mst.probeN } : {}; },
    setup(st, L) {
      st.stats = { slips: 0, catches: 0, bonks: 0, snowballs: 0, flares: 0, yetis: 0, colds: 0, smashed: 0, helps: 0, roomT: [] };
      st.inT = [G.time, G.time]; st.personT = G.time; st.clock = 0; st.probeN = 0;
      const def = LEVELS[G.levelIndex];
      st.totalP = (def.rooms || [def]).reduce((n, r) => n + r.feats.filter(f => f.k === 'probe').length, 0);
      for (const row of L.grid) row.fill('.');
      room(st, L, 0);
    },
    room(k, L) { const st = G.mst; st.inT = [G.time, G.time]; st.personT = G.time; for (const row of L.grid) row.fill('.'); room(st, L, k); },
    step(dt) { tick(G.mst, dt); },
    draw() { const st = G.mst; if (!st.pts) return; draw(st); K.hide(st); },
    drawTop() { const st = G.mst; K.unhide(st); if (st.pts) drawTop(st); },
    hud() { const st = G.mst; if (st.pts) hud(st); },
    stats() {
      const st = G.mst, s = st.stats;
      if (!s) return [];
      const out = [
        { label: 'Snow probes', value: st.probeN + ' of ' + st.totalP },
        { label: 'Slips', value: String(s.slips) },
        { label: 'Flares used', value: String(s.flares) },
      ];
      out.push('Rope catches: ' + s.catches + '. Icicle bonks: ' + s.bonks + '. Snowballs: ' + s.snowballs + '. Yetis scared off: ' + s.yetis + '.');
      const hl = K.helpLine(s.helps); if (hl) out.push(hl);
      return out;
    },
  };

  /* ---------- the level ---------- */
  const acts = r => ({ label: 'flare', labels: r === 0 ? ['flare', 'pick'] : ['pick', 'flare'] });
  const P = (x, high) => ({ k: 'probe', x, high: !!high });
  STORMCHASE.defs.whiteout = {
    name: 'Blizzard Whiteout', world: 32, kind: 'team', mode: 'whiteout', ownStep: true, ownHUD: true, noFalls: true, roomWord: 'Stretch',
    jobs: {
      flare: { title: 'Flare hero', act: 'flare', legend: '<kbd>A</kbd><kbd>D</kbd> walk <kbd>W</kbd> jump, climb <kbd>S</kbd> hold to crouch',
        howTo: ['Hold flare to raise it: more light, but it burns faster.'] },
      ice: { title: 'Ice hero', act: 'pick', legend: '<kbd>A</kbd><kbd>D</kbd> walk <kbd>W</kbd> jump, climb <kbd>S</kbd> hold to crouch',
        howTo: ['Tap pick to swing at ice walls; hold it at a crate to dig.'] },
    },
    howTo: ['Crouch in gusts. When your partner falls, press the action fast to brace.'],
    jobOf: 'flare', jobSwap: 'You swap jobs every stretch.',
    tip: 'You only see inside the flare\'s glow. Stay together on the rope!',
    act: acts(0),
    map: K.stubMap(),
    rooms: [
      { title: 'The Trailhead', flare: 0, len: 3000, gust: [26, 999], done: 'Off the trailhead!', act: acts(0),
        feats: [P(420), { k: 'wall', x: 650 }, { k: 'crate', x: 900 }, { k: 'cairn', x: 1000 }, { k: 'crev', x: 1200, w: 70 }, P(1420, true),
          { k: 'icicle', x: 1620 }, { k: 'drift', x: 1800, w: 120 }, P(2060), { k: 'up', x: 2250 }, P(2550), { k: 'down', x: 2700 }],
        tip: 'Pip holds the flare (hold the action to raise it). Bo swings the pick at the ice wall. Jump the crevasse!' },
      { title: 'Frozen Lake', flare: 1, len: 3400, gust: [9, 11], done: 'Across the lake!', act: acts(1),
        feats: [{ k: 'crate', x: 300 }, { k: 'crev', x: 520, w: 80 }, P(640), { k: 'wall', x: 760 }, { k: 'cairn', x: 880 }, { k: 'lake', x: 1000, x1: 2300 },
          P(1350), P(1900), { k: 'cairn', x: 2420 }, { k: 'crate', x: 2560, buried: true }, { k: 'drift', x: 2720, w: 110 }, { k: 'icicle', x: 2980 }, P(3150, true)],
        tip: 'Swap jobs! The lake ice cracks behind you: keep moving, and crouch when the wind whistles.' },
      { title: 'The Pass', flare: 0, len: 3800, gust: [14, 15], done: 'Over the pass!', act: acts(0),
        feats: [P(300), { k: 'crev', x: 520, w: 70 }, { k: 'crev', x: 700, w: 80 }, P(830), { k: 'crev', x: 900, w: 75 }, { k: 'cairn', x: 1100 },
          { k: 'crate', x: 1220, buried: true }, { k: 'up', x: 1450 }, { k: 'wall', x: 1750 }, P(1900, true), { k: 'yeti', x: 2050 }, { k: 'icicle', x: 2300 },
          { k: 'drift', x: 2480, w: 120 }, { k: 'cairn', x: 2700 }, { k: 'crate', x: 2800 }, { k: 'crev', x: 2950, w: 90 }, { k: 'yeti', x: 3050 },
          { k: 'down', x: 3250 }, P(3550)],
        tip: 'A crevasse field, and something big in the snow... Raise the flare high to scare it off!' },
      { title: 'Summit Station', flare: 1, len: 4200, gust: [10, 12], act: acts(1),
        feats: [{ k: 'crate', x: 250 }, { k: 'wall', x: 450 }, { k: 'crev', x: 650, w: 80 }, P(800, true), { k: 'up', x: 1000 }, { k: 'icicle', x: 1250 },
          { k: 'cairn', x: 1400 }, { k: 'crev', x: 1600, w: 85 }, { k: 'drift', x: 1750, w: 110 }, { k: 'yeti', x: 1900 }, P(2100), { k: 'crate', x: 2250, buried: true },
          { k: 'crev', x: 2400, w: 75 }, P(2530), { k: 'crev', x: 2600, w: 80 }, { k: 'down', x: 2720 }, { k: 'cairn', x: 2950 }, { k: 'wall', x: 3080 },
          { k: 'yeti', x: 3200 }, { k: 'up', x: 3350 }, { k: 'icicle', x: 3620 }, P(3780), { k: 'hut', x: 4000 }],
        tip: 'The weather hut is at the top! Both get there, then switch on the beacon with the action.' },
    ],
  };

  /* ---------- sounds ---------- */
  Sfx.extra.whiteoutJump = function (id) { this.tone(id ? 330 : 392, 0.1, 'triangle', 0.035, id ? 520 : 620); };
  Sfx.extra.whiteoutSwing = function () { this.tone(900, 0.08, 'sawtooth', 0.01, 300); };
  Sfx.extra.whiteoutChip = function () { this.tone(1800, 0.06, 'square', 0.025, 1200); this.tone(2400, 0.05, 'triangle', 0.02, null, 0.03); };
  Sfx.extra.whiteoutShatter = function () { [2600, 2000, 3100, 1700].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.025, f * 0.6, i * 0.035)); };
  Sfx.extra.whiteoutThump = function () { this.tone(160, 0.12, 'sine', 0.05, 90); };
  Sfx.extra.whiteoutCrate = function () { this.tone(220, 0.1, 'square', 0.03, 300); this.tone(660, 0.12, 'triangle', 0.03, null, 0.08); };
  Sfx.extra.whiteoutFlare = function () { this.tone(1200, 0.4, 'sawtooth', 0.012, 400); this.tone(523, 0.12, 'triangle', 0.04, null, 0.1); this.tone(784, 0.14, 'triangle', 0.04, null, 0.18); };
  Sfx.extra.whiteoutFizz = function () { this.tone(500, 0.6, 'sawtooth', 0.02, 80); };
  Sfx.extra.whiteoutWhistle = function () { this.tone(1400, 1.1, 'sine', 0.03, 2100); };
  Sfx.extra.whiteoutFall = function () { this.tone(700, 0.35, 'triangle', 0.04, 220); };
  Sfx.extra.whiteoutCatch = function () { this.tone(140, 0.15, 'square', 0.05, 110); this.tone(440, 0.1, 'triangle', 0.04, null, 0.1); };
  Sfx.extra.whiteoutUp = function () { this.tone(523, 0.08, 'triangle', 0.04, null); this.tone(784, 0.12, 'triangle', 0.04, null, 0.07); };
  Sfx.extra.whiteoutSlip = function () { this.tone(600, 0.6, 'sawtooth', 0.025, 120); };
  Sfx.extra.whiteoutCreak = function () { this.tone(2400, 0.3, 'square', 0.01, 1900); };
  Sfx.extra.whiteoutBonk = function () { this.tone(300, 0.1, 'square', 0.05, 160); this.tone(1800, 0.15, 'triangle', 0.02, 900, 0.05); };
  Sfx.extra.whiteoutBreak = function () { this.tone(900, 0.2, 'square', 0.015, 300); };
  Sfx.extra.whiteoutGrowl = function () { this.tone(70, 1.2, 'sawtooth', 0.05, 55); this.tone(90, 1, 'square', 0.02, 60, 0.2); };
  Sfx.extra.whiteoutRoar = function () { this.tone(110, 0.9, 'sawtooth', 0.07, 60); this.tone(160, 0.7, 'square', 0.03, 80, 0.1); };
  Sfx.extra.whiteoutSnowball = function () { this.tone(220, 0.15, 'sine', 0.06, 80); };
  Sfx.extra.whiteoutCairn = function () { this.tone(300, 0.4, 'sawtooth', 0.015, 600); this.tone(659, 0.15, 'triangle', 0.03, null, 0.15); };
  Sfx.extra.whiteoutBeacon = function () { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.3, 'sine', 0.05, null, i * 0.12)); };
  Sfx.extra.whiteoutFanfare = function () { [392, 523, 659, 784, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.055, null, i * 0.11)); };
})();
