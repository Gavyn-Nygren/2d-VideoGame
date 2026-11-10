#!/usr/bin/env node
// 30-1 The Time Thief, era 'henge' (Building Stonehenge): do the real input paths move the stone and the logs, and do
// the hints name each device's own keys?   node tools/w30/henge-keys.js [--shots]
//   kb     two people on one keyboard: real key events with the page's own loop running (G.manual false) for a few
//          seconds (walk, jump, push), then a scripted "person" pair on real keys: one pushes, the other carries logs
//          from the back over the stone to the front; then the same after the jobs swapped at the first rest post
//   pad    the same pair on two stubbed controllers (navigator.getGamepads): stick, A (jump), X (action)
//   touch  the same pair on an 844x390 phone: the ◀ ▶ ▲ pads and the round buttons (pointer events)
//   solo   1-player mode on the keyboard, both ways round: the person's hints name keys, the computer's say what it
//          does; the computer takes the job the person leaves and never moves the stone on for an idle person
// Prints one line per check; exits 1 when one fails. --shots writes build/w30/henge/keys-<mode>.png.
'use strict';
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const shots = process.argv.includes('--shots');
const out = path.resolve(__dirname, '..', '..', 'build', 'w30', 'henge');
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
    const start = (o = {}) => page.evaluate(o2 => {
      const P = window.__pipbo, G = P.G, TT = P.MODES.timethief.test;
      if (o2.pads) window.__padOn = true;
      if (o2.solo != null) { P.cpuSetCfg('players', 1); P.cpuSetCfg('human', o2.solo); } else P.cpuSetCfg('players', 2);
      G.manual = !o2.live;
      TT.jump('henge', { seed: 5 });
      if (o2.solo == null) G.cpuOn = [false, false];
      P.fit();
      window.__run = s => { for (let k = 0; k < Math.round(s / P.DT); k++) { P.pollInput(P.DT); P.step(P.DT); } };
      window.__henge = () => {
        const st = G.mst, ph = st.ph, S = ph.stone, K = TT.TTH_PHASES.henge, txt = sel => { const el = document.querySelector(sel); return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; };
        return { phase: st.phase, sx: Math.round(S.x), v: Math.round(S.v), block: S.block, pusher: ph.pusher, leg: ph.leg, cut: !!st.cut, calm: st.celebT > 0,
          free: ph.logs.filter(l => tthHengeFree(ph, l) && l.lock <= 0 && l.x < S.x).map(l => Math.round(l.x)),
          P: G.players.map(p => ({ cx: Math.round(p.x + p.w / 2 + st.cam.x), y: Math.round(p.y + st.cam.y), on: ph.P[p.id].on, log: !!ph.P[p.id].log, grounded: p.grounded })),
          carried: st.stats.henge.carried.slice(), thuds: st.stats.henge.thuds,
          hints: st.hints.map(h => (h ? h.text : '')), labels: K.labels(st), keys: [0, 1].map(id => ({ act: tthKey(id, 'act'), right: tthKey(id, 'right'), jump: tthKey(id, 'jump') })),
          btn: [txt('#padPip [data-actlabel]'), txt('#padBo [data-actlabel]')], legp: [txt('[data-legp="0"]'), txt('[data-legp="1"]')], pad: txt('.pad-only'),
          bubbles: P.CPU.bubbles.map(b => (b && b.t > 0 ? b.text : '')), idle: !!st.idle, errs: [...P.CPU.errs] };
      };
    }, o);
    const S = () => page.evaluate(() => window.__henge());
    const run = s => page.evaluate(s2 => window.__run(s2), s);
    const wait = ms => page.waitForTimeout(ms);
    const shot = async name => { if (shots || name === 'touch') await page.screenshot({ path: path.join(out, 'keys-' + name + '.png') }); };
    // the computer pair plays on to the first rest post (the jobs swap there), then people take over again
    const toPost = () => page.evaluate(() => { const P = window.__pipbo, G = P.G; G.cpuOn = [true, true]; let n = 0; while ((G.mst.ph.leg < 1 || G.mst.celebT > 0) && n++ < 120 * 150) P.step(P.DT); G.cpuOn = [false, false]; for (const p of G.players) { for (const k in p.input) p.input[k] = false; p.pendingAct = p.pendingJump = false; } });

    /* one "press" per device: dev(id, what, on) with what = left | right | jump | act */
    const held = {};
    const KB = [{ left: 'KeyA', right: 'KeyD', jump: 'KeyW', act: 'KeyF' }, { left: 'ArrowLeft', right: 'ArrowRight', jump: 'ArrowUp', act: 'Slash' }];
    const padSet = (ix, f) => page.evaluate(({ ix, f }) => { new Function('p', f)(window.__pads[ix]); }, { ix, f });
    let ptr = 30;
    const ptrs = {};
    const dev = async (id, what, on) => {
      const k = id + what;
      if (!!held[k] === !!on) return;
      held[k] = !!on;
      if (mode === 'pad') {
        if (what === 'left' || what === 'right') await padSet(id, `p.axes[0] = ${held[id + 'right'] ? 1 : held[id + 'left'] ? -1 : 0}`);
        else await padSet(id, `p.buttons[${what === 'jump' ? 0 : 2}] = { pressed: ${!!on}, value: ${on ? 1 : 0} }`);
      } else if (mode === 'touch') {
        // (the move bar reads which half the thumb is on: a pointer at 22% / 78% of its width)
        const move = what === 'left' || what === 'right', sel = (id ? '#padBo ' : '#padPip ') + (move ? '.tmove' : what === 'act' ? '.tbtn-act' : `[data-k="${what}"]`);
        const at = {};
        if (move && on) { const b = await page.locator(sel).boundingBox(); at.clientX = b.x + b.width * (what === 'left' ? 0.22 : 0.78); at.clientY = b.y + b.height / 2; }
        if (on) { ptrs[k] = ++ptr; await page.dispatchEvent(sel, 'pointerdown', Object.assign({ pointerId: ptrs[k], bubbles: true }, at)); }
        else await page.dispatchEvent(sel, 'pointerup', { pointerId: ptrs[k], bubbles: true });
      } else if (on) await page.keyboard.down(KB[id][what]); else await page.keyboard.up(KB[id][what]);
    };
    const letGo = async () => { for (const k of Object.keys(held)) if (held[k]) await dev(+k[0], k.slice(1), false); };
    // a scripted pair of "people" on that device: the pusher holds toward the stone, the other carries logs to the front
    const pair = async (secs, done) => {
      let s = await S(), t = 0, jumpN = 0, actOn = false;
      while (t < secs && !done(s)) {
        const pu = s.pusher, ro = 1 - pu, me = s.P[ro], rear = s.sx - 96, front = s.sx + 96;
        const w = { left: false, right: false, jump: false, act: false };
        if (!me.log) {
          if (me.on) w.left = true;                                             // walk off the back end
          else if (me.cx > front) { w.left = true; w.jump = me.cx - front < 46; }   // back over the stone
          else {
            const l = s.free.length ? s.free.reduce((a, b) => (Math.abs(b - me.cx) < Math.abs(a - me.cx) ? b : a)) : null;
            if (l != null) { if (Math.abs(l - me.cx) < 24) w.act = true; else if (l > me.cx) w.right = true; else w.left = true; }
            else if (me.cx < rear - 70) w.right = true;
          }
        } else if (me.on) { if (me.cx > front - 40) w.act = true; else w.right = true; }
        else if (me.cx < rear) { w.right = true; w.jump = rear - me.cx < 46; }
        else w.act = true;
        if (w.jump && me.grounded && ++jumpN > 10) { w.jump = false; jumpN = 0; }   // a jump that failed: press again
        if (!w.jump) jumpN = 0;
        actOn = w.act && !actOn;                                                 // a fresh press every other step
        await dev(ro, 'left', w.left); await dev(ro, 'right', w.right); await dev(ro, 'jump', w.jump); await dev(ro, 'act', actOn);
        await dev(pu, 'right', true);
        await run(1 / 20); t += 1 / 20;
        s = await S();
      }
      await letGo(); await run(0.1);
      return { s, t };
    };
    const names = { kb: [/\bF\b/, /→/, /\bD\b/, /\//], pad: [/./, /stick/, /stick/, /./], touch: [/round button/, /▶/, /▶/, /round button/] }[mode];

    if (mode !== 'solo') {
      if (mode === 'kb') {
        // the page's own loop, real keys
        await start({ live: true }); await wait(3000);
        const a = await S();
        check(mode, 'era started: Bo pushes first, Pip fetches logs', a.phase === 'henge' && a.pusher === 1 && a.labels.join() === 'grab,shoo', a.labels.join('/'));
        check(mode, 'live: the job hints name each player\'s own keys (F for Pip, → for Bo)', /\bF\b/.test(a.hints[0]) && /→/.test(a.hints[1]), a.hints.join(' | '));
        check(mode, 'top-bar legend names both players\' keys', /move/.test(a.legp[0]) && /jump/.test(a.legp[1]), a.legp.join(' | '));
        await page.keyboard.down('ArrowRight'); await wait(2500); const b = await S();
        check(mode, 'live: holding → walks Bo to the stone and rolls it', b.sx > a.sx + 40, `stone ${a.sx} -> ${b.sx}`);
        await page.keyboard.up('ArrowRight');
        await page.keyboard.down('KeyA'); await wait(400); const c = await S(); await page.keyboard.up('KeyA');
        check(mode, 'live: A walks Pip left', c.P[0].cx < b.P[0].cx - 30, `${b.P[0].cx} -> ${c.P[0].cx}`);
        await page.keyboard.down('KeyW'); await wait(180); const d = await S(); await page.keyboard.up('KeyW');
        check(mode, 'live: W jumps', d.P[0].y < c.P[0].y - 20, `y ${c.P[0].y} -> ${d.P[0].y}`);
        await wait(700);
      }
      await start({ pads: mode === 'pad' });
      if (mode === 'pad') {   // the press that wakes a controller only connects it
        await padSet(0, 'p.buttons[0] = { pressed: true, value: 1 }'); await padSet(1, 'p.buttons[0] = { pressed: true, value: 1 }'); await run(0.2);
        await padSet(0, 'p.buttons[0] = { pressed: false, value: 0 }'); await padSet(1, 'p.buttons[0] = { pressed: false, value: 0 }');
      }
      await run(2.6);
      const a = await S();
      check(mode, 'job hints name this device\'s keys (roller: action, pusher: right)', names[0].test(a.hints[0]) && a.hints[0].includes(a.keys[0].act) && names[1].test(a.hints[1]) && a.hints[1].includes(a.keys[1].right) && (mode === 'kb' || !/\bF\b|→/.test(a.hints.join(' '))), a.hints.join(' | '));
      if (touch) check(mode, 'the round buttons say grab / shoo', a.btn.join() === 'grab,shoo', a.btn.join('/'));
      if (mode === 'pad') check(mode, 'controller legend line', /jump/.test(a.pad), a.pad);
      // leg 1: Bo pushes, Pip carries logs over the stone
      const r1 = await pair(50, s => s.carried[0] >= 2 && s.sx >= 700);
      check(mode, 'leg 1: Bo pushes, Pip grabs logs, jumps on the stone and drops them in front', r1.s.carried[0] >= 2 && r1.s.sx >= 700, `${r1.t.toFixed(1)} s, stone ${a.sx} -> ${r1.s.sx}, carried ${r1.s.carried.join('/')}, thuds ${r1.s.thuds}`);
      await shot(mode + '-leg1');
      // leg 2: the jobs are swapped
      await toPost(); await run(2.2);
      const m = await S();
      check(mode, 'after the rest post the jobs swap: Pip pushes, Bo fetches logs (labels)', m.leg === 1 && m.pusher === 0 && m.labels.join() === 'shoo,grab' && (!touch || m.btn.join() === 'shoo,grab'), m.labels.join('/'));
      check(mode, 'swap hints name the new keys', names[2].test(m.hints[0]) && m.hints[0].includes(m.keys[0].right) && names[3].test(m.hints[1]) && m.hints[1].includes(m.keys[1].act), m.hints.join(' | '));
      const c0 = m.carried[1];
      const r2 = await pair(40, s => s.carried[1] >= c0 + 1 && s.sx >= m.sx + 150);
      check(mode, 'leg 2: Pip pushes, Bo carries a log to the front', r2.s.carried[1] >= c0 + 1 && r2.s.sx >= m.sx + 150, `${r2.t.toFixed(1)} s, stone ${m.sx} -> ${r2.s.sx}, carried ${r2.s.carried.join('/')}`);
      if (mode !== 'kb') {   // the page's own loop polls this device too
        await page.evaluate(() => { window.__pipbo.G.manual = false; });
        const e = await S(); await dev(0, 'left', true); await wait(500); const f = await S(); await letGo();
        check(mode, 'live loop: Pip walks left on this device', f.P[0].cx < e.P[0].cx - 30, `${e.P[0].cx} -> ${f.P[0].cx}`);
        await page.evaluate(() => { window.__pipbo.G.manual = true; });
      }
      await shot(mode);
    }

    if (mode === 'solo') {
      // the person is Pip (the logs); the computer pushes: it rolls the stone to the end of its 4 logs and waits
      await start({ solo: 0 }); await run(3);
      const a = await S();
      check(mode, 'solo, person at the logs: their hint names F, the computer\'s says what it does (no keys)', /\bF\b/.test(a.hints[0]) && !/hold|press|→|\bF\b|\//i.test(a.hints[1] || ''), a.hints.join(' | '));
      await run(6); const b = await S(); await run(14); const c = await S();
      check(mode, 'solo, person idle at the logs: the stone stops when its logs run out', b.sx < 600 && c.sx === b.sx && c.carried.join() === '0,0', `stone ${b.sx} -> ${c.sx}, block ${c.block}, said "${b.bubbles[1] || c.bubbles[1]}"`);
      await shot('solo-logs');
      const r = await pairSolo(0);
      check(mode, 'solo, person at the logs: real keys carry logs and the computer keeps pushing', r.carried[0] >= 2 && r.sx > c.sx + 150, `stone ${c.sx} -> ${r.sx}, carried ${r.carried.join('/')}`);
      // the person is Bo (the pusher); the computer fetches logs but never pushes
      await start({ solo: 1 }); await run(3);
      const d = await S();
      check(mode, 'solo, person pushes: their hint names their key, the computer\'s says what it does (no keys)', /→|\bD\b/.test(d.hints[1]) && !/hold|press|→|\bF\b|\bD\b/i.test(d.hints[0] || ''), d.hints.join(' | '));
      await run(8); const e = await S();
      check(mode, 'solo, person idle at the stone: it never moves', e.sx === d.sx, `stone ${d.sx} -> ${e.sx}, said "${e.bubbles[0]}"`);
      await page.keyboard.down('ArrowRight'); await run(16); const f = await S(); await page.keyboard.up('ArrowRight');
      check(mode, 'solo, person holds →: the stone rolls on and the computer brings the logs', f.sx > e.sx + 300 && f.carried[0] >= 1, `stone ${e.sx} -> ${f.sx}, carried ${f.carried.join('/')}`);
      await page.keyboard.down('KeyD'); await run(2); const g = await S(); await page.keyboard.up('KeyD');
      check(mode, 'solo: the other half of the keyboard (D) works for the person too', g.sx > f.sx + 30, `stone ${f.sx} -> ${g.sx}`);
      await shot('solo-push');
    }
    // (solo) the person carries logs on real keys while the computer pushes
    async function pairSolo(human) {
      let s = await S(), t = 0, jumpN = 0, actOn = false;
      const key = async (what, on) => dev(human, what, on);
      while (t < 40 && !(s.carried[human] >= 2 && s.sx > 760)) {
        const me = s.P[human], rear = s.sx - 96, front = s.sx + 96, w = { left: false, right: false, jump: false, act: false };
        if (!me.log) {
          if (me.on) w.left = true; else if (me.cx > front) { w.left = true; w.jump = me.cx - front < 46; }
          else { const l = s.free.length ? s.free.reduce((a, b) => (Math.abs(b - me.cx) < Math.abs(a - me.cx) ? b : a)) : null; if (l != null) { if (Math.abs(l - me.cx) < 24) w.act = true; else if (l > me.cx) w.right = true; else w.left = true; } }
        } else if (me.on) { if (me.cx > front - 40) w.act = true; else w.right = true; }
        else if (me.cx < rear) { w.right = true; w.jump = rear - me.cx < 46; } else w.act = true;
        if (w.jump && me.grounded && ++jumpN > 10) { w.jump = false; jumpN = 0; }
        if (!w.jump) jumpN = 0;
        actOn = w.act && !actOn;
        await key('left', w.left); await key('right', w.right); await key('jump', w.jump); await key('act', actOn);
        await run(1 / 20); t += 1 / 20; s = await S();
      }
      await letGo(); await run(0.1);
      return s;
    }
    const s = await S();
    check(mode, 'no computer-brain errors', s.errs.length === 0, s.errs.join(','));
    await ctx.close();
  }
  console.log(lines.join('\n'));
  if (errors.length) { console.log('PAGE ERRORS:\n' + errors.slice(0, 10).join('\n')); bad++; }
  console.log(bad ? `${bad} check(s) FAILED` : 'all checks passed');
  await browser.close();
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
