#!/usr/bin/env node
// Contact sheets of every outfit (js/outfits.js, js/outfits-worlds.js): Pip and Bo drawn big by the game's own
// drawPlayer, facing right, then facing left and running (capes and scarves stream), plus the preview hero (v.hero).
//
//   node tools/outfits/sheet.js [name,name|all] [--scale=3] [--out=build/outfits]
// Writes build/outfits/sheet-N.png (12 outfits a sheet) and prints any page errors. Needs Playwright and Chromium.
'use strict';
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const want = args.find(a => !a.startsWith('--')) || 'all', scale = +opt('scale', 3);
const out = path.resolve(opt('out', path.join(__dirname, '..', '..', 'build', 'outfits')));
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const names = await page.evaluate(() => Object.keys(OUTFITS));
  const list = want === 'all' ? names : want.split(',');
  const per = 12;
  for (let s = 0; s * per < list.length; s++) {
    const chunk = list.slice(s * per, s * per + per);
    const cv = await page.evaluate(({ chunk, scale }) => {
      const P = window.__pipbo, G = P.G;
      G.manual = true; P.loadLevel(0); G.introT = 0;
      const cw = 4 * 34 * scale + 20, chh = 46 * scale + 26, cols = 3, rows = Math.ceil(chunk.length / cols);
      const cv = canvas, ow = cv.width, oh = cv.height; // drawPlayer draws on the game canvas: borrow it for a moment
      cv.width = cols * cw; cv.height = rows * chh;
      const g = ctx;
      g.fillStyle = '#e9f1f4'; g.fillRect(0, 0, cv.width, cv.height);
      const v = pvKit(g, cv.width, cv.height);
      chunk.forEach((name, i) => {
        const cx = (i % cols) * cw, cy = Math.floor(i / cols) * chh;
        g.fillStyle = i % 2 ? '#dfe9ee' : '#eef4f6'; g.fillRect(cx, cy, cw, chh);
        g.fillStyle = '#1c1a36'; g.font = '700 14px sans-serif'; g.textAlign = 'left'; g.fillText(name, cx + 8, cy + 16);
        setOutfit(name);
        const mk = (id, x, face, vx) => Object.assign(makePlayer(id, 0, 0), { x: -PW / 2, y: -PH, face, vx, vy: 0, alive: true, sx: 1, sy: 1, stun: 0, blink: 0 });
        let k = 0;
        for (const [face, vx] of [[1, 0], [-1, 200]]) for (const id of [0, 1]) {
          g.save(); g.translate(cx + 20 + (k + 0.5) * 34 * scale, cy + chh - 8); g.scale(scale, scale);
          drawPlayer(mk(id, 0, face, vx));
          g.restore(); k++;
        }
        // the preview look, small, in the corner
        v.level = null; v.world = 0; v.t = 1;
        for (const id of [0, 1]) v.hero(id, cx + cw - 50 + id * 26, cy + 44, { outfit: name, s: 1 });
      });
      setOutfit(null);
      const url = cv.toDataURL('image/png'); cv.width = ow; cv.height = oh;
      return url;
    }, { chunk, scale });
    fs.writeFileSync(path.join(out, 'sheet-' + (s + 1) + '.png'), Buffer.from(cv.split(',')[1], 'base64'));
  }
  console.log('wrote', Math.ceil(list.length / per), 'sheets to', out);
  if (errors.length) console.log('errors:', errors.slice(0, 8).join('\n'));
  await browser.close();
})();
