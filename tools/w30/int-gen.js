// Makes real checkpoints for eras 1-9: a real session starts 30-1 from the menu, then the computer pair plays the whole
// level (checkpoints on) and the stored tth:cp value is copied at every era start -> build/w30/int/cps.json
'use strict';
const L = require('./int-lib');
(async () => {
  const browser = await L.chromium.launch();
  const { page, errors } = await L.open(browser);
  await L.pickLevel(page);
  const s0 = await L.snap(page);
  console.log('started', JSON.stringify(s0));
  const r = await L.finish(page, { seed: +(process.argv[2] || 1) });
  console.log('end mode', r.mode, 'room', r.room, 'time', r.time, 'cp after clear:', r.cp, 'cpuErrs', r.cpuErrs);
  for (const l of r.log) console.log('era', l.era, 'time', l.time, 'bumps', l.bumps, l.team, 'loot', l.loot.map(Number).join(''), 'cp', l.cp && l.cp.length);
  console.log('result', JSON.stringify(r.res));
  console.log('stats', JSON.stringify(r.statsRaw).slice(0, 3000));
  L.fs.writeFileSync(L.path.join(L.OUT, 'cps.json'), JSON.stringify(r.log, null, 1));
  await page.waitForFunction(() => window.__pipbo.G.mode === 'result', null, { timeout: 8000 }).catch(() => console.log('no result card'));
  await page.screenshot({ path: L.path.join(L.OUT, 'result-full.png') });
  console.log('card text:', (await page.locator('#overlay').innerText()).replace(/\n+/g, ' | '));
  console.log('errors', errors);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
