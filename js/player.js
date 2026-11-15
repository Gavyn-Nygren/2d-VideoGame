/* Pip & Bo - Player: Pip and Bo, how they move, collide, jump, stomp, respawn, and the cord between them. */
'use strict';

/* ---------- state ---------- */
function makePlayer(id) {
  return {
    id, x: 0, y: 0, vx: 0, vy: 0, w: PW, h: PH,
    grounded: false, tileGround: false, onPartner: false, onOneWay: false,
    coyote: 0, jumpBuf: 0, jumping: false, pendingJump: false, prevJump: true,
    dropT: 0, face: id === 0 ? 1 : -1, alive: true, respawnT: 0,
    sx: 1, sy: 1, stun: 0, stompSafe: 0, ropeCD: 0, lastVy: 0, blinkT: 2 + id * 1.3, blink: 0,
    carryVx: 0, offT: 0, kickReady: true, kickQueued: false,
    pendingAct: false, prevAct: true, actAge: 0, knockT: 0, // action button (def.act levels) and knock() slides
    input: { left: false, right: false, jump: false, down: false, up: false, act: false },
  };
}
const other = p => G.players[1 - p.id];

function tile(tx, ty) {
  if (tx < 0 || tx >= COLS || ty < 0) return '#';
  if (ty >= ROWS) return '.';
  if (G.activeSet && G.activeSet.has(ty * COLS + tx)) return 'P';
  return G.level.grid[ty][tx];
}
function solidFor(ch, p) {
  if (ch === '#' || ch === 'P') return true;
  if (ch === 'o') return p.id === 0;
  if (ch === 'u') return p.id === 1;
  // a switch tile first: World 1's 'X' bridges use the same letter as the golf bumper
  const s = G.level.sw[ch];
  if (s) return s.type === 'gate' ? !s.on : s.on;
  return ch === 'X';
}
const isVersus = () => G.level && G.level.def.kind === 'versus';
// In rope levels the two of you pass through each other: no stacking, no carrying, no knocking each other off.
const solidPartners = () => !(G.level && G.level.def.tether);

/* ---------- movement ---------- */
function moveX(p, dx, ignorePartner) {
  if (!p.alive || dx === 0) return 0;
  const x0 = p.x;
  p.x += dx;
  const ty1 = Math.floor((p.y + 0.01) / T), ty2 = Math.floor((p.y + p.h - 0.01) / T);
  if (dx > 0) {
    const tx = Math.floor((p.x + p.w - 0.001) / T);
    for (let ty = ty1; ty <= ty2; ty++) if (solidFor(tile(tx, ty), p)) { p.x = tx * T - p.w; p.vx = Math.min(p.vx, 0); break; }
  } else {
    const tx = Math.floor((p.x + 0.001) / T);
    for (let ty = ty1; ty <= ty2; ty++) if (solidFor(tile(tx, ty), p)) { p.x = (tx + 1) * T; p.vx = Math.max(p.vx, 0); break; }
  }
  if (!ignorePartner && solidPartners()) {
    const o = other(p);
    if (o.alive && overlap(p, o)) {
      if (dx > 0) p.x = Math.max(x0, o.x - p.w); else p.x = Math.min(x0, o.x + o.w);
    }
  }
  return p.x - x0;
}

function pushUp(o, amt) {
  const y0 = o.y;
  o.y -= amt;
  const ty = Math.floor((o.y + 0.001) / T);
  const tx1 = Math.floor((o.x + 0.01) / T), tx2 = Math.floor((o.x + o.w - 0.01) / T);
  for (let tx = tx1; tx <= tx2; tx++) if (solidFor(tile(tx, ty), o)) { o.y = Math.min(y0, (ty + 1) * T); break; }
  return y0 - o.y;
}

