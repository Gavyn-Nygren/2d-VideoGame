/* Pip & Bo - Home screens: the title, the world map, and each world's page with a moving preview of every level.
   Everything here is built from LEVELS and WORLDS, so a new world or level shows up by itself. Its preview comes from
   js/previews/ (a level without one gets a plain one made from its world's colours).

   Title  --Play-->  World map (a tile per world)  --pick-->  World page (a card per level)  --pick-->  the level
   The pause card's "Choose a level" opens the current world's page; Back from the world map returns to the pause card.
   Keys: arrows or W A S D move between buttons on these screens, Enter or Space picks, Esc goes back.
   Controller: stick or d-pad moves, A picks, B goes back. Touch: tap. */
'use strict';

// screen: which home screen is up ('title', 'howto', 'worlds', 'world'); from: where the world map's Back goes ('title' or 'pause')
const Home = { screen: 'title', from: 'title', w: 0, page: 0 };

const NUM_WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen',
  'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen', 'Twenty'];
// "One pits you against each other" / "Five pit you against each other", counted from the levels that exist
function titleLede() {
  const nVs = LEVELS.filter(l => l.kind === 'versus').length;
  const vs = nVs === 1 ? 'One pits you' : (NUM_WORDS[nVs] || nVs) + ' pit you';
  return `A couch co-op game for two, in ${liveWorlds().length} worlds and ${LEVELS.length} levels. Every level has its own trick, and most of them need you both. ${vs} against each other, and one against a robot.`;
}

/* ---------- facts about worlds and levels, for the cards ---------- */
// Gavyn's rule: every 10th world is a boss world
const isBossWorld = w => (w + 1) % 10 === 0;
// how a world plays, from its levels
function worldKind(w) {
  if (isBossWorld(w)) return 'Boss';
  const ls = worldLevels(w), vs = ls.filter(i => LEVELS[i].kind === 'versus').length;
  return vs === 0 ? 'Team' : vs === ls.length ? 'Versus' : 'Team + versus';
}
// played before (kept in the browser): a team level once cleared, a versus level once a match finished
function levelDone(i) {
  const l = LEVELS[i], r = G.results[i];
  if (r && !(r.pong && !r.pong.won && !r.pong.beaten)) return true;
  return !!store.get('done:' + l.name) || levelRecord('best', i) != null || levelRecord('golf', i) != null;
}
// the level's record, if it keeps one
function levelBest(i) {
  const l = LEVELS[i];
  if (l.golf) { const b = levelRecord('golf', i); return b == null ? '' : `Best ${b} strokes`; }
  if (l.kind !== 'team' || l.noTime || l.pong) return '';
  const b = levelRecord('best', i);
  return b == null ? '' : 'Best ' + fmtTime(b);
}
// 1-player mode: one line on a world's page saying who the computer plays and how, for the kinds of level in it
function worldWho(w) {
  if (!cpuSolo()) return '';
  const ls = worldLevels(w), me = nameSpan(cpuHuman()), cpu = NAMES[1 - cpuHuman()];
  const skill = { easy: 'Easy', normal: 'Normal', hard: 'Hard' }[CPU.cfg.skill] || '';
  const team = ls.some(i => LEVELS[i].kind !== 'versus'), vs = ls.some(i => LEVELS[i].kind === 'versus');
  const how = team && vs ? `helps you in team levels and plays against you (${skill}) in versus levels`
    : vs ? `plays against you (${skill})` : 'is your teammate';
  return `You play ${me}. The computer plays ${cpu} and ${how}.`;
}
const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');

