/* Pip & Bo - Input: keyboard, controllers (gamepads) and touch buttons. */
'use strict';

/* ---------- input ---------- */
const keys = new Set();
// a quick tap of a key or touch button counts as held for at least TAP_STEPS physics steps (about 33 ms) at any frame
// rate, so a tap that goes down and up inside one frame isn't lost and gives the same hop at 30, 60 or 144 Hz.
// Each map holds the tapClock value of the press; tapClock counts step() calls and is never reset.
const TAP_STEPS = 4;
let tapClock = 0;
const keysTapped = new Map(), touchTapped = [new Map(), new Map()];
const tapLive = (m, c) => m.has(c) && tapClock - m.get(c) < TAP_STEPS;
// act = the action button, used only by levels with def.act (punch, throw...)
const BIND = [
  { left: ['KeyA'], right: ['KeyD'], jump: ['KeyW', 'Space'], down: ['KeyS'], act: ['KeyF', 'KeyE'] },
  { left: ['ArrowLeft'], right: ['ArrowRight'], jump: ['ArrowUp'], down: ['ArrowDown'], act: ['Slash', 'Period', 'Comma', 'Enter', 'Numpad0', 'NumpadEnter'] },
];
const GAME_KEYS = new Set(['KeyA', 'KeyD', 'KeyW', 'KeyS', 'Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
  'KeyF', 'KeyE', 'Slash', 'Period', 'Comma', 'Enter', 'Numpad0', 'NumpadEnter']);
// Enter pressed on a menu card and still held when the level starts must not count as Bo's action button
const menuHeld = new Set();
const touchState = [{}, {}];
// set by js/settings.js while it waits for a controller button to pick (returns true to swallow the press)
let bindHook = null;
/* ---------- controllers ----------
   Works with any controller the browser reports. Xbox, PlayStation and Switch Pro pads use the
   browser's "standard" layout; other pads fall back to stick + first buttons + hat-switch d-pad.
   The first controller you press a button on plays Pip, the second plays Bo (View/Select swaps). */