function moveY(p, dy, ignorePartner) {
  if (!p.alive || dy === 0) return 0;
  const y0 = p.y, prevBottom = p.y + p.h;
  p.y += dy;
  const tx1 = Math.floor((p.x + 0.01) / T), tx2 = Math.floor((p.x + p.w - 0.01) / T);
  if (dy > 0) {
    const ty = Math.floor((p.y + p.h - 0.001) / T), top = ty * T;
    for (let tx = tx1; tx <= tx2; tx++) {
      const ch = tile(tx, ty);
      if (solidFor(ch, p) || (ch === '=' && prevBottom <= top + 0.5 && p.dropT <= 0)) { p.y = top - p.h; p.vy = 0; break; }
    }
    if (!ignorePartner && solidPartners()) {
      const o = other(p);
      if (o.alive && overlap(p, o) && prevBottom <= o.y + 1) {
        p.y = o.y - p.h;
        if (isVersus() && canStomp(p, o)) stomp(p, o);
        else if (isVersus() && G.level.def.stomp !== false && p.vy - o.vy > 150) bonk(p, o);
        else p.vy = o.vy;
      }
    }
  } else {
    const ty = Math.floor((p.y + 0.001) / T);
    for (let tx = tx1; tx <= tx2; tx++) if (solidFor(tile(tx, ty), p)) { if (p.vy < -BUILD.bonkV) towerBonk(p, ty, tx1, tx2); p.y = (ty + 1) * T; p.vy = 0; p.jumping = false; break; }
    if (!ignorePartner && solidPartners()) {
      const o = other(p);
      if (o.alive && overlap(p, o) && o.y < p.y && isVersus() && canStomp(o, p)) {
        // we jumped up into someone who was coming down on us: that is their stomp, not a launch
        o.y = p.y - o.h;
        stomp(o, p);
      } else if (o.alive && overlap(p, o) && o.y < p.y) {
        const need = (o.y + o.h) - p.y;
        const got = pushUp(o, need);
        if (got < need - 0.01) { p.y = o.y + o.h; p.vy = Math.max(p.vy, 0); p.jumping = false; }
        else o.vy = Math.min(o.vy, p.vy);
      }
    }
  }
  return p.y - y0;
}

function probe(p) {
  const r = { tile: false, partner: false, oneway: false };
  const by = p.y + p.h;
  const ty = Math.floor((by + 1) / T), top = ty * T;
  // same column inset as moveY, so anything you can land on also counts as ground
  const tx1 = Math.floor((p.x + 0.01) / T), tx2 = Math.floor((p.x + p.w - 0.01) / T);
  for (let tx = tx1; tx <= tx2; tx++) {
    const ch = tile(tx, ty);
    if (solidFor(ch, p)) r.tile = true;
    // (not while rising: jumping up through a plank is not standing on it, and used to allow a second jump there)
    else if (ch === '=' && p.dropT <= 0 && by <= top + 0.5 && p.vy >= 0) { r.tile = true; r.oneway = true; }
  }
  const o = other(p);
  // (someone coming down hard onto a head isn't standing on it yet: that's a stomp or a landing)
  if (o.alive && solidPartners() && Math.abs(by - o.y) <= 1.5 && p.x < o.x + o.w - 0.001 && p.x + p.w > o.x + 0.001
    && !(p.vy > 150 && p.vy - o.vy > 150)) r.partner = true;
  return r;
}

function separate() {
  const [a, b] = G.players;
  if (!solidPartners() || !a.alive || !b.alive || !overlap(a, b)) return;
  const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  if (oy <= ox) {
    const upper = a.y + a.h / 2 < b.y + b.h / 2 ? a : b, lower = upper === a ? b : a;
    const got = pushUp(upper, oy + 0.01);
    if (got < oy) moveY(lower, oy - got + 0.01, true);
  } else {
    const left = a.x + a.w / 2 <= b.x + b.w / 2 ? a : b, right = left === a ? b : a;
    moveX(left, -(ox / 2 + 0.01), true);
    moveX(right, ox / 2 + 0.01, true);
  }
}

