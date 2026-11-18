#!/usr/bin/env node
// Bot runs of 41-2 Page Turner Chase with drawing switched off (K3D.noRender), two computer players.
//   node tools/w41/chase-play.js [--page=k] [--all] [--who=cpu|slow0|slow1|clumsy0|clumsy1|...] [--secs=600] [--seed=1]
//   --page=k   start on page k (0-3) and stop when it turns (default: the whole level from page 0)
//   --who      cpu: both computers; slowN: player N is a one-second-slow kid (pulls and lets go of tabs 1 s late, sets off
//              1 s after standing still, jumps 0.25 s late); clumsyN: player N
//              wobbles, lets go of tabs now and then and jumps at random; several runs: --who=cpu,slow0,clumsy1
//              never|grab|drop|back|finger|lazy|onetwinN: player N misbehaves for the first --naughty=15 s of every page
//              (never touches a tab, grabs every tab first, lets go mid-crossing, runs back toward the Roll, stands
//              under the finger, holds a wheel and never turns it, pulls one twin tab and walks off), then plays properly
//   --draw=N   draw a frame every N steps (software WebGL, slow) instead of K3D.noRender: the run must come out the same
//   --trace    also print both players every quarter second (--x=<js> adds a value to each line)
//   Prints per page: time, Flats, Bumps, rewinds, the smallest lead over the Roll, and STUCK if nobody gained
//   ground for 25 s. Exit code 1 if any run fails to finish.
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };

(async () => {
  const draw = +opt('draw', 0);
  const browser = await chromium.launch(draw ? { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] } : {});
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  let bad = 0;
  for (const who of opt('who', 'cpu').split(',')) {
    const res = await page.evaluate(async ({ draw, who, naughtyT, trx: TRX, tr, pg, secs, seed, all }) => {
      const P = window.__pipbo, G = P.G, K3D = P.K3D;
      K3D.noRender = !draw; G.manual = true;
      const i = P.LEVELS.findIndex(l => l.mode === 'popchase');
      G.cpuOn = [true, true];
      let r = seed * 9301 + 49297; const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
      const slow = who.startsWith('slow') ? +who.slice(4) : -1, clumsy = who.startsWith('clumsy') ? +who.slice(6) : -1;
      // a naughty kid misbehaves for the first `naughtyT` seconds of every page, then plays properly
      const NAUGHTY = ['never', 'grab', 'drop', 'back', 'finger', 'lazy', 'onetwin'];
      const nm = NAUGHTY.find(k => who.startsWith(k)), naughty = nm ? +who.slice(nm.length) : -1;
      const queue = [];
      CPU.filter = (p, out, dt) => {
        if (p.id === slow) {
          // a slow kid: pulls and lets go of tabs a second late, sets off a second after standing still, jumps a quarter
          // of a second late
          queue.push({ t: G.time, out: Object.assign({}, out) });
          while (queue.length > 1 && G.time - queue[0].t > 1.0) queue.shift();
          const late = d => { let k = queue.length - 1; while (k > 0 && G.time - queue[k].t < d) k--; return queue[k].out; };
          const o = Object.assign({}, out);
          o.act = queue[0].out.act; o.jump = late(0.25).jump;
          if (out.act && !o.act) { o.ax = 0; o.ay = 0; } // (at a tab, about to grab it: standing still)
          const mv = q => Math.hypot(q.ax || 0, q.ay || 0) > 0.2;
          if (!p._moving && mv(o)) { p._still = (p._still || 0); if (G.time - p._still < 1.0) { o.ax = 0; o.ay = 0; } else p._moving = true; }
          if (!mv(o)) { if (p._moving) p._still = G.time; p._moving = false; }
          return o;
        }
        if (p.id === naughty && G.mst && G.mst.T < naughtyT) {
          const o = Object.assign({}, out), st = G.mst, hold = p.pc.hold;
          if (nm === 'never') o.act = false;                                   // never touches a tab
          else if (nm === 'grab') o.act = true;                                // grabs every tab it passes, first
          else if (nm === 'drop') { if (hold) { p._held = (p._held || 0) + dt; if (p._held > 1.2) { o.act = false; p._held = -0.8; } } } // lets go mid-crossing
          else if (nm === 'back') { o.ax = -(out.ax || 0); o.ay = -(out.ay || 0); o.jump = false; } // runs back toward the Roll
          else if (nm === 'finger') { if (st.finger) { const k = cpuNav3.stick(st.finger.x - p.b3.x, st.finger.z - p.b3.z); o.ax = k.ax; o.ay = k.ay; o.act = false; } } // stands under it
          else if (nm === 'lazy') { if (hold && hold.t.wheel) { o.ax = 0; o.ay = 0; } }  // rides the wheel tab and never turns it
          else if (nm === 'onetwin') { if (hold && hold.pc.kind === 'twin') { p._tw = (p._tw || 0) + dt; if (p._tw > 1) { o.act = false; const k = cpuNav3.stick(1, 0); o.ax = k.ax; o.ay = k.ay; } } else p._tw = 0; } // pulls one twin tab and walks off
          return o;
        }
        if (p.id === clumsy) {
          const o = Object.assign({}, out);
          if (rnd() < 0.08) { o.ax = (o.ax || 0) + (rnd() - 0.5) * 1.2; o.ay = (o.ay || 0) + (rnd() - 0.5) * 1.2; }
          if (o.act && rnd() < 0.01) p._drop = 0.6;
          if (p._drop > 0) { p._drop -= dt; o.act = false; }
          if (rnd() < 0.003) o.jump = true;
          return o;
        }
        return out;
      };
      // the other (healthy) computer plays as it would with a person: it treats the slow or clumsy kid as one
      const kid = slow >= 0 ? slow : clumsy >= 0 ? clumsy : naughty, B = CPU.brains.popchase, think0 = B.think;
      if (kid >= 0) B.think = (s, p, o, dt, info) => think0.call(B, s, p, o, dt, p.id !== kid ? Object.assign({}, info, { partnerCpu: false }) : info);
      P.loadLevel(i);
      if (draw) { const t0 = Date.now(); while (!['ready', 'failed'].includes(K3D.state) && Date.now() - t0 < 120000) await new Promise(r => setTimeout(r, 200)); }
      for (let k = 0; k < pg; k++) P.nextRoom();
      const sig = [], whys = [], pages = [], trace = tr ? [] : null;
      let cur = null, steps = 0, stuck = null;
      const DT = P.DT, maxSteps = Math.round(secs / DT);
      const startPage = () => { cur = { page: G.mst.k, t0: G.time, flats0: G.mst.stats.flats, bumps0: G.mst.stats.bumps, rew0: G.mst.stats.rewinds, lead: 1e9, best: -1e9, bestT: G.time }; };
      startPage();
      while (steps++ < maxSteps) {
        if (G.introT > 0) G.introT = 0;
        P.step(DT);
        if (draw && steps % draw === 0) P.render(DT);
        const st = G.mst;
        if (steps % 300 === 0) sig.push(G.players.map(p => p.b3 ? p.b3.x.toFixed(3) + ',' + p.b3.z.toFixed(3) : '').join(' ') + ' ' + st.rollX.toFixed(3));
        for (const p of G.players) { if (p.pc && p.pc.mode === 'flat' && p._wasRun) whys.push([G.mst.k, +G.time.toFixed(1), p.id, p.pc.why || 'rewind', +p.b3.x.toFixed(1), +p.b3.z.toFixed(1)]); p._wasRun = p.pc && p.pc.mode === 'run'; }
        if (trace && steps % 30 === 0) trace.push([+G.time.toFixed(2), TRX ? eval(TRX) : 0, ...G.players.map(p => p.b3 && [+p.b3.x.toFixed(2), +p.b3.z.toFixed(2), p.pc.mode, p.pc.hold ? p.pc.hold.pc.kind + p.pc.hold.t.side : '', p.input ? [+(p.input.ax||0).toFixed(2), +(p.input.ay||0).toFixed(2), p.input.act ? 1 : 0] : null])]);
        if (G.mode === 'clear' || st.finished) { cur.time = G.time - cur.t0; pages.push(cur); break; }
        if (st.k !== cur.page) { cur.time = G.time - cur.t0; pages.push(cur); if (pg && !all) break; startPage(); continue; }
        const xs = G.players.filter(p => p.pc && p.pc.mode === 'run').map(p => p.b3.x);
        if (xs.length && st.rollWait <= 0 && !st.turn) cur.lead = Math.min(cur.lead, Math.min(...xs) - st.rollX);
        const prog = Math.max(...G.players.map(p => (p.b3 ? POPCHASE.progress(st.L3, p.b3.x, p.b3.z) : -1)));
        if (st.stats.rewinds !== cur.rewSeen) { cur.rewSeen = st.stats.rewinds; cur.best = -1e9; } // (a rewind starts the count again)
        if (prog > cur.best + 0.5) { cur.best = prog; cur.bestT = G.time; }
        if (G.time - cur.bestT > 25 && !st.turn) { stuck = { page: st.k, at: G.players.map(p => p.b3 && [p.b3.x.toFixed(1), p.b3.z.toFixed(1), p.pc.mode, p.pc.hold ? p.pc.hold.pc.kind : '']) }; break; }
      }
      const st = G.mst;
      const out = { who, clear: G.mode === 'clear', time: +G.time.toFixed(1), flats: st.stats.flats, bumps: st.stats.bumps, rewinds: st.stats.rewinds, closest: +st.stats.closest.toFixed(2),
        sig: sig.join('|').split('').reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7).toString(16), trace, whys, pages: pages.map(c => ({ page: c.page, time: +(c.time || 0).toFixed(1), flats: st.stats.pageFlats[c.page], lead: +c.lead.toFixed(1) })), stuck,
        end: { k: st.k, players: G.players.map(p => p.b3 && [p.b3.x.toFixed(1), p.b3.z.toFixed(1), p.pc.mode]) } };
      CPU.filter = null; K3D.noRender = false; B.think = think0;
      return out;
    }, { draw, who, naughtyT: +opt('naughty', 15), trx: opt('x', ''), tr: args.includes('--trace'), pg: +opt('page', 0), secs: +opt('secs', 600), seed: +opt("seed", 1), all: args.includes("--all") });
    const tr = res.trace; delete res.trace;
    console.log(JSON.stringify(res));
    if (tr) for (const l of tr) console.log(JSON.stringify(l));
    const want = opt('page', null) != null ? res.pages.length > 0 && !res.stuck : res.clear;
    if (!want) bad++;
  }
  if (errs.length) console.log('errors:\n' + errs.slice(0, 10).join('\n'));
  await browser.close();
  process.exit(bad || errs.length ? 1 : 0);
})();
