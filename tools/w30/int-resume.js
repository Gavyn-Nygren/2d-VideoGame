// For every era 1-9: a real checkpoint (build/w30/int/cps.json, from int-gen.js) is in the browser, the page is
// reloaded, the level is picked from the menu with real clicks, the resume is checked (era, time, bumps, loot, news),
// real keys are pressed, then the computer pair finishes the level from there.
//   node tools/w30/int-resume.js [eras=1,2,...] [--shots]
'use strict';
const L = require('./int-lib');
const cps = JSON.parse(L.fs.readFileSync(L.path.join(L.OUT, 'cps.json'), 'utf8'));
const eras = (process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2].split(',').map(Number) : [1, 2, 3, 4, 5, 6, 7, 8, 9]);
const shots = process.argv.includes('--shots');
(async () => {
  const browser = await L.chromium.launch();
  let bad = 0;
  for (const k of eras) {
    const c = cps.find(x => x.era === k), want = JSON.parse(c.cp);
    const { ctx, page, errors } = await L.open(browser);
    await page.evaluate(v => localStorage.setItem('pipbo:tth:cp', v), c.cp);
    await page.reload();
    await page.waitForFunction(() => window.__pipbo && window.__pipbo.MODES && window.__pipbo.MODES.timethief);
    await L.pickLevel(page);
    const s = await L.snap(page);
    const notes = [];
    const ok = (cond, msg) => { if (!cond) { notes.push('FAIL ' + msg); bad++; } };
    ok(!s.manual, 'manual'); ok(s.room === k && s.phaseNo === k, 'era ' + s.room + '/' + s.phaseNo);
    ok(Math.abs(s.time - want.time) < 1.5, 'time ' + s.time + ' vs ' + want.time);
    ok(JSON.stringify(s.bumps) === JSON.stringify(want.stats.bumps), 'bumps ' + s.bumps);
    ok(JSON.stringify(s.loot) === JSON.stringify(want.loot), 'loot');
    // (the "Checkpoint" line has its own slot, st.cpNote: on the room card, then 6 s of play; the eras' news never replace it)
    ok(/^Checkpoint: Era/.test(s.note || '') && s.noteT === 0, 'checkpoint line on the card: ' + s.note + ' t ' + s.noteT);
    const same = (a, b) => { const x = JSON.parse(a), y = JSON.parse(b); delete x.live; delete y.live; const srt = o => JSON.stringify(Object.keys(o).sort().map(k => [k, o[k]])); return srt(x) === srt(y); };
    ok(same(s.cp, c.cp), 'cp rewritten differently: ' + (s.cp || '').slice(0, 80));
    if (shots) await page.screenshot({ path: L.path.join(L.OUT, `resume-${k}-card.png`) });
    await page.waitForFunction(() => window.__pipbo.G.introT <= 0, null, { timeout: 8000 });
    await page.waitForTimeout(500);
    const s1 = await L.snap(page);
    if (shots) await page.screenshot({ path: L.path.join(L.OUT, `resume-${k}-play.png`) });
    ok(/^Checkpoint: Era/.test(s1.note || '') && s1.noteT > 0.2 && s1.noteT < 1.2, 'checkpoint line after the card: ' + s1.note + ' t ' + s1.noteT + ' (news: ' + s1.news + ')');
    // real keys: both players
    const before = await page.evaluate(() => window.__pipbo.G.players.map(p => ({ x: p.x, y: p.y })));
    await page.keyboard.down('KeyD'); await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(250);
    const inp = await page.evaluate(() => window.__pipbo.G.players.map(p => p.input.right));
    await page.keyboard.press('KeyW'); await page.keyboard.press('ArrowUp'); await page.keyboard.press('KeyF'); await page.keyboard.press('Slash');
    await page.waitForTimeout(500);
    await page.keyboard.up('KeyD'); await page.keyboard.up('ArrowRight');
    ok(inp[0] && inp[1], 'keys not read ' + inp);
    const r = await L.finish(page, { seed: 3 });
    ok(r.mode === 'clear' || r.mode === 'result', 'not cleared: mode ' + r.mode + ' room ' + r.room + ' sim ' + r.simT);
    ok(r.cp === 'null' || r.cp === null, 'cp after clear ' + (r.cp || '').slice(0, 60));
    ok(!r.cpuErrs.length, 'cpu errs ' + r.cpuErrs);
    ok(r.res && r.res.time > want.time, 'result time ' + (r.res && r.res.time));
    await page.waitForFunction(() => window.__pipbo.G.mode === 'result', null, { timeout: 8000 }).catch(() => notes.push('FAIL no result card'));
    const card = (await page.locator('#overlay').innerText()).replace(/\n+/g, ' | ');
    console.log(`era ${k} (${s.phase}): resumed t=${s.time} (cp ${want.time}) bumps ${s.bumps}+${s.team} news "${s1.news}" -> ${r.mode} total ${r.res ? r.res.time.toFixed(1) : '-'} bumps ${r.statsRaw.bumps}+${r.statsRaw.team} sim ${r.simT}s ${notes.join('; ') || 'OK'}${errors.length ? ' PAGE ERR ' + errors.slice(0, 3).join(' / ') : ''}`);
    console.log('   card: ' + card);
    if (errors.length) bad++;
    await ctx.close();
  }
  console.log(bad ? 'PROBLEMS: ' + bad : 'all ok');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
