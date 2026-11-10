#!/usr/bin/env node
// 29-2 Shadow Sneak edge cases: restart (loadLevel) and "next room" in the middle of every state (creeping, chase,
// carried, dizzy, gate open, end of stretch), the level loaded twice, pause during a chase, a guard parked in an arch.
// After each, a computer pair must still clear the rest, with no NaN and no page errors.
// Usage: node tools/w29/shadowsneak-edge.js
'use strict';
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '../../index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const res = await page.evaluate(() => {
    const P = window.__pipbo, G = P.G, i = P.LEVELS.findIndex(l => l.mode === 'shadowsneak'), out = [];
    G.manual = true; G.cpuOn = [true, true];
    const run = (n, f) => { for (let k = 0; k < n && G.mode === 'play'; k++) { if (f) f(); P.step(P.DT); } };
    const rush = () => { P.CPU.filter = (p, o) => (p.id === G.mst.sneak ? { right: true, act: true } : o); };
    const calm = () => { P.CPU.filter = null; };
    const finite = () => { const st = G.mst; return [st.sn.x, st.sn.y, st.th.x, st.th.mark, st.cam.x].concat(st.P.guards.map(g => g.x)).every(Number.isFinite); };
    const finish = tag => {
      calm(); let n = 0;
      while (G.mode === 'play' && n < 120 * 700) { P.step(P.DT); n++; if (!finite()) { out.push(tag + ': NaN'); return; } }
      out.push(tag + ': ' + (G.mode === 'play' ? 'NOT cleared (room ' + (G.room + 1) + ' post ' + (G.mst.P.k + 1) + ')' : 'cleared ' + Math.round(G.time) + 's') + ' spotted ' + G.mst.stats.spotted + ' caught ' + G.mst.stats.caught);
    };
    const wait = (pred, max) => { let n = 0; while (!pred() && n < max * 120 && G.mode === 'play') { P.step(P.DT); n++; } return pred(); };
    const fresh = () => { P.loadLevel(i); G.introT = 0; };
    // 1. restart in the middle of a chase
    fresh(); rush(); const sp = wait(() => G.mst.chase, 20); out.push('chase started: ' + sp);
    fresh(); out.push('restart mid-chase: chase ' + !!G.mst.chase + ' spotted ' + G.mst.stats.spotted + ' room ' + G.room);
    // 2. next room while carried
    rush(); wait(() => G.mst.sn.state === 'caught', 30); out.push('carried: ' + G.mst.sn.state);
    calm(); P.nextRoom(); G.introT = 0; out.push('next room while carried: sn ' + G.mst.sn.state + ' guards ' + G.mst.P.guards.map(g => g.state).join(','));
    finish('after next-room-while-carried');
    // 3. next room while dizzy (just put down)
    fresh(); rush(); wait(() => G.mst.sn.state === 'dizzy', 40); out.push('dizzy: ' + G.mst.sn.state);
    calm(); P.nextRoom(); G.introT = 0; finish('after next-room-while-dizzy');
    // 4. next room with the gate open, and during the end walk
    fresh(); wait(() => G.mst.P.open, 60); P.nextRoom(); G.introT = 0; out.push('next room with gate open: P ' + G.mst.P.k + ' open ' + G.mst.P.open);
    wait(() => G.mst.state === 'end', 120); out.push('end state: ' + G.mst.state); P.nextRoom(); G.introT = 0; out.push('next room during end walk: state ' + G.mst.state + ' room ' + G.room);
    finish('after next-room-during-end');
    // 5. the level loaded twice in a row, then a pause during a chase
    fresh(); fresh(); rush(); wait(() => G.mst.chase, 20);
    P.pause(); const t0 = G.time, x0 = G.mst.sn.x; out.push('paused: mode ' + G.mode);
    G.mode = 'play'; if (P.resume) P.resume();
    out.push('time moved while paused: ' + (G.time !== t0) + ' sn moved: ' + (G.mst.sn.x !== x0));
    finish('after load-twice + pause in chase');
    // 6. a long dash-everywhere person for 60 s then a calm finish (guards must never be stuck on alert)
    fresh(); let n = 0; rush(); run(120 * 60);
    const stuck = G.mst.c.posts.some(q => q !== G.mst.P && q.guards.some(g => g.state === 'alert' || g.state === 'carry'));
    out.push('alert guards left behind in other posts: ' + stuck);
    finish('after 60 s of dashing');
    return out;
  });
  console.log(res.join('\n'));
  console.log(errs.length ? 'ERRORS:\n' + errs.slice(0, 8).join('\n') : 'no page errors');
  await browser.close();
})();
