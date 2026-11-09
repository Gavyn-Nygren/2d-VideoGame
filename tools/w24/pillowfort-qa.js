#!/usr/bin/env node
// 24-4 Pillow Fort Battle: a playtester's run through the real game screens and the real input paths.
// For each setup it opens the World 24 page (screenshot of the 24-4 card and its preview), clicks / taps the 24-4
// card, looks at the intro card, then plays the whole match to the results card with scripted "kid" players whose
// presses go in as real keyboard events (keydown / keyup on window), stubbed controllers (navigator.getGamepads) or
// pointer events on the on-screen touch pads. In round 1 it presses Esc / Start / pause() for the pause card.
// Checks: the act labels, the legend, speech bubbles only in 1-player mode, the results tiles, and the next button
// ("Finish World 24") going on to the World 24 done card. Screenshots go to build/w24/qa-pillowfort-<setup>-*.png.
// Setups: kb (2 players, keyboard), pad (2 players, two stubbed controllers), touch844 / touch390 (2 players, hasTouch),
//   soloPipEasy / soloBoNormal / soloPipHard (1 player on the keyboard vs the computer), soloBoTouch (1 player as Bo on
//   touch at 844x390 vs Easy), soloPipPad (1 player on a controller vs Normal).
// Usage: node tools/w24/pillowfort-qa.js [--only=kb,pad] [--seed=1] [--max=900]
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const only = opt('only', ''), seed = +opt('seed', 1), maxT = +opt('max', 900), out = path.resolve(__dirname, '..', '..', 'build', 'w24');
const SETUPS = [
  { name: 'kb', w: 1280, h: 720, how: 'kb', players: 2 },
  { name: 'pad', w: 1280, h: 720, how: 'pad', players: 2 },
  { name: 'touch844', w: 844, h: 390, how: 'touch', players: 2 },
  { name: 'touch390', w: 390, h: 844, how: 'touch', players: 2 },
  { name: 'soloPipEasy', w: 1280, h: 720, how: 'kb', players: 1, human: 0, skill: 'easy' },
  { name: 'soloBoNormal', w: 1280, h: 720, how: 'kb', players: 1, human: 1, skill: 'normal' },
  { name: 'soloPipHard', w: 1280, h: 720, how: 'kb', players: 1, human: 0, skill: 'hard' },
  { name: 'soloBoTouch', w: 844, h: 390, how: 'touch', players: 1, human: 1, skill: 'easy' },
  { name: 'soloPipPad', w: 1280, h: 720, how: 'pad', players: 1, human: 0, skill: 'normal' },
].filter(s => !only || only.split(',').includes(s.name));
fs.mkdirSync(out, { recursive: true });
let fails = 0;
const ok = (c, msg) => { console.log((c ? 'ok   ' : 'FAIL ') + msg); if (!c) fails++; };

