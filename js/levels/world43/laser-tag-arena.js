/* Pip & Bo - Level 43-4 Laser Tag Arena (versus, World 43 Arcade Cabinet, 3D). */
'use strict';

/* ===== 43-4 Laser Tag Arena (mode 'arcadelaser', versus, view3d, best of five rounds) =====
   The last game in the machine is a two-player one, and for once Pip and Bo are not on the same side. Out of the prize
   chute into the vesting room, a glowing vest and a chunky toy blaster each, then through the double doors into ZAP
   MAZE: a dark hall of haze, glowing murals and neon-trimmed cover, a gallery of pixel creatures behind the glass and a
   bulb scoreboard overhead. Toy laser tag with beams of light: a tag only switches a vest off for a moment.

   BOTH PLAYERS HAVE THE SAME CONTROLS:
     MOVE   run any way (stick or direction keys), quick and tight; the hero faces the way they run.
     JUMP   S.AIR s in the air: hops over low walls and DODGES BEAMS (a beam passes under a hero in the middle
            S.DODGE0..S.DODGE1 s of a jump). No firing in the air; a short landing pause (S.LAND s).
     FIRE   TAP: a quick shot straight ahead. The blaster glows and whines for S.TELL s (the tell), then the beam.
            HOLD: take aim. Facing locks, the hero can still side-step at S.AIM_K speed, and a dotted aiming line in
            their colour shows exactly where the beam will go, every mirror bounce included (the other player sees it
            too). Let go: the tell, then the beam along that line. Recharge S.RECHARGE s after a shot.
   AIM HELP: a tap bends by up to S.HELP onto the other vest if it is in clear line (judged at the press); a held aim
   also bends onto the middle of a mirror. The line always shows the bent path: the line and the beam are the same
   ARCADELASER_ARENA.trace call. A beam stops at walls, low walls, risen risers, pillars and the floor's edge; bounces
   off mirrors (S.BOUNCES, or S.LONG_B with Long Bounce); splits in three in a prism.
   TAGS: a beam on the other vest is a tag, one point. The tagged hero is safe S.SAFE s (vest dark, shimmer), cannot fire
   for S.NOFIRE s, and can run. Off a mirror it is a BANK SHOT (same point, counted). Both at once: both count.
   ROUNDS: first to S.NEED tags, or most when S.ROUND_T s runs out. Level at the buzzer: NEXT TAG WINS, gold light, and a
   ring of light walls closes in (S.GOLD_T s). Past S.MAX_T s with no tag the round is replayed. First to 3 rounds (best
   of five). The arena rebuilds itself in view between rounds (layouts 1-5 in ARCADELASER_ARENA). Catch-up (gold,
   announced): a player two rounds behind starts the next round with a shield on.
   PICKUPS (set times, on the centre pad or a matched pair): Wide Beam (next shot is three), Long Bounce (next three shots
   bounce six times), Cloak (S.CLOAK_T s faint shimmer; firing ends it), Shield (blocks one tag, S.SHIELD_T s), Speed
   (S.SPEED_T s a quarter faster). One held at a time.

   Phases (st.phase): open (the vesting room, skippable after the first play) -> count (3, 2, 1, ZAP) -> live
   (-> gold: next tag wins) -> won (the round-winning tag, a push-in) -> between (the rebuild; heroes jog home) -> count
   ... -> final (the trophy) -> done (matchRoundEnd: the results card). G.match only runs the start and the end; the
   rounds between are counted here straight into G.match.wins (as 42-4 counts its flags).
   State lives in G.mst; the rules never read the renderer (K3D.noRender plays the same). Events for the scene and the
   sounds go to st.fx (numbered). Names are prefixed arcadelaser. */

