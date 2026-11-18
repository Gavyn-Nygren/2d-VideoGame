#!/usr/bin/env node
// 42-4 Go-Kart Grand Prix: whole races with drawing off (K3D.noRender), reported flag by flag.
// Usage: node tools/w42/karts-play.js [--skills=hard,normal] [--seeds=1,2,3] [--who=cpu|<person>] [--side=0|1] [--max=600]
//        [--trace=5] [--page=index.html]
//   --skills=a,b   Pip's and Bo's computer skill (easy | normal | hard)
//   --who=...      a scripted person (not the computer's brain) drives --side, the computer the other:
//                  still (never steers) left (holds left) back (brakes and steers round, drives backwards) drift (drift
//                  held all race) noprize (never uses a prize) prizes (presses the prize button all the time)
//                  stop (brakes to a stop at the line now and then) sea (steers for the outside every bend)
//                  ringtoss (sits in the ring-toss shortcut) kid (the computer at Easy made a whole second late)
// Prints: who won, each flag (how, where, when), race length, cranes, wall hits, drifts, boosts and the computer's
// changes of steering direction a second (more than 2 is a wobble bug).
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const skills = opt('skills', 'hard,hard').split(','), seeds = opt('seeds', '1').split(',').map(Number);
const who = opt('who', 'cpu'), side = +opt('side', 0), maxT = +opt('max', 600), trace = +opt('trace', 0);
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  await page.addInitScript(() => {
    const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    let seeded = gen(1); const other = gen(12345);
    window.__inStep = false; window.__seed = n => { seeded = gen((n >>> 0) || 1); };
    Math.random = () => (window.__inStep ? seeded() : other());
  });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', opt('page', 'index.html')));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const tot = { wins: [0, 0], len: 0, n: 0 };
  for (const seed of seeds) {
    errors.length = 0;
    const r = await page.evaluate(async ({ skills, seed, who, side, maxT, trace }) => {
      const P = window.__pipbo, G = P.G, K3D = P.K3D;
      const i = P.LEVELS.findIndex(l => l.mode === 'parkkarts');
      window.__seed(seed * 7919);
      G.manual = true; K3D.noRender = true;
      P.CPU.errs.clear(); P.CPU.skillOf = skills.slice();
      G.cpuOn = [true, true];
      const late = [];
      // a scripted person: plain rules, not the computer's brain
      let pt = 0;
      const person = (p, out, dt) => {
        pt += dt;
        const k = G.mst.karts && G.mst.karts[p.id];
        switch (who) {
          case 'still': return {};
          case 'left': return { left: true };
          case 'back': return pt < 3 ? { down: true } : { left: true, down: pt % 6 < 1 };
          case 'drift': return Object.assign({}, out, { jump: true });
          case 'noprize': return Object.assign({}, out, { act: false });
          case 'prizes': return Object.assign({}, out, { act: pt % 0.3 < 0.15 });
          case 'stop': return pt % 30 > 25 ? { down: true } : out;
          case 'sea': { if (!k) return out; let t = 0; for (let d = 2; d < 20; d += 2) t += PARKKARTS_TRACK.at(k.s + d).turn; return Math.abs(t) > 0.2 ? (t > 0 ? { right: true } : { left: true }) : out; }
          case 'ringtoss': { if (!k) return out; const B = PARKKARTS_TRACK.ringToss; if (k.on >= 0 && k.bs > B.len * 0.45) return { down: true }; return out; }
          case 'kid': late.push(out); return late.length > 120 ? late.shift() : {};
        }
        return out;
      };
      P.CPU.filter = who === 'cpu' ? null : (p, out, dt) => (p.id === side ? person(p, out, dt) : out);
      if (who === 'kid') P.CPU.skillOf[side] = 'easy';
      delete G.results[i];
      P.loadLevel(i);
      G.introT = 0;
      const steps = Math.round(maxT / P.DT), every = trace ? Math.round(trace / P.DT) : 0, lines = [];
      const flips = [[], []], lastS = [0, 0];
      let n = 0, maxFlip = [0, 0];
      while (n < steps && G.mode === 'play') {
        for (let k = 0; k < 600 && n < steps && G.mode === 'play'; k++, n++) {
          window.__inStep = true;
          P.step(P.DT);
          window.__inStep = false;
          const st = G.mst;
          // the computer's changes of steering direction a second
          for (const id of [0, 1]) {
            if (who !== 'cpu' && id === side) continue;
            const ax = G.players[id].input.ax || 0, sg = ax > 0.05 ? 1 : ax < -0.05 ? -1 : 0;
            if (sg && lastS[id] && sg !== lastS[id] && st.phase === 'race') flips[id].push(n * P.DT);
            if (sg) lastS[id] = sg;
            while (flips[id].length && n * P.DT - flips[id][0] > 1) flips[id].shift();
            maxFlip[id] = Math.max(maxFlip[id], flips[id].length);
          }
          if (every && n % every === 0 && st.karts) lines.push(`${(n * P.DT).toFixed(1)}s ${st.phase} prog ${st.karts.map(x => x.prog.toFixed(0) + (x.drift ? 'D' : '') + (x.on >= 0 ? 'R' : '') + ' v' + x.v.toFixed(1) + ' lat' + x.lat.toFixed(1)).join(' | ')} gap ${st.gap.toFixed(1)} flags ${st.flags}`);
        }
        await new Promise(r => setTimeout(r, 0));
      }
      const st = G.mst;
      return { mode: G.mode, simT: +(n * P.DT).toFixed(1), raceT: +st.raceT.toFixed(1), flags: st.flags, winner: st.winner, log: st.log.map(l => `${['Pip', 'Bo'][l.w]} ${l.how} @${l.t.toFixed(0)}s ${l.part} gap ${l.gap}`),
        k: st.karts.map(k => ({ cranes: k.cranes, walls: k.walls, drifts: k.drifts || 0, boosts: k.boosts, chain: k.bestChain, used: k.used || 0, boxes: k.boxes || 0, hits: k.hits || 0, slips: k.slips || 0, laps: (k.prog / PARKKARTS_TRACK.L).toFixed(1) })),
        maxFlip, cpuErrs: [...P.CPU.errs], trace: lines };
    }, { skills, seed, who, side, maxT, trace });
    if (r.trace.length) console.log(r.trace.join('\n'));
    const W = r.winner >= 0 ? ['Pip', 'Bo'][r.winner] : 'nobody';
    if (r.winner >= 0) { tot.wins[r.winner]++; tot.len += r.raceT; tot.n++; }
    console.log(`s${seed} ${skills.join(' v ')}${who !== 'cpu' ? ' person=' + who + '@' + ['Pip', 'Bo'][side] : ''}: ${W} wins ${r.flags.join('-')} in ${r.raceT}s (${r.mode})  wobble ${r.maxFlip}/s`);
    console.log('   ' + r.log.join(' | '));
    console.log('   ' + r.k.map((k, i) => `${['Pip', 'Bo'][i]} laps ${k.laps} cranes ${k.cranes} walls ${k.walls} drifts ${k.drifts} boosts ${k.boosts} chain ${k.chain} boxes ${k.boxes} used ${k.used} hits ${k.hits} slips ${k.slips}`).join('  ||  '));
    if (r.cpuErrs.length) console.log('   CPU ERR ' + r.cpuErrs);
    if (errors.length) console.log('   PAGE ERR ' + errors.slice(0, 3).join(' | ').slice(0, 800));
  }
  if (seeds.length > 1) console.log(`TOTAL Pip ${tot.wins[0]} Bo ${tot.wins[1]}  mean race ${(tot.len / Math.max(1, tot.n)).toFixed(0)}s`);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
