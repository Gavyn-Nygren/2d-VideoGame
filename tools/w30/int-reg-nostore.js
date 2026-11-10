#!/usr/bin/env node
// Where the browser gives no localStorage (a sandboxed frame, some private modes: store.get / set swallow the error),
// the 30-1 checkpoint is never kept, yet the pause card still offers "Restart this era". Real session (not G.manual):
// reach Era 4, pause, press that button: which era starts?   node tools/w30/int-reg-nostore.js [--ok] (--ok: storage works)
'use strict';
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const ok = process.argv.includes('--ok');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  if (!ok) await page.addInitScript(() => { const boom = () => { throw new DOMException('The operation is insecure.', 'SecurityError'); }; Storage.prototype.getItem = boom; Storage.prototype.setItem = boom; });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.MODES && window.__pipbo.MODES.timethief);
  await page.evaluate(() => { const P = window.__pipbo; P.MODES.timethief.test.cpClear(); P.loadLevel(P.MODES.timethief.test.index()); });
  await page.waitForTimeout(300);
  await page.evaluate(() => { const P = window.__pipbo; P.G.time = 600; P.G.room = 2; P.nextRoom(); });   // (as if eras 1-3 were played: 10 minutes in)
  await page.waitForTimeout(4200);
  const before = await page.evaluate(() => ({ era: G.mst.phaseNo + 1, time: Math.round(G.time) }));
  await page.keyboard.press('Escape'); await page.waitForTimeout(400);
  const btns = await page.evaluate(() => [...document.querySelectorAll('#overlay button')].map(b => b.textContent.trim()));
  await page.click('#overlay [data-act="replay"]'); await page.waitForTimeout(500);
  const after = await page.evaluate(() => ({ era: G.mst.phaseNo + 1, time: Math.round(G.time), mode: G.mode }));
  console.log((ok ? 'storage works:   ' : 'storage blocked: ') + 'before ' + JSON.stringify(before) + ' | pause buttons ' + JSON.stringify(btns) + ' | after "' + btns[1] + '": ' + JSON.stringify(after), errors.length ? '| errors ' + errors.join(' | ') : '');
  await browser.close();
})();
