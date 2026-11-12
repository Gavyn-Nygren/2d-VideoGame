#!/usr/bin/env node
// World 36 review: the computer partner next to "people" who do the wrong thing (not just slow or late ones, which
// tools/w36/stuck.js covers).  node tools/w36/people.js [mode:case,...|all] [--human-is=0,1] [--seeds=1,2] [--max=500]
// Each case is a script for the person's character (it can start from what the computer would press: `out`).
//   --trace=T0:T1 [--expr="js using st"]  prints every change of the computer's held keys between T0 and T1 s
// Prints how the level ended, the level's raw stats, the time each take took, 8 s "stuck" spots of the computer's
// character, and the computer's worst held-key flips in a second.
//   takeone:  noclap (never touches the dial), wrongclap (claps on time, a third of the time to a wrong scene),
//             lateclap (claps 0.5 s before each flat), wilddrive (random lanes and hops), nodrive (never steers)
//   tramrun:  stayon (the runner never leaves the tram), runoff (jumps off and holds right for good),
//             wrongcall (plays the runner well but calls "Go up!" at every fork), nobrake (the brake hero does nothing),
//             cookbrake (holds the brake for good), backcar (brake hero stands on the last car)
//   stuntfall: nohands (steers well, never taps), tapper (taps hands every 0.7 s), leftie (holds left for good),
//             doubletap (taps hands 0.12 s after the computer does), still (never steers, taps when the plan says)
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const ALL = { takeone: ['noclap', 'wrongclap', 'lateclap', 'wilddrive', 'nodrive'], tramrun: ['stayon', 'runoff', 'wrongcall', 'nobrake', 'cookbrake', 'backcar'], stuntfall: ['nohands', 'tapper', 'leftie', 'doubletap', 'still'] };
const first = args.find(a => !a.startsWith('--')) || 'all';
const cases = first === 'all' ? Object.entries(ALL).flatMap(([m, cs]) => cs.map(c => [m, c])) : first.split(',').flatMap(s => { const [m, c] = s.split(':'); return c ? [[m, c]] : ALL[m].map(c2 => [m, c2]); });
const trace = opt('trace', '').split(':').map(Number), texpr = opt('expr', '');
const seeds = opt('seeds', '1').split(',').map(Number), maxT = +opt('max', 500), humanIs = opt('human-is', '0,1').split(',').map(Number);
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
  for (const [mode, cs] of cases) for (const hid of humanIs) for (const seed of seeds) {
    errs.length = 0;
    const r = await page.evaluate(async ({ mode, cs, hid, seed, maxT, trace, texpr }) => {
      const P = window.__pipbo, G = P.G, i = P.LEVELS.findIndex(l => l.mode === mode), M = P.MODES[mode];
      window.__seed(seed * 15485863);
      G.manual = true; G.cpuOn = [true, true]; P.CPU.skillOf = ['normal', 'normal'];
      const h = { t: 0, a: 0, b: 0, lane: 0, tap: 0, cpuAct: false, since: 9 };
      const rnd = () => Math.random();
      const script = (p, out, dt) => {
        const st = G.mst; h.t += dt;
        if (mode === 'takeone') {
          const role = p.id === st.drv ? 'drv' : 'hero';
          if (cs === 'noclap') return role === 'hero' ? {} : out;
          if (cs === 'nodrive') return role === 'drv' ? {} : out;
          if (cs === 'wrongclap') { if (role !== 'hero') return out; if (out.act && rnd() < 0.33) return { right: true }; return out; }
          if (cs === 'lateclap') {
            if (role !== 'hero') return out;
            const f = st.items.find(it => (it.k === 'flat' || it.k === 'end') && it.shown && !it.done);
            const o = Object.assign({}, out); if (o.act && !(f && M.eta(st, f) < 1.0)) o.act = false; return o;
          }
          if (cs === 'wilddrive') {
            if (role !== 'drv') return out;
            h.a -= dt; const o = {};
            if (h.a <= 0) { h.a = 0.5 + rnd() * 1.2; const q = rnd(); if (q < 0.3) o.jump = 'tap'; else if (q < 0.6) o.down = true; else if (q < 0.8) o.act = 'tap'; }
            return o;
          }
        }
        if (mode === 'tramrun') {
          const role = p.id === st.brk ? 'brk' : 'run';
          if (cs === 'stayon') return role === 'run' ? {} : out;
          if (cs === 'runoff') return role === 'run' ? { right: true, jump: st.rn.on === 'car' && st.rn.car === 0 ? 'tap' : false } : out;
          if (cs === 'wrongcall') { if (role !== 'run') return out; const o = Object.assign({}, out); if (o.down && !o.jump && st.rn.on === 'ground') { o.down = false; o.up = true; } return o; }
          if (cs === 'nobrake') return role === 'brk' ? {} : out;
          if (cs === 'cookbrake') return role === 'brk' ? Object.assign({}, out, { act: true }) : out;
          if (cs === 'backcar') return role === 'brk' ? { left: true } : out;
        }
        if (mode === 'stuntfall') {
          if (cs === 'nohands') return Object.assign({}, out, { act: false });
          if (cs === 'tapper') { h.a -= dt; const o = Object.assign({}, out, { act: false }); if (h.a <= 0) { h.a = 0.7; o.act = 'tap'; } return o; }
          if (cs === 'leftie') return { left: true };
          if (cs === 'still') return { act: out.act };
          if (cs === 'doubletap') {
            // taps 0.12 s after the link state changes (a person pressing for the same thing a moment later)
            const linked = !!st.link; if (linked !== h.cpuAct) { h.cpuAct = linked; h.since = 0; h.tap = 1; }
            h.since += dt; const o = Object.assign({}, out, { act: false });
            if (h.tap && h.since >= 0.12) { h.tap = 0; o.act = 'tap'; }
            return o;
          }
        }
        return out;
      };
      P.CPU.filter = (p, out, dt) => (p.id === hid ? script(p, out || {}, dt) : out);
      const B = P.CPU.brains[mode], think0 = B.think;
      B.think = function (s, p, o, dt, info) { return think0.call(this, s, p, o, dt, p.id === hid ? info : Object.assign({}, info, { partnerCpu: false })); };
      delete G.results[i];
      P.loadLevel(i);
      const cpu = G.players[1 - hid];
      const pos = () => { const st = G.mst, q = st.runPos && st.runPos[cpu.id]; return q ? { x: q.x, y: q.y || 0 } : { x: cpu.x, y: cpu.y }; };
      const stuck = [], flips = []; let anchor = Object.assign(pos(), { t: 0 }), n = 0, flagged = false, last = null;
      const steps = Math.round(maxT / P.DT);
      while (n < steps && G.mode === 'play') {
        for (let k = 0; k < 240 && G.mode === 'play'; k++, n++) {
          P.step(P.DT);
          const t = n * P.DT, q = pos(), i2 = cpu.input, key = [i2.left, i2.right, i2.down, i2.jump, i2.act].map(Number).join('');
          if (last !== null && key !== last) { flips.push(t); if (trace.length === 2 && t >= trace[0] && t <= trace[1]) { let x = ''; try { const st = G.mst; x = texpr ? JSON.stringify(eval(texpr)) : ''; } catch (e) { x = 'ERR ' + e.message; } stuck.push('key t=' + t.toFixed(3) + ' LRDJA ' + key + ' ' + x); } } last = key;
          if (Math.hypot(q.x - anchor.x, q.y - anchor.y) > 24) { anchor = Object.assign(q, { t }); flagged = false; }
          else if (t - anchor.t > 8 && !flagged) { flagged = true; let pl = ''; try { pl = JSON.stringify(M.plan(G.mst)).slice(0, 200); } catch (e) { pl = 'ERR ' + e.message; } stuck.push(`t=${t.toFixed(0)} take ${G.room + 1} at ${Math.round(q.x)},${Math.round(q.y)} ${pl}`); }
        }
        await new Promise(r2 => setTimeout(r2, 0));
      }
      P.CPU.filter = null; B.think = think0;
      let b = 0, j = 0, at = 0; for (let k = 0; k < flips.length; k++) { while (flips[k] - flips[j] > 1) j++; if (k - j + 1 > b) { b = k - j + 1; at = flips[j]; } }
      const res = G.results[i], s = G.mst.stats || {};
      return { done: !!res, time: res ? Math.round(res.time) : null, room: G.room, stuck, flips: b + (b >= 12 ? ' (at ' + at.toFixed(1) + 's)' : ''), raw: JSON.stringify(Object.assign({}, s, { roomT: (s.roomT || []).map(Math.round) })) };
    }, { mode, cs, hid, seed, maxT, trace, texpr });
    console.log(`${mode.padEnd(9)} ${cs.padEnd(10)} person=${['Pip', 'Bo'][hid]} s${seed}: ${r.done ? 'CLEARED ' + r.time + 's' : 'NOT done, take ' + (r.room + 1)}  cpu flips/s ${r.flips}  stuck ${r.stuck.length}${errs.length ? ' ERR ' + errs[0] : ''}`);
    console.log('   ' + r.raw);
    for (const s of r.stuck.slice(0, trace.length === 2 ? 60 : 3)) console.log('   ' + s);
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