const ARCADELASER = (function () {
  const AR = ARCADELASER_ARENA, D = Math.PI / 180;
  const S = {
    RUN: 4.6, AIM_K: 0.7, SPEED_K: 1.25, AIR: 0.6, JH: 0.72, DODGE0: 0.125, DODGE1: 0.475, LAND: 0.15, LOWH: 0.22,
    R: 0.34, VEST: 0.36, MUZZLE: 0.45, CHEST: 0.5, TELL: 0.25, HOLD: 0.17, RECHARGE: 0.8, HELP: 12 * D, BOUNCES: 3, LONG_B: 6,
    SAFE: 2.5, NOFIRE: 1.5, STAGGER: 0.22, NEED: 5, ROUND_T: 75, GOLD_T: 20, MAX_T: 100, START_DOWN: 1.0,
    OPEN_T: 12, COUNT_T: 2.6, WON_T: 1.9, BETWEEN_T: 5.4, FINAL_T: 5.5, ROUNDS: 3,
    CLOAK_T: 4, SHIELD_T: 15, SPEED_T: 5, LONG_N: 3, WIDE_FAN: 12 * D, BUTTON_R: 0.55, PAD_R: 0.6, RING_MIN: [2.2, 1.5],
  };
  const CO = { S, AR };
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
  const dirOf = a => [Math.sin(a), Math.cos(a)];
  CO.dirOf = dirOf;

  /* ---------- a fresh match ---------- */
  function hero(id) {
    const [x, z] = AR.BASE[id];
    return { id, x, z, vx: 0, vz: 0, face: AR.BASE_FACE[id], air: -1, y: 0, land: 0, fire: null, rech: 0, noFire: 0, safe: 0,
      shield: 0, shieldT: 0, gold: false, cloakT: 0, speedT: 0, longN: 0, wide: false, stagger: 0, spinT: 0, tags: 0, line: null,
      onBtn: -1, held: null, auto: null, run: 0, stat: { tags: 0, bank: 0, dodges: 0, pickups: 0, best: 0, shots: 0 }, lastDodge: -9 };
  }
  function fresh(st) {
    Object.assign(st, {
      phase: 'open', t: 0, phaseT: 0, rt: 0, round: 1, roundNo: 1, wins: [0, 0], heroes: [hero(0), hero(1)],
      layout: AR.layout(1), nextLayout: null, rebuild: 0, risers: {}, riserOff: {}, turnN: {}, turnAng: {}, spinA: 0,
      startDown: 0, pads: {}, pickN: 0, ring: null, beams: [], fx: [], fxN: 0, says: [], winner: -1, decider: '', log: [],
      lastTag: null, roundWinner: -1, count: 0, skipOK: !!store.get('done:Laser Tag Arena'),
    });
    resetPieces(st);
    st.sol = AR.solids(st);
  }
  function resetPieces(st) {
    st.risers = {}; st.riserOff = {}; st.turnN = {}; st.turnAng = {}; st.spinA = 0; st.pads = {}; st.pickN = 0;
    for (const p of st.layout) {
      if (p.k === 'riser') { st.risers[p.i] = { h: 0, warn: false }; st.riserOff[p.i] = 0; }
      if (p.k === 'turn') { st.turnN[p.id] = 0; st.turnAng[p.id] = p.rot; }
    }
  }
  const fx = (st, k, o) => { st.fxN++; st.fx.push(Object.assign({ k, t: st.t, n: st.fxN }, o || {})); if (st.fx.length > 80) st.fx.shift(); };
  const say = (st, text, col) => { st.says.push({ text, t: st.t, col }); if (st.says.length > 6) st.says.shift(); };
  CO.fx = fx; CO.say = say;

  /* ---------- what each player presses ---------- */
  CO.anyPress = p => { const i = p.input || {}; return !!(i.left || i.right || i.down || i.jump || i.act || i.up || Math.abs(i.ax || 0) > 0.3 || Math.abs(i.ay || 0) > 0.3); };

  /* ---------- aim help: bend onto the other vest (and, while aiming, onto a mirror's middle) ---------- */
  CO.muzzle = (h, a) => { const [dx, dz] = dirOf(a); return [h.x + dx * S.MUZZLE, h.z + dz * S.MUZZLE]; };
  CO.help = function (st, h, a, aiming) {
    const o = st.heroes[1 - h.id], [mx, mz] = CO.muzzle(h, a);
    let best = null;
    const tryAt = (tx, tz, skip, pri) => {
      const ta = Math.atan2(tx - mx, tz - mz), d = Math.abs(angDiff(ta, a));
      if (d > S.HELP) return;
      if (!AR.clear(st.sol, mx, mz, tx, tz, skip)) return;
      if (!best || pri < best.pri || (pri === best.pri && d < best.d)) best = { a: ta, d, pri };
    };
    if (!(o.cloakT > 0)) tryAt(o.x, o.z, null, 0);
    if (aiming) for (const q of st.sol) if (q.beam === 'mirror') tryAt(q.x, q.z, q, 1);
    return best ? best.a : a;
  };
  // the path a shot from h along angle a would take now (the aiming line and the beam both use this)
  CO.path = function (st, h, a) {
    const [mx, mz] = CO.muzzle(h, a), [dx, dz] = dirOf(a);
    const heroes = st.heroes.map(e => ({ id: e.id, x: e.x, z: e.z, r: S.VEST, pass: e.safe > 0 ? 'safe' : dodging(e) ? 'dodge' : null }));
    return AR.trace(st.sol, mx, mz, dx, dz, { bounces: h.longN > 0 ? S.LONG_B : S.BOUNCES, heroes, skip: h.id, ring: st.ring });
  };
  const dodging = e => e.air >= S.DODGE0 && e.air <= S.DODGE1;
  CO.dodging = dodging;

  /* ---------- one hero, one tick ---------- */
  function heroStep(st, h, p, dt, ctl) {
    const o = st.heroes[1 - h.id];
    for (const k of ['rech', 'noFire', 'safe', 'land', 'stagger', 'cloakT', 'speedT', 'spinT']) if (h[k] > 0) h[k] = Math.max(0, h[k] - dt);
    if (h.shield > 0 && !h.gold) { h.shieldT -= dt; if (h.shieldT <= 0) { h.shield = 0; fx(st, 'shieldOff', { who: h.id }); } }
    const inp = ctl ? (p.input || {}) : {};
    // ---- moving ----
    const md = ctl && h.stagger <= 0 ? K3D.moveDir(p) : { x: 0, z: 0, s: 0 };
    const aiming = h.fire && (h.fire.st === 'aim' || h.fire.st === 'tell');
    let sp = S.RUN * (h.speedT > 0 ? S.SPEED_K : 1) * (aiming ? S.AIM_K : 1);
    if (h.air >= 0) {
      // in the air: carries on, a little steering
      h.vx += (md.x * sp * md.s - h.vx) * Math.min(1, dt * 3); h.vz += (md.z * sp * md.s - h.vz) * Math.min(1, dt * 3);
    } else if (h.land > 0) { h.vx *= 0.6; h.vz *= 0.6; }
    else {
      const tx = md.x * sp * md.s, tz = md.z * sp * md.s;
      h.vx += (tx - h.vx) * Math.min(1, dt * 22); h.vz += (tz - h.vz) * Math.min(1, dt * 22);
      if (md.s > 0.2 && !aiming && !(h.fire && h.fire.st === 'press')) h.face = Math.atan2(md.x, md.z);
    }
    // ---- jumping ----
    if (ctl && p.pendingJump && h.air < 0 && h.land <= 0 && h.stagger <= 0) {
      p.pendingJump = false;
      h.air = 0; h.y = 0;
      if (h.fire) h.fire = null; // a jump lets go of the aim or the tell (no shot)
      h.line = null;
      fx(st, 'jump', { who: h.id });
    } else if (p.pendingJump && h.air >= 0) p.pendingJump = false;
    if (h.air >= 0) {
      h.air += dt;
      const u = h.air / S.AIR;
      h.y = 4 * S.JH * u * (1 - u);
      if (h.air >= S.AIR) { h.air = -1; h.y = 0; h.land = S.LAND; fx(st, 'land', { who: h.id }); }
    }
    const nx = h.x + h.vx * dt, nz = h.z + h.vz * dt;
    const b = { x: nx, z: nz, r: S.R };
    AR.collide(st.sol, b, h.air < 0 || h.y < S.LOWH);
    if (h.air < 0) {
      // landed on a low wall's line? out to the nearer side (never stuck on top)
      for (let k = 0; k < 2; k++) AR.collide(st.sol, b, true);
    }
    const hx = st.ring ? st.ring.hx : AR.HX, hz = st.ring ? st.ring.hz : AR.HZ;
    AR.inside(b, hx, hz);
    h.x = b.x; h.z = b.z;
    // ---- buttons (step on: the linked mirror turns an eighth) ----
    let on = -1;
    if (h.air < 0) for (const q of st.layout) if (q.k === 'button' && Math.hypot(h.x - q.x, h.z - q.z) < S.BUTTON_R) on = q.i;
    if (on >= 0 && on !== h.onBtn) {
      const q = st.layout[on];
      st.turnN[q.mir] = (st.turnN[q.mir] || 0) + 1;
      fx(st, 'button', { who: h.id, i: on, mir: q.mir });
    }
    h.onBtn = on;
    // ---- pickups ----
    if (h.air < 0 || h.y < 0.3) for (const id in st.pads) {
      const pd = st.pads[id]; if (!pd || h.held) continue;
      const q = st.layout.find(x => x.k === 'pad' && x.id === id);
      if (q && Math.hypot(h.x - q.x, h.z - q.z) < S.PAD_R) take(st, h, pd.kind, id);
    }
    // ---- the blaster ----
    if (!ctl) { h.fire = null; h.line = null; return; }
    const held = !!inp.act, fresh = !!p.pendingAct;
    p.pendingAct = false;
    if (fresh && !h.fire && h.rech <= 0 && h.noFire <= 0 && st.firing) {
      if (h.air < 0 && h.land <= 0) h.fire = { st: 'press', t: 0, a: h.face };
      else h.want = 0.2; // pressed in the air: it starts on landing if still held
    }
    if (h.want > 0) {
      h.want -= dt;
      if (h.air < 0 && h.land <= 0 && !h.fire && h.rech <= 0 && h.noFire <= 0 && st.firing) { h.fire = { st: held ? 'press' : 'tellTap', t: 0, a: h.face }; h.want = 0; if (!held) h.fire.a = CO.help(st, h, h.face, false); }
    }
    const f = h.fire;
    if (f) {
      f.t += dt;
      if (f.st === 'press') {
        if (!held) {
          // a tap: the direction (with aim help) is set now; the tell runs from the press
          f.st = 'tellTap'; f.a = CO.help(st, h, f.a, false);
          fx(st, 'charge', { who: h.id });
        } else if (f.t >= S.HOLD) { f.st = 'aim'; f.base = f.a; fx(st, 'aimOn', { who: h.id }); }
      }
      if (f.st === 'aim') {
        f.a = CO.help(st, h, f.base, true);
        h.face = f.base;
        h.line = CO.path(st, h, f.a);
        if (!held) { f.st = 'tell'; f.t = 0; fx(st, 'charge', { who: h.id }); }
      } else if (f.st === 'tell') {
        h.line = CO.path(st, h, f.a);
        if (f.t >= S.TELL) shoot(st, h, f.a);
      } else if (f.st === 'tellTap') {
        h.line = null;
        h.face = f.a;
        if (f.t >= S.TELL) shoot(st, h, f.a);
      }
    } else h.line = null;
    void o;
  }

  /* ---------- a shot ---------- */
  function shoot(st, h, a) {
    h.fire = null; h.line = null; h.rech = S.RECHARGE; h.stat.shots++;
    if (h.cloakT > 0) { h.cloakT = 0; fx(st, 'cloakOff', { who: h.id }); }
    const angs = h.wide ? [a - S.WIDE_FAN, a, a + S.WIDE_FAN] : [a];
    const paths = angs.map(x => CO.path(st, h, x));
    const used = { wide: h.wide, long: h.longN > 0 };
    if (h.wide) h.wide = false;
    if (h.longN > 0) h.longN--;
    if (h.held && !h.wide && !(h.longN > 0) && (h.held === 'wide' || h.held === 'long')) h.held = null;
    st.pend.push({ h, paths, used });
  }
  // shots fired this tick are judged together (both tagged in the same instant: both points count)
  function judge(st) {
    const tagged = [];
    for (const s of st.pend) {
      const h = s.h, o = st.heroes[1 - h.id];
      let hit = null;
      for (const pth of s.paths) for (const x of pth.hits) if (x.id === o.id && (!hit || x.n > hit.n)) hit = x;
      // dodges: a beam that passed under the other hero in the middle of a jump
      if (!hit && s.paths.some(pth => pth.passes.some(x => x.id === o.id && x.why === 'dodge')) && st.t - o.lastDodge > 0.4) {
        o.stat.dodges++; o.lastDodge = st.t; fx(st, 'dodge', { who: o.id });
      }
      const bounces = Math.max(...s.paths.map(p => p.bounces));
      st.beams.push({ who: h.id, t: st.t, paths: s.paths, used: s.used, hit: !!hit, n: st.fxN + 1 });
      fx(st, 'fire', { who: h.id, bounces, wide: s.used.wide, long: s.used.long, prism: s.paths.some(p => p.segs.some(g => g.end === 'prism')) });
      if (hit) tagged.push({ h, o, n: hit.n, x: hit.x, z: hit.z });
    }
    st.pend.length = 0;
    if (st.beams.length > 12) st.beams.splice(0, st.beams.length - 12);
    for (const tg of tagged) tag(st, tg);
  }
  function tag(st, tg) {
    const { h, o } = tg;
    if (o.shield > 0) {
      o.shield = 0; o.gold = false; o.safe = 0.8;
      fx(st, 'shieldPop', { who: o.id, by: h.id, x: tg.x, z: tg.z });
      say(st, 'Shield!', PCOL[o.id]);
      return;
    }
    h.tags++; h.stat.tags++; h.run++; h.stat.best = Math.max(h.stat.best, h.run);
    o.run = 0;
    const bank = tg.n >= 1;
    if (bank) h.stat.bank++;
    o.safe = S.SAFE; o.noFire = S.NOFIRE; o.stagger = S.STAGGER; o.spinT = 0.9; o.fire = null; o.line = null; o.want = 0;
    if (o.cloakT > 0) { o.cloakT = 0; }
    st.lastTag = { by: h.id, n: tg.n, t: st.t, round: st.round };
    fx(st, 'tag', { who: h.id, on: o.id, bank, n: tg.n, x: tg.x, z: tg.z });
    say(st, bank ? (tg.n >= 2 ? 'BANK SHOT x' + tg.n + '!' : 'BANK SHOT!') : NAMES[h.id] + ' tags ' + NAMES[o.id] + '!', PCOL[h.id]);
  }

  /* ---------- pickups ---------- */
  CO.KINDS = { wide: 'Wide Beam', long: 'Long Bounce', cloak: 'Cloak', shield: 'Shield', speed: 'Speed' };
  function take(st, h, kind, id) {
    st.pads[id] = null;
    h.stat.pickups++;
    if (kind === 'wide') { h.wide = true; h.held = 'wide'; }
    else if (kind === 'long') { h.longN = S.LONG_N; h.held = 'long'; }
    else if (kind === 'cloak') { h.cloakT = S.CLOAK_T; h.held = 'cloak'; }
    else if (kind === 'shield') { h.shield = 1; h.shieldT = S.SHIELD_T; h.gold = false; h.held = 'shield'; }
    else if (kind === 'speed') { h.speedT = S.SPEED_T; h.held = 'speed'; }
    fx(st, 'pickup', { who: h.id, kind, pad: id });
  }
  function heldNow(h) {
    if (h.held === 'wide' && !h.wide) return null;
    if (h.held === 'long' && !(h.longN > 0)) return null;
    if (h.held === 'cloak' && !(h.cloakT > 0)) return null;
    if (h.held === 'shield' && !(h.shield > 0)) return null;
    if (h.held === 'speed' && !(h.speedT > 0)) return null;
    return h.held;
  }
  function padsStep(st) {
    const list = AR.PICKUPS[st.round] || [];
    while (st.pickN < list.length && st.rt >= list[st.pickN].t) {
      const e = list[st.pickN++];
      const ids = e.pad === 'c' ? ['c'] : [e.pad, e.pad + "'"];
      for (const id of ids) if (!st.pads[id]) { st.pads[id] = { kind: e.kind, t: st.t }; fx(st, 'appear', { pad: id, kind: e.kind }); }
    }
  }

  /* ---------- the arena's moving pieces ---------- */
  function piecesStep(st, dt) {
    const rt = (st.phase === 'live' || st.phase === 'gold' || st.phase === 'won') ? st.rt : -1;
    for (const q of st.layout) {
      if (q.k === 'riser') {
        const off = st.riserOff[q.i] || 0, was = st.risers[q.i] || { h: 0 };
        let r = AR.riserAt(q, rt - off);
        if (was.h === 0 && r.h > 0) {
          // it will not rise under feet: it waits (with its warning lights still running) until the footprint is clear
          const s = AR.box(q, q.x, q.z, q.w / 2, q.d / 2, q.rot, 'block', 'solid');
          if (st.heroes.some(e => AR.overlaps(s, { x: e.x, z: e.z, r: S.R }, 0.05))) { st.riserOff[q.i] = off + dt; r = { h: 0, warn: true, held: true }; }
          else fx(st, 'riserUp', { i: q.i });
        } else if (was.h === 1 && r.h < 1) fx(st, 'riserDown', { i: q.i });
        if (r.warn && !was.warn) fx(st, 'riserWarn', { i: q.i });
        st.risers[q.i] = r;
      } else if (q.k === 'turn') {
        const want = q.rot + (st.turnN[q.id] || 0) * Math.PI / 4, cur = st.turnAng[q.id];
        const stepA = (Math.PI / 4) / AR.TURN_T * dt;
        st.turnAng[q.id] = Math.abs(want - cur) <= stepA ? want : cur + Math.sign(want - cur) * stepA;
      }
    }
    if (st.round >= 5 && rt >= 0) st.spinA = rt * Math.PI * 2 / AR.SPIN_PER;
    // the start walls sink 1 s after ZAP
    st.startDown = rt < 0 ? (st.phase === 'between' ? st.startDown : 0) : clamp((rt - S.START_DOWN) / 0.4, 0, 1);
    // the ring of light walls (next tag wins)
    if (st.phase === 'gold') {
      const k = clamp((st.rt - S.ROUND_T) / (S.GOLD_T - 2), 0, 1), e = k * k * (3 - 2 * k);
      st.ring = { hx: AR.HX + (S.RING_MIN[0] - AR.HX) * e, hz: AR.HZ + (S.RING_MIN[1] - AR.HZ) * e, k: e };
    } else if (st.phase !== 'won') st.ring = null;
    st.sol = AR.solids(st);
  }

  /* ---------- the match ---------- */
  function placeHome(st) {
    for (const h of st.heroes) {
      const [x, z] = AR.BASE[h.id];
      Object.assign(h, { x, z, vx: 0, vz: 0, face: AR.BASE_FACE[h.id], air: -1, y: 0, land: 0, fire: null, line: null, rech: 0, noFire: 0,
        safe: 0, stagger: 0, cloakT: 0, speedT: 0, longN: 0, wide: false, held: null, tags: 0, run: 0, auto: null, want: 0, onBtn: -1 });
      if (!h.gold) { h.shield = 0; }
    }
  }
  function startCount(st) {
    st.phase = 'count'; st.phaseT = 0; st.rt = 0; st.count = 4; st.ring = null; st.firing = false;
    placeHome(st);
    // catch-up (gold, announced): two rounds behind -> a shield already on
    for (const h of st.heroes) {
      if (st.wins[1 - h.id] - st.wins[h.id] >= 2) { h.shield = 1; h.gold = true; h.shieldT = 99; h.held = 'shield'; say(st, 'Gold shield for ' + NAMES[h.id] + '!', C.gold); fx(st, 'gold', { who: h.id }); }
      else if (h.gold) { h.gold = false; h.shield = 0; }
    }
    fx(st, 'countStart', { round: st.round });
  }
  function roundWon(st, w, why) {
    st.roundWinner = w; st.phase = 'won'; st.phaseT = 0; st.firing = false;
    const lt = st.lastTag, h = st.heroes[w];
    st.wins[w]++;
    const line = lt && lt.by === w && lt.n >= 1 ? NAMES[w] + ' banked the last one off ' + (lt.n === 1 ? 'a mirror' : lt.n + ' mirrors')
      : why === 'time' ? NAMES[w] + ' was ahead at the buzzer' : why === 'gold' ? NAMES[w] + ' took the next-tag-wins' : NAMES[w] + ' tagged five';
    st.log.push({ round: st.round, w, why, line, tags: st.heroes.map(e => e.tags), secs: Math.round(st.rt * 10) / 10 });
    st.decider = line;
    const m = G.match;
    const final = st.wins[w] >= S.ROUNDS;
    if (m && !final) { m.wins[w]++; m.history.push({ round: m.round, winner: w, reason: line + '!', tiebreak: false, secs: Math.round(st.rt * 10) / 10 }); m.round++; }
    fx(st, 'roundWon', { who: w, final, round: st.round });
    say(st, final ? NAMES[w] + ' wins the match!' : NAMES[w] + ' wins round ' + st.roundNo + '!', PCOL[w]);
    if (final) st.winner = w;
    void h;
  }
  function roundTie(st) {
    // no tag in the whole of next-tag-wins: the round is played again (same layout)
    st.phase = 'won'; st.phaseT = 0; st.roundWinner = -1; st.firing = false;
    st.log.push({ round: st.round, w: -1, why: 'tie', line: 'No tag', tags: st.heroes.map(e => e.tags), secs: Math.round(st.rt * 10) / 10 });
    say(st, 'Nobody! Play it again!', '#f6efdf');
    fx(st, 'tie', {});
  }

  function step(st, dt) {
    st.t += dt; st.phaseT += dt;
    if (!st.pend) st.pend = [];
    const ph = st.phase, ps = G.players;
    const ctl = ph === 'live' || ph === 'gold' || ph === 'count';
    st.firing = ph === 'live' || ph === 'gold';
    if (ph === 'open') {
      // the vesting room: no control. Jump skips it after the first play.
      const skip = st.skipOK && st.phaseT > 0.6 && ps.some(p => p.input && (p.input.jump || p.input.act));
      if (st.phaseT >= S.OPEN_T || skip) { startCount(st); fx(st, 'enter', {}); }
    } else if (ph === 'count') {
      const n = 3 - Math.floor(st.phaseT / (S.COUNT_T / 3.4));
      if (n !== st.count) { st.count = n; fx(st, n >= 1 ? 'count' : 'zap', { n }); if (n === 0) say(st, 'ZAP!', C.gold); }
      if (st.phaseT >= S.COUNT_T) { st.phase = 'live'; st.phaseT = 0; st.rt = 0; st.firing = true; }
    } else if (ph === 'live' || ph === 'gold') {
      st.rt += dt;
    } else if (ph === 'won') {
      if (st.phaseT >= S.WON_T) {
        if (st.winner >= 0) { st.phase = 'final'; st.phaseT = 0; fx(st, 'trophy', { who: st.winner }); }
        else {
          // to the next round: rebuild in view while the heroes jog home
          if (st.roundWinner >= 0) { st.roundNo++; st.round = Math.min(5, st.round + 1); }
          st.phase = 'between'; st.phaseT = 0; st.nextLayout = AR.layout(st.round); st.rebuild = 0;
          for (const h of st.heroes) { h.fire = null; h.line = null; h.auto = AR.BASE[h.id].slice(); }
          st.pads = {};
          fx(st, 'rebuild', { round: st.round });
        }
      }
    } else if (ph === 'between') {
      st.rebuild = st.phaseT / S.BETWEEN_T;
      // the old layout sinks for the first 40%, the new one rises for the next 40%; the rules swap at the middle
      if (st.nextLayout && st.rebuild >= 0.45) { st.layout = st.nextLayout; st.nextLayout = null; resetPieces(st); st.startDown = 1; }
      if (st.phaseT >= S.BETWEEN_T) { startCount(st); }
    } else if (ph === 'final') {
      if (st.phaseT >= S.FINAL_T) { st.phase = 'done'; matchRoundEnd(st.winner, st.decider + '!'); }
    }
    piecesStep(st, dt);
    // the heroes
    for (const h of st.heroes) {
      const p = ps[h.id];
      if (st.phase === 'between' && h.auto) autoWalk(st, h, dt);
      else heroStep(st, h, p, dt, ctl && (st.phase !== 'count' || true));
      if (st.phase === 'count' && h.fire) h.fire = null;
    }
    // the two heroes bump softly and cannot push each other about: the one moving into the other is held back
    sep(st);
    padsStep(st);
    judge(st);
    // round end
    if (st.phase === 'live' || st.phase === 'gold') {
      const [a, b] = st.heroes;
      if (st.phase === 'gold') {
        if (a.tags !== b.tags) roundWon(st, a.tags > b.tags ? 0 : 1, 'gold');
        else if (st.rt >= S.MAX_T) roundTie(st);
      } else if (a.tags >= S.NEED || b.tags >= S.NEED) {
        if (a.tags === b.tags) { goGold(st); } else roundWon(st, a.tags > b.tags ? 0 : 1, 'five');
      } else if (st.rt >= S.ROUND_T) {
        if (a.tags === b.tags) goGold(st); else roundWon(st, a.tags > b.tags ? 0 : 1, 'time');
      }
    }
    for (const h of st.heroes) h.heldNow = heldNow(h);
    sounds(st);
    music(st);
  }
  // the sounds of this tick's events (rules-side, so they play the same with or without the 3D picture)
  const SND = { jump: 'arcadelaserJump', land: 'arcadelaserLand', charge: 'arcadelaserCharge', aimOn: 'arcadelaserAimOn', dodge: 'arcadelaserDodge',
    shieldPop: 'arcadelaserShieldPop', shieldOff: 'arcadelaserShieldPop', button: 'arcadelaserButton', riserWarn: 'arcadelaserRiserWarn', riserUp: 'arcadelaserRiserUp',
    riserDown: 'arcadelaserRiserDown', appear: 'arcadelaserPickupAppear', count: 'arcadelaserCountdown', zap: 'arcadelaserZapStart', rebuild: 'arcadelaserCrowdWave',
    tie: 'arcadelaserBuzzer', trophy: 'arcadelaserTrophy', enter: 'arcadelaserDoors', cloakOff: 'arcadelaserCloakOff' };
  function sounds(st) {
    if (st.sndN == null) st.sndN = 0;
    for (const e of st.fx) {
      if (e.n <= st.sndN) continue;
      st.sndN = e.n;
      if (e.k === 'fire') { Sfx.play(e.who ? 'arcadelaserBeamBo' : 'arcadelaserBeamPip'); if (e.bounces) Sfx.play('arcadelaserBounce', e.bounces); if (e.prism) Sfx.play('arcadelaserPrismSplit'); if (e.wide) Sfx.play('arcadelaserWideBeam'); if (e.long) Sfx.play('arcadelaserLongBounce'); }
      else if (e.k === 'tag') { Sfx.play('arcadelaserTag'); Sfx.play('arcadelaserVestOff'); if (e.bank) { Sfx.play('arcadelaserBankShot'); Sfx.play('arcadelaserCrowdCheer'); } else Sfx.play('arcadelaserCrowdGasp'); }
      else if (e.k === 'pickup') Sfx.play({ wide: 'arcadelaserPickupTake', long: 'arcadelaserPickupTake', cloak: 'arcadelaserCloakOn', shield: 'arcadelaserShieldOn', speed: 'arcadelaserSpeed' }[e.kind]);
      else if (e.k === 'gold') Sfx.play(e.who != null ? 'arcadelaserShieldOn' : 'arcadelaserNextTagWins');
      else if (e.k === 'roundWon') { Sfx.play('arcadelaserBuzzer'); Sfx.play(e.final ? 'arcadelaserMatchWon' : 'arcadelaserRoundWon'); Sfx.play('arcadelaserCrowdCheer'); }
      else if (SND[e.k]) Sfx.play(SND[e.k]);
    }
    // the vest back on, the blaster recharged
    for (const h of st.heroes) {
      if (h._safe > 0 && h.safe <= 0 && st.phase !== 'between') Sfx.play('arcadelaserVestOn');
      if (h._rech > 0 && h.rech <= 0) Sfx.play('arcadelaserRechargeDone');
      h._safe = h.safe; h._rech = h.rech;
    }
  }
  function goGold(st) {
    st.phase = 'gold'; st.phaseT = 0; if (st.rt < S.ROUND_T) st.rt = S.ROUND_T; // (both reached five at once: straight to the ring)
    say(st, 'NEXT TAG WINS!', C.gold); fx(st, 'gold', {});
  }
  function autoWalk(st, h, dt) {
    // jog home round the pieces (the arena is sinking and rising round them; nothing is solid to them meanwhile)
    const [tx, tz] = h.auto, dx = tx - h.x, dz = tz - h.z, d = Math.hypot(dx, dz);
    if (d < 0.08) { h.vx = h.vz = 0; h.face += angDiff(AR.BASE_FACE[h.id], h.face) * Math.min(1, dt * 6); return; }
    const v = Math.min(S.RUN * 0.8, d / Math.max(0.3, S.BETWEEN_T * 0.85 - st.phaseT) + 1);
    h.vx = dx / d * v; h.vz = dz / d * v;
    h.x += h.vx * Math.min(dt, d / v); h.z += h.vz * Math.min(dt, d / v);
    h.face = Math.atan2(dx, dz);
    for (const k of ['safe', 'noFire', 'stagger', 'spinT']) h[k] = 0;
  }
  function sep(st) {
    const [a, b] = st.heroes, dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz), m = S.R * 2;
    if (d >= m || st.phase === 'between') return;
    const ux = d > 1e-6 ? dx / d : 1, uz = d > 1e-6 ? dz / d : 0, over = m - d;
    // weight by who is moving into whom
    const va = Math.max(0, a.vx * ux + a.vz * uz), vb = Math.max(0, -(b.vx * ux + b.vz * uz));
    const ka = va + vb > 0.01 ? va / (va + vb) : 0.5;
    const pa = { x: a.x - ux * over * ka, z: a.z - uz * over * ka, r: S.R }, pb = { x: b.x + ux * over * (1 - ka), z: b.z + uz * over * (1 - ka), r: S.R };
    AR.collide(st.sol, pa, a.air < 0); AR.collide(st.sol, pb, b.air < 0);
    const hx = st.ring ? st.ring.hx : AR.HX, hz = st.ring ? st.ring.hz : AR.HZ;
    AR.inside(pa, hx, hz); AR.inside(pb, hx, hz);
    a.x = pa.x; a.z = pa.z; b.x = pb.x; b.z = pb.z;
  }

  // the music: one more layer each round, stripped back for Blackout, gold for next tag wins
  function music(st) {
    const song = st.phase === 'gold' ? 'arcadelaserGold' : ['arcadelaser', 'arcadelaser', 'arcadelaser2', 'arcadelaser3', 'arcadelaserDark', 'arcadelaserFull'][st.round];
    if (song !== st.song) { st.song = song; if (typeof Music !== 'undefined' && Music.cue) Music.cue({ song }); }
  }
  CO.fresh = fresh; CO.step = step; CO.heldNow = heldNow; CO.resetPieces = resetPieces; CO.startCount = startCount; CO.music = music;
  return CO;
})();

