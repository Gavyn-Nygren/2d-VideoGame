/* Pip & Bo - Level 4-1 King of the Hill (versus). */
'use strict';

/* ===== level modes: insert new MODES here =====
   One block per mode, e.g.  MODES.hill = { setup(st, L) {...}, resetRound(n) {...}, step(dt) {...}, ... };
   Then add the level def (mode: 'hill', match: { bestOf: 5 }, act: { label: 'punch' }, world: 3, kind: 'versus')
   at the END of the LEVELS array. See API.md. */

/* ---------- 4-1 King of the Hill (mode 'koth') ----------
   Stand ALONE on the flat top of the hill and your meter fills; first to 10 s wins the round (best of 5, 70 s clock).
   Everyone wears a big boxing glove: tap punch for a quick jab, hold it and the glove puffs up (charge ring fills,
   1.0 s to a MEGA), let go to throw a lunging punch. Big hits knock stars (meter seconds) out of the victim.
   Catch-up: the Comeback Glove grows on whoever has had less hill time this match; the leader flies farther.
   Round twists: 1 Classic Hill, 2-4 a shuffle of Mega Mitts / Springs / Golden Glove, 5 Shrinking Hill. */
const KOTH = {
  // round
  target: 10,          // solo hill seconds to win a round
  hotAt: 45, hotMul: 2,// after 45 s of round time, hill time counts double
  tieBand: 0.1,        // at the 70 s bell (def.match.roundTime), meters closer than this are a tied round (replayed)
  sdTarget: 3,         // target in a sudden-death replay
  zoneUp: 45,          // feet may be up to 45 px above the summit and still count
  // glove
  tapT: 0.15,          // released sooner = jab (power 0)
  chargeT: 1.0,        // hold time to full power
  fullHold: 1.5,       // full charge fires by itself after this long; the last warnT of it flashes
  warnT: 0.5,
  chargeSpeed: 0.5,    // run speed while charging (x PHYS.maxRun): the lever against always-charge (0.55 -> charger 55 %, 0.5 -> 48 %)
  wobSpeed: 0.5,       // run speed while wobbling after a big miss
  jab:  { kx: 300, ky: -200, stun: 0.14, reach: 22, cd: 0.28 },              // power 0
  full: { kx: 880, ky: -440, stun: 0.50, reach: 34, cd: 0.55, lunge: 420 },  // power 1; everything lerps by power
  lungeMin: 0.4,       // power >= 0.4: the puncher lunges (vx = face * max(|vx|, lunge * power))
  mega: 1.12,          // power exactly 1: knockback x1.12, POW!
  kxMax: 1600,         // clamp on |knockback vx| (13 px a tick: can't tunnel a 30 px tile)
  activeT: 0.10,       // a thrown punch can connect for 0.1 s (one hit at most)
  box: { back: 4, up: 12, down: 12 }, // hitbox: from 4 px inside your front edge to `reach` px ahead, 12 px above/below you
  whiffAt: 0.75, whiffT: 0.4, // a missed punch of power >= 0.75: 0.4 s wobble (half speed, can't start a punch)
  armorAt: 0.5,        // charging at >= 0.5: weaker punches push you half as far and don't stun you
  dropAt: 0.5,         // hit with power >= 0.5 (or stomped): your charge is dropped
  hitSafe: 0.2,        // after a hit's stun ends, punches under armorAt can't hit you for 0.2 s more
  clashBand: 0.2, clashKx: 300, clashKy: -200, clashStun: 0.15,
  wallMin: 420, wallBounce: 0.45, // launched into a wall faster than 420 px/s: bounce back at 45 %
  // catch-up
  kingKB: 0.5,         // knockback taken x (1 + 0.5 * meter / target): the closer to winning, the farther you fly
  steal: 2,            // meter seconds knocked out = steal * power (power >= 0.5), in half seconds
  stompSteal: 0,       // meter seconds a stomp knocks out of the one stomped (1.5 made non-stop jumping a 45 % strategy: off)
  cbHi: 0.47, cbLo: 0.30, cbMin: 5,  // comeback glove strength b: 0 at a 47 % share of match hill time, 1 at 30 %
  cbCharge: 0.5, cbKB: 1.5, cbReach: 14, cbTake: 0.8, cbDraw: 0.35, // at b = 1 (pow(x, b) for multipliers)
  // (lead review: the kid-masher won only 8 % of rounds) the comeback player also gets, all scaled by b:
  cbJab: 1.5,          // jabs that push 1.5^b farther on top of cbKB...
  cbSafe: 0.5,         // ...and from b >= 0.5 ignore the victim's hitSafe window
  cbZone: 60,          // a wider zone: up to 60 px more on each side, and the top step there counts (drawn in gold)
  cbWhiff: 0.5,        // a shorter wobble after a big miss (x0.5 at b = 1)
  cbSteal: 0.5,        // fewer stars knocked out of you (x0.5 at b = 1)
  cbRate: 1.6,         // hill time counts x1.6 at b = 1 (shown on the sign as a gold "x1.6"; playtest: 1.3 left a kid at 6-8 % of rounds)
  chargeMin: 0.45,     // the charge time never drops below 0.45 s (comeback x Mega Mitts was 0.3 s: a summit turtle won 79 %)
  stunMax: 1.15,       // never stunned for more than this in any 2 s (punch and stomp stuns are shortened to fit)
  // twists
  mitts: { charge: 0.6, kb: 1.25, reach: 10, draw: 1.4 },
  springV: 950,
  gold: { first: 6, again: 10, kb: 1.25, steal: 1.5 },
  shrink: { to: 60, over: 30 },
  idlePause: 40,       // nobody touched anything for 40 s of a live round: pause
  drawMax: 1.7,        // the glove is never drawn bigger than this (it would cover the face)
};
const KOTH_TWISTS = {
  classic: { name: 'Classic Hill', hint: 'Stand on top to score!' },
  mitts: { name: 'Mega Mitts', hint: 'Giant gloves! Charges fast, hits hard.' },
  springs: { name: 'Springs', hint: 'Springs at the foot of the hill!' },
  gold: { name: 'Golden Glove', hint: 'Grab the golden glove for one super punch!' },
  shrink: { name: 'Shrinking Hill', hint: 'Final round: the top gets smaller!' },
  sd: { name: 'Sudden death!', hint: 'First to 3 seconds wins' },
};
function kothPl() {
  return { hold: -1, charge: 0, autoT: 0, tickT: 0, pulseT: 0, fullT: -1, cd: 0, act: 0, power: 0, punchGold: false, hitDone: false,
    wob: 0, safe: 0, launched: false, vxPre: 0, gold: false, b: 0, drawB: 0, cbShown: false, stuck: 0,
    punchT: 9, gs: 1, gv: 0, flyD: -1, flyX: 0, lastBy: -1 };
}
const kothLerp = (a, b, t) => a + (b - a) * t;
const kothCharging = s => s.hold >= 0;
function kothChargeT(k) { const st = G.mst; return KOTH.chargeT * Math.max(KOTH.chargeMin, Math.pow(KOTH.cbCharge, st.pl[k].b) * (st.twist === 'mitts' ? KOTH.mitts.charge : 1)); }
function kothReach(k, pw) {
  const st = G.mst;
  return KOTH.jab.reach + (KOTH.full.reach - KOTH.jab.reach) * pw + KOTH.cbReach * st.pl[k].b + (st.twist === 'mitts' ? KOTH.mitts.reach : 0);
}
function kothBox(p, pw) {
  const r = kothReach(p.id, pw), B = KOTH.box;
  return { x: p.face > 0 ? p.x + p.w - B.back : p.x - r, y: p.y - B.up, w: r + B.back, h: p.h + B.up + B.down };
}
function kothInZone(p) {
  const st = G.mst, cx = p.x + p.w / 2, feet = p.y + p.h, x0 = st.zoneX0 + st.zx, x1 = st.zoneX1 - st.zx;
  if (!p.alive || feet < st.sumTop - KOTH.zoneUp) return false;
  if (cx > x0 && cx < x1) return feet <= st.sumTop + 1;
  // the comeback glove widens your zone: the summit's edge and the top step next to it count too
  const ext = kothCbExt(p.id, st.pl[p.id].b);
  return ext > 0 && cx > x0 - ext && cx < x1 + ext && feet <= st.sumTop + T + 1;
}
// how far the comeback zone reaches past the zone's ends (b = comeback strength); in the Shrinking Hill it shrinks too,
// at half the speed (60 px -> 30 px past the shrunken ends), so the comeback player's top also gets smaller
function kothCbExt(k, b) {
  const st = G.mst;
  return KOTH.cbZone * b * (st.twist === 'shrink' ? 1 - 0.5 * st.zx / KOTH.shrink.to : 1);
}
// stun budget: how long p may be stunned from now so that no 2 s window holds more than KOTH.stunMax of stun
function kothStunCap(p, want, rem = Math.max(0, p.stun)) {
  const st = G.mst, recent = st.stunCnt[p.id] / 120;
  return Math.max(rem, Math.min(want, rem + Math.max(0, KOTH.stunMax - recent - rem)));
}
function kothPop(txt, x, y, o = {}) {
  G.mst.pops.push(Object.assign({ txt, x: clamp(x, 70, W - 70), y: Math.max(96, y), t: 0, life: 0.8, size: 20, col: C.paper, rise: 22, big: false }, o));
}
function kothStars(x, y, n) {
  const R = MODES.koth.rand;
  for (let i = 0; i < n; i++) {
    G.mst.stars.push({ x, y, vx: (R() * 2 - 1) * 160, vy: -220 - R() * 100, t: 0, life: 0.8, rot: R() * 6, vr: (R() - 0.5) * 12 });
  }
}
// let go of a charge without punching (deflate = it was knocked out of you: sound + grey puffs)
function kothDrop(p, deflate) {
  const s = G.mst.pl[p.id];
  if (s.hold < 0) return;
  s.hold = -1; s.charge = 0; s.autoT = 0; s.fullT = -1;
  if (deflate) {
    Sfx.play('kothDeflate', p.id);
    const gx = p.x + p.w / 2 + p.face * (p.w / 2), gy = p.y + p.h * 0.55;
    puff(gx, gy, 3, 'rgba(190,186,206,0.9)');
    s.gv -= 6;
  }
}
// throw the punch: power from the hold (a tap is a jab), lunge for big ones
function kothFire(p, s) {
  const st = G.mst, k = p.id;
  const pw0 = s.hold < KOTH.tapT ? 0 : Math.min(1, s.charge);
  const gold = s.gold, pw = gold ? 1 : pw0;
  if (gold) { s.gold = false; st.goldT = KOTH.gold.again; st.goldUsed[k]++; }
  s.power = pw; s.punchGold = gold; s.act = KOTH.activeT; s.hitDone = false; s.punchT = 0;
  s.hold = -1; s.charge = 0; s.autoT = 0; s.fullT = -1;
  s.cd = kothLerp(KOTH.jab.cd, KOTH.full.cd, pw);
  if (pw >= KOTH.lungeMin) p.vx = p.face * Math.max(Math.abs(p.vx), KOTH.full.lunge * pw);
  if (pw < 0.15) Sfx.play('kothJab', k); else Sfx.play('whoosh', k);
  s.gv += 4 + 10 * pw;
  st.rs.thrown[k]++;
}
// a punch of power pw from a lands on v
function kothHit(a, v, pw, gold) {
  const st = G.mst, sa = st.pl[a.id], sv = st.pl[v.id], K = KOTH;
  const mega = pw >= 1;
  let kx = kothLerp(K.jab.kx, K.full.kx, pw), ky = kothLerp(K.jab.ky, K.full.ky, pw), stun = kothLerp(K.jab.stun, K.full.stun, pw);
  if (mega) { kx *= K.mega; ky *= K.mega; }
  let mul = (1 + K.kingKB * st.meter[v.id] / st.target) * Math.pow(K.cbKB, sa.b) * Math.pow(K.cbTake, sv.b);
  if (pw < 0.15) mul *= Math.pow(K.cbJab, sa.b);
  if (st.twist === 'mitts') mul *= K.mitts.kb;
  if (gold) mul *= K.gold.kb;
  const armored = pw < K.armorAt && kothCharging(sv) && sv.charge >= K.armorAt;
  if (armored) { mul *= 0.5; stun = 0; }
  stun = kothStunCap(v, stun);
  knock(v, a.face * Math.min(K.kxMax, kx * mul), Math.min(v.vy, ky * (0.6 + 0.4 * mul)), stun, 0);
  sv.safe = stun + K.hitSafe; sv.lastBy = a.id;
  if (pw >= K.lungeMin) { sv.launched = true; sv.flyD = 0; sv.flyX = v.x; }
  if (pw >= K.dropAt) kothDrop(v, true);
  // a big hit on someone who was scoring or close to winning (before its stars come out): 'Knocked off the hill!'
  if (pw >= 0.5) st.bigHit[v.id] = { t: G.match.roundT, scoring: st.state === v.id, meter: st.meter[v.id] };
  st.rs.hits[a.id]++;
  const hx = v.x + v.w / 2 - a.face * v.w * 0.4, hy = v.y + v.h * 0.5;
  sa.gv -= 5; // the glove squashes on contact
  if (armored) {
    puff(hx, hy, 4, 'rgba(255,255,255,0.9)'); Sfx.play('kothJabHit', a.id); rumble(v.id, 0.1, 0.2, 40);
  } else if (pw < 0.15) {
    puff(hx, hy, 4, 'rgba(255,255,255,0.9)'); Sfx.play('kothJabHit', a.id); rumble(v.id, 0.2, 0.3, 60);
  } else if (!mega) {
    burst(hx, hy, '#ffffff', 4 + Math.round(5 * pw)); burst(hx, hy, PCOL[v.id], 4 + Math.round(5 * pw));
    if (pw >= 0.5) kothPop('BAM!', hx, v.y - 18, { size: 22, life: 0.6 });
    if (!reduceMotion) G.shake = Math.max(G.shake, 0.06 + 0.08 * pw);
    Sfx.play('kothHit', a.id);
    rumble(v.id, 0.4 + 0.4 * pw, 0.4, 120 + 100 * pw); rumble(a.id, 0.2, 0.3, 70);
  } else {
    burst(hx, hy, C.gold, 18); burst(hx, hy, '#ffffff', 10);
    kothPop('POW!', hx, v.y - 22, { size: 30, col: C.gold, life: 0.75, big: true, rise: 20 });
    if (!reduceMotion) G.shake = Math.max(G.shake, 0.18);
    Sfx.play('kothMega', a.id);
    rumble(v.id, 1.0, 0.6, 260); rumble(a.id, 0.4, 0.3, 120);
    st.megas[a.id]++; st.rs.megas[a.id]++;
  }
  // knock-out stars: meter seconds lost (in half seconds), they burst out of the victim and are gone
  if (pw >= 0.5) kothKnockOut(a, v, K.steal * pw * (gold ? K.gold.steal : 1), mega ? 54 : 44);
}
function kothKnockOut(a, v, secs, dy) {
  const st = G.mst, sv = st.pl[v.id];
  if (st.meter[v.id] <= 0 || secs <= 0) return;
  const want = Math.max(0.5, Math.round(2 * secs * (1 + (KOTH.cbSteal - 1) * sv.b)) / 2);
  const lost = Math.min(st.meter[v.id], want);
  st.meter[v.id] -= lost; st.stolen[a.id] += lost; st.rs.stolen += lost;
  st.lastSec[v.id] = Math.floor(st.meter[v.id]);
  kothStars(v.x + v.w / 2, v.y + 4, Math.max(1, Math.round(lost / 0.5)));
  const sh = Math.round(lost * 2) / 2;
  kothPop('−' + (sh % 1 ? sh.toFixed(1) : sh) + ' s', v.x + v.w / 2, v.y - dy, { size: 17, col: C.gold, life: 0.9, rise: 26, small: true });
  Sfx.play('kothStars', v.id); rumble(v.id, 0.3, 0.5, 120);
}

