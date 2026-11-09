#!/usr/bin/env node
// 24-1 Wind-Up Train Ride: a playtester's run through the real game screens and the real input paths. For each setup
// it opens the World 24 page (screenshot of the 24-1 card and its preview), clicks the 24-1 card, looks at the intro
// card, then plays the level to the results card with scripted "kid" players (tools/w24/windtrain-people.js) whose
// presses go in as real keyboard events (keydown / keyup on window), a stubbed controller (navigator.getGamepads) or
// pointer events on the on-screen touch pads. Midway it presses Esc / Start / nothing (touch: pause()) for the pause
// card. Checks: the act labels, bubbles only in 1-player mode, the HUD prompts, the results tiles, and "Next level"
// going on to 24-2. Screenshots go to build/w24/qa-windtrain-<setup>-*.png.
// Setups: kb (2 players, keyboard), pad (2 players, two stubbed controllers), touch844 (2 players, hasTouch 844x390),
//   touch390 (2 players, hasTouch 390x844), soloPip / soloBo (1 player on the keyboard, the computer plays the other),
//   soloTouch (1 player as Bo on touch at 844x390).
// Usage: node tools/w24/windtrain-qa.js [--only=kb,pad] [--seed=1] [--max=500]
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const only = opt('only', ''), seed = +opt('seed', 1), maxT = +opt('max', 500), out = 'build/w24';
const SETUPS = [
  { name: 'kb', w: 960, h: 540, how: 'kb', players: 2 },
  { name: 'pad', w: 960, h: 540, how: 'pad', players: 2 },
  { name: 'touch844', w: 844, h: 390, how: 'touch', players: 2 },
  { name: 'touch390', w: 390, h: 844, how: 'touch', players: 2 },
  { name: 'soloPip', w: 960, h: 540, how: 'kb', players: 1, human: 0 },
  { name: 'soloBo', w: 960, h: 540, how: 'kb', players: 1, human: 1 },
  { name: 'soloTouch', w: 844, h: 390, how: 'touch', players: 1, human: 1 },
].filter(s => !only || only.split(',').includes(s.name));
fs.mkdirSync(out, { recursive: true });
let fails = 0;
const ok = (c, msg) => { console.log((c ? 'ok   ' : 'FAIL ') + msg); if (!c) fails++; };

