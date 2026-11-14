/* Pip & Bo - Level 37-4 Grand Joust (versus, World 37 Medieval Tournament). */
'use strict';

/* ===== 37-4 Grand Joust (mode 'grandjoust', versus, best of 5, Gavyn's pick) =====
   The tournament final. Two riders at opposite ends of the tilt, a trumpet, a charge, and one second to pick where to
   aim and where to guard. A read-and-commit duel with a timing layer (not 19-4's pure reaction, not 18-4's free fight).
   One screen, side view of the tilt yard: the barrier down the middle, the royal stand and the crowd behind. Pip charges
   from the left on the near side of the barrier, Bo from the right on the far side. The camera pushes in as the gap
   closes; at the strike a 0.25 s freeze with a lance-crack flash. def.ownStep: the mode runs the tick and draws it all.
   A PASS (about 4.5 s; GJ.charge s from the trumpet to contact):
     GALLOP: tap your forward key (Pip ▶, Bo ◀) on the horse's hoofbeats: on the beat adds a lot, off it a little,
       mashing (more than one tap a beat) nothing. Speed sets the hit strength: Trot, Canter, Gallop, Thunder.
     AIM AND GUARD (until the lock): ▲ / ▼ move your lance between High (helm), Middle (shield) and Low (saddle), one
       step per 0.15 s. Your shield guards one of the two other heights: ◀ BACK (Pip ◀, Bo ▶) swaps it. So each rider
       shows a lance height and a shield height and leaves exactly one height OPEN; both are on screen (the height
       ladder by each rider), so the charge is a feint game.
     THE LOCK: a ribbon across the lists GJ.lock s before contact; after it aim and guard are fixed. A change in the
       last GJ.fumbleWin s before the lock has a 50% chance to FUMBLE (the lance wobbles to Middle).
     THE STRIKE: a ring closes on each rider; press the action as it meets the mark: Perfect (within 0.06 s), Good
       (0.14 s), or Glance (worse, or no press).
   SCORING: your lance hits if the other rider's shield is not at that height (a blocked lance shatters: "Ooh!").
     Wobble added: Glance 1, Good 2, Perfect 3, +1 at Thunder, +1 for a High hit, +1 with Champion's Lances. A Low hit
     rattles the other horse: their next gallop ends a tier down. Wobble 5+: UNHORSED (into the hay, helm on backwards)
     and the other rider wins the round. Both at once: the one who took less on that pass stays on; exactly level =
     both remount at Wobble 3 and ride one more pass. Wobble drains 1 between passes for a rider who took no hit.
     After 6 passes: fewer Wobble wins; level = a tie. A second tie in a row goes to the framework's tiebreak (more
     hits landed this match), then sudden death: passes at Thunder until one rider is steadier (at most 6).
     A High Perfect spins the helm off (the surprised face shows until the next pass).
   TWISTS (one per round, the herald announces it): 1 plain, 2 Crosswind (a marked gust pushes both lances one height
     down: aim one up or wait it out), 3 Mud Lists (speed is harder to build), 4 Sun in the Eyes (each pass one rider
     can't see the other's shield for the middle second of the charge, alternating), 5 Champion's Lances (aim moves
     0.25 s a step, hits +1).
   GOLD HELP (a round behind, announced at GO, counted, not in sudden death): a gold favour: your strike ring is 30%
     wider and the first hit you take each round is 1 lighter.
   DEVIATION from the spec: the spec cycles the guard with the jump button, but on the keyboard jump IS ▲ (aim up), so
     the guard is swapped with the BACK key (Pip ◀, Bo ▶) instead. Touch and controllers use the same: ◀ / ▶ on the pad.
   OUTFITS (Gavyn's rule): full tournament champions (TOURNEY_OUTFITS 'champion'): polished plate with orange (Pip, sun)
     or blue (Bo, moon) enamel, crested helms with ribbons / plume that droop and tear as Wobble rises, visors drop at
     the trumpet, a helm spins off on a High Perfect, the round's loser sits in the hay with the helm on backwards, and
     the match winner wears a laurel. Caparisons: Pip orange and gold, Bo blue and silver.
   MODES.grandjoust.plan(st, id) gives the brain what a person can see: the pass clock, the hoofbeat, the other rider's
     aim and guard (hidden by the Sun twist), the gust. Everything lives inside this block; sounds are Sfx.extra.grandjoust*. */
