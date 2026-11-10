'use strict';
const path = require('path'); const { chromium } = require('playwright');
const OUT = path.resolve(__dirname, '..', '..', 'build', 'w30', 'int', 'look');
const VPS = { desktop: { viewport: { width: 1280, height: 800 } }, phone: { viewport: { width: 844, height: 390 }, hasTouch: true, deviceScaleFactor: 2 },
  small: { viewport: { width: 667, height: 375 }, hasTouch: true, deviceScaleFactor: 2 }, portrait: { viewport: { width: 390, height: 844 }, hasTouch: true, deviceScaleFactor: 2 } };
(async () => {
  const browser = await chromium.launch();
  for (const dev of (process.argv[2] || 'desktop,phone,small,portrait').split(',')) {
    const ctx = await browser.newContext(VPS[dev]); const page = await ctx.newPage(); const tap = dev !== 'desktop';
    const shot = async n => { await page.screenshot({ path: path.join(OUT, 'N-' + dev + '-' + n + '.png') }); };
    const hit = async sel => { const el = page.locator(sel).first(); await el.waitFor({ state: 'visible', timeout: 5000 }); if (tap) await el.tap(); else await el.click(); };
    await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
    await page.waitForFunction(() => window.__pipbo && window.__pipbo.MODES && window.__pipbo.MODES.timethief);
    if (tap) await page.evaluate(() => { try { enableTouch(); Pads.lastNonPad = 'touch'; setKind('touch'); } catch (e) {} });
    await page.waitForTimeout(500);
    await hit('[data-act="worlds"]'); await page.waitForTimeout(500);
    for (let n = 0; n < 6; n++) { if (await page.locator('[data-act="openworld"][data-w="29"]').count()) break; await hit('[data-act="wpage"].next'); await page.waitForTimeout(500); }
    await page.locator('[data-act="openworld"][data-w="29"]').scrollIntoViewIfNeeded(); await page.waitForTimeout(1200); await shot('map30');
    await hit('[data-act="openworld"][data-w="29"]'); await page.waitForTimeout(800);
    await page.evaluate(() => { for (const e of document.querySelectorAll('#overlay, #overlay *')) if (e.scrollHeight > e.clientHeight + 4) e.scrollTop = 99999; }); await page.waitForTimeout(1500); await shot('world30-bottom');
    const i = await page.evaluate(() => window.__pipbo.LEVELS.findIndex(l => l.mode === 'timethief'));
    await hit(`[data-act="level"][data-i="${i}"]`); await page.waitForFunction(() => window.__pipbo.G.mode === 'play');
    await page.evaluate(() => { const P = window.__pipbo, TT = P.MODES.timethief.test; TT.jump(4); });
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.__pipbo.pause()); await page.waitForTimeout(400); await shot('pause-era5');
    const info = await page.evaluate(() => { const o = document.getElementById('overlay'); const out = { sh: o.scrollHeight, ch: o.clientHeight, btns: [...o.querySelectorAll('button')].map(b => { const r = b.getBoundingClientRect(); return b.textContent.trim().slice(0, 28) + '@' + Math.round(r.top) + '-' + Math.round(r.bottom) + ' h' + Math.round(r.height) + ' fs' + getComputedStyle(b).fontSize; }), ih: innerHeight };
      for (const e of [o, ...o.querySelectorAll('*')]) if (e.scrollHeight > e.clientHeight + 4 && getComputedStyle(e).overflowY !== 'visible') { out.scroller = (e.id || e.className) + ' ' + e.scrollHeight + '/' + e.clientHeight; e.scrollTop = 99999; } return out; });
    console.log(dev, JSON.stringify(info)); await page.waitForTimeout(300); await shot('pause-era5-bottom');
    await ctx.close();
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(2); });
