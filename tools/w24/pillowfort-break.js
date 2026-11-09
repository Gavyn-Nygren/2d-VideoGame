#!/usr/bin/env node
// 24-4 Pillow Fort Battle: scripted "people" against the computer, and things that try to break the level.
//   node tools/w24/pillowfort-break.js [--seeds=1,2,3,4] [--only=kid]
// 1. kid: a kid-like script (walks to the nearest toy, taps to toss with the self-aiming lob, sometimes holds a random
//    time, carries pillows to the front of its fort and presses build, dawdles) vs Easy, from both sides: should win
//    some. A stronger "kid+" (aims with the arc it can see: picks the charge whose path ends on a block) vs Normal.
// 2. masher: random keys and the action mashed every few ticks vs Normal: must lose, nothing gets stuck.
// 3. hold: a person who holds ▶ and the action all match (vs Easy): rounds still end.
// 4. idle: a person who presses nothing (1-player vs Normal): the computer waits after 30 s and the game pauses at 40 s.
// 5. pit: a person dropped into a pit inside their fort (walls 5 high both sides) can jump out (Boing!).
// 6. place rules: a pillow can't go on the other side or out of reach, and the ghost matches where it goes.
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const seeds = opt('seeds', '1,2,3,4').split(',').map(Number), only = opt('only', '');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.addInitScript(() => {
    const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    let seeded = gen(1); window.__seed = n => { seeded = gen((n >>> 0) || 1); }; Math.random = () => seeded();
  });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  await page.evaluate(() => {
    const P = window.__pipbo, G = P.G;
    // scripted people (they press keys through the computer's input path, as CPU.filter for their side)
    window.__people = {
      kid(st, p, out, dt, strong) {
        const ms = G.mst, s = ms.pl[p.id], T = P.MODES.pillowfort.test, d = p.id ? -1 : 1, cx = p.x + p.w / 2, o = {};
        if (s.aim) { if (s.holdT >= (st.hold || 0)) return o; o.act = true; return o; }
        st.wait = (st.wait || 0) - dt;
        if (st.wait > 0) return o;
        if (Math.random() < dt * 0.15) { st.wait = 0.5 + Math.random() * 1.2; return o; }   // looks around
        if (Math.random() < dt * 0.3) o.jump = true;                                       // hops for fun
        if (!s.hold) {
          const mine = ms.items.filter(it => (p.id ? it.x > 492 : it.x < 468) && it.rest);
          if (!mine.length) { const hx = p.id ? 600 : 360; o.left = cx > hx + 20; o.right = cx < hx - 20; return o; }
          mine.sort((a, b) => Math.abs(a.x - cx) - Math.abs(b.x - cx));
          const it = mine[0];
          o.left = it.x < cx - 4; o.right = it.x > cx + 4;
          if (it.y < p.y - 20 && Math.abs(it.x - cx) < 40) o.jump = true;
          return o;
        }
        if (T.isBlock(s.hold.t)) {
          // carry it to the front of the fort and press build
          const fx = T.colOf(p.id, 6) * 30 + 15 + d * 34;
          if (Math.abs(cx - fx) > 8) { o.left = cx > fx; o.right = cx < fx; return o; }
          if (p.face !== -d) { o.left = d > 0; o.right = d < 0; return o; }
          st.wait = 0.25; o.act = true; return o;
        }
        // a toy to toss: a tap most of the time, or hold a while (after a moment to think)
        if (!st.think) { st.think = true; st.wait = 0.2 + Math.random() * 0.6; return o; }
        st.think = false;
        if (strong) {
          let best = null;
          for (let c = 0; c <= 1; c += 0.05) { const pts = T.path(ms, p.id, T.launch(p, c, 0)), e = pts[pts.length - 1]; const sc = e && e.hit ? (e.hit.kind === 'ted' ? 3 : e.hit.kind === 'block' ? 2 : 0) : 0; if (!best || sc > best.sc) best = { c, sc }; }
          st.hold = T.PFB.tapT + Math.max(0, best.c + (Math.random() - 0.5) * 0.1) * T.PFB.chargeT;
        } else st.hold = Math.random() < 0.6 ? 0 : 0.3 + Math.random() * 0.9;
        o.act = true; return o;
      },
      masher(st, p, out, dt) {
        st.t = (st.t || 0) + dt;
        if (!st.dir || Math.random() < dt * 2) st.dir = Math.random() < 0.5 ? -1 : 1;
        return { left: st.dir < 0, right: st.dir > 0, jump: Math.random() < 0.3, down: Math.random() < 0.1, act: Math.floor(st.t * 12) % 2 === 0 };
      },
      hold() { return { right: true, act: true }; },
      idle() { return {}; },
    };
    window.__match = (seed, who, side, foeSkill, maxS) => {
      window.__seed(seed * 7919);
      G.manual = true;
      P.CPU.skillOf = side === 0 ? ['hard', foeSkill] : [foeSkill, 'hard'];
      const pst = {};
      P.CPU.filter = (p, out, dt) => (p.id === side ? window.__people[who.replace('+', '')](pst, p, out, dt, who.endsWith('+')) : out);
      G.cpuOn = [true, true];
      P.loadLevel(P.LEVELS.findIndex(l => l.name === 'Pillow Fort Battle'));
      G.cpuOn = [true, true]; G.introT = 0;
      let n = 0, rounds = 0, last = null; const times = [];
      while (G.mode === 'play' && n < 120 * (maxS || 700)) { P.step(P.DT); n++; if (G.match.phase === 'end' && last !== 'end') { rounds++; times.push(Math.round(G.mst.rt)); } last = G.match.phase; }
      P.CPU.filter = null;
      const s = G.mst.stat;
      return { wins: G.match.wins, mode: G.mode, rounds, times, sim: Math.round(n * P.DT), hits: s.hits, built: s.built };
    };
  });
  const say = s => console.log(s);
  // 1-3: people vs the computer
  for (const [who, foe] of [['kid', 'easy'], ['kid+', 'normal'], ['masher', 'normal'], ['hold', 'easy']]) {
    if (only && !who.startsWith(only)) continue;
    let won = 0, lost = 0; const all = [];
    for (const side of [0, 1]) for (const seed of (who === 'hold' ? seeds.slice(0, 1) : seeds)) {
      const r = await page.evaluate(([seed, who, side, foe]) => window.__match(seed, who, side, foe), [seed, who, side, foe]);
      const mine = r.wins[side], theirs = r.wins[1 - side];
      if (mine > theirs) won++; else lost++;
      all.push(`${side ? 'Bo' : 'Pip'} s${seed} ${mine}-${theirs} (${r.mode}, ${r.rounds} rounds ${r.times.join('/')}s, hits ${r.hits[side]}-${r.hits[1 - side]}, built ${r.built[side]})`);
    }
    say(`${who} vs ${foe}: won ${won} of ${won + lost}`);
    for (const l of all) say('   ' + l);
  }
  // 4: an idle person in 1-player mode
  if (!only || only === 'idle') {
    const r = await page.evaluate(() => {
      const P = window.__pipbo, G = P.G;
      G.manual = true; P.CPU.skillOf = [null, null]; P.CPU.filter = null; P.CPU.cfg.skill = 'normal';
      G.cpuOn = [false, true];
      P.loadLevel(P.LEVELS.findIndex(l => l.name === 'Pillow Fort Battle'));
      G.cpuOn = [false, true]; G.introT = 0;
      let n = 0; const marks = {};
      while (n < 120 * 60 && G.mode === 'play') {
        P.step(P.DT); n++;
        if (G.match.phase === 'live' && !marks.live) marks.live = n;
        if (n === 120 * 34) marks.at34 = JSON.stringify(G.players[1].input);
      }
      const thrownLate = G.mst.stat.throws[1];
      return { mode: G.mode, secs: Math.round(n * P.DT), sinceLive: Math.round((n - marks.live) * P.DT), at34: marks.at34, throws: thrownLate, round: G.match.round };
    });
    say(`idle person (1-player vs Normal): game ${r.mode} after ${r.sinceLive} s of live play (round ${r.round}); computer's keys at 34 s: ${r.at34}; its tosses ${r.throws}`);
    if (r.mode !== 'paused') say('   FAIL: the game should pause after 40 s with no person pressing anything');
  }
  // 5: a pit in your fort
  if (!only || only === 'pit') {
    const r = await page.evaluate(() => {
      const P = window.__pipbo, G = P.G, T = P.MODES.pillowfort.test;
      G.manual = true; P.CPU.filter = null; G.cpuOn = [false, false];
      P.loadLevel(P.LEVELS.findIndex(l => l.name === 'Pillow Fort Battle'));
      G.cpuOn = [false, false]; G.introT = 0;
      let n = 0; while (G.match.phase !== 'live' && n++ < 4000) P.step(P.DT);
      const st = G.mst, f = st.fort[0];
      // columns 2 and 4 five high, column 3 empty: Pip stands in it
      const mk = () => ({ kind: 'c', hp: 1, max: 1, col: '#fff', dropY: 0, squish: 0, wob: 0 });
      f[2] = [mk(), mk(), mk(), mk(), mk()]; f[4] = [mk(), mk(), mk(), mk(), mk()]; f[3] = [];
      st.ted[0].i = 0;
      MODES.pillowfort.test && pfbSync(st);
      const p = G.players[0]; p.x = T.colOf(0, 3) * 30 + 4; p.y = 480 - p.h; p.vx = 0; p.vy = 0;
      for (let k = 0; k < 30; k++) P.step(P.DT);
      p.input.jump = true; p.pendingJump = true;
      let top = p.y;
      for (let k = 0; k < 120; k++) { P.step(P.DT); top = Math.min(top, p.y); }
      p.input.jump = false;
      return { top: Math.round(top), wallTop: 480 - 5 * 30, out: top + p.h < 480 - 5 * 30 };
    });
    say(`pit: Pip's feet reached ${r.top + 26} (wall top ${r.wallTop}): ${r.out ? 'Boing! out' : 'FAIL: stuck in the pit'}`);
  }
  // 6: building rules
  if (!only || only === 'place') {
    const r = await page.evaluate(() => {
      const P = window.__pipbo, G = P.G, T = P.MODES.pillowfort.test;
      G.manual = true; P.CPU.filter = null; G.cpuOn = [false, false];
      P.loadLevel(P.LEVELS.findIndex(l => l.name === 'Pillow Fort Battle'));
      G.cpuOn = [false, false]; G.introT = 0;
      let n = 0; while (G.match.phase !== 'live' && n++ < 4000) P.step(P.DT);
      const st = G.mst, p = G.players[0], s = st.pl[0], out = [];
      const tryAt = (x, face) => {
        p.x = x - p.w / 2; p.y = 480 - p.h; p.vx = 0; p.vy = 0; p.face = face; s.hold = { t: 'pillow' }; s.cd = 0;
        P.step(P.DT);
        const ghost = T.placeSpot(st, p), before = st.fort[0].map(c => c.length).join('');
        p.pendingAct = true; P.step(P.DT);
        const after = st.fort[0].map(c => c.length).join('');
        return { x, face, ghost: ghost.why || ('col ' + ghost.i), before, after, held: !!s.hold };
      };
      out.push(tryAt(255, -1));   // in front of the fort, facing it: on the front column
      out.push(tryAt(440, -1));   // far from the fort: refused
      out.push(tryAt(470, 1));    // at the rug line facing the other fort: refused (never on the other side)
      return out;
    });
    for (const x of r) say(`place at x ${x.x} facing ${x.face}: ghost ${x.ghost}; columns ${x.before} -> ${x.after}; still holding ${x.held}`);
  }
  say(errors.length ? 'ERRORS\n' + errors.slice(0, 6).join('\n') : 'no page errors');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
