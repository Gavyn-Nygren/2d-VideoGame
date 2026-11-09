#!/usr/bin/env node
// Shipwreck Lights screenshots: loads index.html, starts 22-3 with G.manual and G.introT = 0, and drives both
// players through the real keyboard path (keys + pollInput) like two people: each frame it asks the level's computer
// brain what it would press and holds those keys (a press of 'tap' is a fresh key press), so nothing reads level state
// to cheat. Saves screenshots (deviceScaleFactor 1) to build/w21/.
// Usage: node tools/w22/shipwreck-shots.js [--at=3,8,14] [--room=0] [--w=960] [--h=540] [--touch=1] [--intro=1]
//        [--tag=x] [--solo=1] [--lazy=1 (Bo stands still from 3 s on: to see the stuck hints)]
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const at = opt('at', '3,8,14').split(',').map(Number), room = +opt('room', 0), vw = +opt('w', 960), vh = +opt('h', 540);
const touch = +opt('touch', 0), intro = +opt('intro', 0), tag = opt('tag', ''), solo = +opt('solo', 0), lazy = +opt('lazy', 0), out = 'build/w22';
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const co = { viewport: { width: vw, height: vh }, deviceScaleFactor: 1 };
  if (touch) Object.assign(co, { hasTouch: true, isMobile: true });
  const page = await browser.newPage(co);
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.addInitScript(() => {
    const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    Math.random = gen(4242);
  });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  if (touch) await page.evaluate(() => { document.documentElement.classList.add('has-touch'); });
  await page.evaluate(({ room, intro, solo, lazy }) => {
    const P = window.__pipbo, G = P.G;
    if (solo) { P.CPU.cfg.players = 1; P.CPU.cfg.human = 0; P.cpuApplyCfg(); } else { G.cpuOn = [false, false]; }
    G.manual = true;
    P.loadLevel(P.LEVELS.findIndex(l => l.name === 'Shipwreck Lights'));
    for (let k = 0; k < room; k++) P.nextRoom();
    if (!intro) G.introT = 0;
    window.__simT = 0;
    const KB = [{ left: 'KeyA', right: 'KeyD', jump: 'KeyW', down: 'KeyS', act: 'KeyF' }, { left: 'ArrowLeft', right: 'ArrowRight', jump: 'ArrowUp', down: 'ArrowDown', act: 'Slash' }];
    const brain = P.CPU.brains.shipwreck, S = [{}, {}], last = [{}, {}];
    brain.reset(S[0]); brain.reset(S[1]);
    let lastRoom = G.room;
    window.__drive = () => {
      if (G.room !== lastRoom) { lastRoom = G.room; brain.reset(S[0]); brain.reset(S[1]); }
      for (const p of G.players) {
        if (G.cpuOn[p.id]) continue;
        const o = G.players[1 - p.id];
        const info = { L: G.level, def: G.level.def, mst: G.mst, room: G.room, skill: 1, partnerCpu: true, partnerIdle: 0, frozen: false, intro: G.introT > 0, time: G.time };
        let r = brain.think(S[p.id], p, o, P.DT, info) || {};
        if (lazy && p.id === 1 && window.__simT > 3) r = {};
        for (const k of ['left', 'right', 'jump', 'down', 'act']) {
          const v = k === 'jump' ? (r.jump || r.up) : r[k];
          const want = v === 'tap' ? !last[p.id][k] : !!v;
          last[p.id][k] = want;
          if (want) P.keys.add(KB[p.id][k]); else P.keys.delete(KB[p.id][k]);
        }
      }
    };
  }, { room, intro, solo, lazy });
  for (const t of at) {
    await page.evaluate(t => {
      const P = window.__pipbo, G = P.G;
      while (window.__simT < t && (G.mode === 'play' || G.mode === 'clear')) { window.__drive(); P.pollInput(P.DT); P.step(P.DT); window.__simT += P.DT; }
    }, t);
    await page.waitForTimeout(await page.evaluate(() => window.__pipbo.G.mode === 'clear') ? 1800 : 200);
    const f = path.join(out, 'shipwreck-' + (tag ? tag + '-' : '') + 'r' + room + '-' + t + 's-' + vw + 'x' + vh + (touch ? '-touch' : '') + '.png');
    await page.screenshot({ path: f });
    const info = await page.evaluate(() => { const P = window.__pipbo, G = P.G, st = G.mst; return { mode: G.mode, room: G.room, time: +G.time.toFixed(1), state: st.state, bonks: st.stats && st.stats.bonks, need: st.walls && P.MODES.shipwreck.need(st).kind, actOn: document.documentElement.classList.contains('act-on'), actBtns: [...document.querySelectorAll('.tbtn-act')].map(b => b.textContent + ':' + (b.offsetParent ? 'shown' : 'hidden')) }; });
    console.log(f, JSON.stringify(info));
  }
  if (errors.length) console.log('ERRORS:\n' + errors.join('\n'));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
