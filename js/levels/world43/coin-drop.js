/* Pip & Bo - Level 43-1 Coin Drop (team, World 43 Arcade Cabinet, 3D). */
'use strict';

/* ===== 43-1 Coin Drop (mode 'arcadecoin', team, view3d, one continuous ride) =====
   Late at night in a closed arcade one old machine still glows in the corner: PLAY ME. Pip and Bo each drop in a coin,
   the screen flashes, they shrink, and they are sucked through the slot after their coins. They land standing on them
   (each coin now as big as a raft, lying flat) and both coins shoot off down the coin chute into the machine: through
   the Gear Works, across Circuit City and out into the Coin Box, to land on the giant START button.

   EACH PLAYER RIDES THEIR OWN COIN, with the same two controls (Gavyn, 2026-11-20: "give each player a coin and they
   just steer and jump on their own"). Pip's coin has a sprout stamped on it and an orange shine, Bo's an ear stamp and a
   blue shine. The track carries both coins forward at its own speed (ARCADECOIN_ROUTE: the rail's v), so nothing can
   lock. Both coins are always at the same place along the chute (st.s); each has its own place across it (c.x).
     STEER   ◀ ▶ slide your coin across the chute (quick, a little drift). The walls are soft: a coin grinds along them
             with sparks and loses nothing.
     JUMP    your coin hops for S.AIR s (it flips once and rings when it lands): over wires, low levers, bugs, small gaps.
   The coins bump softly off each other like pucks (a bumped coin gets S.BUMP_SAFE s in which the chute-edge hazards do
   not count) and can only pass each other in the air.
   THE SPARK LINK between the coins (white-gold): COLLECTS small coins, tickets and stars it passes through (a coin
   touching one takes it too); a whole row taken is a SWEEP. ZAPS glitch bugs, and opens gates when it touches the post
   on each side. STRETCHES past two thirds of the chute's width (thin, flickering); held too far for S.SNAP_HOLD s, or
   with a pillar between the coins, it SNAPS and takes S.REJOIN s to rejoin once the coins are close again (a snap is
   never a wipe-out; while snapped nothing is swept or zapped).
   TRACK PIECES THAT NEED BOTH: split chutes (a button on one side, ridden over, opens the gate on the other side, then
   the other way round); twin springboards (fire both coins over a big gap only when both are on the pad; the first
   coin waits on the pad, up to S.HOLD s, while a ring fills; one alone is a small hop that falls short).
   WIPE-OUTS: a hazard or a gap. The hero comes back S.OUT s later in a pixel bubble a little ahead with their coin
   gliding under it; the partner pops it by steering into it (it pops itself after S.BUBBLE s). Both down at once:
   back to the last checkpoint ring. Three restarts at the same ring: GOLD HELP for that section (announced): the
   moving hazards slow by a quarter, the Sweeper's brush misses, gates and split gates open for you, springboards are as wide as the chute, and a
   gold guide line shows a safe way.
   THE SWEEPER, the machine's cleaning robot, wakes late in the gear works and chases through Circuit City: its brush
   slams down across part of the chute (a lit strip 1.2 s before). It is lost at the wide springboard between boards.
   Only the opening (no control, jump skips it after the first play) and the START finish are not played. One room in
   the game's sense; the four stretches are places along the chute (never cards).
   State lives in G.mst; the rules never read the renderer (K3D.noRender plays the same). Names are prefixed arcadecoin. */

