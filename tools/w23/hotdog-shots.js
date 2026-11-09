#!/usr/bin/env node
// Hot Dog Stand Rush screenshots: loads index.html, starts 23-3 (G.manual, G.introT = 0) with the computer brain
// pressing for both players (in 2-player view, so both players' arrows and chips show), and saves screenshots
// (deviceScaleFactor 1) to build/w23/ at the given simulated seconds of the chosen shift.
// Usage: node tools/w23/hotdog-shots.js [--room=0] [--at=4,12,25] [--w=960] [--h=540] [--touch=1] [--intro=1]
//        [--solo=1 (1-player: you are Pip, standing still)] [--seed=1] [--tag=x] [--gold=1 (turn on all gold help)]
//        [--end=1 (also play to the shift summary)]
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const at = opt('at', '4,12,25').split(',').map(Number), room = +opt('room', 0), vw = +opt('w', 960), vh = +opt('h', 540);
const touch = +opt('touch', 0), intro = +opt('intro', 0), solo = +opt('solo', 0), seed = +opt('seed', 1), tag = opt('tag', ''), gold = +opt('gold', 0), end = +opt('end', 0);
const out = path.resolve(__dirname, '..', '..', 'build', 'w23');
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const co = { viewport: { width: vw, height: vh }, deviceScaleFactor: 1 };
  if (touch) co.hasTouch = true;
  const page = await browser.newPage(co);
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.addInitScript(s => {
    const gen = q => () => { q ^= q << 13; q >>>= 0; q ^= q >> 17; q ^= q << 5; q >>>= 0; return q / 4294967296; };
    Math.random = gen(s * 7919);
  }, seed);
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  if (touch) await page.evaluate(() => { document.documentElement.classList.add('has-touch'); window.__pipbo.fit(); });
  await page.evaluate(({ room, intro, solo, gold }) => {
    const P = window.__pipbo, G = P.G;
    if (solo) { P.CPU.cfg.players = 1; P.CPU.cfg.human = 0; P.cpuApplyCfg(); } else { P.CPU.cfg.players = 2; P.cpuApplyCfg(); G.cpuOn = [true, true]; }
    G.manual = true;
    P.loadLevel(P.LEVELS.findIndex(l => l.name === 'Hot Dog Stand Rush'));
    for (let k = 0; k < room; k++) P.nextRoom();
    if (!intro) G.introT = 0;
    if (gold) { const st = G.mst; st.bell = true; st.goldTimer = true; st.goldJug = true; }
    window.__simT = 0;
  }, { room, intro, solo, gold });
  const run = async secs => page.evaluate(n => {
    const P = window.__pipbo, G = P.G;
    for (let i = 0; i < n && G.mode === 'play'; i++) { P.step(P.DT); if (window.__keepGold) { const st = G.mst; st.bell = st.goldTimer = st.goldJug = true; } }
    window.__simT += n * P.DT;
    return { mode: G.mode, k: G.mst.k, state: G.mst.state };
  }, Math.round(secs * 120));
  if (gold) await page.evaluate(() => { window.__keepGold = true; });
  let t = 0;
  for (const s of at) {
    const r = await run(s - t); t = s;
    await page.waitForTimeout(120);
    const f = `${out}/hotdog${tag}-r${room}-${String(s).replace('.', '_')}s-${vw}x${vh}${solo ? '-solo' : ''}.png`;
    await page.screenshot({ path: f });
    console.log(f, JSON.stringify(r));
  }
  if (end) {
    for (let k = 0; k < 120; k++) { const r = await run(1); if (r.state === 'clear' || r.state === 'end' || r.k !== room) break; }
    await run(0.9);
    await page.waitForTimeout(120);
    const f = `${out}/hotdog${tag}-r${room}-summary-${vw}x${vh}.png`;
    await page.screenshot({ path: f }); console.log(f);
  }
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
