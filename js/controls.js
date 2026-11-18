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
// 3D levels (World 41 on): ▲ walks away, and jump has its own key (Space for Pip, Shift for Bo). A legend writes it as
// <kbd>Space</kbd> or <kbd>Shift</kbd>, which mean 'hop': that player's own jump key, the controller's A, the touch jump.
const HOP_CAPS = ['Space', 'Shift'];
const is3dLevel = () => !!(G.level && G.level.def && G.level.def.view3d);
const capMeans = c => (c === 'Space' || c === 'Shift') && is3dLevel() ? 'hop' : KEY_MEANS[c] || null;

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
  if (what === 'hop') return d.kind === 'kb' ? HOP_CAPS[keysetFor(id)] : d.kind === 'touch' ? '▲' : glyph('a', id);
  if (d.kind === 'kb') return KEYCAPS[keysetFor(id)][what] || '';
  if (d.kind === 'touch') return what === 'act' ? '●' : ARROWS[what] || '';
  if (what === 'jump') return glyph('a', id);
  if (what === 'act') return glyph(padActGlyph(), id);
  return ARROWS[what] || '';
}
// def.act.padGlyph names another controller button for the action (e.g. 'a' where A does it for a seated role)
function padActGlyph() { const a = G.level && G.level.def.act; return (a && a.padGlyph) || 'act'; }
const padGlyphHTML = (g, id) => `<span data-glyph="${esc(g)}" data-gp="${id}" class="${esc(glyphClass(g, id))}">${esc(glyph(g, id))}</span>`;
function btnHTML(id, what) {
  const d = playerDevice(id);
  if (what === 'move') return d.kind === 'pad' ? '<kbd class="k-stick">stick</kbd>' : btnHTML(id, 'left') + btnHTML(id, 'right');
  if (what === 'hop') return d.kind === 'kb' ? `<kbd>${HOP_CAPS[keysetFor(id)]}</kbd>` : d.kind === 'touch' ? '<kbd class="k-touch">▲</kbd>' : padGlyphHTML('a', id);
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
    const means = caps.map(capMeans);
    if (d.kind === 'pad') {
      const dirs = means.filter(m => m && m !== 'act' && m !== 'hop');
      // all four directions together is the whole stick; jump next to down is the stick's up
      if (dirs.length >= 4 && ['left', 'right', 'jump', 'down'].every(m => means.includes(m))) { stickSaid = true; return '<kbd class="k-stick">stick</kbd>'; }
      const vertical = means.includes('jump') && means.includes('down');
      return means.map((m, k) => {
        if (!m) return `<kbd>${caps[k]}</kbd>`;
        if (m === 'act' || m === 'hop' || (m === 'jump' && !vertical)) return btnHTML(id, m);
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
function legendBase(id, lg, job) {
  // a level with jobs (def.jobs): the player's own job's line, written in Pip's keys (controlsLine gives each player theirs)
  const j = job === undefined ? jobFor(id) : job;
  if (j) return j.legend || '';
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

/* ---------- jobs: two-job levels ---------- */
// Gavyn (2026-11-16, controls audit): in a level where the two players do different jobs, each card shows a player
// only their own job's buttons. A level (or a room, or a boss part) lists its jobs:
//   jobs: { skier: { title: 'Skier', legend: '<kbd>S</kbd> tuck <kbd>W</kbd> jump', act: 'jump', howTo: ['...'] },
//           fans:  { title: 'Fan crew', legend: '<kbd>A</kbd><kbd>D</kbd> run', act: 'fan' } },
//   jobSwap: 'You swap jobs every jump',     (optional: the line under the two boxes; the card then also shows "Next")
// A boss level whose parts each have their own jobs sets jobParts: true on its LEVELS entry (the ready card then says
// "Each era has new jobs..." instead of the swap line, and shows no "Next" strip).
// A job's legend is a keyboard line in Pip's keys (W A S D, F); every player sees it in their own buttons. act is that
// job's action word (or a list of the words it can show); a job with no action button leaves it out.
// Who has which job, first that applies:
//   setJobs(['thrower', 'zipper'])   from level code, for jobs that change inside a room (cleared on each room)
//   def.job: ['skier', 'fans']       a room's fixed jobs, by player id
//   def.jobOf: 'pilot'               a room field holding the id of the player with the FIRST listed job
//   def.jobAlt: true                 Pip has the first job in rooms 1 and 3, Bo in rooms 2 and 4
//   the action word                  the job whose act matches actLabel(id) (most levels already swap def.act.labels)
//   otherwise                        Pip the first job, Bo the second
const Jobs = { now: null };
function setJobs(keys) {
  const was = Jobs.now ? Jobs.now.join('|') : '';
  Jobs.now = keys ? [keys[0], keys[1]] : null;
  if ((Jobs.now ? Jobs.now.join('|') : '') !== was) jobsChanged();
}
function jobsChanged() {
  try {
    if (typeof document === 'undefined') return;
    if (G.mode === 'paused') overlay.querySelectorAll('[data-pause-who]').forEach(el => { el.innerHTML = pauseWhoHTML(); });
    legendRender();
  } catch (e) { /* (tests without a page) */ }
}
const jobActs = j => (j && j.act == null ? [] : Array.isArray(j.act) ? j.act : [j.act]);
function jobKeys(def) {
  def = def || (G.level && G.level.def);
  const js = def && def.jobs;
  if (!js) return null;
  const keys = Object.keys(js);
  if (keys.length < 2) return keys.length ? [keys[0], keys[0]] : null;
  if (Jobs.now && js[Jobs.now[0]] && js[Jobs.now[1]]) return Jobs.now.slice();
  if (Array.isArray(def.job) && js[def.job[0]] && js[def.job[1]]) return def.job.slice();
  if (def.jobOf && (def[def.jobOf] === 0 || def[def.jobOf] === 1)) return def[def.jobOf] === 0 ? [keys[0], keys[1]] : [keys[1], keys[0]];
  if (def.jobAlt && def.roomIndex != null) return def.roomIndex % 2 ? [keys[1], keys[0]] : [keys[0], keys[1]];
  // by the action word each player has now
  const byAct = [0, 1].map(id => { const w = actLabel(id); return keys.find(k => jobActs(js[k]).includes(w)); });
  if (byAct[0] && byAct[1] && byAct[0] !== byAct[1]) return byAct;
  if (byAct[0] && !byAct[1]) return [byAct[0], keys.find(k => k !== byAct[0])];
  if (byAct[1] && !byAct[0]) return [keys.find(k => k !== byAct[1]), byAct[1]];
  return [keys[0], keys[1]];
}
// the player's job now ({ key, title, legend, act, howTo }), or null in a level without jobs
function jobFor(id, def) {
  def = def || (G.level && G.level.def);
  const ks = jobKeys(def);
  if (!ks) return null;
  return Object.assign({ key: ks[id] }, def.jobs[ks[id]]);
}
// the other job (what this player does after a swap), or null
function otherJobFor(id, def) {
  def = def || (G.level && G.level.def);
  const ks = jobKeys(def);
  if (!ks || ks[0] === ks[1]) return null;
  return Object.assign({ key: ks[1 - id] }, def.jobs[ks[1 - id]]);
}
// the job's action word for its rows: the live word while it is that player's job, else the job's own first word
function jobActWord(id, j) {
  const cur = jobFor(id);
  // (a live word the job doesn't list is another job's: a level that swaps jobs without telling setActWords)
  if (cur && j && cur.key === j.key && jobActs(j).length) { const w = actLabel(id); return jobActs(j).includes(w) ? w : jobActs(j)[0]; }
  return jobActs(j)[0] || '';
}

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
  if (what === 'hop' && playerDevice(id).kind !== 'kb') what = 'jump'; // (3D: a controller's A, the touch jump)
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
    const g0 = what === 'jump' ? 'a' : padActGlyph(), bw0 = PadBind[id] && bindWhat(g0);
    const g = bw0 ? padBtnKey(PadBind[id][bw0][0]) : g0;
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

/* ---------- cards: each player's controls, one row per action ---------- */
// Gavyn (Nov 2026): controls are listed down the card, one action a row, its key or button on the left and what it
// does on the right. The rows come from the same keyboard line (def.legend): each group of keys starts a row and the
// words after it are its label; words before the first key join that row's label; a line with no keys at all (a role
// that only uses the action) becomes a note under the rows. Each row's keys go through controlsLine(), so remapped
// keys and the player's own controller or touch buttons show.
const tidyLabel = t => t.replace(/\s+/g, ' ').trim().replace(/^(or\s+)?[·,;:/\s]+/, '').replace(/^or\s+/, '').replace(/(\s+or)?[\s·,;:/]*$/, '');
const plainText = h => h.replace(/<[^>]*>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
// Gavyn (2026-11-15): on a controller the table shows plain arrows, not the word "stick"
const STICK_ALL = ['left', 'right', 'up', 'down'].map(d => `<kbd class="k-stick">${ARROWS[d]}</kbd>`).join('');
const arrowsOnly = h => h.replace(/<span class="k-word">stick<\/span>/g, '').replace(/<kbd class="k-stick">stick<\/kbd>/g, STICK_ALL);
function controlRows(id, lg, act, job) {
  if (job === undefined) job = jobFor(id);
  const base = String(legendBase(id, lg, job)), rows = [], re = /(?:<kbd>[^<]*<\/kbd>)+/g;
  let m, last = 0, pre = '';
  while ((m = re.exec(base))) {
    const between = plainText(base.slice(last, m.index)), prev = rows[rows.length - 1];
    if (prev) {
      // "jump · fans: [A][D] run": the words after the last "·" name the next row (a role, or "or")
      // ("move · power" is one key doing two things and stays on its row)
      const cut = between.lastIndexOf('·'), after = cut < 0 ? '' : between.slice(cut + 1).trim();
      const split = cut >= 0 && (/:$/.test(after) || /^or$/.test(after));
      prev.label = tidyLabel(split ? between.slice(0, cut) : between);
      pre = split ? after : '';
    } else pre = between.trim();
    // a role name ("fans:") keeps its colon in front of the row's words
    rows.push({ keys: arrowsOnly(controlsLine(id, m[0])), whats: capsWhats(m[0]), label: '', pre: tidyLabel(pre), role: /:$/.test(pre) });
    last = m.index + m[0].length;
  }
  const tail = plainText(base.slice(last));
  let note = '';
  if (rows.length) rows[rows.length - 1].label = tidyLabel(tail); else note = tidyLabel(tail);
  // "[W] hop · claw [W][A][S][D]": keys with no words take the words after the last "·" of the row before
  rows.forEach((r, k) => {
    const prev = rows[k - 1];
    if (r.label || r.pre || !prev || prev.label.indexOf('·') < 0) return;
    const cut = prev.label.lastIndexOf('·');
    r.label = tidyLabel(prev.label.slice(cut + 1)); prev.label = tidyLabel(prev.label.slice(0, cut));
  });
  rows.forEach(r => { r.label = tidyLabel(r.pre ? r.pre + (r.role && r.label ? ': ' : ' ') + r.label : r.label); });
  // the action button's row (a job names its own word; a job without the action has none)
  const aw = job ? jobActWord(id, job) : act ? actLabel(id) : '';
  if (aw && (act || job)) {
    // an action that does the same as a row above (Ski Jump: the jumper jumps with jump or the action) joins that row
    // (or a row that starts with the word: "stick the landing"; not "hold to duck", where hold means the key)
    const same = rows.find(r => r.label === aw || (r.label.startsWith(aw + ' ') && !/^\S+ to /.test(r.label)));
    if (same) { if (!same.keys.includes(btnHTML(id, 'act'))) { same.keys += ' <span class="k-word">or</span> ' + btnHTML(id, 'act'); same.whats.push('or', 'act'); } }
    else if (!rows.some(r => r.whats.includes('act'))) rows.push({ keys: btnHTML(id, 'act'), whats: ['act'], label: aw, act: true });
  }
  // keys with no words of their own share the next row ("[W][A][S][D] [F] grab")
  for (let k = rows.length - 2; k >= 0; k--) if (!rows[k].label && rows[k + 1]) { rows[k + 1].keys = rows[k].keys + ' <span class="k-word">+</span> ' + rows[k + 1].keys; rows[k + 1].whats = rows[k].whats.concat(['+'], rows[k + 1].whats); rows.splice(k, 1); }
  rows.forEach(r => { r.text = r.label || '…'; r.label = esc(r.text); });
  return { rows, note: note ? esc(note) : '' };
}
// the buttons a group of keycaps means ('<kbd>A</kbd><kbd>D</kbd>' -> ['left', 'right']), for drawing on the canvas
const capsWhats = g => (g.match(/<kbd>[^<]*<\/kbd>/g) || []).map(t => capMeans(t.slice(5, -6)) || t.slice(5, -6));
// that player's controls as a two-column table (keys | what they do)
function controlsTableHTML(id, lg, act, job) {
  const { rows, note } = controlRows(id, lg, act, job);
  return `<div class="ctl-table">${rows.map(r => `<div class="ctl-row${r.act ? ' is-act' : ''}"><span class="ctl-k">${r.keys}</span><span class="ctl-v">${r.label}</span></div>`).join('')}</div>`
    + (note ? `<p class="ctl-note">${note}</p>` : '');
}
// the legend the cards read: one a level's code set while playing (a boss part's), else the level's own
function cardLegend() {
  const l = LEVELS[G.levelIndex], def = G.level && G.level.def;
  if (Legend.cur && Legend.cur !== l.legend && G.mode !== 'ready') return Legend.cur;
  return (def && def.legend) || l.legend;
}
// "Pip · Skier": a player's name, and their job's name in a level with jobs
const jobTitleHTML = j => (j && j.title ? `<span class="job-name">${esc(j.title)}</span>` : '');
const jobHowHTML = j => (j && Array.isArray(j.howTo) && j.howTo.length ? `<ul class="rdy-how job-how">${j.howTo.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : '');
// a boss level (LEVELS entry jobParts: true) whose parts each bring new jobs: the ready card says so, and the card at
// the start of every part shows that part's jobs
function jobPartsLine(l) {
  if (!l || !l.jobParts) return '';
  const w = (l.roomWord || 'Room').toLowerCase();
  return `Each ${w} has new jobs. A card shows your buttons at the start of every ${w}.`;
}
// a smaller strip with the job a player gets after the swap
function nextJobHTML(id, lg, act) {
  const def = G.level && G.level.def, o = def && def.jobSwap && !LEVELS[G.levelIndex].jobParts && otherJobFor(id);
  if (!o) return '';
  return `<div class="job-next"><p class="job-next-h">After the swap: <b>${esc(o.title || '')}</b></p>${controlsTableHTML(id, lg, act, o)}</div>`;
}
// the pause card: a card per person (side by side with two), with their device, their job and their rows
function controlsLinesHTML() {
  const lg = cardLegend(), act = G.level && G.level.def.act;
  const cards = [0, 1].filter(k => !isCpuPlayer(k)).map(k => {
    const cls = k === 0 ? 'pip' : 'bo', d = playerDevice(k), j = jobFor(k);
    return `<div class="pcard ${cls} ctl-card"><div class="rdy-head"><span class="nm nm-${cls}">${NAMES[k]}${jobTitleHTML(j)}</span><span class="devchip dev-${d.kind}">${esc(d.name)}</span></div>${controlsTableHTML(k, lg, act)}${jobHowHTML(j)}</div>`;
  });
  let cpu = '';
  if (cpuSolo()) {
    const c = 1 - cpuHuman(), cj = jobFor(c), nm = `<b class="nm-${c === 0 ? 'pip' : 'bo'}">${NAMES[c]}</b> (computer)`;
    if (cj && cj.title) cpu = `<p class="hint">${nm}: ${esc(cj.title)}</p>`;
    else if (act && actLabel(0) !== actLabel(1)) cpu = `<p class="hint">${nm}: ${esc(actLabel(c))}</p>`;
  }
  return `<div class="ctl-cards${cards.length > 1 ? ' two' : ''}">${cards.join('')}</div>${cpu}`;
}

/* ---------- the ready card ---------- */
const pluralWord = w => (/lf$/.test(w) ? w.slice(0, -1) + 'ves' : w + (/(s|x|ch|sh)$/.test(w) ? 'es' : 's'));
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
      <p class="rdy-swap" data-ready-swap hidden></p>
      <p class="rdy-foot" data-ready-foot role="status" aria-live="polite"></p>
    </div>`);
  readyRender();
  // a 3D level: the card says "Loading..." until three.js and the 3D kit are in (or turns into the plain card if they can't be)
  if (def.view3d && K3D.state !== 'ready') K3D.need().then(() => { if (G.mode === 'ready' && G.levelIndex === i) readyRender(); });
}
// the one plain card for a device or browser with 3D switched off (World 41 on): no detail, just a way back
function k3dFailCard() {
  G.mode = 'ready';
  showOverlay(`
    <div class="card ready-card k3d-fail">
      <p class="lede">This world needs 3D graphics, which this device or browser has switched off.</p>
      <div class="actions-row"><button type="button" class="primary" data-act="ready-back" data-back data-primary>Back to the world map</button></div>
    </div>`);
  refreshGlyphs();
}
// is a 3D level still waiting for its pictures? (the ready buttons wait too)
const k3dWaiting = () => !!(G.level && G.level.def.view3d && K3D.state !== 'ready');
function readyRender() {
  if (G.level && G.level.def.view3d && K3D.state === 'failed') { if (!overlay.querySelector('.k3d-fail')) k3dFailCard(); return; }
  const duo = overlay.querySelector('[data-ready-duo]');
  if (!duo) return;
  const l = LEVELS[G.levelIndex], lg = cardLegend(), act = G.level && G.level.def.act, def = G.level && G.level.def;
  const vs = l.kind === 'versus';
  duo.classList.toggle('job-parts', !!l.jobParts);
  duo.innerHTML = [0, 1].map(k => {
    const cls = k === 0 ? 'pip' : 'bo', j = jobFor(k), nm = `<span class="nm nm-${cls}">${NAMES[k]}${jobTitleHTML(j)}</span>`;
    if (isCpuPlayer(k)) {
      const its = j && j.title ? ` Its job: ${esc(j.title)}.` : act && actLabel(k) !== actLabel(1 - k) ? ` Its job: ${esc(actLabel(k))}.` : '';
      return `<div class="pcard ${cls} rdy is-ready">
        <div class="rdy-head">${nm}<span class="devchip">Computer</span></div>
        <p class="hint">${vs ? 'The computer plays against you.' : 'The computer is your teammate.'}${its}</p>
        <div class="rdy-btn" aria-hidden="true">✔ Ready</div>
      </div>`;
    }
    const d = playerDevice(k), ok = Ready.ok[k];
    const press = d.kind === 'touch' ? 'Tap here when ready' : `Press ${btnHTML(k, 'jump')} when ready`;
    return `<div class="pcard ${cls} rdy${ok ? ' is-ready' : ''}">
      <div class="rdy-head">${nm}<span class="devchip dev-${d.kind}">${esc(d.name)}</span></div>
      <div class="rdy-ctl">${controlsTableHTML(k, lg, act)}${jobHowHTML(j)}${nextJobHTML(k, lg, act)}</div>
      <button type="button" class="rdy-btn" data-act="ready" data-p="${k}" aria-pressed="${ok}">${ok ? '✔ Ready!' : press}</button>
    </div>`;
  }).join('');
  const sw = overlay.querySelector('[data-ready-swap]');
  if (sw) { sw.textContent = jobPartsLine(l) || (def && def.jobs && def.jobSwap) || ''; sw.hidden = !sw.textContent; }
  const foot = overlay.querySelector('[data-ready-foot]'), people = [0, 1].filter(k => !isCpuPlayer(k)), left = people.filter(k => !Ready.ok[k]);
  if (foot) foot.textContent = k3dWaiting() ? 'Loading\u2026' : !left.length ? 'Here we go!' : people.length === 1 ? 'The level starts when you are ready.'
    : left.length === 2 ? 'The level starts when you are both ready.' : `Waiting for ${NAMES[left[0]]}...`;
  refreshGlyphs();
}
function readyPress(k) {
  if (G.mode !== 'ready' || isCpuPlayer(k) || Ready.ok[k] || Ready.goAt || performance.now() < Ready.armAt || k3dWaiting()) return;
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
  if (G.mode !== 'ready' || k3dWaiting()) return;
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
