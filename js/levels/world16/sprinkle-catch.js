/* Pip & Bo - Level 16-4 Sprinkle Catch (versus, World 16 Sugar Rush Factory). */
'use strict';

/* ===== 16-4 Sprinkle Catch (mode 'sprinkle', versus, best of 5) =====
   Gavyn's pick: "catch falling candy in your basket, while giant gobstoppers bounce you around."
   One candy-land arena on a single screen, side view. def.ownStep: this mode runs its own small platformer on the two
   player bodies (G.players: the framework draws them, their name tags and speech bubbles), the candy, the gobstoppers
   and the picture.
     move    ◀ ▶ run, ▲ jumps (hold for a full jump), hold ▼ on a wafer to drop through it. Wafers are one-way: jump up
             through them from below.
     catch   everybody carries a basket on their head. Candy that drops into it is yours: gumdrop 1, sprinkle 1,
             peppermint 2, cupcake 3, golden candy 5. Falling candy drops past the wafers (so you can catch it up
             there early, or below); candy that hits your body bounces off, and candy that reaches the floor goes
             "plop" and is gone.
     bump    the action: a short hip-bump dash (also in the air, once per jump). Bump the other one and they spill
             their last candy ("Bump!"); after any knock you get a short bubble shield, so nobody can be bumped twice in
             a row (2.5 s after a bump). Two bumps head-on just boing apart. The bumped one gets the first second to
             scoop the spilled candy back (the bumper can't), and players squeeze past each other, so nobody can be
             boxed in or bumped over and over (review fix: a player who only chased and bumped used to beat Hard).
   Giant gobstoppers drop in now and then and bounce round the arena. Getting bonked is a soft "Boing!": you fly back,
   see stars for a moment and spill a few candies. Spilled candy lies on the floor for a few seconds and either player
   can scoop it up by walking over it (or catch it in the air). When a gobstopper is done it pops into candy.
   A giant sprinkle shaker slides along a licorice rail above the arena and drops the candy: watch where it stops and
   shakes. A round lasts 35 s (clock under the match score, ticks in the last 5 s); most candy points win the round.
   Rounds: round 1 is Sweet Start (plain); rounds 2-5 are four of Sprinkle Storm (bursts of tiny sprinkles), Jelly Floor
   (bouncy floor, hold ▼ to land softly), Conveyor Floor (the floor slides and flips direction, with warning arrows),
   Mega Gobstopper (one giant one all round), Cake Tiers (a tiered cake stand and shelves to climb) and Gumdrop Rain
   (a cloud rains gumdrops everywhere; they bounce once), shuffled per match.
   Ties: a tied round is replayed; on a second tie in a row the most golden candy this match wins it, then the most
   candy this match; still level, a Golden Drop sudden-death round: golden candy only, first catch wins.
   Catch-up help, always gold and announced: whoever trails in rounds gets a Gold basket (half again as wide); 2+ rounds
   behind also a candy magnet that pulls nearby candy into it. With 12 s left, a player 6+ points behind gets a golden
   candy dropped right over their head ("Golden candy for Bo!"), which either player can still catch.
   Every top-level name is prefixed sprinkle / SPRINKLE, every sound is Sfx.extra.sprinkle*. Rule randomness only from
   MODES.sprinkle.rand; looks use their own sprinkleVR. */

const SPRINKLE = {
  floorY: 480, wallL: 12, wallR: 948, spawnY: 146, ceilY: 132,
  vRun: 230, accG: 2400, fricG: 2600, accA: 1700, fricA: 600,   // running (same feel as the platform levels)
  g: 2000, jumpV: 700, cut: 0.45, maxFall: 900, coyote: 0.08, buffer: 0.12, dropT: 0.24,
  jellyJump: 1.14, jellyK: 0.72, jellyMax: 860,                   // Jelly Floor: jumps go higher, landings bounce (smaller each time)
  dashV: 470, dashT: 0.16, dashCD: 1.1,                            // the hip bump
  bumpV: 330, bumpLift: 260, bumpStun: 0.35, shieldT: 2.5, gobShield: 1.7,
  bumpLock: 1.0,   // the bumper can't scoop the candy its own bump knocked out for this long (the bumped one gets first try)
  bonkV: 360, bonkLift: 430, bonkStun: 0.55,
  basketW: 40, goldBasketW: 60, magnetX: 74, magnetPull: 520,
  spillG: 1400, spillLife: 6, spillDelay: 0.4,
  roundT: 35, sdCap: 25,
  gobR: 22, megaR: 44, gobG: 1300, megaG: 1050, gobBounce: 800, megaBounce: 700, jellyBounce: 930, gobLife: 11, gobWarn: 1.2,
  beltV: 90, cuLeft: 12, cuGap: 6,
};
const SPRINKLE_KINDS = {
  sprinkle: { pts: 1, r: 5, g: 420, max: 250 },
  gumdrop: { pts: 1, r: 11, g: 300, max: 200 },
  mint: { pts: 2, r: 11, g: 300, max: 200 },
  cupcake: { pts: 3, r: 12, g: 290, max: 185 },
  gold: { pts: 5, r: 12, g: 240, max: 160 },
};
const SPRINKLE_TWISTS = {
  plain: { name: 'Sweet Start', hint: 'Catch the falling candy in your basket! Most candy wins.' },
  storm: { name: 'Sprinkle Storm', hint: 'Showers of tiny sprinkles, 1 point each: catch lots!' },
  jelly: { name: 'Jelly Floor', hint: 'The floor is bouncy jelly! Hold ▼ to land softly.' },
  belt: { name: 'Conveyor Floor', hint: 'The floor slides! Watch the arrows: it flips now and then.' },
  mega: { name: 'Mega Gobstopper', hint: 'One giant gobstopper bounces all round. Boing!' },
  cake: { name: 'Cake Tiers', hint: 'A tall cake stand and shelves to climb: catch candy high up!' },
  gumdrop: { name: 'Gumdrop Rain', hint: 'A cloud rains gumdrops everywhere. They bounce once!' },
  golden: { name: 'Golden Drop', hint: 'Two ties! Golden candy only: the first catch wins!' },
};
const SPRINKLE_MIX = ['storm', 'jelly', 'belt', 'mega', 'cake', 'gumdrop'];
const SPRINKLE_GUM = ['#ff6f9f', '#ffb347', '#7fdc7a', '#a98bff', '#5fc8ff', '#ffd84a'];
const SPRINKLE_SPR = ['#ff5f8f', '#ffd23f', '#5fd0ff', '#8be07f', '#c58bff', '#ffffff', '#ff9a4a'];
const SPRINKLE_TAU = Math.PI * 2;

let sprinkleVS = 20261106;
const sprinkleVR = () => { sprinkleVS = (Math.imul(sprinkleVS, 1664525) + 1013904223) >>> 0; return sprinkleVS / 4294967296; };
const sprinkleRand = () => MODES.sprinkle.rand();
// the computer's character in 1-player mode (no key hints for it)
const sprinkleCpu = id => typeof cpuSolo === 'function' && cpuSolo() && cpuOn(id);
// phones: the HUD, chips and words draw bigger (a bit sooner than the shared HUD, like 15-4)
const sprinkleBig = () => (typeof stageScale === 'number' ? stageScale < 0.72 : hudBig());

/* ---------- the arena ---------- */
// one-way surfaces { x0, x1, y }: the floor (solid, whole width) and wafers you can jump up through. Mirror symmetric.
function sprinkleLayout(tw) {
  const s = [{ x0: -60, x1: 1020, y: SPRINKLE.floorY, floor: true, kind: 'floor' }];
  if (tw === 'cake') {
    s.push({ x0: 90, x1: 270, y: 372, kind: 'wafer' }, { x0: 690, x1: 870, y: 372, kind: 'wafer' },
      { x0: 330, x1: 630, y: 400, kind: 'tier', tier: 0 }, { x0: 380, x1: 580, y: 296, kind: 'tier', tier: 1 },
      { x0: 430, x1: 530, y: 196, kind: 'tier', tier: 2 },
      { x0: 12, x1: 132, y: 264, kind: 'shelf' }, { x0: 828, x1: 948, y: 264, kind: 'shelf' });
  } else {
    s.push({ x0: 90, x1: 300, y: 372, kind: 'wafer' }, { x0: 660, x1: 870, y: 372, kind: 'wafer' }, { x0: 350, x1: 610, y: 268, kind: 'wafer' });
  }
  s.forEach((q, i) => { q.i = i; });
  return s;
}
// the highest surface at or below height y that covers x (-1: none)
function sprinkleSurfBelow(st, x, y, pad = 0) {
  let best = -1;
  for (const q of st.surf) if (x >= q.x0 - pad && x <= q.x1 + pad && q.y >= y - 0.5 && (best < 0 || q.y < st.surf[best].y)) best = q.i;
  return best;
}

/* ---------- candy ---------- */
function sprinkleCandy(st, kind, x, y) {
  const K = SPRINKLE_KINDS[kind];
  return { id: st.cid++, kind, x, y, vx: 0, vy: kind === 'sprinkle' ? 90 : 40, r: K.r, pts: K.pts, state: 'fall', life: 99, delay: 0,
    bounces: 0, rest: false, surf: -1, owner: -1, bonked: false, t: 0,
    // looks only
    rot: sprinkleVR() * SPRINKLE_TAU, spin: (sprinkleVR() - 0.5) * 5, col: Math.floor(sprinkleVR() * 7) };
}
// where a falling candy's centre reaches height y: { t, x } (null when it plops on a surface first). Same rules as the
// candy step below, without players (a person can see the candy and guess where it lands; the brain does the same).
function sprinklePredict(st, c, y, maxT = 3) {
  if (c.y >= y) return { t: 0, x: c.x };
  const K = SPRINKLE_KINDS[c.kind], spill = c.state === 'spill';
  let x = c.x, cy = c.y, vx = c.vx, vy = c.vy, bounced = c.bounces;
  const dt = 1 / 60;
  for (let t = 0; t < maxT; t += dt) {
    const py = cy;
    vy = spill ? vy + SPRINKLE.spillG * dt : Math.min(K.max, vy + K.g * dt);
    x += vx * dt; cy += vy * dt;
    if (!spill) vx *= Math.exp(-1.2 * dt);
    if (x < SPRINKLE.wallL + c.r) { x = SPRINKLE.wallL + c.r; vx = Math.abs(vx); }
    if (x > SPRINKLE.wallR - c.r) { x = SPRINKLE.wallR - c.r; vx = -Math.abs(vx); }
    if (py < y && cy >= y && vy > 0) return { t: t + dt, x };
    if (vy > 0) for (const q of st.surf) {
      if ((!spill && !q.floor) || x < q.x0 || x > q.x1 || py + c.r > q.y || cy + c.r < q.y) continue;
      if (!spill && st.twist === 'gumdrop' && c.kind === 'gumdrop' && bounced === 0) { bounced = 1; cy = q.y - c.r; vy = -Math.max(260, vy * 0.6); break; }
      return null;
    }
  }
  return null;
}

/* ---------- players ---------- */
function sprinklePlNew(k) {
  return { k, basket: [], score: 0, bw: SPRINKLE.basketW, magnet: false, gold: 0, runK: 1,
    surf: 0, coyote: 0, jumpBuf: 0, jumpHeld: false, dropT: 0, downT: 0, lastFloor: true,
    dashT: 0, dashDir: 1, dashCD: 0, airDashed: false, hit: false, shield: 0,
    pop: '', popT: 9, popCol: '#fff', joyT: 0, tilt: 0 };
}
function sprinklePop(st, k, text, col) { const s = st.pl[k]; s.pop = text; s.popCol = col || '#ffffff'; s.popT = 0; }
function sprinkleWord(st, x, y, text, col) { st.vis.words.push({ x, y, text, col, t: 0 }); if (st.vis.words.length > 30) st.vis.words.shift(); }
const sprinkleScore = s => s.basket.reduce((a, k) => a + SPRINKLE_KINDS[k].pts, 0);
// the basket on top of a player's head
function sprinkleBasket(st, k) {
  const p = G.players[k], s = st.pl[k], cx = p.x + p.w / 2;
  return { x0: cx - s.bw / 2, x1: cx + s.bw / 2, y0: p.y - 16, y1: p.y + 3, cx };
}
function sprinkleKnock(st, p, vx, vy, stun) {
  const s = st.pl[p.id];
  p.vx = vx; p.vy = vy; p.grounded = false; p.stun = Math.max(p.stun, stun);
  s.dashT = 0; s.jumpHeld = false; s.coyote = 0; s.jumpBuf = 0;
  p.sx = 1.35; p.sy = 0.7;
}
// a knocked player spills their last n candies: they fly out and land, and either player can scoop them up
function sprinkleSpill(st, k, n, dir, by = -1) {
  const s = st.pl[k], p = G.players[k];
  let lost = 0, gold = false;
  for (let i = 0; i < n && s.basket.length; i++) {
    const kind = s.basket.pop(); lost++;
    if (kind === 'gold') gold = true;
    const c = sprinkleCandy(st, kind, p.x + p.w / 2, p.y - 8);
    c.state = 'spill'; c.vx = dir * (60 + 160 * sprinkleRand()) + (sprinkleRand() - 0.5) * 50; c.vy = -(300 + 140 * sprinkleRand());
    c.delay = SPRINKLE.spillDelay; c.life = SPRINKLE.spillLife; c.owner = k;
    if (by >= 0) { c.lock = by; c.lockT = SPRINKLE.bumpLock; }
    st.candy.push(c);
  }
  if (lost) {
    s.score = sprinkleScore(s); st.stat.spills[k] += lost;
    Sfx.play('sprinkleSpill', k);
    if (gold) sprinkleWord(st, p.x + p.w / 2, p.y - 40, 'Golden spill!', C.gold);
  }
  return lost;
}
function sprinkleCatch(st, k, c, how) {
  const s = st.pl[k], p = G.players[k];
  s.basket.push(c.kind); s.score = sprinkleScore(s);
  if (how === 'scoop') st.stat.scoops[k]++; else st.stat.caught[k]++;
  if (c.kind === 'gold' && c.owner !== k) st.stat.gold[k]++; // (scooping back your own spilled golden candy doesn't count twice)
  const col = c.kind === 'gold' ? C.gold : c.kind === 'mint' ? '#ff6f7f' : c.kind === 'cupcake' ? '#7fd3ff' : '#ffffff';
  sprinkleWord(st, p.x + p.w / 2, p.y - 26, c.kind === 'gold' ? 'Golden! +5' : how === 'scoop' ? 'Scoop! +' + c.pts : '+' + c.pts, col);
  Sfx.play(c.kind === 'gold' ? 'sprinkleGold' : how === 'scoop' ? 'sprinkleScoop' : 'sprinkleCatch', k);
  s.tilt = (c.x < p.x + p.w / 2 ? -1 : 1) * 0.25;
  for (let i = 0; i < (c.kind === 'gold' ? 14 : 5); i++) sprinkleFx(st, c.x, c.y, (sprinkleVR() - 0.5) * 160, -40 - sprinkleVR() * 120, 0.5, c.kind === 'gold' ? C.gold : SPRINKLE_SPR[i % 7], 2.5, 300, c.kind === 'gold' ? 'spark' : 'dot');
  if (st.sd && c.kind === 'gold' && st.sdWin < 0) st.sdWin = k; // (the round ends after this tick's candy step)
}

