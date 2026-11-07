#!/usr/bin/env node
// Trace one round of 18-4 Plank Duel with a scripted person (see plankduel-break.js for the scripts' names):
// prints both duellists' x, stance, swing and timers every --every seconds.
//   node tools/w18/plankduel-trace.js --script=shove --skill=easy --seed=1 [--side=0] [--secs=20] [--every=0.25]
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const sc = opt('script', 'shove'), skill = opt('skill', 'easy'), seed = +opt('seed', 1), side = +opt('side', 0);
const secs = +opt('secs', 20), every = +opt('every', 0.25);
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('pageerror', e => console.log('PAGE ERROR', String(e)));
  await page.addInitScript(() => {
    const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    let seeded = gen(1); window.__seed = n => { seeded = gen((n >>> 0) || 1); }; Math.random = () => seeded();
  });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const lines = await page.evaluate(({ sc, skill, seed, side, secs, every }) => {
    const P = window.__pipbo, G = P.G, i = P.LEVELS.findIndex(l => l.name === 'Plank Duel');
    window.__seed(seed);
    G.manual = true; P.CPU.skillOf = [skill, skill]; P.loadLevel(i); G.cpuOn = [side !== 0, side !== 1];
    const out = [], S = { t: 0, prev: false };
    let n = 0, lt = 0;
    while (G.mode === 'play' && n < 120 * 300) {
      const p = G.players[side], inp = p.input; for (const k in inp) inp[k] = false;
      const dirIn = side ? -1 : 1, toward = d => { inp.right = d * dirIn > 0; inp.left = d * dirIn < 0; };
      S.t += P.DT; let act = false;
      if (sc === 'shove') toward(1);
      else if (sc === 'shovemash') { toward(1); act = Math.floor(S.t * 10) % 2 === 0; }
      else if (sc === 'feintspam') { act = Math.floor(S.t * 3) % 2 === 0; inp.down = Math.floor(S.t * 12) % 2 === 0; toward(1); }
      if (act && !S.prev) p.pendingAct = true; S.prev = act; inp.act = act;
      P.step(P.DT); n++;
      const st = G.mst;
      if (G.match.phase === 'live' && st.lt - lt >= every) {
        lt = st.lt;
        const f = D => `${D.x.toFixed(0).padStart(4)} ${D.stance} ${D.sw ? D.sw.state[0] + D.sw.h[0] + (D.sw.t || 0).toFixed(2) : '-----'} st${D.stun.toFixed(1)} ra${D.rattle.toFixed(1)} ${D.teeter > 0 ? 'TEET' : ''}${D.fall ? 'FALL' : ''}`;
        out.push(`r${st.round} ${st.lt.toFixed(2).padStart(6)} | Pip ${f(st.d[0])} | Bo ${f(st.d[1])} | hits ${st.stat.hits} blk ${st.stat.blocks}`);
      }
      if (st.lt > secs && G.match.phase === 'live') break;
    }
    return out;
  }, { sc, skill, seed, side, secs, every });
  console.log(lines.join('\n'));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
