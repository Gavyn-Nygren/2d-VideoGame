#!/usr/bin/env node
// World 40 Round 0 style proof: renders the two proof screens (the foot on Pyramid Sands, inside the boiler) through art
// rounds 1-5 and finished, on a laptop and a phone, plus 3x zooms and the three boil versions.
// node tools/w40/proof.js [outDir]   (default /mnt/project-files/pip-and-bo/notes/world40-art/round0)
'use strict';
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const out = process.argv[2] || '/mnt/project-files/pip-and-bo/notes/world40-art/round0';
fs.mkdirSync(out, { recursive: true });
async function shot(browser, scene, file, o = {}) {
  const page = await browser.newPage(o.phone ? { viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });
  const errs = []; page.on('pageerror', e => errs.push(String(e)));
  await page.goto('file://' + path.resolve(__dirname, '../../index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  await page.evaluate(s => { window.W40SCENE = s; }, scene);
  await page.addScriptTag({ path: path.resolve(__dirname, 'proof-scenes.js') });
  await page.evaluate(({ round, t, v }) => {
    const P = window.__pipbo, G = P.G; G.manual = true; P.loadLevel(0); G.introT = 0;
    const cv = document.getElementById('game'), ctx = cv.getContext('2d');
    SKETCH.res = Math.min(2, cv.width / 960); SKETCH.round = round; SKETCH.t = t;
    if (v != null) SKETCH.reduce = false;
    window.render = () => {};
    ctx.setTransform(cv.width / 960, 0, 0, cv.height / 540, 0, 0);
    window.W40LOOK(ctx);
  }, { round: o.round || 6, t: o.t || 0.3, v: o.v });
  await page.waitForTimeout(80);
  const el = await page.$('#game');
  if (o.clip) {
    const [x, y, w, h] = o.clip, bb = await el.boundingBox(), s = bb.width / 960;
    await page.screenshot({ path: path.join(out, file), clip: { x: bb.x + x * s, y: bb.y + y * s, width: w * s, height: h * s } });
  } else if (o.phone) await page.screenshot({ path: path.join(out, file) });
  else await el.screenshot({ path: path.join(out, file) });
  if (errs.length) console.log(file, errs.slice(0, 3));
  await page.close();
}
(async () => {
  const browser = await chromium.launch();
  for (const sc of ['chase', 'boiler']) {
    for (let r = 1; r <= 4; r++) await shot(browser, sc, `${sc}-round${r}.png`, { round: r });
    for (let v = 0; v < 3; v++) await shot(browser, sc, `${sc}-round5-boil${v}.png`, { t: v / 8 + 0.001, v, clip: sc === 'chase' ? [440, 60, 320, 180] : [540, 160, 260, 220] });
    await shot(browser, sc, `${sc}-finished-laptop.png`, {});
    await shot(browser, sc, `${sc}-finished-phone.png`, { phone: true });
  }
  await shot(browser, 'chase', 'chase-zoom3x-foot.png', { clip: [280, 60, 320, 180] });
  await shot(browser, 'chase', 'chase-zoom3x-heroes.png', { clip: [140, 360, 320, 180] });
  await shot(browser, 'boiler', 'boiler-zoom3x-furnace.png', { clip: [470, 120, 320, 180] });
  await shot(browser, 'boiler', 'boiler-zoom3x-heroes.png', { clip: [160, 300, 320, 180] });
  await browser.close();
  console.log('wrote', fs.readdirSync(out).length, 'files to', out);
})();