/* ---------- MODES.arcadelaser ---------- */
MODES.arcadelaser = {
  scene3dOpts: { bg: '#06050a', fov: 38, near: 0.2, far: 600 },
  setup(st) { ARCADELASER.fresh(st); for (const p of G.players) p.alive = true; K3D.heading = 0; },
  resetRound() {},
  idle(dt) { ARCADELASER.step(G.mst, dt); },
  go() {},
  step(dt) { ARCADELASER.step(G.mst, dt); },
  hud() { ARCADELASER_HUD.hud(G.mst); },
  scene3d(K) { if (typeof ARCADELASER_SHOW !== 'undefined') ARCADELASER_SHOW.build(K, G.mst); },
  draw3d(K, dt) { if (typeof ARCADELASER_SHOW !== 'undefined') ARCADELASER_SHOW.update(K, G.mst, dt); },
  drawTop() { if (typeof ARCADELASER_SHOW !== 'undefined') ARCADELASER_SHOW.drawTop(G.mst); ARCADELASER_HUD.top(G.mst); },
  resultTitle() { const st = G.mst; return st.winner >= 0 ? NAMES[st.winner] + ' wins Laser Tag!' : 'Laser Tag Arena'; },
  stats() {
    const st = G.mst, hs = st.heroes;
    const out = [
      { label: 'Tags', values: hs.map(h => String(h.stat.tags)) },
      { label: 'Bank shots', values: hs.map(h => String(h.stat.bank)) },
      { label: 'Dodges', values: hs.map(h => String(h.stat.dodges)) },
      { label: 'Pickups', values: hs.map(h => String(h.stat.pickups)) },
      { label: 'Best run', values: hs.map(h => String(h.stat.best)) },
    ];
    if (st.decider) out.push('The deciding round: ' + st.decider + '.');
    return out;
  },
};

