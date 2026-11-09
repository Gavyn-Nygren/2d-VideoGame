#!/usr/bin/env node
// World 27 quick sim: plays one level with the computer at the controls and prints the results card lines.
// Usage: node tools/w27/sim.js <code e.g. 27-1> [--who=pair|noisy|idle|lone] [--seeds=1,2] [--max=600] [--skills=normal,normal] [--trace=10]
//   lone: the computer plays Bo, Pip presses nothing (a team level must not clear)
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const code = args.find(a => !a.startsWith('--')) || '27-1';
const who = opt('who', 'pair'), seeds = opt('seeds', '1').split(',').map(Number), maxT = +opt('max', 600), skills = opt('skills', 'normal,normal').split(','), trace = +opt('trace', 0);
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  await page.addInitScript(() => { const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; let r = gen(1); window.__seed = n => { r = gen(n || 1); }; Math.random = () => r(); });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  for (const seed of seeds) {
    const r = await page.evaluate(async ({ code, who, seed, maxT, skills, trace }) => {
      const P = window.__pipbo, G = P.G;
      window.__seed(seed * 7919);
      const i = P.LEVELS.findIndex((l, k) => P.levelCode(k) === code);
      G.manual = true; P.CPU.skillOf = skills; P.CPU.errs.clear();
      G.cpuOn = who === 'pair' || who === 'noisy' ? [true, true] : [false, true];
      const nz = { pause: 0, next: 4, wander: 0, wdir: 0, wnext: 8 };
      P.CPU.filter = who !== 'noisy' ? null : (p, out, dt) => {
        if (p.id !== 0) return out;
        if (nz.pause > 0) { nz.pause -= dt; return {}; }
        nz.next -= dt; if (nz.next <= 0) { nz.pause = 1 + Math.random() * 3; nz.next = 4 + Math.random() * 8; }
        nz.wnext -= dt; if (nz.wnext <= 0) { nz.wander = 0.4 + Math.random(); nz.wdir = Math.random() < 0.5 ? -1 : 1; nz.wnext = 6 + Math.random() * 10; }
        if (nz.wander > 0) { nz.wander -= dt; return { left: nz.wdir < 0, right: nz.wdir > 0 }; }
        if (Math.random() < 0.15 * dt) out.jump = true;
        if (Math.random() < 0.1 * dt) out.act = true;
        return out;
      };
      delete G.results[i];
      P.loadLevel(i);
      const steps = Math.round(maxT / P.DT); let n = 0; const lines = [];
      if (code === '27-3') window.__w27trace = st => 'mag ' + Math.round(st.mag.x) + ',' + Math.round(st.mag.y) + ' carry ' + st.carry + ' riding ' + st.riding + ' R ' + Math.round(G.players[st.rider].x) + ',' + Math.round(G.players[st.rider].y) + ' stacks ' + st.stacks.join('') + ' b ' + st.stats.boings + ' walked ' + st.walked;
      if (code === '27-4') window.__w27trace = st => st.phase + ' t ' + (st.t || 0).toFixed(1) + ' rt ' + (st.rumbleT || 0).toFixed(1) + ' parts ' + st.robots.map(r => Object.values(r.parts).join('/') + (r.carry ? '+' + r.carry : '')).join(' | ') + (st.bots ? ' bots ' + st.bots.map(b => Math.round(b.x) + (b.charging ? 'c' : '') + (b.brace ? 'b' : '')).join(',') : '') + ' P ' + G.players.map(p => Math.round(p.x) + ',' + Math.round(p.y)).join(' ');
      if (code === '27-2') window.__w27trace = st => 'cam ' + Math.round(st.camX) + ' run ' + st.running + ' jam ' + (st.jam ? st.jam.kind + st.jam.g.i : '-') + ' R ' + Math.round(G.players[st.runner].x + st.camX) + ',' + Math.round(G.players[st.runner].y) + ' F ' + Math.round(G.players[st.fixer].x + st.camX) + ',' + Math.round(G.players[st.fixer].y) + ' b ' + st.stats.boings + ' sq ' + st.stats.squish + ' fixes ' + st.stats.fixes + ' fb ' + st.stats.fixerBoings;
      while (n < steps && G.mode === 'play') {
        for (let k = 0; k < 1200 && n < steps && G.mode === 'play'; k++, n++) {
          if (who === 'lone') for (const key in G.players[0].input) G.players[0].input[key] = false;
          P.step(P.DT);
          if (trace && n % Math.round(trace / P.DT) === 0) lines.push((n * P.DT).toFixed(0) + 's room ' + G.room + ' ' + (window.__w27trace ? window.__w27trace(G.mst) : ''));
        }
        await new Promise(r => setTimeout(r, 0));
      }
      const res = G.results[i];
      return { mode: G.mode, simT: Math.round(n * P.DT), room: G.room, res: res && { time: Math.round(res.time), winner: res.winner, rounds: res.rounds, stats: res.stats }, lines, cpuErrs: [...P.CPU.errs] };
    }, { code, who, seed, maxT, skills, trace });
    console.log(code, who, 's' + seed, r.mode, 'sim', r.simT + 's', 'room', r.room, JSON.stringify(r.res), r.cpuErrs.join(' '));
    for (const l of r.lines) console.log('   ', l);
  }
  if (errors.length) console.log('ERRORS:', [...new Set(errors)].slice(0, 5).join('\n'));
  await browser.close();
})();
