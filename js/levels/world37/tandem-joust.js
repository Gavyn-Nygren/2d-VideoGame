/* Pip & Bo - Level 37-2 Tandem Joust Run (team, World 37 Medieval Tournament). */
'use strict';

/* ===== 37-2 Tandem Joust Run (mode 'tandemjoust', team, scrolls right, Gavyn's pick) =====
   The knight overslept, so the two squires ride his horse down the practice course together: one rides, one holds a
   lance much too long for them. Jobs swap every stretch.
   Side view, auto-scrolling right; st.d is how far the horse has come (an item at world d is drawn at screen x =
   d - st.d). One horse, both heroes on it (the rider on the saddle in front, the lancer on the rump behind), left of
   centre (R.hx). Lance targets come at three heights (0 low, 1 middle, 2 high) and are met at the lance tip (R.tip);
   ground things are met at the horse. The mode owns the tick, the picture and the HUD (ownStep + ownHUD + noFalls).
   THE RIDER (G.mst.rider): ▲ / jump = the horse jumps (hold for a longer jump: 0.5 to 0.8 s of air). ▶ = spur to a
     full gallop, ◀ = rein in to a canter (both stay until changed). ▼ held = the horse ducks its head and both lean
     flat (under low beams and pennant ropes).
   THE LANCER: ▲ / ▼ move the lance tip between low, middle and high (0.15 s a step). Action HELD = couch the lance:
     only a couched lance scores, and the arm tires after 1.6 s (then 1 s to recover; the ring by the lancer shows it).
     While the horse is in the air the lance counts one step higher than set (high + air goes over everything).
   TARGETS (met at the lance tip, couched, at the right height):
     RINGS on posts: 24 in the level (6 a stretch, "Rings"). They stack on the lance.
     QUINTAINS (a swinging dummy with a shield): hit the shield at a gallop = Perfect, it spins clear; at a canter =
       Good. A miss at a gallop and the sandbag swings round: a BONK. A miss at a canter is only a pat (no Bonk).
     STRAW KNIGHTS on wheeled wooden horses (pages push them at you): a shield at one height, strike either of the
       other two. Later ones switch their shield once, 0.7 s before contact. Striking the shield (clang) or not
       striking at all = a Bonk.
     MELONS and WATER SKINS hanging over the lane: pop them for fun; riding under an un-popped water skin SOAKS the
       pair (the reins are slippery: jumps come 0.15 s late for 3 s).
   GROUND (met at the horse): hurdles, hay bales, water troughs (jump); low beams and pennant ropes (duck, and the
     lance must be at low or middle or it catches: a Bonk); mud (the horse slows to a canter whatever the rider does);
     a crowd crossing (canter through, or they scatter: a Bonk); rough ground (landing from a jump with the lance
     couched at low plants the tip: the pair pole-vault off, a Bonk; lift it before landing).
   THE BLACK KNIGHT'S DUMMY (end of each stretch): a big straw knight on a rail charges three times. Its shield shows a
     3-part pattern (for example high, low, middle); each pass needs one couched hit at that pass's height. A miss is a
     Bonk and that pass runs again ("Round again!"). Between passes: a jump or a duck.
   BALANCE (shared): three Bonks without a clean hit in between and the pair fall off into a hay bale (UNHORSED): the
     stretch restarts from its halfway flag, or its start. Rings already won stay won. No game over.
   STRETCHES (rooms, about 40 s): The Practice Lane, The Page's Gauntlet, Round the Fairground (dusk after the halfway
     flag, lantern-lit targets), The Champion's Course (ends with the lance splintering in ribbons in front of the stands).
   GOLD HELP (only while both are playing, announced, counted): 3 Bonks in a stretch = a gold lance: the couch lasts
     2.6 s and target heights glow on the lance guide 0.4 s earlier for the rest of the stretch. Added to the spec's
     help: with the gold lance a late jump still clears (a jump up to 0.35 s late still clears), so a
     rider who keeps jumping late isn't stuck going round the same half stretch.
   IDLE: no person presses anything for 12 s: "Taking a break", the course and the clock wait.
   MEDAL (MODES.tandemjoust.medals, js/medals.js): by time. Gold <= 175 s, Silver <= 300 s.
   OUTFITS (Gavyn's rule): the overslept knight's borrowed armour, shared badly (TOURNEY_OUTFITS 'borrowed'). Pip in
     the oversized breastplate and a cooking-pot helmet, Bo in the oversized great helm with a blue plume (the visor
     drops at bumps). The lancer has the buckler on the back, the rider the knight's one spur; a Bonk knocks the pot or
     helm askew until the next clean hit. The horse's caparison is split orange and blue.
   DEVIATION from the spec: the spec says a quintain hit at a canter "pats it and it swings round and bonks", and also
     that a computer rider canters into quintains with a person lancer who is not couching "so a miss is a pat, not a
     Bonk". Both can't hold, so: a canter hit is Good (no Bonk), a canter miss is a harmless pat, and only a miss at a
     gallop Bonks. Galloping still pays: Perfect hits and time.
   MODES.tandemjoust.plan(st) says what each job should do now (the prompts, the HUD chips and the brain read it).
   Everything lives inside this block; sounds are Sfx.extra.tandemjoust*. */