/* ---------- the title ---------- */
// A full-screen title like a console game's: Pip and Bo run through the worlds behind the logo, with a short menu
// (Play, Players, How to play). The controls live on their own "How to play" screen so the title stays clean.
// the logo, one span per letter so they can drop in and bob (data-c feeds the two-tone shine in css/style.css)
function logoHTML() {
  let k = 0;
  const word = (txt, cls) => `<span class="lw ${cls}">${[...txt].map(c => `<span class="ch" style="--i:${k++}" data-c="${esc(c)}">${esc(c)}</span>`).join('')}</span>`;
  return `<h1 class="logo" aria-label="Pip and Bo"><span aria-hidden="true">${word('Pip', 'nm-pip')}${word('&', 'amp')}${word('Bo', 'nm-bo')}</span></h1>`;
}
function showTitle() {
  G.mode = 'title';
  G.results = [];
  loadLevel(0, 'title');
  Home.screen = 'title'; Home.from = 'title';
  const nVs = LEVELS.filter(l => l.kind === 'versus').length;
  showOverlay(`
    <div class="title-screen" data-nav>
      <canvas class="ts-art" data-pv="hero" aria-hidden="true"></canvas>
      <div class="ts-shade" aria-hidden="true"></div>
      <div class="ts-main">
        <div class="ts-brand">
          ${logoHTML()}
          <span class="spark s1" aria-hidden="true"></span><span class="spark s2" aria-hidden="true"></span><span class="spark s3" aria-hidden="true"></span>
          <p class="ts-tag"><span>A couch co-op adventure for two</span></p>
        </div>
        <div class="ts-menu">
          <button class="primary play-btn" type="button" data-act="worlds" data-primary><span>Play</span></button>
          ${cpuCfgHTML()}
          <div class="ts-pair">
            <button class="ghost ts-btn" type="button" data-act="howto">How to play</button>
            <button class="ghost ts-btn" type="button" data-act="settings">Settings</button>
          </div>
          <p class="ts-press" aria-hidden="true"><span class="kb-only">Press <kbd>Enter</kbd> to start</span><span class="pad-only">Press <span data-glyph="a"></span> to start</span></p>
        </div>
      </div>
      <p class="ts-foot"><span><b>${liveWorlds().length}</b> worlds</span><span><b>${LEVELS.length}</b> levels</span><span><b>${nVs}</b> head-to-heads</span></p>
      <p class="hint ts-padblocked" data-padblocked hidden>This page isn’t allowed to read controllers. To play with one, download the game file and open it directly in Chrome, Edge or Firefox.</p>
    </div>`);
  mountPreviews(overlay);
}
// "How to play": each player's keys, touch buttons and controller, plus what the game is (Esc / B / Back goes to the title)
function showHowTo() {
  Home.screen = 'howto';
  const kc = (p, w) => `<kbd>${esc(KEYCAPS[p][w])}</kbd>`;
  showOverlay(`
    <div class="card home-card howto-card" data-nav>
      <div class="home-head">
        <button class="ghost back" type="button" data-act="howto-back" data-back data-primary><span aria-hidden="true">◀</span> Title</button>
        <div class="home-title"><p class="eyebrow"><span data-cpu-eyebrow>${CPU.cfg.players === 1 ? '1 player + computer' : '2 players'}</span> · 1 screen</p><h2>How to play</h2></div>
      </div>
      <p class="lede">${titleLede()}</p>
      <div class="duo kb-only">
        <div class="pcard pip"><div class="nm nm-pip">Pip</div><div class="keys"><span>${kc(0, 'left')}${kc(0, 'right')} move</span><span>${kc(0, 'jump')} jump</span><span>${kc(0, 'down')} drop down</span></div></div>
        <div class="pcard bo"><div class="nm nm-bo">Bo</div><div class="keys"><span>${kc(1, 'left')}${kc(1, 'right')} move</span><span>${kc(1, 'jump')} jump</span><span>${kc(1, 'down')} drop down</span></div></div>
      </div>
      <p class="hint kb-only">Some levels add an action button: ${kc(0, 'act')} for Pip, ${kc(1, 'act')} for Bo. <kbd>R</kbd> restarts a level and <kbd>Esc</kbd> pauses. In menus, the arrow keys move, <kbd>Enter</kbd> picks and <kbd>Esc</kbd> goes back.</p>
      <p class="hint touch-only" data-two-only${CPU.cfg.players === 1 ? ' hidden' : ''}>Pip uses the orange buttons on the left, Bo uses the blue buttons on the right. ▲ jumps, ▼ drops through planks.</p>
      <p class="hint touch-only" data-solo-only${CPU.cfg.players === 1 ? '' : ' hidden'}>Use the buttons on your side of the screen. ▲ jumps, ▼ drops through planks.</p>
      <div class="pcard pad-only">
        <div class="keys"><span>Stick or d-pad: move</span><span><span data-glyph="a"></span> jump (you can change the keys and buttons in Settings)</span><span>Down: drop through planks</span><span><span data-glyph="start"></span> pause</span></div>
        <p class="hint" data-padwho></p>
        <p class="hint">Press <span data-glyph="view"></span> to swap who plays which character<span data-solo-only${CPU.cfg.players === 1 ? '' : ' hidden'}> (you and the computer)</span>. In menus, the stick moves between buttons, <span data-glyph="a"></span> picks and <span data-glyph="b"></span> goes back.</p>
      </div>
      <p class="hint kb-only">Controllers work too (Xbox, PlayStation, Switch and others): press any button on one to connect it. The first is Pip, the second is Bo.</p>
      <p class="hint" data-padblocked hidden>This page isn’t allowed to read controllers. To play with one, download the game file and open it directly in Chrome, Edge or Firefox.</p>
    </div>`);
}

