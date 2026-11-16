/* Pip & Bo - World 27 Robot Factory: the world entry and its four level defs. */
'use strict';

/* World 27 is added from here (not in the WORLDS literal and LEVELS list of level-list.js), like Worlds 24 and 25, so
   it never conflicts with World 26 Circus Big Top, built at the same time. World index 26. This file loads after the
   World 27 level files (and after World 25 and 26), so its levels land in LEVELS after 26-4.
   Robot Factory: a bright, busy robot factory (steel halls, conveyor belts, cranes, warning stripes, friendly helper
   robots). Nothing scary, nobody gets hurt: bumps are "Boing!"s, "Clonk!"s and "Bonk!"s. Gavyn picked the theme and these
   four levels from ten ideas (Nov 2026); he skipped Battery Relay, Rocket Boot Test, Circuit Board Maze, Scrap Chute
   Sort, Drone Race and Spare Parts Grab.
   Each level's def sits between its own BEGIN/END lines. */
WORLDS[26] = { name: 'Robot Factory', blurb: 'Pilot a giant mech, ride the runaway assembly line, build paths with a magnet crane and win the Robot Rumble!',
  theme: { skyTop: '#4b5d86', skyBot: '#c4d0ea', hillFar: '#6f86b6', hillNear: '#56607e', sun: 'rgba(255, 220, 140, 0.9)', sunGlow: 'rgba(255, 200, 120, 0.35)',
    stone: '#6a7296', stoneLight: '#8a96b4', stoneEdge: '#3c4468', grass: '#ffc53d', grassDark: '#b9850f', plank: '#9aa8c8', plankDark: '#5d6a8e', rope: '#c4cee6', ropeDark: '#4a5270' } };