const ARCADECOIN = (function () {
  const PR = ARCADECOIN_ROUTE, R = PR.R, L = PR.lists;
  const S = {
    R: 1.1, VX: 8.2, RESP: 12, SLICK_RESP: 2.0, AIR_STEER: 0.8,
    AIR: 0.8, HOP_H: 1.25, HOP_SMALL: 0.45, FALL_LAND: 0.5,
    BUMP_SAFE: 0.4, OUT: 1.5, BUBBLE: 6, BUBBLE_OFF: 5, POP_R: 1.9, SAFE: 1.5, RESTART_SAFE: 2.0,
    STRETCH: 2 / 3, SNAP_HOLD: 1.0, REJOIN: 2.5,
    HOLD: 3.0, FLY_V: 12.5, PICK_R: 0.42, GATE_ZONE: 9, GOLD_N: 3, GOLD_SLOW: 0.75,
    INTRO_T: 12.5, RESTART_T: 1.7, START_T: 6.0, DIV: 0.3,
  };
  const CO = { S, PR, L };
  const VAL = { coin: 1, ticket: 3, star: 5 };
  CO.VAL = VAL;
  CO.maxCoins = L.pickups.reduce((n, p) => n + VAL[p.kind], 0);
  CO.partNames = L.parts.map(p => p.name);
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const sm = u => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));

  /* ---------- what each rider presses ---------- */
  const steerOf = p => { const i = p.input || {}; let s = (i.right ? 1 : 0) - (i.left ? 1 : 0); if (!s && Math.abs(i.ax || 0) > 0.2) s = clamp(i.ax, -1, 1); return s; };
  CO.steerOf = steerOf;
  CO.anyPress = p => { const i = p.input || {}; return !!(i.left || i.right || i.jump || i.act || i.up || i.down || Math.abs(i.ax || 0) > 0.3); };

  /* ---------- the jump windows (cue cards, the brain, the timeline tool) ----------
     A coin counts as in the air (over a wire, a lever, a bug) while its hop is above 0.3 (from 0.05 s after the press to
     0.75 s), and must not be on the floor while its middle is over a gap. jumpWin gives the ride clock's [first, last]
     moment to press for a thing at s (wire, lever, bug: kind 'low'; a gap from s0 to s1: kind 'gap'). */
  CO.jumpWin = (kind, a, b) => {
    if (kind === 'gap') return [PR.tAt(b) - S.AIR + 0.02, PR.tAt(a) - 0.02];
    const half = S.R * 0.85;
    return [PR.tAt(a + half) - 0.75, PR.tAt(a - half) - 0.05];
  };
  // every cue in riding order: { s, t (the ride clock of the moment), kind, text, t0, t1 (a jump's window) }
  CO.cueList = (() => {
    const out = [];
    for (const w of L.wires) { const [t0, t1] = CO.jumpWin('low', w.s); out.push({ s: w.s, kind: 'jump', text: 'JUMP!', t0, t1, t: t0 + 0.1 }); }
    for (const lv of L.levers) { const [t0, t1] = CO.jumpWin('low', lv.s); out.push({ s: lv.s, kind: 'jump', text: 'JUMP THE LEVER!', t0, t1, t: t0 + 0.1, soft: true }); }
    for (const g of L.gaps) { if (L.springs.some(sp => Math.abs(sp.sh - g.s0) < 0.5)) continue; const [t0, t1] = CO.jumpWin('gap', g.s0, g.s1); out.push({ s: g.s0, kind: 'jump', text: 'JUMP!', t0, t1, t: t0 + 0.1 }); }
    for (const sp of L.splits) out.push({ s: sp.s0, kind: 'split', text: 'SPLIT!', t: PR.tAt(sp.s0) });
    for (const sp of L.springs) out.push({ s: sp.s0, kind: 'together', text: 'TOGETHER!', t: PR.tAt(sp.s0) });
    for (const r of L.rows) if (r.x1 - r.x0 > 6) out.push({ s: r.s, kind: 'spread', text: 'SPREAD!', t: PR.tAt(r.s) - 0.6 });
    for (const g of L.gates) out.push({ s: g.s, kind: 'gate', text: 'SPREAD! A COIN AT EACH POST', t: PR.tAt(g.s - S.GATE_ZONE + 2) });
    for (const q of L.squeeze) out.push({ s: q.s0, kind: 'squeeze', text: 'SQUEEZE!', t: PR.tAt(q.s0) });
    { let last = -99; for (const b of L.bugs) { if (b.s - last > 30) out.push({ s: b.s, kind: 'zap', text: 'ZAP THE BUG!', t: PR.tAt(b.s - 1.5) }); last = b.s; } }
    { let last = -99; for (const tt of L.teeth) { if (tt.s - last > 30) out.push({ s: tt.s, kind: 'steer', text: tt.roll ? 'DODGE THE COINS!' : 'STEER TO THE GAP!', t: PR.tAt(tt.s) - 0.4 }); last = tt.s; } }
    { let last = -99; for (const p of L.pillars) { if (p.s - last > 30) out.push({ s: p.s, kind: 'pillar', text: 'SAME SIDE!', t: PR.tAt(p.s) - 0.3 }); last = p.s; } }
    for (const b of L.brush) out.push({ s: b.s, kind: 'dodge', text: 'DODGE THE BRUSH!', t: PR.tAt(b.s) - 0.2 });
    out.sort((a, b) => a.t - b.t);
    return out;
  })();

  /* ---------- state ---------- */
  function coin(id) {
    return { id, x: id ? 2.2 : -2.2, vx: 0, air: 0, airT: 0, airH: S.HOP_H, y: 0, state: 'ride', t: 0, bx: 0, boff: 0, safe: 0, bumpSafe: 0,
      side: 0, grindT: 0, landT: -9, hopT: -9, spin: 0, wipes: 0, lastWhy: '', slick: false };
  }
  function fresh(st) {
    Object.assign(st, {
      phase: 'intro', t: 0, phaseT: 0, ht: 0, s: 0, prevS: 0, v: 0,
      c: [coin(0), coin(1)],
      arc: { state: 'on', far: 0, rejoin: 0, len: 4.4, snaps: 0 },
      coins: 0, got: L.pickups.map(() => false), rowGot: L.rows.map(() => 0), rowSwept: L.rows.map(() => false), sweeps: 0, pi: 0,
      wipes: 0, wipeAt: L.parts.map(() => 0), rescues: 0, restarts: 0, sweeperHit: false,
      restart: 0, ckFails: L.checks.map(() => 0), goldSec: L.checks.map(() => false), goldMsgT: -99, goldN: 0,
      gateOpen: L.gates.map(() => false), btn: L.splits.map(sp => sp.pairs.map(() => false)), bugGone: L.bugs.map(() => false),
      springDone: L.springs.map(() => false), hold: null, fly: null, bumpT: -9, fx: [], says: [], finished: false, lost: false,
    });
  }
  CO.fresh = fresh;
  const fx = (st, k, o) => { st.fx.push(Object.assign({ k, t: st.t }, o || {})); if (st.fx.length > 80) st.fx.splice(0, st.fx.length - 80); };

  // is this coin in the air high enough to clear a low thing
  const high = c => c.air > 0 && c.y > 0.3;
  const grounded = c => c.air <= 0;
  CO.gold = st => st.goldSec[PR.sectionOf(st.s)];
  const awake = st => st.s > L.sweeper.wake && st.s < L.sweeper.lost;
  CO.awake = awake;
  // the split (if any) at s, and the side a coin is on there
  CO.splitAt = s => L.splits.find(sp => s >= sp.s0 && s <= sp.s1) || null;
  const teethOn = (tt, ht) => (((ht - tt.ph) % tt.per) + tt.per) % tt.per < tt.on;
  CO.teethOn = teethOn;
  const leverX = (lv, ht) => lv.cx + lv.amp * Math.sin(2 * Math.PI * ht / lv.per + lv.ph);
  CO.leverX = leverX;

  /* ---------- wipe-outs, bubbles, restarts ---------- */
  function wipe(st, c, why, edge) {
    if (st.phase !== 'ride' || c.state !== 'ride' || c.safe > 0 || st.fly) return false;
    if (edge && c.bumpSafe > 0) return false;
    c.state = 'out'; c.t = 0; c.wipes++; c.lastWhy = why; c.vx = 0;
    st.wipes++; st.wipeAt[PR.partAt(st.s)]++;
    if (why === 'brush') st.sweeperHit = true;
    fx(st, 'wipe', { id: c.id, why, x: c.x, s: st.s });
    Sfx.play('arcadecoinWipeout');
    G.shake = Math.max(G.shake || 0, 0.22);
    if (typeof rumble === 'function') rumble(c.id, 0.5, 0.6, 180);
    return true;
  }
  CO.wipe = wipe;
  // a place across the chute that is clear of every hazard and gap from s to s + ahead (for a bubble, a restart)
  function clearAt(st, x, s0, s1) {
    for (const g of L.gaps) if (g.s1 > s0 && g.s0 < s1 && x + S.R > g.x0 && x - S.R < g.x1) return false;
    for (const tt of L.teeth) if (tt.s > s0 - 2 && tt.s < s1 + 2 && x + S.R > tt.x0 && x - S.R < tt.x1) return false;
    for (const w of L.wires) if (w.s > s0 && w.s < s1) return false;
    for (const lv of L.levers) if (lv.s > s0 && lv.s < s1 && Math.abs(x - lv.cx) < lv.amp + lv.hw + S.R) return false;
    for (const b of L.bugs) if (b.s > s0 && b.s < s1 && Math.abs(x - b.x) < S.R + 0.6) return false;
    for (const b of L.brush) if (awake(st) && b.s > s0 - 2 && b.s < s1 + 2 && x + S.R > b.x0 && x - S.R < b.x1) return false;
    for (const p of L.pillars) if (p.s > s0 - 2 && p.s < s1 + 2 && Math.abs(x - p.x) < p.r + S.R) return false;
    for (const g of L.gates) if (g.s > s0 && g.s < s1) return false;
    return true;
  }
  CO.clearAt = clearAt;
  function bubbleSpot(st, c) {
    const o = st.c[1 - c.id], w = PR.w(st.s), lim = w - S.R - 0.2;
    const sp = CO.splitAt(st.s + 2);
    const want = o.state === 'ride' ? o.x : c.x;
    let best = null, bd = 1e9;
    for (let x = -lim; x <= lim + 1e-6; x += 0.25) {
      if (sp && Math.sign(x) !== Math.sign(want || 1)) continue;
      if (sp && Math.abs(x) < S.DIV + S.R) continue;
      const d = Math.abs(x - want) + (clearAt(st, x, st.s, st.s + 10) ? 0 : 50);
      if (d < bd) { bd = d; best = x; }
    }
    return best == null ? 0 : best;
  }
  function pop(st, c, by) {
    c.state = 'ride'; c.x = c.bx; c.vx = 0; c.safe = S.SAFE; c.air = 0.35; c.airT = 0.35; c.airH = 0.4; c.t = 0;
    const sp = CO.splitAt(st.s); if (sp) c.side = c.x < 0 ? -1 : 1;
    if (by) { st.rescues++; fx(st, 'pop', { id: c.id, by }); } else fx(st, 'selfpop', { id: c.id });
    if (st.c[1 - c.id].state === 'ride') { st.arc.state = 'on'; st.arc.far = 0; }
    Sfx.play('arcadecoinPop');
  }
  function restartAt(st) {
    const sec = PR.sectionOf(st.restart);
    st.ckFails[sec]++; st.restarts++;
    if (st.ckFails[sec] >= S.GOLD_N && !st.goldSec[sec]) { st.goldSec[sec] = true; st.goldMsgT = st.t; st.goldN++; Sfx.play('arcadecoinGold'); }
    st.phase = 'ride'; st.phaseT = 0; st.s = st.prevS = st.restart; st.hold = null; st.fly = null;
    const w = PR.w(st.s), lim = w - S.R - 0.1;
    st.c.forEach((c, k) => { Object.assign(c, coin(k)); c.x = clamp(k ? 2.2 : -2.2, -lim, lim); c.safe = S.RESTART_SAFE; c.air = 0.5; c.airT = 0.5; c.airH = 0.8; });
    st.arc.state = 'on'; st.arc.far = 0;
    L.gates.forEach((g, i) => { if (g.s > st.s) st.gateOpen[i] = false; });
    L.splits.forEach((sp, i) => { if (sp.s0 > st.s) st.btn[i] = sp.pairs.map(() => false); });
    L.bugs.forEach((b, i) => { if (b.s > st.s) st.bugGone[i] = false; });
    L.springs.forEach((sp, i) => { if (sp.sh > st.s) st.springDone[i] = false; });
    st.pi = 0; while (st.pi < L.pickups.length && L.pickups[st.pi].s <= st.s) st.pi++;
    fx(st, 'restart', {});
    Sfx.play('arcadecoinCheckpoint');
  }
  CO.restartAt = restartAt;

  /* ---------- the coins across the chute ---------- */
  function lanes(st, c) {
    // the coin's limits across the chute at st.s: the walls, and in a split the divider
    const w = PR.w(st.s), lim = w - S.R;
    const sp = CO.splitAt(st.s);
    if (sp) {
      if (!c.side) c.side = c.x < -0.01 ? -1 : c.x > 0.01 ? 1 : (c.id ? 1 : -1);
      return c.side < 0 ? [-lim, -S.DIV - S.R] : [S.DIV + S.R, lim];
    }
    c.side = 0;
    return [-lim, lim];
  }
  function steerCoins(st, dt) {
    const gold = CO.gold(st);
    for (const p of G.players) {
      const c = st.c[p.id];
      if (c.state === 'bubble' || c.state === 'out') { p.pendingJump = false; continue; }
      const sv = steerOf(p);
      // jump: a fresh press, only from the floor (and not in the open air of the long fall)
      if (p.pendingJump) {
        p.pendingJump = false;
        if (grounded(c) && !PR.inAir(st.s) && !st.fly && st.phase === 'ride') { c.air = c.airT = S.AIR; c.airH = S.HOP_H; c.hopT = st.t; fx(st, 'hop', { id: c.id }); Sfx.play('arcadecoinHop'); }
      }
      const slick = L.slick.some(q => st.s > q.s0 && st.s < q.s1 && c.x > q.x0 && c.x < q.x1);
      c.slick = slick;
      const resp = slick ? S.SLICK_RESP : S.RESP, tv = sv * S.VX * (grounded(c) ? 1 : S.AIR_STEER);
      c.vx += (tv - c.vx) * Math.min(1, resp * dt);
      for (const f of L.fans) if (st.s > f.s0 && st.s < f.s1) c.vx += f.push * dt * (gold ? S.GOLD_SLOW : 1);
      let carry = 0; if (grounded(c)) for (const q of L.carry) if (st.s > q.s0 && st.s < q.s1) carry += q.v * (gold ? S.GOLD_SLOW : 1);
      c.x += (c.vx + carry) * dt;
      const [a, b] = lanes(st, c);
      if (c.x < a || c.x > b) {
        const hit = c.x < a ? a : b;
        if (Math.abs(c.vx) > 2.5 && st.t - c.grindT > 0.18) { c.grindT = st.t; fx(st, 'grind', { id: c.id, side: Math.sign(c.x), x: hit }); Sfx.play('arcadecoinGrind'); }
        c.x = hit; if (Math.sign(c.vx) === Math.sign(c.x - (a + b) / 2)) c.vx *= 0.2;
      }
      // pillars: a coin slides round (never wedged: if there is no room it is let through)
      for (const pl of L.pillars) {
        if (Math.abs(st.s - pl.s) > pl.r + S.R * 0.6) continue;
        const d = c.x - pl.x, need = pl.r + S.R;
        if (Math.abs(d) < need) {
          const dir = d === 0 ? (c.id ? 1 : -1) : Math.sign(d), nx = pl.x + dir * need;
          if (nx >= a && nx <= b) { c.x = nx; c.vx *= 0.3; if (st.t - c.grindT > 0.25) { c.grindT = st.t; Sfx.play('arcadecoinGrind'); } }
        }
      }
    }
  }
  function bump(st) {
    const [c0, c1] = st.c;
    if (c0.state !== 'ride' || c1.state !== 'ride') return;
    const sp = CO.splitAt(st.s); if (sp && c0.side !== c1.side) return;
    // passing over: one well up in the air and the other on the floor
    if ((c0.y > 0.6 && grounded(c1)) || (c1.y > 0.6 && grounded(c0))) return;
    const d = c1.x - c0.x, need = 2 * S.R;
    if (Math.abs(d) >= need) return;
    const dir = d === 0 ? 1 : Math.sign(d), push = (need - Math.abs(d)) / 2;
    c0.x -= dir * push; c1.x += dir * push;
    // the walls win: a coin against a wall stays and the other takes the whole push
    const l0 = lanes(st, c0), l1 = lanes(st, c1);
    if (c0.x < l0[0] || c0.x > l0[1]) { const cx = clamp(c0.x, l0[0], l0[1]); c1.x += cx - c0.x; c0.x = cx; }
    if (c1.x < l1[0] || c1.x > l1[1]) { const cx = clamp(c1.x, l1[0], l1[1]); c0.x += cx - c1.x; c1.x = cx; }
    c0.x = clamp(c0.x, l0[0], l0[1]); c1.x = clamp(c1.x, l1[0], l1[1]);
    const rel = c1.vx - c0.vx;
    if (rel * dir < 0) { c0.vx += rel * 0.6; c1.vx -= rel * 0.6; }
    c0.bumpSafe = c1.bumpSafe = S.BUMP_SAFE;
    if (st.t - st.bumpT > 0.25) { st.bumpT = st.t; fx(st, 'bump', { x: (c0.x + c1.x) / 2 }); Sfx.play('arcadecoinBump'); }
  }

  /* ---------- the spark link ---------- */
  CO.arcOn = st => st.arc.state === 'on' || st.arc.state === 'stretch';
  CO.stretchAt = s => S.STRETCH * 2 * PR.w(s);
  function arc(st, dt) {
    const [c0, c1] = st.c, A = st.arc;
    const both = c0.state === 'ride' && c1.state === 'ride';
    A.len = Math.abs(c1.x - c0.x);
    if (!both) { A.state = 'off'; A.far = 0; return; }
    if (A.state === 'off') { A.state = 'on'; A.far = 0; }
    const th = CO.stretchAt(st.s), lo = Math.min(c0.x, c1.x), hi = Math.max(c0.x, c1.x);
    const blocked = L.pillars.some(p => Math.abs(st.s - p.s) < p.r + 0.4 && p.x > lo && p.x < hi);
    if (A.state === 'snap') {
      if (A.len < th && !blocked) { A.rejoin -= dt; if (A.rejoin <= 0) { A.state = 'on'; A.far = 0; fx(st, 'rejoin', {}); Sfx.play('arcadecoinRejoin'); } }
      else A.rejoin = S.REJOIN;
      return;
    }
    const snap = () => { A.state = 'snap'; A.rejoin = S.REJOIN; A.far = 0; A.snaps++; fx(st, 'snap', {}); Sfx.play('arcadecoinSnap'); };
    if (blocked) return snap();
    if (A.len > th) { A.far += dt; A.state = 'stretch'; if (A.far > S.SNAP_HOLD) snap(); }
    else { A.far = Math.max(0, A.far - dt * 2); A.state = 'on'; }
  }
  // is x under the spark (between the two coins, joined)
  const underArc = (st, x) => CO.arcOn(st) && x > Math.min(st.c[0].x, st.c[1].x) && x < Math.max(st.c[0].x, st.c[1].x);
  CO.underArc = underArc;

  /* ---------- what the coins meet ---------- */
  function pickups(st) {
    while (st.pi < L.pickups.length && L.pickups[st.pi].s <= st.s) {
      const pk = L.pickups[st.pi++], i = pk.i;
      if (st.got[i]) continue;
      const touch = st.c.some(c => c.state === 'ride' && Math.abs(c.x - pk.x) < S.R + S.PICK_R);
      if (touch || underArc(st, pk.x)) {
        st.got[i] = true; st.coins += VAL[pk.kind]; fx(st, 'pick', { i, kind: pk.kind, arc: !touch });
        Sfx.play(pk.kind === 'coin' ? 'arcadecoinPickup' : 'arcadecoinPickupBig');
        if (pk.row >= 0) {
          st.rowGot[pk.row]++;
          const r = L.rows[pk.row];
          if (!st.rowSwept[pk.row] && L.pickups.every(q => q.row !== pk.row || st.got[q.i])) { st.rowSwept[pk.row] = true; st.sweeps++; fx(st, 'sweep', { row: pk.row, s: r.s }); Sfx.play('arcadecoinSweep'); }
        }
      }
    }
  }
  function hazards(st) {
    const s = st.s, ht = st.ht, gold = CO.gold(st);
    const lo = Math.min(st.c[0].x, st.c[1].x), hi = Math.max(st.c[0].x, st.c[1].x);
    for (const c of st.c) {
      if (c.state !== 'ride') continue;
      const w = PR.w(s), edge = Math.abs(c.x) > w - 2.6;
      for (const wr of L.wires) if (Math.abs(s - wr.s) < S.R * 0.85 && !high(c) && c.x + S.R * 0.8 > wr.x0 && c.x - S.R * 0.8 < wr.x1) wipe(st, c, 'wire', edge);
      for (const lv of L.levers) { if (Math.abs(s - lv.s) > 0.4 + S.R * 0.7 || high(c)) continue; const bx = leverX(lv, ht); if (Math.abs(c.x - bx) < lv.hw + S.R * 0.8) wipe(st, c, 'lever', edge); }
      for (const tt of L.teeth) if (Math.abs(s - tt.s) < tt.len / 2 + S.R * 0.7 && teethOn(tt, ht) && c.x + S.R * 0.8 > tt.x0 && c.x - S.R * 0.8 < tt.x1) wipe(st, c, tt.roll ? 'roller' : 'teeth', edge);
      for (const g of L.gaps) if (s > g.s0 && s < g.s1 && grounded(c) && c.x > g.x0 && c.x < g.x1) wipe(st, c, 'gap', false);
      // (gold help: the Sweeper's brush misses: it slams down beside you)
      if (awake(st) && !gold) for (const b of L.brush) if (Math.abs(s - b.s) < 1.2 + S.R * 0.7 && c.x + S.R * 0.8 > b.x0 && c.x - S.R * 0.8 < b.x1) wipe(st, c, 'brush', edge);
      L.bugs.forEach((b, i) => { if (!st.bugGone[i] && Math.abs(s - b.s) < 0.7 && !high(c) && Math.abs(c.x - b.x) < S.R * 0.8 + 0.35) wipe(st, c, 'bug', edge); });
      L.gates.forEach((g, i) => { if (!st.gateOpen[i] && Math.abs(s - g.s) < 0.6 + S.R * 0.55) wipe(st, c, 'gate', false); });
      L.splits.forEach((sp, i) => sp.pairs.forEach((pr, j) => {
        if (st.btn[i][j] || gold) return;
        if (Math.abs(s - pr.gate.s) < 0.6 + S.R * 0.55 && c.side === pr.gate.side) wipe(st, c, 'gate', false);
      }));
    }
    // zaps: the spark reaches a bug just before the coins do
    L.bugs.forEach((b, i) => { if (!st.bugGone[i] && s > b.s - 1.6 && s < b.s - 0.6 && CO.arcOn(st) && b.x > lo + 0.3 && b.x < hi - 0.3) { st.bugGone[i] = true; fx(st, 'zap', { i, x: b.x, s: b.s }); Sfx.play('arcadecoinZap'); } });
    // gates: open when the spark touches both posts in the zone before the gate (gold: they open for you)
    L.gates.forEach((g, i) => {
      if (st.gateOpen[i] || s < g.s - S.GATE_ZONE || s > g.s) return;
      if (gold || (CO.arcOn(st) && lo <= -g.gx + 0.7 && hi >= g.gx - 0.7)) { st.gateOpen[i] = true; fx(st, 'gate', { i }); Sfx.play('arcadecoinGate'); }
    });
    // split buttons: ridden over on their side
    L.splits.forEach((sp, i) => sp.pairs.forEach((pr, j) => {
      if (st.btn[i][j]) return;
      if (st.prevS < pr.btn.s && s >= pr.btn.s && st.c.some(c => c.state === 'ride' && c.side === pr.btn.side)) { st.btn[i][j] = true; fx(st, 'button', { i, j }); Sfx.play('arcadecoinButton'); }
    }));
  }
  function bubbles(st, dt) {
    for (const c of st.c) {
      c.t += dt;
      if (c.state === 'out' && c.t >= S.OUT) { c.state = 'bubble'; c.t = 0; c.bx = bubbleSpot(st, c); c.boff = S.BUBBLE_OFF; fx(st, 'bubble', { id: c.id }); Sfx.play('arcadecoinBubble'); }
      if (c.state === 'bubble') {
        c.boff = Math.max(0.8, c.boff - dt * 4);
        // the bubble drifts to a clear place if the one under it is no longer clear (a split begins, a hazard comes)
        if (!clearAt(st, c.bx, st.s, st.s + 4)) c.bx += (bubbleSpot(st, c) - c.bx) * Math.min(1, dt * 3);
        const o = st.c[1 - c.id];
        if (o.state === 'ride' && c.boff < 2.2 && Math.abs(o.x - c.bx) < S.POP_R) pop(st, c, 'partner');
        else if (c.t >= S.BUBBLE && clearAt(st, c.bx, st.s - 1, st.s + 3)) pop(st, c, null);
      }
    }
  }
  function springs(st, dt) {
    const gold = CO.gold(st);
    const onPad = (sp, c) => c.state !== 'ride' || (grounded(c) && (gold || (c.x > sp.x0 - 0.25 && c.x < sp.x1 + 0.25)));
    L.springs.forEach((sp, i) => {
      if (st.springDone[i] || st.fly) return;
      if (st.hold && st.hold.i !== i) return;
      const at = st.hold ? true : st.prevS < sp.sh && st.s >= sp.sh;
      if (!at) return;
      const ready = st.c.every(c => onPad(sp, c)) && st.c.some(c => c.state === 'ride');
      if (ready) {
        st.springDone[i] = true; st.hold = null; st.s = sp.sh;
        const dur = (sp.s1 - sp.sh) / S.FLY_V + 0.25 * sp.big;
        st.fly = { i, t: 0, dur, h: 3.4 + sp.big * 1.6, s0: sp.sh, s1: sp.s1 };
        for (const c of st.c) if (c.state === 'ride') { c.air = c.airT = dur; c.airH = st.fly.h; }
        fx(st, 'spring', { i }); Sfx.play('arcadecoinSpringFire');
        return;
      }
      if (!st.hold) { st.hold = { i, t: 0 }; st.s = sp.sh; fx(st, 'hold', { i }); Sfx.play('arcadecoinSpringCharge'); }
      st.hold.t += dt; st.s = sp.sh;
      if (st.hold.t >= S.HOLD) {
        // nobody came: the coins on the pad get a little hop that falls short, the rest roll off the edge
        st.springDone[i] = true; st.hold = null; fx(st, 'springfail', { i });
        for (const c of st.c) if (c.state === 'ride' && grounded(c) && onPad(sp, c)) { c.air = c.airT = S.HOP_SMALL; c.airH = 0.5; }
        Sfx.play('arcadecoinHop');
      }
    });
  }

  /* ---------- the step ---------- */
  function step(st, dt) {
    st.t += dt; st.phaseT += dt;
    const ps = G.players;
    if (st.phase === 'intro') {
      // the opening's sounds: two coins in, the machine wakes, the flash, the whoosh through the slot
      const t0 = st.phaseT - dt, t1 = st.phaseT, at = x => t0 < x && t1 >= x;
      if (at(3.5) || at(4.0)) Sfx.play('arcadecoinInsert');
      if (at(4.15)) Sfx.play('arcadecoinPowerOn');
      if (at(5.0)) Sfx.play('arcadecoinFlash');
      if (at(6.1)) Sfx.play('arcadecoinWhoosh');
      // the opening: the arcade, the coins, the flash, the slot (no control; jump skips after the first play)
      for (const p of ps) { if (p.pendingJump && st.seen && st.phaseT > 0.6) st.phaseT = S.INTRO_T; p.pendingJump = false; p.pendingAct = false; }
      if (st.phaseT >= S.INTRO_T) {
        st.phase = 'ride'; st.phaseT = 0; st.s = st.prevS = 0;
        for (const c of st.c) { c.air = c.airT = S.FALL_LAND; c.airH = 0.9; }
        try { store.set('arcadecoin:seen', 1); } catch (e) { /* (no storage) */ }
        Sfx.play('arcadecoinLand');
      }
      return;
    }
    if (st.phase === 'restart') {
      for (const p of ps) { p.pendingJump = false; p.pendingAct = false; }
      if (st.phaseT >= S.RESTART_T) restartAt(st);
      return;
    }
    if (st.phase === 'start' || st.phase === 'done') {
      for (const p of ps) { if (p.pendingJump && st.phaseT > 1.5 && !st.finished) st.phaseT = S.START_T; p.pendingJump = false; }
      if (st.phaseT >= S.START_T && !st.finished) { st.finished = true; st.phase = 'done'; levelClear(); }
      return;
    }
    // ride
    st.ht += dt * (CO.gold(st) ? S.GOLD_SLOW : 1);
    st.prevS = st.s;
    st.v = R.at(st.s).v;
    if (st.fly) {
      const F = st.fly; F.t += dt;
      const u = Math.min(1, F.t / F.dur);
      st.s = F.s0 + (F.s1 - F.s0) * u;
      if (u >= 1) {
        st.fly = null; st.s = F.s1;
        if (F.i === L.springs.length - 1) { st.phase = 'start'; st.phaseT = 0; fx(st, 'start', {}); Sfx.play('arcadecoinStartClunk'); }
      }
    } else if (!st.hold) st.s = Math.min(PR.len - 1, st.s + st.v * dt);
    // the coins' hops
    for (const c of st.c) {
      c.safe = Math.max(0, c.safe - dt); c.bumpSafe = Math.max(0, c.bumpSafe - dt);
      if (c.air > 0) {
        c.air = Math.max(0, c.air - dt);
        const u = 1 - c.air / (c.airT || 1);
        c.y = 4 * c.airH * u * (1 - u);
        if (c.air <= 0) { c.y = 0; c.landT = st.t; if (c.state === 'ride') { fx(st, 'land', { id: c.id }); Sfx.play('arcadecoinLand'); } }
      } else c.y = 0;
      if (PR.inAir(st.s)) { c.air = Math.max(c.air, 0.3); c.airT = Math.max(c.airT, 0.3); }
    }
    steerCoins(st, dt);
    bump(st);
    springs(st, dt);
    arc(st, dt);
    pickups(st);
    hazards(st);
    bubbles(st, dt);
    // checkpoints
    L.checks.forEach(ck => { if (ck > 0 && st.prevS < ck && st.s >= ck) { st.restart = ck; fx(st, 'check', { s: ck }); Sfx.play('arcadecoinCheckpoint'); } });
    // the Sweeper is lost at the wide springboard
    if (!st.lost && st.s >= L.sweeper.lost && st.fly) { st.lost = true; fx(st, 'lost', {}); Sfx.play('arcadecoinSweeperLost'); }
    // both down at once: back to the last ring
    if (st.phase === 'ride' && st.c.every(c => c.state !== 'ride')) { st.phase = 'restart'; st.phaseT = 0; fx(st, 'bothdown', {}); Sfx.play('arcadecoinRestart'); }
  }
  CO.step = step;

  /* ---------- the HUD: coins, sweeps, the spark between the two players' corners, cue cards ---------- */
  function hudCoin(x, y, s = 1) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = '#e8b83a'; ctx.strokeStyle = '#6a4a10'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#fff0a8'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#fff6c8'; ctx.fillRect(-1, -4, 2, 8);
    ctx.restore();
  }
  function arcIcon(x, y, st) {
    const A = st.arc, t = G.clock;
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = 'rgba(23,25,29,0.78)'; rr(-70, -15, 140, 30, 15); ctx.fill();
    for (const k of [0, 1]) { ctx.fillStyle = PCOL[k]; circle(k ? 54 : -54, 0, 8); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1.5; ctx.stroke(); }
    if (A.state === 'on' || A.state === 'stretch') {
      const thin = A.state === 'stretch', flick = thin && Math.sin(t * 40) > 0.3;
      ctx.strokeStyle = thin ? (flick ? 'rgba(255,240,180,0.35)' : '#ffe9a0') : '#fff3c4'; ctx.lineWidth = thin ? 1.5 : 3;
      ctx.shadowColor = '#ffd86a'; ctx.shadowBlur = thin ? 2 : 8;
      ctx.beginPath(); ctx.moveTo(-45, 0);
      for (let i = 1; i <= 12; i++) { const xx = -45 + i * 90 / 12; ctx.lineTo(xx, i === 12 ? 0 : Math.sin(t * 30 + i * 2.1) * (thin ? 4 : 2.5)); }
      ctx.stroke(); ctx.shadowBlur = 0;
      if (thin) text('STRETCHED', 0, -22, 10, '#ffe08a', 'center', 'body');
    } else if (A.state === 'snap') {
      ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 2; ctx.setLineDash([3, 5]);
      ctx.beginPath(); ctx.moveTo(-45, 0); ctx.lineTo(-8, 0); ctx.moveTo(8, 0); ctx.lineTo(45, 0); ctx.stroke(); ctx.setLineDash([]);
      const u = 1 - Math.max(0, A.rejoin) / S.REJOIN;
      ctx.fillStyle = '#ff9a6a'; rr(-30, 7, 60 * u, 3, 1.5); ctx.fill();
      text('SNAPPED', 0, -22, 10, '#ffb08a', 'center', 'body');
    } else { ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-45, 0); ctx.lineTo(45, 0); ctx.stroke(); }
    ctx.restore();
  }
  // the next cue: a card at the top 2 s ahead ("GET READY" and a filling bar), then the word at its moment
  CO.cueNow = st => {
    if (st.phase !== 'ride' || st.fly) return null;
    const tn = PR.tAt(st.s);
    for (const cu of CO.cueList) {
      const a = cu.t - tn;
      if (cu.kind === 'jump' ? (a < 2.0 && tn < cu.t1 + 0.05) : (a < 2.0 && a > -0.8)) return { cu, a };
    }
    return null;
  };
  function cueCard(st) {
    const q = CO.cueNow(st); if (!q) return;
    const { cu, a } = q, now = a <= 0, col = { jump: '#7ae8ff', split: '#9aff8a', together: '#ffd24a', spread: '#ffd24a', gate: '#ffd24a', squeeze: '#ff9ad6', zap: '#e8ff7a', steer: '#ffffff', pillar: '#ff9ad6', dodge: '#ff7a6a' }[cu.kind] || '#fff';
    const y = 72, wd = now ? 340 : 300;
    ctx.save();
    ctx.fillStyle = 'rgba(23,25,29,0.8)'; rr(W / 2 - wd / 2, y - 26, wd, 52, 14); ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = now ? 3 : 1.5; rr(W / 2 - wd / 2, y - 26, wd, 52, 14); ctx.stroke();
    if (!now) {
      text('GET READY', W / 2, y - 8, 12, 'rgba(255,255,255,0.7)', 'center', 'body');
      text(cu.text, W / 2, y + 11, cu.text.length > 16 ? 15 : 20, col, 'center');
      ctx.fillStyle = 'rgba(255,255,255,0.15)'; rr(W / 2 - wd / 2 + 16, y + 21, wd - 32, 3, 1.5); ctx.fill();
      ctx.fillStyle = col; rr(W / 2 - wd / 2 + 16, y + 21, (wd - 32) * Math.max(0, Math.min(1, 1 - a / 2)), 3, 1.5); ctx.fill();
    } else {
      const pulse = 1 + Math.sin(G.clock * 18) * 0.04;
      ctx.translate(W / 2, y); ctx.scale(pulse, pulse);
      text(cu.text, 0, 1, cu.text.length > 16 ? 18 : 28, col, 'center');
    }
    ctx.restore();
    // a jump card shows each person's own jump button
    if (cu.kind === 'jump' && now) for (const k of [0, 1]) if (!isCpuPlayer(k) && st.c[k].state === 'ride' && !st.c[k].air) drawBtn(k, 'hop', W / 2 + (k ? 1 : -1) * 205, y, { label: 'jump' });
  }
  function hud(st) {
    if (st.noHud || st.phase === 'intro') return;
    ctx.font = '700 15px "Atkinson Hyperlegible", system-ui, sans-serif';
    const tt = String(st.coins), tw = ctx.measureText(tt).width + 52;
    pill(14, 46, tw, 30); hudCoin(34, 61, 1); text(tt, 52, 61.5, 15, C.paper, 'left', 'body');
    const sw = 'Sweeps ' + st.sweeps, sww = ctx.measureText(sw).width + 28;
    pill(14, 82, sww, 30); text(sw, 28, 97.5, 15, st.sweeps ? '#ffe08a' : C.paper, 'left', 'body');
    arcIcon(W / 2, H - 28, st);
    cueCard(st);
    if (st.t - st.goldMsgT < 4.5) {
      const a = Math.min(1, (4.5 - (st.t - st.goldMsgT)) * 2);
      ctx.save(); ctx.globalAlpha = a; ctx.font = '700 17px "Atkinson Hyperlegible", system-ui, sans-serif';
      const m = 'Gold help: slower hazards, open gates, wide springboards, and a gold line', mw = ctx.measureText(m).width + 40;
      ctx.fillStyle = 'rgba(120,84,10,0.92)'; rr(W / 2 - mw / 2, 128, mw, 34, 17); ctx.fill(); ctx.strokeStyle = C.gold; ctx.lineWidth = 2; ctx.stroke();
      text(m, W / 2, 145.5, 17, '#ffe9a8', 'center', 'body'); ctx.restore();
    }
  }
  CO.hud = hud;
  return CO;
})();

