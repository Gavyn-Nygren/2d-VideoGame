#!/usr/bin/env node
// 18-2 Grapple & Zip: 1-player mode with scripted "people" next to the computer, to look for stalls and softlocks.
// Usage: node tools/w18/grapple-people.js [--as=0|1|both] [--who=follow,slow,kid,idle,masher,wander,takejob,quit,jumper,ladder]
//                                        [--seeds=1,2] [--max=600] [--trace=0]
// Prints one line per run: who the person is, how it ended, the time, the stats and any page errors.
// What must happen: follow / slow / kid / jumper / ladder / takejob / wander clear; idle and quit never clear; masher
// may clear slowly or not, but never throws errors.
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
(async () => {
  const asArg = opt('as', 'both'), whos = opt('who', 'follow,slow,kid,idle,masher,wander,takejob,quit,jumper,ladder').split(',');
  const seeds = opt('seeds', '1,2').split(',').map(Number), maxT = +opt('max', 600), trace = +opt('trace', 0);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  await page.addInitScript(() => {
    const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    let seeded = gen(1);
    window.__seed = n => { seeded = gen((n >>> 0) || 1); };
    Math.random = () => seeded();
  });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const ases = asArg === 'both' ? [0, 1] : [+asArg];
  for (const who of whos) for (const as of ases) for (const seed of seeds) {
    errors.length = 0;
    const r = await page.evaluate(async ({ who, as, seed, maxT, trace }) => {
      const P = window.__pipbo, G = P.G, M = P.MODES.grapple, GR = M.GRAPPLE;
      window.__seed(seed * 104729 + as * 17 + who.length);
      const i = P.LEVELS.findIndex(l => l.name === 'Grapple & Zip');
      G.manual = true;
      G.cpuOn = as === 0 ? [false, true] : [true, false];
      P.CPU.errs.clear(); P.CPU.filter = null;
      delete G.results[i];
      P.loadLevel(i);
      const me = G.players[as];
      const last = {};
      const press = out => {
        const inp = me.input;
        const want = k => (out[k] === 'tap' ? !last[k] : !!out[k]);
        const j = want('jump'), a = want('act');
        inp.left = !!out.left && !out.right; inp.right = !!out.right && !out.left; inp.down = !!out.down; inp.up = !!out.up;
        if (j && !me.prevJump && G.mode === 'play') me.pendingJump = true;
        me.prevJump = j; inp.jump = j;
        if (a && !me.prevAct && G.mode === 'play') me.pendingAct = true;
        me.prevAct = a; inp.act = a;
        Object.assign(last, { jump: j, act: a });
      };
      // a person that follows the prompts: walks to the job, climbs, and does it like a kid would
      const S = { react: 0, job: '', hold: 0, holdFor: 0, ang: 25 + Math.random() * 30, powT: 0.5, lastTries: 0, crankT: 0, quitAt: 40 + Math.random() * 40, jumpT: 0 };
      const walkTo = (out, pl, nest, x, dead) => {
        const m = G.mst, sh = m.ships[pl.ship];
        if (pl.mode === 'climb') { if (nest) out.up = true; else out.down = true; return false; }
        if (pl.mode !== 'walk') return false;
        if (!!pl.onNest === !!nest) { const d = x - pl.x; if (Math.abs(d) <= dead) return true; out.left = d < 0; out.right = d > 0; return false; }
        const d = sh.ladX - pl.x;
        if (Math.abs(d) < 10) { if (nest) out.up = true; else out.down = true; } else { out.left = d < 0; out.right = d > 0; }
        return false;
      };
      const follow = (dt, slow) => {
        const m = G.mst, hop = m.hop, out = {};
        if (!hop || hop.done || m.fin) return out;
        const pl = m.pl[as], nd = M.needs(m, as);
        const key = nd.job + hop.phase + hop.i;
        if (key !== S.job) { S.job = key; S.react = slow ? 1.2 + Math.random() * 2.5 : 0.3 + Math.random() * 0.5; }
        if (S.react > 0) { S.react -= dt; return out; }
        switch (nd.job) {
          case 'climb': case 'spot': case 'capstan': case 'waitHook': walkTo(out, pl, nd.nest, nd.x, 6); break;
          case 'grab': case 'board': if (walkTo(out, pl, true, nd.x, 8)) out.act = 'tap'; break;
          case 'aim': {
            // a kid: picks an angle, holds for a while, lets go; too far -> a shorter hold, short -> longer, sometimes a new angle
            if (hop.tries !== S.lastTries) {
              // like a person watching where it went: past the ring = softer, short of it = harder, socks/gull = new angle
              const ms = hop.missAt || {}, rg = M.test.ring(m, m.ships[hop.to], m.t), step = 0.04 + Math.random() * 0.08;
              if (ms.kind === 'laundry' || ms.kind === 'gull') S.ang += (Math.random() < 0.5 ? -1 : 1) * (12 + Math.random() * 14);
              else if (ms.kind === 'far' || ms.x > rg.x + 10) S.powT -= step;
              else S.powT += step;
              if (Math.random() < 0.25) S.ang += (Math.random() - 0.5) * 16;
              S.powT = Math.max(0.15, Math.min(0.98, S.powT)); S.ang = Math.max(5, Math.min(70, S.ang));
              S.lastTries = hop.tries;
            }
            // super gold: no gold marks on the meter at this angle -> try another angle; else aim for the middle of a mark
            if (hop.gold >= 2 && hop.sweet && !hop.charging) {
              if (!hop.sweet.length) { if (S.noBandT == null) S.noBandT = 0.6; S.noBandT -= dt; if (S.noBandT <= 0) { S.ang = 5 + Math.random() * 55; S.noBandT = null; } }
              else { const b = hop.sweet.reduce((x, y) => (y[1] - y[0] > x[1] - x[0] ? y : x)); S.powT = (b[0] + b[1]) / 2; S.noBandT = null; }
            }
            const d = S.ang - hop.ang;
            if (!hop.charging && Math.abs(d) > 2) { if (d > 0) out.up = true; else out.down = true; break; }
            if (!hop.charging) { out.act = true; break; }
            // let go near the wanted power on the way up (a kid's timing: up to ~60 ms early or late)
            const per = hop.period || GR.powPeriod, err = (Math.random() - 0.5) * 2 * (0.06 / (per / 2));
            out.act = !(hop.pow >= S.powT + err && hop.chargeT < per / 2);
            if (hop.chargeT > per * 1.2) out.act = false;
            break;
          }
          case 'zip': {
            const z = pl.zip; if (!z || !hop.rope) break;
            if (z.at === 'stop') { out.act = 'tap'; break; }
            const left = hop.rope.sEnd - z.s;
            if (left < 180 && z.v > 160) out.left = true; else if (z.v < 120) out.right = true;
            if (Math.random() < 0.3) out.up = Math.random() < 0.5; else out.down = Math.random() < 0.3;
            break;
          }
          case 'ride': if (m.t - hop.lastHeave < 0.5) out.right = Math.random() < 0.5; break;
          case 'crank': {
            S.crankT -= dt;
            if (!hop.boarded) break;
            if (S.crankT <= 0) { out.act = 'tap'; S.crankT = slow ? 0.6 + Math.random() * 0.8 : 0.35 + Math.random() * 0.5; }
            break;
          }
          default: break;
        }
        return out;
      };
      const people = {
        follow: dt => follow(dt, false),
        slow: dt => follow(dt, true),
        // a kid who also hops about and lets go too early now and then
        kid: dt => { const out = follow(dt, false), m = G.mst, pl = m.pl[as]; if (Math.random() < 0.6 * dt) out.jump = 'tap'; if (pl.mode === 'zip' && Math.random() < 0.25 * dt) out.act = 'tap'; return out; },
        idle: () => ({}),
        masher: () => ({ left: Math.random() < 0.3, right: Math.random() < 0.4, up: Math.random() < 0.3, down: Math.random() < 0.3, jump: Math.random() < 0.2, act: Math.random() < 0.5 }),
        // goes the wrong way for a few seconds at every new job, then follows
        wander: dt => { const m = G.mst, hop = m.hop; const k = hop ? hop.phase + hop.i : ''; if (k !== S.wk) { S.wk = k; S.wt = 2 + Math.random() * 3; S.wd = Math.random() < 0.5; } if (S.wt > 0) { S.wt -= dt; return { left: S.wd, right: !S.wd, down: Math.random() < 0.3 }; } return follow(dt, false); },
        // tries the computer's job first: stands on the X and presses the action, rides to the capstan, then follows
        takejob: dt => {
          const m = G.mst, hop = m.hop; if (!hop || hop.done) return {};
          const pl = m.pl[as], k = hop.phase + hop.i;
          if (k !== S.tk) { S.tk = k; S.tt = 4; }
          if (S.tt > 0) {
            S.tt -= dt; const out = {};
            if (as !== hop.T && (hop.phase === 'aim' || hop.phase === 'reel')) { if (walkTo(out, pl, true, m.ships[hop.from].spotX, 3)) out.act = Math.random() < 0.5; return out; }
            if (as === hop.T && hop.phase === 'caught') { if (walkTo(out, pl, true, m.ships[hop.from].spotX, 3)) out.act = 'tap'; return out; }
            if (as === hop.T && hop.phase === 'haul' && !hop.boarded) { walkTo(out, pl, false, m.ships[hop.from].capX, 3); out.act = Math.random() < 0.5; return out; }
          }
          return follow(dt, false);
        },
        // plays along for a while, then stops for good (must not clear)
        quit: dt => (G.time > S.quitAt ? {} : follow(dt, false)),
        jumper: dt => { const out = follow(dt, false); if (Math.random() < 2 * dt) out.jump = 'tap'; return out; },
        // climbs up and down the ladder now and then for no reason
        ladder: dt => { S.jumpT -= dt; if (S.jumpT < -6) S.jumpT = 1.5; if (S.jumpT > 0) { const pl = G.mst.pl[as]; return pl.mode === 'climb' || pl.onNest ? { down: true } : { up: true }; } return follow(dt, false); },
      };
      const brain = people[who];
      const steps = Math.round(maxT / P.DT); let n = 0;
      const lines = []; const every = trace ? Math.round(trace / P.DT) : 0;
      let maxStuck = 0;
      while (n < steps && G.mode === 'play') {
        for (let k = 0; k < 600 && n < steps && G.mode === 'play'; k++, n++) {
          if (G.introT <= 0 || true) press(brain(P.DT) || {});
          P.step(P.DT);
          const m = G.mst; if (m.hop) maxStuck = Math.max(maxStuck, m.hop.stuckT);
          if (every && n % every === 0) { const h = m.hop; lines.push(`${(n * P.DT).toFixed(1)} r${G.room} hop${h && h.i} ${h && h.phase} T=${h && h.T} tries=${h && h.tries} | ` + m.pl.map(q => q.mode + (q.onNest ? '^' : '') + ' x' + Math.round(q.x) + ' ' + M.needs(m, q.id).job).join(' | ') + ' | ' + P.CPU.bubbles.map(b => (b && b.t > 0 ? b.text : '')).join(' / ')); }
        }
        await new Promise(r => setTimeout(r, 0));
      }
      const res = G.results[i];
      const m = G.mst, s = m.stats;
      return { cleared: !!res, time: res ? Math.round(res.time) : null, simT: Math.round(n * P.DT), room: G.room || 0, hop: m.hop && m.hop.i, phase: m.hop && m.hop.phase,
        stats: s && { coins: s.coins, throws: s.throws, misses: s.misses, splashes: s.splashes, bonks: s.bonks, helps: s.helps }, medal: res && res.stats ? (res.stats.find(x => x.label === 'Medal') || {}).value : null,
        cpuErrs: [...P.CPU.errs], lines };
    }, { who, as, seed, maxT, trace });
    if (r.lines.length) console.log(r.lines.join('\n'));
    console.log(`${who.padEnd(8)} as ${['Pip', 'Bo'][as]} s${seed}: ${r.cleared ? 'CLEARED in ' + r.time + 's ' + r.medal : 'not cleared (fleet ' + (r.room + 1) + ', hop ' + r.hop + ' ' + r.phase + ')'}  ${JSON.stringify(r.stats)}${r.cpuErrs.length ? ' CPU ERR ' + r.cpuErrs.join(',') : ''}${errors.length ? ' PAGE ERR ' + errors.slice(0, 3).join(' | ') : ''}`);
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
