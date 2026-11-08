#!/usr/bin/env node
// 21-4 Paper Plane Race: computer vs computer matches with per-round detail (round times, reasons, stats).
//   node tools/w21/paperplane-sim.js [--skills=hard,easy] [--seeds=1,2,3] [--course=meadow] [--trace=1]
//   --kid=1  Pip is a scripted "kid": holds the throw a random 0.3-1.2 s, tilts toward a random height now and then,
//            mostly ignores rings and obstacles, never flaps on purpose
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const skills = opt('skills', 'hard,hard').split(','), seeds = opt('seeds', '1').split(',').map(Number);
const course = opt('course', null), trace = +opt('trace', 0), kid = +opt('kid', 0), nohelp = !!+opt('nohelp', 0);
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
  const tot = { w: [0, 0] };
  for (const seed of seeds) {
    const r = await page.evaluate(({ seed, skills, course, trace, kid, nohelp }) => {
      const P = window.__pipbo, G = P.G;
      window.__seed(seed * 7919);
      G.manual = true;
      P.CPU.skillOf = skills.slice();
      P.MODES.paperplane.testCourse = course; P.MODES.paperplane.testNoHelp = nohelp;
      G.cpuOn = kid ? [false, true] : [true, true];
      const i = P.LEVELS.findIndex(l => l.name === 'Paper Plane Race');
      P.loadLevel(i);
      G.introT = 0;
      const rounds = [], lines = [];
      let lastPh = null, n = 0;
      const K = { ty: 280, next: 0, hold: 0 };
      while (G.mode === 'play' && n < 120 * 900) {
        if (kid) {
          const pip = G.players[0], inp = pip.input, st = G.mst, me = st.pl && st.pl[0];
          for (const k in inp) inp[k] = false;
          if (me && G.match.phase === 'live') {
            if (me.phase === 'hold') { if (!K.hold) K.hold = 0.3 + Math.random() * 0.9; if (st.rt < 0.5 + K.hold) inp.act = true; }
            else if (me.phase === 'fly') {
              // glides mostly; taps up when low, down when high; goes for a ring it sees half the time; flaps near the ground
              K.next -= P.DT;
              if (K.next <= 0) {
                K.next = 0.35 + Math.random() * 0.5; K.cmd = null;
                const ring = st.course.rings.find(g => !g.got[0] && g.x > me.x + 40 && g.x - me.x < 320);
                if (ring && Math.random() < 0.5) K.cmd = ring.y < me.y - 20 ? 'up' : ring.y > me.y + 20 ? 'down' : null;
                else if (me.y > 380) K.cmd = 'up'; else if (me.y < 170) K.cmd = 'down';
                else if (Math.random() < 0.25) K.cmd = Math.random() < 0.5 ? 'up' : 'down';
                K.len = 0.15 + Math.random() * 0.35; K.flap = me.y > 440 && Math.random() < 0.5;
              }
              if (K.len > 0) { K.len -= P.DT; if (K.cmd === 'up') inp.jump = true; if (K.cmd === 'down') inp.down = true; }
              if (K.flap) { inp.act = true; K.flap = false; }
            }
          } else K.hold = 0;
          if (inp.act && !pip.prevAct) pip.pendingAct = true;
          pip.prevAct = inp.act;
        }
        P.step(P.DT); n++;
        const m = G.match, st = G.mst;
        if (trace && m.phase === 'live' && n % Math.round(trace / P.DT) === 0) lines.push(`r${m.round} ${st.rt.toFixed(1)}s ` + st.pl.map(q => `${['P', 'B'][q.k]} x${Math.round(q.x)} y${Math.round(q.y)} sp${Math.round(q.sp)} a${q.ang.toFixed(2)} ${q.phase}${q.tail ? ' TAIL' : ''}`).join(' | '));
        if (m.phase === 'end' && lastPh !== 'end') {
          rounds.push({ r: m.round, course: st.course.key, len: st.course.len, t: +st.rt.toFixed(1), end: m.end.winner + ':' + m.end.reason,
            x: st.pl.map(q => Math.round(q.x)), pull: st.pl.map(q => Math.round(q.pulled)) });
        }
        lastPh = m.phase;
      }
      const s = G.mst.stat;
      return { wins: G.match.wins, rounds, stat: { rings: s.rings, bumps: s.bumps, skids: s.skids, stalls: s.stalls, flaps: s.flaps, perfect: s.perfect, tail: s.tail.map(v => +v.toFixed(1)), bonks: s.bonks }, simT: Math.round(n * P.DT), lines };
    }, { seed, skills, course, trace, kid, nohelp });
    if (r.lines.length) console.log(r.lines.join('\n'));
    console.log(`seed ${seed}: ${r.wins.join('-')}  sim ${r.simT}s  ${JSON.stringify(r.stat)}`);
    for (const x of r.rounds) console.log(`   r${x.r} ${x.course} len ${x.len}: ${x.t}s  ${x.end}  x ${x.x.join('/')} pulled ${x.pull.join('/')}`);
    tot.w[r.wins[0] > r.wins[1] ? 0 : 1]++;
  }
  console.log(`matches: Pip ${tot.w[0]}  Bo ${tot.w[1]}   (${skills.join(' vs ')}${kid ? ', Pip is the kid' : ''})`);
  console.log(errors.length ? 'ERRORS\n' + errors.slice(0, 5).join('\n') : 'no page errors');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
