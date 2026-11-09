#!/usr/bin/env node
// Wind-Up Train Ride input check: the keyboard, a stubbed controller (navigator.getGamepads) and the touch buttons
// (hasTouch at 844x390 and 390x844) reach the level: the winder winds (action and ▲), brakes (▼); the switcher runs,
// jumps and presses the action; the action buttons say wind / switch and swap with the stretch. Saves the screen and
// the pause card at each size to build/w24/.
// Usage: node tools/w24/windtrain-input.js
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
(async () => {
  fs.mkdirSync('build/w24', { recursive: true });
  const browser = await chromium.launch();
  const errors = [];
  let bad = 0;
  const check = (ok, what) => { console.log((ok ? 'ok   ' : 'BAD  ') + what); if (!ok) bad++; };
  for (const [vw, vh, touch] of [[960, 540, 0], [844, 390, 1], [390, 844, 1]]) {
    const co = { viewport: { width: vw, height: vh }, deviceScaleFactor: 1 };
    if (touch) co.hasTouch = true;
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
      P.loadLevel(P.LEVELS.findIndex(l => l.name === 'Wind-Up Train Ride'));
      G.cpuOn = [false, false]; G.introT = 0;
      window.__run = n => { for (let i = 0; i < n; i++) { P.pollInput(P.DT); P.step(P.DT); } };
    });
    const tag = vw + 'x' + vh;
    if (!touch) {
      const r = await page.evaluate(() => {
        const P = window.__pipbo, G = P.G, st = G.mst, run = window.__run;
        const tapKey = (k, hold = 3) => { P.keys.add(k); run(hold); P.keys.delete(k); };
        // Pip winds stretch 1 on the keyboard: F on the beat, W winds too
        run(10); // (the first frame after loading only settles the input edges)
        const w0 = st.stats.winds, sp0 = st.tr.spring;
        const log = [];
        for (let i = 0; i < 4; i++) { tapKey('KeyF'); run(57); log.push(st.stats.winds); }
        tapKey('KeyW'); run(57); log.push(st.stats.winds); window.__log = log;
        const winds = st.stats.winds - w0, good = st.stats.goodWinds, sp1 = st.tr.spring;
        run(120);
        const moving = st.tr.v;
        P.keys.add('KeyS'); run(90); const braked = st.tr.brake, vB = st.tr.v; P.keys.delete('KeyS'); run(2);
        // Bo switches: → runs, ↑ jumps, / presses
        const x0 = st.sw.x; P.keys.add('ArrowRight'); run(60); P.keys.delete('ArrowRight');
        const ran = st.sw.x - x0;
        run(30); const f0 = st.sw.feet; P.keys.add('ArrowUp'); run(14); const rose = f0 - st.sw.feet; P.keys.delete('ArrowUp'); run(80);
        const pr0 = st.stats.presses; tapKey('Slash'); run(3);
        return { log: window.__log, winds, good, sp0, sp1, moving, braked, vB, ran, rose, presses: st.stats.presses - pr0, k: [wtrKey(0, 'act'), wtrKey(1, 'act')] };
      });
      check(r.winds === 5, `${tag} Pip's F and W wind the key (${r.winds} winds, ${r.good} on the beat; ${r.log})`);
      check(r.sp1 > r.sp0, `${tag} the spring fills (${r.sp0.toFixed(2)} -> ${r.sp1.toFixed(2)})`);
      check(r.moving > 30, `${tag} the train rolls (${Math.round(r.moving)} px/s)`);
      check(r.braked && r.vB < 5, `${tag} Pip's S brakes (v ${Math.round(r.vB)})`);
      check(r.ran > 60, `${tag} Bo's → runs (${Math.round(r.ran)} px)`);
      check(r.rose > 20, `${tag} Bo's ↑ jumps (${Math.round(r.rose)} px)`);
      check(r.presses === 1, `${tag} Bo's / presses the switch action (${r.presses})`);
      check(r.k[0] === 'F' && r.k[1] === '/', `${tag} hints name the keys (${r.k.join(' ')})`);
      // a controller as Pip: X winds, A winds too, stick down brakes
      const c = await page.evaluate(() => {
        const P = window.__pipbo, G = P.G, st = G.mst, run = window.__run, pad = window.__pad;
        pad.on = true; run(4);
        const btn = (b, n = 3) => { pad.buttons[b] = { pressed: true, value: 1 }; run(n); pad.buttons[b] = { pressed: false, value: 0 }; };
        const w0 = st.stats.winds;
        btn(2); run(60); btn(0); run(60); btn(2); run(60);
        const winds = st.stats.winds - w0;
        pad.axes[1] = 1; run(60); const braked = st.tr.brake; pad.axes[1] = 0; run(4);
        return { winds, braked, key: wtrKey(0, 'act') };
      });
      check(c.winds === 3, `${tag} controller X and A wind (${c.winds}), hint shows "${c.key}"`);
      check(c.braked, `${tag} controller stick down brakes`);
      await page.evaluate(() => { const P = window.__pipbo; window.__pad.on = false; if (P.G.mode === 'paused') P.resume(); });
    } else {
      // (the ◀ ▶ pair reads where the finger is, so the events carry the button's centre)
      const press = async (sel, steps) => {
        const bb = await page.$eval(sel, el => { const r = el.getBoundingClientRect(); return { clientX: r.x + r.width / 2, clientY: r.y + r.height / 2 }; });
        await page.dispatchEvent(sel, 'pointerdown', Object.assign({ pointerId: 7, bubbles: true }, bb));
        await page.evaluate(n => window.__run(n), steps);
        await page.dispatchEvent(sel, 'pointerup', Object.assign({ pointerId: 7, bubbles: true }, bb));
        await page.evaluate(() => window.__run(4));
      };
      const get = f => page.evaluate(f);
      await page.evaluate(() => window.__run(10));
      const vis = await page.$$eval('#padPip [data-k], #padBo [data-k], .tbtn-act', els => els.filter(e => e.offsetParent).length);
      check(vis >= 10, `${tag} touch buttons shown (${vis})`);
      const labels = await page.$$eval('.tbtn-act', els => els.map(e => e.textContent).join(','));
      check(labels === 'wind,switch', `${tag} action buttons say "${labels}" in stretch 1`);
      const w0 = await get(() => window.__pipbo.G.mst.stats.winds);
      await press('#padPip .tbtn-act', 3); await page.evaluate(() => window.__run(56));
      await press('#padPip [data-k="jump"]', 3); await page.evaluate(() => window.__run(56));
      await press('#padPip .tbtn-act', 3);
      const w1 = await get(() => window.__pipbo.G.mst.stats.winds);
      check(w1 - w0 === 3, `${tag} Pip's round button and ▲ wind (${w1 - w0})`);
      await page.evaluate(() => window.__run(150));
      const v0 = await get(() => window.__pipbo.G.mst.tr.v);
      const bdown = await page.$eval('#padPip [data-k="down"]', el => { const r = el.getBoundingClientRect(); return { clientX: r.x + r.width / 2, clientY: r.y + r.height / 2 }; });
      await page.dispatchEvent('#padPip [data-k="down"]', 'pointerdown', Object.assign({ pointerId: 8, bubbles: true }, bdown));
      await page.evaluate(() => window.__run(90));
      const br = await get(() => ({ b: window.__pipbo.G.mst.tr.brake, v: window.__pipbo.G.mst.tr.v }));
      await page.dispatchEvent('#padPip [data-k="down"]', 'pointerup', Object.assign({ pointerId: 8, bubbles: true }, bdown));
      check(v0 > 20 && br.b && br.v < 5, `${tag} Pip's touch ▼ brakes (${Math.round(v0)} -> ${Math.round(br.v)} px/s)`);
      const x0 = await get(() => window.__pipbo.G.mst.sw.x);
      await press('#padBo [data-k="right"]', 60);
      const x1 = await get(() => window.__pipbo.G.mst.sw.x);
      check(x1 - x0 > 40, `${tag} Bo's touch ▶ runs (${Math.round(x1 - x0)} px)`);
      const p0 = await get(() => window.__pipbo.G.mst.stats.presses);
      await press('#padBo .tbtn-act', 3);
      const p1 = await get(() => window.__pipbo.G.mst.stats.presses);
      check(p1 - p0 === 1, `${tag} Bo's round touch button presses the switch action (${p1 - p0})`);
      const keyShown = await get(() => wtrKey(0, 'act'));
      check(keyShown === '●', `${tag} hints show the touch button (${keyShown})`);
      // stretch 2: Bo winds, the labels swap
      await page.evaluate(() => { window.__pipbo.nextRoom(); window.__pipbo.G.introT = 0; window.__run(10); });
      const labels2 = await page.$$eval('.tbtn-act', els => els.map(e => e.textContent).join(','));
      check(labels2 === 'switch,wind', `${tag} action buttons swap in stretch 2 ("${labels2}")`);
      const b0 = await get(() => window.__pipbo.G.mst.stats.winds);
      await press('#padBo .tbtn-act', 3);
      const b1 = await get(() => window.__pipbo.G.mst.stats.winds);
      check(b1 - b0 === 1, `${tag} Bo's round button winds in stretch 2 (${b1 - b0})`);
    }
    await page.evaluate(() => window.__run(60));
    await page.waitForTimeout(150);
    await page.screenshot({ path: `build/w24/windtrain-input-${tag}.png` });
    await page.evaluate(() => window.__pipbo.pause());
    await page.waitForTimeout(300);
    await page.screenshot({ path: `build/w24/windtrain-pause-${tag}.png` });
    await page.close();
  }
  console.log(bad ? bad + ' PROBLEMS' : 'all inputs reach the level');
  console.log(errors.length ? 'ERRORS:\n' + [...new Set(errors)].join('\n') : 'no page errors');
  await browser.close();
  process.exit(bad || errors.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