const Pads = { slots: [], prev: {}, quiet: {}, swap: false, nav: {}, family: 'xbox', kind: 'kb', fam: {}, ctxFam: null, ctxId: null };
// Which device each player is using right now (js/controls.js reads it): last[k] is 'kb', 'pad' or 'touch', set by that
// player's own last press (null until they press something); keyset is the set of keys (0 = W A S D, 1 = arrows) the
// person last used in 1-player mode, where both sets work.
const Dev = { last: [null, null], keyset: null, sig: '' };
function padFamily(gp) {
  const id = (gp.id || '').toLowerCase();
  if (/xbox|xinput|045e/.test(id)) return 'xbox';
  if (/054c|playstation|dualshock|dualsense|^wireless controller/.test(id)) return 'ps';
  if (/057e|nintendo|switch|pro controller|joy-con/.test(id)) return 'nintendo';
  // a pad the browser can't map to the standard layout has no known letters: its buttons are shown by number
  return gp.mapping === 'standard' ? 'xbox' : 'generic';
}
// what to print for each button, per controller family
const GLYPHS = {
  xbox: { a: 'A', b: 'B', act: 'X', start: '☰', view: '⧉', name: 'Xbox' },
  ps: { a: '✕', b: '○', act: '□', start: 'Options', view: 'Create', name: 'PlayStation' },
  nintendo: { a: 'B', b: 'A', act: 'Y', start: '+', view: '−', name: 'Switch' },
  generic: { a: '1', b: '2', act: '3', start: 'Start', view: 'Select', name: 'Controller' },
};
// Controller buttons a player picked in Settings (js/settings.js): PadBind[k] = { jump: [n], act: [n, ...] }, button
// numbers in the browser's standard layout, or null for the usual ones (A or B jump; X, Y, RB or RT act).
// readPads applies them, so every level that reads a pad's jump / act gets the player's own buttons.
const PadBind = [null, null];
const PAD_BTN_NAMES = {
  xbox: ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'View', 'Menu', 'LS', 'RS', '↑', '↓', '←', '→', 'Home'],
  ps: ['✕', '○', '□', '△', 'L1', 'R1', 'L2', 'R2', 'Create', 'Options', 'L3', 'R3', '↑', '↓', '←', '→', 'PS'],
  nintendo: ['B', 'A', 'Y', 'X', 'L', 'R', 'ZL', 'ZR', '−', '+', 'LS', 'RS', '↑', '↓', '←', '→', 'Home'],
};
const padBtnName = (fam, n) => (PAD_BTN_NAMES[fam] || [])[n] || String(n + 1);
// which colour a button number gets in a prompt (css .g-xbox-a ...)
const padBtnKey = n => ['a', 'b', 'act'][n] || 'x';
// glyph 'a' is the jump button and 'act' the action button: their names on this player's controller when they rebound them
const bindWhat = k => (k === 'a' ? 'jump' : k === 'act' ? 'act' : null);
function padBound(id, k) {
  const b = id == null ? null : PadBind[id], w = bindWhat(k);
  return b && w ? padBtnName(padFamilyFor(id), b[w][0]) : null;
}
function glyphClass(k, id) {
  const fam = id == null ? Pads.family : padFamilyFor(id), b = id == null ? null : PadBind[id], w = bindWhat(k);
  return 'glyph g-' + fam + '-' + (b && w ? padBtnKey(b[w][0]) : k);
}
// the family of the controller that plays this character (the last controller used when it has none)
function padFamilyFor(id) {
  const pad = padFor(padSlots(), id);
  return (pad && Pads.fam[pad.ix]) || Pads.family;
}
// glyph('a', id): the button's name on that player's own controller. Without an id it is the controller of the
// player last asked about with actKey(id) (older level code asks, then prints), or else the last controller used.
const glyph = (k, id) => padBound(id == null ? Pads.ctxId : id, k) || (GLYPHS[id == null ? Pads.ctxFam || Pads.family : padFamilyFor(id)] || GLYPHS.xbox)[k];
document.documentElement.classList.add('use-kb');
function readPad(gp) {
  const b = n => { const x = gp.buttons[n]; return !!(x && (x.pressed || x.value > 0.5)); };
  let ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
  if (Math.hypot(ax, ay) < 0.3) { ax = 0; ay = 0; } // dead zone for worn sticks
  let dl = b(14), dr = b(15), du = b(12), dd = b(13);
  let jump = b(0) || b(1), start = b(9), view = b(8), back = b(1), ok = b(0);
  // action button (def.act levels): the left face button (Xbox X, PlayStation Square, Switch Y), also the top one,
  // the right bumper, and the right trigger pulled past halfway
  const rt = gp.buttons[7];
  let act = b(2) || b(3) || b(5) || !!(rt && rt.value > 0.5);
  if (gp.mapping !== 'standard') {
    // hat-switch d-pad (often axis 9): -1 is up, then clockwise in steps of 2/7; anything above 1 is centered
    const hat = gp.axes[9];
    if (hat !== undefined && hat >= -1.05 && hat <= 1.05) {
      const pos = Math.round((hat + 1) / (2 / 7)) % 8;
      du = du || pos === 0 || pos === 1 || pos === 7; dr = dr || pos === 1 || pos === 2 || pos === 3;
      dd = dd || pos === 3 || pos === 4 || pos === 5; dl = dl || pos === 5 || pos === 6 || pos === 7;
    }
    if (gp.axes.length >= 8) { dl = dl || gp.axes[6] < -0.5; dr = dr || gp.axes[6] > 0.5; du = du || gp.axes[7] < -0.5; dd = dd || gp.axes[7] > 0.5; }
    // Non-standard pads (layout unknown): face buttons 2 and 3 jump, except in action levels, where they are the
    // action button (so 0 and 1 jump, 2 and 3 act). Button 5 (R1 on most generic pads) also acts, and so does
    // button 7 on pads with more than 10 buttons (on small pads 7 is Start).
    const actLevel = !!(G.level && G.level.def.act);
    if (!actLevel) jump = jump || b(2) || b(3);
    act = b(2) || b(3) || b(5) || (b(7) && gp.buttons.length > 10);
    ok = ok || b(2);
    start = start || b(7) && gp.buttons.length <= 10;
  }
  const anyBtn = gp.buttons.some(x => x && x.pressed);
  return {
    btns: gp.buttons.map((x, n) => b(n)),
    left: ax < -0.35 || dl, right: ax > 0.35 || dr, up: ay < -0.6 || du, down: ay > 0.6 || dd,
    jump, act, ok, back, start, view, active: anyBtn || ax !== 0 || ay !== 0 || dl || dr || du || dd,
  };
}
function readPads() {
  let list = [];
  try { list = navigator.getGamepads ? Array.from(navigator.getGamepads()).filter(g => g && g.connected !== false) : []; }
  catch (e) { list = []; if (!Pads.blocked) { Pads.blocked = true; refreshGlyphs(); } }
  // slots keep their place, so a controller that drops out and reconnects plays the same character
  let lost = false;
  Pads.slots = Pads.slots.map(ix => {
    if (ix !== null && !list.some(g => g.index === ix)) { lost = true; delete Pads.prev[ix]; delete Pads.nav[ix]; return null; }
    return ix;
  });
  while (Pads.slots.length && Pads.slots[Pads.slots.length - 1] === null) Pads.slots.pop();
  if (lost) onPadLeft();
  for (const gp of list) if (!Pads.slots.includes(gp.index)) {
    let slot = Pads.slots.indexOf(null);
    if (slot < 0) { slot = Pads.slots.length; Pads.slots.push(gp.index); } else Pads.slots[slot] = gp.index;
    // the press that wakes a controller up only connects it; it doesn't also click a menu button
    Pads.prev[gp.index] = readPad(gp); Pads.quiet[gp.index] = G.clock + 0.3;
    onPadJoined(gp, slot);
  }
  const states = Pads.slots.map(ix => {
    if (ix === null) return null;
    const gp = list.find(g => g.index === ix);
    return { ix, gp, s: readPad(gp) };
  });
  // each player's own jump and action buttons (Settings)
  for (const k of [0, 1]) {
    const bd = PadBind[k], mine = bd && padFor(states, k);
    if (!mine) continue;
    mine.s.jump = bd.jump.some(n => mine.s.btns[n]);
    mine.s.act = bd.act.some(n => mine.s.btns[n]);
  }
  return states;
}
const padSlots = () => Pads.slots.map(ix => (ix === null ? null : { ix }));
// which controller belongs to which player (slot list may have gaps)
function padFor(states, player) {
  if (!states.length) return null;
  // 1-player mode: the first connected controller plays the person, never the computer
  if (cpuSolo()) return player === cpuHuman() ? states.find(Boolean) || null : null;
  if (states.length === 1) return player === (Pads.swap ? 1 : 0) ? states[0] : null;
  return states[(player === 0) !== Pads.swap ? 0 : 1] || null;
}
function setKind(k) {
  if (k !== 'pad') Pads.lastNonPad = k;
  if (Pads.kind === k) return;
  Pads.kind = k;
  document.documentElement.classList.toggle('use-pad', k === 'pad');
  document.documentElement.classList.toggle('use-kb', k === 'kb');
  // on a tablet with a controller, hide the on-screen pads and give the game the room
  if (document.documentElement.classList.contains('has-touch')) requestAnimationFrame(fit);
}
function refreshGlyphs() {
  // (data-gp="0|1": that player's own controller; without it, the last controller used)
  document.querySelectorAll('[data-glyph]').forEach(el => {
    const id = el.dataset.gp === undefined ? null : +el.dataset.gp, fam = id == null ? Pads.family : padFamilyFor(id);
    el.textContent = padBound(id, el.dataset.glyph) || (GLYPHS[fam] || GLYPHS.xbox)[el.dataset.glyph];
    el.className = glyphClass(el.dataset.glyph, id);
  });
  document.querySelectorAll('[data-padblocked]').forEach(el => { el.hidden = !Pads.blocked; });
  const who = document.querySelectorAll('[data-padwho]');
  who.forEach(el => {
    const has = [0, 1].map(k => !!padFor(padSlots(), k));
    if (cpuSolo()) { el.textContent = has[cpuHuman()] ? `The controller plays ${NAMES[cpuHuman()]}. The computer plays ${NAMES[1 - cpuHuman()]}.` : 'No controller yet: press any button on one to connect it.'; return; }
    el.textContent = has[0] && has[1] ? `Controller 1 plays ${NAMES[Pads.swap ? 1 : 0]}, controller 2 plays ${NAMES[Pads.swap ? 0 : 1]}.`
      : has[0] || has[1] ? `The controller plays ${NAMES[has[0] ? 0 : 1]}. ${NAMES[has[0] ? 1 : 0]} can use the keyboard (${has[0] ? 'arrow keys' : 'W A S D'}) or press a button on a second controller.`
      : 'No controller yet: press any button on one to connect it.';
  });
}
function onPadJoined(gp, slot) {
  Pads.family = Pads.fam[gp.index] = padFamily(gp);
  const player = [0, 1].find(k => { const p = padFor(padSlots(), k); return p && p.ix === gp.index; });
  toast(`${Pads.family === 'generic' ? 'Controller' : GLYPHS[Pads.family].name + ' controller'} connected` + (player === undefined ? '' : `: it plays ${NAMES[player]}`));
  setKind('pad'); refreshGlyphs();
  rumbleIx(gp.index, 0.4, 0.4, 120);
}
function onPadLeft() {
  toast('A controller disconnected. Paused.');
  if (G.mode === 'play') pause();
  setTimeout(refreshGlyphs, 0);
}
function rumbleIx(ix, strong, weak, ms) {
  try {
    const gp = Array.from(navigator.getGamepads()).find(g => g && g.index === ix);
    const act = gp && gp.vibrationActuator;
    if (act && act.playEffect) act.playEffect('dual-rumble', { duration: ms, strongMagnitude: strong, weakMagnitude: weak }).catch(() => {});
  } catch (e) { /* no rumble on this pad */ }
}
function rumble(player, strong, weak, ms) {
  const pad = padFor(padSlots(), player);
  if (pad) rumbleIx(pad.ix, strong, weak, ms);
}

