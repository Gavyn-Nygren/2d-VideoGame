#!/usr/bin/env node
// 30-1 The Time Thief, era 'dino': the REAL input paths. Each device must move the game, and the hint bubbles must
// name that device's own keys.
//   1. Keyboard, real time: real key events (page.keyboard) with G.manual false, the page's own frame loop running.
//      Pip (W A S D + F) carries, Bo (arrows + /) clears: walk, hop, duck, smash the first boulder, toss the egg.
//   2. Controller: a stubbed navigator.getGamepads; pollInput + step by hand. Stick, A (jump), X (action), stick down.
//   3. Touch: a phone-sized page with touch; pointer events on the on-screen pads (◀ ▶ ▲ ▼ and the round button).
//   4. 1-player mode: the person's hints name keys, the computer's player never gets a key hint.
// Usage: node tools/w30/dino-keys.js        (exit code 1 if a check fails)
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const URL = 'file://' + path.resolve(__dirname, '..', '..', 'index.html');
let bad = 0;
const check = (name, ok, extra) => { if (!ok) bad++; console.log((ok ? '  ok    ' : '  FAIL  ') + name + (extra !== undefined ? '   ' + JSON.stringify(extra) : '')); };
const sleep = (page, ms) => page.waitForTimeout(ms);

async function open(browser, opts, errors) {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.addInitScript(() => {
    window.__pad = { on: false, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) };
    navigator.getGamepads = () => [window.__pad.on ? { id: 'Xbox stub (STANDARD GAMEPAD)', index: 0, connected: true, mapping: 'standard', timestamp: performance.now(), axes: window.__pad.axes, buttons: window.__pad.buttons } : null, null, null, null];
  });
  await page.goto(URL);
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.MODES && window.__pipbo.MODES.timethief);
  return page;
}
// what the test looks at (world coords)
const snap = page => page.evaluate(() => {
  const P = window.__pipbo, G = P.G, st = G.mst, ph = st.ph, cam = st.cam;
  return { mode: G.mode, phT: st.phT, started: ph.started, egg: ph.egg.state, by: ph.egg.by,
    x: G.players.map(p => Math.round(p.x + p.w / 2 + cam.x)), y: G.players.map(p => Math.round(p.y + p.h + cam.y)), vy: G.players.map(p => Math.round(p.vy)),
    duck: ph.P.map(q => q.duck), hints: st.hints.map(h => (h ? h.text : '')), labels: [0, 1].map(i => G.level.def.act.labels[i]),
    smashed: st.stats.dino.smashed || 0, tosses: st.stats.dino.tosses || 0, boulder: ph.c.obs[0].hits, thief: ph.th.mode,
    btns: Array.from(document.querySelectorAll('.tbtn-act')).map(e => e.textContent) };
});

