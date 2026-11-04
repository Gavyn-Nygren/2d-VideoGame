/* Pip & Bo - Computer partner: 2-4 Crown Keep. */
'use strict';

(() => {
  /* Crown Keep is head-to-head: the computer plays against you. It sees you a moment late (longer on easy).
     - Crown on its stand: race to it (see "Getting around" for the planks).
     - Holding the crown: keep away. Every so often it picks the spot on the map that is far from you, not under you
       (where you could drop on it) and not past you, and makes for it. When you are close and above it or jumping at
       it, it runs away sideways (cornered, it dashes back past you, over you if it can). On normal and hard, if it is
       falling and you are right below, it lands on you (a stomp stuns you).
     - You hold the crown: chase. It goes to your level, then runs at you and jumps so it comes down on your head,
       steering in the air to where you will be. It doesn't jump at you while you're flashing (the crown can't be taken
       yet). Easy reacts slowly, aims worse, jumps early and stops to think now and then; hard is quick and sharp. */
  // per skill: how late it sees you (s), how far off its stomps aim (px), how often it picks a new spot to run to (s),
  // how often it stops to think (per s, for 0.3-0.8 s), and how much it just picks any spot instead of a good one
  const SK = s => ({ lag: 0.42 - 0.3 * s, aimErr: 40 * (1 - s), replan: 1.2 - 0.7 * s, dawdle: Math.max(0, 1.3 * (0.85 - s)), sloppy: 40 + 300 * (1 - s) * (1 - s) });

  // the spots it may run to while holding the crown: every tile someone can stand on
  function spots(st) {
    if (st.spots && st.spots.lv === G.levelIndex) return st.spots;
    const list = [];
    for (let ty = 1; ty < ROWS - 1; ty++) for (let tx = 1; tx < COLS - 1; tx++) {
      const below = tile(tx, ty + 1);
      if (tile(tx, ty) === '.' && tile(tx, ty - 1) === '.' && (below === '#' || below === '=')) list.push({ x: tx * T + T / 2, feet: (ty + 1) * T });
    }
    list.lv = G.levelIndex;
    return (st.spots = list);
  }
  /* Getting around. cpuNav does the walking, the hops onto the low planks and every way down. The centre plank and
     the two high planks are each a running jump across a 3-tile gap that lands on the plank's corner, which cpuNav
     doesn't count (it wants to land in the middle of a tile), so those four leaps are done here: back up a little, run
     at the edge and jump at the last moment, holding jump and the direction until it lands. */
  const LEAPS = [
    { from: 'L13', to: 'C10', edge: 270, dir: 1 }, { from: 'R13', to: 'C10', edge: 690, dir: -1 },
    { from: 'C10', to: 'L7', edge: 360, dir: -1 }, { from: 'C10', to: 'R7', edge: 600, dir: 1 },
  ];
  const LOW = { F: 1, B: 1, L13: 1, R13: 1 };
  // which part of the map a standing player (or a spot) is on
  function area(x, feet) {
    if (feet >= 470) return 'F';
    if (Math.abs(feet - 420) < 8) return 'B';
    if (Math.abs(feet - 390) < 8) return x < W / 2 ? 'L13' : 'R13';
    if (Math.abs(feet - 300) < 8) return 'C10';
    if (Math.abs(feet - 210) < 8) return x < W / 2 ? 'L7' : 'R7';
    return '?';
  }
  // the next leap on the way up from `from` to `to`: from a low plank, its leap to the centre; from the centre, the
  // leap to that high plank; from anywhere else, the leap from the nearer low plank
  function leapFor(from, to, x) {
    if (from === 'C10') return LEAPS.find(l => l.from === 'C10' && l.to === to);
    if (from === 'L13' || from === 'R13') return LEAPS.find(l => l.from === from);
    return x < W / 2 ? LEAPS[0] : LEAPS[1];
  }
  const leapStart = l => l.edge - l.dir * (70 + PW / 2); // where its centre backs up to
  // one step of going to (x, feet), anywhere on the map
  function go(st, p, x, feet, tol) {
    const out = {};
    const L = st.leap;
    if (!p.grounded) {
      if (L && L.flying) { out.left = L.l.dir < 0; out.right = L.l.dir > 0; out.jump = p.vy < 0; return out; }
      return cpuNav(st, p, x, feet, { tol });
    }
    const here = area(cpuCx(p), cpuFeet(p)), want = area(x, feet);
    if (L && L.flying) st.leap = null; // landed (on the far plank, or not)
    if (here === want || LOW[want] || here === '?') { st.leap = null; return cpuNav(st, p, x, feet, { tol }); }
    // upward: the centre plank needs a low plank first, a high plank needs the centre one
    const next = (want === 'L7' || want === 'R7') && here !== 'C10' ? 'C10' : want; // a high plank needs the centre first
    const l = leapFor(here, next, cpuCx(p));
    if (!l) return cpuNav(st, p, x, feet, { tol });
    if (l.from !== here) { st.leap = null; return cpuNav(st, p, leapStart(l), l.from === 'C10' ? 300 : 390, { tol: 6 }); }
    if (!st.leap || st.leap.l !== l) st.leap = { l, run: false, flying: false };
    const S = st.leap, lead = l.dir > 0 ? p.x + p.w : p.x;
    if (!S.run) {
      // back up to the run-up spot
      if (cpuSeek(out, p, leapStart(l), 4)) S.run = true;
      else return out;
    }
    out.left = l.dir < 0; out.right = l.dir > 0;
    if ((l.edge - lead) * l.dir <= 1) { out.jump = true; S.flying = true; }
    // overran without jumping (bumped, slowed): back up again
    if ((lead - l.edge) * l.dir > 6) S.run = false;
    return out;
  }
  // where a body falling from (y, vy) is after t seconds, and when its feet reach height y1 (or null)
  function fallTime(y, vy, y1) {
    const a = PHYS.g / 2, b = vy, c = y - y1, disc = b * b - 4 * a * c;
    if (disc < 0) return null;
    const t = (-b + Math.sqrt(disc)) / (2 * a);
    return t >= 0 ? t : null;
  }

  cpuBrain('crown', {
    reset(st) { st.held = false; st.stomp = false; st.go = -1; st.spot = null; st.replanT = 0; st.hesT = 0; st.aim = 0; st.said = -99; },
    think(st, p, o, dt, info) {
      const out = {}, c = G.crown;
      if (!c || !p.alive || info.intro) return out;
      const sk = SK(info.skill);
      // a moment to react after the intro card goes
      if (st.go < 0) st.go = G.time + sk.lag;
      if (G.time < st.go) return out;
      // the opponent as it saw them a moment ago, moved on by their speed (people judge where you're heading)
      const s = cpuLag(st, 'o', { x: cpuCx(o), feet: cpuFeet(o), vx: o.vx, vy: o.vy, g: o.grounded, alive: o.alive }, sk.lag);
      const ox = s.x + s.vx * sk.lag * 0.7, ofeet = s.feet, me = cpuCx(p), mfeet = cpuFeet(p);
      if (p.stun > 0) return out;
      // easy (and now and then normal) stops to think for a moment: real mistakes a quick player can use
      if (st.hesT > 0) { st.hesT -= dt; return out; }
      if (cpuChance(sk.dawdle, dt)) st.hesT = 0.3 + Math.random() * 0.5;
      // crown on its stand: get it
      if (c.holder === null) return go(st, p, c.x, c.y + 15, 4);
      // holding it: keep away
      if (c.holder === p.id) {
        if (!st.held && G.time - st.said > 15) { st.said = G.time; cpuSay(p, 'Catch me!'); }
        st.held = true;
        const dx = ox - me, dy = ofeet - mfeet, d = Math.hypot(dx, dy);
        if (!p.grounded && st.leap && st.leap.flying) return go(st, p, st.spot ? st.spot.x : me, st.spot ? st.spot.feet : mfeet, 10);
        // falling onto them from above: land on their head (normal and hard)
        if (info.skill > 0.5 && !p.grounded && p.vy > 0 && s.alive && dy > 10 && dy < 120 && Math.abs(dx) < 70) { cpuSeek(out, p, ox, 3); return out; }
        // they're close and above me (or jumping at me): run away sideways, the side away from them
        if (s.alive && d < 130 && (dy < -20 || !s.g)) {
          let dir = me > ox ? 1 : -1;
          // cornered: dash back past them, jumping over them if they're on the ground next to it
          if ((dir > 0 && me > W - 70) || (dir < 0 && me < 70)) { dir = -dir; if (s.g && Math.abs(dx) < 60 && p.grounded) out.jump = true; }
          if (!p.grounded && p.vy < 0) out.jump = true;
          out.left = dir < 0; out.right = dir > 0;
          st.spot = null;
          return out;
        }
        // pick a far-off spot now and then (sooner if they get near the one it's heading for)
        st.replanT -= dt;
        if (!st.spot || st.replanT <= 0 || Math.hypot(st.spot.x - ox, st.spot.feet - ofeet) < 150) {
          st.replanT = sk.replan;
          let best = null, bs = -Infinity;
          for (const q of spots(st)) {
            const away = Math.hypot(q.x - ox, (q.feet - ofeet) * 1.3), trip = Math.hypot(q.x - me, (q.feet - mfeet) * 1.5);
            // not right under them, not a long trip past them
            const under = q.feet > ofeet + 20 && Math.abs(q.x - ox) < 120 ? 200 : 0;
            const past = Math.sign(q.x - me) === Math.sign(ox - me) && Math.abs(ox - me) < Math.abs(q.x - me) && Math.abs(ofeet - mfeet) < 60 ? 150 : 0;
            const v = away - 0.45 * trip - under - past + Math.random() * sk.sloppy;
            if (v > bs) { bs = v; best = q; }
          }
          st.spot = best;
        }
        if (!st.spot) return out;
        return go(st, p, st.spot.x, st.spot.feet, 10);
      }
      st.held = false;
      // they hold it: chase and stomp
      if (!s.alive) return go(st, p, c.x, c.y + 15, 10); // (they'll be back soon)
      const dx = ox - me, dy = ofeet - mfeet;
      const safe = o.stompSafe > 0 || c.invuln > 0.15; // the crown is flashing: can't take it yet
      if (!p.grounded) {
        // a jump on the way somewhere (onto a plank, a leap): carry on with it
        if (!st.stomp) return go(st, p, ox, ofeet, 20);
        // a jump at them: steer to where they'll be when it comes down to their head height
        const t = p.vy > -200 ? fallTime(mfeet, p.vy, ofeet - PH) : null;
        const tx = t != null ? ox + s.vx * Math.min(t, 0.5) * 0.8 + st.aim : ox + st.aim;
        cpuSeek(out, p, tx, 3);
        out.jump = p.vy < 0 && (Math.abs(dx) > 30 || mfeet > ofeet - PH - 30); // hold until it's well over their head
        return out;
      }
      st.stomp = false;
      // a different level (more than a step up or down), or far away: go there
      if (Math.abs(dy) > 45 || Math.abs(dx) > 160) return go(st, p, ox, ofeet, 20);
      // close and on the same level: run at them and jump just in reach
      const reach = 55 + Math.abs(p.vx) * 0.22 - Math.sign(dx) * s.vx * 0.25 + (info.skill < 0.5 ? Math.random() * 40 : 0);
      if (safe) { cpuSteer(out, p, ox - Math.sign(dx) * 70, 8); return out; } // keep close but don't waste the jump
      cpuSteer(out, p, ox, 2);
      if (Math.abs(dx) < reach) {
        out.jump = !CPU.last[p.id].jump;
        st.stomp = out.jump;
        st.aim = (Math.random() * 2 - 1) * sk.aimErr;
      }
      return out;
    },
  });
})();