// Move in small pieces so a big correction can't skip through a wall.
function moveBy(p, dx, dy) {
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 8));
  for (let i = 0; i < n; i++) { moveX(p, dx / n, true); moveY(p, dy / n, true); }
}
// A sideways-only pull, in small pieces for the same reason (a 30 px pull in one go could hop a one-tile wall).
function pullX(p, dx) {
  const n = Math.max(1, Math.ceil(Math.abs(dx) / 8));
  for (let i = 0; i < n; i++) moveX(p, dx / n, true);
}
const ropeVec = () => {
  const [a, b] = G.players;
  const dx = (b.x + b.w / 2) - (a.x + a.w / 2), dy = (b.y + b.h / 2) - (a.y + a.h / 2);
  return { dx, dy, d: Math.hypot(dx, dy) };
};
// Is p hanging from the rope below a partner who is standing on something?
function dangling(p) {
  const o = other(p);
  return G.taut && !p.grounded && o.alive && o.grounded && (o.y + o.h / 2) < (p.y + p.h / 2) - 8;
}
// A dangler pressed against a wall whose top is just above their feet steps up onto it.
function mantle(p, toward, reach = 26) {
  const first = toward > p.x + p.w / 2 ? 1 : -1;
  // when the partner is right overhead, the wall could be on either side
  return mantleSide(p, first, reach) || (Math.abs(toward - (p.x + p.w / 2)) < 14 && mantleSide(p, -first, reach));
}
// is at least the middle of p standing on something?
function footed(p) {
  const ch = tile(Math.floor((p.x + p.w / 2) / T), Math.floor((p.y + p.h + 1) / T));
  return solidFor(ch, p) || ch === '=';
}
function mantleSide(p, dir, reach) {
  const tx = Math.floor((dir > 0 ? p.x + p.w + 1 : p.x - 1) / T);
  const feet = p.y + p.h;
  // the wall's top: walk up the column from the feet to the first open tile
  let ty = Math.floor((feet - 1) / T);
  if (!solidFor(tile(tx, ty), p)) return false;
  while (ty > 0 && solidFor(tile(tx, ty - 1), p)) ty--;
  const top = ty * T;
  if (feet - top > reach) return false;
  const newY = top - p.h;
  const r1 = Math.floor((newY + 0.01) / T);
  const c1 = Math.floor((p.x + 0.01) / T), c2 = Math.floor((p.x + p.w - 0.01) / T);
  for (let c = c1; c <= c2; c++) if (solidFor(tile(c, r1), p)) return false;
  p.y = newY; p.vy = 0; p.jumping = false;
  // step well onto the ledge (half the body), not just onto its corner
  moveX(p, dir * (p.w / 2 + 3), true);
  Sfx.play('land');
  return true;
}
/* ---------- cords: rope, chain, bungee ---------- */
const cordType = () => (G.level && G.level.def.cord) || 'rope';
function tether(dt) {
  const c = cordType();
  if (c === 'chain') chainStep(dt);
  else if (c === 'bungee') bungeeStep(dt);
  else ropeStep(dt);
}
function ropeStep(dt) {
  const [a, b] = G.players;
  const max = G.level.def.tether;
  if (!a.alive || !b.alive) { G.taut = false; G.ropeLen = max; return; }
  // Holding jump while dangling climbs: the rope gets shorter. Let go and it slowly pays back out.
  const climber = [a, b].find(p => p.input.jump && dangling(p));
  G.climbing = !!climber;
  // a short let-go (or mashing jump) doesn't throw away the progress
  G.climbHold = climber ? 0.4 : Math.max(0, (G.climbHold || 0) - dt);
  if (climber) G.ropeLen = Math.max(36, G.ropeLen - 150 * dt);
  else if (G.climbHold <= 0) G.ropeLen = Math.min(max, G.ropeLen + 120 * dt);
  const Lr = G.ropeLen;
  let { dx, dy, d } = ropeVec();
  G.taut = d >= Lr - 2;
  // anyone hanging below a standing partner and holding jump steps up onto a ledge they reach
  for (const p of [a, b]) {
    const o = other(p);
    if (!p.grounded && p.input.jump && o.grounded && o.y + o.h / 2 < p.y + p.h / 2 - 8) mantle(p, o.x + o.w / 2, 40);
  }
  limitLength(Lr, true);
}
// Keep the two of you within Lr of each other. Someone standing is an anchor; the one in the air
// gets moved. With lip=true a dangler at a ledge lip steps up onto it.
function limitLength(Lr, lip) {
  const [a, b] = G.players;
  let { dx, dy, d } = ropeVec();
  if (d <= Lr || d === 0) return;
  let nx = dx / d, ny = dy / d;
  const ex = d - Lr;
  let wa = 0.5, wb = 0.5;
  if (a.grounded && !b.grounded) { wa = 0; wb = 1; }
  else if (b.grounded && !a.grounded) { wa = 1; wb = 0; }
  if (a.grounded && b.grounded) {
    // both standing: pull each other in sideways only, and never off what you're standing on
    for (const [p, sgn] of [[a, 1], [b, -1]]) {
      const x0 = p.x;
      pullX(p, sgn * nx * ex * 0.5);
      if (!footed(p)) p.x = x0;
    }
  } else {
    if (wa) moveBy(a, nx * ex * wa, ny * ex * wa);
    if (wb) moveBy(b, -nx * ex * wb, -ny * ex * wb);
  }
  // Whatever the airborne player couldn't move (blocked by a wall) holds back the one on the
  // ground, sideways only, and never off the edge of what they're standing on.
  ({ dx, dy, d } = ropeVec());
  if (d > Lr + 0.5 && (wa === 0 || wb === 0)) {
    const g = wa === 0 ? a : b, s = wa === 0 ? 1 : -1;
    const x0 = g.x;
    pullX(g, s * (dx / d) * (d - Lr));
    // ...and never so far that less than half of them is still on the ground
    if (g.x !== x0 && !footed(g)) g.x = x0;
  }
  // a dangler at a ledge lip gets onto it
  if (lip) { if (wa === 0) mantle(b, a.x + a.w / 2); else if (wb === 0) mantle(a, b.x + b.w / 2); }
  ({ dx, dy, d } = ropeVec());
  if (d > 0) {
    nx = dx / d; ny = dy / d;
    const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
    if (rv > 0) {
      a.vx += nx * rv * wa; a.vy += ny * rv * wa;
      b.vx -= nx * rv * wb; b.vy -= ny * rv * wb;
    }
  }
}

