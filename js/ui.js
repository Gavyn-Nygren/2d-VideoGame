/* Pip & Bo - UI: menus, result cards, pause screen, top-bar controls legend, notices. */
'use strict';

// def.act.labels = [Pip's word, Bo's word] (a room can set its own act) names each player's action on the intro and
// pause cards, for levels where the two roles do different things; actLabel() with no id is the shared label
const actLabel = id => { const a = G.level && G.level.def.act; return (a && ((id != null && a.labels && a.labels[id]) || a.label)) || 'act'; };
const nameSpan = k => `<span class="nm-${k === 0 ? 'pip' : 'bo'}">${NAMES[k]}</span>`;

// small screens (phones): the stage is drawn at under 0.6 of its 960x540 size, so the match HUD draws bigger
let stageScale = 1;
const hudBig = () => stageScale < 0.6;

// top-bar legend per level: def.legend = { pip, bo } replaces a player's whole keyboard line (HTML with <kbd> keys), or
// { jump, down } replaces just those words; { pad } is an optional hand-written controller line. Each player's line is
// then shown in their own buttons (js/controls.js: a keyboard line is rewritten for a controller or touch player).
function setLegend(lg) { Legend.cur = lg || null; legendRender(); refreshGlyphs(); }
// touch button label, key hints and the pad layout for levels with an action button (def.act)
function setActUI(on) {
  const root = document.documentElement;
  // each player's own word where the label sits on their touch button or in their legend line
  document.querySelectorAll('[data-actlabel]').forEach(el => {
    const box = el.closest('[data-p]') || el.closest('[data-legp]');
    el.textContent = actLabel(box ? +(box.dataset.p !== undefined ? box.dataset.p : box.dataset.legp) : undefined);
  });
  if (root.classList.contains('act-on') !== on) { root.classList.toggle('act-on', on); if (root.classList.contains('has-touch')) fit(); }
  if (on) fitActLabels();
}
// a long or wide label ("MMMMMM") shrinks until it fits inside the round touch button
function fitActLabels() {
  document.querySelectorAll('.tbtn-act').forEach(el => {
    el.style.fontSize = '';
    const room = el.clientWidth - 6;
    if (room <= 0) return; // hidden: done again when the pads show (fit)
    const rg = document.createRange();
    rg.selectNodeContents(el);
    let fs = parseFloat(getComputedStyle(el).fontSize);
    for (let n = 0; n < 24 && fs > 8 && rg.getBoundingClientRect().width > room; n++) { fs -= 0.5; el.style.fontSize = fs + 'px'; }
  });
}
// a results or summary card taller than the space for it moves its buttons up under the heading
// (CSS .match-card.tight / .fit-card.tight), so the main button is on screen without scrolling (phones, short windows)
function fitMatchCard() {
  const card = overlay.hidden ? null : overlay.querySelector('.match-card, .fit-card');
  if (!card) return;
  card.classList.remove('tight');
  if (overlay.scrollHeight > overlay.clientHeight + 1) card.classList.add('tight');
}
// each player's own device: 'kb', 'pad' or 'touch' (playerDevice in js/controls.js has the controller family too).
// It also remembers that player's controller for a glyph() call without an id right after it (older level code).
function actKey(id) {
  if (isCpuPlayer(id)) { Pads.ctxFam = null; Pads.ctxId = null; return 'kb'; }
  const d = playerDevice(id);
  Pads.ctxFam = d.family; Pads.ctxId = id;
  return d.kind;
}
// one line for the level intro card: how to use the action button, in each player's own buttons
function actHintLine() {
  const one = k => (playerDevice(k).kind === 'touch' ? 'round button' : btnLabel(k, 'act')) + ' to ' + actLabel(k);
  if (cpuSolo()) { const h = cpuHuman(); return (playerDevice(h).kind === 'touch' ? 'Tap the ' : 'Press ') + one(h); }
  const ks = [0, 1].map(k => playerDevice(k));
  if (ks[0].kind !== 'kb' && ks[0].kind === ks[1].kind && ks[0].family === ks[1].family && actLabel(0) === actLabel(1)) return (ks[0].kind === 'touch' ? 'Tap the ' : 'Press ') + one(0);
  return NAMES[0] + ': ' + one(0) + '     ' + NAMES[1] + ': ' + one(1);
}

