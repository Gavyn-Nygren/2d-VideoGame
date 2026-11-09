#!/usr/bin/env node
// 23-4 Pie-Eating Contest: does the whole game load cleanly, does World 23 show the level card, and does 1-player
// against each computer skill (with nobody pressing anything) always finish?
//   node tools/w23/pieeat-load.js
'use strict';
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  await page.waitForTimeout(500);
  const info = await page.evaluate(() => {
    const P = window.__pipbo, i = P.LEVELS.findIndex(l => l.name === 'Pie-Eating Contest');
    return { index: i, mode: P.LEVELS[i] && P.LEVELS[i].mode, world: (window.WORLDS || []).map(w => w.name).filter(n => /Barnyard/.test(n)).join(','),
      text: document.body.innerText.replace(/\s+/g, ' ').slice(0, 400) };
  });
  console.log('level index', info.index, 'mode', info.mode, 'world', info.world || '(WORLDS not global)');
  // the world map's World 23 tile, then the World 23 page with the 23-4 card
  await page.click('[data-act="worlds"]');
  await page.waitForTimeout(600);
  const tiles = await page.evaluate(() => [...document.querySelectorAll('.wtile')].map(b => b.querySelector('.wname').textContent + ' (' + b.querySelector('.wmeta').textContent + ')'));
  const t23 = tiles.find(s => /Barnyard/.test(s));
  console.log('world map tile:', t23 || '(missing)');
  fs.mkdirSync(path.resolve(__dirname, '..', '..', 'build', 'w23'), { recursive: true });
  await page.evaluate(() => { const b = [...document.querySelectorAll('.wtile')].find(b => /Barnyard/.test(b.textContent)); b && b.click(); });
  await page.waitForTimeout(1500);
  const card = await page.evaluate(() => /Pie-Eating Contest/.test(document.body.innerText));
  console.log('World 23 page shows the Pie-Eating Contest card:', card);
  await page.screenshot({ path: path.resolve(__dirname, '..', '..', 'build', 'w23', 'pe-worldpage.png') });
  const hasW23 = !!t23 && card;
  // 1-player, nobody pressing: the computer keeps eating and every match ends
  for (const skill of ['easy', 'normal', 'hard']) {
    const r = await page.evaluate(skill => {
      const P = window.__pipbo, G = P.G;
      G.manual = true; P.cpuSetCfg('players', 1); P.cpuSetCfg('skill', skill);
      P.loadLevel(P.LEVELS.findIndex(l => l.name === 'Pie-Eating Contest'));
      G.introT = 0;
      let n = 0; const max = Math.round(400 / P.DT);
      while (n++ < max && !(G.match && G.match.phase === 'over')) { P.pollInput(P.DT); P.step(P.DT); }
      return { over: !!(G.match && G.match.phase === 'over'), score: G.match && G.match.wins, cpu: G.cpuOn, secs: Math.round(n * P.DT) };
    }, skill);
    console.log((r.over ? 'PASS' : 'FAIL') + ' 1-player vs ' + skill + ', person idle: ' + JSON.stringify(r));
    if (!r.over) errors.push('1-player ' + skill + ' did not finish');
  }
  console.log(errors.length ? 'ERRORS\n' + errors.join('\n') : 'no page errors');
  await browser.close();
  process.exit(errors.length || !hasW23 ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