// moving focus between menu buttons with the stick or d-pad
function menuMove(dir) {
  const btns = Array.from(overlay.querySelectorAll('button, details > summary')).filter(b => b.offsetParent !== null);
  if (!btns.length) return;
  const cur = overlay.contains(document.activeElement) ? document.activeElement : null;
  if (!cur) { (overlay.querySelector('[data-primary]') || btns[0]).focus(); return; }
  const r = cur.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  let best = null, bestScore = Infinity;
  for (const b of btns) {
    if (b === cur) continue;
    const q = b.getBoundingClientRect(), dx = q.left + q.width / 2 - cx, dy = q.top + q.height / 2 - cy;
    const along = dir === 'left' ? -dx : dir === 'right' ? dx : dir === 'up' ? -dy : dy;
    // across = the gap between the two buttons sideways (0 when they overlap), so a wide button right below wins
    // (a world with one level stretches its button across the row)
    const across = dir === 'left' || dir === 'right' ? Math.max(0, q.top - r.bottom, r.top - q.bottom)
      : Math.max(0, q.left - r.right, r.left - q.right);
    if (along <= 4) continue;
    // a button in the same row (or column) is not "below" (or beside) even when it is a little taller
    if (dir === 'down' ? q.top < cy : dir === 'up' ? q.bottom > cy : dir === 'right' ? q.left < cx : q.right > cx) continue;
    const score = along + across * 2.5;
    if (score < bestScore) { bestScore = score; best = b; }
  }
  if (best) { best.focus({ preventScroll: true }); best.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
  else if (dir === 'up' || dir === 'down') overlay.scrollBy(0, dir === 'down' ? 120 : -120); // a long card: read past the last button
}
function menuActivate() {
  const ae = document.activeElement;
  if (ae && overlay.contains(ae) && (ae.tagName === 'BUTTON' || ae.tagName === 'SUMMARY')) ae.click(); else primaryAction();
}

function pollInput(dt = 1 / 60) {
  const pads = readPads();
  if (pads.some(p => p && p.s.active)) setKind('pad');
  const solo = cpuSolo();
  // each player's own device: a controller in use marks its player (keys and touch mark theirs as they are pressed)
  for (const pd of pads) if (pd && pd.s.active) {
    Pads.family = Pads.fam[pd.ix] || Pads.family;
    for (const k of [0, 1]) { const mine = padFor(pads, k); if (mine && mine.ix === pd.ix) Dev.last[k] = 'pad'; }
  }
  controlsWatch();
  G.players.forEach((p, i) => {
    if (cpuOn(i)) return; // the computer's presses come from cpuTick (js/cpu/cpu-core.js)
    // 1-player mode: the person can use either player's keys
    const bind = solo ? { left: BIND[0].left.concat(BIND[1].left), right: BIND[0].right.concat(BIND[1].right), jump: BIND[0].jump.concat(BIND[1].jump),
      down: BIND[0].down.concat(BIND[1].down), act: BIND[0].act.concat(BIND[1].act) } : BIND[i];
    const pad = padFor(pads, i), ps = pad ? pad.s : {}, t = touchState[i];
    const any = k => bind[k].some(c => keys.has(c) || tapLive(keysTapped, c)) || !!ps[k] || !!t[k] || tapLive(touchTapped[i], k);
    p.input.left = any('left'); p.input.right = any('right'); p.input.down = any('down'); p.input.up = !!ps.up;
    const j = any('jump');
    if (j && !p.prevJump && G.mode === 'play') p.pendingJump = true;
    p.prevJump = j;
    p.input.jump = j;
    // the action button: held state in p.input.act, a fresh press in p.pendingAct (the level's code clears it;
    // unused, it expires after ACT_BUFFER s)
    const a = any('act');
    if (a && !p.prevAct && G.mode === 'play' && G.level && G.level.def.act) { p.pendingAct = true; p.actAge = 0; }
    p.prevAct = a;
    p.input.act = a;
  });
  // forget expired taps (and every tap outside play, so a tap in a menu never reaches the next level)
  for (const m of [keysTapped, ...touchTapped]) for (const c of [...m.keys()]) if (G.mode !== 'play' || !tapLive(m, c)) m.delete(c);
  const inMenu = !overlay.hidden;
  for (const { ix, s: st } of pads.filter(Boolean)) {
    const prev = Pads.prev[ix] || {};
    // Settings is waiting for a controller button to pick: that press does nothing else
    if (bindHook && bindHook(ix, st, prev)) { Pads.prev[ix] = st; continue; }
    const quiet = G.clock < (Pads.quiet[ix] || 0);
    if (quiet && inMenu && ['ok', 'start', 'back'].some(k => st[k] && !prev[k])) extendArm();
    const pressed = k => st[k] && !prev[k] && !quiet;
    if (G.mode === 'ready') {
      // the level's ready card: each controller readies its own player; B goes back
      if (pressed('back')) menuBack();
      else if (pressed('ok') || pressed('act') || pressed('start')) {
        Sfx.init();
        const k = [0, 1].find(q => { const mine = padFor(pads, q); return mine && mine.ix === ix; });
        if (k !== undefined) readyPress(k);
      }
    }
    else if (pressed('start')) { Sfx.init(); if (G.mode === 'play') pause(); else if (G.mode === 'paused') resume(); else if (inMenu) primaryAction(); }
    else if (inMenu) {
      if (pressed('ok')) { Sfx.init(); menuActivate(); }
      else if (pressed('back')) { if (!menuBack() && G.mode === 'paused') resume(); }
      else if (pressed('view') && (G.mode === 'title' || G.mode === 'paused') && cpuSolo()) {
        // 1-player mode: swap which character the person plays (the computer takes the other one)
        cpuSetCfg('human', 1 - CPU.cfg.human); refreshGlyphs();
        toast(`You now play ${NAMES[CPU.cfg.human]}`);
      }
      else if (pressed('view') && (G.mode === 'title' || G.mode === 'paused')) {
        Pads.swap = !Pads.swap; refreshGlyphs();
        toast(Pads.slots.length >= 2 ? `Swapped: controller 1 plays ${NAMES[Pads.swap ? 1 : 0]}` : `Controller now plays ${NAMES[Pads.swap ? 1 : 0]}`);
      }
      // stick / d-pad navigation with hold-to-repeat
      const dir = st.up ? 'up' : st.down ? 'down' : st.left ? 'left' : st.right ? 'right' : null;
      const nav = Pads.nav[ix] || (Pads.nav[ix] = { dir: null, t: 0 });
      if (dir !== nav.dir) { nav.dir = dir; nav.t = 0.38; if (dir) menuMove(dir); }
      else if (dir) { nav.t -= dt; if (nav.t <= 0) { nav.t = 0.13; menuMove(dir); } }
    }
    Pads.prev[ix] = st;
  }
  if (G.mode === 'ready') readyTick();
}

const MENU_NAV_KEYS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right' };
window.addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const code = e.code;
  const inMenu = !overlay.hidden;
  if (GAME_KEYS.has(code) && !inMenu) e.preventDefault();
  if (!e.repeat) Sfx.init();
  setKind('kb');
  // whose key was that? (in 1-player mode both sets of keys are the person's; Enter and Space also work the menus,
  // so there they don't count)
  const set = BIND.findIndex(b => Object.values(b).some(l => l.includes(code)));
  if (set >= 0 && !(inMenu && (code === 'Enter' || code === 'NumpadEnter' || code === 'Space'))) {
    if (cpuSolo()) { Dev.last[cpuHuman()] = 'kb'; Dev.keyset = set; } else Dev.last[set] = 'kb';
  }
  if (code === 'Escape') {
    e.preventDefault();
    if (e.repeat) return;
    if (inMenu && menuBack()) return; // the home screens' Back button (js/home.js)
    if (G.mode === 'play') pause(); else if (G.mode === 'paused') resume();
    return;
  }
  if (code === 'KeyM' && !e.repeat) { toggleMute(); return; }
  // the level's ready card: each player's jump or action key readies them (any of those keys, for one person)
  if (G.mode === 'ready') {
    e.preventDefault();
    if (code === 'Enter' || code === 'NumpadEnter') menuHeld.add(code); // (Bo's action key: not a press once the level starts)
    if (e.repeat || set < 0 || !(BIND[set].jump.includes(code) || BIND[set].act.includes(code))) return;
    if (cpuSolo()) { Dev.last[cpuHuman()] = 'kb'; Dev.keyset = set; readyPress(cpuHuman()); } else { Dev.last[set] = 'kb'; readyPress(set); }
    return;
  }
  if (code === 'KeyR' && !e.repeat && (G.mode === 'play' || G.mode === 'paused' || G.mode === 'result')) { loadLevel(G.levelIndex); return; }
  if (inMenu && (code === 'Enter' || code === 'Space' || code === 'NumpadEnter')) {
    if (code !== 'Space') menuHeld.add(code);
    if (performance.now() < overlayArmAt) { e.preventDefault(); armSwallowed.add(code); if (!e.repeat) extendArm(); return; }
    if (e.repeat) { e.preventDefault(); return; } // holding Enter must not click through the next card
    const ae = document.activeElement;
    if (ae && (ae.tagName === 'BUTTON' || ae.tagName === 'SUMMARY')) return; // the focused button (or a fold's summary) handles it
    e.preventDefault();
    if (!e.repeat) primaryAction();
    return;
  }
  // the home screens (cards marked data-nav): arrows or W A S D move between buttons, like a controller's stick
  if (inMenu && MENU_NAV_KEYS[code] && overlay.querySelector('[data-nav]')) {
    e.preventDefault();
    if (performance.now() >= overlayArmAt) menuMove(MENU_NAV_KEYS[code]);
    return;
  }
  if (inMenu && (code === 'ArrowUp' || code === 'ArrowDown' || code === 'ArrowLeft' || code === 'ArrowRight')) {
    // scroll the menu ourselves so the page around the game never scrolls
    e.preventDefault();
    if (code === 'ArrowUp' || code === 'ArrowDown') overlay.scrollBy(0, code === 'ArrowDown' ? 48 : -48);
    return;
  }
  if (inMenu && code === 'Slash') e.preventDefault(); // no quick-find box in Firefox
  if (menuHeld.has(code)) { e.preventDefault(); return; }
  keys.add(code); if (!e.repeat) keysTapped.set(code, tapClock);
});
window.addEventListener('keyup', e => {
  keys.delete(e.code); menuHeld.delete(e.code);
  if (armSwallowed.delete(e.code)) e.preventDefault(); // a button would activate on this Space keyup
});
function releaseAll() { keys.clear(); keysTapped.clear(); touchTapped.forEach(m => m.clear()); menuHeld.clear(); touchState.forEach(t => { for (const k in t) t[k] = false; }); document.querySelectorAll('.tbtn.on').forEach(b => b.classList.remove('on')); }
// leaving the window pauses the game, so nobody falls into spikes while you're away
window.addEventListener('blur', () => { releaseAll(); if (G.mode === 'play') pause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { releaseAll(); if (G.mode === 'play') pause(); } });

