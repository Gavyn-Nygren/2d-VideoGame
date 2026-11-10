#!/usr/bin/env node
// 30-1 The Time Thief, era 'race' (Portal Race Home): do the real input paths reach the runners, and do the hints name
// each device's own keys?   node tools/w30/race-keys.js [--shots]
//   kb     two people on one keyboard: real key events with the live loop running (G.manual false) for a few seconds
//          (run, hop, slide, dash for both), then a scripted "person" on real key presses who runs the first lap
//   pad    two stubbed controllers (navigator.getGamepads): stick, d-pad, A, X
//   touch  an 844x390 phone: the ◀ ▶ ▲ ▼ pads and the round buttons (pointer events); lifting the thumb off ▶ to tap ▲
//          keeps the speed
//   solo   1-player mode on the keyboard: the person's hints name keys, the computer's runner gets none; the race
//          freezes when the person is away, and starts again (a false start) when they are back
// Prints one line per check; exits 1 when one fails. --shots writes build/w30/race/keys-<mode>.png.
'use strict';
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const shots = process.argv.includes('--shots');
const out = path.resolve(__dirname, '..', '..', 'build', 'w30', 'race');
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
    // start the era with the live loop running (G.manual false: the page polls the devices and steps by itself);
    // o.go: skip most of the race card (the 3-2-1 is not what is tested here); o.open: an empty track (nothing to
    // run into while the buttons are tried one by one)
    const start = (o = {}) => page.evaluate(o2 => {
      const P = window.__pipbo, G = P.G, TT = P.MODES.timethief.test;
      if (o2.pads) window.__padOn = true;
      if (o2.solo != null) { P.cpuSetCfg('players', 1); P.cpuSetCfg('human', o2.solo); } else P.cpuSetCfg('players', 2);
      G.manual = false;
      TT.jump('race', { seed: 5 });
      if (o2.solo == null) G.cpuOn = [false, false];
      P.fit();
      if (o2.go) G.mst.ph.cardT = TTHRACE.cardT - 0.25;
      if (o2.open) { const T = G.mst.ph.T; T.obs.length = 0; for (const lap of T.laps) lap.gaps.length = 0; }
      window.__run = s => { for (let k = 0; k < Math.round(s / P.DT); k++) { P.pollInput(P.DT); P.step(P.DT); } };
      window.__race = () => {
        const st = G.mst, ph = st.ph, K = TT.TTH_PHASES.race, txt = sel => { const el = document.querySelector(sel); return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; };
        const R = ph.R.map(r => ({ x: Math.round(r.x), v: Math.round(r.v), air: r.air, y: Math.round(r.y), low: r.low, dash: +r.dash.toFixed(2), cd: +r.dashCd.toFixed(2), stun: r.stun > 0, stumbles: r.stumbles, lap: r.lap }));
        // the next thing to hop in Pip's lane (for the scripted person)
        const r0 = ph.R[0], nx = ph.T.obs.find(q => (q.kind === 'h' || q.kind === 'm') && q.x > r0.x - 10);
        return { phase: st.phase, state: ph.state, cardT: +ph.cardT.toFixed(2), t: +ph.t.toFixed(2), R, hints: st.hints.map(h => (h ? h.text : '')), labels: K.labels(st), say: st.say ? st.say.text : '',
          btn: [txt('#padPip [data-actlabel]'), txt('#padBo [data-actlabel]')], leg: [txt('[data-legp="0"]'), txt('[data-legp="1"]')],
          next: nx ? Math.round(nx.x - r0.x) : null, idle: !!st.idle, errs: [...P.CPU.errs], bumps: st.stats.bumps.concat(st.stats.team) };
      };
    }, o);
    const S = () => page.evaluate(() => window.__race());
    const run = s => page.evaluate(s2 => window.__run(s2), s);
    const manual = on => page.evaluate(on2 => { window.__pipbo.G.manual = on2; }, on);
    const wait = ms => page.waitForTimeout(ms);
    const hintOf = async (k, re, ms = 1500) => { let h = ''; for (let t = 0; t < ms; t += 100) { h = (await S()).hints[k]; if (re.test(h)) return h; await wait(100); } return h; };

    if (mode === 'kb') {
      await start({ go: true, open: true }); await wait(700);
      let a = await S();
      check(mode, 'era started and the race went live', a.phase === 'race' && a.state === 'live', a.state);
      check(mode, 'GO hints name each player\'s own key (D / →)', /\bD\b/.test(a.hints[0]) && /→/.test(a.hints[1]), a.hints.join(' | '));
      check(mode, 'top-bar legend says hop, slide, dash', /hop/.test(a.leg[0]) && /slide/.test(a.leg[0]) && /dash/.test(a.leg[0]) && /dash/.test(a.leg[1]), a.leg.join(' | '));
      await page.keyboard.down('KeyD'); await wait(1300);
      let b = await S();
      check(mode, 'holding D runs Pip (live loop); Bo stays', b.R[0].v > 240 && b.R[0].x > 150 && b.R[1].x === 0, `v ${b.R[0].v}, x ${b.R[0].x}; Bo x ${b.R[1].x}`);
      await page.keyboard.down('KeyW'); await wait(120); let c = await S(); await page.keyboard.up('KeyW');
      check(mode, 'W hops', c.R[0].air && c.R[0].y > 10, `air ${c.R[0].air}, y ${c.R[0].y}`);
      await wait(600);
      await page.keyboard.down('KeyS'); await wait(150); let d = await S(); await page.keyboard.up('KeyS');
      check(mode, 'S slides', d.R[0].low, 'low ' + d.R[0].low);
      await wait(300);
      await page.keyboard.down('KeyF'); await wait(100); let e = await S(); await page.keyboard.up('KeyF');
      check(mode, 'F dashes (and the cooldown starts)', e.R[0].dash > 0 && e.R[0].cd > 2, `dash ${e.R[0].dash}, cd ${e.R[0].cd}`);
      await page.keyboard.up('KeyD');
      await page.keyboard.down('ArrowRight'); await wait(1300); let f = await S();
      check(mode, 'holding → runs Bo', f.R[1].v > 240, `v ${f.R[1].v}`);
      await page.keyboard.down('ArrowUp'); await wait(120); let g = await S(); await page.keyboard.up('ArrowUp');
      check(mode, '↑ hops', g.R[1].air && g.R[1].y > 10, `y ${g.R[1].y}`);
      await wait(600);
      await page.keyboard.down('ArrowDown'); await wait(150); let h = await S(); await page.keyboard.up('ArrowDown');
      check(mode, '↓ slides', h.R[1].low, 'low ' + h.R[1].low);
      await wait(300);
      await page.keyboard.down('Slash'); await wait(100); let i = await S(); await page.keyboard.up('Slash');
      check(mode, '/ dashes', i.R[1].dash > 0, `dash ${i.R[1].dash}`);
      await page.keyboard.up('ArrowRight');
      // a scripted person on real keys: runs Pip through the dinosaur lap, hopping logs and meteor rocks
      await start({ go: true }); await manual(true); await run(0.4);
      await page.keyboard.down('KeyD');
      let s = await S(), t = 0, sawHop = '', sawMet = '', up = false;
      while (s.R[0].lap < 1 && t < 40) {
        const want = s.next != null && !s.R[0].air && s.next / Math.max(120, s.R[0].v) <= 0.27 && s.next > 0;
        if (want && !up) { await page.keyboard.down('KeyW'); up = true; } else if (!want && up) { await page.keyboard.up('KeyW'); up = false; }
        await run(1 / 30); t += 1 / 30;
        s = await S();
        if (/Hop over it: W/.test(s.hints[0])) sawHop = s.hints[0];
        if (/meteor/.test(s.hints[0])) sawMet = s.hints[0];
      }
      if (up) await page.keyboard.up('KeyW');
      await page.keyboard.up('KeyD');
      check(mode, 'a scripted person on real keys runs the dinosaur lap', s.R[0].lap >= 1 && s.R[0].stumbles <= 2, `lap ${s.R[0].lap + 1} after ${t.toFixed(1)} s, ${s.R[0].stumbles} stumbles`);
      check(mode, 'first-time hints name Pip\'s own key (hop, meteor)', /W/.test(sawHop) && /W/.test(sawMet), sawHop + ' | ' + sawMet);
      check(mode, 'race stumbles are no team bumps', s.bumps.every(n => n === 0), s.bumps.join('+'));
    }

    if (mode === 'pad') {
      await start({ pads: true, open: true }); await wait(400);
      const pad = (ix, f) => page.evaluate(({ ix, f }) => { const p = window.__pads[ix]; new Function('p', f)(p); }, { ix, f });
      const btn = (ix, n, on) => pad(ix, `p.buttons[${n}] = { pressed: ${on}, value: ${on ? 1 : 0} };`);
      await btn(0, 0, true); await btn(1, 0, true); await wait(150); await btn(0, 0, false); await btn(1, 0, false); await wait(300);   // wake both pads (the first press only connects them)
      await page.evaluate(() => { window.__pipbo.G.mst.ph.cardT = TTHRACE.cardT - 0.25; });
      const h0 = await hintOf(0, /stick/), h1 = await hintOf(1, /stick/);
      check(mode, 'GO hints name the stick for both', /stick ▶/.test(h0) && /stick ▶/.test(h1), h0 + ' | ' + h1);
      await pad(0, 'p.axes[0] = 1;'); await wait(1300); let b = await S();
      check(mode, 'Pip\'s stick ▶ runs', b.R[0].v > 240, 'v ' + b.R[0].v);
      await btn(0, 0, true); await wait(120); let c = await S(); await btn(0, 0, false);
      check(mode, 'A hops', c.R[0].air && c.R[0].y > 10, 'y ' + c.R[0].y);
      await wait(600);
      await pad(0, 'p.axes[0] = 0; p.axes[1] = 1;'); await wait(150); let d = await S(); await pad(0, 'p.axes[0] = 1; p.axes[1] = 0;');
      check(mode, 'stick down slides (and the runner keeps going)', d.R[0].low && d.R[0].v > 150, `low ${d.R[0].low}, v ${d.R[0].v}`);
      await wait(300);
      await btn(0, 2, true); await wait(100); let e = await S(); await btn(0, 2, false);
      check(mode, 'X dashes', e.R[0].dash > 0, 'dash ' + e.R[0].dash);
      await btn(1, 15, true); await wait(1300); let f = await S();
      check(mode, 'Bo\'s d-pad ▶ runs', f.R[1].v > 240, 'v ' + f.R[1].v);
      await pad(1, 'p.axes[1] = -1;'); await wait(120); let g = await S(); await pad(1, 'p.axes[1] = 0;');
      check(mode, 'stick up hops too', g.R[1].air, 'air ' + g.R[1].air);
      await wait(600);
      await btn(1, 5, true); await wait(100); let h = await S(); await btn(1, 5, false); await btn(1, 15, false); await pad(0, 'p.axes[0] = 0;');
      check(mode, 'Bo\'s RB (action) dashes', h.R[1].dash > 0, 'dash ' + h.R[1].dash);
      const texts = await page.evaluate(() => [tthKey(0, 'right'), tthKey(0, 'jump'), tthKey(0, 'down'), tthKey(0, 'act'), tthKey(1, 'act')]);
      check(mode, 'key names for controllers', texts[0] === 'stick ▶' && texts[2] === 'stick down' && texts[3] === 'X' && texts[1] === 'A', texts.join(' | '));
    }

    if (mode === 'touch') {
      await start({ go: true, open: true }); await wait(700);
      const down = (sel, on, side) => page.evaluate(({ sel, on, side }) => {
        const el = document.querySelector(sel), r = el.getBoundingClientRect();
        el.dispatchEvent(new PointerEvent(on ? 'pointerdown' : 'pointerup', { bubbles: true, pointerId: sel.length + (side || 0) + 3, pointerType: 'touch', isPrimary: true, clientX: r.left + r.width * (side === -1 ? 0.25 : side === 1 ? 0.75 : 0.5), clientY: r.top + r.height / 2 }));
      }, { sel, on, side });
      const sizes = await page.evaluate(() => ['#padPip .tbtn-act', '#padBo .tbtn-act', '#padPip [data-k="jump"]', '#padPip [data-k="down"]', '#padPip .tmove'].map(s => { const r = document.querySelector(s).getBoundingClientRect(); return Math.round(r.width) + 'x' + Math.round(r.height); }));
      let a = await S();
      check(mode, 'both touch pads and round buttons are on screen', sizes.every(s => parseInt(s, 10) >= 40), sizes.join(' '));
      check(mode, 'round buttons say dash / dash', a.btn[0] === 'dash' && a.btn[1] === 'dash', a.btn.join(' / '));
      check(mode, 'GO hints name ▶', /▶/.test(a.hints[0]) && /▶/.test(a.hints[1]), a.hints.join(' | '));
      await down('#padPip .tmove', true, 1); await wait(1400); let b = await S();
      check(mode, 'holding Pip\'s ▶ runs', b.R[0].v > 240, 'v ' + b.R[0].v);
      // the thumb leaves ▶ to tap ▲: the speed stays
      await down('#padPip .tmove', false, 1);
      await down('#padPip [data-k="jump"]', true); await wait(120); let c = await S(); await down('#padPip [data-k="jump"]', false);
      await wait(100); await down('#padPip .tmove', true, 1); await wait(100); let c2 = await S();
      check(mode, 'thumb off ▶ to tap ▲: a hop, and the speed stays', c.R[0].air && c2.R[0].v > b.R[0].v - 30, `air ${c.R[0].air}, v ${b.R[0].v} -> ${c2.R[0].v}`);
      await wait(600);
      await down('#padPip .tmove', false, 1);
      await down('#padPip [data-k="down"]', true); await wait(200); let d = await S(); await down('#padPip [data-k="down"]', false);
      await down('#padPip .tmove', true, 1); await wait(300); let d2 = await S();
      check(mode, 'thumb off ▶ to hold ▼: a slide, then running on', d.R[0].low && d2.R[0].v > 200, `low ${d.R[0].low}, v after ${d2.R[0].v}`);
      await down('#padPip .tbtn-act', true); await wait(100); let e = await S(); await down('#padPip .tbtn-act', false);
      check(mode, 'Pip\'s round "dash" button dashes', e.R[0].dash > 0, 'dash ' + e.R[0].dash);
      await down('#padPip .tmove', false, 1);
      await down('#padBo .tmove', true, 1); await wait(1300); let f = await S();
      check(mode, 'holding Bo\'s ▶ runs', f.R[1].v > 240, 'v ' + f.R[1].v);
      await down('#padBo .tbtn-act', true); await wait(100); let g = await S(); await down('#padBo .tbtn-act', false); await down('#padBo .tmove', false, 1);
      check(mode, 'Bo\'s round "dash" button dashes', g.R[1].dash > 0, 'dash ' + g.R[1].dash);
      const texts = await page.evaluate(() => [tthKey(0, 'right'), tthKey(0, 'jump'), tthKey(0, 'down'), tthKey(0, 'act')]);
      check(mode, 'key names for touch', texts[0] === '▶' && texts[1] === '▲' && texts[2] === '▼' && /round button/.test(texts[3]), texts.join(' | '));
    }

    if (mode === 'solo') {
      // the person plays Pip; the computer is the opponent (Bo)
      await start({ solo: 0, go: true }); await wait(700);
      let a = await S();
      check(mode, 'the person\'s hint names a key, the computer\'s runner gets none', /\bD\b/.test(a.hints[0]) && a.hints[1] === '', a.hints.join(' | '));
      await page.keyboard.down('ArrowRight'); await wait(1300); let b = await S(); await page.keyboard.up('ArrowRight');
      check(mode, 'the person may use either key set (→ runs Pip)', b.R[0].v > 240, 'v ' + b.R[0].v);
      check(mode, 'the computer races', b.R[1].x > 200, 'Bo x ' + b.R[1].x);
      // away at GO: the race freezes after 10 s, and starts again when the person is back
      await start({ solo: 0, go: true }); await manual(true); await run(12); let c = await S(); await run(20); let d = await S();
      check(mode, 'person away: the race freezes (the Thief waits)', c.idle && d.idle && d.R[1].x === c.R[1].x && d.state === 'live', `idle ${d.idle}, Bo x ${c.R[1].x} -> ${d.R[1].x}`);
      await page.keyboard.down('KeyD'); await run(0.3); let e = await S();
      check(mode, 'back again: a false start, the race is run again', e.state === 'card' && e.R[1].x === 0 && !e.idle, `${e.state}, Bo x ${e.R[1].x}, "${e.say}"`);
      await run(4); let f = await S(); await page.keyboard.up('KeyD');
      check(mode, 'the new race goes live and the person runs', f.state === 'live' && f.R[0].x > 50, `${f.state}, Pip x ${f.R[0].x}`);
      // away in the middle of a race: frozen too, and it simply goes on afterwards
      await page.keyboard.down('KeyD'); await run(3); await page.keyboard.up('KeyD'); await run(11); let g = await S(); await run(15); let h = await S();
      check(mode, 'person away mid-race: frozen', g.idle && h.R[1].x === g.R[1].x && h.t === g.t, `Bo x ${g.R[1].x} -> ${h.R[1].x}`);
      await page.keyboard.down('KeyD'); await run(1); let i = await S(); await page.keyboard.up('KeyD');
      check(mode, 'back mid-race: the same race goes on', i.state === 'live' && i.R[1].x > h.R[1].x && i.t > h.t, `${i.state}, Bo x ${h.R[1].x} -> ${i.R[1].x}`);
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
