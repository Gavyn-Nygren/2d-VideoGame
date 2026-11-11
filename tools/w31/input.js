#!/usr/bin/env node
// Real-time keyboard check for World 31: node tools/w31/input.js
// Loads each level with two people (no computer), holds or taps real keys, and checks the level saw them.
'use strict';
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = []; page.on('pageerror', e => errs.push(String(e)));
  await page.goto('file://' + path.resolve(__dirname, '../../index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const load = async mode => page.evaluate(m => { const P = window.__pipbo; P.G.cpuOn = [false, false]; P.loadLevel(P.LEVELS.findIndex(l => l.mode === m)); P.G.introT = 0; }, mode);
  const ev = f => page.evaluate(f);
  const out = {};
  await load('mowrun'); await page.waitForTimeout(300);
  let x0 = await ev(() => window.__pipbo.G.mst.run.map(r => r.x));
  await page.keyboard.down('KeyD'); await page.keyboard.down('ArrowRight'); await page.waitForTimeout(1200); await page.keyboard.up('KeyD'); await page.keyboard.up('ArrowRight');
  let x1 = await ev(() => window.__pipbo.G.mst.run.map(r => r.x));
  out.mowrun = x1[0] > x0[0] + 100 && x1[1] > x0[1] + 100;
  await load('antheist'); await page.waitForTimeout(300);
  x0 = await ev(() => window.__pipbo.G.mst.cr.x);
  await page.keyboard.down('KeyD'); await page.keyboard.down('ArrowRight'); await page.waitForTimeout(1000); await page.keyboard.up('KeyD'); await page.keyboard.up('ArrowRight');
  x1 = await ev(() => window.__pipbo.G.mst.cr.x);
  await page.keyboard.down('KeyS'); await page.waitForTimeout(200);
  const fz = await ev(() => window.__pipbo.G.mst.cr.frozen[0]); await page.keyboard.up('KeyS');
  out.antheist = x1 > x0 + 80 && fz;
  await load('birddash'); await page.waitForTimeout(300);
  await page.keyboard.down('KeyS'); await page.waitForTimeout(250);
  const lk = await ev(() => window.__pipbo.G.mst.run[window.__pipbo.G.mst.wat].look); await page.keyboard.up('KeyS');
  x0 = await ev(() => window.__pipbo.G.mst.run[1].x);
  await page.keyboard.press('Slash'); await page.waitForTimeout(300);
  const rolls = await ev(() => window.__pipbo.G.mst.stats.rolls);
  out.birddash = lk && rolls === 1;
  await load('snailrace'); await page.waitForFunction(() => window.__pipbo.G.match && window.__pipbo.G.match.phase === 'live', null, { timeout: 8000 });
  for (let k = 0; k < 6; k++) { await page.keyboard.press('KeyF'); await page.keyboard.press('Slash'); await page.waitForTimeout(90); }
  await page.keyboard.press('KeyW'); await page.waitForTimeout(120);
  const sn = await ev(() => window.__pipbo.G.mst.pl.map(P => [P.x, P.row]));
  out.snailrace = sn[0][0] > 125 && sn[1][0] > 125 && sn[0][1] === 0;
  console.log(out, sn, errs.slice(0, 3));
  await browser.close();
})();
