// node tools/w19/perf-rooms.js <treeA> <treeB> <treeC> <code:room,...>  -> median render + flush ms at 4 s and 12 s into that room, best of 2, for three trees
const path = require('path'); const { chromium } = require(require.resolve('playwright', { paths: [process.cwd()] }));
const trees = process.argv.slice(2, 5), sel = process.argv[5].split(',');
(async () => {
  const b = await chromium.launch();
  const open = async root => { const p = await b.newPage({ viewport: { width: 1280, height: 760 } }); await p.goto('file://' + path.resolve(root, 'index.html')); await p.waitForFunction(() => window.__pipbo && document.fonts.status === 'loaded'); return p; };
  const pages = []; for (const t of trees) pages.push(await open(t));
  const measure = (p, code, room) => p.evaluate(async ([code, room]) => {
    const P = window.__pipbo, G = P.G, i = P.LEVELS.findIndex((l, k) => P.levelCode(k) === code);
    document.getElementById('overlay').classList.add('hidden'); G.manual = true; G.cpuOn = [true, true]; P.loadLevel(i); for (let n = 1; n < room; n++) P.nextRoom(); G.introT = 0;
    const out = []; let sim = 0;
    for (const t of [4, 12]) {
      const n = Math.round((t - sim) / P.DT); for (let k = 0; k < n && G.mode === 'play'; k++) P.step(P.DT); sim = t;
      const c = document.getElementById('game').getContext('2d');
      for (let k = 0; k < 6; k++) { render(1 / 60); c.getImageData(0, 0, 1, 1); }
      const ts = []; for (let k = 0; k < 31; k++) { const t0 = performance.now(); render(1 / 60); c.getImageData(0, 0, 1, 1); ts.push(performance.now() - t0); }
      ts.sort((a, b) => a - b); out.push(ts[15]);
    }
    return out;
  }, [code, room]);
  for (const s of sel) {
    const [code, room] = s.split(':'); const row = [];
    for (let rep = 0; rep < 2; rep++) for (let k = 0; k < pages.length; k++) { const r = await measure(pages[k], code, +room || 1); row[k] = row[k] ? row[k].map((v, j) => Math.min(v, r[j])) : r; }
    console.log(s.padEnd(8), row.map((r, k) => 'T' + k + ' ' + r.map(x => x.toFixed(1).padStart(5)).join(' ')).join('   '));
  }
  await b.close();
})();
