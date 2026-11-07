#!/usr/bin/env node
// 18-2 Grapple & Zip: drives the real input paths (keyboard keys, a stubbed controller, touch buttons) through one hop
// and checks each job reacts: climb, stand on the X, aim, charge and throw, grab the handle, zip and let go, crank,
// board the chair. Also checks the act labels per role, restart (R), pause, and that another level loaded afterwards
// has its own labels back (no leaks). Usage: node tools/w18/grapple-controls.js [--out=dir]
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const out = opt('out', 'build/w18');
fs.mkdirSync(out, { recursive: true });
let fails = 0;
const ok = (c, msg) => { console.log((c ? 'ok   ' : 'FAIL ') + msg); if (!c) fails++; };

async function setup(browser, ctxOpts, pad) {
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  if (pad) {
    await page.addInitScript(() => {
      const mk = i => ({ index: i, id: 'Xbox Wireless Controller (STANDARD GAMEPAD)', mapping: 'standard', connected: true, timestamp: 0,
        axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) });
      window.__pads = [mk(0), mk(1)];
      navigator.getGamepads = () => window.__pads;
    });
  }
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  await page.evaluate(() => {
    const P = window.__pipbo, G = P.G;
    G.cpuOn = [false, false];
    P.loadLevel(P.LEVELS.findIndex(l => l.name === 'Grapple & Zip'));
    G.manual = true; G.introT = 0;
  });
  return { page, errors, ctx };
}
// run n steps through the real input reader
const run = (page, secs) => page.evaluate(secs => {
  const P = window.__pipbo;
  for (let i = 0; i < Math.round(secs / P.DT); i++) { P.pollInput(P.DT); P.step(P.DT); }
}, secs);
const st = page => page.evaluate(() => {
  const G = window.__pipbo.G, m = G.mst, h = m.hop;
  return { phase: h.phase, T: h.T, tries: h.tries, ang: h.ang, charging: h.charging, boarded: h.boarded, chairS: h.chairS,
    pl: m.pl.map(q => ({ mode: q.mode, x: q.x, onNest: q.onNest, ship: q.ship })), spotX: m.ships[h.from].spotX, ladX: m.ships[h.from].ladX,
    capX: m.ships[h.to].capX, labels: Array.from(document.querySelectorAll('[data-actlabel]')).map(e => e.textContent), mode: G.mode };
});
// walk a player to x (on its current level) with a key held
async function walkTo(page, hold, release, x, idx) {
  for (let k = 0; k < 80; k++) {
    const s = await st(page);
    const d = x - s.pl[idx].x;
    if (Math.abs(d) < 6) break;
    await hold(d < 0 ? 'left' : 'right'); await run(page, Math.min(0.2, Math.abs(d) / 175 * 0.8)); await release(d < 0 ? 'left' : 'right');
  }
}
// force the hook to catch (so the zip/haul can be tested without aiming skill)
const forceCatch = page => page.evaluate(() => {
  const m = window.__pipbo.G.mst, h = m.hop;
  h.phase = 'caught'; h.hook = null; grappleRopeUpdate(m, h, 0);
});

