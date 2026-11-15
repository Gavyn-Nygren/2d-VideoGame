/* Pip & Bo - Settings: one screen for Music and Sounds volume, Full screen, and each player's own keys and
   controller buttons. Opened from the title's Settings button and the pause card's Settings button (Back returns
   to whichever opened it).

   Keys: BIND (js/input.js) holds each player's keys; a change here rewrites it in place, saves it ('keyBind'),
   and refreshes KEYCAPS (js/controls.js), so every prompt drawn from btnLabel / btnHTML / controlsLine shows the
   new key. Controller: PadBind (js/input.js) holds each player's jump and action buttons; readPads applies them,
   so levels that read a pad's jump / act get them too ('padBind'). Menus always keep arrows / Enter / Esc and the
   stick / A / B, so nobody can lock themselves out of the menus. */
'use strict';

const BIND_ACTIONS = ['left', 'right', 'jump', 'down', 'act'];
const BIND_WORDS = { left: 'Move left', right: 'Move right', jump: 'Jump', down: 'Drop down', act: 'Action' };
const BIND_DEFAULT = JSON.parse(JSON.stringify(BIND));
const PAD_DEFAULT = { jump: [0, 1], act: [2, 3, 5, 7] };
// keys a player can't take: they pause, restart, mute, or belong to the browser
const KEY_RESERVED = new Set(['Escape', 'Tab', 'KeyR', 'KeyM', 'F5', 'F11', 'F12', 'MetaLeft', 'MetaRight', 'ContextMenu',
  'ControlLeft', 'ControlRight', 'AltLeft', 'AltRight', 'OSLeft', 'OSRight']);
// controller buttons a player can't take: View / Select, Start / Menu, the d-pad (it moves) and the home button
const PAD_RESERVED = new Set([8, 9, 12, 13, 14, 15, 16]);
const KEY_SHORT = {
  Space: 'Space', ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓', Slash: '/', Period: '.', Comma: ',',
  Semicolon: ';', Quote: "'", BracketLeft: '[', BracketRight: ']', Backslash: '\\', Minus: '-', Equal: '=', Backquote: '`',
  Enter: 'Enter', NumpadEnter: 'Enter', ShiftLeft: 'Shift', ShiftRight: 'R Shift', Backspace: '⌫', CapsLock: 'Caps',
  NumpadAdd: 'Num +', NumpadSubtract: 'Num -', NumpadMultiply: 'Num *', NumpadDivide: 'Num /', NumpadDecimal: 'Num .',
  Home: 'Home', End: 'End', PageUp: 'PgUp', PageDown: 'PgDn', Insert: 'Ins', Delete: 'Del', IntlBackslash: '\\',
};
// the name printed on a key: 'KeyQ' -> 'Q', 'Digit4' -> '4', 'Numpad4' -> 'Num 4'
function keyCap(code) {
  if (KEY_SHORT[code]) return KEY_SHORT[code];
  let m = /^Key([A-Z])$/.exec(code) || /^Digit(\d)$/.exec(code);
  if (m) return m[1];
  if ((m = /^Numpad(\d)$/.exec(code))) return 'Num ' + m[1];
  return code;
}

