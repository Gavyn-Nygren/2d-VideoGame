#!/usr/bin/env node
// Hot Dog Stand Rush trace: a computer pair plays one shift of 23-3 and every --every seconds prints the shift clock,
// the line, the window, the board's needs, the grill, both jobs and what each one holds (for tuning and debugging).
// Usage: node tools/w23/hotdog-trace.js [--room=3] [--seed=1] [--every=1]
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const room = +opt('room', 3), seed = +opt('seed', 1), every = +opt('every', 1);
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('pageerror', e => console.log('PAGE ERR', String(e)));
  await page.addInitScript(() => {
    const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    let seeded = gen(1);
    window.__seed = n => { seeded = gen((n >>> 0) || 1); };
    Math.random = () => seeded();
  });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const lines = await page.evaluate(({ room, seed, every }) => {
    const P = window.__pipbo, G = P.G, M = P.MODES.hotdog, out = [];
    window.__seed(seed * 7919);
    G.manual = true; G.cpuOn = [true, true];
    P.loadLevel(P.LEVELS.findIndex(l => l.name === 'Hot Dog Stand Rush'));
    for (let k = 0; k < room; k++) P.nextRoom();
    G.introT = 0;
    const st = G.mst, k0 = st.k;
    let n = 0;
    while (G.mode === 'play' && st.k === k0 && n < 120 * 200) {
      P.step(P.DT); n++;
      if (n % Math.round(every * 120) === 0) {
        const pl = M.plan(st), jc = M.job(st, st.cook), js = M.job(st, st.serv);
        const g = st.grill.map(s => (s ? (s.burnt ? 'B' : s.t < M.HD.cookT ? 'r' : 'G') : '.')).join('');
        out.push(`${(n / 120).toFixed(0).padStart(3)}s left ${st.left.toFixed(0).padStart(2)} ${st.state} line ${st.queue.length} win [${st.spotOcc.map(c => c ? c.state[0] + c.order.length + ':' + Math.round(c.pat) : '-').join(' ')}] needs ${pl.needs.length} grill ${g} shelf ${st.shelf.map(x => x ? x.slice(2) || 'p' : '.').join('')} cook ${jc.k}${jc.t || ''} hold ${st.hold ? st.hold.kind[0] + (st.hold.tops || '') : '-'} | serv ${js.k} hands ${st.hands.map(x => x.slice(2) || x).join(',')} cup ${st.cup.toFixed(2)}`);
      }
    }
    out.push('shift: ' + JSON.stringify(st.stats.shifts[st.stats.shifts.length - 1]));
    return out;
  }, { room, seed, every });
  console.log(lines.join('\n'));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