/* small notices (controller connected, etc.) */
let toastTimer = 0;
function toast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg; el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 2600);
}

/* ---------- menus ---------- */
const overlay = document.getElementById('overlay');
// a tap that was meant for the game right as a card pops up shouldn't press a card button
overlay.addEventListener('click', e => {
  if (e.isTrusted && e.detail > 0 && performance.now() - overlayOpenedAt < 350) { e.stopPropagation(); e.preventDefault(); }
}, true);
const stageWrap = document.getElementById('stageWrap');
const stage = document.getElementById('stage');
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

let overlayOpenedAt = 0, overlayArmAt = 0;
const armSwallowed = new Set();
// results, world-done and final cards ignore Enter, Space and controller presses for a moment, so a player
// still mashing jump or act as the level ends doesn't click straight through the card
function armOverlay(ms = 600) {
  overlayArmAt = performance.now() + ms; Pads.armCap = G.clock + 8;
  for (const ix in Pads.prev) Pads.quiet[ix] = G.clock + ms / 1000;
}
// a press swallowed while the card is armed keeps it armed a little longer (a player still mashing their action key),
// so only a press after a short pause counts (never later than 8 s after the card opened)
function extendArm() {
  const now = performance.now();
  if (now >= overlayArmAt) return;
  overlayArmAt = Math.min(overlayOpenedAt + 8000, Math.max(overlayArmAt, now + 350));
  const q = Math.min(Pads.armCap || 0, G.clock + 0.35);
  for (const ix in Pads.prev) Pads.quiet[ix] = Math.max(Pads.quiet[ix] || 0, q);
}
function showOverlay(html) {
  overlay.innerHTML = html;
  overlay.hidden = false;
  overlayOpenedAt = performance.now();
  document.documentElement.classList.add('in-menu');
  stage.classList.add('dim');
  fitMatchCard();
  overlay.scrollTop = 0;
  const b = overlay.querySelector('[data-primary]');
  if (b) { try { b.focus({ preventScroll: true }); } catch (e) { b.focus(); } }
  refreshGlyphs();
}
function hideOverlay() {
  overlay.hidden = true; overlay.innerHTML = '';
  document.documentElement.classList.remove('in-menu');
  stage.classList.remove('dim');
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
}
function primaryAction() { const b = overlay.querySelector('[data-primary]'); if (b && !overlay.hidden) b.click(); }
// Esc or controller B on a menu screen with a Back button (js/home.js): presses it. False when there is none.
function menuBack() { const b = overlay.hidden ? null : overlay.querySelector('[data-back]'); if (b) b.click(); return !!b; }

const kindTag = (k, l) => k === 'versus' ? '<span class="tag versus">Versus</span>' : l && l.pong ? '<span class="tag team">vs Robo</span>' : '<span class="tag team">Team</span>';
// (the title, world map and world pages are in js/home.js)

