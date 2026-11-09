#!/usr/bin/env node
// Shipwreck Lights: a second reviewer's adversarial checks for 22-3.
//  crateback  after a crate tunnel is clear, the grabber swims round and pushes the crate back LEFT into the tunnel
//             (the lantern still on the left side): the tunnel must stay open (no soft-lock)
//  still      2 players: the lantern parks Glimmer on the lever and then presses nothing (a patient partner); the grabber
//             swims about without pressing the action: hints and gold help must still come, the clock must not "rest"
//  restart    R (restart) while playing, while a section is clearing, during the chest ending and on the results card;
//             Esc pause / resume mid-section: nothing throws, the level comes back fresh
//  result     the whole level played by the computer pair through the real frame loop to the results card
//  pads       1-player mode on a phone: the computer's touch pad is hidden (visibility), the person's shown
// Usage: node tools/w22/shipwreck-qa.js [--only=crateback,still,restart,result,pads]
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const only = opt('only', 'crateback,still,restart,result,pads').split(',');
let fails = 0;
const check = (name, ok, info) => { if (!ok) fails++; console.log((ok ? 'ok   ' : 'FAIL ') + name.padEnd(34), JSON.stringify(info)); };
(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const newPage = async (o) => {
    const page = await browser.newPage(o || {});
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.addInitScript(() => {
      const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
      Math.random = gen(31337);
    });
    await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
    await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
    await page.evaluate(() => {
      const P = window.__pipbo, G = P.G;
      window.__load = (room, cpuOn) => {
        P.CPU.cfg.players = 2; P.cpuApplyCfg();
        G.manual = true; G.cpuOn = cpuOn; P.CPU.filter = null;
        P.loadLevel(P.LEVELS.findIndex(l => l.name === 'Shipwreck Lights'));
        for (let k = 0; k < room; k++) P.nextRoom();
        G.introT = 0;
      };
      window.__set = (p, o) => { for (const k of ['left', 'right', 'down', 'up', 'act', 'jump']) p.input[k] = !!o[k]; if (o.act && !p.prevAct) p.pendingAct = true; p.prevAct = !!o.act; };
      window.__tp = (p, x, y) => { const st = G.mst; p.x = x - p.w / 2 - st.camX; p.y = y - p.h / 2; p.vx = p.vy = 0; };
      window.__wx = p => p.x + G.mst.camX + p.w / 2;
    });
    return page;
  };

  if (only.includes('crateback')) {
    const page = await newPage();
    for (const room of [0, 2, 3]) {
      const r = await page.evaluate(room => {
        const P = window.__pipbo, G = P.G;
        window.__load(room, [true, true]);
        const st = G.mst, c = st.crates[0];
        let n = 0;
        while (!c.done && n++ < 120 / P.DT) P.step(P.DT);
        if (!c.done) return { err: 'crate never cleared' };
        // stop the computer; the lantern waits on the left of the tunnel, the grabber goes right of the crate
        G.cpuOn = [false, false];
        const L = G.players[st.lantern], Gb = G.players[st.grabber];
        const wall = st.walls.find(w => w.look === 'crates' && w.x1 <= c.x0 + 5 && w.x1 > c.x0 - 400);
        window.__tp(L, wall.x0 - 60, 440);
        window.__tp(Gb, c.x0 + c.w + 20, 476 - 16);
        const x0 = c.x0;
        for (let k = 0; k < 8 / P.DT; k++) { window.__set(Gb, { left: true, down: true }); window.__set(L, {}); P.step(P.DT); }
        window.__set(Gb, {});
        return { room, clearX: c.clearX, wallX1: wall.x1, crateBefore: Math.round(x0), crateAfter: Math.round(c.x0), tunnelBlocked: c.x0 < wall.x1 };
      }, room);
      check('crateback room ' + room, !r.err && !r.tunnelBlocked, r);
    }
    await page.close();
  }

  if (only.includes('still')) {
    const page = await newPage();
    const r = await page.evaluate(() => {
      const P = window.__pipbo, G = P.G;
      window.__load(0, [false, false]);
      const st = G.mst, L = G.players[st.lantern], Gb = G.players[st.grabber], lever = st.trig.l1;
      // the lantern parks Glimmer on the lever, then presses nothing at all
      window.__tp(L, lever.x - 40, lever.y + 10); window.__tp(Gb, lever.x - 160, 380);
      let hintSeen = 0, restSeen = 0, goldAt = null;
      const t0 = G.time;
      for (let k = 0; k < 60 / P.DT; k++) {
        window.__set(L, {});
        const ph = Math.floor(k * P.DT / 1.5) % 2;
        window.__set(Gb, { up: ph === 0, down: ph === 1 });   // swims about, never presses the action
        P.step(P.DT);
        if (st.news && /^Hint/.test(st.news.s)) hintSeen++;
        if (st.rest) restSeen++;
        if (lever.gold && goldAt == null) goldAt = +(G.time - t0).toFixed(1);
      }
      return { lit: P.MODES.shipwreck.isLit(st, lever.x, lever.y), hints: st.stats.hints, hintFrames: hintSeen, restFrames: restSeen, goldLeverAt: goldAt, clock: +(G.time - t0).toFixed(1) };
    });
    check('still lantern: hint comes', r.hints > 0, r);
    check('still lantern: clock keeps going', r.restFrames === 0 && r.clock > 59, r);
    // both away: the clock still rests
    const r2 = await page.evaluate(() => {
      const P = window.__pipbo, G = P.G;
      window.__load(0, [false, false]);
      const st = G.mst; let rest = 0; const t0 = G.time;
      for (let k = 0; k < 30 / P.DT; k++) { window.__set(G.players[0], {}); window.__set(G.players[1], {}); P.step(P.DT); if (st.rest) rest++; }
      return { restFrames: rest, clock: +(G.time - t0).toFixed(1), gold: st.goldUsed, hints: st.stats.hints };
    });
    check('both away: clock rests, no gold', r2.restFrames > 0 && r2.clock < 17 && !r2.gold.length, r2);
    await page.close();
  }

  if (only.includes('restart')) {
    const page = await newPage();
    await page.evaluate(() => { const G = window.__pipbo.G; window.__load(0, [true, true]); G.manual = false; G.introT = 0; });
    // let the real frame loop run the computer pair for a bit, pause, resume, restart
    await page.waitForTimeout(3000);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    const paused = await page.evaluate(() => window.__pipbo.G.mode);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(600);
    const resumed = await page.evaluate(() => window.__pipbo.G.mode);
    check('pause / resume', paused === 'paused' && resumed === 'play', { paused, resumed });
    // restart during a section clear
    const s = await page.evaluate(() => {
      const P = window.__pipbo, G = P.G; G.manual = true;
      window.__load(0, [true, true]);
      let n = 0; while (G.mst.state !== 'clear' && n++ < 120 / P.DT) P.step(P.DT);
      return G.mst.state;
    });
    await page.evaluate(() => { window.__pipbo.G.manual = false; });
    await page.keyboard.press('KeyR');
    await page.waitForTimeout(500);
    const a = await page.evaluate(() => { const G = window.__pipbo.G; return { mode: G.mode, room: G.room, state: G.mst.state, t: +G.time.toFixed(1), bonks: G.mst.stats.bonks }; });
    check('restart while a section clears', s === 'clear' && a.room === 0 && a.state === 'play' && a.t < 2, { s, a });
    // restart during the chest ending
    const e = await page.evaluate(() => {
      const P = window.__pipbo, G = P.G; G.manual = true;
      window.__load(3, [true, true]);
      let n = 0; while (G.mst.state !== 'end' && n++ < 200 / P.DT) P.step(P.DT);
      for (let k = 0; k < 1 / P.DT; k++) P.step(P.DT);
      G.manual = false;
      return G.mst.state;
    });
    await page.keyboard.press('KeyR');
    await page.waitForTimeout(500);
    const b = await page.evaluate(() => { const G = window.__pipbo.G; return { mode: G.mode, room: G.room, state: G.mst.state, cleared: !!G.mst.cleared }; });
    check('restart during the chest ending', e === 'end' && b.room === 0 && b.state === 'play' && !b.cleared, { e, b });
    await page.close();
  }

  if (only.includes('result')) {
    const page = await newPage();
    await page.evaluate(() => { const G = window.__pipbo.G; window.__load(3, [true, true]); });
    const r = await page.evaluate(() => {
      const P = window.__pipbo, G = P.G;
      let n = 0; while (G.mode === 'play' && n++ < 300 / P.DT) P.step(P.DT);
      return { mode: G.mode, state: G.mst.state };
    });
    // let the real frame loop show the results card
    await page.evaluate(() => { window.__pipbo.G.manual = false; });
    await page.waitForTimeout(2500);
    const card = await page.evaluate(() => { const o = document.querySelector('#overlay'); return { mode: window.__pipbo.G.mode, text: o ? o.innerText.replace(/\s+/g, ' ').slice(0, 400) : '' }; });
    await page.screenshot({ path: 'build/w22/shipwreck-qa-results.png' });
    check('results card', /Medal|Gold|Silver|Bronze/.test(card.text) && /Treasure/.test(card.text), { r, card });
    await page.keyboard.press('KeyR');
    await page.waitForTimeout(500);
    const back = await page.evaluate(() => { const G = window.__pipbo.G; return { mode: G.mode, room: G.room, state: G.mst.state }; });
    check('restart from the results card', back.mode === 'play' && back.room === 0 && back.state === 'play', back);
    await page.close();
  }

  if (only.includes('pads')) {
    for (const [w, h] of [[844, 390], [390, 844]]) {
      const page = await newPage({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true });
      for (const human of [0, 1]) {
        const r = await page.evaluate(human => {
          const P = window.__pipbo, G = P.G;
          document.documentElement.classList.add('has-touch'); window.dispatchEvent(new Event('resize'));
          P.CPU.cfg.players = 1; P.CPU.cfg.human = human; P.cpuApplyCfg(); G.manual = true;
          P.loadLevel(P.LEVELS.findIndex(l => l.name === 'Shipwreck Lights')); G.introT = 0;
          for (let k = 0; k < 20; k++) P.step(P.DT);
          const vis = sel => { const e = document.querySelector(sel); return e ? getComputedStyle(e).visibility !== 'hidden' && getComputedStyle(e).display !== 'none' : null; };
          return { human, mine: vis(human === 0 ? '#padPip' : '#padBo'), cpus: vis(human === 0 ? '#padBo' : '#padPip') };
        }, human);
        check(`pads ${w}x${h} person ${r.human ? 'Bo' : 'Pip'}`, r.mine && !r.cpus, r);
      }
      await page.screenshot({ path: `build/w22/shipwreck-qa-1p-${w}x${h}.png` });
      await page.close();
    }
  }

  if (errors.length) { fails++; console.log('ERRORS\n' + [...new Set(errors)].join('\n')); }
  console.log(fails ? fails + ' FAILED' : 'all passed');
  await browser.close();
  process.exit(fails ? 1 : 0);
})();
