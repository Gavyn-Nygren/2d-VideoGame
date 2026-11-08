#!/usr/bin/env node
// Shipwreck Lights sim: plays 22-3 with the computer at both seats (or one made clumsy / slow like a person) and prints
// per-section times, bonks, treasure, gold help and the medal.
// Usage: node tools/w22/shipwreck-sim.js [--seeds=1,2,3] [--noisy=0|1] [--clumsy=0|1] [--slow=0|1] [--trace=2] [--room=0]
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const seeds = opt('seeds', '1').split(',').map(Number), noisy = +opt('noisy', 0), clumsy = +opt('clumsy', 0), slow = +opt('slow', 0), trace = +opt('trace', 0), room0 = +opt('room', 0);
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
  for (const seed of seeds) {
    const r = await page.evaluate(({ seed, noisy, clumsy, slow, trace, room0 }) => {
      const P = window.__pipbo, G = P.G;
      window.__seed(seed * 7919);
      G.manual = true; G.cpuOn = [true, true];
      // a distracted person: pauses, wanders, random presses (noisy) or just slow to react (slow)
      const nz = { pause: 0, next: 3 + Math.random() * 6, wander: 0, wdir: 0, wnext: 6 + Math.random() * 8, lag: [] };
      P.CPU.filter = !(noisy || slow) ? null : (p, out, dt) => {
        if (p.id !== clumsy) return out;
        if (slow) { nz.lag.push(Object.assign({}, out)); const d = Math.round(0.35 / P.DT); if (nz.lag.length > d) out = nz.lag.shift(); else out = {}; if (Math.random() < 0.25 * dt) nz.pause = 0.6 + Math.random() * 1.2; }
        if (nz.pause > 0) { nz.pause -= dt; return {}; }
        if (noisy) {
          nz.next -= dt; if (nz.next <= 0) { nz.pause = 1 + Math.random() * 3; nz.next = 4 + Math.random() * 8; }
          nz.wnext -= dt; if (nz.wnext <= 0) { nz.wander = 0.4 + Math.random() * 1; nz.wdir = Math.random() < 0.5 ? -1 : 1; nz.wnext = 6 + Math.random() * 10; }
          if (nz.wander > 0) { nz.wander -= dt; return { left: nz.wdir < 0, right: nz.wdir > 0, up: Math.random() < 0.5 }; }
          if (Math.random() < 0.15 * dt) out.act = true;
        }
        return out;
      };
      const i = P.LEVELS.findIndex(l => l.name === 'Shipwreck Lights');
      P.loadLevel(i);
      for (let k = 0; k < room0; k++) P.nextRoom();
      const log = [];
      let n = 0, lastT = 0, bk = 0;
      while (n < 900 / P.DT && G.mode === 'play') {
        P.step(P.DT); n++;
        const st = G.mst;
        const b = st.stats.bonks[0] + st.stats.bonks[1];
        if (b > bk) { bk = b; const who = G.players.map(p => (p.x + st.camX) | 0); log.push(`  bonk r${G.room} t=${G.time.toFixed(1)} at ${who.join(',')} need=${P.MODES.shipwreck.need(st).kind}`); }
        if (trace && G.time - lastT >= trace) { lastT = G.time; const nd = P.MODES.shipwreck.need(st); log.push(`  t=${G.time.toFixed(1)} r${G.room} ${st.state} need=${nd.kind}@${nd.x | 0},${nd.y | 0} pip=${(G.players[0].x + st.camX) | 0},${G.players[0].y | 0} bo=${(G.players[1].x + st.camX) | 0},${G.players[1].y | 0}`); }
      }
      const st = G.mst, NAMES_ = ['Pip', 'Bo'];
      if (G.mode === 'play') log.push('  end: ' + G.players.map(p => { const S = P.CPU.st[p.id]; return NAMES_[p.id] + ' x=' + ((p.x + st.camX) | 0) + ' y=' + (p.y | 0) + ' v=' + (p.vx | 0) + ',' + (p.vy | 0) + ' last=' + JSON.stringify(P.CPU.last[p.id]) + ' goal=' + (S.goal ? (S.goal.x | 0) + ',' + (S.goal.y | 0) : '-') + ' path=' + (S.path ? S.path.length : 'null') + ' wait=' + (S.waiting || 0).toFixed(1); }).join(' | '));
      return { mode: G.mode, t: G.time.toFixed(1), room: G.room, stats: st.stats, gold: st.goldUsed, medal: P.MODES.shipwreck.medalOf(st), log, res: G.lmode.stats() };
    }, { seed, noisy, clumsy, slow, trace, room0 });
    const s = r.stats;
    console.log(`seed ${seed}: ${r.mode} t=${r.t} room=${r.room} bonks ${s.bonks} gems ${s.gems[0] + s.gems[1]}/${s.gemsAll} flashes ${s.flashes} hints ${s.hints} secT ${s.secT.map(x => x && x.toFixed(1)).join(',')} gold [${r.gold}] medal ${r.medal}`);
    if (r.log.length) console.log(r.log.slice(0, 60).join('\n'));
  }
  if (errors.length) console.log('ERRORS', [...new Set(errors)].join('\n'));
  await browser.close();
})();