function pause() {
  if (G.mode !== 'play') return;
  G.mode = 'paused';
  if (G.golf) { G.golf.charging = false; G.golf.power = 0; } // a held swing doesn't fire on resume
  showPauseCard();
}
// (also where Back from the level picker returns to while paused)
function showPauseCard() {
  Home.screen = 'pause';
  const l = LEVELS[G.levelIndex], m = G.match;
  const matchLine = m ? `<p class="hint">Round ${m.round} · Best of ${m.bestOf} · ${nameSpan(0)} ${m.wins[0]} – ${m.wins[1]} ${nameSpan(1)}</p>` : '';
  // a level mode may rename "Restart level" and add its own buttons (30-1: "Restart this era", "Start over from Era 1"):
  // pauseExtra() -> { replay: 'label', more: [{ label, arg }] }; a press calls the mode's pauseAct(arg)
  const px = (G.lmode && typeof G.lmode.pauseExtra === 'function' && hook('pauseExtra')) || {};
  const moreBtns = (px.more || []).map(b => `<button class="ghost" type="button" data-act="modeact" data-arg="${esc(b.arg)}">${esc(b.label)}</button>`).join('');
  showOverlay(`
    <div class="card">
      <p class="eyebrow">Paused · World ${l.world + 1}: ${esc(WORLDS[l.world].name)} · Level ${levelCode(G.levelIndex)}</p>
      <h2>${esc(l.name)}</h2>
      <p class="lede">${esc((G.level && G.level.def.tip) || l.tip)}</p>
      <div data-pause-who style="display:contents">${pauseWhoHTML()}</div>${matchLine}
      <div class="actions-row">
        <button class="primary" type="button" data-act="resume" data-primary>Keep playing</button>
        <button class="ghost" type="button" data-act="replay">${px.replay ? esc(px.replay) : m ? 'Restart match' : 'Restart level'}</button>${moreBtns}
        <button class="ghost" type="button" data-act="worlds">Choose a level</button>
        <button class="ghost" type="button" data-act="settings">Settings</button>
        <button class="ghost" type="button" data-act="menu">Title screen</button>
      </div>
      ${cpuCfgHTML()}
    </div>`);
}
// the pause card's "You play Pip..." note and action keys (redrawn when the Players setting changes on the card)
function pauseWhoHTML() {
  const l = LEVELS[G.levelIndex], tip = (G.level && G.level.def.tip) || l.tip, note = cpuTipNote(tip);
  return (note ? `<p class="hint">${esc(note)}</p>` : '') + controlsLinesHTML();
}
function resume() { if (G.mode !== 'paused') return; G.mode = 'play'; hideOverlay(); G.players.forEach(p => { p.prevJump = true; p.prevAct = true; }); }

