#!/usr/bin/env node
// Runaway Pigs scripted "people" (the second-pass review): a person plays one seat (the computer the other, 1-player
// mode), or two people play (2-player). Each person is scripted from the brain's own plan, then spoiled:
//   good     plays like the brain
//   slow     a slow kid: reacts 0.5 s late, walks at half pace (presses half the time), stops now and then
//   masher   a young kid pressing at random (direction changes every 0.2-1 s, the action a lot)
//   thief    takes the computer's job first: the herder runs to the gates and presses there, the gatekeeper chases
//            the pigs; after 70 s in a chase they get it and play like the brain
//   thiefAll takes the other job for the whole level
//   wrong    walks the wrong way (back left) and presses the action, for 60 s a chase, then plays well
//   idle     presses nothing (must never clear)
// Prints the time, medal, gold help and the longest chase, and flags stalls (a chase longer than 6 min).
// Usage: node tools/w23/pigherd-people.js [--who=good,slow,...] [--seat=0|1|both] [--seeds=1,2] [--pair=slow+masher]
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=').slice(1).join('=') : d; };
const whos = opt('who', 'good,slow,masher,thief,thiefAll,wrong,idle').split(',');
const seats = opt('seat', 'both') === 'both' ? [0, 1] : [+opt('seat', 0)];
const seeds = opt('seeds', '1,2').split(',').map(Number);
const pairs = opt('pair', '') ? opt('pair', '').split(',') : [];
const maxT = +opt('max', 900), trace = +opt('trace', 0), room0 = +opt('room', 0);
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.addInitScript(() => {
    const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    let seeded = gen(1); window.__seed = n => { seeded = gen((n >>> 0) || 1); }; Math.random = () => seeded();
  });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const runs = [];
  for (const w of whos) for (const s of seats) runs.push({ people: s === 0 ? [w, null] : [null, w] });
  for (const pr of pairs) runs.push({ people: pr.split('+') });
  let bad = 0;
  for (const run of runs) for (const seed of seeds) {
    const r = await page.evaluate(({ people, seed, maxT, trace, room0 }) => {
      const P = window.__pipbo, G = P.G, M = P.MODES.pigherd, B = P.CPU.brains.pigherd, DT = P.DT;
      window.__seed(seed * 7919 + 13);
      const solo = people.filter(x => x).length === 1;
      P.CPU.cfg.players = solo ? 1 : 2; P.CPU.cfg.human = people[0] ? 0 : 1; P.cpuApplyCfg();
      G.cpuOn = people.map(x => !x);
      G.manual = true; P.CPU.filter = null;
      const LI = P.LEVELS.findIndex(l => l.name === 'Runaway Pigs');
      P.loadLevel(LI);
      for (let k = 0; k < room0; k++) P.nextRoom();
      G.introT = 0;
      const log = []; let lastT = -99;
      const S = [{}, {}], mem = [{ lag: [], pause: 0, mash: {}, mashT: 0 }, { lag: [], pause: 0, mash: {}, mashT: 0 }];
      B.reset(S[0]); B.reset(S[1]);
      const last = [{}, {}];
      let room = -1, roomT0 = 0, n = 0, longest = 0, chaseT0 = 0;
      const applyP = (p, out) => {
        const want = k => (out[k] === 'tap' ? !last[p.id][k] : !!out[k]);
        const a = want('act');
        p.input.left = !!out.left && !out.right; p.input.right = !!out.right && !out.left; p.input.up = !!out.up; p.input.down = !!out.down; p.input.jump = false;
        if (a && !p.prevAct) { p.pendingAct = true; p.actAge = 0; }
        p.prevAct = a; p.input.act = a;
        last[p.id] = { act: a };
      };
      const think = (p, fake) => {
        const st = G.mst;
        if (!fake) return B.think(S[p.id], p, G.players[1 - p.id], DT, { mst: st, intro: false, partnerCpu: true, skill: 1 }) || {};
        // pretend to be the other job (swap the roles for one think)
        const h = st.herder, k = st.keeper;
        st.herder = k; st.keeper = h;
        let out;
        try { out = B.think(S[p.id], p, G.players[1 - p.id], DT, { mst: st, intro: false, partnerCpu: true, skill: 1 }) || {}; }
        finally { st.herder = h; st.keeper = k; }
        return out;
      };
      while (n < maxT / DT && G.mode === 'play') {
        if (G.room !== room) { if (room >= 0) longest = Math.max(longest, G.time - roomT0); room = G.room; roomT0 = G.time; chaseT0 = n; B.reset(S[0]); B.reset(S[1]); }
        const inChase = (n - chaseT0) * DT;
        for (const p of G.players) {
          const who = people[p.id];
          if (!who) continue;
          const m = mem[p.id];
          let out = {};
          if (who === 'idle') out = {};
          else if (who === 'masher') {
            m.mashT -= DT;
            if (m.mashT <= 0) { m.mashT = 0.2 + Math.random() * 0.8; const d = Math.floor(Math.random() * 9); m.mash = { left: d % 3 === 0, right: d % 3 === 1, up: d < 3, down: d > 5 }; }
            out = Object.assign({}, m.mash, { act: Math.random() < 0.5 });
          } else if (who === 'wrong' && inChase < 60) out = { left: true, up: Math.random() < 0.3, act: Math.random() < 0.05 };
          else if (who === 'thiefAll' || (who === 'thief' && inChase < 70)) out = think(p, true);
          else {
            out = think(p, false);
            if (who === 'slow') {
              m.lag.push(out); out = m.lag.length > 60 ? m.lag.shift() : {};
              if (Math.random() < 0.25 * DT) m.pause = 1 + Math.random() * 2;
              if (m.pause > 0) { m.pause -= DT; out = {}; }
              else if (Math.floor(n / 12) % 2) out = Object.assign({}, out, { left: false, right: false, up: false, down: false });
            }
          }
          applyP(p, out);
        }
        P.step(DT); n++;
        if (trace && n * DT - lastT >= trace) { lastT = n * DT; const st = G.mst, pl = M.plan(st), j = pl.job; log.push(`  t=${(n*DT).toFixed(0)} r${G.room} ${st.state} H=${st.herder} job=${j ? j.kind + '@' + (j.x | 0) : '-'} block=${pl.block ? pl.block.id : '-'} pigs=${st.pigs.map(q => q.state[0] + (q.x | 0) + ',' + (q.y | 0)).join(' ')} pip=${(G.players[0].x + st.camX) | 0},${G.players[0].y | 0} bo=${(G.players[1].x + st.camX) | 0},${G.players[1].y | 0} gates=${st.gates.map(g=>g.id+(g.open?'O':'s')).join(',')} idle=${P.CPU.idle.map(x=>x.toFixed(0))} dbg=${S[0].dbg||""}|${S[1].dbg||""} in0=${JSON.stringify(G.players[0].input)}`); }
      }
      longest = Math.max(longest, G.time - roomT0);
      const st = G.mst;
      return { log, mode: G.mode, t: G.time, steps: n * DT, room: G.room, wrong: st.stats.wrong, gold: st.goldUsed.slice(), medal: M.medalOf(st), longest };
    }, { people: run.people, seed, maxT, trace, room0 });
    if (r.log.length) console.log(r.log.join('\n'));
    const label = run.people.map((x, i) => (x || 'cpu') + (i ? '' : '')).join(' / ');
    const clr = r.mode !== 'play';
    const idleRun = run.people.includes('idle') && run.people.filter(x => x).length === 1;
    const stall = !idleRun && (!clr || r.longest > 360);
    // (not cleared because the scripted person stood still long enough for the clock to rest and the computer to wait:
    // that is the idle rule working, not a stall, e.g. thiefAll as the herder standing by a gate it can't work)
    const rested = !clr && r.steps - r.t > 60;
    const fail = idleRun ? clr : !clr && !rested;
    if (fail) bad++;
    console.log(`${fail ? 'FAIL' : rested && !idleRun ? 'IDLE' : stall ? 'SLOW' : 'ok  '} Pip=${run.people[0] || 'cpu'} Bo=${run.people[1] || 'cpu'} s${seed}: ${clr ? 'cleared' : 'NOT cleared (chase ' + (r.room + 1) + ')'} clock ${r.t.toFixed(0)} s (played ${r.steps.toFixed(0)} s) longest chase ${r.longest.toFixed(0)} s wrong ${r.wrong} gold [${r.gold}] ${clr ? r.medal : ''}`);
  }
  if (errors.length) console.log('ERRORS', [...new Set(errors)].join('\n'));
  console.log(bad ? bad + ' FAILED' : 'ALL PEOPLE RUNS OK');
  await browser.close();
})();
