#!/usr/bin/env node
// Debug helper for era 'henge': the computer pair (or one clumsy / idle side) plays, and the script prints a state
// line every few seconds (stone, block, logs, the Thief's mode, both players' spots and presses), or one expression.
//   node tools/w30/henge-dbg.js [--secs=60] [--every=2] [--from=0] [--seed=1] [--who=pair|idle0|idle1|kid0|kid1|noisy0|noisy1] [--expr="js using P, G, st, ph"]
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.MODES && window.__pipbo.MODES.timethief);
  const r = await page.evaluate(({ secs, every, from, seed, who, expr }) => {
    const P = window.__pipbo, G = P.G, TT = P.MODES.timethief.test;
    G.manual = true; G.cpuOn = who === 'idle0' ? [false, true] : who === 'idle1' ? [true, false] : [true, true];
    // kid0 / kid1 / noisy0 / noisy1: the same clumsy filter as tools/w30/play.js (its own seeded random numbers)
    const m = /^(kid|noisy)([01])$/.exec(who);
    if (m) {
      let rs = (seed * 7919) >>> 0 || 1; const rnd = () => { rs ^= rs << 13; rs >>>= 0; rs ^= rs >> 17; rs ^= rs << 5; rs >>>= 0; return rs / 4294967296; };
      const kid = m[1] === 'kid', clumsy = +m[2], nz = { pause: 0, next: 3 + rnd() * 6, wander: 0, wdir: 0, wnext: 6 + rnd() * 8, q: [] };
      P.CPU.filter = (p, out, dt) => {
        if (p.id !== clumsy) return out;
        if (kid) { nz.q.push({ t: G.time + 0.5, out }); let o2 = {}; while (nz.q.length && nz.q[0].t <= G.time) o2 = nz.q.shift().out; if (nz.q.length > 200) nz.q.shift(); out = nz.last = (Object.keys(o2).length ? o2 : nz.last) || {}; out = Object.assign({}, out); }
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
    TT.jump(1, { seed });
    const st = G.mst, lines = [];
    const r1 = v => Math.round(v * 10) / 10, quiet = every > 900;
    let last = '';
    for (let i = 0; i < secs * 120 && !st.cut; i++) {
      P.step(P.DT);
      const ph = st.ph, S = ph.stone;
      const key = JSON.stringify(st.stats.henge.legT) + st.stats.henge.thuds + st.stats.henge.yoinks + st.stats.henge.whacks + "m" + ph.miss.wait + st.stats.team + st.stats.help.length, ev = key !== last && i > 0 && !quiet;
      last = key;
      if (ev || (i % Math.round(every * 120) === 0 && i / 120 >= from)) {
        const inp = p => ['left', 'right', 'jump', 'act'].filter(k => p.input[k]).map(k => k[0]).join('') || '-';
        lines.push(`${ev ? '*' : ' '}${(i / 120).toFixed(1)}s leg${ph.leg} S ${Math.round(S.x)} v${r1(S.v)} g${S.grade} blk:${S.block || '-'} left${Math.round(S.left)} run${S.run ? 1 : 0} | logs ${ph.logs.map(l => l.s[0] + Math.round(l.x - S.x)).join(' ')} | th ${ph.th.mode}/${ph.th.sub} ${ph.lasso ? 'lasso m' + r1(ph.lasso.m) : ''} | ` +
          G.players.map(p => `${p.id === ph.pusher ? 'PUSH' : 'ROLL'} ${Math.round(p.x + p.w / 2 + st.cam.x - S.x)},${Math.round(p.y + p.h + st.cam.y)} ${inp(p)}${ph.P[p.id].log ? ' L' : ''}${ph.P[p.id].on ? ' on' : ''}`).join(' | ') + ` | miss ${ph.miss.wait} wT${r1(S.waitT)} fin ${ph.fin.stage} ${r1(ph.fin.lift)} bumps ${st.stats.team} help ${st.stats.help.length}` + (ev ? ' ' + JSON.stringify(st.stats.henge).replace(/"/g, '') : ''));
      }
    }
    const ph = st.ph;
    let ex = null;
    if (expr) { try { ex = JSON.stringify(eval(expr)); } catch (e) { ex = 'ERR ' + e.stack; } }
    return { lines, ex, t: st.phT, cut: st.cut && st.cut.kind, stats: st.stats.henge, help: st.stats.help, kinds: st.stats.kinds, cpuErrs: [...P.CPU.errs] };
  }, { secs: +opt('secs', 60), every: +opt('every', 2), from: +opt('from', 0), seed: +opt('seed', 1), who: opt('who', 'pair'), expr: opt('expr', '') });
  console.log(r.lines.join('\n'));
  if (r.ex != null) console.log(r.ex);
  console.log(JSON.stringify({ t: r.t, cut: r.cut, stats: r.stats, help: r.help, kinds: r.kinds, cpuErrs: r.cpuErrs }));
  if (errs.length) console.log('PAGE MESSAGES:\n' + [...new Set(errs)].slice(0, 12).join('\n'));
  await browser.close();
})().catch(e => { console.error(e); process.exit(2); });
