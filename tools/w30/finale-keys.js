#!/usr/bin/env node
// 30-1 The Time Thief, era 'finale' (The End of Time): do the real input paths work both jobs and the smash, and do
// the hints name each device's own keys?   node tools/w30/finale-keys.js [--shots]
//   kb     two people on one keyboard: real key events with the live loop running (G.manual false): Pip walks to the
//          lever and holds F (the brake), Bo walks and jumps; Bo presses / at the button, Pip rides the lift; after the
//          swap Bo brakes with / ; at the top F + / together smash the machine; the kick is dodged by letting go
//   pad    two stubbed controllers (navigator.getGamepads): d-pad / stick, A (jump), X (brake / press / smash)
//   touch  an 844x390 phone: the ◀ ▶ ▲ pads and the round buttons (pointer events)
//   solo   1-player mode, both ways round: the person's hints name keys, the computer's only say what it does; the
//          computer takes the other job, waits for the person, and never clears a climb for an idle person
// Prints one line per check; exits 1 when one fails. --shots writes build/w30/finale/keys-<name>.png.
'use strict';
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const shots = process.argv.includes('--shots');
const out = path.resolve(__dirname, '..', '..', 'build', 'w30', 'finale');
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
    page.on('console', m => { if (m.type() === 'error' && /tth-finale|tthFin|TTHFIN/.test(m.text() + (m.location() ? m.location().url : ''))) errors.push(mode + ': ' + m.text()); });
    await page.addInitScript(() => {
      const mk = (ix, id) => ({ buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })), axes: [0, 0, 0, 0], connected: true, mapping: 'standard', id, index: ix, timestamp: 0 });
      window.__pads = [mk(0, 'Stub pad (Pip)'), mk(1, 'Stub pad (Bo)')];
      window.__padOn = false;
      navigator.getGamepads = () => (window.__padOn ? window.__pads : []);
    });
    await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
    await page.waitForFunction(() => window.__pipbo && window.__pipbo.MODES && window.__pipbo.MODES.timethief);
    if (touch) await page.evaluate(() => { enableTouch(); Pads.lastNonPad = 'touch'; setKind('touch'); });
    // start the era; o.live: the page's own loop polls the devices and steps (G.manual false)
    const start = (o = {}) => page.evaluate(o2 => {
      const P = window.__pipbo, G = P.G, TT = P.MODES.timethief.test;
      if (o2.pads) window.__padOn = true;
      if (o2.solo != null) { P.cpuSetCfg('players', 1); P.cpuSetCfg('human', o2.solo); } else P.cpuSetCfg('players', 2);
      G.manual = !o2.live;
      TT.jump('finale', { seed: 5 });
      if (o2.solo == null) G.cpuOn = [false, false];
      P.fit();
      window.__run = s => { for (let k = 0; k < Math.round(s / P.DT); k++) { P.pollInput(P.DT); P.step(P.DT); } };
      // the computer pair plays on until `until(ph)` is true (then the people take over again)
      window.__auto = (untilSrc, max) => {
        const until = new Function('ph', 'st', 'return (' + untilSrc + ')'), st = G.mst, was = G.cpuOn.slice();
        G.cpuOn = [true, true]; let n = 0;
        while (!until(st.ph, st) && !st.cut && n++ < max / P.DT) P.step(P.DT);
        G.cpuOn = was; for (const p of G.players) for (const k in p.input) p.input[k] = false;
        return n * P.DT;
      };
      // put a player on a deck spot (a test fixture: feet on deck `d` at x)
      window.__put = (id, x, d) => { const st = G.mst, ph = st.ph, p = G.players[id], dk = ph.c.decks[d]; p.x = x - p.w / 2; p.y = dk.y - p.h - st.cam.y; p.vx = p.vy = 0; p.grounded = true; ph.P[id].on = dk.plat; };
      window.__fin = () => {
        const st = G.mst, ph = st.ph, K = TT.TTH_PHASES.finale, ps = G.players, txt = sel => { const el = document.querySelector(sel); return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; };
        const on = id => { const q = ph.P[id].on; return q ? (q.el ? q.el.id : q.kind) : 'air'; };
        return { phase: st.phase, stage: ph.stage, k: ph.k, holder: ph.holder, braking: !!ph.braking, grip: +ph.grip.toFixed(2), slip: !!ph.slip, kick: ph.kick ? +ph.kick.t.toFixed(2) : null,
          lever: ph.sec.lever.x, button: ph.sec.button.x, liftX: ph.sec.lift.x + ph.sec.lift.w / 2, hand: +ph.hand.k.toFixed(3),
          x: ps.map(p => Math.round(p.x + p.w / 2)), feet: ps.map(p => Math.round(p.y + p.h + st.cam.y)), g: ps.map(p => p.grounded), on: [on(0), on(1)],
          top: ph.top ? { state: ph.top.state, hits: ph.top.hits, miss: ph.top.miss } : null, home: st.stats.finale.home, kicks: st.stats.finale.kicks,
          hints: st.hints.map(h => (h ? h.text : '')), labels: K.labels(st), keys: [0, 1].map(id => ({ act: tthKey(id, 'act'), jump: tthKey(id, 'jump'), left: tthKey(id, 'left'), right: tthKey(id, 'right') })),
          btn: [txt('#padPip [data-actlabel]'), txt('#padBo [data-actlabel]')], leg: [txt('[data-legp="0"]'), txt('[data-legp="1"]')], pad: txt('.pad-only'),
          bubbles: P.CPU.bubbles.map(b => (b && b.t > 0 ? b.text : '')), idle: !!st.idle, bumps: st.stats.bumps.slice(), errs: [...P.CPU.errs] };
      };
    }, o);
    const S = () => page.evaluate(() => window.__fin());
    const run = s => page.evaluate(s2 => window.__run(s2), s);
    const auto = (until, max = 200) => page.evaluate(({ until, max }) => window.__auto(until, max), { until, max });
    const put = (id, x, d) => page.evaluate(({ id, x, d }) => window.__put(id, x, d), { id, x, d });
    const wait = ms => page.waitForTimeout(ms);
    const shot = async name => { if (shots) await page.screenshot({ path: path.join(out, 'keys-' + name + '.png') }); };
    const has = (text, key) => !!key && String(text).includes(key);
    // walk a player to x with real presses of `left` / `right` (stepped by the test)
    const walk = async (id, tx, press, release, tol = 14) => {
      for (let n = 0; n < 200; n++) {
        const s = await S(), d = tx - s.x[id];
        if (Math.abs(d) <= tol) break;
        const k = d < 0 ? 'left' : 'right';
        await press(k); await run(Math.min(0.5, Math.max(0.04, (Math.abs(d) - tol * 0.5) / 220))); await release(k); await run(0.12);
      }
      return S();
    };

    if (mode === 'kb') {
      const KEY = [{ left: 'KeyA', right: 'KeyD', jump: 'KeyW', act: 'KeyF' }, { left: 'ArrowLeft', right: 'ArrowRight', jump: 'ArrowUp', act: 'Slash' }];
      await start({ live: true }); await wait(1500);
      let a = await S();
      check(mode, 'era started: Pip brakes first, Bo climbs (labels, legend)', a.phase === 'finale' && a.holder === 0 && a.labels.join() === 'brake,press' && /lever/.test(a.leg[0]) && /climb/.test(a.leg[1]), a.labels.join('/') + ' | ' + a.leg.join(' | '));
      check(mode, 'the holder\'s hint names Pip\'s own key (F); the climber\'s names no key', /\bF\b/.test(a.hints[0]) && /climb/i.test(a.hints[1]), a.hints.join(' | '));
      // real keys, live loop: Pip to the lever, then the brake
      await page.keyboard.down('KeyA'); await wait(260); await page.keyboard.up('KeyA'); await wait(200); let b = await S();
      check(mode, 'holding A walks Pip to the lever (live loop)', b.x[0] < a.x[0] - 25 && Math.abs(b.x[0] - b.lever) <= 42, `x ${a.x[0]} -> ${b.x[0]}, lever ${b.lever}`);
      await page.keyboard.down('KeyF'); await wait(700); let c = await S();
      check(mode, 'holding F brakes the clock: the grip drains, the hand stops', c.braking && c.grip < 0.97, `braking ${c.braking}, grip ${c.grip}`);
      await wait(400); let c2 = await S();
      check(mode, 'while F is held the huge hand stands still', c2.hand === c.hand, `${c.hand} -> ${c2.hand}`);
      await page.keyboard.up('KeyF'); await wait(300); let d = await S();
      check(mode, 'letting go of F lets go of the brake', !d.braking, 'braking ' + d.braking);
      await page.keyboard.down('ArrowRight'); await wait(400); await page.keyboard.up('ArrowRight'); let e = await S();
      check(mode, 'Bo walks with →', e.x[1] > d.x[1] + 40, `x ${d.x[1]} -> ${e.x[1]}`);
      await page.keyboard.down('ArrowUp'); await wait(180); let f = await S(); await page.keyboard.up('ArrowUp'); await wait(700);
      check(mode, 'Bo jumps with ↑', !f.g[1], 'grounded ' + f.g[1]);
      await shot('kb-brake');
      // stepped from here: Bo at the button presses / ; Pip takes the lift
      await page.evaluate(() => { window.__pipbo.G.manual = true; });
      let g0 = await S();
      await put(1, g0.button - 60, 1); await run(0.2);
      await page.keyboard.down('Slash'); await run(0.1); await page.keyboard.up('Slash'); await run(0.3); let g = await S();
      check(mode, 'a press away from the button gets a hint, not the lift', g.stage === 'climb' && /button/i.test(g.hints[1]), `${g.stage}, "${g.hints[1]}"`);
      const pr = id => k => page.keyboard.down(KEY[id][k]), rl = id => k => page.keyboard.up(KEY[id][k]);
      await walk(1, g.button, pr(1), rl(1), 12);
      await page.keyboard.down('Slash'); await run(0.1); await page.keyboard.up('Slash'); await run(0.2); let h = await S();
      check(mode, 'Bo presses / at the button: the lift comes down', h.stage === 'lift', h.stage);
      check(mode, 'Pip is told to hop on the lift', /lift/i.test(h.hints[0]), h.hints[0]);
      await run(1.8); await walk(0, h.liftX, pr(0), rl(0), 16); await run(4.5); let i = await S();
      check(mode, 'Pip walks onto the lift with A and rides up: ledge 1, the jobs swap', i.k === 1 && i.holder === 1 && i.labels.join() === 'press,brake', `k ${i.k}, ${i.labels.join('/')}`);
      await run(2.6); let j = await S();
      check(mode, 'after the swap Bo\'s hint names / , the legend swaps', /\//.test(j.hints[1]) && /lever/.test(j.leg[1]) && /climb/.test(j.leg[0]), j.hints.join(' | ') + ' || ' + j.leg.join(' | '));
      await walk(1, j.lever, pr(1), rl(1), 16);
      await page.keyboard.down('Slash'); await run(0.6); let k2 = await S(); await page.keyboard.up('Slash');
      check(mode, 'Bo holds / at the lever: braked', k2.braking, 'braking ' + k2.braking);
      await page.keyboard.down('KeyW'); await run(0.15); let k3 = await S(); await page.keyboard.up('KeyW'); await run(0.6);
      check(mode, 'Pip jumps with W', !k3.g[0], 'grounded ' + k3.g[0]);
      // climb 5: the lever kicks. A person who lets go in time dodges it; one who holds on is kicked off
      await auto('ph.k === 4 && ph.stage === "climb" && st.celebT <= 0', 200); let m = await S();
      check(mode, 'climb 5 reached by the computer pair (Pip brakes there)', m.k === 4 && m.holder === 0, `k ${m.k}, holder ${m.holder}`);
      await put(0, m.lever, 4); await run(0.2);
      await page.keyboard.down('KeyF'); let n = await S(), t = 0;
      while (n.kick == null && t < 6) { await run(0.05); t += 0.05; n = await S(); }
      check(mode, 'holding the brake on climb 5 winds up a kick (telegraphed)', n.kick != null && n.kick >= 0.8 && /let go/i.test(n.hints[0]), `kick in ${n.kick} s after ${t.toFixed(2)} s, "${n.hints[0]}"`);
      await shot('kb-kick');
      await run(0.5); await page.keyboard.up('KeyF'); await run(0.6); let o = await S();
      check(mode, 'letting go of F before the kick dodges it (no bump, grip kept)', o.kick == null && o.kicks === 0 && !o.slip && o.bumps[0] === m.bumps[0], `kicks ${o.kicks}, slip ${o.slip}, grip ${o.grip}`);
      await page.keyboard.down('KeyF'); n = await S(); t = 0;
      while (n.kicks === 0 && t < 8) { await run(0.05); t += 0.05; n = await S(); }
      await page.keyboard.up('KeyF');
      check(mode, 'holding on through the kick: "Kicked!", the grip is gone (a soft fail)', n.kicks === 1 && n.slip && n.bumps[0] === m.bumps[0] + 1, `kicks ${n.kicks}, slip ${n.slip}, bumps ${n.bumps}`);
      // the top: F and / together
      await auto('ph.stage === "top" && ph.top.state === "charge" && ph.top.charge > 1.2 && G.players.every(p => p.grounded)', 200);
      await page.evaluate(() => { const st = window.__pipbo.G.mst; st.ph.top.trickT = 9; st.ph.bubs = []; st.ph.top.cogs = []; });   // (no tricks during this check)
      await put(0, 300, 6); await put(1, 660, 6);
      let q = await S(); t = 0;
      while (q.top && q.top.state !== 'armed' && t < 8) { await run(0.1); t += 0.1; q = await S(); }
      check(mode, 'the top: both at a plunger, green lamps, the hints name F and /', q.top && q.top.state === 'armed' && q.labels.join() === 'smash,smash' && /\bF\b/.test(q.hints[0]) && /\//.test(q.hints[1]), (q.top ? q.top.state : '-') + ' | ' + q.hints.join(' | '));
      await page.keyboard.down('KeyF'); await run(0.1); await page.keyboard.up('KeyF'); await run(0.8); let r = await S();
      check(mode, 'one ram alone does nothing ("Together!")', r.top.hits === 0 && r.top.miss === 1, `hits ${r.top.hits}, miss ${r.top.miss}`);
      await run(1.0);
      await page.keyboard.down('KeyF'); await run(0.15); await page.keyboard.down('Slash'); await run(0.1); await page.keyboard.up('KeyF'); await page.keyboard.up('Slash'); await run(0.2); let u = await S();
      check(mode, 'F then / within the window: a HIT', u.top.hits === 1, 'hits ' + u.top.hits);
      await run(3.0); let v = await S();
      check(mode, 'the hit sends two stolen things home', v.home === 2, 'home ' + v.home);
      await shot('kb-hit');
    }

    if (mode === 'pad') {
      await start({ pads: true });
      const pad = (ix, f) => page.evaluate(({ ix, f }) => { const p = window.__pads[ix]; new Function('p', f)(p); }, { ix, f });
      const btn = (ix, b, on) => pad(ix, `p.buttons[${b}] = { pressed: ${on}, value: ${on ? 1 : 0} }`);
      // the press that wakes a controller only connects it
      await btn(0, 0, true); await btn(1, 0, true); await run(0.2); await btn(0, 0, false); await btn(1, 0, false); await run(1.6);
      let a = await S();
      check(mode, 'two controllers joined: the holder\'s hint names the controller button, not F', has(a.hints[0], a.keys[0].act) && !/\bF\b/.test(a.hints[0]), a.hints.join(' | ') + ' | act = ' + a.keys[0].act);
      check(mode, 'controller legend line names both jobs', /lever/.test(a.pad) && /button/.test(a.pad), a.pad);
      await btn(0, 14, true); await run(0.22); await btn(0, 14, false); await run(0.2); let b = await S();
      check(mode, 'd-pad left walks Pip to the lever', b.x[0] < a.x[0] - 25 && Math.abs(b.x[0] - b.lever) <= 42, `x ${a.x[0]} -> ${b.x[0]}`);
      await btn(0, 2, true); await run(0.6); let c = await S();
      check(mode, 'holding X brakes', c.braking && c.grip < 0.97, `braking ${c.braking}, grip ${c.grip}`);
      await btn(0, 2, false); await run(0.2);
      await pad(1, 'p.axes[0] = 1'); await run(0.4); await pad(1, 'p.axes[0] = 0'); let d = await S();
      check(mode, 'Bo\'s stick right walks', d.x[1] > b.x[1] + 40, `x ${b.x[1]} -> ${d.x[1]}`);
      await btn(1, 0, true); await run(0.15); let e = await S(); await btn(1, 0, false); await run(0.7);
      check(mode, 'Bo\'s A jumps', !e.g[1], 'grounded ' + e.g[1]);
      await put(1, d.button, 1); await run(0.3);
      await btn(1, 2, true); await run(0.1); await btn(1, 2, false); await run(0.2); let f = await S();
      check(mode, 'Bo\'s X at the button calls the lift', f.stage === 'lift', f.stage);
      // the top with controllers, on the page's own loop
      await auto('ph.stage === "top" && ph.top.state === "charge" && ph.top.charge > 1.2 && G.players.every(p => p.grounded)', 240);
      await page.evaluate(() => { const st = window.__pipbo.G.mst; st.ph.top.trickT = 9; st.ph.bubs = []; st.ph.top.cogs = []; });
      await put(0, 300, 6); await put(1, 660, 6);
      let q = await S(), t = 0;
      while (q.top && q.top.state !== 'armed' && t < 8) { await run(0.1); t += 0.1; q = await S(); }
      await page.evaluate(() => { window.__pipbo.G.manual = false; });
      await btn(0, 2, true); await btn(1, 2, true); await wait(350); await btn(0, 2, false); await btn(1, 2, false); await wait(200); let r = await S();
      check(mode, 'live loop: both X buttons together smash the machine', r.top && r.top.hits === 1, 'hits ' + (r.top ? r.top.hits : '-'));
      await shot('pad-hit');
    }

    if (mode === 'touch') {
      await start({}); await run(1.6);
      let a = await S();
      check(mode, 'touch: the round buttons say brake / press', a.btn.join() === 'brake,press', a.btn.join('/'));
      check(mode, 'touch: the holder\'s hint names the brake button, not a key', /brake button/.test(a.hints[0]) && !/\bF\b/.test(a.hints[0]), a.hints.join(' | '));
      const down = (sel, id) => page.dispatchEvent(sel, 'pointerdown', { pointerId: id, bubbles: true });
      const up = (sel, id) => page.dispatchEvent(sel, 'pointerup', { pointerId: id, bubbles: true });
      // (the move bar reads which half the thumb is on: a pointer at 22% / 78% of its width)
      const move = async (pad, dir, id) => { const bb = await page.locator(pad + ' .tmove').boundingBox(); await page.dispatchEvent(pad + ' .tmove', 'pointerdown', { pointerId: id, bubbles: true, clientX: bb.x + bb.width * (dir < 0 ? 0.22 : 0.78), clientY: bb.y + bb.height / 2 }); };
      await move('#padPip', -1, 11); await run(0.22); await up('#padPip .tmove', 11); await run(0.2); let b = await S();
      check(mode, 'Pip\'s ◀ walks to the lever', b.x[0] < a.x[0] - 25 && Math.abs(b.x[0] - b.lever) <= 42, `x ${a.x[0]} -> ${b.x[0]}`);
      await down('#padPip .tbtn-act', 12); await run(0.6); let c = await S();
      check(mode, 'Pip\'s round button brakes while it is held', c.braking && c.grip < 0.97, `braking ${c.braking}, grip ${c.grip}`);
      await up('#padPip .tbtn-act', 12); await run(0.2); let c2 = await S();
      check(mode, 'lifting the finger lets go', !c2.braking, 'braking ' + c2.braking);
      await move('#padBo', 1, 13); await run(0.4); await up('#padBo .tmove', 13); let d = await S();
      check(mode, 'Bo\'s ▶ walks', d.x[1] > b.x[1] + 40, `x ${b.x[1]} -> ${d.x[1]}`);
      await down('#padBo [data-k="jump"]', 14); await run(0.15); let e = await S(); await up('#padBo [data-k="jump"]', 14); await run(0.7);
      check(mode, 'Bo\'s ▲ jumps', !e.g[1], 'grounded ' + e.g[1]);
      await put(1, d.button, 1); await run(0.3);
      let e2 = await S();
      await down('#padBo .tbtn-act', 15); await run(0.1); await up('#padBo .tbtn-act', 15); await run(0.2); let f = await S();
      check(mode, 'Bo\'s round button at the button calls the lift', f.stage === 'lift', f.stage + ' (hint before: "' + e2.hints[1] + '")');
      await auto('ph.stage === "top" && ph.top.state === "charge" && ph.top.charge > 1.2 && G.players.every(p => p.grounded)', 240);
      await page.evaluate(() => { const st = window.__pipbo.G.mst; st.ph.top.trickT = 9; st.ph.bubs = []; st.ph.top.cogs = []; });
      await put(0, 300, 6); await put(1, 660, 6);
      let q = await S(), t = 0;
      while (q.top && q.top.state !== 'armed' && t < 8) { await run(0.1); t += 0.1; q = await S(); }
      check(mode, 'touch at the top: both buttons say smash, the hints name the smash button', q.btn.join() === 'smash,smash' && /smash button/.test(q.hints[0]) && /smash button/.test(q.hints[1]), q.btn.join('/') + ' | ' + q.hints.join(' | '));
      await page.evaluate(() => { window.__pipbo.G.manual = false; });
      await down('#padPip .tbtn-act', 21); await down('#padBo .tbtn-act', 22); await wait(350); await up('#padPip .tbtn-act', 21); await up('#padBo .tbtn-act', 22); await wait(200); let r = await S();
      check(mode, 'live loop: both round buttons together smash the machine', r.top && r.top.hits === 1, 'hits ' + (r.top ? r.top.hits : '-'));
      await page.screenshot({ path: path.join(out, 'keys-touch.png') });
    }

    if (mode === 'solo') {
      const noKeys = t => !/\b[FWAD]\b|[←→↑↓\/]|round button|hold |press /i.test(t);
      // the person is Pip = the holder; the computer climbs
      await start({ solo: 0 }); await run(1.6);
      let a = await S();
      check(mode, 'solo holder: the person\'s hint names F, the computer\'s says what it does (no keys)', /\bF\b/.test(a.hints[0]) && !!a.hints[1] && noKeys(a.hints[1]), a.hints.join(' | '));
      await run(8); let b = await S();
      check(mode, 'solo holder: without the brake the computer waits at the first gear and asks', b.stage === 'climb' && b.k === 0 && !/^g/.test(b.on[1]) && b.feet[1] > -150, `on ${b.on[1]}, feet ${b.feet[1]}, said "${b.bubbles[1]}"`);
      await run(40); let b2 = await S();
      check(mode, 'solo holder: an idle person is never carried up (50 s: still climb 1, nobody braked)', b2.k === 0 && b2.stage === 'climb' && b2.idle, `k ${b2.k}, ${b2.stage}, idle ${b2.idle}`);
      // the person wakes up, walks to the lever and brakes whenever the grip allows: the computer climbs and presses
      const pr = k => page.keyboard.down({ left: 'KeyA', right: 'KeyD', act: 'KeyF' }[k]), rl = k => page.keyboard.up({ left: 'KeyA', right: 'KeyD', act: 'KeyF' }[k]);
      await walk(0, b2.lever, pr, rl, 16);
      let s = await S(), t = 0, held = false;
      while (s.stage === 'climb' && t < 60) {
        const want = held ? s.grip > 0.12 && !s.slip : s.grip > 0.7 && !s.slip;
        if (want !== held) { held = want; if (want) await page.keyboard.down('KeyF'); else await page.keyboard.up('KeyF'); }
        await run(0.1); t += 0.1; s = await S();
      }
      if (held) await page.keyboard.up('KeyF');
      check(mode, 'solo holder: with the person on the brake (F) the computer climbs and presses the button', s.stage === 'lift', `${s.stage} after ${t.toFixed(1)} s, on ${s.on[1]}`);
      await run(1.8); await walk(0, s.liftX, pr, rl, 16); await run(5); let c = await S();
      check(mode, 'solo holder: the person rides the lift: ledge 1, now the person climbs', c.k === 1 && c.holder === 1, `k ${c.k}, holder ${c.holder}`);
      await run(2.6); let c2 = await S();
      check(mode, 'solo: after the swap the person\'s hint is about climbing, the computer\'s has no keys', /climb/i.test(c2.hints[0]) && noKeys(c2.hints[1] || ''), c2.hints.join(' | '));
      await shot('solo-holder');
      // the person is Bo = the climber; the computer brakes
      await start({ solo: 1 }); await run(1.6);
      let d = await S();
      check(mode, 'solo climber: the computer\'s hint says what it does (no keys)', !!d.hints[0] && noKeys(d.hints[0]), d.hints.join(' | '));
      await run(6); let e = await S();
      check(mode, 'solo climber: the computer stands at the lever and rests (nobody needs the brake)', Math.abs(e.x[0] - e.lever) <= 42 && !e.braking && e.grip === 1, `x ${e.x[0]}, lever ${e.lever}, braking ${e.braking}`);
      // the person jumps onto the first shelf (in 1-player mode W / A / D are the person's keys): now the computer brakes
      const pr2 = k => page.keyboard.down({ left: 'KeyA', right: 'KeyD' }[k]), rl2 = k => page.keyboard.up({ left: 'KeyA', right: 'KeyD' }[k]);
      await walk(1, 742, pr2, rl2, 10);
      await page.keyboard.down('KeyW'); await run(0.45); await page.keyboard.up('KeyW'); await run(1.2); let f = await S();
      check(mode, 'solo climber: the person hops onto the first shelf with W', f.on[1] === 's1', 'on ' + f.on[1]);
      await run(1.0); let g = await S();
      check(mode, 'solo climber: the computer brakes when the person waits at a gear', g.braking, `braking ${g.braking}, said "${g.bubbles[0]}"`);
      await run(60); let h = await S();
      check(mode, 'solo climber: the computer never climbs for an idle person', h.k === 0 && h.stage === 'climb', `k ${h.k}, ${h.stage}`);
      await shot('solo-climber');
    }
    const s = await S();
    check(mode, 'no computer-brain errors', s.errs.length === 0, s.errs.join(','));
    await ctx.close();
  }
  console.log(lines.join('\n'));
  if (errors.length) { console.log('PAGE ERRORS:\n' + errors.slice(0, 10).join('\n')); bad++; }
  console.log(bad ? `${bad} check(s) FAILED` : 'all checks passed');
  await browser.close();
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
