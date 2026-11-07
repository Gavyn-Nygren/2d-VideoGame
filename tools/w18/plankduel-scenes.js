#!/usr/bin/env node
// Screenshots of 18-4 Plank Duel in 1-player mode at the moments that are hard to reach in a bot match: the person's
// hint chips, gold help (round card and Polly's call), a gust warning, the Last Clash and the pause card.
//   node tools/w18/plankduel-scenes.js [--w=1280 --h=800] [--touch=1] [--human=0|1] [--out=build/w18]
'use strict';
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const w = +opt('w', 1280), h = +opt('h', 800), touch = +opt('touch', 0), human = +opt('human', 0);
const out = path.resolve(opt('out', 'build/w18')), tag = 'scene-' + w + 'x' + h + (touch ? 't' : '') + '-p' + human;
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const ctxo = { viewport: { width: w, height: h } };
  if (touch) Object.assign(ctxo, { hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const page = await (await browser.newContext(ctxo)).newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  await page.addInitScript(() => {
    const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    let seeded = gen(9); Math.random = () => seeded();
  });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const load = (twist) => page.evaluate(({ human, twist, touch }) => {
    const P = window.__pipbo, G = P.G, i = P.LEVELS.findIndex(l => l.name === 'Plank Duel');
    G.manual = true;
    P.MODES.plankduel.testTwist = twist || undefined;
    P.cpuSetCfg('players', 1); P.cpuSetCfg('human', human);
    if (touch) { try { enableTouch(); } catch (e) { /* */ } }
    P.loadLevel(i); P.fit();
    // the person's keys: nothing unless a scene says so
    window.__keys = {};
    window.__run = (secs, until) => {
      const n = Math.round(secs / P.DT);
      for (let k = 0; k < n && G.mode === 'play'; k++) {
        const p = G.players[human], want = window.__keys;
        for (const key of ['left', 'right', 'down', 'up']) p.input[key] = !!want[key];
        const a = !!want.act; if (a && !p.prevAct) { p.pendingAct = true; p.actAge = 0; } p.prevAct = a; p.input.act = a;
        P.step(P.DT);
        if (until && until(G)) return true;
      }
      return false;
    };
  }, { human, twist, touch });
  const shot = async name => { await page.waitForTimeout(80); await page.screenshot({ path: path.join(out, tag + '-' + name + '.png') }); };
  // 1. round 1: stand in reach and do nothing: the swing hint, then a block hint while the computer winds up
  await load(null);
  await page.evaluate(() => window.__run(3.6));
  await shot('1-roundcard');
  await page.evaluate(h => window.__run(8, G => G.mst.d && G.mst.d[h].hint === 'swing'), human);
  await shot('2-hint-swing');
  await page.evaluate(h => window.__run(20, G => G.mst.d[h].hint === 'lo' || G.mst.d[h].hint === 'hi'), human);
  await shot('3-hint-block');
  await page.evaluate(h => window.__run(30, G => G.mst.d[h].teeter > 0.2), human);
  await shot('4-hint-teeter');
  // 2. gold: the computer wins two rounds, then round 3's card and Polly's call
  await load(null);
  await page.evaluate(h => {
    const G = window.__pipbo.G;
    for (let r = 0; r < 2; r++) {
      window.__run(60, G => G.match.phase === 'live');
      window.__pipbo.matchRoundEnd(1 - h, 'test');
      window.__run(6, G => G.match.phase === 'ready' && G.match.t > 0.4);
    }
  }, human);
  await shot('5-gold-card');
  await page.evaluate(h => window.__run(30, G => G.match.phase === 'live' && G.mst.d[1 - h].sw && G.mst.d[1 - h].sw.state === 'wind' && G.mst.d[1 - h].sw.t > 0.2), human);
  await shot('6-gold-polly');
  // 3. breezy cove: a gust warning
  await load('wind');
  await page.evaluate(() => window.__run(30, G => G.match.phase === 'live' && G.mst.gust && G.mst.gust.warn));
  await page.evaluate(() => window.__run(0.5));
  await shot('7-gust-warn');
  await page.evaluate(() => window.__run(2.2, G => G.mst.gust && G.mst.gust.on && G.mst.gust.t < 1.2));
  await shot('8-gust');
  // 4. the last clash card and the pause card
  await load('last');
  await page.evaluate(() => window.__run(3.4));
  await shot('9-lastclash-card');
  await page.evaluate(() => { window.__run(3); window.__pipbo.pause(); });
  await page.waitForTimeout(300);
  await shot('10-pause');
  console.log(errors.length ? errors.join('\n') : 'no console errors');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
