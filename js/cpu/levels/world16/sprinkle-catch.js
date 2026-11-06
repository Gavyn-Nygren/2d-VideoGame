/* Pip & Bo - Computer partner brain for 16-4 Sprinkle Catch (mode 'sprinkle'). */
'use strict';

(() => {
  /* The computer is the other catcher. It presses the same keys a person does: ◀ ▶ run, ▲ jump (held for a full
     jump), ▼ to drop through a wafer (and to land softly on the jelly floor), and the action for a hip bump.
     Every reaction time it looks at what a person can see: the falling candy, spilled candy on the floor, the shaker,
     the gobstoppers and where the other player stands. For each candy it works out where it will be at basket height
     over each floor or wafer (the same falling rules everybody sees), how long it would take to get there (running,
     plus a jump or a drop for each wafer on the way, found on a small map of which wafer you can jump to from which),
     and goes for the best points-for-time catch it can still make. Hard also leaves a candy the other player will
     clearly get first. With nothing to catch it waits under the shaker (Normal and Hard read where it is heading).
     Getting up: from a floor or wafer it jumps when a jump from right there (worked out with the same jump rules)
     lands on the wafer it wants; otherwise it runs to a spot under or beside it.
     Gobstoppers: it guesses where each one bounces in the next 0.7 s and runs away from a hit (or jumps when cornered).
     Bumps: when the other player has candy, isn't shielded and is right beside it on the same level, it bumps. A bump
     dashing at it is on screen, so it hops over it sometimes (Easy seldom, Hard mostly). It leaves candy its own bump
     knocked out until the bumped one's turn to scoop it is over.
     Skill: Easy reacts slowly (about 0.5 s), aims its basket sloppily, sometimes goes for the wrong candy, dawdles,
     often forgets to dodge and seldom bumps. Normal reacts in about 0.25 s. Hard reacts in about 0.12 s, aims well,
     dodges every time and bumps when it can.
     What it reads: the candy, gobstoppers, shaker and surfaces in G.mst, and the other player's position and shield
     (all on screen). It never reads the other player's keys or the shaker's next pick before it shows. */
  const SK = {
    easy: { hop: 0.1, react: 0.6, aim: 16, miss: 0.3, dodge: 0.35, bump: 0.25, bumpGap: 7, chase: 0, lazy: 0.45, look: 0, jelly: false, wobble: 0.3, slack: 0.15 },
    normal: { hop: 0.4, react: 0.25, aim: 7, miss: 0.08, dodge: 0.75, bump: 0.45, bumpGap: 4.5, chase: 0.25, lazy: 0.06, look: 0.5, jelly: true, wobble: 0.08, slack: 0.05 },
    hard: { hop: 0.75, react: 0.12, aim: 2.5, miss: 0, dodge: 1, bump: 0.8, bumpGap: 3, chase: 0.55, lazy: 0, look: 1, jelly: true, wobble: 0, slack: 0 },
  };
  const skOf = s => (s <= 0.4 ? SK.easy : s < 0.9 ? SK.normal : SK.hard);
  const T = () => MODES.sprinkle.test;
  const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 0.75;

  // which surface can you get to from which (a jump up of at most 112 px with a small gap, or a drop), with a cost in s
  function graph(st) {
    const sf = st.surf, n = sf.length, e = [];
    for (let i = 0; i < n; i++) {
      e[i] = [];
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const a = sf[i], b = sf[j], gap = Math.max(0, b.x0 - a.x1, a.x0 - b.x1);
        if (b.y < a.y && a.y - b.y <= 112 && gap <= 100) e[i].push({ j, c: 0.55 + gap / 230 });
        else if (b.y > a.y && gap <= 160) e[i].push({ j, c: 0.3 + gap / 230 });
      }
    }
    // cheapest routes (tiny graph: Floyd-Warshall), with the first step of each
    const d = [], nx = [];
    for (let i = 0; i < n; i++) { d[i] = []; nx[i] = []; for (let j = 0; j < n; j++) { d[i][j] = i === j ? 0 : Infinity; nx[i][j] = -1; } for (const x of e[i]) { d[i][x.j] = x.c; nx[i][x.j] = x.j; } }
    for (let k = 0; k < n; k++) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (d[i][k] + d[k][j] < d[i][j]) { d[i][j] = d[i][k] + d[k][j]; nx[i][j] = nx[i][k]; }
    return { d, nx };
  }
  // a full jump from body b holding dir: the surface it lands on (-1: none within 1.4 s)
  function simJump(st, b, dir) {
    const P = T().SPRINKLE, jel = st.twist === 'jelly' && b.onFloor;
    let x = b.x, y = b.y, vx = b.vx, vy = -P.jumpV * (jel ? P.jellyJump : 1);
    const dt = 1 / 120;
    for (let t = 0; t < 1.4; t += dt) {
      vx = dir ? (Math.abs(vx) > P.vRun && Math.sign(vx) === dir ? vx : clamp(vx + dir * P.accA * dt, -P.vRun, P.vRun)) : vx - Math.sign(vx) * Math.min(Math.abs(vx), P.fricA * dt);
      vy = Math.min(P.maxFall, vy + P.g * dt);
      const pf = y + b.h;
      x = clamp(x + vx * dt, P.wallL, P.wallR - b.w); y += vy * dt;
      if (vy >= 0) {
        let best = null;
        for (const q of st.surf) {
          if (x + b.w <= q.x0 + 3 || x >= q.x1 - 3 || pf > q.y + 0.5 || y + b.h < q.y) continue;
          if (!best || q.y < best.y) best = q;
        }
        if (best) return best.i;
      }
    }
    return -1;
  }
  // where a gobstopper will be over the next secs (same bouncing rules)
  function gobPath(st, g, secs) {
    const P = T().SPRINKLE, out = [];
    let x = g.x, y = g.y, vx = g.vx, vy = g.vy;
    const dt = 1 / 60, grav = g.mega ? P.megaG : P.gobG;
    for (let t = 0; t < secs; t += dt) {
      const py = y;
      vy += grav * dt; x += vx * dt; y += vy * dt;
      if (x - g.r < P.wallL) { x = P.wallL + g.r; vx = Math.abs(vx); }
      if (x + g.r > P.wallR) { x = P.wallR - g.r; vx = -Math.abs(vx); }
      if (y - g.r < P.ceilY && vy < 0) { y = P.ceilY + g.r; vy = Math.abs(vy) * 0.5; }
      if (vy > 0) for (const q of st.surf) {
        if (x < q.x0 - g.r * 0.25 || x > q.x1 + g.r * 0.25 || py + g.r > q.y + 0.5 || y + g.r < q.y) continue;
        y = q.y - g.r; vy = -(st.twist === 'jelly' && q.floor ? P.jellyBounce : g.mega ? P.megaBounce : P.gobBounce); break;
      }
      out.push({ t: t + dt, x, y });
    }
    return out;
  }

  cpuBrain('sprinkle', {
    noIdleStop: true, // rounds end on the clock, so a match against nobody plays out (the computer wins)
    bubblePos(p) { return { x: p.x + p.w / 2, y: p.y - 22 }; },
    reset(S) { S.goal = null; S.g = null; },
    think(S, p, o, dt, info) {
      const st = info.mst, out = {};
      if (!st.pl || !st.surf || !st.shaker) return out;
      const sk = skOf(info.skill), m = G.match, P = T().SPRINKLE, me = st.pl[p.id], op = st.pl[o.id];
      if (info.frozen) {
        if (m && m.phase === 'end' && m.end && !S.saidEnd) {
          S.saidEnd = true;
          if (m.end.winner === p.id) cpuSay(p, 'Yum! I win!'); else if (m.end.winner === o.id) cpuSay(p, 'Good catching!');
        }
        S.wasFrozen = true; S.jumping = false;
        return out;
      }
      if (S.wasFrozen) { S.wasFrozen = false; S.saidEnd = false; S.goal = null; S.thinkT = 0; S.lazyT = 0; S.g = null; }
      const key = st.twist + ':' + st.surf.length;
      if (!S.g || S.gKey !== key) { S.g = graph(st); S.gKey = key; }
      const cx = p.x + p.w / 2, feet = p.y + p.h;
      // the surface I'm on (or will land on)
      const mySurf = p.grounded ? me.surf : Math.max(0, T().surfBelow(st, cx, feet));
      // things a person would say (1-player mode only; cpuSay checks)
      if (me.popT < 0.02 && me.pop === 'Boing!') cpuSay(p, 'Boing! Whoa!');
      if (me.popT < 0.02 && me.pop === 'Oopsie!') cpuSay(p, 'Hey, my candy!');
      if (S.lastBumps !== st.stat.bumps[p.id]) { if (S.lastBumps != null) cpuSay(p, 'Hee hee! Bump!'); S.lastBumps = st.stat.bumps[p.id]; }
      if (S.lastGold !== st.stat.gold[p.id]) { if (S.lastGold != null) cpuSay(p, 'Golden! Yum!'); S.lastGold = st.stat.gold[p.id]; }

      S.thinkT = (S.thinkT || 0) - dt;
      if (S.thinkT <= 0) {
        S.thinkT = sk.react * (0.7 + Math.random() * 0.6);
        const g = choose(S, st, p, o, me, op, sk, mySurf);
        if (!S.goal || !g || g.id !== S.goal.id) S.aim = gauss() * sk.aim;
        S.goal = g;
      }
      let goal = S.goal;
      // a goal candy that is gone (caught or plopped) is dropped
      if (goal && goal.c && !st.candy.includes(goal.c)) { goal = S.goal = null; S.thinkT = Math.min(S.thinkT, 0.05 + sk.react * 0.4); }
      let tx = cx, ts = mySurf;
      if (goal) {
        ts = goal.surf; tx = goal.x;
        if (goal.c && goal.c.state === 'fall' || goal.c && !goal.c.rest) {
          // follow the candy's latest guess (people track a falling candy with their eyes)
          const q = st.surf[ts], pr = T().predict(st, goal.c, q.y - p.h - 6);
          if (pr) tx = pr.x + S.aim; else { S.goal = null; }
        }
      } else {
        // nothing to catch: wait under the shaker (Normal and Hard look where it is heading)
        const sh = st.shaker;
        if (S.thinkT >= sk.react * 0.69 || S.lookFor !== sh.n) { S.lookFor = sh.n; S.look = Math.random() < sk.look; } // (decided once per drop)
        const look = sh.state === 'move' && S.look ? sh.tx : sh.x, ocx = o.x + o.w / 2;
        tx = look; ts = 0;
        // the other one is already there (or it's the cloud): cover the other side instead (Normal and Hard)
        if (st.twist === 'gumdrop' || (sk.look > 0 && Math.abs(ocx - look) + 40 < Math.abs(cx - look))) tx = ocx < 480 ? 660 : 300;
        if (Math.abs(tx - cx) < 50) tx = cx;
      }
      tx = clamp(tx, P.wallL + p.w / 2 + 1, P.wallR - p.w / 2 - 1);
      nav(S, st, p, me, out, tx, ts, mySurf, sk);
      // bump the other player when it's right there with candy
      const dx = o.x + o.w / 2 - cx, same = Math.abs(o.y + o.h - feet) < 14;
      const canBump = op.score > 0 && op.shield <= 0 && o.stun <= 0 && me.dashCD <= 0 && me.dashT <= 0 && same && p.stun <= 0;
      if (canBump && Math.abs(dx) < 62 && Math.abs(dx) > 4) {
        if (S.bumpRoll == null) S.bumpRoll = Math.random() < sk.bump;
        if (S.bumpRoll && (S.bumpWait || 0) <= 0 && (!goal || goal.kind !== 'catch' || goal.t > 0.45)) {
          out.act = 'tap'; out.left = dx < 0; out.right = dx > 0;
          S.bumpRoll = null; S.bumpWait = sk.bumpGap * (0.7 + Math.random() * 0.6);
        }
      } else if (Math.abs(dx) > 110) S.bumpRoll = null;
      S.bumpWait = (S.bumpWait || 0) - dt;
      // jelly floor: hold ▼ to land softly (Normal and Hard)
      if (st.twist === 'jelly' && sk.jelly && !p.grounded && p.vy > 200 && mySurf === 0 && feet > P.floorY - 60 && !S.wantBounce) out.down = true;
      // a bump dashing at me (the dash is on screen): hop over it, sometimes (Hard most of the time)
      if (op.dashT > 0 && p.grounded && me.shield <= 0 && p.stun <= 0 && same && Math.sign(dx) === -op.dashDir && Math.abs(dx) < 120) {
        if (S.hopFor !== st.stat.dashes[o.id]) { S.hopFor = st.stat.dashes[o.id]; S.hopRoll = Math.random() < sk.hop; }
        if (S.hopRoll) { out.jump = true; S.jumping = true; out.act = false; }
      } else if (op.dashT <= 0) S.hopFor = null;
      // gobstoppers: run from a hit
      dodge(S, st, p, me, out, sk, dt);
      // Easy dawdles now and then (a kid watching the other one)
      if (sk.lazy && cpuChance(sk.lazy, dt)) S.lazyT = 0.25 + Math.random() * 0.5;
      if ((S.lazyT = (S.lazyT || 0) - dt) > 0) { out.left = out.right = false; out.act = false; }
      if (sk.wobble && Math.random() < sk.wobble * dt * 6) { out.left = out.right = false; }
      return out;
    },
  });

  // pick what to go for: { id, kind, c, x, surf, t, val }
  function choose(S, st, p, o, me, op, sk, mySurf) {
    const P = T().SPRINKLE, cx = p.x + p.w / 2, ocx = o.x + o.w / 2, og = o.grounded ? op.surf : Math.max(0, T().surfBelow(st, ocx, o.y + o.h));
    const opts = [];
    const cost = (x, s, from, fx) => Math.abs(x - fx) / P.vRun + (s === from ? 0 : S.g.d[from][s]);
    for (const c of st.candy) {
      const pts = c.pts * (c.kind === 'gold' ? 1.6 : 1);
      if (c.rest) {
        if (c.delay > 0.3) continue;
        // (candy my own bump just knocked out can't be scooped by me for a moment: the bumped one gets first try)
        const t = Math.max(cost(c.x, c.surf, mySurf, cx), c.lockT > 0 && c.lock === p.id ? c.lockT + 0.05 : 0);
        if (t > c.life - 0.2) continue;
        const ot = cost(c.x, c.surf, og, ocx);
        let val = pts / (0.5 + t) * 1.1;
        if (sk.chase > 0.3 && ot < t * 0.6) val *= 0.4;
        opts.push({ id: c.id, kind: 'scoop', c, x: c.x, surf: c.surf, t, val });
        continue;
      }
      if (c.vy < -60 && c.state !== 'spill') continue;
      for (const q of st.surf) {
        if (S.g.d[mySurf][q.i] === Infinity) continue;
        const pr = T().predict(st, c, q.y - p.h - 6);
        if (!pr || pr.x < q.x0 + 6 || pr.x > q.x1 - 6) continue;
        const t = cost(pr.x, q.i, mySurf, cx);
        if (t > pr.t + sk.slack + 0.04) continue;
        let val = pts / (0.45 + t) * (1 + 0.15 * (q.i === mySurf));
        // Hard (and sometimes Normal) leave a catch the other one will clearly get first
        const ot = cost(pr.x, q.i, og, ocx);
        if (Math.random() < sk.chase + 0.3 && ot < pr.t) { if (ot + 0.12 < t) val *= 0.3; else if (ot < t + 0.08) val *= 0.7; }
        opts.push({ id: c.id, kind: 'catch', c, x: pr.x, surf: q.i, t: pr.t, val });
      }
    }
    if (!opts.length) {
      // chase the other one for a bump (Normal and Hard), when it has candy and isn't shielded
      if (op.score > 1 && op.shield <= 0 && me.dashCD <= 0 && me.shield <= 0 && Math.random() < sk.chase * 0.5 && Math.abs(ocx - cx) < 260 && Math.abs(ocx - cx) > 40) return { id: 'chase', kind: 'chase', c: null, x: ocx, surf: og, t: 1, val: 0 };
      return null;
    }
    opts.sort((a, b) => b.val - a.val);
    // Easy sometimes goes for the wrong one
    if (opts.length > 1 && Math.random() < sk.miss) return opts[1 + Math.floor(Math.random() * (opts.length - 1))];
    return opts[0];
  }

  // get to x on surface ts: run there, or jump/drop toward the next surface on the way
  function nav(S, st, p, me, out, tx, ts, mySurf, sk) {
    const P = T().SPRINKLE, cx = p.x + p.w / 2, sf = st.surf;
    // keep holding jump while rising (a full jump)
    if (S.jumping) { if (p.vy < 0 && !p.grounded) out.jump = true; else S.jumping = false; }
    if (!p.grounded) {
      // in the air: steer toward the target (onto the wafer we're aiming for)
      const q = sf[S.airTo != null ? S.airTo : ts] || sf[ts];
      let ax = tx;
      if (q && !q.floor && S.airTo != null) ax = clamp(tx, q.x0 + 14, q.x1 - 14);
      const d = ax - cx;
      out.right = d > 5; out.left = d < -5;
      return;
    }
    S.airTo = null;
    if (ts === mySurf) {
      const d = tx - cx;
      out.right = d > 4; out.left = d < -4;
      return;
    }
    const nx = S.g.nx[mySurf][ts];
    if (nx < 0) { const d = tx - cx; out.right = d > 4; out.left = d < -4; return; }
    const a = sf[mySurf], b = sf[nx];
    if (b.y < a.y) {
      // up: jump when a jump from right here lands on it
      const aimX = clamp(tx, b.x0 + 16, b.x1 - 16), dir = Math.sign(aimX - cx);
      const body = { x: p.x, y: p.y, vx: p.vx, w: p.w, h: p.h, onFloor: !!a.floor };
      if (S.jumpCheckT == null || (S.jumpCheckT -= 1 / 120) <= 0) {
        S.jumpCheckT = 0.05;
        if (simJump(st, body, dir) === nx || (dir && simJump(st, body, 0) === nx && Math.abs(aimX - cx) < 40)) {
          out.jump = true; S.jumping = true; S.airTo = nx;
          out.right = dir > 0; out.left = dir < 0;
          return;
        }
      }
      // otherwise run to a spot under it, or to the edge nearest it
      const o0 = Math.max(a.x0, b.x0) + 16, o1 = Math.min(a.x1, b.x1) - 16;
      const lx = o1 > o0 ? clamp(aimX, o0, o1) : b.x0 > a.x1 ? a.x1 - 14 : a.x0 + 14;
      const d = lx - cx;
      if (Math.abs(d) < 6) { out.right = dir > 0; out.left = dir < 0; } else { out.right = d > 0; out.left = d < 0; }
      return;
    }
    // down: drop through a wafer if the next one is right below, otherwise walk off the edge toward it
    const under = cx > b.x0 + 8 && cx < b.x1 - 8;
    if (under && !a.floor) {
      const between = sf.some(q => q.i !== a.i && q.i !== b.i && q.y > a.y && q.y < b.y && cx > q.x0 && cx < q.x1);
      if (!between) { out.down = true; S.airTo = nx; const d = tx - cx; out.right = d > 30; out.left = d < -30; return; }
    }
    const goX = clamp(tx, b.x0 + 14, b.x1 - 14), d = goX - cx;
    out.right = d > 0; out.left = d < 0;
    if (Math.abs(d) < 4) { out.right = cx < (a.x0 + a.x1) / 2 ? false : true; out.left = !out.right; }
  }

  // run away from a gobstopper about to land on us (Easy often forgets)
  function dodge(S, st, p, me, out, sk, dt) {
    if (!st.gobs.length || p.stun > 0 || me.shield > 0.25) { S.dodgeT = 0; return; }
    S.dodgeCheck = (S.dodgeCheck || 0) - dt;
    if (S.dodgeCheck <= 0) {
      S.dodgeCheck = Math.max(0.05, sk.react * 0.5);
      S.threat = null;
      const cx = p.x + p.w / 2;
      for (const g of st.gobs) {
        if (g.popT >= 0) continue;
        for (const q of gobPath(st, g, 0.7)) {
          if (Math.abs(q.x - cx) < g.r + p.w / 2 + 6 && q.y + g.r > p.y - 16 && q.y - g.r < p.y + p.h) {
            S.threat = { x: q.x, t: q.t, g };
            break;
          }
        }
        if (S.threat) break;
      }
      if (S.threat && S.threatG !== S.threat.g) { S.threatG = S.threat.g; S.dodgeRoll = Math.random() < sk.dodge; }
      if (!S.threat) S.threatG = null;
    }
    if (!S.threat || !S.dodgeRoll) return;
    const P = T().SPRINKLE, cx = p.x + p.w / 2, g = S.threat.g;
    let dir = Math.sign(cx - g.x) || 1;
    // cornered against a wall: go the other way under it or jump
    if ((dir < 0 && cx < P.wallL + 50) || (dir > 0 && cx > P.wallR - 50)) {
      dir = -dir;
      if (p.grounded && g.y > p.y - 10) { out.jump = true; S.jumping = true; }
    }
    // a low ball rolling at us with room to spare: hop over it
    if (p.grounded && g.y + g.r > p.y + p.h - 20 && g.vy < 0 && Math.abs(g.x - cx) < 90 && Math.sign(g.vx) === Math.sign(cx - g.x)) { out.jump = true; S.jumping = true; }
    out.right = dir > 0; out.left = dir < 0; out.down = false;
    if (out.act && Math.sign((G.players[1 - p.id].x) - p.x) !== dir) out.act = false;
  }
})();
