#!/usr/bin/env node
// 23-4 Pie-Eating Contest: the second-pass review checks (things the rules and break scripts don't cover).
//   node tools/w23/pieeat-rev.js
// - R (restart) in the middle of round 3 starts a fresh match (round 1, 0-0, no stats, empty cheeks and jar)
// - Esc pauses the clock and the claps; Esc again carries on
// - switching to 1 player in the middle of a round: the computer picks up Bo and eats; switching back lets go
// - in 1-player mode the person can use Bo's keys too (/ bites, ↑ gulps for Pip), and they never move the computer
// - leaving for another level and coming back leaves nothing behind (G.mst, rounds, testRound / testNoHelp)
// - a ▲ held through the round-end card and the next 3-2-1 is not a gulp at GO
// - a long tie chain (both idle) still ends the match, and the results card shows the four tiles
'use strict';
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const errors = [], results = [];
  let fails = 0;
  const check = (name, cond, info) => { if (!cond) fails++; results.push((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? '   [' + info + ']' : '')); };
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const ev = (f, a) => page.evaluate(f, a);
  await ev(() => {
    const P = window.__pipbo, G = P.G;
    window.__idx = P.LEVELS.findIndex(l => l.name === 'Pie-Eating Contest');
    window.__run = s => { for (let k = 0; k < Math.round(s / P.DT); k++) { P.pollInput(P.DT); P.step(P.DT); } };
    window.__toLive = () => { let n = 0; while (G.match.phase !== 'live' && n++ < 4000) { P.pollInput(P.DT); P.step(P.DT); } };
    window.__start = (players) => {
      G.manual = true;
      P.cpuSetCfg('players', players || 2); P.cpuSetCfg('human', 0);
      P.loadLevel(window.__idx); G.introT = 0; window.__toLive();
    };
  });

  /* ---------- R restarts mid-round ---------- */
  const r1 = await ev(() => {
    const P = window.__pipbo, G = P.G;
    window.__start(2);
    // fake two finished rounds, then some eating in round 3
    P.matchRoundEnd(0, 'test'); window.__toLive(); P.matchRoundEnd(1, 'test'); window.__toLive();
    const st = G.mst; st.pl[0].cheeks = 4; st.pl[0].H = 0.6; st.stat.perfect = [5, 3]; st.stat.hics = [1, 2];
    return { round: G.match.round, wins: G.match.wins.join('-'), name: st.R.name };
  });
  await page.keyboard.press('r');
  await ev(() => window.__run(0.05));
  const r2 = await ev(() => {
    const G = window.__pipbo.G, st = G.mst;
    return { round: G.match.round, wins: G.match.wins.join('-'), name: st.R.name, cheeks: st.pl[0].cheeks, H: st.pl[0].H, perf: st.stat.perfect.join('-'), hics: st.stat.hics.join('-'), mode: G.mode };
  });
  check('before R: round 3 (Apple Pie), 1-1', r1.round === 3 && r1.wins === '1-1' && r1.name === 'Apple Pie', JSON.stringify(r1));
  check('R restarts the match: round 1 Cherry Pie, 0-0, empty cheeks and jar, no stats', r2.round === 1 && r2.wins === '0-0' && r2.name === 'Cherry Pie' && r2.cheeks === 0 && r2.H === 0 && r2.perf === '0-0' && r2.hics === '0-0', JSON.stringify(r2));

  /* ---------- Esc pauses the clock and the claps ---------- */
  await ev(() => { window.__start(2); window.__run(1); });
  await page.keyboard.press('Escape');
  const p1 = await ev(() => { const G = window.__pipbo.G; window.__run(1.5); return { paused: G.paused || G.mode, rt: G.mst.rt, bph: G.mst.bph, card: !document.getElementById('overlay').hidden }; });
  const p2 = await ev(() => { const G = window.__pipbo.G; window.__run(1.5); return { rt: G.mst.rt, bph: G.mst.bph }; });
  check('Esc opens the pause card', p1.card, JSON.stringify(p1));
  check('... and the round clock and the claps stand still', p1.rt === p2.rt && p1.bph === p2.bph, p1.rt.toFixed(2) + ' -> ' + p2.rt.toFixed(2));
  await ev(() => window.__pipbo.resume());
  const p3 = await ev(() => { const G = window.__pipbo.G; window.__run(1); return { rt: G.mst.rt, mode: G.mode }; });
  check('resume carries on', p3.rt > p2.rt + 0.9, p3.rt.toFixed(2));

  /* ---------- switching to 1 player mid-round, then back ---------- */
  const s1 = await ev(() => {
    const P = window.__pipbo, G = P.G;
    window.__start(2); window.__run(2);
    const e0 = G.mst.pl[1].eaten + G.mst.pl[1].cheeks;
    P.cpuSetCfg('players', 1); P.cpuSetCfg('human', 0);
    window.__run(8);
    const st = G.mst, B = st.pl[1];
    return { cpuOn: G.cpuOn.join(), before: e0, after: B.eaten + B.cheeks, pip: st.pl[0].eaten + st.pl[0].cheeks, phase: G.match.phase };
  });
  check('switching to 1 player mid-round: the computer picks up Bo and eats', s1.cpuOn === 'false,true' && s1.after > s1.before + 10 && s1.pip === 0, JSON.stringify(s1));
  const s2 = await ev(() => {
    const P = window.__pipbo, G = P.G;
    if (G.match.phase !== 'live') window.__toLive();
    P.cpuSetCfg('players', 2);
    const B = G.mst.pl[1], e0 = B.eaten + B.cheeks + B.left;
    window.__run(3);
    return { cpuOn: G.cpuOn.join(), moved: (B.eaten + B.cheeks + B.left) !== e0 || B.cheeks !== G.mst.pl[1].cheeks, input: JSON.stringify(G.players[1].input), bite: B.bites };
  });
  check('switching back to 2 players: the computer lets go (Bo stops eating)', s2.cpuOn === 'false,false' && !/true/.test(s2.input), JSON.stringify(s2));

  /* ---------- 1-player: the person can use Bo's keys, the computer is untouched by them ---------- */
  await ev(() => { window.__start(1); window.__run(0.5); window.__pipbo.G.mst.pl[0].H = 0; });
  const k0 = await ev(() => { const st = window.__pipbo.G.mst; return { pip: st.pl[0].cheeks + st.pl[0].eaten, bo: st.pl[1].bites }; });
  await page.keyboard.down('Slash'); await ev(() => window.__run(0.05)); await page.keyboard.up('Slash'); await ev(() => window.__run(0.6));
  await page.keyboard.down('Period'); await ev(() => window.__run(0.05)); await page.keyboard.up('Period'); await ev(() => window.__run(0.6));
  const k1 = await ev(() => { const st = window.__pipbo.G.mst; return { pip: st.pl[0].cheeks + st.pl[0].eaten, cheeks: st.pl[0].cheeks }; });
  check('1 player: Bo\'s bite keys bite for the person (Pip)', k1.pip === k0.pip + 2, JSON.stringify([k0, k1]));
  await ev(() => { const P = window.__pipbo, st = P.G.mst; st.bph = Math.floor(st.bph) + 2 - 0.06 / P.MODES.pieeat.test.per(st); });
  await page.keyboard.down('ArrowUp'); await ev(() => window.__run(0.05)); await page.keyboard.up('ArrowUp'); await ev(() => window.__run(0.1));
  const k2 = await ev(() => { const st = window.__pipbo.G.mst; return { cheeks: st.pl[0].cheeks, pop: st.pl[0].pop, eaten: st.pl[0].eaten }; });
  check('1 player: ↑ gulps for the person (a GULP! on the clap)', k2.cheeks === 0 && /GULP/.test(k2.pop), JSON.stringify(k2));
  const hint = await ev(() => {
    // the HUD never shows key chips for the computer: draw a frame and look at what pieeatKeys says for the person
    const P = window.__pipbo; return { solo: cpuSolo(), cpuBo: cpuOn(1), keys: JSON.stringify(pieeatKeys(0)) };
  });
  check('1 player: the person\'s key chip names both key sets', /F or \//.test(hint.keys) && hint.cpuBo, JSON.stringify(hint));

  /* ---------- leaving for another level and coming back ---------- */
  const l1 = await ev(() => {
    const P = window.__pipbo, G = P.G;
    window.__start(2);
    P.matchRoundEnd(0, 'test'); window.__toLive(); P.matchRoundEnd(0, 'test'); window.__toLive();
    G.mst.pl[1].H = 0.9; G.mst.stat.perfect = [9, 9];
    const other = P.LEVELS.findIndex(l => l.name === 'Dolphin Race');
    P.loadLevel(other); G.introT = 0; window.__run(3);
    const otherOk = !!G.mst && G.mst.goal === undefined && !G.mst.R && !(G.mst.pl && 'cheeks' in G.mst.pl[0]) && P.LEVELS[G.levelIndex].name === 'Dolphin Race';
    P.loadLevel(window.__idx); G.introT = 0; window.__toLive();
    const st = G.mst;
    return { otherOk, round: G.match.round, wins: G.match.wins.join('-'), name: st.R.name, H: st.pl[1].H, perf: st.stat.perfect.join('-'), gold: st.pl.map(E => E.gold).join(), testRound: st.forceRound, noHelp: st.noHelp };
  });
  check('another level after 23-4 has no pie state', l1.otherOk, JSON.stringify(l1));
  check('coming back: round 1 Cherry Pie, 0-0, fresh jar and stats, no gold, no test switches', l1.round === 1 && l1.wins === '0-0' && l1.name === 'Cherry Pie' && l1.H === 0 && l1.perf === '0-0' && l1.gold === '0,0' && !l1.testRound && !l1.noHelp, JSON.stringify(l1));

  /* ---------- ▲ held through the round-end card and the 3-2-1 ---------- */
  const h1 = await ev(() => {
    const P = window.__pipbo, G = P.G;
    window.__start(2);
    G.players[1].input.jump = true; G.players[1].input.up = true;
    P.matchRoundEnd(0, 'test');
    let n = 0; while (G.match.phase !== 'live' && n++ < 4000) { G.players[1].input.jump = true; P.step(P.DT); }
    for (let i = 0; i < 30; i++) { G.players[1].input.jump = true; P.step(P.DT); }
    const B = G.mst.pl[1];
    G.players[1].input.jump = false; G.players[1].input.up = false;
    return { round: G.match.round, gulpT: B.gulpT, H: B.H, pop: B.pop, glugs: G.mst.stat.glugs[1] };
  });
  check('▲ held through the round card and 3-2-1 is not a gulp at GO', h1.round === 2 && h1.gulpT === 0 && h1.H === 0 && h1.glugs === 0, JSON.stringify(h1));

  /* ---------- both idle: ties replay, then the match still ends; the results card has the tiles ---------- */
  const t1 = await ev(() => {
    const P = window.__pipbo, G = P.G;
    window.__start(2);
    let n = 0; while (G.mode === 'play' && n++ < 120 * 600) P.step(P.DT);
    const secs = Math.round(n * P.DT), mode = G.mode;
    if (G.mode === 'clear') P.showResult(); // (frame() shows it after the cheer; G.manual skips frame)
    const card = document.getElementById('overlay');
    return { mode, secs, text: card.innerText.replace(/\s+/g, ' ').slice(0, 300) };
  });
  check('both idle: the match still ends (ties, sudden death, then a draw)', t1.mode !== 'play' && t1.secs < 400, t1.mode + ' after ' + t1.secs + ' s');
  check('... and the results card shows Rounds won, Pies eaten, GULP!s, Hiccups', /ROUNDS WON|Rounds won/i.test(t1.text) && /PIES EATEN/i.test(t1.text) && /GULP!S/i.test(t1.text) && /HICCUPS/i.test(t1.text), t1.text.slice(0, 160));

  console.log(results.join('\n'));
  console.log(errors.length ? 'PAGE ERRORS\n' + errors.slice(0, 5).join('\n') : 'no page errors');
  console.log((results.length - fails) + '/' + results.length + ' passed');
  await browser.close();
  process.exit(fails || errors.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