(() => {
  const K = TOURNEY, TAU = Math.PI * 2;
  const GJ = {
    charge: 3.0, lock: 0.5, fumbleWin: 0.15, step: 0.15, heavyStep: 0.25, beat: 0.3, onBeat: 0.085, mudOnBeat: 0.06,
    on: 0.42, off: 0.1, mudOn: 0.34, mudOff: 0.05, perfect: 0.06, good: 0.14, goldRing: 1.3, strikeOpen: 0.45,
    freeze: 0.25, result: 1.7, reset: 0.7, unhorse: 5, passes: 6, sunA: 1.0, sunB: 2.0, gustTell: 0.6,
    roundTime: 0,
  };
  const TIERS = ['Trot', 'Canter', 'Gallop', 'Thunder'];
  const HN = ['Low', 'Middle', 'High'];
  const TWISTS = [
    { name: 'The Grand Tilt', line: 'Round 1: a plain tilt. Gallop on the hoofbeats, aim where the shield isn\'t!' },
    { name: 'Crosswind', wind: true, line: 'Round 2: Crosswind! Watch the pennants: a gust pushes lances down' },
    { name: 'Mud Lists', mud: true, line: 'Round 3: Mud Lists! Speed is harder to build' },
    { name: 'Sun in the Eyes', sun: true, line: 'Round 4: Sun in the Eyes! The glare hides a shield mid-charge' },
    { name: 'Champion\'s Lances', heavy: true, line: 'Round 5: Champion\'s Lances! Heavy: slow to aim, but they hit harder' },
  ];
  const R = { gyN: 474, gyF: 404, bar: 432, cx: W / 2, x0: 116 };

  /* ---------- a round ---------- */
  function newRound(st, n, info) {
    st.round = n; st.sd = !!info.suddenDeath;
    st.tw = TWISTS[Math.min(n - 1, TWISTS.length - 1)];
    if (st.sd) st.tw = { name: 'Sudden death', line: 'Sudden death! One pass at Thunder speed' };
    const w = info.wins || [0, 0];
    st.r = [0, 1].map(id => ({
      id, wob: 0, gold: !st.sd && !st.noHelp && w[1 - id] - w[id] >= 1, goldUsed: false, rattled: false,
      laurel: false, helmOff: false, down: false, hits: 0,
    }));
    st.pass = 0; st.res = false; st.endT = 0; st.loser = -1; st.resolved = 0; st.extra = false; st.call = null;
    K.fx(st);
    startPass(st, true);
  }
  function startPass(st, first) {
    st.pass++; st.t = 0; st.phase = first ? 'wait' : 'charge'; st.freezeT = 0; st.flash = 0; st.lockShown = false; st.struck = false; st.beatSeen = -1;
    st.gust = st.tw.wind ? { t: GJ.charge - (0.25 + Math.random() * 1.6), done: false } : null;
    st.sunOn = st.tw.sun ? st.pass % 2 : -1; // who is blinded this pass (Pip on odd passes)
    for (const r of st.r) {
      Object.assign(r, {
        sp: st.sd ? 3.2 : 0, aim: 1, guard: 2, stepT: 0, want: 1, lastChange: -9, beatN: -9, beatTaps: 0,
        strikeT: null, q: null, hitBy: 0, took: 0, fumble: false, prevIn: {}, x: 0, ph: 0, helmOff: false, tapFx: null,
      });
      if (r.rattled) { r.rattledNow = true; r.rattled = false; } else r.rattledNow = false;
    }
    if (!first) Sfx.play('tourneyFanfare');
  }
  const forwardKey = id => (id === 0 ? 'right' : 'left');
  const backKey = id => (id === 0 ? 'left' : 'right');
  const tierOf = sp => clamp(Math.floor(sp), 0, 3);
  const finalTier = r => clamp(tierOf(r.sp) - (r.rattledNow ? 1 : 0), 0, 3);
  const openOf = r => [0, 1, 2].find(h => h !== r.aim && h !== r.guard);

  /* ---------- the tick ---------- */
  function tick(st, dt, live) {
    if (!st.r) return;
    st.clock = (st.clock || 0) + dt;
    K.tickFx(st, dt);
    for (const p of G.players) { if (!live) { p.pendingJump = false; p.pendingAct = false; } }
    if (!live) { anim(st, dt); mirror(st); return; }
    if (st.phase === 'wait') st.phase = 'charge';
    if (st.phase === 'charge') charge(st, dt);
    else if (st.phase === 'result') { st.t += dt; if (st.t >= GJ.result) afterPass(st); }
    else if (st.phase === 'reset') { st.t += dt; if (st.t >= GJ.reset) startPass(st, false); }
    else if (st.phase === 'over') { st.t += dt; if (st.t > 1.2 && !st.res) { st.res = true; finish(st); } }
    for (const p of G.players) { p.pendingJump = false; p.pendingAct = false; }
    anim(st, dt);
    mirror(st);
  }
  function anim(st, dt) {
    for (const r of st.r) if (r.tapFx && (r.tapFx.t -= dt) <= 0) r.tapFx = null;
    for (const r of st.r) { r.ph += dt * (0.9 + tierOf(r.sp) * 0.45) * (st.phase === 'charge' || st.phase === 'result' ? 1 : 0.2); }
    if (st.flash > 0) st.flash -= dt;
  }
  function charge(st, dt) {
    st.t += dt;
    const lockAt = GJ.charge - GJ.lock;
    // the gust (Crosswind): both lances drop one height
    if (st.gust && !st.gust.done && st.t >= st.gust.t) {
      st.gust.done = true;
      for (const r of st.r) {
        r.aim = Math.max(0, r.aim - 1); r.want = Math.min(r.want, r.aim);
        if (r.guard === r.aim) r.guard = [0, 1, 2].find(h => h !== r.aim);
      }
      Sfx.play('grandjoustGust'); K.pop(st, W / 2, 140, 'GUST!', '#ffffff', 22);
    }
    // the hoofbeat everyone taps to: a soft thud on every beat, and the beat lamps on the HUD flash with it (review
    // fix: the beat could not be seen or heard until a tap happened to land on it)
    if (!st.sd && st.t < GJ.charge) { const nb = Math.round(st.t / GJ.beat); if (nb !== st.beatSeen && st.t >= nb * GJ.beat) { st.beatSeen = nb; Sfx.play('grandjoustHoof'); } }
    for (const r of st.r) rider(st, r, dt, st.t < lockAt);
    if (st.t >= lockAt && !st.lockShown) {
      st.lockShown = true; Sfx.play('grandjoustLock');
      for (const r of st.r) if (r.lastChange > lockAt - GJ.fumbleWin && Math.random() < 0.5) { r.fumble = true; r.aim = 1; if (r.guard === 1) r.guard = 2; K.pop(st, riderX(st, r), 200, 'Fumble!', '#ffd0c8', 18); Sfx.play('grandjoustFumble'); }
    }
    // late presses still count for a moment after contact (a Glance at worst), then the pass resolves
    if (st.t >= GJ.charge + GJ.good * 1.4) { resolve(st); st.phase = 'result'; st.t = 0; return; }
    if (st.t >= GJ.charge && !st.struck) { st.struck = true; st.freezeT = GJ.freeze; st.flash = 0.35; Sfx.play('tourneyCrack'); }
  }
  function rider(st, r, dt, open) {
    const p = G.players[r.id], i = p.input;
    r.prevIn = r.prevIn || {};
    const edge = k => { const on = k === 'up' ? (i.up || i.jump) : i[k]; const was = r.prevIn[k]; r.prevIn[k] = !!on; return on && !was; };
    const fwd = edge(forwardKey(r.id)), back = edge(backKey(r.id)), up = edge('up'), down = edge('down');
    // the gallop: taps on the hoofbeat
    if (fwd && !st.sd) {
      const b = Math.round(st.t / GJ.beat), d = Math.abs(st.t - b * GJ.beat), win = st.tw.mud ? GJ.mudOnBeat : GJ.onBeat;
      if (b !== r.beatN) { r.beatN = b; r.beatTaps = 0; }
      r.beatTaps++;
      const add = r.beatTaps > 1 ? 0 : d <= win ? (st.tw.mud ? GJ.mudOn : GJ.on) : (st.tw.mud ? GJ.mudOff : GJ.off);
      r.sp = Math.min(3.99, r.sp + add);
      r.tapFx = { on: add >= GJ.mudOn, t: 0.3 };
      if (add >= GJ.mudOn) Sfx.play('tourneyGallop', 1 + tierOf(r.sp) * 0.5);
    }
    // aim and guard (until the lock)
    if (open) {
      if (up) r.want = Math.min(2, r.want + 1);
      if (down) r.want = Math.max(0, r.want - 1);
      r.stepT -= dt;
      if (r.aim !== r.want && r.stepT <= 0) {
        const old = r.aim; r.aim += Math.sign(r.want - r.aim); r.stepT = st.tw.heavy ? GJ.heavyStep : GJ.step; r.lastChange = st.t;
        // the shield can't sit where the lance is: it takes the height the lance left
        if (r.guard === r.aim) r.guard = old;
        Sfx.play('grandjoustTick');
      }
      if (back) { r.guard = [0, 1, 2].find(h => h !== r.aim && h !== r.guard); r.lastChange = st.t; Sfx.play('tourneyClang'); }
    }
    // the strike: the first press in the window counts
    if (p.pendingAct && r.strikeT === null && st.t >= GJ.charge - GJ.strikeOpen) { r.strikeT = st.t; Sfx.play('grandjoustStrike'); }
  }
  function resolve(st) {
    if (st.resolved === st.pass) return;
    st.resolved = st.pass;
    const [A, B] = st.r;
    for (const r of st.r) {
      const ring = r.gold ? GJ.goldRing : 1, d = r.strikeT === null ? 9 : Math.abs(r.strikeT - GJ.charge);
      r.q = d <= GJ.perfect * ring ? 'Perfect' : d <= GJ.good * ring ? 'Good' : 'Glance';
    }
    for (const r of st.r) {
      const o = st.r[1 - r.id];
      if (r.aim === o.guard) { r.blocked = true; st.stat.blocks[o.id]++; continue; }
      r.blocked = false;
      let dmg = { Glance: 1, Good: 2, Perfect: 3 }[r.q] + (finalTier(r) === 3 ? 1 : 0) + (r.aim === 2 ? 1 : 0) + (st.tw.heavy ? 1 : 0);
      if (o.gold && !o.goldUsed) { dmg = Math.max(1, dmg - 1); o.goldUsed = true; }
      o.took = dmg; o.hitBy = r.q;
      st.stat.hits[r.id]++; if (r.q === 'Perfect') st.stat.perfect[r.id]++;
      if (r.aim === 0) o.rattled = true;
      if (r.aim === 2 && r.q === 'Perfect') o.helmOff = true;
    }
    for (const r of st.r) st.stat.bestTier[r.id] = Math.max(st.stat.bestTier[r.id], finalTier(r));
    for (const r of st.r) r.wob += r.took;
    // the herald names the pass
    const both = A.took && B.took, none = !A.took && !B.took;
    const big = Math.max(A.took, B.took);
    st.call = none ? (A.blocked && B.blocked ? 'Both blocked! The crowd groans!' : 'Shattered on the shields!') : both ? 'Both struck! What a clash!' : big >= 4 ? 'A shattering blow!' : big >= 3 ? 'A fine strike!' : 'A glancing touch!';
    Sfx.play(none ? 'tourneyGasp' : 'tourneyRoar');
    if (!none) Sfx.play('tourneyCrack'); else Sfx.play('tourneyClang');
    K.pop(st, W / 2, 150, st.call, '#ffffff', 22);
    for (const r of st.r) if (r.took) K.pop(st, riderX(st, r), r.id ? 250 : 300, r.hitBy + '! +' + r.took, r.hitBy === 'Perfect' ? C.gold : '#ffffff', 18);
    for (const r of st.r) if (!r.blocked && st.r[1 - r.id].took) for (let n = 0; n < 12; n++) K.part(st, W / 2 + (Math.random() - 0.5) * 40, 300, (Math.random() - 0.5) * 300, -Math.random() * 220, 0.9, n % 2 ? (r.id ? '#3a6ee8' : '#ff7a2a') : '#f6ecd0', 4, 500);
  }
  function afterPass(st) {
    const [A, B] = st.r;
    const downA = A.wob >= GJ.unhorse, downB = B.wob >= GJ.unhorse;
    let loser = -1;
    if (downA && downB) {
      if (A.took !== B.took) loser = A.took > B.took ? 0 : 1;
      else { A.wob = B.wob = 3; K.msg(st, 'Both reeling! Both remount at Wobble 3: one more pass!', '#ffe7a8', 2.4); st.extra = true; }
    } else if (downA) loser = 0; else if (downB) loser = 1;
    if (loser >= 0) { unhorse(st, loser); return; }
    for (const r of st.r) if (!r.took) r.wob = Math.max(0, r.wob - 1);
    // sudden death: ride again until one of them is steadier (at most GJ.passes passes, then it's a tie after all)
    if (st.sd && A.wob === B.wob && st.pass < GJ.passes) { K.msg(st, 'Still level! Ride again!', '#ffe7a8', 1.6); st.phase = 'reset'; st.t = 0; return; }
    if (st.sd || st.pass >= GJ.passes && !st.extra) {
      // out of passes: fewer Wobble wins
      if (A.wob !== B.wob) { st.loser = A.wob > B.wob ? 0 : 1; st.phase = 'over'; st.t = 0; st.reason = NAMES[1 - st.loser] + ' kept steadier in the saddle!'; st.r[st.loser].sat = true; return; }
      st.phase = 'over'; st.t = 0; st.loser = -1; st.reason = 'Dead level after ' + st.pass + ' passes!'; return;
    }
    st.extra = false;
    st.phase = 'reset'; st.t = 0;
  }
  function unhorse(st, id) {
    st.loser = id; st.r[id].down = true; st.r[id].sat = true; st.stat.unhorsed[1 - id]++;
    st.phase = 'over'; st.t = 0; st.reason = NAMES[id] + ' was unhorsed! Into the hay with a clang!';
    Sfx.play('tourneyClang'); Sfx.play('tourneyBoing'); Sfx.play('tourneyRoar');
  }
  function finish(st) {
    const w = st.loser < 0 ? -1 : 1 - st.loser;
    if (w >= 0) st.stat.wins[w]++;
    matchRoundEnd(w, st.reason);
  }
  const riderX = (st, r) => {
    const u = clamp(st.t / GJ.charge, 0, 1.6), ph = st.phase;
    let k = ph === 'charge' || ph === 'freeze' ? u : ph === 'result' ? 1 + clamp((st.t - GJ.freeze) / (GJ.result - GJ.freeze), 0, 1) * 0.55 : ph === 'over' ? 1.55 : 0;
    if (ph === 'wait' || ph === 'reset') k = 0;
    const span = R.cx - 40 - R.x0;
    return r.id === 0 ? R.x0 + span * k : W - R.x0 - span * k;
  };
  function mirror(st) {
    for (const r of st.r) { K.place(r.id, riderX(st, r), r.id ? R.gyF - 76 : R.gyN - 84); }
  }

  /* ---------- what a rider can see (the brain reads this) ---------- */
  function plan(st, id) {
    if (!st.r) return null;
    const me = st.r[id], o = st.r[1 - id], lockAt = GJ.charge - GJ.lock;
    const sunHides = st.sunOn === id && st.phase === 'charge' && st.t > GJ.sunA && st.t < GJ.sunB;
    const nb = Math.round(st.t / GJ.beat);
    return {
      phase: st.phase, t: st.t, toLock: lockAt - st.t, toHit: GJ.charge - st.t, locked: st.t >= lockAt,
      beat: { d: st.t - nb * GJ.beat, n: nb, win: st.tw.mud ? GJ.mudOnBeat : GJ.onBeat, tapped: me.beatN === nb && me.beatTaps > 0 },
      sp: me.sp, tier: tierOf(me.sp), aim: me.aim, want: me.want, guard: me.guard, open: openOf(me), stepping: me.aim !== me.want,
      other: { aim: o.aim, guard: sunHides ? null : o.guard, open: sunHides ? null : openOf(o), wob: o.wob },
      wob: me.wob, gold: me.gold, struck: me.strikeT !== null,
      gust: st.gust && !st.gust.done ? { in: st.gust.t - st.t, afterLock: st.gust.t >= lockAt } : null,
      heavy: !!st.tw.heavy, mud: !!st.tw.mud, sd: st.sd, pass: st.pass, round: st.round,
    };
  }

  /* ---------- drawing ---------- */
  function draw(st) {
    const t = st.clock || 0;
    // the camera pushes in on the closing gap
    const u = st.phase === 'charge' ? K.smooth(clamp(st.t / GJ.charge, 0, 1)) : st.phase === 'freeze' || st.phase === 'result' ? 1 - clamp(st.t / GJ.result, 0, 1) * 0.6 : 0;
    const z = 1 + u * 0.16, shake = st.flash > 0 ? (Math.random() - 0.5) * 6 : 0;
    ctx.save(); ctx.translate(W / 2 + shake, 330); ctx.scale(z, z); ctx.translate(-W / 2, -330);
    K.sky(0, t, { grey: st.tw.sun ? 0 : 0 });
    if (st.tw.sun) { const g = ctx.createRadialGradient(st.sunOn === 0 ? W - 90 : 90, 70, 10, st.sunOn === 0 ? W - 90 : 90, 70, 260); g.addColorStop(0, 'rgba(255,250,210,0.95)'); g.addColorStop(1, 'rgba(255,250,210,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, 360); }
    K.hills(0, { base: 300, castle: true });
    // the royal stand and the crowd
    const mood = st.phase === 'result' || st.phase === 'over' ? (st.call && st.call.indexOf('blocked') >= 0 ? 'gasp' : 'cheer') : st.phase === 'charge' && st.t > GJ.charge - 1 ? 'wave' : 'idle';
    K.crowd(40, W - 40, 352, t, { rows: 4, mood, seed: 3, roof: true, royal: true });
    const windGust = st.gust && !st.gust.done && st.t > st.gust.t - GJ.gustTell ? 1 : 0;
    K.pennants(0, W, 196, t, { sag: 18, wind: windGust ? 1 : st.tw.wind ? 0.4 : 0.2, gust: windGust ? -1 : 0 });
    // the lists: far track, the barrier, near track
    ctx.fillStyle = K.COL.dirt; ctx.fillRect(0, 360, W, H - 360);
    ctx.fillStyle = 'rgba(120,90,50,0.35)'; for (let k = 0; k < 18; k++) ctx.fillRect((k * 61) % W, 380 + (k % 4) * 30, 30, 3);
    if (st.tw.mud) { ctx.fillStyle = 'rgba(90,60,30,0.55)'; for (let k = 0; k < 9; k++) { ctx.beginPath(); ctx.ellipse(60 + k * 110, 470 + (k % 2) * 30, 50, 9, 0, 0, TAU); ctx.fill(); } }
    drawRider(st, st.r[1], t);
    // the barrier (the tilt)
    for (let x = 0; x < W; x += 48) { ctx.fillStyle = (x / 48) % 2 ? '#d8323a' : '#f6ecd0'; ctx.fillRect(x, R.bar - 20, 48, 22); }
    ctx.fillStyle = '#5e3a1c'; for (let x = 20; x < W; x += 96) ctx.fillRect(x, R.bar - 26, 6, 40);
    ctx.fillStyle = '#7a4e2a'; ctx.fillRect(0, R.bar - 24, W, 5);
    // the lock ribbon
    if (st.phase === 'charge') {
      const lu = clamp((st.t - (GJ.charge - GJ.lock - 0.6)) / 0.6, 0, 1), locked = st.t >= GJ.charge - GJ.lock;
      if (lu > 0) { ctx.strokeStyle = locked ? C.gold : 'rgba(255,255,255,0.8)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(W / 2 - 60, 230); ctx.quadraticCurveTo(W / 2, 250 + Math.sin(t * 8) * 4, W / 2 + 60, 230); ctx.stroke(); ctx.fillStyle = '#5e3a1c'; ctx.fillRect(W / 2 - 64, 226, 6, 200); ctx.fillRect(W / 2 + 58, 226, 6, 200); if (locked) text('LOCKED', W / 2, 218, 13, C.gold, 'center', 'display'); }
    }
    drawRider(st, st.r[0], t);
    // the hay bale the loser lands in
    K.drawParts(st, 0);
    ctx.restore();
    // the lance-crack flash
    if (st.flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + clamp(st.flash / 0.35, 0, 1) * 0.6 + ')'; ctx.fillRect(0, 0, W, H); }
    if (st.phase === 'reset') { ctx.fillStyle = 'rgba(20,20,40,' + Math.sin(clamp(st.t / GJ.reset, 0, 1) * Math.PI) * 0.6 + ')'; ctx.fillRect(0, 0, W, H); }
  }
  function drawRider(st, r, t) {
    const id = r.id, face = id ? -1 : 1, far = id === 1, gy = far ? R.gyF : R.gyN, s = far ? 1.05 : 1.2;
    const x = riderX(st, r), sp = st.phase === 'charge' || st.phase === 'result' ? 0.45 + tierOf(r.sp) * 0.18 : 0.05;
    const caps = id ? ['#3a6ee8', '#dfe6f2'] : ['#ff7a2a', '#ffc53d'];
    if (r.sat && st.phase === 'over') {
      // the loser: in the hay with the helm on backwards and birds circling; the horse stands by
      const hx = id ? W - 150 : 150, hy = (id ? R.gyF : R.gyN) - 36;
      K.horse(hx + face * 120, gy, { face: -face, s, phase: 0, speed: 0, cap: caps, capTrim: id ? '#dfe6f2' : '#ffd23a', coat: id ? '#3a2a20' : '#a8683a', coatDark: id ? '#22180e' : '#7a4a20' });
      K.hay(hx, id ? R.gyF + 6 : R.gyN, 1.4);
      K.squire(id, hx, hy, { outfit: 'champion', face, s: s * 0.95, backwards: true, wobble: 1, dizzy: true, sq: 0.15 });
      for (let k = 0; k < 3; k++) { const a = t * 3 + k * TAU / 3; text('🐦', hx + Math.cos(a) * 24, hy - 50 * s + Math.sin(a) * 6, 12, '#ffffff', 'center', 'body'); }
      return;
    }
    const o = K.horse(x, gy, { face, s, phase: r.ph, speed: sp, cap: caps, capTrim: id ? '#dfe6f2' : '#ffd23a', coat: id ? '#3a2a20' : '#a8683a', coatDark: id ? '#22180e' : '#7a4a20', mane: id ? '#1a1210' : '#f2e6c8' });
    const wob = clamp(r.wob / GJ.unhorse, 0, 1), sx = o.saddle.x, sy = o.saddle.y + 4;
    const lean = st.phase === 'result' && r.took ? -face * 0.4 * Math.sin(clamp(st.t / 0.6, 0, 1) * Math.PI) : Math.sin(t * 7) * wob * 0.08;
    const visor = st.phase === 'charge' ? clamp(st.t / 0.4, 0, 1) : 0.2;
    const winner = G.match && G.match.phase !== 'live' && G.match.wins[id] >= G.match.need;
    // the lance at its aim height, the shield at its guard height
    const sunHide = st.sunOn === 1 - id && st.phase === 'charge' && st.t > GJ.sunA && st.t < GJ.sunB;
    const hy = h => sy - 6 - [-4, 14, 32][h] * s;
    const gx = sx + face * 6, gyy = sy - 18 * s;
    // the lance points at the other rider at its aim height (the far rider is higher on the screen)
    const oS = far ? 1.2 : 1.05, oGy = far ? R.gyN : R.gyF, oX = riderX(st, st.r[1 - id]);
    const aimY = oGy - [52, 74, 96][r.aim] * oS + (far ? -10 : 10), tipX = gx + face * Math.max(160, face * (oX - gx));
    let ang = Math.atan2(aimY - gyy, tipX - gx);
    if (st.phase === 'result' || st.phase === 'over' || st.phase === 'reset') { // after the strike the lance is raised
      if (face < 0 && ang < 0) ang += TAU;
      const up = face > 0 ? -0.9 : Math.PI + 0.9, k = st.phase === 'result' ? clamp((st.t - GJ.freeze) / 0.5, 0, 1) : 1;
      ang = ang + (up - ang) * k;
    }
    if (!(st.phase === 'result' && r.took === 0 && !r.blocked && st.t > 0.2 && false)) {
      const spl = st.phase === 'result' || st.phase === 'over' ? clamp(st.t / 0.3, 0, 1) : 0;
      K.lance(gx, gyy, ang, 210 * s, { cols: id ? ['#3a6ee8', '#dfe6f2'] : ['#ff7a2a', '#ffc53d'], gold: r.gold, splinter: spl * (r.blocked || st.r[1 - id].took ? 1 : 0) });
    }
    K.squire(id, sx, sy, { outfit: 'champion', face, s, arms: 'fwd', wobble: wob, visor, helmOff: r.helmOff, laurel: winner, rot: lean, v: sp });
    if (r.helmOff && (st.phase === 'result' || st.phase === 'over')) TOURNEY_OUTFITS.helm(ctx, id, sx - face * (40 + st.t * 120), sy - 60 * s - Math.sin(clamp(st.t, 0, 1) * Math.PI) * 60, s, st.t * 12, { face });
    // the shield on the arm at the guard height
    if (!sunHide) K.heraldShield(sx + face * 14 * s, hy(r.guard) - 20 * s, 11 * s, { col: id ? '#3a6ee8' : '#ff7a2a', col2: id ? '#dfe6f2' : '#ffc53d', charge: id ? 'moon' : 'sun', chargeCol: '#ffffff' });
    else { ctx.fillStyle = 'rgba(255,250,210,0.9)'; circle(sx + face * 14 * s, hy(1) - 20 * s, 26 * s); ctx.fill(); }
  }
  // the height ladder by a rider: lance, shield, open
  function ladder(st, r, x, y, z) {
    const id = r.id, o = st.r[1 - id];
    const sunHide = st.sunOn === 1 - id && st.phase === 'charge' && st.t > GJ.sunA && st.t < GJ.sunB;
    ctx.fillStyle = 'rgba(20,22,52,0.78)'; rr(x - 34 * z, y - 50 * z, 68 * z, 96 * z, 10 * z); ctx.fill();
    for (let h = 0; h < 3; h++) {
      const yy = y + (1 - h) * 28 * z;
      const isAim = h === r.aim, isGuard = h === r.guard;
      ctx.fillStyle = isGuard && sunHide ? 'rgba(255,250,210,0.5)' : isAim ? (id ? '#3a6ee8' : '#ff7a2a') : isGuard ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.12)';
      rr(x - 28 * z, yy - 11 * z, 56 * z, 22 * z, 7 * z); ctx.fill();
      const lab = isGuard && sunHide ? '☀' : isAim ? 'LANCE' : isGuard ? 'SHIELD' : 'open';
      text(lab, x, yy + 0.5, 10 * z, isAim ? '#ffffff' : isGuard ? C.ink : 'rgba(255,255,255,0.6)', 'center', 'body');
      if (isAim && r.aim !== r.want) text(r.want > r.aim ? '▲' : '▼', x + 34 * z, yy, 10 * z, '#ffffff', 'center', 'body');
    }
    text(HN[2][0] + ' / ' + HN[1][0] + ' / ' + HN[0][0], x, y - 42 * z, 9 * z, 'rgba(255,255,255,0.6)', 'center', 'body');
  }
  // the strike ring closing on the rider
  function strikeRing(st, r, x, y) {
    if (st.phase !== 'charge' || st.t < GJ.charge - 0.9) return;
    const d = GJ.charge - st.t, ring = r.gold ? GJ.goldRing : 1, rad = 14 + Math.max(0, d) * 70;
    ctx.strokeStyle = r.strikeT !== null ? 'rgba(255,255,255,0.3)' : '#ffffff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, rad, 0, TAU); ctx.stroke();
    ctx.strokeStyle = r.gold ? C.gold : '#8fe3b0'; ctx.lineWidth = 3 + 4 * ring; ctx.beginPath(); ctx.arc(x, y, 14, 0, TAU); ctx.stroke();
  }
  const circ = (x, y, r) => circle(x, y, r);

  /* ---------- HUD ---------- */
  function hud(st) {
    const big = hudBig(), z = big ? 1.25 : 1;
    // the wobble bars and speed tiers
    for (const r of st.r) {
      const id = r.id, x = id ? W - 250 * z : 22, y = 92 * z;
      ctx.fillStyle = 'rgba(20,22,52,0.8)'; rr(x, y - 22 * z, 228 * z, 66 * z, 12 * z); ctx.fill();
      ctx.strokeStyle = PCOL[id]; ctx.lineWidth = 2; rr(x, y - 22 * z, 228 * z, 66 * z, 12 * z); ctx.stroke();
      text(NAMES[id] + (r.gold ? ' ★' : '') + (K.quiet(id) ? ' (computer)' : ''), x + 12 * z, y - 8 * z, 13 * z, PCOL[id], 'left', 'body');
      text('Wobble', x + 12 * z, y + 12 * z, 11 * z, '#ffffff', 'left', 'body');
      for (let k = 0; k < GJ.unhorse; k++) { ctx.fillStyle = k < r.wob ? (r.wob >= GJ.unhorse - 1 ? '#ff5a4a' : '#ffb04a') : 'rgba(255,255,255,0.15)'; rr(x + 66 * z + k * 22 * z, y + 4 * z, 18 * z, 14 * z, 4 * z); ctx.fill(); }
      const tier = finalTier(r);
      K.chip(x + 12 * z, y + 22 * z, 100 * z, 18 * z, TIERS[tier] + (r.rattledNow ? ' (rattled)' : ''), false, tier >= 2, z * 0.85);
      text('pass ' + st.pass + (st.sd ? '' : ' / ' + GJ.passes), x + 182 * z, y + 31 * z, 10 * z, '#e8dcc8', 'center', 'body');
      // the hoofbeat lamp: bright on the beat (tap forward then); green after a tap on the beat, red after one off it
      if (st.phase === 'charge' && !st.sd && st.t < GJ.charge) {
        const d = Math.abs(st.t - Math.round(st.t / GJ.beat) * GJ.beat), win = st.tw.mud ? GJ.mudOnBeat : GJ.onBeat, on = d <= win;
        const lx = x + 128 * z, ly = y + 31 * z, fx = r.tapFx;
        ctx.fillStyle = fx ? (fx.on ? '#8fe3b0' : '#ff7a6a') : on ? '#ffffff' : 'rgba(255,255,255,0.22)';
        circle(lx, ly, (on ? 8 : 6) * z); ctx.fill();
        text(fx ? (fx.on ? '✓' : '✗') : '♪', lx, ly + 0.5, 9 * z, fx || on ? C.ink : 'rgba(255,255,255,0.7)', 'center', 'body');
      }
    }
    // the message line sits under the two rider panels (review fix: at the top it lay over the round pill)
    ctx.save(); ctx.translate(0, (big ? 152 : 142) - (big ? 96 : 80)); K.drawMsg(st, st.msg, 0); ctx.restore();
    if (!G.match || st.phase === 'over') return;
    // the ladders and strike rings by the riders
    for (const r of st.r) {
      const x = riderX(st, r), lz = big ? 1.1 : 0.9;
      ladder(st, r, r.id ? W - 60 * lz : 60 * lz, 236 * z, lz);
      strikeRing(st, r, x, r.id ? R.gyF - 110 : R.gyN - 120);
    }
    // prompts
    if (G.match.phase !== 'live' || st.phase !== 'charge') return;
    const P = K.prompter(st);
    for (const r of st.r) {
      const id = r.id, x = clamp(riderX(st, r), 150, W - 150), y = r.id ? R.gyF - 150 : R.gyN - 168;
      let s = null, pulse = false;
      if (st.t < 1.0) s = 'Gallop! Tap ' + K.key(id, forwardKey(id)) + ' on the hoofbeats';
      else if (st.t < GJ.charge - GJ.lock) s = K.key(id, 'up') + K.key(id, 'down') + ' aim · ' + K.key(id, backKey(id)) + ' shield';
      else { s = 'Strike! ' + K.key(id, 'act'); pulse = true; }
      P.say(id, s, x, y, PCOL[id], pulse);
    }
  }

  const statsOf = () => ({ wins: [0, 0], hits: [0, 0], perfect: [0, 0], blocks: [0, 0], unhorsed: [0, 0], bestTier: [0, 0] });
  MODES.grandjoust = {
    GJ, plan, TWISTS,
    setup(st, L) {
      for (const row of L.grid) row.fill('.');
      st.stat = statsOf(); st.stats = { helps: 0 }; st.clock = 0;
      st.noHelp = !!this.testNoHelp;
      K.fx(st);
    },
    resetRound(n, info) { const st = G.mst; newRound(st, n, info); G.particles.length = 0; },
    go() {
      const st = G.mst;
      Sfx.play('tourneyFanfare');
      const g = st.r.filter(r => r.gold);
      if (g.length) K.goldHelp(st, 'A gold favour from the crowd for ' + NAMES[g[0].id] + ': a wider strike ring and the first hit softened!');
      else K.msg(st, st.tw.line, '#ffffff', 3.2);
    },
    step(dt) { tick(G.mst, dt, true); },
    idle(dt) { const st = G.mst; if (st.r) tick(st, dt, false); },
    timeUp() { return -1; },
    tiebreak() {
      const s = G.mst.stat;
      if (s.hits[0] !== s.hits[1]) return { winner: s.hits[0] > s.hits[1] ? 0 : 1, reason: 'More hits landed wins the tiebreak!' };
      return -1;
    },
    draw() { const st = G.mst; if (!st.r) return; draw(st); K.hide(st); },
    drawTop() { const st = G.mst; K.unhide(st); if (st.r) K.drawPops(st); },
    hud() { const st = G.mst; if (st.r && G.match) hud(st); },
    stats() {
      const st = G.mst, s = st.stat;
      if (!s) return [];
      const out = [
        { label: 'Rounds won', values: (G.match ? G.match.wins : s.wins).slice() },
        { label: 'Hits landed', values: s.hits.slice() },
        { label: 'Perfect strikes', values: s.perfect.slice() },
        { label: 'Blocks', values: s.blocks.slice() },
        { label: 'Unhorsings', values: s.unhorsed.slice() },
        { label: 'Best speed', values: s.bestTier.map(k => TIERS[k]) },
      ];
      const hl = K.helpLine(st.stats ? st.stats.helps : 0); if (hl) out.push(hl);
      return out;
    },
  };

  /* ---------- the level ---------- */
  TOURNEY.defs.grandjoust = {
    name: 'Grand Joust', world: 36, kind: 'versus', mode: 'grandjoust', outfit: 'none', ownStep: true,
    match: { bestOf: 5 },
    act: { label: 'strike' },
    tagLift: 40,
    legend: {
      pip: '<kbd>D</kbd> gallop <kbd>W</kbd><kbd>S</kbd> aim <kbd>A</kbd> shield',
      bo: '<kbd>←</kbd> gallop <kbd>↑</kbd><kbd>↓</kbd> aim <kbd>→</kbd> shield',
      pad: 'stick: forward gallops, back swaps the shield, up/down aims,',
    },
    tip: 'Tap forward on the hoofbeats to gallop, aim your lance (▲ ▼) where their shield ISN\'T, swap your shield (back) to cover their lance, and strike as the ring closes!',
    switches: {}, signs: [],
    map: K.stubMap(),
  };

  /* ---------- sounds ---------- */
  Sfx.extra.grandjoustHoof = function () { this.tone(120, 0.05, 'triangle', 0.035, 70); };
  Sfx.extra.grandjoustTick = function () { this.tone(900, 0.03, 'square', 0.015, 1100); };
  Sfx.extra.grandjoustLock = function () { this.tone(660, 0.1, 'triangle', 0.04, null); this.tone(990, 0.12, 'triangle', 0.03, null, 0.06); };
  Sfx.extra.grandjoustFumble = function () { this.tone(500, 0.2, 'sawtooth', 0.02, 200); };
  Sfx.extra.grandjoustStrike = function () { this.tone(300, 0.06, 'square', 0.03, 600); };
  Sfx.extra.grandjoustGust = function () { this.tone(400, 0.5, 'sawtooth', 0.008, 150); this.tone(2000, 0.4, 'sine', 0.004, 800); };
})();
