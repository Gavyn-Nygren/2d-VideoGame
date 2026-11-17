#!/usr/bin/env node
// Before/after contact sheet: pairs screenshots with the same file name in two folders, before on the left and after on
// the right, one row per picture, and saves one JPEG.
// Usage: node tools/polish/sheet.js <before folder> <after folder> <out.jpg> [name filter, e.g. "play-20s"] [--title=...]
'use strict';
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const title = (args.find(a => a.startsWith('--title=')) || '').slice(8);
const [bDir, aDir, out, filter] = args.filter(a => !a.startsWith('--'));
if (!bDir || !aDir || !out) { console.log('usage: sheet.js <before dir> <after dir> <out.jpg> [filter] [--title=...]'); process.exit(1); }
const names = fs.readdirSync(aDir).filter(n => /\.(png|jpe?g)$/i.test(n) && fs.existsSync(path.join(bDir, n)) && (!filter || n.includes(filter))).sort();
if (!names.length) { console.log('no matching pictures'); process.exit(1); }
const url = f => 'file://' + path.resolve(f);
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
body{margin:0;background:#1e1f22;color:#eee;font:600 18px system-ui,sans-serif;padding:16px;width:1600px}
h1{font-size:24px;margin:0 0 12px} .row{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:18px}
.cap{grid-column:1/3;font-size:16px;color:#bbb} img{width:100%;display:block;border-radius:6px}
.lab{font-size:14px;color:#9ab;margin:2px 0 4px}</style></head><body>
${title ? `<h1>${esc(title)}</h1>` : ''}
${names.map(n => `<div class="row"><div class="cap">${esc(n.replace(/\.(png|jpe?g)$/i, ''))}</div>
<div><div class="lab">Before</div><img src="${url(path.join(bDir, n))}"></div>
<div><div class="lab">After</div><img src="${url(path.join(aDir, n))}"></div></div>`).join('\n')}
</body></html>`;
(async () => {
  const tmp = path.join(require('os').tmpdir(), 'sheet-' + process.pid + '.html');
  fs.writeFileSync(tmp, html);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1632, height: 900 } });
  await p.goto('file://' + tmp);
  await p.waitForFunction(() => [...document.images].every(i => i.complete));
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  await p.screenshot({ path: out, fullPage: true, type: 'jpeg', quality: 85 });
  await b.close(); fs.unlinkSync(tmp);
  console.log('saved', out, names.length, 'pairs');
})();
