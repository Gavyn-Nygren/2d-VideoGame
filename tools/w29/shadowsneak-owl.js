#!/usr/bin/env node
// 29-2 Shadow Sneak gold owl (stuck-pair help): a computer pair where the thrower does nothing, so the post gets
// stuck; prints when the owl help is announced and hoots, whether the gate still opens, and takes screenshots.
// Usage: node tools/w29/shadowsneak-owl.js [--w=960 --h=540]  -> build/w29/ss-owl-<t>.png
'use strict';
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(a.indexOf('=') + 1) : d; };
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: +opt('w', 960), height: +opt('h', 540) } });
  const errs = []; page.on('pageerror', e => errs.push(String(e)));
  await page.goto('file://' + path.resolve(__dirname, '../../index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const out = path.resolve(__dirname, '../../build/w29'); fs.mkdirSync(out, { recursive: true });
  await page.evaluate(() => {
    const P = window.__pipbo, G = P.G;
    G.manual = true; G.cpuOn = [true, true];
    P.loadLevel(P.LEVELS.findIndex(l => l.mode === 'shadowsneak')); G.introT = 0;
    P.CPU.filter = (p, o) => (p.id === G.mst.thr ? {} : o);
    window.__log = [];
    let helps = 0, hooted = false;
    window.__run = secs => {
      for (let k = 0; k < secs * 120 && G.mode === 'play'; k++) {
        P.step(P.DT);
        const st = G.mst;
        if (st.stats.helps !== helps) { helps = st.stats.helps; window.__log.push(G.time.toFixed(1) + ' help: ' + (st.msg && st.msg.text)); }
        if (st.owl && st.owl.hooted && !hooted) window.__log.push(G.time.toFixed(1) + ' owl hoots at ' + Math.round(st.owl.tx - st.P.x0));
        hooted = !!(st.owl && st.owl.hooted);
        if (st.P.open && !window.__opened) { window.__opened = true; window.__log.push(G.time.toFixed(1) + ' gate opened by the sneaker'); }
      }
    };
  });
  for (const t of [44, 46.2, 47.0, 47.6, 52]) {
    await page.evaluate(t => window.__run(t - window.__pipbo.G.time), t);
    await page.waitForTimeout(100);
    await page.screenshot({ path: path.join(out, 'ss-owl-' + t + '.png') });
  }
  await page.evaluate(() => window.__run(40));
  console.log((await page.evaluate(() => window.__log)).join('\n'));
  console.log(errs.length ? 'ERRORS ' + errs.join(' | ') : 'no page errors');
  await browser.close();
})();
