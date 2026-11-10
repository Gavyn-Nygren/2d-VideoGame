#!/usr/bin/env node
// Gold-help checks for 29-1 Rooftop Moonlight Run: node tools/w29/roofrun-gold.js
// Forces each kind of trouble with a computer pair and checks that the announced gold help turns up, is counted, and
// that the level can still be cleared afterwards:
//   miss   the thrower throws at the wrong moment 3 times at every gap             -> gold hook
//   early  the swinger leaps off the rope too early twice in every stretch         -> gold rope + gold ledge
//   drop   the thrower lets go half way through the pull twice in every stretch    -> gold loop
// Also writes build/w29/roofrun-gold-<kind>.png just after the first help of each kind.
'use strict';
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '../../index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const out = path.resolve(__dirname, '../../build/w29'); fs.mkdirSync(out, { recursive: true });
  for (const kind of ['miss', 'early', 'drop']) {
    await page.evaluate(kind => {
      const P = window.__pipbo, G = P.G, i = P.LEVELS.findIndex(l => l.mode === 'roofrun');
      G.manual = true; G.cpuOn = [true, true];
      const mem = { room: -1, gi: -1, n: 0 };
      P.CPU.filter = (p, o) => {
        const st = G.mst; if (!st || !st.c) return o;
        const pl = P.MODES.roofrun.plan(st);
        if (mem.room !== G.room) { mem.room = G.room; mem.n = 0; mem.gi = -1; }
        if (kind === 'miss' && p.id === st.thr && pl.phase === 'throw') {
          if (mem.gi !== st.gi) { mem.gi = st.gi; mem.n = 0; mem.th = st.stats.throws; }
          if (st.stats.throws - mem.th < 3 && !st.gold.hook) { o.act = pl.aiming && !pl.throwNow && st.hook.state === 'held' ? 'tap' : false; }
        }
        if (kind === 'early' && p.id === st.swg && pl.onRope && st.rc.sfall < 2 && !st.gold.rope) { if (st.c.gaps[st.gi].sw.t > 0.3) o.act = 'tap'; }
        if (kind === 'drop' && p.id === st.thr && pl.phase === 'pull' && st.rc.drop < 2 && !st.gold.loop) { if (st.c.gaps[st.gi].u > 0.4) o.act = false; }
        return o;
      };
      P.loadLevel(i);
      for (let n = 0; n < 120 * 120 && G.mode === 'play' && !G.mst.stats.helps; n++) P.step(P.DT);
      for (let n = 0; n < 120 * 1.2; n++) P.step(P.DT);
    }, kind);
    await page.waitForTimeout(120);
    await page.screenshot({ path: path.join(out, 'roofrun-gold-' + kind + '.png') });
    const first = await page.evaluate(() => { const G = window.__pipbo.G; return { t: Math.round(G.time), helps: G.mst.stats.helps, gold: G.mst.gold, msg: G.mst.msg && G.mst.msg.text }; });
    const r = await page.evaluate(() => {
      const P = window.__pipbo, G = P.G;
      for (let n = 0; n < 120 * 900 && G.mode === 'play'; n++) P.step(P.DT);
      P.CPU.filter = null;
      const s = G.mst.stats;
      return { mode: G.mode, time: Math.round(G.time), whoops: s.whoops, helps: s.helps, throws: s.hits + '/' + s.throws, card: P.MODES.roofrun.stats().slice(-1)[0] };
    });
    console.log(kind, 'first help:', JSON.stringify(first), '\n   end:', JSON.stringify(r));
  }
  console.log('errors:', errs.slice(0, 5));
  await browser.close();
})();
