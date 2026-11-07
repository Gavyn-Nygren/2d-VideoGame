#!/usr/bin/env node
// Screenshots of 21-4 Paper Plane Race, with both planes flown by a scripted "person" (p.input / pendingAct, like the
// keyboard would), for checking the look. deviceScaleFactor 1.
//   node tools/w21/paperplane-shots.js [--w=1280 --h=800] [--touch=1] [--solo=1] [--course=city] [--out=build/w21]
'use strict';
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const w = +opt('w', 1280), h = +opt('h', 800), touch = +opt('touch', 0), solo = +opt('solo', 0), course = opt('course', null), gold = +opt('gold', 0);
const out = path.resolve(opt('out', 'build/w21')), tag = 'pp-' + w + 'x' + h + (touch ? 't' : '') + (solo ? 's' : '') + (course ? '-' + course : '') + (gold ? 'g' : '');
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const ctxo = { viewport: { width: w, height: h }, deviceScaleFactor: 1 };
  if (touch) Object.assign(ctxo, { hasTouch: true, isMobile: true });
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
    const i = P.LEVELS.findIndex(l => l.name === 'Paper Plane Race');
    G.manual = true;
    P.MODES.paperplane.testCourse = course;
    if (solo) { P.cpuSetCfg('players', 1); P.cpuSetCfg('human', 0); }
    if (touch) { try { enableTouch(); } catch (e) { /* */ } }
    P.loadLevel(i);
    G.cpuOn = solo ? [false, true] : [false, false];
    P.fit();
    // --gold=1: Bo leads 2-0, so Pip flies round 3 with gold wings and 2 gold flaps
    if (gold) { G.match.wins = [0, 2]; G.match.round = 3; P.MODES.paperplane.resetRound(3, { first: false, replay: false, suddenDeath: false, wins: [0, 2] }); }
    // the scripted person for each plane that the computer doesn't fly: hold the throw for a while, then steer toward
    // the next ring or a comfy height, tap the action now and then
    window.__drive = () => {
      const st = G.mst, m = G.match;
      for (const p of G.players) {
        if (G.cpuOn[p.id]) continue;
        const inp = p.input, me = st.pl && st.pl[p.id];
        for (const k in inp) inp[k] = false;
        if (!me || !m || m.phase !== 'live') continue;
        let act = false;
        if (me.phase === 'hold') act = st.rt < 0.35 + p.id * 0.25 + 0.62 * (p.id ? 0.85 : 1);
        else if (me.phase === 'fly') {
          const ring = st.course.rings.find(g => !g.got[p.id] && g.x > me.x + 30 && g.x - me.x < 360);
          const ty = ring ? ring.y : 250 + p.id * 40;
          if (me.y > ty + 20 && me.sp > 170) inp.jump = true; else if (me.y < ty - 20) inp.down = true;
          if (me.y > 430 && me.flaps > 0) act = Math.floor(st.rt * 4) % 2 === 0;
        }
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
      if (until === 'charge' && st.pl && st.pl.some(q => q.charging && q.power > 0.5)) return true;
      if (until === 'bump' && st.course && st.course.obs.some(o => o.hitT < 0.15)) return true;
      if (until === 'ring' && st.course && st.course.rings.some(g => g.gotT[0] < 0.1 || g.gotT[1] < 0.1)) return true;
      if (until === 'near' && st.pl && st.pl.some(q => q.x > st.course.len - 600)) return true;
      if (until === 'end' && m.phase === 'end' && m.t > 0.5) return true;
      if (until === 'live' && m.phase === 'live') return true;
    }
    return false;
  }, { secs, until });
  await run(1.0); await shot('01-intro');
  await run(2.2); await shot('02-roundcard');
  await run(1.2); await shot('03-count');
  await run(5, 'live'); await run(5, 'charge'); await shot('04-throw');
  await run(1.6); await shot('05-launch');
  await run(4); await shot('06-flight');
  await run(20, 'ring'); await shot('07-ring');
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
