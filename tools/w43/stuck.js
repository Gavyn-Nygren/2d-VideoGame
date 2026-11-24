#!/usr/bin/env node
// 43-1 Coin Drop: partners who are not the computer, beside the computer (drawing off). Each persona is the
// computer's own brain made worse in one plain way (late, patchy, never jumping...) or a fixed bad habit, in one seat;
// the real brain rides the other. It shows whether anyone can send the pair round the same checkpoint for ever (gold
// help must come after three restarts there), whether the ride always ends, and what the medals look like.
//   node tools/w43/stuck.js [persona ...] [--seat=0|1]
// personas: good  late (0.3 s behind)  kid (0.5 s behind, looks away for a second now and then)  slow (0.8 s)
//           nojump  holdL (holds left all ride)  mash (random presses)  idle (presses nothing: the computer waits)
'use strict';
const path = require('path'); const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const all = ['good', 'late', 'kid', 'slow', 'nojump', 'holdL', 'mash', 'idle'];
const who = args.filter(a => !a.startsWith('--')); const list = who.length ? who : all; const seat = +opt('seat', 0);
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader'] });
  const pg = await b.newPage(); const errs = [];
  pg.on('pageerror', e => errs.push(String(e.stack || e)));
  await pg.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await pg.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  await pg.evaluate(() => window.__pipbo.K3D.need());
  let bad = 0;
  for (const persona of list) {
    const r = await pg.evaluate(async ({ persona, seat }) => {
      const P = window.__pipbo, G = P.G;
      const i = P.LEVELS.findIndex(l => l.mode === 'arcadecoin');
      G.manual = true; P.K3D.noRender = true;
      G.cpuOn = persona === 'idle' ? [seat === 1, seat === 0] : [true, true];
      let sd = 7; const rnd = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
      const delay = { good: 0.12, late: 0.3, kid: 0.5, slow: 0.8 }[persona] || 0.12, queue = []; let clock = 0, away = 0, mashOut = {};
      P.CPU.filter = (p, out, dt) => {
        if (p.id !== seat) return out;
        if (p.id === 0) clock += dt;
        if (persona === 'holdL') return { left: true };
        if (persona === 'mash') { if (rnd() < 0.08) mashOut = { left: rnd() < 0.4, right: rnd() < 0.4, jump: rnd() < 0.3 ? 'tap' : false }; return mashOut; }
        if (persona === 'nojump') { const o = Object.assign({}, out); delete o.jump; return o; }
        queue.push({ t: clock, out });
        while (queue.length > 1 && queue[1].t <= clock - delay) queue.shift();
        let o = queue[0].t <= clock - delay ? queue[0].out : {};
        if (persona === 'kid') { if (away > 0) { away -= dt; o = {}; } else if (rnd() < dt / 12) away = 1.0; }
        return o;
      };
      P.loadLevel(i);
      const st = G.mst; st.phaseT = ARCADECOIN.S.INTRO_T;
      let n = 0, done = false; const seen = new Set(), log = [];
      for (; n < 120 * 900; n++) {
        if (persona === 'idle') for (const k in G.players[seat].input) G.players[seat].input[k] = false;
        P.step(P.DT);
        for (let j = Math.max(0, st.fx.length - 4); j < st.fx.length; j++) { const f = st.fx[j]; if ((f.k === 'wipe' || f.k === 'restart') && !seen.has(f)) { seen.add(f); log.push(f); } }
        if (st.finished || G.mode !== 'play') { done = true; break; }
        if (n % 4000 === 0) await new Promise(res => setTimeout(res, 0));
      }
      P.CPU.filter = null;
      const why = {}; log.filter(f => f.k === 'wipe').forEach(f => { const k = (f.id === seat ? 'them:' : 'cpu:') + f.why; why[k] = (why[k] || 0) + 1; });
      const v = MODES.arcadecoin.medalValues(), M = MODES.arcadecoin.medals;
      const medal = !done ? 'none' : (v.coins >= M.goals[0].gold && v.wipes <= M.goals[1].gold) ? 'gold' : (v.coins >= M.goals[0].silver && v.wipes <= M.goals[1].silver) ? 'silver' : 'bronze';
      return { persona, done, t: +st.t.toFixed(0), s: +st.s.toFixed(0), coins: (v.coins * 100).toFixed(0) + '%', sweeps: st.sweeps, wipes: st.wipes, restarts: st.restarts, gold: st.goldN, rescues: st.rescues, snaps: st.arc.snaps, medal, why };
    }, { persona, seat });
    console.log(JSON.stringify(r));
    if (!r.done && persona !== 'idle') bad++;
  }
  if (errs.length) console.log('page errors:\n' + errs.slice(0, 8).join('\n'));
  await b.close(); process.exit(bad || errs.length ? 1 : 0);
})();
