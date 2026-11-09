#!/usr/bin/env node
// 23-4 Pie-Eating Contest: do the keyboard, a (stubbed) controller and the touch buttons reach the level?
//   node tools/w23/pieeat-input.js
// Desktop: Pip uses the keyboard (F bites, W gulps), Bo uses a controller (X bites, A gulps, then the stick up gulps);
// then Bo on the keyboard (/ bites, ↑ gulps) and Pip's Space gulp. Then touch at 844x390 and 390x844 with each pad's
// round "bite" button and ▲. Prints what each did and FAILs on anything that didn't reach the level; screenshots the
// touch layouts and the pause card in build/w23/.
'use strict';
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const errors = [], results = [], out = path.resolve(__dirname, '..', '..', 'build', 'w23');
  let fails = 0;
  const check = (name, cond, info) => { if (!cond) fails++; results.push((cond ? 'PASS ' : 'FAIL ') + name + (info ? '   [' + info + ']' : '')); };
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
      P.cpuSetCfg('players', 2);
      if (mode === 'kb+pad') window.__padOn = true;
      P.loadLevel(P.LEVELS.findIndex(l => l.name === 'Pie-Eating Contest'));
      G.cpuOn = [false, false]; G.introT = 0;
      P.fit();
      window.__run = s => { for (let k = 0; k < Math.round(s / P.DT); k++) { P.pollInput(P.DT); P.step(P.DT); } };
      let n = 0; while (G.match.phase !== 'live' && n++ < 2000) { P.pollInput(P.DT); P.step(P.DT); }
      // park the beat just before a clap so a gulp in 0.1 s lands on it
      window.__nearClap = () => { const st = G.mst; st.bph = Math.floor(st.bph) + 2 - 0.08 / P.MODES.pieeat.test.per(st); };
    }, mode);
    const st = () => page.evaluate(() => window.__pipbo.G.mst.pl.map(E => ({ cheeks: E.cheeks, left: E.left, eaten: E.eaten, pop: E.pop })));
    const run = s => page.evaluate(s => window.__run(s), s);
    const tap = async (key) => { await page.keyboard.down(key); await run(0.05); await page.keyboard.up(key); await run(0.4); };
    const btn = (i, on) => page.evaluate(({ i, on }) => { window.__pad.buttons[i] = { pressed: on, value: on ? 1 : 0 }; }, { i, on });
    if (mode === 'kb+pad') {
      await run(0.3);
      await tap('KeyF'); await tap('KeyF');
      await btn(2, true); await run(0.05); await btn(2, false); await run(0.4);
      await btn(2, true); await run(0.05); await btn(2, false); await run(0.4);
      const a = await st();
      check('keyboard F bites (Pip)', a[0].cheeks === 2, JSON.stringify(a[0]));
      check('controller X bites (Bo)', a[1].cheeks === 2, JSON.stringify(a[1]));
      await page.evaluate(() => window.__nearClap());
      await page.keyboard.down('KeyW'); await btn(0, true); await run(0.1); await page.keyboard.up('KeyW'); await btn(0, false); await run(0.3);
      const b = await st();
      check('keyboard W gulps on the clap (Pip: 2 + 2 bonus)', b[0].eaten === 4 && b[0].cheeks === 0, JSON.stringify(b[0]));
      check('controller A gulps on the clap (Bo: 2 + 2 bonus)', b[1].eaten === 4 && b[1].cheeks === 0, JSON.stringify(b[1]));
      await btn(2, true); await run(0.05); await btn(2, false); await run(0.4);
      await page.evaluate(() => window.__nearClap());
      await page.evaluate(() => { window.__pad.axes[1] = -1; }); await run(0.1); await page.evaluate(() => { window.__pad.axes[1] = 0; }); await run(0.3);
      const c = await st();
      check('controller stick up gulps (Bo)', c[1].eaten === 7, JSON.stringify(c[1]));
      results.push('   Bo chip keys with a controller: ' + await page.evaluate(() => JSON.stringify(pieeatKeys(1))));
      // the keyboard for Bo, and Space for Pip (controllers unplugged)
      await page.evaluate(() => { window.__padOn = false; });
      await page.evaluate(() => { const P = window.__pipbo, G = P.G; P.loadLevel(G.levelIndex); G.cpuOn = [false, false]; G.introT = 0; let n = 0; while (G.match.phase !== 'live' && n++ < 2000) { P.pollInput(P.DT); P.step(P.DT); } });
      await run(0.3);
      // (unplugging the controller pauses the game, as it should: carry on)
      const was = await page.evaluate(() => { const P = window.__pipbo, G = P.G, m = G.mode; if (m === 'paused') P.resume(); return m; });
      results.push('   unplugging the controller: the game was ' + was + ', now ' + await page.evaluate(() => window.__pipbo.G.mode));
      await run(0.3);
      await tap('Slash');
      await tap('Period');
      await tap('KeyE');
      const d = await st();
      check('keyboard / and . bite (Bo)', d[1].cheeks === 2, JSON.stringify(d[1]));
      check('keyboard E bites (Pip)', d[0].cheeks === 1, JSON.stringify(d[0]));
      await page.evaluate(() => window.__nearClap());
      await page.keyboard.down('ArrowUp'); await page.keyboard.down('Space'); await run(0.1); await page.keyboard.up('ArrowUp'); await page.keyboard.up('Space'); await run(0.3);
      const e = await st();
      check('keyboard ↑ gulps (Bo), Space gulps (Pip)', e[1].eaten === 4 && e[0].eaten === 3, JSON.stringify(e));
      results.push('   legend: ' + await page.evaluate(() => document.querySelector('header') ? document.querySelector('header').innerText.replace(/\s+/g, ' ').slice(0, 260) : ''));
      // the pause card (a keyboard Esc)
      await page.keyboard.press('Escape'); await page.waitForTimeout(150);
      const pc = await page.evaluate(() => (document.querySelector('#overlay') || {}).innerText.replace(/\s+/g, ' ').slice(0, 260));
      check('Esc opens the pause card with the tip', /Pause|Paused/i.test(pc) && /gulp/i.test(pc), pc);
      await page.screenshot({ path: path.join(out, 'pe-input-desk-pause.png') });
    } else {
      const press = (sel, on) => page.evaluate(({ sel, on }) => { const el = document.querySelector(sel); el.dispatchEvent(new PointerEvent(on ? 'pointerdown' : 'pointerup', { bubbles: true, pointerId: 7, pointerType: 'touch', isPrimary: true })); }, { sel, on });
      const act = await page.evaluate(() => { const el = document.querySelector('#padPip .tbtn-act'); const r = el.getBoundingClientRect(); return el.textContent.trim() + ' ' + Math.round(r.width) + 'x' + Math.round(r.height); });
      check(mode + ': the round touch button says "bite"', /^bite/.test(act), act);
      await run(0.3);
      for (const pad of ['#padPip', '#padBo']) { await press(pad + ' .tbtn-act', true); await run(0.05); await press(pad + ' .tbtn-act', false); await run(0.4); }
      for (const pad of ['#padPip', '#padBo']) { await press(pad + ' .tbtn-act', true); await run(0.05); await press(pad + ' .tbtn-act', false); await run(0.4); }
      const a = await st();
      check(mode + ': touch bite (both pads)', a[0].cheeks === 2 && a[1].cheeks === 2, JSON.stringify(a));
      await page.evaluate(() => window.__nearClap());
      await press('#padPip [data-k="jump"]', true); await press('#padBo [data-k="jump"]', true); await run(0.1);
      await press('#padPip [data-k="jump"]', false); await press('#padBo [data-k="jump"]', false); await run(0.3);
      const b = await st();
      check(mode + ': touch ▲ gulps on the clap (both)', b[0].eaten === 4 && b[1].eaten === 4, JSON.stringify(b));
      results.push('   ' + mode + ' key chip: ' + await page.evaluate(() => JSON.stringify(pieeatKeys(0))));
      await page.waitForTimeout(120);
      await page.screenshot({ path: path.join(out, 'pe-input-' + vw + 'x' + vh + '-play.png') });
      await page.evaluate(() => window.__pipbo.pause());
      const pc = await page.evaluate(() => (document.querySelector('#overlay') || {}).innerText.replace(/\s+/g, ' ').slice(0, 200));
      results.push('   ' + mode + ' pause card: ' + pc);
      await page.screenshot({ path: path.join(out, 'pe-input-' + vw + 'x' + vh + '-pause.png') });
    }
    await ctx.close();
  }
  console.log(results.join('\n'));
  console.log(errors.length ? 'ERRORS\n' + errors.join('\n') : 'no page errors');
  await browser.close();
  process.exit(fails || errors.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
