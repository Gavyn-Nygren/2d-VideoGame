#!/usr/bin/env node
// Runaway Ship play-throughs with details: per-stretch times, bonks, waves, splashes, coins, gold help, errors.
// Usage: node tools/w18/runship-test.js [--who=pair|noisy|idle|solo|lazy|masher|onekey] [--clumsy=0|1] [--seeds=1,2,3] [--max=600]
//   pair    the computer plays both
//   noisy   like tools/cpu-test.js: the clumsy side (--clumsy, default Pip) pauses, wanders and presses at random
//   idle    1-player mode: the person (Pip, or Bo with --clumsy=1) presses nothing
//   masher  the person presses random keys all the time
//   onekey  the person holds one key (--key=act|jump|down|left|right) for the whole run
//   human   a scripted person who follows the on-screen prompts (reacts 0.6-1.2 s late, sometimes misses the bell)
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const who = opt('who', 'pair'), clumsy = +opt('clumsy', 0), seeds = opt('seeds', '1').split(',').map(Number), maxT = +opt('max', 600), key = opt('key', 'act');
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
  for (const seed of seeds) {
    errors.length = 0;
    const r = await page.evaluate(async ({ who, clumsy, seed, maxT, key }) => {
      const P = window.__pipbo, G = P.G;
      window.__seed(seed * 7919);
      G.manual = true;
      P.CPU.skillOf = [null, null]; P.CPU.errs.clear();
      const person = who === 'pair' || who === 'noisy' ? -1 : clumsy;
      G.cpuOn = person < 0 ? [true, true] : [person !== 0, person !== 1];
      const nz = { pause: 0, next: 3 + Math.random() * 6, wander: 0, wdir: 0, wnext: 6 + Math.random() * 8 };
      P.CPU.filter = who !== 'noisy' ? null : (p, out, dt) => {
        if (p.id !== clumsy) return out;
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
      const i = P.LEVELS.findIndex(l => l.name === 'Runaway Ship');
      delete G.results[i];
      P.loadLevel(i);
      const hp = person >= 0 ? G.players[person] : null;
      const set = (inp) => {
        const p = hp, i0 = p.input;
        const j = !!inp.jump, a = !!inp.act;
        if (j && !p.prevJump) p.pendingJump = true;
        if (a && !p.prevAct) { p.pendingAct = true; p.actAge = 0; }
        p.prevJump = j; p.prevAct = a;
        Object.assign(i0, { left: !!inp.left, right: !!inp.right, down: !!inp.down, up: !!inp.up, jump: j, act: a });
      };
      let mash = {}, mashT = 0;
      const steps = Math.round(maxT / P.DT);
      let n = 0;
      const roomAt = [];
      while (n < steps && G.mode === 'play') {
        for (let k = 0; k < 600 && n < steps && G.mode === 'play'; k++, n++) {
          if (hp) {
            if (who === 'idle') set({});
            else if (who === 'masher') { mashT -= P.DT; if (mashT <= 0) { mashT = 0.05 + Math.random() * 0.2; mash = { left: Math.random() < 0.3, right: Math.random() < 0.3, jump: Math.random() < 0.4, down: Math.random() < 0.3, act: Math.random() < 0.5 }; } set(mash); }
            else if (who === 'onekey') set({ [key]: true });
          }
          const r0 = G.room || 0;
          P.step(P.DT);
          if ((G.room || 0) !== r0) roomAt.push(Math.round(G.time));
        }
        await new Promise(r => setTimeout(r, 0));
      }
      const m = G.mst, res = G.results[i];
      return { mode: G.mode, t: Math.round(G.time), room: G.room || 0, roomAt, cleared: !!res, stats: m.stats && { bonks: m.stats.bonks, whoas: m.stats.whoas, met: m.stats.wavesMet, coins: m.stats.coins, fixed: m.stats.fixed, splashes: m.stats.splashes, helps: m.stats.helps, roomT: m.stats.roomT.map(x => x && Math.round(x)) },
        d: m.ship && Math.round(m.ship.d), state: m.state, sail: m.ship && m.ship.sail, aground: !!(m.ship && m.ship.aground), water: m.ship && Math.round(m.ship.water), cpuErrs: [...P.CPU.errs], medal: res && res.medal && ['none', 'Bronze', 'Silver', 'Gold'][res.medal.tier] };
    }, { who, clumsy, seed, maxT, key });
    console.log(`s${seed} ${who}${who === 'noisy' || who !== 'pair' ? ' clumsy/person=' + ['Pip', 'Bo'][clumsy] : ''}: ${r.cleared ? 'CLEARED' : 'not cleared'} t=${r.t}s room=${r.room + 1} rooms@${r.roomAt.join(',')} ${JSON.stringify(r.stats)} medal=${r.medal ? r.medal.value : '-'} ship d=${r.d} ${r.state} sail=${r.sail} aground=${r.aground} water=${r.water}${r.cpuErrs.length ? ' CPUERR ' + r.cpuErrs : ''}${errors.length ? ' ERR ' + errors.slice(0, 3).join(' | ') : ''}`);
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
