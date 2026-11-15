/* Pip & Bo - Controls: which device each player is on (keyboard, Xbox / PlayStation / Switch / other controller,
   touch), button prompts that match it, the top-bar legend, and the ready card before a level.

   For level code (all of it is per player, so a keyboard player next to a controller player each see their own):
     playerDevice(id)            -> { kind: 'kb' | 'pad' | 'touch', family: 'xbox' | 'ps' | 'nintendo' | 'generic' | null, name }
     btnLabel(id, what)          -> plain text for a canvas hint: 'W', '↑', 'A', '✕', '▲', '●' ...
     btnHTML(id, what)           -> the same button as HTML for a card
     drawBtn(id, what, x, y, o)  -> draws the button on the game canvas (o: { size, label, alpha, align }); returns its width
     what is 'left', 'right', 'jump', 'down', 'act' or 'move' (left + right)
   A level writes its controls once, as Pip's and Bo's keyboard lines (def.legend, see setLegend in js/ui.js);
   controlsLine() rewrites the line for whatever each player holds, so there is no second copy per device.

   The ready card (showReadyCard): opened by startLevel(i) from the menus. It shows the level's tip, optional
   def.howTo lines, each player's own controls, and waits until every person has pressed their jump or action button
   (one person in 1-player mode; the computer is always ready). loadLevel(i) itself still starts at once (tests, R). */
'use strict';

/* ---------- devices ---------- */
const DEVICE_NAMES = { kb: 'Keyboard', touch: 'Touch buttons' };
function playerDevice(id) {
  const pad = padFor(padSlots(), id), canTouch = document.documentElement.classList.contains('has-touch');
  let kind = Dev.last[id];
  if (kind === 'pad' && !pad) kind = null;          // (their controller dropped out)
  if (kind === 'touch' && !canTouch) kind = null;
  // nothing pressed yet: a controller assigned to them, else touch on a touch screen, else the keyboard
  if (!kind) kind = pad ? 'pad' : canTouch && Pads.lastNonPad === 'touch' ? 'touch' : 'kb';
  const family = kind === 'pad' ? padFamilyFor(id) : null;
  return { kind, family, name: kind === 'pad' ? (family === 'generic' ? 'Controller' : GLYPHS[family].name + ' controller') : DEVICE_NAMES[kind] };
}
// 1-player mode: the computer's character has no device
const isCpuPlayer = id => cpuSolo() && id !== cpuHuman();
// which keys a keyboard player is shown: their own set, or (one person, who may use both) the set they last pressed
const keysetFor = id => (cpuSolo() && Dev.keyset != null ? Dev.keyset : id);
const KEYCAPS = [
  { left: 'A', right: 'D', jump: 'W', down: 'S', act: 'F' },
  { left: '←', right: '→', jump: '↑', down: '↓', act: '/' },
];
const KEY_MEANS = { A: 'left', D: 'right', W: 'jump', S: 'down', F: 'act', E: 'act', Space: 'jump', '←': 'left', '→': 'right', '↑': 'jump', '↓': 'down', '/': 'act' };
const ARROWS = { left: '◀', right: '▶', jump: '▲', down: '▼', up: '▲' };

// everything that changes what the prompts say; pollInput calls controlsWatch() every frame and a change redraws them
function controlsWatch() {
  const sig = [0, 1].map(k => { if (isCpuPlayer(k)) return 'cpu'; const d = playerDevice(k); return d.kind + (d.family || '') + keysetFor(k); }).join('|')
    + '|' + Pads.family + (Pads.swap ? 's' : '');
  if (sig === Dev.sig) return;
  Dev.sig = sig;
  controlsRefresh();
}
function controlsRefresh() {
  legendRender();
  if (G.mode === 'ready') readyRender();
  if (G.mode === 'paused') overlay.querySelectorAll('[data-pause-who]').forEach(el => { el.innerHTML = pauseWhoHTML(); });
  refreshGlyphs();
}