// stat tiles from a mode's stats(): { label, values: [pip, bo] } | { label, value } | 'a line of text'
function statsHTML(stats) {
  if (!stats || !stats.length) return '';
  const tiles = stats.filter(x => x && typeof x === 'object').map(x => `<div class="stat"><span class="k">${esc(x.label || '')}</span><span class="v">${x.values
    ? `<span class="nm-pip">${esc(x.values[0])}</span><span style="color:var(--muted)"> – </span><span class="nm-bo">${esc(x.values[1])}</span>` : esc(x.value == null ? '' : x.value)}</span></div>`).join('');
  const lines = stats.filter(x => typeof x === 'string').map(x => `<p class="lede">${esc(x)}</p>`).join('');
  return (tiles ? `<div class="stats">${tiles}</div>` : '') + lines;
}
// the score of a match, winner first: "3–1"
const matchScore = r => r.winner === 1 ? `${r.rounds[1]}–${r.rounds[0]}` : `${r.rounds[0]}–${r.rounds[1]}`;
function matchResultBody(r) {
  const head = r.winner < 0 ? `It’s a draw! <small style="font-size:0.6em">${matchScore(r)}</small>` : `${nameSpan(r.winner)} wins ${matchScore(r)}!`;
  const rounds = r.history.map((h, k) => `<li><span class="rn">R${h.round}</span>${h.winner < 0
    ? `<span class="rw tie">Tie</span><span class="why">${esc(h.reason ? h.reason + ' · ' : '')}${r.winner < 0 && k === r.history.length - 1 ? 'match called a draw' : 'replayed'}</span>`
    : `<span class="rw">${nameSpan(h.winner)}</span><span class="why">${esc(h.reason || 'won the round')}</span>`}</li>`).join('');
  return `<h2>${head}</h2>
      <ol class="round-list" aria-label="Rounds">${rounds}</ol>
      ${statsHTML(r.stats)}`;
}
function showResult() {
  G.mode = 'result';
  const i = G.levelIndex, r = G.results[i], l = LEVELS[i];
  // the world pages tick a level once it's cleared (a team level) or a match is finished (versus); a lost Robo Pong doesn't count
  if (!(r.pong && !r.pong.won && !r.pong.beaten)) store.set('done:' + l.name, true);
  const last = i === LEVELS.length - 1;
  const nextLabel = lastInWorld(i) ? `Finish World ${l.world + 1}` : last ? 'See your results' : 'Next level';
  let body;
  if (r.kind === 'versus' && r.rounds) {
    body = matchResultBody(r);
  } else if (r.kind === 'versus' && !r.score) {
    body = `<h2>${r.winner < 0 ? 'It’s a draw!' : nameSpan(r.winner) + ' wins!'}</h2>${statsHTML(r.stats)}`;
  } else if (r.kind === 'versus') {
    const head = r.winner < 0 ? 'It’s a draw!' : `<span class="nm-${r.winner === 0 ? 'pip' : 'bo'}">${NAMES[r.winner]}</span> takes the crown!`;
    body = `<h2>${head}</h2>
      <div class="stats">
        <div class="stat"><span class="k">Pip held it</span><span class="v">${r.score[0].toFixed(1)}s</span></div>
        <div class="stat"><span class="k">Bo held it</span><span class="v">${r.score[1].toFixed(1)}s</span></div>
      </div>`;
  } else if (r.pong) {
    const pg = r.pong;
    body = `<h2>${pg.won ? 'You beat Robo!' : 'Robo wins this time!'}</h2>
      <div class="stats">
        <div class="stat"><span class="k">Final score</span><span class="v">${pg.score[0]} <small>to</small> ${pg.score[1]}</span></div>
        <div class="stat"><span class="k"><span class="nm-pip">Pip</span> hits</span><span class="v">${pg.hits[0]}</span></div>
        <div class="stat"><span class="k"><span class="nm-bo">Bo</span> hits</span><span class="v">${pg.hits[1]}</span></div>
        <div class="stat"><span class="k">Longest rally</span><span class="v">${pg.longest}</span></div>
      </div>
      ${pg.won ? '' : '<p class="lede">Tip: hit the ball with the end of your paddle to send it off at a steep angle. Robo hates that.</p>'}`;
  } else if (r.golf) {
    const [s0, s1] = r.golf.strokes, [p0, p1] = r.golf.pars, tot = s0 + s1, par = p0 + p1, d = tot - par;
    const head = d < 0 ? `${-d} under par!` : d === 0 ? 'Even par!' : `${d} over par`;
    const bestLine = r.newBest ? (r.best == null ? 'First round' : 'New best!') : 'Best ' + r.best;
    body = `<h2>${head}</h2>
      <div class="stats">
        <div class="stat"><span class="k">Hole 1: <span class="nm-pip">Pip</span> golfed</span><span class="v">${s0} <small>par ${p0}</small></span></div>
        <div class="stat"><span class="k">Hole 2: <span class="nm-bo">Bo</span> golfed</span><span class="v">${s1} <small>par ${p1}</small></span></div>
        <div class="stat"><span class="k">Total strokes</span><span class="v">${tot}</span></div>
        <div class="stat"><span class="k">Record</span><span class="v" style="font-size:20px">${bestLine}</span></div>
      </div>`;
  } else if (r.build) {
    const [t0, t1] = r.build.times;
    const cs = r.build.climbs > 1 ? ` <small>(${r.build.climbs} climbs)</small>` : '', fs = r.build.climbs > 1 ? 's' : '';
    const faster = t0 == null || t1 == null || Math.abs(t0 - t1) < 0.05 ? 'Dead even!' : (t0 < t1 ? 'Bo built Pip the faster climb' + fs : 'Pip built Bo the faster climb' + fs);
    const sq = r.build.squashes || [0, 0], po = r.build.pops || [0, 0], sqTot = sq[0] + sq[1], poTot = po[0] + po[1];
    const sqTxt = k => [sq[k] ? `${sq[k]} squash${sq[k] > 1 ? 'es' : ''}` : '', po[k] ? `${po[k]} trapped` : ''].filter(Boolean).map(t => ` <small>${t}</small>`).join('');
    const sqLine = !r.build.tower ? '' : sqTot + poTot === 0 ? ' Nobody got squashed or trapped. Careful builders!'
      : poTot === 0 ? ` Squashes cost ${BUILD.squashPenalty}s each.` : ` Every squash or trap cost ${BUILD.squashPenalty}s.`;
    body = `<h2>Both of you made it!</h2>
      <div class="stats">
        <div class="stat"><span class="k">Bo built, <span class="nm-pip">Pip</span> climbed${cs}</span><span class="v">${fmtTime(t0 || 0)}${sqTxt(0)}</span></div>
        <div class="stat"><span class="k">Pip built, <span class="nm-bo">Bo</span> climbed${cs}</span><span class="v">${fmtTime(t1 || 0)}${sqTxt(1)}</span></div>
      </div>
      <p class="lede">${faster}.${sqLine}</p>`;
  } else {
    const bestLine = r.newBest ? (r.best == null ? 'First clear' : 'New best time!') : 'Best ' + fmtTime(r.best);
    body = `<h2>${r.title ? esc(r.title) : 'Level clear!'}</h2>
      ${l.noTime && l.noFalls ? '' : `<div class="stats">
        ${l.noTime ? '' : `<div class="stat"><span class="k">Time</span><span class="v">${fmtTime(r.time)}</span></div>`}
        ${l.noFalls ? '' : `<div class="stat"><span class="k">Falls</span><span class="v">${r.falls}</span></div>`}
        ${l.noTime ? '' : `<div class="stat"><span class="k">Record</span><span class="v" style="font-size:20px">${bestLine}</span></div>`}
      </div>`}${statsHTML(r.stats)}`;
  }
  showOverlay(`
    <div class="card ${r.rounds ? 'match-card' : 'fit-card'}">
      <p class="eyebrow">Level ${levelCode(i)} · ${esc(l.name)}${r.rounds ? ` · Best of ${r.bestOf}` : ''}</p>
      ${body}
      <div class="actions-row">${r.rounds
        ? `<button class="primary" type="button" data-act="replay" data-rematch="1" data-primary>Rematch</button>
        <button class="ghost" type="button" data-act="next">${nextLabel}</button>`
        : r.pong && !r.pong.won
        ? `<button class="primary" type="button" data-act="replay" data-primary>Rematch</button>
        <button class="ghost" type="button" data-act="next">${nextLabel}</button>`
        : `<button class="primary" type="button" data-act="next" data-primary>${nextLabel}</button>
        <button class="ghost" type="button" data-act="replay">Play it again</button>`}
      </div>
    </div>`);
  armOverlay();
}

