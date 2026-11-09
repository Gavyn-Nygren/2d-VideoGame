/* Pip & Bo - World 28 Pyramid Sands: the world entry and its four level defs. */
'use strict';

/* World 28 is added from here (not in the WORLDS literal and LEVELS list of level-list.js), like Worlds 24 and 25, so
   it never conflicts with Worlds 26 and 27, which are built at the same time. World index 27. This file loads after the
   four World 28 level files and after Worlds 25-27, so its levels land in LEVELS after theirs (level codes come from
   the world number, so 28-1 is 28-1 whatever the load order).
   Pyramid Sands: an adventure in an old desert pyramid. Rolling boulders, dark tombs, sliding stone puzzles and a camel
   race across the dunes. An original look: no characters or likenesses from any film. Gavyn picked the theme and these
   four levels from ten ideas (Nov 2026); he skipped Sand Sled Dunes, Mummy Wake-Up Chase, Quicksand Rescue, Sandstorm
   Caravan, Scarab Elevator and Treasure Grab.
   Each level's def sits between its own BEGIN/END lines. */
// a hot desert day: deep blue sky to warm sand, golden dunes, sandstone blocks
WORLDS[27] = { name: 'Pyramid Sands', blurb: 'Outrun the rolling boulder, light up the dark tomb, slide the stone puzzles and race camels over the dunes!',
  theme: { skyTop: '#4f9be0', skyBot: '#ffe2a8', hillFar: '#f0c77a', hillNear: '#e0a85a', sun: 'rgba(255, 244, 200, 0.98)', sunGlow: 'rgba(255, 220, 140, 0.45)',
    stone: '#c49a5e', stoneLight: '#d9b47a', stoneEdge: '#8f6436', grass: '#f0cf86', grassDark: '#c99a5c', plank: '#a8783e', plankDark: '#6e4a26', rope: '#e8d2a0', ropeDark: '#8a6a3a' } };

const W28_SPAWN_MAP = [...Array(15).fill('.'.repeat(32)), '..1.2' + '.'.repeat(27), '.'.repeat(32), '.'.repeat(32)];
LEVELS.push(
  // ----- BEGIN 28-1 Rolling Boulder Run (mode 'boulderrun', js/levels/world28/rolling-boulder-run.js) -----
  // 28-1 Rolling Boulder Run (mode 'boulderrun', team, Gavyn's pick: "a giant boulder chases you down a tomb corridor.
  // One player pulls levers to open doors ahead, the other clears rubble"). Scrolls right; three runs, the jobs swap
  // every run. The map is only the two spawns; the mode builds each run from its course (tokens: see the level file).
  { name: 'Rolling Boulder Run', world: 27, kind: 'team', mode: 'boulderrun', ownStep: true, ownHUD: true, noFalls: true, roomWord: 'Run',
    legend: {
      pip: '<kbd>A</kbd><kbd>D</kbd> run <kbd>W</kbd> jump',
      bo: '<kbd>←</kbd><kbd>→</kbd> run <kbd>↑</kbd> jump',
      pad: 'stick runs, <span data-glyph="a"></span> jumps,',
    },
    tip: 'RUN! One holds the action at levers to open doors, the other smashes rubble. Jump the gaps!',
    act: { label: 'pull', labels: ['pull', 'smash'] },
    map: W28_SPAWN_MAP,
    rooms: [
      {
        title: 'The Long Hall', puller: 0, act: { label: 'pull', labels: ['pull', 'smash'] },
        tip: 'Pip holds the action at levers to open doors. Bo smashes rubble. Keep running!',
        course: ['f700', 'D', 'f260', 'R', 'f220', 'g', 'f300', 'D', 'f200', 'S', 'f160', 'R', 'f240', 'X', 'f200', 'g', 'f240', 'D', 'f300', 'R', 'f300', 'E'],
      },
      {
        title: 'Crumbling Bridge', puller: 1, act: { label: 'smash', labels: ['smash', 'pull'] },
        tip: 'Swap! Bo pulls levers, Pip smashes rubble. The floor is crumbling: don\'t stop!',
        course: ['f600', 'c240', 'f180', 'R', 'f160', 'D', 'f160', 'c300', 'f200', 'X', 'g', 'f200', 'R', 'f120', 'c180', 'f160', 'D', 'f200', 'X', 'f160', 'S', 'g', 'f240', 'R', 'c240', 'f260', 'E'],
      },
      {
        title: 'The Great Escape', puller: 0, act: { label: 'pull', labels: ['pull', 'smash'] },
        tip: 'Pip pulls, Bo smashes, all the way out! Rocks fall, floors crumble. Jump the last chasm!',
        course: ['f560', 'R', 'f140', 'D', 'c240', 'f160', 'X', 'g', 'f200', 'R', 'f120', 'S', 'D', 'f160', 'c300', 'f160', 'X', 'f120', 'R', 'g', 'f200', 'D', 'f120', 'c180', 'X', 'f160', 'R', 'f200', 'D', 'f300', 'E'],
      },
    ],
  },
  // ----- END 28-1 Rolling Boulder Run -----
);
