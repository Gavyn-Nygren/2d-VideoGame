/* Pip & Bo - computer opponent for 43-4 Laser Tag Arena (mode 'arcadelaser', versus).

   The plan: fight from cover. It plays by exactly the person's rules (ARCADELASER reads its presses like anyone's): the
   same run speed, the same aim help, the same tell before every shot, the same recharge. It never reads the person's
   buttons, only what is on the floor: where the heroes stand, the aiming line the person is showing, the tell.
     WHERE   every half second or so it scores spots near it (a walking map of the floor, rebuilt when the risers or the
             turning mirrors change) and walks to the best by the shortest way, cutting corners where the way is clear:
             a spot with a clear line to the other vest when its blaster is ready (and, if it can, cover next to it to
             duck back behind), a spot out of the line when it is recharging, tagged or being aimed at. Pickups on the
             pads pull it, and so (Hard) do the buttons that would turn a mirror into a bank shot. A spot it has picked
             is kept unless another is clearly better, so it never dithers. Standing still in the open counts against a
             spot, and so does hiding too long: the longer since its last shot, the more it wants a line.
     SHOOT   when ready it turns to the shot (one step's push that way) and presses fire. A close, clear shot is a tap (aim
             help bends it onto the vest); a longer one or a bank shot is held, so its own dotted line shows, and let go
             when the line ends on the vest. Banks go through a mirror's middle (where the held aim help puts them).
             It never shoots at a vest that is still safe or fires into a wall it is touching.
     DODGE   it watches the other blaster: an aiming line that ends on its vest, then the tell. It jumps so that it is in
             the air in the middle of the jump when the beam comes (the same window a person has), or steps out of the
             line while the other player is still aiming.
     SKILL   (info.skill: 0.35 Easy, 0.7 Normal, 1 Hard)
             Easy:   reacts slowly (about 0.7 s before it shoots at a vest it can see), only shoots straight at a clear
                     vest and not always quite on target, never banks, seldom jumps a beam, wanders into the open, takes
                     a pickup only if it is passing.
             Normal: uses cover, takes aim, jumps a beam it has had fair warning of about half the time, banks off one
                     mirror when it is an easy shot, picks up what is near.
             Hard:   reads the aiming line and steps out of it or jumps, banks off one and two mirrors, uses the buttons to
                     turn mirrors, keeps out of the way of risers about to rise, goes for pickups, and presses forward when
                     the person is recharging or has just been tagged.
     NEVER   stands still in the open, spins on the spot, hides for a whole round or jitters (its push turns smoothly and
             a picked spot is kept). If the person presses nothing for 30 s (CPU.idleStop) it stops too, as in every
             versus level.
   1-player bubbles, sparing: "Zap!", "Missed me!", "Hey!". */
'use strict';

