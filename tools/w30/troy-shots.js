#!/usr/bin/env node
// Screenshots of special moments of the 'troy' era of 30-1 (things the bot pair never does): caught moving, caught
// peeking, a scrape at the gate, a clonk on a loose plank, rolling back on a ramp, the claw tug.
//   node tools/w30/troy-shots.js [outdir=build/w30/troy] [--phone]
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2), out = args.find(a => !a.startsWith('--')) || 'build/w30/troy', phone = args.includes('--phone');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext(phone ? { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 } : { viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('PAGE:', m.text()); });
  page.on('pageerror', e => console.log('PAGE ERR:', String(e)));
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.MODES && window.__pipbo.MODES.timethief);
  if (phone) await page.evaluate(() => { try { enableTouch(); Pads.lastNonPad = 'touch'; setKind('touch'); } catch (e) { /* older builds */ } });
  // run a scripted pair: fn(ph, R, L, t) sets the roller's (R) and the lookout's (L) inputs each step until stop(ph, t)
  const run = (name, o) => page.evaluate(({ o }) => {
    const P = window.__pipbo, G = P.G, TT = P.MODES.timethief.test;
    G.manual = true; G.cpuOn = [false, false];
    TT.jump(2, { seed: 1 });
    const st = G.mst, ph = st.ph;
    if (o.x != null) { ph.h.x = o.x; ph.bestX = o.x; ph.cpX = o.x; ph.fw0 = o.x + 74; st.cam.x = o.x - 370; if (o.k != null) { ph.k = o.k; if (o.k === 1) ph.roller = 1 - ph.roller; } }
    const fn = new Function('ph', 'R', 'L', 't', 'st', o.fn), stop = new Function('ph', 't', 'st', 'return ' + o.stop);
    let t = 0, hit = -1;
    for (let i = 0; i < 120 * 60; i++) {
      const R = G.players[ph.roller].input, L = G.players[1 - ph.roller].input;
      for (const q of [R, L]) for (const k in q) q[k] = false;
      fn(ph, R, L, t, st);
      P.step(P.DT); t += P.DT;
      if (hit < 0 && stop(ph, t, st)) hit = t;
      if (hit >= 0 && t - hit >= (o.after || 0)) break;
    }
    return { t: Math.round(t * 10) / 10, x: Math.round(ph.h.x), stats: st.stats.troy, bumps: st.stats.bumps.concat(st.stats.team), help: st.stats.help };
  }, { o });
  const shots = [
    { name: 'caught-moved', fn: 'R.right = true; L.act = true;', stop: '!!ph.caught && ph.caught.kind === "moved"', after: 0.45 },
    { name: 'caught-push', fn: 'R.right = true; L.act = true;', stop: '!!ph.caught', after: 1.5 },
    { name: 'caught-seen', fn: 'R.right = ph.h.x < 420; L.act = true;', stop: '!!ph.caught && ph.caught.kind === "seen"', after: 0.5 },
    { name: 'dark-beam', fn: 'R.right = ph.h.x < 420; L.act = ph.h.x < 420;', stop: 'ph.lit && ph.light < 0.05', after: 0.3 },
    { name: 'ramp-back', x: 900, fn: 'R.right = true; L.act = ph.h.x < 1060;', stop: 'ph.kick != null', after: 0.25 },
    { name: 'gate-scrape', x: 2000, fn: 'R.right = true; L.act = true;', stop: 'st.stats.troy.scrapes > 0', after: 0.12 },
    { name: 'claw-tug', x: 2560, k: 1, fn: 'R.right = true; L.act = t % 3 > 1;', stop: '!!ph.claw && ph.claw.st === "tug"', after: 0.9 },
    { name: 'plank-clonk', x: 3200, k: 1, fn: 'R.right = true; L.act = true; if (ph.caught) ph.caught = null;', stop: 'st.stats.troy.clonks > 0', after: 1.3 },
    { name: 'patrol', x: 3630, k: 1, fn: 'R.right = !ph.patrol; L.act = !ph.patrol || ph.patrol.x - ph.h.x > 330;', stop: '!!ph.patrol && ph.patrol.x - ph.h.x < 340', after: 0 },
    { name: 'patrol-dark', x: 3630, k: 1, fn: 'R.right = !ph.patrol; L.act = !ph.patrol || ph.patrol.x - ph.h.x > 330;', stop: '!!ph.patrol && ph.patrol.state === "knock"', after: 0.5 },
  ];
  for (const s of shots) {
    const r = await run(s.name, s);
    await page.waitForTimeout(250);
    const file = path.join(out, 's-' + s.name + (phone ? '-phone' : '') + '.png');
    await page.locator('#game').screenshot({ path: file });
    console.log(s.name.padEnd(14), JSON.stringify(r), '->', file);
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(2); });
