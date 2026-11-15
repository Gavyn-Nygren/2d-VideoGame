#!/usr/bin/env node
// Runaway Ship break tests: 1-player mode with a scripted "person" (Pip, or Bo with --as=1) and the computer as the
// partner. The person reads the same needs() summary the prompts show (through the computer's own brain), then plays it
// late, sloppy or wrong on purpose.
// Usage: node tools/w18/runship-break.js [--who=follow,kid,quit60,idle,masher,jumper,nest,wrong,lateanchor,bellmash,lazybell]
//        [--as=0|1] [--seeds=1,2] [--max=600]
//   follow      reacts 0.7 s late to each new job or lane, otherwise does what the prompts say; rings the bell a bit early
//   kid         reacts 1-1.4 s late to each new job, stops for 1-3 s now and then, wanders, rings the bell a bit early or late
//   quit60      follows for 60 s, then presses nothing (must never clear)
//   idle        presses nothing (must never clear)
//   masher      random keys all the time
//   jumper      holds jump and runs back and forth
//   nest        holds ▲ the whole time
//   wrong       does the opposite of the prompts (◀ for ▶, ▲ for ▼)
//   lateanchor  follows, but waits 25 s at the cove before going to the anchor
//   bellmash    follows, but at the helm mashes the bell (a press every 0.15 s) instead of timing it
//   lazybell    follows, but never rings the bell (gold bell should come)
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const whos = opt('who', 'follow,kid,quit60,idle,masher,jumper,nest,wrong,lateanchor,bellmash,lazybell').split(',');
const as = +opt('as', 0), seeds = opt('seeds', '1,2').split(',').map(Number), maxT = +opt('max', 600);
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  await page.addInitScript(() => {
    const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    let seeded = gen(1); window.__seed = n => { seeded = gen((n >>> 0) || 1); }; Math.random = () => seeded();
  });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  for (const who of whos) for (const seed of seeds) {
    errors.length = 0;
    const r = await page.evaluate(async ({ who, as, seed, maxT }) => {
      const P = window.__pipbo, G = P.G;
      window.__seed(seed * 7919 + who.length);
      G.manual = true;
      P.CPU.skillOf = [null, null]; P.CPU.errs.clear(); P.CPU.filter = null;
      G.cpuOn = [as !== 0, as !== 1];
      const i = P.LEVELS.findIndex(l => l.name === 'Runaway Ship');
      delete G.results[i];
      P.loadLevel(i);
      const hp = G.players[as], op = G.players[1 - as];
      const brain = cpuBrainFor(G.level.def);
      let bst = {}, lastRoom = -1;
      let cur = {}, lastSig = '', freeze = 0, bellAim = null;
      let tapPrev = {};
      const set = inp => {
        const p = hp, i0 = p.input;
        const want = k => (inp[k] === 'tap' ? !tapPrev[k] : !!inp[k]);
        const j = want('jump'), a = want('act');
        if (j && !p.prevJump && G.mode === 'play') p.pendingJump = true;
        if (a && !p.prevAct && G.mode === 'play') { p.pendingAct = true; p.actAge = 0; }
        p.prevJump = j; p.prevAct = a;
        Object.assign(i0, { left: !!inp.left && !inp.right, right: !!inp.right && !inp.left, down: !!inp.down, up: !!inp.up, jump: j, act: a });
        tapPrev = { jump: j, act: a };
      };
      const nz = { pause: 0, next: 4 + Math.random() * 6, wander: 0, wdir: 0, wnext: 8 + Math.random() * 8 };
      let mash = {}, mashT = 0, jdir = 1, jT = 0, bellT = 0, anchorWait = 0;
      const lag = who === 'kid' ? 1.0 + Math.random() * 0.4 : 0.7;
      const steps = Math.round(maxT / P.DT);
      let n = 0;
      const roomAt = [];
      while (n < steps && G.mode === 'play') {
        for (let k = 0; k < 600 && n < steps && G.mode === 'play'; k++, n++) {
          const dt = P.DT, m = G.mst;
          if ((G.room || 0) !== lastRoom) { lastRoom = G.room || 0; bst = {}; if (brain.reset) brain.reset(bst, hp, cpuInfo(hp)); cur = {}; }
          let out = (G.mode === 'play' && cpuCall(brain, 'think', [bst, hp, op, dt, cpuInfo(hp)])) || {};
          // a person reacts late to something new (a new job, a new lane to steer to), then plays it by eye
          const nd = m.state === 'sail' ? MODES.runship.needs(m) : null;
          const sig = !nd ? m.state : m.helm === as ? 'lane' + nd.lane : 'job' + (nd.job && nd.job.k) + (nd.job && nd.job.leak ? nd.job.leak.slot : '');
          if (sig !== lastSig) { lastSig = sig; freeze = lag; }
          if (freeze > 0) { freeze -= dt; out = cur; } else cur = out;
          // the bell: by eye, a little early or late
          if (nd && m.helm === as) {
            delete out.act;
            if (nd.wave && !nd.wave.rang) { if (bellAim == null) bellAim = who === 'kid' ? -0.15 + Math.random() * 0.75 : 0.2; if (nd.wave.tt <= bellAim) out.act = 'tap'; }
            else bellAim = null;
          }
          const dl = out;
          let inp = {};
          const helm = m.helm === as && m.state === 'sail';
          if (who === 'idle') inp = {};
          else if (who === 'quit60') inp = G.time < 60 ? dl : {};
          else if (who === 'masher') { mashT -= dt; if (mashT <= 0) { mashT = 0.05 + Math.random() * 0.2; mash = { left: Math.random() < 0.3, right: Math.random() < 0.3, jump: Math.random() < 0.4, down: Math.random() < 0.3, act: Math.random() < 0.5 }; } inp = mash; }
          else if (who === 'jumper') { jT -= dt; if (jT <= 0) { jT = 0.5 + Math.random() * 1.5; jdir = -jdir; } inp = { jump: true, left: jdir < 0, right: jdir > 0 }; }
          else if (who === 'nest') inp = { up: true, jump: true };
          else if (who === 'wrong') inp = { left: dl.right, right: dl.left, jump: dl.down, down: dl.jump || dl.up, up: dl.down, act: dl.act };
          else {
            inp = Object.assign({}, dl);
            if (who === 'kid') {
              if (nz.pause > 0) { nz.pause -= dt; inp = {}; }
              else {
                nz.next -= dt; if (nz.next <= 0) { nz.pause = 1 + Math.random() * 2; nz.next = 6 + Math.random() * 8; }
                nz.wnext -= dt; if (nz.wnext <= 0) { nz.wander = 0.3 + Math.random() * 0.8; nz.wdir = Math.random() < 0.5 ? -1 : 1; nz.wnext = 8 + Math.random() * 10; }
                if (nz.wander > 0 && !helm) { nz.wander -= dt; inp = { left: nz.wdir < 0, right: nz.wdir > 0 }; }
              }
            }
            if (helm && (who === 'bellmash' || who === 'lazybell')) {
              delete inp.act;
              if (who === 'bellmash') { bellT -= dt; if (bellT <= 0) { bellT = 0.15; inp.act = true; } }
            }
            if (who === 'lateanchor' && m.state === 'anchor') { anchorWait += dt; if (anchorWait < 25) inp = {}; }
          }
          set(inp);
          const r0 = G.room || 0;
          P.step(dt);
          if ((G.room || 0) !== r0) roomAt.push(Math.round(G.time));
        }
        await new Promise(r => setTimeout(r, 0));
      }
      const m = G.mst, res = G.results[i];
      return { t: Math.round(G.time), room: G.room || 0, roomAt, cleared: !!res, state: m.state, sail: m.ship && m.ship.sail, aground: !!(m.ship && m.ship.aground),
        stats: m.stats && { bonks: m.stats.bonks, whoas: m.stats.whoas, met: m.stats.wavesMet, coins: m.stats.coins, splashes: m.stats.splashes, helps: m.stats.helps, roomT: m.stats.roomT.map(x => x && Math.round(x)) },
        medal: res && res.medal && ['none', 'Bronze', 'Silver', 'Gold'][res.medal.tier], cpuErrs: [...P.CPU.errs] };
    }, { who, as, seed, maxT });
    console.log(`${who.padEnd(10)} as ${['Pip', 'Bo'][as]} s${seed}: ${r.cleared ? 'CLEARED ' + r.t + 's ' + r.medal : 'not cleared (stretch ' + (r.room + 1) + ', ' + r.state + (r.aground ? ', aground' : '') + ', sail ' + r.sail + ')'} rooms@${r.roomAt.join(',')} ${JSON.stringify(r.stats)}${r.cpuErrs.length ? ' CPUERR ' + r.cpuErrs : ''}${errors.length ? ' ERR ' + errors.slice(0, 3).join(' | ') : ''}`);
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
