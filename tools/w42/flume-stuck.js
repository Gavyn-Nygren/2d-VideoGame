#!/usr/bin/env node
// 42-2 Log Flume Plunge: stuck tests. One seat is a scripted person doing it wrong (not the computer's brain), the
// other is the computer partner. Every script must reach the end (or a fair Sinking loop the gold help eases) without
// the log being pinned on a bank for more than 2 s, spun more than a full turn, or locked.
// Usage: node tools/w42/flume-stuck.js [--who=<script>|all] [--seat=0|1|both] [--from=<s>] [--to=<s>] [--max=400]
//   never    presses nothing             nonstop  strokes as fast as the game takes them
//   drag     only ever drags              nobrace  strokes now and then, never holds on
//   brace    holds on all the time        mash     random buttons every tenth of a second
//   hard     always steers for the right-hand (harder) side
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const all = ['never', 'nonstop', 'drag', 'nobrace', 'brace', 'mash', 'hard'];
const whos = opt('who', 'all') === 'all' ? all : opt('who').split(',');
const seats = opt('seat', 'both') === 'both' ? [0, 1] : [+opt('seat')];
const maxT = +opt('max', 400), from = opt('from', null), to = opt('to', null);
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.addInitScript(() => {
    const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    let seeded = gen(1); const other = gen(12345);
    window.__inStep = false; window.__seed = n => { seeded = gen((n >>> 0) || 1); };
    Math.random = () => (window.__inStep ? seeded() : other());
  });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  let bad = 0;
  for (const who of whos) for (const seat of seats) {
    errors.length = 0;
    const r = await page.evaluate(async ({ who, seat, maxT, from, to }) => {
      const P = window.__pipbo, G = P.G, K3D = P.K3D;
      const i = P.LEVELS.findIndex(l => l.mode === 'parkflume');
      window.__seed(4242);
      G.manual = true; K3D.noRender = true;
      P.CPU.errs.clear(); P.CPU.skillOf = [null, null]; P.CPU.filter = null;
      G.cpuOn = seat === 0 ? [false, true] : [true, false];
      delete G.results[i];
      P.loadLevel(i); window.__sinks = []; window.__sinkSeen = false;
      const st0 = G.mst;
      if (from != null) { st0.phase = 'ride'; st0.started = true; st0.s = st0.prevS = st0.restart = +from; st0.x = 0; }
      let rng = 99; const rnd = () => { rng = (rng * 16807) % 2147483647; return rng / 2147483647; };
      const person = G.players[seat], end = to != null ? +to : 1e9;
      let n = 0, scrape = 0, worstScrape = 0, pin = 0, worstPin = 0, spin = 0, worstSpin = 0, lastPsi = 0, mash = {}, lastS = 0, stall = 0, worstStall = 0;
      const steps = Math.round(maxT / P.DT);
      while (n < steps && G.mode === 'play') {
        for (let k = 0; k < 600 && n < steps && G.mode === 'play'; k++, n++) {
          const s = G.mst, inp = person.input;
          for (const key in inp) inp[key] = false;
          if (who === 'nonstop') { if (n % 2 === 0) person.pendingAct = true; inp.act = n % 2 === 0; }
          else if (who === 'drag') inp.down = true;
          else if (who === 'nobrace') { if (n % 50 === 0 && rnd() < 0.6) { person.pendingAct = true; inp.act = true; } }
          else if (who === 'brace') inp.jump = true;
          else if (who === 'mash') { if (n % 6 === 0) mash = { left: rnd() < 0.3, right: rnd() < 0.3, down: rnd() < 0.3, jump: rnd() < 0.3, act: rnd() < 0.4 }; Object.assign(inp, mash); if (mash.act && n % 6 === 0) person.pendingAct = true; if (mash.jump && n % 6 === 0) person.pendingJump = true; }
          else if (who === 'hard') {
            // steer for the right-hand side: Pip strokes to turn right, Bo drags to turn right
            const want = s.x < 6 && s.psi < 0.5;
            if (want) { if (seat === 0) { if (n % 40 === 0) { person.pendingAct = true; inp.act = true; } } else inp.down = true; }
          }
          window.__inStep = true; P.step(P.DT); window.__inStep = false;
          if (s.phase === 'sink' && !window.__sinkSeen) { window.__sinkSeen = true; (window.__sinks = window.__sinks || []).push(Math.round(s.s) + '/' + s.lastWhy); } else if (s.phase !== 'sink') window.__sinkSeen = false;
          if (s.phase === 'ride') {
            // pinned: held against a bank and not carried on (nearly stopped: under a third of the current's speed; scraping along a bank with the current is not pinned)
            scrape = s.bank[0] ? scrape + P.DT : 0; worstScrape = Math.max(worstScrape, scrape);
            pin = s.bank[0] && s.vs < 0.34 * PARKFLUME_ROUTE.R.at(s.s).v ? pin + P.DT : 0; if (pin > worstPin) { worstPin = pin; window.__pinAt = `s=${s.s.toFixed(1)} x=${s.x.toFixed(2)} psi=${s.psi.toFixed(2)} vs=${s.vs.toFixed(2)} u=${s.u.toFixed(2)} w=${PARKFLUME_ROUTE.w(s.s).toFixed(1)}`; }
            const d = s.psi - lastPsi; spin = (Math.sign(d) === Math.sign(spin) || !spin) ? spin + d : d; worstSpin = Math.max(worstSpin, Math.abs(spin)); lastPsi = s.psi;
            stall = s.s - lastS < 0.002 && !s.whirl ? stall + P.DT : 0; if (stall > worstStall) { worstStall = stall; window.__stallAt = `s=${s.s.toFixed(1)} x=${s.x.toFixed(2)} t=${s.t.toFixed(1)}`; } lastS = s.s;
          }
          if (s.s >= end) { n = steps; break; }
        }
        await new Promise(r => setTimeout(r, 0));
      }
      const s = G.mst;
      return { simT: +(n * P.DT).toFixed(1), phase: s.phase, s: +s.s.toFixed(1), done: !!G.results[i] || s.s >= end, ducks: s.ducks, soaks: s.soaks, sinks: s.sinkings, gold: s.goldN, bumps: s.bumps,
        pin: +worstPin.toFixed(2), scrape: +worstScrape.toFixed(1), spin: +worstSpin.toFixed(2), stall: +worstStall.toFixed(2), cpuErrs: [...P.CPU.errs], pinAt: window.__pinAt, stallAt: window.__stallAt, sinks: window.__sinks || [] };
    }, { who, seat, maxT, from, to });
    const fails = [];
    if (!r.done) fails.push('did not get there');
    if (r.pin > 2) fails.push('pinned ' + r.pin + 's');
    if (r.spin > Math.PI * 2) fails.push('spun ' + r.spin);
    if (r.sinks.length > 2) console.log('    sank at ' + r.sinks.join(' '));
    if (r.stall > 2) fails.push('stalled ' + r.stall + 's at ' + r.stallAt);
    if (r.cpuErrs.length || errors.length) fails.push('errors');
    if (fails.length) bad++;
    console.log(`${fails.length ? 'FAIL' : 'ok  '} ${who.padEnd(8)} as ${['Pip', 'Bo '][seat]}: ${r.done ? 'through' : r.phase + ' s=' + r.s} in ${r.simT}s  ducks ${r.ducks}  soaks ${r.soaks}  sinkings ${r.sinks}  bumps ${r.bumps}  pin ${r.pin}s (along a bank ${r.scrape}s)  spin ${r.spin}${fails.length ? '  <- ' + fails.join(', ') + (r.pin > 2 ? ' at ' + r.pinAt : '') : ''}${r.cpuErrs.length ? '\n  CPU ERR ' + r.cpuErrs : ''}${errors.length ? '\n  PAGE ERR ' + errors.slice(0, 2).join(' | ').slice(0, 400) : ''}`);
  }
  await browser.close();
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