/* ---------- MODES.arcadecoin ---------- */
MODES.arcadecoin = {
  medals: { bronze: 'Press START', goals: [{ key: 'coins', gold: 0.85, silver: 0.55, more: true, pct: true, word: 'the coins' }, { key: 'wipes', gold: 3, silver: 10, word: 'wipe-out' }] },
  medalValues() { const st = G.mst; return { coins: Math.min(1, st.coins / ARCADECOIN.maxCoins), wipes: st.wipes }; },
  scene3dOpts: { bg: '#07060c', fov: 56, near: 0.15, far: 1400 },
  setup(st) { ARCADECOIN.fresh(st); let seen = false; try { seen = !!store.get('arcadecoin:seen'); } catch (e) { /* (no storage) */ } st.seen = seen; for (const p of G.players) p.alive = true; },
  step(dt) { ARCADECOIN.step(G.mst, dt); },
  hud() { ARCADECOIN.hud(G.mst); },
  scene3d(K) { if (typeof ARCADECOIN_SCENE !== 'undefined') ARCADECOIN_SCENE.build(K, G.mst); },
  draw3d(K, dt) { if (typeof ARCADECOIN_SCENE !== 'undefined') ARCADECOIN_SCENE.update(K, G.mst, dt); },
  drawTop() { if (typeof ARCADECOIN_SCENE !== 'undefined') ARCADECOIN_SCENE.drawTop(G.mst); },
  resultTitle() { return 'START! The game is on!'; },
  noTime: false,
  stats() {
    const st = G.mst, names = ARCADECOIN.partNames;
    const out = [
      { label: 'Coins', value: st.coins + ' of ' + ARCADECOIN.maxCoins },
      { label: 'Sweeps', value: st.sweeps + ' of ' + ARCADECOIN_ROUTE.lists.rows.length },
      { label: 'Wipe-outs', value: String(st.wipes) },
      { label: 'Rescues', value: String(st.rescues) },
    ];
    let worst = -1, wn = 0; st.wipeAt.forEach((n, k) => { if (n > wn) { wn = n; worst = k; } });
    out.push(worst >= 0 ? 'Most wipe-outs in ' + names[worst] + ' (' + wn + ').' : 'Not a single wipe-out. Slick riding!');
    if (!st.sweeperHit) out.push('The Sweeper never laid a brush on you.');
    if (st.goldN) out.push('Gold help lent a hand in ' + st.goldN + (st.goldN === 1 ? ' section.' : ' sections.'));
    return out;
  },
};

