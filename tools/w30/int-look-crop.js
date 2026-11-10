// node tools/w30/int-look-crop.js in.png x y w h zoom out.png
const { chromium } = require('playwright'); const fs = require('fs');
(async () => { const [f, x, y, w, h, z, out] = process.argv.slice(2); const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: Math.round(w * z), height: Math.round(h * z) } });
  await p.setContent('<body style="margin:0;overflow:hidden;background:#000"><img src="data:image/png;base64,' + fs.readFileSync(f).toString('base64') + '" style="position:absolute;left:' + (-x * z) + 'px;top:' + (-y * z) + 'px;transform-origin:0 0;transform:scale(' + z + ');image-rendering:pixelated"></body>');
  await p.waitForTimeout(100); await p.screenshot({ path: out }); await b.close(); })();
