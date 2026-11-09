#!/usr/bin/env node
// Tractor & Trailer review checks (second pass): things a family does mid-level that the rule checks don't cover.
// - R mid-field (field 3 with a load and gold help on): the level starts over clean at field 1 (G.mst is fresh).
// - Esc pauses with the real frame loop (the clock and the tractor stop), Esc again resumes.
// - Switching to 1 player mid-field: the computer takes Bo's seat (the catcher in field 1) and plays on; its hints go
//   quiet; switching back to 2 players hands the seat back.
// - Leaving for another level and coming back: no state leaks (fresh G.mst, the touch buttons' words reset).
// - 1 player, the person drives and stops pressing: the computer catcher can't move the tractor, the break shows.
// - 1 player, the person catches and stops pressing mid-field: the computer driver stops at the break (the clock stops).
// Usage: node tools/w23/haytractor-review.js
'use strict';
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  let bad = 0;
  const check = (ok, what) => { console.log((ok ? 'ok   ' : 'BAD  ') + what); if (!ok) bad++; };
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const idx = await page.evaluate(() => window.__pipbo.LEVELS.findIndex(l => l.name === 'Tractor & Trailer'));

  // ---- R mid-field ----
  let r = await page.evaluate(idx => {
    const P = window.__pipbo, G = P.G;
    P.CPU.cfg.players = 2; P.cpuApplyCfg(); G.manual = true;
    P.loadLevel(idx); G.cpuOn = [true, true]; G.introT = 0;
    while (G.room < 2 && G.mode === 'play') P.step(P.DT);
    G.introT = 0; for (let i = 0; i < 1200; i++) P.step(P.DT);
    const st = G.mst; st.gold.rope = true; st.gold.cruise = true;
    return { room: G.room, del: st.delivered, stack: st.stack.length };
  }, idx);
  check(r.room === 2 && r.del > 0, `played to field 3 (${JSON.stringify(r)})`);
  await page.evaluate(() => { window.__pipbo.G.manual = false; });
  await page.keyboard.press('KeyR');
  await page.waitForTimeout(100);
  r = await page.evaluate(() => { const G = window.__pipbo.G, st = G.mst; G.manual = true; return { room: G.room, del: st.delivered, drive: st.drive, gold: st.gold, stack: st.stack.length, time: G.time, s: Math.round(st.tr.s), labels: [...document.querySelectorAll('.tbtn-act')].map(b => b.textContent).join() }; });
  check(r.room === 0 && r.del === 0 && r.drive === 0 && !r.gold.rope && !r.gold.cruise && r.stack === 0 && r.time < 1, `R restarts clean at field 1 (${JSON.stringify(r)})`);

  // ---- pause and resume with the real loop ----
  await page.evaluate(() => { const G = window.__pipbo.G; G.introT = 0; G.manual = false; });
  await page.keyboard.down('KeyD'); await page.waitForTimeout(700);
  const before = await page.evaluate(() => ({ t: window.__pipbo.G.time, s: window.__pipbo.G.mst.tr.s }));
  await page.keyboard.up('KeyD');
  await page.keyboard.press('Escape'); await page.waitForTimeout(100);
  const p1 = await page.evaluate(() => ({ mode: window.__pipbo.G.mode, t: window.__pipbo.G.time, s: window.__pipbo.G.mst.tr.s }));
  await page.waitForTimeout(800);
  const p2 = await page.evaluate(() => ({ mode: window.__pipbo.G.mode, t: window.__pipbo.G.time, s: window.__pipbo.G.mst.tr.s }));
  check(before.s > -100 && p1.mode === 'paused' && p2.t === p1.t && p2.s === p1.s, `Esc pauses: clock and tractor stop (${p1.t.toFixed(2)} -> ${p2.t.toFixed(2)})`);
  await page.keyboard.press('Escape'); await page.waitForTimeout(400);
  const p3 = await page.evaluate(() => ({ mode: window.__pipbo.G.mode, t: window.__pipbo.G.time }));
  check(p3.mode === 'play' && p3.t > p2.t, `Esc resumes (${p3.mode}, ${p3.t.toFixed(2)})`);
  await page.evaluate(() => { window.__pipbo.G.manual = true; });

  // ---- 1 player mid-field and back ----
  r = await page.evaluate(idx => {
    const P = window.__pipbo, G = P.G, M = P.MODES.haytractor;
    P.CPU.cfg.players = 2; P.cpuApplyCfg(); G.manual = true;
    P.loadLevel(idx); G.introT = 0;
    const st = G.mst, run = (n, f) => { for (let i = 0; i < n; i++) { if (f) f(); P.step(P.DT); } };
    // two people: Pip drives at the pace for 8 s, Bo stands still
    run(960, () => { G.players[0].input.right = G.mst.tr.v < 145; });
    const hintsBefore = !!st.hints[1];
    // switch to 1 player (Pip is the person): the computer takes Bo (the catcher)
    P.CPU.cfg.players = 1; P.CPU.cfg.human = 0; P.cpuApplyCfg();
    const caught0 = st.stats.caught;
    run(2400, () => { G.players[0].input.right = G.mst.tr.v < 145; });
    const solo = { cpuOn: G.cpuOn.slice(), caught: st.stats.caught - caught0, hintBo: st.hints[1] };
    // and back to 2 players: Bo's seat is a person again and stands still
    P.CPU.cfg.players = 2; P.cpuApplyCfg();
    const u0 = st.cat.u, c1 = st.stats.caught;
    run(600, () => { G.players[0].input.right = G.mst.tr.v < 145; G.players[1].input.left = G.players[1].input.right = false; });
    G.players[0].input.right = false;
    return { hintsBefore, solo, back: { cpuOn: G.cpuOn.slice(), moved: Math.abs(st.cat.u - u0) } };
  }, idx);
  check(r.solo.cpuOn[1] && !r.solo.cpuOn[0] && r.solo.caught >= 3 && !r.solo.hintBo, `switch to 1 player mid-field: the computer catches (${r.solo.caught} caught), its hints are quiet`);
  check(!r.back.cpuOn[1], `switch back to 2 players: Bo is a person again (cpuOn ${r.back.cpuOn})`);

  // ---- leave for another level and come back ----
  r = await page.evaluate(idx => {
    const P = window.__pipbo, G = P.G;
    P.CPU.cfg.players = 2; P.cpuApplyCfg(); G.manual = true;
    P.loadLevel(idx); G.cpuOn = [true, true]; G.introT = 0;
    while (G.room < 1 && G.mode === 'play') P.step(P.DT);
    for (let i = 0; i < 600; i++) P.step(P.DT);
    const other = P.LEVELS.findIndex(l => l.act && !l.act.labels && l.name !== 'Tractor & Trailer');
    P.loadLevel(other); G.introT = 0; for (let i = 0; i < 60; i++) P.step(P.DT);
    const otherLabel = P.LEVELS[other].act.label, otherBtns = [...document.querySelectorAll('.tbtn-act')].map(b => b.textContent);
    P.loadLevel(idx); G.introT = 0;
    const st = G.mst;
    return { otherLabel, otherBtns, room: G.room, del: st.delivered, stack: st.stack.length, items: st.items.length, helps: st.stats.helps, s: Math.round(st.tr.s) };
  }, idx);
  check(r.otherBtns.every(b => b === r.otherLabel), `another level's buttons say its own word (${r.otherBtns} vs ${r.otherLabel})`);
  check(r.room === 0 && r.del === 0 && r.stack === 0 && r.items === 0 && r.helps === 0, `back at 23-1: fresh state (${JSON.stringify(r)})`);

  // ---- 1 player, the person drives (Pip, field 1) and stops pressing ----
  r = await page.evaluate(idx => {
    const P = window.__pipbo, G = P.G;
    P.CPU.cfg.players = 1; P.CPU.cfg.human = 0; P.cpuApplyCfg(); G.manual = true;
    P.loadLevel(idx); G.introT = 0;
    for (let i = 0; i < 600; i++) { G.players[0].input.right = true; P.step(P.DT); }
    G.players[0].input.right = false;
    const s0 = G.mst.tr.s;
    for (let i = 0; i < 120 * 60; i++) P.step(P.DT);
    return { moved: Math.round(G.mst.tr.s - s0), waiting: G.mst.waiting, time: +G.time.toFixed(1), cruise: G.mst.gold.cruise };
  }, idx);
  check(r.moved < 400 && r.waiting && !r.cruise && r.time < 30, `1 player, person driver stops: the tractor rolls to a stop, break shows (${JSON.stringify(r)})`);

  // ---- 1 player, the person catches (Bo is the person, field 1) and stops pressing after 20 s ----
  r = await page.evaluate(idx => {
    const P = window.__pipbo, G = P.G;
    P.CPU.cfg.players = 1; P.CPU.cfg.human = 1; P.cpuApplyCfg(); G.manual = true;
    P.loadLevel(idx); G.introT = 0;
    for (let i = 0; i < 2400; i++) { G.players[1].input.right = i % 120 < 40; G.players[1].input.left = i % 120 > 80; P.step(P.DT); }
    G.players[1].input.right = G.players[1].input.left = false;
    for (let i = 0; i < 120 * 60; i++) P.step(P.DT);
    const st = G.mst;
    return { room: G.room, state: st.state, waiting: st.waiting, time: +G.time.toFixed(1), s: Math.round(st.tr.s), barn: st.c.barn.x };
  }, idx);
  check(r.room === 0 && r.waiting && r.state === 'go' && r.time < 40, `1 player, person catcher stops: the computer driver waits, clock stops (${JSON.stringify(r)})`);
  await page.evaluate(() => { const P = window.__pipbo; P.CPU.cfg.players = 2; P.cpuApplyCfg(); });

  if (errors.length) { console.log('ERRORS:\n' + [...new Set(errors)].join('\n')); bad++; }
  console.log(bad ? bad + ' BAD' : 'all ok');
  await browser.close();
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
