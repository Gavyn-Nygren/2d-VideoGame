#!/usr/bin/env node
// 24-4 Pillow Fort Battle: do the keyboard, a (stubbed) controller and the touch buttons reach the level?
//   node tools/w24/pillowfort-input.js
// Pip uses the keyboard (D walks, F holds to aim and tosses, F builds, S drops), Bo a controller (stick, X); then
// touch at 844x390 and 390x844 with Pip's ▶ ▼ and the round "toss" button. Prints what each did and PASS/FAIL;
// screenshots of play and the pause card go to build/w24/.
'use strict';
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const errors = [], results = [], out = path.resolve(__dirname, '..', '..', 'build', 'w24');
  let fails = 0;
  const check = (ok, line) => { results.push((ok ? 'PASS ' : 'FAIL ') + line); if (!ok) fails++; };
  fs.mkdirSync(out, { recursive: true });
  for (const mode of ['kb+pad', 'touch-844x390', 'touch-390x844']) {
    const touch = mode.startsWith('touch'), [vw, vh] = touch ? mode.split('-')[1].split('x').map(Number) : [1280, 720];
    const ctx = await browser.newContext(touch ? { viewport: { width: vw, height: vh }, hasTouch: true, deviceScaleFactor: 1 } : { viewport: { width: vw, height: vh }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push(mode + ': ' + String(e)));
    page.on('console', m => { if (m.type() === 'error') errors.push(mode + ': ' + m.text()); });
    await page.addInitScript(() => {
      window.__pad = { buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })), axes: [0, 0, 0, 0], connected: true, mapping: 'standard', id: 'Stub pad', index: 1, timestamp: 0 };
      window.__padOn = false;
      const idle = { buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })), axes: [0, 0, 0, 0], connected: true, mapping: 'standard', id: 'Idle pad', index: 0, timestamp: 0 };
      navigator.getGamepads = () => (window.__padOn ? [idle, window.__pad] : []);
    });
    await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
    await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
    await page.evaluate(mode => {
      const P = window.__pipbo, G = P.G;
      G.manual = true;
      if (mode === 'kb+pad') window.__padOn = true;
      P.loadLevel(P.LEVELS.findIndex(l => l.name === 'Pillow Fort Battle'));
      G.cpuOn = [false, false]; G.introT = 0;
      P.fit();
      window.__run = s => { for (let k = 0; k < Math.round(s / P.DT); k++) { P.pollInput(P.DT); P.step(P.DT); } };
      let n = 0; while (G.match.phase !== 'live' && n++ < 2000) { P.pollInput(P.DT); P.step(P.DT); }
      G.mst.spawnT = 999; G.mst.items = [];   // no toys from the box: the test hands them out
      window.__give = (k, t) => { const s = G.mst.pl[k]; s.hold = { t, v: 'bunny' }; s.cd = 0; };
      window.__put = (k, x) => { const p = G.players[k]; p.x = x - p.w / 2; p.y = 480 - p.h; p.vx = 0; p.vy = 0; };
    }, mode);
    const st = () => page.evaluate(() => { const G = window.__pipbo.G, st = G.mst; return { x: G.players.map(p => Math.round(p.x)), face: G.players.map(p => p.face), hold: st.pl.map(s => (s.hold ? s.hold.t : null)), aim: st.pl.map(s => s.aim), throws: st.stat.throws.slice(), built: st.stat.built.slice(), items: st.items.length, shots: st.shots.length }; });
    const run = s => page.evaluate(s => window.__run(s), s);
    if (mode === 'kb+pad') {
      // walking
      await page.evaluate(() => { window.__put(0, 330); window.__put(1, 630); });
      const a = await st();
      await page.keyboard.down('KeyD'); await page.evaluate(() => { window.__pad.axes[0] = 1; });
      await run(0.3);
      await page.keyboard.up('KeyD'); await page.evaluate(() => { window.__pad.axes[0] = 0; });
      const b = await st();
      check(b.x[0] > a.x[0] + 20 && b.x[1] > a.x[1] + 20, `D / stick right 0.3 s: Pip x ${a.x[0]} -> ${b.x[0]}, Bo x ${a.x[1]} -> ${b.x[1]}`);
      // hold to aim, let go to toss
      await page.evaluate(() => { window.__put(0, 330); window.__put(1, 630); window.__give(0, 'plush'); window.__give(1, 'plush'); });
      await run(0.1);
      await page.keyboard.down('KeyF'); await page.evaluate(() => { window.__pad.buttons[2] = { pressed: true, value: 1 }; });
      await run(0.5); const c = await st();
      await page.keyboard.up('KeyF'); await page.evaluate(() => { window.__pad.buttons[2] = { pressed: false, value: 0 }; });
      await run(0.05); const d = await st();
      check(c.aim[0] && c.aim[1] && d.throws[0] === 1 && d.throws[1] === 1, `F / pad X held 0.5 s: aiming ${c.aim}; on release tosses ${d.throws}, flying ${d.shots}`);
      // build: Pip in front of her fort facing it, Bo in front of his
      await run(2);
      await page.evaluate(() => { const G = window.__pipbo.G; window.__put(0, 262); window.__put(1, 698); G.players[0].face = -1; G.players[1].face = 1; window.__give(0, 'pillow'); window.__give(1, 'cushion'); });
      await run(0.05);
      await page.keyboard.press('KeyF'); await page.evaluate(() => { window.__pad.buttons[2] = { pressed: true, value: 1 }; });
      await run(0.1); await page.evaluate(() => { window.__pad.buttons[2] = { pressed: false, value: 0 }; }); await run(0.1);
      const e = await st();
      check(e.built[0] === 1 && e.built[1] === 1 && !e.hold[0] && !e.hold[1], `F / pad X at the fort with a pillow: built ${e.built}, holding ${e.hold}`);
      // drop: S / stick down
      await page.evaluate(() => { window.__give(0, 'plush'); window.__give(1, 'ball'); });
      await run(0.1);
      const n0 = (await st()).items;
      await page.keyboard.down('KeyS'); await page.evaluate(() => { window.__pad.axes[1] = 1; });
      await run(0.1);
      await page.keyboard.up('KeyS'); await page.evaluate(() => { window.__pad.axes[1] = 0; });
      await run(0.1); const f = await st();
      check(!f.hold[0] && !f.hold[1] && f.items === n0 + 2, `S / stick down drops: holding ${f.hold}, toys on the floor ${n0} -> ${f.items}`);
      // pick up: walk over a toy
      await page.evaluate(() => { window.__put(0, 300); window.__put(1, 660); const st = window.__pipbo.G.mst; st.items = []; window.__pipbo.G.mst.pl.forEach(s => { s.pickCd = 0; }); pfbItem(st, 'plush', 360, 469, 0, 0).rest = true; pfbItem(st, 'feather', 600, 469, 0, 0).rest = true; });
      await page.keyboard.down('KeyD'); await page.evaluate(() => { window.__pad.axes[0] = -1; });
      await run(0.5);
      await page.keyboard.up('KeyD'); await page.evaluate(() => { window.__pad.axes[0] = 0; });
      const g = await st();
      check(g.hold[0] === 'plush' && g.hold[1] === 'feather', `walk over a toy: Pip holds ${g.hold[0]}, Bo holds ${g.hold[1]}`);
      results.push('Bo chip keys: ' + await page.evaluate(() => JSON.stringify(pfbKeys(1))));
      await page.waitForTimeout(100);
      await page.screenshot({ path: path.join(out, 'pf-kb-play.png') });
    } else {
      // (pressed at the button's own centre: the ◀ ▶ strip reads where the finger is)
      const down = (sel, on) => page.evaluate(({ sel, on }) => { const el = document.querySelector(sel), r = el.getBoundingClientRect(); el.dispatchEvent(new PointerEvent(on ? 'pointerdown' : 'pointerup', { bubbles: true, pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 })); }, { sel, on });
      const act = await page.evaluate(() => { const el = document.querySelector('#padPip .tbtn-act'); const r = el.getBoundingClientRect(); return el.textContent + ' ' + Math.round(r.width) + 'x' + Math.round(r.height); });
      results.push(mode + ' act button: ' + act);
      await page.evaluate(() => window.__put(0, 330));
      const a = await st();
      await down('#padPip [data-k="right"]', true); await run(0.3); await down('#padPip [data-k="right"]', false);
      const b = await st();
      check(b.x[0] > a.x[0] + 20, `${mode} touch ▶ 0.3 s: Pip x ${a.x[0]} -> ${b.x[0]}`);
      await page.evaluate(() => { window.__put(0, 330); window.__give(0, 'plush'); });
      await run(0.1);
      await down('#padPip .tbtn-act', true); await run(0.6); const c = await st();
      await page.waitForTimeout(50);
      await page.screenshot({ path: path.join(out, 'pf-touch-' + vw + 'x' + vh + '-aim.png') });
      await down('#padPip .tbtn-act', false); await run(0.05); const d = await st();
      check(c.aim[0] && d.throws[0] === 1, `${mode} touch toss: aiming ${c.aim[0]}, tosses ${d.throws[0]}`);
      await page.evaluate(() => { window.__give(0, 'pillow'); });
      await run(0.1);
      await down('#padPip [data-k="down"]', true); await run(0.1); await down('#padPip [data-k="down"]', false); await run(0.1);
      const e = await st();
      check(!e.hold[0], `${mode} touch ▼ drops: holding ${e.hold[0]}`);
      await run(0.6);
      await page.screenshot({ path: path.join(out, 'pf-touch-' + vw + 'x' + vh + '-play.png') });
      await page.evaluate(() => window.__pipbo.pause());
      results.push(mode + ' pause card: ' + await page.evaluate(() => (document.querySelector('#overlay') || {}).innerText.replace(/\s+/g, ' ').slice(0, 200)));
      await page.screenshot({ path: path.join(out, 'pf-touch-' + vw + 'x' + vh + '-pause.png') });
    }
    await ctx.close();
  }
  console.log(results.join('\n'));
  console.log(errors.length ? 'ERRORS\n' + errors.join('\n') : 'no page errors');
  console.log(fails ? fails + ' FAILED' : 'all input checks passed');
  await browser.close();
  process.exit(fails || errors.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
