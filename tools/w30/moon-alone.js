#!/usr/bin/env node
// Era 'moon': one player can never clear it alone. 1-player mode, the computer plays its job at full skill and the
// "person" keeps pressing things (so the Thief never waits) but never does their own job:
//   wiggle   only left / right, back and forth (an engineer who never pumps, a pilot who never burns)
//   holdact  holds the action button all the time (a pilot who only climbs; an engineer who pumps once and stops)
//   hop      taps up now and then (nothing at all for an engineer; little burns for a pilot)
// for both seats (the person plays Pip, then Bo). None may get past the first beacon in 240 s, and nothing may throw.
// A last pair of runs checks the other direction: a person who does the job (the computer plays both) clears.
// Usage: node tools/w30/moon-alone.js [--max=240]
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.MODES && window.__pipbo.MODES.timethief);
  let bad = 0;
  for (const human of [0, 1]) for (const how of ['wiggle', 'holdact', 'hop']) {
    const r = await page.evaluate(({ human, how, maxT }) => {
      const P = window.__pipbo, G = P.G, TT = P.MODES.timethief.test;
      G.manual = true; P.CPU.errs.clear(); P.CPU.filter = null;
      P.cpuSetCfg('players', 1); P.cpuSetCfg('human', human);
      TT.jump(7, { seed: 3 + human });
      const st = G.mst, ph = st.ph, p = G.players[human], n1 = Math.round(maxT / P.DT);
      let idleT = 0, maxStretch = 0;
      for (let n = 0; n < n1 && !st.cut && G.mst === st; n++) {
        const t = n * P.DT, i = p.input;
        i.left = i.right = i.jump = i.act = i.up = i.down = false;
        if (how === 'wiggle') { if (Math.floor(t / 0.7) % 2) i.left = true; else i.right = true; }
        else if (how === 'holdact') { i.act = true; if (n === 0) p.pendingAct = true; }
        else if (how === 'hop') { const u = t % 1.3; if (u < 0.12) { i.jump = true; if (u < P.DT * 1.5) p.pendingJump = true; } }
        P.step(P.DT);
        if (st.idle) idleT += P.DT;
        maxStretch = Math.max(maxStretch, ph.stretch);
      }
      return { ended: !!st.cut, stretch: maxStretch, mode: ph.mode, y: Math.round(ph.L.y), beacon: Math.round(ph.beacons[0].y), bumps: st.stats.team, kinds: st.stats.kinds, idleT: Math.round(idleT), gold: st.stats.moon.gold, errs: [...P.CPU.errs] };
    }, { human, how, maxT: +opt('max', 240) });
    const ok = !r.ended && r.stretch === 0 && !r.errs.length;
    if (!ok) bad++;
    console.log(`${ok ? 'ok  ' : 'BAD '} person = ${human ? 'Bo (pilot first)' : 'Pip (engineer first)'}, ${how.padEnd(7)}: ${r.ended ? 'ENDED' : 'not ended'}, stretch ${r.stretch + 1}, lander y ${r.y} (beacon 1 at ${r.beacon}), bumps ${r.bumps} ${JSON.stringify(r.kinds)}, gold ${JSON.stringify(r.gold)}, waited ${r.idleT} s${r.errs.length ? ' CPU ERR ' + r.errs : ''}`);
  }
  console.log(bad ? bad + ' PROBLEMS' : 'nobody clears the era alone');
  console.log(errors.length ? 'PAGE MESSAGES:\n' + [...new Set(errors)].slice(0, 10).join('\n') : 'no page errors');
  await browser.close();
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
