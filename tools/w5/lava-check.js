#!/usr/bin/env node
// 5-4 Rising Lava: checks the towers with the computer's own way-finder (cpuNav's copy of the game physics).
//   node tools/w5/lava-check.js [tower numbers, e.g. 1,3]
// For every tower:
//   1. play it "on paper": each player reaches what they can, presses every button of theirs they can reach (its
//      steps appear), until nothing changes. Both must reach the door (and their stars, with the hatch then open).
//   2. no skipping: every group of steps must be needed by the player it holds. With all the steps built except that
//      group, its player must reach less (a button, a checkpoint row or the door). Otherwise someone could climb past a
//      partner's job without them.
//   3. checkpoints: both spots are reachable, not inside a block, and no group cell sits on a spot.
// Prints a line per problem and "ok" per tower. Needs Playwright + Chromium (like tools/cpu-test.js).
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const want = (process.argv[2] || '').split(',').filter(Boolean).map(Number);

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  if (process.env.DEBUG) await page.evaluate(() => { window.__lvDebug = true; });
  const res = await page.evaluate(want => {
    const P = window.__pipbo, G = P.G, i = P.LEVELS.findIndex(l => l.name === 'Rising Lava'), def = P.LEVELS[i], out = [];
    P.loadLevel(i);
    for (let k = 0; k < def.rooms.length; k++) {
      if (want.length && !want.includes(k + 1)) continue;
      const lines = [], say = s => lines.push(s);
      G.level = parseLevel(roomDef(def, k)); G.room = k;
      const st = G.mst = {};
      MODES.lava.setup(st, G.level);
      MODES.lava.enter(st);
      const N = st.N, opts = { rows: N, r0: 0, r1: N - 1 };
      const groups = Object.values(st.groups);
      const setGroups = on => { for (const gr of groups) for (const cl of gr.cells) st.tall[cl.r][cl.c] = on.has(gr.g) ? gr.tile : '.'; };
      const hatch = open => { for (const h of st.hatch) st.tall[h.r][h.c] = open ? '.' : 'P'; };
      // the cells a player reaches from a start cell (cpuNav's map, fresh each time)
      const reach = (p, from) => {
        NAV.cache[p.id] = null;
        const g = navGraph(p, opts), seen = new Set(), todo = [];
        const s = g.at.get(from.r * COLS + from.c) || navGoal(g, from.c * T + T / 2, (from.r + 1) * T);
        if (!s) return { g, seen };
        seen.add(s.i); todo.push(s.i);
        while (todo.length) { const u = todo.pop(); for (const e of g.cells[u].edges) if (!seen.has(e.to)) { seen.add(e.to); todo.push(e.to); } }
        return { g, seen, has: (c, r) => { const n = g.at.get(r * COLS + c); return !!n && seen.has(n.i); } };
      };
      const ps = G.players, startCell = st.spawn.map(s => ({ c: Math.floor((s.x + PW / 2) / T), r: Math.round((s.y + PH) / T) - 1 }));
      const door = st.door && { c: Math.floor(st.door.x / T), r: Math.round((st.door.y + st.door.h) / T) - 1 };
      // 1. on paper
      const built = new Set(); let open = false, pressed = new Set();
      for (let loop = 0; loop < 60; loop++) {
        setGroups(built); hatch(open);
        const R = [0, 1].map(id => reach(ps[id], startCell[id]));
        let changed = false;
        for (const b of st.buttons) if (!pressed.has(b.ch) && R[b.owner].has(b.c, b.r)) { pressed.add(b.ch); if (window.__lvDebug) say("press " + b.ch); if (st.groups[b.group]) built.add(b.group); changed = true; }
        if (!open && st.twins.length && st.twins.every(tw => R[tw.owner].has(tw.c, tw.r))) { open = true; changed = true; }
        if (!changed) {
          if (window.__lvDebug) say("Bo cells " + R[1].seen.size + " Pip cells " + R[0].seen.size + " built " + [...built].join(""));
          for (const b of st.buttons) if (!pressed.has(b.ch)) say(`button ${b.ch} (${['Pip', 'Bo'][b.owner]}) at ${b.c},${N - 1 - b.r} never reached`);
          if (door) for (const id of [0, 1]) if (!R[id].has(door.c, door.r) && !R[id].has(door.c + 1, door.r)) say(`${['Pip', 'Bo'][id]} can't reach the door`);
          for (const [z, cp] of st.cps.entries()) if (z) for (const id of [0, 1]) { const [c, r] = cp.at[id]; if (!R[id].has(c, r)) say(`${['Pip', 'Bo'][id]} can't reach their checkpoint spot at h${N - 1 - r} (col ${c})`); }
          break;
        }
      }
      // 2. no skipping
      const all = new Set(groups.map(gr => gr.g));
      const score = (id, s) => {   // what the player reaches: their buttons, checkpoint rows and the door
        setGroups(s); hatch(true);
        const R = reach(ps[id], startCell[id]), got = [];
        for (const b of st.buttons) if (b.owner === id && R.has(b.c, b.r)) got.push('b' + b.ch);
        for (const tw of st.twins) if (tw.owner === id && R.has(tw.c, tw.r)) got.push('star');
        for (const [z, cp] of st.cps.entries()) if (z && R.has(cp.at[id][0], cp.at[id][1])) got.push('cp' + z);
        if (door && (R.has(door.c, door.r) || R.has(door.c + 1, door.r))) got.push('door');
        return got.join(' ');
      };
      const full = [score(0, all), score(1, all)];
      for (const gr of groups) {
        const less = new Set(all); less.delete(gr.g);
        const s = score(gr.holder, less);
        if (s === full[gr.holder]) say(`group ${gr.g} isn't needed: ${['Pip', 'Bo'][gr.holder]} reaches the same without it`);
      }
      // 3. checkpoint spots
      setGroups(all);
      for (const [z, cp] of st.cps.entries()) if (z) cp.at.forEach(([c, r], id) => {
        if (groups.some(gr => gr.cells.some(cl => cl.c === c && (cl.r === r || cl.r === r - 1)))) say(`checkpoint ${z} spot of ${['Pip', 'Bo'][id]} has steps on or over it`);
        if (st.tall[r][c] !== '.' || !'#=ou'.includes(st.tall[r + 1][c])) say(`checkpoint ${z} spot of ${['Pip', 'Bo'][id]} isn't standing room`);
      });
      out.push({ k: k + 1, title: roomDef(def, k).title, N, lines, cells: groups.reduce((a, gr) => a + gr.cells.length, 0) });
      MODES.lava.leave(st);
    }
    return out;
  }, want);
  for (const r of res) {
    console.log(`Tower ${r.k} ${r.title} (${r.N} rows, ${r.cells} step cells): ${r.lines.length ? r.lines.length + ' problem(s)' : 'ok'}`);
    for (const l of r.lines) console.log('   ' + l);
  }
  if (errs.length) console.log('page errors: ' + errs.join(' | '));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
