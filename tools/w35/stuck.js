#!/usr/bin/env node
// Looks for spots where the computer partner gets stuck in 35-1 Moonwick Academy when a person-like player is the other
// character, class by class. node tools/w35/stuck.js [phase[,phase]|all] [--human=lag,eager,slow] [--seeds=1,2]
//   (--expr runs with the players in world coords, as the plans do)
//   [--max=600] [--human-is=0,1] [--at=g3|r1 (exam only: start at that flood gate / Great Hall round)] [--expr="..."] [--log=T0:T1:EVERY (print --expr every EVERY s between T0 and T1)]
//   lag    plays the job well but does everything 0.35 s late (a careful person)
//   eager  plays the job, but every 4-12 s often runs off to one side for 1-3 s, jumping now and then (an excited kid)
//   slow   plays the job, but holds still for 2-5 s every 8-15 s and walks at about half speed (a younger player)
// A "stuck" spot is 8 s or more where the computer's character moves less than 24 px (world coords) while the class
// is not over. Some are fine (a drawer waiting at its plate, a caster holding a spell): each one prints where both
// players were and what the class's plan said, to look at with play.js --trace. The class must end within --max s.
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const first = args.find(a => !a.startsWith('--')) || 'all';
const humans = opt('human', 'lag,eager,slow').split(','), seeds = opt('seeds', '1,2').split(',').map(Number);
const at = opt('at', ''), maxT = +opt('max', 600), expr = opt('expr', ''), logA = opt('log', '').split(':').map(Number), humanIs = opt('human-is', '0,1').split(',').map(Number);
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1100, height: 640 } });
  const errs = []; page.on('pageerror', e => errs.push(String(e)));
  await page.addInitScript(() => {
    const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    let r = gen(1); window.__seed = n => { r = gen((n >>> 0) || 1); }; Math.random = () => r();
  });
  await page.goto('file://' + path.resolve(__dirname, '../../index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.MODES && window.__pipbo.MODES.wizschool);
  const order = await page.evaluate(() => window.__pipbo.MODES.wizschool.test.WIZ_ORDER.slice());
  const phases = first === 'all' ? order : first.split(',');
  let bad = 0;
  for (const phase of phases) for (const hum of humans) for (const hid of humanIs) for (const seed of seeds) {
    errs.length = 0;
    const r = await page.evaluate(async ({ phase, hum, hid, seed, maxT, expr, logA, at }) => {
      const P = window.__pipbo, G = P.G, TT = P.MODES.wizschool.test;
      window.__seed(seed * 104729);
      G.manual = true; G.cpuOn = [true, true]; P.CPU.skillOf = ['normal', 'normal'];
      const h = { q: [], hold: 0, next: 8 + Math.random() * 7, run: 0, dir: 1, rnext: 4 + Math.random() * 6, half: 0 };
      P.CPU.filter = (p, out, dt) => {
        if (p.id !== hid) return out;
        if (hum === 'lag') {   // everything 0.35 s late (what the computer would have pressed then)
          h.q.push({ t: G.time + 0.35, out }); let o2 = null;
          while (h.q.length && h.q[0].t <= G.time) o2 = h.q.shift().out;
          h.last = o2 || h.last || {};
          return Object.assign({}, h.last);
        }
        if (hum === 'eager') {
          h.rnext -= dt;
          if (h.rnext <= 0) { h.rnext = 4 + Math.random() * 8; if (Math.random() < 0.6) { h.run = 1 + Math.random() * 2; h.dir = Math.random() < 0.7 ? 1 : -1; } }
          if (h.run > 0) { h.run -= dt; return { right: h.dir > 0, left: h.dir < 0, jump: Math.random() < 0.6 * dt ? 'tap' : false }; }
          return out;
        }
        if (hum === 'slow') {
          if (h.hold > 0) { h.hold -= dt; return {}; }
          h.next -= dt; if (h.next <= 0) { h.hold = 2 + Math.random() * 3; h.next = 8 + Math.random() * 7; }
          h.half = (h.half + dt) % 0.2;
          if (h.half > 0.1 && (out.left || out.right) && !out.down && !out.act) return Object.assign({}, out, { left: false, right: false });
          return out;
        }
        return out;
      };
      // the computer under test must believe its partner is a person (as in 1-player mode)
      const B = P.CPU.brains.wizschool, think0 = B.think;
      B.think = function (s, p, o, dt, info) { return think0.call(this, s, p, o, dt, p.id === hid ? info : Object.assign({}, info, { partnerCpu: false })); };
      TT.jump(phase, { intro: false, seed });
      if (at && phase === 'exam') TT.examAt(at);
      const st = G.mst, cpu = G.players[1 - hid], hp = G.players[hid];
      const pos = () => ({ x: cpu.x + st.cam.x, y: cpu.y + st.cam.y });
      const stuck = []; let anchor = Object.assign(pos(), { t: 0 }), n = 0, flagged = false, ended = '';
      const steps = Math.round(maxT / P.DT);
      while (n < steps && !ended) {
        for (let k = 0; k < 240 && !ended; k++, n++) {
          P.step(P.DT);
          const t = n * P.DT;
          if (G.mst !== st) { ended = 'restarted'; break; }
          if (G.mode !== 'play') { ended = 'cleared'; break; }
          if (st.cut || st.phase !== phase) { ended = 'ended'; break; }
          if (logA.length === 3 && t >= logA[0] && t <= logA[1] && n % Math.max(1, Math.round(logA[2] / P.DT)) === 0) {
            let x; G.players.forEach(pp => { pp.x += st.cam.x; pp.y += st.cam.y; }); try { const ph = st.ph; void ph; x = JSON.stringify(eval(expr)); } catch (e) { x = 'ERR ' + e.message; } G.players.forEach(pp => { pp.x -= st.cam.x; pp.y -= st.cam.y; });
            stuck.push(`log t=${t.toFixed(2)} cpu ${Math.round(cpu.x + st.cam.x)},${Math.round(cpu.y + cpu.h + st.cam.y)} human ${Math.round(hp.x + st.cam.x)},${Math.round(hp.y + hp.h + st.cam.y)} ${x}`);
          }
          const q = pos();
          if (Math.hypot(q.x - anchor.x, q.y - anchor.y) > 24) { anchor = Object.assign(q, { t }); flagged = false; }
          else if (t - anchor.t > 8 && !flagged) {
            flagged = true;
            let plan = '';
            const sh = k => G.players.forEach(pp => { pp.x += k * st.cam.x; pp.y += k * st.cam.y; });   // (plans run in world coords)
            sh(1); try { const ph = TT.WIZ_PHASES[phase]; plan = ph.plan ? JSON.stringify(ph.plan(st)[cpu.id]).slice(0, 200) : ''; } catch (e) { plan = 'ERR ' + e.message; } sh(-1);
            if (expr) { try { const ph = st.ph; void ph; plan += ' | ' + JSON.stringify(eval(expr)); } catch (e) { plan += ' | ERR ' + e.message; } }
            stuck.push(`t=${t.toFixed(0)} cpu(${['Pip', 'Bo'][cpu.id]}) at ${Math.round(q.x)},${Math.round(q.y)}${cpu.grounded ? 'g' : 'a'} human ${Math.round(hp.x + st.cam.x)},${Math.round(hp.y + st.cam.y)} plan ${plan}`);
          }
        }
        await new Promise(r2 => setTimeout(r2, 0));
      }
      P.CPU.filter = null; B.think = think0;
      return { ended, t: Math.round(n * P.DT), stuck, cpuErrs: [...P.CPU.errs], hud: ended ? '' : (TT.WIZ_PHASES[phase].hudText ? TT.WIZ_PHASES[phase].hudText(st) : '') + ' oops ' + st.stats.oops.join('+') + '+' + st.stats.team + ' ' + JSON.stringify(st.stats.kinds) + (expr ? ' ' + (() => { try { const ph = st.ph; void ph; return JSON.stringify(eval(expr)); } catch (e) { return 'ERR ' + e.message; } })() : '') };
    }, { phase, hum, hid, seed, maxT, expr, logA, at });
    if (!r.ended || errs.length || r.cpuErrs.length) bad++;
    console.log(`${phase.padEnd(10)} ${hum.padEnd(5)} human=${['Pip', 'Bo'][hid]} s${seed}: ${r.ended ? 'ended ' + r.t + 's' : 'NOT ENDED [' + r.hud + ']'}  stuck ${r.stuck.length}${errs.length ? ' ERR ' + errs[0] : ''}${r.cpuErrs.length ? ' CPU ERR ' + r.cpuErrs.join(',') : ''}`);
    for (const s of r.stuck.slice(0, logA.length === 3 ? 400 : 4)) console.log('   ' + s);
  }
  await browser.close();
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
