#!/usr/bin/env node
// Summary of survey reports: one line per level and distinct problem text. Usage: node tools/polish/summary.js build/polish/report-*.json
'use strict';
const fs = require('fs');
const seen = {};
for (const f of process.argv.slice(2)) {
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  for (const [lv, bySize] of Object.entries(d)) for (const [size, r] of Object.entries(bySize)) {
    for (const part of ['ready', 'pause', 'play']) for (const b of r[part] || []) {
      const what = b.str || b.el, k = lv + '|' + b.why + '|' + String(what).replace(/[0-9]+/g, '#');
      (seen[k] = seen[k] || { lv, why: b.why, what, by: b.by || b.air, sizes: new Set(), part }).sizes.add(size);
    }
    if (r.crash) console.log(lv, size, 'CRASH', r.crash);
    if (r.errors && r.errors.length) console.log(lv, size, 'ERRORS', r.errors[0]);
  }
}
for (const v of Object.values(seen)) console.log(`${v.lv.padEnd(30)} ${v.part.padEnd(5)} ${[...v.sizes].join('+').padEnd(12)} ${v.why}${v.by !== undefined ? ' (' + v.by + ')' : ''}: ${JSON.stringify(v.what)}`);
