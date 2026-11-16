#!/usr/bin/env node
// 5-3 Ice Slide: solves every room with the computer partner's own copy of the ice rules (js/cpu/levels/world5/ice-slide.js)
// and prints, per room: how many resting spots the two of you can reach, the fewest moves to the door (go-backs not
// counted as moves, but shown), one shortest solution, and how many reachable spots need a go-back (hold ▼) to finish.
// Usage: node tools/w5/ice-solve.js [--rooms=path/to/rooms.js]  (a file that sets window.__iceRooms = [...] to try maps)
'use strict';
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('pageerror', e => console.log('PAGE ERROR', String(e)));
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  if (opt('rooms')) await page.evaluate(fs.readFileSync(opt('rooms'), 'utf8'));
  const out = await page.evaluate(() => {
    const P = window.__pipbo, G = P.G, m = P.CPU.brains.ice.model;
    const i = P.LEVELS.findIndex(l => l.name === 'Ice Slide');
    if (window.__iceRooms) P.LEVELS[i].rooms = window.__iceRooms;
    G.manual = true; G.cpuOn = [false, false];
    const res = [];
    for (let room = 0; room < P.LEVELS[i].rooms.length; room++) {
      P.loadLevel(i);
      for (let k = 0; k < room; k++) P.nextRoom();
      G.introT = 0;
      for (let k = 0; k < 5; k++) P.step(P.DT);
      const M = m.iceMap(), start = m.iceNode(M, m.icePosOf(G.players));
      while (!m.iceGrow(M, 1000));
      // BFS on moves (a go-back is free here but listed)
      const dist = new Map([[start.key, 0]]), prev = new Map(), q = [start];
      let goal = null;
      while (q.length) {
        const n = q.shift();
        if (n.goal) { goal = n; break; }
        for (const e of n.edges) {
          if (dist.has(e.to.key)) continue;
          dist.set(e.to.key, dist.get(n.key) + (e.m === 'B' ? 0 : 1)); prev.set(e.to.key, [n, e]);
          if (e.m === 'B') q.unshift(e.to); else q.push(e.to);
        }
      }
      const pathOut = [];
      for (let k = goal && goal.key; k && prev.has(k); k = prev.get(k)[0].key) { const [n, e] = prev.get(k); pathOut.unshift(['Pip', 'Bo'][e.k] + ' ' + e.m + ' -> ' + e.to.pos.join(',')); }
      // spots that can't reach the door without a go-back
      const nodes = [...M.nodes.values()];
      const okNoB = new Set(nodes.filter(n => n.goal).map(n => n.key));
      for (let changed = true; changed;) { changed = false; for (const n of nodes) if (!okNoB.has(n.key) && n.edges.some(e => e.m !== 'B' && okNoB.has(e.to.key))) { okNoB.add(n.key); changed = true; } }
      const dead = nodes.filter(n => n.d === Infinity).length;
      const spotsOf = k => [...new Set(nodes.map(n => n.pos[k * 2] + '@' + n.pos[k * 2 + 1]))].sort().join(' ');
      res.push({ pipSpots: spotsOf(0), boSpots: spotsOf(1), room: room + 1, title: P.LEVELS[i].rooms[room].title, spots: nodes.length, moves: goal ? dist.get(goal.key) : null, needB: nodes.length - okNoB.size, dead, path: pathOut, par: (P.LEVELS[i].rooms[room].ice || {}).par });
    }
    return res;
  });
  for (const r of out) {
    console.log(`Room ${r.room} ${r.title}: ${r.moves === null ? 'NOT SOLVABLE' : r.moves + ' moves'} (par ${r.par}), ${r.spots} spots, ${r.needB} need a go-back, ${r.dead} dead ends`);
    for (const s of r.path) console.log('   ' + s);
    if (args.includes('--spots')) console.log('   Pip: ' + r.pipSpots + '\n   Bo: ' + r.boSpots);
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
