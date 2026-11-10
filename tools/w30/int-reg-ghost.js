#!/usr/bin/env node
// The HUD's "player under the pills: draw again see-through" pass (tthHud) checks st.hid, but tthDrawTop has already
// cleared st.hid in the same frame, so in an era that hides the heroes (hide() true) the engine's standing hero is drawn
// at 75% over the era's own drawing whenever p is up in the top-left corner. This plays davinci with two key mashers
// until it happens, and saves a picture: build/w30/int/reg-ghost.png (and reg-ghost-fixed.png with st.hid kept).
'use strict';
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.MODES && window.__pipbo.MODES.timethief);
  const r = await page.evaluate(async () => {
    const P = window.__pipbo, TT = P.MODES.timethief.test;
    G.manual = true; G.cpuOn = [false, false];
    TT.jump('davinci', { seed: 3 });
    const st = G.mst;
    let s = 12345; const rnd = () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    const hold = [{}, {}];
    for (let n = 0; n < 20 * 60 * 120; n++) {
      for (const p of G.players) {
        const h = hold[p.id];
        if (!(h.t > 0)) { h.t = 0.15 + rnd() * 0.6; h.l = rnd() < 0.35; h.r = !h.l && rnd() < 0.55; h.j = rnd() < 0.35; h.d = rnd() < 0.15; h.a = rnd() < 0.4; }
        h.t -= P.DT;
        const i = p.input; i.left = h.l; i.right = h.r; i.down = h.d;
        if (h.j && !i.jump) p.pendingJump = true; i.jump = h.j;
        if (h.a && !i.act) { p.pendingAct = true; p.actAge = 0; } i.act = h.a;
      }
      P.step(P.DT);
      if (G.mst.phase !== 'davinci' || G.mst.cut) return { none: true };
      const hit = G.players.filter(p => p.alive && p.y - 8 <= 80 && p.x < 294);
      if (hit.length && st.phT > 5) { G.mode = 'paused'; return { t: Math.round(st.phT * 10) / 10, ps: G.players.map(p => ({ x: Math.round(p.x), y: Math.round(p.y) })) }; }
      if (n % 3000 === 0) await new Promise(r => setTimeout(r, 0));
    }
    return { none: true };
  });
  console.log(JSON.stringify(r));
  if (!r.none) {
    await page.evaluate(() => { document.getElementById('overlay').hidden = true; });
    await page.waitForTimeout(200);
    const cv = page.locator('canvas').first(), bb = await cv.boundingBox(), k = bb.width / 960;
    const clip = { x: bb.x, y: bb.y, width: 420 * k, height: 220 * k };
    await page.screenshot({ path: path.resolve(__dirname, '..', '..', 'build/w30/int/reg-ghost.png'), clip });
    // the same frame with st.hid kept until the HUD has run (the proposed fix, patched in at run time only)
    await page.evaluate(() => {
      const hud0 = MODES.timethief.hud, top0 = MODES.timethief.drawTop;
      MODES.timethief.drawTop = function () { const st = G.mst, keep = st.hid; top0.apply(this, arguments); st.hidHud = keep; };
      MODES.timethief.hud = function () { const st = G.mst; st.hid = st.hidHud; try { return hud0.apply(this, arguments); } finally { st.hid = null; } };
    });
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.resolve(__dirname, '..', '..', 'build/w30/int/reg-ghost-fixed.png'), clip });
  }
  await browser.close();
})();
