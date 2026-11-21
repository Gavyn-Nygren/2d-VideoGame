#!/usr/bin/env node
// 43-1 Coin Drop: the route in numbers (plain Node, no browser). Stretch lengths and times, counts, checkpoint gaps,
// and the things that come too close together for a pair reacting late.
//   node tools/w43/route.js [--list]
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.resolve(__dirname, '..', '..');
const ctx = { console, Math };
vm.createContext(ctx);
for (const f of ['js/3d/rail.js', 'js/levels/world43/arcadecoin-route.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8').replace(/^const (\w+) =/m, 'globalThis.$1 ='), ctx);
const PR = ctx.ARCADECOIN_ROUTE, L = PR.lists;
const f1 = x => x.toFixed(1);
console.log('length', f1(PR.len), 'time at track speed', f1(PR.tAt(PR.start)) + ' s');
L.parts.forEach((p, i) => { const e = i + 1 < L.parts.length ? L.parts[i + 1].s : PR.start; console.log(' ', p.name.padEnd(16), 'from', f1(p.s).padStart(6), 'len', f1(e - p.s).padStart(6), 'time', f1(PR.eta(p.s, e)).padStart(5) + ' s'); });
const pts = L.pickups.reduce((n, p) => n + ({ coin: 1, ticket: 3, star: 5 }[p.kind]), 0);
console.log('pickups', L.pickups.length, 'worth', pts, 'rows', L.rows.length, 'wires', L.wires.length, 'gaps', L.gaps.length, 'teeth', L.teeth.length, 'levers', L.levers.length,
  'bugs', L.bugs.length, 'gates', L.gates.length, 'splits', L.splits.length, 'springs', L.springs.length, 'pillars', L.pillars.length, 'brush', L.brush.length, 'checks', L.checks.length);
console.log('checkpoints (s, seconds to the next):', L.checks.map((c, i) => f1(c) + '/' + f1(PR.eta(c, L.checks[i + 1] || PR.start))).join('  '));
// hazards within 2 s of a checkpoint
const haz = [...L.wires.map(w => ['wire', w.s]), ...L.gaps.map(g => ['gap', g.s0]), ...L.teeth.map(t => ['teeth', t.s]), ...L.levers.map(l => ['lever', l.s]), ...L.bugs.map(b => ['bug', b.s]), ...L.brush.map(b => ['brush', b.s]), ...L.gates.map(g => ['gate', g.s])].sort((a, b) => a[1] - b[1]);
let bad = 0;
for (const c of L.checks) for (const [k, s] of haz) { const e = PR.eta(c, s); if (e >= 0 && e < 2) { console.log('  TOO CLOSE: checkpoint', f1(c), k, 'at', f1(s), f1(e) + ' s'); bad++; } }
for (let i = 1; i < haz.length; i++) { const e = PR.eta(haz[i - 1][1], haz[i][1]); if (e < 0.8 && !(haz[i][0] === haz[i - 1][0] && haz[i][0] === 'teeth')) console.log('  close together:', haz[i - 1][0], f1(haz[i - 1][1]), haz[i][0], f1(haz[i][1]), f1(e) + ' s'); }
if (process.argv.includes('--list')) for (const [k, s] of haz) console.log(k.padEnd(6), f1(s).padStart(7), f1(PR.tAt(s)).padStart(6) + ' s', PR.kind(s));
process.exit(bad ? 1 : 0);
