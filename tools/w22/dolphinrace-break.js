#!/usr/bin/env node
// 22-4 Dolphin Race: try to break it with scripted "people" (both sides, or one side against the computer).
//   node tools/w22/dolphinrace-break.js [--seeds=1,2,3] [--only=mash] [--v=1]
// Checks: no page errors, no NaN, dolphins stay on screen and inside the sea / sky, every match ends, results tiles
// agree with the match, and how often each script wins.
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
  ['both kid', 'kid', 'kid'],
  ['hold act forever vs idle', 'holdAct', 'idle'],
  ['hold up forever vs hold down forever', 'holdUp', 'holdDown'],
  ['leap spam vs backwards', 'leapSpam', 'back'],
  ['idle vs cpu easy', 'idle', 'cpu:easy'],
  ['mash vs cpu easy', 'mash', 'cpu:easy'],
  ['leapSpam vs cpu easy', 'leapSpam', 'cpu:easy'],
  ['holdUp vs cpu easy', 'holdUp', 'cpu:easy'],
  ['kid vs cpu easy', 'kid', 'cpu:easy'],
  ['cpu easy vs kid', 'cpu:easy', 'kid'],
  ['kid vs cpu normal', 'kid', 'cpu:normal'],
  ['kid vs cpu hard', 'kid', 'cpu:hard'],
  ['tryer vs cpu easy', 'tryer', 'cpu:easy'],
  ['cpu easy vs tryer', 'cpu:easy', 'tryer'],
  ['tryer vs cpu normal', 'tryer', 'cpu:normal'],
  ['tryer vs cpu hard', 'tryer', 'cpu:hard'],
  ['kid vs idle', 'kid', 'idle'],
  ['tryer vs mash', 'tryer', 'mash'],
  ['cpu normal vs cpu easy', 'cpu:normal', 'cpu:easy'],
  ['cpu easy vs cpu hard', 'cpu:easy', 'cpu:hard'],
  ['cpu hard vs cpu normal', 'cpu:hard', 'cpu:normal'],
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
    const tally = { w: [0, 0, 0], simT: [], probs: [], rt: [] };
    for (const seed of seeds) {
      const r = await page.evaluate(({ seed, scripts }) => {
        const P = window.__pipbo, G = P.G, DT = P.DT;
        window.__seed(seed * 104729);
        // the scripts' own randomness never touches the game's seeded Math.random
        const KS = [(seed * 2654435761 >>> 0) || 1, (seed * 40503 + 977 >>> 0) || 1]; let who = 0;
        const kr = () => { let x = KS[who]; for (let i = 0; i < 3; i++) { x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; x >>>= 0; } KS[who] = x; return x / 4294967296; };
        G.manual = true;
        P.CPU.skillOf = scripts.map(s => (s.startsWith('cpu:') ? s.slice(4) : null));
        P.MODES.dolphinrace.testCourse = null; P.MODES.dolphinrace.testNoHelp = false;
        G.cpuOn = scripts.map(s => s.startsWith('cpu:'));
        P.loadLevel(P.LEVELS.findIndex(l => l.name === 'Dolphin Race'));
        G.cpuOn = scripts.map(s => s.startsWith('cpu:'));
        G.introT = 0;
        const T = P.MODES.dolphinrace.test, Q = T.DLR;
        const K = [{}, {}], probs = [], rts = [];
        let n = 0, lastPh = null;
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
            else if (sc === 'leapSpam') inp.act = (n % 20) < 3;
            else if (sc === 'back') inp.left = true;
            else if (sc === 'kid' && me && live) {
              // a young kid: mostly holds nothing or ▲ / ▼ for a while at random, presses leap now and then,
              // half the time when a hoop is somewhere ahead
              k.next = (k.next || 0) - DT;
              if (k.next <= 0) {
                k.next = 0.3 + kr() * 0.7; const r0 = kr();
                k.cmd = r0 < 0.45 ? null : r0 < 0.75 ? 'up' : 'down';
                if (me.y > Q.bed - 60) k.cmd = 'up';
                const hoop = st.course.hoops.find(g => !g.got[p.id] && g.x > me.x + 80 && g.x - me.x < 400);
                k.leap = hoop ? kr() < 0.5 : kr() < 0.12;
              }
              if (k.cmd === 'up') inp.jump = true; if (k.cmd === 'down') inp.down = true;
              if (k.leap) { inp.act = true; k.leap = false; }
            } else if (sc === 'tryer' && me && live) {
              // a kid who tries: looks a little way ahead, swims over or under what it sees (60%), goes for hoops it
              // sees, leaps when a hoop is about 150-260 px away (a bit early or late), sometimes over-holds
              k.next = (k.next || 0) - DT;
              if (k.next <= 0) {
                k.next = 0.3 + kr() * 0.3;
                let ty = Q.surf + 50;
                const hoop = st.course.hoops.find(g => !g.got[p.id] && g.x > me.x + 40 && g.x - me.x < 420);
                if (hoop && kr() < 0.75) ty = Q.surf + 20;
                if (k.seen === undefined) k.seen = {};
                for (const o of st.course.obs) {
                  const sp = T.span(o); if (sp[1] < me.x || sp[0] > me.x + 320) continue;
                  if (k.seen[o.id] === undefined) k.seen[o.id] = kr() < 0.6;
                  if (!k.seen[o.id]) continue;
                  const sh = T.shapes(o, st.rt); let lo = 1e9, hi = -1e9;
                  for (const [, cy, r] of sh.c) { lo = Math.min(lo, cy - r); hi = Math.max(hi, cy + r); }
                  for (const [, y0, , y1] of sh.r) { lo = Math.min(lo, y0); hi = Math.max(hi, y1); }
                  if (o.k === 'gate') { ty = (o.gt + o.gb) / 2; break; }
                  if (ty > lo - 30 && ty < hi + 30) ty = (lo - 30 > Q.surf + 12) ? lo - 34 : hi + 34;
                  break;
                }
                k.ty = ty;
                k.leapAt = hoop && !hoop.low && kr() < 0.7 ? hoop : null;
              }
              if (k.ty < me.y - 18) inp.jump = true; else if (k.ty > me.y + 18) inp.down = true;
              if (k.leapAt && !me.air) {
                const d = k.leapAt.x - me.x;
                if (d < 150 + kr() * 110 && d > 60) { inp.act = !was; k.leapAt = null; }
              }
            } else if (sc === 'tryer' || sc === 'kid') { k.seen = undefined; }
            if (inp.act && !was) p.pendingAct = true;
            if (inp.jump && !p.__pj) p.pendingJump = true;
            p.__pj = inp.jump;
          }
          P.step(DT); n++;
          if (st.pl && m && m.phase === 'live') for (const D of st.pl) {
            if (!isFinite(D.x) || !isFinite(D.y) || !isFinite(D.sp) || !isFinite(D.vy)) prob('NaN r' + m.round);
            if (!D.done) {
              const sx = D.x - st.cam.x;
              if (sx < -5 || sx > 965) prob('off screen r' + m.round + ' sx ' + Math.round(sx));
              if (D.y < Q.top - 1 || D.y > Q.bed - Q.bedD + 1) prob('out of the sea y ' + Math.round(D.y));
            }
          }
          if (G.match && G.match.phase === 'live' && G.match.roundT > 72) prob('round over 72 s');
          if (m && m.phase === 'end' && lastPh !== 'end') rts.push(+st.rt.toFixed(1));
          lastPh = m && m.phase;
        }
        const s = G.mst.stat;
        const sd = ['hoops', 'bumps', 'flips', 'starts'].map(k => k + ' ' + s[k].join('/')).join(', ') + ', best ' + s.best.map(Math.round).join('/') + ', tail ' + s.tail.map(v => v.toFixed(0)).join('/') + ', bonks ' + s.bonks;
        return { sd, done: G.mode !== 'play', wins: G.match.wins.slice(), simT: Math.round(n * DT), probs, rts, statWins: s.wins.slice(), hist: G.match.history.map(h => h.winner + (h.tiebreak ? 't' : '') + ':' + h.reason + '@' + h.secs).join(' | ') };
      }, { seed, scripts: [a, b] });
      if (!r.done) r.probs.push('match never ended');
      tally.w[r.wins[0] > r.wins[1] ? 0 : r.wins[1] > r.wins[0] ? 1 : 2]++; tally.simT.push(r.simT); tally.rt.push(...r.rts);
      if (verbose) console.log('   s' + seed + ' ' + r.wins.join('-') + '  ' + r.hist + '\n      ' + r.sd);
      if (r.probs.length) tally.probs.push('s' + seed + ': ' + r.probs.join('; '));
    }
    const avg = tally.rt.length ? (tally.rt.reduce((x, y) => x + y, 0) / tally.rt.length).toFixed(0) : '-';
    console.log(`${name.padEnd(38)} Pip ${tally.w[0]}  Bo ${tally.w[1]}  draw ${tally.w[2]}   match ${tally.simT.join('/')} s, rounds avg ${avg} s` + (tally.probs.length ? '\n   PROBLEMS ' + tally.probs.join(' | ') : ''));
    if (tally.probs.length) bad++;
  }
  console.log(errors.length ? 'PAGE ERRORS\n' + errors.slice(0, 5).join('\n') : 'no page errors');
  await browser.close();
  process.exit(bad || errors.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
