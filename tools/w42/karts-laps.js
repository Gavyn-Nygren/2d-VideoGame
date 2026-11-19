#!/usr/bin/env node
// 42-4 Go-Kart Grand Prix: lap pace by Opponent setting. Flags are switched off (no breakaway, no line flag) and each
// kart runs alone in turn against a kart parked far away, so there is no slipstream, bumping or prize fight: only
// how fast that setting gets round. Prints three lap times, wall hits (and where), drifts and boosts.
// Usage: node tools/w42/karts-laps.js [--skills=easy,normal,hard] [--seeds=1,2] [--laps=3] [--prizes] [-v] [--person=keys|keysd|center]
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const skills = opt('skills', 'easy,normal,hard').split(','), seeds = opt('seeds', '1,2').split(',').map(Number), laps = +opt('laps', 3), prizes = args.includes('--prizes'), verbose = args.includes('-v'), person = opt('person', '');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.addInitScript(() => {
    const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    let seeded = gen(1); window.__seed = n => { seeded = gen((n >>> 0) || 1); }; Math.random = () => seeded();
  });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  for (const skill of skills) for (const seed of seeds) {
    const r = await page.evaluate(({ skill, seed, laps, prizes, verbose, person }) => {
      const P = window.__pipbo, G = P.G, TR = PARKKARTS_TRACK;
      const i = P.LEVELS.findIndex(l => l.mode === 'parkkarts');
      window.__seed(seed * 7919);
      G.manual = true; P.K3D.noRender = true; P.CPU.skillOf = [skill, skill]; G.cpuOn = [true, true];
      // --person: a scripted person drives instead of the computer (keys: on-off steering down the middle, no drift;
      // keysd: the same holding drift through bends; center: a smooth stick down the middle, drifting the bends)
      const errTo = (k, x, z) => { const want = Math.atan2(x - k.x, z - k.z); return -Math.atan2(Math.sin(want - k.yaw), Math.cos(want - k.yaw)); };
      const keysFor = (e, dead) => (e > dead ? { right: true } : e < -dead ? { left: true } : {});
      const human = () => { const k = G.mst.karts[0]; let t = 0; for (let d = 2; d < 20; d += 2) t += TR.at(k.s + d).turn * 2;
        const mid = d => { const q = TR.pos(k.s + d, 0); return errTo(k, q[0], q[1]); };
        if (person === 'keys') return keysFor(mid(9), 0.08);
        if (person === 'keysd') return Object.assign(keysFor(mid(9), 0.08), { jump: Math.abs(t) > 0.7 });
        return { ax: Math.max(-1, Math.min(1, mid(8 + k.v * 0.5) * 2.2)), jump: Math.abs(t) > 0.9 && k.spark < 2 }; };
      P.CPU.filter = (p, out) => (p.id === 1 ? { down: true } : person ? human() : prizes ? out : Object.assign({}, out, { act: false }));
      const keep = PARKKARTS.S.LIMIT; PARKKARTS.S.LIMIT = 1e9;
      delete G.results[i]; P.loadLevel(i); G.introT = 0;
      const st0 = G.mst; st0.nextLapAt = 1e9;
      const times = [], wallAt = {}, hits = [], vAt = []; window.__v = verbose; let t = 0, lastLap = 0, lastWalls = 0, n = 0;
      while (times.length < laps && n < 120 * 400) {
        P.step(P.DT); n++; t += P.DT;
        const st = G.mst; st.nextLapAt = 1e9; if (!prizes) st.karts[0].prize = null;
        const k = st.karts[0];
        // the parked kart is kept out of the way (and out of the crane's hands)
        const o = st.karts[1]; o.stuckT = 0; o.crane = null;
        if (k.walls > lastWalls) { lastWalls = k.walls; const part = TR.PARTS[TR.partAt(k.s)]; wallAt[part] = (wallAt[part] || 0) + 1; if (window.__v && times.length === 1) hits.push(`s${k.s.toFixed(0)}${k.on >= 0 ? ' in ' + TR.branches[k.on].name + ' bs' + k.bs.toFixed(0) : ''} lat${k.lat.toFixed(1)} hard${(k.wallHard || 0).toFixed(2)} v${k.v.toFixed(1)}${k.drift ? ' D' : ''}`); }
        if (times.length === 1 && Math.floor(k.s / 25) > vAt.length - 1) vAt.push(k.v.toFixed(0));
        if (k.lap > times.length) { times.push(+(t - lastLap).toFixed(1)); lastLap = t; }
      }
      PARKKARTS.S.LIMIT = keep;
      const k = G.mst.karts[0];
      return { hits, vAt, times, walls: k.walls, wallAt, drifts: k.drifts || 0, boosts: k.boosts, chain: k.bestChain, cranes: k.cranes, took: k.took || {} };
    }, { skill, seed, laps, prizes, verbose, person });
    if (verbose) { console.log('   lap 2 walls: ' + r.hits.join(' | ')); console.log('   lap 2 speed every 25 units: ' + r.vAt.join(' ')); }
    console.log(`${(person || skill).padEnd(6)} s${seed}: laps ${r.times.join(' ')}  walls ${r.walls} ${JSON.stringify(r.wallAt)} drifts ${r.drifts} boosts ${r.boosts} chain ${r.chain} cranes ${r.cranes} took ${JSON.stringify(r.took)}`);
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
