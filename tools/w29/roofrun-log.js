#!/usr/bin/env node
// Plays 29-1 Rooftop Moonlight Run with a computer pair and logs every whoops, every missed moon star and how long
// each gap took: node tools/w29/roofrun-log.js [--noisy=0|1] [--seed=1]
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.addInitScript(seed => { let s = seed * 7919; Math.random = () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }, +opt('seed', 1));
  await page.goto('file://' + path.resolve(__dirname, '../../index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const log = await page.evaluate(noisy => {
    const P = window.__pipbo, G = P.G, i = P.LEVELS.findIndex(l => l.mode === 'roofrun'), out = [];
    G.manual = true; G.cpuOn = [true, true];
    if (noisy !== '') {
      const nz = { pause: 0, next: 3 + Math.random() * 6, wander: 0, wdir: 0, wnext: 6 + Math.random() * 8 }, who = +noisy;
      P.CPU.filter = (p, o, dt) => {
        if (p.id !== who) return o;
        if (nz.pause > 0) { nz.pause -= dt; return {}; }
        nz.next -= dt; if (nz.next <= 0) { nz.pause = 1 + Math.random() * 3; nz.next = 4 + Math.random() * 8; }
        nz.wnext -= dt; if (nz.wnext <= 0) { nz.wander = 0.4 + Math.random(); nz.wdir = Math.random() < 0.5 ? -1 : 1; nz.wnext = 6 + Math.random() * 10; }
        if (nz.wander > 0) { nz.wander -= dt; return { left: nz.wdir < 0, right: nz.wdir > 0 }; }
        if (Math.random() < 0.15 * dt) o.jump = true;
        if (Math.random() < 0.1 * dt) o.act = true;
        return o;
      };
    }
    P.loadLevel(i);
    let w = 0, gi = 0, room = 0, t0 = 0, ph = '', pt = 0;
    const missed = () => G.mst.c.coins.map((q, k) => (q.got ? null : k + '@' + Math.round(q.x) + ',' + Math.round(q.y))).filter(Boolean);
    for (let n = 0; n < 120 * 700 && G.mode === 'play'; n++) {
      const st = G.mst, before = st.run.map(r => r.st + ':' + r.why + ':' + Math.round(r.x)), c = st.c, k = st.k;
      P.step(P.DT);
      const s2 = G.mst;
      if (s2.stats.whoops !== w) { w = s2.stats.whoops; out.push(`t=${G.time.toFixed(1)} room ${G.room} gap ${s2.gi}: WHOOPS before=[${before}] now=[${s2.run.map(r => r.st)}]`); }
      if (s2.k !== k || G.mode !== 'play') out.push(`room ${k} done at t=${G.time.toFixed(1)}; missed stars: ${c.coins.filter(q => !q.got).length}/${c.coins.length}: ${c.coins.map((q, j) => (q.got ? null : j + '@' + Math.round(q.x) + ',' + Math.round(q.y))).filter(Boolean).join(' ')}`);
      else if (s2.gi !== gi) { out.push(`  gap ${gi} crossed at t=${G.time.toFixed(1)} (${(G.time - t0).toFixed(1)} s since the last)`); t0 = G.time; }
      gi = s2.gi;
    }
    out.push('mode ' + G.mode + ' time ' + G.time.toFixed(1) + ' stats ' + JSON.stringify(G.mst.stats) + ' stars ' + G.mst.stars + '/' + G.mst.totalStars);
    return out;
  }, opt('noisy', ''));
  console.log(log.join('\n')); console.log('errors:', errs.slice(0, 5));
  await browser.close();
})();
