#!/usr/bin/env node
// 24-4 Pillow Fort Battle: an adversarial review. Scripted "people" and direct probes that try to break the level.
//   node tools/w24/pillowfort-adversary.js [--seeds=1,2,3] [--only=steal]
// Probes (each prints PASS / FAIL):
//   steal    a toy lying just over the rug line can't be grabbed (walk-over or action) by the other player
//   shield   a player still "safe" after a Fwump doesn't soak up tosses: they fly through to the fort
//   reset    every round starts clean: forts match the layout, teddies steady, empty hands, no toys or tosses
//   stuck    the computer holding a pillow with nowhere to build drops it instead of standing there forever
//   aimfwump a Fwump while aiming cancels the aim and empties the hands; no toss fires afterwards
//   buffer   a press held through the short pause after a toss starts the aim when the pause ends; a tap is let go
//   tie      two even time-ups in a row (same forts, same teddies) go to the tiebreak, and sudden death has no gold help and a wobbly teddy
//   reload   leaving for another level and coming back leaves no fort tiles or state behind
//   people   scripted people vs the computer: a turtle (only builds, drops plushies), a goalie (jumps on its shield
//            column), a line camper (waits at the rug line grabbing at everything) vs Normal and Hard: should lose;
//            a kid vs Easy should win some.
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const seeds = opt('seeds', '1,2,3').split(',').map(Number), only = opt('only', '');
let fails = 0;
const check = (ok, line) => { console.log((ok ? 'PASS ' : 'FAIL ') + line); if (!ok) fails++; };
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.addInitScript(() => {
    const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    let seeded = gen(1); window.__seed = n => { seeded = gen((n >>> 0) || 1); }; Math.random = () => seeded();
  });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  await page.evaluate(() => {
    const P = window.__pipbo, G = P.G;
    window.__lvl = () => P.LEVELS.findIndex(l => l.name === 'Pillow Fort Battle');
    window.__start = (cpu) => {
      G.manual = true; P.CPU.filter = null; P.CPU.skillOf = [null, null];
      G.cpuOn = cpu || [false, false];
      P.loadLevel(window.__lvl());
      G.cpuOn = cpu || [false, false]; G.introT = 0;
      let n = 0; while (G.match.phase !== 'live' && n++ < 4000) P.step(P.DT);
    };
    window.__run = s => { for (let k = 0; k < Math.round(s / P.DT); k++) P.step(P.DT); };
    window.__put = (k, x, y) => { const p = G.players[k]; p.x = x - p.w / 2; p.y = (y || 480) - p.h; p.vx = 0; p.vy = 0; };
    window.__clear = () => { for (const p of G.players) for (const key in p.input) p.input[key] = false; };
  });
  const want = n => !only || only === n;

  if (want('steal')) {
    const r = await page.evaluate(() => {
      const P = window.__pipbo, G = P.G; window.__start();
      const st = G.mst; st.spawnT = 999; st.items = [];
      const out = {};
      // walk-over: a toy resting on Bo's carpet just over the line, Pip pressed against the line
      const pf = P.MODES.pillowfort;
      st.items.push({ id: 900, t: 'plush', v: 'duck', x: 486, y: 469, vx: 0, vy: 0, rest: true, age: 0, spin: 0 });
      window.__put(0, 470); G.players[0].input.right = true;
      window.__run(0.3); window.__clear();
      out.walk = st.pl[0].hold ? st.pl[0].hold.t : null;
      // action: same toy, Pip presses the action next to the line
      st.pl[0].hold = null; st.items = [{ id: 901, t: 'plush', v: 'duck', x: 490, y: 469, vx: 0, vy: 0, rest: true, age: 0, spin: 0 }];
      window.__put(0, 462); P.step(P.DT); G.players[0].pendingAct = true; P.step(P.DT); window.__run(0.05);
      out.act = st.pl[0].hold ? st.pl[0].hold.t : null;
      // and in mid-air as the box pops Bo's toy out: Pip jumps at the line mashing the action
      st.pl[0].hold = null; st.items = []; st.spawnT = 0.01; window.__put(0, 470);
      let got = null;
      for (let k = 0; k < 120; k++) {
        G.players[0].input.right = true; G.players[0].input.jump = k < 30; if (k === 2) G.players[0].pendingJump = true;
        if (k % 3 === 0) G.players[0].pendingAct = true;
        P.step(P.DT);
        if (st.pl[0].hold && !got) got = st.items.length;
      }
      window.__clear();
      const left = st.items.filter(i => i.x > 480).length;
      out.air = { gotOne: !!st.pl[0].hold, boToysLeft: left };
      return out;
    });
    check(!r.walk, `steal: Pip walking into the line doesn't pick up Bo's toy (held ${r.walk})`);
    check(!r.act, `steal: Pip's action at the line doesn't grab Bo's toy (held ${r.act})`);
    check(r.air.boToysLeft >= 1, `steal: Pip jumping at the line as the box pops doesn't take Bo's toy (Bo's toys left ${r.air.boToysLeft})`);
  }

  if (want('shield')) {
    const r = await page.evaluate(() => {
      const P = window.__pipbo, G = P.G, T = P.MODES.pillowfort.test; window.__start();
      const st = G.mst; st.spawnT = 999; st.items = [];
      // Bo stands on the carpet in front of his fort, just Fwumped (safe); Pip lobs at Bo's front column
      const q = G.players[1]; window.__put(1, 690);
      st.pl[1].safe = 5; st.pl[1].dizzy = 0;
      window.__put(0, 300);
      const p = G.players[0];
      // a toss whose flight passes through Bo (aimed at the column right behind him)
      const before = st.fort[1].map(c => c.length).reduce((a, b) => a + b, 0), kn0 = st.stat.knocked[0];
      let found = false;
      for (let c = 0; c <= 1 && found === false; c += 0.005) {
        const pts = T.path(st, 0, T.launch(p, c, 0), 2.6, 1), e = pts[pts.length - 1];
        if (!e || !e.hit || e.hit.kind !== 'block') continue;
        if (pts.some(b => b.x > q.x - 6 && b.x < q.x + q.w + 6 && b.y > q.y - 6 && b.y < q.y + q.h + 6)) found = c;
      }
      if (found === false) return { found: false };
      st.shots.push(Object.assign({ t: 'plush', v: 'duck', k: 0, bounces: 0, age: 0, spin: 0, trail: [], hitSet: {} }, (() => { const l = T.launch(p, found, 0); return { x: l.x, y: l.y, vx: l.vx, vy: l.vy }; })()));
      let maxX = 0;
      for (let k = 0; k < 300; k++) { P.step(P.DT); for (const sh of st.shots) maxX = Math.max(maxX, sh.x); }
      return { found: true, maxX: Math.round(maxX), boBack: Math.round(q.x + q.w), fw: st.stat.fwumps[0] };
    });
    check(r.found && r.maxX > r.boBack + 4 && r.fw === 0, `shield: a toss through a safe Bo flies on past him (found ${r.found}, toss reached x ${r.maxX}, Bo's back at ${r.boBack}, Fwumps ${r.fw})`);
  }

  if (want('reset')) {
    const r = await page.evaluate(() => {
      const P = window.__pipbo, G = P.G; window.__start([true, true]);
      P.CPU.skillOf = ['hard', 'hard'];
      const bad = [];
      let last = G.match.phase, n = 0, checked = 0;
      while (G.mode === 'play' && n++ < 120 * 600) {
        P.step(P.DT);
        const m = G.match, st = G.mst;
        if (m.phase === 'ready' && last !== 'ready') {
          checked++;
          const L = P.MODES.pillowfort.test.PFB_ROUNDS[st.key];
          for (const k of [0, 1]) {
            const h = st.fort[k].map(c => c.length), gold = st.gold[k] >= 2;
            const exp = L.h.map((x, i) => x + (gold && i >= 4 ? 1 : 0));
            if (h.join() !== exp.join()) bad.push(`r${m.round} fort ${k} ${h} vs ${exp}`);
            if (st.ted[k].fallen || st.ted[k].wob !== (L.wob || 0)) bad.push(`r${m.round} teddy ${k} wob ${st.ted[k].wob}`);
            if (st.pl[k].hold || st.pl[k].aim || st.pl[k].dizzy) bad.push(`r${m.round} hands ${k}`);
          }
          if (st.items.length || st.shots.length || st.toppled.length || st.ended) bad.push(`r${m.round} leftovers`);
          // the grid matches the forts
          for (const k of [0, 1]) for (let i = 0; i < 7; i++) {
            const c = k ? 30 - i : 1 + i; let hh = 0; for (let j = 0; j < 8; j++) if (G.level.grid[15 - j][c] === 'P') hh++;
            if (hh !== st.fort[k][i].length) bad.push(`r${m.round} grid col ${c}`);
          }
        }
        last = m.phase;
      }
      return { bad, checked, mode: G.mode };
    });
    check(r.checked >= 3 && !r.bad.length, `reset: ${r.checked} round starts checked, ${r.bad.length ? r.bad.slice(0, 4).join('; ') : 'all clean'}`);
  }

  if (want('stuck')) {
    const r = await page.evaluate(() => {
      const P = window.__pipbo, G = P.G; window.__start([false, true]);
      P.CPU.skillOf = [null, 'hard'];
      const st = G.mst; st.spawnT = 999; st.items = [];
      // every column of Bo's fort is full: there is nowhere to build
      const mk = () => ({ kind: 'c', hp: 1, max: 1, col: '#fff', dropY: 0, squish: 0, wob: 0 });
      for (let i = 0; i < 7; i++) st.fort[1][i] = Array.from({ length: 8 }, mk);
      // (keep the grid in step)
      for (let i = 0; i < 7; i++) for (let j = 0; j < 8; j++) G.level.grid[15 - j][30 - i] = 'P';
      window.__put(1, 600); st.pl[1].hold = { t: 'pillow', v: '' };
      let heldFor = 0;
      for (let k = 0; k < 120 * 16; k++) { G.players[0].input.left = k % 240 < 5; P.step(P.DT); if (st.pl[1].hold) heldFor += P.DT; }
      return { heldFor: Math.round(heldFor), still: !!st.pl[1].hold };
    });
    check(!r.still, `stuck: the computer with a pillow and a full fort lets it go (held ${r.heldFor} s of 16)`);
  }

  if (want('aimfwump')) {
    const r = await page.evaluate(() => {
      const P = window.__pipbo, G = P.G, T = P.MODES.pillowfort.test; window.__start();
      const st = G.mst; st.spawnT = 999; st.items = [];
      window.__put(0, 300); window.__put(1, 650);
      st.pl[1].hold = { t: 'plush', v: 'duck' };
      G.players[1].pendingAct = true; G.players[1].input.act = true;
      window.__run(0.4);
      const aiming = st.pl[1].aim;
      // a toss hits Bo (put it right on him)
      const q = G.players[1];
      st.shots.push({ t: 'plush', v: 'duck', k: 0, x: q.x + q.w / 2, y: q.y + 5, vx: 50, vy: 10, bounces: 0, age: 0, spin: 0, trail: [], hitSet: {} });
      P.step(P.DT); P.step(P.DT);
      const after = { aim: st.pl[1].aim, hold: !!st.pl[1].hold, dizzy: st.pl[1].dizzy > 0, fw: st.stat.fwumps[0] };
      const thr = st.stat.throws[1];
      window.__run(1.5); G.players[1].input.act = false; window.__run(0.3);
      return { aiming, after, threwLater: st.stat.throws[1] - thr };
    });
    check(r.aiming && !r.after.aim && !r.after.hold && r.after.dizzy && r.after.fw === 1 && r.threwLater === 0, `aimfwump: ${JSON.stringify(r)}`);
  }

  if (want('buffer')) {
    const r = await page.evaluate(() => {
      const P = window.__pipbo, G = P.G; window.__start();
      const st = G.mst, q = G.players[1], s = st.pl[1]; st.spawnT = 999; st.items = [];
      window.__put(1, 650);
      // pressed (and held) just after a toss: the aim starts once the short pause is over
      s.hold = { t: 'plush', v: 'duck' }; s.cd = 0.2;
      q.pendingAct = true; q.input.act = true;
      window.__run(0.05); const early = s.aim;
      window.__run(0.3); const held = s.aim;
      q.input.act = false; window.__run(0.05);
      const tossed = st.stat.throws[1];
      // a quick tap inside the pause, let go before it ends: nothing happens later
      s.hold = { t: 'plush', v: 'duck' }; s.cd = 0.2; s.aim = false;
      q.pendingAct = true; q.input.act = true; window.__run(0.05); q.input.act = false; window.__run(0.4);
      return { early, held, tossed, tapLost: !s.aim && st.stat.throws[1] === tossed };
    });
    const b = await page.evaluate(() => {
      const P = window.__pipbo, G = P.G; window.__start();
      // the bell: same size forts, Pip's teddy wobblier: Bo wins it; then a 1-block bigger fort wins outright
      G.mst.ted[0].wob = 2; G.mst.ted[1].wob = 1; G.mst.ted.forEach(t => { t.hitT = 0; });
      G.match.timeLeft = 0.001; P.step(P.DT);
      const a = [G.match.end && G.match.end.winner, G.match.end && G.match.end.reason];
      while (G.match.phase !== 'live') P.step(P.DT);
      G.mst.fort[0][6].push(G.mst.fort[0][6][0]); pfbSync(G.mst);
      G.match.timeLeft = 0.001; P.step(P.DT);
      return a.concat([G.match.end && G.match.end.winner, G.match.end && G.match.end.reason]);
    });
    check(b[0] === 1 && b[2] === 0, `bell: same forts go to the steadier teddy (${b[0]}: ${b[1]}); one block bigger wins (${b[2]}: ${b[3]})`);
    check(!r.early && r.held && r.tossed === 1 && r.tapLost, `buffer: a held press during the pause after a toss counts when it ends (${JSON.stringify(r)})`);
  }

  if (want('tie')) {
    const r = await page.evaluate(() => {
      const P = window.__pipbo, G = P.G; window.__start();
      const st = G.mst, m = G.match, out = [];
      // two even time-ups in a row: the second goes to the tiebreak (more blocks knocked)
      st.stat.knocked = [3, 1];
      m.timeLeft = 0.001; P.step(P.DT);
      out.push(m.end && m.end.winner);
      while (G.match.phase !== 'live') P.step(P.DT);
      out.push(G.mst.key);
      m.timeLeft = 0.001; P.step(P.DT);
      out.push(m.end && m.end.winner, m.end && m.end.reason);
      // force sudden death (two ties with no tiebreak) and check its round
      while (G.match.phase !== 'live') P.step(P.DT);
      G.mst.stat.knocked = [0, 0]; G.mst.matchWob = [0, 0];
      m.timeLeft = 0.001; P.step(P.DT); while (G.match.phase !== 'live') P.step(P.DT);
      m.timeLeft = 0.001; P.step(P.DT); while (G.match.phase !== 'live' && G.mode === 'play') P.step(P.DT);
      out.push(m.suddenDeath, G.mst.key, G.mst.gold.join(), G.mst.ted.map(t => t.wob).join());
      return out;
    });
    check(r[0] === -1 && r[1] === 'castle' && r[2] === 0, `tie: first even time-up replays (${r[0]}, again ${r[1]}), second goes to more knocks (${r[2]}: ${r[3]})`);
    check(r[4] === true && r[5] === 'sudden' && r[6] === '0,0' && r[7] === '4,4', `tie: sudden death ${r[4]}, layout ${r[5]}, gold ${r[6]}, wobbles ${r[7]}`);
  }

  if (want('reload')) {
    const r = await page.evaluate(() => {
      const P = window.__pipbo, G = P.G; window.__start();
      // build a tall column, then leave for 24-1 and come back
      const n = window.__lvl();
      P.loadLevel(n - 3); G.introT = 0; for (let k = 0; k < 60; k++) P.step(P.DT);
      const other = G.level.grid.map(r => r.join ? r.join('') : r).join('\n');
      const leak = other.split('P').length - 1;
      window.__start();
      return { leakP: leak, otherName: G.level.def.name, fresh: G.mst.stat.built.join(), items: G.mst.items.length };
    });
    check(r.fresh === '0,0', `reload: coming back starts fresh (built ${r.fresh}); 24-1 had ${r.leakP} 'P' tiles (its own map's)`);
  }

  if (want('people')) {
    await page.evaluate(() => {
      const P = window.__pipbo, G = P.G;
      window.__people = {
        // only builds: picks up the nearest toy, drops plushies, builds pillows on its front columns
        turtle(st, p, out, dt) {
          const ms = G.mst, s = ms.pl[p.id], T = P.MODES.pillowfort.test, d = p.id ? -1 : 1, cx = p.x + p.w / 2, o = {};
          st.t = (st.t || 0) + dt;
          if (s.hold && !T.isBlock(s.hold.t)) { o.down = Math.floor(st.t * 8) % 2 === 0; return o; }
          if (!s.hold) {
            const mine = ms.items.filter(it => (p.id ? it.x > 492 : it.x < 468) && it.rest && T.isBlock(it.t));
            const all = mine.length ? mine : ms.items.filter(it => (p.id ? it.x > 492 : it.x < 468) && it.rest);
            if (!all.length) return o;
            all.sort((a, b) => Math.abs(a.x - cx) - Math.abs(b.x - cx));
            o.left = all[0].x < cx - 4; o.right = all[0].x > cx + 4; if (all[0].y < p.y - 10) o.jump = true; return o;
          }
          const fx = T.colOf(p.id, 6) * 30 + 15 + d * 34;
          if (Math.abs(cx - fx) > 8) { o.left = cx > fx; o.right = cx < fx; return o; }
          if (p.face !== -d) { o.left = d > 0; o.right = d < 0; return o; }
          o.act = Math.floor(st.t * 6) % 2 === 0; return o;
        },
        // stands on its own shield column (in front of the teddy) and hops to catch tosses; tosses with taps
        goalie(st, p, out, dt) {
          const ms = G.mst, s = ms.pl[p.id], T = P.MODES.pillowfort.test, cx = p.x + p.w / 2, o = {};
          st.t = (st.t || 0) + dt;
          if (s.hold && !T.isBlock(s.hold.t)) { o.act = Math.floor(st.t * 5) % 2 === 0; }
          if (s.hold && T.isBlock(s.hold.t)) o.down = Math.floor(st.t * 5) % 2 === 0;
          const gx = T.colOf(p.id, ms.ted[p.id].i + 1) * 30 + 15;
          o.left = cx > gx + 6; o.right = cx < gx - 6; o.jump = Math.floor(st.t * 2) % 2 === 0;
          return o;
        },
        // camps at the rug line, jumping and pressing the action at everything; tosses what it gets with a tap
        camper(st, p, out, dt) {
          const ms = G.mst, s = ms.pl[p.id], T = P.MODES.pillowfort.test, cx = p.x + p.w / 2, o = {};
          st.t = (st.t || 0) + dt;
          const lx = p.id ? 500 : 460;
          o.left = cx > lx; o.right = cx < lx; o.jump = Math.floor(st.t * 3) % 2 === 0; o.act = Math.floor(st.t * 10) % 2 === 0;
          if (s.hold && T.isBlock(s.hold.t)) o.down = Math.floor(st.t * 5) % 2 === 0;
          return o;
        },
        kid(st, p, out, dt) {
          const ms = G.mst, s = ms.pl[p.id], T = P.MODES.pillowfort.test, d = p.id ? -1 : 1, cx = p.x + p.w / 2, o = {};
          if (s.aim) { if (s.holdT >= (st.hold || 0)) return o; o.act = true; return o; }
          st.wait = (st.wait || 0) - dt;
          if (st.wait > 0) return o;
          if (Math.random() < dt * 0.15) { st.wait = 0.5 + Math.random() * 1.2; return o; }
          if (!s.hold) {
            const mine = ms.items.filter(it => (p.id ? it.x > 492 : it.x < 468) && it.rest);
            if (!mine.length) return o;
            mine.sort((a, b) => Math.abs(a.x - cx) - Math.abs(b.x - cx));
            o.left = mine[0].x < cx - 4; o.right = mine[0].x > cx + 4; if (mine[0].y < p.y - 20) o.jump = true; return o;
          }
          if (T.isBlock(s.hold.t)) {
            const fx = T.colOf(p.id, 6) * 30 + 15 + d * 34;
            if (Math.abs(cx - fx) > 8) { o.left = cx > fx; o.right = cx < fx; return o; }
            if (p.face !== -d) { o.left = d > 0; o.right = d < 0; return o; }
            st.wait = 0.25; o.act = true; return o;
          }
          if (!st.think) { st.think = true; st.wait = 0.2 + Math.random() * 0.6; return o; }
          st.think = false; st.hold = Math.random() < 0.6 ? 0 : 0.3 + Math.random() * 0.9; o.act = true; return o;
        },
      };
      window.__match = (seed, who, side, foe) => {
        window.__seed(seed * 104729);
        G.manual = true;
        P.CPU.skillOf = side === 0 ? ['hard', foe] : [foe, 'hard'];
        const pst = {};
        P.CPU.filter = (p, out, dt) => (p.id === side ? window.__people[who](pst, p, out, dt) : out);
        G.cpuOn = [true, true];
        P.loadLevel(window.__lvl()); G.cpuOn = [true, true]; G.introT = 0;
        let n = 0; while (G.mode === 'play' && n < 120 * 700) { P.step(P.DT); n++; }
        P.CPU.filter = null;
        return { wins: G.match.wins.slice(), mode: G.mode };
      };
    });
    for (const [who, foe, shouldWin] of [['turtle', 'normal', false], ['turtle', 'hard', false], ['goalie', 'normal', false], ['camper', 'normal', false], ['kid', 'easy', true]]) {
      let won = 0, tot = 0; const lines = [];
      for (const side of [0, 1]) for (const seed of seeds) {
        const r = await page.evaluate(([s, w, sd, f]) => window.__match(s, w, sd, f), [seed, who, side, foe]);
        tot++; if (r.wins[side] > r.wins[1 - side]) won++;
        lines.push(`${side ? 'Bo' : 'Pip'} s${seed} ${r.wins[side]}-${r.wins[1 - side]}`);
      }
      const ok = shouldWin ? won >= 1 : won <= Math.floor(tot / 4);
      check(ok, `people: ${who} vs ${foe} won ${won} of ${tot} (${lines.join(', ')})`);
    }
  }
  console.log(errors.length ? 'ERRORS\n' + errors.slice(0, 6).join('\n') : 'no page errors');
  console.log(fails ? fails + ' FAILED' : 'all adversary checks passed');
  await browser.close();
  process.exit(fails || errors.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
