#!/usr/bin/env node
// Submarine Duo input check: a stubbed controller (navigator.getGamepads) and the touch buttons reach the level, the
// keyboard too; also saves the pause card at each size to build/w22/.
// Usage: node tools/w22/subduo-input.js
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
(async () => {
  fs.mkdirSync('build/w22', { recursive: true });
  const browser = await chromium.launch();
  const errors = [];
  let bad = 0;
  const check = (ok, what) => { console.log((ok ? 'ok   ' : 'BAD  ') + what); if (!ok) bad++; };
  for (const [vw, vh, touch] of [[960, 540, 0], [844, 390, 1], [390, 844, 1]]) {
    const co = { viewport: { width: vw, height: vh }, deviceScaleFactor: 1 };
    if (touch) Object.assign(co, { hasTouch: true, isMobile: true });
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
      P.loadLevel(P.LEVELS.findIndex(l => l.name === 'Submarine Duo'));
      G.introT = 0;
      window.__run = n => { for (let i = 0; i < n; i++) { P.pollInput(P.DT); P.step(P.DT); } };
    });
    const tag = vw + 'x' + vh;
    if (!touch) {
      // controller 1 plays Pip (the steerer in stretch 1): stick right pushes the sub, X toots
      const r = await page.evaluate(() => {
        const P = window.__pipbo, G = P.G, st = G.mst, x0 = st.sub.x;
        window.__pad.on = true; window.__pad.axes[0] = 1; window.__run(180);
        const moved = st.sub.x - x0;
        window.__pad.axes[0] = 0; window.__pad.buttons[2] = { pressed: true, value: 1 }; window.__run(4);
        window.__pad.buttons[2] = { pressed: false, value: 0 }; window.__run(4);
        const toots = st.stats.toots, key = P.MODES.subduo.key(0, 'act');
        // Bo on the keyboard: ↓ moves the claw down, / grabs (a snap at nothing still counts as a grab)
        const cy = st.claw.oy;
        P.keys.add('ArrowDown'); window.__run(30); P.keys.delete('ArrowDown');
        const clawDown = st.claw.oy - cy;
        const g0 = st.stats.grabs; P.keys.add('Slash'); window.__run(3); P.keys.delete('Slash'); window.__run(3);
        return { moved: Math.round(moved), toots, key, clawDown: Math.round(clawDown), grabs: st.stats.grabs - g0 };
      });
      check(r.moved > 100, `${tag} controller stick moves the sub (${r.moved} px)`);
      check(r.toots === 1, `${tag} controller X toots (${r.toots}), hint key shows "${r.key}"`);
      check(r.clawDown > 20, `${tag} Bo's ↓ key moves the claw down (${r.clawDown} px)`);
      check(r.grabs === 1, `${tag} Bo's / key grabs (${r.grabs})`);
      await page.evaluate(() => { const P = window.__pipbo; if (P.G.mode === 'paused') P.resume(); });
    } else {
      // (the ◀ ▶ pair reads where the finger is, so the events carry the button's centre)
      const press = async (sel, steps) => {
        const bb = await page.$eval(sel, el => { const r = el.getBoundingClientRect(); return { clientX: r.x + r.width / 2, clientY: r.y + r.height / 2 }; });
        await page.dispatchEvent(sel, 'pointerdown', Object.assign({ pointerId: 7, bubbles: true }, bb));
        await page.evaluate(n => window.__run(n), steps);
        await page.dispatchEvent(sel, 'pointerup', Object.assign({ pointerId: 7, bubbles: true }, bb));
        await page.evaluate(() => window.__run(4));
      };
      const vis = await page.$$eval('#padPip [data-k], #padBo [data-k], .tbtn-act', els => els.filter(e => e.offsetParent).length);
      check(vis >= 10, `${tag} touch buttons shown (${vis})`);
      const x0 = await page.evaluate(() => window.__pipbo.G.mst.sub.x);
      await press('#padPip [data-k="right"]', 120);
      const x1 = await page.evaluate(() => window.__pipbo.G.mst.sub.x);
      check(x1 - x0 > 60, `${tag} Pip's touch ▶ pushes the sub (${Math.round(x1 - x0)} px)`);
      const oy0 = await page.evaluate(() => window.__pipbo.G.mst.claw.oy);
      await press('#padBo [data-k="down"]', 30);
      const oy1 = await page.evaluate(() => window.__pipbo.G.mst.claw.oy);
      check(oy1 - oy0 > 20, `${tag} Bo's touch ▼ moves the claw (${Math.round(oy1 - oy0)} px)`);
      const labels = await page.$$eval('.tbtn-act', els => els.map(e => e.textContent).join(','));
      check(labels === 'toot,grab', `${tag} action buttons say "${labels}"`);
      const g0 = await page.evaluate(() => window.__pipbo.G.mst.stats.grabs);
      await press('#padBo .tbtn-act', 3);
      const g1 = await page.evaluate(() => window.__pipbo.G.mst.stats.grabs);
      check(g1 - g0 === 1, `${tag} Bo's round touch button grabs (${g1 - g0})`);
      const keyShown = await page.evaluate(() => window.__pipbo.MODES.subduo.key(1, 'act'));
      check(keyShown === '●', `${tag} hints show the touch button (${keyShown})`);
    }
    await page.evaluate(() => window.__run(60));
    await page.waitForTimeout(150);
    await page.screenshot({ path: `build/w22/subduo-input-${tag}.png` });
    await page.evaluate(() => window.__pipbo.pause());
    await page.waitForTimeout(300);
    await page.screenshot({ path: `build/w22/subduo-pause-${tag}.png` });
    await page.close();
  }
  console.log(bad ? bad + ' PROBLEMS' : 'all inputs reach the level');
  console.log(errors.length ? 'ERRORS:\n' + [...new Set(errors)].join('\n') : 'no page errors');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
