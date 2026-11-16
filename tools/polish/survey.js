#!/usr/bin/env node
// Graphics polish survey: for each level, screenshots of the ready card, play (computer pair at a few times) and the
// pause card, on a laptop and a phone size, plus a check that every word fits its box.
//   Canvas: every fillText is measured and compared with the last box (rr() / fillRect / roundRect) drawn under it
//   in the same frame, and with the 960x540 screen.
//   Menus: every text in the visible overlay is checked against its own box (clipped, cut off or spilling out) and
//   against the screen.
// Usage: node tools/polish/survey.js [levels|w5|w5-9|all] [--out=build/polish] [--times=3,20,60] [--sizes=laptop,phone]
//        [--noshots]   (only the text checks)
'use strict';
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const flag = k => args.includes('--' + k);
const root = path.resolve(__dirname, '..', '..');
const out = path.resolve(root, opt('out', 'build/polish'));
const times = opt('times', '3,20,60').split(',').map(Number);
const sizes = opt('sizes', 'laptop,phone').split(',');
const noshots = flag('noshots');
const SIZES = { laptop: { viewport: { width: 1280, height: 760 } }, phone: { viewport: { width: 844, height: 390 }, touch: true }, small: { viewport: { width: 1024, height: 600 } } };
const sel = args.find(a => !a.startsWith('--')) || 'all';

const PROBE = () => {
  // canvas text probe: window.__probe = true makes the next render() record boxes and texts
  const P = CanvasRenderingContext2D.prototype;
  const S = window.__probeData = { on: false, boxes: [], texts: [] };
  const box = (ctx, x, y, w, h, kind) => {
    if (!S.on) return;
    const m = ctx.getTransform();
    if (w < 0) { x += w; w = -w; } if (h < 0) { y += h; h = -h; }
    const pts = [[x, y], [x + w, y], [x, y + h], [x + w, y + h]].map(([a, b]) => [m.a * a + m.c * b + m.e, m.b * a + m.d * b + m.f]);
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    S.boxes.push({ x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys), kind, n: S.boxes.length, a: ctx.globalAlpha });
  };
  const fr = P.fillRect; P.fillRect = function (x, y, w, h) { box(this, x, y, w, h, 'rect'); return fr.apply(this, arguments); };
  const rrc = P.roundRect; if (rrc) P.roundRect = function (x, y, w, h) { this.__pend = [x, y, w, h]; return rrc.apply(this, arguments); };
  const bp = P.beginPath; P.beginPath = function () { this.__pend = null; return bp.apply(this, arguments); };
  const fill = P.fill; P.fill = function () { if (this.__pend) { const [x, y, w, h] = this.__pend; box(this, x, y, w, h, 'rr'); } return fill.apply(this, arguments); };
  const ft = P.fillText; P.fillText = function (str, x, y, maxW) {
    if (S.on && String(str).trim()) {
      const mt = this.measureText(str); let w = mt.width; const sc = maxW !== undefined && w > maxW ? maxW / w : 1; w *= sc;
      const al = this.textAlign, x0 = al === 'center' ? x - w / 2 : (al === 'right' || al === 'end') ? x - w : x;
      const asc = mt.actualBoundingBoxAscent, desc = mt.actualBoundingBoxDescent, lft = -mt.actualBoundingBoxLeft * sc;
      const m = this.getTransform();
      const pts = [[x0, y - asc], [x0 + w, y - asc], [x0, y + desc], [x0 + w, y + desc]].map(([a, b]) => [m.a * a + m.c * b + m.e, m.b * a + m.d * b + m.f]);
      const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
      S.texts.push({ str: String(str), x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys), n: S.boxes.length, font: this.font, a: this.globalAlpha, rot: Math.abs(m.b) > 0.01 });
    }
    return ft.apply(this, arguments);
  };
  window.addEventListener('load', () => {
    const r0 = window.rr;
    if (typeof r0 === 'function') window.rr = function (x, y, w, h) { const c = window.ctx || document.getElementById('game').getContext('2d'); const res = r0.apply(this, arguments); c.__pend = [x, y, w, h]; return res; };
    const ren = window.render;
    window.render = function () {
      const c = document.getElementById('game');
      if (window.__probe) { S.on = true; S.boxes = []; S.texts = []; S.cw = c.width; S.ch = c.height; }
      try { return ren.apply(this, arguments); } finally { if (S.on) { S.on = false; window.__probe = false; S.done = true; } }
    };
  });
};

