/* Pip & Bo - Level 36-3 Stunt Double Fall (team, World 36 Movie Studio). */
'use strict';

/* ===== 36-3 Stunt Double Fall (mode 'stuntfall', team, scrolls DOWN, Gavyn's pick) =====
   The big scene: the two stunt doubles fall off the top of a (fake) skyscraper. Hold hands to fall as one slow, wide
   shape and smash through the sugar glass; let go to dart through the narrow gaps in the REAL steel. Hit the props,
   miss the real steel, land on the airbag. No roles: both heroes play the same. ownStep + ownHUD + noFalls.
   World px: x as the screen (the building's face is S.X0..S.X1), y = depth fallen (down); st.camY is the camera.
   A hero's (x, y) is their middle.
   FALLING: always. ◀ ▶ steer (S.steer px/s), ▲ spread (fall x S.spread, steer a little faster), ▼ tuck (fall x S.tuck).
   HANDS (the action): within S.linkR px (gold help: S.goldLinkR) a tap by either links them (they snap S.gap px apart);
     linked they fall x S.linkMul, steer as one from the average of both inputs ("Pull together!" when they pull apart)
     and are STRONG. A tap by either lets go with a small push apart. The partner's tap within S.sameTap s of a link or
     a let-go counts as the same wish (two people pressing together don't undo each other).
   ROWS (st.rows, each at a depth y):
     glass   sugar glass (FAKE, pale, a paper edge and a PROP tag): a linked pair smashes it (+1 Smash, a 0.15 s slow-mo);
             a single hero bounces up and hangs S.hangT s (take meter -S.glassCost).
     beam    REAL steel across the shaft with one or two body-wide gaps (S.gapW): only a single hero fits a gap; steel or
             a linked pair is a Bonk (dazed S.daze s, take meter -S.bonkCost, a linked pair comes apart).
     boxes   window boxes or ledges, some foam (PROP: smash through, +1 style), some REAL (a Bonk).
     awning  FAKE, bouncy: throws whoever lands on it sideways about 180 px (its stripes point the way).
     pole    a flagpole out from the wall: spins a hero round and flings them away from the wall.
     fan     a crew fan on a balcony: a column of air pushing sideways (streamers), or UP (holds a hero up; it blows a
             linked pair apart).
     chute   a trapdoor chute (take 3 on): the hero nearer its middle drops in and shoots out far to one side lower down;
             the other bounces off the lid. Link again before the next glass.
     marker  a painted floor number: the checkpoints. Take meter empty: "CUT!", the film rewinds up the building to the
             last marker (a Retake).
     bag     the airbag at the bottom. Take 4's is a bullseye: the landing is scored (how near the middle, linked or not).
   SIGNPOSTS: the next glass or beam shows at the bottom edge S.iconT s before (0.9 s from take 3): two figures holding
     hands (glass) or apart (a gap).
   SAFETY WIRE: heroes more than S.sep px apart up and down: the upper one is winched down beside the other (meter cost).
     S.sep is less than the gap between two rows, so a hero stuck on a beam is brought down before the other reaches
     the next glass alone.
   STARS: 20 gold stars (5 a take), mostly inside the camera drone's frame (it drifts down alongside), some in the gaps.
     Both inside the drone frame lights its REC lamp (stats: seconds on camera).
   GOLD HELP (3 Bonks or bounces in a take, both playing, announced, counted): gold wrist ribbons, the link reaches
     S.goldLinkR px and pulls them together.
   IDLE: no person presses anything for 12 s: "Taking a break", the clock stops.
   MEDAL (MODES.stuntfall.medals, js/medals.js): Gold <= 185 s, Silver <= 290 s (a clean computer pair takes about 170 s).
   MODES.stuntfall.plan(st) says what each hero should do now (the prompts, HUD chips and the computer brain read it).
   Everything lives inside this block; sounds are Sfx.extra.stuntfall*. */
