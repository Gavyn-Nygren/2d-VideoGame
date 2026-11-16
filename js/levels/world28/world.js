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
    jobs: {
      puller: { title: 'Lever puller', act: 'pull', legend: '<kbd>A</kbd><kbd>D</kbd> run <kbd>W</kbd> jump <kbd>F</kbd> hold at a lever' },
      smasher: { title: 'Smasher', act: 'smash', legend: '<kbd>A</kbd><kbd>D</kbd> run <kbd>W</kbd> jump',
        howTo: ['Smash a rubble pile three times.'] },
    },
    jobOf: 'puller', jobSwap: 'You swap jobs every run.',
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
  //
  //
  //
  // ----- BEGIN 28-2 Tomb Torch Explorers (mode 'tombtorch', js/levels/world28/tomb-torch-explorers.js) -----
  // 28-2 Tomb Torch Explorers (mode 'tombtorch', team, Gavyn's pick: "a dark tomb. One holds the torch to light the way,
  // the other finds hidden switches and traps"). Three dark chambers on one screen each; the torch swaps every chamber.
  // Each room's `rows` is its layout (letters: see the level file); ttSplit makes the engine's map from it.
  { name: 'Tomb Torch Explorers', world: 27, kind: 'team', mode: 'tombtorch', noFalls: true, ownHUD: true, roomWord: 'Chamber',
    tip: 'One carries the torch and lights braziers. The other presses the switches found in the light, and disarms traps.',
    act: { label: 'light', labels: ['light', 'press'] },
    jobs: {
      torch: { title: 'Torch', act: 'light', legend: '<kbd>A</kbd><kbd>D</kbd> move <kbd>W</kbd> jump',
        howTo: ['Light a brazier to keep a spot lit.'] },
      seeker: { title: 'Seeker', act: 'press', legend: '<kbd>A</kbd><kbd>D</kbd> move <kbd>W</kbd> jump',
        howTo: ['Press a switch you have seen in the light; press next to a trap to disarm it.'] },
    },
    jobOf: 'torch', jobSwap: 'You swap jobs every chamber.',
    map: W28_SPAWN_MAP,
    rooms: [
      {
        title: 'Entrance Hall', torch: 0, act: { label: 'light', labels: ['light', 'press'] },
        tip: 'Pip has the torch: light the braziers! Bo: press the switches you see in the light. Mind the traps!',
        rows: [
          '################################',
          '#...........#..................#',
          '#...........#..................#',
          '#...........#..................#',
          '#...........#..................#',
          '#...........#..................#',
          '#...........#..................#',
          '#...........#.................*#',
          '#...........#..................#',
          '#...........#................b.#',
          '#...........#...........########',
          '#.....*.....#...*.........B....#',
          '#........a..#.......Y.....B....#',
          '#.......===.A.....=====...B....#',
          '#...........A.............B....#',
          '#.12.Y......A..^^^........B.E..#',
          '################################',
          '################################',
        ],
      },
      {
        title: 'Hall of Traps', torch: 1, act: { label: 'press', labels: ['press', 'light'] },
        tip: 'Swap! Bo holds the torch, Pip finds switches and disarms traps (press the action at a trap).',
        rows: [
          '################################',
          '#..........................#...#',
          '#..........................#...#',
          '#..........................#...#',
          '#.................*........#...#',
          '#..........................#...#',
          '#..........^^^......Y...a..#...#',
          '#..*..######################...#',
          '#.............A............#...#',
          '#.............A............#...#',
          '#.====........A............#.*.#',
          '#.............A............B...#',
          '#......Y......A.......b....B...#',
          '#.....====....A......===...B...#',
          '#.............A............B...#',
          '#.12..........A.Y.^^....^^.B.E.#',
          '################################',
          '################################',
        ],
      },
      {
        title: 'Treasure Chamber', torch: 0, act: { label: 'light', labels: ['light', 'press'] },
        tip: 'Pip has the torch again. Three gates, then the treasure! Bo disarms the traps on the way.',
        rows: [
          '################################',
          '#.........#...............#....#',
          '#.........#........*......#....#',
          '#.........#.............b.#....#',
          '#.........#.....###########....#',
          '#.........#..........#.....#...#',
          '#.........#..Y.......#.....#...#',
          '#.........#.===......#.....#...#',
          '#.........#..........#.....#...#',
          '#.a.......#......^...#.....#...#',
          '####......#.....===..#.....#...#',
          '#.........A..........B.....C...#',
          '#.......*.A..........B...c.C.*.#',
          '#...===...A.===......B..==.C...#',
          '#.........A..........B.....C...#',
          '#.12Y.....A..^.*.....BY^^..C$E.#',
          '################################',
          '################################',
        ],
      },
    ],
  },
  // ----- END 28-2 Tomb Torch Explorers -----
  //
  //
  //
  // ----- BEGIN 28-3 Sliding Stone Puzzle (mode 'stonepuzzle', js/levels/world28/sliding-stone-puzzle.js) -----
  // 28-3 Sliding Stone Puzzle (mode 'stonepuzzle', team, Gavyn's pick: "push heavy stone blocks together to match the
  // hieroglyph picture and open the secret door"). Seen from above, three puzzles. rows/slots: see the level file.
  // (Every puzzle was checked with the computer's own planner: it can solve each one from the start.)
  { name: 'Sliding Stone Puzzle', world: 27, kind: 'team', mode: 'stonepuzzle', ownStep: true, ownHUD: true, noFalls: true, roomWord: 'Puzzle',
    legend: {
      pip: '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> walk and push',
      bo: '<kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd> walk and push',
      pad: 'stick or d-pad walks and pushes,',
    },
    tip: 'Push the stones to match the picture! Heavy stones need both of you in a line. Hold the action to pull.',
    act: { label: 'pull' },
    map: W28_SPAWN_MAP,
    rooms: [
      {
        title: 'The Eye Door', tip: 'Push each stone onto its socket, like the picture. The big sun stone needs you both in a line!',
        rows: ['#####D#####', '#.........#', '#..e...b..#', '#....U....#', '#.........#', '#pq.....R.#', '###########'],
        slots: [[4, 1, 'e'], [5, 1, 'u'], [6, 1, 'b']],
      },
      {
        title: 'The Four Seals', tip: 'Four stones in a square. Think about which one goes in first!',
        rows: ['######D######', '#...........#', '#.#.......#.#', '#...s...c...#', '#.....E.....#', '#..#.n...#..#', '#pq.......R.#', '#############'],
        slots: [[5, 1, 's'], [6, 1, 'e'], [5, 2, 'n'], [6, 2, 'c']],
      },
      {
        title: 'The Pharaoh\'s Seal', tip: 'Two heavy stones this time. Hold the action and step back to pull a small stone out of a corner.',
        rows: ['#######D######', '#............#', '#..#..B...#..#', '#.....#......#', '#..u......S..#', '#....#..c....#', '#pq.......#.R#', '##############'],
        slots: [[6, 1, 'b'], [7, 1, 'c'], [8, 1, 's'], [7, 2, 'u']],
      },
    ],
  },
  // ----- END 28-3 Sliding Stone Puzzle -----
  //
  //
  //
  // ----- BEGIN 28-4 Camel Race (mode 'camelrace', js/levels/world28/camel-race.js) -----
  // 28-4 Camel Race (mode 'camelrace', versus, best of 5, scrolls sideways, Gavyn's pick: "race camels across the
  // desert and time your jumps over the dunes"). One course per round, built in the level file.
  { name: 'Camel Race', world: 27, kind: 'versus', mode: 'camelrace', ownStep: true,
    match: { bestOf: 5, roundTime: 75 },
    act: { label: 'dash' },
    legend: {
      pip: '<kbd>W</kbd> jump, <kbd>S</kbd> drop',
      bo: '<kbd>↑</kbd> jump, <kbd>↓</kbd> drop',
      pad: 'Ⓐ or ▲ jumps, ▼ drops,',
    },
    tip: 'Your camel runs by itself. Jump from the top of a dune and land on the far side for a Perfect landing! The action eats a date for a dash.',
    switches: {}, signs: [],
    map: W28_SPAWN_MAP,
  },
  // ----- END 28-4 Camel Race -----
);
// the tomb chambers' engine maps come from their layouts
for (const l of LEVELS) if (l.mode === 'tombtorch') for (const r of l.rooms) r.map = ttSplit(r.rows);
