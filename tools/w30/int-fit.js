#!/usr/bin/env node
// Measures every hint / news / Thief line found in build/w30/int/words-*.txt with the game's real fonts, at phone
// (big HUD) and desktop sizes, and lists the ones that do not fit their pill (hints never shrink; news / say shrink).
'use strict';
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const dir = path.resolve(__dirname, '..', '..', 'build', 'w30', 'int');
const items = new Map();
for (const f of fs.readdirSync(dir).filter(f => /^words-.*\.txt$/.test(f))) {
  const touch = /touch/.test(f); let era = '';
  for (const line of fs.readFileSync(path.join(dir, f), 'utf8').split('\n')) {
    const h = line.match(/^===== \S+ (\w+)/); if (h) { era = h[1]; continue; }
    const m = line.match(/^\s+[\d.]+\s+(hint\[[PB]\]\*?|news\*?|say|cpu\[[PB]\])\s+(.*?)(\s+\(1 tick\))?$/); if (!m) continue;
    const ch = m[1].replace(/\[.\]|\*/g, ''), k = ch + '|' + m[2] + '|' + (touch ? 'T' : 'D');
    if (!items.has(k)) items.set(k, { ch, text: m[2], touch, era, f });
  }
}
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo);
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(async () => { await document.fonts.load('700 20px "Atkinson Hyperlegible"'); await document.fonts.load('400 20px "Lilita One"'); });
  const out = await page.evaluate(list => {
    const c = document.createElement('canvas').getContext('2d'), W = 960, res = [];
    for (const it of list) {
      const big = it.touch;
      if (it.ch === 'hint') { const f = big ? 23 : 12; c.font = tthFont(f); const tw = c.measureText(it.text).width + (big ? 22 : 16); if (tw > W - 8) res.push({ ...it, tw: Math.round(tw), over: Math.round(tw - (W - 8)) }); else if (tw > W * 0.8) res.push({ ...it, tw: Math.round(tw), wide: true }); }
      else if (it.ch === 'news') { let f = big ? 19 : 14; c.font = tthFont(f); while (f > 11 && c.measureText(it.text).width + 34 > W - 40) c.font = tthFont(--f); const w = c.measureText(it.text).width + 34; if (f < (big ? 19 : 14) || w > W - 40) res.push({ ...it, fs: f, w: Math.round(w), clipped: w > W - 40 }); }
      else if (it.ch === 'say') { const z = big ? 1.4 : 1; let f = Math.round(16 * z); c.font = tthLilita(f); while (f > 11 && c.measureText(it.text).width + 26 * z > W - 24) c.font = tthLilita(--f); if (f < Math.round(16 * z)) res.push({ ...it, fs: f }); }
    }
    return { res, fontOk: document.fonts.check('700 20px "Atkinson Hyperlegible"') + ' ' + document.fonts.check('400 20px "Lilita One"') };
  }, [...items.values()]);
  console.log('fonts loaded:', out.fontOk, ' items:', items.size);
  for (const r of out.res) console.log(`${r.touch ? 'PHONE  ' : 'DESKTOP'} ${r.era.padEnd(8)} ${r.ch.padEnd(4)} ${r.over ? 'OVER by ' + r.over + 'px (' + r.tw + ')' : r.wide ? 'wide ' + r.tw : 'shrunk to ' + r.fs + 'px' + (r.clipped ? ' AND still ' + r.w + ' wide' : '')}  | ${r.text}`);
  await browser.close();
})().catch(e => { console.error(e); process.exit(2); });
