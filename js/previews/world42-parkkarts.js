/* Pip & Bo - preview for 42-4 Go-Kart Grand Prix (world page card). Loaded after every level file, so it also keeps
   the Grand Prix the world's last level whatever order the World 42 levels' script blocks load in. */
'use strict';

// 42-4 is the world's final level: move it after the other World 42 levels (level codes follow LEVELS order)
(function () {
  const i = LEVELS.findIndex(l => l.mode === 'parkkarts');
  if (i < 0) return;
  let last = -1; LEVELS.forEach((l, j) => { if (l.world === LEVELS[i].world) last = j; });
  if (last > i) { const d = LEVELS.splice(i, 1)[0]; LEVELS.splice(last, 0, d); }
})();
