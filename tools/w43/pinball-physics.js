#!/usr/bin/env node
// 43-2 Pinball Panic: measure how the glass balls move (no drawing, single balls driven straight through the rules).
// Usage: node tools/w43/pinball-physics.js [--only=roll,wall,corner,pair,arc,ride,seat,magnet,sweep,rest,hop,bumper] [--json]
// Each test prints a few numbers; the "want" column is what good pinball feel needs (the checks at the end fail the run).
//   roll    blank table: push from rest, top speed each way, coast after letting go, roll back down the slope, turning, reversing
//   wall    a ball thrown at a rail and at a post at many speeds and angles: how much bounce comes back, no low-speed chatter
//   corner  a ball let roll into a V of rails under the slope: settles, no shaking, never inside a rail
//   rest    a ball pushed against a shut gate on the real table: still, no rattling clacks
//   pair    two balls meeting head-on and glancing: momentum kept, a lively clack, never overlapping, never pushed into a wall
//   hop     a hop from top speed: height, time in the air, distance, the landing
//   arc     every launch (twin flippers, flippers for a friend): lands where it flew (no jump), keeps its speed into the roll,
//           stays clear of rails when nudged all the way left or right
//   ride    every wire ramp and crossing: speed along the wire rises and falls with height, no jump at the end
//   seat    a ball rolling into a cup at 1, 3 and 5 u/s: the biggest jump in one frame when caught
//   magnet  a roaming magnet grabbing a ball beside it: the biggest jump in one frame
//   bumper  a ball sat next to a bumper: kicked out, how fast, and never trapped ping-ponging for long
//   sweep   thousands of random throws over the whole table: never through a rail or a post, never left inside one
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const only = opt('only', '').split(',').filter(Boolean), asJson = args.includes('--json');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.addInitScript(() => {
    let s = 7; Math.random = () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const out = await page.evaluate(only => {
    const P = window.__pipbo, G = P.G, K3D = P.K3D, DT = P.DT;
    const i = P.LEVELS.findIndex(l => l.mode === 'arcadepinball');
    G.manual = true; K3D.noRender = true; G.cpuOn = [false, false];
    P.loadLevel(i); G.introT = 0;
    const CO = PINBALL, S = CO.S, TB = PINBALL_TABLE, R = TB.T.R, X = CO._t, hyp = Math.hypot;
    const st = G.mst; st.phase = 'play';
    const inp = [{ x: 0, z: 0, s: 0 }, { x: 0, z: 0, s: 0 }];
    const realMove = K3D.moveDir; K3D.moveDir = p => inp[p.id];
    const push = (id, ix, idd) => { const m = hyp(ix, idd); inp[id] = m ? { x: ix / m, z: -idd / m, s: Math.min(1, m) } : { x: 0, z: 0, s: 0 }; };
    const silence = Sfx.play; Sfx.play = () => {};
    const res = {}, want = (name, ok, v, w) => { (res._checks = res._checks || []).push({ name, ok: !!ok, v, w }); };
    const r3 = v => Math.round(v * 1000) / 1000, r2 = v => Math.round(v * 100) / 100;
    const real = { near: TB.near, holes: TB.holes };
    let fakeWalls = [], fakePosts = [];
    const blank = (walls = [], posts = []) => { fakeWalls = walls; fakePosts = posts; TB.near = () => ({ walls: fakeWalls, posts: fakePosts }); TB.holes = []; };
    const unblank = () => { TB.near = real.near; TB.holes = real.holes; };
    const reset = (b, x, d, vx = 0, vd = 0) => Object.assign(b, { x, d, vx, vd, h: 0, vh: 0, air: false, mode: 'roll', seat: null, ride: null, imm: 0, seatCool: 0, land: 0, bumped: 0, jumpBuf: 0, locked: false, carry: null, magCool: {}, t2: 0 });
    const step1 = (b) => { st.t += DT; st.cn = (st.cn || 0) + 1; X.ballStep(st, b, G.players[b.id], DT); };
    const B0 = st.balls[0], B1 = st.balls[1];
    const park = b => reset(b, 0, -500);
    const run = (name, fn) => { if (only.length && !only.includes(name)) return; try { res[name] = fn(); } catch (e) { res[name] = { error: String(e && e.stack || e) }; } };

    /* ---------- roll ---------- */
    run('roll', () => {
      blank(); park(B1); const o = {};
      const prof = (ix, idd, T) => { reset(B0, 0, 200); push(0, ix, idd); const at = {}; let n = 0; for (const t of [0.25, 0.5, 1, 2, 3]) { while (n * DT < t - 1e-9 && n * DT < T) { step1(B0); n++; } at[t] = r2(hyp(B0.vx, B0.vd)); } return at; };
      o.up = prof(0, 1, 3); o.right = prof(1, 0, 3); o.down = prof(0, -1, 3);
      // coast: top speed up, then let go
      reset(B0, 0, 200); push(0, 0, 1); for (let n = 0; n < 360; n++) step1(B0);
      const d0 = B0.d, v0 = B0.vd; push(0, 0, 0); let n = 0;
      while (B0.vd > 0 && n < 1200) { step1(B0); n++; }
      o.coastUp = { v0: r2(v0), dist: r2(B0.d - d0), time: r2(n * DT) };
      const dTop = B0.d; const back = {}; let m = 0;
      for (const t of [1, 2, 3]) { while (m * DT < t - 1e-9) { step1(B0); m++; } back[t] = { v: r2(-B0.vd), dist: r2(dTop - B0.d) }; }
      o.rollBack = back;
      // coast sideways at top speed
      reset(B0, 0, 200); push(0, 1, 0); for (let k = 0; k < 360; k++) step1(B0);
      const x0 = B0.x, vx0 = B0.vx; push(0, 0, 0); let k = 0;
      while (B0.vx > 0.15 && k < 2400) { step1(B0); k++; }
      o.coastSide = { v0: r2(vx0), dist: r2(B0.x - x0), time: r2(k * DT) };
      // turning: rolling right at top speed, push up; time until the heading is within 15 degrees of straight up
      reset(B0, 0, 200); push(0, 1, 0); for (let q = 0; q < 360; q++) step1(B0);
      const tx0 = B0.x; push(0, 0, 1); let q = 0;
      while (Math.atan2(Math.abs(B0.vx), B0.vd) > 15 * Math.PI / 180 && q < 1200) { step1(B0); q++; }
      o.turn = { time: r2(q * DT), drift: r2(B0.x - tx0) };
      // reversing: rolling up at top speed, push down: time to a stop
      reset(B0, 0, 200); push(0, 0, 1); for (let q2 = 0; q2 < 360; q2++) step1(B0);
      push(0, 0, -1); let q3 = 0; const dd0 = B0.d;
      while (B0.vd > 0 && q3 < 1200) { step1(B0); q3++; }
      o.reverse = { time: r2(q3 * DT), dist: r2(B0.d - dd0) };
      // half stick up (an analogue stick part-way)
      o.halfUp = prof(0, 0.5, 3);
      unblank(); push(0, 0, 0);
      want('roll: takes a moment to get going (0.25 s < 70% of top)', o.up[0.25] < 0.7 * o.up[3], o.up[0.25], '< 70% top');
      want('roll: top speed uphill 4.2 to 5.6', o.up[3] >= 4.2 && o.up[3] <= 5.6, o.up[3], '4.2-5.6');
      want('roll: top speed the same-ish every way (down/up < 1.25)', o.down[3] / o.up[3] < 1.25, r2(o.down[3] / o.up[3]), '< 1.25');
      want('roll: carries on when let go uphill (> 2.2 u)', o.coastUp.dist > 2.2, o.coastUp.dist, '> 2.2');
      want('roll: coasts sideways (> 4 u)', o.coastSide.dist > 4, o.coastSide.dist, '> 4');
      want('roll: rolls back down the slope (> 1.6 u/s after 2 s)', o.rollBack[2].v > 1.6, o.rollBack[2].v, '> 1.6');
      want('roll: turns crisply (< 0.75 s)', o.turn.time < 0.75, o.turn.time, '< 0.75');
      want('roll: stops crisply when reversed (< 0.75 s)', o.reverse.time < 0.75, o.reverse.time, '< 0.75');
      return o;
    });

    /* ---------- wall ---------- */
    run('wall', () => {
      const wall = { a: [-30, 150], b: [30, 150], r: 0.22, kind: 'rail' };
      blank([wall]); park(B1); const o = { rail: [], post: [] };
      for (const v of [0.4, 1, 2, 4, 7]) for (const ang of [0, 45, 70]) {
        // ball below the wall... above it (d > 150) heading down into it: normal is +d
        const a = ang * Math.PI / 180;
        reset(B0, 0, 150 + R + 0.22 + 0.3, Math.sin(a) * v, -Math.cos(a) * v);
        // the speeds just before the hit (the slope adds a little on the way in) against just after
        let hit = false, vnOut = 0, vtOut = 0, vnIn = 0, vtIn = 0;
        for (let n = 0; n < 60; n++) { const pv = B0.vd, px = B0.vx; step1(B0); if (!hit && B0.vd > pv + 0.05 && B0.vd > -0.01) { hit = true; vnOut = B0.vd; vtOut = B0.vx; vnIn = -pv; vtIn = px; break; } }
        o.rail.push({ v, ang, vin: r2(vnIn), e: r2(hit && vnIn > 0 ? vnOut / vnIn : 0), keepT: r2(vtIn ? vtOut / vtIn : 1) });
      }
      const post = { x: 0, d: 150, r: 0.32, kind: 'post' };
      blank([], [post]);
      for (const v of [1, 3, 6]) {
        reset(B0, 0, 150 + R + 0.32 + 0.3, 0, -v);
        let out = 0; for (let n = 0; n < 60; n++) { step1(B0); if (B0.vd > 0) { out = B0.vd; break; } }
        o.post.push({ v, e: r2(out / v) });
      }
      unblank();
      const hi = o.rail.filter(q => q.v >= 4 && q.ang === 0).map(q => q.e), lo = o.rail.filter(q => q.vin <= 0.6).map(q => q.e);
      want('wall: a fast hit bounces back lively (e >= 0.4)', Math.min(...hi) >= 0.4, Math.min(...hi), '>= 0.4');
      want('wall: a slow touch does not bounce (e <= 0.1)', Math.max(...lo) <= 0.1, Math.max(...lo), '<= 0.1');
      return o;
    });

    /* ---------- corner and resting ---------- */
    run('corner', () => {
      // a V of rails opening up the table: the ball rolls down into the point under the slope
      const wa = { a: [-6, 156], b: [0, 150], r: 0.22, kind: 'rail' }, wb = { a: [0, 150], b: [6, 156], r: 0.22, kind: 'rail' };
      blank([wa, wb]); park(B1);
      reset(B0, 1.5, 157, -0.8, -1.5); push(0, 0, 0);
      const xs = [], ds = []; let pen = 0, clacks = st.fxN;
      const fx0 = st.fx.length;
      for (let n = 0; n < 6 * 120; n++) {
        step1(B0);
        for (const w of [wa, wb]) pen = Math.max(pen, R + w.r - CO.segDist(B0.x, B0.d, w.a[0], w.a[1], w.b[0], w.b[1]));
        if (n >= 5 * 120) { xs.push(B0.x); ds.push(B0.d); }
      }
      const sd = a => { const m = a.reduce((p, c) => p + c, 0) / a.length; return Math.sqrt(a.reduce((p, c) => p + (c - m) * (c - m), 0) / a.length); };
      const cl = st.fx.slice(fx0).filter(f => f.k === 'clack' && f.t > st.t - 1).length;
      unblank();
      const o = { jitter: r3(Math.max(sd(xs), sd(ds))), maxInside: r3(pen), lateClacks: cl, restSpeed: r3(hyp(B0.vx, B0.vd)) };
      want('corner: settles still (jitter < 0.01)', o.jitter < 0.01, o.jitter, '< 0.01');
      want('corner: never inside a rail (< 0.02)', o.maxInside < 0.02, o.maxInside, '< 0.02');
      return o;
    });
    run('rest', () => {
      // the first gate of the climb, shut: Pip pushes up against it
      unblank(); const g = TB.gates.find(q => q.id === 'g1L');
      for (const id in st.gate) st.gate[id] = { open: false, latched: false, t: 0 };
      park(B1); reset(B0, -4.5, g.d - 2.5, 0, 2); push(0, 0, 1);
      const ds = [], fx0 = st.fx.length;
      for (let n = 0; n < 4 * 120; n++) { step1(B0); X.collide(st, B0, B0.d); if (n > 240) ds.push(B0.d); }
      const cl = st.fx.slice(fx0).filter(f => f.k === 'clack' && f.t > st.t - 2).length;
      push(0, 0, 0);
      const span = Math.max(...ds) - Math.min(...ds);
      const o = { span: r3(span), lateClacks: cl, gap: r3(g.d - B0.d - R - 0.2) };
      want('rest: still against a shut gate (span < 0.01)', o.span < 0.01, o.span, '< 0.01');
      want('rest: no rattling clacks', o.lateClacks === 0, o.lateClacks, '0');
      return o;
    });

    /* ---------- two balls ---------- */
    run('pair', () => {
      blank(); const o = {};
      const meet = (vx, vd, off) => {
        reset(B0, 0, 200, vx, vd); reset(B1, off, 200 + 3, 0, 0); push(0, 0, 0); push(1, 0, 0);
        // momentum and speeds measured the frame before and the frame after the clack (no drag or slope in between)
        let minD = 9, p0 = null, p1 = null, vin = 0;
        for (let n = 0; n < 240 && !p1; n++) {
          step1(B0); step1(B1);
          const pre = [B0.vx + B1.vx, B0.vd + B1.vd], vpre = hyp(B0.vx - B1.vx, B0.vd - B1.vd);
          const ov = hyp(B1.x - B0.x, B1.d - B0.d) < 2 * R;
          X.pairBump(st);
          minD = Math.min(minD, hyp(B1.x - B0.x, B1.d - B0.d));
          if (ov) { p0 = pre; vin = vpre; p1 = [B0.vx + B1.vx, B0.vd + B1.vd]; }
        }
        if (!p1) return { met: false };
        return { vin: r2(vin), b1Speed: r2(hyp(B1.vx, B1.vd)), b0Speed: r2(hyp(B0.vx, B0.vd)), momentumLost: r2(hyp(p0[0], p0[1]) - hyp(p1[0], p1[1])), overlap: r3(Math.max(0, 2 * R - minD)) };
      };
      o.headOn = meet(0, 4, 0); o.glance = meet(0, 4, 1.2);
      // two balls pressed together into a rail: never shoved through it
      const wall = { a: [-30, 150], b: [30, 150], r: 0.22, kind: 'rail' }; blank([wall]);
      reset(B0, 0, 150 + R + 0.22 + 0.01); reset(B1, 0.4, 150 + R + 0.22 + 1.6, 0, -6); push(0, 0, 0); push(1, 0, 0);
      let pen = 0;
      for (let n = 0; n < 120; n++) { st.t += DT; st.cn++; X.ballStep(st, B0, G.players[0], DT); X.ballStep(st, B1, G.players[1], DT); X.pairBump(st); for (const b of [B0, B1]) pen = Math.max(pen, R + 0.22 - Math.abs(b.d - 150)); }
      o.intoRail = { maxInside: r3(pen) };
      unblank(); park(B1);
      want('pair: a head-on clack passes on most of the speed (> 65%)', o.headOn.b1Speed > 0.65 * o.headOn.vin, r2(o.headOn.b1Speed / o.headOn.vin), '> 0.65');
      want('pair: momentum kept (loss < 0.4)', Math.abs(o.headOn.momentumLost) < 0.4 && Math.abs(o.glance.momentumLost) < 0.4, Math.max(Math.abs(o.headOn.momentumLost), Math.abs(o.glance.momentumLost)), '< 0.4');
      want('pair: never pushed into a rail (< 0.02)', o.intoRail.maxInside < 0.02, o.intoRail.maxInside, '< 0.02');
      return o;
    });

    /* ---------- hop ---------- */
    run('hop', () => {
      blank(); park(B1);
      reset(B0, 0, 200); push(0, 1, 0); for (let n = 0; n < 360; n++) step1(B0);
      const x0 = B0.x; G.players[0].pendingJump = true; let top = 0, n = 0, airT = 0, landed = false, bounces = 0, wasAir = false;
      for (; n < 240; n++) { step1(B0); top = Math.max(top, B0.h); if (B0.air) airT += DT; if (wasAir && !B0.air) { landed = true; break; } wasAir = B0.air; }
      unblank(); push(0, 0, 0);
      return { apex: r2(top), air: r2(airT), dist: r2(B0.x - x0) };
    });

    /* ---------- launches (arcs) and wire rides ---------- */
    const flyLand = (b, start, nudge) => {
      // step one ball through a launch; returns the landing's jump (position change in the landing frame beyond its own speed)
      // a teleport shows as a landing frame whose move on the table fits neither the speed before nor the speed after
      let prevStep = null, jump = 0, vAfter = 0, vBefore = 0, landAt = null, n = 0, bounce = 0, fate = 'rolled';
      push(b.id, nudge || 0, 0);
      start();
      for (; n < 800; n++) {
        const was = b.mode, px = b.x, pd = b.d;
        step1(b);
        const sx = b.x - px, sd = b.d - pd;
        if (was === 'ride' && b.mode !== 'ride') {
          const e1 = prevStep ? hyp(sx - prevStep[0], sd - prevStep[1]) : 0, e2 = hyp(sx - b.vx * DT, sd - b.vd * DT);
          jump = Math.min(e1, e2); vBefore = prevStep ? hyp(prevStep[0], prevStep[1]) / DT : 0; landAt = [b.x, b.d];
          vAfter = hyp(b.vx, b.vd);
          // then roll on with no push for 2.5 s: does it bounce, and does it stay out of holes and cups?
          push(b.id, 0, 0);
          for (let k = 0; k < 300; k++) { step1(b); X.seatCheck(st, b); bounce = Math.max(bounce, b.h); if (b.mode !== 'roll') { fate = b.mode; break; } }
          break;
        }
        prevStep = [sx, sd];
      }
      push(b.id, 0, 0);
      return { jump: r3(jump), vBefore: r2(vBefore), vAfter: r2(vAfter), bounce: r2(bounce), at: landAt && landAt.map(r2), free: landAt ? CO.free(st, landAt[0], landAt[1]) : false, inHole: landAt ? !!CO.inHole(st, landAt[0], landAt[1]) : true, fate, air: r2(n * DT) };
    };
    run('arc', () => {
      unblank(); park(B1); const o = {};
      for (const g of TB.gates) st.gate[g.id].latched = true;
      for (const t of TB.twins) t.cradles.forEach((cid, k) => {
        const c = TB.byId[cid];
        for (const nd of [0, -1, 1]) {
          reset(B0, c.x, c.d);
          o[t.id + ':' + k + (nd ? (nd < 0 ? 'L' : 'R') : '')] = flyLand(B0, () => X.startArc(st, B0, t.to[k], t.apex, t.dur, 'twin', t.loop), nd);
        }
      });
      for (const f of TB.flippers) {
        const c = TB.byId[f.cradle];
        for (const nd of [0, -1, 1]) { reset(B0, c.x, c.d); o[f.id + (nd ? (nd < 0 ? 'L' : 'R') : '')] = flyLand(B0, () => X.startArc(st, B0, f.to, f.apex, f.dur, 'flip'), nd); }
      }
      for (const id in st.gate) st.gate[id] = { open: false, latched: false, t: 0 };
      const all = Object.values(o);
      want('arc: no jump on landing (< 0.05)', Math.max(...all.map(q => q.jump)) < 0.05, Math.max(...all.map(q => q.jump)), '< 0.05');
      want('arc: keeps rolling after landing (> 1 u/s)', Math.min(...all.map(q => q.vAfter)) > 1, Math.min(...all.map(q => q.vAfter)), '> 1');
      want('arc: lands clear even when nudged all the way', all.every(q => q.free && !q.inHole), all.filter(q => !q.free || q.inHole).length, '0 bad');
      want('arc: rolls on safely after landing (no drain or drop)', all.every(q => q.fate !== 'drain' && q.fate !== 'drop'), all.filter(q => q.fate === 'drain' || q.fate === 'drop').length, '0 bad');
      const throws = Object.keys(o).filter(k => !TB.twins.some(t => t.loop && k.startsWith(t.id))).map(k => o[k]);
      want('arc: a high launch bounces when it lands (> 0.1)', throws.filter(q => q.air > 1.2).every(q => q.bounce > 0.1), Math.min(...throws.filter(q => q.air > 1.2).map(q => q.bounce)), '> 0.1');
      return o;
    });
    run('ride', () => {
      unblank(); park(B1); const o = {};
      for (const r of TB.rides) {
        reset(B0, r.pts[0][0], r.pts[0][1]);
        const sp = []; let pv = null;
        const res1 = flyLand(B0, () => X.startRide(st, B0, r));
        // speed profile along the wire (sample again, recording speeds)
        reset(B0, r.pts[0][0], r.pts[0][1]); X.startRide(st, B0, r);
        const hs = [];
        for (let n = 0; n < 800 && B0.mode === 'ride'; n++) { const px = B0.x, pd = B0.d, ph = B0.rideH || 0; step1(B0); if (B0.mode === 'ride') { sp.push(hyp(B0.x - px, B0.d - pd, (B0.rideH || 0) - ph) / DT); hs.push(B0.rideH || 0); } }
        // does speed fall when the wire climbs? correlation of speed with height (negative is right)
        const n = sp.length, ms = sp.reduce((a, c) => a + c, 0) / n, mh = hs.reduce((a, c) => a + c, 0) / n;
        let cov = 0, vs = 0, vh = 0; for (let k = 0; k < n; k++) { cov += (sp[k] - ms) * (hs[k] - mh); vs += (sp[k] - ms) ** 2; vh += (hs[k] - mh) ** 2; }
        o[r.id] = Object.assign(res1, { vMin: r2(Math.min(...sp)), vMax: r2(Math.max(...sp)), corrSpeedHeight: r2(vs && vh ? cov / Math.sqrt(vs * vh) : 0), dur: r2(n * DT), want: r.dur });
      }
      const all = Object.values(o), climbs = TB.rides.filter(r => Math.max(...r.pts.map(q => q[2])) > 2.5).map(r => o[r.id]);
      want('ride: no jump at the end (< 0.05)', Math.max(...all.map(q => q.jump)) < 0.05, Math.max(...all.map(q => q.jump)), '< 0.05');
      want('ride: rolls on safely after landing (no drain or drop)', all.every(q => q.fate !== 'drain' && q.fate !== 'drop'), all.filter(q => q.fate === 'drain' || q.fate === 'drop').length, '0 bad');
      want('ride: takes about as long as designed (within 15%)', all.every(q => Math.abs(q.dur - q.want) / q.want < 0.15), Math.max(...all.map(q => r2(Math.abs(q.dur - q.want) / q.want))), '< 0.15');
      want('ride: slows going up, speeds coming down (speed vs height < -0.5)', climbs.every(q => q.corrSpeedHeight < -0.5), Math.max(...climbs.map(q => q.corrSpeedHeight)), '< -0.5');
      return o;
    });

    /* ---------- seats and magnets ---------- */
    run('seat', () => {
      unblank(); park(B1); const o = {};
      const c = TB.byId.cupA;
      for (const v of [1, 3, 5]) {
        reset(B0, c.x, c.d - 1.3, 0, v); push(0, 0, 0); let jump = 0, caught = false;
        for (let n = 0; n < 240; n++) {
          const px = B0.x, pd = B0.d, was = B0.mode; step1(B0); X.seatCheck(st, B0);
          const mv = hyp(B0.x - px, B0.d - pd);
          jump = Math.max(jump, mv - hyp(B0.vx, B0.vd) * DT - (was === 'roll' ? v * DT : 0) * 0);
          if (B0.mode === 'seat') caught = true;
        }
        // biggest one-frame move compared to the ball's own speed (a snap shows as a big move)
        o['v' + v] = { caught, maxFrameMove: r3(jump) };
        B0.mode = 'roll'; B0.seat = null;
      }
      const worst = Math.max(...Object.values(o).map(q => q.maxFrameMove));
      want('seat: caught smoothly (biggest frame move < 0.08)', worst < 0.08, worst, '< 0.08');
      want('seat: still catches a ball at 5 u/s', o.v5.caught, o.v5.caught, 'true');
      return o;
    });
    run('magnet', () => {
      unblank(); park(B1); const o = {};
      if (!TB.magnets.length) return { none: true };
      const M = TB.magnets[0], m = st.magnets[0];
      m.x = (M.x0 + M.x1) / 2; m.cool = 0; m.hold = -1;
      reset(B0, m.x + 1.2, M.d); push(0, 0, 0);
      let jump = 0, grabbed = false;
      for (let n = 0; n < 120; n++) { const px = B0.x, pd = B0.d; st.t += DT; X.ballStep(st, B0, G.players[0], DT); X.hazards(st, DT); if (B0.mode === 'magnet') grabbed = true; jump = Math.max(jump, hyp(B0.x - px, B0.d - pd)); if (grabbed && n > 60) break; }
      o.grabbed = grabbed; o.maxFrameMove = r3(jump);
      want('magnet: grabs without a snap (frame move < 0.12)', jump < 0.12, o.maxFrameMove, '< 0.12');
      B0.mode = 'roll'; m.hold = -1;
      return o;
    });

    /* ---------- bumpers ---------- */
    run('bumper', () => {
      unblank(); park(B1); const o = {};
      const k = TB.posts.findIndex(p => p.kind === 'bumper' && p.d > 90 && p.d < 110), p = TB.posts[k];
      st.bump.forEach(s => { s.ch = 0; s.cool = 0; });
      reset(B0, p.x + 0.4, p.d - p.r - R - 0.2, 0, 0.5); push(0, 0, 0);
      let kicks = 0, best = 0; const fx0 = st.fxN;
      for (let n = 0; n < 6 * 120; n++) { st.t += DT; st.cn++; X.ballStep(st, B0, G.players[0], DT); X.table(st, DT); best = Math.max(best, hyp(B0.vx, B0.vd)); }
      kicks = st.fx.filter(f => f.k === 'bumper' && f.hit && f.n > fx0).length;
      o.kicks6s = kicks; o.bestSpeed = r2(best);
      want('bumper: kicks the ball out hard (> 6 u/s)', best > 6, o.bestSpeed, '> 6');
      return o;
    });

    /* ---------- sweep: random throws over the whole table ---------- */
    run('sweep', () => {
      unblank(); park(B1); const o = { throws: 0, through: 0, inside: 0, worst: 0, where: [] };
      for (const id in st.gate) st.gate[id] = { open: false, latched: false, t: 0 };
      let seed = 99; const rnd = () => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >> 17; seed ^= seed << 5; seed >>>= 0; return seed / 4294967296; };
      const solid = (b) => {
        let worst = 0;
        const N = TB.near(b.d);
        for (const w of N.walls) { if (w.kind === 'kerb' || w.kind === 'oneway' || w.kind === 'target' || !CO.wallOn(st, w, b)) continue; worst = Math.max(worst, R + w.r - CO.segDist(b.x, b.d, w.a[0], w.a[1], w.b[0], w.b[1])); }
        for (const p of N.posts) worst = Math.max(worst, R + p.r - hyp(b.x - p.x, b.d - p.d));
        return worst;
      };
      const cross = (x0, d0, x1, d1) => {
        const N = TB.near((d0 + d1) / 2);
        for (const w of N.walls) {
          if (w.kind !== 'rail' && w.kind !== 'gate') continue; if (!CO.wallOn(st, w, B0)) continue;
          const ax = w.a[0], ad = w.a[1], bx = w.b[0], bd = w.b[1];
          const s1 = (bx - ax) * (d0 - ad) - (bd - ad) * (x0 - ax), s2 = (bx - ax) * (d1 - ad) - (bd - ad) * (x1 - ax);
          const s3 = (x1 - x0) * (ad - d0) - (d1 - d0) * (ax - x0), s4 = (x1 - x0) * (bd - d0) - (d1 - d0) * (bx - x0);
          if (s1 * s2 < 0 && s3 * s4 < 0) return true;
        }
        return false;
      };
      for (let tN = 0; tN < 1500; tN++) {
        const d = 2 + rnd() * 406, sec = TB.secAt(d), rw = sec.rail || TB.T.RAIL;
        const x = (rnd() * 2 - 1) * (rw - 1.1);
        if (!CO.free(st, x, d, 0.02)) continue;
        const a = rnd() * Math.PI * 2, v = 1 + rnd() * (S.VMAX - 1);
        reset(B0, x, d, Math.cos(a) * v, Math.sin(a) * v); B0.imm = 99; push(0, 0, 0);
        o.throws++;
        for (let n = 0; n < 180; n++) {
          const px = B0.x, pd = B0.d; step1(B0);
          if (B0.mode !== 'roll') break;
          if (cross(px, pd, B0.x, B0.d)) { o.through++; if (o.where.length < 6) o.where.push([r2(px), r2(pd), r2(B0.x), r2(B0.d)]); break; }
          const w = solid(B0); o.worst = Math.max(o.worst, w); if (w > 0.03) { o.inside++; if (o.where.length < 6) o.where.push(['in', r2(B0.x), r2(B0.d), r3(w)]); break; }
        }
      }
      o.worst = r3(o.worst);
      want('sweep: never through a rail', o.through === 0, o.through, '0');
      want('sweep: never left inside a rail or post (> 0.03)', o.inside === 0, o.inside, '0');
      return o;
    });

    K3D.moveDir = realMove; Sfx.play = silence; unblank();
    return res;
  }, only);
  const checks = out._checks || []; delete out._checks;
  if (asJson) console.log(JSON.stringify(out, null, 1));
  else for (const k in out) console.log(k.padEnd(7), JSON.stringify(out[k]));
  console.log('');
  let bad = 0;
  for (const c of checks) { if (!c.ok) bad++; console.log((c.ok ? ' ok  ' : 'FAIL ') + c.name.padEnd(70) + ' got ' + JSON.stringify(c.v) + '  want ' + c.w); }
  if (errors.length) { console.log('page errors:\n' + errors.slice(0, 5).join('\n')); bad++; }
  console.log(bad ? `\n${bad} of ${checks.length} checks failed` : `\nall ${checks.length} checks pass`);
  await browser.close();
  process.exit(bad ? 1 : 0);
})();