// in page: compare texts with boxes. Coordinates are canvas pixels; the canvas may be drawn at a scale (dpr).
const ANALYSE = () => {
  const S = window.__probeData, c = document.getElementById('game');
  const sx = S.cw / 960, sy = S.ch / 540, bad = [];
  for (const t of S.texts) {
    if (t.a < 0.15) continue;
    const tw = t.x1 - t.x0, th = t.y1 - t.y0;
    // off screen
    if (t.x0 < -1 || t.x1 > S.cw + 1 || t.y0 < -1 || t.y1 > S.ch + 1) {
      // only text that is partly on screen (a scrolling level draws plenty of text out of view)
      const vis = Math.max(0, Math.min(t.x1, S.cw) - Math.max(t.x0, 0)) / Math.max(1, tw), visY = Math.max(0, Math.min(t.y1, S.ch) - Math.max(t.y0, 0)) / Math.max(1, th);
      if (vis > 0.05 && visY > 0.3) bad.push({ why: 'off screen', str: t.str, at: [t.x0 / sx, t.y0 / sy, t.x1 / sx, t.y1 / sy].map(Math.round) });
      continue;
    }
    // the last box drawn before this text whose area holds the text's middle, not much bigger than the canvas
    const cx = (t.x0 + t.x1) / 2, cy = (t.y0 + t.y1) / 2;
    let best = null;
    for (const b of S.boxes) {
      if (b.n > t.n) break;
      const bw = b.x1 - b.x0, bh = b.y1 - b.y0;
      if (b.a < 0.2 || bw > S.cw * 0.7 || bh > S.ch * 0.7) continue;
      if (bh < th * 0.8 || bw < 6) continue;
      if (cx < b.x0 || cx > b.x1 || cy < b.y0 || cy > b.y1) continue;
      best = b; // the last one drawn under it (the box it sits on)
    }
    if (!best) continue;
    const pad = 1.5 * sx;
    const over = Math.max(best.x0 - t.x0, t.x1 - best.x1, (best.y0 - t.y0) * 0.6, (t.y1 - best.y1) * 0.6);
    if (over > pad) bad.push({ why: 'spills out of its box', by: Math.round(over / sx), str: t.str, text: [t.x0 / sx, t.y0 / sy, t.x1 / sx, t.y1 / sy].map(Math.round), box: [best.x0 / sx, best.y0 / sy, best.x1 / sx, best.y1 / sy].map(Math.round) });
    else {
      // tight: less than 3 px air on a side (only for pill-like boxes)
      const air = Math.min(t.x0 - best.x0, best.x1 - t.x1) / sx;
      if (air < 3 && best.kind === 'rr' && (best.x1 - best.x0) < S.cw * 0.5) bad.push({ why: 'touches its box edge', air: Math.round(air * 10) / 10, str: t.str });
    }
  }
  return bad;
};

