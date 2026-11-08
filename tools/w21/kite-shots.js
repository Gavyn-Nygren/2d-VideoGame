#!/usr/bin/env node
// Kite Tandem screenshots: loads index.html, starts 21-2 with G.manual and G.introT = 0, and drives both players through
// the real keyboard path (keys + pollInput) like two people who follow the on-screen prompts, then saves screenshots
// (deviceScaleFactor 1) to build/w21/.
// Usage: node tools/w21/kite-shots.js [--at=3,12,30] [--room=0] [--w=960] [--h=540] [--touch=1] [--intro=1] [--tag=x] [--solo=1]
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const at = opt('at', '3,12,30').split(',').map(Number), room = +opt('room', 0), vw = +opt('w', 960), vh = +opt('h', 540);
const touch = +opt('touch', 0), intro = +opt('intro', 0), tag = opt('tag', ''), solo = +opt('solo', 0), out = 'build/w21';
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const co = { viewport: { width: vw, height: vh }, deviceScaleFactor: 1 };
  if (touch) Object.assign(co, { hasTouch: true, isMobile: true });
  const page = await browser.newPage(co);
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.addInitScript(() => {
    const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    Math.random = gen(4242);
  });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  if (touch) await page.evaluate(() => { document.documentElement.classList.add('has-touch'); });
  await page.evaluate(({ room, intro, solo }) => {
    const P = window.__pipbo, G = P.G;
    if (solo) { P.CPU.cfg.players = 1; P.CPU.cfg.human = 0; P.cpuApplyCfg(); } else { G.cpuOn = [false, false]; }
    G.manual = true;
    P.loadLevel(P.LEVELS.findIndex(l => l.name === 'Kite Tandem'));
    for (let k = 0; k < room; k++) P.nextRoom();
    if (!intro) G.introT = 0;
    window.__simT = 0;
    // two "people": they hold the keys the prompts ask for, a moment late
    const KB = [{ left: 'KeyA', right: 'KeyD', up: 'KeyW', down: 'KeyS', act: 'KeyF' }, { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown', act: 'Slash' }];
    const hold = (id, k, on) => { const c = KB[id][k]; if (on) P.keys.add(c); else P.keys.delete(c); };
    window.__drive = () => {
      const st = G.mst;
      if (!st.c || G.mode !== 'play') return;
      const pl = P.MODES.kite.plan(st), e = st.c.end, R = st.runner, K = st.rider;
      for (const id of [0, 1]) if (!(solo && P.CPU && G.cpuOn[id])) for (const k of ['left', 'right', 'up', 'down', 'act']) hold(id, k, false);
      if (!(G.cpuOn[R])) {
        const goPad = e && st.rx > e.pad0 + 60;
        hold(R, 'right', !goPad || (!e.got && st.rx < e.flagX + st.L * Math.cos(st.th) - 10));
        if (pl.jump && pl.jump.dist < (pl.jump.kind === 'gap' ? 20 : 42) && st.grounded) hold(R, 'up', true);
        if (pl.needL != null && pl.why !== 'flag' && st.L > pl.needL + 16) hold(R, 'down', true);
      }
      if (!(G.cpuOn[K])) {
        if (pl.ty != null) { const dy = st.ky - pl.ty; if (dy > 10) hold(K, 'up', true); else if (dy < -10) hold(K, 'down', true); }
        if (pl.why === 'flag') { const dx = e.flagX - st.kx; if (dx > 8) hold(K, 'right', true); else if (dx < -8) hold(K, 'left', true); }
        if (pl.birds && (G.tickN % 90) < 3) hold(K, 'act', true);
      }
    };
  }, { room, intro, solo });
  for (const t of at) {
    await page.evaluate(t => {
      const P = window.__pipbo, G = P.G;
      while (window.__simT < t && (G.mode === 'play' || G.mode === 'clear')) { window.__drive(); P.pollInput(P.DT); P.step(P.DT); window.__simT += P.DT; }
    }, t);
    await page.waitForTimeout(await page.evaluate(() => window.__pipbo.G.mode === 'clear') ? 1800 : 200);
    const f = path.join(out, 'kite-' + (tag ? tag + '-' : '') + 'r' + room + '-' + t + 's-' + vw + 'x' + vh + (touch ? '-touch' : '') + '.png');
    await page.screenshot({ path: f });
    const info = await page.evaluate(() => { const G = window.__pipbo.G, st = G.mst; return { mode: G.mode, room: G.room, time: +G.time.toFixed(1), state: st.state, stars: st.stars, tangles: st.stats && st.stats.tangles, oops: st.stats && st.stats.oops, actOn: document.documentElement.classList.contains('act-on'), actBtns: [...document.querySelectorAll('.tbtn-act')].map(b => b.textContent + ':' + (b.offsetParent ? 'shown' : 'hidden')) }; });
    console.log(f, JSON.stringify(info));
  }
  if (errors.length) console.log('ERRORS:\n' + errors.join('\n'));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
