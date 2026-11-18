#!/usr/bin/env node
// 41-4 Paper Alien Invasion: bot runs with drawing switched off (K3D.noRender), in headless Chromium.
//   node tools/w41/popaliens-play.js [--only=pair,clumsy0,...] [--secs=700] [--ck=N] (start from bookmark N, with a
//   grenade each, the clock at the time a steady pair would have there)
// Each run starts the level with two computer heroes; a person-like partner is a filter on one hero's presses
// (CPU.filter). Every run must reach the results card (or, for the clock, a fair rescue loop) without an error,
// a stuck hero or a locked camera. Prints time left, Wipe-outs, peels, crossed kills and how far the march got.
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };

// person-like partners: (p, out, dt) -> out, applied to hero `who`
const RUNS = {
  pair: null,
  clumsy0: { who: 0, f: 'clumsy' }, clumsy1: { who: 1, f: 'clumsy' },
  slow0: { who: 0, f: 'slow' }, slow1: { who: 1, f: 'slow' },
  noshoot: { who: 1, f: 'noshoot' },
  nomove: { who: 1, f: 'nomove', loop: true },        // a person who never walks holds the march: a fair rescue loop
  noreload: { who: 0, f: 'noreload' },
  nogrenade: { who: 0, f: 'nogrenade' },
  allgrenades: { who: 1, f: 'allgrenades' },
  nopeel: { who: 1, f: 'nopeel' },
  runahead: { who: 0, f: 'runahead', loop: true },   // a person pressing up into a wall of print forever holds the march: a fair rescue loop
  hangback: { who: 1, f: 'hangback', loop: true },
  mash: { who: 0, f: 'mash', loop: true },            // random presses walk nowhere on average: the march waits for them
};

function pageRun({ run, secs, ck }) {
  const P = window.__pipbo, G = P.G, CPU = window.CPU || P.CPU;
  P.K3D.noRender = true;
  const i = P.LEVELS.findIndex(l => l.mode === 'popaliens');
  G.cpuOn = [true, true];
  P.loadLevel(i); G.introT = 0;
  const st = G.mst;
  if (ck) { st.phase = 'march'; st.marchT = 0; st.ck = ck; st.saved = { i: ck, gren: [1, 1], walkerPhase: 0 }; PA_ROUTE.events.forEach((ev, j) => { if (ev.block && ev.at > PA_ROUTE.checks[ck].cz) st.wallDown[j] = true; }); st.clock = Math.max(150, 600 - ck * 26); paRestore(st, 'wipe'); st.wipes = 0; }
  let mem = { t: 0, q: [] };
  const R = Math.random; let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const filters = {
    clumsy(p, o, dt) { if (rnd() < 0.25) { o.ax = (o.ax || 0) + (rnd() - 0.5); o.ay = (o.ay || 0) + (rnd() - 0.5); } if (rnd() < 0.15) o.act = false; return o; },
    slow(p, o, dt) { mem.q.push(Object.assign({}, o)); if (mem.q.length > 60) return mem.q.shift(); return {}; },
    noshoot(p, o) { o.act = false; return o; },
    nomove(p, o) { o.ax = o.ay = 0; o.left = o.right = o.up = o.down = false; return o; },
    noreload(p, o) { o.act3 = false; return o; },
    nogrenade(p, o) { o.act2 = false; return o; },
    allgrenades(p, o) { o.act2 = 'tap'; return o; },
    nopeel(p, o) { if (st.h[1 - p.id].flat) o.act3 = false; return o; },
    runahead(p, o) { o.ax = 0; o.ay = -1; return o; },
    hangback(p, o) { o.ax = 0; o.ay = 1; return o; },
    mash(p, o) { o.act = rnd() < 0.5; o.act2 = rnd() < 0.1 ? 'tap' : false; o.act3 = rnd() < 0.1 ? 'tap' : false; o.jump = rnd() < 0.1; o.ax = rnd() * 2 - 1; o.ay = rnd() * 2 - 1; return o; },
  };
  CPU.filter = run ? (p, o, dt) => (p.id === run.who ? filters[run.f](p, o, dt) : o) : null;
  const n = Math.round(secs / P.DT);
  let k = 0, stuckT = 0, lastCz = st.cz, maxStill = 0, err = null;
  try {
    for (; k < n; k++) {
      if (G.mode !== 'play') break;
      P.step(P.DT);
      if (st.cz < lastCz - 0.01 || st.block || (st.walker && st.walker.state !== 'gone') || st.hatch) { lastCz = st.cz; stuckT = 0; } else stuckT += P.DT;
      maxStill = Math.max(maxStill, stuckT);
    }
  } catch (e) { err = String(e.stack || e); }
  CPU.filter = null;
  return { mode: G.mode, phase: st.phase, t: +(k * P.DT).toFixed(1), clock: +st.clock.toFixed(1), cz: +st.cz.toFixed(1), wipes: st.wipes, rescues: st.rescues,
    ck: st.ck, walker: st.walker ? st.walker.phase + ':' + st.walker.state + ':' + st.walker.total.toFixed(1) : null, hatch: st.hatch ? +st.hatch.fill.toFixed(2) : null, kills: st.kills, cross: st.crossKills, peels: st.peels, selfPeels: st.selfPeels, thrown: st.thrown, maxStill: +maxStill.toFixed(1), err };
}

(async () => {
  const only = opt('only', '') ? opt('only', '').split(',') : Object.keys(RUNS);
  const secs = +opt('secs', 700);
  const browser = await chromium.launch();
  let fails = 0;
  for (const name of only) {
    const page = await browser.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
    await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
    await page.evaluate(() => { window.__pipbo.G.manual = true; });
    const r = await page.evaluate(pageRun, { run: RUNS[name], secs, ck: +opt('ck', 0) });
    const loop = RUNS[name] && RUNS[name].loop;
    const ok = !r.err && !errs.length && (loop ? r.rescues >= 1 : (r.mode !== 'play' || r.phase === 'done') && r.maxStill < 60);
    if (!ok) fails++;
    console.log((ok ? 'ok   ' : 'FAIL ') + name.padEnd(12) + JSON.stringify(r) + (errs.length ? '\n     errors: ' + errs.slice(0, 3).join(' | ') : ''));
    await page.close();
  }
  await browser.close();
  console.log(fails ? fails + ' FAILED' : 'all ok');
  process.exit(fails ? 1 : 0);
})();
