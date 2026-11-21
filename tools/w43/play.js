#!/usr/bin/env node
// 43-1 Coin Drop: play the whole ride with the computer on both coins (rules only, no drawing) and report.
//   node tools/w43/play.js [--runs=3] [--solo=0|1]   (solo: Bo is the computer, Pip presses nothing)
// Prints, per run: finished?, time, coins / max, sweeps, wipes (each with why and where), restarts, gold help, snaps,
// rescues, and the medal. Exit code 1 if a computer pair fails to finish.
'use strict';
const path = require('path'); const { chromium } = require('playwright');
const opt = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await b.newPage(); const errs = [];
  pg.on('pageerror', e => errs.push(String(e.stack || e)));
  await pg.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await pg.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  await pg.evaluate(() => window.__pipbo.K3D.need());
  const runs = +opt('runs', 2), solo = opt('solo', '0') === '1';
  let bad = 0;
  for (let r = 0; r < runs; r++) {
    const res = await pg.evaluate(async ({ r, solo }) => {
      const P = window.__pipbo, G = P.G;
      const i = P.LEVELS.findIndex(l => l.mode === 'arcadecoin');
      G.manual = true; P.K3D.noRender = true; G.cpuOn = solo ? [false, true] : [true, true];
      P.loadLevel(i);
      const st = G.mst; st.phaseT = ARCADECOIN.S.INTRO_T; // (skip the opening)
      let n = 0, done = false; const seen = new Set(), log = [];
      for (; n < 120 * 700; n++) {
        if (solo) for (const k in G.players[0].input) G.players[0].input[k] = false;
        P.step(P.DT);
        for (let j = Math.max(0, st.fx.length - 4); j < st.fx.length; j++) { const f = st.fx[j]; if ((f.k === 'wipe' || f.k === 'restart' || f.k === 'snap') && !seen.has(f)) { seen.add(f); log.push(f); } }
        if (st.finished || G.mode !== 'play') { done = true; break; }
        if (n % 4000 === 0) await new Promise(res => setTimeout(res, 0));
      }
      const wipes = log.filter(f => f.k === 'wipe');
      return { done, mode: G.mode, phase: st.phase, t: +st.t.toFixed(1), s: +st.s.toFixed(1), coins: st.coins, max: ARCADECOIN.maxCoins, sweeps: st.sweeps, rows: ARCADECOIN_ROUTE.lists.rows.length,
        wipes: st.wipes, restarts: st.restarts, gold: st.goldN, snaps: st.arc.snaps, rescues: st.rescues, perPart: st.wipeAt,
        list: wipes.map(f => (f.id ? 'Bo' : 'Pip') + ':' + f.why + '@' + f.s.toFixed(0) + '(x' + f.x.toFixed(1) + ')').join(' '), snapsAt: log.filter(f => f.k === 'snap').map(f => (+f.t).toFixed(0)).join(' ') };
    }, { r, solo });
    console.log('run', r + 1, JSON.stringify(res));
    if (!res.done) bad++;
  }
  if (errs.length) console.log('page errors:\n' + errs.slice(0, 8).join('\n'));
  await b.close();
  process.exit(bad || errs.length ? 1 : 0);
})();
