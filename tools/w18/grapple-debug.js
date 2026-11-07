#!/usr/bin/env node
// Prints the state of 18-2 Grapple & Zip every few seconds while the computer plays both (for tuning the brain).
// Usage: node tools/w18/grapple-debug.js [--every=2] [--max=400] [--seed=1] [--room=0] [--noisy=0|1]
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
  page.on('console', m => { if (m.type() === 'error' || m.text().startsWith('DBG')) console.log(m.text()); });
  page.on('pageerror', e => console.log('PAGEERR', String(e)));
  const seed = +opt('seed', 1);
  await page.addInitScript(seed => {
    let s = seed * 7919; const gen = () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    Math.random = gen;
  }, seed);
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const out = await page.evaluate(({ every, max, room }) => {
    const P = window.__pipbo, G = P.G, i = P.LEVELS.findIndex(l => l.name === 'Grapple & Zip');
    G.manual = true; G.cpuOn = [true, true];
    P.loadLevel(i);
    for (let k = 0; k < room; k++) P.nextRoom();
    const lines = []; let t = 0, nextP = 0, lastPh = '';
    while (t < max && G.mode !== 'clear' && G.mode !== 'results') {
      if (G.mode === 'play' || G.mode === 'intro') P.step(P.DT); else P.step(P.DT);
      t += P.DT;
      const st = G.mst, hop = st && st.hop;
      const ph = hop ? hop.i + ':' + hop.phase : '-';
      if (ph !== lastPh || t >= nextP) {
        if (t >= nextP) nextP += every;
        lastPh = ph;
        const pl = st.pl.map((q, id) => `${'PB'[id]} ${q.mode}${q.onNest ? '^' : ''} x${Math.round(q.x)} h${Math.round(q.h || 0)} job=${(MODES.grapple.needs(st, id) || {}).job}${q.zip ? ' s' + Math.round(q.zip.s) + ' v' + Math.round(q.zip.v || 0) + ' ' + q.zip.at : ''} in=${JSON.stringify(G.players[id].input).replace(/"|false|,/g, '')}`).join(' | ');
        lines.push(`${t.toFixed(1)} ${G.mode} r${G.room} ${ph} T=${hop && hop.T} ang=${hop && hop.ang && hop.ang.toFixed(1)} pow=${hop && hop.pow && hop.pow.toFixed(2)} tries=${hop && hop.tries} | ${pl}`);
      }
      if (lines.length > 3000) break;
    }
    lines.push('END ' + t.toFixed(1) + ' ' + G.mode + ' room ' + G.room + ' ' + JSON.stringify(G.mst.stats));
    return lines;
  }, { every: +opt('every', 2), max: +opt('max', 400), room: +opt('room', 0) });
  console.log(out.join('\n'));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
