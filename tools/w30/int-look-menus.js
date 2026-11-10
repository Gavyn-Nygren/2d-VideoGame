#!/usr/bin/env node
// Looks review: menus, cards and cutscenes of World 30 on one device.   node tools/w30/int-look-menus.js <desktop|phone|small|portrait>
'use strict';
const path = require('path'); const { chromium } = require('playwright');
const dev = process.argv[2] || 'desktop';
const OUT = path.resolve(__dirname, '..', '..', 'build', 'w30', 'int', 'look');
const VP = { desktop: { viewport: { width: 1280, height: 800 } }, phone: { viewport: { width: 844, height: 390 }, hasTouch: true, deviceScaleFactor: 2 },
  small: { viewport: { width: 667, height: 375 }, hasTouch: true, deviceScaleFactor: 2 }, portrait: { viewport: { width: 390, height: 844 }, hasTouch: true, deviceScaleFactor: 2 } }[dev];
(async () => {
  const browser = await chromium.launch(); const ctx = await browser.newContext(VP); const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  const tap = dev !== 'desktop';
  const shot = async n => { await page.screenshot({ path: path.join(OUT, 'M-' + dev + '-' + n + '.png') }); console.log('shot', n); };
  const hit = async sel => { const el = page.locator(sel).first(); await el.waitFor({ state: 'visible', timeout: 5000 }); if (tap) await el.tap(); else await el.click(); };
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.MODES && window.__pipbo.MODES.timethief);
  if (tap) await page.evaluate(() => { try { enableTouch(); Pads.lastNonPad = 'touch'; setKind('touch'); } catch (e) {} });
  await page.waitForTimeout(600); await shot('1-title');
  const i = await page.evaluate(() => window.__pipbo.LEVELS.findIndex(l => l.mode === 'timethief'));
  await hit('[data-act="worlds"]'); await page.waitForTimeout(500);
  for (let n = 0; n < 6; n++) { if (await page.locator('[data-act="openworld"][data-w="29"]').count()) break; await hit('[data-act="wpage"].next'); await page.waitForTimeout(500); }
  await shot('2-map');
  await hit('[data-act="openworld"][data-w="29"]'); await page.waitForTimeout(1500); await shot('3-world');
  await hit(`[data-act="level"][data-i="${i}"]`); await page.waitForFunction(() => window.__pipbo.G.mode === 'play');
  await page.waitForTimeout(700); await shot('4-card');
  await page.waitForTimeout(3500);
  await page.evaluate(() => window.__pipbo.pause()); await page.waitForTimeout(400); await shot('5-pause');
  await page.evaluate(() => window.__pipbo.resume());
  // the portal cutscene after era 2 (henge -> troy), then the next era's card
  const run = async (s) => page.evaluate(s => { const P = window.__pipbo; const n = Math.round(s / P.DT); for (let j = 0; j < n && P.G.mode === 'play'; j++) P.step(P.DT); const st = P.G.mst; return { phase: st.phase, cut: st.cut && st.cut.kind, introT: P.G.introT, mode: P.G.mode }; }, s);
  await page.evaluate(() => { const P = window.__pipbo, TT = P.MODES.timethief.test; P.G.manual = true; P.G.cpuOn = [true, true]; TT.jump(1); P.G.cpuOn = [true, true]; });
  await run(3); await page.evaluate(() => window.__pipbo.MODES.timethief.test.done({ say: 'Bah! Keep your rock!' }));
  let k = 0; for (const s of [0.5, 1.0, 1.0, 1.0, 0.7]) { console.log(JSON.stringify(await run(s))); await page.waitForTimeout(200); await shot('6-portal' + (++k)); }
  console.log(JSON.stringify(await run(0.6))); await page.waitForTimeout(200); await shot('6-portal6-nextcard');
  console.log(JSON.stringify(await run(1.2))); await page.waitForTimeout(200); await shot('6-portal7-nextcard');
  // the ending
  await page.evaluate(() => { const P = window.__pipbo, TT = P.MODES.timethief.test; TT.jump(9); P.G.cpuOn = [true, true]; });
  await run(2); await page.evaluate(() => { const P = window.__pipbo, st = P.G.mst; st.loot = st.loot.map(() => true); P.MODES.timethief.test.ending(); });
  k = 0; for (const s of [0.8, 1.5, 2, 2, 2]) { console.log(JSON.stringify(await run(s))); await page.waitForTimeout(200); await shot('7-end' + (++k)); }
  console.log(JSON.stringify(await run(3))); await page.waitForTimeout(1200); await shot('8-result');
  await page.evaluate(() => { const o = document.getElementById('overlay'); if (o) o.scrollTop = 99999; const c = o && o.querySelector('.card'); if (c) c.scrollTop = 99999; }); await page.waitForTimeout(300); await shot('8-result-scrolled');
  if (errs.length) console.log('ERRORS', errs.slice(0, 6).join('\n'));
  await browser.close();
})().catch(e => { console.error(e); process.exit(2); });