/* ---------- one button ---------- */
function btnLabel(id, what) {
  const d = playerDevice(id);
  if (what === 'move') return d.kind === 'pad' ? 'stick' : btnLabel(id, 'left') + ' ' + btnLabel(id, 'right');
  if (d.kind === 'kb') return KEYCAPS[keysetFor(id)][what] || '';
  if (d.kind === 'touch') return what === 'act' ? '●' : ARROWS[what] || '';
  if (what === 'jump') return glyph('a', id);
  if (what === 'act') return glyph(padActGlyph(), id);
  return ARROWS[what] || '';
}
// def.act.padGlyph names another controller button for the action (e.g. 'a' where A does it for a seated role)
function padActGlyph() { const a = G.level && G.level.def.act; return (a && a.padGlyph) || 'act'; }
const padGlyphHTML = (g, id) => `<span data-glyph="${esc(g)}" data-gp="${id}" class="glyph g-${padFamilyFor(id)}-${esc(g)}">${esc(glyph(g, id))}</span>`;
function btnHTML(id, what) {
  const d = playerDevice(id);
  if (what === 'move') return d.kind === 'pad' ? '<kbd class="k-stick">stick</kbd>' : btnHTML(id, 'left') + btnHTML(id, 'right');
  if (d.kind === 'kb') return `<kbd>${esc(KEYCAPS[keysetFor(id)][what] || '')}</kbd>`;
  if (d.kind === 'touch') return what === 'act' ? '<kbd class="k-touch k-round">●</kbd>' : `<kbd class="k-touch">${ARROWS[what] || ''}</kbd>`;
  if (what === 'jump') return padGlyphHTML('a', id);
  if (what === 'act') return padGlyphHTML(padActGlyph(), id);
  return `<kbd class="k-stick">${ARROWS[what] || ''}</kbd>`;
}

/* ---------- a line of controls ---------- */
// html is a keyboard line such as '<kbd>A</kbd><kbd>D</kbd> move <kbd>W</kbd> jump'. Every key in it that means
// left / right / jump / down / action becomes that player's own button; other keys and all the words stay.
function controlsLine(id, html) {
  const d = playerDevice(id);
  let stickSaid = false;
  return String(html).replace(/(?:<kbd>[^<]*<\/kbd>)+/g, group => {
    const caps = group.match(/<kbd>[^<]*<\/kbd>/g).map(t => t.slice(5, -6));
    const means = caps.map(c => KEY_MEANS[c] || null);
    if (d.kind === 'pad') {
      const dirs = means.filter(m => m && m !== 'act');
      // all four directions together is the whole stick; jump next to down is the stick's up
      if (dirs.length >= 4 && ['left', 'right', 'jump', 'down'].every(m => means.includes(m))) { stickSaid = true; return '<kbd class="k-stick">stick</kbd>'; }
      const vertical = means.includes('jump') && means.includes('down');
      return means.map((m, k) => {
        if (!m) return `<kbd>${caps[k]}</kbd>`;
        if (m === 'act' || (m === 'jump' && !vertical)) return btnHTML(id, m);
        const said = stickSaid; stickSaid = true;
        return (said ? '' : '<span class="k-word">stick</span>') + `<kbd class="k-stick">${ARROWS[m]}</kbd>`;
      }).join('');
    }
    return means.map((m, k) => (m ? btnHTML(id, m) : `<kbd>${caps[k]}</kbd>`)).join('');
  });
}
// a level's legend (def.legend) as each player's keyboard line. { pip, bo } replace a whole line; { jump, down }
// replace just those words in the default line.
const LEGEND_DEFAULT = ['<kbd>A</kbd><kbd>D</kbd> move <kbd>W</kbd> jump <kbd>S</kbd> drop', '<kbd>←</kbd><kbd>→</kbd> move <kbd>↑</kbd> jump <kbd>↓</kbd> drop'];
function legendBase(id, lg) {
  if (typeof lg === 'function') lg = lg();
  if (lg && lg[id === 0 ? 'pip' : 'bo']) return lg[id === 0 ? 'pip' : 'bo'];
  let h = LEGEND_DEFAULT[id];
  if (lg && (lg.jump || lg.padJump)) h = h.replace('</kbd> jump', '</kbd> ' + (lg.jump || lg.padJump));
  if (lg && lg.down) h = h.replace('</kbd> drop', '</kbd> ' + lg.down);
  return h;
}
// that player's controls for this level, in their own buttons. (Older levels also carry a hand-written controller
// line, legend.pad, one sentence for both roles. It is no longer shown: the player's own line is rewritten instead.)
function playerControlsHTML(id, lg) { return controlsLine(id, legendBase(id, lg)); }

