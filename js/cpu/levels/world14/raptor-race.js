/* Pip & Bo - Computer partner brain for 14-4 Raptor Race (mode 'raptor'). */
'use strict';

(() => {
  /* The computer is the other racer. It rides like a person with the keys: ▶ to run fast, ◀ to slow down, jump to hop,
     ▼ to duck, and the action to dash with a speed egg. A few times a second (its reaction time) it looks at what is on
     the screen ahead of its raptor and makes a plan:
       hops       logs, rocks, compies, puddles and treetop gaps: where to take off so the hop clears it (it works the hop
                  out from its speed and any low ceiling, like a person who has hopped a few logs); a floating egg it
                  wants is a hop target too
       ducks      low branches, vines and roots: hold ▼ from just before until just after
       forks      which path to take (Hard and most Normal: the quickest one counting mud, eggs and its own egg; Easy
                  mostly keeps to the trail or picks one at random), then jumps or holds ▼ by the sign
       timing     trike herds and geysers: it works out whether it would arrive while the way is blocked and runs slow
                  (or fast) to slip past (Hard always, Normal often, Easy hardly ever: it just gets "Boop!"ed and waits)
       the dash   Hard dashes at once unless it is saving the egg for mud just ahead or the way is about to be blocked,
                  and always frees its paws before the next egg; Normal after a short wait; Easy whenever it remembers
     What it reads: the course's obstacles, gaps, eggs, mud, forks, and the herds' and geysers' fixed timings, only as far
     ahead as the screen shows. It never reads the other player's keys. Each obstacle gets one look: Easy misses about a
     quarter of them and its take-off spot is off by up to about 50 px; Hard sees them all and is off by a few px. Easy
     holds ▶ less than half the time, Normal about three quarters, Hard all the time. */
  const SK = {
    easy: { react: 0.42, see: 0.7, err: 52, duckErr: 44, fastP: 0.4, egg: 0.5, dashMin: 2, dashMax: 5.5, fork: 0, time: 0.2, wander: 0.06 },
    normal: { react: 0.24, see: 0.9, err: 24, duckErr: 18, fastP: 0.74, egg: 0.85, dashMin: 0.5, dashMax: 2.2, fork: 0.65, time: 0.6, wander: 0.02 },
    hard: { react: 0.1, see: 1, err: 5, duckErr: 3, fastP: 1, egg: 1, dashMin: 0, dashMax: 0.25, fork: 1, time: 1, wander: 0 },
  };
  const skOf = s => (s <= 0.4 ? SK.easy : s < 0.9 ? SK.normal : SK.hard);
  const T = () => MODES.raptor.test;
  const JUMPS = { log: 1, rock: 1, compy: 1, puddle: 1 }, DUCKS = { branch: 1, vine: 1, root: 1 };

  // a full hop from the ground on this lane at x: when the feet first get above height oh, when they drop back under it,
  // and when they land (seconds), with the low ceiling there (the branch walk over the bridge, the bridge over the creek)
  function hopTimes(c, lane, x, oh) {
    const P = T().RAPTOR, ceil = T().ceilAt(c, lane, x), maxH = ceil < -1e8 ? 1e9 : P.laneY[lane] - (ceil + P.bodyH);
    let h = 0, vy = P.jumpV, t = 0, up = null, down = null;
    const dt = 1 / 120;
    while (t < 1.4) {
      t += dt; vy -= P.g * dt; h += vy * dt;
      if (h > maxH) { h = maxH; if (vy > 0) vy = 0; }
      if (up == null && h >= oh) up = t;
      if (up != null && down == null && h < oh && vy < 0) down = t;
      if (h <= 0 && vy < 0) break;
    }
    return { up: up == null ? t : up, down: down == null ? t : down, land: t, maxH: Math.min(maxH, P.jumpV * P.jumpV / (2 * P.g)) };
  }
  // the foot x to take off from to clear [a, b] (the span the feet must stay above oh) at speed v; null if it can't be done
  function takeoffFor(c, lane, a, b, oh, v) {
    const ht = hopTimes(c, lane, (a + b) / 2, oh);
    if (ht.maxH < oh) return null;
    const lo = b - v * ht.down, hi = a - v * ht.up; // take off after lo and before hi
    return { x: (lo + hi) / 2, lo, hi };
  }
  // a rough time cost of a fork's path for a raptor running at v holding `hand` eggs (lower is better)
  function laneCost(st, f, lane, v, hand, sk, id) {
    const P = T().RAPTOR, c = st.c, L = f.x1 - f.x0;
    let t = L / (v * (lane === 0 ? P.highMul : 1));
    const dashV = P.dashAdd * P.dashT / v, ev = [];
    for (const e of c.eggs) if (e.lane === lane && !e.got[id] && e.x > f.x0 && e.x < f.x1) ev.push({ x: e.x, k: 'egg' });
    for (const m of c.muds) if (m.lane === lane && m.x0 > f.x0 && m.x0 < f.x1) ev.push({ x: m.x0, k: 'mud', len: m.x1 - m.x0 });
    ev.sort((a, b) => a.x - b.x);
    for (const e of ev) {
      if (e.k === 'egg') { if (hand) { t -= dashV; } else hand = 1; } // (holding one: dash it first, then pick this one up)
      else {
        const slow = 1 / (v * P.mudMul) - 1 / v;
        if (hand) { const cover = (v + P.dashAdd) * P.dashT; t += Math.max(0, e.len - cover) * slow; t -= dashV * 0.4; hand = 0; }
        else t += e.len * slow;
      }
    }
    if (hand) t -= dashV * 0.5; // an egg carried out of the fork is still worth something
    // a little risk for the jumpy paths (a slow rider stumbles more)
    const nHops = (lane === 0 ? c.gaps.filter(g => g.x > f.x0 && g.x < f.x1).length * 1.4 : 0) + c.obs.filter(o => o.lane === lane && o.x > f.x0 && o.x < f.x1 && (JUMPS[o.k] || DUCKS[o.k])).length;
    t += nHops * (1 - sk.see * 0.95) * 0.7;
    return t;
  }
  // will the way at [a, b] be blocked (a trike on the trail, a geyser blowing) while we cross it, arriving in tA seconds?
  function blockedAt(st, thing, tA, tC) {
    const t0 = st.t + tA;
    for (let s = 0; s <= tC; s += 0.04) {
      if (thing.kind === 'herd' ? T().herdBlocks(thing.o, t0 + s) : T().geyserState(thing.o, t0 + s).s === 'blow') return true;
    }
    return false;
  }

  function plan(S, me, st, sk, info) {
    const P = T().RAPTOR, c = st.c, hard = info.skill >= 0.9;
    const v = Math.max(150, me.v), look = Math.min(640, st.cam.x + W - me.x + 20);
    const seen = o => { if (!S.dec.has(o)) S.dec.set(o, { see: Math.random() < sk.see, err: (Math.random() * 2 - 1) * sk.err, derr: (Math.random() * 2 - 1) * sk.duckErr, want: Math.random() < sk.egg, smart: Math.random() < sk.time }); return S.dec.get(o); };
    // which lane we'll be on (a fork pick ahead counts)
    let lane = me.trans ? me.trans.lane : me.lane;
    // a. the fork ahead: pick a path once
    S.fork = null;
    for (const f of c.forks) {
      if (f.x0 < me.x - 10 || f.x0 > me.x + look + 200) continue;
      if (S.picks[f.i] == null) {
        if (Math.random() < sk.fork) {
          const hand = me.egg ? 1 : 0, cs = [0, 1, 2].map(l => laneCost(st, f, l, hard ? P.fast : v, hand, sk, me.id) + (hard ? 0 : (Math.random() - 0.5) * 0.5));
          S.picks[f.i] = cs.indexOf(Math.min(...cs));
        } else S.picks[f.i] = Math.random() < 0.5 ? 1 : Math.random() < 0.5 ? 0 : 2;
      }
      S.fork = { f, lane: S.picks[f.i] };
      break;
    }
    // b. the next thing to hop over or duck under on our lane
    S.jump = null; S.duck = null;
    const ferns = c.obs.filter(o => o.k === 'fern' && o.lane === lane && o.x > me.x);
    for (const o of c.obs) {
      if (o.lane !== lane || o.x + o.w < me.x - 20) continue;
      if (o.x > me.x + look) break;
      const d = seen(o);
      if (JUMPS[o.k]) {
        if (o.gone || o.hit[me.id] || o.passed[me.id] || !d.see) continue;
        if (o.k === 'compy' && o.hop > 0) continue;
        // a fern before it will boing us over it
        if (ferns.some(fn => fn.x < o.x && o.x - fn.x < 420 && !c.obs.some(b => b.k === 'branch' && Math.abs(b.x - fn.x) < 30))) continue;
        let a = o.x - 22, b = o.x + o.w + 16, oh = o.h + 2;
        if (o.k === 'compy') { const tA = Math.max(0, (o.x - me.x) / v), cx = T().compyX(o, st.t + tA); a = cx - 13 - 22; b = cx + 13 + 16; }
        if (o.k === 'puddle') { a = o.x + 4; b = o.x + o.w - 4; oh = 1; }
        if (S.jump == null || a < S.jump.a) { const to = takeoffFor(c, lane, a, b, oh, v); if (to) S.jump = { a, x: to.x + d.err * (o.k === 'puddle' ? 0.4 : 1), lo: to.lo, k: o.k, o }; }
      } else if (DUCKS[o.k]) {
        if (o.hit[me.id] || o.passed[me.id] || !d.see) continue;
        if (S.duck == null) S.duck = { a: o.x - 30 - v * 0.12 + d.derr, b: o.x + o.w + 20, o };
      }
    }
    // treetop gaps
    if (lane === 0) for (const g of c.gaps) {
      if (g.x + g.w < me.x || g.x > me.x + look) continue;
      const d = seen(g); if (!d.see) continue;
      const ht = hopTimes(c, 0, g.x, 1), mid = g.x + g.w / 2, x0 = mid - v * ht.land / 2 + 6;
      if (S.jump == null || g.x - 4 < S.jump.a) S.jump = { a: g.x - 4, x: Math.min(x0 + d.err * 0.7, g.x + 4), lo: g.x + g.w + 6 - v * ht.land, k: 'gap', o: g };
      break;
    }
    // a floating egg we want (and our paws are free): hop for it
    if (!me.egg) for (const e of c.eggs) {
      if (e.got[me.id] || e.lane !== lane || e.h < 40 || e.x < me.x + 20 || e.x > me.x + look) continue;
      const d = seen(e); if (!d.want) continue;
      const ht = hopTimes(c, lane, e.x, 1), apex = ht.land / 2, x0 = e.x - 6 - v * apex * 0.8;
      if (S.jump == null || x0 < S.jump.x - 40) S.jump = { a: e.x - 30, x: x0 + d.err * 0.5, lo: x0 - 40, k: 'egg', o: e };
      break;
    }
    // c. herds and geysers ahead on our lane: will we arrive while it's blocked? then run slow (or fast) to slip past
    S.speed = null;
    const things = [];
    for (const h of c.herds) if (lane === 1 && h.x1 > me.x - 10 && h.x0 < me.x + look) things.push({ kind: 'herd', o: h, a: h.x0 - 24, b: h.x1 + 20 });
    for (const o of c.obs) if (o.k === 'geyser' && o.lane === lane && o.x + o.w > me.x - 10 && o.x < me.x + look) things.push({ kind: 'geyser', o, a: o.x - 22, b: o.x + o.w + 16 });
    for (const th of things) {
      const d = seen(th.o); if (!d.smart) continue;
      const options = [[P.fast, 'fast'], [P.cruise, 'cruise'], [P.slow, 'slow']];
      if (me.egg && hard) options.unshift([P.fast + P.dashAdd * 0.85, 'dash']);
      let pickOpt = null;
      for (const [sp, name] of options) {
        const tA = Math.max(0, (th.a - me.x) / sp), tC = (th.b - Math.max(me.x, th.a)) / sp;
        if (!blockedAt(st, th, tA, tC)) { pickOpt = name; break; }
      }
      S.speed = pickOpt || 'slow';
      S.speedFor = th;
      break;
    }
    // d. speed: fast part of the time (Easy and Normal re-roll now and then)
    if (S.fastRoll === undefined || Math.random() < 0.12) S.fastRoll = Math.random() < sk.fastP;
  }

  // should we dash now?
  function wantDash(S, me, st, sk, info) {
    const P = T().RAPTOR, c = st.c, hard = info.skill >= 0.9, v = Math.max(150, me.v);
    if (me.stumble > 0 || me.trans || me.dashT > 0) return false;
    const lane = me.lane, reach = (v + P.dashAdd) * P.dashT;
    // never right into a herd or a geyser that will block us
    if (S.speed === 'slow' || S.speed === 'cruise') return false;
    if (S.zoomAt == null) S.zoomAt = me.holdT + sk.dashMin + Math.random() * (sk.dashMax - sk.dashMin);
    if (!hard) return me.holdT >= S.zoomAt;
    // Hard: free the paws before the next egg; use it in mud; save it for mud just ahead; otherwise go at once
    const nextEgg = c.eggs.find(e => !e.got[me.id] && e.lane === lane && e.x > me.x + 10 && e.x < me.x + reach + 120);
    if (nextEgg) return true;
    const mud = T().mudAt(c, lane, me.x + 30);
    if (mud && mud.x1 - me.x > 120) return true;
    const mudAhead = c.muds.find(m => m.lane === lane && m.x0 > me.x + 30 && m.x0 < me.x + 700);
    const forkAhead = S.fork && S.fork.lane === 2 && S.fork.f.x0 > me.x && S.fork.f.x0 - me.x < 600;
    if ((mudAhead || forkAhead) && me.holdT < 6) return false;
    if (c.len - me.x < reach + 40) return true;
    return me.holdT >= S.zoomAt;
  }

  cpuBrain('raptor', {
    // raptors run on by themselves: a person who walked away still finishes the match, so the computer keeps racing
    noIdleStop: true,
    bubbleHidden: true,
    bubblePos(p) { const st = G.mst, r = st && st.riders && st.riders[p.id]; return r && st.cam ? { x: r.x - st.cam.x, y: r.y - (r.egg ? 104 : 84) } : null; },
    reset(S) { S.dec = new Map(); S.picks = {}; },
    think(S, p, o, dt, info) {
      const out = {}, st = info.mst;
      if (!st || !st.riders || !st.c || !st.cam || !MODES.raptor) return out;
      if (!S.dec) { S.dec = new Map(); S.picks = {}; }
      const me = st.riders[p.id], op = st.riders[o.id], m = G.match;
      if (info.frozen) {
        if (m && m.phase === 'end' && m.end && !S.saidEnd) { S.saidEnd = true; if (m.end.winner === p.id) cpuSay(p, 'Rawr! I win!'); else if (m.end.winner === o.id) cpuSay(p, 'Good race!'); }
        if (!S.wasFrozen) { S.dec = new Map(); S.picks = {}; } // a new course next round
        S.wasFrozen = true; S.lastJ = false; return out;
      }
      if (S.wasFrozen) { S.wasFrozen = false; S.saidEnd = false; S.planT = 0; S.pauseT = 0.04 + Math.random() * 0.14 + (1 - info.skill) * 0.3; S.zoomAt = null; S.jHold = false; if (cpuChance(2, 1)) cpuSay(p, 'Go go go!'); }
      if ((S.pauseT = (S.pauseT || 0) - dt) > 0) return out;
      if (me.finT != null) return out;
      const sk = skOf(info.skill), P = T().RAPTOR, c = st.c;
      // things a person would say (1-player mode only; cpuSay checks)
      if (me.stumble > 0.3 && me.stumbleKind !== 'whoosh') cpuSay(p, me.stumbleKind === 'peep' ? 'Peep! Sorry!' : me.stumbleKind === 'boop' ? 'Boop! Big trike!' : 'Oof!');
      if (me.tail > P.tailShow && !S.saidTail) { S.saidTail = true; cpuSay(p, 'Zoomies!'); }
      if (me.tail <= 0) S.saidTail = false;
      if (me.x - op.x > 360 && cpuChance(0.12, dt)) cpuSay(p, 'Catch me!');
      // replan a few times a second (reaction time)
      S.planT = (S.planT || 0) - dt;
      if (S.planT <= 0) { S.planT = sk.react * (0.7 + Math.random() * 0.6); plan(S, me, st, sk, info); }
      const grounded = !me.air && !me.trans;
      // ducking
      let duck = false;
      if (S.duck && me.x + 22 >= S.duck.a && me.x - 16 <= S.duck.b && grounded) duck = true;
      if (S.duck && me.x - 16 > S.duck.b) S.duck = null;
      // the fork: jump by the sign for the Treetops, hold ▼ for the Creek
      let jumpNow = false;
      if (S.fork && me.lane === 1 && !me.trans) {
        const f = S.fork.f, z0 = f.x0 - P.forkZone;
        if (me.x >= z0 + 40 && me.x < f.x0) {
          if (S.fork.lane === 2) duck = true;
          else if (S.fork.lane === 0 && me.pick !== 0 && grounded) jumpNow = true;
        }
      }
      if (me.pick != null && S.fork && S.saidPick !== S.fork.f.i) { S.saidPick = S.fork.f.i; cpuSay(p, me.pick === 0 ? 'Treetops!' : 'Creek time!'); }
      // hops
      if (S.jump && grounded && !duck) {
        const j = S.jump;
        if (me.x >= j.x && me.x < j.a + 10) jumpNow = true;
        else if (me.x >= j.a + 10) S.jump = null;
      }
      // pressing jump like a person: a fresh press, then hold it for a full hop
      if (jumpNow && grounded && !S.lastJ) { out.jump = true; S.jHold = true; S.jump = null; }
      else if (S.jHold && (me.air || me.trans) && me.vy < 0) out.jump = true;
      else S.jHold = false;
      if (jumpNow && S.lastJ) out.jump = false;
      S.lastJ = !!out.jump;
      if (duck) out.down = true;
      // speed
      if (S.speed === 'slow') out.left = true;
      else if (S.speed === 'fast' || S.speed === 'dash') out.right = true;
      else if (S.speed === 'cruise') { /* neither */ }
      else if (S.fastRoll && me.stumble <= 0) out.right = true;
      // Easy daydreams now and then: lets go of ▶ for a moment
      if ((S.wanderT || 0) > 0) { S.wanderT -= dt; out.right = false; }
      else if (cpuChance(sk.wander, dt)) S.wanderT = 0.6 + Math.random() * 1.2;
      // the dash
      if (me.egg) {
        if (wantDash(S, me, st, sk, info) || (S.speed === 'dash' && grounded)) { out.act = 'tap'; S.zoomAt = null; cpuSay(p, 'Egg dash!'); }
      } else S.zoomAt = null;
      if (me.air && me.vy < -900 && !S.saidBoing) { S.saidBoing = true; cpuSay(p, 'Wheee!'); }
      if (!me.air) S.saidBoing = false;
      return out;
    },
  });
})();
