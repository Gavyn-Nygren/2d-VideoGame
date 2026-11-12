const path = require('path'); const { chromium } = require('playwright');
const [mode, seed, from, to, every, expr] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch(); const page = await b.newPage();
  page.on('pageerror', e => console.log('ERR', String(e))); page.on('console', m => { if (m.type() === 'error') console.log('CERR', m.text()); });
  await page.addInitScript(() => { const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; let r = gen(1); window.__seed = n => { r = gen((n >>> 0) || 1); }; Math.random = () => r(); });
  await page.goto('file://' + path.resolve('/home/user/2d-videogame/index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const out = await page.evaluate(({ mode, seed, from, to, every, expr }) => {
    const P = window.__pipbo, G = P.G, i = P.LEVELS.findIndex(l => l.mode === mode);
    window.__seed(seed * 7919); G.manual = true; G.cpuOn = [true, true]; P.CPU.skillOf = ['normal', 'normal']; P.loadLevel(i);
    const lines = []; let n = 0;
    while (n * P.DT < to && G.mode === 'play') { P.step(P.DT); n++; const t = n * P.DT; if (t >= from && n % Math.round(every / P.DT) === 0) { const st = G.mst; let x; try { x = eval(expr); } catch (e) { x = 'ERR ' + e.message; } lines.push(t.toFixed(2) + ' r' + G.room + ' ' + (typeof x === 'string' ? x : JSON.stringify(x))); } }
    return lines;
  }, { mode, seed: +seed, from: +from, to: +to, every: +every, expr });
  console.log(out.join('\n')); await b.close();
})();
