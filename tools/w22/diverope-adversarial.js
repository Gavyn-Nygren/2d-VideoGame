#!/usr/bin/env node
// 22-2 Treasure Diver Rope: a reviewer's checks of the edge cases the break suite doesn't reach.
//   chestFloor   the diver hooks the chest standing on the sand, then the boat partner walks away: the air runs out,
//                the chest must land back on the sand (not fall through it forever) and still be grabbable
//   chestLedge   the same, while standing on a rock ledge with the chest
//   eelStraight  a boat partner who ignores the eels (never waits for an awake one): reports the frights, still clears
//   restart      R mid-dive 3 and from the results card: a fresh level (dive 1, no stats, air full)
//   pause        pausing mid-dive freezes the dive (air, time, diver)
//   idleBoth     both players press nothing for 300 s in dive 2: nothing breaks, no help, no clear
// Usage: node tools/w22/diverope-adversarial.js [--only=name,name]
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const only = (process.argv.find(a => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
let fails = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };

async function fresh(browser) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.addInitScript(() => { let s = 4242; Math.random = () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  await page.evaluate(() => {
    const P = window.__pipbo, G = P.G;
    G.manual = true; G.cpuOn = [true, true]; P.CPU.idleStop = 1e9; P.CPU.filter = null;
    P.loadLevel(P.LEVELS.findIndex(l => l.name === 'Treasure Diver Rope'));
    G.introT = 0;
  });
  return { page, errors };
}
// run steps until cond (a function body over P, G, st) is true or max seconds pass
const until = (page, cond, max) => page.evaluate(({ cond, max }) => {
  const P = window.__pipbo, G = P.G, f = new Function('P', 'G', 'st', 'return ' + cond);
  let n = 0;
  while (n < max / P.DT && G.mode === 'play' && !f(P, G, G.mst)) { P.step(P.DT); n++; }
  return { t: n * P.DT, hit: f(P, G, G.mst) };
}, { cond, max });

const TESTS = {
  async chestFloor(browser) {
    const { page, errors } = await fresh(browser);
    // the computer pair plays until the chest is hooked; then the boat partner does nothing, the diver stands still
    const r = await until(page, 'st.d.chest', 120);
    ok(r.hit, 'chestFloor: the chest got hooked (' + r.t.toFixed(1) + ' s)');
    await page.evaluate(() => {
      const P = window.__pipbo, G = P.G, st = G.mst;
      P.CPU.filter = (p, o) => ({});
      // stand on the sand right by the chest (as a person who swam down again would)
      st.d.y = st.c.floor; st.d.vy = 0; st.rope.L = 4000; st.air = 0.02;
    });
    await until(page, 'st.state === "blub"', 20);
    await until(page, 'st.state === "ride"', 30);
    const s = await page.evaluate(() => { const st = window.__pipbo.G.mst; return { ch: st.c.chest, floor: st.c.floor }; });
    await until(page, 'st.c.chest.state === "rest"', 15);
    const s2 = await page.evaluate(() => { const st = window.__pipbo.G.mst; return { ch: st.c.chest, floor: st.c.floor }; });
    ok(s2.ch.state === 'rest' && s2.ch.y <= s2.floor + 1, 'chestFloor: the dropped chest rests on the sand (state ' + s2.ch.state + ', y ' + Math.round(s2.ch.y) + ', floor ' + s2.floor + ')');
    // and the computer pair can still finish the dive
    await page.evaluate(() => { window.__pipbo.CPU.filter = null; });
    const r2 = await until(page, 'G.room > 0', 120);
    ok(r2.hit, 'chestFloor: the dive still finishes afterwards (' + r2.t.toFixed(1) + ' s)');
    if (errors.length) { console.log('ERRORS ' + errors.join(' | ')); fails++; }
    await page.close();
  },
  async chestLedge(browser) {
    const { page, errors } = await fresh(browser);
    const r = await until(page, 'st.d.chest', 120);
    ok(r.hit, 'chestLedge: the chest got hooked');
    // put the diver with the chest on the right-hand ledge (y 380, x 620..860) and run out of air
    await page.evaluate(() => {
      const P = window.__pipbo, G = P.G, st = G.mst;
      P.CPU.filter = (p, o) => ({});
      st.d.x = 700; st.d.y = 380; st.d.vy = 0; st.d.vx = 0; st.rope.L = 4000; st.air = 0.01;
    });
    await until(page, 'st.state === "ride" && st.c.chest.state === "rest"', 30);
    const s = await page.evaluate(() => { const st = window.__pipbo.G.mst; return { ch: st.c.chest }; });
    ok(s.ch.state === 'rest' && Math.abs(s.ch.y - 380) < 2, 'chestLedge: the chest lands on the ledge it was carried over (y ' + Math.round(s.ch.y) + ')');
    await page.evaluate(() => { window.__pipbo.CPU.filter = null; });
    const r2 = await until(page, 'G.room > 0', 120);
    ok(r2.hit, 'chestLedge: the dive still finishes afterwards (' + r2.t.toFixed(1) + ' s)');
    if (errors.length) { console.log('ERRORS ' + errors.join(' | ')); fails++; }
    await page.close();
  },
  async eelStraight(browser) {
    const { page, errors } = await fresh(browser);
    // the boat partner ignores the eels: lets out rope when the plan says to wait for an awake eel
    await page.evaluate(() => {
      const P = window.__pipbo, G = P.G;
      P.CPU.filter = (p, o) => { const st = G.mst; if (p.id !== st.boater || st.plan.why !== 'eel') return o; return st.plan.up ? { up: true } : { down: true }; };
    });
    const r = await until(page, 'G.room >= 4 || G.mode !== "play"', 500);
    const s = await page.evaluate(() => { const G = window.__pipbo.G; return { mode: G.mode, room: G.room, st: G.mst.stats, t: G.time }; });
    console.log('   eelStraight: ' + s.mode + ' dive ' + (s.room + 1) + ' t ' + Math.round(s.t) + ' eels ' + s.st.eels + ' jellies ' + s.st.jellies + ' helps ' + s.st.helps);
    ok(s.mode !== 'play', 'eelStraight: still clears');
    if (errors.length) { console.log('ERRORS ' + errors.join(' | ')); fails++; }
    await page.close();
  },
  async restart(browser) {
    const { page, errors } = await fresh(browser);
    await until(page, 'G.room >= 2 && st.diveT > 8', 300);
    await page.keyboard.press('r');
    const s = await page.evaluate(() => { const G = window.__pipbo.G, st = G.mst; return { room: G.room, banked: st.stats.banked, air: st.air, state: st.state, diver: st.diver, t: G.time }; });
    ok(s.room === 0 && s.banked === 0 && s.air === 1 && s.state === 'ride' && s.diver === 0, 'restart: R mid-dive 3 gives a fresh dive 1 ' + JSON.stringify(s));
    await page.evaluate(() => { window.__pipbo.G.introT = 0; });
    const r = await until(page, 'false', 400);
    const m = await page.evaluate(() => window.__pipbo.G.mode);
    ok(m === 'clear' || m === 'result', 'restart: plays through to the end after a restart (' + m + ')');
    await page.waitForTimeout(2500);
    const m2 = await page.evaluate(() => window.__pipbo.G.mode);
    ok(m2 === 'result', 'restart: the results card shows (' + m2 + ')');
    await page.keyboard.press('r');
    const s2 = await page.evaluate(() => { const G = window.__pipbo.G, st = G.mst; return { mode: G.mode, room: G.room, banked: st.stats.banked, state: st.state }; });
    ok(s2.mode === 'play' && s2.room === 0 && s2.banked === 0 && s2.state === 'ride', 'restart: R on the results card restarts ' + JSON.stringify(s2));
    if (errors.length) { console.log('ERRORS ' + errors.join(' | ')); fails++; }
    await page.close();
  },
  async pause(browser) {
    const { page, errors } = await fresh(browser);
    await until(page, 'st.d.y > 400', 60);
    // (the live loop: G.manual off, so frames run in real time; the pause card stops them)
    await page.evaluate(() => { const G = window.__pipbo.G; G.manual = false; window.__pipbo.pause(); });
    const b = await page.evaluate(() => { const G = window.__pipbo.G, st = G.mst; return { air: st.air, y: st.d.y, t: G.time, mode: G.mode }; });
    await page.waitForTimeout(1500);
    const a = { b, a: await page.evaluate(() => { const G = window.__pipbo.G, st = G.mst; return { air: st.air, y: st.d.y, t: G.time, mode: G.mode }; }) };
    ok(a.b.mode === 'paused' && a.a.air === a.b.air && a.a.y === a.b.y && a.a.t === a.b.t, 'pause: nothing moves while paused ' + JSON.stringify(a));
    if (errors.length) { console.log('ERRORS ' + errors.join(' | ')); fails++; }
    await page.close();
  },
  async idleBoth(browser) {
    const { page, errors } = await fresh(browser);
    await until(page, 'G.room >= 1', 120);
    await page.evaluate(() => { window.__pipbo.CPU.filter = () => ({}); });
    await until(page, 'false', 300);
    const s = await page.evaluate(() => { const G = window.__pipbo.G, st = G.mst; return { mode: G.mode, room: G.room, helps: st.stats.helps, blubs: st.stats.blubs, state: st.state, y: Math.round(st.d.y), air: +st.air.toFixed(2) }; });
    ok(s.mode === 'play' && s.room === 1 && s.helps === 0, 'idleBoth: both idle 300 s in dive 2: no clear, no help ' + JSON.stringify(s));
    if (errors.length) { console.log('ERRORS ' + errors.join(' | ')); fails++; }
    await page.close();
  },
};

(async () => {
  const browser = await chromium.launch();
  for (const [n, f] of Object.entries(TESTS)) if (!only.length || only.includes(n)) await f(browser);
  await browser.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