(async () => {
  const browser = await chromium.launch();
  const errors = [];

  /* ---------- 1. keyboard, real time ---------- */
  console.log('KEYBOARD (real key events, real time)');
  {
    const page = await open(browser, { viewport: { width: 1280, height: 800 } }, errors);
    await page.evaluate(() => {
      const P = window.__pipbo, G = P.G;
      P.cpuSetCfg('players', 2); G.cpuOn = [false, false];
      P.MODES.timethief.test.jump(0, { seed: 5 });
      G.manual = false;   // the page's own loop runs the game
      G.mst.ph.atkT = 99;  // (no tricks while we test the keys)
    });
    await page.keyboard.down('KeyD'); await sleep(page, 300); await page.keyboard.up('KeyD');   // (a press: nobody is "away")
    await page.waitForFunction(() => window.__pipbo.G.mst.ph.started, null, { timeout: 8000 });
    let s = await snap(page);
    check('the egg dropped into Pip\'s hands', s.egg === 'held' && s.by === 0, { egg: s.egg, by: s.by });
    check('Pip\'s hint names D', / D$/.test(s.hints[0]), s.hints[0]);
    check('Bo\'s hint names /', /\/$/.test(s.hints[1]), s.hints[1]);
    check('act words: Pip toss, Bo smash', s.labels[0] === 'toss' && s.labels[1] === 'smash', s.labels);
    const x0 = s.x.slice();
    await page.keyboard.down('KeyD'); await sleep(page, 1000); await page.keyboard.up('KeyD');
    s = await snap(page);
    check('D walks Pip right, slowly (heavy egg)', s.x[0] - x0[0] > 80 && s.x[0] - x0[0] < 190, s.x[0] - x0[0]);
    await page.keyboard.down('KeyS'); await sleep(page, 250);
    s = await snap(page);
    check('S ducks with the egg', s.duck[0] === true);
    await page.keyboard.up('KeyS'); await sleep(page, 100);
    await page.keyboard.down('KeyW'); await sleep(page, 90);
    s = await snap(page);
    check('W hops (a small hop)', s.vy[0] < -100 && s.vy[0] >= -400, s.vy[0]);
    await page.keyboard.up('KeyW');
    // Bo runs to the boulder and smashes it with 4 taps of /
    await page.keyboard.down('ArrowRight');
    await page.waitForFunction(() => { const G = window.__pipbo.G, st = G.mst, o = st.ph.c.obs[0], p = G.players[1]; return p.x + p.w + st.cam.x > o.x0 - 20; }, null, { timeout: 6000 });
    await page.keyboard.up('ArrowRight'); await sleep(page, 150);
    for (let k = 0; k < 4; k++) { await page.keyboard.down('Slash'); await sleep(page, 70); await page.keyboard.up('Slash'); await sleep(page, 180); }
    s = await snap(page);
    check('4 taps of / smash the boulder', s.smashed === 1, { smashed: s.smashed, hits: s.boulder });
    // Bo comes back; Pip looks at Bo and tosses with F
    await page.keyboard.down('ArrowLeft');
    await page.waitForFunction(() => { const ps = window.__pipbo.G.players; return ps[1].x - ps[0].x < 120; }, null, { timeout: 6000 });
    await page.keyboard.up('ArrowLeft');
    await page.keyboard.down('KeyD'); await sleep(page, 120); await page.keyboard.up('KeyD'); await sleep(page, 150);
    await page.keyboard.down('KeyF'); await sleep(page, 80); await page.keyboard.up('KeyF');
    await page.waitForFunction(() => { const e = window.__pipbo.G.mst.ph.egg; return e.state === 'held' && e.by === 1; }, null, { timeout: 4000 }).catch(() => {});
    s = await snap(page);
    check('F tosses the egg to Bo', s.egg === 'held' && s.by === 1 && s.tosses === 1, { egg: s.egg, by: s.by });
    check('the words swap: Pip smash, Bo toss', s.labels[0] === 'smash' && s.labels[1] === 'toss', s.labels);
    check('Bo is told how to toss back (/)', /\//.test(s.hints[1]), s.hints[1]);
    await page.keyboard.down('ArrowDown'); await sleep(page, 250);
    s = await snap(page);
    check('↓ ducks Bo with the egg', s.duck[1] === true);
    await page.keyboard.up('ArrowDown');
    await page.close();
  }

  /* ---------- 2. controller (stubbed), stepped by hand ---------- */
  console.log('CONTROLLER (stubbed navigator.getGamepads)');
  {
    const page = await open(browser, { viewport: { width: 1280, height: 800 } }, errors);
    const r = await page.evaluate(() => {
      const P = window.__pipbo, G = P.G, out = {};
      P.cpuSetCfg('players', 2); G.cpuOn = [false, false]; G.manual = true;
      const pad = window.__pad, press = (b, on) => { pad.buttons[b] = { pressed: on, value: on ? 1 : 0 }; };
      const run = n => { for (let i = 0; i < n; i++) { P.pollInput(P.DT); P.step(P.DT); } };
      pad.on = true; press(0, true); P.pollInput(P.DT); press(0, false); P.pollInput(P.DT);   // the first controller pressed plays Pip
      P.MODES.timethief.test.jump(0, { seed: 5 });
      const st = G.mst, ph = st.ph, p = G.players[0], cx = () => p.x + p.w / 2 + st.cam.x;
      ph.atkT = 99;
      pad.axes[0] = 1; run(40); pad.axes[0] = 0;
      for (let i = 0; i < 400 && !ph.started; i++) run(1);
      out.started = ph.started; out.hint = st.hints[0] ? st.hints[0].text : '';
      const xa = cx();
      pad.axes[0] = 1; run(120); pad.axes[0] = 0; run(10);
      out.moved = Math.round(cx() - xa);
      pad.axes[1] = 1; run(20); out.duck = ph.P[0].duck; pad.axes[1] = 0; run(10);
      press(0, true); run(8); out.hopVy = Math.round(p.vy); press(0, false); run(60);
      // the Thief dives: the carrier's hint names the stick, Bo's (keyboard) hint names /
      ph.atkN = 1; ph.atkT = 0; run(3);
      out.thief = ph.th.mode; out.diveHint = st.hints[0] ? st.hints[0].text : ''; out.boHint = st.hints[1] ? st.hints[1].text : '';
      pad.axes[1] = 1; run(Math.round((ph.th.aim + 0.7) / P.DT)); pad.axes[1] = 0;
      out.ducks = st.stats.dino.ducks || 0; out.snatched = st.stats.dino.snatched || 0;
      // X tosses to Bo standing next to Pip
      G.players[1].x = p.x + 60; run(60);
      pad.axes[0] = 1; run(4); pad.axes[0] = 0; run(20);
      press(2, true); run(4); press(2, false); run(120);
      out.eggBy = ph.egg.by; out.tosses = st.stats.dino.tosses || 0;
      out.key = { act: tthKey(0, 'act'), down: tthKey(0, 'down'), jump: tthKey(0, 'jump'), boAct: tthKey(1, 'act') };
      return out;
    });
    check('the stick walks Pip right', r.started && r.moved > 80, r.moved);
    check('Pip\'s start hint names the stick', /stick/.test(r.hint), r.hint);
    check('stick down ducks', r.duck === true);
    check('A hops', r.hopVy < -100, r.hopVy);
    check('the dive hint names "stick down"', r.thief === 'aim' && /stick down/.test(r.diveHint), r.diveHint);
    check('Bo (keyboard) is told to whack with /', /\//.test(r.boHint), r.boHint);
    check('ducking makes the Thief miss', r.ducks === 1 && r.snatched === 0, { ducks: r.ducks, snatched: r.snatched });
    check('X tosses the egg', r.eggBy === 1 && r.tosses === 1, { by: r.eggBy, tosses: r.tosses });
    check('tthKey: pad names for Pip, keys for Bo', r.key.down === 'stick down' && r.key.boAct === '/' && r.key.act !== 'F', r.key);
    await page.close();
  }

  /* ---------- 3. touch (a phone) ---------- */
  console.log('TOUCH (844x390 phone, pointer events on the pads)');
  {
    const page = await open(browser, { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }, errors);
    await page.evaluate(() => {
      const P = window.__pipbo, G = P.G;
      enableTouch(); Pads.lastNonPad = 'touch'; setKind('touch');
      P.cpuSetCfg('players', 2); G.cpuOn = [false, false]; G.manual = true;
      P.MODES.timethief.test.jump(0, { seed: 5 });
      G.mst.ph.atkT = 99;
    });
    await sleep(page, 200);
    const run = n => page.evaluate(k => { const P = window.__pipbo; for (let i = 0; i < k; i++) { P.pollInput(P.DT); P.step(P.DT); } }, n);
    const down = (sel, id, pos) => page.dispatchEvent(sel, 'pointerdown', Object.assign({ pointerId: id, bubbles: true }, pos || {}));
    const up = (sel, id) => page.dispatchEvent(sel, 'pointerup', { pointerId: id, bubbles: true });
    const rightOf = async sel => { const b = await page.locator(sel).boundingBox(); return { clientX: b.x + b.width * 0.78, clientY: b.y + b.height / 2 }; };
    const vis = await page.$$eval('.tbtn', els => els.filter(e => e.offsetParent !== null).length);
    check('the touch pads show (2 x 5 buttons)', vis === 10, vis);
    const pr = await rightOf('#padPip .tmove');
    await down('#padPip .tmove', 11, pr); await run(40); await up('#padPip .tmove', 11);
    for (let i = 0; i < 40; i++) { await run(10); if ((await snap(page)).started) break; }
    let s = await snap(page);
    check('round buttons say toss / smash', s.btns[0] === 'toss' && s.btns[1] === 'smash', s.btns);
    check('Pip\'s hint names ▶', /▶/.test(s.hints[0]), s.hints[0]);
    check('Bo\'s hint names "the smash button"', /the smash button/.test(s.hints[1]), s.hints[1]);
    const xa = s.x[0];
    await down('#padPip .tmove', 12, pr); await run(120); await up('#padPip .tmove', 12); await run(10);
    s = await snap(page);
    check('▶ walks Pip right', s.x[0] - xa > 80, s.x[0] - xa);
    await down('#padPip .tact[data-k="down"]', 13); await run(20);
    s = await snap(page);
    check('▼ ducks', s.duck[0] === true);
    await up('#padPip .tact[data-k="down"]', 13); await run(10);
    await down('#padPip .tact[data-k="jump"]', 14); await run(8);
    s = await snap(page);
    check('▲ hops', s.vy[0] < -100, s.vy[0]);
    await up('#padPip .tact[data-k="jump"]', 14); await run(60);
    // Bo: ▶ to the boulder, 4 taps of the round button
    const br = await rightOf('#padBo .tmove');
    await down('#padBo .tmove', 15, br);
    for (let i = 0; i < 60; i++) { await run(10); if (await page.evaluate(() => { const G = window.__pipbo.G, st = G.mst, o = st.ph.c.obs[0], p = G.players[1]; return p.x + p.w + st.cam.x > o.x0 - 20; })) break; }
    await up('#padBo .tmove', 15); await run(20);
    for (let k = 0; k < 4; k++) { await down('#padBo .tbtn-act', 16 + k); await run(8); await up('#padBo .tbtn-act', 16 + k); await run(22); }
    s = await snap(page);
    check('4 taps of the round button smash the boulder', s.smashed === 1, { smashed: s.smashed, hits: s.boulder });
    // the dive: touch hints, and Bo's button says whack
    await page.evaluate(() => { const G = window.__pipbo.G, ph = G.mst.ph, a = G.players[0], b = G.players[1]; b.x = a.x + 90; ph.atkN = 1; ph.atkT = 0; });
    await run(4);
    s = await snap(page);
    check('the dive: Pip is told to hold ▼', s.thief === 'aim' && /▼/.test(s.hints[0]), s.hints[0]);
    check('the dive: Bo\'s button says whack and the hint names it', s.btns[1] === 'whack' && /the whack button/.test(s.hints[1]), { btn: s.btns[1], hint: s.hints[1] });
    await run(Math.round(0.9 / (1 / 120)));
    await down('#padBo .tbtn-act', 30); await run(6); await up('#padBo .tbtn-act', 30); await run(10);
    s = await snap(page);
    check('the round button whacks the claw away', s.thief === 'dizzy', s.thief);
    // toss
    const pl = await page.locator('#padPip .tmove').boundingBox();
    await down('#padPip .tmove', 31, pr); await run(4); await up('#padPip .tmove', 31); await run(30);
    await down('#padPip .tbtn-act', 32); await run(6); await up('#padPip .tbtn-act', 32); await run(120);
    s = await snap(page);
    check('the round button tosses the egg to Bo', s.by === 1 && s.egg === 'held', { by: s.by, egg: s.egg });
    check('the buttons swap words', s.btns[0] !== 'toss' && s.btns[1] === 'toss', s.btns);
    void pl;
    await page.close();
  }

  /* ---------- 4. 1-player mode: no key hints for the computer's player ---------- */
  console.log('1-PLAYER (the person plays Pip, the computer plays Bo)');
  {
    const page = await open(browser, { viewport: { width: 1280, height: 800 } }, errors);
    const r = await page.evaluate(() => {
      const P = window.__pipbo, G = P.G, out = { cpuHints: [], pipHints: [] };
      P.cpuSetCfg('players', 1); P.cpuSetCfg('human', 0); G.manual = true;
      P.MODES.timethief.test.jump(0, { seed: 5 });
      const st = G.mst, p = G.players[0];
      for (let i = 0; i < 120 * 25; i++) {
        p.input.right = true;   // the person just walks right with the egg
        P.step(P.DT);
        const h1 = st.hints[1], h0 = st.hints[0];
        if (h1 && !out.cpuHints.includes(h1.text)) out.cpuHints.push(h1.text);
        if (h0 && !out.pipHints.includes(h0.text)) out.pipHints.push(h0.text);
      }
      out.smashed = st.stats.dino.smashed || 0; out.cpu = G.cpuOn.slice();
      out.bubbles = P.CPU.bubbles.map(b => (b ? b.text : ''));
      return out;
    });
    check('the computer plays Bo and smashes for the person', r.cpu[1] === true && r.smashed >= 1, r.smashed);
    check('no key names in the computer\'s hints', r.cpuHints.every(t => !/[\/↑↓←→]|button|Tap |Hold /.test(t)), r.cpuHints);
    check('the person\'s hints name Pip\'s keys', r.pipHints.some(t => / D$| F$| S$| W$/.test(t)), r.pipHints);
    await page.close();
  }

  console.log(errors.length ? 'PAGE ERRORS:\n' + errors.slice(0, 8).join('\n') : 'no page errors');
  console.log(bad || errors.length ? 'FAILED: ' + bad + ' check(s)' : 'ALL OK');
  await browser.close();
  process.exit(bad || errors.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