/* ---------- the top-bar legend ---------- */
const Legend = { cur: null };
function legendRender() {
  const root = document.querySelector('.legend');
  if (!root) return;
  let lg = Legend.cur;
  if (typeof lg === 'function') lg = lg();
  const devs = [0, 1].map(k => (isCpuPlayer(k) ? null : playerDevice(k)));
  const put = (el, h) => { if (el && el.innerHTML !== h) el.innerHTML = h; };
  let shown = 0;
  for (const k of [0, 1]) {
    const box = root.querySelector(`[data-legp="${k}"]`), d = devs[k];
    if (!box) continue;
    box.hidden = !d || d.kind === 'touch';
    if (box.hidden) continue;
    shown++;
    put(box.querySelector('[data-leg]'), playerControlsHTML(k, lg));
    put(box.querySelector('[data-actkey]'), btnHTML(k, 'act'));
  }
  const sys = root.querySelector('[data-legsys]');
  if (sys) {
    const kb = devs.some(d => d && d.kind === 'kb'), pad = devs.some(d => d && d.kind === 'pad');
    sys.hidden = !kb && !pad;
    put(sys, kb ? '<kbd>R</kbd> restart <kbd>Esc</kbd> pause' : pad ? '<span data-glyph="start"></span> pause' : '');
  }
  root.hidden = !shown;
}

