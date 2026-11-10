#!/usr/bin/env node
// Bot runs for 30-1 The Time Thief, one era at a time: the computer plays in headless Chromium and the script reports
// how each era ended (time, bumps, gold help). Needs Playwright and Chromium.
//
//   node tools/w30/play.js <phase[,phase]|all> [--who=pair|noisy|idle|kid] [--seeds=1,2,3] [--max=600] [--trace=5]
//                                               [--clumsy=0|1] [--skills=easy,hard] [--json]
//   phase: dino henge troy olympics vikings davinci wright moon finale race (or 0-9), or all
//   --who=pair   the computer plays both (default): the era must end (the portal cutscene starts)
//   --who=noisy  the computer plays both, but one (Pip; --clumsy=1 for Bo) is clumsy like a distracted person: stops
//                for 1-4 s now and then, goes the wrong way for a moment, presses jump / the action for no reason.
//                The era must still end.
//   --who=kid    like noisy, and the clumsy one also reacts 0.5 s late to everything (a young kid).
//   --who=idle   the computer plays Bo and Pip presses nothing (--clumsy=1: the other way round): the era must NOT
//                end, and nothing may move on by itself (a team era never clears alone).
//   --skills     a skill per player for the race (Pip,Bo), e.g. --skills=easy,hard
//   --max        simulated seconds before giving up (default 600)        --trace=S  print both players every S s
// One line per run: phase, seed, how it ended, the era's time, bumps [pip, bo] + team, gold help, page errors.
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const flag = k => args.includes('--' + k);
const ORDER = ['dino', 'henge', 'troy', 'olympics', 'vikings', 'davinci', 'wright', 'moon', 'finale', 'race'];
const what = args.find(a => !a.startsWith('--')) || 'all';
const phases = what === 'all' ? ORDER : what.split(',').map(s => (/^\d+$/.test(s) ? ORDER[+s] : s)).filter(s => ORDER.includes(s));
const who = opt('who', 'pair'), maxT = +opt('max', 600), seeds = opt('seeds', '1').split(',').map(Number), clumsy = +opt('clumsy', 0), trace = +opt('trace', 0);
const skills = opt('skills', '') ? opt('skills', '').split(',') : null;

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
  const results = [];
  let bad = 0;
  for (const phase of phases) for (const seed of seeds) {
    errors.length = 0;
    const t0 = Date.now();
    const r = await page.evaluate(async ({ phase, who, maxT, seed, clumsy, trace, skills }) => {
      const P = window.__pipbo, G = P.G, TT = P.MODES.timethief.test;
      window.__seed(seed * 7919); window.__inStep = true;
      G.manual = true;
      P.CPU.skillOf = skills ? skills.slice() : [null, null];
      P.CPU.errs.clear();
      const idleId = clumsy ? 1 : 0;
      G.cpuOn = who === 'idle' ? [idleId !== 0, idleId !== 1] : [true, true];
      const nz = { pause: 0, next: 3 + Math.random() * 6, wander: 0, wdir: 0, wnext: 6 + Math.random() * 8, q: [] };
      P.CPU.filter = (who !== 'noisy' && who !== 'kid') ? null : (p, out, dt) => {
        if (p.id !== clumsy) return out;
        if (who === 'kid') {   // everything 0.5 s late
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
      const k = TT.TTH_ORDER.indexOf(phase);
      TT.jump(k, { intro: false });
      const st = G.mst, steps = Math.round(maxT / P.DT), lines = [], every = trace ? Math.max(1, Math.round(trace / P.DT)) : 0;
      const where = q => `${Math.round(q.x + q.w / 2 + st.cam.x)},${Math.round(q.y + q.h + st.cam.y)}`;
      let n = 0, ended = '', endT = 0;
      const human = G.players[idleId];
      while (n < steps && !ended) {
        for (let j = 0; j < 600 && n < steps && !ended; j++, n++) {
          window.__inStep = true;
          if (who === 'idle') for (const key in human.input) human.input[key] = false;
          P.step(P.DT);
          window.__inStep = false;
          if (every && n % every === 0) lines.push(`${(n * P.DT).toFixed(1)}s  Pip ${where(G.players[0])}  Bo ${where(G.players[1])}  cam ${Math.round(st.cam.x)},${Math.round(st.cam.y)}  ${TT.TTH_PHASES[phase].hudText ? TT.TTH_PHASES[phase].hudText(st) || '' : ''}  ${(() => { const ph = st.ph, g = ph.g, ch = ph.chase; return `mode ${ph.mode} st ${ph.stage} flap ${ph.flap} x ${Math.round(g.x - ph.c.X[Math.min(2, ph.stage)])} y ${Math.round(g.y)} v ${Math.round(g.v)} land ${g.landed ? 1 : 0} en ${g.en.toFixed(2)}` + (ch ? ` chase ${ch.phase} m ${ch.m.toFixed(2)} in ${ch.in ? 1 : 0} gap ${Math.round(st.thief.x - g.x)} ty ${Math.round(st.thief.y)} zip ${ch.zip} lead ${ch.lead}` : ""); })()}  ${P.CPU.bubbles.map(b => (b && b.t > 0 ? '"' + b.text + '"' : '')).join(' ')}`);
          if (G.mst !== st) { ended = 'restarted'; break; }
          if (G.mode !== 'play') { ended = 'cleared'; break; }
          if (st.cut) { ended = st.cut.kind === 'end' ? 'ending' : 'portal'; endT = st.phT; break; }
          if (st.phase !== phase) { ended = 'next'; break; }
        }
        await new Promise(r2 => setTimeout(r2, 0));
      }
      const s = st.stats;
      return { ended, t: Math.round((endT || st.phT) * 10) / 10, sim: Math.round(n * P.DT), bumps: s.bumps.slice(), team: s.team, help: s.help.slice(), kinds: s.kinds, own: s[phase],
        stub: TT.stub(phase), idle: !!st.idle, cpuErrs: [...P.CPU.errs], hud: TT.TTH_PHASES[phase].hudText ? TT.TTH_PHASES[phase].hudText(st) : '', trace: lines };
    }, { phase, who, maxT, seed, clumsy, trace, skills });
    r.phase = phase; r.seed = seed; r.errors = errors.slice(0, 6); r.wall = Math.round((Date.now() - t0) / 100) / 10;
    results.push(r);
    const ok = who === 'idle' ? !r.ended : !!r.ended;
    if (!ok || r.errors.length || r.cpuErrs.length) bad++;
    if (!flag('json')) {
      if (r.trace.length) console.log(r.trace.join('\n'));
      console.log(`${phase.padEnd(9)} s${seed} ${who.padEnd(5)} ${(r.ended || 'NOT ENDED').padEnd(9)} ${String(r.t).padStart(6)}s  bumps ${r.bumps.join('+')} team ${r.team}  help ${r.help.length}${r.stub ? '  (STUB)' : ''}  [${r.hud || ''}]  ${ok ? 'ok' : 'FAIL'}${r.cpuErrs.length ? ' CPU ERR ' + r.cpuErrs.join(',') : ''}${r.errors.length ? ' PAGE ERR ' + r.errors.join(' | ').slice(0, 400) : ''}  (wall ${r.wall}s)`);
    }
  }
  if (flag('json')) console.log(JSON.stringify(results, null, 1));
  else if (results.length > 1) {
    for (const ph of phases) { const rs = results.filter(r => r.phase === ph && r.ended); if (rs.length) console.log(`--- ${ph}: ${rs.length}/${seeds.length} ended, time ${Math.min(...rs.map(r => r.t))}-${Math.max(...rs.map(r => r.t))}s, bumps avg ${(rs.reduce((a, r) => a + r.bumps[0] + r.bumps[1] + r.team, 0) / rs.length).toFixed(1)}`); }
  }
  await browser.close();
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
