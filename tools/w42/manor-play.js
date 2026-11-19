#!/usr/bin/env node
// 42-3 Spook Manor: walk the level with computer players (drawing off: K3D.noRender) and report how it went.
// Usage: node tools/w42/manor-play.js [--who=pair|noisy|kid|idle] [--clumsy=0|1] [--max=600] [--seeds=1,2] [--trace=5]
//        [--from=<clock index>]
//   pair   the computer plays both                          must escape, with most wisps and few Frights
//   noisy  one side (--clumsy, default Pip) is a distracted person: stops pressing now and then
//   wrong  one side (--clumsy) is a plain-rules person for the first 12 s in each room it reaches (--how=ahead|back|mash|freeze)
//   kid    one side is the computer a whole second late on every press (and 0.3 s late steering)
//   idle   Pip presses nothing: the level must not finish
// Prints wisps, Frights, Scare Outs, spooks unwound, hides, the medal, and where every Fright happened.
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const who = opt('who', 'pair'), how = opt('how', 'mash'), maxT = +opt('max', 600), seeds = opt('seeds', '1').split(',').map(Number);
const clumsy = +opt('clumsy', 0), trace = +opt('trace', 0), from = +opt('from', 0);
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  await page.addInitScript(() => {
    const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    let seeded = gen(1); const other = gen(12345);
    window.__inStep = false; window.__seed = n => { seeded = gen((n >>> 0) || 1); };
    Math.random = () => (window.__inStep ? seeded() : other());
  });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  for (const seed of seeds) {
    errors.length = 0;
    const r = await page.evaluate(async ({ who, how, maxT, seed, clumsy, trace, from }) => {
      const P = window.__pipbo, G = P.G, K3D = P.K3D;
      const i = P.LEVELS.findIndex(l => l.mode === 'parkmanor');
      window.__seed(seed * 7919);
      G.manual = true; K3D.noRender = true;
      P.CPU.errs.clear(); P.CPU.skillOf = [null, null];
      G.cpuOn = who === 'idle' ? [false, true] : [true, true];
      const nz = { pause: 0, next: 3 + Math.random() * 6 }, late = [];
      P.CPU.filter = (p, out, dt) => {
        if (p.id !== clumsy) return out;
        if (who === 'noisy') {
          if (nz.pause > 0) { nz.pause -= dt; return {}; }
          if ((nz.next -= dt) <= 0) { nz.pause = 0.5 + Math.random() * 1.5; nz.next = 5 + Math.random() * 8; }
          return out;
        }
        // the kid: every button a whole second late, steering 0.3 s late (a person still sees where they walk; a 1 s
        // steering lag in a closed loop just circles every corner, which is the test, not a player)
        // a person written as plain rules for the first 12 s of every room, then the computer again: runs ahead (away),
        // runs back (towards the gate), mashes every button, or stands frozen. The pair must still get out.
        if (who === 'wrong') {
          const z = G.mst.zone; nz.seen = nz.seen || {}; if (z !== nz.zone) { nz.zone = z; nz.zt = nz.seen[z] ? 99 : 0; nz.seen[z] = 1; } nz.zt += dt;
          if (nz.zt < 12) {
            if (how === 'freeze') return {};
            if (how === 'ahead') return { ax: Math.sin(nz.zt * 0.7) * 0.6, ay: -1 };
            if (how === 'back') return { ax: Math.cos(nz.zt * 0.5) * 0.6, ay: 1 };
            if (how === 'mash') { if ((nz.m = (nz.m || 0) - dt) <= 0) { nz.m = 0.3; nz.o = { ax: Math.random() * 2 - 1, ay: Math.random() * 2 - 1, act: Math.random() < 0.5 }; } return nz.o; }
          }
          return out;
        }
        if (who === 'kid') { late.push(Object.assign({}, out)); const btn = late.length > 120 ? late[late.length - 121] : {}, mv = late.length > 36 ? late[late.length - 37] : {};
          if (late.length > 130) late.shift(); const r = Object.assign({}, btn); r.ax = mv.ax || 0; r.ay = mv.ay || 0; return r; }
        return out;
      };
      delete G.results[i];
      P.loadLevel(i);
      G.introT = 0;
      const st0 = G.mst;
      if (from > 0) { st0.hasLantern = st0.hasKey = true; st0.restart = from; for (const id in st0.doors) if (id !== 'front') P.MODES.parkmanor && PARKMANOR.openDoor(st0, id); PARKMANOR.restartAt(st0); }
      const steps = Math.round(maxT / P.DT), every = trace ? Math.round(trace / P.DT) : 0, lines = [], frights = [];
      let n = 0, lastF = 0, lastS = 0; const zt = {};
      while (n < steps && G.mode === 'play') {
        for (let k = 0; k < 600 && n < steps && G.mode === 'play'; k++, n++) {
          window.__inStep = true;
          if (who === 'idle') { const p0 = G.players[0]; for (const key in p0.input) p0.input[key] = false; }
          P.step(P.DT);
          window.__inStep = false;
          const s = G.mst;
          zt[s.zone] = (zt[s.zone] || 0) + P.DT;
          if (s.frights > lastF) { lastF = s.frights; const f = s.fx.filter(x => x.k === 'fright').pop(); frights.push((f ? ['P', 'B'][f.who] + ':' + (f.by || 'butler') : 'butler') + '@' + s.zone + '(' + G.players[0].b3.x.toFixed(0) + ',' + G.players[0].b3.z.toFixed(0) + ')'); }
          if (s.scareOuts > lastS) { lastS = s.scareOuts; frights.push('SCARE OUT ' + s.scareWhy); }
          if (every && n % every === 0) { const a = G.players[0].b3, b = G.players[1].b3; lines.push(`${(n * P.DT).toFixed(1)}s ${s.phase} ${s.zone} P(${a.x.toFixed(1)},${a.z.toFixed(1)}) B(${b.x.toFixed(1)},${b.z.toFixed(1)}) beam ${s.beam ? 1 : 0} key ${s.keyWhat}${s.keyHold.toFixed(1)} wisps ${s.wisps} clock ${s.restart} hidden ${s.hidden || '-'} butler ${s.butler.state}${s.boss && s.boss.state !== "idle" ? " BOSS " + s.boss.state + s.boss.turns + " (" + s.boss.x.toFixed(1) + "," + s.boss.z.toFixed(1) + ") f" + s.boss.face.toFixed(1) + (s.boss.lit ? " lit" : "") + " hold" + s.boss.holdT.toFixed(1) : ""} spooks ${s.spooks.filter(q => !['down', 'done', 'dormant'].includes(q.state)).map(q => q.id + ':' + q.state[0] + '(' + q.x.toFixed(1) + ',' + q.z.toFixed(1) + ')').join(' ')} wnd ${s.wound.map(w => w.def.id).join(',')} ${P.CPU.bubbles.map(b => (b && b.t > 0 ? '"' + b.text + '"' : '')).join(' ')}`); }
        }
        await new Promise(r => setTimeout(r, 0));
      }
      const s = G.mst, res = G.results[i];
      return { simT: +(n * P.DT).toFixed(1), cleared: !!res, medal: res && res.medal && res.medal.tier, zone: s.zone, phase: s.phase,
        wisps: s.wisps, max: PARKMANOR.wispsMax(), frights: s.frights, scare: s.scareOuts, unwound: s.unwound, hides: s.hideN || 0, caught: s.caughtN,
        zt: Object.entries(zt).map(([k, v]) => k + ' ' + v.toFixed(0)).join(', '), list: frights, cpuErrs: [...P.CPU.errs], trace: lines, at: G.players.map(p => p.b3.x.toFixed(1) + ',' + p.b3.z.toFixed(1)).join(' ') };
    }, { who, how, maxT, seed, clumsy, trace, from });
    if (r.trace.length) console.log(r.trace.join('\n'));
    console.log(`${who}${who === 'noisy' || who === 'kid' || who === 'wrong' ? '(' + ['Pip', 'Bo'][clumsy] + (who === 'wrong' ? ' ' + how : '') + ')' : ''} s${seed}: ${r.cleared ? 'ESCAPED' : 'NOT DONE (' + r.phase + ' in ' + r.zone + ' at ' + r.at + ')'} in ${r.simT}s  wisps ${r.wisps}/${r.max} (${Math.round(r.wisps / r.max * 100)}%)  frights ${r.frights}  scare outs ${r.scare}  unwound ${r.unwound}  hides ${r.hides}  caught ${r.caught}${r.medal != null ? '  medal ' + r.medal : ''}\n  time: ${r.zt}${r.list.length ? '\n  ' + r.list.join(' ') : ''}${r.cpuErrs.length ? '\n  CPU ERR ' + r.cpuErrs : ''}${errors.length ? '\n  PAGE ERR ' + errors.slice(0, 3).join(' | ').slice(0, 600) : ''}`);
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
