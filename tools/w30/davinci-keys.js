#!/usr/bin/env node
// 30-1 The Time Thief, era 'davinci' (Leonardo's Flying Machine): do the real input paths reach the flying machine,
// and do the hints name each device's own keys?   node tools/w30/davinci-keys.js [--shots]
//   kb     two people on one keyboard: real key events with the live loop running (G.manual false) for a few seconds
//          (take off, flap, climb, dive, toot), then a scripted "pair of people" on real key presses who fly the whole
//          first stretch to the tower, then the swapped jobs (labels, legend, hints, keys)
//   pad    two stubbed controllers (navigator.getGamepads): X / RB, the stick, the d-pad, A
//   touch  an 844x390 phone: the ▲ ▼ pads and the round buttons (pointer events)
//   solo   1-player mode on the keyboard: the person's hints name keys, the computer's say what it does; the computer
//          never takes off for an idle flapper
// Prints one line per check; exits 1 when one fails. --shots writes build/w30/davinci/keys-<mode>.png.
'use strict';
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const shots = process.argv.includes('--shots');
const out = path.resolve(__dirname, '..', '..', 'build', 'w30', 'davinci');
fs.mkdirSync(out, { recursive: true });

(async () => {
  const browser = await chromium.launch();
  const errors = [], lines = [];
  let bad = 0;
  const check = (mode, name, ok, info) => { if (!ok) bad++; lines.push(`${ok ? 'ok  ' : 'FAIL'} ${mode.padEnd(6)} ${name}${info !== undefined ? '   [' + info + ']' : ''}`); };
  for (const mode of ['kb', 'pad', 'touch', 'solo']) {
    const touch = mode === 'touch';
    const ctx = await browser.newContext(touch ? { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 } : { viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push(mode + ': ' + String(e)));
    page.on('console', m => { if (m.type() === 'error' && /davinci|tthVinci|TTHVINCI/i.test(m.text())) errors.push(mode + ': ' + m.text()); });
    await page.addInitScript(() => {
      const mk = (ix, id) => ({ buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })), axes: [0, 0, 0, 0], connected: true, mapping: 'standard', id, index: ix, timestamp: 0 });
      window.__pads = [mk(0, 'Stub pad (Pip)'), mk(1, 'Stub pad (Bo)')];
      window.__padOn = false;
      navigator.getGamepads = () => (window.__padOn ? window.__pads : []);
    });
    await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
    await page.waitForFunction(() => window.__pipbo && window.__pipbo.MODES && window.__pipbo.MODES.timethief);
    if (touch) await page.evaluate(() => { enableTouch(); Pads.lastNonPad = 'touch'; setKind('touch'); });
    // start the era with the live loop running (G.manual false: the page polls the devices and steps by itself)
    const start = (o = {}) => page.evaluate(o2 => {
      const P = window.__pipbo, G = P.G, TT = P.MODES.timethief.test;
      if (o2.pads) window.__padOn = true;
      if (o2.solo != null) { P.cpuSetCfg('players', 1); P.cpuSetCfg('human', o2.solo); } else P.cpuSetCfg('players', 2);
      G.manual = false;
      TT.jump('davinci', { seed: 5 });
      if (o2.solo == null) G.cpuOn = [false, false];
      P.fit();
      window.__run = s => { for (let k = 0; k < Math.round(s / P.DT); k++) { P.pollInput(P.DT); P.step(P.DT); } };
      window.__vinci = () => {
        const st = G.mst, ph = st.ph, g = ph.g, K = TT.TTH_PHASES.davinci, txt = sel => { const el = document.querySelector(sel); return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; };
        return { phase: st.phase, mode: ph.mode, stage: ph.stage, flap: ph.flap, x: Math.round(g.x), y: Math.round(g.y), v: Math.round(g.v), vy: Math.round(g.vy), landed: g.landed, bounce: !!g.bounce,
          en: +g.en.toFixed(2), tired: g.tired > 0, lift: g.liftT > 0, toot: ph.tootT > 0, flaps: st.stats.davinci.flaps, pages: st.stats.davinci.pages, bumps: st.stats.team, ready: !!(ph.perch && ph.perch.ready),
          aim: Math.round(tthVinciAim(st, 50 + g.v * 0.42)), hints: st.hints.map(h => (h ? h.text : '')), labels: K.labels(st),
          btn: [txt('#padPip [data-actlabel]'), txt('#padBo [data-actlabel]')], leg: [txt('[data-legp="0"]'), txt('[data-legp="1"]')], idle: !!st.idle, errs: [...P.CPU.errs],
          bubbles: P.CPU.bubbles.map(b => (b && b.t > 0 ? b.text : '')) };
      };
    }, o);
    const S = () => page.evaluate(() => window.__vinci());
    const run = s => page.evaluate(s2 => window.__run(s2), s);
    const manual = on => page.evaluate(on2 => { window.__pipbo.G.manual = on2; }, on);
    const wait = ms => page.waitForTimeout(ms);
    const tapKey = async (code, ms = 70) => { await page.keyboard.down(code); await wait(ms); await page.keyboard.up(code); };
    // flap with a steady beat for `beats` beats (live loop), 0.5 s apart
    const beatKeys = async (code, beats) => { for (let k = 0; k < beats; k++) { await tapKey(code); await wait(430); } };

    if (mode === 'kb') {
      await start(); await wait(500);
      let a = await S();
      check(mode, 'era started on the workshop roof (Bo flaps first)', a.phase === 'davinci' && a.mode === 'perch' && a.flap === 1 && a.ready, a.mode + ', flapper ' + a.flap);
      check(mode, 'flapper hint names Bo\'s own key (/)', /\//.test(a.hints[1]) && /flap/.test(a.hints[1]), a.hints[1]);
      check(mode, 'steerer hint names Pip\'s own keys (W, S)', /W/.test(a.hints[0]) && /S/.test(a.hints[0]), a.hints[0]);
      check(mode, 'top-bar legend: Pip steers and shoos, Bo flaps', /climb/.test(a.leg[0]) && /dive/.test(a.leg[0]) && /shoo/.test(a.leg[0]) && /steady beat/.test(a.leg[1]) && /flap/.test(a.leg[1]), a.leg.join(' | '));
      // real keys, live loop
      await page.keyboard.down('KeyW'); await wait(700); let a2 = await S();
      check(mode, 'the steerer alone cannot take off', a2.mode === 'perch' && a2.x === a.x, a2.mode);
      await tapKey('Slash'); await wait(300); let b = await S();
      check(mode, 'Bo\'s / takes off (live loop)', b.mode === 'fly' && b.flaps === 1 && !b.landed, `${b.mode}, flaps ${b.flaps}`);
      await beatKeys('Slash', 4); let c = await S();
      check(mode, 'a steady beat flies, W climbs', c.flaps >= 4 && c.x > b.x + 250 && c.y < b.y - 60 && !c.tired, `flaps ${c.flaps}, x ${b.x} -> ${c.x}, y ${b.y} -> ${c.y}`);
      await page.keyboard.up('KeyW'); await page.keyboard.down('KeyS'); await beatKeys('Slash', 2); let d = await S(); await page.keyboard.up('KeyS');
      check(mode, 'S dives', d.y > c.y + 60, `y ${c.y} -> ${d.y}`);
      await tapKey('KeyF'); await wait(60); let e = await S();
      check(mode, 'Pip\'s F toots the horn', e.toot, 'toot ' + e.toot);
      let f = await S();
      for (let k = 0; k < 60 && !f.tired; k++) { await tapKey('Slash', 40); await wait(50); f = await S(); }   // (the meter is a few seconds of sprint)
      check(mode, 'mashing / tires the wings ("Wings tired!")', f.tired, `tired ${f.tired}, meter ${f.en}`);
      // a scripted pair of people on real keys: a beat every 0.5 s, the tiller toward the trail; the whole first stretch
      await page.evaluate(() => { window.__pipbo.MODES.timethief.test.jump('davinci', { seed: 5 }); const G = window.__pipbo.G; G.manual = true; G.cpuOn = [false, false]; });
      const held = {}; const key = async (code, on) => { if (!!held[code] === on) return; held[code] = on; if (on) await page.keyboard.down(code); else await page.keyboard.up(code); };
      let s = await S(), t = 0, beat = 0, dir = 0;
      while (s.stage < 1 && t < 80) {
        beat -= 1 / 30;
        const wantFlap = (s.mode === 'perch' ? s.ready : s.mode === 'fly') && beat <= 0 && !s.tired && s.en > 0.3;
        if (wantFlap) { await key('Slash', true); beat = 0.5; }
        const err = s.aim - (s.y + s.vy * 0.25);
        dir = s.mode !== 'fly' || s.landed ? 0 : dir < 0 ? (err < -4 ? -1 : 0) : dir > 0 ? (err > 4 ? 1 : 0) : err < -14 ? -1 : err > 14 ? 1 : 0;
        await key('KeyW', dir < 0); await key('KeyS', dir > 0);
        await run(1 / 30); t += 1 / 30;
        await key('Slash', false);
        s = await S();
      }
      for (const code of Object.keys(held)) await key(code, false);
      check(mode, 'a scripted pair on real keys flies the first stretch to the tower', s.stage === 1 && s.pages >= 25 && s.bumps <= 3, `${t.toFixed(1)} s, ${s.pages} pages, ${s.bumps} bumps`);
      // on the tower the seats swap: Pip flaps now, Bo steers
      await run(2.2); let m = await S();
      check(mode, 'on the tower the seats swap: action words (labels, legend)', m.flap === 0 && m.labels[0] === 'flap' && m.labels[1] === 'shoo' && /steady beat/.test(m.leg[0]) && /flap/.test(m.leg[0]) && /climb/.test(m.leg[1]) && /shoo/.test(m.leg[1]), m.labels.join('/') + ' | ' + m.leg.join(' | '));
      check(mode, 'hints name the new keys (F for Pip, ↑ ↓ for Bo)', /\bF\b/.test(m.hints[0]) && /↑/.test(m.hints[1]) && /↓/.test(m.hints[1]), m.hints.join(' | '));
      await page.keyboard.down('KeyF'); await run(0.1); await page.keyboard.up('KeyF'); await run(0.3); let n = await S();
      check(mode, 'Pip\'s F takes off from the tower', n.mode === 'fly', n.mode);
      await page.keyboard.down('ArrowUp');
      for (let k = 0; k < 3; k++) { await page.keyboard.down('KeyF'); await run(0.08); await page.keyboard.up('KeyF'); await run(0.42); }
      let n2 = await S(); await page.keyboard.up('ArrowUp');
      check(mode, 'Bo\'s ↑ climbs', n2.y < n.y - 50, `y ${n.y} -> ${n2.y}`);
      await page.keyboard.down('Slash'); await run(0.1); await page.keyboard.up('Slash'); let n3 = await S();
      check(mode, 'Bo\'s / toots the horn now', n3.toot, 'toot ' + n3.toot);
    }

    if (mode === 'pad') {
      await start({ pads: true }); await wait(500);
      const pad = (ix, f) => page.evaluate(({ ix, f }) => { const p = window.__pads[ix]; new Function('p', f)(p); }, { ix, f });
      const btn = (ix, n, on) => pad(ix, `p.buttons[${n}] = { pressed: ${on}, value: ${on ? 1 : 0} };`);
      const tapBtn = async (ix, n, ms = 80) => { await btn(ix, n, true); await wait(ms); await btn(ix, n, false); };
      await btn(0, 0, true); await btn(1, 0, true); await wait(150); await btn(0, 0, false); await btn(1, 0, false); await wait(5300);   // wake both pads; wait for the next round of hints
      let a = await S();
      check(mode, 'flapper hint names the controller\'s action button (X)', /\bX\b/.test(a.hints[1]), a.hints[1]);
      check(mode, 'steerer hint names the stick', /stick up/.test(a.hints[0]) && /stick down/.test(a.hints[0]), a.hints[0]);
      await tapBtn(1, 2); await wait(300); let b = await S();
      check(mode, 'Bo\'s X takes off', b.mode === 'fly' && b.flaps === 1, `${b.mode}, flaps ${b.flaps}`);
      await pad(0, 'p.axes[1] = -1;');
      for (let k = 0; k < 4; k++) { await tapBtn(1, 2); await wait(420); }
      let c = await S();
      check(mode, 'X beats fly, Pip\'s stick up climbs', c.flaps >= 4 && c.y < b.y - 60, `flaps ${c.flaps}, y ${b.y} -> ${c.y}`);
      await pad(0, 'p.axes[1] = 0;'); await btn(0, 13, true);
      for (let k = 0; k < 2; k++) { await tapBtn(1, 5); await wait(420); }
      let d = await S(); await btn(0, 13, false);
      check(mode, 'RB flaps too, the d-pad down dives', d.flaps >= c.flaps + 2 && d.y > c.y + 60, `flaps ${c.flaps} -> ${d.flaps}, y ${c.y} -> ${d.y}`);
      await btn(0, 0, true);
      for (let k = 0; k < 2; k++) { await tapBtn(1, 2); await wait(420); }
      let e = await S(); await btn(0, 0, false);
      check(mode, 'A (the jump button) is "up" too', e.y < d.y - 40, `y ${d.y} -> ${e.y}`);
      await tapBtn(0, 2); await wait(60); let f = await S();
      check(mode, 'Pip\'s X toots the horn', f.toot, 'toot ' + f.toot);
      const texts = await page.evaluate(() => [tthKey(0, 'up'), tthKey(0, 'down'), tthKey(1, 'act')]);
      check(mode, 'key names for controllers', texts[0] === 'stick up' && texts[1] === 'stick down' && texts[2] === 'X', texts.join(' | '));
    }

    if (mode === 'touch') {
      await start(); await wait(500);
      const down = (sel, on) => page.evaluate(({ sel, on }) => {
        const el = document.querySelector(sel), r = el.getBoundingClientRect();
        el.dispatchEvent(new PointerEvent(on ? 'pointerdown' : 'pointerup', { bubbles: true, pointerId: sel.length + 3, pointerType: 'touch', isPrimary: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 }));
      }, { sel, on });
      const tap = async (sel, ms = 80) => { await down(sel, true); await wait(ms); await down(sel, false); };
      const sizes = await page.evaluate(() => ['#padPip .tbtn-act', '#padBo .tbtn-act', '#padPip [data-k="jump"]', '#padPip [data-k="down"]', '#padBo [data-k="jump"]', '#padBo [data-k="down"]'].map(s => { const r = document.querySelector(s).getBoundingClientRect(); return Math.round(r.width) + 'x' + Math.round(r.height); }));
      let a = await S();
      check(mode, 'both touch pads and round buttons are on screen', sizes.every(s => parseInt(s, 10) >= 40), sizes.join(' '));
      check(mode, 'round buttons say shoo / flap', a.btn[0] === 'shoo' && a.btn[1] === 'flap', a.btn.join(' / '));
      check(mode, 'flapper hint names the round button', /the round button/.test(a.hints[1]), a.hints[1]);
      check(mode, 'steerer hint names ▲ and ▼', /▲/.test(a.hints[0]) && /▼/.test(a.hints[0]), a.hints[0]);
      await tap('#padBo .tbtn-act'); await wait(300); let b = await S();
      check(mode, 'Bo\'s round "flap" button takes off', b.mode === 'fly' && b.flaps === 1, `${b.mode}, flaps ${b.flaps}`);
      await down('#padPip [data-k="jump"]', true);
      for (let k = 0; k < 4; k++) { await tap('#padBo .tbtn-act'); await wait(420); }
      let c = await S(); await down('#padPip [data-k="jump"]', false);
      check(mode, 'tapping "flap" flies, holding Pip\'s ▲ climbs', c.flaps >= 4 && c.y < b.y - 60, `flaps ${c.flaps}, y ${b.y} -> ${c.y}`);
      await down('#padPip [data-k="down"]', true);
      for (let k = 0; k < 2; k++) { await tap('#padBo .tbtn-act'); await wait(420); }
      let d = await S(); await down('#padPip [data-k="down"]', false);
      check(mode, 'holding Pip\'s ▼ dives', d.y > c.y + 60, `y ${c.y} -> ${d.y}`);
      await tap('#padPip .tbtn-act'); await wait(60); let e = await S();
      check(mode, 'Pip\'s round "shoo" button toots the horn', e.toot, 'toot ' + e.toot);
    }

    if (mode === 'solo') {
      // the person plays Pip (the steerer first): the computer flaps and takes off, the person steers with either keys
      await start({ solo: 0 }); await wait(400);
      let a = await S();
      check(mode, 'person steers: own hint names keys, the computer\'s says what it does', /W/.test(a.hints[0]) && /S/.test(a.hints[0]) && a.hints[1] === 'I flap the wings!', a.hints.join(' | '));
      await wait(1400); let b = await S();
      check(mode, 'the computer flaps and takes off', b.mode === 'fly' && b.flaps >= 1, `${b.mode}, flaps ${b.flaps}`);
      await page.keyboard.down('ArrowUp'); await wait(1500); let c = await S(); await page.keyboard.up('ArrowUp');
      check(mode, 'the person may use either key set (↑ climbs)', c.y < b.y - 50, `y ${b.y} -> ${c.y}`);
      // the person plays Bo (the flapper first): nothing takes off until they flap
      await start({ solo: 1 }); await wait(3000);
      let d = await S();
      check(mode, 'person flaps: hint names keys, the computer says "I steer!"', /\bF\b/.test(d.hints[1]) && d.hints[0] === 'I steer!', d.hints.join(' | '));
      check(mode, 'the computer never takes off for an idle flapper', d.mode === 'perch' && d.flaps === 0, `${d.mode}, flaps ${d.flaps}`);
      await tapKey('KeyF'); await wait(250); let e = await S();
      check(mode, 'F takes off (either key set)', e.mode === 'fly' && e.flaps === 1, `${e.mode}, flaps ${e.flaps}`);
      await beatKeys('Slash', 5); let f = await S();
      check(mode, 'the computer steers while the person flaps (it follows the trail)', f.flaps >= 5 && Math.abs(f.y - f.aim) < 60 && f.bumps === 0, `y ${f.y}, trail ${f.aim}, bumps ${f.bumps}`);
      await page.evaluate(() => { window.__pipbo.cpuSetCfg('players', 2); });
    }
    const st = await S();
    check(mode, 'no computer-brain errors', st.errs.length === 0, st.errs.join(','));
    if (shots) await page.screenshot({ path: path.join(out, 'keys-' + mode + '.png') });
    await ctx.close();
  }
  console.log(lines.join('\n'));
  if (errors.length) { console.log('PAGE ERRORS:\n' + errors.slice(0, 10).join('\n')); bad++; }
  console.log(bad ? `\n${bad} problem(s)` : '\nAll input checks passed.');
  await browser.close();
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
