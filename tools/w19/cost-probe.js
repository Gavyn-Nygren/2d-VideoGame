#!/usr/bin/env node
// Where does a level's frame time go? Loads one level at sim t seconds, then times render() (median of 41) with
// named global drawing helpers swapped for no-ops one at a time, so the art passes can see what each piece costs.
// Usage: node tools/w19/cost-probe.js <code> <helper,helper,...> [--t=8] [--off=<helper,...>] [--root=<repo folder>]
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const [code, list] = args.filter(a => !a.startsWith('--'));
const root = path.resolve(opt('root', path.join(__dirname, '..', '..'))), at = +opt('t', 8);
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 760 } });
  await p.goto('file://' + path.join(root, 'index.html'));
  await p.waitForFunction(() => window.__pipbo && document.fonts.status === 'loaded');
  const res = await p.evaluate(async ({ code, names, at, offs }) => {
    const P = window.__pipbo, G = P.G, i = P.LEVELS.findIndex((l, k) => P.levelCode(k) === code);
    document.getElementById('overlay').classList.add('hidden'); G.manual = true; G.cpuOn = [true, true]; P.loadLevel(i); G.introT = 0;
    const n = Math.round(at / P.DT); for (let k = 0; k < n && G.mode === 'play'; k++) P.step(P.DT);
    const c = document.getElementById('game').getContext('2d');
    const time = () => { for (let k = 0; k < 6; k++) { render(1 / 60); c.getImageData(0, 0, 1, 1); } const ts = []; for (let k = 0; k < 41; k++) { const t0 = performance.now(); render(1 / 60); c.getImageData(0, 0, 1, 1); ts.push(performance.now() - t0); } ts.sort((a, b) => a - b); return ts[20]; };
    const out = [['all on', time()]];
    for (const nm of names) {
      const orig = window[nm] !== undefined ? window[nm] : (0, eval)(nm);
      if (typeof orig !== 'function') { out.push([nm + ' (not a function)', 0]); continue; }
      // (a no-op that also works as a see-through fill style for the pattern getters)
      (0, eval)(nm + ' = function () { return "rgba(0,0,0,0)"; }');
      out.push([nm + ' off', time()]);
      window.__probeOrig = orig; (0, eval)(nm + ' = window.__probeOrig');
    }
    out.push(['all on again', time()]);
    // then the time spent inside each named helper per frame (wrapped with a timer; --off helpers stay switched off)
    for (const nm of offs) (0, eval)(nm + ' = function () { return "rgba(0,0,0,0)"; }');
    for (const nm of names) {
      const orig = (0, eval)(nm); if (typeof orig !== 'function') continue;
      let acc = 0; window.__probeWrap = function () { c.getImageData(0, 0, 1, 1); const t0 = performance.now(); const r = orig.apply(this, arguments); c.getImageData(0, 0, 1, 1); acc += performance.now() - t0; return r; };
      (0, eval)(nm + ' = window.__probeWrap');
      for (let k = 0; k < 6; k++) render(1 / 60);
      acc = 0; for (let k = 0; k < 40; k++) render(1 / 60);
      out.push([nm + ' inside (ms/frame)', acc / 40]);
      window.__probeOrig = orig; (0, eval)(nm + ' = window.__probeOrig');
    }
    return out;
  }, { code, names: (list || '').split(',').filter(Boolean), at, offs: opt('off', '').split(',').filter(Boolean) });
  for (const [k, v] of res) console.log(k.padEnd(28), v.toFixed(2));
  await b.close();
})();
