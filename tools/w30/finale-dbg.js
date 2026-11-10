#!/usr/bin/env node
// Debug helper for the finale era: runs the computer pair for some seconds and prints the era's state (and any
// expression) every so often.   node tools/w30/finale-dbg.js [seconds=20] [every=1] [--expr="js"] [--seed=1] [--who=pair|idle0|idle1] [--kid=0|1 (that player presses 0.5 s late)] [--from=S]
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2), pos = args.filter(a => !a.startsWith('--'));
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.MODES && window.__pipbo.MODES.timethief);
  const out = await page.evaluate(({ secs, every, expr, seed, who, kid, from, noise, pops }) => {
    const P = window.__pipbo, G = P.G, TT = P.MODES.timethief.test;
    G.manual = true; G.cpuOn = who === 'idle0' ? [false, true] : who === 'idle1' ? [true, false] : [true, true];
    if (kid >= 0) {   // (the same clumsy kid as tools/w30/play.js --who=kid; --noise=0: only the 0.5 s delay)
      let sd = (seed * 7919) >>> 0 || 1; const rnd = () => { sd ^= sd << 13; sd >>>= 0; sd ^= sd >> 17; sd ^= sd << 5; sd >>>= 0; return sd / 4294967296; };
      const nz = { pause: 0, next: 3 + rnd() * 6, wander: 0, wdir: 0, wnext: 6 + rnd() * 8, q: [], last: {} };
      P.CPU.filter = (p, out, dt) => {
        if (p.id !== kid) return out;
        nz.q.push({ t: G.time + 0.5, out }); let o2 = {};
        while (nz.q.length && nz.q[0].t <= G.time) o2 = nz.q.shift().out;
        out = nz.last = (Object.keys(o2).length ? o2 : nz.last) || {};
        out = Object.assign({}, out);
        if (!noise) return out;
        if (nz.pause > 0) { nz.pause -= dt; return {}; }
        nz.next -= dt;
        if (nz.next <= 0) { nz.pause = 1 + rnd() * 3; nz.next = 4 + rnd() * 8; }
        nz.wnext -= dt;
        if (nz.wnext <= 0) { nz.wander = 0.4 + rnd() * 1; nz.wdir = rnd() < 0.5 ? -1 : 1; nz.wnext = 6 + rnd() * 10; }
        if (nz.wander > 0) { nz.wander -= dt; return { left: nz.wdir < 0, right: nz.wdir > 0 }; }
        if (rnd() < 0.15 * dt) out.jump = true;
        if (rnd() < 0.1 * dt) out.act = true;
        return out;
      };
    } else P.CPU.filter = null;
    TT.jump(8, { seed, intro: false });
    // (--brain: also print what each brain asked for this step: its keys, its jump plan, its guessed finger lag)
    const B0 = typeof TTH_BRAINS !== 'undefined' ? TTH_BRAINS.finale : null, seen = [null, null];
    if (B0 && !B0.__dbg) { const th = B0.think; B0.__dbg = true; B0.think = function (bst, p) { const o = th.apply(this, arguments); window.__fb[p.id] = Object.keys(o).filter(k => o[k]).join('+') + (bst.plan ? ' PLAN' + bst.plan.t.toFixed(2) + (bst.plan.hatch ? 'h' : '') : '') + ' lag' + (bst.lag || 0).toFixed(2); return o; }; }
    window.__fb = seen;
    // (--pops=1: only list the pop words, with the time and what each player stands on)
    const popLog = [];
    if (pops && !window.__popWrapped) { window.__popWrapped = true; const tp0 = window.tthPop; window.tthPop = function (s2, x, y, word) { const ph2 = G.mst.ph; popLog.push(G.mst.phT.toFixed(1) + ' k' + ph2.k + ' ' + word + '  [' + G.players.map(q => { const on = ph2.P[q.id].on; return on ? (on.el ? on.el.id : on.kind) : 'air'; }).join(',') + '] grip ' + ph2.grip.toFixed(2) + (ph2.braking ? ' B' : '')); return tp0.apply(this, arguments); }; }
    const st = G.mst, lines = [], n = Math.round(secs / P.DT), ev = Math.round(every / P.DT);
    const f = expr ? new Function('P', 'G', 'st', 'ph', 'return (' + expr + ')') : null;
    for (let i = 0; i < n && !st.cut; i++) {
      P.step(P.DT);
      if (i % ev === 0 && i * P.DT >= from) {
        const ph = st.ph, ps = G.players;
        lines.push((i * P.DT).toFixed(2) + ' ' + ph.stage + ' k' + ph.k + ' hold' + ph.holder + ' grip ' + ph.grip.toFixed(2) + (ph.braking ? ' BRAKE' : '') + (ph.slip ? ' slip' : '') + ' hand ' + ph.hand.k.toFixed(2)
          + ' | ' + ps.map(p => Math.round(p.x + 11) + ',' + Math.round(-(p.y + st.cam.y + 26) - ph.k * 0) + (p.grounded ? 'g' : 'a') + ':' + (ph.P[p.id].on ? (ph.P[p.id].on.el ? ph.P[p.id].on.el.id : ph.P[p.id].on.kind) : '-') + ' in ' + ['left', 'right', 'jump', 'act'].filter(k => p.input[k]).join('+')).join(' | ')
          + (window.__fb[0] != null ? '  B[' + window.__fb.join(' | ') + ']' : '') + (f ? ' :: ' + JSON.stringify(f(P, G, st, ph)) : ''));
      }
    }
    return { lines: pops ? popLog : lines, stats: st.stats, cut: st.cut && st.cut.kind, phT: st.phT, cpuErrs: [...P.CPU.errs] };
  }, { secs: +(pos[0] || 20), every: +(pos[1] || 1), expr: opt('expr', ''), seed: +opt('seed', 1), who: opt('who', 'pair'), kid: +opt('kid', -1), from: +opt('from', 0), noise: +opt('noise', 1), pops: +opt('pops', 0) });
  console.log(out.lines.join('\n'));
  console.log(JSON.stringify(out.stats), out.cut, out.phT, out.cpuErrs);
  if (errs.length) console.log('PAGE MESSAGES:\n' + errs.slice(0, 10).join('\n'));
  await browser.close();
})().catch(e => { console.error(e); process.exit(2); });
