/* Pip & Bo - World 24 Toy Box Town: the world entry and its four level defs. */
'use strict';

/* World 24 is added from here (not in the WORLDS literal and LEVELS list of level-list.js), like World 25, so it never
   conflicts with World 23 Barnyard Fair, which is built at the same time. World index 23. This file loads after the
   four World 24 level files and before World 25's, so the levels land in LEVELS before 25-1.
   Toy Box Town: Pip and Bo are toy-sized in a kid's bedroom (a cosy carpeted floor, a bed, a tall bookshelf, a toy box,
   a night light). Nothing scary, nobody gets hurt. Gavyn picked the theme and these four levels from ten ideas
   (Nov 2026); he skipped RC Car Chase, Teddy Zipline, Lights Out Tidy-Up, Marble Run Maker, Toy Soldier March and
   Slot Car Grand Prix.
   Each level's def sits between its own BEGIN/END lines. */
// a kid's bedroom by day: soft blue wallpaper fading to a warm lamp glow; a cosy carpet floor, wooden shelves, toy-block colours
WORLDS[23] = { name: 'Toy Box Town', blurb: 'Ride a wind-up train, pop out of a jack-in-the-box, flop down the slinky stairs and win the pillow fort battle!',
  theme: { skyTop: '#9fc4f0', skyBot: '#fff0d8', hillFar: '#e8c6e0', hillNear: '#d6a9cf', sun: 'rgba(255, 240, 200, 0.95)', sunGlow: 'rgba(255, 220, 160, 0.4)',
    stone: '#c98a52', stoneLight: '#dca06a', stoneEdge: '#8e5a2e', grass: '#7cc4e8', grassDark: '#4f93c0', plank: '#e8574a', plankDark: '#a33328', rope: '#f6d65a', ropeDark: '#a8862a' } };