/* ---------- the world map: one tile per world, 10 to a page (5 across, 2 down) ---------- */
// Gavyn (Nov 2026): a page of 10 worlds in a 2x5 block, with an arrow on the right to the next 10 (and one on the
// left to go back). Each page ends on a boss world (10, 20, 30...), which sits in the bottom-right corner.
// Pages are counted from the worlds that exist, so new worlds land on the next page by themselves.
const WORLDS_PER_PAGE = 10;
const worldPageCount = () => Math.max(1, Math.ceil(liveWorlds().length / WORLDS_PER_PAGE));
const worldPageOf = w => Math.max(0, Math.floor(liveWorlds().indexOf(w) / WORLDS_PER_PAGE));
function worldTileHTML(w, focusW) {
  const ls = worldLevels(w), done = ls.filter(levelDone).length, wd = WORLDS[w], kind = worldKind(w);
  const dots = ls.map(i => `<i class="${levelDone(i) ? 'on' : ''}"></i>`).join('');
  return `<li><button type="button" class="wtile${isBossWorld(w) ? ' boss' : ''}" data-act="openworld" data-w="${w}"${w === focusW ? ' data-primary' : ''}
      aria-label="World ${w + 1}: ${esc(wd.name)}. ${plural(ls.length, 'level')}, ${kind.toLowerCase()}. ${done} played.">
    <span class="thumb"><canvas data-pv="world:${w}" aria-hidden="true"></canvas><span class="wnum">${w + 1}</span>${isBossWorld(w) ? '<span class="bossb">Boss</span>' : ''}</span>
    <span class="wname">${esc(wd.name)}</span>
    <span class="wmeta"><span>${plural(ls.length, 'level')} · ${kind}</span><span class="dots" aria-hidden="true">${dots}</span></span>
  </button></li>`;
}
// one page of tiles, with the arrows either side and the page dots under it
function worldPageHTML(page, focusW) {
  const ws = liveWorlds(), n = worldPageCount(), on = ws.slice(page * WORLDS_PER_PAGE, (page + 1) * WORLDS_PER_PAGE);
  const range = p => { const a = ws[p * WORLDS_PER_PAGE], b = ws[Math.min(ws.length, (p + 1) * WORLDS_PER_PAGE) - 1]; return a === b ? `World ${a + 1}` : `Worlds ${a + 1} to ${b + 1}`; };
  const arrow = (to, dir) => to < 0 || to >= n ? `<span class="pagearrow-gap ${dir < 0 ? 'prev' : 'next'}" aria-hidden="true"></span>`
    : `<button type="button" class="ghost pagearrow ${dir < 0 ? 'prev' : 'next'}" data-act="wpage" data-p="${to}" aria-label="${dir < 0 ? 'Back to' : 'Next:'} ${range(to)}">
        <span class="pa-icon" aria-hidden="true">${dir < 0 ? '◀' : '▶'}</span><span class="pa-text">${dir < 0 ? 'Back' : 'More'}</span></button>`;
  const dots = n > 1 ? `<p class="pagedots" aria-label="Page ${page + 1} of ${n}: ${range(page)}">${Array.from({ length: n }, (_, p) => `<i class="${p === page ? 'on' : ''}"></i>`).join('')}<span>${range(page)}</span></p>` : '';
  return `${n > 1 ? arrow(page - 1, -1) : ''}<ol class="world-grid">${on.map(w => worldTileHTML(w, focusW)).join('')}</ol>${n > 1 ? arrow(page + 1, 1) : ''}${dots}`;
}
function showWorlds(focusW) {
  const ws = liveWorlds();
  if (!ws.includes(focusW)) focusW = ws.includes(Home.w) ? Home.w : ws[0];
  Home.screen = 'worlds'; Home.w = focusW; Home.page = worldPageOf(focusW);
  if (G.mode === 'title') applyTheme(focusW);
  showOverlay(`
    <div class="card home-card worlds-card" data-nav>
      <div class="home-head">
        <button class="ghost back" type="button" data-act="worlds-back" data-back><span aria-hidden="true">◀</span> ${Home.from === 'pause' ? 'Back to the game' : 'Title'}</button>
        <div class="home-title"><p class="eyebrow">${plural(ws.length, 'world')} · ${plural(LEVELS.length, 'level')}</p><h2>Pick a world</h2></div>
      </div>
      <div class="wpager${worldPageCount() > 1 ? ' paged' : ''}" data-wpager>${worldPageHTML(Home.page, focusW)}</div>
    </div>`);
  const f = overlay.querySelector('[data-primary]');
  if (f) f.scrollIntoView({ block: 'nearest' });
  mountPreviews(overlay);
}
// flip the world map to another page in place (no new card, so quick taps on the arrow all count)
function showWorldPage(page, dir) {
  const box = overlay.querySelector('[data-wpager]');
  if (!box) return;
  page = Math.max(0, Math.min(worldPageCount() - 1, page));
  Home.page = page;
  const ws = liveWorlds(), first = ws[page * WORLDS_PER_PAGE];
  Home.w = first;
  if (G.mode === 'title') applyTheme(first);
  box.innerHTML = worldPageHTML(page, first);
  // keep focus on the same arrow so you can keep paging; at the last (or first) page, land on the first world
  const same = box.querySelector(`.pagearrow.${dir < 0 ? 'prev' : 'next'}`);
  const to = same || box.querySelector('.wtile');
  if (to) { try { to.focus({ preventScroll: true }); } catch (e) { to.focus(); } }
  box.scrollIntoView({ block: 'nearest' });
  mountPreviews(overlay);
}

