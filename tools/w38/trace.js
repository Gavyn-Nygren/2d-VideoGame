#!/usr/bin/env node
// Prints a World 38 level's state every --every s while a computer pair (or --who=noisy/idle) plays it.
// node tools/w38/trace.js <mode> [--seed=1] [--max=300] [--every=2] [--expr="JS (st = G.mst, pl = plan)"] [--room=N]
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const mode = args.find(a => !a.startsWith('--')) || 'spyclimb';
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1100, height: 640 } });
  page.on('pageerror', e => console.log('PAGEERROR ' + e));
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('console: ' + m.text()); });
  await page.addInitScript(() => {
    const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    let r = gen(1); window.__seed = n => { r = gen((n >>> 0) || 1); }; Math.random = () => r();
  });
  await page.goto('file://' + path.resolve(__dirname, '../../index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const lines = await page.evaluate(async ({ mode, seed, maxT, every, expr, room }) => {
    const P = window.__pipbo, G = P.G, i = P.LEVELS.findIndex(l => l.mode === mode), out = [];
    window.__seed(seed * 7919);
    G.manual = true; G.cpuOn = [true, true]; P.CPU.skillOf = ['normal', 'normal'];
    P.loadLevel(i);
    for (let k = 0; k < room; k++) P.nextRoom();
    let n = 0, next = 0; const steps = Math.round(maxT / P.DT);
    while (n < steps && G.mode === 'play') {
      P.step(P.DT); n++;
      const t = n * P.DT;
      if (t >= next) {
        next += every;
        const st = G.mst; let pl = null; try { pl = P.MODES[mode].plan(st); } catch (e) {}
        let x; try { x = eval(expr); } catch (e) { x = 'ERR ' + e.message; }
        out.push(t.toFixed(1) + ' r' + G.room + ' ' + (typeof x === 'string' ? x : JSON.stringify(x)));
      }
      if (n % 2000 === 0) await new Promise(r => setTimeout(r, 0));
    }
    out.push('end mode=' + G.mode + ' t=' + G.time.toFixed(1) + ' room ' + G.room);
    return out;
  }, { mode, seed: +opt('seed', 1), maxT: +opt('max', 300), every: +opt('every', 2), expr: opt('expr', "st.state + ' ' + (st.ag||[]).map(a=>a.st[0]+Math.round(a.x)+','+Math.round(a.y)+' L'+a.leg+(a.clamp?'C':'')).join(' ') + ' | ' + (pl? pl.ag.map(p=>p.why+(p.wait?'W':'')+(p.to?'>'+Math.round(p.to.x)+','+Math.round(p.to.y):'')).join(' '):'') + ' spot ' + Math.round(st.spot||0)"), room: +opt('room', 0) });
  for (const l of lines) console.log(l);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