// one table row per level, plus running totals for a group of levels. Falls show only where a team level counts them.
const countsFalls = idxs => idxs.some(i => LEVELS[i].kind === 'team' && !LEVELS[i].noFalls);
function resultRows(idxs, showFalls = countsFalls(idxs)) {
  const tot = { time: 0, falls: 0, done: 0, team: 0, timed: 0, strokes: 0, par: 0, vsLevels: 0, vsWins: [0, 0], showFalls };
  const rows = idxs.map(i => {
    const l = LEVELS[i], r = G.results[i];
    if (l.kind === 'team') tot.team++;
    let res = '<span style="color:var(--muted)">Skipped</span>', falls = '';
    if (r && r.kind === 'team') {
      if (r.golf) {
        const st = r.golf.strokes[0] + r.golf.strokes[1], par = r.golf.pars[0] + r.golf.pars[1];
        res = `${st} strokes <small>par ${par}</small>`; tot.strokes += st; tot.par += par;
      } else if (r.pong) { const bt = r.pong.won ? r.pong.score : r.pong.beaten; res = bt ? `Beat Robo <small>${bt[0]}–${bt[1]}</small>` : `Robo won <small>${r.pong.score[1]}–${r.pong.score[0]}</small>`; }
      else res = l.noTime && r.stats && r.stats[0] && r.stats[0].value != null ? `${esc(String(r.stats[0].value))} <small>${esc(String(r.stats[0].label || '').toLowerCase())}</small>` : fmtTime(r.time);
      if (r.pong) { if (r.pong.won || r.pong.beaten) tot.done++; }
      else { falls = l.noFalls ? '' : r.falls; if (!r.golf && !l.noTime) { tot.time += r.time; tot.timed++; } if (!l.noFalls) tot.falls += r.falls; tot.done++; }
    }
    if (l.kind === 'versus') tot.vsLevels++;
    if (r && r.kind === 'versus') {
      res = r.winner < 0 ? 'Draw' : `<span class="nm-${r.winner === 0 ? 'pip' : 'bo'}">${NAMES[r.winner]}</span> won`;
      if (r.rounds) res += ` <small>${matchScore(r)}</small>`;
      if (r.winner >= 0) tot.vsWins[r.winner]++;
    }
    return `<tr><td><span class="code">${levelCode(i)}</span> ${esc(l.name)}</td><td>${kindTag(l.kind, l)}</td><td class="num">${res}</td>${showFalls ? `<td class="num">${falls}</td>` : ''}</tr>`;
  });
  return { rows, tot };
}
const summaryTable = (rows, showFalls = true) => `<div class="table-wrap"><table class="summary">
  <thead><tr><th>Level</th><th>Type</th><th style="text-align:right">Result</th>${showFalls ? '<th style="text-align:right">Falls</th>' : ''}</tr></thead>
  <tbody>${rows.join('')}</tbody></table></div>`;
