/* Pip & Bo - Level 18-4 Plank Duel (versus, World 18 Pirate Cove). */
'use strict';

/* ===== 18-4 Plank Duel (mode 'plankduel', versus, best of 5) =====
   Gavyn's pitch: a foam-sword fight on a plank over a splash pool, best of 5. You attack high or low and block high or
   low, each hit pushes the other player back a step, and whoever goes off the end gets a splash.
   Side view of a sunny lagoon: one long plank balanced on a barrel on a little rock, two friendly pirate ships behind
   (Pip's crew with the orange flag on the left, Bo's with the blue one on the right), Captain Polly the parrot on her
   post as the referee, fish and a duck float in the water. def.ownStep: the mode runs the whole live tick and draws the
   duellists itself (the platformer bodies are hidden every round, like 17-4).
     stance  standing = HIGH guard, hold ▼ = LOW guard (a crouch). Your sword shows where you guard.
     step    ◀ ▶ take small steps (slower while crouched). You stop at the plank's end by yourself: only bonks push you off.
     swing   the action swings at your stance height after a short wind-up (WIND s) you can read: the sword goes up
             behind the head (high) or back by the hip (low) and a "!" glows at that height. Changing stance during the
             wind-up changes the swing too (a FEINT), but then at least FEINT_MIN s of wind-up are left, so it can still
             be read. While winding up you can't block.
     block   a swing that meets the same guard is a BLOCK ("Clack!"): both slide apart a little, the attacker wobbles
             for a moment (no guard, no swing) and the blocker's next swing within RIPOSTE s is a quick one.
     bonk    a swing that meets the wrong guard (or someone winding up) is a BONK: the other slides back a step and a half,
             a bit further for every bonk they took this round. A bonk in mid-hop goes further.
     hop     jump hops: a low swing passes under you ("Hop!"), but you can't block in the air, so a high swing bonks.
     clang   two swings that land together at the same height: "Clang!", both bounce apart. At different heights: both bonk.
     lunge   hold the action past the wind-up to charge (glowing sword, no guard, can't move), let go to lunge: a dash
             and a strike that pushes three steps. Blocked, the lunger wobbles longer.
     edge    pushed just past the end you teeter ("Whoa!"): step back toward the middle in time for "Phew!", or splash.
   A splash ("SPLASH!" and a friendly fish; you bob up in the duck float) loses the round. Time up (ROUND s): whoever has
   more plank behind them wins, then whoever bonked more; else a tie (replayed). A second tie in a row goes to the most
   bonks this match, else a sudden-death "Last Clash": first bonk wins.
   Rounds: round 1 Calm Cove, then 4 shuffled twists: Short Plank, Rocking Plank (it tilts on the barrel and you slide
   downhill), Slippery Plank (bonks and steps slide further) and Breezy Cove (gusts, warned by the flags, blow you both).
   Catch-up help, gold and announced (round card, GO pop, gold HUD edge): 1 round behind = Gold boots (bonks push you
   25% less, longer teeter); 2+ behind also Polly's call (a gold ▲/▼ over your head says the height of each swing at you).
   Soft fails only: foam swords, "Bonk!", "Splash!", nobody is hurt.
   Every top-level name is prefixed plankduel / PLANKDUEL, every sound Sfx.extra.plankduel*. Rule randomness only from
   MODES.plankduel.rand (twist order, gusts); looks use their own plankduelVR. */
const PLANKDUEL_D = Math.PI / 180;
const PLANKDUEL = {
  X0: 480, PY: 352, SEA: 412,                       // the plank's middle (barrel), its top surface, the water line
  walk: 120, walkLo: 72, acc: 1500, accWet: 420, airDrift: 45,
  hopV: 430, grav: 1750, hopDodge: 12,               // a hop is about 0.49 s and 53 px; above hopDodge px a low swing misses
  wind: 0.42, windQuick: 0.27, feintMin: 0.26, rec: 0.22, recWhiff: 0.34, recLunge: 0.6,
  chargeT: 0.45, chargeMax: 2.4, lungeT: 0.2, lungeDash: 34,
  reach: 106, lungeReach: 122, minGap: 58,
  push: 46, pushLunge: 100, pushAir: 1.4, grow: 0.15, growMax: 4, goldPush: 0.75, wetPush: 1.3,
  block: 14, blockLunge: 30, clang: 24,
  fric: 760, fricWet: 470,
  stun: 0.34, stunLunge: 0.5, rattle: 0.3, rattleLunge: 0.7, riposte: 0.45,
  teeterMax: 14, teeterT: 0.8, goldTeeter: 1.25, clashW: 0.07,
  fallT: 0.8, lastBonkT: 0.55,
  tiltA: 6 * PLANKDUEL_D, tiltP: 7, tiltSlide: 300,
  gustF: 70, gustWarn: 1.2, gustT: 1.8,
  start: 86,                                         // each starts this far from the middle
};
const PLANKDUEL_TW = {
  plain: { name: 'Calm Cove', E: 300, time: 45, hint: 'Swing high or low. Block by guarding the same height!' },
  short: { name: 'Short Plank', E: 215, time: 40, hint: 'A short plank today: every bonk counts!' },
  rock: { name: 'Rocking Plank', E: 285, time: 45, hint: 'The barrel rocks the plank: you slide downhill!' },
  wet: { name: 'Slippery Plank', E: 300, time: 45, hint: 'A wave made it slippery: bonks slide further!' },
  wind: { name: 'Breezy Cove', E: 300, time: 45, hint: 'Watch the flags! Gusts blow you both along.' },
  last: { name: 'Last Clash', E: 240, time: 30, hint: 'Tied again! The first bonk wins!' },
};
const PLANKDUEL_MIX = ['short', 'rock', 'wet', 'wind'];
// looks-only randomness: never MODES.plankduel.rand, so the rules' random numbers don't depend on looks
let plankduelVS = 20261118;
const plankduelVR = () => { plankduelVS = (Math.imul(plankduelVS, 1664525) + 1013904223) >>> 0; return plankduelVS / 4294967296; };
// 1-player mode: the computer plays this duellist (no key reminders or hints for it)
const plankduelCpu = id => typeof cpuSolo === 'function' && cpuSolo() && cpuOn(id);
const plankduelBig = () => (typeof stageScale === 'number' ? stageScale < 0.72 : hudBig());
const plankduelApproach = (v, to, d) => (v < to ? Math.min(to, v + d) : Math.max(to, v - d));

/* ---------- the duellists ---------- */
function plankduelMake(k, E) {
  const P = PLANKDUEL;
  return { k, x: P.X0 + (k ? 1 : -1) * P.start, face: k ? -1 : 1, wv: 0, vx: 0, y: 0, vy: 0, air: false,
    stance: 'hi', sw: null, swN: 0, stun: 0, rattle: 0, riposte: 0, teeter: 0, fall: null, hitsTaken: 0, bonks: 0, gold: 0,
    // looks only (never read by the rules)
    pop: '', popT: 9, popCol: '#fff', popBig: false, sa: -75 * PLANKDUEL_D, swoosh: 0, swooshH: 'hi', flash: 0, sq: 0, cheer: 0, wob: 0, bob: 0 };
}
// how far the plank reaches each way (the end each duellist backs toward)
const plankduelEnd = (st, k) => PLANKDUEL.X0 + (k ? 1 : -1) * st.E;
// how much plank a duellist has behind them (px)
const plankduelRoom = (st, D) => (D.k ? plankduelEnd(st, 1) - D.x : D.x - plankduelEnd(st, 0));
// a duellist's guard: 'hi', 'lo' or null (open: winding up, charging, lunging, wobbling, teetering, falling, in the air)
function plankduelGuard(D) {
  if (D.fall || D.air || D.y > 0.5 || D.rattle > 0 || D.teeter > 0) return null;
  if (D.sw && (D.sw.state === 'wind' || D.sw.state === 'charge' || D.sw.state === 'lunge')) return null;
  return D.stance;
}
// is this duellist free to start a swing or a hop?
const plankduelFree = D => !D.fall && !D.sw && D.stun <= 0 && D.rattle <= 0 && D.teeter <= 0 && !D.air;
// Captain Polly the referee squawks a word now and then (looks only)
function plankduelSay(st, text) { if (st.vis) { st.vis.pollySay = { text, t: 0 }; st.vis.polly = 0.8; } Sfx.play('plankduelSquawk'); }
function plankduelPop(D, text, col, big) { D.pop = text; D.popCol = col || '#ffffff'; D.popT = 0; D.popBig = !!big; }
function plankduelPush(st, D, px, dir) {
  // a slide of about px pixels in direction dir (the friction of this plank stops it)
  const P = PLANKDUEL, f = st.twist === 'wet' ? P.fricWet : P.fric;
  D.vx = dir * Math.sqrt(2 * f * Math.max(0, px));
  D.wv = 0;
}
const plankduelOut = D => (D.k ? 1 : -1);            // the way to this duellist's own end

