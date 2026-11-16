#!/usr/bin/env node
// Frame cost of the art: for each level, the median time of render() (JS + the canvas flush) and live frames a second
// with the computer at both seats, on a CPU slowed 4x (like a phone), with a software-drawn canvas (headless Chromium).
// Usage: node tools/polish/perf.js <repo folder> [levels, e.g. 1-4,6-1,13-2] [--throttle=4] [--secs=3]
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2), opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const [root, sel] = args.filter(a => !a.startsWith('--'));
const throttle = +opt('throttle', 4), secs = +opt('secs', 3);
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 760 } });
  await p.goto('file://' + path.resolve(root, 'index.html'));
  await p.waitForFunction(() => window.__pipbo && document.fonts.status === 'loaded');
  const cdp = await p.context().newCDPSession(p);
  const codes = (sel || '1-4').split(',');
  for (const code of codes) {
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    const ok = await p.evaluate(code => {
      const P = window.__pipbo, G = P.G, i = P.LEVELS.findIndex((l, k) => P.levelCode(k) === code);
      if (i < 0) return false;
      document.getElementById('overlay').classList.add('hidden'); G.cpuOn = [true, true]; G.manual = false; P.loadLevel(i); G.introT = 0; return true;
    }, code);
    if (!ok) { console.log(code, 'not found'); continue; }
    await p.waitForTimeout(1500);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle });
    const r = await p.evaluate(async secs => {
      // render() time including the flush (a 1-pixel read forces the canvas to draw)
      const ts = [];
      for (let k = 0; k < 30; k++) { const t0 = performance.now(); render(1 / 60); ctx.getImageData(0, 0, 1, 1); ts.push(performance.now() - t0); }
      ts.sort((a, b) => a - b);
      // live frames a second
      let n = 0, stop = false; const loop = () => { if (stop) return; n++; requestAnimationFrame(loop); }; requestAnimationFrame(loop);
      await new Promise(r => setTimeout(r, secs * 1000)); stop = true;
      return { render: ts[15], fps: n / secs };
    }, secs);
    console.log(code.padEnd(6), 'render', r.render.toFixed(1).padStart(5), 'ms   fps', r.fps.toFixed(0).padStart(3));
  }
  await b.close();
})();
