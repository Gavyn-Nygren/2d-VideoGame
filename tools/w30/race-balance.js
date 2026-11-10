#!/usr/bin/env node
// Balance runs for the Portal Race Home (30-1, era 'race'): the computer races itself, many seeds, and the script
// reports every race (winner, time, margin, stumbles) and who became champ how often.
//   node tools/w30/race-balance.js [--a=normal] [--b=normal] [--seeds=1,2,3,4,5,6,7,8,9,10] [--quiet]
//   --a / --b   Pip's and Bo's skill: easy | normal | hard | kid (kid: the brain's kid-like test profile)
// Use it for: equal skills (no side bias: about half each), hard vs easy (Hard nearly always, from both sides),
// kid vs easy (the kid should win most), and the race times (a race about 40-50 s).
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const A = opt('a', 'normal'), B = opt('b', 'normal'), seeds = opt('seeds', '1,2,3,4,5,6,7,8,9,10').split(',').map(Number), quiet = args.includes('--quiet');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  await page.addInitScript(() => {
    const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    let seeded = gen(1); const other = gen(12345);
    window.__inStep = false; window.__seed = n => { seeded = gen((n >>> 0) || 1); };
    Math.random = () => (window.__inStep ? seeded() : other());
  });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.MODES && window.__pipbo.MODES.timethief);
  const champ = [0, 0], races = [0, 0], times = [], margins = [], eras = [];
  let ties = 0;
  for (const seed of seeds) {
    const r = await page.evaluate(async ({ seed, A, B }) => {
      const P = window.__pipbo, G = P.G, TT = P.MODES.timethief.test;
      window.__seed(seed * 7919); window.__inStep = true;
      G.manual = true; G.cpuOn = [true, true]; P.CPU.filter = null; P.CPU.errs.clear();
      const names = [A, B];
      P.CPU.skillOf = names.map(n => (n === 'kid' ? 'normal' : n));
      TT.jump(TT.TTH_ORDER.indexOf('race'), { intro: false });
      const st = G.mst;
      let n = 0, ended = false;
      const tied = () => (st.ph.replay ? 1 : 0);
      let ties = 0, wasReplay = false;
      while (n < 120 * 400 && !ended) {
        for (let j = 0; j < 1200 && !ended; j++, n++) {
          window.__inStep = true;
          P.step(P.DT);
          // the kid profile: set on the era brain's own state (it is made on the first step)
          for (const k of [0, 1]) if (names[k] === 'kid') { const b = P.CPU.st[k]; if (b && b.sub && !b.sub.sk) b.sub.sk = TTH_BRAINS.race.SK.kid; }
          if (st.ph.replay && !wasReplay) ties++;
          wasReplay = !!st.ph.replay;
          if (st.cut || G.mode !== 'play' || G.mst !== st) ended = true;
        }
        window.__inStep = false;
        await new Promise(r2 => setTimeout(r2, 0));
      }
      void tied;
      return { ended, t: Math.round(st.phT * 10) / 10, own: st.stats.race, help: st.stats.help.length, ties, errs: [...P.CPU.errs], bumps: st.stats.bumps.concat(st.stats.team) };
    }, { seed, A, B });
    const s = r.own || {};
    if (!quiet) console.log(`seed ${String(seed).padStart(2)}  era ${String(r.t).padStart(6)}s  champ ${s.champ == null ? '?' : ['Pip', 'Bo'][s.champ]} ${s.wins ? s.wins.join('-') : ''}  ` +
      (s.races || []).map(q => `${['Pip', 'Bo'][q.w]} ${q.t}s${q.m != null ? ' by ' + q.m : ''}`).join(' | ') + `  stumbles ${(s.stumbles || []).join('/')}  boosts ${(s.boosts || []).join('/')}  gold help ${r.help}${r.ties ? '  TIES ' + r.ties : ''}${r.ended ? '' : '  NOT ENDED'}${r.errs.length ? '  CPU ERR ' + r.errs.join(',') : ''}${r.bumps.some(Boolean) ? '  BUMPS ' + r.bumps.join('+') : ''}`);
    if (s.champ != null) champ[s.champ]++;
    for (const q of s.races || []) { races[q.w]++; if (q.t != null) times.push(q.t); if (q.m != null) margins.push(q.m); }
    ties += r.ties; eras.push(r.t);
  }
  const avg = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0), srt = a => a.slice().sort((x, y) => x - y);
  const med = a => (a.length ? srt(a)[Math.floor(a.length / 2)] : 0);
  console.log(`--- ${A} (Pip) vs ${B} (Bo), ${seeds.length} seeds: champ Pip ${champ[0]} - Bo ${champ[1]};  races Pip ${races[0]} - Bo ${races[1]};  race time ${Math.min(...times)}-${Math.max(...times)}s (avg ${avg(times).toFixed(1)});  margin median ${med(margins)}s, under 2 s: ${margins.filter(m => m < 2).length}/${margins.length};  era ${Math.min(...eras)}-${Math.max(...eras)}s;  ties ${ties}`);
  if (errors.length) console.log('PAGE MESSAGES:\n' + errors.slice(0, 8).join('\n'));
  await browser.close();
})().catch(e => { console.error(e); process.exit(2); });