/* ---------- the 2D 'arcadecoin' outfit (previews, world page, title run): the 3D one is arcadecoin-outfits.js ----------
   Pip: a cream retro racing jacket with a glowing green circuit pattern, a green see-through visor cap (the sprout
   through the top), fingerless gloves. Bo: a teal quilted bomber vest with a row of light-up arcade buttons down the
   back, chunky yellow headphones round the neck (ears free), striped wristbands. Pip no blue, Bo no orange or red. */
defineOutfitPart('acRacerJacket', { layer: 'body', draw(c) {
  const g = c.g, ink = OF_INK, pulse = 0.6 + 0.4 * Math.sin(c.t * 5);
  g.beginPath(); g.moveTo(-11, -15); g.lineTo(11, -15); g.lineTo(11, -2); g.lineTo(-11, -2); g.closePath(); ofFillStroke(g, '#f2ead2', ink, 1.2);
  g.save(); g.shadowColor = '#5aff8a'; g.shadowBlur = 4 * pulse; g.strokeStyle = `rgba(80,240,130,${0.6 + 0.4 * pulse})`; g.lineWidth = 1.1;
  g.beginPath(); g.moveTo(-8, -3); g.lineTo(-8, -8); g.lineTo(-4, -11); g.moveTo(5, -3); g.lineTo(5, -9); g.lineTo(8, -12); g.moveTo(-2, -2); g.lineTo(-2, -6); g.lineTo(1, -8); g.stroke();
  g.fillStyle = '#7aff9a'; for (const [x, y] of [[-4, -11], [8, -12], [1, -8]]) { g.beginPath(); g.arc(x, y, 1.1, 0, Math.PI * 2); g.fill(); }
  g.restore();
  g.fillStyle = '#2f9a5a'; g.fillRect(-11, -9.5, 22, 1.6);
} });
defineOutfitPart('acVisorCap', { layer: 'head', lift: 3, draw(c) {
  const g = c.g, ink = OF_INK;
  g.beginPath(); g.moveTo(-10, -24); g.bezierCurveTo(-10, -31, 10, -31, 10, -24); g.closePath(); ofFillStroke(g, '#2f9a5a', ink, 1.2);
  g.beginPath(); g.moveTo(-12, -24); g.lineTo(12, -24); g.lineTo(14, -21); g.lineTo(-14, -21); g.closePath(); g.fillStyle = 'rgba(110,240,150,0.45)'; g.fill(); g.strokeStyle = ink; g.lineWidth = 1; g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(-9, -23.4, 6, 1);
} });
defineOutfitPart('acGloves', { layer: 'front', draw(c) {
  const g = c.g, ink = OF_INK;
  for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(sx * 11.5, -8, 2.6, 2.4, 0, 0, Math.PI * 2); ofFillStroke(g, '#3a3a40', ink, 0.9); }
} });
defineOutfitPart('acBomberVest', { layer: 'body', draw(c) {
  const g = c.g, ink = OF_INK;
  g.beginPath(); g.moveTo(-11, -15); g.lineTo(11, -15); g.lineTo(11, -2); g.lineTo(-11, -2); g.closePath(); ofFillStroke(g, '#2aa89a', ink, 1.2);
  g.strokeStyle = 'rgba(10,60,55,0.55)'; g.lineWidth = 0.8;
  for (let y = -12; y < -2; y += 3.4) { g.beginPath(); g.moveTo(-10.5, y); g.lineTo(10.5, y); g.stroke(); }
  const cols = ['#ffd84a', '#9aff6a', '#ff7ad6', '#ffffff'];
  for (let i = 0; i < 4; i++) { const on = Math.floor(c.t * 6) % 4 === i; g.beginPath(); g.arc(-6 + i * 4, -6, 1.5, 0, Math.PI * 2); g.fillStyle = on ? cols[i] : 'rgba(30,30,40,0.6)'; g.fill(); }
} });
defineOutfitPart('acHeadphones', { layer: 'body', draw(c) {
  const g = c.g, ink = OF_INK;
  g.strokeStyle = '#3a3a40'; g.lineWidth = 2; g.beginPath(); g.moveTo(-8, -14.5); g.quadraticCurveTo(0, -11, 8, -14.5); g.stroke();
  for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(sx * 8.5, -14, 3, 3.6, 0, 0, Math.PI * 2); ofFillStroke(g, '#ffd23a', ink, 1); }
} });
defineOutfitPart('acWristbands', { layer: 'front', draw(c) {
  const g = c.g, ink = OF_INK;
  for (const sx of [-1, 1]) { g.fillStyle = '#f4f0e8'; g.fillRect(sx * 11.5 - 2.4, -9.5, 4.8, 3); g.fillStyle = '#7a5cd6'; g.fillRect(sx * 11.5 - 2.4, -8.6, 4.8, 1); g.strokeStyle = ink; g.lineWidth = 0.7; g.strokeRect(sx * 11.5 - 2.4, -9.5, 4.8, 3); }
} });
defineOutfit('arcadecoin', { pip: [['acRacerJacket', {}], ['acGloves', {}], ['acVisorCap', {}]], bo: [['acBomberVest', {}], ['acHeadphones', {}], ['acWristbands', {}]] });

