#!/usr/bin/env node
// Integration check for 30-1: the whole level in a REAL (non-manual) page, the computer playing both, live loop driven
// by a fast fake clock. Samples state at every era change, takes screenshots after real transitions, then replays.
//   node tools/w30/int-seq.js [--passes=2] [--out=build/w30/int/seq] [--fps=30] [--phone]
'use strict';
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const passes = +opt('passes', 2), out = path.resolve(opt('out', 'build/w30/int/seq')), fps = +opt('fps', 30);
const solo = opt('solo', '');   // '' = computer plays both
fs.mkdirSync(out, { recursive: true });

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: args.includes('--phone') ? { width: 844, height: 390 } : { width: 1280, height: 800 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('PAGEERROR ' + String(e)));
  await page.addInitScript(({ fps }) => {
    try { localStorage.clear(); } catch (e) { /* */ }
    const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    let seeded = gen(1);
    window.__seed = n => { seeded = gen((n >>> 0) || 1); };
    Math.random = () => seeded();
    const real = window.requestAnimationFrame.bind(window);
    let q = [], now = 0, pumping = false;
    window.__fast = false; window.__hold = false; window.__done = false;
    const ch = new MessageChannel();
    const pump = () => {
      if (window.__hold || window.__done) { setTimeout(pump, 10); return; }
      const cbs = q; q = [];
      if (!now) now = performance.now();
      now += 1000 / fps;
      for (const cb of cbs) cb(now);
      if (window.__sample) window.__sample();
      if (q.length) ch.port2.postMessage(0); else pumping = false;
    };
    ch.port1.onmessage = pump;
    window.requestAnimationFrame = cb => {
      if (!window.__fast) return real(cb);
      q.push(cb);
      if (!pumping) { pumping = true; ch.port2.postMessage(0); }
      return 0;
    };
  }, { fps });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.MODES && window.__pipbo.MODES.timethief);

  await page.evaluate(() => {
    const P = window.__pipbo, G = P.G;
    const base = Object.keys(P.makePlayer(0));
    window.__log = { eras: [], snaps: [], notes: [] };
    // draw only every Nth frame (drawing is the slow part in headless Chromium), and always right before a screenshot
    const realRender = window.render; let rn = 0; const every = window.__renderEvery || 8;
    window.render = dt => { if (!window.__fast || (rn++ % every) === 0) realRender(dt); };
    const holdShot = name => { realRender(0); window.__shot = name; window.__hold = true; };
    let lastNo = -1, lastSt = null, era = null, frames = 0, shots = [], lastSnapT = -99, cutSeen = null;
    const txt = sel => Array.from(document.querySelectorAll(sel)).map(e => e.textContent.trim().replace(/\s+/g, ' ')).join(' || ');
    const state = () => {
      const st = G.mst, ps = G.players;
      return {
        phase: st.phase, no: st.phaseNo, room: G.room, time: +G.time.toFixed(2), phT: +st.phT.toFixed(2), introT: +G.introT.toFixed(2), mode: G.mode,
        idle: !!st.idle, idleT: +(st.idleT || 0).toFixed(1), statIdle: +(st.stats.idleT || 0).toFixed(1), cut: st.cut ? st.cut.kind + '@' + st.cut.t.toFixed(1) : null,
        cam: [Math.round(st.cam.x), Math.round(st.cam.y)], say: st.say && st.say.text, news: st.news && st.news.text, hints: st.hints.map(h => h && h.text),
        pops: st.pops.length, fly: st.fly && st.fly.kind, particles: G.particles.length, shake: +G.shake.toFixed(2), labKey: st.labKey, badgeT: +st.badgeT.toFixed(1), swapT: st.swapT, arriveT: st.arriveT,
        loot: st.loot.map(b => (b ? 1 : 0)).join(''), bumps: st.stats.bumps.join('+') + ' t' + st.stats.team, help: st.stats.help.length, kinds: JSON.stringify(st.stats.kinds), phaseT: (st.stats.phaseT || []).join(','),
        thief: { x: Math.round(st.thief.x), y: Math.round(st.thief.y), pose: st.thief.pose, mood: st.thief.mood, jet: st.thief.jet, item: st.thief.item, hidden: st.thief.hidden },
        players: ps.map(p => ({ x: Math.round(p.x), y: Math.round(p.y), w: p.w, h: p.h, alive: p.alive, stun: +(p.stun || 0).toFixed(2), vx: Math.round(p.vx), vy: Math.round(p.vy),
          extra: Object.keys(p).filter(k => !base.includes(k)).join(','), input: Object.keys(p.input).filter(k => p.input[k]).join(',') })),
        bubbles: P.CPU.bubbles ? P.CPU.bubbles.map(b => (b && b.t > 0 ? b.text : null)) : null,
        actLabels: txt('[data-actlabel]'), legend: txt('[data-leg]'), rootCls: document.documentElement.className,
        overlay: (document.getElementById('overlay') || {}).hidden === false ? txt('#overlay h2, #overlay .eyebrow') : '',
        Ckeys: Object.keys(P.C).length, Chash: JSON.stringify(P.C).length, stKeys: Object.keys(st).sort().join(','), phKeys: Object.keys(st.ph || {}).length,
        Gkeys: Object.keys(G).sort().join(','), def: G.level.def.title + ' #' + G.level.def.roomIndex,
      };
    };
    window.__state = state;
    window.__sample = () => {
      const st = G.mst;
      if (!st || !st.thief || !window.__run) return;
      frames++;
      if (st !== lastSt || st.phaseNo !== lastNo) {
        // a new era object (transition, restart, checkpoint)
        era = { pass: window.__pass, no: st.phaseNo, phase: st.phase, how: st !== lastSt ? 'load' : 'portal', first: state(), f0: frames, t0: G.time, shots: 0 };
        window.__log.eras.push(era);
        lastSt = st; lastNo = st.phaseNo; cutSeen = null;
        shots = [0.35, 1.9, 3.9, 6.5].map(s => ({ at: G.time + s, tag: 'e' + st.phaseNo + '-' + st.phase + '-t' + s }));
      }
      if (shots.length && G.time >= shots[0].at) holdShot('p' + window.__pass + '-' + shots.shift().tag);
      if (st.cut && !cutSeen) { cutSeen = { kind: st.cut.kind, time0: G.time, phT: st.phT, idle0: !!st.idle, idleT0: st.idleT, s0: state() }; era.cut = cutSeen; era.live = state(); }
      if (st.cut && cutSeen) {
        cutSeen.time1 = G.time; cutSeen.t = st.cut.t; cutSeen.idle1 = cutSeen.idle1 || !!st.idle; cutSeen.maxIdleT = Math.max(cutSeen.maxIdleT || 0, st.idleT);
        cutSeen.last = state();
        if (st.cut.kind === 'leave' && !cutSeen.shot && st.cut.t >= 3.6) { cutSeen.shot = true; holdShot('p' + window.__pass + '-e' + st.phaseNo + '-' + st.phase + '-warp'); }
        if (st.cut.kind === 'end' && !cutSeen.shot && st.cut.t >= 4.5) { cutSeen.shot = true; holdShot('p' + window.__pass + '-ending'); }
      }
      if (G.time - lastSnapT >= 5 || G.time < lastSnapT) { lastSnapT = G.time; const s = state(); window.__log.snaps.push({ pass: window.__pass, t: s.time, phase: s.phase, phT: s.phT, idle: s.idle, cut: s.cut, cam: s.cam, players: s.players.map(p => p.x + ',' + p.y + (p.alive ? '' : ' dead')), bumps: s.bumps, particles: s.particles, hints: s.hints, news: s.news, labKey: s.labKey, bubbles: s.bubbles }); }
      if (G.mode === 'result' && !window.__resultSeen) { window.__resultSeen = true; holdShot('p' + window.__pass + '-result'); window.__passDone = true; }
    };
  });

  const idx = await page.evaluate(() => window.__pipbo.LEVELS.findIndex(l => l.mode === 'timethief'));
  const results = [];
  for (let pass = 1; pass <= passes; pass++) {
    const t0 = Date.now();
    await page.evaluate(({ idx, pass, solo }) => {
      const P = window.__pipbo, G = P.G;
      window.__seed(4242); window.__pass = pass; window.__passDone = false; window.__resultSeen = false; window.__run = true;
      G.cpuOn = solo === '' ? [true, true] : [solo !== '0', solo !== '1'];
      if (pass === 1) P.loadLevel(idx);
      else document.querySelector('#overlay [data-act="replay"]').click();   // "Play again" on the results card
      window.__fast = true;
    }, { idx, pass, solo });
    for (;;) {
      await page.waitForFunction(() => window.__hold, null, { timeout: 0, polling: 20 });
      const name = await page.evaluate(() => window.__shot);
      await page.screenshot({ path: path.join(out, name + '.png') });
      const done = await page.evaluate(() => { const d = window.__passDone; if (!d) window.__hold = false; return d; });
      if (done) break;
      if (Date.now() - t0 > 40 * 60000) { console.log('TIMEOUT'); break; }
    }
    const res = await page.evaluate(() => ({ card: document.getElementById('overlay').innerText, rec: JSON.stringify(window.__pipbo.G.results[window.__pipbo.G.levelIndex]), cp: localStorage.getItem('tth:cp') || Object.keys(localStorage).filter(k => /tth/.test(k)).map(k => k + '=' + localStorage.getItem(k)).join(';'), time: window.__pipbo.G.time }));
    results.push(res);
    console.log(`pass ${pass}: result after ${(res.time).toFixed(0)}s game, wall ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    await page.evaluate(() => { window.__hold = false; });
  }
  const log = await page.evaluate(() => window.__log);
  fs.writeFileSync(path.join(out, 'log.json'), JSON.stringify({ log, results, errors }, null, 1));
  console.log('errors:', errors.length, errors.slice(0, 10));
  await browser.close();
})().catch(e => { console.error(e); process.exit(2); });
