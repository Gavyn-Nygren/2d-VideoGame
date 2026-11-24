#!/usr/bin/env node
// 43-2 Pinball Panic: play the climb with computer players (drawing off: K3D.noRender) and report how it went.
// Usage: node tools/w43/pinball-play.js [--who=pair|noisy|kid|idle|swap] [--clumsy=0|1] [--max=900] [--seeds=1,2] [--trace=5]
//        [--part=1-4] (start at the bottom of that part)  [--sec=N] (start at section N)
//   pair   the computer plays both (Pip left, Bo right)       must hit the Jackpot
//   swap   the computer plays both, Pip right and Bo left (lanes swapped: the level works either way)
//   noisy  one side (--clumsy) is a distracted person: stops pressing now and then, wanders
//   kid    one side is the computer a whole second late on every press (and 0.3 s late steering)
//   idle   Pip presses nothing: the level must not finish
// Prints stars, drains, saves, knocks, gates opened by each, the time at every gate, the medal.
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const who = opt('who', 'pair'), maxT = +opt('max', 900), seeds = opt('seeds', '1').split(',').map(Number);
const clumsy = +opt('clumsy', 0), trace = +opt('trace', 0), part = +opt('part', 0), sec = +opt('sec', -1);
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  await page.addInitScript(() => {
    const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    let seeded = gen(1); const other = gen(12345);
    window.__inStep = false; window.__seed = n => { seeded = gen((n >>> 0) || 1); };
    Math.random = () => (window.__inStep ? seeded() : other());
  });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  for (const seed of seeds) {
    errors.length = 0;
    const r = await page.evaluate(async ({ who, maxT, seed, clumsy, trace, part, sec }) => {
      const P = window.__pipbo, G = P.G, K3D = P.K3D;
      const i = P.LEVELS.findIndex(l => l.mode === 'arcadepinball');
      window.__seed(seed * 7919);
      G.manual = true; K3D.noRender = true;
      P.CPU.errs.clear(); P.CPU.skillOf = [null, null];
      G.cpuOn = who === 'idle' ? [false, true] : [true, true];
      const nz = { pause: 0, next: 3 + Math.random() * 6, wander: 0 }, late = [];
      P.CPU.filter = (p, out, dt) => {
        if (p.id !== clumsy) return out;
        if (who === 'noisy') {
          if (nz.pause > 0) { nz.pause -= dt; return nz.wander > 0 ? { ax: nz.wx, ay: nz.wy } : {}; }
          if ((nz.next -= dt) <= 0) { nz.pause = 0.6 + Math.random() * 1.6; nz.next = 4 + Math.random() * 7; nz.wander = Math.random() < 0.5 ? 1 : 0; nz.wx = Math.random() * 2 - 1; nz.wy = Math.random() * 2 - 1; }
          return out;
        }
        if (who === 'kid') { late.push(Object.assign({}, out)); const btn = late.length > 120 ? late[late.length - 121] : {}, mv = late.length > 36 ? late[late.length - 37] : {};
          if (late.length > 130) late.shift(); const r = Object.assign({}, btn); r.ax = mv.ax || 0; r.ay = mv.ay || 0; return r; }
        return out;
      };
      delete G.results[i];
      P.loadLevel(i);
      G.introT = 0;
      const st = G.mst, TB = PINBALL_TABLE;
      st.phase = 'play'; st.phaseT = 0;
      const startSec = sec >= 0 ? sec : part > 0 ? TB.sections.findIndex(s => s.part === part - 1) : -1;
      if (startSec > 0) {
        const s0 = TB.sections[startSec];
        // everything below this section counts as done (the gates latched, the ledges down, the bridges built)
        for (const g of TB.gates) if (g.d < s0.d0) st.gate[g.id].latched = true;
        for (const s of TB.stairs) if (s.steps[0] < s0.d0) st.stairs[s.id].latched = true;
        for (const f of TB.flippers) if (TB.byId[f.cradle].d < s0.d0) st.ledge[f.id].latched = true;
        for (const b of TB.bridges) if (b.d0 < s0.d0) st.bridge[b.id].latched = true;
        TB.tilts.forEach((tl, k) => { if (tl.at < s0.d0) st.tilt.done[k] = true; });
        st.balls.forEach((b, k) => { b.x = s0.spawn[k][0]; b.d = s0.spawn[k][1]; b.sec = startSec; });
        st.both = startSec;
      }
      if (who === 'swap') st.balls.forEach(b => { b.x = -b.x; });
      const steps = Math.round(maxT / P.DT), every = trace ? Math.round(trace / P.DT) : 0, lines = [], events = [];
      let n = 0; const secT = {}, fxSeen = { n: 0 }, gateAt = [];
      let revs = [0, 0], lastAx = [0, 0], revWin = [[], []], worstRev = [0, 0], worstAt = ['', ''];
      while (n < steps && G.mode === 'play') {
        for (let k = 0; k < 600 && n < steps && G.mode === 'play'; k++, n++) {
          window.__inStep = true;
          if (who === 'idle') { const p0 = G.players[0]; for (const key in p0.input) p0.input[key] = false; }
          P.step(P.DT);
          window.__inStep = false;
          const s = G.mst, tnow = n * P.DT;
          for (const b of s.balls) { const si = TB.secAt(b.d).i; secT[si] = (secT[si] || 0) + P.DT / 2; }
          // the computer's reversals of its push (shaking)
          for (const p of G.players) {
            const ax = p.input.ax || 0, ay = p.input.ay || 0, m = Math.hypot(ax, ay);
            if (m > 0.5) {
              const a = Math.atan2(ay, ax), la = lastAx[p.id];
              if (la !== null && la !== 0 && Math.abs(Math.atan2(Math.sin(a - la), Math.cos(a - la))) > 2.4) { revWin[p.id].push(tnow); }
              lastAx[p.id] = a;
            }
            revWin[p.id] = revWin[p.id].filter(x => x > tnow - 1);
            if (revWin[p.id].length > worstRev[p.id]) { worstRev[p.id] = revWin[p.id].length; const bb = s.balls[p.id]; worstAt[p.id] = tnow.toFixed(1) + 's@(' + bb.x.toFixed(1) + ',' + bb.d.toFixed(1) + ')'; }
          }
          for (const f of s.fx) if (f.n > fxSeen.n) {
            fxSeen.n = f.n;
            if (['gateUp', 'latch', 'stairsDone', 'bridgeLatch', 'flip', 'twinFire', 'lever', 'drain', 'saved', 'drop', 'knocked', 'help', 'tilt', 'multiball', 'finish', 'magGrab'].includes(f.k))
              events.push(tnow.toFixed(0) + 's ' + f.k + (f.id ? ':' + f.id : '') + (f.who != null && f.who >= 0 ? '(' + 'PB'[f.who] + ')' : '') + (f.ok === false ? ' FAIL' : ''));
          }
          if (every && n % every === 0) { const [a, b] = s.balls; lines.push(`${tnow.toFixed(1)}s P ${a.mode} (${a.x.toFixed(1)},${a.d.toFixed(1)}) B ${b.mode} (${b.x.toFixed(1)},${b.d.toFixed(1)}) both ${s.both} stars ${s.stars} ${P.CPU.bubbles.map(q => (q && q.t > 0 ? '"' + q.text + '"' : '')).join(' ')}`); }
        }
        await new Promise(r => setTimeout(r, 0));
      }
      const s = G.mst, res = G.results[i];
      return { simT: +(n * P.DT).toFixed(1), cleared: !!res, medal: res && res.medal && res.medal.tier, phase: s.phase,
        stars: s.stars, max: TB.stars.length, drains: s.drains, saves: s.saves, knocks: s.knocks, drops: s.drops, opened: s.opened, help: s.helpN,
        secT: Object.entries(secT).map(([k, v]) => k + ':' + v.toFixed(0)).join(' '), events, cpuErrs: [...P.CPU.errs], trace: lines, worstRev, worstAt,
        at: s.balls.map(b => b.mode + '(' + b.x.toFixed(1) + ',' + b.d.toFixed(1) + ')').join(' ') };
    }, { who, maxT, seed, clumsy, trace, part, sec });
    if (r.trace.length) console.log(r.trace.join('\n'));
    console.log(`${who}${who === 'noisy' || who === 'kid' ? '(' + ['Pip', 'Bo'][clumsy] + ')' : ''} s${seed}: ${r.cleared ? 'JACKPOT' : 'NOT DONE (' + r.phase + ' at ' + r.at + ')'} in ${r.simT}s  stars ${r.stars}/${r.max} (${Math.round(r.stars / r.max * 100)}%)  drains ${r.drains}  saves ${r.saves}  knocks ${r.knocks}  drops ${r.drops}  opened P${r.opened[0]} B${r.opened[1]}  help ${r.help}${r.medal != null ? '  medal ' + r.medal : ''}  worst reversals/s P${r.worstRev[0]} ${r.worstAt[0]} B${r.worstRev[1]} ${r.worstAt[1]}\n  section secs: ${r.secT}\n  ${r.events.join(' | ')}${r.cpuErrs.length ? '\n  CPU ERR ' + r.cpuErrs : ''}${errors.length ? '\n  PAGE ERR ' + errors.slice(0, 3).join(' | ').slice(0, 800) : ''}`);
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
