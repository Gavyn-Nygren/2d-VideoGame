#!/usr/bin/env node
// 41-4 Paper Alien Invasion: person-like partners for the computer (drawing off). Unlike popaliens-play.js (where the
// "person" is the computer's own brain with a filter on its presses), these are simple scripted people who do NOT
// think like the computer: they walk in the 8 keyboard directions, aim the way a keyboard player has to (stop and let
// the hero turn, or line up and shoot straight), react late, and each has one bad habit. They find the places where a
// real person could lock the level or make the computer shake or stand about.
// Usage: node tools/w41/popaliens-stuck.js [person ...] [--side=0|1|both] [--ck=N] [--max=900] [--trace=5]
//   kid        the plain one: walks up the page through the gaps, stops when an alien is within 11, lets the hero turn
//              to it, holds fire, backs off from a close one, peels the partner, throws a grenade at a crowd and under
//              the hiding Walker, never reloads by hand, fires 0.35 s late and never dodges anything
//   holdfire   the fire button is held down from start to finish (so the aim never leaves "up the page"): lines up
//              under an alien and walks on when the lane is clear. Never throws a grenade.
//   rusher     never stops to shoot: walks on, firing the way they walk
//   edge       as kid, but walks along the left edge of the page wherever there is a way through there
//   sameside   as kid, but always stands right beside the computer (so they are never on two sides of anything)
//   backpedal  as kid, but runs to the bottom of the screen whenever an alien is within 9
//   hog        as kid, but picks up every grenade and never throws one (the Walker's last layer must not lock)
//   nogren     as kid, but never picks a grenade up on purpose and never throws
//   nopeel     as kid, but never peels the computer up
//   inkwader   as kid, but walks straight up the middle of the Ink Crater instead of the dry path
//   breaks     as kid, but takes their hands off for 9 s in every 30
//   nohatch    as kid, but stands on the hatch without holding reload
//   offhatch   as kid, but never steps on the hatch (cannot clear; the computer must not shake)
// Prints for each: cleared or where it ended, time left, Wipe-outs, rescues, how often each was flattened, peels, the
// longest wait with no progress outside a blockade or the boss, the longest the person lay flattened before a peel,
// the computer's worst second of stick reversals (more than 6 is shaking), and any errors.
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const ALL = ['kid', 'holdfire', 'rusher', 'edge', 'sameside', 'backpedal', 'hog', 'nogren', 'nopeel', 'inkwader', 'breaks', 'nohatch', 'offhatch'];
const people = args.filter(a => !a.startsWith('--')); if (!people.length) people.push(...ALL);
const sides = opt('side', '0') === 'both' ? [0, 1] : [+opt('side', 0)];
const maxT = +opt('max', 900), ck = +opt('ck', 0), trace = +opt('trace', 0);
const js = opt('js', ''); // with --dbg: an expression of (st, cpu, me, G) printed on each debug line
const dbg = opt('dbg', '') ? opt('dbg', '').split(',').map(Number) : null; // --dbg=from,to[,every]: the computer's stick and the aliens, step by step