// CHAIN: stiff. When one of you stands and the other is off the ground at full length, the chain
// holds them out like a crane arm. It sags slowly; the hanging player pushes jump / down / left /
// right to swing around the one holding them (all the way over their head if they like). The swing
// eases in and out (it keeps a little of its speed), and a fall that the chain catches keeps swinging.
// Pushing toward the one holding you climbs the chain hand over hand (hanging below them, jump climbs
// too), and at a ledge you climb out onto it. A holder who walks away from the edge hauls you up.
const CHAIN = { spin: 2.7, droop: 0.9, ease: 7, climb: 140, minLen: 30, maxW: 5 };
// How hard the hanger's input pushes them toward the holder: > 0 climbs the chain, < 0 lets it out.
function chainClimbPush(hanger, holder, inp) {
  const ix = (inp.right ? 1 : 0) - (inp.left ? 1 : 0), iy = (inp.down ? 1 : 0) - (inp.jump || inp.up ? 1 : 0);
  if (!ix && !iy) return 0;
  const dx = holder.x + holder.w / 2 - (hanger.x + hanger.w / 2), dy = holder.y + holder.h / 2 - (hanger.y + hanger.h / 2);
  const d = Math.hypot(dx, dy) || 1, n = Math.hypot(ix, iy);
  // hanging below the holder: up climbs (unless also pushing away to swing), so does a push toward their side
  if (-dy / d > 0.45) {
    const away = ix && Math.sign(ix) === -Math.sign(dx) && Math.abs(dx) > 6;
    if (iy < 0 && !away) return 1;
    if (iy > 0 && !ix) return -1;
    if (!iy && ix && !away && Math.abs(dx) > 6) return 0.8;
    return 0;
  }
  const r = (ix * dx + iy * dy) / (d * n);
  return r > 0.6 ? r : r < -0.8 ? r : 0;
}
function chainStep(dt) {
  const [a, b] = G.players, Lc = G.level.def.tether;
  if (!a.alive || !b.alive) { G.held = null; G.taut = false; return; }
  let holder = null, hanger = null;
  if (a.grounded && !b.grounded) { holder = a; hanger = b; }
  else if (b.grounded && !a.grounded) { holder = b; hanger = a; }
  if (holder) {
    const hcx = holder.x + holder.w / 2, hcy = holder.y + holder.h / 2;
    const vx = hanger.x + hanger.w / 2 - hcx, vy = hanger.y + hanger.h / 2 - hcy;
    const was = G.held && G.held.hanger === hanger.id;
    if (was || Math.hypot(vx, vy) >= Lc - 1) {
      let th = was ? G.held.th : Math.atan2(vy, vx), len = was ? G.held.len : Lc, w = was ? G.held.w : 0;
      if (!was) {
        const sp = Math.hypot(hanger.vx, hanger.vy);
        if (sp > 220) {
          Sfx.play('clank'); rumble(hanger.id, 0.25, 0.35, 80);
          if (!reduceMotion) G.shake = Math.max(G.shake, 0.06);
        }
        // caught at the end of the chain: the sideways part of the fall carries on as a swing
        w = clamp(((hanger.vx - holder.vx) * -Math.sin(th) + hanger.vy * Math.cos(th)) / Lc, -2.5, 2.5);
      }
      const inp = hanger.input;
      const push = chainClimbPush(hanger, holder, inp);
      if (push > 0) len = Math.max(CHAIN.minLen, len - CHAIN.climb * push * dt);
      else if (push < 0) len = Math.min(Lc, len - CHAIN.climb * push * dt);
      const ix = (inp.right ? 1 : 0) - (inp.left ? 1 : 0), iy = (inp.down ? 1 : 0) - (inp.jump ? 1 : 0);
      // push the way you want to go along the circle (not while climbing); with no push the chain slowly sags
      const wT = (push ? 0 : CHAIN.spin * (ix * -Math.sin(th) + iy * Math.cos(th))) + CHAIN.droop * Math.cos(th);
      w += (wT - w) * Math.min(1, CHAIN.ease * dt);
      const th0 = th;
      th += w * dt;
      moveBy(hanger, hcx + Math.cos(th) * len - hanger.w / 2 - hanger.x, hcy + Math.sin(th) * len - hanger.h / 2 - hanger.y);
      // a wall may have stopped them short: carry on from where they really are
      let rx = hanger.x + hanger.w / 2 - hcx, ry = hanger.y + hanger.h / 2 - hcy;
      let rd = Math.hypot(rx, ry);
      // the holder walking away from a hanger stuck at a wall hauls them up it (and over the lip)
      const away = Math.sign(-rx), walking = Math.abs(holder.vx) > 20 && Math.sign(holder.vx) === away;
      if (rd > len + 1 && walking) {
        moveBy(hanger, (-rx / rd) * (rd - len), (-ry / rd) * (rd - len));
        mantle(hanger, hcx, 28);
        rx = hanger.x + hanger.w / 2 - hcx; ry = hanger.y + hanger.h / 2 - hcy; rd = Math.hypot(rx, ry);
      }
      // climbing at a ledge: step out onto it
      if (push > 0) mantle(hanger, hcx, 28);
      if (rd > len + 1) {
        // the chain can't be shorter than the gap a wall leaves (so nothing yanks once the wall is passed)
        len = Math.min(Lc, Math.max(len, rd - 1));
      }
      // ...and if the wall left them further away than the chain is long, the chain holds the walker back
      // (sideways only, never off what they stand on), so it can't stretch and then snap
      if (rd > Lc + 1) {
        const x0 = holder.x;
        pullX(holder, (rx / rd) * (rd - Lc));
        if (holder.x !== x0 && !footed(holder)) holder.x = x0;
        if (holder.x !== x0) holder.vx = 0;
        rx = hanger.x + hanger.w / 2 - (holder.x + holder.w / 2);
      }
      const rth = Math.atan2(ry, rx);
      const nth = th + Math.atan2(Math.sin(rth - th), Math.cos(rth - th));
      // a wall that stopped the swing stops its speed too (only what really moved carries on)
      const moved = Math.atan2(Math.sin(nth - th0), Math.cos(nth - th0)) / dt;
      if (Math.abs(moved) < Math.abs(w) - 0.05 || Math.sign(moved) !== Math.sign(w)) w = clamp(moved, -Math.abs(w), Math.abs(w));
      w = clamp(w, -CHAIN.maxW, CHAIN.maxW);
      G.held = { hanger: hanger.id, th: nth, w, len, climbing: push > 0 };
      // let go (holder jumps, or you land) and you keep the swing
      G.held.vx = -Math.sin(rth) * w * len + holder.vx; G.held.vy = Math.cos(rth) * w * len;
      hanger.vx = 0; hanger.vy = 0; hanger.jumping = false;
      if (inp.left !== inp.right) hanger.face = inp.right ? 1 : -1;
      G.taut = true;
      return;
    }
  }
  if (G.held) {
    const h = G.players[G.held.hanger];
    if (h.alive && !h.grounded) { h.vx = G.held.vx; h.vy = G.held.vy; }
    G.held = null;
  }
  const { d } = ropeVec();
  G.taut = d >= Lc - 2;
  limitLength(Lc, false);
}

