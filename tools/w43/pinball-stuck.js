#!/usr/bin/env node
// 43-2 Pinball Panic: people who play badly, beside the computer, in real 1-player mode (the person's seat is NOT a
// computer player, so the computer speaks, picks its lane and waits the way it does for a person). Drawing off.
// Each persona is either a fixed bad habit or the level's own brain steering the person's ball, spoiled in one way.
//   node tools/w43/pinball-stuck.js [persona ...] [--seat=0|1] [--max=600] [--sec=N] [--trace=5]
//   good      the brain, a quarter of a second late (a baseline: must hit the Jackpot)
//   hopper    the brain, hopping non-stop
//   cupleave  the brain, but leaves a cup the moment it is in it
//   drainer   the brain, but steers into every outlane it comes near (three times each)
//   crowd     always rolls to wherever the computer is (both in one lane)
//   up        only ever pushes up the table (never opens anything on purpose)
//   down      only ever pushes down the table
//   mash      random pushes and hops
//   cupsit    the brain, but never leaves a cup
// It reports: whether the Jackpot was hit, drains, gold help, the longest spell with no progress, how long both balls
// spent in one lane above a divider, any frame with a ball inside a solid, the computer's reversals a second and how
// often it spoke. `good` and `drainer` must finish (the others are fair loops: a cup must be sat in); nobody may put a ball inside a solid, make
// the computer shake (more than 3 reversals in a second), or raise an error.
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const all = ['good', 'hopper', 'cupleave', 'drainer', 'crowd', 'up', 'down', 'mash', 'cupsit'];
const who = args.filter(a => !a.startsWith('--')), list = who.length ? who : all;
const seat = +opt('seat', 0), maxT = +opt('max', 600), sec = +opt('sec', -1), trace = +opt('trace', 0);
const MUST = ['good', 'drainer'];
(async () => {
  const browser = await chromium.launch();
  let bad = 0;
  await Promise.all(list.map(async persona => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    await page.addInitScript(() => { let s = 99; Math.random = () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; });
    await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
    await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
    const r = await page.evaluate(async ({ persona, seat, maxT, sec, trace }) => {
      const P = window.__pipbo, G = P.G, DT = P.DT, TB = PINBALL_TABLE, CO = PINBALL, hyp = Math.hypot;
      const i = P.LEVELS.findIndex(l => l.mode === 'arcadepinball');
      G.manual = true; P.K3D.noRender = true; Sfx.play = () => {};
      P.CPU.errs.clear(); P.CPU.skillOf = [null, null]; P.CPU.filter = null;
      G.cpuOn = [seat !== 0, seat !== 1];
      delete G.results[i];
      P.loadLevel(i); G.introT = 0;
      const st = G.mst; st.phase = 'play'; st.phaseT = 0;
      if (sec > 0) {
        const s0 = TB.sections[sec];
        for (const g of TB.gates) if (g.d < s0.d0) st.gate[g.id].latched = true;
        for (const s of TB.stairs) if (s.steps[0] < s0.d0) st.stairs[s.id].latched = true;
        for (const f of TB.flippers) if (TB.byId[f.cradle].d < s0.d0) st.ledge[f.id].latched = true;
        for (const b of TB.bridges) if (b.d0 < s0.d0) st.bridge[b.id].latched = true;
        TB.tilts.forEach((tl, k) => { if (tl.at < s0.d0) st.tilt.done[k] = true; });
        st.balls.forEach((b, k) => { b.x = s0.spawn[k][0]; b.d = s0.spawn[k][1]; b.sec = sec; });
        st.both = sec;
      }
      const me = G.players[seat], cpu = G.players[1 - seat], brain = cpuBrainFor(G.level.def), bs = {};
      brain.reset(bs);
      const laneOf = x => (x < 0 ? -1 : 1);
      const drained = new Map(); let aim = null, wasDrain = false;
      const late = []; let mash = { t: 0, ax: 0, ay: 0 }, hopT = 0, prevJ = false;
      const think = () => {
        const b = st.balls[seat], ob = st.balls[1 - seat];
        let out = {};
        const useBrain = ['good', 'hopper', 'cupleave', 'drainer', 'cupsit'].includes(persona);
        if (useBrain) {
          const info = { L: G.level, def: G.level.def, mst: st, room: 0, skill: 1, partnerCpu: true, partnerIdle: 0, frozen: false, intro: false, time: G.time };
          const quiet = window.cpuSay; // (the person's brain must not speak)
          out = Object.assign({}, brain.think(bs, me, cpu, DT, info) || {});
          if (persona === 'good') { late.push(out); out = late.length > 30 ? late.shift() : {}; }
        }
        if (persona === 'hopper') { hopT -= DT; if (hopT <= 0) { hopT = 0.25; out.jump = 'tap'; } }
        if (persona === 'cupleave' && b.mode === 'seat' && TB.byId[b.seat] && TB.byId[b.seat].kind === 'cup') { out.jump = 'tap'; out.ay = -1; }
        if (persona === 'cupsit' && b.mode === 'seat' && TB.byId[b.seat] && TB.byId[b.seat].kind === 'cup') out = {};
        if (persona === 'drainer' && b.mode === 'roll') {
          const h = TB.holes.find(q => q.r != null && laneOf(q.x) === laneOf(b.x) && Math.abs(q.d - b.d) < 5 && hyp(q.x - b.x, q.d - b.d) < 6 && (drained.get(q) || 0) < 3);
          if (h) { aim = h; const m = hyp(h.x - b.x, h.d - b.d) || 1; out = { ax: (h.x - b.x) / m, ay: -(h.d - b.d) / m }; }
        }
        if (persona === 'crowd') { const m = hyp(ob.x - b.x, ob.d + 1 - b.d) || 1; out = { ax: (ob.x - b.x) / m, ay: -(ob.d + 1 - b.d) / m }; }
        if (persona === 'up') out = { ax: 0, ay: -1 };
        if (persona === 'down') out = { ax: 0, ay: 1 };
        if (persona === 'mash') { mash.t -= DT; if (mash.t <= 0) { const a = Math.random() * 6.283; mash = { t: 0.2 + Math.random() * 0.6, ax: Math.cos(a), ay: Math.sin(a) - 0.25, j: Math.random() < 0.4 }; } out = { ax: mash.ax, ay: mash.ay, jump: mash.j ? 'tap' : false }; }
        const j = out.jump === 'tap' ? !prevJ : !!out.jump;
        me.input = { ax: out.ax || 0, ay: out.ay || 0, jump: j };
        if (j && !prevJ) me.pendingJump = true;
        prevJ = j;
      };
      const steps = Math.round(maxT / DT), lines = [];
      let n = 0, best = -1, bestT = 0, stall = 0, stallAt = '', oneLane = 0, oneLaneMax = 0, oneLaneAt = '', inside = 0, insideAt = '', nan = false;
      let lastA = null, revWin = [], worstRev = 0, worstAt = '', said = 0, lastBubble = '', says = {};
      const divided = d => !(d < 10.5 || (d > 78 && d < 96) || (d > 182 && d < 197) || (d > 282 && d < 299.4) || d > 371);
      while (n < steps && G.mode === 'play') {
        for (let k = 0; k < 600 && n < steps && G.mode === 'play'; k++, n++) {
          think();
          P.step(DT);
          { const dr = st.balls[seat].mode === 'drain'; if (dr && !wasDrain && aim) drained.set(aim, (drained.get(aim) || 0) + 1); wasDrain = dr; }
          const t = n * DT, B = st.balls;
          const prog = Math.min(B[0].d, B[1].d) + st.stars * 0.01 + Object.values(st.gate).filter(g => g.latched).length;
          if (prog > best + 0.5) { best = prog; bestT = t; }
          if (t - bestT > stall) { stall = t - bestT; stallAt = B.map(b => b.mode + '(' + b.x.toFixed(1) + ',' + b.d.toFixed(1) + ')').join(' '); }
          if (B.every(b => b.mode === 'roll' || b.mode === 'seat') && laneOf(B[0].x) === laneOf(B[1].x) && divided(B[0].d) && divided(B[1].d)) { oneLane += DT; if (oneLane > oneLaneMax) { oneLaneMax = oneLane; oneLaneAt = B.map(b => '(' + b.x.toFixed(1) + ',' + b.d.toFixed(1) + ')').join(' '); } } else oneLane = 0;
          for (const b of B) {
            if (!isFinite(b.x) || !isFinite(b.d)) nan = true;
            if (b.mode === 'roll' && (TB.near(b.d).walls.some(w => w.kind === 'rail' && CO.segDist(b.x, b.d, w.a[0], w.a[1], w.b[0], w.b[1]) < 0.9 + w.r - 0.12) || TB.near(b.d).posts.some(q => hyp(b.x - q.x, b.d - q.d) < 0.9 + q.r - 0.12))) { inside++; if (!insideAt) insideAt = t.toFixed(1) + 's ' + PCOLNAME(b.id) + ' (' + b.x.toFixed(2) + ',' + b.d.toFixed(2) + ')'; }
          }
          const ax = cpu.input.ax || 0, ay = cpu.input.ay || 0;
          if (hyp(ax, ay) > 0.5) { const a = Math.atan2(ay, ax); if (lastA !== null && Math.abs(Math.atan2(Math.sin(a - lastA), Math.cos(a - lastA))) > 2.4) revWin.push(t); lastA = a; }
          revWin = revWin.filter(x => x > t - 1);
          if (revWin.length > worstRev) { worstRev = revWin.length; const cb = B[1 - seat]; worstAt = t.toFixed(1) + 's@(' + cb.x.toFixed(1) + ',' + cb.d.toFixed(1) + ')'; }
          const q = P.CPU.bubbles[1 - seat], txt = q && q.t > 0 ? q.text : '';
          if (txt && txt !== lastBubble) { said++; says[txt] = (says[txt] || 0) + 1; }
          lastBubble = txt;
          if (trace && n % Math.round(trace / DT) === 0) lines.push(t.toFixed(0) + 's ' + B.map(b => b.mode + '(' + b.x.toFixed(1) + ',' + b.d.toFixed(1) + ')').join(' ') + ' both ' + st.both + (txt ? ' "' + txt + '"' : ''));
        }
        await new Promise(r => setTimeout(r, 0));
      }
      function PCOLNAME(k) { return k ? 'Bo' : 'Pip'; }
      const res = G.results[i];
      return { t: +(n * DT).toFixed(0), cleared: !!res, medal: res && res.medal && res.medal.tier, stars: st.stars, max: TB.stars.length, drains: st.drains, saves: st.saves, drops: st.drops, knocks: st.knocks,
        help: st.helpN, stall: +stall.toFixed(0), stallAt, oneLane: +oneLaneMax.toFixed(0), oneLaneAt, inside, insideAt, nan, worstRev, worstAt, said, says, cpuErrs: [...P.CPU.errs], lines,
        at: st.balls.map(b => b.mode + '(' + b.x.toFixed(1) + ',' + b.d.toFixed(1) + ')').join(' ') };
    }, { persona, seat, maxT, sec, trace });
    const must = MUST.includes(persona);
    const fails = [];
    if (must && !r.cleared) fails.push('did not finish');
    if (r.inside > 3) fails.push('ball inside a solid for ' + r.inside + ' frames, first ' + r.insideAt);
    if (r.nan) fails.push('NaN position');
    if (r.worstRev > 3) fails.push('computer shakes: ' + r.worstRev + ' reversals in a second at ' + r.worstAt);
    if (r.cpuErrs.length) fails.push('brain error ' + r.cpuErrs);
    if (errors.length) fails.push('page error ' + errors[0]);
    if (fails.length) bad++;
    if (r.lines.length) console.log(r.lines.join('\n'));
    console.log(`${fails.length ? 'BAD' : ' ok'} ${persona.padEnd(9)} as ${seat ? 'Bo ' : 'Pip'}: ${r.cleared ? 'JACKPOT in ' + r.t + ' s, medal ' + r.medal : 'not done after ' + r.t + ' s at ' + r.at}  stars ${Math.round(r.stars / r.max * 100)}%  drains ${r.drains}  drops ${r.drops}  knocks ${r.knocks}  saves ${r.saves}  help ${r.help}`
      + `\n      longest stall ${r.stall} s ${r.stall > 60 ? 'at ' + r.stallAt : ''}  one lane ${r.oneLane} s ${r.oneLane > 30 ? 'at ' + r.oneLaneAt : ''}  cpu reversals/s ${r.worstRev}  spoke ${r.said}x ${JSON.stringify(r.says)}`
      + (fails.length ? '\n      ' + fails.join('; ') : ''));
    await page.close();
  }));
  await browser.close();
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
