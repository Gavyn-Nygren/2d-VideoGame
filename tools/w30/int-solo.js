#!/usr/bin/env node
// Integration check for 30-1 in 1-PLAYER mode across real era changes: Bo is the computer, Pip is a "person" (the
// same brain writes Pip's keys, as a person would: nothing during cutscenes and cards, then --wait s to look around).
// Reports, per era, how long the computer partner stood "away" (the core brain's bst.away) while the Thief was NOT waiting.
//   node tools/w30/int-solo.js [--wait=2.5] [--human=0]
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const wait = +opt('wait', 2.5), human = +opt('human', 0), fix = args.includes('--fix');   // --fix: try the proposed fix (CPU.idle = 0 at every era start)
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('PAGEERROR ' + String(e)));
  await page.addInitScript(() => {
    try { localStorage.clear(); } catch (e) { /* */ }
    const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    const seeded = gen(99); Math.random = () => seeded();
    const real = window.requestAnimationFrame.bind(window);
    let q = [], now = 0, pumping = false; window.__fast = false; window.__done = false;
    const ch = new MessageChannel();
    const pump = () => { if (window.__done) return; const cbs = q; q = []; if (!now) now = performance.now(); now += 1000 / 60; for (const cb of cbs) cb(now); if (window.__sample) window.__sample(); if (q.length) ch.port2.postMessage(0); else pumping = false; };
    ch.port1.onmessage = pump;
    window.requestAnimationFrame = cb => { if (!window.__fast) return real(cb); q.push(cb); if (!pumping) { pumping = true; ch.port2.postMessage(0); } return 0; };
  });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.MODES && window.__pipbo.MODES.timethief);
  const res = await page.evaluate(async ({ wait, human, fix }) => {
    /* global G, cpuBrainFor, cpuInfo, cpuApply, CPU, TTH, LEVELS, loadLevel */
    const realRender = window.render; let rn = 0; window.render = dt => { if ((rn++ % 20) === 0) realRender(dt); };
    const realPoll = window.pollInput; let hst = {}, hmst = null, liveT = 0;
    window.pollInput = dt => {
      realPoll(dt);
      if (G.mode !== 'play' || !G.level || !G.mst || !G.mst.thief) return;
      if (hmst !== G.mst || hmst.phaseNo !== hno) { hmst = G.mst; hno = G.mst.phaseNo; hst = {}; liveT = 0; }
      const p = G.players[human], o = G.players[1 - human];
      let out = cpuBrainFor(G.level.def).think(hst, p, o, dt, cpuInfo(p)) || {};
      if (G.introT <= 0 && !G.mst.cut) liveT += dt;
      if (liveT < wait) out = {};                      // a person looks at the new scene first
      cpuApply(p, out);
    };
    let hno = -1;
    const log = []; let cur = null, lastNo = -1, lastSt = null;
    window.__sample = () => {
      const st = G.mst; if (!st || !st.thief) return;
      if (st !== lastSt || st.phaseNo !== lastNo) {
        lastSt = st; lastNo = st.phaseNo; if (fix) CPU.idle = [0, 0];
        cur = { era: st.phase, idleAtStart: +CPU.idle[human].toFixed(1), awayNotWaiting: 0, awayAtLive: null, bumps0: st.stats.bumps.join('+') + ' t' + st.stats.team, firstBubbles: CPU.bubbles.map(b => (b && b.t > 0 ? b.text : null)), hints: st.hints.map(h => h && h.text) };
        log.push(cur);
      }
      const away = !!CPU.st[1 - human].away;   // (the core brain threw the era brain's output away on its last step)
      if (G.introT <= TTH.introHold && !st.cut && G.mode === 'play') {
        if (cur.awayAtLive === null) { cur.awayAtLive = away; cur.idleAtLive = +CPU.idle[human].toFixed(1); cur.stIdleT = +st.idleT.toFixed(1); }
        if (away && !st.idle) cur.awayNotWaiting += 1 / 60;
      }
      cur.bumps1 = st.stats.bumps.join('+') + ' t' + st.stats.team; cur.phT = +st.phT.toFixed(1); cur.cut = st.cut ? st.cut.kind : null; cur.time = +G.time.toFixed(0);
      if (st.idle) cur.thiefWaited = (cur.thiefWaited || 0) + 1 / 60;
    };
    G.cpuOn = [human !== 0, human !== 1];
    loadLevel(LEVELS.findIndex(l => l.mode === 'timethief'));
    window.__fast = true;
    const t0 = performance.now();
    await new Promise(r => { const iv = setInterval(() => { if (G.mode === 'result' || performance.now() - t0 > 600000) { clearInterval(iv); r(); } }, 200); });
    window.__done = true;
    return { log, mode: G.mode, time: G.time, card: G.mode === 'result' ? document.getElementById('overlay').innerText.replace(/\n+/g, ' | ') : '' };
  }, { wait, human, fix });
  for (const e of res.log) console.log(JSON.stringify(e));
  console.log(res.mode, Math.round(res.time), res.card);
  console.log('errors', errors.length, errors.slice(0, 5));
  await browser.close();
})().catch(e => { console.error(e); process.exit(2); });
