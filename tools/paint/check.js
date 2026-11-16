#!/usr/bin/env node
// 4-4 Paint the Floor checks, two computers playing:
//   node tools/paint/check.js [--seeds=1,2,3] [--skills=normal,normal] [--rounds=2]
// For every floor (each seed plays --rounds rounds on each floor) it prints: round wins per side, average paint %,
// splats, bounces, warps and rollers per player per round, and the longest time either player stood still.
// It also checks each floor's map: every paint cell's tile must be reachable for the computer from both spawns.
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const seeds = opt('seeds', '1,2,3').split(',').map(Number), skills = opt('skills', 'normal,normal').split(','), rounds = +opt('rounds', 2);
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1100, height: 640 } });
  const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.addInitScript(() => {
    const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    let r = gen(1); window.__seed = n => { r = gen((n >>> 0) || 1); }; Math.random = () => r();
  });
  await page.goto('file://' + path.resolve(__dirname, '../../index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const res = await page.evaluate(({ seeds, skills, rounds }) => {
    const P = window.__pipbo, G = P.G, i = P.LEVELS.findIndex(l => l.mode === 'paint'), nf = P.LEVELS[i].floors.length;
    const out = [], M = P.MODES.paint, orig = M.paintCell;
    let tally = null;
    // where the paint comes from: cells turned by walking, splashes (splats, head-splats, the bucket) and rollers
    M.paintCell = function (ci, k, splat, roll) { const r = orig.call(this, ci, k, splat, roll); if (r > 0 && tally) tally[roll ? 2 : splat ? 1 : 0]++; return r; };
    for (let f = 0; f < nf; f++) out.push({ name: P.LEVELS[i].floors[f].name, wins: [0, 0, 0], pct: [0, 0], splats: [0, 0], bounces: [0, 0], warps: [0, 0], rollers: [0, 0], n: 0, still: 0, unreach: null, src: [0, 0, 0] });
    for (const seed of seeds) {
      window.__seed(seed * 7919);
      G.manual = true; G.cpuOn = [true, true]; P.CPU.skillOf = skills.slice();
      P.loadLevel(i); G.introT = 0;
      for (let f = 0; f < nf; f++) for (let r = 0; r < rounds; r++) {
        // put the match on a fresh round on floor f (round f + 1), nobody near a win
        let m = G.match, guard = 0;
        const goLive = () => { let g = 0; while (G.match.phase !== 'live' && g++ < 5000) P.step(P.DT); m = G.match; };
        goLive();
        while ((G.mst.floorI !== f || m.roundT > 0.1) && guard++ < 20) {
          m.round = f + 1; m.wins = [0, 0]; m.ties = 0; G.mst.count = [0, 0]; G.mst.lead = [0, 0]; m.timeLeft = 0.001; // (a tied round replays this round number)
          let g = 0; while (m.phase === 'live' && g++ < 100) P.step(P.DT);
          goLive();
        }
        const st = G.mst, s0 = JSON.parse(JSON.stringify(st.stats)), O = out[f];
        if (!O.unreach) {
          // every painted tile reachable from both spawns (over the computer's map)
          O.unreach = [];
          for (const p of G.players) {
            const g = navGraph(p, st.navOpts), from = navGoal(g, p.x + p.w / 2, p.y + p.h), d = new Float64Array(g.cells.length).fill(Infinity);
            d[from.i] = 0; const q = [from.i];
            while (q.length) { const u = q.shift(); for (const e of g.cells[u].edges) if (d[e.to] === Infinity) { d[e.to] = 0; q.push(e.to); } }
            const seen = new Set();
            for (const c of st.cells) {
              const n = g.at.get((c.ty - 1) * COLS + c.tx);
              if ((!n || d[n.i] === Infinity) && !seen.has(c.tx + ',' + c.ty)) { seen.add(c.tx + ',' + c.ty); O.unreach.push(p.id + ':' + c.tx + ',' + (c.ty - 1)); }
            }
          }
        }
        let lastX = G.players.map(p => p.x), stillT = [0, 0];
        tally = O.src;

        guard = 0;
        while (m.phase === 'live' && guard++ < 120 * 60) {
          if (m.phase === 'live') {
            G.players.forEach((p, k) => { if (Math.abs(p.x - lastX[k]) < 0.5 && p.grounded) stillT[k] += P.DT; else stillT[k] = 0; O.still = Math.max(O.still, stillT[k]); lastX[k] = p.x; });
          }
          const was = m.phase; P.step(P.DT);
          if (was === 'live' && m.phase !== 'live') { const e = m.end; O.wins[e && e.winner >= 0 ? e.winner : 2]++; O.pct[0] += st.count[0] / st.n; O.pct[1] += st.count[1] / st.n; }
          if (G.mode !== 'play') break;
        }
        for (const key of ['splats', 'bounces', 'warps', 'rollers']) for (let k = 0; k < 2; k++) O[key][k] += st.stats[key][k] - s0[key][k];
        O.n++;
        if (G.mode !== 'play') { P.loadLevel(i, 'play', { rematch: true }); G.introT = 0; }
      }
    }
    return out;
  }, { seeds, skills, rounds });
  const f1 = x => x.toFixed(1);
  for (const O of res) {
    const n = O.n || 1;
    console.log(O.name.padEnd(13), 'wins P/B/tie', O.wins.join('/'), '| paint %', (100 * O.pct[0] / n).toFixed(0) + '/' + (100 * O.pct[1] / n).toFixed(0),
      '| splats', O.splats.map(v => f1(v / n)).join('/'), '| bounces', O.bounces.map(v => f1(v / n)).join('/'), '| warps', O.warps.map(v => f1(v / n)).join('/'),
      '| rollers', O.rollers.map(v => f1(v / n)).join('/'), '| paint from walk/splash/roller %', O.src.map(v => Math.round(100 * v / (O.src[0] + O.src[1] + O.src[2] || 1))).join('/'), '| still', f1(O.still) + 's', O.unreach.length ? '| UNREACHABLE ' + O.unreach.join(' ') : '');
  }
  console.log('errors:', errs.slice(0, 5));
  await browser.close();
})();