/* ---------- moving a player (the mode's own platformer) ---------- */
// inp: the keys (null: nobody steering, e.g. after the bell)
function sprinkleMove(st, p, inp, dt) {
  const P = SPRINKLE, s = st.pl[p.id], sf = st.surf, tw = st.twist;
  const was = p.grounded;
  p.stun = Math.max(0, p.stun - dt); s.shield = Math.max(0, s.shield - dt); s.dashCD = Math.max(0, s.dashCD - dt);
  s.dropT = Math.max(0, s.dropT - dt); s.jumpBuf = Math.max(0, s.jumpBuf - dt); s.coyote = Math.max(0, s.coyote - dt);
  p.stompSafe = p.stun > 0 ? 0 : s.shield; // (the blinking bubble drawPlayer shows in versus levels)
  const ctl = !!inp && p.stun <= 0;
  if (ctl && p.pendingJump) s.jumpBuf = P.buffer;
  p.pendingJump = false;
  const dir = ctl ? (inp.right ? 1 : 0) - (inp.left ? 1 : 0) : 0;
  if (s.dashT > 0) {
    s.dashT -= dt; p.vx = s.dashDir * P.dashV;
    if (!p.grounded) p.vy = Math.min(p.vy, 120);
  } else if (p.stun > 0) p.vx = approach(p.vx, 0, (p.grounded ? 900 : 240) * dt);
  else {
    const max = P.vRun * s.runK;
    if (dir) {
      if (Math.abs(p.vx) > max && Math.sign(p.vx) === dir) p.vx = approach(p.vx, dir * max, P.fricA * dt);
      else p.vx = approach(p.vx, dir * max, (p.grounded ? P.accG : P.accA) * dt);
      p.face = dir;
    } else p.vx = approach(p.vx, 0, (p.grounded ? P.fricG : P.fricA) * dt);
  }
  // hold ▼ on a wafer to drop through it
  const on = p.grounded ? sf[s.surf] : null;
  if (ctl && inp.down && on && !on.floor && s.dashT <= 0) {
    s.downT += dt;
    if (s.downT >= 0.07) { s.dropT = P.dropT; p.grounded = false; s.downT = 0; p.vy = Math.max(p.vy, 60); }
  } else s.downT = 0;
  let jumped = false;
  if (ctl && s.jumpBuf > 0 && (p.grounded || s.coyote > 0) && s.dashT <= 0) {
    const jel = tw === 'jelly' && s.lastFloor;
    p.vy = -P.jumpV * (jel ? P.jellyJump : 1); p.grounded = false; s.coyote = 0; s.jumpBuf = 0; s.jumpHeld = true; jumped = true;
    p.sx = 0.75; p.sy = 1.3; Sfx.play(jel ? 'sprinkleJelly' : 'jump', p.id); st.stat.jumps[p.id]++;
  }
  if (s.jumpHeld && p.vy < 0 && !(inp && inp.jump)) { p.vy *= P.cut; s.jumpHeld = false; }
  if (p.vy >= 0) s.jumpHeld = false;
  p.vy = Math.min(P.maxFall, p.vy + P.g * dt);
  if (was && on && on.floor && tw === 'belt') p.x += st.belt.v * dt; // the conveyor carries you
  const prevFeet = p.y + p.h;
  p.x += p.vx * dt;
  if (p.x < P.wallL) { p.x = P.wallL; if (p.vx < 0) p.vx = 0; if (s.dashT > 0 && s.dashDir < 0) s.dashT = 0; }
  if (p.x + p.w > P.wallR) { p.x = P.wallR - p.w; if (p.vx > 0) p.vx = 0; if (s.dashT > 0 && s.dashDir > 0) s.dashT = 0; }
  p.y += p.vy * dt;
  p.grounded = false;
  if (p.vy >= 0) {
    let best = null;
    for (const q of sf) {
      if (!q.floor && s.dropT > 0) continue;
      if (p.x + p.w <= q.x0 + 3 || p.x >= q.x1 - 3) continue;
      if (prevFeet > q.y + 0.5 || p.y + p.h < q.y) continue;
      if (!best || q.y < best.y) best = q;
    }
    if (best) {
      const impact = p.vy;
      p.y = best.y - p.h;
      if (tw === 'jelly' && best.floor && impact > 260 && !(ctl && inp.down)) {
        p.vy = -Math.min(impact * P.jellyK, P.jellyMax); s.lastFloor = true; s.airDashed = false;
        p.sx = 1.4; p.sy = 0.6; Sfx.play('sprinkleJelly', p.id);
        st.jelly.push({ x: p.x + p.w / 2, t: 0, a: Math.min(1, impact / 700) });
      } else {
        p.vy = 0; p.grounded = true; s.surf = best.i; s.lastFloor = !!best.floor; s.airDashed = false;
        if (!was && impact > 380) { p.sx = 1.25; p.sy = 0.78; Sfx.play('land'); if (tw === 'jelly' && best.floor) st.jelly.push({ x: p.x + p.w / 2, t: 0, a: 0.35 }); }
      }
    }
  }
  if (was && !p.grounded && !jumped && p.vy >= 0) s.coyote = P.coyote;
  // keep a player out of the ceiling (the rail)
  if (p.y < P.ceilY - 10) { p.y = P.ceilY - 10; p.vy = Math.max(0, p.vy); }
}
// the hip bump: a short dash; touching the other player during it bumps them
function sprinkleAct(st, p, inp, live) {
  const P = SPRINKLE, s = st.pl[p.id];
  if (!p.pendingAct) return;
  if (!live || !inp || p.stun > 0) { p.pendingAct = false; return; }
  if (s.dashCD > 0 || s.dashT > 0 || (!p.grounded && s.airDashed)) return; // (a press just before it's ready still counts: it ages out by itself)
  p.pendingAct = false;
  const dir = inp.right && !inp.left ? 1 : inp.left && !inp.right ? -1 : p.face;
  s.dashT = P.dashT; s.dashDir = dir; s.dashCD = P.dashCD + P.dashT; s.hit = false; p.face = dir;
  if (!p.grounded) s.airDashed = true;
  p.sx = 1.3; p.sy = 0.8;
  st.stat.dashes[p.id]++;
  Sfx.play('sprinkleDash', p.id);
  for (let i = 0; i < 5; i++) sprinkleFx(st, p.x + p.w / 2 - dir * 10, p.y + p.h - 4, -dir * (40 + sprinkleVR() * 80), -sprinkleVR() * 40, 0.35, 'rgba(255,255,255,0.85)', 3.5, 0, 'dot');
}
function sprinkleBumps(st, live) {
  const P = SPRINKLE, [a, b] = G.players;
  // bumps (the dashing player's turn alternates every tick, so a head-on clash is fair)
  const order = G.tickN & 1 ? [b, a] : [a, b];
  for (const p of order) {
    const s = st.pl[p.id], o = G.players[1 - p.id], so = st.pl[o.id];
    if (!live || s.dashT <= 0 || s.hit) continue;
    if (!(p.x - 4 < o.x + o.w && p.x + p.w + 4 > o.x && p.y < o.y + o.h && p.y + p.h > o.y)) continue;
    s.hit = true;
    const mx = (p.x + o.x + p.w) / 2, my = Math.min(p.y, o.y) + 10;
    if (so.dashT > 0 && so.dashDir === -s.dashDir) {
      so.hit = true;
      sprinkleKnock(st, p, -s.dashDir * 260, -200, 0.2); sprinkleKnock(st, o, -so.dashDir * 260, -200, 0.2);
      sprinkleWord(st, mx, my - 20, 'Boing!', '#ffffff'); Sfx.play('sprinkleBoing');
      st.stat.clashes++;
    } else if (so.shield > 0 || o.stun > 0) {
      s.dashT = 0; p.vx = -s.dashDir * 140;
      sprinkleWord(st, o.x + o.w / 2, o.y - 30, 'Shield!', '#dff3ff'); Sfx.play('sprinkleShield');
    } else {
      sprinkleKnock(st, o, s.dashDir * P.bumpV, -P.bumpLift, P.bumpStun);
      so.shield = P.shieldT; s.dashT = 0; p.vx = s.dashDir * 60;
      st.stat.bumps[p.id]++;
      const n = sprinkleSpill(st, o.id, 1, s.dashDir, p.id);
      sprinklePop(st, o.id, n ? 'Oopsie!' : 'Bump!', '#ffffff');
      sprinkleWord(st, mx, my, 'Bump!', PCOL[p.id]);
      Sfx.play('sprinkleBump', p.id); rumble(o.id, 0.3, 0.5, 120);
      for (let i = 0; i < 8; i++) sprinkleFx(st, mx, my + 10, (sprinkleVR() - 0.5) * 220, -sprinkleVR() * 160, 0.4, i % 2 ? '#ffffff' : PCOL[p.id], 3, 400, 'spark');
    }
  }
  // players don't stand on each other: a gentle push apart (gentle enough that a runner squeezes past, so nobody can be boxed in)
  if (Math.abs((a.y + a.h) - (b.y + b.h)) < 24 && a.x < b.x + b.w && a.x + a.w > b.x && st.pl[0].dashT <= 0 && st.pl[1].dashT <= 0) {
    const ov = Math.min(a.x + a.w - b.x, b.x + b.w - a.x), d = a.x + a.w / 2 <= b.x + b.w / 2 ? -1 : 1, push = Math.min(ov, 0.9) / 2;
    a.x = clamp(a.x + d * push, P.wallL, P.wallR - a.w); b.x = clamp(b.x - d * push, P.wallL, P.wallR - b.w);
  }
}

/* ---------- gobstoppers ---------- */
function sprinkleGobNew(st, x, mega) {
  const P = SPRINKLE, r = mega ? P.megaR : P.gobR;
  return { x, y: P.ceilY + r - 6, vx: (sprinkleRand() < 0.5 ? -1 : 1) * (mega ? 110 : 120 + sprinkleRand() * 50), vy: 60, r, mega: !!mega,
    life: mega ? 999 : P.gobLife + sprinkleRand() * 2, popT: -1, t: 0, rot: 0, col: Math.floor(sprinkleRand() * 3), squash: 0 };
}
// a warned drop: somewhere away from both players (best of a few tries)
function sprinkleGobWarn(st, mega) {
  let best = 480, bestD = -1;
  for (let i = 0; i < 4; i++) {
    const x = 120 + sprinkleRand() * 720;
    const d = Math.min(...G.players.map(p => Math.abs(p.x + p.w / 2 - x)));
    if (d > bestD) { bestD = d; best = x; }
  }
  st.warn.push({ x: best, t: SPRINKLE.gobWarn, mega: !!mega });
  Sfx.play('sprinkleWhistle');
}
function sprinkleGobStep(st, g, dt, live) {
  const P = SPRINKLE, grav = g.mega ? P.megaG : P.gobG;
  g.t += dt; g.squash *= Math.exp(-dt * 10);
  if (g.popT >= 0) { g.popT += dt; return; }
  const py = g.y;
  g.vy += grav * dt; g.x += g.vx * dt; g.y += g.vy * dt; g.rot += g.vx * dt / g.r;
  if (g.x - g.r < P.wallL) { g.x = P.wallL + g.r; g.vx = Math.abs(g.vx); Sfx.play('sprinkleThud'); }
  if (g.x + g.r > P.wallR) { g.x = P.wallR - g.r; g.vx = -Math.abs(g.vx); Sfx.play('sprinkleThud'); }
  if (g.y - g.r < P.ceilY && g.vy < 0) { g.y = P.ceilY + g.r; g.vy = Math.abs(g.vy) * 0.5; }
  if (g.vy > 0) for (const q of st.surf) {
    if (g.x < q.x0 - g.r * 0.25 || g.x > q.x1 + g.r * 0.25) continue;
    if (py + g.r > q.y + 0.5 || g.y + g.r < q.y) continue;
    g.y = q.y - g.r;
    g.vy = -(st.twist === 'jelly' && q.floor ? P.jellyBounce : g.mega ? P.megaBounce : P.gobBounce);
    g.squash = 1; Sfx.play('sprinkleGobBounce');
    if (st.twist === 'jelly' && q.floor) st.jelly.push({ x: g.x, t: 0, a: g.mega ? 1 : 0.7 });
    for (let i = 0; i < 4; i++) sprinkleFx(st, g.x + (sprinkleVR() - 0.5) * g.r, q.y - 2, (sprinkleVR() - 0.5) * 120, -sprinkleVR() * 60, 0.35, 'rgba(255,240,250,0.85)', 3, 200, 'dot');
    break;
  }
  if (!live) return;
  g.life -= dt;
  if (g.life <= 0) {
    // a gobstopper that is done pops into candy for anyone
    g.popT = 0; Sfx.play('sprinklePop');
    sprinkleWord(st, g.x, g.y - g.r - 10, 'Pop! Candy!', '#ffffff');
    for (let i = 0; i < 3; i++) {
      const c = sprinkleCandy(st, sprinkleRand() < 0.3 ? 'mint' : 'gumdrop', g.x, g.y);
      c.state = 'spill'; c.vx = (i - 1) * 110 + (sprinkleRand() - 0.5) * 60; c.vy = -360 - sprinkleRand() * 100; c.delay = 0.15; c.life = SPRINKLE.spillLife;
      st.candy.push(c);
    }
    for (let i = 0; i < 16; i++) sprinkleFx(st, g.x, g.y, Math.cos(i / 16 * SPRINKLE_TAU) * 200, Math.sin(i / 16 * SPRINKLE_TAU) * 200, 0.5, SPRINKLE_SPR[i % 7], 3, 300, 'dot');
    return;
  }
  // bonk the players
  for (const p of G.players) {
    const s = st.pl[p.id];
    if (s.shield > 0 || p.stun > 0) continue;
    const nx = clamp(g.x, p.x, p.x + p.w), ny = clamp(g.y, p.y - 10, p.y + p.h);
    if (Math.hypot(g.x - nx, g.y - ny) >= g.r - 1) continue;
    const cx = p.x + p.w / 2, dir = Math.sign(cx - g.x) || (sprinkleRand() < 0.5 ? -1 : 1);
    sprinkleKnock(st, p, dir * SPRINKLE.bonkV * (g.mega ? 1.15 : 1), -SPRINKLE.bonkLift, SPRINKLE.bonkStun);
    s.shield = SPRINKLE.gobShield;
    g.vx = -dir * Math.abs(g.vx);
    if (g.vy > 0 && g.y < p.y + 6) g.vy = -Math.max(380, g.vy * 0.7); // landed on a head: bounce off it
    st.stat.bonks[p.id]++;
    const n = sprinkleSpill(st, p.id, g.mega ? 3 : 2, dir);
    sprinklePop(st, p.id, 'Boing!', '#ffffff');
    if (!n) sprinkleWord(st, cx, p.y - 44, 'Phew, nothing to spill!', '#fff3d0');
    Sfx.play('sprinkleBoing', p.id); rumble(p.id, 0.4, 0.7, 180); G.shake = Math.max(G.shake, 0.12);
    st.bonkSeen[p.id]++;
    if (st.bonkSeen[p.id] === 1 && !sprinkleCpu(p.id)) st.hint[p.id] = { n: 'bonk', t: 0 };
  }
}