/* ---------- a button drawn on the game canvas ---------- */
const PAD_COLS = {
  xbox: { a: '#3e9b3a', b: '#c8382e', act: '#2f6fd6' }, ps: { a: '#3d6fd6', b: '#d1425a', act: '#b9559f' },
  nintendo: { a: '#4a4766', b: '#4a4766', act: '#4a4766' }, generic: { a: '#4a4766', b: '#4a4766', act: '#4a4766' },
};
// drawBtn(1, 'act', x, y, { label: 'punch' }): Bo's action button as he has it (a keycap, a coloured controller
// button, or a touch button), centred on x, y, with an optional word after it. Returns the width drawn.
function drawBtn(id, what, x, y, o = {}) {
  const d = playerDevice(id), s = o.size || 22, lab = btnLabel(id, what);
  const isBtn = d.kind === 'pad' && (what === 'jump' || what === 'act');
  ctx.save();
  if (o.alpha != null) ctx.globalAlpha *= o.alpha;
  ctx.font = `700 ${Math.round(s * 0.6)}px "Atkinson Hyperlegible", system-ui, sans-serif`;
  const bw = Math.max(s, Math.ceil(ctx.measureText(lab).width) + s * 0.5);
  ctx.font = `700 ${Math.round(s * 0.62)}px "Atkinson Hyperlegible", system-ui, sans-serif`;
  const lw = o.label ? Math.ceil(ctx.measureText(o.label).width) + s * 0.3 : 0, total = bw + lw;
  const x0 = o.align === 'left' ? x : o.align === 'right' ? x - total : x - total / 2;
  if (isBtn) {
    const g = what === 'jump' ? 'a' : padActGlyph();
    ctx.fillStyle = ((PAD_COLS[d.family] || PAD_COLS.generic)[g]) || '#4a4766';
    rr(x0, y - s / 2, bw, s, s / 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 1.5; rr(x0, y - s / 2, bw, s, s / 2); ctx.stroke();
  } else if (d.kind === 'touch') {
    ctx.fillStyle = id === 0 ? 'rgba(255,107,74,0.85)' : 'rgba(91,149,255,0.85)';
    rr(x0, y - s / 2, bw, s, what === 'act' ? s / 2 : s * 0.28); ctx.fill();
  } else {
    // a keycap (keyboard), or the stick's direction (controller)
    ctx.fillStyle = '#15132b'; rr(x0, y - s / 2 + 2, bw, s, s * 0.26); ctx.fill();
    ctx.fillStyle = '#26244a'; rr(x0, y - s / 2, bw, s - 1, s * 0.26); ctx.fill();
    ctx.strokeStyle = d.kind === 'pad' ? 'rgba(255,255,255,0.45)' : '#6a66a8'; ctx.lineWidth = 1.5; rr(x0, y - s / 2, bw, s - 1, s * 0.26); ctx.stroke();
  }
  text(lab, x0 + bw / 2, y + (isBtn || d.kind === 'touch' ? 0.5 : 0), Math.round(s * 0.6), '#fff', 'center', 'body');
  if (o.label) text(o.label, x0 + bw + s * 0.3, y + 0.5, Math.round(s * 0.62), o.color || C.paper, 'left', 'body');
  ctx.restore();
  return total;
}

/* ---------- cards: each player's controls ---------- */
// one line per person for the pause card: "Pip  [A][D] move [W] jump [S] drop [F] punch"
function controlsLinesHTML() {
  const l = LEVELS[G.levelIndex], lg = (G.level && G.level.def.legend) || l.legend, act = G.level && G.level.def.act;
  const rows = [0, 1].filter(k => !isCpuPlayer(k)).map(k => {
    const a = act ? ` <span class="ctl-act">${btnHTML(k, 'act')} ${esc(actLabel(k))}</span>` : '';
    return `<p class="ctl-line"><b class="nm-${k === 0 ? 'pip' : 'bo'}">${NAMES[k]}</b> <span class="ctl-keys">${playerControlsHTML(k, lg)}${a}</span></p>`;
  });
  if (cpuSolo() && act && actLabel(0) !== actLabel(1)) { const c = 1 - cpuHuman(); rows.push(`<p class="ctl-line"><b class="nm-${c === 0 ? 'pip' : 'bo'}">${NAMES[c]}</b> <span class="ctl-keys">(computer) ${esc(actLabel(c))}</span></p>`); }
  return `<div class="ctl-lines">${rows.join('')}</div>`;
}

/* ---------- the ready card ---------- */
const pluralWord = w => w + (/(s|x|ch|sh)$/.test(w) ? 'es' : 's');
const Ready = { ok: [false, false], goAt: 0, armAt: 0 };
// from the menus: load the level, then wait on its ready card
function startLevel(i) { loadLevel(i, 'play', { ready: true }); }
function showReadyCard() {
  G.mode = 'ready';
  Ready.ok = [false, false]; Ready.goAt = 0; Ready.armAt = performance.now() + 350;
  const i = G.levelIndex, l = LEVELS[i], def = G.level.def, wd = WORLDS[l.world], m = l.match;
  const bits = [`World ${l.world + 1}: ${esc(wd.name)}`, `Level ${levelCode(i)}`];
  if (m && m.bestOf) bits.push(`Best of ${m.bestOf}`);
  if (l.golf) bits.push(`${def.roomCount} holes`); else if (l.rooms && l.rooms.length > 1) bits.push(`${l.rooms.length} ${esc(pluralWord((l.roomWord || 'Room').toLowerCase()))}`);
  const note = cpuTipNote(l.tip);
  const how = Array.isArray(l.howTo) && l.howTo.length ? `<ul class="rdy-how">${l.howTo.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : '';
  showOverlay(`
    <div class="card ready-card">
      <div class="rdy-top">
        <button class="ghost back" type="button" data-act="ready-back" data-back><span aria-hidden="true">◀</span> Back</button>
        <div class="home-title"><p class="eyebrow">${bits.join(' · ')}</p><h2>${esc(l.name)} ${kindTag(l.kind, l)}</h2></div>
      </div>
      <p class="lede">${esc(l.tip || '')}</p>${how}${medalGoalsHTML(i)}${note ? `<p class="hint">${esc(note)}</p>` : ''}
      <div class="rdy-duo" data-ready-duo></div>
      <p class="rdy-foot" data-ready-foot role="status" aria-live="polite"></p>
    </div>`);
  readyRender();
}
function readyRender() {
  const duo = overlay.querySelector('[data-ready-duo]');
  if (!duo) return;
  const l = LEVELS[G.levelIndex], lg = (G.level && G.level.def.legend) || l.legend, act = G.level && G.level.def.act;
  const vs = l.kind === 'versus';
  duo.innerHTML = [0, 1].map(k => {
    const cls = k === 0 ? 'pip' : 'bo', nm = `<span class="nm nm-${cls}">${NAMES[k]}</span>`;
    if (isCpuPlayer(k)) {
      return `<div class="pcard ${cls} rdy is-ready">
        <div class="rdy-head">${nm}<span class="devchip">Computer</span></div>
        <p class="hint">${vs ? 'The computer plays against you.' : 'The computer is your teammate.'}${act && actLabel(k) !== actLabel(1 - k) ? ` Its job: ${esc(actLabel(k))}.` : ''}</p>
        <div class="rdy-btn" aria-hidden="true">✔ Ready</div>
      </div>`;
    }
    const d = playerDevice(k), ok = Ready.ok[k];
    const a = act ? ` <span class="ctl-act">${btnHTML(k, 'act')} ${esc(actLabel(k))}</span>` : '';
    const press = d.kind === 'touch' ? 'Tap here when ready' : `Press ${btnHTML(k, 'jump')} when ready`;
    return `<div class="pcard ${cls} rdy${ok ? ' is-ready' : ''}">
      <div class="rdy-head">${nm}<span class="devchip dev-${d.kind}">${esc(d.name)}</span></div>
      <div class="ctl-keys">${playerControlsHTML(k, lg)}${a}</div>
      <button type="button" class="rdy-btn" data-act="ready" data-p="${k}" aria-pressed="${ok}">${ok ? '✔ Ready!' : press}</button>
    </div>`;
  }).join('');
  const foot = overlay.querySelector('[data-ready-foot]'), people = [0, 1].filter(k => !isCpuPlayer(k)), left = people.filter(k => !Ready.ok[k]);
  if (foot) foot.textContent = !left.length ? 'Here we go!' : people.length === 1 ? 'The level starts when you are ready.'
    : left.length === 2 ? 'The level starts when you are both ready.' : `Waiting for ${NAMES[left[0]]}...`;
  refreshGlyphs();
}
function readyPress(k) {
  if (G.mode !== 'ready' || isCpuPlayer(k) || Ready.ok[k] || Ready.goAt || performance.now() < Ready.armAt) return;
  Ready.ok[k] = true;
  rumble(k, 0.2, 0.4, 100);
  const all = [0, 1].every(q => isCpuPlayer(q) || Ready.ok[q]);
  Sfx.play(all ? 'roundStart' : 'flag');
  if (all) Ready.goAt = G.clock + 0.6;
  readyRender();
}
// (pollInput calls this every frame while the card is up)
function readyTick() { if (Ready.goAt && G.clock >= Ready.goAt) readyGo(); }
function readyGo() {
  Ready.goAt = 0;
  if (G.mode !== 'ready') return;
  G.mode = 'play';
  hideOverlay();
  // the card has said it all: a level without rooms skips its intro card and only shows the name tags for a moment
  // (a level with rooms keeps its "Room 1 of 3" card)
  if (!G.level.def.rooms && G.introT > 0) { G.introT = Math.min(G.introT, 1.2); G.introQuick = true; }
  // the press that readied a player is not a jump or an action in the level
  G.players.forEach(p => { p.prevJump = true; p.prevAct = true; p.pendingJump = false; p.pendingAct = false; });
}
// Back on the ready card: the world's page again
function readyBack() {
  const w = LEVELS[G.levelIndex].world;
  G.mode = 'title';
  loadLevel(0, 'title');
  Home.from = 'title';
  showWorld(w);
}