const ARCADELASER_CPU = (function () {
  const C = 0.25; // the walking map's cell (units)
  const N8 = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
  const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

  /* ---------- the walking map ---------- */
  // cells a hero can stand in (spinning mirrors are left out: they sweep through, the body is pushed aside like anyone's)
  function mapKey(st) {
    let k = (st.layout && st.layout.length) + '|' + (st.startDown >= 1 ? 1 : 0) + '|' + (st.ring ? Math.round(st.ring.hx * 2) + ',' + Math.round(st.ring.hz * 2) : '-');
    for (const i in st.risers) k += '|' + (st.risers[i].h > 0 ? 1 : 0);
    for (const id in st.turnAng) k += '|' + Math.round(st.turnAng[id] * 20);
    return k;
  }
  function buildMap(st) {
    const AR = ARCADELASER_ARENA, S = ARCADELASER.S;
    const hx = st.ring ? st.ring.hx : AR.HX, hz = st.ring ? st.ring.hz : AR.HZ;
    const nx = Math.ceil(AR.HX * 2 / C), nz = Math.ceil(AR.HZ * 2 / C);
    const sol = st.sol.filter(q => !(q.p && q.p.k === 'spin'));
    const ok = new Uint8Array(nx * nz), cover = new Uint8Array(nx * nz);
    const b = { x: 0, z: 0, r: S.R + 0.05 };
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const x = -AR.HX + (i + 0.5) * C, z = -AR.HZ + (j + 0.5) * C;
      if (Math.abs(x) > hx - S.R - 0.05 || Math.abs(z) > hz - S.R - 0.05) continue;
      b.x = x; b.z = z;
      if (!AR.collide(sol, b, true)) ok[j * nx + i] = 1;
    }
    // cover: a standing cell with something solid within a step (a pillar, a wall, a crate stack: not a low wall)
    const r2 = { x: 0, z: 0, r: S.R + 0.45 }, tall = sol.filter(q => q.move === 'solid' && q.beam !== 'mirror');
    for (let k = 0; k < ok.length; k++) if (ok[k]) {
      r2.x = -AR.HX + (k % nx + 0.5) * C; r2.z = -AR.HZ + (Math.floor(k / nx) + 0.5) * C;
      for (const q of tall) if (AR.overlaps(q, r2)) { cover[k] = 1; break; }
    }
    return { key: mapKey(st), nx, nz, ok, cover };
  }
  const cellOf = (m, x, z) => {
    const AR = ARCADELASER_ARENA;
    const i = Math.max(0, Math.min(m.nx - 1, Math.floor((x + AR.HX) / C))), j = Math.max(0, Math.min(m.nz - 1, Math.floor((z + AR.HZ) / C)));
    return j * m.nx + i;
  };
  const cellXZ = (m, k) => [-ARCADELASER_ARENA.HX + (k % m.nx + 0.5) * C, -ARCADELASER_ARENA.HZ + (Math.floor(k / m.nx) + 0.5) * C];
  // the nearest standing cell to a point (a body pushed against a wall stands in a cell the map calls blocked)
  function nearOk(m, k) {
    if (m.ok[k]) return k;
    const i0 = k % m.nx, j0 = Math.floor(k / m.nx);
    for (let r = 1; r < 8; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
      if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
      const i = i0 + di, j = j0 + dj; if (i < 0 || j < 0 || i >= m.nx || j >= m.nz) continue;
      if (m.ok[j * m.nx + i]) return j * m.nx + i;
    }
    return k;
  }
  // distances (units) over standing cells from cell k0 (a small Dijkstra with a bucket queue)
  function field(m, k0) {
    const d = new Float32Array(m.ok.length).fill(1e9);
    k0 = nearOk(m, k0); d[k0] = 0;
    const buckets = [[k0]]; let bi = 0;
    while (bi < buckets.length) {
      const bk = buckets[bi]; if (!bk) { bi++; continue; }
      const k = bk.pop(); if (bk.length === 0) bi++;
      if (k === undefined) continue;
      const i = k % m.nx, j = Math.floor(k / m.nx), dk = d[k];
      for (const [di, dj, w] of N8) {
        const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= m.nx || jj >= m.nz) continue;
        const kk = jj * m.nx + ii; if (!m.ok[kk]) continue;
        if (di && dj && (!m.ok[j * m.nx + ii] || !m.ok[jj * m.nx + i])) continue; // (no squeezing past a corner)
        const nd = dk + w * C; if (nd >= d[kk] - 1e-4) continue;
        d[kk] = nd; const q = Math.floor(nd / C * 2); (buckets[q] || (buckets[q] = [])).push(kk);
        if (q < bi) bi = q;
      }
    }
    return d;
  }
  // can a body walk straight from a to b (every cell on the way standing)?
  function straight(m, ax, az, bx, bz) {
    const L = Math.hypot(bx - ax, bz - az), n = Math.ceil(L / (C * 0.5));
    for (let s = 1; s <= n; s++) { const u = s / n; if (!m.ok[cellOf(m, ax + (bx - ax) * u, az + (bz - az) * u)]) return false; }
    return true;
  }

  /* ---------- seeing ---------- */
  // the shots open to hero h now: straight at the other vest, or through the middle of a mirror (maxN bounces at most)
  function shots(st, h, o, maxN) {
    const CO = ARCADELASER, AR = ARCADELASER_ARENA, S = CO.S, out = [];
    const aimAt = (tx, tz) => { let a = Math.atan2(tx - h.x, tz - h.z); for (let k = 0; k < 2; k++) { const [mx, mz] = CO.muzzle(h, a); a = Math.atan2(tx - mx, tz - mz); } return a; };
    // straight
    const a0 = aimAt(o.x, o.z), [mx, mz] = CO.muzzle(h, a0);
    if (AR.clear(st.sol, mx, mz, o.x, o.z)) {
      const p = CO.path(st, h, a0); if (p.hits.length && p.hits[0].id === o.id && p.hits[0].n === 0) out.push({ a: a0, n: 0, d: Math.hypot(o.x - h.x, o.z - h.z), segs: p.segs });
    }
    if (maxN > 0) for (const q of st.sol) {
      if (q.beam !== 'mirror') continue;
      const a = aimAt(q.x, q.z), [qx, qz] = CO.muzzle(h, a);
      if (Math.hypot(q.x - h.x, q.z - h.z) < 1 || !AR.clear(st.sol, qx, qz, q.x, q.z, q)) continue;
      const p = CO.path(st, h, a);
      const hit = p.hits.find(x => x.id === o.id);
      if (hit && hit.n >= 1 && hit.n <= maxN && p.hits[0].id === o.id) {
        let L = 0; for (const g of p.segs) L += Math.hypot(g.x1 - g.x0, g.z1 - g.z0);
        out.push({ a, n: hit.n, d: L, segs: p.segs });
      }
    }
    return out;
  }
  // is the straight line between two points clear for a beam (nothing stops it, nothing bounces it)?
  const los = (st, ax, az, bx, bz) => ARCADELASER_ARENA.clear(st.sol, ax, az, bx, bz);
  // the other blaster's shot as it stands: the path it will take if it fires now (null when it is not firing)
  function threat(st, e) {
    const f = e.fire; if (!f) return null;
    if (f.st === 'aim' || f.st === 'tell') return e.line || ARCADELASER.path(st, e, f.a);
    if (f.st === 'tellTap') return ARCADELASER.path(st, e, f.a);
    return null;
  }

  /* ---------- picking a spot ---------- */
  function pickGoal(b, st, h, o, sk, m) {
    const CO = ARCADELASER, S = CO.S, AR = ARCADELASER_ARENA;
    const me = cellOf(m, h.x, h.z), dMe = field(m, me), dOp = field(m, cellOf(m, o.x, o.z));
    b.dMe = dMe;
    const ready = h.rech <= 0.35 && h.noFire <= 0.3;
    const oSafe = o.safe > S.TELL + 0.3;
    const sinceShot = st.t - (b.lastShot != null ? b.lastShot : st.t - 3);
    const hunt = ready && !oSafe ? 1 : 0;
    const hide = (!ready || h.safe > 0 ? 1 : 0) + (b.aimedAt ? 1 : 0);
    const coverK = sk < 0.5 ? 0.05 : 0.6 + 0.4 * sk;
    const bored = Math.min(1.5, Math.max(0, sinceShot - 4) / 4);      // hiding too long: want a line
    const pushK = sk >= 0.95 && (o.rech > 0.3 || o.safe > 0.6) ? 1 : 0; // Hard presses when the person is recharging
    const cands = [];
    // spots round it (a ring of samples at a few distances) and a few across the floor
    for (let n = 0; n < 34; n++) {
      const r = n < 26 ? 0.8 + (n % 4) * 1.1 + Math.random() * 0.6 : 2 + Math.random() * 8, a = Math.random() * Math.PI * 2;
      const k = nearOk(m, cellOf(m, h.x + Math.cos(a) * r, h.z + Math.sin(a) * r));
      if (m.ok[k] && dMe[k] < 1e8) cands.push({ k });
    }
    cands.push({ k: nearOk(m, me), here: true });
    // a few steps along the way toward the other hero (somewhere to go when nothing near has a line)
    { let k = nearOk(m, me); for (let s2 = 0; s2 < 14; s2++) { const i = k % m.nx, j = Math.floor(k / m.nx); let nk = -1, nd = dOp[k]; for (const [di, dj] of N8) { const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= m.nx || jj >= m.nz) continue; const kk = jj * m.nx + ii; if (m.ok[kk] && dOp[kk] < nd) { nd = dOp[kk]; nk = kk; } } if (nk < 0) break; k = nk; } cands.push({ k }); }
    if (b.goalK != null && m.ok[b.goalK] && dMe[b.goalK] < 1e8) cands.push({ k: b.goalK, old: true });
    // pickups waiting on a pad
    const want = sk < 0.5 ? 1.2 : sk < 0.95 ? 4 : 9;
    for (const id in st.pads) {
      if (!st.pads[id] || h.held) continue;
      const q = st.layout.find(x => x.k === 'pad' && x.id === id); if (!q) continue;
      const k = nearOk(m, cellOf(m, q.x, q.z));
      if (dMe[k] < want) cands.push({ k, pad: true });
    }
    // Hard: a button that would turn a mirror into a bank shot from the button
    if (sk >= 0.95 && !b.btnCheckT) {
      b.btnCheckT = 2.5;
      for (const q of st.layout) {
        if (q.k !== 'button') continue;
        const k = nearOk(m, cellOf(m, q.x, q.z)); if (dMe[k] > 5) continue;
        if (bankAfterTurn(st, h, o, q)) cands.push({ k, btn: true });
      }
    }
    let best = null; if (b.dbgOn) b.dbg = [{ hunt, hide, bored, sinceShot }];
    for (const c of cands) {
      const [x, z] = cellXZ(m, c.k), dist = dMe[c.k];
      // a line from the whole spot, not just its middle (it stops anywhere close to the middle)
      let seeN = 0;
      if (!o.cloakT) for (const [ox, oz] of SEE5) if (los(st, x + ox, z + oz, o.x, o.z)) seeN++;
      const see = seeN === 5 ? 1 : seeN >= 3 ? 0.4 : 0, dO = Math.hypot(o.x - x, o.z - z);
      let s = -dist * 0.35;
      if (see) s += hunt * (1.6 + bored + pushK) - hide * (1.4 + coverK) * (1 - bored * 0.4);
      else s += hide * 1.1 - hunt * 0.3 * (1 + bored);
      if (see && hunt) s += dO > 2.5 && dO < 9 ? 0.5 : -0.3;      // a fair range
      // a spot it stood on and found no shot from (a corner that hides more than it looked): not again for a while
      if (hunt && b.duds) for (const u of b.duds) if (st.t - u.t < 6 && Math.hypot(u.x - x, u.z - z) < 0.6) { s -= 2.5; break; }
      // closing in when it wants a line (the longer since its last shot, the more), backing off a little when not
      const gain = Math.max(-4, Math.min(4, dOp[nearOk(m, me)] - dOp[c.k]));
      s += hunt ? gain * (0.18 + 0.35 * bored + 0.2 * pushK) : -gain * 0.08 * hide;
      if (m.cover[c.k]) s += coverK * (see ? 0.9 : 0.6);          // cover beside it to duck back behind
      else if (c.here) s -= 0.9;                                  // never stand still in the open
      if (c.old) s += 0.45;                                       // keep the spot it picked
      if (c.pad) s += sk < 0.5 ? 1 : 2.2;
      if (c.btn) s += 1.8;
      if (dO < 1.6) s -= 1.2;                                     // not right on top of the other hero
      if (b.aimedAt && b.threatSegs && nearLine(b.threatSegs, x, z) < 0.6) s -= 2.5 * (0.4 + sk);
      // just turned round: not straight back again (no jitter)
      if (st.t - (b.lastRev || -9) < 1.2 && Math.hypot(h.vx, h.vz) > 0.6 && ((x - h.x) * h.vx + (z - h.z) * h.vz) < -0.2 * Math.hypot(x - h.x, z - h.z) * Math.hypot(h.vx, h.vz)) s -= 2.5;
      // Hard keeps off a riser about to rise
      if (sk >= 0.95) for (const q of st.layout) if (q.k === 'riser' && st.risers[q.i] && st.risers[q.i].warn && AR.overlaps(AR.box(q, q.x, q.z, q.w / 2, q.d / 2, q.rot, 'block', 'solid'), { x, z, r: 0.5 })) s -= 3;
      // Easy wanders: a little noise in every score
      s += (Math.random() - 0.5) * (sk < 0.5 ? 1.6 : 0.4);
      if (b.dbgOn) (b.dbg || (b.dbg = [])).push({ x: +x.toFixed(2), z: +z.toFixed(2), s: +s.toFixed(2), see, dist: +dist.toFixed(2), dO: +dO.toFixed(2), here: !!c.here, old: !!c.old, cover: !!m.cover[c.k] });
      if (!best || s > best.s) best = { k: c.k, s };
    }
    if (best) { b.goalK = best.k; b.goalT = 0; b.fieldGoal = field(m, best.k); b.fieldKey = m.key + '|' + best.k; }
  }
  const SEE5 = [[0, 0], [0.16, 0.16], [-0.16, 0.16], [0.16, -0.16], [-0.16, -0.16]];
  const nearLine = (segs, x, z) => {
    let best = 1e9;
    for (const g of segs) {
      const dx = g.x1 - g.x0, dz = g.z1 - g.z0, L2 = dx * dx + dz * dz || 1e-6, u = Math.max(0, Math.min(1, ((x - g.x0) * dx + (z - g.z0) * dz) / L2));
      best = Math.min(best, Math.hypot(g.x0 + dx * u - x, g.z0 + dz * u - z));
    }
    return best;
  };
  // Hard: would stepping on this button turn its mirror so that a bank shot from the button tags the other vest?
  function bankAfterTurn(st, h, o, q) {
    const AR = ARCADELASER_ARENA, mir = st.layout.find(x => x.k === 'turn' && x.id === q.mir); if (!mir) return false;
    const turnAng = Object.assign({}, st.turnAng); turnAng[q.mir] = mir.rot + ((st.turnN[q.mir] || 0) + 1) * Math.PI / 4;
    const tmp = { layout: st.layout, risers: st.risers, turnAng, spinA: st.spinA, startDown: st.startDown, ring: st.ring, heroes: st.heroes };
    tmp.sol = AR.solids(tmp);
    const ghost = Object.assign({}, h, { x: q.x, z: q.z, longN: h.longN });
    return shots(tmp, ghost, o, 2).some(s => s.n >= 1);
  }

  /* ---------- the brain ---------- */
  function reset(b) {
    Object.assign(b, { map: null, goalK: null, goalT: 0, replan: 0, mv: [0, 0], shot: null, seeT: 0, lastShot: null, dodgeFor: null,
      dodgeAt: -1, aimedAt: false, threatSegs: null, btnCheckT: 0, sayT: 0, tagsSeen: [0, 0], stuckT: 0, lastX: 0, lastZ: 0, side: 1, sideT: 0 });
  }
  function think(b, p, o2, dt, info) {
    const st = G.mst, CO = typeof ARCADELASER !== 'undefined' ? ARCADELASER : null;
    const out = { left: false, right: false, up: false, down: false, jump: false, act: false, ax: 0, ay: 0 };
    if (!st || !st.heroes || !CO) return out;
    if (b.mv == null) reset(b);
    const S = CO.S, sk = info.skill, h = st.heroes[p.id], o = st.heroes[1 - p.id];
    if (st.phase !== 'live' && st.phase !== 'gold') { b.shot = null; b.goalK = null; b.map = null; return out; }
    b.btnCheckT = Math.max(0, b.btnCheckT - dt); b.sayT = Math.max(0, b.sayT - dt);
    // the walking map (rebuilt when risers rise or fall, a mirror turns, or the ring closes)
    const key = mapKey(st);
    if (!b.map || b.map.key !== key) { b.map = buildMap(st); b.replan = 0; }
    const m = b.map;
    // chatter on tags
    if (h.tags > b.tagsSeen[0] && b.sayT <= 0 && Math.random() < 0.35) { cpuSay(p, 'Zap!'); b.sayT = 8; }
    if (o.tags > b.tagsSeen[1] && b.sayT <= 0 && Math.random() < 0.25) { cpuSay(p, 'Hey!'); b.sayT = 8; }
    b.tagsSeen = [h.tags, o.tags];

    /* ----- the other blaster: an aiming line on its vest, the tell ----- */
    const th = threat(st, o);
    const onMe = th && th.hits.length && th.hits[0].id === h.id && h.safe <= 0;
    b.aimedAt = !!onMe; b.threatSegs = onMe ? th.segs : null;
    if (onMe) {
      const f = o.fire;
      if (b.dodgeFor !== f) {
        // decide once per shot: fair warning is the line showing for a while (or a tell that is not a snap tap)
        b.dodgeFor = f; b.seenAim = 0;
        // (a tap only glows for its tell, with no line to read, so it is harder to see coming than a held shot)
        const tapShot = f.st === 'tellTap' || f.st === 'press';
        const chance = sk < 0.5 ? 0.15 : sk < 0.95 ? (tapShot ? 0.35 : 0.5) : (tapShot ? 0.6 : 0.85);
        b.willDodge = Math.random() < chance;
      }
      if (f.st === 'aim') b.seenAim = (b.seenAim || 0) + dt;
      const tell = f.st === 'tell' || f.st === 'tellTap';
      const left = S.TELL - f.t;
      const warned = f.st === 'tell' ? (b.seenAim > 0.25 || sk >= 0.95) : sk >= 0.95 || (sk >= 0.6 && f.t > 0.08);
      if (tell && b.willDodge && warned && h.air < 0 && h.land <= 0 && left <= S.DODGE1 - 0.03 && left >= S.DODGE0 + 0.02) out.jump = true;
    } else if (!o.fire) b.dodgeFor = null;

    /* ----- shooting ----- */
    const can = h.rech <= 0 && h.noFire <= 0 && st.firing && h.air < 0 && h.land <= 0;
    const oOpen = o.safe <= S.TELL + 0.05 && (!(o.cloakT > 0) || Math.hypot(o.x - h.x, o.z - h.z) < 3);
    let turnTo = null;
    if (b.shot) {
      // a shot under way: hold until the line ends on the vest (or long enough), then let go
      const sh = b.shot; sh.t += dt;
      const f = h.fire;
      if (!f && sh.t > 0.05) b.shot = null;          // fired (or a jump let go of it)
      else if (sh.kind === 'tap') out.act = sh.t < 0.03;
      else {
        const lineOn = h.line && h.line.hits.length && h.line.hits[0].id === o.id;
        // (a line off the vest: it keeps aiming a while for the vest to come back into it, then lets go anyway)
        const longEnough = sh.t > sh.hold + (lineOn ? 0 : 1.3);
        out.act = !(f && f.st === 'aim' && (lineOn && sh.t > sh.hold || longEnough || o.safe > S.TELL + 0.2 && sh.t > 1.2));
        if (f && (f.st === 'tell' || f.st === 'tellTap')) out.act = false;
      }
      if (b.shot && sh.t < 0.02) turnTo = sh.a;
    } else if (can && oOpen) {
      // what can it hit from here?
      const opts = shots(st, h, o, sk < 0.5 ? 0 : sk < 0.95 ? 1 : 2);
      const see = opts.some(s => s.n === 0);
      if (!see || b.seeT === 0) b.reactX = Math.random() * 0.12; // (a little different each time, like anyone)
      b.seeT = see ? b.seeT + dt : 0;
      // at its spot, ready, and no shot of any kind for a while: the spot is a dud, find another
      if (!opts.length && b.arrived && b.goalK != null) {
        b.noLineT = (b.noLineT || 0) + dt;
        if (b.noLineT > (sk < 0.5 ? 1.6 : 0.9)) {
          const [ux, uz] = cellXZ(m, b.goalK);
          b.duds = (b.duds || []).filter(u => st.t - u.t < 6); b.duds.push({ x: ux, z: uz, t: st.t });
          b.noLineT = 0; b.replan = 0;
        }
      } else b.noLineT = 0;
      // (Easy also takes a breath after each shot of its own, so a child gets time to answer)
      const react = sk < 0.5 ? 0.75 + (st.t - (b.lastShot || -9) < 3 ? 0.6 : 0) : sk < 0.95 ? 0.32 : 0.14;
      let pick = null;
      for (const s of opts) {
        if (s.n === 0 && b.seeT < react + (b.reactX || 0)) continue;
        if (s.n >= 1 && sk < 0.95 && s.d > 12) continue; // Normal: only the easy banks
        if (!pick || s.n < pick.n || (s.n === pick.n && s.d < pick.d)) pick = s;
      }
      // (never into a wall it is touching: the first stretch of the beam must be long enough)
      // (a vest right in front of it is fine: the first stretch ends on the vest)
      if (pick && pick.segs.length && (pick.n === 0 || Math.hypot(pick.segs[0].x1 - pick.segs[0].x0, pick.segs[0].z1 - pick.segs[0].z0) > 0.5)) {
        let a = pick.a;
        if (sk < 0.5) a += (Math.random() - 0.5) * 0.66;  // Easy is not quite on target
        else if (sk < 0.95) a += (Math.random() - 0.5) * 0.12;
        // straight shots are taps (a held line warns the other player); Normal holds the long ones to be sure of them
        const tap = pick.n === 0 && pick.d < (sk < 0.5 || sk >= 0.95 ? 99 : 7);
        b.shot = { a, n: pick.n, kind: tap ? 'tap' : 'hold', hold: S.HOLD + 0.06 + (sk < 0.95 ? 0.3 : 0.12) + Math.random() * 0.15, t: 0 };
        b.lastShot = st.t; b.seeT = 0;
        out.act = true; turnTo = a;
      }
    } else b.seeT = 0;

    /* ----- moving ----- */
    b.goalT += dt; b.replan -= dt;
    // the run's own direction: when it last turned right round
    // (counted a little more keenly than the two-a-second rule, so the limiter below always gets in first)
    if (Math.hypot(h.vx, h.vz) > 0.9) { const a = Math.atan2(h.vz, h.vx); if (b.runA != null && Math.abs(angDiff(a, b.runA)) > 1.5) { b.lastRev = st.t; (b.revs || (b.revs = [])).push(st.t); } b.runA = a; }
    if (b.revs) while (b.revs.length && b.revs[0] < st.t - 1.3) b.revs.shift();
    if (h.x !== b.lastX || h.z !== b.lastZ) { const mvd = Math.hypot(h.x - b.lastX, h.z - b.lastZ); b.stuckT = mvd < 0.3 * dt ? b.stuckT + dt : 0; }
    b.lastX = h.x; b.lastZ = h.z;
    if (b.replan <= 0 || b.goalK == null || !m.ok[b.goalK] || b.stuckT > 0.6 || (b.aimedAt && !b.wasAimed)) {
      pickGoal(b, st, h, o, sk, m);
      b.replan = (sk < 0.5 ? 0.9 : 0.55) + Math.random() * 0.3; b.stuckT = 0;
    }
    b.wasAimed = b.aimedAt;
    let want = [0, 0];
    if (b.goalK != null && b.fieldGoal) {
      const [gx, gz] = cellXZ(m, b.goalK), dG = Math.hypot(gx - h.x, gz - h.z);
      // arrived (with a margin, so it never hunts back and forth over the spot)
      // (a spot in the open is a place to strafe about, so it counts as reached for longer)
      const open = !m.cover[b.goalK];
      if (b.arrivedK !== b.goalK) b.arrived = false;
      if (dG < 0.28) { b.arrived = true; b.arrivedK = b.goalK; } else if (dG > (open ? 2.4 : 0.75)) b.arrived = false;
      if (!b.arrived) {
        // follow the way down the field, aiming at the furthest point along it that is in straight reach
        let k = nearOk(m, cellOf(m, h.x, h.z)), tx = gx, tz = gz;
        const F = b.fieldGoal;
        if (!straight(m, h.x, h.z, gx, gz)) {
          let far = null;
          for (let s = 0; s < 24; s++) {
            const i = k % m.nx, j = Math.floor(k / m.nx); let nk = -1, nd = F[k];
            for (const [di, dj] of N8) { const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= m.nx || jj >= m.nz) continue; const kk = jj * m.nx + ii; if (m.ok[kk] && F[kk] < nd) { nd = F[kk]; nk = kk; } }
            if (nk < 0) break;
            k = nk; const [cx, cz] = cellXZ(m, k);
            if (straight(m, h.x, h.z, cx, cz)) far = [cx, cz]; else if (far) break;
          }
          if (far) { tx = far[0]; tz = far[1]; } else { const [cx, cz] = cellXZ(m, k); tx = cx; tz = cz; }
        }
        const d = Math.hypot(tx - h.x, tz - h.z) || 1;
        const slow = Math.max(0.3, Math.min(1, dG / 0.9));
        want = [(tx - h.x) / d * slow, (tz - h.z) / d * slow];
      } else if (open || b.aimedAt) {
        // at the spot but in the open (or in a line): strafe across the other hero's view, never a stand; it turns
        // back after a while, when it has strayed far from the spot, or when the way is blocked
        b.sideT -= dt;
        const a = Math.atan2(o.x - h.x, o.z - h.z) + Math.PI / 2, sx = Math.sin(a) * b.side, sz = Math.cos(a) * b.side;
        const away = (h.x - gx) * sx + (h.z - gz) * sz;
        const blocked = !m.ok[cellOf(m, h.x + sx * 0.5, h.z + sz * 0.5)];
        if ((b.sideT <= 0 || away > 1.8 || blocked) && st.t - (b.flipAt || -9) > 0.7 && st.t - (b.lastRev || -9) > 0.6) {
          b.side = -b.side; b.sideT = 1.3 + Math.random() * 0.8; b.flipAt = st.t;
          if (!m.ok[cellOf(m, h.x - sx * 0.5, h.z - sz * 0.5)]) b.replan = 0; // boxed in both ways: somewhere else
        }
        want = [Math.sin(a) * b.side * 0.75, Math.cos(a) * b.side * 0.75];
      }
    }
    // step out of an aiming line on its vest (Hard always; Normal sometimes): across the last stretch of the line
    if (b.aimedAt && b.threatSegs && sk >= 0.6 && o.fire && o.fire.st === 'aim' && (sk >= 0.95 || b.willDodge)) {
      const g = b.threatSegs[b.threatSegs.length - 1], dx = g.x1 - g.x0, dz = g.z1 - g.z0, L = Math.hypot(dx, dz) || 1;
      let px = -dz / L, pz = dx / L;
      if (b.sideOut == null || b.dodgeFor !== b.sideFor) { b.sideFor = b.dodgeFor; b.sideOut = m.ok[cellOf(m, h.x + px * 0.8, h.z + pz * 0.8)] ? 1 : -1; }
      px *= b.sideOut; pz *= b.sideOut;
      want = [want[0] * 0.3 + px, want[1] * 0.3 + pz];
    }
    // a smooth push (no jitter): it turns toward what it wants at a steady rate
    if (turnTo == null) {
      const k = Math.min(1, dt * 9);
      b.mv = [b.mv[0] + (want[0] - b.mv[0]) * k, b.mv[1] + (want[1] - b.mv[1]) * k];
    }
    const s = Math.hypot(b.mv[0], b.mv[1]);
    if (s > 0.22) { out.ax = b.mv[0] / Math.max(1, s); out.ay = b.mv[1] / Math.max(1, s); }
    // never more than two turns right round in a second: a third waits (it carries on the way it is running)
    if (b.revs && b.revs.length >= 2 && b.runA != null && (out.ax || out.ay) && Math.abs(angDiff(Math.atan2(out.ay, out.ax), b.runA)) > 1.4) {
      const sp = Math.hypot(out.ax, out.ay);
      if (Math.hypot(h.vx, h.vz) > 0.9) { out.ax = Math.cos(b.runA) * sp; out.ay = Math.sin(b.runA) * sp; } else { out.ax = 0; out.ay = 0; }
    }
    // turning to a shot: this step's push exactly that way (the hero faces the way it is pushed; the run carries on)
    if (turnTo != null) { out.ax = Math.sin(turnTo) * 0.5; out.ay = Math.cos(turnTo) * 0.5; }
    // in the tell or while aiming the push keeps it moving (facing stays locked by the rules)
    if (out.jump && b.sayT <= 0 && Math.random() < 0.3) { b.dodgeSay = true; }
    if (b.dodgeSay && h.air < 0 && h.stat.dodges > (b.dodgesSeen || 0)) { cpuSay(p, 'Missed me!'); b.sayT = 8; b.dodgeSay = false; }
    b.dodgesSeen = h.stat.dodges;
    return out;
  }
  return { reset, think, shots, buildMap, field, mapKey };
})();

cpuBrain('arcadelaser', {
  reset(b) { ARCADELASER_CPU.reset(b); },
  bubblePos(p) {
    const st = G.mst; if (!st || !st.heroes || typeof K3D.toScreen !== 'function') return null;
    const h = st.heroes[p.id], q = K3D.toScreen(h.x, 1.7 + h.y, h.z); return q && q.z < 1 ? { x: q.x, y: q.y - 10 } : null;
  },
  think(b, p, o, dt, info) { return ARCADELASER_CPU.think(b, p, o, dt, info); },
});
