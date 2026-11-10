#!/usr/bin/env node
// Looks review: per era, shots at several times on one device + a small-text audit (canvas text under 11 CSS px).
//   node tools/w30/int-look-shots.js <desktop|phone|small> [eras,comma] [times,comma] [--solo=0|1] [--tag=x]
'use strict';
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const args = process.argv.slice(2), pos = args.filter(a => !a.startsWith('--'));
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const ORDER = ['dino', 'henge', 'troy', 'olympics', 'vikings', 'davinci', 'wright', 'moon', 'finale', 'race'];
const dev = pos[0] || 'desktop', eras = (pos[1] && pos[1] !== 'all' ? pos[1].split(',') : ORDER), times = (pos[2] || '1.5,15,45,80,120').split(',').map(Number);
const solo = opt('solo', ''), tag = opt('tag', '');
const OUT = path.resolve(__dirname, '..', '..', 'build', 'w30', 'int', 'look');
const VP = { desktop: { viewport: { width: 1280, height: 800 } }, phone: { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: false, deviceScaleFactor: 2 },
  small: { viewport: { width: 667, height: 375 }, hasTouch: true, isMobile: false, deviceScaleFactor: 2 } }[dev];
(async () => {
  const browser = await chromium.launch();
  for (const phase of eras) {
    const ctx = await browser.newContext(VP);
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    if (args.includes('--idle')) await page.addInitScript(() => { window.__IDLE__ = true; });
    await page.addInitScript(() => {
      const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
      let seeded = gen(1); const other = gen(12345);
      window.__inStep = false; Math.random = () => (window.__inStep ? seeded() : other());
      window.__small = {}; window.__idle = location.hash === "#idle" || !!window.__IDLE__;
      const P = CanvasRenderingContext2D.prototype;
      for (const fn of ['fillText']) { const o = P[fn]; P[fn] = function (t, x, y, mw) {
        try { if (this.canvas && this.canvas.id === 'game' && this.globalAlpha > 0.35) { const m = this.getTransform(), sy = Math.hypot(m.c, m.d), r = this.canvas.getBoundingClientRect();
          const px = parseFloat((/(\d+(\.\d+)?)px/.exec(this.font) || [0, 0])[1]) * sy * r.height / this.canvas.height;
          const k = String(t); if (px < 11 && k.trim()) { const e = window.__small[k]; if (!e || px < e) window.__small[k] = Math.round(px * 10) / 10; } } } catch (e) {}
        return o.apply(this, arguments); }; }
    });
    await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
    await page.waitForFunction(() => window.__pipbo && window.__pipbo.MODES && window.__pipbo.MODES.timethief);
    if (dev !== 'desktop') await page.evaluate(() => { try { enableTouch(); Pads.lastNonPad = 'touch'; setKind('touch'); } catch (e) {} });
    await page.evaluate(({ phase, solo }) => {
      const P = window.__pipbo, G = P.G, TT = P.MODES.timethief.test;
      G.manual = true;
      if (solo !== '') { P.cpuSetCfg('players', 1); P.cpuSetCfg('human', +solo); } else G.cpuOn = [true, true];
      TT.jump(TT.TTH_ORDER.indexOf(phase), {});
      G.cpuOn = [true, true];
      if (window.__idle) G.cpuOn = [false, false];
      window.__simT = 0;
    }, { phase, solo });
    const files = [];
    for (const t of times) {
      const r = await page.evaluate(({ t }) => {
        const P = window.__pipbo, G = P.G;
        const n = Math.max(0, Math.round((t - window.__simT) / P.DT));
        window.__inStep = true; for (let j = 0; j < n && G.mode === 'play'; j++) P.step(P.DT); window.__inStep = false; window.__simT = t;
        const st = G.mst; return { t, mode: G.mode, phase: st.phase, phT: Math.round(st.phT), cut: st.cut && st.cut.kind, scale: +stageScale.toFixed(3) };
      }, { t });
      await page.waitForTimeout(250);
      const f = path.join(OUT, phase + '-' + dev + tag + '-' + t + '.png');
      if (dev === 'desktop') await page.locator('#game').screenshot({ path: f }); else await page.screenshot({ path: f });
      files.push(f);
      console.log(phase, JSON.stringify(r));
    }
    const small = await page.evaluate(() => window.__small);
    const ents = Object.entries(small).sort((a, b) => a[1] - b[1]);
    if (ents.length) console.log('  SMALL TEXT (' + dev + ') ' + phase + ': ' + ents.slice(0, 40).map(([k, v]) => v + 'px "' + k.slice(0, 40) + '"').join(' | '));
    if (errs.length) console.log('  ERRORS: ' + errs.slice(0, 5).join(' ; '));
    // contact sheets
    const per = dev === 'desktop' ? 6 : dev === 'phone' ? 2 : 4, cols = dev === 'desktop' ? 3 : dev === 'small' ? 2 : 1, w = dev === 'desktop' ? 640 : VP.viewport.width;
    const sp = await (await browser.newContext({ deviceScaleFactor: dev === 'desktop' ? 1 : 2 })).newPage();
    for (let i = 0, k = 1; i < files.length; i += per, k++) {
      const part = files.slice(i, i + per);
      await sp.setViewportSize({ width: w * cols, height: 100 });
      await sp.setContent('<body style="margin:0;background:#000;font-size:0">' + part.map(f => '<img src="data:image/png;base64,' + fs.readFileSync(f).toString('base64') + '" style="width:' + w + 'px;display:inline-block">').join('') + '</body>');
      await sp.waitForTimeout(100);
      await sp.screenshot({ path: path.join(OUT, 'S-' + phase + '-' + dev + tag + '-' + k + '.png'), fullPage: true });
    }
    await ctx.close();
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(2); });
