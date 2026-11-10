#!/usr/bin/env node
// 30-1 The Time Thief, era 'troy': do the real input paths reach the wooden horse, and do the hints name each device's
// own keys?   node tools/w30/troy-keys.js [--shots]
//   kb     two people on one keyboard: real key events with the live loop running (G.manual false) for a few seconds
//          (roll, tiptoe, brake, peek), then a scripted "person" pair on real keys who sneaks past the first guard to
//          the first safe spot, then the jobs after the swap at the Great Gate (labels, legend, hints, keys)
//   pad    two stubbed controllers (navigator.getGamepads): stick, d-pad, A, X
//   touch  an 844x390 phone: the ◀ ▶ ▲ ▼ pads and the round buttons (pointer events)
//   solo   1-player mode on the keyboard, both ways round: the person's hints name keys, the computer's say what it
//          does; the computer never rolls in the dark and never peeks the horse along by itself
// Prints one line per check; exits 1 when one fails. --shots writes build/w30/troy/keys-<mode>.png.
'use strict';
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const shots = process.argv.includes('--shots');
const out = path.resolve(__dirname, '..', '..', 'build', 'w30', 'troy');
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
    // start the era; o.live: the page's own loop polls the devices and steps (G.manual false); o.sleep: the guards nap
    const start = (o = {}) => page.evaluate(o2 => {
      const P = window.__pipbo, G = P.G, TT = P.MODES.timethief.test;
      if (o2.pads) window.__padOn = true;
      if (o2.solo != null) { P.cpuSetCfg('players', 1); P.cpuSetCfg('human', o2.solo); } else P.cpuSetCfg('players', 2);
      G.manual = !o2.live;
      TT.jump('troy', { seed: 5 });
      if (o2.solo == null) G.cpuOn = [false, false];
      if (o2.sleep) for (const g of G.mst.ph.c.guards) if (!g.deco) g.state = 'asleep';
      P.fit();
      window.__run = s => { for (let k = 0; k < Math.round(s / P.DT); k++) { P.pollInput(P.DT); P.step(P.DT); } };
      window.__troy = () => {
        const st = G.mst, ph = st.ph, K = TT.TTH_PHASES.troy, txt = sel => { const el = document.querySelector(sel); return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; };
        const eta = (a, b, v) => { const e = tthTroyBrainEta(ph, a, b, v); return e === Infinity ? 99 : +e.toFixed(2); };
        return { phase: st.phase, x: Math.round(ph.h.x), v: Math.round(ph.h.v), peek: +ph.peek.toFixed(2), light: +ph.light.toFixed(2), roller: ph.roller, k: ph.k, lean: +ph.lean.toFixed(2),
          swap: !!ph.swap, claw: ph.claw ? ph.claw.st : '', caught: st.stats.troy.caught, cpN: ph.cpN, lit: ph.lit, etaB: eta(TTHTROY.body[0] - 10, TTHTROY.body[1] + 10, Math.max(ph.h.v, 108)), etaH: eta(TTHTROY.head[0] - 12, TTHTROY.head[1] + 12, ph.h.v),
          hints: st.hints.map(h => (h ? h.text : '')), labels: K.labels(st), keys: [0, 1].map(id => ({ act: tthKey(id, 'act'), right: tthKey(id, 'right'), left: tthKey(id, 'left'), down: tthKey(id, 'down') })),
          btn: [txt('#padPip [data-actlabel]'), txt('#padBo [data-actlabel]')], leg: [txt('[data-legp="0"]'), txt('[data-legp="1"]')], pad: txt('.pad-only'),
          bubbles: P.CPU.bubbles.map(b => (b && b.t > 0 ? b.text : '')), idle: !!st.idle, errs: [...P.CPU.errs] };
      };
    }, o);
    const S = () => page.evaluate(() => window.__troy());
    const run = s => page.evaluate(s2 => window.__run(s2), s);
    const wait = ms => page.waitForTimeout(ms);
    const shot = async name => { if (shots) await page.screenshot({ path: path.join(out, 'keys-' + name + '.png') }); };
    const has = (text, key) => !!key && String(text).includes(key);

    if (mode === 'kb') {
      await start({ live: true, sleep: true }); await wait(1300);
      let a = await S();
      check(mode, 'era started (Pip rolls first, Bo peeks)', a.phase === 'troy' && a.roller === 0 && a.labels.join() === 'brake,peek', a.labels.join('/'));
      check(mode, 'roller hint names Pip\'s own key (D)', /\bD\b/.test(a.hints[0]), a.hints[0]);
      check(mode, 'lookout hint names Bo\'s own key (/)', /\//.test(a.hints[1]), a.hints[1]);
      check(mode, 'top-bar legend: Pip rolls / tiptoes / brakes, Bo works the hatch', /roll/.test(a.leg[0]) && /tiptoe/.test(a.leg[0]) && /brake/.test(a.leg[0]) && /hatch/.test(a.leg[1]) && /peek/.test(a.leg[1]), a.leg.join(' | '));
      // real keys, live loop
      await page.keyboard.down('Slash'); await wait(500); let b = await S();
      check(mode, 'holding / opens the hatch (live loop)', b.peek > 0.9 && b.light > 0.9, `peek ${b.peek}, light ${b.light}`);
      await page.keyboard.down('KeyD'); await wait(1500); let c = await S();
      check(mode, 'holding D rolls the horse', c.v > 90 && c.x > b.x + 60, `v ${c.v}, x ${b.x} -> ${c.x}`);
      await page.keyboard.up('KeyD'); await page.keyboard.down('KeyS'); await wait(1200); let d = await S();
      check(mode, 'holding S tiptoes (about 62 px/s)', d.v >= 55 && d.v <= 70, 'v ' + d.v);
      await page.keyboard.up('KeyS'); await page.keyboard.down('KeyA'); await wait(600); let e = await S();
      check(mode, 'holding A brakes to a stop', e.v === 0 && e.lean > 0.9, `v ${e.v}, lean ${e.lean}`);
      await page.keyboard.up('KeyA'); await page.keyboard.down('KeyD'); await wait(900); await page.keyboard.up('KeyD'); let f0 = await S();
      await page.keyboard.down('KeyF'); await wait(700); let f = await S(); await page.keyboard.up('KeyF');
      check(mode, 'Pip\'s action key (F) is the brake too', f0.v > 60 && f.v === 0, `v ${f0.v} -> ${f.v}`);
      await page.keyboard.up('Slash'); await wait(350); let g = await S();
      check(mode, 'letting go of / shuts the hatch', g.peek < 0.1, 'peek ' + g.peek);
      await page.keyboard.down('KeyD'); await wait(5200); let h = await S(); await page.keyboard.up('KeyD');   // (the heavy horse coasts about 3 s once the light is gone)
      check(mode, 'hatch shut: it goes dark and the wheels stop ("Too dark to roll!")', h.light < 0.25 && h.v === 0 && /dark/i.test(h.hints[0]), `light ${h.light}, v ${h.v}, "${h.hints[0]}"`);
      await shot('kb-dark');
      await page.keyboard.down('ArrowUp'); await wait(450); let i = await S(); await page.keyboard.up('ArrowUp');
      check(mode, 'Bo\'s ↑ peeks too', i.peek > 0.9, 'peek ' + i.peek);
      // a scripted pair on real keys (stepped by the test): roll in the gaps past the first guard to the first safe spot
      await start({}); await run(0.7);
      const held = {}; const key = async (code, on) => { if (!!held[code] === on) return; held[code] = on; if (on) await page.keyboard.down(code); else await page.keyboard.up(code); };
      let s = await S(), t = 0, go = false;
      while (s.cpN < 1 && t < 60) {
        go = go ? s.etaB > 0.9 && !s.lit : s.etaB > 1.3 && !s.lit;
        await key('Slash', s.etaH > 0.6);
        await key('KeyD', go); await key('KeyA', !go && s.v > 0);
        await run(1 / 20); t += 1 / 20;
        s = await S();
      }
      for (const code of Object.keys(held)) await key(code, false);
      check(mode, 'a scripted pair on real keys sneaks past the first guard to the safe spot', s.cpN >= 1 && s.caught <= 1, `${t.toFixed(1)} s, x ${s.x}, caught ${s.caught}`);
      await shot('kb-safe');
      // the computer pair plays to the Great Gate; after the swap people take over with the other jobs
      await page.evaluate(() => { const P = window.__pipbo, G = P.G; G.cpuOn = [true, true]; let n = 0; while ((G.mst.ph.k < 1 || G.mst.ph.swap) && n++ < 120 * 120) P.step(P.DT); G.cpuOn = [false, false]; for (const p of G.players) for (const k in p.input) p.input[k] = false; });
      await run(0.3); let m = await S();
      check(mode, 'after the Great Gate the jobs swap: Bo rolls, Pip peeks (labels, buttons, legend)', m.k === 1 && m.roller === 1 && m.labels.join() === 'peek,brake' && /hatch/.test(m.leg[0]) && /roll/.test(m.leg[1]), m.labels.join('/') + ' | ' + m.leg.join(' | '));
      check(mode, 'swap hints name the new keys (F for Pip, → for Bo)', /\bF\b/.test(m.hints[0]) && /→/.test(m.hints[1]), m.hints.join(' | '));
      await page.keyboard.down('KeyF'); await page.keyboard.down('ArrowRight'); await run(1.6); let n = await S();
      check(mode, 'stretch 2: F peeks, → rolls', n.peek > 0.9 && n.x > m.x + 60, `peek ${n.peek}, x ${m.x} -> ${n.x}`);
      await page.keyboard.up('ArrowRight'); await page.keyboard.down('Slash'); await run(0.7); let o = await S();
      check(mode, 'stretch 2: Bo\'s action key (/) brakes', o.v === 0, 'v ' + o.v);
      await page.keyboard.up('Slash'); await page.keyboard.up('KeyF');
    }

    if (mode === 'pad') {
      await start({ pads: true, sleep: true });
      const pad = (ix, f) => page.evaluate(({ ix, f }) => { const p = window.__pads[ix]; new Function('p', f)(p); }, { ix, f });
      // the press that wakes a controller only connects it
      await pad(0, 'p.buttons[0] = { pressed: true, value: 1 }'); await pad(1, 'p.buttons[0] = { pressed: true, value: 1 }'); await run(0.2);
      await pad(0, 'p.buttons[0] = { pressed: false, value: 0 }'); await pad(1, 'p.buttons[0] = { pressed: false, value: 0 }'); await run(0.3);
      await start({ pads: true, sleep: true }); await run(1.3);   // a fresh start with both controllers joined (the waking A press may already have peeked)
      let a = await S();
      check(mode, 'two controllers joined: hints name controller buttons', has(a.hints[0], a.keys[0].right) && /stick/.test(a.hints[0]) && has(a.hints[1], a.keys[1].act) && !/\//.test(a.hints[1]), a.hints.join(' | '));
      check(mode, 'controller legend line names the jobs', /peek/.test(a.pad) && /roll/.test(a.pad), a.pad);
      await pad(1, 'p.buttons[2] = { pressed: true, value: 1 }'); await run(0.4); let b = await S();
      check(mode, 'Bo\'s X opens the hatch', b.peek > 0.9, 'peek ' + b.peek);
      await pad(0, 'p.axes[0] = 1'); await run(1.5); let c = await S();
      check(mode, 'Pip\'s stick right rolls', c.v > 90 && c.x > b.x + 60, `v ${c.v}, x ${b.x} -> ${c.x}`);
      await pad(0, 'p.axes[0] = 0; p.axes[1] = 1'); await run(1.2); let d = await S();
      check(mode, 'stick down tiptoes', d.v >= 55 && d.v <= 70, 'v ' + d.v);
      await pad(0, 'p.axes[1] = 0; p.buttons[14] = { pressed: true, value: 1 }'); await run(0.6); let e = await S();
      check(mode, 'd-pad left brakes', e.v === 0, 'v ' + e.v);
      await pad(0, 'p.buttons[14] = { pressed: false, value: 0 }; p.buttons[15] = { pressed: true, value: 1 }'); await run(0.9); let f0 = await S();
      await pad(0, 'p.buttons[15] = { pressed: false, value: 0 }; p.buttons[2] = { pressed: true, value: 1 }'); await run(0.7); let f = await S();
      check(mode, 'd-pad right rolls, Pip\'s X brakes', f0.v > 60 && f.v === 0, `v ${f0.v} -> ${f.v}`);
      await pad(0, 'p.buttons[2] = { pressed: false, value: 0 }'); await pad(1, 'p.buttons[2] = { pressed: false, value: 0 }'); await run(0.4); let g = await S();
      await pad(1, 'p.axes[1] = -1'); await run(0.4); let h = await S();
      await pad(1, 'p.axes[1] = 0; p.buttons[0] = { pressed: true, value: 1 }'); await run(0.05); await pad(1, 'p.axes[1] = 0'); await run(0.4); let i = await S();
      check(mode, 'Bo\'s stick up peeks, and so does A', g.peek < 0.1 && h.peek > 0.9 && i.peek > 0.9, `${g.peek} -> ${h.peek} -> ${i.peek}`);
      await pad(1, 'p.buttons[0] = { pressed: false, value: 0 }');
      // live loop: the page polls the stubbed controllers itself
      await page.evaluate(() => { window.__pipbo.G.manual = false; });
      await pad(1, 'p.buttons[2] = { pressed: true, value: 1 }'); await pad(0, 'p.axes[0] = 1'); await wait(1200); let j = await S();
      check(mode, 'live loop: X + stick right roll the horse', j.x > i.x + 40 && j.peek > 0.9, `x ${i.x} -> ${j.x}`);
      await shot('pad');
    }

    if (mode === 'touch') {
      await start({ sleep: true }); await run(1.3);
      let a = await S();
      check(mode, 'touch: the round buttons say brake / peek', a.btn.join() === 'brake,peek', a.btn.join('/'));
      check(mode, 'touch: hints name ▶ and the round button', /▶/.test(a.hints[0]) && /round button/.test(a.hints[1]), a.hints.join(' | '));
      const down = async (sel, id) => {   // (the move bar reads which half the thumb is on: ◀ ▶ are pressed at their own middle)
        const b = await page.locator(sel).boundingBox();
        return page.dispatchEvent(/data-k="(left|right)"/.test(sel) ? sel.replace(/\[data-k=.*$/, '.tmove') : sel, 'pointerdown', { pointerId: id, bubbles: true, clientX: b.x + b.width / 2, clientY: b.y + b.height / 2 });
      };
      const up = (sel, id) => page.dispatchEvent(/data-k="(left|right)"/.test(sel) ? sel.replace(/\[data-k=.*$/, '.tmove') : sel, 'pointerup', { pointerId: id, bubbles: true });
      await down('#padBo .tbtn-act', 11); await run(0.4); let b = await S();
      check(mode, 'Bo\'s round button opens the hatch', b.peek > 0.9, 'peek ' + b.peek);
      await down('#padPip [data-k="right"]', 12); await run(1.5); let c = await S();
      check(mode, 'Pip\'s ▶ rolls', c.v > 90 && c.x > b.x + 60, `v ${c.v}, x ${b.x} -> ${c.x}`);
      await up('#padPip [data-k="right"]', 12); await down('#padPip [data-k="down"]', 13); await run(1.2); let d = await S();
      check(mode, 'Pip\'s ▼ tiptoes', d.v >= 55 && d.v <= 70, 'v ' + d.v);
      await up('#padPip [data-k="down"]', 13); await down('#padPip .tbtn-act', 14); await run(0.6); let e = await S();
      check(mode, 'Pip\'s round button brakes', e.v === 0, 'v ' + e.v);
      await up('#padPip .tbtn-act', 14); await down('#padPip [data-k="right"]', 15); await run(0.9); let f0 = await S();
      await up('#padPip [data-k="right"]', 15); await down('#padPip [data-k="left"]', 16); await run(0.7); let f = await S(); await up('#padPip [data-k="left"]', 16);
      check(mode, 'Pip\'s ◀ brakes', f0.v > 60 && f.v === 0, `v ${f0.v} -> ${f.v}`);
      await up('#padBo .tbtn-act', 11); await run(0.4); let g = await S();
      await down('#padBo [data-k="jump"]', 17); await run(0.4); let h = await S(); await up('#padBo [data-k="jump"]', 17);
      check(mode, 'Bo\'s ▲ peeks too', g.peek < 0.1 && h.peek > 0.9, `${g.peek} -> ${h.peek}`);
      await page.evaluate(() => { window.__pipbo.G.manual = false; });
      await down('#padBo .tbtn-act', 21); await down('#padPip [data-k="right"]', 22); await wait(1200); let j = await S();
      check(mode, 'live loop: round button + ▶ roll the horse', j.x > h.x + 40 && j.peek > 0.9, `x ${h.x} -> ${j.x}`);
      await page.screenshot({ path: path.join(out, 'keys-touch.png') });
      await up('#padBo .tbtn-act', 21); await up('#padPip [data-k="right"]', 22);
    }

    if (mode === 'solo') {
      // the person rolls (Pip), the computer peeks
      await start({ solo: 0, sleep: true }); await run(1.3);
      let a = await S();
      check(mode, 'solo roller: the person\'s hint names a key, the computer\'s hero shows none', /\bD\b/.test(a.hints[0]) && !/hold|press|\//i.test(a.hints[1]), a.hints.join(' | '));   // (the computer is already peeking: it needs no hint)
      await run(6); let b = await S();
      check(mode, 'solo roller: the computer peeks but the horse stays put without the person', b.peek > 0.9 && Math.abs(b.x - a.x) < 3, `peek ${b.peek}, x ${a.x} -> ${b.x}`);
      await page.keyboard.down('KeyD'); await run(1.5); let c = await S(); await page.keyboard.up('KeyD');
      check(mode, 'solo roller: D rolls (the computer keeps the light on)', c.x > b.x + 60, `x ${b.x} -> ${c.x}`);
      await page.keyboard.down('ArrowRight'); await run(1.0); let c2 = await S(); await page.keyboard.up('ArrowRight');
      check(mode, 'solo roller: the arrow keys work for the person too', c2.x > c.x + 40, `x ${c.x} -> ${c2.x}`);
      await shot('solo-roller');
      // the person peeks (Bo), the computer rolls
      await start({ solo: 1, sleep: true }); await run(1.3);
      let d = await S();
      check(mode, 'solo lookout: the person\'s hint names a key, the computer\'s says what it does', /\bF\b/.test(d.hints[1]) && !!d.hints[0] && !/hold|press/i.test(d.hints[0]), d.hints.join(' | '));
      await run(2.4); let d2 = await S();
      check(mode, 'solo lookout: the computer asks for a peek in a bubble (no key names)', /peek/i.test(d2.bubbles[0]) && !/\bF\b|\//.test(d2.bubbles[0]), d2.bubbles[0]);
      await run(6.6); let e = await S(); await run(3); let e2 = await S();
      check(mode, 'solo lookout: the computer never rolls before the person has peeked (no free metres)', e2.x === d.x, `x ${d.x} -> ${e2.x}`);
      check(mode, 'solo lookout: in the dark the computer stops and asks for light', e.light < 0.1 && e2.x === e.x && e.v === 0, `light ${e.light}, x ${e.x} -> ${e2.x}, said "${e.bubbles[0] || e2.bubbles[0]}"`);
      await page.keyboard.down('Slash'); await run(2.5); let f = await S();
      check(mode, 'solo lookout: holding / lights the way and the computer rolls', f.x > e2.x + 80 && f.peek > 0.9, `x ${e2.x} -> ${f.x}`);
      await page.keyboard.up('Slash'); await page.keyboard.down('KeyF'); await run(1.2); let g = await S(); await page.keyboard.up('KeyF');
      check(mode, 'solo lookout: F peeks too', g.peek > 0.9, 'peek ' + g.peek);
      await shot('solo-lookout');
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
