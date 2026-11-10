#!/usr/bin/env node
// Era 'wright' (The First Flight, 1903): how busy the two jobs are and how the time is spent, per flight, with the
// computer playing both (or one side clumsy). Prints per flight: seconds, the tilt (mean |tilt|, the biggest, the
// share of time past "level" and past the yellow mark), lean presses per second, climb / dive duty, pedal taps per
// second, the hottest the engine got, the height range, and the seconds spent in every mode.
//   node tools/w30/wright-trace.js [--seed=1] [--who=pair|noisy|kid] [--clumsy=0|1]
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  await page.addInitScript(() => {
    const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    let seeded = gen(1);
    window.__seed = n => { seeded = gen((n >>> 0) || 1); };
    Math.random = () => seeded();
  });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.MODES && window.__pipbo.MODES.timethief);
  const r = await page.evaluate(({ seed, who, clumsy }) => {
    const P = window.__pipbo, G = P.G, TT = P.MODES.timethief.test, DT = P.DT;
    window.__seed(seed * 7919); G.manual = true; G.cpuOn = [true, true];
    const nz = { pause: 0, next: 3 + Math.random() * 6, q: [], last: {} };
    P.CPU.filter = who === 'pair' ? null : (p, out, dt) => {
      if (p.id !== clumsy) return out;
      if (who === 'kid') { nz.q.push({ t: G.time + 0.5, out }); let o2 = null; while (nz.q.length && nz.q[0].t <= G.time) o2 = nz.q.shift().out; out = nz.last = o2 || nz.last; out = Object.assign({}, out); }
      if (nz.pause > 0) { nz.pause -= dt; return {}; }
      if ((nz.next -= dt) <= 0) { nz.pause = 1 + Math.random() * 3; nz.next = 4 + Math.random() * 8; }
      return out;
    };
    TT.jump(TT.TTH_ORDER.indexOf('wright'), {});
    const st = G.mst, K = TTHWRIGHT, rows = [], modes = {};
    const mk = () => ({ t: 0, n: 0, sum: 0, max: 0, lvl: 0, warn: 0, leanN: 0, leanT: 0, upT: 0, dnT: 0, taps: 0, heat: 0, y0: 1e9, y1: -1e9, minSpin: 1 });
    let cur = mk(), fl = 0, lastLean = 0, lastAct = false;
    for (let n = 0; n < 400 / DT && !st.cut; n++) {
      P.step(DT);
      const ph = st.ph;
      if (!ph.mode) break;
      modes[ph.mode] = (modes[ph.mode] || 0) + DT;
      if (ph.flight !== fl) { rows.push(Object.assign({ flight: fl + 1 }, cur)); cur = mk(); fl = ph.flight; }
      if (ph.mode !== 'fly') continue;
      const b = G.players[ph.bal].input, e = G.players[ph.eng].input, a = Math.abs(ph.tilt), lean = (b.right ? 1 : 0) - (b.left ? 1 : 0);
      cur.t += DT; cur.n++; cur.sum += a; cur.max = Math.max(cur.max, a); if (a > K.tilt.level) cur.lvl += DT; if (a > K.tilt.warn) cur.warn += DT;
      if (lean && lean !== lastLean) cur.leanN++; if (lean) cur.leanT += DT; lastLean = lean;
      if (e.jump || e.up) cur.upT += DT; if (e.down) cur.dnT += DT;
      if (e.act && !lastAct) cur.taps++; lastAct = e.act;
      cur.heat = Math.max(cur.heat, ph.heat); cur.y0 = Math.min(cur.y0, ph.y); cur.y1 = Math.max(cur.y1, ph.y); cur.minSpin = Math.min(cur.minSpin, ph.spin);
    }
    rows.push(Object.assign({ flight: fl + 1 }, cur));
    return { rows, modes, t: st.phT, stats: st.stats.wright, team: st.stats.team, kinds: st.stats.kinds, help: st.stats.help, ended: !!st.cut };
  }, { seed: +opt('seed', 1), who: opt('who', 'pair'), clumsy: +opt('clumsy', 0) });
  for (const q of r.rows) {
    const f = v => v.toFixed(2);
    console.log(`flight ${q.flight}: ${q.t.toFixed(1)} s flying | tilt mean ${f(q.sum / Math.max(1, q.n))} max ${f(q.max)} off-level ${(100 * q.lvl / Math.max(0.01, q.t)).toFixed(0)}% yellow ${(100 * q.warn / Math.max(0.01, q.t)).toFixed(0)}% | leans ${f(q.leanN / Math.max(0.01, q.t))}/s held ${(100 * q.leanT / Math.max(0.01, q.t)).toFixed(0)}% | climb ${(100 * q.upT / Math.max(0.01, q.t)).toFixed(0)}% dive ${(100 * q.dnT / Math.max(0.01, q.t)).toFixed(0)}% taps ${f(q.taps / Math.max(0.01, q.t))}/s | heat max ${f(q.heat)} min power ${f(q.minSpin)} | y ${q.y0 | 0}-${q.y1 | 0}`);
  }
  console.log('modes (s):', Object.entries(r.modes).map(([k, v]) => k + ' ' + v.toFixed(1)).join(', '));
  console.log('era', r.t.toFixed(1), 's, ended', r.ended, '| team bumps', r.team, JSON.stringify(r.kinds), '|', JSON.stringify(r.stats), '| help', r.help.length);
  if (errors.length) console.log('PAGE MESSAGES:\n' + errors.slice(0, 8).join('\n'));
  await browser.close();
})().catch(e => { console.error(e); process.exit(2); });
