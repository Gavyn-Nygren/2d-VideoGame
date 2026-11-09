#!/usr/bin/env node
// World 22 integration check: home screens (world map, World 22 page, previews animate), playing World 22 in order
// (22-1 -> 22-2 -> 22-3 -> 22-4 -> world-done card), every world page and every level still loading with no errors,
// and the bundled build/pip-and-bo.html starting 22-1 (run node tools/bundle.js first).
// Usage: node tools/w22/integration.js   (screenshots to build/w22/integration-*.png)
'use strict';
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..', '..'), out = path.join(root, 'build', 'w22');
fs.mkdirSync(out, { recursive: true });
const shot = (page, n) => page.screenshot({ path: path.join(out, 'integration-' + n + '.png') });

async function open(browser, file, vp) {
  const page = await browser.newPage({ viewport: vp || { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('file://' + path.join(root, file));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  await page.waitForTimeout(900); // (a card ignores clicks for its first 0.6 s)
  return { page, errors };
}

(async () => {
  const browser = await chromium.launch();
  let bad = 0;
  const check = (ok, msg) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) bad++; };

  /* ---- home screens ---- */
  {
    const { page, errors } = await open(browser, 'index.html');
    await page.click('[data-act="worlds"]');
    await page.waitForTimeout(600);
    const tiles = await page.evaluate(() => [...document.querySelectorAll('.wtile')].map(b => ({ w: +b.dataset.w, name: b.querySelector('.wname').textContent, meta: b.querySelector('.wmeta').textContent })));
    const w22 = tiles.find(t => t.w === 21);
    check(!!w22, 'world map has World 22: ' + JSON.stringify(w22));
    check(w22 && /4 levels/.test(w22.meta) && /Team \+ versus/.test(w22.meta), 'World 22 tile says 4 levels, Team + versus');
    check(tiles.some(t => t.w === 20), 'World 21 Sky Kingdom is on the map');
    await page.evaluate(() => { const b = document.querySelector('.wtile[data-w="21"]'); b && b.scrollIntoView({ block: 'center' }); });
    await page.waitForTimeout(400);
    await shot(page, 'worlds');
    await page.click('.wtile[data-w="21"]');
    await page.waitForTimeout(900);
    const info = await page.evaluate(() => ({ eyebrow: document.querySelector('.home-title .eyebrow').textContent, title: document.querySelector('.home-title h2').textContent,
      flips: [...document.querySelectorAll('.flips button')].map(b => b.textContent.trim()), cards: [...document.querySelectorAll('.lvl')].map(b => b.querySelector('.lcode').textContent + ' ' + b.querySelector('.lname').textContent) }));
    console.log('     ' + JSON.stringify(info));
    check(info.eyebrow === 'World 22 · Team + versus' && info.cards.length === 4, 'World 22 page: eyebrow and 4 cards');
    check(info.cards.join('|') === '22-1 Submarine Duo|22-2 Treasure Diver Rope|22-3 Shipwreck Lights|22-4 Dolphin Race', 'card codes and names in order');
    check(info.flips.some(f => /World 21/.test(f)), 'World 22 flips back to World 21');
    // previews animate: canvases change between two moments
    const grab = () => page.evaluate(() => [...document.querySelectorAll('.lvl canvas')].map(c => { try { return c.toDataURL().length + ':' + c.toDataURL().slice(-80); } catch (e) { return 'x'; } }));
    const a = await grab(); await page.waitForTimeout(900); const b = await grab();
    check(a.length === 4 && a.every((s, k) => s !== b[k] && s.length > 2000 || s !== b[k]), 'all 4 preview canvases animate: ' + a.map((s, k) => s !== b[k]).join(','));
    await shot(page, 'world22');
    await page.setViewportSize({ width: 640, height: 360 }); await page.waitForTimeout(400);
    await shot(page, 'world22-phone');
    check(errors.length === 0, 'no page errors on home screens ' + errors.slice(0, 3).join(' | '));
    await page.close();
  }

  /* ---- World 22 in order ---- */
  {
    const { page, errors } = await open(browser, 'index.html');
    const first = await page.evaluate(() => window.__pipbo.worldLevels(21));
    check(first.length === 4, 'worldLevels(21) has 4 levels: ' + first);
    await page.evaluate(i => { const P = window.__pipbo; P.G.results = []; P.G.cpuOn = [true, true]; P.G.manual = true; P.loadLevel(i); }, first[0]);
    for (let k = 0; k < 4; k++) {
      const r = await page.evaluate(async () => {
        const P = window.__pipbo, G = P.G;
        G.manual = true; G.introT = 0; G.cpuOn = [true, true];
        const i = G.levelIndex;
        let n = 0;
        while (G.mode === 'play' && n < 700 / P.DT) { for (let j = 0; j < 600 && G.mode === 'play'; j++, n++) P.step(P.DT); await new Promise(r => setTimeout(r, 0)); }
        G.manual = false;
        return { i, code: P.levelCode(i), mode: G.mode, t: Math.round(n * P.DT) };
      });
      await page.waitForSelector('[data-act="next"]', { timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(1200);
      const label = await page.evaluate(() => { const b = document.querySelector('[data-act="next"]'); return b ? b.textContent.trim() : null; });
      check(r.mode !== 'play' && label, `${r.code} finished (${r.mode}, ${r.t}s), results button "${label}"`);
      if (k === 3) await shot(page, 'results-22-4');
      await page.click('[data-act="next"]');
      await page.waitForTimeout(900);
      if (k < 3) {
        const now = await page.evaluate(() => window.__pipbo.levelCode(window.__pipbo.G.levelIndex));
        check(now === '22-' + (k + 2), 'next went to ' + now);
      } else {
        const card = await page.evaluate(() => { const c = document.querySelector('#overlay .card, .card'); return c ? c.innerText.replace(/\s+/g, ' ').slice(0, 200) : null; });
        console.log('     world-done card: ' + card);
        check(card && /World 22|Coral Deep/.test(card), 'world-done card for World 22 shows');
        await shot(page, 'world-done');
      }
    }
    check(errors.length === 0, 'no page errors playing World 22 in order ' + errors.slice(0, 3).join(' | '));
    await page.close();
  }

  /* ---- every world still loads: each world page opens and each level runs 3 s with the computer ---- */
  {
    const { page, errors } = await open(browser, 'index.html');
    const ws = await page.evaluate(() => window.__pipbo.liveWorlds());
    check(ws.length === 22, 'liveWorlds has 22 worlds: ' + ws.length);
    for (const w of ws) {
      await page.evaluate(w => { const P = window.__pipbo; P.showTitle(); }, w);
      await page.waitForTimeout(150);
      await page.click('[data-act="worlds"]').catch(() => {});
      await page.waitForTimeout(150);
      await page.evaluate(w => { const b = document.querySelector('.wtile[data-w="' + w + '"]'); b && b.click(); }, w);
      await page.waitForTimeout(350);
    }
    const res = await page.evaluate(async () => {
      const P = window.__pipbo, G = P.G, bad = [];
      for (let i = 0; i < P.LEVELS.length; i++) {
        try {
          G.manual = true; G.cpuOn = [true, true]; P.loadLevel(i); G.introT = 0;
          for (let j = 0; j < 3 / P.DT; j++) P.step(P.DT);
        } catch (e) { bad.push(P.levelCode(i) + ': ' + e); }
        await new Promise(r => setTimeout(r, 0));
      }
      G.manual = false;
      return { n: P.LEVELS.length, bad };
    });
    check(res.bad.length === 0, `all ${res.n} levels load and run 3 s ` + res.bad.slice(0, 3).join(' | '));
    check(errors.length === 0, 'no console errors opening every world page and level ' + errors.slice(0, 3).join(' | '));
    await page.close();
  }

  /* ---- bundled file ---- */
  {
    const { page, errors } = await open(browser, 'build/pip-and-bo.html');
    const i = await page.evaluate(() => window.__pipbo.worldLevels(21)[0]);
    await page.evaluate(i => window.__pipbo.loadLevel(i), i);
    await page.waitForTimeout(2500);
    const st = await page.evaluate(() => ({ mode: window.__pipbo.G.mode, name: window.__pipbo.LEVELS[window.__pipbo.G.levelIndex].name }));
    await shot(page, 'bundle-22-1');
    check(st.name === 'Submarine Duo' && st.mode === 'play', 'bundle: 22-1 loads ' + JSON.stringify(st));
    check(errors.length === 0, 'no page errors in bundle ' + errors.slice(0, 3).join(' | '));
    await page.close();
  }
  await browser.close();
  console.log(bad ? bad + ' FAILED' : 'all ok');
  process.exit(bad ? 1 : 0);
})();