/* ---------- the level ---------- */
ARCADECOIN.def = {
  name: 'Coin Drop', world: 42, kind: 'team', mode: 'arcadecoin', outfit: 'arcadecoin', music: 'arcadecabinet', amb: 'arcadecabinet',
  view3d: true, ownStep: true, ownHUD: true, noFalls: true,
  legend: {
    pip: '<kbd>A</kbd><kbd>D</kbd> steer <kbd>Space</kbd> jump',
    bo: '<kbd>←</kbd><kbd>→</kbd> steer <kbd>Shift</kbd> jump',
  },
  tip: 'Stay linked. The spark between you collects coins.',
  howTo: ['Spread out to sweep coins with the spark.', 'Take a side each at a split.', 'Hit the springboard together.'],
  map: Array.from({ length: 18 }, () => '.'.repeat(32)),
};
ARCADECOIN.def.map[16] = '.'.repeat(10) + '1' + '.'.repeat(10) + '2' + '.'.repeat(10);

// the 3D-only files: the World 43 arcade kit (shared by every World 43 level), the riders' outfits, the coins and the scenery
K3D.files.push('js/levels/world43/arcade-kit.js', 'js/levels/world43/arcadecoin-life.js', 'js/levels/world43/arcadecoin-outfits.js', 'js/levels/world43/arcadecoin-coins.js',
  'js/levels/world43/arcadecoin-chute.js', 'js/levels/world43/arcadecoin-stretch1.js', 'js/levels/world43/arcadecoin-opening.js', 'js/levels/world43/arcadecoin-city.js', 'js/levels/world43/arcadecoin-scenery.js');

