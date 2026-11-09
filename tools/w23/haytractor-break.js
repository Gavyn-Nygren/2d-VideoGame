#!/usr/bin/env node
// Tractor & Trailer "people" runs: the test people from haytractor-people.js press keyboard keys (P.keys, read by
// pollInput) in one or both seats; "cpu" puts the computer partner (1-player mode) in that seat. Prints whether 23-1
// cleared, the time, items delivered, spills and the medal. Runs that must NOT clear are marked (expect stuck).
// Usage: node tools/w23/haytractor-break.js [--only=kid+kid] [--limit=900] [--seeds=1]
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const limit = +opt('limit', 900), seeds = opt('seeds', '1').split(',').map(Number);
const PAIRS = [
  ['idle', 'idle', 'stuck'], ['kid', 'idle', 'stuck'], ['idle', 'kid', 'stuck'], ['idle', 'cpu', 'stuck'], ['cpu', 'idle', 'stuck'],
  ['mash', 'mash', 'clear'], ['hold', 'hold', '?'], ['act', 'act', 'clear'], ['back', 'back', 'clear'], ['wrong', 'wrong', '?'], ['racer', 'racer', '?'],
  ['kid', 'kid', 'clear'], ['slowkid', 'slowkid', 'clear'], ['kid', 'slowkid', 'clear'], ['kid', 'cpu', 'clear'], ['cpu', 'kid', 'clear'], ['slowkid', 'cpu', 'clear'],
  // 1-player mode: the person does odd things in their seat while the computer plays the other
  ['mash', 'cpu', 'clear'], ['cpu', 'mash', 'clear'], ['hold', 'cpu', '?'], ['cpu', 'hold', '?'], ['back', 'cpu', 'clear'], ['cpu', 'back', 'clear'],
  ['act', 'cpu', 'clear'], ['cpu', 'act', 'clear'], ['wrong', 'cpu', '?'], ['cpu', 'wrong', '?'], ['nap', 'cpu', 'clear'], ['cpu', 'nap', 'clear'],
];
const only = opt('only', '');
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
  await page.addInitScript({ path: path.join(__dirname, 'haytractor-people.js') });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  let bad = 0;
  for (const [a, b, expect] of PAIRS) {
    if (only && only !== a + '+' + b) continue;
    for (const seed of seeds) {
      const r = await page.evaluate(({ a, b, seed, limit }) => {
        const P = window.__pipbo, G = P.G;
        window.__seed(seed * 104729);
        const kinds = [a, b], cpu = kinds.indexOf('cpu');
        if (cpu >= 0) { P.CPU.cfg.players = 1; P.CPU.cfg.human = 1 - cpu; P.cpuApplyCfg(); } else { P.CPU.cfg.players = 2; P.cpuApplyCfg(); }
        G.manual = true;
        P.loadLevel(P.LEVELS.findIndex(l => l.name === 'Tractor & Trailer'));
        G.cpuOn = [cpu === 0, cpu === 1];
        G.introT = 0;
        window.__haytPeople.reset(); P.keys.clear();
        let rs = seed * 31 + 7; const rnd = () => { rs = (rs * 16807) % 2147483647; return rs / 2147483647; };
        let n = 0, wall = 0;
        while (n++ < limit / P.DT && G.mode === 'play') {
          for (const id of [0, 1]) if (!G.cpuOn[id]) window.__haytPeople.drive(id, kinds[id], P, rnd);
          P.pollInput(P.DT); P.step(P.DT); wall += P.DT;
        }
        P.keys.clear();
        const st = G.mst, s = st.stats;
        const medal = (G.lmode.stats().find(x => x && x.label === 'Medal') || {}).value;
        return { mode: G.mode, t: +G.time.toFixed(1), wall: +wall.toFixed(0), room: G.room + 1, del: st.delivered + '/' + st.totalAll, spills: s.spills, missed: s.missed, helps: s.helps, hard: s.hard, medal, roomT: s.roomT.map(x => x == null ? '-' : x.toFixed(0)).join(',') };
      }, { a, b, seed, limit });
      const cleared = r.mode !== 'play';
      const okay = expect === '?' || (expect === 'clear') === cleared;
      if (!okay) bad++;
      console.log(`${okay ? 'ok  ' : 'BAD '} ${(a + '+' + b).padEnd(16)} s${seed} ${cleared ? 'CLEARED' : 'stuck  '} t=${r.t}s (sim ${r.wall}s) field ${r.room} delivered ${r.del} spills ${r.spills} missed ${r.missed} hard ${r.hard} helps ${r.helps} medal ${cleared ? r.medal : '-'} fields ${r.roomT}  [expect ${expect}]`);
    }
  }
  if (errors.length) console.log('ERRORS:\n' + [...new Set(errors)].join('\n'));
  console.log(bad ? bad + ' unexpected' : 'all as expected');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
