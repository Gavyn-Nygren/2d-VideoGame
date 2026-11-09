#!/usr/bin/env node
// Tractor & Trailer input check: real keyboard events, a stubbed controller (navigator.getGamepads) and the touch
// buttons (at 844x390 and 390x844, hasTouch) all reach the level: gas, honk, walk, jump and hold; the round action
// buttons say "honk,hold" and swap with the jobs. Saves a screenshot per size to build/w23/.
// Usage: node tools/w23/haytractor-input.js
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
(async () => {
  fs.mkdirSync('build/w23', { recursive: true });
  const browser = await chromium.launch();
  const errors = [];
  let bad = 0;
  const check = (ok, what) => { console.log((ok ? 'ok   ' : 'BAD  ') + what); if (!ok) bad++; };
  for (const [vw, vh, touch] of [[960, 540, 0], [844, 390, 1], [390, 844, 1]]) {
    const co = { viewport: { width: vw, height: vh }, deviceScaleFactor: 1 };
    if (touch) Object.assign(co, { hasTouch: true });
    const page = await browser.newPage(co);
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.addInitScript(() => {
      window.__pad = { on: false, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) };
      navigator.getGamepads = () => [window.__pad.on ? { id: 'Xbox stub', index: 0, connected: true, mapping: 'standard', timestamp: performance.now(), axes: window.__pad.axes, buttons: window.__pad.buttons } : null, null, null, null];
    });
    await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
    await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
    if (touch) await page.evaluate(() => { document.documentElement.classList.add('has-touch'); window.dispatchEvent(new Event('resize')); });
    await page.evaluate(() => {
      const P = window.__pipbo, G = P.G;
      P.CPU.cfg.players = 2; P.cpuApplyCfg(); G.cpuOn = [false, false]; G.manual = true;
      P.loadLevel(P.LEVELS.findIndex(l => l.name === 'Tractor & Trailer'));
      G.introT = 0;
      window.__run = n => { for (let i = 0; i < n; i++) { P.pollInput(P.DT); P.step(P.DT); } };
      window.__st = () => { const st = G.mst; return { v: st.tr.v, s: st.tr.s, u: st.cat.u, air: st.cat.air, hold: st.cat.hold, honks: st.stats.honks, drive: st.drive }; };
    });
    const tag = vw + 'x' + vh, st = () => page.evaluate(() => window.__st());
    if (!touch) {
      // real key events: Pip (driver) holds D, taps F to honk; Bo (catcher) walks with →, jumps with ↑, holds /
      await page.keyboard.down('KeyD'); await page.evaluate(() => window.__run(120)); await page.keyboard.up('KeyD');
      let a = await st();
      check(a.v > 150, `${tag} keyboard D: the tractor speeds up (${a.v | 0} px/s)`);
      await page.keyboard.down('KeyS'); await page.evaluate(() => window.__run(120)); await page.keyboard.up('KeyS');
      a = await st(); check(a.v < 5, `${tag} keyboard S: the tractor brakes (${a.v | 0})`);
      await page.keyboard.press('KeyF'); await page.evaluate(() => window.__run(4));
      a = await st(); check(a.honks === 1, `${tag} keyboard F honks (${a.honks})`);
      const u0 = a.u;
      await page.keyboard.down('ArrowRight'); await page.evaluate(() => window.__run(30)); await page.keyboard.up('ArrowRight');
      a = await st(); check(a.u - u0 > 30, `${tag} keyboard →: Bo walks on the load (${(a.u - u0) | 0} px)`);
      await page.keyboard.press('ArrowUp'); await page.evaluate(() => window.__run(6));
      a = await st(); check(a.air, `${tag} keyboard ↑: Bo jumps`);
      await page.evaluate(() => window.__run(90));
      await page.keyboard.down('Slash'); await page.evaluate(() => window.__run(10));
      a = await st(); check(a.hold, `${tag} keyboard / held: Bo holds the load`);
      await page.keyboard.up('Slash'); await page.evaluate(() => window.__run(3));
      // the controller (pad 1 = Pip): stick drives, X honks; the hints show the controller glyph
      const r = await page.evaluate(() => {
        const P = window.__pipbo, G = P.G, st = G.mst, v0 = st.tr.v, h0 = st.stats.honks;
        window.__pad.on = true; window.__pad.axes[0] = 1; window.__run(90);
        const v1 = st.tr.v;
        window.__pad.axes[0] = 0; window.__pad.buttons[2] = { pressed: true, value: 1 }; window.__run(4);
        window.__pad.buttons[2] = { pressed: false, value: 0 }; window.__run(60);
        return { dv: Math.round(v1 - v0), honks: st.stats.honks - h0, key: P.MODES.haytractor.key(0, 'act') };
      });
      check(r.dv > 80, `${tag} controller stick: the tractor speeds up (+${r.dv} px/s)`);
      check(r.honks === 1, `${tag} controller X honks (${r.honks}); hint key "${r.key.replace(/<[^>]*>/g, '')}"`);
    } else {
      const press = async (sel, steps, mid) => {
        const bb = await page.$eval(sel, el => { const r = el.getBoundingClientRect(); return { clientX: r.x + r.width / 2, clientY: r.y + r.height / 2 }; });
        await page.dispatchEvent(sel, 'pointerdown', Object.assign({ pointerId: 7, bubbles: true }, bb));
        await page.evaluate(n => window.__run(n), steps);
        const during = mid ? await st() : null;
        await page.dispatchEvent(sel, 'pointerup', Object.assign({ pointerId: 7, bubbles: true }, bb));
        await page.evaluate(() => window.__run(4));
        return during;
      };
      const vis = await page.$$eval('#padPip [data-k], #padBo [data-k], .tbtn-act', els => els.filter(e => e.offsetParent).length);
      check(vis >= 10, `${tag} touch buttons shown (${vis})`);
      let a = await st();
      await press('#padPip [data-k="right"]', 120);
      let b = await st();
      check(b.v > 150, `${tag} Pip's touch ▶: the tractor speeds up (${b.v | 0} px/s)`);
      await press('#padPip [data-k="down"]', 120);
      b = await st(); check(b.v < 5, `${tag} Pip's touch ▼ brakes (${b.v | 0})`);
      await press('#padPip .tbtn-act', 3);
      b = await st(); check(b.honks === 1, `${tag} Pip's round touch button honks (${b.honks})`);
      a = await st(); await press('#padBo [data-k="right"]', 30); b = await st();
      check(b.u - a.u > 30, `${tag} Bo's touch ▶ walks (${(b.u - a.u) | 0} px)`);
      const j = await press('#padBo [data-k="jump"]', 4, true);
      check(j.air, `${tag} Bo's touch ▲ jumps`);
      await page.evaluate(() => window.__run(90));
      const h = await press('#padBo .tbtn-act', 10, true);
      check(h.hold, `${tag} Bo's round touch button held: holds the load`);
      let labels = await page.$$eval('.tbtn-act', els => els.map(e => e.textContent).join(','));
      check(labels === 'honk,hold', `${tag} action buttons say "${labels}"`);
      const keyShown = await page.evaluate(() => window.__pipbo.MODES.haytractor.key(1, 'act'));
      check(/●|act|hold/.test(keyShown.replace(/<[^>]*>/g, '')) || keyShown.length < 4, `${tag} hints show the touch button (${keyShown.replace(/<[^>]*>/g, '')})`);
      await page.evaluate(() => { window.__pipbo.nextRoom(); window.__pipbo.G.introT = 0; window.__run(3); });
      labels = await page.$$eval('.tbtn-act', els => els.map(e => e.textContent).join(','));
      check(labels === 'hold,honk', `${tag} field 2: action buttons swap to "${labels}"`);
      await page.evaluate(() => window.__pipbo.loadLevel(window.__pipbo.LEVELS.findIndex(l => l.name === 'Tractor & Trailer')));
      await page.evaluate(() => { window.__pipbo.G.introT = 0; window.__pipbo.G.cpuOn = [true, true]; window.__run(Math.round(9 / window.__pipbo.DT)); });
    }
    await page.evaluate(() => window.__run(30));
    await page.waitForTimeout(200);
    await page.screenshot({ path: `build/w23/haytractor-input-${tag}.png` });
    await page.close();
  }
  console.log(bad ? bad + ' PROBLEMS' : 'all inputs reach the level');
  console.log(errors.length ? 'ERRORS:\n' + [...new Set(errors)].join('\n') : 'no page errors');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
