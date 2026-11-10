// Shared helpers for the World 30 integration checks (tools/w30/int-*.js): a REAL session (G.manual false, the menu
// is clicked, the keyboard is real) with a hand-over to the computer pair when a run must be finished fast.
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(ROOT, 'build', 'w30', 'int');
fs.mkdirSync(OUT, { recursive: true });
const URL = 'file://' + path.join(ROOT, 'index.html');

async function open(browser, o = {}) {
  const ctx = await browser.newContext(Object.assign({ viewport: { width: 1280, height: 800 } }, o.ctx || {}));
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + String(e)));
  await page.goto(URL);
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.MODES && window.__pipbo.MODES.timethief);
  return { ctx, page, errors };
}
// title -> Play -> World 30 -> the level, with real clicks (or taps)
async function pickLevel(page, o = {}) {
  const hit = async sel => { const el = page.locator(sel).first(); await el.waitFor({ state: 'visible', timeout: 5000 }); if (o.tap) await el.tap(); else await el.click(); };
  const i = await page.evaluate(m => window.__pipbo.LEVELS.findIndex(l => l.mode === m), o.mode || 'timethief');
  const w = await page.evaluate(i => window.__pipbo.LEVELS[i].world, i);
  await page.waitForTimeout(450);
  await hit('[data-act="worlds"]');
  await page.waitForTimeout(450);
  for (let n = 0; n < 6; n++) {
    if (await page.locator(`[data-act="openworld"][data-w="${w}"]`).count()) break;
    await hit('[data-act="wpage"].next'); await page.waitForTimeout(450);
  }
  await hit(`[data-act="openworld"][data-w="${w}"]`);
  await page.waitForTimeout(450);
  await hit(`[data-act="level"][data-i="${i}"]`);
  await page.waitForFunction(() => window.__pipbo.G.mode === 'play');
  return i;
}
const snap = page => page.evaluate(() => {
  const P = window.__pipbo, G = P.G, st = G.mst || {};
  return { mode: G.mode, manual: !!G.manual, level: G.levelIndex, room: G.room, time: Math.round(G.time * 10) / 10, introT: G.introT, phase: st.phase, phaseNo: st.phaseNo,
    bumps: st.stats && st.stats.bumps, team: st.stats && st.stats.team, loot: st.loot, news: st.news && st.news.text, resumed: st.resumed, note: st.cpNote ? st.cpNote.text : null, noteT: st.cpNote ? st.cpNote.t : null,
    cp: localStorage.getItem('pipbo:tth:cp'), cpuOn: G.cpuOn && G.cpuOn.slice(), overlay: !document.getElementById('overlay').hidden };
});
// hand over to the computer pair and run the rest of the level fast. o.cp: keep checkpoints working (default true)
const finish = (page, o = {}) => page.evaluate(async o => {
  const P = window.__pipbo, G = P.G, TT = P.MODES.timethief.test;
  G.manual = true; TT.cp(o.cp !== false);
  G.cpuOn = [true, true]; P.CPU.st = [{}, {}]; P.CPU.last = [{}, {}]; P.CPU.errs.clear();
  if (o.seed != null) TT.seed(o.seed);
  const log = [], steps = Math.round((o.max || 3000) / P.DT);
  let n = 0, last = G.room;
  const stopAt = o.stopAtEra == null ? 99 : o.stopAtEra;
  while (n < steps && G.mode === 'play' && !(G.room >= stopAt && G.introT <= 0)) {
    for (let k = 0; k < 600 && n < steps && G.mode === 'play' && !(G.room >= stopAt && G.introT <= 0); k++, n++) {
      P.step(P.DT);
      if (G.room !== last) { last = G.room; log.push({ era: G.room, time: Math.round(G.time * 10) / 10, cp: localStorage.getItem('pipbo:tth:cp'), bumps: G.mst.stats.bumps.slice(), team: G.mst.stats.team, loot: G.mst.loot.slice() }); }
    }
    await new Promise(r => setTimeout(r, 0));
  }
  const res = G.results[G.levelIndex] || null;
  const out = { mode: G.mode, room: G.room, simT: Math.round(n * P.DT), time: G.time, log, cpuErrs: [...P.CPU.errs], cp: localStorage.getItem('pipbo:tth:cp'),
    res: res && { time: res.time, best: res.best, newBest: res.newBest, stats: res.stats }, statsRaw: JSON.parse(JSON.stringify(G.mst.stats)) };
  if (o.release) { G.manual = false; TT.cp(false); P.cpuApplyCfg(); }
  return out;
}, o);
module.exports = { chromium, ROOT, OUT, URL, open, pickLevel, snap, finish, fs, path };
