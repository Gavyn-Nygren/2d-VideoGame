#!/usr/bin/env node
// Debug helper for the dino era of 30-1: the computer pair plays and the script prints what the Thief's trick timer
// does (which trick was tried, whether it started) plus any value asked for with --watch="js expression of ph, st".
//   node tools/w30/dino-dbg.js [--seed=1] [--max=200] [--who=pair|solo0|solo1] [--watch="ph.fire.x"] [--every=5]
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));
  await page.addInitScript(() => {
    const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    let seeded = gen(1); const other = gen(12345);
    window.__inStep = false; window.__seed = n => { seeded = gen((n >>> 0) || 1); };
    Math.random = () => (window.__inStep ? seeded() : other());
  });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.MODES && window.__pipbo.MODES.timethief);
  const r = await page.evaluate(({ seed, maxT, who, watch, every }) => {
    const P = window.__pipbo, G = P.G, TT = P.MODES.timethief.test;
    window.__seed(seed * 7919); G.manual = true;
    G.cpuOn = who === 'solo0' ? [false, true] : who === 'solo1' ? [true, false] : [true, true];
    TT.jump(0, {});
    const st = G.mst, ph = st.ph, lines = [];
    const w = watch ? new Function('ph', 'st', 'G', 'return (' + watch + ')') : null;
    let lastN = 0, lastMode = '', n = 0, lastB = 0, lastK = 0;
    const steps = Math.round(maxT / P.DT), ev = Math.round(every / P.DT);
    for (; n < steps && !st.cut; n++) {
      window.__inStep = true; P.step(P.DT); window.__inStep = false;
      const t = (n * P.DT).toFixed(1);
      if (ph.atkN !== lastN) { lastN = ph.atkN; lines.push(t + ' trick #' + ph.atkN + ' mets ' + ph.mets.length + ' thief ' + ph.th.mode + ' next in ' + ph.atkT.toFixed(1)); }
      if (ph.th.mode !== lastMode) { lastMode = ph.th.mode; lines.push(t + '   thief -> ' + lastMode); }
      if (ph.k !== lastK) { lastK = ph.k; lines.push(t + ' === stretch ' + (ph.k + 1)); }
      const bsum = st.stats.bumps[0] + st.stats.bumps[1] + st.stats.team;
      if (bsum !== lastB) { lastB = bsum; lines.push(t + ' BUMP ' + JSON.stringify(st.stats.kinds) + ' holder ' + ph.egg.by + ' ' + ph.egg.state + ' gate ' + (ph.gate && ph.gate.kind) + ' thief ' + ph.th.mode + ' mets ' + ph.mets.map(m => Math.round(m.x) + ':' + m.state).join(',') + ' ps ' + G.players.map(q => Math.round(q.x + q.w / 2 + st.cam.x) + (ph.P[q.id].duck ? 'duck' : '') + (ph.P[q.id].post ? 'post' : '')).join(' ') + ' fire ' + Math.round(ph.fire.x)); }
      if (w && n % ev === 0) lines.push(t + '   watch ' + JSON.stringify(w(ph, st, G)));
    }
    return { lines, t: st.phT, own: st.stats.dino, bumps: st.stats.bumps, kinds: st.stats.kinds, help: st.stats.help };
  }, { seed: +opt('seed', 1), maxT: +opt('max', 200), who: opt('who', 'pair'), watch: opt('watch', ''), every: +opt('every', 5) });
  console.log(r.lines.join('\n'));
  console.log(JSON.stringify({ t: r.t, own: r.own, bumps: r.bumps, kinds: r.kinds, help: r.help }));
  if (errs.length) console.log('PAGE MESSAGES:\n' + errs.slice(0, 10).join('\n'));
  await browser.close();
})().catch(e => { console.error(e); process.exit(2); });
