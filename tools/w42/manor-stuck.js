#!/usr/bin/env node
// 42-3 Spook Manor: scripted people beside the computer (drawing off), in real 1-player mode (the person's side is not
// a computer player, so the computer waits, fetches and talks as it does for a person). Unlike manor-play.js --who=wrong
// (the computer's own brain with 12 s of nonsense per room), these people never use the computer's brain: they are
// plain rules that walk the same tour (PARKMANOR.tour) and do one thing wrong all level.
// Usage: node tools/w42/manor-stuck.js [person ...] [--side=0|1|both] [--max=900] [--trace=5] [--from=<clock>]
//   good      does its job sensibly (the yardstick)
//   slow      as good, but every decision 0.5 s late (the spec's finish must work for a pair who react 0.5 s late)
//   nobeam    (Pip) never uses the beam            beamheld  (Pip) holds the beam all level
//   ahead     runs the tour without ever waiting for the partner (Pip leaves Bo in the dark; Bo runs into the dark)
//   away      (Pip) turns the light away whenever Bo starts to unwind
//   nokey     (Bo) never uses the key: cannot finish, must not crash or shake
//   nohide    never hides from the Butler          stayhid   hides and never comes out again by itself
//   doorway   stands in every doorway for 15 s     corners   walks to the far corner of every room and stands 12 s
//   mash      6 s in every 15 it presses everything at random
//   norouse   never goes to bring a stiff partner round
// Prints: escaped or where it ended, time, wisps, Frights, Scare Outs (and the most from one clock), gold help, the
// longest wait with no progress along the tour, and the computer's worst second of stick reversals (more than 6 is
// shaking). Exit code 1 if anyone who should escape does not, or the computer shakes or throws.
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const PIP = ['good', 'slow', 'nobeam', 'beamheld', 'ahead', 'away', 'nohide', 'stayhid', 'doorway', 'corners', 'mash', 'norouse'];
const BO = ['good', 'slow', 'nokey', 'ahead', 'nohide', 'stayhid', 'doorway', 'corners', 'mash', 'norouse'];
const people = args.filter(a => !a.startsWith('--'));
const sideOpt = opt('side', 'both'), maxT = +opt('max', 900), trace = +opt('trace', 0), from = +opt('from', 0);
const dbg = opt('dbg', '') ? opt('dbg', '').split(',').map(Number) : null; // --dbg=from,to: the computer's stick and button every 0.05 s
const CANNOT = { nokey: 1 }; // (people who cannot finish by design)

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  await page.addInitScript(() => {
    let s = 2463534242; const gen = () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    Math.random = gen;
  });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  if (opt('probe', '')) await page.evaluate(src => { window.__probe = eval(src); }, require('fs').readFileSync(opt('probe', ''), 'utf8'));
  let bad = 0;
  for (const side of sideOpt === 'both' ? [0, 1] : [+sideOpt]) for (const who of (people.length ? people : side ? BO : PIP)) {
    if (!(side ? BO : PIP).includes(who)) continue;
    errors.length = 0;
    const r = await page.evaluate(async ({ who, side, maxT, trace, from, dbg }) => {
      const P = window.__pipbo, G = P.G, K3D = P.K3D, hyp = Math.hypot, N = P.cpuNav3;
      const H = PARKMANOR_HOUSE, ROUTE = PARKMANOR.tour, PML = PARKMANOR_LIGHT, SPK = PARKMANOR_SPOOKS;
      const i = P.LEVELS.findIndex(l => l.mode === 'parkmanor');
      G.manual = true; K3D.noRender = true;
      P.CPU.errs.clear(); P.CPU.skillOf = [null, null]; P.CPU.filter = null;
      G.cpuOn = side === 0 ? [false, true] : [true, false];
      delete G.results[i];
      P.loadLevel(i);
      G.introT = 0;
      const st0 = G.mst;
      if (from > 0) { st0.hasLantern = st0.hasKey = true; st0.restart = from; for (const id in st0.doors) if (id !== 'front' && id !== 'exitDoor') PARKMANOR.openDoor(st0, id); PARKMANOR.restartAt(st0); }
      const me = G.players[side], cpu = G.players[1 - side];
      const regOf = (x, z) => { for (const id in H.regions) { const q = H.regions[id]; if (x >= q.x0 && x <= q.x1 && z >= q.z0 && z <= q.z1) return id; } return 'ground'; };
      const winder = id => H.winders.find(w => w.id === id);
      const jobDone = (st, q) => {
        if (q.door) return st.doors[q.door].open;
        if (q.wind) { const w = winder(q.wind); if (w.ride) return !!st.rideReady[w.ride]; if (w.kind === 'musicbox') return !!st.fired.musicDone || st.wound.some(x => x.def === w); return st.wound.some(x => x.def === w); }
        if (q.ride) return false;
        if (q.boss) return !!st.fired.bossDone;
        return true;
      };
      const routeNear = (x, z) => { const reg = regOf(x, z); let best = 0, bd = 1e9; ROUTE.forEach((q, k) => { if (q.reg !== reg) return; const d = hyp(q.x - x, q.z - z); if (d < bd) { bd = d; best = k; } }); return best; };
      // the person's own map and walking (a path when the straight line is blocked; thumb off for 2 s after 3 s nowhere)
      const navs = {}; let pth = null, pthT = 0, pthG = null, lx = 0, lz = 0, lt = 0, off = 0;
      const navFor = (st, reg) => {
        const sig = st.solids.map(q => (q.kind === 'chair' ? '' : q.ghost ? 0 : 1)).join('');
        if (!navs[reg] || navs[reg].sig !== sig) { const R = H.regions[reg], keep = st.chairs.map(c => c.s.ghost); st.chairs.forEach(c => { c.s.ghost = true; }); navs[reg] = N.build(st.w, { x0: R.x0, z0: R.z0, x1: R.x1, z1: R.z1, cell: 0.5, yMax: 6 }); st.chairs.forEach((c, k) => { c.s.ghost = keep[k]; }); navs[reg].sig = sig; pth = null; }
        return navs[reg];
      };
      const inp = me.input;
      const go = (st, t, dt, x, z, sp = 1) => {
        const b = me.b3, d = hyp(x - b.x, z - b.z);
        if (d < 0.3) return true;
        if (off > t) return false;
        if (hyp(b.x - lx, b.z - lz) > 0.4) { lx = b.x; lz = b.z; lt = t; }
        if (t - lt > 3) { off = t + 2; lt = t + 2; me.pendingJump = true; return false; }
        const o3 = cpu.b3, byO = Math.abs(x - o3.x) < 1.5 && Math.abs(z - o3.z) < 1.5;
        const nav = navFor(st, regOf(b.x, b.z)), goal = { x, z, y: byO ? o3.y : P.MOVER3.floorAt(st.w, x, z, b.y + 1.5, 0) };
        const out = {};
        if (d < 1.2 || N.clear(nav, { x: b.x, z: b.z, y: b.y }, goal)) { const q = N.stick(x - b.x, z - b.z); out.ax = q.ax; out.ay = q.ay; pth = null; }
        else {
          pthT -= dt;
          if (!pth || pthT <= 0 || !pthG || hyp(pthG.x - x, pthG.z - z) > 0.8) { pth = N.path(nav, { x: b.x, y: b.y, z: b.z }, goal); pthT = 1.2; pthG = { x, z }; }
          if (pth) N.follow(me, pth, out); else { const q = N.stick(x - b.x, z - b.z); out.ax = q.ax; out.ay = q.ay; }
        }
        sp *= Math.max(0.35, Math.min(1, d / 2.2)); // (eases off as they arrive, as a thumb does)
        inp.ax = (out.ax || 0) * sp; inp.ay = (out.ay || 0) * sp;
        if (out.jump) me.pendingJump = true;
        return false;
      };
      const face = (x, z) => { const b = me.b3, q = N.stick(x - b.x, z - b.z); inp.ax = q.ax * 0.38; inp.ay = q.ay * 0.38; };
      let ri = 0, lastScare = 0, zoneSeen = {}, cornerT = 0, cornerAt = null, doorSeen = {}, doorT = 0, doorAt = null, awayT = 0, mashO = {}, mashT = 0, hidT = 0;
      const lateQ = [];
      const think = (t, dt) => {
        const st = G.mst, b = me.b3, pb = cpu.b3;
        const o = { ax: 0, ay: 0, act: false };
        inp.ax = 0; inp.ay = 0; inp.act = false;
        if (st.phase !== 'play' || st.ride) return;
        if (st.scareOuts !== lastScare) { lastScare = st.scareOuts; ri = routeNear(b.x, b.z); cornerAt = doorAt = null; }
        if (st.stiff[side] > 0) return;
        if (st.hidden) { hidT += dt; if (who !== 'stayhid' && st.butler.state === 'off' && hidT > 1) { const hd = H.hides.find(h => h.id === st.hidden), q = N.stick(Math.sin(hd.face), Math.cos(hd.face)); inp.ax = q.ax; inp.ay = q.ay; } return; }
        hidT = 0;
        if (who === 'mash' && t % 15 < 6) { if ((mashT -= dt) <= 0) { mashT = 0.3; mashO = { ax: Math.random() * 2 - 1, ay: Math.random() * 2 - 1, act: Math.random() < 0.5, j: Math.random() < 0.3 }; } inp.ax = mashO.ax; inp.ay = mashO.ay; inp.act = mashO.act; if (mashO.j) me.pendingJump = true; return; }
        if (st.stiff[1 - side] > 0 && who !== 'norouse') { if (hyp(pb.x - b.x, pb.z - b.z) > 0.8) go(st, t, dt, pb.x, pb.z); return; }
        const B = st.butler, v = B.visit >= 0 ? H.butler[B.visit] : null;
        if (v && v.kind === 'hunt' && B.state !== 'off' && who !== 'nohide') {
          let hd = null, hdD = 1e9;
          for (const hid of [].concat(v.hide)) { const h = H.hides.find(q => q.id === hid), c = h.enter || [h.x, h.z], d = hyp(c[0] - b.x, c[1] - b.z); if (d < hdD) { hdD = d; hd = h; } }
          const c = hd.enter || [hd.x, hd.z];
          go(st, t, dt, c[0] + Math.cos(hd.face) * (side ? 0.3 : -0.3), c[1] - Math.sin(hd.face) * (side ? 0.3 : -0.3));
          return;
        }
        // where on the tour
        const reg = regOf(b.x, b.z);
        if (ROUTE[ri].reg !== reg) ri = routeNear(b.x, b.z);
        while (ri < ROUTE.length - 1 && hyp(ROUTE[ri].x - b.x, ROUTE[ri].z - b.z) < 1.2 && jobDone(st, ROUTE[ri]) && ROUTE[ri + 1].reg === ROUTE[ri].reg) ri++;
        // (Bo also reads the tour from where Pip has got to, as a person would: "we are at that door")
        if (side === 1 && who !== 'ahead' && regOf(pb.x, pb.z) === reg) ri = Math.max(routeNear(pb.x, pb.z), 0);
        const r = ROUTE[ri], gap = hyp(pb.x - b.x, pb.z - b.z);
        // the far corner of every room, once: stand there 12 s
        if (who === 'corners' && st.hasLantern && st.hasKey) {
          const zn = H.zoneAt(b.x, b.z);
          if (zn && !zoneSeen[zn.id] && !['path', 'vest', 'passage', 'stairs', 'exit'].includes(zn.id)) { zoneSeen[zn.id] = 1; cornerAt = [zn.x1 - 1.2, zn.z0 + 1.2]; cornerT = 0; }
          if (cornerAt) { if (go(st, t, dt, cornerAt[0], cornerAt[1]) || (cornerT += dt) > 14) { if ((cornerT += dt * 4) > 48 + 14) cornerAt = null; } return; }
        }
        // every doorway, once it is open: stand in it 15 s
        if (who === 'doorway') {
          for (const q of ROUTE) if (q.door && st.doors[q.door].open && !doorSeen[q.door] && q.reg === reg && hyp(st.doors[q.door].def.x - b.x, st.doors[q.door].def.z - b.z) < 6) { doorSeen[q.door] = 1; doorAt = st.doors[q.door].def; doorT = 0; }
          if (doorAt) { go(st, t, dt, doorAt.x, doorAt.z); if ((doorT += dt) > 15) doorAt = null; return; }
        }
        const boss = st.boss && ['fight', 'shrug', 'talk'].includes(st.boss.state) ? st.boss : null;
        const spooks = st.spooks.filter(s => ['move', 'wake', 'frozen', 'back'].includes(s.state) && regOf(s.x, s.z) === reg);
        if (side === 0) {
          if (!st.hasLantern) { go(st, t, dt, H.hooks.lantern.x, H.hooks.lantern.z + 0.6); return; }
          const beamOK = who !== 'nobeam';
          if (who === 'beamheld') inp.act = true;
          if (boss) {
            const d = hyp(boss.x - b.x, boss.z - b.z), near = beamOK ? 2.6 : 1.5, far = beamOK ? 9 : 2.1;
            if (d < near) { go(st, t, dt, Math.max(-4.6, Math.min(28.6, b.x + (b.x - boss.x) / d * 4)), Math.max(-102.6, Math.min(-73.4, b.z + (b.z - boss.z) / d * 4))); return; }
            if (d > far) { go(st, t, dt, boss.x, boss.z); return; }
            if (beamOK) { inp.act = boss.state !== 'talk'; face(boss.x, boss.z); }
            return;
          }
          if (who === 'away') { if (st.keyWhat === 'spook' && st.keyHold > 0.2 && awayT <= 0) awayT = 9; if (awayT > 7.8) { awayT -= dt; const q = N.stick(b.x - st.keyTgt?.x || 1, b.z - st.keyTgt?.z || 0); inp.ax = q.ax; inp.ay = q.ay; return; } awayT -= dt; }
          // an awake spook near and in sight: light it (the nearest to either of us), and hold it while Bo unwinds
          if (beamOK && who !== 'ahead' && !(who === 'away' && awayT > 0)) { // (having turned away, they walk on for a while)
            let tg = st.keyWhat === 'spook' ? st.keyTgt : null, bd = 9;
            if (!tg) for (const s of spooks) { const d = Math.min(hyp(s.x - b.x, s.z - b.z), hyp(s.x - pb.x, s.z - pb.z)); if (d < bd && PML.los(st, b.x, b.z, s.x, s.z)) { bd = d; tg = s; } }
            if (tg) { inp.act = true; face(tg.x, tg.z); return; }
          }
          if (r.pick && !st.hasKey) { go(st, t, dt, -1.2, 7.4); return; }
          if (!jobDone(st, r)) {
            if (r.ride) { if (st.rideReady[r.ride]) go(st, t, dt, H.rides[r.ride].board.x - 0.3, H.rides[r.ride].board.z); return; }
            const w = r.wait || [r.x, r.z]; go(st, t, dt, w[0], w[1]); return;
          }
          if (who !== 'ahead' && gap > 5) return; // waits for Bo
          go(st, t, dt, r.x, r.z);
          return;
        }
        // Bo
        if (!st.hasKey) { go(st, t, dt, H.hooks.key.x, H.hooks.key.z + 0.6); return; }
        const key = who !== 'nokey';
        if (boss) {
          const dx = b.x - boss.x, dz = b.z - boss.z, d = hyp(dx, dz);
          if (key && st.keyWhat === 'boss') { inp.act = true; return; }
          if (!key || boss.state !== 'fight' || boss.target === 1 || !boss.lit) { if (d < 4.5) go(st, t, dt, Math.max(-4.6, Math.min(28.6, boss.x + dx / (d || 1) * 5.5)), Math.max(-102.6, Math.min(-73.4, boss.z + dz / (d || 1) * 5.5))); return; }
          if (SPK.bossBack(st, b)) { inp.act = true; return; }
          let da = Math.atan2(dx, dz) - boss.face; da = Math.atan2(Math.sin(da), Math.cos(da));
          if (Math.abs(da) < 1.9 && d < 3.4) { const a = boss.face + (da > 0 ? 1 : -1) * 2.0; go(st, t, dt, boss.x + Math.sin(a) * 2.4, boss.z + Math.cos(a) * 2.4); }
          else go(st, t, dt, boss.x - Math.sin(boss.face) * 0.9, boss.z - Math.cos(boss.face) * 0.9);
          return;
        }
        if (key) {
          if (st.keyWhat === 'spook' && st.keyTgt && st.keyTgt.state === 'frozen') { inp.act = true; return; }
          let fz = null, fd = who === 'ahead' ? 3 : 9;
          for (const s of spooks) if (s.state === 'frozen') { const d = hyp(s.x - b.x, s.z - b.z); if (d < fd) { fd = d; fz = s; } }
          if (fz) { if (fd < 1.0) inp.act = true; else go(st, t, dt, fz.x, fz.z); return; }
          for (let k = Math.max(0, ri - 1); k < Math.min(ROUTE.length, ri + 2); k++) {
            const q = ROUTE[k];
            if (!q.key || jobDone(st, q) || q.reg !== reg) continue;
            if (q.wind === 'musicbox' && st.zone !== 'nursery') continue;
            if (go(st, t, dt, q.key[0], q.key[1]) || hyp(q.key[0] - b.x, q.key[1] - b.z) < 0.5) inp.act = true;
            return;
          }
        }
        if (r.ride) { if (st.rideReady[r.ride]) go(st, t, dt, H.rides[r.ride].board.x + 0.3, H.rides[r.ride].board.z); else if (who !== 'ahead' && gap > 2) go(st, t, dt, pb.x, pb.z); return; }
        if (who === 'ahead') { if (!jobDone(st, r)) { const w = r.wait || [r.x, r.z]; go(st, t, dt, w[0] + 0.6, w[1] + 0.6); } else go(st, t, dt, r.x, r.z); return; }
        if (gap > 1.8) go(st, t, dt, pb.x - Math.sin(pb.heading) * 0.9, pb.z - Math.cos(pb.heading) * 0.9);
      };
      const person = (t, dt) => {
        think(t, dt);
        if (who !== 'slow') return;
        // (the button half a second late, the stick a quarter: a person sees where they are walking)
        lateQ.push({ ax: inp.ax, ay: inp.ay, act: inp.act }); if (lateQ.length > 61) lateQ.shift();
        const q = lateQ.length > 60 ? lateQ[0] : { act: false }, m = lateQ.length > 30 ? lateQ[lateQ.length - 31] : { ax: 0, ay: 0 };
        inp.ax = m.ax; inp.ay = m.ay; inp.act = q.act;
      };
      const steps = Math.round(maxT / P.DT), every = trace ? Math.round(trace / P.DT) : 0, lines = [];
      let n = 0, best = -1, bestT = 0, stall = 0, stallAt = '', worstRev = 0, rev = 0, revT = 0, lastX = 0, lastY = 0, revAt = '', nan = false, sameMax = 0, lastF = 0;
      const said = new Set(), frights = [];
      while (n < steps && G.mode === 'play') {
        for (let k = 0; k < 600 && n < steps && G.mode === 'play'; k++, n++) {
          const t = n * P.DT;
          person(t, P.DT);
          P.step(P.DT);
          const s = G.mst, a = G.players[0].b3, c = G.players[1].b3;
          const prog = Math.max(routeNear(a.x, a.z), routeNear(c.x, c.z)) + s.unwound * 0.01 + (s.boss ? s.boss.turns : 0) + s.restart * 0.001;
          if (prog > best + 0.005) { best = prog; bestT = t; }
          if (t - bestT > stall) { stall = t - bestT; stallAt = s.zone + ' P(' + a.x.toFixed(1) + ',' + a.z.toFixed(1) + ') B(' + c.x.toFixed(1) + ',' + c.z.toFixed(1) + ')'; }
          const ci = cpu.input, cx = Math.sign(Math.round((ci.ax || 0) * 3)), cy = Math.sign(Math.round((ci.ay || 0) * 3));
          if (cx && lastX && cx !== lastX) rev++; if (cy && lastY && cy !== lastY) rev++;
          if (cx) lastX = cx; if (cy) lastY = cy;
          if ((revT += P.DT) >= 1) { if (rev > worstRev) { worstRev = rev; revAt = t.toFixed(0) + 's ' + s.zone; } rev = 0; revT = 0; }
          sameMax = Math.max(sameMax, s.sameClock);
          if (s.frights > lastF) { lastF = s.frights; const f = s.fx.filter(x => x.k === 'fright').pop(); frights.push((s.phase === 'scare' && s.scareWhy === 'butler' ? 'butler' : f ? ['P', 'B'][f.who] + ':' + f.by : '?') + '@' + s.zone); }
          for (const p of G.players) if (![p.b3.x, p.b3.y, p.b3.z].every(Number.isFinite)) nan = true;
          for (const bb of P.CPU.bubbles) if (bb && bb.t > 0) said.add(bb.text);
          if (dbg && t >= dbg[0] && t < dbg[1] && n % 6 === 0) lines.push(`  ${t.toFixed(2)} cpu ax ${(ci.ax || 0).toFixed(2)} ay ${(ci.ay || 0).toFixed(2)} act ${ci.act ? 1 : 0} at ${cpu.b3.x.toFixed(2)},${cpu.b3.z.toFixed(2)} | me ${me.b3.x.toFixed(2)},${me.b3.z.toFixed(2)} hid ${s.hidden || '-'} butler ${s.butler.state} key ${s.keyWhat}`);
          if (every && n % every === 0) lines.push(`${t.toFixed(1)}s ${s.phase} ${s.zone} P(${a.x.toFixed(1)},${a.z.toFixed(1)}) B(${c.x.toFixed(1)},${c.z.toFixed(1)}) beam ${s.beam ? 1 : 0} key ${s.keyWhat}${s.keyHold.toFixed(1)} stiff ${s.stiff.map(x => (x > 0 ? 1 : 0)).join('')} clock ${s.restart} hid ${s.hidden || '-'} butler ${s.butler.state}(${s.butler.x.toFixed(1)},${s.butler.z.toFixed(1)})${s.boss && s.boss.state !== 'idle' ? ' BOSS ' + s.boss.state + s.boss.turns + '(' + s.boss.x.toFixed(1) + ',' + s.boss.z.toFixed(1) + ')' + (s.boss.lit ? 'lit' : '') : ''} spooks ${s.spooks.filter(q => !['done', 'dormant', 'rest'].includes(q.state)).map(q => q.id + ':' + q.state[0] + '(' + q.x.toFixed(1) + ',' + q.z.toFixed(1) + ')').join(' ')} ${P.CPU.bubbles.map(bb => (bb && bb.t > 0 ? '"' + bb.text + '"' : '')).join('')}`);
        }
        await new Promise(q => setTimeout(q, 0));
      }
      const s = G.mst, res = G.results[i];
      if (window.__probe) lines.push(JSON.stringify(window.__probe(P, G, s)));
      return { cleared: !!res, medal: res && res.medal && res.medal.tier, t: +(n * P.DT).toFixed(1), zone: s.zone, wisps: s.wisps, max: PARKMANOR.wispsMax(), frights: s.frights, scare: s.scareOuts, sameMax, gold: s.goldN, caught: s.caughtN, unwound: s.unwound,
        stall: +stall.toFixed(1), stallAt, worstRev, revAt, nan, list: frights, cpuErrs: [...P.CPU.errs], said: [...said], trace: lines };
    }, { who, side, maxT, trace, from, dbg });
    if (r.trace.length) console.log(r.trace.join('\n'));
    const flags = [];
    if (!r.cleared && !CANNOT[who]) flags.push('DID NOT ESCAPE');
    if (r.worstRev > 6) flags.push('SHAKES');
    if (r.nan) flags.push('NaN');
    if (r.cpuErrs.length || errors.length) flags.push('ERRORS');
    if (flags.length) bad++;
    console.log(`${(['Pip', 'Bo'][side] + ' ' + who).padEnd(13)} ${r.cleared ? 'escaped' : 'ended in ' + r.zone} in ${r.t}s  wisps ${Math.round(r.wisps / r.max * 100)}%  frights ${r.frights}  scare outs ${r.scare} (most from one clock ${r.sameMax}, gold help ${r.gold}, caught ${r.caught})  unwound ${r.unwound}  medal ${r.medal}  longest stall ${r.stall}s in ${r.stallAt}  reversals/s ${r.worstRev}${r.worstRev > 6 ? ' (at ' + r.revAt + ')' : ''}${flags.length ? '   <<< ' + flags.join(', ') : ''}${r.cpuErrs.length ? ' CPU ERR ' + r.cpuErrs : ''}${errors.length ? ' PAGE ERR ' + errors.slice(0, 3).join(' | ').slice(0, 300) : ''}`);
    if (r.list.length) console.log('              ' + r.list.join(' '));
    console.log('              said: ' + r.said.join(' | '));
  }
  await browser.close();
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