MODES.koth = {
  rand: Math.random,
  K: KOTH,
  inZone: p => kothInZone(p),
  reach: (k, pw) => kothReach(k, pw),
  chargeT: k => kothChargeT(k),
  setup(st, L) {
    const R = MODES.koth.rand;
    // markers: h = hill zone (air), g = golden glove spots, J = spring pads (parseLevel already made them L.pads)
    let hx0 = 99, hx1 = -1, hy = 10;
    st.goldSpots = [];
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const ch = L.grid[y][x];
      if (ch === 'h') { hx0 = Math.min(hx0, x); hx1 = Math.max(hx1, x); hy = y; L.grid[y][x] = '.'; }
      else if (ch === 'g') { const gx = (x + 1) * T; st.goldSpots.push({ x: gx, y: y * T + T / 2, side: gx < W / 2 ? 0 : 1 }); L.grid[y][x] = '.'; }
    }
    if (hx1 < 0) { hx0 = 13; hx1 = 18; }
    st.zoneX0 = hx0 * T; st.zoneX1 = (hx1 + 1) * T; st.sumTop = (hy + 1) * T; st.hx = (st.zoneX0 + st.zoneX1) / 2;
    st.springs = L.pads.map(p => ({ tx: p.tx, ty: p.ty, x: p.tx * T + T / 2, y: (p.ty + 1) * T, t: 0, dir: 0 }));
    L.pads = [];
    // twist order: round 1 plain, 2-4 a fresh shuffle every match, 5 (only at 2-2) the shrinking hill
    const mid = ['mitts', 'springs', 'gold'];
    for (let i = mid.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [mid[i], mid[j]] = [mid[j], mid[i]]; }
    st.twists = ['classic', ...mid, 'shrink'];
    // match-long numbers
    st.tot = [0, 0]; st.megas = [0, 0]; st.stolen = [0, 0]; st.splats = [0, 0]; st.longest = { k: -1, d: 0 };
    st.goldUsed = [0, 0]; st.contestShown = false;
    st.pl = [kothPl(), kothPl()]; st.pops = []; st.stars = []; st.meter = [0, 0]; st.target = KOTH.target; st.zx = 0; st.twist = 'classic';
  },
  resetRound(n, info) {
    const st = G.mst;
    st.round = n;
    st.twist = st.twists[clamp(n, 1, st.twists.length) - 1];
    st.sd = !!info.suddenDeath;
    st.target = st.sd ? KOTH.sdTarget : KOTH.target;
    st.meter = [0, 0]; st.lastSec = [0, 0]; st.rt = [0, 0];
    st.hot = false; st.hotT = 0; st.zx = 0;
    st.state = -1; st.crownT = 0; st.contestT = 0; st.contestRun = 0; st.behind = [0, 0];
    st.bigHit = [{ t: -99, scoring: false, meter: 0 }, { t: -99, scoring: false, meter: 0 }];
    st.gold = null; st.goldT = st.twist === 'gold' ? KOTH.gold.first : Infinity;
    st.idleT = 0; st.sawPause = false; st.endDone = false;
    st.stunRing = [new Uint8Array(240), new Uint8Array(240)]; st.stunCnt = [0, 0]; st.stunI = 0;
    st.pl = [kothPl(), kothPl()]; st.pops = []; st.stars = [];
    for (const sp of st.springs) sp.t = 0;
    st.rs = { hits: [0, 0], megas: [0, 0], thrown: [0, 0], whiffs: [0, 0], clashes: 0, splats: 0, stolen: 0, contested: 0, goldTaken: 0, stomps: [0, 0], springs: 0 };
    MODES.koth.comeback(0);
    for (const s of st.pl) s.drawB = s.b;
  },
  go() {
    const st = G.mst;
    for (const p of G.players) {
      const s = st.pl[p.id];
      if (s.b > 0.5 && !s.cbShown) { s.cbShown = true; kothPop('Comeback glove!', p.x + p.w / 2, p.y - 34, { size: 16, col: C.gold, life: 0.9, rise: 30, big: true }); }
    }
  },
  // comeback glove strength from each player's share of this match's solo hill time
  comeback(dt) {
    const st = G.mst, tt = st.tot[0] + st.tot[1];
    for (const p of G.players) {
      const s = st.pl[p.id];
      s.b = tt < KOTH.cbMin ? 0 : clamp((KOTH.cbHi - st.tot[p.id] / tt) / (KOTH.cbHi - KOTH.cbLo), 0, 1);
      if (dt) s.drawB += (s.b - s.drawB) * Math.min(1, dt * 4);
    }
  },
  pre(dt) {
    const st = G.mst;
    // released while paused: that charge is dropped silently, no punch (CRITIQUE C3)
    if (st.sawPause) { st.sawPause = false; for (const p of G.players) if (!p.input.act) kothDrop(p, false); }
    for (const p of G.players) {
      const k = p.id, s = st.pl[k];
      s.cd = Math.max(0, s.cd - dt); s.act = Math.max(0, s.act - dt); s.wob = Math.max(0, s.wob - dt); s.safe = Math.max(0, s.safe - dt);
      const fresh = p.pendingAct; p.pendingAct = false; // consumed every live tick: a press at a bad moment is dropped (C1)
      if (fresh && s.hold < 0 && p.alive && p.stun <= 0 && s.cd <= 0 && s.wob <= 0 && s.act <= 0) {
        s.hold = 0; s.charge = 0; s.autoT = 0; s.tickT = 0; s.pulseT = 0; s.fullT = -1;
      }
      if (s.hold >= 0) {
        if (!p.alive) kothDrop(p, false);
        else if (!p.input.act && p.stun <= 0) kothFire(p, s); // let go: check before this tick grows the hold (17 ticks = a jab)
        else {
          if (p.stun <= 0) { // the charge freezes while you're dazed
            s.hold += dt;
            const was = s.charge;
            s.charge = Math.min(1, s.charge + dt / kothChargeT(k));
            if (s.charge >= 1 && was < 1) { s.fullT = 0; Sfx.play('kothFull', k); rumble(k, 0, 0.25, 50); s.pulseT = 0.25; s.gv += 6; }
            else if (s.charge < 1 && s.hold >= KOTH.tapT) {
              s.tickT -= dt;
              if (s.tickT <= 0) { s.tickT += 0.1; Sfx.tone((300 + 400 * s.charge) * (k ? 0.84 : 1), 0.05, 'square', 0.02); }
            }
          }
          if (s.charge >= 1) {
            s.autoT += dt; s.pulseT -= dt;
            if (s.pulseT <= 0) { s.pulseT += 0.25; rumble(k, 0, 0.12, 40); }
          }
          if (s.autoT >= KOTH.fullHold) kothFire(p, s);
        }
      }
      s.vxPre = p.vx;
    }
  },
  step(dt) {
    const st = G.mst, ps = G.players, K = KOTH, m = G.match;
    // 1. charging / wobbling players are slow (clamped here, after the move; never in the engine)
    for (const p of ps) {
      const s = st.pl[p.id];
      if ((s.hold >= 0 || s.wob > 0) && !s.launched && s.act <= 0) {
        const lim = PHYS.maxRun * (s.hold >= 0 ? K.chargeSpeed : K.wobSpeed);
        p.vx = clamp(p.vx, -lim, lim);
      }
    }
    // 2. punches: who connects this tick
    const want = [null, null];
    for (const p of ps) {
      const s = st.pl[p.id], o = other(p), so = st.pl[o.id];
      if (s.act <= 0 || s.hitDone || !p.alive || !o.alive) continue;
      const bx = kothBox(p, s.power);
      if (!rectHit(o, bx.x, bx.y, bx.w, bx.h)) continue;
      const ignoreSafe = s.power < 0.15 && s.b >= K.cbSafe;
      if (s.power < K.armorAt && so.safe > 0 && !ignoreSafe) continue;
      want[p.id] = s.power;
    }
    if (want[0] !== null && want[1] !== null) {
      st.rs.clashes++;
      if (Math.abs(want[0] - want[1]) < K.clashBand) {
        for (const p of ps) { const s = st.pl[p.id]; knock(p, -p.face * K.clashKx, K.clashKy, K.clashStun, 0); s.hitDone = true; s.act = 0; s.gv -= 5; }
        const mx = (ps[0].x + ps[1].x + PW) / 2, my = Math.min(ps[0].y, ps[1].y) + 10;
        burst(mx, my, '#ffffff', 10); kothPop('CLASH!', mx, my - 26, { size: 20, life: 0.6 });
        Sfx.play('kothClash'); rumble(0, 0.3, 0.3, 80); rumble(1, 0.3, 0.3, 80);
      } else {
        const a = want[0] > want[1] ? 0 : 1;
        kothHit(ps[a], ps[1 - a], want[a], st.pl[a].punchGold);
        st.pl[a].hitDone = true; st.pl[1 - a].hitDone = true; st.pl[1 - a].act = 0;
      }
    } else for (const p of ps) if (want[p.id] !== null) { kothHit(p, other(p), want[p.id], st.pl[p.id].punchGold); st.pl[p.id].hitDone = true; }
    // 3. a big punch that hit nothing leaves you wobbling
    for (const p of ps) {
      const s = st.pl[p.id];
      if (s.act > 0 && s.act - dt <= 1e-9 && !s.hitDone && s.power >= K.whiffAt) {
        s.wob = K.whiffT * (1 + (K.cbWhiff - 1) * s.b); st.rs.whiffs[p.id]++; Sfx.play('kothWhiff', p.id); s.hitDone = true;
      }
    }
    // 4. wall splats, flights, safety net
    for (const p of ps) {
      const s = st.pl[p.id];
      if (!p.alive) continue;
      if (s.launched && Math.abs(s.vxPre) > K.wallMin && p.vx === 0) {
        const d = Math.sign(s.vxPre), tx = Math.floor((d > 0 ? p.x + p.w + 1 : p.x - 1) / T), ty = Math.floor((p.y + p.h / 2) / T);
        if (solidFor(tile(tx, ty), p)) {
          p.vx = -s.vxPre * K.wallBounce; p.sx = 0.6; p.sy = 1.3;
          puff(d > 0 ? p.x + p.w : p.x, p.y + p.h / 2, 8, 'rgba(255,255,255,0.9)');
          kothPop('SPLAT!', p.x + p.w / 2 - d * 30, p.y - 10, { size: 20, life: 0.6 });
          if (!reduceMotion) G.shake = Math.max(G.shake, 0.12);
          Sfx.play('kothSplat', p.id); rumble(p.id, 0.8, 0.4, 150);
          if (s.lastBy >= 0) st.splats[s.lastBy]++;
          st.rs.splats++;
        }
      }
      if (s.flyD >= 0) {
        s.flyD += Math.abs(p.x - s.flyX); s.flyX = p.x;
        if (p.grounded) { if (s.flyD > st.longest.d) st.longest = { k: p.id, d: s.flyD }; s.flyD = -1; }
      }
      if (s.launched && !p.grounded && Math.abs(p.vx) > 260 && (G.tickN & 1)) puff(p.x + p.w / 2, p.y + p.h / 2, 1, 'rgba(255,255,255,0.7)');
      if (s.launched && p.grounded && p.stun <= 0) s.launched = false;
      // never stuck inside the hill (it can't happen; this is a net)
      let inside = false;
      for (let ty = Math.floor((p.y + 1) / T); ty <= Math.floor((p.y + p.h - 1) / T); ty++)
        for (let tx = Math.floor((p.x + 1) / T); tx <= Math.floor((p.x + p.w - 1) / T); tx++) if (solidFor(tile(tx, ty), p)) inside = true;
      s.stuck = inside ? s.stuck + 1 : 0;
      if (s.stuck >= 3) { s.stuck = 0; kothDrop(p, false); respawn(p); }
    }
    // 5. twists
    if (st.twist === 'springs') for (const p of ps) {
      if (!p.alive || !p.grounded) continue;
      const cx = p.x + p.w / 2;
      for (const sp of st.springs) if (Math.abs(cx - sp.x) < 13 && Math.abs(p.y + p.h - sp.y) < 0.5) {
        p.vy = -K.springV; p.grounded = false; p.jumping = false; p.sx = 0.7; p.sy = 1.35; sp.t = 0.2;
        Sfx.play('boing', p.id); rumble(p.id, 0, 0.35, 70); puff(sp.x, sp.y - 6, 5, 'rgba(255,170,210,0.9)');
        st.rs.springs++;
      }
    }
    for (const sp of st.springs) sp.t = Math.max(0, sp.t - dt);
    if (st.twist === 'gold') MODES.koth.goldStep(dt);
    if (st.twist === 'shrink') st.zx = K.shrink.to * Math.min(1, m.roundT / K.shrink.over);
    // 6. scoring: only a player alone in the zone scores
    const z = ps.map(kothInZone), rate = st.hot ? K.hotMul : 1;
    let state = -1;
    if (z[0] && z[1]) {
      state = 2; st.rs.contested += dt; st.contestRun += dt;
      st.contestT -= dt; if (st.contestT <= 0) { st.contestT = 0.5; Sfx.play('kothContest'); }
      // the first long standoff of the match says why nobody scores (once per match)
      if (st.contestRun > 2 && !st.contestShown) { st.contestShown = true; kothPop('Both on top: no score!', st.hx, st.sumTop - 92, { size: 16, life: 1.6, rise: 12 }); }
    } else {
      st.contestT = 0; st.contestRun = 0;
      for (const p of ps) if (z[p.id]) {
        const k = p.id;
        state = k;
        st.meter[k] += dt * rate * (1 + (K.cbRate - 1) * st.pl[k].b); st.tot[k] += dt; st.rt[k] += dt;
        const sec = Math.floor(st.meter[k]);
        if (sec > st.lastSec[k]) { Sfx.tone(440 + 40 * Math.min(sec, 12), 0.05, 'triangle', st.target - sec <= 3 ? 0.05 : 0.03); }
        st.lastSec[k] = sec;
      }
    }
    if (state !== st.state) {
      if ((state === 0 || state === 1) && st.crownT <= 0) { Sfx.play('crown'); rumble(state, 0, 0.3, 60); st.crownT = 1; }
      st.state = state;
    }
    st.crownT -= dt;
    // "What a comeback!": you were 5 s behind someone who was close to winning
    for (const k of [0, 1]) if (st.meter[1 - k] >= 0.7 * st.target) st.behind[k] = Math.max(st.behind[k], st.meter[1 - k] - st.meter[k]);
    for (const k of [0, 1]) if (st.meter[k] >= st.target) {
      st.meter[k] = st.target;
      matchRoundEnd(k, MODES.koth.reason(k, false));
      return;
    }
    if (!st.hot && m.roundT >= K.hotAt) { st.hot = true; st.hotT = 0; Sfx.play('kothHot'); }
    // 7. comeback glove
    MODES.koth.comeback(dt);
    for (const p of ps) {
      const s = st.pl[p.id];
      if (s.b > 0.5 && !s.cbShown) { s.cbShown = true; kothPop('Comeback glove!', p.x + p.w / 2, p.y - 34, { size: 16, col: C.gold, life: 0.9, rise: 30, big: true }); }
    }
    // stunned ticks in the last 2 s (for the stun budget)
    st.stunI = (st.stunI + 1) % 240;
    for (const p of ps) { const on = p.alive && p.stun > 0 ? 1 : 0, r = st.stunRing[p.id]; st.stunCnt[p.id] += on - r[st.stunI]; r[st.stunI] = on; }
    // 8. nobody touching anything for a long time: pause the game
    if (ps.some(p => { const i = p.input; return i.left || i.right || i.jump || i.down || i.act; })) st.idleT = 0;
    else { st.idleT += dt; if (st.idleT >= K.idlePause) { st.idleT = 0; pause(); return; } }
    MODES.koth.anim(dt);
  },
  // the golden glove: appears on the side of whoever has less hill time this round; touch it to load a super punch
  goldStep(dt) {
    const st = G.mst, R = MODES.koth.rand;
    const held = st.pl.some(s => s.gold);
    if (!st.gold && !held) {
      st.goldT -= dt;
      if (st.goldT <= 0 && st.goldSpots.length) {
        const k = st.meter[0] === st.meter[1] ? (R() < 0.5 ? 0 : 1) : st.meter[0] < st.meter[1] ? 0 : 1;
        const sp = st.goldSpots.find(g => g.side === k) || st.goldSpots[0];
        st.gold = { x: sp.x, y: sp.y, t: 0 };
        burst(sp.x, sp.y, C.gold, 12); Sfx.play('ring');
      }
    }
    if (st.gold) {
      const g = st.gold;
      g.t += dt;
      const ok = G.players.filter(p => p.alive && p.stun <= 0 && rectHit(p, g.x - 13, g.y - 13, 26, 26));
      if (ok.length) {
        const p = ok.length > 1 ? ok[G.tickN & 1] : ok[0], s = st.pl[p.id];
        s.gold = true; st.gold = null; st.rs.goldTaken++;
        Sfx.play('ring', p.id); rumble(p.id, 0.2, 0.5, 120); burst(g.x, g.y, C.gold, 16);
        kothPop('Golden glove!', p.x + p.w / 2, p.y - 34, { size: 16, col: C.gold, life: 0.9, rise: 30, big: true });
      }
    }
  },
  // the round's reason line (CRITIQUE C5): how it was won, never who
  reason(k, bell) {
    const st = G.mst;
    const bh = st.bigHit[1 - k];
    if (st.behind[k] >= 5) return 'What a comeback!';
    if (bell) return 'Most hill time at the bell!';
    if (G.match.roundT - bh.t <= 2 && (bh.scoring || bh.meter >= 5)) return 'Knocked off the hill!';
    if (st.rt[1 - k] <= 0) return 'A perfect hill!';           // the loser never had the hill to themselves this round
    if (st.sd) return 'Sudden death!';
    if (st.hot) return 'Hot hill!';
    return 'King of the hill!';
  },
  timeUp() {
    const mt = G.mst.meter;
    if (Math.abs(mt[0] - mt[1]) < KOTH.tieBand) return { winner: -1, reason: 'Dead even!' };
    const k = mt[0] > mt[1] ? 0 : 1;
    return { winner: k, reason: MODES.koth.reason(k, true) };
  },
  tiebreak() {
    const t = G.mst.tot;
    if (Math.abs(t[0] - t[1]) < 0.05) return -1;
    return { winner: t[0] > t[1] ? 0 : 1, reason: 'More hill time this match!' };
  },
  // a stomp drops the charge; its stun obeys the stun budget too (a stomp needs o.stun <= 0, so nothing was left before it)
  onStomp(p, o) { const st = G.mst; o.stun = kothStunCap(o, o.stun, 0); kothDrop(o, true); st.rs.stomps[p.id]++; kothKnockOut(p, o, KOTH.stompSteal, 44); },
  onKill(p) { const s = G.mst.pl[p.id]; kothDrop(p, false); s.launched = false; s.flyD = -1; },
  // animation timers (live and frozen ticks alike)
  anim(dt) {
    const st = G.mst;
    if (st.hot) st.hotT += dt;
    for (const s of st.pl) {
      s.punchT += dt;
      if (s.fullT >= 0) s.fullT += dt;
      // the glove's size is a bouncy spring toward where it wants to be
      const want = 1 + 0.5 * (s.hold >= 0 ? s.charge : 0);
      s.gv += ((want - s.gs) * 420 - s.gv * 11) * dt;
      s.gs += s.gv * dt;
    }
    for (let i = st.pops.length - 1; i >= 0; i--) { const q = st.pops[i]; q.t += dt; if (q.t >= q.life) st.pops.splice(i, 1); }
    for (let i = st.stars.length - 1; i >= 0; i--) {
      const q = st.stars[i]; q.t += dt;
      if (q.t >= q.life) { st.stars.splice(i, 1); continue; }
      q.vy += 700 * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.rot += q.vr * dt;
    }
  },
  idle(dt) {
    const st = G.mst;
    if (!st.pl) return;
    // the round is over: gloves deflate (no punch)
    if (G.match.phase === 'end' && !st.endDone) { st.endDone = true; for (const p of G.players) kothDrop(p, false); }
    for (const sp of st.springs) sp.t = Math.max(0, sp.t - dt);
    MODES.koth.comeback(dt);
    MODES.koth.anim(dt);
  },
  stats() {
    // whole seconds; the unit is in the label ('58 s – 48 s' wraps in a 4-tile row: a C6 tile is ~150 px wide).
    // One decimal when the whole seconds are equal, so a tiebreak won on hill time matches the tile.
    const st = G.mst, close = Math.round(st.tot[0]) === Math.round(st.tot[1]);
    const out = [{ label: 'Hill time (s)', values: st.tot.map(x => close ? x.toFixed(1) : Math.round(x)) }];
    if (st.megas[0] + st.megas[1] > 0) out.push({ label: 'MEGA punches', values: st.megas.slice() });
    out.push({ label: 'Seconds stolen', values: st.stolen.map(x => Math.round(x)) });
    if (st.splats[0] + st.splats[1] > 0) out.push({ label: 'Wall splats', values: st.splats.slice() });
    const tiles = Math.round(st.longest.d / T);
    if (st.longest.k >= 0 && tiles >= 3) out.push('Longest flight: ' + NAMES[st.longest.k] + ', ' + tiles + ' tiles');
    return out;
  },

  /* ----- drawing ----- */
  draw() {
    const st = G.mst;
    if (!st.pl) return;
    if (G.mode === 'paused') st.sawPause = true;
    if (st.twist === 'springs') for (const sp of st.springs) drawPad(sp);
    kothDrawHill(st);
    kothDrawBoard(st);
    if (st.gold) kothDrawPickup(st.gold);
  },
  drawTop() {
    const st = G.mst;
    if (!st.pl) return;
    for (const p of G.players) if (p.alive) kothDrawFighter(p, st.pl[p.id], st);
    // knock-out stars
    for (const q of st.stars) {
      ctx.save(); ctx.globalAlpha = clamp((q.life - q.t) / 0.3, 0, 1);
      ctx.translate(q.x, q.y); ctx.rotate(q.rot);
      kothStarPath(0, 0, 6, 2.6); ctx.fillStyle = C.gold; ctx.fill(); ctx.strokeStyle = C.goldDark; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.restore();
    }
  },
  hud() {
    const st = G.mst, m = G.match;
    if (!st.pl || !m) return;
    const big = typeof hudBig === 'function' && hudBig(), tw0 = KOTH_TWISTS[st.twist], twist = st.twist !== 'classic';
    // a sudden death keeps its round's twist (giant gloves, springs...): the pill and the card name both
    const tw = !st.sd ? tw0 : { name: KOTH_TWISTS.sd.name, hint: twist ? 'First to ' + KOTH.sdTarget + ' seconds · ' + tw0.name : KOTH_TWISTS.sd.hint };
    const pillTxt = st.sd ? (twist ? tw0.name + ' · Sudden death' : tw.name) : tw0.name;
    // twist pill under the level pill (twist rounds only)
    if (twist || st.sd) {
      const fs = big ? 18 : 13, ph = big ? 34 : 26;
      ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
      pill(14, 46, ctx.measureText(pillTxt).width + 28, ph);
      text(pillTxt, 28, 46 + ph / 2 + 0.5, fs, C.gold, 'left', 'body');
    }
    // top right: the one live alert
    if (st.hot && (m.phase === 'live' || m.phase === 'end')) {
      const s = 'HOT HILL ×2', flash = st.hotT < 1 && Math.floor(st.hotT * 8) % 2 === 0, fs = big ? 19 : 14, ph = big ? 36 : 28;
      ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
      const sw = ctx.measureText(s).width + 28;
      const px = pill(W - 14, 12, sw, ph, 'right');
      if (flash) { ctx.fillStyle = 'rgba(255,197,61,0.35)'; rr(px, 12, sw, ph, ph / 2); ctx.fill(); }
      text(s, W - 28, 12 + ph / 2 + 0.5, fs, flash ? '#ffffff' : C.gold, 'right', 'body');
    }
    // the twist card under "Round N" / the 3-2-1 (every round)
    if (m.phase === 'ready' || m.phase === 'count') {
      const fn = big ? 34 : 26, fh = big ? 19 : 14, ph = big ? 78 : 60;
      ctx.font = '700 ' + fh + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
      const w = Math.min(W - 40, Math.max(300, ctx.measureText(tw.hint).width + 48));
      ctx.save(); ctx.globalAlpha = m.phase === 'ready' ? clamp(m.t / 0.25, 0, 1) : 1;
      ctx.fillStyle = 'rgba(28,26,54,0.82)'; rr(W / 2 - w / 2, 284, w, ph, 16); ctx.fill();
      text(tw.name, W / 2, 284 + ph * 0.35, fn, C.gold, 'center');
      text(tw.hint, W / 2, 284 + ph * 0.77, fh, C.paper, 'center', 'body');
      ctx.restore();
    }
    // pops: POW!, BAM!, SPLAT!, CLASH!, -2 s, Comeback glove!
    for (const q of st.pops) {
      const f = q.t / q.life, a = clamp((q.life - q.t) / 0.25, 0, 1);
      const sc = (q.big ? (q.t < 0.15 ? 0.4 + 0.6 * (q.t / 0.15) * 1.15 : 1 + 0.15 * Math.max(0, 1 - (q.t - 0.15) / 0.1)) : 1) * (big ? 1.3 : 1);
      ctx.save(); ctx.globalAlpha = a;
      bigText(q.txt, q.x, q.y - q.rise * f, q.size, q.col, sc);
      ctx.restore();
    }
  },
};

