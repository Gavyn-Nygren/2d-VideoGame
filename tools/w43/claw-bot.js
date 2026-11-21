#!/usr/bin/env node
// 43-3 Claw Machine Rescue: the computer plays (no drawing, so it runs fast) and prints where things are.
//   node tools/w43/claw-bot.js [--who=pair|pip|bo|idle] [--max=400] [--trace=5] [--seed=1]
//   --who=pair  the computer plays both jobs (default); pip: only Pip (Bo stands still); bo: only Bo (Pip still)
//   --trace=S   a line every S simulated seconds: Bo, the claw, what it holds, the next obstacle, capsules freed
// Prints how it ended (cleared or not, the time, the medal) and any page or brain errors.
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e.stack || e)));
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const r = await page.evaluate(async ({ who, max, trace, seed }) => {
    let sd = +seed || 1; Math.random = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
    const P = window.__pipbo, G = P.G;
    const i = P.LEVELS.findIndex(l => l.mode === 'arcadeclaw');
    G.manual = true; P.K3D.noRender = true;
    P.CPU.skillOf = [null, null];
    G.cpuOn = [who === 'pair' || who === 'pip', who === 'pair' || who === 'bo'];
    P.loadLevel(i);
    G.introT = 0;
    const lines = [], every = Math.round(trace / P.DT);
    const st0 = G.mst; st0.phase = 'play'; st0.phaseT = 0;
    let n = 0;
    const steps = Math.round(max / P.DT);
    while (n < steps && G.mode === 'play') {
      for (let k = 0; k < 600 && n < steps && G.mode === 'play'; k++, n++) {
        for (let id = 0; id < 2; id++) if (!G.cpuOn[id]) for (const key in G.players[id].input) G.players[id].input[key] = false;
        P.step(P.DT);
        const st = G.mst;
        if (every && n % every === 0 && st) {
          const b = G.players[1].b3, C = st.claw, ob = ARCADECLAW.nextOb(st);
          lines.push(`${(n * P.DT).toFixed(0).padStart(4)}s Bo ${b.x.toFixed(1)},${b.y.toFixed(1)},${b.z.toFixed(1)}${st.hang ? ' hang:' + st.hang : ''}${st.sink > 0 ? ' sink' + st.sink.toFixed(1) : ''}  claw u${C.u.toFixed(1)} s${C.s.toFixed(1)} ${C.mode}${C.toy ? ' +' + C.toy : ''}  lit ${st.lit}  next ${ob ? ob.id : '-'}  freed ${st.freed}  setbacks ${st.setbacks}  ${P.CPU.bubbles.map(q => (q && q.t > 0 ? '"' + q.text + '"' : '')).join(' ')}`);
        }
      }
      await new Promise(r => setTimeout(r, 0));
    }
    const st = G.mst, res = G.results && G.results[i];
    return { mode: G.mode, t: +(n * P.DT).toFixed(1), freed: st && st.freed, setbacks: st && st.setbacks, restocks: st && st.restocks, next: st && ARCADECLAW.nextOb(st) ? ARCADECLAW.nextOb(st).id : null, medal: res && res.medal ? ['none', 'Bronze', 'Silver', 'Gold'][res.medal.tier] + ' ' + JSON.stringify(res.medal.vals) : null, cpuErrs: [...P.CPU.errs], lines };
  }, { who: opt('who', 'pair'), max: +opt('max', 400), trace: +opt('trace', 5), seed: opt('seed', 1) });
  console.log(r.lines.join('\n'));
  console.log(`${r.mode === 'play' ? 'NOT CLEARED' : 'ended: ' + r.mode} at ${r.t}s, freed ${r.freed}, setbacks ${r.setbacks}, restocks ${r.restocks}, next ${r.next}${r.medal ? ', medal ' + r.medal : ''}`);
  if (r.cpuErrs.length) console.log('CPU errors: ' + r.cpuErrs.join(' | '));
  if (errs.length) console.log('page errors:\n' + errs.slice(0, 8).join('\n'));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