/* ---------- applying and saving ---------- */
function bindApply() {
  for (const p of [0, 1]) for (const w of BIND_ACTIONS) KEYCAPS[p][w] = keyCap(BIND[p][w][0]);
  // the game keys don't scroll the page or open the browser's quick find
  GAME_KEYS.clear();
  for (const set of [BIND_DEFAULT, BIND]) for (const b of set) for (const w of BIND_ACTIONS) b[w].forEach(c => GAME_KEYS.add(c));
  Dev.sig = '';
  try { controlsRefresh(); } catch (e) { /* the screens aren't up yet */ }
}
const keysCustom = p => BIND_ACTIONS.some(w => BIND[p][w].join() !== BIND_DEFAULT[p][w].join());
function bindSave() {
  store.set('keyBind', [0, 1].some(keysCustom) ? BIND : null);
  store.set('padBind', PadBind[0] || PadBind[1] ? PadBind : null);
}
function bindLoad() {
  const okList = (l, t) => Array.isArray(l) && l.length && l.every(x => typeof x === t);
  const kb = store.get('keyBind');
  if (Array.isArray(kb)) for (const p of [0, 1]) {
    if (kb[p] && BIND_ACTIONS.every(w => okList(kb[p][w], 'string'))) for (const w of BIND_ACTIONS) BIND[p][w].splice(0, Infinity, ...kb[p][w]);
  }
  const pb = store.get('padBind');
  if (Array.isArray(pb)) for (const p of [0, 1]) {
    PadBind[p] = pb[p] && okList(pb[p].jump, 'number') && okList(pb[p].act, 'number') ? { jump: pb[p].jump, act: pb[p].act } : null;
  }
  bindApply();
}
// give player p's action w the key code; a key someone else had swaps over (they get p's old key)
function setKey(p, w, code) {
  const old = BIND[p][w][0];
  let swapped = null;
  for (const q of [0, 1]) for (const k of BIND_ACTIONS) {
    if (q === p && k === w) continue;
    const l = BIND[q][k], i = l.indexOf(code);
    if (i < 0) continue;
    l.splice(i, 1);
    if (!l.length) { l.push(old); swapped = { q, k }; }
  }
  BIND[p][w].splice(0, Infinity, code);
  bindApply(); bindSave();
  if (swapped) toast(`Swapped: ${NAMES[swapped.q]}'s ${BIND_WORDS[swapped.k].toLowerCase()} is now ${keyCap(old)}`);
}
// give player p's jump or action the controller button n; if the other one had it, it gets p's old button
function setPadBtn(p, w, n) {
  const cur = PadBind[p] || JSON.parse(JSON.stringify(PAD_DEFAULT)), o = w === 'jump' ? 'act' : 'jump';
  const old = cur[w][0];
  cur[w] = [n];
  cur[o] = cur[o].filter(x => x !== n);
  if (!cur[o].length) cur[o] = [old];
  PadBind[p] = cur;
  Dev.sig = ''; controlsRefresh();
  bindSave();
}
function bindReset(p) {
  for (const w of BIND_ACTIONS) BIND[p][w].splice(0, Infinity, ...BIND_DEFAULT[p][w]);
  // the other player may hold one of p's normal keys after a swap: it goes back, and they get their own normal key
  const q = 1 - p, mine = new Set(BIND_ACTIONS.flatMap(w => BIND_DEFAULT[p][w]));
  for (const w of BIND_ACTIONS) {
    const l = BIND[q][w].filter(c => !mine.has(c));
    BIND[q][w].splice(0, Infinity, ...(l.length ? l : BIND_DEFAULT[q][w]));
  }
  PadBind[p] = null;
  bindApply(); bindSave();
}
bindLoad();

