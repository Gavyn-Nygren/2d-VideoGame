#!/usr/bin/env node
// Kite Tandem break test: scripted "people" play 21-2 through the real keyboard path (keys + pollInput), alone, in
// pairs, and with the computer at the other seat. Prints where each run got to and any page errors.
// Usage: node tools/w21/kite-break.js [--who=all|name,name] [--seeds=1,2] [--max=420]
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const seeds = opt('seeds', '1,2').split(',').map(Number), maxT = +opt('max', 420), whoArg = opt('who', 'all');
// [name, pip script, bo script, cpu seats, should clear?]
const CASES = [
  ['idle+idle', 'idle', 'idle', [false, false], false],
  ['mash+mash', 'mash', 'mash', [false, false], null],
  ['kid+idle', 'kid', 'idle', [false, false], false],
  ['idle+kid', 'idle', 'kid', [false, false], false],
  ['wrongjob+wrongjob', 'wrong', 'wrong', [false, false], false],
  ['back+kid', 'back', 'kid', [false, false], false],
  ['holdall+holdall', 'hold', 'hold', [false, false], false],
  ['act+act', 'act', 'act', [false, false], false],
  ['kid+kid', 'kid', 'kid', [false, false], true],
  ['kidnoside+kidnoside', 'kidv', 'kidv', [false, false], true],
  ['kid+cpu', 'kid', null, [false, true], true],
  ['cpu+kid', null, 'kid', [true, false], true],
  ['kidv+cpu', 'kidv', null, [false, true], true],
  ['mash+cpu', 'mash', null, [false, true], null],
  ['idle+cpu', 'idle', null, [false, true], false],
  ['cpu+idle', null, 'idle', [true, false], false],
  ['cpu+wrong', null, 'wrong', [true, false], false],
];
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.addInitScript(() => {
    const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    let seeded = gen(1); window.__seed = n => { seeded = gen((n >>> 0) || 1); }; Math.random = () => seeded();
  });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const bad = [];
  for (const [name, a, b, cpu, want] of CASES) {
    if (whoArg !== 'all' && !whoArg.split(',').includes(name)) continue;
    for (const seed of seeds) {
      const r = await page.evaluate(({ a, b, cpu, seed, maxT }) => {
        const P = window.__pipbo, G = P.G;
        window.__seed(seed * 104729);
        let rs = seed * 7 + 3; const rnd = () => { rs = (rs * 16807) % 2147483647; return rs / 2147483647; }; // the scripts' own dice
        if (cpu[0] || cpu[1]) { P.CPU.cfg.players = 1; P.CPU.cfg.human = cpu[0] ? 1 : 0; P.cpuApplyCfg(); } else { P.CPU.cfg.players = 2; P.cpuApplyCfg(); }
        G.cpuOn = cpu.slice();
        G.manual = true;
        P.loadLevel(P.LEVELS.findIndex(l => l.name === 'Kite Tandem'));
        G.introT = 0;
        const KB = [{ left: 'KeyA', right: 'KeyD', up: 'KeyW', down: 'KeyS', act: 'KeyF' }, { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown', act: 'Slash' }];
        P.keys.clear();
        const mem = [{ t: 0, held: {} }, { t: 0, held: {} }];
        const delay = [[], []]; // a kid reacts about 0.35 s late: keep a queue of wanted holds
        const drive = (id, kind) => {
          if (!kind) return;
          const st = G.mst, want = {}, isR = id === st.runner, m = mem[id];
          const pl = P.MODES.kite.plan(st), e = st.c && st.c.end;
          if (kind === 'idle') {}
          else if (kind === 'mash') { m.t -= P.DT; if (m.t <= 0) { m.t = 0.08 + rnd() * 0.2; for (const k of ['left', 'right', 'up', 'down', 'act']) m.held[k] = rnd() < 0.4; } Object.assign(want, m.held); }
          else if (kind === 'hold') { want.right = true; want.up = true; want.act = true; }
          else if (kind === 'act') { m.t -= P.DT; if (m.t <= 0) m.t = 0.25; want.act = m.t > 0.15; }
          else if (kind === 'back') { want.left = true; if (rnd() < 0.01) want.up = true; }
          else if (kind === 'wrong') {
            // does the partner's job: as the runner steers like a rider (▲ ▼, tuck), as the rider runs and jumps
            if (isR) { if (pl.ty != null) { if (st.ky > pl.ty + 10) want.up = true; else if (st.ky < pl.ty - 10) want.down = true; } m.t -= P.DT; if (m.t <= 0) m.t = 0.6; want.act = m.t < 0.05; }
            else { want.right = true; if (rnd() < 0.02) want.up = true; }
          } else if (kind === 'kid' || kind === 'kidv') {
            if (isR) {
              // holds ▶ all the way to the fence, jumps a bit early or late, reels when the prompt says so (late)
              want.right = true;
              if (pl.jump && st.grounded) { const d = pl.jump.dist, early = (pl.jump.kind === 'gap' ? 84 : 100) + (m.jr = d > 150 || m.jr == null ? rnd() * 46 : m.jr); if (d < early) want.up = true; }
              if (pl.needL != null && pl.why !== 'flag' && st.L > pl.needL + 40 && pl.dist < 420) want.down = true;
              if (st.reeling && pl.needL != null && st.L > pl.needL - 30) want.down = true;
              if (e && !e.got && P.MODES.kite.onPad(st)) want.down = false;
            } else {
              if (pl.ty != null && (pl.dist < 380 || pl.why === 'flag')) { const dy = st.ky - pl.ty; if (dy > 22) want.up = true; else if (dy < -22) want.down = true; if (pl.why === 'flag') { if (dy > 0) want.up = true; } }
              if (kind === 'kid' && pl.why === 'flag' && e) { const dx = e.flagX - st.kx; if (dx > 25) want.right = true; else if (dx < -25) want.left = true; }
              if (pl.birds && st.tuck <= 0 && rnd() < 0.03) want.act = true;
            }
            delay[id].push(Object.assign({}, want));
            const lag = kind === 'kid' ? 42 : 48;
            const w = delay[id].length > lag ? delay[id].shift() : {};
            for (const k in want) delete want[k];
            Object.assign(want, w);
          }
          for (const k of ['left', 'right', 'up', 'down', 'act']) { const c = KB[id][k]; if (want[k]) P.keys.add(c); else P.keys.delete(c); }
        };
        let n = 0, room = 0, roomAt = [0], stuck = '', lastX = 0, lastXT = 0, nanAt = '';
        while (G.time < maxT && (G.mode === 'play' || G.mode === 'paused')) {
          if (G.mode === 'paused') break;
          drive(0, a); drive(1, b);
          P.pollInput(P.DT); P.step(P.DT); n++;
          const st = G.mst;
          if (G.room !== room) { room = G.room; roomAt.push(+G.time.toFixed(1)); }
          if (!nanAt && st.c && ![st.rx, st.ry, st.kx, st.ky, st.L, st.th, st.cam.x, st.cam.y].every(Number.isFinite)) nanAt = 't=' + G.time.toFixed(1);
          // camera: both on screen
          if (st.c && st.state === 'run' && !stuck) {
            const ky = st.ky - st.cam.y, kx = st.kx - st.cam.x, ry = st.ry - st.cam.y, rx = st.rx - st.cam.x;
            if (kx < -30 || kx > 990 || ky < -30 || ky > 560 || rx < 0 || rx > 960 || ry < 0 || ry > 560) stuck = 'offscreen t=' + G.time.toFixed(1) + ` k(${kx | 0},${ky | 0}) r(${rx | 0},${ry | 0}) gold=${st.gold | 0} up=${st.up | 0} L=${st.L | 0} th=${st.th.toFixed(2)} wind=${st.wind | 0} grounded=${st.grounded} oops=${!!st.oops} gY=${st.groundY | 0} aY=${st.anchorY | 0} ky=${st.ky | 0} ry=${st.ry | 0} camy=${st.cam.y | 0}`;
          }
        }
        const st = G.mst;
        return { mode: G.mode, t: +G.time.toFixed(1), room, roomAt, state: st.state, rx: st.rx | 0, end: st.c.end && st.c.end.x0, padT: st.c.end && +st.c.end.padT.toFixed(1), got: st.c.end && st.c.end.got,
          tangles: st.stats.tangles, oops: st.stats.oops, helps: st.stats.helps, stars: st.stars + '/' + st.starsAll, stuck, nanAt,
          res: G.mode === 'clear' || G.mode === 'result' ? JSON.stringify(G.lmode.stats()) : '' };
      }, { a, b, cpu, seed, maxT });
      const cleared = r.mode !== 'play';
      const ok = want === null ? true : want === cleared;
      if (!ok || r.stuck || r.nanAt) bad.push(name + ' s' + seed);
      console.log(`${ok && !r.stuck && !r.nanAt ? 'ok  ' : 'BAD '} ${name.padEnd(22)} s${seed} ${r.mode} t=${r.t} room=${r.room + 1}/4 rooms@${r.roomAt.join(',')} rx=${r.rx}/${r.end} pad=${r.padT} flag=${r.got} tangles=${r.tangles} oops=${r.oops} helps=${r.helps} stars=${r.stars} ${r.stuck} ${r.nanAt ? 'NaN ' + r.nanAt : ''}`);
      if (r.res) console.log('      ' + r.res);
    }
  }
  console.log(bad.length ? 'PROBLEMS: ' + bad.join(', ') : 'all as expected');
  if (errors.length) console.log('ERRORS:\n' + [...new Set(errors)].join('\n'));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
