/* Pip & Bo - Level 39-2 Sleeping Golem (team, World 39 Crystal Caverns). */
'use strict';

/* ===== 39-2 Sleeping Golem (mode 'cavegolem', team, the giant is the level, Gavyn's pick) =====
   At the bottom of the mine is the Crystal Cavern and its guardian, a giant crystal golem, awake, hurting and stomping
   about with red eyes. Dark shards are stuck in it like thorns. Pip and Bo climb the walking giant and pull them out.
   SIDE VIEW. The golem (about three screens tall) walks slowly right; the camera stays on it (the cavern scrolls past
   behind) and pans up and down to frame both heroes. Everything is in the golem's own frame: x across (0 = its
   middle), y up is negative, the cavern floor (glow-mushrooms) is y = 0.
   THE BODY (SURF): ledges you stand on (one-way: jump up through them, land on them) and climb zones (moss, old
   expedition rope, crystal studs) you climb with ▲ ▼. Body ledges bob with its stride; the two legs swing (a 4 s step
   for each, out of step: a footfall every 4 s) and carry anyone on them; the near arm is a lift: its forearm rises
   from hip height to shoulder height and back (S.armPer), pausing at each end, and its palm closes into a fist once on
   the way down (tell: the fingers curl). Hollows (dark gaps between blocks) are steady spots.
   BOTH: ◀ ▶ walk, ▲ jump (or climb, in a climb zone), ▼ crouch (or climb down, at the top of a climb), action held =
   HOLD ON (no moving; a Stomp cannot shake you off).
   ROLES (swap each stretch; tongs and chime change hands): the PULLER holds the action at the current shard to pull
   (a 3 s bar; the crown takes three bars). The SOOTHER holds the action at that shard's teal ear crystal to ring the
   chime: Rage falls while it rings, and the golem's flinches (one at each third of a bar) are cancelled. An unsoothed
   flinch throws the puller off. Ringing is not holding on: a Stomp shakes off a ringer who is not in a hollow (hop
   over it: anyone in the air is not shaken; ▼ + action = hold on flat, through a stomp and a sweep at once, never
   pulling or ringing). Big shards (one per stretch from stretch 2) come loose when the bar is
   full and then need a HEAVE: both next to it press the action within 0.5 s of each other.
   TROUBLE: Stomps (a groan and the foot's shadow 1 s before); scratches from stretch 2 (the eye looks at the next
   shard and a hand lifts 1.5 s before, then it sweeps there: crouch or be brushed off); the fist (palm riders are
   knocked off); crystal mites sitting on some ear crystals (no ringing until one lands on it to pop it; walking
   into one is a pinch); roof crystals in stretches 2 and 4 when the golem bumps the roof (a marker and a tinkle 1 s
   before: step away); Rage geysers from stretch 3 (cracks hiss and vent when Rage is above half); low arches in
   stretch 4 (a horn and the arch ahead 2 s before: everyone on the shoulders or the head must crouch, or hold on
   flat if they are on a climb; a climber holding on is safe from a sweeping hand too). Falling to the
   floor is a TUMBLE: a bounce in the glow-mushrooms and a puff back up to the stretch's base ledge (2 s).
   RAGE (shared, the golem's face on the HUD; its eyes and cracks show it too): pulling unsoothed, flinches, tumbles,
   brushes and bonks fill it; ringing drains it fast, clean play slowly. Full: a TANTRUM: it roars, shakes, both are
   flung down to the stretch's base and the shard being pulled is back in (pulled shards stay out).
   STRETCHES: The Legs, The Belt and Back, The Chest and Arms (the pool wade: the cavern floor is under glowing water),
   The Head. The crown shard is the finale; the golem sits, its eyes turn teal, the cavern lights up, Pip and Bo stand
   on its palm and see the shard is a tooth, and the wall behind them cracks. Level clear.
   GOLD HELP (3 bad events in a stretch, both playing): a gold chime: its ring reaches twice as far, Stomp tells show
   0.5 s earlier and Rage fills 30% slower.
   COLLECTABLES: 20 glow gems on the body (some only on the arm). MEDAL by time: Gold <= 215 s, Silver <= 370 s.
   MODES.cavegolem.plan(st) says what each hero should do now (the prompts, the HUD chips and the brain read it).
   Sounds are Sfx.extra.cavegolem*. */