// BUNGEE: stretchy. Past its resting length it pulls whoever is in the air toward the other
// (standing players hold their ground). While it's stretched, a jump press "kicks" you higher.
const BUNGEE = { k: 90, damp: 1.2, kick: 760, max: 270, fade: 40 };
function bungeeStep(dt) {
  const [a, b] = G.players, L0 = G.level.def.tether;
  if (!a.alive || !b.alive) { G.taut = false; G.stretch = 0; return; }
  const { dx, dy, d } = ropeVec();
  G.stretch = Math.max(0, d - L0);
  G.taut = d > L0;
  if (G.stretch > 0 && d > 0) {
    const nx = dx / d, ny = dy / d;
    const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny; // how fast you're moving apart
    const f = BUNGEE.k * G.stretch + BUNGEE.damp * Math.max(0, rv);
    // the cord only hauls you when you hang below your partner (it fades out as you rise past
    // them), so a big bounce can carry you up onto a ledge instead of yanking you back down
    const lift = p => Math.max(0, Math.min(1, 1 - (other(p).y - p.y) / BUNGEE.fade));
    if (!a.grounded) { const s = f * lift(a) * dt; a.vx += nx * s; a.vy += ny * s; }
    if (!b.grounded) { const s = f * lift(b) * dt; b.vx -= nx * s; b.vy -= ny * s; }
  }
  for (const p of [a, b]) {
    if (p.grounded || G.stretch < 6) { p.kickReady = true; p.kickQueued = false; }
    // a kick pressed on the way down waits for the bottom of the bounce, where it does the most
    else if (p.kickQueued && p.vy <= 0) kick(p);
  }
  limitLength(BUNGEE.max, false);
}
// you can kick off the cord when you're hanging below your partner and it's stretched
function canKick(p) {
  const o = other(p);
  return cordType() === 'bungee' && !p.grounded && p.kickReady && !p.kickQueued && G.stretch > 20
    && o.alive && o.y + o.h / 2 < p.y + p.h / 2 - 20;
}
function kick(p) {
  p.vy = Math.min(p.vy - 130, -BUNGEE.kick);
  p.jumpBuf = 0; p.kickReady = false; p.kickQueued = false; p.jumping = false;
  p.sx = 0.8; p.sy = 1.25;
  Sfx.play('boing', p.id);
  puff(p.x + p.w / 2, p.y + p.h, 5, 'rgba(255,170,210,0.9)');
}

