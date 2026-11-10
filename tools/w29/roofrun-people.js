#!/usr/bin/env node
// Scripted "people" for 29-1 Rooftop Moonlight Run, playing with the computer partner (or with each other).
//   node tools/w29/roofrun-people.js [persona,...] [--seeds=1,2] [--max=600]
// Each person writes p.input / pendingJump / pendingAct directly (G.cpuOn has the person's seat false, so the level
// sees a real 1-player game: prompts, idle break, gold help gates). They read MODES.roofrun.plan / nav, the same thing
// the on-screen prompts show. Personas: good, kid (1 s slow to start each beat, 0.35 s late on timing), late5 (0.5 s
// late on timing), masher, holdright, wrongjob, wrongway, pause20, idle, and duo (two scripted people, no computer).
// Prints per persona and seat: clear? time, whoops, helps, medal, longest stall (s without crossing a gap or a stretch).
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const ALL = ['good', 'kid', 'late5', 'masher', 'holdright', 'wrongjob', 'wrongway', 'pause20', 'idle', 'duo', 'duokid'];
const want = (args.find(a => !a.startsWith('--')) || ALL.join(',')).split(',');
const trace = +opt('trace', 0), seatOnly = opt('seat', '');
const seeds = opt('seeds', '1,2').split(',').map(Number), maxT = +opt('max', 600);

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.addInitScript(() => {
    const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    let r = gen(1); window.__seed = n => { r = gen((n >>> 0) || 1); }; Math.random = () => r();
  });
  await page.goto('file://' + path.resolve(__dirname, '../../index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  for (const who of want) for (const seat of (who.startsWith('duo') ? [0] : seatOnly ? [+seatOnly] : [0, 1])) for (const seed of seeds) {
    errs.length = 0;
    const r = await page.evaluate(({ who, seat, seed, maxT, trace, args }) => {
      const P = window.__pipbo, G = P.G, M = P.MODES.roofrun, i = P.LEVELS.findIndex(l => l.mode === 'roofrun');
      window.__seed(seed * 101 + seat);
      G.manual = true; P.CPU.filter = null; P.CPU.skillOf = [null, null];
      const duo = who.startsWith('duo');
      G.cpuOn = duo ? [false, false] : seat === 0 ? [false, true] : [true, false];
      P.loadLevel(i);
      const people = duo ? [0, 1] : [seat];
      const mem = people.map(() => ({ prev: {}, phaseKey: '', since: 0, fire: 0, armed: true, t: 0 }));
      const persona = duo ? (who === 'duokid' ? 'kid' : 'good') : who;
      // what a person who follows the prompts would press (no delay)
      const follow = (st, id) => {
        const pl = M.plan(st), thr = id === st.thr, w = thr ? pl.thr : pl.swg, me = st.run[id], o = {};
        if (me.st === 'run') { const nv = M.nav(st, id, w.x); if (nv.dir > 0) o.right = true; if (nv.dir < 0) o.left = true; if (nv.jump) o.jump = true; }
        else if (me.st === 'swing') { if (w.dir > 0) o.right = true; if (w.dir < 0) o.left = true; }
        o.act = w.act; o.pl = pl; o.timing = (thr && pl.phase === 'throw' && pl.aiming) || (!thr && pl.onRope);
        return o;
      };
      const press = (id, o, m) => {
        const p = G.players[id], inp = p.input;
        for (const k in inp) inp[k] = false;
        inp.left = !!o.left; inp.right = !!o.right; inp.down = !!o.down; inp.up = !!o.up;
        const j = !!o.jump, a = o.act === 'tap' ? !m.prev.act : !!o.act;
        if (j && !m.prev.jump) p.pendingJump = true;
        if (a && !m.prev.act) p.pendingAct = true;
        inp.jump = j; inp.act = a; m.prev = { jump: j, act: a };
      };
      const DT = P.DT;
      const think = (id, m) => {
        const st = G.mst; m.t += DT;
        if (!st || !st.c || st.state !== 'go') return {};
        const o = follow(st, id), pl = o.pl, key = G.room + ':' + st.gi + ':' + pl.phase + ':' + (pl.onRope ? 1 : 0);
        if (key !== m.phaseKey) { m.phaseKey = key; m.since = 0; m.fire = 0; m.armed = true; } else m.since += DT;
        const late = persona === 'kid' ? 0.35 : persona === 'late5' ? 0.5 : 0.18;
        // timing beats: react `late` s after the cue lights up (and only once per lit window)
        if (o.timing) {
          const lit = o.act === 'tap';
          o.act = false;
          if (m.fire > 0) { m.fire -= DT; if (m.fire <= 0) { o.act = 'tap'; m.armed = false; } }
          else if (lit && m.armed) m.fire = late;
          if (!lit && m.fire <= 0) m.armed = true;
        }
        if (persona === 'kid' && m.since < 1) return {};
        if (persona === 'idle') return {};
        if (persona === 'holdright') return { right: true };
        if (persona === 'masher') { m.mt = (m.mt || 0) - DT; if (m.mt <= 0) { m.mt = 0.12 + Math.random() * 0.25; m.mash = { right: Math.random() < 0.7, left: Math.random() < 0.15, jump: Math.random() < 0.5, act: Math.random() < 0.5 }; } return m.mash; }
        if (m.room !== G.room) { m.room = G.room; m.roomT = 0; } m.roomT += DT;
        if (persona === 'wrongway' && m.roomT < 10) return { left: true, jump: m.roomT % 2 < 0.05 };
        if (persona === 'pause20' && m.t > 40 && m.t < 60) return {};
        if (persona === 'wrongjob') {
          // tries to do the partner's job whenever it is the partner's turn: as the swinger runs to the edge and presses
          // the action to throw; as the thrower presses the action while the swinger should grab, and runs ahead
          const thr = id === st.thr, theirs = thr ? pl.phase === 'swing' && !pl.onRope : pl.phase === 'throw';
          if (theirs && m.since % 5 < 3) { const nv = M.nav(st, id, pl.g ? pl.g.xL - 30 : null); return { right: nv.dir > 0, left: nv.dir < 0, jump: nv.jump, act: Math.random() < 0.1 ? 'tap' : false }; }
        }
        return o;
      };
      const tr = [];
      let lastW = 0;
      let n = 0, lastProg = 0, stall = 0, progKey = '';
      const steps = Math.round(maxT / DT);
      while (n < steps && G.mode === 'play') {
        people.forEach((id, k) => press(id, think(id, mem[k]), mem[k]));
        P.step(DT); n++;
        if (trace && n % Math.round(trace / DT) === 0) { const st = G.mst, pl = M.plan(st); tr.push((n * DT).toFixed(0) + 's R' + G.room + ' g' + st.gi + ' ' + pl.phase + ' thr' + st.thr + ' ' + st.run.map(q => q.id + ':' + q.st + '@' + Math.round(q.x) + ',' + Math.round(q.y) + ' r' + q.roof + (q.grounded ? 'g' : 'a')).join(' ') + ' gap ' + (pl.g ? Math.round(pl.g.xL) + '-' + Math.round(pl.g.xR) : '') + ' hook ' + st.hook.state); }
        const st = G.mst, pk = G.room + ':' + (st && st.gi);
        if (st && st.stats && st.stats.whoops !== lastW) { lastW = st.stats.whoops; const q = st.run.find(q => q.st === 'cart'); if (q && args.verbose) tr.push('  whoops ' + (n * DT).toFixed(1) + 's R' + G.room + ' g' + st.gi + ' who ' + q.id + (q.id === st.thr ? ' thr' : ' swg') + ' why ' + q.why + ' x ' + Math.round(q.x)); }
        if (pk !== progKey) { progKey = pk; stall = Math.max(stall, (n - lastProg) * DT); lastProg = n; }
      }
      stall = Math.max(stall, (n - lastProg) * DT);
      const st = G.mst, s = st.stats || {}, res = G.results[i];
      return { mode: G.mode, sim: Math.round(n * DT), time: Math.round(G.time), room: (G.room || 0) + 1, gi: st.gi, whoops: s.whoops, phew: s.phew, bumps: s.bumps, helps: s.helps,
        hits: s.hits + '/' + s.throws, stars: st.stars + '/' + st.totalStars, medal: G.mode !== 'play' ? M.stats()[3].value : '-', stall: Math.round(stall), bubbles: P.CPU.bubbles.map(b => b && b.text), tr };
    }, { who, seat, seed, maxT, trace, args: { verbose: process.argv.includes('--verbose') } });
    if (r.tr.length) console.log(r.tr.join('\n'));
    console.log(`${who.padEnd(9)} ${who.startsWith('duo') ? 'both ' : ['Pip ', 'Bo  '][seat]} s${seed}  ${r.mode === 'play' ? 'NOT CLEAR (stretch ' + r.room + ' gap ' + (r.gi + 1) + ')' : 'clear ' + r.time + 's'}  whoops ${r.whoops} phew ${r.phew} bumps ${r.bumps} helps ${r.helps} throws ${r.hits} stars ${r.stars} medal ${r.medal}  longest stall ${r.stall}s${errs.length ? '  ERR ' + errs.slice(0, 2).join(' | ') : ''}`);
  }
  await browser.close();
})();
