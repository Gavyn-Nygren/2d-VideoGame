#!/usr/bin/env node
// 42-2 Log Flume Plunge: the review's scripted people. Unlike flume-stuck.js (people doing it wrong) these are people
// who TRY, each in their own way and none of them the computer's brain: they steer by eye for a place across the
// channel with their one paddle, a third of a second behind, and hold on when they see the hand signs.
// One seat is the person, the other the computer partner (or --both=1: two people, no computer at all).
// Usage: node tools/w42/flume-people.js [--who=<script>|all] [--seat=0|1|both] [--both=0|1] [--from=<s>] [--to=<s>] [--max=900]
//   steady     strokes every 0.9 s whatever happens, holds on at the signs, never steers
//   steer      steers for the middle (of the arm it is in), holds on at the signs
//   left/right steers for the left / right quarter of the water (so always that arm of a fork)
//   weave      steers for one bank, then the other, every 5 s
//   late       steers; holds on only at the last moment and lets go the moment the log lands
//   nohold     steers well but never holds on
//   whirlquit  steers; does nothing at all in the whirlpool
//   whirlfast  steers; in the whirlpool strokes as fast as it can (never in time with anybody)
//   nodrag     steers with strokes only (never drags), and paddles flat out at the dock
//   holdall    holds drag, jump and paddle all at once, all ride
//   flicker    steers; taps jump over and over (never a steady hold)
//   backward   steers the wrong way: drags when a stroke is needed and strokes when a drag is
// A FAIL: not through; pinned on a bank over 2 s; no progress for over 4 s (outside the whirlpool); over 45 s in the
// whirlpool; the same place sinking the log more than 4 times; a computer partner changing its turn more than 2 times a
// second; a page or brain error.
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const all = ['steady', 'steer', 'left', 'right', 'weave', 'late', 'nohold', 'whirlquit', 'whirlfast', 'nodrag', 'holdall', 'flicker', 'backward'];
const whos = opt('who', 'all') === 'all' ? all : opt('who').split(',');
const both = +opt('both', 0);
const seats = both ? [0] : opt('seat', 'both') === 'both' ? [0, 1] : [+opt('seat')];
const maxT = +opt('max', 900), from = opt('from', null), to = opt('to', null);
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
    const r = await page.evaluate(async ({ who, seat, both, maxT, from, to }) => {
      const P = window.__pipbo, G = P.G, K3D = P.K3D, PR = PARKFLUME_ROUTE, L = PR.lists, S = PARKFLUME.S;
      const i = P.LEVELS.findIndex(l => l.mode === 'parkflume');
      window.__seed(777);
      G.manual = true; K3D.noRender = true;
      P.CPU.errs.clear(); P.CPU.skillOf = [null, null]; P.CPU.filter = null;
      G.cpuOn = both ? [false, false] : seat === 0 ? [false, true] : [true, false];
      delete G.results[i];
      P.loadLevel(i);
      const st0 = G.mst;
      if (from != null) { st0.phase = 'ride'; st0.started = true; st0.s = st0.prevS = st0.restart = +from; st0.x = 0; }
      const end = to != null ? +to : 1e9, DT = P.DT, steps = Math.round(maxT / DT);
      const sgn = x => (x > 0 ? 1 : x < 0 ? -1 : 0);
      // one person: what they see is a third of a second old
      const mk = id => ({ id, side: id === 0 ? -1 : 1, seen: [], lastStroke: -9, dragUntil: -9, hold: false, n: 0 });
      const people = both ? [mk(0), mk(1)] : [mk(seat)];
      function act(pe, s, n) {
        const p = G.players[pe.id], inp = p.input, t = s.t;
        for (const key in inp) inp[key] = false;
        if (s.phase !== 'ride') return;
        pe.seen.push({ s: s.s, x: s.x, psi: s.psi, om: s.om }); const see = pe.seen.length > 20 ? pe.seen.shift() : pe.seen[0];
        const stroke = () => { if (t - pe.lastStroke > 0.72) { p.pendingAct = true; inp.act = true; pe.lastStroke = t; } };
        const whirl = !!s.whirl;
        // the hand signs: a drop, or a thing right across, coming up
        let near = 1e9, inDrop = false;
        for (const d of L.drops) { if (d.side && sgn(s.x) !== d.side) continue; if (s.s < d.s1 + 0.5 && d.s0 - s.s < near) near = d.s0 - s.s; if (s.s > d.s0 && s.s < d.s1) inDrop = true; }
        for (const o of L.obs) if (o.braceOk && (o.line || Math.abs(o.x - s.x) < 3) && (!o.side || sgn(s.x) === o.side) && s.s < o.s + 3 && o.s - 3 - s.s < near) near = o.s - 3 - s.s;
        const secs = near / Math.max(0.6, s.vs);
        let hold = secs < 1.3;
        if (who === 'late') hold = secs < 0.25 && !(inDrop && s.s > 0 && secs < -0.2);
        if (who === 'nohold' || who === 'steady' && false) hold = false;
        if (who === 'flicker') hold = n % 14 < 7;
        if (who === 'holdall') { inp.jump = true; inp.down = true; inp.act = true; if (n % 3 === 0) p.pendingAct = true; return; }
        if (hold) { inp.jump = true; return; }
        if (who === 'steady') { if (t - pe.lastStroke > 0.9) stroke(); return; }
        if (whirl) {
          if (who === 'whirlquit') return;
          if (who === 'whirlfast') { if (n % 2 === 0) { p.pendingAct = true; inp.act = true; } return; }
          if (t - pe.lastStroke > 1.0) stroke();
          return;
        }
        // where they want to be across the water
        const w = PR.w(see.s + 6) - 1.2, isl = PARKFLUME.islandAt(see.s + 5) || PARKFLUME.islandAt(see.s);
        let tx = 0;
        if (who === 'left') tx = -w * 0.55; else if (who === 'right') tx = w * 0.55;
        else if (who === 'weave') tx = (Math.floor(t / 5) % 2 ? 1 : -1) * w * 0.7;
        else if (isl && isl.hw > 0.3) tx = isl.I.x + (see.x >= isl.I.x ? 1 : -1) * (isl.hw + (PR.w(see.s + 5) - isl.hw) / 2);
        // by eye: turn the nose toward it (no sums about sliding or the current)
        const want = Math.max(-0.5, Math.min(0.5, (tx - see.x) * 0.22)), need = want - see.psi - see.om * 0.3; // + : nose right
        let away = need * -pe.side, toward = need * pe.side; // a stroke turns away from my side, a drag toward it
        if (who === 'backward') { const q = away; away = toward; toward = q; }
        const ringNear = PR.at.ring - s.s < 14 && PR.at.ring - s.s > -3;
        if (who === 'nodrag') { if (away > 0.12 || ringNear || Math.abs(need) < 0.1) stroke(); return; }
        if (ringNear) { inp.down = true; return; }
        if (toward > 0.16 || t < pe.dragUntil) { inp.down = true; if (toward > 0.16) pe.dragUntil = t + 0.25; }
        else if (away > 0.2) stroke();
        else if (Math.abs(need) < 0.12 && t - pe.lastStroke > 1.1) stroke(); // on line: paddle on
      }
      let n = 0, pin = 0, worstPin = 0, stall = 0, worstStall = 0, stallAt = '', pinAt = '', lastS = 0, whirlT = 0, worstWhirl = 0, sinkSeen = false;
      const sinks = {}, sinkList = [], whys = []; let lastSoak = 0;
      const zz = { last: [0, 0], at: [[], []], worst: 0, dr: [false, false], sa: [-9, -9], pend: [null, null], where: '' };
      while (n < steps && G.mode === 'play') {
        for (let k = 0; k < 600 && n < steps && G.mode === 'play'; k++, n++) {
          const s = G.mst;
          for (const pe of people) act(pe, s, n);
          window.__inStep = true; P.step(DT); window.__inStep = false;
          if (s.soaks > lastSoak) { lastSoak = s.soaks; whys.push(s.lastWhy + '@' + Math.round(s.s)); }
          if (s.phase === 'sink' && !sinkSeen) { sinkSeen = true; const key = Math.round(s.restart); sinks[key] = (sinks[key] || 0) + 1; sinkList.push(Math.round(s.s) + '/' + s.lastWhy); } else if (s.phase !== 'sink') sinkSeen = false;
          if (s.phase === 'ride') {
            const onBelt = !!PARKFLUME.liftAt(s.s);
            pin = !onBelt && !s.whirl && s.bank[0] && s.vs < 0.34 * PR.R.at(s.s).v ? pin + DT : 0; if (pin > worstPin) { worstPin = pin; pinAt = `s=${s.s.toFixed(1)} x=${s.x.toFixed(2)}`; }
            stall = s.s - lastS < 0.002 && !s.whirl ? stall + DT : 0; if (stall > worstStall) { worstStall = stall; stallAt = `s=${s.s.toFixed(1)} x=${s.x.toFixed(2)}`; } lastS = s.s;
            whirlT = s.whirl ? whirlT + DT : 0; worstWhirl = Math.max(worstWhirl, whirlT);
            // the computer's changes of turn a second
            if (!both) for (const k of [0, 1]) {
              if (k === seat) continue;
              const sd = k === 0 ? -1 : 1, turn = d => { const z = zz.at[k]; if (zz.last[k] && d !== zz.last[k]) { z.push(s.t); while (z.length && s.t - z[0] > 1) z.shift(); if (z.length > zz.worst) { zz.worst = z.length; zz.where = 's=' + s.s.toFixed(0); } } zz.last[k] = d; };
              if (s.drag[k] && !zz.dr[k]) turn(sd);
              zz.dr[k] = s.drag[k];
              if (s.strokeAt[k] !== zz.sa[k]) { zz.sa[k] = s.strokeAt[k]; zz.pend[k] = s.t; }
              if (zz.pend[k] != null && s.t - zz.pend[k] > 0.3) { if (!s.paired[k] || s.strokeAt[k] !== zz.sa[k]) turn(-sd); zz.pend[k] = null; }
            }
          }
          if (s.s >= end) { n = steps; break; }
        }
        await new Promise(r => setTimeout(r, 0));
      }
      const s = G.mst, res = G.results[i];
      return { simT: +(n * DT).toFixed(1), phase: s.phase, s: +s.s.toFixed(1), done: !!res || s.s >= end, medal: res && res.medal && res.medal.tier, ducks: s.ducks, soaks: s.soaks, sinkings: s.sinkings, gold: s.goldN, laps: s.laps, bumps: s.bumps, pairs: s.pairs, max: PARKFLUME.ducksMax(),
        pin: +worstPin.toFixed(2), pinAt, stall: +worstStall.toFixed(2), stallAt, whirl: +worstWhirl.toFixed(1), sinks, sinkList, whys, missed: L.ducks.map((d, k) => (s.got[k] ? '' : d.s.toFixed(0) + ':' + d.x.toFixed(1))).filter(Boolean), zig: zz.worst, zigAt: zz.where, cpuErrs: [...P.CPU.errs] };
    }, { who, seat, both, maxT, from, to });
    const fails = [];
    if (!r.done) fails.push('did not get there (' + r.phase + ' s=' + r.s + ')');
    if (r.pin > 2) fails.push('pinned ' + r.pin + 's at ' + r.pinAt);
    if (r.stall > 4) fails.push('stalled ' + r.stall + 's at ' + r.stallAt);
    if (r.whirl > 45) fails.push('whirlpool ' + r.whirl + 's');
    const worstSink = Math.max(0, ...Object.values(r.sinks)); if (worstSink > 4) fails.push('sank ' + worstSink + ' times from one arch');
    if (r.zig > 2) fails.push('computer zigzag ' + r.zig + '/s at ' + r.zigAt);
    if (r.cpuErrs.length || errors.length) fails.push('errors');
    if (fails.length) bad++;
    console.log(`${fails.length ? 'FAIL' : 'ok  '} ${who.padEnd(9)} ${both ? 'two people' : 'as ' + ['Pip', 'Bo '][seat]}: ${r.simT}s  ducks ${r.ducks} (${Math.round(r.ducks / r.max * 100)}%)  soaks ${r.soaks}  sinkings ${r.sinkings}  gold ${r.gold}  laps ${r.laps}  pairs ${r.pairs}  bumps ${r.bumps}  whirl ${r.whirl}s  zig ${r.zig}${r.medal ? '  medal ' + r.medal : ''}${fails.length ? '  <- ' + fails.join('; ') : ''}${r.sinkList.length ? '\n     sank: ' + r.sinkList.join(' ') : ''}${process.env.SOAKS && r.whys.length ? '\n     soaks: ' + r.whys.join(' ') : ''}${process.env.MISSED ? '\n     missed: ' + r.missed.join(' ') : ''}${r.cpuErrs.length ? '\n  CPU ERR ' + r.cpuErrs : ''}${errors.length ? '\n  PAGE ERR ' + errors.slice(0, 2).join(' | ').slice(0, 400) : ''}`);
  }
  await browser.close();
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
