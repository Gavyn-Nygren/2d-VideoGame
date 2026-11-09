#!/usr/bin/env node
// 22-4 Dolphin Race: do the keyboard, a (stubbed) controller and the touch buttons reach the level?
//   node tools/w22/dolphinrace-input.js
// Pip uses the keyboard (W swims up, S dives, F leaps), Bo a controller (stick up / down, X leaps); then touch runs
// at 844x390 and 390x844 with Pip's ▲ ▼ and round "leap" buttons. Prints what each did; screenshots of the pause card.
'use strict';
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const errors = [], results = [], out = path.resolve(__dirname, '..', '..', 'build', 'w22');
  fs.mkdirSync(out, { recursive: true });
  for (const mode of ['kb+pad', 'touch-844x390', 'touch-390x844']) {
    const touch = mode.startsWith('touch'), [vw, vh] = touch ? mode.split('-')[1].split('x').map(Number) : [1280, 720];
    const ctx = await browser.newContext(touch ? { viewport: { width: vw, height: vh }, hasTouch: true, deviceScaleFactor: 1 } : { viewport: { width: vw, height: vh }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push(mode + ': ' + String(e)));
    page.on('console', m => { if (m.type() === 'error') errors.push(mode + ': ' + m.text()); });
    await page.addInitScript(() => {
      window.__pad = { buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })), axes: [0, 0, 0, 0], connected: true, mapping: 'standard', id: 'Stub pad', index: 1, timestamp: 0 };
      window.__padOn = false;
      const idle = { buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })), axes: [0, 0, 0, 0], connected: true, mapping: 'standard', id: 'Idle pad', index: 0, timestamp: 0 };
      // two controllers: the first (idle) is Pip's, the second is Bo's
      navigator.getGamepads = () => (window.__padOn ? [idle, window.__pad] : []);
    });
    await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
    await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
    await page.evaluate(mode => {
      const P = window.__pipbo, G = P.G;
      G.manual = true;
      if (mode === 'kb+pad') window.__padOn = true;
      P.loadLevel(P.LEVELS.findIndex(l => l.name === 'Dolphin Race'));
      G.cpuOn = [false, false]; G.introT = 0;
      P.fit();
      window.__run = s => { for (let k = 0; k < Math.round(s / P.DT); k++) { P.pollInput(P.DT); P.step(P.DT); } };
      let n = 0; while (G.match.phase !== 'live' && n++ < 2000) { P.pollInput(P.DT); P.step(P.DT); }
    }, mode);
    const st = () => page.evaluate(() => window.__pipbo.G.mst.pl.map(q => ({ y: Math.round(q.y), vy: Math.round(q.vy), air: q.air, cd: +q.leapCd.toFixed(2), started: q.started })));
    const run = s => page.evaluate(s => window.__run(s), s);
    if (mode === 'kb+pad') {
      await run(1.2);
      const a = await st();
      await page.keyboard.down('KeyS'); await page.evaluate(() => { window.__pad.axes[1] = 1; });
      await run(0.3); const b = await st();
      results.push(`S / stick down 0.3 s: Pip y ${a[0].y} -> ${b[0].y}, Bo y ${a[1].y} -> ${b[1].y}`);
      await page.keyboard.up('KeyS'); await page.evaluate(() => { window.__pad.axes[1] = 0; });
      await page.keyboard.down('KeyW'); await page.evaluate(() => { window.__pad.axes[1] = -1; });
      await run(0.35); const c = await st();
      results.push(`W / stick up 0.35 s: Pip vy ${c[0].vy}, Bo vy ${c[1].vy}`);
      await page.keyboard.up('KeyW'); await page.evaluate(() => { window.__pad.axes[1] = 0; });
      await run(1.0);
      await page.keyboard.down('KeyF'); await page.evaluate(() => { window.__pad.buttons[2] = { pressed: true, value: 1 }; });
      await run(0.05);
      await page.keyboard.up('KeyF'); await page.evaluate(() => { window.__pad.buttons[2] = { pressed: false, value: 0 }; });
      await run(0.4); const d = await st();
      results.push(`F / pad X leap: Pip air=${d[0].air} cd ${d[0].cd}, Bo air=${d[1].air} cd ${d[1].cd}`);
      results.push('Bo chip keys: ' + await page.evaluate(() => JSON.stringify(dlrKeys(1))));
    } else {
      const down = (sel, on) => page.evaluate(({ sel, on }) => { const el = document.querySelector(sel); el.dispatchEvent(new PointerEvent(on ? 'pointerdown' : 'pointerup', { bubbles: true, pointerId: 7, pointerType: 'touch', isPrimary: true })); }, { sel, on });
      const act = await page.evaluate(() => { const el = document.querySelector('#padPip .tbtn-act'); const r = el.getBoundingClientRect(); return el.textContent + ' ' + Math.round(r.width) + 'x' + Math.round(r.height); });
      results.push(mode + ' act button: ' + act);
      await run(1.0); const a = await st();
      await down('#padPip [data-k="down"]', true); await run(0.3); await down('#padPip [data-k="down"]', false);
      const b = await st();
      results.push(`${mode} touch ▼ 0.3 s: Pip y ${a[0].y} -> ${b[0].y}`);
      await down('#padPip [data-k="jump"]', true); await run(0.15); const c = await st(); await down('#padPip [data-k="jump"]', false);
      results.push(`${mode} touch ▲: Pip vy ${c[0].vy}`);
      await run(0.8);
      await down('#padPip .tbtn-act', true); await run(0.05); await down('#padPip .tbtn-act', false); await run(0.4);
      const e = await st();
      results.push(`${mode} touch leap: Pip air=${e[0].air} cd ${e[0].cd}`);
      await page.waitForTimeout(100);
      await page.screenshot({ path: path.join(out, 'dr-touch-' + vw + 'x' + vh + '-play.png') });
      await page.evaluate(() => window.__pipbo.pause());
      results.push(mode + ' pause card: ' + await page.evaluate(() => (document.querySelector('#overlay') || {}).innerText.replace(/\s+/g, ' ').slice(0, 220)));
      await page.screenshot({ path: path.join(out, 'dr-touch-' + vw + 'x' + vh + '-pause.png') });
    }
    await ctx.close();
  }
  console.log(results.join('\n'));
  console.log(errors.length ? 'ERRORS\n' + errors.join('\n') : 'no page errors');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