/* ---------- strikes ---------- */
// D's swing lands now. Works out a whiff, hop dodge, block, bonk or clang against O.
function plankduelStrike(st, D, O, lunge) {
  const P = PLANKDUEL, sw = D.sw, h = sw.h, out = plankduelOut(O);
  sw.state = 'rec'; sw.recT = lunge ? P.recLunge : P.rec; sw.struck = true;
  D.swoosh = 0.16; D.swooshH = h;
  st.stat.swings[D.k]++;
  if (O.fall) return;
  // the other's swing lands at the same moment too: a clang (same height) or a double bonk
  const os = O.sw;
  if (os && !os.struck && ((os.state === 'wind' && os.wind - os.t <= P.clashW) || (os.state === 'lunge' && P.lungeT - os.t <= P.clashW))) {
    if (os.h === h) {
      os.state = 'rec'; os.recT = P.rec; os.struck = true; O.swoosh = 0.16; O.swooshH = h;
      plankduelPush(st, D, P.clang, plankduelOut(D)); plankduelPush(st, O, P.clang, out);
      st.stat.clang++; plankduelSay(st, 'Clang! Squawk!');
      plankduelPop(D, 'Clang!', '#fff3a0', true); O.popT = 9;
      Sfx.play('plankduelClang', D.k); rumble(0, 0.2, 0.3, 80); rumble(1, 0.2, 0.3, 80);
      plankduelSparks(st, (D.x + O.x) / 2, P.PY - (h === 'hi' ? 66 : 30), 14, '#fff3a0');
      return;
    }
    // different heights: both land (in the Last Clash that is a tie)
    if (st.twist === 'last' && !st.lastBonk) st.lastBonk = { t: 0, w: -1 };
    os.struck = true; os.state = 'rec'; os.recT = P.rec; O.swoosh = 0.16; O.swooshH = os.h;
    plankduelBonk(st, O, D, os.lunge, true);
    plankduelBonk(st, D, O, lunge, true);
    plankduelPop(D, 'Double bonk!', '#ffe6a8', true);
    return;
  }
  const dist = Math.abs(O.x - D.x);
  if (dist > (lunge ? P.lungeReach : P.reach)) {
    sw.recT = lunge ? P.recLunge : P.recWhiff;
    plankduelPop(D, 'Swish!', '#d9d3ef'); Sfx.play('plankduelSwish', D.k);
    if (lunge) { D.rattle = P.rattleLunge * 0.6; st.stat.whiff[D.k]++; }
    return;
  }
  // in the air: a low swing passes under, a high one bonks harder
  if (O.air && O.y > P.hopDodge) {
    if (h === 'lo') {
      sw.recT = P.recWhiff; st.stat.hops[O.k]++;
      plankduelPop(O, 'Hop! Missed me!', '#c9ff8a', true); Sfx.play('plankduelHop', O.k);
      if (st.stat.hops[O.k] === 1) plankduelSay(st, 'Nice hop!');
      return;
    }
    plankduelBonk(st, D, O, lunge, false, P.pushAir);
    return;
  }
  const g = plankduelGuard(O);
  if (g === h) {
    // BLOCK: both slide apart a little; the attacker wobbles, the blocker may riposte quickly
    plankduelPush(st, O, P.block, out);
    plankduelPush(st, D, lunge ? P.blockLunge : P.block, plankduelOut(D));
    D.rattle = lunge ? P.rattleLunge : P.rattle; O.riposte = P.riposte;
    st.stat.blocks[O.k]++; O.flash = 0.25;
    plankduelPop(O, lunge ? 'Big block!' : 'Clack! Block!', '#ffffff', true);
    Sfx.play('plankduelClack', O.k); rumble(O.k, 0.1, 0.2, 60);
    plankduelSparks(st, (D.x + O.x) / 2 + O.face * -6, P.PY - (h === 'hi' ? 66 : 30), 8, '#ffffff');
    return;
  }
  plankduelBonk(st, D, O, lunge, false);
}
// D bonks O: O slides back toward their own end
function plankduelBonk(st, D, O, lunge, dbl, k = 1) {
  const P = PLANKDUEL;
  let px = (lunge ? P.pushLunge : P.push) * k * (1 + P.grow * Math.min(O.hitsTaken, P.growMax));
  if (O.gold) px *= P.goldPush;
  if (st.twist === 'wet') px *= P.wetPush;
  if (O.teeter > 0) { O.teeter = 0; plankduelFall(st, O); }
  else plankduelPush(st, O, px, plankduelOut(O));
  if (O.sw && O.sw.state !== 'rec') { O.sw = null; }
  O.stun = Math.max(O.stun, lunge ? P.stunLunge : P.stun);
  O.hitsTaken++; D.bonks++; O.sq = 0.6;
  st.stat.hits[D.k]++; if (lunge) { st.stat.lungeHits[D.k]++; plankduelSay(st, 'Thwack!'); }
  D.cheer = 1; st.vis.crowd[D.k] = 1.2;
  if (!dbl) plankduelPop(O, lunge ? 'THWACK!' : O.air ? 'Bonk! (in the air)' : 'Bonk!', lunge ? C.gold : '#ffd2c4', true);
  Sfx.play(lunge ? 'plankduelThwack' : 'plankduelBonk', O.k); rumble(O.k, 0.3, 0.5, 120);
  const hy = P.PY - (D.sw && D.sw.h === 'lo' ? 30 : 64);
  plankduelSparks(st, O.x - O.face * -4, hy, lunge ? 14 : 8, PCOL[D.k]);
  if (st.twist === 'last' && !st.lastBonk && !O.fall) st.lastBonk = { t: 0, w: D.k };
}
function plankduelFall(st, D) {
  if (D.fall) return;
  D.fall = { t: 0, x0: D.x, y0: 0, dir: plankduelOut(D), splashed: false };
  D.sw = null; D.vx = 0; D.wv = 0; D.teeter = 0;
  st.stat.splash[D.k]++;
  plankduelPop(D, 'Whoa-oa!', '#ffe6a8', true);
  Sfx.play('plankduelWhoa', D.k);
}

/* ---------- one duellist for one live tick ---------- */
function plankduelInput(p) {
  const i = p.input;
  return { left: !!i.left && !i.right, right: !!i.right && !i.left, down: !!i.down, act: !!i.act, press: !!p.pendingAct, hop: !!p.pendingJump };
}
function plankduelDuellist(st, D, O, p, dt) {
  const P = PLANKDUEL, inp = plankduelInput(p);
  p.pendingAct = false; p.pendingJump = false;
  D.stun = Math.max(0, D.stun - dt); D.rattle = Math.max(0, D.rattle - dt); D.riposte = Math.max(0, D.riposte - dt);
  if (D.fall) return;
  // stance: hold ▼ for the low guard (not in the air)
  const want = inp.down ? 'lo' : 'hi';
  if (!D.air && want !== D.stance) {
    D.stance = want;
    const sw = D.sw;
    // a feint: the swing changes height, but there is always FEINT_MIN of wind-up left to read it
    if (sw && sw.state === 'wind') {
      sw.h = want;
      sw.t = Math.min(sw.t, sw.wind - P.feintMin);
      sw.feints++; st.stat.feints[D.k]++;
      if (sw.feints === 1) plankduelPop(D, 'Feint!', '#e6d8ff');
    } else if (sw && sw.state === 'charge') sw.h = want;
  }
  // teetering at the end: step back toward the middle for "Phew!"
  if (D.teeter > 0) {
    const back = D.k ? inp.left : inp.right;
    if (back) {
      D.teeter = 0; D.x = plankduelEnd(st, D.k) - plankduelOut(D) * 6; D.wv = -plankduelOut(D) * 60;
      st.stat.phew[D.k]++;
      plankduelPop(D, 'Phew!', '#c9ff8a', true); Sfx.play('plankduelPhew', D.k);
    } else {
      D.teeter -= dt;
      if (D.teeter <= 0) { D.teeter = 0; plankduelFall(st, D); return; }
    }
  }
  // a hop
  if (inp.hop && plankduelFree(D)) {
    D.air = true; D.vy = P.hopV; D.stance = 'hi';
    st.stat.hopN[D.k]++; Sfx.play('plankduelHopUp', D.k);
  }
  // swinging
  if (inp.press && plankduelFree(D)) {
    D.sw = { state: 'wind', t: 0, wind: D.riposte > 0 ? P.windQuick : P.wind, h: D.stance, feints: 0, struck: false, lunge: false, id: ++D.swN };
    D.riposte = 0;
    Sfx.play('plankduelWind', D.k);
  }
  const sw = D.sw;
  if (sw) {
    if (sw.state === 'wind') {
      sw.t += dt;
      if (sw.t >= sw.wind) {
        // still holding the action: it becomes a charge for a lunge
        if (inp.act && sw.wind === P.wind) { sw.state = 'charge'; sw.ct = 0; Sfx.play('plankduelCharge', D.k); }
        else plankduelStrike(st, D, O, false);
      }
    } else if (sw.state === 'charge') {
      sw.ct += dt;
      if (!inp.act || sw.ct >= P.chargeMax) {
        if (sw.ct >= P.chargeT) {
          sw.state = 'lunge'; sw.t = 0; sw.lunge = true; st.stat.lunges[D.k]++;
          plankduelPop(D, 'LUNGE!', C.gold, true); Sfx.play('plankduelLunge', D.k);
        } else plankduelStrike(st, D, O, false);
      }
    } else if (sw.state === 'lunge') {
      const step = P.lungeDash / P.lungeT * dt;
      D.x += -plankduelOut(D) * step;
      sw.t += dt;
      if (sw.t >= P.lungeT) plankduelStrike(st, D, O, true);
    } else if (sw.state === 'rec') {
      sw.recT -= dt;
      if (sw.recT <= 0) D.sw = null;
    }
  }
  // walking (small steps, a short slide; a long slide on the slippery plank)
  const wet = st.twist === 'wet';
  let target = 0;
  if (!D.sw && D.stun <= 0 && D.teeter <= 0 && !D.air) {
    const d = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    target = d * (D.stance === 'lo' ? P.walkLo : P.walk);
  }
  D.wv = plankduelApproach(D.wv, target, (wet ? P.accWet : P.acc) * dt);
  let dx = D.wv * dt;
  if (D.air) {
    const d = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    dx += d * P.airDrift * dt;
  }
  // you never walk off by yourself: steps stop at the end
  const lim = st.E - 4, rel = D.x - P.X0;
  if (Math.abs(rel + dx) > lim && Math.abs(rel + dx) > Math.abs(rel)) {
    dx = Math.abs(rel) < lim ? Math.sign(dx) * lim - rel : 0;
    D.wv = 0;
  }
  D.x += dx;
  // bonk slides
  if (D.vx) {
    D.x += D.vx * dt;
    D.vx = plankduelApproach(D.vx, 0, (wet ? P.fricWet : P.fric) * dt);
  }
  // the hop
  if (D.air) {
    D.y += D.vy * dt; D.vy -= P.grav * dt;
    if (D.y <= 0) { D.y = 0; D.vy = 0; D.air = false; D.sq = 0.4; Sfx.play('plankduelLand', D.k); }
  }
}
// the twists' pushes on everybody standing on the plank (the rocking plank's slope, the gusts)
function plankduelTwistPush(st, dt) {
  const P = PLANKDUEL;
  for (const D of st.d) {
    if (D.fall) continue;
    let v = 0;
    if (st.twist === 'rock' && !D.air) v += Math.sin(st.tilt) * P.tiltSlide;
    if (st.gust && st.gust.on) v += st.gust.dir * P.gustF * (D.air ? 1.5 : 1) * (D.stance === 'lo' && !D.air ? 0.6 : 1);
    if (!v) continue;
    // (the slide stops at the end like a step, unless they are already teetering or sliding off)
    let dx = v * dt;
    const lim = st.E - 4, rel = D.x - P.X0;
    if (D.teeter <= 0 && Math.abs(rel) < lim && Math.abs(rel + dx) > lim) dx = Math.sign(dx) * (lim - Math.abs(rel));
    if (D.teeter <= 0) D.x += dx;
  }
}
// bodies never overlap: they push apart (half each)
function plankduelSeparate(st) {
  const P = PLANKDUEL, [A, B] = st.d;
  if (A.fall || B.fall) return;
  const gap = B.x - A.x;
  if (gap < P.minGap) {
    const d = (P.minGap - gap) / 2;
    A.x -= d; B.x += d;
    if (A.vx > 0) A.vx = 0; if (B.vx < 0) B.vx = 0;
    if (A.wv > 0) A.wv = 0; if (B.wv < 0) B.wv = 0;
  }
}
// past the end: a short teeter, or a splash
function plankduelEdges(st) {
  const P = PLANKDUEL;
  for (const D of st.d) {
    if (D.fall) continue;
    const over = plankduelOut(D) * (D.x - plankduelEnd(st, D.k));
    if (over > P.teeterMax) { plankduelFall(st, D); continue; }
    if (over > 0 && D.teeter <= 0 && Math.abs(D.vx) < 60 && !D.air) {
      D.teeter = D.gold ? P.goldTeeter : P.teeterT; D.vx = 0; D.wv = 0; D.sw = null;
      st.stat.teeters[D.k]++;
      plankduelPop(D, 'Whoa! Step back!', '#ffe6a8', true); Sfx.play('plankduelWobble', D.k);
    }
  }
}
// a falling duellist: off the end, down into the water, then the round is over
function plankduelFallTick(st, D, dt, live) {
  const f = D.fall, P = PLANKDUEL;
  f.t += dt;
  if (!f.splashed && f.t >= 0.32) {
    f.splashed = true;
    const sx = plankduelEnd(st, D.k) + f.dir * 30;
    plankduelPop(D, 'SPLASH!', '#bfe8ff', true); Sfx.play('plankduelSplash', D.k); rumble(D.k, 0.4, 0.6, 200);
    for (let i = 0; i < 26; i++) plankduelFx(st, sx + (plankduelVR() - 0.5) * 30, P.SEA, (plankduelVR() - 0.5) * 260, -120 - plankduelVR() * 300, 0.9, i % 3 ? '#bfe8ff' : '#ffffff', 3 + plankduelVR() * 4, 800, 'dot');
    st.vis.ring.push({ x: sx, t: 0 });
    st.vis.fish = { x: sx + f.dir * 70, t: 0, dir: -f.dir };
    st.vis.crowd[1 - D.k] = 1.6;
    plankduelSay(st, 'Splash! Arr!');
  }
  if (live && f.t >= P.fallT && !st.ended) {
    st.ended = true;
    matchRoundEnd(1 - D.k, NAMES[D.k] + ' took a splash!');
  }
}

