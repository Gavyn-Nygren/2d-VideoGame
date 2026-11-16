#!/usr/bin/env node
// 5-3 Ice Slide: the computer partner with person-like partners. The person (Pip, or Bo with --as=1) reads the same map
// the computer builds and plays like a person who thinks for a while before each move:
//   good    makes its own helpful move after --think s (default 1.0)
//   waiter  waits for the computer to go first; makes its own helpful move only after 3 s with nothing happening
//   wrong   like good, but a quarter of its moves are a random slide or hop
//   jumpy   like wrong, and also presses jump while the computer slides past (the old jump-over trick)
// Prints, per room: time, moves, and how long the computer stood still while it had a helpful move of its own
// ("cpu idle"), plus the longest such wait. Usage: node tools/w5/ice-people.js [good,waiter,wrong,jumpy] [--seeds=1,2,3]
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const kinds = (args.find(a => !a.startsWith('--')) || 'good,waiter,wrong,jumpy').split(',');
const seeds = opt('seeds', '1,2,3').split(',').map(Number), think = +opt('think', 1.0), as = +opt('as', 0);
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.addInitScript(() => {
    const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    let r = gen(1); window.__seed = n => { r = gen((n >>> 0) || 1); }; Math.random = () => r();
  });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  for (const kind of kinds) for (const seed of seeds) {
    const r = await page.evaluate(({ kind, seed, think, as }) => {
      const P = window.__pipbo, G = P.G, DT = P.DT, m = P.CPU.brains.ice.model;
      window.__seed(seed * 7919);
      const i = P.LEVELS.findIndex(l => l.name === 'Ice Slide');
      G.manual = true; G.cpuOn = as === 0 ? [false, true] : [true, false];
      P.loadLevel(i);
      const me = G.players[as], cpu = G.players[1 - as];
      const rooms = []; let room = 0, t = 0, still = 0, cpuIdle = 0, longest = 0, wait = 0, plan = null, hold = 0, keys = {};
      let lastMoveT = 0, quietT = 0;
      const helpful = (n, k) => {
        const es = (n.edges || []).filter(e => e.k === k && e.to.d < Infinity);
        if (!es.length) return [];
        const dmin = Math.min(...es.map(e => e.to.d));
        if (n.d < Infinity && dmin >= n.d) return [];
        return es.filter(e => e.to.d === dmin);
      };
      for (let n = 0; n < 600 / DT && G.mode === 'play'; n++) {
        // the person's keys
        for (const k in me.input) me.input[k] = false;
        if (hold > 0) { hold--; Object.assign(me.input, keys); if (keys.jump && !me.prevJump) me.pendingJump = true; me.prevJump = !!keys.jump; }
        else me.prevJump = false;
        const bothStill = m.iceStill(me) && m.iceStill(cpu);
        if (kind === 'jumpy' && G.mst.ps && G.mst.ps[cpu.id].mode === 'slide' && m.iceStill(me) && Math.random() < 0.02 && hold <= 0) { hold = 3; keys = { jump: true }; }
        if (bothStill && hold <= 0 && G.introT <= 0) {
          still += DT; quietT += DT;
          const M = m.iceMap(); const node = M && m.iceNode(M, m.icePosOf(G.players));
          if (node && node.edges && M.dist) {
            const mine = helpful(node, me.id), theirs = helpful(node, cpu.id);
            if (theirs.length && still > 0.6) { cpuIdle += DT; wait += DT; longest = Math.max(longest, wait); }
            const want = kind === 'waiter' ? quietT > 3 : true;
            if (!plan && want && still >= think) {
              let mv = mine.length ? mine[0].m : null;
              if ((kind === 'wrong' || kind === 'jumpy') && Math.random() < 0.25) mv = ['L', 'R', 'U'][Math.floor(Math.random() * 3)];
              if (mv) plan = mv;
            }
            if (plan) {
              const snow = G.mst.ps[me.id].mode === 'free';
              keys = plan === 'L' ? { left: true } : plan === 'R' ? { right: true } : plan === 'U' ? { jump: true } : { down: true };
              hold = plan === 'B' ? 140 : plan === 'U' && snow ? 54 : 4; plan = null; still = 0; quietT = 0;
            }
          }
        } else { still = 0; wait = 0; if (!bothStill) quietT = 0; }
        P.step(DT); t += DT;
        if ((G.room || 0) !== room || G.mode !== 'play') {
          rooms.push({ t: +t.toFixed(1), moves: G.mst.stats ? G.mst.stats.roomMoves[room] : null, cpuIdle: +cpuIdle.toFixed(1), longest: +longest.toFixed(1) });
          room = G.room || 0; t = 0; cpuIdle = 0; longest = 0; wait = 0; still = 0;
        }
      }
      return { cleared: G.mode !== 'play', rooms, total: rooms.reduce((a, r) => a + r.t, 0).toFixed(1), errs: [...P.CPU.errs] };
    }, { kind, seed, think, as });
    console.log(`${kind.padEnd(7)} s${seed} ${r.cleared ? 'CLEARED' : 'NOT CLEARED'} total ${r.total}s  ` + r.rooms.map((x, k) => `r${k + 1}: ${x.t}s ${x.moves}mv cpuIdle ${x.cpuIdle}s (max ${x.longest})`).join(' | ') + (r.errs.length ? ' CPU ERR ' + r.errs : ''));
  }
  if (errs.length) console.log('PAGE ERRORS', errs.slice(0, 5));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