function totalsStats(tot) {
  // the head-to-head tally shows once there are a few versus levels (a world of them, or the whole game)
  const vs = tot.vsLevels >= 2 ? `<div class="stat"><span class="k">Versus wins</span><span class="v"><span class="nm-pip">${tot.vsWins[0]}</span> <small>Pip</small> <span class="nm-bo">${tot.vsWins[1]}</span> <small>Bo</small></span></div>` : '';
  if (!tot.team) return `<div class="stats">${vs}</div>`;
  return `<div class="stats">
    <div class="stat"><span class="k">Team levels cleared</span><span class="v">${tot.done} of ${tot.team}</span></div>
    ${tot.timed ? `<div class="stat"><span class="k">Team time</span><span class="v">${fmtTime(tot.time)}</span></div>` : ''}
    ${tot.timed && tot.showFalls ? `<div class="stat"><span class="k">Falls</span><span class="v">${tot.falls}</span></div>` : ''}
    ${tot.par ? `<div class="stat"><span class="k">Golf strokes</span><span class="v">${tot.strokes} <small>par ${tot.par}</small></span></div>` : ''}${vs}
  </div>`;
}
// the card between worlds
function showWorldDone(w) {
  G.mode = 'final';
  setActUI(false); setLegend(null);
  const { rows, tot } = resultRows(worldLevels(w));
  const nxt = nextLiveWorld(w);
  showOverlay(`
    <div class="card fit-card">
      <p class="eyebrow">World ${w + 1} complete</p>
      <h2>${esc(WORLDS[w].name)}: done!</h2>
      ${totalsStats(tot)}
      ${summaryTable(rows, tot.showFalls)}
      <div class="actions-row">
        ${nxt !== null ? `<button class="primary" type="button" data-act="world" data-w="${nxt}" data-primary>On to World ${nxt + 1}: ${esc(WORLDS[nxt].name)}</button>`
          : '<button class="primary" type="button" data-act="final" data-primary>See your results</button>'}
        <button class="ghost" type="button" data-act="menu">Title screen</button>
      </div>
    </div>`);
  armOverlay();
}
function showFinal() {
  G.mode = 'final';
  setActUI(false); setLegend(null);
  // the bosses beaten this session: the Grand Collector (10-1), Cinder the dragon (20-1) and the Time Thief (30-1)
  const beaten = m => { const k = LEVELS.findIndex(l => l.mode === m); return k >= 0 && !!G.results[k]; };
  const all = resultRows(LEVELS.map((l, i) => i)), fl = all.tot.showFalls, beatGC = beaten('collector'), beatVD = beaten('dragon'), beatTT = beaten('timethief'), beat = beatGC || beatVD || beatTT;
  const bossBits = [beatGC ? 'beat the Grand Collector' : '', beatVD ? 'made friends with Cinder the dragon' : '', beatTT ? 'caught the Time Thief and saved history' : ''].filter(Boolean);
  const bossLine = bossBits.length > 1 ? 'You ' + bossBits.slice(0, -1).join(', ') + ' and ' + bossBits[bossBits.length - 1] + '!'
    : beatTT ? 'You caught the Time Thief and saved history!'
    : beatVD ? 'You cheered up Cinder the dragon. Now he\'s your friend!' : 'You beat the Grand Collector!';
  const rows = liveWorlds().flatMap(w => [`<tr class="wrow"><td colspan="${fl ? 4 : 3}">World ${w + 1}: ${esc(WORLDS[w].name)}</td></tr>`].concat(resultRows(worldLevels(w), fl).rows));
  // one line per world up top; every level's row folds away below it (a long table on a phone otherwise)
  const worldRows = liveWorlds().map(w => {
    const t = resultRows(worldLevels(w)).tot, bits = [];
    if (t.team) { bits.push(`Team ${t.done}/${t.team}`); if (t.timed) bits.push(fmtTime(t.time)); if (t.par) bits.push(`${t.strokes} strokes <small>par ${t.par}</small>`); }
    if (t.vsLevels) bits.push(`Wins <span class="nm-pip">${t.vsWins[0]}</span>–<span class="nm-bo">${t.vsWins[1]}</span>`);
    const played = worldLevels(w).some(i => G.results[i]);
    return `<tr><td><span class="code">${w + 1}</span> ${esc(WORLDS[w].name)}</td><td class="num">${played ? bits.join(' · ') : '<span style="color:var(--muted)">Skipped</span>'}</td></tr>`;
  });
  showOverlay(`
    <div class="card fit-card">
      <p class="eyebrow">${beat ? 'The end' : 'Demo complete'}</p>
      <h2>Nice teamwork, <span class="nm-pip">Pip</span> &amp; <span class="nm-bo">Bo</span>${beat ? '!' : ''}</h2>
      ${beat ? `<p class="lede">${bossLine}</p>` : ''}
      ${totalsStats(all.tot)}
      <div class="table-wrap"><table class="summary worlds">
        <thead><tr><th>World</th><th style="text-align:right">Result</th></tr></thead>
        <tbody>${worldRows.join('')}</tbody></table></div>
      <details class="all-levels"><summary>Every level</summary>${summaryTable(rows, fl)}</details>
      <div class="actions-row">
        <button class="primary" type="button" data-act="start" data-primary>Play again</button>
        <button class="ghost" type="button" data-act="menu">Title screen</button>
      </div>
    </div>`);
  armOverlay();
}