/* ---------- the tick ---------- */
function plankduelTick(dt, live) {
  const st = G.mst, P = PLANKDUEL;
  st.t += dt;
  if (live) {
    st.lt += dt;
    // the rocking plank and the gusts
    if (st.twist === 'rock') st.tilt = P.tiltA * Math.sin(2 * Math.PI * st.lt / P.tiltP + st.tiltPh);
    if (st.twist === 'wind') plankduelGustTick(st, dt);
    // who moves first alternates every tick, so neither side wins every tie
    const order = (G.tickN & 1) ? [1, 0] : [0, 1];
    for (const k of order) plankduelDuellist(st, st.d[k], st.d[1 - k], G.players[k], dt);
    plankduelTwistPush(st, dt);
    plankduelSeparate(st);
    plankduelEdges(st);
    for (const D of st.d) if (D.fall) plankduelFallTick(st, D, dt, true);
    if (st.lastBonk && !st.ended) {
      st.lastBonk.t += dt;
      if (st.lastBonk.t >= P.lastBonkT) { st.ended = true; const w = st.lastBonk.w; matchRoundEnd(w, w < 0 ? 'Double bonk: a tie!' : 'First bonk: ' + NAMES[w] + '!'); }
    }
    plankduelHints(st, dt);
  } else {
    for (const D of st.d) if (D.fall) plankduelFallTick(st, D, dt, false);
  }
  for (const p of G.players) { p.pendingJump = false; p.pendingAct = false; }
  plankduelVisTick(st, dt);
}
function plankduelGustTick(st, dt) {
  const P = PLANKDUEL, R = () => MODES.plankduel.rand();
  const g = st.gust;
  g.next -= dt;
  if (!g.on && !g.warn && g.next <= 0) { g.warn = true; g.wt = P.gustWarn; Sfx.play('plankduelGustWarn'); }
  if (g.warn) { g.wt -= dt; if (g.wt <= 0) { g.warn = false; g.on = true; g.t = P.gustT; Sfx.play('plankduelGust'); } }
  if (g.on) { g.t -= dt; if (g.t <= 0) { g.on = false; g.dir = -g.dir; g.next = 3.5 + R() * 3; } }
}
// teaching chips for people (rounds 1-2 and gold help): what to do right now
function plankduelHints(st, dt) {
  for (const D of st.d) {
    const O = st.d[1 - D.k];
    D.hint = null;
    if (plankduelCpu(D.k) || D.fall) continue;
    const teach = st.round <= 2 || D.gold > 0;
    if (D.teeter > 0) { D.hint = 'back'; continue; }
    if (!teach) continue;
    const os = O.sw, coming = os && (os.state === 'wind' || os.state === 'charge' || os.state === 'lunge');
    if (coming && !D.air && Math.abs(O.x - D.x) < PLANKDUEL.lungeReach + 30) {
      if (D.stance !== os.h) D.hint = os.h === 'lo' ? 'lo' : 'hi';
      continue;
    }
    D.idleT = (D.idleT || 0) + dt;
    if (D.sw || D.stun > 0) D.idleT = 0;
    if (Math.abs(O.x - D.x) <= PLANKDUEL.reach && D.idleT > 2.5 && st.lt > 3) D.hint = 'swing';
    else if (Math.abs(O.x - D.x) > PLANKDUEL.reach + 30 && st.lt > 4 && D.idleT > 3) D.hint = 'step';
  }
}

/* ---------- looks: effects that never touch the rules ---------- */
function plankduelFx(st, x, y, vx, vy, life, col, size, grav, kind) {
  const v = st.vis; if (!v) return;
  v.fx.push({ x, y, vx, vy, life, max: life, col, size, grav, kind: kind || 'dot', rot: plankduelVR() * 6.28 });
  if (v.fx.length > 300) v.fx.splice(0, v.fx.length - 300);
}
function plankduelSparks(st, x, y, n, col) {
  for (let i = 0; i < n; i++) { const a = plankduelVR() * 6.28, sp = 60 + plankduelVR() * 160; plankduelFx(st, x, y, Math.cos(a) * sp, Math.sin(a) * sp - 30, 0.45, i % 2 ? '#ffffff' : col, 3, 200, 'spark'); }
}
function plankduelVisNew() {
  const fish = [];
  for (let i = 0; i < 6; i++) fish.push({ x: plankduelVR() * 960, y: 450 + plankduelVR() * 60, v: (plankduelVR() < 0.5 ? -1 : 1) * (18 + plankduelVR() * 22), c: i % 3, s: 0.7 + plankduelVR() * 0.5 });
  const bub = [];
  for (let i = 0; i < 10; i++) bub.push({ x: plankduelVR() * 960, y: 420 + plankduelVR() * 120, s: 1 + plankduelVR() * 2.5, v: 14 + plankduelVR() * 20 });
  return { fx: [], ring: [], fish: null, swim: fish, bub, crowd: [0, 0], t: 0, polly: 0, pollySay: null, duckX: 70 };
}
function plankduelVisTick(st, dt) {
  const v = st.vis, P = PLANKDUEL; if (!v) return;
  v.t += dt;
  const fr = Math.exp(-1.5 * dt);
  let n = 0;
  for (const q of v.fx) { q.life -= dt; q.vx *= fr; q.vy += q.grav * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.rot += dt * 5; if (q.life > 0 && !(q.kind === 'dot' && q.y > P.SEA + 6 && q.vy > 0)) v.fx[n++] = q; }
  v.fx.length = n;
  v.ring = v.ring.filter(r => (r.t += dt) < 1.4);
  if (v.fish) { v.fish.t += dt; if (v.fish.t > 2.4) v.fish = null; }
  for (const f of v.swim) { f.x += f.v * dt; if (f.x < -40) f.x = 1000; if (f.x > 1000) f.x = -40; }
  for (const b of v.bub) { b.y -= b.v * dt; if (b.y < P.SEA + 6) { b.y = 540; b.x = plankduelVR() * 960; } }
  v.crowd = v.crowd.map(c => Math.max(0, c - dt));
  v.polly = Math.max(0, v.polly - dt);
  if (v.pollySay) { v.pollySay.t += dt; if (v.pollySay.t > 1.6) v.pollySay = null; }
  for (const D of st.d) {
    D.popT += dt; D.swoosh = Math.max(0, D.swoosh - dt); D.flash = Math.max(0, D.flash - dt); D.sq *= Math.exp(-dt * 8);
    D.cheer = Math.max(0, D.cheer - dt); D.wob += dt * (D.teeter > 0 ? 16 : D.stun > 0 ? 9 : 3); D.bob += dt;
    const ta = plankduelSwordAngle(D);
    D.sa += (ta - D.sa) * (D.swoosh > 0.1 || (D.sw && D.sw.state === 'lunge') ? 1 : 1 - Math.exp(-dt * 26));
  }
}
// where the sword points (0 = straight ahead, negative = up), for the picture
function plankduelSwordAngle(D) {
  const d = PLANKDUEL_D, sw = D.sw;
  if (D.fall) return -120 * d + Math.sin(D.wob * 3) * 60 * d;
  if (D.teeter > 0) return Math.sin(D.wob) * 90 * d - 60 * d;
  if (D.stun > 0) return 30 * d;
  if (sw) {
    const lo = sw.h === 'lo';
    if (sw.state === 'wind') return lo ? 150 * d : -150 * d;
    if (sw.state === 'charge') return lo ? 160 * d : -160 * d;
    if (sw.state === 'lunge') return lo ? 30 * d : -6 * d;
    if (sw.state === 'rec') return D.swoosh > 0 ? (lo ? 30 * d : -6 * d) : (lo ? 40 * d : -70 * d);
  }
  if (D.air) return -40 * d;
  if (D.rattle > 0) return 100 * d + Math.sin(D.wob * 4) * 20 * d;
  return D.stance === 'lo' ? 40 * d : -72 * d;
}

/* ---------- the mode ---------- */
MODES.plankduel = {
  rand: Math.random,
  setup(st, L) {
    for (const row of L.grid) row.fill('.');
    st.stat = { hits: [0, 0], blocks: [0, 0], hops: [0, 0], hopN: [0, 0], splash: [0, 0], clang: 0, feints: [0, 0], lunges: [0, 0], lungeHits: [0, 0],
      phew: [0, 0], teeters: [0, 0], swings: [0, 0], whiff: [0, 0], roundHits: [] };
    const mix = PLANKDUEL_MIX.slice();
    for (let i = mix.length - 1; i > 0; i--) { const j = Math.floor(this.rand() * (i + 1)); [mix[i], mix[j]] = [mix[j], mix[i]]; }
    st.order = ['plain', ...mix];
    st.forceTwist = this.testTwist || null;
    st.vis = plankduelVisNew();
  },
  resetRound(n, info) {
    const st = G.mst, m = G.match;
    st.round = n;
    st.twist = info.suddenDeath ? 'last' : (st.forceTwist || st.order[Math.min(n, st.order.length) - 1]);
    const tw = PLANKDUEL_TW[st.twist];
    st.E = tw.E;
    st.d = [0, 1].map(k => plankduelMake(k, st.E));
    for (const D of st.d) D.gold = info.suddenDeath ? 0 : Math.max(0, info.wins[1 - D.k] - info.wins[D.k]);
    st.t = 0; st.lt = 0; st.ended = false; st.lastBonk = null; st.goldSaid = false;
    st.tilt = 0; st.tiltPh = this.rand() < 0.5 ? 0 : Math.PI;
    st.gust = st.twist === 'wind' ? { on: false, warn: false, t: 0, wt: 0, next: 3 + this.rand() * 2, dir: this.rand() < 0.5 ? -1 : 1 } : null;
    if (m) { m.timeLeft = tw.time; m.lastSec = Math.ceil(tw.time); }
    const keep = st.vis; st.vis = plankduelVisNew(); if (keep) st.vis.swim = keep.swim;
    // the duellists are drawn by the mode: hide the platformer bodies every round (matchResetPlayers revives them)
    for (const p of G.players) Object.assign(p, { alive: false, respawnT: Infinity });
    G.particles.length = 0;
  },
  go() {
    const st = G.mst;
    for (const D of st.d) if (D.gold) plankduelPop(D, D.gold >= 2 ? 'Gold boots + Polly\'s call!' : 'Gold boots!', C.gold, true);
    plankduelSay(st, st.twist === 'last' ? 'First bonk wins!' : 'En garde!');
  },
  step(dt) { plankduelTick(dt, true); },
  idle(dt) {
    const st = G.mst, m = G.match; if (!st.d) return;
    for (const p of G.players) { p.pendingAct = false; p.pendingJump = false; }
    if (m.phase === 'end' || m.phase === 'over') { plankduelTick(dt, false); return; }
    st.t += dt;
    plankduelVisTick(st, dt);
    if (m.phase === 'count' && !st.goldSaid) { st.goldSaid = true; if (st.d.some(D => D.gold)) Sfx.play('plankduelGold'); }
  },
  timeUp() {
    const st = G.mst, [A, B] = st.d;
    if (A.fall && !B.fall) return { winner: 1, reason: 'Pip took a splash!' };
    if (B.fall && !A.fall) return { winner: 0, reason: 'Bo took a splash!' };
    if (st.twist === 'last') return { winner: -1, reason: 'Time\'s up: no bonk!' };
    const ra = plankduelRoom(st, A), rb = plankduelRoom(st, B);
    if (Math.abs(ra - rb) >= 8) { const w = ra > rb ? 0 : 1; return { winner: w, reason: 'Time\'s up! ' + NAMES[w] + ' kept more plank!' }; }
    if (A.bonks !== B.bonks) { const w = A.bonks > B.bonks ? 0 : 1; return { winner: w, reason: 'Time\'s up! More bonks for ' + NAMES[w] + '!' }; }
    return { winner: -1, reason: 'Time\'s up: dead even!' };
  },
  tiebreak() {
    const h = G.mst.stat.hits;
    if (h[0] !== h[1]) return { winner: h[0] > h[1] ? 0 : 1, reason: 'Most bonks this match!' };
    return -1;
  },
  draw() { plankduelDrawWorld(); },
  drawTop() { plankduelDrawTop(); },
  hud() { plankduelHud(); },
  stats() {
    const s = G.mst.stat;
    const out = [
      { label: 'Bonks landed', values: s.hits.slice() },
      { label: 'Blocks', values: s.blocks.slice() },
      { label: 'Hop dodges', values: s.hops.slice() },
      { label: 'Splashes', values: s.splash.slice() },
    ];
    const bits = [];
    if (s.clang) bits.push(s.clang + (s.clang === 1 ? ' clang' : ' clangs'));
    const fe = s.feints[0] + s.feints[1], lu = s.lunges[0] + s.lunges[1], ph = s.phew[0] + s.phew[1];
    if (fe) bits.push(fe + (fe === 1 ? ' feint' : ' feints'));
    if (lu) bits.push(lu + (lu === 1 ? ' lunge' : ' lunges'));
    if (ph) bits.push(ph + ' "Phew!" saves');
    if (bits.length) out.push(bits.join('  ·  '));
    const lh = s.lungeHits;
    if (lh[0] + lh[1] > 0) { const w = lh[0] >= lh[1] ? 0 : 1; out.push('Big lunge bonks: ' + NAMES[w] + ' ' + lh[w] + (lh[1 - w] ? ', ' + NAMES[1 - w] + ' ' + lh[1 - w] : '') + '!'); }
    return out;
  },
  // read-only helpers for the bot harness and the computer brain (no window globals)
  test: { PLANKDUEL, PLANKDUEL_TW, guard: plankduelGuard, room: plankduelRoom, end: plankduelEnd, free: plankduelFree },
};

