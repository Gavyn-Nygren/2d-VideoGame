#!/usr/bin/env node
// 18-3 Tide Pool Dig: real input paths (keyboard, a stubbed controller, touch at phone size) in the live game loop,
// plus screenshots (desktop, phone, 1-player, results card). Usage: node tools/w18/tidedig-input.js
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const out = n => path.resolve(__dirname, '..', '..', 'build', n);
const wait = ms => new Promise(r => setTimeout(r, ms));
const fails = [];
const check = (ok, what) => { console.log((ok ? 'ok   ' : 'FAIL ') + what); if (!ok) fails.push(what); };

async function open(browser, opts) {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  if (opts.pad) await page.addInitScript(() => {
    // a stubbed Xbox controller whose buttons the test sets in window.__padBtns
    window.__padBtns = new Array(17).fill(false); window.__padAxes = [0, 0, 0, 0];
    const pad = () => ({ id: 'Xbox 360 Controller (STANDARD GAMEPAD)', index: 0, connected: true, mapping: 'standard', timestamp: performance.now(),
      buttons: window.__padBtns.map(p => ({ pressed: p, value: p ? 1 : 0 })), axes: window.__padAxes.slice() });
    navigator.getGamepads = () => [pad(), null, null, null];
  });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  return { page, errors, ctx };
}
async function load(page, players) {
  await page.evaluate(players => {
    const P = window.__pipbo;
    P.cpuSetCfg('players', players || 2);
    const i = P.LEVELS.findIndex(l => l.name === 'Tide Pool Dig');
    P.loadLevel(i);
  }, players);
}
const st = (page, f) => page.evaluate(f);