(() => {
  const K = TOURNEY, TAU = Math.PI * 2;
  const S = {
    gallop: 340, canter: 220, acc: 260, step: 0.15, couch: 1.6, goldCouch: 2.6, tire: 1, regen: 1.6,
    jump0: 0.5, jumpMax: 0.8, jumpH: 72, clearH: 18, soakT: 3, soakLag: 0.15, bonkT: 1, fallT: 2.4,
    knightV: 70, dummyV: 110, switchT: 0.7, tell: 1.3, goldTell: 0.4, perfectV: 320,
    pace: 0.9, idleWait: 12, goldT: 175, silverT: 300, rings: 24,
  };
  // where things are on screen: the horse (its middle, hooves on gy), the lance tip, the three heights at the tip
  const R = { gy: 452, hx: 320, hs: 1.15, tip: 520, front: 44, back: 30, ridersL: 270, ridersR: 360 };
  const HY = [R.gy - 44, R.gy - 98, R.gy - 152];
  const HN = ['LOW', 'MID', 'HIGH'];

  /* ---------- the script: every stretch is a list of things along the lane at world distance d (px) ---------- */
  function script(k) {
    const L = [], pc = S.pace;
    const add = (d, kind, o) => { const it = Object.assign({ d: d * pc, kind, done: false }, o || {}); if (it.len) it.len *= pc; it.d0 = it.d; L.push(it); return it; };
    const ring = (d, h) => add(d, 'ring', { h });
    const quin = (d, h) => add(d, 'quintain', { h });
    const knight = (d, sh, sw) => add(d, 'knight', { sh, sw: sw === undefined ? null : sw });
    const hang = (d, what, h) => add(d, what, { h });
    const ground = (d, what, w) => add(d, 'ground', { what, w: w || (what === 'trough' ? 56 : what === 'hay' ? 40 : 22) });
    const beam = (d, what) => add(d, 'beam', { what: what || 'beam' });
    const dummy = (d0, pat, between) => {
      // three passes; a jump or a duck between them
      for (let n = 0; n < 3; n++) {
        add(d0 + n * 900, 'dummy', { pass: n, h: pat[n], pat });
        if (n < 2) { if (between[n] === 'beam') beam(d0 + n * 900 + 330, 'rope'); else ground(d0 + n * 900 + 300, 'hurdle'); }
      }
      return d0 + 2 * 900;
    };
    let end, half;
    if (k === 0) {
      // The Practice Lane: rings, one quintain at a time, hurdles
      ring(900, 1); ground(1700, 'hurdle'); ring(2500, 2); quin(3300, 1); ground(4100, 'hurdle'); ring(4800, 0);
      half = 5300;
      ring(5800, 1); quin(6600, 2); ground(7300, 'hurdle'); ring(7410, 2); ground(8200, 'hay'); ring(8900, 0);
      end = dummy(9800, [2, 0, 1], ['hurdle', 'hurdle']) + 500;
    } else if (k === 1) {
      // The Page's Gauntlet: straw knights, melons, mud, duck beams
      ring(800, 1); knight(1600, 1); hang(2400, 'melon', 2); beam(3100); ring(3800, 0); add(4300, 'mud', { len: 900 });
      knight(4700, 2); half = 5600;
      hang(6100, 'skin', 1); ring(6800, 2); beam(7500); ring(8100, 1); ground(8700, 'hurdle'); ring(8810, 2);
      hang(9400, 'melon', 1); ring(10000, 0);
      end = dummy(10900, [0, 2, 1], ['beam', 'hurdle']) + 500;
    } else if (k === 2) {
      // Round the Fairground: pennant ropes, a crowd crossing, dusk after the halfway flag with lantern-lit targets
      ring(800, 2); beam(1500, 'rope'); add(2300, 'crossing'); quin(3100, 1); ground(3900, 'hay'); ring(4600, 1);
      hang(5200, 'skin', 2); half = 5700;
      ring(6200, 0); beam(6900, 'rope'); knight(7600, 0); ring(8300, 2); ground(9000, 'trough'); ring(9120, 2);
      add(9800, 'crossing'); ring(10500, 1);
      end = dummy(11300, [1, 0, 2], ['hurdle', 'beam']) + 500;
    } else {
      // The Champion's Course: everything, height-switching knights, a long dummy fight, then the stands
      ring(700, 1); knight(1400, 1, 2); ground(2100, 'hurdle'); ring(2210, 2); add(2700, 'mud', { len: 800 });
      quin(3900, 2); beam(4500, 'rope'); ring(5100, 0); half = 5500;
      hang(5800, 'skin', 2); knight(6500, 2, 0); ground(7200, 'trough'); hang(7320, 'melon', 2); ring(8000, 1);
      ground(8600, 'hurdle'); add(8640, 'rough', { len: 420 }); ring(9300, 0); knight(9900, 0, 1); ring(10500, 2);
      end = dummy(11300, [2, 1, 0], ['beam', 'hurdle']) + 700;
    }
    return { L, len: end * pc, half: half * pc };
  }

  /* ---------- a stretch (one room) ---------- */
  function room(st, L, k) {
    const def = L.def;
    st.k = k; st.rider = def.rider || 0; st.lancer = 1 - st.rider; st.title = def.title || '';
    st.goldUsed = false; st.gold = false; st.rc = { bonks: 0 };
    st.ringsAtStart = st.rings;
    labels(st);
    startStretch(st, 0);
    K.fx(st);
    st.segStart = G.time;
  }
  function startStretch(st, from) {
    const sc = script(st.k);
    // rings already won in this stretch stay won (an Unhorsed restart keeps them)
    const got = new Set((st.items || []).filter(it => it.got).map(it => it.d0));
    st.items = sc.L; st.len = sc.len; st.half = sc.half;
    for (const it of st.items) if (got.has(it.d0) && it.kind === 'ring') { it.done = true; it.got = true; }
    st.d = from; st.v = S.canter; st.gal = false;
    st.air = null; st.airH = 0; st.duck = false; st.soak = 0; st.jumpQ = -1;
    st.lance = { set: 1, h: 1, stepT: 0, couch: false, use: 0, tired: 0, wob: 0, splinter: 0 };
    st.bonkRun = 0; st.askew = 0; st.visor = 0; st.stars = 0;
    st.state = 'go'; st.endT = 0; st.fallT = 0; st.prevIn = [{}, {}]; st.cleared = false; st.party = false;
    st.passFails = 0;
  }
  function labels(st) { const w = []; w[st.rider] = 'spur'; w[st.lancer] = 'couch'; K.actLabels(w, 'couch'); }

  /* ---------- the tick ---------- */
  function tick(st, dt) {
    if (!st.items) return;
    K.track(st);
    st.waiting = st.state === 'go' && K.idle(st, dt, S.idleWait);
    const live = G.introT <= 0 && !st.waiting && st.state === 'go';
    st.clock += dt;
    const P = G.players;
    const edge = (id, k) => { const i = P[id].input, on = k === 'jump' ? (i.jump || i.up || P[id].pendingJump) : i[k]; const was = st.prevIn[id][k]; st.prevIn[id][k] = !!on; return on && !was; };
    st.edges = [0, 1].map(id => ({ jump: edge(id, 'jump'), down: edge(id, 'down'), left: edge(id, 'left'), right: edge(id, 'right') }));
    if (live) {
      st.T += dt;
      rider(st, dt); lancer(st, dt);
      course(st, dt);
      if (st.state === 'go' && st.d >= st.len) endStretch(st);
    } else if (st.state === 'fall') fallStep(st, dt);
    else if (st.state === 'end') endStep(st, dt);
    for (const p of P) { p.pendingJump = false; p.pendingAct = false; }
    if (st.stars > 0) st.stars -= dt;
    if (st.visor > 0) st.visor = Math.max(0, st.visor - dt * 1.5);
    K.tickFx(st, dt);
    mirror(st);
  }

  function inMud(st) { const x = st.d + R.hx; return st.items.some(it => it.kind === 'mud' && x > it.d && x < it.d + it.len); }
  function onRough(st) { const x = st.d + R.hx; return st.items.some(it => it.kind === 'rough' && x > it.d && x < it.d + it.len); }

  function rider(st, dt) {
    const id = st.rider, p = G.players[id], i = p.input, e = st.edges[id];
    if (e.right) { if (!st.gal) Sfx.play('tandemjoustSpur'); st.gal = true; }
    if (e.left) st.gal = false;
    const mud = inMud(st);
    const target = st.gal && !mud ? S.gallop : S.canter;
    st.v = approach(st.v, target, S.acc * dt * (mud && st.v > S.canter ? 2 : 1));
    st.duck = !!i.down && !st.air;
    // the jump (a soak makes it come 0.15 s late)
    const held = !!(i.jump || i.up);
    if (e.jump && !st.air && !st.duck && st.jumpQ < 0) st.jumpQ = st.soak > 0 ? S.soakLag : 0;
    if (st.jumpQ >= 0) { st.jumpQ -= dt; if (st.jumpQ < 0) { st.jumpQ = -1; st.air = { t: 0, len: S.jump0, held: true }; st.stats.jumps++; Sfx.play('tandemjoustHup'); } }
    if (st.air) {
      const a = st.air;
      a.t += dt;
      if (a.held && held && a.t < S.jumpMax - S.jump0) a.len = S.jump0 + a.t; else a.held = false;
      st.airH = Math.sin(clamp(a.t / a.len, 0, 1) * Math.PI) * S.jumpH;
      if (a.t >= a.len) { st.air = null; st.airH = 0; land(st); }
    }
    if (st.soak > 0) st.soak -= dt;
  }
  function land(st) {
    Sfx.play('tourneyThump'); st.visor = 1;
    K.dust(st, R.hx, R.gy, 'rgba(214,190,150,0.8)', 8);
    const L = st.lance;
    if (onRough(st) && L.set === 0 && L.couch) {
      st.stats.vaults++;
      bonk(st, 'The lance tip dug in! Up and over! (lift it before landing)');
    }
  }
  function lancer(st, dt) {
    const id = st.lancer, p = G.players[id], i = p.input, e = st.edges[id], L = st.lance;
    if (e.jump) L.set = Math.min(2, L.set + 1);
    if (e.down) L.set = Math.max(0, L.set - 1);
    // the tip moves one step every 0.15 s toward the set height
    L.stepT -= dt;
    if (L.h !== L.set && L.stepT <= 0) { L.h += Math.sign(L.set - L.h); L.stepT = S.step; Sfx.play('tandemjoustTick'); }
    if (L.h === L.set && L.stepT < 0) L.stepT = 0;
    if (L.wob > 0) L.wob -= dt;
    // the couch: held, up to 1.6 s (2.6 with gold), then 1 s to recover
    const max = st.gold ? S.goldCouch : S.couch;
    if (L.tired > 0) { L.tired -= dt; L.couch = false; if (L.tired <= 0) L.use = 0; }
    else if (i.act && L.wob <= 0) {
      if (!L.couch) Sfx.play('tandemjoustCouch');
      L.couch = true; L.use += dt;
      if (L.use >= max) { L.couch = false; L.tired = S.tire; K.hint(st, id, 'Arm tired! Couch just before the target', 1.4); Sfx.play('tandemjoustTired'); }
    } else { L.couch = false; L.use = Math.max(0, L.use - S.regen * dt); }
  }
  // the height the lance counts at right now: one step higher in the air, low while wobbling after a Bonk
  function eff(st) { const L = st.lance; if (L.wob > 0) return 0; return Math.min(3, L.h + (st.airH > S.clearH * 0.5 ? 1 : 0)); }
  const closing = (st, it) => st.v + (it.kind === 'knight' ? S.knightV : it.kind === 'dummy' ? S.dummyV : 0);

  /* ---------- the course ---------- */
  function course(st, dt) {
    st.d += st.v * dt;
    if (Math.random() < st.v / 340 * 0.6) K.dustTrail(st, R.hx - 40 + Math.random() * 60, R.gy, 1);
    // gallop sound on the hoofbeat
    st.hoof = (st.hoof || 0) + dt * st.v / 140;
    if (st.hoof >= 1) { st.hoof -= 1; Sfx.play('tourneyGallop', st.v > 300 ? 2 : 1); }
    const L = st.lance, e = eff(st);
    for (const it of st.items) {
      if (it.done) continue;
      const sx = it.d - st.d;
      // movers roll toward the pair once they are in view
      if ((it.kind === 'knight' || it.kind === 'dummy') && sx < W + 60) it.d -= (it.kind === 'knight' ? S.knightV : S.dummyV) * dt;
      if (it.kind === 'knight' && it.sw !== null && !it.switched && (sx - R.tip) / closing(st, it) <= S.switchT) { it.switched = true; it.sh = it.sw; Sfx.play('tandemjoustSwitch'); K.pop(st, sx, HY[2] - 40, 'Switch!', '#ffd0c8', 16); }
      if (it.kind === 'ring' || it.kind === 'quintain' || it.kind === 'knight' || it.kind === 'melon' || it.kind === 'skin' || it.kind === 'dummy') {
        if (sx <= R.tip && !it.met) { it.met = true; meet(st, it, e); }
        if (it.met && it.kind === 'skin' && !it.popped && sx <= R.hx && !it.soaked) { it.soaked = true; st.soak = S.soakT; st.stats.soaks++; Sfx.play('tandemjoustSplash'); K.pop(st, R.hx, R.gy - 150, 'SOAKED! The reins are slippery', '#bfe8ff', 18); for (let n = 0; n < 14; n++) K.part(st, R.hx + (Math.random() - 0.5) * 60, R.gy - 130, (Math.random() - 0.5) * 120, Math.random() * 80, 0.7, '#8fd0ff', 3, 500); }
        if (sx < -80) it.done = true;
      } else if (it.kind === 'ground') {
        const a = sx, b = sx + it.w;
        // (with the gold lance a jump up to 0.35 s late still clears: the horse scrambles over)
        const over = !it.hit && b > R.hx - R.back && a < R.hx + R.front && st.airH < S.clearH && !(st.gold && (st.air || st.jumpQ >= 0));
        if (over && st.gold && !it.saved) { it.grace = (it.grace || 0) + dt; }
        if (st.gold && it.grace > 0 && (st.air || st.jumpQ >= 0)) it.saved = true;
        if (over && !it.saved && (!st.gold || it.grace > 0.35)) { it.hit = true; bonk(st, it.what === 'trough' ? 'Splash! Into the trough!' : 'Crash! Jump the ' + (it.what === 'hay' ? 'hay bale' : 'hurdle') + '!'); }
        if (b < R.hx - R.back - 4) { it.done = true; if (!it.hit) st.stats.clears++; }
      } else if (it.kind === 'beam') {
        if (!it.tipChk && sx <= R.tip) { it.tipChk = true; if (e >= 2 && !it.hit) { it.hit = true; bonk(st, 'The lance caught the ' + (it.what === 'rope' ? 'pennant rope' : 'beam') + '! Keep it low or middle'); } }
        if (!it.hit && sx < R.ridersR && sx > R.ridersL && (!st.duck || st.airH > 4)) { it.hit = true; bonk(st, 'Swept by the ' + (it.what === 'rope' ? 'pennant rope' : 'beam') + '! Duck!'); }
        if (sx < R.ridersL - 20) { it.done = true; if (!it.hit) st.stats.ducks++; }
      } else if (it.kind === 'crossing') {
        if (!it.met && sx <= R.hx + R.front + 30) {
          it.met = true;
          if (st.v > S.canter + 30) { it.scatter = true; bonk(st, 'The crowd scattered! Canter (◀) through crossings'); }
          else { it.part = true; K.pop(st, R.hx + 40, R.gy - 150, 'Excuse us!', '#ffffff', 16); }
        }
        if (sx < -160) it.done = true;
      } else if (it.kind === 'mud' || it.kind === 'rough') {
        if (it.d + it.len < st.d - 40) it.done = true;
      }
    }
  }
  // a lance target reaches the tip
  function meet(st, it, e) {
    const L = st.lance, couched = L.couch, gal = st.v >= S.perfectV, tx = R.tip, ty = HY[clamp(e, 0, 2)] - st.airH * 0.2;
    if (it.kind === 'ring') {
      if (couched && e === it.h) { it.got = true; st.rings++; st.stats.rings++; clean(st, false); Sfx.play('tandemjoustRing', 1 + st.rings * 0.015); K.spark(st, tx, HY[it.h], 8, ['#ffd23a', '#ffffff']); K.pop(st, tx, HY[it.h] - 30, 'Ring!', '#ffe7a8', 16); }
      else { st.stats.missed.push(st.k + ':' + Math.round(it.d0) + ':' + HN[it.h] + (couched ? '' : ':nocouch') + ':e' + e); }
    } else if (it.kind === 'quintain') {
      if (couched && e === it.h) { it.spun = true; Sfx.play('tourneyClang'); hit(st, tx, HY[it.h], gal); }
      else if (gal) { it.swing = true; bonk(st, 'The sandbag swung round! BONK!'); }
      else { it.pat = true; K.pop(st, tx, HY[1] - 40, 'Pat... (missed at a canter)', '#ffffff', 14); }
    } else if (it.kind === 'knight') {
      if (couched && e !== it.sh && e <= 2) { it.down = true; Sfx.play('tourneyCrack'); hit(st, tx, HY[e], gal); st.stats.knights++; }
      else if (couched && e === it.sh) { Sfx.play('tourneyClang'); bonk(st, 'Clang! You hit the shield: strike where it is NOT'); }
      else { bonk(st, 'The straw knight rolled right into you! Couch the lance'); }
    } else if (it.kind === 'melon' || it.kind === 'skin') {
      if (couched && e === it.h) { it.popped = true; st.stats.pops++; Sfx.play(it.kind === 'melon' ? 'tandemjoustSplat' : 'tandemjoustSplash'); K.pop(st, tx, HY[it.h] - 30, it.kind === 'melon' ? 'Splat!' : 'Popped!', '#d9ffd0', 16); for (let n = 0; n < 12; n++) K.part(st, tx, HY[it.h], (Math.random() - 0.5) * 220, -Math.random() * 160, 0.7, it.kind === 'melon' ? (n % 2 ? '#ff5a5a' : '#3e9a3e') : '#8fd0ff', 4, 600); clean(st, true); }
    } else if (it.kind === 'dummy') {
      if (couched && e === it.h) {
        it.down = true; Sfx.play('tourneyCrack'); Sfx.play('tourneyRoar'); hit(st, tx, HY[it.h], gal);
        st.passFails = 0;
        K.pop(st, W / 2, 150, it.pass < 2 ? 'Pass ' + (it.pass + 1) + ' of 3!' : 'The dummy is down!', '#ffffff', 24);
      } else if (L.wob > 0) {
        // still wobbling from a Bonk just before: no fault, it just circles round for another pass
        Sfx.play('tourneyClang');
        K.msg(st, 'Still wobbling! The dummy circles round for another pass', '#ffd0c8', 2.4);
        rewind(st, it.d0 - 900 * S.pace - 240, 'pass');
      } else {
        Sfx.play('tourneyClang');
        bonk(st, couched ? 'Wrong height! This pass is ' + HN[it.h] + '. Round again!' : 'Couch the lance! Round again!');
        st.passFails++;
        if (st.state === 'go') rewind(st, it.d0 - 900 * S.pace - 240, 'pass');
      }
    }
  }
  function hit(st, x, y, gal) {
    if (gal) { st.stats.perfect++; K.pop(st, x, y - 40, 'PERFECT!', C.gold, 22); K.spark(st, x, y, 14, [C.gold, '#ffffff', '#ff7a2a', '#3a6ee8']); }
    else { st.stats.good++; K.pop(st, x, y - 40, 'Good!', '#d9ffd0', 18); K.spark(st, x, y, 8, ['#ffffff', '#d9ffd0']); }
    clean(st, true);
  }
  function clean(st, streak) {
    st.bonkRun = 0; st.askew = 0;
    st.streak = (st.streak || 0) + 1; st.stats.bestStreak = Math.max(st.stats.bestStreak, st.streak);
  }
  // rewind the course to world d (a dummy pass again, or an Unhorsed restart): re-arm everything after it
  function rewind(st, d, why) {
    d = Math.max(0, d);
    for (const it of st.items) {
      // everything behind the restart point counts as passed (a fresh list after an Unhorsed has it all un-done)
      if (it.d0 < d - 10 && it.kind !== 'dummy') { it.done = true; continue; }
      if (it.kind === 'dummy' && (it.down || it.d0 < d - 10)) { it.done = true; continue; }
      if (it.got) continue;
      it.d = it.d0; it.done = false; it.met = false; it.hit = false; it.tipChk = false; it.down = false; it.spun = false; it.swing = false; it.pat = false;
      it.popped = false; it.soaked = false; it.grace = 0; it.saved = false; it.scatter = false; it.part = false; it.switched = false;
      if (it.kind === 'knight' && it.orig !== undefined) it.sh = it.orig;
    }
    st.rewindD = d; st.rewindWhy = why; st.d = d; st.air = null; st.airH = 0; st.jumpQ = -1;
  }
  function bonk(st, text) {
    st.stats.bonks++; st.rc.bonks++; st.bonkRun++; st.streak = 0;
    st.stats.bonkWhy.push(st.k + ':' + Math.round(st.d) + ' ' + text.slice(0, 34));
    st.lance.wob = S.bonkT; st.lance.couch = false; st.stars = 1.4; st.visor = 1;
    st.askew = (st.bonkRun % 2 ? 1 : -1) * (0.35 + 0.1 * st.bonkRun);
    Sfx.play('tandemjoustBonk'); G.shake = 0.25;
    K.msg(st, text, '#ffd0c8', 2.4);
    if (st.bonkRun >= 3) { unhorse(st); return; }
    if (st.rc.bonks >= 3 && !st.goldUsed && K.both(st)) {
      st.goldUsed = true; st.gold = true;
      K.goldHelp(st, 'Gold lance! The couch lasts longer, the heights glow earlier and late jumps still clear for this stretch');
    }
  }
  function unhorse(st) {
    if (st.state !== 'go') return;
    st.state = 'fall'; st.fallT = 0; st.stats.unhorsed++;
    Sfx.play('tourneyWhinny'); Sfx.play('tourneyBoing'); Sfx.play('tourneyGasp');
    K.msg(st, 'UNHORSED! Into the hay... back to the ' + (st.d > st.half ? 'halfway flag' : 'start of the stretch'), '#ffd0c8', 3);
  }
  function fallStep(st, dt) {
    st.fallT += dt;
    st.v = approach(st.v, 0, 600 * dt); st.d += st.v * dt;
    if (st.fallT >= S.fallT) {
      const from = st.d > st.half ? st.half : 0, gold = st.gold, used = st.goldUsed;
      const prog = st.items;
      startStretch(st, 0);
      // keep the rings won before the fall, then go back to the flag
      st.items.forEach((it, n) => { if (prog[n] && prog[n].got) { it.got = true; it.done = true; } });
      rewind(st, from, 'fall');
      st.gold = gold; st.goldUsed = used;
      K.msg(st, 'Back in the saddle! ' + st.title, '#ffffff', 2.2);
    }
  }
  function endStretch(st) {
    st.state = 'end'; st.endT = 0; st.lastRoom = st.k === 3;
    st.stats.roomT[st.k] = G.time - st.segStart;
    Sfx.play('tourneyFanfare');
    if (st.lastRoom) { st.lance.splinter = 0.01; Sfx.play('tourneyCrack'); Sfx.play('tourneyRoar'); }
    else K.pop(st, W / 2, 160, (G.level.def.done || 'Stretch done!') + ' Swap jobs!', '#ffffff', 24);
  }
  function endStep(st, dt) {
    st.endT += dt;
    st.v = approach(st.v, st.lastRoom ? 0 : S.canter, 200 * dt); st.d += st.v * dt;
    if (!st.lastRoom) { if (st.endT > 2.2) nextRoom(); return; }
    st.lance.splinter = clamp(st.endT / 0.8, 0, 1);
    if (st.endT > 0.3 && !st.party) { st.party = true; Sfx.play('tourneyCheer'); K.confetti(st, R.tip, HY[1], 60); K.pop(st, W / 2, 140, 'The lance splinters in a shower of ribbons!', '#ffffff', 24); }
    if (st.endT > 3.4 && !st.cleared) { st.cleared = true; G.level.goal = { x: W / 2, y: 300 }; levelClear(); }
  }
  function mirror(st) {
    const sp = seats(st);
    K.place(st.rider, sp.rider.x, sp.rider.y);
    K.place(st.lancer, sp.lancer.x, sp.lancer.y);
    st.run = [0, 1].map(id => ({ x: st.d + (id === st.rider ? sp.rider.x : sp.lancer.x), y: id === st.rider ? sp.rider.y : sp.lancer.y }));
  }
  function seats(st) {
    const lift = st.airH, fall = st.state === 'fall' ? clamp(st.fallT / 0.7, 0, 1) : 0;
    const ry = R.gy - 74 * R.hs + 6 - lift, duck = st.duck ? 6 : 0;
    const rider = { x: R.hx + 14, y: ry + duck }, lancer = { x: R.hx - 28, y: ry + 2 + duck };
    if (fall) { for (const [o, dx] of [[rider, 70], [lancer, 40]]) { o.x += dx * fall; o.y = K.lerp(o.y, R.gy - 30, fall) - Math.sin(fall * Math.PI) * 60; } }
    return { rider, lancer };
  }

  /* ---------- what to do next (the prompts, the HUD chips and the computer brain all read this) ---------- */
  function plan(st) {
    if (st.planMemo && st.planMemo.n === G.tickN && st.planMemo.k === st.k) return st.planMemo.p;
    const p = planNow(st);
    st.planMemo = { n: G.tickN, k: st.k, p };
    return p;
  }
  // how long a jump must be to clear a ground thing w wide at speed v (0.5 to 0.8 s)
  const jumpLen = (w, v) => clamp(((w + R.back + R.front) / Math.max(120, v) + 0.06) / 0.8 + 0.04, S.jump0, S.jumpMax);
  function planNow(st) {
    const v = Math.max(120, st.v), L = st.lance, tell = S.tell + (st.gold ? S.goldTell : 0);
    const ahead = [];
    for (const it of st.items) {
      if (it.done || it.met && it.kind !== 'ground' && it.kind !== 'beam') continue;
      const sx = it.d - st.d;
      if (it.kind === 'ring' || it.kind === 'quintain' || it.kind === 'melon' || it.kind === 'skin' || it.kind === 'dummy') {
        ahead.push({ kind: it.kind, lance: true, h: it.h, t: (sx - R.tip) / closing(st, it), it, glow: (sx - R.tip) / closing(st, it) < tell, must: it.kind !== 'melon' && it.kind !== 'skin' || it.kind === 'skin' });
      } else if (it.kind === 'knight') {
        const t = (sx - R.tip) / closing(st, it);
        // decide the height once (the free one nearest where the lance is, middle first), change only if it switches
        if (it.pickFor !== it.sh) { it.pickFor = it.sh; const opts = [0, 1, 2].filter(h => h !== it.sh); it.pick = opts.includes(1) ? 1 : opts.sort((a, b) => Math.abs(a - L.set) - Math.abs(b - L.set))[0]; }
        ahead.push({ kind: 'knight', lance: true, h: it.pick, sh: it.sh, sw: it.sw !== null && !it.switched, t, it, glow: t < tell, must: true });
      } else if (it.kind === 'ground') {
        if (it.hit || sx + it.w < R.hx - R.back) continue;
        const t = (sx - (R.hx + R.front)) / v, len = jumpLen(it.w, v);
        ahead.push({ kind: 'ground', what: it.what, t, len, jumpAt: t - 0.12 - (st.soak > 0 ? S.soakLag : 0), it });
      } else if (it.kind === 'beam') {
        if (it.hit || sx < R.ridersL - 20) continue;
        ahead.push({ kind: 'beam', t: (sx - R.ridersR - 20) / v, tTip: (sx - R.tip) / v, clear: (sx - R.ridersL + 20) / v, it });
      } else if (it.kind === 'crossing') {
        if (it.met) continue;
        ahead.push({ kind: 'crossing', t: (sx - R.hx - R.front - 30) / v, sx, it });
      } else if (it.kind === 'mud') {
        if (it.d + it.len < st.d + R.hx) continue;
        ahead.push({ kind: 'mud', t: (sx - R.hx) / v, it });
      } else if (it.kind === 'rough') {
        if (it.d + it.len < st.d + R.hx) continue;
        ahead.push({ kind: 'rough', t: (sx - R.hx) / v, end: (sx + it.len - R.hx) / v, it });
      }
    }
    ahead.sort((a, b) => a.t - b.t);
    const out = { ahead, ride: { speed: 'gallop', jump: false, len: S.jump0, duck: false }, lance: { h: L.set, couch: false, why: 'ride' } };
    // ---- the rider
    const Rd = out.ride;
    const g = ahead.find(a => a.kind === 'ground');
    if (g) Rd.len = g.len;
    if (g && !st.air && g.jumpAt <= 0 && g.t > -0.3) Rd.jump = true;
    const bm = ahead.find(a => a.kind === 'beam');
    if (bm && bm.t < 0.6 && bm.clear > -0.05) Rd.duck = true;
    // (by distance, not time: cantering makes the time longer, which would flip the plan back to a gallop)
    const cr = ahead.find(a => a.kind === 'crossing' && a.sx < R.hx + R.front + 30 + 1.3 * S.gallop);
    if (cr) Rd.speed = 'canter';
    // ---- the lancer: the next lance target, allowing for the air step at contact
    const Ln = out.lance, nx = ahead.find(a => a.lance && a.t > -0.05);
    // air at a moment t from now: in a jump now, or in the jump the rider will make for the next ground thing
    const airAt = t => {
      if (st.air) { const left = st.air.len - st.air.t; if (t < left - 0.04) return true; }
      if (g && !st.air) { const a0 = Math.max(0, g.jumpAt), a1 = a0 + g.len; if (t > a0 + 0.03 && t < a1 - 0.03) return true; }
      return false;
    };
    out.airAt = airAt;
    if (nx && nx.t < 2.4) {
      const air = airAt(nx.t);
      Ln.h = clamp(nx.h - (air ? 1 : 0), 0, 2); Ln.why = nx.kind; Ln.target = nx; Ln.air = air;
      Ln.couch = nx.t < 0.42 + (st.gold ? 0.2 : 0);
    }
    // under a beam the lance must be low or middle
    if (bm && bm.tTip < 0.8 && bm.tTip > -0.2 && Ln.h > 1) { Ln.h = 1; Ln.why = 'beam'; }
    // lift before landing on rough ground
    const rough = ahead.find(a => a.kind === 'rough' && a.t < 1 && a.end > 0);
    if (rough && (st.air || g && g.t < 0.5) && Ln.h === 0) { Ln.h = 1; Ln.why = 'rough'; Ln.couch = Ln.couch && !st.air; }
    return out;
  }

  /* ---------- drawing ---------- */
  function draw(st) {
    const t = st.clock, dusk = st.k === 2 && st.d > st.half;
    K.sky(st.d, t, { dusk });
    K.hills(st.d, { base: 330, castle: st.k >= 1, dim: dusk ? 0.35 : 0 });
    if (st.k === 2) K.pavilions(st.d, 392, { par: 0.45, s: 1.0 });
    else K.pavilions(st.d, 372, { par: 0.3, s: 0.75 });
    // the stands behind the lists (more of them toward the end of the course)
    {
      const off = st.d * 0.6, step = 520;
      for (let n = Math.floor(off / step) - 1; n < Math.floor(off / step) + 3; n++) {
        if (K.hash(n * 3 + st.k) < 0.45 && st.k !== 3) continue;
        const x = n * step - off;
        K.crowd(x, x + 380, 386, t, { rows: 2, mood: st.state === 'end' || st.stars > 0 ? (st.stars > 0 ? 'gasp' : 'cheer') : 'idle', seed: n, roof: true });
      }
    }
    K.pennants(-((st.d * 0.7) % 400), -((st.d * 0.7) % 400) + 1400, 236, t, { sag: 26 });
    drawLane(st, t, dusk);
    for (const it of st.items) { const sx = it.d - st.d; if (sx < -200 || sx > W + 200) continue; if (it.kind === 'mud' || it.kind === 'rough' || it.kind === 'flag') drawPatch(st, it, sx, t); }
    drawFlag(st, st.half - st.d, t);
    for (const it of st.items) { const sx = it.d - st.d; if (sx < -200 || sx > W + 260) continue; drawBack(st, it, sx, t, dusk); }
    drawRig(st, t);
    for (const it of st.items) { const sx = it.d - st.d; if (sx < -260 || sx > W + 260) continue; drawFront(st, it, sx, t, dusk); }
    drawGuide(st, t);
    K.drawParts(st, 0);
    if (dusk) { ctx.fillStyle = 'rgba(30,20,60,0.2)'; ctx.fillRect(0, 0, W, H); }
  }
  function drawLane(st, t, dusk) {
    const grass = dusk ? '#4a6a3a' : K.COL.grass, dirt = dusk ? '#8a7050' : K.COL.dirt;
    ctx.fillStyle = grass; ctx.fillRect(0, 410, W, H - 410);
    ctx.fillStyle = shade(grass, 0.12); ctx.fillRect(0, 410, W, 4);
    ctx.fillStyle = shade(dirt, 0.25); ctx.fillRect(0, R.gy - 11, W, 4);
    ctx.fillStyle = dirt; ctx.fillRect(0, R.gy - 8, W, H - R.gy + 8);
    // (art pass) the lane's dirt: grains, pebbles, hoof prints, straw and two churned furrows, scrolling with the ride
    ctx.save(); ctx.beginPath(); ctx.rect(0, R.gy - 8, W, H - R.gy + 8); ctx.clip(); K.ground(st.d, R.gy - 8, H - R.gy + 8, { col: dirt, ruts: [24, 62], key: 'lane' }); ctx.restore();
    ctx.fillStyle = 'rgba(255,240,200,0.3)'; ctx.fillRect(0, R.gy - 8, W, 2);
    // grass tufts on the verge, hoof-churned marks and pebbles on the lane
    ctx.fillStyle = shade(grass, 0.2);
    for (let k = 0; k < 24; k++) { const x = ((k * 47 - st.d * 0.9) % (W + 60) + W + 60) % (W + 60) - 30, y = R.gy - 12; ctx.beginPath(); ctx.moveTo(x - 5, y + 2); ctx.lineTo(x - 2, y - 6); ctx.lineTo(x, y); ctx.lineTo(x + 3, y - 7); ctx.lineTo(x + 5, y + 2); ctx.closePath(); ctx.fill(); }

    // the tilt barrier along the far side of the lane, striped, with posts, a lit top and a shadow on the grass
    const off = st.d % 80;
    ctx.fillStyle = 'rgba(30,40,10,0.18)'; ctx.fillRect(0, 425, W, 6);
    for (let x = -off - 80; x < W + 80; x += 80) K.post(x, 444, 6, 30, { cap: '#ffd23a' });
    for (let x = -off - 80; x < W + 80; x += 40) { const red = ((Math.round((x + st.d) / 40) % 2) + 2) % 2; tiltBoard(x, 416, 40, 9, red); }
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(0, 416, W, 1.5);
    ctx.strokeStyle = 'rgba(60,20,10,0.5)'; ctx.lineWidth = 1; ctx.strokeRect(-1, 415.5, W + 2, 10);
  }
  // (art pass) one painted board of the tilt barrier: wood grain under the paint, a worn lit edge, a shaded underside
  function tiltBoard(x, y, w, h, red) {
    RICH.pic('w37tilt|' + w + '|' + h + '|' + red, w, h, c => {
      RICH.wood(c, 0, 0, w, h, { col: red ? '#d8323a' : '#f6ecd0', boards: 1, seed: red + w, knots: 0.5, edge: false });
      c.fillStyle = red ? '#8a1a22' : '#c8bc9c'; c.fillRect(0, h - 3, w, 3);
      c.fillStyle = 'rgba(255,255,255,0.3)'; c.fillRect(0, 0, w, 1);
      c.fillStyle = 'rgba(160,110,60,0.5)'; for (let k = 0; k < 3; k++) c.fillRect(4 + RICH.r(w + red, k) * (w - 10), 1 + RICH.r(h + red, k) * (h - 5), 3 + k, 1);
      RICH.nail(c, 3, h / 2 - 1, 1); RICH.nail(c, w - 3, h / 2 - 1, 1);
    }, x, y);
  }
  function drawFlag(st, sx, t) {
    if (sx < -60 || sx > W + 60) return;
    ctx.fillStyle = 'rgba(40,30,10,0.2)'; ctx.beginPath(); ctx.ellipse(sx, R.gy + 1, 10, 3, 0, 0, TAU); ctx.fill();
    K.post(sx - 2, R.gy, 4, 150, { col: '#5e3a1c', cap: '#ffd23a' });
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(sx + 2, R.gy - 150); ctx.lineTo(sx + 40 + Math.sin(t * 6) * 4, R.gy - 140); ctx.lineTo(sx + 2, R.gy - 128); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(120,130,150,0.3)'; ctx.beginPath(); ctx.moveTo(sx + 2, R.gy - 139); ctx.lineTo(sx + 40 + Math.sin(t * 6) * 4, R.gy - 140); ctx.lineTo(sx + 2, R.gy - 128); ctx.closePath(); ctx.fill();
    text('½', sx + 16, R.gy - 139, 11, '#3a2010', 'center', 'body');
  }
  function drawPatch(st, it, sx, t) {
    if (it.kind === 'mud') {
      ctx.fillStyle = '#7a5a36'; ctx.beginPath(); ctx.ellipse(sx + it.len / 2, R.gy + 9, it.len / 2 + 4, 14, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#6a4a2a'; ctx.beginPath(); ctx.ellipse(sx + it.len / 2, R.gy + 8, it.len / 2, 12, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(30,18,6,0.35)'; ctx.beginPath(); ctx.ellipse(sx + it.len / 2, R.gy + 5, it.len / 2 - 6, 5, 0, Math.PI, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(40,24,10,0.5)'; ctx.lineWidth = 1.5; for (let k = 0; k < it.len / 30; k++) { const hx = sx + 14 + k * 30, hy = R.gy + 10 + (k % 3) * 3; ctx.beginPath(); ctx.ellipse(hx, hy, 4, 2.5, 0, Math.PI * 0.15, Math.PI * 1.85); ctx.stroke(); }
      ctx.fillStyle = 'rgba(160,190,210,0.4)'; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.ellipse(sx + it.len * (0.25 + k * 0.25), R.gy + 12 - (k % 2) * 4, 14, 2.5, 0, 0, TAU); ctx.fill(); }
      ctx.fillStyle = 'rgba(40,24,10,0.4)'; for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.ellipse(sx + 40 + k * it.len / 6, R.gy + 6 + (k % 2) * 4, 18, 4, 0, 0, TAU); ctx.fill(); }
      ctx.fillStyle = 'rgba(255,240,220,0.25)'; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.ellipse(sx + 60 + k * it.len / 4, R.gy + 2 + (k % 2) * 6, 10, 2, 0, 0, TAU); ctx.fill(); }
      if (sx > 0 && sx < W) text('MUD', sx + 40, R.gy + 30, 12, '#3a2010', 'center', 'body');
    } else if (it.kind === 'rough') {
      for (let k = 0; k < it.len / 24; k++) { const x = sx + k * 24 + K.hash(k) * 10, r = 6 + K.hash(k * 3) * 5; RICH.pebble(ctx, x, R.gy, r, k % 2 ? '#8a7a6a' : '#9a8c7a', k); if (k % 2) RICH.pebble(ctx, x + r + 2, R.gy + 3, r * 0.45, '#a89a88', k + 9); }
      if (sx > 0 && sx < W) text('ROUGH', sx + 40, R.gy + 30, 12, '#3a2010', 'center', 'body');
    }
  }
  // posts and things on the ground (behind the horse)
  function drawBack(st, it, sx, t, dusk) {
    if (it.kind === 'ring' && !it.got) {
      const y = HY[it.h];
      K.post(sx + 14, R.gy, 5, R.gy - y + 30, { col: '#5e3a1c' }); K.timber(sx - 2, y - 30, 20, 4, { dark: true });
      ctx.fillStyle = '#8a8a96'; ctx.fillRect(sx + 13, y - 28, 7, 2);
      if (dusk) lantern(sx + 18, y - 40, t);
    } else if (it.kind === 'quintain') {
      // a post with a turning arm: shield on one end, sandbag on the other
      const y = HY[it.h], spin = it.spun ? Math.min(1, (st.d - (it.d0 - R.tip)) / 120) * 5 : it.swing ? Math.min(1, (st.d - (it.d0 - R.tip)) / 80) * 2.2 : it.pat ? 0.4 : Math.sin(t * 2 + it.d0) * 0.06;
      K.post(sx - 3, R.gy, 7, R.gy - y + 30, { col: '#5e3a1c' });
      ctx.save(); ctx.translate(sx, y - 26); ctx.scale(Math.cos(spin), 1);
      K.timber(-46, -3, 92, 6, {}); ctx.fillStyle = '#5a5a64'; ctx.fillRect(-5, -4, 10, 8); ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(-5, -4, 10, 1.5);
      ctx.strokeStyle = '#3a2010'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(40, 0); ctx.lineTo(40, 22); ctx.stroke();
      ctx.fillStyle = '#c8a46a'; ctx.beginPath(); ctx.ellipse(40, 30, 10, 13, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(120,80,30,0.35)'; ctx.beginPath(); ctx.ellipse(43, 33, 7, 10, 0, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,240,200,0.4)'; ctx.beginPath(); ctx.ellipse(37, 25, 3, 5, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(32, 30); ctx.lineTo(48, 30); ctx.moveTo(40, 18); ctx.lineTo(40, 42); ctx.stroke();
      ctx.restore();
      K.heraldShield(sx - 30 * Math.cos(spin), y + 2, 15, { col: '#d8323a', charge: 'chevron', chargeCol: '#ffffff', rot: spin * 0.3 });
      if (dusk) lantern(sx + 4, y - 50, t);
    } else if (it.kind === 'ground') {
      if (it.what === 'hurdle') { K.timber(sx, R.gy - 34, it.w, 8, {}); K.timber(sx, R.gy - 18, it.w, 8, {}); K.post(sx, R.gy, 5, 40, { col: '#5e3a1c' }); K.post(sx + it.w - 5, R.gy, 5, 40, { col: '#5e3a1c' }); }
      else if (it.what === 'hay') K.hay(sx + it.w / 2, R.gy, 1);
      else if (it.what === 'trough') RICH.pic('w37trough|' + Math.round(it.w), Math.round(it.w) + 8, 32, c => {
        // a water trough: planked sides, iron bands, water with a glint, splashes on the ground
        c.translate(4, 4); const w = Math.round(it.w);
        RICH.shadow(c, w / 2, 24, w / 2 + 4, 3, 0.22);
        RICH.wood(c, 0, 0, w, 24, { col: '#7a5a32', boards: 3, seed: 51, knots: 0.6, edge: false });
        c.fillStyle = '#6ab0e0'; c.fillRect(4, 2, w - 8, 6); c.fillStyle = 'rgba(255,255,255,0.6)'; c.fillRect(8, 3, w * 0.3, 1.2); c.fillStyle = 'rgba(30,70,120,0.3)'; c.fillRect(4, 6, w - 8, 2);
        for (const bx of [8, w - 12]) { c.fillStyle = '#4a4a54'; c.fillRect(bx, 0, 4, 24); c.fillStyle = 'rgba(255,255,255,0.3)'; c.fillRect(bx, 0, 1, 24); RICH.rivet(c, bx + 2, 12, 1.2, '#8a8a96'); }
        c.strokeStyle = '#3a2010'; c.lineWidth = 2; c.strokeRect(0, 0, w, 24);
      }, sx - 4, R.gy - 28);
    } else if (it.kind === 'beam') {
      // posts either side (the beam itself is drawn in front)
      K.post(sx - 70, R.gy, 7, R.gy - beamY(it) + 6, { col: '#5e3a1c' }); K.post(sx + 63, R.gy, 7, R.gy - beamY(it) + 6, { col: '#5e3a1c' });
    }
  }
  const beamY = it => R.gy - 112;
  function lantern(x, y, t) {
    const g = ctx.createRadialGradient(x, y, 2, x, y, 30); g.addColorStop(0, 'rgba(255,220,120,0.7)'); g.addColorStop(1, 'rgba(255,220,120,0)');
    ctx.fillStyle = g; ctx.fillRect(x - 30, y - 30, 60, 60);
    ctx.fillStyle = '#ffcf5a'; rr(x - 5, y - 7, 10, 14, 3); ctx.fill(); ctx.fillStyle = '#3a2010'; ctx.fillRect(x - 6, y - 9, 12, 3);
  }
  // hanging things, rings, knights and beams (in front of the horse)
  function drawFront(st, it, sx, t, dusk) {
    if (it.kind === 'ring' && !it.got) {
      const y = HY[it.h];
      ctx.strokeStyle = '#3a2010'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(sx, y - 26); ctx.lineTo(sx, y - 14); ctx.stroke();
      ctx.strokeStyle = '#ffd23a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(sx, y, 5, 13, 0, 0, TAU); ctx.stroke();
      ctx.strokeStyle = '#fff3b0'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(sx - 1, y - 2, 3, 9, 0, Math.PI * 0.9, Math.PI * 1.5); ctx.stroke();
    } else if ((it.kind === 'melon' || it.kind === 'skin') && !it.popped) {
      const y = HY[it.h], sw = Math.sin(t * 3 + it.d0) * 0.15;
      ctx.strokeStyle = '#3a2010'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(sx - 40, 150); ctx.quadraticCurveTo(sx, 170, sx + 40, 150); ctx.stroke();
      ctx.save(); ctx.translate(sx, 160); ctx.rotate(sw);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, y - 160 - 12); ctx.stroke();
      if (it.kind === 'melon') { ctx.fillStyle = '#3e9a3e'; ctx.beginPath(); ctx.ellipse(0, y - 160, 14, 12, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = '#1e6a2e'; ctx.lineWidth = 2; for (const k of [-6, 0, 6]) { ctx.beginPath(); ctx.moveTo(k, y - 171); ctx.quadraticCurveTo(k * 1.6, y - 160, k, y - 149); ctx.stroke(); } }
      else { ctx.fillStyle = '#a8784a'; ctx.beginPath(); ctx.ellipse(0, y - 158, 12, 15, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#6a4a2a'; ctx.fillRect(-4, y - 176, 8, 6); ctx.fillStyle = 'rgba(140,200,255,0.8)'; circ(4, y - 150 + (t * 30 % 10), 2); ctx.fill(); }
      ctx.restore();
    } else if (it.kind === 'knight') drawKnight(st, it, sx, t);
    else if (it.kind === 'dummy') drawDummy(st, it, sx, t);
    else if (it.kind === 'beam') {
      const y = beamY(it);
      if (it.what === 'rope') { ctx.strokeStyle = '#e8dcc0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx - 66, y - 4); ctx.quadraticCurveTo(sx, y + 10, sx + 66, y - 4); ctx.stroke(); for (let k = -3; k <= 3; k++) { const px = sx + k * 18, py = y + 6 - Math.abs(k) * 1.6; ctx.fillStyle = K.BANNER[(k + 7) % 7]; ctx.beginPath(); ctx.moveTo(px - 7, py); ctx.lineTo(px + 7, py); ctx.lineTo(px + Math.sin(t * 8 + k) * 2, py + 16); ctx.closePath(); ctx.fill(); } }
      else { K.timber(sx - 70, y - 8, 140, 14, { dark: true }); }
    } else if (it.kind === 'crossing') {
      // a line of folk crossing the lane; they part (or scatter) as the horse arrives
      for (let k = 0; k < 4; k++) {
        const u = it.scatter ? Math.min(1, (st.d + R.hx + 100 - it.d0) / 200) : it.part ? Math.min(1, (st.d + R.hx + 100 - it.d0) / 300) : 0;
        const fx = sx + k * 26 + (k % 2 ? 1 : -1) * u * 120, fy = R.gy + 4 - (it.scatter ? Math.abs(Math.sin(u * 8 + k)) * 20 : 0);
        ctx.fillStyle = ['#7a3aa8', '#2e8a4a', '#d8323a', '#c88a52'][k]; rr(fx - 8, fy - 30, 16, 26, 6); ctx.fill();
        ctx.fillStyle = '#f2c8a0'; circ(fx, fy - 36, 7); ctx.fill();
        ctx.fillStyle = '#3a2010'; ctx.fillRect(fx - 6, fy - 4, 4, 4); ctx.fillRect(fx + 2, fy - 4, 4, 4);
      }
      if (!it.met && sx < W && sx > R.hx) text('CROSSING', sx + 40, R.gy - 54, 12, '#ffffff', 'center', 'body');
    }
  }
  function drawKnight(st, it, sx, t) {
    // a straw knight on a wheeled wooden horse, pushed by a page
    const y = R.gy, fall = it.down ? clamp((st.d + R.tip - it.d) / 140, 0, 1) : 0;
    ctx.fillStyle = '#5e3a1c'; circ(sx - 18, y - 8, 8); ctx.fill(); circ(sx + 18, y - 8, 8); ctx.fill();
    ctx.fillStyle = '#a0683a'; ctx.fillRect(sx - 26, y - 30, 52, 16); ctx.fillRect(sx - 34, y - 46, 14, 20);
    ctx.fillStyle = '#7a5a32'; ctx.beginPath(); ctx.moveTo(sx - 34, y - 46); ctx.lineTo(sx - 46, y - 40); ctx.lineTo(sx - 34, y - 34); ctx.closePath(); ctx.fill();
    // the page pushing from behind
    ctx.fillStyle = '#2e8a4a'; rr(sx + 34, y - 26, 12, 22, 5); ctx.fill(); ctx.fillStyle = '#f2c8a0'; circ(sx + 40, y - 32, 6); ctx.fill();
    ctx.save(); ctx.translate(sx, y - 30); ctx.rotate(fall * 1.4);
    // the straw body up to high
    ctx.fillStyle = K.COL.hay; rr(-12, HY[2] - y + 10, 24, y - 30 - HY[2] - 10 + 30 - 30, 8); ctx.fill();
    ctx.fillStyle = '#8a8a96'; circ(0, HY[2] - y + 4 + 30 - 30, 11); ctx.fill();
    ctx.restore();
    if (!it.down) {
      // the shield at its height (flashes red just before a switch), the free heights glow green on the guide
      const sy = HY[it.sh];
      K.heraldShield(sx - 14, sy, 16, { col: '#5a1a6a', charge: 'tower', chargeCol: '#c8c0b0' });
      if (it.sw !== null && !it.switched) text('?', sx - 14, HY[it.sw], 18, '#ffd0c8', 'center', 'display');
    }
  }
  function drawDummy(st, it, sx, t) {
    if (it.down && st.d + R.tip - it.d > 260) return;
    const y = R.gy, fall = it.down ? clamp((st.d + R.tip - it.d) / 120, 0, 1) : 0;
    if (fall) ctx.globalAlpha = 1 - clamp((st.d + R.tip - it.d - 140) / 120, 0, 1);
    // the rail and a big black-armoured straw knight on a trolley
    ctx.fillStyle = '#3a2a20'; ctx.fillRect(sx - 40, y - 10, 90, 10);
    ctx.fillStyle = '#5e3a1c'; circ(sx - 26, y - 12, 9); ctx.fill(); circ(sx + 34, y - 12, 9); ctx.fill();
    // (it topples backwards, away from the pair, spilling straw)
    ctx.save(); ctx.translate(sx + 30, y - 20); ctx.rotate(-fall * 0.5); ctx.translate(-24, 0);
    ctx.fillStyle = K.COL.hay; rr(-16, -150, 32, 130, 10); ctx.fill();
    ctx.fillStyle = '#2a2a34'; rr(-18, -146, 36, 46, 8); ctx.fill(); ctx.fillRect(-18, -70, 36, 10);
    ctx.strokeStyle = K.COL.hayDark; ctx.lineWidth = 2; for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.moveTo(-14 + k * 7, -96); ctx.lineTo(-16 + k * 7, -76); ctx.stroke(); }
    ctx.fillStyle = '#4a4a58'; rr(-16, -186, 32, 36, 8); ctx.fill();
    ctx.fillStyle = '#ffd23a'; ctx.fillRect(-12, -172, 24, 3);
    ctx.fillStyle = '#c8302a'; ctx.beginPath(); ctx.moveTo(0, -186); ctx.quadraticCurveTo(14, -206, 24, -190); ctx.lineTo(4, -184); ctx.closePath(); ctx.fill();
    ctx.restore(); ctx.globalAlpha = 1;
    if (!it.down) {
      // the shield shows the 3-part pattern; this pass's band is lit
      const bx = sx - 22;
      ctx.fillStyle = '#1c1a26'; rr(bx - 18, HY[2] - 20, 36, HY[0] - HY[2] + 40, 10); ctx.fill();
      for (let n = 0; n < 3; n++) {
        const h = it.pat[n], yy = HY[h], on = n === it.pass;
        ctx.fillStyle = on ? (Math.sin(t * 12) > 0 ? C.gold : '#ffffff') : n < it.pass ? 'rgba(143,227,176,0.6)' : 'rgba(255,255,255,0.25)';
        rr(bx - 14, yy - 10, 28, 20, 6); ctx.fill();
        text(String(n + 1), bx, yy + 1, 13, on ? C.ink : '#1c1a26', 'center', 'display');
      }
    }
  }
  function drawRig(st, t) {
    const lift = st.airH, fall = st.state === 'fall', sp = st.v / S.gallop, L = st.lance;
    st.ph = (st.ph || 0) + (1 / 60) * st.v / 150;
    const jumpU = st.air ? clamp(Math.sin(clamp(st.air.t / st.air.len, 0, 1) * Math.PI) * 1.3, 0, 1) : 0;
    K.horse(R.hx, R.gy - lift, { s: R.hs, phase: st.ph, speed: fall ? 0.1 : clamp(sp, 0.3, 1), duck: st.duck ? 1 : 0, cap: ['#ff7a2a', '#3a6ee8'], capTrim: '#ffd23a', coat: '#f2ece0', coatDark: '#c8c0b0', mane: '#d8cfc0', gold: st.gold, jump: jumpU });
    const s = seats(st), rId = st.rider, lId = st.lancer, sq = st.duck ? 0.45 : 0;
    // the lancer behind, then the lance, then the rider in front
    const lo = { outfit: 'borrowed', face: 1, s: 1.1, prop: 'lance', arms: 'fwd', v: sp, sq, askew: st.askew, visor: st.visor, rot: fall ? st.fallT * 5 : 0, stun: st.stars > 0 };
    K.squire(lId, s.lancer.x, s.lancer.y, lo);
    // the lance from the lancer's grip to the tip (a couched lance is braced level under the arm)
    if (!fall) {
      const gx = s.lancer.x + 8, gy = s.lancer.y - 12 - (st.duck ? -4 : 0);
      const h = L.wob > 0 ? -0.6 : L.h, ty = K.lerp(HY[0], HY[2], clamp(h, -0.6, 2) / 2) - lift * 0.75 + (L.couch ? 0 : 6);
      st.tipY = ty;
      const ang = Math.atan2(ty - gy, R.tip - gx), len = Math.hypot(R.tip - gx, ty - gy) + 14;
      const vamp = !L.couch ? 0 : 0;
      K.lance(gx - Math.cos(ang) * 20, gy - Math.sin(ang) * 20, ang, len + 20 + vamp, { cols: ['#ff7a2a', '#3a6ee8'], gold: st.gold, splinter: L.splinter });
      // rings stacked on the lance
      const n = Math.min(st.rings - st.ringsAtStart, 6);
      for (let k = 0; k < n; k++) { const u = 0.35 + k * 0.05, rx = gx + Math.cos(ang) * len * u, ry = gy + Math.sin(ang) * len * u; ctx.strokeStyle = '#ffd23a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(rx, ry, 3, 9, ang, 0, TAU); ctx.stroke(); }
      // the arm-strength ring by the lancer
      const max = st.gold ? S.goldCouch : S.couch, u = L.tired > 0 ? 1 - L.tired / S.tire : 1 - L.use / max;
      if (L.couch || L.use > 0 || L.tired > 0) { ctx.strokeStyle = L.tired > 0 ? '#ff5a4a' : L.couch ? '#8fe3b0' : 'rgba(255,255,255,0.6)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(s.lancer.x - 24, s.lancer.y - 40, 9, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(u, 0, 1)); ctx.stroke(); }
    }
    K.squire(rId, s.rider.x, s.rider.y, { outfit: 'borrowed', face: 1, s: 1.1, prop: 'spur', arms: 'reins', v: sp, sq, askew: -st.askew * 0.8, visor: st.visor, rot: fall ? st.fallT * 4 : 0, stun: st.stars > 0 });
    // reins
    if (!fall) { ctx.strokeStyle = st.gold ? C.gold : '#3a2010'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(s.rider.x + 10, s.rider.y - 10); ctx.quadraticCurveTo(s.rider.x + 34, s.rider.y + 4, R.hx + 58 * R.hs, R.gy - 82 * R.hs + (st.duck ? 30 : 0) - lift); ctx.stroke(); }
    if (st.soak > 0) for (let k = 0; k < 3; k++) { ctx.fillStyle = 'rgba(140,200,255,0.8)'; circ(R.hx - 20 + k * 20, s.rider.y - 30 + ((t * 60 + k * 9) % 22), 2); ctx.fill(); }
    if (st.stars > 0) for (let k = 0; k < 3; k++) { const a = t * 5 + k * TAU / 3; text('★', R.hx + Math.cos(a) * 26, s.rider.y - 46 + Math.sin(a) * 6, 12, '#ffd23a', 'center', 'display'); }
    if (fall) K.hay(R.hx + 90, R.gy, 1.2);
  }
  // the lance guide at the tip: three height marks, the lance's current height, upcoming targets glowing
  function drawGuide(st, t) {
    if (st.state !== 'go') return;
    const pl = plan(st), x = R.tip + 2, e = eff(st);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2; ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.moveTo(x, HY[2] - 22); ctx.lineTo(x, HY[0] + 18); ctx.stroke(); ctx.setLineDash([]);
    const next = pl.ahead.find(a => a.lance && a.t > -0.05);
    for (let h = 0; h < 3; h++) {
      let col = 'rgba(255,255,255,0.5)';
      if (next && next.glow) {
        if (next.kind === 'knight') col = h === next.sh ? '#ff5a4a' : '#8fe3b0';
        else if (h === next.h) col = st.gold ? C.gold : '#8fe3b0';
      }
      ctx.fillStyle = col; rr(x - 8, HY[h] - 3, 16, 6, 3); ctx.fill();
    }
    // where the lance counts now (a ring round the tip; filled when couched)
    if (e <= 2) { ctx.strokeStyle = st.lance.couch ? '#8fe3b0' : '#ffffff'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x, HY[e], 10, 0, TAU); ctx.stroke(); }
  }
  const circ = (x, y, r) => circle(x, y, r);
  function drawTop(st) { K.drawPops(st, 0, 0); }

  /* ---------- HUD ---------- */
  function hud(st) {
    const big = hudBig(), z = big ? 1.35 : 1, play = G.mode === 'play' || G.mode === 'paused';
    let timeX0;
    {
      const fs = big ? 20 : 14, h = big ? 40 : 28, tm = fmtTime(G.time), n = '◯ ' + st.rings + ' / ' + S.rings;
      ctx.font = K.FONT(fs);
      const w = ctx.measureText(tm).width + ctx.measureText(n).width + fs + 30, x0 = pill(W - 14, 12, w, h, 'right'), cy = 12 + h / 2 + 0.5;
      text(tm, x0 + 15, cy, fs, st.waiting ? '#aab' : C.paper, 'left', 'body');
      text(n, x0 + w - 15, cy, fs, '#ffe08a', 'right', 'body');
      timeX0 = x0;
    }
    K.drawMsg(st, st.waiting ? { text: K.BREAK, col: '#ffffff', t: 1, life: 2 } : st.msg, timeX0);
    if (!play || !st.lance) return;
    // the balance bar (three Bonks without a clean hit = Unhorsed)
    {
      const w = 180 * z, h = 13 * z, x = W / 2 - w / 2, y = H - 40 * z;
      // a dark panel behind the gauge, so its words read on the pale dirt
      ctx.fillStyle = 'rgba(20,22,52,0.86)'; rr(x - 16 * z, y - 19 * z, w + 32 * z, 51 * z, 13 * z); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.13)'; ctx.lineWidth = 1; rr(x - 16 * z + 0.5, y - 19 * z + 0.5, w + 32 * z - 1, 51 * z - 1, 13 * z); ctx.stroke();
      text('Balance', x + w / 2, y - 9 * z, 11 * z, '#ffffff', 'center', 'body');
      for (let k = 0; k < 3; k++) { const on = k < 3 - st.bonkRun; ctx.fillStyle = on ? (st.bonkRun >= 2 ? '#ff5a4a' : st.bonkRun === 1 ? '#ffb04a' : '#8fe3b0') : 'rgba(255,255,255,0.14)'; rr(x + k * (w / 3) + 2, y, w / 3 - 4, h, h / 2); ctx.fill(); }
      text(st.soak > 0 ? 'soaked: slippery reins' : 'streak ' + (st.streak || 0), x + w / 2, y + h + 9 * z, 10 * z, st.soak > 0 ? '#bfe8ff' : '#e8dcc8', 'center', 'body');
    }
    const pl = plan(st), Rn = st.rider, Ln = st.lancer, L = st.lance;
    const kk = (id, what) => (K.quiet(id) ? '' : K.key(id, what) + ' ');
    {
      const bx = K.panel(Rn, 'rider', 236, 58, z), cy = bx.y + 27 * z, chh = 23 * z, cw = (bx.w - 24 * z - 12 * z) / 3, x0 = bx.x + 12 * z;
      const gal = st.v >= S.perfectV;
      K.chip(x0, cy, cw, chh, gal ? 'GALLOP' : inMud(st) ? 'MUD' : kk(Rn, 'right') + 'GALLOP', pl.ride.speed === 'gallop' && !st.gal && !inMud(st), gal, z);
      K.chip(x0 + cw + 6 * z, cy, cw, chh, kk(Rn, 'up') + 'JUMP', pl.ride.jump, !!st.air, z);
      K.chip(x0 + (cw + 6 * z) * 2, cy, cw, chh, kk(Rn, 'down') + 'DUCK', pl.ride.duck && !st.duck, st.duck, z);
    }
    {
      const bx = K.panel(Ln, 'lance', 236, 58, z), cy = bx.y + 27 * z, chh = 23 * z, cw = (bx.w - 24 * z - 6 * z) / 2, x0 = bx.x + 12 * z;
      const want = pl.lance.h, ok = L.set === want;
      K.chip(x0, cy, cw, chh, (ok ? '' : kk(Ln, want > L.set ? 'up' : 'down')) + HN[L.set], !ok && pl.lance.why !== 'ride', ok && pl.lance.why !== 'ride', z);
      K.chip(x0 + cw + 6 * z, cy, cw, chh, L.tired > 0 ? 'tired...' : kk(Ln, 'act') + 'COUCH', pl.lance.couch && !L.couch, L.couch, z);
    }
    if (G.introT > 0 || st.state !== 'go' || st.waiting) return;
    const P = K.prompter(st), sp = seats(st);
    {
      let s = null, col = C.gold, pulse = false;
      const g = pl.ahead.find(a => a.kind === 'ground' && a.t < 1.2 && a.t > -0.2);
      const bm = pl.ahead.find(a => a.kind === 'beam' && a.t < 1.0);
      const cr = pl.ahead.find(a => a.kind === 'crossing' && a.t < 2.2);
      if (bm) { s = 'Duck! Hold ' + K.key(Rn, 'down'); pulse = bm.t < 0.3; }
      else if (g) { s = (g.what === 'trough' ? 'Long jump! Hold ' : 'Jump! ') + K.key(Rn, 'up'); pulse = pl.ride.jump; }
      else if (cr && st.v > S.canter + 30) { s = 'Crossing! Canter ' + K.key(Rn, 'left'); pulse = true; }
      else if (!st.gal && !cr && !inMud(st)) { s = 'Gallop! ' + K.key(Rn, 'right'); }
      P.say(Rn, s, sp.rider.x + 30, sp.rider.y - 40, col, pulse);
    }
    {
      let s = null, col = C.gold, pulse = false;
      const n = pl.lance.target;
      if (L.tired > 0) { s = 'Arm tired...'; col = '#ffd0c8'; }
      else if (n && L.set !== pl.lance.h) { s = (pl.lance.air ? 'In the air: ' : '') + HN[pl.lance.h] + ' ' + K.key(Ln, pl.lance.h > L.set ? 'up' : 'down'); pulse = n.t < 1; }
      else if (pl.lance.why === 'beam' && L.set > 1) { s = 'Lance down for the beam ' + K.key(Ln, 'down'); pulse = true; }
      else if (pl.lance.couch && !L.couch) { s = 'Couch! Hold ' + K.key(Ln, 'act'); pulse = true; }
      P.say(Ln, s, sp.lancer.x - 30, sp.lancer.y - 60, col, pulse);
    }
  }
  MODES.tandemjoust = {
    S, R, HY, plan, eff: st => eff(st),
    medals: { bronze: 'Finish the joust run', goals: [{ key: 'time', gold: S.goldT, silver: S.silverT }] },
    medalValues() { return {}; },
    setup(st, L) {
      st.stats = { rings: 0, perfect: 0, good: 0, bonks: 0, unhorsed: 0, bestStreak: 0, jumps: 0, clears: 0, ducks: 0, knights: 0, pops: 0, soaks: 0, vaults: 0, missed: [], bonkWhy: [], helps: 0, roomT: [] };
      st.rings = 0; st.streak = 0; st.inT = [G.time, G.time]; st.personT = G.time; st.clock = 0; st.T = 0; st.items = null;
      for (const row of L.grid) row.fill('.');
      room(st, L, 0);
    },
    room(k, L) { const st = G.mst; st.inT = [G.time, G.time]; st.personT = G.time; for (const row of L.grid) row.fill('.'); st.items = null; room(st, L, k); },
    step(dt) { tick(G.mst, dt); },
    draw() { const st = G.mst; if (!st.items) return; draw(st); K.hide(st); },
    drawTop() { const st = G.mst; K.unhide(st); if (st.items) drawTop(st); },
    hud() { const st = G.mst; if (st.items) hud(st); },
    stats() {
      const st = G.mst, s = st.stats;
      if (!s) return [];
      const out = [
        { label: 'Rings', value: st.rings + ' of ' + S.rings },
        { label: 'Perfect hits', value: String(s.perfect) },
        { label: 'Bonks', value: String(s.bonks) },
      ];
      out.push('Unhorsed: ' + s.unhorsed + '. Longest hit streak: ' + s.bestStreak + '. Melons and water skins popped: ' + s.pops + '. The knight never found out!');
      const hl = K.helpLine(s.helps); if (hl) out.push(hl);
      return out;
    },
  };

  /* ---------- the level ---------- */
  const acts = d => ({ label: 'couch', labels: d === 0 ? ['spur', 'couch'] : ['couch', 'spur'] });
  TOURNEY.defs.tandemjoust = {
    name: 'Tandem Joust Run', world: 36, kind: 'team', mode: 'tandemjoust', outfit: 'none', ownStep: true, ownHUD: true, noFalls: true, roomWord: 'Stretch',
    jobs: {
      rider: { title: 'Rider', act: 'spur', legend: '<kbd>W</kbd> jump, hold for longer <kbd>D</kbd> gallop <kbd>A</kbd> canter <kbd>S</kbd> hold to duck' },
      lancer: { title: 'Lancer', act: 'couch', legend: '<kbd>W</kbd><kbd>S</kbd> lance up, down',
        howTo: ['Hold couch just before each target.'] },
    },
    jobOf: 'rider', jobSwap: 'You swap jobs every stretch.',
    tip: 'Two squires, one horse, one very long lance! The rider jumps, ducks and gallops; the lancer sets the height and holds the action to couch just before each target.',
    act: acts(0),
    map: K.stubMap(),
    rooms: [
      { title: 'The Practice Lane', rider: 0, done: 'Practice done!', act: acts(0),
        tip: 'Pip rides: ▶ gallop, ◀ canter, ▲ jump (hold for longer), ▼ duck. Bo has the lance: ▲ ▼ set the height, HOLD the action to couch just before the ring.' },
      { title: 'The Page\'s Gauntlet', rider: 1, done: 'Through the gauntlet!', act: acts(1),
        tip: 'Swap jobs! Straw knights: strike where the shield is NOT. Duck the beams with the lance low or middle. Mud slows you to a canter.' },
      { title: 'Round the Fairground', rider: 0, done: 'Round the fair!', act: acts(0),
        tip: 'Canter through the crowd crossings and duck the pennant ropes. In the air the lance counts one step higher!' },
      { title: 'The Champion\'s Course', rider: 1, done: 'Champions!', act: acts(1),
        tip: 'Everything at once! Some knights switch their shield at the last moment. Lift the lance before landing on rough ground.' },
    ],
  };

  /* ---------- sounds ---------- */
  Sfx.extra.tandemjoustSpur = function () { this.tone(1500, 0.05, 'square', 0.02, 2200); this.tone(700, 0.08, 'triangle', 0.03, 900, 0.03); };
  Sfx.extra.tandemjoustHup = function () { this.tone(300, 0.14, 'triangle', 0.04, 620); };
  Sfx.extra.tandemjoustTick = function () { this.tone(1200, 0.025, 'square', 0.015, 1000); };
  Sfx.extra.tandemjoustCouch = function () { this.tone(220, 0.08, 'square', 0.025, 160); };
  Sfx.extra.tandemjoustTired = function () { this.tone(400, 0.25, 'sawtooth', 0.015, 160); };
  Sfx.extra.tandemjoustRing = function (p) { p = p || 1; this.tone(1568 * p, 0.12, 'triangle', 0.035, null); this.tone(2093 * p, 0.18, 'sine', 0.025, null, 0.06); };
  Sfx.extra.tandemjoustBonk = function () { this.tone(180, 0.12, 'square', 0.05, 90); this.tone(1200, 0.2, 'triangle', 0.02, 1800, 0.06); };
  Sfx.extra.tandemjoustSplat = function () { this.tone(140, 0.12, 'sawtooth', 0.04, 60); this.tone(900, 0.05, 'square', 0.01, 300); };
  Sfx.extra.tandemjoustSplash = function () { for (let k = 0; k < 4; k++) this.tone(1600 - k * 250, 0.06, 'sine', 0.02, 600, k * 0.03); };
  Sfx.extra.tandemjoustSwitch = function () { this.tone(500, 0.08, 'square', 0.02, 900); };
})();