/* ---------- drawing ---------- */
const PLANKDUEL_COL = {
  skyTop: '#46b8ec', skyMid: '#9fdcf5', skyBot: '#fff2cf', seaFar: '#3fb7cf', seaMid: '#2aa3c4', seaNear: '#1b84ad', deep: '#136b93',
  sand: '#f2d68c', sandDk: '#c9a457', wood: '#c98e57', woodDk: '#7d5030', woodHi: '#e2ad75', rock: '#8a8f9e', rockDk: '#626878',
  hull: '#9a6136', hullDk: '#6a3d1e', rail: '#7d5030', hat: '#2b2a4a', hatDk: '#17162c', palm: '#4fae4a', palmDk: '#2f7d33', trunk: '#a8743f',
};
// the plank's surface height at x (the rocking plank tilts round the barrel)
const plankduelPlankY = (st, x) => PLANKDUEL.PY + (x - PLANKDUEL.X0) * Math.tan(st.tilt || 0);
function plankduelSky(st) {
  const K = PLANKDUEL_COL, t = st.vis ? st.vis.t : 0;
  const g = ctx.createLinearGradient(0, 0, 0, 270);
  g.addColorStop(0, K.skyTop); g.addColorStop(0.6, K.skyMid); g.addColorStop(1, K.skyBot);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, 272);
  // the sun with soft rays
  ctx.save(); ctx.translate(830, 92);
  ctx.fillStyle = 'rgba(255,246,190,0.25)';
  for (let i = 0; i < 12; i++) { ctx.rotate(Math.PI / 6); ctx.beginPath(); ctx.moveTo(-8, 50); ctx.lineTo(8, 50); ctx.lineTo(0, 96 + Math.sin(t * 1.5 + i) * 6); ctx.closePath(); ctx.fill(); }
  ctx.fillStyle = 'rgba(255,240,170,0.45)'; circle(0, 0, 56); ctx.fill();
  ctx.fillStyle = '#fff5bf'; circle(0, 0, 40); ctx.fill();
  ctx.restore();
  // drifting clouds
  for (let i = 0; i < 5; i++) {
    const x = ((i * 233 + t * (6 + i * 2)) % 1180) - 110, y = 46 + (i * 47) % 110, s = 0.8 + (i % 3) * 0.3;
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    ctx.beginPath(); ctx.moveTo(x - 18 * s, y + 8 * s);
    ctx.arc(x, y, 18 * s, Math.PI * 0.85, Math.PI * 1.75); ctx.arc(x + 22 * s, y - 10 * s, 22 * s, Math.PI * 1.15, Math.PI * 1.9);
    ctx.arc(x + 46 * s, y, 17 * s, Math.PI * 1.3, Math.PI * 0.2); ctx.closePath(); ctx.fill();
  }
  // seagulls far off
  ctx.strokeStyle = 'rgba(40,60,90,0.55)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const x = ((t * 22 + i * 290) % 1100) - 70, y = 70 + i * 24 + Math.sin(t * 2 + i) * 5, f = Math.sin(t * 7 + i * 2) * 4;
    ctx.beginPath(); ctx.moveTo(x - 9, y - f); ctx.quadraticCurveTo(x - 4, y - 6, x, y); ctx.quadraticCurveTo(x + 4, y - 6, x + 9, y - f); ctx.stroke();
  }
  ctx.lineCap = 'butt';
}
function plankduelPalm(x, y, s, sway) {
  const K = PLANKDUEL_COL;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.strokeStyle = K.trunk; ctx.lineWidth = 7; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(6, -40, 2 + sway, -78); ctx.stroke();
  ctx.strokeStyle = 'rgba(90,60,30,0.4)'; ctx.lineWidth = 2;
  for (let k = 1; k < 7; k++) { ctx.beginPath(); ctx.moveTo(-3 + k * 0.6, -k * 11); ctx.lineTo(5 + k * 0.6, -k * 11 - 2); ctx.stroke(); }
  ctx.translate(2 + sway, -78);
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i - 2.5) * 0.55 + Math.sin(G.clock * 1.2 + i) * 0.04;
    ctx.save(); ctx.rotate(a);
    ctx.fillStyle = i % 2 ? K.palm : K.palmDk;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(22, -12, 44, 6); ctx.quadraticCurveTo(22, -2, 0, 0); ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = '#7a4a22'; circle(-3, 4, 4); ctx.fill(); circle(4, 5, 4); ctx.fill();
  ctx.restore();
  ctx.lineCap = 'butt';
}
function plankduelSea(st) {
  const K = PLANKDUEL_COL, t = st.vis ? st.vis.t : 0, P = PLANKDUEL;
  // the far sea down to the lagoon
  const g = ctx.createLinearGradient(0, 270, 0, P.SEA);
  g.addColorStop(0, K.seaFar); g.addColorStop(1, K.seaMid);
  ctx.fillStyle = g; ctx.fillRect(0, 270, W, P.SEA - 270 + 2);
  // far islands
  ctx.fillStyle = '#7fd0b8';
  ctx.beginPath(); ctx.ellipse(330, 276, 120, 18, 0, Math.PI, 0); ctx.fill();
  ctx.fillStyle = '#9fe0c4'; ctx.beginPath(); ctx.ellipse(630, 276, 70, 11, 0, Math.PI, 0); ctx.fill();
  ctx.fillStyle = K.sand; ctx.beginPath(); ctx.ellipse(330, 277, 110, 5, 0, 0, Math.PI * 2); ctx.fill();
  plankduelPalm(300, 268, 0.5, 2); plankduelPalm(352, 270, 0.42, -2); plankduelPalm(640, 272, 0.36, 1);
  // sparkles on the water
  for (let i = 0; i < 26; i++) {
    const x = (i * 157 + Math.sin(t * 0.5 + i) * 20) % W, y = 284 + (i * 37) % (P.SEA - 290), a = 0.35 + 0.35 * Math.sin(t * 3 + i * 1.7);
    ctx.fillStyle = 'rgba(255,255,255,' + a.toFixed(2) + ')'; ctx.fillRect(x, y, 12 + (i % 3) * 6, 2);
  }
}
// a friendly pirate ship in the back with its cheering crew (k: whose flag, 0 = Pip's orange on the left)
function plankduelShip(st, k) {
  const K = PLANKDUEL_COL, t = st.vis ? st.vis.t : 0, cheer = st.vis ? st.vis.crowd[k] : 0;
  const side = k ? 1 : -1, cx = k ? 868 : 92, bob = Math.sin(t * 1.3 + k * 2) * 2.5, y = 318 + bob;
  ctx.save(); ctx.translate(cx, y); ctx.scale(-side, 1);
  // mast, sail and flag
  ctx.fillStyle = K.woodDk; ctx.fillRect(8, -196, 7, 170);
  ctx.fillStyle = '#fbf3e0'; ctx.strokeStyle = '#d8c8a8'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-58, -176); ctx.quadraticCurveTo(-10, -150, -60, -74); ctx.lineTo(4, -78); ctx.lineTo(4, -178); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(20, -170); ctx.quadraticCurveTo(70, -140, 22, -84); ctx.closePath(); ctx.fill(); ctx.stroke();
  // a friendly emblem on the sail: a big star (no skulls in this cove)
  ctx.fillStyle = PCOL[k]; plankduelStar(-28, -126, 16);
  const wv = Math.sin(t * 6 + k) * 3;
  ctx.fillStyle = PCOL[k]; ctx.beginPath(); ctx.moveTo(15, -196); ctx.quadraticCurveTo(32, -192 + wv, 48, -186); ctx.lineTo(15, -176); ctx.closePath(); ctx.fill();
  // the hull
  ctx.fillStyle = K.hull; ctx.strokeStyle = K.hullDk; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-110, -30); ctx.lineTo(96, -38); ctx.quadraticCurveTo(84, 10, 60, 26); ctx.lineTo(-84, 26); ctx.quadraticCurveTo(-104, 6, -110, -30); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(-100, -24, 190, 6);
  ctx.strokeStyle = K.hullDk; ctx.lineWidth = 1.5;
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-100, -8 + i * 11); ctx.lineTo(84, -12 + i * 11); ctx.stroke(); }
  ctx.fillStyle = PCOL[k]; ctx.fillRect(-104, -36, 196, 6);
  // portholes
  for (let i = 0; i < 3; i++) { ctx.fillStyle = '#ffe9a8'; circle(-60 + i * 48, 2, 6); ctx.fill(); ctx.strokeStyle = '#4a2d14'; ctx.lineWidth = 2; circle(-60 + i * 48, 2, 6); ctx.stroke(); }
  ctx.restore();
  // the crew on the rail (drawn unflipped so faces read): a parrot, a crab and a seagull, hopping when they cheer
  const hop = i => (cheer > 0 ? Math.abs(Math.sin((t * 9) + i * 1.4)) * 10 * Math.min(1, cheer) : Math.abs(Math.sin(t * 1.6 + i)) * 1.5);
  const rx = x => cx + side * x, ry = y - 40;
  plankduelCrab(rx(-62), ry - hop(0), 0.9, k ? -1 : 1, cheer > 0);
  plankduelGull(rx(-12), ry - hop(1), 0.9, k ? -1 : 1, cheer > 0);
  plankduelParrot(rx(40), ry - 2 - hop(2), 0.85, k ? '#5bd47a' : '#ff5f5f', k ? '#ffd34d' : '#5b95ff', k ? -1 : 1, cheer > 0 ? 1 : 0);
}
function plankduelStar(x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr0 = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr0, y + Math.sin(a) * rr0); }
  ctx.closePath(); ctx.fill();
}
function plankduelCrab(x, y, s, face, cheer) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s * face, s);
  ctx.strokeStyle = '#c23a2a'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(sx * 8, -4); ctx.lineTo(sx * (14 + i * 2), 2 + i * 2); ctx.stroke(); }
  const up = cheer ? -10 : 0;
  ctx.beginPath(); ctx.moveTo(-10, -8); ctx.lineTo(-16, -16 + up); ctx.moveTo(10, -8); ctx.lineTo(16, -16 + up); ctx.stroke();
  ctx.fillStyle = '#ff5a43'; circle(-17, -19 + up, 5); ctx.fill(); circle(17, -19 + up, 5); ctx.fill();
  ctx.beginPath(); ctx.ellipse(0, -6, 13, 9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff'; circle(-4, -16, 3); ctx.fill(); circle(4, -16, 3); ctx.fill();
  ctx.fillStyle = C.ink; circle(-4, -16, 1.5); ctx.fill(); circle(4, -16, 1.5); ctx.fill();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, -6, 4, 0.2, Math.PI - 0.2); ctx.stroke();
  ctx.restore(); ctx.lineCap = 'butt';
}
function plankduelGull(x, y, s, face, cheer) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s * face, s);
  ctx.fillStyle = '#f4b03a'; ctx.fillRect(-5, -2, 3, 6); ctx.fillRect(2, -2, 3, 6);
  ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#b8c4d6'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(0, -14, 10, 13, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  circle(3, -30, 8); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#9aa8bc'; ctx.beginPath(); ctx.ellipse(-4, -14, 7, 9, cheer ? -1 : 0.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f4b03a'; ctx.beginPath(); ctx.moveTo(9, -31); ctx.lineTo(17, -28); ctx.lineTo(9, -26); ctx.closePath(); ctx.fill();
  ctx.fillStyle = C.ink; circle(5, -32, 1.6); ctx.fill();
  // a little bandana
  ctx.fillStyle = '#ff5f5f'; ctx.beginPath(); ctx.ellipse(1, -37, 8, 3.5, -0.1, Math.PI, 0); ctx.fill();
  ctx.restore();
}
function plankduelParrot(x, y, s, a, b, face, flap) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s * face, s);
  ctx.fillStyle = b; ctx.beginPath(); ctx.moveTo(-3, -4); ctx.lineTo(-10, 14); ctx.lineTo(2, 2); ctx.fill();
  ctx.fillStyle = a; ctx.beginPath(); ctx.ellipse(0, -14, 9, 13, 0, 0, Math.PI * 2); ctx.fill();
  circle(3, -29, 8); ctx.fill();
  const w = flap ? Math.sin(G.clock * 18) * 0.7 - 0.6 : 0.2;
  ctx.fillStyle = b; ctx.save(); ctx.translate(-4, -18); ctx.rotate(w); ctx.beginPath(); ctx.ellipse(-2, 6, 5, 10, 0.2, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  ctx.fillStyle = '#fff'; circle(6, -31, 3.2); ctx.fill(); ctx.fillStyle = C.ink; circle(7, -31, 1.6); ctx.fill();
  ctx.fillStyle = '#f2e3b0'; ctx.beginPath(); ctx.moveTo(10, -30); ctx.quadraticCurveTo(17, -28, 11, -21); ctx.lineTo(9, -25); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#e09a2a'; ctx.fillRect(-4, -2, 3, 4); ctx.fillRect(1, -2, 3, 4);
  ctx.restore();
}
// Captain Polly the parrot, the referee, on her post over the barrel (with a little captain's hat)
function plankduelPolly(st) {
  const v = st.vis, x = PLANKDUEL.X0, y = 186, flap = v && v.polly > 0 ? 1 : 0, t = v ? v.t : 0;
  ctx.fillStyle = PLANKDUEL_COL.woodDk; ctx.fillRect(x - 4, y + 2, 8, 120);
  ctx.fillStyle = PLANKDUEL_COL.wood; ctx.fillRect(x - 22, y, 44, 7);
  ctx.save(); ctx.translate(x, y + Math.sin(t * 2.2) * 1.2);
  plankduelParrot(0, 0, 1.25, '#ff4f5f', '#3d8bff', 1, flap);
  // her captain's hat
  ctx.fillStyle = PLANKDUEL_COL.hat; ctx.beginPath(); ctx.moveTo(-8, -44); ctx.quadraticCurveTo(4, -60, 18, -44); ctx.quadraticCurveTo(5, -40, -8, -44); ctx.fill();
  ctx.fillStyle = C.gold; plankduelStar(5, -48, 3.5);
  ctx.restore();
  if (v && v.pollySay) {
    const s = v.pollySay, a = clamp(Math.min(s.t / 0.12, (1.6 - s.t) / 0.3), 0, 1);
    ctx.globalAlpha = a;
    ctx.font = '700 15px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w = ctx.measureText(s.text).width + 18, bx = x + 26, by = y - 78;
    ctx.fillStyle = '#fffaf0'; ctx.strokeStyle = '#c23a4a'; ctx.lineWidth = 2; rr(bx, by, w, 26, 10); ctx.fill(); ctx.stroke();
    text(s.text, bx + w / 2, by + 13.5, 15, C.ink, 'center', 'body');
    ctx.globalAlpha = 1;
  }
}
function plankduelPlank(st) {
  const P = PLANKDUEL, K = PLANKDUEL_COL, E = st.E || 300, x0 = P.X0 - E - 14, x1 = P.X0 + E + 14, th = 14;
  // the rock and the barrel under the middle
  ctx.fillStyle = K.rockDk; ctx.beginPath(); ctx.ellipse(P.X0, P.SEA + 6, 92, 26, 0, Math.PI, 0); ctx.fill();
  ctx.fillStyle = K.rock; ctx.beginPath(); ctx.ellipse(P.X0 - 8, P.SEA + 2, 74, 22, 0, Math.PI, 0); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.ellipse(P.X0 - 26, P.SEA - 10, 26, 7, -0.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#5fbf6a'; ctx.beginPath(); ctx.ellipse(P.X0 + 30, P.SEA - 12, 16, 5, 0.3, 0, Math.PI * 2); ctx.fill();
  const by = P.PY + th, bh = P.SEA - 12 - by;
  ctx.fillStyle = K.woodDk; rr(P.X0 - 26, by, 52, bh, 10); ctx.fill();
  ctx.fillStyle = K.wood; rr(P.X0 - 22, by + 2, 44, bh - 4, 9); ctx.fill();
  ctx.fillStyle = '#5a5a6a'; ctx.fillRect(P.X0 - 24, by + 8, 48, 4); ctx.fillRect(P.X0 - 24, by + bh - 12, 48, 4);
  // posts out in the water (not under the rocking plank)
  if (st.twist !== 'rock') for (const s of [-1, 1]) {
    const px = P.X0 + s * Math.min(E - 70, 150);
    ctx.fillStyle = K.woodDk; ctx.fillRect(px - 7, P.PY + th, 14, P.SEA - P.PY);
    ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(px - 5, P.PY + th, 3, P.SEA - P.PY);
    ctx.fillStyle = '#6a9a7a'; ctx.fillRect(px - 7, P.SEA - 10, 14, 6);
  }
  // the plank itself (tilted round the barrel on the rocking plank)
  ctx.save(); ctx.translate(P.X0, P.PY); ctx.rotate(st.tilt || 0);
  const wet = st.twist === 'wet';
  ctx.fillStyle = 'rgba(28,26,54,0.18)'; rr(x0 - P.X0 + 4, 4, x1 - x0, th, 5); ctx.fill();
  ctx.fillStyle = K.woodDk; rr(x0 - P.X0, 0, x1 - x0, th, 5); ctx.fill();
  ctx.fillStyle = wet ? '#c99c74' : K.wood; rr(x0 - P.X0 + 1, 0, x1 - x0 - 2, th - 4, 4); ctx.fill();
  ctx.fillStyle = wet ? 'rgba(220,245,255,0.55)' : 'rgba(255,240,210,0.35)'; ctx.fillRect(x0 - P.X0 + 6, 2, x1 - x0 - 12, 2);
  // board joints and nails, and a step mark every 30 px
  ctx.fillStyle = K.woodDk;
  for (let x = Math.ceil((x0 - P.X0 + 20) / 90) * 90; x < x1 - P.X0 - 20; x += 90) { ctx.fillRect(x - 1, 0, 2, th - 4); ctx.fillStyle = '#e8d9b0'; circle(x - 5, 5, 1.4); ctx.fill(); circle(x + 5, 5, 1.4); ctx.fill(); ctx.fillStyle = K.woodDk; }
  // the ends: painted stripes so you can see how close the edge is
  for (const s of [-1, 1]) {
    const ex = s * (E + 14);
    ctx.fillStyle = '#fbf3e0';
    for (let i = 0; i < 3; i++) ctx.fillRect(ex - s * (6 + i * 9) - 2, 0, 4, th - 4);
    ctx.fillStyle = PCOL[s < 0 ? 0 : 1]; ctx.fillRect(ex - s * 34 - 2, 0, 4, th - 4);
  }
  if (wet) for (let i = 0; i < 9; i++) { const x = -E + (i + 0.5) * (2 * E / 9); ctx.fillStyle = 'rgba(200,240,255,0.65)'; ctx.beginPath(); ctx.ellipse(x, 4, 10, 2, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
  // breeze flags on the barrel post: they fly the way the next gust will blow
  if (st.gust) {
    const g = st.gust, dir = g.dir, stiff = g.on ? 1 : g.warn ? 0.6 + 0.4 * Math.sin(G.clock * 20) : 0.2;
    const fx = P.X0, fy = P.PY + 26;
    for (const s of [-1, 1]) {
      const px = fx + s * 20;
      ctx.fillStyle = K.woodDk; ctx.fillRect(px - 1.5, fy - 2, 3, 16);
    }
    ctx.fillStyle = g.on ? C.gold : '#ff7f6a';
    const wv = Math.sin(G.clock * 14) * 3 * stiff;
    ctx.beginPath(); ctx.moveTo(fx, fy); ctx.quadraticCurveTo(fx + dir * 18 * stiff, fy + 2 + wv, fx + dir * (8 + 26 * stiff), fy + 10 - 8 * stiff); ctx.lineTo(fx, fy + 10); ctx.closePath(); ctx.fill();
  }
}
// the lagoon in front: waves, fish, bubbles, the sandy bottom, the duck float
function plankduelLagoon(st) {
  const K = PLANKDUEL_COL, P = PLANKDUEL, v = st.vis, t = v ? v.t : 0;
  const g = ctx.createLinearGradient(0, P.SEA, 0, H);
  g.addColorStop(0, K.seaMid); g.addColorStop(0.5, K.seaNear); g.addColorStop(1, K.deep);
  ctx.fillStyle = g; ctx.fillRect(0, P.SEA, W, H - P.SEA);
  // light rays under the water
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  for (let i = 0; i < 6; i++) { const x = i * 180 + Math.sin(t * 0.4 + i) * 30; ctx.beginPath(); ctx.moveTo(x, P.SEA); ctx.lineTo(x + 60, P.SEA); ctx.lineTo(x + 20, H); ctx.lineTo(x - 50, H); ctx.closePath(); ctx.fill(); }
  // the sandy bottom with shells, starfish and seaweed
  ctx.fillStyle = '#e8c97f'; ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(0, 518);
  for (let x = 0; x <= W; x += 40) ctx.lineTo(x, 516 + Math.sin(x * 0.02) * 6);
  ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
  for (let i = 0; i < 7; i++) {
    const x = 70 + i * 140, y = 512, sw = Math.sin(t * 1.6 + i) * 6;
    ctx.strokeStyle = i % 2 ? '#3fae6a' : '#2f8f5a'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, y + 6); ctx.quadraticCurveTo(x + sw, y - 16, x - sw * 0.5, y - 34); ctx.stroke();
  }
  ctx.lineCap = 'butt';
  ctx.fillStyle = '#ff8a6a'; ctx.save(); ctx.translate(380, 524); ctx.rotate(0.3); plankduelStar(0, 0, 9); ctx.restore();
  ctx.fillStyle = '#ffb3c8'; ctx.save(); ctx.translate(710, 527); plankduelStar(0, 0, 7); ctx.restore();
  // fish
  if (v) for (const f of v.swim) plankduelFish(f.x, f.y + Math.sin(t * 2 + f.x * 0.01) * 4, f.s, f.v > 0 ? 1 : -1, ['#ffb03a', '#ff7fa8', '#7fe0ff'][f.c]);
  if (v) for (const b of v.bub) { ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.2; circle(b.x + Math.sin(t * 3 + b.y * 0.05) * 3, b.y, b.s); ctx.stroke(); }
  // the surface: a wavy bright line
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.beginPath(); ctx.moveTo(0, P.SEA);
  for (let x = 0; x <= W; x += 16) ctx.lineTo(x, P.SEA - 1 + Math.sin(x * 0.045 + t * 2.4) * 2.5);
  ctx.lineTo(W, P.SEA + 4); for (let x = W; x >= 0; x -= 16) ctx.lineTo(x, P.SEA + 3 + Math.sin(x * 0.045 + t * 2.4) * 2.5);
  ctx.closePath(); ctx.fill();
  // splash rings
  if (v) for (const r of v.ring) { ctx.strokeStyle = 'rgba(255,255,255,' + (0.8 * (1 - r.t / 1.4)).toFixed(2) + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(r.x, P.SEA + 2, 20 + r.t * 70, 5 + r.t * 10, 0, 0, Math.PI * 2); ctx.stroke(); }
  // the duck float, bobbing (unless someone is sitting in it)
  const inFloat = st.d && st.d.some(D => D.fall && D.fall.splashed);
  if (!inFloat) plankduelDuck(70 + Math.sin(t * 0.5) * 16, P.SEA + Math.sin(t * 2.2) * 2, 1);
}
function plankduelFish(x, y, s, face, col) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s * face, s);
  ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(0, 0, 14, 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-11, 0); ctx.lineTo(-22, -8); ctx.lineTo(-22, 8); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(2, -3, 7, 2.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff'; circle(7, -2, 3); ctx.fill(); ctx.fillStyle = C.ink; circle(8, -2, 1.5); ctx.fill();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(9, 2, 2.2, 0.1, Math.PI - 0.6); ctx.stroke();
  ctx.restore();
}
function plankduelDuck(x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = '#ffd34d'; ctx.strokeStyle = '#d9a32a'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(0, 2, 34, 11, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#2aa3c4'; ctx.beginPath(); ctx.ellipse(0, 0, 18, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffd34d'; circle(30, -12, 10); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ff9a3a'; ctx.beginPath(); ctx.moveTo(38, -13); ctx.lineTo(48, -10); ctx.lineTo(38, -7); ctx.closePath(); ctx.fill();
  ctx.fillStyle = C.ink; circle(33, -15, 1.8); ctx.fill();
  ctx.restore();
}
function plankduelDrawWorld() {
  const st = G.mst; if (!st.vis) return;
  plankduelSky(st);
  plankduelSea(st);
  plankduelShip(st, 0); plankduelShip(st, 1);
  plankduelPolly(st);
  plankduelPlank(st);
  plankduelLagoon(st);
}
// a duellist with a pirate hat and a foam sword. o: { x, fy (feet), s, face, crouch (0..1), sa (sword angle), mood,
// lean, rot, dizzy, glow (charging), gold }
function plankduelDrawHero(k, o) {
  const col = PCOL[k], dk = PDARK[k], K = PLANKDUEL_COL, s = o.s || 1.55, cr = o.crouch || 0;
  ctx.save(); ctx.translate(o.x, o.fy);
  if (o.shadow) { ctx.fillStyle = 'rgba(28,26,54,0.22)'; ctx.beginPath(); ctx.ellipse(0, 0, 16 * s * 0.75, 3, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.translate(0, -(o.lift || 0));
  ctx.rotate(o.rot || 0);
  ctx.scale(s * o.face, s);
  if (o.sq) ctx.scale(1 + o.sq * 0.25, 1 - o.sq * 0.22);
  ctx.rotate(o.lean || 0);
  ctx.lineCap = 'round';
  const bodyTop = -32 + cr * 11, bodyH = 26 - cr * 5;
  // back arm (holds nothing; waves while teetering)
  ctx.strokeStyle = dk; ctx.lineWidth = 3.5;
  const wav = o.windmill ? Math.sin(o.windmill) * 1.2 : 0;
  ctx.beginPath(); ctx.moveTo(-7, bodyTop + 12); ctx.lineTo(-14 + Math.cos(wav) * 2, bodyTop + 18 - Math.sin(wav) * 14 - (o.windmill ? 10 : 0)); ctx.stroke();
  // feet
  ctx.fillStyle = dk;
  if (o.tuck) { circle(-5, -6, 3.6); ctx.fill(); circle(5, -6, 3.6); ctx.fill(); }
  else {
    if (cr > 0) { ctx.strokeStyle = dk; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(-5, bodyTop + bodyH - 2); ctx.lineTo(-11, -7); ctx.lineTo(-9, -3); ctx.moveTo(5, bodyTop + bodyH - 2); ctx.lineTo(11, -7); ctx.lineTo(9, -3); ctx.stroke(); }
    ctx.beginPath(); ctx.ellipse(-6 - cr * 4, -3, 5, 3.2, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(6 + cr * 4, -3, 5, 3.2, 0, 0, Math.PI * 2); ctx.fill();
  }
  // Bo's ears poke out under the hat
  if (k === 1) { ctx.fillStyle = col; ctx.strokeStyle = dk; ctx.lineWidth = 2; for (const ex of [-9, 9]) { circle(ex, bodyTop + 3, 4.6); ctx.fill(); ctx.stroke(); } }
  // body
  ctx.fillStyle = col; ctx.strokeStyle = dk; ctx.lineWidth = 2.4;
  rr(-11, bodyTop, 22, bodyH, 8); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.22)'; rr(-8, bodyTop + 3, 8, 9, 4); ctx.fill();
  // a pirate sash
  ctx.fillStyle = k ? '#ffd34d' : '#3fbf8f'; ctx.beginPath(); ctx.moveTo(-11, bodyTop + bodyH - 9); ctx.lineTo(11, bodyTop + bodyH - 12); ctx.lineTo(11, bodyTop + bodyH - 8); ctx.lineTo(-11, bodyTop + bodyH - 5); ctx.closePath(); ctx.fill();
  // face
  const ey = bodyTop + 11, mood = o.mood || 'happy';
  if (o.dizzy) {
    ctx.strokeStyle = C.ink; ctx.lineWidth = 1.6;
    for (const ex of [-3, 6]) { ctx.beginPath(); ctx.moveTo(ex - 2.4, ey - 2.4); ctx.lineTo(ex + 2.4, ey + 2.4); ctx.moveTo(ex + 2.4, ey - 2.4); ctx.lineTo(ex - 2.4, ey + 2.4); ctx.stroke(); }
    ctx.fillStyle = 'rgba(90,30,40,0.85)'; ctx.beginPath(); ctx.ellipse(1.5, ey + 6, 2.2, 2.6, 0, 0, Math.PI * 2); ctx.fill();
  } else if (mood === 'joy') {
    ctx.strokeStyle = C.ink; ctx.lineWidth = 1.8;
    for (const ex of [-3, 6]) { ctx.beginPath(); ctx.arc(ex, ey + 1, 2.6, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
    ctx.fillStyle = 'rgba(90,30,40,0.85)'; ctx.beginPath(); ctx.arc(1.5, ey + 5, 3.6, 0, Math.PI); ctx.fill();
  } else {
    for (const ex of [-3, 6]) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(ex, ey, 3, 3.6, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = C.ink; circle(ex + 1.2, ey + 0.4, 1.6); ctx.fill(); }
    if (mood === 'wow') { ctx.fillStyle = 'rgba(90,30,40,0.85)'; ctx.beginPath(); ctx.ellipse(1.5, ey + 6, 2.4, 3, 0, 0, Math.PI * 2); ctx.fill(); }
    else if (mood === 'grit') { ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-1, ey + 6); ctx.lineTo(4, ey + 6); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-6, ey - 5); ctx.lineTo(-1, ey - 4); ctx.moveTo(3, ey - 4); ctx.lineTo(8, ey - 5); ctx.stroke(); }
    else { ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(1.5, ey + 4, 2.8, 0.2, Math.PI - 0.2); ctx.stroke(); }
  }
  ctx.fillStyle = 'rgba(255,120,140,0.45)'; circle(-6, ey + 5, 1.9); ctx.fill(); circle(9, ey + 5, 1.9); ctx.fill();
  // the pirate hat (a tricorn with a gold star), Pip's sprout pokes out of the top
  const hy = bodyTop + 1;
  if (k === 0) { ctx.strokeStyle = '#3f8f5c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, hy - 8); ctx.lineTo(1, hy - 14); ctx.stroke(); ctx.fillStyle = '#5cc27f'; ctx.beginPath(); ctx.ellipse(5, hy - 15, 5, 2.5, -0.5, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = K.hat; ctx.strokeStyle = K.hatDk; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-15, hy); ctx.quadraticCurveTo(-10, hy - 15, 0, hy - 12); ctx.quadraticCurveTo(10, hy - 15, 15, hy); ctx.quadraticCurveTo(0, hy - 4, -15, hy); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = o.gold ? C.gold : col; ctx.fillRect(-12, hy - 4, 24, 2.5);
  ctx.fillStyle = C.gold; plankduelStar(0, hy - 8, 3.4);
  // the foam sword in the front hand
  const sa = o.sa == null ? -1.2 : o.sa, shX = 6, shY = bodyTop + 12;
  const hx = shX + Math.cos(sa * 0.5) * 7, hyy = shY + Math.sin(sa * 0.5) * 7;
  ctx.strokeStyle = dk; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(shX - 2, shY); ctx.lineTo(hx, hyy); ctx.stroke();
  ctx.save(); ctx.translate(hx, hyy); ctx.rotate(sa);
  if (o.glow) { ctx.fillStyle = 'rgba(255,230,120,' + (0.25 + 0.35 * o.glow).toFixed(2) + ')'; rr(0, -9, 40, 18, 9); ctx.fill(); }
  ctx.fillStyle = '#5a3a1e'; rr(-5, -2, 7, 4, 2); ctx.fill();
  ctx.fillStyle = C.gold; rr(1, -6, 3, 12, 1.5); ctx.fill();
  ctx.fillStyle = k ? '#7fb8ff' : '#ffa25a'; ctx.strokeStyle = dk; ctx.lineWidth = 1.5;
  rr(4, -3.2, 30, 6.4, 3.2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillRect(7, -2, 22, 1.6);
  ctx.restore();
  ctx.lineCap = 'butt';
  ctx.restore();
}
// where a duellist is drawn: feet x, feet y (on the plank, up in a hop, or falling into the water)
function plankduelHeroPos(st, D) {
  const P = PLANKDUEL;
  if (D.fall) {
    const f = D.fall, end = plankduelEnd(st, D.k), ey = plankduelPlankY(st, end);
    if (!f.splashed) {
      const k = f.t / 0.32, x = f.x0 + f.dir * (10 + 36 * k);
      return { x, y: ey + (P.SEA + 6 - ey) * k * k - 30 * k * (1 - k) * 4, rot: f.dir * k * 2.4 };
    }
    // bobbing in the duck float
    const k = clamp((f.t - 0.32) / 0.5, 0, 1);
    return { x: end + f.dir * 34, y: P.SEA + 10 - k * 4 + Math.sin(st.vis.t * 3) * 2, rot: 0, float: k };
  }
  return { x: D.x, y: plankduelPlankY(st, D.x) - D.y, rot: (st.tilt || 0) * 0.6 };
}
// the marks over a duellist: the guard bracket, the wind-up telegraph and the swoosh of a strike
function plankduelDrawMarks(st, D, q) {
  const k = D.k, sw = D.sw, hiY = 74, loY = 30;
  // the guard: a bright bracket in front at the guard's height (none when open)
  const g = plankduelGuard(D);
  if (g && !D.fall) {
    const gy = q.y - (g === 'hi' ? hiY : loY), gx = q.x + D.face * 34, hh = g === 'hi' ? 26 : 22;
    ctx.globalAlpha = Math.min(1, 0.55 + D.flash * 2);
    ctx.lineCap = 'round';
    const b0 = D.face > 0 ? -0.95 : Math.PI - 0.95;
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.ellipse(gx - D.face * 10, gy, 12, hh, 0, b0, b0 + 1.9); ctx.stroke();
    ctx.strokeStyle = D.flash > 0 ? '#ffffff' : PCOL[k]; ctx.lineWidth = 4;
    ctx.stroke();
    ctx.lineCap = 'butt'; ctx.globalAlpha = 1;
  }
  // the wind-up telegraph: a glowing arc where the swing will land, filling up, and ▲ or ▼ over the head
  if (sw && (sw.state === 'wind' || sw.state === 'charge' || sw.state === 'lunge') && !D.fall) {
    const prog = sw.state === 'wind' ? clamp(sw.t / sw.wind, 0, 1) : 1, ty = q.y - (sw.h === 'hi' ? hiY : loY), cx = q.x + D.face * 20;
    const col = sw.state === 'wind' ? '#fff3a0' : C.gold;
    const a0 = D.face > 0 ? -0.75 : Math.PI - 0.75, a1 = D.face > 0 ? 0.75 : Math.PI + 0.75;
    ctx.globalAlpha = 0.22; ctx.strokeStyle = col; ctx.lineWidth = 8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(cx, ty, 58, a0, a1); ctx.stroke();
    ctx.globalAlpha = 0.8; ctx.lineWidth = 4;
    const mid = D.face > 0 ? 0 : Math.PI, half = 0.75 * prog;
    ctx.beginPath(); ctx.arc(cx, ty, 58, mid - half, mid + half); ctx.stroke();
    ctx.lineCap = 'butt';
    const bx = q.x, by = q.y - 126 - (D.air ? 0 : 0);
    ctx.globalAlpha = 0.6 + 0.4 * prog;
    ctx.fillStyle = 'rgba(28,26,54,0.85)'; circle(bx, by, 15); ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 2.5; circle(bx, by, 15); ctx.stroke();
    text(sw.h === 'hi' ? '▲' : '▼', bx, by + 1, 17, col, 'center', 'body');
    ctx.globalAlpha = 1;
  }
  // the swoosh of a strike
  if (D.swoosh > 0 && !D.fall) {
    const a = D.swoosh / 0.16, sy = q.y - (D.swooshH === 'hi' ? hiY : loY);
    ctx.strokeStyle = 'rgba(255,255,255,' + (0.9 * a).toFixed(2) + ')'; ctx.lineWidth = 8 * a + 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(q.x + D.face * 22, sy, 60, D.face > 0 ? -0.6 : Math.PI - 0.6, D.face > 0 ? 0.6 : Math.PI + 0.6); ctx.stroke();
    ctx.lineCap = 'butt';
  }
}
function plankduelDrawDuellist(st, D) {
  const P = PLANKDUEL, q = plankduelHeroPos(st, D), k = D.k, sw = D.sw;
  const crouch = (!D.air && !D.fall && D.stance === 'lo') || (sw && sw.h === 'lo' && sw.state !== 'rec') ? 1 : 0;
  if (q.float != null) {
    // in the duck float: the hero sits in the ring, laughing
    plankduelDrawHero(k, { x: q.x, fy: q.y - 6, s: 1.6, face: -D.fall.dir, crouch: 1, sa: -1.6 + Math.sin(st.vis.t * 4) * 0.4, mood: 'joy' });
    plankduelDuck(q.x, q.y + 2, 1.05);
    return;
  }
  const mood = D.fall ? 'wow' : D.teeter > 0 ? 'wow' : D.stun > 0 ? 'grit' : sw && sw.state !== 'rec' ? 'grit' : D.cheer > 0 ? 'joy' : 'happy';
  let lean = 0;
  if (sw && sw.state === 'wind') lean = -0.12; else if (sw && sw.state === 'charge') lean = -0.22 + Math.sin(st.vis.t * 30) * 0.03;
  else if (sw && sw.state === 'lunge') lean = 0.3; else if (D.stun > 0) lean = -0.2; else if (D.teeter > 0) lean = -0.35 + Math.sin(D.wob) * 0.18;
  else if (D.rattle > 0) lean = Math.sin(D.wob * 3) * 0.1;
  const glow = sw && sw.state === 'charge' ? clamp(sw.ct / P.chargeT, 0, 1) : 0;
  plankduelDrawHero(k, { x: q.x, fy: q.y, s: 1.8, face: D.face, crouch, sa: D.sa, mood, lean, rot: q.rot || 0, dizzy: D.stun > 0.1, glow,
    gold: D.gold > 0, sq: D.sq, tuck: D.air && D.y > 20, shadow: !D.fall, windmill: D.teeter > 0 ? D.wob : 0 });
  plankduelDrawMarks(st, D, q);
  if (glow >= 1) { ctx.fillStyle = C.gold; plankduelStar(q.x - D.face * 36 + Math.sin(st.vis.t * 20) * 3, q.y - 100, 7); }
  // a wobble after a block: little stars
  if (D.rattle > 0) for (let i = 0; i < 3; i++) { const a = st.vis.t * 9 + i * 2.1; ctx.fillStyle = '#fff3a0'; plankduelStar(q.x + Math.cos(a) * 20, q.y - 100 + Math.sin(a) * 5, 4); }
}
function plankduelDrawTop() {
  const st = G.mst, m = G.match; if (!st.d || !st.vis) return;
  const big = plankduelBig();
  // the duellists (the one in front of the other doesn't matter much: they never overlap)
  for (const D of st.d) plankduelDrawDuellist(st, D);
  // a friendly fish jumps out by the splash
  const f = st.vis.fish;
  if (f && f.t < 1.4) {
    const k = f.t / 1.4, x = f.x + f.dir * k * 70, y = PLANKDUEL.SEA - Math.sin(k * Math.PI) * 90;
    ctx.save(); ctx.translate(x, y); ctx.rotate(-f.dir * (k - 0.5) * 2); plankduelFish(0, 0, 1.4, f.dir, '#ffb03a'); ctx.restore();
  }
  // little effects
  for (const q of st.vis.fx) {
    const a = clamp(q.life / q.max, 0, 1); ctx.globalAlpha = a; ctx.fillStyle = q.col;
    if (q.kind === 'spark') plankduelStar(q.x, q.y, q.size * (0.8 + 0.7 * a));
    else { circle(q.x, q.y, q.size * (0.5 + 0.5 * a)); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
  // pops over the heads (kept below the match pill and apart from each other)
  const popTop = (G.matchHudBox ? G.matchHudBox.y1 : 50) + 40;
  const ys = [];
  for (const D of st.d) if (D.popT < 1.1 && D.pop) {
    const q = plankduelHeroPos(st, D), kk = D.popT / 1.1, fs = D.popBig ? (big ? 30 : 24) : (big ? 24 : 18);
    ctx.font = fs + 'px "Lilita One", "Arial Rounded MT Bold", sans-serif';
    const w = ctx.measureText(D.pop).width * 1.1 + 8;
    let x = clamp(q.x, w / 2 + 6, W - w / 2 - 6), y = Math.max(popTop, q.y - (big ? 158 : 150) - 26 * kk);
    for (const o of ys) if (Math.abs(o.x - x) < (w + o.w) / 2 && Math.abs(o.y - y) < fs) y = o.y - fs - 4;
    ys.push({ x, y, w });
    ctx.globalAlpha = 1 - kk * kk;
    bigText(D.pop, x, y, fs, D.popCol, 1 + 0.25 * Math.max(0, 1 - kk * 5));
    ctx.globalAlpha = 1;
  }
  // name tags through the intro card, "Round N" and 3-2-1
  const tagA = G.introT > 0 ? 1 - clamp(G.introT / 0.5, 0, 1) : m && (m.phase === 'ready' || m.phase === 'count') ? 1 : 0;
  if (tagA > 0) for (const D of st.d) {
    const q = plankduelHeroPos(st, D), cpu = plankduelCpu(D.k), hw = cpu ? 30 : 18, x = q.x, y = q.y - 118;
    ctx.globalAlpha = tagA; ctx.fillStyle = PCOL[D.k]; rr(x - hw, y - 11, hw * 2, 18, 9); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - 4, y + 7); ctx.lineTo(x + 4, y + 7); ctx.lineTo(x, y + 12); ctx.fill();
    text(cpu ? NAMES[D.k] + ' · CPU' : NAMES[D.k], x, y - 1.5, 12, '#fff', 'center', 'body'); ctx.globalAlpha = 1;
  }
}

/* ---------- HUD ---------- */
// each player's own keys (none for the computer)
function plankduelKeys(id) {
  let k = 'kb'; try { k = actKey(id); } catch (e) { k = 'kb'; }
  if (k === 'pad') return { step: 'stick ◀ ▶', lo: 'stick ▼', swing: glyph('act'), hop: glyph('a'), back: id ? 'stick ▶' : 'stick ◀', fwd: id ? '◀' : '▶', backA: id ? '▶' : '◀' };
  if (k === 'touch') return { step: '◀ ▶', lo: '▼', swing: 'swing', hop: '▲', back: id ? '▶' : '◀', fwd: id ? '◀' : '▶', backA: id ? '▶' : '◀' };
  const solo = typeof cpuSolo === 'function' && cpuSolo();
  if (solo) return { step: 'A D or ← →', lo: 'S or ↓', swing: 'F or /', hop: 'W or ↑', back: id ? 'D or →' : 'A or ←', inward: id ? 'A or ←' : 'D or →', fwd: id ? '◀' : '▶', backA: id ? '▶' : '◀' };
  return id === 0 ? { step: 'A D', lo: 'S', swing: 'F', hop: 'W', back: 'A', inward: 'D', fwd: '▶', backA: '◀' }
    : { step: '← →', lo: '↓', swing: '/', hop: '↑', back: '→', inward: '←', fwd: '◀', backA: '▶' };
}
// the key that steps toward the middle (out of a teeter)
function plankduelInwardKey(id) {
  const kk = plankduelKeys(id);
  if (kk.inward) return kk.inward;
  return id ? '◀' : '▶';
}
function plankduelChip(label, x, y, big, col, gold) {
  const fs = big ? 18 : 13, h = big ? 30 : 22;
  ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
  const w = ctx.measureText(label).width + (big ? 26 : 20), cx = clamp(x, w / 2 + 6, W - w / 2 - 6), cy = clamp(y, h / 2 + 4, H - h / 2 - 4);
  ctx.fillStyle = 'rgba(28,26,54,0.88)'; rr(cx - w / 2, cy - h / 2, w, h, h / 2); ctx.fill();
  ctx.strokeStyle = col; ctx.lineWidth = 2; rr(cx - w / 2, cy - h / 2, w, h, h / 2); ctx.stroke();
  text(label, cx, cy + 0.5, fs, gold ? C.gold : C.paper, 'center', 'body');
}
// a tiny sword icon for the guard (up = high, down = low)
function plankduelGuardIcon(x, y, s, g, col) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.globalAlpha = g ? 1 : 0.35;
  ctx.rotate(g === 'lo' ? 0.9 : -0.9);
  ctx.fillStyle = col; rr(-2, -14, 5, 20, 2.5); ctx.fill();
  ctx.fillStyle = C.gold; ctx.fillRect(-5, 5, 11, 3);
  ctx.fillStyle = '#5a3a1e'; ctx.fillRect(-1, 8, 3, 6);
  ctx.restore(); ctx.globalAlpha = 1;
}
function plankduelHud() {
  const st = G.mst, m = G.match; if (!st.d || !m) return;
  const big = plankduelBig(), tw = PLANKDUEL_TW[st.twist], sz = big ? 1.4 : 1;
  // bottom corners: each duellist's guard, how much plank is behind them, and bonks
  for (const D of st.d) {
    const left = D.k === 0, pw = 212 * sz, ph = 42 * sz, y = H - 8 - ph, x = left ? 10 : W - 10 - pw;
    ctx.fillStyle = 'rgba(28,26,54,0.84)'; rr(x, y, pw, ph, ph / 2); ctx.fill();
    if (D.gold) { ctx.strokeStyle = C.gold; ctx.lineWidth = 2.5; rr(x, y, pw, ph, ph / 2); ctx.stroke(); }
    const nx = left ? x + 14 * sz : x + pw - 14 * sz, cy = y + ph / 2;
    text(NAMES[D.k], nx, cy + 0.5, 17 * sz, PCOL[D.k], left ? 'left' : 'right');
    const g = plankduelGuard(D), gx = left ? x + 56 * sz : x + pw - 56 * sz;
    plankduelGuardIcon(gx, cy + 1, sz, g, PCOL[D.k]);
    const lab = D.fall ? 'Splash!' : D.teeter > 0 ? 'Whoa!' : D.sw && D.sw.state === 'charge' ? 'Charging' : D.air ? 'Hop!' : g === 'lo' ? 'Low' : g === 'hi' ? 'High' : 'Open';
    text(lab, left ? gx + 14 * sz : gx - 14 * sz, cy + 0.5, 13 * sz, g ? C.paper : '#ffe6a8', left ? 'left' : 'right', 'body');
    // plank left behind me: a little bar that empties toward the end
    const bx = left ? x + 116 * sz : x + 22 * sz, bw = 72 * sz, room = clamp(plankduelRoom(st, D) / (st.E - PLANKDUEL.start), 0, 1);
    ctx.fillStyle = 'rgba(255,255,255,0.14)'; rr(bx, cy - 5 * sz, bw, 10 * sz, 5 * sz); ctx.fill();
    ctx.fillStyle = room < 0.3 ? '#ff9a7a' : (D.gold ? C.gold : '#e2ad75');
    if (room > 0) { const w = Math.max(10 * sz, bw * room); if (left) rr(bx + bw - w, cy - 5 * sz, w, 10 * sz, 5 * sz); else rr(bx, cy - 5 * sz, w, 10 * sz, 5 * sz); ctx.fill(); }
    ctx.fillStyle = '#7fd0ff'; if (left) ctx.fillRect(bx - 3 * sz, cy - 6 * sz, 2 * sz, 12 * sz); else ctx.fillRect(bx + bw + 1 * sz, cy - 6 * sz, 2 * sz, 12 * sz);
  }
  // the twist, top left under the level pill (not in the plain round)
  if (st.twist !== 'plain') {
    const fs = big ? 20 : 13, h = big ? 36 : 26, y0 = 46;
    let lab = tw.name;
    if (st.gust) lab += st.gust.on ? (st.gust.dir > 0 ? ':  Gust ▶▶' : ':  Gust ◀◀') : st.gust.warn ? (st.gust.dir > 0 ? ':  Gust coming ▶' : ':  Gust coming ◀') : '';
    if (st.twist === 'rock') lab += Math.abs(st.tilt) < 1.5 * PLANKDUEL_D ? '' : st.tilt > 0 ? ':  downhill ▶' : ':  downhill ◀';
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w = ctx.measureText(lab).width + (big ? 36 : 28); pill(14, y0, w, h); text(lab, 14 + (big ? 18 : 14), y0 + h / 2 + 0.5, fs, C.gold, 'left', 'body');
  }
  if (m.phase === 'live') {
    // Polly's call for a gold duellist (2+ rounds behind): the height of the swing coming at them
    for (const D of st.d) {
      const O = st.d[1 - D.k], os = O.sw;
      if (D.gold < 2 || !os || D.fall || !(os.state === 'wind' || os.state === 'charge' || os.state === 'lunge')) continue;
      const q = plankduelHeroPos(st, D), y = q.y - (big ? 132 : 126);
      plankduelChip(os.h === 'hi' ? 'Polly: ▲ High!' : 'Polly: ▼ Low!', q.x, y, big, C.gold, true);
    }
    // hint chips for people (rounds 1-2 and gold help; never for the computer)
    for (const D of st.d) {
      if (!D.hint || plankduelCpu(D.k)) continue;
      const kk = plankduelKeys(D.k), q = plankduelHeroPos(st, D), y = PLANKDUEL.PY + (big ? 34 : 28);
      let lab = '';
      if (D.hint === 'back') lab = plankduelInwardKey(D.k) + '  step back!';
      else if (D.hint === 'lo') lab = 'Hold ' + kk.lo + ': block low!';
      else if (D.hint === 'hi') lab = 'Let go of ' + kk.lo + ': block high!';
      else if (D.hint === 'swing') lab = kk.swing === 'swing' ? 'Tap swing!  (hold ▼ too = low)' : kk.swing + ' swing!  (' + kk.lo + ' + ' + kk.swing + ' = low)';
      else if (D.hint === 'step') lab = kk.fwd + ' step closer';
      plankduelChip(lab, q.x, y, big, PCOL[D.k], D.hint === 'back' || D.hint === 'lo' || D.hint === 'hi');
    }
  }
  if (m.phase === 'ready' || m.phase === 'count') {
    // the round card: this round's plank, any gold help announced and (before rounds 1 and 2) each person's keys in
    // their own device's words (never the computer's). It sits just above the bottom panels.
    const lines = [];
    for (const D of st.d) if (D.gold) lines.push([D.gold >= 2 ? 'Gold boots and Polly\'s call for ' + NAMES[D.k] + '!' : 'Gold boots for ' + NAMES[D.k] + ': bonks push you less!', C.gold]);
    if (m.round <= 2) for (const D of st.d) if (!plankduelCpu(D.k)) lines.push([NAMES[D.k] + ':  ' + plankduelKeyLine(D.k), PCOL[D.k] === C.pip ? '#ffb8a6' : '#b8d0ff']);
    const nf = big ? 30 : 26, hf = big ? 19 : 14, lh = big ? 26 : 20, ch = (big ? 78 : 60) + lines.length * lh;
    const cy = H - 8 - 42 * sz - 8 - ch;
    ctx.font = hf + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    let w = Math.max(big ? 380 : 320, ctx.measureText(tw.hint).width + 48);
    ctx.font = '700 ' + hf + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    for (const l of lines) w = Math.max(w, ctx.measureText(l[0]).width + 48);
    w = Math.min(W - 20, w);
    const a = m.phase === 'ready' ? clamp(m.t / 0.25, 0, 1) : 1, cx = W / 2;
    ctx.globalAlpha = a; ctx.fillStyle = 'rgba(28,26,54,0.88)'; rr(cx - w / 2, cy, w, ch, 16); ctx.fill();
    if (st.d.some(D => D.gold)) { ctx.strokeStyle = C.gold; ctx.lineWidth = 2; rr(cx - w / 2, cy, w, ch, 16); ctx.stroke(); }
    text(tw.name, cx, cy + (big ? 25 : 21), nf, C.gold, 'center'); text(tw.hint, cx, cy + (big ? 57 : 46), hf, C.paper, 'center', 'body');
    lines.forEach((l, i) => text(l[0], cx, cy + (big ? 57 : 46) + (i + 1) * lh, hf, l[1], 'center', 'body'));
    ctx.globalAlpha = 1;
  }
}
// one line of keys for the round card, in this player's own device's words
function plankduelKeyLine(id) {
  let k = 'kb'; try { k = actKey(id); } catch (e) { k = 'kb'; }
  const kk = plankduelKeys(id);
  if (k === 'touch') return '◀ ▶ step · round button swings · hold ▼ low · ▲ hop';
  return kk.step + ' step · ' + kk.swing + ' swing · hold ' + kk.lo + ' low · ' + kk.hop + ' hop';
}

/* ---------- sounds ---------- */
Sfx.extra.plankduelWind = function (p) { this.tone(300 * p, 0.12, 'sine', 0.025, 520 * p); };
Sfx.extra.plankduelSwish = function (p) { this.tone(900 * p, 0.12, 'sine', 0.02, 300 * p); };
Sfx.extra.plankduelClack = function (p) { this.tone(520 * p, 0.05, 'square', 0.04, 380 * p); this.tone(260 * p, 0.08, 'triangle', 0.05, 180 * p, 0.02); };
Sfx.extra.plankduelBonk = function (p) { this.tone(220 * p, 0.14, 'sine', 0.08, 120 * p); this.tone(660 * p, 0.06, 'triangle', 0.03, 440 * p, 0.02); };
Sfx.extra.plankduelThwack = function (p) { this.tone(180 * p, 0.22, 'triangle', 0.08, 80 * p); this.tone(880 * p, 0.1, 'square', 0.03, 300 * p, 0.03); };
Sfx.extra.plankduelClang = function (p) { [1318, 1760].forEach((f, i) => this.tone(f * p, 0.28, 'triangle', 0.04, f * p * 0.97, i * 0.02)); };
Sfx.extra.plankduelHop = function (p) { [660, 990].forEach((f, i) => this.tone(f * p, 0.08, 'triangle', 0.04, null, i * 0.06)); };
Sfx.extra.plankduelHopUp = function (p) { this.tone(340 * p, 0.1, 'square', 0.025, 600 * p); };
Sfx.extra.plankduelLand = function (p) { this.tone(150 * p, 0.05, 'triangle', 0.04, 100 * p); };
Sfx.extra.plankduelCharge = function (p) { this.tone(260 * p, 0.45, 'sawtooth', 0.018, 700 * p); };
Sfx.extra.plankduelLunge = function (p) { this.tone(500 * p, 0.16, 'square', 0.03, 1000 * p); };
Sfx.extra.plankduelWobble = function (p) { [440, 392, 440, 392].forEach((f, i) => this.tone(f * p, 0.08, 'triangle', 0.035, null, i * 0.08)); };
Sfx.extra.plankduelWhoa = function (p) { this.tone(600 * p, 0.35, 'triangle', 0.04, 220 * p); };
Sfx.extra.plankduelPhew = function (p) { this.tone(500 * p, 0.12, 'sine', 0.04, 760 * p); this.tone(760 * p, 0.1, 'sine', 0.03, null, 0.1); };
Sfx.extra.plankduelSplash = function (p) { this.tone(900 * p, 0.3, 'sine', 0.04, 160 * p); this.tone(300 * p, 0.35, 'triangle', 0.04, 100 * p, 0.04); this.tone(1400 * p, 0.12, 'sine', 0.02, 600 * p, 0.1); };
Sfx.extra.plankduelSquawk = function () { this.tone(1200, 0.08, 'square', 0.025, 900); this.tone(1400, 0.1, 'square', 0.025, 1000, 0.1); };
Sfx.extra.plankduelGust = function () { this.tone(200, 0.6, 'sine', 0.03, 420); };
Sfx.extra.plankduelGustWarn = function () { [880, 660].forEach((f, i) => this.tone(f, 0.08, 'triangle', 0.03, null, i * 0.09)); };
Sfx.extra.plankduelGold = function () { this.tone(784, 0.1, 'triangle', 0.05); this.tone(1046, 0.12, 'triangle', 0.045, null, 0.08); this.tone(1318, 0.16, 'triangle', 0.04, null, 0.16); };
