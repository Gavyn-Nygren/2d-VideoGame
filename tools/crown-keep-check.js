#!/usr/bin/env node
// 2-4 Crown Keep checks (needs Playwright and Chromium).
//   1. Reach: with the computer's copy of the game physics (cpu-nav), every standable spot can be reached from every
//      other one, both for a normal player and for the crown holder (slower run, lower jump: CROWN_HOLD in js/core.js).
//      It also tries every way up with the REAL game physics (step()): a crown holder standing on each plank-or-floor
//      tile, jumping straight up while steering left, right or not at all, must land on the step above.
//   2. Balance: computer-vs-computer matches, reporting the winner, how often the crown changed hands, the longest
//      single hold, how long the match took and how often the first to grab the crown went on to win.
// Usage: node tools/crown-keep-check.js [--seeds=1,2,3,4,5,6,7,8] [--skills=normal,normal]
'use strict';
const path = require('path');
const { chromium } = require('playwright');

const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const seeds = opt('seeds', '1,2,3,4,5,6,7,8').split(',').map(Number);
const skills = opt('skills', 'normal,normal').split(',');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.addInitScript(() => {
    const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    let seeded = gen(1); const other = gen(12345);
    window.__inStep = false;
    window.__seed = n => { seeded = gen((n >>> 0) || 1); };
    Math.random = () => (window.__inStep ? seeded() : other());
  });
  await page.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const li = await page.evaluate(() => window.__pipbo.LEVELS.findIndex(l => l.name === 'Crown Keep'));

  // 1. reach
  const reach = await page.evaluate(li => {
    const P = window.__pipbo, G = P.G;
    G.manual = true; G.cpuOn = [false, false];
    P.loadLevel(li);
    const p = G.players[0], res = {};
    for (const [name, opts] of [['normal', {}], ['crown holder', { run: CROWN_HOLD.run, jump: CROWN_HOLD.jump }]]) {
      NAV.cache[0] = NAV.spare[0] = null;
      const g = navGraph(p, opts);
      let bad = [];
      for (const a of g.cells) {
        // breadth-first over the moves
        const seen = new Uint8Array(g.cells.length), q = [a.i]; seen[a.i] = 1;
        while (q.length) { const u = q.shift(); for (const e of g.cells[u].edges) if (!seen[e.to]) { seen[e.to] = 1; q.push(e.to); } }
        const miss = g.cells.filter(c => !seen[c.i]);
        if (miss.length) bad.push(`from ${a.tx},${a.ty} can't reach ${miss.slice(0, 4).map(c => c.tx + ',' + c.ty).join(' ')}${miss.length > 4 ? ' +' + (miss.length - 4) : ''}`);
      }
      res[name] = { cells: g.cells.length, bad: bad.slice(0, 6), badCount: bad.length };
    }
    // the real physics: a crown holder hops up from every standing tile that has a step 2 tiles above it
    const L = G.level, tops = [];
    for (let ty = 2; ty < ROWS - 1; ty++) for (let tx = 1; tx < COLS - 1; tx++) {
      const below = tile(tx, ty + 1);
      if (tile(tx, ty) === '.' && (below === '#' || below === '=') && tile(tx, ty - 1) === '=') tops.push({ tx, ty, up: ty - 1 });
    }
    const fails = [];
    G.crown.holder = 0; G.crown.invuln = 999;
    const o = G.players[1];
    for (const s of tops) {
      let ok = false;
      for (const dir of [0, -1, 1]) {
        o.x = 20; o.y = 2 * T; o.alive = false; o.respawnT = 999;
        Object.assign(p, { x: s.tx * T + T / 2 - p.w / 2, y: (s.ty + 1) * T - p.h, vx: 0, vy: 0, alive: true, grounded: true, stun: 0, jumpBuf: 0, coyote: 0.08 });
        P.step(P.DT);
        p.pendingJump = true;
        let landed = false;
        for (let k = 0; k < 120; k++) {
          for (const key in p.input) p.input[key] = false;
          p.input.jump = true; p.input.left = dir < 0; p.input.right = dir > 0;
          P.step(P.DT);
          if (k > 10 && p.grounded) { landed = true; break; }
        }
        const feet = p.y + p.h;
        if (landed && Math.abs(feet - s.up * T) < 2) { ok = true; break; }
      }
      if (!ok) fails.push(s.tx + ',' + s.ty);
    }
    res.realHops = { tried: tops.length, fails };
    return res;
  }, li);
  console.log('Reach (cpu-nav physics, every spot from every spot):');
  for (const k of ['normal', 'crown holder']) console.log(`  ${k.padEnd(13)} ${reach[k].cells} spots, ${reach[k].badCount ? reach[k].badCount + ' spots CAN\'T reach everywhere: ' + reach[k].bad.join('; ') : 'all reach everywhere'}`);
  console.log(`  real physics: crown holder hop up from ${reach.realHops.tried} tiles under a step, ${reach.realHops.fails.length ? 'FAILED at ' + reach.realHops.fails.join(' ') : 'all made it'}`);

  // 2. balance
  console.log(`Balance (${skills.join(' Pip vs ')} Bo):`);
  const tally = { wins: [0, 0, 0], steals: 0, len: 0, longest: 0, firstWins: 0 };
  for (const seed of seeds) {
    const r = await page.evaluate(async ({ li, seed, skills }) => {
      const P = window.__pipbo, G = P.G;
      window.__seed(seed * 7919);
      window.__inStep = true;
      G.manual = true; P.CPU.skillOf = skills.slice(); G.cpuOn = [true, true];
      delete G.results[li];
      P.loadLevel(li);
      window.__inStep = false;
      let n = 0, last = null, since = 0, longest = 0, changes = 0, first = null;
      while (n < 200 / P.DT && G.mode === 'play') {
        window.__inStep = true; P.step(P.DT); window.__inStep = false; n++;
        const h = G.crown ? G.crown.holder : null;
        if (first === null && h !== null) first = h;
        if (h !== last) { if (last !== null && h !== null) changes++; last = h; since = 0; }
        else if (h !== null) { since += P.DT; longest = Math.max(longest, since); }
        if (n % 2000 === 0) await new Promise(r => setTimeout(r, 0));
      }
      const res = G.results[li];
      return { winner: res ? res.winner : null, first, t: n * P.DT, changes, longest, score: G.vs ? G.vs.score.map(s => Math.round(s * 10) / 10) : null };
    }, { li, seed, skills });
    tally.wins[r.winner < 0 ? 2 : r.winner] += r.winner == null ? 0 : 1; tally.steals += r.changes; tally.len += r.t; tally.longest = Math.max(tally.longest, r.longest); if (r.winner === r.first) tally.firstWins++;
    console.log(`  s${seed} ${r.winner == null ? 'no result' : r.winner < 0 ? 'draw' : ['Pip', 'Bo'][r.winner] + ' wins'} in ${r.t.toFixed(1)} s, crown time ${r.score.join(' / ')} s, ${r.changes} steals, longest hold ${r.longest.toFixed(1)} s, first grab ${['Pip', 'Bo'][r.first]}`);
  }
  console.log(`  total: Pip ${tally.wins[0]}, Bo ${tally.wins[1]}, draws ${tally.wins[2]}; average ${(tally.len / seeds.length).toFixed(1)} s and ${(tally.steals / seeds.length).toFixed(1)} steals a match; longest hold ${tally.longest.toFixed(1)} s; the first to grab the crown won ${tally.firstWins} of ${seeds.length}`);
  if (errors.length) console.log('PAGE ERRORS: ' + errors.slice(0, 3).join(' | '));
  await browser.close();
})();