/* KOTH drawing helpers */
function kothStarPath(x, y, r, ri) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr2 = i % 2 ? ri : r; ctx.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); }
  ctx.closePath();
}
// a cartoon boxing glove centred on (x, y), pointing `face`; sc 1 = a fist about 20 px wide
function kothDrawGlove(x, y, sc, face, id, o = {}) {
  const sx = o.sx || 1, sy = o.sy || 1;
  ctx.save(); ctx.translate(x, y); ctx.rotate((o.rot || 0) * face); ctx.scale(face * sc * sx, sc * sy);
  const lw = 2 / sc;
  const base = o.gold ? C.gold : PDARK[id], light = o.gold ? '#fff0b0' : PCOL[id], line = o.gold ? C.goldDark : 'rgba(28,26,54,0.65)';
  if (o.glow > 0) { ctx.fillStyle = 'rgba(255,197,61,' + o.glow + ')'; circle(0, 0, 16); ctx.fill(); }
  // cuff behind the fist: cream with a stripe in the player's colour
  ctx.fillStyle = '#fff3e0'; rr(-16, -6.5, 10, 13, 3); ctx.fill();
  ctx.fillStyle = o.gold ? C.goldDark : PCOL[id]; ctx.fillRect(-12.5, -6.5, 2.6, 13);
  ctx.strokeStyle = line; ctx.lineWidth = lw * 0.8; rr(-16, -6.5, 10, 13, 3); ctx.stroke();
  // the fist
  ctx.fillStyle = base; ctx.beginPath(); ctx.ellipse(0, 0.5, 10.5, 9.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.globalAlpha = 0.6; ctx.fillStyle = light; ctx.beginPath(); ctx.ellipse(-1, -2.5, 7.5, 5.5, -0.25, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  ctx.strokeStyle = line; ctx.lineWidth = lw; ctx.beginPath(); ctx.ellipse(0, 0.5, 10.5, 9.5, 0, 0, Math.PI * 2); ctx.stroke();
  // thumb on top, curled forward
  ctx.fillStyle = base; ctx.beginPath(); ctx.ellipse(1.5, -7.5, 5.5, 3.4, -0.15, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = line; ctx.lineWidth = lw * 0.85; ctx.stroke();
  // knuckle crease and a shine
  ctx.strokeStyle = 'rgba(28,26,54,0.3)'; ctx.lineWidth = lw * 0.8; ctx.beginPath(); ctx.arc(3, 1.5, 5.5, -1.1, 1.2); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.ellipse(-3.5, -3.5, 2.6, 1.6, -0.5, 0, Math.PI * 2); ctx.fill();
  if (o.star) { kothStarPath(-11, 0, 4.6, 2); ctx.fillStyle = C.gold; ctx.fill(); ctx.strokeStyle = C.goldDark; ctx.lineWidth = lw * 0.6; ctx.stroke(); }
  if (o.white > 0) { ctx.globalAlpha = o.white; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(0, 0.5, 10.5, 9.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
  ctx.restore();
}
// the shared charge ring (CRITIQUE C2) + the player's glove: resting, puffing up, punching (on a spring), wobbling
function kothDrawFighter(p, s, st) {
  const cxp = p.x + p.w / 2, cy = p.y + p.h / 2, w = p.w * p.sx, h = p.h * p.sy, by = p.y + p.h;
  const charging = s.hold >= 0, full = charging && s.charge >= 1, warn = full && s.autoT >= KOTH.fullHold - KOTH.warnT;
  const flash10 = Math.floor(G.clock * 20) % 2 === 0; // 10 Hz white/gold
  // charge ring around the body (only once the hold is past the tap time)
  if (charging && s.hold >= KOTH.tapT) {
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(28,26,54,0.35)'; circle(cxp, cy, 20); ctx.stroke();
    let col = full ? C.gold : PCOL[p.id];
    if (full && s.fullT >= 0 && s.fullT < 0.1) col = '#ffffff';
    if (warn) col = flash10 ? '#ffffff' : C.gold;
    ctx.strokeStyle = col; ctx.beginPath(); ctx.arc(cxp, cy, 20, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * s.charge); ctx.stroke();
  }
  // glove size: mitts x comeback x (bouncy) charge, capped
  const base = (st.twist === 'mitts' ? KOTH.mitts.draw : 1) * (1 + KOTH.cbDraw * s.drawB);
  let sc = Math.min(KOTH.drawMax, base * Math.max(0.6, s.gs));
  const face = p.face, gold = s.gold || (s.punchGold && s.punchT < 0.3);
  const restX = cxp + face * (w / 2 + 3), restY = by - h * 0.42 + Math.sin(G.clock * Math.PI * 6) * 1;
  let gx = restX, gy = restY, rot = 0, sx = 1, sy = 1, glow = 0, white = 0;
  const reach = kothReach(p.id, s.power), ext = s.punchT < 0.05 ? s.punchT / 0.05 : s.punchT < KOTH.activeT ? 1 : Math.max(0, 1 - (s.punchT - KOTH.activeT) / 0.12);
  if (charging) {
    // wound up behind the back (so the face stays visible) and puffing up: it breathes faster and wobbles more the fuller it gets
    gx = cxp - face * (w / 2 - 2 + 8 * (sc - 1)); gy = restY - 3;
    const wob = 0.04 + 0.08 * s.charge, f = 8 + 14 * s.charge;
    sx = 1 + wob * Math.sin(G.clock * f); sy = 1 - wob * Math.sin(G.clock * f);
    if (full) {
      glow = 0.35 + 0.35 * (0.5 + 0.5 * Math.sin(G.clock * Math.PI * 16));
      if (!reduceMotion) { const sh = warn ? 3 : 1.5; gx += (Math.random() * 2 - 1) * sh; gy += (Math.random() * 2 - 1) * sh; }
      if (s.fullT >= 0 && s.fullT < 0.1) white = 0.8;
      if (warn) white = flash10 ? 0.75 : 0;
    }
  } else if (ext > 0) {
    // the punch: the glove shoots out on a spring
    const tx = cxp + face * (p.w / 2 + reach - 9 * sc);
    gx = restX + (face > 0 ? Math.max(0, tx - restX) : Math.min(0, tx - restX)) * ext;
    sx = 1 + 0.25 * ext * (s.power >= 0.4 ? 1 : 0.4); sy = 1 - 0.12 * ext;
  } else if (s.wob > 0) {
    // a big miss: the glove droops and sways
    gy = restY + 6; rot = 0.7 + 0.35 * Math.sin(G.clock * 22);
  }
  // spring arm while punching
  if (!charging && ext > 0.05) {
    const x0 = cxp + face * (w / 2 - 2), x1 = gx - face * 12 * sc, n = 6, len = x1 - x0;
    if (Math.abs(len) > 3) {
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (const [lw, col] of [[4.5, 'rgba(28,26,54,0.55)'], [2.2, '#e9e6f5']]) {
        ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(x0, gy);
        for (let i = 1; i < n; i++) ctx.lineTo(x0 + len * i / n, gy + (i % 2 ? -4.5 : 4.5));
        ctx.lineTo(x1, gy); ctx.stroke();
      }
    }
    if (s.power >= 0.4) {
      ctx.strokeStyle = PCOL[p.id]; ctx.lineWidth = 2.5; ctx.globalAlpha = 0.8 * ext;
      for (const dy of [-8, 0, 8]) { ctx.beginPath(); ctx.moveTo(gx - face * (16 * sc + 4), gy + dy * sc * 0.8); ctx.lineTo(gx - face * (16 * sc + 18 + Math.abs(dy)), gy + dy * sc * 0.8); ctx.stroke(); }
      ctx.globalAlpha = 1;
    }
  }
  kothDrawGlove(gx, gy, sc, face, p.id, { gold, star: s.b >= 0.3, glow, white, rot, sx, sy });
  // sparkles: half charge and up, and on a loaded golden glove
  if ((charging && s.charge >= 0.5) || s.gold) {
    ctx.fillStyle = s.gold ? '#fff6c8' : '#ffffff';
    for (let i = 0; i < 3; i++) {
      const a = G.clock * 5 + i * 2.1, r = 15 * sc;
      const x = gx + Math.cos(a) * r, y = gy + Math.sin(a) * r * 0.8, z = 1.6 + 1.2 * Math.abs(Math.sin(G.clock * 9 + i));
      ctx.beginPath(); ctx.moveTo(x, y - z * 2); ctx.lineTo(x + z * 0.6, y); ctx.lineTo(x, y + z * 2); ctx.lineTo(x - z * 0.6, y); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x - z * 2, y); ctx.lineTo(x, y + z * 0.6); ctx.lineTo(x + z * 2, y); ctx.lineTo(x, y - z * 0.6); ctx.closePath(); ctx.fill();
    }
  }
  // wobble: little dizzy swirls over the glove
  if (s.wob > 0 && !charging) {
    ctx.strokeStyle = 'rgba(28,26,54,0.55)'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 2; i++) { ctx.beginPath(); ctx.arc(gx + (i ? 5 : -5) * face, gy - 14 * sc - i * 3, 3, G.clock * 12 + i, G.clock * 12 + i + 4.5); ctx.stroke(); }
  }
}
// flag pole, zone band and posts on the summit
function kothDrawHill(st) {
  const hx = st.hx, top = st.sumTop, x0 = st.zoneX0 + st.zx, x1 = st.zoneX1 - st.zx;
  const state = st.state, flick = Math.floor(G.clock * 8) % 2;
  const col = state === 0 || state === 1 ? PCOL[state] : state === 2 ? PCOL[flick] : '#e9e4f5';
  // zone band on the grass
  ctx.save(); ctx.globalAlpha = state === -1 ? 0.45 : 0.7; ctx.fillStyle = col; ctx.fillRect(x0, top, x1 - x0, 5); ctx.restore();
  // the comeback player's zone is wider: the top step next to the summit counts for them (gold = help)
  // (the part of it over the summit is drawn on the summit's grass, only the part past the summit's edge on the step)
  const sx0 = st.zoneX0, sx1 = st.zoneX1;
  for (const k of [0, 1]) {
    const ext = kothCbExt(k, st.pl[k].drawB);
    if (ext < 2) continue;
    ctx.save(); ctx.globalAlpha = 0.35 + 0.45 * st.pl[k].drawB;
    const segs = [];
    for (const [a, b] of [[x0 - ext, x0], [x1, x1 + ext]]) {
      const ia = Math.max(a, sx0), ib = Math.min(b, sx1);
      if (ib - ia > 0.5) segs.push([ia, ib, top]);                      // over the summit
      if (a < sx0) segs.push([a, Math.min(b, sx0), top + T]);           // past its left edge: on the step
      if (b > sx1) segs.push([Math.max(a, sx1), b, top + T]);           // past its right edge
    }
    for (const [a, b, y] of segs) {
      ctx.fillStyle = C.gold; ctx.fillRect(a, y, b - a, 5);
      ctx.fillStyle = PCOL[k]; for (let x = a + 6; x < b - 3; x += 12) ctx.fillRect(x, y + 1, 4, 3);
    }
    ctx.globalAlpha = 1;
    for (const x of [x0 - ext, x1 + ext]) {
      const y = (x >= sx0 - 0.5 && x <= sx1 + 0.5 ? top : top + T) - 6;
      kothStarPath(x, y, 5, 2.2); ctx.fillStyle = C.gold; ctx.fill(); ctx.strokeStyle = C.goldDark; ctx.lineWidth = 1; ctx.stroke();
    }
    ctx.restore();
  }
  // posts at the band ends (they slide inward in the Shrinking Hill)
  for (const x of [x0, x1]) {
    ctx.fillStyle = '#fff3e0'; rr(x - 2, top - 18, 4, 18, 2); ctx.fill();
    ctx.strokeStyle = 'rgba(28,26,54,0.35)'; ctx.lineWidth = 1; rr(x - 2, top - 18, 4, 18, 2); ctx.stroke();
    ctx.fillStyle = C.gold; circle(x, top - 19, 3); ctx.fill();
  }
  // the flag
  const poleTop = top - 68;
  ctx.fillStyle = '#fff3e0'; ctx.fillRect(hx - 1.5, poleTop, 3, 68);
  ctx.fillStyle = 'rgba(28,26,54,0.25)'; ctx.fillRect(hx + 0.5, poleTop, 1, 68);
  ctx.fillStyle = C.gold; circle(hx, poleTop - 1, 4); ctx.fill();
  const wv = t => Math.sin(G.clock * 6 + t * 3) * 2.5;
  ctx.beginPath(); ctx.moveTo(hx + 1.5, poleTop + 2);
  for (let i = 1; i <= 6; i++) ctx.lineTo(hx + 1.5 + i * 4, poleTop + 2 + wv(i) * i / 6);
  for (let i = 6; i >= 0; i--) ctx.lineTo(hx + 1.5 + i * 4, poleTop + 18 + wv(i) * i / 6);
  ctx.closePath();
  if (state === 2) {
    ctx.save(); ctx.clip();
    for (let i = 0; i < 8; i++) { ctx.fillStyle = PCOL[(i + flick) % 2]; ctx.fillRect(hx + i * 4, poleTop, 4, 24); }
    ctx.restore();
  } else { ctx.fillStyle = col; ctx.fill(); }
  if (st.hot) { ctx.strokeStyle = C.gold; ctx.lineWidth = 2.5; ctx.stroke(); }
  if (state === 0 || state === 1) { // a little crown on the flag for the scorer
    drawCrownShape(hx + 14, poleTop + 10 + wv(3) * 0.5, 0.42);
  }
}
// the scoreboard sign on the hill face (x 330-630 below y 360 is solid hill: nobody can ever stand there)
function kothDrawBoard(st) {
  const x0 = 344, y0 = 371, w = 272, h = 98, big = typeof hudBig === 'function' && hudBig(), z = big ? 1.2 : 1;
  ctx.fillStyle = C.plankDark; rr(x0, y0, w, h, 12); ctx.fill();
  ctx.fillStyle = C.plank; rr(x0 + 3, y0 + 3, w - 6, h - 6, 10); ctx.fill();
  ctx.fillStyle = 'rgba(28,26,54,0.92)'; rr(x0 + 9, y0 + 9, w - 18, h - 18, 7); ctx.fill();
  ctx.fillStyle = C.plankDark; for (const [nx, ny] of [[x0 + 6, y0 + 6], [x0 + w - 6, y0 + 6], [x0 + 6, y0 + h - 6], [x0 + w - 6, y0 + h - 6]]) { circle(nx, ny, 2); ctx.fill(); }
  const head = st.hot ? 'HOT HILL ×2' : 'First to ' + st.target + ' seconds';
  text(head, W / 2, y0 + 21, 12 * z, st.hot ? C.gold : '#d9d3ef', 'center', 'body');
  for (const k of [0, 1]) {
    const y = y0 + 45 + k * 29, s = st.pl[k], mt = st.meter[k], f = clamp(mt / st.target, 0, 1);
    const scoring = st.state === k, cb = s.drawB > 0.05;
    text(NAMES[k], x0 + 18, y + 1, 19 * z, PCOL[k], 'left');
    // comeback: a little gold glove and the scoring bonus
    if (cb) {
      kothDrawGlove(x0 + 66, y, 0.36 + 0.24 * s.drawB, 1, k, { star: true });
      text('×' + (1 + (KOTH.cbRate - 1) * s.b).toFixed(1), x0 + 80, y + 1, 13 * z, C.gold, 'left', 'body');
    }
    const bx = x0 + 112, bw = 112, bh = 14 * z;
    if (f > 0.7 && !G.match.end) { ctx.fillStyle = 'rgba(255,255,255,' + (0.14 + 0.14 * Math.sin(G.clock * 12)) + ')'; rr(bx - 3, y - bh / 2 - 3, bw + 6, bh + 6, bh / 2 + 3); ctx.fill(); }
    ctx.fillStyle = 'rgba(246,239,223,0.18)'; rr(bx, y - bh / 2, bw, bh, bh / 2); ctx.fill();
    if (f > 0) { ctx.fillStyle = PCOL[k]; rr(bx, y - bh / 2, Math.max(bh, bw * f), bh, bh / 2); ctx.fill(); }
    if (cb) { ctx.strokeStyle = C.gold; ctx.lineWidth = 1.5; rr(bx, y - bh / 2, bw, bh, bh / 2); ctx.stroke(); }
    if (scoring && G.match.phase === 'live') { ctx.fillStyle = 'rgba(255,255,255,0.4)'; const sx = bx + 4 + ((G.clock * 70) % Math.max(1, bw * f - 8)); ctx.fillRect(sx, y - bh / 2 + 2, 3, bh - 4); }
    text(String(Math.floor(mt + 1e-6)), x0 + w - 18, y + 1, 22 * z, scoring ? '#ffffff' : C.paper, 'right');
  }
}
function kothDrawPickup(g) {
  const bob = Math.sin(G.clock * 3) * 4;
  ctx.fillStyle = 'rgba(255,215,90,0.3)'; circle(g.x, g.y + bob, 20 + Math.sin(G.clock * 5) * 2); ctx.fill();
  kothDrawGlove(g.x + 3, g.y + bob, 1.05, 1, 0, { gold: true, rot: Math.sin(G.clock * 2) * 0.2 });
  ctx.fillStyle = '#fff6c8';
  for (let i = 0; i < 3; i++) {
    const a = G.clock * 3 + i * 2.1, x = g.x + Math.cos(a) * 22, y = g.y + bob + Math.sin(a) * 16, z = 1.5 + Math.abs(Math.sin(G.clock * 7 + i)) * 1.5;
    ctx.beginPath(); ctx.moveTo(x, y - z * 2); ctx.lineTo(x + z * 0.6, y); ctx.lineTo(x, y + z * 2); ctx.lineTo(x - z * 0.6, y); ctx.closePath(); ctx.fill();
  }
}
// KOTH sounds (CRITIQUE C7: Sfx.extra, koth prefix)
Sfx.extra.kothFull = function (p) { this.tone(1320 * p, 0.1, 'triangle', 0.05); this.tone(1760 * p, 0.12, 'triangle', 0.04, null, 0.05); };
Sfx.extra.kothJab = function (p) { this.tone(520 * p, 0.05, 'square', 0.035, 320 * p); };
Sfx.extra.kothJabHit = function () { this.tone(240, 0.06, 'triangle', 0.07, 140); };
Sfx.extra.kothHit = function (p, id) { this.play('thwack', id); this.tone(150, 0.15, 'square', 0.04, 70); };
Sfx.extra.kothMega = function () { this.tone(1500, 0.05, 'square', 0.06, 500); this.tone(110, 0.35, 'sawtooth', 0.06, 40); this.tone(220, 0.25, 'triangle', 0.08, 70); };
Sfx.extra.kothWhiff = function (p) { this.tone(300 * p, 0.18, 'sawtooth', 0.025, 140 * p); };
Sfx.extra.kothClash = function () { this.play('clank'); this.tone(700, 0.12, 'square', 0.04, 1100); };
Sfx.extra.kothSplat = function () { this.tone(160, 0.15, 'square', 0.06, 60); this.play('bonk'); };
Sfx.extra.kothDeflate = function () { this.tone(600, 0.25, 'sine', 0.05, 150); };
Sfx.extra.kothStars = function () { [1319, 1047, 880].forEach((f, i) => this.tone(f, 0.06, 'triangle', 0.05, null, i * 0.05)); };
Sfx.extra.kothContest = function () { this.tone(150, 0.06, 'square', 0.02); };
Sfx.extra.kothHot = function () { [523, 659, 784].forEach((f, i) => this.tone(f, 0.09, 'sawtooth', 0.03, null, i * 0.06)); };

