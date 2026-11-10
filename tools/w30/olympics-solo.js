#!/usr/bin/env node
// 30-1 era 'olympics' in 1-player mode: scripted "people" play one of Pip / Bo and the computer plays the other.
// Tries to break the computer's brain and the era's rules with people who are good, sloppy, or plain odd.
//   node tools/w30/olympics-solo.js [--seeds=1,2] [--max=600] [--only=good,sloppy,...] [--v]
// People (each plays both jobs, because the jobs swap every lap):
//   good      steers under the branches and round the junk (0.25 s late), reins in for the posts, times the hook well
//   sloppy    steers late (0.6 s) and only for branches, never reins in, lets go of the hook up to 0.25 s off
//   masher    only holds "gallop" as a driver; as a grabber just taps the button twice a second (never holds)
//   holder    only holds "gallop" as a driver; as a grabber holds the button down all the time
//   driveonly drives well but never touches the action button as a grabber      -> the era must NOT end
//   grabonly  grabs well but never drives                                       -> the era must NOT end
// Prints one line per run: how it ended, the time, bumps, gold help, the computer's bubbles seen.
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const seeds = opt('seeds', '1,2').split(',').map(Number), maxT = +opt('max', 600), verbose = args.includes('--v');
const KINDS = { good: true, sloppy: true, masher: true, holder: true, driveonly: false, grabonly: false };
const only = opt('only', '') ? opt('only', '').split(',') : Object.keys(KINDS);

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  await page.addInitScript(() => {
    const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    let seeded = gen(1); const other = gen(12345);
    window.__inStep = false; window.__seed = n => { seeded = gen((n >>> 0) || 1); };
    Math.random = () => (window.__inStep ? seeded() : other());
  });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.MODES && window.__pipbo.MODES.timethief);
  let bad = 0;
  for (const kind of only) for (const human of [0, 1]) for (const seed of seeds) {
    errors.length = 0;
    const r = await page.evaluate(async ({ kind, human, seed, maxT }) => {
      const P = window.__pipbo, G = P.G, TT = P.MODES.timethief.test, K = TTHOLY;
      window.__seed(seed * 104729); window.__inStep = true;
      G.manual = true; P.CPU.errs.clear();
      P.cpuSetCfg('players', 1); P.cpuSetCfg('human', human);
      TT.jump('olympics', { seed });
      const st = G.mst, me = G.players[human], rnd = Math.random, said = {};
      const b = { laneT: 0, wantLane: 1, seenLane: 1, seenT: 0, actHeld: false, relAt: null, tapT: 0, err: 0, brFor: null };
      const drive = good => {
        const ph = st.ph, inp = me.input, front = ph.x + K.front, edge = st.cam.x + 960;
        inp.right = true; inp.left = false; inp.jump = false; inp.down = false;
        if (kind === 'masher' || kind === 'holder') return;
        // where to be: the next branch's lane (the Thief's lane in the tease); a good driver also leaves a blocked lane
        const br = ph.obs.filter(o => o.kind === 'branch' && !o.sock && !o.got && !o.passed && o.x > ph.x + 60 && o.x < edge).sort((a, c) => a.x - c.x)[0];
        let want = ph.mode === 'tease' && ph.tease ? ph.tease.lane : br ? br.lane : ph.lane;
        if (good) {
          const blocked = l => ph.obs.some(o => !o.dead && (o.kind === 'amph' || o.kind === 'gear' || o.kind === 'disc' || o.kind === 'hurdle' || o.kind === 'rival') && o.x < edge && o.x + 40 > ph.x - K.back &&
            o.x - front < Math.max(ph.v, 200) * 0.75 + (o.kind === 'disc' ? 150 : 0) && (Math.round(o.kind === 'rival' ? o.ly : o.lane) === l || (o.kind === 'hurdle' && o.lane + 1 === l) || (o.kind === 'rival' && o.dir && o.lane + o.dir === l)));
          if (blocked(ph.lane)) want = [ph.lane - 1, ph.lane + 1].filter(l => l >= 0 && l <= 2 && !blocked(l))[0] ?? ph.lane;
          else if (want !== ph.lane && blocked(ph.lane + Math.sign(want - ph.lane))) want = ph.lane;
          if (ph.postD < 520 && ph.v > K.skidV - 20) { inp.left = true; inp.right = false; }
          else if (ph.postD < 520 && ph.v > K.skidV - 60) inp.right = false;
        }
        if (want !== b.seenLane) { b.seenLane = want; b.seenT = good ? 0.25 : 0.6; }
        b.seenT -= P.DT; b.laneT -= P.DT;
        if (b.seenT <= 0) b.wantLane = b.seenLane;
        if (b.laneT > 0.2) { if (b.dir < 0) inp.jump = true; else inp.down = true; }           // (a press held 0.1 s)
        else if (b.laneT <= 0 && b.wantLane !== ph.lane) { b.dir = Math.sign(b.wantLane - ph.lane); b.laneT = 0.3; }
      };
      const grab = good => {
        const ph = st.ph, inp = me.input, hookX = ph.x + K.hookDx, v = Math.max(ph.v, 80);
        if (kind === 'driveonly') { inp.act = false; return; }
        if (kind === 'holder') { inp.act = true; return; }
        if (kind === 'masher') { b.tapT -= P.DT; if (b.tapT <= 0) b.tapT = 0.5; inp.act = b.tapT > 0.4; return; }
        const slop = good ? 0.04 : 0.25;
        if (ph.mode === 'tease' && ph.tease && ph.tease.live) {
          const near = tthOlyWreathNear(st);
          if (ph.cool > 0) { inp.act = false; b.relAt = null; return; }
          if (!inp.act) { inp.act = true; b.relAt = null; return; }
          if (ph.gold.hook) return;
          if (near && b.relAt == null) b.relAt = G.time + 0.12 + rnd() * slop * 1.5;
          if (!good && b.relAt == null && rnd() < 0.25 * P.DT) b.relAt = G.time;      // lets go for no reason now and then
          if (b.relAt != null && G.time >= b.relAt && ph.reach >= K.minReach) { inp.act = false; b.relAt = null; }
          return;
        }
        const br = ph.obs.filter(o => o.kind === 'branch' && (!o.sock || !good) && !o.got && !o.passed && o.x > hookX - 30 && Math.abs(ph.lane - o.lane) < 0.5).sort((a, c) => a.x - c.x)[0];
        if (!br || ph.cool > 0 || ph.mode !== 'chase') { inp.act = false; return; }
        if (b.brFor !== br) { b.brFor = br; b.err = (rnd() - 0.5) * 2 * slop; }
        const tt = (br.x - hookX) / v;
        inp.act = tt < 0.6 && tt > 0.05 + b.err;
      };
      const steps = Math.round(maxT / P.DT);
      let n = 0, ended = '', maxGapMoving = 0;
      while (n < steps && !ended) {
        for (let j = 0; j < 600 && n < steps && !ended; j++, n++) {
          window.__inStep = true;
          const ph = st.ph, driving = ph.driver === human, prevAct = me.input.act;
          for (const k in me.input) if (k !== 'act') me.input[k] = false;
          if (driving) { if (kind === 'grabonly') me.input.act = false; else { drive(kind === 'good' || kind === 'driveonly'); me.input.act = false; } }
          else { me.input.right = false; grab(kind === 'good' || kind === 'grabonly'); }
          if (me.input.act && !prevAct) me.pendingAct = true;
          P.step(P.DT);
          window.__inStep = false;
          for (const bb of P.CPU.bubbles) if (bb && bb.t > 0) said[bb.text] = 1;
          if (G.mst !== st) { ended = 'restarted'; break; }
          if (st.cut) { ended = 'portal'; break; }
        }
        await new Promise(r2 => setTimeout(r2, 0));
      }
      const s = st.stats;
      return { ended, t: Math.round(st.phT), lap: st.ph.lap + 1, mode: st.ph.mode, bumps: s.bumps.concat(s.team), help: s.help.length, own: s.olympics, said: Object.keys(said), errs: [...P.CPU.errs], idle: !!st.idle };
    }, { kind, human, seed, maxT });
    const must = KINDS[kind], ok = (must ? !!r.ended : !r.ended) && !errors.length && !r.errs.length;
    if (!ok) bad++;
    console.log(`${kind.padEnd(9)} person=${human ? 'Bo ' : 'Pip'} s${seed} ${(r.ended || 'not ended').padEnd(9)} ${String(r.t).padStart(4)}s lap ${r.lap} (${r.mode})  bumps ${r.bumps.join('+')}  help ${r.help}  branches ${r.own.branches} missed ${r.own.missed} whiffs ${r.own.whiffs} skids ${r.own.skids}  ${ok ? 'ok' : 'FAIL'}${must ? '' : ' (must not end)'}${r.errs.length ? ' CPU ERR ' + r.errs.join(',') : ''}${errors.length ? ' PAGE ERR ' + errors.join(' | ').slice(0, 300) : ''}`);
    if (verbose) console.log('          bubbles: ' + r.said.join(' / '));
  }
  await page.evaluate(() => window.__pipbo.cpuSetCfg('players', 2));
  await browser.close();
  console.log(bad ? `\n${bad} problem(s)` : '\nAll 1-player runs behaved.');
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
