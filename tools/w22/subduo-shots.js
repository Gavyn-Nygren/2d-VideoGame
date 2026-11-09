#!/usr/bin/env node
// Submarine Duo screenshots: loads index.html, starts 22-1 with G.manual and G.introT = 0, and drives both seats through
// the real keyboard path (keys + pollInput) with the "kid" people from subduo-people.js (or the computer at both seats
// with --cpu=1), then saves screenshots (deviceScaleFactor 1) to build/w22/.
// Usage: node tools/w22/subduo-shots.js [--at=3,12,30] [--room=0] [--w=960] [--h=540] [--touch=1] [--intro=1] [--tag=x] [--solo=1] [--cpu=1]
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const at = opt('at', '3,12,30').split(',').map(Number), room = +opt('room', 0), vw = +opt('w', 960), vh = +opt('h', 540);
const touch = +opt('touch', 0), intro = +opt('intro', 0), tag = opt('tag', ''), solo = +opt('solo', 0), cpu = +opt('cpu', 0), out = 'build/w22';
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
  await page.addInitScript({ path: path.join(__dirname, 'subduo-people.js') });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  if (touch) await page.evaluate(() => { document.documentElement.classList.add('has-touch'); window.dispatchEvent(new Event('resize')); });
  await page.evaluate(({ room, intro, solo, cpu }) => {
    const P = window.__pipbo, G = P.G;
    if (solo) { P.CPU.cfg.players = 1; P.CPU.cfg.human = 0; P.cpuApplyCfg(); } else { P.CPU.cfg.players = 2; P.cpuApplyCfg(); G.cpuOn = cpu ? [true, true] : [false, false]; }
    G.manual = true;
    P.loadLevel(P.LEVELS.findIndex(l => l.name === 'Submarine Duo'));
    for (let k = 0; k < room; k++) P.nextRoom();
    if (!intro) G.introT = 0;
    window.__simT = 0;
    let rs = 99; const rnd = () => { rs = (rs * 16807) % 2147483647; return rs / 2147483647; };
    window.__drive = () => { for (const id of [0, 1]) if (!G.cpuOn[id]) window.__subduoPeople.drive(id, 'kid', P, rnd); };
  }, { room, intro, solo, cpu });
  for (const t of at) {
    await page.evaluate(t => {
      const P = window.__pipbo, G = P.G;
      while (window.__simT < t && (G.mode === 'play' || G.mode === 'clear')) { window.__drive(); P.pollInput(P.DT); P.step(P.DT); window.__simT += P.DT; }
    }, t);
    await page.waitForTimeout(await page.evaluate(() => window.__pipbo.G.mode === 'clear') ? 1800 : 200);
    const f = path.join(out, 'subduo-' + (tag ? tag + '-' : '') + 'r' + room + '-' + t + 's-' + vw + 'x' + vh + (touch ? '-touch' : '') + '.png');
    await page.screenshot({ path: f });
    const info = await page.evaluate(() => { const P = window.__pipbo, G = P.G, st = G.mst; return { mode: G.mode, room: G.room, time: +G.time.toFixed(1), state: st.state, plan: st.c && P.MODES.subduo.plan(st).why, pearls: st.pearls, bonks: st.stats && st.stats.bonks, hold: st.claw && st.claw.hold && st.claw.hold.kind, actBtns: [...document.querySelectorAll('.tbtn-act')].map(b => b.textContent + ':' + (b.offsetParent ? 'shown' : 'hidden')) }; });
    console.log(f, JSON.stringify(info));
  }
  if (errors.length) console.log('ERRORS:\n' + [...new Set(errors)].join('\n'));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
