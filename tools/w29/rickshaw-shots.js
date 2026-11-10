#!/usr/bin/env node
// Runaway Rickshaw screenshots: node tools/w29/rickshaw-shots.js <t1,t2,...> [--solo=0|1] [--w=1100 --h=640] [--sloppy=0.3] [--pause] [--results] [--tag=name]
//   --solo=N    1-player mode: a scripted "person" plays character N with the brain's own moves (so prompts for a person show)
//   --sloppy=P  that person (or Pip, with two computers) skips this share of swings, swerves and hops, to show spills and gold help
//   --pause     also a shot of the pause card at the last time      --results   play on to the results card and shoot it
// Writes build/w29/rickshaw-<tag>-<t>.png
'use strict';
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const args = process.argv.slice(2), times = (args.find(a => !a.startsWith('--')) || '3,10').split(',').map(Number);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: +opt('w', 1100), height: +opt('h', 640) }, hasTouch: args.includes('--touch') });
  const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '../../index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const out = path.resolve(__dirname, '../../build/w29'); fs.mkdirSync(out, { recursive: true });
  const solo = +opt('solo', -1), tag = opt('tag', (solo >= 0 ? 'solo' + solo : 'pair') + (opt('w', '') ? '-' + opt('w', '') : ''));
  await page.evaluate(({ solo, sloppy }) => {
    const P = window.__pipbo, G = P.G, i = P.LEVELS.findIndex(l => l.mode === 'rickshaw');
    G.manual = true; G.cpuOn = solo < 0 ? [true, true] : [solo !== 0, solo !== 1];
    let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const lazy = { until: 0 };
    const mess = (o, t) => { if (!sloppy) return o; if (t > lazy.until && rnd() < sloppy * 0.02) lazy.until = t + 0.8 + rnd() * 1.5; return t < lazy.until ? {} : o; };
    P.CPU.filter = solo < 0 && sloppy ? (p, o) => (p.id === 0 ? mess(o, G.time) : o) : null;
    P.loadLevel(i);
    const last = { act: false }, S = {};
    window.__rkStep = n => {
      for (let k = 0; k < n && G.mode === 'play'; k++) {
        if (solo >= 0) {
          const p = G.players[solo], o = G.players[1 - solo];
          let w = P.CPU.brains.rickshaw.think(S, p, o, P.DT, { mst: G.mst, intro: G.introT > 0, partnerCpu: true }) || {};
          w = mess(w, G.time);
          const a = w.act === 'tap' ? !last.act : !!w.act;
          p.input.left = !!w.left; p.input.right = !!w.right; p.input.down = !!w.down; p.input.up = !!w.up; p.input.jump = false;
          if (a && !last.act) p.pendingAct = true;
          p.input.act = a; last.act = a;
        }
        P.step(P.DT);
      }
    };
  }, { solo, sloppy: +opt('sloppy', 0) });
  let t = 0;
  const shot = async name => { await page.waitForTimeout(90); await page.screenshot({ path: path.join(out, 'rickshaw-' + tag + '-' + name + '.png') }); };
  for (const tt of times) {
    await page.evaluate(n => window.__rkStep(n), Math.round((tt - t) * 120));
    t = tt;
    await shot(tt);
  }
  if (args.includes('--pause')) { await page.evaluate(() => window.__pipbo.pause()); await shot('pause'); await page.evaluate(() => window.__pipbo.resume()); }
  if (args.includes('--results')) {
    await page.evaluate(() => window.__rkStep(120 * 600));
    await page.evaluate(() => { const P = window.__pipbo; for (let k = 0; k < 400 && P.G.mode !== 'play'; k++) P.step(P.DT); });
    await page.waitForTimeout(600);
    await shot('results');
    console.log(await page.evaluate(() => JSON.stringify([window.__pipbo.G.mode, window.__pipbo.G.time, window.__pipbo.G.mst.waiting, window.__pipbo.G.mst.rk.x, window.__pipbo.G.mst.stats])));
  }
  console.log('errors:', errs.slice(0, 5));
  await browser.close();
})();