const DOMCHECK = () => {
  const ov = document.getElementById('overlay'); const bad = [];
  if (!ov || getComputedStyle(ov).display === 'none' || ov.hidden) return bad;
  const vw = innerWidth, vh = innerHeight;
  const walker = document.createTreeWalker(ov, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  while (walker.nextNode()) {
    const n = walker.currentNode; if (!n.textContent.trim()) continue;
    const el = n.parentElement; if (!el || seen.has(el)) continue; seen.add(el);
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    const r = document.createRange(); r.selectNodeContents(el); const tr = r.getBoundingClientRect();
    if (!tr.width) continue;
    const label = (el.className ? el.tagName.toLowerCase() + '.' + String(el.className).split(' ')[0] : el.tagName.toLowerCase()) + ' "' + el.textContent.trim().slice(0, 40) + '"';
    if (tr.left < -1 || tr.right > vw + 1 || tr.top < -1 || tr.bottom > vh + 1) {
      // inside a scrolling card that's ok if the card scrolls
      let s = el, scroll = false; while (s && s !== document.body) { const o = getComputedStyle(s).overflowY; if ((o === 'auto' || o === 'scroll') && s.scrollHeight > s.clientHeight) { scroll = true; break; } s = s.parentElement; }
      if (!scroll || tr.left < -1 || tr.right > vw + 1) bad.push({ why: 'off screen', el: label, rect: [tr.left, tr.top, tr.right, tr.bottom].map(Math.round) });
    }
    // the text against the box it sits in: walk up to the first ancestor that draws a box (background or border)
    let b = el;
    while (b && b !== ov) { const s = getComputedStyle(b); if ((s.backgroundColor !== 'rgba(0, 0, 0, 0)' && s.backgroundColor !== 'transparent') || s.backgroundImage !== 'none' || parseFloat(s.borderTopWidth) > 0) break; b = b.parentElement; }
    if (b && b !== ov) {
      const br = b.getBoundingClientRect();
      const over = Math.max(br.left - tr.left, tr.right - br.right, br.top - tr.top, tr.bottom - br.bottom);
      if (over > 1) bad.push({ why: 'spills out of its box', by: Math.round(over), el: label, box: (b.className ? b.tagName.toLowerCase() + '.' + String(b.className).split(' ')[0] : b.tagName.toLowerCase()) });
    }
    if ((cs.overflow === 'hidden' || cs.textOverflow === 'ellipsis' || cs.overflowX === 'hidden') && (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 2)) bad.push({ why: 'cut off', el: label, need: [el.scrollWidth, el.scrollHeight], has: [el.clientWidth, el.clientHeight] });
    // a word broken mid-line by overflow-wrap (one long word wider than the box)
    if (el.scrollWidth > el.clientWidth + 1 && cs.overflowX === 'visible' && el.clientWidth > 0 && cs.display !== 'inline') bad.push({ why: 'wider than its box', el: label, need: el.scrollWidth, has: el.clientWidth });
  }
  return bad;
};

(async () => {
  const browser = await chromium.launch();
  fs.mkdirSync(out, { recursive: true });
  const report = {};
  for (const size of sizes) {
    const S = SIZES[size];
    let ctx, page; const errors = [];
    const open = async () => {
      if (ctx) await ctx.close().catch(() => {});
      ctx = await browser.newContext({ viewport: S.viewport, deviceScaleFactor: 1, hasTouch: !!S.touch, isMobile: !!S.touch });
      page = await ctx.newPage();
      page.on('pageerror', e => errors.push(String(e.message)));
      await page.addInitScript(PROBE);
      await page.goto('file://' + path.join(root, 'index.html'));
      await page.waitForFunction(() => window.__pipbo && document.fonts.status === 'loaded');
      await page.waitForTimeout(300);
    };
    await open();
    const list = await page.evaluate(() => window.__pipbo.LEVELS.map((l, i) => ({ i, code: window.__pipbo.levelCode(i), name: l.name, world: l.world + 1, kind: l.kind })));
    let want = list;
    if (sel !== 'all') {
      const parts = sel.split(',');
      want = list.filter(l => parts.some(p => {
        const m = /^w(\d+)(?:-(\d+))?$/.exec(p); if (m) return l.world >= +m[1] && l.world <= +(m[2] || m[1]);
        return p === l.code || p === l.name || p === String(l.i);
      }));
    }
    for (const lv of want) {
      const key = lv.code + ' ' + lv.name, slug = lv.code + '-' + lv.name.replace(/[^A-Za-z0-9]+/g, '-');
      const rep = report[key] = report[key] || {};
      const R = rep[size] = { ready: [], pause: [], play: [], errors: [] };
      errors.length = 0;
      try {
      const dir = path.join(out, 'w' + String(lv.world).padStart(2, '0'));
      fs.mkdirSync(dir, { recursive: true });
      const shot = async name => { if (!noshots) await page.screenshot({ path: path.join(dir, `${slug}-${size}-${name}.png`) }); };
      // ready card
      await page.evaluate(i => { const P = window.__pipbo; P.G.manual = false; P.startLevel(i); }, lv.i);
      await page.waitForTimeout(350);
      R.ready = await page.evaluate(DOMCHECK);
      await shot('0-ready');
      // play with the computer at both seats, stepping by hand
      await page.evaluate(i => { const P = window.__pipbo, G = P.G; document.getElementById('overlay').classList.add('hidden'); G.manual = true; G.cpuOn = [true, true]; P.loadLevel(i); G.introT = 0; }, lv.i);
      let simT = 0;
      for (let ti = 0; ti < times.length; ti++) {
        const t = times[ti];
        const r = await page.evaluate(async dt => {
          const P = window.__pipbo, G = P.G; const n = Math.round(dt / P.DT);
          for (let k = 0; k < n && G.mode === 'play'; k++) { P.step(P.DT); if (k % 600 === 599) await new Promise(r => setTimeout(r, 0)); }
          return G.mode;
        }, t - simT);
        simT = t;
        // the HUD and a frame of the level, then the canvas text check
        await page.evaluate(() => { window.__probe = true; window.__probeData.done = false; });
        await page.waitForFunction(() => window.__probeData.done, null, { timeout: 3000 }).catch(() => {});
        const bad = await page.evaluate(ANALYSE);
        for (const b of bad) { b.t = t; R.play.push(b); }
        await shot('1-play-' + t + 's');
        if (r !== 'play') break;
      }
      // pause card
      const pm = await page.evaluate(() => { const P = window.__pipbo; if (P.G.mode === 'play') { P.pause(); return true; } return false; });
      if (pm) { await page.waitForTimeout(250); R.pause = await page.evaluate(DOMCHECK); await shot('2-pause'); await page.evaluate(() => window.__pipbo.resume()); }
      } catch (e) { R.crash = String(e.message).split('\n')[0]; console.log('  crash: ' + R.crash); await open(); }
      R.errors = errors.slice(0, 5);
      const n = R.ready.length + R.pause.length + R.play.length;
      console.log(`${size.padEnd(6)} ${lv.code.padEnd(6)} ${lv.name.padEnd(28)} ready ${R.ready.length} pause ${R.pause.length} canvas ${R.play.length}${R.errors.length ? ' ERR ' + R.errors[0] : ''}`);
    }
    await ctx.close();
  }
  fs.writeFileSync(path.join(out, 'report-' + sel.replace(/[^A-Za-z0-9-]+/g, '_') + '-' + sizes.join('_') + '.json'), JSON.stringify(report, null, 1));
  await browser.close();
})();
