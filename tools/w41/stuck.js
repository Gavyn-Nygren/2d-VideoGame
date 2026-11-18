#!/usr/bin/env node
// 41-1 Carry It Together: person-like partners for the computer (drawing off). Unlike play.js (where the "person" is the
// computer's own brain made clumsy), these are simple scripted people that do NOT think like the computer, to find
// ways a real person could lock the level or make the computer shake. None of them ever backs up or waits for the
// computer on purpose; the most they do is take their thumb off for 3 s after 3 s of pushing and getting nowhere.
// Usage: node tools/w41/stuck.js [person ...] [--page=1-4|all] [--side=0|1] [--max=600] [--trace=5]
//   point     walks to the POINT end, leads along the route, traces lines, never waits for doors or the train
//   eraser    takes the nearest end and just walks the route (like everyone but notrace, they run the point along a
//             line if they find themselves holding it)
//   letgo     as eraser, but lets go every 7 s and takes hold again 1.5 s later
//   late      stands still for 20 s at the start of every page, then as eraser
//   still     as eraser, but freezes (still holding) for 8 s in every 15
//   edges     as eraser, but walks sideways off the route for 1.5 s in every 12
//   wrongway  as eraser, but walks back the way they came for 5 s in every 25
//   reversed  the pencil starts every page turned round (eraser first); as eraser
//   notrace   as point, but never traces a line (must not crash or shake; it cannot clear)
// Prints for each: cleared or where it ended, time, drops, the longest wait with no progress, the computer's worst
// second of stick reversals (left/right and up/down counted together: more than 6 is shaking), the pencil's worst length error (from 1.5 s after the second grab: a grab eases the pencil to the hands), and any errors.
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const ALL = ['point', 'eraser', 'letgo', 'late', 'still', 'edges', 'wrongway', 'reversed', 'notrace'];
const people = args.filter(a => !a.startsWith('--')); if (!people.length) people.push(...ALL);
const which = opt('page', 'all'), side = +opt('side', 0), maxT = +opt('max', 600), trace = +opt('trace', 0);
const dbg = opt('dbg', '') ? opt('dbg', '').split(',').map(Number) : null; // --dbg=from,to,everyNsteps: the computer's stick, step by step

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  await page.addInitScript(() => {
    let s = 2463534242; const gen = () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    Math.random = gen;
  });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  let bad = 0;
  for (const who of people) {
    errors.length = 0;
    const r = await page.evaluate(async ({ who, which, side, maxT, trace, dbg }) => {
      const P = window.__pipbo, G = P.G, K3D = P.K3D, hyp = Math.hypot;
      const i = P.LEVELS.findIndex(l => l.mode === 'popcarry');
      G.manual = true; K3D.noRender = true;
      P.CPU.errs.clear(); P.CPU.skillOf = [null, null]; P.CPU.filter = null;
      G.cpuOn = side === 0 ? [false, true] : [true, false];
      delete G.results[i];
      P.loadLevel(i);
      const all = which === 'all';
      if (!all) for (let k = 1; k < +which; k++) P.nextRoom();
      const M = P.MODES.popcarry, me = G.players[side], cpu = G.players[1 - side];
      const base = who === 'point' || who === 'notrace' ? 'point' : 'eraser';
      let pageK = -1, pageT = 0, letT = 0;
      const person = (t, dt) => {
        const st = G.mst, pl = M.plan(st), inp = me.input, b = me.b3;
        for (const key in inp) inp[key] = false; inp.ax = 0; inp.ay = 0; me.mvHold = null;
        if (st.k !== pageK) {
          pageK = st.k; pageT = 0;
          if (who === 'reversed') { st.pen.a += Math.PI; }
        }
        pageT += dt;
        if (!pl || pl.busy || G.introT > 0 || pl.away[side] || pl.sit[side] > 0) return;
        const go = (x, z, sp = 1) => { const q = P.cpuNav3.stick(x - b.x, z - b.z); inp.ax = q.ax * sp; inp.ay = q.ay * sp; };
        if (who === 'late' && pageT < 20) return;
        const E = pl.ends, mine = pl.hold[side], R = pl.R, sMe = pl.ps[side];
        if (mine < 0) {
          if (pl.penAway) return;
          if (who === 'letgo' && letT > 0) { letT -= dt; return; }
          const theirs = pl.hold[1 - side];
          let e = theirs >= 0 ? 1 - theirs : base === 'point' ? 1 : (hyp(E[0].x - b.x, E[0].z - b.z) <= hyp(E[1].x - b.x, E[1].z - b.z) ? 0 : 1);
          const ux = E[e].x - pl.pen.x, uz = E[e].z - pl.pen.z, ul = hyp(ux, uz) || 1, gx = E[e].x + ux / ul * 0.5, gz = E[e].z + uz / ul * 0.5;
          if (hyp(gx - b.x, gz - b.z) < 0.5) { if (!(person.tap > t)) { me.pendingAct = true; person.tap = t + 1; } return; }
          // (walks round the pencil's side rather than along it when heading for the far end)
          go(gx, gz, Math.max(0.3, Math.min(1, hyp(gx - b.x, gz - b.z) / 2)));
          return;
        }
        if (pl.hold[1 - side] < 0) return;
        if (who === 'letgo' && (person.nextLet = person.nextLet || t + 7) < t) { person.nextLet = t + 7; letT = 1.5; me.pendingAct = true; return; }
        if (who === 'still' && t % 15 > 7) return;
        let tg = R.at(sMe + 1.5);
        if (who === 'wrongway' && t % 25 > 20) tg = R.at(Math.max(0, sMe - 1.5));
        if (who === 'edges' && t % 12 > 10.5) { const q = R.at(sMe); tg = { x: b.x - q.tz * 2, z: b.z + q.tx * 2 }; }
        if (who !== 'notrace' && mine === 1) {
          const L = pl.lines.find(l => !l.done && (hyp(l.dots[Math.min(l.n, l.dots.length - 1)][0] - E[1].x, l.dots[Math.min(l.n, l.dots.length - 1)][1] - E[1].z) < 6 || pl.s > R.project(l.dots[0][0], l.dots[0][1]) - 2.5));
          if (L) { const d = L.dots[Math.min(L.n, L.dots.length - 1)]; tg = { x: d[0] + Math.cos(pl.pen.a) * 0.5, z: d[1] + Math.sin(pl.pen.a) * 0.5 }; }
        }
        // (not a brick: after 3 s of pushing and getting nowhere, they take their thumb off for 3 s and look)
        if (person.off > t) return;
        if (hyp(b.x - (person.lx || 0), b.z - (person.lz || 0)) > 0.4) { person.lx = b.x; person.lz = b.z; person.lt = t; }
        if (t - person.lt > 3) { person.off = t + 3; person.lt = t + 3; return; }
        if (hyp(tg.x - b.x, tg.z - b.z) > 0.2) go(tg.x, tg.z);
      };
      const steps = Math.round(maxT / P.DT), every = trace ? Math.round(trace / P.DT) : 0, lines = [];
      let n = 0, best = -1, bestT = 0, stall = 0, stallAt = '', worstRev = 0, rev = 0, revT = 0, lastX = 0, lastY = 0, lenErr = 0, revAt = '', lenAt = '', bothT = 0, nan = false, said = new Set();
      const room0 = G.room;
      while (n < steps && G.mode === 'play' && (all || G.room === room0)) {
        for (let k = 0; k < 600 && n < steps && G.mode === 'play' && (all || G.room === room0); k++, n++) {
          const t = n * P.DT, st = G.mst;
          person(t, P.DT);
          P.step(P.DT);
          const s2 = G.mst;
          // progress: page * 1000 + route distance + lines
          const prog = s2.k * 1000 + s2.s + s2.stats.lines * 0.01;
          if (prog > best + 0.2) { best = prog; bestT = t; }
          if (t - bestT > stall) { stall = t - bestT; stallAt = 'page ' + (s2.k + 1) + ' s=' + s2.s.toFixed(1); }
          // the computer's stick reversals in each second
          const ci = cpu.input, cx = Math.sign(Math.round((ci.ax || 0) * 3)), cy = Math.sign(Math.round((ci.ay || 0) * 3));
          if (cx && lastX && cx !== lastX) rev++; if (cy && lastY && cy !== lastY) rev++;
          if (cx) lastX = cx; if (cy) lastY = cy;
          if ((revT += P.DT) >= 1) { if (rev > worstRev) { worstRev = rev; revAt = t.toFixed(0) + 's page ' + (s2.k + 1) + ' s=' + s2.s.toFixed(1); } rev = 0; revT = 0; }
          if (s2.hold[0] >= 0 && s2.hold[1] >= 0) { bothT += P.DT; const le = Math.abs(hyp(G.players[0].b3.x - G.players[1].b3.x, G.players[0].b3.z - G.players[1].b3.z) - M.S.gap); if (bothT > 1.5 && le > lenErr) { lenErr = le; lenAt = t.toFixed(1) + 's page ' + (s2.k + 1) + ' s=' + s2.s.toFixed(1); } } else bothT = 0;
          for (const p of G.players) if (![p.b3.x, p.b3.y, p.b3.z].every(Number.isFinite)) nan = true;
          for (const bb of P.CPU.bubbles) if (bb && bb.t > 0) said.add(bb.text);
          if (dbg && t >= dbg[0] && t < dbg[1] && n % dbg[2] === 0) lines.push(`  ${t.toFixed(3)} cpu ax ${(ci.ax || 0).toFixed(2)} ay ${(ci.ay || 0).toFixed(2)} at ${cpu.b3.x.toFixed(2)},${cpu.b3.z.toFixed(2)}^${cpu.b3.y.toFixed(2)} v ${cpu.b3.vx.toFixed(2)},${cpu.b3.vz.toFixed(2)} | me ${me.b3.x.toFixed(2)},${me.b3.z.toFixed(2)} in ${(me.input.ax || 0).toFixed(2)},${(me.input.ay || 0).toFixed(2)} head ${K3D.heading.toFixed(2)}`);
          if (every && n % every === 0) {
            const f = q => q.x.toFixed(1) + ',' + q.z.toFixed(1) + (q.y > 0.05 ? '^' + q.y.toFixed(1) : '');
            lines.push(`${t.toFixed(1)}s p${s2.k + 1} s=${s2.s.toFixed(1)} hold ${s2.hold} Pip ${f(G.players[0].b3)} Bo ${f(G.players[1].b3)} pen a${(s2.pen.a * 57.3).toFixed(0)} drops ${s2.stats.drops} ${s2.lines.map(l => l.id + ':' + l.n + '/' + l.dots.length).join(' ')} ${P.CPU.bubbles.map(b => (b && b.t > 0 ? '"' + b.text + '"' : '')).join(' ')}`);
          }
          void st;
        }
        await new Promise(r => setTimeout(r, 0));
      }
      const s = G.mst;
      return { cleared: all ? !!G.results[i] : G.room > room0 || !!G.results[i], t: +(n * P.DT).toFixed(1), k: s.k, s: s.s, drops: s.stats.drops, why: s.stats.why, helps: s.stats.helpWhat,
        stall: +stall.toFixed(1), stallAt, worstRev, revAt, lenAt, lenErr: +lenErr.toFixed(3), nan, cpuErrs: [...P.CPU.errs], said: [...said], trace: lines };
    }, { who, which, side, maxT, trace, dbg });
    if (r.trace.length) console.log(r.trace.join('\n'));
    const flags = [];
    if (!r.cleared && who !== 'notrace') flags.push('DID NOT CLEAR');
    if (r.worstRev > 6) flags.push('SHAKES');
    if (r.lenErr > 0.12) flags.push('PENCIL STRETCHED');
    if (r.nan) flags.push('NaN');
    if (r.cpuErrs.length || errors.length) flags.push('ERRORS');
    if (flags.length) bad++;
    console.log(`${who.padEnd(9)} ${r.cleared ? 'cleared' : 'ended page ' + (r.k + 1) + ' s=' + r.s.toFixed(1)} in ${r.t}s  drops ${r.drops}${r.helps.length ? ' (help: ' + r.helps.join(',') + ')' : ''}  longest stall ${r.stall}s at ${r.stallAt}  reversals/s ${r.worstRev}${r.worstRev > 6 ? ' (at ' + r.revAt + ')' : ''}  length err ${r.lenErr}${r.lenErr > 0.12 ? ' (at ' + r.lenAt + ')' : ''}  said: ${r.said.join(' | ')}${flags.length ? '   <<< ' + flags.join(', ') : ''}${r.cpuErrs.length ? ' CPU ERR ' + r.cpuErrs : ''}${errors.length ? ' PAGE ERR ' + errors.slice(0, 3).join(' | ').slice(0, 300) : ''}`);
    if (r.drops) console.log('          ' + r.why.join(','));
  }
  await browser.close();
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