/* ---------- sounds (brass, coins, relays and sparks inside an old arcade machine) ---------- */
(function () {
  const X = Sfx.extra;
  X.arcadecoinSlide = function () { this.noise(0.6, { type: 'bandpass', f: 2400, to: 1800, q: 1.5, vol: 0.015, a: 0.1 }); };
  X.arcadecoinHop = function () { this.tone(420, 0.16, 'square', 0.025, 840); this.noise(0.12, { type: 'highpass', f: 3000, vol: 0.015 }); };
  X.arcadecoinLand = function () { [1568, 2093, 2637].forEach((f, k) => this.tone(f, 0.35 - k * 0.08, 'triangle', 0.02, f * 0.99, k * 0.01)); this.tone(180, 0.1, 'square', 0.03, 110); };
  X.arcadecoinBump = function () { this.tone(1200, 0.12, 'triangle', 0.03, 1100); this.tone(900, 0.1, 'triangle', 0.025, 860, 0.02); this.noise(0.05, { type: 'highpass', f: 4000, vol: 0.02 }); };
  X.arcadecoinGrind = function () { this.noise(0.25, { type: 'bandpass', f: 3200, to: 2400, q: 3, vol: 0.03 }); this.tone(2600, 0.2, 'sawtooth', 0.006, 2200); };
  X.arcadecoinPickup = function () { this.tone(1760, 0.06, 'square', 0.014, 2349); this.tone(2349, 0.08, 'square', 0.01, null, 0.05); };
  X.arcadecoinPickupBig = function () { [1047, 1319, 1568, 2093].forEach((f, k) => this.tone(f, 0.09, 'square', 0.014, null, k * 0.045)); };
  X.arcadecoinSweep = function () { [784, 988, 1175, 1568, 1976].forEach((f, k) => { this.tone(f, 0.12, 'square', 0.018, null, k * 0.05); this.tone(f * 2, 0.08, 'triangle', 0.006, null, k * 0.05); }); };
  X.arcadecoinArcHum = function () { this.tone(110, 0.6, 'sawtooth', 0.006, 112); };
  X.arcadecoinArcStretch = function () { this.tone(1800, 0.3, 'sawtooth', 0.008, 2600); this.noise(0.3, { type: 'highpass', f: 5000, vol: 0.01 }); };
  X.arcadecoinSnap = function () { this.noise(0.18, { type: 'highpass', f: 2500, to: 600, vol: 0.06 }); this.tone(880, 0.2, 'square', 0.025, 110); };
  X.arcadecoinRejoin = function () { this.tone(330, 0.25, 'sawtooth', 0.015, 990); this.tone(990, 0.12, 'triangle', 0.015, 1320, 0.2); };
  X.arcadecoinZap = function () { this.noise(0.2, { type: 'bandpass', f: 3000, to: 900, q: 2, vol: 0.05 }); this.tone(1400, 0.15, 'square', 0.02, 200); [523, 784].forEach((f, k) => this.tone(f, 0.08, 'square', 0.012, null, 0.12 + k * 0.06)); };
  X.arcadecoinGate = function () { this.tone(220, 0.25, 'square', 0.03, 440); this.tone(660, 0.2, 'triangle', 0.02, 880, 0.15); this.noise(0.2, { type: 'bandpass', f: 1500, q: 3, vol: 0.02 }); };
  X.arcadecoinButton = function () { this.tone(140, 0.1, 'square', 0.05, 90); this.tone(1046, 0.12, 'square', 0.015, null, 0.06); this.tone(1568, 0.14, 'square', 0.012, null, 0.12); };
  X.arcadecoinSpringCharge = function () { this.tone(220, 1.6, 'triangle', 0.02, 880); this.tone(330, 1.6, 'square', 0.006, 1320); };
  X.arcadecoinSpringFire = function () { this.tone(160, 0.3, 'square', 0.05, 640); this.noise(0.4, { type: 'bandpass', f: 600, to: 2400, q: 0.8, vol: 0.05 }); [1047, 1319, 1568].forEach((f, k) => this.tone(f, 0.15, 'square', 0.012, null, 0.1 + k * 0.05)); };
  X.arcadecoinWipeout = function () { this.tone(660, 0.5, 'square', 0.03, 110); this.noise(0.3, { type: 'lowpass', f: 2000, to: 300, vol: 0.05 }); [523, 392, 262].forEach((f, k) => this.tone(f, 0.1, 'square', 0.014, null, 0.18 + k * 0.08)); };
  X.arcadecoinBubble = function () { this.tone(400, 0.3, 'sine', 0.03, 900); this.tone(700, 0.2, 'sine', 0.02, 1200, 0.1); };
  X.arcadecoinPop = function () { this.tone(1200, 0.06, 'square', 0.03, 300); this.noise(0.08, { type: 'highpass', f: 3000, vol: 0.03 }); [784, 1175].forEach((f, k) => this.tone(f, 0.08, 'square', 0.012, null, 0.06 + k * 0.05)); };
  X.arcadecoinCheckpoint = function () { [659, 988, 1319].forEach((f, k) => this.tone(f, 0.1, 'square', 0.014, null, k * 0.06)); };
  X.arcadecoinRestart = function () { for (let k = 0; k < 5; k++) this.tone(800 - k * 120, 0.08, 'square', 0.016, null, k * 0.07); this.noise(0.6, { type: 'bandpass', f: 1200, to: 300, q: 1, vol: 0.03, delay: 0.3 }); };
  X.arcadecoinGold = function () { [784, 988, 1175, 1568].forEach((f, k) => this.tone(f, 0.2, 'triangle', 0.025, null, k * 0.09)); };
  X.arcadecoinGear = function () { this.tone(90, 0.08, 'square', 0.02, 70); this.noise(0.06, { type: 'bandpass', f: 1600, q: 5, vol: 0.02 }); };
  X.arcadecoinLever = function () { this.noise(0.3, { type: 'bandpass', f: 500, to: 1400, q: 1.2, vol: 0.03 }); this.tone(120, 0.15, 'square', 0.02, 90, 0.2); };
  X.arcadecoinFan = function () { this.noise(1.2, { type: 'bandpass', f: 500, q: 0.8, vol: 0.03, a: 0.3 }); };
  X.arcadecoinSweeperEye = function () { this.tone(1760, 0.2, 'square', 0.012, 1760); this.tone(1760, 0.2, 'square', 0.012, 1760, 0.3); };
  X.arcadecoinSweeperBrush = function () { this.noise(0.4, { type: 'lowpass', f: 1400, to: 300, vol: 0.09 }); this.tone(70, 0.3, 'square', 0.05, 45); };
  X.arcadecoinSweeperLost = function () { this.tone(440, 0.6, 'square', 0.025, 110); this.tone(330, 0.6, 'square', 0.02, 80, 0.1); };
  X.arcadecoinAvalanche = function () { this.noise(2.5, { type: 'bandpass', f: 2600, to: 1200, q: 1, vol: 0.05, a: 0.4 }); for (let k = 0; k < 10; k++) this.tone(1800 + (k % 3) * 500, 0.1, 'triangle', 0.008, null, k * 0.18); };
  X.arcadecoinStartClunk = function () { this.tone(70, 0.8, 'square', 0.08, 40); this.noise(0.4, { type: 'lowpass', f: 600, vol: 0.08 }); this.tone(140, 0.3, 'triangle', 0.04, 100, 0.05); };
  X.arcadecoinPowerOn = function () { this.tone(110, 1.6, 'sawtooth', 0.02, 880); [523, 659, 784, 1047, 1319, 1568].forEach((f, k) => this.tone(f, 0.25, 'square', 0.016, null, 0.6 + k * 0.1)); };
  X.arcadecoinInsert = function () { this.tone(2093, 0.25, 'triangle', 0.025, 2000); this.tone(140, 0.12, 'square', 0.04, 100, 0.2); this.noise(0.4, { type: 'bandpass', f: 1800, to: 600, q: 2, vol: 0.025, delay: 0.25 }); };
  X.arcadecoinWhoosh = function () { this.noise(1.2, { type: 'bandpass', f: 300, to: 2600, q: 0.7, vol: 0.07, a: 0.3 }); this.tone(200, 1.0, 'sine', 0.03, 1200); };
  X.arcadecoinFlash = function () { this.tone(3000, 0.4, 'square', 0.012, 6000); this.noise(0.5, { type: 'highpass', f: 4000, vol: 0.03 }); };
})();
