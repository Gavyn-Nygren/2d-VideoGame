#!/usr/bin/env node
// 5-4 Rising Lava with person-like partners: the computer plays one character and believes the other one is a person,
// who is played by the computer's own brain through a filter that makes it play like a person (as tools/w33/stuck.js).
//   node tools/w5/lava-people.js [--human=lag,eager,slow] [--seeds=1,2,3] [--max=900] [--human-is=0,1]
//   lag    plays its role well, but reacts at the computer's Easy speed and stands still 0.35 s before each jump
//   eager  plays its role, but every 4-12 s often runs off to one side for 1-3 s, jumping now and then (an excited kid)
//   slow   plays its role, but holds still for 2-5 s every 8-15 s and walks at about half speed (a younger player)
// Prints per run: cleared or not, the time, the ouches, each tower's time, the closest the lava came, how many
// "stuck" spots (8 s or more where the computer's character moves less than 24 px), and the computer's busiest second
// of key changes (left/right/jump/down flips; a person can't read more than about 10 a second).
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const humans = opt('human', 'lag,eager,slow').split(','), seeds = opt('seeds', '1,2,3').split(',').map(Number);
const maxT = +opt('max', 900), humanIs = opt('human-is', '0,1').split(',').map(Number);
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1100, height: 640 } });
  const errs = []; page.on('pageerror', e => errs.push(String(e)));
  await page.addInitScript(() => {
    const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    let r = gen(1); window.__seed = n => { r = gen((n >>> 0) || 1); }; Math.random = () => r();
  });
  await page.goto('file://' + path.resolve(__dirname, '../../index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  for (const hum of humans) for (const hid of humanIs) for (const seed of seeds) {
    errs.length = 0;
    const r = await page.evaluate(async ({ hum, hid, seed, maxT }) => {
      const P = window.__pipbo, G = P.G, i = P.LEVELS.findIndex(l => l.name === 'Rising Lava');
      window.__seed(seed * 104729);
      G.manual = true; G.cpuOn = [true, true]; P.CPU.skillOf = ['normal', 'normal']; if (hum === 'lag') P.CPU.skillOf[hid] = 'easy';
      const h = { q: [], hold: 0, next: 8 + Math.random() * 7, run: 0, rdir: 1, rnext: 4 + Math.random() * 6, half: 0 };
      P.CPU.filter = (p, out, dt) => {
        if (p.id !== hid) return out;
        if (hum === 'lag') {
          // a careful person: thinks a moment before each new thing (Easy's reaction time) and stands still for 0.35 s
          // before each jump. (Delaying every key would be wrong: in the air people steer the jump they planned.)
          if (!out.jump || !p.grounded) { h.jt = 0; return out; }
          h.jt = (h.jt || 0) + dt;
          return h.jt < 0.35 ? Object.assign({}, out, { jump: false, left: false, right: false }) : out;
        }
        if (hum === 'eager') {
          h.rnext -= dt;
          if (h.rnext <= 0) { h.rnext = 4 + Math.random() * 8; if (Math.random() < 0.6) { h.run = 1 + Math.random() * 2; h.rdir = Math.random() < 0.5 ? -1 : 1; } }
          if (h.run > 0) { h.run -= dt; return { left: h.rdir < 0, right: h.rdir > 0, jump: Math.random() < 0.6 * dt }; }
          return out;
        }
        if (hum === 'slow') {
          if (h.hold > 0) { h.hold -= dt; return {}; }
          h.next -= dt; if (h.next <= 0) { h.hold = 2 + Math.random() * 3; h.next = 8 + Math.random() * 7; }
          h.half = (h.half + dt) % 0.2;
          if (h.half > 0.1 && p.grounded && (out.left || out.right) && !out.down) return Object.assign({}, out, { left: false, right: false });
          return out;
        }
        return out;
      };
      // the computer under test must believe its partner is a person (as in 1-player mode)
      const B = P.CPU.brains.lava, think0 = B.think;
      B.think = function (s, p, o, dt, info) { return think0.call(this, s, p, o, dt, p.id === hid ? info : Object.assign({}, info, { partnerCpu: false })); };
      delete G.results[i];
      P.loadLevel(i);
      const cpu = G.players[1 - hid];
      const pos = () => ({ x: cpu.x, y: cpu.y + (G.mst.camY || 0) + G.room * 1e5 });
      let anchor = Object.assign(pos(), { t: 0 }), n = 0, flagged = false, stuck = 0, flips = 0, win = [], last = null, close = 1e9;
      const steps = Math.round(maxT / P.DT);
      while (n < steps && G.mode === 'play') {
        for (let k = 0; k < 240 && G.mode === 'play'; k++, n++) {
          P.step(P.DT);
          const t = n * P.DT, st = G.mst;
          const q = pos();
          if (Math.hypot(q.x - anchor.x, q.y - anchor.y) > 24) { anchor = Object.assign(q, { t }); flagged = false; }
          else if (t - anchor.t > 8 && !flagged) { flagged = true; stuck++; }
          const key = cpu.input ? ['left', 'right', 'jump', 'down'].map(k2 => (cpu.input[k2] ? 1 : 0)).join('') : '';
          if (last != null && key !== last) win.push(t);
          last = key; while (win.length && win[0] < t - 1) win.shift(); flips = Math.max(flips, win.length);
          if (st.started && st.wait <= 0 && G.mode === 'play') {
            const lf = Math.max(...G.players.map(p => (p.alive ? p.y + st.camY + p.h : -1e9)));
            close = Math.min(close, st.lavaY - lf);
          }
        }
        await new Promise(res => setTimeout(res, 0));
      }
      P.CPU.filter = null; B.think = think0;
      const res = G.results[i], st = G.mst;
      return { done: !!res, time: res ? Math.round(res.time) : null, room: G.room, ouches: st.ouches, towers: (st.floorT || []).map(x => Math.round(x)), stuck, flips, close: Math.round(close) };
    }, { hum, hid, seed, maxT });
    console.log(`${hum.padEnd(5)} person=${['Pip', 'Bo'][hid]} s${seed}: ${r.done ? 'CLEARED ' + r.time + 's' : 'NOT done, tower ' + (r.room + 1)}  ouches ${r.ouches}  towers ${r.towers.join('/')}  closest ${r.close}px  stuck ${r.stuck}  key flips ${r.flips}/s${errs.length ? '  ERR ' + errs[0] : ''}`);
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
