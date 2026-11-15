#!/usr/bin/env node
// Quick look at World 40 art: node tools/w40/look.js <script.js> <out.png> [--w=1280 --h=720 --dpr=2] [--round=6] [--t=0]
// Loads the game, injects the script (it must define window.W40LOOK(ctx) that draws one 960x540 frame), screenshots the canvas.
'use strict';
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const args = process.argv.slice(2), opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: +opt('w', 1280), height: +opt('h', 720) }, deviceScaleFactor: +opt('dpr', 2) });
  const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '../../index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  if (opt('scene')) await page.evaluate(s => { window.W40SCENE = s; }, opt('scene'));
  await page.addScriptTag({ path: path.resolve(args[0]) });
  const ms = await page.evaluate(({ round, t, crop }) => {
    const P = window.__pipbo, G = P.G; G.manual = true; P.loadLevel(0); G.introT = 0;
    const cv = document.getElementById('game'), ctx = cv.getContext('2d');
    SKETCH.res = Math.min(2, cv.width / 960); SKETCH.round = round; SKETCH.t = t;
    window.render = () => {};
    const t0 = performance.now();
    ctx.setTransform(cv.width / 960, 0, 0, cv.height / 540, 0, 0);
    window.W40LOOK(ctx);
    const t1 = performance.now();
    ctx.setTransform(cv.width / 960, 0, 0, cv.height / 540, 0, 0);
    window.W40LOOK(ctx);
    return [Math.round(t1 - t0), Math.round(performance.now() - t1)];
  }, { round: +opt('round', 6), t: +opt('t', 0) });
  await page.waitForTimeout(60);
  const el = await page.$('#game');
  fs.mkdirSync(path.dirname(path.resolve(args[1])), { recursive: true });
  const clip = opt('clip'); // x,y,w,h in game px, for zooms
  if (clip) {
    const [x, y, w, h] = clip.split(',').map(Number), bb = await el.boundingBox(), s = bb.width / 960;
    await page.screenshot({ path: args[1], clip: { x: bb.x + x * s, y: bb.y + y * s, width: w * s, height: h * s } });
  } else await el.screenshot({ path: args[1] });
  console.log('first frame ms', ms[0], 'cached frame ms', ms[1], 'errors:', errs.slice(0, 6));
  await browser.close();
})();
