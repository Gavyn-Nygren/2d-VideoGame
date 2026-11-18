#!/usr/bin/env node
// 41-3 Paper Dragon Flight: scripted PEOPLE for the review (drawing off). popdragon-play.js's "kids" are the computer's
// own brain made late or noisy, so they think like the computer. These do not: each is a few plain rules a person might
// follow (chase the next star they can see, swerve when something is dead ahead, hold a button because the sign said
// so), with a person's reaction time and a keyboard's all-or-nothing push. They find what a real partner can do to the
// computer (make it shake, fly it into things) and whether a weak pair can get sent round the same Refold for ever.
//
//   node tools/w41/popdragon-people.js [who ...] [--seed=1] [--max=900] [--from=s] [--trace=secs]
//
// who is a person and a seat (0 Pip steers, 1 Bo flies), the computer in the other seat: chaser0, holdL0, mash1 ...
// or "pair-<person>" for two people and no computer (pair-chaser, pair-kid ...).
//   chaser    chases the next star, swerves on their own axis when something is dead ahead, tucks at slots, uses their
//             button sensibly, 0.35 s behind what they see
//   late      as chaser, 0.8 s behind
//   kid       0.6 s behind, only sees trouble half a second off, looks away for a second or two now and then
//   tapper    as chaser, but taps the direction in short dabs instead of holding it
//   holdA/holdB   holds their own axis hard one way (A: left or down, B: right or up) for the whole flight
//   edges     flies along one edge of the window for 10 s, then the other
//   never     never touches a direction (still tucks, uses the button and catches, so they are not "away")
//   against   as chaser, and pushes their helper axis against whatever the partner is doing
//   notuck    as chaser, never tucks            nobutton  as chaser, never fires or swishes (still catches)
//   jumpheld  as chaser, holds jump the whole flight
//   wiggle    waggles their own axis left-right (up-down) about three times a second
//   mash      presses everything at random
//   nocatch   as chaser, never holds the button at the catch (the flight must wait, not break)
//   tapcatch  as chaser, taps the button at the catch instead of holding it
// Prints per run: how it ended, time, medal, stars, Crumples, Refolds, the most Refolds in a row from one bookmark,
// the longest time without getting further along the rail, the computer's worst second of reversals on its own axis
// (more than 3 is shaking) and of tuck presses, and how long the dragon's middle was inside something solid.
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const whos = args.filter(a => !a.startsWith('--'));
if (!whos.length) whos.push('chaser0', 'chaser1');
const seed = +opt('seed', 1), maxT = +opt('max', 900), trace = +opt('trace', 0), from = +opt('from', 0), verbose = args.includes('--log');
const dbg = opt('dbg', '') ? opt('dbg', '').split(',').map(Number) : null;   // --dbg=from,to: the computer's stick and plan, 20 times a second

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.addInitScript(() => {
    const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    let seeded = gen(1); const other = gen(12345);
    window.__inStep = false; window.__seed = n => { seeded = gen((n >>> 0) || 1); };
    Math.random = () => (window.__inStep ? seeded() : other());
  });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  let bad = 0;
  for (const who of whos) {
    errors.length = 0;
    const t0 = Date.now();
    const r = await page.evaluate(async ({ who, seed, maxT, trace, from, dbg }) => {
      const P = window.__pipbo, G = P.G, i = P.LEVELS.findIndex(l => l.mode === 'popdragon');
      const R = POPDRAGON_ROUTE, K = POPDRAGON;
      window.__seed(seed * 7919 + 13); window.__inStep = true;
      G.manual = true; K3D.noRender = true; P.CPU.errs.clear(); P.CPU.filter = null;
      const pair = who.startsWith('pair-'), kind = pair ? who.slice(5) : who.replace(/\d$/, ''), seat = pair ? -1 : +who.slice(-1);
      const both = who === 'cpu';   // the computer in both seats (for --dbg on the pair's own flight)
      G.cpuOn = both ? [true, true] : pair ? [false, false] : [seat !== 0, seat !== 1];
      // what the computer pushed, step by step (for the shaking count)
      const cpuLog = { ax: [], jump: [] };
      P.CPU.filter = (p, out) => { cpuLog.cur = out; return out; };
      delete G.results[i];
      P.loadLevel(i);
      const st = G.mst;
      if (from > 0) { st.phase = 'fly'; st.s = from; st.restart = from; st.hoopI = R.hoops.findIndex(h => h.s > from); st.nextSay = R.says.findIndex(q => q.s > from); st.pawI = Math.max(0, R.paws.findIndex(q => q.s > from)); st.clingI = Math.max(0, R.clingers.findIndex(q => q.s > from)); }

      /* ---------- a person ---------- */
      const mkPerson = (id, kind) => {
        const lag = kind === 'late' ? 0.8 : kind === 'kid' ? 0.6 : 0.35, see = kind === 'kid' ? 0.5 : 1.0;
        const me = { q: [], t: 0, away: 0, nextAway: 6 + Math.random() * 8, mash: {}, mashT: 0, tapT: 0, side: -1 };
        const own = id === 0 ? 'x' : 'y', lim = id === 0 ? R.WX : R.WY;
        // what they would like to press, from what is on the screen this moment
        const want = () => {
          const o = { push: 0, help: 0, jump: false, act: false };
          const v = R.at(st.s).v || 5, pos = id === 0 ? st.ox : st.oy;
          if (st.phase === 'catch') { o.act = kind !== 'nocatch' && (kind !== 'tapcatch' || Math.floor(me.t / 0.25) % 2 === 0); return o; }
          if (st.phase !== 'fly') return o;
          if (kind === 'mash') {
            me.mashT -= P.DT; if (me.mashT <= 0) { me.mashT = 0.1 + Math.random() * 0.25; me.mash = { push: Math.floor(Math.random() * 3) - 1, help: Math.floor(Math.random() * 3) - 1, jump: Math.random() < 0.35, act: Math.random() < 0.4 }; }
            return Object.assign(o, me.mash);
          }
          // the next star they can see: push toward it
          let target = 0;
          const sr = R.stars.find((q, k) => !st.got[k] && q.s > st.s + 1.5 && q.s < st.s + v * 1.6 && !(q.need && st.burnt[q.need] == null));
          if (sr) target = id === 0 ? sr.ox : sr.oy;
          // something dead ahead (where the dragon will be in `see` seconds if nobody moves it): swerve on their own
          // axis to the nearest clear spot they can see there
          const sa = st.s + v * see, hitAt = (x, y) => popdragonHit(sa, x, y, K.HW, st.burnt, st.clock + see);
          const tx0 = id === 0 ? target : st.ox, ty0 = id === 1 ? target : st.oy;
          const blockedNow = hitAt(st.ox, st.oy), blockedAim = hitAt(tx0, ty0);
          if (blockedNow || blockedAim) {
            let bestD = 1e9;
            for (let c = -lim; c <= lim + 1e-6; c += lim / 4) {
              if (hitAt(id === 0 ? c : st.ox, id === 1 ? c : st.oy)) continue;
              const d = Math.abs(c - pos); if (d < bestD) { bestD = d; target = c; }
            }
          }
          if (kind === 'holdA') target = -lim; if (kind === 'holdB') target = lim;
          if (kind === 'edges') target = (Math.floor(me.t / 10) % 2 ? 1 : -1) * lim;
          if (kind === 'wiggle') target = pos + (Math.floor(me.t / 0.17) % 2 ? 3 : -3);
          const d = target - pos;
          o.push = Math.abs(d) > 0.45 ? Math.sign(d) : 0;
          if (kind === 'never') o.push = 0;
          if (kind === 'tapper' && (me.t % 0.3) > 0.13) o.push = 0;
          // the helper axis: against whatever the partner is doing
          if (kind === 'against') { const pv = id === 0 ? st.vy : st.vx; o.help = Math.abs(pv) > 0.5 ? -Math.sign(pv) : 0; }
          // the tuck: the sign says so, hold jump from a bit before the slot until through
          const sl = (R.slots || []).find(q => q.s - st.s > -6 && q.s - st.s < v * 1.3);
          o.jump = kind === 'jumpheld' || (!!sl && kind !== 'notuck');
          // their button
          if (kind !== 'nobutton') {
            if (id === 0) {
              const w = (R.webs || []).find(q => st.burnt[q.burn] == null && q.s - st.s > 1 && q.s - st.s < K.FIRE_REACH - 1) || (R.lights || []).find(q => st.burnt[q.id] == null && q.s - st.s > 0 && q.s - st.s < K.FIRE_REACH - 1);
              o.act = !!w && Math.floor(me.t / 0.2) % 2 === 0;
            } else {
              const pn = R.paws.find(q => q.s > st.s && (q.s - st.s) / v < 0.5);
              o.act = (st.moths > 0 || !!pn) && Math.floor(me.t / 0.2) % 2 === 0;
            }
          }
          if (kind === 'never') o.act = o.act || (me.t % 6) < 0.1;
          return o;
        };
        return {
          step() {
            me.t += P.DT;
            me.q.push({ t: me.t, o: want() });
            while (me.q.length > 1 && me.t - me.q[1].t >= lag) me.q.shift();
            let o = me.t - me.q[0].t >= lag ? me.q[0].o : { push: 0, help: 0, jump: false, act: false };
            if (st.phase === 'catch') o = me.q[me.q.length - 1].o;
            if (kind === 'kid') {
              if (me.away > 0) { me.away -= P.DT; o = { push: 0, help: 0, jump: false, act: false }; }
              else { me.nextAway -= P.DT; if (me.nextAway <= 0) { me.away = 0.8 + Math.random() * 1.4; me.nextAway = 6 + Math.random() * 9; } }
            }
            const p = G.players[id], inp = p.input;
            const x = id === 0 ? o.push : o.help, y = id === 1 ? o.push : o.help;
            inp.left = x < 0; inp.right = x > 0; inp.up = y > 0; inp.down = y < 0; inp.ax = 0; inp.ay = 0;
            if (o.jump && !p.prevJump) p.pendingJump = true; p.prevJump = o.jump; inp.jump = o.jump;
            if (o.act && !p.prevAct) { p.pendingAct = true; p.actAge = 0; } p.prevAct = o.act; inp.act = o.act;
          },
        };
      };
      const people = both ? [] : pair ? [mkPerson(0, kind), mkPerson(1, kind)] : [mkPerson(seat, kind)];
      window.__inStep = false;

      const M = window.MODES ? window.MODES.popdragon : P.MODES.popdragon, log = [];
      const crumple = M.crumple;
      M.crumple = function (s2, hit) {
        const why = hit.paw ? 'paw ' + hit.paw.id : hit.moths ? 'three moths' : hit.web ? 'web ' + hit.web.burn : hit.mover ? 'mover ' + hit.mover.id : hit.sd ? 'solid ' + JSON.stringify(hit.sd).slice(0, 60) : '?';
        log.push({ s: Math.round(s2.s), part: M.partAt(s2.s), ox: +s2.ox.toFixed(1), oy: +s2.oy.toFixed(1), tuck: +s2.tuck.toFixed(2), why, t: Math.round(s2.clock) });
        return crumple.call(this, s2, hit);
      };
      const steps = Math.round(maxT / P.DT), tr = [];
      let n = 0, maxS = 0, sinceGain = 0, worstStall = 0, stallAt = 0, inside = 0, lastRefolds = 0, streak = 0, worstStreak = 0, streakAt = 0, lastRestart = -1;
      const cpuSeat = both ? 0 : pair ? -1 : 1 - seat, rev = [], jmp = [];
      let lastSign = 0, lastJump = false, catchT = 0; const insideAt = {};
      while (n < steps && G.mode === 'play') {
        for (let k = 0; k < 600 && n < steps && G.mode === 'play'; k++, n++) {
          window.__inStep = true;
          for (const q of people) q.step();
          P.step(P.DT);
          window.__inStep = false;
          const t = n * P.DT;
          if (st.s > maxS + 0.001) { maxS = st.s; sinceGain = 0; } else if (st.phase !== 'catch') { sinceGain += P.DT; if (sinceGain > worstStall) { worstStall = sinceGain; stallAt = Math.round(maxS); } }
          if (st.phase === 'catch') catchT += P.DT;
          if (st.refolds !== lastRefolds) { lastRefolds = st.refolds; if (Math.abs(st.restart - lastRestart) < 0.01) streak++; else { streak = 1; lastRestart = st.restart; } if (streak > worstStreak) { worstStreak = streak; streakAt = Math.round(st.restart); } }
          // the dragon's middle inside something solid (it should bounce off, not fly through)
          if (st.phase === 'fly') { const pt = R.local(st.s - 1, st.ox, st.oy); for (const e of popdragonIndex()) { if (st.s + 1 < e.s0 || st.s - 3 > e.s1) continue; if (e.sd.burn) continue; if (popdragonDist(e.sd, pt) < -0.6) { inside += P.DT; const k = Math.round(st.s / 10) * 10; insideAt[k] = (insideAt[k] || 0) + P.DT; break; } } }
          if (cpuSeat >= 0 && st.phase === 'fly') {
            const c = G.players[cpuSeat].input, a = cpuSeat === 0 ? c.ax : -c.ay, sg = Math.abs(a) > 0.05 ? Math.sign(a) : 0;
            if (sg && lastSign && sg !== lastSign) rev.push(t);
            if (sg) lastSign = sg;
            if (!!c.jump !== lastJump) { lastJump = !!c.jump; if (lastJump) jmp.push(t); }
          }
          if (dbg && t >= dbg[0] && t <= dbg[1] && n % 6 === 0 && cpuSeat >= 0) { const c = G.players[cpuSeat].input, pl = (st._cpu || {})[both ? 'xy' : cpuSeat === 0 ? 'x' : 'y'] || {}; tr.push(`t ${t.toFixed(2)} s ${st.s.toFixed(1)} ox ${st.ox.toFixed(2)} oy ${st.oy.toFixed(2)} v ${st.vx.toFixed(1)},${st.vy.toFixed(1)} cpu ax ${(+c.ax).toFixed(2)} ay ${(+c.ay).toFixed(2)} j ${c.jump ? 1 : 0} plan ${(+pl.tx).toFixed(1)},${(+pl.ty).toFixed(1)} c ${Math.round(pl.c)} tuck ${st.tuck.toFixed(2)} safe ${st.safe.toFixed(1)}`); }
          if (trace && n % Math.round(trace / P.DT) === 0) tr.push(`t ${Math.round(t)} s ${st.s.toFixed(0)} ${st.phase} ox ${st.ox.toFixed(1)} oy ${st.oy.toFixed(1)} cr ${st.crumples}/${st.maxCrumples} gold ${st.gold}`);
          if (catchT > 20) break;
        }
        if (catchT > 20) break;
        await new Promise(r2 => setTimeout(r2, 0));
      }
      M.crumple = crumple; P.CPU.filter = null;
      const worstIn = (arr, w) => { let b = 0, at = 0; for (let a = 0, z = 0; z < arr.length; z++) { while (arr[z] - arr[a] > w) a++; if (z - a + 1 > b) { b = z - a + 1; at = arr[a]; } } return [b, Math.round(at)]; };
      const res = G.results[i] || null;
      return { mode: G.mode, simT: Math.round(n * P.DT), s: Math.round(st.s), phase: st.phase, res: res && { time: Math.round(res.time), medal: res.medal && ['none', 'Bronze', 'Silver', 'Gold'][res.medal.tier] },
        stars: st.stars + '/' + R.stars.length, crumples: st.crumplesAll, refolds: st.refolds, worstStreak, streakAt, worstStall: Math.round(worstStall), stallAt, inside: +inside.toFixed(1),
        rev: worstIn(rev, 1), jmp: worstIn(jmp, 2), catchWait: Math.round(catchT), misses: st.misses, bats: st.bats, pawHits: st.pawHits, tears: st.tears || 0, gold: st.goldMsg ? 1 : 0, insideAt, log, tr, cpuErrs: [...P.CPU.errs] };
    }, { who, seed, maxT, trace, from, dbg });
    const end = r.res ? `CLEARED ${r.res.time}s ${r.res.medal}` : r.phase === 'catch' ? `waiting at the catch (${r.catchWait}s, ${r.misses} misses)` : `NOT FINISHED (s ${r.s}, ${r.phase})`;
    const flags = [];
    if (!r.res && r.phase !== 'catch') flags.push('STUCK');
    if (r.worstStreak >= 4) flags.push('LOOP');
    if (r.rev[0] > 3) flags.push('SHAKES');
    if (r.jmp[0] > 3) flags.push('TUCK-FLAPS');
    if (r.inside > 1.5) flags.push('THROUGH-SOLID');
    if (r.cpuErrs.length || errors.length) flags.push('ERROR');
    if (flags.length) bad++;
    console.log(`${who.padEnd(14)} ${end.padEnd(34)} stars ${r.stars.padEnd(7)} crumples ${String(r.crumples).padEnd(3)} refolds ${String(r.refolds).padEnd(2)} (most from one hoop ${r.worstStreak}${r.worstStreak ? ' at s ' + r.streakAt : ''}${r.gold ? ', gold help' : ''}) stall ${r.worstStall}s  cpu rev/s ${r.rev[0]}${r.rev[0] > 3 ? '@' + r.rev[1] : ''} tucks/2s ${r.jmp[0]}  inside ${r.inside}s  bats ${r.bats} paw-hits ${r.pawHits} tears ${r.tears}  [wall ${Math.round((Date.now() - t0) / 1000)}s] ${flags.join(' ')}${r.cpuErrs.length ? ' CPU ERR ' + r.cpuErrs.join(',') : ''}${errors.length ? ' PAGE ERR ' + errors.slice(0, 3).join(' | ').slice(0, 300) : ''}`);
    for (const l of r.tr) console.log('   ' + l);
    if (r.inside > 1.5) console.log('   inside at: ' + Object.entries(r.insideAt).map(([k, v]) => 's~' + k + ' ' + v.toFixed(1) + 's').join(', '));
    if (verbose) for (const c of r.log) console.log(`   t ${c.t} crumple s ${c.s} (part ${c.part}) at ${c.ox},${c.oy} tuck ${c.tuck}: ${c.why}`);
    else { const by = {}; for (const c of r.log) { const k = `s~${Math.round(c.s / 5) * 5} ${c.why.slice(0, 40)}`; by[k] = (by[k] || 0) + 1; } const top = Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 6); if (top.length) console.log('   most: ' + top.map(([k, v]) => v + 'x ' + k).join(' | ')); }
  }
  await browser.close();
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
