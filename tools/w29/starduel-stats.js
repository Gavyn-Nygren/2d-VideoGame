#!/usr/bin/env node
// Throwing Star Duel balance check: node tools/w29/starduel-stats.js [--skills=normal,normal] [--n=20] [--nohelp=1]
// Plays n computer-vs-computer matches and prints who won, how long rounds lasted and what happened in them.
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.addInitScript(() => {
    const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    let seeded = gen(1); const other = gen(12345);
    window.__inStep = false; window.__seed = n => { seeded = gen((n >>> 0) || 1); };
    Math.random = () => (window.__inStep ? seeded() : other());
  });
  await page.goto('file://' + path.resolve(__dirname, '../../index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const n = +opt('n', 20), skills = opt('skills', 'normal,normal').split(',');
  const r = await page.evaluate(async ({ n, skills, nohelp }) => {
    const P = window.__pipbo, G = P.G, i = P.LEVELS.findIndex(l => l.mode === 'starduel');
    const out = { wins: [0, 0, 0], secs: [], reasons: {}, roundWins: [0, 0], stat: null, matchT: [] };
    P.MODES.starduel.testNoHelp = !!nohelp;
    for (let seed = 1; seed <= n; seed++) {
      window.__seed(seed * 7919); window.__inStep = true;
      G.manual = true; P.CPU.skillOf = skills.slice(); G.cpuOn = [true, true];
      delete G.results[i]; P.loadLevel(i); G.introT = 0;
      let k = 0;
      while (G.mode === 'play' && k < 120 * 900) { P.step(P.DT); k++; }
      window.__inStep = false;
      const res = G.results[i];
      if (!res) { out.wins[2]++; continue; }
      out.wins[res.winner < 0 ? 2 : res.winner]++;
      out.matchT.push(Math.round(k / 120));
      for (const h of G.match.history) { out.secs.push(h.secs); const key = h.reason.replace(/Pip|Bo/g, 'X'); out.reasons[key] = (out.reasons[key] || 0) + 1; if (h.winner >= 0) out.roundWins[h.winner]++; }
      const s = G.mst.stat;
      if (!out.stat) out.stat = { bonks: [0, 0], deflects: [0, 0], perfects: [0, 0], dodges: [0, 0], whiffs: [0, 0], throws: [0, 0], rally: 0, pafs: 0, helps: 0 };
      for (const key of ['bonks', 'deflects', 'perfects', 'dodges', 'whiffs', 'throws']) { out.stat[key][0] += s[key][0]; out.stat[key][1] += s[key][1]; }
      out.stat.rally = Math.max(out.stat.rally, s.rally); out.stat.pafs += s.pafs; out.stat.helps += G.mst.stats.helps;
      await new Promise(r => setTimeout(r, 0));
    }
    P.MODES.starduel.testNoHelp = false;
    return out;
  }, { n, skills, nohelp: opt('nohelp', '') === '1' });
  const sec = r.secs.slice().sort((a, b) => a - b), avg = sec.reduce((a, b) => a + b, 0) / (sec.length || 1);
  console.log(`skills ${skills.join('/')}  matches ${n}: Pip ${r.wins[0]}  Bo ${r.wins[1]}  draw/unfinished ${r.wins[2]}   rounds won ${r.roundWins.join('-')}`);
  console.log(`  round secs: avg ${avg.toFixed(1)}  min ${sec[0]}  median ${sec[sec.length >> 1]}  max ${sec[sec.length - 1]}   match secs avg ${(r.matchT.reduce((a, b) => a + b, 0) / (r.matchT.length || 1)).toFixed(0)}`);
  console.log('  reasons:', JSON.stringify(r.reasons));
  console.log('  totals:', JSON.stringify(r.stat));
  if (errs.length) console.log('  ERRORS:', errs.slice(0, 5));
  await browser.close();
})();
