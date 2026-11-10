// The end of 30-1 in a real session: a real era change saves the checkpoint; the results card (desktop + phone), the
// trophy thresholds, the world card and the final "all bosses" line.
'use strict';
const L = require('./int-lib');
const cps = JSON.parse(L.fs.readFileSync(L.path.join(L.OUT, 'cps.json'), 'utf8'));
let bad = 0;
const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) bad++; };
(async () => {
  const browser = await L.chromium.launch();
  // 1. a real era change (era 1 -> 2 in real time, the era won through the test hook) saves a checkpoint
  {
    const { ctx, page, errors } = await L.open(browser);
    await L.pickLevel(page);
    await page.waitForFunction(() => window.__pipbo.G.introT <= 0); await page.waitForTimeout(1200);
    await page.evaluate(() => { const P = window.__pipbo; P.G.mst.stats.bumps[1] = 2; P.MODES.timethief.test.done({}); });
    // R in the portal cutscene: no checkpoint yet -> era 1 again
    await page.waitForFunction(() => window.__pipbo.G.room === 1, null, { timeout: 15000 });
    const s = await L.snap(page), cp = JSON.parse(s.cp);
    ok(cp && cp.era === 1 && Math.abs(cp.time - s.time) < 0.3 && cp.stats.bumps[1] === 2 && cp.loot[0] === true, `real era change saved: ${s.cp.slice(0, 90)}... (clock ${s.time})`);
    // close the tab in the portal cutscene of era 2: the won era is not saved yet
    await page.waitForFunction(() => window.__pipbo.G.introT <= 0); await page.waitForTimeout(600);
    await page.evaluate(() => window.__pipbo.MODES.timethief.test.done({}));
    await page.waitForTimeout(2500);
    await page.keyboard.press('KeyR');
    const t = await L.snap(page);
    console.log(`  R 2.5 s into the portal cutscene after winning era 2: back in era ${t.room + 1} (loot ${t.loot.map(Number).join('')})`);
    ok(!errors.length, 'no page errors ' + errors.join(' / '));
    await ctx.close();
  }
  // 2. the results card on a phone after a resume in the race, then the world card and the final card
  {
    const { ctx, page, errors } = await L.open(browser, { ctx: { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 } });
    await page.evaluate(v => localStorage.setItem('pipbo:tth:cp', v), cps.find(x => x.era === 9).cp);
    await page.reload(); await page.waitForFunction(() => window.__pipbo && window.__pipbo.MODES.timethief);
    await L.pickLevel(page, { tap: true });
    const r = await L.finish(page, { seed: 5, release: true });
    await page.waitForFunction(() => window.__pipbo.G.mode === 'result', null, { timeout: 8000 });
    await page.waitForTimeout(900);
    await page.screenshot({ path: L.path.join(L.OUT, 'phone-result.png') });
    const geo = await page.evaluate(() => { const o = document.getElementById('overlay'); return { sh: o.scrollHeight, ch: o.clientHeight, btn: [...o.querySelectorAll('button')].map(b => { const r = b.getBoundingClientRect(); return b.textContent.trim() + '@' + Math.round(r.top) + '-' + Math.round(r.bottom); }) }; });
    console.log('  phone result card:', JSON.stringify(geo), (await page.locator('#overlay').innerText()).replace(/\n+/g, ' | '));
    ok(r.cp === 'null', 'checkpoint cleared');
    await page.locator('#overlay [data-act="next"]').tap(); await page.waitForTimeout(900);
    console.log('  world card:', (await page.locator('#overlay').innerText()).replace(/\n+/g, ' | ').slice(0, 400));
    await page.screenshot({ path: L.path.join(L.OUT, 'phone-world.png') });
    await page.locator('#overlay [data-primary]').tap(); await page.waitForTimeout(900);
    console.log('  final card:', (await page.locator('#overlay').innerText()).replace(/\n+/g, ' | ').slice(0, 300));
    await page.screenshot({ path: L.path.join(L.OUT, 'phone-final.png') });
    // every boss combination of the final line
    const lines = await page.evaluate(() => {
      const P = window.__pipbo, f = m => P.LEVELS.findIndex(l => l.mode === m), out = [];
      const ids = { gc: f('collector'), vd: f('dragon'), tt: f('timethief') };
      for (let m = 0; m < 8; m++) {
        P.G.results.length = 0;
        const fake = { kind: 'team', time: 100, falls: 0, stats: [] };
        if (m & 1) P.G.results[ids.gc] = fake; if (m & 2) P.G.results[ids.vd] = fake; if (m & 4) P.G.results[ids.tt] = fake;
        showFinal();
        const o = document.getElementById('overlay');
        out.push(((m & 1) ? 'GC ' : '') + ((m & 2) ? 'VD ' : '') + ((m & 4) ? 'TT ' : '') + '-> ' + o.querySelector('.eyebrow').textContent + ' / ' + (o.querySelector('.lede') ? o.querySelector('.lede').textContent : '(no line)'));
      }
      return out;
    });
    lines.forEach(l => console.log('    ' + l));
    // the trophy thresholds
    const med = await page.evaluate(() => {
      const P = window.__pipbo, G = P.G, TT = P.MODES.timethief.test, M = TT.TTH.medal, out = [];
      G.manual = true; TT.jump(9);
      for (const [t, b] of [[M.gold.t, M.gold.bumps], [M.gold.t + 0.1, 0], [100, M.gold.bumps + 1], [M.silver.t, M.silver.bumps], [M.silver.t + 0.1, 0], [100, M.silver.bumps + 1]]) {
        G.time = t; G.mst.stats.bumps = [b, 0]; G.mst.stats.team = 0;
        const s = P.MODES.timethief.stats(); out.push(`t ${t} bumps ${b} -> ${s[1].value}`);
        G.mst.stats.bumps = [0, 0]; G.mst.stats.team = b; out.push(`   team bumps ${b} -> ${P.MODES.timethief.stats()[1].value}`);
      }
      G.manual = false; return out;
    });
    med.forEach(l => console.log('    ' + l));
    ok(!errors.length, 'no page errors ' + errors.join(' / '));
    await ctx.close();
  }
  console.log(bad ? 'PROBLEMS: ' + bad : 'all ok');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
