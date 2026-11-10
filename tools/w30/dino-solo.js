#!/usr/bin/env node
// 30-1 The Time Thief, era 'dino' in 1-player mode: scripted "people" play one character and the computer the other.
// It tries to break the computer partner (and the era's rules) with people who behave oddly.
//   masher    holds right, taps the action twice a second, hops now and then (a keen small kid): the era must END
//   carrier   walks right and only ever presses the action while holding the egg (never smashes, never holds a vine):
//             the computer must take the clearing over (it tosses the egg to the person): the era must END
//   holder    never tosses the egg (never presses the action while holding it), does everything else: may stall at
//             the first ledge by design (the egg can't be taken away); must not crash, and gold hints must show
//   backward  walks left into the fire for ever: must NOT end
//   monkey    random presses for 3 minutes: no errors, no stuck state (NaN positions, players off the course)
//   leaver    plays like the masher for 25 s, then goes away for 40 s (the Thief waits, the computer too, the clock
//             stops), then comes back: the era must END
// Usage: node tools/w30/dino-solo.js [who,who] [--human=0|1|both] [--seeds=1,2] [--max=480]
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const ALL = ['masher', 'carrier', 'holder', 'backward', 'monkey', 'leaver'];
const whos = (args.find(a => !a.startsWith('--')) || ALL.join(',')).split(',').filter(w => ALL.includes(w));
const humans = opt('human', 'both') === 'both' ? [0, 1] : [+opt('human', 0)], seeds = opt('seeds', '1').split(',').map(Number), maxT = +opt('max', 480);
const MUST_END = { masher: true, carrier: true, leaver: true, backward: false };

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  await page.addInitScript(() => {
    const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    let seeded = gen(1); const other = gen(12345);
    window.__inStep = false; window.__seed = n => { seeded = gen((n >>> 0) || 1); };
    Math.random = () => (window.__inStep ? seeded() : other());
  });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.MODES && window.__pipbo.MODES.timethief);
  let bad = 0;
  for (const who of whos) for (const human of humans) for (const seed of seeds) {
    errors.length = 0;
    const r = await page.evaluate(({ who, human, seed, maxT }) => {
      const P = window.__pipbo, G = P.G, TT = P.MODES.timethief.test;
      window.__seed(seed * 7919 + human * 31); window.__inStep = true;
      P.cpuSetCfg('players', 1); P.cpuSetCfg('human', human); G.manual = true;
      P.CPU.errs.clear(); P.CPU.filter = null;
      TT.jump(0, {});
      const st = G.mst, ph = st.ph, p = G.players[human], steps = Math.round(maxT / P.DT);
      const prev = { jump: false, act: false }, said = new Set(), gold = new Set();
      let n = 0, ended = '', oddAt = '', t = 0, idleSeen = 0, cpuMovedWhileAway = 0;
      const rnd = () => Math.random();
      let hopT = 0, actT = 0, mk = { left: false, right: false, jump: false, down: false, act: false }, mkT = 0;
      const person = () => {
        const hold = ph.egg.state === 'held' && ph.egg.by === human;
        const o = { left: false, right: false, jump: false, down: false, act: false };
        hopT -= P.DT; actT -= P.DT;
        const masher = () => {
          o.right = true;
          if (actT <= 0) actT = 0.5; o.act = actT > 0.3;                 // two taps a second, each held 0.2 s
          if (hopT <= 0) hopT = 0.9 + rnd() * 0.8; o.jump = hopT < 0.35;  // a hop now and then
          if (hold && (ph.th.mode === 'aim' || ph.th.mode === 'dive') && rnd() < 0.7) { o.down = true; o.right = false; }
        };
        if (who === 'masher') masher();
        else if (who === 'leaver') { if (t < 25 || t > 65) masher(); }
        else if (who === 'carrier') {
          o.right = true;
          if (hold) { if (actT <= 0) actT = 0.8; o.act = actT > 0.6; if (ph.th.mode === 'aim' || ph.th.mode === 'dive') { o.down = true; o.right = false; } }
          else { if (hopT <= 0) hopT = 1.1; o.jump = hopT < 0.4; }      // free: just runs and jumps along
        } else if (who === 'holder') {
          o.right = true;
          if (!hold) { if (actT <= 0) actT = 0.5; o.act = actT > 0.3; if (hopT <= 0) hopT = 1.2; o.jump = hopT < 0.4; }
        } else if (who === 'backward') o.left = true;
        else if (who === 'monkey') {
          if ((mkT -= P.DT) <= 0) { mkT = 0.1 + rnd() * 0.7; mk = { left: rnd() < 0.3, right: rnd() < 0.55, jump: rnd() < 0.3, down: rnd() < 0.15, act: rnd() < 0.4 }; }
          Object.assign(o, mk);
        }
        return o;
      };
      const cpu = G.players[1 - human];
      while (n < steps && !ended) {
        const o = person(); t = n * P.DT;
        p.input.left = o.left && !o.right; p.input.right = o.right && !o.left; p.input.down = o.down; p.input.up = false; p.input.jump = o.jump; p.input.act = o.act;
        if (o.jump && !prev.jump) p.pendingJump = true;
        if (o.act && !prev.act) { p.pendingAct = true; p.actAge = 0; }
        prev.jump = o.jump; prev.act = o.act;
        const cx0 = cpu.x + st.cam.x;
        P.step(P.DT); n++;
        if (st.idle) { idleSeen += P.DT; if (Math.abs(cpu.x + st.cam.x - cx0) > 0.5 && cpu.grounded) cpuMovedWhileAway += P.DT; }
        for (const b of P.CPU.bubbles) if (b && b.t > 0) said.add(b.text);
        for (const h of st.stats.help) gold.add(h);
        for (const q of G.players) if (!isFinite(q.x) || !isFinite(q.y) || q.y + st.cam.y > 1400 || q.y + st.cam.y < -900) oddAt = oddAt || t.toFixed(1) + 's player ' + q.id + ' at ' + Math.round(q.x + st.cam.x) + ',' + Math.round(q.y + st.cam.y);
        if (G.mst !== st) { ended = 'restarted'; break; }
        if (st.cut) { ended = 'portal'; break; }
      }
      window.__inStep = false;
      const s = st.stats;
      return { ended, t: Math.round(st.phT), clock: Math.round(G.time), bumps: s.bumps.slice(), team: s.team, own: s.dino, help: [...gold], said: [...said], oddAt, idleSeen: Math.round(idleSeen), cpuMovedWhileAway: Math.round(cpuMovedWhileAway * 10) / 10,
        stretch: ph.k + 1, cpuErrs: [...P.CPU.errs], x: G.players.map(q => Math.round(q.x + st.cam.x)) };
    }, { who, human, seed, maxT });
    const want = MUST_END[who];
    let ok = !r.oddAt && !r.cpuErrs.length && !errors.length && (want === undefined || want === !!r.ended);
    if (who === 'leaver' && (r.idleSeen < 20 || r.cpuMovedWhileAway > 1.5)) ok = false;
    if (!ok) bad++;
    console.log(`${who.padEnd(9)} person=${human ? 'Bo ' : 'Pip'} s${seed}  ${(r.ended || 'not ended').padEnd(9)} ${String(r.t).padStart(4)}s  stretch ${r.stretch}  bumps ${r.bumps.join('+')}+${r.team}  help ${r.help.length}  tosses ${r.own.tosses || 0} smashed ${r.own.smashed || 0}` +
      (who === 'leaver' ? `  away ${r.idleSeen}s (cpu moved ${r.cpuMovedWhileAway}s)` : '') + `  ${ok ? 'ok' : 'FAIL'}${r.oddAt ? ' ODD ' + r.oddAt : ''}${r.cpuErrs.length ? ' CPU ERR ' + r.cpuErrs.join(',') : ''}${errors.length ? ' PAGE ERR ' + errors.slice(0, 3).join(' | ').slice(0, 300) : ''}`);
    if (args.includes('--say')) console.log('     said: ' + r.said.join(' | ') + '\n     gold: ' + r.help.join(' | '));
  }
  await browser.close();
  console.log(bad ? 'FAILED: ' + bad : 'ALL OK');
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
