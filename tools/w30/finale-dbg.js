#!/usr/bin/env node
// Debug helper for the finale era: runs the computer pair for some seconds and prints the era's state (and any
// expression) every so often.   node tools/w30/finale-dbg.js [seconds=20] [every=1] [--expr="js"] [--seed=1] [--who=pair|idle0|idle1]
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2), pos = args.filter(a => !a.startsWith('--'));
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.MODES && window.__pipbo.MODES.timethief);
  const out = await page.evaluate(({ secs, every, expr, seed, who }) => {
    const P = window.__pipbo, G = P.G, TT = P.MODES.timethief.test;
    G.manual = true; G.cpuOn = who === 'idle0' ? [false, true] : who === 'idle1' ? [true, false] : [true, true];
    TT.jump(8, { seed });
    const st = G.mst, lines = [], n = Math.round(secs / P.DT), ev = Math.round(every / P.DT);
    const f = expr ? new Function('P', 'G', 'st', 'ph', 'return (' + expr + ')') : null;
    for (let i = 0; i < n && !st.cut; i++) {
      P.step(P.DT);
      if (i % ev === 0) {
        const ph = st.ph, ps = G.players;
        lines.push((i * P.DT).toFixed(2) + ' ' + ph.stage + ' k' + ph.k + ' hold' + ph.holder + ' grip ' + ph.grip.toFixed(2) + (ph.braking ? ' BRAKE' : '') + (ph.slip ? ' slip' : '') + ' hand ' + ph.hand.k.toFixed(2)
          + ' | ' + ps.map(p => Math.round(p.x + 11) + ',' + Math.round(-(p.y + st.cam.y + 26) - ph.k * 0) + (p.grounded ? 'g' : 'a') + ':' + (ph.P[p.id].on ? (ph.P[p.id].on.el ? ph.P[p.id].on.el.id : ph.P[p.id].on.kind) : '-') + ' in ' + ['left', 'right', 'jump', 'act'].filter(k => p.input[k]).join('+')).join(' | ')
          + (f ? ' :: ' + JSON.stringify(f(P, G, st, ph)) : ''));
      }
    }
    return { lines, stats: st.stats, cut: st.cut && st.cut.kind, phT: st.phT, cpuErrs: [...P.CPU.errs] };
  }, { secs: +(pos[0] || 20), every: +(pos[1] || 1), expr: opt('expr', ''), seed: +opt('seed', 1), who: opt('who', 'pair') });
  console.log(out.lines.join('\n'));
  console.log(JSON.stringify(out.stats), out.cut, out.phT, out.cpuErrs);
  if (errs.length) console.log('PAGE MESSAGES:\n' + errs.slice(0, 10).join('\n'));
  await browser.close();
})().catch(e => { console.error(e); process.exit(2); });
