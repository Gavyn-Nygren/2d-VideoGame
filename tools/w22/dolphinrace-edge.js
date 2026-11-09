#!/usr/bin/env node
// 22-4 Dolphin Race: edge cases (QA review). Restart mid-round / during the banner / on the results card, pause and
// resume in real time, time-up wins and ties, two ties in a row (tiebreak on hoops, replay, sudden death with no gold
// help), catch-up help flags, leaving for another level and coming back, Rematch, and the computer from both sides.
//   node tools/w22/dolphinrace-edge.js
'use strict';
const path = require('path');
const { chromium } = require('playwright');
let fails = 0;
const check = (ok, msg) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) fails++; };
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  await page.evaluate(() => {
    const P = window.__pipbo, G = P.G;
    window.__idx = P.LEVELS.findIndex(l => l.name === 'Dolphin Race');
    window.__load = () => { G.manual = true; G.cpuOn = [false, false]; P.loadLevel(window.__idx); G.cpuOn = [false, false]; G.introT = 0; };
    window.__clear = () => { for (const p of G.players) { for (const k in p.input) p.input[k] = false; p.pendingAct = false; p.pendingJump = false; } };
    window.__run = (secs, until) => { const n = Math.round(secs / P.DT); for (let k = 0; k < n && G.mode === 'play'; k++) { window.__clear(); P.step(P.DT); if (until && until()) return true; } return false; };
    window.__live = () => window.__run(10, () => G.match.phase === 'live');
  });

  // 1. time-up: the farther dolphin wins; a near tie is a tie
  let r = await page.evaluate(() => {
    const P = window.__pipbo, G = P.G; window.__load(); window.__live(); window.__run(3);
    const st = G.mst; st.pl[0].x = st.pl[1].x + 200; G.match.timeLeft = 0.02;
    window.__run(0.1);
    const a = G.match.history.slice(-1)[0];
    return { w: a && a.winner, reason: a && a.reason, ph: G.match.phase };
  });
  check(r.w === 0 && /Time/.test(r.reason), 'time-up: farther dolphin (Pip) wins: ' + JSON.stringify(r));

  // 2. two ties in a row -> tiebreak on hoops; equal hoops -> replay, sudden death switches gold help off
  r = await page.evaluate(() => {
    const P = window.__pipbo, G = P.G; window.__load(); G.match.wins = [0, 1];
    const out = [];
    for (let i = 0; i < 2; i++) {
      window.__run(15, () => G.match.phase === 'live'); window.__run(1);
      const st = G.mst; st.pl[1].x = st.pl[0].x + 3; G.match.timeLeft = 0.02; window.__run(0.1);
      out.push(G.match.history.slice(-1)[0]);
    }
    window.__run(15, () => G.match.phase === 'live');
    const st = G.mst;
    return { h: out.map(h => h.winner + ':' + h.reason), sd: G.match.suddenDeath, gold: st.pl.map(D => D.gold), fins: st.pl.map(D => D.fins) };
  });
  check(r.h[0].startsWith('-1') && r.h[1].startsWith('-1') && r.sd === true && r.gold.every(g => g === 0), 'two ties (no hoops) replay in sudden death with no gold: ' + JSON.stringify(r));
  r = await page.evaluate(() => {
    const P = window.__pipbo, G = P.G; window.__load();
    for (let i = 0; i < 2; i++) {
      window.__run(15, () => G.match.phase === 'live'); window.__run(1);
      const st = G.mst; st.stat.hoops = [2, 5]; st.pl[1].x = st.pl[0].x; G.match.timeLeft = 0.02; window.__run(0.1);
    }
    const h = G.match.history.slice(-1)[0];
    return { h: h.winner + ':' + h.reason + (h.tiebreak ? ' (tiebreak)' : ''), wins: G.match.wins };
  });
  check(r.h.startsWith('1:More hoops'), 'second tie goes to more hoops (Bo): ' + JSON.stringify(r));

  // 3. catch-up help flags: 1 behind = fins, 2 behind = fins + head start
  r = await page.evaluate(() => {
    const P = window.__pipbo, G = P.G; window.__load();
    G.match.wins = [0, 2]; G.match.round = 3; P.MODES.dolphinrace.resetRound(3, { first: false, replay: false, suddenDeath: false, wins: [0, 2] });
    const a = G.mst.pl.map(D => D.gold + '/' + D.fins);
    P.MODES.dolphinrace.go(); const sp = G.mst.pl.map(D => Math.round(D.sp));
    return { a, sp };
  });
  check(r.a[0] === '2/true' && r.a[1] === '0/false' && r.sp[0] > r.sp[1], 'gold catch-up for 2 rounds behind: ' + JSON.stringify(r));

  // 4. restart mid-race, during the round banner and from the results card: clean state each time
  r = await page.evaluate(() => {
    const P = window.__pipbo, G = P.G, out = [];
    const fresh = () => { const st = G.mst, m = G.match; return { round: m.round, wins: m.wins.join('-'), x: st.pl.map(D => Math.round(D.x)).join('/'), hoops: st.stat.hoops.join('/'), mode: G.mode }; };
    window.__load(); window.__live(); window.__run(8); P.loadLevel(window.__idx); G.introT = 0; out.push(fresh());
    window.__live(); window.__run(80, () => G.match.phase === 'end'); P.loadLevel(window.__idx); G.introT = 0; out.push(fresh());
    // play a whole match with a simple scripted rider, then restart from the results card
    window.__load(); let n = 0;
    while (G.mode === 'play' && n++ < 120 * 600) { window.__clear(); G.players[0].input.down = (n % 300) < 60; P.step(P.DT); }
    const resMode = G.mode; P.loadLevel(window.__idx); G.introT = 0; out.push(fresh());
    return { out, resMode };
  });
  check(r.out.every(f => f.round === 1 && f.wins === '0-0' && f.x === '150/150' && f.hoops === '0/0' && f.mode === 'play') && r.resMode === 'clear',
    'restart mid-race / on the banner / from results is clean: ' + JSON.stringify(r));

  // 5. leave for another level and come back: nothing leaks
  r = await page.evaluate(() => {
    const P = window.__pipbo, G = P.G; window.__load(); window.__live(); window.__run(5);
    P.loadLevel(window.__idx - 1); G.introT = 0; window.__run(2);
    window.__load(); window.__live(); window.__run(2);
    const st = G.mst; return { ok: !!st.course && st.pl.length === 2 && st.stat.bumps.join() !== undefined, alive: G.players.map(p => p.alive), mode: G.mode };
  });
  check(r.ok && r.alive.every(a => a === false) && r.mode === 'play', 'away to another level and back: ' + JSON.stringify(r));

  // 6. real time (G.manual false): Esc pauses (dolphins freeze), Esc resumes, R restarts
  await page.evaluate(() => { const P = window.__pipbo, G = P.G; G.manual = false; G.cpuOn = [false, false]; P.loadLevel(window.__idx); G.cpuOn = [false, false]; });
  await page.waitForTimeout(300);
  await page.keyboard.press('Enter'); await page.waitForTimeout(200);
  await page.waitForFunction(() => window.__pipbo.G.match && window.__pipbo.G.match.phase === 'live', null, { timeout: 15000 });
  await page.waitForTimeout(1500);
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  const x1 = await page.evaluate(() => ({ mode: window.__pipbo.G.mode, x: window.__pipbo.G.mst.pl[0].x }));
  await page.waitForTimeout(700);
  const x2 = await page.evaluate(() => ({ mode: window.__pipbo.G.mode, x: window.__pipbo.G.mst.pl[0].x }));
  check(x1.mode === 'paused' && x1.x === x2.x, 'Esc pauses and the dolphins hold still: ' + JSON.stringify([x1, x2]));
  await page.keyboard.press('Escape'); await page.waitForTimeout(600);
  const x3 = await page.evaluate(() => ({ mode: window.__pipbo.G.mode, x: window.__pipbo.G.mst.pl[0].x }));
  check(x3.mode === 'play' && x3.x > x2.x, 'Esc resumes: ' + JSON.stringify(x3));
  await page.keyboard.press('r'); await page.waitForTimeout(300);
  const x4 = await page.evaluate(() => ({ mode: window.__pipbo.G.mode, x: window.__pipbo.G.mst.pl.map(D => D.x), round: window.__pipbo.G.match.round }));
  check(x4.mode === 'play' && x4.round === 1 && x4.x[0] === 150, 'R restarts: ' + JSON.stringify(x4));

  // 7. Rematch from the results card (real button) starts a fresh match
  r = await page.evaluate(() => {
    const P = window.__pipbo, G = P.G; window.__load(); let n = 0;
    while (G.mode === 'play' && n++ < 120 * 600) { window.__clear(); P.step(P.DT); }
  });
  await page.waitForTimeout(2000);
  r = await page.evaluate(() => {
    const G = window.__pipbo.G, res = G.mode;
    const b = [...document.querySelectorAll('#overlay button')].find(e => /Rematch/i.test(e.textContent));
    if (b) b.click();
    G.introT = 0; window.__run(0.5);
    return { res, had: !!b, mode: G.mode, round: G.match && G.match.round, wins: G.match && G.match.wins.join('-') };
  });
  check(r.had && r.mode === 'play' && r.round === 1 && r.wins === '0-0', 'Rematch starts fresh: ' + JSON.stringify(r));

  // 8. 1 player: the computer rides either dolphin at every skill and the person (pressing ▼ now and then) still
  //    plays the match to the end
  for (const who of [0, 1]) for (const sk of ['easy', 'hard']) {
    r = await page.evaluate(({ who, sk }) => {
      const P = window.__pipbo, G = P.G; G.manual = true;
      P.CPU.skillOf = who ? [null, sk] : [sk, null];
      G.cpuOn = who ? [false, true] : [true, false]; P.loadLevel(window.__idx); G.cpuOn = who ? [false, true] : [true, false]; G.introT = 0;
      let n = 0, hoops = 0;
      while (G.mode === 'play' && n++ < 120 * 600) {
        const hp = G.players[1 - who]; for (const k in hp.input) hp.input[k] = false;
        hp.input.down = (n % 400) < 50; P.step(P.DT);
      }
      P.CPU.skillOf = [null, null];
      return { mode: G.mode, wins: G.match.wins.join('-'), cpuHoops: G.mst.stat.hoops[who] };
    }, { who, sk });
    check(r.mode === 'clear' && !r.wins.startsWith('2-2'), 'computer as ' + (who ? 'Bo' : 'Pip') + ' (' + sk + ') vs a slow person: ' + JSON.stringify(r));
  }
  check(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.slice(0, 4).join(' | ') : ''));
  await browser.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
