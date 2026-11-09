#!/usr/bin/env node
// 23-4 Pie-Eating Contest: every rule, checked by driving the inputs directly (G.manual, p.pendingAct, p.input.jump,
// step(DT)). Prints PASS / FAIL per check and exits 1 on any failure.
//   node tools/w23/pieeat-rules.js
'use strict';
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const res = await page.evaluate(() => {
    const P = window.__pipbo, G = P.G, DT = P.DT, M = P.MODES.pieeat, Q = M.test.PIEEAT, out = [];
    const ok = (name, cond, info) => out.push([!!cond, name, info === undefined ? '' : String(info)]);
    const idx = P.LEVELS.findIndex(l => l.name === 'Pie-Eating Contest');
    const near = (a, b, e = 1e-6) => Math.abs(a - b) < e;
    // a fresh match with two people (nobody pressing), stepped to "GO!"
    const fresh = (opts = {}) => {
      M.testRound = opts.round || 0; M.testNoHelp = !!opts.noHelp;
      G.manual = true; G.cpuOn = [false, false]; P.CPU.skillOf = [null, null];
      P.loadLevel(idx);
      G.cpuOn = [false, false]; G.introT = 0;
      for (const p of G.players) for (const k in p.input) p.input[k] = false;
      let n = 0; while (G.match.phase !== 'live' && n++ < 2000) P.step(DT);
      return G.mst;
    };
    const run = s => { for (let i = 0; i < Math.round(s / DT); i++) P.step(DT); };
    const bite = k => { G.players[k].pendingAct = true; P.step(DT); };
    const gulp = k => { const p = G.players[k]; p.input.jump = true; P.step(DT); p.input.jump = false; P.step(DT); };
    // put the beat so that the next tick is `off` seconds from clap n (negative = before it)
    const atClap = (st, n, off) => { st.bph = n + off / M.test.per(st); };
    const per = st => M.test.per(st);

    /* ---------- bites ---------- */
    let st = fresh();
    ok('round 1 is Cherry Pie, 3 pies of 26 bites, claps every 1.5 s', st.R.name === 'Cherry Pie' && st.R.pies === 3 && st.R.bites === 26 && per(st) === 1.5, st.R.name);
    ok('the platformer bodies are hidden', G.players.every(p => !p.alive));
    const A = st.pl[0];
    atClap(st, 1, -0.9);
    bite(0);
    ok('a bite moves one bite from the plate to the cheeks', A.cheeks === 1 && A.left === st.R.bites - 1 && A.eaten === 0, A.cheeks + '/' + A.left);
    ok('a calm first bite adds nothing to the hiccup jar', A.H === 0, A.H);
    run(0.1); bite(0);
    ok('a bite 0.1 s after the last fills the jar 32%', near(A.H, 0.32, 0.01), A.H.toFixed(3));
    const h0 = A.H; run(0.2); bite(0);
    ok('a bite 0.2 s after the last adds 16%', near(A.H, h0 - Q.drain * (0.2 + DT) + 0.16, 0.02), (A.H - h0).toFixed(3));
    const h1 = A.H; run(0.28); bite(0);
    ok('a bite 0.28 s after the last adds 5%', near(A.H, Math.max(0, h1 - Q.drain * (0.28 + DT)) + 0.05, 0.02), A.H.toFixed(3));
    run(0.5); const h2 = A.H; bite(0);
    ok('a bite 0.5 s after the last adds nothing', A.H <= h2 + 1e-9, (A.H - h2).toFixed(3));
    run(0.5); bite(0); run(0.5); bite(0);
    ok('the cheeks hold 6', A.cheeks === 6 && Q.cap === 6, A.cheeks);
    run(0.5); const h3 = A.H, left = A.left; bite(0);
    ok('a bite with full cheeks is "Too full!": nothing eaten, the jar +38%', A.cheeks === 6 && A.left === left && near(A.H, Math.max(0, h3 - Q.drain * DT) + 0.38, 0.02) && /Too full/.test(A.pop), A.pop + ' ' + (A.H - h3).toFixed(3));

    /* ---------- gulps ---------- */
    st = fresh();
    const B = st.pl[0];
    atClap(st, 1, -1.2);
    for (let i = 0; i < 4; i++) { bite(0); run(0.34); }
    B.H = 0.3;
    atClap(st, 2, -0.125);
    gulp(0);
    ok('a gulp on the clap swallows all 4 plus 2 bonus bites off the plate', Q.bonus === 2 && B.eaten === 6 && B.cheeks === 0 && B.left === st.R.bites - 6, B.eaten + ' eaten, left ' + B.left);
    ok('... is a GULP! that starts a streak and calms the jar 12%', /GULP/.test(B.pop) && B.streak === 1 && B.H < 0.3 - 0.11, B.pop + ' H ' + B.H.toFixed(3));
    ok('... and the swallow takes 0.22 s (no bites meanwhile)', near(B.gulpT, Q.gulpT - DT, 0.02), B.gulpT.toFixed(3));
    const l0 = B.left; bite(0);
    ok('a bite while swallowing is ignored', B.left === l0 && B.cheeks === 0);
    run(0.22); bite(0);
    gulp(0);
    ok('a second gulp on the same clap swallows but gets no bonus', B.eaten === 7 && B.left === l0 - 1 && B.streak === 1, B.eaten + ' / streak ' + B.streak);
    // an early gulp (0.13 s before is still in), a late one (0.2 s after is still in)
    st = fresh();
    let E = st.pl[0];
    atClap(st, 1, -0.6); bite(0); run(0.3); bite(0);
    atClap(st, 3, -0.125); gulp(0);
    ok('a gulp 0.125 s early is a GULP!', /GULP/.test(E.pop) && E.eaten === 4, E.pop);
    run(0.4); bite(0); run(0.3); bite(0);
    atClap(st, 5, 0.19); gulp(0);
    ok('a gulp 0.19 s late is a GULP!', /GULP/.test(E.pop) && E.eaten === 8 && E.streak === 2, E.pop + ' ' + E.eaten);
    run(0.4); for (let i = 0; i < 6; i++) { bite(0); run(0.34); }
    E.H = 0;
    atClap(st, 9, -0.3); gulp(0);
    ok('an off-beat gulp is a "Glug!": a third of the cheeks (6 -> 2) goes down', /Glug/.test(E.pop) && E.cheeks === 4 && E.eaten === 10, E.pop + ' cheeks ' + E.cheeks);
    ok('... it swallows air (the jar +32%), ends the streak and takes 0.5 s', near(E.H, 0.32, 0.02) && E.streak === 0 && near(E.gulpT, 0.5 - DT, 0.02), E.H.toFixed(3) + ' ' + E.gulpT.toFixed(3));
    run(0.6);
    E.cheeks = 0; E.H = 0;
    atClap(st, 12, 0.4); gulp(0);
    ok('an off-beat gulp with empty cheeks is air too (+15%)', near(E.H, 0.15, 0.02) && /air/.test(E.pop), E.pop + ' ' + E.H.toFixed(3));
    run(0.3); E.H = 0;
    atClap(st, 14, 0.0); gulp(0);
    ok('an on-beat gulp with empty cheeks does nothing', E.H === 0 && /Nothing/.test(E.pop), E.pop);
    ok('GO itself is not a clap (a gulp 0.1 s after GO is off the beat)', (() => { const s2 = fresh(); s2.bph = 0.1 / per(s2); return !M.test.onBeat(s2, s2.pl[0]); })());

    /* ---------- hiccups ---------- */
    st = fresh();
    E = st.pl[1];
    atClap(st, 1, -1.4);
    E.H = 0.9; bite(1); run(0.1); bite(1);
    ok('a full jar gives the hiccups for 1.6 s', E.hicT > 1.5 && st.stat.hics[1] === 1 && /HIC/.test(E.pop), E.hicT.toFixed(2));
    const c0 = E.cheeks, e0 = E.eaten; bite(1); gulp(1);
    ok('no biting or gulping during the hiccups', E.cheeks === c0 && E.eaten === e0);
    run(1.6);
    ok('after the hiccups the jar is empty and eating works again', E.hicT === 0 && E.H === 0 && (bite(1), E.cheeks === c0 + 1), E.H);
    // the jar empties by itself
    E.H = 0.5; run(1);
    ok('the jar empties about 26% a second', near(E.H, 0.5 - Q.drain, 0.02), E.H.toFixed(3));

    /* ---------- pies, the finish, the reasons ---------- */
    st = fresh();
    E = st.pl[0];
    E.left = 1; atClap(st, 1, -1.2); bite(0);
    ok('the last bite of a pie starts the next pie sliding over (0.55 s)', E.left === 0 && E.swapT > 0.5 && E.pie === 0, E.swapT.toFixed(2));
    bite(0);
    ok('no biting while the next pie slides over', E.left === 0 && E.cheeks === 1);
    run(0.6);
    ok('then the next pie is on the plate', E.pie === 1 && E.left === st.R.bites && /Next pie/.test(E.pop), E.pie + ' ' + E.pop);
    // the last pie: the round is won when its last bite is swallowed
    st = fresh();
    E = st.pl[0];
    E.pie = 2; E.left = 1; E.eaten = st.goal - 1; atClap(st, 1, -1.0);
    bite(0);
    ok('an empty last plate with food in the cheeks is not the win yet', G.match.phase === 'live' && !E.done);
    bite(0);
    ok('... biting it says "Gulp it down!"', /Gulp it down/.test(E.pop), E.pop);
    atClap(st, 2, 0); gulp(0);
    ok('swallowing the last bite wins the round: "Pip ate 3 pies!"', G.match.phase === 'end' && G.match.end.winner === 0 && G.match.end.reason === 'Pip ate 3 pies!', G.match.end && G.match.end.reason);
    // close finish / hiccups reasons
    st = fresh();
    st.pl[1].pie = 2; st.pl[1].left = 0; st.pl[1].cheeks = 1; st.pl[1].eaten = st.goal - 1;
    st.pl[0].eaten = st.goal - 3;
    atClap(st, 2, 0); gulp(1);
    ok('a close finish: "Bo ate 3 pies, just a nibble ahead!"', G.match.end && G.match.end.winner === 1 && /just a nibble ahead/.test(G.match.end.reason), G.match.end && G.match.end.reason);
    st = fresh();
    st.pl[1].pie = 2; st.pl[1].left = 0; st.pl[1].cheeks = 1; st.pl[1].eaten = st.goal - 1; st.pl[0].hicT = 1;
    atClap(st, 2, 0); gulp(1);
    ok('the loser hiccuping at the end: "Pip had the hiccups!"', G.match.end && G.match.end.reason === 'Pip had the hiccups!', G.match.end && G.match.end.reason);
    // both at once: a tie
    st = fresh();
    for (const k of [0, 1]) { const X = st.pl[k]; X.pie = 2; X.left = 0; X.cheeks = 1; X.eaten = st.goal - 1; }
    atClap(st, 2, 0);
    G.players[0].input.jump = true; G.players[1].input.jump = true; P.step(DT);
    ok('both finishing in the same tick is a tie (replayed)', G.match.end && G.match.end.winner === -1, G.match.end && G.match.end.reason);
    // time up
    st = fresh();
    st.pl[0].eaten = 20; st.pl[1].eaten = 23; G.match.timeLeft = DT / 2; P.step(DT);
    ok('time up: more swallowed wins ("Time! Bo ate the most!")', G.match.end && G.match.end.winner === 1 && G.match.end.reason === 'Time! Bo ate the most!', G.match.end && G.match.end.reason);
    st = fresh();
    st.pl[0].eaten = 20; st.pl[1].eaten = 20; G.match.timeLeft = DT / 2; P.step(DT);
    ok('time up level: a tie', G.match.end && G.match.end.winner === -1, G.match.end && G.match.end.reason);
    ok('the round clock is 60 s', G.match.roundTime === 60);
    // the tiebreak
    st = fresh(); st.stat.perfect = [5, 9];
    const tb = M.tiebreak();
    ok('tiebreak: more GULP!s this match', tb && tb.winner === 1, JSON.stringify(tb));
    st.stat.perfect = [4, 4];
    ok('tiebreak level: replay', M.tiebreak() === -1);

    /* ---------- a held ▲ through the countdown is not a gulp ---------- */
    M.testRound = 0; M.testNoHelp = false;
    G.cpuOn = [false, false]; P.loadLevel(idx); G.cpuOn = [false, false]; G.introT = 0;
    st = G.mst;
    let n = 0; while (G.match.phase !== 'count' && n++ < 2000) P.step(DT);
    G.players[0].input.jump = true;
    st.pl[0].cheeks = 0;
    while (G.match.phase !== 'live' && n++ < 4000) P.step(DT);
    run(0.3);
    ok('holding ▲ through the 3-2-1 does not gulp at GO', st.pl[0].gulpT === 0 && st.pl[0].H === 0, st.pl[0].pop);
    G.players[0].input.jump = false;

    /* ---------- the stick (input.up) gulps too ---------- */
    st = fresh();
    E = st.pl[1]; atClap(st, 1, -1); bite(1); run(0.4); bite(1);
    atClap(st, 2, 0);
    G.players[1].input.up = true; P.step(DT); G.players[1].input.up = false; P.step(DT);
    ok('stick ▲ (input.up) gulps', E.eaten === 4, E.eaten);

    /* ---------- gold help ---------- */
    // round 2 after Pip won round 1: Bo gets gold gulps (a wider window)
    st = fresh();
    G.match.wins = [1, 0]; G.match.round = 2;
    M.resetRound(2, { first: false, replay: false, suddenDeath: false, wins: [1, 0] });
    st = G.mst;
    ok('1 round behind: gold gulps (level 1) for Bo only', st.pl[1].gold === 1 && st.pl[0].gold === 0);
    st.bph = 1 + 0.25 / per(st);
    ok('gold gulps: a gulp 0.25 s late still counts for Bo, not for Pip', M.test.onBeat(st, st.pl[1]) && !M.test.onBeat(st, st.pl[0]));
    st.bph = 1 - 0.17 / per(st);
    ok('gold gulps: 0.17 s early counts for Bo, not for Pip', M.test.onBeat(st, st.pl[1]) && !M.test.onBeat(st, st.pl[0]));
    M.resetRound(3, { first: false, replay: false, suddenDeath: false, wins: [2, 0] });
    st = G.mst;
    ok('2 rounds behind: gold gulps + gold tummy', st.pl[1].gold === 2);
    st.ph = 'eat'; G.match.phase = 'live';
    st.pl[1].lastBite = -9; st.pl[1].H = 0; st.rt = 5; st.pl[1].lastBite = 4.9; st.bph = 3.5;
    G.players[1].pendingAct = true; P.step(DT);
    ok('gold tummy: a too-quick bite adds 30% less (0.32 -> 0.224)', near(st.pl[1].H, 0.224 - Q.drain * DT, 0.01), st.pl[1].H.toFixed(3));
    M.resetRound(4, { first: false, replay: false, suddenDeath: true, wins: [2, 1] });
    st = G.mst;
    ok('no gold help in sudden death; the Sudden Slurp is one pie', st.pl.every(X => X.gold === 0) && st.R.pies === 1 && st.R.name === 'Sudden Slurp', st.R.name);
    st = fresh({ noHelp: true });
    G.match.wins = [2, 0];
    M.resetRound(3, { first: false, replay: false, suddenDeath: false, wins: [2, 0] });
    ok('(bot tests can switch the help off)', G.mst.pl[1].gold === 0);

    /* ---------- the rounds ---------- */
    const names = [1, 2, 3, 4, 5].map(r => { M.resetRound(r, { first: false, replay: false, suddenDeath: false, wins: [0, 0] }); return G.mst.R.name + ' ' + G.mst.R.pies + 'x' + G.mst.R.bites; });
    ok('rounds: Cherry, Blueberry, Apple, Giant Pumpkin (2 big pies), Triple Berry Final', names.join(',') === 'Cherry Pie 3x26,Blueberry Pie 3x26,Apple Pie 3x26,Giant Pumpkin Pie 2x38,Triple Berry Final 3x26', names.join(','));
    st = G.mst; st.rt = 0;
    const p0 = per(st); st.rt = 30; const p1 = per(st);
    ok('the final speeds the claps up from 1.45 s to 1.25 s', near(p0, 1.45) && near(p1, 1.25), p0 + ' -> ' + p1);

    /* ---------- the claps ---------- */
    st = fresh();
    let claps = 0, last = st.clapN;
    for (let i = 0; i < Math.round(6.05 / DT); i++) { P.step(DT); if (st.clapN !== last) { claps++; last = st.clapN; } }
    ok('the crowd claps every 1.5 s in round 1 (4 claps in 6 s)', claps === 4, claps);

    /* ---------- stats tiles ---------- */
    st = fresh();
    st.stat.perfect = [7, 3]; st.stat.hics = [0, 2]; st.stat.bestStreak = [5, 2]; st.pl[0].eaten = 39; st.pl[1].eaten = 13;
    const tiles = M.stats();
    const lab = tiles.filter(t => typeof t === 'object').map(t => t.label + ' ' + t.values.join('-')).join(', ');
    ok('stats tiles: Rounds won, Pies eaten, GULP!s, Hiccups', lab === 'Rounds won 0-0, Pies eaten 1.5-0.5, GULP!s 7-3, Hiccups 0-2', lab);
    const lines = tiles.filter(t => typeof t === 'string');
    ok('stats lines: best gulp streak and calmest tummy', lines[0] === '★ Best gulp streak: Pip, 5 in a row!' && lines[1] === 'Calmest tummy: Pip (0 hiccups)', lines.join(' | '));
    M.testRound = 0; M.testNoHelp = false;
    return out;
  });
  let fails = 0;
  for (const [pass, name, info] of res) { if (!pass) fails++; console.log((pass ? 'PASS ' : 'FAIL ') + name + (info && !pass ? '   [' + info + ']' : '')); }
  console.log(`${res.length - fails}/${res.length} passed`);
  console.log(errors.length ? 'PAGE ERRORS\n' + errors.slice(0, 5).join('\n') : 'no page errors');
  await browser.close();
  process.exit(fails || errors.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