/* ---------- the flat HUD: each player's corner (tag lamps, rounds, recharge, held pickup) and the big words ----------
   The scoreboard itself hangs in the hall (3D). Nothing in the top-right 50 px (the Menu button). */
const ARCADELASER_HUD = (function () {
  const H2 = {}, S = ARCADELASER.S;
  H2.icon = function (kind, x, y, s = 1, col = '#fff') {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.lineWidth = 2; ctx.strokeStyle = col; ctx.fillStyle = col;
    if (kind === 'wide') { for (const a of [-0.45, 0, 0.45]) { ctx.beginPath(); ctx.moveTo(-8, 4); ctx.lineTo(-8 + Math.cos(a - Math.PI / 2 + Math.PI / 2) * 0 + 16 * Math.sin(a + 0.0001) * 0.6 + 8, 4 - 16 * Math.cos(a)); ctx.stroke(); } }
    else if (kind === 'long') { ctx.beginPath(); ctx.moveTo(-9, 7); ctx.lineTo(-3, -6); ctx.lineTo(3, 6); ctx.lineTo(9, -7); ctx.stroke(); }
    else if (kind === 'cloak') { ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.arc(0, 0, 8, 0, 7); ctx.stroke(); ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.arc(0, 0, 4, 0, 7); ctx.fill(); }
    else if (kind === 'shield') { ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(8, -5); ctx.quadraticCurveTo(7, 6, 0, 10); ctx.quadraticCurveTo(-7, 6, -8, -5); ctx.closePath(); ctx.stroke(); }
    else if (kind === 'speed') { ctx.beginPath(); ctx.moveTo(2, -10); ctx.lineTo(-5, 1); ctx.lineTo(0, 1); ctx.lineTo(-2, 10); ctx.lineTo(6, -2); ctx.lineTo(1, -2); ctx.closePath(); ctx.fill(); }
    ctx.restore();
  };
  H2.pickCol = { wide: '#ff5ad6', long: '#5aff8a', cloak: '#c8d0ff', shield: '#4ae8ff', speed: '#ffe24a' };
  H2.hud = function (st) {
    if (!st.heroes) return;
    for (const k of [0, 1]) {
      const h = st.heroes[k], left = k === 0, w = 196, y = left ? 46 : 58;
      const x0 = left ? 14 : W - 14 - w;
      ctx.fillStyle = 'rgba(23,25,29,0.74)'; rr(x0, y, w, 46, 14); ctx.fill();
      ctx.strokeStyle = PCOL[k]; ctx.lineWidth = 2; rr(x0, y, w, 46, 14); ctx.stroke();
      // the name, the round stars
      text(NAMES[k], left ? x0 + 12 : x0 + w - 12, y + 13, 13, PCOL[k], left ? 'left' : 'right');
      for (let i = 0; i < S.ROUNDS; i++) {
        const sx = left ? x0 + w - 14 - i * 15 : x0 + 14 + i * 15;
        star(sx, y + 13, 6, i < st.wins[k] ? C.gold : 'rgba(255,255,255,0.18)');
      }
      // five tag lamps
      for (let i = 0; i < S.NEED; i++) {
        const lx = left ? x0 + 18 + i * 22 : x0 + w - 18 - i * 22, on = i < h.tags;
        ctx.fillStyle = on ? PCOL[k] : 'rgba(255,255,255,0.12)'; circle(lx, y + 32, 7); ctx.fill();
        if (on) { ctx.fillStyle = 'rgba(255,255,255,0.55)'; circle(lx - 2, y + 30, 2.2); ctx.fill(); }
      }
      // the blaster's charge (the lights along its barrel)
      const bx = left ? x0 + 128 : x0 + w - 128 - 56, ch = h.noFire > 0 ? 0 : 1 - h.rech / S.RECHARGE;
      for (let i = 0; i < 4; i++) { ctx.fillStyle = (i + 1) / 4 <= ch + 1e-6 ? '#f6efdf' : 'rgba(255,255,255,0.15)'; rr(bx + i * 14, y + 28, 10, 8, 3); ctx.fill(); }
      // the held pickup
      const hn = h.heldNow;
      if (hn) {
        const px = left ? x0 + w + 22 : x0 - 22;
        ctx.fillStyle = 'rgba(23,25,29,0.74)'; circle(px, y + 23, 17); ctx.fill(); ctx.strokeStyle = H2.pickCol[hn]; ctx.lineWidth = 2; circle(px, y + 23, 17); ctx.stroke();
        H2.icon(hn, px, y + 23, 0.95, H2.pickCol[hn]);
        if (hn === 'long') text('x' + h.longN, px + 14, y + 38, 11, '#fff', 'center');
      }
    }
  };
  function star(x, y, r, col) {
    ctx.fillStyle = col; ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr2 = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); }
    ctx.closePath(); ctx.fill();
  }
  // the big words over the picture: the count, ZAP!, round won, next tag wins, bank shot
  H2.top = function (st) {
    if (!st.heroes) return;
    const ph = st.phase;
    if (ph === 'count' && st.count >= 1) bigWord(String(st.count), '#fff6dc', st.phaseT % (S.COUNT_T / 3.4) / (S.COUNT_T / 3.4));
    const recent = st.says.length ? st.says[st.says.length - 1] : null;
    if (recent && st.t - recent.t < 1.6) {
      const a = st.t - recent.t, k = Math.min(1, a / 0.15), fade = a > 1.2 ? 1 - (a - 1.2) / 0.4 : 1;
      ctx.save(); ctx.globalAlpha = Math.max(0, fade);
      const big = /ZAP|BANK|NEXT|wins/.test(recent.text);
      ctx.translate(W / 2, H * 0.3); ctx.scale(0.7 + 0.3 * k, 0.7 + 0.3 * k);
      ctx.lineWidth = 7; ctx.strokeStyle = 'rgba(10,8,14,0.85)'; ctx.font = `900 ${big ? 46 : 30}px "Atkinson Hyperlegible", system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.strokeText(recent.text, 0, 0); ctx.fillStyle = recent.col || '#fff'; ctx.fillText(recent.text, 0, 0);
      ctx.restore();
    }
    if (ph === 'open' && st.skipOK && st.phaseT > 0.6) text('Jump to skip', W / 2, H - 26, 14, 'rgba(246,239,223,0.8)', 'center');
    if (ph === 'between') text('Round ' + st.roundNo + ': ' + ARCADELASER_ARENA.ROUND_NAMES[st.round], W / 2, H * 0.42, 30, '#fff6dc', 'center');
  };
  function bigWord(s, col, k) {
    ctx.save(); ctx.translate(W / 2, H * 0.36); const sc = 1.3 - 0.3 * Math.min(1, k * 3); ctx.scale(sc, sc);
    ctx.font = '900 72px "Atkinson Hyperlegible", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 9; ctx.strokeStyle = 'rgba(10,8,14,0.85)'; ctx.strokeText(s, 0, 0); ctx.fillStyle = col; ctx.fillText(s, 0, 0);
    ctx.restore();
  }
  return H2;
})();

/* ---------- the 2D 'arcadelaser' outfit (previews, world page, title run): the 3D one is arcadelaser-outfits.js ----------
   Pip: a padded black and yellow tag vest with orange light panels, a yellow sweatband (the sprout above it), green glow
   paint on the cheeks, yellow knee pads. Bo: a padded white and teal vest with blue light panels, a teal cap worn
   backwards between the ears, white glow dots under the eyes, purple elbow pads. (Pip no blue, Bo no orange or red.) */
defineOutfitPart('alVestPip', { layer: 'body', draw(c) {
  const g = c.g, ink = OF_INK;
  g.beginPath(); g.moveTo(-11, -14); g.quadraticCurveTo(0, -11, 11, -14); g.lineTo(11, -3); g.quadraticCurveTo(0, -1, -11, -3); g.closePath(); ofFillStroke(g, '#1e1a22', ink, 1.2);
  g.fillStyle = '#f2c83a'; g.fillRect(-11, -9.5, 22, 1.6); g.fillRect(-11, -5.8, 22, 1.2);
  g.fillStyle = '#ff9a3a'; g.beginPath(); g.ellipse(0, -9, 3.6, 2.6, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(255,230,180,0.85)'; g.beginPath(); g.ellipse(-0.8, -9.6, 1.4, 0.9, 0, 0, Math.PI * 2); g.fill();
  for (const s of [-1, 1]) { g.fillStyle = '#ff9a3a'; g.beginPath(); g.ellipse(s * 8.6, -13, 2.4, 1.6, 0, 0, Math.PI * 2); g.fill(); }
} });
defineOutfitPart('alBandPip', { layer: 'head', lift: 2, draw(c) {
  const g = c.g, ink = OF_INK;
  g.beginPath(); g.moveTo(-11.2, -24.5); g.quadraticCurveTo(0, -26.5, 11.2, -24.5); g.lineTo(11.2, -21.6); g.quadraticCurveTo(0, -23.6, -11.2, -21.6); g.closePath(); ofFillStroke(g, '#f2c83a', ink, 1);
  g.fillStyle = '#3ad86a'; for (const s of [-1, 1]) { g.fillRect(s * 7 - 2.5, -12.8, 5, 1.1); g.fillRect(s * 7 - 2.5, -10.9, 5, 1.1); }
  g.fillStyle = '#f2c83a'; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * 5, -1.4, 2.6, 1.4, 0, 0, Math.PI * 2); g.fill(); }
} });
defineOutfitPart('alVestBo', { layer: 'body', draw(c) {
  const g = c.g, ink = OF_INK;
  g.beginPath(); g.moveTo(-11, -14); g.quadraticCurveTo(0, -11, 11, -14); g.lineTo(11, -3); g.quadraticCurveTo(0, -1, -11, -3); g.closePath(); ofFillStroke(g, '#f2f4f2', ink, 1.2);
  g.fillStyle = '#1aa89a'; g.fillRect(-11, -9.5, 22, 1.6); g.fillRect(-11, -5.8, 22, 1.2);
  g.fillStyle = '#4aa8ff'; g.beginPath(); g.ellipse(0, -9, 3.6, 2.6, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(220,240,255,0.9)'; g.beginPath(); g.ellipse(-0.8, -9.6, 1.4, 0.9, 0, 0, Math.PI * 2); g.fill();
  for (const s of [-1, 1]) { g.fillStyle = '#4aa8ff'; g.beginPath(); g.ellipse(s * 8.6, -13, 2.4, 1.6, 0, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = '#8a5ad8'; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * 11.4, -8, 1.6, 2.2, 0, 0, Math.PI * 2); g.fill(); }
} });
defineOutfitPart('alCapBo', { layer: 'head', earsOver: true, draw(c) {
  const g = c.g, ink = OF_INK, f = c.face || 1;
  g.beginPath(); g.moveTo(-9.5, -22); g.bezierCurveTo(-9.5, -30, 9.5, -30, 9.5, -22); g.closePath(); ofFillStroke(g, '#1aa89a', ink, 1.1);
  // the peak, worn backwards
  g.beginPath(); g.moveTo(-f * 6, -22.5); g.quadraticCurveTo(-f * 14, -23, -f * 14.5, -21); g.lineTo(-f * 6, -21); g.closePath(); ofFillStroke(g, '#138a7e', ink, 1);
  g.fillStyle = '#ffffff'; for (const s of [-1, 1]) for (const k of [0, 1]) { g.beginPath(); g.arc(s * (5 + k * 2.4), -12.4 + k * 0.4, 0.8, 0, Math.PI * 2); g.fill(); }
} });
defineOutfit('arcadelaser', { pip: [['alVestPip', {}], ['alBandPip', {}]], bo: [['alVestBo', {}], ['alCapBo', {}]] });

/* ---------- the level ---------- */
ARCADELASER.def = {
  name: 'Laser Tag Arena', world: 42, kind: 'versus', mode: 'arcadelaser', outfit: 'arcadelaser', music: 'arcadelaser', amb: 'arcadelaser',
  view3d: true, touch: 'stick', ownStep: true, ownHUD: true, ownMatchHUD: true, noFalls: true,
  match: { bestOf: 5, roundTime: 0 },
  legend: {
    pip: '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> run <kbd>Space</kbd> jump',
    bo: '<kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd> run <kbd>Shift</kbd> jump',
  },
  tip: 'Tag the other vest five times. Beams bounce off mirrors.',
  howTo: ['Hold fire to see where your beam will go.', 'Jump to let a beam pass under you.', 'Low walls stop beams. Mirrors bounce them.'],
  act: { label: 'fire', labels: ['fire', 'fire'] },
  map: Array.from({ length: 18 }, () => '.'.repeat(32)),
  sortLast: true,
};
ARCADELASER.def.map[16] = '.'.repeat(10) + '1' + '.'.repeat(10) + '2' + '.'.repeat(10);
LEVELS.push(ARCADELASER.def);

// the 3D-only files: the arcade kit (43-1's), the outfits and blasters, the hall, the arena pieces, the beams, the show
K3D.files.push('js/levels/world43/arcade-kit.js', 'js/levels/world43/arcadelaser-outfits.js', 'js/levels/world43/arcadelaser-paint.js',
  'js/levels/world43/arcadelaser-hall.js',
  'js/levels/world43/arcadelaser-pieces.js', 'js/levels/world43/arcadelaser-fx.js', 'js/levels/world43/arcadelaser-show.js');

/* ---------- sounds (toy blasters, a black-light hall, a crowd behind glass); names in plain words for the textures ---------- */
(function () {
  const X = Sfx.extra;
  X.arcadelaserStep = function () { this.noise(0.04, { type: 'lowpass', f: 700, vol: 0.02 }); };
  X.arcadelaserJump = function () { this.tone(330, 0.12, 'triangle', 0.03, 620); this.noise(0.06, { type: 'highpass', f: 2000, vol: 0.01 }); };
  X.arcadelaserLand = function () { this.tone(150, 0.08, 'sine', 0.04, 90); this.noise(0.06, { type: 'lowpass', f: 600, vol: 0.03 }); };
  X.arcadelaserCharge = function () { this.tone(500, 0.25, 'sawtooth', 0.012, 1400); this.tone(1000, 0.25, 'sine', 0.012, 2600); };
  X.arcadelaserAimOn = function () { this.tone(1760, 0.06, 'triangle', 0.015); this.tone(2349, 0.08, 'triangle', 0.01, null, 0.05); };
  // the two blasters a third apart in pitch: Pip's lower, Bo's higher
  X.arcadelaserBeamPip = function () { this.tone(1046, 0.22, 'square', 0.025, 330); this.tone(523, 0.18, 'sawtooth', 0.02, 180); this.noise(0.1, { type: 'bandpass', f: 3000, q: 2, vol: 0.02 }); };
  X.arcadelaserBeamBo = function () { this.tone(1318, 0.22, 'square', 0.025, 415); this.tone(659, 0.18, 'sawtooth', 0.02, 220); this.noise(0.1, { type: 'bandpass', f: 3400, q: 2, vol: 0.02 }); };
  X.arcadelaserBounce = function (_, n) { for (let k = 0; k < Math.min(6, n || 1); k++) this.tone(1568 * Math.pow(1.122, k), 0.07, 'triangle', 0.02, null, 0.03 + k * 0.05); };
  X.arcadelaserBeamOnWall = function () { this.noise(0.12, { type: 'bandpass', f: 2400, to: 900, q: 3, vol: 0.02 }); };
  X.arcadelaserTag = function () { [1568, 1175, 784].forEach((f, k) => this.tone(f, 0.12, 'square', 0.03, null, k * 0.05)); this.noise(0.2, { type: 'highpass', f: 3500, vol: 0.03 }); };
  X.arcadelaserVestOff = function () { this.tone(880, 0.6, 'sine', 0.035, 110, 0.12); this.tone(440, 0.55, 'triangle', 0.02, 70, 0.14); };
  X.arcadelaserVestOn = function () { this.tone(330, 0.2, 'sine', 0.025, 990); this.tone(990, 0.08, 'triangle', 0.015, null, 0.2); };
  X.arcadelaserBankShot = function () { [784, 988, 1175, 1568].forEach((f, k) => { this.tone(f, 0.14, 'square', 0.022, null, 0.1 + k * 0.07); this.tone(f * 2, 0.1, 'triangle', 0.01, null, 0.1 + k * 0.07); }); };
  X.arcadelaserDodge = function () { this.noise(0.3, { type: 'bandpass', f: 800, to: 2400, q: 1.2, vol: 0.04, a: 0.05 }); };
  X.arcadelaserRechargeDone = function () { this.tone(2093, 0.05, 'triangle', 0.012); };
  X.arcadelaserRiserWarn = function () { for (let k = 0; k < 3; k++) this.tone(740, 0.08, 'square', 0.012, null, k * 0.3); };
  X.arcadelaserRiserUp = function () { this.tone(80, 0.45, 'sawtooth', 0.03, 160); this.noise(0.4, { type: 'lowpass', f: 900, vol: 0.03 }); };
  X.arcadelaserRiserDown = function () { this.tone(160, 0.45, 'sawtooth', 0.03, 70); this.noise(0.4, { type: 'lowpass', f: 700, vol: 0.03 }); };
  X.arcadelaserButton = function () { this.tone(1200, 0.05, 'square', 0.02); this.tone(600, 0.05, 'square', 0.015, null, 0.05); this.tone(220, 0.25, 'sawtooth', 0.012, 330, 0.08); };
  X.arcadelaserMirrorTurn = function () { this.noise(0.25, { type: 'bandpass', f: 1500, q: 4, vol: 0.02 }); };
  X.arcadelaserPrismSplit = function () { [2093, 2637, 3136].forEach((f, k) => this.tone(f, 0.25, 'sine', 0.015, f * 0.9, k * 0.02)); };
  X.arcadelaserPickupAppear = function () { [1046, 1318, 1568, 2093].forEach((f, k) => this.tone(f, 0.1, 'triangle', 0.018, null, k * 0.06)); };
  X.arcadelaserPickupTake = function () { [784, 1175, 1568].forEach((f, k) => this.tone(f, 0.1, 'square', 0.02, null, k * 0.05)); };
  X.arcadelaserWideBeam = function () { this.tone(700, 0.3, 'sawtooth', 0.015, 300); this.tone(1050, 0.3, 'sawtooth', 0.012, 450); };
  X.arcadelaserLongBounce = function () { this.tone(2400, 0.4, 'sine', 0.012, 3600); };
  X.arcadelaserCloakOn = function () { this.noise(0.6, { type: 'bandpass', f: 3000, to: 600, q: 1, vol: 0.03, a: 0.1 }); this.tone(1200, 0.5, 'sine', 0.01, 300); };
  X.arcadelaserCloakOff = function () { this.noise(0.4, { type: 'bandpass', f: 600, to: 3000, q: 1, vol: 0.03 }); };
  X.arcadelaserShieldOn = function () { this.tone(440, 0.5, 'sine', 0.03, 880); this.tone(660, 0.5, 'triangle', 0.015, 1320); };
  X.arcadelaserShieldPop = function () { this.noise(0.25, { type: 'highpass', f: 2500, vol: 0.05 }); this.tone(1200, 0.2, 'triangle', 0.025, 300); };
  X.arcadelaserSpeed = function () { this.noise(0.5, { type: 'bandpass', f: 500, to: 3000, q: 0.8, vol: 0.04 }); this.tone(400, 0.4, 'square', 0.012, 1600); };
  X.arcadelaserCountdown = function () { this.tone(660, 0.18, 'square', 0.03); this.tone(330, 0.18, 'triangle', 0.02); };
  X.arcadelaserZapStart = function () { this.tone(1320, 0.4, 'square', 0.035, 1760); this.tone(660, 0.4, 'sawtooth', 0.02, 880); this.noise(0.3, { type: 'highpass', f: 2000, vol: 0.03 }); };
  X.arcadelaserBuzzer = function () { this.tone(110, 0.7, 'sawtooth', 0.05); this.tone(116, 0.7, 'square', 0.03); };
  X.arcadelaserNextTagWins = function () { [523, 659, 784, 1046, 1318].forEach((f, k) => this.tone(f, 0.3, 'triangle', 0.025, null, k * 0.08)); this.noise(1.2, { type: 'highpass', f: 5000, vol: 0.015, a: 0.3 }); };
  X.arcadelaserWallClosing = function () { this.tone(55, 1.2, 'sawtooth', 0.02, 70); };
  X.arcadelaserRoundWon = function () { [523, 659, 784, 1046].forEach((f, k) => { this.tone(f, 0.22, 'square', 0.03, null, 0.6 + k * 0.1); }); };
  X.arcadelaserMatchWon = function () { [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, k) => this.tone(f, 0.3, 'square', 0.03, null, 0.6 + k * 0.12)); };
  X.arcadelaserTrophy = function () { [1568, 2093, 2637].forEach((f, k) => this.tone(f, 0.4, 'sine', 0.02, null, k * 0.15)); };
  X.arcadelaserCrowdCheer = function () { this.noise(1.4, { type: 'bandpass', f: 1200, q: 0.6, vol: 0.05, a: 0.15 }); this.noise(1.0, { type: 'bandpass', f: 2600, q: 1, vol: 0.02, a: 0.1, delay: 0.1 }); };
  X.arcadelaserCrowdGasp = function () { this.noise(0.6, { type: 'bandpass', f: 900, to: 1500, q: 1, vol: 0.03, a: 0.08 }); };
  X.arcadelaserCrowdWave = function () { this.noise(2.2, { type: 'bandpass', f: 700, to: 1600, q: 0.7, vol: 0.035, a: 0.6 }); };
  X.arcadelaserDoors = function () { this.noise(1.2, { type: 'lowpass', f: 600, to: 200, vol: 0.05, a: 0.1 }); this.tone(90, 1, 'sawtooth', 0.015, 70); };
  X.arcadelaserSadVest = function () { [523, 494, 466, 440].forEach((f, k) => this.tone(f, 0.3, 'triangle', 0.02, null, k * 0.28)); };
})();
