#!/usr/bin/env node
// 41-2 Page Turner Chase: person-like partners for the computer (drawing off). Unlike chase-play.js (where the
// "person" is the computer's own brain made slow or clumsy), these are simple scripted people who do NOT think like
// the computer, to find ways a real person could strand it, make it shake or cost the pair Flats it should not.
// Usage: node tools/w41/chase-stuck.js [person ...] [--page=1-4|all] [--side=0|1] [--max=400] [--trace=secs]
//   cross     waits at each piece for the computer to hold, crosses, then holds the far tab for it; rides the ship
//   hold      goes for the near tab (the ship's long tab) first and holds; crosses when the computer has the far tab
//   selfish   as cross, but never holds a far tab: just runs on (the Roll must bring the computer over). Page 1 lets
//             them through; the castle does not (gate then wheel, with the Roll close behind), so this one is not
//             expected to clear: it must only never lock, shake or throw
//   dither    walks up to the near tab and stands there without pulling (the computer must take over)
//   sametab   as cross, but at twin tabs always walks to the FIRST tab, whoever they are
//   eager     as hold, and never waits for sliders, the finger or the computer: always pushing on
//   pause     as cross, but takes their thumbs off for 6 s in every 20
//   back      as cross, but walks back the way they came for 3 s in every 16
// None of them looks at the finger; only 'cross' and 'hold' wait for a sliding figure.
// Prints for each: cleared or where it ended, time, Flats (the computer's own listed with why and where), rewinds, the
// longest wait with no progress, the computer's worst second of stick reversals on the ground (more than 6 is shaking), what it said.
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const ALL = ['cross', 'hold', 'selfish', 'dither', 'sametab', 'eager', 'pause', 'back'];
const people = args.filter(a => !a.startsWith('--')); if (!people.length) people.push(...ALL);
const which = opt('page', 'all'), side = +opt('side', 0), maxT = +opt('max', 400), trace = +opt('trace', 0);

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  let bad = 0;
  for (const who of people) {
    errors.length = 0;
    const r = await page.evaluate(async ({ who, which, side, maxT, trace }) => {
      const P = window.__pipbo, G = P.G, K3D = P.K3D, hyp = Math.hypot, PC = POPCHASE;
      const i = P.LEVELS.findIndex(l => l.mode === 'popchase');
      G.manual = true; K3D.noRender = true;
      P.CPU.errs.clear(); P.CPU.skillOf = [null, null]; P.CPU.filter = null;
      G.cpuOn = side === 0 ? [false, true] : [true, false];
      delete G.results[i];
      P.loadLevel(i);
      const all = which === 'all';
      if (!all) for (let k = 1; k < +which; k++) P.nextRoom();
      const me = G.players[side], cpu = G.players[1 - side];
      const base = who === 'hold' || who === 'eager' ? 'hold' : who === 'dither' ? 'dither' : who === 'selfish' ? 'selfish' : 'cross';
      const live = p => p.pc && p.pc.mode === 'run';
      const exitS = (L3, pc) => pc.kind === 'flap' ? PC.progress(L3, pc.x + 0.9, pc.z) : pc.kind === 'twin' && pc.does === 'stair' ? PC.progress(L3, pc.x + 5.8, pc.z)
        : pc.kind === 'twin' && pc.does === 'end' ? 1e9 : pc.kind === 'ship' ? PC.progress(L3, pc.x1 + 0.05, pc.z) : pc.sOut;
      const entryS = (L3, pc) => pc.kind === 'flap' ? PC.progress(L3, pc.x - 0.9, pc.z) : pc.kind === 'twin' && pc.does === 'stair' ? PC.progress(L3, pc.x - 5.6, pc.z)
        : pc.kind === 'ship' ? PC.progress(L3, pc.x0 - 0.6, pc.z) : pc.kind === 'twin' && pc.does === 'end' ? pc.tabs[0].s : pc.sIn;
      const isOpen = pc => (pc.kind === 'flap' ? pc.sol.ghost : pc.kind === 'twin' ? pc.popped : pc.kind === 'bridge' ? !pc.sol.ghost && pc.e >= 0.999 : !pc.sol.ghost);
      let jumpT = 0, heldT = 0, air = null;
      const person = (t, dt) => {
        const st = G.mst, L3 = st.L3, inp = me.input, b = me.b3;
        for (const key in inp) inp[key] = false; inp.ax = 0; inp.ay = 0;
        if (jumpT > 0) { jumpT -= dt; inp.jump = true; }
        if (G.introT > 0 || st.turn || st.ending || !live(me)) { air = null; return; }
        if (who === 'pause' && t % 20 > 14) return;
        const go = (x, z, sp = 1) => { const d = hyp(x - b.x, z - b.z); if (d < 0.15) return true; const q = P.cpuNav3.stick(x - b.x, z - b.z), m = Math.min(1, 0.3 + d) * sp; inp.ax = q.ax * m; inp.ay = q.ay * m; return false; };
        const hop = () => { if (b.ground && jumpT <= 0) { me.pendingJump = true; jumpT = 0.3; inp.jump = true; } };
        const myS = PC.progress(L3, b.x, b.z), cS = live(cpu) ? PC.progress(L3, cpu.b3.x, cpu.b3.z) : -1;
        const along = (s) => { const q = PC.pointAt(L3, Math.min(s, myS + 1.6)); return go(q.x, q.z); };
        const hopLogs = () => { for (const lg of L3.logs) if (lg.x - b.x > 0.45 && lg.x - b.x < 1.2 && Math.abs(lg.z - b.z) < 2.6) hop(); };
        const holdTab = tb => { if (hyp(tb.x - b.x, tb.z - b.z) < 0.55) { inp.act = true; inp.ax = inp.ay = 0; return true; } go(tb.x, tb.z); return false; };
        if (who === 'back' && t % 16 > 13) { const q = PC.pointAt(L3, Math.max(0, myS - 1.6)); go(q.x, q.z); return; }
        // wave crests: stand at the bank in the corridor's middle, jump when the next stone slides in front
        if (L3.crests.length) {
          const g = L3.def.crests[0], [gx0, gx1] = L3.def.gaps[g.gap], rows = L3.crests.slice().sort((a, c) => a.x - c.x);
          if (b.x > gx0 - 2.5 && b.x < gx1 + 0.2) {
            if (!b.ground && air) { go(air.x, air.sol ? air.sol.z : b.z); return; }
            const on = rows.findIndex(c => b.ground && b.on === c.sol), next = rows[on + 1];
            if (on < 0 && b.x <= gx0) {
              const zc = rows[0].zc;
              if (go(gx0 - 0.45, zc) || hyp(gx0 - 0.45 - b.x, zc - b.z) < 0.3) { if (Math.abs(PC.crestZ(rows[0], st.T + 0.4) - b.z) < 0.4) { air = { x: rows[0].x, sol: rows[0].sol }; hop(); } }
              return;
            }
            if (on >= 0) {
              if (!next) { if (Math.abs(b.x - rows[on].x) < 0.4) { air = { x: gx1 + 1.2, sol: null }; hop(); go(gx1 + 1.2, b.z); } else go(rows[on].x, rows[on].sol.z); return; }
              if (Math.abs(PC.crestZ(next, st.T + 0.4) - PC.crestZ(rows[on], st.T + 0.4)) < 0.4 && Math.abs(b.x - rows[on].x) < 0.4) { air = { x: next.x, sol: next.sol }; hop(); go(next.x, next.sol.z); }
              else go(rows[on].x, rows[on].sol.z);
              return;
            }
          }
        }
        air = null;
        // sliding figures (the careful people wait for one)
        if (base !== 'selfish' && who !== 'eager' && who !== 'dither') for (const sl of L3.sliders) { const d = sl.s - myS; if (d > 0.2 && d < 2 && (sl.moving || sl.tell > 0.3)) return; }
        const pieces = L3.pieces.slice().sort((a, c) => entryS(L3, a) - entryS(L3, c));
        const pc = pieces.find(q => myS <= exitS(L3, q));
        const de = L3.dogEar;
        if (!pc || (myS < entryS(L3, pc) - 5 && pc.kind !== 'ship')) {
          // the piece behind me: hold its far tab for the computer (not the selfish)
          const prev = pieces.filter(q => myS > exitS(L3, q)).pop();
          if (prev && base !== 'selfish' && who !== 'eager' && prev.kind !== 'twin' && live(cpu) && cS < exitS(L3, prev) && myS < exitS(L3, prev) + 6) {
            const F = prev.tabs[prev.tabs.length - 1];
            if (prev.kind === 'ship') { const onDeck = cpu.b3.ground && cpu.b3.on === prev.sol; if (onDeck && prev.u < 0.98) holdTab(F); else go(F.x, F.z); return; }
            if (holdTab(F) && F.wheel) { const q = PC.pointAt(L3, F.s), k = P.cpuNav3.stick(q.dx, q.dz); inp.ax = k.ax; inp.ay = k.ay; }
            return;
          }
          if (!pc && de && myS > de.s - 2.5) { go(de.x, de.z); return; }
          along(myS + 1.6); hopLogs(); return;
        }
        const N = pc.tabs[0], F = pc.tabs[pc.tabs.length - 1], cHold = cpu.pc.hold && cpu.pc.hold.pc === pc ? cpu.pc.hold.t : null;
        if (pc.kind === 'twin') {
          if (pc.popped) { along(myS + 1.6); hopLogs(); return; }
          let my = who === 'sametab' ? pc.tabs[0] : (hyp(N.x - b.x, N.z - b.z) < hyp(F.x - b.x, F.z - b.z) ? N : F);
          if (who !== 'sametab' && cHold === my) my = my === N ? F : N;
          if (myS < my.s - 4) { along(my.s); hopLogs(); return; }
          holdTab(my); return;
        }
        if (pc.kind === 'ship') {
          const deck = pc.sol, onDeck = q => q.ground && q.on === deck, strip = pc.tabs[0];
          if (onDeck(b)) { if (pc.u > 0.98) go(pc.x1 + 1.5, pc.z); else go(deck.x, pc.z); return; }
          if (b.x > pc.x1 - 0.1) { along(myS + 1.6); return; }
          const cPast = live(cpu) && cS > exitS(L3, pc);
          if (base === 'hold' && !cPast) {
            // the walker: take the long tab, walk it back when the computer is aboard, keep hold until it is ashore
            if (!(me.pc.hold && me.pc.hold.t === strip)) { holdTab(strip); return; }
            inp.act = true;
            if (onDeck(cpu.b3) || pc.u > 0.05) go(pc.sx1 - 0.3, strip.z);
            return;
          }
          // the rider: board when it is home
          if (pc.u < 0.08) go(deck.x, pc.z); else { const q = PC.pointAt(L3, entryS(L3, pc) - 0.5); go(q.x, q.z); }
          return;
        }
        // bridge, flap, wheel
        const cPast = live(cpu) && cS > exitS(L3, pc), open = isOpen(pc);
        const bank = () => { const q = PC.pointAt(L3, entryS(L3, pc) - 0.6); go(q.x, q.z); };
        if (myS < entryS(L3, pc) - 2.5 && !(base === 'hold' || base === 'dither')) { along(entryS(L3, pc) - 0.6); hopLogs(); return; }
        if (open && cHold) { heldT = 0; along(exitS(L3, pc) + 1); return; }               // it is held for me: cross
        if (myS > entryS(L3, pc) + 0.3 && open) { along(exitS(L3, pc) + 1); return; }     // already on it
        if (base === 'dither' && !cPast) { go(N.x + 0.3, N.z + 0.5); return; }
        if (base === 'hold' && !cPast) { if (holdTab(N) && N.wheel) { const q = PC.pointAt(L3, N.s), k = P.cpuNav3.stick(q.dx, q.dz); inp.ax = k.ax; inp.ay = k.ay; } return; }
        if (base === 'hold' && cPast && !cHold && (heldT += dt) < 4) { holdTab(N); return; }
        bank();
      };
      const steps = Math.round(maxT / P.DT), every = trace ? Math.round(trace / P.DT) : 0, lines = [];
      let n = 0, best = -1, bestT = 0, stall = 0, stallAt = '', worstRev = 0, rev = 0, revT = 0, lastX = 0, lastY = 0, revAt = '', nan = false;
      const said = new Set(), cpuFlats = [], myFlats = [];
      const room0 = G.room; let wasRun = [true, true];
      while (n < steps && G.mode === 'play' && (all || G.room === room0)) {
        for (let k = 0; k < 600 && n < steps && G.mode === 'play' && (all || G.room === room0); k++, n++) {
          const t = n * P.DT;
          person(t, P.DT);
          P.step(P.DT);
          const st = G.mst;
          if (G.introT > 0) G.introT = 0;
          const prog = st.k * 1000 + Math.max(...G.players.map(p => (p.b3 ? PC.progress(st.L3, p.b3.x, p.b3.z) : 0)));
          if (prog > best + 0.3) { best = prog; bestT = t; }
          if (t - bestT > stall && !st.turn && !st.ending) { stall = t - bestT; stallAt = 'page ' + (st.k + 1) + ' x=' + G.players.map(p => p.b3.x.toFixed(0)).join('/'); }
          const ci = cpu.input, cx = Math.sign(Math.round((ci.ax || 0) * 3)), cy = Math.sign(Math.round((ci.ay || 0) * 3));
          // (on the ground only: braking in the air to land on a wave crest is steering, not shaking)
          if (cpu.b3.ground) { if (cx && lastX && cx !== lastX) rev++; if (cy && lastY && cy !== lastY) rev++; }
          if (cx) lastX = cx; if (cy) lastY = cy;
          if ((revT += P.DT) >= 1) { if (rev > worstRev) { worstRev = rev; revAt = t.toFixed(0) + 's page ' + (st.k + 1) + ' x=' + cpu.b3.x.toFixed(1); } rev = 0; revT = 0; }
          for (const p of G.players) {
            if (![p.b3.x, p.b3.y, p.b3.z].every(Number.isFinite)) nan = true;
            const run = live(p);
            if (!run && wasRun[p.id]) (p === cpu ? cpuFlats : myFlats).push('p' + (st.k + 1) + ' ' + (p.pc.why || 'rewind') + '@' + p.pc.from.x.toFixed(0) + ' ' + t.toFixed(0) + 's');
            wasRun[p.id] = run;
          }
          for (const bb of P.CPU.bubbles) if (bb && bb.t > 0) said.add(bb.text);
          if (every && n % every === 0) {
            const f = p => p.b3.x.toFixed(1) + ',' + p.b3.z.toFixed(1) + (p.b3.y > 0.05 ? '^' + p.b3.y.toFixed(1) : '') + (live(p) ? '' : '(' + p.pc.mode + ')') + (p.pc.hold ? '[' + p.pc.hold.pc.kind + p.pc.hold.t.side + ']' : '');
            lines.push(`${t.toFixed(1)}s p${st.k + 1} roll ${st.rollX.toFixed(1)} me ${f(me)} cpu ${f(cpu)} in ${(ci.ax || 0).toFixed(1)},${(ci.ay || 0).toFixed(1)}${ci.act ? ' act' : ''}${ci.jump ? ' jump' : ''} g${cpu.b3.ground ? 1 : 0}${cpu.b3.on ? Object.keys(cpu.b3.on).filter(k => cpu.b3.on[k] === true).join('') : '-'} y${cpu.b3.y.toFixed(2)} ${st.L3.pieces.map(q => q.kind[0] + (q.e || 0).toFixed(1)).join(' ')}`);
          }
        }
        await new Promise(res => setTimeout(res, 0));
      }
      const s = G.mst;
      return { cleared: all ? !!G.results[i] || G.mode === 'clear' : G.room > room0 || G.mode === 'clear', t: +(n * P.DT).toFixed(1), k: s.k, flats: s.stats.flats, bumps: s.stats.bumps, rewinds: s.stats.rewinds, gold: s.stats.gold,
        stall: +stall.toFixed(1), stallAt, worstRev, revAt, nan, cpuErrs: [...P.CPU.errs], said: [...said], cpuFlats, myFlats, trace: lines, at: G.players.map(p => p.b3.x.toFixed(1) + ',' + p.b3.z.toFixed(1)) };
    }, { who, which, side, maxT, trace });
    if (r.trace.length) console.log(r.trace.join('\n'));
    const flags = [];
    if (!r.cleared && who !== 'selfish') flags.push('DID NOT CLEAR');
    if (r.worstRev > 6 && who !== 'selfish') flags.push('SHAKES');
    if (r.nan) flags.push('NaN');
    if (r.cpuErrs.length || errors.length) flags.push('ERRORS');
    if (flags.length) bad++;
    console.log(`${who.padEnd(8)} ${r.cleared ? 'cleared' : 'ended page ' + (r.k + 1) + ' at ' + r.at.join(' / ')} in ${r.t}s  flats ${r.flats} rewinds ${r.rewinds}${r.gold ? ' gold ' + r.gold : ''} bumps ${r.bumps}  longest stall ${r.stall}s (${r.stallAt})  reversals ${r.worstRev}/s (${r.revAt})  ${flags.join(' ')}`);
    if (r.cpuFlats.length) console.log('         computer flat: ' + r.cpuFlats.join(', '));
    if (r.myFlats.length) console.log('         person flat:   ' + r.myFlats.join(', '));
    console.log('         said: ' + r.said.join(' | '));
    if (errors.length) console.log(errors.slice(0, 5).join('\n'));
  }
  await browser.close();
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
