#!/usr/bin/env node
// Screenshots of 35-1 Moonwick Academy: jumps to an class, lets the computer (or nobody) play for some seconds, saves a PNG.
//   node tools/w35/shot.js <phase|0-9> <seconds[,seconds...]> <out.png> [--who=pair|idle|right] [--phone] [--solo=0|1]
//                          [--seed=1] [--intro] [--pause] [--full] [--eval="js run in the page before the shot"]
//   seconds: one or sevclassl times (2,10,45): sevclassl write out-1.png, out-2.png ... from the same run
//   --who=pair (default) the computer plays both; idle: nobody presses anything; right: both hold right
//   --phone   an 844x390 landscape phone with touch (the bigger HUD); default is 1280x800 desktop
//   --solo=0|1  1-player mode: the person plays Pip (0) or Bo (1) and presses nothing; the computer plays the other
//   --intro   keep the class card (take a shot at 1 s to see it)      --pause  show the pause card in the shot
//   --crop=x,y,w,h  a 3x close-up of that part of the game (game pixels)
//   --at=g3|r1  exam only: start at that flood gate (0-7) or Great Hall round (0-2)
//   --full    screenshot the whole page (touch pads, legend) instead of only the game canvas
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2), pos = args.filter(a => !a.startsWith('--'));
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const flag = k => args.includes('--' + k);
const ORDER = ['broom', 'lift', 'cauldron', 'glow', 'morph', 'size', 'frostflame', 'shield', 'portal', 'beast', 'exam', 'duel'];
(async () => {
  const [ph, secs, out] = pos;
  const phase = /^\d+$/.test(ph) ? ORDER[+ph] : ph, times = String(secs || '2').split(',').map(Number);
  const phone = flag('phone'), who = opt('who', 'pair'), solo = opt('solo', ''), seed = +opt('seed', 1);
  const browser = await chromium.launch();
  // no isMobile: the page has no viewport meta of its own, so mobile emulation would lay it out 980 px wide and every text
  // would look 16% bigger than on a real 844x390 phone (the published page gets a device-width layout)
  const ctx = await browser.newContext(phone ? { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: false, deviceScaleFactor: 2 } : { viewport: { width: 1280, height: 800 }, deviceScaleFactor: opt('crop', '') ? 3 : 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));
  await page.addInitScript(() => {
    const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    let seeded = gen(1); const other = gen(12345);
    window.__inStep = false; window.__seed = n => { seeded = gen((n >>> 0) || 1); };
    Math.random = () => (window.__inStep ? seeded() : other());
  });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.MODES && window.__pipbo.MODES.wizschool);
  if (phone) await page.evaluate(() => { try { enableTouch(); Pads.lastNonPad = 'touch'; setKind('touch'); } catch (e) { /* older builds */ } });
  await page.evaluate(({ phase, who, solo, seed, intro, at }) => {
    const P = window.__pipbo, G = P.G, TT = P.MODES.wizschool.test;
    window.__seed(seed * 7919);
    G.manual = true;
    if (solo !== '') { P.cpuSetCfg('players', 1); P.cpuSetCfg('human', +solo); }
    else G.cpuOn = who === 'pair' ? [true, true] : [false, false];
    TT.jump(TT.WIZ_ORDER.indexOf(phase), { intro });
    if (at && phase === 'exam') TT.examAt(at);
    if (solo === '' ) G.cpuOn = who === 'pair' ? [true, true] : [false, false];
    window.__simT = 0;
  }, { phase, who, solo, seed, intro: flag('intro'), at: opt('at', '') });
  let k = 0;
  for (const t of times) {
    const r = await page.evaluate(({ t, who }) => {
      const P = window.__pipbo, G = P.G;
      const n = Math.max(0, Math.round((t - window.__simT) / P.DT));
      window.__inStep = true;
      for (let j = 0; j < n && G.mode === 'play'; j++) {
        if (who === 'right') for (const p of G.players) p.input.right = true;
        P.step(P.DT);
      }
      window.__inStep = false; window.__simT = t;
      const st = G.mst;
      return { t, mode: G.mode, phase: st.phase, phT: Math.round(st.phT * 10) / 10, cut: st.cut && st.cut.kind, cam: [Math.round(st.cam.x), Math.round(st.cam.y)],
        ps: G.players.map(p => [Math.round(p.x), Math.round(p.y), p.alive]), oops: st.stats.oops.concat(st.stats.team), idle: !!st.idle };
    }, { t, who });
    if (flag('pause')) await page.evaluate(() => window.__pipbo.pause());
    const ev = opt('eval', '');
    if (ev) await page.evaluate(ev);
    await page.waitForTimeout(350);
    if (phone && !k) { const lay = await page.evaluate(() => [innerWidth, innerHeight]); if (lay[0] !== 844) console.log('WARNING: phone layout is ' + lay.join('x') + ', not 844x390'); }
    const file = times.length > 1 ? out.replace(/\.png$/, '-' + (++k) + '.png') : out;
    if (out) { if (flag('full')) await page.screenshot({ path: file }); else if (opt('crop', '')) {
      // --crop=x,y,w,h in game pixels (960x540): a close-up at 3x
      const [cx, cy, cw, ch] = opt('crop', '').split(',').map(Number), bb = await page.locator('#game').boundingBox(), k = bb.width / 960;
      await page.screenshot({ path: file, clip: { x: bb.x + cx * k, y: bb.y + cy * k, width: cw * k, height: ch * k } });
    } else await page.locator('#game').screenshot({ path: file }); }
    console.log(JSON.stringify(r) + (out ? '  -> ' + file : ''));
  }
  if (errs.length) console.log('PAGE MESSAGES:\n' + errs.slice(0, 10).join('\n'));
  await browser.close();
})().catch(e => { console.error(e); process.exit(2); });
