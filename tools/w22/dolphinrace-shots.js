#!/usr/bin/env node
// Screenshots of 22-4 Dolphin Race, with both dolphins ridden by a scripted "person" (p.input / pendingAct, like the
// keyboard would), for checking the look. deviceScaleFactor 1.
//   node tools/w22/dolphinrace-shots.js [--w=1280 --h=800] [--touch=1] [--solo=1] [--course=reef] [--gold=1] [--out=build/w22]
'use strict';
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const w = +opt('w', 1280), h = +opt('h', 800), touch = +opt('touch', 0), solo = +opt('solo', 0), course = opt('course', null), gold = +opt('gold', 0);
const out = path.resolve(opt('out', 'build/w22')), tag = 'dr-' + w + 'x' + h + (touch ? 't' : '') + (solo ? 's' : '') + (course ? '-' + course : '') + (gold ? 'g' : '');
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const ctxo = { viewport: { width: w, height: h }, deviceScaleFactor: 1 };
  if (touch) Object.assign(ctxo, { hasTouch: true });
  const context = await browser.newContext(ctxo);
  const page = await context.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  await page.addInitScript(() => {
    const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    let seeded = gen(5); Math.random = () => seeded();
  });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  await page.evaluate(({ solo, course, touch, gold }) => {
    const P = window.__pipbo, G = P.G;
    const i = P.LEVELS.findIndex(l => l.name === 'Dolphin Race');
    G.manual = true;
    P.MODES.dolphinrace.testCourse = course;
    if (solo) { P.cpuSetCfg('players', 1); P.cpuSetCfg('human', 0); }
    if (touch) { try { enableTouch(); } catch (e) { /* */ } }
    P.loadLevel(i);
    G.cpuOn = solo ? [false, true] : [false, false];
    P.fit();
    // --gold=1: Bo leads 2-0, so Pip swims round 3 with gold fins and a gold head start
    if (gold) { G.match.wins = [0, 2]; G.match.round = 3; P.MODES.dolphinrace.resetRound(3, { first: false, replay: false, suddenDeath: false, wins: [0, 2] }); }
    // the scripted person for each dolphin the computer doesn't ride: stays shallow for hoops, leaps at high ones,
    // dives under things at the top, swims over things at the bottom
    const T = P.MODES.dolphinrace.test, Q = T.DLR;
    window.__drive = () => {
      const st = G.mst, m = G.match;
      for (const p of G.players) {
        if (G.cpuOn[p.id]) continue;
        const inp = p.input, me = st.pl && st.pl[p.id];
        for (const k in inp) inp[k] = false;
        if (!me || !m || m.phase !== 'live') continue;
        let act = false, ty = Q.surf + 30 + p.id * 40;
        const hoop = st.course.hoops.find(g => !g.got[p.id] && g.x > me.x + 20 && g.x - me.x < 500);
        if (hoop) ty = Q.surf + 16;
        for (const o of st.course.obs) {
          const sp = T.span(o); if (sp[1] < me.x || sp[0] > me.x + 260) continue;
          if (o.k === 'gate') { ty = (o.gt + o.gb) / 2; break; }
          if (o.k === 'buoy' || o.k === 'boat') { ty = Q.surf + 70; break; }
          if (o.k === 'weed') { ty = Math.min(ty, o.top - 30); break; }
          if (o.k === 'rock') { ty = Math.min(ty, Q.bed + 34 - o.r - 30); break; }
          if (o.k === 'turtle') { const s = T.shapes(o, st.rt); ty = s.cy > Q.surf + 120 ? Q.surf + 20 : s.cy + 60; break; }
        }
        if (!me.air) { if (me.y > ty + 12) inp.jump = true; else if (me.y < ty - 12) inp.down = true; }
        if (st.rt < 0.3 + p.id * 0.2) act = st.rt > 0.1 + p.id * 0.15;
        if (hoop && !hoop.low && !me.air && me.leapCd <= 0) { const d = hoop.x - me.x; if (d < 200 + p.id * 30 && d > 120) act = true; }
        if (act && !p.prevAct) p.pendingAct = true;
        p.prevAct = act; inp.act = act;
      }
    };
  }, { solo, course, touch, gold });
  const shot = async name => { await page.waitForTimeout(80); await page.screenshot({ path: path.join(out, tag + '-' + name + '.png') }); };
  const run = (secs, until) => page.evaluate(({ secs, until }) => {
    const P = window.__pipbo, G = P.G; const n = Math.round(secs / P.DT);
    for (let k = 0; k < n && G.mode === 'play'; k++) {
      window.__drive(); P.step(P.DT);
      const st = G.mst, m = G.match;
      if (until === 'air' && st.pl && st.pl.some(q => q.air && q.vy < -100 && q.y < 170)) return true;
      if (until === 'bump' && st.course && st.course.obs.some(o => o.hitT < 0.15)) return true;
      if (until === 'hoop' && st.course && st.course.hoops.some(g => !g.low && (g.gotT[0] < 0.1 || g.gotT[1] < 0.1))) return true;
      if (until === 'near' && st.pl && st.pl.some(q => q.x > st.course.len - 600)) return true;
      if (until === 'end' && m.phase === 'end' && m.t > 0.5) return true;
      if (until === 'live' && m.phase === 'live') return true;
    }
    return false;
  }, { secs, until });
  await run(1.0); await shot('01-intro');
  await run(2.2); await shot('02-roundcard');
  await run(1.2); await shot('03-count');
  await run(5, 'live'); await run(0.3); await shot('04-go');
  await run(3); await shot('05-swim');
  await run(20, 'air'); await shot('06-leap');
  await run(20, 'hoop'); await shot('07-hoop');
  await run(20, 'bump'); await run(0.12); await shot('08-bump');
  await run(8); await shot('09-mid');
  await run(60, 'near'); await shot('10-finish');
  await run(30, 'end'); await shot('11-banner');
  await run(4); await shot('12-round2card');
  await run(14); await shot('13-round2');
  const actBtn = await page.evaluate(() => { const el = document.querySelector('#padPip .tbtn-act'); if (!el) return 'none'; const r = el.getBoundingClientRect(); return el.textContent + ' ' + Math.round(r.width) + 'x' + Math.round(r.height) + ' visible=' + (el.offsetParent !== null); });
  console.log('act button:', actBtn);
  await page.evaluate(() => { const P = window.__pipbo, G = P.G; let n = 0; while (G.mode === 'play' && n++ < 120 * 900) { window.__drive(); P.step(P.DT); } });
  await page.waitForTimeout(1600); await shot('14-results');
  console.log(errors.length ? errors.join('\n') : 'no console errors');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