function canRopeJump(p) {
  if (!G.level.def.tether || cordType() !== 'rope' || !G.taut || p.grounded || p.ropeCD > 0) return false;
  const o = other(p);
  return o.alive && o.grounded && (o.y + o.h / 2) < (p.y + p.h / 2) - 8;
}

function jump(p, v) {
  p.vy = -v; p.jumpBuf = 0; p.coyote = 0; p.jumping = true; p.grounded = false; p.offT = 0.05;
  p.sx = 0.78; p.sy = 1.28;
  Sfx.play('jump', p.id);
  puff(p.x + p.w / 2, p.y + p.h, 4, 'rgba(255,255,255,0.8)');
}

function control(p, dt) {
  if (!p.alive) {
    p.pendingJump = false; // a jump pressed while waiting to respawn shouldn't fire on arrival
    p.respawnT -= dt;
    if (p.respawnT <= 0) respawn(p);
    return;
  }
  const inp = matchFrozen() ? NO_INPUT : p.input; // nobody moves during a match countdown or round-end banner
  p.stun = Math.max(0, p.stun - dt);
  if (p.knockT > 0) p.knockT -= dt;
  p.stompSafe = Math.max(0, p.stompSafe - dt);
  p.ropeCD -= dt;
  p.dropT -= dt;
  p.offT -= dt;
  const canAct = p.stun <= 0;
  const holder = G.crown && G.crown.holder === p.id;
  const mv = canAct ? (inp.right ? 1 : 0) - (inp.left ? 1 : 0) : 0;
  const max = PHYS.maxRun * (holder ? 0.9 : 1);
  // a jump off a moving partner keeps its ride speed until you land or steer (like a moving platform)
  if (p.grounded || mv) p.carryVx = 0;
  if (mv) { p.vx = approach(p.vx, mv * max, (p.grounded ? PHYS.accG : PHYS.accA) * dt); p.face = mv; }
  else p.vx = approach(p.vx, p.carryVx, (p.grounded ? PHYS.fricG : PHYS.fricA) * dt * (p.knockT > 0 ? KNOCK_FRICTION : 1));
  p.coyote = p.grounded ? PHYS.coyote : p.coyote - dt;
  if (p.pendingJump) { p.jumpBuf = PHYS.buffer; p.pendingJump = false; } else p.jumpBuf -= dt;
  if (canAct && p.jumpBuf > 0) {
    if (p.coyote > 0) {
      // jumping off a moving partner keeps their momentum (team levels carry riders sideways)
      const o = other(p);
      if (p.onPartner && !p.tileGround && o.alive && !isVersus()) {
        p.vx = clamp(p.vx + o.vx, -PHYS.maxRun, PHYS.maxRun);
        p.carryVx = clamp(o.vx, -PHYS.maxRun, PHYS.maxRun);
      }
      jump(p, PHYS.jumpV * (holder ? 0.96 : 1));
    }
    else if (canRopeJump(p)) { jump(p, PHYS.ropeJumpV); p.ropeCD = 0.35; }
  }
  // bungee: pressing (or holding) jump while hanging on a stretched cord bounces you higher
  if (canAct && canKick(p) && (p.jumpBuf > 0 || inp.jump)) {
    p.jumpBuf = 0;
    if (p.vy > 0) p.kickQueued = true; else kick(p);
  }
  if (p.jumping && !inp.jump && p.vy < 0) { p.vy *= PHYS.cut; p.jumping = false; }
  if (p.vy >= 0) p.jumping = false;
  p.vy = Math.min(p.vy + PHYS.g * dt, PHYS.maxFall);
  if (p.downLatch && !inp.down) p.downLatch = false; // mode levels: a ▼ held through a respawn must be let go before it drops you again
  if (canAct && inp.down && p.onOneWay && !p.onPartner && !p.downLatch) { p.dropT = 0.2; p.grounded = false; }
}

