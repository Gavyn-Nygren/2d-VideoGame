#!/usr/bin/env node
// Cloud Bridge Builder "break it" test: scripted people play 21-3 through the real keyboard path (keys + pollInput),
// alone with the computer (1-player mode) or as two people, and the script watches for page errors, NaN, players off
// screen, stuck stretches, and a level that clears when it shouldn't (one idle / silly player) or doesn't when it should.
// Usage: node tools/w21/cloudbridge-break.js [--only=name,name] [--seeds=1,2]
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const only = opt('only', ''), seeds = opt('seeds', '1').split(',').map(Number);

// people: [pip, bo] (a 'cpu' side is the computer, which turns on 1-player mode); want: 'clear' | 'stuck' | 'any'
const SCEN = [
  { name: 'both-idle', who: ['idle', 'idle'], max: 200, want: 'stuck' },
  { name: 'pip-mash+bo-person', who: ['mash', 'brain'], max: 500, want: 'any' },
  { name: 'idle+cpu', who: ['idle', 'cpu'], max: 200, want: 'stuck' },
  { name: 'cpu+idle', who: ['cpu', 'idle'], max: 200, want: 'stuck' },
  { name: 'backwards+cpu', who: ['back', 'cpu'], max: 200, want: 'stuck' },
  { name: 'holdact+cpu', who: ['holdact', 'cpu'], max: 200, want: 'stuck' },
  { name: 'onlyact+cpu', who: ['onlyact', 'cpu'], max: 200, want: 'stuck' },
  { name: 'cpu+onlyact', who: ['cpu', 'onlyact'], max: 200, want: 'stuck' },
  { name: 'mash+cpu', who: ['mash', 'cpu'], max: 400, want: 'any' },
  { name: 'partnerjob+cpu', who: ['swapjob', 'cpu'], max: 300, want: 'any' },
  { name: 'person+cpu', who: ['brain', 'cpu'], max: 500, want: 'clear' },
  { name: 'cpu+person', who: ['cpu', 'brain'], max: 500, want: 'clear' },
  { name: 'kid+cpu', who: ['kid', 'cpu'], max: 600, want: 'clear' },
  { name: 'cpu+kid', who: ['cpu', 'kid'], max: 600, want: 'clear' },
  { name: 'kid+kid', who: ['kid', 'kid'], max: 600, want: 'clear' },
  { name: 'lifthog+person', who: ['hog', 'brain'], room: 3, max: 200, want: 'clear' },
  { name: 'lifthog+cpu', who: ['hog', 'cpu'], room: 3, max: 200, want: 'clear' },
  { name: 'person+lifthog', who: ['brain', 'hog'], room: 3, max: 200, want: 'clear' },
  { name: 'cpu+lifthog', who: ['cpu', 'hog'], room: 3, max: 200, want: 'clear' },
  { name: 'person+person', who: ['brain', 'brain'], max: 400, want: 'clear' },
];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.addInitScript(() => {
    const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    let seeded = gen(1); const other = gen(999);
    window.__inStep = false;
    window.__seed = n => { seeded = gen((n >>> 0) || 1); };
    Math.random = () => (window.__inStep ? seeded() : other());
  });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  let bad = 0;
  for (const sc of SCEN) {
    if (only && !only.split(',').includes(sc.name)) continue;
    for (const seed of seeds) {
      errors.length = 0;
      const r = await page.evaluate(({ sc, seed }) => {
        const P = window.__pipbo, G = P.G;
        window.__seed(seed * 101);
        // our own random for the scripted people (never the game's)
        let rs = seed * 7777 + 1; const rnd = () => { rs ^= rs << 13; rs >>>= 0; rs ^= rs >> 17; rs ^= rs << 5; rs >>>= 0; return rs / 4294967296; };
        const cpuSide = sc.who.indexOf('cpu');
        if (cpuSide >= 0) { P.CPU.cfg.players = 1; P.CPU.cfg.human = 1 - cpuSide; P.cpuApplyCfg(); }
        else { P.CPU.cfg.players = 2; P.cpuApplyCfg(); G.cpuOn = [false, false]; }
        P.CPU.filter = null; P.keys.clear();
        G.manual = true;
        P.loadLevel(P.LEVELS.findIndex(l => l.name === 'Cloud Bridge Builder'));
        for (let k = 0; k < (sc.room || 0); k++) P.nextRoom();
        G.introT = 0;
        const KB = [{ left: 'KeyA', right: 'KeyD', jump: 'KeyW', down: 'KeyS', act: 'KeyF' }, { left: 'ArrowLeft', right: 'ArrowRight', jump: 'ArrowUp', down: 'ArrowDown', act: 'Slash' }];
        const brain = P.CPU.brains.cloudbridge, S = [{}, {}], last = [{}, {}], kid = [{ pause: 0, next: 4 }, { pause: 0, next: 5 }], mash = [{ t: 0, r: {} }, { t: 0, r: {} }];
        brain.reset(S[0]); brain.reset(S[1]);
        let lastRoom = G.room;
        const think = (id, swap) => {
          const p = G.players[id], o = G.players[1 - id];
          let st = G.mst;
          if (swap) st = Object.assign(Object.create(Object.getPrototypeOf(st)), st, { caller: st.builder, builder: st.caller });
          const info = { L: G.level, def: G.level.def, mst: st, room: G.room, skill: 1, partnerCpu: true, partnerIdle: 0, frozen: false, intro: G.introT > 0, time: G.time };
          return brain.think(S[id], p, o, P.DT, info) || {};
        };
        const person = (id, kind, t, dt) => {
          switch (kind) {
            case 'idle': return {};
            case 'back': return { left: true, jump: rnd() < 0.01 };
            case 'holdact': return { act: true, right: t % 6 < 4 };
            case 'onlyact': return { act: 'tap' };
            case 'mash': { const m = mash[id]; m.t -= dt; if (m.t <= 0) { m.t = 0.1 + rnd() * 0.3; m.r = { left: rnd() < 0.3, right: rnd() < 0.5, jump: rnd() < 0.3, down: rnd() < 0.15, act: rnd() < 0.5 }; } return m.r; }
            case 'hog': {
              // rides the lift up alone, then stands there doing nothing for 20 s, then plays properly
              const h = S[id], st = G.mst, g = st.pl[id].ground;
              if (h.hogT == null) {
                if (g && g.kind === 'lift' && g.top <= g.high + 1) h.hogT = 0;
                else if (g && g.kind === 'lift') return { right: (g.x0 + g.x1) / 2 > G.players[id].x + st.camX + 11 };
                else return g && st.lifts.some(L => Math.abs(g.x1 - L.x0) < 2) ? { right: true } : think(id, false);
              }
              h.hogT += dt;
              if (h.hogT < 20) return {};
              return think(id, false);
            }
            case 'swapjob': return think(id, true);
            case 'brain': return think(id, false);
            case 'kid': {
              const k = kid[id], r = think(id, false);
              if (k.pause > 0) { k.pause -= dt; return {}; }
              k.next -= dt;
              if (k.next <= 0) { k.pause = 0.5 + rnd() * 2.5; k.next = 3 + rnd() * 7; }
              if (rnd() < 0.3 * dt) r.jump = true;
              if (rnd() < 0.2 * dt) r.act = true;
              return r;
            }
          }
          return {};
        };
        const log = { nan: 0, offscreen: 0, maxSep: 0, rooms: [], stuckRooms: 0, chips: {}, news: {} };
        let t = 0, roomT = 0, lastBest = -1, sinceBest = 0, maxSince = 0;
        while (t < sc.max && (G.mode === 'play' || G.mode === 'clear')) {
          if (G.room !== lastRoom) { log.rooms.push(+roomT.toFixed(0)); roomT = 0; lastRoom = G.room; brain.reset(S[0]); brain.reset(S[1]); }
          for (const p of G.players) {
            if (G.cpuOn[p.id]) continue;
            const r = person(p.id, sc.who[p.id], t, P.DT);
            for (const k of ['left', 'right', 'jump', 'down', 'act']) {
              const want = r[k] === 'tap' ? !last[p.id][k] : !!r[k];
              last[p.id][k] = want;
              if (want) P.keys.add(KB[p.id][k]); else P.keys.delete(KB[p.id][k]);
            }
          }
          window.__inStep = true;
          P.pollInput(P.DT); P.step(P.DT);
          window.__inStep = false;
          t += P.DT; roomT += P.DT;
          const st = G.mst;
          if (!st || !st.isles) continue;
          for (const p of G.players) {
            if (!isFinite(p.x) || !isFinite(p.y)) log.nan++;
            if (p.alive && (p.x + p.w < -4 || p.x > 964)) log.offscreen++;
          }
          log.maxSep = Math.max(log.maxSep, Math.abs(G.players[0].x - G.players[1].x));
          const best = st.pl[0].best + st.pl[1].best + st.k * 100;
          if (best !== lastBest) { lastBest = best; sinceBest = 0; } else sinceBest += P.DT;
          maxSince = Math.max(maxSince, sinceBest);
          if (st.news) log.news[st.news.s] = 1;
        }
        const st = G.mst;
        return { mode: G.mode, room: G.room, t: +t.toFixed(1), state: st.state, boings: st.stats.boings, puffs: st.stats.puffs, calls: st.stats.calls, gold: st.goldUsed,
          stars: st.stats.stars, rooms: log.rooms, nan: log.nan, off: log.offscreen, maxSep: Math.round(log.maxSep), maxStill: Math.round(maxSince),
          news: Object.keys(log.news).filter(s => /Hint|Gold/.test(s)).slice(0, 6), result: G.mode === 'result' || G.mode === 'over' || !!st.cleared };
      }, { sc, seed });
      const cleared = r.result || r.mode !== 'play';
      const ok = (sc.want === 'clear' ? cleared : sc.want === 'stuck' ? !cleared : true) && !errors.length && !r.nan && r.off < 60;
      if (!ok) bad++;
      console.log((ok ? 'ok   ' : 'BAD  ') + sc.name + ' s' + seed + ': ' + JSON.stringify(r));
      if (errors.length) console.log('  ERRORS: ' + errors.slice(0, 5).join(' | '));
    }
  }
  console.log(bad ? bad + ' BAD' : 'all ok');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
