#!/usr/bin/env node
// 1-player mode: the core's idle wait (st.idleT, reset at every era start) and the computer's "person is away" clock
// (CPU.idle, never reset between eras: it runs on through the portal cutscene and the room card) disagree at the start
// of an era. A person who only watches the cutscene and the card finds the computer frozen while the Thief is NOT
// waiting (hazards and the clock run). Prints, per era, when each one starts after the room card has gone.
'use strict';
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.MODES && window.__pipbo.MODES.timethief);
  let bad = 0;
  for (let k = 1; k < 10; k++) {
    const r = await page.evaluate(k => {
      const P = window.__pipbo, TT = P.MODES.timethief.test;
      G.manual = true; P.cpuSetCfg('players', 1); P.cpuSetCfg('human', 0);
      TT.jump(k - 1, { seed: 1 });
      // the person plays (holds right) right up to the moment the era is won, then only watches
      for (let n = 0; n < 60; n++) { G.players[0].input.right = true; P.step(P.DT); }
      G.players[0].input.right = false;
      TT.done({});
      let n = 0; while (G.mst.phaseNo === k - 1 && n++ < 2000) P.step(P.DT);
      while (G.introT > 0 && n++ < 4000) P.step(P.DT);
      const st = G.mst, out = { era: st.phase, cpuIdleAtCardEnd: +CPU.idle[0].toFixed(1), coreIdleTAtCardEnd: +st.idleT.toFixed(1) };
      let t = 0, frozenFrom = null, waitFrom = null, bumps0 = st.stats.bumps[0] + st.stats.bumps[1] + st.stats.team, moved = 0, x0 = G.players[1].x;
      const g0 = G.time;
      while (t < 12 && G.mst.phaseNo === k) {
        P.step(P.DT); t += P.DT;
        if (frozenFrom == null && CPU.st[1].away) frozenFrom = +t.toFixed(1);   // (the core brain threw the era brain's output away)
        if (waitFrom == null && st.idle) waitFrom = +t.toFixed(1);
        if (waitFrom != null && t > waitFrom + 0.3) break;   // (the brain sees st.idle one step later)
      }
      out.computerFrozenFrom = frozenFrom; out.thiefWaitsFrom = waitFrom; out.gap = waitFrom != null && frozenFrom != null ? +(waitFrom - frozenFrom).toFixed(1) : null;
      out.bumpsInGap = st.stats.bumps[0] + st.stats.bumps[1] + st.stats.team - bumps0; out.clockRan = +(G.time - g0).toFixed(1);
      return out;
    }, k);
    console.log(JSON.stringify(r));
    if (r.thiefWaitsFrom == null || r.computerFrozenFrom == null || Math.abs(r.gap) > 0.05) { bad++; console.log('  FAIL: the computer goes away and the Thief waits at different moments'); }
  }
  await browser.close();
  console.log(bad ? 'FAIL (' + bad + ')' : 'OK');
  process.exit(bad ? 1 : 0);
})();
