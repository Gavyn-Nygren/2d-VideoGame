#!/usr/bin/env node
// Runaway Pigs edge cases (second pass): R restarts mid-chase with fresh state, Esc pauses and resumes (nothing moves
// while paused), switching to 1-player in the middle of a chase (the computer takes over its seat at once and still
// can't finish alone), no leaks into the next level or back in, gold gates / levers stay put once gold, the gold gate
// for a herd waiting at a shut way, the gold ribbon for a pig stuck in the mud, the pen gate that shuts itself, a
// keeper who shuts the pen early, and ribbon pigs still needing the gates.
// Usage: node tools/w23/pigherd-edge.js
'use strict';
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.addInitScript(() => {
    const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    Math.random = gen(99);
  });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const out = [];
  const ok = (c, what, extra) => out.push((c ? 'ok   ' : 'FAIL ') + what + (extra !== undefined ? '  (' + JSON.stringify(extra) + ')' : ''));
  const LI = await page.evaluate(() => window.__pipbo.LEVELS.findIndex(l => l.name === 'Runaway Pigs'));
  const ev = (fn, arg) => page.evaluate(fn, arg);

  // --- R mid-chase: a fresh level (chase 1, no wrong turns, no gold, pigs back at the start)
  await ev(LI => {
    const P = window.__pipbo, G = P.G;
    P.CPU.cfg.players = 2; P.cpuApplyCfg(); G.cpuOn = [true, true]; G.manual = true;
    P.loadLevel(LI); G.introT = 0;
    for (let i = 0; i < 120 * 30; i++) P.step(P.DT);
    P.nextRoom(); G.introT = 0;
    const st = G.mst; st.stats.wrong = 5; st.goldUsed.push('arrow'); st.oats = true;
    for (let i = 0; i < 120 * 5; i++) P.step(P.DT);
  }, LI);
  await page.keyboard.press('KeyR');
  let r = await ev(() => { const G = window.__pipbo.G, st = G.mst; return { room: G.room, k: st.k, wrong: st.stats.wrong, gold: st.goldUsed.length, oats: st.oats, penned: st.stats.penned, pigs: st.pigs.length, herder: st.herder, t: G.time, gatesShut: st.gates.filter(g => g.kind === 'fwd').every(g => !g.open) }; });
  ok(r.room === 0 && r.k === 0 && r.wrong === 0 && r.gold === 0 && !r.oats && r.penned === 0 && r.pigs === 4 && r.herder === 0 && r.gatesShut, 'R restarts from chase 1 with fresh state', r);

  // --- pause: Esc stops everything, Esc again resumes
  await ev(() => { const P = window.__pipbo, G = P.G; G.manual = false; G.introT = 0; G.cpuOn = [true, true]; });
  await page.waitForTimeout(600);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(100);
  const a = await ev(() => { const G = window.__pipbo.G, st = G.mst; return { mode: G.mode, t: G.time, px: st.pigs.map(q => q.x | 0).join(), cam: st.camX }; });
  await page.waitForTimeout(700);
  const b = await ev(() => { const G = window.__pipbo.G, st = G.mst; return { mode: G.mode, t: G.time, px: st.pigs.map(q => q.x | 0).join(), cam: st.camX }; });
  ok(a.mode === 'paused' && b.t === a.t && b.px === a.px && b.cam === a.cam, 'paused: the clock, the pigs and the camera stand still', { a: a.mode, t: [a.t, b.t] });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  const c = await ev(() => { const G = window.__pipbo.G; return { mode: G.mode, t: G.time }; });
  ok(c.mode === 'play' && c.t > b.t, 'Esc resumes', c);

  // --- switching to 1-player mid-chase: the computer takes its seat at once, the person idle: it can't finish
  r = await ev(LI => {
    const P = window.__pipbo, G = P.G;
    G.manual = true; P.CPU.cfg.players = 2; P.cpuApplyCfg();
    P.loadLevel(LI); G.introT = 0;
    for (let i = 0; i < 120 * 4; i++) P.step(P.DT);   // two people standing still for 4 s
    P.CPU.cfg.players = 1; P.CPU.cfg.human = 0; P.cpuApplyCfg();
    const bo = G.players[1], x0 = bo.x + G.mst.camX;
    for (let i = 0; i < 120 * 3; i++) P.step(P.DT);
    const moved = Math.abs(bo.x + G.mst.camX - x0) > 40;
    const st = G.mst;
    const hud = P.MODES.pigherd.jobText(st, 0, { k: 'waitGate' });
    let n = 0; while (n < 120 * 400 && G.mode === 'play') { P.step(P.DT); n++; }
    return { moved, mode: G.mode, room: G.room, rest: st.rest, hud, cpuOn: G.cpuOn };
  }, LI);
  ok(r.moved, 'switching to 1-player: the computer starts playing Bo at once');
  ok(r.mode === 'play' && r.room === 0, 'with the person idle the computer never finishes (400 s)', { room: r.room });
  ok(/opens the gate/.test(r.hud[0]), 'hints name what the computer does', r.hud[0]);

  // --- no leaks: the next level and back
  r = await ev(LI => {
    const P = window.__pipbo, G = P.G;
    P.CPU.cfg.players = 2; P.cpuApplyCfg(); G.cpuOn = [false, false];
    P.loadLevel(LI); G.introT = 0; G.mst.stats.wrong = 7; G.mst.oats = true;
    const L2 = P.LEVELS[LI + 1] ? LI + 1 : LI - 1;
    P.loadLevel(L2); G.introT = 0;
    for (let i = 0; i < 240; i++) P.step(P.DT);
    const other = { walls: !!G.mst.walls, pigs: !!G.mst.pigs, name: G.level.def.name };
    P.loadLevel(LI); G.introT = 0;
    for (let i = 0; i < 10; i++) P.step(P.DT);
    return { other, wrong: G.mst.stats.wrong, oats: G.mst.oats, room: G.room };
  }, LI);
  ok(!r.other.pigs && r.wrong === 0 && !r.oats && r.room === 0, 'no leaks into the next level (' + r.other.name + ') or back', r);

  // --- gold help rules
  r = await ev(LI => {
    const P = window.__pipbo, G = P.G, res = {};
    const busy = () => { P.CPU.idle[0] = 0; P.CPU.idle[1] = 0; };
    const put = (st, p, x, y) => { p.x = x - p.w / 2 - st.camX; p.y = y - p.h / 2; p.vx = p.vy = 0; };
    const load = k => { P.CPU.cfg.players = 2; P.cpuApplyCfg(); G.cpuOn = [false, false]; G.manual = true; P.loadLevel(LI); for (let i = 0; i < k; i++) P.nextRoom(); G.introT = 0; for (const p of G.players) for (const kk in p.input) p.input[kk] = false; return G.mst; };
    // a herd waiting at a shut forward gate for 30 s (both playing): the gold gate opens it, and it stays open
    let st = load(0);
    const g1 = st.gates.find(g => g.id === 'g1');
    st.pigs.forEach((q, i) => { q.x = 760; q.y = 270 + i * 20; q.vx = q.vy = 0; });
    put(st, G.players[0], 560, 300); put(st, G.players[1], 300, 450);
    for (let i = 0; i < 120 * 24; i++) { busy(); P.step(P.DT); }
    res.notYet = !g1.open;
    for (let i = 0; i < 120 * 3; i++) { busy(); P.step(P.DT); }
    res.goldOpen = g1.open && g1.gold && st.goldUsed.includes('gate');
    put(st, G.players[1], 790, 300); G.players[1].pendingAct = true; busy(); P.step(P.DT);
    res.staysOpen = g1.open;
    // the same wait with a person away: no gold gate
    st = load(0);
    const h1 = st.gates.find(g => g.id === 'g1');
    st.pigs.forEach((q, i) => { q.x = 760; q.y = 270 + i * 20; q.vx = q.vy = 0; });
    put(st, G.players[0], 560, 300);
    for (let i = 0; i < 120 * 40; i++) { P.CPU.idle[0] = 20; P.CPU.idle[1] = 0; P.step(P.DT); }
    res.awayNoGold = !h1.open && !h1.gold;
    // 2-player: a gatekeeper standing still by the gate (40 s, under 90) still counts as playing
    st = load(0);
    const k1 = st.gates.find(g => g.id === 'g1');
    st.pigs.forEach((q, i) => { q.x = 760; q.y = 270 + i * 20; q.vx = q.vy = 0; });
    put(st, G.players[0], 560, 300);
    for (let i = 0; i < 120 * 29; i++) { P.CPU.idle[0] = 0; P.CPU.idle[1] = 40; P.step(P.DT); }
    res.keeperWaitGold = k1.open && k1.gold;
    // 1-player: the person (gatekeeper) 20 s without pressing: no gold gate
    P.CPU.cfg.players = 1; P.CPU.cfg.human = 1; P.cpuApplyCfg(); G.manual = true; P.loadLevel(LI); G.introT = 0; st = G.mst;
    const k2 = st.gates.find(g => g.id === 'g1');
    st.pigs.forEach((q, i) => { q.x = 760; q.y = 270 + i * 20; q.vx = q.vy = 0; });
    for (let i = 0; i < 120 * 40; i++) { P.CPU.idle[1] = 20; P.step(P.DT); }
    res.soloAwayNoGold = !k2.gold;
    // a pig stuck in the mud 30 s: a gold ribbon, and it trots home
    st = load(0);
    const m = st.muds[0], q = st.pigs[2];
    st.pigs.forEach((o, i) => { o.x = 2500 + i * 10; o.y = 300; o.state = 'pen'; });
    q.state = 'run'; q.x = m.x; q.y = m.y; q.vx = q.vy = 0; q.mudCD = 0;
    put(st, G.players[0], 300, 300); put(st, G.players[1], 400, 450);
    for (let i = 0; i < 120 * 2; i++) { busy(); P.step(P.DT); }
    res.wallow = q.state === 'wallow';
    for (let i = 0; i < 120 * 30; i++) { busy(); P.step(P.DT); }
    res.mudRibbon = q.state === 'ribbon' && q.gold;
    // the keeper shuts the pen before the last pig: the herd waits, then the gold pen gate opens
    st = load(0);
    const pg = st.pen.gate;
    st.pigs.forEach((o, i) => { o.x = 2230; o.y = 280 + i * 14; o.vx = o.vy = 0; });
    put(st, G.players[1], 2275, 300); put(st, G.players[0], 2050, 300);
    G.players[1].pendingAct = true; busy(); P.step(P.DT);
    res.penOpen1 = pg.open;
    G.players[1].pendingAct = true; busy(); P.step(P.DT);
    res.penShutEarly = !pg.open;
    for (let i = 0; i < 120 * 32; i++) { busy(); P.step(P.DT); }
    res.penGold = pg.gold && pg.open;
    // every pig in, nobody shuts: the gold pen gate shuts itself (All in!)
    let n = 0; while (n < 120 * 60 && st.state === 'play') { busy(); if (n % 30 === 0) { put(st, G.players[0], 2150, 300); } P.step(P.DT); n++; }
    res.penAllIn = st.state !== 'play';
    // a gold lever stays on the right way
    st = load(2);
    const lv = st.levers[0];
    st.gates.find(g => g.id === 'gU').wrong = 2;
    const qq = st.pigs[0]; qq.x = 1400; qq.y = 160; qq.state = 'run';
    busy(); P.step(P.DT);
    res.leverGold = lv.gold && lv.b.open;
    put(st, G.players[1], lv.x - 20, lv.y); G.players[1].pendingAct = true; busy(); P.step(P.DT);
    res.leverStays = lv.b.open;
    // a gold side gate stays shut
    st = load(0);
    const s1 = st.gates.find(g => g.id === 's1'); s1.wrong = 2;
    const q2 = st.pigs[0]; q2.x = 1600; q2.y = 160; q2.state = 'run';
    busy(); P.step(P.DT);
    put(st, G.players[1], 1620, 240); G.players[1].pendingAct = true; busy(); P.step(P.DT);
    res.sideGoldShut = s1.gold && !s1.open;
    // a gold-ribbon pig caught down the dead-end fork when the lever flipped finds its way back out
    st = load(2);
    const lv2 = st.levers[0]; lv2.b.open = true; lv2.a.open = false;
    st.pigs.forEach((o, i) => { o.state = 'pen'; o.x = 3300; o.y = 250 + i * 20; });
    const qr = st.pigs[0]; qr.state = 'ribbon'; qr.gold = true; qr.x = 950; qr.y = 220; qr.vx = qr.vy = 0;
    put(st, G.players[0], 300, 300); put(st, G.players[1], 400, 450);
    for (let i = 0; i < 120 * 25; i++) { busy(); P.step(P.DT); }
    res.ribbonOut = qr.y > 360 || qr.x > 1600 || qr.state === 'pen';
    res.ribbonAt = [qr.x | 0, qr.y | 0, qr.state];
    // ribbon pigs don't count as past a gate job
    st = load(0);
    st.pigs.forEach(o => { o.state = 'ribbon'; o.x = 500; });
    const pl = P.MODES.pigherd.plan(st);
    res.ribbonJob = pl.job && pl.job.kind === 'open';
    return res;
  }, LI);
  ok(r.notYet && r.goldOpen, 'gold gate: a herd waiting 25 s at a shut gate opens it', r);
  ok(r.staysOpen, 'a gold gate stays open (the keeper can\'t shut it)');
  ok(r.awayNoGold, 'no gold gate while a person is away');
  ok(r.keeperWaitGold, '2-player: a gatekeeper waiting still by the gate still counts as playing');
  ok(r.soloAwayNoGold, '1-player: no gold gate while the person presses nothing');
  ok(r.wallow && r.mudRibbon, 'gold ribbon for a pig 25 s in the mud');
  ok(r.penOpen1 && r.penShutEarly && r.penGold, 'pen shut early: the gold pen gate opens it', r);
  ok(r.penAllIn, 'every pig in and nobody shuts: the gold pen gate shuts itself');
  ok(r.leverGold && r.leverStays, 'a gold lever stays on the right way', r);
  ok(r.sideGoldShut, 'a gold side gate stays shut');
  ok(r.ribbonOut, 'a gold-ribbon pig trapped down the wrong fork finds its way back', r.ribbonAt);
  ok(r.ribbonJob, 'ribbon pigs still need the gates (the gate job stays)');
  console.log(out.join('\n'));
  if (errors.length) console.log('ERRORS\n' + [...new Set(errors)].join('\n'));
  console.log(out.some(l => l.startsWith('FAIL')) || errors.length ? 'SOME CHECKS FAILED' : 'ALL EDGE CHECKS PASS');
  await browser.close();
})();
