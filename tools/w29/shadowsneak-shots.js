#!/usr/bin/env node
// Shadow Sneak screenshots: node tools/w29/shadowsneak-shots.js <t1,t2,...> [--room=0] [--solo=0|1] [--rush=T] [--w=1100 --h=640] [--tag=x]
//   --solo=N   1-player mode with a pretend person as player N (their keys are pressed by the brain's own rules, so the
//              level plays on and the picture shows what a person sees: their prompts, the computer's speech bubbles)
//   --rush=T   from T seconds the sneaker dashes right for 1.6 s (to get spotted: the chase, the gong, a catch)
//   --tp=T     at T the sneaker is put down right in front of a guard (to see a catch)
//   --pause=T  press pause at T (the pause card);  times past the end show the results card
// Writes build/w29/ss-<tag>-<t>.png. Times are simulated seconds after the room starts.
'use strict';
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const args = process.argv.slice(2), times = (args.find(a => !a.startsWith('--')) || '3,10').split(',').map(Number);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(a.indexOf('=') + 1) : d; };
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: +opt('w', 1100), height: +opt('h', 640) } });
  const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '../../index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const out = path.resolve(__dirname, '../../build/w29'); fs.mkdirSync(out, { recursive: true });
  const solo = +opt('solo', -1), rush = +opt('rush', -1), room = +opt('room', 0), tag = opt('tag', (solo >= 0 ? 'solo' + solo : 'pair') + '-r' + room);
  await page.evaluate(({ solo, rush, room, tp }) => {
    const P = window.__pipbo, G = P.G, i = P.LEVELS.findIndex(l => l.mode === 'shadowsneak');
    G.manual = true; G.cpuOn = solo < 0 ? [true, true] : [solo !== 0, solo !== 1];
    P.loadLevel(i);
    for (let r = 0; r < room; r++) { G.introT = 0; P.nextRoom(); }
    const t0 = G.time, bs = {}, prev = {};
    const rushing = id => rush >= 0 && id === G.mst.sneak && G.time - t0 >= rush && G.time - t0 < rush + 1.6;
    const tps = tp.split(',').filter(Boolean).map(Number), frozen = id => id === G.mst.sneak && tps.some(q => G.time - t0 >= q && G.time - t0 < q + 2.5);
    P.CPU.filter = (p, o) => (frozen(p.id) ? {} : rushing(p.id) ? { right: true, act: true } : o);
    let tpN = 0;
    window.__ssStep = n => {
      for (let k = 0; k < n && G.mode === 'play'; k++) {
        if (tpN < tps.length && G.time - t0 >= tps[tpN]) { tpN++; const st = G.mst, g = st.P.guards.find(q => q.state !== 'sleep'); if (g) { st.sn.x = g.x + g.face * 60; st.sn.hidden = false; } }
        if (solo >= 0) {
          const p = G.players[solo], brain = P.CPU.brains.shadowsneak;
          let o = brain.think(bs, p, G.players[1 - solo], P.DT, { mst: G.mst, intro: G.introT > 0, partnerCpu: true, time: G.time }) || {};
          if (rushing(solo)) o = { right: true, act: true };
          if (frozen(solo)) o = {};
          const inp = p.input; for (const key in inp) inp[key] = false;
          inp.left = !!o.left; inp.right = !!o.right; inp.down = !!o.down;
          for (const b of ['jump', 'act']) {
            let on = o[b] === 'tap' ? !prev[b] : !!o[b];
            if (on && !prev[b]) { if (b === 'jump') p.pendingJump = true; else p.pendingAct = true; }
            prev[b] = on; inp[b] = on;
          }
        }
        P.step(P.DT);
      }
    };
  }, { solo, rush, room, tp: opt('tp', '') });
  let t = 0;
  const pauseAt = +opt('pause', -1);
  for (const tt of times) {
    await page.evaluate(n => window.__ssStep(n), Math.round((tt - t) * 120));
    t = tt;
    if (pauseAt >= 0 && tt >= pauseAt) await page.evaluate(() => window.__pipbo.pause && window.__pipbo.pause());
    await page.waitForTimeout(120);
    await page.screenshot({ path: path.join(out, 'ss-' + tag + '-' + tt + '.png') });
  }
  console.log('errors:', errs.slice(0, 5), await page.evaluate(() => JSON.stringify(window.__pipbo.G.mst.stats)));
  await browser.close();
})();