(async () => {
  const browser = await chromium.launch();
  // ---------- keyboard, desktop ----------
  {
    const { page, errors, ctx } = await open(browser, { viewport: { width: 1280, height: 800 } });
    await load(page, 2);
    await wait(300);
    await page.screenshot({ path: out('tidedig-kb-intro.png') });
    await page.evaluate(() => { window.__pipbo.G.introT = 0; });
    // Pip walks right onto the X (D), then digs with F held
    await page.keyboard.down('KeyD');
    await page.waitForFunction(() => { const G = window.__pipbo.G; return G.players[0].x + 11 > 488; }, null, { timeout: 4000 });
    await page.keyboard.up('KeyD');
    await wait(250);
    const x0 = await st(page, () => window.__pipbo.G.players[0].x + 11);
    if (Math.abs(x0 - 495) > 10) { await page.evaluate(() => { const p = window.__pipbo.G.players[0]; p.x = 495 - 11; p.vx = 0; }); await wait(100); }
    await page.keyboard.down('KeyF');
    await wait(2600);
    await page.keyboard.up('KeyF');
    const d1 = await st(page, () => { const h = window.__pipbo.G.mst.holes[0]; return h.depth + h.prog; });
    check(d1 >= 1, 'keyboard: Pip digs with F (depth ' + d1.toFixed(2) + ')');
    // water in the hole; Bo walks to the edge (arrows) and scoops with /
    await page.evaluate(() => { const G = window.__pipbo.G; G.mst.holes[0].water = 20; G.mst.wave.t = 99; const b = G.players[1]; b.x = 495 + 30 - 11; b.vx = 0; });
    await wait(200);
    await page.keyboard.press('Slash');
    await wait(200);
    const bk = await st(page, () => window.__pipbo.G.mst.pl[1].bucket);
    check(bk > 0, 'keyboard: Bo scoops with / (bucket ' + bk + ')');
    await page.screenshot({ path: out('tidedig-kb-scoop.png') });
    await page.keyboard.down('ArrowRight');
    await page.waitForFunction(() => window.__pipbo.G.players[1].x > 750, null, { timeout: 6000 }).catch(() => {});
    await page.keyboard.up('ArrowRight');
    await page.keyboard.press('Period');
    await wait(150);
    const bk2 = await st(page, () => [window.__pipbo.G.mst.pl[1].bucket, window.__pipbo.G.mst.stats.buckets[1]]);
    check(bk2[0] === 0 && bk2[1] === 1, 'keyboard: Bo dumps it in the sea with . (' + bk2 + ')');
    // Pip climbs out with W held
    await page.evaluate(() => { const G = window.__pipbo.G; G.mst.holes[0].water = 0; });
    await page.keyboard.down('KeyF'); await wait(2500); await page.keyboard.up('KeyF');
    await page.keyboard.down('KeyW'); await page.keyboard.down('KeyA'); await wait(900); await page.keyboard.up('KeyW'); await page.keyboard.up('KeyA');
    const out1 = await st(page, () => { const P = window.__pipbo, G = P.G; return !P.MODES.tidedig.test.tidedigIn(G.mst, G.players[0]); });
    check(out1, 'keyboard: Pip climbs out of the hole holding W');
    const labels = await st(page, () => Array.from(document.querySelectorAll('[data-actlabel]')).map(e => e.textContent).join(','));
    check(/dig/.test(labels) && /bail/.test(labels), 'legend and touch labels name each job (' + labels + ')');
    check(!errors.length, 'keyboard: no console errors ' + errors.slice(0, 3).join(' | '));
    await ctx.close();
  }
  // ---------- a stubbed controller (Pip) ----------
  {
    const { page, errors, ctx } = await open(browser, { viewport: { width: 1280, height: 800 }, pad: true });
    await load(page, 2);
    await page.evaluate(() => { window.__padBtns[0] = true; });
    await wait(150);
    await page.evaluate(() => { window.__padBtns[0] = false; });
    await wait(300);
    await page.evaluate(() => { const G = window.__pipbo.G; G.introT = 0; const p = G.players[0]; p.x = 495 - 11; p.vx = 0; });
    await wait(200);
    await page.evaluate(() => { window.__padBtns[2] = true; });   // X = the action
    await wait(2500);
    await page.evaluate(() => { window.__padBtns[2] = false; });
    const d = await st(page, () => { const h = window.__pipbo.G.mst.holes[0]; return h.depth + h.prog; });
    check(d >= 1, 'controller: X digs (depth ' + d.toFixed(2) + ')');
    await page.evaluate(() => { window.__padBtns[0] = true; window.__padAxes[0] = -1; });
    await wait(1200);
    await page.evaluate(() => { window.__padBtns[0] = false; window.__padAxes[0] = 0; });
    const o = await st(page, () => { const P = window.__pipbo, G = P.G; return !P.MODES.tidedig.test.tidedigIn(G.mst, G.players[0]); });
    check(o, 'controller: holding A climbs out');
    check(!errors.length, 'controller: no console errors ' + errors.slice(0, 3).join(' | '));
    await ctx.close();
  }
  // ---------- touch, phone size ----------
  for (const [w, h] of [[844, 390], [390, 844]]) {
    const { page, errors, ctx } = await open(browser, { viewport: { width: w, height: h }, hasTouch: true, isMobile: true });
    await load(page, 2);
    await wait(400);
    await page.screenshot({ path: out(`tidedig-phone-${w}x${h}-intro.png`) });
    await page.evaluate(() => { const G = window.__pipbo.G; G.introT = 0; const p = G.players[0]; p.x = 495 - 11; p.vx = 0; });
    await wait(150);
    const down = sel => page.evaluate(sel => { const el = document.querySelector(sel); const r = el.getBoundingClientRect(); el.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 7, bubbles: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, pointerType: 'touch' })); }, sel);
    const up = sel => page.evaluate(sel => { document.querySelector(sel).dispatchEvent(new PointerEvent('pointerup', { pointerId: 7, bubbles: true, pointerType: 'touch' })); }, sel);
    const vis = await page.evaluate(() => { const r = document.querySelector('.tbtn-act[data-p="0"]').getBoundingClientRect(); return r.width > 20 && r.height > 20; });
    check(vis, `touch ${w}x${h}: the round action button shows`);
    await down('.tbtn-act[data-p="0"]'); await wait(2600); await up('.tbtn-act[data-p="0"]');
    const d = await st(page, () => { const h = window.__pipbo.G.mst.holes[0]; return h.depth + h.prog; });
    check(d >= 1, `touch ${w}x${h}: the round button digs (depth ${d.toFixed(2)})`);
    await page.evaluate(() => { const G = window.__pipbo.G; G.mst.holes[0].water = 22; G.mst.wave.t = 99; G.mst.wave.ph = 'calm'; const b = G.players[1]; b.x = 495 + 34 - 11; b.vx = 0; });
    await wait(150);
    await down('.tbtn-act[data-p="1"]'); await wait(120); await up('.tbtn-act[data-p="1"]');
    const bk = await st(page, () => window.__pipbo.G.mst.pl[1].bucket);
    check(bk > 0, `touch ${w}x${h}: Bo's round button scoops (bucket ${bk})`);
    const lab = await st(page, () => [document.querySelector('.tbtn-act[data-p="0"]').textContent, document.querySelector('.tbtn-act[data-p="1"]').textContent].join('/'));
    check(lab === 'dig/bail', `touch ${w}x${h}: button words ${lab}`);
    await wait(300);
    await page.screenshot({ path: out(`tidedig-phone-${w}x${h}.png`) });
    check(!errors.length, `touch ${w}x${h}: no console errors ` + errors.slice(0, 3).join(' | '));
    await ctx.close();
  }
  // ---------- 1-player (the person plays Bo; the computer digs room 1), then the results card ----------
  {
    const { page, errors, ctx } = await open(browser, { viewport: { width: 1280, height: 800 } });
    await page.evaluate(() => { window.__pipbo.cpuSetCfg('human', 1); });
    await load(page, 1);
    await page.evaluate(() => { window.__pipbo.G.manual = true; });
    await page.evaluate(() => { const P = window.__pipbo; for (let k = 0; k < 120 * 9; k++) P.step(P.DT); });
    await wait(150);
    await page.screenshot({ path: out('tidedig-1p.png') });
    // finish quickly: a computer for Bo too, then show the results card
    await page.evaluate(() => { const P = window.__pipbo, G = P.G; G.cpuOn = [true, true]; for (let k = 0; k < 120 * 400 && G.mode === 'play'; k++) P.step(P.DT); });
    await page.evaluate(() => { const P = window.__pipbo; P.G.manual = false; });
    await wait(1800);
    await page.screenshot({ path: out('tidedig-results.png') });
    check(!errors.length, '1-player and results: no console errors ' + errors.slice(0, 3).join(' | '));
    await page.evaluate(() => { window.__pipbo.cpuSetCfg('players', 2); window.__pipbo.cpuSetCfg('human', 0); });
    await ctx.close();
  }
  await browser.close();
  console.log(fails.length ? fails.length + ' FAILED' : 'all ok');
})().catch(e => { console.error(e); process.exit(1); });
