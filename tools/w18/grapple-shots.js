#!/usr/bin/env node
// Screenshots of 18-2 Grapple & Zip at a few moments, with the computer playing both (or scripted steps).
// Usage: node tools/w18/grapple-shots.js [--w=1280 --h=800] [--times=3,12,20] [--room=0] [--out=build/w18] [--solo=0|1|none] [--touch]
//        [--view=2p|0|1] (the computer still plays, but the picture is drawn as if people play: both, or only Pip / Bo)
//        [--gold=1|2] (gives the hop gold / super gold help when the picture is taken) [--tag=name]
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const flag = k => args.includes('--' + k);
(async () => {
  const w = +opt('w', 1280), h = +opt('h', 800), out = opt('out', 'build/w18'), room = +opt('room', 0);
  const times = opt('times', '3,10,16,22,30').split(',').map(Number);
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const ctxOpts = { viewport: { width: w, height: h } };
  if (flag('touch')) Object.assign(ctxOpts, { hasTouch: true, isMobile: true });
  const page = await (await browser.newContext(ctxOpts)).newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  await page.addInitScript(() => {
    let s = 7; const gen = () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    Math.random = gen;
  });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const solo = opt('solo', '');
  await page.evaluate(({ room, solo }) => {
    const P = window.__pipbo, G = P.G, i = P.LEVELS.findIndex(l => l.name === 'Grapple & Zip');
    G.manual = true;
    G.cpuOn = solo === '' ? [true, true] : solo === 'none' ? [false, false] : solo === '0' ? [false, true] : [true, false];
    P.loadLevel(i);
    for (let k = 0; k < room; k++) P.nextRoom();
    window.__simT = 0;
  }, { room, solo });
  for (const t of times) {
    await page.evaluate(t => {
      const P = window.__pipbo, G = P.G;
      while (window.__simT < t && G.mode === 'play') { P.step(P.DT); window.__simT += P.DT; }
    }, t);
    await page.evaluate(({ view, gold, stuck }) => {
      const G = window.__pipbo.G, st = G.mst;
      window.__cpuWas = G.cpuOn.slice();
      if (view === '2p') G.cpuOn = [false, false]; else if (view === '0') G.cpuOn = [false, true]; else if (view === '1') G.cpuOn = [true, false];
      if (gold && st.hop) st.hop.gold = +gold;
      // --stuck: the hop has stalled, so Captain Polly flies over with a hint (the players are frozen for 2 s)
      if (stuck && st.hop) { const keep = G.players.map(p => p.input); st.hop.stuckT = 21; G.players.forEach(p => { p.input = {}; }); const on = G.cpuOn; G.cpuOn = [false, false]; for (let k = 0; k < 240; k++) window.__pipbo.step(window.__pipbo.DT); G.cpuOn = on; G.players.forEach((p, i) => { p.input = keep[i]; }); }
      // a few steps so prompts and hints for "people" show (the inputs stay the computer's)
      if (view) for (let k = 0; k < 3; k++) window.__pipbo.step(window.__pipbo.DT);
    }, { view: opt('view', ''), gold: opt('gold', ''), stuck: flag('stuck') });
    await page.waitForTimeout(150);
    const info = await page.evaluate(() => { const G = window.__pipbo.G, st = G.mst; return { mode: G.mode, room: G.room, hop: st.hop && st.hop.i, phase: st.hop && st.hop.phase, t: G.time.toFixed(1) }; });
    const f = path.join(out, `grapple-${w}x${h}-r${room}-t${t}${opt('tag', '')}.png`);
    await page.screenshot({ path: f });
    await page.evaluate(() => { window.__pipbo.G.cpuOn = window.__cpuWas; });
    console.log(f, JSON.stringify(info));
  }
  // --results: play on to the end and take the results card too
  if (flag('results')) {
    await page.evaluate(() => { const P = window.__pipbo, G = P.G; let n = 0; while (G.mode === 'play' && n < 600 * 120) { P.step(P.DT); n++; } });
    await page.waitForTimeout(4500);
    const f = path.join(out, `grapple-${w}x${h}-results.png`);
    await page.screenshot({ path: f }); console.log(f);
  }
  if (errors.length) console.log('ERRORS:\n' + errors.join('\n'));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
