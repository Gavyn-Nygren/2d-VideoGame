// 29-2 Shadow Sneak: step out of cover during the "Shh!" lose phase -> "There!" and the chase resumes. Usage: node tools/w29/shadowsneak-lose.js
const path = require('path'); const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const page = await b.newPage(); const errs = []; page.on('pageerror', e => errs.push(String(e)));
  await page.goto('file:///home/user/2d-videogame/index.html'); await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const r = await page.evaluate(() => {
    const P = window.__pipbo, G = P.G, out = []; G.manual = true; G.cpuOn = [true, true];
    P.loadLevel(P.LEVELS.findIndex(l => l.mode === 'shadowsneak')); P.nextRoom(); G.introT = 0;
    const st = G.mst, g = st.P.guards.find(q => q.state !== 'sleep'); st.sn.x = g.x + g.face * 120;
    let mode = 'cpu', n = 0;
    P.CPU.filter = (p, o) => p.id !== st.sneak ? o : mode === 'out' ? { left: true } : o;
    while (n++ < 120 * 30) {
      P.step(P.DT);
      if (st.chase && st.chase.lose != null && st.chase.lose > 0.5 && mode === 'cpu') { mode = 'out'; out.push('lose phase at ' + G.time.toFixed(1) + ', stepping out'); }
      if (mode === 'out' && st.chase && st.chase.lose == null) { out.push('chase resumed (There!) at ' + G.time.toFixed(1)); mode = 'cpu2'; }
      if (mode === 'cpu2' && !st.chase) { out.push('ended at ' + G.time.toFixed(1) + ' caught ' + st.stats.caught + ' escapes ' + st.stats.escapes); break; }
    }
    return out;
  });
  console.log(r.join('\n'), errs.filter(e => !/Unexpected token/.test(e))); await b.close();
})();
