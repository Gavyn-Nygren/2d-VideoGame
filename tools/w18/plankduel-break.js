#!/usr/bin/env node
// Break tests for 18-4 Plank Duel: scripted "people" with odd habits play the computer through the real input fields
// (p.input / pendingAct / pendingJump). Prints who won, how rounds ended and match lengths, and flags any match that
// doesn't finish (a stall) or any error.
//   node tools/w18/plankduel-break.js [--skill=easy|normal|hard] [--seeds=1-6] [--side=0|1] [--only=shove,mash]
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const sr = opt('seeds', '1-6').split('-').map(Number), seeds = [];
for (let s = sr[0]; s <= (sr[1] || sr[0]); s++) seeds.push(s);
const skill = opt('skill', 'normal'), side = +opt('side', 0), only = opt('only', '');
const SCRIPTS = ['idle', 'shove', 'retreat', 'mash', 'hopspam', 'crouch', 'crouchmash', 'holdact', 'shovemash', 'random',
  'turtle', 'lungespam', 'feintspam', 'hopshove'];
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  await page.addInitScript(() => {
    const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    let seeded = gen(1); window.__seed = n => { seeded = gen((n >>> 0) || 1); }; Math.random = () => seeded();
  });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  let bad = 0;
  for (const sc of SCRIPTS.filter(s => !only || only.split(',').includes(s))) {
    const res = [];
    for (const seed of seeds) {
      res.push(await page.evaluate(({ seed, sc, skill, side }) => {
        const P = window.__pipbo, G = P.G, i = P.LEVELS.findIndex(l => l.name === 'Plank Duel');
        window.__seed(seed * 7919 + sc.length);
        G.manual = true; P.CPU.errs.clear();
        P.CPU.skillOf = [skill, skill];
        delete G.results[i];
        P.loadLevel(i);
        G.cpuOn = [side !== 0, side !== 1];
        const S = { t: 0, prev: false, prevJ: false, next: 0, r: {} };
        const tick = dt => {
          const p = G.players[side], inp = p.input, st = G.mst; S.t += dt;
          for (const k in inp) inp[k] = false;
          const dirIn = side ? -1 : 1, toward = d => { inp.right = d * dirIn > 0; inp.left = d * dirIn < 0; };
          let act = false, jump = false;
          if (sc === 'shove') toward(1);
          else if (sc === 'retreat') toward(-1);
          else if (sc === 'mash') act = Math.floor(S.t * 10) % 2 === 0;
          else if (sc === 'hopspam') jump = Math.floor(S.t * 10) % 2 === 0;
          else if (sc === 'hopshove') { jump = Math.floor(S.t * 10) % 2 === 0; toward(1); }
          else if (sc === 'crouch') inp.down = true;
          else if (sc === 'crouchmash') { inp.down = true; act = Math.floor(S.t * 8) % 2 === 0; }
          else if (sc === 'holdact') act = true;
          else if (sc === 'shovemash') { toward(1); act = Math.floor(S.t * 10) % 2 === 0; }
          else if (sc === 'turtle') { // a perfect blocker that reads every wind-up at once and never swings
            const O = st.d && st.d[1 - side]; if (O && O.sw && O.sw.h === 'lo' && O.sw.state !== 'rec') inp.down = true;
          } else if (sc === 'lungespam') { act = (S.t % 1.4) < 1.1; toward(1); }
          else if (sc === 'feintspam') { act = Math.floor(S.t * 3) % 2 === 0; inp.down = Math.floor(S.t * 12) % 2 === 0; toward(1); }
          else if (sc === 'random') {
            if (S.t > S.next) { S.next = S.t + 0.1 + Math.random() * 0.5; S.r = { l: Math.random() < 0.3, r: Math.random() < 0.3, d: Math.random() < 0.3, a: Math.random() < 0.3, j: Math.random() < 0.15 }; }
            inp.left = S.r.l; inp.right = S.r.r; inp.down = S.r.d; act = S.r.a; jump = S.r.j;
          }
          if (act && !S.prev) { p.pendingAct = true; p.actAge = 0; }
          S.prev = act; inp.act = act;
          if (jump && !S.prevJ) p.pendingJump = true;
          S.prevJ = jump; inp.jump = jump;
        };
        let n = 0;
        while (G.mode === 'play' && n < 120 * 900) { tick(P.DT); P.step(P.DT); n++; }
        const rec = G.results[i];
        return { seed, t: Math.round(n * P.DT), done: G.mode !== 'play', winner: rec ? rec.winner : null, hist: rec && rec.history.map(h => h.winner + ' ' + h.secs + 's ' + h.reason), cpuErrs: [...P.CPU.errs] };
      }, { seed, sc, skill, side }));
    }
    const me = res.filter(r => r.winner === side).length, cpu = res.filter(r => r.winner === 1 - side).length;
    const reasons = {};
    for (const r of res) for (const h of r.hist || []) { const k = h.replace(/^-?\d+ [\d.]+s /, '').replace(/Pip|Bo/g, 'X'); reasons[k] = (reasons[k] || 0) + 1; }
    const secs = res.map(r => r.t).sort((a, b) => a - b);
    const stalls = res.filter(r => !r.done).length;
    if (stalls) bad++;
    console.log(`${sc.padEnd(10)} as ${side ? 'Bo ' : 'Pip'} vs ${skill}: person ${me} cpu ${cpu} ${stalls ? 'STALLS ' + stalls + ' ' : ''}| ${secs[0]}-${secs[secs.length - 1]}s | ` +
      Object.entries(reasons).sort((a, b) => b[1] - a[1]).map(([k, v]) => v + 'x ' + k).join(' | '));
    if (res.some(r => r.cpuErrs.length)) { bad++; console.log('  CPU ERRORS', res.flatMap(r => r.cpuErrs).slice(0, 3)); }
  }
  if (errors.length) { bad++; console.log('  PAGE ERRORS', errors.slice(0, 3)); }
  await browser.close();
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
