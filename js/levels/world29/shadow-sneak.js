/* Pip & Bo - Level 29-2 Shadow Sneak (team, World 29 Ninja Dojo). */
'use strict';

/* ===== 29-2 Shadow Sneak (mode 'shadowsneak', World 29 "Ninja Dojo", team, scrolls right, Gavyn's pick) =====
   Gavyn's pick: "creep through a guarded fortress; one throws pebbles as distractions while the other slips past;
   getting spotted starts a chase."
   Side view of a fortress wall at night. The mode owns the tick, the camera and the picture (def.ownStep + ownHUD +
   noFalls); the engine grid is only spawns. World px: the courtyard is flat at S.ground, the wall walk is at S.ramp.
   Each stretch is 3 GUARD POSTS in a row. A post ends at a gatehouse: its gate is shut until the sneaker pulls the
   lever inside the arch, which also opens the tower door on the wall walk for the pebble thrower. When both are
   through, that is the checkpoint for the next post.
   THE SNEAKER (down in the courtyard): ◀ ▶ creep (slow and silent). Hold the action ('dash') to dash: fast, but every
     footstep is a noise ring and the guards who hear it come to look. ▲ hops (over crates, and over creaky boards that
     would "Creeeak!"). Standing in a HIDING SPOT (a barrel, a doorway, a hay cart, bamboo, the shade under an awning,
     a gatehouse arch; each has a little closed-eye badge) hides you by itself as long as you are not dashing.
     At the lever the action pulls it.
   THE PEBBLE THROWER (up on the wall walk, never seen by the guards): ◀ ▶ walk, ▲ ▼ slide the aim ring farther or
     nearer along the courtyard, the action ('toss') lobs a pebble at the ring. "Tik!": the nearest guard who hears it
     (and is not already checking a pebble) turns and walks over to look for a few seconds, then goes back; guard dogs
     that hear it run to it. The pouch holds 3 pebbles and fills up again by itself (one every 2.2 s).
   GUARDS: a lantern-light cone on the cobbles shows exactly how far each one sees. Stand in it, not hidden, and the
     eye over the sneaker fills (the guard stops and stares, "?"): step out or hide before it is full.
       patrol guards walk a beat;  sentries stand and stare one way;  sleeping guards see nothing until a noise close
       by wakes them for a few seconds;  dogs have a sniff circle and run to every sound;  searchlights sweep back and
       forth and can't be distracted.
     The trick is nearly always: toss a pebble so the guard walks PAST a hiding spot, then slip out behind him.
   SPOTTED (the eye fills): GONG! The post's guards get a "!" (a startled jump: longer the closer they are, longer for a
     sleeper) and run after the sneaker, who now sprints (◀ ▶; ▲ hops crates, which slow the guards down, or right over
     a guard's head; ▼ slides: a fast low whoosh under a guard's arms, chase only, short cooldown). The hiding spots
     within S.burnR of where you were seen get a wide-open red eye: they saw you there, so they don't work in this chase.
     Get into another hiding spot, or a gatehouse (always safe: back to the checkpoint, or on to the arch ahead), with the
     guards a few steps behind: they run up and look around ("?") and you must stay put for S.loseT ("Shh!"). Step out
     too soon and it is "There!" and the chase is on again; stay and they lose you ("Phew!"). The thrower helps: a
     pebble that hits a chasing guard is a soft "Bonk!" and he sees stars for a moment. If a guard reaches the sneaker
     it is a "Gotcha!": he carries them back to the post's gatehouse and puts them down (soft fail: seconds, counted).
   Jobs swap every stretch (room def `sneak`): Pip sneaks in 1 and 3, Bo in 2 and 4. 4 stretches (roomWord 'Stretch'):
     The Outer Yard (sentries and patrols), The Sleepy Barracks (sleeping guards, creaky boards, crates), The Kennel
     Court (dogs, two guards for two pebbles), The Keep (searchlights and everything else).
   GOLD HELP (announced, counted on the results card, only while both are playing):
     - spotted 2 times in one stretch: a gold moon cloud, the guards see only about half as far for the rest of that
       stretch (their cones turn gold and short);
     - stuck 45 s at one post (clock running, no chase): a gold owl for the rest of that post. Whenever the sneaker is
       hidden and waiting, it flies to the plan's pebble spot and hoots there like a free pebble (every 6 s at most).
       The thrower still has to walk through every tower door, so it never finishes a post alone.
   IDLE: 12 s with no person pressing anything: "Taking a break" and the clock stops.
   Scoring: time, times spotted, times caught. Medal: Gold <= 4:30, spotted <= 2 and never caught;
     Silver <= 7:00 and caught <= 3; else Bronze.
   Room def: { title, sneak: 0|1, posts: [{ w, items: [tokens] }] }. Tokens (x in px from the post's first gatehouse;
   keep guards between 130 and w - 100, hiding spots clear of each other):
     B<x> barrel   D<x> doorway   H<x> hay cart   M<x> bamboo   A<x>:<w> awning shade w px wide
     P<a>-<b> patrol guard walking between a and b   S<x>L / S<x>R sentry looking left / right   Z<x> sleeping guard
     G<x> guard dog   C<x> crate   K<x> creaky boards   L<a>-<b>:<secs> searchlight sweeping a..b once every secs.
   MODES.shadowsneak.plan(st) is the one place that says what to do next (prompts, HUD chips and the computer brain).
   It looks a few seconds ahead with the same guard rules the level runs (stepGuard), so it is always right about
   when a creep to the next hiding spot is safe and which pebble would make it safe. */
