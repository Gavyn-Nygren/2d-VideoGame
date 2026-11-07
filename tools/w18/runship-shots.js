#!/usr/bin/env node
// Screenshots of a level at chosen moments (for checking the art), with the computer playing both players.
// Usage: node tools/w18/runship-shots.js [--name='Runaway Ship'] [--at=2,10,30] [--w=1280] [--h=800] [--room=0] [--out=build/shots]
//        [--solo=1] (1-player mode: the person is Pip and presses nothing) [--touch=1] [--seed=1] [--intro=1] [--tag=x]
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const name = opt('name', 'Runaway Ship'), at = opt('at', '2,10,30').split(',').map(Number);
const vw = +opt('w', 1280), vh = +opt('h', 800), room = +opt('room', 0), out = opt('out', 'build/shots');
const solo = +opt('solo', 0), touch = +opt('touch', 0), seed = +opt('seed', 1), intro = +opt('intro', 0), tag = opt('tag', '');
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const ctxo = { viewport: { width: vw, height: vh } };
  if (touch) Object.assign(ctxo, { hasTouch: true, isMobile: true });
  const page = await browser.newPage(ctxo);
  const errors = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  await page.addInitScript(s => {
    const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    Math.random = gen(s * 7919);
  }, seed);
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  await page.evaluate(({ name, room, solo, intro }) => {
    const P = window.__pipbo, G = P.G;
    const i = P.LEVELS.findIndex(l => l.name === name);
    if (solo) { P.CPU.cfg.players = 1; P.CPU.cfg.human = 0; P.cpuApplyCfg(); } else G.cpuOn = [true, true];
    G.manual = true;
    P.loadLevel(i);
    for (let k = 0; k < room; k++) P.nextRoom();
    if (!intro) G.introT = 0;
    window.__simT = 0;
  }, { name, room, solo, intro });
  for (const t of at) {
    await page.evaluate(t => {
      const P = window.__pipbo, G = P.G;
      while (window.__simT < t && G.mode === 'play') { P.step(P.DT); window.__simT += P.DT; }
    }, t);
    await page.waitForTimeout(150);
    const f = path.join(out, (tag || name.replace(/\W+/g, '-').toLowerCase()) + '-r' + room + '-' + t + 's' + (touch ? '-touch' : '') + '.png');
    await page.screenshot({ path: f });
    const info = await page.evaluate(() => { const G = window.__pipbo.G; return { mode: G.mode, room: G.room, time: Math.round(G.time) }; });
    console.log(f, JSON.stringify(info));
  }
  if (errors.length) console.log('ERRORS:\n' + errors.join('\n'));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
