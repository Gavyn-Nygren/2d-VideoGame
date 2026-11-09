#!/usr/bin/env node
// Movement and physics check: plays levels in headless Chromium with the computer and with random button mashing,
// and watches every physics step for things that should never happen:
//   nan      a player's position or speed, or any number in the level's own state (G.mst), is NaN or infinite
//   wall     a living player's body sits inside solid tiles for more than 0.1 s (levels that use the shared tile physics)
//   lost     a living player is far outside the screen for more than 1 s (shared tile physics only)
//   speed    a living player moves faster than anything in the game should (shared tile physics only)
//   warp     (only shown with --warp) a living player moved more than 45 px in a single step; many levels do this on purpose
//   freefall a living player fell more than 2500 px without landing or being caught
//   rocket   a living player moved faster than 3000 px/s for 4 steps in a row
//   offscreen  a living player stayed outside the picture for 4 s (check: some levels hide a player on purpose)
//   shake    a living player's position flips direction every step for 20 steps (a visible jitter)
//   stuck    a living player pressed left, right and jump for 8 s without moving at all (check: some jobs sit still)
//   error    the page threw an error
//   unfinished  (--who=cpu only) a computer pair could not finish the level in --max seconds
// Needs Playwright (require('playwright')) and Chromium.
//
// Usage (from the repo folder):
//   node tools/physics-check.js [levels|all] [--who=cpu|mash|mix] [--seeds=1,2] [--max=240] [--json]
//   --allwalls  also run the wall check in levels that move the players themselves (shown as wall?; many keep the
//               players in their own coordinates, so a wall? there only means something if the level uses the tile map)
//   --deep      also run the shake test on the level's own moving things (cars, balls, boats: anything in G.mst with x, y)
//   --who=cpu   the computer plays both characters (gets deep into every level)
//   --who=mash  both characters mash random buttons (walks into every wall, corner and edge near the start)
//   --who=mix   the computer plays both, but each one mashes random buttons for a second or two now and then (default)
'use strict';
const path = require('path');
const { chromium } = require('playwright');

