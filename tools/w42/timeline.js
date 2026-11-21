#!/usr/bin/env node
// 42-1 Runaway Coaster: the ride as a timeline. Lists everything the riders must do, in order, with the second it
// comes at (riding at the track's own speed) and the gap since the thing before, and flags things that come closer
// together than --min seconds (default 0.8) when they ask for different presses.
//   node tools/w42/timeline.js [--min=0.8] [--all]
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const args = process.argv.slice(2), opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const root = path.resolve(__dirname, '..', '..'), box = { console, Math };
vm.createContext(box);
for (const f of ['js/3d/rail.js', 'js/levels/world42/parkcoaster-route.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8') + '\nthis.RAIL3 = typeof RAIL3 !== "undefined" ? RAIL3 : this.RAIL3; this.PARKCOASTER_ROUTE = typeof PARKCOASTER_ROUTE !== "undefined" ? PARKCOASTER_ROUTE : this.PARKCOASTER_ROUTE;', box);
const PR = box.PARKCOASTER_ROUTE, R = PR.R, L = PR.lists;
// seconds at each place
const T = []; { let t = 0; for (let s = PR.START; s <= R.len; s += 0.1) { T.push([s, t]); t += 0.1 / Math.max(0.3, R.at(s).v); } }
const tAt = s => { let lo = 0, hi = T.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (T[m][0] < s) lo = m; else hi = m; } return T[lo][1]; };
const ev = [];
for (const b of L.bends) ev.push({ s: b.s0, e: b.s1, k: 'lean', what: (b.dir < 0 ? 'LEFT' : 'RIGHT') + (b.need === 2 ? ' both' : ' one') });
for (const t of L.tips) ev.push({ s: t.s, k: 'lean', what: (t.dir < 0 ? 'LEFT' : 'RIGHT') + ' both (tip, ' + t.kind + ')' });
for (const d of L.ducks) ev.push({ s: d.s, k: 'duck', what: d.who === 'both' ? 'both' : ['Pip', 'Bo'][d.who], kind: d.kind });
for (const h of L.hops) ev.push({ s: (h.s0 + h.s1) / 2, k: 'hop', what: h.kind });
for (const l of L.levers) ev.push({ s: l.s, k: 'lever', what: ['Pip', 'Bo'][l.side] + ' ' + l.kind });
for (const c of L.cams) ev.push({ s: c.s, k: 'hands', what: 'hands up' });
ev.sort((a, b) => a.s - b.s);
const min = +opt('min', 0.8); let prev = null, bad = 0;
for (const e of ev) {
  e.t = tAt(e.s); e.te = e.e ? tAt(e.e) : e.t;
  const gap = prev ? e.t - prev.te : 99, close = prev && gap < min && !(prev.k === e.k && prev.what === e.what);
  if (close) bad++;
  if (close || args.includes('--all')) console.log(`${e.t.toFixed(1).padStart(6)}s  s=${e.s.toFixed(0).padStart(5)}  v=${R.at(e.s).v.toFixed(1).padStart(5)}  ${e.k.padEnd(6)} ${e.what}${e.e ? '  (' + (e.te - e.t).toFixed(1) + ' s long)' : ''}${prev ? '   +' + gap.toFixed(2) + ' s' : ''}${close ? '   <-- CLOSE' : ''}`);
  prev = e;
}
console.log(`ride ${tAt(PR.at.brake).toFixed(0)} s from the station to the brake house (${R.len.toFixed(0)} long), ${ev.length} things to do, ${bad} closer than ${min} s`);
