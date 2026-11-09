#!/usr/bin/env node
// Wind-Up Train Ride debug trace: node tools/w24/windtrain-debug.js <pip kind|cpu> <bo kind|cpu> [maxT] [every] [seed]
const path = require('path'); const { chromium } = require('playwright');
const [a, b, maxT, every, seed] = [process.argv[2], process.argv[3], +process.argv[4] || 300, +process.argv[5] || 5, +process.argv[6] || 1];
(async () => {
  const br = await chromium.launch(); const page = await br.newPage();
  page.on('pageerror', e => console.log('ERR', String(e)));
  await page.addInitScript(() => { const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; let seeded = gen(1); window.__seed = n => { seeded = gen((n >>> 0) || 1); }; Math.random = () => seeded(); });
  await page.addInitScript({ path: '/home/user/2d-videogame/tools/w24/windtrain-people.js' });
  await page.goto('file:///home/user/2d-videogame/index.html');
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const r = await page.evaluate(({ a, b, maxT, every, seed }) => {
    const P = window.__pipbo, G = P.G; window.__seed(seed * 104729);
    let rs = seed * 7 + 3; const rnd = () => { rs = (rs * 16807) % 2147483647; return rs / 2147483647; };
    const cpu = [a === 'cpu', b === 'cpu'];
    if (cpu[0] || cpu[1]) { P.CPU.cfg.players = 1; P.CPU.cfg.human = cpu[0] ? 1 : 0; P.cpuApplyCfg(); } else { P.CPU.cfg.players = 2; P.cpuApplyCfg(); }
    G.cpuOn = cpu; G.manual = true;
    P.loadLevel(P.LEVELS.findIndex(l => l.name === 'Wind-Up Train Ride')); G.introT = 0; P.keys.clear(); window.__windtrainPeople.reset();
    const log = []; let n = 0, last = -99;
    while (n < maxT / P.DT && G.mode === 'play') {
      if (!cpu[0]) window.__windtrainPeople.drive(0, a, P, rnd); if (!cpu[1]) window.__windtrainPeople.drive(1, b, P, rnd);
      P.pollInput(P.DT); P.step(P.DT); n++;
      const st = G.mst, t = n * P.DT;
      if (t - last >= every) { last = t; const pl = P.MODES.windtrain.plan(st); log.push(`t=${t.toFixed(0)} r${G.room} nose=${st.tr.x | 0} v=${st.tr.v | 0} sp=${st.tr.spring.toFixed(2)} brk=${st.tr.brake} rev=${!!st.tr.rev} sw(${st.sw.x | 0},${st.sw.feet | 0},${st.sw.ground}) cam=${st.cam.x | 0} plan=${pl.why} pb=${pl.brake} ph=${pl.hold} job=${pl.job ? pl.job.kind + '@' + (pl.job.x | 0) : '-'} rx=${pl.rx | 0} can=${pl.can} act=${pl.act} clunks=${st.stats.clunks}`); }
    }
    return log.join('\n') + '\n' + G.mode;
  }, { a, b, maxT, every, seed });
  console.log(r); await br.close();
})();
