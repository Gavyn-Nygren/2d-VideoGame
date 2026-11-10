#!/usr/bin/env node
// 30-1 The Time Thief, era 'vikings' (Viking Voyage): do the real input paths reach the longship, and do the hints
// name each device's own keys?   node tools/w30/vikings-input.js [--shots]
//   kb     two people on one keyboard: real key events with the live loop running (G.manual false) for a few seconds
//          (row, steer, walk, climb the mast, slide down, bail), then a scripted "person" who rows on the beat with
//          real key presses, then the jobs after the first buoy (labels, hints, legend), then the grab: real keys row
//          up a big wave and snatch at the sunstone from the mast top
//   pad    two stubbed controllers (navigator.getGamepads): stick, d-pad, A, X
//   touch  an 844x390 phone: the ◀ ▶ ▲ ▼ pads and the round buttons (pointer events)
//   solo   1-player mode on the keyboard: the person's hints name keys, the computer's say what it does
// Prints one line per check; exits 1 when one fails. --shots writes build/w30/vikings/input-<mode>.png.
'use strict';
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const shots = process.argv.includes('--shots');
const out = path.resolve(__dirname, '..', '..', 'build', 'w30', 'vikings');
fs.mkdirSync(out, { recursive: true });

(async () => {
  const browser = await chromium.launch();
  const errors = [], lines = [];
  let bad = 0;
  const check = (mode, name, ok, info) => { if (!ok) bad++; lines.push(`${ok ? 'ok  ' : 'FAIL'} ${mode.padEnd(6)} ${name}${info !== undefined ? '   [' + info + ']' : ''}`); };
  for (const mode of ['kb', 'pad', 'touch', 'solo']) {
    const touch = mode === 'touch';
    const ctx = await browser.newContext(touch ? { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 } : { viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push(mode + ': ' + String(e)));
    page.on('console', m => { if (m.type() === 'error') errors.push(mode + ': ' + m.text()); });
    await page.addInitScript(() => {
      const mk = (ix, id) => ({ buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })), axes: [0, 0, 0, 0], connected: true, mapping: 'standard', id, index: ix, timestamp: 0 });
      window.__pads = [mk(0, 'Stub pad (Pip)'), mk(1, 'Stub pad (Bo)')];
      window.__padOn = false;
      navigator.getGamepads = () => (window.__padOn ? window.__pads : []);
    });
    await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
    await page.waitForFunction(() => window.__pipbo && window.__pipbo.MODES && window.__pipbo.MODES.timethief);
    if (touch) await page.evaluate(() => { enableTouch(); Pads.lastNonPad = 'touch'; setKind('touch'); });
    // start the era with the live loop running (G.manual false: the page polls the devices and steps by itself)
    const start = (o = {}) => page.evaluate(o2 => {
      const P = window.__pipbo, G = P.G, TT = P.MODES.timethief.test;
      if (o2.pads) window.__padOn = true;
      if (o2.solo != null) { P.cpuSetCfg('players', 1); P.cpuSetCfg('human', o2.solo); } else P.cpuSetCfg('players', 2);
      G.manual = false;
      TT.jump('vikings', { seed: 5 });
      if (o2.solo == null) G.cpuOn = [false, false];
      P.fit();
      window.__run = s => { for (let k = 0; k < Math.round(s / P.DT); k++) { P.pollInput(P.DT); P.step(P.DT); } };
      // run (manual) until the drum is `lead` s before its next free beat
      window.__toBeat = lead => { const ph = G.mst.ph, to = () => Math.max(ph.claim + 1, Math.ceil((ph.beatT + lead - 0.1) / ph.P)) * ph.P - lead; let n = 0; while (ph.beatT < to() && n++ < 200) { P.pollInput(P.DT); P.step(P.DT); } };
      window.__vik = () => {
        const st = G.mst, ph = st.ph, K = TT.TTH_PHASES.vikings, S = st.stats.vikings, txt = sel => { const el = document.querySelector(sel); return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; };
        return { phase: st.phase, state: ph.state, k: ph.k, rower: ph.rower, dist: Math.round(ph.dist), v: Math.round(ph.v), lane: ph.lane, water: +ph.water.toFixed(3),
          lx: Math.round(ph.L.x), lh: Math.round(ph.L.h), mast: ph.L.onMast, strokes: S.strokes, fine: S.perfect + S.good, weak: S.weak, scoops: S.scoops, grabs: S.grabs,
          reach: !!(ph.fin && ph.fin.reach), wave: ph.fin && ph.fin.wave ? Math.round(ph.fin.wave.sx) : null,
          hints: st.hints.map(h => (h ? h.text : '')), labels: K.labels(st), news: st.news ? st.news.text : '',
          btn: [txt('#padPip [data-actlabel]'), txt('#padBo [data-actlabel]')], leg: [txt('[data-legp="0"]'), txt('[data-legp="1"]')], idle: !!st.idle, errs: [...P.CPU.errs] };
      };
    }, o);
    const S = () => page.evaluate(() => window.__vik());
    const run = s => page.evaluate(s2 => window.__run(s2), s);
    const toBeat = lead => page.evaluate(l => window.__toBeat(l), lead);
    const manual = on => page.evaluate(on2 => { window.__pipbo.G.manual = on2; }, on);
    const wait = ms => page.waitForTimeout(ms);
    const tapKey = async (code, ms = 90, after = 420) => { await page.keyboard.down(code); await wait(ms); await page.keyboard.up(code); await wait(after); };

    if (mode === 'kb') {
      await start(); await wait(500);
      let a = await S();
      check(mode, 'era started (Pip rows first, Bo is the lookout)', a.phase === 'vikings' && a.rower === 0 && a.state === 'sail', a.state);
      check(mode, 'rower hint names Pip\'s own keys (F, W S)', /\bF\b/.test(a.hints[0]) && /W S/.test(a.hints[0]), a.hints[0]);
      check(mode, 'lookout hint names Bo\'s own key (/)', /\//.test(a.hints[1]), a.hints[1]);
      check(mode, 'top-bar legend: Pip steers and rows, Bo walks, climbs and bails', /steer/.test(a.leg[0]) && /row/.test(a.leg[0]) && /mast/.test(a.leg[1]) && /bail/.test(a.leg[1]), a.leg.join(' | '));
      // real keys, live loop
      await tapKey('KeyF', 60, 200); await tapKey('KeyF', 60, 700); await tapKey('KeyF', 60, 200);
      let b = await S();
      check(mode, 'F rows (live loop): strokes are counted and the ship moves', b.strokes >= 3 && b.dist > a.dist, `strokes ${b.strokes}, dist ${a.dist} -> ${b.dist}`);
      await tapKey('KeyS'); let c = await S();
      check(mode, 'S steers one lane down', c.lane === b.lane + 1, `${b.lane} -> ${c.lane}`);
      await tapKey('KeyW'); await tapKey('KeyW'); let d = await S();
      check(mode, 'W W steers two lanes up', d.lane === 0, `${c.lane} -> ${d.lane}`);
      await page.keyboard.down('ArrowLeft'); await wait(250); let e = await S();
      check(mode, '← walks the lookout along the deck', e.lx < a.lx - 15, `x ${a.lx} -> ${e.lx}`);
      await page.keyboard.down('ArrowUp'); await wait(1500); await page.keyboard.up('ArrowLeft'); let f = await S();
      check(mode, '↑ at the mast climbs to the top', f.mast && f.lh > 95, `mast ${f.mast}, h ${f.lh}`);
      await page.keyboard.up('ArrowUp'); await page.keyboard.down('ArrowDown'); await wait(700); await page.keyboard.up('ArrowDown'); let g = await S();
      check(mode, '↓ slides down the mast', !g.mast && g.lh === 0, `mast ${g.mast}, h ${g.lh}`);
      await page.keyboard.down('ArrowRight'); await wait(900); await page.keyboard.up('ArrowRight'); let h = await S();
      await tapKey('Slash', 70, 380); await tapKey('Slash', 70, 380); let i = await S();
      check(mode, '/ at the bucket bails (two scoops)', i.scoops === h.scoops + 2 && i.water < h.water, `scoops ${h.scoops} -> ${i.scoops}, water ${h.water} -> ${i.water}`);
      // a scripted person on real keys: one press on every drum beat
      await manual(true);
      for (let n = 0; n < 8; n++) { await toBeat(0.02); await page.keyboard.down('KeyF'); await run(0.06); await page.keyboard.up('KeyF'); await run(0.1); if (n % 3 === 2) { await page.keyboard.down('Slash'); await run(0.05); await page.keyboard.up('Slash'); } }
      let j = await S();
      check(mode, 'rowing on the beat with real key presses: strong strokes, real speed', j.fine >= i.fine + 7 && j.v > 150, `strong ${i.fine} -> ${j.fine}, weak ${j.weak}, v ${j.v}`);
      for (let n = 0; n < 6; n++) { await page.keyboard.down('KeyF'); await run(0.05); await page.keyboard.up('KeyF'); await run(0.07); }
      let j2 = await S();
      check(mode, 'mashing F gives weak splashes, not speed', j2.weak >= j.weak + 4 && j2.fine <= j.fine + 2, `weak ${j.weak} -> ${j2.weak}, strong ${j.fine} -> ${j2.fine}`);
      // the first buoy: the jobs swap
      await page.evaluate(() => { const ph = window.__pipbo.G.mst.ph; ph.dist = ph.marks[0] - 40; ph.water = 0.1; });
      for (let n = 0; n < 3 && (await S()).state === 'sail'; n++) { await toBeat(0.02); await page.keyboard.down('KeyF'); await run(0.06); await page.keyboard.up('KeyF'); await run(0.3); }
      let k = await S();
      check(mode, 'at the buoy the jobs swap: Bo rows, Pip is the lookout', k.state === 'swap' && k.rower === 1 && k.labels.join() === 'bail,row', `${k.state}, rower ${k.rower}, ${k.labels}`);
      await run(1.0); let l = await S();
      check(mode, 'after the swap the hints name the new keys (Bo: / and ↑ ↓, Pip: F and W)', /\//.test(l.hints[1]) && /↑ ↓/.test(l.hints[1]) && /\bF\b/.test(l.hints[0]) && /\bW\b/.test(l.hints[0]), l.hints.join(' | '));
      check(mode, 'the legend swapped too', /mast/.test(l.leg[0]) && /bail/.test(l.leg[0]) && /steer/.test(l.leg[1]) && /row/.test(l.leg[1]), l.leg.join(' | '));
      await page.keyboard.down('Slash'); await run(0.05); await page.keyboard.up('Slash'); await run(0.2);
      await page.keyboard.down('ArrowDown'); await run(0.1); await page.keyboard.up('ArrowDown'); await run(0.4); let m = await S();
      check(mode, 'Bo rows with / and steers with ↓', m.strokes > l.strokes && m.lane === l.lane + 1, `strokes ${l.strokes} -> ${m.strokes}, lane ${l.lane} -> ${m.lane}`);
      // the grab (Pip rows again, Bo is the lookout): real keys row up the wave and snatch from the mast top
      await page.evaluate(() => { const st = window.__pipbo.G.mst, ph = st.ph; ph.rower = 0; ph.L.x = 132; ph.L.onMast = false; ph.L.h = 0; ph.seat = null; ph.haz.forEach(q => { q.done = true; }); ph.rain = null; ph.jet = null; ph.water = 0.05; tthVikFinale(st); });
      await run(0.3); let n0 = await S();
      check(mode, 'the grab: the lookout\'s button says "grab", hints name the keys', n0.labels.join() === 'row,grab' && /↑/.test(n0.hints[1]) && /\//.test(n0.hints[1]) && /\bF\b/.test(n0.hints[0]), `${n0.labels} | ${n0.hints.join(' | ')}`);
      await page.keyboard.down('ArrowUp');
      let got = 0, guard = 0;
      while (got < 1 && guard++ < 60) {
        await toBeat(0.02); await page.keyboard.down('KeyF'); await run(0.06); await page.keyboard.up('KeyF');
        for (let q = 0; q < 8; q++) { await run(0.06); const s2 = await S(); if (s2.reach) { await run(0.15); await page.keyboard.down('Slash'); await run(0.05); await page.keyboard.up('Slash'); await run(0.05); break; } }
        got = (await S()).grabs;
      }
      await page.keyboard.up('ArrowUp');
      let n1 = await S();
      check(mode, 'real keys: row up the wave (F), climb (↑), grab on the crest (/): "Yoink!"', n1.grabs >= 1, `grabs ${n1.grabs} after ${guard} beats, mast ${n1.mast} h ${n1.lh}`);
      if (shots) await page.screenshot({ path: path.join(out, 'input-kb.png') });
    }

    if (mode === 'pad') {
      await start({ pads: true }); await wait(500);
      const pad = (ix, f) => page.evaluate(({ ix, f }) => { const p = window.__pads[ix]; new Function('p', f)(p); }, { ix, f });
      const btn = (ix, n, on) => pad(ix, `p.buttons[${n}] = { pressed: ${on}, value: ${on ? 1 : 0} };`);
      const tapBtn = async (ix, n, ms = 80, after = 420) => { await btn(ix, n, true); await wait(ms); await btn(ix, n, false); await wait(after); };
      await btn(0, 9, true); await btn(1, 9, true); await wait(150); await btn(0, 9, false); await btn(1, 9, false); await wait(400);   // wake both pads
      await page.evaluate(() => { const P = window.__pipbo; if (P.G.mode !== 'play') P.resume && P.resume(); });
      await page.evaluate(() => { const P = window.__pipbo, TT = P.MODES.timethief.test; P.G.manual = false; TT.jump('vikings', { seed: 5 }); P.G.cpuOn = [false, false]; });
      await wait(500);
      let a = await S();
      check(mode, 'hints name the controller (a button glyph, the stick)', /stick/.test(a.hints[0]) && !/\bF\b/.test(a.hints[0]) && !/ \/ /.test(a.hints[1]) && a.hints[1].length > 8, a.hints.join(' | '));
      await tapBtn(0, 2, 70, 200); await tapBtn(0, 2, 70, 600); await tapBtn(0, 3, 70, 200);
      let b = await S();
      check(mode, 'X (and Y) row', b.strokes >= 3 && b.dist > a.dist, `strokes ${b.strokes}, dist ${b.dist}`);
      await pad(0, 'p.axes[1] = 1;'); await wait(140); await pad(0, 'p.axes[1] = 0;'); await wait(400); let c = await S();
      check(mode, 'stick down steers a lane down', c.lane === b.lane + 1, `${b.lane} -> ${c.lane}`);
      await pad(0, 'p.axes[1] = -1;'); await wait(140); await pad(0, 'p.axes[1] = 0;'); await wait(400); let d = await S();
      check(mode, 'stick up steers a lane up', d.lane === c.lane - 1, `${c.lane} -> ${d.lane}`);
      await tapBtn(0, 12, 120); let d1 = await S();
      check(mode, 'd-pad up steers a lane up', d1.lane === d.lane - 1, `${d.lane} -> ${d1.lane}`);
      await tapBtn(0, 13, 120); let d2 = await S();
      check(mode, 'd-pad down steers a lane down', d2.lane === d1.lane + 1, `${d1.lane} -> ${d2.lane}`);
      await pad(1, 'p.axes[0] = -1;'); await wait(260); let e = await S();
      check(mode, 'Bo\'s stick ◀ walks the lookout', e.lx < a.lx - 15, `x ${a.lx} -> ${e.lx}`);
      await pad(1, 'p.axes[0] = -0.7; p.axes[1] = -0.7;'); await wait(600); await pad(1, 'p.axes[0] = 0; p.axes[1] = -1;'); await wait(1000); let f = await S();
      check(mode, 'stick up at the mast climbs to the top', f.mast && f.lh > 95, `mast ${f.mast}, h ${f.lh}`);
      await pad(1, 'p.axes[1] = 1;'); await wait(700); await pad(1, 'p.axes[1] = 0;'); let g = await S();
      check(mode, 'stick down slides down', !g.mast, `mast ${g.mast}`);
      await btn(1, 0, true); await btn(1, 14, true); await wait(600); let g2 = await S(); await btn(1, 14, false); await wait(900); let g3 = await S(); await btn(1, 0, false);
      check(mode, 'd-pad ◀ with A held (the jump button is "up"): grabs the mast in passing and climbs', g3.mast && g3.lh > 95, `after 0.6 s: x ${g2.lx}; mast ${g3.mast}, h ${g3.lh}`);
      await btn(1, 13, true); await wait(700); await btn(1, 13, false);
      await btn(1, 15, true); await wait(900); await btn(1, 15, false); let h = await S();
      await tapBtn(1, 2, 70, 380); await tapBtn(1, 5, 70, 380); let i = await S();
      check(mode, 'X (and RB) at the bucket bail', i.scoops === h.scoops + 2, `x ${h.lx}, scoops ${h.scoops} -> ${i.scoops}`);
      if (shots) await page.screenshot({ path: path.join(out, 'input-pad.png') });
    }

    if (mode === 'touch') {
      await start(); await wait(500);
      const down = (sel, on, side) => page.evaluate(({ sel, on, side }) => {
        const el = document.querySelector(sel), r = el.getBoundingClientRect();
        el.dispatchEvent(new PointerEvent(on ? 'pointerdown' : 'pointerup', { bubbles: true, pointerId: sel.length + (side || 0) + 3, pointerType: 'touch', isPrimary: true, clientX: r.left + r.width * (side === -1 ? 0.25 : side === 1 ? 0.75 : 0.5), clientY: r.top + r.height / 2 }));
      }, { sel, on, side });
      const tap = async (sel, ms = 80, after = 420) => { await down(sel, true); await wait(ms); await down(sel, false); await wait(after); };
      const sizes = await page.evaluate(() => ['#padPip .tbtn-act', '#padBo .tbtn-act', '#padPip [data-k="jump"]', '#padPip [data-k="down"]', '#padBo .tmove', '#padBo [data-k="jump"]', '#padBo [data-k="down"]'].map(s => { const r = document.querySelector(s).getBoundingClientRect(); return Math.round(r.width) + 'x' + Math.round(r.height); }));
      let a = await S();
      check(mode, 'both touch pads and round buttons are on screen', sizes.every(s => parseInt(s, 10) >= 40), sizes.join(' '));
      check(mode, 'the round buttons say row / bail', a.btn.join() === 'row,bail', a.btn.join());
      check(mode, 'hints name the touch buttons (the round button, ▲ ▼)', /round button/.test(a.hints[0]) && /▲ ▼/.test(a.hints[0]) && /round button/.test(a.hints[1]), a.hints.join(' | '));
      await tap('#padPip .tbtn-act', 60, 200); await tap('#padPip .tbtn-act', 60, 600); await tap('#padPip .tbtn-act', 60, 200); let b = await S();
      check(mode, 'Pip\'s round button rows', b.strokes >= 3 && b.dist > a.dist, `strokes ${b.strokes}, dist ${b.dist}`);
      await tap('#padPip [data-k="down"]'); let c = await S();
      check(mode, '▼ steers a lane down', c.lane === b.lane + 1, `${b.lane} -> ${c.lane}`);
      await tap('#padPip [data-k="jump"]'); await tap('#padPip [data-k="jump"]'); let d = await S();
      check(mode, '▲ ▲ steers two lanes up', d.lane === 0, `${c.lane} -> ${d.lane}`);
      await down('#padBo .tmove', true, -1); await wait(260); let e = await S();
      check(mode, 'Bo\'s ◀ walks the lookout', e.lx < a.lx - 15, `x ${a.lx} -> ${e.lx}`);
      await down('#padBo [data-k="jump"]', true); await wait(1500); await down('#padBo .tmove', false, -1); let f = await S();
      check(mode, '▲ at the mast climbs to the top (◀ and ▲ are never needed together: ▲ grabs the mast in passing or standing)', f.mast && f.lh > 95, `mast ${f.mast}, h ${f.lh}`);
      await down('#padBo [data-k="jump"]', false); await down('#padBo [data-k="down"]', true); await wait(700); await down('#padBo [data-k="down"]', false); let g = await S();
      check(mode, '▼ slides down', !g.mast, `mast ${g.mast}`);
      await down('#padBo .tmove', true, 1); await wait(900); await down('#padBo .tmove', false, 1); let h = await S();
      await tap('#padBo .tbtn-act', 70, 380); await tap('#padBo .tbtn-act', 70, 380); let i = await S();
      check(mode, 'Bo\'s round button bails at the bucket', i.scoops === h.scoops + 2, `x ${h.lx}, scoops ${h.scoops} -> ${i.scoops}`);
      // standing at the mast, ▲ alone climbs (one direction at a time)
      await down('#padBo .tmove', true, -1);
      for (let n = 0; n < 40; n++) { await wait(30); if ((await S()).lx <= 140) break; }
      await down('#padBo .tmove', false, -1); await wait(120); let i2 = await S();
      await down('#padBo [data-k="jump"]', true); await wait(1100); await down('#padBo [data-k="jump"]', false); let i3 = await S();
      check(mode, 'stop near the mast, then ▲ alone climbs it', i3.mast && i3.lh > 95, `stopped at x ${i2.lx}; mast ${i3.mast}, h ${i3.lh}`);
      if (shots) await page.screenshot({ path: path.join(out, 'input-touch.png') });
    }

    if (mode === 'solo') {
      await start({ solo: 0 }); await wait(600);
      let a = await S();
      check(mode, 'the person (Pip) gets key names', /\bF\b/.test(a.hints[0]), a.hints[0]);
      check(mode, 'the computer\'s hint says what it does, never keys', a.hints[1] && !/[\/↑↓←→]|press|round button/i.test(a.hints[1]), a.hints[1]);
      await tapKey('KeyF', 60, 300); await tapKey('Slash', 60, 300); let b = await S();
      check(mode, 'in 1-player mode either key set rows (F, then /)', b.strokes >= 2, 'strokes ' + b.strokes);
      await wait(2500); let c = await S();
      check(mode, 'the computer bails by itself', c.scoops > 0 || c.water < 0.1, `scoops ${c.scoops}, water ${c.water}`);
      check(mode, 'no brain errors', c.errs.length === 0, c.errs.join(','));
      if (shots) await page.screenshot({ path: path.join(out, 'input-solo.png') });
    }
    await ctx.close();
  }
  console.log(lines.join('\n'));
  if (errors.length) { console.log('PAGE ERRORS:\n' + errors.slice(0, 10).join('\n')); bad++; }
  console.log(bad ? `${bad} FAILED` : 'all ok');
  await browser.close();
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
