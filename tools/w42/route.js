#!/usr/bin/env node
// 42-1 Runaway Coaster: the route's numbers. Prints each stretch's length and riding time, where the named places are,
// and how many of each thing are on the track. Usage: node tools/w42/route.js [--at]
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const showAt = process.argv.includes('--at');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = []; page.on('pageerror', e => errors.push(String(e)));
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const r = await page.evaluate((showAt) => {
    const PR = PARKCOASTER_ROUTE, R = PR.R, L = PR.lists;
    const tAt = (a, b) => { let t = 0; for (let s = a; s < b; s += 0.25) t += 0.25 / Math.max(0.3, R.at(s).v); return t; };
    const parts = L.parts.map((p, i) => { const b = i + 1 < L.parts.length ? L.parts[i + 1].s : PR.at.brake; const a = Math.max(p.s, PR.START); return { name: p.name, s: Math.round(a), len: Math.round(b - a), secs: +tAt(a, b).toFixed(1) }; });
    const counts = {}; for (const k of Object.keys(L)) counts[k] = L[k].length;
    const per = {}; for (const k of ['bends', 'tips', 'ducks', 'hops', 'levers', 'cams', 'tickets']) for (const x of L[k]) { const s = x.s0 != null ? x.s0 : x.s; const pn = L.parts[(() => { let j = 0; L.parts.forEach((p, i) => { if (s >= p.s) j = i; }); return j; })()].name; per[pn] = per[pn] || {}; per[pn][k] = (per[pn][k] || 0) + 1; }
    const arches = L.arches.map(s => Math.round(tAt(PR.START, s)));
    return { len: Math.round(R.len), total: +tAt(PR.START, PR.at.brake).toFixed(1), parts, counts, per, arches, ticketsMax: PARKCOASTER.ticketsMax(), at: showAt ? Object.fromEntries(Object.entries(PR.at).map(([k, s]) => [k, Math.round(s) + ' (' + Math.round(tAt(PR.START, s)) + 's)'])) : null };
  }, showAt);
  console.log(JSON.stringify(r, null, 1).replace(/\n\s+(?=[^"{\[])/g, ' ').replace(/\n\s+"(\w+)": (\d)/g, ' "$1": $2'));
  if (errors.length) console.log('PAGE ERR', errors.slice(0, 3).join(' | '));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
