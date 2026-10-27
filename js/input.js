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
/* ---------- controllers ----------
   Works with any controller the browser reports. Xbox, PlayStation and Switch Pro pads use the
   browser's "standard" layout; other pads fall back to stick + first buttons + hat-switch d-pad.
   The first controller you press a button on plays Pip, the second plays Bo (View/Select swaps). */
const Pads = { slots: [], prev: {}, quiet: {}, swap: false, nav: {}, family: 'xbox', kind: 'kb' };
function padFamily(gp) {
  const id = (gp.id || '').toLowerCase();
  if (/xbox|xinput|045e/.test(id)) return 'xbox';
  if (/054c|playstation|dualshock|dualsense|^wireless controller/.test(id)) return 'ps';
  if (/057e|nintendo|switch|pro controller|joy-con/.test(id)) return 'nintendo';
  return 'xbox';
}
// what to print for each button, per controller family
const GLYPHS = {
  xbox: { a: 'A', b: 'B', act: 'X', start: '☰', view: '⧉', name: 'Xbox' },
  ps: { a: '✕', b: '○', act: '□', start: 'Options', view: 'Create', name: 'PlayStation' },
  nintendo: { a: 'B', b: 'A', act: 'Y', start: '+', view: '−', name: 'Switch' },
};
const glyph = k => (GLYPHS[Pads.family] || GLYPHS.xbox)[k];
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
  return Pads.slots.map(ix => {
    if (ix === null) return null;
    const gp = list.find(g => g.index === ix);
    return { ix, gp, s: readPad(gp) };
  });
}
const padSlots = () => Pads.slots.map(ix => (ix === null ? null : { ix }));
// which controller belongs to which player (slot list may have gaps)
function padFor(states, player) {
  if (!states.length) return null;
  if (states.length === 1) return player === (Pads.swap ? 1 : 0) ? states[0] : null;
  return states[(player === 0) !== Pads.swap ? 0 : 1] || null;
}
function setKind(k) {
  if (Pads.kind === k) return;
  Pads.kind = k;
  document.documentElement.classList.toggle('use-pad', k === 'pad');
  document.documentElement.classList.toggle('use-kb', k === 'kb');
  // on a tablet with a controller, hide the on-screen pads and give the game the room
  if (document.documentElement.classList.contains('has-touch')) requestAnimationFrame(fit);
}
function refreshGlyphs() {
  document.querySelectorAll('[data-glyph]').forEach(el => {
    el.textContent = glyph(el.dataset.glyph);
    el.className = 'glyph g-' + Pads.family + '-' + el.dataset.glyph;
  });
  document.querySelectorAll('[data-padblocked]').forEach(el => { el.hidden = !Pads.blocked; });
  const who = document.querySelectorAll('[data-padwho]');
  who.forEach(el => {
    const has = [0, 1].map(k => !!padFor(padSlots(), k));
    el.textContent = has[0] && has[1] ? `Controller 1 plays ${NAMES[Pads.swap ? 1 : 0]}, controller 2 plays ${NAMES[Pads.swap ? 0 : 1]}.`
      : has[0] || has[1] ? `The controller plays ${NAMES[has[0] ? 0 : 1]}. ${NAMES[has[0] ? 1 : 0]} can use the keyboard (${has[0] ? 'arrow keys' : 'W A S D'}) or press a button on a second controller.`
      : 'No controller yet: press any button on one to connect it.';
  });
}
function onPadJoined(gp, slot) {
  Pads.family = padFamily(gp);
  const player = [0, 1].find(k => { const p = padFor(padSlots(), k); return p && p.ix === gp.index; });
  toast(`${GLYPHS[Pads.family].name} controller connected` + (player === undefined ? '' : `: it plays ${NAMES[player]}`));
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
  const btns = Array.from(overlay.querySelectorAll('button')).filter(b => b.offsetParent !== null);
  if (!btns.length) return;
  const cur = overlay.contains(document.activeElement) ? document.activeElement : null;
  if (!cur) { (overlay.querySelector('[data-primary]') || btns[0]).focus(); return; }
  const r = cur.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  let best = null, bestScore = Infinity;
  for (const b of btns) {
    if (b === cur) continue;
    const q = b.getBoundingClientRect(), dx = q.left + q.width / 2 - cx, dy = q.top + q.height / 2 - cy;
    const along = dir === 'left' ? -dx : dir === 'right' ? dx : dir === 'up' ? -dy : dy;
    const across = dir === 'left' || dir === 'right' ? Math.abs(dy) : Math.abs(dx);
    if (along <= 4) continue;
    const score = along + across * 2.5;
    if (score < bestScore) { bestScore = score; best = b; }
  }
  if (best) { best.focus({ preventScroll: true }); best.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
}
function menuActivate() {
  const ae = document.activeElement;
  if (ae && overlay.contains(ae) && ae.tagName === 'BUTTON') ae.click(); else primaryAction();
}

function pollInput(dt = 1 / 60) {
  const pads = readPads();
  if (pads.some(p => p && p.s.active)) setKind('pad');
  G.players.forEach((p, i) => {
    const bind = BIND[i], pad = padFor(pads, i), ps = pad ? pad.s : {}, t = touchState[i];
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
    const quiet = G.clock < (Pads.quiet[ix] || 0);
    if (quiet && inMenu && ['ok', 'start', 'back'].some(k => st[k] && !prev[k])) extendArm();
    const pressed = k => st[k] && !prev[k] && !quiet;
    if (pressed('start')) { Sfx.init(); if (G.mode === 'play') pause(); else if (G.mode === 'paused') resume(); else if (inMenu) primaryAction(); }
    else if (inMenu) {
      if (pressed('ok')) { Sfx.init(); menuActivate(); }
      else if (pressed('back') && G.mode === 'paused') resume();
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
}

window.addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const code = e.code;
  const inMenu = !overlay.hidden;
  if (GAME_KEYS.has(code) && !inMenu) e.preventDefault();
  if (!e.repeat) Sfx.init();
  setKind('kb');
  if (code === 'Escape') {
    e.preventDefault();
    if (G.mode === 'play') pause(); else if (G.mode === 'paused') resume();
    return;
  }
  if (code === 'KeyM' && !e.repeat) { toggleMute(); return; }
  if (code === 'KeyR' && !e.repeat && (G.mode === 'play' || G.mode === 'paused' || G.mode === 'result')) { loadLevel(G.levelIndex); return; }
  if (inMenu && (code === 'Enter' || code === 'Space' || code === 'NumpadEnter')) {
    if (code !== 'Space') menuHeld.add(code);
    if (performance.now() < overlayArmAt) { e.preventDefault(); armSwallowed.add(code); if (!e.repeat) extendArm(); return; }
    if (e.repeat) { e.preventDefault(); return; } // holding Enter must not click through the next card
    const ae = document.activeElement;
    if (ae && ae.tagName === 'BUTTON') return; // the focused button (menu card or header) handles it
    e.preventDefault();
    if (!e.repeat) primaryAction();
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
  const set = v => { if (v && !touchState[p][k]) touchTapped[p].set(k, tapClock); touchState[p][k] = v; btn.classList.toggle('on', v); };
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
  el.addEventListener('pointerdown', e => { e.preventDefault(); Sfx.init(); try { el.setPointerCapture(e.pointerId); } catch (_) {} ptrs.set(e.pointerId, sideOf(e)); update(); });
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

