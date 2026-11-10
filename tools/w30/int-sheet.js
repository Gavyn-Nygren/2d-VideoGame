#!/usr/bin/env node
// Contact sheet: node tools/w30/int-sheet.js out.png cols a.png b.png ...
'use strict';
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
(async () => {
  const [out, cols, ...files] = process.argv.slice(2);
  const browser = await chromium.launch();
  const n = +cols, w = Math.floor(1600 / n);
  const page = await browser.newPage({ viewport: { width: w * n, height: 600 } });
  await page.setContent('<body style="margin:0;background:#111;display:grid;grid-template-columns:repeat(' + n + ',' + w + 'px)">' + files.map(f => `<div style="position:relative"><img src="data:image/png;base64,${fs.readFileSync(f).toString('base64')}" style="width:${w}px;display:block"><span style="position:absolute;left:2px;bottom:2px;background:#000;color:#fff;font:12px sans-serif">${path.basename(f)}</span></div>`).join('') + '</body>');
  await page.waitForFunction(() => Array.from(document.images).every(i => i.complete));
  await page.screenshot({ path: out, fullPage: true });
  await browser.close();
})();
