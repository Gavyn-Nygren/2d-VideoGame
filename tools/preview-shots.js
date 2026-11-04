#!/usr/bin/env node
// Contact sheets of the level previews on the world pages (js/previews/), for checking how they look without
// clicking through the menus. One PNG per level, with frames taken across its loop, plus any errors it threw.
//
// Usage (from the repo folder, needs Playwright and Chromium):
//   node tools/preview-shots.js <world number> [--frames=8] [--out=build/previews] [--level="Hold the Door"] [--size=2]
//   node tools/preview-shots.js all
//   --times=0,4.9,5   draws exactly these moments instead (seconds; handy for checking the loop's seam)
// It opens index.html straight from disk and calls the same drawing code the menus use (pvKit, pvDrawLevel).
'use strict';
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');

const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const which = args.find(a => !a.startsWith('--')) || 'all';
const times = opt('times', null), frames = times ? times.split(',').length - 1 : +opt('frames', 8), out = path.resolve(opt('out', 'build/previews')), only = opt('level', null), scale = +opt('size', 2);

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', e => errors.push('page error: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  await page.waitForTimeout(400);
  const list = await page.evaluate(({ which, only }) => LEVELS.map((l, i) => ({ i, name: l.name, world: l.world + 1, code: levelCode(i), has: !!PREVIEWS[l.name] }))
    .filter(l => (which === 'all' || l.world === +which) && (!only || l.name === only)), { which, only });
  if (!list.length) { console.log('No levels match.'); await browser.close(); process.exit(1); }
  for (const l of list) {
    errors.length = 0;
    const res = await page.evaluate(({ i, frames, scale, given }) => {
      const spec = previewFor(i), loop = (spec && spec.loop) || 4.5, still = pvStill(i);
      const cols = Math.min(4, frames + 1), rows = Math.ceil((frames + 1) / cols), fw = PV_W * scale, fh = PV_H * scale, pad = 26;
      const sheet = document.createElement('canvas');
      sheet.width = cols * (fw + 8) + 8; sheet.height = rows * (fh + pad + 8) + 8;
      const sx = sheet.getContext('2d');
      sx.fillStyle = '#1c1a36'; sx.fillRect(0, 0, sheet.width, sheet.height);
      const cv = document.createElement('canvas'); cv.width = fw; cv.height = fh;
      const cx = cv.getContext('2d'), v = pvKit(cx);
      const times = given ? given.split(',').map(Number) : [still].concat(Array.from({ length: frames }, (_, k) => (loop * k) / frames));
      const t0 = performance.now();
      times.forEach((t, k) => {
        cx.setTransform(scale, 0, 0, scale, 0, 0); cx.clearRect(0, 0, PV_W, PV_H);
        pvDrawLevel(v, i, t);
        const x = 8 + (k % cols) * (fw + 8), y = 8 + Math.floor(k / cols) * (fh + pad + 8);
        sx.fillStyle = '#f6efdf'; sx.font = '700 16px sans-serif'; sx.textBaseline = 'top';
        sx.fillText((k === 0 && !given ? 'still ' : '') + 't=' + t.toFixed(2) + 's', x, y);
        sx.drawImage(cv, x, y + pad);
      });
      const ms = (performance.now() - t0) / times.length;
      return { png: sheet.toDataURL('image/png'), loop, still, ms, blurb: levelBlurb(i), warned: pvWarned.has(LEVELS[i].name) };
    }, { i: l.i, frames, scale, given: times });
    const file = path.join(out, `${l.code}-${l.name.replace(/[^A-Za-z0-9]+/g, '-')}.png`);
    fs.writeFileSync(file, Buffer.from(res.png.split(',')[1], 'base64'));
    console.log(`${l.code} ${l.name}: ${l.has ? 'preview' : 'NO PREVIEW (plain one shown)'}, loop ${res.loop}s, still ${res.still}s, ` +
      `${res.ms.toFixed(1)} ms/frame${res.warned ? ', THREW AN ERROR (plain one shown)' : ''} -> ${path.relative(process.cwd(), file)}`);
    console.log('   blurb: ' + res.blurb);
    for (const e of errors) console.log('   ' + e);
  }
  await browser.close();
})();
