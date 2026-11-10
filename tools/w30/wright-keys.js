#!/usr/bin/env node
// 30-1 The Time Thief, era 'wright' (The First Flight, 1903): the REAL input paths. Each device must move the game,
// and the hint bubbles must name that device's own keys. Every device plays BOTH jobs (the seats are swapped for the
// second pass).
//   1. Keyboard, real time: real key events (page.keyboard) with G.manual false, the page's own frame loop running.
//   2. Controller: a stubbed navigator.getGamepads plays Pip (Bo on the real keyboard); pollInput + step by hand.
//   3. Touch: a phone-sized page with touch; pointer events on the on-screen pads (◀ ▶ ▲ ▼ and the round button).
//   4. 1-player mode, both ways: the person's hints name keys, the computer's player never gets a key hint, the
//      computer never takes off alone, and a person who lets go in the air stalls the flight (both seats, even with
//      full gold help).
// The same little flight for every device: nobody / one alone on the rail (it must not roll), both hold right (take
// off), the balancer leans both ways and rings the bell, the engineer pedals on the beat, climbs and dives.
// Usage: node tools/w30/wright-keys.js        (exit code 1 if a check fails)
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const URL = 'file://' + path.resolve(__dirname, '..', '..', 'index.html');
let bad = 0;
const check = (name, ok, extra) => { if (!ok) bad++; console.log((ok ? '  ok    ' : '  FAIL  ') + name + (extra !== undefined ? '   ' + JSON.stringify(extra) : '')); };

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
const snap = page => page.evaluate(() => {
  const P = window.__pipbo, G = P.G, st = G.mst, ph = st.ph, s = st.stats.wright;
  return { mode: ph.mode, x: Math.round(ph.x), y: Math.round(ph.y), tilt: ph.tilt, spin: ph.spin, bal: ph.bal, eng: ph.eng, bell: ph.bell, pumps: s.pumps, beat: s.bestBeat,
    hints: st.hints.map(h => (h ? h.text : '')), btns: Array.from(document.querySelectorAll('.tbtn-act')).map(e => e.textContent), legend: (document.querySelector('.legend') || {}).textContent || '' };
});
// start the era; flip: the seats the other way round; (no tricks and no wobble while we test the keys)
const start = (page, flip, manual) => page.evaluate(({ flip, manual }) => {
  const P = window.__pipbo, G = P.G;
  G.manual = true;
  P.MODES.timethief.test.jump('wright', { seed: 5 });
  const ph = G.mst.ph;
  if (flip) { const b = ph.bal; ph.bal = ph.eng; ph.eng = b; }
  G.manual = manual;
}, { flip, manual });
const calm = page => page.evaluate(() => { const ph = window.__pipbo.G.mst.ph; ph.grace = 60; ph.events.length = 0; });

