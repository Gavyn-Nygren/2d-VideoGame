#!/usr/bin/env node
// 43-2 Pinball Panic: gate tests (no drawing, no computer players: two scripted people through the real rules).
// A gate must not be passable without the partner's switch, and no pair of positions may leave both balls on one
// side of the table for good. Added by the review after it found a hop over a spinner gap and a second ride over a
// crossing that left both balls in one lane.
//   node tools/w43/pinball-gates.js [--only=hopgap,pushgap,hopdrain,cross,crossok,lever,kerb,walls]
//   hopgap    a lone ball tries to hop a spinner gap with no bridge, from every take-off point at a full run
//   pushgap   two balls in one lane, one shoving the other at the gap: neither may get across
//   hopdrain  the same hop over the outlane strip under the backboard's spinner bridge
//   cross     Pip rides the first crossing; Bo then comes round to the same kicker: it must refuse him (and say why),
//             and the other kicker must still take him
//   crossok   both take their own crossing at the same moment and one after the other: both must fire
//   lever     Pip waits on the detour lever BEFORE Bo reaches the button: the gate must open as soon as Bo is on it
//   kerb      leaning on the low kerb with no run-up and hopping gets over it (both ways, full and gentle push)
//   walls     a lone ball runs and hops flat out at every gate, staircase and ledge in the level: never past one
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const only = opt('only', '').split(',').filter(Boolean);
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const out = await page.evaluate(only => {
    const P = window.__pipbo, G = P.G, K3D = P.K3D, DT = P.DT;
    const i = P.LEVELS.findIndex(l => l.mode === 'arcadepinball');
    G.manual = true; K3D.noRender = true; G.cpuOn = [false, false];
    const CO = PINBALL, TB = PINBALL_TABLE, hyp = Math.hypot;
    Sfx.play = () => {};
    const checks = [], want = (name, ok, got) => checks.push({ name, ok: !!ok, got });
    let st;
    // a fresh table with everything below section `sec` done, both balls placed, no hazards running
    const fresh = (sec, a, b) => {
      P.loadLevel(i); G.introT = 0; st = G.mst; st.phase = 'play'; st.phaseT = 0;
      const s0 = TB.sections[sec];
      for (const g of TB.gates) if (g.d < s0.d0) st.gate[g.id].latched = true;
      for (const s of TB.stairs) if (s.steps[0] < s0.d0) st.stairs[s.id].latched = true;
      for (const f of TB.flippers) if (TB.byId[f.cradle].d < s0.d0) st.ledge[f.id].latched = true;
      for (const br of TB.bridges) if (br.d0 < s0.d0) st.bridge[br.id].latched = true;
      TB.tilts.forEach((tl, k) => { st.tilt.done[k] = true; });
      [a, b].forEach((q, k) => Object.assign(st.balls[k], { x: q[0], d: q[1], vx: 0, vd: 0, sec, lane: q[0] < 0 ? -1 : 1 }));
      st.both = sec;
      for (const p of G.players) { p.input = {}; p.pendingJump = false; }
    };
    const quiet = () => { st.loose.length = 0; for (const m of st.magnets) m.cool = 9; st.wind = 0; };
    const press = (k, ax, ay, hop) => { const p = G.players[k]; p.input = { ax, ay }; if (hop) p.pendingJump = true; };
    const step = () => { quiet(); P.step(DT); };
    const run = (name, fn) => { if (only.length && !only.includes(name)) return; try { fn(); } catch (e) { want(name + ': ran', false, String(e && e.stack || e)); } };

    // a lone ball runs up a lane and hops at take-off point `at`; returns how far up it got
    const hopOver = (sec, lane, x, from, at, until, secs = 6) => {
      fresh(sec, lane < 0 ? [x, from] : [-4, from], lane < 0 ? [4, from] : [x, from]);
      const k = lane < 0 ? 0 : 1, b = st.balls[k];
      let top = b.d, hopped = false;
      for (let n = 0; n < secs / DT; n++) {
        const go = !hopped && b.d >= at; if (go) hopped = true;
        press(k, 0, -1, go || (hopped && !b.air && b.d < until)); press(1 - k, 0, 0);
        step();
        if (b.mode === 'roll' && !b.air) top = Math.max(top, b.d);
      }
      return top;
    };
    run('hopgap', () => {
      for (const br of TB.bridges.filter(q => TB.holes.find(h => h.bridge === q.id).kind === 'gap')) {
        let worst = 0, where = 0;
        for (let at = br.d0 - 3; at <= br.d0 + 0.6; at += 0.05) { const top = hopOver(TB.secAt(br.d0).i, br.lane, br.lane * 4, br.d0 - 8, at, br.d1 + 1); if (top > worst) { worst = top; where = at; } }
        want('hopgap: ' + br.id + ' cannot be hopped with no bridge (never lands past ' + br.d1 + ')', worst < br.d1, +worst.toFixed(2) + ' from ' + where.toFixed(2));
      }
    });
    run('hopdrain', () => {
      for (const br of TB.bridges.filter(q => TB.holes.find(h => h.bridge === q.id).kind === 'drain')) {
        let worst = 0;
        st = null;
        for (let at = br.d0 - 3; at <= br.d0 + 0.6; at += 0.05) {
          fresh(TB.secAt(br.d0).i, [-4.5, 328.2], [4.2, br.d0 - 6]);
          const b = st.balls[1]; let top = 0, hopped = false;
          for (let n = 0; n < 5 / DT; n++) { const go = !hopped && b.d >= at; if (go) hopped = true; press(1, 0, -1, go); press(0, 0, 0); step(); if (b.mode === 'roll' && !b.air && b.d < 345) top = Math.max(top, b.d); }
          worst = Math.max(worst, top);
        }
        want('hopdrain: ' + br.id + ' cannot be hopped with no bridge (never lands past ' + br.d1 + ')', worst < br.d1, +worst.toFixed(2));
      }
    });
    run('pushgap', () => {
      const br = TB.byId.bR; let worst = 0, where = '';
      for (const gap of [1.85, 2.2, 3]) for (const x of [2.5, 4, 5.5]) {
        fresh(TB.secAt(br.d0).i, [x, br.d0 - 7 - gap], [x, br.d0 - 7]);
        for (let n = 0; n < 8 / DT; n++) { press(0, 0, -1); press(1, 0, -0.6); step(); for (const b of st.balls) if (b.mode === 'roll' && !b.air && b.x > 0 && b.d > worst) { worst = b.d; where = 'x ' + x + ' gap ' + gap + ' at ' + (n * DT).toFixed(1) + ' s'; } }
      }
      want('pushgap: two balls shoving each other never cross a gap with no bridge', worst < br.d1, +worst.toFixed(2) + ' ' + where);
    });
    run('cross', () => {
      for (const [ka, kb] of [['crossA', 'crossB'], ['crossC', 'crossD']]) {
        const A = TB.byId[ka], B2 = TB.byId[kb], sec = TB.secAt(A.d).i;
        // Pip (left) rides over to the right
        fresh(sec, [A.x, A.d - 2], [B2.x, A.d - 6]);
        for (let n = 0; n < 6 / DT; n++) { press(0, 0, st.balls[0].d < A.d + 4 ? -1 : -0.3); press(1, 0, 0); step(); }
        const pipOver = st.balls[0].x > 0 && st.balls[0].d > A.d + 3;
        // Bo now sits on the SAME kicker (as if he had come round to the left): it must not take him
        Object.assign(st.balls[1], { x: A.x, d: A.d - 1.5, vx: 0, vd: 0, mode: 'roll', air: false, h: 0 });
        let rode = false;
        for (let n = 0; n < 5 / DT; n++) { press(1, 0, st.balls[1].d < A.d ? -0.6 : -0.25); press(0, 0, -0.3); step(); if (st.balls[1].mode === 'kick' || st.balls[1].mode === 'ride') rode = true; }
        want('cross: ' + ka + ' refuses the second ball once the first is over (both would be in one lane for good)', pipOver && !rode, 'first over ' + pipOver + ', second taken ' + rode);
        want('cross: ' + ka + ' says why', A._why === 'lane', A._why);
        // and his own kicker still takes him
        Object.assign(st.balls[1], { x: B2.x, d: B2.d - 1.5, vx: 0, vd: 0, mode: 'roll', air: false, h: 0 });
        for (let n = 0; n < 6 / DT; n++) { press(1, 0, st.balls[1].d < B2.d + 4 ? -0.8 : -0.3); press(0, 0, -0.3); step(); }
        want('cross: ' + kb + ' still takes the second ball to the free lane', st.balls[1].x < 0 && st.balls[1].d > B2.d + 3 && st.balls[0].x > 0, st.balls.map(b => b.x.toFixed(1) + ',' + b.d.toFixed(1)).join(' '));
      }
    });
    run('crossok', () => {
      const A = TB.byId.crossA, B2 = TB.byId.crossB;
      for (const lag of [0, 0.5, 1.2, 2.5]) {
        fresh(TB.secAt(A.d).i, [A.x, A.d - 2], [B2.x, A.d - 2]);
        for (let n = 0; n < 9 / DT; n++) { const t = n * DT; press(0, 0, st.balls[0].d < A.d + 4 ? -1 : -0.3); press(1, 0, t < lag ? 0.18 : st.balls[1].d < A.d + 4 ? -1 : -0.3); step(); }
        want('crossok: both cross when the second starts ' + lag + ' s later', st.balls[0].x > 0 && st.balls[1].x < 0 && st.balls.every(b => b.d > A.d + 3), st.balls.map(b => b.x.toFixed(1) + ',' + b.d.toFixed(1)).join(' '));
      }
    });
    run('lever', () => {
      const lev = TB.byId.lever, bt = TB.byId.btnD;
      fresh(TB.secAt(lev.d).i, [lev.x + 1.6, lev.d - 0.6], [bt.x, bt.d - 5]);
      // Pip rolls onto the lever and stays; Bo arrives on the button two seconds later
      for (let n = 0; n < 7 / DT; n++) {
        const a = st.balls[0], c = st.balls[1], t = n * DT;
        press(0, Math.sign(lev.x - a.x) * Math.min(1, Math.abs(lev.x - a.x)), -Math.max(-1, Math.min(1, (lev.d - a.d) * 1.2)) - 0.18);
        press(1, 0, t < 2 ? 0.18 : -Math.max(-1, Math.min(1, (bt.d - c.d) * 1.2)) - 0.18);
        step();
      }
      want('lever: opens for a ball already waiting on it when the button is pressed', st.gate.gDet.latched, st.gate.gDet.latched);
    });
    run('kerb', () => {
      const kerb = TB.walls.find(w => w.kind === 'kerb'), kd = kerb.a[1];
      for (const [push, name] of [[1, 'a full push'], [0.6, 'a gentle push']]) for (const dir of [1, -1]) {
        // lean on the kerb for a second (no run-up), then hop
        fresh(0, [-4.5, kd - dir * 2.2], [4.5, 3]);
        const b = st.balls[0]; let n = 0;
        for (; n < 1.2 / DT; n++) { press(0, 0, -dir * push); press(1, 0, 0); step(); }
        const rest = b.d; let tries = 0, over = false, maxMove = 0;
        for (; n < 4 / DT && !over; n++) {
          const hop = !b.air && tries < 2 && (n % 30 === 0); if (hop) tries++;
          const pd = b.d; press(0, 0, -dir * push, hop); press(1, 0, 0); step();
          maxMove = Math.max(maxMove, Math.abs(b.d - pd));
          over = !b.air && (b.d - kd) * dir > 0.9;
        }
        want('kerb: ' + name + ' and a hop from a standstill against it gets over it, going ' + (dir > 0 ? 'up' : 'down'), over && tries === 1, (over ? 'over' : 'not over') + ' in ' + tries + ' hop(s), rested at ' + rest.toFixed(2) + ', biggest frame move ' + maxMove.toFixed(3));
        want('kerb: no snap going over (' + name + ', ' + (dir > 0 ? 'up' : 'down') + ', frame move < 0.2)', maxMove < 0.2, +maxMove.toFixed(3));
      }
      // and without a hop it stays solid
      fresh(0, [-4.5, kd - 3], [4.5, 3]);
      for (let n = 0; n < 3 / DT; n++) { press(0, 0, -1); press(1, 0, 0); step(); }
      want('kerb: still stops a ball that does not hop', st.balls[0].d < kd, +st.balls[0].d.toFixed(2));
    });
    run('walls', () => {
      const bad = [];
      const tryAt = (name, lane, d, sec, rw) => {
        let worst = 0;
        for (const x of [lane * 2.2, lane * 4.5, lane * (rw - 1.6)]) for (let at = d - 3; at <= d - 0.8; at += 0.25) worst = Math.max(worst, hopOver(sec, lane, x, d - 7, at, d + 1, 4));
        if (worst > d + 0.5) bad.push(name + ' ' + worst.toFixed(1));
      };
      for (const g of TB.gates) tryAt(g.id, g.lane, g.d, TB.secAt(g.d - 1).i, g.rail || 9);
      for (const s of TB.stairs) tryAt(s.id, s.lane, s.steps[0], TB.secAt(s.steps[0] - 1).i, 9);
      for (const f of TB.flippers) { const c = TB.byId[f.cradle]; tryAt(f.id, c.lane, c.d + 3, TB.secAt(c.d).i, 9); }
      want('walls: no gate, staircase or ledge is passed by running and hopping at it alone', !bad.length, bad.join(', ') || 'none');
    });
    return checks;
  }, only);
  let bad = 0;
  for (const c of out) { if (!c.ok) bad++; console.log((c.ok ? ' ok  ' : ' BAD ') + c.name.padEnd(100) + ' got ' + c.got); }
  if (errors.length) { console.log('PAGE ERR ' + errors.slice(0, 3).join(' | ')); bad++; }
  console.log(bad ? bad + ' FAILED' : 'all ' + out.length + ' gate checks pass');
  await browser.close();
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
