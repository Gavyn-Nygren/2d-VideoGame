#!/usr/bin/env node
// World 37 outfit sheet for the outfit review: Pip and Bo in each level's outfit, close up, standing, moving and in a
// damaged or messy state. node tools/w37/outfits.js [--scale=3]  ->  build/w37/outfits.png
'use strict';
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1100, height: 640 }, deviceScaleFactor: 2 });
  const errs = []; page.on('pageerror', e => errs.push(String(e)));
  await page.goto('file://' + path.resolve(__dirname, '../../index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const out = path.resolve(__dirname, '../../build/w37'); fs.mkdirSync(out, { recursive: true });
  const rows = [
    ['livery', '37-1 royal coach livery', [{ prop: 'gauntlets', arms: 'reins' }, { prop: 'rope', v: 1 }, { prop: 'rope', straw: 1, rot: -0.2 }]],
    ['borrowed', '37-2 borrowed armour', [{ prop: 'spur', visor: 0 }, { prop: 'lance', v: 1, visor: 0.5 }, { prop: 'lance', askew: 0.35, visor: 1, dizzy: true, straw: 0.7 }]],
    ['engineer', '37-3 siege engineers', [{ prop: 'straps', arms: 'push' }, { prop: 'hide', arms: 'hold', v: 0.6 }, { prop: 'straps', soot: 1, dent: true, arrows: 2 }]],
    ['champion', '37-4 tournament champions', [{ visor: 1 }, { v: 1, visor: 1, arms: 'fwd' }, { wobble: 1, backwards: true, dizzy: true }, { laurel: true, visor: 0 }]],
  ];
  // stop the game's own frame loop so it doesn't paint over the sheet
  await page.evaluate(() => { window.requestAnimationFrame = () => 0; });
  await page.waitForTimeout(150);
  const sc = +opt('scale', 3);
  for (let r = 0; r < rows.length; r++) {
    await page.evaluate(({ rows, r, sc }) => {
      const P = window.__pipbo, G = P.G;
      G.manual = true; G.cpuOn = [true, true];
      P.loadLevel(P.LEVELS.findIndex(l => l.mode === 'royalcarriage'));
      G.introT = 0; G.clock = 1.3; G.mode = 'paused';
      let cv = document.getElementById('w37sheet');
      if (!cv) { cv = document.createElement('canvas'); cv.id = 'w37sheet'; cv.width = 1920; cv.height = 1080; cv.style.cssText = 'position:fixed;left:0;top:0;width:960px;height:540px;z-index:9999'; document.body.appendChild(cv); }
      const c = cv.getContext('2d'); c.setTransform(2, 0, 0, 2, 0, 0);
      const v = pvKit(c, 960, 540); v.setWorld(36);
      const g = c.createLinearGradient(0, 0, 0, 540); g.addColorStop(0, '#bfe6f6'); g.addColorStop(1, '#e8f6dc');
      c.fillStyle = g; c.fillRect(0, 0, 960, 540);
      const [name, title, states] = rows[r];
      c.fillStyle = '#1c1a36'; c.font = '700 22px sans-serif'; c.textAlign = 'left'; c.fillText(title + ' (Pip left, Bo right in each pair)', 20, 34);
      const labels = name === 'champion' ? ['standing, visor down', 'charging', 'beaten: torn plumes, helm on backwards', 'match winner: laurel'] : ['standing / job A', 'moving / job B', 'damaged or messy'];
      states.forEach((o, k) => {
        const cx = 120 + k * (840 / states.length) + (states.length === 4 ? -20 : 40);
        for (const id of [0, 1]) {
          const x = cx + id * 48 * sc * 0.55, y = 330;
          c.fillStyle = 'rgba(0,0,0,0.12)'; c.beginPath(); c.ellipse(x, y, 30, 6, 0, 0, Math.PI * 2); c.fill();
          const face = 1;
          TOURNEY_OUTFITS.draw(c, id, name, Object.assign({ x, y, s: sc * 0.9, face, t: 1.3, bw: 20, bh: 24 }, o), () => v.hero(id, 0, 0, { s: 1, face, mood: o.dizzy ? 'dizzy' : 'happy', shadow: false }));
        }
        c.fillStyle = '#1c1a36'; c.font = '700 14px sans-serif'; c.textAlign = 'center'; c.fillText(labels[k], cx + 25, 380);
      });
    }, { rows, r, sc });
    await page.locator('#w37sheet').screenshot({ path: path.join(out, 'outfits-' + rows[r][0] + '.png') });
  }
  console.log('errors:', errs.slice(0, 5), 'written to build/w37/outfits-*.png');
  await browser.close();
})();
