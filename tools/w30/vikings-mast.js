#!/usr/bin/env node
// 30-1 vikings, 1-player: a person who watches from the mast top without pressing anything is NOT away.
// The person rows stretch 1 (played by the era brain), becomes the lookout at the first buoy, bails the hull dry,
// climbs to the mast top and then presses nothing. For 20 s the Thief must not "wait" (st.idle) and the computer
// must keep rowing; a person who stays up there for good (swamped, or 45 s) does trigger the wait in the end.
//   node tools/w30/vikings-mast.js [--seed=1]
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const opt = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.MODES && window.__pipbo.MODES.timethief);
  const r = await page.evaluate(({ seed }) => {
    /* global G, CPU, cpuBrainFor, cpuInfo, cpuApply */
    const P = window.__pipbo, TT = P.MODES.timethief.test;
    G.manual = true;
    const era = TT.TTH_ORDER.indexOf('vikings');
    P.cpuSetCfg('players', 1); P.cpuSetCfg('human', 0);
    TT.jump(era, { seed, intro: false });
    const me = G.mst.ph.rower;                                  // the person rows first, so is the lookout in stretch 2
    if (me !== 0) { P.cpuSetCfg('human', me); TT.jump(era, { seed, intro: false }); }
    const hs = {}, brain = cpuBrainFor(G.level.def), p = G.players[me];
    if (brain.reset) brain.reset(hs, p, cpuInfo(p));
    const st = G.mst, ph = () => st.ph;
    let t = 0, mode = 'play', t0 = 0, d0 = 0, s0 = 0, idleAt = null, says = [];
    const res = { me, cpu: G.cpuOn.slice() };
    while (t < 200 && G.mode === 'play' && G.mst === st && !st.cut) {
      let o = {};
      const H = ph(), L = H.L;
      if (mode === 'play') {
        o = brain.think(hs, p, G.players[1 - me], P.DT, cpuInfo(p)) || {};
        if (H.k === 1 && H.state === 'sail' && H.rower !== me && L.onMast && L.h >= 100 && H.water < 0.2) { mode = 'watch'; t0 = t; d0 = H.dist; s0 = st.stats.vikings.strokes; res.startT = +t.toFixed(1); }
      } else o = {};                                            // watching: no key at all
      cpuApply(p, o);
      P.step(P.DT); t += P.DT;
      if (mode === 'watch') {
        if (st.idle && idleAt == null) { idleAt = +(t - t0).toFixed(1); res.idleSwamped = ph().swamped; res.idleWater = +ph().water.toFixed(2); }
        if (st.say && !says.includes(st.say.text) && /Hello|Tick, tock\.\.\./.test(st.say.text)) says.push(st.say.text);
        if (Math.abs(t - t0 - 20) < P.DT / 2) { res.at20 = { idle: !!st.idle, dist: Math.round(ph().dist - d0), strokes: st.stats.vikings.strokes - s0, k: ph().k, onMast: ph().L.onMast, water: +ph().water.toFixed(2), cpuIdle: +CPU.idle[me].toFixed(1) }; }
        if (t - t0 > 90) break;
      }
    }
    res.mode = mode; res.idleAfterWatch = idleAt; res.says = says; res.endK = ph().k; res.endState = ph().state;
    return res;
  }, { seed: +opt('seed', 1) });
  console.log(JSON.stringify(r, null, 1));
  if (errs.length) console.log('PAGE ERRORS:\n' + errs.join('\n'));
  const ok = r.mode === 'watch' && r.at20 && !r.at20.idle && r.at20.strokes >= 15 && r.at20.dist > 1500 && !errs.length && r.idleAfterWatch != null && r.idleAfterWatch > 20;
  console.log(ok ? 'PASS' : 'FAIL');
  await browser.close();
  process.exit(ok ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
