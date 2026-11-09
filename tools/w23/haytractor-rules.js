#!/usr/bin/env node
// Tractor & Trailer rule checks: sets up little situations on 23-1 with two people (no computer), drives the inputs
// directly (p.input / pendingAct, G.manual, step(DT)) and checks each rule: role swaps, soft and hard bumps, holding
// halves the shake, spills and the gold rope, gold hay, crows (steal, honk shoos, gold scarecrow), sheep block the road
// and leave on a honk, scooping a lying item, the barn count, the break when nobody presses anything, medal lines and
// the results card (saved to build/w23/haytractor-results.png).
// Usage: node tools/w23/haytractor-rules.js
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
(async () => {
  fs.mkdirSync('build/w23', { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const res = await page.evaluate(() => {
    const P = window.__pipbo, G = P.G, M = P.MODES.haytractor, S = M.S, out = [];
    const ok = (name, cond, extra) => out.push((cond ? 'PASS ' : 'FAIL ') + name + (extra != null ? '  ' + JSON.stringify(extra) : ''));
    P.CPU.cfg.players = 2; P.cpuApplyCfg();
    const clearIn = () => { for (const p of G.players) { for (const k of ['left', 'right', 'up', 'down', 'jump', 'act']) p.input[k] = false; p.pendingAct = false; p.pendingJump = false; } };
    const fresh = room => {
      G.manual = true; G.cpuOn = [false, false];
      P.loadLevel(P.LEVELS.findIndex(l => l.name === 'Tractor & Trailer'));
      for (let k = 0; k < room; k++) P.nextRoom();
      G.introT = 0; G.cpuOn = [false, false]; clearIn();
      return G.mst;
    };
    // a step with both people "around" (they pressed something lately)
    const step = (n = 1) => { for (let i = 0; i < n; i++) { const st = G.mst; st.inT = [G.time, G.time]; st.personT = G.time; P.step(P.DT); } };
    const bales = n => Array.from({ length: n }, () => ({ k: 'b', anim: 1 }));
    const tcOf = st => st.tr.s - S.trOff;
    const crossAt = (st, b, v) => { st.tr.s = b.x - 1 + S.trOff - v * P.DT * 0.5; st.tr.v = v; st.cat.air = false; st.cat.jy = 0; st.cat.stun = 0; step(2); };

    // roles swap each field: Pip (0) drives fields 1 and 3
    const drives = [0, 1, 2, 3].map(r => fresh(r).drive);
    ok('roles: drivers per field are 0,1,0,1', drives.join() === '0,1,0,1', drives);

    // a soft bump: under the safe speed nothing wobbles
    let st = fresh(0), b = st.c.bumps[0];
    st.stack = bales(6); st.wob = 0;
    crossAt(st, b, b.safe - 15);
    ok('soft bump: no wobble, no hard count', st.wob < 0.01 && st.stats.hard === 0, { wob: st.wob, hard: st.stats.hard });

    // a hard bump: wobble goes up and the catcher says "Whoa!"
    st = fresh(0); b = st.c.bumps[0]; st.stack = bales(6); st.wob = 0;
    crossAt(st, b, 200);
    const hardAdd = st.wob;
    ok('hard bump: wobble and hard count', hardAdd > 0.2 && st.stats.hard === 1, { wob: +hardAdd.toFixed(3) });
    ok('hard bump: catcher wobbles (stun)', st.cat.stun > 0 || st.cat.air);

    // holding the load halves the shake
    st = fresh(0); b = st.c.bumps[0]; st.stack = bales(6); st.wob = 0;
    G.players[st.catch].input.act = true;
    crossAt(st, b, 200);
    clearIn();
    ok('hold halves the shake', Math.abs(st.wob - hardAdd / 2) < 0.03, { held: +st.wob.toFixed(3), free: +hardAdd.toFixed(3) });

    // a spill: the top 2 + n/6 items fly off; three spills in a field bring the gold rope
    st = fresh(0); b = st.c.bumps[0];
    for (let k = 0; k < 3; k++) { st.stack = bales(12); st.wob = 0.99; crossAt(st, b, 220); if (k === 0) ok('spill: 12 → 8 on the wagon, wobble resets', st.stack.length === 8 && Math.abs(st.wob - S.wobAfter) < 0.02 && st.stats.spills === 1, { left: st.stack.length, wob: +st.wob.toFixed(2) }); }
    ok('gold rope after 3 spills', st.gold.rope && st.stats.helps === 1, { spills: st.stats.spills, helps: st.stats.helps });
    st.stack = bales(12); st.wob = 0.9; crossAt(st, b, 250);
    ok('gold rope: load can\'t spill', st.stack.length === 12 && st.wob <= 0.921, { wob: +st.wob.toFixed(3) });

    // gold hay after 6 misses in a row
    st = fresh(0); st.missRun = S.goldMiss - 1;
    st.items.push({ k: 'b', x: tcOf(st) - 400, y: 380, vx: 0, vy: 200, st: 'fly', rot: 0, vr: 0, t: 0, g: S.g });
    step(30);
    ok('gold hay after 6 misses', st.gold.hay && st.stats.helps === 1, { missRun: st.missRun });
    G.players[st.drive].input.right = true; step(Math.round(12 / P.DT)); clearIn();
    ok('gold hay: new tosses are gold', st.items.some(i => i.gold) || st.stack.some(q => q.gold), { items: st.items.length, stack: st.stack.length });
    // gold help needs both people trying: with one away for a while it doesn't switch on
    st = fresh(0); st.missRun = S.goldMiss - 1; st.inT = [G.time, G.time - 99];
    st.items.push({ k: 'b', x: tcOf(st) - 400, y: 380, vx: 0, vy: 200, st: 'fly', rot: 0, vr: 0, t: 0, g: S.g });
    for (let i = 0; i < 30; i++) { st.inT = [G.time, G.time - 99]; st.personT = G.time; P.step(P.DT); }
    ok('no gold help when one player is away', !st.gold.hay);

    // crows: a pecking crow takes the top item after 5 s; two steals bring the gold scarecrow; a honk shoos them
    st = fresh(1); st.stack = bales(5);
    st.birds.push({ st: 'peck', x: tcOf(st), y: 300, slot: 0, t: S.crowPeck - 0.01, vx: 0, flap: 0, carry: null });
    step(3);
    ok('crow steals one item', st.stack.length === 4 && st.stats.stolen === 1);
    st.birds.push({ st: 'peck', x: tcOf(st), y: 300, slot: 0, t: S.crowPeck - 0.01, vx: 0, flap: 0, carry: null });
    step(3);
    ok('gold scarecrow after 2 steals', st.gold.scare && st.stats.helps === 1);
    st = fresh(1); st.stack = bales(5);
    st.birds.push({ st: 'peck', x: tcOf(st), y: 300, slot: 0, t: 1, vx: 0, flap: 0, carry: null });
    G.players[st.drive].pendingAct = true; step(2);
    ok('honk shoos the crow', st.birds[0] && st.birds[0].st === 'off' && st.stats.shooed === 1 && st.stack.length === 5);

    // sheep: they block the road; a honk sends them off; waiting 6 s works too
    st = fresh(0); let fl = st.c.flocks[0];
    st.tr.s = fl.x - 100 - 500; fl.st = 'road'; fl.walk = 1;
    G.players[st.drive].input.right = true; step(Math.round(4 / P.DT));
    ok('sheep stop the tractor', st.tr.s + 100 <= fl.x - 64 + 1 && st.tr.v <= 1, { gap: Math.round(fl.x - st.tr.s - 100), v: st.tr.v | 0 });
    clearIn(); G.players[st.drive].pendingAct = true; step(1); G.players[st.drive].input.right = true; step(Math.round(3 / P.DT)); clearIn();
    ok('honk: sheep leave, tractor passes', (fl.st === 'leave' || fl.st === 'gone') && st.tr.s + 100 > fl.x, { st: fl.st });
    st = fresh(0); fl = st.c.flocks[0]; st.tr.s = fl.x - 100 - 200; fl.st = 'road'; fl.walk = 1;
    G.players[st.drive].input.right = true; step(Math.round((S.sheepWait + 1.5) / P.DT)); clearIn();
    ok('sheep leave by themselves after waiting', fl.st === 'leave' || fl.st === 'gone', { st: fl.st, wait: +fl.wait.toFixed(1) });

    // scooping: the wagon stopped and the catcher over a lying item picks it up
    st = fresh(0); st.tr.v = 0;
    st.items.push({ k: 'b', x: tcOf(st) + st.cat.u, y: 300, vx: 0, vy: 0, st: 'lie', rot: 0, vr: 0, t: 0, g: S.g, missed: true, lieT: S.lieT });
    step(2);
    ok('scoop a lying bale', st.stats.scooped === 1 && st.stack.length === 1);
    // too fast: no scoop
    st = fresh(0); st.tr.s += 400; st.tr.v = 200;
    st.items.push({ k: 'b', x: tcOf(st) + st.cat.u + 3, y: 300, vx: 0, vy: 0, st: 'lie', rot: 0, vr: 0, t: 0, g: S.g, missed: true, lieT: S.lieT });
    G.players[st.drive].input.right = true; step(1); clearIn();
    ok('no scoop at full speed', st.stats.scooped === 0);
    // a lying item fades after a while
    st = fresh(0); st.items.push({ k: 'b', x: tcOf(st) - 300, y: 300, vx: 0, vy: 0, st: 'lie', rot: 0, vr: 0, t: 0, g: S.g, missed: true, lieT: S.lieT });
    step(Math.round((S.lieT + 0.5) / P.DT));
    ok('a lying item is gone after ' + S.lieT + ' s', !st.items.some(i => i.st === 'lie'));

    // the barn: the load is counted in and the jobs swap
    st = fresh(0); st.stack = bales(7); const d0 = st.delivered;
    st.tr.s = st.c.barn.x - 260; st.tr.v = 100;
    G.players[st.drive].input.right = true; step(30); clearIn();
    ok('barn: state barn', st.state === 'barn');
    let n = 0; while (G.room === 0 && n++ < 10 / P.DT) step(1);
    ok('barn: 7 delivered, next field, Bo drives', G.mst.delivered === d0 + 7 && G.room === 1 && G.mst.drive === 1, { delivered: G.mst.delivered, room: G.room, t: +(n * P.DT).toFixed(2) });

    // nobody presses anything for 15 s: "Taking a break", the clock stops
    st = fresh(0); st.personT = G.time; st.inT = [G.time, G.time];
    for (let i = 0; i < Math.round(16 / P.DT); i++) P.step(P.DT);
    const t1 = G.time; for (let i = 0; i < 240; i++) P.step(P.DT);
    ok('idle: waiting, clock stopped', st.waiting && Math.abs(G.time - t1) < 0.01, { waiting: st.waiting });
    G.players[0].input.right = true; P.step(P.DT); P.step(P.DT); clearIn();
    ok('idle: a press wakes it up', !st.waiting);

    // medals
    const md = [[200, 0.8], [226, 0.8], [200, 0.69], [390, 0.5], [391, 0.9], [300, 0.49]].map(([t, f]) => M.medal(t, f));
    ok('medal lines', md.join() === 'Gold,Silver,Silver,Silver,Bronze,Bronze', md);

    // the last field to the results card
    st = fresh(3); st.stack = bales(9); st.tr.s = st.c.barn.x - 260; st.tr.v = 100;
    G.players[st.drive].input.right = true; step(30); clearIn();
    n = 0; while (G.mode === 'play' && n++ < 15 / P.DT) step(1);
    const s = G.lmode.stats();
    ok('last field: level cleared', G.mode !== 'play', { mode: G.mode, delivered: G.mst.delivered });
    return { out, stats: s };
  });
  console.log(res.out.join('\n'));
  console.log('stats(): ' + JSON.stringify(res.stats));
  await page.waitForTimeout(2500);
  await page.screenshot({ path: 'build/w23/haytractor-results.png' });
  console.log('results card -> build/w23/haytractor-results.png');
  if (errors.length) console.log('ERRORS:\n' + [...new Set(errors)].join('\n'));
  const fails = res.out.filter(l => l.startsWith('FAIL')).length;
  console.log(fails ? fails + ' FAILED' : 'all passed');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
