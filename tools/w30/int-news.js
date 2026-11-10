// How long is the "Checkpoint: Era N" news line really on screen after a resume? (real session, sampled every 100 ms)
'use strict';
const L = require('./int-lib');
const cps = JSON.parse(L.fs.readFileSync(L.path.join(L.OUT, 'cps.json'), 'utf8'));
(async () => {
  const browser = await L.chromium.launch();
  for (let k = 1; k <= 9; k++) {
    const { ctx, page } = await L.open(browser);
    await page.evaluate(v => localStorage.setItem('pipbo:tth:cp', v), cps.find(x => x.era === k).cp);
    await page.reload(); await page.waitForFunction(() => window.__pipbo && window.__pipbo.MODES.timethief);
    await L.pickLevel(page);
    const r = await page.evaluate(() => new Promise(done => {
      const P = window.__pipbo, G = P.G; let vis = 0, hidden = 0, n = 0; const seen = [];
      const iv = setInterval(() => {
        // (the line has its own slot, st.cpNote, and its own pill: on the room card, then for 6 s of play)
        const nw = G.mst.news, note = G.mst.cpNote, cp = !!(note && /^Checkpoint/.test(note.text));
        if (nw && !seen.includes(nw.text)) seen.push((G.introT > 0 ? '[card] ' : '') + nw.text);
        if (cp) { if (G.introT > 0) hidden += 0.1; else vis += 0.1; }
        if (++n >= 130) { clearInterval(iv); done({ vis: vis.toFixed(1), hidden: hidden.toFixed(1), seen }); }
      }, 100);
    }));
    console.log(`era ${k + 1}: checkpoint line on screen ${r.vis}s (+${r.hidden}s on the room card); news seen: ${r.seen.join(' || ')}`);
    await ctx.close();
  }
  await browser.close();
})();
