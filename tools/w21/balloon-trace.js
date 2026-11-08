#!/usr/bin/env node
// 21-1 Hot Air Balloon Climb: plays with the computer at the controls and prints the balloon and the plan now and then.
// Usage: node tools/w21/balloon-trace.js [--who=pair|noisy|idle] [--clumsy=0|1] [--seed=1] [--every=2] [--max=400] [--room=0]
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const noStop = +opt('nostop', 0), who = opt('who', 'pair'), seed = +opt('seed', 1), every = +opt('every', 2), maxT = +opt('max', 400), room = +opt('room', 0), clumsy = +opt('clumsy', 0);
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.addInitScript(s => {
    const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    Math.random = gen(s * 7919);
  }, seed);
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const lines = await page.evaluate(({ who, every, maxT, room, clumsy, noStop }) => {
    const P = window.__pipbo, G = P.G, out = [];
    G.manual = true;
    if (noStop) P.CPU.idleStop = 1e9;
    G.cpuOn = who === 'idle' ? [false, true] : [true, true];
    const nz = { pause: 0, next: 3 + Math.random() * 6, wander: 0, wdir: 0, wnext: 6 + Math.random() * 8 };
    P.CPU.filter = who !== 'noisy' ? null : (p, o, dt) => {
      if (p.id !== clumsy) return o;
      if (nz.pause > 0) { nz.pause -= dt; return {}; }
      nz.next -= dt; if (nz.next <= 0) { nz.pause = 1 + Math.random() * 3; nz.next = 4 + Math.random() * 8; }
      nz.wnext -= dt; if (nz.wnext <= 0) { nz.wander = 0.4 + Math.random(); nz.wdir = Math.random() < 0.5 ? -1 : 1; nz.wnext = 6 + Math.random() * 10; }
      if (nz.wander > 0) { nz.wander -= dt; return { left: nz.wdir < 0, right: nz.wdir > 0 }; }
      if (Math.random() < 0.15 * dt) o.jump = true;
      if (Math.random() < 0.1 * dt) o.act = true;
      return o;
    };
    P.loadLevel(P.LEVELS.findIndex(l => l.name === 'Hot Air Balloon Climb'));
    for (let k = 0; k < room; k++) P.nextRoom();
    let n = 0, last = -1;
    const steps = Math.round(maxT / P.DT), ev = Math.round(every / P.DT);
    while (n < steps && G.mode === 'play') {
      if (who === 'idle') for (const k in G.players[0].input) G.players[0].input[k] = false;
      P.step(P.DT); n++;
      const st = G.mst, b = st.b, pl = st.plan || {};
      if (n % ev === 0 || G.room !== last) {
        last = G.room;
        out.push(`${(n * P.DT).toFixed(1)}s r${G.room} ${st.state} x${b.x.toFixed(0)} h${b.h.toFixed(0)} vx${b.vx.toFixed(0)} vy${b.vy.toFixed(0)} heat${b.heat.toFixed(2)} sp${b.sput > 0 ? 1 : 0} | tx${pl.tx} vyW${(pl.vy || 0).toFixed(0)} ${pl.steer}/${pl.burn}/${pl.why} cam${st.cam.toFixed(0)} | z${st.stats.zaps} b${st.stats.birds} k${st.stats.bonks} tow${st.stats.tows} bo${st.stats.bounces} s${st.stats.stars} ${P.CPU.bubbles.map(q => q && q.t > 0 ? '"' + q.text + '"' : '').join(' ')}`);
      }
    }
    out.push('END mode ' + G.mode + ' t ' + G.time.toFixed(1) + ' ' + JSON.stringify(G.mst.stats));
    return out;
  }, { who, every, maxT, room, clumsy, noStop });
  console.log(lines.join('\n'));
  if (errors.length) console.log('ERRORS:\n' + errors.join('\n'));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