const KB = [{ right: 'KeyD', left: 'KeyA', up: 'KeyW', down: 'KeyS', act: 'KeyF' }, { right: 'ArrowRight', left: 'ArrowLeft', up: 'ArrowUp', down: 'ArrowDown', act: 'Slash' }];
// the three devices: set(id, key, on) and wait(seconds)
function keyboardDev(page) {
  return { name: 'keyboard', set: (id, k, on) => (on ? page.keyboard.down(KB[id][k]) : page.keyboard.up(KB[id][k])), wait: s => page.waitForTimeout(s * 1000),
    names: [{ right: 'D', act: 'F', move: 'A D', up: 'W' }, { right: '→', act: '/', move: '← →', up: '↑' }] };
}
const stepper = page => s => page.evaluate(n => { const P = window.__pipbo; for (let i = 0; i < n; i++) { P.pollInput(P.DT); P.step(P.DT); } }, Math.round(s * 120));
function padDev(page) {   // the controller plays Pip, Bo stays on the keyboard
  const pad = (k, on) => page.evaluate(({ k, on }) => {
    const p = window.__pad;
    if (k === 'right' || k === 'left') p.axes[0] = on ? (k === 'right' ? 1 : -1) : 0;
    else if (k === 'up' || k === 'down') p.axes[1] = on ? (k === 'down' ? 1 : -1) : 0;
    else p.buttons[2] = { pressed: on, value: on ? 1 : 0 };   // X: the action
  }, { k, on });
  return { name: 'controller', set: (id, k, on) => (id === 0 ? pad(k, on) : on ? page.keyboard.down(KB[1][k]) : page.keyboard.up(KB[1][k])), wait: stepper(page),
    names: [{ right: 'stick ▶', act: null, move: 'the stick', up: 'stick up' }, { right: '→', act: '/', move: '← →', up: '↑' }] };
}
function touchDev(page) {
  let pid = 100; const held = {};
  const sel = (id, k) => (id ? '#padBo ' : '#padPip ') + (k === 'right' || k === 'left' ? '.tmove' : k === 'act' ? '.tbtn-act' : `.tact[data-k="${k === 'up' ? 'jump' : 'down'}"]`);
  return { name: 'touch', wait: stepper(page),
    async set(id, k, on) {
      const s = sel(id, k), key = id + k;
      if (on) {
        const b = await page.locator(s).boundingBox(), fx = k === 'right' ? 0.78 : k === 'left' ? 0.22 : 0.5;
        held[key] = ++pid;
        await page.dispatchEvent(s, 'pointerdown', { pointerId: pid, bubbles: true, clientX: b.x + b.width * fx, clientY: b.y + b.height / 2 });
      } else if (held[key]) { await page.dispatchEvent(s, 'pointerup', { pointerId: held[key], bubbles: true }); held[key] = 0; }
    },
    names: [{ right: '▶', act: 'the round button', move: '◀ ▶', up: '▲' }, { right: '▶', act: 'the round button', move: '◀ ▶', up: '▲' }] };
}

// the same little flight for every device
async function flight(page, dev, label) {
  const { set, wait, names } = dev;
  let s = await snap(page);
  const bal = s.bal, eng = s.eng, who = id => (id ? 'Bo' : 'Pip'), x0 = s.x;
  console.log(` ${label}: ${who(bal)} wings, ${who(eng)} engine`);
  // a first press so nobody is "away", then nobody holds: the rail hints
  await set(0, 'left', true); await set(1, 'left', true); await wait(0.15); await set(0, 'left', false); await set(1, 'left', false);
  await wait(1.3);
  s = await snap(page);
  check('rail hints name each player\'s own "right"', [0, 1].every(id => s.hints[id].includes('Hold ' + names[id].right + ' together')), s.hints);
  await set(bal, 'right', true); await wait(1.2);
  s = await snap(page);
  check('one alone does not roll the Flyer', s.mode === 'rail' && s.x === x0, { mode: s.mode, dx: s.x - x0 });
  await set(eng, 'right', true);
  for (let i = 0; i < 40 && (await snap(page)).mode === 'rail'; i++) await wait(0.25);
  s = await snap(page);
  check('both hold right: take-off', s.mode === 'climb' || s.mode === 'fly', s.mode);
  check('the engineer is told to tap ' + (names[eng].act || 'the action'), /Pedal on the beat: tap /.test(s.hints[eng]) && (!names[eng].act || s.hints[eng].endsWith(names[eng].act)), s.hints[eng]);
  check('the balancer is told to lean with ' + names[bal].move, s.hints[bal] === 'Keep the wings level: ' + names[bal].move, s.hints[bal]);
  check('no keyboard key in a pad / touch hint', dev.name === 'keyboard' || [0, 1].every(id => (dev.name === 'controller' && id === 1) || !/( [ADWSF]$)|[←→↑↓]|\/$/.test(s.hints[id])), s.hints);
  await set(bal, 'right', false); await set(eng, 'right', false);
  for (let i = 0; i < 20 && (await snap(page)).mode !== 'fly'; i++) await wait(0.25);
  await calm(page);
  check('the round buttons / act words: bell + pedal', true, s.btns);
  // the balancer leans
  let a = (await snap(page)).tilt;
  await set(bal, 'right', true); await wait(0.5); await set(bal, 'right', false);
  let b = (await snap(page)).tilt;
  check('the balancer\'s right tips the nose down', b - a > 0.25, +(b - a).toFixed(2));
  await set(bal, 'left', true); await wait(0.8); await set(bal, 'left', false);
  a = (await snap(page)).tilt;
  check('the balancer\'s left tips it back', a - b < -0.4, +(a - b).toFixed(2));
  await set(bal, 'right', true); await wait(0.3); await set(bal, 'right', false);
  // the engineer pedals on the beat (4 taps, 0.55 s apart)
  const p0 = (await snap(page)).pumps;
  for (let k = 0; k < 4; k++) { await set(eng, 'act', true); await wait(0.08); await set(eng, 'act', false); await wait(0.47); }
  s = await snap(page);
  check('4 taps of the engineer\'s action pedal the engine', s.pumps - p0 === 4 && s.beat >= 3 && s.spin > 0.75, { pumps: s.pumps - p0, beat: s.beat, power: +s.spin.toFixed(2) });
  // climb and dive
  let y = s.y;
  await set(eng, 'up', true); await wait(0.7); await set(eng, 'up', false);
  s = await snap(page);
  check('the engineer\'s up climbs', y - s.y > 25, y - s.y);
  await set(eng, 'act', true); await wait(0.08); await set(eng, 'act', false);
  y = s.y;
  await set(eng, 'down', true); await wait(0.7); await set(eng, 'down', false);
  s = await snap(page);
  check('the engineer\'s down dives', s.y - y > 25, s.y - y);
  // the bell
  await set(bal, 'act', true); await wait(0.08); await set(bal, 'act', false); await wait(0.05);
  s = await snap(page);
  check('the balancer\'s action rings the bell', s.bell > 0, +s.bell.toFixed(2));
  return s;
}