/* ---------- a world's page: a moving preview card for every level ---------- */
function showWorld(w) {
  const ws = liveWorlds();
  if (!ws.includes(w)) w = ws[0];
  Home.screen = 'world'; Home.w = w;
  if (G.mode === 'title') applyTheme(w);
  const k = ws.indexOf(w), prev = k > 0 ? ws[k - 1] : null, next = k < ws.length - 1 ? ws[k + 1] : null, wd = WORLDS[w], ls = worldLevels(w);
  const flip = (to, dir) => to == null ? `<span class="flip-gap"></span>`
    : `<button class="ghost flip" type="button" data-act="openworld" data-w="${to}" aria-label="World ${to + 1}: ${esc(WORLDS[to].name)}">${dir < 0 ? '<span aria-hidden="true">◀</span> ' : ''}World ${to + 1}${dir > 0 ? ' <span aria-hidden="true">▶</span>' : ''}</button>`;
  const cards = ls.map(i => {
    const l = LEVELS[i], best = levelBest(i), done = levelDone(i), blurb = levelBlurb(i);
    return `<li><button type="button" class="lvl" data-act="level" data-i="${i}" aria-label="Level ${levelCode(i)}: ${esc(l.name)}, ${l.kind === 'versus' ? 'versus' : 'team'}. ${esc(blurb)}">
      <span class="thumb"><canvas data-pv="level:${i}" aria-hidden="true"></canvas><span class="lcode">${levelCode(i)}</span>${done ? '<span class="ldone" aria-hidden="true">✓</span>' : ''}</span>
      <span class="lname">${esc(l.name)}</span>
      <span class="lmeta">${kindTag(l.kind, l)}${best ? `<span class="lbest">${esc(best)}</span>` : ''}</span>
      <span class="lblurb">${esc(blurb)}</span>
    </button></li>`;
  }).join('');
  showOverlay(`
    <div class="card home-card world-page" data-nav>
      <div class="home-head">
        <button class="ghost back" type="button" data-act="home-back" data-back><span aria-hidden="true">◀</span> Worlds</button>
        <div class="home-title"><p class="eyebrow">World ${w + 1} · ${worldKind(w)}</p><h2>${esc(wd.name)}</h2></div>
        <div class="flips">${flip(prev, -1)}${flip(next, 1)}</div>
      </div>
      <p class="lede">${esc(wd.blurb || '')}</p>
      <div class="actions-row">
        <button class="primary" type="button" data-act="world" data-w="${w}" data-primary>${ls.length > 1 ? `Play World ${w + 1} from ${levelCode(ls[0])}` : `Play ${esc(LEVELS[ls[0]].name)}`}</button>
        <span class="hint">${ls.length > 1 ? 'or pick any level below' : ''}</span>
      </div>
      ${cpuSolo() ? `<p class="hint solo-who">${worldWho(w)}</p>` : ''}
      <ol class="lvl-grid${ls.length === 1 ? ' one' : ''}">${cards}</ol>
    </div>`);
  mountPreviews(overlay);
}