// in the page: turn a person script's wanted keys into real input events
function installBridge() {
  const KB = [{ KeyA: 'left', KeyD: 'right', KeyW: 'up', KeyS: 'down', KeyF: 'act' }, { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', Slash: 'act' }];
  const held = new Set();
  window.__qaHow = 'kb';
  window.__qaPads = [0, 1].map(i => ({ id: 'Xbox stub ' + i, index: i, connected: true, mapping: 'standard', timestamp: 0, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) }));
  window.__qaPadsOn = 0;
  navigator.getGamepads = () => [0, 1].map(i => (i < window.__qaPadsOn ? window.__qaPads[i] : null));
  const padSet = (code, on) => {
    const id = KB[0][code] ? 0 : 1, k = KB[id][code];
    // 1-player: the person's controller is the first one
    const pi = window.__qaPadsOn === 1 ? 0 : id, pad = window.__qaPads[pi];
    if (k === 'act') pad.buttons[2] = { pressed: on, value: on ? 1 : 0 };
    else if (k === 'up') pad.buttons[0] = { pressed: on, value: on ? 1 : 0 };
    else if (k === 'down') pad.axes[1] = on ? 1 : 0;
    else if (k === 'left') pad.axes[0] = on ? -1 : (pad.axes[0] < 0 ? 0 : pad.axes[0]);
    else if (k === 'right') pad.axes[0] = on ? 1 : (pad.axes[0] > 0 ? 0 : pad.axes[0]);
  };
  const touchSet = (code, on) => {
    const id = KB[0][code] ? 0 : 1, k = KB[id][code], pid = window.__qaTouchP != null ? window.__qaTouchP : id;
    const box = document.getElementById(pid ? 'padBo' : 'padPip');
    const sel = k === 'act' ? '[data-k="act"]' : k === 'up' ? '[data-k="jump"]' : k === 'down' ? '[data-k="down"]' : '.tmove';
    const el = box.querySelector(sel), r = (k === 'left' || k === 'right' ? el.querySelector('[data-k="' + k + '"]') : el).getBoundingClientRect();
    const pointerId = 10 + pid * 10 + ['left', 'right', 'up', 'down', 'act'].indexOf(k);
    el.dispatchEvent(new PointerEvent(on ? 'pointerdown' : 'pointerup', { pointerId, bubbles: true, cancelable: true, clientX: r.x + r.width / 2, clientY: r.y + r.height / 2, pointerType: 'touch' }));
  };
  window.__qaKeys = {
    add(code) {
      if (held.has(code)) return; held.add(code);
      if (window.__qaHow === 'kb') window.dispatchEvent(new KeyboardEvent('keydown', { code, key: code, bubbles: true }));
      else if (window.__qaHow === 'pad') padSet(code, true); else touchSet(code, true);
    },
    delete(code) {
      if (!held.has(code)) return; held.delete(code);
      if (window.__qaHow === 'kb') window.dispatchEvent(new KeyboardEvent('keyup', { code, key: code, bubbles: true }));
      else if (window.__qaHow === 'pad') padSet(code, false); else touchSet(code, false);
    },
    clearAll() { for (const c of [...held]) this.delete(c); },
  };
}

(async () => {
  const browser = await chromium.launch();
  const summary = [];
  for (const S of SETUPS) {
    const touch = S.how === 'touch';
    const ctx = await browser.newContext(Object.assign({ viewport: { width: S.w, height: S.h }, deviceScaleFactor: 1 }, touch ? { hasTouch: true } : {}));
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', e => errors.push(String(e)));
    await page.addInitScript(sd => {
      const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
      Math.random = gen(sd * 2654435761 >>> 0 || 1);
    }, seed);
    await page.addInitScript(installBridge);
    await page.addInitScript({ path: path.join(__dirname, 'windtrain-people.js') });
    await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
    await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
    const tag = 'qa-windtrain-' + S.name;
    const shot = async (name, wait = 350) => { await page.waitForTimeout(wait); const f = path.join(out, tag + '-' + name + '.png'); await page.screenshot({ path: f }); return f; };
    await page.evaluate(({ how, players, human }) => {
      const P = window.__pipbo;
      P.CPU.cfg.players = players; if (human != null) P.CPU.cfg.human = human; P.cpuApplyCfg();
      window.__qaHow = how; window.__qaPadsOn = how === 'pad' ? (players === 1 ? 1 : 2) : 0;
      window.__qaTouchP = players === 1 ? human : null;
      if (how === 'touch') { document.documentElement.classList.add('has-touch'); window.dispatchEvent(new Event('touchend')); }
    }, S);
    if (touch) await page.waitForTimeout(500);
    // the world page and the 24-1 card
    await page.evaluate(() => showWorld(23));
    await page.waitForTimeout(1200);
    const card = await page.evaluate(() => {
      const P = window.__pipbo, i = P.LEVELS.findIndex(l => l.name === 'Wind-Up Train Ride');
      const b = document.querySelector('[data-act="level"][data-i="' + i + '"]');
      if (!b) return null;
      b.scrollIntoView({ block: 'center' });
      const cv = b.querySelector('canvas');
      let lit = 0;
      if (cv) { const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; for (let k = 0; k < d.length; k += 4 * 37) if (d[k + 3] > 0) lit++; }
      return { text: b.textContent.replace(/\s+/g, ' ').trim(), lit, i };
    });
    ok(card && card.lit > 50, S.name + ': world page card with a drawn preview: ' + (card && card.text));
    await shot('world', 600);
    // start the level by clicking (tapping) its card
    if (touch) await page.tap('[data-act="level"][data-i="' + card.i + '"]'); else await page.click('[data-act="level"][data-i="' + card.i + '"]');
    await page.waitForTimeout(300);
    const st0 = await page.evaluate(() => { const P = window.__pipbo, G = P.G; return { mode: G.mode, name: G.level && G.level.def.name, introT: G.introT, cpuOn: G.cpuOn.slice() }; });
    ok(st0.name === 'Wind-Up Train Ride' && st0.mode === 'play', S.name + ': the card starts 24-1 (' + JSON.stringify(st0) + ')');
    await shot('intro', 400);
    const legend = await page.evaluate(() => { const l = document.querySelector('#legend, header'); return l ? l.textContent.replace(/\s+/g, ' ').trim() : ''; });
    const labels = await page.$$eval('[data-actlabel]', els => els.map(e => e.textContent + (e.offsetParent ? '' : '(hidden)')));
    console.log('     legend: ' + legend.slice(0, 300));
    console.log('     act labels: ' + labels.join(', '));
    if (touch) {
      const shown = await page.$$eval('.tbtn-act', els => els.filter(e => e.offsetParent && getComputedStyle(e).visibility !== 'hidden').map(e => e.textContent));
      ok(S.players === 2 ? shown.join(',') === 'wind,switch' : shown.length === 1 && shown[0] === 'switch', S.name + ': touch act buttons ' + JSON.stringify(shown));
    }
    // play: the person script's presses become real events; stop now and then for screenshots and the pause card
    await page.evaluate(({ players, human }) => {
      const P = window.__pipbo, G = P.G;
      G.manual = true;
      let rs = 12345; window.__qaRnd = () => { rs = (rs * 16807) % 2147483647; return rs / 2147483647; };
      window.__qaPeople = players === 2 ? ['kid', 'kid'] : human === 0 ? ['kid', null] : [null, 'kid'];
      window.__qaN = 0; window.__qaBub = 0; window.__qaHints = new Set(); window.__qaPrompts = new Set(); window.__qaRooms = [];
      window.__windtrainPeople.reset();
      window.__qaFakeP = Object.assign({}, P, { keys: window.__qaKeys });
    }, S);
    const runFor = (secs) => page.evaluate(({ secs, maxT }) => {
      const P = window.__pipbo, G = P.G, M = P.MODES.windtrain;
      const end = window.__qaN + Math.round(secs / P.DT);
      while (window.__qaN < end && window.__qaN < maxT / P.DT && G.mode === 'play') {
        for (const id of [0, 1]) if (window.__qaPeople[id]) window.__windtrainPeople.drive(id, window.__qaPeople[id], window.__qaFakeP, window.__qaRnd);
        P.pollInput(P.DT); P.step(P.DT); window.__qaN++;
        const st = G.mst;
        const nb = (P.CPU.bubbles || []).filter(b => b && b.t > 0 && b.text).length; if (nb > window.__qaBub) window.__qaBub = nb;
        if (st.hints) for (const h of st.hints) if (h) window.__qaHints.add(h.text);
        if (window.__qaRooms[G.room] == null) window.__qaRooms[G.room] = +G.time.toFixed(1);
      }
      return { mode: G.mode, room: G.room, t: +G.time.toFixed(1), n: +(window.__qaN * P.DT).toFixed(1), stars: G.mst.stars, clunks: G.mst.stats.clunks, why: G.mst.c && M.plan(G.mst).why };
    }, { secs, maxT });
    let r = await runFor(14);
    await shot('play14');
    // the pause card from the real button (Esc, controller Start, or the pause call a touch Pause button makes)
    if (S.how === 'kb') { await page.keyboard.press('Escape'); }
    else if (S.how === 'pad') { await page.evaluate(() => { window.__qaPads[0].buttons[9] = { pressed: true, value: 1 }; window.__pipbo.pollInput(1 / 60); window.__qaPads[0].buttons[9] = { pressed: false, value: 0 }; window.__pipbo.pollInput(1 / 60); }); }
    else await page.evaluate(() => window.__pipbo.pause());
    await page.waitForTimeout(400);
    const pause = await page.evaluate(() => ({ mode: window.__pipbo.G.mode, text: document.querySelector('#overlay').textContent.replace(/\s+/g, ' ').trim() }));
    ok(pause.mode === 'paused', S.name + ': pause card shows');
    console.log('     pause card: ' + pause.text.slice(0, 420));
    if (S.players === 1) ok(new RegExp('You play ' + (S.human ? 'Bo' : 'Pip')).test(pause.text), S.name + ': pause tip says who you play');
    await shot('pause', 200);
    await page.evaluate(() => window.__pipbo.resume());
    await page.waitForTimeout(150);
    // play on, with a screenshot in each later stretch
    const shotRooms = new Set();
    for (let k = 0; k < 60; k++) {
      r = await runFor(8);
      if (r.mode !== 'play') break;
      if (!shotRooms.has(r.room) && r.room > 0) { shotRooms.add(r.room); await shot('stretch' + (r.room + 1)); }
      if (r.n >= maxT) break;
    }
    const info = await page.evaluate(() => ({ bub: window.__qaBub, hints: [...window.__qaHints], rooms: window.__qaRooms }));
    ok(r.mode === 'clear' || r.mode === 'result', S.name + ': plays to the end (' + JSON.stringify(r) + ', stretches at ' + info.rooms.join(',') + ')');
    ok(S.players === 1 ? info.bub > 0 : info.bub === 0, S.name + ': speech bubbles ' + (S.players === 1 ? 'shown' : 'never shown') + ' (' + info.bub + ')');
    console.log('     hints seen: ' + info.hints.join(' | '));
    await page.evaluate(() => window.__qaKeys.clearAll());
    await page.waitForFunction(() => window.__pipbo.G.mode === 'result', null, { timeout: 15000 }).catch(() => {});
    const res = await page.evaluate(() => {
      const ov = document.querySelector('#overlay');
      return { mode: window.__pipbo.G.mode, text: ov.textContent.replace(/\s+/g, ' ').trim(), btns: [...ov.querySelectorAll('button')].map(b => b.textContent.trim() + (b.dataset.act ? '[' + b.dataset.act + ']' : '')) };
    });
    ok(res.mode === 'result', S.name + ': results card');
    console.log('     results: ' + res.text.slice(0, 500));
    console.log('     buttons: ' + res.btns.join(' | '));
    await shot('results', 900);
    summary.push(S.name + ': ' + JSON.stringify(r) + ' ' + (res.text.match(/Time[^A-Z]*/) || [''])[0]);
    // Next level (Enter on keyboard, A on the controller, a tap on touch)
    await page.waitForTimeout(600);
    if (S.how === 'kb') await page.keyboard.press('Enter');
    else if (S.how === 'pad') await page.evaluate(() => { const P = window.__pipbo; window.__qaPads[0].buttons[0] = { pressed: true, value: 1 }; P.pollInput(1 / 60); window.__qaPads[0].buttons[0] = { pressed: false, value: 0 }; P.pollInput(1 / 60); });
    else await page.tap('[data-act="next"]');
    await page.waitForTimeout(500);
    const nx = await page.evaluate(() => { const P = window.__pipbo; return { mode: P.G.mode, code: P.levelCode(P.G.levelIndex), name: P.LEVELS[P.G.levelIndex].name }; });
    ok(nx.code === '24-2', S.name + ': "Next level" goes on to 24-2 (' + JSON.stringify(nx) + ')');
    await shot('next', 300);
    if (errors.length) { console.log('ERRORS:\n' + [...new Set(errors)].join('\n')); fails++; }
    await ctx.close();
  }
  console.log('\n' + summary.join('\n'));
  console.log(fails ? fails + ' PROBLEMS' : 'all setups play through');
  await browser.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
