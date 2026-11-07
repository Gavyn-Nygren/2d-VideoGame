#!/usr/bin/env node
// Balance runs for 18-4 Plank Duel (mode 'plankduel'): many seeded matches, computer vs computer or a scripted
// "kid" (Pip) vs the computer (Bo). Prints wins per side, how rounds ended and match lengths.
//   node tools/w18/plankduel-sim.js --skills=easy,hard --seeds=1-20
//   node tools/w18/plankduel-sim.js --kid=easy --seeds=1-20          (kid-like scripted Pip vs Easy Bo)
//   node tools/w18/plankduel-sim.js --kid=easy --kidreact=0.45 ...   (a slower kid)
//   --swap=1 puts the stronger/kid side on Bo instead (side-bias check)
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const sr = opt('seeds', '1-10').split('-').map(Number), seeds = [];
for (let s = sr[0]; s <= (sr[1] || sr[0]); s++) seeds.push(s);
const skills = opt('skills', 'normal,normal').split(','), kid = opt('kid', null), kidReact = +opt('kidreact', 0.35), swap = +opt('swap', 0);
const kidMis = +opt('kidmis', 0.15), kidRate = +opt('kidrate', 0.6);

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  await page.addInitScript(() => {
    const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    let seeded = gen(1); const other = gen(12345);
    window.__inStep = false; window.__seed = n => { seeded = gen((n >>> 0) || 1); };
    Math.random = () => (window.__inStep ? seeded() : other());
  });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const res = [];
  for (const seed of seeds) {
    const r = await page.evaluate(({ seed, skills, kid, kidReact, kidMis, kidRate, swap }) => {
      const P = window.__pipbo, G = P.G, i = P.LEVELS.findIndex(l => l.name === 'Plank Duel');
      window.__seed(seed * 7919); window.__inStep = true;
      G.manual = true; P.CPU.errs.clear();
      const kidId = swap ? 1 : 0;
      P.CPU.skillOf = kid ? (kidId ? [kid, 'normal'] : ['normal', kid]) : skills.slice();
      G.cpuOn = kid ? [kidId !== 0, kidId !== 1] : [true, true];
      P.CPU.filter = null;
      delete G.results[i];
      P.loadLevel(i);
      // the scripted kid: reacts late, sometimes guards the wrong way, swings at random heights now and then
      const K = { seen: [], resp: null, cool: 1, low: false, act: false, teeT: 0 };
      const kidTick = dt => {
        const st = G.mst, p = G.players[kidId], inp = p.input;
        for (const k in inp) inp[k] = false;
        if (!st.d || G.match.phase !== 'live') { p.prevAct = false; return; }
        const me = st.d[kidId], op = st.d[1 - kidId], dirIn = kidId ? -1 : 1;
        const sw = op.sw, coming = sw && (sw.state === 'wind' || sw.state === 'charge' || sw.state === 'lunge');
        K.seen.push([G.time, coming ? sw.h + sw.id : null]);
        while (K.seen.length > 1 && K.seen[1][0] <= G.time - kidReact) K.seen.shift();
        const s = K.seen[0][1];
        if (s) { if (!K.resp || K.resp.k !== s) K.resp = { k: s, h: Math.random() < kidMis ? (s[0] === 'h' ? 'lo' : 'hi') : s.slice(0, 2) }; K.low = K.resp.h === 'lo'; }
        else K.resp = null;
        const dist = Math.abs(op.x - me.x);
        if (me.teeter > 0) { K.teeT += dt; if (K.teeT > kidReact) { inp.right = dirIn > 0; inp.left = dirIn < 0; } }
        else K.teeT = 0;
        K.cool -= dt;
        let act = false;
        if (!s && !me.sw && dist < 92 && K.cool <= 0 && Math.random() < kidRate * dt * 3) { K.low = Math.random() < 0.5; act = true; K.cool = 0.8 + Math.random() * 1.4; }
        if (!s && !me.sw && dist > 85 && me.teeter <= 0) { inp.right = dirIn > 0; inp.left = dirIn < 0; }
        if (!s && !me.sw && !act && K.cool > 0.6 && Math.random() < 0.02) K.low = false; // stands back up now and then
        inp.down = K.low;
        if (act && !p.prevAct) { p.pendingAct = true; p.actAge = 0; }
        p.prevAct = act; inp.act = act;
      };
      let n = 0;
      while (G.mode === 'play' && n < 120 * 900) { if (kid) kidTick(P.DT); P.step(P.DT); n++; }
      const rec = G.results[i];
      return { seed, t: Math.round(n * P.DT), winner: rec ? rec.winner : null, rounds: rec && rec.rounds, hist: rec && rec.history.map(h => h.winner + ' ' + h.secs + 's ' + h.reason), stats: rec && rec.stats, cpuErrs: [...P.CPU.errs] };
    }, { seed, skills, kid, kidReact, kidMis, kidRate, swap });
    res.push(r);
    if (args.includes('--v')) console.log(JSON.stringify(r));
  }
  const w0 = res.filter(r => r.winner === 0).length, w1 = res.filter(r => r.winner === 1).length;
  const reasons = {};
  for (const r of res) for (const h of r.hist || []) { const k = h.replace(/^-?\d+ [\d.]+s /, '').replace(/Pip|Bo/g, 'X'); reasons[k] = (reasons[k] || 0) + 1; }
  const secs = res.map(r => r.t).sort((a, b) => a - b);
  const rs = res.flatMap(r => (r.hist || []).map(h => +h.split(' ')[1].replace('s', '')));
  console.log(`${kid ? 'kid(r' + kidReact + ',mis' + kidMis + ') as ' + (swap ? 'Bo' : 'Pip') + ' vs ' + kid : skills.join(' vs ')}: Pip ${w0}  Bo ${w1}  draw ${res.length - w0 - w1}  | match ${secs[0]}-${secs[secs.length - 1]}s median ${secs[secs.length >> 1]}s | round avg ${(rs.reduce((a, b) => a + b, 0) / rs.length).toFixed(1)}s`);
  console.log('  ends:', Object.entries(reasons).sort((a, b) => b[1] - a[1]).map(([k, v]) => v + '× ' + k).join(' | '));
  const errs = res.filter(r => r.cpuErrs.length).length;
  if (errs || errors.length) console.log('  ERRORS', errs, errors.slice(0, 3));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
