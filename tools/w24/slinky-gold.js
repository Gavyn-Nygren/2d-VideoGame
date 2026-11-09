#!/usr/bin/env node
// Slinky Stairs gold help test: scripted people who keep getting it wrong, with the computer at the other job, through
// the real keyboard path. Checks each kind of gold help shows up (and is announced) and that the flight still gets done.
//   far:     a flipper who always lets go at the far end of the meter (whoas) -> gold guide, then gold sticky steps
//   muddle:  a steerer who keeps pressing the wrong way (and sometimes nothing) -> gold compass
//   dawdle:  a flipper who waits 9 s on every step before flopping, tapping ◀ now and then (pillows squish) -> gold pillow
// Usage: node tools/w24/slinky-gold.js [--max=600]
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const maxT = +((process.argv.find(a => a.startsWith('--max=')) || '--max=600').slice(6));
const CASES = (process.env.ONLY ? [['dawdle', 0, 2]] : [['far', 0, 0], ['muddle', 1, 0], ['dawdle', 0, 2]]);
(async () => {
  const b = await chromium.launch(); const page = await b.newPage(); const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  if (process.env.ONLY) await page.evaluate(() => { window.__dbgOn = true; });
  let bad = 0;
  for (const [kind, human, room] of CASES) {
    const r = await page.evaluate(({ kind, human, room, maxT }) => {
      const P = window.__pipbo, G = P.G;
      window.__dbg = !!window.__dbgOn; P.CPU.cfg.players = 1; P.CPU.cfg.human = human; P.cpuApplyCfg(); G.manual = true;
      P.loadLevel(P.LEVELS.findIndex(l => l.name === 'Slinky Stairs'));
      for (let k = 0; k < room; k++) P.nextRoom();
      G.introT = 0; P.keys.clear();
      const K = [{ left: 'KeyA', right: 'KeyD', down: 'KeyS', act: 'KeyF' }, { left: 'ArrowLeft', right: 'ArrowRight', down: 'ArrowDown', act: 'Slash' }][human];
      const msgs = new Set(); let n = 0, t = 0, room0 = G.room; const m = {};
      while (n < maxT / P.DT && G.mode === 'play' && G.room === room0) {
        const st = G.mst, s = st.s, pl = st.plan, want = {};
        if (kind === 'far' && s.state === 'rest') { want.act = !s.hold || s.m < 0.97 || s.mv < 0; if (s.hold && s.mv < 0) want.act = false; }
        if (kind === 'dawdle') { m.t = (m.t || 0) + P.DT; if (m.t % 3 < 0.1) want.left = true; }
        if (kind === 'dawdle' && s.state === 'rest') { if (s.restT > 9 || (s.hold && s.restT > 0)) want.act = !(s.hold && pl.zone && Math.abs(s.m - pl.zone.mc) < 0.03); }
        if (kind === 'muddle') { m.t = (m.t || 0) + P.DT; const ph = m.t % 3; if (s.state === 'rest' && ph < 0.4 && pl.want) want[pl.want > 0 ? 'left' : 'right'] = true; if (s.state === 'teeter') want.down = true; }
        for (const k of ['left', 'right', 'down', 'act']) { if (want[k]) P.keys.add(K[k]); else P.keys.delete(K[k]); }
        P.pollInput(P.DT); P.step(P.DT); n++;
        if (G.mst.msg) msgs.add(G.mst.msg.text);
        if (window.__dbg && n % 1200 === 0) msgs.add(`t${n / 120} ${s.state} on=${s.on} rest=${s.restT.toFixed(1)} hold=${s.hold} sink=${s.sinkT.toFixed(1)} wait=${st.waiting} pl=${pl.wait}`);
      }
      const st = G.mst;
      return { mode: G.mode, room: G.room, room0, t: (n * P.DT).toFixed(0), whoas: st.stats.whoas, helps: st.stats.helps, guide: st.guide, compass: st.compass, msgs: [...msgs],
        gold: st.c.steps.filter(q => q.gold).map(q => q.kind + q.i) };
    }, { kind, human, room, maxT });
    const done = r.mode !== 'play' || r.room !== r.room0;
    const want = kind === 'far' ? r.msgs.some(x => /guide/.test(x)) && r.msgs.some(x => /sticky/.test(x)) : kind === 'muddle' ? r.msgs.some(x => /compass/.test(x)) : r.msgs.some(x => /pillow/i.test(x));
    if (!done || !want) bad++;
    console.log(`${done && want ? 'ok  ' : 'BAD '} ${kind.padEnd(7)} flight done=${done} in ${r.t}s whoas=${r.whoas} helps=${r.helps} gold steps=${r.gold.join(',')} msgs: ${r.msgs.join(' | ')}`);
  }
  if (errors.length) { console.log('ERRORS', errors.join('\n')); bad++; }
  await b.close(); process.exit(bad ? 1 : 0);
})();
