#!/usr/bin/env node
// Runaway Rickshaw: scripted "people" play with the computer partner (in both jobs, as Pip and as Bo), or two people
// with no computer at all. Each person is driven through p.input / pendingAct like the keyboard would.
// node tools/w29/rickshaw-people.js [--who=good,kid,masher,holdup,holddown,holdright,wrongjob,away,idle,duo] [--as=0,1] [--seeds=1,2,3]
//   good      follows the prompts, 0.3 s late, swings by eye        kid    about 1 s late at everything, sloppy swings
//   masher    mashes the action and flips directions                 holdX  holds one direction the whole ride
//   wrongjob  does the partner's job (rider keys while steering...)  away   good, but stops for 20 s twice, then returns
//   idle      presses nothing (must not clear)                       duo    two "good" people, no computer (as= ignored)
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1100, height: 640 } });
  const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.addInitScript(() => {
    const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    let r = gen(1); window.__seed = n => { r = gen((n >>> 0) || 1); }; Math.random = () => r();
  });
  await page.goto('file://' + path.resolve(__dirname, '../../index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const whos = opt('who', 'good,kid,masher,holdup,holddown,holdright,wrongjob,away,idle,duo').split(',');
  for (const who of whos) for (const as of (who === 'duo' ? [0] : opt('as', '0,1').split(',').map(Number))) for (const seed of opt('seeds', '1,2,3').split(',').map(Number)) {
    const r = await page.evaluate(({ who, as, seed, maxT }) => {
      window.__seed(seed * 7919);
      const P = window.__pipbo, G = P.G, M = P.MODES.rickshaw, brain = P.CPU.brains.rickshaw, i = P.LEVELS.findIndex(l => l.mode === 'rickshaw');
      G.manual = true; P.CPU.filter = null;
      const people = who === 'duo' ? [0, 1] : [as];
      G.cpuOn = [!people.includes(0), !people.includes(1)];
      P.loadLevel(i);
      const gauss = () => { let u = 0; for (let k = 0; k < 6; k++) u += Math.random(); return (u - 3) / Math.sqrt(0.5); };
      const mk = id => ({ id, line: [], last: {}, star: null, pressAt: 0, flip: 0, dir: 0, react: who === 'kid' ? 1.0 : 0.3, sd: who === 'kid' ? 0.16 : 0.07 });
      const ps = people.map(mk);
      let n = 0, stuck = 0, lastX = 0, nan = false, waitT = 0, cpuPressWhileWait = 0, roomAt = [];
      const DT = P.DT;
      const apply = (p, out, me) => {
        const want = k => (out[k] === 'tap' ? !me.last[k] : !!out[k]);
        const a = want('act'), j = want('jump');
        p.input.left = !!out.left && !out.right; p.input.right = !!out.right && !out.left; p.input.up = !!out.up; p.input.down = !!out.down;
        if (j && !p.input.jump) p.pendingJump = true; p.input.jump = j;
        if (a && !p.input.act) p.pendingAct = true; p.input.act = a;
        me.last = { act: a, jump: j };
      };
      const think = (me, asId) => {
        const p = G.players[me.id], st = G.mst;
        const fake = Object.assign(Object.create(Object.getPrototypeOf(p)), p, { id: asId });
        return brain.think({}, fake, G.players[1 - me.id], DT, { mst: st, partnerCpu: true, intro: G.introT > 0, skill: 1 }) || {};
      };
      while (G.mode === 'play' && G.time < maxT && n < 120 * (maxT + 200)) {
        const st = G.mst;
        for (const me of ps) {
          const p = G.players[me.id];
          let out = {};
          if (who === 'idle') out = {};
          else if (who === 'masher') { me.flip -= DT; if (me.flip <= 0) { me.flip = 0.4 + Math.random() * 0.4; me.dir = Math.floor(Math.random() * 5); } out = { act: Math.floor(G.clock * 8) % 2 === 0, left: me.dir === 0, right: me.dir === 1, up: me.dir === 2, down: me.dir === 3 }; }
          else if (who === 'holdup') out = { up: true };
          else if (who === 'holddown') out = { down: true };
          else if (who === 'holdright') out = { right: true };
          else {
            const wrong = who === 'wrongjob';
            const asId = wrong ? (st.steer === me.id ? st.ride : st.steer) : me.id;
            const raw = think(me, asId);
            me.line.push(Object.assign({}, raw));
            const lag = Math.round(me.react / DT);
            out = Object.assign({}, me.line.length > lag ? me.line.shift() : {});
            if (!wrong && st && st.c && me.id === st.ride) {
              // swing by eye instead of the brain's perfect timing
              delete out.act;
              const pl = M.plan(st);
              if (pl.star && pl.star !== me.star) { me.star = pl.star; me.pressAt = 0.09 + gauss() * me.sd + (who === 'kid' ? 0.05 : 0); }
              if (me.star && me.star.st === 'fly' && me.star.T - me.star.t <= me.pressAt && !me.star['p' + me.id]) { me.star['p' + me.id] = 1; out.act = 'tap'; }
            }
            if (!wrong && st && st.c && me.id === st.steer) {
              // hop by eye: aim for about 0.2 s before the wheels reach the low thing or the ditch
              delete out.act;
              const rk = st.rk, v = Math.max(120, rk.v);
              const ob = st.c.obs.find(q => q.st === 'up' && M.OB[q.kind].low && q.x + M.OB[q.kind].w / 2 > rk.x + M.S.front && (q.lane === 2 || Math.abs(rk.ly - q.lane) < 0.6));
              const cn = st.c.canals.find(q => !q.ramp && q.x + 14 > rk.x);
              for (const q of [ob, cn]) {
                if (!q) continue;
                const d = (q === cn ? q.x + 14 - rk.x : q.x - M.OB[q.kind].w / 2 - rk.x - M.S.front) / v;
                if (q['aim' + me.id] === undefined) q['aim' + me.id] = (who === 'kid' ? 0.12 : 0.2) + gauss() * me.sd;
                if (d < 1.2 && d <= q['aim' + me.id] && !q['pr' + me.id] && !rk.air) { q['pr' + me.id] = 1; out.act = 'tap'; }
              }
            }
            if (who === 'away' && ((G.time > 40 && G.time < 60) || (G.time > 120 && G.time < 140))) out = {};
            else if (who === 'away' && st.waiting) out = { right: true }; // back: "press anything to go on"
          }
          apply(p, out, me);
        }
        P.step(DT); n++;
        const s2 = G.mst;
        if (s2 && s2.rk) {
          if (!isFinite(s2.rk.x) || !isFinite(s2.rk.v) || !isFinite(s2.cam.y)) nan = true;
          if (s2.waiting) { waitT += DT; for (let q = 0; q < 2; q++) if (G.cpuOn[q] && G.players[q].pendingAct) cpuPressWhileWait++; }
          if (G.room !== roomAt.length) roomAt.push(+G.time.toFixed(1));
        }
      }
      const st = G.mst, s = st.stats, cards = M.stats();
      return { who, as: who === 'duo' ? 'both' : ['Pip', 'Bo'][as], seed, mode: G.mode, t: +G.time.toFixed(1), room: G.room + 1, roomAt, bao: st.bao + '/' + st.totalAll, spills: s.spills, crashes: s.crashes, splash: s.splashes, hits: s.hits, gates: s.gates, greats: s.greats, helps: s.helps, restocks: s.restocks, medal: cards[3] && cards[3].value, wait: +waitT.toFixed(1), nan };
    }, { who, as, seed, maxT: +opt('max', 600) });
    console.log(JSON.stringify(r));
  }
  console.log('errors:', [...new Set(errs)].slice(0, 6));
  await browser.close();
})();