const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const flag = k => args.includes('--' + k);
const levelsArg = args.find(a => !a.startsWith('--')) || 'all';
const who = opt('who', 'mix'), maxT = +opt('max', 240);
const seeds = opt('seeds', '1').split(',').map(Number);

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  await page.addInitScript(() => {
    const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    let seeded = gen(1); const other = gen(12345);
    window.__inStep = false;
    window.__seed = n => { seeded = gen((n >>> 0) || 1); };
    window.__gen = gen;
    Math.random = () => (window.__inStep ? seeded() : other());
  });
  await page.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const list = await page.evaluate(() => window.__pipbo.LEVELS.map((l, i) => ({ i, code: window.__pipbo.levelCode(i), name: l.name, kind: l.kind })));
  const want = levelsArg === 'all' ? list
    : levelsArg.split(',').flatMap(s => (/^w\d+$/.test(s) ? list.filter(l => l.code.startsWith(s.slice(1) + '-')) : list.filter(l => l.code === s || String(l.i) === s)));
  const results = [];
  for (const lv of want) for (const seed of seeds) {
    errors.length = 0;
    const t0 = Date.now();
    const r = await page.evaluate(async ({ i, who, maxT, seed, ALLWALLS, DEEP }) => {
      const P = window.__pipbo, G = P.G, T = P.T, W = 960, H = 540;
      window.__seed(seed * 7919);
      window.__inStep = true;
      G.manual = true;
      P.CPU.skillOf = ['normal', 'normal'];
      P.CPU.errs.clear();
      G.cpuOn = [true, true];
      // random button mashing, with its own random numbers so it can't change the game's
      const rnd = window.__gen(seed * 104729 + 17);
      const mash = [0, 1].map(() => ({ t: 0, out: {}, burst: 0, next: 2 + rnd() * 5 }));
      const pick = m => {
        const r = rnd();
        m.out = { left: r < 0.4, right: r >= 0.4 && r < 0.8, jump: rnd() < 0.45, down: rnd() < 0.12, up: rnd() < 0.12, act: rnd() < 0.3 };
        m.t = 0.05 + rnd() * rnd() * 1.4;
      };
      P.CPU.filter = (p, out, dt) => {
        const m = mash[p.id];
        if (who === 'cpu') return out;
        if (who === 'mix') {
          if (m.burst > 0) m.burst -= dt;
          else { m.next -= dt; if (m.next <= 0) { m.burst = 0.5 + rnd() * 2; m.next = 3 + rnd() * 7; } return out; }
        }
        m.t -= dt;
        if (m.t <= 0) pick(m);
        return m.out;
      };
      delete G.results[i];
      P.loadLevel(i);
      window.__inStep = false;

      const found = {}; // kind -> { n, first }
      const note = (kind, what) => { const f = found[kind] || (found[kind] = { n: 0, first: what }); f.n++; };
      const stamp = n => `t=${(n * P.DT).toFixed(2)}s room ${G.room || 0}`;
      const inWall = [0, 0], lost = [0, 0];
      let prev = null, prevKey = '', deep = [], deepKey = '';
      // per player: a run of steps falling, a run of steps shaking, and an 8 s window for "can't move"
      const tr = [0, 1].map(() => ({ fall: 0, jx: 0, jy: 0, ldx: 0, ldy: 0, w0: 0, wx: 0, wy: 0, wmove: 0, wl: 0, wr: 0, wj: 0, path: 0 }));
      const shared = () => { const d = G.level.def; return !d.ownStep && !G.golf && !G.pong; };
      // how deep a player's body is inside solid tiles (0 when clear)
      const embedded = p => {
        const x1 = p.x + 2, x2 = p.x + p.w - 2, y1 = p.y + 2, y2 = p.y + p.h - 2;
        for (let ty = Math.floor(y1 / T); ty <= Math.floor(y2 / T); ty++) for (let tx = Math.floor(x1 / T); tx <= Math.floor(x2 / T); tx++) {
          if (ty < 0 || ty >= 18 || tx < 0 || tx >= 32) continue;
          if (solidFor(tile(tx, ty), p)) return { tx, ty, ch: tile(tx, ty) };
        }
        return null;
      };
      const scan = (o, pathStr, depth, seen, budget) => {
        if (depth > 6 || budget.n <= 0 || !o || typeof o !== 'object' || seen.has(o)) return null;
        seen.add(o);
        if (o instanceof Element || o instanceof CanvasRenderingContext2D || o instanceof Set || o instanceof Map || ArrayBuffer.isView(o)) return null;
        const keys = Array.isArray(o) ? o.keys() : Object.keys(o);
        for (const k of keys) {
          const v = o[k];
          budget.n--;
          if (typeof v === 'number') { if (!Number.isFinite(v) && !(v === Infinity || v === -Infinity)) return pathStr + '.' + k + '=' + v; }
          else if (v && typeof v === 'object') { const r = scan(v, pathStr + '.' + k, depth + 1, seen, budget); if (r) return r; }
        }
        return null;
      };
      const steps = Math.round(maxT / P.DT);
      let n = 0;
      try {
        while (n < steps && G.mode === 'play') {
          for (let k = 0; k < 600 && n < steps && G.mode === 'play'; k++, n++) {
            window.__inStep = true;
            P.step(P.DT);
            window.__inStep = false;
            const sh = shared();
            // warp: a living player moved more than 45 px in one step (a respawn, a new room or a new round doesn't count)
            const key = (G.room || 0) + '/' + (G.match ? G.match.round + G.match.phase : '') + '/' + G.level.def.name;
            if (prev && key === prevKey) for (const p of G.players) {
              const q = prev[p.id];
              if (p.alive && q.alive && Number.isFinite(p.x) && Math.hypot(p.x - q.x, p.y - q.y) > 45) note('warp', `${stamp(n)} ${['Pip', 'Bo'][p.id]} ${q.x.toFixed(0)},${q.y.toFixed(0)} -> ${p.x.toFixed(0)},${p.y.toFixed(0)}`);
            }
            for (const p of G.players) {
              const q = prev && prev[p.id], t = tr[p.id];
              if (!q || key !== prevKey || !p.alive || !q.alive) { t.fall = 0; t.fast = 0; t.off = 0; t.jx = 0; t.jy = 0; t.ldx = 0; t.ldy = 0; t.w0 = n; t.wx = p.x; t.wy = p.y; t.wmove = 0; t.wl = 0; t.wr = 0; t.wj = 0; if (key !== prevKey) t.path = 0; continue; }
              const dx = p.x - q.x, dy = p.y - q.y;
              // freefall: falling without a stop for more than 2500 px
              if (dy > 0.5) { t.fall += dy; if (t.fall > 2500) { note('freefall', `${stamp(n)} ${['Pip', 'Bo'][p.id]} fell ${t.fall.toFixed(0)} px without landing, now at ${p.x.toFixed(0)},${p.y.toFixed(0)}`); t.fall = 0; } } else t.fall = 0;
              // shake: the position flips direction every single step
              if (Math.abs(dy) > 0.3 && Math.abs(t.ldy) > 0.3 && Math.sign(dy) !== Math.sign(t.ldy)) { if (++t.jy === 20) note('shake', `${stamp(n)} ${['Pip', 'Bo'][p.id]} shakes up and down by ${Math.abs(dy).toFixed(1)} px at ${p.x.toFixed(0)},${p.y.toFixed(0)}`); } else t.jy = 0;
              if (Math.abs(dx) > 0.3 && Math.abs(t.ldx) > 0.3 && Math.sign(dx) !== Math.sign(t.ldx)) { if (++t.jx === 20) note('shake', `${stamp(n)} ${['Pip', 'Bo'][p.id]} shakes left and right by ${Math.abs(dx).toFixed(1)} px at ${p.x.toFixed(0)},${p.y.toFixed(0)}`); } else t.jx = 0;
              t.ldx = dx; t.ldy = dy;
              // rocket: faster than 3000 px/s for 4 steps in a row (a single-step jump is a warp, usually on purpose)
              if (Math.hypot(dx, dy) > 25) { if (++t.fast === 4) note('rocket', `${stamp(n)} ${['Pip', 'Bo'][p.id]} moving ${Math.hypot(dx, dy).toFixed(0)} px a step at ${p.x.toFixed(0)},${p.y.toFixed(0)}`); } else t.fast = 0;
              // offscreen: alive but out of the picture for 4 s
              if (p.x < -40 || p.x > W + 40 - p.w || p.y > H + 30 || p.y < -260) { if (++t.off === 480) note('offscreen', `${stamp(n)} ${['Pip', 'Bo'][p.id]} out of view for 4 s at ${p.x.toFixed(0)},${p.y.toFixed(0)}`); } else t.off = 0;
              // stuck: 8 s of pressing left, right and jump without moving at all, after having moved in this room
              t.path += Math.abs(dx) + Math.abs(dy);
              t.wmove = Math.max(t.wmove, Math.abs(p.x - t.wx), Math.abs(p.y - t.wy));
              if (p.input.left) t.wl++; if (p.input.right) t.wr++; if (p.input.jump) t.wj++;
              if (n - t.w0 >= 960) {
                if (t.wmove < 1 && t.wl > 60 && t.wr > 60 && t.wj > 60 && t.path > 60 && !(G.match && G.match.phase !== 'live') && G.introT <= 0) note('stuck', `${stamp(n)} ${['Pip', 'Bo'][p.id]} did not move for 8 s at ${p.x.toFixed(0)},${p.y.toFixed(0)} while pressing buttons`);
                t.w0 = n; t.wx = p.x; t.wy = p.y; t.wmove = 0; t.wl = 0; t.wr = 0; t.wj = 0;
              }
            }
            prev = G.players.map(p => ({ x: p.x, y: p.y, alive: p.alive })); prevKey = key;
            for (const p of G.players) {
              if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.vx) || !Number.isFinite(p.vy)) note('nan', `${stamp(n)} ${['Pip', 'Bo'][p.id]} x=${p.x} y=${p.y} vx=${p.vx} vy=${p.vy}`);
              if (!p.alive) { inWall[p.id] = 0; lost[p.id] = 0; continue; }
              const e = (sh || ALLWALLS) && embedded(p);
              if (!sh && e) { if (++inWall[p.id] === 13) note('wall?', `${stamp(n)} ${['Pip', 'Bo'][p.id]} at ${p.x.toFixed(1)},${p.y.toFixed(1)} inside tile ${e.tx},${e.ty} '${e.ch}'`); continue; }
              if (!sh) { inWall[p.id] = 0; lost[p.id] = 0; continue; }
              if (e) { if (++inWall[p.id] === 13) note('wall', `${stamp(n)} ${['Pip', 'Bo'][p.id]} at ${p.x.toFixed(1)},${p.y.toFixed(1)} inside tile ${e.tx},${e.ty} '${e.ch}'`); } else inWall[p.id] = 0;
              const out = p.x < -60 || p.x > W + 60 || p.y < -500 || p.y > H + 70;
              if (out) { if (++lost[p.id] === 121) note('lost', `${stamp(n)} ${['Pip', 'Bo'][p.id]} at ${p.x.toFixed(1)},${p.y.toFixed(1)}`); } else lost[p.id] = 0;
              if (Math.abs(p.vx) > 1300 || Math.abs(p.vy) > 1600) note('speed', `${stamp(n)} ${['Pip', 'Bo'][p.id]} vx=${p.vx.toFixed(0)} vy=${p.vy.toFixed(0)}`);
            }
            // --deep: the same shake test on the level's own things (anything in G.mst with x and y, up to 3 levels down)
            if (DEEP && G.mst) {
              if (n % 240 === 0 || deepKey !== key) {
                deepKey = key; deep = [];
                const walk = (o, name, d) => {
                  if (!o || typeof o !== 'object' || d > 3 || deep.length > 60 || o instanceof Set || o instanceof Map || ArrayBuffer.isView(o)) return;
                  if (typeof o.x === 'number' && typeof o.y === 'number') deep.push({ o, name, lx: o.x, ly: o.y, ldx: 0, ldy: 0, jx: 0, jy: 0 });
                  if (Array.isArray(o)) { if (o.length <= 8) o.forEach((v, k) => walk(v, name + '[' + k + ']', d + 1)); return; }
                  for (const k of Object.keys(o)) if (!/fx|part|pops|trail|spark|dust|conf|smoke|drops|stars/i.test(k)) walk(o[k], name + '.' + k, d + 1);
                };
                walk(G.mst, 'mst', 0);
              }
              for (const t of deep) {
                const dx = t.o.x - t.lx, dy = t.o.y - t.ly; t.lx = t.o.x; t.ly = t.o.y;
                if (Math.abs(dy) > 0.3 && Math.abs(t.ldy) > 0.3 && Math.sign(dy) !== Math.sign(t.ldy)) { if (++t.jy === 20) note('shake-thing', `${stamp(n)} ${t.name} shakes up and down by ${Math.abs(dy).toFixed(1)} px at ${t.o.x.toFixed(0)},${t.o.y.toFixed(0)}`); } else t.jy = 0;
                if (Math.abs(dx) > 0.3 && Math.abs(t.ldx) > 0.3 && Math.sign(dx) !== Math.sign(t.ldx)) { if (++t.jx === 20) note('shake-thing', `${stamp(n)} ${t.name} shakes left and right by ${Math.abs(dx).toFixed(1)} px at ${t.o.x.toFixed(0)},${t.o.y.toFixed(0)}`); } else t.jx = 0;
                t.ldx = dx; t.ldy = dy;
              }
            }
            if (n % 40 === 0 && G.mst) { const bad = scan(G.mst, 'mst', 0, new Set(), { n: 20000 }); if (bad) note('nan', `${stamp(n)} ${bad}`); }
          }
          await new Promise(r => setTimeout(r, 0));
        }
      } catch (err) { note('error', `${stamp(n)} ${err && err.stack ? err.stack.split('\n').slice(0, 3).join(' | ') : err}`); }
      P.CPU.filter = null;
      return { mode: G.mode, simT: Math.round(n * P.DT), room: G.room || 0, done: !!G.results[i], found, cpuErrs: [...P.CPU.errs] };
    }, { i: lv.i, who, maxT, seed, ALLWALLS: flag('allwalls'), DEEP: flag('deep') });
    if (errors.length) r.found.error = r.found.error || { n: errors.length, first: errors[0].slice(0, 400) };
    if (who === 'cpu' && !r.done) r.found.unfinished = { n: 1, first: `still in room ${r.room} after ${r.simT}s` };
    r.seed = seed; r.code = lv.code; r.name = lv.name; r.wallS = Math.round((Date.now() - t0) / 100) / 10;
    results.push(r);
    if (!flag('json')) {
      const kinds = Object.keys(r.found).filter(k => k !== 'warp' || flag('warp'));
      console.log(`${r.code.padEnd(5)} ${r.name.padEnd(26)} ${who} s${seed} ${kinds.length ? 'FOUND ' + kinds.map(k => k + '×' + r.found[k].n).join(' ') : 'ok'}  [${r.done ? 'finished' : 'room ' + r.room}, sim ${r.simT}s, wall ${r.wallS}s]`);
      for (const k of kinds) console.log(`        ${k}: ${r.found[k].first}`);
    }
  }
  if (flag('json')) console.log(JSON.stringify(results, null, 1));
  const bad = results.filter(r => Object.keys(r.found).some(k => k !== 'warp' || flag('warp'))).length;
  if (!flag('json')) console.log(`--- ${results.length} runs, ${bad} with findings`);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
