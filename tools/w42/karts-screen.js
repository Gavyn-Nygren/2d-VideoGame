#!/usr/bin/env node
// 42-4 Go-Kart Grand Prix: are both karts on the screen? Scripted people (the same ones as karts-people.js) race the
// computer with the real chase camera running (the scene is built, the GPU draw itself is skipped, so it is quick),
// and each drawn frame both karts' screen spots are checked. Off the screen only counts while the gap is under 90% of
// the breakaway limit (past that the kart behind is meant to sink off the bottom edge).
// Usage: node tools/w42/karts-screen.js [--who=center,short,...] [--skill=hard] [--side=0] [--seed=1] [--max=240] [--size=1280x720]
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const whos = opt('who', 'center,keys,short,wide,rammer,wrong').split(','), skill = opt('skill', 'hard'), side = +opt('side', 0), seed = +opt('seed', 1), maxT = +opt('max', 240);
const [vw, vh] = opt('size', '1280x720').split('x').map(Number);
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await (await browser.newContext({ viewport: { width: vw, height: vh } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.addInitScript(() => {
    const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    let seeded = gen(1); const other = gen(12345);
    window.__inStep = false; window.__seed = n => { seeded = gen((n >>> 0) || 1); };
    Math.random = () => (window.__inStep ? seeded() : other());
  });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  if (!await page.evaluate(() => window.__pipbo.K3D.need())) { console.log('3D failed'); process.exit(1); }
  for (const who of whos) {
    const r = await page.evaluate(async ({ skill, seed, who, side, maxT }) => {
      const P = window.__pipbo, G = P.G, K3D = P.K3D, TR = PARKKARTS_TRACK, PZ = PARKKARTS_PRIZES;
      const i = P.LEVELS.findIndex(l => l.mode === 'parkkarts');
      window.__seed(seed * 7919 + side * 31);
      G.manual = true; K3D.noRender = false;
      P.CPU.errs.clear(); P.CPU.skillOf = [skill, skill];
      G.cpuOn = [true, true];
        let pt = 0, rnd = seed * 2654435761 >>> 0, mashOut = {}, mashT = 0;
      const rand = () => { rnd ^= rnd << 13; rnd >>>= 0; rnd ^= rnd >> 17; rnd ^= rnd << 5; rnd >>>= 0; return rnd / 4294967296; };
      // steer at a point: the error angle (+ = the point is to the right of the nose)
      const errTo = (k, x, z) => { const want = Math.atan2(x - k.x, z - k.z); const e = Math.atan2(Math.sin(want - k.yaw), Math.cos(want - k.yaw)); return -e; };
      const keysFor = (e, dead) => (e > dead ? { right: true } : e < -dead ? { left: true } : {});
      const bend = k => { let t = 0; for (let d = 2; d < 20; d += 2) t += TR.at(k.s + d).turn * 2; return t; };
      const late = [];
        const person = (p, dt) => {
        pt += dt;
        const st = G.mst, k = st.karts && st.karts[p.id]; if (!k) return {};
        const o = st.karts[1 - p.id];
        const mid = d => { const q = TR.pos(k.s + d, 0); return errTo(k, q[0], q[1]); };
        const base = who === 'late' ? 'keysd' : who;
        let out = {};
        switch (base) {
          case 'keys': out = keysFor(mid(9), 0.08); break;
          case 'keysd': { const e = mid(9), t = bend(k); out = keysFor(e, 0.08); if (Math.abs(t) > 0.7) out.jump = true; if (k.prize) out.act = pt % 0.4 < 0.2; break; }
          case 'center': { const e = mid(8 + k.v * 0.5), t = bend(k); out = { ax: Math.max(-1, Math.min(1, e * 2.2)) }; if (Math.abs(t) > 0.9 && k.spark < 2) out.jump = true; if (k.prize) out.act = pt % 0.4 < 0.2; break; }
          case 'rammer': { const ds = PZ.sd(o.s, k.s); if (Math.abs(ds) < 14 && !o.crane) out = keysFor(errTo(k, o.x + Math.sin(o.yaw) * 2, o.z + Math.cos(o.yaw) * 2), 0.05); else out = keysFor(mid(9), 0.08); if (k.prize) out.act = pt % 0.4 < 0.2; break; }
          case 'blocker': { const ds = PZ.sd(o.s, k.s), lat = ds < 0 && ds > -20 ? Math.max(-3, Math.min(3, o.lat)) : 0; const q = TR.pos(k.s + 9, lat); out = { ax: Math.max(-1, Math.min(1, errTo(k, q[0], q[1]) * 2.2)) }; if (k.prize) out.act = pt % 0.4 < 0.2; break; }
          case 'wrong': out = pt % 17 > 13 ? { left: true, down: pt % 17 < 14 } : keysFor(mid(9), 0.08); break;
          case 'short': {
            let tgt = null;
            for (const B of TR.branches) { const ds = PZ.sd(B.s0, k.s); if (k.on >= 0 && TR.branches[k.on] === B) { const g = B.at(Math.min(B.len, k.bs + 7)); tgt = [g.x, g.z]; } else if (ds > -4 && ds < 22) { const g = B.at(Math.max(1, 9 - Math.max(0, ds))); tgt = [g.x, g.z]; } }
            out = tgt ? keysFor(errTo(k, tgt[0], tgt[1]), 0.06) : keysFor(mid(9), 0.08); break;
          }
          case 'wide': { const t = bend(k), f = TR.at(k.s + 8), lat = Math.abs(t) > 0.25 ? Math.sign(t) * (f.hw + 1.2) : 0; const q = TR.pos(k.s + 8, lat); out = keysFor(errTo(k, q[0], q[1]), 0.08); break; }
          case 'mash': { mashT -= dt; if (mashT <= 0) { mashT = 0.2; mashOut = { left: rand() < 0.4, right: rand() < 0.4, jump: rand() < 0.5, down: rand() < 0.2, act: rand() < 0.5 }; } out = mashOut; break; }
          case 'brakes': out = Object.assign(keysFor(mid(9), 0.08), { down: pt % 2 < 1 }); break;
          case 'zigzag': out = pt % 1 < 0.5 ? { left: true } : { right: true }; break;
        }
        if (who === 'late') { late.push(out); return late.length > 60 ? late.shift() : {}; }
        return out;
      };
      P.CPU.filter = (p, out, dt) => (p.id === side ? person(p, dt) : out);
      delete G.results[i];
      P.loadLevel(i);
      G.introT = 0;
      P.render(0.001);
      if (K3D.R) K3D.R.render = () => {};   // the camera and the scene still move; nothing is drawn
      PARKKARTS_SCENE.snap();
      const W = 960, H = 540, off = [0, 0], worst = [], byPart = {};
      let n = 0, frames = 0, both = 0;
      const steps = Math.round(maxT / P.DT);
      while (n < steps && G.mode === 'play') {
        for (let q = 0; q < 4; q++, n++) { window.__inStep = true; P.step(P.DT); window.__inStep = false; }
        P.render(4 * P.DT);
        const st = G.mst; if (!st.karts || st.phase !== 'race') continue;
        frames++;
        if (st.gap > PARKKARTS.S.LIMIT * 0.9) continue;
        let ok = true;
        for (const k of st.karts) {
          if (k.crane) continue;
          const q = K3D.toScreen(k.x, PARKKARTS_WORLD.Yk(k) + 0.6, k.z);
          const out = q.z >= 1 || q.x < 8 || q.x > W - 8 || q.y < 8 || q.y > H - 4;
          if (out) { ok = false; off[k.id] += 4 * P.DT; const part = TR.PARTS[TR.partAt(k.s)] + (k.on >= 0 ? ' (' + TR.branches[k.on].name + ')' : ''); byPart[part] = +((byPart[part] || 0) + 4 * P.DT).toFixed(2);
            if (worst.length < 6 && (!worst.length || n * P.DT - worst[worst.length - 1].t > 3)) worst.push({ t: +(n * P.DT).toFixed(1), who: ['Pip', 'Bo'][k.id], part, s: Math.round(k.s), lat: +k.lat.toFixed(1), gap: +st.gap.toFixed(1), x: Math.round(q.x), y: Math.round(q.y), z: +q.z.toFixed(3), cam: (sc => sc && { sideC: +(sc.sideC || 0).toFixed(1), sideB: +(sc.sideB || 0).toFixed(1), yawLag: +((Math.atan2(TR.at(k.s).tx, TR.at(k.s).tz) - sc.yaw) * 57.3).toFixed(0), on: st.karts.map(x => x.on), lat: st.karts.map(x => +x.lat.toFixed(1)) })(K3D.K && K3D.K.pk) }); }
        }
        if (ok) both++;
        if (frames % 300 === 0) await new Promise(r => setTimeout(r, 0));
      }
      const st = G.mst;
      return { flags: st.flags, raceT: +st.raceT.toFixed(0), frames, off: off.map(x => +x.toFixed(1)), byPart, worst };
    }, { skill, seed, who, side, maxT });
    console.log(`${who}@${['Pip', 'Bo'][side]} v ${skill}: flags ${r.flags} ${r.raceT}s  off screen: Pip ${r.off[0]}s, Bo ${r.off[1]}s  ${JSON.stringify(r.byPart)}`);
    for (const w of r.worst) console.log('    ' + JSON.stringify(w));
    if (errors.length) console.log('   PAGE ERR ' + errors.slice(0, 3).join(' | ').slice(0, 600));
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
