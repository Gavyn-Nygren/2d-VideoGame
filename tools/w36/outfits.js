#!/usr/bin/env node
// A contact sheet of the World 36 outfits (STUDIO.stunt in studio-kit.js): node tools/w36/outfits.js [--scale=4]
// Each look (stunt, crew, agent, show) with Pip and Bo facing right, facing left, and tilted with arms out, on a light
// and a dark background. Writes build/w36/outfits.png. Check: no blue on Pip, no orange or red on Bo, the sprout and
// the ears show, the eyes show.
'use strict';
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const scale = +opt('scale', 4);
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = []; page.on('pageerror', e => errors.push(String(e)));
  await page.goto('file://' + path.resolve(__dirname, '../../index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const url = await page.evaluate(scale => {
    const P = window.__pipbo, G = P.G;
    G.manual = true; P.loadLevel(P.LEVELS.findIndex(l => l.mode === 'takeone')); G.introT = 0;
    const looks = ['stunt', 'crew', 'agent', 'show'], cw = 6 * 30 * scale + 20, chh = 46 * scale + 30;
    const cv = canvas, ow = cv.width, oh = cv.height;
    cv.width = 2 * cw; cv.height = looks.length * chh;
    looks.forEach((look, i) => [0, 1].forEach(dark => {
      const cx = dark * cw, cy = i * chh;
      ctx.fillStyle = dark ? '#1c2440' : '#e9f1f4'; ctx.fillRect(cx, cy, cw, chh);
      ctx.fillStyle = dark ? '#ffffff' : '#1c1a36'; ctx.font = '700 14px sans-serif'; ctx.textAlign = 'left'; ctx.fillText(look, cx + 8, cy + 16);
      let k = 0;
      for (const o of [{ face: 1 }, { face: -1 }, { face: 1, rot: 0.35, arms: 'out', cape: 1 }]) for (const id of [0, 1]) {
        ctx.save(); ctx.translate(cx + 10 + (k + 0.5) * 30 * scale, cy + chh - 10); ctx.scale(scale, scale);
        STUDIO.stunt(id, 0, 0, Object.assign({ look }, o));
        ctx.restore(); k++;
      }
    }));
    const u = cv.toDataURL('image/png'); cv.width = ow; cv.height = oh;
    return u;
  }, scale);
  const out = path.resolve(__dirname, '../../build/w36'); fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'outfits.png'), Buffer.from(url.split(',')[1], 'base64'));
  console.log('wrote build/w36/outfits.png', errors.length ? 'errors: ' + errors.slice(0, 5).join('\n') : '');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
