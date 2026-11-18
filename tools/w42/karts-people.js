#!/usr/bin/env node
// 42-4 Go-Kart Grand Prix: scripted PEOPLE (plain rules of their own, mostly on-off keys, not the computer's brain)
// race the computer in either seat at every Opponent setting, with drawing off. The review's stuck / fairness sweep.
// Usage: node tools/w42/karts-people.js [--who=keys,keysd,...|all] [--skills=easy,normal,hard] [--sides=0,1]
//        [--seeds=1,2] [--max=600] [-v]
//   keys     on-off steering toward the middle of the road, never drifts, never uses a prize (a first-time keyboard player)
//   keysd    on-off steering, holds drift through every bend, uses a prize the moment it has one
//   center   smooth stick down the middle, drifts the bends, uses prizes at once (a steady controller player)
//   rammer   drives at the other kart whenever it is near
//   blocker  when in front, sits in the other kart's lane
//   wrong    turns round and drives the wrong way for a few seconds now and then
//   short    on-off steering into every shortcut and branch, every lap
//   wide     runs the outside verge of every bend (and the pier's rail gaps)
//   mash     random buttons, changed five times a second
//   brakes   stop-go: on the brake half the time
//   zigzag   left, right, left, right, every half second
//   late     the keysd player, half a second late on everything
// Prints one line a race and a table: wins, race length, cranes, the longest time either kart made no progress, the
// biggest single-step move of a kart that was not a crane put-back (a teleport), time spent outside every wall, and
// the computer's steering changes a second on the road (outside its slides). Exits 1 on a locked race, a NaN, a page error or a teleport.
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const ALL = ['keys', 'keysd', 'center', 'rammer', 'blocker', 'wrong', 'short', 'wide', 'mash', 'brakes', 'zigzag', 'late'];
const whoArg = opt('who', 'all'), whos = whoArg === 'all' ? ALL : whoArg.split(',');
const skills = opt('skills', 'easy,normal,hard').split(','), sides = opt('sides', '0,1').split(',').map(Number);
const seeds = opt('seeds', '1').split(',').map(Number), maxT = +opt('max', 600), verbose = args.includes('-v');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  await page.addInitScript(() => {
    const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    let seeded = gen(1); const other = gen(12345);
    window.__inStep = false; window.__seed = n => { seeded = gen((n >>> 0) || 1); };
    Math.random = () => (window.__inStep ? seeded() : other());
  });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', opt('page', 'index.html')));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  let bad = 0;
  const table = [];
  for (const who of whos) for (const skill of skills) for (const side of sides) {
    const row = { who, skill, side, n: 0, wins: 0, len: 0, cranes: [0, 0], still: 0, jump: 0, out: 0, flip: 0, by: {} };
    for (const seed of seeds) {
      errors.length = 0;
      const r = await page.evaluate(async ({ skill, seed, who, side, maxT }) => {
        const P = window.__pipbo, G = P.G, K3D = P.K3D, TR = PARKKARTS_TRACK, PZ = PARKKARTS_PRIZES;
        const i = P.LEVELS.findIndex(l => l.mode === 'parkkarts');
        window.__seed(seed * 7919 + side * 31);
        G.manual = true; K3D.noRender = true;
        P.CPU.errs.clear(); P.CPU.skillOf = [skill, skill];
        G.cpuOn = [true, true];
        let pt = 0, rnd = seed * 2654435761 >>> 0, mashOut = {}, mashT = 0;
        const rand = () => { rnd ^= rnd << 13; rnd >>>= 0; rnd ^= rnd >> 17; rnd ^= rnd << 5; rnd >>>= 0; return rnd / 4294967296; };
        // steer at a point: the error angle (+ = the point is to the right of the nose)
        const errTo = (k, x, z) => { const want = Math.atan2(x - k.x, z - k.z); const e = Math.atan2(Math.sin(want - k.yaw), Math.cos(want - k.yaw)); return -e; };
        const keysFor = (e, dead) => (e > dead ? { right: true } : e < -dead ? { left: true } : {});
        const bend = k => { let t = 0; for (let d = 2; d < 20; d += 2) t += TR.at(k.s + d).turn * 2; return t; };
        const late = [];
        const person = (p, dt) => {
          pt += dt;
          const st = G.mst, k = st.karts && st.karts[p.id]; if (!k) return {};
          const o = st.karts[1 - p.id];
          const mid = d => { const q = TR.pos(k.s + d, 0); return errTo(k, q[0], q[1]); };
          const base = who === 'late' ? 'keysd' : who;
          let out = {};
          switch (base) {
            case 'keys': out = keysFor(mid(9), 0.08); break;
            case 'keysd': { const e = mid(9), t = bend(k); out = keysFor(e, 0.08); if (Math.abs(t) > 0.7) out.jump = true; if (k.prize) out.act = pt % 0.4 < 0.2; break; }
            case 'center': { const e = mid(8 + k.v * 0.5), t = bend(k); out = { ax: Math.max(-1, Math.min(1, e * 2.2)) }; if (Math.abs(t) > 0.9 && k.spark < 2) out.jump = true; if (k.prize) out.act = pt % 0.4 < 0.2; break; }
            case 'rammer': { const ds = PZ.sd(o.s, k.s); if (Math.abs(ds) < 14 && !o.crane) out = keysFor(errTo(k, o.x + Math.sin(o.yaw) * 2, o.z + Math.cos(o.yaw) * 2), 0.05); else out = keysFor(mid(9), 0.08); if (k.prize) out.act = pt % 0.4 < 0.2; break; }
            case 'blocker': { const ds = PZ.sd(o.s, k.s), lat = ds < 0 && ds > -20 ? Math.max(-3, Math.min(3, o.lat)) : 0; const q = TR.pos(k.s + 9, lat); out = { ax: Math.max(-1, Math.min(1, errTo(k, q[0], q[1]) * 2.2)) }; if (k.prize) out.act = pt % 0.4 < 0.2; break; }
            case 'wrong': out = pt % 17 > 13 ? { left: true, down: pt % 17 < 14 } : keysFor(mid(9), 0.08); break;
            case 'short': {
              let tgt = null;
              for (const B of TR.branches) { const ds = PZ.sd(B.s0, k.s); if (k.on >= 0 && TR.branches[k.on] === B) { const g = B.at(Math.min(B.len, k.bs + 7)); tgt = [g.x, g.z]; } else if (ds > -4 && ds < 22) { const g = B.at(Math.max(1, 9 - Math.max(0, ds))); tgt = [g.x, g.z]; } }
              out = tgt ? keysFor(errTo(k, tgt[0], tgt[1]), 0.06) : keysFor(mid(9), 0.08); break;
            }
            case 'wide': { const t = bend(k), f = TR.at(k.s + 8), lat = Math.abs(t) > 0.25 ? Math.sign(t) * (f.hw + 1.2) : 0; const q = TR.pos(k.s + 8, lat); out = keysFor(errTo(k, q[0], q[1]), 0.08); break; }
            case 'mash': { mashT -= dt; if (mashT <= 0) { mashT = 0.2; mashOut = { left: rand() < 0.4, right: rand() < 0.4, jump: rand() < 0.5, down: rand() < 0.2, act: rand() < 0.5 }; } out = mashOut; break; }
            case 'brakes': out = Object.assign(keysFor(mid(9), 0.08), { down: pt % 2 < 1 }); break;
            case 'zigzag': out = pt % 1 < 0.5 ? { left: true } : { right: true }; break;
          }
          if (who === 'late') { late.push(out); return late.length > 60 ? late.shift() : {}; }
          return out;
        };
        P.CPU.filter = (p, out, dt) => (p.id === side ? person(p, dt) : out);
        delete G.results[i];
        P.loadLevel(i);
        G.introT = 0;
        const steps = Math.round(maxT / P.DT);
        const flips = [], last = [null, null], lastProg = [0, 0], stillT = [0, 0];
        let n = 0, maxFlip = 0, lastS = 0, slideT = -9, maxStill = 0, maxJump = 0, jumpAt = '', outT = 0, nan = false, placed = [0, 0];
        const cpu = 1 - side;
        while (n < steps && G.mode === 'play') {
          for (let q = 0; q < 600 && n < steps && G.mode === 'play'; q++, n++) {
            const st0 = G.mst, pre = st0.karts ? st0.karts.map(k => ({ crane: !!k.crane, cranes: k.cranes, lock: !!k.lock })) : null, ph0 = st0.phase;
            window.__inStep = true; P.step(P.DT); window.__inStep = false;
            const st = G.mst; if (!st.karts) continue;
            for (const id of [0, 1]) {
              const k = st.karts[id];
              if (!isFinite(k.x) || !isFinite(k.z) || !isFinite(k.v) || !isFinite(k.yaw) || !isFinite(k.prog)) nan = true;
              // a teleport: a big single-step move that is not a crane picking up or putting back
              if (last[id] && pre) {
                const d = Math.hypot(k.x - last[id][0], k.z - last[id][1]);
                const craneMove = pre[id].crane || k.crane || st.phase !== ph0 || (ph0 === 'crane' && id !== st.lead);
                if (!craneMove && d > maxJump) { maxJump = d; jumpAt = `${(n * P.DT).toFixed(1)}s ${['Pip', 'Bo'][id]} ${ph0} s${k.s.toFixed(0)} on${k.on}`; }
              }
              last[id] = [k.x, k.z];
              // outside every wall (race only)
              if (st.phase === 'race' && !k.crane) { const wh = TR.where(k.x, k.z, k.s, k.on); if (Math.abs(wh.lat) > wh.w - 0.3) outT += P.DT; }
              // no progress
              if (st.phase === 'race') { if (k.prog > lastProg[id] + 0.5) { lastProg[id] = k.prog; stillT[id] = 0; } else { stillT[id] += P.DT; maxStill = Math.max(maxStill, stillT[id]); } } else { stillT[id] = 0; lastProg[id] = k.prog; }
            }
            const ax = G.players[cpu].input.ax || 0, sg = ax > 0.05 ? 1 : ax < -0.05 ? -1 : 0;
            if (st.karts[cpu].drift || G.players[cpu].input.jump) slideT = n * P.DT;
            if (sg && lastS && sg !== lastS && st.phase === 'race' && n * P.DT - slideT > 0.35) flips.push(n * P.DT);
            if (sg) lastS = sg;
            while (flips.length && n * P.DT - flips[0] > 1) flips.shift();
            maxFlip = Math.max(maxFlip, flips.length);
          }
          await new Promise(r => setTimeout(r, 0));
        }
        const st = G.mst;
        return { mode: G.mode, raceT: +st.raceT.toFixed(0), flags: st.flags, winner: st.winner, how: st.log.map(l => ['P', 'B'][l.w] + (l.how === 'line' ? 'l' : 'b')).join(' '),
          cranes: st.karts.map(k => k.cranes), seas: st.karts.map(k => k.seas || 0), took: st.karts.map(k => JSON.stringify(k.took || {})), walls: st.karts.map(k => k.walls),
          maxStill: +maxStill.toFixed(1), maxJump: +maxJump.toFixed(2), jumpAt, outT: +outT.toFixed(2), nan, maxFlip, cpuErrs: [...P.CPU.errs] };
      }, { skill, seed, who, side, maxT });
      const personWon = r.winner === side;
      row.n++; if (personWon) row.wins++; row.len += r.raceT; row.cranes[0] += r.cranes[side]; row.cranes[1] += r.cranes[1 - side];
      row.still = Math.max(row.still, r.maxStill); row.jump = Math.max(row.jump, r.maxJump); row.out = Math.max(row.out, r.outT); row.flip = Math.max(row.flip, r.maxFlip);
      const problems = [];
      if (r.winner < 0) problems.push('NO RESULT (' + r.mode + ')');
      if (r.nan) problems.push('NaN');
      if (r.maxJump > 1.5) problems.push('TELEPORT ' + r.maxJump + ' at ' + r.jumpAt);
      if (r.maxStill > 6) problems.push('NO PROGRESS ' + r.maxStill + 's');
      if (r.cpuErrs.length) problems.push('CPU ERR ' + r.cpuErrs);
      if (errors.length) problems.push('PAGE ERR ' + errors.slice(0, 2).join(' | ').slice(0, 300));
      if (r.winner < 0 || r.nan || r.maxJump > 1.5 || r.cpuErrs.length || errors.length) bad++;
      if (verbose || problems.length) console.log(`${who}@${['Pip', 'Bo'][side]} v ${skill} s${seed}: ${r.winner < 0 ? 'nobody' : personWon ? 'PERSON' : 'computer'} ${r.flags.join('-')} ${r.raceT}s [${r.how}] cranes ${r.cranes} sea ${r.seas} walls ${r.walls} took ${r.took.join(' ')} still ${r.maxStill}s jump ${r.maxJump} out ${r.outT}s flips ${r.maxFlip}/s ${problems.join('; ')}`);
    }
    table.push(row);
  }
  console.log('\nperson     seat v skill   person wins  mean race  cranes(person,cpu)  no-progress  teleport  outside  cpu flips/s');
  for (const r of table) console.log(`${r.who.padEnd(10)} ${['Pip', 'Bo'][r.side].padEnd(3)}  v ${r.skill.padEnd(7)} ${String(r.wins + '/' + r.n).padStart(6)}      ${String(Math.round(r.len / r.n)).padStart(5)}s   ${String(r.cranes).padStart(8)}          ${String(r.still).padStart(5)}s    ${String(r.jump).padStart(5)}   ${String(r.out).padStart(5)}s   ${r.flip}`);
  await browser.close();
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
