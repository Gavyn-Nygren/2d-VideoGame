/* Pip & Bo - Level 37-3 Siege Tower Push (team, World 37 Medieval Tournament). */
'use strict';

/* ===== 37-3 Siege Tower Push (mode 'siegetower', team, player-paced scrolling, Gavyn's pick) =====
   The rival baron stole the tournament trophy and shut himself in his castle. Push the squeaky four-storey siege tower
   up the hill to his wall while the castle throws everything at it, then drop the bridge and climb in. Jobs swap
   every stretch.
   Side view; the camera follows the tower (screen x = world x - st.cx) and the tower only moves when pushed. World x
   is along the road; the road climbs where a stretch has slope (height(x) is the climb so far, drawn as a real hill).
   The tower (about 300 px tall): wheels and a push bar at the back on the ground, a deck at 1, 2 and 3 (the top, open,
   with the hide roof panel), a ladder at the back and the front between every two levels, and a drawbridge folded at
   the front. The castle wall grows on the right. The mode owns the tick, the picture and the HUD.
   THE PUSHER (G.mst.push, at the bar): ▶ held = push (60 px/s on the flat, slower uphill: the strain meter), ◀ held =
     brake (holds the tower on a slope). Action = HEAVE: 0.8 s at double force, 4 s cooldown (over ruts). ▼ = duck
     behind the bar's shield board (safe from arrows and barrels, can't push). Jump = let go of the bar (to walk and pick
     up a dropped shield on the ground); walk back into the bar to take it again. Nobody on the bar on a slope: the tower
     rolls back, slowly at first; a runaway back to the last chock is a ROLLBACK.
   THE TOWER HERO: ◀ ▶ walk a deck (or the ground), ▲ / ▼ at a ladder climb (0.5 s a level). The action does the job at
     hand: on the top deck HOLD = raise the roof panel over the tower front and the bar (can't move while holding);
     beside a fire, tap 3 times; at the winch (deck 2, middle) HOLD 1.2 s to haul up a water bucket for a big fire; at a
     wheel on the ground, kick out a jammed stone; on deck 1 at the front, drop a trench plank or swing the ram plank
     at a barrel; on deck 1 at the back, drop a chock behind the wheels (the checkpoint: the tower can't roll back past
     it). On the ground at the bar the hero can push too (the mud needs both).
   THE CASTLE (each with a tell):
     ARROW VOLLEYS: a horn and archers standing up on the wall 1 s before a 1.2 s rain. The raised roof covers the tower
       and the bar. An uncovered pusher who isn't ducking, or a hero on the open top deck, is KNOCKED (60 px back in a
       heap, 1.5 s; the tower starts to roll on a slope).
     FIRE ARROWS: stick in a deck (the raised roof blocks them) and start a fire that grows through 3 sizes over 5 s.
       Small and middle: 3 taps. Big: a bucket. Left 10 s, it burns through that deck's floor: a BURN, and the ladder
       up to it on that side is gone for the stretch (the long way round).
     CATAPULT BOULDERS: the arm winds back (creak) and a shadow slides to where it lands in 1.6 s. Don't let the tower
       (or the pusher) be under it: a hit knocks a wall panel off (4 a stretch); the fourth is a SMASH that rolls the
       tower back to the last chock.
     ROLLING BARRELS and HAY-FIRE WHEELS down the hill: the tower shrugs them off but they knock a standing pusher down
       (duck); a hay-fire wheel sets deck 1 alight. The ram plank splits them first.
     GROUND: ruts (heave), stones that jam a wheel (kick it out), mud (both push), a trench (drop two planks first),
       and in the last stretch boiling porridge from the gatehouse spouts (time the push past it).
   SHIELDS: 20 stolen tournament shields: on the ground (only someone NOT on the bar picks them up) and hung on the
     outer works at deck heights (the tower hero grabs those from that deck as the tower passes).
   THE END (stretch 4): at the wall the tower hero holds the action 1.5 s on the top deck to drop the drawbridge while
     the pusher holds the tower against the wall (▶); then both climb to the top deck and cross within 8 s (the bridge
     creaks back up otherwise: drop it again). The baron hands back the trophy with very bad grace.
   STRETCHES (rooms): The Meadow, The Hill Road, The Ditches, Under the Wall.
   GOLD HELP (only while both are playing, announced, counted): 3 bad events (Knock, Burn, Smash, Rollback) in a
     stretch = gold wheels: the tower doesn't roll back on slopes and the heave has no cooldown for the rest of it.
   IDLE: no person presses anything for 12 s: "Taking a break", the castle and the clock wait.
   MEDAL: by time. Gold <= 200 s, Silver <= 340 s.
   OUTFITS (Gavyn's rule): siege engineers (TOURNEY_OUTFITS 'engineer'). Pip a leather apron, rolled sleeves, kettle
     hat and a mallet; Bo a hooded mantle, mail collar, fire gloves and a rope coil. The pusher wears the padded
     shoulder straps, the tower hero carries the wet hide; soot builds up through the level; a Knocked hero has a
     dented hat with stars; arrows that hit the raised roof stay stuck in it.
   MODES.siegetower.plan(st) says what each job should do now (the prompts, the HUD chips and the brain read it).
   Everything lives inside this block; sounds are Sfx.extra.siegetower*. */