const W27_MAP = [...Array(15).fill('.'.repeat(32)), '..1.2' + '.'.repeat(27), '.'.repeat(32), '.'.repeat(32)];
LEVELS.push(
  // ----- BEGIN 27-1 Mech Suit Duo (mode 'mechduo', js/levels/world27/mech-suit-duo.js) -----
  // 27-1 Mech Suit Duo (team, Gavyn's pick): both drive one big mech through four factory zones. The legs pilot walks,
  // jumps and ducks; the arms pilot raises and lowers the arm, punches walls at their glowing spot, grabs ledges and
  // holds the arm up to block falling crates. They swap every zone; Pip works the legs first.
  { name: 'Mech Suit Duo', world: 26, kind: 'team', mode: 'mechduo', ownStep: true, ownHUD: true, noFalls: true, roomWord: 'Zone',
    jobs: {
      legs: { title: 'Legs', act: 'jump', legend: '<kbd>A</kbd><kbd>D</kbd> walk <kbd>W</kbd> jump <kbd>S</kbd> hold to duck' },
      arms: { title: 'Arms', act: 'punch', legend: '<kbd>W</kbd><kbd>S</kbd> arm up, down',
        howTo: ['Punch the glowing spot. With the arm high, punch at a ledge to grab it.'] },
    },
    jobOf: 'legs', jobSwap: 'You swap jobs every zone.',
    tip: 'Legs walk, jump and duck. Arms move the big arm, punch glowing spots, grab ledges and block crates!',
    act: { label: 'punch', labels: ['jump', 'punch'] },
    map: W27_MAP,
    rooms: [
      {
        title: 'Bolt Alley', legs: 0, look: 'bolts', act: { label: 'punch', labels: ['jump', 'punch'] },
        tip: 'Pip walks the legs, Bo works the arms. Jump the gaps, punch the wall at its glowing spot!',
        course: [['sign', '{L}: walk and jump. {A}: move the arm and punch!'], ['f', 420], ['bolts', 4, 60], ['f', 220], ['g', 104], ['f', 260],
          ['bolts', 3, 150], ['f', 260], ['sign', 'Punch the glowing spot!'], ['f', 120], ['wall', 1, 3], ['f', 380], ['bolts', 3, 70], ['f', 120],
          ['up', 80, 300], ['bolts', 4, 60], ['f', 120], ['sign', 'Too tall! Arm up high, then grab'], ['f', 60], ['up', 160, 420],
          ['bolts', 4, 70], ['f', 200], ['g', 100], ['f', 240], ['bolts', 3, 60], ['f', 200], ['end']],
      },
      {
        title: 'Crate Drop', legs: 1, look: 'paint', act: { label: 'punch', labels: ['punch', 'jump'] },
        tip: 'Swap! Bo walks, Pip works the arms. Hold the arm up high to bonk the falling crates away!',
        course: [['sign', 'Swap! {L} walks, {A} works the arms'], ['f', 360], ['sign', 'Crates! Arm up high to block them'], ['crates', 700, 1.6], ['bolts', 6, 60], ['f', 700],
          ['f', 160], ['wall', 2, 3], ['f', 300], ['sign', 'Low beam! Duck!'], ['f', 100], ['beam', 300], ['bolts', 4, 40], ['f', 400], ['f', 140],
          ['g', 100], ['f', 220], ['crates', 520, 1.5], ['bolts', 5, 60], ['f', 520], ['f', 120], ['wall', 0, 3], ['f', 300], ['bolts', 3, 140], ['f', 200], ['end']],
      },
      {
        title: 'Steam Pipes', legs: 0, look: 'spring', act: { label: 'punch', labels: ['jump', 'punch'] },
        tip: 'Pip walks again! Duck under the steam pipes, grab the tall ledge, mind the crates.',
        course: [['f', 320], ['beam', 260], ['bolts', 4, 40], ['f', 380], ['f', 100], ['up', 90, 260], ['bolts', 3, 60], ['down', 90, 160], ['g', 110], ['f', 260],
          ['wall', 1, 3], ['f', 260], ['f', 60], ['up', 180, 300], ['beam', 220], ['bolts', 3, 40], ['f', 420], ['g', 100], ['f', 240],
          ['crates', 440, 1.5], ['bolts', 5, 60], ['f', 440], ['f', 100], ['wall', 2, 3], ['f', 260], ['end']],
      },
      {
        title: 'Big Bay Door', legs: 1, look: 'test', act: { label: 'punch', labels: ['punch', 'jump'] },
        tip: 'Last zone! Bo walks, Pip works the arms. Smash the triple wall: low, middle, then high!',
        course: [['f', 300], ['wall', 0, 3], ['f', 220], ['g', 100], ['f', 220], ['crates', 640, 1.4], ['bolts', 5, 60], ['f', 260], ['beam', 200], ['f', 380],
          ['f', 100], ['up', 170, 320], ['bolts', 4, 60], ['f', 160], ['wall', 2, 3], ['f', 240], ['g', 110], ['f', 260], ['sign', 'The triple wall: low, middle, high!'],
          ['f', 120], ['wall', 0, 2], ['f', 90], ['wall', 1, 2], ['f', 90], ['wall', 2, 2], ['f', 340], ['bolts', 4, 60], ['f', 200], ['end']],
      },
    ],
  },
  // ----- END 27-1 Mech Suit Duo -----
  //
  //
  //
  // ----- BEGIN 27-2 Runaway Assembly Line (mode 'runbelt', js/levels/world27/runaway-assembly-line.js) -----
  // 27-2 Runaway Assembly Line (team, Gavyn's pick): the screen scrolls with a conveyor belt that keeps speeding up. The
  // runner rides the belt, jumps broken pieces and dodges stampers; the fixer runs the catwalk above and hits the switch
  // box before each broken piece to fix it (wide ones stop the line until fixed). They swap every stretch; Pip runs first.
  { name: 'Runaway Assembly Line', world: 26, kind: 'team', mode: 'runbelt', ownStep: true, ownHUD: true, noFalls: true, noTime: true, roomWord: 'Stretch',
    jobs: {
      runner: { title: 'Runner', act: 'jump', legend: '<kbd>A</kbd><kbd>D</kbd> run <kbd>W</kbd> jump' },
      fixer: { title: 'Fixer', act: 'fix', legend: '<kbd>A</kbd><kbd>D</kbd> run <kbd>W</kbd> jump',
        howTo: ['Press fix at a switch box to mend the belt ahead.'] },
    },
    jobOf: 'runner', jobSwap: 'You swap jobs every stretch.',
    tip: 'Runner: ride the belt, jump the gaps, dodge the stampers. Fixer: run the catwalk and hit the switch boxes!',
    act: { label: 'fix', labels: ['jump', 'fix'] },
    map: W27_MAP,
    rooms: [
      {
        title: 'Bolt Line', runner: 0, look: 'bolts', speed: [80, 115], act: { label: 'fix', labels: ['jump', 'fix'] },
        tip: 'Pip rides the belt and jumps the gaps. Bo runs the catwalk and hits each switch box to fix the belt!',
        news: 'The belt is running! Red lights mean a WIDE gap: fix it!',
        course: [['gears', 4], ['belt', 900], ['gap', 70], ['gears', 3], ['belt', 520], ['stamp', 2.6, 0], ['belt', 520], ['gap', 170], ['gears', 5],
          ['belt', 560], ['gap', 80], ['belt', 420], ['stamp', 2.4, 0.9], ['belt', 380], ['gears', 4], ['belt', 420], ['gap', 160], ['belt', 500]],
        walk: [1000, -70, ['gears', 3], 700, -80, 820, [380, -50], -60, 900, ['gears', 4], 700, -90, 1200],
      },
      {
        title: 'Paint Shop', runner: 1, look: 'paint', speed: [95, 130], act: { label: 'fix', labels: ['fix', 'jump'] },
        tip: 'Swap! Bo rides the belt, Pip fixes. Two stampers in a row: wait for them to lift!',
        course: [['gears', 4], ['belt', 760], ['gap', 80], ['belt', 400], ['stamp', 2.4, 0], ['belt', 200], ['stamp', 2.4, 1.2], ['belt', 480], ['gap', 170], ['gears', 5],
          ['belt', 480], ['gap', 90], ['gears', 3], ['belt', 420], ['gap', 180], ['belt', 380], ['stamp', 2.2, 0.4], ['gears', 4], ['belt', 600]],
        walk: [900, -80, ['gears', 3], 600, [500, -60], -70, 700, -80, ['gears', 4], 800, -70, 1300],
      },
      {
        title: 'Spring Press', runner: 0, look: 'spring', speed: [105, 145], act: { label: 'fix', labels: ['jump', 'fix'] },
        tip: 'Pip rides again and the belt is faster! Bo, keep ahead of the line on the catwalk.',
        course: [['gears', 4], ['belt', 700], ['gap', 170], ['belt', 420], ['stamp', 2.2, 0.3], ['gears', 3], ['belt', 420], ['gap', 80], ['belt', 360], ['gap', 90],
          ['gears', 4], ['belt', 460], ['stamp', 2.0, 0.7], ['belt', 400], ['gap', 180], ['gears', 5], ['belt', 500], ['gap', 80], ['belt', 520]],
        walk: [800, -80, 600, [400, -60], -60, ['gears', 4], 700, -90, 600, -70, ['gears', 3], 1500],
      },
      {
        title: 'Final Inspection', runner: 1, look: 'test', speed: [120, 160], act: { label: 'fix', labels: ['fix', 'jump'] },
        tip: 'The fastest belt of all! Bo rides, Pip fixes. Get every robot to the packing bay!',
        course: [['gears', 4], ['belt', 700], ['gap', 90], ['belt', 380], ['stamp', 2.2, 0], ['belt', 380], ['gap', 180], ['gears', 4], ['belt', 460],
          ['stamp', 2.0, 0.6], ['belt', 200], ['stamp', 2.0, 1.4], ['belt', 420], ['gap', 80], ['gears', 3], ['belt', 380], ['gap', 170], ['belt', 400],
          ['gap', 90], ['gears', 5], ['belt', 700]],
        walk: [800, -80, ['gears', 3], 700, [450, -60], -70, 700, -80, ['gears', 4], 800, -70, 600, -70, 1400],
      },
    ],
  },
  // ----- END 27-2 Runaway Assembly Line -----
  //
  //
  //
  // ----- BEGIN 27-3 Magnet Crane Crew (mode 'magcrane', js/levels/world27/magnet-crane-crew.js) -----
  // 27-3 Magnet Crane Crew (team, Gavyn's pick): one screen per bay. The operator drives a magnet crane along the rail
  // (◀ ▶, cable ▲ ▼, the action calls a fresh crate down the chute); the rider stands on the magnet and grabs and drops
  // metal crates (the action) to fill pits and build steps up to the exit. They swap every bay; Pip runs the crane first.
  { name: 'Magnet Crane Crew', world: 26, kind: 'team', mode: 'magcrane', ownStep: true, ownHUD: true, noFalls: true, roomWord: 'Bay',
    jobs: {
      operator: { title: 'Crane', act: 'crate', legend: '<kbd>A</kbd><kbd>D</kbd> drive <kbd>W</kbd><kbd>S</kbd> cable up, down',
        howTo: ['Crate drops a fresh crate from the chute.'] },
      rider: { title: 'Magnet', act: 'grab', legend: '<kbd>A</kbd><kbd>D</kbd> walk <kbd>W</kbd> jump',
        howTo: ['Grab turns the magnet on a crate; grab again drops it.', 'Build a path, then walk it from START to the exit.'] },
    },
    jobOf: 'op', jobSwap: 'You swap jobs every bay.',
    tip: 'Crane: drive the magnet. Rider: grab crates, drop them to build a path, then walk it from START to the exit!',
    act: { label: 'grab', labels: ['crate', 'grab'] },
    map: W27_MAP,
    rooms: [
      {
        title: 'Pit Stop', op: 0, look: 'bolts', act: { label: 'grab', labels: ['crate', 'grab'] },
        tip: 'Pip drives the crane, Bo rides the magnet. Grab crates and drop two in the pit to make a stepping stone!',
        news: 'Lower the magnet onto a crate, then grab it!',
        ground: '0000000ppp000011', crates: [[3, 1], [4, 2], [12, 1]], exit: 15, start: 1, magX: 1, plan: [[8, 0]],
      },
      {
        title: 'Stair Climb', op: 1, look: 'paint', act: { label: 'grab', labels: ['grab', 'crate'] },
        tip: 'Swap! Bo drives, Pip grabs. Build stairs up to the high exit: one crate, then two!',
        ground: '0000000000000333', crates: [[3, 2], [6, 2]], exit: 15, start: 1, magX: 1, plan: [[12, 2], [11, 1]],
      },
      {
        title: 'Double Pit', op: 0, look: 'spring', act: { label: 'grab', labels: ['crate', 'grab'] },
        tip: 'Pip drives again! Two pits to cross: a stepping stone in each one.',
        ground: '0000ppp000ppp011', crates: [[7, 2], [8, 2], [2, 1]], exit: 15, start: 1, magX: 1, plan: [[5, 0], [11, 0]],
      },
      {
        title: 'Tower Top', op: 1, look: 'test', act: { label: 'grab', labels: ['grab', 'crate'] },
        tip: 'The last bay! Bo drives, Pip grabs. Fill the pit, build tall stairs, and call new crates from the chute!',
        news: 'Not enough crates? The crane\'s action drops a new one from the chute',
        ground: '00000ppp00000444', crates: [[2, 2], [3, 2], [9, 2]], exit: 15, start: 1, magX: 1, plan: [[6, 0], [12, 3], [11, 2], [10, 1]],
      },
    ],
  },
  // ----- END 27-3 Magnet Crane Crew -----
  //
  //
  //
  // ----- BEGIN 27-4 Robot Rumble (mode 'robotrumble', js/levels/world27/robot-rumble.js) -----
  // 27-4 Robot Rumble (versus, best of 5, Gavyn's pick: "grab parts off a belt to build your own robot fast, then the
  // robots wrestle to push each other off the platform"). Each round: a build (walk into parts, carry them to your own
  // pad; legs, body, arms, head) then a rumble on a platform over a foam pit (hold the action to charge a shove, ▼
  // braces). The map is the build floor and the belt ('=' row 12, cols 10-21); the mode draws everything else.
  { name: 'Robot Rumble', world: 26, kind: 'versus', mode: 'robotrumble', ownStep: true, ownHUD: true, match: { bestOf: 5 },
    act: { label: 'shove' }, stomp: false,
    legend: { down: 'drop a part, brace', padDown: 'down drops a part or braces' },
    howTo: ['Build: press down to put a part down. Rumble: hold down to brace.'],
    tip: 'Build: grab parts off the belt, carry them to your pad. Rumble: hold the action to charge, let go to shove them off!',
    switches: {}, signs: [],
    map: [
      ...Array(12).fill('.'.repeat(32)),
      '..........' + '='.repeat(12) + '..........',
      '.'.repeat(32),
      '...1........................2...',
      '#'.repeat(32),
      '#'.repeat(32),
      '#'.repeat(32),
    ],
  },
  // ----- END 27-4 Robot Rumble -----
);
