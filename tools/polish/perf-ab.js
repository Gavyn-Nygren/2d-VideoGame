// quick A/B frame cost: node perf2.js <treeA> <treeB> [codes|all] -> code, ms A, ms B at sim 5 s and 20 s (median render + flush)
const path = require('path'); const { chromium } = require('playwright');
const [A, B, sel] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch();
  const open = async root => { const p = await b.newPage({ viewport: { width: 1280, height: 760 } }); await p.goto('file://' + path.resolve(root, 'index.html')); await p.waitForFunction(() => window.__pipbo && document.fonts.status === 'loaded'); return p; };
  let pa = await open(A), pb = await open(B);
  const codes = await pb.evaluate(() => window.__pipbo.LEVELS.map((l, i) => window.__pipbo.levelCode(i)));
  const want = !sel || sel === 'all' ? codes : sel.split(',');
  const measure = async (p, code) => p.evaluate(async code => {
    const P = window.__pipbo, G = P.G, i = P.LEVELS.findIndex((l, k) => P.levelCode(k) === code); if (i < 0) return null;
    document.getElementById('overlay').classList.add('hidden'); G.manual = true; G.cpuOn = [true, true]; P.loadLevel(i); G.introT = 0;
    const out = []; let sim = 0;
    for (const t of [5, 20]) {
      const n = Math.round((t - sim) / P.DT); for (let k = 0; k < n && G.mode === 'play'; k++) P.step(P.DT); sim = t;
      const c = document.getElementById('game').getContext('2d');
      for (let k = 0; k < 6; k++) { render(1 / 60); c.getImageData(0, 0, 1, 1); }
      const ts = []; for (let k = 0; k < 25; k++) { const t0 = performance.now(); render(1 / 60); c.getImageData(0, 0, 1, 1); ts.push(performance.now() - t0); }
      ts.sort((a, b) => a - b); out.push(ts[12]);
    }
    return out;
  }, code);
  for (const code of want) {
    let ra, rb;
    try { ra = await measure(pa, code); } catch (e) { ra = null; pa = await open(A); }
    try { rb = await measure(pb, code); } catch (e) { rb = null; pb = await open(B); }
    const f = r => r ? r.map(x => x.toFixed(1).padStart(5)).join(' ') : '   -     -';
    const worst = ra && rb ? Math.max(rb[0] - ra[0], rb[1] - ra[1]) : 0;
    console.log(code.padEnd(6), 'A', f(ra), '  B', f(rb), '  +' + worst.toFixed(1));
  }
  await b.close();
})();
