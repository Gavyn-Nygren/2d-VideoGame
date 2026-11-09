#!/usr/bin/env node
// Slinky Stairs adversary: tries to break 24-3 with scripted "people" beyond the ones in slinky-people.js, through the
// real keyboard path (keys + pollInput), and with a few direct rule checks.
//   tapdown   steerer who points and leans like a kid but taps ▼ on a 0.33 s beat all the way down (a Perfect farm):
//             must earn few Perfects.
//   earlyhold flipper who presses and holds while the slinky is still landing / boinging back, then lets go in the
//             green: the stretch must start (no dead button).
//   mashflip  masher at the flipper's seat only (steers like a kid when steering): random timing must cost a lot.
//   napper    a kid who stops pressing anything for 25 s once each flight: the clock must stop, the computer must not
//             run ahead, and the level still clears.
//   lefty     steerer who only ever holds ◀ (and ▼): never clears.
//   + the slinky-people kinds (idle, mash, hold, act, back, wrong, kid, slowkid).
// Direct checks (--checks): a marble that stood still while the slinky stood on its step is predicted where it really
// is; no state leaks into another level; every flight's act labels; perfect only with one press.
// Usage: node tools/w24/slinky-adversary.js [--who=all|name,..] [--seeds=1,2] [--max=600] [--set=leanV:80,leanA:380]
//        [--checks=1]
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const seeds = opt('seeds', '1,2').split(',').map(Number), maxT = +opt('max', 600), whoArg = opt('who', 'all');
const sets = opt('set', '').split(',').filter(Boolean).map(x => x.split(':')).map(([k, v]) => [k, +v]);
const checks = +opt('checks', 1);
// [name, pip, bo, cpu seats, should clear? (null: either), extra test: (r) => problem text or '']
const CASES = [
  ['kid+tapdown', 'kid', 'tapdown', [false, false], true, r => r.tapFrac[1] > 0.2 ? 'tapping farmed ' + r.perfBy[1] + ' perfects' : ''],
  ['tapdown+kid', 'tapdown', 'kid', [false, false], true, r => r.tapFrac[0] > 0.2 ? 'tapping farmed ' + r.perfBy[0] + ' perfects' : ''],
  ['tapdown+cpu', 'tapdown', null, [false, true], true, r => r.tapFrac[0] > 0.2 ? 'tapping farmed ' + r.perfBy[0] + ' perfects' : ''],
  ['earlyhold+kid', 'earlyhold', 'kid', [false, false], true, r => r.deadHold > 0 ? r.deadHold + ' early holds never stretched' : ''],
  ['cpu+earlyhold', null, 'earlyhold', [true, false], true, r => r.deadHold > 0 ? r.deadHold + ' early holds never stretched' : ''],
  ['mashflip+cpu', 'mashflip', null, [false, true], null, r => ''],
  ['cpu+mashflip', null, 'mashflip', [true, false], null, r => ''],
  ['mash+cpu', 'mash', null, [false, true], null, r => r.medal === 'Gold' ? 'a masher got Gold' : ''],
  ['cpu+mash', null, 'mash', [true, false], null, r => r.medal === 'Gold' ? 'a masher got Gold' : ''],
  ['mash+mash', 'mash', 'mash', [false, false], false, r => ''],
  ['napper+cpu', 'napper', null, [false, true], true, r => r.cpuRun > 5 ? 'the computer moved ' + r.cpuRun + ' steps while the person napped' : ''],
  ['cpu+napper', null, 'napper', [true, false], true, r => r.cpuRun > 5 ? 'the computer moved ' + r.cpuRun + ' steps while the person napped' : ''],
  ['napper+napper', 'napper', 'napper', [false, false], true, r => ''],
  ['cpu+lefty', null, 'lefty', [true, false], false, r => ''],
  ['lefty+cpu', 'lefty', null, [false, true], false, r => ''],
  ['kid+idle', 'kid', 'idle', [false, false], false, r => ''],
  ['idle+kid', 'idle', 'kid', [false, false], false, r => ''],
  ['kid+kid', 'kid', 'kid', [false, false], true, r => ''],
  ['slowkid+slowkid', 'slowkid', 'slowkid', [false, false], true, r => ''],
  ['cpu+cpu', null, null, [true, true], true, r => r.medal !== 'Gold' ? 'computer pair not Gold' : ''],
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
  await page.addInitScript({ path: path.join(__dirname, 'slinky-people.js') });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  await page.evaluate(sets => { for (const [k, v] of sets) window.__pipbo.MODES.slinky.SLK[k] = v; }, sets);
  const bad = [];
  if (checks) {
    const c = await page.evaluate(() => {
      const P = window.__pipbo, G = P.G, M = P.MODES.slinky, out = [];
      const idx = P.LEVELS.findIndex(l => l.name === 'Slinky Stairs');
      G.manual = true; G.cpuOn = [false, false]; P.CPU.cfg.players = 2; P.cpuApplyCfg();
      P.loadLevel(idx); G.introT = 0;
      // 1. the marble: stand on a marble step for a while, then check the plan's marble (no lag) against the real one
      for (let r = 0; r < 4; r++) {
        if (r) { P.loadLevel(idx); for (let k = 0; k < r; k++) P.nextRoom(); G.introT = 0; }
        const st = G.mst, ms = st.c.steps.filter(s => s.kind === 'marble');
        for (const s of ms) {
          st.s.on = s.i; st.s.state = 'rest'; st.s.rx = 10;
          for (let i = 0; i < 300; i++) P.step(P.DT);
          st.s.on = s.i - 1 >= 0 ? s.i - 1 : 0; st.s.rx = 20;
          for (let i = 0; i < 3; i++) P.step(P.DT);
          const pred = M.marbleAt(s, st.t), real = s.mx;
          if (Math.abs(pred - real) > 2) out.push(`flight ${r + 1} marble step ${s.i}: plan says x=${pred | 0}, it is at ${real | 0}`);
        }
      }
      // 2. leaks: play a bit, load another level, come back: fresh state
      P.loadLevel(idx); G.introT = 0;
      G.mst.stats.whoas = 5; G.mst.stats.stars = 9;
      P.loadLevel(0); P.step(P.DT);
      P.loadLevel(idx); G.introT = 0; P.step(P.DT);
      if (G.mst.stats.whoas || G.mst.stats.stars || G.mst.s.on !== 0) out.push('state leaked between loads');
      // 3. act labels per flight (6 letters or fewer, flipper says flop)
      for (let r = 0; r < 4; r++) {
        const room = P.LEVELS[idx].rooms[r], f = room.flip;
        if (room.act.labels[f] !== 'flop' || room.act.labels[1 - f] !== 'stick') out.push('flight ' + (r + 1) + ' act labels wrong');
        if (room.act.labels.some(x => x.length > 6)) out.push('act label too long');
      }
      // 4. perfect needs one press: land with two presses in the air
      P.loadLevel(idx); G.introT = 0;
      const st = G.mst, before = st.stats.perfects;
      const pr = G.players[st.steer].input, pf = G.players[st.flip].input;
      let n = 0;
      pf.act = true; for (let i = 0; i < 20; i++) P.step(P.DT);
      while (!st.plan.inZone && n++ < 600) P.step(P.DT);
      pf.act = false; P.step(P.DT);
      let k = 0, landed = false;
      while (st.s.state === 'fly' && k++ < 600) {
        const ttd = st.plan.ttd;
        pr.down = (ttd < 0.55 && ttd > 0.5) || ttd < 0.06;
        P.step(P.DT);
      }
      pr.down = false;
      if (st.stats.perfects !== before) out.push('two presses in the air still gave a Perfect');
      return out;
    });
    console.log(c.length ? 'CHECKS: ' + c.join('; ') : 'checks ok (marble lag, leaks, act labels, one-press perfect)');
    if (c.length) bad.push('checks');
  }
  for (const [name, a, b, cpu, want, extra] of CASES) {
    if (whoArg !== 'all' && !whoArg.split(',').includes(name)) continue;
    for (const seed of seeds) {
      const r = await page.evaluate(({ a, b, cpu, seed, maxT }) => {
        const P = window.__pipbo, G = P.G, people = window.__slinkyPeople;
        window.__seed(seed * 104729);
        let rs = seed * 7 + 3; const rnd = () => { rs = (rs * 16807) % 2147483647; return rs / 2147483647; };
        if (cpu[0] && cpu[1]) { P.CPU.cfg.players = 1; P.CPU.cfg.human = 0; P.cpuApplyCfg(); }
        else if (cpu[0] || cpu[1]) { P.CPU.cfg.players = 1; P.CPU.cfg.human = cpu[0] ? 1 : 0; P.cpuApplyCfg(); } else { P.CPU.cfg.players = 2; P.cpuApplyCfg(); }
        G.cpuOn = cpu.slice();
        G.manual = true;
        P.loadLevel(P.LEVELS.findIndex(l => l.name === 'Slinky Stairs'));
        G.introT = 0;
        P.keys.clear(); people.reset();
        const KB = [{ left: 'KeyA', right: 'KeyD', up: 'KeyW', down: 'KeyS', act: 'KeyF' }, { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown', act: 'Slash' }];
        const mem = [{}, {}];
        const deadAt = [], maxMash = [0, 0], perfBy = [0, 0], landBy = [0, 0];
        let lastPerf = 0, lastLand = 0;
        let deadHold = 0, napping = [false, false], napSteps = 0, cpuRun = 0;
        const extraKinds = {
          tapdown(id, m, st, s, pl) {
            const w = {};
            if (id === st.flip) return null;
            if (s.state === 'rest' && pl.want && s.point !== pl.want) w[pl.want > 0 ? 'right' : 'left'] = true;
            if (s.state === 'teeter' || pl.save) w.down = true;
            if (s.state === 'fly' && pl.lean) w[pl.lean > 0 ? 'right' : 'left'] = true;
            m.beat = ((m.beat || 0) + P.DT) % 0.33;
            if (m.beat < 0.06) w.down = true;
            return w;
          },
          earlyhold(id, m, st, s, pl) {
            if (id !== st.flip) return null;
            const w = {};
            // press while it is landing or boinging back, keep holding, let go in the green
            if (s.state === 'follow' || s.state === 'boing') { w.act = true; m.early = true; m.restT = 0; return w; }
            if (s.state === 'rest' && G.introT > 0) { w.act = !!m.early; return w; }
            if (s.state === 'rest') {
              if (m.early) {
                m.restT += P.DT;
                if (!s.hold && m.restT > 0.4 && !pl.wait && pl.pointOK) { deadHold++; deadAt.push(`t=${G.time.toFixed(1)} r${G.room} on=${s.on} pressT=${st.pressT.toFixed(2)} launchT=${st.launchT.toFixed(2)} slide=${s.slide}`); m.early = false; return w; }
                if (s.hold) m.early = false; else { w.act = true; return w; }
              }
              if (s.hold) { w.act = !(pl.zone && !pl.wait && pl.pointOK && Math.abs(s.m - pl.zone.mc) < 0.03); return w; }
              if (pl.pointOK && !pl.wait) { m.go = (m.go || 0) + P.DT; if (m.go > 0.3) { w.act = true; m.go = 0; } }
            }
            return w;
          },
          mashflip(id, m, st, s, pl) {
            if (id !== st.flip) return null;
            m.t = (m.t || 0) - P.DT;
            if (m.t <= 0) { m.t = 0.06 + rnd() * 0.12; m.held = rnd() < 0.6; }
            return { act: m.held };
          },
          lefty() { return { left: true, down: rnd() < 0.5 }; },
        };
        const drive = (id, kind) => {
          if (!kind) return;
          const st = G.mst, s = st.s, pl = st.plan, m = mem[id];
          if (kind === 'napper') {
            // naps 25 s once each flight, 8 s after it starts
            m.room = m.room == null ? -1 : m.room;
            if (m.room !== G.room) { m.room = G.room; m.napAt = G.time + 8; m.napDone = false; m.napEnd = 0; m.napN = 0; }
            if (!m.napDone && G.time >= m.napAt && m.napN === 0) { m.napN = 1; m.napEnd = 25 / P.DT; }
            if (m.napEnd > 0) {
              m.napEnd--; napping[id] = true;
              if (m.napEnd <= 0) { m.napDone = true; napping[id] = false; }
              for (const k in KB[id]) P.keys.delete(KB[id][k]);
              return;
            }
            people.drive(id, 'kid', P, rnd);
            // (a person who sees "Taking a break... press anything" presses something)
            if (st.waiting) P.keys.add(KB[id].down);
            return;
          }
          const f = extraKinds[kind];
          if (!f) { people.drive(id, kind, P, rnd); return; }
          if (G.mode !== 'play' || !st.s) return;
          let w = f(id, m, st, s, pl);
          if (w === null) { people.drive(id, 'kid', P, rnd); return; }
          for (const k of ['left', 'right', 'up', 'down', 'act']) { if (w[k]) P.keys.add(KB[id][k]); else P.keys.delete(KB[id][k]); }
        };
        let n = 0, lastOn = -1, room = 0, nanAt = '', waitT = 0;
        while (n < maxT / P.DT && G.mode === 'play') {
          drive(0, a); drive(1, b);
          P.pollInput(P.DT); P.step(P.DT); n++;
          const st = G.mst;
          if (st.waiting) waitT += P.DT;
          if (st.mash) for (const q of [0, 1]) maxMash[q] = Math.max(maxMash[q], st.mash[q]);
          if (st.stats.perfects > lastPerf) perfBy[st.steer] += st.stats.perfects - lastPerf;
          if (st.stats.landings > lastLand) landBy[st.steer] += st.stats.landings - lastLand;
          lastPerf = st.stats.perfects; lastLand = st.stats.landings;
          const anyNap = napping[0] || napping[1];
          if (anyNap && st.s.on !== lastOn && st.s.state === 'rest' && G.room === room) { napSteps++; }
          if (!anyNap && napSteps) { cpuRun = Math.max(cpuRun, napSteps); napSteps = 0; }
          if (st.s.state === 'rest') lastOn = st.s.on;
          if (G.room !== room) { room = G.room; lastOn = -1; napSteps = 0; }
          const fp = P.MODES.slinky.front(st);
          if (!nanAt && st.c && ![fp.x, fp.y, st.cam, st.s.m, st.s.rx].every(Number.isFinite)) nanAt = 't=' + G.time.toFixed(1);
        }
        const st = G.mst, res = G.mode !== 'play' ? G.lmode.stats() : null;
        return { mode: G.mode, t: +G.time.toFixed(1), real: +(n * P.DT).toFixed(0), room: G.room, on: st.s.on, whoas: st.stats.whoas, perf: st.stats.perfects,
          perfFrac: st.stats.perfects / Math.max(1, st.stats.landings), flops: st.stats.flops, landings: st.stats.landings, helps: st.stats.helps,
          stars: st.stats.stars + '/' + st.starsAll, deadHold, deadAt, cpuRun, tapFrac: [0, 1].map(q => perfBy[q] / Math.max(1, landBy[q])), perfBy, maxMash: maxMash.map(x => x.toFixed(1)).join('/'), waitT: +waitT.toFixed(0), nanAt, medal: res ? res[3].value : '-' };
      }, { a, b, cpu, seed, maxT });
      const cleared = r.mode !== 'play';
      let prob = want === null || want === cleared ? '' : (cleared ? 'cleared but should not' : 'did not clear');
      const ex = extra(r); if (ex) prob += (prob ? '; ' : '') + ex;
      if (r.nanAt) prob += ' NaN ' + r.nanAt;
      if (prob) bad.push(name + ' s' + seed + ': ' + prob);
      if (r.deadAt.length) console.log('      early holds that never stretched: ' + r.deadAt.join(' | '));
      console.log(`${prob ? 'BAD ' : 'ok  '} ${name.padEnd(16)} s${seed} ${r.mode} t=${r.t} (sim ${r.real}s, waited ${r.waitT}s) flight ${r.room + 1} step ${r.on} flops ${r.flops} landings ${r.landings} whoas ${r.whoas} perf ${r.perf} helps ${r.helps} stars ${r.stars} medal ${r.medal} mash ${r.maxMash} perfects by steerer ${r.perfBy.join('/')} ${prob}`);
    }
  }
  console.log(bad.length ? 'PROBLEMS:\n  ' + bad.join('\n  ') : 'all as expected');
  if (errors.length) console.log('ERRORS:\n' + [...new Set(errors)].join('\n'));
  await browser.close();
  process.exit(bad.length || errors.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
