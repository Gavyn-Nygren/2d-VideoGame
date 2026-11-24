#!/usr/bin/env node
// 43-1 Coin Drop: render the look set (the shots Gavyn checks before the rest is built) into one folder.
//   node tools/w43/looks.js <out-dir> [name ...]     (names pick some shots; none = all)
// Each shot runs tools/w43/shot.js in its own browser (one at a time). Detail cameras are worked out here from the
// route (chute terms: s along, x across, y up), so they stay right if the route moves.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), { execFileSync } = require('child_process');
const root = path.resolve(__dirname, '..', '..');
const ctx = { console, Math }; vm.createContext(ctx);
for (const f of ['js/3d/rail.js', 'js/levels/world43/arcadecoin-route.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8').replace(/^const (\w+) =/m, 'globalThis.$1 ='), ctx);
const PR = ctx.ARCADECOIN_ROUTE, R = PR.R, A = PR.at;
const L = (s, x, y) => R.local(s, x, y);
const cam = (e, a, fov = 45) => '--cam=' + [...e, ...a, fov].map(v => (+v).toFixed(2)).join(',');
const out = process.argv[2] || 'build/look';
fs.mkdirSync(out, { recursive: true });
const pick = process.argv.slice(3);
const shots = [
  // the riders
  ['01-riders-side', ['--s=24', '--x=-2.4,2.4', '--coincam=side']],
  ['02-riders-front', ['--s=24', '--x=-1.6,1.6', '--coincam=front']],
  ['03-riders-behind', ['--s=24', '--x=-1.6,1.6', '--coincam=behind']],
  ['04-riders-midjump', ['--s=24', '--x=-2.4,2.4', '--coincam=jump', '--hop=0.36', '--nocue']],
  ['05-spark-sweeps-row', ['--s=33.2', '--x=-3.6,3.6', '--coincam=above']],
  // the opening
  ['06-opening-arcade', ['--intro=1.6']],
  ['07-opening-insert-coin', ['--intro=4.3']],
  ['08-opening-sucked-in', ['--intro=5.6']],
  ['09-opening-the-fall', ['--intro=11.2']],
  // play shots along stretch 1
  ['10-play-landing', ['--s=3', '--x=-2.2,2.2']],
  ['11-play-first-bend', ['--s=62', '--x=-1.8,2.6']],
  ['12-play-first-split', ['--s=' + (A.split1a + 6).toFixed(1), '--x=-2.6,2.6']],
  ['13-play-twin-springboard', ['--s=' + (A.spring1 - 3).toFixed(1), '--x=-1.6,1.6']],
  ['14-play-the-drop', ['--s=' + (A.brink - 1.5).toFixed(1), '--x=-1.8,1.8']],
  // details
  ['15-detail-fin-market', [cam(L(46, -5, 3.5), L(58, -15, -0.5), 40), '--s=40', '--x=-2,2', '--nocue']],
  ['16-detail-picture-house', [cam(L(105, -11, 2.8), L(114, -15, 0.5), 50), '--s=96', '--x=-2,2', '--nocue']],
  ['17-detail-band-on-the-speaker', [cam(L(128, 5, 3), L(140, 14, -1), 40), '--s=124', '--x=-2,2', '--nocue']],
  ['18-detail-validator-and-nib', [cam(L(16, -3, 2.2), L(6, -11, 1), 42), '--s=26', '--x=-2,2', '--nocue']],
  ['19-detail-washing-day', [cam(L(20, -4, 2.5), L(30, -14, 0), 42), '--s=16', '--x=-2,2', '--nocue']],
  // Circuit City
  ['20-city-play', ['--s=1060', '--x=-2.4,2.4']],
  ['21-city-wide', ['--s=1000', '--x=-2.4,2.4', '--nocue', cam([-110, -140, 60], [10, -200, -60], 50)]],
  ['22-city-processor', ['--s=' + (A.ck5 + 6).toFixed(1), '--x=-2.4,2.4']],
];
for (const [name, args] of shots) {
  if (pick.length && !pick.some(p => name.includes(p))) continue;
  const file = path.join(out, name + '.png');
  try {
    const r = execFileSync('node', [path.join(__dirname, 'shot.js'), '0', file, '--wait=3', '--dpr=1', ...args], { cwd: root, timeout: 300000, encoding: 'utf8' });
    console.log(name, (r.split('\n')[0] || '').slice(-90));
  } catch (e) { console.log(name, 'FAILED', String(e.message).slice(0, 200)); }
}
