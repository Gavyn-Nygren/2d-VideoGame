#!/usr/bin/env node
// Shadow Sneak "scripted people": node tools/w29/shadowsneak-people.js [--who=masher,slow,...] [--as=0,1] [--seeds=1,2] [--max=900] [--room=0] [--log]
// Plays a pretend person (as Pip, then as Bo) with the computer partner and prints how each run ended.
//   good     follows the prompts (the brain's own rules) with a 0.25 s reaction
//   slow     the same, but about 1 s late at everything
//   masher   presses random buttons a few times a second
//   right    holds right (and the action) all the time          left   holds left all the time
//   wrong    does the other job's moves: a sneaker who only aims and "tosses", a thrower who dashes and hops about
//   away     plays well, but stops for 20 s every 45 s
//   idle     presses nothing (must NOT clear)
//   two      two people, no computer: both follow the prompts 0.35 s late (as = ignored)
//   twoslow  two people, both 1 s late
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(a.indexOf('=') + 1) : d; };
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.addInitScript(() => {
    const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    let seeded = gen(1); window.__seed = n => { seeded = gen((n >>> 0) || 1); }; Math.random = () => seeded();
  });
  await page.goto('file://' + path.resolve(__dirname, '../../index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const whos = opt('who', 'good,slow,masher,right,left,wrong,away,idle,two,twoslow').split(',');
  const seeds = opt('seeds', '1').split(',').map(Number), as = opt('as', '0,1').split(',').map(Number);
  for (const who of whos) for (const h of (who.startsWith('two') ? [0] : as)) for (const seed of seeds) {
    errs.length = 0;
    const r = await page.evaluate(({ who, h, seed, maxT, room, wantLog }) => {
      const P = window.__pipbo, G = P.G, i = P.LEVELS.findIndex(l => l.mode === 'shadowsneak'), log = [];
      window.__seed(seed * 7919 + h * 31 + who.length);
      G.manual = true; P.CPU.filter = null; P.CPU.errs.clear();
      const two = who.startsWith('two');
      G.cpuOn = two ? [false, false] : [h !== 0, h !== 1];
      delete G.results[i];
      P.loadLevel(i);
      for (let r = 0; r < room; r++) { G.introT = 0; P.nextRoom(); }
      const brain = P.CPU.brains.shadowsneak;
      const people = two ? [0, 1] : [h];
      const S = people.map(id => ({ id, bs: {}, prev: {}, q: [], mash: { t: 0, o: {} } }));
      const delay = who === 'slow' || who === 'twoslow' ? 1.0 : who === 'two' ? 0.35 : 0.25, dN = Math.round(delay / P.DT);
      const persona = (s, n) => {
        const p = G.players[s.id], st = G.mst, t = n * P.DT;
        const ideal = () => brain.think(s.bs, p, G.players[1 - s.id], P.DT, { mst: st, intro: G.introT > 0, partnerCpu: true, time: G.time }) || {};
        if (who === 'idle') return {};
        if (who === 'masher') { const m = s.mash; if ((m.t -= P.DT) <= 0) { m.t = 0.08 + Math.random() * 0.2; m.o = { left: Math.random() < 0.3, right: Math.random() < 0.5, jump: Math.random() < 0.4, down: Math.random() < 0.2, act: Math.random() < 0.5 }; } return m.o; }
        if (who === 'right') return { right: true, act: true };
        if (who === 'left') return { left: true };
        if (who === 'wrong') { const sneaker = s.id === st.sneak, ph = Math.floor(t / 1.5) % 4; return sneaker ? { jump: ph === 0, down: ph === 2, act: Math.floor(t * 3) % 2 === 0 } : { right: ph < 2, left: ph === 3, jump: Math.floor(t * 2) % 2 === 0, act: true }; }
        if (who === 'away' && t % 45 > 25) return {};
        if (st.waiting) return { jump: Math.floor(t * 4) % 2 === 0 }; // back from a break: press anything
        // a person starts late (the reaction time) but lets go on time: a key is down when the prompt asked for it
        // `delay` ago and still asks for it now; taps (hop, toss, lever) are simply late
        const now = ideal();
        s.q.push(now);
        const was = s.q.length > dN ? s.q.shift() : {}, o = {};
        for (const k of ['left', 'right', 'down', 'up']) o[k] = !!was[k] && !!now[k];
        for (const k of ['jump', 'act']) o[k] = was[k] === 'tap' ? 'tap' : !!was[k] && now[k] === true;
        return o;
      };
      const apply = (s, o) => {
        const p = G.players[s.id], inp = p.input; for (const key in inp) inp[key] = false;
        inp.left = !!o.left; inp.right = !!o.right; inp.down = !!o.down; inp.up = !!o.up;
        for (const b of ['jump', 'act']) {
          const on = o[b] === 'tap' ? !s.prev[b] : !!o[b];
          if (on && !s.prev[b]) { if (b === 'jump') p.pendingJump = true; else p.pendingAct = true; }
          s.prev[b] = on; inp[b] = on;
        }
      };
      const steps = Math.round(maxT / P.DT);
      let n = 0, bad = '', lastProg = 0, maxStall = 0, lastKey = '', lr = -1, waitedN = 0, sp = 0, ca = 0;
      for (; n < steps && G.mode === 'play'; n++) {
        for (const s of S) apply(s, persona(s, n));
        P.step(P.DT);
        const st = G.mst; if (!st.P) continue;
        const vals = [st.sn.x, st.sn.y, st.th.x, st.th.mark, st.th.pouch, st.cam.x, G.time].concat(st.P.guards.map(g => g.x), st.P.dogs.map(d => d.x));
        if (!bad && vals.some(v => typeof v !== 'number' || !isFinite(v))) bad = 'NaN at ' + G.time.toFixed(1);
        const key = G.room + ':' + st.P.k;
        if (key !== lastKey) { lastKey = key; maxStall = Math.max(maxStall, n - lastProg); lastProg = n; if (wantLog) log.push(G.time.toFixed(1) + ' room ' + (G.room + 1) + ' post ' + (st.P.k + 1)); }
        if (st.waiting) waitedN++;
        if (wantLog && st.stats.spotted !== sp) { sp = st.stats.spotted; log.push(G.time.toFixed(1) + '  spotted at ' + Math.round(st.sn.x - st.P.x0)); }
        if (wantLog && st.stats.caught !== ca) { ca = st.stats.caught; log.push(G.time.toFixed(1) + '  caught'); }
      }
      maxStall = Math.max(maxStall, n - lastProg);
      const st = G.mst, res = G.results[i];
      return { cleared: !!res, time: res ? Math.round(res.time) : null, sim: Math.round(n * P.DT), room: G.room + 1, post: st.P ? st.P.k + 1 : 0, stats: st.stats, medal: res && res.stats && res.stats.find(x => x && x.label === 'Medal'), maxStall: Math.round(maxStall * P.DT), breakS: Math.round(waitedN * P.DT), bad, cpuErrs: [...P.CPU.errs], log,
        end: 'plan ' + JSON.stringify(Object.assign({}, P.MODES.shadowsneak.plan(st).sneak, { zone: 0 })) + ' ' + JSON.stringify(P.MODES.shadowsneak.plan(st).toss) + ' think ' + JSON.stringify(st.think) + ' pouch ' + st.th.pouch.toFixed(1) + ' mark ' + Math.round(st.th.mark - st.P.x0) + '\n        sn ' + Math.round(st.sn.x - st.P.x0) + ' ' + st.sn.state + ' th ' + Math.round(st.th.x - st.P.x0) + ' open ' + st.P.open + ' chase ' + !!st.chase + ' guards ' + st.P.guards.map(g => g.kind[0] + Math.round(g.x - st.P.x0) + (g.face > 0 ? '>' : '<') + g.state).join(' ') };
    }, { who, h, seed, maxT: +opt('max', 900), room: +opt('room', 0), wantLog: args.includes('--log') });
    const s = r.stats;
    console.log(`${who.padEnd(7)} as ${who.startsWith('two') ? 'both' : ['Pip', 'Bo '][h]} s${seed}: ${r.cleared ? 'CLEARED ' + r.time + 's ' + (r.medal ? r.medal.value : '') : 'not cleared (stretch ' + r.room + ' post ' + r.post + ', sim ' + r.sim + 's)'}  spotted ${s.spotted} caught ${s.caught} esc ${s.escapes} peb ${s.pebbles} bonk ${s.bonks} help ${s.helps} unseen ${s.clean}  longest post ${r.maxStall}s break ${r.breakS}s${r.bad ? ' ' + r.bad : ''}${r.cpuErrs.length ? ' CPUERR ' + r.cpuErrs : ''}${errs.length ? ' PAGEERR ' + errs.slice(0, 3).join(' | ') : ''}`);
    if (!r.cleared) console.log('        ' + r.end);
    if (r.log.length) console.log(r.log.map(l => '        ' + l).join('\n'));
  }
  await browser.close();
})();