(() => {
  const K = NINJA, FONT = K.FONT, lerp = K.lerp, COL = K.COL, TAU = Math.PI * 2;
  const S = {
    ground: 420, ramp: 196, zoneW: 110, archA: 84, archB: 6, leverDX: 46, endDX: 250,
    creep: 100, dash: 250, run: 250, air: 175, jumpV: 430, g: 1500, crateH: 30, crateW: 18, boardW: 28,
    thrV: 215, aimMax: 300, aimV: 330, aim0: 140, flyT: 0.7, pouch: 3, refill: 2.2, throwCd: 0.3,
    cone: 190, coneGold: 105, seeT: 0.5, seeNearT: 0.16, seeNear: 70, behind: 18, unseeT: 0.5,
    hear: 280, stepHear: 130, creakHear: 170, wakeR: 120, wakeT: 4.5, react: 0.35, look: 3.6, walk: 60, goV: 92, backV: 80,
    chaseV: 228, startle: 0.5, startleNear: 0.7, skid: 0.55, groggy: 0.7, carryV: 330, dizzy: 1.5, search: 2.4, safeD: 80, safeGate: 30, catchD: 24, overY: 32,
    dogHear: 360, dogV: 210, dogBackV: 120, dogR: 62, dogSniff: 3.6, lightR: 52,
    fdt: 0.1, fN: 120, margin: 24, patience: 1.2, aimOk: 15, idleWait: 12, goldFails: 2,
    burnR: 130, loseT: 1.5, slideV: 400, slideT: 0.42, slideCd: 1.1, slideNear: 200, owlStuck: 45, owlFly: 0.9, owlCd: 6,
  };
  const SPOT_W = { B: 46, D: 54, H: 84, M: 64, A: 120 };
  const SPOT_NAME = { B: 'the barrel', D: 'the doorway', H: 'the hay', M: 'the bamboo', A: 'the shade', start: 'the gatehouse', arch: 'the gatehouse' };
  const AWAKE = { patrol: 1, pause: 1, stand: 1, react: 1, go: 1, look: 1, return: 1, wake: 1 };
  const HEARS = { patrol: 1, pause: 1, stand: 1, react: 1, go: 1, look: 1, return: 1 };
  const BUSY = { react: 1, go: 1, look: 1 };

  /* ---------- the course ---------- */
  function compile(def) {
    const c = { posts: [], endX: 0, len: 0 }, lookT = def.look || S.look;
    let x = 0;
    (def.posts || []).forEach((pd, k) => {
      const w = pd.w || 760;
      const P = { k, x0: x, gate: x + w, w, lever: x + w - S.leverDX, lo: x + 130, hi: x + w - 100, spots: [], guards: [], dogs: [], crates: [], boards: [], lights: [], open: false, openT: 0, seen: false };
      const guard = (kind, gx, o) => P.guards.push(Object.assign({ kind, x: gx, home: gx, a: gx, b: gx, face: -1, dir0: -1, state: 'stand', t: 0, tx: gx, fast: false, chasing: false, notice: 0, side: 0, look: lookT, lo: P.lo, hi: P.hi, n: k * 10 + P.guards.length }, o));
      for (const tk of pd.items || []) {
        const m = /^([A-Z])(\d+)(?:-(\d+))?([LR])?(?::([\d.]+))?$/.exec(tk); if (!m) continue;
        const t = m[1], a = x + +m[2], b = m[3] ? x + +m[3] : a;
        if (SPOT_W[t]) P.spots.push({ kind: t, x: a, w: m[5] ? +m[5] : SPOT_W[t] });
        else if (t === 'P') guard('patrol', (a + b) / 2, { a, b, face: 1, dir0: 1, state: 'patrol' });
        else if (t === 'S') guard('sentry', a, { face: m[4] === 'R' ? 1 : -1, dir0: m[4] === 'R' ? 1 : -1 });
        else if (t === 'Z') guard('sleep', a, { state: 'sleep' });
        else if (t === 'G') P.dogs.push({ x: a, home: a, state: 'sit', t: 0, tx: a, face: -1 });
        else if (t === 'C') P.crates.push({ x: a });
        else if (t === 'K') P.boards.push({ x: a, cd: 0, t: 0 });
        else if (t === 'L') P.lights.push({ a, b, period: m[5] ? +m[5] : 6, ph: P.lights.length * 1.7 });
      }
      P.spots.sort((p, q) => p.x - q.x);
      P.zones = [{ kind: 'start', x0: x, x1: x + S.zoneW }, ...P.spots.map(s => ({ kind: 'spot', spot: s, x0: s.x - s.w / 2, x1: s.x + s.w / 2 })), { kind: 'arch', x0: x + w - S.archA, x1: x + w - S.archB }];
      P.through = { kind: 'start', x0: x + w - S.archA, x1: x + w + S.zoneW };
      c.posts.push(P);
      x += w;
    });
    c.endX = x + S.endDX; c.len = x + 700;
    return c;
  }
  const zoneAt = (P, x) => {
    if (P.open && x >= P.through.x0) return P.through;
    for (const z of P.zones) if (x >= z.x0 && x <= z.x1) return z;
    return null;
  };
  const nextZone = (P, x, cur) => { for (const z of P.zones) if (z !== cur && z.x0 > (cur ? cur.x0 : x)) return z; return null; };
  const prevZone = (P, x) => { let r = null; for (const z of P.zones) if (z.x1 < x) r = z; return r; };
  const zoneName = z => (z ? SPOT_NAME[z.kind === 'spot' ? z.spot.kind : z.kind] : 'a hiding spot');
  const coneLen = st => (st.gold.cloud ? S.coneGold : S.cone);
  const lightX = (l, t) => (l.a + l.b) / 2 + (l.b - l.a) / 2 * Math.sin(t * TAU / l.period + l.ph);
  const floorAt = (P, x) => { for (const c of P.crates) if (Math.abs(x - c.x) < S.crateW + 11) return S.crateH; return 0; };

  /* ---------- guards and dogs: the rules (the level and the look-ahead both run these) ---------- */
  function stepGuard(g, dt) {
    switch (g.state) {
      case 'patrol':
        g.x += g.face * S.walk * dt;
        if (g.face > 0 ? g.x >= g.b : g.x <= g.a) { g.x = g.face > 0 ? g.b : g.a; g.state = 'pause'; g.t = 0.9; }
        break;
      case 'pause': if ((g.t -= dt) <= 0) { g.face = -g.face; g.state = 'patrol'; } break;
      case 'wake': if ((g.t -= dt) <= 0) g.state = 'sleep'; break;
      case 'react': if ((g.t -= dt) <= 0) g.state = 'go'; break;
      case 'go': {
        const v = (g.fast ? S.chaseV : S.goV) * dt;
        if (Math.abs(g.tx - g.x) <= v) { g.x = g.tx; g.state = 'look'; g.t = g.fast ? S.search : g.look; g.fast = false; }
        else { if (Math.abs(g.tx - g.x) > 30) g.face = g.tx > g.x ? 1 : -1; g.x += (g.tx > g.x ? 1 : -1) * v; }
        break;
      }
      case 'look': if ((g.t -= dt) <= 0) g.state = 'return'; break;
      case 'return': {
        const hx = g.kind === 'patrol' ? clamp(g.x, g.a, g.b) : g.home, v = S.backV * dt;
        if (Math.abs(hx - g.x) <= v) {
          g.x = hx;
          if (g.kind === 'patrol') g.state = 'patrol'; else { g.face = g.dir0; g.state = g.kind === 'sleep' ? 'sleep' : 'stand'; }
        } else { g.face = hx > g.x ? 1 : -1; g.x += g.face * v; }
        break;
      }
      case 'dizzy': if ((g.t -= dt) <= 0) g.state = g.chasing ? 'alert' : 'return'; break;
    }
  }
  function stepDog(d, dt) {
    if (d.state === 'go') {
      const v = S.dogV * dt;
      if (Math.abs(d.tx - d.x) <= v) { d.x = d.tx; d.state = 'sniff'; d.t = S.dogSniff; } else { d.face = d.tx > d.x ? 1 : -1; d.x += d.face * v; }
    } else if (d.state === 'sniff' || d.state === 'bark') { if ((d.t -= dt) <= 0) d.state = 'return'; }
    else if (d.state === 'return') {
      const v = S.dogBackV * dt;
      if (Math.abs(d.home - d.x) <= v) { d.x = d.home; d.state = 'sit'; d.face = -1; } else { d.face = d.home > d.x ? 1 : -1; d.x += d.face * v; }
    }
  }
  function goLook(g, X) {
    g.tx = clamp(X, g.lo, g.hi);
    if (g.state !== 'go' && g.state !== 'react') { g.state = 'react'; g.t = S.react; }
    g.fast = false;
    if (Math.abs(g.tx - g.x) > 30) g.face = g.tx > g.x ? 1 : -1; // (a tik right at his feet: he keeps looking the way he was)
  }
  // a noise at X that carries r px. A pebble (all = false): the nearest guard not already checking one goes to look.
  // Footsteps and creaks (all = true): everyone who hears comes. Sleepers close by wake up; dogs run to it.
  function hearAt(P, gs, ds, X, r, all) {
    let best = null, bd = 1e9, busy = null, bbd = 1e9;
    for (const g of gs) {
      const d = Math.abs(g.x - X);
      if (g.state === 'sleep' || g.state === 'wake') { if (d < (all ? r : S.wakeR)) { g.state = 'wake'; g.t = S.wakeT; g.face = X >= g.x ? 1 : -1; } continue; }
      if (!HEARS[g.state] || d > r) continue;
      if (all) { goLook(g, X); best = g; continue; }
      if (BUSY[g.state]) { if (d < bbd) { bbd = d; busy = g; } } else if (d < bd) { bd = d; best = g; }
    }
    if (!all && (best || busy)) goLook(best || busy, X);
    for (const d of ds) if (d.state !== 'bark' && Math.abs(d.x - X) < (all ? r + 110 : S.dogHear)) { d.state = 'go'; d.tx = clamp(X, P.lo - 20, P.hi + 20); d.face = d.tx >= d.x ? 1 : -1; }
    return best || busy;
  }

  /* ---------- looking ahead ---------- */
  // the next S.fN * S.fdt seconds of this post: for each step, the stretches of courtyard that are watched (pairs lo, hi)
  function forecast(st, events) {
    const P = st.P, gs = P.guards.map(g => Object.assign({}, g)), ds = P.dogs.map(d => Object.assign({}, d));
    const ev = (events || []).concat(st.pebbles.map(p => ({ t: (1 - p.u) * S.flyT, x: p.tx })), st.owl && !st.owl.hooted ? [{ t: (1 - st.owl.u) * S.owlFly, x: st.owl.tx }] : []).sort((a, b) => a.t - b.t);
    const cone = coneLen(st), m = S.margin, frames = [];
    let ei = 0;
    for (let k = 0; k < S.fN; k++) {
      const t = k * S.fdt, fr = [];
      while (ei < ev.length && ev[ei].t <= t) { hearAt(P, gs, ds, ev[ei].x, S.hear, false); ei++; }
      for (const g of gs) {
        if (AWAKE[g.state]) { if (g.face > 0) fr.push(g.x - S.behind - m / 2, g.x + cone + m); else fr.push(g.x - cone - m, g.x + S.behind + m / 2); }
        else if (g.state === 'alert' || g.state === 'carry' || g.state === 'dizzy') fr.push(g.x - cone - m, g.x + cone + m);
      }
      for (const d of ds) fr.push(d.x - S.dogR - m, d.x + S.dogR + m);
      for (const l of P.lights) { const lx = lightX(l, st.clock + t); fr.push(lx - S.lightR - m, lx + S.lightR + m); }
      frames.push(fr);
      for (const g of gs) stepGuard(g, S.fdt);
      for (const d of ds) stepDog(d, S.fdt);
    }
    return frames;
  }
  // creeping from x to tx at v px/s, starting k0 steps from now: never watched on the way? (slack forgives the edges)
  function hopSafe(P, frames, x, tx, v, k0, slack) {
    const dir = tx > x ? 1 : -1, step = v * S.fdt; slack = slack || 0;
    for (let k = k0; k < frames.length; k++) {
      if (!zoneAt(P, x)) { const fr = frames[k]; for (let i = 0; i < fr.length; i += 2) if (x > fr[i] + slack && x < fr[i + 1] - slack) return false; }
      if (Math.abs(tx - x) <= step) return true;
      x += dir * step;
    }
    return false;
  }
  function earliest(P, frames, x, tx, v, maxK, k0) { for (let k = k0 || 0; k <= maxK; k += 2) if (hopSafe(P, frames, x, tx, v, k, 0)) return k * S.fdt; return Infinity; }
  // how soon the sneaker can get to the next hiding spot unseen in this future (0 = now, Infinity = not at all)
  // (after: a hidden sneaker only sets off once the last planned pebble has landed, so both plans always agree)
  // (a pebble plan, after > 0, also pays for a short "go" window: the thrower likes pebbles that leave time to set off)
  function score(st, frames, after) {
    const sn = st.sn, P = st.P, z = zoneAt(P, sn.x), nx = nextZone(P, sn.x, z);
    if (!nx) return 0;
    if (z) {
      const e = earliest(P, frames, sn.x, nx.x0 + 14, S.creep, 76, after ? Math.ceil(after / S.fdt) : 0);
      if (!after || e === Infinity) return e;
      const k0 = Math.round(e / S.fdt); let k = k0 + 2;
      while (k <= k0 + 24 && hopSafe(P, frames, sn.x, nx.x0 + 14, S.creep, k, 0)) k += 2;
      return e + (2.4 - (k - 2 - k0) * S.fdt) * 0.6;
    }
    if (hopSafe(P, frames, sn.x, nx.x0 + 14, S.creep, 0, 10)) return 0;
    const pv = prevZone(P, sn.x);
    return pv && hopSafe(P, frames, sn.x, pv.x1 - 14, S.creep, 0, 10) ? 0.6 : Infinity;
  }
  // nobody near enough to hear dashing feet between x and tx
  function quiet(P, x, tx) {
    const lo = Math.min(x, tx) - S.stepHear - 50, hi = Math.max(x, tx) + S.stepHear + 50;
    return !P.guards.some(g => g.x > lo && g.x < hi) && !P.dogs.some(d => d.x > lo - 110 && d.x < hi + 110);
  }
  // time to hop? Says why: 'crate', 'boards' (any time in the last 34 px before them clears them) or, in a chase,
  // 'guard' (a hop at the right moment goes over the head of a guard running at you)
  function needJump(P, sn, dir, chase) {
    if (!dir || !sn.gr) return false;
    for (const c of P.crates) { const d = (c.x - sn.x) * dir - S.crateW - 11; if (d > -6 && d < 24 && sn.y < S.crateH - 14) return 'crate'; }
    if (!chase && sn.y === 0) for (const b of P.boards) { const d = (b.x - sn.x) * dir - S.boardW; if (d > 1 && d < 34) return 'boards'; }
    if (chase) for (const g of P.guards) if (g.state === 'alert') {
      const d = (g.x - sn.x) * dir, c = S.run + (g.t > 0 ? 0 : S.chaseV);
      if (d > 0 && d < 0.088 * c + 24 + 46) return 'guard';
    }
    return false;
  }
  // creaky boards coming up on a creep (for an early warning prompt)
  const boardsAhead = (P, sn, dir) => !!dir && P.boards.some(b => { const d = (b.x - sn.x) * dir - S.boardW; return d > 1 && d < 130; });

  /* ---------- what to do next ---------- */
  function planSneak(st) {
    const sn = st.sn, th = st.th, P = st.P, out = { mode: 'none', dir: 0, tx: sn.x, jump: false, why: false, boards: false, dash: false, slide: false, wait: Infinity, left: 0, zone: null, safe: false };
    if (st.state !== 'go' || sn.state !== 'ok') return out;
    const z = zoneAt(P, sn.x);
    if (st.chase) {
      // run for the hiding spot you can reach with the guards farthest behind
      const ch = P.guards.filter(g => g.state === 'alert' || (g.state === 'dizzy' && g.chasing));
      // (a spot on the far side of ONE running guard counts too: hop over his head and he skids)
      let best = null, bt = 1e9, bestHop = null, bht = 1e9, alt = null, am = -Infinity;
      for (const zz of P.zones) {
        if (burnt(st, zz)) continue;
        const tx = zz.kind === 'start' ? clamp(sn.x, zz.x0 + 14, zz.x1 - 50) : zz.kind === 'arch' ? clamp(sn.x, zz.x0 + 46, zz.x1 - 12) : clamp(sn.x, zz.x0 + 14, zz.x1 - 14);
        const D = Math.abs(tx - sn.x), tS = D / S.run + 0.12 * P.crates.filter(c => (c.x - sn.x) * (c.x - tx) < 0).length;
        const safe = (zz.kind === 'spot' ? S.safeD : S.safeGate) + 12;
        let ok = true, mar = 1e9, hops = 0;
        for (const g of ch) {
          let d;
          if (g.state === 'alert' && (g.x - sn.x) * (tx - sn.x) > 0 && Math.abs(g.x - sn.x) < D + 12) {
            hops++;
            const R = Math.max(0, D - S.run * Math.abs(g.x - sn.x) / (S.run + (g.t > 0 ? 0 : S.chaseV)));
            d = R - S.chaseV * Math.max(0, R / S.run - S.skid) - safe;
          } else d = Math.abs(tx - g.x) - S.chaseV * Math.max(0, tS - Math.max(0, g.t)) - safe;
          mar = Math.min(mar, d); if (d < 0) ok = false;
        }
        if (hops > 1) { ok = false; mar -= 2000; } else if (hops) mar -= 60;
        if (ok && !hops && tS < bt) { bt = tS; best = { z: zz, tx }; }
        if (ok && hops && tS < bht) { bht = tS; bestHop = { z: zz, tx }; }
        if (mar > am) { am = mar; alt = { z: zz, tx }; }
      }
      const pick = best || bestHop || alt;
      out.mode = 'flee';
      if (pick) { out.zone = pick.z; out.tx = pick.tx; }
      else { const ng = ch.reduce((a, g) => (!a || Math.abs(g.x - sn.x) < Math.abs(a.x - sn.x) ? g : a), null); out.tx = ng && ng.x > sn.x ? P.x0 + 30 : P.gate - 30; }
      out.dir = Math.abs(out.tx - sn.x) > 3 ? Math.sign(out.tx - sn.x) : 0;
    } else if (P.open) {
      if (sn.x > P.gate + 26) out.mode = 'partner';
      else { out.mode = 'gate'; out.tx = P.gate + 60; out.dir = 1; out.dash = quiet(P, sn.x, P.gate + 60); }
    } else if (z && z.kind === 'arch') {
      if (Math.abs(sn.x - P.lever) > 12) { out.mode = 'lever'; out.tx = P.lever; out.dir = Math.sign(P.lever - sn.x); } else out.mode = 'pull';
    } else {
      const nx = nextZone(P, sn.x, z), fr = st.frames, tx = nx.x0 + 14;
      out.zone = nx;
      if (hopSafe(P, fr, sn.x, tx, S.creep, 0, z ? 0 : 10)) {
        out.mode = 'go'; out.dir = 1; out.tx = (nx.x0 + nx.x1) / 2; out.safe = true; out.dash = quiet(P, sn.x, tx);
        // how long the way stays open for a creeper who has not set off yet
        if (z) { let k = 2; while (k <= 60 && hopSafe(P, fr, sn.x, tx, S.creep, k, 0)) k += 2; out.left = (k - 2) * S.fdt; }
      }
      else if (z) {
        out.mode = 'wait'; out.wait = earliest(P, fr, sn.x, tx, S.creep, 70);
        const mid = z.kind === 'start' ? Math.min(sn.x, z.x1 - 30) : (z.x0 + z.x1) / 2;
        if (Math.abs(mid - sn.x) > 9) { out.dir = Math.sign(mid - sn.x); out.tx = mid; }
      } else {
        const pv = prevZone(P, sn.x);
        if (pv && hopSafe(P, fr, sn.x, pv.x1 - 14, S.creep, 0, 10)) { out.mode = 'back'; out.dir = -1; out.tx = pv.x1 - 20; out.zone = pv; }
        else if (pv && sn.x - pv.x1 < nx.x0 - sn.x) { out.mode = 'back'; out.dir = -1; out.tx = pv.x1 - 20; out.zone = pv; }
        else { out.mode = 'go'; out.dir = 1; out.tx = (nx.x0 + nx.x1) / 2; }
      }
    }
    out.why = needJump(P, sn, out.dir, !!st.chase); out.jump = !!out.why;
    // a guard right on your heels and a long way to go: slide!
    if (out.mode === 'flee' && out.dir && !out.jump && sn.gr && sn.y === 0 && sn.slide <= 0 && sn.slideCd <= 0 && Math.abs(out.tx - sn.x) > 175 &&
      !P.crates.some(c => (c.x - sn.x) * out.dir > -10 && (c.x - sn.x) * out.dir < 200) &&
      P.guards.some(g => g.state === 'alert' && g.t < 0.3 && (sn.x - g.x) * out.dir > 0 && Math.abs(sn.x - g.x) < S.slideNear)) out.slide = true;
    out.boards = !st.chase && !out.jump && sn.y === 0 && boardsAhead(P, sn, out.dir);
    if (th && out.mode === 'wait' && Math.abs(out.tx - sn.x) <= 9) out.dir = 0;
    return out;
  }
  // which pebble (if any) would open the way soonest. Thought through a few times a second, not every tick.
  function thinkThrow(st) {
    const th = st.th, P = st.P, base = score(st, st.frames), old = st.think, out = { X: null, X2: null, base, sc: base };
    if (base <= S.patience) return out;
    const cands = [];
    for (let X = P.lo; X <= P.hi; X += 40) {
      if (P.guards.some(g => (g.state === 'sleep' || g.state === 'wake') && Math.abs(g.x - X) < S.wakeR + 16)) continue;
      if (P.guards.some(g => HEARS[g.state] && Math.abs(g.x - X) <= S.hear) || P.dogs.some(d => Math.abs(d.x - X) < S.dogHear)) cands.push(X);
    }
    const te = X => Math.max(0, Math.abs(X - th.x) - S.aimMax * 0.8) / S.thrV + 0.3 + S.flyT + (th.pouch < 1 ? (1 - th.pouch) * S.refill : 0);
    let best = Infinity, bx = null;
    for (const X of cands) { const sc = score(st, forecast(st, [{ t: te(X), x: X }]), te(X)) + Math.abs(X - th.x) * 0.0004; if (sc < best) { best = sc; bx = X; } }
    if (old && old.X != null && old.X !== bx && cands.includes(old.X)) { const so = score(st, forecast(st, [{ t: te(old.X), x: old.X }]), te(old.X)); if (so <= best + 0.6) { best = so; bx = old.X; } }
    if (bx != null && best < base - 0.8) { out.X = bx; out.sc = best; return out; }
    if (base === Infinity && best === Infinity && th.pouch >= 1) {
      // two guards in the way: try every pair of pebbles
      const cs = cands.filter((X, i) => i % 2 === 0);
      for (const X1 of cs) for (const X2 of cs) {
        const t1 = te(X1), t2 = t1 + 1.25 + Math.abs(X2 - X1) / (S.thrV + S.aimV), sc = score(st, forecast(st, [{ t: t1, x: X1 }, { t: t2, x: X2 }]), t2) + Math.abs(X1 - th.x) * 0.0004;
        if (sc < best) { best = sc; out.X = X1; out.X2 = X2; }
      }
      if (old && old.X2 != null && out.X != null && cs.includes(old.X) && cs.includes(old.X2)) {
        const t1 = te(old.X), t2 = t1 + 1.25 + Math.abs(old.X2 - old.X) / (S.thrV + S.aimV), so = score(st, forecast(st, [{ t: t1, x: old.X }, { t: t2, x: old.X2 }]), t2);
        if (so <= best + 0.6) { out.X = old.X; out.X2 = old.X2; best = so; }
      }
      out.sc = best;
    }
    return out;
  }
  function planThrow(st) {
    const th = st.th, sn = st.sn, P = st.P, out = { mode: 'hold', X: null, dir: 0, aim: 0, ready: false, show: false };
    if (st.state !== 'go') return out;
    if (P.open) { if (th.x <= P.gate + 26) { out.mode = 'follow'; out.dir = 1; } else out.mode = 'partner'; return out; }
    if (st.chase) {
      // lead the guard closest to the sneaker
      let g = null;
      for (const q of P.guards) if (q.state === 'alert' && (!g || Math.abs(q.x - sn.x) < Math.abs(g.x - sn.x))) g = q;
      if (!g) return out;
      const d = sn.x - g.x, lead = Math.min(Math.abs(d), S.chaseV * (S.flyT + 0.1));
      out.mode = 'bonk'; out.X = clamp(g.x + Math.sign(d) * lead, P.x0 + 24, P.gate - 24); out.show = true;
    } else {
      if (sn.state !== 'ok') return out;
      const tk = st.think;
      if (!tk || tk.X == null) return out;
      out.mode = 'toss'; out.X = tk.X; out.show = st.k === 0 || st.waitT > 8;
    }
    // how to get the ring onto X: turn and walk until it is within reach, then slide the aim
    // (close is good enough: a person can't park the ring on a pixel, and the look-ahead follows the real pebble)
    const d = out.X - th.x, ad = Math.abs(d), near = Math.abs(th.mark - out.X) < (out.mode === 'bonk' ? 22 : S.aimOk);
    if (!near) {
      if (d * th.face < 0 && ad > 2) out.dir = Math.sign(d); // it is behind you: turn round
      else if (ad > S.aimMax - 30) out.dir = Math.sign(d);
      else out.aim = th.aim < ad ? 1 : -1;
    } else if (Math.abs(th.mark - out.X) > 6 && d * th.face >= 0 && ad <= S.aimMax) out.aim = th.aim < ad ? 1 : -1; // (still nudging closer)
    out.ready = near && th.pouch >= 1 && th.cd <= 0;
    if (out.mode === 'toss' && (st.pebbles.length || (st.owl && !st.owl.hooted))) out.ready = false;
    return out;
  }
  function plan(st) {
    if (!st.c || !st.P) return { sneak: { mode: 'none', dir: 0 }, toss: { mode: 'hold' } };
    if (!st.pl) replan(st, true);
    return st.pl;
  }
  function replan(st, all) {
    if (all || !st.frames || ++st.fAge >= 4) { st.frames = forecast(st); st.fAge = 0; }
    if (all || (st.thinkT -= 1) <= 0) {
      const sn = st.sn, z = zoneAt(st.P, sn.x);
      st.think = st.state === 'go' && !st.chase && !st.P.open && sn.state === 'ok' && !(z && z.kind === 'arch') ? thinkThrow(st) : null;
      st.thinkT = 30;
    }
    st.pl = { sneak: planSneak(st), toss: planThrow(st) };
  }

  /* ---------- a stretch (one room) ---------- */
  function room(st, L, k) {
    const def = L.def;
    st.k = k; st.sneak = def.sneak || 0; st.thr = 1 - st.sneak; st.title = def.title || '';
    st.c = compile(def); st.P = st.c.posts[0];
    st.sn = { x: 52, y: 0, vy: 0, gr: true, face: 1, state: 'ok', t: 0, seen: 0, hidden: true, zone: st.P.zones[0], dashing: false, moving: false, stepT: 0, stepN: 0.12, stick: 0, pullT: 0, by: null, walk: 0, slide: 0, slideCd: 0, downWas: true };
    st.th = { x: 70, face: 1, aim: S.aim0, mark: 70 + S.aim0, pouch: S.pouch, cd: 0, anim: 0, moving: false, walk: 0 };
    st.pebbles = []; st.lying = []; st.rings = [];
    st.chase = null; st.rFail = 0; st.gold = { cloud: false }; st.gongT = 0; st.waitT = 0;
    st.state = 'go'; st.endT = 0; st.segStart = G.time; st.postT = G.time; st.clock = 0;
    st.postClock = 0; st.owlOn = false; st.owl = null; st.owlCd = 0;
    st.frames = null; st.fAge = 0; st.think = null; st.thinkT = 0; st.pl = null;
    st.cam = { x: -80 };
    K.fx(st);
    labels(st);
    replan(st, true);
    mirror(st);
  }
  function labels(st) { const w = []; w[st.sneak] = 'dash'; w[st.thr] = 'toss'; K.actLabels(w, 'dash/toss'); }

  /* ---------- the tick ---------- */
  function tick(st, dt) {
    if (!st.c) return;
    K.track(st);
    st.waiting = st.state === 'go' && K.idle(st, dt, S.idleWait);
    const live = G.introT <= 0 && !st.waiting && st.state === 'go';
    if (live) st.clock += dt;
    thrower(st, dt, live);
    sneaker(st, dt, live);
    if (live || st.state === 'end') {
      pebbles(st, dt);
      guards(st, dt);
      if (live) { watch(st, dt); if (st.chase) chase(st, dt); }
    }
    for (const r of st.rings) r.t += dt;
    st.rings = st.rings.filter(r => r.t < r.life);
    for (const q of st.lying) q.t -= dt;
    st.lying = st.lying.filter(q => q.t > 0);
    if (st.gongT > 0) st.gongT = Math.max(0, st.gongT - dt * 0.8);
    progress(st, dt);
    owl(st, dt, live);
    if (st.state === 'end') endStep(st, dt);
    replan(st, false);
    st.waitT = st.pl.sneak.mode === 'wait' && live ? st.waitT + dt : st.pl.sneak.mode === 'wait' ? st.waitT : 0;
    cam(st, dt);
    K.tickFx(st, dt);
    mirror(st);
  }
  function thrower(st, dt, live) {
    const th = st.th, p = G.players[st.thr], i = p.input, P = st.P;
    let dir = 0, up = 0, act = false;
    if (st.state === 'end') dir = th.x < st.c.endX - 46 ? 1 : 0;
    else if (live) { dir = (i.right ? 1 : 0) - (i.left ? 1 : 0); up = (i.up || i.jump ? 1 : 0) - (i.down ? 1 : 0); act = p.pendingAct; }
    p.pendingJump = false; p.pendingAct = false;
    if (dir) { th.face = dir; th.x += dir * S.thrV * dt; th.walk += dt; }
    th.moving = !!dir;
    th.x = clamp(th.x, P.x0 + 16, st.state === 'end' ? st.c.endX : P.open && P.openT > 0.45 ? P.gate + 96 : P.gate - 28);
    th.aim = clamp(th.aim + up * S.aimV * dt, 0, S.aimMax);
    th.mark = clamp(th.x + th.face * th.aim, P.x0 + 24, P.gate - 24);
    if (live) th.pouch = Math.min(S.pouch, th.pouch + dt / S.refill);
    if (th.cd > 0) th.cd -= dt;
    if (th.anim > 0) th.anim -= dt;
    if (!act || st.state !== 'go') return;
    if (th.pouch >= 1 && th.cd <= 0) {
      th.pouch -= 1; th.cd = S.throwCd; th.anim = 0.32; st.stats.pebbles++;
      st.pebbles.push({ x0: th.x + th.face * 10, y0: S.ramp - 22, tx: th.mark, u: 0, x: th.x, y: S.ramp - 22 });
      Sfx.play('ninjaWhoosh', 1.3); st.thinkT = 0;
    } else if (th.pouch < 1) { Sfx.play('shadowsneakEmpty'); K.hint(st, st.thr, 'The pouch is empty! It fills up again', 1.6); }
  }
  function sneaker(st, dt, live) {
    const sn = st.sn, p = G.players[st.sneak], i = p.input, P = st.P;
    let dir = 0, jump = false, act = false, held = false, down = false;
    if (st.state === 'end') dir = sn.x < st.c.endX - 4 ? 1 : 0;
    else if (live && sn.state === 'ok') { dir = (i.right ? 1 : 0) - (i.left ? 1 : 0); jump = p.pendingJump; act = p.pendingAct; held = i.act; down = i.down && !sn.downWas; }
    sn.downWas = !!i.down;
    p.pendingJump = false; p.pendingAct = false;
    sn.moving = false; sn.dashing = false;
    if (sn.pullT > 0) sn.pullT -= dt;
    if (sn.slideCd > 0) sn.slideCd -= dt;
    if (sn.slide > 0 && ((sn.slide -= dt) <= 0 || !st.chase || sn.state !== 'ok')) sn.slide = 0;
    if (sn.state === 'caught') { sn.hidden = false; return; }
    if (sn.state === 'dizzy') { if (live && (sn.t -= dt) <= 0) sn.state = 'ok'; sn.hidden = true; return; }
    if (sn.stick > 0) { sn.stick -= dt; dir = 0; jump = false; }
    const atLever = !P.open && Math.abs(sn.x - P.lever) < 28 && sn.y === 0;
    if (act && atLever) {
      if (st.chase) K.hint(st, st.sneak, 'Not with the guards watching! Hide first', 2);
      else pull(st);
    }
    // a slide (chase only, ▼): a fast low whoosh that goes right under a guard's arms
    if (down && st.chase && sn.gr && sn.slide <= 0 && sn.slideCd <= 0 && (dir || sn.face)) {
      sn.slide = S.slideT; sn.slideCd = S.slideCd; sn.face = dir || sn.face; st.stats.slides++;
      Sfx.play('shadowsneakSlide'); K.dust(st, sn.x, S.ground - 2, null, 6);
    }
    if (sn.slide > 0) { dir = sn.face; jump = false; }
    if (jump && sn.gr) { sn.vy = S.jumpV; sn.gr = false; Sfx.play('jump', 1.25); }
    let v = sn.slide > 0 ? S.slideV : st.chase ? S.run : S.creep;
    if (st.state === 'end') v = S.dash;
    else if (!st.chase && held && dir && !atLever) { v = S.dash; sn.dashing = true; }
    if (!sn.gr) v = Math.max(v, S.air);
    if (dir) {
      sn.face = dir;
      let nx = sn.x + dir * v * dt;
      if (floorAt(P, nx) > sn.y + 14) nx = sn.x; // a crate: hop it
      if (st.chase && sn.y < S.overY && !(sn.slide > 0)) for (const g of P.guards) if (g.state === 'alert' && (g.x - sn.x) * dir > 0 && Math.abs(g.x - nx) < 20) nx = sn.x; // a guard: hop over him!
      nx = clamp(nx, P.x0 + 14, st.state === 'end' ? st.c.endX : P.open && P.openT > 0.45 ? P.gate + 96 : P.gate - 16);
      sn.moving = nx !== sn.x; sn.x = nx;
      if (sn.moving) sn.walk += dt * (v > 150 ? 1.6 : 1);
      if (sn.slide > 0 && !sn.moving) sn.slide = 0; // (slid into a crate or the gate)
      if (!sn.moving) sn.dashing = false; // (pushing at a wall or a crate makes no noise)
    }
    // up and down (crates are little platforms)
    const fl = floorAt(P, sn.x);
    let landed = false;
    if (sn.y > fl || sn.vy > 0) {
      sn.vy -= S.g * dt; sn.y += sn.vy * dt; sn.gr = false;
      if (sn.y <= fl && sn.vy <= 0) { sn.y = fl; sn.vy = 0; sn.gr = true; landed = true; }
    } else { sn.y = fl; sn.vy = 0; sn.gr = true; }
    if (st.state !== 'go') { sn.hidden = false; return; }
    // noisy feet
    if (sn.dashing && sn.gr && sn.moving) {
      if ((sn.stepT += dt) >= sn.stepN) { sn.stepN += 0.28; noise(st, sn.x, S.stepHear, true, 'shadowsneakStep'); K.dust(st, sn.x - sn.face * 8, S.ground - sn.y, null, 2); }
    } else { sn.stepT = 0; sn.stepN = 0.12; }
    if (sn.gr && sn.y === 0 && (sn.moving || landed)) {
      for (const b of P.boards) if (b.cd <= 0 && Math.abs(sn.x - b.x) < S.boardW) {
        b.cd = 1.4; b.t = 0.5;
        if (!st.chase) { noise(st, b.x, S.creakHear, true, 'shadowsneakCreak'); K.pop(st, b.x, S.ground - 46, 'Creeeak!', '#ffe7a8', 18); K.hintOnce(st, 'creak', st.sneak, 'Hop over the creaky boards! ' + K.key(st.sneak, 'up'), 2.6); }
      }
    }
    for (const b of P.boards) { if (b.cd > 0) b.cd -= dt; if (b.t > 0) b.t -= dt; }
    const z = zoneAt(P, sn.x);
    sn.zone = z; sn.hidden = !!z && !sn.dashing && (!st.chase || st.chase.lose != null);
  }
  function pull(st) {
    const P = st.P, sn = st.sn;
    P.open = true; P.openT = 0; sn.pullT = 0.5; sn.face = 1;
    Sfx.play('shadowsneakLever'); rumble(st.sneak, 0.3, 0.4, 140);
    K.pop(st, P.gate, S.ground - 150, 'Clunk! Gate open!', '#ffffff', 22);
    K.hintOnce(st, 'tower', st.thr, 'The tower door is open! Walk through ' + K.key(st.thr, 'right'), 2.6);
  }
  // a noise ring; all = footsteps and creaks (everyone near comes), else a pebble
  function noise(st, x, r, all, sound) {
    st.rings.push({ x, r, t: 0, life: all ? 0.5 : 0.75 });
    st.thinkT = 0;
    if (sound) Sfx.play(sound);
    if (st.chase) return null;
    return hearAt(st.P, st.P.guards, st.P.dogs, x, r, all);
  }
  function pebbles(st, dt) {
    const P = st.P;
    for (let k = st.pebbles.length - 1; k >= 0; k--) {
      const q = st.pebbles[k];
      q.u += dt / S.flyT;
      const u = Math.min(1, q.u);
      q.x = lerp(q.x0, q.tx, u); q.y = lerp(q.y0, S.ground - 4, u) - Math.sin(u * Math.PI) * (46 + Math.abs(q.tx - q.x0) * 0.12);
      // a chasing guard under it: bonk
      let hit = null;
      if (u > 0.55) for (const g of P.guards) if (g.state === 'alert' && Math.abs(g.x - q.x) < 30 && q.y > S.ground - 70) hit = g;
      if (hit) {
        hit.state = 'dizzy'; hit.t = S.dizzy; hit.side = 0; st.stats.bonks++;
        Sfx.play('ninjaBonk'); Sfx.play('ninjaDizzy');
        K.pop(st, hit.x, S.ground - 84, 'Bonk!', '#ffffff', 24); K.spark(st, hit.x, S.ground - 44, 8, ['#fff2b0', '#ffffff']);
        rumble(st.thr, 0.2, 0.5, 120);
        st.pebbles.splice(k, 1);
        continue;
      }
      if (q.u >= 1) {
        st.pebbles.splice(k, 1);
        st.lying.push({ x: q.tx, t: 5 });
        const g = noise(st, q.tx, S.hear, false, 'ninjaTik');
        K.pop(st, q.tx, S.ground - 26, 'tik!', '#ffffff', 15);
        K.dust(st, q.tx, S.ground - 2, null, 3);
        if (g && !st.hints[st.sneak] && st.sn.state === 'ok') K.hintOnce(st, 'tik', st.sneak, 'The guard went to look! Sneak past behind him', 3);
      }
    }
  }
  function guards(st, dt) {
    const P = st.P, sn = st.sn;
    for (const g of P.guards) {
      if (g.state === 'carry') {
        // carried back to the gatehouse and put down, none the worse
        g.face = -1; g.x -= S.carryV * dt; sn.x = g.x; sn.y = 0; sn.vy = 0;
        if (g.x <= P.x0 + 140) {
          g.x = P.x0 + 140; g.state = 'return';
          sn.x = P.x0 + 64; sn.state = 'dizzy'; sn.t = 1.0; sn.face = 1; sn.by = null;
          Sfx.play('shadowsneakPlop'); K.pop(st, sn.x + 30, S.ground - 80, 'Out you go!', '#ffffff', 20); K.dust(st, sn.x, S.ground - 2, null, 8);
          K.hint(st, st.sneak, 'Try again! Wait in a hiding spot for a pebble', 3);
        }
        continue;
      }
      if (g.state === 'alert') continue; // (the chase moves them)
      if (g.notice > 0) { g.notice -= dt; continue; } // staring: "?"
      stepGuard(g, dt);
    }
    for (const d of P.dogs) stepDog(d, dt);
    // the other posts keep to their beats too
    for (const q of st.c.posts) if (q !== P) { for (const g of q.guards) stepGuard(g, dt); for (const d of q.dogs) stepDog(d, dt); }
  }
  // is anyone looking at the sneaker?
  function watch(st, dt) {
    const sn = st.sn, P = st.P;
    let rate = 0, by = null;
    if (sn.state === 'ok' && !st.chase && !sn.hidden) {
      const cone = coneLen(st);
      for (const g of P.guards) if (AWAKE[g.state]) {
        if (g.state === 'wake' && g.t > S.wakeT - S.groggy) continue; // just woken: he rubs his eyes first
        const d = (sn.x - g.x) * g.face;
        if (d > -S.behind && d < cone) { g.notice = 0.3; const r = 1 / (d < S.seeNear ? S.seeNearT : S.seeT); if (r > rate) { rate = r; by = g; } }
      }
      for (const d of P.dogs) if (Math.abs(sn.x - d.x) < S.dogR) { if (rate < 3.3) rate = 3.3; by = by || d; }
      for (const l of P.lights) if (Math.abs(sn.x - lightX(l, st.clock)) < S.lightR) { if (rate < 1 / S.seeT) rate = 1 / S.seeT; by = by || l; }
    }
    if (!rate) { sn.seen = Math.max(0, sn.seen - dt / S.unseeT); return; }
    if (sn.seen === 0) Sfx.play('shadowsneakHuh');
    sn.seen += rate * dt;
    if (sn.seen >= 1) spotted(st);
  }
  function spotted(st) {
    const sn = st.sn, P = st.P;
    sn.seen = 0; st.stats.spotted++; st.rFail++; P.seen = true; st.gongT = 1;
    st.chase = { t: 0, lose: null, burnt: P.zones.filter(z => z.kind === 'spot' && Math.abs((z.x0 + z.x1) / 2 - sn.x) < S.burnR) };
    let n = 0;
    for (const g of P.guards) if (AWAKE[g.state] || (g.state === 'sleep' && Math.abs(g.x - sn.x) < 240)) { g.t = startle(g, sn); g.state = 'alert'; g.chasing = true; g.notice = 0; g.fast = false; g.side = 0; n++; }
    if (!n) { const g = P.guards.reduce((a, q) => (q.state !== 'dizzy' && (!a || Math.abs(q.x - sn.x) < Math.abs(a.x - sn.x)) ? q : a), null); if (g) { g.t = startle(g, sn); g.state = 'alert'; g.chasing = true; g.notice = 0; g.side = 0; } }
    for (const d of P.dogs) if (Math.abs(d.x - sn.x) < 320) { d.state = 'bark'; d.t = 3; d.face = sn.x >= d.x ? 1 : -1; Sfx.play('shadowsneakWoof'); }
    Sfx.play('ninjaGong'); Sfx.play('ninjaAlert');
    if (!reduceMotion) G.shake = 0.07;
    rumble(0, 0.5, 0.6, 220); rumble(1, 0.5, 0.6, 220);
    K.pop(st, sn.x, S.ground - 120, 'SPOTTED!', '#ff8a7a', 30);
    K.hint(st, st.sneak, 'Run! Get to a hiding spot!', 2.4);
    K.hint(st, st.thr, 'Bonk the guards with pebbles! ' + K.key(st.thr, 'act'), 2.4);
    if (st.rFail >= S.goldFails && !st.gold.cloud && K.both(st)) {
      st.gold.cloud = true;
      K.goldHelp(st, 'Gold moon cloud! The guards see only half as far in this stretch', 5);
    }
  }
  // the "!" jump before a guard runs: longer the closer you are (nose to nose he jumps out of his skin), and longer
  // still for a guard who was asleep, so even a chase that starts right next to him is a real run
  const startle = (g, sn) => S.startle + S.startleNear * clamp(1 - Math.abs(g.x - sn.x) / 140, 0, 1) + (g.state === 'sleep' || g.state === 'wake' ? 0.3 : 0);
  function chase(st, dt) {
    const sn = st.sn, P = st.P;
    st.chase.t += dt;
    let near = 1e9, any = false;
    for (const g of P.guards) {
      if (g.state === 'dizzy' && g.chasing) any = true;
      if (g.state !== 'alert') continue;
      any = true;
      const d = sn.x - g.x, slow = P.crates.some(c => Math.abs(g.x - c.x) < 36) ? 0.45 : 1;
      // hopped right over his head: he skids to a stop and spins round
      const side = d > 0 ? 1 : -1;
      if (g.side && side !== g.side && Math.abs(d) > 2) {
        if (!sn.gr || sn.y > 0 || sn.slide > 0) { g.t = Math.max(g.t, S.skid); st.stats.hops++; Sfx.play('shadowsneakWhoa'); K.pop(st, g.x, S.ground - 84, 'Whoa!', '#ffffff', 20); K.dust(st, g.x, S.ground - 2, null, 5); }
      }
      if (Math.abs(d) > 2) g.side = side;
      if (Math.abs(d) > 2) g.face = d > 0 ? 1 : -1;
      if (g.t > 0) { g.t -= dt; near = Math.min(near, Math.abs(d)); continue; } // "!": a startled jump before he runs
      g.x = clamp(g.x + g.face * Math.min(Math.abs(d), S.chaseV * slow * dt), g.lo - 20, g.hi + 20);
      near = Math.min(near, Math.abs(sn.x - g.x));
      if (sn.state === 'ok' && Math.abs(sn.x - g.x) < S.catchD && sn.y < S.overY && !(sn.slide > 0)) { caught(st, g); return; }
    }
    // out of sight in a hiding spot they did not see you near, with the guards a few steps behind: they run up to look
    // around ("?") and, if you stay put for S.loseT, they lose you. Step out too soon and the chase is on again.
    const z = zoneAt(P, sn.x), cover = !!z && !burnt(st, z) && sn.gr && sn.y === 0, ch = st.chase;
    const search = g => { g.state = 'go'; g.fast = true; g.t = 0; g.tx = clamp(sn.x + (g.x < sn.x ? -40 : 40), g.lo, g.hi); };
    if (ch.lose != null) {
      if (sn.state !== 'ok') return;
      if (!cover) {
        ch.lose = null; sn.hidden = false;
        for (const g of P.guards) if (g.chasing && g.state !== 'dizzy') { g.state = 'alert'; g.t = 0.25; g.side = 0; }
        Sfx.play('ninjaAlert'); K.pop(st, sn.x, S.ground - 150, 'There!', '#ff8a7a', 24);
        return;
      }
      for (const g of P.guards) if (g.chasing && g.state === 'alert') search(g); // (a guard waking from a bonk)
      if ((ch.lose += dt) < S.loseT) return;
      st.chase = null; st.stats.escapes++; sn.stick = 0.3; st.hints[st.thr] = null;
      for (const g of P.guards) if (g.chasing) { g.chasing = false; if (g.state === 'alert') search(g); }
      Sfx.play('ninjaPoof'); Sfx.play('shadowsneakPhew');
      K.poof(st, sn.x, S.ground - 20, 14);
      K.pop(st, sn.x, S.ground - 150, 'Phew! They lost you!', '#d9ffd0', 22);
      K.hint(st, st.sneak, 'Stay hidden until they give up...', 2.6);
      return;
    }
    if (sn.state === 'ok' && !any && !z) { st.chase = null; return; }
    if (sn.state === 'ok' && cover && (!any || near > (z.kind === 'spot' ? S.safeD : S.safeGate))) {
      ch.lose = 0; sn.hidden = true; sn.zone = z; sn.slide = 0;
      for (const g of P.guards) if (g.chasing && g.state === 'alert') search(g);
      Sfx.play('ninjaPoof'); K.poof(st, sn.x, S.ground - 20, 8);
      K.hint(st, st.sneak, 'Shh! Stay still...', S.loseT + 0.3);
    }
  }
  // the hiding spots the guards saw you near when they spotted you don't work in this chase (the gatehouses always do)
  const burnt = (st, z) => !!(st.chase && st.chase.burnt && st.chase.burnt.includes(z));
  function caught(st, g) {
    const sn = st.sn, P = st.P;
    st.chase = null; st.stats.caught++; st.hints = [null, null]; sn.state = 'caught'; sn.by = g; sn.y = 0; sn.vy = 0; sn.seen = 0;
    g.state = 'carry'; g.chasing = false;
    for (const q of P.guards) if (q !== g && q.chasing) { q.chasing = false; if (q.state === 'alert') q.state = 'return'; }
    Sfx.play('shadowsneakGotcha'); rumble(st.sneak, 0.4, 0.4, 200);
    K.pop(st, g.x, S.ground - 110, 'Gotcha!', '#ffffff', 26);
  }
  function progress(st, dt) {
    const P = st.P, sn = st.sn, th = st.th;
    if (!P.open) return;
    if (P.openT < 1) P.openT = Math.min(1, P.openT + dt / 0.6);
    if (st.state !== 'go' || sn.state !== 'ok' || sn.x <= P.gate + 26 || th.x <= P.gate + 26) return;
    st.stats.posts++; if (!P.seen) st.stats.clean++;
    const nxt = st.c.posts[P.k + 1];
    if (!nxt) { endRoom(st); return; }
    for (const g of P.guards) { g.chasing = false; g.notice = 0; if (g.state === 'alert' || g.state === 'carry' || g.state === 'dizzy') g.state = 'return'; }
    st.chase = null;
    st.P = nxt; st.postT = G.time; st.think = null; st.thinkT = 0; st.frames = null; st.waitT = 0;
    st.postClock = 0; st.owlOn = false; st.owl = null; st.owlCd = 0;
    Sfx.play('shadowsneakCheck');
    K.pop(st, P.gate + 20, S.ramp + 60, P.seen ? 'Checkpoint!' : 'Checkpoint! Never seen!', C.gold, 22);
    K.spark(st, P.gate + 13, S.ramp + 52, 10);
  }
  // GOLD HELP for a stuck pair: 45 s at one post (both playing) brings a gold owl for the rest of that post. While the
  // sneaker waits hidden it flies to the plan's pebble spot and hoots there, like a free pebble (every few seconds).
  function owl(st, dt, live) {
    const sn = st.sn, P = st.P, calm = st.state === 'go' && !st.chase && !P.open && sn.state === 'ok';
    if (st.state !== 'go') { st.owl = null; return; }
    if (!live) return;
    if (calm) st.postClock += dt;
    if (st.owlCd > 0) st.owlCd -= dt;
    if (!st.owlOn && calm && st.postClock > S.owlStuck && K.both(st)) {
      st.owlOn = true; st.stats.owls++;
      K.goldHelp(st, 'Gold owl! It hoots at the ring to lure the guards', 5);
    }
    if (st.owlOn && !st.owl && st.owlCd <= 0 && calm && sn.hidden && st.pl && st.pl.sneak.mode === 'wait' && st.think && st.think.X != null && !st.pebbles.length)
      st.owl = { tx: st.think.X, x0: st.cam.x + W + 40, u: 0, hooted: false, leave: 0 };
    const o = st.owl;
    if (!o) return;
    if (!o.hooted) {
      o.u = Math.min(1, o.u + dt / S.owlFly);
      if (o.u >= 1) {
        o.hooted = true; st.owlCd = S.owlCd;
        noise(st, o.tx, S.hear, false, 'shadowsneakHoot');
        K.pop(st, o.tx, S.ground - 150, 'Hoo hoo!', C.gold, 20);
      }
    } else if ((o.leave += dt) > 1.4) st.owl = null;
  }
  function drawOwl(o, t) {
    const u = K.smooth(o.u), x = lerp(o.x0, o.tx, u) + o.leave * 140, y = lerp(150, S.ground - 128, u) - Math.sin(u * Math.PI) * 30 - o.leave * o.leave * 120;
    const flap = Math.sin(t * (o.hooted && o.leave < 0.5 ? 6 : 22)) * 0.6;
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = 'rgba(255,197,61,0.25)'; circle(0, 0, 26); ctx.fill();
    ctx.fillStyle = '#e0a02a'; ctx.strokeStyle = '#7a5410'; ctx.lineWidth = 2;
    for (const f of [-1, 1]) { ctx.save(); ctx.scale(f, 1); ctx.rotate(flap); ctx.beginPath(); ctx.moveTo(8, -2); ctx.quadraticCurveTo(26, -10, 30, 6); ctx.quadraticCurveTo(18, 4, 8, 8); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); }
    ctx.fillStyle = C.gold; ctx.beginPath(); ctx.ellipse(0, 2, 12, 14, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-10, -8); ctx.lineTo(-8, -18); ctx.lineTo(-3, -11); ctx.moveTo(10, -8); ctx.lineTo(8, -18); ctx.lineTo(3, -11); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffffff'; circle(-4.5, -3, 4.2); ctx.fill(); circle(4.5, -3, 4.2); ctx.fill();
    ctx.fillStyle = '#1c1a36'; circle(-4.5, -3, 2); ctx.fill(); circle(4.5, -3, 2); ctx.fill();
    ctx.fillStyle = '#ff9a3a'; ctx.beginPath(); ctx.moveTo(-2.5, 2); ctx.lineTo(2.5, 2); ctx.lineTo(0, 6); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function endRoom(st) {
    const last = !(G.level.def.rooms && G.level.def.roomIndex < G.level.def.roomCount - 1);
    st.state = 'end'; st.endT = 0; st.lastRoom = last;
    st.stats.roomT[st.k] = G.time - st.segStart;
    Sfx.play('ninjaCheer');
    K.pop(st, st.c.endX - 60, S.ground - 190, last ? 'Through the whole fortress!' : 'Through! Swap jobs!', C.gold, 28);
  }
  function endStep(st, dt) {
    st.endT += dt;
    if (st.lastRoom) {
      if (st.endT > 1.0 && !st.party) { st.party = true; Sfx.play('shadowsneakFanfare'); K.confetti(st, st.c.endX, S.ground - 120, 50); K.confetti(st, st.c.endX - 40, S.ramp - 20, 30); }
      if (st.endT > 2.8 && !st.cleared) { st.cleared = true; G.level.goal = { x: st.c.endX - st.cam.x, y: S.ground - 120 }; levelClear(); }
    } else if (st.endT > 2.2) { st.party = false; nextRoom(); }
  }

  /* ---------- camera and mirror ---------- */
  function cam(st, dt) {
    const P = st.P, sn = st.sn, th = st.th;
    const lo = P.x0 - 100, hi = Math.max(lo, P.gate + 130 - W);
    let tx = clamp((st.chase || sn.state !== 'ok' ? sn.x : 0.6 * sn.x + 0.4 * th.x) - W / 2, lo, hi);
    if (st.state === 'end') tx = st.c.endX - W * 0.62;
    st.cam.x += (tx - st.cam.x) * Math.min(1, dt * 3);
  }
  const snLift = sn => (sn.hidden && sn.zone && sn.zone.spot ? (sn.zone.spot.kind === 'B' ? 32 : sn.zone.spot.kind === 'H' ? 50 : 0) : 0);
  function mirror(st) {
    const cx = st.cam.x, sn = st.sn;
    K.place(st.sneak, sn.x - cx, S.ground - sn.y - snLift(sn) - (sn.state === 'caught' ? 44 : 0));
    K.place(st.thr, st.th.x - cx, S.ramp);
  }

  /* ---------- drawing ---------- */
  function eye(x, y, open, frac, s) {
    s = s || 1;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.lineCap = 'round';
    if (!open) {
      ctx.strokeStyle = 'rgba(20,22,52,0.85)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, -3, 8, 0.25, Math.PI - 0.25); ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(0, -3, 8, 0.25, Math.PI - 0.25);
      for (const a of [0.6, Math.PI / 2, Math.PI - 0.6]) { ctx.moveTo(Math.cos(a) * 8, -3 + Math.sin(a) * 8); ctx.lineTo(Math.cos(a) * 11.5, -3 + Math.sin(a) * 11.5); }
      ctx.stroke();
    } else {
      const col = frac > 0.66 ? '#ff6b5a' : '#ffd36b';
      ctx.fillStyle = 'rgba(20,22,52,0.9)'; ctx.beginPath(); ctx.ellipse(0, 0, 15, 10, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(-12, 0); ctx.quadraticCurveTo(0, -11, 12, 0); ctx.quadraticCurveTo(0, 11, -12, 0); ctx.fill();
      ctx.save(); ctx.beginPath(); ctx.moveTo(-12, 0); ctx.quadraticCurveTo(0, -11, 12, 0); ctx.quadraticCurveTo(0, 11, -12, 0); ctx.clip();
      ctx.fillStyle = col; ctx.fillRect(-12, 7 - 14 * clamp(frac, 0, 1), 24, 14);
      ctx.restore();
      ctx.fillStyle = '#1c1a36'; circle(0, 0, 3.4); ctx.fill();
    }
    ctx.restore();
  }
  function drawWall(cx) {
    const x0 = cx - 40, x1 = cx + W + 40, top = S.ramp, gy = S.ground, w = x1 - x0;
    ctx.fillStyle = '#3b3768'; ctx.fillRect(x0, top, w, gy - top);
    ctx.fillStyle = 'rgba(170,180,240,0.09)'; ctx.fillRect(x0, top + 17, w, 30);
    ctx.fillStyle = '#2d2a54'; ctx.fillRect(x0, gy - 44, w, 44);
    ctx.strokeStyle = 'rgba(16,16,44,0.55)'; ctx.lineWidth = 2; ctx.beginPath();
    ctx.moveTo(x0, gy - 44); ctx.lineTo(x1, gy - 44); ctx.moveTo(x0, gy - 22); ctx.lineTo(x1, gy - 22);
    for (let x = Math.floor(x0 / 56) * 56; x < x1; x += 56) { ctx.moveTo(x, gy - 44); ctx.lineTo(x, gy - 22); ctx.moveTo(x + 28, gy - 22); ctx.lineTo(x + 28, gy); }
    ctx.stroke();
    ctx.fillStyle = '#2a264e';
    for (let x = Math.floor(x0 / 190) * 190; x < x1; x += 190) ctx.fillRect(x, top + 14, 8, gy - 44 - top - 14);
    ctx.fillRect(x0, top + 96, w, 5);
    // the tile cap: the wall walk
    ctx.fillStyle = COL.tileEdge; ctx.fillRect(x0, top, w, 14);
    ctx.fillStyle = COL.tile; ctx.fillRect(x0, top, w, 10);
    ctx.fillStyle = COL.tileHi; ctx.fillRect(x0, top, w, 2.5);
    ctx.fillStyle = COL.tileEdge; for (let x = Math.floor(x0 / 16) * 16; x < x1; x += 16) ctx.fillRect(x, top + 3, 2, 8);
    ctx.fillStyle = COL.trim; ctx.fillRect(x0, top + 14, w, 3);
  }
  function drawGate(st, gx, openT, pulled, lit, seen) {
    const gy = S.ground, top = S.ramp;
    ctx.fillStyle = '#262349'; ctx.fillRect(gx - 100, top + 17, 226, gy - top - 17);
    ctx.fillStyle = '#322e5c'; ctx.fillRect(gx - 100, top + 17, 226, 7);
    ctx.strokeStyle = 'rgba(12,12,36,0.6)'; ctx.lineWidth = 2; ctx.beginPath();
    for (let y = top + 52; y < gy - 110; y += 28) { ctx.moveTo(gx - 100, y); ctx.lineTo(gx + 126, y); }
    ctx.stroke();
    // the archway: deep shadow, always a safe place
    ctx.fillStyle = '#0d0c22'; ctx.beginPath(); ctx.moveTo(gx - 88, gy); ctx.lineTo(gx - 88, gy - 76); ctx.quadraticCurveTo(gx - 88, gy - 112, gx - 52, gy - 112);
    ctx.lineTo(gx + 78, gy - 112); ctx.quadraticCurveTo(gx + 114, gy - 112, gx + 114, gy - 76); ctx.lineTo(gx + 114, gy); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#4a4680'; ctx.lineWidth = 4; ctx.stroke();
    badge(gx + 13, gy - 124, seen);
    // the gate bars
    ctx.save(); ctx.beginPath(); ctx.rect(gx - 16, gy - 112, 32, 112); ctx.clip();
    const up = openT * 100;
    ctx.strokeStyle = '#9aa0c8'; ctx.lineWidth = 3.5; ctx.beginPath();
    for (const dx of [-10, 0, 10]) { ctx.moveTo(gx + dx, gy - 114 - up); ctx.lineTo(gx + dx, gy - up); }
    for (const dy of [22, 52, 82]) { ctx.moveTo(gx - 13, gy - dy - up); ctx.lineTo(gx + 13, gy - dy - up); }
    ctx.stroke(); ctx.restore();
    // the lever
    if (pulled !== null) {
      const lx = gx - S.leverDX, a = lerp(-0.6, 0.6, K.smooth(pulled));
      if (lit) { ctx.fillStyle = 'rgba(255,197,61,' + (0.28 + 0.2 * Math.sin(G.clock * 9)) + ')'; circle(lx, gy - 26, 26); ctx.fill(); }
      ctx.fillStyle = '#6a6590'; rr(lx - 11, gy - 12, 22, 12, 3); ctx.fill();
      ctx.strokeStyle = '#cfd3ee'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(lx, gy - 10); ctx.lineTo(lx + Math.sin(a) * 30, gy - 10 - Math.cos(a) * 30); ctx.stroke();
      ctx.fillStyle = lit ? C.gold : '#ff6b5a'; circle(lx + Math.sin(a) * 30, gy - 10 - Math.cos(a) * 30, 6); ctx.fill();
    }
    // the gong on the front
    ctx.strokeStyle = COL.paper; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(gx + 13, top + 26); ctx.lineTo(gx + 13, top + 40); ctx.stroke();
    K.gong(gx + 13, top + 54, 15, { hit: st.gongT, noFrame: true });
    // the tower on the wall walk: posts, a door and a roof
    ctx.save(); ctx.beginPath(); ctx.rect(gx - 22, top - 66, 44, 66); ctx.clip();
    ctx.translate(0, -openT * 66);
    ctx.fillStyle = COL.wood; ctx.fillRect(gx - 22, top - 66, 44, 66);
    ctx.fillStyle = COL.woodDark; for (const dx of [-11, 0, 11]) ctx.fillRect(gx + dx - 1, top - 66, 2, 66);
    ctx.fillStyle = '#9aa0c8'; ctx.fillRect(gx - 22, top - 50, 44, 4); ctx.fillRect(gx - 22, top - 20, 44, 4);
    ctx.restore();
    ctx.fillStyle = COL.woodDark; ctx.fillRect(gx - 30, top - 76, 8, 76); ctx.fillRect(gx + 22, top - 76, 8, 76);
    K.roof(gx - 62, top - 94, 124, { noWall: true, th: 14 });
  }
  // a hiding spot's badge: a closed eye, or (in a chase, near where they saw you) a wide-open red eye: no good now
  const badge = (x, y, seen) => (seen ? eye(x, y, true, 1, 1) : eye(x, y, false, 0, 0.9));
  function drawSpotBack(sp, t, seen) {
    const gy = S.ground, x = sp.x;
    if (sp.kind === 'D') {
      ctx.fillStyle = '#0f0e26'; ctx.beginPath(); ctx.moveTo(x - 27, gy); ctx.lineTo(x - 27, gy - 60); ctx.quadraticCurveTo(x - 27, gy - 86, x, gy - 86); ctx.quadraticCurveTo(x + 27, gy - 86, x + 27, gy - 60); ctx.lineTo(x + 27, gy); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = COL.wood; ctx.lineWidth = 5; ctx.stroke();
      badge(x, gy - 100, seen);
    } else if (sp.kind === 'A') {
      const w = sp.w;
      ctx.fillStyle = 'rgba(6,6,26,0.55)'; ctx.fillRect(x - w / 2, gy - 96, w, 96);
      ctx.fillStyle = COL.woodDark; ctx.fillRect(x - w / 2 - 2, gy - 112, 4, 112); ctx.fillRect(x + w / 2 - 2, gy - 112, 4, 112);
      const n = Math.max(4, Math.round(w / 22)), sw = (w + 24) / n;
      for (let i = 0; i < n; i++) {
        ctx.fillStyle = i % 2 ? '#e9e2f5' : '#8a5fd0';
        ctx.beginPath(); ctx.moveTo(x - w / 2 - 12 + i * sw, gy - 96); ctx.lineTo(x - w / 2 - 4 + i * sw * (w + 8) / (w + 24), gy - 120); ctx.lineTo(x - w / 2 - 4 + (i + 1) * sw * (w + 8) / (w + 24), gy - 120); ctx.lineTo(x - w / 2 - 12 + (i + 1) * sw, gy - 96); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.arc(x - w / 2 - 12 + (i + 0.5) * sw, gy - 96, sw / 2, 0, Math.PI); ctx.fill();
      }
      badge(x, gy - 134, seen);
    } else badge(x, gy - (sp.kind === 'B' ? 66 : sp.kind === 'H' ? 90 : 128), seen);
  }
  function drawSpotFront(sp, t, squash) {
    const gy = S.ground, x = sp.x;
    if (sp.kind === 'B') {
      ctx.fillStyle = '#7a4e30'; ctx.strokeStyle = '#3a2416'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(x - 19, gy - 46); ctx.quadraticCurveTo(x - 27, gy - 23, x - 19, gy); ctx.lineTo(x + 19, gy); ctx.quadraticCurveTo(x + 27, gy - 23, x + 19, gy - 46); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#9a6a44'; ctx.fillRect(x - 13, gy - 44, 5, 42); ctx.fillRect(x + 2, gy - 44, 5, 42);
      ctx.fillStyle = '#b9bedc'; ctx.fillRect(x - 23, gy - 36, 46, 4); ctx.fillRect(x - 23, gy - 13, 46, 4);
      ctx.fillStyle = '#2a1a12'; ctx.beginPath(); ctx.ellipse(x, gy - 46, 19, 4.5, 0, 0, TAU); ctx.fill(); ctx.stroke();
    } else if (sp.kind === 'H') K.hayCart(x, gy, { squash: squash ? 0.5 : 0 });
    else if (sp.kind === 'M') { K.bamboo(x - 20, gy, 132, t, sp.x); K.bamboo(x + 2, gy, 150, t, sp.x + 3); K.bamboo(x + 22, gy, 120, t, sp.x + 7); }
  }
  function drawCone(g, len, alert, gold) {
    const f = g.face, gy = S.ground, ex = g.x + f * 12, ey = gy - 28, fx = g.x + f * len, c = alert ? '255,120,90' : gold ? '255,197,61' : '255,236,170';
    ctx.fillStyle = 'rgba(' + c + ',' + (alert ? 0.22 : 0.14) + ')';
    ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(fx, gy - 64); ctx.lineTo(fx, gy + 9); ctx.lineTo(g.x + f * 24, gy + 9); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(' + c + ',' + (alert ? 0.55 : 0.4) + ')'; ctx.fillRect(Math.min(g.x + f * 14, fx), gy + 2, Math.abs(len - 14), 7);
    ctx.strokeStyle = 'rgba(' + c + ',0.75)'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.moveTo(fx, gy - 64); ctx.lineTo(fx, gy + 9); ctx.stroke(); ctx.setLineDash([]);
  }
  function drawDog(d, t) {
    const gy = S.ground, f = d.face, run = d.state === 'go' || d.state === 'return', bob = run ? Math.abs(Math.sin(t * 16)) * 4 : d.state === 'bark' ? Math.abs(Math.sin(t * 14)) * 5 : 0;
    // the sniff circle
    ctx.fillStyle = 'rgba(150,215,255,0.34)'; ctx.fillRect(d.x - S.dogR, gy + 2, S.dogR * 2, 7);
    ctx.strokeStyle = 'rgba(150,215,255,0.55)'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.arc(d.x, gy, S.dogR, Math.PI, 0); ctx.stroke(); ctx.setLineDash([]);
    ctx.save(); ctx.translate(d.x, gy - bob); ctx.scale(f, 1);
    ctx.fillStyle = 'rgba(14,16,40,0.3)'; ctx.beginPath(); ctx.ellipse(0, bob, 17, 3.5, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#6a3c1c'; ctx.lineWidth = 2;
    const wag = Math.sin(t * (d.state === 'sit' ? 9 : 16)) * 0.4;
    ctx.save(); ctx.translate(-13, -16); ctx.rotate(-0.6 + wag); ctx.fillStyle = '#f4e2c0'; ctx.beginPath(); ctx.ellipse(-3, -7, 4.5, 8, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore();
    ctx.fillStyle = '#6a3c1c'; const lg = run ? Math.sin(t * 16) * 4 : 0; for (const lx of [-9, 8]) ctx.fillRect(lx - 2.5 + (lx < 0 ? lg : -lg), -8, 5, 8);
    ctx.fillStyle = '#e8a55a'; rr(-15, -24, 30, 18, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f4e2c0'; rr(-8, -14, 18, 8, 4); ctx.fill();
    const hy = d.state === 'sniff' ? -12 : -27, hx = d.state === 'sniff' ? 15 : 12;
    ctx.fillStyle = '#e8a55a'; circle(hx, hy, 10); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(hx - 8, hy - 6); ctx.lineTo(hx - 6, hy - 16); ctx.lineTo(hx - 1, hy - 9); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(hx + 1, hy - 9); ctx.lineTo(hx + 6, hy - 16); ctx.lineTo(hx + 8, hy - 6); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f4e2c0'; ctx.beginPath(); ctx.ellipse(hx + 6, hy + 3, 6, 4.5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#1c1a36'; circle(hx + 11, hy + 2, 2); ctx.fill(); circle(hx + 3, hy - 2, 1.7); ctx.fill();
    ctx.restore();
    if (d.state === 'bark') bigText('Woof!', d.x + f * 26, gy - 56 - bob, 16, '#ffffff', 1);
    else if (d.state === 'sniff') text('sniff sniff', d.x, gy - 40, 11, '#ffffff', 'center', 'body');
  }
  function drawLight(l, lx) {
    const gy = S.ground, mx = (l.a + l.b) / 2, my = S.ramp + 40;
    ctx.fillStyle = 'rgba(255,244,190,0.13)'; ctx.beginPath(); ctx.moveTo(mx - 6, my); ctx.lineTo(mx + 6, my); ctx.lineTo(lx + S.lightR, gy + 9); ctx.lineTo(lx - S.lightR, gy + 9); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,244,190,0.42)'; ctx.fillRect(lx - S.lightR, gy + 2, S.lightR * 2, 7);
    ctx.strokeStyle = 'rgba(255,244,190,0.7)'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.moveTo(lx - S.lightR, gy + 9); ctx.lineTo(mx - 6, my); ctx.moveTo(lx + S.lightR, gy + 9); ctx.lineTo(mx + 6, my); ctx.stroke(); ctx.setLineDash([]);
    // the lamp on the wall
    const a = Math.atan2(gy - my, lx - mx);
    ctx.save(); ctx.translate(mx, my);
    ctx.fillStyle = COL.woodDark; ctx.fillRect(-4, -26, 8, 26);
    ctx.rotate(a); ctx.fillStyle = '#5a5a80'; rr(-14, -10, 26, 20, 5); ctx.fill(); ctx.fillStyle = '#fff4be'; rr(8, -8, 6, 16, 2); ctx.fill();
    ctx.restore();
  }
  function draw(st) {
    const cx = st.cam.x, t = G.clock, P = st.P, gy = S.ground, cone = coneLen(st), sn = st.sn, pl = plan(st);
    K.sky(cx, t, { moonX: 770, moonY: 86, moonR: 38 });
    K.skyline(cx, { y: S.ramp + 24 });
    if (st.gold.cloud) {
      // the gold moon cloud (gold help)
      ctx.fillStyle = 'rgba(255,197,61,0.85)';
      for (const [dx, dy, r] of [[-34, 6, 17], [-12, -4, 22], [14, 2, 19], [36, 8, 14]]) { circle(770 + dx + Math.sin(t * 0.6) * 5, 92 + dy, r); ctx.fill(); }
    }
    ctx.save(); ctx.translate(-Math.round(cx * 10) / 10, 0);
    drawWall(cx);
    for (let x = Math.floor((cx - 60) / 190) * 190 + 99; x < cx + W + 60; x += 190) K.lantern(x, S.ramp + 20, t, { s: 0.8 });
    K.ground(cx - 40, cx + W + 40, gy, 'stone');
    // the door at the end of the stretch
    {
      const ex = st.c.endX;
      if (ex > cx - 100 && ex < cx + W + 100) {
        ctx.fillStyle = 'rgba(255,217,138,0.18)'; rr(ex - 52, gy - 124, 104, 124, 10); ctx.fill();
        ctx.fillStyle = COL.woodDark; ctx.fillRect(ex - 42, gy - 114, 84, 114);
        ctx.fillStyle = COL.window; ctx.fillRect(ex - 36, gy - 108, 72, 108);
        ctx.fillStyle = COL.woodDark; ctx.fillRect(ex - 1.5, gy - 108, 3, 108); for (const dy of [36, 72]) ctx.fillRect(ex - 36, gy - dy, 72, 3);
      }
    }
    // gatehouses
    drawGateIf(st, cx, 0, 1, null, false);
    for (const q of st.c.posts) drawGateIf(st, cx, q.gate, q.openT, q.open ? q.openT : 0, q === P && !q.open && sn.zone && sn.zone.kind === 'arch' && !st.chase);
    for (const q of st.c.posts) {
      if (q.gate < cx - 140 || q.x0 > cx + W + 40) continue;
      for (const sp of q.spots) drawSpotBack(sp, t, q === P && !!st.chase && st.chase.burnt.some(z => z.spot === sp));
      for (const b of q.boards) {
        const sq = b.t > 0 ? Math.sin(b.t * 30) * 2 : 0;
        ctx.fillStyle = '#9a6e48'; ctx.fillRect(b.x - S.boardW, gy - 1 + sq, S.boardW * 2, 9);
        ctx.fillStyle = '#5a3824'; for (let i = -1; i <= 1; i++) ctx.fillRect(b.x + i * 18 - 1, gy - 1 + sq, 2, 9);
        ctx.fillStyle = '#d9dcef'; for (const dx of [-22, -4, 14]) { circle(b.x + dx, gy + 2 + sq, 1.4); ctx.fill(); }
        text('creaky', b.x, gy + 18, 10, 'rgba(255,231,168,0.85)', 'center', 'body');
      }
      for (const c of q.crates) {
        ctx.fillStyle = '#8a5a3a'; ctx.strokeStyle = '#3a2416'; ctx.lineWidth = 2.5; rr(c.x - S.crateW, gy - S.crateH, S.crateW * 2, S.crateH, 3); ctx.fill(); ctx.stroke();
        ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(c.x - S.crateW + 3, gy - S.crateH + 3); ctx.lineTo(c.x + S.crateW - 3, gy - 3); ctx.moveTo(c.x + S.crateW - 3, gy - S.crateH + 3); ctx.lineTo(c.x - S.crateW + 3, gy - 3); ctx.stroke();
      }
      for (const l of q.lights) drawLight(l, lightX(l, st.clock));
      for (const g of q.guards) if (AWAKE[g.state] || g.state === 'alert') drawCone(g, cone, g.state === 'alert' || g.notice > 0, st.gold.cloud);
      for (const d of q.dogs) drawDog(d, t);
      for (const g of q.guards) {
        const moving = g.state === 'patrol' || g.state === 'go' || g.state === 'return' || g.state === 'alert' || g.state === 'carry';
        const look = g.notice > 0 ? 'curious' : g.state === 'alert' || g.state === 'carry' ? 'alert' : g.state === 'dizzy' ? 'dizzy' : g.state === 'sleep' ? 'sleep' : g.state === 'react' || g.state === 'go' || g.state === 'look' || g.state === 'wake' ? 'curious' : 'patrol';
        const hop = g.state === 'alert' && q.crates.some(c => Math.abs(g.x - c.x) < 36) ? S.crateH : 0;
        K.guard(g.x, gy - hop, { state: look, face: g.face, walk: moving && !(g.notice > 0) ? st.clock * (g.state === 'alert' || g.state === 'carry' ? 16 : 9) + g.n : 0, lantern: g.kind !== 'sleep' && g.state !== 'carry' && g.state !== 'alert' });
      }
    }
    // pebbles on the ground
    for (const q of st.lying) { ctx.globalAlpha = clamp(q.t, 0, 1); K.pebble(q.x, gy - 3, 3.5); ctx.globalAlpha = 1; }
    // where a pebble would help (a prompt), and the thrower's aim ring
    const tp = pl.toss;
    if (tp.X != null && tp.show && G.introT <= 0 && !st.waiting) {
      const a = 0.55 + 0.3 * Math.sin(t * 7);
      ctx.strokeStyle = 'rgba(255,255,255,' + a + ')'; ctx.lineWidth = 3; ctx.setLineDash([7, 6]); ctx.lineDashOffset = -t * 20;
      ctx.beginPath(); ctx.ellipse(tp.X, gy + 5, 26, 8, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255,255,255,' + a + ')'; const by = gy - 40 + Math.sin(t * 6) * 4;
      ctx.beginPath(); ctx.moveTo(tp.X - 8, by); ctx.lineTo(tp.X + 8, by); ctx.lineTo(tp.X, by + 12); ctx.closePath(); ctx.fill();
      K.pebble(tp.X, by - 10, 5);
    }
    ctx.restore();
  }
  function drawGateIf(st, cx, gx, openT, pulled, lit, seen) { if (gx > cx - 150 && gx < cx + W + 130) drawGate(st, gx, openT, pulled, lit, seen); }
  function drawTop(st) {
    const cx = st.cam.x, t = G.clock, P = st.P, gy = S.ground, sn = st.sn, th = st.th, S0 = st.sneak, T0 = st.thr;
    ctx.save(); ctx.translate(-Math.round(cx * 10) / 10, 0);
    // the sneaker
    const z = sn.zone, kind = sn.hidden && z ? (z.spot ? z.spot.kind : 'G') : '';
    if (sn.state === 'caught' && sn.by) K.ninja(S0, sn.by.x, gy - 44, { pose: 'dizzy', face: -1 });
    else {
      const run = st.chase || sn.dashing || st.state === 'end';
      const pose = sn.slide > 0 ? 'sneak' : sn.state === 'dizzy' ? 'dizzy' : st.state === 'end' && !sn.moving ? 'cheer' : sn.pullT > 0 ? 'throw' : !sn.gr ? 'run' : sn.moving ? (run ? 'run' : 'sneak') : sn.hidden || st.state !== 'go' ? 'sneak' : 'idle';
      const alpha = kind === 'D' || kind === 'G' ? 0.62 : kind === 'A' ? 0.58 : kind === 'M' ? 0.8 : 1;
      if (sn.slide > 0) {
        // speed lines behind a slide
        ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.beginPath();
        for (const [dy, l] of [[-8, 34], [-20, 24], [-32, 30]]) { ctx.moveTo(sn.x - sn.face * 16, gy + dy); ctx.lineTo(sn.x - sn.face * (16 + l), gy + dy); }
        ctx.stroke();
      }
      K.ninja(S0, sn.x, gy - sn.y - snLift(sn), { pose, face: sn.face, alpha, rot: sn.slide > 0 ? -sn.face * 0.5 : undefined, t: pose === 'sneak' && !sn.moving ? 0 : undefined });
    }
    for (const q of st.c.posts) if (q.gate > cx - 140 && q.x0 < cx + W + 40) for (const sp of q.spots) drawSpotFront(sp, t, sn.hidden && z && z.spot === sp);
    // noise rings
    ctx.save(); ctx.beginPath(); ctx.rect(cx - 10, S.ramp + 17, W + 20, gy + 12 - S.ramp - 17); ctx.clip();
    for (const r of st.rings) { const u = r.t / r.life; K.noise(r.x, gy - 4, r.r * (0.25 + 0.75 * K.smooth(u)), 0.7 * (1 - u)); }
    ctx.restore();
    // the thrower, the aim and the pebbles in the air
    if (st.state === 'go') {
      const hx = th.x + th.face * 10, hy = S.ramp - 22, mx = th.mark, arc = 46 + Math.abs(mx - hx) * 0.12;
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      for (let k = 1; k < 9; k++) { const u = k / 9; circle(lerp(hx, mx, u), lerp(hy, gy - 4, u) - Math.sin(u * Math.PI) * arc, 2.2); ctx.fill(); }
      ctx.strokeStyle = PCOL[T0]; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.ellipse(mx, gy + 5, 20, 6.5, 0, 0, TAU); ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(mx, gy + 5, 20, 6.5, 0, 0, TAU); ctx.stroke();
      // who would hear it: a little ear mark over that guard
      if (!st.chase && !P.open) {
        let g = null, bd = S.hear, busy = false;
        for (const q of P.guards) { const d = Math.abs(q.x - mx); if (!HEARS[q.state] || d > S.hear) continue; const b = !!BUSY[q.state]; if (!g || (busy && !b) || (b === busy && d < bd)) { g = q; bd = d; busy = b; } }
        if (g) { ctx.strokeStyle = PCOL[T0]; ctx.lineWidth = 3; ctx.setLineDash([4, 4]); circle(g.x, gy - 22, 27); ctx.stroke(); ctx.setLineDash([]); }
      }
    }
    K.ninja(T0, th.x, S.ramp, { pose: st.state === 'end' && !th.moving ? 'cheer' : th.anim > 0 ? 'throw' : th.moving ? 'run' : 'idle', face: th.face, item: th.pouch >= 1 && st.state === 'go' && th.anim <= 0 ? 'pebble' : undefined });
    for (const q of st.pebbles) K.pebble(q.x, q.y, 4.5);
    if (st.owl) drawOwl(st.owl, t);
    K.drawParts(st, cx);
    ctx.restore();
    // hidden or seen: the eye over the sneaker
    if (st.state === 'go' && sn.state === 'ok' && G.introT <= 0) {
      const ex = sn.x - cx, ey = gy - sn.y - snLift(sn) - 44;
      if (sn.seen > 0) eye(ex, ey, true, sn.seen, 1.25 + 0.15 * Math.sin(t * 20));
      else if (sn.hidden) eye(ex, ey + 4, false, 0, 1.1);
    }
    K.drawPops(st, cx, 0);
  }

  /* ---------- HUD ---------- */
  function hud(st) {
    const big = hudBig(), z = big ? 1.35 : 1, play = G.mode === 'play' || G.mode === 'paused', P = st.P, sn = st.sn, th = st.th;
    let timeX0;
    {
      const fs = big ? 20 : 14, h = big ? 40 : 28, tm = fmtTime(G.time), a = 'Gate ' + Math.min(P.k + 1, st.c.posts.length) + '/' + st.c.posts.length, b = 'Spotted ' + st.stats.spotted;
      ctx.font = FONT(fs);
      const w1 = ctx.measureText(tm).width, w2 = ctx.measureText(a).width, w3 = ctx.measureText(b).width, gap = fs * 0.9;
      const w = w1 + w2 + w3 + gap * 2 + 30, x0 = pill(W - 14, 12, w, h, 'right'), cy = 12 + h / 2 + 0.5;
      text(tm, x0 + 15, cy, fs, st.waiting ? '#aab' : C.paper, 'left', 'body');
      text(a, x0 + 15 + w1 + gap, cy, fs, '#cfd6ff', 'left', 'body');
      text(b, x0 + w - 15, cy, fs, st.stats.spotted ? '#ffb0a0' : '#d9ffd0', 'right', 'body');
      timeX0 = x0;
    }
    K.drawMsg(st, st.waiting ? { text: K.BREAK, col: '#ffffff', t: 1, life: 2 } : st.msg, timeX0);
    if (!play) return;
    const pl = plan(st), sp = pl.sneak, tp = pl.toss, A = st.sneak, B = st.thr;
    {
      const bx = K.panel(A, 'sneaker', 250, 58, z), cy = bx.y + 27 * z, chh = 23 * z, qt = K.quiet(A), cw = (bx.w - 24 * z - 12 * z) / 3;
      const run = !!st.chase;
      K.chip(bx.x + 12 * z, cy, cw, chh, (qt ? '' : K.key(A, 'lr') + ' ') + (run ? 'RUN' : 'CREEP'), (run && !!sp.dir) || (sp.mode === 'go' && sp.safe && !sn.moving), sn.moving, z);
      if (run) K.chip(bx.x + 12 * z + cw + 6 * z, cy, cw, chh, (qt ? '' : K.key(A, 'down') + ' ') + 'SLIDE', sp.slide, sn.slide > 0, z);
      else K.chip(bx.x + 12 * z + cw + 6 * z, cy, cw, chh, (qt ? '' : K.key(A, 'act') + ' ') + (sp.mode === 'pull' || sp.mode === 'lever' ? 'LEVER' : 'DASH'), sp.mode === 'pull', sn.dashing, z);
      K.chip(bx.x + 12 * z + 2 * (cw + 6 * z), cy, cw, chh, (qt ? '' : K.key(A, 'up') + ' ') + 'HOP', sp.jump, !sn.gr, z);
    }
    {
      const bx = K.panel(B, 'pebbles', 250, 58, z), cy = bx.y + 27 * z, chh = 23 * z, qt = K.quiet(B), cw = (bx.w - 24 * z - 12 * z) / 3, n = Math.floor(th.pouch + 0.001);
      K.chip(bx.x + 12 * z, cy, cw, chh, (qt ? '' : K.key(B, 'lr') + ' ') + 'WALK', !!tp.dir, th.moving, z);
      K.chip(bx.x + 12 * z + cw + 6 * z, cy, cw, chh, (qt ? '' : K.key(B, 'up') + K.key(B, 'down') + ' ') + 'AIM', !tp.dir && !!tp.aim, false, z);
      K.chip(bx.x + 12 * z + 2 * (cw + 6 * z), cy, cw, chh, (qt ? '' : K.key(B, 'act') + ' ') + '●'.repeat(n) + '○'.repeat(S.pouch - n), tp.ready, th.anim > 0, z);
    }
    if (G.introT > 0 || st.state !== 'go' || st.waiting) return;
    const Pm = K.prompter(st), cx = st.cam.x;
    {
      let s = null, col = C.gold, pulse = false;
      const R = K.key(A, 'right'), Lf = K.key(A, 'left'), pale = '#cfd6ff';
      if (sn.state === 'ok') {
        if (sp.slide) { s = 'Slide! ' + K.key(A, 'down'); pulse = true; }
        else if (sp.jump) { s = (sp.why === 'guard' ? 'Hop over him! ' : sp.why === 'boards' ? 'Hop the creaky boards! ' : 'Hop! ') + K.key(A, 'up'); pulse = true; }
        else if (sp.boards) s = 'Creaky boards ahead: get ready to hop ' + K.key(A, 'up');
        else if (sp.mode === 'flee') { s = sp.dir ? 'Run ' + (sp.dir > 0 ? R : Lf) + '! Hide in ' + zoneName(sp.zone) + '!' : 'Stay hidden!'; pulse = true; }
        else if (sp.mode === 'go') s = sp.safe ? (sn.hidden ? 'Go now! ' + R : 'Sneak on ' + R) : 'Quick, to ' + zoneName(sp.zone) + ' ' + R;
        else if (sp.mode === 'back') { s = 'Back ' + Lf + '! Hide in ' + zoneName(sp.zone) + '!'; pulse = true; }
        else if (sp.mode === 'wait') { s = sp.wait < 7 ? 'Hidden. Wait for it...' : 'Hidden. Waiting for a pebble...'; col = pale; }
        else if (sp.mode === 'lever') s = 'To the lever ' + (sp.dir > 0 ? R : Lf);
        else if (sp.mode === 'pull') { s = 'Pull the lever! ' + K.key(A, 'act'); pulse = true; }
        else if (sp.mode === 'gate') s = 'Through the gate ' + R;
        else if (sp.mode === 'partner') { s = 'Wait for ' + NAMES[B] + '...'; col = pale; }
      }
      Pm.say(A, s, sn.x - cx, S.ground - sn.y - snLift(sn) - 56, col, pulse);
    }
    {
      let s = null, col = C.gold, pulse = false;
      const R = K.key(B, 'right'), Lf = K.key(B, 'left'), pale = '#cfd6ff';
      if (tp.mode === 'follow') s = 'Through the tower ' + R;
      else if (tp.mode === 'partner') { s = 'Wait for ' + NAMES[A] + '...'; col = pale; }
      else if (tp.mode === 'bonk') { s = th.pouch < 1 ? 'Pouch is filling...' : tp.ready ? 'Bonk! ' + K.key(B, 'act') : 'Bonk the guards! ' + (tp.dir ? (tp.dir > 0 ? R : Lf) : tp.aim ? (tp.aim > 0 ? K.key(B, 'up') : K.key(B, 'down')) : K.key(B, 'act')); pulse = tp.ready; if (th.pouch < 1) col = pale; }
      else if (tp.mode === 'toss') {
        if (th.pouch < 1) { s = 'Pouch is filling...'; col = pale; }
        else if (tp.ready) { s = 'Toss! ' + K.key(B, 'act'); pulse = true; }
        else if (!tp.show) s = 'Toss a pebble to lure the guard away! ' + K.key(B, 'act');
        else s = tp.dir ? 'Walk ' + (tp.dir > 0 ? R : Lf) + ' to the ring' : tp.aim ? 'Aim ' + (tp.aim > 0 ? 'farther ' + K.key(B, 'up') : 'nearer ' + K.key(B, 'down')) : null;
      }
      Pm.say(B, s, th.x - cx, S.ramp - 42, col, pulse);
    }
  }
  const medal = (t, spotted, caught) => K.medal(t <= 270 && spotted <= 2 && caught === 0, t <= 420 && caught <= 3);

  MODES.shadowsneak = {
    S, compile, plan, medal, zoneAt, stepGuard, forecast, hopSafe, nextZone,
    setup(st, L) {
      st.stats = { spotted: 0, caught: 0, escapes: 0, pebbles: 0, bonks: 0, hops: 0, slides: 0, owls: 0, posts: 0, clean: 0, helps: 0, roomT: [] };
      st.inT = [G.time, G.time]; st.personT = G.time;
      const def = LEVELS[G.levelIndex];
      st.totalPosts = (def.rooms || [def]).reduce((n, r) => n + (r.posts || []).length, 0);
      for (const row of L.grid) row.fill('.');
      room(st, L, 0);
    },
    room(k, L) { const st = G.mst; st.inT = [G.time, G.time]; st.personT = G.time; for (const row of L.grid) row.fill('.'); room(st, L, k); },
    step(dt) { tick(G.mst, dt); },
    draw() { const st = G.mst; if (!st.c) return; draw(st); K.hide(st); },
    drawTop() { const st = G.mst; K.unhide(st); if (st.c) drawTop(st); },
    hud() { const st = G.mst; if (st.c) hud(st); },
    stats() {
      const st = G.mst, s = st.stats;
      if (!s) return [];
      const out = [
        { label: 'Spotted', value: String(s.spotted) },
        { label: 'Caught', value: String(s.caught) },
        { label: 'Unseen gates', value: s.clean + ' of ' + st.totalPosts },
        { label: 'Medal', value: medal(G.time, s.spotted, s.caught) },
      ];
      out.push('Pebbles tossed: ' + s.pebbles + '.' + (s.bonks ? ' Guards bonked: ' + s.bonks + '.' : '') + (s.escapes ? ' Chases escaped: ' + s.escapes + '.' : '') + (s.slides ? ' Slides: ' + s.slides + '.' : ''));
      const hl = K.helpLine(s.helps); if (hl) out.push(hl);
      return out;
    },
  };

  /* ---------- sounds ---------- */
  Sfx.extra.shadowsneakStep = function () { this.tone(170, 0.05, 'triangle', 0.035, 110); };
  Sfx.extra.shadowsneakCreak = function () { this.tone(520, 0.34, 'sawtooth', 0.035, 760); this.tone(300, 0.2, 'sawtooth', 0.02, 420, 0.1); };
  Sfx.extra.shadowsneakEmpty = function () { this.tone(180, 0.06, 'square', 0.03, 140); };
  Sfx.extra.shadowsneakHuh = function () { this.tone(330, 0.1, 'triangle', 0.035, 470); };
  Sfx.extra.shadowsneakLever = function () { this.tone(150, 0.08, 'square', 0.05, 90); [196, 262, 330, 392].forEach((f, i) => this.tone(f, 0.09, 'triangle', 0.04, null, 0.1 + i * 0.06)); };
  Sfx.extra.shadowsneakWoof = function () { this.tone(260, 0.09, 'sawtooth', 0.05, 160); this.tone(240, 0.1, 'sawtooth', 0.05, 150, 0.16); };
  Sfx.extra.shadowsneakGotcha = function () { [392, 330, 262].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.05, null, i * 0.09)); };
  Sfx.extra.shadowsneakPlop = function () { this.tone(200, 0.18, 'sine', 0.06, 90); };
  Sfx.extra.shadowsneakWhoa = function () { this.tone(520, 0.16, 'sine', 0.04, 260); };
  Sfx.extra.shadowsneakSlide = function () { this.tone(900, 0.22, 'triangle', 0.035, 380); };
  Sfx.extra.shadowsneakHoot = function () { this.tone(392, 0.16, 'sine', 0.06, 370); this.tone(392, 0.28, 'sine', 0.06, 330, 0.22); };
  Sfx.extra.shadowsneakPhew = function () { this.tone(700, 0.3, 'sine', 0.035, 330); };
  Sfx.extra.shadowsneakCheck = function () { [523, 784, 1047].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.045, null, i * 0.07)); };
  Sfx.extra.shadowsneakFanfare = function () { [392, 523, 659, 784, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.055, null, i * 0.11)); };

  /* ---------- the level ---------- */
  NINJA.defs.shadowsneak = {
    name: 'Shadow Sneak', world: 28, kind: 'team', mode: 'shadowsneak', ownStep: true, ownHUD: true, noFalls: true, roomWord: 'Stretch',
    legend: {
      pip: '<kbd>A</kbd><kbd>D</kbd> creep / walk <kbd>W</kbd> hop / aim far <kbd>S</kbd> slide / aim near',
      bo: '<kbd>←</kbd><kbd>→</kbd> creep / walk <kbd>↑</kbd> hop / aim far <kbd>↓</kbd> slide / aim near',
      pad: 'stick creeps, walks, aims and slides, <span data-glyph="a"></span> hops,',
    },
    tip: 'Sneaker: creep from hiding spot to hiding spot. Thrower: toss pebbles so the guards look the other way!',
    act: { label: 'dash', labels: ['dash', 'toss'] },
    map: K.stubMap(),
    rooms: [
      { title: 'The Outer Yard', sneak: 0, look: 5.0, act: { label: 'dash', labels: ['dash', 'toss'] },
        tip: 'Pip sneaks, Bo tosses pebbles from the wall. A guard walks over to every "tik": slip past behind him!',
        posts: [
          { w: 640, items: ['S330L', 'D470'] },
          { w: 760, items: ['B200', 'P290-520', 'C600'] },
          { w: 800, items: ['S300R', 'A520:120', 'P590-690'] },
        ] },
      { title: 'The Sleepy Barracks', sneak: 1, look: 4.4, act: { label: 'dash', labels: ['toss', 'dash'] },
        tip: 'Swap! Bo sneaks, Pip tosses. Creep past the sleepers and hop ▲ over the creaky boards.',
        posts: [
          { w: 760, items: ['Z250', 'K330', 'B420', 'S640L'] },
          { w: 820, items: ['B200', 'Z290', 'C350', 'P430-590', 'D680'] },
          { w: 780, items: ['B190', 'S400L', 'K500', 'Z560', 'K630'] },
        ] },
      { title: 'The Kennel Court', sneak: 0, look: 4.0, act: { label: 'dash', labels: ['dash', 'toss'] },
        tip: 'Pip sneaks again. Guard dogs run to every sound, and two guards need two pebbles!',
        posts: [
          { w: 820, items: ['G280', 'D450', 'P520-640'] },
          { w: 820, items: ['B160', 'S380L', 'S460L', 'H610'] },
          { w: 840, items: ['M200', 'G330', 'P420-560', 'C620', 'B690'] },
        ] },
      { title: 'The Keep', sneak: 1, act: { label: 'dash', labels: ['toss', 'dash'] },
        tip: 'The last stretch! Bo sneaks. Searchlights sweep the yard: wait in a hiding spot until they pass.',
        posts: [
          { w: 800, items: ['L170-470:6', 'B330', 'S620L', 'D520'] },
          { w: 840, items: ['A220:110', 'P300-430', 'L400-640:5', 'H540', 'Z660'] },
          { w: 840, items: ['G230', 'D380', 'S480L', 'S560L', 'K640', 'M690'] },
        ] },
    ],
  };
})();
