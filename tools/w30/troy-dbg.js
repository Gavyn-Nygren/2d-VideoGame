#!/usr/bin/env node
// Debug trace for the 'troy' era of 30-1: the computer pair plays; prints the horse and the guards every S seconds.
//   node tools/w30/troy-dbg.js [--from=0] [--to=200] [--every=1] [--who=pair|kid|noisy] [--clumsy=0|1] [--seed=1]
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('PAGE:', m.text()); });
  page.on('pageerror', e => console.log('PAGE ERR:', String(e)));
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.MODES && window.__pipbo.MODES.timethief);
  const lines = await page.evaluate(({ from, to, every, who, clumsy }) => {
    const P = window.__pipbo, G = P.G, TT = P.MODES.timethief.test;
    G.manual = true; G.cpuOn = [true, true];
    const q = [];
    let last = null;
    P.CPU.filter = who === 'kid' ? (p, out) => { if (p.id !== clumsy) return out; q.push({ t: G.time + 0.5, out }); let o2 = null; while (q.length && q[0].t <= G.time) o2 = q.shift().out; last = o2 || last || {}; return Object.assign({}, last); } : null;
    TT.jump(2, { seed: 1 });
    const st = G.mst, out = [], n = Math.round(to / P.DT), ev = Math.round(every / P.DT);
    for (let i = 0; i < n && !st.cut; i++) {
      P.step(P.DT);
      if (i % ev === 0 && i * P.DT >= from) {
        const ph = st.ph, h = ph.h;
        const gs = ph.c.guards.filter(g => !g.deco && g.state !== 'idle' && g.state !== 'asleep').map(g => `${g.i}:${g.state}${g.lp || ''} t${g.t.toFixed(1)} sx${Math.round(g.sx - h.x)}`).join(' | ');
        const R = G.players[ph.roller].input, L = G.players[1 - ph.roller].input;
        out.push(`${(i * P.DT).toFixed(1)} k${ph.k} x${Math.round(h.x)} v${Math.round(h.v)} light${ph.light.toFixed(2)} peek${ph.peek.toFixed(1)} R[${R.left ? 'L' : ''}${R.right ? 'R' : ''}${R.down ? 'D' : ''}] L[${L.act ? 'A' : ''}] ${ph.lit ? 'LIT' : ''} ${ph.caught ? 'CAUGHT' : ''}${ph.claw ? 'CLAW ' + ph.claw.st + ' u' + ph.claw.u.toFixed(2) : ''}${ph.patrol ? 'PAT ' + ph.patrol.state + ' ' + Math.round(ph.patrol.x - h.x) : ''}${ph.bell ? 'BELL' : ''}${ph.swap ? 'SWAP' : ''}${ph.done ? 'DONE' : ''} ${gs}`);
      }
    }
    out.push('END phT ' + st.phT.toFixed(1) + ' cut ' + (st.cut && st.cut.kind) + ' stats ' + JSON.stringify(st.stats.troy) + ' bumps ' + st.stats.bumps + ' team ' + st.stats.team + ' help ' + JSON.stringify(st.stats.help));
    return out;
  }, { from: +opt('from', 0), to: +opt('to', 200), every: +opt('every', 1), who: opt('who', 'pair'), clumsy: +opt('clumsy', 0) });
  console.log(lines.join('\n'));
  await browser.close();
})().catch(e => { console.error(e); process.exit(2); });
