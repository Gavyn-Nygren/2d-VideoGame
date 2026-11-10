#!/usr/bin/env node
// 30-1 The Time Thief, era 'olympics': do the real input paths reach the chariot, and do the hints name each device's
// own keys?   node tools/w30/olympics-keys.js [--shots]
//   kb     two people on one keyboard: real key events with the live loop running (G.manual false) for a few seconds,
//          then a scripted "person" who drives and grabs with real key presses until 2 olive branches are taken, then
//          the jobs after the lap line (labels, hints, legend, keys)
//   pad    two stubbed controllers (navigator.getGamepads): stick, d-pad, A, X
//   touch  an 844x390 phone: the ◀ ▶ ▲ ▼ pads and the round buttons (pointer events)
//   solo   1-player mode on the keyboard: the person's hints name keys, the computer's say what it does
// Prints one line per check; exits 1 when one fails. --shots writes build/w30/olympics/keys-<mode>.png.
'use strict';
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const shots = process.argv.includes('--shots');
const out = path.resolve(__dirname, '..', '..', 'build', 'w30', 'olympics');
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
    page.on('console', m => { if (m.type() === 'error') errors.push(mode + ': ' + m.text()); });
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
      TT.jump('olympics', { seed: 5 });
      if (o2.solo == null) G.cpuOn = [false, false];
      P.fit();
      window.__run = s => { for (let k = 0; k < Math.round(s / P.DT); k++) { P.pollInput(P.DT); P.step(P.DT); } };
      window.__oly = () => {
        const st = G.mst, ph = st.ph, K = TT.TTH_PHASES.olympics, txt = sel => { const el = document.querySelector(sel); return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; };
        const hookX = ph.x + 104;
        const br = ph.obs.filter(q => q.kind === 'branch' && !q.sock && !q.got && !q.passed && q.x > hookX - 40).sort((a, b) => a.x - b.x)[0];
        return { phase: st.phase, mode: ph.mode, x: Math.round(ph.x), v: Math.round(ph.v), lane: ph.lane, ly: ph.ly, reach: +ph.reach.toFixed(2), cool: +ph.cool.toFixed(2), spurT: +ph.spurT.toFixed(2), driver: ph.driver, lap: ph.lap,
          got: ph.got, branches: st.stats.olympics.branches, hints: st.hints.map(h => (h ? h.text : '')), labels: K.labels(st),
          btn: [txt('#padPip [data-actlabel]'), txt('#padBo [data-actlabel]')], leg: [txt('[data-legp="0"]'), txt('[data-legp="1"]')],
          br: br ? { d: Math.round(br.x - hookX), lane: br.lane } : null, idle: !!st.idle, errs: [...P.CPU.errs] };
      };
    }, o);
    const S = () => page.evaluate(() => window.__oly());
    const run = s => page.evaluate(s2 => window.__run(s2), s);
    const manual = on => page.evaluate(on2 => { window.__pipbo.G.manual = on2; }, on);
    const wait = ms => page.waitForTimeout(ms);
    const tapKey = async (code, ms = 90) => { await page.keyboard.down(code); await wait(ms); await page.keyboard.up(code); await wait(260); };

    if (mode === 'kb') {
      await start(); await wait(400);
      let a = await S();
      check(mode, 'era started (Bo drives lap 1)', a.phase === 'olympics' && a.driver === 1 && a.mode === 'start', a.mode);
      check(mode, 'driver hint names Bo\'s own key', /→/.test(a.hints[1]), a.hints[1]);
      check(mode, 'grabber hint names Pip\'s own key', /\bF\b/.test(a.hints[0]), a.hints[0]);
      check(mode, 'top-bar legend: Pip grabs with F, Bo drives with arrows', /hold, then let go/.test(a.leg[0]) && /grab/.test(a.leg[0]) && /gallop/.test(a.leg[1]) && /lanes/.test(a.leg[1]), a.leg.join(' | '));
      // real keys, live loop
      await page.keyboard.down('ArrowRight'); await wait(2000);
      let b = await S();
      check(mode, 'holding → gallops (live loop)', b.v > 250 && b.x > a.x + 300, `v ${b.v}, x ${a.x} -> ${b.x}`);
      await tapKey('ArrowDown'); let c = await S();
      check(mode, '↓ moves one lane down', c.lane === b.lane + 1, `${b.lane} -> ${c.lane}`);
      await tapKey('ArrowUp'); await tapKey('ArrowUp'); let d = await S();
      check(mode, '↑ ↑ moves two lanes up', d.lane === 0, `${c.lane} -> ${d.lane}`);
      await page.keyboard.down('KeyF'); await wait(450); let e = await S();
      check(mode, 'holding F swings the hook out', e.reach > 0.9, 'reach ' + e.reach);
      await page.keyboard.up('KeyF'); await wait(60); let f = await S();
      check(mode, 'letting F go snatches (the arm comes back)', f.reach < e.reach && f.cool > 0, `reach ${f.reach}, rest ${f.cool}`);
      await page.keyboard.up('ArrowRight'); await page.keyboard.down('ArrowLeft'); await wait(900); let g = await S();
      check(mode, 'holding ← reins in', g.v < 200, `v ${f.v} -> ${g.v}`);
      await page.keyboard.up('ArrowLeft'); await wait(100);
      await page.keyboard.down('Slash'); await wait(80); await page.keyboard.up('Slash'); await wait(60); let h = await S(); await wait(700); let h2 = await S();
      check(mode, 'Bo\'s action key (/) spurs the horses', h.spurT > 0.8 && h2.v > g.v + 100, `spur ${h.spurT}, v ${g.v} -> ${h2.v}`);
      // a scripted person on real keys: drive under the branches, hold F early, let go at the branch
      await manual(true);
      const held = {}; const key = async (code, on) => { if (!!held[code] === on) return; held[code] = on; if (on) await page.keyboard.down(code); else await page.keyboard.up(code); };
      let s = await S(), t = 0, laneCD = 0;
      await key('ArrowRight', true);
      while (s.branches < 2 && t < 45) {
        if (s.br) {
          laneCD -= 1 / 30;
          if (s.br.lane !== s.lane && laneCD <= 0) { const code = s.br.lane < s.lane ? 'ArrowUp' : 'ArrowDown'; await key(code, true); await run(1 / 30); await key(code, false); t += 1 / 30; laneCD = 0.3; }
          await key('KeyF', s.br.lane === s.lane && s.br.d < Math.max(s.v, 200) * 0.6 && s.br.d > 20 && s.cool <= 0);
        } else await key('KeyF', false);
        await run(1 / 30); t += 1 / 30;
        s = await S();
      }
      for (const code of Object.keys(held)) await key(code, false);
      check(mode, 'a scripted person on real keys grabs 2 olive branches', s.branches >= 2, `${s.branches} branches in ${t.toFixed(1)} s, gauge ${s.got}`);
      // after the lap line the jobs swap: the computer plays lap 1 to the end, then people take over
      await page.evaluate(() => { const P = window.__pipbo, G = P.G; G.cpuOn = [true, true]; let n = 0; while (G.mst.ph.lap < 1 && n++ < 120 * 120) P.step(P.DT); G.cpuOn = [false, false]; for (const p of G.players) for (const k in p.input) p.input[k] = false; });
      await page.keyboard.down('KeyD'); await run(1.6); let m = await S();
      check(mode, 'lap 2: Pip drives now, D gallops', m.lap === 1 && m.driver === 0 && m.v > 150, `lap ${m.lap + 1}, driver ${m.driver}, v ${m.v}`);
      check(mode, 'lap 2: action words swapped (buttons and legend)', m.labels[0] === 'gallop' && m.labels[1] === 'grab' && m.btn[0] === 'gallop' && m.btn[1] === 'grab' && /lanes/.test(m.leg[0]) && /hold, then let go/.test(m.leg[1]), m.btn.join('/') + ' | ' + m.leg.join(' | '));
      check(mode, 'lap 2: hints name the new keys (W / S for Pip, / for Bo)', /W/.test(m.hints[0]) && /S/.test(m.hints[0]) && /\//.test(m.hints[1]), m.hints.join(' | '));
      const dnKey = m.lane === 2 ? 'KeyW' : 'KeyS';
      await page.keyboard.down(dnKey); await run(0.1); await page.keyboard.up(dnKey); await run(0.3); let n2 = await S();
      check(mode, 'lap 2: ' + (dnKey === 'KeyW' ? 'W moves Pip\'s chariot a lane up' : 'S moves Pip\'s chariot a lane down'), n2.lane === m.lane + (dnKey === 'KeyW' ? -1 : 1), `${m.lane} -> ${n2.lane}`);
      await page.keyboard.down('Slash'); await run(0.4); let n3 = await S(); await page.keyboard.up('Slash'); await page.keyboard.up('KeyD');
      check(mode, 'lap 2: Bo\'s / swings the hook out', n3.reach > 0.9, 'reach ' + n3.reach);
    }

    if (mode === 'pad') {
      await start({ pads: true }); await wait(500);
      const pad = (ix, f) => page.evaluate(({ ix, f }) => { const p = window.__pads[ix]; new Function('p', f)(p); }, { ix, f });
      const btn = (ix, n, on) => pad(ix, `p.buttons[${n}] = { pressed: ${on}, value: ${on ? 1 : 0} };`);
      await btn(0, 0, true); await btn(1, 0, true); await wait(150); await btn(0, 0, false); await btn(1, 0, false); await wait(500);   // wake both pads (the first press only connects them)
      let a = await S();
      check(mode, 'driver hint names the stick', /stick/.test(a.hints[1]) || /stick/.test((await (async () => { await wait(300); return (await S()).hints[1]; })())), a.hints[1]);
      check(mode, 'grabber hint names the controller\'s action button (X)', /\bX\b/.test(a.hints[0]) || a.hints[0] === '', a.hints[0]);
      await pad(1, 'p.axes[0] = 1;'); await wait(1800); let b = await S();
      check(mode, 'Bo\'s stick ▶ gallops', b.v > 250, 'v ' + b.v);
      await pad(1, 'p.axes[0] = 0.75; p.axes[1] = 0.75;'); await wait(140); await pad(1, 'p.axes[0] = 1; p.axes[1] = 0;'); await wait(300); let c = await S();
      check(mode, 'stick down-right: a lane down, still galloping', c.lane === b.lane + 1 && c.v > 250, `${b.lane} -> ${c.lane}, v ${c.v}`);
      await pad(1, 'p.axes[1] = -1; p.axes[0] = 0;'); await wait(140); await pad(1, 'p.axes[1] = 0; p.axes[0] = 1;'); await wait(300); let d = await S();
      check(mode, 'stick up: a lane up', d.lane === c.lane - 1, `${c.lane} -> ${d.lane}`);
      await btn(1, 13, true); await wait(120); await btn(1, 13, false); await wait(300); let d1 = await S();
      check(mode, 'd-pad down: a lane down', d1.lane === d.lane + 1, `${d.lane} -> ${d1.lane}`);
      await btn(1, 0, true); await wait(120); await btn(1, 0, false); await wait(300); let d2 = await S();
      check(mode, 'A (the jump button) is "up" too', d2.lane === d1.lane - 1, `${d1.lane} -> ${d2.lane}`);
      await btn(0, 2, true); await wait(450); let e = await S();
      check(mode, 'Pip\'s X held swings the hook out', e.reach > 0.9, 'reach ' + e.reach);
      await btn(0, 2, false); await wait(60); let f = await S();
      check(mode, 'letting X go snatches', f.reach < e.reach && f.cool > 0, `reach ${f.reach}`);
      await pad(1, 'p.axes[0] = 0;'); await btn(1, 14, true); await wait(900); let g = await S(); await btn(1, 14, false);
      check(mode, 'd-pad ◀ reins in', g.v < 200, 'v ' + g.v);
      await btn(1, 5, true); await wait(100); await btn(1, 5, false); await wait(700); let h = await S();
      check(mode, 'Bo\'s RB (action) spurs the horses', h.v > g.v + 100, `v ${g.v} -> ${h.v}`);
      // every hint for both jobs on controllers
      const texts = await page.evaluate(() => { const st = window.__pipbo.G.mst; return [tthKey(1, 'right'), tthKey(1, 'up'), tthKey(1, 'down'), tthKey(1, 'left'), tthOlyAct(st, 0), tthOlyAct(st, 1)]; });
      check(mode, 'key names for controllers', texts[0] === 'stick ▶' && texts[1] === 'stick up' && texts[2] === 'stick down' && texts[4] === 'X', texts.join(' | '));
    }

    if (mode === 'touch') {
      await start(); await wait(500);
      const down = (sel, on, side) => page.evaluate(({ sel, on, side }) => {
        const el = document.querySelector(sel), r = el.getBoundingClientRect();
        el.dispatchEvent(new PointerEvent(on ? 'pointerdown' : 'pointerup', { bubbles: true, pointerId: sel.length + (side || 0) + 3, pointerType: 'touch', isPrimary: true, clientX: r.left + r.width * (side === -1 ? 0.25 : side === 1 ? 0.75 : 0.5), clientY: r.top + r.height / 2 }));
      }, { sel, on, side });
      const tap = async (sel, ms = 100) => { await down(sel, true); await wait(ms); await down(sel, false); await wait(280); };
      const sizes = await page.evaluate(() => ['#padPip .tbtn-act', '#padBo .tbtn-act', '#padBo [data-k="jump"]', '#padBo [data-k="down"]', '#padBo .tmove'].map(s => { const r = document.querySelector(s).getBoundingClientRect(); return Math.round(r.width) + 'x' + Math.round(r.height); }));
      let a = await S();
      check(mode, 'both touch pads and round buttons are on screen', sizes.every(s => parseInt(s, 10) >= 40), sizes.join(' '));
      check(mode, 'round buttons say grab / gallop', a.btn[0] === 'grab' && a.btn[1] === 'gallop', a.btn.join(' / '));
      check(mode, 'driver hint names ▶ and the gallop button', /▶/.test(a.hints[1]), a.hints[1]);
      check(mode, 'grabber hint names the grab button', /the grab button/.test(a.hints[0]), a.hints[0]);
      await down('#padBo .tmove', true, 1); await wait(1800); let b = await S();
      check(mode, 'holding Bo\'s ▶ gallops', b.v > 250, 'v ' + b.v);
      await down('#padBo .tmove', false, 1);
      await tap('#padBo [data-k="down"]'); let c = await S();
      check(mode, 'Bo\'s ▼ (thumb off ▶): a lane down, the horses keep running', c.lane === b.lane + 1 && c.v > b.v - 80, `${b.lane} -> ${c.lane}, v ${b.v} -> ${c.v}`);
      await tap('#padBo [data-k="jump"]'); let d = await S();
      check(mode, 'Bo\'s ▲: a lane up', d.lane === c.lane - 1, `${c.lane} -> ${d.lane}`);
      await wait(1500); let d2 = await S();
      await tap('#padBo .tbtn-act', 80); await wait(500); let e = await S();
      check(mode, 'Bo\'s round "gallop" button spurs the horses', e.v > d2.v + 60, `v ${d2.v} -> ${e.v}`);
      await down('#padPip .tbtn-act', true); await wait(450); let f = await S();
      check(mode, 'holding Pip\'s round "grab" button swings the hook out', f.reach > 0.9, 'reach ' + f.reach);
      await down('#padPip .tbtn-act', false); await wait(60); let g = await S();
      check(mode, 'letting go snatches', g.reach < f.reach && g.cool > 0, 'reach ' + g.reach);
      await down('#padBo .tmove', true, -1); await wait(900); let h = await S(); await down('#padBo .tmove', false, -1);
      check(mode, 'Bo\'s ◀ reins in', h.v < 200, 'v ' + h.v);
    }

    if (mode === 'solo') {
      // the person plays Pip (the grabber in lap 1): the computer drives
      await start({ solo: 0 }); await wait(500);
      let a = await S();
      check(mode, 'person grabs: own hint names keys, the computer\'s says what it does', /\bF\b/.test(a.hints[0]) && a.hints[1] === 'I\'ll drive!', a.hints.join(' | '));
      await page.keyboard.down('Slash'); await wait(450); let b = await S(); await page.keyboard.up('Slash');
      check(mode, 'the person may use either key set (/ swings Pip\'s hook)', b.reach > 0.9, 'reach ' + b.reach);
      await wait(1500); let c = await S();
      check(mode, 'the computer drives while the person plays', c.v > 200, 'v ' + c.v);
      // the person plays Bo (the driver in lap 1): nothing moves until they gallop
      await start({ solo: 1 }); await wait(2500);
      let d = await S();
      check(mode, 'person drives: hint names keys, the computer says "I\'ll grab!"', /\bD\b/.test(d.hints[1]) && d.hints[0] === 'I\'ll grab!', d.hints.join(' | '));
      check(mode, 'the computer never drives for an idle person', d.v === 0 && d.mode === 'start', `v ${d.v}, ${d.mode}`);
      await page.keyboard.down('KeyD'); await wait(1500); let e = await S(); await page.keyboard.up('KeyD');
      check(mode, 'D gallops (either key set)', e.v > 250, 'v ' + e.v);
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
