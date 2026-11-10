#!/usr/bin/env node
// Era 'moon' (Moon Landing, 1969) input check through the REAL input paths:
//   - real keyboard events (page.keyboard) through pollInput + step, and a second or two of the live game loop
//     (G.manual false): the engineer's pump and arm, the pilot's burn and side jets;
//   - two stubbed controllers (navigator.getGamepads): pad 1 plays Pip, pad 2 plays Bo;
//   - the touch buttons at 844x390 (hasTouch): arrows and the round buttons, their words ("pump" / "burn", then
//     "plant"), a landing, moon hops and planting the flag with both round buttons held;
//   - the hint bubbles name each device's own keys (F / ↑, the controller glyphs, "the round button" / ▲);
//   - the jobs swap at a beacon and the same keys then do the other job.
// Bo flies first (the room's `first` is 1). Screenshots go to build/w30/moon/keys-*.png.
// Usage: node tools/w30/moon-keys.js
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
(async () => {
  const outDir = path.resolve(__dirname, '..', '..', 'build', 'w30', 'moon');
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  const errors = [];
  let bad = 0;
  const check = (ok, what) => { console.log((ok ? 'ok   ' : 'BAD  ') + what); if (!ok) bad++; };
  for (const [vw, vh, touch] of [[960, 540, 0], [844, 390, 1]]) {
    const co = { viewport: { width: vw, height: vh }, deviceScaleFactor: 1 };
    if (touch) Object.assign(co, { hasTouch: true });
    const page = await browser.newPage(co);
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
    await page.addInitScript(() => {
      const mk = () => ({ on: false, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) });
      window.__pads = [mk(), mk()];
      navigator.getGamepads = () => window.__pads.map((p, i) => (p.on ? { id: 'Xbox stub ' + i, index: i, connected: true, mapping: 'standard', timestamp: performance.now(), axes: p.axes, buttons: p.buttons } : null)).concat([null, null]);
    });
    await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
    await page.waitForFunction(() => window.__pipbo && window.__pipbo.MODES && window.__pipbo.MODES.timethief);
    if (touch) await page.evaluate(() => { try { enableTouch(); Pads.lastNonPad = 'touch'; setKind('touch'); } catch (e) { document.documentElement.classList.add('has-touch'); } window.dispatchEvent(new Event('resize')); });
    await page.evaluate(() => {
      const P = window.__pipbo, G = P.G, TT = P.MODES.timethief.test;
      P.CPU.cfg.players = 2; P.cpuApplyCfg(); G.cpuOn = [false, false]; G.manual = true;
      window.__start = () => { TT.jump(7, { seed: 1 }); G.cpuOn = [false, false]; };
      window.__run = n => { for (let i = 0; i < n; i++) { P.pollInput(P.DT); P.step(P.DT); } };
      // a calm spot high above the first rocks, at rest, with fuel in every tank
      window.__calm = () => { const ph = G.mst.ph, L = ph.L; L.x = 480; L.y = 300; L.vx = 0; L.vy = 0; ph.F.ready = 1.6; ph.F.pod[0] = ph.F.pod[1] = 3; ph.F.strokeT = 0; ph.arm.a = 0; ph.cells.length = 0; ph.cellT = 99; };
      window.__st = () => { const st = G.mst, ph = st.ph, L = ph.L; return { mode: ph.mode, pilot: ph.pilot, x: L.x, y: L.y, vx: L.vx, vy: L.vy, burn: L.burn, ready: ph.F.ready, arm: ph.arm.a, pumps: st.stats.moon.pumps, hints: st.hints.map(h => (h ? h.text : '')), cut: !!st.cut, plant: ph.flag.plant, flag: ph.flag.state, flagX: ph.flag.x, ps: G.players.map(p => ({ x: p.x + p.w / 2 + st.cam.x, vy: p.vy, grounded: p.grounded })) }; };
      window.__start(); window.__calm();
    });
    const tag = vw + 'x' + vh, st = () => page.evaluate(() => window.__st()), run = n => page.evaluate(k => window.__run(k), n), calm = () => page.evaluate(() => window.__calm());
    const hold = async (key, steps) => { await page.keyboard.down(key); await run(steps); const a = await st(); await page.keyboard.up(key); await run(2); return a; };
    if (!touch) {
      /* ---- keyboard: Pip is the engineer (A D aim the arm, F pumps), Bo the pilot (← → side jets, ↑ or / burns) ---- */
      await run(6);   // (a few polls first, as in the live game: a button held over from the menu never counts as a press)
      let a = await st();
      check(a.pilot === 1, `${tag} Bo flies first (pilot ${a.pilot})`);
      await page.keyboard.press('KeyF'); await run(4);
      let b = await st(); check(b.pumps === a.pumps + 1 && b.ready > a.ready + 0.8, `${tag} keyboard F: one pump stroke fills the ready tank (${a.ready.toFixed(1)} -> ${b.ready.toFixed(1)} s)`);
      b = await hold('KeyD', 40); check(b.arm > 0.6, `${tag} keyboard D swings the arm right (${b.arm.toFixed(2)} rad)`);
      b = await hold('KeyA', 80); check(b.arm < -0.6, `${tag} keyboard A swings the arm left (${b.arm.toFixed(2)} rad)`);
      await calm(); a = await st();
      b = await hold('ArrowUp', 90); check(b.burn > 0.8 && b.vy < -40 && b.ready < a.ready - 0.6, `${tag} keyboard ↑ burns: the lander climbs (${b.vy | 0} px/s), the ready tank drains (${b.ready.toFixed(1)} s)`);
      await calm(); b = await hold('Slash', 60); check(b.burn > 0.8 && b.vy < -20, `${tag} keyboard / (the action) burns too (${b.vy | 0} px/s)`);
      await calm(); b = await hold('ArrowLeft', 60); check(b.vx < -80, `${tag} keyboard ←: the side jet pushes left (${b.vx | 0} px/s)`);
      await calm(); b = await hold('ArrowRight', 60); check(b.vx > 80, `${tag} keyboard →: the side jet pushes right (${b.vx | 0} px/s)`);
      await calm(); b = await hold('KeyW', 60); check(b.burn < 0.1, `${tag} the engineer's W does not fire the engine (burn ${b.burn.toFixed(2)})`);
      // an empty ready tank: the engine only sputters until the engineer pumps
      await page.evaluate(() => { window.__calm(); window.__pipbo.G.mst.ph.F.ready = 0; });
      b = await hold('ArrowUp', 60); check(b.burn < 0.1 && b.vy > 20, `${tag} empty ready tank: ↑ only sputters, the lander falls (${b.vy | 0} px/s)`);
      check(/F/.test(b.hints[0]), `${tag} the engineer is told to pump with F ("${b.hints[0]}")`);
      // the hints at the start name the keyboard keys
      await page.evaluate(() => { window.__start(); window.__run(Math.round(1.7 / window.__pipbo.DT)); });
      a = await st();
      check(/\bF\b/.test(a.hints[0]) && /↑/.test(a.hints[1]) && /← →/.test(a.hints[1]), `${tag} start hints name the keys: Pip "${a.hints[0]}" / Bo "${a.hints[1]}"`);
      // the live game loop (G.manual false): real key events for a second or so
      await page.evaluate(() => { window.__calm(); const G = window.__pipbo.G; G.mst.ph.F.ready = 3; G.manual = false; });
      await page.keyboard.down('ArrowUp'); await page.keyboard.down('ArrowLeft');
      await page.waitForTimeout(900);
      b = await st();
      await page.keyboard.up('ArrowUp'); await page.keyboard.up('ArrowLeft');
      await page.keyboard.press('KeyF'); await page.waitForTimeout(150);
      const c = await st();
      await page.evaluate(() => { window.__pipbo.G.manual = true; });
      check(b.burn > 0.8 && b.ready < 2.7 && b.vx < -40, `${tag} live loop: ↑ + ← held for 0.9 s burn and steer (ready ${b.ready.toFixed(1)} s, vx ${b.vx | 0})`);
      check(c.pumps > b.pumps, `${tag} live loop: F pumps (${b.pumps} -> ${c.pumps})`);
      await page.screenshot({ path: path.join(outDir, 'keys-keyboard.png') });
      /* ---- two controllers: pad 1 = Pip (engineer), pad 2 = Bo (pilot) ---- */
      const r = await page.evaluate(() => {
        const P = window.__pipbo, G = P.G, pads = window.__pads, on = { pressed: true, value: 1 }, off = { pressed: false, value: 0 }, out = {};
        pads[0].on = pads[1].on = true; window.__run(4);
        window.__start(); window.__run(Math.round(1.7 / P.DT));
        out.hints = G.mst.hints.map(h => (h ? h.text : ''));
        out.keys = [tthKey(0, 'act'), tthKey(1, 'jump'), tthKey(1, 'move')];
        window.__calm(); const ph = G.mst.ph, L = ph.L, s = G.mst.stats.moon;
        let p0 = s.pumps; pads[0].buttons[2] = on; window.__run(4); pads[0].buttons[2] = off; window.__run(4); out.pump = s.pumps - p0;
        pads[0].axes[0] = 1; window.__run(40); out.armR = ph.arm.a; pads[0].axes[0] = -1; window.__run(80); out.armL = ph.arm.a; pads[0].axes[0] = 0;
        window.__calm(); pads[1].buttons[0] = on; window.__run(80); out.burnA = L.burn; out.vyA = L.vy; pads[1].buttons[0] = off; window.__run(2);
        window.__calm(); pads[1].buttons[2] = on; window.__run(60); out.burnX = L.burn; pads[1].buttons[2] = off; window.__run(2);
        window.__calm(); pads[1].axes[1] = -1; window.__run(60); out.burnUp = L.burn; pads[1].axes[1] = 0; window.__run(2);
        window.__calm(); pads[1].axes[0] = -1; window.__run(60); out.vxL = L.vx; pads[1].axes[0] = 1; window.__run(120); out.vxR = L.vx; pads[1].axes[0] = 0;
        return out;
      });
      check(r.pump === 1, `${tag} controller 1 X: one pump stroke (${r.pump})`);
      check(r.armR > 0.6 && r.armL < -0.6, `${tag} controller 1 stick swings the arm (${r.armR.toFixed(2)} / ${r.armL.toFixed(2)} rad)`);
      check(r.burnA > 0.8 && r.vyA < -30, `${tag} controller 2 A burns (${r.vyA | 0} px/s)`);
      check(r.burnX > 0.8, `${tag} controller 2 X (the action) burns too`);
      check(r.burnUp > 0.8, `${tag} controller 2 stick up burns too`);
      check(r.vxL < -80 && r.vxR > 80, `${tag} controller 2 stick fires the side jets (${r.vxL | 0} / ${r.vxR | 0} px/s)`);
      const plain = s => String(s).replace(/<[^>]*>/g, '');
      check(r.keys.every(k => k && !/^[F/W↑]$/.test(plain(k))) && r.hints[0].includes(plain(r.keys[0])) && r.hints[1].includes(plain(r.keys[1])) && /stick/.test(r.hints[1]),
        `${tag} controller hints name the controller: Pip "${r.hints[0]}" / Bo "${r.hints[1]}"`);
      await page.evaluate(() => { window.__pads[0].on = window.__pads[1].on = false; window.__run(4); window.__start(); });
      /* ---- a beacon: the jobs swap, and the same keys now do the other job ---- */
      await page.evaluate(() => {
        const G = window.__pipbo.G, ph = G.mst.ph, b = ph.beacons[0];
        ph.L.x = b.x; ph.L.y = b.y - 20; ph.L.vx = 0; ph.L.vy = 10; ph.F.ready = 3;
      });
      await page.keyboard.down('ArrowUp'); await run(30); await page.keyboard.up('ArrowUp');   // (a person is there: hover in the ring)
      for (let i = 0; i < 8; i++) { await page.keyboard.down('ArrowUp'); await run(26); await page.keyboard.up('ArrowUp'); await run(34); if ((await st()).mode === 'dock') break; }
      a = await st(); check(a.mode === 'dock', `${tag} hovering in the ring docks at the beacon (mode ${a.mode})`);
      await run(Math.round(3 / (1 / 120)));
      a = await st(); check(a.mode === 'fly' && a.pilot === 0, `${tag} after the beacon the jobs swap: Pip flies now (pilot ${a.pilot})`);
      const labels = await page.evaluate(() => window.__pipbo.G.level.def.act.labels.join(','));
      check(labels === 'burn,pump', `${tag} action words after the swap: "${labels}"`);
      check(/\bW\b/.test(a.hints[0]) && /\//.test(a.hints[1]), `${tag} swap hints: Pip "${a.hints[0]}" / Bo "${a.hints[1]}"`);
      await page.evaluate(() => { const ph = window.__pipbo.G.mst.ph; ph.L.vy = 0; ph.L.vx = 0; ph.F.ready = 1.6; ph.arm.a = 0; });
      b = await hold('KeyW', 60); check(b.burn > 0.8, `${tag} keyboard W burns now`);
      a = await st(); await page.keyboard.press('Slash'); await run(4); b = await st(); check(b.pumps === a.pumps + 1, `${tag} keyboard / pumps now`);
      b = await hold('ArrowRight', 40); check(b.arm > 0.6, `${tag} keyboard → swings the arm now (${b.arm.toFixed(2)} rad)`);
    } else {
      /* ---- touch: ◀ ▶ ▲ and one round button per player ---- */
      const press = async (sel, steps, id = 7) => {
        const bb = await page.$eval(sel, el => { const r = el.getBoundingClientRect(); return { clientX: r.x + r.width / 2, clientY: r.y + r.height / 2 }; });
        await page.dispatchEvent(sel, 'pointerdown', Object.assign({ pointerId: id, bubbles: true }, bb));
        await run(steps);
        const during = await st();
        await page.dispatchEvent(sel, 'pointerup', Object.assign({ pointerId: id, bubbles: true }, bb));
        await run(3);
        return during;
      };
      await page.evaluate(() => { window.__start(); window.__run(Math.round(1.7 / window.__pipbo.DT)); });
      let a = await st();
      const vis = await page.$$eval('#padPip [data-k], #padBo [data-k]', els => els.filter(e => e.offsetParent).length);
      check(vis >= 10, `${tag} touch buttons shown (${vis})`);
      let labels = await page.$$eval('.tbtn-act', els => els.map(e => e.textContent).join(','));
      check(labels === 'pump,burn', `${tag} round buttons say "${labels}"`);
      check(/round button/.test(a.hints[0]) && /▲/.test(a.hints[1]) && /◀ ▶/.test(a.hints[1]), `${tag} start hints name the touch buttons: Pip "${a.hints[0]}" / Bo "${a.hints[1]}"`);
      await page.screenshot({ path: path.join(outDir, 'keys-touch.png') });
      await calm(); a = await st();
      let b = await press('#padPip .tbtn-act', 4); check(b.pumps === a.pumps + 1, `${tag} Pip's round button pumps (${a.pumps} -> ${b.pumps})`);
      b = await press('#padPip [data-k="right"]', 40); check(b.arm > 0.6, `${tag} Pip's ▶ swings the arm right (${b.arm.toFixed(2)} rad)`);
      b = await press('#padPip [data-k="left"]', 80); check(b.arm < -0.6, `${tag} Pip's ◀ swings the arm left (${b.arm.toFixed(2)} rad)`);
      await calm(); b = await press('#padBo [data-k="jump"]', 80); check(b.burn > 0.8 && b.vy < -30, `${tag} Bo's ▲ burns (${b.vy | 0} px/s)`);
      await calm(); b = await press('#padBo .tbtn-act', 60); check(b.burn > 0.8, `${tag} Bo's round button burns too`);
      await calm(); b = await press('#padBo [data-k="left"]', 60); check(b.vx < -80, `${tag} Bo's ◀ fires the side jet (${b.vx | 0} px/s)`);
      await calm(); b = await press('#padBo [data-k="right"]', 60); check(b.vx > 80, `${tag} Bo's ▶ fires the side jet (${b.vx | 0} px/s)`);
      // steering and burning together on touch: ◀ with one thumb, the round button with the other
      await calm();
      {
        const sel1 = '#padBo [data-k="left"]', sel2 = '#padBo .tbtn-act';
        const bb = sel => page.$eval(sel, el => { const r = el.getBoundingClientRect(); return { clientX: r.x + r.width / 2, clientY: r.y + r.height / 2 }; });
        const b1 = await bb(sel1), b2 = await bb(sel2);
        await page.dispatchEvent(sel1, 'pointerdown', Object.assign({ pointerId: 11, bubbles: true }, b1));
        await page.dispatchEvent(sel2, 'pointerdown', Object.assign({ pointerId: 12, bubbles: true }, b2));
        await run(60); b = await st();
        await page.dispatchEvent(sel1, 'pointerup', Object.assign({ pointerId: 11, bubbles: true }, b1));
        await page.dispatchEvent(sel2, 'pointerup', Object.assign({ pointerId: 12, bubbles: true }, b2));
        await run(3);
        check(b.burn > 0.8 && b.vx < -80, `${tag} Bo's ◀ + round button: steer and burn with two thumbs (vx ${b.vx | 0}, burn ${b.burn.toFixed(1)})`);
      }
      /* ---- the landing, moon hops and the flag, all by touch ---- */
      await page.evaluate(() => {
        const G = window.__pipbo.G, ph = G.mst.ph;
        ph.stretch = 2; ph.beacons.forEach(q => { q.got = true; }); ph.cells.length = 0; ph.cellT = 99;
        ph.L.x = ph.pad.x; ph.L.y = ph.ground - 46 - 60; ph.L.vx = 0; ph.L.vy = 20; ph.L.top = ph.ground - 900; ph.F.ready = 3; ph.F.pod[0] = ph.F.pod[1] = 2;
      });
      for (let i = 0; i < 12 && (await st()).mode === 'fly'; i++) await press('#padBo [data-k="jump"]', 14).then(() => run(30));
      a = await st(); check(a.mode === 'down' || a.mode === 'foot', `${tag} a gentle touchdown on the pad (mode ${a.mode})`);
      await run(Math.round(4.2 * 120));
      a = await st(); check(a.mode === 'foot' && a.flag === 'down', `${tag} Pip and Bo hop out, the flag lies by the pad (mode ${a.mode}, flag ${a.flag})`);
      labels = await page.$$eval('.tbtn-act', els => els.map(e => e.textContent).join(','));
      check(labels === 'plant,plant', `${tag} round buttons say "${labels}" on foot`);
      b = await press('#padPip [data-k="jump"]', 20); check(b.ps[0].vy < -100 || !b.ps[0].grounded, `${tag} Pip's ▲: a moon hop (vy ${b.ps[0].vy | 0})`);
      await page.screenshot({ path: path.join(outDir, 'keys-touch-foot.png') });
      // walk both to the flag
      for (const [k, pad] of [[0, '#padPip'], [1, '#padBo']]) {
        for (let i = 0; i < 30; i++) {
          a = await st();
          const d = a.flagX - a.ps[k].x;
          if (Math.abs(d) < 30) break;
          await press(`${pad} [data-k="${d > 0 ? 'right' : 'left'}"]`, 18);
        }
        a = await st(); check(Math.abs(a.flagX - a.ps[k].x) < 50, `${tag} ${k ? 'Bo' : 'Pip'} walks to the flag with ◀ ▶ (${(a.ps[k].x - a.flagX) | 0} px away)`);
      }
      // one alone: nothing happens; both round buttons: planted
      b = await press('#padPip .tbtn-act', 240, 21);
      check(b.plant === 0 && !b.cut, `${tag} one round button alone does not plant the flag (${b.plant.toFixed(2)})`);
      {
        const bb = sel => page.$eval(sel, el => { const r = el.getBoundingClientRect(); return { clientX: r.x + r.width / 2, clientY: r.y + r.height / 2 }; });
        const b1 = await bb('#padPip .tbtn-act'), b2 = await bb('#padBo .tbtn-act');
        await page.dispatchEvent('#padPip .tbtn-act', 'pointerdown', Object.assign({ pointerId: 31, bubbles: true }, b1));
        await page.dispatchEvent('#padBo .tbtn-act', 'pointerdown', Object.assign({ pointerId: 32, bubbles: true }, b2));
        await run(Math.round(1.6 * 120));
        b = await st();
        await page.dispatchEvent('#padPip .tbtn-act', 'pointerup', Object.assign({ pointerId: 31, bubbles: true }, b1));
        await page.dispatchEvent('#padBo .tbtn-act', 'pointerup', Object.assign({ pointerId: 32, bubbles: true }, b2));
        check(b.mode === 'planted' || b.cut, `${tag} both round buttons held: the flag is planted (mode ${b.mode})`);
        await run(Math.round(1.6 * 120));
        b = await st(); check(b.cut, `${tag} the era ends: the portal cutscene starts`);
        const loot = await page.evaluate(() => window.__pipbo.G.mst.loot[7]);
        check(loot === true, `${tag} the Moon flag is saved (loot ${loot})`);
      }
    }
    await page.close();
  }
  console.log(bad ? bad + ' PROBLEMS' : 'all inputs reach the era');
  console.log(errors.length ? 'PAGE MESSAGES:\n' + [...new Set(errors)].slice(0, 12).join('\n') : 'no page errors');
  await browser.close();
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
