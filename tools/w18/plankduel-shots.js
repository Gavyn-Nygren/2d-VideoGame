#!/usr/bin/env node
// Screenshots of 18-4 Plank Duel at several moments (computer vs computer), for checking the look.
//   node tools/w18/plankduel-shots.js [--w=1280 --h=800] [--touch=1] [--solo=1] [--twist=rock] [--out=build/w18]
'use strict';
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const w = +opt('w', 1280), h = +opt('h', 800), touch = +opt('touch', 0), solo = +opt('solo', 0), twist = opt('twist', null);
const out = path.resolve(opt('out', 'build/w18')), tag = opt('tag', w + 'x' + h + (touch ? 't' : '') + (solo ? 's' : '') + (twist ? '-' + twist : ''));
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const ctxo = { viewport: { width: w, height: h } };
  if (touch) Object.assign(ctxo, { hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const context = await browser.newContext(ctxo);
  const page = await context.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  await page.addInitScript(() => {
    const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    let seeded = gen(5); Math.random = () => seeded();
  });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  await page.evaluate(({ solo, twist, touch }) => {
    const P = window.__pipbo, G = P.G;
    const i = P.LEVELS.findIndex(l => l.name === 'Plank Duel');
    G.manual = true;
    if (twist) P.MODES.plankduel.testTwist = twist;
    if (solo) { P.cpuSetCfg('players', 1); P.cpuSetCfg('human', 0); }
    P.loadLevel(i);
    G.cpuOn = solo ? [false, true] : [true, true];
    if (touch) { try { enableTouch(); } catch (e) { /* */ } }
    P.fit();
  }, { solo, twist, touch });
  const shot = async name => { await page.waitForTimeout(60); await page.screenshot({ path: path.join(out, tag + '-' + name + '.png') }); };
  const run = async (secs, until) => page.evaluate(({ secs, until }) => {
    const P = window.__pipbo, G = P.G; const n = Math.round(secs / P.DT);
    for (let k = 0; k < n && G.mode === 'play'; k++) {
      P.step(P.DT);
      if (until) { const st = G.mst; if (until === 'wind' && st.d && st.d.some(D => D.sw && D.sw.state === 'wind' && D.sw.t > 0.25)) return true;
        if (until === 'fall' && st.d && st.d.some(D => D.fall && D.fall.splashed && D.fall.t > 0.5)) return true;
        if (until === 'charge' && st.d && st.d.some(D => D.sw && D.sw.state === 'charge')) return true;
        if (until === 'end' && G.match.phase === 'end' && G.match.t > 0.6) return true;
        if (until === 'teeter' && st.d && st.d.some(D => D.teeter > 0.3)) return true; }
    }
    return false;
  }, { secs, until });
  // keep drawing frames in between (render runs on rAF; G.manual only stops stepping)
  await run(1.0); await shot('1-intro');
  await run(1.9); await shot('2-roundcard');
  await run(2.6); await shot('3-go');
  await run(20, 'wind'); await shot('4-windup');
  await run(0.25); await shot('5-strike');
  await run(60, 'teeter'); await shot('6-teeter');
  await run(60, 'fall'); await shot('7-splash');
  await run(5, 'end'); await shot('8-banner');
  await run(4); await shot('9-round2');
  await page.evaluate(() => { const P = window.__pipbo, G = P.G; let n = 0; while (G.mode === 'play' && n++ < 120 * 900) P.step(P.DT); });
  await page.waitForTimeout(1600); await shot('10-results');
  console.log(errors.length ? errors.join('\n') : 'no console errors');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