// in the page: turn a person script's wanted keys into real input events
function installBridge() {
  const KB = [{ KeyA: 'left', KeyD: 'right', KeyW: 'up', KeyS: 'down', KeyF: 'act' }, { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', Slash: 'act' }];
  window.__qaCodes = [{ left: 'KeyA', right: 'KeyD', jump: 'KeyW', down: 'KeyS', act: 'KeyF' }, { left: 'ArrowLeft', right: 'ArrowRight', jump: 'ArrowUp', down: 'ArrowDown', act: 'Slash' }];
  const held = new Set();
  window.__qaHow = 'kb';
  window.__qaPads = [0, 1].map(i => ({ id: 'Xbox stub ' + i, index: i, connected: true, mapping: 'standard', timestamp: 0, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) }));
  window.__qaPadsOn = 0;
  navigator.getGamepads = () => [0, 1].map(i => (i < window.__qaPadsOn ? window.__qaPads[i] : null));
  const padSet = (code, on) => {
    const id = KB[0][code] ? 0 : 1, k = KB[id][code];
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
  // a kid-like person (as in pillowfort-break.js): nearest toy, mostly taps, sometimes a held toss, builds at the front
  window.__qaKid = (st, p, dt, rnd) => {
    const P = window.__pipbo, ms = P.G.mst, s = ms.pl[p.id], T = P.MODES.pillowfort.test, d = p.id ? -1 : 1, cx = p.x + p.w / 2, o = {};
    if (s.aim) { if (s.holdT >= (st.hold || 0)) return o; o.act = true; return o; }
    st.wait = (st.wait || 0) - dt;
    if (st.wait > 0) return o;
    if (rnd() < dt * 0.15) { st.wait = 0.5 + rnd() * 1.2; return o; }
    if (rnd() < dt * 0.3) o.jump = true;
    if (!s.hold) {
      const mine = ms.items.filter(it => (p.id ? it.x > 492 : it.x < 468) && it.rest);
      if (!mine.length) { const hx = p.id ? 600 : 360; o.left = cx > hx + 20; o.right = cx < hx - 20; return o; }
      mine.sort((a, b) => Math.abs(a.x - cx) - Math.abs(b.x - cx));
      const it = mine[0];
      o.left = it.x < cx - 4; o.right = it.x > cx + 4;
      if (it.y < p.y - 20 && Math.abs(it.x - cx) < 40) o.jump = true;
      if (Math.abs(it.x - cx) < 20 && rnd() < dt * 2) o.act = true;
      return o;
    }
    if (T.isBlock(s.hold.t)) {
      const fx = T.colOf(p.id, 6) * 30 + 15 + d * 34;
      if (Math.abs(cx - fx) > 8) { o.left = cx > fx; o.right = cx < fx; return o; }
      if (p.face !== -d) { o.left = d > 0; o.right = d < 0; return o; }
      st.wait = 0.25; o.act = true; return o;
    }
    if (!st.think) { st.think = true; st.wait = 0.2 + rnd() * 0.6; return o; }
    st.think = false;
    st.hold = rnd() < 0.6 ? 0 : 0.3 + rnd() * 0.9;
    o.act = true; return o;
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
    await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
    await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
    const tag = 'qa-pillowfort-' + S.name;
    const shot = async (name, wait = 350) => { await page.waitForTimeout(wait); const f = path.join(out, tag + '-' + name + '.png'); await page.screenshot({ path: f }); return f; };
    await page.evaluate(({ how, players, human, skill }) => {
      const P = window.__pipbo;
      P.CPU.cfg.players = players; if (human != null) P.CPU.cfg.human = human; if (skill) P.CPU.cfg.skill = skill; P.cpuApplyCfg();
      window.__qaHow = how; window.__qaPadsOn = how === 'pad' ? (players === 1 ? 1 : 2) : 0;
      window.__qaTouchP = players === 1 ? human : null;
      if (how === 'touch') { document.documentElement.classList.add('has-touch'); window.dispatchEvent(new Event('touchend')); }
    }, S);
    if (touch) await page.waitForTimeout(500);
    // the world page and the 24-4 card
    await page.evaluate(() => showWorld(23));
    await page.waitForTimeout(1200);
    const ci = await page.evaluate(() => {
      const P = window.__pipbo, i = P.LEVELS.findIndex(l => l.name === 'Pillow Fort Battle');
      const b = document.querySelector('[data-act="level"][data-i="' + i + '"]');
      if (!b) return null;
      b.scrollIntoView({ block: 'center' });
      return i;
    });
    await page.waitForTimeout(900);
    const card = await page.evaluate(i => {
      const b = document.querySelector('[data-act="level"][data-i="' + i + '"]');
      const cv = b.querySelector('canvas');
      let lit = 0;
      if (cv) { const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; for (let k = 0; k < d.length; k += 4 * 37) if (d[k + 3] > 0) lit++; }
      return { text: b.textContent.replace(/\s+/g, ' ').trim(), lit, i, cpuLine: (document.querySelector('.world-page') || document.body).textContent.match(/(computer[^.]*\.)/i) };
    }, ci);
    ok(card && card.lit > 50, S.name + ': world page card with a drawn preview: ' + (card && card.text));
    if (S.players === 1) console.log('     world page computer line: ' + (card.cpuLine && card.cpuLine[1]));
    await shot('world', 600);
    if (touch) await page.tap('[data-act="level"][data-i="' + card.i + '"]'); else await page.click('[data-act="level"][data-i="' + card.i + '"]');
    await page.waitForTimeout(300);
    const st0 = await page.evaluate(() => { const P = window.__pipbo, G = P.G; return { mode: G.mode, name: G.level && G.level.def.name, code: P.levelCode(G.levelIndex), introT: +G.introT.toFixed(1), cpuOn: G.cpuOn.slice() }; });
    ok(st0.name === 'Pillow Fort Battle' && st0.mode === 'play' && st0.code === '24-4', S.name + ': the card starts 24-4 (' + JSON.stringify(st0) + ')');
    ok(S.players === 2 ? !st0.cpuOn[0] && !st0.cpuOn[1] : st0.cpuOn[1 - S.human] && !st0.cpuOn[S.human], S.name + ': cpuOn ' + JSON.stringify(st0.cpuOn));
    await shot('intro', 500);
    const legend = await page.evaluate(() => { const l = document.querySelector('#legend, header'); return l ? l.textContent.replace(/\s+/g, ' ').trim() : ''; });
    const labels = await page.$$eval('[data-actlabel]', els => els.map(e => e.textContent + (e.offsetParent ? '' : '(hidden)')));
    console.log('     legend: ' + legend.slice(0, 300));
    console.log('     act labels: ' + labels.join(', '));
    if (touch) {
      const shown = await page.$$eval('.tbtn-act', els => els.filter(e => e.offsetParent && getComputedStyle(e).visibility !== 'hidden').map(e => e.textContent));
      ok(S.players === 2 ? shown.join(',') === 'toss,toss' : shown.length === 1 && shown[0] === 'toss', S.name + ': touch act buttons ' + JSON.stringify(shown));
    }
    await page.evaluate(({ players, human }) => {
      const P = window.__pipbo, G = P.G;
      G.manual = true;
      let rs = 12345; window.__qaRnd = () => { rs = (rs * 16807) % 2147483647; return rs / 2147483647; };
      window.__qaPeople = players === 2 ? [true, true] : human === 0 ? [true, false] : [false, true];
      window.__qaSt = [{}, {}];
      window.__qaN = 0; window.__qaBub = 0; window.__qaBubTexts = new Set(); window.__qaHints = new Set(); window.__qaRounds = []; window.__qaLast = '';
    }, S);
    const runFor = (secs, stopAt) => page.evaluate(({ secs, maxT, stopAt }) => {
      const P = window.__pipbo, G = P.G;
      const end = window.__qaN + Math.round(secs / P.DT);
      while (window.__qaN < end && window.__qaN < maxT / P.DT && G.mode === 'play') {
        for (const id of [0, 1]) {
          if (!window.__qaPeople[id]) continue;
          const p = G.players[id], w = G.match && G.match.phase === 'live' ? window.__qaKid(window.__qaSt[id], p, P.DT, window.__qaRnd) : {};
          const codes = window.__qaCodes[id];
          for (const k of ['left', 'right', 'jump', 'down', 'act']) { if (w[k]) window.__qaKeys.add(codes[k]); else window.__qaKeys.delete(codes[k]); }
        }
        P.pollInput(P.DT); P.step(P.DT); window.__qaN++;
        const nb = (P.CPU.bubbles || []).filter(b => b && b.t > 0 && b.text);
        if (nb.length > window.__qaBub) window.__qaBub = nb.length;
        nb.forEach(b => window.__qaBubTexts.add(b.text));
        for (const s of G.mst.pl) if (s.bubble) window.__qaHints.add(s.bubble.text);
        const m = G.match, ph = m && m.phase;
        if (ph === 'end' && window.__qaLast !== 'end') window.__qaRounds.push({ r: m.round, key: G.mst.key, t: Math.round(G.mst.rt), w: m.end && m.end.winner, why: m.end && m.end.reason, wins: m.wins.slice() });
        window.__qaLast = ph;
        if (stopAt && stopAt(G)) break;
      }
      const m = G.match;
      return { mode: G.mode, round: m && m.round, phase: m && m.phase, rt: G.mst.rt != null ? +G.mst.rt.toFixed(1) : 0, n: +(window.__qaN * P.DT).toFixed(1), wins: m && m.wins };
    }, { secs, maxT, stopAt: undefined });
    // wait for live play in round 1, 6 s in: a screenshot (key chips), then hold the action until the aim arc shows
    let r = await runFor(30);
    for (let k = 0; k < 40 && !(r.phase === 'live' && r.rt >= 5); k++) r = await runFor(0.5);
    await page.evaluate(() => window.__qaKeys.clearAll());
    await shot('play-chips');
    // the pause card from the real button (Esc, controller Start, or the pause call a touch Pause button makes)
    if (S.how === 'kb') { await page.keyboard.press('Escape'); }
    else if (S.how === 'pad') { await page.evaluate(() => { window.__qaPads[0].buttons[9] = { pressed: true, value: 1 }; window.__pipbo.pollInput(1 / 60); window.__qaPads[0].buttons[9] = { pressed: false, value: 0 }; window.__pipbo.pollInput(1 / 60); }); }
    else await page.evaluate(() => window.__pipbo.pause());
    await page.waitForTimeout(400);
    const pause = await page.evaluate(() => ({ mode: window.__pipbo.G.mode, text: document.querySelector('#overlay').textContent.replace(/\s+/g, ' ').trim() }));
    ok(pause.mode === 'paused', S.name + ': pause card shows');
    console.log('     pause card: ' + pause.text.slice(0, 420));
    if (S.players === 1) ok(/You play/.test(pause.text) || /computer/i.test(pause.text), S.name + ': pause card mentions the computer setting');
    await shot('pause', 200);
    await page.evaluate(() => window.__pipbo.resume());
    await page.waitForTimeout(150);
    // aim: give the person a plushie on the carpet in front of them and hold the action (real input) for 0.8 s
    await page.evaluate(({ id }) => {
      const P = window.__pipbo, G = P.G, s = G.mst.pl[id];
      s.hold = { t: 'plush', v: 'duck' }; s.cd = 0; s.aim = false; s.dizzy = 0; G.players[id].stun = 0;
      P.pollInput(P.DT);   // (resume() wants the action let go once before a new press counts)
      window.__qaKeys.add(window.__qaCodes[id].act);
      for (let k = 0; k < 96; k++) { P.pollInput(P.DT); P.step(P.DT); }
    }, { id: S.players === 1 ? S.human : 0 });
    await shot('aim', 120);
    await page.evaluate(() => window.__qaKeys.clearAll());
    // play on, with a screenshot of each new round
    const shotRounds = new Set();
    for (let k = 0; k < 400; k++) {
      r = await runFor(4);
      if (r.mode !== 'play') break;
      if ((r.phase === 'ready' || r.phase === 'count') && !shotRounds.has(r.round)) { shotRounds.add(r.round); await shot('round' + r.round, 100); }
      if (r.phase === 'live' && r.rt > 30 && !shotRounds.has('live' + r.round) && r.round <= 3) { shotRounds.add('live' + r.round); await shot('live' + r.round, 100); }
      if (r.n >= maxT) break;
    }
    const info = await page.evaluate(() => ({ bub: window.__qaBub, bubs: [...window.__qaBubTexts], hints: [...window.__qaHints], rounds: window.__qaRounds }));
    await page.evaluate(() => window.__qaKeys.clearAll());
    // the match framework shows the results card itself after the last round's banner
    for (let k = 0; k < 40 && r.mode === 'play'; k++) r = await runFor(0.5);
    await page.waitForFunction(() => window.__pipbo.G.mode === 'result', null, { timeout: 15000 }).catch(() => {});
    r.mode = await page.evaluate(() => window.__pipbo.G.mode);
    ok(r.mode === 'result', S.name + ': plays to the results card (' + JSON.stringify(r) + ')');
    for (const x of info.rounds) console.log(`     round ${x.r} ${x.key}: ${x.t} s, ${x.w < 0 ? 'tie' : x.w === 0 ? 'Pip' : 'Bo'} — ${x.why} (${x.wins.join('-')})`);
    ok(S.players === 1 ? info.bub > 0 : info.bub === 0, S.name + ': computer speech bubbles ' + (S.players === 1 ? 'shown' : 'never shown') + ' (' + info.bub + ': ' + info.bubs.join(' | ') + ')');
    console.log('     hint bubbles seen: ' + info.hints.join(' | '));
    const res = await page.evaluate(() => {
      const ov = document.querySelector('#overlay');
      return { mode: window.__pipbo.G.mode, text: ov.textContent.replace(/\s+/g, ' ').trim(), btns: [...ov.querySelectorAll('button')].map(b => b.textContent.trim() + (b.dataset.act ? '[' + b.dataset.act + ']' : '')) };
    });
    console.log('     results: ' + res.text.slice(0, 500));
    console.log('     buttons: ' + res.btns.join(' | '));
    ok(/Rounds won/.test(res.text) && /Blocks knocked/.test(res.text) && /Blocks built/.test(res.text) && /Hits/.test(res.text), S.name + ': results tiles');
    ok(res.btns.some(b => /Finish World 24\[next\]/.test(b)), S.name + ': a "Finish World 24" button');
    await shot('results', 900);
    summary.push(S.name + ': ' + (r.wins || []).join('-') + ' in ' + info.rounds.length + ' rounds, ' + info.rounds.map(x => x.t + 's').join('/'));
    // Finish World 24: Tab to it and Enter on the keyboard, a click for the controller run, a tap on touch
    await page.waitForTimeout(700);
    if (S.how === 'kb') { await page.focus('[data-act="next"]'); await page.keyboard.press('Enter'); }
    else if (touch) await page.tap('[data-act="next"]');
    else await page.click('[data-act="next"]');
    await page.waitForTimeout(500);
    const wd = await page.evaluate(() => ({ mode: window.__pipbo.G.mode, text: document.querySelector('#overlay').textContent.replace(/\s+/g, ' ').trim() }));
    ok(wd.mode === 'final' && /World 24 complete/.test(wd.text), S.name + ': the World 24 done card (' + wd.text.slice(0, 260) + ')');
    await shot('worlddone', 300);
    if (errors.length) { console.log('ERRORS:\n' + [...new Set(errors)].join('\n')); fails++; }
    await ctx.close();
  }
  console.log('\n' + summary.join('\n'));
  console.log(fails ? fails + ' PROBLEMS' : 'all setups play through');
  await browser.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
