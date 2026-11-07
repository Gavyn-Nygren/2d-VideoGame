#!/usr/bin/env node
// 21-4 Paper Plane Race: try to break it with scripted "people" (both sides, or one side against the computer).
//   node tools/w21/paperplane-break.js [--seeds=1,2,3]
// Checks: no page errors, no NaN, planes stay on screen and inside the sky while flying, every match ends, and how
// often each script wins.
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const seeds = opt('seeds', '1,2,3').split(',').map(Number), only = opt('only', null), verbose = +opt('v', 0);
// [name, pip script, bo script ('cpu:easy' = the computer brain at that skill)]
const CASES = [
  ['both idle', 'idle', 'idle'],
  ['both mash', 'mash', 'mash'],
  ['both tryer', 'tryer', 'tryer'],
  ['hold act forever vs idle', 'holdAct', 'idle'],
  ['hold up forever vs hold down forever', 'holdUp', 'holdDown'],
  ['only act vs backwards', 'onlyAct', 'back'],
  ['tapper (taps act to throw) vs idle', 'tapThrow', 'idle'],
  ['idle vs cpu easy', 'idle', 'cpu:easy'],
  ['mash vs cpu easy', 'mash', 'cpu:easy'],
  ['holdUp vs cpu easy', 'holdUp', 'cpu:easy'],
  ['kid vs cpu easy', 'kid', 'cpu:easy'],
  ['kid vs cpu normal', 'kid', 'cpu:normal'],
  ['kid vs cpu hard', 'kid', 'cpu:hard'],
  ['cpu easy vs kid', 'cpu:easy', 'kid'],
  ['kid vs idle', 'kid', 'idle'],
  ['tryer vs idle', 'tryer', 'idle'],
  ['tryer vs cpu easy', 'tryer', 'cpu:easy'],
  ['cpu easy vs tryer', 'cpu:easy', 'tryer'],
  ['tryer vs cpu normal', 'tryer', 'cpu:normal'],
  ['tryer vs cpu hard', 'tryer', 'cpu:hard'],
  ['mash vs idle', 'mash', 'idle'],
  ['cpu easy vs idle', 'cpu:easy', 'idle'],
  ['cpu hard vs cpu easy', 'cpu:hard', 'cpu:easy'],
];
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
  let bad = 0;
  for (const [name, a, b] of CASES) {
    if (only && !only.split(',').some(o => name.includes(o))) continue;
    const tally = { w: [0, 0, 0], simT: [], probs: [] };
    for (const seed of seeds) {
      const r = await page.evaluate(({ seed, scripts }) => {
        const P = window.__pipbo, G = P.G, DT = P.DT;
        window.__seed(seed * 104729);
        // the scripts' own randomness never touches the game's seeded Math.random
        const KS = [(seed * 2654435761 >>> 0) || 1, (seed * 40503 + 977 >>> 0) || 1]; let who = 0;
        const kr = () => { let x = KS[who]; for (let i = 0; i < 3; i++) { x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; x >>>= 0; } KS[who] = x; return x / 4294967296; };
        G.manual = true;
        P.CPU.skillOf = scripts.map(s => (s.startsWith('cpu:') ? s.slice(4) : null));
        G.cpuOn = scripts.map(s => s.startsWith('cpu:'));
        P.MODES.paperplane.testCourse = null; P.MODES.paperplane.testNoHelp = false;
        P.loadLevel(P.LEVELS.findIndex(l => l.name === 'Paper Plane Race'));
        G.cpuOn = scripts.map(s => s.startsWith('cpu:'));
        G.introT = 0;
        const K = [{}, {}], probs = [];
        let n = 0;
        const prob = s => { if (probs.length < 6 && !probs.includes(s)) probs.push(s); };
        while (G.mode === 'play' && n < 120 * 600) {
          const st = G.mst, m = G.match;
          for (const p of G.players) {
            const sc = scripts[p.id]; if (sc.startsWith('cpu:')) continue;
            who = p.id;
            const inp = p.input, me = st.pl && st.pl[p.id], k = K[p.id];
            const was = inp.act;
            for (const key in inp) inp[key] = false;
            const live = m && m.phase === 'live';
            if (sc === 'mash') { for (const key of ['left', 'right', 'jump', 'down', 'up', 'act']) inp[key] = kr() < 0.5; }
            else if (sc === 'holdAct') inp.act = true;
            else if (sc === 'holdUp') inp.jump = true;
            else if (sc === 'holdDown') inp.down = true;
            else if (sc === 'onlyAct') inp.act = (n % 30) < 4;
            else if (sc === 'back') inp.left = true;
            else if (sc === 'tapThrow') inp.act = (n % 40) < 3;
            else if (sc === 'kid' && me && live) {
              if (me.phase === 'hold') { if (!k.hold) k.hold = 0.25 + kr() * 1.1; inp.act = st.rt < 0.4 + k.hold; }
              else if (me.phase === 'fly') {
                k.next = (k.next || 0) - DT;
                if (k.next <= 0) {
                  k.next = 0.3 + kr() * 0.5; k.cmd = null;
                  const ring = st.course.rings.find(g => !g.got[p.id] && g.x > me.x + 40 && g.x - me.x < 300);
                  if (ring && kr() < 0.5) k.cmd = ring.y < me.y - 20 ? 'up' : ring.y > me.y + 20 ? 'down' : null;
                  else if (me.y > 390) k.cmd = 'up'; else if (me.y < 170) k.cmd = 'down';
                  else if (kr() < 0.3) k.cmd = kr() < 0.5 ? 'up' : 'down';
                  k.len = 0.15 + kr() * 0.4; k.flap = me.y > 430 && kr() < 0.5;
                }
                if (k.len > 0) { k.len -= DT; if (k.cmd === 'up') inp.jump = true; if (k.cmd === 'down') inp.down = true; }
                if (k.flap) { inp.act = true; k.flap = false; }
              }
            } else if (sc === 'kid') k.hold = 0;
            else if (sc === 'tryer' && me && live) {
              // a kid who tries: aims for rings it sees, notices most things in the way and goes over or under them,
              // over-holds ▲ now and then, flaps when slow and (half the time) saves the rest for the end
              const T = P.MODES.paperplane.test;
              if (me.phase === 'hold') { if (!k.hold) k.hold = 0.35 + kr() * 0.8; inp.act = st.rt < 0.3 + k.hold; }
              else if (me.phase === 'fly') {
                k.next = (k.next || 0) - DT;
                if (k.next <= 0) {
                  k.next = 0.35 + kr() * 0.3; k.over = kr() < 0.2 ? 0.4 : 0;
                  let ty = 240 + kr() * 120;
                  const ring = st.course.rings.find(g => !g.got[p.id] && g.x > me.x + 60 && g.x - me.x < 360);
                  if (ring && kr() < 0.7) ty = ring.y;
                  for (const o of st.course.obs) {
                    const sp = T.span(o); if (sp[1] < me.x || sp[0] > me.x + 300) continue;
                    if (k.seen === undefined) k.seen = {};
                    if (k.seen[o.id] === undefined) k.seen[o.id] = kr() < 0.6;
                    if (!k.seen[o.id]) continue;
                    const sh = T.shapes(o, st.rt); let lo = 1e9, hi = -1e9;
                    for (const [cx, cy, r] of sh.c) { lo = Math.min(lo, cy - r); hi = Math.max(hi, cy + r); }
                    for (const [, y0, , y1] of sh.r) { lo = Math.min(lo, y0); hi = Math.max(hi, y1); }
                    if (ty > lo - 30 && ty < hi + 30) ty = (lo - 40 > 120 && (Math.abs(lo - me.y) < Math.abs(hi - me.y) || hi + 40 > 460)) ? lo - 40 : hi + 40;
                    break;
                  }
                  k.ty = ty;
                  k.flap = me.flaps > 0 && (me.sp < 150 || me.y > 440 || (st.course.len - me.x < 1000 && kr() < 0.5) || (kr() < 0.08));
                }
                if (k.over > 0) { k.over -= DT; inp.jump = true; }
                else if (k.ty < me.y - 25 && me.ang > -0.3) inp.jump = true;
                else if (k.ty > me.y + 25 && me.ang < 0.35) inp.down = true;
                if (k.flap) { inp.act = true; k.flap = false; }
              }
            } else if (sc === 'tryer') { k.hold = 0; k.seen = undefined; }
            if (inp.act && !was) p.pendingAct = true;
            if (inp.jump && !p.__pj) p.pendingJump = true;
            p.__pj = inp.jump;
          }
          P.step(DT); n++;
          if (st.pl && m && m.phase === 'live') for (const Q of st.pl) {
            if (!isFinite(Q.x) || !isFinite(Q.y) || !isFinite(Q.sp) || !isFinite(Q.ang)) prob('NaN r' + m.round);
            if (Q.phase === 'fly') {
              const sx = Q.x - st.cam.x;
              if (sx < -5 || sx > 965) prob('off screen r' + m.round + ' sx ' + Math.round(sx));
              if (Q.y < 97 || Q.y > 473) prob('out of sky y ' + Math.round(Q.y));
            }
          }
          if (G.match && G.match.phase === 'live' && G.match.roundT > 80) prob('round over 80 s');
        }
        const s = G.mst.stat;
        const sd = ['rings','bumps','skids','stalls','flaps','perfect'].map(k => k + ' ' + s[k].join('/')).join(', ') + ', tail ' + s.tail.map(v => v.toFixed(0)).join('/');
        return { sd, done: G.mode !== 'play', wins: G.match.wins.slice(), simT: Math.round(n * DT), probs, statWins: s.wins.slice(), hist: G.match.history.map(h => h.winner + (h.tiebreak ? 't' : '') + ':' + h.reason + '@' + h.secs).join(' | ') };
      }, { seed, scripts: [a, b] });
      if (!r.done) r.probs.push('match never ended');
      if (r.statWins.join() !== r.wins.join()) r.probs.push('results Rounds won ' + r.statWins.join('-') + ' vs match ' + r.wins.join('-'));
      tally.w[r.wins[0] > r.wins[1] ? 0 : r.wins[1] > r.wins[0] ? 1 : 2]++; tally.simT.push(r.simT);
      if (verbose) console.log('   s' + seed + ' ' + r.wins.join('-') + '  ' + r.hist + '\n      ' + r.sd);
      if (r.probs.length) tally.probs.push('s' + seed + ': ' + r.probs.join('; '));
    }
    console.log(`${name.padEnd(40)} Pip ${tally.w[0]}  Bo ${tally.w[1]}  draw ${tally.w[2]}   sim ${tally.simT.join('/')} s` + (tally.probs.length ? '\n   PROBLEMS ' + tally.probs.join(' | ') : ''));
    if (tally.probs.length) bad++;
  }
  console.log(errors.length ? 'PAGE ERRORS\n' + errors.slice(0, 5).join('\n') : 'no page errors');
  await browser.close();
  process.exit(bad || errors.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
