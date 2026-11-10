#!/usr/bin/env node
// Per era: (1) memory growth: two "people" mash random keys for --min sim minutes (never idle, so hazards keep running)
// and the size of G.mst (every array element and object key, counted deep) is sampled; (2) the HUD's "draw the player
// again under the pills" pass: how often it draws a hero the era has hidden (st.hid is already cleared by drawTop).
//   node tools/w30/int-reg-grow.js [eras] [--min=20] [--who=mash|idle|pair]
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const ORDER = ['dino', 'henge', 'troy', 'olympics', 'vikings', 'davinci', 'wright', 'moon', 'finale', 'race'];
const eras = (args.find(a => !a.startsWith('--')) || 'all') === 'all' ? ORDER : args.find(a => !a.startsWith('--')).split(',');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.MODES && window.__pipbo.MODES.timethief);
  for (const era of eras) {
    const r = await page.evaluate(async ({ era, min, who }) => {
      const P = window.__pipbo, TT = P.MODES.timethief.test;
      G.manual = true; G.cpuOn = who === 'pair' ? [true, true] : [false, false];
      TT.jump(era, { seed: 3 });
      if (who === 'pair') { P.CPU.st = [{}, {}]; P.CPU.last = [{}, {}]; }
      const st = G.mst, phaseNo = st.phaseNo;
      const size = o => { const seen = new Set(); let n = 0; const big = {}; const walk = (v, key) => { if (!v || typeof v !== 'object' || seen.has(v) || v instanceof Element) return; seen.add(v); const ks = Array.isArray(v) ? v : Object.values(v); n += ks.length; if (Array.isArray(v) && v.length > 150 && key) big[key] = v.length; if (Array.isArray(v)) for (const x of v) walk(x, key); else for (const k of Object.keys(v)) walk(v[k], key ? key + '.' + k : k); }; walk(o, ''); return { n, big }; };
      let s = 12345; const rnd = () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
      // the ghost check
      let inHud = false, ghost = 0, ghostEx = null, frames = 0, hidFrames = 0, mask = [false, false];
      const dp = window.drawPlayer, hud0 = P.MODES.timethief.hud;
      window.drawPlayer = function (p) { if (inHud && p === G.players[p.id] && mask[p.id]) { ghost++; if (!ghostEx) ghostEx = { id: p.id, x: Math.round(p.x), y: Math.round(p.y), t: Math.round(st.phT) }; } return dp.apply(this, arguments); };
      P.MODES.timethief.hud = function () { inHud = true; try { return hud0.apply(this, arguments); } finally { inHud = false; } };
      const samples = [], hold = [{}, {}]; let t = 0, n = 0, ended = '';
      const steps = Math.round(min * 60 / P.DT);
      for (; n < steps; n++) {
        if (who === 'mash') for (const p of G.players) {
          const h = hold[p.id];
          if (!(h.t > 0)) { h.t = 0.15 + rnd() * 0.6; h.l = rnd() < 0.35; h.r = !h.l && rnd() < 0.55; h.j = rnd() < 0.35; h.d = rnd() < 0.15; h.a = rnd() < 0.4; }
          h.t -= P.DT;
          const i = p.input; i.left = h.l; i.right = h.r; i.down = h.d;
          if (h.j && !i.jump) p.pendingJump = true; i.jump = h.j;
          if (h.a && !i.act) { p.pendingAct = true; p.actAge = 0; } i.act = h.a;
        }
        P.step(P.DT); t += P.DT;
        if (G.mode !== 'play' || G.mst.phaseNo !== phaseNo || (G.mst.cut && G.mst.cut.kind === 'end')) { ended = G.mode !== 'play' ? G.mode : 'era done'; break; }
        if (n % 20 === 0) { const h = TT.TTH_PHASES[st.phase].hide, m = h ? h.call(TT.TTH_PHASES[st.phase], st) : false; mask = Array.isArray(m) ? [!!m[0], !!m[1]] : [!!m, !!m]; frames++; if (mask[0] || mask[1]) hidFrames++; render(0); }
        if (n % Math.round(60 / P.DT) === 0 && [0, 1, 2, 5, 10, 15, 20, 30].includes(Math.round(t / 60))) { const z = size(st); samples.push({ min: Math.round(t / 60), n: z.n, big: z.big, parts: G.particles.length, bumps: st.stats.bumps.join('+') + '+' + st.stats.team, help: st.stats.help.length, json: JSON.stringify(st.stats).length }); }
        if (n % 3000 === 0) await new Promise(r => setTimeout(r, 0));
      }
      window.drawPlayer = dp; P.MODES.timethief.hud = hud0;
      return { t: Math.round(t), ended, samples, ghost, ghostEx, frames, hidFrames };
    }, { era, min: +opt('min', 20), who: opt('who', 'mash') });
    console.log(era.padEnd(9), 'ran ' + r.t + 's' + (r.ended ? ' (' + r.ended + ')' : ''), '| ghost draws ' + r.ghost + '/' + r.frames + ' frames (hidden in ' + r.hidFrames + ')', r.ghostEx ? JSON.stringify(r.ghostEx) : '');
    for (const s of r.samples) console.log('   ', (s.min + 'min').padEnd(6), 'st size ' + String(s.n).padEnd(7), 'particles ' + String(s.parts).padEnd(5), 'bumps ' + s.bumps.padEnd(10), 'help ' + String(s.help).padEnd(4), 'stats json ' + s.json, Object.keys(s.big).length ? 'big arrays: ' + JSON.stringify(s.big) : '');
    if (errors.length) { console.log('    ERRORS: ' + [...new Set(errors)].join(' | ')); errors.length = 0; }
  }
  await browser.close();
})();
