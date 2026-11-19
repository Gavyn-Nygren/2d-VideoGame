#!/usr/bin/env node
// 42-4 Go-Kart Grand Prix: the real controls, pressed the way a person presses them (key events, a controller's stick
// and buttons, fingers on the touch stick and buttons), not through the computer's brain. For each device it checks:
// left steers left and right steers right on the screen, holding jump in a turn starts a slide and letting go boosts,
// back brakes, the action button uses a prize, and that pressing nothing drives straight on.
// Usage: node tools/w42/karts-controls.js
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const PADS = `(() => { window.__pads = []; navigator.getGamepads = () => window.__pads.map((p, i) => p && ({ index: i, id: p.id, mapping: 'standard', connected: true,
  axes: p.axes || [0, 0, 0, 0], buttons: Array.from({ length: 17 }, (_, b) => ({ pressed: !!(p.down || []).includes(b), value: (p.down || []).includes(b) ? 1 : 0 })) })); })();`;
let fails = 0;
const ok = (c, what, extra) => { if (!c) fails++; console.log((c ? 'ok    ' : 'FAIL  ') + what + (extra ? '  ' + extra : '')); };
async function open(browser, o = {}) {
  const ctx = await browser.newContext({ viewport: o.touch ? { width: 844, height: 390 } : { width: 1280, height: 720 }, hasTouch: !!o.touch, isMobile: !!o.touch });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(String(e)));
  await page.addInitScript(PADS);
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  await page.evaluate(({ cpu, touch }) => {
    const P = window.__pipbo, G = P.G;
    if (touch) document.documentElement.classList.add('has-touch');
    G.manual = true; P.K3D.noRender = true; G.cpuOn = cpu;
    P.CPU.skillOf = ['easy', 'easy'];
    const i = P.LEVELS.findIndex(l => l.mode === 'parkkarts');
    P.loadLevel(i); G.introT = 0;
    // run until the go, then a second of straight driving
    window.run = secs => { for (let n = 0; n < Math.round(secs / P.DT); n++) { P.pollInput(); P.step(P.DT); } const st = G.mst; return st.karts.map(k => ({ lat: k.lat, v: k.v, drift: k.drift, spark: k.spark, boostT: k.boostT, used: k.used || 0, s: k.s, rel: Math.atan2(Math.sin(k.yaw - PARKKARTS_TRACK.at(k.s).yaw), Math.cos(k.yaw - PARKKARTS_TRACK.at(k.s).yaw)), prize: k.prize, phase: st.phase })); };
    window.give = (id, n) => { const k = G.mst.karts[id]; k.prize = n; k.charges = 1; k.spinT = 0; };
    window.straighten = () => { for (const k of G.mst.karts) { const f = PARKKARTS_TRACK.at(30); PARKKARTS_KART.place(k, 30, k.id ? 1.5 : -1.5, 12); k.crane = null; } G.mst.nextLapAt = 1e9; PARKKARTS.S.LIMIT = 1e9; };
  }, { cpu: o.cpu || [false, false], touch: !!o.touch });
  await page.evaluate(() => { for (let n = 0; n < 2000 && window.__pipbo.G.mst.phase !== 'race'; n++) window.run(0.05); });
  return { page, errs, ctx };
}
// one device, one player: press(what, on) holds or lets go of left / right / jump / down / act
async function drive(page, id, press, name) {
  const R = async secs => (await page.evaluate(s => window.run(s), secs))[id];
  await page.evaluate(() => window.straighten());
  let a = await R(0.6);
  ok(Math.abs(a.rel) < 0.12 && a.v > 8, `${name}: nothing pressed, it drives itself straight on`, `v ${a.v.toFixed(1)}`);
  // lat: + is the right of the road as the kart goes (the right of the screen)
  await page.evaluate(() => window.straighten()); const l0 = (await R(0.02)).lat;
  await press('left', true); a = await R(0.45); await press('left', false);
  ok(a.lat < l0 - 0.3, `${name}: left steers to the left of the screen`, `lat ${l0.toFixed(1)} -> ${a.lat.toFixed(1)}`);
  await page.evaluate(() => window.straighten()); const r0 = (await R(0.02)).lat;
  await press('right', true); a = await R(0.45); await press('right', false);
  ok(a.lat > r0 + 0.3, `${name}: right steers to the right`, `lat ${r0.toFixed(1)} -> ${a.lat.toFixed(1)}`);
  await page.evaluate(() => window.straighten()); await R(0.05);
  await press('jump', true); await press('right', true); a = await R(0.7);
  ok(a.drift === 1 && a.spark >= 1, `${name}: holding jump while turning slides (sparks)`, `drift ${a.drift} spark ${a.spark}`);
  await press('jump', false); await press('right', false); a = await R(0.1);
  ok(a.drift === 0 && a.boostT > 0, `${name}: letting go of jump gives the boost`, `boost ${a.boostT.toFixed(2)}`);
  await page.evaluate(() => window.straighten()); await R(0.05);
  await press('down', true); a = await R(0.5); await press('down', false);
  ok(a.v < 6, `${name}: back brakes`, `v ${a.v.toFixed(1)}`);
  await page.evaluate(i => { window.straighten(); window.give(i, 'popcorn'); }, id); await R(0.05);
  await press('act', true); a = await R(0.08); await press('act', false); await R(0.1);
  ok(a.used === 1 && !a.prize, `${name}: the action button uses the prize`, `used ${a.used}`);
  // steering while NOT braking: a stick pushed to the side and a little down must not brake
  return a;
}
(async () => {
  const browser = await chromium.launch();
  // keyboard, two players
  { const { page, errs } = await open(browser);
    const keysOf = [{ left: 'KeyA', right: 'KeyD', jump: 'Space', down: 'KeyS', act: 'KeyF' }, { left: 'ArrowLeft', right: 'ArrowRight', jump: 'ShiftRight', down: 'ArrowDown', act: 'Slash' }];
    for (const id of [0, 1]) await drive(page, id, async (w, on) => { await page.keyboard[on ? 'down' : 'up'](keysOf[id][w]); }, ['Pip keyboard (A D, Space, S, F)', 'Bo keyboard (arrows, Right Shift, /)'][id]);
    // the other player's keys do not move this kart
    await page.evaluate(() => window.straighten()); const b0 = (await page.evaluate(() => window.run(0.02)))[1].lat;
    await page.keyboard.down('KeyA'); const b1 = (await page.evaluate(() => window.run(0.4)))[1].lat; await page.keyboard.up('KeyA');
    ok(Math.abs(b1 - b0) < 0.25, "keyboard: Pip's keys do not steer Bo");
    // Bo's Enter also slides (Shift pressed five times opens Sticky Keys on Windows)
    await page.evaluate(() => window.straighten()); await page.keyboard.down('Enter'); await page.keyboard.down('ArrowLeft'); const e = (await page.evaluate(() => window.run(0.6)))[1]; await page.keyboard.up('Enter'); await page.keyboard.up('ArrowLeft');
    ok(e.drift === -1, 'Bo keyboard: Enter also holds a slide', `drift ${e.drift}`);
    ok(!errs.length, 'keyboard: no page errors', errs.join(' | ').slice(0, 300)); await page.context().close(); }
  // 1 player: the person may use either set of keys, as Pip and as Bo
  for (const human of [0, 1]) { const { page, errs } = await open(browser, { cpu: human === 0 ? [false, true] : [true, false] });
    await drive(page, human, async (w, on) => { await page.keyboard[on ? 'down' : 'up']({ left: 'ArrowLeft', right: 'ArrowRight', jump: 'Space', down: 'ArrowDown', act: 'KeyF' }[w]); }, `1 player as ${['Pip', 'Bo'][human]} (arrows + Space + F)`);
    ok(!errs.length, '1 player: no page errors', errs.join(' | ').slice(0, 300)); await page.context().close(); }
  // controllers: stick, A (jump), X (action), stick back to brake; and the d-pad
  { const { page, errs } = await open(browser);
    await page.evaluate(() => { window.__pads = [{ id: 'Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13)', axes: [0, 0, 0, 0], down: [] }, { id: 'DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)', axes: [0, 0, 0, 0], down: [] }]; window.run(0.2); });
    for (const id of [0, 1]) {
      const set = (f) => page.evaluate(({ id, f }) => { const p = window.__pads[id]; new Function('p', f)(p); }, { id, f });
      const press = async (w, on) => {
        if (w === 'left' || w === 'right') await set(`p.axes[0] = ${on ? (w === 'left' ? -0.9 : 0.9) : 0};`);
        else if (w === 'down') await set(`p.axes[1] = ${on ? 0.95 : 0};`);
        else { const b = w === 'jump' ? 0 : 2; await set(on ? `p.down.push(${b});` : `p.down = p.down.filter(x => x !== ${b});`); }
      };
      await drive(page, id, press, ['Xbox controller (stick, A, X)', 'PlayStation controller (stick, Cross, Square)'][id]);
      // a stick held to the side and a little low still steers at full speed (no brake by accident)
      await page.evaluate(() => window.straighten()); await set('p.axes[0] = -0.75; p.axes[1] = 0.62;');
      const a = (await page.evaluate(() => window.run(0.5)))[id]; await set('p.axes[0] = 0; p.axes[1] = 0;');
      ok(a.v > 10, `${['Xbox', 'PlayStation'][id]}: stick left and a little low steers without braking`, `v ${a.v.toFixed(1)}`);
      // the d-pad
      const dpad = async (w, on) => { const b = { left: 14, right: 15, down: 13, jump: 0, act: 2 }[w]; await set(on ? `p.down.push(${b});` : `p.down = p.down.filter(x => x !== ${b});`); };
      await page.evaluate(() => window.straighten()); const l0 = (await page.evaluate(() => window.run(0.02)))[id].lat; await dpad('left', true); const l1 = (await page.evaluate(() => window.run(0.45)))[id].lat; await dpad('left', false);
      ok(l1 < l0 - 0.3, `${['Xbox', 'PlayStation'][id]}: d-pad left steers left`);
    }
    ok(!errs.length, 'controllers: no page errors', errs.join(' | ').slice(0, 300)); await page.context().close(); }
  // touch: the thumb stick, the jump and brake buttons and the action button, two fingers at once
  { const { page, errs } = await open(browser, { touch: true });
    for (const id of [0, 1]) {
      const pad = id ? '#padBo' : '#padPip';
      const vis = await page.evaluate(sel => { const q = s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 20 ? [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)] : null; };
        return { stick: q(sel + ' .tstick'), jump: q(sel + ' [data-k="jump"]'), down: q(sel + ' [data-k="down"]'), act: q(sel + ' [data-k="act"]'), move: q(sel + ' .tmove'), label: (document.querySelector(sel + ' [data-k="act"]') || {}).textContent }; }, pad);
      ok(vis.stick && vis.jump && vis.act && vis.down && !vis.move, `touch ${['Pip', 'Bo'][id]}: thumb stick, jump, brake and "${vis.label}" buttons are shown (no left/right bar)`, JSON.stringify(vis));
      if (!vis.stick) continue;
      // fingers as pointer events (each its own pointer id, so two can be down together)
      const fire = (sel, type, pid, dx = 0, dy = 0) => page.evaluate(({ sel, type, pid, dx, dy }) => { const e = document.querySelector(sel), r = e.getBoundingClientRect();
        e.dispatchEvent(new PointerEvent(type, { pointerId: pid, pointerType: 'touch', isPrimary: pid === 1, clientX: r.left + r.width / 2 + dx * r.width / 2, clientY: r.top + r.height / 2 + dy * r.height / 2, bubbles: true, cancelable: true })); }, { sel, type, pid, dx, dy });
      const press = async (w, on) => {
        if (w === 'left' || w === 'right') { if (on) await fire(pad + ' .tstick', 'pointerdown', 11, w === 'left' ? -0.8 : 0.8, 0); else await fire(pad + ' .tstick', 'pointerup', 11); }
        else await fire(`${pad} [data-k="${w}"]`, on ? 'pointerdown' : 'pointerup', { jump: 12, down: 13, act: 14 }[w]);
      };
      await drive(page, id, press, `touch ${['Pip', 'Bo'][id]} (thumb stick + buttons)`);
      // the thumb pulled straight back on the stick brakes too; held to the side and a little low it does not
      await page.evaluate(() => window.straighten()); await fire(pad + ' .tstick', 'pointerdown', 11, 0, 0.9); let a = (await page.evaluate(() => window.run(0.5)))[id]; await fire(pad + ' .tstick', 'pointerup', 11);
      ok(a.v < 6, `touch ${['Pip', 'Bo'][id]}: thumb pulled back on the stick brakes`, `v ${a.v.toFixed(1)}`);
      await page.evaluate(() => window.straighten()); await fire(pad + ' .tstick', 'pointerdown', 11, -0.7, 0.62); a = (await page.evaluate(() => window.run(0.5)))[id]; await fire(pad + ' .tstick', 'pointerup', 11);
      ok(a.v > 10, `touch ${['Pip', 'Bo'][id]}: thumb to the side and a little low steers without braking`, `v ${a.v.toFixed(1)}`);
    }
    ok(!errs.length, 'touch: no page errors', errs.join(' | ').slice(0, 300)); await page.context().close(); }
  await browser.close();
  console.log(fails ? `${fails} FAILED` : 'all passed');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