(async () => {
  const browser = await chromium.launch();
  // ---------- keyboard ----------
  {
    const { page, errors, ctx } = await setup(browser, { viewport: { width: 1280, height: 800 } });
    const KEYS = [{ left: 'KeyA', right: 'KeyD', up: 'KeyW', down: 'KeyS', act: 'KeyF' }, { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown', act: 'Slash' }];
    for (const id of [0, 1]) {
      const K = KEYS[id];
      const hold = k => page.keyboard.down(K[k] === 'Slash' ? '/' : K[k]), rel = k => page.keyboard.up(K[k] === 'Slash' ? '/' : K[k]);
      let s = await st(page);
      await walkTo(page, hold, rel, s.ladX, id);
      await hold('up'); await run(page, 1.2); await rel('up');
      s = await st(page);
      ok(s.pl[id].onNest, `keyboard ${['Pip', 'Bo'][id]}: climbs the rope ladder to the crow's nest`);
    }
    let s = await st(page);
    const T = s.T, Z = 1 - T, KT = KEYS[T], KZ = KEYS[Z];
    const kd = k => page.keyboard.down(k === 'Slash' ? '/' : k), ku = k => page.keyboard.up(k === 'Slash' ? '/' : k);
    await walkTo(page, k => kd(KT[k]), k => ku(KT[k]), s.spotX, T);
    s = await st(page);
    const a0 = s.ang;
    await kd(KT.up); await run(page, 0.3); await ku(KT.up);
    s = await st(page);
    ok(s.ang > a0 + 5, `keyboard thrower: ▲ raises the aim (${a0.toFixed(0)}° -> ${s.ang.toFixed(0)}°)`);
    await kd(KT.act); await run(page, 0.5);
    s = await st(page); ok(s.charging, 'keyboard thrower: holding the action charges the meter');
    await ku(KT.act); await run(page, 0.05);
    s = await st(page); ok(s.tries === 1 && (s.phase === 'fly' || s.phase === 'reel' || s.phase === 'caught'), 'keyboard thrower: letting go throws (' + s.phase + ')');
    ok(s.labels.includes('throw') && s.labels.includes('grab'), 'act labels while throwing: ' + s.labels.join(','));
    await run(page, 3.5);
    await forceCatch(page);
    await kd(KZ.act); await run(page, 0.05); await ku(KZ.act);
    s = await st(page); ok(s.phase === 'zip' && s.pl[Z].mode === 'zip', 'keyboard zipper: the action grabs the handle in the crow\'s nest');
    ok(s.labels.includes('drop') && s.labels.includes('ride'), 'act labels while zipping: ' + s.labels.join(','));
    await kd(KZ.right); await run(page, 6); await ku(KZ.right);
    s = await st(page); ok(s.phase === 'haul' || s.phase === 'drop', 'keyboard zipper: zips and drops onto the next deck (' + s.phase + ')');
    await run(page, 1);
    s = await st(page);
    await walkTo(page, k => kd(KZ[k]), k => ku(KZ[k]), s.capX, Z);
    await kd(KT.act); await run(page, 0.05); await ku(KT.act);
    s = await st(page); ok(s.boarded, 'keyboard rider: the action hops into the bosun\'s chair');
    ok(s.labels.includes('crank') && s.labels.includes('ride'), 'act labels while hauling: ' + s.labels.join(','));
    for (let i = 0; i < 40 && (await st(page)).phase === 'haul'; i++) { await kd(KZ.act); await run(page, 0.05); await ku(KZ.act); await run(page, 0.4); }
    s = await st(page); ok(s.phase === 'done' || s.phase === 'arrive', 'keyboard cranker: steady heaves haul the rider across (' + s.phase + ')');
    await page.screenshot({ path: path.join(out, 'controls-keyboard.png') });
    // pause / restart / no leaks
    await page.evaluate(() => { const P = window.__pipbo; P.pause(); });
    s = await st(page); ok(s.mode === 'paused', 'Esc pause card opens (mode ' + s.mode + ')');
    await page.evaluate(() => { window.__pipbo.resume(); });
    await page.evaluate(() => { const P = window.__pipbo; P.loadLevel(P.G.levelIndex); window.__pipbo.G.introT = 0; });
    s = await st(page); ok(s.tries === 0 && s.phase === 'aim' && s.pl.every(q => q.mode === 'walk' && !q.onNest), 'restart: a fresh fleet 1');
    const other = await page.evaluate(() => {
      const P = window.__pipbo, i = P.LEVELS.findIndex(l => l.name === 'Temple Doors');
      P.loadLevel(i); P.G.introT = 0;
      for (let k = 0; k < 60; k++) { P.pollInput(P.DT); P.step(P.DT); }
      return { mode: P.G.level.def.mode, labels: Array.from(document.querySelectorAll('[data-actlabel]')).map(e => e.textContent), mst: Object.keys(P.G.mst || {}).includes('hop') };
    });
    ok(!other.labels.some(l => /throw|grab|crank|ride|drop/.test(l)) && !other.mst, 'another level afterwards keeps its own act labels (' + other.labels.join(',') + ') and state');
    const back = await page.evaluate(() => { const P = window.__pipbo; P.loadLevel(P.LEVELS.findIndex(l => l.name === 'Grapple & Zip')); P.G.introT = 0; for (let k = 0; k < 30; k++) P.step(P.DT); return P.G.mst.hop && P.G.mst.hop.phase; });
    ok(back === 'aim', 'and back to Grapple & Zip starts clean');
    ok(!errors.length, 'keyboard run: no page errors ' + errors.slice(0, 3).join(' | '));
    await ctx.close();
  }
  // ---------- controller ----------
  {
    const { page, errors, ctx } = await setup(browser, { viewport: { width: 1280, height: 800 } }, true);
    const btn = (pi, b, v) => page.evaluate(({ pi, b, v }) => { const x = window.__pads[pi].buttons[b]; x.pressed = v; x.value = v ? 1 : 0; }, { pi, b, v });
    const axis = (pi, a, v) => page.evaluate(({ pi, a, v }) => { window.__pads[pi].axes[a] = v; }, { pi, a, v });
    await run(page, 0.5);
    const holdP = pi => k => (k === 'left' ? axis(pi, 0, -1) : k === 'right' ? axis(pi, 0, 1) : k === 'up' ? axis(pi, 1, -1) : k === 'down' ? axis(pi, 1, 1) : btn(pi, 2, true));
    const relP = pi => k => (k === 'left' || k === 'right' ? axis(pi, 0, 0) : k === 'up' || k === 'down' ? axis(pi, 1, 0) : btn(pi, 2, false));
    for (const id of [0, 1]) {
      let s = await st(page);
      await walkTo(page, holdP(id), relP(id), s.ladX, id);
      await holdP(id)('up'); await run(page, 1.2); await relP(id)('up');
      s = await st(page); ok(s.pl[id].onNest, `controller ${id + 1}: stick up climbs the ladder`);
    }
    let s = await st(page);
    const T = s.T;
    await walkTo(page, holdP(T), relP(T), s.spotX, T);
    await btn(T, 2, true); await run(page, 0.5); await btn(T, 2, false); await run(page, 0.05);
    s = await st(page); ok(s.tries === 1, 'controller: X held and let go throws the hook');
    const card = await page.evaluate(() => grappleCard(window.__pipbo.G.mst, 0).keys + ' | ' + grappleCard(window.__pipbo.G.mst, 1).keys);
    ok(/stick|X|▲/.test(card), 'controller job cards name the stick and buttons: ' + card);
    ok(!errors.length, 'controller run: no page errors ' + errors.slice(0, 3).join(' | '));
    await ctx.close();
  }
  // ---------- touch, phone size ----------
  for (const solo of [false, true]) {
    const { page, errors, ctx } = await setup(browser, { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
    if (solo) await page.evaluate(() => { const P = window.__pipbo; P.CPU.cfg.players = 1; P.CPU.cfg.human = 0; P.cpuApplyCfg(); P.G.manual = true; P.G.introT = 0; });
    await run(page, 0.3);
    const vis = await page.evaluate(() => ['padPip', 'padBo'].map(id => { const e = document.getElementById(id); const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0; }));
    ok(vis[0] && (solo ? !vis[1] : vis[1]), `touch ${solo ? '1-player' : '2-player'}: pads shown ${vis}`);
    // press Pip's on-screen buttons: walk to the ladder and climb with the touch pad
    const tap = async (p, k, on) => page.evaluate(({ p, k, on }) => {
      const el = document.querySelector(`#pad${p === 0 ? 'Pip' : 'Bo'} [data-k="${k}"]`); if (!el) return false;
      const r = el.getBoundingClientRect();
      el.dispatchEvent(new PointerEvent(on ? 'pointerdown' : 'pointerup', { bubbles: true, cancelable: true, pointerId: 7 + p * 10 + k.length, pointerType: 'touch', clientX: r.x + r.width / 2, clientY: r.y + r.height / 2 }));
      return true;
    }, { p, k, on });
    const keys = await page.evaluate(() => Array.from(document.querySelectorAll('#padPip [data-k]')).map(e => e.dataset.k));
    let s = await st(page);
    const hk = keys.includes('up') ? 'up' : 'jump';
    await walkTo(page, k => tap(0, k, true), k => tap(0, k, false), s.ladX, 0);
    await tap(0, hk, true); await run(page, 1.2); await tap(0, hk, false);
    s = await st(page); ok(s.pl[0].onNest, `touch ${solo ? '1-player' : '2-player'}: Pip's pad walks and climbs (keys ${keys.join(',')})`);
    const lab = await page.evaluate(() => Array.from(document.querySelectorAll('#padPip [data-actlabel], #padBo [data-actlabel]')).map(e => e.textContent));
    ok(lab[0] === 'throw', 'touch act buttons say ' + lab.join(','));
    const card = await page.evaluate(() => grappleCard(window.__pipbo.G.mst, 0).keys);
    ok(/●|▲/.test(card), 'touch job card names the screen buttons: ' + card);
    await page.evaluate(() => { for (let i = 0; i < 30; i++) window.__pipbo.step(window.__pipbo.DT); });
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(out, `controls-touch-${solo ? 'solo' : 'pair'}.png`) });
    ok(!errors.length, 'touch run: no page errors ' + errors.slice(0, 3).join(' | '));
    await ctx.close();
  }
  await browser.close();
  console.log(fails ? fails + ' FAILED' : 'all passed');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