/* ---------- the shaker (and the gumdrop cloud) ---------- */
function sprinkleKindPick(st) {
  const r = sprinkleRand();
  if (st.twist === 'gumdrop') return r < 0.85 ? 'gumdrop' : r < 0.97 ? 'mint' : 'cupcake';
  return r < 0.56 ? 'gumdrop' : r < 0.85 ? 'mint' : 'cupcake';
}
function sprinkleShakerStep(st, dt, live) {
  const sh = st.shaker;
  sh.wob += dt;
  if (!live) { sh.x = approach(sh.x, sh.tx, 300 * dt); sh.shake = Math.max(0, sh.shake - dt); return; }
  // the catch-up golden candy, announced
  if (!st.sd && !st.cuDone && st.left <= SPRINKLE.cuLeft) {
    st.cuDone = true;
    const gap = st.pl[0].score - st.pl[1].score;
    if (Math.abs(gap) >= SPRINKLE.cuGap) {
      const k = gap > 0 ? 1 : 0;
      st.cuFor = k; st.cuSay = { k, t: 0 }; Sfx.play('sprinkleGoldHelp');
      if (st.twist === 'gumdrop') { const p = G.players[k]; st.candy.push(sprinkleCandy(st, 'gold', clamp(p.x + p.w / 2, 60, 900), SPRINKLE.spawnY)); st.cuFor = -1; }
      else { sh.state = 'move'; sh.next = 'gold'; sh.cu = true; }
    }
  }
  if (st.twist === 'gumdrop') {
    // the cloud: gumdrops anywhere along it
    sh.wait -= dt;
    if (sh.wait <= 0) {
      sh.wait = 0.42 + sprinkleRand() * 0.22;
      const kind = st.goldAt.length && st.t >= st.goldAt[0] ? (st.goldAt.shift(), 'gold') : sprinkleKindPick(st);
      const c = sprinkleCandy(st, kind, 50 + sprinkleRand() * 860, SPRINKLE.spawnY - 6);
      st.candy.push(c); st.stat.dropped++;
      if (kind === 'gold') { Sfx.play('sprinkleTing'); sprinkleWord(st, c.x, c.y + 10, 'Golden candy!', C.gold); }
    }
    return;
  }
  if (sh.cu && st.cuFor >= 0) { const p = G.players[st.cuFor]; sh.tx = clamp(p.x + p.w / 2, 60, 900); }
  if (sh.state === 'move') {
    sh.x = approach(sh.x, sh.tx, (sh.cu ? 900 : 640) * dt);
    if (Math.abs(sh.x - sh.tx) < 1) { sh.state = 'shake'; sh.shake = sh.cu ? 0.12 : 0.24; Sfx.play('sprinkleShake'); }
  } else if (sh.state === 'shake') {
    sh.shake -= dt;
    if (sh.shake <= 0) {
      sprinkleDrop(st, sh.next, sh.x);
      sh.cu = false; if (st.cuFor >= 0 && sh.next === 'gold') st.cuFor = -1;
      sh.state = 'wait';
      sh.wait = st.sd ? 1.0 : st.twist === 'storm' ? 0.5 + sprinkleRand() * 0.3 : 0.05 + sprinkleRand() * 0.15;
    }
  } else {
    sh.wait -= dt;
    if (sh.wait <= 0) sprinkleNextDrop(st);
  }
}
function sprinkleNextDrop(st) {
  const sh = st.shaker;
  sh.n++;
  let x, kind;
  if (st.sd) { sh.side = -sh.side; x = 480 + sh.side * (90 + sprinkleRand() * 300); kind = 'gold'; }
  else {
    // often the other half from the last drop, so it criss-crosses the arena; otherwise a short hop along
    if (sprinkleRand() < 0.55) { const left = sh.x > 480; x = left ? 70 + sprinkleRand() * 400 : 490 + sprinkleRand() * 400; }
    else { const d = (120 + sprinkleRand() * 180) * (sprinkleRand() < 0.5 ? -1 : 1); x = sh.x + d; if (x < 70 || x > 890) x = sh.x - d; }
    if (st.goldAt.length && st.t >= st.goldAt[0]) { st.goldAt.shift(); kind = 'gold'; }
    else if (st.twist === 'storm') kind = sh.n % 3 === 0 ? sprinkleKindPick(st) : 'storm';
    else kind = sprinkleKindPick(st);
  }
  sh.tx = clamp(x, 60, 900); sh.next = kind; sh.state = 'move';
}
function sprinkleDrop(st, kind, x) {
  st.shaker.shake = 0;
  if (kind === 'storm') {
    // a burst of tiny sprinkles
    const n = 6 + Math.floor(sprinkleRand() * 3);
    for (let i = 0; i < n; i++) {
      const c = sprinkleCandy(st, 'sprinkle', x + (sprinkleRand() - 0.5) * 30, SPRINKLE.spawnY + sprinkleRand() * 6);
      c.vx = (sprinkleRand() - 0.5) * 170; c.vy = 40 + sprinkleRand() * 120;
      st.candy.push(c);
    }
    st.stat.dropped += n; Sfx.play('sprinkleStorm');
    return;
  }
  const c = sprinkleCandy(st, kind, x, SPRINKLE.spawnY);
  st.candy.push(c); st.stat.dropped++;
  if (kind === 'gold') {
    Sfx.play('sprinkleTing');
    sprinkleWord(st, x, SPRINKLE.spawnY + 14, st.cuSay && st.cuSay.t < 3 ? 'For ' + NAMES[st.cuSay.k] + '!' : 'Golden candy!', C.gold);
  }
}

/* ---------- candy step ---------- */
function sprinkleCandyStep(st, dt, live) {
  const P = SPRINKLE, order = G.tickN & 1 ? [1, 0] : [0, 1];
  let n = 0;
  for (const c of st.candy) {
    c.t += dt; c.rot += c.spin * dt;
    let gone = false;
    if (c.state === 'fall') {
      const K = SPRINKLE_KINDS[c.kind], py = c.y;
      // a gold basket's candy magnet pulls nearby candy in
      if (live) for (const k of order) {
        const s = st.pl[k]; if (!s.magnet) continue;
        const b = sprinkleBasket(st, k), dx = b.cx - c.x;
        if (Math.abs(dx) < P.magnetX && c.y < b.y0 && c.y > b.y0 - 220) c.vx = clamp(c.vx + Math.sign(dx) * P.magnetPull * dt, -160, 160);
      }
      c.vy = Math.min(K.max, c.vy + K.g * dt);
      c.x += c.vx * dt; c.y += c.vy * dt; c.vx *= Math.exp(-1.2 * dt);
      if (c.x < P.wallL + c.r) { c.x = P.wallL + c.r; c.vx = Math.abs(c.vx); }
      if (c.x > P.wallR - c.r) { c.x = P.wallR - c.r; c.vx = -Math.abs(c.vx); }
      if (live && sprinkleTryCatch(st, c, order)) { gone = true; }
      else if (c.vy > 0) for (const q of st.surf) {
        if (!q.floor || py + c.r > q.y || c.y + c.r < q.y) continue; // (falling candy drops past the wafers)
        if (st.twist === 'gumdrop' && c.kind === 'gumdrop' && c.bounces === 0) {
          c.bounces = 1; c.y = q.y - c.r; c.vy = -Math.max(260, c.vy * 0.6); Sfx.play('sprinkleGumBounce');
          break;
        }
        gone = true; st.stat.plops++;
        sprinkleFx(st, c.x, q.y - 3, 0, -20, 0.45, 'rgba(255,248,252,0.9)', c.r * 0.9, 0, 'smoke');
        for (let i = 0; i < 4; i++) sprinkleFx(st, c.x, q.y - 3, (sprinkleVR() - 0.5) * 120, -40 - sprinkleVR() * 80, 0.4, sprinkleCandyCol(c), 2, 500, 'dot');
        if (c.kind !== 'sprinkle') Sfx.play('sprinklePlop');
        break;
      }
    } else { // spilled: tumbles, lands, rests on whatever it landed on until someone scoops it or it melts away
      c.delay -= dt; c.life -= dt; if (c.lockT > 0) c.lockT -= dt;
      if (!c.rest) {
        const py = c.y;
        c.vy += P.spillG * dt; c.x += c.vx * dt; c.y += c.vy * dt;
        if (c.x < P.wallL + c.r) { c.x = P.wallL + c.r; c.vx = Math.abs(c.vx) * 0.6; }
        if (c.x > P.wallR - c.r) { c.x = P.wallR - c.r; c.vx = -Math.abs(c.vx) * 0.6; }
        if (c.y - c.r < P.ceilY && c.vy < 0) { c.vy = 0; }
        if (live && c.delay <= 0 && c.vy > -40 && sprinkleTryCatch(st, c, order)) gone = true;
        else if (c.vy > 0) for (const q of st.surf) {
          if (c.x < q.x0 || c.x > q.x1 || py + c.r > q.y + 0.5 || c.y + c.r < q.y) continue;
          c.y = q.y - c.r;
          if (c.vy > 240) { c.vy = -c.vy * 0.35; c.vx *= 0.6; }
          else { c.vy = 0; c.vx = 0; c.rest = true; c.surf = q.i; }
          break;
        }
      } else {
        const q = st.surf[c.surf];
        if (q && q.floor && st.twist === 'belt') c.x = clamp(c.x + st.belt.v * dt, P.wallL + c.r, P.wallR - c.r);
      }
      if (!gone && live && c.delay <= 0) {
        for (const k of order) {
          const p = G.players[k];
          if (p.stun > 0 || (c.lockT > 0 && c.lock === k)) continue;
          if (c.x + c.r > p.x - 5 && c.x - c.r < p.x + p.w + 5 && c.y + c.r > p.y && c.y - c.r < p.y + p.h + 3) { sprinkleCatch(st, k, c, 'scoop'); gone = true; break; }
        }
      }
      if (!gone && c.life <= 0) {
        gone = true;
        sprinkleFx(st, c.x, c.y, 0, -30, 0.5, 'rgba(255,248,252,0.85)', c.r, 0, 'smoke');
      }
    }
    if (!gone) st.candy[n++] = c;
  }
  st.candy.length = n;
}
// a falling candy dropping into a basket (or bouncing off a body)
function sprinkleTryCatch(st, c, order) {
  for (const k of order) {
    const p = G.players[k];
    if (!p.alive || (c.lockT > 0 && c.lock === k)) continue;
    const b = sprinkleBasket(st, k), m = c.r * 0.5;
    if (c.vy > -40 && c.x > b.x0 - m && c.x < b.x1 + m && c.y + m > b.y0 && c.y < b.y1 + 2) { sprinkleCatch(st, k, c, 'catch'); return true; }
    // hitting the body below the basket: it bounces off
    if (!c.bonked && c.state === 'fall' && c.vy > 0 && c.x + c.r > p.x && c.x - c.r < p.x + p.w && c.y + c.r > p.y + 6 && c.y - c.r < p.y + p.h) {
      c.bonked = true; c.vx = (Math.sign(c.x - b.cx) || 1) * 130; c.vy = -Math.min(180, c.vy * 0.4);
    }
  }
  return false;
}
function sprinkleCandyCol(c) {
  if (c.kind === 'gold') return C.gold;
  if (c.kind === 'mint') return '#ff5f6d';
  if (c.kind === 'cupcake') return '#ff9ccf';
  if (c.kind === 'sprinkle') return SPRINKLE_SPR[c.col % 7];
  return SPRINKLE_GUM[c.col % 6];
}

