#!/usr/bin/env node
// Slinky Stairs break test: scripted "people" (tools/w24/slinky-people.js) play 24-3 through the real keyboard path
// (keys + pollInput), alone, in pairs, and with the computer at the other seat. Prints where each run got to, its time,
// medal and any page errors, NaNs or the slinky leaving the screen.
// Usage: node tools/w24/slinky-break.js [--who=all|name,name] [--seeds=1,2] [--max=600]   (max = seconds of play)
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const seeds = opt('seeds', '1,2').split(',').map(Number), maxT = +opt('max', 600), whoArg = opt('who', 'all');
// [name, pip script, bo script, cpu seats, should clear? (null: either is fine)]
const CASES = [
  ['idle+idle', 'idle', 'idle', [false, false], false],
  ['kid+idle', 'kid', 'idle', [false, false], false],
  ['idle+kid', 'idle', 'kid', [false, false], false],
  ['mash+mash', 'mash', 'mash', [false, false], null],
  ['hold+hold', 'hold', 'hold', [false, false], false],
  ['act+act', 'act', 'act', [false, false], false],
  ['wrong+wrong', 'wrong', 'wrong', [false, false], false],
  ['back+kid', 'back', 'kid', [false, false], false],
  ['kid+kid', 'kid', 'kid', [false, false], true],
  ['slowkid+kid', 'slowkid', 'kid', [false, false], true],
  ['slowkid+slowkid', 'slowkid', 'slowkid', [false, false], true],
  ['kid+cpu', 'kid', null, [false, true], true],
  ['cpu+kid', null, 'kid', [true, false], true],
  ['slowkid+cpu', 'slowkid', null, [false, true], true],
  ['mash+cpu', 'mash', null, [false, true], null],
  ['cpu+mash', null, 'mash', [true, false], null],
  ['idle+cpu', 'idle', null, [false, true], false],
  ['cpu+idle', null, 'idle', [true, false], false],
  ['cpu+wrong', null, 'wrong', [true, false], false],
  ['back+cpu', 'back', null, [false, true], false],
  ['act+cpu', 'act', null, [false, true], null],
  ['cpu+act', null, 'act', [true, false], false],
  ['wrong+cpu', 'wrong', null, [false, true], null],
  ['cpu+hold', null, 'hold', [true, false], null],
  ['hold+cpu', 'hold', null, [false, true], false],
  ['cpu+slowkid', null, 'slowkid', [true, false], true],
];
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.addInitScript(() => {
    const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    let seeded = gen(1); window.__seed = n => { seeded = gen((n >>> 0) || 1); }; Math.random = () => seeded();
  });
  await page.addInitScript({ path: path.join(__dirname, 'slinky-people.js') });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const bad = [];
  for (const [name, a, b, cpu, want] of CASES) {
    if (whoArg !== 'all' && !whoArg.split(',').includes(name)) continue;
    for (const seed of seeds) {
      const r = await page.evaluate(({ a, b, cpu, seed, maxT }) => {
        const P = window.__pipbo, G = P.G;
        window.__seed(seed * 104729);
        let rs = seed * 7 + 3; const rnd = () => { rs = (rs * 16807) % 2147483647; return rs / 2147483647; };
        if (cpu[0] || cpu[1]) { P.CPU.cfg.players = 1; P.CPU.cfg.human = cpu[0] ? 1 : 0; P.cpuApplyCfg(); } else { P.CPU.cfg.players = 2; P.cpuApplyCfg(); }
        G.cpuOn = cpu.slice();
        G.manual = true;
        P.loadLevel(P.LEVELS.findIndex(l => l.name === 'Slinky Stairs'));
        G.introT = 0;
        P.keys.clear(); window.__slinkyPeople.reset();
        let n = 0, room = 0, roomAt = [0], off = '', nanAt = '', waitT = 0;
        while (n < maxT / P.DT && (G.mode === 'play' || G.mode === 'paused')) {
          if (G.mode === 'paused') break;
          window.__slinkyPeople.drive(0, a, P, rnd); window.__slinkyPeople.drive(1, b, P, rnd);
          P.pollInput(P.DT); P.step(P.DT); n++;
          const st = G.mst;
          if (st.waiting) waitT += P.DT;
          if (G.room !== room) { room = G.room; roomAt.push(+G.time.toFixed(1)); }
          const fp = P.MODES.slinky.front(st);
          if (!nanAt && st.c && ![fp.x, fp.y, st.cam, st.s.m, st.s.rx].every(Number.isFinite)) nanAt = 't=' + G.time.toFixed(1);
          if (st.c && !off) {
            const sy = fp.y - st.cam;
            if ((st.s.state === 'rest' || st.s.state === 'follow') && (fp.x < 30 || fp.x > 930 || sy < 40 || sy > 520)) off = `offscreen t=${G.time.toFixed(1)} at ${fp.x | 0},${sy | 0} ${st.s.state}`;
          }
        }
        const st = G.mst, s = st.s;
        return { mode: G.mode, t: +G.time.toFixed(1), real: +(n * P.DT).toFixed(0), room, roomAt, on: s.on, state: s.state,
          whoas: st.stats.whoas, perf: st.stats.perfects, helps: st.stats.helps, stars: st.stats.stars + '/' + st.starsAll, off, nanAt, waitT: +waitT.toFixed(0),
          res: G.mode === 'clear' || G.mode === 'result' ? JSON.stringify(G.lmode.stats().slice(0, 4).map(x => x.value)) + ' ' + G.lmode.stats().slice(4).join(' ') : '' };
      }, { a, b, cpu, seed, maxT });
      const cleared = r.mode !== 'play';
      const ok = want === null ? true : want === cleared;
      if (!ok || r.off || r.nanAt) bad.push(name + ' s' + seed);
      console.log(`${ok && !r.off && !r.nanAt ? 'ok  ' : 'BAD '} ${name.padEnd(17)} s${seed} ${r.mode} t=${r.t} (sim ${r.real}s, waited ${r.waitT}s) flight=${r.room + 1}/4 at ${r.roomAt.join(',')} step=${r.on} ${r.state} whoas=${r.whoas} perf=${r.perf} helps=${r.helps} stars=${r.stars} ${r.off} ${r.nanAt ? 'NaN ' + r.nanAt : ''}`);
      if (r.res) console.log('      ' + r.res);
    }
  }
  console.log(bad.length ? 'PROBLEMS: ' + bad.join(', ') : 'all as expected');
  if (errors.length) console.log('ERRORS:\n' + [...new Set(errors)].join('\n'));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
