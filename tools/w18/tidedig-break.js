#!/usr/bin/env node
// 18-3 Tide Pool Dig: try to break it in 1-player mode with scripted "people".
// The person is driven by a script (often the level's own brain with a slower reaction, plus bad habits); the
// computer plays the other character for real. Prints how far each run got.
// Usage: node tools/w18/tidedig-break.js [--seeds=1,2] [--only=good,swap] [--human=0,1] [--max=600]
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const trace = +opt('trace', 0), from = +opt('from', 0);
const seeds = opt('seeds', '1,2').split(',').map(Number), maxT = +opt('max', 600);
const humans = opt('human', '0,1').split(',').map(Number);
// name -> must it clear? (true: a willing person must get through; false: it must never clear)
const SCRIPTS = {
  good: true,        // plays its own job (the brain, with a 0.4 s reaction)
  kid: true,         // its job, but pauses, wanders and presses random things
  swap: true,        // the first 40 s of each room it does the computer's job (or stands where the computer works)
  wrongway: true,    // the first 15 s of each room it runs off the wrong way, then plays
  mouth: true,       // as bailer, stands on the hole's mouth for 15 s each room; as digger, stands on the X mouth idle
  hopper: true,      // its job, but hops every 1.2 s
  leftpost: true,    // its job, but in the big-chest haul it always runs to the LEFT rope post
  rightpost: true,   // ... always to the RIGHT rope post
  late: true,        // waits 25 s at the start of each room, then plays
  quit: false,       // plays 50 s, then presses nothing ever again
  masher: false,     // mashes action and jump and walks at random, never does the job
  jumper: false,     // only jumps on the spot
  actonly: false,    // holds the action, stands still
};
const only = opt('only', '') ? opt('only', '').split(',') : Object.keys(SCRIPTS);

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  await page.addInitScript(() => {
    const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    let seeded = gen(1);
    window.__seed = n => { seeded = gen((n >>> 0) || 1); };
    Math.random = () => seeded();
  });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  let bad = 0;
  for (const name of only) for (const human of humans) for (const seed of seeds) {
    errors.length = 0;
    const r = await page.evaluate(async ({ name, human, seed, maxT, trace, from }) => {
      const P = window.__pipbo, G = P.G, CPU = P.CPU;
      window.__seed(seed * 104729 + human * 7 + name.length);
      G.manual = true;
      CPU.filter = null; CPU.errs.clear();
      G.cpuOn = human === 0 ? [false, true] : [true, false];
      const i = P.LEVELS.findIndex(l => l.name === 'Tide Pool Dig');
      delete G.results[i];
      P.loadLevel(i);
      const p = G.players[human], o = G.players[1 - human];
      const brain = CPU.brains.tidedig, bst = {}; brain.reset(bst);
      let last = {}, lagT = 0, lagOut = {}, roomSeen = -1, roomT = 0;
      const nz = { pause: 0, next: 3, wander: 0, wdir: 1, wnext: 6 };
      const press = out => {
        const want = k => (out[k] === 'tap' ? !last[k] : !!out[k]);
        const j = want('jump'), a = want('act');
        p.input.left = !!out.left && !out.right; p.input.right = !!out.right && !out.left; p.input.up = !!out.up; p.input.down = !!out.down;
        if (j && !p.prevJump && G.mode === 'play') p.pendingJump = true;
        p.prevJump = j; p.input.jump = j;
        if (a && !p.prevAct && G.mode === 'play') { p.pendingAct = true; p.actAge = 0; }
        p.prevAct = a; p.input.act = a;
        last = { jump: j, act: a, left: p.input.left, right: p.input.right };
        CPU.last[p.id] = last;
      };
      const think = () => {
        const info = { L: G.level, def: G.level.def, mst: G.mst, room: G.room || 0, skill: 0.7, partnerCpu: true, partnerIdle: 0, frozen: false, intro: G.introT > 0, time: G.time };
        return brain.think(bst, p, o, P.DT, info) || {};
      };
      const dt = P.DT, steps = Math.round(maxT / dt);
      let n = 0, rooms = 0;
      const log = [];
      while (n < steps && G.mode === 'play') {
        for (let k = 0; k < 600 && n < steps && G.mode === 'play'; k++, n++) {
          if ((G.room || 0) !== roomSeen) { roomSeen = G.room || 0; roomT = 0; brain.reset(bst); log.push('room ' + (roomSeen + 1) + ' at ' + G.time.toFixed(0)); }
          if (G.introT <= 0) roomT += dt;
          const st = G.mst, dig = st.digger === p.id;
          let out = {};
          // a person reacts a little slower than the brain: what the brain wanted 0.4 s ago, re-asked every 0.4 s
          const brainOut = () => { lagT -= dt; if (lagT <= 0) { lagT = 0.12; lagOut = think(); } else think(); return Object.assign({}, lagOut); };
          if (name === 'good') out = brainOut();
          else if (name === 'kid' || name === 'hopper') {
            out = brainOut();
            if (name === 'kid') {
              if (nz.pause > 0) { nz.pause -= dt; out = {}; }
              else if ((nz.next -= dt) <= 0) { nz.pause = 1 + Math.random() * 3; nz.next = 4 + Math.random() * 8; }
              if ((nz.wnext -= dt) <= 0) { nz.wander = 0.4 + Math.random(); nz.wdir = Math.random() < 0.5 ? -1 : 1; nz.wnext = 6 + Math.random() * 10; }
              if (nz.wander > 0) { nz.wander -= dt; out = { left: nz.wdir < 0, right: nz.wdir > 0 }; }
              if (Math.random() < 0.3 * dt) out.jump = 'tap';
              if (Math.random() < 0.3 * dt) out.act = 'tap';
            } else if (Math.floor(G.time / 1.2) !== Math.floor((G.time - dt) / 1.2)) out.jump = 'tap';
          } else if (name === 'swap') {
            if (roomT < 40) {
              const h = st.holes.find(q => !q.chest.opened) || st.holes[0];
              if (dig) {
                // the digger tries to bail: stands by the hole's edge and taps, goes to the sea and taps
                const tx = Math.floor(roomT / 8) % 2 ? st.seaX - 10 : h.cx + 36;
                const d = tx - (p.x + p.w / 2); out.left = d < -4; out.right = d > 4; out.act = Math.random() < 0.5 ? 'tap' : false;
              } else {
                // the bailer tries to dig: stands on the X and holds the action
                const d = h.cx - (p.x + p.w / 2); out.left = d < -3; out.right = d > 3; out.act = true;
              }
            } else out = brainOut();
          } else if (name === 'wrongway') {
            if (roomT < 15) { out.left = roomT < 7; out.right = roomT >= 7; out.jump = Math.random() < 0.01 ? 'tap' : false; }
            else out = brainOut();
          } else if (name === 'mouth') {
            const h = st.holes.find(q => !q.chest.opened) || st.holes[0];
            if (roomT < 15 || (!dig && roomT < 60 && h.depth > 0 && roomT % 20 < 6)) { const d = h.cx - (p.x + p.w / 2); out.left = d < -2; out.right = d > 2; }
            else out = brainOut();
          } else if (name === 'leftpost' || name === 'rightpost') {
            out = brainOut();
            if (st.phase === 'haul') {
              const px = st.haul.posts[name === 'leftpost' ? 0 : 1], inH = P.MODES.tidedig.test.tidedigIn(st, p), d = px - (p.x + p.w / 2);
              out = { left: d < -4, right: d > 4, jump: !!inH, act: Math.abs(d) < 10 };
            }
          } else if (name === 'late') { out = roomT < 25 ? {} : brainOut(); }
          else if (name === 'quit') { out = G.time < 50 ? brainOut() : {}; }
          else if (name === 'masher') { out = { act: Math.random() < 0.5, jump: Math.random() < 0.2, left: Math.sin(G.time * 0.7) < -0.3, right: Math.sin(G.time * 0.7) > 0.3 }; }
          else if (name === 'jumper') { out = { jump: Math.floor(G.time * 3) % 2 === 0 }; }
          else if (name === 'actonly') { out = { act: true }; }
          press(out);
          P.step(dt);
          if (trace && G.time >= from && n % Math.round(trace / dt) === 0 && G.mst.holes) {
            const s2 = G.mst, pl = P.MODES.tidedig.test.tidedigPlan(s2), q = G.players;
            log.push(`${G.time.toFixed(1)} r${(G.room || 0) + 1} ph ${s2.phase} jobs ${pl.jobs.map(j => j.k).join('/')} holes ${s2.holes.map(h => h.depth + '/' + h.chest.depth + (h.chest.opened ? 'o' : '') + ' w' + Math.round(h.water)).join(' ')} wave ${s2.wave.ph} crabs ${s2.crabs.map(c => c.ph + (c.coin ? '$' : '') + Math.round(c.x)).join(',')} coins ${s2.coins.map(c => Math.round(c.x) + ':' + Math.round(c.y) + c.st[0]).join(',')} Pip ${Math.round(q[0].x + 11)},${Math.round(q[0].y + q[0].h)}${q[0].grounded ? 'g' : 'a'} Bo ${Math.round(q[1].x + 11)},${Math.round(q[1].y + q[1].h)}${q[1].grounded ? 'g' : 'a'} bucket ${s2.pl[s2.bailer].bucket} wall ${s2.wall ? s2.wall.lv + '/' + s2.wall.prog.toFixed(2) : '-'}`);
          }
        }
        await new Promise(r => setTimeout(r, 0));
      }
      const res = G.results[i];
      const s = G.mst.stats;
      return { cleared: !!res, time: res ? Math.round(res.time) : null, room: (G.room || 0) + 1, simT: Math.round(n * dt), log, cpuErrs: [...CPU.errs],
        stash: s.stash, total: s.coinsTotal, steals: s.steals, floods: s.floods, gold: s.gold.join('+'), roomT: s.roomT.map(x => Math.round(x)).join(','),
        medal: res && res.stats ? (res.stats.find(x => typeof x === 'string') || '').split(' ')[0] : '' };
    }, { name, human, seed, maxT, trace, from });
    const want = SCRIPTS[name];
    const ok = want ? r.cleared : !r.cleared;
    if (!ok) bad++;
    if (trace) console.log(r.log.join('\n'));
    console.log(`${ok ? 'ok  ' : 'BAD '} ${name.padEnd(9)} you=${human ? 'Bo ' : 'Pip'} s${seed} ${r.cleared ? 'CLEARED ' + r.time + 's ' + r.medal : 'stuck in room ' + r.room + ' at ' + r.simT + 's'} coins ${r.stash}/${r.total} steals ${r.steals} floods ${r.floods} rooms ${r.roomT} ${r.gold ? 'help ' + r.gold : ''}${r.cpuErrs.length ? ' CPU ERR ' + r.cpuErrs : ''}${errors.length ? ' PAGE ERR ' + errors.slice(0, 2).join(' | ') : ''}`);
  }
  console.log(bad ? bad + ' BAD' : 'all ok');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