(() => {
  const K = TOURNEY, TAU = Math.PI * 2;
  const S = {
    push: 70, slopeK: 2.6, heaveT: 0.8, heaveCd: 4, roll: 110, rollMax: 90, runaway: 40, walk: 110, climbT: 0.5,
    tell: 1, rain: 1.2, knockT: 1.5, knockBack: 60, fireGrow: 3, burnT: 10, taps: 3, winchT: 1.2, bridgeT: 1.5,
    crossT: 8, boulderT: 1.6, boulderR: 46, barrelV: 140, spoutOn: 1.4, spoutOff: 2.4, raise: 0.15,
    pace: 0.9, idleWait: 12, goldT: 200, silverT: 340, shields: 20, panels: 4,
  };
  // the tower in its own frame (x from its middle, y up from the ground): decks, ladders, bar, wheels, stations
  const T = { half: 64, deck: [0, 86, 168, 250], lad: [-46, 46], bar: -84, wheel: [-42, 42], winch: 0, chock: -34, plank: 38, top: 286 };
  const SCR = { x: 430, gy: 436 };
  const rnd = (a, b) => a + Math.random() * (b - a);

  /* ---------- the script: world x of everything in a stretch ---------- */
  function script(k) {
    const L = [], pc = S.pace;
    const add = (x, kind, o) => { const it = Object.assign({ x: x * pc, kind, done: false }, o || {}); if (it.len) it.len *= pc; L.push(it); return it; };
    const slopes = [];
    const slope = (x0, x1, s) => slopes.push({ x0: x0 * pc, x1: x1 * pc, s });
    const shG = x => add(x, 'shield', { lvl: 0 });
    const shH = (x, lvl) => add(x, 'shield', { lvl });
    const volley = x => add(x, 'volley');
    const fire = (x, lvl, side) => add(x, 'firearrow', { lvl, side: side || (Math.random() < 0.5 ? -1 : 1) });
    let end;
    if (k === 0) {
      // The Meadow: flat; learn push, heave, roof, small fires
      shG(330); volley(520); shH(720, 2); fire(900, 2); add(1080, 'rut'); shH(1260, 1); volley(1440); fire(1560, 1, 1);
      shG(1700); fire(1880, 3, -1); shH(1990, 3); end = 2150;
    } else if (k === 1) {
      // The Hill Road: slope, chocks, ruts, barrels, the first boulders
      slope(150, 1050, 0.12); slope(1350, 2000, 0.14);
      shH(300, 1); add(420, 'rut'); add(560, 'barrel'); volley(720); shH(860, 3); add(980, 'boulder');
      shG(1180); fire(1300, 2); add(1420, 'rut'); add(1600, 'barrel', { hay: true }); add(1800, 'boulder'); volley(1940); shH(1080, 3); shH(1990, 2);
      end = 2200;
    } else if (k === 2) {
      // The Ditches: mud, trench planks, jammed wheels, big fires and buckets
      shG(260); add(380, 'stone', { w: 1 }); fire(520, 1, 1); add(640, 'mud', { len: 260 }); shH(190, 2);
      add(1020, 'trench'); fire(1100, 3, -1); volley(1420); add(1340, 'stone', { w: 0 }); shH(1240, 2); shH(1500, 1);
      add(1560, 'boulder'); shG(1700); fire(1820, 2); end = 2050;
      for (const it of L) if (it.kind === 'firearrow' && it.x > 1000 * pc) it.big = true;
    } else {
      // Under the Wall: everything, porridge spouts, then the drawbridge
      slope(200, 1300, 0.1);
      shH(260, 3); volley(400); add(520, 'barrel'); fire(640, 2); add(760, 'rut'); add(980, 'boulder');
      shH(1100, 2); add(1180, 'stone', { w: 1 }); volley(1300); shG(1380); add(1480, 'spout'); add(1610, 'spout'); shH(1700, 1); shH(1890, 2);
      fire(1660, 3); add(1780, 'boulder'); end = 1980;
      add(end, 'wall');
    }
    return { L, len: end * pc, slopes };
  }

  /* ---------- a stretch (one room) ---------- */
  function room(st, L, k) {
    const def = L.def;
    st.k = k; st.push = def.pusher || 0; st.tw = 1 - st.push; st.title = def.title || '';
    st.goldUsed = false; st.gold = false; st.rc = { bad: 0 };
    st.shAtStart = st.shields;
    labels(st);
    const sc = script(k);
    st.items = sc.L; st.len = sc.len; st.slopes = sc.slopes; st.last = k === 3;
    st.tx = 120; st.v = 0; st.chockX = 120; st.panels = S.panels; st.burned = {};
    st.heave = 0; st.heaveCd = 0; st.roof = 0; st.roofArrows = st.roofArrows || 0;
    st.fires = []; st.boulders = []; st.barrels = []; st.volley = null; st.planks = 0; st.bucketT = 0; st.jam = null;
    st.pu = { at: true, x: T.bar, duck: false, knock: 0, letT: 0, face: 1, v: 0 };
    st.he = climber(3, 0);
    st.bridge = { down: false, hold: 0, t: 0, open: 0 };
    st.state = 'go'; st.endT = 0; st.prevIn = [{}, {}]; st.cleared = false; st.party = false;
    st.segStart = G.time; st.rollFrom = null;
    K.fx(st);
  }
  const climber = (lvl, x) => ({ lvl, x, climb: null, face: 1, act: 0, bucket: false, knock: 0, hold: 0, across: false, beat: 0 });
  function labels(st) { const w = []; w[st.push] = 'heave'; w[st.tw] = 'job'; K.actLabels(w, 'job'); }
  // the slope and the climb so far at world x
  function slopeAt(st, x) { for (const s of st.slopes) if (x >= s.x0 && x < s.x1) return s.s; return 0; }
  function height(st, x) { let h = 0; for (const s of st.slopes) { if (x <= s.x0) continue; h += (Math.min(x, s.x1) - s.x0) * s.s; } return h; }

  /* ---------- the tick ---------- */
  function tick(st, dt) {
    if (!st.items) return;
    K.track(st);
    st.waiting = st.state === 'go' && K.idle(st, dt, S.idleWait);
    const live = G.introT <= 0 && !st.waiting && (st.state === 'go' || st.state === 'bridge');
    st.clock += dt;
    const P = G.players;
    const edge = (id, k) => { const i = P[id].input, on = k === 'jump' ? (i.jump || i.up || P[id].pendingJump) : i[k]; const was = st.prevIn[id][k]; st.prevIn[id][k] = !!on; return on && !was; };
    st.edges = [0, 1].map(id => ({ jump: edge(id, 'jump'), down: edge(id, 'down'), act: P[id].pendingAct || edge(id, 'act') }));
    if (live) {
      st.T += dt;
      // (at the wall the pusher still works the bar until the bridge is down: a pusher who let go, or was knocked,
      // as the tower rolled up to the wall must be able to take the bar again, or the bridge could never drop)
      if (st.state === 'go' || !st.pu2) { pusher(st, dt); }
      else climberStep(st, st.pu2, st.push, dt);
      climberStep(st, st.he, st.tw, dt);
      tower(st, dt);
      castle(st, dt);
      if (st.state === 'bridge') bridgeStep(st, dt);
      else if (!st.last && st.tx >= st.len) endStretch(st);
    } else if (st.state === 'end') endStep(st, dt);
    for (const p of P) { p.pendingJump = false; p.pendingAct = false; }
    K.tickFx(st, dt);
    st.cx = st.tx - SCR.x;
    mirror(st);
  }

  /* ---------- the pusher ---------- */
  function pusher(st, dt) {
    const u = st.pu, id = st.push, i = G.players[id].input, e = st.edges[id];
    if (st.heaveCd > 0) st.heaveCd -= dt;
    if (st.heave > 0) st.heave -= dt;
    if (u.knock > 0) { u.knock -= dt; u.duck = false; return; }
    u.duck = !!i.down;
    if (u.at) {
      u.x = T.bar;
      if (e.jump) { u.at = false; u.away = false; u.offT = 0; u.letT = 0.4; K.hint(st, id, 'Walk back into the bar to grab it', 1.4); return; }
      if (st.edges[id].act) {
        if (st.heaveCd <= 0 || st.gold) { st.heave = S.heaveT; st.heaveCd = S.heaveCd; Sfx.play('siegetowerHeave'); K.pop(st, scrX(st, T.bar) , SCR.gy - 80, 'HEAVE!', PCOL[id], 20); st.stats.heaves++; }
        else K.hint(st, id, 'Catch your breath... ' + Math.ceil(st.heaveCd) + ' s', 1);
      }
    } else {
      if (u.letT > 0) u.letT -= dt;
      const dir = (i.right ? 1 : 0) - (i.left ? 1 : 0);
      if (dir) u.face = dir;
      if (!u.duck) u.x = clamp(u.x + dir * S.walk * dt, -260, 220);
      // (walk away and back into the bar to take it again; after a knock the pusher is already away)
      u.offT = (u.offT || 0) + dt;
      if (Math.abs(u.x - T.bar) > 12 || u.offT > 1.2) u.away = true;
      if (u.letT <= 0 && u.away && Math.abs(u.x - T.bar) < 8) { u.at = true; u.away = false; Sfx.play('siegetowerGrip'); }
      grabGround(st, st.tx + u.x);
    }
  }
  // someone off the bar walking over a dropped shield on the ground picks it up
  function grabGround(st, wx) {
    for (const it of st.items) if (it.kind === 'shield' && !it.done && it.lvl === 0 && Math.abs(it.x - wx) < 20) gotShield(st, it, wx, SCR.gy - 30);
  }
  function gotShield(st, it, wx, sy) {
    it.done = true; st.shields++; st.stats.shields++;
    Sfx.play('tourneyPop', 1 + st.shields * 0.02);
    K.spark(st, wx - st.cx, sy, 8, ['#ffd23a', '#ffffff']);
    K.pop(st, wx - st.cx, sy - 30, 'Shield!', '#ffe7a8', 16);
  }

  /* ---------- a climber: the tower hero (and, after the bridge drops, the pusher too) ---------- */
  function ladderOK(st, side, toLvl) { return !st.burned[toLvl + ':' + side]; }
  function climberStep(st, c, id, dt) {
    if (!c) return;
    const i = G.players[id].input, e = st.edges[id];
    if (c.knock > 0) { c.knock -= dt; c.hold = 0; return; }
    if (c.beat > 0) c.beat -= dt;
    if (c.climb) {
      c.climb.t += dt;
      if (c.climb.t >= S.climbT) { c.lvl = c.climb.to; c.climb = null; Sfx.play('siegetowerStep'); }
      return;
    }
    if (c.across) return;
    const dir = (i.right ? 1 : 0) - (i.left ? 1 : 0);
    if (dir) c.face = dir;
    // holding the roof panel up: can't move
    const roofing = id === st.tw && c.lvl === 3 && i.act && st.state === 'go' && !st.fires.some(f => f.lvl === 3 && Math.abs(f.x - c.x) < 22);
    // on the ground at the bar, ▶ pushes instead of walking (▲ lets go of it)
    const atBar = c.lvl === 0 && id === st.tw && st.state === 'go' && Math.abs(c.x - T.bar) < 10 && !(c.barLet > 0);
    if (c.barLet > 0) c.barLet -= dt;
    if (atBar && e.jump) { c.barLet = 0.8; c.x = T.bar + 11; return; }
    if (!roofing && !(atBar && dir > 0)) {
      const lo = c.lvl === 0 ? -260 : -T.half + 8, hi = c.lvl === 0 ? 220 : st.state === 'bridge' && c.lvl === 3 && st.bridge.down ? 130 : T.half - 8;
      c.x = clamp(c.x + dir * S.walk * dt, lo, hi);
      // ladders: ▲ / ▼ near one
      const side = Math.abs(c.x - T.lad[0]) < 12 ? 0 : Math.abs(c.x - T.lad[1]) < 12 ? 1 : -1;
      if (e.jump && side >= 0 && c.lvl < 3 && c.beat <= 0) {
        if (ladderOK(st, side, c.lvl + 1)) { c.climb = { from: c.lvl, to: c.lvl + 1, t: 0 }; c.x = T.lad[side]; Sfx.play('siegetowerClimb'); return; }
        K.hint(st, id, 'That ladder burned! Use the other one', 1.4);
      } else if (e.jump && side < 0 && c.lvl < 3) K.hintOnce(st, id, 'ladder', 'Climb at a ladder (the back or the front of the tower)', 1.8);
      if (e.down && side >= 0 && c.lvl > 0) {
        if (ladderOK(st, side, c.lvl)) { c.climb = { from: c.lvl, to: c.lvl - 1, t: 0 }; c.x = T.lad[side]; Sfx.play('siegetowerClimb'); return; }
        K.hint(st, id, 'That ladder burned! Use the other one', 1.4);
      }
    }
    if (c.lvl === 0 && st.state === 'go') grabGround(st, st.tx + c.x);
    if (c.lvl > 0) for (const it of st.items) if (it.kind === 'shield' && !it.done && it.lvl === c.lvl && Math.abs(it.x - (st.tx + c.x)) < 26) gotShield(st, it, st.tx + c.x, deckY(st, c.lvl) - 30);
    if (st.state === 'bridge' && c.lvl === 3 && c.x > T.half + 20 && st.bridge.down) { c.across = true; Sfx.play('siegetowerStep'); return; }
    if (id !== st.tw) return;
    jobs(st, c, id, dt, i, e);
  }
  function jobs(st, c, id, dt, i, e) {
    // the roof panel (but beside a fire on the top deck the action is for the fire)
    const fireHere = st.fires.find(f => f.lvl === c.lvl && Math.abs(f.x - c.x) < 22);
    if (c.lvl === 3 && i.act && !fireHere) { st.roof = Math.min(1, st.roof + dt / S.raise); c.hold = 1; return; }
    if (c.hold) { c.hold = 0; c.beat = 0.1; }
    // the winch: hold 1.2 s
    if (c.lvl === 2 && Math.abs(c.x - T.winch) < 14 && i.act && !c.bucket) {
      st.bucketT += dt;
      if (Math.random() < dt * 6) Sfx.play('siegetowerCreak');
      if (st.bucketT >= S.winchT) { c.bucket = true; st.bucketT = 0; Sfx.play('siegetowerSplash'); K.pop(st, scrX(st, c.x), deckY(st, 2) - 40, 'Bucket!', '#bfe8ff', 16); }
      return;
    } else st.bucketT = 0;
    if (!e.act) return;
    c.act = 0.2;
    // a fire on this deck within reach
    const f = st.fires.find(f => f.lvl === c.lvl && Math.abs(f.x - c.x) < 22);
    if (f) {
      if (f.size >= 3 && !c.bucket) { K.hint(st, id, 'Too big! Haul a bucket at the winch (deck 2)', 1.6); Sfx.play('siegetowerHiss'); return; }
      if (c.bucket) { c.bucket = false; f.out = true; }
      else { f.taps++; Sfx.play('siegetowerSlap'); if (f.taps >= S.taps) f.out = true; }
      if (f.out) { st.stats.fires++; Sfx.play('siegetowerHiss'); K.pop(st, scrX(st, f.x), deckY(st, f.lvl) - 40, 'Out!', '#d9ffd0', 16); for (let n = 0; n < 8; n++) K.part(st, scrX(st, f.x), deckY(st, f.lvl) - 10, rnd(-40, 40), rnd(-120, -40), 0.9, 'rgba(200,200,210,0.7)', 6, -40); }
      return;
    }
    if (c.lvl === 0) {
      // kick a jammed stone out of a wheel
      if (st.jam && Math.abs(c.x - T.wheel[st.jam.w]) < 18) { st.jam = null; Sfx.play('siegetowerKick'); K.pop(st, scrX(st, c.x), SCR.gy - 60, 'Kicked out!', '#ffffff', 16); st.stats.kicks++; return; }
      return;
    }
    if (c.lvl === 1 && c.x > T.plank - 16) {
      // drop a trench plank, or swing the ram plank at a barrel
      const tr = st.items.find(it => it.kind === 'trench' && !it.done && it.x - (st.tx + T.half) < 160 && it.x - (st.tx + T.half) > -20);
      if (tr && st.planks < 2) { st.planks++; Sfx.play('tourneyThump'); K.pop(st, scrX(st, T.half + 40), SCR.gy - 50, 'Plank ' + st.planks + ' of 2', '#ffffff', 16); return; }
      const b = st.barrels.find(b => !b.split && b.x - (st.tx + T.half) < 200 && b.x > st.tx);
      if (b) { b.split = true; b.t = 0; Sfx.play('siegetowerCrack'); K.pop(st, b.x - st.cx, SCR.gy - 60, 'Smashed!', '#ffffff', 16); st.stats.rams++; for (let n = 0; n < 10; n++) K.part(st, b.x - st.cx, b.y || SCR.gy - 20, rnd(-120, 120), rnd(-200, -60), 0.8, b.hay ? '#f2cf5a' : '#8a5a32', 4, 600); return; }
      Sfx.play('siegetowerSwing');
      return;
    }
    if (c.lvl === 1 && c.x < T.chock + 16) {
      st.chockX = st.tx; Sfx.play('siegetowerClunk'); st.stats.chocks++;
      K.pop(st, scrX(st, T.wheel[0]), SCR.gy - 50, 'Chocked! (checkpoint)', '#ffe7a8', 16);
    }
  }

  /* ---------- the tower ---------- */
  function pushers(st) {
    // who is pushing on the bar this tick: the pusher, and the hero if on the ground at the bar
    let n = 0, brake = false;
    const u = st.pu, ip = G.players[st.push].input;
    if (st.state === 'go' && u.at && u.knock <= 0 && !u.duck) { if (ip.right) n += st.heave > 0 ? 2 : 1; else if (ip.left) brake = true; }
    const h = st.he, ih = G.players[st.tw].input;
    if (h.lvl === 0 && !h.climb && h.knock <= 0 && Math.abs(h.x - T.bar) < 10) { if (ih.right) n += 1; else if (ih.left) brake = true; }
    return { n, brake };
  }
  function tower(st, dt) {
    if (st.state === 'bridge') { st.v = 0; return; }
    const { n, brake } = pushers(st), s = slopeAt(st, st.tx), mud = inMud(st);
    let fwd = n > 0 ? S.push * Math.min(n, 2) * Math.max(0.3, 1 - s * S.slopeK) : 0;
    if (mud) fwd = n >= 2 ? S.push * 0.75 : n > 0 ? 6 : 0;
    // blockers in front: a rut (heave over it), a jammed wheel, a trench without planks, the wall
    const front = st.tx + T.wheel[1];
    for (const it of st.items) {
      if (it.done) continue;
      if (it.kind === 'rut' && it.x > front - 4 && it.x - front < 4 && !(st.heave > 0)) fwd = 0;
      if (it.kind === 'trench' && st.planks < 2 && it.x - (st.tx + T.half) < 8 && it.x > st.tx) fwd = 0;
      if (it.kind === 'wall' && st.tx + T.half >= it.x - 2) fwd = 0;
    }
    if (st.jam) fwd = 0;
    // (it's heavy: it takes a moment to get rolling and coasts a little when let go)
    if (fwd > 0) st.v = approach(st.v, fwd, 220 * dt);
    else if (brake || st.jam) st.v = approach(st.v, 0, 260 * dt);
    else if (s > 0 && !st.gold) st.v = Math.max(-S.rollMax, st.v - s * S.roll * dt);
    else st.v = approach(st.v, 0, (mud ? 200 : 45) * dt);
    if (st.v < -S.runaway && !st.rollFrom) { st.rollFrom = st.tx; Sfx.play('siegetowerCreak'); K.msg(st, 'It\'s rolling back! Grab the bar and brake (◀)!', '#ffd0c8', 2.2); }
    if (st.v > -10) st.rollFrom = null;
    st.tx += st.v * dt;
    if (st.tx < st.chockX) {
      if (st.v < -S.runaway) { rollback(st); }
      st.tx = st.chockX; st.v = 0;
    }
    st.strain = n > 0 ? clamp(s * S.slopeK + (mud ? 0.5 : 0) + (fwd === 0 ? 1 : 0), 0, 1) : 0;
    if (st.v > 5) { st.wheelA = (st.wheelA || 0) + st.v * dt / 22; if (Math.random() < dt * 3) Sfx.play('siegetowerSqueak'); }
    if (st.v < -5) st.wheelA = (st.wheelA || 0) + st.v * dt / 22;
    // things the tower rolls over: a rut done, a stone that jams a wheel, the end of a trench
    for (const it of st.items) {
      if (it.done) continue;
      if (it.kind === 'rut' && st.tx + T.wheel[0] > it.x + 6) { it.done = true; st.stats.ruts++; }
      if (it.kind === 'shield' && it.x < st.tx - 260 && !it.missed) { it.missed = true; it.done = true; st.stats.missed.push(st.k + ':' + Math.round(it.x) + ':L' + it.lvl); }
      if (it.kind === 'stone' && !it.jammed && st.tx + T.wheel[1] >= it.x - 10) { it.jammed = true; st.jam = { w: it.w }; it.done = true; Sfx.play('siegetowerClunk'); K.msg(st, 'A stone jammed the ' + (it.w ? 'front' : 'back') + ' wheel! Kick it out (tower hero, on the ground)', '#ffd0c8', 3); }
      if (it.kind === 'trench' && st.tx + T.wheel[0] > it.x + 30) { it.done = true; st.planks = 0; }
      if (it.kind === 'wall' && st.last && st.tx + T.half >= it.x - 4 && st.state === 'go') atWall(st);
    }
  }
  function inMud(st) { return st.items.some(it => it.kind === 'mud' && st.tx + T.half > it.x && st.tx - T.half < it.x + it.len); }

  /* ---------- the castle ---------- */
  function castle(st, dt) {
    const tx = st.tx;
    for (const it of st.items) {
      if (it.done || it.fired) continue;
      const near = tx + T.half >= it.x - 240;
      if (it.kind === 'volley' && near && !st.volley) { it.fired = true; it.done = true; st.volley = { t: 0 }; Sfx.play('siegetowerHorn'); K.msg(st, 'Archers! Roof up (top deck, hold the action) or duck!', '#ffd0c8', 2); }
      else if (it.kind === 'firearrow' && tx + T.half >= it.x - 120) { it.fired = true; it.done = true; fireArrow(st, it); }
      else if (it.kind === 'boulder' && tx + T.half >= it.x - 260) { it.fired = true; it.done = true; st.boulders.push({ x: tx + T.half + 70 + S.boulderR, t: 0 }); Sfx.play('tourneyCreak'); }
      else if (it.kind === 'barrel' && tx + T.half >= it.x - 420) { it.fired = true; it.done = true; st.barrels.push({ x: tx + 560, t: 0, hay: !!it.hay, split: false, rot: 0 }); Sfx.play('tourneyRattle'); K.msg(st, it.hay ? 'A burning hay wheel! Ram it (deck 1 front) or duck!' : 'Barrel! Ram it (deck 1 front) or duck!', '#ffd0c8', 2); }
    }
    // the volley: 1 s tell, 1.2 s rain
    if (st.volley) {
      const v = st.volley; v.t += dt;
      if (v.t >= S.tell && !v.rain) { v.rain = true; Sfx.play('siegetowerVolley'); }
      if (v.rain) {
        const covered = st.roof >= 1;
        if (covered && Math.random() < dt * 8) { st.roofArrows = Math.min(12, st.roofArrows + 1); Sfx.play('tourneyThunk'); }
        const u = st.pu;
        if (!covered && st.state === 'go' && !u.duck && u.knock <= 0 && (u.at || Math.abs(u.x) < T.half + 30)) knock(st, 'pu', 'Arrows! Duck (▼) or get the roof up!');
        const h = st.he;
        if (!covered && h.lvl === 3 && !h.climb && h.knock <= 0 && !h.hold) knock(st, 'he', 'Arrows on the top deck! Raise the roof!');
        if (h.lvl === 0 && !h.climb && h.knock <= 0 && !covered && Math.abs(h.x) > T.half + 20) knock(st, 'he', 'Arrows! Get under cover!');
        if (v.t >= S.tell + S.rain) { st.volley = null; st.stats.volleys++; }
      }
    }
    if (!st.he.hold) st.roof = Math.max(0, st.roof - dt / S.raise);
    // fires grow; at 10 s one burns through its deck's floor
    for (const f of st.fires) {
      f.t += dt; f.size = f.big ? 3 : Math.min(3, 1 + Math.floor(f.t / S.fireGrow));
      if (f.t >= S.burnT && !f.out) {
        f.out = true; st.burned[f.lvl + ':' + (f.x < 0 ? 0 : 1)] = true; st.stats.burns++;
        bad(st, 'Burned through deck ' + f.lvl + '! That ladder is gone: go round the other way');
        Sfx.play('siegetowerCrack');
        const h = st.he; if (h.lvl === f.lvl && Math.abs(h.x - f.x) < 30 && h.lvl > 0) { h.climb = { from: h.lvl, to: h.lvl - 1, t: 0 }; }
      }
    }
    st.fires = st.fires.filter(f => !f.out);
    // boulders: the shadow slides in for 1.6 s, then the boulder lands
    for (const b of st.boulders) {
      b.t += dt;
      if (b.t >= S.boulderT && !b.landed) {
        b.landed = true; Sfx.play('tourneyThump'); G.shake = 0.3;
        const hitT = st.tx + T.half > b.x - S.boulderR && st.tx - T.half < b.x + S.boulderR;
        const pux = st.tx + st.pu.x;
        if (st.state === 'go' && st.pu.knock <= 0 && Math.abs(pux - b.x) < S.boulderR) knock(st, 'pu', 'Squashed under a boulder! Watch the shadow');
        if (hitT) { st.panels--; st.stats.panels++; Sfx.play('siegetowerCrack'); if (st.panels <= 0) smash(st); else K.msg(st, 'A boulder knocked a panel off! (' + st.panels + ' left)', '#ffd0c8', 2.2); }
        else K.pop(st, b.x - st.cx, SCR.gy - 60, 'Missed us!', '#ffffff', 16);
      }
    }
    st.boulders = st.boulders.filter(b => b.t < S.boulderT + 1.2);
    // barrels roll down the hill under the tower
    for (const b of st.barrels) {
      b.t += dt;
      if (b.split) continue;
      b.x -= (S.barrelV + Math.max(0, st.v)) * dt * 0 + S.barrelV * dt; b.rot -= dt * 8;
      if (b.hay && !b.lit && b.x < st.tx + T.half) { b.lit = true; st.fires.push({ lvl: 1, x: 20, t: 0, size: 1, taps: 0 }); Sfx.play('siegetowerFoom'); K.msg(st, 'The hay wheel set deck 1 alight!', '#ffd0c8', 2); }
      const pux = st.tx + st.pu.x;
      if (!b.hitPu && st.state === 'go' && Math.abs(b.x - pux) < 18) { b.hitPu = true; if (!st.pu.duck && st.pu.knock <= 0) knock(st, 'pu', 'Knocked flat by a barrel! Duck (▼)'); }
      if (b.x < st.tx - 400) b.split = true;
    }
    st.barrels = st.barrels.filter(b => !(b.split && b.t > 1.5));
    // porridge spouts (a narrow column on a cycle)
    for (const it of st.items) if (it.kind === 'spout') {
      const ph = (st.T + it.x * 0.01) % (S.spoutOn + S.spoutOff); it.on = ph < S.spoutOn; it.ph = ph;
      const pux = st.tx + st.pu.x;
      if (it.on && st.state === 'go' && st.pu.knock <= 0 && Math.abs(pux - it.x) < 16) knock(st, 'pu', 'SPLAT! Boiling porridge! Time the push past the spout');
      if (it.on && st.he.lvl === 0 && st.he.knock <= 0 && Math.abs(st.tx + st.he.x - it.x) < 16) knock(st, 'he', 'SPLAT! Porridge!');
    }
  }
  function fireArrow(st, it) {
    Sfx.play('tourneyThunk');
    if (st.roof >= 1) { st.roofArrows = Math.min(12, st.roofArrows + 1); K.pop(st, scrX(st, 0), deckY(st, 3) - 60, 'Blocked!', '#ffffff', 16); return; }
    const x = it.side > 0 ? rnd(14, 40) : rnd(-40, -14);
    st.fires.push({ lvl: it.lvl, x, t: 0, size: 1, taps: 0 });
    if (it.big) { st.fires[st.fires.length - 1].big = true; st.fires[st.fires.length - 1].size = 3; }
    Sfx.play('siegetowerFoom');
    K.msg(st, 'Fire on deck ' + it.lvl + '!' + (it.big ? ' A big one: fetch a bucket (winch, deck 2)' : ' Beat it out (3 taps)'), '#ffd0c8', 2.4);
  }
  function knock(st, who, text) {
    const c = who === 'pu' ? st.pu : st.he;
    if (who === 'pu') { c.knock = S.knockT; c.at = false; c.x = Math.max(-260, c.x - S.knockBack); c.dent = 3; }
    else { c.knock = S.knockT; c.climb = null; c.hold = 0; c.dent = 3; }
    st.stats.knocks++;
    Sfx.play('siegetowerOof');
    bad(st, text);
  }
  function smash(st) {
    st.stats.smashes++;
    bad(st, 'SMASH! The fourth panel is gone: the tower rolls back to the last chock');
    Sfx.play('siegetowerCrack'); G.shake = 0.5;
    st.panels = S.panels; st.tx = st.chockX; st.v = 0; st.fires = []; st.boulders = []; st.barrels = [];
    for (const it of st.items) if (it.x > st.tx + T.half && (it.kind === 'boulder' || it.kind === 'volley' || it.kind === 'firearrow' || it.kind === 'barrel')) { it.done = false; it.fired = false; }
  }
  function rollback(st) {
    st.stats.rollbacks++;
    bad(st, 'ROLLBACK! All the way back to the chock. Keep someone on the bar on a slope');
    Sfx.play('tourneyThump');
  }
  function bad(st, text) {
    st.rc.bad++;
    if (text) K.msg(st, text, '#ffd0c8', 2.6);
    if (st.rc.bad >= 3 && !st.goldUsed && K.both(st)) {
      st.goldUsed = true; st.gold = true;
      K.goldHelp(st, 'Gold wheels! The tower won\'t roll back and the heave has no wait for this stretch');
    }
  }

  /* ---------- the end: the wall and the drawbridge ---------- */
  function atWall(st) {
    st.state = 'bridge'; st.v = 0;
    K.msg(st, 'At the wall! Tower hero: hold the action on the top deck to drop the bridge. Pusher: hold the tower (▶)', '#ffe7a8', 4);
  }
  function bridgeStep(st, dt) {
    const B = st.bridge, h = st.he, ih = G.players[st.tw].input;
    if (!B.down) {
      // (pushing within the last 0.4 s counts: a hand slipping off for a moment doesn't undo the bridge)
      if (st.pu.at && G.players[st.push].input.right) B.pushT = st.T;
      const pushing = st.pu2 ? true : st.pu.at && st.T - (B.pushT || -9) < 0.4;
      if (h.lvl === 3 && !h.climb && ih.act && pushing) { B.hold += dt; if (Math.random() < dt * 5) Sfx.play('siegetowerCreak'); }
      else B.hold = Math.max(0, B.hold - dt);
      B.open = clamp(B.hold / S.bridgeT, 0, 1) * 0.3;
      if (B.hold >= S.bridgeT) {
        B.down = true; B.t = 0; B.open = 1; Sfx.play('tourneyThump'); Sfx.play('tourneyRoar');
        K.msg(st, 'The bridge is down! Both climb to the top deck and cross (▶) within 8 s!', '#ffe7a8', 3);
        if (!st.pu2) { st.pu2 = climber(0, T.bar); st.pu2.face = 1; }
      }
      return;
    }
    B.t += dt;
    if (st.he.across && st.pu2.across) {
      st.state = 'end'; st.endT = 0; st.stats.roomT[st.k] = G.time - st.segStart;
      Sfx.play('tourneyFanfare'); Sfx.play('tourneyRoar');
      return;
    }
    if (B.t >= S.crossT) {
      B.down = false; B.hold = 0; B.open = 0; Sfx.play('siegetowerCreak');
      for (const c of [st.he, st.pu2]) if (c.across) { c.across = false; c.x = T.half - 10; }
      K.msg(st, 'Too slow! The defenders winched the bridge back up. Drop it again (hold the action on the top deck)', '#ffd0c8', 3.2);
    }
  }
  function endStretch(st) {
    st.state = 'end'; st.endT = 0;
    st.stats.roomT[st.k] = G.time - st.segStart;
    Sfx.play('tourneyFanfare');
    K.pop(st, W / 2, 160, (G.level.def.done || 'Stretch done!') + ' Swap jobs!', '#ffffff', 24);
  }
  function endStep(st, dt) {
    st.endT += dt;
    if (!st.last) { if (st.endT > 2.2) nextRoom(); return; }
    if (st.endT > 0.6 && !st.party) { st.party = true; Sfx.play('tourneyCheer'); K.confetti(st, W / 2, 140, 60); K.pop(st, W / 2, 130, 'The baron hands back the trophy... very grumpily!', '#ffffff', 24); }
    if (st.endT > 3.6 && !st.cleared) { st.cleared = true; G.level.goal = { x: W / 2, y: 300 }; levelClear(); }
  }

  /* ---------- where things are on screen ---------- */
  const scrX = (st, rx) => st.tx + rx - st.cx;
  function groundY(st, wx) { return SCR.gy - (height(st, wx) - height(st, st.tx)); }
  function deckY(st, lvl) { return SCR.gy - T.deck[lvl]; }
  function climberPos(st, c) {
    if (c.climb) { const u = clamp(c.climb.t / S.climbT, 0, 1); return { x: scrX(st, c.x), y: K.lerp(deckY(st, c.climb.from), deckY(st, c.climb.to), u) }; }
    if (c.across) return { x: scrX(st, T.half + 60 + (c === st.he ? 0 : 26)), y: deckY(st, 3) };
    return { x: scrX(st, c.x), y: c.lvl === 0 ? groundY(st, st.tx + c.x) : deckY(st, c.lvl) };
  }
  function mirror(st) {
    const pp = st.pu2 ? climberPos(st, st.pu2) : { x: scrX(st, st.pu.x), y: groundY(st, st.tx + st.pu.x) };
    const hp = climberPos(st, st.he);
    K.place(st.push, pp.x, pp.y); K.place(st.tw, hp.x, hp.y);
    st.run = [0, 1].map(id => (id === st.push ? { x: st.tx + (st.pu2 ? st.pu2.x : st.pu.x), y: pp.y } : { x: st.tx + st.he.x, y: hp.y - (st.he.lvl * 40) }));
  }

  /* ---------- what to do next (the prompts, the HUD chips and the computer brain all read this) ---------- */
  function plan(st) {
    if (st.planMemo && st.planMemo.n === G.tickN && st.planMemo.k === st.k) return st.planMemo.p;
    const p = planNow(st);
    st.planMemo = { n: G.tickN, k: st.k, p };
    return p;
  }
  // how to get a climber to (lvl, x): walk, or go to a usable ladder and climb
  function nav(st, c, lvl, x) {
    if (c.climb || c.across) return {};
    // holding the bar: let go first (▲) unless the bar is where it should be
    if (c === st.he && st.state === 'go' && c.lvl === 0 && Math.abs(c.x - T.bar) < 10 && !(c.barLet > 0) && !(lvl === 0 && Math.abs(x - T.bar) < 10) && (lvl > 0 || x > c.x)) return { up: true };
    if (c.lvl === lvl) { const dx = x - c.x; return Math.abs(dx) > 5 ? { dir: Math.sign(dx) } : { at: true }; }
    const up = lvl > c.lvl, to = up ? c.lvl + 1 : c.lvl;
    // the ladder side: one that isn't burned, nearer the target x when both are fine
    let sides = [0, 1].filter(s => ladderOK(st, s, to));
    if (!sides.length) sides = [0, 1];
    sides.sort((a, b) => Math.abs(T.lad[a] - c.x) + Math.abs(T.lad[a] - x) * 0.5 - Math.abs(T.lad[b] - c.x) - Math.abs(T.lad[b] - x) * 0.5);
    const lx = T.lad[sides[0]], dx = lx - c.x;
    if (Math.abs(dx) > 6) return { dir: Math.sign(dx) };
    return up ? { up: true } : { down: true };
  }
  function planNow(st) {
    const u = st.pu, h = st.he, s = slopeAt(st, st.tx), front = st.tx + T.half;
    const out = { pu: { push: false, brake: false, heave: false, duck: false, letGo: false, walkTo: null, why: 'push' }, he: { lvl: 3, x: 0, act: false, hold: false, why: 'roof', bar: false } };
    const Pu = out.pu, He = out.he;
    const vol = st.volley, volNow = vol && (vol.t > S.tell - 0.55 || vol.rain);
    const roofUp = st.roof >= 1, heTop = h.lvl === 3 && !h.climb;
    // ---- the tower hero: the soonest job first
    const exposed = st.state === 'go' && (u.at || Math.abs(u.x) < T.half + 30);
    let job = null;
    const volleyNext = st.items.find(it => it.kind === 'volley' && !it.done && it.x - 240 - front < 170);
    // a volley: the roof (held anywhere on the top deck); in the rain, someone not up there yet stays below
    if (vol && !(vol.t >= S.tell + S.rain)) job = heTop || h.climb && h.climb.to === 3 ? { lvl: 3, x: heTop ? h.x : 0, hold: true, why: 'roof' } : vol.rain ? { lvl: h.lvl, x: h.x, why: 'shelter' } : { lvl: 3, x: 0, hold: true, why: 'roof' };

    if (!job && st.fires.length) {
      const f = st.fires.slice().sort((a, b) => b.t - a.t)[0];
      if (f.size >= 3 && !h.bucket) job = { lvl: 2, x: T.winch, hold: true, why: 'bucket' };
      else job = { lvl: f.lvl, x: f.x + (f.x > 0 ? -10 : 10), tap: true, why: 'fire', f };
    }
    if (!job && st.jam) job = { lvl: 0, x: T.wheel[st.jam.w] + (st.jam.w ? -8 : 8), tap: true, why: 'wheel' };
    const tr = st.items.find(it => it.kind === 'trench' && !it.done && it.x - front < 220);
    if (!job && tr && st.planks < 2) job = { lvl: 1, x: T.plank + 6, tap: tr.x - front < 160 && tr.x - front > -20, why: 'planks' };
    const br = st.barrels.find(b => !b.split && b.x > front - 20);
    if (!job && br) job = { lvl: 1, x: T.plank + 6, tap: br.x - front < 190, why: 'ram' };
    const mud = st.items.find(it => it.kind === 'mud' && !it.done && it.x - front < 90 && it.x + it.len > st.tx - T.half - 20);
    if (!job && mud) job = { lvl: 0, x: T.bar, bar: true, why: 'mud' };
    // a high shield passing soon, then getting ready on the top deck for a coming volley
    const shSoon = st.items.filter(it => it.kind === 'shield' && !it.done && it.lvl > 0 && it.x - st.tx < 110 && it.x - st.tx > -T.half).sort((a, b) => a.x - b.x)[0];
    if (!job && shSoon && !(vol && !vol.rain)) job = { lvl: shSoon.lvl, x: clamp(shSoon.x - st.tx, -T.half + 10, T.half - 10), why: 'shield', sh: shSoon };
    if (!job && volleyNext) job = { lvl: 3, x: heTop ? h.x : 0, why: 'ready' };
    if (!job && st.last && st.state === 'bridge') job = st.bridge.down ? { lvl: 3, x: T.half + 40, why: 'cross' } : { lvl: 3, x: 20, hold: true, why: 'bridge' };
    // a chock on a slope, when it's been a while
    if (!job && s > 0 && !st.gold && st.tx - st.chockX > 260 && !st.items.some(it => it.kind === 'volley' && !it.done && it.x - front < 200)) job = { lvl: 1, x: T.chock - 6, tap: true, why: 'chock' };
    if (!job) {
      // high shields the tower will pass in the next few seconds
      const sh = st.items.filter(it => it.kind === 'shield' && !it.done && it.lvl > 0 && it.x - st.tx < 240 && it.x - st.tx > -T.half).sort((a, b) => a.x - b.x)[0];
      if (sh) job = { lvl: sh.lvl, x: clamp(sh.x - st.tx, -T.half + 10, T.half - 10), why: 'shield', sh };
    }
    if (!job) job = { lvl: 3, x: 0, why: 'ready' };
    Object.assign(He, job);
    He.nav = nav(st, h, He.lvl, He.x);
    He.act = !!(He.nav.at && (job.tap || job.hold));
    // ---- the pusher
    if (st.state === 'bridge') {
      if (st.pu2) { Pu.why = 'cross'; Pu.nav = nav(st, st.pu2, 3, T.half + 40); }
      else if (u.at) { Pu.push = !st.bridge.down; Pu.why = 'hold'; }
      else { Pu.walkTo = T.bar; Pu.why = 'bar'; }
      return out;
    }
    if (u.knock > 0) { Pu.why = 'knocked'; return out; }
    // dangers: arrows (unless the roof is up or the hero is on the top deck about to raise it), barrels, porridge, boulders
    const roofComing = roofUp || heTop && !h.knock && (job.why === 'roof');
    if (volNow && !roofUp) Pu.duck = true;
    const bar = st.barrels.find(b => !b.split && b.x - (st.tx + u.x) < 90 && b.x - (st.tx + u.x) > -10);
    if (bar) Pu.duck = true;
    // stopping: a boulder shadow ahead (stop with a margin), a porridge spout about to fire where the pusher will be,
    // a jammed wheel, a trench without planks, the hero kicking a wheel
    let stop = false;
    for (const b of st.boulders) if (!b.landed && b.x - S.boulderR - front < 60) stop = true;
    for (const it of st.items) if (it.kind === 'spout') {
      const px = st.tx + u.x, dx = it.x - px;
      const cyc = S.spoutOn + S.spoutOff, ph = it.ph || 0, tillOn = it.on ? 0 : cyc - ph;
      // walking into the column: only go when it has just switched off (time to get through it)
      // (already in the column: keep going through it)
      if (dx > 16 && dx < 50 && (it.on || tillOn < 1.2)) stop = true;
    }
    if (st.jam || tr && st.planks < 2 && tr.x - front < 30) stop = true;
    // a high shield about to pass out of the hero's reach: wait (up to 4 s) for the hero to get there
    for (const it of st.items) if (it.kind === 'shield' && !it.done && it.lvl > 0 && it.x - st.tx < -T.half + 34 && it.x - st.tx > -T.half - 20 && !(h.lvl === it.lvl && !h.climb) && (it.waitT || 0) < 4) { stop = true; it.waitT = (it.waitT || 0) + 1 / 120; }
    // a rut right in front: heave
    const rut = st.items.find(it => it.kind === 'rut' && !it.done && it.x - (st.tx + T.wheel[1]) < 10 && it.x - (st.tx + T.wheel[1]) > -6);
    if (rut && (st.heaveCd <= 0 || st.gold)) Pu.heave = true;
    // ground shields: let go and fetch them (flat ground, nothing coming)
    const calm = !vol && !st.boulders.length && !st.barrels.length && s === 0 && !st.jam;
    const gsh = st.items.find(it => it.kind === 'shield' && !it.done && it.lvl === 0 && it.x - st.tx < 200 && it.x - st.tx > -200);
    if (u.at) {
      if (gsh && calm && gsh.x - st.tx < 120) { Pu.letGo = true; Pu.why = 'shield'; }
      else if (Pu.duck) Pu.why = 'duck';
      else if (stop) { Pu.brake = true; Pu.why = 'stop'; }
      else if (job.why === 'mud' && !(h.lvl === 0 && Math.abs(h.x - T.bar) < 10)) { Pu.brake = false; Pu.push = true; Pu.why = 'wait'; }
      else { Pu.push = true; Pu.why = rut ? 'heave' : 'push'; }
    } else {
      if (gsh && (calm || s === 0)) { Pu.walkTo = gsh.x - st.tx; Pu.why = 'shield'; }
      else { Pu.walkTo = T.bar; Pu.why = 'bar'; }
    }
    return out;
  }

  /* ---------- drawing ---------- */
  function draw(st) {
    const t = st.clock, cx = st.cx;
    K.sky(cx, t, { grey: st.k === 3 ? 0.25 : st.k === 2 ? 0.15 : 0 });
    K.hills(cx, { base: 320, castle: false, dim: 0.1 });
    drawCastle(st, t);
    drawGround(st, t);
    for (const it of st.items) { const sx = it.x - cx; if (sx < -120 || sx > W + 120) continue; drawItem(st, it, sx, t); }
    for (const b of st.boulders) drawShadow(st, b, t);
    drawTower(st, t);
    for (const b of st.barrels) drawBarrel(st, b, t);
    for (const b of st.boulders) drawBoulder(st, b, t);
    drawPusher(st, t);
    if (st.pu2) drawClimber(st, st.pu2, st.push, t);
    drawClimber(st, st.he, st.tw, t);
    drawVolley(st, t);
    K.drawParts(st, 0);
  }
  function drawCastle(st, t) {
    // the baron's wall grows from a far silhouette to the right edge as the tower nears it (the last stretch)
    const prog = st.last ? clamp((st.tx) / st.len, 0, 1) : 0.15 + st.k * 0.1 + clamp(st.tx / st.len, 0, 1) * 0.1;
    const wx = st.last ? st.items.find(it => it.kind === 'wall').x - st.cx : W - 160 + (1 - prog) * 120;
    const top = K.lerp(250, 40, prog), base = st.last ? groundY(st, st.items.find(it => it.kind === 'wall').x) : 330;
    ctx.fillStyle = st.last ? K.COL.stone : 'rgba(110,108,100,0.7)';
    ctx.fillRect(wx, top, W + 200, base - top + 20);
    ctx.fillStyle = st.last ? K.COL.stoneDark : 'rgba(90,88,80,0.7)';
    for (let k = 0; k < 14; k++) ctx.fillRect(wx + k * 32, top - 18, 20, 18);
    if (st.last) { ctx.fillStyle = K.COL.stoneDark; for (let y = top + 30; y < base; y += 34) for (let x = wx + ((y / 34) % 2) * 20; x < W + 40; x += 40) ctx.fillRect(x, y, 36, 2); }
    // the defenders: helmets and arms over the wall; they stand up for a volley
    const up = st.volley ? clamp(st.volley.t / 0.4, 0, 1) : 0;
    for (let k = 0; k < 8; k++) {
      const hx = wx + 14 + k * 32 + 6, hy = top - 18 - up * 14 + Math.sin(t * 3 + k) * 1.5;
      ctx.fillStyle = '#8a8a96'; ctx.beginPath(); ctx.arc(hx, hy, 8, Math.PI, TAU); ctx.fill(); ctx.fillRect(hx - 9, hy - 1, 18, 3);
      if (up > 0.5) { ctx.strokeStyle = '#5e3a1c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(hx - 6, hy + 6, 9, -1.2, 1.2); ctx.stroke(); }
      else if ((k + Math.floor(t * 0.7)) % 3 === 0) { ctx.fillStyle = '#f2c8a0'; ctx.fillRect(hx + 6, hy - 6 - Math.abs(Math.sin(t * 6 + k)) * 6, 4, 8); }
    }
    // the catapult arm on the wall (winds back when a boulder is coming)
    const wind = st.boulders.some(b => b.t < 0.5) ? 1 : 0;
    ctx.strokeStyle = '#5e3a1c'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(wx + 150, top - 18); ctx.lineTo(wx + 150 + Math.cos(-1.2 - wind * 1.2) * 60, top - 18 + Math.sin(-1.2 - wind * 1.2) * 60); ctx.stroke();
    K.heraldShield(wx + 80, top + 30, 14, { col: '#5a1a6a', charge: 'tower', chargeCol: '#c8c0b0' });
    if (st.last) {
      // the gatehouse spouts and the baron
      for (const it of st.items) if (it.kind === 'spout') { const sx = it.x - st.cx; ctx.fillStyle = '#4a4a50'; ctx.fillRect(sx - 10, top + 10, 20, 12); }
    }
  }
  function drawGround(st, t) {
    const cx = st.cx;
    ctx.fillStyle = st.k === 2 ? '#7a8a4a' : K.COL.grass;
    ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = -10; x <= W + 10; x += 20) ctx.lineTo(x, groundY(st, cx + x) - 6);
    ctx.lineTo(W + 10, H); ctx.closePath(); ctx.fill();
    ctx.fillStyle = K.COL.dirt;
    ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = -10; x <= W + 10; x += 20) ctx.lineTo(x, groundY(st, cx + x));
    ctx.lineTo(W + 10, H); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(120,90,50,0.35)';
    for (let k = 0; k < 14; k++) { const x = ((k * 97 - cx) % (W + 100) + W + 100) % (W + 100) - 50; ctx.fillRect(x, groundY(st, cx + x) + 16 + (k % 3) * 14, 24, 3); }
    // the last chock
    const chx = st.chockX + T.wheel[0] - 28 - cx;
    if (chx > -20 && chx < W) { const y = groundY(st, st.chockX + T.wheel[0] - 28); ctx.fillStyle = '#5e3a1c'; ctx.beginPath(); ctx.moveTo(chx - 10, y); ctx.lineTo(chx + 10, y); ctx.lineTo(chx + 10, y - 14); ctx.closePath(); ctx.fill(); }
  }
  function drawItem(st, it, sx, t) {
    const y = groundY(st, it.x);
    if (it.kind === 'shield' && !it.done) {
      if (it.lvl === 0) { ctx.save(); ctx.translate(sx, y - 6); ctx.rotate(-1.2); K.heraldShield(0, 0, 11, { col: K.BANNER[Math.floor(it.x) % 7], charge: 'star' }); ctx.restore(); }
      else {
        // hung on a post of the outer works at the deck's height
        const sy = SCR.gy - T.deck[it.lvl] - 26 - (height(st, it.x) - height(st, st.tx));
        ctx.fillStyle = '#5e3a1c'; ctx.fillRect(sx + 8, sy - 6, 6, y - sy + 6);
        K.heraldShield(sx, sy, 12, { col: K.BANNER[Math.floor(it.x) % 7], charge: 'star', rot: Math.sin(t * 2 + it.x) * 0.1 });
      }
    } else if (it.kind === 'rut' && !it.done) { ctx.fillStyle = '#6a4a2a'; ctx.beginPath(); ctx.ellipse(sx, y + 2, 18, 7, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#8a6a40'; ctx.fillRect(sx + 8, y - 8, 12, 8); }
    else if (it.kind === 'stone' && !it.done) { ctx.fillStyle = '#8a8880'; ctx.beginPath(); ctx.ellipse(sx, y - 6, 11, 8, 0, 0, TAU); ctx.fill(); }
    else if (it.kind === 'mud') { ctx.fillStyle = '#5a3a1e'; ctx.beginPath(); ctx.ellipse(sx + it.len / 2, y + 6, it.len / 2, 12, 0, 0, TAU); ctx.fill(); if (!it.done) text('MUD: both push', sx + it.len / 2, y + 30, 12, '#ffffff', 'center', 'body'); }
    else if (it.kind === 'trench') {
      ctx.fillStyle = '#3a2614'; ctx.fillRect(sx, y - 2, 40, 40);
      for (let k = 0; k < Math.min(2, st.planks) && !it.done; k++) K.timber(sx - 8, y - 6 + k * 3, 56, 6, {});
      if (it.done) K.timber(sx - 8, y - 6, 56, 6, {});
    } else if (it.kind === 'spout') {
      const top = 60;
      if (it.on) { const g = ctx.createLinearGradient(sx - 14, 0, sx + 14, 0); g.addColorStop(0, 'rgba(240,230,200,0.6)'); g.addColorStop(0.5, '#f6ecd0'); g.addColorStop(1, 'rgba(240,230,200,0.6)'); ctx.fillStyle = g; ctx.fillRect(sx - 12, top, 24, y - top); for (let k = 0; k < 4; k++) { ctx.fillStyle = 'rgba(255,255,255,0.7)'; circ(sx + Math.sin(t * 9 + k) * 18, y - 10 - k * 6, 6); ctx.fill(); } }
      else { const warn = it.ph > S.spoutOn + S.spoutOff - 0.8; ctx.fillStyle = warn ? '#ffd23a' : 'rgba(240,230,200,0.5)'; for (let k = 0; k < 3; k++) { circ(sx, top + 14 + ((t * 80 + k * 20) % 60), 3); ctx.fill(); } text(warn ? '!' : '', sx, top + 90, 20, '#ffd23a', 'center', 'display'); }
    }
  }
  function drawShadow(st, b, t) {
    if (b.landed) return;
    const u = clamp(b.t / S.boulderT, 0, 1), sx = b.x - st.cx, y = groundY(st, b.x);
    ctx.fillStyle = 'rgba(20,10,30,' + (0.15 + u * 0.3) + ')'; ctx.beginPath(); ctx.ellipse(sx, y, S.boulderR * (0.5 + u * 0.5), 9, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,90,74,0.8)'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.ellipse(sx, y, S.boulderR, 10, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
  }
  function drawBoulder(st, b, t) {
    const u = clamp(b.t / S.boulderT, 0, 1), sx = b.x - st.cx, y = groundY(st, b.x);
    if (b.landed) { const k = clamp((b.t - S.boulderT) / 1.2, 0, 1); ctx.globalAlpha = 1 - k; ctx.fillStyle = '#7a7870'; circ(sx, y - 20, 22); ctx.fill(); ctx.globalAlpha = 1; return; }
    if (u < 0.35) return;
    const by = K.lerp(-40, y - 22, (u - 0.35) / 0.65);
    ctx.fillStyle = '#7a7870'; circ(sx + (1 - u) * 160, by, 22); ctx.fill(); ctx.fillStyle = '#5e5c56'; circ(sx + (1 - u) * 160 - 6, by + 4, 6); ctx.fill();
  }
  function drawBarrel(st, b, t) {
    if (b.split && b.t > 0.2) return;
    const sx = b.x - st.cx, y = groundY(st, b.x) - 16;
    b.y = y;
    ctx.save(); ctx.translate(sx, y); ctx.rotate(b.rot);
    if (b.hay) { ctx.fillStyle = K.COL.hay; circ(0, 0, 18); ctx.fill(); ctx.fillStyle = '#ff7a2a'; for (let k = 0; k < 5; k++) { const a = k * TAU / 5; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 14, Math.sin(a) * 14); ctx.lineTo(Math.cos(a + 0.3) * 26, Math.sin(a + 0.3) * 26); ctx.lineTo(Math.cos(a + 0.6) * 14, Math.sin(a + 0.6) * 14); ctx.fill(); } }
    else { ctx.fillStyle = '#8a5a32'; circ(0, 0, 16); ctx.fill(); ctx.strokeStyle = '#3a2010'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 11, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-16, 0); ctx.lineTo(16, 0); ctx.stroke(); }
    ctx.restore();
  }
  function drawTower(st, t) {
    const x0 = scrX(st, 0), gy = SCR.gy, s = slopeAt(st, st.tx), ang = -Math.atan(s);
    ctx.save(); ctx.translate(x0, gy); ctx.rotate(ang * 0.8); ctx.translate(-x0, -gy);
    const L = x0 - T.half, Rr = x0 + T.half, gold = st.gold;
    // the frame: four corner posts, the decks, cross-braces
    ctx.fillStyle = '#7a4e2a';
    for (const px of [L, L + 8, Rr - 16, Rr - 8]) ctx.fillRect(px, gy - T.top, 8, T.top - 18);
    for (let l = 1; l <= 3; l++) {
      const y = gy - T.deck[l];
      for (const side of [0, 1]) {
        if (st.burned[l + ':' + side]) { ctx.fillStyle = '#2a1a10'; ctx.fillRect(side ? x0 + 4 : L, y, T.half - 4, 4); for (let k = 0; k < 3; k++) { ctx.fillStyle = 'rgba(60,60,70,0.5)'; circ((side ? x0 + 30 : L + 30) + Math.sin(t * 2 + k) * 6, y - 20 - ((t * 20 + k * 12) % 40), 6); ctx.fill(); } }
        else { ctx.fillStyle = K.COL.woodHi; ctx.fillRect(side ? x0 : L, y, T.half, 8); ctx.fillStyle = K.COL.woodDark; ctx.fillRect(side ? x0 : L, y + 8, T.half, 2); }
      }
    }
    ctx.strokeStyle = 'rgba(94,58,28,0.8)'; ctx.lineWidth = 4;
    for (let l = 0; l < 3; l++) { const y0 = gy - T.deck[l] - (l ? 0 : 18), y1 = gy - T.deck[l + 1] + 8; ctx.beginPath(); ctx.moveTo(L + 8, y0); ctx.lineTo(Rr - 8, y1); ctx.stroke(); }
    // ladders (gone where a floor burned)
    for (let l = 0; l < 3; l++) for (const side of [0, 1]) {
      if (st.burned[(l + 1) + ':' + side]) continue;
      const lx = x0 + T.lad[side], y0 = gy - T.deck[l] - (l ? 0 : 14), y1 = gy - T.deck[l + 1];
      ctx.strokeStyle = '#c8a46a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(lx - 7, y0); ctx.lineTo(lx - 7, y1); ctx.moveTo(lx + 7, y0); ctx.lineTo(lx + 7, y1); ctx.stroke();
      ctx.lineWidth = 2; for (let y = y1 + 8; y < y0; y += 12) { ctx.beginPath(); ctx.moveTo(lx - 7, y); ctx.lineTo(lx + 7, y); ctx.stroke(); }
    }
    // hide wall panels on the front (a boulder knocks one off)
    for (let k = 0; k < S.panels; k++) {
      if (k >= st.panels) continue;
      const py = gy - T.deck[3] + 10 + k * 56;
      ctx.fillStyle = '#b8945a'; rr(Rr - 6, py, 14, 50, 4); ctx.fill(); ctx.strokeStyle = '#7a5a2a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(Rr - 2, py + 8); ctx.lineTo(Rr + 4, py + 16); ctx.moveTo(Rr - 2, py + 30); ctx.lineTo(Rr + 4, py + 38); ctx.stroke();
    }
    // the winch on deck 2 and the chock lever on deck 1
    ctx.fillStyle = '#5e3a1c'; ctx.fillRect(x0 + T.winch - 10, gy - T.deck[2] - 20, 20, 20); ctx.fillStyle = '#c8a46a'; circ(x0 + T.winch, gy - T.deck[2] - 14, 6); ctx.fill();
    if (st.bucketT > 0) { ctx.strokeStyle = '#3a2010'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x0 + T.winch, gy - T.deck[2] - 14); ctx.lineTo(x0 + T.winch, gy - T.deck[2] + 10 + (1 - st.bucketT / S.winchT) * 80); ctx.stroke(); ctx.fillStyle = '#6a8ab0'; ctx.fillRect(x0 + T.winch - 6, gy - T.deck[2] + 10 + (1 - st.bucketT / S.winchT) * 80, 12, 10); }
    ctx.fillStyle = '#3a2010'; ctx.fillRect(x0 + T.chock - 2, gy - T.deck[1] - 22, 4, 22); ctx.fillStyle = '#d8323a'; circ(x0 + T.chock, gy - T.deck[1] - 24, 4); ctx.fill();
    // the drawbridge folded up at the front of the top deck (or down onto the wall)
    const ob = st.bridge.open, bx = Rr, by = gy - T.deck[3];
    ctx.save(); ctx.translate(bx, by); ctx.rotate(-Math.PI / 2 * (1 - ob));
    K.timber(0, -6, 92, 10, { dark: true }); ctx.restore();
    // the roof panel (raised when held), arrows stuck in it
    const ru = st.roof, ry = gy - T.top;
    ctx.save(); ctx.translate(L - 10, ry + 14); ctx.rotate(-0.06 - ru * 0.3);
    ctx.fillStyle = gold ? '#e8c060' : '#a8784a'; rr(0, -10, T.half * 2 + 70, 12, 5); ctx.fill();
    ctx.strokeStyle = '#6a4a2a'; ctx.lineWidth = 2; for (let k = 1; k < 6; k++) { ctx.beginPath(); ctx.moveTo(k * 30, -10); ctx.lineTo(k * 30, 2); ctx.stroke(); }
    for (let k = 0; k < st.roofArrows; k++) { const ax = 16 + (k * 37) % (T.half * 2 + 40); ctx.strokeStyle = '#3a2010'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ax, -10); ctx.lineTo(ax + 6, -26); ctx.stroke(); ctx.fillStyle = '#f6ecd0'; ctx.fillRect(ax + 4, -30, 4, 6); }
    ctx.restore();
    ctx.fillStyle = '#7a4e2a'; ctx.fillRect(L - 2, ry + 10, 6, 30); ctx.fillRect(Rr - 4, ry + 10, 6, 30);
    // wheels and the push bar
    for (const wx of T.wheel) wheel(x0 + wx, gy - 18, 18, st.wheelA || 0, gold, st.jam && T.wheel[st.jam.w] === wx);
    ctx.fillStyle = '#5e3a1c'; ctx.fillRect(x0 + T.bar - 4, gy - 52, 6, 40); ctx.fillRect(x0 + T.bar - 4, gy - 52, L - (x0 + T.bar) + 10, 6);
    ctx.fillStyle = '#8a8a96'; rr(x0 + T.bar - 6, gy - 50, 14, 22, 3); ctx.fill();
    ctx.restore();
    // fires on the decks
    for (const f of st.fires) drawFire(st, f, t);
  }
  function wheel(x, y, r, a, gold, jam) {
    ctx.fillStyle = '#3a2010'; circ(x, y, r); ctx.fill();
    ctx.fillStyle = gold ? '#ffd23a' : '#a0683a'; circ(x, y, r - 4); ctx.fill();
    ctx.strokeStyle = '#3a2010'; ctx.lineWidth = 2.5; ctx.beginPath(); for (let k = 0; k < 4; k++) { const b = a + k * Math.PI / 4; ctx.moveTo(x - Math.cos(b) * (r - 4), y - Math.sin(b) * (r - 4)); ctx.lineTo(x + Math.cos(b) * (r - 4), y + Math.sin(b) * (r - 4)); } ctx.stroke();
    if (jam) { ctx.fillStyle = '#8a8880'; ctx.beginPath(); ctx.ellipse(x + 10, y + 10, 10, 7, 0, 0, TAU); ctx.fill(); text('!', x, y - r - 12, 18, '#ff5a4a', 'center', 'display'); }
  }
  function drawFire(st, f, t) {
    const x = scrX(st, f.x), y = deckY(st, f.lvl), s = 0.6 + f.size * 0.4, burn = f.t / S.burnT;
    for (let k = 0; k < 3; k++) {
      ctx.fillStyle = ['#ff5a2a', '#ffa83a', '#ffe07a'][k];
      ctx.beginPath(); const fh = (24 - k * 6) * s * (1 + Math.sin(t * 14 + k) * 0.12);
      ctx.moveTo(x - (12 - k * 3) * s, y); ctx.quadraticCurveTo(x - 4 * s, y - fh * 0.6, x + Math.sin(t * 9) * 3, y - fh); ctx.quadraticCurveTo(x + 4 * s, y - fh * 0.6, x + (12 - k * 3) * s, y); ctx.closePath(); ctx.fill();
    }
    // how close it is to burning through
    ctx.strokeStyle = burn > 0.6 ? '#ff5a4a' : '#ffffff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y - 44 * s, 7, -Math.PI / 2, -Math.PI / 2 + TAU * burn); ctx.stroke();
    if (f.size >= 3) text('🪣', x + 16, y - 40 * s, 12, '#ffffff', 'center', 'body');
  }
  function drawPusher(st, t) {
    if (st.pu2) return;
    const u = st.pu, id = st.push, x = scrX(st, u.x), y = groundY(st, st.tx + u.x);
    const o = { outfit: 'engineer', face: u.at ? 1 : u.face, prop: 'straps', soot: soot(st), dent: u.knock > 0, arms: u.at && !u.duck ? 'push' : null, sq: u.duck ? 0.5 : 0, rot: u.knock > 0 ? -1.3 : (u.at && st.v > 5 ? 0.25 : 0), v: Math.abs(st.v) / 60, stun: u.knock > 0 };
    K.squire(id, x - (u.at ? 6 : 0), y, o);
    if (st.heave > 0) text('!!', x + 10, y - 50, 14, PCOL[id], 'center', 'display');
  }
  function drawClimber(st, c, id, t) {
    const p = climberPos(st, c);
    const roofing = id === st.tw && c.lvl === 3 && G.players[id].input.act && !c.climb && st.state === 'go';
    const o = { outfit: 'engineer', face: c.face, prop: id === st.tw ? 'hide' : 'straps', soot: soot(st), dent: c.knock > 0, arrows: 0, arms: roofing ? 'up' : c.climb ? 'up' : c.act > 0 ? 'fwd' : null, stun: c.knock > 0, rot: c.knock > 0 ? 0.3 : 0 };
    if (c.act > 0) c.act -= 1 / 60;
    K.squire(id, p.x, p.y, o);
    if (c.bucket) { ctx.fillStyle = '#6a8ab0'; ctx.fillRect(p.x + c.face * 10 - 5, p.y - 16, 10, 10); ctx.fillStyle = '#bfe8ff'; ctx.fillRect(p.x + c.face * 10 - 4, p.y - 16, 8, 3); }
  }
  const soot = st => clamp((st.k + clamp(st.tx / st.len, 0, 1)) / 4, 0, 1) * 0.9;
  function drawVolley(st, t) {
    const v = st.volley;
    if (!v) return;
    if (!v.rain) {
      const u = v.t / S.tell;
      text('📯 VOLLEY!', W - 220, 120 + Math.sin(t * 20) * 2, 22, '#ff5a4a', 'center', 'display');
      ctx.strokeStyle = 'rgba(255,90,74,0.6)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(W - 220, 150, 12, -Math.PI / 2, -Math.PI / 2 + TAU * u); ctx.stroke();
      return;
    }
    // the rain of arrows
    ctx.strokeStyle = '#3a2010'; ctx.lineWidth = 2;
    for (let k = 0; k < 34; k++) {
      const ax = ((k * 53 + st.T * 600) % (W + 200)) - 100, ay = ((k * 91 + st.T * 700) % 520) - 40;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax - 10, ay + 14); ctx.stroke();
    }
  }
  const circ = (x, y, r) => circle(x, y, r);
  function drawTop(st) { K.drawPops(st, 0, 0); }

  /* ---------- HUD ---------- */
  function hud(st) {
    const big = hudBig(), z = big ? 1.35 : 1, play = G.mode === 'play' || G.mode === 'paused';
    let timeX0;
    {
      const fs = big ? 20 : 14, h = big ? 40 : 28, tm = fmtTime(G.time), n = '⛉ ' + st.shields + ' / ' + S.shields;
      ctx.font = K.FONT(fs);
      const w = ctx.measureText(tm).width + ctx.measureText(n).width + fs + 30, x0 = pill(W - 14, 12, w, h, 'right'), cy = 12 + h / 2 + 0.5;
      text(tm, x0 + 15, cy, fs, st.waiting ? '#aab' : C.paper, 'left', 'body');
      text(n, x0 + w - 15, cy, fs, '#ffe08a', 'right', 'body');
      timeX0 = x0;
    }
    K.drawMsg(st, st.waiting ? { text: K.BREAK, col: '#ffffff', t: 1, life: 2 } : st.msg, timeX0);
    if (!play || !st.pu) return;
    // the strain meter and panels left
    {
      const w = 180 * z, h = 13 * z, x = W / 2 - w / 2, y = H - 40 * z;
      text(st.state === 'bridge' ? 'Drawbridge' : 'Strain', x + w / 2, y - 9 * z, 11 * z, '#ffffff', 'center', 'body');
      if (st.state === 'bridge') K.meter(x, y, w, h, st.bridge.down ? 1 - st.bridge.t / S.crossT : st.bridge.hold / S.bridgeT, st.bridge.down ? '#ffb04a' : '#8fe3b0');
      else K.meter(x, y, w, h, st.strain || 0, (st.strain || 0) > 0.7 ? '#ff5a4a' : '#ffb04a');
      text('panels ' + st.panels + ' · ' + (slopeAt(st, st.tx) > 0 ? 'uphill' : 'flat'), x + w / 2, y + h + 9 * z, 10 * z, '#e8dcc8', 'center', 'body');
    }
    const pl = plan(st), Pn = st.push, Hn = st.tw, u = st.pu, h = st.he;
    const kk = (id, what) => (K.quiet(id) ? '' : K.key(id, what) + ' ');
    {
      const bx = K.panel(Pn, 'pusher', 236, 58, z), cy = bx.y + 27 * z, chh = 23 * z, cw = (bx.w - 24 * z - 12 * z) / 3, x0 = bx.x + 12 * z;
      K.chip(x0, cy, cw, chh, pl.pu.brake ? kk(Pn, 'left') + 'HOLD' : kk(Pn, 'right') + 'PUSH', (pl.pu.push || pl.pu.brake) && u.at && !G.players[Pn].input[pl.pu.brake ? 'left' : 'right'], u.at && st.v > 5, z);
      K.chip(x0 + cw + 6 * z, cy, cw, chh, st.heaveCd > 0 && !st.gold ? 'heave ' + Math.ceil(st.heaveCd) : kk(Pn, 'act') + 'HEAVE', pl.pu.heave, st.heave > 0, z);
      K.chip(x0 + (cw + 6 * z) * 2, cy, cw, chh, kk(Pn, 'down') + 'DUCK', pl.pu.duck && !u.duck, u.duck, z);
    }
    {
      const bx = K.panel(Hn, 'tower', 236, 58, z), cy = bx.y + 27 * z, chh = 23 * z, cw = (bx.w - 24 * z - 6 * z) / 2, x0 = bx.x + 12 * z;
      const jobName = { roof: 'ROOF', ready: 'ROOF', fire: 'FIRE', bucket: 'WINCH', wheel: 'KICK', planks: 'PLANK', ram: 'RAM', mud: 'PUSH', bridge: 'BRIDGE', cross: 'CROSS', chock: 'CHOCK', shield: 'SHIELD' }[pl.he.why] || 'JOB';
      K.chip(x0, cy, cw, chh, 'deck ' + (h.climb ? '…' : h.lvl === 0 ? 'ground' : h.lvl), !!(pl.he.nav && (pl.he.nav.up || pl.he.nav.down)), false, z);
      K.chip(x0 + cw + 6 * z, cy, cw, chh, kk(Hn, 'act') + jobName, pl.he.act && pl.he.why !== 'ready', h.hold > 0 || st.roof > 0, z);
    }
    if (G.introT > 0 || (st.state !== 'go' && st.state !== 'bridge') || st.waiting) return;
    const P = K.prompter(st);
    {
      let s = null, col = C.gold, pulse = false;
      const pp = st.pu2 ? climberPos(st, st.pu2) : { x: scrX(st, u.x), y: groundY(st, st.tx + u.x) };
      if (st.state === 'bridge') s = st.pu2 ? 'Climb to the top and cross! ' + K.key(Pn, 'up') : u.knock > 0 ? null : !u.at ? 'Back to the bar ' + K.key(Pn, u.x > T.bar ? 'left' : 'right') : 'Hold it against the wall ' + K.key(Pn, 'right');
      else if (u.knock > 0) s = null;
      else if (pl.pu.duck && !u.duck) { s = 'DUCK! ' + K.key(Pn, 'down'); pulse = true; }
      else if (!u.at) s = pl.pu.walkTo === T.bar ? 'Back to the bar ' + K.key(Pn, u.x > T.bar ? 'left' : 'right') : 'Grab the shield!';
      else if (pl.pu.heave) { s = 'Heave! ' + K.key(Pn, 'act'); pulse = true; }
      else if (pl.pu.brake) { s = 'Hold it! ' + K.key(Pn, 'left'); pulse = true; }
      else if (pl.pu.letGo) { s = 'A shield! Let go ' + K.key(Pn, 'up'); }
      P.say(Pn, s, pp.x, pp.y - 50, col, pulse);
    }
    {
      let s = null, col = C.gold, pulse = false;
      const hp = climberPos(st, h), why = pl.he.why, n = pl.he.nav || {};
      const where = n.up ? 'Climb ' + K.key(Hn, 'up') : n.down ? 'Climb down ' + K.key(Hn, 'down') : null;
      if (h.knock > 0) s = null;
      else if (why === 'roof') { s = h.lvl === 3 ? 'Hold ' + K.key(Hn, 'act') + ': roof up!' : 'Volley! Up to the top! ' + (where || ''); pulse = true; }
      else if (why === 'fire') s = pl.he.act ? 'Beat it out! ' + K.key(Hn, 'act') : 'Fire on deck ' + pl.he.lvl + '! ' + (where || '');
      else if (why === 'bucket') s = pl.he.act ? 'Hold ' + K.key(Hn, 'act') + ' at the winch' : 'Big fire: fetch a bucket (deck 2) ' + (where || '');
      else if (why === 'wheel') s = pl.he.act ? 'Kick it out! ' + K.key(Hn, 'act') : 'Wheel jammed! Down to the ground ' + (where || '');
      else if (why === 'planks') s = pl.he.act ? 'Drop a plank! ' + K.key(Hn, 'act') : 'Trench ahead! Deck 1, front ' + (where || '');
      else if (why === 'ram') s = pl.he.act ? 'Ram it! ' + K.key(Hn, 'act') : 'Barrel! Deck 1, front ' + (where || '');
      else if (why === 'mud') s = 'Mud! Help push at the bar ' + K.key(Hn, 'right');
      else if (why === 'bridge') s = h.lvl === 3 ? 'Hold ' + K.key(Hn, 'act') + ' to drop the bridge' : 'Top deck! ' + (where || '');
      else if (why === 'cross') s = 'Cross! ' + K.key(Hn, 'right');
      if (s) pulse = pulse || !!pl.he.act;
      P.say(Hn, s, hp.x, hp.y - 50, col, pulse);
    }
  }
  const medal = t => K.medal(t <= S.goldT, t <= S.silverT);
  MODES.siegetower = {
    S, T, plan, nav, medal,
    setup(st, L) {
      st.stats = { knocks: 0, burns: 0, smashes: 0, rollbacks: 0, fires: 0, shields: 0, heaves: 0, kicks: 0, rams: 0, chocks: 0, missed: [], panels: 0, ruts: 0, volleys: 0, helps: 0, roomT: [] };
      st.shields = 0; st.inT = [G.time, G.time]; st.personT = G.time; st.clock = 0; st.T = 0; st.roofArrows = 0; st.pu2 = null;
      for (const row of L.grid) row.fill('.');
      room(st, L, 0);
    },
    room(k, L) { const st = G.mst; st.inT = [G.time, G.time]; st.personT = G.time; st.pu2 = null; for (const row of L.grid) row.fill('.'); room(st, L, k); },
    step(dt) { tick(G.mst, dt); },
    draw() { const st = G.mst; if (!st.items) return; draw(st); K.hide(st); },
    drawTop() { const st = G.mst; K.unhide(st); if (st.items) drawTop(st); },
    hud() { const st = G.mst; if (st.items) hud(st); },
    stats() {
      const st = G.mst, s = st.stats;
      if (!s) return [];
      const out = [
        { label: 'Shields', value: st.shields + ' of ' + S.shields },
        { label: 'Fires put out', value: String(s.fires) },
        { label: 'Knocks', value: String(s.knocks) },
        { label: 'Medal', value: medal(G.time) },
      ];
      out.push('Burns: ' + s.burns + '. Smashes: ' + s.smashes + '. Rollbacks: ' + s.rollbacks + '. The trophy is back where it belongs!');
      const hl = K.helpLine(s.helps); if (hl) out.push(hl);
      return out;
    },
  };

  /* ---------- the level ---------- */
  const acts = d => ({ label: 'job', labels: d === 0 ? ['heave', 'job'] : ['job', 'heave'] });
  TOURNEY.defs.siegetower = {
    name: 'Siege Tower Push', world: 36, kind: 'team', mode: 'siegetower', outfit: 'none', ownStep: true, ownHUD: true, noFalls: true, roomWord: 'Stretch',
    legend: {
      pip: '<kbd>A</kbd><kbd>D</kbd> push, brake or walk / <kbd>W</kbd><kbd>S</kbd> climb, duck',
      bo: '<kbd>←</kbd><kbd>→</kbd> push, brake or walk / <kbd>↑</kbd><kbd>↓</kbd> climb, duck',
      pad: 'stick pushes or walks,',
    },
    tip: 'Push the siege tower up to the baron\'s wall! The pusher pushes, brakes and heaves; the tower hero climbs to raise the roof, beat out fires and fix the wheels.',
    act: acts(0),
    map: K.stubMap(),
    rooms: [
      { title: 'The Meadow', pusher: 0, done: 'Across the meadow!', act: acts(0),
        tip: 'Pip pushes (▶), brakes (◀), heaves over ruts (action) and ducks (▼). Bo in the tower: ▲ ▼ climb at a ladder, HOLD the action on the top deck for the roof, tap it at a fire.' },
      { title: 'The Hill Road', pusher: 1, done: 'Up the hill!', act: acts(1),
        tip: 'Swap jobs! Uphill: keep someone on the bar or it rolls back. Chock it (deck 1, back) as a checkpoint. Stop short of boulder shadows; ram the barrels (deck 1, front).' },
      { title: 'The Ditches', pusher: 0, done: 'Through the ditches!', act: acts(0),
        tip: 'Mud needs both on the bar. Drop two planks over the trench (deck 1, front). Big fires need a bucket from the winch on deck 2.' },
      { title: 'Under the Wall', pusher: 1, done: 'Over the wall!', act: acts(1),
        tip: 'Time the push past the porridge spouts! At the wall: drop the bridge from the top deck while the pusher holds the tower, then both climb up and cross.' },
    ],
  };

  /* ---------- sounds ---------- */
  Sfx.extra.siegetowerHeave = function () { this.tone(160, 0.25, 'sawtooth', 0.04, 90); this.tone(320, 0.12, 'square', 0.015, 200, 0.05); };
  Sfx.extra.siegetowerGrip = function () { this.tone(500, 0.04, 'square', 0.02, 700); };
  Sfx.extra.siegetowerStep = function () { this.tone(200, 0.05, 'square', 0.02, 140); };
  Sfx.extra.siegetowerClimb = function () { [0, 0.1, 0.2].forEach(d => this.tone(260, 0.04, 'square', 0.015, 200, d)); };
  Sfx.extra.siegetowerCreak = function () { this.tone(170 + Math.random() * 40, 0.25, 'sawtooth', 0.012, 230); };
  Sfx.extra.siegetowerSqueak = function () { this.tone(900 + Math.random() * 300, 0.12, 'sine', 0.008, 700); };
  Sfx.extra.siegetowerSplash = function () { for (let k = 0; k < 4; k++) this.tone(1400 - k * 220, 0.06, 'sine', 0.02, 500, k * 0.03); };
  Sfx.extra.siegetowerHiss = function () { this.tone(3000, 0.3, 'sawtooth', 0.006, 1200); };
  Sfx.extra.siegetowerSlap = function () { this.tone(240, 0.06, 'square', 0.03, 120); };
  Sfx.extra.siegetowerKick = function () { this.tone(140, 0.08, 'square', 0.04, 80); this.tone(700, 0.1, 'triangle', 0.02, 1100, 0.04); };
  Sfx.extra.siegetowerCrack = function () { this.tone(1200, 0.05, 'square', 0.03, 300); this.tone(160, 0.2, 'sawtooth', 0.04, 60, 0.02); };
  Sfx.extra.siegetowerSwing = function () { this.tone(500, 0.12, 'sawtooth', 0.008, 200); };
  Sfx.extra.siegetowerClunk = function () { this.tone(120, 0.1, 'square', 0.05, 80); };
  Sfx.extra.siegetowerHorn = function () { this.tone(220, 0.5, 'sawtooth', 0.03, 230); this.tone(330, 0.4, 'square', 0.01, 330, 0.05); };
  Sfx.extra.siegetowerVolley = function () { for (let k = 0; k < 6; k++) this.tone(2400 - k * 200, 0.05, 'square', 0.006, 800, k * 0.05); };
  Sfx.extra.siegetowerFoom = function () { this.tone(90, 0.35, 'sawtooth', 0.04, 200); this.tone(600, 0.2, 'triangle', 0.01, 300, 0.05); };
  Sfx.extra.siegetowerOof = function () { this.tone(300, 0.12, 'square', 0.03, 120); this.tone(1100, 0.2, 'triangle', 0.015, 1500, 0.08); };
})();