overlay.addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const a = b.dataset.act;
  if (a === 'worlds') {
    // from the pause card: straight to the world being played; from the title: the world map
    if (G.mode === 'paused') { Home.from = 'pause'; showWorld(LEVELS[G.levelIndex].world); }
    else { Home.from = 'title'; showWorlds(store.get('lastWorld')); }
  }
  else if (a === 'howto') showHowTo();
  else if (a === 'howto-back') { showTitle(); const h = overlay.querySelector('[data-act="howto"]'); if (h) h.focus({ preventScroll: true }); }
  else if (a === 'openworld') showWorld(+b.dataset.w);
  else if (a === 'wpage') showWorldPage(+b.dataset.p, +b.dataset.p < Home.page ? -1 : 1);
  else if (a === 'home-back') showWorlds(Home.w);
  else if (a === 'worlds-back') { if (Home.from === 'pause' && G.mode === 'paused') showPauseCard(); else showTitle(); }
  else if (a === 'level' || a === 'world') {
    // (js/ui.js starts the level; remember the world so Play opens there next time)
    Home.screen = 'play';
    const lv = G.level ? LEVELS[G.levelIndex] : null;
    if (lv) store.set('lastWorld', lv.world);
  }
});
// on the world map, the game screen behind the menu takes the colours of the world under the cursor or focus
function homeTint(e) {
  if (G.mode !== 'title' || Home.screen !== 'worlds') return;
  const t = e.target.closest && e.target.closest('.wtile');
  if (t && +t.dataset.w !== Home.w) { Home.w = +t.dataset.w; applyTheme(Home.w); }
}
overlay.addEventListener('focusin', homeTint);
overlay.addEventListener('pointerover', homeTint);
