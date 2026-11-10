#!/usr/bin/env node
// Era 'moon': one bot run with a flight log (same players as tools/w30/play.js: pair, noisy, kid, idle).
//   node tools/w30/moon-trace.js [--who=pair|noisy|kid|idle] [--clumsy=0|1] [--seed=1 | --seeds=2,3] [--every=2] [--max=600]
// One line every --every s: time, mode, stretch, pilot, lander x / y / speeds, ready tank, pods, cells in view, and
// every bump / gold help as it happens.
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
    let seeded = gen(1); const other = gen(12345);
    window.__inStep = false;
    window.__seed = n => { seeded = gen((n >>> 0) || 1); };
    Math.random = () => (window.__inStep ? seeded() : other());
  });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.MODES && window.__pipbo.MODES.timethief);
  // (--seeds=2,3 plays seed 2 first in the same page, as play.js does, and logs the last one)
  const seeds = opt('seeds', opt('seed', '1')).split(',').map(Number);
  let r;
  for (const seed of seeds) r = await page.evaluate(async ({ who, maxT, seed, clumsy, every }) => {
    const P = window.__pipbo, G = P.G, TT = P.MODES.timethief.test;
    window.__seed(seed * 7919); window.__inStep = true;
    G.manual = true; P.CPU.skillOf = [null, null]; P.CPU.errs.clear();
    const idleId = clumsy ? 1 : 0;
    G.cpuOn = who === 'idle' ? [idleId !== 0, idleId !== 1] : [true, true];
    const nz = { pause: 0, next: 3 + Math.random() * 6, wander: 0, wdir: 0, wnext: 6 + Math.random() * 8, q: [] };
    P.CPU.filter = (who !== 'noisy' && who !== 'kid') ? null : (p, out, dt) => {
      if (p.id !== clumsy) return out;
      if (who === 'kid') {
        nz.q.push({ t: G.time + 0.5, out }); let o2 = {};
        while (nz.q.length && nz.q[0].t <= G.time) o2 = nz.q.shift().out;
        if (nz.q.length > 200) nz.q.shift();
        out = nz.last = (Object.keys(o2).length ? o2 : nz.last) || {};
        out = Object.assign({}, out);
      }
      if (nz.pause > 0) { nz.pause -= dt; return {}; }
      nz.next -= dt;
      if (nz.next <= 0) { nz.pause = 1 + Math.random() * 3; nz.next = 4 + Math.random() * 8; }
      nz.wnext -= dt;
      if (nz.wnext <= 0) { nz.wander = 0.4 + Math.random() * 1; nz.wdir = Math.random() < 0.5 ? -1 : 1; nz.wnext = 6 + Math.random() * 10; }
      if (nz.wander > 0) { nz.wander -= dt; return { left: nz.wdir < 0, right: nz.wdir > 0 }; }
      if (Math.random() < 0.15 * dt) out.jump = true;
      if (Math.random() < 0.1 * dt) out.act = true;
      return out;
    };
    TT.jump(7, { intro: false });
    const st = G.mst, ph = st.ph, lines = [], n1 = Math.round(maxT / P.DT), ev = Math.round(every / P.DT);
    let team = 0, help = 0, burnT = 0, dryT = 0;
    for (let n = 0; n < n1 && !st.cut && G.mst === st; n++) {
      if (n % 600 === 0 && n) await new Promise(r2 => setTimeout(r2, 0));   // (as play.js does: the same random numbers)
      window.__inStep = true;
      if (who === 'idle') for (const key in G.players[idleId].input) G.players[idleId].input[key] = false;
      P.step(P.DT);
      window.__inStep = false;
      const L = ph.L, F = ph.F;
      if (ph.mode === 'fly') { if (L.burn > 0.5) burnT += P.DT; if (F.ready <= 0) dryT += P.DT; }
      if (st.stats.team !== team) { team = st.stats.team; lines.push(`   ${st.phT.toFixed(1)}s BUMP ${st.pops.length ? st.pops[st.pops.length - 1].text : ''} ${JSON.stringify(st.stats.kinds)} y=${Math.round(L.y)} vy=${Math.round(L.vy)} vx=${Math.round(L.vx)}`); }
      if (st.stats.help.length !== help) { help = st.stats.help.length; lines.push(`   ${st.phT.toFixed(1)}s GOLD ${st.stats.help[help - 1]}`); }
      if (n % ev === 0) lines.push(`${st.phT.toFixed(1).padStart(6)}s ${ph.mode} s${ph.stretch} pilot ${ph.pilot} x ${Math.round(L.x)} y ${Math.round(L.y)} vx ${Math.round(L.vx)} vy ${Math.round(L.vy)} ready ${F.ready.toFixed(1)} pods ${F.pod[0].toFixed(1)}/${F.pod[1].toFixed(1)} cells ${ph.cells.filter(c => !c.got).length}${ph.cells.some(c => c.gold) ? 'G' : ''} arm ${ph.arm.a.toFixed(2)} burnT ${burnT.toFixed(1)} emptyT ${dryT.toFixed(1)}${st.idle ? ' IDLE' : ''} in ${G.players.map(q => ['left', 'right', 'jump', 'act'].filter(k => q.input[k]).map(k => k[0]).join('') || '-').join(' ')} rest ${L.rest ? 1 : 0}`);
    }
    return { lines, ended: !!st.cut, t: st.phT, own: st.stats.moon, cpuErrs: [...P.CPU.errs] };
  }, { who: opt('who', 'pair'), maxT: +opt('max', 600), seed, clumsy: +opt('clumsy', 0), every: +opt('every', 2) });
  console.log(r.lines.join('\n'));
  console.log(r.ended ? 'ENDED' : 'NOT ENDED', r.t.toFixed(1) + 's', JSON.stringify(r.own), r.cpuErrs.join(','));
  if (errors.length) console.log('PAGE MESSAGES:\n' + [...new Set(errors)].slice(0, 10).join('\n'));
  await browser.close();
})().catch(e => { console.error(e); process.exit(2); });