/* ---------- effects (looks only) ---------- */
function sprinkleFx(st, x, y, vx, vy, life, col, size, grav, kind) {
  const v = st.vis; if (!v) return;
  v.fx.push({ x, y, vx, vy, life, max: life, col, size, grav, kind: kind || 'dot' });
  if (v.fx.length > 360) v.fx.splice(0, v.fx.length - 360);
}
function sprinkleVisNew() { return { fx: [], words: [] }; }
function sprinkleVisTick(st, dt) {
  const v = st.vis; if (!v) return;
  const fr = Math.exp(-1.6 * dt);
  let n = 0;
  for (const q of v.fx) { q.life -= dt; q.vx *= fr; q.vy *= fr; q.vy += q.grav * dt; q.x += q.vx * dt; q.y += q.vy * dt; if (q.life > 0) v.fx[n++] = q; }
  v.fx.length = n; n = 0;
  for (const w of v.words) { w.t += dt; if (w.t < 0.9) v.words[n++] = w; }
  v.words.length = n; n = 0;
  for (const j of st.jelly) { j.t += dt; if (j.t < 0.9) st.jelly[n++] = j; }
  st.jelly.length = n;
  for (const s of st.pl) { s.popT += dt; s.tilt *= Math.exp(-dt * 6); }
  if (st.cuSay) { st.cuSay.t += dt; if (st.cuSay.t > 3.5) st.cuSay = null; }
  for (const k of [0, 1]) if (st.hint[k]) { st.hint[k].t += dt; if (st.hint[k].t > 4.5) st.hint[k] = null; }
}

/* ---------- the tick ---------- */
function sprinkleInput(p) {
  const i = p.input;
  return { left: !!i.left, right: !!i.right, jump: !!i.jump, down: !!i.down, act: !!i.act };
}
function sprinkleRoundOver(st, winner) {
  st.over = true;
  // whatever is still falling turns into a puff of sugar; gobstoppers pop
  for (const c of st.candy) if (c.state === 'fall') sprinkleFx(st, c.x, c.y, 0, -20, 0.4, 'rgba(255,248,252,0.85)', c.r, 0, 'smoke');
  st.candy = st.candy.filter(c => c.state !== 'fall');
  for (const g of st.gobs) if (g.popT < 0) { g.popT = 0; Sfx.play('sprinklePop'); }
  st.warn.length = 0;
  if (winner >= 0) st.pl[winner].joyT = 0.01;
}
// live = the round is live; false during the round-end banner (no keys, no new candy)
function sprinkleTick(dt, live) {
  const st = G.mst;
  st.t += dt;
  if (live) {
    st.left = Math.max(0, st.left - dt);
    // gobstopper warnings and drops
    while (st.gobPlan.length && st.t >= st.gobPlan[0].at) sprinkleGobWarn(st, st.gobPlan.shift().mega);
    for (const w of st.warn) {
      w.t -= dt;
      if (w.t <= 0) { st.gobs.push(sprinkleGobNew(st, w.x, w.mega)); Sfx.play('sprinkleGobDrop'); }
    }
    st.warn = st.warn.filter(w => w.t > 0);
    // the conveyor flips now and then, with a warning first
    if (st.twist === 'belt') {
      const b = st.belt;
      b.flipIn -= dt;
      if (b.flipIn <= 1.3 && !b.warned) { b.warned = true; Sfx.play('sprinkleBeltWarn'); }
      if (b.flipIn <= 0) { b.v = -b.v; b.flipIn = 7 + sprinkleRand() * 2.5; b.warned = false; Sfx.play('sprinkleBelt'); }
    }
  }
  if (st.twist === 'belt') st.belt.phase += st.belt.v * dt;
  const order = G.tickN & 1 ? [G.players[1], G.players[0]] : G.players;
  for (const p of order) {
    const inp = live ? sprinkleInput(p) : null;
    sprinkleAct(st, p, inp, live);
    sprinkleMove(st, p, inp, dt);
  }
  sprinkleBumps(st, live);
  for (const p of G.players) { p.pendingJump = false; if (!live) p.pendingAct = false; }
  sprinkleShakerStep(st, dt, live && !st.over);
  for (const g of st.gobs) sprinkleGobStep(st, g, dt, live && !st.over);
  st.gobs = st.gobs.filter(g => g.popT < 0.35);
  sprinkleCandyStep(st, dt, live && !st.over);
  // the winner hops for joy during the banner
  for (const s of st.pl) {
    if (!s.joyT) continue;
    s.joyT += dt;
    const p = G.players[s.k];
    if (p.grounded && s.joyT > 0.25) { p.vy = -430; p.grounded = false; s.joyT = 0.01; p.sx = 0.8; p.sy = 1.25; }
  }
  sprinkleVisTick(st, dt);
  if (!live || st.over) return;
  if (st.sdWin >= 0) { if (matchRoundEnd(st.sdWin, 'Caught the golden candy first!')) sprinkleRoundOver(st, st.sdWin); return; }
  // hints for people (never for the computer): a bump reminder in rounds 1-2 if they haven't tried it
  if (G.match.round <= 2 && st.t > 13 && !st.bumpHinted) {
    st.bumpHinted = true;
    for (const k of [0, 1]) if (!sprinkleCpu(k) && st.stat.dashes[k] === 0 && !st.hint[k]) st.hint[k] = { n: 'bump', t: 0 };
  }
  // a gold basket's catch-up candy, or the end of the clock
  if (st.left <= 0) {
    const [a, b] = st.pl, w = a.score === b.score ? -1 : a.score > b.score ? 0 : 1;
    if (st.sd) { if (matchRoundEnd(-1, 'Nobody caught a golden candy!')) sprinkleRoundOver(st, -1); return; }
    const hi = Math.max(a.score, b.score), lo = Math.min(a.score, b.score);
    const why = w < 0 ? 'Tied at ' + hi + ' candy!' : hi - lo === 1 ? 'Most candy, by just one! ' + hi + ' to ' + lo : 'Most candy: ' + hi + ' to ' + lo + '!';
    if (w >= 0) {
      const best = st.stat.best;
      if (!best || hi > best.n) st.stat.best = { k: w, n: hi, tw: st.twist };
    }
    if (matchRoundEnd(w, why)) sprinkleRoundOver(st, w);
    return;
  }
  // tick sounds in the last 5 seconds, and a call at 10
  const sec = Math.ceil(st.left);
  if (sec !== st.lastSec) {
    st.lastSec = sec;
    if (sec <= 5 && sec > 0) Sfx.play('tick');
    if (sec === 10 && !st.sd) { st.tenSay = 0; Sfx.play('sprinkleTen'); }
  }
  if (st.tenSay != null) { st.tenSay += dt; if (st.tenSay > 2) st.tenSay = null; }
}

MODES.sprinkle = {
  rand: Math.random,
  setup(st, L) {
    for (const row of L.grid) row.fill('.');
    st.stat = { caught: [0, 0], gold: [0, 0], bumps: [0, 0], spills: [0, 0], scoops: [0, 0], bonks: [0, 0], jumps: [0, 0], dashes: [0, 0],
      total: [0, 0], clashes: 0, dropped: 0, plops: 0, best: null };
    const mix = SPRINKLE_MIX.slice();
    for (let i = mix.length - 1; i > 0; i--) { const j = Math.floor(this.rand() * (i + 1)); [mix[i], mix[j]] = [mix[j], mix[i]]; }
    st.order = ['plain', ...mix.slice(0, 4)];
    st.forceTwist = this.testTwist || null;
    st.bonkSeen = [0, 0];
    st.vis = sprinkleVisNew();
    st.pl = [sprinklePlNew(0), sprinklePlNew(1)]; st.surf = sprinkleLayout('plain'); st.candy = []; st.gobs = []; st.warn = []; st.jelly = [];
  },
  resetRound(n, info) {
    const st = G.mst, m = G.match, P = SPRINKLE, L = G.level;
    st.counted = false; // (each round's candy joins the match total once, at the round-end banner)
    st.sd = !!info.suddenDeath;
    st.twist = info.suddenDeath ? 'golden' : (st.forceTwist || st.order[Math.min(n, st.order.length) - 1]);
    st.surf = sprinkleLayout(st.twist);
    st.pl = [sprinklePlNew(0), sprinklePlNew(1)];
    st.candy = []; st.gobs = []; st.warn = []; st.jelly = []; st.cid = 1;
    st.t = 0; st.left = st.sd ? P.sdCap : P.roundT; st.lastSec = Math.ceil(st.left); st.over = false; st.tenSay = null; st.sdWin = -1;
    st.cuDone = false; st.cuFor = -1; st.cuSay = null; st.hint = [null, null]; st.bumpHinted = false; st.goldSaid = false;
    st.vis = sprinkleVisNew();
    st.shaker = { x: 480, tx: 480, state: 'wait', wait: 0.35, shake: 0, next: 'gumdrop', n: 0, side: this.rand() < 0.5 ? 1 : -1, wob: 0, cu: false };
    st.belt = { v: (this.rand() < 0.5 ? -1 : 1) * P.beltV, flipIn: 7 + this.rand() * 2, warned: false, phase: 0 };
    // golden candy: one now and then (none in the sudden death, where every drop is golden)
    st.goldAt = st.sd ? [] : [8 + this.rand() * 16];
    st.gobPlan = st.twist === 'mega' ? [{ at: 1.6, mega: true }] : st.sd ? [{ at: 5 }] : [{ at: 5.5 + this.rand() * 2 }, { at: 18 + this.rand() * 3 }];
    // whoever trails in rounds gets a gold basket (wider), 2+ behind also a candy magnet
    for (const s of st.pl) {
      const behind = s.k === 0 ? m.wins[1] - m.wins[0] : m.wins[0] - m.wins[1];
      s.gold = st.sd ? 0 : Math.max(0, behind);
      if (s.gold >= 1) s.bw = P.goldBasketW;
      if (s.gold >= 2) s.magnet = true;
    }
    // both on their spawns (mirror images), standing on the floor
    G.players.forEach((p, k) => {
      p.x = L.spawns[k].x; p.y = P.floorY - p.h; p.vx = 0; p.vy = 0; p.grounded = true; p.face = k === 0 ? 1 : -1; p.stun = 0; p.stompSafe = 0;
    });
    G.particles.length = 0;
  },
  go() {
    const st = G.mst;
    Sfx.play('sprinkleGo');
    for (const s of st.pl) if (s.gold) sprinklePop(st, s.k, s.gold >= 2 ? 'Gold basket + magnet!' : 'Gold basket!', C.gold);
  },
  step(dt) { sprinkleTick(dt, true); },
  idle(dt) {
    const st = G.mst, m = G.match; if (!st.pl || !st.surf) return;
    for (const p of G.players) { p.pendingAct = false; p.pendingJump = false; }
    if (m.phase === 'end') {
      if (!st.over) sprinkleRoundOver(st, m.end ? m.end.winner : -1);
      if (st.counted === false) { st.counted = true; for (const k of [0, 1]) st.stat.total[k] += st.pl[k].score; }
      sprinkleTick(dt, false); return;
    }
    // before GO: standing at the start, the shaker waits in the middle
    sprinkleVisTick(st, dt);
    st.shaker.wob += dt;
    if (m.phase === 'count' && !st.goldSaid) { st.goldSaid = true; if (st.pl.some(s => s.gold)) Sfx.play('sprinkleGoldHelp'); }
  },
  tiebreak() {
    const st = G.mst, s = st.stat, g = s.gold;
    if (g[0] !== g[1]) return { winner: g[0] > g[1] ? 0 : 1, reason: 'Most golden candy this match!' };
    const t = s.total;
    if (t[0] !== t[1]) return { winner: t[0] > t[1] ? 0 : 1, reason: 'Most candy this match!' };
    return -1;
  },
  draw() { sprinkleDrawWorld(); },
  drawTop() { sprinkleDrawTop(); },
  hud() { sprinkleHud(); },
  stats() {
    const s = G.mst.stat;
    const out = [
      { label: 'Candy caught', values: [s.caught[0] + s.scoops[0], s.caught[1] + s.scoops[1]] },
      { label: 'Golden candy', values: s.gold.slice() },
      { label: 'Bumps', values: s.bumps.slice() },
      { label: 'Spills', values: s.spills.slice() },
    ];
    if (s.best) out.push('Sweetest round: ' + NAMES[s.best.k] + ', ' + s.best.n + ' candy (' + SPRINKLE_TWISTS[s.best.tw].name + ').');
    const bk = s.bonks[0] + s.bonks[1], sc = s.scoops[0] + s.scoops[1];
    if (bk > 0) out.push('Gobstopper boings: ' + bk + (sc ? ', spilled candy scooped up: ' + sc : '') + '. All bouncy, nobody hurt!');
    else if (sc > 0) out.push('Spilled candy scooped up: ' + sc + '.');
    return out;
  },
  // test access for the bot harness and the computer brain (no window globals)
  test: { SPRINKLE, SPRINKLE_KINDS, SPRINKLE_TWISTS, predict: sprinklePredict, surfBelow: sprinkleSurfBelow, basket: sprinkleBasket, layout: sprinkleLayout },
};


