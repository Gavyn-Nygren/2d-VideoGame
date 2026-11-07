#!/usr/bin/env node
// 18-3 Tide Pool Dig: pause, restart (R), leaving for another level and coming back (no leaks), at 1280x800 in the
// live loop with real keys, plus a 1-player run where the person is Bo and a 844x390 phone shot mid-room.
// Usage: node tools/w18/tidedig-life.js   (screenshots in build/)
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const out = n => path.resolve(__dirname, '..', '..', 'build', n);
const wait = ms => new Promise(r => setTimeout(r, ms));
const fails = [];
const check = (ok, what) => { console.log((ok ? 'ok   ' : 'FAIL ') + what); if (!ok) fails.push(what); };
(async () => {
  const browser = await chromium.launch();
  for (const [w, h] of [[1280, 800], [844, 390]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: w < 900, isMobile: w < 900 });
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', e => errors.push(String(e)));
    await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
    await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
    const idx = await page.evaluate(() => window.__pipbo.LEVELS.findIndex(l => l.name === 'Tide Pool Dig'));
    const other = await page.evaluate(() => window.__pipbo.LEVELS.findIndex(l => l.mode === 'temple'));
    await page.evaluate(i => { const P = window.__pipbo; P.cpuSetCfg('players', 2); P.loadLevel(i); P.G.introT = 0; }, idx);
    await wait(1500);
    // pause stops the clock
    await page.keyboard.press('Escape'); await wait(200);
    const t0 = await page.evaluate(() => window.__pipbo.G.time); await wait(600);
    const t1 = await page.evaluate(() => window.__pipbo.G.time);
    check(t0 === t1 && await page.evaluate(() => window.__pipbo.G.mode === 'paused'), `${w}x${h} pause freezes the game`);
    await page.screenshot({ path: out(`tidedig-life-pause-${w}.png`) });
    await page.keyboard.press('Escape'); await wait(300);
    check(await page.evaluate(() => window.__pipbo.G.mode === 'play'), `${w}x${h} Esc resumes`);
    // dig a little, then R restarts fresh
    await page.evaluate(() => { const G = window.__pipbo.G; G.mst.holes[0].depth = 2; G.mst.stats.stash = 5; });
    await page.keyboard.press('KeyR'); await wait(300);
    const fresh = await page.evaluate(() => { const st = window.__pipbo.G.mst; return st.holes[0].depth === 0 && st.stats.stash === 0 && st.k === 0; });
    check(fresh, `${w}x${h} R restarts with a fresh beach`);
    // another level, then back: labels and state are that level's own
    await page.evaluate(i => window.__pipbo.loadLevel(i), other); await wait(400);
    const lab = await page.evaluate(() => [...document.querySelectorAll('[data-actlabel]')].map(e => e.textContent));
    check(!lab.some(s => /dig|bail/.test(s)), `${w}x${h} the next level's action labels are its own (${[...new Set(lab)].join(',')})`);
    check(await page.evaluate(() => !window.__pipbo.G.mst.holes), `${w}x${h} no Tide Pool Dig state in the next level`);
    await page.evaluate(i => { const P = window.__pipbo; P.loadLevel(i); P.G.introT = 0; }, idx); await wait(800);
    const back = await page.evaluate(() => { const st = window.__pipbo.G.mst; return st.holes && st.holes[0].depth === 0 && st.stats.stash === 0; });
    check(back, `${w}x${h} coming back starts clean`);
    const lab2 = await page.evaluate(() => [...document.querySelectorAll('[data-actlabel]')].map(e => e.textContent));
    check(lab2.includes('dig') && lab2.includes('bail'), `${w}x${h} back in Tide Pool Dig the labels say dig and bail`);
    // 1-player, the person is Bo: the hint chip is Bo's, Pip (computer) works
    await page.evaluate(i => { const P = window.__pipbo; P.cpuSetCfg('players', 1); P.cpuSetCfg('human', 1); P.loadLevel(i); P.G.introT = 0; }, idx);
    await wait(3500);
    const dug = await page.evaluate(() => { const h = window.__pipbo.G.mst.holes[0]; return h.depth + h.prog; });
    check(dug > 0, `${w}x${h} 1-player: the computer Pip digs (${dug.toFixed(2)})`);
    await page.screenshot({ path: out(`tidedig-life-1p-bo-${w}.png`) });
    check(errors.length === 0, `${w}x${h} no console errors ${errors.slice(0, 2).join(' | ')}`);
    await page.evaluate(() => window.__pipbo.cpuSetCfg('players', 2));
    await ctx.close();
  }
  await browser.close();
  console.log(fails.length ? fails.length + ' FAIL' : 'all ok');
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
