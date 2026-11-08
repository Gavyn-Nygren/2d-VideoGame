#!/usr/bin/env node
// Cloud Bridge Builder debug trace: two computers (or --who=noisy/idle like cpu-test) play 21-3 and every --every s it
// prints world positions, grounds, jobs, flags, clouds and puffs. Usage: node tools/w21/cloudbridge-trace.js [--max=120]
// [--every=1] [--seed=1] [--room=0] [--from=0]
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const maxT = +opt('max', 120), every = +opt('every', 1), seed = +opt('seed', 1), room = +opt('room', 0), from = +opt('from', 0), clumsy = +opt('clumsy', -1);
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('pageerror', e => console.log('PAGEERR', String(e)));
  page.on('console', m => { if (m.type() === 'error') console.log('CONSOLE', m.text()); });
  await page.addInitScript(s => { const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; Math.random = gen(s); }, seed * 7919);
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const lines = await page.evaluate(({ maxT, every, room, from, clumsy }) => {
    const P = window.__pipbo, G = P.G, out = [];
    G.manual = true; G.cpuOn = [true, true];
    if (clumsy >= 0) { // the same clumsy partner as cpu-test --who=noisy
      const nz = { pause: 0, next: 3 + Math.random() * 6, wander: 0, wdir: 0, wnext: 6 + Math.random() * 8 };
      P.CPU.filter = (p, o, dt) => {
        if (p.id !== clumsy) return o;
        if (nz.pause > 0) { nz.pause -= dt; return {}; }
        nz.next -= dt;
        if (nz.next <= 0) { nz.pause = 1 + Math.random() * 3; nz.next = 4 + Math.random() * 8; }
        nz.wnext -= dt;
        if (nz.wnext <= 0) { nz.wander = 0.4 + Math.random() * 1; nz.wdir = Math.random() < 0.5 ? -1 : 1; nz.wnext = 6 + Math.random() * 10; }
        if (nz.wander > 0) { nz.wander -= dt; return { left: nz.wdir < 0, right: nz.wdir > 0 }; }
        if (Math.random() < 0.15 * dt) o.jump = true;
        if (Math.random() < 0.1 * dt) o.act = true;
        return o;
      };
    }
    P.loadLevel(P.LEVELS.findIndex(l => l.name === 'Cloud Bridge Builder'));
    for (let k = 0; k < room; k++) P.nextRoom();
    G.introT = 0;
    const n = Math.round(maxT / P.DT), ev = Math.round(every / P.DT);
    for (let i = 0; i < n && G.mode === 'play'; i++) {
      P.step(P.DT);
      if (i % ev || i * P.DT < from) continue;
      const st = G.mst, M = P.MODES.cloudbridge;
      const pl = G.players.map(p => { const Q = st.pl[p.id]; const g = Q.ground; return `${p.id ? 'Bo' : 'Pip'}${p.id === st.caller ? '(C)' : '(B)'} x${Math.round(p.x + p.w / 2 + st.camX)} f${Math.round(p.y + p.h)}${p.grounded ? 'g' : 'a'} on:${g ? (g.kind ? g.kind + g.i : 'cl' + Math.round(g.life * 10) / 10) : '-'} best${Q.best}${Q.boing ? ' BOING' : ''} job:${(M.job(st, p.id) || {}).k} in:${['left', 'right', 'jump', 'down', 'act'].filter(k => p.input[k]).join('')}`; });
      const gap = M.curGap(st);
      out.push(`${(i * P.DT).toFixed(1)} r${G.room} gap${gap ? gap.i : '-'} ${pl.join(' | ')} marks:${st.marks.map(m => Math.round(m.x0) + '@' + m.top + (m.puffing ? 'p' : '')).join(',')} clouds:${st.clouds.map(c => Math.round(c.x0) + '@' + c.top + ':' + c.life.toFixed(1)).join(',')} puffs:${st.puffs.length} boings:${st.stats.boings}`);
    }
    out.push('END mode ' + G.mode + ' room ' + G.room + ' t ' + G.time.toFixed(1) + ' stars ' + JSON.stringify((G.mst.stars || []).map(s => [Math.round(s.x), Math.round(s.y), s.got])));
    return out;
  }, { maxT, every, room, from, clumsy });
  console.log(lines.join('\n'));
  await browser.close();
})();
