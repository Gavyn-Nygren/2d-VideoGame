#!/usr/bin/env node
// Settings screen check: opening it from the title and the pause card, volume and full screen, and changing keys and
// controller buttons (with the keyboard, a stubbed controller and touch). Screenshots go to build/settings/.
// Usage: node tools/settings/check.js
'use strict';
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..', '..'), out = path.join(root, 'build', 'settings');
fs.mkdirSync(out, { recursive: true });
let bad = 0;
const check = (ok, msg) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) bad++; };

async function open(browser, vp, opts = {}) {
  const ctx = opts.ctx || await browser.newContext({ viewport: vp, deviceScaleFactor: opts.dpr || 1, hasTouch: !!opts.touch, isMobile: !!opts.touch });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  if (opts.pad) await page.addInitScript(() => {
    const pad = { id: 'Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e)', index: 0, connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) };
    window.__pad = pad;
    navigator.getGamepads = () => [pad];
  });
  await page.goto('file://' + path.join(root, 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  await page.waitForTimeout(1000);
  return { ctx, page, errors };
}
const focused = page => page.evaluate(() => { const a = document.activeElement; return a ? [a.dataset.act, a.dataset.p, a.dataset.dev, a.dataset.w].filter(x => x != null).join(':') : ''; });
const onSettings = page => page.evaluate(() => !!document.querySelector('.settings-card'));

(async () => {
  const browser = await chromium.launch();

  /* ---- keyboard ---- */
  {
    const { ctx, page, errors } = await open(browser, { width: 1280, height: 800 });
    check(await page.locator('.title-screen [data-act="syscfg"]').count() === 0, 'the title has no loose sound buttons any more');
    check(await page.locator('.title-screen [data-act="settings"]').count() === 1, 'the title has a Settings button');
    await page.screenshot({ path: path.join(out, '1-title.png') });
    // keyboard: down to How to play, right to Settings
    for (let k = 0; k < 2; k++) { await page.keyboard.press('ArrowDown'); await page.waitForTimeout(80); }
    await page.keyboard.press('ArrowRight'); await page.waitForTimeout(80);
    check(await focused(page) === 'settings', `arrows reach Settings (${await focused(page)})`);
    await page.keyboard.press('Enter'); await page.waitForTimeout(500);
    check(await onSettings(page), 'Enter opens Settings');
    check(await page.locator('.settings-card [data-act="syscfg"][data-k="music"]').count() === 4 && await page.locator('.settings-card [data-act="syscfg"][data-k="sfx"]').count() === 4, 'Settings has Music and Sounds volume');
    await page.click('[data-act="syscfg"][data-k="music"][data-v="1"]'); await page.waitForTimeout(100);
    check(await page.evaluate(() => window.__pipbo.Sfx.vol.music) === 1, 'Music volume changes');
    await page.click('[data-act="syscfg"][data-k="music"][data-v="2"]');
    // rebind Pip's jump to Q with the keyboard
    await page.click('[data-act="bind"][data-p="0"][data-dev="key"][data-w="jump"]'); await page.waitForTimeout(100);
    check(await page.locator('.bind.waiting').count() === 1, 'pressing a key button waits for a key');
    await page.screenshot({ path: path.join(out, '3-waiting-for-key.png') });
    await page.keyboard.press('KeyR'); await page.waitForTimeout(80);
    check(await page.locator('.bind.waiting').count() === 1, 'R is refused (it restarts levels), still waiting');
    await page.keyboard.press('KeyQ'); await page.waitForTimeout(100);
    let s = await page.evaluate(() => ({ b: window.__pipbo.BIND[0].jump, cap: window.__pipbo.KEYCAPS[0].jump, lab: window.__pipbo.btnLabel(0, 'jump') }));
    check(s.b.join() === 'KeyQ' && s.cap === 'Q' && s.lab === 'Q', `Pip's jump is now Q (${JSON.stringify(s)})`);
    // a key that Bo has swaps over
    await page.click('[data-act="bind"][data-p="0"][data-dev="key"][data-w="act"]'); await page.keyboard.press('ArrowUp'); await page.waitForTimeout(100);
    s = await page.evaluate(() => ({ pip: window.__pipbo.BIND[0].act, bo: window.__pipbo.BIND[1].jump }));
    check(s.pip.join() === 'ArrowUp' && s.bo.join() === 'KeyF', `taking Bo's ↑ swaps: Bo jumps with F (${JSON.stringify(s)})`);
    await page.screenshot({ path: path.join(out, '2-settings-laptop.png') });
    // Escape cancels a wait, then Escape leaves
    await page.click('[data-act="bind"][data-p="1"][data-dev="key"][data-w="left"]'); await page.keyboard.press('Escape'); await page.waitForTimeout(100);
    check(await onSettings(page) && await page.locator('.bind.waiting').count() === 0, 'Esc cancels a wait and stays on Settings');
    await page.keyboard.press('Escape'); await page.waitForTimeout(500);
    check(!(await onSettings(page)) && await focused(page) === 'settings', 'Esc again goes back to the title, Settings focused');
    // How to play shows the new keys
    const how = await page.evaluate(() => { document.querySelector('[data-act="howto"]').click(); return document.querySelector('.howto-card .pcard.pip').textContent; });
    check(/Q\s*jump/.test(how), 'How to play shows Pip jumping with Q');
    // it is saved
    await page.reload(); await page.waitForFunction(() => window.__pipbo && window.__pipbo.G); await page.waitForTimeout(600);
    s = await page.evaluate(() => ({ b: window.__pipbo.BIND[0].jump.join(), cap: window.__pipbo.KEYCAPS[0].jump, vol: window.__pipbo.Sfx.vol.music }));
    check(s.b === 'KeyQ' && s.cap === 'Q', `the keys are kept after a reload (${JSON.stringify(s)})`);
    // in a level, Q jumps for Pip
    await page.evaluate(() => { window.__pipbo.loadLevel(0); });
    await page.waitForTimeout(300);
    await page.keyboard.down('KeyQ'); await page.waitForTimeout(120);
    const jumped = await page.evaluate(() => window.__pipbo.G.players[0].input.jump);
    await page.keyboard.up('KeyQ');
    check(jumped, 'in a level, Q is Pip\'s jump');
    // the pause card opens the same Settings, and Back returns to it
    await page.keyboard.press('Escape'); await page.waitForTimeout(400);
    check(await page.locator('.card [data-act="settings"]').count() === 1, 'the pause card has a Settings button');
    await page.click('.card [data-act="settings"]'); await page.waitForTimeout(400);
    check(await onSettings(page) && /Back to the game/.test(await page.locator('[data-act="settings-back"]').textContent()), 'Settings opens from the pause card with "Back to the game"');
    await page.screenshot({ path: path.join(out, '5-from-pause.png') });
    await page.keyboard.press('Escape'); await page.waitForTimeout(400);
    check(await page.evaluate(() => window.__pipbo.G.mode) === 'paused' && await page.locator('[data-act="resume"]').count() === 1, 'Esc on Settings goes back to the pause card');
    const ctl = await page.locator('.ctl-lines').textContent();
    check(/Q/.test(ctl), 'the pause card\'s controls show Q');
    // reset
    await page.click('.card [data-act="settings"]'); await page.waitForTimeout(300);
    await page.click('[data-act="bind-reset"][data-p="0"]'); await page.waitForTimeout(100);
    s = await page.evaluate(() => ({ pip: window.__pipbo.BIND[0], bo: window.__pipbo.BIND[1] }));
    check(s.pip.jump.join() === 'KeyW,Space' && s.pip.act.join() === 'KeyF,KeyE' && s.bo.jump.join() === 'ArrowUp', `Reset puts Pip (and Bo's swapped key) back (${JSON.stringify(s)})`);
    check(!errors.length, 'keyboard: no errors ' + errors.join(' | '));
    await ctx.close();
  }

  /* ---- controller ---- */
  {
    const { ctx, page, errors } = await open(browser, { width: 1280, height: 800 }, { pad: true });
    const press = async b => { await page.evaluate(b => { window.__pad.buttons[b].pressed = true; window.__pad.buttons[b].value = 1; }, b); await page.waitForTimeout(160);
      await page.evaluate(b => { window.__pad.buttons[b].pressed = false; window.__pad.buttons[b].value = 0; }, b); await page.waitForTimeout(200); };
    await press(1); await page.waitForTimeout(800);
    await press(13); await press(13); await press(15);
    check(await focused(page) === 'settings', `controller: d-pad reaches Settings (${await focused(page)})`);
    await press(0); await page.waitForTimeout(500);
    check(await onSettings(page), 'controller: A opens Settings');
    // move to Pip's controller Jump button and pick it
    await page.evaluate(() => document.querySelector('[data-act="bind"][data-p="0"][data-dev="pad"][data-w="jump"]').focus());
    await press(0); await page.waitForTimeout(150);
    check(await page.locator('.bind.waiting').count() === 1, 'controller: A on Jump waits for a button');
    await press(13); await page.waitForTimeout(100);
    check(await page.locator('.bind.waiting').count() === 1, 'controller: the d-pad is refused, still waiting');
    await press(3); await page.waitForTimeout(150);
    let s = await page.evaluate(() => ({ pb: window.__pipbo.PadBind[0], lab: window.__pipbo.btnLabel(0, 'jump'), act: window.__pipbo.btnLabel(0, 'act'), focus: document.activeElement.dataset.w }));
    check(s.pb && s.pb.jump.join() === '3' && s.lab === 'Y' && s.focus === 'jump', `controller: Pip's jump is now Y and focus stays (${JSON.stringify(s)})`);
    await page.screenshot({ path: path.join(out, '4-settings-controller.png') });
    await press(1); await page.waitForTimeout(400);
    check(!(await onSettings(page)), 'controller: B goes back to the title');
    // in a level, Y jumps and A does not
    await page.evaluate(() => window.__pipbo.loadLevel(0)); await page.waitForTimeout(300);
    const held = async b => { await page.evaluate(b => { window.__pad.buttons[b].pressed = true; window.__pad.buttons[b].value = 1; }, b); await page.waitForTimeout(120);
      const j = await page.evaluate(() => window.__pipbo.G.players[0].input.jump);
      await page.evaluate(b => { window.__pad.buttons[b].pressed = false; window.__pad.buttons[b].value = 0; }, b); await page.waitForTimeout(120); return j; };
    check(await held(3) === true && await held(0) === false, 'controller: in a level Y jumps for Pip and A no longer does');
    check(!errors.length, 'controller: no errors ' + errors.join(' | '));
    await ctx.close();
  }

  /* ---- touch, phone held sideways ---- */
  {
    const { ctx, page, errors } = await open(browser, { width: 844, height: 390 }, { touch: true });
    await page.tap('[data-act="settings"]'); await page.waitForTimeout(500);
    check(await onSettings(page), 'touch: tapping Settings opens it');
    await page.tap('[data-act="syscfg"][data-k="sfx"][data-v="1"]'); await page.waitForTimeout(100);
    check(await page.evaluate(() => window.__pipbo.Sfx.vol.sfx) === 1, 'touch: tapping Sounds Low works');
    const hs = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    check(!hs, 'touch: no sideways scroll');
    await page.screenshot({ path: path.join(out, '6-phone.png') });
    await page.tap('[data-act="settings-back"]'); await page.waitForTimeout(400);
    check(!(await onSettings(page)), 'touch: Back returns to the title');
    check(!errors.length, 'touch: no errors ' + errors.join(' | '));
    await ctx.close();
  }
  await browser.close();
  console.log(bad ? `${bad} FAILED` : 'all ok');
  process.exit(bad ? 1 : 0);
})();