/* ---------- the screen ---------- */
const Settings = { from: 'title', wait: null, timer: 0 };
function showSettings(from) {
  Settings.from = from || (G.mode === 'paused' ? 'pause' : 'title');
  Settings.wait = null;
  Home.screen = 'settings';
  const backTo = Settings.from === 'pause' ? 'Back to the game' : 'Title';
  showOverlay(`
    <div class="card home-card settings-card" data-nav>
      <div class="home-head">
        <button class="ghost back" type="button" data-act="settings-back" data-back data-primary><span aria-hidden="true">◀</span> ${backTo}</button>
        <div class="home-title"><p class="eyebrow">Sound · Screen · Controls</p><h2>Settings</h2></div>
      </div>
      <section class="set-sec" aria-label="Sound and screen">
        <h3 class="set-h">Sound and screen</h3>
        ${sysCfgHTML()}
      </section>
      <section class="set-sec" aria-label="Controls">
        <h3 class="set-h">Controls</h3>
        <p class="hint">Pick a button, then press the key or controller button you want. <span class="kb-only">Esc cancels.</span><span class="pad-only"><span data-glyph="start"></span> cancels.</span>
          Menus always use the arrow keys, Enter and Esc (on a controller: the stick, <span data-glyph="a"></span> and <span data-glyph="b"></span>).</p>
        <div class="set-binds" data-binds></div>
        <p class="hint set-status" data-bind-status role="status" aria-live="polite"></p>
        <p class="hint touch-only">The touch buttons stay where they are; these settings are for keyboards and controllers.</p>
      </section>
    </div>`);
  settingsRender();
}
// which controller family to name buttons in for player p: their own controller, else the last one used
const bindFam = p => padFamilyFor(p);
function settingsRender() {
  const box = overlay.querySelector('[data-binds]');
  if (!box) return;
  const ae = document.activeElement, keep = ae && ae.dataset && ae.dataset.act ? [ae.dataset.act, ae.dataset.p, ae.dataset.dev, ae.dataset.w].join('|') : null;
  const wait = Settings.wait;
  const btn = (p, dev, w, label) => {
    const on = wait && wait.p === p && wait.dev === dev && wait.w === w;
    return `<button type="button" class="seg bind${on ? ' waiting' : ''}" data-act="bind" data-p="${p}" data-dev="${dev}" data-w="${w}"
      aria-label="${NAMES[p]} ${dev === 'pad' ? 'controller' : 'keyboard'} ${BIND_WORDS[w]}: ${on ? 'waiting for a press' : esc(label)}"><span class="bw">${BIND_WORDS[w]}</span><span class="bk">${on ? (dev === 'pad' ? 'Press a button…' : 'Press a key…') : esc(label)}</span></button>`;
  };
  box.innerHTML = [0, 1].map(p => {
    const cls = p === 0 ? 'pip' : 'bo', fam = bindFam(p), pb = PadBind[p] || PAD_DEFAULT;
    const keysRow = BIND_ACTIONS.map(w => btn(p, 'key', w, keyCap(BIND[p][w][0]))).join('');
    const padRow = ['jump', 'act'].map(w => btn(p, 'pad', w, padBtnName(fam, pb[w][0]))).join('');
    const custom = keysCustom(p) || !!PadBind[p];
    return `<div class="pcard ${cls} set-p">
      <div class="rdy-head"><span class="nm nm-${cls}">${NAMES[p]}</span></div>
      <p class="set-k">Keyboard</p><div class="bind-grid">${keysRow}</div>
      <p class="set-k">Controller${fam === 'generic' ? '' : ' (' + esc(GLYPHS[fam].name) + ')'}</p><div class="bind-grid">${padRow}</div>
      <button type="button" class="ghost set-reset" data-act="bind-reset" data-p="${p}" aria-disabled="${!custom}">Reset ${NAMES[p]}'s controls</button>
    </div>`;
  }).join('');
  if (keep) {
    const [a, p, dev, w] = keep.split('|');
    const sel = `[data-act="${a}"]` + (p ? `[data-p="${p}"]` : '') + (dev ? `[data-dev="${dev}"]` : '') + (w ? `[data-w="${w}"]` : '');
    const el = box.querySelector(sel);
    if (el) el.focus({ preventScroll: true });
    else if (a === 'bind-reset') { const b = box.querySelector(`[data-act="bind"][data-p="${p}"]`); if (b) b.focus({ preventScroll: true }); }
  }
  refreshGlyphs();
}
function bindStatus(msg) { const el = overlay.querySelector('[data-bind-status]'); if (el) el.textContent = msg || ''; }
function bindStart(p, dev, w) {
  Settings.wait = { p, dev, w };
  clearTimeout(Settings.timer);
  Settings.timer = setTimeout(() => bindCancel('Nothing pressed, so nothing changed.'), 8000);
  settingsRender();
  bindStatus(dev === 'pad' ? `Press the controller button for ${NAMES[p]}'s ${BIND_WORDS[w].toLowerCase()}.` : `Press the key for ${NAMES[p]}'s ${BIND_WORDS[w].toLowerCase()}.`);
}
function bindCancel(msg) {
  if (!Settings.wait) return;
  Settings.wait = null; clearTimeout(Settings.timer);
  settingsRender(); bindStatus(msg || 'Cancelled.');
}
function bindDone(msg) {
  Settings.wait = null; clearTimeout(Settings.timer);
  Sfx.play('press');
  settingsRender(); bindStatus(msg);
}
function settingsBack() {
  bindCancel();
  if (Settings.from === 'pause' && G.mode === 'paused') { showPauseCard(); const b = overlay.querySelector('[data-act="settings"]'); if (b) b.focus({ preventScroll: true }); }
  else { showTitle(); const b = overlay.querySelector('[data-act="settings"]'); if (b) b.focus({ preventScroll: true }); }
}

