#!/usr/bin/env node
// 25-1 Defend the Heart: plays the level with the computer at the controls and prints what happens over time
// (phase, wave, heart, coins, materials, turrets, each player's job), plus a picture of the fort now and then.
// Usage: node tools/w25/zf-sim.js [--who=pair|noisy|idle] [--max=1800] [--seed=1] [--every=10] [--map=60]
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const probeT = +opt('probe', 0), opt_trace = +opt('trace', 0), who = opt('who', 'pair'), maxT = +opt('max', 1800), seed = +opt('seed', 1), every = +opt('every', 10), mapEvery = +opt('map', 60);
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
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
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const r = await page.evaluate(async ({ who, maxT, seed, every, mapEvery, probeT, opt_trace }) => {
    const P = window.__pipbo, G = P.G, lines = [];
    window.__seed(seed * 7919);
    const i = P.LEVELS.findIndex(l => l.name === 'Defend the Heart');
    G.manual = true; P.CPU.errs.clear();
    G.cpuOn = who === 'idle' || who === 'solo' ? [false, true] : [true, true];
    // the simple "follow and copy" test person of tools/cpu-test.js --who=solo
    const pip = G.players[0];
    const solo = () => {
      const o = G.players[1], inp = pip.input;
      for (const k in inp) inp[k] = false;
      if (!pip.alive) return;
      const dx = (o.x - pip.x);
      inp.left = dx < -40; inp.right = dx > 40;
      const jump = (o.vy < -200 && Math.random() < 0.5) || (Math.abs(pip.vx) < 5 && (inp.left || inp.right) && Math.random() < 0.05);
      if (jump && !pip.prevJump) pip.pendingJump = true;
      pip.prevJump = jump; inp.jump = jump;
      const act = Math.random() < 0.02;
      if (act && !pip.prevAct && G.level.def.act) pip.pendingAct = true;
      pip.prevAct = act; inp.act = act;
    };
    P.CPU.filter = null;
    // (the same random numbers as tools/cpu-test.js: it draws two for its clumsy partner before loading)
    window.__inStep = true; Math.random(); Math.random(); P.loadLevel(i); window.__inStep = false;
    const st = () => G.mst;
    const map = () => {
      const s = st(), rows = [];
      for (let y = 3; y < 18; y++) {
        let r = '';
        for (let x = 0; x < 32; x++) {
          const c = s.cell[y * 32 + x];
          let ch = c ? ({ dirt: c.by < 0 ? ':' : 'd', wood: 'w', stone: c.by < 0 ? '%' : 's', metal: 'M', turret: 'T', bed: '=' })[c.k] : (s.tun[y * 32 + x] ? ',' : ' ');
          if (c && c.by >= 0 && c.hp < c.max) ch = ch.toUpperCase() === ch ? ch.toLowerCase() : ch.toUpperCase();
          for (const z of s.zs) if (z.hp > 0 && z.cx === x && z.cy === y) ch = 'Z';
          for (const p of G.players) if (p.alive && Math.floor((p.x + p.w / 2) / 30) === x && Math.floor((p.y + p.h - 1) / 30) === y) ch = p.id ? 'B' : 'P';
          r += ch;
        }
        rows.push(String(y).padStart(2) + ' ' + r);
      }
      return rows.join('\n');
    };
    const job = k => { const S = P.CPU.st[k]; const j = S && S.job; return j ? j.kind + ':' + (j.key || '') + '@' + j.tx + ',' + j.ty : (S && S.air ? 'AIR' : '-'); };
    const steps = Math.round(maxT / P.DT); let n = 0, lastWave = 1, waveStart = {};
    while (n < steps && G.mode === 'play') {
      for (let k = 0; k < 1200 && n < steps && G.mode === 'play'; k++, n++) {
        window.__inStep = true;
        if (who === 'idle') for (const key in G.players[0].input) G.players[0].input[key] = false;
        if (who === 'solo') solo();
        P.step(P.DT);
        window.__inStep = false;
        const s = st();
        for (const k of [0, 1]) { const b = P.CPU.bubbles[k]; const t = b && b.t > 0 ? b.text : ''; if (t && t !== (window.__lastB || [])[k]) lines.push(`  ${(n * P.DT).toFixed(1)}s ${k ? 'Bo' : 'Pip'} says "${t}"`); (window.__lastB = window.__lastB || [])[k] = t; }
        if (s.wave !== lastWave) { lines.push(`  ${(n * P.DT).toFixed(0)}s wave ${lastWave} cleared, heart ${s.heart.toFixed(0)} coins ${s.coins}`); lastWave = s.wave; }
        if (s.phase === 'wave' && !waveStart[s.wave]) { waveStart[s.wave] = 1; lines.push(`  ${(n * P.DT).toFixed(0)}s wave ${s.wave} starts (${s.waveTotal} zombies)`); }
        if (n % Math.round(every / P.DT) === 0) {
          lines.push(`${(n * P.DT).toFixed(0).padStart(5)}s ${s.phase} w${s.wave} bT ${s.buildT.toFixed(0)} heart ${s.heart.toFixed(0)} coins ${s.coins} res d${s.res.dirt} w${s.res.wood} s${s.res.stone} guns ${s.gun} zs ${s.zs.length} hp ${s.php.map(v => Math.round(v))} | P ${job(0)} | B ${job(1)}`);
        }
        if (mapEvery && n % Math.round(mapEvery / P.DT) === 0) lines.push(map());
        // --probe=T: what Bo's planner would choose at time T, and what it has put aside
        if (opt_trace && n * P.DT > probeT && n * P.DT < probeT + opt_trace && n % 6 === 0) {
          const p = G.players[1], q = G.players[0], S = P.CPU.st[1];
          lines.push(`T ${(n * P.DT).toFixed(2)} Bo ${(p.x + p.w / 2).toFixed(0)},${(p.y + p.h).toFixed(0)}${p.grounded ? 'g' : 'a'} f${p.face} in ${Object.entries(p.input).filter(e => e[1]).map(e => e[0]).join('')} job ${S.job ? S.job.kind + ':' + S.job.key + '@' + S.job.tx + ',' + S.job.ty : '-'} nav ${S.nav && S.nav.status} hold ${JSON.stringify(s.hold[1])} | Pip ${(q.x + q.w / 2).toFixed(0)},${(q.y + q.h).toFixed(0)} in ${Object.entries(q.input).filter(e => e[1]).map(e => e[0]).join('')}`);
        }
        if (probeT && Math.abs(n * P.DT - probeT) < P.DT / 2) {
          const B = P.CPU.brains.zombiefort, p = G.players[1], S = P.CPU.st[1], g = B.dbg.mapInfo(S, p), from = p.grounded ? navFrom(g, p) : null;
          { const N = S.nav, gg = navGraph(p, {}), here = navFrom(gg, p); lines.push('PROBE nav ' + JSON.stringify({ status: N && N.status, cur: N && N.cur, here: here && [here.tx, here.ty], onP: p.onPartner, stun: p.stun, knock: p.knockT, vx: p.vx, x: p.x, last: P.CPU.last[1], out: B.think(S, p, G.players[0], P.DT, P.cpuInfo ? P.cpuInfo(p) : { mst: s, partnerCpu: false }) })); }
          lines.push('PROBE job ' + JSON.stringify(from && B.dbg.buildJob(S, s, p, G.players[0], { partnerCpu: who !== 'solo' && who !== 'idle' }, g, from)) + ' blocked ' + JSON.stringify(Object.fromEntries(Object.entries(S.block).filter(([k, v]) => v > G.time))) + ' carry ' + s.carry + ' turrets ' + s.cell.filter(c => c && c.k === 'turret').length);
        }
      }
      await new Promise(r => setTimeout(r, 0));
    }
    const s = st();
    lines.push(map());
    lines.push(`end: mode ${G.mode} sim ${(n * P.DT).toFixed(0)}s waves ${s.stats.waves} phase ${s.phase} downs ${s.stats.downs} hits ${s.stats.hits} built ${s.stats.built} downed ${s.stats.downed} turret ${s.stats.turret} cpuErrs ${[...P.CPU.errs]}`);
    return lines.join('\n');
  }, { who, maxT, seed, every, mapEvery, probeT, opt_trace });
  console.log(r);
  if (errors.length) console.log('PAGE ERRORS:\n' + errors.slice(0, 10).join('\n'));
  await browser.close();
})();
