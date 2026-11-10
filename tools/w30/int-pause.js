// The pause card and restarts of 30-1 in a real session (mouse, keyboard, touch at a phone viewport), R, other levels.
//   node tools/w30/int-pause.js [test,test]
'use strict';
const L = require('./int-lib');
const cps = JSON.parse(L.fs.readFileSync(L.path.join(L.OUT, 'cps.json'), 'utf8'));
const only = process.argv[2] ? process.argv[2].split(',') : null;
const cpOf = k => cps.find(x => x.era === k).cp;
let bad = 0;
const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) bad++; };
async function resumeAt(browser, k, o = {}) {
  const S = await L.open(browser, o);
  await S.page.evaluate(v => localStorage.setItem('pipbo:tth:cp', v), typeof k === 'number' ? cpOf(k) : k);
  if (o.cpu) await S.page.evaluate(v => localStorage.setItem('pipbo:cpu', v), JSON.stringify(o.cpu));
  await S.page.reload();
  await S.page.waitForFunction(() => window.__pipbo && window.__pipbo.MODES && window.__pipbo.MODES.timethief);
  if (!o.noPick) await L.pickLevel(S.page, o);
  return S;
}
const btns = page => page.locator('#overlay button:visible').allInnerTexts();
const play = (page, ms) => page.waitForTimeout(ms);
const bonk = page => page.evaluate(() => { const P = window.__pipbo; P.G.mst.stats.bumps[0] += 3; P.G.mst.stats.team += 1; });