// a key while Settings waits for one (runs before js/input.js's own key handling)
window.addEventListener('keydown', e => {
  const wt = Settings.wait;
  if (!wt || overlay.hidden) return;
  e.preventDefault(); e.stopImmediatePropagation();
  if (e.repeat) return;
  if (e.code === 'Escape') { bindCancel(); return; }
  if (wt.dev !== 'key') return; // (waiting for a controller button: keys other than Esc do nothing)
  if (KEY_RESERVED.has(e.code) || !e.code) { bindStatus(`${keyCap(e.code) || 'That key'} is kept for the game itself (pause, restart, mute). Pick another key.`); return; }
  const was = BIND[wt.p][wt.w][0];
  setKey(wt.p, wt.w, e.code);
  bindDone(e.code === was ? `${NAMES[wt.p]}'s ${BIND_WORDS[wt.w].toLowerCase()} stays ${keyCap(e.code)}.` : `${NAMES[wt.p]}'s ${BIND_WORDS[wt.w].toLowerCase()} is now ${keyCap(e.code)}.`);
}, true);
// a controller button while Settings waits for one (called from pollInput for every controller, every frame)
bindHook = (ix, st, prev) => {
  const wt = Settings.wait;
  if (!wt || overlay.hidden) return false;
  if (wt.dev !== 'pad') return true; // waiting for a key: the controller doesn't move the menu meanwhile
  const was = prev.btns || [], n = (st.btns || []).findIndex((on, k) => on && !was[k]);
  if (n < 0) return true;
  const fam = Pads.fam[ix] || Pads.family;
  if (n === 9 || n === 8) { bindCancel(); return true; }
  if (PAD_RESERVED.has(n)) { bindStatus('The d-pad and the menu buttons are kept for moving and pausing. Pick another button.'); return true; }
  setPadBtn(wt.p, wt.w, n);
  bindDone(`${NAMES[wt.p]}'s ${BIND_WORDS[wt.w].toLowerCase()} is now ${padBtnName(fam, n)} on the controller.`);
  return true;
};

overlay.addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const a = b.dataset.act;
  if (a === 'settings') { Sfx.init(); showSettings(); }
  else if (a === 'settings-back') settingsBack();
  else if (a === 'bind') {
    const p = +b.dataset.p, dev = b.dataset.dev, w = b.dataset.w;
    const wt = Settings.wait;
    if (wt && wt.p === p && wt.dev === dev && wt.w === w) bindCancel(); else bindStart(p, dev, w);
  }
  else if (a === 'bind-reset') { const p = +b.dataset.p; if (b.getAttribute('aria-disabled') === 'true') { bindStatus(`${NAMES[p]}'s controls are already the normal ones.`); return; } bindReset(p); settingsRender(); bindStatus(`${NAMES[p]}'s keys and controller buttons are back to normal.`); }
});