// touch pads: jump and drop are plain buttons; the move bar reads which half your thumb is on,
// so you can slide between left and right without lifting
document.querySelectorAll('.tact').forEach(btn => {
  const p = +btn.dataset.p, k = btn.dataset.k;
  const set = v => { if (v && !touchState[p][k]) touchTapped[p].set(k, tapClock); touchState[p][k] = v; btn.classList.toggle('on', v); if (v) Dev.last[p] = 'touch'; };
  btn.addEventListener('pointerdown', e => { e.preventDefault(); Sfx.init(); try { btn.setPointerCapture(e.pointerId); } catch (_) {} set(true); });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => btn.addEventListener(ev, () => set(false)));
  btn.addEventListener('contextmenu', e => e.preventDefault());
});
document.querySelectorAll('.tmove').forEach(el => {
  const p = +el.dataset.p, ptrs = new Map();
  const lb = el.querySelector('[data-k="left"]'), rb = el.querySelector('[data-k="right"]');
  const sideOf = e => { const r = el.getBoundingClientRect(); return e.clientX < r.left + r.width / 2 ? -1 : 1; };
  const update = () => {
    let l = false, r = false;
    for (const sd of ptrs.values()) { if (sd < 0) l = true; else r = true; }
    touchState[p].left = l; touchState[p].right = r;
    lb.classList.toggle('on', l); rb.classList.toggle('on', r);
  };
  el.addEventListener('pointerdown', e => { e.preventDefault(); Sfx.init(); try { el.setPointerCapture(e.pointerId); } catch (_) {} ptrs.set(e.pointerId, sideOf(e)); Dev.last[p] = 'touch'; update(); });
  el.addEventListener('pointermove', e => { if (ptrs.has(e.pointerId)) { ptrs.set(e.pointerId, sideOf(e)); update(); } });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => el.addEventListener(ev, e => { ptrs.delete(e.pointerId); update(); }));
  el.addEventListener('contextmenu', e => e.preventDefault());
});
function enableTouch() {
  setKind('touch');
  if (document.documentElement.classList.contains('has-touch')) return;
  document.documentElement.classList.add('has-touch');
  requestAnimationFrame(() => fit());
}
// (switch after the tap has done its job, so the layout doesn't jump under the finger)
window.addEventListener('touchend', () => setTimeout(enableTouch, 350), { passive: true });

