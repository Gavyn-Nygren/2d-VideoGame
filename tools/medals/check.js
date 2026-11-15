#!/usr/bin/env node
// Checks the medals (js/medals.js) in headless Chromium: every team level (or the ones named) has medal goals in the
// shared format, its ready card lists them, and a clear with made-up values shows the medal ladder with no page errors.
// It also prints each level's goals in words, so they can be read over.
// Usage: node tools/medals/check.js [levels]   levels: codes or indexes, comma separated (default: every team level)
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..', '..');
const want = (process.argv[2] || '').split(',').filter(Boolean);
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto('file://' + path.join(root, 'index.html'));
  await page.waitForFunction(() => window.__pipbo);
  const list = await page.evaluate(w => { const P = window.__pipbo; return P.LEVELS.map((l, i) => ({ i, code: P.levelCode(i), name: l.name, kind: l.kind }))
    .filter(l => l.kind === 'team' && (!w.length || w.includes(l.code) || w.includes(String(l.i)))); }, want);
  let fails = 0;
  for (const lv of list) {
    errs.length = 0;
    const r = await page.evaluate(i => {
      const P = window.__pipbo, out = { problems: [] };
      const spec = window.__pipboMedals.medalSpec(i);
      if (!spec) { out.problems.push('no medal goals'); return out; }
      out.words = ['gold', 'silver'].map(t => t + ': ' + spec.goals.filter(g => g[t] != null).map(g => window.__pipboMedals.medalGoalText(g, t)).join(', ')).concat('bronze: ' + spec.bronze);
      if (!spec.bronze) out.problems.push('no bronze words');
      for (const g of spec.goals) {
        if (!g.key) out.problems.push('a goal without a key');
        if (g.gold == null && g.silver == null) out.problems.push(g.key + ': no gold or silver');
        if (g.gold != null && g.silver != null && (g.more ? g.gold < g.silver : g.gold > g.silver)) out.problems.push(g.key + ': gold easier than silver');
      }
      P.startLevel(i);
      const card = document.querySelector('.ready-card .medal-goals');
      if (!card) out.problems.push('ready card has no medal goals');
      P.G.manual = true; P.G.mode = 'play';
      for (let k = 0; k < 30; k++) P.step(P.DT);
      P.levelClear();
      const rec = P.G.results[i];
      if (!rec || !rec.medal) out.problems.push('no medal at the clear');
      else {
        out.medal = rec.medal.tier + ' ' + JSON.stringify(rec.medal.vals);
        for (const g of spec.goals) if (rec.medal.vals[g.key] == null && !rec.medal.vals.noMedal) out.problems.push(g.key + ': medalValues() gave no value');
      }
      P.showResult();
      if (!document.querySelector('#overlay .medal-ladder')) out.problems.push('results card has no medal ladder');
      if ([...document.querySelectorAll('#overlay .stat .k')].some(e => /medal/i.test(e.textContent))) out.problems.push('stats still show a Medal tile');
      if ([...document.querySelectorAll('#overlay .lede')].some(e => /\b(gold|silver|bronze) medal\b/i.test(e.textContent))) out.problems.push('stats text still names the medal');
      return out;
    }, lv.i);
    if (errs.length) r.problems.push('page errors: ' + errs.slice(0, 3).join(' | ').slice(0, 300));
    if (r.problems.length) fails++;
    console.log(`${r.problems.length ? 'FAIL' : 'ok  '}  ${lv.code.padEnd(5)} ${lv.name.padEnd(26)} ${r.problems.join('; ')}`);
    if (r.words) console.log('        ' + r.words.join(' | ') + (r.medal ? '   [made-up clear: tier ' + r.medal + ']' : ''));
  }
  console.log(fails ? `${fails} level(s) failed` : 'all ok');
  await browser.close();
  process.exit(fails ? 1 : 0);
})();