overlay.addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  Sfx.init();
  const a = b.dataset.act;
  // (from a menu a level opens on its ready card: startLevel, js/controls.js)
  if (a === 'start') { G.results = []; startLevel(0); }
  else if (a === 'level') startLevel(+b.dataset.i);
  else if (a === 'ready') { const k = +b.dataset.p; if (e.pointerType === 'touch') Dev.last[k] = 'touch'; readyPress(k); b.blur(); }
  else if (a === 'ready-back') readyBack();
  else if (a === 'next') {
    const i = G.levelIndex;
    if (lastInWorld(i)) showWorldDone(LEVELS[i].world); // the last world gets its card too; its button opens the final card
    else if (i + 1 >= LEVELS.length) showFinal();
    else startLevel(i + 1);
  }
  else if (a === 'world') startLevel(worldLevels(+b.dataset.w)[0]);
  else if (a === 'final') showFinal();
  else if (a === 'replay') loadLevel(G.levelIndex, 'play', { rematch: b.dataset.rematch === '1' });
  else if (a === 'modeact') hook('pauseAct', b.dataset.arg);
  else if (a === 'resume') resume();
  else if (a === 'menu') showTitle();
  else if (a === 'cpucfg') { const v = b.dataset.v; cpuSetCfg(b.dataset.k, /^\d+$/.test(v) ? +v : v); const pb = overlay.querySelector('[data-primary]'); (pb || b).focus({ preventScroll: true }); }
});

