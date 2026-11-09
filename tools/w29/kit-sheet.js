#!/usr/bin/env node
// Draws every World 29 kit painter, pose and prop on one 960x540 sheet: node tools/w29/kit-sheet.js [--t=1.3] [--w=960]
// Writes build/w29/kit-sheet.png and kit-sheet-dojo.png, and prints page errors and the ms a full scenery frame takes.
'use strict';
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1100, height: 700 } });
  const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '../../index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const out = path.resolve(__dirname, '../../build/w29'); fs.mkdirSync(out, { recursive: true });
  const res = await page.evaluate(t => {
    /* global NINJA, ctx, G, W, H, C, text, canvas */
    const P = window.__pipbo; P.G.manual = true; P.loadLevel(0); P.G.clock = t;
    const K = NINJA, cv = ctx.canvas, lab = (s, x, y) => text(s, x, y, 11, '#ffffff', 'center', 'body');
    ctx.save(); ctx.setTransform(cv.width / W, 0, 0, cv.height / H, 0, 0);
    // timing: a full outdoor scenery frame
    const scene = cx => {
      K.sky(cx, t); K.skyline(cx); K.town(cx);
      ctx.save(); ctx.translate(-cx, 0);
      K.roof(20, 300, 250); K.roof(420, 340, 200); K.roof(760, 280, 300);
      K.lanterns(270, 250, 420, 290, 4, t);
      K.bamboo(700, 520, 230, t, 3); K.stall(330, 540, 120); K.wall(1100, 330, 300, 220);
      ctx.restore();
    };
    const t0 = performance.now(); for (let i = 0; i < 100; i++) scene(i * 37); const ms = (performance.now() - t0) / 100;
    const t1 = performance.now(); for (let i = 0; i < 100; i++) K.dojo(t); const msDojo = (performance.now() - t1) / 100;
    // sheet 1: outdoors
    K.sky(0, t); K.skyline(0); K.town(0, { y: 500 });
    K.roof(14, 150, 250, { bottom: 268 }); K.lanterns(270, 120, 420, 150, 4, t);
    K.wall(430, 150, 170, 118); K.bamboo(640, 268, 170, t, 3); K.stall(760, 268, 120); K.lantern(860, 150, t); K.lantern(900, 150, t, { off: true });
    K.ground(0, 240, 268, 'stone', 290); K.ground(240, 480, 268, 'dirt', 290); K.ground(480, 720, 268, 'wood', 290); K.ground(720, 960, 268, 'tatami', 290);
    lab('roof', 140, 140); lab('lanterns', 345, 108); lab('wall', 515, 140); lab('bamboo', 640, 90); lab('stall', 760, 160); lab('lantern', 880, 140);
    // heroes
    const poses = ['idle', 'run', 'sneak', 'hang', 'sword', 'throw', 'dizzy', 'cheer'];
    poses.forEach((ps, i) => {
      for (const id of [0, 1]) {
        const x = 50 + i * 78 + id * 34, y = 372;
        if (ps === 'hang') { K.rope(x, 300, x, 330, 0); K.ninja(id, x, 330, { pose: ps, anchor: 'hands', rot: id ? -0.3 : 0.3, face: id ? -1 : 1, t }); }
        else K.ninja(id, x, y, { pose: ps, face: id ? -1 : 1, t, item: ps === 'throw' ? (id ? 'pebble' : 'star') : undefined, glint: 0.8 });
      }
      lab(ps, 67 + i * 78, 388);
    });
    K.ninja(0, 700, 372, { pose: 'throw', item: 'hook', t }); K.ninja(1, 740, 372, { pose: 'sneak', alpha: 0.45, t }); lab('hook / alpha', 720, 388);
    K.hero(0, 800, 372); K.hero(1, 830, 372, { face: -1 }); lab('hero', 815, 388);
    // guards
    ['patrol', 'curious', 'alert', 'dizzy', 'sleep'].forEach((s, i) => {
      const x = 50 + i * 86, y = 500;
      if (s === 'patrol') K.cone(x + 10, y - 27, 0, 110, 0.35);
      if (s === 'alert') K.cone(x - 10, y - 27, Math.PI, 70, 0.35, { alert: true });
      K.guard(x, y, { state: s, t, lantern: i === 0, face: i === 2 ? -1 : 1 }); lab(s, x, 516);
    });
    // props
    K.shuriken(480, 440, 14, t, {}); K.shuriken(515, 440, 12, t * 2, { id: 0, trail: 0 }); K.shuriken(550, 440, 12, t * 2, { id: 1, trail: Math.PI }); K.shuriken(585, 440, 12, 0.4, { gold: true }); lab('shuriken', 530, 466);
    K.rope(470, 490, 560, 480, 14); K.hook(560, 480, -0.3); lab('rope + hook', 520, 516);
    K.sword(610, 500, -1.1, 34, { id: 0, glint: 1 }); K.slash(650, 480, 30, -2.2, 0.2, 0.9); lab('sword / slash', 640, 516);
    K.pebble(700, 440, 5); K.noise(700, 440, 22, 0.8); lab('pebble + noise', 700, 474);
    K.hayCart(770, 505, { s: 0.8 }); lab('hay cart', 770, 516);
    K.gong(890, 450, 30, { hit: 0.6, t, ground: 505 }); lab('gong', 890, 516);
    K.chip(840, 300, 100, 22, 'F throw', true, false, 1); K.chip(840, 326, 100, 22, 'held', false, true, 1); K.meter(840, 354, 100, 10, 0.6, C.bo, 0.8);
    const a = cv.toDataURL('image/png');
    // sheet 2: the dojo with a HUD
    K.dojo(t);
    K.ninja(0, 300, 440, { pose: 'throw', item: 'star', t }); K.ninja(1, 660, 440, { pose: 'sword', face: -1, t, glint: 0.6 });
    K.shuriken(480, 410, 11, t * 3, { id: 0, trail: 0 }); K.gong(130, 370, 34, { t, ground: 440 });
    const st = { stats: { helps: 0 } }; K.fx(st); K.goldHelp(st, 'Gold stars! They fly a little slower'); st.msg.t = 1;
    K.drawMsg(st, st.msg);
    K.pop(st, 480, 330, 'Bonk!', '#ffffff', 26); st.pops[0].t = 0.3; K.drawPops(st);
    K.hint(st, 1, 'Nice block!'); const Pm = K.prompter(st); Pm.say(0, K.key(0, 'act') + ' throw', 300, 400, C.gold, true); Pm.say(1, 'x', 660, 400);
    const bx = K.panel(0, 'thrower', 250, 58, 1); K.chip(bx.x + 12, bx.y + 28, 90, 22, 'F throw', true, false, 1);
    K.panel(1, 'blocker', 250, 58, 1);
    const b = cv.toDataURL('image/png');
    ctx.restore();
    return { a, b, ms, msDojo };
  }, +opt('t', 1.3));
  fs.writeFileSync(path.join(out, 'kit-sheet.png'), Buffer.from(res.a.split(',')[1], 'base64'));
  fs.writeFileSync(path.join(out, 'kit-sheet-dojo.png'), Buffer.from(res.b.split(',')[1], 'base64'));
  console.log('scene ms:', res.ms.toFixed(2), 'dojo ms:', res.msDojo.toFixed(2), 'errors:', errs.slice(0, 6));
  await browser.close();
})();