const tests = {
  async mouse(browser) {
    const { ctx, page, errors } = await resumeAt(browser, 3);
    await page.waitForFunction(() => window.__pipbo.G.introT <= 0); await play(page, 1500); await bonk(page);
    const a = await L.snap(page);
    await page.keyboard.press('Escape'); await play(page, 500);
    const b = await btns(page); console.log('  buttons:', b.join(' | '));
    ok(b.includes('Restart this era') && b.includes('Start over from Era 1'), 'era 4 pause card has both buttons');
    await page.screenshot({ path: L.path.join(L.OUT, 'pause-desktop.png') });
    await page.click('text=Restart this era');
    const c = await L.snap(page);
    ok(c.mode === 'play' && c.room === 3 && !c.overlay, 'restart era (click): era ' + c.room + ' mode ' + c.mode);
    // (the clock and the bumps are never rolled back: restarting an era is no way to a better trophy)
    ok(c.bumps.join() === a.bumps.join() && c.team === a.team, 'bumps kept over the restart: ' + c.bumps + '+' + c.team + ' (were ' + a.bumps + '+' + a.team + ')');
    ok(c.time >= a.time, 'clock kept over the restart: before ' + a.time + ' after ' + c.time + ' (checkpoint ' + JSON.parse(cpOf(3)).time + ')');
    await play(page, 600); await page.keyboard.press('Escape'); await play(page, 500); await page.click('text=Start over from Era 1');
    // two steps: the first press only asks; a double click is not a yes; resuming forgets the question
    let q = await L.snap(page), qb = await btns(page);
    ok(q.mode === 'paused' && q.room === 3 && q.cp !== 'null' && qb.includes('Really start over? Press again'), 'start over asks first: mode ' + q.mode + ' era ' + q.room + ' buttons ' + qb.join(' | '));
    const foc = await page.evaluate(() => document.activeElement && document.activeElement.textContent.trim());
    ok(foc === 'Keep playing', 'after the question the focus is on "' + foc + '"');
    await page.keyboard.press('Escape'); await play(page, 400); await page.keyboard.press('Escape'); await play(page, 500);
    qb = await btns(page);
    ok(qb.includes('Start over from Era 1'), 'after resuming it asks anew: ' + qb.join(' | '));
    await page.dblclick('text=Start over from Era 1'); await play(page, 200);
    q = await L.snap(page);
    ok(q.mode === 'paused' && q.room === 3 && q.cp !== 'null', 'a double click does not start over: mode ' + q.mode + ' era ' + q.room);
    await play(page, 800); await page.click('text=Really start over? Press again');
    const d = await L.snap(page);
    ok(d.room === 0 && d.time < 1 && d.cp === 'null' && d.loot.every(x => !x) && d.bumps.join() === '0,0', 'start over (click): era ' + d.room + ' t ' + d.time + ' cp ' + d.cp);
    await play(page, 600); await page.keyboard.press('Escape'); await play(page, 500);
    const e = await btns(page); console.log('  era 1 buttons:', e.join(' | '));
    ok(e.includes('Restart level') && !e.includes('Start over from Era 1'), 'era 1 pause card is the plain one');
    ok(!errors.length, 'no page errors ' + errors.join(' / '));
    await ctx.close();
  },
  async keyboard(browser) {
    const { ctx, page, errors } = await resumeAt(browser, 6);
    await page.waitForFunction(() => window.__pipbo.G.introT <= 0); await play(page, 800);
    await page.keyboard.press('Escape'); await play(page, 500);
    // Tab to the button, Enter
    const focusTo = async label => {
      for (let n = 0; n < 12; n++) {
        const t = await page.evaluate(() => document.activeElement && document.activeElement.textContent.trim());
        if (t === label) return true;
        await page.keyboard.press('Tab');
      }
      return false;
    };
    ok(await focusTo('Restart this era'), 'Tab reaches "Restart this era"');
    await page.keyboard.press('Enter');
    let s = await L.snap(page);
    ok(s.mode === 'play' && s.room === 6, 'restart era (Tab+Enter): era ' + s.room + ' mode ' + s.mode);
    await play(page, 700); await page.keyboard.press('Escape'); await play(page, 500);
    // arrows (like a controller's stick)?
    const f0 = await page.evaluate(() => document.activeElement && document.activeElement.textContent.trim());
    await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
    const f1 = await page.evaluate(() => document.activeElement && document.activeElement.textContent.trim());
    console.log('  focus on open: "' + f0 + '", after 2x ArrowRight: "' + f1 + '"');
    ok(await focusTo('Start over from Era 1'), 'Tab reaches "Start over from Era 1"');
    await page.keyboard.press('Space');
    s = await L.snap(page);
    ok(s.mode === 'paused' && s.room === 6 && s.cp !== 'null', 'start over (Tab+Space) only asks: mode ' + s.mode + ' era ' + s.room);
    await play(page, 800);
    ok(await focusTo('Really start over? Press again'), 'Tab reaches "Really start over? Press again"');
    await page.keyboard.press('Space');
    s = await L.snap(page);
    ok(s.mode === 'play' && s.room === 0 && s.cp === 'null', 'start over (Tab+Space): era ' + s.room + ' cp ' + s.cp);
    ok(!errors.length, 'no page errors ' + errors.join(' / '));
    await ctx.close();
  },
  async rkey(browser) {
    const { ctx, page, errors } = await resumeAt(browser, 5);
    await page.waitForFunction(() => window.__pipbo.G.introT <= 0); await play(page, 2500); await bonk(page);
    const a = await L.snap(page);
    await page.keyboard.press('KeyR');
    let s = await L.snap(page);
    // (R can lose up to TTH.cpEvery = 2 s of clock and the bumps of those 2 s: the checkpoint is refreshed that often)
    ok(s.mode === 'play' && s.room === 5 && s.time > a.time - 2.2 && s.time <= a.time + 0.2, 'R while playing: era ' + s.room + ' clock before ' + a.time + ' after ' + s.time + ' bumps before ' + a.bumps + ' after ' + s.bumps);
    await play(page, 2600); await bonk(page); await play(page, 2300);
    const a2 = await L.snap(page);
    await page.keyboard.press('KeyR');
    s = await L.snap(page);
    ok(s.bumps.join() === a2.bumps.join() && s.team === a2.team && s.time > a2.time - 2.2, 'R keeps the bumps and the clock: ' + s.bumps + '+' + s.team + ' (were ' + a2.bumps + '+' + a2.team + '), clock ' + a2.time + ' -> ' + s.time);
    await play(page, 4500);
    const note = await page.evaluate(() => { const st = window.__pipbo.G.mst; return st.cpNote && st.cpNote.text; });
    ok(/^Checkpoint/.test(note || ''), 'checkpoint line after R: ' + note + ' (news: ' + (await L.snap(page)).news + ')');
    await page.keyboard.press('Escape'); await page.keyboard.press('KeyR');
    s = await L.snap(page);
    ok(s.mode === 'play' && s.room === 5 && !s.overlay, 'R while paused: era ' + s.room + ' mode ' + s.mode + ' overlay ' + s.overlay);
    // finish, then R on the results card
    const r = await L.finish(page, { seed: 2, release: true });
    await page.waitForFunction(() => window.__pipbo.G.mode === 'result', null, { timeout: 8000 });
    ok(r.cp === 'null', 'cleared: cp ' + r.cp);
    const best1 = await page.evaluate(() => localStorage.getItem('pipbo:best:The Time Thief'));
    console.log('  result time', r.res.time.toFixed(1), 'stored best', best1);
    await play(page, 900);
    await page.keyboard.press('KeyR');
    s = await L.snap(page);
    ok(s.mode === 'play' && s.room === 0 && s.time < 1, 'R on the results card: era ' + s.room + ' t ' + s.time);
    ok(!errors.length, 'no page errors ' + errors.join(' / '));
    await ctx.close();
  },
  async phone(browser) {
    const { ctx, page, errors } = await resumeAt(browser, 4, { ctx: { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }, tap: true });
    await page.waitForFunction(() => window.__pipbo.G.introT <= 0); await play(page, 800);
    await page.screenshot({ path: L.path.join(L.OUT, 'phone-resume.png') });
    await page.locator('#menuBtn').tap(); await play(page, 500);
    await page.screenshot({ path: L.path.join(L.OUT, 'phone-pause.png') });
    const vis = await page.evaluate(() => [...document.querySelectorAll('#overlay button')].filter(b => b.offsetParent).map(b => { const r = b.getBoundingClientRect(); return { t: b.textContent.trim(), x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), in: r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth }; }));
    console.log('  phone buttons:', vis.map(v => `${v.t} ${v.w}x${v.h}@${v.x},${v.y}${v.in ? '' : ' OFFSCREEN'}`).join(' | '));
    const ov = await page.evaluate(() => { const o = document.getElementById('overlay'); return { sh: o.scrollHeight, ch: o.clientHeight }; });
    console.log('  overlay scroll', JSON.stringify(ov));
    await page.locator('text=Restart this era').tap();
    let s = await L.snap(page);
    ok(s.mode === 'play' && s.room === 4, 'restart era (tap): era ' + s.room + ' mode ' + s.mode);
    await play(page, 700); await page.locator('#menuBtn').tap(); await play(page, 500);
    await page.locator('text=Start over from Era 1').scrollIntoViewIfNeeded();
    await page.locator('text=Start over from Era 1').tap();
    s = await L.snap(page);
    ok(s.mode === 'paused' && s.room === 4 && s.cp !== 'null', 'start over (tap) only asks: mode ' + s.mode + ' era ' + s.room);
    await play(page, 800);
    await page.screenshot({ path: L.path.join(L.OUT, 'phone-pause-ask.png') });
    await page.locator('text=Really start over? Press again').scrollIntoViewIfNeeded();
    await page.locator('text=Really start over? Press again').tap();
    s = await L.snap(page);
    ok(s.mode === 'play' && s.room === 0 && s.cp === 'null', 'start over (second tap): era ' + s.room + ' cp ' + s.cp);
    ok(!errors.length, 'no page errors ' + errors.join(' / '));
    await ctx.close();
  },
  async others(browser) {
    const { ctx, page, errors } = await resumeAt(browser, 7, { noPick: true });
    const cp0 = cpOf(7);
    const list = await page.evaluate(() => { const P = window.__pipbo; const f = m => P.LEVELS.findIndex(l => l.mode === m); return [0, f('dragon'), f('collector'), P.LEVELS.findIndex(l => l.match)]; });
    for (const i of list) {
      const name = await page.evaluate(i => window.__pipbo.LEVELS[i].name, i);
      await page.evaluate(() => window.__pipbo.showTitle());
      await page.waitForTimeout(400); await page.click('[data-act="worlds"]'); await page.waitForTimeout(400);
      const w = await page.evaluate(i => window.__pipbo.LEVELS[i].world, i);
      for (let n = 0; n < 6 && !(await page.locator(`[data-act="openworld"][data-w="${w}"]`).count()); n++) { await page.click('[data-act="wpage"].prev'); await page.waitForTimeout(400); }
      await page.click(`[data-act="openworld"][data-w="${w}"]`); await page.waitForTimeout(400);
      await page.click(`[data-act="level"][data-i="${i}"]`);
      await page.waitForFunction(() => window.__pipbo.G.mode === 'play'); await play(page, 3200);
      await page.keyboard.press('Escape'); await play(page, 500);
      const b = await btns(page);
      const plain = b.filter(t => /Restart|Start over/.test(t));
      const t0 = await page.evaluate(() => window.__pipbo.G.time);
      await page.click('#overlay [data-act="replay"]');
      const s = await L.snap(page);
      ok(plain.length === 1 && /^Restart (level|match)$/.test(plain[0]) && s.mode === 'play' && s.level === i && s.time < 0.5 && s.cp === cp0, `${name}: buttons [${b.join(' | ')}], replay -> t ${s.time} (was ${t0.toFixed(1)}), cp untouched ${s.cp === cp0}`);
    }
    // a bot test (G.manual) of 30-1 in a browser that has a checkpoint: era 1, the checkpoint untouched
    const r = await page.evaluate(async () => {
      const P = window.__pipbo, G = P.G; G.manual = true; G.cpuOn = [true, true];
      P.loadLevel(P.MODES.timethief.test.index());
      const room0 = G.room, t0 = G.time;
      let n = 0; while (G.room < 2 && n < 120 * 700) { P.step(P.DT); n++; }
      const out = { room0, t0, room: G.room, cp: localStorage.getItem('pipbo:tth:cp') };
      // the pause card of a bot run in a later era
      out.px = JSON.stringify(P.MODES.timethief.pauseExtra());
      G.manual = false; P.cpuApplyCfg();
      return out;
    });
    ok(r.room0 === 0 && r.t0 === 0 && r.room === 2 && r.cp === cp0, `bot run with a stored checkpoint: starts era ${r.room0}, reached era ${r.room}, cp untouched ${r.cp === cp0}`);
    ok(!errors.length, 'no page errors ' + errors.join(' / '));
    await ctx.close();
  },
  async corrupt(browser) {
    const good = JSON.parse(cpOf(3));
    const cases = {
      'not json': '{era:3,,', 'number': '5', 'string': '"hello"', 'array': '[1,2]', 'empty obj': '{}', 'null': 'null',
      'era 0': JSON.stringify({ ...good, era: 0 }), 'era 10': JSON.stringify({ ...good, era: 10 }), 'era -1': JSON.stringify({ ...good, era: -1 }),
      'era 2.5': JSON.stringify({ ...good, era: 2.5 }), 'era "3"': JSON.stringify({ ...good, era: '3' }), 'era true': JSON.stringify({ ...good, era: true }),
      'no stats': JSON.stringify({ v: 1, era: 3, time: 100, loot: [] }), 'no loot': JSON.stringify({ v: 1, era: 3, time: 100, stats: {} }),
      'old: phase key': JSON.stringify({ phase: 'olympics', t: 400, bumps: [1, 2] }),
      'old: empty stats': JSON.stringify({ v: 1, era: 3, stats: {}, loot: [] }),
      'stats string': JSON.stringify({ v: 1, era: 3, time: 100, stats: 'x', loot: [] }),
      'bumps null': JSON.stringify({ v: 1, era: 3, time: 100, stats: { bumps: null }, loot: [] }),
      'bumps number': JSON.stringify({ v: 1, era: 3, time: 100, stats: { bumps: 4 }, loot: [] }),
      'bumps short': JSON.stringify({ v: 1, era: 3, time: 100, stats: { bumps: [2] }, loot: [true] }),
      'help/kinds/phaseT null': JSON.stringify({ v: 1, era: 3, time: 100, stats: { help: null, kinds: null, phaseT: null, team: null }, loot: [] }),
      'era stats null': JSON.stringify({ v: 1, era: 9, time: 100, stats: { race: null, finale: null, wright: null, davinci: null, dino: null }, loot: [] }),
      'time string': JSON.stringify({ ...good, time: 'abc' }), 'time negative': JSON.stringify({ ...good, time: -500 }), 'time null': JSON.stringify({ ...good, time: null }),
      'time huge': JSON.stringify({ ...good, time: 1e15 }),
      'loot of strings': JSON.stringify({ ...good, loot: ['a', 'b'] }),
      'no version (old save)': JSON.stringify({ ...good, v: undefined }), 'version 2': JSON.stringify({ ...good, v: 2 }),
      'live garbage (still good)': JSON.stringify({ ...good, live: { time: 'x', bumps: [null, -4], team: {} } }),
      'live ahead (still good)': JSON.stringify({ ...good, live: { time: good.time + 100, bumps: [good.stats.bumps[0] + 5, 0], team: 2 } }),
    };
    for (const [name, v] of Object.entries(cases)) {
      if (process.argv[3] && !new RegExp(process.argv[3]).test(name)) continue;
      const S = await L.open(browser);
      await S.page.evaluate(v => localStorage.setItem('pipbo:tth:cp', v), v);
      await S.page.reload();
      await S.page.waitForFunction(() => window.__pipbo && window.__pipbo.MODES && window.__pipbo.MODES.timethief);
      let s = null, err = '';
      try {
        await L.pickLevel(S.page);
        await S.page.waitForTimeout(4600);
        s = await L.snap(S.page);
        // the results code and a bump must work with these stats; the level must still be finishable
        const r = await S.page.evaluate(() => { const P = window.__pipbo; try { P.MODES.timethief.test.bonk(0, { still: true }); P.MODES.timethief.test.bump({}); return JSON.stringify(P.MODES.timethief.stats()).slice(0, 160); } catch (e) { return 'THROW ' + e; } });
        s.statsOut = r;
        if (s.room >= 8) { const f = await L.finish(S.page, { seed: 1 }); await S.page.waitForTimeout(1500); s.fin = f.mode + ' t=' + (f.res && f.res.time) + ' ' + JSON.stringify(f.res && f.res.stats).slice(0, 200); s.mode2 = await S.page.evaluate(() => window.__pipbo.G.mode); }
      } catch (e) { err = String(e).split('\n')[0]; }
      // every malformed value is dropped (Era 1, the stored value cleared); the two "still good" ones resume in era 4
      const good4 = /still good/.test(name), ahead = /live ahead/.test(name);
      const fine = s && s.mode === 'play' && !S.errors.length && !/THROW|NaN|undefined|null/.test(s.statsOut) && (good4 ? s.room === 3 && s.time >= good.time + (ahead ? 100 : 0) && s.bumps[0] === good.stats.bumps[0] + (ahead ? 5 : 0) : s.room === 0 && s.time < 10);
      console.log((fine ? '  ok   ' : '  FAIL ') + name.padEnd(24) + (s ? ` era ${s.room} t ${s.time} bumps ${JSON.stringify(s.bumps)} mode ${s.mode} stats ${s.statsOut}${s.fin ? ' FIN ' + s.fin + ' ' + s.mode2 : ''}` : ' ' + err) + (S.errors.length ? ' ERR ' + S.errors.slice(0, 2).join(' / ').slice(0, 260) : ''));
      if (!fine) bad++;
      await S.ctx.close();
    }
  },
  async solo(browser) {
    // saved by 2 players, resumed by 1 player + computer (each side), and the reverse is the same data
    for (const human of [0, 1]) for (const k of [2, 5, 9]) {
      const { ctx, page, errors } = await resumeAt(browser, k, { cpu: { players: 1, human, skill: 'normal' } });
      await page.waitForFunction(() => window.__pipbo.G.introT <= 0);
      const key = human ? 'ArrowRight' : 'KeyD';
      await page.keyboard.down(key); await play(page, 3000); await page.keyboard.up(key);
      const s = await L.snap(page);
      const cpuMoved = await page.evaluate(h => { const P = window.__pipbo; return JSON.stringify(P.CPU.last[1 - h]); }, human);
      ok(s.room === k && s.cpuOn[1 - human] && !s.cpuOn[human] && !errors.length, `1 player (${human ? 'Bo' : 'Pip'}) resumes era ${k + 1}: cpuOn ${s.cpuOn} news "${s.news}" computer's last presses ${cpuMoved} ${errors.join(' / ')}`);
      await page.screenshot({ path: L.path.join(L.OUT, `solo-${human}-${k}.png`) });
      await page.keyboard.press('Escape'); await play(page, 500);
      // switch to 2 players on the pause card, restart the era
      await page.click('#overlay [data-act="cpucfg"][data-k="players"][data-v="2"]');
      await page.click('text=Restart this era');
      const t = await L.snap(page);
      ok(t.room === k && !t.cpuOn[0] && !t.cpuOn[1] && t.mode === 'play', `   switched to 2 players on the card + restart era: era ${t.room} cpuOn ${t.cpuOn}`);
      const r = await L.finish(page, { seed: 4 });
      ok(r.mode === 'clear' && !r.cpuErrs.length, `   finished: ${r.mode} total ${r.res && r.res.time.toFixed(1)}`);
      await ctx.close();
    }
  },
};
(async () => {
  const browser = await L.chromium.launch();
  for (const [name, fn] of Object.entries(tests)) { if (only && !only.includes(name)) continue; console.log('== ' + name); try { await fn(browser); } catch (e) { console.log('  FAIL threw ' + String(e).split('\n').slice(0, 3).join(' ')); bad++; } }
  console.log(bad ? 'PROBLEMS: ' + bad : 'all ok');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