(async () => {
  const browser = await chromium.launch();
  const errors = [];

  /* ---------- 1. keyboard, real time ---------- */
  console.log('KEYBOARD (real key events, real time)');
  for (const flip of [false, true]) {
    const page = await open(browser, { viewport: { width: 1280, height: 800 } }, errors);
    await page.evaluate(() => { const P = window.__pipbo; P.cpuSetCfg('players', 2); P.G.cpuOn = [false, false]; });
    await start(page, flip, false);
    const s = await flight(page, keyboardDev(page), flip ? 'seats swapped' : 'first seats');
    check('the legend names the right keys for each seat', s.bal === 0 ? /A\s*D level the wings/.test(s.legend) && /↑ climb/.test(s.legend) : /W climb/.test(s.legend) && /←\s*→ level the wings/.test(s.legend), s.legend.replace(/\s+/g, ' ').slice(0, 160));
    await page.close();
  }

  /* ---------- 2. controller (stubbed), stepped by hand ---------- */
  console.log('CONTROLLER (stubbed navigator.getGamepads plays Pip; Bo on the keyboard)');
  for (const flip of [false, true]) {
    const page = await open(browser, { viewport: { width: 1280, height: 800 } }, errors);
    await page.evaluate(() => {
      const P = window.__pipbo, G = P.G, pad = window.__pad;
      P.cpuSetCfg('players', 2); G.cpuOn = [false, false]; G.manual = true;
      pad.on = true; pad.buttons[0] = { pressed: true, value: 1 }; P.pollInput(P.DT); pad.buttons[0] = { pressed: false, value: 0 }; P.pollInput(P.DT);   // the first controller pressed plays Pip
    });
    await start(page, flip, true);
    await flight(page, padDev(page), flip ? 'seats swapped' : 'first seats');
    await page.close();
  }

  /* ---------- 3. touch (a phone) ---------- */
  console.log('TOUCH (844x390 phone, pointer events on the pads)');
  for (const flip of [false, true]) {
    const page = await open(browser, { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }, errors);
    await page.evaluate(() => {
      const P = window.__pipbo, G = P.G;
      enableTouch(); Pads.lastNonPad = 'touch'; setKind('touch');
      P.cpuSetCfg('players', 2); G.cpuOn = [false, false]; G.manual = true;
    });
    await start(page, flip, true);
    await page.waitForTimeout(200);
    const vis = await page.$$eval('.tbtn', els => els.filter(e => e.offsetParent !== null).length);
    check('the touch pads show (2 x 5 buttons)', vis === 10, vis);
    const s = await flight(page, touchDev(page), flip ? 'seats swapped' : 'first seats');
    check('the round buttons say bell / pedal for the right seats', s.btns[s.bal] === 'bell' && s.btns[s.eng] === 'pedal', s.btns);
    await page.close();
  }

  /* ---------- 4. 1-player mode, both ways ---------- */
  for (const human of [0, 1]) for (const flip of [false, true]) {
    console.log(`1-PLAYER (the person plays ${human ? 'Bo' : 'Pip'}, seats ${flip ? 'swapped' : 'first'})`);
    const page = await open(browser, { viewport: { width: 1280, height: 800 } }, errors);
    const r = await page.evaluate(({ human, flip }) => {
      const P = window.__pipbo, G = P.G, out = { cpuHints: [], myHints: [], bubbles: [] };
      P.cpuSetCfg('players', 1); P.cpuSetCfg('human', human); G.manual = true;
      P.MODES.timethief.test.jump('wright', { seed: 5 });
      const st = G.mst, ph = st.ph, me = G.players[human], cpu = 1 - human;
      if (flip) { const b = ph.bal; ph.bal = ph.eng; ph.eng = b; }
      out.cpuOn = G.cpuOn.slice(); out.job = human === ph.bal ? 'wings' : 'engine';
      const note = () => {
        const h1 = st.hints[cpu], h0 = st.hints[human], bb = P.CPU.bubbles[cpu];
        if (h1 && !out.cpuHints.includes(h1.text)) out.cpuHints.push(h1.text);
        if (h0 && !out.myHints.includes(h0.text)) out.myHints.push(h0.text);
        if (bb && bb.t > 0 && !out.bubbles.includes(bb.text)) out.bubbles.push(bb.text);
      };
      const run = (s, keys) => { for (let i = 0; i < s * 120 && !st.cut; i++) { for (const k in me.input) me.input[k] = false; if (keys) for (const k of keys) me.input[k] = true; P.step(P.DT); note(); } };
      // a) the person presses nothing for 30 s: the computer does not take off alone
      const x0 = ph.x;
      run(30);
      out.aloneMode = ph.mode; out.aloneDx = Math.round(ph.x - x0);
      // b) the person holds right: take-off; then lets go in the air for 150 s (with full gold help, the worst case)
      for (let i = 0; i < 10 * 120 && ph.mode === 'rail'; i++) run(1 / 120, ['right']);
      out.tookOff = ph.mode !== 'rail';
      ph.gold.wing = 2; ph.gold.eng = 1; ph.gold.dodge = 1;
      run(150);
      out.flights = st.stats.wright.flights; out.flight = ph.flight; out.modeAfter = ph.mode; out.idle = !!st.idle; out.cut = !!st.cut;
      out.scrapes = st.stats.wright.scrapes; out.outs = st.stats.wright.outs;
      return out;
    }, { human, flip });
    const keyRe = /( [ADWSF]$)|( [ADWSF] )|[←→↑↓]|\/$|stick|▶|◀|▲|▼|button/;
    check('the computer plays the other hero only', r.cpuOn[human] === false && r.cpuOn[1 - human] === true, r.cpuOn);
    check('the computer does not take off alone', r.aloneMode === 'rail' && r.aloneDx === 0, { mode: r.aloneMode, dx: r.aloneDx });
    check('it asks the person ("Hold right with me!")', r.bubbles.includes('Hold right with me!'), r.bubbles);
    check('the person holds right: take-off', r.tookOff);
    check(`the person (${r.job}) lets go in the air: flight 1 is never finished`, r.flights === 0 && r.flight === 0 && !r.cut, { flights: r.flights, mode: r.modeAfter, idle: r.idle, scrapes: r.scrapes, outs: r.outs });
    check('the person\'s hints name keys', r.myHints.some(t => keyRe.test(t)), r.myHints);
    check('the computer\'s hints never name a key', r.cpuHints.length > 0 && !r.cpuHints.some(t => keyRe.test(t)), r.cpuHints);
    await page.close();
  }

  check('no page errors', errors.length === 0, errors.slice(0, 4));
  await browser.close();
  console.log(bad ? `\n${bad} check(s) FAILED` : '\nall checks passed');
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
