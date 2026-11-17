#!/usr/bin/env node
// Screenshots of a 3D scene from headless Chromium with software WebGL (SwiftShader).
//   node tools/k3d/shot.js <scene> <secs> <out.png> [--cam=...] [--size=WxH] [--opt=ink=0,dof=0] [--nodress] [--progress=0.5]
//                          [--dpr=1] [--notext] [--pos=x,z,x,z] [--head=a,b] [--eval="js run in the page before the shot"]
//   scene: proof (the look-proof page, ?k3dproof). (A level's scenes come with the level: tools/w41/.)
//   secs: wall-clock seconds to let the page run before the shot (software WebGL is slow; 3 is plenty)
//   --cam: a rig (follow, diorama, rail, chase) or a fixed preset (top, front, left, right, pip, bo, pair, wide)
//   --size: the window, default 1280x720 (a phone: 844x390)
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2), pos = args.filter(a => !a.startsWith('--'));
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const flag = k => args.includes('--' + k);
(async () => {
  const [scene = 'proof', secs = '3', out = 'build/k3d-shot.png'] = pos;
  const [w, h] = opt('size', '1280x720').split('x').map(Number);
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: +opt('dpr', 1) });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));
  if (scene !== 'proof') throw new Error('unknown scene ' + scene);
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html') + '?k3dproof');
  await page.waitForFunction(() => typeof K3D !== 'undefined' && (K3D.state === 'failed' || (K3D.state === 'ready' && K3D.proof && K3D.proof.st)), null, { timeout: 120000 });
  const state = await page.evaluate(() => K3D.state + (K3D.why ? ': ' + K3D.why : ''));
  if (!state.startsWith('ready')) { console.log('3D failed: ' + state); }
  const cam = opt('cam', 'follow'), rigs = ['follow', 'diorama', 'rail', 'chase'];
  await page.evaluate(({ cam, rigs, dress, progress, optStr, notext, posS, headS }) => {
    const o = {};
    if (rigs.includes(cam)) o.cam = cam; else o.preset = cam;
    if (progress != null) o.progress = +progress;
    if (dress === false) o.dress = false;
    if (cam === 'compare') o.compare = true;
    if (posS) { const n = posS.split(',').map(Number); o.pos = [[n[0], n[1]], [n[2], n[3]]]; }
    if (headS) o.head = headS.split(',').map(Number);
    if (optStr) { o.opt = {}; for (const kv of optStr.split(',')) { const [k, v] = kv.split('='); o.opt[k] = v !== '0'; } }
    K3D.proof.set(o);
    K3D.proof.hideText = notext;
  }, { cam, rigs, dress: flag('nodress') ? false : null, progress: opt('progress', null), optStr: opt('opt', ''), notext: flag('notext'), posS: opt('pos', ''), headS: opt('head', '') });
  if (opt('eval', '')) await page.evaluate(opt('eval', ''));
  await page.waitForTimeout(+secs * 1000);
  const info = await page.evaluate(() => { const r = K3D.R; return r ? { calls: r.info.render.calls, tris: r.info.render.triangles, tex: r.info.memory.textures, geo: r.info.memory.geometries } : null; });
  const box = await page.evaluate(() => { const r = document.getElementById('stage').getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height }; });
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => { K3D.freeze = true; r(); })));
  await page.screenshot({ path: out, clip: box, animations: 'allow', caret: 'initial', timeout: 120000 });
  console.log(out, JSON.stringify(info), errs.length ? '\nerrors: ' + errs.slice(0, 8).join('\n') : '');
  await browser.close();
})();
