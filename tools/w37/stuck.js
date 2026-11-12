#!/usr/bin/env node
// Looks for spots where the computer partner gets stuck in a World 37 team level when a person-like player is the other
// character. node tools/w37/stuck.js [modes] [--human=lag,eager,slow] [--seeds=1,2,3] [--max=600] [--human-is=0,1]
//   lag    plays the role well but starts each move, jump and press 0.35 s late (a careful person)
//   eager  plays the role, but every 4-12 s often runs ahead to the right for 1-3 s, jumping now and then (an excited kid)
//   --log=T0:T1:EVERY  print --expr every EVERY s between T0 and T1 (simulated)
//   --expr="..." a JS expression (st = G.mst) printed with each stuck spot
//   slow   plays the role, but holds still for 2-5 s every 8-15 s and walks at about half speed (a younger player)
// A "stuck" spot is 8 s or more where the computer's character moves less than 24 px while the level is not cleared.
// Each one prints where both players were and what the level's plan said, so it can be looked at with trace.js.
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const modes = (args.find(a => !a.startsWith('--')) || 'royalcarriage,tandemjoust,siegetower').split(',');
const humans = opt('human', 'lag,eager,slow').split(','), seeds = opt('seeds', '1,2,3').split(',').map(Number);
const maxT = +opt('max', 600), expr = opt('expr', ''), logA = opt('log', '').split(':').map(Number), humanIs = opt('human-is', '0,1').split(',').map(Number);
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
  for (const mode of modes) for (const hum of humans) for (const hid of humanIs) for (const seed of seeds) {
    errs.length = 0;
    const r = await page.evaluate(async ({ mode, hum, hid, seed, maxT, expr, logA }) => {
      const P = window.__pipbo, G = P.G, i = P.LEVELS.findIndex(l => l.mode === mode);
      window.__seed(seed * 104729);
      G.manual = true; G.cpuOn = [true, true]; P.CPU.skillOf = ['normal', 'normal'];
      const h = { q: [], hold: 0, next: 8 + Math.random() * 7, run: 0, rnext: 4 + Math.random() * 6, half: 0 };
      P.CPU.filter = (p, out, dt) => {
        if (p.id !== hid) return out;
        if (hum === 'lag') {
          // starts things 0.35 s late, but lets go of a direction as soon as it's no longer wanted (people stop well)
          // a person reacts with one press, not a press every other step: a run of 'tap' asks becomes one press
          // (and another after 0.6 s if the computer's plan still asks for it)
          const cur = Object.assign({}, out);
          for (const k of ['act', 'jump']) {
            if (cur[k] === 'tap') { if (h['tp' + k] > 0) cur[k] = false; else h['tp' + k] = 0.6; }
            if (h['tp' + k] > 0) h['tp' + k] -= dt;
            if (out[k] !== 'tap') h['tp' + k] = 0;
          }
          h.q.push(cur); const o = h.q.length > 42 ? Object.assign({}, h.q.shift()) : {};
          if (!out.left) o.left = false; if (!out.right) o.right = false;
          return o;
        }
        if (hum === 'eager') {
          h.rnext -= dt;
          if (h.rnext <= 0) { h.rnext = 4 + Math.random() * 8; if (Math.random() < 0.6) h.run = 1 + Math.random() * 2; }
          if (h.run > 0) { h.run -= dt; return { right: true, jump: Math.random() < 0.6 * dt ? 'tap' : false }; }
          return out;
        }
        if (hum === 'slow') {
          if (h.hold > 0) { h.hold -= dt; return {}; }
          h.next -= dt; if (h.next <= 0) { h.hold = 2 + Math.random() * 3; h.next = 8 + Math.random() * 7; }
          h.half = (h.half + dt) % 0.2;
          // (people keep holding the direction through a jump)
          const rr = G.mst && G.mst.run && G.mst.run[p.id], air = rr && rr.grounded === false;
          if (h.half > 0.1 && !air && (out.left || out.right) && !out.down && !out.act) return Object.assign({}, out, { left: false, right: false });
          return out;
        }
        return out;
      };
      // the computer under test must believe its partner is a person (as in 1-player mode)
      const B = P.CPU.brains[mode], think0 = B.think;
      B.think = function (s, p, o, dt, info) { return think0.call(this, s, p, o, dt, p.id === hid ? info : Object.assign({}, info, { partnerCpu: false })); };
      delete G.results[i];
      P.loadLevel(i);
      const cpu = G.players[1 - hid], hp = G.players[hid];
      // where the computer really is: its run position in the scrolling levels, the crumb in Ant Hill Heist
      const pos = () => { const st = G.mst; const r = st.run && st.run[cpu.id]; return r ? { x: r.x, y: r.y || 0 } : { x: cpu.x, y: cpu.y }; };
      const stuck = []; let anchor = Object.assign(pos(), { t: 0 }), n = 0, flagged = false;
      const steps = Math.round(maxT / P.DT);
      while (n < steps && G.mode === 'play') {
        for (let k = 0; k < 240 && G.mode === 'play'; k++, n++) {
          P.step(P.DT);
          const t = n * P.DT;
          if (logA.length === 3 && t >= logA[0] && t <= logA[1] && n % Math.max(1, Math.round(logA[2] / P.DT)) === 0) {
            const st = G.mst; let x; try { x = JSON.stringify(eval(expr)); } catch (e) { x = 'ERR ' + e.message; }
            stuck.push('log t=' + t.toFixed(2) + ' ' + x);
          }
          const q = pos();
          if (Math.hypot(q.x - anchor.x, q.y - anchor.y) > 24) { anchor = Object.assign(q, { t }); flagged = false; }
          else if (t - anchor.t > 8 && !flagged) {
            flagged = true;
            let plan = '';
            try { const M = P.MODES[mode]; plan = M.plan ? JSON.stringify(M.plan(G.mst, cpu)).slice(0, 220) : ''; } catch (e) { plan = 'ERR ' + e.message; }
            if (expr) { try { const st = G.mst; plan += ' | ' + JSON.stringify(eval(expr)); } catch (e) { plan += ' | ERR ' + e.message; } }
            stuck.push(`t=${t.toFixed(0)} room ${G.room} cpu(${['Pip', 'Bo'][cpu.id]}) at ${Math.round(q.x)},${Math.round(q.y)} scr ${Math.round(cpu.x)},${Math.round(cpu.y)}${cpu.grounded ? 'g' : 'a'} human ${Math.round(hp.x)},${Math.round(hp.y)} plan ${plan}`);
          }
        }
        await new Promise(r => setTimeout(r, 0));
      }
      P.CPU.filter = null; B.think = think0;
      const res = G.results[i];
      return { done: !!res, time: res ? Math.round(res.time) : null, room: G.room, stuck };
    }, { mode, hum, hid, seed, maxT, expr, logA });
    console.log(`${mode.padEnd(9)} ${hum.padEnd(5)} human=${['Pip', 'Bo'][hid]} s${seed}: ${r.done ? 'CLEARED ' + r.time + 's' : 'NOT done, room ' + (r.room + 1)}  stuck ${r.stuck.length}${errs.length ? ' ERR ' + errs[0] : ''}`);
    for (const s of r.stuck.slice(0, logA.length === 3 ? 400 : 4)) console.log('   ' + s);
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
