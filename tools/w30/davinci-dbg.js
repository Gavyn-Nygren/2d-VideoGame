#!/usr/bin/env node
// 30-1 era 'davinci': screenshots of moments the bot pair never shows (bumps, gold help, a landing, tired wings, the
// dive), and a timing of the era's drawing.   node tools/w30/davinci-dbg.js [--phone]
// Writes build/w30/davinci/dbg-<name>.png and prints one line per scene.
//   crash     nobody steers: the machine flies level into the first storm cloud (the pop-back, feathers, the hint)
//   gold      the same twice more: "Gold wind!" and the gold arrows in the gap
//   landed    nobody flaps: the machine glides down and lands softly
//   tired     the flapper mashes: "Wings tired!", then "Gold beat!" (the gold dot)
//   birds     nobody toots and the steerer flies into the pigeons
//   dive      the computer pair up to the dive on the piazza
//   perf      ms per frame of the era's own drawing in each stretch
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const phone = process.argv.includes('--phone');
const out = path.resolve(__dirname, '..', '..', 'build', 'w30', 'davinci');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext(phone ? { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 } : { viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.MODES && window.__pipbo.MODES.timethief);
  if (phone) await page.evaluate(() => { try { enableTouch(); Pads.lastNonPad = 'touch'; setKind('touch'); } catch (e) { /* older builds */ } });
  // play with the computer pair until until(st) is true (or max s); filter(p, out) can spoil one player's presses
  const play = (o) => page.evaluate(o2 => {
    const P = window.__pipbo, G = P.G, TT = P.MODES.timethief.test;
    if (o2.fresh) { G.manual = true; G.cpuOn = [true, true]; TT.jump('davinci', { seed: 3 }); }
    const st = G.mst, ph = st.ph;
    const filt = o2.filter ? new Function('p', 'out', 'st', 'ph', 'G', o2.filter) : null;
    P.CPU.filter = filt ? (p, out) => filt(p, out, st, ph, G) : null;
    const until = new Function('st', 'ph', 'G', 'return ' + o2.until);
    let n = 0;
    while (n++ < o2.max * 120 && !until(st, ph, G) && G.mode === 'play' && !st.cut) { for (const p of G.players) if (!G.cpuOn[p.id]) for (const k in p.input) p.input[k] = false; P.step(P.DT); }
    for (let k = 0; k < (o2.after || 0) * 120; k++) P.step(P.DT);
    P.CPU.filter = null;
    return { t: +st.phT.toFixed(1), mode: ph.mode, stage: ph.stage, x: Math.round(ph.g.x), y: Math.round(ph.g.y), bumps: st.stats.team, help: st.stats.help.slice(-2), news: st.news && st.news.text, hints: st.hints.map(h => h && h.text) };
  }, o);
  const shot = async name => { await page.waitForTimeout(250); await page.locator('#game').screenshot({ path: path.join(out, 'dbg-' + name + (phone ? '-phone' : '') + '.png') }); };
  const noSteer = 'if (p.id !== ph.flap) return {}; return out;';
  let r = await play({ fresh: true, filter: noSteer, until: 'st.stats.team >= 1', max: 40, after: 0.25 });
  console.log('crash  ', JSON.stringify(r)); await shot('crash');
  r = await play({ filter: noSteer, until: 'st.stats.help.length >= 1', max: 40, after: 1.2 });
  console.log('gold   ', JSON.stringify(r)); await shot('gold');
  r = await play({ fresh: true, filter: 'if (p.id === ph.flap && ph.mode === "fly" && ph.g.x > 700) return {}; return out;', until: 'ph.g.landed && ph.mode === "fly"', max: 40, after: 1.0 });
  console.log('landed ', JSON.stringify(r)); await shot('landed');
  r = await play({ fresh: true, filter: 'if (p.id === ph.flap && ph.mode === "fly") return { act: "tap" }; return out;', until: 'ph.g.tired > 0', max: 40, after: 0.3 });
  console.log('tired  ', JSON.stringify(r)); await shot('tired');
  r = await play({ filter: 'if (p.id === ph.flap && ph.mode === "fly") return { act: "tap" }; return out;', until: 'ph.beatGold', max: 60, after: 2.2 });
  console.log('beat   ', JSON.stringify(r)); await shot('beat');
  r = await play({ fresh: true, filter: 'if (p.id !== ph.flap && ph.g.x > 4300 && ph.g.x < 5000) return { jump: ph.g.y > 200 }; return out;', until: 'st.stats.kinds.birds', max: 40, after: 0.2 });
  console.log('birds  ', JSON.stringify(r)); await shot('birds');
  r = await play({ fresh: true, until: 'ph.c.flocks[0].state === 1', max: 40, after: 0.5 });
  console.log('warn   ', JSON.stringify(r)); await shot('warn');
  r = await play({ fresh: true, until: 'ph.mode === "toPerch"', max: 60, after: 1.0 });
  console.log('landing', JSON.stringify(r)); await shot('landing');
  r = await play({ until: 'ph.mode === "perch" && ph.perch.t > 0.75', max: 60 });
  console.log('swap   ', JSON.stringify(r)); await shot('swap');
  r = await play({ fresh: true, until: 'ph.chase && ph.chase.phase === "dive"', max: 200, after: 0.9 });
  console.log('dive   ', JSON.stringify(r)); await shot('dive');
  // the era's own drawing, ms per frame, at a few places
  const perf = await page.evaluate(() => {
    const P = window.__pipbo, G = P.G, TT = P.MODES.timethief.test, K = TT.TTH_PHASES.davinci, res = [];
    G.manual = true; G.cpuOn = [true, true]; TT.jump('davinci', { seed: 3 });
    const st = G.mst;
    for (const t of [8, 30, 55, 68, 80, 100, 118]) {
      while (st.phT < t && G.mode === 'play' && !st.cut) P.step(P.DT);
      const t0 = performance.now();
      for (let k = 0; k < 200; k++) { ctx.save(); ctx.translate(-st.cam.x, 0); K.drawBack(st); K.draw(st); K.drawTop(st); ctx.restore(); K.hud(st); }
      res.push(t + ' s: ' + ((performance.now() - t0) / 200).toFixed(2) + ' ms');
    }
    return res;
  });
  console.log('perf   ', perf.join(', '));
  if (errs.length) console.log('PAGE ERRORS:\n' + errs.join('\n'));
  await browser.close();
})().catch(e => { console.error(e); process.exit(2); });
