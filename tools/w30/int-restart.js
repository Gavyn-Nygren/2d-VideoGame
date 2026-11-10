#!/usr/bin/env node
// Integration check for 30-1: eras entered out of their usual path, in a REAL (non-manual) page with the computer pair:
// R mid-era, R during the portal cutscene, R during the arrival warp, another level and back, R in the ending,
// R on the results card. Prints one line per check (ok / DIFF).
//   node tools/w30/int-restart.js [--from=0] [--to=9] [--out=build/w30/int/rs]
'use strict';
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const from = +opt('from', 0), to = +opt('to', 9), out = path.resolve(opt('out', 'build/w30/int/rs'));
fs.mkdirSync(out, { recursive: true });
const ORDER = ['dino', 'henge', 'troy', 'olympics', 'vikings', 'davinci', 'wright', 'moon', 'finale', 'race'];
const LOOT = 8;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('PAGEERROR ' + String(e)));
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('int')) { try { localStorage.clear(); } catch (e) { /* */ } sessionStorage.setItem('int', '1'); }
    const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    let seeded = gen(1);
    window.__seed = n => { seeded = gen((n >>> 0) || 1); };
    Math.random = () => seeded();
    const real = window.requestAnimationFrame.bind(window);
    let q = [], now = 0, pumping = false;
    window.__fast = false; window.__hold = true;
    const ch = new MessageChannel();
    const pump = () => {
      if (window.__hold) { setTimeout(pump, 5); return; }
      const cbs = q; q = [];
      if (!now) now = performance.now();
      now += 1000 / 30;
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
  });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.MODES && window.__pipbo.MODES.timethief);
  await page.evaluate(() => {
    const P = window.__pipbo, G = P.G;
    const base = Object.keys(P.makePlayer(0));
    const realRender = window.render; let rn = 0;
    window.render = dt => { if (!window.__fast || (rn++ % 8) === 0) realRender(dt); };
    window.__realRender = realRender;
    const txt = sel => Array.from(document.querySelectorAll(sel)).map(e => e.textContent.trim().replace(/\s+/g, ' ')).join(' || ');
    window.__dom = () => ({ actLabels: txt('[data-actlabel]'), legend: txt('[data-leg]'), rootCls: document.documentElement.className, C: JSON.stringify(P.C),
      players: G.players.map(p => ({ w: p.w, h: p.h, alive: p.alive, extra: Object.keys(p).filter(k => !base.includes(k)).join(',') })), particles: G.particles.length, shake: G.shake });
    window.__state = () => {
      const st = G.mst, ps = G.players;
      if (!st || !st.thief) return { none: true, mode: G.mode };
      return {
        phase: st.phase, no: st.phaseNo, room: G.room, time: +G.time.toFixed(2), phT: +st.phT.toFixed(2), introT: +G.introT.toFixed(2), mode: G.mode,
        idle: !!st.idle, cut: st.cut ? st.cut.kind : null, cam: [Math.round(st.cam.x), Math.round(st.cam.y)], say: st.say && st.say.text, news: st.news && st.news.text, hints: st.hints.map(h => h && h.text),
        pops: st.pops.length, fly: st.fly && st.fly.kind, particles: G.particles.length, labKey: st.labKey, arriveT: +st.arriveT.toFixed(2), resumed: st.resumed,
        loot: st.loot.map(b => (b ? 1 : 0)).join(''), bumps: st.stats.bumps.join('+') + ' t' + st.stats.team, help: st.stats.help.length, phaseT: (st.stats.phaseT || []).map(v => (v == null ? '-' : v)).join(','),
        own: JSON.stringify(st.stats[st.phase]), statsKeys: Object.keys(st.stats).join(','),
        thief: [Math.round(st.thief.x), Math.round(st.thief.y), st.thief.pose, st.thief.mood, st.thief.jet, st.thief.item, st.thief.hidden, st.thief.alpha].join('/'),
        players: ps.map(p => [Math.round(p.x), Math.round(p.y), p.w, p.h, p.alive, Object.keys(p).filter(k => !base.includes(k)).join(',')].join('/')),
        bubbles: P.CPU.bubbles.map(b => (b && b.t > 0 ? b.text : null)),
        actLabels: txt('[data-actlabel]'), legend: txt('[data-leg]'), rootCls: document.documentElement.className, C: JSON.stringify(P.C).length,
        cp: (() => { try { const c = JSON.parse(localStorage.getItem('pipbo:tth:cp')); return c ? { era: c.era, time: c.time, loot: c.loot.map(b => (b ? 1 : 0)).join(''), bumps: c.stats.bumps.join('+') + ' t' + c.stats.team, phaseT: (c.stats.phaseT || []).join(',') } : null; } catch (e) { return 'ERR'; } })(),
        def: G.level.def.title + ' #' + G.level.def.roomIndex, ph: Object.keys(st.ph || {}).length,
      };
    };
    let cond = null, t0 = 0, maxT = 0, played = 0;
    window.__sample = () => {
      if (!cond) return;
      played += 1 / 60;
      let r = false; try { r = cond(G, G.mst, P); } catch (e) { r = 'ERR ' + e; }
      if (r || performance.now() - t0 > maxT) { window.__res = r || 'TIMEOUT'; cond = null; window.__realRender(0); window.__hold = true; }
    };
    window.__until = (src, wallMs) => { cond = new Function('G', 'st', 'P', 'return (' + src + ');'); t0 = performance.now(); maxT = wallMs; window.__res = null; window.__fast = true; window.__hold = false; };
  });
  const until = async (src, wallMs = 240000) => {
    await page.evaluate(({ src, wallMs }) => window.__until(src, wallMs), { src, wallMs });
    await page.waitForFunction(() => window.__hold && window.__res !== null, null, { timeout: 0, polling: 20 });
    return page.evaluate(() => window.__res);
  };
  const state = () => page.evaluate(() => window.__state());
  const shot = name => page.screenshot({ path: path.join(out, name + '.png') });
  const lines = [];
  const say = s => { console.log(s); lines.push(s); };
  const pick = (s, keys) => keys.map(k => k + '=' + JSON.stringify(s[k])).join(' ');
  const SAME = ['phase', 'no', 'room', 'time', 'introT', 'cam', 'say', 'hints', 'pops', 'fly', 'particles', 'labKey', 'loot', 'bumps', 'help', 'phaseT', 'own', 'thief', 'players', 'actLabels', 'legend', 'rootCls', 'C', 'def', 'ph', 'idle', 'cut'];
  const diff = (a, b, keys = SAME) => keys.filter(k => JSON.stringify(a[k]) !== JSON.stringify(b[k])).map(k => `${k}: ${JSON.stringify(a[k])} -> ${JSON.stringify(b[k])}`);
  const check = (name, a, b, keys) => { const d = diff(a, b, keys); say(`${d.length ? 'DIFF' : 'ok  '} ${name}${d.length ? '\n       ' + d.join('\n       ') : ''}`); return !d.length; };
  const pressR = async () => { await page.evaluate(() => window.__seed(777)); await page.keyboard.press('KeyR'); };
  // state at the first frame after a load, and 6 s later
  const firstAndLater = async () => { const a = await state(); await until('G.time - ' + a.time + ' >= 6'); const b = await state(); return [a, b]; };

  const idx = await page.evaluate(() => window.__pipbo.LEVELS.findIndex(l => l.mode === 'timethief'));
  // baseline: another level, before 30-1 was ever loaded
  await page.evaluate(() => { const P = window.__pipbo; P.G.cpuOn = [true, true]; window.__seed(777); P.loadLevel(0); });
  await until('G.time >= 2');
  const dom0 = await page.evaluate(() => window.__dom());

  // start: at era `from` (a hand-made checkpoint, as if the pair had played up to there another day)
  await page.evaluate(({ idx, from, LOOT, ORDER }) => {
    const P = window.__pipbo;
    if (from > 0) {
      const stats = { bumps: [3, 4], team: 2, kinds: { bump: 9 }, help: ['x'], phaseT: Array.from({ length: from }, (_, k) => 100 + k), idleT: 0 };
      for (const k of ORDER) stats[k] = {};
      localStorage.setItem('pipbo:tth:cp', JSON.stringify({ era: from, time: from * 140, stats, loot: Array.from({ length: LOOT }, (_, k) => k < from) }));
    }
    window.__seed(777); P.loadLevel(idx);
  }, { idx, from, LOOT, ORDER });

  for (let e = from; e <= to; e++) {
    const name = ORDER[e];
    say(`===== era ${e} ${name} =====`);
    const [A0, A6] = await firstAndLater();
    say('  start: ' + pick(A0, ['phase', 'time', 'loot', 'bumps', 'phaseT', 'cp', 'labKey', 'resumed', 'news']));
    if (A0.no !== e) { say('  WRONG ERA, stopping'); break; }
    await shot(`e${e}-a-start6`);
    // 1. R mid-era
    await until('st.phT >= 25 || !!st.cut');
    const mid = await state();
    await pressR();
    const [B0, B6] = await firstAndLater();
    say('  mid-era before R: ' + pick(mid, ['phT', 'time', 'bumps', 'own']));
    check(`R mid-era (first frame) e${e}`, A0, B0);
    check(`R mid-era (+6 s) e${e}`, A6, B6);
    await shot(`e${e}-b-afterR6`);
    // 2. R during the portal cutscene
    let r = await until('!!st.cut && st.cut.t >= 2.2', 420000);
    const cutS = await state();
    if (r !== true) { say('  NEVER REACHED THE CUTSCENE: ' + r + ' ' + pick(cutS, ['phT', 'bumps'])); break; }
    say('  at cutscene: ' + pick(cutS, ['cut', 'phT', 'time', 'loot', 'bumps', 'phaseT', 'cp', 'own']));
    await shot(`e${e}-c-cut`);
    await pressR();
    const [C0, C6] = await firstAndLater();
    check(`R in the ${cutS.cut} cutscene (first frame) e${e}`, A0, C0);
    check(`R in the ${cutS.cut} cutscene (+6 s) e${e}`, A6, C6);
    await shot(`e${e}-d-afterCutR6`);
    if (e === 9) {
      // 3. the ending -> results -> R: a fresh level
      r = await until('G.mode === "result"', 420000);
      const res = await page.evaluate(() => ({ card: document.getElementById('overlay').innerText.replace(/\n+/g, ' | '), cp: localStorage.getItem('pipbo:tth:cp'), time: window.__pipbo.G.time }));
      say('  result: ' + JSON.stringify(res));
      await shot('result');
      await pressR();
      const F = await state();
      say('  after R on the results card: ' + pick(F, ['phase', 'no', 'time', 'loot', 'bumps', 'phaseT', 'cp', 'statsKeys', 'own', 'actLabels']));
      break;
    }
    // 4. through the portal for real, then R during the arrival warp
    r = await until(`st.phaseNo === ${e + 1}`, 420000);
    if (r !== true) { say('  NEVER REACHED THE NEXT ERA: ' + r); break; }
    const N0 = await state();
    await until(`G.time - ${N0.time} >= 0.5`);
    const N05 = await state();
    await shot(`e${e + 1}-arrive0.5`);
    say('  arrived: ' + pick(N0, ['phase', 'time', 'loot', 'bumps', 'phaseT', 'cp', 'arriveT', 'introT', 'say', 'news', 'hints', 'particles', 'bubbles']));
    await pressR();
    const R0 = await state();
    check(`R in the arrival warp e${e + 1}`, N0, R0, SAME.filter(k => k !== 'time'));
    say('       time ' + N0.time + ' -> ' + R0.time + '  cp ' + JSON.stringify(R0.cp) + ' arriveT ' + R0.arriveT);
    // 5. another level and back
    await page.evaluate(() => { window.__seed(777); window.__pipbo.loadLevel(0); });
    await until('G.time >= 2');
    const dom1 = await page.evaluate(() => window.__dom());
    const dd = Object.keys(dom0).filter(k => JSON.stringify(dom0[k]) !== JSON.stringify(dom1[k]));
    say(`${dd.length ? 'DIFF' : 'ok  '} level 1-1 after leaving era ${e + 1}${dd.map(k => `\n       ${k}: ${JSON.stringify(dom0[k]).slice(0, 300)} -> ${JSON.stringify(dom1[k]).slice(0, 300)}`).join('')}`);
    await page.evaluate(idx2 => { window.__seed(777); window.__pipbo.loadLevel(idx2); }, idx);
    const K0 = await state();
    check(`back from another level e${e + 1}`, R0, K0);
    // (the loop goes on in era e+1 from this load)
  }
  say('page errors: ' + errors.length + ' ' + errors.slice(0, 8).join(' | '));
  fs.writeFileSync(path.join(out, 'report-' + from + '-' + to + '.txt'), lines.join('\n'));
  await browser.close();
})().catch(e => { console.error(e); process.exit(2); });