/* ---------- drawing ---------- */
function sprinkleStar(x, y, r, col, rot = 0) {
  ctx.fillStyle = col; ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = rot + i * Math.PI / 5 - Math.PI / 2, rr0 = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr0, y + Math.sin(a) * rr0); }
  ctx.closePath(); ctx.fill();
}
function sprinkleLolly(x, y, r, a, b, stick) {
  ctx.strokeStyle = '#fff8f0'; ctx.lineWidth = Math.max(2, r * 0.22); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + stick); ctx.stroke();
  ctx.fillStyle = a; circle(x, y, r); ctx.fill();
  ctx.strokeStyle = b; ctx.lineWidth = r * 0.28; ctx.beginPath();
  for (let i = 0; i <= 28; i++) { const t = i / 28, ang = t * Math.PI * 4.2, rad = r * 0.85 * t; if (i) ctx.lineTo(x + Math.cos(ang) * rad, y + Math.sin(ang) * rad); else ctx.moveTo(x, y); }
  ctx.stroke();
}
// candy-cane stripes on a vertical post
function sprinkleCane(x, y0, y1, w) {
  ctx.save(); ctx.beginPath(); ctx.rect(x, y0, w, y1 - y0); ctx.clip();
  ctx.fillStyle = '#fffaf6'; ctx.fillRect(x, y0, w, y1 - y0);
  ctx.fillStyle = '#ff5f7e';
  for (let y = y0 - w; y < y1 + w; y += 22) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y - 9); ctx.lineTo(x + w, y + 1); ctx.lineTo(x, y + 10); ctx.fill(); }
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x + 1, y0, w * 0.3, y1 - y0);
  ctx.restore();
}
let sprinkleMoundCols = [];
function sprinkleDrawSky() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, C.skyTop); g.addColorStop(0.75, C.skyBot); g.addColorStop(1, C.skyBot);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // cotton-candy clouds drifting
  const tt = G.clock;
  for (let i = 0; i < 4; i++) {
    const x = ((i * 280 + tt * (6 + i * 2)) % (W + 240)) - 120, y = 168 + (i % 2) * 40;
    ctx.fillStyle = i % 2 ? 'rgba(255,224,240,0.75)' : 'rgba(255,255,255,0.7)';
    ctx.beginPath(); ctx.arc(x, y, 22, 0, Math.PI * 2); ctx.arc(x + 26, y - 10, 28, 0, Math.PI * 2); ctx.arc(x + 56, y, 20, 0, Math.PI * 2); ctx.rect(x, y, 56, 16); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; circle(x + 20, y - 22, 10); ctx.fill();
  }
  // far hills with lollipop trees, near chocolate hills with a drizzle of frosting
  const farY = x => 330 + Math.sin(x / 120) * 26 + Math.sin(x / 47) * 8, nearY = x => 392 + Math.sin(x / 90 + 1) * 18;
  ctx.fillStyle = C.hillFar; ctx.beginPath(); ctx.moveTo(0, 480);
  for (let x = 0; x <= W; x += 20) ctx.lineTo(x, farY(x));
  ctx.lineTo(W, 480); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = tint(C.hillFar, 0.3); ctx.lineWidth = 2.5; ctx.beginPath();
  for (let x = 0; x <= W; x += 20) x ? ctx.lineTo(x, farY(x) + 1.5) : ctx.moveTo(x, farY(x) + 1.5);
  ctx.stroke();
  for (let i = 0; i < 7; i++) {
    const x = 70 + i * 140 + (i % 2) * 30;
    sprinkleLolly(x, farY(x) - 30, 13, ['#ffe066', '#9fe7ff', '#ffffff', '#c9b0ff'][i % 4], ['#ff7fae', '#ff9a4a', '#ff5f7e', '#7fc8ff'][i % 4], 30);
  }
  // gingerbread house far off
  ctx.save(); ctx.translate(820, farY(820) + 4);
  ctx.fillStyle = '#c98b5a'; ctx.fillRect(-20, -24, 40, 26);
  ctx.fillStyle = '#a8703f'; ctx.fillRect(8, -24, 12, 26);
  ctx.strokeStyle = '#8a5530'; ctx.lineWidth = 1.5; ctx.strokeRect(-20, -24, 40, 26);
  ctx.fillStyle = '#fff6f0'; ctx.beginPath(); ctx.moveTo(-26, -22); ctx.lineTo(0, -44); ctx.lineTo(26, -22); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#e6c9d8'; ctx.stroke();
  ctx.fillStyle = '#ff7fae'; for (let k = -2; k <= 2; k++) { circle(k * 9, -23, 2.2); ctx.fill(); }
  ctx.fillStyle = '#ff7fae'; ctx.fillRect(-5, -12, 10, 14); ctx.fillStyle = '#9fe7ff'; ctx.fillRect(-16, -18, 7, 7); ctx.fillRect(9, -18, 7, 7);
  ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(-16, -18, 3, 2); ctx.fillRect(9, -18, 3, 2);
  ctx.restore();
  ctx.fillStyle = C.hillNear; ctx.beginPath(); ctx.moveTo(0, 480);
  for (let x = 0; x <= W; x += 20) ctx.lineTo(x, nearY(x));
  ctx.lineTo(W, 480); ctx.closePath(); ctx.fill();
  // soft frosting mounds along the near hills (plain shapes, so nobody mistakes them for candy)
  const mc = sprinkleMoundCols[0] === C.hillNear ? sprinkleMoundCols : (sprinkleMoundCols = [C.hillNear, shade(C.hillNear, 0.08), tint(C.hillNear, 0.22)]);
  ctx.fillStyle = mc[1]; ctx.beginPath();
  for (let i = 0; i < 9; i++) { const x = 40 + i * 110 + (hash(i, 61) % 40), y = nearY(x) + 14 + (hash(i, 62) % 18), r = 9 + (hash(i, 63) % 6); ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.moveTo(x + r * 1.75, y + r * 0.3); ctx.arc(x + r, y + r * 0.3, r * 0.75, 0, Math.PI * 2); }
  ctx.fill(); ctx.fillStyle = mc[2]; ctx.beginPath();
  for (let i = 0; i < 9; i++) { const x = 40 + i * 110 + (hash(i, 61) % 40), y = nearY(x) + 14 + (hash(i, 62) % 18), r = 9 + (hash(i, 63) % 6); ctx.moveTo(x - r * 0.3 + r * 0.35, y - r * 0.35); ctx.arc(x - r * 0.3, y - r * 0.35, r * 0.35, 0, Math.PI * 2); }
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath();
  for (let x = 0; x <= W; x += 20) { const y = nearY(x) + 5 + ((x / 20) % 3 === 0 ? 6 : 0); if (x) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
  ctx.stroke();
}
function sprinkleDrawFloor(st) {
  const P = SPRINKLE, y = P.floorY, tw = st.twist;
  if (tw === 'jelly') {
    // wobbly see-through jelly
    ctx.fillStyle = '#d93f86'; ctx.fillRect(0, y + 6, W, H - y);
    ctx.fillStyle = 'rgba(255,105,170,0.95)'; ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 10) {
      let d = Math.sin(G.clock * 3 + x / 40) * 1.5;
      for (const j of st.jelly) { const k = 1 - j.t / 0.9, dist = Math.abs(x - j.x); if (dist < 120) d += Math.sin(j.t * 22 - dist / 18) * 7 * j.a * k * (1 - dist / 120); }
      ctx.lineTo(x, y + d);
    }
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (let i = 0; i < 9; i++) { const bx = (i * 113 + 30) % W, by = y + 46 - ((G.clock * 12 + i * 9) % 36); circle(bx, by, 3 + (i % 3)); ctx.fill(); }
    ctx.strokeStyle = 'rgba(255,225,240,0.9)'; ctx.lineWidth = 3; ctx.beginPath();
    for (let x = 0; x <= W; x += 10) { let d = Math.sin(G.clock * 3 + x / 40) * 1.5; for (const j of st.jelly) { const k = 1 - j.t / 0.9, dist = Math.abs(x - j.x); if (dist < 120) d += Math.sin(j.t * 22 - dist / 18) * 7 * j.a * k * (1 - dist / 120); } if (x) ctx.lineTo(x, y + d + 1); else ctx.moveTo(x, y + d + 1); }
    ctx.stroke();
    return;
  }
  if (tw === 'belt') {
    // a conveyor belt: rollers, a moving striped belt, arrows (flashing gold before a flip)
    ctx.fillStyle = '#6a4a6e'; ctx.fillRect(0, y, W, H - y);
    ctx.fillStyle = '#f7e9f5'; ctx.fillRect(0, y, W, 14);
    const ph = ((st.belt.phase % 40) + 40) % 40;
    ctx.fillStyle = '#ffb3d4';
    for (let x = -40 + ph; x < W + 40; x += 40) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 14, y); ctx.lineTo(x + 6, y + 14); ctx.lineTo(x - 8, y + 14); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle = '#4a3350'; for (let x = 15; x < W; x += 38) { circle(x, y + 30, 9); ctx.fill(); }
    ctx.fillStyle = '#c7b3cf'; for (let x = 15; x < W; x += 38) { circle(x, y + 30, 3.5); ctx.fill(); }
    const b = st.belt, warn = b.flipIn < 1.3 && G.match && G.match.phase === 'live', dir = Math.sign(b.v);
    if (!warn || Math.floor(G.clock * 6) % 2 === 0) for (let x = 230; x < W; x += 250) {
      ctx.fillStyle = warn ? C.gold : 'rgba(255,255,255,0.8)';
      ctx.beginPath(); ctx.moveTo(x + dir * 20, y + 46); ctx.lineTo(x - dir * 2, y + 35); ctx.lineTo(x - dir * 2, y + 57); ctx.closePath(); ctx.fill();
      ctx.fillRect(Math.min(x - dir * 2, x - dir * 18), y + 43, 16, 6);
    }
    return;
  }
  // chocolate cake floor with a frosting top: one cached picture (rich props pass)
  CK.pic('spfloor' + y, W, H - y + 4, 0, 0, () => { ctx.translate(0, -(y - 4)); sprinkleFloorPaint(y); }, 0, y - 4);
}
// (rich props pass, Nov 2026) the cake floor: sponge with air holes and crumbs, two cream fillings, a ganache layer,
// a frosting top with piped beads, drips and lots of sprinkles
function sprinkleFloorPaint(y) {
  ctx.fillStyle = '#7a4a32'; ctx.fillRect(0, y, W, H - y);
  // sponge layers: a darker crumb band, a cream filling with a lit edge, crumbs
  ctx.fillStyle = '#6a3e28'; ctx.fillRect(0, y + 44, W, H - y - 44);
  ctx.fillStyle = '#8f5a3e'; for (let x = 0; x < W; x += 60) ctx.fillRect(x + 6, y + 36, 40, 4);
  ctx.fillStyle = '#ff9ccf'; ctx.fillRect(0, y + 24, W, 6);
  ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillRect(0, y + 24, W, 1.5);
  ctx.fillStyle = 'rgba(80,30,40,0.25)'; ctx.fillRect(0, y + 30, W, 2);
  ctx.fillStyle = 'rgba(40,18,8,0.35)'; for (let x = 4; x < W; x += 23) { circle(x + (hash(x, 9) % 12), y + 52 + (hash(x, 3) % 30), 1.5 + (x % 2)); ctx.fill(); }
  ctx.fillStyle = '#fff4fa'; ctx.beginPath(); ctx.moveTo(0, y - 2);
  for (let x = 0; x <= W; x += 24) { ctx.lineTo(x, y + 8); ctx.quadraticCurveTo(x + 6, y + 18 + ((x / 24) % 3) * 3, x + 12, y + 8); }
  ctx.lineTo(W, y - 2); ctx.closePath(); ctx.fill();
  // sponge air holes (a dark hole with a lit lower lip) over both sponge layers
  for (let i = 0; i < 70; i++) {
    const hx = CK.r(i, 31) * W, hy = i % 3 ? y + 50 + CK.r(i, 32) * (H - y - 54) : y + 33 + CK.r(i, 33) * 8, hr = 1.2 + CK.r(i, 34) * 2.2;
    ctx.fillStyle = 'rgba(40,18,8,0.45)'; ctx.beginPath(); ctx.ellipse(hx, hy, hr * 1.3, hr, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(200,140,100,0.35)'; ctx.fillRect(hx - hr, hy + hr - 0.6, hr * 2, 0.9);
  }
  // a second cream layer lower down, and a ganache band between
  ctx.fillStyle = '#fff1f7'; ctx.fillRect(0, y + 44, W, 4); ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(0, y + 44, W, 1);
  ctx.fillStyle = 'rgba(80,30,40,0.3)'; ctx.fillRect(0, y + 48, W, 1.5);
  ctx.fillStyle = '#4a2416'; ctx.fillRect(0, y + 17, W, 7); ctx.fillStyle = 'rgba(255,200,170,0.25)'; ctx.fillRect(0, y + 17, W, 1);
  // frosting: piped beads along the bottom of the top layer, and longer drips
  ctx.fillStyle = '#fff4fa';
  for (let x = 6; x < W; x += 24) {
    const dl = 3 + CK.r(x, 41) * 5;
    if (CK.r(x, 42) < 0.3) { ctx.beginPath(); ctx.ellipse(x + 12, y + 13, 3, dl, 0, 0, Math.PI); ctx.rect(x + 8.8, y + 10, 6.4, 4); ctx.fill(); }
  }
  ctx.fillStyle = 'rgba(230,180,200,0.6)'; for (let x = 0; x <= W; x += 24) { ctx.beginPath(); ctx.arc(x + 6, y + 15 + ((x / 24) % 3) * 3, 4, 0, Math.PI); ctx.fill(); }
  ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(0, y - 2, W, 1.5);
  for (let x = 4; x < W; x += 9) { ctx.fillStyle = 'rgba(255,255,255,0.9)'; circle(x, y - 1, 2); ctx.fill(); ctx.fillStyle = 'rgba(230,180,200,0.6)'; circle(x + 0.6, y + 0.6, 1); ctx.fill(); }
  for (let x = 8; x < W; x += 17) { ctx.fillStyle = SPRINKLE_SPR[(x / 17 | 0) % 7]; ctx.save(); ctx.translate(x, y + 3 + (x % 3)); ctx.rotate(x); ctx.fillRect(-3, -1, 6, 2); ctx.restore(); }
  for (let i = 0; i < 40; i++) { const sx = CK.r(i, 51) * W, sy = y + 2 + CK.r(i, 52) * 7; ctx.fillStyle = SPRINKLE_SPR[i % 7]; circle(sx, sy, 1.1); ctx.fill(); }
  // crumbs fallen against the cake
  ctx.fillStyle = '#8f5a3e'; for (let i = 0; i < 24; i++) { const cx = CK.r(i, 61) * W; ctx.fillRect(cx, y + 26 + CK.r(i, 62) * 3, 2, 1.5); }
}
// a wafer platform (or a cake-stand tier, or a shelf)
function sprinkleDrawSurf(q) {
  if (q.floor) return;
  const w = q.x1 - q.x0, y = q.y;
  if (q.kind === 'tier') {
    const bottom = q.tier === 0 ? SPRINKLE.floorY : q.tier === 1 ? 400 : 296;
    CK.pic('sptier' + q.tier + '|' + w + '|' + y, w + 16, bottom - y + 22, 8, 22, () => sprinkleSurfPaint(q, w, y, bottom), q.x0, y);
  } else CK.pic('spsurf' + q.kind + '|' + w, w + 12, 30, 6, 6, () => sprinkleSurfPaint(q, w, y, 0), q.x0, y);
}
// (rich props pass, Nov 2026) a platform drawn at its own top-left: a wafer with waffle pockets and a lit lip under a
// frosting top with drips, beads and sprinkles (sugar pearls on the blue shelves), or a cake-stand tier
function sprinkleSurfPaint(q, w, y0, bottom) {
  const y = 0, x0 = 0, x1 = w;
  if (q.kind === 'tier') {
    const cx = w / 2, bt = bottom - y0;
    ctx.fillStyle = 'rgba(120,40,70,0.18)'; ctx.beginPath(); ctx.ellipse(cx + 2, bt, 16, 3.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffd6ea'; ctx.fillRect(cx - 7, y + 10, 14, bt - 10);
    ctx.fillStyle = '#ff8fbf'; for (let yy = y + 16; yy < bt - 3; yy += 14) ctx.fillRect(cx - 7, yy, 14, 5);
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillRect(cx - 6, y + 10, 2.5, bt - 10);
    ctx.fillStyle = 'rgba(150,40,90,0.22)'; ctx.fillRect(cx + 3, y + 10, 4, bt - 10);
    ctx.strokeStyle = '#d96aa3'; ctx.lineWidth = 1.2; ctx.strokeRect(cx - 7, y + 10, 14, bt - 10);
    ctx.fillStyle = '#e88cbc'; rr(cx - 11, bt - 6, 22, 6, 3); ctx.fill();
    // the plate: a china rim with a gold band, a frosting ring of beads
    ctx.fillStyle = 'rgba(120,40,70,0.18)'; rr(x0 - 2, y + 9, w + 6, 6, 3); ctx.fill();
    ctx.fillStyle = '#ffffff'; rr(x0 - 4, y, w + 8, 10, 5); ctx.fill();
    ctx.fillStyle = '#ffb3d4'; rr(x0 - 4, y + 6, w + 8, 6, 3); ctx.fill();
    ctx.fillStyle = '#ffd23f'; ctx.fillRect(x0, y + 8, w, 1.4);
    ctx.strokeStyle = '#d96aa3'; ctx.lineWidth = 1.2; rr(x0 - 4, y, w + 8, 12, 5); ctx.stroke();
    for (let x = x0 + 6; x < x1; x += 16) { ctx.fillStyle = 'rgba(230,170,200,0.7)'; circle(x + 0.8, y + 1.8, 5); ctx.fill(); ctx.fillStyle = '#ffffff'; circle(x, y + 1, 5); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,1)'; circle(x - 1.5, y - 1, 1.6); ctx.fill(); }
    if (q.tier === 2) {
      ctx.fillStyle = '#ff3b5c'; circle(cx, y - 7, 6); ctx.fill(); ctx.strokeStyle = '#b01e3a'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; circle(cx - 2, y - 9, 1.6); ctx.fill();
      ctx.strokeStyle = '#3f8f5c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, y - 12); ctx.quadraticCurveTo(cx + 4, y - 19, cx + 8, y - 19); ctx.stroke();
    }
    return;
  }
  // the wafer
  ctx.fillStyle = 'rgba(120,40,70,0.16)'; rr(x0 + 3, y + 7, w, 15, 4); ctx.fill();
  ctx.fillStyle = '#d99a52'; rr(x0, y + 3, w, 15, 4); ctx.fill();
  for (let x = x0 + 3; x < x1 - 4; x += 8) for (const yy of [y + 6, y + 12]) {
    ctx.fillStyle = '#c4843f'; ctx.fillRect(x, yy, 6, 4);
    ctx.fillStyle = 'rgba(110,60,20,0.35)'; ctx.fillRect(x, yy, 6, 0.9);
    ctx.fillStyle = 'rgba(255,230,190,0.5)'; ctx.fillRect(x, yy + 3.3, 6, 0.7);
  }
  ctx.fillStyle = 'rgba(110,60,20,0.3)'; ctx.fillRect(x0 + 2, y + 16, w - 4, 2);
  ctx.strokeStyle = '#a8692c'; ctx.lineWidth = 1.3; rr(x0, y + 3, w, 15, 4); ctx.stroke();
  // the frosting with its drips, a lit top and a darker underside
  const shelf = q.kind === 'shelf', fc = shelf ? '#bfe9ff' : '#ff9ccf';
  const top = () => { ctx.beginPath(); ctx.moveTo(x0 - 2, y + 5); ctx.lineTo(x0 - 2, y); ctx.lineTo(x1 + 2, y); ctx.lineTo(x1 + 2, y + 5);
    for (let x = x1; x > x0 + 9; x -= 18) ctx.quadraticCurveTo(x - 4, y + 12 + ((x / 18 | 0) % 2) * 4, x - 9, y + 5);
    ctx.lineTo(x0 - 2, y + 5); ctx.closePath(); };
  ctx.fillStyle = shade(fc, 0.18); ctx.save(); ctx.translate(0.8, 1.2); top(); ctx.fill(); ctx.restore();
  ctx.fillStyle = fc; top(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillRect(x0 + 4, y + 1, w - 8, 2);
  ctx.fillStyle = 'rgba(255,255,255,0.45)'; for (let x = x1; x > x0 + 9; x -= 18) { ctx.beginPath(); ctx.ellipse(x - 6, y + 7 + ((x / 18 | 0) % 2) * 2, 1, 2, 0, 0, Math.PI * 2); ctx.fill(); }
  if (shelf) { for (let x = x0 + 5; x < x1 - 3; x += 11) { ctx.fillStyle = '#ffffff'; circle(x, y + 2.5, 1.6); ctx.fill(); } }
  else for (let i = 0; i < Math.floor(w / 14); i++) { ctx.save(); ctx.translate(x0 + 5 + CK.r(i, w) * (w - 10), y + 2 + CK.r(w, i) * 2); ctx.rotate(i * 1.7); ctx.fillStyle = SPRINKLE_SPR[i % 7]; ctx.fillRect(-2.5, -0.8, 5, 1.6); ctx.restore(); }
}
function sprinkleDrawShaker(st) {
  const sh = st.shaker, x = sh.x, P = SPRINKLE;
  const shaking = sh.state === 'shake' && G.match && G.match.phase === 'live';
  const rot = shaking ? Math.sin(sh.wob * 46) * 0.2 : Math.sin(sh.wob * 2) * 0.03;
  // trolley on the rail
  ctx.fillStyle = '#5a2a44'; rr(x - 16, 90, 32, 11, 4); ctx.fill();
  ctx.fillStyle = '#ffd6ea'; circle(x - 9, 95, 4); ctx.fill(); circle(x + 9, 95, 4); ctx.fill();
  ctx.save(); ctx.translate(x, 99); ctx.rotate(rot);
  // the jar (upside down): a glass body full of sprinkles, the holey cap at the bottom
  ctx.fillStyle = 'rgba(255,240,248,0.92)'; rr(-19, 2, 38, 30, 9); ctx.fill();
  ctx.save(); ctx.beginPath(); rr(-17, 4, 34, 26, 8); ctx.clip();
  for (let i = 0; i < 26; i++) { ctx.fillStyle = SPRINKLE_SPR[i % 7]; ctx.save(); ctx.translate(-14 + (i * 7) % 28, 8 + (i * 5) % 22); ctx.rotate(i * 2.3); ctx.fillRect(-3, -1, 6, 2.2); ctx.restore(); }
  ctx.restore();
  ctx.strokeStyle = 'rgba(160,80,120,0.6)'; ctx.lineWidth = 2; rr(-19, 2, 38, 30, 9); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.55)'; rr(-15, 6, 6, 20, 3); ctx.fill();
  ctx.fillStyle = st.sd ? C.gold : '#ff6fa8'; rr(-21, 30, 42, 12, 5); ctx.fill();
  ctx.fillStyle = '#7a2a52'; for (let i = -2; i <= 2; i++) { circle(i * 7, 38, 1.8); ctx.fill(); }
  // a happy face on the jar
  ctx.fillStyle = 'rgba(255,255,255,0.8)'; circle(0, 17, 10); ctx.fill();
  ctx.fillStyle = C.ink; circle(-4, 15, 1.8); ctx.fill(); circle(4, 15, 1.8); ctx.fill();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 18, 3.6, 0.2, Math.PI - 0.2); ctx.stroke();
  ctx.restore();
  // the next candy peeks out of the spout while shaking
  if (shaking && sh.next) {
    const k = sh.next === 'storm' ? 'sprinkle' : sh.next;
    ctx.globalAlpha = 0.85; sprinkleDrawCandy({ kind: k, r: SPRINKLE_KINDS[k].r, rot: 0, col: 2, t: G.clock }, x, P.spawnY - 2, 0.8); ctx.globalAlpha = 1;
  }
}
function sprinkleDrawCloud() {
  // Gumdrop Rain: a long smiling cotton-candy cloud instead of the shaker
  const y = 108, wob = Math.sin(G.clock * 1.5) * 3;
  ctx.fillStyle = '#ffe3f1';
  for (let x = 30, i = 0; x < W - 20; x += 46, i++) { circle(x, y + wob * (i % 2 ? 1 : -1), 26 + (i % 3) * 3); ctx.fill(); }
  ctx.fillRect(30, y, W - 60, 24);
  ctx.fillStyle = '#ffffff'; for (let x = 50; x < W - 40; x += 92) { circle(x, y - 10, 14); ctx.fill(); }
  ctx.fillStyle = C.ink; circle(470, y + 6, 3); ctx.fill(); circle(490, y + 6, 3); ctx.fill();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(480, y + 10, 7, 0.2, Math.PI - 0.2); ctx.stroke();
  ctx.fillStyle = 'rgba(255,120,160,0.45)'; circle(458, y + 14, 4); ctx.fill(); circle(502, y + 14, 4); ctx.fill();
}
// one candy at (x, y), scale s
function sprinkleDrawCandy(c, x, y, s = 1) {
  const r = c.r * s;
  ctx.save(); ctx.translate(x, y);
  switch (c.kind) {
    case 'sprinkle':
      ctx.rotate(c.rot); ctx.fillStyle = SPRINKLE_SPR[c.col % 7]; rr(-r * 1.3, -r * 0.55, r * 2.6, r * 1.1, r * 0.55); ctx.fill();
      ctx.strokeStyle = 'rgba(90,30,70,0.35)'; ctx.lineWidth = 1; rr(-r * 1.3, -r * 0.55, r * 2.6, r * 1.1, r * 0.55); ctx.stroke();
      break;
    case 'gumdrop': {
      ctx.fillStyle = SPRINKLE_GUM[c.col % 6]; ctx.beginPath(); ctx.moveTo(-r, r * 0.7); ctx.quadraticCurveTo(-r, -r * 1.05, 0, -r); ctx.quadraticCurveTo(r, -r * 1.05, r, r * 0.7); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(-r, r * 0.45, r * 2, r * 0.25);
      ctx.fillStyle = 'rgba(255,255,255,0.75)'; for (const [a, b] of [[-0.4, -0.2], [0.3, -0.5], [0.1, 0.25], [-0.55, 0.35], [0.55, 0.2]]) { circle(a * r, b * r, Math.max(0.8, r * 0.1)); ctx.fill(); }
      ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.ellipse(-r * 0.4, -r * 0.45, r * 0.18, r * 0.32, -0.5, 0, SPRINKLE_TAU); ctx.fill();
      break;
    }
    case 'mint':
      ctx.rotate(c.rot);
      if (s > 0.6) { ctx.fillStyle = '#ffe6ea'; ctx.beginPath(); ctx.moveTo(-r * 0.8, 0); ctx.lineTo(-r - 6 * s, -5 * s); ctx.lineTo(-r - 6 * s, 5 * s); ctx.fill(); ctx.beginPath(); ctx.moveTo(r * 0.8, 0); ctx.lineTo(r + 6 * s, -5 * s); ctx.lineTo(r + 6 * s, 5 * s); ctx.fill(); }
      ctx.fillStyle = '#ffffff'; circle(0, 0, r); ctx.fill();
      ctx.fillStyle = '#ff4d63';
      for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r * 0.92, i * SPRINKLE_TAU / 6, i * SPRINKLE_TAU / 6 + 0.5); ctx.closePath(); ctx.fill(); }
      ctx.strokeStyle = 'rgba(200,60,80,0.6)'; ctx.lineWidth = Math.max(1, 1.5 * s); circle(0, 0, r); ctx.stroke();
      break;
    case 'cupcake':
      ctx.fillStyle = '#7fd3ff'; ctx.beginPath(); ctx.moveTo(-r * 0.8, 0); ctx.lineTo(r * 0.8, 0); ctx.lineTo(r * 0.6, r); ctx.lineTo(-r * 0.6, r); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = Math.max(1, 1.2 * s); ctx.beginPath(); for (let i = -2; i <= 2; i++) { ctx.moveTo(i * r * 0.3, 1); ctx.lineTo(i * r * 0.23, r - 1); } ctx.stroke();
      ctx.fillStyle = '#ffb3d6'; ctx.beginPath(); ctx.ellipse(0, -r * 0.05, r * 0.95, r * 0.45, 0, 0, SPRINKLE_TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(0, -r * 0.42, r * 0.65, r * 0.38, 0, 0, SPRINKLE_TAU); ctx.fill();
      ctx.fillStyle = '#ff3b5c'; circle(0, -r * 0.85, r * 0.25); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.6)'; circle(-r * 0.35, -r * 0.3, r * 0.12); ctx.fill();
      break;
    case 'gold': {
      const glow = 0.5 + 0.5 * Math.sin((c.t || 0) * 8);
      ctx.fillStyle = 'rgba(255,214,90,' + (0.18 + 0.15 * glow) + ')'; circle(0, 0, r * 2); ctx.fill();
      ctx.fillStyle = '#ffcf3d'; ctx.beginPath(); ctx.moveTo(-r * 0.7, 0); ctx.lineTo(-r * 1.6, -r * 0.7); ctx.lineTo(-r * 1.6, r * 0.7); ctx.fill();
      ctx.beginPath(); ctx.moveTo(r * 0.7, 0); ctx.lineTo(r * 1.6, -r * 0.7); ctx.lineTo(r * 1.6, r * 0.7); ctx.fill();
      ctx.fillStyle = '#ffd84a'; ctx.beginPath(); ctx.ellipse(0, 0, r * 0.95, r * 0.8, 0, 0, SPRINKLE_TAU); ctx.fill();
      ctx.strokeStyle = '#c08a10'; ctx.lineWidth = Math.max(1, 1.5 * s); ctx.beginPath(); ctx.ellipse(0, 0, r * 0.95, r * 0.8, 0, 0, SPRINKLE_TAU); ctx.stroke();
      sprinkleStar(0, 0, r * 0.5, '#fff7d0', (c.t || 0) * 1.5);
      if (s > 0.6) sprinkleStar(r * 1.1, -r * 1.1, r * 0.35 * (0.6 + glow * 0.6), '#ffffff', 0);
      break;
    }
  }
  ctx.restore();
}
// a gobstopper: rings of colour, a shine, a sleepy happy face
function sprinkleDrawGob(g) {
  const pop = g.popT >= 0 ? g.popT / 0.35 : 0, sq = g.squash * 0.18, r = g.r * (1 + pop * 0.4);
  const sets = [['#ff5f9e', '#ffd84a', '#5fc8ff', '#ffffff'], ['#a98bff', '#7fdc7a', '#ff9a4a', '#ffffff'], ['#5fc8ff', '#ff6fa8', '#ffe066', '#ffffff']];
  const cols = sets[g.col % 3];
  ctx.save(); ctx.translate(g.x, g.y + r * sq * 0.5); ctx.scale(1 + sq, 1 - sq);
  ctx.globalAlpha = 1 - pop;
  ctx.save(); ctx.rotate(g.rot);
  for (let i = 0; i < 4; i++) { ctx.fillStyle = cols[i]; circle(i * r * 0.08, 0, r * (1 - i * 0.22)); ctx.fill(); }
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = r * 0.08; ctx.beginPath(); ctx.arc(0, 0, r * 0.88, 0.3, 1.6); ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = 'rgba(90,40,80,0.45)'; ctx.lineWidth = 2; circle(0, 0, r); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.ellipse(-r * 0.4, -r * 0.5, r * 0.22, r * 0.12, -0.6, 0, SPRINKLE_TAU); ctx.fill();
  // a happy face (always upright), on a pale patch so it reads on every ring colour
  const f = r / 22;
  ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.ellipse(0, 4 * f, 12 * f, 8.5 * f, 0, 0, SPRINKLE_TAU); ctx.fill();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 2 * f; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(-5 * f, 3 * f, 2.6 * f, Math.PI + 0.3, -0.3); ctx.stroke();
  ctx.beginPath(); ctx.arc(5 * f, 3 * f, 2.6 * f, Math.PI + 0.3, -0.3); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 5.5 * f, 3.5 * f, 0.2, Math.PI - 0.2); ctx.stroke();
  ctx.fillStyle = 'rgba(255,110,150,0.55)'; circle(-9 * f, 7 * f, 2.4 * f); ctx.fill(); circle(9 * f, 7 * f, 2.4 * f); ctx.fill();
  ctx.restore();
}
// a soft shadow on the surface right below something falling (so you can see where it lands)
function sprinkleShadow(st, x, y, r, a) {
  const i = sprinkleSurfBelow(st, x, y + r);
  if (i < 0) return;
  const q = st.surf[i], d = q.y - y, k = clamp(1 - d / 360, 0.25, 1);
  ctx.fillStyle = 'rgba(90,30,70,' + (a * k) + ')'; ctx.beginPath(); ctx.ellipse(x, q.y + 1, r * (0.5 + 0.6 * k), 3 + 2 * k, 0, 0, SPRINKLE_TAU); ctx.fill();
}
function sprinkleDrawWorld() {
  const st = G.mst; if (!st.surf || !st.shaker) return;
  const P = SPRINKLE;
  sprinkleDrawSky();
  sprinkleDrawFloor(st);
  // falling candy drops past the wafers (drawn behind them), and behind the players into their baskets
  for (const c of st.candy) if (!c.rest) sprinkleDrawCandy(c, c.x, c.y, 1);
  for (const q of st.surf) sprinkleDrawSurf(q);
  // the licorice rail and the candy-cane posts
  if (st.twist !== 'gumdrop') {
    ctx.strokeStyle = '#7a1f3d'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(12, 96); ctx.lineTo(948, 96); ctx.stroke();
    ctx.strokeStyle = '#b8325e'; ctx.lineWidth = 2; ctx.setLineDash([6, 8]); ctx.beginPath(); ctx.moveTo(12, 95); ctx.lineTo(948, 95); ctx.stroke(); ctx.setLineDash([]);
  }
  sprinkleCane(0, 84, P.floorY, P.wallL); sprinkleCane(P.wallR, 84, P.floorY, W - P.wallR);
  ctx.fillStyle = '#ff5f7e'; circle(6, 84, 7); ctx.fill(); circle(W - 6, 84, 7); ctx.fill();
  // shadows of falling candy and gobstoppers
  for (const c of st.candy) if (!c.rest && c.vy > -100) sprinkleShadow(st, c.x, c.y, c.r, c.kind === 'gold' ? 0.4 : 0.22);
  for (const g of st.gobs) if (g.popT < 0) sprinkleShadow(st, g.x, g.y, g.r, 0.3);
  // spilled candy resting on the floor and wafers (blinks before it melts away)
  for (const c of st.candy) {
    if (!c.rest) continue;
    if (c.life < 1.5 && Math.floor(c.life * 8) % 2 === 0) continue;
    ctx.fillStyle = 'rgba(255,255,255,0.4)'; circle(c.x, c.y, c.r + 4); ctx.fill();
    sprinkleDrawCandy(c, c.x, c.y + Math.sin(G.clock * 4 + c.id) * 1.2, 1);
  }
  // gobstopper warnings: a pulsing "!" and a dotted line where it will drop
  for (const w of st.warn) {
    const k = 1 - w.t / P.gobWarn, pulse = 1 + 0.15 * Math.sin(G.clock * 18);
    ctx.strokeStyle = 'rgba(122,31,61,' + (0.25 + 0.35 * k) + ')'; ctx.lineWidth = 3; ctx.setLineDash([6, 8]);
    const i = sprinkleSurfBelow(st, w.x, P.ceilY + 20), y1 = i >= 0 ? st.surf[i].y : P.floorY;
    ctx.beginPath(); ctx.moveTo(w.x, P.ceilY + 8); ctx.lineTo(w.x, y1); ctx.stroke(); ctx.setLineDash([]);
    const rr0 = (w.mega ? 22 : 16) * pulse;
    ctx.fillStyle = '#ffffff'; circle(w.x, P.ceilY + 6, rr0 + 3); ctx.fill();
    ctx.fillStyle = '#ff5f7e'; circle(w.x, P.ceilY + 6, rr0); ctx.fill();
    bigText('!', w.x, P.ceilY + 7, w.mega ? 30 : 22, '#ffffff');
  }
  if (st.twist === 'gumdrop') sprinkleDrawCloud(); else sprinkleDrawShaker(st);
}
function sprinkleDrawBasket(st, k) {
  const p = G.players[k], s = st.pl[k];
  if (!p.alive) return;
  const top = p.y + p.h - p.h * p.sy, cx = p.x + p.w / 2, w = s.bw * (0.9 + 0.1 * p.sx), gold = s.gold > 0;
  ctx.save(); ctx.translate(cx, top + 2); ctx.rotate(s.tilt + (p.stun > 0 ? Math.sin(G.clock * 20) * 0.15 : 0));
  // the candy pile peeking over the rim (the last few caught)
  const n = s.basket.length, show = Math.min(n, 7), pile = Math.min(10, n * 0.8);
  for (let i = 0; i < show; i++) {
    const kind = s.basket[n - show + i], K = SPRINKLE_KINDS[kind];
    const px = (((i * 37) % 5) - 2) * w * 0.16, py = -14 - pile * (i / Math.max(1, show)) - 2;
    sprinkleDrawCandy({ kind, r: K.r, rot: i * 1.7, col: i + k, t: G.clock }, px, py, kind === 'sprinkle' ? 0.9 : 0.62);
  }
  // the basket: woven, a rim
  ctx.fillStyle = gold ? '#ffcf3d' : '#d9a05b';
  ctx.beginPath(); ctx.moveTo(-w / 2 - 2, -14); ctx.lineTo(w / 2 + 2, -14); ctx.lineTo(w / 2 - 5, 0); ctx.lineTo(-w / 2 + 5, 0); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = gold ? 'rgba(160,110,10,0.6)' : 'rgba(120,70,30,0.6)'; ctx.lineWidth = 1.3; ctx.beginPath();
  for (let x = -w / 2 + 3; x < w / 2; x += 6) { ctx.moveTo(x, -13); ctx.lineTo(x + (x < 0 ? 2 : -2), -1); }
  ctx.moveTo(-w / 2 + 1, -7); ctx.lineTo(w / 2 - 1, -7); ctx.stroke();
  ctx.fillStyle = gold ? '#fff0a8' : '#f2c88a'; rr(-w / 2 - 4, -17, w + 8, 5, 2.5); ctx.fill();
  ctx.strokeStyle = gold ? '#b9850f' : '#8a5833'; ctx.lineWidth = 1.5; rr(-w / 2 - 4, -17, w + 8, 5, 2.5); ctx.stroke();
  if (gold) { sprinkleStar(-w / 2 + 2, -18, 4 + Math.sin(G.clock * 6) * 1.2, '#ffffff', G.clock); sprinkleStar(w / 2 - 1, -9, 3, '#fff7d0', -G.clock); }
  if (s.magnet) { ctx.strokeStyle = 'rgba(255,214,90,' + (0.35 + 0.25 * Math.sin(G.clock * 6)) + ')'; ctx.lineWidth = 2; ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.arc(0, -16, SPRINKLE.magnetX * 0.6, Math.PI + 0.2, -0.2); ctx.stroke(); ctx.setLineDash([]); }
  ctx.restore();
}
function sprinkleDrawTop() {
  const st = G.mst, m = G.match; if (!st.surf || !st.pl || !st.vis) return;
  for (const g of st.gobs) sprinkleDrawGob(g);
  for (const k of [0, 1]) sprinkleDrawBasket(st, k);
  for (const q of st.vis.fx) {
    const a = clamp(q.life / q.max, 0, 1); ctx.globalAlpha = a; ctx.fillStyle = q.col;
    if (q.kind === 'spark') sprinkleStar(q.x, q.y, q.size * (0.6 + 0.8 * a), q.col, q.life * 4);
    else if (q.kind === 'smoke') { circle(q.x, q.y, q.size * (1.6 - 0.6 * a)); ctx.fill(); }
    else { circle(q.x, q.y, q.size * (0.5 + 0.5 * a)); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
  const big = sprinkleBig(), box = G.matchHudBox;
  const clearTop = (x, y) => (box && y < box.y1 + 40 && x > box.x0 - 70 && x < box.x1 + 70 ? box.y1 + 40 : Math.max(y, 24));
  for (const w of st.vis.words) { const k = w.t / 0.9; ctx.globalAlpha = 1 - k * k; bigText(w.text, w.x, clearTop(w.x, w.y - 22 * k), big ? 22 : 16, w.col); ctx.globalAlpha = 1; }
  for (const s of st.pl) {
    if (s.popT >= 1.1 || !s.pop) continue;
    const p = G.players[s.k], k = s.popT / 1.1, x = clamp(p.x + p.w / 2, 90, W - 90);
    ctx.globalAlpha = 1 - k * k;
    bigText(s.pop, x, clearTop(x, p.y - 50 - 22 * k), big ? 24 : 18, s.popCol, 1 + 0.3 * Math.max(0, 1 - k * 5));
    ctx.globalAlpha = 1;
  }
  // the winner's basket sparkles during the banner
  if (m && m.phase === 'end' && m.end && m.end.winner >= 0 && sprinkleVR() < 0.3) {
    const p = G.players[m.end.winner];
    sprinkleFx(st, p.x + p.w / 2 + (sprinkleVR() - 0.5) * 40, p.y - 20, (sprinkleVR() - 0.5) * 60, -60 - sprinkleVR() * 60, 0.7, [C.gold, PCOL[m.end.winner], '#ffffff'][Math.floor(sprinkleVR() * 3)], 3.5, 60, 'spark');
  }
}

/* ---------- HUD ---------- */
// each player's own keys (none for the computer)
function sprinkleKeys(id) {
  let k = 'kb'; try { k = actKey(id); } catch (e) { k = 'kb'; }
  if (k === 'pad') return { run: 'stick', jump: glyph('a'), drop: 'stick ▼', bump: glyph('act'), bumpIs: glyph('act') + ' bump' };
  if (k === 'touch') return { run: '◀ ▶', jump: '▲', drop: '▼', bump: 'the bump button', bumpIs: 'bump button' };
  return id === 0 ? { run: 'A D', jump: 'W', drop: 'S', bump: 'F', bumpIs: 'F bump' } : { run: '← →', jump: '↑', drop: '↓', bump: '/', bumpIs: '/ bump' };
}
function sprinkleChip(label, x, y, big, col, gold) {
  const fs = big ? 18 : 13, h = big ? 30 : 22;
  ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
  const w = Math.min(W - 12, ctx.measureText(label).width + (big ? 26 : 20)), cx = clamp(x, w / 2 + 6, W - w / 2 - 6), cy = clamp(y, h / 2 + 4, H - h / 2 - 4);
  ctx.fillStyle = 'rgba(28,26,54,0.88)'; rr(cx - w / 2, cy - h / 2, w, h, h / 2); ctx.fill();
  ctx.strokeStyle = col; ctx.lineWidth = 2; rr(cx - w / 2, cy - h / 2, w, h, h / 2); ctx.stroke();
  text(label, cx, cy + 0.5, fs, gold ? C.gold : C.paper, 'center', 'body');
}
// a little basket icon for the score panels
function sprinkleBasketIcon(x, y, s, gold) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = '#ff6fa8'; circle(-5, -9, 5); ctx.fill(); ctx.fillStyle = '#7fdc7a'; circle(4, -10, 5); ctx.fill(); ctx.fillStyle = '#ffd84a'; circle(0, -13, 4.5); ctx.fill();
  ctx.fillStyle = gold ? '#ffcf3d' : '#d9a05b'; ctx.beginPath(); ctx.moveTo(-12, -6); ctx.lineTo(12, -6); ctx.lineTo(8, 8); ctx.lineTo(-8, 8); ctx.closePath(); ctx.fill();
  ctx.fillStyle = gold ? '#fff0a8' : '#f2c88a'; rr(-14, -8, 28, 5, 2.5); ctx.fill();
  ctx.strokeStyle = 'rgba(120,70,30,0.6)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-9, 1); ctx.lineTo(9, 1); ctx.stroke();
  ctx.restore();
}
function sprinkleHud() {
  const st = G.mst, m = G.match; if (!st.pl || !st.surf || !m) return;
  const big = sprinkleBig(), tw = SPRINKLE_TWISTS[st.twist], box = G.matchHudBox;
  const fsB = big ? 20 : 13, hB = big ? 36 : 26;
  // bottom corners: each basket's candy (gold edge with a gold basket)
  for (const s of st.pl) {
    const left = s.k === 0, sz = big ? 1.4 : 1, pw = 138 * sz, ph = 40 * sz, y = H - 6 - ph, x = left ? 14 : W - 14 - pw;
    ctx.fillStyle = 'rgba(28,26,54,0.84)'; rr(x, y, pw, ph, ph / 2); ctx.fill();
    ctx.strokeStyle = s.gold ? C.gold : PCOL[s.k]; ctx.lineWidth = s.gold ? 2.5 : 2; rr(x, y, pw, ph, ph / 2); ctx.stroke();
    text(NAMES[s.k], left ? x + 14 * sz : x + pw - 14 * sz, y + ph / 2 + 0.5, 18 * sz, PCOL[s.k], left ? 'left' : 'right');
    sprinkleBasketIcon(left ? x + 70 * sz : x + pw - 70 * sz, y + ph / 2 + 3 * sz, 0.85 * sz, s.gold > 0);
    const lead = s.score > st.pl[1 - s.k].score;
    text(String(s.score), left ? x + pw - 14 * sz : x + 14 * sz, y + ph / 2 + 1, (lead ? 26 : 23) * sz, lead ? C.gold : C.paper, left ? 'right' : 'left');
  }
  // the round clock, under the match score
  {
    const cy = box ? box.y1 + 4 : 48, ch = big ? 34 : 26, sec = Math.ceil(st.left), live = m.phase === 'live' && !st.over;
    const warn = live && sec <= 5, lab = Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
    const cw = big ? 96 : 72;
    ctx.fillStyle = warn ? 'rgba(122,31,61,0.92)' : 'rgba(28,26,54,0.82)'; rr(W / 2 - cw / 2, cy, cw, ch, ch / 2); ctx.fill();
    if (warn) { ctx.strokeStyle = C.gold; ctx.lineWidth = 2; rr(W / 2 - cw / 2, cy, cw, ch, ch / 2); ctx.stroke(); }
    // a ring that empties over the round
    const f = clamp(st.left / (st.sd ? SPRINKLE.sdCap : SPRINKLE.roundT), 0, 1), rx = W / 2 - cw / 2 + ch / 2, ry = cy + ch / 2, rad = ch / 2 - 5;
    ctx.strokeStyle = 'rgba(246,239,223,0.25)'; ctx.lineWidth = 3; circle(rx, ry, rad); ctx.stroke();
    ctx.strokeStyle = warn ? C.gold : '#ff9ccf'; ctx.beginPath(); ctx.arc(rx, ry, rad, -Math.PI / 2, -Math.PI / 2 + SPRINKLE_TAU * f); ctx.stroke();
    text(lab, W / 2 + ch / 4, cy + ch / 2 + 0.5, warn ? (big ? 24 : 18) : (big ? 22 : 16), warn ? C.gold : C.paper, 'center');
    // the last five seconds, big and see-through in the middle
    if (warn && sec > 0) {
      const k = sec - st.left;
      ctx.globalAlpha = 0.5 * (1 - k * 0.6);
      bigText(String(sec), W / 2, 220, 90, C.gold, 1 + 0.35 * Math.pow(1 - Math.min(1, k * 3), 2));
      ctx.globalAlpha = 1;
    }
    if (st.tenSay != null && live) {
      const k = st.tenSay / 2;
      ctx.globalAlpha = clamp(Math.min(st.tenSay / 0.15, (2 - st.tenSay) / 0.4), 0, 1);
      bigText('10 seconds left!', W / 2, 200 - 10 * k, big ? 34 : 28, '#ffffff', 1 + 0.2 * Math.max(0, 1 - k * 6));
      ctx.globalAlpha = 1;
    }
  }
  // the twist's name, top left under the level pill (not in the plain round)
  if (st.twist !== 'plain') {
    ctx.font = '700 ' + fsB + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w = ctx.measureText(tw.name).width + (big ? 36 : 28), y0 = 46;
    pill(14, y0, w, hB); text(tw.name, 14 + (big ? 18 : 14), y0 + hB / 2 + 0.5, fsB, C.gold, 'left', 'body');
  }
  if (m.phase === 'live' || m.phase === 'end') {
    // top right: the catch-up golden candy, announced
    if (st.cuSay) {
      const lab = 'Golden candy for ' + NAMES[st.cuSay.k] + '!';
      ctx.font = '700 ' + fsB + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
      const w = ctx.measureText(lab).width + (big ? 36 : 28), x1 = W - 14, yy = box && x1 - w < box.x1 + 8 ? box.y1 + (big ? 44 : 36) : 12;
      ctx.globalAlpha = clamp((3.5 - st.cuSay.t) / 0.4, 0, 1);
      pill(x1 - w, yy, w, hB); ctx.strokeStyle = C.gold; ctx.lineWidth = 2; rr(x1 - w, yy, w, hB, hB / 2); ctx.stroke();
      text(lab, x1 - (big ? 18 : 14), yy + hB / 2 + 0.5, fsB, C.gold, 'right', 'body');
      ctx.globalAlpha = 1;
    }
    // tips for people, in their own keys (never for the computer)
    let prevY = null;
    for (const k of [0, 1]) {
      const h = st.hint[k], p = G.players[k]; if (!h || sprinkleCpu(k) || m.phase !== 'live') continue;
      const kk = sprinkleKeys(k);
      const lab = h.n === 'bonk' ? 'Watch the gobstopper’s shadow: run or jump!' : 'Bump ' + NAMES[1 - k] + ' with ' + kk.bump + ': they spill a candy!';
      ctx.globalAlpha = clamp(Math.min(h.t / 0.2, (4.5 - h.t) / 0.4), 0, 1);
      const up = p.y - (big ? 92 : 74);
      let y = box && up < box.y1 + 50 ? p.y + p.h + (big ? 26 : 20) : up;
      // both players' tips at once (2 players): stack them so they never overlap
      const gap = big ? 34 : 26;
      if (prevY != null && Math.abs(y - prevY) < gap) y = prevY - gap < (box ? box.y1 + 24 : 20) ? prevY + gap : prevY - gap;
      prevY = y;
      sprinkleChip(lab, p.x + p.w / 2, y, big, PCOL[k], false);
      ctx.globalAlpha = 1;
    }
  }
  if (m.phase === 'ready' || m.phase === 'count') {
    // the round card: this round's twist, and any gold help announced
    const lines = [];
    for (const s of st.pl) if (s.gold) lines.push(s.gold >= 2 ? 'Gold basket and candy magnet for ' + NAMES[s.k] + '!' : 'Gold basket for ' + NAMES[s.k] + ': half again as wide!');
    const nf = big ? 30 : 26, hf = big ? 19 : 14, lh = big ? 26 : 20, ch = (big ? 78 : 60) + lines.length * lh, cy = H - (big ? 72 : 56) - ch - 6;
    ctx.font = hf + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    let w = Math.max(big ? 380 : 300, ctx.measureText(tw.hint).width + 48);
    ctx.font = '700 ' + hf + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    for (const l of lines) w = Math.max(w, ctx.measureText(l).width + 48);
    w = Math.min(W - 20, w);
    const a = m.phase === 'ready' ? clamp(m.t / 0.25, 0, 1) : 1, cx = W / 2;
    ctx.globalAlpha = a; ctx.fillStyle = 'rgba(28,26,54,0.86)'; rr(cx - w / 2, cy, w, ch, 16); ctx.fill();
    ctx.strokeStyle = lines.length ? C.gold : 'rgba(255,156,207,0.8)'; ctx.lineWidth = 2; rr(cx - w / 2, cy, w, ch, 16); ctx.stroke();
    text(tw.name, cx, cy + (big ? 25 : 21), nf, C.gold, 'center'); text(tw.hint, cx, cy + (big ? 57 : 46), hf, C.paper, 'center', 'body');
    lines.forEach((l, i) => text(l, cx, cy + (big ? 57 : 46) + (i + 1) * lh, hf, C.gold, 'center', 'body'));
    ctx.globalAlpha = 1;
    // key reminders just above that card before rounds 1 and 2 (each player's own device; never the computer's)
    if (m.round <= 2) {
      ctx.globalAlpha = a;
      const who = [0, 1].filter(k => !sprinkleCpu(k)), stp = big ? 36 : 28;
      let yy = cy - 6 - stp / 2 - (who.length - 1) * stp;
      for (const k of who) {
        const kk = sprinkleKeys(k);
        sprinkleChip(NAMES[k] + ': ' + kk.run + ' run · ' + kk.jump + ' jump · ' + kk.drop + ' drop · ' + kk.bumpIs, cx, yy, big, PCOL[k], false);
        yy += stp;
      }
      ctx.globalAlpha = 1;
    }
  }
}

Sfx.extra.sprinkleCatch = function (p) { this.tone(880 * p, 0.06, 'triangle', 0.045, 1320 * p); this.tone(1320 * p, 0.06, 'triangle', 0.03, null, 0.05); };
Sfx.extra.sprinkleGold = function (p) { [1046, 1318, 1568, 2093].forEach((f, i) => this.tone(f * p, 0.09, 'triangle', 0.045, null, i * 0.05)); };
Sfx.extra.sprinkleScoop = function (p) { this.tone(520 * p, 0.07, 'triangle', 0.04, 980 * p); };
Sfx.extra.sprinkleSpill = function (p) { [900, 700, 520].forEach((f, i) => this.tone(f * p, 0.06, 'triangle', 0.035, null, i * 0.05)); };
Sfx.extra.sprinkleJelly = function (p) { this.tone(200 * p, 0.22, 'sine', 0.07, 700 * p); };
Sfx.extra.sprinkleDash = function (p) { this.tone(240 * p, 0.12, 'sawtooth', 0.025, 520 * p); };
Sfx.extra.sprinkleBoing = function (p) { this.tone(160 * p, 0.3, 'sine', 0.09, 620 * p); this.tone(320 * p, 0.18, 'triangle', 0.03, 900 * p, 0.05); };
Sfx.extra.sprinkleShield = function () { this.tone(1200, 0.08, 'sine', 0.035, 1600); };
Sfx.extra.sprinkleBump = function (p) { this.tone(300 * p, 0.08, 'square', 0.04, 180 * p); this.tone(500 * p, 0.12, 'sine', 0.04, 900 * p, 0.04); };
Sfx.extra.sprinkleThud = function () { this.tone(120, 0.08, 'triangle', 0.04, 80); };
Sfx.extra.sprinkleGobBounce = function () { this.tone(140, 0.12, 'sine', 0.05, 260); };
Sfx.extra.sprinklePop = function () { this.tone(600, 0.06, 'square', 0.035, 1200); [1046, 1318, 1568].forEach((f, i) => this.tone(f, 0.07, 'triangle', 0.03, null, 0.05 + i * 0.04)); };
Sfx.extra.sprinkleWhistle = function () { this.tone(1400, 0.5, 'sine', 0.03, 600); };
Sfx.extra.sprinkleGobDrop = function () { this.tone(220, 0.18, 'sine', 0.05, 120); };
Sfx.extra.sprinkleShake = function () { [0, 0.05, 0.1].forEach(d => this.tone(2400, 0.03, 'square', 0.008, 1800, d)); };
Sfx.extra.sprinkleStorm = function () { [0, 0.03, 0.06, 0.09, 0.12].forEach((d, i) => this.tone(1800 + i * 200, 0.03, 'triangle', 0.015, null, d)); };
Sfx.extra.sprinkleTing = function () { this.tone(1568, 0.25, 'sine', 0.04); this.tone(2093, 0.3, 'sine', 0.03, null, 0.08); };
Sfx.extra.sprinkleGumBounce = function () { this.tone(330, 0.08, 'sine', 0.03, 520); };
Sfx.extra.sprinklePlop = function () { this.tone(260, 0.05, 'triangle', 0.02, 140); };
Sfx.extra.sprinkleBeltWarn = function () { [0, 0.18, 0.36].forEach(d => this.tone(660, 0.08, 'square', 0.025, null, d)); };
Sfx.extra.sprinkleBelt = function () { this.tone(180, 0.25, 'sawtooth', 0.025, 320); };
Sfx.extra.sprinkleTen = function () { this.tone(784, 0.1, 'triangle', 0.04); this.tone(988, 0.12, 'triangle', 0.04, null, 0.1); };
Sfx.extra.sprinkleGo = function () { this.tone(523, 0.08, 'triangle', 0.04); this.tone(784, 0.14, 'triangle', 0.04, null, 0.07); };
Sfx.extra.sprinkleGoldHelp = function () { this.tone(784, 0.1, 'triangle', 0.05); this.tone(1046, 0.12, 'triangle', 0.045, null, 0.08); this.tone(1318, 0.16, 'triangle', 0.04, null, 0.16); };
/* ===== end of 16-4 Sprinkle Catch ===== */
