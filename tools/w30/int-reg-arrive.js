#!/usr/bin/env node
// Does an era start the same way when it is reached through the real portal cutscene (setup runs INSIDE the core's
// world-coords tick: tthCutStep -> nextRoom -> tthStartPhase) as when a test jumps to it (setup runs outside it)?
// tthInWorld's `finally` subtracts the NEW st.cam from the players after setup, so an era whose setup sets st.cam
// would get its players shifted. Also from a checkpoint (setup runs inside loadLevel). Prints both starts per era.
'use strict';
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.MODES && window.__pipbo.MODES.timethief);
  for (let k = 1; k < 10; k++) {
    const r = await page.evaluate(k => {
      const P = window.__pipbo, TT = P.MODES.timethief.test;
      G.manual = true; G.cpuOn = [false, false];
      const shape = o => { const out = {}; const walk = (v, key, d) => { if (d > 3) return; if (Array.isArray(v)) { out[key] = 'array(' + v.length + ')'; if (v.length && typeof v[0] === 'object') walk(v[0], key + '[0]', d + 1); } else if (v && typeof v === 'object') { if (v instanceof Element) { out[key] = 'el'; return; } for (const q of Object.keys(v)) walk(v[q], key ? key + '.' + q : q, d + 1); } else out[key] = typeof v === 'number' ? Math.round(v * 10) / 10 : v; }; walk(o, '', 0); return out; };
      const snap = () => { const st = G.mst; return { cam: { x: Math.round(st.cam.x), y: Math.round(st.cam.y) }, ps: G.players.map(p => [Math.round(p.x), Math.round(p.y), p.alive, p.grounded, Math.round(p.vx), Math.round(p.vy), p.face]), thief: [Math.round(st.thief.x), Math.round(st.thief.y), st.thief.pose, st.thief.jet, st.thief.item, st.thief.hidden], pkeys: Object.keys(G.players[0]).sort().join(','), stkeys: Object.keys(st).sort().join(','), ph: shape(st.ph), introT: G.introT, parts: G.particles.length, labels: G.level.def.act && G.level.def.act.labels, news: st.news && st.news.text }; };
      const run = (n) => { for (let i = 0; i < n; i++) P.step(P.DT); };
      // A: the test jump
      TT.jump(k, { seed: 5, intro: true }); const A0 = snap(), era = G.mst.phase; run(1); const A1 = snap(); run(Math.round(4.5 / P.DT)); const A2 = snap();
      // B: through the cutscene
      TT.jump(k - 1, { seed: 5 }); TT.cpClear(); TT.cp(true); TT.done({}); TT.seed(5);
      let n = 0; while (G.mst.phaseNo === k - 1 && n++ < 3000) P.step(P.DT);
      const B1 = snap(); run(Math.round(4.5 / P.DT)); const B2 = snap();
      // C: from a checkpoint (as after R, or another day)
      TT.seed(5); P.loadLevel(TT.index()); const C0 = snap(); run(1); const C1 = snap(); TT.cp(false); TT.cpClear();
      const diff = (a, b) => { const d = []; for (const key of ['cam', 'ps', 'thief', 'pkeys', 'stkeys', 'labels']) if (JSON.stringify(a[key]) !== JSON.stringify(b[key])) d.push(key + ': ' + JSON.stringify(a[key]).slice(0, 200) + ' vs ' + JSON.stringify(b[key]).slice(0, 200)); const ks = new Set([...Object.keys(a.ph), ...Object.keys(b.ph)]); for (const q of ks) if (JSON.stringify(a.ph[q]) !== JSON.stringify(b.ph[q])) d.push('ph.' + q + ': ' + JSON.stringify(a.ph[q]) + ' vs ' + JSON.stringify(b.ph[q])); return d; };
      return { era, cpPhase: C0 && G.mst.phase, cam: A1.cam, jumpVsCut_first: diff(A1, B1), jumpVsCut_4s: diff(A2, B2).slice(0, 12), jumpVsCp: diff(A1, C1), cpEra: C0.cam && G.mst.phaseNo };
    }, k);
    console.log('== ' + r.era + '  cam at start ' + JSON.stringify(r.cam));
    console.log('   jump vs cutscene, first tick: ' + (r.jumpVsCut_first.length ? '\n     ' + r.jumpVsCut_first.join('\n     ') : 'same'));
    console.log('   jump vs cutscene, after 4.5 s (card gone, 1 s of play): ' + (r.jumpVsCut_4s.length ? '\n     ' + r.jumpVsCut_4s.join('\n     ') : 'same'));
    console.log('   jump vs checkpoint load (' + r.cpPhase + '), first tick: ' + (r.jumpVsCp.length ? '\n     ' + r.jumpVsCp.join('\n     ') : 'same'));
  }
  console.log(errors.length ? 'ERRORS: ' + [...new Set(errors)].join(' | ') : 'no console errors');
  await browser.close();
})();