const W24_STUB_MAP = [...Array(15).fill('.'.repeat(32)), '..1.2' + '.'.repeat(27), '#'.repeat(32), '#'.repeat(32)];
LEVELS.push(
  // ----- BEGIN 24-1 Wind-Up Train Ride (mode 'windtrain', js/levels/world24/wind-up-train-ride.js) -----
  // 24-1 Wind-Up Train Ride (mode 'windtrain', team, Gavyn's pick: "one cranks the key, the other switches the tracks
  // across the floor"). The winder rides the engine and winds its key with the action on the beat (▼ brakes); the
  // switcher runs ahead and flips levers, kicks blocks off the rails, lowers the drawbridge book, helps toy passengers on
  // and rings the bell at the end of each stretch, then they swap. The map is only the two spawns; the mode builds each
  // stretch from its course (tokens: see the top of the level file).
  { name: 'Wind-Up Train Ride', world: 23, kind: 'team', mode: 'windtrain', ownStep: true, ownHUD: true, noFalls: true, roomWord: 'Stretch',
    jobs: {
      winder: { title: 'Winder', act: 'wind', legend: '<kbd>F</kbd> wind on the gold ring <kbd>S</kbd> hold to brake',
        howTo: ['Wind with steady presses, not mashing.'] },
      switcher: { title: 'Switcher', act: 'switch', legend: '<kbd>A</kbd><kbd>D</kbd> run <kbd>W</kbd> jump <kbd>S</kbd> drop down',
        howTo: ['Switch flips levers and kicks blocks off the track.'] },
    },
    jobOf: 'wind', jobSwap: 'You swap jobs every stretch.',
    tip: 'The winder winds the train, the switcher runs ahead to flip levers and kick blocks!',
    act: { label: 'switch', labels: ['wind', 'switch'] },
    map: [...Array(15).fill('.'.repeat(32)), '..1.2' + '.'.repeat(27), '.'.repeat(32), '.'.repeat(32)],
    rooms: [
      {
        title: 'Rug Run', wind: 0, look: 'rug', act: { label: 'switch', labels: ['wind', 'switch'] },
        tip: 'Pip winds the key on the beat, Bo runs ahead: flip the lever away from the dead end, kick the block off!',
        course: ['f450', 'S:{W}: wind the key on the gold ring!', 'f100', '*:40:5:60', 'f400', 'S:{R}: run ahead and do the track jobs!', 'f250',
          '*:150:3:60', 'f300', 'b', 'f350', '*:40:4:60', 'f250', 'S:Flip the lever away from the dead end', 'f200', 'W:780:up', 'f250',
          '*:150:2:70', 'f200', 'P:Teddy', 'f300', '*:40:4:60', 'f250', 'O:ball', 'f300', 'd', 'f300', '*:150:3:60', 'f200',
          'S:Bonus stars up top!', 'f100', 'W:780:both:up', 'f300', '*:40:4:60', 'f250', 'E'],
      },
      {
        title: 'Under the Bed', wind: 1, look: 'bed', act: { label: 'switch', labels: ['switch', 'wind'] },
        tip: 'Swap! Bo winds, Pip switches. Shoo the dust bunnies, mind the yo-yo, and pick up Duck!',
        course: ['f400', 'S:Swap! {W} winds, {R} switches', 'f100', '*:40:4:60', 'f250', 'Z:700', 'S:Dust bunnies! Jump over them', 'f400', 'u',
          'f400', '*:150:3:60', 'f250', 'K', 'f300', 'O:yoyo', 'f300', '*:40:4:60', 'f200', 'W:780:low', 'f300', 'P:Duck', 'f300',
          'Z:500', 'f250', '*:150:3:60', 'f300', 'u', 'f300', 'd', 'f300', '*:40:4:60', 'f250', 'E'],
      },
      {
        title: 'Bookshelf Bridge', wind: 0, look: 'shelf', act: { label: 'switch', labels: ['wind', 'switch'] },
        tip: 'Pip winds again! Bo jumps the gap and pulls the bookmark to lower the drawbridge book. Wait for the metronome!',
        course: ['f400', 'S:Up on the bookshelf!', 'f52', 'r220:70', '*:40:4:60', 'f300', 'r220:0', 'f250', '*:150:3:60', 'f200', 'b', 'f300',
          'S:Jump the gap, pull the bookmark', 'f200', 'D:130', 'f300', '*:40:4:60', 'f200', 'O:metro', 'f300', 'W:780:both:low', 'f300',
          'P:Robot', 'f300', 'r200:60', '*:40:3:60', 'f240', 'r200:0', 'f200', 'd', 'f300', '*:40:4:60', 'f250', 'E'],
      },
      {
        title: 'Toy Box Station', wind: 1, look: 'box', finale: true, act: { label: 'switch', labels: ['switch', 'wind'] },
        tip: 'Bo winds, Pip switches, all the way to the toy box! Stop at the station and ring the bell.',
        course: ['f400', 'S:Last stretch to the toy box!', 'f100', '*:40:4:60', 'f250', 'b', 'f300', 'W:760:low', 'f250', '*:150:3:60', 'f200',
          'O:ball', 'f300', 'Z:500', 'f250', 'd', 'f300', '*:40:4:60', 'f200', 'P:Bunny', 'f300', 'W:760:up', 'f300', '*:40:4:60', 'f250',
          'b', 'f300', '*:150:3:60', 'f250', 'E'],
      },
    ],
  },
  // ----- END 24-1 Wind-Up Train Ride -----
  //
  //
  //
  // ----- BEGIN 24-2 Jack-in-the-Box Launch (mode 'jackbox', js/levels/world24/jack-in-the-box-launch.js) -----
  // 24-2 Jack-in-the-Box Launch (mode 'jackbox', team, Gavyn's pick): side-on, scrolls UP a giant bookshelf. One cranks
  // the jack-in-the-box (the action plays the next note of a music-box tune, on the beat for more power; ◀ ▶ tilt the
  // box), the other rides the spring, pops out on the last note, steers ◀ ▶ (one ▲ air hop) to the next shelf and
  // collects stars. Then the jumper drops a yo-yo, the cranker hooks the box and hops in, the jumper hauls it up, and
  // they swap. 4 shelves of 2 launches; Pip jumps first. A miss is a soft "Boing!" onto a pillow and back into the box.
  // The map is only the two spawns; the mode builds each shelf from its room def (see the top of the level file).
  // y is world px, down positive: the carpet is y 0 and higher shelves are negative.
  { name: 'Jack-in-the-Box Launch', world: 23, kind: 'team', mode: 'jackbox', ownStep: true, ownHUD: true, noFalls: true, roomWord: 'Shelf',
    jobs: {
      cranker: { title: 'Cranker', act: 'crank', legend: '<kbd>F</kbd> crank on the beat <kbd>A</kbd><kbd>D</kbd> tilt the box',
        howTo: ['One crank per beat: mashing does nothing.', 'At the top, hook the yo-yo string and hop in.'] },
      jumper: { title: 'Jumper', act: 'haul', legend: '<kbd>S</kbd> hold to squish <kbd>A</kbd><kbd>D</kbd> steer <kbd>W</kbd> air hop',
        howTo: ['On the shelf, drop the yo-yo and haul the box up.'] },
    },
    jobSwap: 'You swap jobs every launch.',
    tip: 'Crank on the beat to pop your partner up the bookshelf! Steer to the shelf, yo-yo the box up, then swap.',
    act: { label: 'crank', labels: ['haul', 'crank'] },
    map: [...Array(15).fill('.'.repeat(32)), '..1.2' + '.'.repeat(27), '.'.repeat(32), '.'.repeat(32)],
    rooms: [
      {
        title: 'Bottom Shelf', look: 'books', tune: [0, 4, 7, 9, 7, 4, 5, 12], act: { label: 'crank', labels: ['haul', 'crank'] },
        tip: 'Bo cranks first and Pip pops up to the shelf! Steer, drop the yo-yo, haul the box up, then swap jobs.',
        ledges: [[-100, 1060, 0, 'carpet'], [470, 900, -270], [60, 430, -560]],
        launches: [{ from: 0, to: 1, box: 300, crane: 490, hang: 440, next: 560 }, { from: 1, to: 2, box: 560, crane: 412, hang: 462, next: 330 }],
        stars: [[363, -250, 0], [394, -431, 0], [456, -500, 0], [515, -442, 0], [590, -300, 0],
          [520, -510, 1], [465, -701, 1], [408, -770, 1], [347, -718, 1], [374, -586, 1]],
        things: [['ribbon', 1, 500, -700, -480]],
        deco: [['books', 640, 890, 1], ['teddy', 110, 2], ['books', 150, 250, 2]],
      },
      {
        title: 'Toy Shelf', look: 'toys', tune: [7, 9, 7, 4, 2, 4, 7, 9, 11, 12], act: { label: 'crank', labels: ['haul', 'crank'] },
        tip: 'Mind the zooming toy car and the desk fan! Crank on the beat for a big pop.',
        ledges: [[60, 430, -560], [560, 920, -860], [40, 420, -1170]],
        launches: [{ from: 0, to: 1, box: 330, crane: 580, hang: 536, next: 660 }, { from: 1, to: 2, box: 660, crane: 400, hang: 446, next: 300 }],
        stars: [[389, -800, 0], [424, -991, 0], [482, -1060, 0], [542, -1008, 0], [608, -883, 0],
          [600, -1100, 1], [521, -1284, 1], [430, -1360, 1], [341, -1314, 1], [389, -1197, 1]],
        things: [['car', 0, -730, 380, 760, 230], ['fan', 1, 70, -1000, 1, -1090, -950, 40, 900]],
        deco: [['books', 70, 240, 0], ['blocks', 800, 1], ['teddy', 100, 2], ['wallshelf', 30, 120, -1000]],
      },
      {
        title: 'Night Light Shelf', look: 'night', tune: [12, 11, 7, 9, 7, 4, 5, 4, 2, 7], act: { label: 'crank', labels: ['haul', 'crank'] },
        tip: 'Shh, the cat is sleeping! Dodge the swinging mobile and the swishy tail.',
        ledges: [[40, 420, -1170], [520, 930, -1490], [50, 470, -1820]],
        launches: [{ from: 0, to: 1, box: 300, crane: 540, hang: 496, next: 630 }, { from: 1, to: 2, box: 630, crane: 450, hang: 496, next: 330 }],
        stars: [[359, -1410, 0], [391, -1594, 0], [449, -1668, 0], [506, -1629, 0], [566, -1514, 0],
          [574, -1719, 1], [538, -1914, 1], [482, -1990, 1], [426, -1955, 1], [367, -1840, 1]],
        things: [['mobile', 0, 470, -1660, 120, 0.55, 3.4], ['tail', 1, 700, -1690, -1, 120]],
        deco: [['books', 60, 200, 0], ['nightlight', 860, 1], ['wallshelf', 690, 880, -1690], ['plant', 100, 2]],
      },
      {
        title: 'Top of the Bookshelf', look: 'top', tune: [0, 7, 4, 12, 9, 7, 5, 9, 12, 14, 16, 19], act: { label: 'crank', labels: ['haul', 'crank'] },
        tip: 'The last climb! Fan, ribbon, car and mobile: then the trophy star at the very top.',
        ledges: [[50, 470, -1820], [560, 930, -2160], [120, 600, -2510, 'top']],
        launches: [{ from: 0, to: 1, box: 330, crane: 580, hang: 536, next: 680 }, { from: 1, to: 2, box: 680, crane: 580, hang: 624, next: 470 }],
        stars: [[385, -2049, 0], [464, -2237, 0], [550, -2315, 0], [639, -2285, 0], [584, -2181, 0],
          [643, -2389, 1], [636, -2577, 1], [599, -2663, 1], [562, -2560, 1], [515, -2540, 1]],
        things: [['fan', 0, 905, -2010, -1, -2090, -1960, 260, 910], ['ribbon', 0, 460, -2140, -1960], ['car', 1, -2350, 330, 820, 260], ['mobile', 1, 420, -2700, 130, 0.5, 3.0]],
        deco: [['books', 770, 920, 1], ['trophy', 220, 2], ['wallshelf', 860, 940, -2010], ['books', 60, 230, 0]],
      },
    ],
  },
  // ----- END 24-2 Jack-in-the-Box Launch -----
  //
  //
  //
  // ----- BEGIN 24-3 Slinky Stairs (mode 'slinky', js/levels/world24/slinky-stairs.js) -----
  // 24-3 Slinky Stairs (mode 'slinky', team, Gavyn's pick: "ride slinkies down a tall shelf. One sets the flip timing,
  // the other steers to land on the next step and not off the edge"). Side-on, scrolls DOWN. Both ride a rainbow
  // slinky: the flipper holds the action to stretch (the flop meter swings) and lets go in the green band to flop to
  // the next step; the steerer points it ◀ ▶ (a flop always goes the way it points), leans it in the air for stars, and
  // presses ▼ as it lands ("Perfect!", and no wobble on tiny or edge landings, no sliding on shiny lids). A miss is a
  // soft "Whoa!" back up to the last step. Swap jobs every flight; Pip flips first. The map is only the two spawns; the
  // mode builds each flight from its course (tokens: see the top of the level file). y is world px, down positive.
  { name: 'Slinky Stairs', world: 23, kind: 'team', mode: 'slinky', ownStep: true, ownHUD: true, noFalls: true, roomWord: 'Flight',
    jobs: {
      flipper: { title: 'Flipper', act: 'flop', legend: '<kbd>F</kbd> hold, let go to flop',
        howTo: ['Let go in the green part of the meter.'] },
      steerer: { title: 'Steerer', act: 'stick', legend: '<kbd>A</kbd><kbd>D</kbd> point, lean in the air <kbd>S</kbd> stick the landing',
        howTo: ['Press down just as the slinky lands for a Perfect.'] },
    },
    jobOf: 'flip', jobSwap: 'You swap jobs every flight.',
    tip: 'The flipper flops the slinky down the stairs, the steerer points it and sticks each landing!',
    act: { label: 'flop', labels: ['flop', 'stick'] },
    map: [...Array(15).fill('.'.repeat(32)), '..1.2' + '.'.repeat(27), '.'.repeat(32), '.'.repeat(32)],
    rooms: [
      {
        title: 'Bookshelf Steps', flip: 0, look: 'books', act: { label: 'flop', labels: ['flop', 'stick'] },
        tip: 'Pip flips: hold the action, let go in the green! Bo steers: point ◀ ▶, lean in the air, ▼ as you land.',
        signs: [[230, 70, '{F}: hold the action, let go in the green!', 'F', '{F} (computer) lets go in the green'],
          [740, 180, '{R}: point ◀ ▶ the way to go', 'R', '{R} (computer) points the way'],
          [700, 560, 'Springy step: a big boing!'], [790, 860, '{R}: ▼ as you land on the tiny dice', 'R', '{R} (computer) sticks the tiny dice']],
        course: ['start 470 160', 'book 220 140', 'book -300 130', 'book -210 120', 'spring 210 150', 'book 380 110 170 bonus=1 bx=-40',
          'tiny -230 140', 'book -270 120', 'book 240 140', 'book 260 120 bonus=1 bx=40', 'book -290 140', 'tiny -250 120', 'book 260 140',
          'book 250 130', 'tiny -260 140', 'book -230 130', 'goal 330 150 440'],
      },
      {
        title: 'Toy Block Tower', flip: 1, look: 'blocks', act: { label: 'stick', labels: ['stick', 'flop'] },
        tip: 'Swap! Bo flips, Pip steers. Shiny lids slide (hold ▼), the toy truck moves, wait for the marble to roll by!',
        signs: [[620, 70, 'Swap! {F} flips, {R} steers'], [230, 470, 'Shiny lid! Hold ▼ or slide', 'R', 'Shiny lid! {R} (computer) holds ▼'],
          [800, 760, 'A toy truck: the green moves with it'], [760, 1080, 'Two ways: pick one with ◀ ▶', 'R', 'Two ways: {R} (computer) picks one']],
        course: ['start 300 160', 'block 260 140', 'block 250 130', 'slip -320 130 190', 'block -280 140', 'car 260 150 130 ax=90 per=5',
          'block 280 130', 'marble -320 140 190 per=3.2',
          ['split', ['block -280 130 way=stars stars=3', 'tiny 200 140 stars=3 bonus=1 bx=40'], ['block 330 140 way=safe stars=1']],
          'block -220 290', 'block -330 140', 'car 280 140 140 ax=70 per=4.4', 'slip 260 140 170',
          'block -300 140', 'tiny -240 130', 'goal 330 160 400'],
      },
      {
        title: 'Pillow Pile', flip: 0, look: 'pillows', act: { label: 'flop', labels: ['flop', 'stick'] },
        tip: 'Pip flips again! Squishy pillows sink, so flop on quickly. The little lift goes up and down.',
        signs: [[240, 80, 'Squishy pillows sink: keep flopping!'], [800, 560, 'A lift! Let go when the green lines up', 'F', 'A lift! {F} (computer) waits for the green']],
        course: ['start 640 160', 'pillow -260 140', 'pillow -200 130', 'spring 230 150', 'pillow 400 100 180 bonus=1 bx=-45',
          'lift -300 150 130 ay=50 per=4', 'pillow -290 140', 'tiny 250 140',
          ['split', ['pillow -270 140 way=stars stars=3', 'book 220 140 stars=3 bonus=1 bx=-40'], ['pillow 300 150 way=safe stars=1']],
          'pillow -170 300', 'lift -320 150 130 ay=60 per=4.6', 'spring 240 140', 'book 300 110',
          'pillow -280 140', 'tiny -260 130', 'goal 320 160 400'],
      },
      {
        title: 'Down to the Rug', flip: 1, look: 'rug', finale: true, act: { label: 'stick', labels: ['stick', 'flop'] },
        tip: 'Bo flips, Pip steers, all the way down to the rug and into the toy box!',
        signs: [[680, 80, 'Last flight: down to the toy box!']],
        course: ['start 300 160', 'book 270 140', 'slip 250 130 180', 'block -300 150', 'marble -290 130 190 per=2.8',
          'car 250 140 140 ax=100 per=4.6', 'tiny 270 130', 'pillow -300 140', 'spring 280 180', 'block -420 150 stars=3 bonus=1 bx=50',
          ['split', ['book -200 150 way=safe stars=1'], ['tiny 300 140 way=stars stars=3 bonus=1 bx=-40']],
          'lift -200 240 130 ay=40 per=4.2', 'block -250 140', 'slip 300 140 170',
          'marble 280 140 186 per=3', 'tiny -250 130', 'goal -200 170 380'],
      },
    ],
  },
  // ----- END 24-3 Slinky Stairs -----
  //
  //
  //
  // ----- BEGIN 24-4 Pillow Fort Battle (mode 'pillowfort', js/levels/world24/pillow-fort-battle.js) -----
  // 24-4 Pillow Fort Battle (mode 'pillowfort', versus, best of 5, Gavyn's pick: "build up your fort and toss plushies
  // to knock the other one down"). Pip's pillow fort is on the left, Bo's on the right, a teddy bear flag on each. The
  // toy box in the middle pops out the same toy to both sides: hold the action to aim a plushie (let go to toss),
  // press it at your fort to build with a pillow, ▼ drops. 5 wobbles or no blocks under him and your teddy topples:
  // you lose the round; at the bell the bigger fort wins. The map is the room's walls, floor and spawns; the mode puts
  // the fort blocks in as 'P' tiles every round (MODES.pillowfort).
  { name: 'Pillow Fort Battle', world: 23, kind: 'versus', mode: 'pillowfort', match: { bestOf: 5, roundTime: 75 },
    act: { label: 'toss' }, stomp: false,
    legend: { down: 'drop', padDown: 'down drops' },
    tip: 'Hold the action to aim a plushie, let go to toss! Press it at your fort to build with a pillow. Topple their teddy!',
    switches: {}, signs: [],
    map: [
      ...Array(15).fill('#' + '.'.repeat(30) + '#'),
      '#........1............2........#',
      '#'.repeat(32),
      '#'.repeat(32),
    ],
  },
  // ----- END 24-4 Pillow Fort Battle -----
);