(() => {
  const K = STUDIO, TAU = Math.PI * 2;
  const S = {
    X0: 150, X1: 810, C: 480, steer: 260, steerSpread: 300, acc: 2200, linkR: 70, goldLinkR: 130, gap: 56, hw: 10, gapW: 64,
    fallAcc: 900, spread: 0.75, tuck: 1.3, linkMul: 0.75, heroY: 190, bounceV: -220, hangT: 0.8, bonkCost: 22, glassCost: 14,
    daze: 0.5, sameTap: 0.5, sep: 340, winchCost: 16, regen: 2, idleWait: 12, iconT: 1.2, iconT2: 0.9, goldT: 185, silverT: 290,
  };
  const TAKES = [
    { title: 'Rehearsal', v: 250 },
    { title: 'Wide Shot', v: 270 },
    { title: 'Close-Up', v: 290 },
    { title: 'The Money Shot', v: 300 },
  ];
  const PACE = 0.85; // a layout second is this many seconds of full-speed fall (linked falls are slower)
  const droneX = (st, y) => S.C + Math.sin(y / 900 + st.k * 1.7) * 170;

  /* ---------- a take's layout ----------
     at(t, row): a row t "seconds" down (y = t * v * PACE). Stars: { x (null = the drone's x there), y, got }. */
  function layout(st, k) {
    const v = TAKES[k].v, R = [], ST = [];
    const Y = t => Math.round(t * v * PACE);
    const at = (t, k2, o) => R.push(Object.assign({ k: k2, y: Y(t) }, o || {}));
    const glass = (t, o) => at(t, 'glass', Object.assign({ x0: S.X0, x1: S.X1, broken: false }, o));
    const beam = (t, gaps) => at(t, 'beam', { gaps });
    const boxes = (t, list) => at(t, 'boxes', { boxes: list.map(b => ({ x: b[0], w: b[2] || 62, real: !!b[1], hit: false })) });
    const marker = (t, n) => at(t, 'marker', { n });
    const star = (t, x) => ST.push({ x: x === undefined ? null : x, y: Y(t), got: false });
    if (k === 0) {
      marker(0, 12); glass(3); beam(7, [380, 580]); marker(8.5, 9); glass(11);
      boxes(14, [[260], [370, 1], [480], [590, 1], [700]]);
      marker(16, 6); beam(18, [300, 660]); glass(22); marker(24, 3); beam(26, [480]); glass(30);
      star(5); star(8.2, 380); star(8.2, 580); star(16.5); star(28);
    } else if (k === 1) {
      marker(0, 12); boxes(3, [[250, 1], [360], [480, 1], [600], [710, 1]]);
      at(6, 'awning', { x: 300, w: 130, dir: 1 }); marker(7.5, 9); glass(9);
      at(12, 'fan', { h: Y(1.2), x0: S.X0, x1: 480, dir: 1 });
      beam(15, [320, 640]); marker(16, 6); at(18, 'pole', { side: -1, len: 210 }); glass(21);
      boxes(24, [[330, 1, 110], [630, 0, 110]]); marker(25, 3); beam(27, [480]); glass(30);
      star(4.5, 600); star(7.2, 600); star(13); star(15.6, 640); star(25.5, 630);
    } else if (k === 2) {
      marker(0, 12); glass(3); beam(4.6, [360, 600]); glass(6.2); beam(7.8, [480]);
      marker(9, 9); at(11, 'chute', { x: 480, ox: 230, dy: Y(0.8), busy: 0 }); glass(13.5);
      marker(14.5, 6); boxes(16, [[260], [370, 1], [480], [590, 1], [700]]); glass(18); beam(19.6, [300, 660]); glass(21.2);
      marker(22.5, 3); at(24, 'chute', { x: 480, ox: 730, dy: Y(0.8), busy: 0 }); glass(26.5); beam(29, [400, 560]); glass(31);
      star(4.85, 360); star(4.85, 600); star(9.6); star(19.85, 660); star(27.2, 600);
    } else {
      marker(0, 12); glass(3); beam(5, [340, 620]); at(7, 'awning', { x: 640, w: 130, dir: -1 }); marker(7.5, 9); glass(9);
      boxes(11, [[250], [360, 1], [480], [600, 1], [710]]); at(13, 'pole', { side: 1, len: 210 }); beam(15, [480]);
      marker(15.5, 6); glass(17); at(19, 'chute', { x: 480, ox: 250, dy: Y(0.8), busy: 0 }); glass(21.5);
      marker(22, 3); at(24, 'fan', { h: Y(1.3), x0: 480, x1: S.X1, dir: 0 });
      glass(27, { triple: true }); glass(28.2, { triple: true }); glass(29.4, { triple: true });
      star(4, 480); star(5.25, 340); star(5.25, 620); star(12.4); star(23);
    }
    at(34, 'bag', { bull: k === 3 });
    R.sort((a, b) => a.y - b.y);
    R.forEach((r, i) => { r.i = i; });
    for (const s of ST) if (s.x === null) s.x = clamp(droneX(st, s.y), S.X0 + 30, S.X1 - 30);
    return { rows: R, stars: ST };
  }

  /* ---------- a take (one room) ---------- */
  function room(st, L, k) {
    st.k = k; st.title = L.def.title || TAKES[k].title; st.T = TAKES[k];
    st.goldUsed = false; st.gold = false;
    setActWords(['grab', 'grab']); K.actLabels(['grab', 'grab'], 'grab');
    const lay = layout(st, k);
    st.rows = lay.rows; st.starsL = lay.stars;
    st.bag = st.rows.find(r => r.k === 'bag');
    st.cp = st.rows[0];
    startFrom(st, st.cp, true);
    K.fx(st);
    st.intro = 1.6;
  }
  // (re)start the take from a floor marker (the rows below it are as new)
  function startFrom(st, cp, first) {
    for (const r of st.rows) if (r.y > cp.y) { r.broken = false; r.busy = 0; if (r.boxes) r.boxes.forEach(b => { b.hit = false; }); }
    st.hs = [0, 1].map(id => ({ id, x: S.C + (id === 0 ? -70 : 70), y: cp.y + 20, vx: 0, vy: 0, daze: 0, hang: 0, push: 0, pvx: 0, spin: 0, chute: 0, landed: false, face: id === 0 ? 1 : -1, mul: 1, upT: 0 }));
    st.link = null; st.linkT = -9; st.linkBy = -1; st.camY = cp.y + 20 - S.heroY; st.slow = 0;
    st.meter = 100; st.lastHit = -9; st.state = 'go'; st.endT = 0; st.cut = null;
    st.rc = st.rc && !first ? st.rc : { bad: 0 }; st.party = false; st.cleared = false; st.planMemo = null;
    st.land = null; st.rec = false;
    if (first) st.segStart = G.time;
  }
  const V = st => st.T.v;
  const pairY = st => (st.hs[0].y + st.hs[1].y) / 2;
  const linkR = st => (st.gold ? S.goldLinkR : S.linkR);

  /* ---------- the tick ---------- */
  function tick(st, dt) {
    if (!st.hs) return;
    K.track(st);
    st.waiting = st.state === 'go' && K.idle(st, dt, S.idleWait);
    const live = G.introT <= 0 && !st.waiting && st.state === 'go' && st.intro <= 1.0;
    st.clock += dt;
    if (st.intro > 0 && G.introT <= 0) { const i0 = st.intro; st.intro -= dt; if (i0 > 1.0 && st.intro <= 1.0) { Sfx.play('studioClap'); Sfx.play('studioAction'); K.pop(st, W / 2, 200, 'ACTION!', '#ffffff', 34); } }
    if (live) {
      let d2 = dt;
      if (st.slow > 0) { st.slow -= dt; d2 = dt * 0.3; }
      hands(st);
      { const w = st.link ? 'let go' : 'grab'; setActWords([w, w]); }   // (the action holds hands, then lets go)
      fall(st, d2);
      if (G.time - st.lastHit > 3) st.meter = Math.min(100, st.meter + S.regen * dt);
      if (st.meter <= 0) { st.state = 'cut'; st.stats.retakes++; K.retake(st); }
      if (st.hs.every(h => h.landed)) endTake(st);
    } else if (st.state === 'cut') {
      if (K.cutStep(st, dt) === 'done') { startFrom(st, st.cp, false); K.msg(st, 'From floor ' + st.cp.n + ' again. Action!', '#ffffff', 2.5); Sfx.play('studioAction'); }
    } else if (st.state === 'end') endStep(st, dt);
    for (const p of G.players) { p.pendingJump = false; p.pendingAct = false; }
    camera(st, dt);
    K.tickFx(st, dt);
    mirror(st);
  }
  function hands(st) {
    const [a, b] = st.hs;
    let press = [0, 1].filter(q => G.players[q].pendingAct && !st.hs[q].landed);
    // both heroes often tap for the same thing a moment apart: the partner's tap inside S.sameTap s of a link or a
    // let-go is that same wish, so it doesn't undo it
    if (st.clock - st.linkT < S.sameTap) press = press.filter(q => q === st.linkBy);
    if (!press.length) return;
    st.linkBy = press.length === 1 ? press[0] : -1;
    if (st.link) { unlink(st, 60); Sfx.play('stuntfallLetGo'); st.stats.lets++; return; }
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    if (d <= linkR(st) && !(a.chute > 0) && !(b.chute > 0) && a.daze <= 0 && b.daze <= 0) {
      st.link = { left: a.x <= b.x ? 0 : 1 }; st.linkT = st.clock; st.stats.links++;
      const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
      for (const h of st.hs) { h.y = cy; h.x = cx + (h.id === st.link.left ? -1 : 1) * S.gap / 2; h.hang = 0; h.push = 0; }
      a.vy = b.vy = (a.vy + b.vy) / 2;
      Sfx.play('studioClap'); K.spark(st, cx, cy - st.camY, 10, ['#ffffff', C.gold]);
    } else {
      for (const q of press) K.hint(st, q, d > linkR(st) ? 'Too far to hold hands: get closer!' : 'Not now!', 1.2);
    }
  }
  function unlink(st, push) {
    if (!st.link) return;
    const L = st.link.left;
    st.link = null; st.linkT = st.clock;
    for (const h of st.hs) { h.pvx = (h.id === L ? -1 : 1) * push; h.push = push ? 0.25 : 0; }
  }
  function steerOf(id) { const i = G.players[id].input; return (i.right ? 1 : 0) - (i.left ? 1 : 0); }
  function mulOf(id) { const i = G.players[id].input; return i.down && !i.up ? S.tuck : i.up && !i.down ? S.spread : 1; }
  function fall(st, dt) {
    const v0 = V(st);
    if (st.link) {
      const [a, b] = st.hs, ia = steerOf(0), ib = steerOf(1);
      const sd = (ia + ib) / 2, mul = (mulOf(0) + mulOf(1)) / 2 * S.linkMul;
      st.pulling = ia !== 0 && ib !== 0 && ia !== ib;
      const dz = a.daze > 0 || b.daze > 0;
      let vx = (a.vx + b.vx) / 2, vy = (a.vy + b.vy) / 2;
      if (a.push > 0 || b.push > 0) { vx = a.push > 0 ? a.pvx : b.pvx; a.push -= dt; b.push -= dt; }
      else vx = approach(vx, dz ? 0 : sd * S.steer, S.acc * dt);
      vx += fanPush(st, (a.x + b.x) / 2, (a.y + b.y) / 2, dt);
      const up = upFan(st, a) || upFan(st, b);
      if (up) { unlink(st, 120); Sfx.play('stuntfallFan'); K.pop(st, (a.x + b.x) / 2, a.y - st.camY - 60, 'The fan blew you apart!', '#ffffff', 18); fall(st, dt); return; }
      vy = approach(vy, v0 * mul, S.fallAcc * dt);
      let cx = (a.x + b.x) / 2 + vx * dt;
      cx = clamp(cx, S.X0 + S.hw + S.gap / 2, S.X1 - S.hw - S.gap / 2);
      const py = (a.y + b.y) / 2, ny = py + vy * dt;
      for (const h of st.hs) { h.vx = vx; h.vy = vy; h.x = cx + (h.id === st.link.left ? -1 : 1) * S.gap / 2; h.prevY = py; h.y = ny; h.face = sd || h.face; h.mul = mul; if (h.daze > 0) h.daze -= dt; }
      crossPair(st, py, ny);
    } else {
      st.pulling = false;
      for (const h of st.hs) {
        if (h.landed) continue;
        if (h.chute > 0) { h.chute -= dt; if (h.chute <= 0) popOut(st, h); continue; }
        if (h.daze > 0) h.daze -= dt;
        if (h.spin > 0) h.spin -= dt;
        const sd = h.daze > 0 || h.spin > 0 ? 0 : steerOf(h.id), mul = mulOf(h.id);
        h.mul = mul;
        if (h.push > 0) { h.push -= dt; h.vx = h.pvx; }
        else h.vx = approach(h.vx, sd * (mul < 1 ? S.steerSpread : S.steer), S.acc * dt);
        h.vx += fanPush(st, h.x, h.y, dt);
        if (sd) h.face = sd;
        const uf = upFan(st, h);
        if (!uf) { if (!st.rows.some(r => r.k === 'fan' && !r.dir && h.y > r.y - 40 && h.y < r.y + r.h)) h.upT = 0; }
        if (uf && h.upT < 0.9) { h.upT += dt; h.vy = approach(h.vy, -60, 1600 * dt); }
        else if (h.hang > 0) { h.hang -= dt; h.vy = approach(h.vy, 20, 900 * dt); }
        else h.vy = approach(h.vy, v0 * (h.spin > 0 ? 0.3 : mul), S.fallAcc * dt);
        h.x = clamp(h.x + h.vx * dt, S.X0 + S.hw, S.X1 - S.hw);
        h.prevY = h.y; h.y += h.vy * dt;
        crossOne(st, h, h.prevY, h.y);
      }
      winch(st);
    }
    stars(st);
  }
  function fanPush(st, x, y, dt) {
    let v = 0;
    for (const r of st.rows) if (r.k === 'fan' && r.dir && y > r.y && y < r.y + r.h && x > r.x0 && x < r.x1) v += r.dir * 1100 * dt;
    return v;
  }
  const upFan = (st, h) => st.rows.some(r => r.k === 'fan' && !r.dir && h.y > r.y && h.y < r.y + r.h && h.x > r.x0 && h.x < r.x1);
  // the rows crossed this tick, top first
  const crossed = (st, y0, y1) => st.rows.filter(r => r.y > y0 && r.y <= y1);
  function crossOne(st, h, y0, y1) {
    for (const r of crossed(st, y0, y1)) {
      if (h.chute > 0 || h.landed) return;
      if (r.k === 'marker') { if (r.y > st.cp.y) { st.cp = r; K.pop(st, S.X1 - 40, r.y - st.camY, 'Floor ' + r.n, '#ffffff', 16); } continue; }
      if (r.k === 'bag') { landOn(st, [h]); return; }
      if (r.k === 'glass' && !r.broken && h.x > r.x0 && h.x < r.x1) { bounce(st, h, r); return; }
      if (r.k === 'beam' && !inGap(r, h.x)) { bonk(st, [h], r, 'steel'); return; }
      if (r.k === 'boxes') {
        for (const b of r.boxes) if (Math.abs(h.x - b.x) < b.w / 2 + S.hw - 2) {
          if (b.real) { bonk(st, [h], r, 'box'); return; }
          if (!b.hit) { b.hit = true; st.stats.style++; Sfx.play('studioFoam'); K.foamBurst(st, b.x, r.y - st.camY, 8); K.pop(st, b.x, r.y - st.camY - 30, 'Foam! +style', '#ffd0e4', 16); }
        }
      }
      if (r.k === 'awning' && Math.abs(h.x - r.x) < r.w / 2) { fling(st, [h], r.dir, 0.55, 330, r); h.y = r.y - 2; return; }
      if (r.k === 'pole' && poleHit(r, h.x)) { spinOff(st, [h], r); return; }
      if (r.k === 'chute' && chuteTake(st, h, r)) return;
    }
  }
  function crossPair(st, y0, y1) {
    const [a, b] = st.hs;
    for (const r of crossed(st, y0, y1)) {
      if (r.k === 'marker') { if (r.y > st.cp.y) { st.cp = r; K.pop(st, S.X1 - 40, r.y - st.camY, 'Floor ' + r.n, '#ffffff', 16); } continue; }
      if (r.k === 'bag') { landOn(st, st.hs); return; }
      if (r.k === 'glass' && !r.broken && (a.x > r.x0 && a.x < r.x1 || b.x > r.x0 && b.x < r.x1)) { smash(st, r); continue; }
      if (r.k === 'beam') { bonk(st, st.hs, r, 'pair'); return; }
      if (r.k === 'boxes') {
        const hit = st.hs.map(h => r.boxes.find(bx => Math.abs(h.x - bx.x) < bx.w / 2 + S.hw - 2));
        if (hit.some(bx => bx && bx.real)) { bonk(st, st.hs, r, 'box'); return; }
        for (const bx of hit) if (bx && !bx.hit) { bx.hit = true; st.stats.style++; Sfx.play('studioFoam'); K.foamBurst(st, bx.x, r.y - st.camY, 8); K.pop(st, bx.x, r.y - st.camY - 30, 'Foam! +style', '#ffd0e4', 16); }
      }
      if (r.k === 'awning' && st.hs.some(h => Math.abs(h.x - r.x) < r.w / 2)) { fling(st, st.hs, r.dir, 0.55, 330, r); for (const h of st.hs) h.y = r.y - 2; return; }
      if (r.k === 'pole' && st.hs.some(h => poleHit(r, h.x))) { spinOff(st, st.hs, r); return; }
      if (r.k === 'chute' && st.hs.some(h => Math.abs(h.x - r.x) < 120)) {
        const inH = st.hs.slice().sort((p, q) => Math.abs(p.x - r.x) - Math.abs(q.x - r.x))[0];
        unlink(st, 0);
        chuteTake(st, inH, r);
        return;
      }
    }
  }
  const inGap = (r, x) => r.gaps.some(g => Math.abs(x - g) <= S.gapW / 2 - S.hw + 3);
  const poleHit = (r, x) => (r.side < 0 ? x < S.X0 + r.len : x > S.X1 - r.len);
  function bounce(st, h, r) {
    h.y = r.y - 2; h.vy = S.bounceV; h.hang = S.hangT; st.stats.bounces++;
    hurt(st, S.glassCost);
    Sfx.play('stuntfallBoing'); K.pop(st, h.x, r.y - st.camY - 40, ['Boing! Hold hands to smash it!', 'Boing!', 'Bounced!'][Math.min(2, st.stats.bounces - 1)], '#ffd0c8', 18);
    if (st.stats.bounces === 1) K.msg(st, 'Sugar glass only breaks for a linked pair: get together and hold hands!', '#ffd0c8', 3.2);
  }
  function smash(st, r) {
    r.broken = true; st.stats.smashes++; st.slow = 0.15;
    Sfx.play('studioGlass'); K.shatter(st, (S.X0 + S.X1) / 2, r.y - st.camY, S.X1 - S.X0);
    K.pop(st, (st.hs[0].x + st.hs[1].x) / 2, r.y - st.camY - 50, ['SMASH!', 'CRASH!', 'KER-SMASH!'][st.stats.smashes % 3], '#e8f6ff', 24);
  }
  function bonk(st, list, r, why) {
    // a second bonk on the same row within 1.5 s only blocks (no cost): the hero is still getting round it
    const again = list.every(h => h.bonkRow === r && st.clock - h.bonkT < 1.5);
    for (const h of list) { h.y = r.y - 2; h.vy = -260; h.hang = 0.5; h.daze = S.daze; h.bonkRow = r; h.bonkT = st.clock; }
    if (list.length === 2 && st.link) unlink(st, 110);
    if (again) return;
    st.stats.bonks++;
    hurt(st, S.bonkCost);
    G.shake = Math.max(G.shake || 0, 0.25);
    Sfx.play('studioCrash');
    const x = list.reduce((s, h) => s + h.x, 0) / list.length;
    K.pop(st, x, r.y - st.camY - 40, why === 'pair' ? 'BONK! Too wide together: let go for the gaps!' : 'BONK! That\'s REAL!', '#ffb0a0', 18);
    for (let q = 0; q < 6; q++) K.part(st, x + (Math.random() - 0.5) * 30, r.y - st.camY - 10, (Math.random() - 0.5) * 200, -100 - Math.random() * 100, 0.6, '#ffe58a', 3, 400, 'star');
  }
  function hurt(st, cost) {
    st.meter = Math.max(0, st.meter - cost); st.lastHit = G.time; st.rc.bad++;
    if (st.rc.bad >= 3 && !st.goldUsed && K.both(st)) { st.goldUsed = true; st.gold = true; K.goldHelp(st, 'Gold wrist ribbons! Hands reach further and pull you together'); }
  }
  function fling(st, list, dir, t, v, r) {
    for (const h of list) { h.push = t; h.pvx = dir * v; h.vy = -140; h.hang = 0; }
    Sfx.play('stuntfallBoing'); K.pop(st, r.x, r.y - st.camY - 30, 'Boing!', '#ffffff', 16);
    st.stats.bounceProps++;
  }
  function spinOff(st, list, r) {
    for (const h of list) { h.spin = 0.45; h.push = 0.9; h.pvx = -r.side * 360; h.vy = 0; h.y = r.y - 1; }
    Sfx.play('stuntfallSpin'); K.pop(st, list[0].x, r.y - st.camY - 30, 'Wheee! Round the flagpole!', '#ffffff', 16);
    st.stats.bounceProps++;
  }
  function chuteTake(st, h, r) {
    if (Math.abs(h.x - r.x) > 120) return false;
    if (r.busy > 0 && r.busy !== h.id + 1) { h.push = 0.4; h.pvx = (h.x < r.x ? -1 : 1) * 320; Sfx.play('stuntfallBoing'); return true; }
    r.busy = h.id + 1; h.chute = 0.5; h.cr = r; h.vx = 0;
    Sfx.play('stuntfallChute'); K.pop(st, r.x, r.y - st.camY - 30, 'Down the chute!', '#ffffff', 16);
    return true;
  }
  function popOut(st, h) {
    const r = h.cr;
    h.chute = 0; h.x = r.ox; h.y = r.y + r.dy; h.prevY = h.y; h.vy = V(st) * 0.6; h.vx = 0; h.push = 0.25; h.pvx = (r.ox < S.C ? 1 : -1) * 120;
    Sfx.play('stuntfallPop'); K.poof(st, h.x, h.y - st.camY);
    // anything it skipped below the chute stays as it is (the other hero still has to get past)
  }
  function winch(st) {
    const [a, b] = st.hs;
    if (a.landed || b.landed || a.chute > 0 || b.chute > 0) return;
    if (Math.abs(a.y - b.y) <= S.sep) return;
    const up = a.y < b.y ? a : b, lo = up === a ? b : a;
    up.y = lo.y - 50; up.x = clamp(lo.x + (up.x < lo.x ? -60 : 60), S.X0 + S.hw, S.X1 - S.hw); up.vy = lo.vy; up.hang = 0; up.prevY = up.y;
    hurt(st, S.winchCost); st.stats.winches++;
    Sfx.play('stuntfallWinch'); K.msg(st, 'Winched down on the safety wire! Stay close: tuck ▼ to catch up, spread ▲ to wait.', '#ffffff', 3);
  }
  function stars(st) {
    for (const s of st.starsL) {
      if (s.got) continue;
      for (const h of st.hs) if (!(h.chute > 0) && !h.landed && Math.abs(h.x - s.x) < 24 && Math.abs(h.y - s.y) < 26) {
        s.got = true; st.stars++; st.stats.stars = st.stars; Sfx.play('studioPop', 1 + (st.stars % 5) * 0.08);
        K.pop(st, s.x, s.y - st.camY - 26, 'Star ' + st.stars + '!', C.gold, 18); break;
      }
    }
    // the drone: both inside its frame lights REC
    const d = drone(st);
    st.rec = st.hs.every(h => !(h.chute > 0) && Math.abs(h.x - d.x) < d.w / 2 && Math.abs(h.y - st.camY - d.y) < d.h / 2);
    if (st.rec) st.stats.recT += 1 / 120;
  }
  function drone(st) { const y = 280; return { x: droneX(st, st.camY + y), y, w: 250, h: 230 }; }
  function landOn(st, list) {
    const r = st.bag;
    for (const h of list) { h.landed = true; h.y = r.y; h.vy = 0; h.vx = 0; h.push = 0; h.hang = 0; }
    Sfx.play('stuntfallBag');
    if (st.hs.every(h => h.landed) && !st.land) {
      const cx = (st.hs[0].x + st.hs[1].x) / 2, linked = !!st.link, d = Math.min(1, Math.abs(cx - S.C) / 300);
      const score = Math.round(80 * (1 - d) + (linked ? 20 : 0));
      st.land = { score, linked, x: cx };
      if (r.bull) {
        st.stats.landing = score;
        K.pop(st, W / 2, 170, 'Landing: ' + score + ' / 100' + (score >= 95 ? '  PERFECT!' : ''), score >= 95 ? C.gold : '#ffffff', 26);
      }
    }
  }
  function endTake(st) {
    st.state = 'end'; st.endT = 0; st.lastRoom = st.k === 3; st.stats.roomT[st.k] = G.time - st.segStart;
    Sfx.play('studioCheer'); Sfx.play('studioClap');
    if (!st.lastRoom) K.pop(st, W / 2, 160, 'CUT! Print it! That\'s ' + st.title + '!', '#ffffff', 24);
  }
  function endStep(st, dt) {
    st.endT += dt;
    if (st.lastRoom) {
      if (st.endT > 0.8 && !st.party) { st.party = true; Sfx.play('stuntfallFanfare'); K.confetti(st, W / 2, 140, st.land && st.land.score >= 95 ? 90 : 50); }
      if (st.endT > 3.4 && !st.cleared) { st.cleared = true; G.level.goal = { x: W / 2, y: 300 }; levelClear(); }
    } else if (st.endT > 2.2) nextRoom();
  }
  function camera(st, dt) {
    const hs = st.hs.filter(h => !(h.chute > 0));
    if (!hs.length) return;
    const avg = hs.reduce((s, h) => s + h.y, 0) / hs.length, lo = Math.max(...hs.map(h => h.y));
    let t = Math.max(avg - S.heroY, lo - (H - 150));
    if (st.bag) t = Math.min(t, st.bag.y - H + 90);
    st.camY = K.lerp(st.camY, t, Math.min(1, dt * 7));
  }
  function mirror(st) {
    for (const h of st.hs) K.place(h.id, h.x, h.y - st.camY + PH / 2);
    st.runPos = st.hs.map(h => ({ x: h.x, y: h.y, grounded: true }));
  }

  /* ---------- what to do next ----------
     plan(st): { next (the next glass or beam: { r, eta, need 'link'|'apart' }), rows (the rows coming, with eta),
                 h: [ { tx (x to steer for), link (tap to link now), release (tap to let go now), tuck, spread, why } x2 ] }
     The pair links for glass (meeting halfway) and lets go S.releaseT s before a beam; at a beam each takes a gap (the
     left one the left gap). Window boxes: a foam box or a clear space, never a REAL one. Awnings and flagpoles are
     steered round. Stars when the next glass or beam is more than 1.5 s off. Tuck to catch up, spread to wait. */
  const RELEASE_T = 0.6;
  function plan(st) {
    const key = G.tickN + ':' + st.k;
    if (st.planMemo && st.planMemo.key === key) return st.planMemo.p;
    const p = planNow(st);
    st.planMemo = { key, p };
    return p;
  }
  function planNow(st) {
    const hs = st.hs, out = { next: null, rows: [], h: hs.map(h => ({ tx: h.x, link: false, release: false, tuck: false, spread: false, why: 'fall' })) };
    if (st.state !== 'go' || !hs) return out;
    const live = hs.filter(h => !(h.chute > 0) && !h.landed);
    if (!live.length) return out;
    const py = Math.min(...live.map(h => h.y)), vy = Math.max(80, live.reduce((s, h) => s + Math.max(h.vy, V(st) * 0.6), 0) / live.length);
    const rows = st.rows.filter(r => r.y > py && r.k !== 'marker' && !(r.k === 'glass' && r.broken)).map(r => ({ r, eta: (r.y - py) / vy }));
    out.rows = rows;
    const nx = rows.find(q => q.r.k === 'glass' || q.r.k === 'beam');
    if (nx) out.next = { r: nx.r, eta: nx.eta, need: nx.r.k === 'glass' ? 'link' : 'apart' };
    const [a, b] = hs, d = Math.hypot(a.x - b.x, a.y - b.y);
    const sinceLink = st.clock - st.linkT;
    // the danger rows before the next glass / beam (and up to 1.4 s ahead)
    const horizon = nx ? nx.eta : 1.4;
    const soon = rows.filter(q => q.eta < Math.max(1.4, horizon + 0.01) && q.eta <= horizon + 0.01);
    if (nx && nx.r.k === 'glass') {
      if (st.link) {
        // together: line the pair up on something good, or a star
        out.h.forEach(o => { o.why = 'glass'; });
        // line up for what comes after the glass: the middle of the next beam's gaps
        const after = rows.find(q => q.r.y > nx.r.y && (q.r.k === 'beam' || q.r.k === 'glass'));
        let want = (a.x + b.x) / 2;
        if (after && after.r.k === 'beam' && after.eta < nx.eta + 3.5) { const g2 = after.r.gaps.slice().sort((p, q) => p - q); want = g2.length > 1 ? (g2[0] + g2[g2.length - 1]) / 2 : g2[0] + S.gap / 2; }
        const cx = safePair(st, soon, want);
        out.h.forEach((o, i) => { o.tx = cx + (i === st.link.left ? -1 : 1) * S.gap / 2; });
        if (nx.r.triple) out.h.forEach(o => { o.tuck = true; });
      } else {
        // meet halfway (the chute: the one out of the chute is met by the other)
        const busy = hs.find(h => h.chute > 0);
        const mx = busy ? busy.cr.ox : (a.x + b.x) / 2;
        out.h.forEach((o, i) => { o.tx = mx + (i === 0 ? (a.x <= b.x ? -1 : 1) : (b.x < a.x ? -1 : 1)) * S.gap / 2; o.why = 'meet'; });
        // (not while one is still going for a star with time to spare)
        const chasing = !busy && nx.eta > 1.6 && singleStars(st, hs, nx.eta - 1.2).some(Boolean);
        // (and not while the pair, as wide as it would be here, would hit something on the way to the glass: a person
        // pinned to the wall beside a REAL box used to be linked, bonked and linked again for ever)
        const wide = pairOK(soon, (a.x + b.x) / 2);
        if (!chasing && wide && d <= linkR(st) && !busy && a.daze <= 0 && b.daze <= 0 && (sinceLink > 0.35 || nx.eta < 0.6)) out.h.forEach(o => { o.link = true; });
        // up and down: tuck to catch up, spread to wait
        if (!busy) { const dy = a.y - b.y; if (Math.abs(dy) > 40) { const hi = dy < 0 ? 0 : 1; out.h[hi].tuck = true; out.h[1 - hi].spread = true; } }
      }
    } else if (nx && nx.r.k === 'beam') {
      const gs = nx.r.gaps.slice().sort((p, q) => p - q);
      if (st.link) {
        out.h.forEach(o => { o.why = 'gap'; });
        // drift over the gaps while still together, and let go in time to reach them
        const mid = gs.length > 1 ? (gs[0] + gs[gs.length - 1]) / 2 : gs[0] + S.gap / 2;
        out.h.forEach((o, i) => { o.tx = mid + (i === st.link.left ? -1 : 1) * S.gap / 2; });
        const far = Math.max(...hs.map((h, i) => Math.abs((gs.length > 1 ? (i === st.link.left ? gs[0] : gs[gs.length - 1]) : gs[0]) - h.x)));
        // (the time to the beam once apart: singles fall faster than a linked pair)
        const tA = (nx.r.y - py) / V(st);
        if (tA < Math.max(RELEASE_T, far / S.steer + 0.6) && sinceLink > 0.35) out.h.forEach(o => { o.release = true; });
      } else {
        const order = a.x <= b.x ? [0, 1] : [1, 0];
        out.h.forEach((o, i) => { o.why = 'gap'; o.tx = gs.length > 1 ? (order[0] === i ? gs[0] : gs[gs.length - 1]) : gs[0]; });
        // short of time: spread (it steers faster and falls slower)
        out.h.forEach((o, i) => { const h = hs[i]; if (Math.abs(o.tx - h.x) / S.steer > (nx.r.y - h.y) / V(st) - 0.15 && Math.abs(o.tx - h.x) > 12) { o.spread = true; o.tuck = false; } });
        // a star in a gap this hero is taking
        for (const s of st.starsL) if (!s.got && s.y > nx.r.y && s.y < nx.r.y + 260) out.h.forEach(o => { if (Math.abs(o.tx - s.x) < 10) o.why = 'gap'; });
      }
    } else {
      // nothing but the airbag: aim for the bullseye together
      out.h.forEach((o, i) => { o.tx = S.C + (i === (st.link ? st.link.left : (a.x <= b.x ? 0 : 1)) ? -1 : 1) * S.gap / 2; o.why = 'bag'; });
      if (!st.link && d <= linkR(st) && sinceLink > 0.35 && st.bag && st.bag.bull) out.h.forEach(o => { o.link = true; });
      if (!st.link) { const dy = a.y - b.y; if (Math.abs(dy) > 40) { const hi = dy < 0 ? 0 : 1; out.h[hi].tuck = true; out.h[1 - hi].spread = true; } }
    }
    // stars with time to spare (a pair: before the next glass, or well before a beam), then steer round danger rows
    if (st.link) {
      const lim = nx ? nx.eta - (nx.need === 'apart' ? 1.5 : 0.5) : 3;
      const s = pairStar(st, hs, lim);
      if (s) { const cx = safePair(st, soon, s.x + (s.x < (a.x + b.x) / 2 ? S.gap / 2 : -S.gap / 2)); out.h.forEach((o, i) => { o.tx = cx + (i === st.link.left ? -1 : 1) * S.gap / 2; o.why = 'star'; }); }
    } else {
      const ss = singleStars(st, hs, nx ? nx.eta - (nx.need === 'apart' ? 0.9 : 1.0) : 3);
      hs.forEach((h, i) => {
        const o = out.h[i];
        if (h.chute > 0 || h.landed) return;
        // (on the way to a star only the rows before it count, and the ones so close under it that there would be
        // no time to get clear afterwards)
        if (ss[i]) { o.tx = ss[i].x; o.why = 'star'; o.tx = safeOne(st, soon.filter(q => q.r.y < ss[i].y + V(st) * 0.6), h, o.tx); }
        else o.tx = safeOne(st, soon, h, o.tx);
      });
    }
    return out;
  }
  // a safe x for one hero's target, given the danger rows coming before the next glass / beam
  function safeOne(st, soon, h, tx) {
    let x = clamp(tx, S.X0 + 16, S.X1 - 16);
    for (const q of soon) {
      const r = q.r;
      if (r.y < h.y) continue;
      if (r.k === 'boxes') {
        const bad = bx => r.boxes.some(b => b.real && Math.abs(bx - b.x) < b.w / 2 + S.hw + 6);
        if (bad(x)) { let best = x, bd = 1e9; for (let c = S.X0 + 16; c <= S.X1 - 16; c += 8) if (!bad(c) && Math.abs(c - x) < bd) { bd = Math.abs(c - x); best = c; } x = best; }
      } else if (r.k === 'awning' && Math.abs(x - r.x) < r.w / 2 + 14) x = r.x + (x < r.x ? -1 : 1) * (r.w / 2 + 20);
      else if (r.k === 'pole') x = r.side < 0 ? Math.max(x, S.X0 + r.len + 20) : Math.min(x, S.X1 - r.len - 20);
    }
    return clamp(x, S.X0 + 16, S.X1 - 16);
  }
  // a safe middle for a linked pair
  function pairOK(soon, c) {
    return soon.every(q => {
      const r = q.r, xs = [c - S.gap / 2, c + S.gap / 2];
      if (r.k === 'boxes') return !xs.some(x => r.boxes.some(b => b.real && Math.abs(x - b.x) < b.w / 2 + S.hw + 6));
      if (r.k === 'awning') return !xs.some(x => Math.abs(x - r.x) < r.w / 2 + 14);
      if (r.k === 'pole') return !xs.some(x => poleHit(r, x + (r.side < 0 ? -20 : 20)));
      if (r.k === 'fan' && !r.dir) return !xs.some(x => x > r.x0 - 20 && x < r.x1 + 20);
      return true;
    });
  }
  function safePair(st, soon, cx) {
    const ok = c => pairOK(soon, c);
    if (ok(cx)) return cx;
    let best = cx, bd = 1e9;
    for (let c = S.X0 + 50; c <= S.X1 - 50; c += 8) if (ok(c) && Math.abs(c - cx) < bd) { bd = Math.abs(c - cx); best = c; }
    return best;
  }
  // the stars a hero can reach in time, passed within `before` s
  const reach = (st, h, before, mul) => st.starsL.filter(s => {
    if (s.got || s.y < h.y + 10) return false;
    const t = (s.y - h.y) / (V(st) * mul);
    // (a star right below is always taken: no steering needed)
    return (t < Math.min(2.8, before) || t < 0.45 && Math.abs(s.x - h.x) < 14) && Math.abs(s.x - h.x) / S.steer < t + 0.05;
  });
  // one star each for two singles (the nearer one gets a star both want)
  function singleStars(st, hs, before) {
    const best = (h, not) => reach(st, h, before, 1).filter(s => s !== not).sort((p, q) => Math.abs(p.x - h.x) - Math.abs(q.x - h.x))[0] || null;
    const out = hs.map(h => (h.chute > 0 || h.landed ? null : best(h)));
    if (out[0] && out[0] === out[1]) {
      const s = out[0], far = Math.abs(hs[0].x - s.x) > Math.abs(hs[1].x - s.x) ? 0 : 1;
      out[far] = best(hs[far], s);
    }
    return out;
  }
  // a star a linked pair can reach (either hand over it)
  function pairStar(st, hs, before) {
    const c = { x: (hs[0].x + hs[1].x) / 2, y: hs[0].y };
    return reach(st, { x: c.x, y: c.y }, before, S.linkMul).sort((p, q) => p.y - q.y)[0] || null;
  }

  /* ---------- drawing ---------- */
  const FL = 300; // a floor of the building, world px
  function drawBuilding(st, t) {
    const cy = st.camY;
    // the backlot behind (it slides up slowly: we're falling)
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, st.k === 3 ? '#ffb07a' : '#8ac8ff'); g.addColorStop(1, st.k === 3 ? '#ff7a6a' : '#d8f0ff');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 6; i++) { const x = (i * 197) % W, y = ((i * 131 - cy * 0.12) % (H + 200) + H + 200) % (H + 200) - 100; ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.ellipse(x, y, 70, 22, 0, 0, TAU); ctx.fill(); }
    // the face of the building: painted flats with the wooden backs of the next flat showing at the joins
    const x0 = S.X0 - 24, x1 = S.X1 + 24;
    const f0 = Math.floor(cy / FL) - 1;
    for (let f = f0; f < f0 + H / FL + 3; f++) {
      const y = f * FL - cy, sec = Math.floor(f / 5);
      const set = K.hash(sec * 3 + st.k) < 0.25 && f % 5 === 4; // every so often the set ends: scaffolding
      if (set) {
        ctx.fillStyle = '#4a3a2a'; ctx.fillRect(x0, y, x1 - x0, FL);
        ctx.strokeStyle = K.COL.wood; ctx.lineWidth = 6;
        for (let x = x0; x < x1; x += 110) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + FL); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 110, y + FL); ctx.stroke(); }
        ctx.fillStyle = K.COL.woodDark; ctx.fillRect(x0, y + FL - 16, x1 - x0, 16);
        K.crew(x0 + 60, y + FL - 16, 3, 'idle', t + f);
        K.light(x1 - 70, y + FL - 16, 0.8, { on: true, beam: 120, dir: -1 });
        text('SET ENDS', (x0 + x1) / 2, y + 40, 16, '#ffe7a8', 'center', 'display');
        continue;
      }
      ctx.fillStyle = f % 2 ? '#8a7a9a' : '#867696'; ctx.fillRect(x0, y, x1 - x0, FL);
      ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(x0, y + FL - 6, x1 - x0, 6);
      for (let c = 0; c < 6; c++) {
        const wx = x0 + 36 + c * 118, wy = y + 70;
        ctx.fillStyle = '#3a4a6a'; ctx.fillRect(wx, wy, 70, 110);
        ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(wx + 6, wy + 6, 16, 98);
        ctx.strokeStyle = '#ece4f4'; ctx.lineWidth = 4; ctx.strokeRect(wx, wy, 70, 110);
      }
      // a floor-to-floor seam where two painted flats meet
      ctx.fillStyle = K.COL.wood; ctx.fillRect(x0, y, x1 - x0, 3);
    }
    // the side edges: you can see it's only a front (struts behind)
    for (const ex of [x0 - 10, x1]) { ctx.fillStyle = K.COL.woodDark; ctx.fillRect(ex, 0, 10, H); }
    // balconies with the crew: at each fan
  }
  function drawRow(st, r, t) {
    const y = r.y - st.camY;
    if (y < -120 || y > H + 200) return;
    if (r.k === 'marker') {
      ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.font = K.FONT(46);
      text(String(r.n), S.X1 - 34, y - 4, 44, 'rgba(255,255,255,0.8)', 'center', 'display');
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(S.X1 - 60, y + 22, 52, 4);
      return;
    }
    if (r.k === 'glass') {
      if (r.broken) { ctx.fillStyle = 'rgba(220,240,255,0.5)'; for (const x of [r.x0, r.x1 - 14]) ctx.fillRect(x, y - 4, 14, 8); return; }
      const wob = K.wobble(r.i, t, 2);
      ctx.save(); ctx.translate(0, wob);
      ctx.fillStyle = 'rgba(200,232,255,0.55)'; ctx.fillRect(r.x0, y - 7, r.x1 - r.x0, 14);
      ctx.fillStyle = 'rgba(255,255,255,0.8)'; for (let x = r.x0 + 20; x < r.x1; x += 90) { ctx.beginPath(); ctx.moveTo(x, y - 6); ctx.lineTo(x + 26, y - 6); ctx.lineTo(x + 14, y + 6); ctx.lineTo(x - 12, y + 6); ctx.closePath(); ctx.fill(); }
      // the paper edge (torn) and PROP tags
      ctx.fillStyle = '#f6eedc'; ctx.beginPath(); ctx.moveTo(r.x0, y + 7);
      for (let x = r.x0; x <= r.x1; x += 12) ctx.lineTo(x, y + 7 + (K.hash(x + r.i) * 5));
      ctx.lineTo(r.x1, y + 7); ctx.closePath(); ctx.fill();
      for (let x = r.x0 + 70; x < r.x1; x += 260) K.propTag(x, y - 16, 0.9);
      ctx.restore();
      return;
    }
    if (r.k === 'beam') {
      const gs = r.gaps.slice().sort((p, q) => p - q);
      let x = S.X0 - 24;
      for (const gx of gs) { K.steel(x, y - 12, gx - S.gapW / 2 - x, 24); x = gx + S.gapW / 2; }
      K.steel(x, y - 12, S.X1 + 24 - x, 24);
      K.realTag(S.X0 + 70, y + 22, 70, 0.8); K.realTag(S.X1 - 70, y + 22, 70, 0.8);
      return;
    }
    if (r.k === 'boxes') {
      for (const b of r.boxes) {
        if (b.real) { K.steel(b.x - b.w / 2, y - 12, b.w, 26); K.realTag(b.x, y + 22, b.w - 6, 0.7); }
        else if (!b.hit) { ctx.save(); ctx.translate(b.x, y); ctx.rotate(K.wobble(b.x, t, 0.05)); K.foam(-b.w / 2, -12, b.w, 26, { col: '#e8a0c8' }); ctx.restore(); ctx.fillStyle = '#3a8a3a'; for (let q = 0; q < 3; q++) { circle(b.x - 16 + q * 16, y - 16, 6); ctx.fill(); } }
      }
      return;
    }
    if (r.k === 'awning') {
      const x0 = r.x - r.w / 2;
      ctx.save(); ctx.translate(r.x, y); ctx.rotate(-r.dir * 0.12 + K.wobble(r.i, t, 0.02)); ctx.translate(-r.x, -y);
      for (let k = 0; k < 6; k++) { ctx.fillStyle = k % 2 ? '#ffffff' : '#e8322a'; ctx.fillRect(x0 + k * r.w / 6, y - 8, r.w / 6 + 0.5, 16); }
      ctx.fillStyle = '#f6eedc'; ctx.fillRect(x0, y + 8, r.w, 4);
      ctx.restore();
      text(r.dir > 0 ? '▶▶' : '◀◀', r.x, y - 20, 14, '#ffffff', 'center', 'display');
      K.propTag(r.x + r.dir * (r.w / 2 - 10), y + 18, 0.7);
      return;
    }
    if (r.k === 'pole') {
      const xw = r.side < 0 ? S.X0 - 24 : S.X1 + 24, xe = r.side < 0 ? S.X0 + r.len : S.X1 - r.len;
      ctx.strokeStyle = '#d8d8e0'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(xw, y); ctx.lineTo(xe, y); ctx.stroke();
      ctx.fillStyle = '#ffd86a'; circle(xe, y, 6); ctx.fill();
      const fl = Math.sin(t * 6 + r.i) * 6;
      ctx.fillStyle = '#2a8ae8'; ctx.beginPath(); ctx.moveTo(xe - r.side * 4, y + 4); ctx.lineTo(xe - r.side * 4 + fl, y + 44); ctx.lineTo(xe - r.side * 50 + fl, y + 40); ctx.lineTo(xe - r.side * 46, y + 4); ctx.closePath(); ctx.fill();
      K.propTag(xe - r.side * 26, y + 24, 0.7);
      return;
    }
    if (r.k === 'fan') {
      const h = r.h, x0 = r.x0, x1 = r.x1;
      ctx.fillStyle = 'rgba(255,255,255,0.10)'; ctx.fillRect(x0, y, x1 - x0, h);
      for (let k = 0; k < 10; k++) {
        const u = ((t * (r.dir ? 1.6 : 1.2) + k * 0.31) % 1);
        const sx = r.dir ? x0 + (r.dir > 0 ? u : 1 - u) * (x1 - x0) : x0 + K.hash(k + r.i) * (x1 - x0);
        const sy = r.dir ? y + K.hash(k * 3 + r.i) * h : y + (1 - u) * h;
        ctx.strokeStyle = k % 2 ? 'rgba(255,255,255,0.8)' : 'rgba(255,229,138,0.8)'; ctx.lineWidth = 3;
        ctx.beginPath(); if (r.dir) { ctx.moveTo(sx, sy); ctx.lineTo(sx - r.dir * 26, sy + Math.sin(t * 9 + k) * 4); } else { ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.sin(t * 9 + k) * 4, sy + 26); } ctx.stroke();
      }
      // the fan on its balcony (crew holding it)
      const fx = r.dir > 0 ? x0 - 4 : r.dir < 0 ? x1 + 4 : (x0 + x1) / 2, fy = r.dir ? y + h / 2 : y + h + 30;
      ctx.fillStyle = '#3a3a44'; circle(fx, fy, 30); ctx.fill();
      ctx.fillStyle = '#9aa0b0'; for (let k = 0; k < 4; k++) { ctx.save(); ctx.translate(fx, fy); ctx.rotate(t * 20 + k * TAU / 4); ctx.beginPath(); ctx.ellipse(13, 0, 13, 5, 0, 0, TAU); ctx.fill(); ctx.restore(); }
      text(r.dir ? (r.dir > 0 ? 'FAN ▶' : '◀ FAN') : 'UP FAN ▲', fx, fy - 42, 13, '#ffffff', 'center', 'display');
      return;
    }
    if (r.k === 'chute') {
      ctx.fillStyle = K.COL.woodDark; ctx.beginPath(); ctx.moveTo(r.x - 120, y - 30); ctx.lineTo(r.x + 120, y - 30); ctx.lineTo(r.x + 34, y + 20); ctx.lineTo(r.x - 34, y + 20); ctx.closePath(); ctx.fill();
      ctx.fillStyle = r.busy ? '#5a4a3a' : '#1a1410'; ctx.fillRect(r.x - 30, y + 14, 60, 12);
      text('CHUTE', r.x, y - 12, 14, '#ffe7a8', 'center', 'display');
      // the exit, lower and to one side
      const ey = r.y + r.dy - st.camY;
      ctx.fillStyle = K.COL.woodDark; ctx.fillRect(r.ox - 34, ey - 40, 68, 22); text('▼', r.ox, ey - 50, 14, '#ffe7a8', 'center', 'display');
      return;
    }
    if (r.k === 'bag') {
      ctx.fillStyle = '#e8d24a'; rr(S.X0 - 20, y - 20, S.X1 - S.X0 + 40, 80, 30); ctx.fill();
      ctx.strokeStyle = '#a89020'; ctx.lineWidth = 3; ctx.stroke();
      for (let x = S.X0 + 30; x < S.X1; x += 70) { ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.beginPath(); ctx.moveTo(x, y - 14); ctx.lineTo(x, y + 54); ctx.stroke(); }
      if (r.bull) for (const [rad, col] of [[300, '#ffffff'], [210, '#e8322a'], [130, '#ffffff'], [60, '#e8322a']]) { ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(S.C, y + 4, rad, 16 * rad / 300 + 4, 0, 0, TAU); ctx.fill(); }
      text('AIRBAG', S.C, y + 40, 18, '#5a4a10', 'center', 'display');
      K.crew(S.X0 - 10, y + 70, 4, st.state === 'end' ? 'cheer' : 'idle', t);
      K.bellow(S.X1 + 40, y + 70, 1, { shout: st.state === 'end' ? 1 : 0, face: -1 });
    }
  }
  function drawHero(st, h, t) {
    if (h.chute > 0) return;
    const sx = h.x, sy = h.y - st.camY;
    const linked = !!st.link, tuck = h.mul > 1.05, spread = h.mul < 0.99 && !linked;
    const arms = linked ? 'grab' : spread ? 'out' : h.landed ? null : 'up';
    const rot = h.spin > 0 ? h.spin / 0.45 * TAU : h.landed ? 0 : clamp(h.vx / 1400, -0.25, 0.25);
    // linked: they face each other (the hands meet in the middle)
    const face = linked ? (h.id === st.link.left ? 1 : -1) : h.face || 1;
    K.stunt(h.id, sx, sy + PH * 0.65, { look: 'agent', s: 1.3, face, rot, arms, stun: h.daze > 0, sy: tuck ? 0.8 : undefined, alpha: st.state === 'cut' ? 0.6 : 1 });
    // gold wrist ribbons
    if (st.gold) { ctx.strokeStyle = C.gold; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(sx - 12, sy - 6); ctx.quadraticCurveTo(sx - 20, sy + Math.sin(t * 8) * 6, sx - 26, sy + 4); ctx.stroke(); }
  }
  function draw(st) {
    const t = st.clock;
    ctx.save();
    if (G.shake > 0) ctx.translate((Math.random() - 0.5) * G.shake * 16, (Math.random() - 0.5) * G.shake * 16);
    drawBuilding(st, t);
    for (const r of st.rows) drawRow(st, r, t);
    // stars
    for (const s of st.starsL) if (!s.got) { const y = s.y - st.camY; if (y > -30 && y < H + 30) K.goldStar(s.x, y, 12, t); }
    // the drone's frame
    const d = drone(st);
    ctx.strokeStyle = st.rec ? '#ff4a4a' : 'rgba(255,255,255,0.7)'; ctx.lineWidth = 3;
    const fx0 = d.x - d.w / 2, fy0 = d.y - d.h / 2, c = 22;
    for (const [px, py, dx, dy] of [[fx0, fy0, 1, 1], [fx0 + d.w, fy0, -1, 1], [fx0, fy0 + d.h, 1, -1], [fx0 + d.w, fy0 + d.h, -1, -1]]) { ctx.beginPath(); ctx.moveTo(px + dx * c, py); ctx.lineTo(px, py); ctx.lineTo(px, py + dy * c); ctx.stroke(); }
    // the drone itself, above the frame
    ctx.fillStyle = '#2a2a34'; rr(d.x - 18, fy0 - 26, 36, 14, 4); ctx.fill();
    ctx.fillStyle = '#9aa0b0'; for (const ox of [-26, 26]) { ctx.beginPath(); ctx.ellipse(d.x + ox, fy0 - 28, 14 + Math.sin(t * 40) * 3, 3, 0, 0, TAU); ctx.fill(); }
    ctx.fillStyle = st.rec && Math.sin(t * 8) > 0 ? '#ff3a3a' : '#5a1a1a'; circle(d.x + 12, fy0 - 19, 3); ctx.fill();
    if (st.rec) text('REC', d.x - 6, fy0 - 19, 10, '#ff8080', 'center', 'body');
    // hands
    if (st.link) {
      const [a, b] = st.hs;
      ctx.strokeStyle = st.pulling ? '#ffb0a0' : C.gold; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(a.x, a.y - st.camY - 2); ctx.lineTo(b.x, b.y - st.camY - 2); ctx.stroke();
    }
    for (const h of st.hs) drawHero(st, h, t);
    ctx.restore();
    K.drawParts(st, 0);
  }
  function drawTop(st) {
    K.drawPops(st, 0, 0);
    K.frame(st.clock, st.state === 'go' && G.introT <= 0);
    if (st.cut) { K.scanlines(Math.min(1, st.cut.t / 0.6)); K.drawCut(st, st.k + 1); }
    if (st.intro > 0.8 && G.introT <= 0) { const u = (st.intro - 0.8) / 0.8; K.clapper(W / 2, H / 2 - 30, 2.2, u > 0.5 ? 1 : u * 2, st.k + 1, { scene: st.title.toUpperCase().slice(0, 14) }); }
  }
  function sign(x, y, need, s) {
    // two figures holding hands (glass) or apart (a gap)
    ctx.fillStyle = 'rgba(20,20,30,0.75)'; rr(x - 46 * s, y - 30 * s, 92 * s, 52 * s, 10 * s); ctx.fill();
    const dx = need === 'link' ? 10 : 20;
    for (const d of [-1, 1]) {
      ctx.fillStyle = d < 0 ? PCOL[0] : PCOL[1];
      circle(x + d * dx * s, y - 14 * s, 6 * s); ctx.fill();
      ctx.fillRect(x + d * dx * s - 4 * s, y - 8 * s, 8 * s, 16 * s);
    }
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3 * s; ctx.beginPath();
    if (need === 'link') { ctx.moveTo(x - 6 * s, y - 4 * s); ctx.lineTo(x + 6 * s, y - 4 * s); }
    else { ctx.moveTo(x - 4 * s, y - 14 * s); ctx.lineTo(x - 4 * s, y + 8 * s); ctx.moveTo(x + 4 * s, y - 14 * s); ctx.lineTo(x + 4 * s, y + 8 * s); }
    ctx.stroke();
    text(need === 'link' ? 'HOLD HANDS' : 'LET GO', x, y + 16 * s, 10 * s, '#ffffff', 'center', 'body');
  }

  /* ---------- HUD ---------- */
  function hud(st) {
    const big = hudBig(), z = big ? 1.35 : 1, play = G.mode === 'play' || G.mode === 'paused';
    let timeX0;
    {
      const fs = big ? 20 : 14, h = big ? 40 : 28, tm = fmtTime(G.time), n = '★ ' + st.stars + ' / 20', fl = '▼ ' + floorNow(st) + 'F';
      ctx.font = K.FONT(fs);
      const w = ctx.measureText(tm).width + ctx.measureText(n).width + ctx.measureText(fl).width + fs * 2 + 30, x0 = pill(W - 14, 12, w, h, 'right'), cy = 12 + h / 2 + 0.5;
      text(tm, x0 + 15, cy, fs, st.waiting ? '#aab' : C.paper, 'left', 'body');
      text(fl, x0 + 15 + ctx.measureText(tm).width + fs, cy, fs, '#ffffff', 'left', 'body');
      text(n, x0 + w - 15, cy, fs, C.gold, 'right', 'body');
      timeX0 = x0;
    }
    K.drawMsg(st, st.waiting ? { text: K.BREAK, col: '#ffffff', t: 1, life: 2 } : st.msg, timeX0);
    if (!play || !st.hs) return;
    K.takeMeter(W / 2 - 120 * z, H - 34 * z, 240 * z, 14 * z, st.meter / 100, z);
    const pl = plan(st);
    const kk = (id, what) => (K.quiet(id) ? '' : K.key(id, what) + ' ');
    for (const id of [0, 1]) {
      const o = pl.h[id];
      const bx = K.panel(id, 'stunt double', 236, 58, z), cy = bx.y + 27 * z, chh = 23 * z, cw = (bx.w - 24 * z - 6 * z) / 2, x0 = bx.x + 12 * z;
      K.chip(x0, cy, cw, chh, kk(id, 'act') + (st.link ? 'LET GO' : 'HANDS'), o.link || o.release, !!st.link, z);
      K.chip(x0 + cw + 6 * z, cy, cw, chh, o.tuck ? kk(id, 'down') + 'TUCK' : o.spread ? kk(id, 'up') + 'SPREAD' : kk(id, 'down') + 'TUCK', o.tuck || o.spread, st.hs[id].mul !== 1 && !st.link, z);
    }
    if (G.introT > 0 || st.state !== 'go' || st.waiting) return;
    // the signpost at the bottom edge
    const nx = pl.next, it = st.k >= 2 ? S.iconT2 : S.iconT;
    if (nx && nx.eta < it) sign(W / 2, H - 80 * z, nx.need, z);
    const P = K.prompter(st);
    for (const id of [0, 1]) {
      const h = st.hs[id], o = pl.h[id];
      if (h.chute > 0 || h.landed) continue;
      let s = null, col = C.gold, pulse = false;
      if (o.release) { s = 'LET GO! ' + K.key(id, 'act'); pulse = true; }
      else if (o.link) { s = 'HOLD HANDS! ' + K.key(id, 'act'); pulse = true; }
      else if (st.link && st.pulling) { s = 'Pull together!'; col = '#ffb0a0'; }
      else if (nx && nx.need === 'link' && !st.link && nx.eta < 2.2) { s = 'Get together for the glass!'; col = '#ffffff'; }
      else if (nx && nx.need === 'apart' && !st.link && nx.eta < 1.4 && Math.abs(o.tx - h.x) > 20) { s = 'Steer to the gap ' + K.key(id, o.tx < h.x ? 'left' : 'right'); }
      else if (o.tuck && !st.link) { s = 'Tuck to catch up ' + K.key(id, 'down'); col = '#ffffff'; }
      P.say(id, s, clamp(h.x, 70, W - 70), h.y - st.camY - 30, col, pulse);
    }
  }
  function floorNow(st) {
    if (!st.bag || !st.hs) return 0;
    const y = pairY(st);
    return Math.max(0, Math.ceil((st.bag.y - y) / (st.bag.y / 12)));
  }

  MODES.stuntfall = {
    S, TAKES, plan, layout, inGap, poleHit, droneX,
    medals: { bronze: 'Land the big fall', goals: [{ key: 'time', gold: S.goldT, silver: S.silverT }] },
    medalValues() { return {}; },
    setup(st, L) {
      st.stats = { smashes: 0, bonks: 0, bounces: 0, links: 0, lets: 0, stars: 0, style: 0, landing: 0, retakes: 0, winches: 0, bounceProps: 0, recT: 0, helps: 0, roomT: [] };
      st.stars = 0; st.inT = [G.time, G.time]; st.personT = G.time; st.clock = 0;
      for (const row of L.grid) row.fill('.');
      room(st, L, 0);
    },
    room(k, L) { const st = G.mst; st.inT = [G.time, G.time]; st.personT = G.time; for (const row of L.grid) row.fill('.'); room(st, L, k); },
    step(dt) { tick(G.mst, dt); },
    draw() { const st = G.mst; if (!st.hs) return; draw(st); K.hide(st); },
    drawTop() { const st = G.mst; K.unhide(st); if (st.hs) drawTop(st); },
    hud() { const st = G.mst; if (st.hs) hud(st); },
    stats() {
      const st = G.mst, s = st.stats;
      if (!s) return [];
      const out = [
        { label: 'Smashes', value: String(s.smashes) },
        { label: 'Bonks', value: String(s.bonks) },
        { label: 'Stars', value: st.stars + ' of 20' },
        { label: 'Landing', value: s.landing + ' / 100' },
      ];
      out.push('Links: ' + s.links + '. Glass bounces: ' + s.bounces + '. Retakes: ' + s.retakes + '. On camera: ' + Math.round(s.recT) + ' s. That\'s a wrap!');
      const hl = K.helpLine(s.helps); if (hl) out.push(hl);
      return out;
    },
  };

  /* ---------- the level ---------- */
  const act = { label: 'grab', labels: ['grab', 'grab'] };
  STUDIO.defs.stuntfall = {
    name: 'Stunt Double Fall', world: 35, kind: 'team', mode: 'stuntfall', ownStep: true, ownHUD: true, noFalls: true, roomWord: 'Take', outfit: 'none',
    legend: {
      pip: '<kbd>A</kbd><kbd>D</kbd> steer <kbd>W</kbd> spread <kbd>S</kbd> tuck',
      bo: '<kbd>←</kbd><kbd>→</kbd> steer <kbd>↑</kbd> spread <kbd>↓</kbd> tuck',
      pad: 'stick steers, up spreads, down tucks,',
    },
    tip: 'Fall off the skyscraper! Hold hands to smash the sugar glass, let go to slip through the gaps in the real steel.',
    howTo: ['Press grab when you are close to hold hands. Together you smash the sugar glass.', 'Press let go to slip through the gaps.'],
    act,
    map: K.stubMap(),
    rooms: [
      { title: 'Rehearsal', act, tip: 'Hold hands (action, when close) to smash the sugar glass. Let go (action again) to fit through the gaps!' },
      { title: 'Wide Shot', act, tip: 'Awnings throw you sideways, flagpoles spin you, fans push. Foam boxes are fine to hit; REAL ones are not.' },
      { title: 'Close-Up', act, tip: 'Faster! Glass and gaps one after another. A chute shoots one of you out to the side: get back together!' },
      { title: 'The Money Shot', act, tip: 'Everything at once, then three panes in a row (hold hands and tuck ▼). Land together in the middle of the bullseye!' },
    ],
  };

  /* ---------- sounds ---------- */
  Sfx.extra.stuntfallLetGo = function () { this.tone(700, 0.06, 'triangle', 0.03, 500); };
  Sfx.extra.stuntfallBoing = function () { this.tone(180, 0.25, 'sine', 0.05, 520); };
  Sfx.extra.stuntfallFan = function () { this.tone(2000, 0.4, 'sawtooth', 0.006, 1200); };
  Sfx.extra.stuntfallSpin = function () { this.tone(400, 0.3, 'triangle', 0.03, 900); };
  Sfx.extra.stuntfallChute = function () { this.tone(500, 0.3, 'square', 0.02, 120); };
  Sfx.extra.stuntfallPop = function () { this.tone(220, 0.1, 'square', 0.03, 660); };
  Sfx.extra.stuntfallWinch = function () { this.tone(300, 0.5, 'sawtooth', 0.015, 900); };
  Sfx.extra.stuntfallBag = function () { this.tone(90, 0.3, 'sine', 0.07, 60); };
  Sfx.extra.stuntfallFanfare = function () { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.18, 'triangle', 0.055, null, i * 0.12)); };
})();