function pageRun({ who, side, maxT, ck, trace, dbg, js }) {
  const jsf = js ? new Function('st', 'cpu', 'me', 'G', 'return (' + js + ')') : null;
  const P = window.__pipbo, G = P.G, K3D = P.K3D, hyp = Math.hypot;
  const i = P.LEVELS.findIndex(l => l.mode === 'popaliens');
  G.manual = true; K3D.noRender = true;
  P.CPU.errs && P.CPU.errs.clear && P.CPU.errs.clear(); P.CPU.filter = null;
  G.cpuOn = side === 0 ? [false, true] : [true, false];
  delete G.results[i];
  P.loadLevel(i); G.introT = 0;
  const st = G.mst, me = G.players[side], cpu = G.players[1 - side], R = PA_ROUTE;
  if (ck) { st.phase = 'march'; st.marchT = 0; st.ck = ck; st.saved = { i: ck, gren: [1, 1], walkerPhase: 0 }; R.events.forEach((ev, j) => { if (ev.block && ev.at > R.checks[ck].cz) st.wallDown[j] = true; }); st.clock = Math.max(150, 600 - ck * 26); paRestore(st, 'wipe'); st.wipes = 0; }
  const base = who;
  // what the person decided 0.35 s ago is what their hands do now
  const LAG = Math.round(0.35 / P.DT), q = [];
  const mem = { aimT: 0, fireT: 0, breakT: 0, t: 0, prev: {}, lookT: 0, throwT: 0 };
  const dirs = (dx, dz, o) => { // the 8 keyboard directions toward (dx, dz)
    const a = Math.atan2(dx, -dz), k = Math.round(a / (Math.PI / 4));
    const m = ((k % 8) + 8) % 8;
    o.up = m === 0 || m === 1 || m === 7; o.down = m === 3 || m === 4 || m === 5; o.right = m === 1 || m === 2 || m === 3; o.left = m === 5 || m === 6 || m === 7;
  };
  // the way through the next wall of print or card ahead, by eye: the nearest gap to where they are (or to the edge)
  const gapAhead = (b, preferX) => {
    let L = null;
    for (const l of R.lines) if (l.z < b.z + l.hd + 0.3 && b.z - l.z < 9 && (!L || l.z > L.z)) L = l;
    if (!L) return null;
    let g = null, gs = 1e9;
    for (const [g0, g1] of L.gaps) { const a = Math.max(g0, -14.4), c = Math.min(g1, 14.4); if (c - a < 1) continue; const gx = (a + c) / 2, s = Math.abs(gx - (preferX == null ? b.x : preferX)); if (s < gs) { gs = s; g = [a, c, gx]; } }
    return g ? { L, x0: g[0], x1: g[1], gx: g[2] } : null;
  };
  function decide(dt) {
    const o = { up: false, down: false, left: false, right: false, jump: false, act: false, act2: false, act3: false };
    const b = me.b3, cb = cpu.b3, h = st.h[side], ch = st.h[1 - side];
    mem.t += dt;
    if (st.phase !== 'march' || h.flat) { if (st.phase === 'shrink' && mem.t > 1) o.jump = true; return o; }
    if (who === 'breaks' && mem.t % 30 > 21) return o;
    if (who === 'holdfire') o.act = true;
    const live = st.aliens.filter(a => a.st === 'live' && !(a.perch && a.st2 === 'back'));
    let near = null, nd = 1e9;
    for (const a of live) { const d = hyp(a.x - b.x, a.z - b.z); if (d < nd && a.z < b.z + 4) { nd = d; near = a; } }
    const W = st.walker && st.walker.state !== 'gone' && st.walker.state !== 'fold' ? st.walker : null;
    const walkTo = (x, z, stop = 0.5) => { const dx = x - b.x, dz = z - b.z; if (hyp(dx, dz) > stop) dirs(dx, dz, o); return hyp(dx, dz) <= stop; };
    // the hatch
    if (st.hatch) {
      if (who === 'offhatch') { walkTo(st.hatch.x + 5, st.hatch.z + 4); return o; }
      const on = walkTo(st.hatch.x + (side ? 0.5 : -0.5), st.hatch.z, 0.5);
      if (on && who !== 'nohatch') o.act3 = true;
      return o;
    }
    // a flattened partner
    if (ch.flat && who !== 'nopeel' && who !== 'rusher' && who !== 'holdfire') {
      if (hyp(cb.x - b.x, cb.z - b.z) < 1.2) o.act3 = true; else walkTo(cb.x, cb.z, 0.9);
      return o;
    }
    // jump a hole just ahead (they see holes; they never dodge shadows, rings or dive lines)
    const hole = st.holes.some(ho => G.time > ho.open - 0.3 && G.time < ho.gone && b.x > ho.x0 - 0.4 && b.x < ho.x1 + 0.4 && b.z - ho.z > 0 && b.z - ho.z < ho.hw + 1.3);
    // where to walk when nothing is in the way
    // sameside: if they cannot get to the computer's side (something is in the way) for 2 s, they give up and walk
    // on by themselves for 3 s
    if (who === 'sameside') {
      if (!mem.ss) mem.ss = { x: b.x, z: b.z, t: 0, free: 0 };
      if (hyp(b.x - mem.ss.x, b.z - mem.ss.z) > 0.4) { mem.ss.x = b.x; mem.ss.z = b.z; mem.ss.t = 0; } else mem.ss.t += dt;
      if (mem.ss.t > 2 && hyp(cb.x - b.x, cb.z - b.z) > 2) { mem.ss.free = 3; mem.ss.t = 0; }
      mem.ss.free -= dt;
    }
    const beside = who === 'sameside' && !(mem.ss.free > 0);
    const march = () => {
      let px = who === 'edge' ? -13 : beside ? cb.x + (side ? 1.2 : -1.2) : null;
      if (beside && hyp(cb.x - b.x, cb.z - b.z) > 2 && !R.lines.some(l => (l.z - b.z) * (l.z - cb.z) < 0)) { walkTo(cb.x + (side ? 1.2 : -1.2), cb.z, 0.6); return; }
      const g = gapAhead(b, px);
      // (a person lets go of a key a moment early: they judge by where they will be when their hands catch up)
      const bx = b.x;
      if (g && (bx < g.x0 + 0.45 || bx > g.x1 - 0.45) && b.z > g.L.z - g.L.hd - 0.3) {
        // not lined up with the gap: sideways along the street to it (a step back first if pressed against the wall)
        if (b.z - g.L.z < g.L.hd + 0.9) { o.down = true; }
        if (g.gx > bx) o.right = true; else o.left = true;
        return;
      }
      // the crater: keep to the dry path (inkwader does not)
      if (who !== 'inkwader' && b.z < -322 && b.z > -478) { const tx = R.ink.pathX(b.z - 2); if (Math.abs(tx - b.x) > 1.2) { if (tx > b.x) o.right = true; else o.left = true; } }
      else if (px != null && !g && Math.abs(px - b.x) > 1) { if (px > b.x) o.right = true; else o.left = true; }
      o.up = true;
      if (hole) o.jump = true;
      // walked into something (a pencil note, a crumb, the big capital letter) and stopped: hop, and if that does not
      // do it, walk round it toward the middle of the page for a second
      if (mem.roundT > 0) { mem.roundT -= dt; o.up = mem.roundT < 0.25; o.right = b.x < 0; o.left = !o.right; return; }
      if (Math.hypot(b.vx, b.vz) < 0.5 && b.ground) mem.bumpT = (mem.bumpT || 0) + dt; else if (b.ground) mem.bumpT = 0;
      if (mem.bumpT > 0.5) o.jump = true;
      if (mem.bumpT > 1.2) { mem.bumpT = 0; mem.roundT = 1; }
    };
    // grenades (not hog's or nogren's throwing)
    const canThrow = h.gren > 0 && who !== 'hog' && who !== 'nogren' && who !== 'holdfire' && mem.throwT <= 0;
    mem.throwT -= dt;
    if (W && W.state === 'crouch') {
      if (canThrow) {
        // walk to straight below it, about 8 away, then walk up at it and throw on the way
        if (!mem.thr) { if (walkTo(W.x, W.z + 8.3, 0.4)) mem.thr = true; }
        else { o.up = true; if (b.z < W.z + 7.3) { o.act2 = true; mem.throwT = 1.5; mem.thr = false; } if (Math.abs(b.x - W.x) > 1.5) mem.thr = false; }
        return o;
      }
      // none to throw: fetch one lying about (nogren just waits near it)
      const g = who !== 'nogren' && h.gren < 3 && st.pickups.filter(p => p.live && paReach(st, p)).sort((u, v) => hyp(u.x - b.x, u.z - b.z) - hyp(v.x - b.x, v.z - b.z))[0];
      // (waiting there they keep trying their gun on it now and then, as people do: a person who presses nothing
      // at all for 30 s is 'away', and the computer waits for them by design)
      if (g) walkTo(g.x, g.z, 0.3); else if (walkTo(W.x - 4, W.z + 7, 1)) o.act = mem.t % 3 < 1.5;
      return o;
    }
    if (who === 'hog') { const g = h.gren < 3 && st.pickups.filter(p => p.live && hyp(p.x - b.x, p.z - b.z) < 12 && p.z < st.cz + 5)[0]; if (g && nd > 5) { walkTo(g.x, g.z, 0.3); return o; } }
    if (who === 'rusher') { march(); o.act = !o.left && !o.right; return o; }
    if (who === 'holdfire') {
      // line up under the nearest alien ahead and let the stream of bolts do the rest
      const lane = live.filter(a => a.z < b.z - 1 && b.z - a.z < 14).sort((u, v) => (b.z - u.z) - (b.z - v.z))[0];
      if (lane) { const bx = b.x; if (Math.abs(lane.x - bx) > 0.35) { if (lane.x > bx) o.right = true; else o.left = true; } if (b.z - lane.z < 3) o.down = true; return o; }
      if (W) { if (Math.abs(W.x - b.x) > 1) { if (W.x > b.x) o.right = true; else o.left = true; } if (b.z - W.z < 5) o.down = true; else if (b.z - W.z > 9) o.up = true; return o; }
      march(); return o;
    }
    if (who === 'backpedal' && near && nd < 9 && b.z < st.cz + PA.backWall - 0.5) { o.down = true; o.act = mem.fireT > 0; mem.fireT -= dt; if (mem.fireT < -0.6) mem.fireT = 1.5; return o; }
    // the Walker: walk toward it a moment (to face it), then hold fire; stand about 8 off
    if (W && (!near || nd > 6)) {
      const d = hyp(W.x - b.x, W.z - b.z);
      mem.lookT -= dt;
      if (mem.lookT <= -2.2) mem.lookT = 0.35;
      if (beside && hyp(cb.x - b.x, cb.z - b.z) > 2.5 && !R.lines.some(l => (l.z - b.z) * (l.z - cb.z) < 0)) { walkTo(cb.x + (side ? 1.2 : -1.2), cb.z, 0.6); return o; }
      if (mem.lookT > 0) { if (d > 5) dirs(W.x - b.x, W.z - b.z, o); else dirs(b.x - W.x, b.z - W.z, o); }
      else { o.act = true; if (d > 11) dirs(W.x - b.x, W.z - b.z, o); if (W.line && W.line.t > 0.8 && b.z - W.line.z > -0.2 && b.z - W.line.z < 1.3) o.jump = true; }
      return o;
    }
    if (near && nd < 11) {
      if (canThrow && live.filter(a => hyp(a.x - near.x, a.z - near.z) < 3).length >= 4 && nd > 4 && nd < 9) { o.act2 = true; mem.throwT = 2; }
      // stop, let the hero turn to it (hands off for 0.8 s), then hold fire for 2 s; back off from a close one
      mem.aimT += dt;
      const cyc = mem.aimT % 2.8;
      if (cyc > 0.8) o.act = true;
      if (nd < 2.6) o.down = true;
      return o;
    }
    mem.aimT = 0;
    march();
    return o;
  }
  // measures
  let k = 0, still = 0, lastCz = st.cz, maxStill = 0, err = null, lay = 0, maxLay = 0, stillAt = 0, layAt = 0;
  const flats = [0, 0], wasFlat = [false, false];
  const rev = [], prevS = { x: 0, y: 0 }; let worstRev = 0, revAt = 0;
  const log = [];
  const n = Math.round(maxT / P.DT);
  try {
    for (; k < n; k++) {
      if (G.mode !== 'play') break;
      // their feet go where they mean them to (people steer ahead of themselves); their trigger fingers are 0.35 s late
      const now = decide(P.DT); q.push(now);
      const o = q.length > LAG ? q.shift() : { };
      const inp = me.input;
      for (const key of ['up', 'down', 'left', 'right', 'jump']) inp[key] = !!now[key];
      for (const key of ['act', 'act2', 'act3']) inp[key] = !!o[key];
      inp.ax = 0; inp.ay = 0;
      if (inp.jump && !mem.prev.jump) me.pendingJump = true;
      if (inp.act && !mem.prev.act) me.pendingAct = true;
      if (inp.act2 && !mem.prev.act2) me.pendingAct2 = true;
      if (inp.act3 && !mem.prev.act3) me.pendingAct3 = true;
      mem.prev = { jump: inp.jump, act: inp.act, act2: inp.act2, act3: inp.act3 };
      P.step(P.DT);
      const t = k * P.DT;
      const boss = st.walker && st.walker.state !== 'gone';
      if (st.cz < lastCz - 0.01 || st.block || boss || st.phase !== 'march') { lastCz = st.cz; still = 0; } else still += P.DT;
      if (still > maxStill) { maxStill = still; stillAt = st.cz; }
      for (const j of [0, 1]) { const f = !!st.h[j].flat; if (f && !wasFlat[j]) { flats[j]++; if (trace && log.length < 400) log.push(`${t.toFixed(1)}s ${j === side ? 'person' : 'cpu'} flat by ${st.h[j].flat.why} at z ${G.players[j].b3.z.toFixed(0)}`); } wasFlat[j] = f; }
      if (st.h[side].flat && !st.h[1 - side].flat) { lay += P.DT; if (lay > maxLay) { maxLay = lay; layAt = +t.toFixed(0); } } else lay = 0;
      // the computer's stick: sign flips per rolling second
      // (a reversal is a real one: the push swings round by more than about 100 degrees; a weave to one side is not)
      const ci = cpu.input, cm = Math.hypot(ci.ax || 0, ci.ay || 0);
      if (cm > 0.3) {
        const ca = Math.atan2(ci.ay, ci.ax);
        if (prevS.a != null) { let dA = Math.abs(ca - prevS.a); if (dA > Math.PI) dA = 2 * Math.PI - dA; if (dA > 1.7) rev.push(t); }
        prevS.a = ca;
      }
      while (rev.length && rev[0] < t - 1) rev.shift();
      if (rev.length > worstRev) { worstRev = rev.length; revAt = +t.toFixed(1); }
      if (dbg && t >= dbg[0] && t <= dbg[1] && k % Math.round((dbg[2] || 0.25) / P.DT) === 0) log.push(`  ${t.toFixed(2)} cpu ${cpu.b3.x.toFixed(2)},${cpu.b3.z.toFixed(2)} stick ${(ci.ax || 0).toFixed(2)},${(ci.ay || 0).toFixed(2)} act ${+ci.act}${+ci.act2}${+ci.act3} aim ${st.h[1 - side].aim.toFixed(2)} tgt ${(P.CPU.st[1 - side] || {}).tgt} | me ${me.b3.x.toFixed(2)},${me.b3.z.toFixed(2)} aim ${st.h[side].aim.toFixed(2)} act ${+me.input.act} | ` + st.aliens.map(a => `${a.id}${a.k[0]}${a.st === 'live' ? '' : '*'} ${a.x.toFixed(1)},${a.z.toFixed(1)} f${a.face.toFixed(1)}${a.zap ? ' Z' : ''}`).join('; ') + (jsf ? ' || ' + JSON.stringify(jsf(st, cpu, me, G)) : ''));
      if (trace && k % Math.round(trace / P.DT) === 0 && log.length < 400) log.push(`${t.toFixed(0)}s cz ${st.cz.toFixed(0)} clock ${st.clock.toFixed(0)} me ${me.b3.x.toFixed(1)},${me.b3.z.toFixed(1)}${st.h[side].flat ? ' FLAT' : ''} cpu ${cpu.b3.x.toFixed(1)},${cpu.b3.z.toFixed(1)}${st.h[1 - side].flat ? ' FLAT' : ''} aliens ${st.aliens.length} ${st.block ? 'block w' + st.block.wave : ''} ${st.walker ? 'W' + st.walker.phase + ':' + st.walker.state + ':' + st.walker.rub.toFixed(1) : ''} gren ${st.h[0].gren},${st.h[1].gren}`);
    }
  } catch (e) { err = String(e.stack || e); }
  return { cleared: G.mode !== 'play' || st.phase === 'done', t: +(k * P.DT).toFixed(0), clock: +st.clock.toFixed(0), cz: +st.cz.toFixed(0), ck: st.ck, wipes: st.wipes, rescues: st.rescues,
    flats: { person: flats[side], cpu: flats[1 - side] }, peels: st.peels, selfPeels: st.selfPeels, kills: st.kills, cross: st.crossKills, thrown: st.thrown,
    walker: st.walker ? st.walker.phase + ':' + st.walker.state : null, maxStill: +maxStill.toFixed(0), stillAt: +stillAt.toFixed(0), maxLay: +maxLay.toFixed(1), layAt: +layAt.toFixed(0), worstRev, revAt,
    cpuErrs: P.CPU.errs ? [...P.CPU.errs] : [], err, log };
}

(async () => {
  const browser = await chromium.launch();
  let bad = 0;
  for (const side of sides) for (const who of people) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const errors = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', e => errors.push(String(e)));
    await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
    await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
    const r = await page.evaluate(pageRun, { who, side, maxT, ck, trace, dbg, js });
    const log = r.log; delete r.log;
    const mustClear = who !== 'offhatch';
    const ok = !r.err && !errors.length && !r.cpuErrs.length && r.worstRev <= 9 && (mustClear ? r.cleared : !r.cleared);
    if (!ok) bad++;
    console.log((ok ? 'ok   ' : 'LOOK ') + (who + (side ? ' (as Bo)' : ' (as Pip)')).padEnd(20) + JSON.stringify(r) + (errors.length ? '\n     errors: ' + errors.slice(0, 3).join(' | ') : ''));
    if (trace || dbg) console.log(log.join('\n'));
    await page.close();
  }
  await browser.close();
  console.log(bad ? bad + ' to look at' : 'all ok');
  process.exit(bad ? 1 : 0);
})();