(() => {
  const K = CAVE, TAU = Math.PI * 2;
  const S = {
    walk: 150, climb: 120, grav: 1500, jumpV: 520, maxFall: 950, air: 0.85,
    hipY: -700, stride: 120, lift: 70, step: 4, golemV: 60,
    stompTell: 1.0, goldTell: 0.5, holdAhead: 0.6,
    pullT: 3, reach: 34, earR: 42, goldEarR: 84, heaveWin: 0.5, heaveR: 70,
    rage: { pull: 0.07, flinch: 0.05, tumble: 0.06, brush: 0.04, bonk: 0.02, gold: 0.7 }, ringDrain: 0.11, idleDrain: 0.012,
    scratchEvery: 14, scratchTell: 1.5, scratchT: 0.9, scratchR: 110,
    archEvery: 11, archTell: 2, archT: 1.2, archY: -1080,
    armPer: 10, armLow: -704, armHigh: -1136, armX: 300, fistTell: 1, fistAt: 7.5, fistT: 1.2, palm: 25,
    geyserEvery: 3, geyserTell: 0.7, geyserT: 0.8, roofEvery: 16, roofTell: 1.1,
    tumbleT: 2, tantrumT: 2.6, idleWait: 12, goldT: 215, silverT: 370, gems: 20, pool: -300,
  };
  const X0 = W / 2 - 40;                                          // the golem's middle on screen

  /* ---------- the body: ledges and climb zones ---------- */
  // part: 'body' (bobs), 'leg0' (the far leg), 'leg1' (the near leg), 'arm' (the lift). Ledges: x0..x1 at y, maybe a
  // hollow [a, b]. Climbs: x0..x1 from top to bot, joining ledge `up` (at top) and ledge `down` (at bot).
  const SURF = [];
  const ledge = (n, part, x0, x1, y, hollow) => SURF.push({ n, part, kind: 'ledge', x0, x1, y, hollow: hollow || null });
  const climb = (n, part, x0, x1, top, bot, up, down, look) => SURF.push({ n, part, kind: 'climb', x0, x1, top, bot, up, down, look: look || 'moss' });
  ledge('belt', 'body', -240, 215, -700, [125, 180]);
  ledge('back', 'body', -255, -130, -910, [-250, -205]);
  ledge('rib', 'body', 110, 235, -890);
  ledge('shoulder', 'body', -255, 225, -1140, [-205, -150]);
  ledge('ear', 'body', -175, -90, -1310, [-175, -140]);
  ledge('brow', 'body', 95, 175, -1390);
  ledge('crown', 'body', -135, 135, -1490);
  ledge('arm', 'arm', -90, 90, 0);
  for (const k of [0, 1]) { ledge('foot' + k, 'leg' + k, -55, 75, -110); ledge('knee' + k, 'leg' + k, -55, 55, -430); }
  climb('rope', 'body', -245, -212, -910, -700, 'back', 'belt', 'rope');
  climb('belly', 'body', 180, 212, -890, -700, 'rib', 'belt');
  climb('backup', 'body', -253, -220, -1140, -910, 'shoulder', 'back', 'rope');
  climb('chestup', 'body', 200, 225, -1140, -890, 'shoulder', 'rib', 'studs');
  climb('earup', 'body', -128, -96, -1310, -1140, 'ear', 'shoulder');
  climb('beard', 'body', 125, 158, -1390, -1140, 'brow', 'shoulder');
  climb('headback', 'body', -132, -100, -1490, -1310, 'crown', 'ear', 'studs');
  climb('browup', 'body', 100, 133, -1490, -1390, 'crown', 'brow', 'studs');
  for (const k of [0, 1]) { climb('thigh' + k, 'leg' + k, -22, 22, -700, -430, 'belt', 'knee' + k); climb('shin' + k, 'leg' + k, -22, 22, -430, -110, 'knee' + k, 'foot' + k); }
  const SI = {}; SURF.forEach((s, i) => { s.i = i; SI[s.n] = i; });
  const LEDGES = SURF.filter(s => s.kind === 'ledge'), CLIMBS = SURF.filter(s => s.kind === 'climb');

  /* ---------- the shards (3 a stretch), their ear crystals, and the gems ---------- */
  // a spot: [surface name, local x, height above it (ledges) or y (climbs)]
  const STRETCH = [
    { title: 'The Legs', base: ['foot1', 0], shards: [
      { name: 'ankle', at: ['foot1', 42], ear: ['foot1', -42] },
      { name: 'knee', at: ['knee0', 30], ear: ['knee1', -32], mite: true },
      { name: 'hip', at: ['belt', -150], ear: ['belt', 152] } ],
      gems: [['foot1', 70], ['shin1', -300], ['knee0', -45], ['thigh0', -560], ['belt', -205]] },
    { title: 'The Belt and Back', base: ['belt', -40], shards: [
      { name: 'belt', at: ['belt', 60], ear: ['belt', 152] },
      { name: 'back', at: ['back', -165], ear: ['back', -228], big: true, mite: true },
      { name: 'elbow', at: ['arm', -55], ear: ['shoulder', 170] } ],
      gems: [['rope', -820], ['back', -140], ['arm', 70], ['shoulder', 205], ['belt', 205]] },
    { title: 'The Chest and Arms', base: ['belt', 60], shards: [
      { name: 'chest', at: ['rib', 140], ear: ['rib', 222], big: true },
      { name: 'shoulder', at: ['shoulder', -100], ear: ['shoulder', -178], mite: true },
      { name: 'palm', at: ['arm', 60], ear: ['rib', 200] } ],
      gems: [['belly', -800], ['rib', 120], ['chestup', -1020], ['shoulder', -230], ['arm', 85]] },
    { title: 'The Head', base: ['shoulder', -40], shards: [
      { name: 'neck', at: ['shoulder', 30], ear: ['ear', -160] },
      { name: 'brow', at: ['brow', 150], ear: ['crown', 110], mite: true },
      { name: 'crown', at: ['crown', -10], ear: ['crown', -66], big: true, bars: 3 } ],
      gems: [['earup', -1230], ['ear', -110], ['beard', -1260], ['brow', 110], ['crown', 60]] },
  ];

  /* ---------- the body's motion (st.gt = the golem's own clock) ---------- */
  const bob = gt => 5 * Math.sin(gt * Math.PI / 2);
  function legPose(k, gt) {
    const u = (((gt + (k ? S.step : 0)) % (S.step * 2)) + S.step * 2) % (S.step * 2) / (S.step * 2);
    if (u < 0.5) return { f: S.stride * (1 - 4 * u), lift: 0, stance: true, left: (0.5 - u) * S.step * 2 };
    const v = (u - 0.5) * 2;
    return { f: -S.stride + 2 * S.stride * K.smooth(v), lift: S.lift * Math.sin(Math.PI * v), stance: false, left: 0 };
  }
  // the arm: bottom pause, rise, top pause, fall; the fist closes on the way down
  function armPose(gt) {
    const P = S.armPer, u = ((gt % P) + P) % P;
    let y, ph;
    if (u < 1.5) { y = S.armLow; ph = 'bottom'; }
    else if (u < 5) { y = K.lerp(S.armLow, S.armHigh, K.smooth((u - 1.5) / 3.5)); ph = 'up'; }
    else if (u < 6.5) { y = S.armHigh; ph = 'top'; }
    else { y = K.lerp(S.armHigh, S.armLow, K.smooth((u - 6.5) / 3.5)); ph = 'down'; }
    const fc = u - S.fistAt, closed = fc >= 0 && fc < S.fistT, curl = fc > -S.fistTell && fc < 0 ? (fc + S.fistTell) / S.fistTell * 0.35 : closed ? 1 : fc >= S.fistT && fc < S.fistT + 0.4 ? 1 - (fc - S.fistT) / 0.4 : 0;
    return { y, ph, u, closed, curl, fistIn: fc < 0 ? -fc : P - fc, pauseLeft: ph === 'bottom' ? 1.5 - u : ph === 'top' ? 6.5 - u : 0 };
  }
  // a point of a part, in the golem's frame
  function world(st, part, lx, ly, gt = st.gt) {
    const b = bob(gt);
    if (part === 'body') return { x: lx, y: ly + b };
    if (part === 'arm') { const a = armPose(gt); return { x: S.armX + lx, y: a.y + ly + b }; }
    const k = part === 'leg1' ? 1 : 0, p = legPose(k, gt), fr = clamp((ly - S.hipY) / -S.hipY, 0, 1);
    return { x: (k ? 60 : -60) + lx + p.f * fr, y: ly - p.lift * fr + b * (1 - fr) };
  }
  const origin = (st, s, gt) => world(st, s.part, 0, s.kind === 'ledge' ? s.y : s.top, gt);
  // where a spot is: ledges give the standing point; climbs give the point on the climb
  function spotXY(st, sp, up = 0) {
    const s = SURF[SI[sp[0]]];
    if (s.kind === 'ledge') return world(st, s.part, sp[1], s.y - up);
    return world(st, s.part, (s.x0 + s.x1) / 2, sp[1]);
  }

  /* ---------- a stretch ---------- */
  function room(st, L, k) {
    st.k = k; st.title = STRETCH[k].title; st.state = 'go'; st.endT = 0;
    st.puller = k % 2 === 0 ? 0 : 1; st.soother = 1 - st.puller;
    st.shards = STRETCH[k].shards.map((d, n) => Object.assign({ n, prog: 0, loose: false, out: false, bars: d.bars || 1, mite: !!d.mite, thirds: 0 }, d));
    st.cur = 0;
    st.gemsHere = STRETCH[k].gems.map((g, n) => ({ sp: g, id: k * 5 + n, got: !!st.gotGem[k * 5 + n] }));
    st.rc = { bad: 0 }; st.gold = false; st.goldUsed = false;
    st.scratch = null; st.scratchT = S.scratchEvery * 0.7; st.arch = null; st.archT = S.archEvery * 0.6; st.drops = []; st.roofT = S.roofEvery * 0.5; st.geyT = 0;
    st.heave = [-9, -9]; st.ringT = st.T; st.tant = 0;
    for (const id of [0, 1]) spawn(st, id);
    K.fx(st);
    st.segStart = G.time;
    labels(st);
    if (k === 0) Music.cue({ song: 'cavegolem0' });
  }
  const roleWord = (st, id) => (id === st.puller ? 'pull' : 'ring');
  function labels(st) { K.actLabels([roleWord(st, 0), roleWord(st, 1)], 'hold on'); }
  // put a hero on the stretch's base ledge (the start, a tumble, a tantrum)
  function spawn(st, id) {
    let [n, lx] = STRETCH[st.k].base;
    const s = SURF[SI[n]];
    st.h[id] = { mode: 'stand', s: s.i, lx: clamp(lx + (id ? 22 : -22), s.x0 + 6, s.x1 - 6), ly: 0, x: 0, y: 0, vx: 0, vy: 0, face: 1, knockT: 0, stunT: 0, tumbleT: 0, hold: false, ring: false, pull: false, crouch: false, walkPh: 0, landT: -9 };
    place(st, st.h[id]);
  }
  function place(st, h) {
    const s = SURF[h.s];
    if (h.mode === 'stand') { const o = world(st, s.part, h.lx, s.y); h.x = o.x; h.y = o.y; }
    else if (h.mode === 'climb') { const o = world(st, s.part, h.lx, h.ly); h.x = o.x; h.y = o.y; }
  }
  const inHollow = h => { if (h.mode !== 'stand') return false; const s = SURF[h.s]; return !!(s.hollow && h.lx >= s.hollow[0] && h.lx <= s.hollow[1]); };
  const curShard = st => st.shards[st.cur] || null;
  const earR = st => (st.gold ? S.goldEarR : S.earR);
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const heroC = h => ({ x: h.x, y: h.y - 18 });
  const atShard = (st, h) => { const sh = curShard(st); return sh && h.mode === 'stand' && dist(heroC(h), spotXY(st, sh.at, 30)) < S.reach; };
  const atEar = (st, h) => { const sh = curShard(st); return sh && h.mode === 'stand' && dist(heroC(h), spotXY(st, sh.ear, 30)) < earR(st); };
  const stompIn = st => S.step - (((st.gt % S.step) + S.step) % S.step);
  const tellT = st => S.stompTell + (st.gold ? S.goldTell : 0);
  const rageUp = (st, v) => { st.rage = Math.min(1, st.rage + v * (st.gold ? S.rage.gold : 1)); };

  /* ---------- the tick ---------- */
  function tick(st, dt) {
    if (!st.h) return;
    K.track(st);
    st.waiting = st.state === 'go' && K.idle(st, dt, S.idleWait);
    const live = G.introT <= 0 && !st.waiting && st.state === 'go';
    st.clock += dt;
    K.tickMabel(st, dt);
    K.glitter(st, dt, 40);
    if (live) {
      st.T += dt;
      const prev = LEDGES.map(s => origin(st, s));
      const gt0 = st.gt;
      st.gt += dt; st.wx += S.golemV * dt;
      const now = LEDGES.map(s => origin(st, s));
      for (let id = 0; id < 2; id++) heroStep(st, id, dt, prev, now);
      pickup(st, prev, now);
      events(st, dt, gt0);
      shardStep(st, dt);
      rageStep(st, dt);
      gemStep(st);
      if (st.rage >= 1 && st.state === 'go') tantrum(st);
    } else if (st.state === 'tantrum') tantrumStep(st, dt);
    else if (st.state === 'end') endStep(st, dt);
    else if (st.state === 'sit') sitStep(st, dt);
    for (const p of G.players) { p.pendingJump = false; p.pendingAct = false; }
    for (const h of st.h) if (h.mode === 'tumble') { h.tumbleT -= dt; if (h.tumbleT <= 0 && st.state === 'go') { spawn(st, st.h.indexOf(h)); Sfx.play('caveBoing'); } }
    camera(st, dt);
    K.tickOfx(st, dt);
    K.tickFx(st, dt);
    mirror(st);
  }

  function heroStep(st, id, dt, prev, now) {
    const p = G.players[id], i = p.input, h = st.h[id];
    if (h.mode === 'tumble') return;
    if (h.knockT > 0) h.knockT -= dt;
    if (h.stunT > 0) h.stunT -= dt;
    const ctl = h.knockT <= 0 && h.stunT <= 0;
    const lr = ctl ? (i.right ? 1 : 0) - (i.left ? 1 : 0) : 0, act = ctl && !!i.act, down = ctl && !!i.down, up = ctl && !!(i.jump || i.up), jumpP = ctl && p.pendingJump;
    const wet = st.k === 2 && h.y > S.pool, sp = wet ? 0.6 : 1;
    h.hold = h.ring = h.pull = h.crouch = false;
    if (h.mode === 'stand') {
      const s = SURF[h.s];
      if (act && down) { h.hold = true; h.crouch = true; } // (▼ + action: hold on, flat, without pulling or ringing)
      else if (act) {
        if (id === st.puller && atShard(st, h) && !curShard(st).loose) h.pull = true;
        else if (id === st.soother && atEar(st, h) && !curShard(st).mite) h.ring = true;
        else h.hold = true;
        if (id === st.soother && atEar(st, h) && curShard(st).mite) K.hintOnce(st, 'mite' + st.k + st.cur, id, 'A crystal mite is on it! Jump on it', 2.4);
      } else if (down) {
        const c = CLIMBS.find(c => c.up === s.n && overClimb(st, c, h, s.y));
        if (c) { h.mode = 'climb'; h.s = c.i; h.ly = c.top + 2; h.lx = clamp(h.x - world(st, c.part, 0, h.ly).x, c.x0, c.x1); }
        else h.crouch = true;
      } else {
        if (lr) { h.lx += lr * S.walk * sp * dt; h.face = lr; h.walkPh += dt * 10; }
        const c = up ? CLIMBS.find(c => c.down === s.n && overClimb(st, c, h, s.y)) : null;
        if (c) { h.mode = 'climb'; h.s = c.i; h.ly = c.bot - 2; h.lx = clamp(h.x - world(st, c.part, 0, h.ly).x, c.x0, c.x1); }
        else if (jumpP) { h.mode = 'air'; h.vx = lr * S.walk * S.air; h.vy = -S.jumpV * (wet ? 0.8 : 1); Sfx.play('cavegolemJump'); }
        else if (h.lx < s.x0 || h.lx > s.x1) {
          // off the end: onto a ledge at about the same height, or a fall
          const o = world(st, s.part, h.lx, s.y), to = LEDGES.find(L => L !== s && Math.abs(origin(st, L).y - o.y) < 8 && o.x >= origin(st, L).x + L.x0 && o.x <= origin(st, L).x + L.x1);
          if (to) { h.s = to.i; h.lx = o.x - origin(st, to).x; }
          else { h.mode = 'air'; h.vx = lr * S.walk * S.air; h.vy = 0; }
        }
      }
      place(st, h);
    } else if (h.mode === 'climb') {
      const c = SURF[h.s];
      if (act) h.hold = true;
      else {
        h.ly += ((down ? 1 : 0) - (up ? 1 : 0)) * S.climb * sp * dt;
        h.lx += lr * S.climb * 0.7 * dt; if (lr) h.face = lr;
        if (up || down) h.walkPh += dt * 8;
        if (h.lx < c.x0 - 6 || h.lx > c.x1 + 6) { place(st, h); h.mode = 'air'; h.vx = lr * 80; h.vy = 0; }
        else if (h.ly <= c.top) { const L = SURF[SI[c.up]]; place(st, h); h.mode = 'stand'; h.s = L.i; h.lx = h.x - origin(st, L).x; h.lx = clamp(h.lx, L.x0, L.x1); }
        else if (h.ly >= c.bot) { const L = SURF[SI[c.down]]; place(st, h); h.mode = 'stand'; h.s = L.i; h.lx = clamp(h.x - origin(st, L).x, L.x0, L.x1); }
      }
      place(st, h);
    } else if (h.mode === 'air') {
      if (ctl) h.vx = approach(h.vx, lr * S.walk * S.air * sp, 900 * dt);
      h.vy = Math.min(S.maxFall * (wet ? 0.4 : 1), h.vy + S.grav * (wet ? 0.45 : 1) * dt);
      const y0 = h.y;
      h.x += h.vx * dt; h.y += h.vy * dt;
      if (lr) h.face = lr;
      if (h.vy >= 0) {
        for (let n = 0; n < LEDGES.length; n++) {
          const L = LEDGES[n], a = prev[n], b = now[n];
          if (y0 <= a.y + 3 && h.y >= b.y && h.x >= b.x + L.x0 - 4 && h.x <= b.x + L.x1 + 4) { land(st, id, h, L, b); break; }
        }
      }
      if (h.mode === 'air' && up && h.knockT <= 0) {
        const c = CLIMBS.find(c => { const o = world(st, c.part, 0, clamp(h.y, c.top, c.bot)); return h.y > c.top + 4 && h.y < c.bot - 4 && h.x >= o.x + c.x0 - 4 && h.x <= o.x + c.x1 + 4; });
        if (c) { h.mode = 'climb'; h.s = c.i; h.ly = h.y; h.lx = clamp(h.x - world(st, c.part, 0, h.y).x, c.x0, c.x1); h.vx = h.vy = 0; Sfx.play('cavegolemGrip'); }
      }
      if (h.mode === 'air' && h.y > -6) tumble(st, id);
    }
  }
  const overClimb = (st, c, h, y) => { const o = world(st, c.part, 0, y); return h.x >= o.x + c.x0 - 2 && h.x <= o.x + c.x1 + 2; };
  function land(st, id, h, L, o) {
    h.mode = 'stand'; h.s = L.i; h.lx = clamp(h.x - o.x, L.x0, L.x1); h.vx = h.vy = 0; h.landT = st.T;
    place(st, h);
    // landing on a mite pops it
    const sh = curShard(st);
    if (sh && sh.mite && dist(heroC(h), spotXY(st, sh.ear, 30)) < 30) { sh.mite = false; st.stats.mites++; Sfx.play('cavegolemMitePop'); K.spark(st, X0 + h.x, scrY(st, h.y), 8, [K.GLOW.teal, '#ffffff']); K.pop(st, X0 + h.x, scrY(st, h.y) - 50, 'Pop!', '#bff8ef', 16); }
    else Sfx.play('cavegolemLand');
  }
  // a rising ledge picks up anyone standing just above it (the arm lift, a swinging foot)
  function pickup(st, prev, now) {
    for (const h of st.h) {
      if (h.mode !== 'stand') continue;
      for (let n = 0; n < LEDGES.length; n++) {
        const L = LEDGES[n]; if (L.i === h.s || L.part === 'body') continue;
        const a = prev[n], b = now[n];
        if (a.y > h.y + 0.5 && b.y <= h.y + 0.5 && h.x >= b.x + L.x0 && h.x <= b.x + L.x1) { h.s = L.i; h.lx = h.x - b.x; place(st, h); break; }
      }
    }
  }
  function knock(st, id, vx, vy, t) {
    const h = st.h[id]; if (h.mode === 'tumble') return;
    place(st, h); h.mode = 'air'; h.vx = vx; h.vy = vy; h.knockT = t || 0.35;
  }
  function tumble(st, id) {
    const h = st.h[id];
    h.mode = 'tumble'; h.tumbleT = S.tumbleT; h.y = 0; h.vy = 0;
    st.stats.tumbles++; rageUp(st, S.rage.tumble);
    Sfx.play('caveBoing'); Sfx.play('cavegolemTumble');
    K.pop(st, X0 + h.x, scrY(st, -40), 'Boing!', '#ffffff', 18);
    bad(st, NAMES[id] + ' tumbled into the mushrooms!');
  }
  function bad(st, text) {
    st.rc.bad++;
    if (text) K.msg(st, text, '#ffd0c8', 2.2);
    if (st.rc.bad >= 3 && !st.goldUsed && K.both(st)) {
      st.goldUsed = true; st.gold = true;
      K.goldHelp(st, 'Gold chime! It rings twice as far, stomps warn earlier and its temper rises slower');
    }
  }

  /* ---------- stomps, scratches, arches, the fist, geysers, roof crystals ---------- */
  function events(st, dt, gt0) {
    // a footfall every 4 s
    const si = stompIn(st);
    if (si < tellT(st) && !st.toldStomp) { st.toldStomp = true; Sfx.play('cavegolemStompTell'); }
    if (Math.floor(st.gt / S.step) > Math.floor(gt0 / S.step)) {
      st.toldStomp = false;
      Sfx.play('cavegolemStomp'); G.shake = 0.4; st.stats.stomps++;
      for (let x = -200; x <= 200; x += 40) K.dust(st, X0 + x + (Math.random() - 0.5) * 30, scrY(st, -4), 'rgba(200,240,235,0.8)', 2);
      for (let id = 0; id < 2; id++) {
        const h = st.h[id]; K.ofx(st, id).dust = 2.5;
        if ((h.mode === 'stand' || h.mode === 'climb') && !h.hold && !h.pull && !inHollow(h)) {
          knock(st, id, (h.x >= 0 ? 1 : -1) * (60 + Math.random() * 90), -250);
          st.stats.shaken++; Sfx.play('cavegolemShake');
          K.hint(st, id, 'Hold on with the action when it stomps!', 2);
        }
      }
    }
    const sh = curShard(st);
    // scratches (stretch 2 on): the eye looks, a hand lifts, then it sweeps the next shard's spot
    if (st.k >= 1 && sh) {
      if (!st.scratch) { st.scratchT -= dt; if (st.scratchT <= 0) { const p = spotXY(st, sh.at, 30); st.scratch = { t: 0, x: p.x, y: p.y, hit: [false, false], sh: sh.at }; Sfx.play('cavegolemScratchTell'); } }
      else {
        const sc = st.scratch; sc.t += dt; const p = spotXY(st, sc.sh, 30); sc.x = p.x; sc.y = p.y;
        if (sc.t >= S.scratchTell && !sc.swept) { sc.swept = true; Sfx.play('cavegolemScratch'); }
        if (sc.t >= S.scratchTell && sc.t < S.scratchTell + S.scratchT) {
          for (let id = 0; id < 2; id++) {
            const h = st.h[id];
            if (sc.hit[id] || h.mode === 'tumble' || h.crouch || inHollow(h) || (h.mode === 'climb' && h.hold)) continue;
            if (dist(heroC(h), sc) < S.scratchR) { sc.hit[id] = true; knock(st, id, (h.x >= sc.x ? 1 : -1) * 230, -170); st.stats.brushed++; rageUp(st, S.rage.brush); bad(st, NAMES[id] + ' got brushed off! Crouch ▼ when the hand comes'); }
          }
        }
        if (sc.t > S.scratchTell + S.scratchT) { st.scratch = null; st.scratchT = S.scratchEvery; }
      }
    }
    // low arches (stretch 4)
    if (st.k === 3) {
      if (!st.arch) { st.archT -= dt; if (st.archT <= 0) { st.arch = { t: 0, hit: [false, false] }; Sfx.play('cavegolemArchHorn'); } }
      else {
        const a = st.arch; a.t += dt;
        if (a.t >= S.archTell && a.t < S.archTell + S.archT) {
          if (!a.scr) { a.scr = true; Sfx.play('cavegolemArchScrape'); G.shake = 0.25; }
          for (let id = 0; id < 2; id++) {
            const h = st.h[id];
            if (a.hit[id] || h.mode === 'tumble' || h.crouch || h.y > S.archY || (h.mode === 'climb' && h.hold)) continue;
            a.hit[id] = true; knock(st, id, -200, -100); st.stats.brushed++; rageUp(st, S.rage.brush); bad(st, NAMES[id] + ' was swept off by the arch! Crouch ▼ under it');
          }
        }
        if (a.t > S.archTell + S.archT) { st.arch = null; st.archT = S.archEvery; }
      }
    }
    // the fist
    const ap = armPose(st.gt);
    if (ap.closed && !st.fistOn) { st.fistOn = true; Sfx.play('cavegolemFist'); for (let id = 0; id < 2; id++) { const h = st.h[id]; if (h.mode === 'stand' && SURF[h.s].n === 'arm' && h.lx > S.palm) { knock(st, id, 160, -260); st.stats.fisted++; bad(st, NAMES[id] + ' got squeezed out of the hand! Off the palm before it closes'); } } }
    if (!ap.closed) st.fistOn = false;
    // geysers (stretch 3 on, Rage above half)
    if (st.k >= 2) {
      st.geyT += dt;
      const ph = st.geyT % S.geyserEvery, venting = st.rage > 0.5 && ph > S.geyserTell && ph < S.geyserTell + S.geyserT;
      if (st.rage > 0.5 && ph < dt * 1.5) Sfx.play('cavegolemGeyserHiss');
      st.venting = venting;
      if (venting) for (const g of GEYSERS) for (let id = 0; id < 2; id++) { const h = st.h[id]; if (h.mode === 'stand' && SURF[h.s].n === g[0] && Math.abs(h.lx - g[1]) < 22) { knock(st, id, (Math.random() - 0.5) * 80, -420); Sfx.play('cavegolemGeyser'); st.stats.geysered++; } }
    }
    // roof crystals (stretches 2 and 4)
    if (st.k === 1 || st.k === 3) {
      st.roofT -= dt;
      if (st.roofT <= 0) {
        st.roofT = S.roofEvery; Sfx.play('cavegolemRoofTinkle'); G.shake = 0.15;
        for (let id = 0; id < 2; id++) { const h = st.h[id]; if (h.mode === 'stand') st.drops.push({ s: h.s, lx: h.lx + (Math.random() - 0.5) * 40, t: 0 }); }
      }
      for (const d of st.drops) {
        d.t += dt;
        if (!d.hit && d.t >= S.roofTell) {
          d.hit = true; Sfx.play('cavegolemRoofHit');
          for (let id = 0; id < 2; id++) { const h = st.h[id]; if (h.mode === 'stand' && h.s === d.s && Math.abs(h.lx - d.lx) < 24 && !inHollow(h)) { h.stunT = 0.8; st.stats.bonks++; rageUp(st, S.rage.bonk); Sfx.play('cavegolemBonk'); bad(st, NAMES[id] + ' got bonked by a roof crystal! Step away from the marker'); } }
        }
      }
      st.drops = st.drops.filter(d => d.t < S.roofTell + 0.5);
    }
    // mites pinch anyone walking into them
    if (sh && sh.mite) {
      const m = spotXY(st, sh.ear, 0);
      for (let id = 0; id < 2; id++) { const h = st.h[id]; if (h.mode === 'stand' && Math.abs(h.x - m.x) < 12 && Math.abs(h.y - m.y) < 10 && st.T - h.landT > 0.2 && h.knockT <= 0) { knock(st, id, h.x < m.x ? -130 : 130, -160, 0.25); Sfx.play('cavegolemMitePinch'); K.hintOnce(st, 'pinch' + id, id, 'Ouch! Jump onto the mite to pop it', 2.2); } }
    }
  }
  const GEYSERS = [['rib', 170], ['shoulder', 60], ['belt', -120], ['crown', 40]];

  /* ---------- pulling, ringing, heaving ---------- */
  function shardStep(st, dt) {
    const sh = curShard(st); if (!sh) return;
    const P = st.h[st.puller], Sh = st.h[st.soother];
    const ringing = Sh.ring;
    if (ringing) { st.ringT = st.T; st.ringSnd = (st.ringSnd || 0) - dt; if (st.ringSnd <= 0) { st.ringSnd = 0.9; Sfx.play('cavegolemRing'); } }
    if (P.pull && !sh.loose) {
      const was = sh.prog;
      sh.prog = Math.min(sh.bars, sh.prog + dt / S.pullT);
      st.pullSnd = (st.pullSnd || 0) - dt; if (st.pullSnd <= 0) { st.pullSnd = 0.5; Sfx.play('cavegolemPull'); }
      if (!ringing) rageUp(st, S.rage.pull * dt);
      // a flinch at each third of a bar
      const th = Math.floor(sh.prog * 3 + 1e-6), th0 = Math.floor(was * 3 + 1e-6);
      if (th > th0 && sh.prog < sh.bars - 1e-6) {
        if (ringing) { st.stats.soothed++; Sfx.play('cavegolemSoothed'); K.pop(st, X0 + Sh.x, scrY(st, Sh.y) - 56, 'Shh...', '#bff8ef', 15); }
        else { st.stats.flinches++; rageUp(st, S.rage.flinch); Sfx.play('cavegolemFlinch'); G.shake = 0.2; knock(st, st.puller, (P.x >= 0 ? 1 : -1) * 70, -210); bad(st, 'It flinched! Ring the chime while ' + NAMES[st.puller] + ' pulls'); }
      }
      if (sh.prog >= sh.bars - 1e-6) {
        if (sh.big) { sh.loose = true; Sfx.play('cavegolemLoose'); K.msg(st, 'It\'s loose! Both of you: HEAVE together', '#ffffff', 2.6); }
        else shardOut(st, sh);
      }
    }
    // heave: both near the loose shard press the action within 0.5 s of each other
    if (sh.loose) {
      const p = spotXY(st, sh.at, 30);
      for (let id = 0; id < 2; id++) if (G.players[id].pendingAct && st.h[id].mode !== 'air' && st.h[id].mode !== 'tumble' && dist(heroC(st.h[id]), p) < S.heaveR) { st.heave[id] = st.T; Sfx.play('cavegolemHeaveGrunt', id); }
      if (Math.abs(st.heave[0] - st.heave[1]) <= S.heaveWin && st.T - Math.max(st.heave[0], st.heave[1]) < 0.05) { st.heave = [-9, -9]; st.stats.heaves++; Sfx.play('cavegolemHeave'); shardOut(st, sh); }
    }
  }
  function shardOut(st, sh) {
    sh.out = true; st.pulled++; st.stats.shards++;
    const p = spotXY(st, sh.at, 30);
    Sfx.play('cavegolemShardOut'); Sfx.play('caveGolemSigh');
    K.spark(st, X0 + p.x, scrY(st, p.y), 14, [K.GLOW.teal, '#ffffff']);
    st.flyShards.push({ x: p.x, y: p.y, vx: (p.x >= 0 ? 1 : -1) * 260, vy: -380, r: 0, t: 0 });
    st.rage = Math.max(0, st.rage - 0.25);
    K.pop(st, X0 + p.x, scrY(st, p.y) - 40, 'Shard out! ' + st.pulled + ' of 12', '#ffffff', 18);
    if (st.pulled === 4) Music.cue({ song: 'cavegolem1' }); else if (st.pulled === 8) Music.cue({ song: 'cavegolem2' }); else if (st.pulled === 12) Music.cue({ song: 'cavegolem3' });
    st.cur++;
    st.scratch = null; st.scratchT = Math.max(st.scratchT, 5);
    if (st.cur >= st.shards.length) {
      st.stats.roomT[st.k] = G.time - st.segStart;
      if (st.k === 3) { st.state = 'sit'; st.sitT = 0; st.sit = 0; st.calmEnd = 0; Sfx.play('caveGolemSigh'); }
      else { st.state = 'end'; st.endT = 0; Sfx.play('caveSting'); K.pop(st, W / 2, 170, st.title + ' done!', '#ffffff', 22); }
    }
  }
  function rageStep(st, dt) {
    const ringing = st.h[st.soother].ring;
    if (ringing) st.rage = Math.max(0, st.rage - S.ringDrain * dt);
    else if (!st.h[st.puller].pull) st.rage = Math.max(0, st.rage - S.idleDrain * dt);
  }
  function tantrum(st) {
    st.state = 'tantrum'; st.tantT = 0; st.stats.tantrums++;
    Sfx.play('cavegolemTantrum'); Sfx.play('caveGolemGroan'); G.shake = 0.8;
    K.msg(st, 'TANTRUM! It shakes you both off. Soothe it before it gets that angry', '#ffd0c8', 3);
    const sh = curShard(st); if (sh) { sh.prog = 0; sh.loose = false; }
    for (let id = 0; id < 2; id++) knock(st, id, (st.h[id].x >= 0 ? 1 : -1) * 200, -320, 2);
    bad(st);
  }
  function tantrumStep(st, dt) {
    st.tantT += dt;
    for (const h of st.h) if (h.mode === 'air') { h.vy += S.grav * dt; h.x += h.vx * dt; h.y += h.vy * dt; if (h.y > -6) { h.mode = 'tumble'; h.tumbleT = 9; h.y = 0; } }
    if (st.tantT > S.tantrumT) {
      st.state = 'go'; st.rage = 0.3; st.scratch = null; st.arch = null; st.drops = [];
      for (const id of [0, 1]) spawn(st, id);
      K.msg(st, 'Back on at the base of ' + st.title + '. Ring first, then pull!', '#ffffff', 2.4);
    }
  }
  function gemStep(st) {
    for (const g of st.gemsHere) {
      if (g.got) continue;
      const p = gemXY(st, g);
      for (let id = 0; id < 2; id++) {
        const h = st.h[id]; if (h.mode === 'tumble') continue;
        if (dist(heroC(h), p) < 28) { g.got = true; st.gotGem[g.id] = true; st.gems++; Sfx.play('caveGem', 1 + st.gems * 0.02); K.spark(st, X0 + p.x, scrY(st, p.y), 8, [K.GLOW.teal, '#ffffff']); K.pop(st, X0 + p.x, scrY(st, p.y) - 24, 'Gem!', '#bff8ef', 15); break; }
      }
    }
  }
  const gemXY = (st, g) => { const s = SURF[SI[g.sp[0]]]; return s.kind === 'ledge' ? world(st, s.part, g.sp[1], s.y - 22) : world(st, s.part, (s.x0 + s.x1) / 2, g.sp[1]); };

  /* ---------- the end of a stretch, and the finale ---------- */
  function endStep(st, dt) {
    st.endT += dt; st.gt += dt; st.wx += S.golemV * dt;
    for (const h of st.h) place(st, h);
    if (st.endT > 2.2) nextRoom();
  }
  function sitStep(st, dt) {
    st.sitT += dt;
    const t = st.sitT;
    // the golem sits down (ride it down), its eyes turn teal, the cavern lights up; Pip and Bo end up on its palm
    st.sit = K.smooth(clamp(t / 2.4, 0, 1));
    st.calmEnd = K.smooth(clamp((t - 1) / 2, 0, 1));
    if (t > 2.6 && !st.onPalm) { st.onPalm = true; Sfx.play('caveCrystalRing', 1); for (let id = 0; id < 2; id++) { const h = st.h[id]; h.mode = 'palm'; h.face = 1; } K.msg(st, 'It\'s calm! ...Wait. That shard is a TOOTH', '#ffffff', 3); }
    if (t > 4.4 && !st.cracked) { st.cracked = true; Sfx.play('cavegolemWallCrack'); G.shake = 0.5; }
    if (t > 5.8 && !st.cleared) { st.cleared = true; G.level.goal = { x: W / 2, y: 300 }; levelClear(); }
  }

  /* ---------- the camera: frames both heroes ---------- */
  function camera(st, dt) {
    const ys = st.h.map(h => (h.mode === 'tumble' ? -200 : h.y - 30));
    let want = (ys[0] + ys[1]) / 2;
    if (st.state === 'sit') want = -1000 + st.sit * 300;
    want = clamp(want, -1440, -250);
    st.camY = st.camY === undefined ? want : approach(st.camY, want, Math.max(120, Math.abs(want - st.camY) * 3) * dt);
  }
  const scrY = (st, y) => H / 2 + (y - st.camY) + (st.sit ? st.sit * 300 : 0);
  function mirror(st) { for (let id = 0; id < 2; id++) { const h = st.h[id]; K.place(id, X0 + h.x, scrY(st, h.mode === 'tumble' ? -10 : h.y)); } }

  /* ---------- what to do next (the prompts, the HUD chips and the brain all read this) ---------- */
  // the path from a hero's surface to a goal surface (breadth-first over ledges, climbs and the arm lift)
  function nextSurf(from, to) {
    if (from === to) return to;
    const prev = { [from]: -1 }, q = [from];
    while (q.length) {
      const a = q.shift();
      for (const b of links(a)) if (prev[b] === undefined) { prev[b] = a; if (b === to) { let c = b; while (prev[c] !== from) c = prev[c]; return c; } q.push(b); }
    }
    return null;
  }
  const LINKS = (() => {
    const L = SURF.map(() => []);
    for (const c of CLIMBS) { const u = SI[c.up], d = SI[c.down]; L[c.i].push(u, d); L[u].push(c.i); L[d].push(c.i); }
    L[SI.belt].push(SI.arm); L[SI.shoulder].push(SI.arm); L[SI.arm].push(SI.belt, SI.shoulder);
    return L;
  })();
  const links = a => LINKS[a];
  // how to take one step toward a goal [surface name, local x]: {k: 'walk', x} (a local x on this ledge), 'up', 'down',
  // 'wait' (at x), or 'here'
  function move(st, h, goal) {
    const gs = SI[goal[0]], s = SURF[h.s];
    if (h.mode !== 'stand' && h.mode !== 'climb') return { k: 'none' };
    if (h.s === gs && h.mode === 'stand') return Math.abs(h.lx - goal[1]) < 5 ? { k: 'here' } : { k: 'walk', x: goal[1] };
    const n = nextSurf(h.s, gs); if (n === null) return { k: 'none' };
    const t = SURF[n];
    if (h.mode === 'climb') return { k: t.n === s.up ? 'up' : 'down' };
    const ap = armPose(st.gt);
    if (t.n === 'arm') {
      // board the lift at the end of the belt (bottom pause) or of the shoulder (top pause)
      const ready = s.n === 'belt' ? ap.ph === 'bottom' && ap.pauseLeft > 0.45 : ap.ph === 'top' && ap.pauseLeft > 0.45;
      const edge = s.n === 'belt' ? 203 : 200;
      if (ready && Math.abs(h.lx - edge) < 30) return { k: 'walk', x: s.x1 + 40, board: true };
      return Math.abs(h.lx - edge) < 5 ? { k: 'wait', x: edge } : { k: 'walk', x: edge };
    }
    if (s.n === 'arm') {
      const ready = t.n === 'belt' ? ap.ph === 'bottom' && ap.pauseLeft > 0.25 : ap.ph === 'top' && ap.pauseLeft > 0.25;
      if (ready) return { k: 'walk', x: s.x0 - 40, board: true };
      return Math.abs(h.lx + 50) < 5 ? { k: 'wait', x: -50 } : { k: 'walk', x: -50 };
    }
    // a climb from this ledge: walk to its middle, then press up or down
    const o = world(st, t.part, (t.x0 + t.x1) / 2, s.y), x = o.x - origin(st, s).x;
    if (Math.abs(h.lx - x) > 6) return { k: 'walk', x };
    return { k: t.down === s.n ? 'up' : 'down' };
  }
  function plan(st) {
    if (st.planMemo && st.planMemo.n === G.tickN) return st.planMemo.p;
    const sh = curShard(st), out = { shard: sh, puller: st.puller, soother: st.soother, stompIn: stompIn(st), tell: stompIn(st) < tellT(st), goal: [null, null], mv: [null, null], hold: [false, false], crouch: [false, false], hop: [false, false], dodge: [0, 0], freeze: [false, false], gem: [null, null], act: [null, null] };
    const ap = armPose(st.gt); out.arm = ap;
    if (sh) {
      for (const id of [0, 1]) {
        const h = st.h[id];
        let g;
        if (sh.loose) g = [sh.at[0], sh.at[1] + (id === st.puller ? -14 : 14)];
        else if (id === st.puller) g = sh.at;
        else if (sh.mite) {
          // pop it from the near side, but not from a spot where ▲ would start a climb instead of a jump
          const e = spotXY(st, sh.ear, 0), es = SURF[SI[sh.ear[0]]], near = h.x > e.x ? 20 : -20;
          const okAt = lx => lx > es.x0 + 3 && lx < es.x1 - 3 && !CLIMBS.some(c => c.down === es.n && lx > c.x0 - 6 && lx < c.x1 + 6);
          g = [sh.ear[0], okAt(sh.ear[1] + near) ? sh.ear[1] + near : sh.ear[1] - near];
        }
        else g = sh.ear;
        // the palm shard: off the palm before the fist closes
        if (g[0] === 'arm' && g[1] > S.palm && (ap.fistIn < 1.2 || ap.closed)) g = ['arm', -10];
        // a gem on the ledge I am on (and not where I am going): pick it up first, unless it is time to act
        if (h.mode === 'stand' && !sh.loose && !(id === st.soother && st.h[st.puller].pull)) {
          const gm = st.gemsHere.find(q => !q.got && q.sp[0] === SURF[h.s].n && SURF[h.s].kind === 'ledge');
          const blocked = gm && sh.mite && sh.ear[0] === gm.sp[0] && Math.min(h.lx, gm.sp[1]) < sh.ear[1] + 14 && Math.max(h.lx, gm.sp[1]) > sh.ear[1] - 14; // (not past a mite)
          if (gm && !blocked && !(g[0] === gm.sp[0] && Math.abs(g[1] - gm.sp[1]) < 20)) { const gs2 = SURF[h.s]; g = [gm.sp[0], clamp(gm.sp[1], gs2.x0 + 4, gs2.x1 - 4)]; out.gem[id] = gm; }
        }
        out.goal[id] = g;
        out.mv[id] = move(st, h, g);
        const here = out.mv[id].k === 'here';
        if (out.gem[id]) out.act[id] = null;
        else if (sh.loose) out.act[id] = here ? 'heave' : null;
        else if (id === st.puller) out.act[id] = here || atShard(st, h) ? 'pull' : null;
        else if (sh.mite && here) out.act[id] = 'pop';
        else out.act[id] = here && atEar(st, h) ? 'ring' : null;
        // a stomp coming: hold on (a ringer away from a hollow hops instead)
        const safe = inHollow(h);
        if (out.stompIn < S.holdAhead && (h.mode === 'stand' || h.mode === 'climb') && !safe) {
          if (out.act[id] === 'ring' && h.mode === 'stand') out.hop[id] = out.stompIn < 0.3;
          else out.hold[id] = true;
        }
        // a scratch or an arch coming over: crouch
        const sc = st.scratch;
        if (sc && h.mode !== 'air' && sc.t > S.scratchTell - 0.45 && sc.t < S.scratchTell + S.scratchT && dist(heroC(h), sc) < S.scratchR + 30 && !safe) out.crouch[id] = true;
        const ar = st.arch;
        if (ar && h.mode !== 'air' && ar.t > S.archTell - 0.5 && h.y < S.archY + 40) out.crouch[id] = true;
        // (on a climb you cannot crouch: hold on flat against the rock instead)
        if (out.crouch[id] && h.mode === 'climb') { out.crouch[id] = false; out.hold[id] = true; }
        // crouching through a stomp: hold on as well (▼ + action)
        if (out.crouch[id] && out.stompIn < S.holdAhead && !safe) { out.hold[id] = true; out.hop[id] = false; }
        // roof crystals: step away
        for (const d of st.drops) if (!d.hit && h.mode === 'stand' && d.s === h.s && Math.abs(h.lx - d.lx) < 56) out.freeze[id] = true;
        {
          // roof crystals: step to the nearest spot clear of every marker on this ledge
          const ds = st.drops.filter(d => !d.hit && h.mode === 'stand' && d.s === h.s);
          if (ds.some(d => Math.abs(h.lx - d.lx) < 34)) {
            const s2 = SURF[h.s], clear = x => x > s2.x0 + 2 && x < s2.x1 - 2 && ds.every(d => Math.abs(x - d.lx) >= 36);
            const spots = ds.flatMap(d => [d.lx - 38, d.lx + 38]).filter(clear).sort((p, q) => Math.abs(p - h.lx) - Math.abs(q - h.lx));
            out.dodge[id] = spots.length ? Math.sign(spots[0] - h.lx) || 1 : 0;
          }
        }
        // geysers venting under me: step off
        if (st.k >= 2 && st.rage > 0.45 && h.mode === 'stand') for (const g2 of GEYSERS) if (SURF[h.s].n === g2[0] && Math.abs(h.lx - g2[1]) < 26) out.dodge[id] = h.lx >= g2[1] ? 1 : -1;
      }
    }
    out.scratch = st.scratch; out.arch = st.arch;
    // the puller only pulls while the ring will last through the next moment (not just before the ringer hops a stomp)
    if (sh) { const so = st.h[st.soother]; out.ringSafe = so.ring && (inHollow(so) || out.stompIn > 0.4); }
    st.planMemo = { n: G.tickN, p: out };
    return out;
  }

  /* ---------- drawing ---------- */
  const SX = x => X0 + x;
  function draw(st) {
    const t = st.clock, calm = calmNow(st), dy = st.sit ? st.sit * 300 : 0, cy = st.camY - dy;
    K.back(st.wx, cy * 0.5, t, { zone: 'cavern', par: 0.4, bright: 0.6 + 0.4 * calm });
    // the arch coming over (stretch 4): a low rock arch in the backdrop sliding in from the right
    if (st.arch) { const u = st.arch.t / (S.archTell + S.archT), ax = W + 200 - u * (W + 500), ay = scrY(st, S.archY - 60); ctx.fillStyle = '#28383e'; ctx.beginPath(); ctx.moveTo(ax - 260, -20); ctx.lineTo(ax + 260, -20); ctx.lineTo(ax + 220, ay); ctx.quadraticCurveTo(ax, ay + 50, ax - 220, ay); ctx.closePath(); ctx.fill(); K.stalactites(ax - 200, ax + 200, ay + 10, { seed: 4 }); }
    // the cavern floor: glow-mushrooms scrolling by
    const fy = scrY(st, 0);
    if (fy < H + 100) {
      ctx.fillStyle = '#1c3a40'; ctx.fillRect(0, fy, W, H - fy + 40);
      const off = ((st.wx % 300) + 300) % 300;
      K.mushrooms(-off - 40, W + 300, fy + 4, t, { seed: Math.floor(st.wx / 300) * 3, s: 1.2, squish: st.squish });
      // the lift that brought them down, left behind on the floor (stretch 1)
      if (st.k === 0) { const lx = SX(-470) - st.T * S.golemV; if (lx > -500) { ctx.fillStyle = '#7a5230'; ctx.fillRect(lx, fy - 16, 420, 14); ctx.fillStyle = '#5a3a1c'; ctx.fillRect(lx, fy - 50, 6, 40); ctx.fillRect(lx + 414, fy - 50, 6, 40); } }
    }
    drawGolem(st, t, calm, false);
    // the pool (stretch 3): glowing water up to the shins
    if (st.k === 2) { const py = scrY(st, S.pool); if (py < H) { ctx.fillStyle = 'rgba(79,232,214,0.22)'; ctx.fillRect(0, py, W, H - py + 20); ctx.strokeStyle = 'rgba(223,246,255,0.6)'; ctx.lineWidth = 2; ctx.beginPath(); for (let x = 0; x <= W; x += 16) ctx.lineTo(x, py + Math.sin(x * 0.05 + t * 3) * 3); ctx.stroke(); } }
    K.drawGlitter(st, 0, 0);
  }
  const calmNow = st => (st.state === 'sit' ? K.lerp(0.5, 1, st.calmEnd || 0) : clamp((1 - st.rage) * (0.15 + 0.6 * st.pulled / 12), 0, 1));
  // a block of a part: corners through world(), so the legs shear and the arm moves
  function quad(st, part, x0, x1, ya, yb, o = {}) {
    const p = [world(st, part, x0, ya), world(st, part, x1, ya), world(st, part, x1, yb), world(st, part, x0, yb)];
    const g = ctx.createLinearGradient(SX(p[0].x), 0, SX(p[1].x), 0);
    g.addColorStop(0, o.dark ? '#4a5260' : '#7a8494'); g.addColorStop(1, o.dark ? '#323844' : '#535c6a');
    ctx.fillStyle = g; ctx.beginPath(); p.forEach((q, n) => (n ? ctx.lineTo(SX(q.x), scrY(st, q.y)) : ctx.moveTo(SX(q.x), scrY(st, q.y)))); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#2a303a'; ctx.lineWidth = 3; ctx.stroke();
    return p;
  }
  function drawLeg(st, k, t, calm, dark) {
    const P = 'leg' + k;
    quad(st, P, -46, 46, -720, -440, { dark });
    quad(st, P, -40, 40, -440, -120, { dark });
    const f = quad(st, P, -60, 82, -120, 0, { dark });
    // a moss strip for the climbs, the knee cap, crystal studs
    const sh = !dark ? 1 : 0.6;
    for (let y = -690; y < -130; y += 26) { const o = world(st, P, 0, y); ctx.fillStyle = `rgba(110,170,80,${0.85 * sh})`; ctx.beginPath(); ctx.ellipse(SX(o.x) + Math.sin(y) * 5, scrY(st, o.y), 15, 10, 0, 0, TAU); ctx.fill(); }
    const kc = world(st, P, 0, -440); K.crystal(SX(kc.x) + 30, scrY(st, kc.y) + 20, 26, 0.5, { col: K.GLOW.teal, glow: 0.3 + calm * 0.6, t, seed: k * 7 });
    // the foot's shadow before it lands (the stomp tell)
    const lp = legPose(k, st.gt);
    if (!lp.stance && stompIn(st) < tellT(st) + 0.2) { const fx = SX((f[0].x + f[1].x) / 2), u = 1 - stompIn(st) / (tellT(st) + 0.2); ctx.fillStyle = `rgba(0,0,0,${0.15 + u * 0.35})`; ctx.beginPath(); ctx.ellipse(fx, scrY(st, 0) - 2, 70 + u * 40, 10, 0, 0, TAU); ctx.fill(); }
  }
  function drawGolem(st, t, calm, top) {
    void top;
    const rage = st.rage, crk = sh => (sh.out ? 1 : 0);
    // the far arm and far leg, in shadow
    { const a = armPose(st.gt + 5); const s = world(st, 'body', -40, -1110), e = { x: -40 - 120, y: a.y + bob(st.gt) }; ctx.strokeStyle = '#3a404c'; ctx.lineWidth = 60; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(SX(s.x), scrY(st, s.y)); ctx.lineTo(SX(e.x), scrY(st, e.y)); ctx.stroke(); ctx.lineCap = 'butt'; }
    drawLeg(st, 0, t, calm, true);
    // the belt of boulders, the torso, the neck and the head
    const B = (x0, x1, ya, yb, o) => { const a = world(st, 'body', x0, ya), b = world(st, 'body', x1, yb); K.golemBlock(SX(a.x), scrY(st, a.y), b.x - a.x, b.y - a.y, Object.assign({ t, calm }, o)); };
    B(-235, 230, -1150, -700, { seed: 2, crack: st.k >= 2 ? (st.shards && st.k === 2 ? crk(st.shards[0]) : 1) : 0 });
    // the heart crystal behind its rib of rock
    { const hc = world(st, 'body', 40, -960), beat = 0.5 + 0.5 * Math.sin(t * (2 + rage * 4)); const g = ctx.createRadialGradient(SX(hc.x), scrY(st, hc.y), 4, SX(hc.x), scrY(st, hc.y), 110); g.addColorStop(0, K.calmCol(calm, 0.55 * beat + 0.2)); g.addColorStop(1, K.calmCol(calm, 0)); ctx.fillStyle = g; ctx.fillRect(SX(hc.x) - 110, scrY(st, hc.y) - 110, 220, 220); K.crystal(SX(hc.x), scrY(st, hc.y) + 30, 70, 0, { col: calm > 0.5 ? K.GLOW.teal : K.GLOW.rose, glow: 0.5 + 0.5 * beat, t }); }
    for (let x = -230; x < 220; x += 76) { const a = world(st, 'body', x, -700); K.rock(SX(a.x), scrY(st, a.y) - 4, 80, 64, { seed: x, col: '#5e6876' }); }
    B(-60, 60, -1240, -1140, { seed: 5 });
    B(-145, 145, -1490, -1236, { seed: 9 });
    const fc = world(st, 'body', 62, -1350), eyeLook = st.scratch && st.scratch.t < S.scratchTell ? clamp((st.scratch.x - 62) / 200, -1, 1) : Math.sin(t * 0.4) * 0.5;
    K.golemFace(SX(fc.x), scrY(st, fc.y), 1.55, t, { calm, look: eyeLook, blink: (t % 5) < 0.12, roar: st.state === 'tantrum' ? 1 : 0, chuckle: st.state === 'sit' && st.sitT > 3 });
    // ear crystal on the side of the head (the head's own ear, not the chime ones)
    drawLeg(st, 1, t, calm, false);
    // the near arm: the upper arm from the shoulder, the forearm lift, the hand
    {
      const a = armPose(st.gt), sh = world(st, 'body', 160, -1110), el = world(st, 'arm', -90, 0), hd = world(st, 'arm', 40, 0);
      ctx.strokeStyle = '#6a7484'; ctx.lineWidth = 64; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(SX(sh.x), scrY(st, sh.y)); ctx.lineTo(SX(el.x), scrY(st, el.y) + 20); ctx.stroke();
      ctx.strokeStyle = '#2a303a'; ctx.lineWidth = 3; ctx.lineCap = 'butt';
      K.golemBlock(SX(el.x) - 10, scrY(st, el.y), 140, 44, { t, calm, seed: 21 });
      K.golemHand(SX(hd.x) - 6, scrY(st, hd.y) + 20, 0.9, t, { open: 1 - a.curl, calm });
    }
    drawSurfaces(st, t, calm);
    // cracks heal from red to teal as shards come out; Rage geysers hiss
    if (st.k >= 2 && st.rage > 0.5) for (const g of GEYSERS) { const s = SURF[SI[g[0]]], o = world(st, s.part, g[1], s.y), ph = st.geyT % S.geyserEvery; const sx = SX(o.x), sy = scrY(st, o.y); ctx.strokeStyle = '#ff6a4a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(sx - 10, sy + 2); ctx.lineTo(sx, sy + 8); ctx.lineTo(sx + 10, sy + 2); ctx.stroke(); if (ph < S.geyserTell && Math.random() < 0.5) K.part(st, sx, sy, (Math.random() - 0.5) * 20, -60, 0.5, 'rgba(255,220,200,0.6)', 3, 0, 'dot'); if (st.venting) for (let k = 0; k < 3; k++) K.part(st, sx + (Math.random() - 0.5) * 16, sy, (Math.random() - 0.5) * 40, -360 - Math.random() * 120, 0.5, k % 2 ? 'rgba(255,240,200,0.8)' : K.rgba(K.GLOW.gold, 0.8), 4, 0, 'star'); }
  }
  function drawSurfaces(st, t, calm) {
    for (const s of SURF) {
      if (s.kind === 'ledge') {
        if (s.n === 'arm') continue;
        const o = origin(st, s), x0 = SX(o.x + s.x0), x1 = SX(o.x + s.x1), y = scrY(st, o.y);
        ctx.fillStyle = s.part === 'body' ? '#8e98a6' : '#7e8896'; rr(x0, y, x1 - x0, 12, 5); ctx.fill();
        ctx.fillStyle = '#b8c2cc'; ctx.fillRect(x0 + 4, y, x1 - x0 - 8, 3);
        ctx.strokeStyle = '#2a303a'; ctx.lineWidth = 2; rr(x0, y, x1 - x0, 12, 5); ctx.stroke();
        if (s.hollow) { const h0 = SX(o.x + s.hollow[0]), h1 = SX(o.x + s.hollow[1]); ctx.fillStyle = 'rgba(10,14,20,0.75)'; ctx.beginPath(); ctx.moveTo(h0, y); ctx.lineTo(h0 + 4, y - 50); ctx.quadraticCurveTo((h0 + h1) / 2, y - 66, h1 - 4, y - 50); ctx.lineTo(h1, y); ctx.closePath(); ctx.fill(); ctx.strokeStyle = K.rgba(K.GLOW.teal, 0.35); ctx.lineWidth = 2; ctx.stroke(); }
      } else {
        const a = world(st, s.part, (s.x0 + s.x1) / 2, s.top), b = world(st, s.part, (s.x0 + s.x1) / 2, s.bot);
        if (s.part !== 'body') continue; // (the legs draw their own moss)
        if (s.look === 'rope') {
          ctx.strokeStyle = '#d8b878'; ctx.lineWidth = 3;
          for (const dx of [-12, 12]) { ctx.beginPath(); ctx.moveTo(SX(a.x) + dx, scrY(st, a.y)); ctx.lineTo(SX(b.x) + dx, scrY(st, b.y)); ctx.stroke(); }
          for (let y = a.y + 14; y < b.y; y += 22) { ctx.beginPath(); ctx.moveTo(SX(a.x) - 12, scrY(st, y)); ctx.lineTo(SX(a.x) + 12, scrY(st, y)); ctx.stroke(); }
        } else if (s.look === 'studs') {
          for (let y = a.y + 12; y < b.y; y += 24) { K.crystal(SX(a.x) + ((y / 24) % 2 ? -7 : 7), scrY(st, y) + 8, 16, 0, { col: K.GLOW.ice, glow: 0.3 + calm * 0.4, t, seed: y }); }
        } else {
          for (let y = a.y + 10; y < b.y; y += 24) { ctx.fillStyle = 'rgba(110,170,80,0.9)'; ctx.beginPath(); ctx.ellipse(SX(a.x) + Math.sin(y) * 5, scrY(st, y), 16, 11, 0, 0, TAU); ctx.fill(); }
        }
      }
    }
  }
  function drawThings(st, t, calm) {
    const sh = curShard(st);
    // ear crystals: the current one glows and rings
    if (st.shards) for (const s of st.shards) {
      if (s.out) continue;
      const cur = s === sh, e = spotXY(st, s.ear, 0), ex = SX(e.x), ey = scrY(st, e.y);
      K.crystal(ex, ey, cur ? 30 : 20, 0, { col: K.GLOW.teal, glow: cur ? 0.9 : 0.35, t, seed: s.n });
      if (cur) {
        const R = earR(st);
        ctx.strokeStyle = K.rgba(K.GLOW.teal, 0.3); ctx.setLineDash([4, 5]); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ex, ey - 30, R, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
        if (st.h[st.soother].ring) for (let k = 0; k < 3; k++) { const u = ((t * 1.2 + k / 3) % 1); ctx.strokeStyle = K.rgba(K.GLOW.teal, 0.7 * (1 - u)); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(ex, ey - 30, 14 + u * 90, 0, TAU); ctx.stroke(); }
      }
      if (cur && s.mite) drawMite(ex, ey - 6, t);
    }
    // shards: dark jagged thorns with a sick red glow; the current one has a marker and its pull bar
    if (st.shards) for (const s of st.shards) {
      if (s.out) continue;
      const cur = s === sh, p = spotXY(st, s.at, 30), x = SX(p.x), y = scrY(st, p.y) + (s.loose ? Math.sin(t * 30) * 2 : 0), big = s.big ? 1.5 : 1;
      const g = ctx.createRadialGradient(x, y, 2, x, y, 40 * big); g.addColorStop(0, 'rgba(255,80,60,0.45)'); g.addColorStop(1, 'rgba(255,80,60,0)'); ctx.fillStyle = g; ctx.fillRect(x - 40 * big, y - 40 * big, 80 * big, 80 * big);
      drawShard(x, y, big * (cur ? 1 : 0.8), t);
      if (cur && G.introT <= 0) {
        const bw = 60, by = y - 44 * big;
        ctx.fillStyle = 'rgba(23,25,29,0.8)'; rr(x - bw / 2 - 3, by - 3, bw + 6, 12, 6); ctx.fill();
        ctx.fillStyle = s.loose ? C.gold : '#ff8a6a'; rr(x - bw / 2, by, bw * (s.prog / s.bars), 6, 3); ctx.fill();
        for (let k = 1; k < s.bars * 3; k++) { ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(x - bw / 2 + bw * k / (s.bars * 3) - 0.5, by, 1, 6); }
        if (s.loose) text('HEAVE!', x, by - 12, 13, C.gold, 'center', 'body');
      }
    }
    // shards flying off
    for (const f of st.flyShards) drawShard(SX(f.x), scrY(st, f.y), 1, t, f.r);
    // the scratching hand
    if (st.scratch) {
      const sc = st.scratch, u = sc.t < S.scratchTell ? sc.t / S.scratchTell : 1, sw = sc.t >= S.scratchTell ? (sc.t - S.scratchTell) / S.scratchT : 0;
      const hx = SX(sc.x) + 200 - sw * 400, hy = scrY(st, sc.y) - 160 * (1 - u) * (sw > 0 ? 0 : 1) - (sw > 0 ? 0 : 0);
      if (sw === 0) { ctx.strokeStyle = 'rgba(255,90,70,0.6)'; ctx.setLineDash([6, 6]); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(SX(sc.x), scrY(st, sc.y), S.scratchR, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
      K.golemHand(hx, hy, 1.1, t, { open: 0.6, calm, flip: true, ang: sw > 0 ? -0.3 : 0.4 });
    }
    // roof crystals falling on their markers
    for (const d of st.drops) {
      const s = SURF[d.s], o = world(st, s.part, d.lx, s.kind === 'ledge' ? s.y : s.top), x = SX(o.x), y = scrY(st, o.y), u = clamp(d.t / S.roofTell, 0, 1);
      ctx.strokeStyle = 'rgba(255,210,90,0.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y - 2, 18, 5, 0, 0, TAU); ctx.stroke();
      if (!d.hit) K.crystal(x, K.lerp(-30, y - 10, u * u), 26, Math.PI, { col: K.GLOW.ice, glow: 0.6, t });
    }
    // gems
    if (st.gemsHere) for (const g of st.gemsHere) if (!g.got) { const p = gemXY(st, g); K.gem(SX(p.x), scrY(st, p.y), 8, t, { col: K.GLOW.teal }); }
  }
  function drawShard(x, y, s, t, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot || -0.4); ctx.scale(s, s);
    ctx.fillStyle = '#1e1a20'; ctx.beginPath(); ctx.moveTo(-6, 16); ctx.lineTo(-10, -4); ctx.lineTo(-3, -6); ctx.lineTo(0, -30); ctx.lineTo(5, -8); ctx.lineTo(11, -10); ctx.lineTo(7, 16); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#ff6a4a'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.beginPath(); ctx.moveTo(-1, -24); ctx.lineTo(2, -8); ctx.lineTo(-2, -6); ctx.closePath(); ctx.fill();
    if (Math.sin(t * 3 + x) > 0.6) { ctx.fillStyle = 'rgba(160,150,150,0.5)'; circle(4, -34 - (t * 20 % 10), 3); ctx.fill(); }
    ctx.restore();
  }
  function drawMite(x, y, t) {
    const b = Math.abs(Math.sin(t * 8)) * 2;
    ctx.fillStyle = '#9fe0e0'; ctx.beginPath(); ctx.ellipse(x, y - 8 - b, 12, 8, 0, Math.PI, TAU); ctx.fill();
    ctx.strokeStyle = '#2a4a50'; ctx.lineWidth = 2; ctx.stroke();
    for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + sd * 8, y - 8 - b); ctx.lineTo(x + sd * 14, y - 2); ctx.moveTo(x + sd * 4, y - 8 - b); ctx.lineTo(x + sd * 8, y); ctx.stroke(); ctx.beginPath(); ctx.arc(x + sd * 16, y - 14 - b, 4, 0, TAU); ctx.stroke(); }
    ctx.fillStyle = '#1a1c22'; circle(x - 4, y - 12 - b, 1.6); ctx.fill(); circle(x + 4, y - 12 - b, 1.6); ctx.fill();
  }
  function drawHeroes(st, t) {
    for (let id = 0; id < 2; id++) {
      const h = st.h[id];
      let x = SX(h.x), y = scrY(st, h.y), rot = 0, sy = 1;
      if (h.mode === 'tumble') { y = scrY(st, 0) - 20 - Math.abs(Math.sin((S.tumbleT - h.tumbleT) * 7)) * 60 * (h.tumbleT / S.tumbleT); rot = (S.tumbleT - h.tumbleT) * 8; st.squish = { x: x, a: 0.6 }; }
      if (h.mode === 'palm') { const hd = world(st, 'body', 250 + id * 40, -900); x = SX(hd.x); y = scrY(st, hd.y); }
      if (h.crouch) sy = 0.72;
      if (h.mode === 'climb') rot = Math.sin(h.walkPh) * 0.08;
      K.hero(id, x, y, { face: h.face, sy, rot, stun: h.stunT > 0, vy: h.mode === 'air' ? h.vy : 0 });
      // role props: brass tongs for the puller, a silver chime for the soother
      const fx = x + h.face * 14, fy = y - 18;
      if (id === st.puller) { ctx.strokeStyle = '#d8a83a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx + h.face * 16, fy - 6 + (h.pull ? Math.sin(t * 20) * 2 : 0)); ctx.moveTo(fx, fy); ctx.lineTo(fx + h.face * 16, fy + 4); ctx.stroke(); }
      else { ctx.strokeStyle = '#e8eef4'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(fx, fy + 6); ctx.lineTo(fx, fy - 4); ctx.moveTo(fx - 4, fy - 4); ctx.lineTo(fx - 4, fy - 16); ctx.moveTo(fx + 4, fy - 4); ctx.lineTo(fx + 4, fy - 16); ctx.moveTo(fx - 4, fy - 4); ctx.lineTo(fx + 4, fy - 4); ctx.stroke(); if (h.ring) { ctx.strokeStyle = K.rgba(K.GLOW.teal, 0.8); ctx.beginPath(); ctx.arc(fx, fy - 12, 8 + Math.sin(t * 30) * 2, 0, TAU); ctx.stroke(); } }
      if (h.hold && h.mode !== 'air') { ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y - 18, 22, 0, TAU); ctx.stroke(); }
      // off screen: an arrow at the edge
      if (y < 40 || y > H + 10) { const ay = clamp(y, 70, H - 90); ctx.fillStyle = PCOL[id]; ctx.beginPath(); if (y < 40) { ctx.moveTo(x, ay - 14); ctx.lineTo(x - 10, ay); ctx.lineTo(x + 10, ay); } else { ctx.moveTo(x, ay + 14); ctx.lineTo(x - 10, ay); ctx.lineTo(x + 10, ay); } ctx.closePath(); ctx.fill(); }
    }
    if (st.state === 'sit' && st.onPalm) {
      const p = world(st, 'body', 270, -950);
      drawShard(SX(p.x), scrY(st, p.y), 1.8, t, 0.2);
      text('a tooth...', SX(p.x), scrY(st, p.y) - 60, 14, '#ffffff', 'center', 'body');
    }
    if (st.cracked) { ctx.strokeStyle = 'rgba(255,240,200,0.9)'; ctx.lineWidth = 4; ctx.beginPath(); const cx = 80, cy = H / 2 - 40; ctx.moveTo(cx, cy - 120); ctx.lineTo(cx + 30, cy - 50); ctx.lineTo(cx - 10, cy); ctx.lineTo(cx + 40, cy + 60); ctx.lineTo(cx + 10, cy + 130); ctx.stroke(); }
  }
  function drawTop(st) { K.drawParts(st, 0); K.drawPops(st, 0, 0); }
  function fxTick(st, dt) {
    for (const f of st.flyShards) { f.t += dt; f.vy += 900 * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.r += dt * 8; }
    st.flyShards = st.flyShards.filter(f => f.t < 2);
    if (st.squish) { st.squish.a *= 1 - dt * 5; if (st.squish.a < 0.02) st.squish = null; }
  }

  /* ---------- HUD ---------- */
  function hud(st) {
    const big = hudBig(), z = big ? 1.35 : 1, play = G.mode === 'play' || G.mode === 'paused';
    let timeX0;
    {
      const fs = big ? 20 : 14, h = big ? 40 : 28, tm = fmtTime(G.time), sh = '✦ ' + st.pulled + ' / 12', n = '◆ ' + st.gems + ' / ' + S.gems;
      ctx.font = K.FONT(fs);
      const w = ctx.measureText(tm).width + ctx.measureText(sh).width + ctx.measureText(n).width + fs * 2 + 30, x0 = pill(W - 14, 12, w, h, 'right'), cy = 12 + h / 2 + 0.5;
      text(tm, x0 + 15, cy, fs, st.waiting ? '#aab' : C.paper, 'left', 'body');
      text(sh, x0 + 15 + ctx.measureText(tm).width + fs, cy, fs, '#ffd0c8', 'left', 'body');
      text(n, x0 + w - 15, cy, fs, '#bff8ef', 'right', 'body');
      timeX0 = x0;
    }
    K.drawMsg(st, st.waiting ? { text: K.BREAK, col: '#ffffff', t: 1, life: 2 } : st.msg, timeX0);
    K.drawMabel(st);
    if (!play || !st.h) return;
    // the Rage meter with the golem's face, the stomp foot and the arch horn
    {
      const w = 200 * z, hh = 12 * z, x = W / 2 - w / 2 + 14 * z, y = H - 40 * z;
      ctx.fillStyle = 'rgba(23,25,29,0.8)'; rr(x - 44 * z, y - 24 * z, w + 100 * z, 48 * z, 12 * z); ctx.fill();
      ctx.fillStyle = K.calmCol(1 - st.rage); circle(x - 24 * z, y + hh / 2, 13 * z); ctx.fill();
      ctx.fillStyle = '#1a1c22'; ctx.fillRect(x - 31 * z, y + hh / 2 - 3 * z, 4 * z, 3 * z); ctx.fillRect(x - 21 * z, y + hh / 2 - 3 * z, 4 * z, 3 * z);
      text('Rage', x, y - 9 * z, 11 * z, '#ffffff', 'left', 'body');
      K.meter(x, y, w, hh, st.rage, K.calmCol(1 - st.rage));
      const si = stompIn(st), tl = si < tellT(st), fx = x + w + 30 * z, fy = y + hh / 2;
      ctx.fillStyle = tl ? (Math.sin(G.clock * 16) > 0 ? '#ff8a6a' : '#ffd0c8') : 'rgba(255,255,255,0.5)';
      rr(fx - 10 * z, fy - 6 * z, 20 * z, 14 * z, 4 * z); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(fx, fy, 16 * z, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - si / S.step)); ctx.stroke();
      text(tl ? 'STOMP!' : 'stomp', fx, y - 9 * z, 10 * z, tl ? '#ffb4a0' : '#ffffff', 'center', 'body');
      if (st.arch && st.arch.t < S.archTell + S.archT) { K.horn(W / 2, 92 * z, z); text('Low arch! Crouch (or hold on, on a climb)', W / 2 + 24 * z, 92 * z, 13 * z, C.gold, 'left', 'body'); }
    }
    const pl = plan(st);
    for (let id = 0; id < 2; id++) {
      const role = id === st.puller ? 'puller' : 'soother', bx = K.panel(id, role, 210, 58, z), cy = bx.y + 27 * z, chh = 23 * z, cw = (bx.w - 24 * z - 12 * z) / 3, x0 = bx.x + 12 * z, h = st.h[id];
      const kk = what => (K.quiet(id) ? '' : K.key(id, what) + ' ');
      const job = pl.act[id];
      K.chip(x0, cy, cw, chh, kk('act') + (id === st.puller ? (pl.shard && pl.shard.loose ? 'HEAVE' : 'PULL') : 'RING'), (job === 'pull' || job === 'ring' || job === 'heave') && !h.pull && !h.ring, h.pull || h.ring, z);
      K.chip(x0 + cw + 6 * z, cy, cw, chh, 'HOLD ON', pl.hold[id] && !h.hold && !h.pull, h.hold, z);
      K.chip(x0 + (cw + 6 * z) * 2, cy, cw, chh, kk('down') + 'CROUCH', pl.crouch[id] && !h.crouch, h.crouch, z);
    }
    if (G.introT > 0 || st.state !== 'go' || st.waiting) return;
    const P = K.prompter(st);
    for (let id = 0; id < 2; id++) {
      const h = st.h[id]; if (h.mode === 'tumble') continue;
      const x = SX(h.x), y = scrY(st, h.y) - 46;
      let s = null, pulse = false;
      const mv = pl.mv[id], sh = pl.shard;
      if (pl.crouch[id]) { s = (st.arch ? 'Arch! Crouch ' : 'The hand! Crouch ') + K.key(id, 'down'); pulse = true; }
      else if (pl.dodge[id]) { s = 'Step ' + K.key(id, pl.dodge[id] > 0 ? 'right' : 'left'); pulse = true; }
      else if (pl.hop[id]) { s = 'Stomp! Hop ' + K.key(id, 'jump'); pulse = true; }
      else if (pl.hold[id] && !h.hold && !h.pull) { s = 'Stomp! Hold on ' + K.key(id, 'act'); pulse = true; }
      else if (sh && sh.loose && pl.act[id] === 'heave') { s = 'HEAVE together! ' + K.key(id, 'act'); pulse = true; }
      else if (pl.act[id] === 'pull' && !h.pull) { s = (st.h[st.soother].ring ? 'Pull now! Hold ' : 'Pull (wait for the chime) ') + K.key(id, 'act'); pulse = st.h[st.soother].ring; }
      else if (pl.act[id] === 'ring' && !h.ring) { s = 'Ring the chime! Hold ' + K.key(id, 'act'); pulse = true; }
      else if (pl.act[id] === 'pop') { s = 'Jump on the mite ' + K.key(id, 'jump'); pulse = true; }
      else if (mv && mv.k === 'up') s = 'Climb ' + K.key(id, 'jump');
      else if (mv && mv.k === 'down') s = 'Climb down ' + K.key(id, 'down');
      else if (mv && mv.k === 'wait') s = 'Wait for the arm...';
      else if (mv && mv.board) s = 'Now! Hop on ' + K.key(id, mv.x > h.lx ? 'right' : 'left');
      else if (mv && mv.k === 'walk') s = (id === st.puller ? 'To the shard ' : 'To the teal crystal ') + K.key(id, mv.x > h.lx ? 'right' : 'left');
      P.say(id, s, x, y, C.gold, pulse);
    }
  }

  MODES.cavegolem = {
    medals: {
      bronze: 'Calm the Guardian',
      goals: [
        { key: 'time', gold: S.goldT, silver: S.silverT },
        { key: 'tumbles', gold: 0, silver: 4, word: 'Tumble' },
        { key: 'gems', gold: S.gems, silver: 12, more: true, word: 'glow gem' },
      ],
    },
    medalValues() { const st = G.mst; return { tumbles: st.stats ? st.stats.tumbles : 0, gems: st.gems || 0 }; },
    S, SURF, SI, plan, world, spotXY, armPose, legPose, stompIn, atShard, atEar, inHollow,
    setup(st, L) {
      st.stats = { shards: 0, tumbles: 0, tantrums: 0, soothed: 0, flinches: 0, brushed: 0, bonks: 0, shaken: 0, stomps: 0, fisted: 0, geysered: 0, heaves: 0, mites: 0, gems: 0, helps: 0, roomT: [] };
      st.gems = 0; st.gotGem = {}; st.rage = 0; st.pulled = 0; st.inT = [G.time, G.time]; st.personT = G.time; st.clock = 0; st.T = 0;
      st.gt = 0.4; st.wx = 0; st.h = [null, null]; st.flyShards = []; st.camY = undefined;
      for (const row of L.grid) row.fill('.');
      K.mabel(st, 'That\'s the Guardian. Something\'s hurting it. Don\'t make it madder!');
      room(st, L, 0);
      camera(st, 1);
    },
    room(k, L) { const st = G.mst; st.inT = [G.time, G.time]; st.personT = G.time; for (const row of L.grid) row.fill('.'); room(st, L, k); st.camY = undefined; camera(st, 1); },
    step(dt) { const st = G.mst; tick(st, dt); if (st.h) fxTick(st, dt); },
    draw() { const st = G.mst; if (!st.h) return; draw(st); drawThings(st, st.clock, calmNow(st)); drawHeroes(st, st.clock); K.hide(st); },
    drawTop() { const st = G.mst; K.unhide(st); if (st.h) drawTop(st); },
    hud() { const st = G.mst; if (st.h) hud(st); },
    stats() {
      const st = G.mst, s = st.stats;
      if (!s) return [];
      const out = [
        { label: 'Shards pulled', value: s.shards + ' of 12' },
        { label: 'Glow gems', value: st.gems + ' of ' + S.gems },
        { label: 'Tumbles', value: String(s.tumbles) },
      ];
      out.push('Tantrums: ' + s.tantrums + '. Flinches soothed: ' + s.soothed + '.');
      const hl = K.helpLine(s.helps); if (hl) out.push(hl);
      return out;
    },
  };

  /* ---------- the level ---------- */
  const legend = {
    pip: '<kbd>A</kbd><kbd>D</kbd> move <kbd>W</kbd> jump / climb <kbd>S</kbd> crouch',
    bo: '<kbd>←</kbd><kbd>→</kbd> move <kbd>↑</kbd> jump / climb <kbd>↓</kbd> crouch',
  };
  const acts = k => ({ label: 'hold on', labels: [k % 2 === 0 ? 'pull' : 'ring', k % 2 === 0 ? 'ring' : 'pull'] });
  CAVE.defs.cavegolem = {
    name: 'Sleeping Golem', world: 38, kind: 'team', mode: 'cavegolem', outfit: 'cavegolem', music: 'cavegolem0', amb: 'caveCavern',
    ownStep: true, ownHUD: true, noFalls: true, roomWord: 'Stretch',
    legend,
    tip: 'One rings the chime to calm it, one pulls the shard. Hold on when it stomps.',
    howTo: [
      'Hold the action to hold on tight. A stomp shakes off anyone who isn\'t.',
      'SOOTHER: ring the chime at the teal crystal. PULLER: pull the dark shard while it rings.',
      'The red face is its temper. Too angry and it shakes you both off.',
      'Climb moss, ropes and crystal studs with up and down. Crouch when its hand or a low arch comes.',
    ],
    act: acts(0),
    map: K.stubMap(),
    rooms: STRETCH.map((s, k) => ({ title: s.title, act: acts(k), tip: [
      'Pip pulls, Bo rings. The legs swing as it walks, and every footfall is a stomp: hold on!',
      'Bo pulls, Pip rings. Ride the arm up and down; it scratches at its shards, so crouch when the hand comes.',
      'Pip pulls, Bo rings. The floor is a glowing pool now. Get off the palm before the fist closes.',
      'Bo pulls, Pip rings. Crouch under the low arches. The crown shard needs three pulls and a heave!',
    ][k] })),
  };

  /* ---------- sounds ---------- */
  Sfx.extra.cavegolemStomp = function () { this.tone(46, 0.7, 'sine', 0.18, 28); this.noise(0.6, { type: 'lowpass', f: 300, to: 60, vol: 0.14 }); this.tone(2400, 0.4, 'triangle', 0.008, 2600, 0.05); };
  Sfx.extra.cavegolemStompTell = function () { this.tone(70, 0.9, 'sawtooth', 0.03, 120); this.noise(0.8, { type: 'lowpass', f: 200, to: 500, vol: 0.03, a: 0.5 }); };
  Sfx.extra.cavegolemShake = function () { this.noise(0.15, { f: 500, q: 1, vol: 0.04 }); this.tone(500, 0.15, 'triangle', 0.02, 300); };
  Sfx.extra.cavegolemJump = function () { this.tone(320, 0.1, 'triangle', 0.02, 540); };
  Sfx.extra.cavegolemLand = function () { this.noise(0.06, { type: 'lowpass', f: 700, vol: 0.03 }); };
  Sfx.extra.cavegolemGrip = function () { this.noise(0.05, { f: 1400, q: 2, vol: 0.02 }); };
  Sfx.extra.cavegolemPull = function () { this.tone(180, 0.35, 'sawtooth', 0.016, 150); this.noise(0.3, { f: 900, q: 3, vol: 0.02 }); };
  Sfx.extra.cavegolemFlinch = function () { this.tone(110, 0.4, 'sawtooth', 0.05, 70); this.noise(0.3, { type: 'lowpass', f: 600, vol: 0.06 }); };
  Sfx.extra.cavegolemRing = function () { this.tone(1318, 1.2, 'sine', 0.03); this.tone(1976, 0.9, 'sine', 0.012, null, 0.02); this.tone(2637, 0.5, 'sine', 0.006, null, 0.04); };
  Sfx.extra.cavegolemSoothed = function () { this.tone(880, 0.6, 'sine', 0.03, 660); this.tone(660, 0.8, 'sine', 0.02, null, 0.2); };
  Sfx.extra.cavegolemLoose = function () { this.tone(300, 0.2, 'square', 0.03, 200); this.noise(0.2, { f: 1200, q: 2, vol: 0.04 }); };
  Sfx.extra.cavegolemHeaveGrunt = function (id) { this.tone(id ? 300 : 240, 0.12, 'triangle', 0.025, id ? 220 : 180); };
  Sfx.extra.cavegolemHeave = function () { this.tone(200, 0.25, 'square', 0.04, 500); this.noise(0.4, { f: 600, to: 2400, q: 1, vol: 0.05 }); };
  Sfx.extra.cavegolemShardOut = function () { this.noise(0.12, { type: 'highpass', f: 2500, vol: 0.06 }); this.tone(1200, 0.08, 'square', 0.03, 300); this.tone(1568, 0.6, 'sine', 0.03, null, 0.1); };
  Sfx.extra.cavegolemTumble = function () { this.tone(500, 0.3, 'triangle', 0.03, 200); };
  Sfx.extra.cavegolemTantrum = function () { this.tone(60, 1.6, 'sawtooth', 0.1, 40); this.noise(1.5, { type: 'lowpass', f: 500, to: 120, vol: 0.12 }); this.tone(90, 1.2, 'square', 0.04, 55, 0.2); };
  Sfx.extra.cavegolemScratchTell = function () { this.tone(140, 1.2, 'sawtooth', 0.02, 220); this.noise(1.2, { type: 'lowpass', f: 300, to: 900, vol: 0.025, a: 0.8 }); };
  Sfx.extra.cavegolemScratch = function () { this.noise(0.8, { f: 400, to: 1600, q: 1, vol: 0.08 }); this.tone(90, 0.7, 'sawtooth', 0.04, 70); };
  Sfx.extra.cavegolemArchHorn = function () { this.tone(220, 0.5, 'sawtooth', 0.03, 220); this.tone(330, 0.5, 'sawtooth', 0.02, 330, 0.02); };
  Sfx.extra.cavegolemArchScrape = function () { this.noise(1.2, { type: 'bandpass', f: 500, q: 1, vol: 0.07, a: 0.2 }); };
  Sfx.extra.cavegolemFist = function () { this.tone(120, 0.25, 'square', 0.05, 70); this.noise(0.2, { type: 'lowpass', f: 800, vol: 0.06 }); };
  Sfx.extra.cavegolemGeyserHiss = function () { this.noise(0.7, { type: 'highpass', f: 3000, vol: 0.02, a: 0.5 }); };
  Sfx.extra.cavegolemGeyser = function () { this.noise(0.8, { f: 1600, to: 600, q: 0.8, vol: 0.08 }); };
  Sfx.extra.cavegolemRoofTinkle = function () { for (let k = 0; k < 5; k++) this.tone(2600 + Math.random() * 1400, 0.12, 'sine', 0.014, null, k * 0.09); };
  Sfx.extra.cavegolemRoofHit = function () { this.tone(1900, 0.2, 'triangle', 0.03, 900); this.noise(0.15, { type: 'highpass', f: 2200, vol: 0.04 }); };
  Sfx.extra.cavegolemBonk = function () { this.tone(1400, 0.2, 'triangle', 0.025, 2000); this.tone(1800, 0.25, 'triangle', 0.015, 2400, 0.08); };
  Sfx.extra.cavegolemMitePinch = function () { this.tone(2400, 0.04, 'square', 0.02, 1800); this.tone(2600, 0.04, 'square', 0.02, 2000, 0.06); };
  Sfx.extra.cavegolemMitePop = function () { this.tone(900, 0.08, 'square', 0.03, 1800); this.tone(2400, 0.2, 'sine', 0.02, null, 0.05); };
  Sfx.extra.cavegolemWallCrack = function () { this.noise(0.5, { type: 'bandpass', f: 1200, to: 300, q: 1.5, vol: 0.1 }); this.tone(70, 0.8, 'sine', 0.1, 40, 0.1); };
})();
