#!/usr/bin/env node
// 42-2 Log Flume Plunge: ride the level with computer riders (drawing off: K3D.noRender) and report how it went.
// Usage: node tools/w42/flume-play.js [--who=pair|noisy|kid|clumsy] [--slow=0|1] [--from=<s>] [--to=<s>] [--max=600]
//        [--seeds=1,2] [--trace=2]
//   pair    the computer rides both seats
//   noisy   one seat (--slow, default Pip) is a distracted person: stops pressing now and then
//   kid     one seat is the computer a whole second late on every press
//   clumsy  one seat is the computer half a second late, misses a stroke in four and sometimes strokes for nothing
// --from puts the log at that place (an arch: a stretch's start), --to stops when the log gets there.
// Prints ducks, Soaks (and why), Sinkings, bank bumps, the worst spin and pin, the medal, and the computer's zigzags.
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const who = opt('who', 'pair'), maxT = +opt('max', 600), seeds = opt('seeds', '1').split(',').map(Number);
const slow = +opt('slow', 0), trace = +opt('trace', 0), from = opt('from', null), to = opt('to', null);
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  await page.addInitScript(() => {
    const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    let seeded = gen(1); const other = gen(12345);
    window.__inStep = false; window.__seed = n => { seeded = gen((n >>> 0) || 1); };
    Math.random = () => (window.__inStep ? seeded() : other());
  });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  for (const seed of seeds) {
    errors.length = 0;
    const r = await page.evaluate(async ({ who, maxT, seed, slow, trace, from, to }) => {
      const P = window.__pipbo, G = P.G, K3D = P.K3D; window.__zlog = [];
      const i = P.LEVELS.findIndex(l => l.mode === 'parkflume');
      window.__seed(seed * 7919);
      G.manual = true; K3D.noRender = true;
      P.CPU.errs.clear(); P.CPU.skillOf = [null, null];
      G.cpuOn = [true, true];
      const nz = { pause: 0, next: 3 + Math.random() * 6 }, late = [], lag = who === 'kid' ? 60 : 30;
      // the computer's own turn changes per second (zigzag check): a stroke after a drag or a drag after a stroke
      const zz = { last: [0, 0], at: [[], []], worst: 0, dr: [false, false], sa: [-9, -9], pend: [null, null] };
      P.CPU.filter = (p, out, dt) => {
        if (p.id !== slow) return out;
        if (who === 'noisy') {
          if (nz.pause > 0) { nz.pause -= dt; return {}; }
          if ((nz.next -= dt) <= 0) { nz.pause = 0.5 + Math.random() * 1.5; nz.next = 5 + Math.random() * 8; }
          return out;
        }
        if (who === 'kid' || who === 'clumsy') {
          let o = Object.assign({}, out);
          if (who === 'clumsy') { if (o.act && Math.random() < 0.25) o.act = false; if (!o.act && Math.random() < 0.004) o.act = 'tap'; }
          late.push(o); return late.length > lag ? late.shift() : {};
        }
        return out;
      };
      delete G.results[i];
      P.loadLevel(i);
      const st0 = G.mst;
      if (from != null) { st0.phase = 'ride'; st0.started = true; st0.s = st0.prevS = st0.restart = +from; st0.x = 0; }
      const steps = Math.round(maxT / P.DT), every = trace ? Math.round(trace / P.DT) : 0, lines = [], whys = [];
      const xAt = {}; let n = 0, lastSoak = 0, scrape = 0, worstScrape = 0, pin = 0, worstPin = 0, worstSpin = 0, spin = 0, lastPsi = 0;
      while (n < steps && G.mode === 'play') {
        for (let k = 0; k < 600 && n < steps && G.mode === 'play'; k++, n++) {
          window.__inStep = true;
          P.step(P.DT);
          window.__inStep = false;
          const s = G.mst;
          if (s.soaks > lastSoak) { lastSoak = s.soaks; whys.push(s.lastWhy + '@' + Math.round(s.s)); }
          if (s.phase === 'ride') {
            // the computer's turns (zigzag check): a drag taken up turns toward its side, an unpaired stroke away
            for (const k of [0, 1]) {
              const sd = k === 0 ? -1 : 1, turn = d => {
                const z = zz.at[k]; if (zz.last[k] && d !== zz.last[k] && (who === 'pair' || k !== slow)) { z.push(s.t); window.__zlog.push(`${k}:${d}@${s.t.toFixed(2)} s=${s.s.toFixed(0)}`); while (z.length && s.t - z[0] > 1) z.shift(); zz.worst = Math.max(zz.worst, z.length); }
                zz.last[k] = d;
              };
              if (s.drag[k] && !zz.dr[k]) turn(sd);
              zz.dr[k] = s.drag[k];
              if (s.strokeAt[k] !== zz.sa[k]) { zz.sa[k] = s.strokeAt[k]; zz.pend[k] = s.t; }
              if (zz.pend[k] != null && s.t - zz.pend[k] > 0.3) { if (!s.paired[k] || s.strokeAt[k] !== zz.sa[k]) turn(-sd); zz.pend[k] = null; }
            }
            xAt[Math.round(s.s)] = s.x.toFixed(1);
            // pinned: held against a bank and not carried on (nearly stopped: under a third of the current's speed; scraping along a bank with the current is not pinned)
            scrape = s.bank[0] ? scrape + P.DT : 0; worstScrape = Math.max(worstScrape, scrape);
            pin = s.bank[0] && s.vs < 0.34 * PARKFLUME_ROUTE.R.at(s.s).v ? pin + P.DT : 0; worstPin = Math.max(worstPin, pin);
            // a spin: the heading's total change in one direction (it is capped near 60 degrees, so this stays small)
            const d = s.psi - lastPsi; spin = Math.sign(d) === Math.sign(spin) || !spin ? spin + d : d; worstSpin = Math.max(worstSpin, Math.abs(spin)); lastPsi = s.psi;
          }
          if (every && n % every === 0) lines.push(`${(n * P.DT).toFixed(1)}s ${s.phase} s=${s.s.toFixed(1)} x=${s.x.toFixed(2)} psi=${s.psi.toFixed(2)} vs=${s.vs.toFixed(2)} u=${s.u.toFixed(2)} spd=${s.speed.toFixed(2)} ducks ${s.ducks} soaks ${s.soaks} water ${s.water} ${P.CPU.bubbles.map(b => (b && b.t > 0 ? '"' + b.text + '"' : '')).join(' ')}`);
          if (to != null && s.s >= +to) { n = steps; break; }
        }
        await new Promise(r => setTimeout(r, 0));
      }
      const s = G.mst, res = G.results[i];
      // ducks there were to take in the part ridden
      const a = from != null ? +from : 0, b = to != null ? +to : 1e9;
      let avail = 0; PARKFLUME_ROUTE.lists.ducks.forEach(d => { if (d.s >= a && d.s <= b) avail += d.big ? PARKFLUME.S.BIG_DUCKS : 1; });
      return { mode: G.mode, simT: +(n * P.DT).toFixed(1), phase: s.phase, s: s.s, cleared: !!res, medal: res && res.medal && res.medal.tier,
        ducks: s.ducks, avail, soaks: s.soaks, sinks: s.sinkings, bumps: s.bumps, pairs: s.pairs, laps: s.laps, gold: s.goldN,
        missed: PARKFLUME_ROUTE.lists.ducks.map((d, k) => (s.got[k] || d.s < a || d.s > Math.min(b, s.s) ? '' : `${d.s.toFixed(0)}:${d.x.toFixed(1)}${d.big ? 'B' : ''}/${xAt[Math.round(d.s)]}`)).filter(Boolean), zlog: window.__zlog, worstPin: +worstPin.toFixed(2), scrape: +worstScrape.toFixed(1), worstSpin: +worstSpin.toFixed(2), zig: zz.worst, whys, cpuErrs: [...P.CPU.errs], trace: lines };
    }, { who, maxT, seed, slow, trace, from, to });
    if (r.trace.length) console.log(r.trace.join('\n'));
    console.log(`${who}${who !== 'pair' ? '(' + ['Pip', 'Bo'][slow] + ')' : ''} s${seed}: ${r.cleared ? 'FINISHED' : 'stopped (' + r.phase + ' at s=' + r.s.toFixed(1) + ')'} in ${r.simT}s  ducks ${r.ducks}/${r.avail} (${Math.round(r.ducks / Math.max(1, r.avail) * 100)}%)  soaks ${r.soaks}  sinkings ${r.sinks}  bumps ${r.bumps}  pairs ${r.pairs}  laps ${r.laps}  pin ${r.worstPin}s (along a bank ${r.scrape}s)  spin ${r.worstSpin}  zigzag/s ${r.zig}${r.medal ? '  medal ' + r.medal : ''}${process.env.ZLOG ? '\n  ' + r.zlog.join(' ') : ''}${process.env.MISSED ? '\n  missed (s:x/log x): ' + r.missed.join(' ') : ''}${r.whys.length ? '\n  soaks: ' + r.whys.join(' ') : ''}${r.cpuErrs.length ? '\n  CPU ERR ' + r.cpuErrs : ''}${errors.length ? '\n  PAGE ERR ' + errors.slice(0, 3).join(' | ').slice(0, 600) : ''}`);
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
