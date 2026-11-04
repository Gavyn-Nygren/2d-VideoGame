/* Pip & Bo - Computer partner: monster feeding. */
'use strict';

(() => {
  /* Each room says who throws (st.thrower) and who catches, so there is no job to pick: the computer does its own, with
     what a person sees (the food flying, the dotted aim line and the X, the craving bubble, the grumpy meters).
     Chef: waits for food (pot) or grabs the craved food from its crate (room 2). It throws when the catcher has room in
       the basket (food in the air counts), aimed at where the catcher stands: it holds the button and lets go when the
       meter reaches the charge that drops the food on the catcher's basket (the aim line a person watches). A catcher
       out of reach gets "Come closer!", a full basket that stays full gets "Feed Munch!".
     Catcher: runs under food in the air (where it will come down at basket height), tosses the basket into a mouth in
       reach, carries a full basket into toss reach, and otherwise waits on a spot near the hungriest mouth that the chef
       can reach. Peek-a-Boo: it gathers a few before tossing, since every emptied basket sends Munch to another hole.
     Both: a short human pause before reacting (longer at lower skill, and a less exact aim for an easy chef); a small
     shuffle now and then while waiting so the level's 10 s "nobody plays" pause is only ever set off by the person;
     and when the person stops playing for that long, the computer stops too. */
  const SK = { easy: { react: 0.45, aim: 16 }, normal: { react: 0.25, aim: 7 }, hard: { react: 0.12, aim: 2 } };
  const skOf = s => (s <= 0.4 ? SK.easy : s < 0.9 ? SK.normal : SK.hard);
  const K = () => MONSTER;
  const rimAt = feet => feet - PH - MONSTER.rimUp;   // basket rim height for a catcher standing at this feet height

  // where a flying food comes down through height y: { x, t } or null. A copy of it flies with the level's own step
  // (walls, planks, its one bounce). clean: only a flight that touches nothing on the way counts (the chef's aim)
  function crossAt(f, y, clean) {
    const g = { x: f.x, y: f.y, vx: f.vx, vy: f.vy, gate: f.gate, side: f.side, noTiles: f.noTiles, spin: 0 }, Km = K();
    let bounced = !!f.bounced;
    for (let k = 1; k < 520; k++) {
      const py = g.y, r = MODES.monster.foodStep(g, DT);
      if (g.vy > 0 && py < y && g.y >= y) return { x: g.x, t: k * DT };
      if (r === 'out' || (clean && r)) return null;
      if (r === 'ground') { if (bounced) return null; bounced = true; g.vy = -Math.abs(g.vy) * Km.bounceY; g.vx *= Km.bounceX; }
    }
    return null;
  }
  // the catcher's feet height if it stands at x on the floor at or below `feet`
  function floorAt(x, feet) { return monGroundY(x, feet - 6); }
  function feetOf(p) { return p.grounded ? p.y + p.h : floorAt(cpuCx(p), p.y + p.h); }

  /* ---------- the chef's aim (the dotted aim line a person watches while charging) ----------
     samples(): where clean throws come down at basket height y, for charges 0..1 from where this chef stands (cached:
     the chef stands still while it aims). aimFor(): the charge for x, between the two samples around it. */
  function samples(st, th, y) {
    const key = Math.round(th.x) + ':' + th.face + ':' + Math.round(y) + ':' + Math.round(th.y);
    const C = G.mst._cpuAim && G.mst._cpuAim.room === G.room ? G.mst._cpuAim : (G.mst._cpuAim = { room: G.room, m: new Map() });
    let list = C.m.get(key);
    if (list) return list;
    list = [];
    for (let i = 0; i <= 40; i++) {
      const c = i / 40, v = MODES.monster.throwV(st, th, c), q = crossAt({ x: v.x, y: v.y, vx: v.vx, vy: v.vy, gate: v.gate, side: v.side }, y, true);
      if (q) list.push({ c, x: q.x });
    }
    if (C.m.size > 200) C.m.clear();
    C.m.set(key, list);
    return list;
  }
  function aimFor(st, th, x, y) {
    const list = samples(st, th, y);
    let best = null;
    for (let i = 0; i < list.length; i++) {
      const a = list[i], b = list[i + 1];
      if (b && b.c - a.c < 0.03 && (x - a.x) * (x - b.x) <= 0 && a.x !== b.x) {
        const f = (x - a.x) / (b.x - a.x);
        return { charge: a.c + (b.c - a.c) * f, x, miss: 0 };
      }
      const d = Math.abs(a.x - x);
      if (!best || d < best.miss) best = { charge: a.c, x: a.x, miss: d };
    }
    return best;
  }
  // a stand-in chef in the middle of the kitchen facing `side`, for planning spots before the real chef turns
  function ghostChef(st, th, side) {
    const k = st.kitchen;
    return { x: (k.x0 + k.x1) / 2 - th.w / 2, y: k.floor - th.h, w: th.w, h: th.h, face: side };
  }
  const sideOf = (st, x) => { const k = st.kitchen, s = Math.sign(x - (k.x0 + k.x1) / 2) || 1; return k.open.includes(s) ? s : k.open[0]; };

  /* ---------- the monsters ---------- */
  // the mouth to feed next: the grumpiest one that is awake and not full (a monster that dived keeps its old spot)
  function target(st) {
    let best = null;
    for (const m of st.monsters) if (!m.full && (!best || (m.state === 'up') > (best.state === 'up') || ((m.state === 'up') === (best.state === 'up') && m.g > best.g))) best = m;
    return best;
  }
  // where to stand to toss into this mouth: outside its body (food would bonk it), well inside toss reach, on its floor,
  // on the kitchen's side
  function feedSpot(st, m) {
    const k = st.kitchen, kc = (k.x0 + k.x1) / 2, feet = m.ay;
    if (m.kind === 'big') return { x: m.mx - m.face * 100, feet };
    let side = Math.sign(kc - m.ax) || -1, x = m.ax + side * 80;
    if (floorAt(x, feet) !== feet) { side = -side; x = m.ax + side * 80; }   // a head on a block: stay on its top
    if (floorAt(x, feet) !== feet) x = m.ax + side * 50;
    return { x, feet };
  }
  // where to wait for food: the feed spot if the chef can land food there, else the nearest place it can (on any floor)
  function catchSpot(st, m, th) {
    const f = feedSpot(st, m), key = G.room + ':' + m.i + ':' + m.ax + ':' + m.ay;
    st._cpuSpot = st._cpuSpot || {};
    if (st._cpuSpot[key]) return st._cpuSpot[key];
    const g = ghostChef(st, th, sideOf(st, f.x)), floors = [f.feet];
    for (const fl of [st.fieldY, ...st.burrows.map(b => b.y)]) if (!floors.includes(fl)) floors.push(fl);
    let best = null;
    for (const fl of floors) {
      for (const q of samples(st, g, rimAt(fl))) {
        if (floorAt(q.x, fl) !== fl) continue;
        // keep off the monster's body, and a step inside the throw range
        if (Math.abs(q.x - m.bx) < m.brx + 16) continue;
        const cost = Math.abs(q.x - f.x) + Math.abs(fl - f.feet) * 1.5;
        if (!best || cost < best.cost) best = { x: q.x, feet: fl, cost };
      }
    }
    if (best) best.x += Math.sign(f.x - best.x) * Math.min(8, Math.abs(f.x - best.x));
    return (st._cpuSpot[key] = best || f);
  }

  /* ---------- waiting: a little shuffle so only the person can set off the "nobody plays" pause ---------- */
  function fidget(S, st, p, out, info, dt) {
    const busy = out.left || out.right || out.jump || out.act || out.down;
    S.still = busy ? 0 : (S.still || 0) + dt;
    if (S.still > 5 + Math.random() * 2 && info.partnerIdle < 4) { S.still = 0; out[p.face > 0 ? 'right' : 'left'] = true; }   // one step the way it faces
  }

  /* ---------- chef ---------- */
  function chef(S, st, p, o, dt, info, out) {
    const Km = K(), sk = skOf(info.skill), c = o;
    if (st.done) return;
    // room 2: grab the craved food from its crate
    if (st.bins.length && !st.hand && !st.grabQ) {
      const bin = st.bins.find(b => b.type === st.want) || st.bins[0];
      if (cpuSeek(out, p, bin.x + T / 2, 5) || Math.abs(cpuCx(p) - bin.x - T / 2) < 10) {
        out.left = out.right = false;
        if (info.intro) return;
        S.grabT = (S.grabT || 0) + dt;
        if (S.grabT > sk.react * 0.6) { out.act = 'tap'; S.grabT = 0; }
      }
      return;
    }
    if (!st.hand) { S.ready = 0; return; }
    if (st.charging) {
      // let go when the meter reaches the planned charge (a tap is a short press)
      const want = S.want == null ? 0 : S.want;
      if (want <= 0.01 ? st.holdT >= 0.03 : st.charge + DT / Km.chargeT >= want) { out.act = false; S.want = null; }
      else out.act = true;
      return;
    }
    if (info.intro || !c.alive) return;
    // throw when the catcher has room (food on its way counts), aimed at its basket
    const flying = st.foods.filter(f => f.from === 'chef' && !f.dead).length;
    const room = Km.cap - st.basket.length - flying;
    const feet = feetOf(c), y = rimAt(feet), cx = cpuCx(c), side = sideOf(st, cx);
    // throw from the middle of the kitchen (where the catcher's waiting spot was planned from), facing the catcher's side
    const kx = (st.kitchen.x0 + st.kitchen.x1) / 2;
    if (Math.abs(cpuCx(p) - kx) > 3 || Math.abs(p.vx) > 5) { cpuSeek(out, p, kx, 2); if (out.left || out.right) return; }
    if (p.face !== side) { out[side > 0 ? 'right' : 'left'] = true; return; }
    if (room <= 0 || c.stun > 0 || info.partnerIdle > Km.afkT) { S.ready = 0; talkFull(S, st, p, c, info, dt); return; }
    // a moment's pause, like a person lining up
    S.ready = (S.ready || 0) + dt;
    if (S.ready < sk.react) return;
    const sol = aimFor(st, p, cx + (Math.random() - 0.5) * 2 * sk.aim, y);
    if (!sol) return;
    if (sol.miss > 25) {
      // out of reach: wait for the catcher to come where food can land (and say so once in a while)
      S.far = (S.far || 0) + dt;
      if (S.far > 2.5 && G.time - (S.saidFar || -99) > 6 && info.partnerIdle > 1) { cpuSay(p, 'Come closer!', 2); S.saidFar = G.time; }
      // a person who doesn't come gets food at the nearest spot after a while
      if (S.far < 5) return;
    } else S.far = 0;
    S.want = sol.charge;
    S.ready = 0;
    out.act = true;
  }
  function talkFull(S, st, p, c, info, dt) {
    const full = st.basket.length >= K().cap && info.partnerIdle > 3 && info.partnerIdle < K().afkT;
    S.fullT = full ? (S.fullT || 0) + dt : 0;
    if (S.fullT > 1.5) { const m = target(st); cpuSay(p, m && m.name !== 'Munch' ? 'Feed ' + m.name + '!' : 'Feed Munch!', 2.2); S.fullT = -6; }
  }

  /* ---------- catcher ---------- */
  // a straight walk on our own floor to x, with no wall or drop in between
  function clearWalk(p, x, feet) {
    if (!p.grounded || Math.abs(p.y + p.h - feet) > 4) return false;
    const a = Math.floor(Math.min(cpuCx(p), x) / T), b = Math.floor(Math.max(cpuCx(p), x) / T), ty = Math.round(feet / T);
    for (let tx = a; tx <= b; tx++) {
      if (monSolid(tx, ty - 1)) return false;
      const under = tile(tx, ty);
      if (under !== '#' && under !== '=') return false;
    }
    return true;
  }
  function goTo(S, p, out, x, feet) {
    if (clearWalk(p, x, feet)) { cpuSeek(out, p, x, 3); return Math.abs(cpuCx(p) - x) < 5; }
    const r = cpuNav(S, p, x, feet, { tol: 4 }) || {};
    Object.assign(out, r);
    return S.nav && S.nav.status === 'arrived';
  }
  // seconds to get under x at this floor (a walk, or the way round)
  function reachT(p, x, feet) {
    if (clearWalk(p, x, feet)) return Math.abs(x - cpuCx(p)) / PHYS.maxRun;
    return cpuNavReach(p, x, feet, {});
  }
  function catcher(S, st, p, o, dt, info, out) {
    const Km = K(), sk = skOf(info.skill);
    if (st.done) return;
    const feet = feetOf(p), basket = st.basket.length, m = target(st);
    // the foods coming our way, with where each comes down at our basket height (re-guessed a few times a second)
    S.pred = S.pred || new Map();
    const foods = [];
    for (const f of st.foods) {
      if (f.from !== 'chef' || f.dead) continue;
      // room 2: a food the monster won't eat isn't worth a basket spot
      if (st.bins.length && f.type !== 'gold' && f.type !== st.want && f.type !== f.wantAt) {
        if (G.time - (S.saidWant || -99) > 8 && info.partnerIdle < K().afkT) { cpuSay(p, 'Munch wants ' + st.want + '!', 2.2); S.saidWant = G.time; }
        continue;
      }
      let q = S.pred.get(f);
      if (!q || G.time - q.at > 0.2) {
        let c = crossAt(f, rimAt(feet)), fl = feet;
        // it comes down off our floor (a block's edge): where it reaches the floor below
        if (c && floorAt(c.x, feet) !== feet) { fl = floorAt(c.x, feet); c = fl < H ? crossAt(f, rimAt(fl)) : null; }
        q = { at: G.time, c, feet: fl, seen: q ? q.seen : G.time };
        S.pred.set(f, q);
      }
      if (q.c && G.time - q.seen >= sk.react * 0.5) foods.push({ f, x: q.c.x, t: q.c.t - (G.time - q.at), feet: q.feet });
    }
    for (const f of S.pred.keys()) if (f.dead) S.pred.delete(f);
    // toss: a mouth in reach. Peek-a-Boo waits for a fuller basket unless nothing more is coming or Munch is grumpy
    const rim = monRim(p), near = basket && st.tossCD <= 0 && p.stun <= 0 ? monNearOf(st, rim) : null;
    if (near) {
      const more = foods.length > 0 || (st.hand && st.charging);
      if (!st.order || basket >= Km.cap || !more || near.g > 65) { out.act = 'tap'; }
    }
    // catch the food that comes down first that we can still get to
    let best = null;
    if (basket < Km.cap) for (const q of foods.sort((a, b) => a.t - b.t)) {
      if (basket + foods.indexOf(q) >= Km.cap) break;
      const need = reachT(p, q.x, q.feet);
      if (need <= q.t + 0.15) { best = q; break; }
    }
    if (best) { goTo(S, p, out, best.x, best.feet); S.still = 0; return; }
    if (!m) return;
    // a full basket, or something in it and nothing coming: carry it to the mouth
    if (basket >= Km.cap || (basket && !foods.length && !(st.hand && st.charging))) {
      const sp = feedSpot(st, m);
      if (m.state === 'up') goTo(S, p, out, sp.x, sp.feet);
      return;
    }
    // wait on the spot near the hungriest mouth
    if (m.state !== 'up' && m.kind === 'head') return;   // Munch dived: wait to see where it pops up
    const sp = catchSpot(st, m, G.players[st.thrower]);
    if (goTo(S, p, out, sp.x, sp.feet)) { out.left = out.right = false; talkCatch(S, st, p, info, dt); }
  }
  // like the level's monNear: the nearest awake, hungry mouth within toss range of the rim
  function monNearOf(st, r) {
    let best = null, bd = K().tossRange;
    for (const m of st.monsters) { if (m.full || m.state !== 'up') continue; const d = Math.hypot(m.mx - r.x, m.my - r.y); if (d <= bd) { bd = d; best = m; } }
    return best;
  }
  function talkCatch(S, st, p, info, dt) {
    const waiting = st.hand && !st.charging && info.partnerIdle > 4 && info.partnerIdle < K().afkT;
    S.waitT = waiting ? (S.waitT || 0) + dt : 0;
    if (S.waitT > 1) { cpuSay(p, 'Throw it to me!', 2.2); S.waitT = -8; }
  }

  cpuBrain('monster', {
    think(S, p, o, dt, info) {
      const out = {}, st = info.mst;
      if (!st || !st.kitchen || !st.monsters) return out;
      // the person stopped playing: stop too, so the level's own pause (and its "Your turn!") kicks in
      if (info.partnerIdle > K().afkT) return out;
      if (p.id === st.thrower) chef(S, st, p, o, dt, info, out); else catcher(S, st, p, o, dt, info, out);
      if (!st.done && !info.intro) fidget(S, st, p, out, info, dt);
      return out;
    },
  });
})();
