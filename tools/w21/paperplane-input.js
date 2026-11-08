#!/usr/bin/env node
// 21-4 Paper Plane Race: do the keyboard, a (stubbed) controller and the touch buttons reach the level?
//   node tools/w21/paperplane-input.js
// Pip uses the keyboard (F to throw, W to tilt up, S down, F to flap), Bo a controller (X throws, stick up/down,
// X flaps); then a touch run with Pip's round button and ▲ ▼ buttons. Prints what each did.
'use strict';
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const results = [];
  for (const mode of ['kb+pad', 'touch']) {
    const ctx = await browser.newContext(mode === 'touch' ? { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 } : { viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.addInitScript(() => {
      window.__pad = { buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })), axes: [0, 0, 0, 0], connected: true, mapping: 'standard', id: 'Stub pad', index: 0, timestamp: 0 };
      window.__padOn = false;
      window.__pad.index = 1;
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
      P.loadLevel(P.LEVELS.findIndex(l => l.name === 'Paper Plane Race'));
      G.cpuOn = [false, false]; G.introT = 0;
      P.fit();
      window.__run = s => { for (let k = 0; k < Math.round(s / P.DT); k++) { P.pollInput(P.DT); P.step(P.DT); } };
      window.__toLive = () => { let n = 0; while (G.match.phase !== 'live' && n++ < 2000) { P.pollInput(P.DT); P.step(P.DT); } };
      window.__toLive();
    }, mode);
    const st = () => page.evaluate(() => { const s = window.__pipbo.G.mst; return s.pl.map(q => ({ phase: q.phase, charging: q.charging, power: +q.power.toFixed(2), ang: +q.ang.toFixed(2), flaps: q.flaps, sp: Math.round(q.sp) })); });
    const run = s => page.evaluate(s => window.__run(s), s);
    if (mode === 'kb+pad') {
      await page.keyboard.down('KeyF');
      await page.evaluate(() => { window.__pad.buttons[2] = { pressed: true, value: 1 }; });
      await run(0.5);
      const a = await st();
      results.push('hold F / pad X 0.5 s: Pip charging=' + a[0].charging + ' power ' + a[0].power + ', Bo charging=' + a[1].charging + ' power ' + a[1].power);
      await page.keyboard.up('KeyF');
      await page.evaluate(() => { window.__pad.buttons[2] = { pressed: false, value: 0 }; });
      await run(0.05);
      const b = await st();
      results.push('let go: Pip ' + b[0].phase + ' sp ' + b[0].sp + ', Bo ' + b[1].phase + ' sp ' + b[1].sp);
      await run(0.6);
      const a0 = await st();
      await page.keyboard.down('KeyW'); await page.evaluate(() => { window.__pad.axes[1] = -1; });
      await run(0.25);
      const c = await st();
      results.push('W / stick up 0.25 s: Pip ang ' + a0[0].ang + ' -> ' + c[0].ang + ', Bo ang ' + a0[1].ang + ' -> ' + c[1].ang);
      await page.keyboard.up('KeyW'); await page.evaluate(() => { window.__pad.axes[1] = 0; });
      await page.keyboard.down('KeyS'); await page.evaluate(() => { window.__pad.axes[1] = 1; });
      await run(0.4);
      const d = await st();
      results.push('S / stick down 0.4 s: Pip ang ' + d[0].ang + ', Bo ang ' + d[1].ang);
      await page.keyboard.up('KeyS'); await page.evaluate(() => { window.__pad.axes[1] = 0; });
      await page.keyboard.down('KeyF'); await page.evaluate(() => { window.__pad.buttons[2] = { pressed: true, value: 1 }; });
      await run(0.05);
      await page.keyboard.up('KeyF'); await page.evaluate(() => { window.__pad.buttons[2] = { pressed: false, value: 0 }; });
      await run(0.05);
      const e = await st();
      results.push('tap F / pad X: Pip flaps ' + d[0].flaps + ' -> ' + e[0].flaps + ', Bo flaps ' + d[1].flaps + ' -> ' + e[1].flaps);
      results.push('Bo chip keys: ' + await page.evaluate(() => { try { return JSON.stringify(ppKeys(1)); } catch (e) { return String(e); } }));
    } else {
      const box = async sel => page.evaluate(sel => { const r = document.querySelector(sel).getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, txt: document.querySelector(sel).textContent }; }, sel);
      const act = await box('#padPip .tbtn-act');
      results.push('touch act button: "' + act.txt + '" ' + Math.round(act.w) + ' px wide');
      const down = (sel, on) => page.evaluate(({ sel, on }) => { const el = document.querySelector(sel); el.dispatchEvent(new PointerEvent(on ? 'pointerdown' : 'pointerup', { bubbles: true, pointerId: 7, pointerType: 'touch', isPrimary: true })); }, { sel, on });
      await down('#padPip .tbtn-act', true); await run(0.55);
      const a = await st();
      results.push('touch hold act 0.55 s: Pip charging=' + a[0].charging + ' power ' + a[0].power);
      await down('#padPip .tbtn-act', false); await run(0.05);
      const b = await st();
      results.push('touch let go: Pip ' + b[0].phase + ' sp ' + b[0].sp);
      await run(4);
      results.push('touch label once both fly: "' + (await box('#padPip .tbtn-act')).txt + '"');
      const a0 = await st();
      await down('#padPip [data-k="jump"]', true); await run(0.25); const c = await st(); await down('#padPip [data-k="jump"]', false);
      results.push('touch ▲ 0.25 s: Pip ang ' + a0[0].ang + ' -> ' + c[0].ang);
      await down('#padPip .tbtn-act', true); await run(0.05); await down('#padPip .tbtn-act', false); await run(0.05);
      const e = await st();
      results.push('touch tap act: Pip flaps ' + c[0].flaps + ' -> ' + e[0].flaps);
      results.push('Pip chip keys: ' + await page.evaluate(() => { try { return JSON.stringify(ppKeys(0)); } catch (e) { return String(e); } }));
      // the pause card's tip
      await page.evaluate(() => window.__pipbo.pause());
      results.push('pause card: ' + await page.evaluate(() => (document.querySelector('#overlay') || {}).innerText.replace(/\s+/g, ' ').slice(0, 300)));
      await page.screenshot({ path: path.resolve(__dirname, '..', '..', 'build', 'w21', 'pp-pause-844x390.png') });
    }
    await ctx.close();
  }
  console.log(results.join('\n'));
  console.log(errors.length ? 'ERRORS\n' + errors.join('\n') : 'no page errors');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