function postStep(p) {
  if (!p.alive) return;
  const was = p.grounded;
  const pr = probe(p);
  p.tileGround = pr.tile; p.onPartner = pr.partner; p.onOneWay = pr.oneway;
  p.grounded = pr.tile || pr.partner;
  if (p.grounded && !was && p.lastVy > 260) {
    p.sx = 1.25; p.sy = 0.78;
    puff(p.x + p.w / 2, p.y + p.h, 5, 'rgba(255,255,255,0.75)');
    Sfx.play('land');
  }
  p.lastVy = p.grounded ? 0 : p.vy;
  // hazards
  const tx1 = Math.floor(p.x / T), tx2 = Math.floor((p.x + p.w) / T);
  const ty1 = Math.floor(p.y / T), ty2 = Math.floor((p.y + p.h) / T);
  for (let ty = ty1; ty <= ty2; ty++) for (let tx = tx1; tx <= tx2; tx++) {
    if (tile(tx, ty) === '^' && rectHit(p, tx * T + 4, ty * T + 17, T - 8, 13)) { kill(p); return; }
  }
  if (p.y > H + 60) kill(p);
}

function kill(p) {
  if (!p.alive || G.mode !== 'play') return;
  G.falls++;
  Sfx.play('die');
  if (!reduceMotion) G.shake = 0.25;
  const victims = G.level.def.tether ? G.players : [p];
  for (const q of victims) {
    if (!q.alive) continue;
    rumble(q.id, 0.8, 0.5, 220);
    burst(q.x + q.w / 2, Math.min(q.y + q.h / 2, H - 10), PCOL[q.id], 18);
    q.alive = false; q.respawnT = 0.8;
    if (G.lmode && isLive()) hook('onKill', q);
  }
}

