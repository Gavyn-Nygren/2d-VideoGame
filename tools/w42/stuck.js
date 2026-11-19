#!/usr/bin/env node
// 42-1 Runaway Coaster: scripted PEOPLE for the review (drawing off). play.js's "kid" and "noisy" riders are the
// computer's own brain made late or patchy, so they think like the computer. These do not: each is a few plain rules a
// person might follow from what is on the screen (lean when the arrow board is close, duck at the tassels, jump at the
// yellow sleepers), with a person's reaction time and their own timing error, or one fixed bad habit. They show what a
// real partner can do to the computer (make it shake, waste a hop) and whether anyone can be sent round the same
// Breakdown for ever.
//
//   node tools/w42/stuck.js [who ...] [--seeds=1,2,3] [--max=900] [--trace=secs]
//
// who is a person and a seat (0 Pip left, 1 Bo right) with the computer in the other seat: good0, kid1, nojump0 ...
// or "pair-<person>" for two people and no computer. With no names it runs the whole list.
//   good      leans for bends and tips in good time, ducks, jumps close to the right moment, pulls their levers
//   late      as good, 0.3 s behind on everything           kid   0.5 s behind, and looks away for a second now and then
//   slow      0.7 s behind (the spec's slow kid: should still reach Silver beside the computer)
//   nolean    never leans            leanL / leanR   holds a lean one way all ride       against   leans against every bend
//   nojump    never jumps            jumplate   jumps as the gap arrives     jumpearly   jumps as soon as the partner
//             says to, then again at the gap           jumpheld   holds jump down all ride
//   noduck    never ducks            duckheld   holds duck all ride
//   nolever   never touches the action (levers, rocket, brake)             nobrake   everything except the brake lever
//   mash      presses everything at random                                  idle      presses nothing at all
// Prints per run: how it ended, time, medal, tickets, Rattles and why, Breakdowns, the most Breakdowns in a row from one
// arch, hops made of the gaps met, brake loops, gold help, and the computer's worst second of lean reversals (more than
// 3 is shaking) and of jump presses.
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
let whos = args.filter(a => !a.startsWith('--'));
const KINDS = ['good', 'late', 'kid', 'slow', 'nolean', 'leanL', 'leanR', 'against', 'nojump', 'jumplate', 'jumpearly', 'jumpheld', 'noduck', 'duckheld', 'nolever', 'nobrake', 'mash', 'idle'];
if (!whos.length) { for (const k of KINDS) whos.push(k + '0', k + '1'); whos.push('pair-good', 'pair-late', 'pair-kid', 'pair-slow', 'pair-mash'); }
const seeds = opt('seeds', '1').split(',').map(Number), maxT = +opt('max', 900), trace = +opt('trace', 0);

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
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
  for (const who of whos) for (const seed of seeds) {
    errors.length = 0;
    const r = await page.evaluate(async ({ who, seed, maxT, trace }) => {
      const P = window.__pipbo, G = P.G, i = P.LEVELS.findIndex(l => l.mode === 'parkcoaster');
      const PR = PARKCOASTER_ROUTE, L = PR.lists, S = PARKCOASTER.S;
      window.__seed(seed * 7919 + 13); window.__inStep = true;
      G.manual = true; P.K3D.noRender = true; P.CPU.errs.clear(); P.CPU.skillOf = [null, null]; P.CPU.filter = null;
      const pair = who.startsWith('pair-'), kind = pair ? who.slice(5) : who.replace(/\d$/, ''), seat = pair ? -1 : +who.slice(-1);
      G.cpuOn = pair ? [false, false] : [seat !== 0, seat !== 1];
      delete G.results[i];
      P.loadLevel(i);
      const st = G.mst;
      const randn = () => { let a = 0; for (let k = 0; k < 6; k++) a += Math.random(); return (a - 3) / 0.707; };
      const sgn = x => (x > 0 ? 1 : x < 0 ? -1 : 0);

      /* ---------- a person ---------- */
      const mkPerson = (id, kind) => {
        const base = ['late', 'kid', 'slow'].includes(kind) ? kind : 'good';
        const lag = { good: 0, late: 0.3, kid: 0.5, slow: 0.7 }[base], sig = { good: 0.08, late: 0.1, kid: 0.14, slow: 0.14 }[base];
        const me = { hopErr: {}, hopTry: -9, actT: -9, away: 0, nextAway: 8 + Math.random() * 10, mash: {}, mashT: 0, sawBunny: -1, heard: -9, prev: {} };
        const want = () => {
          const o = { lean: 0, down: false, jump: false, act: false };
          if (st.phase !== 'ride' || kind === 'idle') return o;
          if (kind === 'mash') {
            me.mashT -= P.DT;
            if (me.mashT <= 0) { me.mashT = 0.08 + Math.random() * 0.25; me.mash = { lean: Math.floor(Math.random() * 3) - 1, down: Math.random() < 0.3, jump: Math.random() < 0.4, act: Math.random() < 0.4 }; }
            return Object.assign(o, me.mash);
          }
          if (base === 'kid') { // looks away now and then
            if (me.away > 0) { me.away -= P.DT; return o; }
            if ((me.nextAway -= P.DT) <= 0) { me.away = 0.8 + Math.random() * 1.2; me.nextAway = 9 + Math.random() * 12; }
          }
          if (st.det >= 0) return o;
          const v = Math.max(2, st.v), ahead = x => (x - st.s) / v;
          // the hands-up second
          let quiet = false;
          for (const cm of L.cams) { const a = ahead(cm.s); if (a < 0.3 && a > -1.1) quiet = true; }
          // leans: bends, tips, then tickets on their own side
          let lean = 0, why = '';
          for (const bd of L.bends) if (ahead(bd.s0) < 0.7 - lag && ahead(bd.s1) > -0.1) { lean = kind === 'against' ? -bd.dir : bd.dir; why = 'bend'; }
          if (!why) for (const tp of L.tips) { const a = ahead(tp.s); if (a < 1.0 - lag && a > -0.2) { lean = tp.dir; why = 'tip'; } }
          if (!why) for (let k = 0; k < L.tickets.length; k++) {
            const tk = L.tickets[k]; if (tk.lat === 0 || st.got[k]) continue;
            const a = ahead(tk.s); if (a > 0.5 - lag / 2 || a < -0.15) continue;
            if (Math.abs(tk.lat) >= 2 || (tk.lat < 0 ? 0 : 1) === id) { lean = sgn(tk.lat); why = 'ticket'; }
          }
          if (kind === 'nolean') lean = 0;
          if (kind === 'leanL') lean = -1;
          if (kind === 'leanR') lean = 1;
          o.lean = lean;
          // ducks
          for (const d of L.ducks) { const a = ahead(d.s); if (a < 0.8 - lag && a > -0.2 && (d.who === 'both' || d.who === id)) o.down = true; }
          if (kind === 'noduck') o.down = false;
          if (kind === 'duckheld') o.down = true;
          // hops: aim a little before the gap, with this person's own error for this gap; or answer the partner's hop
          const full = st.airT >= 0 && st.full;
          if (kind === 'jumpheld') o.jump = true;
          else if (kind !== 'nojump' && !full) {
            for (let k = 0; k < L.hops.length; k++) {
              const h = L.hops[k], mid = ahead((h.s0 + h.s1) / 2);
              if (mid < -0.1 || mid > 3) continue;
              if (me.hopErr[k] == null) me.hopErr[k] = lag * 0.6 + sig * randn();
              let at = 0.6 - me.hopErr[k];
              if (kind === 'jumplate') at = 0.12;
              if (kind === 'jumpearly' && st.t - me.heard < 0.4 && st.t - me.heard > 0.25 && st.t - me.hopTry > 1) { o.jump = true; me.hopTry = st.t; }
              if (mid <= at && st.t - me.hopTry > 0.4) { o.jump = true; me.hopTry = st.t; }
            }
            // the partner's little hop: press to join it after a reaction time
            if (st.hopFirst === 1 - id && me.sawBunny < 0 && kind !== 'jumplate') me.sawBunny = st.t;
            if (st.hopFirst !== 1 - id) me.sawBunny = -1;
            if (me.sawBunny >= 0 && st.t - me.sawBunny > 0.2 + lag * 0.4 && st.t - me.hopTry > 0.4) { o.jump = true; me.hopTry = st.t; }
          }
          // levers on their own side
          if (kind !== 'nolever') for (let k = 0; k < L.levers.length; k++) {
            const lv = L.levers[k];
            if (lv.side !== id) continue;
            if (lv.kind === 'brake' ? (st.brake[id] || kind === 'nobrake') : st.thrown[k]) continue;
            const pre = PARKCOASTER.leverPre(lv, v), d = lv.s - st.s;
            if (d < pre - v * (0.12 + lag * 0.5) && d > -S.LEVER_POST * 0.5 && st.t - me.actT > 0.45) { o.act = true; me.actT = st.t; }
          }
          if (quiet && base !== 'kid') return { lean: kind === 'leanL' ? -1 : kind === 'leanR' ? 1 : 0, down: kind === 'duckheld', jump: kind === 'jumpheld', act: false };
          return o;
        };
        return {
          step() {
            const p = G.players[id], o = want();
            const b = P.CPU.bubbles[1 - id];
            if (b && b.t > 0 && /Ready/.test(b.text) && me.lastBub !== b.text + b.up) { if (!(b.up > P.DT * 2)) me.heard = st.t; }
            p.input.left = o.lean < 0; p.input.right = o.lean > 0; p.input.down = !!o.down; p.input.up = false; p.input.ax = 0; p.input.ay = 0;
            // a tap is one step down (jump, act); held kinds stay down
            const j = !!o.jump, a = !!o.act;
            if (j && !me.prev.j && G.mode === 'play') p.pendingJump = true;
            if (a && !me.prev.a && G.mode === 'play') { p.pendingAct = true; p.actAge = 0; }
            p.input.jump = j; p.input.act = a; p.prevJump = j; p.prevAct = a;
            me.prev = { j: kind === 'jumpheld' ? j : false, a: false };
          },
        };
      };
      const people = pair ? [mkPerson(0, kind), mkPerson(1, kind)] : [mkPerson(seat, kind)];
      const cpuSeat = pair ? -1 : 1 - seat;

      const steps = Math.round(maxT / P.DT), every = trace ? Math.round(trace / P.DT) : 0, lines = [], whys = [];
      let n = 0, lastR = 0, lastBd = 0, rowArch = -1, row = 0, maxRow = 0, maxRowAt = 0, gapsMet = 0, lastGap = -1;
      // the computer's leans and jumps, for the shaking count
      const flips = [], jumps = []; let lastLean = 0, lastNZ = 0, worstFlips = 0, worstJumps = 0, worstAt = 0, prevJ = false;
      while (n < steps && G.mode === 'play') {
        for (let k = 0; k < 600 && n < steps && G.mode === 'play'; k++, n++) {
          for (const pe of people) pe.step();
          P.step(P.DT);
          const t = n * P.DT;
          if (st.rattles > lastR) { lastR = st.rattles; whys.push(st.lastWhy + '@' + Math.round(st.s)); }
          if (st.breakdowns > lastBd) { lastBd = st.breakdowns; if (rowArch === st.restart) row++; else { row = 1; rowArch = st.restart; } if (row > maxRow) { maxRow = row; maxRowAt = Math.round(st.restart); } }
          for (let h = 0; h < L.hops.length; h++) if (st.phase === 'ride' && st.det < 0 && st.s > L.hops[h].s1 && st.prevS <= L.hops[h].s1) gapsMet++;
          if (cpuSeat >= 0 && st.phase === 'ride') {
            const l = st.lean[cpuSeat];
            if (l !== lastLean) { if (l && lastNZ && l !== lastNZ) flips.push(t); if (l) lastNZ = l; lastLean = l; }
            const j = !!G.players[cpuSeat].input.jump; if (j && !prevJ) jumps.push(t); prevJ = j;
            while (flips.length && t - flips[0] > 1) flips.shift();
            while (jumps.length && t - jumps[0] > 1) jumps.shift();
            if (flips.length > worstFlips) { worstFlips = flips.length; worstAt = Math.round(st.s); }
            worstJumps = Math.max(worstJumps, jumps.length);
          }
          if (every && n % every === 0) lines.push(`${t.toFixed(2)}s ${st.phase} s=${st.s.toFixed(1)} v=${st.v.toFixed(1)} lean ${st.lean} tilt ${st.tilt.toFixed(2)} air ${st.air.toFixed(2)}${st.full ? 'F' : ''} bolts ${st.bolts}/${st.maxBolts} tk ${st.tickets} ${P.CPU.bubbles.map(b => (b && b.t > 0 ? '"' + b.text + '"' : '')).join(' ')}`);
        }
        await new Promise(r => setTimeout(r, 0));
      }
      window.__inStep = false;
      const res = G.results[i];
      return { mode: G.mode, simT: +(n * P.DT).toFixed(1), phase: st.phase, s: st.s, cleared: !!res, medal: res && res.medal && res.medal.tier,
        tickets: st.tickets, max: PARKCOASTER.ticketsMax(), rattles: st.rattles, bds: st.breakdowns, maxRow, maxRowAt, hops: st.hops, gapsMet, gaps: L.hops.length,
        loops: st.brakeLoops, gold: st.goldN, photos: st.photos, sw: st.switches, worstFlips, worstAt, worstJumps, whys, cpuErrs: [...P.CPU.errs], trace: lines };
    }, { who, seed, maxT, trace });
    if (r.trace.length) console.log(r.trace.join('\n'));
    const medal = ['-', 'Bronze', 'Silver', 'Gold'][r.medal || 0];
    const why = {}; for (const w of r.whys) { const k = w.split('@')[0]; why[k] = (why[k] || 0) + 1; }
    const flags = [];
    if (r.worstFlips > 3) flags.push('COMPUTER SHAKES (' + r.worstFlips + ' lean reversals in a second near s=' + r.worstAt + ')');
    if (r.worstJumps > 3) flags.push('COMPUTER JUMP-MASHES (' + r.worstJumps + ' a second)');
    if (r.cpuErrs.length) flags.push('CPU ERR ' + r.cpuErrs);
    if (errors.length) flags.push('PAGE ERR ' + errors.slice(0, 2).join(' | ').slice(0, 400));
    if (!r.cleared && !/idle|nobrake|nolever/.test(who)) flags.push('NEVER FINISHED');
    if (flags.length) bad++;
    console.log(`${who.padEnd(12)} s${seed}: ${r.cleared ? 'finished' : 'NOT DONE (' + r.phase + ' s=' + Math.round(r.s) + ')'} ${r.simT}s ${medal.padEnd(6)} tickets ${Math.round(r.tickets / r.max * 100)}%  rattles ${r.rattles} ${JSON.stringify(why).replace(/"/g, '')}  breakdowns ${r.bds} (most in a row ${r.maxRow}${r.maxRow ? ' from s=' + r.maxRowAt : ''})  hops ${r.hops}  loops ${r.loops}  gold ${r.gold}  photos ${r.photos}  cpu flips ${r.worstFlips} jumps ${r.worstJumps}${flags.length ? '\n    !! ' + flags.join('; ') : ''}`);
  }
  await browser.close();
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