/* ---------- settings on the title and pause cards: sound, and real full screen where the browser allows it ---------- */
const canFullscreen = () => !!(document.fullscreenEnabled && document.documentElement.requestFullscreen);
const VOL_NAMES = ['Off', 'Low', 'Medium', 'High'];
// the pause card has a row of four buttons for each volume; the title screen (compact) has one button each that steps through them
function sysCfgHTML(compact) {
  const full = !!document.fullscreenElement;
  const vol = (k, label) => `<div class="seg-row vol-row" role="group" aria-label="${label} volume"><span class="seg-k">${label}</span>${
    VOL_NAMES.map((n, i) => `<button type="button" class="seg" data-act="syscfg" data-k="${k}" data-v="${i}" aria-pressed="${Sfx.vol[k] === i}">${n}</button>`).join('')}</div>`;
  const step = (k, label) => `<button type="button" class="seg" data-act="syscfg" data-k="${k}" data-v="step" data-label="${label}" aria-pressed="${Sfx.vol[k] > 0 && !Sfx.muted}">${label}: ${Sfx.muted ? 'Off' : VOL_NAMES[Sfx.vol[k]]}</button>`;
  const fs = canFullscreen() ? `<button type="button" class="seg" data-act="syscfg" data-k="full" aria-pressed="${full}">${full ? 'Full screen on' : 'Full screen off'}</button>` : '';
  if (compact) return `<div class="cpu-cfg sys-cfg"><div class="seg-row" role="group" aria-label="Sound and screen">${step('music', 'Music')}${step('sfx', 'Sounds')}${fs}</div></div>`;
  return `<div class="cpu-cfg sys-cfg">${vol('music', 'Music')}${vol('sfx', 'Sounds')}<div class="seg-row" role="group" aria-label="Sound and screen">
      <button type="button" class="seg" data-act="syscfg" data-k="sound" aria-pressed="${!Sfx.muted}">${Sfx.muted ? 'Sound off' : 'Sound on'}</button>
      ${fs}
    </div></div>`;
}
function sysCfgSync() {
  const full = !!document.fullscreenElement;
  overlay.querySelectorAll('[data-act="syscfg"]').forEach(b => {
    const k = b.dataset.k;
    if (k === 'music' || k === 'sfx') {
      if (b.dataset.v === 'step') { b.setAttribute('aria-pressed', String(Sfx.vol[k] > 0 && !Sfx.muted)); b.textContent = b.dataset.label + ': ' + (Sfx.muted ? 'Off' : VOL_NAMES[Sfx.vol[k]]); }
      else b.setAttribute('aria-pressed', String(Sfx.vol[k] === +b.dataset.v));
      return;
    }
    const snd = k === 'sound', on = snd ? !Sfx.muted : full;
    b.setAttribute('aria-pressed', String(on));
    b.textContent = (snd ? 'Sound ' : 'Full screen ') + (on ? 'on' : 'off');
  });
}
function setFullscreen(on) {
  try {
    const p = on ? (!document.fullscreenElement && document.documentElement.requestFullscreen()) : (document.fullscreenElement && document.exitFullscreen());
    if (p && p.catch) p.catch(() => toast('Full screen is not available here.'));
  } catch (e) { toast('Full screen is not available here.'); }
}
document.addEventListener('fullscreenchange', sysCfgSync);
function toggleMute() {
  Sfx.setMuted(!Sfx.muted);
  store.set('muted', Sfx.muted);
  sysCfgSync();
}
// Music and Sounds each have their own volume: 0 Off, 1 Low, 2 Medium, 3 High
function setVolume(k, n) {
  Sfx.setVol(k, n);
  store.set(k === 'music' ? 'volMusic' : 'volSfx', Sfx.vol[k]);
  if (Sfx.muted && n > 0) toggleMute(); // turning a volume up also turns the sound back on
  sysCfgSync();
  if (k === 'sfx') Sfx.play('press');
}
for (const [k, key] of [['music', 'volMusic'], ['sfx', 'volSfx']]) { const v = store.get(key); if (typeof v === 'number') Sfx.setVol(k, v); }
overlay.addEventListener('click', e => {
  const b = e.target.closest('[data-act="syscfg"]');
  if (!b) return;
  Sfx.init();
  const k = b.dataset.k;
  if (k === 'music' || k === 'sfx') setVolume(k, b.dataset.v === 'step' ? (Sfx.muted ? 1 : (Sfx.vol[k] + 1) % 4) : +b.dataset.v);
  else if (k === 'sound') toggleMute(); else setFullscreen(!document.fullscreenElement);
});
if (store.get('muted') === true) toggleMute();
document.getElementById('menuBtn').addEventListener('click', e => {
  Sfx.init();
  e.currentTarget.blur();
  if (G.mode === 'play') pause(); else if (G.mode !== 'title' || Home.screen !== 'title') showTitle();
});

