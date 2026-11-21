#!/usr/bin/env node
// 43-4 Laser Tag Arena: a quick smoke run with drawing off. Both sides mash random buttons (or the computer plays both
// with --cpu); prints the phase, the score and any page errors.  node tools/w43/laser-smoke.js [--secs=200] [--cpu]
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage(); const errs = [];
  pg.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
  pg.on('pageerror', e => errs.push(String(e.stack || e)));
  await pg.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await pg.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const r = await pg.evaluate(({ secs, cpu }) => {
    const P = window.__pipbo, G = P.G; const i = P.LEVELS.findIndex(l => l.mode === 'arcadelaser');
    G.manual = true; P.K3D.noRender = true; G.cpuOn = cpu ? [true, true] : [false, false];
    P.loadLevel(i); G.introT = 0;
    const st = G.mst; let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const hold = [{}, {}], log = [];
    for (let n = 0; n < secs * 120 && G.mode === 'play'; n++) {
      if (!cpu) for (const p of G.players) {
        const h = hold[p.id];
        if (!h.t || h.t <= 0) { h.t = 0.1 + rnd() * 0.6; h.left = rnd() < 0.3; h.right = !h.left && rnd() < 0.4; h.up = rnd() < 0.3; h.down = !h.up && rnd() < 0.3; h.act = rnd() < 0.35; h.jump = rnd() < 0.15; }
        h.t -= P.DT;
        const was = p.input || {};
        p.input = { left: h.left, right: h.right, up: h.up, down: h.down, act: h.act, jump: h.jump };
        if (h.jump && !was.jump) p.pendingJump = true;
        if (h.act && !was.act) p.pendingAct = true;
      }
      P.step(P.DT);
      if (n % 1200 === 0) log.push(st.phase + ' r' + st.round + ' ' + st.heroes.map(h => h.tags).join('-') + ' w' + st.wins.join('-'));
    }
    return { mode: G.mode, phase: st.phase, t: st.t.toFixed(1), wins: st.wins, stats: st.heroes.map(h => h.stat), log: log.join(' | ') };
  }, { secs: +opt('secs', 200), cpu: args.includes('--cpu') });
  console.log(JSON.stringify(r, null, 1)); if (errs.length) console.log('errors:\n' + errs.slice(0, 10).join('\n'));
  await b.close();
})();
