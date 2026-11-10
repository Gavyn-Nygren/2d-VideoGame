const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on('pageerror', e => console.log('ERR', String(e)));
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html') + '');
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.MODES && window.__pipbo.MODES.timethief);
  const r = await page.evaluate(() => {
    const P = window.__pipbo, G = P.G, TT = P.MODES.timethief.test;
    G.manual = true; G.cpuOn = [true, true];
    const nz = { q: [] };
    P.CPU.filter = (p, out, dt) => {
      if (p.id !== 0) return out;
      nz.q.push({ t: G.time + 0.5, out }); let o2 = {};
      while (nz.q.length && nz.q[0].t <= G.time) o2 = nz.q.shift().out;
      if (nz.q.length > 200) nz.q.shift();
      out = nz.last = (Object.keys(o2).length ? o2 : nz.last) || {};
      return Object.assign({}, out);
    };
    TT.jump(7, { seed: 1 });
    const st = G.mst, ph = st.ph, lines = [];
    // straight to the landing
    ph.stretch = 2; ph.beacons.forEach(b => b.got = true); ph.L.y = ph.ground - 200; ph.L.x = ph.pad.x; ph.L.vy = 0;
    for (let n = 0; n < 120 * 40 && !st.cut; n++) {
      P.step(P.DT);
      if (n % 120 === 0) lines.push(`${st.phT.toFixed(1)} ${ph.mode} flag ${ph.flag.state} ${Math.round(ph.flag.x)} plant ${ph.flag.plant.toFixed(2)} hold ${ph.flag.hold} pip ${Math.round(G.players[0].x + 13 + st.cam.x)} in ${JSON.stringify(G.players[0].input)} bo ${Math.round(G.players[1].x + 13 + st.cam.x)} act ${G.players[1].input.act} G.time ${G.time.toFixed(1)}`);
    }
    return lines;
  });
  console.log(r.join('\n'));
  await browser.close();
})();
