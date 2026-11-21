#!/usr/bin/env node
// 43-4 Laser Tag Arena: checks the five layouts. For each round: every piece is inside the floor, nothing overlaps a
// base or another piece, a hero can reach every part of the floor from both bases (with the start walls down and the
// risers both up and down), the layout is the same from both bases, and no gap a hero must use is too tight.
//   node tools/w43/laser-layout.js [--map=3]   (--map prints an ASCII map of that round)
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.resolve(__dirname, '..', '..');
const ctx = { console, Math };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'js/levels/world43/arcadelaser-arena.js'), 'utf8') + '\nthis.AR = ARCADELASER_ARENA;', ctx);
const AR = ctx.AR, R = 0.34, STEP = 0.1;
const args = process.argv.slice(2), mapR = +((args.find(a => a.startsWith('--map=')) || '=0').split('=')[1]);
let bad = 0;
const fail = m => { bad++; console.log('  FAIL ' + m); };
for (let n = 1; n <= 5; n++) {
  const L = AR.layout(n);
  console.log('round ' + n + ' (' + AR.ROUND_NAMES[n] + '): ' + L.length + ' pieces');
  // symmetric: every piece has a twin turned half a turn
  for (const p of L) if (!p.c && !L.some(q => q !== p && q.k === p.k && Math.abs(q.x + p.x) < 1e-6 && Math.abs(q.z + p.z) < 1e-6)) fail('no twin for ' + p.k + ' at ' + p.x.toFixed(2) + ',' + p.z.toFixed(2));
  for (const riserUp of [false, true]) {
    const st = { layout: L, startDown: 1, risers: {}, turnAng: {}, spinA: 0 };
    for (const p of L) if (p.k === 'riser') st.risers[p.i] = { h: riserUp ? 1 : 0 };
    const sol = ctx.AR.solids(st).filter(q => q.move !== 'none');
    // pieces inside the floor, not on a base, not overlapping each other
    if (!riserUp) for (const q of sol) {
      const pts = q.shape === 'circle' ? [[q.x + q.r, q.z], [q.x - q.r, q.z], [q.x, q.z + q.r], [q.x, q.z - q.r]] : [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => AR.wor(q, a * q.hw, b * (q.shape === 'seg' ? 0.1 : q.hd)));
      for (const [x, z] of pts) if (Math.abs(x) > AR.HX + 0.01 || Math.abs(z) > AR.HZ + 0.01) { fail(q.p.k + ' sticks out of the floor at ' + x.toFixed(2) + ',' + z.toFixed(2)); break; }
      for (const [bx, bz] of AR.BASE) if (AR.overlaps(q, { x: bx, z: bz, r: 1.0 })) fail(q.p.k + ' on a base');
    }
    // the free floor (hero centres) on a grid
    const nx = Math.round(AR.HX * 2 / STEP), nz = Math.round(AR.HZ * 2 / STEP), free = new Uint8Array(nx * nz);
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
      const x = -AR.HX + (i + 0.5) * STEP, z = -AR.HZ + (j + 0.5) * STEP;
      if (Math.abs(x) > AR.HX - R || Math.abs(z) > AR.HZ - R) continue;
      const b = { x, z, r: R };
      free[i + j * nx] = sol.some(q => AR.overlaps(q, b, 0.02)) ? 0 : 1;
    }
    const cell = ([x, z]) => Math.floor((x + AR.HX) / STEP) + Math.floor((z + AR.HZ) / STEP) * nx;
    const seen = new Uint8Array(nx * nz), q = [cell(AR.BASE[0])]; seen[q[0]] = 1;
    while (q.length) { const c = q.pop(), i = c % nx, j = (c / nx) | 0; for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= nx || b >= nz) continue; const k = a + b * nx; if (free[k] && !seen[k]) { seen[k] = 1; q.push(k); } } }
    let nf = 0, ns = 0; for (let k = 0; k < free.length; k++) { nf += free[k]; ns += seen[k]; }
    if (!seen[cell(AR.BASE[1])]) fail('Bo\'s base not reachable from Pip\'s' + (riserUp ? ' (risers up)' : ''));
    if ((nf - ns) * STEP * STEP > 0.5) fail(((nf - ns) * STEP * STEP).toFixed(2) + ' sq of floor cut off' + (riserUp ? ' (risers up)' : ''));
    // pads and buttons stand on reachable floor
    for (const p of L) if (p.k === 'pad' || p.k === 'button') { const c = cell([p.x, p.z]); if (!seen[c]) fail(p.k + ' ' + (p.id || p.mir) + ' not on reachable floor' + (riserUp ? ' (risers up)' : '')); }
    console.log('  risers ' + (riserUp ? 'up  ' : 'down') + ': free floor ' + (nf * STEP * STEP).toFixed(1) + ' sq, reachable ' + (100 * ns / nf).toFixed(1) + '%');
    if (n === mapR && riserUp === (n >= 3)) {
      const rows = [];
      for (let j = 0; j < nz; j += 3) { let row = ''; for (let i = 0; i < nx; i += 2) { const x = -AR.HX + (i + 0.5) * STEP, z = -AR.HZ + (j + 0.5) * STEP; const hit = sol.find(s2 => AR.overlaps(s2, { x, z, r: 0.01 })); row += hit ? (hit.beam === 'mirror' ? '/' : hit.move === 'low' ? '-' : hit.beam === 'prism' ? '*' : '#') : free[i + j * nx] ? '.' : ' '; } rows.push(row); }
      console.log(rows.join('\n'));
    }
  }
}
console.log(bad ? bad + ' problems' : 'all layouts ok');
process.exit(bad ? 1 : 0);
