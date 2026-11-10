#!/usr/bin/env node
// 1-player mode: how long the computer's cpuSay bubble is up at the same time as a core badge or a core hint over
// the same head (both are drawn over the computer's hero; the core's placer does not know the cpuSay bubble).
//   node tools/w30/int-clash.js [--human=0] [--phone]
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const ORDER = ['dino', 'henge', 'troy', 'olympics', 'vikings', 'davinci', 'wright', 'moon', 'finale', 'race'];
(async () => {
  const phone = args.includes('--phone'), human = +opt('human', 0);
  const browser = await chromium.launch();
  const ctx = await browser.newContext(phone ? { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 } : { viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.addInitScript(() => { const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; const r = gen(1); Math.random = () => r(); });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.MODES && window.__pipbo.MODES.timethief);
  if (phone) await page.evaluate(() => { enableTouch(); Pads.lastNonPad = 'touch'; setKind('touch'); });
  for (const era of ORDER) {
    const r = await page.evaluate(({ era, human }) => {
      const P = window.__pipbo, TT = P.MODES.timethief.test;
      G.manual = true; P.cpuSetCfg('players', 1); P.cpuSetCfg('human', human);
      TT.jump(TT.TTH_ORDER.indexOf(era), { seed: 1, intro: true });
      const hs = {}, brain = cpuBrainFor(G.level.def), c = 1 - human, st0 = G.mst;
      let t = 0, both = 0, withBadge = 0, withHint = 0; const ex = [];
      while (t < 60 && G.mode === 'play' && G.mst === st0 && !G.mst.cut) {
        const p = G.players[human]; cpuApply(p, G.introT <= 0 ? brain.think(hs, p, G.players[c], P.DT, cpuInfo(p)) || {} : {});
        P.step(P.DT); t += P.DT;
        const st = G.mst, b = CPU.bubbles[c], on = b && b.t > 0;
        if (!on) continue;
        const roles = st.badgeT > 0 && TTH_PHASES[era].roles && TTH_PHASES[era].roles(st), h = st.hints[c];
        if (roles && roles[c]) withBadge += P.DT;
        if (h) { withHint += P.DT; if (!ex.some(e => e[1] === b.text)) ex.push([Math.round(st.phT * 10) / 10, b.text, h.text]); }
        if ((roles && roles[c]) || h) both += P.DT;
      }
      return { era, clash: +both.toFixed(1), withBadge: +withBadge.toFixed(1), withHint: +withHint.toFixed(1), ex: ex.slice(0, 4) };
    }, { era, human });
    console.log(JSON.stringify(r));
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(2); });