function respawn(p) {
  if (isTower() && p.id === G.build.climber) G.spawnPts[p.id] = towerSpot(p);
  const s = G.spawnPts[p.id];
  Object.assign(p, { x: s.x, y: s.y, vx: 0, vy: 0, alive: true, grounded: false, jumping: false, jumpBuf: 0, pendingJump: false, coyote: 0, stun: 0, stompSafe: 0, dropT: 0, sx: 0.6, sy: 1.4, lastVy: 0, carryVx: 0, offT: 0 });
  p.pendingAct = false; p.knockT = 0;
  if (G.level && G.level.def.mode) p.downLatch = true;
  burst(p.x + p.w / 2, p.y + p.h / 2, 'rgba(255,255,255,0.9)', 10);
  if (G.lmode && isLive()) hook('onRespawn', p);
}

// A stomp needs a real downward hit (relative to the player below) on someone who isn't
// already stunned or still protected from the last stomp. That rules out stun-locks and
// "stomps" by a rider who is just falling along with the player underneath.
function canStomp(p, o) {
  if (G.level.def.stomp === false) return false; // a versus level can switch stomping off (then you just stand on heads)
  return p.vy > 150 && p.vy - o.vy > 150 && p.stun <= 0 && o.stun <= 0 && o.stompSafe <= 0;
}
// Landing hard on a protected head bounces you off to the side instead.
function bonk(p, o) {
  const dir = (p.x + p.w / 2) < (o.x + o.w / 2) ? -1 : 1;
  p.vy = -300; p.vx = dir * 180; p.jumping = false;
  puff(p.x + p.w / 2, p.y + p.h, 3, 'rgba(255,255,255,0.8)');
}
function stomp(p, o) {
  rumble(o.id, 0.9, 0.4, 160); rumble(p.id, 0.2, 0.5, 80);
  o.stun = 0.5; o.stompSafe = 1.1; o.sx = 1.45; o.sy = 0.5;
  const dir = (p.x + p.w / 2) < (o.x + o.w / 2) ? -1 : 1;
  p.vy = -520; p.jumping = true;
  p.vx = clamp(p.vx + dir * 90, -PHYS.maxRun, PHYS.maxRun);
  Sfx.play('stomp');
  puff(o.x + o.w / 2, o.y, 6, 'rgba(255,255,255,0.9)');
  if (!reduceMotion) G.shake = 0.12;
  const c = G.crown;
  if (c && c.holder === o.id && c.invuln <= 0) {
    c.holder = p.id; c.invuln = 1.0;
    Sfx.play('crown');
    burst(p.x + p.w / 2, p.y, C.gold, 14);
  }
  if (G.lmode && isLive()) hook('onStomp', p, o);
}

