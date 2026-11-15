/* Pip & Bo - Levels: the list of every level (maps, rules, hints) and the worlds they belong to. */
'use strict';

/* ---------- levels ----------
   #  stone            .  air             ^  spikes        =  jump-through plank
   1  Pip start        2  Bo start        E  exit door (2 wide, 2 tall, this is its bottom-left)
   a b c  buttons      k  key (unlocks the door)          F  checkpoint flag
   o  orange block: only Pip can stand on it   u  blue block: only Bo can stand on it
   *  crown spawn (sits on the right edge of its tile so it can center between columns)
   T  golf tee (the ball starts here)   H  golf cup (a one-tile pocket in the ground)   w  water   s  sand (stops a golf ball)
   J  bounce pad (straight up)   R / L  bounce pad (up and to the right / left)   X  bumper block (very bouncy)
   M  windmill (spinning sails, see the hole's `windmill` settings)   O-Q and U-V  portal pairs   @  boost ring (refills the ball's boost)
   Letters listed in `switches` are gates (solid until their button is held) or bridges (solid while held). */
const LEVELS = [
  {
    name: 'Hold the Door', world: 0, kind: 'team',
    medals: { bronze: 'Both reach the door', goals: [{ key: 'time', gold: 20, silver: 45 }, { key: 'falls', gold: 0, silver: 2, word: 'fall' }] },
    tip: 'One of you holds the button. The other walks through.',
    switches: { A: { plate: 'a', type: 'gate' }, X: { plate: 'b', type: 'bridge' } },
    signs: [
      { x: 195, y: 255, text: 'Stand on a button to open the gate' },
      { x: 640, y: 300, text: 'Buttons can build bridges too' },
    ],
    map: [
      '################################',
      '#...........#..................#',
      '#...........#..................#',
      '#...........#..................#',
      '#...........#..................#',
      '#...........#..................#',
      '#...........#..................#',
      '#...........#..................#',
      '#...........#..................#',
      '#...........#..................#',
      '#...........#..................#',
      '#...........#..................#',
      '#...........A..................#',
      '#...........A..................#',
      '#...........A..................#',
      '#..1.2..a...A.aFb..........b.E.#',
      '##################XXXXXXX#######',
      '##################^^^^^^^#######',
    ],
  },
  {
    name: 'Boost Me Up', world: 0, kind: 'team',
    medals: { bronze: 'Both reach the door', goals: [{ key: 'time', gold: 30, silver: 60 }, { key: 'falls', gold: 0, silver: 2, word: 'fall' }] },
    tip: 'Stand on each other to reach high places.',
    switches: { A: { plate: 'a', type: 'gate' }, X: { plate: 'b', type: 'bridge' } },
    signs: [
      { x: 190, y: 300, text: 'Hop on your partner’s head' },
      { x: 470, y: 250, text: 'Boost over, then open the gate' },
      { x: 640, y: 160, text: 'Ride a jump, then jump again at the top!' },
    ],
    map: [
      '################################',
      '#..............................#',
      '#..............................#',
      '#..............................#',
      '#..............................#',
      '#..............................#',
      '#..............................#',
      '#..............................#',
      '#..............................#',
      '#.........................b..E.#',
      '#........................#######',
      '#....k...................#######',
      '#######.......A..........#######',
      '#######.......A......XX..#######',
      '#######.......A#.........#######',
      '#######1.2....A#.a.......#######',
      '################################',
      '################################',
    ],
  },
  {
    name: 'Your Color, My Color', world: 0, kind: 'team',
    medals: { bronze: 'Both reach the door', goals: [{ key: 'time', gold: 30, silver: 60 }, { key: 'falls', gold: 0, silver: 2, word: 'fall' }] },
    tip: 'Orange blocks hold Pip. Blue blocks hold Bo. Give each other a ride.',
    switches: { A: { plate: 'a', type: 'gate' } },
    flagNeedsBoth: true,
    signs: [
      { x: 250, y: 290, text: 'Orange holds Pip. Blue holds Bo.' },
      { x: 250, y: 318, text: 'Bo: hop on Pip and ride along' },
      { x: 555, y: 298, text: 'Now Bo gives Pip a ride' },
      { x: 572, y: 405, text: 'Pip can slip through blue walls' },
    ],
    map: [
      '################################',
      '#..........................#...#',
      '#..........................#...#',
      '#..........................#...#',
      '#..........................#...#',
      '#..........................#...#',
      '#..........................#...#',
      '#..........................#...#',
      '#..........................#...#',
      '#..........................#...#',
      '#..........................#...#',
      '#.............uuuuuuuuu....#...#',
      '#..........................u...#',
      '#.....oooooooo.............u...#',
      '#......................u...u...#',
      '#.12.#..................F..AE.a#',
      '######.................#########',
      '######^^^^^^^^^^^^^^^^^#########',
    ],
  },
  {
    name: 'Rope, Chain & Bungee', world: 0, kind: 'team',
    medals: { bronze: 'Both reach the door', goals: [{ key: 'time', gold: 60, silver: 120 }, { key: 'falls', gold: 1, silver: 4, word: 'fall' }] },
    tip: 'You\u2019re tied together, and the cord keeps changing: a rope, a stiff chain, then a bouncy bungee.',
    rooms: [
      {
        title: 'Rope', cord: 'rope', tether: 120, switches: {},
        tip: 'A rope goes slack and swings. Fell off? Hold jump to climb back up.',
        signs: [
          { x: 480, y: 95, text: 'You\u2019re tied together. Jump together!' },
          { x: 480, y: 130, text: 'Fell off? Hold jump to climb up the rope' },
        ],
      map: [
        '################################',
        '#..............................#',
        '#..............................#',
        '#..............................#',
        '#..............................#',
        '#..............................#',
        '#..............................#',
        '#..............................#',
        '#..............................#',
        '#.1.2..........###....F......E.#',
        '#####...####...###...###...#####',
        '#####...####...###...###...#####',
        '#####...####...###...###...#####',
        '#####...####...###...###...#####',
        '#####...####...###...###...#####',
        '#####...####...###...###...#####',
        '#####...####...###...###...#####',
        '#####^^^####^^^###^^^###^^^#####',
      ],
      },
      {
        title: 'Chain', cord: 'chain', tether: 140, switches: {},
        tip: 'A chain is stiff. Hanging from it? Push toward your partner to climb up, or hold jump and push \u25c0 \u25b6 to swing around.',
        signs: [
          { x: 205, y: 205, text: 'Hold your partner out for the key' },
          { x: 205, y: 240, text: 'Push toward your partner to climb back up' },
          { x: 585, y: 120, text: 'Too tall? Swing over it!' },
        ],
      map: [
        '################################',
        '#..............................#',
        '#..............................#',
        '#..............................#',
        '#..............................#',
        '#..............................#',
        '#..............................#',
        '#..............................#',
        '#..................#...........#',
        '#..................#...........#',
        '#...k..............#...........#',
        '#.........1.2......#.......E...#',
        '#.......########################',
        '#.......########################',
        '#.......########################',
        '#.......########################',
        '#.......########################',
        '#^^^^^^^########################',
      ],
      },
      {
        title: 'Bungee', cord: 'bungee', tether: 110, switches: {},
        tip: 'A bungee is bouncy. While it\u2019s stretched, press jump to bounce higher.',
        signs: [
          { x: 300, y: 150, text: 'Drop in, grab the key, bounce back!' },
          { x: 470, y: 60, text: 'Jump at the bottom of a bounce to fly higher' },
        ],
      map: [
        '################################',
        '#..............................#',
        '#..............................#',
        '#..............................#',
        '#..........................E...#',
        '#....................###########',
        '#....................###########',
        '#....................###########',
        '#..1.2...............###########',
        '#########...#######..###########',
        '#########...#######..###########',
        '#########...#######..###########',
        '#########...#######..###########',
        '#########...#######..###########',
        '#########.k.#######..###########',
        '#########...#######..###########',
        '#########...#######..###########',
        '#########^^^#######^^###########',
      ],
      },
    ],
  },
  {
    name: 'Brick by Brick', world: 1, kind: 'team', build: { x0: 1, x1: 25, spawnCol: 12, goalX: 26 * 30 },
    medals: { bronze: 'Both climbs done', goals: [{ key: 'time', gold: 45, silver: 90 }, { key: 'squashes', gold: 0, silver: 2, word: 'squash' }] },
    tip: 'One of you drops blocks, the other climbs them to the flag. Then you swap!',
    switches: {},
    signs: [
      { x: 680, y: 165, text: 'Climb up to the flag!' },
    ],
    map: [
      '################################',
      '#..............................#',
      '#..............................#',
      '#..............................#',
      '#..............................#',
      '#...........................G..#',
      '#.........................######',
      '#.........................######',
      '#.........................######',
      '#.........................######',
      '#.........................######',
      '#.........................######',
      '#.........................######',
      '#.........................######',
      '#.........................######',
      '#..1.2....................######',
      '################################',
      '################################',
    ],
  },
  {
    name: 'Sky Tower', world: 1, kind: 'team', build: { x0: 12, x1: 19, spawnCol: 15, goalX: 21 * 30, tower: true, rounds: 4 },
    medals: { bronze: 'Every climb done', goals: [{ key: 'time', gold: 120, silver: 210 }, { key: 'squashes', gold: 0, silver: 3, word: 'squash', text: n => n === 0 ? 'Nobody squashed or trapped' : `${n} or fewer squashes or traps` }] },
    tip: 'Stack blocks up to the ledge. Careful: a falling block squashes your partner and knocks them down!',
    switches: {},
    signs: [
      { x: 150, y: 250, text: 'Build steps to the ledge!' },
      { x: 150, y: 280, text: 'You can jump 3 blocks high' },
      { x: 810, y: 250, text: 'Trapped? Jump into' },
      { x: 810, y: 280, text: 'a block twice to break it' },
    ],
    map: [
      '..........##....................',
      '..........##....................',
      '..........##....................',
      '..........##...........G........',
      '..........##........######......',
      '..........##........##..........',
      '..........##........##..........',
      '..........##........##..........',
      '..........##........##..........',
      '..........##........##..........',
      '..........##........##..........',
      '..........##........##..........',
      '..........##........##..........',
      '..........##........##..........',
      '..........##........##..........',
      '..........##.12.....##..........',
      '################################',
      '################################',
    ],
  },
  {
    name: 'Robo Pong', world: 1, kind: 'team', pong: true,
    medals: { bronze: 'Beat Robo', goals: [{ key: 'robo', gold: 3, silver: 5, word: 'point', text: n => `Robo scores ${n} or fewer`, gap: (v, n) => `${v - n} fewer point${v - n === 1 ? '' : 's'} for Robo` }] },
    tip: 'Pip guards the top half, Bo the bottom. First to 7 beats Robo!',
    switches: {},
    signs: [],
    map: [
      '################################',
      '################################',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '.12.............................',
      '################################',
    ],
  },
  {
    name: 'Crown Keep', world: 1, kind: 'versus', target: 15, timeLimit: 90,
    tip: 'Hold the crown for 15 seconds. Stomp on the holder to steal it!',
    switches: {},
    signs: [
      { x: 480, y: 110, text: 'Hold the crown 15 seconds. Stomp the holder to steal it!' },
    ],
    map: [
      '################################',
      '#..............................#',
      '#..............................#',
      '#..............................#',
      '#..............................#',
      '#..............................#',
      '#..............................#',
      '#....====..............====....#',
      '#..............................#',
      '#..............*...............#',
      '#...........========...........#',
      '#..............................#',
      '#..............................#',
      '#..======..............======..#',
      '#.............####.............#',
      '#.1...........####...........2.#',
      '################################',
      '################################',
    ],
  },
  {
    name: 'Tee for Two', world: 2, kind: 'team', golf: true,
    medals: { bronze: 'Sink both balls', goals: [{ key: 'overPar', gold: 0, silver: 2, text: n => n === 0 ? 'Par or better' : `${n} or fewer over par`, show: v => v === 0 ? 'par' : v > 0 ? v + ' over' : -v + ' under', gap: (v, n) => `${v - n} fewer stroke${v - n === 1 ? '' : 's'}` }] },
    tip: 'One of you golfs, the other IS the ball and can boost mid-flight. Fewest strokes wins!',
    switches: {},
    rooms: [
      {
        title: 'Pond Hop', par: 3,
        tip: 'Pip golfs and Bo is the ball. Bo: boost in mid-air to steer!',
        signs: [{ x: 250, y: 200, text: 'Over the wall, onto the green!' }],
        map: [
          '################################',
          '#..............................#',
          '#..............................#',
          '#..............................#',
          '#..............................#',
          '#..............................#',
          '#..............................#',
          '#..............................#',
          '#..............................#',
          '#..............................#',
          '#..........##..................#',
          '#..........##..................#',
          '#..........##..................#',
          '#..T.......##.....#####H###....#',
          '######.....##.....#########ssss#',
          '######wwwww##wwwww##############',
          '################################',
          '################################',
        ],
      },
      {
        title: 'Cave Run', par: 4,
        tip: 'Swap! Bo golfs and Pip is the ball. Through the cave, or over the top?',
        signs: [{ x: 480, y: 395, text: 'Ball: hold up to glide over the pit!' }, { x: 480, y: 120, text: 'Or go over the top?' }],
        map: [
          '################################',
          '#..............................#',
          '#..............................#',
          '#..............................#',
          '#..............................#',
          '#.......################.......#',
          '#.......################.......#',
          '#.......################.......#',
          '#.......################.......#',
          '#.......################.......#',
          '#.......################.......#',
          '#..............................#',
          '#........................###H#s#',
          '#........................#######',
          '#.T......................#######',
          '###############..###############',
          '###############^^###############',
          '################################',
        ],
      },
    ],
  },
  {
    name: 'Bounce House', world: 2, kind: 'team', golf: true,
    medals: { bronze: 'Sink both balls', goals: [{ key: 'overPar', gold: 0, silver: 2, text: n => n === 0 ? 'Par or better' : `${n} or fewer over par`, show: v => v === 0 ? 'par' : v > 0 ? v + ' over' : -v + ' under', gap: (v, n) => `${v - n} fewer stroke${v - n === 1 ? '' : 's'}` }] },
    tip: 'Pink pads bounce the ball. Red bumpers kick it back hard!',
    switches: {},
    rooms: [
      {
        title: 'Spring Step', par: 2,
        tip: 'Pip golfs, Bo is the ball. Roll it through the tunnel onto the springs!',
        signs: [{ x: 660, y: 140, text: 'Ball: steer it onto the green!' }],
        map: [
          '################################',
          '##########.....................#',
          '##########.....................#',
          '##########.....................#',
          '##########.....................#',
          '##########.....................#',
          '##########.....................#',
          '##########.....................#',
          '##########.....................#',
          '##########.....................#',
          '##########.....................#',
          '##########.......ss###H###sssss#',
          '##########.......###############',
          '#................###############',
          '#.T........JJJJJ.###############',
          '################################',
          '################################',
          '################################',
        ],
      },
      {
        title: 'Boomerang', par: 3,
        tip: 'Swap! Bo golfs, Pip is the ball. Zoom down the bumper alley to the arrow pad!',
        signs: [{ x: 300, y: 140, text: 'Ball: land it on the green!' }],
        map: [
          '################################',
          '#..............................#',
          '#..............................#',
          '#..............................#',
          '#..............................#',
          '#..............................#',
          '#..............................#',
          '#..............................#',
          '#..............................#',
          '#................#....#........#',
          '#................######H#####ss#',
          '#................###############',
          '#................XXXXXXXXXXXXXX#',
          '#..............................#',
          '#.....R......................T.#',
          '################################',
          '################################',
          '################################',
        ],
      },
    ],
  },
  {
    name: 'Windmill Way', world: 2, kind: 'team', golf: true,
    medals: { bronze: 'Sink both balls', goals: [{ key: 'overPar', gold: 0, silver: 2, text: n => n === 0 ? 'Par or better' : `${n} or fewer over par`, show: v => v === 0 ? 'par' : v > 0 ? v + ' over' : -v + ' under', gap: (v, n) => `${v - n} fewer stroke${v - n === 1 ? '' : 's'}` }] },
    tip: 'Windmill sails knock the ball around. Wait for a gap, then swing!',
    switches: {},
    rooms: [
      {
        title: 'The Windmill', par: 2, windmill: { arms: 3, len: 130, speed: 0.8 },
        tip: 'Pip golfs, Bo is the ball. Wait for a gap in the sails, then swing!',
        signs: [],
        map: [
          '################################',
          '#.........############.........#',
          '#.........############.........#',
          '#.........############.........#',
          '#.........############.........#',
          '#.........############.........#',
          '#..............................#',
          '#..............................#',
          '#..............................#',
          '#..............................#',
          '#..............M...............#',
          '#.............###..............#',
          '#.............###..............#',
          '#..............................#',
          '#.T............................#',
          '##################ssssssss#H####',
          '################################',
          '################################',
        ],
      },
      {
        title: 'Twin Mills', par: 3, windmill: { arms: 4, len: 90, speed: 0.9 },
        tip: 'Swap! Bo golfs, Pip is the ball. Pip, boost through when the sails bat you back!',
        signs: [],
        map: [
          '################################',
          '#..............###########.....#',
          '#..............###########.....#',
          '#..............###########.....#',
          '#..............###########.....#',
          '#..............###########.....#',
          '#..............###########.....#',
          '#..............######..........#',
          '#..............................#',
          '#..............................#',
          '#..............................#',
          '#....M..............M..........#',
          '#..................###.........#',
          '#..................###.........#',
          '#..................###JJ.....T.#',
          '#####H##########################',
          '################################',
          '################################',
        ],
      },
    ],
  },
  {
    name: 'Portal Park', world: 2, kind: 'team', golf: true, airBoost: true,
    medals: { bronze: 'Sink both balls', goals: [{ key: 'overPar', gold: 0, silver: 2, text: n => n === 0 ? 'Par or better' : `${n} or fewer over par`, show: v => v === 0 ? 'par' : v > 0 ? v + ' over' : -v + ' under', gap: (v, n) => `${v - n} fewer stroke${v - n === 1 ? '' : 's'}` }] },
    tip: 'Portals send the ball across the course. Speed in = speed out!',
    switches: {},
    rooms: [
      {
        title: 'Warp Zone', par: 3, flatY: 400, flatAim: 0,
        tip: 'Pip golfs, Bo is the ball. Putt into the portal. Bo: boost in the air to reach the green!',
        signs: [{ x: 330, y: 245, text: 'Speed in = speed out!' }],
        map: [
          '################################',
          '#..............................#',
          '#..............................#',
          '#..............................#',
          '#.......Q......................#',
          '#..............................#',
          '#..............................#',
          '#..............................#',
          '#...................####H##ssss#',
          '#...................X###########',
          '################ssss############',
          '################################',
          '################################',
          '#..............................#',
          '#.T...........................O#',
          '################################',
          '################################',
          '################################',
        ],
      },
      {
        title: 'Rabbit Hole', par: 3, flatY: 340,
        tip: 'Swap! Bo golfs, Pip is the ball. Chip into the portal. Pip: steer it in!',
        signs: [{ x: 650, y: 130, text: 'Down the rabbit hole!' }],
        map: [
          '################################',
          '###########s...................#',
          '###########s...................#',
          '###########s...................#',
          '###########s...................#',
          '###########s...................#',
          '###########sV..................#',
          '###########s...................#',
          '###########s...................#',
          '###########s.........T.........#',
          '############.###################',
          '################################',
          '#s.U...........................#',
          '#s.............................#',
          '#s.............................#',
          '############H###################',
          '################################',
          '################################',
        ],
      }
    ],
  },
  /* ===== World 4 (Rumble Park, versus): add the level defs here, in order 4-1, 4-2, 4-3, 4-4 =====
     { name: 'King of the Hill', world: 3, kind: 'versus', mode: 'hill', match: { bestOf: 5 }, act: { label: 'punch' }, tip: '...', switches: {}, map: [...] },
     See API.md. */
  {
    name: 'King of the Hill', world: 3, kind: 'versus', mode: 'koth',
    match: { bestOf: 5, roundTime: 70 },
    act: { label: 'punch' },
    tip: 'Stand alone on top of the hill to score. Tap punch to jab, hold it for a MEGA punch!',
    signs: [{ x: 480, y: 104, text: 'Hold punch to charge a MEGA punch!' }],
    theme: { stone: '#6d5643', stoneLight: '#806650', stoneEdge: '#4e3d30', grass: '#8fe071', grassDark: '#52aa46' },
    switches: {},
    map: [
      '#..............................#',
      '#..............................#',
      '#..............................#',
      '#..............................#',
      '#..............................#',
      '#..............................#',
      '#..............................#',
      '#..............................#',
      '#..............................#',
      '#.....g.................g......#',
      '#....====....hhhhhh....====....#',
      '#............######............#',
      '#..........##########..........#',
      '#===.....##############.....===#',
      '#......##################......#',
      '#.1.J######################J.2.#',
      '################################',
      '################################',
    ],
  },
  {
    name: 'Snowball Fight', world: 3, kind: 'versus', mode: 'snow',
    match: { bestOf: 7, roundTime: 60 }, act: { label: 'throw' }, stomp: false,
    legend: { down: 'duck', padDown: 'down ducks' },   // ▼ ducks (and packs snow) here; on a plank it still drops through
    tip: 'Hit them 4 times to make a snowman! Tap to throw, hold to lob, ▼ to duck. Don’t hide too long!',
    signs: [{ x: 480, y: 104, text: 'Hold throw to aim far · ▼ ducks under snowballs' }],
    theme: { skyTop: '#bcdcf2', skyBot: '#e6f0f9', hillFar: '#d5e5f2', hillNear: '#b9d0e4',
      stone: '#56688c', stoneLight: '#667aa0', stoneEdge: '#3b4a6c', grass: '#f8fcff', grassDark: '#c4d8ec',
      sun: 'rgba(255, 252, 238, 0.95)', sunGlow: 'rgba(255, 252, 238, 0.35)' },
    switches: {},
    // f = snow-fort brick (3 hits), m = centre MEGA spot, n = side MEGA spots (Pip's left, Bo's right)
    map: [
      '################################',
      '#..............................#',
      '#..............................#',
      '#..............................#',
      '#..............................#',
      '#..............................#',
      '#..............................#',
      '#..............................#',
      '#..............................#',
      '#..............................#',
      '#..............................#',
      '#......n...............n.......#',
      '#.....====............====.....#',
      '#..............m...............#',
      '#.......f......##......f.......#',
      '#..1....f....######....f....2..#',
      '################################',
      '################################',
    ],
  },
  {
    name: 'Hot Potato Volleyball', world: 3, kind: 'versus', mode: 'potato',
    match: { bestOf: 7 },
    act: { label: 'hit' },
    legend: { down: '+ hit = set', padDown: 'down + hit = set' },   // top bar: there is nothing to drop through here; ▼ + hit sets
    stomp: false,                         // the two players never meet (the net keeps them apart)
    theme: { grass: '#f3d68f', grassDark: '#d9ae5c' },   // sand on top of the stone: beach volleyball at dusk
    tip: 'Hit the potato over the net! If it goes BOOM on your side, you lose. Red-hot? Don’t let it land!',
    switches: {}, signs: [],
    potato: { netX: 480, netH: 96 },      // read by the mode: net centre x, net height above the floor
    map: [
      '################################',
      '#..............................#',
      '#..............................#',
      '#..............................#',
      '#..............................#',
      '#..............................#',
      '#..............................#',
      '#..............................#',
      '#..............................#',
      '#..............................#',
      '#..............................#',
      '#..............................#',
      '#..............................#',
      '#..............................#',
      '#..............................#',
      '#.......1..............2.......#',
      '################################',
      '################################',
    ],
  },
  {
    name: 'Paint the Floor', world: 3, kind: 'versus', mode: 'paint',
    match: { bestOf: 5, roundTime: 45 }, act: { label: 'splat' },
    theme: { grass: '#f3ead8', grassDark: '#d6c8ad' },
    tip: 'Run to paint your colour! Splat in the air for a big SPLASH. Most paint at the end wins.',
    switches: {}, signs: [],
    map: [
      '################################',
      '#..............................#',
      '#..............................#',
      '#..............................#',
      '#..............B...............#',
      '#.............====.............#',
      '#..............................#',
      '#.=======..............=======.#',
      '#...........========...........#',
      '#.....B.................B......#',
      '#...======............======...#',
      '#............======............#',
      '#..............................#',
      '#..======......B.......======..#',
      '#...........########...........#',
      '#.1.......B.########B........2.#',
      '################################',
      '################################',
    ],
  },
  /* ===== World 5 (Road Trip, teamwork): add the level defs here, in order 5-1 Two-Seat Car, 5-2 Pizza Delivery, 5-3 Ice Slide, 5-4 Rising Lava =====
     { name: 'Two-Seat Car', world: 4, kind: 'team', mode: 'car', ... } — see API.md. */
  {
    // 5-1: top-down driving, one steers and one does gas and brake (MODES.car). Map chars are parsed by the mode.
    name: 'Two-Seat Car', world: 4, kind: 'team', mode: 'car', ownStep: true, ownHUD: true,
    act: { label: 'honk' },
    // top-bar legend (def.legend, API §11)
    legend: {
      pip: '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> steer · <kbd>W</kbd> go <kbd>S</kbd> brake',
      bo: '<kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd> steer · <kbd>↑</kbd> go <kbd>↓</kbd> brake',
      pad: 'stick steers, or <span data-glyph="a"></span> go, stick ↓ brake,',
    },
    tip: 'One of you steers, the other does gas and brake. Swap seats every room!',
    theme: { grass: '#8fe3b0', grassDark: '#55ad80' },
    switches: {}, signs: [],
    rooms: [
      {
        title: 'Driving School', steer: 0, startDir: 0,
        tip: 'Pip steers: point the way. Bo: ▲ go, ▼ brake. Stop in the box!',
        signs: [
          { x: 250, y: 315, text: 'Bo: hold ▲ to go, ▼ to stop' },
          { x: 250, y: 435, text: 'Pip: point the way!' },
          { x: 825, y: 315, text: 'Stop in the box!' },
        ],
        critter: { kind: 'duck', x: 7, y: 8 },
        path: [[2.5, 12], [13, 12], [13, 5], [21, 5], [21, 12], [27, 12]],
        map: [
          '################################',
          '#..............................#',
          '#..............................#',
          '#..###....................###..#',
          '#..###......=====!=====...###..#',
          '#..###......===========...###..#',
          '#...........=====!=====........#',
          '#...........===.....===........#',
          '#...........===.###.===........#',
          '#...........===.###.===........#',
          '#...........===.###.===........#',
          '#.======!======.###.======ppp=.#',
          '#.12===========.###.======ppp=.#',
          '#.========!====.###.======ppp=.#',
          '#...............###............#',
          '#.....##........###............#',
          '#.....##........###............#',
          '################################',
        ],
      },
      {
        title: 'Duck Pond', steer: 1, startDir: 0,
        tip: 'Swap seats! Bo steers, Pip does gas and brake. Stop for the ducks!',
        signs: [
          { x: 790, y: 495, text: 'Ducks! Wait, or honk' },
          { x: 300, y: 480, text: 'Narrow bridge' },
          { x: 165, y: 345, text: 'Park here!' },
        ],
        ducks: [{ from: [21, 10.5], to: [21, 15.5], n: 3, start: 0.3 }],
        path: [[2.5, 4], [27, 4], [27, 12.5], [8, 12.5], [5, 13]],
        map: [
          '################################',
          '#..............................#',
          '#..............................#',
          '#.===========================..#',
          '#.12==========f==============..#',
          '#.===========================..#',
          '######....................===..#',
          '######wwwwwwwwwwwwwwwww...===..#',
          '######wwwwwwwwwwwwwwwww...===..#',
          '######wwwwwwwwwwwwwwwww...===..#',
          '######.......www..........===..#',
          '#............rrr..........===..#',
          '#.==ppp======================..#',
          '#.==ppp===========f======f===..#',
          '#.==ppp======rrr=============..#',
          '#####........www...............#',
          '#####........www...............#',
          '################################',
        ],
      },
      {
        title: 'Big Jump', steer: 0, startDir: 0,
        tip: 'Swap seats! Pip steers, Bo does gas and brake. Full gas for the jumps!',
        signs: [
          { x: 225, y: 210, text: 'Full gas!' },
          { x: 780, y: 495, text: 'Bigger jump!' },
          { x: 390, y: 495, text: 'Mud is slow' },
        ],
        critter: { kind: 'frog', x: 14, y: 9 },
        path: [[2.5, 4], [27, 4], [27, 14], [5, 14]],
        map: [
          '################################',
          '#.........www..................#',
          '#.........www..................#',
          '#.=======>www================..#',
          '#.12=====>www===f============..#',
          '#.=======>www================..#',
          '#####.....www.............===..#',
          '#####.....www.............===..#',
          '#######wwwwwwwwwwwwwwww...===..#',
          '#######wwwwwwwwwwwwwwww...===..#',
          '#######wwwwwwwwwwwwwwww...===..#',
          '#####.............wwww....=f=..#',
          '#.................wwww....===..#',
          '#.==ppp=====sss===wwww<======..#',
          '#.==ppp=====sss===wwww<======..#',
          '#.==ppp=====sss===wwww<======..#',
          '#.................wwww.........#',
          '################################',
        ],
      },
      {
        title: 'Swap Rally', steer: 1, startDir: 0,
        tip: 'Swap seats! Bo steers first. Drive over the purple pad to swap again!',
        signs: [
          { x: 330, y: 495, text: 'Zoom pad! Then brake!' },
          { x: 560, y: 375, text: 'Wait for the train' },
          { x: 270, y: 375, text: 'Swap seats!' },
          { x: 640, y: 195, text: 'Park in the garage!' },
        ],
        train: { col: 17, w: 2, top: 7, bot: 11, period: 8, speed: 120, cars: 3, carLen: 34, gap: 4, warn: 1.5, phase: 3 },
        path: [[2.5, 14], [27, 14], [27, 9], [3, 9], [3, 4], [27.5, 3.5]],
        map: [
          '################################',
          '#.........................######',
          '#.........................######',
          '#.=========!=====!=========pp###',
          '#.=========================pp###',
          '#.============!=====!======#####',
          '#.=f=......................#####',
          '#.===.###########nn#############',
          '#.=======S=====g=tt=g========..#',
          '#.=======S=====g=tt=g==f=====..#',
          '#.=======S=====g=tt=g========..#',
          '#################nn######.===..#',
          '#.........................===..#',
          '#.===========z===============..#',
          '#.12=========z===============..#',
          '#.===========z===============..#',
          '#..............................#',
          '################################',
        ],
      },
    ],
  },
  {
    name: 'Pizza Delivery', world: 4, kind: 'team', mode: 'pizza', ownStep: true, ownHUD: true,
    legend: { jump: 'hop', down: 'duck', padJump: 'hop', padDown: 'down ducks' }, tagLift: 28,
    act: { label: 'steady' },
    tip: 'Carry the pizzas together: walk, hop and duck at the same time. Wobbly? Stop and BOTH hold steady!',
    theme: { skyTop: '#8fd3f0', skyBot: '#fff1d6', hillFar: '#bcd9e6', hillNear: '#a5c4d6',
      stone: '#5b5873', stoneLight: '#68657f', stoneEdge: '#3f3d55', grass: '#d9d2c3', grassDark: '#a69e8e',
      plank: '#c98b5a', plankDark: '#8a5833', rope: '#e4572e' },
    switches: {},
    rooms: [
      {
        title: 'Pizza Street', order: 3, stack: 5, house: { num: '12', col: '#ffd6a5' }, switches: {},
        tip: 'Carry the pizzas together! Walk at the same time, and stop at the door.',
        signs: [
          { x: 250, y: 130, text: 'Walk together: same time, same way!' },
          { x: 610, y: 175, text: 'Bumps! Slow down a little' },
          { x: 610, y: 205, text: 'Wobbly? Stop, and BOTH hold steady' },
          { x: 850, y: 196, text: 'Stop at the door!' },
        ],
        map: [
          '................................',
          '................................',
          '................................',
          '................................',
          '................................',
          '................................',
          '................................',
          '................................',
          '................................',
          '................................',
          '................................',
          '................................',
          '................................',
          '................................',
          '..1..2....n.....n...nn......D...',
          '################################',
          '################################',
          '################################',
        ],
      },
      {
        title: 'Puddle Lane', order: 4, stack: 6, house: { num: '7', col: '#cdeac0' }, switches: {},
        tip: 'Press hop at the same time to hop together. Crates need a team hop!',
        theme: { skyTop: '#a3c3d8', skyBot: '#f1f0e4', hillFar: '#b7cfc6', hillNear: '#9fbcb2',
          sun: 'rgba(255, 246, 214, 0.75)', sunGlow: 'rgba(255, 246, 214, 0.25)',
          stone: '#555268', stoneLight: '#625f78', stoneEdge: '#3a384e', grass: '#cfcabe', grassDark: '#9c9587',
          plank: '#c98b5a', plankDark: '#8a5833', rope: '#e4572e' },
        signs: [
          { x: 330, y: 160, text: 'Puddle! Hop together to stay dry' },
          { x: 640, y: 200, text: 'Crates need a TEAM hop: press together!' },
        ],
        map: [
          '................................',
          '................................',
          '................................',
          '................................',
          '................................',
          '................................',
          '................................',
          '................................',
          '................................',
          '................................',
          '................................',
          '................................',
          '................................',
          '................................',
          '..2..1............x.....x...D...',
          '#########p###pp#################',
          '################################',
          '################################',
        ],
      },
      {
        title: 'Market Hill', order: 4, stack: 6, house: { num: '3', col: '#bde0fe' }, switches: {},
        tip: 'Duck under the awning together. On the hill, the higher one ducks.',
        theme: { skyTop: '#9fd8f5', skyBot: '#ffe9c4', hillFar: '#e9cfa0', hillNear: '#d9b783',
          stone: '#5b5873', stoneLight: '#68657f', stoneEdge: '#3f3d55', grass: '#ddd3bf', grassDark: '#ab9f88',
          plank: '#c98b5a', plankDark: '#8a5833', rope: '#e4572e' },
        signs: [
          { x: 330, y: 170, text: 'Low awning: BOTH hold down to duck' },
          { x: 610, y: 215, text: 'Hill! The higher one ducks' },
        ],
        map: [
          '................................',
          '................................',
          '................................',
          '................................',
          '................................',
          '................................',
          '................................',
          '................................',
          '................................',
          '................................',
          '................................',
          '.........----...................',
          '................................',
          '................................',
          '..1..2..........rrrmmmfffn..D...',
          '################################',
          '################################',
          '################################',
        ],
      },
      {
        title: 'Windy Corner', order: 5, stack: 8, house: { num: '21', col: '#ffc8dd' }, switches: {},
        tip: 'When the wind whistles, stop and BOTH hold steady!',
        wind: { x0: 7, x1: 17, dir: -1 },
        theme: { skyTop: '#78c0e6', skyBot: '#e6f3fb', hillFar: '#b5d6c7', hillNear: '#97c2ad',
          stone: '#57546e', stoneLight: '#64617b', stoneEdge: '#3c3a52', grass: '#d6d0c4', grassDark: '#a39c8e',
          plank: '#c98b5a', plankDark: '#8a5833', rope: '#e4572e' },
        signs: [
          { x: 380, y: 150, text: 'Wind whistling? Stop and BOTH hold steady' },
          { x: 660, y: 212, text: 'Tall stack: duck under the porch' },
        ],
        map: [
          '................................',
          '................................',
          '................................',
          '................................',
          '................................',
          '................................',
          '................................',
          '................................',
          '................................',
          '................................',
          '.........................--.....',
          '................................',
          '................................',
          '................................',
          '..2..1..............x.......D...',
          '######################mm########',
          '################################',
          '################################',
        ],
      },
    ],
  },
  {
    name: 'Ice Slide', world: 4, kind: 'team', mode: 'ice', ownStep: true, // no act button: "go back" is hold ▼ for 1 s
    legend: { down: 'drop · hold: go back', padDown: 'down drops, hold: back' },
    tip: 'Ice is slippery: you slide until you bump into something. Park so your partner stops in just the right spot! Crash into each other head-on and you both bounce back. Stuck? Hold ▼ for a second to go back to your start.',
    theme: { skyTop: '#a9dcff', skyBot: '#eef8ff', hillFar: '#cfe2f3', hillNear: '#e9f4fc', stone: '#5a7db3', stoneLight: '#7094c8', stoneEdge: '#3b5788', grass: '#c9f0ff', grassDark: '#7cc7ec', plank: '#bfe9ff', plankDark: '#5fa9d6', rope: '#7fd3ff', sun: 'rgba(255, 251, 230, 0.95)', sunGlow: 'rgba(255, 255, 245, 0.4)' },
    switches: {},
    // per room, ice: { par (moves for a "neat" room), hints (park-here cells), hintAfter (s, default 45), arrowAfter (s before the
    // who-moves-next arrows, default 60), guide (their table: made by tests/mkguide.js, redo it after any map change), signs
    // (drawn by the mode over its backdrop), palace: [x, baseY, scale], penguins: [[x, feetY, scale]], floes: [[x, y]] }
    rooms: [
      {
        title: 'Slip and Stop',
        tip: 'Push once and you slide all the way. Bump into your partner to stop! Stuck? Hold ▼ to go back.',
        switches: { A: { plate: 'a', type: 'gate' } },
        ice: { par: 4, hintAfter: 0, hints: [[19, 14], [18, 14]], palace: [780, 420, 0.75],
          guide: 'blchRbncjrc3czlchblrchciRchcjRchckRchclRchcmRchcnRchcoRchcpRchcqRchcrRchcsRchctRchcuRchcvRchcwRchcxRchcyRchczrchd1RchdarcibmrcichrcicircicjRciczrcisiRcjbnrcjchrcjcircjckRcjclRcjcmRcjcnRcjcoRcjcpRcjcqRcjcrRcjcsRcjctRcjcuRcjcvRcjcwRcjcxRcjcyRcjczrcjd1RcjdarckchrckcirckcjrckclRckczrclchrclcirclcjrclckrclcmRclczrcmchrcmcircmcjrcmclrcmcnRcmczrcnchrcncircncjrcncmrcncoRcnczrcochrcocircocjrcocnrcocpRcoczrcpchrcpcircpcjrcpcorcpcqRcpczrcqchrcqcircqcjrcqcprcqcrRcqczrcrchrcrcircrcjrcrcqrcrcsRcrczrcschrcscircscjrcscrrcsctRcsczrctchrctcirctcjrctcsrctcuRctczrcuchrcucircucjrcuctrcucvRcuczrcvchrcvcircvcjrcvcurcvcwRcvczrcwchrcwcircwcjrcwcvrcwcxRcwczrcxchrcxcircxcjrcxcwrcxcyRcxczrcychrcycircycjrcycxrcyczRcyd1Rcydarczc3lczchRczciRczcjRczckRczclRczcmRczcnRczcoRczcpRczcqRczcrRczcsRczctRczcuRczcvRczcwRczcxRczcyrczd1Rczdard1chrd1cird1cjrd1cyrd1czrdachRdaciRdacjRdacyRdaczR',
          signs: [
            { x: 300, y: 300, text: 'On ice you slide until you bump into something' },
            { x: 300, y: 330, text: 'One of you parks by the gate. The other bumps into them!' },
            { x: 770, y: 300, text: 'The door has a button too' },
          ] },
        signs: [],
        map: [
          '################################',
          '#...................#..........#',
          '#...................#..........#',
          '#...................#..........#',
          '#...................#..........#',
          '#...................#..........#',
          '#...................#..........#',
          '#...................#..........#',
          '#...................#..........#',
          '#...................#..........#',
          '#...................#..........#',
          '#...................#..........#',
          '#...................A..........#',
          '#...................A..........#',
          '#.21..............a.A........Ea#',
          '#nnn############################',
          '################################',
          '################################',
        ],
      },
      {
        title: 'Hop Up',
        tip: 'On ice you can only hop straight up. Stop under a hole in the ceiling to hop through it!',
        switches: { A: { plate: 'a', type: 'gate' } },
        ice: { par: 7, hints: [[15, 14], [14, 14], [1, 11]], palace: [700, 360, 0.75],
          guide: '8x9tr9t8xr9t9uR9t9vR9t9wR9t9xR9t9yR9t9zR9ta0R9ta1R9ta2R9ta3R9ta4R9ta5R9ta6R9ta7R9ta8R9ta9R9taaR9tabR9tacR9tadR9taeR9tafR9tagR9tahR9taiR9tajR9takR9talR9tamr9tchR9tcjR9tctR9tcur9tcvR9tcxr9tcyr9tczr9td0r9td1r9td2r9td3r9td4r9td5r9td6r9td7r9td8r9td9r9tdar9u9tr9u9vR9uamr9uchl9ucjl9ucvl9ucxr9udar9v9tr9v9ur9v9wR9vamr9vchl9vcjl9vcvl9vcxr9vdar9w9tr9w9vr9w9xR9wamr9wchl9wcjl9wcvl9wcxr9wdar9x9tr9x9wr9x9yR9xamr9xchl9xcjl9xcvl9xcxr9xdar9y9tr9y9xr9y9zR9yamr9ychl9ycjl9ycvl9ycxr9ydar9z9tr9z9yr9za0R9zamr9zchl9zcjl9zcvl9zcxr9zdara09tra09zra0a1Ra0amra0chla0cjla0cvla0cxra0dara19tra1a0ra1a2Ra1amra1chla1cjla1cvla1cxra1dara29tra2a1ra2a3Ra2amra2chla2cjla2cvla2cxra2dara39tra3a2ra3a4Ra3amra3chla3cjla3cvla3cxra3dara49tra4a3ra4a5Ra4amra4chla4cjla4cvla4cxra4dara59tra5a4ra5a6Ra5amra5chla5cjla5cura5cvla5cxra5dara69tra6a5ra6a7Ra6amra6chla6cjla6ctla6cvla6cxra6dara79tra7a6ra7a8Ra7amra7chla7cjla7cura7cvla7cxra7dara89tra8a7ra8a9Ra8amra8chla8cjla8cvla8cxra8dara99tra9a8ra9aaRa9amra9chla9cjla9cvla9cxra9daraa9traaa9raaabRaaamraachlaacjlaacvlaacxraadarab9trabaarabacRabamrabchlabcjlabcvlabcxrabdarac9tracabracadRacamracchlaccjlaccvlaccxracdarad9tradacradaeRadamradchladcjladcvladcxraddarae9traeadraeafRaeamraechlaecjlaecvlaecxraedaraf9trafaerafagRafamrafchlafcjlafcvlafcxrafdarag9tragafragahRagamragchlagcjlagcvlagcxragdarah9trahagrahaiRahamrahchlahcjlahcvlahcxrahdarai9traiahraiajRaiamraichlaicjlaicvlaicxraidaraj9trajairajakRajamrajchlajcjlajcvlajcxrajdarak9trakajrakalRakamrakchlakcjlakcvlakcxrakdaral9tralakralchlalcjlalcvlalcxRaldaUam9tRam9uRam9vRam9wRam9xRam9yRam9zRama0Rama1Rama2Rama3Rama4Rama5Rama6Rama7Rama8Rama9RamaaRamabRamacRamadRamaeRamafRamagRamahRamaiRamajRamakRamchlamcjlamctlamcuUamcvlamcxRamcyRamczRamd0Ramd1Ramd2Ramd3Ramd4Ramd5Ramd6Ramd7Ramd8Ramd9RamdaUblchRbncjrbzcvlc1cxrcedaUch9trch9uLch9vLch9wLch9xLch9yLch9zLcha0Lcha1Lcha2Lcha3Lcha4Lcha5Lcha6Lcha7Lcha8Lcha9LchaaLchabLchacLchadLchaeLchafLchagLchahLchaiLchajLchakLchalLchamLchblrchciRchcjRchckRchclRchcmRchcnRchcoRchcpRchcqRchcrRchcsRchctRchcuUchcvrchcxRchcyRchczRchd0Rchd1Rchd2Rchd3Rchd4Rchd5Rchd6Rchd7Rchd8Rchd9RchdaUci9trci9uLci9vLci9wLci9xLci9yLci9zLcia0Lcia1Lcia2Lcia3Lcia4Lcia5Lcia6Lcia7Lcia8Lcia9LciaaLciabLciacLciadLciaeLciafLciagLciahLciaiLciajLciakLcialLciamLcibmrcichrcicircicjRcickRciclRcicmRcicnRcicoRcicpRcicqRcicrRcicsRcictRcicuUcicvrcicxRcicyRciczRcid0Rcid1Rcid2Rcid3Rcid4Rcid5Rcid6Rcid7Rcid8Rcid9RcidaUcisiRcj9trcj9uLcj9vLcj9wLcj9xLcj9yLcj9zLcja0Lcja1Lcja2Lcja3Lcja4Lcja5Lcja6Lcja7Lcja8Lcja9LcjaaLcjabLcjacLcjadLcjaeLcjafLcjagLcjahLcjaiLcjajLcjakLcjalLcjamLcjbnrcjchrcjcircjckRcjclRcjcmRcjcnRcjcoRcjcpRcjcqRcjcrRcjcsRcjctRcjcuUcjcvrcjcxRcjcyRcjczRcjd0Rcjd1Rcjd2Rcjd3Rcjd4Rcjd5Rcjd6Rcjd7Rcjd8Rcjd9RcjdaUckchrckcjrckclRckcvrclchrclcjrclckrclcmRclcvrcmchrcmcjrcmclrcmcnRcmcvrcnchrcncjrcncmrcncoRcncvrcochrcocjrcocnrcocpRcocvrcpchrcpcjrcpcorcpcqRcpcvrcqchrcqcjrcqcprcqcrRcqcvrcrchrcrcjrcrcqrcrcsRcrcvrcschrcscjrcscrrcsctRcscvrct9trcta6LctamLctchrctcjrctcsrctcuUctcvrctcxRctdaUcu9trcua5ucua7ucuamucuchucucjucuctucucvucucxucudaucv9trcv9uLcv9vLcv9wLcv9xLcv9yLcv9zLcva0Lcva1Lcva2Lcva3Lcva4Lcva5Lcva6Lcva7Lcva8Lcva9LcvaaLcvabLcvacLcvadLcvaeLcvafLcvagLcvahLcvaiLcvajLcvakLcvalLcvamLcvbzlcvchRcvciRcvcjRcvckRcvclRcvcmRcvcnRcvcoRcvcpRcvcqRcvcrRcvcsRcvctlcvcuUcvcxRcvcyRcvczRcvd0Rcvd1Rcvd2Rcvd3Rcvd4Rcvd5Rcvd6Rcvd7Rcvd8Rcvd9RcvdaUcx9trcx9urcx9vrcx9wrcx9xrcx9yrcx9zrcxa0rcxa1rcxa2rcxa3rcxa4rcxa5rcxa6rcxa7rcxa8rcxa9rcxaarcxabrcxacrcxadrcxaercxafrcxagrcxahrcxaircxajrcxakrcxalrcxamrcxc1rcxchrcxcjrcxctrcxcurcxcvrcxcyRcxczRcxd0Rcxd1Rcxd2Rcxd3Rcxd4Rcxd5Rcxd6Rcxd7Rcxd8Rcxd9RcxdaUcy9trcyamrcychrcycjrcycvrcycxrcyczRcydaUcz9trczamrczchrczcjrczcvrczcxrczcyrczd0RczdaUd09trd0amrd0chrd0cjrd0cvrd0cxrd0czrd0d1Rd0daUd19trd1amrd1chrd1cjrd1cvrd1cxrd1d0rd1d2Rd1daUd29trd2amrd2chrd2cjrd2cvrd2cxrd2d1rd2d3Rd2daUd39trd3amrd3chrd3cjrd3cvrd3cxrd3d2rd3d4Rd3daUd49trd4amrd4chrd4cjrd4cvrd4cxrd4d3rd4d5Rd4daUd59trd5amrd5chrd5cjrd5cvrd5cxrd5d4rd5d6Rd5daUd69trd6amrd6chrd6cjrd6cvrd6cxrd6d5rd6d7Rd6daUd79trd7amrd7chrd7cjrd7cvrd7cxrd7d6rd7d8Rd7daUd89trd8amrd8chrd8cjrd8cvrd8cxrd8d7rd8d9Rd8daUd99trd9amrd9chrd9cjrd9cvrd9cxrd9d8rd9daUda9tuda9uuda9vuda9wuda9xuda9yuda9zudaa0udaa1udaa2udaa3udaa4udaa5udaa6udaa7udaa8udaa9udaaaudaabudaacudaadudaaeudaafudaagudaahudaaiudaajudaakudaaludaamudaceudachudacjudactudacuudacvudacxudacyudaczudad0udad1udad2udad3udad4udad5udad6udad7udad8udad9u',
          signs: [
            { x: 480, y: 112, text: 'Stop right under the ice shelf, then hop up!' },
            { x: 480, y: 142, text: 'Up top: stand on the button to open the gate below' },
          ] },
        signs: [],
        map: [
          '################################',
          '#..............................#',
          '#..............................#',
          '#..............................#',
          '#..............................#',
          '#..............................#',
          '#..............................#',
          '#..............................#',
          '#..............................#',
          '#..............................#',
          '#..............................#',
          '#a...........................E.#',
          '##############=###############=#',
          '#...............#..............#',
          '#.12............A..............#',
          '#nnn############################',
          '################################',
          '################################',
        ],
      },
      {
        title: 'Drop In',
        tip: 'Press down on an ice shelf to drop through it. You land right below it, and you stay put!',
        switches: { A: { plate: 'a', type: 'gate' } },
        ice: { par: 7, hintAfter: 30, hints: [[1, 14], [17, 11]], palace: [730, 360, 0.75], penguins: [[90, 270, 1], [455, 270, 0.9]],
          guide: 'a9chda9cida9cyda9dadadchladciladcyladdalafchlafciLafd8LafdaLalchlalciLald8LaldaLamchlamciLamd8LamdaLblchrcedalcha9DchadLchafLchalLchamLchblrchciRchcjRchckRchclRchcmRchcnRchcoRchcpRchcqRchcrRchcsRchctRchcuRchcvRchcwRchcxrchcyrchczrchd0rchd1Rchd2Rchd3Rchd4Rchd5Rchd6Rchd7Rchd8Rchd9UchdarcichrcicjRcidarcja9DcjadLcjaflcjallcjamlcjchrcjcircjckRcjclRcjcmRcjcnRcjcoRcjcpRcjcqRcjcrRcjcsRcjctRcjcuRcjcvRcjcwRcjcxrcjcyrcjczrcjd0rcjd1Rcjd2Rcjd3Rcjd4Rcjd5Rcjd6Rcjd7Rcjd8Rcjd9lcjdarckchrckcirckcjrckclRckdarclchrclcirclckrclcmRcldarcmchrcmcircmclrcmcnRcmdarcnchrcncircncmrcncoRcndarcochrcocircocnrcocpRcodarcpchrcpcircpcorcpcqRcpdarcqchrcqcircqcprcqcrRcqdarcrchrcrcircrcqrcrcsRcrdarcschrcscircscrrcsctRcsdarctchrctcirctcsrctcuRctdarcuchrcucircuctrcucvRcudarcvchrcvcircvcurcvcwRcvdarcwchrcwcircwcvrcwdaLcxchRcxciRcxcyBcxdaBcya9lcyadlcychRcyciRcycxbcyczBcydaBczchRczciRczcybczd0Bczdard0chrd0cird0czbd0d1Rd0dard1chrd1cird1d0rd1d2Rd1dard2chrd2cird2d1rd2d3Rd2dard3chrd3cird3d2rd3d4Rd3dard4chrd4cird4d3rd4d5Rd4dard5chrd5cird5d4rd5d6Rd5dard6chrd6cird6d5rd6d7Rd6dard7chrd7cird7d6rd7d8Rd7dard8afld8alld8amld8chrd8cird8d7rd8d9ld8dard9chud9ciud9d8ud9daudaa9ldaadldaafldaalldaamldaceldachRdaciRdacjRdackRdaclRdacmRdacnRdacoRdacpRdacqRdacrRdacsRdactRdacuRdacvRdacwldacxbdacybdaczRdad0Rdad1Rdad2Rdad3Rdad4Rdad5Rdad6Rdad7Rdad8ldad9U',
          signs: [
            { x: 270, y: 112, text: 'The door is in the middle of the ice!' },
            { x: 270, y: 142, text: 'Drop into it, then your partner slides in' },
            { x: 300, y: 405, text: 'This button opens the gate up top' },
          ] },
        signs: [],
        map: [
          '################################',
          '#..............................#',
          '#..............................#',
          '#..............................#',
          '#..............................#',
          '#..............................#',
          '#..............................#',
          '#..............................#',
          '#..............................#',
          '#################..............#',
          '#################.....A........#',
          '#################.....A........#',
          '#################=###########=##',
          '#..............................#',
          '#a21............E..............#',
          '################################',
          '################################',
          '################################',
        ],
      },
      {
        title: 'Ice Bridge',
        tip: 'Orange posts stop Pip. Blue posts stop Bo. Don’t slide off the bridge!',
        switches: {},
        ice: { par: 6, hintAfter: 30, hints: [[18, 11], [17, 11], [22, 14]], palace: [760, 360, 0.7], penguins: [[75, 453, 0.8]],
          floes: [[75, 456], [140, 456], [800, 456], [880, 456]],
          guide: '8x9tR8y9uR9eaaD9gacl9qaml9t8xR9t9uR9t9vR9t9wR9t9xR9t9yR9t9zR9ta0R9ta1R9ta2R9ta3R9ta4R9ta5R9ta6R9ta7R9ta8R9ta9R9taar9tacB9tadB9taeB9tafB9tagB9tahB9taiB9tajB9takB9talB9tamL9tcxr9tcyU9u8yR9u9tb9u9vR9u9wR9u9xR9u9yR9u9zR9ua0R9ua1R9ua2R9ua3R9ua4R9ua5R9ua6R9ua7R9ua8R9ua9R9uaar9uacB9uadB9uaeB9uafB9uagB9uahB9uaiB9uajB9uakB9ualB9uamL9ucxr9ucyU9v9tb9v9ub9v9wR9vaar9vcyU9w9tb9w9ub9w9vb9w9xR9waar9wcyU9x9tb9x9ub9x9wb9x9yR9xaar9xcyU9y9tb9y9ub9y9xb9y9zR9yaar9ycyU9z9tb9z9ub9z9yb9za0R9zaar9zcyUa09tba09uba09zba0a1Ra0aara0cyUa19tba19uba1a0ba1a2Ra1aara1cyUa29tba29uba2a1ba2a3Ra2aara2cyUa39tba39uba3a2ba3a4Ra3aara3cyUa49tba49uba4a3ba4a5Ra4aara4cyUa59tba59uba5a4ba5a6Ra5aara5cyUa69tba69uba6a5ba6a7Ra6aara6cyUa79tba79uba7a6ba7a8Ra7aara7cyUa89tba89uba8a7ba8a9Ra8aara8cxra8cyUa99tda99uda9a8da9aada9cydaa9edaa9tdaa9udaaa9daaacdaaamdaacxdaacydab9tRab9uRabaababaclabamlabcylac9tRac9uRacaabacadlacamlaccylad9tRad9uRadaabadacbadaeladamladcylae9tRae9uRaeaabaeacbaeadbaeaflaeamlaecylaf9tRaf9uRafaabafacbafaebafaglafamlafcylag9tRag9uRagaabagacbagafbagahlagamlagcylah9tRah9uRahaabahacbahagbahailahamlahcylai9tRai9uRaiaabaiacbaiahbaiajlaiamlaicylaj9tRaj9uRajaabajacbajaibajaklajamlajcylak9tRak9uRakaabakacbakajbakallakamlakcylal9tRal9uRalaabalacbalakbalamlalcylam9qlam9tlam9ulam9vlam9wlam9xlam9ylam9zlama0lama1lama2lama3lama4lama5lama6lama7lama8lama9lamaalamaclamadlamaelamaflamaglamahlamailamajlamaklamalBamcxUamcylc2cyrcx9trcx9urcxa8rcxaarcxcyUcy9trcy9urcya9rcyaarcyacrcyamrcyc2rcycxrcz9trcz9urczaarczcyrd29tRd29uRd2a8Rd2a9Dd2aaDd2acBd2amLd2cxRd2cyR',
          signs: [
            { x: 480, y: 112, text: 'Orange posts stop Pip. Blue posts stop Bo.' },
            { x: 480, y: 142, text: 'Splash! The water sends you back where you were.' },
          ] },
        signs: [],
        map: [
          '################################',
          '#..............................#',
          '#..............................#',
          '#..............................#',
          '#..............................#',
          '#..............................#',
          '#..............................#',
          '#..............................#',
          '#..............................#',
          '#..............................#',
          '#..............................#',
          '#12................u...........#',
          '#nn##############==###########=#',
          '#..............................#',
          '#....................E.o.......#',
          '#wwwww#################wwwwwwww#',
          '#wwwww#################wwwwwwww#',
          '################################',
        ],
      },
    ],
  },
  { name: 'Rising Lava', world: 4, kind: 'team', mode: 'lava',
    legend: { down: 'drop · hold: hop back', padDown: 'down drops, hold: back' },
    tip: 'Each button makes steps for your partner. Climb before the lava does! Stuck? Hold down for a second to hop back.',
    switches: {}, signs: [],
    rooms: [
      { // ---------- Floor 1: Warm Feet ----------
        title: 'Warm Feet',
        tip: 'Orange buttons are Pip’s, blue ones are Bo’s. Each one makes steps for the other!',
        theme: { skyTop: '#ffb08a', skyBot: '#ffe6c4', hillFar: '#e5a493', hillNear: '#cf8a82', stone: '#4b3a55', stoneLight: '#5d4968', stoneEdge: '#2f2338', grass: '#ffb35c', grassDark: '#d9773a', sun: 'rgba(255, 236, 190, 0.95)', sunGlow: 'rgba(255, 170, 120, 0.35)' },
        signs: [
          { x: 150, y: 372, text: 'Pip: step on your button!' },
          { x: 150, y: 398, text: 'It makes steps for Bo' },
          { x: 810, y: 372, text: 'Bo: climb, then press yours' },
          { x: 810, y: 398, text: 'It makes steps for Pip' },
          { x: 330, y: 96, text: 'Meet at the door!' },
        ],
        lava: { delay: 8, speed: 5 },
        cps: [ // [Pip zones], [Bo zones] — zone 0 (the spawn) is implicit
          [{ c0: 1, c1: 8, r: 9, at: [6,9] }, { c0: 1, c1: 30, r: 3, at: [13,3] }],
          [{ c0: 23, c1: 30, r: 9, at: [25,9] }, { c0: 1, c1: 30, r: 3, at: [18,3] }],
        ],
        strand: [[[17, 5, 30, 15]], [[1, 5, 14, 15]]],   // [Pip boxes], [Bo boxes]: [c0, r0, c1, r1]
        map: [
          '################################', //  0
          '#..............................#', //  1
          '#..............................#', //  2
          '#..............E...i...........#', //  3
          '#==============##==============#', //  4
          '#..............##..............#', //  5
          '#......88......##......44......#', //  6
          '#..............##..............#', //  7
          '#...88.........##.........44...#', //  8
          '#.e............##............h.#', //  9
          '#########......##......#########', // 10
          '#..............##..............#', // 11
          '#.........77...##...33.........#', // 12
          '#..............##..............#', // 13
          '#............77##33............#', // 14
          '#.1...d........##............2.#', // 15
          '################################', // 16
          '################################', // 17
        ] },
      { // ---------- Floor 2: Criss-Cross ----------
        title: 'Criss-Cross',
        tip: 'Press your buttons at the same time, then climb. You pass right through each other’s blocks!',
        theme: { skyTop: '#ff9f7e', skyBot: '#ffdcb4', hillFar: '#e5a493', hillNear: '#cf8a82', stone: '#4b3a55', stoneLight: '#5d4968', stoneEdge: '#2f2338', grass: '#ffb35c', grassDark: '#d9773a', sun: 'rgba(255, 236, 190, 0.95)', sunGlow: 'rgba(255, 170, 120, 0.35)' },
        signs: [
          { x: 480, y: 288, text: 'Jump right through your partner’s color!' },
          { x: 480, y: 166, text: 'Ice pop = frozen lava!' },
        ],
        lava: { delay: 5, speed: 7 },
        cps: [ // [Pip zones], [Bo zones] — zone 0 (the spawn) is implicit
          [{ c0: 14, c1: 15, r: 11, at: [14,11] }, { c0: 26, c1: 30, r: 8, at: [28,8] }, { c0: 8, c1: 23, r: 3, at: [18,3] }],   // + halfway up the stairs
          [{ c0: 16, c1: 17, r: 11, at: [17,11] }, { c0: 1, c1: 5, r: 8, at: [3,8] }, { c0: 8, c1: 23, r: 3, at: [13,3] }],
        ],
        strand: [[], []],   // [Pip boxes], [Bo boxes]: [c0, r0, c1, r1]
        map: [
          '################################', //  0
          '#..............................#', //  1
          '#..............................#', //  2
          '#..............E...............#', //  3
          '#.......================.......#', //  4
          '#.......44............88.......#', //  5
          '#.+.44....................88.+.#', //  6
          '#..............................#', //  7
          '#44.i......................e.88#', //  8
          '######....................######', //  9
          '#.......33............77.......#', // 10
          '#...........33....77...........#', // 11
          '#.............7733.............#', // 12
          '#.........77........33.........#', // 13
          '#.....77................33.....#', // 14
          '#.1.d......................h.2.#', // 15
          '################################', // 16
          '################################', // 17
        ] },
      { // ---------- Floor 3: Hold Tight ----------
        title: 'Hold Tight',
        tip: 'Flat plates only work while you stand on them. Hold on: the lava can’t get you while you hold!',
        theme: { skyTop: '#ff8f74', skyBot: '#ffd2a6', hillFar: '#e5a493', hillNear: '#cf8a82', stone: '#4b3a55', stoneLight: '#5d4968', stoneEdge: '#2f2338', grass: '#ffb35c', grassDark: '#d9773a', sun: 'rgba(255, 236, 190, 0.95)', sunGlow: 'rgba(255, 170, 120, 0.35)' },
        signs: [
          { x: 795, y: 372, text: 'Bo: stay on your plate' },
          { x: 795, y: 398, text: 'while Pip climbs across!' },
          { x: 330, y: 78, text: 'Rumble? The lava jumps up!' },
        ],
        lava: { delay: 5, speed: 2, holds: 'jf', surge: { every: 9, warn: 1.5, time: 0.7, speed: 60 } },
        cps: [ // [Pip zones], [Bo zones] — zone 0 (the spawn) is implicit
          [{ c0: 22, c1: 27, r: 8, at: [24,8] }, { c0: 1, c1: 30, r: 3, at: [18,3] }],
          [{ c0: 4, c1: 9, r: 7, at: [7,7] }, { c0: 1, c1: 30, r: 3, at: [12,3] }],
        ],
        strand: [[[22, 14, 30, 15]], [[1, 14, 9, 15]]],   // [Pip boxes], [Bo boxes]: [c0, r0, c1, r1]
        map: [
          '################################', //  0
          '#..............................#', //  1
          '#..............................#', //  2
          '#...h..........E...............#', //  3
          '#==============##==============#', //  4
          '#..............................#', //  5
          '#55............................#', //  6
          '#............................77#', //  7
          '#...######.............e..f....#', //  8
          '#.....................######...#', //  9
          '#..........444.................#', // 10
          '#.................999..........#', // 11
          '#..............444.............#', // 12
          '#.............999..............#', // 13
          '#..........999.....444.........#', // 14
          '#.1......#............#.j....2.#', // 15
          '##########............##########', // 16
          '##########............##########', // 17
        ] },
      { // ---------- Floor 4: Volcano Top ----------
        title: 'Volcano Top',
        tip: 'Quick turns all the way up. At the top, stand on your star buttons together!',
        theme: { skyTop: '#ff7d63', skyBot: '#ffc895', hillFar: '#e5a493', hillNear: '#cf8a82', stone: '#4b3a55', stoneLight: '#5d4968', stoneEdge: '#2f2338', grass: '#ffb35c', grassDark: '#d9773a', sun: 'rgba(255, 236, 190, 0.95)', sunGlow: 'rgba(255, 170, 120, 0.35)' },
        signs: [
          { x: 480, y: 196, text: 'Leap for an ice pop?' },
          { x: 265, y: 78, text: 'Both stand on' },
          { x: 695, y: 78, text: 'your star buttons!' },
        ],
        lava: { delay: 4, speed: 9 },
        cps: [ // [Pip zones], [Bo zones] — zone 0 (the spawn) is implicit
          [{ c0: 1, c1: 8, r: 11, at: [2,11] }, { c0: 1, c1: 8, r: 7, at: [7,7] }, { c0: 1, c1: 12, r: 3, at: [10,3] }],
          [{ c0: 23, c1: 30, r: 11, at: [29,11] }, { c0: 23, c1: 30, r: 7, at: [24,7] }, { c0: 19, c1: 30, r: 3, at: [21,3] }],
        ],
        strand: [[], []],   // [Pip boxes], [Bo boxes]: [c0, r0, c1, r1]
        map: [
          '################################', //  0
          '#............######............#', //  1
          '#............Y....Y............#', //  2
          '#....y..g....Y.E..Y.......z....#', //  3
          '#============######============#', //  4
          '#..............................#', //  5
          '#.00........................66.#', //  6
          '#.00.f....................m.66.#', //  7
          '#========..............========#', //  8
          '#.........+..........+.........#', //  9
          '#.....88................55.....#', // 10
          '#...e.88................55.i...#', // 11
          '#========..............========#', // 12
          '#..............................#', // 13
          '#.77........................44.#', // 14
          '#.77.1.................h..2.44.#', // 15
          '################################', // 16
          '################################', // 17
        ] },
    ] },
  /* ===== World 6 (Backyard Bash, team + versus): add the level defs here, in order 6-1 Monster Feeding, 6-2 Tug of War, 6-3 Train Tracks, 6-4 Sumo Bounce =====
     world: 5 — see API.md. */
  // 6-1 Monster Feeding (mode 'monster', team): one throws from the kitchen, one catches in a basket and feeds the monster
  {
    name: 'Monster Feeding', world: 5, kind: 'team', mode: 'monster', ownHUD: true, noFalls: true,
    tagLift: 18,   // name tags clear the chef's toque and the catcher's basket
    act: { label: 'throw' },
    // brown earth so the purple monster always stands out; rope = the dot in the "Room N of 4" pill: Munch purple
    theme: { stone: '#6b5a4a', stoneLight: '#7d6a58', stoneEdge: '#4a3c30', rope: '#8f7be8' },
    tip: 'One throws, one catches in the basket. Feed the monster before it gets grumpy!',
    switches: {},
    rooms: [
      {
        title: 'Snack Time', thrower: 0, need: 8, rise: 3.4, throwRange: [150, 560],
        tip: 'Pip throws from the kitchen. Bo catches in the basket and feeds Munch!',
        signs: [{ x: 330, y: 150, text: 'Hold throw, let go. Watch the X!' },
          { x: 560, y: 330, text: 'Catch it, then walk it into the mouth' }],
        switches: {},
        map: [
          '#..............................#',
          '#..............................#',
          '#..............................#',
          '#..............................#',
          '#..............................#',
          '#..............................#',
          '#..............................#',
          '#p1...|........................#',
          '#######........................#',
          '#######........................#',
          '#######........................#',
          '#######........................#',
          '#######........................#',
          '#######........................#',
          '#######........................#',
          '#######.....2...............Z..#',
          '################################',
          '################################',
        ],
      },
      {
        title: 'Picky Eater', thrower: 1, need: 8, rise: 3.5, throwRange: [150, 560],
        bins: ['apple', 'cake', 'fish'], firstWant: 'cake',
        tip: 'Swap! Bo throws. Munch is picky: only feed it the food in its bubble!',
        signs: [{ x: 560, y: 150, text: 'Pick the crate it wants' }],
        switches: {},
        map: [
          '#..............................#',
          '#..............................#',
          '#..............................#',
          '#..............................#',
          '#..............................#',
          '#..............................#',
          '#.......................|.2.fff#',
          '#.......................########',
          '#.......................########',
          '#.......................########',
          '#.......................########',
          '#.......................########',
          '#.......................########',
          '#.........===...........########',
          '#.......................########',
          '#.Z................1....########',
          '################################',
          '################################',
        ],
      },
      {
        title: 'Peek-a-Boo', thrower: 0, need: 9, rise: 4.0, throwRange: [150, 600],
        burrowOrder: [2, 1, 0], gold: true,
        tip: 'Swap! Pip throws. After every meal Munch pops up from another hole!',
        signs: [{ x: 420, y: 100, text: 'Gold cupcake = 2 bites!' }],
        switches: {},
        map: [
          '#..............................#',
          '#..............................#',
          '#..............................#',
          '#..............................#',
          '#..............................#',
          '#p1...|........................#',
          '#######........................#',
          '#######........................#',
          '#######........................#',
          '#######........................#',
          '#######.............h..........#',
          '#######...........######.......#',
          '#######...........######.......#',
          '#######........===######===....#',
          '#######...........######.......#',
          '#######...h...2...######....h..#',
          '################################',
          '################################',
        ],
      },
      {
        title: 'Twin Trouble', thrower: 1, need: [5, 5], rise: 2.8, throwRange: [110, 250], gold: true,
        names: ['Nom', 'Nibble'],
        tip: 'Swap! Bo throws. Twin monsters: keep Nom AND Nibble happy!',
        signs: [{ x: 480, y: 112, text: 'Two mouths to feed!' }],
        switches: {},
        map: [
          '#..............................#',
          '#..............................#',
          '#..............................#',
          '#..............................#',
          '#..............................#',
          '#..............................#',
          '#...........|..2p..|...........#',
          '#...........########...........#',
          '#..............................#',
          '#..............................#',
          '#..............................#',
          '#..............................#',
          '#..............................#',
          '#..............................#',
          '#..............................#',
          '#.Z.........1................Z.#',
          '################################',
          '################################',
        ],
      },
    ],
  },
  {
    name: 'Tug of War', world: 5, kind: 'versus', mode: 'tug',
    match: { bestOf: 5, roundTime: 60 },
    act: { label: 'pull' },
    // jump lets go of the rope here and down does nothing, so the top bar says so (the act line adds "F pull")
    legend: { pip: '<kbd>A</kbd><kbd>D</kbd> move <kbd>W</kbd> let go', bo: '<kbd>←</kbd><kbd>→</kbd> move <kbd>↑</kbd> let go',
      pad: 'stick or d-pad move, <span data-glyph="a"></span> lets go,' },
    stomp: false,                          // the players never meet (a middle line keeps them apart)
    tip: 'Mash pull to tug! Pull on the BOOM for a big heave. Jump off for goodies. Stay out of the mud!',
    switches: {}, signs: [],
    // the field is raised 2 rows (floor surface y 420) so the animal fans fit on a bench below it; crates fall from y 100
    map: [
      '................................', // 0   open sky (crates spawn at y 100)
      '................................', // 1
      '................................', // 2
      '................................', // 3
      '................................', // 4
      '................................', // 5
      '................................', // 6
      '................................', // 7
      '................................', // 8
      '#..............................#', // 9   short garden walls keep free players in (a jump reaches y 311 with the feet)
      '#..............................#', // 10
      '#..............................#', // 11
      '#..............................#', // 12
      '#........1............2........#', // 13  spawns: Pip x 274, Bo x 664 (the mode snaps them to the rope)
      '################################', // 14  floor surface y 420: the mud puddle, the frog and the rope are drawn by the mode
      '################################', // 15  the fans' bench and the tug meter sit on this band
      '################################', // 16
      '################################', // 17
    ],
  },
  { name: 'Train Tracks', world: 5, kind: 'team', mode: 'train', ownStep: true, ownHUD: true, noFalls: true,
    act: { label: 'flip' },
    tip: 'One of you lays track, the other flips levers. Get every passenger to their stop!',
    theme: { grass: '#8fd16f', grassDark: '#5fa858' },   // the mode paints its own rug; this is only for core uses
    legend: { pip: '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> walk', bo: '<kbd>←</kbd><kbd>↑</kbd><kbd>→</kbd><kbd>↓</kbd> walk',
      pad: 'stick or d-pad walk, <span data-glyph="a"></span> or' },
    switches: {}, signs: [],
    stations: {
      A: { name: 'Farm', col: '#c8553d', icon: 'cow' },
      B: { name: 'Castle', col: '#9a6bff', icon: 'castle' },
      C: { name: 'Beach', col: '#f2b630', icon: 'umbrella' },
      D: { name: 'Ice Cream', col: '#ff7fb6', icon: 'cone' },
    },
    rooms: [
      { // Room 1
        title: 'All Aboard', builder: 0, speed: 0.85,
        tip: 'Pip: walk over the dotted squares to lay track. Bo: flip the lever so the dots reach the castle!',
        train: { at: [6, 10], dir: 'N' }, trips: ['B', 'C'],
        junctions: [{ at: [20, 4], stem: 'W', exits: ['E', 'S'], lever: [21, 5] }],
        merges: [{ at: [11, 13], stem: 'W' }],
        signs: [{ x: 330, y: 168, text: 'Walk on the dotted squares!' }, { x: 686, y: 212, text: 'Flip the lever' }, { x: 480, y: 437, text: 'Grab track from the wagon' }],
        map: [
          '################################', //  0
          '#...#..........................#', //  1
          '#.#......#..................#..#', //  2
          '#............A.................#', //  3
          '#.....┌─━━━━────────┬────┐.....#', //  4
          '#.....│.............│Y...┃.....#', //  5
          '#.....│........#....┃....┃...#.#', //  6
          '#.....│.#...........┃....┃.....#', //  7
          '#..#..│.............┃..#.│.....#', //  8
          '#.....│....┌────━━──┘....│C....#', //  9
          '#.....│....│...B.........│.....#', // 10
          '#.....│.12.│.....#.......│.....#', // 11
          '#.....│....│..#..........│..#..#', // 12
          '#.....└────┴─────────────┘.....#', // 13
          '#..............................#', // 14
          '#.#...........#........#.....#.#', // 15
          '#.......#......................#', // 16
          '################################', // 17
        ],
      },
      { // Room 2
        title: 'Junction Jam', builder: 1,
        tip: 'Swap! Bo lays track, Pip flips. Keep both lights green, and shoo away cheeky squirrels!', squirrel: true,
        train: { at: [5, 10], dir: 'N' }, trips: ['A', 'C', 'B'],
        junctions: [{ at: [11, 4], stem: 'W', exits: ['E', 'S'], lever: [10, 5] }, { at: [20, 13], stem: 'E', exits: ['W', 'N'], lever: [21, 12] }],
        merges: [{ at: [11, 13], stem: 'W' }, { at: [20, 4], stem: 'E' }],
        signs: [{ x: 480, y: 437, text: 'Green light = the right way!' }],
        map: [
          '################################', //  0
          '#...#..........................#', //  1
          '#.#.....#...................#..#', //  2
          '#..............................#', //  3
          '#....┌─────┬──━━━━──┬─────┐....#', //  4
          '#....│....Y│........│.....│....#', //  5
          '#....│.....│........│.....│..#.#', //  6
          '#....│.....│...#....│.....│....#', //  7
          '#....│..#..│A.......│..#..│C...#', //  8
          '#.#..│.....┃.......B│.....┃....#', //  9
          '#....│.....┃....#...┃.....┃....#', // 10
          '#..12│.....┃........┃.....┃....#', // 11
          '#....│.....│........┃Y....│..#.#', // 12
          '#....└─────┴────────┴─────┘....#', // 13
          '#..............................#', // 14
          '#.#............#.............#.#', // 15
          '#.......#...............#......#', // 16
          '################################', // 17
        ],
      },
      { // Room 3
        title: 'River Crossing', builder: 0, squirrel: true,
        tip: 'Swap! Pip, build bridges over the river. Bo, walk across Pip’s track to reach the far lever.',
        train: { at: [4, 10], dir: 'N' }, trips: ['B', 'A', 'C'],
        junctions: [{ at: [21, 4], stem: 'W', exits: ['E', 'S'], lever: [22, 5] }, { at: [12, 13], stem: 'E', exits: ['W', 'N'], lever: [13, 12] }],
        merges: [{ at: [24, 13], stem: 'W' }, { at: [8, 4], stem: 'E' }],
        signs: [{ x: 300, y: 437, text: 'Lay track over the water' }],
        map: [
          '################################', //  0
          '#.....#........~~~.............#', //  1
          '#.#.......#....~~~......#....#.#', //  2
          '#..............~~~.............#', //  3
          '#...┌───┬──━━──═══───┬─────┐...#', //  4
          '#...│...│......~~~...│Y....│...#', //  5
          '#...│...│......~~~...│.....┃...#', //  6
          '#...│...│.A....~~~.#.┃.....┃.#.#', //  7
          '#...│...└━━─┐..~~~...┃.....│B..#', //  8
          '#.#.│.......│..~~~...└─━┐..│...#', //  9
          '#...│#......│..~~~....C.│..│...#', // 10
          '#...│.12....│..~~~......│#.│...#', // 11
          '#...│.......│Y.~~~......│..│...#', // 12
          '#...└───────┴──═══──────┴──┘...#', // 13
          '#..............~~~.............#', // 14
          '#.#........#...~~~........#..#.#', // 15
          '#......#.......~~~...#.........#', // 16
          '################################', // 17
        ],
      },
      { // Room 4
        title: 'Falling Down', builder: 1, speed: 1.1, rickety: true, squirrel: true,
        tip: 'Swap! The old bridges fall down after every train. Bo builds them again. Cross on the plank!',
        train: { at: [4, 12], dir: 'N' }, trips: ['B', 'C', 'D', 'A'],
        junctions: [{ at: [10, 4], stem: 'W', exits: ['E', 'S'], lever: [9, 5] }, { at: [21, 13], stem: 'E', exits: ['W', 'N'], lever: [22, 12] }],
        merges: [{ at: [21, 4], stem: 'E' }, { at: [10, 13], stem: 'W' }],
        signs: [{ x: 480, y: 437, text: 'The bridges fall after every train!' }],
        map: [
          '################################', //  0
          '#......#.......................#', //  1
          '#.#..........#....#..........#.#', //  2
          '#..............................#', //  3
          '#...┌─────┬──────────┬─────┐...#', //  4
          '#.#.┃....Y│..........│.....│.#.#', //  5
          '#..A│.....└─━━───────┘.....│...#', //  6
          '#...│..........B...........│...#', //  7
          '#~~~║~~~~~~~=~~~~~~~~~~~~~~║~~~#', //  8
          '#~~~║~~~~~~~=~~~~~~~~~~~~~~║~~~#', //  9
          '#...│...........D..........│...#', // 10
          '#...│.....┌─────━━───┐.....┃C..#', // 11
          '#.#.│.12..│..........│Y....│.#.#', // 12
          '#...└─━━──┴──────────┴──━━─┘...#', // 13
          '#..............................#', // 14
          '#.#............#.............#.#', // 15
          '#.......#...............#......#', // 16
          '################################', // 17
        ],
      },
    ],
  },
  { name: 'Sumo Bounce', world: 5, kind: 'versus', mode: 'sumo',
    match: { bestOf: 7, roundTime: 50 }, act: { label: 'boing' }, ownStep: true,
    tip: 'Bump the other ball into the pool! Your floatie saves you once. Hold down to squat heavy.',
    legend: { pip: '<kbd>A</kbd><kbd>D</kbd> roll <kbd>W</kbd> jump <kbd>S</kbd> squat', bo: '<kbd>←</kbd><kbd>→</kbd> roll <kbd>↑</kbd> jump <kbd>↓</kbd> squat',
      pad: 'stick or d-pad roll, <span data-glyph="a"></span> jump, down squats,' },
    switches: {}, signs: [],
    sumo: { cx: 480, top: 348, R: 700, hw: 280 },   // mat circle cap: centre x, top-surface y, radius, starting half-width
    map: [
      '#..............................#',
      '#..............................#',
      '#..............................#',
      '#..............................#',
      '#..............................#',
      '#..............................#',
      '#..............................#',
      '#..............................#',
      '#..............................#',
      '#...........1......2...........#',
      '#..............................#',
      '#..............................#',
      '#..............................#',
      '#..............................#',
      '#..............................#',
      '#..............................#',
      '#wwwwwwwwwwwwwwwwwwwwwwwwwwwwww#',
      '################################',
    ] },
  /* ===== World 7 (Castle Quest, team + versus finale): add the level defs here, in order 7-1 Cannon Crew, 7-2 Seesaw Climb, 7-3 Laser Vault, 7-4 Bumper Cars =====
     world: 6 — see API.md. */
  { name: 'Cannon Crew', world: 6, kind: 'team', mode: 'cannon', ownStep: true, ownHUD: true, noFalls: true,
    act: { label: 'fire' },
    legend: { pip: '<kbd>A</kbd><kbd>D</kbd> move · power <kbd>W</kbd><kbd>S</kbd> jump · aim', bo: '<kbd>←</kbd><kbd>→</kbd> move · power <kbd>↑</kbd><kbd>↓</kbd> jump · aim',
      pad: 'stick: move or aim, <span data-glyph="a"></span> jump or fire,' },
    tip: 'Take turns: one loads the cannon, one aims and fires (the loader’s fire button just shouts FIRE!). Knock the blocks out from under every flag!',
    switches: {}, signs: [],
    rooms: [
      { title: 'Toy Fort', gunner: 1, par: 3, signs: [],
        act: { label: 'fire', labels: ['shout', 'fire'] },
        tip: 'Pip loads: bring powder and a ball to the cannon. Bo aims and fires at the blocks under the flags!',
        map: [
          '#...............................',
          '#...............................',
          '#...............................',
          '#...............................',
          '#...............................',
          '#...............................',
          '#...............................',
          '#...............................',
          '#...............................',
          '#............................f..',
          '#.......................f....r..',
          '#......2.Y..............r....n..',
          '#.....#####........f....n....n..',
          '#.....#####........r....n...|n..',
          '#..===#####........n..|.n.|.|n..',
          '#iipp1#####........n..|.n.|.|n..',
          '############wwwww###############',
          '################################',
        ] },
      { title: 'Stone Tower', gunner: 0, par: 3, signs: [],
        act: { label: 'fire', labels: ['fire', 'shout'] },
        tip: 'Swap! Pip aims and fires, Bo loads. Stone is tough: big balls from the shelf smash it!',
        map: [
          '#...............................',
          '#...............................',
          '#...............................',
          '#...............................',
          '#...............................',
          '#.......................f.......',
          '#.......................B.......',
          '#gg.pp.................BBB......',
          '####==.................BBB......',
          '#......................BBB......',
          '#...===................BBB......',
          '#......1.Y.............BBB....f.',
          '#.....#####........II..BBB....r.',
          '#.....#####........II..BBB...nn.',
          '#..===#####........II..BBB...nn.',
          '#pp.2.#####........II..BBB...nn.',
          '############wwwww###############',
          '################################',
        ] },
      { title: 'Catapult Keep', gunner: 1, par: 4, signs: [],
        act: { label: 'fire', labels: ['shout', 'fire'] },
        tip: 'Swap! Bo aims and fires, Pip loads. Water balloons incoming: knock out the catapult?',
        map: [
          '#...............................',
          '#...............................',
          '#...............................',
          '#gg.pp..........................',
          '####==..........................',
          '#...............................',
          '#...===.........................',
          '#............................f..',
          '####==.......................B..',
          '#....................f.......B..',
          '#...===..............r.......B..',
          '#......2.Y...........n..CC...B..',
          '#.....#####..........n.____f.B..',
          '#.....#####..........n.I..Ir.B..',
          '#..===#####........|.n.I..In.BB.',
          '#iipp1#####........|.n.I..In.BB.',
          '############wwwww###############',
          '################################',
        ] },
      { title: 'King\u2019s Castle', gunner: 0, par: 5, signs: [], theme: { skyTop: '#f6a97a', skyBot: '#ffe3b8', sun: 'rgba(255, 228, 170, 0.95)', sunGlow: 'rgba(255, 170, 120, 0.4)' },
        act: { label: 'fire', labels: ['fire', 'shout'] },
        tip: 'Swap! Pip aims and fires, Bo loads. Boom balls are up on the bridge: knock off the crown!',
        map: [
          '#...............................',
          '#...............................',
          '#...............................',
          '#gg.pp..m................K......',
          '####=====................B......',
          '#.......................BBB.....',
          '#...===.............f...BBB.....',
          '#...................r...BBB...f.',
          '####==..............B...BBB...r.',
          '#...................B...BBB...B.',
          '#...===.............B...BBB...B.',
          '#......1.Y..........B.f.BBB...B.',
          '#.....#####.........B.r.BBB.n.B.',
          '#.....#####.........B-n-BBB.n.B.',
          '#..===#####.........B|n|BBB|n|B.',
          '#iipp2#####.........B|n|BBB|n|B.',
          '############wwwww###############',
          '################################',
        ] },
    ] },
  {
    name: 'Seesaw Climb', world: 6, kind: 'team', mode: 'seesaw', ownHUD: true,
    tip: 'Jump on the high end to launch your partner. Higher jump, higher flight!',
    rooms: [
      { title: 'Castle Gate', switches: {}, tip: 'Stand on the low end. Your partner jumps on the high end: BOING!',
        theme: { grass: '#9790ad', grassDark: '#57516d' },
        seesaw: { indoor: true, saws: { '12,16': { tilt: -1, goal: 150, top: 270 } }, levers: { '8,5': 'lift 1,6' }, perches: [[4, 8, 6]], rails: [[270, 180, 1], [120, 180, -1, '1,6', false]],
          deco: { windows: [[738, 54, 44, 84], [864, 54, 44, 84]], gate: [846, 318, 72, 132], torches: [[826, 352], [920, 300], [222, 300]],
            banners: [[510, 30, 92, 0], [612, 30, 76, 1], [330, 30, 70, 1]] } },
        signs: [{ x: 375, y: 400, text: 'Sit on the low end' }, { x: 600, y: 200, text: 'Climb up, jump on the high end' }],
        map: [
          '################################',
          '#............$.................#',
          '#..............................#',
          '#..............................#',
          '#..............................#',
          '#...E...Y......................#',
          '#nnn=====......................#',
          '#..............................#',
          '#..............................#',
          '#..............==..............#',
          '#..............................#',
          '#.................==...........#',
          '#..............................#',
          '#....................==........#',
          '#........................1.2...#',
          '#mmm######.....#################',
          '##########..S..#################',
          '################################',
        ] },
      { title: 'Leapfrog Hall', switches: {}, tip: 'Fly up, then jump down on the next seesaw to send your partner higher!',
        theme: { grass: '#9790ad', grassDark: '#57516d' },
        seesaw: { indoor: true, saws: { '19,16': { tilt: -1, goal: 150, top: 270, aim: 1 }, '9,11': { tilt: -1, goal: 110, top: 180 } },
          levers: { '13,5': 'lift 13,10', '5,4': 'lift 1,5' }, perches: [[1, 5, 5], [13, 14, 6, 80]], rails: [[180, 150, 1], [90, 150, -1, '1,5', false]],
          deco: { windows: [[806, 46, 44, 84], [890, 46, 30, 84]], torches: [[290, 196], [610, 236], [910, 300]],
            banners: [[262, 30, 76, 0], [700, 30, 64, 1], [520, 30, 60, 0]] } },
        signs: [{ x: 620, y: 120, text: 'Fly to the lever, then drop on the next seesaw' }],
        map: [
          '################################',
          '#..............................#',
          '#..................$...........#',
          '#..............................#',
          '#..E.Y.........................#',
          '#nn===.......Y.................#',
          '#............==................#',
          '#..............................#',
          '#............==................#',
          '#.....................==.......#',
          '#mm####.....#nn................#',
          '#######..S..#............==....#',
          '#############..................#',
          '#############...............==.#',
          '#############............2.1...#',
          '#############mm##.....##########',
          '#################..S..##########',
          '################################',
        ] },
      { title: 'Bell Tower', switches: {}, tip: 'Ring both bells! Jump just as your partner lands for a SUPER launch.',
        theme: { grass: '#9790ad', grassDark: '#57516d' },
        seesaw: { indoor: true, saws: { '16,16': { tilt: -1, top: 270 } }, levers: {}, perches: [], pumpHint: true, spring: true, bellNoteY: 212, rails: [[420, 90, 1, 'steps'], [330, 210, -1, 'steps'], [420, 210, 1, 'steps'], [330, 150, -1, 'steps'], [420, 150, 1, 'steps']],
          deco: { rose: [770, 120, 46], windows: [[878, 64, 30, 76], [632, 64, 30, 76]], torches: [[60, 290], [930, 290], [300, 400], [690, 400]],
            banners: [[96, 120, 70, 0], [196, 120, 70, 1]] } },
        signs: [{ x: 495, y: 150, text: 'Ring both bells' }],
        map: [
          '################################',
          '#########.........$............#',
          '#########E.....B.B.............#',
          '#########ZZZZZ.................#',
          '#..............................#',
          '#..........ZZZ.................#',
          '#..............................#',
          '#..........ZZZ.................#',
          '#..............................#',
          '#..........===.....===.........#',
          '#..............................#',
          '#........==...........==.......#',
          '#..............................#',
          '#.....==.................==....#',
          '#..1........................2..#',
          '##############.....#############',
          '##############..S..#############',
          '################################',
        ] },
      { title: 'Battlements', switches: {}, tip: 'Only a big launch throws you over the gap. Jump from a high ledge!',
        seesaw: { saws: { '9,12': { tilt: 1, kick: 220, top: 270 }, '21,10': { tilt: 1, goal: 90, top: 210, aim: 1 } },
          levers: { '16,8': 'bridge', '28,3': 'lift 26,4' }, perches: [[16, 18, 9], [26, 30, 4, 80]], cps: [[16, 30, 9, 24, 25]], pumpHint: true,
          rails: [[780, 120, -1, '26,4', true], [840, 120, -1, '26,4', false]],
          deco: { far: true, moat: true, flags: [[762, 270, 0], [906, 270, 1], [198, 330, 1]] } },
        signs: [{ x: 200, y: 160, text: 'Big launch = big throw' }],
        map: [
          '################################',
          '#..............................#',
          '#...........$..................#',
          '#...........................YE.#',
          '#.........................nn===#',
          '#..............................#',
          '#..............................#',
          '#.==.............==............#',
          '#...............Y..............#',
          '#...==..........###.....##mm####',
          '#1.2............###..S..########',
          '#######.....#DDD################',
          '#######..S..#...################',
          '#############...################',
          '#############...################',
          '#############...################',
          '#############...################',
          '#############...################',
        ] },
    ],
  },
  { name: 'Laser Vault', world: 6, kind: 'team', mode: 'laser', ownStep: true, ownHUD: true, noFalls: true,
    act: { label: 'flip' },
    legend: { pip: '<kbd>A</kbd><kbd>D</kbd> move <kbd>W</kbd> jump <kbd>S</kbd> duck · <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> light',
              bo: '<kbd>←</kbd><kbd>→</kbd> move <kbd>↑</kbd> jump <kbd>↓</kbd> duck · arrows light',
              pad: 'stick: move or light, <span data-glyph="a"></span> jump or flip, down ducks,' },
    theme: { skyTop: '#2b2547', skyBot: '#3a3157', hillFar: '#322b50', hillNear: '#2e2849', sun: 'rgba(0,0,0,0)', sunGlow: 'rgba(0,0,0,0)',
      stone: '#4d4570', stoneLight: '#5d5484', stoneEdge: '#2e2849', grass: '#8b80b5', grassDark: '#5f558a' },
    tip: "Win back the king's lost gems! One shines the lantern, one sneaks past the hidden lasers.",
    switches: {}, signs: [],
    rooms: [
      {
        title: 'Peek-a-Beam',
        runner: 0,
        act: { label: 'flip', labels: ['shout', 'flip'] },   // runner shouts, lookout flips (intro + pause cards)
        prize: 'gem',
        known: ['5,14'],
        tip: 'Bo: move the light to find the hidden beams. Pip: jump, duck and sneak to the gem!',
        signs: [],
        map: [
          '################################',
          '################################',
          '###############2################',
          '################################',
          '#......................|.......#',
          '#......................|.......#',
          '#......................|.......#',
          '#......................|.......#',
          '#......................|.......#',
          '#..................%...|.......#',
          '#......................|.......#',
          '#.....$................|..$....#',
          '#.................K...$|.......#',
          '#.........____..####...........#',
          '#1...__.K.----.$####......__.g.#',
          '################################',
          '################################',
          '################################',
        ],
      },
      {
        title: 'Power Box',
        runner: 1,
        act: { label: 'flip', labels: ['flip', 'shout'] },   // runner shouts, lookout flips (intro + pause cards)
        prize: 'emerald',
        banks: [{ id: 'A', box: [3, 7], off: 8, beams: ['9,4'] }, { id: 'B', box: [30, 7], off: 8, beams: ['27,4'] }],
        tip: 'Swap! Bo sneaks, Pip shines. A laser wall? Shine on its box and press flip!',
        signs: [],
        map: [
          '################################',
          '################################',
          '###############1################',
          '################################',
          '#........|.................|...#',
          '#........|.................|...#',
          '#........|.................|...#',
          '#..f.....|............$....|..f#',
          '#........|.................|...#',
          '#........|.................|...#',
          '#........|.........K.__....|...#',
          '#.%..$...|.........#####...|...#',
          '#........|.........#####.$.|...#',
          '#........|..___..#######...|...#',
          '#2..__...|K.---.$#######...|.-g#',
          '################################',
          '################################',
          '################################',
        ],
      },
      {
        title: 'Blink and Climb',
        runner: 0,
        act: { label: 'flip', labels: ['shout', 'flip'] },   // runner shouts, lookout flips (intro + pause cards)
        prize: 'amethyst',
        blink: { '13,7': [1.4, 1.4, 0], '14,7': [1.5, 1.5, 0.7] },
        movers: [{ id: 'bob', c0: 4, c1: 6, y0: 443, y1: 366, period: 2.4, phase: 0 }],
        banks: [{ id: 'C', box: [2, 9], off: 7, beams: ['24,4'] }],
        tip: 'Swap! Pip sneaks, Bo shines. Some beams blink: go while they sleep!',
        signs: [],
        map: [
          '################################',
          '################################',
          '###############2################',
          '################################',
          '#.................$.....|.$....#',
          '#.....................K.|..--g.#',
          '#.................===.##########',
          '#............|---..............#',
          '#............|.K...............#',
          '#.f..........|===..............#',
          '#..........$.|.................#',
          '#............|.................#',
          '#.........===..................#',
          '#..$..................%........#',
          '#1......K......................#',
          '################################',
          '################################',
          '################################',
        ],
      },
      {
        title: 'Crown Room',
        runner: 1,
        act: { label: 'flip', labels: ['flip', 'shout'] },   // runner shouts, lookout flips (intro + pause cards)
        prize: 'crown',
        spinners: [{ id: 'spin', x: 600, y: 330, len: 120, speed: 0.85, arms: 2, phase: 0 }],
        banks: [{ id: 'A', box: [29, 5], off: 7, beams: ['15,4'] }],
        alarm: { beams: ['4,14', '4,13', '22,4'], blinkMul: 1.25 },
        tip: 'Swap! Bo sneaks, Pip shines. Grab the crown, then run back out!',
        signs: [],
        map: [
          '################################',
          '################################',
          '###############1################',
          '################################',
          '#..............|......|........#',
          '#..............|......|......f.#',
          '#..............|......|......|.#',
          '#..............|......|......|.#',
          '#..............|......|......|.#',
          '#..............|......|......|.#',
          '#..............|......|......|.#',
          '#..........$...|....%.|..$.....#',
          '#..............|......|........#',
          '#...__$........|............$..#',
          '#x2.--....__...|K......K.__...g#',
          '################################',
          '################################',
          '################################',
        ],
      },
    ],
  },
  { name: 'Bumper Cars', world: 6, kind: 'versus', mode: 'bumper', ownStep: true,
    match: { bestOf: 7, roundTime: 60 },
    act: { label: 'boost', padGlyph: 'a' },   // padGlyph: the intro card names A on a controller (see the note in mode.js)
    legend: { pip: '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> drive', bo: '<kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd> drive',
      pad: 'stick: drive, <span data-glyph="a"></span> boost,' },
    tip: 'Drive into the other car and bump it into the moat! Hit with your nose. Boost to ram!',
    switches: {}, signs: [],
    map: [
      'tWWWWWWWWWWWWWWggWWWWWWWWWWWWWWt',
      'W~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~W',
      'W~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~W',
      'W~~~~++++++++++++++++++++++~~~~W',
      'W~~~++++++++++++++++++++++++~~~W',
      'W~~++++++++++++++++++++++++++~~W',
      'W~~++++++++++++++++++++++++++~~W',
      'W~~++++++++++++++++++++++++++~~W',
      'W~~+++++1++++++++++++++2+++++~~W',
      'W~~++++++++++++++++++++++++++~~W',
      'W~~++++++++++++++++++++++++++~~W',
      'W~~++++++++++++++++++++++++++~~W',
      'W~~~++++++++++++++++++++++++~~~W',
      'W~~~~++++++++++++++++++++++~~~~W',
      'W~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~W',
      'W~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~W',
      ',,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,',
      ',,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,',
    ],
  },
  /* ===== World 8 (Lucky Casino, team + versus): add the level defs here, in order 8-1 Plinko Drop, 8-2 Roulette Wheel, 8-3 Slot Machine Run, 8-4 Coin Pusher =====
     world: 7 — see API.md. */
  { name: 'Plinko Drop', world: 7, kind: 'team', mode: 'plinko', ownStep: true, ownHUD: true,
    noFalls: true, noTime: true,   // (review) scored in stars: no Time / Record tiles once the framework reads def.noTime (engine note)
    tip: 'Take turns: one of you is the chip, the other kicks it with the paddles. Aim for the JACKPOT!',
    legend: { pip: '<kbd>A</kbd><kbd>D</kbd> move <kbd>W</kbd> hop · kick <kbd>S</kbd> drop',
      bo: '<kbd>←</kbd><kbd>→</kbd> move <kbd>↑</kbd> hop · kick <kbd>↓</kbd> drop',
      pad: 'stick or d-pad move, <span data-glyph="a"></span> hop · kick, down drops,' },
    switches: {}, signs: [],
    rooms: [
      { title: 'Classic Plinko', tip: 'Chip: ◀ ▶ roll, ▼ drop. Paddles: catch the chip on the shiny end. It kicks to the JACKPOT!',
        jackpot: { fixed: 6 }, stars: [200, 700, 1300], luckyAfter: 1,   // the world's opener: lucky paddles after 1 miss; (review) ★ at 200
        coach: [{ x: 330, y: 232, text: 'Land on the shiny end: it kicks you that way!' }, { x: 600, y: 375, text: 'Last paddle! Then lean into the JACKPOT' }],
        map: [
          '################################',
          '################################',
          '#..............................#',
          '#.1......2.....................#',
          '#..p.p.p.p.p.p.p.p.p.p.p.p.p.p.#',
          '#.p.p.p.p.p.p.p.p.p.p.p.p.p.p..#',
          '#..p.p.p.p.p.p.p.p.p.p.p.p.p.p.#',
          '#..............................#',
          '#.........$.........$..........#',
          '#.-------------................#',
          '#.p.p.p.p.p.p.p.p.p.p.p.p.p.p..#',
          '#..p.p.p.p.p.p.p.p.p.p.p.p.p.p.#',
          '#..............................#',
          '#..............$...............#',
          '#...........-------------......#',
          '#...|..|..|..|..|..|..|..|..|..#',
          '#...|..|..|..|..|..|..|..|..|..#',
          '################################',
        ] },
      { title: 'Bumper Lights', tip: 'The JACKPOT moves every drop. Pop all 3 bumpers in one drop for +50!', jackpot: { perDrop: [1, 8, 2, 7] }, stars: [400, 900, 1500],
        map: [
          '################################',
          '################################',
          '#..............................#',
          '#...........1......2...........#',
          '#..p.p.p.p.............p.p.p.p.#',
          '#.p.p.p.p...B...B...B...p.p.p..#',
          '#..p.p.p.p.............p.p.p.p.#',
          '#..............................#',
          '#...$......................$...#',
          '#.....--------------------.....#',
          '#.p.p.p.p.p.p.p.p.p.p.p.p.p.p..#',
          '#..p.p.p.p.p.p.p.p.p.p.p.p.p.p.#',
          '#..............................#',
          '#..............................#',
          '#.----------------------------.#',
          '#...|..|..|..|..|..|..|..|..|..#',
          '#...|..|..|..|..|..|..|..|..|..#',
          '################################',
        ] },
      { title: 'Jackpot Express', tip: 'The JACKPOT light runs back and forth. It stops when the chip passes the top paddle!', jackpot: { move: { from: 1, to: 8, step: 0.7, lockRail: 0 } }, stars: [300, 750, 1300],
        map: [
          '################################',
          '################################',
          '#..............................#',
          '#.....................1......2.#',
          '#..p.p.p.p.p.p.p.p.p.p.p.p.p.p.#',
          '#.p.p.p.p.p.p.p.p.p.p.p.p.p.p..#',
          '#..p.p.p.p.p.p.p.p.p.p.p.p.p.p.#',
          '#..............................#',
          '#.......$.......x..............#',
          '#................-------------.#',
          '#.p.p.p.p.p.p.p.p.p.p.p.p.p.p..#',
          '#..p.p.p.p.p.p.p.p.p.p.p.p.p.p.#',
          '#..............................#',
          '#......................$.......#',
          '#...------------------------...#',
          '#...|..|..|..|..|..|..|..|..|..#',
          '#...|..|..|..|..|..|..|..|..|..#',
          '################################',
        ] },
    ],
  },
  { name: 'Roulette Wheel', world: 7, kind: 'versus', mode: 'roulette', ownStep: true,
    match: { bestOf: 5 },
    act: { label: 'bump' },
    legend: { pip: '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> run', bo: '<kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd> run',
      pad: 'stick: run, <span data-glyph="a"></span> or' },   // + the framework's act key: "A or X bump"
    tip: 'Run to the color the ball lands on! Closest to the ball at LOCK wins a chip. First to 3 chips wins!',
    switches: {}, signs: [],
    map: [
      '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
      'v..............................v',
      'v..............................v',
      'v........fffffddddfffff........v',
      'v......fffddddddddddddfff......v',
      'v....fffddddddddddddddddfff....v',
      'v...fffddddddddddddddddddfff...v',
      'v..fffddddddddddddddddddddfff..v',
      'v..ffddddddddddddddddddddddff..v',
      'v.fffdddd1dddddddddddd2ddddfff.v',
      'v.fffdddddddddddyddddddddddfff.v',
      'vppffddddddddddddddddddddddffqqv',
      'vppffddddddddddddddddddddddffqqv',
      'vppfffddddddddddddddddddddfffqqv',
      'vpp.fffddddddddddddddddddfff.qqv',
      'vpp..ffffddddddddddddddffff..qqv',
      'v......fffffddddddddfffff......v',
      'v.........ffffffffffff.........v',
    ] },
  { name: 'Slot Machine Run', world: 7, kind: 'team', mode: 'slots', ownHUD: true,
    act: { label: 'stop' },
    legend: { pip: '<kbd>A</kbd><kbd>D</kbd> move <kbd>W</kbd> jump', bo: '<kbd>←</kbd><kbd>→</kbd> move <kbd>↑</kbd> jump',
      pad: 'stick or d-pad move, <span data-glyph="a"></span> jump,' },   // (rev2) nothing drops here: no 'S drop' / 'down drops'
    tip: 'One stops the reels, one hops across on the pictures. Reach the JACKPOT ledge!',
    switches: {}, signs: [],
    rooms: [
      { title: 'First Spin', stopper: 1, act: { label: 'stop', labels: ['shout', 'stop'] }, tip: 'Bo: stand under a reel and press stop. Pip: hop across on the pictures!', switches: {}, signs: [],
        slots: { speed: 1.2, holdT: null, reels: [{ strip: 'B7BbLB' }, { strip: 'BLBb7B' }, { strip: 'B7LBbB' }] },
        map: [
          '################################',
          '#..............................#',
          '#..............................#',
          '#..............................#',
          '#.............$................#',
          '#..............................#',
          '#..........$....$.....$........#',
          '#.......ZZZ..ZZZ..ZZZ..........#',
          '#.......ZZZ..ZZZ..ZZZ..........#',
          '#..1....ZZZ..ZZZ..ZZZ..j....E..#',
          '######..ZZZ..ZZZ..ZZZ..#########',
          '######..ZZZ..ZZZ..ZZZ..#########',
          '######..ZZZ..ZZZ..ZZZ..#########',
          '#####################..#########',
          '######.................#########',
          '######.................#########',
          '######....2...........S#########',
          '################################',
        ] },
      { title: 'Super Sevens', stopper: 0, act: { label: 'stop', labels: ['stop', 'shout'] }, tip: 'Swap! Pip stops, Bo hops. A tall 7 is a step up to the balcony!', switches: {}, signs: [],
        slots: { speed: 1.6, holdT: 10, reels: [{ strip: 'B7bBLB' }, { strip: 'B7LbB7LB', need: '7' }, { strip: 'B7bBLB' }, { strip: 'BL7bBL7B', need: '7' }] },
        map: [
          '################################',
          '#..............................#',
          '#..............................#',
          '#................$.....$...j.E.#',
          '#............$.............#####',
          '#..............C...ZZZ..ZZZ#####',
          '#........$....###..ZZZ..ZZZ#####',
          '#.....ZZZ.ZZZ.###..ZZZ..ZZZ#####',
          '#.....ZZZ.ZZZ.###..ZZZ..ZZZ#####',
          '#2....ZZZ.ZZZ.###..ZZZ..ZZZ#####',
          '###...ZZZ.ZZZ.###..ZZZ..ZZZ#####',
          '###...ZZZ.ZZZ.###..........#####',
          '###...ZZZ.ZZZ.###..........#####',
          '##########################.#####',
          '###........................#####',
          '###........................#####',
          '###.....1.................S#####',
          '################################',
        ] },
      { title: 'Cherry Hill', stopper: 1, act: { label: 'stop', labels: ['shout', 'stop'] }, tip: 'Swap! Bo stops, Pip hops. Cherries bounce you sky high!', switches: {}, signs: [],
        slots: { speed: 2.0, holdT: 8, reels: [{ strip: 'B7bBLB' }, { strip: 'CBLbCB7L', need: 'C' }, { strip: 'BbBLBL' }, { strip: 'CBLCbL7B', need: 'C' }] },
        map: [
          '################################',
          '#..............................#',
          '#.............$................#',
          '#..............ZZZ......$.j..E.#',
          '#..............ZZZ...$....######',
          '#..............ZZZ........######',
          '#........$.....ZZZ........######',
          '#.....ZZZ..ZZZ.ZZZ.....ZZZ######',
          '#.....ZZZ..ZZZ.ZZZ.....ZZZ######',
          '#.1...ZZZ..ZZZ.........ZZZ######',
          '####..ZZZ..ZZZ.........ZZZ######',
          '####..ZZZ..ZZZ.........ZZZ######',
          '####..ZZZ..ZZZ.........ZZZ######',
          '#########################.######',
          '####......................######',
          '####......................######',
          '####....2................S######',
          '################################',
        ] },
      { title: 'Turbo Spin', stopper: 0, act: { label: 'stop', labels: ['stop', 'shout'] }, tip: 'Swap! Pip stops, Bo hops. Super fast reels! Jump, then stop the reel under Bo!', switches: {}, signs: [],
        slots: { speed: 2.8, holdT: 2.5, reels: [{ strip: 'B7BbLB' }, { strip: 'BbB7LB' }, { strip: 'B7LBbB' }, { strip: 'BLB7bB' }] },
        map: [
          '################################',
          '#..............................#',
          '#..............................#',
          '#..............................#',
          '#...........$..................#',
          '#..............................#',
          '#........$....$....$...........#',
          '#.....ZZZ..ZZZ..ZZZ..ZZZ.......#',
          '#.....ZZZ..ZZZ..ZZZ..ZZZ.......#',
          '#.2...ZZZ..ZZZ..ZZZ..ZZZ..j..E.#',
          '####..ZZZ..ZZZ..ZZZ..ZZZ..######',
          '####..ZZZ..ZZZ..ZZZ..ZZZ..######',
          '####..ZZZ..ZZZ..ZZZ..ZZZ..######',
          '########################..######',
          '####......................######',
          '####......................######',
          '####...1.................S######',
          '################################',
        ] },
      { title: 'Topsy Turvy', stopper: 1, act: { label: 'stop', labels: ['shout', 'stop'] }, tip: 'Swap! Bo stops, Pip hops. Two reels spin upward: watch below the line!', switches: {}, signs: [],
        slots: { speed: 2.4, holdT: 6, reels: [{ strip: 'B7LbBL' }, { strip: 'B7LBL7bL', need: '7' }, { strip: 'BLbBLB', dir: -1 }, { strip: 'CLBbLCL7', need: 'C', dir: -1 }] },
        map: [
          '################################',
          '#..............................#',
          '#..............................#',
          '#............$ZZZ.....$.j...E..#',
          '#.............ZZZ.$.....########',
          '#........$ZZZ.ZZZ.......########',
          '#.........ZZZ.ZZZ.......########',
          '#.....ZZZ.ZZZ.ZZZ....ZZZ########',
          '#.....ZZZ.ZZZ.ZZZ....ZZZ########',
          '#.1...ZZZ.ZZZ........ZZZ########',
          '####..ZZZ.ZZZ........ZZZ########',
          '####..ZZZ............ZZZ########',
          '####..ZZZ............ZZZ########',
          '#######################.########',
          '####....................########',
          '####....................########',
          '####...2...............S########',
          '################################',
        ] },
      { title: 'Grand Jackpot', stopper: 0, act: { label: 'stop', labels: ['stop', 'shout'] }, tip: 'Swap! Pip stops, Bo hops. Everything at once: go for the GRAND JACKPOT!', switches: {}, signs: [],
        slots: { speed: 2.6, holdT: 5, reels: [{ strip: 'B7bBLB', dir: -1 }, { strip: 'CBLbCB7L', need: 'C' }, { strip: 'BLbBLB', dir: -1 }, { strip: 'BbLBBL' }, { strip: 'CLBbLCL7', need: 'C', dir: -1 }] },
        map: [
          '################################',
          '#..............................#',
          '#............$.............$.j.#',
          '#.............ZZZ..$....$....E.#',
          '#.............ZZZ....ZZZ.....###',
          '#.............ZZZ....ZZZ.....###',
          '#.............ZZZ....ZZZ.....###',
          '#.....ZZZ$ZZZ.ZZZ....ZZZ..ZZZ###',
          '#.....ZZZ.ZZZ.ZZZ....ZZZ..ZZZ###',
          '#2....ZZZ.ZZZ........ZZZ..ZZZ###',
          '###...ZZZ.ZZZ.............ZZZ###',
          '###...ZZZ.ZZZ.............ZZZ###',
          '###...ZZZ.ZZZ.............ZZZ###',
          '############################.###',
          '###..........................###',
          '###..........................###',
          '###.....1...................S###',
          '################################',
        ] },
    ] },
  {
    name: 'Coin Pusher', world: 7, kind: 'versus', mode: 'coin',
    match: { bestOf: 5, roundTime: 60 },
    act: { label: 'coin', labels: ['put a coin in', 'put a coin in'] },
    tip: 'Grab coins, then put them in on your color of glass. The pusher shoves them into your tube!',
    switches: {}, signs: [],
    map: [
      '................................', // 0
      '................................', // 1
      '................................', // 2
      '...............f................', // 3  f = Coin Fountain nozzle (bottom right corner of the tile: x 480, y 120)
      '................................', // 4
      '......=====..........=====......', // 5  high planks y 150
      '................................', // 6
      '................................', // 7
      '..=====....==========....=====..', // 8  low planks y 240
      '................................', // 9
      '.1............................2.', // 10 spawns on the tube tops
      '#########$$$$$$$$$$$$$$#########', // 11 cabinet top = floor y 330; $ = glass coin strip x 270..690 (solid)
      '................................', // 12 the cabinet below is drawn by the mode (opaque); nothing ever goes below y 330,
      '................................', // 13 so these rows stay empty and the framework draws no hidden tiles
      '................................', // 14
      '................................', // 15
      '................................', // 16
      '................................', // 17
    ],
  },
  /* ===== World 9 (Great Escapes, team): historic natural disasters, kept light and cartoony. Levels in order
     9-1 Pompeii Escape, 9-2 San Francisco 1906 Quake, 9-3 Ice Age Glacier, 9-4 Krakatoa Ash Run (Gavyn's picks and order).
     Each level's def sits between its own BEGIN/END lines. world: 8 ===== */
  // ----- BEGIN 9-1 Pompeii Escape (mode 'pompeii', js/levels/world9/pompeii-escape.js) -----
  // 9-1 Pompeii Escape (mode 'pompeii', team): boost each other up the walls, then reach down from the edge (help)
  // and pull your partner up; lava creeps in sideways, ash makes you sneeze. Map chars and rules: the top of the file.
  { name: 'Pompeii Escape', world: 8, kind: 'team', mode: 'pompeii', ownHUD: true, noFalls: true,
    act: { label: 'help' },
    legend: { down: 'hold: hop back', padDown: 'hold down: hop back' },
    tip: 'Boost each other up the walls, then press help at the edge to pull your partner up. Run to the boat!',
    switches: {}, signs: [],
    rooms: [
      { // ---------- Room 1: Market Square (learn the boost and the hand-up) ----------
        title: 'Market Square', bg: 'town', leads: [0, 1], awnB: [58, 70], exitLabel: 'PORTA MARINA',
        tip: 'Bo, be the step! Pip hops on Bo’s head, jumps up, then presses help at the edge to pull Bo up.',
        lava: { delay: 4, speed: 10, caps: [6, 12, 20] }, ash: { every: 2.6, aim: 0.4 },
        boards: [{ x: 420, y: 420, text: 'POMPEII', size: 26, paint: true }, { x: 420, y: 448, text: '79 AD', size: 17, paint: true },
          { x: 600, y: 300, text: 'Swap jobs!', size: 18, paint: true }],
        switches: {}, signs: [],
        map: [
          '................................', //  0
          '................................', //  1
          '................................', //  2
          '................................', //  3
          '................................', //  4
          '................................', //  5
          '................................', //  6
          '.................!..N...........', //  7
          '.................qqqqqq.........', //  8
          '.................qqqqqq.........', //  9
          '.................qqqqqq.........', // 10
          '...........!..N..qqqqqq.........', // 11
          '...........hhhhhhqqqqqq.........', // 12
          '....AAA....hhhhhhqqqqqq.AAA.....', // 13
          '...........hhhhhhqqqqqq.........', // 14
          '.1.2.......hhhhhhqqqqqq.....E...', // 15
          '################################', // 16
          '################################', // 17
        ] },
      { // ---------- Room 2: Forum Columns (ride the wobbly column over the lava river, then the podium and the temple) ----------
        title: 'Forum Columns', bg: 'forum', leads: [1, 0, 1], exitLabel: 'VIA ABBONDANZA',
        tip: 'Climb the wobbly column together to ride it over the lava, then help each other up the temple steps!',
        lava: { delay: 3, speed: 12, caps: [4, 15, 15, 15] }, ash: { every: 2.2, aim: 0.5 },
        boards: [{ x: 810, y: 400, text: 'FORUM', size: 30, carve: true }, { x: 870, y: 246, text: 'APOLLO', size: 18, carve: true }],
        switches: {}, signs: [],
        map: [
          '................................', //  0
          '................................', //  1
          '................................', //  2
          '................................', //  3
          '................................', //  4
          '..........................!N.E..', //  5
          '..........................mmmmmm', //  6
          '..........................mmmmmm', //  7
          '..........................mmmmmm', //  8
          '......................!.N.mmmmmm', //  9
          '.........!............mmmmmmmmmm', // 10
          '.........KK...........mmmmmmmmmm', // 11
          '.........KK...........mmmmmmmmmm', // 12
          '.........KK.....N.....mmmmmmmmmm', // 13
          '.........KK.....mm~~mmmmmmmmmmmm', // 14
          '.2.1.....KK.....mm~~mmmmmmmmmmmm', // 15
          'mmmmmmmmmmm~~~~~mmmmmmmmmmmmmmmm', // 16
          'mmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmm', // 17
        ] },
      { // ---------- Room 3: Rooftop Run (an awning bounce over a lava stream, two houses and a tall tower) ----------
        title: 'Rooftop Run', bg: 'town', leads: [0, 1, 0], awnB: [90], exitLabel: 'TO THE HARBOR',
        tip: 'Bounce on the awning over the hot stream, then help each other up two houses and the tall tower!',
        lava: { delay: 2, speed: 16, caps: [1, 15, 20, 26] }, ash: { every: 1.8, aim: 0.5 },
        boards: [{ x: 705, y: 340, text: 'CAVE CANEM', size: 14, paint: true, dog: true }],
        switches: {}, signs: [],
        map: [
          '................................', //  0
          '................................', //  1
          '................................', //  2
          '................................', //  3
          '..........................!.N...', //  4
          '..........................hhh...', //  5
          '..........................hhh...', //  6
          '..........................hhh...', //  7
          '.....................!..N.hhh...', //  8
          '.....................vvvvvhhh...', //  9
          '.....................vvvvvhhh...', // 10
          '.....!..N............vvvvvhhh...', // 11
          '.....hhhhhh.......N..vvvvvhhh...', // 12
          '.....hhhhhh.....qqqqqvvvvvhhh...', // 13
          '.....hhhhhhAAAAAqqqqqvvvvvhhh...', // 14
          '.1.2.hhhhhh.....qqqqqvvvvvhhhE..', // 15
          '###########~~~~~################', // 16
          '################################', // 17
        ] },
      { // ---------- Room 4: Harbor (push the cart to the ship together, climb aboard, sail away) ----------
        title: 'Harbor', bg: 'harbor', leads: [1, 0],
        tip: 'Push the cart to the ship together (it’s too heavy for one!), then hop on deck. All aboard!',
        lava: { delay: 2, speed: 15, caps: [1, 'cart', 16, 20] }, ash: { every: 1.9, aim: 0.5 },
        boards: [{ x: 225, y: 450, text: 'TO THE SHIP →', size: 13, sign: true }],
        switches: {}, signs: [],
        map: [
          '................................', //  0
          '................................', //  1
          '................................', //  2
          '................................', //  3
          '................................', //  4
          '................................', //  5
          '................................', //  6
          '................................', //  7
          '....................!...........', //  8
          '....................BBBBBBBBBBBB', //  9
          '....................BBBBBBBBBBBB', // 10
          '.....!.N............BBBBBBBBBBBB', // 11
          '.....jjjjj..........BBBBBBBBBBBB', // 12
          '.....jjjjj..........BBBBBBBBBBBB', // 13
          '.....jjjjj..YY......BBBBBBBBBBBB', // 14
          '.2.1.jjjjj..YY.....yBBBBBBBBBBBB', // 15
          '##########ddddddddddBBBBBBBBBBBB', // 16
          '##########ddddddddddBBBBBBBBBBBB', // 17
        ] },
    ] },
  // ----- END 9-1 Pompeii Escape -----

  // ----- BEGIN 9-2 San Francisco 1906 Quake (mode 'quake', js/levels/world9/san-francisco-quake.js) -----
  // 9-2 (MODES.quake): two streets, one each; the bridge over a crack in your street is held from the OTHER street
  // (a rope from above, a prop pole from below), so the two leapfrog. Map markers, parsed by the mode:
  //   ~ crack with a plank bridge, _ crack with a cable car (top row of a street band, rows 8-9 and 16-17)
  //   h crank: holds the bridge over the crack in the other street right above / below it   x crate on a plank
  //   D drop gate (solid until every crossing is done, then the upper player drops down to the door)
  { name: 'San Francisco 1906 Quake', world: 8, kind: 'team', mode: 'quake', ownHUD: true,
    act: { label: 'hold' },
    legend: { pip: '<kbd>A</kbd><kbd>D</kbd> move · balance <kbd>W</kbd> jump', bo: '<kbd>←</kbd><kbd>→</kbd> move · balance <kbd>↑</kbd> jump',
      pad: 'stick or d-pad move · balance, <span data-glyph="a"></span> jump,' },
    tip: 'Hold up the wobbly bridge for each other: hold the action at the crank and keep the ball in the green!',
    switches: {}, signs: [],
    rooms: [
      { title: 'Nob Hill', deco: 'nob', quake: { amp: 1.4, calm: [5.5, 7.5], len: [2.4, 3.0] },
        tip: 'Stand on your crank and hold the action button. Keep the ball in the green while your partner crosses!',
        map: [
          '................................',  // 0
          '................................',  // 1
          '................................',  // 2
          '................................',  // 3
          '................................',  // 4
          '................................',  // 5
          '................................',  // 6
          '.1.....h.........h..............',  // 7
          '#########~~~~~~~###~~~~~~~####DD',  // 8
          '#########~~~~~~~###~~~~~~~####DD',  // 9
          '................................',  // 10
          '................................',  // 11
          '................................',  // 12
          '................................',  // 13
          '................................',  // 14
          '.2..........h.........h....E....',  // 15
          '####~~~~~~~###~~~~~~~###########',  // 16
          '####~~~~~~~###~~~~~~~###########',  // 17
        ] },
      { title: 'Cable Car Line', deco: 'cable', quake: { amp: 1.7, calm: [5, 7], len: [2.6, 3.2] },
        tip: 'Hop in the cable car! The one at the crank holds the action button and pushes right to pull it across.',
        map: [
          '................................',  // 0
          '................................',  // 1
          '................................',  // 2
          '................................',  // 3
          '................................',  // 4
          '................................',  // 5
          '................................',  // 6
          '.2.....h.........h..............',  // 7
          '#########~~~~~~~###~~~~~~~####DD',  // 8
          '#########~~~~~~~###~~~~~~~####DD',  // 9
          '................................',  // 10
          '................................',  // 11
          '................................',  // 12
          '................................',  // 13
          '................................',  // 14
          '.1..........h.........h....E....',  // 15
          '####~~~~~~~###_______###########',  // 16
          '####~~~~~~~###_______###########',  // 17
        ] },
      { title: 'Market Street', deco: 'market', quake: { amp: 1.9, calm: [4.5, 6.5], len: [2.8, 3.4] },
        tip: 'Crates slide when the bridge tips! Hop over them, push them, or tip the bridge to slide them off.',
        map: [
          '................................',  // 0
          '................................',  // 1
          '................................',  // 2
          '................................',  // 3
          '................................',  // 4
          '................................',  // 5
          '................................',  // 6
          '.2......x...h..x...x..h.........',  // 7
          '####~~~~~~~###~~~~~~~#########DD',  // 8
          '####~~~~~~~###~~~~~~~#########DD',  // 9
          '................................',  // 10
          '................................',  // 11
          '................................',  // 12
          '................................',  // 13
          '................................',  // 14
          '.1.....h...x.....h.....x...E....',  // 15
          '#########~~~~~~~###~~~~~~~######',  // 16
          '#########~~~~~~~###~~~~~~~######',  // 17
        ] },
      { title: 'The Ferry Building', deco: 'ferry', quake: { amp: 2.2, calm: [4, 6], len: [3.0, 3.6] },
        tip: 'The biggest rumbles yet! Keep the ball in the green, then ride the cable car to the ferry.',
        map: [
          '................................',  // 0
          '................................',  // 1
          '................................',  // 2
          '................................',  // 3
          '................................',  // 4
          '................................',  // 5
          '................................',  // 6
          '.1.......x..h...x.....h.........',  // 7
          '####~~~~~~~###~~~~~~~#########DD',  // 8
          '####~~~~~~~###~~~~~~~#########DD',  // 9
          '................................',  // 10
          '................................',  // 11
          '................................',  // 12
          '................................',  // 13
          '................................',  // 14
          '.2.....h......x..h.........E....',  // 15
          '#########~~~~~~~###_______######',  // 16
          '#########~~~~~~~###_______######',  // 17
        ] },
    ],
  },
  // ----- END 9-2 San Francisco 1906 Quake -----

  // ----- BEGIN 9-3 Ice Age Glacier (mode 'glacier', js/levels/world9/ice-age-glacier.js) -----
  { name: 'Ice Age Glacier', world: 8, kind: 'team', mode: 'glacier', ownStep: true, ownHUD: true, noFalls: true,
    // side-on ice-floe run (MODES.glacier): the map is only the two spawns, the mode builds each room from its course
    legend: {
      pip: '<kbd>A</kbd><kbd>D</kbd> slow · fast <kbd>W</kbd> hop <kbd>S</kbd> duck',
      bo: '<kbd>←</kbd><kbd>→</kbd> slow · fast <kbd>↑</kbd> hop <kbd>↓</kbd> duck',
      pad: 'stick ◀ ▶ slow · fast, <span data-glyph="a"></span> hop, down ducks,',
    },
    tip: 'Ride one ice floe down the glacier! One steers, one hops and ducks. Each crack swaps your jobs.',
    theme: { skyTop: '#7ec8f7', skyBot: '#eef9ff', hillFar: '#cfe2f3', hillNear: '#e3f3fc', grass: '#ffffff', grassDark: '#bfe3f7',
      sun: 'rgba(255, 253, 235, 0.95)', sunGlow: 'rgba(255, 255, 245, 0.4)' },
    switches: {}, signs: [],
    rooms: [
      {
        title: 'Top of the Glacier', steer: 0,
        tip: 'Pip steers: ◀ slow, ▶ fast. Bo hops the cracks ▲ and ducks the icicles ▼. Wheee!',
        course: ['r400', 'D:hist', 'r320', 'D:tree', 'S:{H}: hop the cracks!', 'r300', 'f4', 'r200', 'g70', 'r320', 'f5', 'r260', 'g80', 'r340',
          'S:Bumps! {S}: go SLOW', 'r380', 'm4', 'r340', 'h4', 'r240', 'D:owl', 'r200', 'S:Icicles! {H}: duck', 'r360', 'a', 'r300', 'f5', 'r240',
          'S:Big gap! {S}: go FAST', 'r420', 'h3', 'G150', 'r380', 'g80', 'r300', 'm3', 'r460', 'a', 'r320', 'D:tree', 'f4', 'r220', 'G160',
          'r320', 'D:sloth', 'r220', 'a', 'r260', 'o', 'r260', 'X'],
        switches: {}, signs: [],
        map: [
          '................................', '................................', '................................',
          '................................', '................................', '................................',
          '................................', '................................', '................................',
          '................................', '................................', '................................',
          '................................', '................................', '................................',
          '..1.2...........................', '................................', '................................',
        ],
      },
      {
        title: 'Mammoth Meadow', steer: 1, herd: true,
        tip: 'Swap! Bo steers now and Pip hops. Big gaps need FAST, bumps need SLOW. Forks: ▲ high road, ▼ low road!',
        course: ['r480', 'D:mammoth', 'r150', 'f4', 'r150', 'g80', 'r300', 'm4', 'r460', 'G160', 'r320', 'a', 'r260', 'h4', 'r220', 'g90', 'r360',
          { up: ['r200', 'f5', 'r260', 'a', 'r200', 'h4', 'r200', 'o', 'r200'], down: ['r180', 'm4', 'r300', 'g80', 'r280', 'f4', 'r200'] },
          'r360', 'G170', 'r340', 'm3', 'r400', 'a', 'r240', 'g80', 'r280', 'D:mammoth', 'f5', 'r460', 'G160', 'r340', 'X'],
        switches: {}, signs: [],
        map: [
          '................................', '................................', '................................',
          '................................', '................................', '................................',
          '................................', '................................', '................................',
          '................................', '................................', '................................',
          '................................', '................................', '................................',
          '..1.2...........................', '................................', '................................',
        ],
      },
      {
        title: 'Sabre-tooth Snooze', steer: 0,
        tip: 'Pip steers again! Shh, a sabre-tooth cat is napping. Tiptoe past, and pick a road at the fork.',
        course: ['r520', 'D:cat', 'r280', 'g90', 'r280', 'a', 'r280', 'm4', 'r460', 'G170', 'r280', 'h4', 'r200', 'a', 'r340',
          { up: ['r200', 'G160', 'r280', 'h5', 'r200', 'o', 'r200'], down: ['r420', 'f5', 'r300', 'a', 'r300', 'm3', 'r160'] },
          'r300', 'g80', 'r260', 'a', 'r260', 'm4', 'r460', 'G170', 'r130', 'D:sloth', 'r170', 'g90', 'r300', 'f4', 'r360', 'X'],
        switches: {}, signs: [],
        map: [
          '................................', '................................', '................................',
          '................................', '................................', '................................',
          '................................', '................................', '................................',
          '................................', '................................', '................................',
          '................................', '................................', '................................',
          '..1.2...........................', '................................', '................................',
        ],
      },
      {
        title: 'Snowbank Finish', steer: 1,
        tip: 'Bo steers to the finish! The mammoths are waiting. Brake ◀ for a gentle stop in the snowbank.',
        course: ['r560', 'D:owl', 'r200', 'm4', 'r460', 'G170', 'r280', 'a', 'r260', 'g90', 'r280', 'h4', 'r240', 'm3', 'r460',
          { up: ['r200', 'a', 'r200', 'g90', 'r240', 'h4', 'r200', 'o', 'r200'], down: ['r200', 'm4', 'r400', 'G160', 'r280', 'f4', 'r140'] },
          'r300', 'a', 'r380', 'G170', 'r300', 'm4', 'r460', 'g90', 'r280', 'f6', 'S:Snowbank! {S}: brake', 'r640', 'E'],
        switches: {}, signs: [],
        map: [
          '................................', '................................', '................................',
          '................................', '................................', '................................',
          '................................', '................................', '................................',
          '................................', '................................', '................................',
          '................................', '................................', '................................',
          '..1.2...........................', '................................', '................................',
        ],
      },
    ],
  },
  // ----- END 9-3 Ice Age Glacier -----

  // ----- BEGIN 9-4 Krakatoa Ash Run (mode 'ash', js/levels/world9/krakatoa-ash-run.js) -----
  { name: 'Krakatoa Ash Run', world: 8, kind: 'team', mode: 'ash', ownHUD: true,
    act: { label: 'fan' },
    legend: { pip: '<kbd>A</kbd><kbd>D</kbd> move <kbd>W</kbd> jump <kbd>S</kbd> hold: camp', bo: '<kbd>←</kbd><kbd>→</kbd> move <kbd>↑</kbd> jump <kbd>↓</kbd> hold: camp',
      pad: 'stick or d-pad move, <span data-glyph="a"></span> jump, hold down: camp,' },
    tip: 'The ash cloud hides the way! One blows it clear with a fan, the other leads the way.',
    switches: {}, signs: [],
    rooms: [
      { // ---------- Room 1: Jungle Trail (Pip leads, Bo fans) ----------
        title: 'Jungle Trail', leader: 0, style: 'jungle', exitKind: 'arch',
        act: { label: 'fan', labels: ['pull', 'fan'] },
        tip: 'Bo: hold the action to fan the ash away. Pip: lead the way and pull the lever!',
        ash: { clear: [[0, 0, 4, 17], [29, 0, 31, 17]] },
        boards: [{ x: 74, y: 394, post: 56, text: 'Krakatoa, 1883' }],
        switches: {}, signs: [],
        map: [
          '................................', //  0
          '................................', //  1
          '................................', //  2
          '................................', //  3
          '................................', //  4
          '................................', //  5
          '................................', //  6
          '................................', //  7
          '................................', //  8
          '..............#####.............', //  9  rock overhang over the tunnel
          '..............#####.............', // 10
          '..............#####.............', // 11
          '..............#####.............', // 12
          '................d...............', // 13  a soft ash drift fills the tunnel
          '.2.1.p.m.....mf.d..tm.......A.E.', // 14  camp t, lever A drops the rope bridge 6
          '#########...#########6666666####', // 15  a small pit, then the gust gap
          '#########...#########.......####', // 16
          '#########...#########.......####', // 17
        ] },
      { // ---------- Room 2: Lava Rocks (Bo leads, Pip fans) ----------
        title: 'Lava Rocks', leader: 1, style: 'lava', exitKind: 'cave',
        act: { label: 'fan', labels: ['fan', 'pull'] },
        tip: 'Swap! Pip fans, Bo leads. Hop the hot rocks and fan Bo across the lava river.',
        ash: { hats: true, clear: [[0, 0, 3, 17], [29, 0, 31, 17]] },
        boards: [{ x: 62, y: 366, post: 54, text: 'Hot rocks!' }],
        switches: {}, signs: [],
        map: [
          '................................', //  0
          '................................', //  1
          '................................', //  2
          '......................######....', //  3  tunnel roof
          '......................######....', //  4
          '......................######....', //  5
          '......................######....', //  6
          '......................######....', //  7
          '......................######....', //  8
          '......................######....', //  9
          '.......................d...4....', // 10  drift, bamboo gate
          '..........t.m.......A..d.B.4m.E.', // 11  lever A drops the bridge 6; lever B (in the tunnel) opens gate 4
          '......m...###6666666############', // 12  the lava river (gust gap)
          '.1.2..##..###.......############', // 13
          '####..##..###.......############', // 14
          '####..##..###.......############', // 15
          '####vv##vv###vvvvvvv############', // 16  lava: hot foot!
          '####vv##vv###vvvvvvv############', // 17
        ] },
      { // ---------- Room 3: Cliff Path (Pip leads, Bo fans) ----------
        title: 'Cliff Path', leader: 0, style: 'cliff', exitKind: 'arch',
        act: { label: 'fan', labels: ['pull', 'fan'] },
        tip: 'Swap! Bo fans, Pip leads. Windy: the ash blows back fast! Climb up, then take the high path back.',
        ash: { windy: true, hats: true, top: 2, turn: 9, climb: [26, 8], clear: [[0, 9, 4, 13]] },
        boards: [{ x: 906, y: 276, post: 24, text: '← High path' }],
        switches: {}, signs: [],
        map: [
          '########........................', //  0  cliff rock over the way out
          '########........................', //  1
          '########........###.............', //  2  an overhang
          '########........###.............', //  3
          '.......4.........d..............', //  4  gate 4 under the cliff; a drift under the overhang
          '.......4.........d..............', //  5
          '.......4.........d...##.........', //  6
          '.m.E...4.B.##.m..d.m.##..t......', //  7  the high path, walked right to left: lever B opens gate 4
          '###########################.....', //  8  the high path (also the roof of the low path)
          '............d...................', //  9  a drift fills the low path
          '............d................###', // 10  the climb: two steps up on the right,
          '............d................###', // 11  then a jump up and left onto the high path
          '............d..............#####', // 12
          '.2.1.....m..d..t.m........A#####', // 13  lever A drops the rope bridge 6
          '#####...##########6666666#######', // 14  the low path: a hop, then the gust gap
          '#####...##########.......#######', // 15
          '#####~~~##########~~~~~~~#######', // 16  the sea: splash!
          '#####~~~##########~~~~~~~#######', // 17
        ] },
      { // ---------- Room 4: Beach to the Ship (Bo leads, Pip fans) ----------
        title: 'Beach to the Ship', leader: 1, style: 'beach', exitKind: 'ship',
        act: { label: 'fan', labels: ['fan', 'pull'] },
        tip: 'Swap! Pip fans, Bo leads. Fan Bo over the water to the ship, then lower the plank!',
        ash: { hats: true, clear: [[0, 0, 4, 17], [29, 0, 31, 17]] },
        boards: [{ x: 84, y: 372, post: 48, text: 'To the ship!' }],
        switches: {}, signs: [],
        map: [
          '................................', //  0
          '................................', //  1
          '................................', //  2
          '................................', //  3
          '................................', //  4
          '................................', //  5
          '................................', //  6
          '................................', //  7
          '..........###....3..............', //  8  beach rocks; the tall bamboo fence (gate 3)
          '..........###....3..............', //  9
          '..........###....3..............', // 10
          '..........###....3..............', // 11
          '...........d.....3..............', // 12  drift under the rocks
          'p1.2.p...m.d..tA.3mt.......Bm.E.', // 13  lever A opens the fence, lever B lowers the gangplank 7
          'zzzzzz...zzzzzzzzzzz7777777wwwww', // 14  a tide pool, then the gust gap to the ship's deck
          'zzzzzz...zzzzzzzzzzz............', // 15  (the hull is drawn over the water)
          'zzzzzz~~~zzzzzzzzzzz~~~~~~~~~~~~', // 16
          'zzzzzz~~~zzzzzzzzzzz~~~~~~~~~~~~', // 17
        ] },
    ],
  },
  // ----- END 9-4 Krakatoa Ash Run -----

  /* ===== World 10 (Collector's Vault, team boss): one big boss level, 10-1 The Grand Collector (mode 'collector',
     js/levels/world10/grand-collector.js). Gavyn's rule: a boss world every 10 worlds (10, 20, ...). Each room is one phase of the fight, run by GC_PHASES[room.phase].
     Room fields the core reads: title, tip, phase, pieces (the world numbers this phase wins back, in order),
     look (the world index whose colours the room uses; theme adds to them), act (labels per player), legend, map.
     Each phase builder edits only its own room block below (between its BEGIN and END lines). ===== */
  { name: 'The Grand Collector', world: 9, kind: 'team', mode: 'collector', ownHUD: true, noFalls: true,
    act: { label: 'act' },
    tip: 'A giant robot took a piece of every world! Team up and win all nine back.',
    switches: {}, signs: [],
    rooms: [
      // ----- BEGIN 10-1 room 1 (cannons) -----
      { // Castle Cannons (Castle Quest look): one loads the cannon, one aims and fires at the wall and his belly
        title: 'Castle Cannons', phase: 'cannons', pieces: [7, 2], look: 6, ownStep: true,
        gunner: 1, fence: 13,
        act: { label: 'fire', labels: ['load', 'fire'], padGlyph: 'act' },
        legend: { pad: 'stick: move or aim, <span data-glyph="a"></span> jump or fire,' },   // (the pip / bo keys follow the jobs: GC_PHASES.cannons.legend)
        tip: 'One brings powder and a ball to the cannon, one aims and fires. Break the wall, then hit his belly!',
        // the walls he hides behind: x = first tile column, rows top to bottom (n wood, B stone), standing on the floor
        wall1: { x: 21, rows: ['nn', 'nn', 'nn', 'nn', 'nn'] },
        wall2: { x: 20, rows: ['.nn', 'nnn', 'nBn', 'nnn', 'nnn', 'nnn'] },
        map: [
          '................................', //  0
          '................................', //  1
          '................................', //  2
          '................................', //  3
          '................................', //  4
          '................................', //  5
          '................................', //  6
          '................................', //  7
          '................................', //  8
          '................................', //  9
          '................................', // 10
          '..........ii....................', // 11  cannonballs up on the shelf
          '.........====...................', // 12
          '................................', // 13
          '.pp.1.2Y.................Z......', // 14  powder kegs, the cannon (Y), his feet (Z)
          '##############wwwww#############', // 15  the moat
          '################################', // 16
          '################################', // 17
        ] },
      // ----- END 10-1 room 1 -----
      // ----- BEGIN 10-1 room 2 (reels) -----
      { // Jackpot Reels (Lucky Casino look): one stops the reels from the deck below, one hops up them to bop his hat
        title: 'Jackpot Reels', phase: 'reels', pieces: [8, 3], look: 7,
        stopper: 0,
        act: { label: 'stop', labels: ['stop', 'shout'] },
        legend: { pip: '<kbd>A</kbd><kbd>D</kbd> move <kbd>W</kbd> jump', bo: '<kbd>←</kbd><kbd>→</kbd> move <kbd>↑</kbd> jump',
          pad: 'stick or d-pad move, <span data-glyph="a"></span> jump,' },   // (nothing drops here)
        tip: 'One stops the reels, one hops up them. The top cherry bounces you onto his hat: pop his dome, then bop!',
        // the reels as stairs, from the runner's ledge up to him (side 2 is the same, the other way round).
        // row: the window's top tile row; the payline picture is the step (B bar, 7 tall step, C cherry, L lemon).
        // dir: [hit 1, hit 2], 1 spins down, -1 up. holdT: s a good stop lasts while the runner is elsewhere.
        reels: { speed: [1.9, 2.2], holdT: [9, 6],
          stairs: [
            { row: 7, strip: 'BL7LBLL' },                          // a low step: any bar or 7
            { row: 5, strip: 'LBL7LBL', dir: [1, -1] },
            { row: 4, need: '7', strip: '7BLBL7LB', speedK: 0.9 }, // the tall step: needs a 7
            { row: 5, need: 'C', strip: 'CLBLBCL7', speedK: 0.85 }, // the top cherry: it springs the runner onto his hat
          ] },
        map: [
          '................................', //  0
          '................................', //  1
          '................................', //  2
          '................................', //  3
          '................................', //  4
          '................................', //  5
          '................................', //  6
          '................................', //  7
          '................................', //  8
          '................................', //  9
          '................................', // 10
          '..2..........................Z..', // 11  the runner's ledge (2), his feet (Z) over the far ledge
          '#####......................#####', // 12
          '#######r####r####r####r#########', // 13  the button panel; r = each reel's first column
          '#####......................#####', // 14  the button deck
          '#####......................#####', // 15
          '#####...1..................#####', // 16  the stopper (1)
          '################################', // 17
        ] },
      // ----- END 10-1 room 2 -----
      // ----- BEGIN 10-1 room 3 (lava) -----
      { // Hot Floor Climb (Great Escapes look): every button builds steps or a bridge for the partner, then turn the steam valves together
        title: 'Hot Floor Climb', phase: 'lava', pieces: [5, 9], look: 8,
        act: { label: 'turn', labels: ['turn', 'turn'] },
        tip: 'Your buttons make steps for your partner. Climb up, then turn your steam valves together!',
        floors: [16, 12, 8, 4],   // the tile rows of the four floors' tops, bottom first
        // buttons (owner, what they build): d Pip > 3, h Bo > 4, e Bo > bridge 9, m Bo plate > 5, f Pip plate > 6,
        // g Pip > 7, j Bo > 8, l Pip > bridge 0. Valves: q Pip's, r Bo's. Z = his seat on the boiler.
        map: [
          '#........................#......', //  0
          '#........................#......', //  1
          '#........................#......', //  2
          '#..j.............l...r.q.#......', //  3  floor 4: j, l, the second valves
          '#========0000000=========#......', //  4  floor 4 and its gap (Bo's bridge)
          '#........................#......', //  5
          '#.....77..........88.....#......', //  6  steps to floor 4: 7 Bo's, 8 Pip's
          '#.............g........f.#..Z...', //  7  floor 3: g, f
          '#========================#......', //  8  floor 3
          '#........................#......', //  9
          '#..66..............55....#......', // 10  steps to floor 3: 6 Bo's, 5 Pip's
          '#.r..q.me.h..............#......', // 11  floor 2: the first valves, m, e, h
          '#==========9999999=======#......', // 12  floor 2 and its gap (Pip's bridge)
          '#........................#......', // 13
          '#.......33..........44...#......', // 14  steps to floor 2: 3 Bo's, 4 Pip's
          '#.12.d...................#......', // 15  floor 1: d
          '################################', // 16
          '################################', // 17
        ] },
      // ----- END 10-1 room 3 -----
      // ----- BEGIN 10-1 room 4 (finale) -----
      { // Grand Finale (a bright Sunny Meadow + Rumble Park + Backyard Bash mix): set and spike his balls back, then
        // pull his plug together. setter = who sets first (the jobs swap after every bonk)
        title: 'Grand Finale', phase: 'finale', pieces: [4, 6, 1], look: 0, setter: 0,
        theme: { skyTop: '#8fd3ff', skyBot: '#fff1d6', hillFar: '#b8e6a0', hillNear: '#94d27f', grass: '#7fdc6a', grassDark: '#47a84a',
          stone: '#6b5a8f', stoneLight: '#7d6ba3', stoneEdge: '#4a3d6b' },
        act: { label: 'set', labels: ['set', 'spike'] },
        tip: 'One bumps his ball up, the other hits the gold ball back at him. Then pull his plug together!',
        map: [
          '................................', //  0
          '................................', //  1
          '................................', //  2
          '................................', //  3
          '................................', //  4
          '................................', //  5
          '................................', //  6
          '................................', //  7
          '................................', //  8
          '................................', //  9
          '................................', // 10
          '................................', // 11
          '................................', // 12
          '................................', // 13
          'K..1......2.........N.....Z.....', // 14  K the wall socket, N the net, Z his feet (he hovers over them)
          '################################', // 15
          '################################', // 16
          '################################', // 17
        ] },
      // ----- END 10-1 room 4 -----
    ],
  },

  /* ===== World 11 (Summer Games, mixed): the Summer Olympics world, world index 10 (js/levels/world11/). Gavyn's picks and
     order: 11-1 Synchro Diving (team), 11-2 Tandem Velodrome (team), 11-3 Hurdle Dash (versus), 11-4 Javelin Throw (versus).
     Each level's def sits between its own BEGIN/END lines. world: 10 ===== */
  // ----- BEGIN 11-1 Synchro Diving (mode 'dive', js/levels/world11/synchro-diving.js) -----
  { name: 'Synchro Diving', world: 10, kind: 'team', mode: 'dive', ownStep: true, ownHUD: true, noFalls: true, noTime: true,
    // a twin diving tower over a pool (MODES.dive draws it all): the map is only the two spawns
    tip: 'Dive off together! ▲ flip, ◀ ▶ twist, hold ▼ to tuck. Match the call, stay in sync, enter straight!',
    legend: {
      pip: '<kbd>W</kbd> ready · go · flip <kbd>A</kbd><kbd>D</kbd> twist <kbd>S</kbd> tuck',
      bo: '<kbd>↑</kbd> ready · go · flip <kbd>←</kbd><kbd>→</kbd> twist <kbd>↓</kbd> tuck',
      pad: '<span data-glyph="a"></span> ready · go · flip, stick ◀ ▶ twist, down tucks,',
    },
    // six dives, higher and harder each time. call: the moves in order; mirror: who picks the moves (the other copies),
    // max: how many moves the picker is scored for. air: seconds from takeoff to the water (springboard bounces add more)
    dives: [
      { title: 'Warm-up', h: 3, spring: true, call: ['flip'], air: 1.15, dd: 1.0 },
      { title: 'Double flip', h: 3, spring: true, call: ['flip', 'flip'], air: 1.15, dd: 1.2 },
      { title: 'Mirror dive', h: 5, mirror: 0, max: 2, air: 1.7, dd: 1.4 },
      { title: 'Mirror dive', h: 7.5, mirror: 1, max: 3, air: 2.0, dd: 1.6 },
      { title: 'Flip-twist-flip', h: 10, call: ['flip', 'twist', 'flip'], air: 2.0, dd: 1.8 },
      { title: 'Grand finale', h: 10, call: ['flip', 'flip', 'twist', 'flip'], air: 2.05, dd: 2.0 },
    ],
    switches: {}, signs: [],
    map: [
      '................................', '................................', '................................',
      '................................', '................................', '................................',
      '................................', '................................', '................................',
      '................................', '................................', '................................',
      '................................', '................................', '................................',
      '..........1..........2..........', '................................', '................................',
    ],
  },
  // ----- END 11-1 Synchro Diving -----
  //
  // ----- BEGIN 11-2 Tandem Velodrome (mode 'tandem', js/levels/world11/tandem-velodrome.js) -----
  // a top-down banked velodrome (MODES.tandem): one tandem, one pedals on the beat and one leans; 4 races, jobs swap each
  // race; scored by place (noTime). Room fields: ped (who pedals), laps, rivals [{ team, v, pos, p }], us, sprint, pacer.
  // The tip is rebuilt by the mode from ped (and the twist); the map is only the two spawns.
  { name: 'Tandem Velodrome', world: 10, roomWord: 'Race', kind: 'team', mode: 'tandem', ownStep: true, ownHUD: true, noFalls: true, noTime: true,
    legend: {
      pip: '<kbd>A</kbd><kbd>D</kbd> pedal · <kbd>W</kbd><kbd>S</kbd> lean',
      bo: '<kbd>←</kbd><kbd>→</kbd> pedal · <kbd>↑</kbd><kbd>↓</kbd> lean',
      pad: 'stick ◀ ▶ pedal, <span data-glyph="a"></span> leans in, down sits up,',
    },
    tip: 'One tandem, two jobs: one pedals on the drum beat, one leans into the banked turns. Swap every race!',
    switches: {}, signs: [],
    map: [
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '..........1.2...................',
      '................................',
      '................................',
      '................................',
    ],
    rooms: [
      { title: 'Warm-up Laps', ped: 0, laps: 3, twist: 'Race the Toucans and Lizards!',
        us: { pos: 0.2, p: -6 }, rivals: [{ team: 0, v: 198, pos: 0.56, p: -6 }, { team: 1, v: 224, pos: 0.92, p: -6 }],
        switches: {}, signs: [] },
      { title: 'Draft Line', ped: 1, laps: 5, twist: 'Ride close behind a bike to draft!',
        us: { pos: 0.32, p: -46 }, rivals: [{ team: 2, v: 228, pos: 0.32, p: 80 }, { team: 0, v: 228, pos: 0.32, p: 38 }, { team: 3, v: 228, pos: 0.32, p: -4 }],
        switches: {}, signs: [] },
      { title: 'Sprint Finish', ped: 0, laps: 5, sprint: 1.14, twist: 'Bell lap: the drum gets faster. Sprint!',
        us: { pos: 0.2, p: -6 }, rivals: [{ team: 1, v: 218, pos: 0.56, p: -6 }, { team: 3, v: 230, pos: 0.92, p: -6 }, { team: 2, v: 240, pos: 0.32, p: 36 }],
        switches: {}, signs: [] },
      { title: 'Keirin Final', ped: 1, laps: 6, sprint: 1.1, pacer: { pullAt: 3 }, twist: 'Stay behind the pace bike, then sprint!',
        us: { pos: 0.32, p: -126 }, rivals: [{ team: 3, v: 240, pos: 0.32, p: 6 }, { team: 0, v: 248, pos: 0.32, p: -38 }, { team: 2, v: 256, pos: 0.32, p: -82 }],
        switches: {}, signs: [] },
    ],
  },
  // ----- END 11-2 Tandem Velodrome -----
  //
  // ----- BEGIN 11-3 Hurdle Dash (mode 'hurdles', js/levels/world11/hurdle-dash.js) -----
  { name: 'Hurdle Dash', world: 10, kind: 'versus', mode: 'hurdles', ownStep: true,
    // no round clock: each race has its own stopwatch and a safety bell (the mode ends a race nobody finishes)
    match: { bestOf: 5, roundTime: 0 },
    act: { label: 'dip' },
    legend: { pip: '<kbd>D</kbd> run <kbd>W</kbd> jump', bo: '<kbd>→</kbd> run <kbd>↑</kbd> jump',
      pad: 'stick or d-pad ▶ run, <span data-glyph="a"></span> jump,' },
    stomp: false,
    tip: 'Hold ▶ to run. Jump in the gold zone for a SPEED BURST! At the finish, press dip to lean.',
    switches: {}, signs: [],
    // the mode draws the whole race (two lane strips, each with its own camera); the grid only holds the spawns
    map: [
      '................................', // 0
      '................................', // 1
      '................................', // 2
      '................................', // 3
      '................................', // 4
      '................................', // 5
      '................................', // 6
      '.......1........................', // 7
      '................................', // 8
      '................................', // 9
      '................................', // 10
      '................................', // 11
      '................................', // 12
      '.......2........................', // 13
      '................................', // 14
      '................................', // 15
      '................................', // 16
      '................................', // 17
    ],
  },
  // ----- END 11-3 Hurdle Dash -----
  //
  // ----- BEGIN 11-4 Javelin Throw (mode 'javelin', js/levels/world11/javelin-throw.js) -----
  // Both throw at once on two runways (Pip far, Bo near); 3 throws a round, the longer best mark wins. The mode draws
  // everything itself (the platformer bodies are hidden), so the map is empty: the spawns only place the round-start puffs.
  // roundTime 0: each throw has its own 10 s clock (drawn over the athlete), so a round always ends.
  { name: 'Javelin Throw', world: 10, kind: 'versus', mode: 'javelin', ownStep: true,
    match: { bestOf: 5, roundTime: 0 },
    act: { label: 'throw' },
    legend: { pip: '<kbd>D</kbd> run <kbd>A</kbd> brake', bo: '<kbd>→</kbd> run <kbd>←</kbd> brake',
      pad: 'stick ▶ run, ◀ brake, <span data-glyph="a"></span> or' },
    tip: 'Hold ▶ to run, press throw at the top of the meter, hold it to aim higher, let go before the line!',
    switches: {}, signs: [],
    map: [
      '................................', //  0
      '................................', //  1
      '................................', //  2
      '................................', //  3
      '................................', //  4
      '................................', //  5
      '................................', //  6
      '................................', //  7
      '................................', //  8
      '................................', //  9
      '................................', // 10
      '.1..............................', // 11  Pip's runway start (far lane)
      '................................', // 12
      '................................', // 13
      '.2..............................', // 14  Bo's runway start (near lane)
      '................................', // 15
      '................................', // 16
      '................................', // 17
    ],
  },
  // ----- END 11-4 Javelin Throw -----
  //
  // ===== END World 11 =====

  /* ===== World 12 (Winter Games): the Winter Games world, world index 11 (js/levels/world12/). ===== */
  // ----- BEGIN 12-1 Curling -----
  // 12-1: top-down curling (MODES.curling, js/levels/world12/curling.js). One throws, one sweeps; jobs swap every end.
  // Room fields the mode reads: title, tip, thrower (0 Pip / 1 Bo), act, stars [2-star points, 3-star points],
  // guards [[x, y, 'snowman' | 'penguin']], luckyGuards / luckyGuards2 (the guards on the 1st / later gold-help replays), robots [[x, y]],
  // snow [[x0, y0, x1, y1]] (all in px; the house is at 790, 300).
  { name: 'Curling', world: 11, kind: 'team', mode: 'curling', ownStep: true, ownHUD: true, noFalls: true, noTime: true,
    act: { label: 'throw', labels: ['throw', 'sweep'] },
    legend: { pip: '<kbd>W</kbd><kbd>S</kbd> aim <kbd>A</kbd><kbd>D</kbd> curl · or <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> skate',
      bo: '<kbd>↑</kbd><kbd>↓</kbd> aim <kbd>←</kbd><kbd>→</kbd> curl · or arrows skate',
      pad: 'stick aims, curls or skates, <span data-glyph="a"></span> or' },
    tip: 'One slides the stone, one skates along and sweeps in front of it so it goes farther. Swap every end.',
    switches: {}, signs: [],
    map: Array.from({ length: 18 }, (_, y) => (y === 10 ? '.1....2' + '.'.repeat(25) : '.'.repeat(32))),
    rooms: [
      { title: 'Draw to the Button', thrower: 0, stars: [5, 8], act: { label: 'throw', labels: ['throw', 'sweep'] },
        tip: 'Pip throws: aim, hold to charge, let go. Bo skates beside the stone and holds the action to sweep!' },
      { title: 'Snowman Guards', thrower: 1, stars: [5, 8], act: { label: 'throw', labels: ['sweep', 'throw'] },
        tip: 'Bo throws, Pip sweeps. Snowmen guard the house: aim beside them and curl the stone around!',
        guards: [[640, 300, 'snowman'], [700, 380, 'penguin']], luckyGuards: [[640, 300, 'snowman'], [700, 412, 'penguin']],
        luckyGuards2: [[640, 244, 'snowman'], [700, 414, 'penguin']] },
      { title: 'Robot Takeout', thrower: 0, stars: [6, 10], act: { label: 'throw', labels: ['throw', 'sweep'] },
        tip: 'Pip throws, Bo sweeps. Grumpy robot stones! Throw hard and sweep to knock them out (+2 each).',
        robots: [[790, 300], [818, 266]] },
      { title: 'Snowy Patches', thrower: 1, stars: [5, 8], act: { label: 'throw', labels: ['sweep', 'throw'] },
        tip: 'Bo throws, Pip sweeps. Snow stops the stone! Sweep through it, or sweep a path before the throw.',
        snow: [[590, 236, 680, 364], [712, 318, 770, 396]] },
    ],
  },
  // ----- END 12-1 Curling -----
  // ----- BEGIN 12-2 Bobsled -----
  // 12-2: chase-cam bobsled run (MODES.bobsled, js/levels/world12/bobsled.js). Push off on the beat, hop in, then BOTH lean
  // into every curve. Pilot (front) steers to rings and calls curves; brakeman (back) brakes for hairpins. Jobs swap every run.
  // Room fields the mode reads: title, tip, pilot (0 Pip / 1 Bo), par (s, a clean run; medal by the total), act,
  // course: tokens (sN straight, lN/rN curve, LN/RN big curve, hl/hr hairpin, zlr/zrl S-bend, tN tuck, j jump bump,
  // o<u> ring at lateral u, F finish), see the file header.
  { name: 'Bobsled', world: 11, kind: 'team', mode: 'bobsled', ownStep: true, ownHUD: true, noFalls: true,
    act: { label: 'push', labels: ['push', 'push'] },
    legend: { pip: '<kbd>A</kbd><kbd>D</kbd> lean <kbd>W</kbd> hop <kbd>S</kbd> tuck', bo: '<kbd>←</kbd><kbd>→</kbd> lean <kbd>↑</kbd> hop <kbd>↓</kbd> tuck',
      pad: 'stick ◀ ▶ lean, <span data-glyph="a"></span> hop, down tucks,' },
    tip: 'Push on the beat, hop in, then BOTH lean into every curve! One leaning just wobbles. Jobs swap each run.',
    switches: {}, signs: [],
    map: Array.from({ length: 18 }, (_, y) => (y === 15 ? '..1.2' + '.'.repeat(27) : '.'.repeat(32))),
    rooms: [
      { title: 'First Run', pilot: 0, par: 48, act: { label: 'push', labels: ['push', 'push'] },
        tip: 'Pip pilots in front: steer to the rings. Bo brakes. In curves you BOTH lean the way the arrows point!',
        course: ['s50', 'o0', 's25', 'o-0.6', 's50', 'r70', 's40', 'o0.6', 's50', 'l70', 's50', 't140', 's25', 'r65', 's30', 'o0', 's20', 'o0.6',
          's50', 'l65', 's50', 'R85', 's30', 'o-0.6', 's25', 'o0', 's50', 'l60', 's60', 'hl', 's25', 'o0.6', 's30', 'F'] },
      { title: 'Snake Bends', pilot: 1, par: 46, act: { label: 'push', labels: ['push', 'push'] },
        tip: 'Swap! Bo pilots, Pip brakes. S-bends flip fast: lean one way, then the other. Hop together on bumps!',
        course: ['s25', 'o-0.5', 's45', 'r65', 's35', 'zlr', 's40', 'o-0.6', 's30', 'o0.5', 's25', 'j', 's35', 'l70', 's30', 'zrl', 's20', 'o0.5', 's20', 't130', 's80',
          'hr', 's25', 'o-0.6', 's50', 'zlr', 's40', 'R80', 's40', 'F'] },
      { title: 'Hairpin Hill', pilot: 0, par: 49.5, act: { label: 'push', labels: ['push', 'push'] },
        tip: 'Pip pilots again. Hairpins! Bo brakes from the first red BRAKE board, then you both lean the way.',
        course: ['s45', 'l65', 's60', 'hr', 's30', 'o-0.6', 's30', 't130', 's25', 'L85', 's30', 'zrl', 's15', 'o0.5', 's20', 'j', 's50', 'hl', 's25', 'o0.6', 's30',
          'o-0.4', 's45', 'R85', 's40', 'o0.4', 's45', 'r60', 's40', 'F'] },
      { title: 'Thunder Run', pilot: 1, par: 54.5, act: { label: 'push', labels: ['push', 'push'] },
        tip: 'Bo pilots, Pip brakes. The big one: double S-bends, two hairpins, jumps. Push, hop, lean together!',
        course: ['s45', 'zrl', 's25', 'o0.5', 's30', 'o-0.4', 's45', 'L85', 's30', 'j', 's50', 'hl', 's25', 'o0.6', 's45', 'zlr', 'zrl', 's40', 't120', 's25',
          'R85', 's30', 'o-0.6', 's30', 'o0', 's30', 'o0.6', 's50', 'l60', 's60', 'hr', 's25', 'o-0.6', 's30', 'F'] },
    ],
  },
  // ----- END 12-2 Bobsled -----
  // ----- BEGIN 12-3 Ski Jump -----
  // 12-3: side-view ski jump (MODES.skijump, js/levels/world12/ski-jump.js). One jumps, one runs the wind fans; jobs swap
  // every jump (2 per hill). Room fields the mode reads: title, tip, hill ('normal' | 'large' | 'night' | 'cliff', geometry
  // in the mode file), night, rings [jump 1 [[u, height]], jump 2 [...]] (u = px past the take-off lip, height = px above
  // the snow), stars [2-star points, 3-star points] for the hill's two jumps.
  { name: 'Ski Jump', world: 11, kind: 'team', mode: 'skijump', ownStep: true, ownHUD: true, noFalls: true, noTime: true,
    act: { label: 'fan', labels: ['jump', 'fan'] },
    legend: { pip: 'ski: <kbd>S</kbd> tuck <kbd>W</kbd> jump <kbd>A</kbd><kbd>D</kbd> lean · fans: <kbd>A</kbd><kbd>D</kbd> run',
      bo: 'ski: <kbd>↓</kbd> tuck <kbd>↑</kbd> jump <kbd>←</kbd><kbd>→</kbd> lean · fans: <kbd>←</kbd><kbd>→</kbd> run',
      pad: 'stick leans or runs, down tucks, <span data-glyph="a"></span> jumps,' },
    tip: 'One skis and jumps, one runs the wind fans. Fans push the jumper farther! Swap every jump.',
    switches: {}, signs: [],
    map: Array.from({ length: 18 }, (_, y) => (y === 10 ? '.1....2' + '.'.repeat(25) : '.'.repeat(32))),
    rooms: [
      { title: 'Normal Hill', hill: 'normal', stars: [200, 260],
        tip: 'Tuck, jump at the gold edge, keep the needle green. Fan crew: blow as the jumper flies over!' },
      { title: 'Large Hill', hill: 'large', stars: [175, 215], rings: [[[150, 58], [272, 50]], [[110, 62], [190, 48], [275, 40]]],
        tip: 'A bigger hill with snowflake rings (+5 each). In the air ◀ leans back to float up, ▶ leans forward to dive.' },
      { title: 'Night Hill', hill: 'night', night: true, stars: [205, 240], rings: [[], [[120, 50], [190, 58]]],
        tip: 'The Gust-o-matic blows a headwind by the red fan. Start that fan before the jumper gets there to block it!' },
      { title: 'Fan Cart Cliff', hill: 'cliff', stars: [230, 270], rings: [[[252, 46]], [[165, 62], [258, 50]]],
        tip: 'Fly over the snow pit! The fan crew drives a fan cart under the jumper and holds to blow once they fly.' },
    ],
  },
  // ----- END 12-3 Ski Jump -----
  // ----- BEGIN 12-4 Ice Hockey -----
  // 12-4: top-down one-on-one ice hockey with a goalie robot in each net (MODES.hockey, js/levels/world12/ice-hockey.js).
  // Pip defends the left net, Bo the right. Tap = shot, hold = slapshot; no puck = poke check. First to 3 goals or most
  // at the 60 s bell; a tie at the bell goes to 15 s golden-goal overtime. Rounds 2-5 rotate the twists (see the file).
  { name: 'Ice Hockey', world: 11, kind: 'versus', mode: 'hockey', ownStep: true,
    match: { bestOf: 5, roundTime: 60 },
    act: { label: 'shoot' },
    legend: { pip: '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> skate', bo: '<kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd> skate',
      pad: 'stick: skate, <span data-glyph="a"></span> or' },
    tip: 'Shoot into the far net: tap to shoot, hold for a slapshot. No puck? Poke to steal it!',
    switches: {}, signs: [],
    map: Array.from({ length: 18 }, (_, y) => (y === 10 ? '.'.repeat(12) + '1' + '.'.repeat(6) + '2' + '.'.repeat(12) : '.'.repeat(32))) },
  // ----- END 12-4 Ice Hockey -----
  // ===== END World 12 =====

  /* ===== World 13 (Spooky Hollow, mixed): the Halloween world, world index 12 (js/levels/world13/), silly-spooky, never scary.
     Gavyn's picks (Nov 2026): 13-1 Pumpkin Patch Roll (team), 13-2 Graveyard Bone Hunt (team), 13-3 Haunted Mansion (team,
     Gavyn's own idea), 13-4 Broomstick Race (versus). Each level's def sits between its own BEGIN/END lines. world: 12 ===== */
  // ----- BEGIN 13-1 Pumpkin Patch Roll (mode 'pumpkin', js/levels/world13/pumpkin-patch-roll.js) -----
  { name: 'Pumpkin Patch Roll', world: 12, kind: 'team', mode: 'pumpkin', ownStep: true, ownHUD: true, noFalls: true,
    // side-on giant-pumpkin roll (MODES.pumpkin): the map is only the two spawns, the mode builds each room from its course
    legend: {
      pip: '<kbd>A</kbd><kbd>D</kbd> push · balance <kbd>W</kbd> leapfrog <kbd>S</kbd> hug',
      bo: '<kbd>←</kbd><kbd>→</kbd> push · balance <kbd>↑</kbd> leapfrog <kbd>↓</kbd> hug',
      pad: 'stick: push · balance, <span data-glyph="a"></span> leapfrog, down hugs,',
    },
    tip: 'Roll the giant pumpkin to the hayride! One pushes, one rides on top and leans. Big hills need you both.',
    act: { label: 'push', labels: ['push', 'hug'] },
    theme: { skyTop: '#241b4d', skyBot: '#f0915a' },
    map: [...Array(15).fill('.'.repeat(32)), '..1.2' + '.'.repeat(27), '.'.repeat(32), '.'.repeat(32)],
    rooms: [
      {
        title: 'Patch Hills', pusher: 0, act: { label: 'push', labels: ['push', 'hug'] },
        tip: 'Pip pushes ▶. Bo rides: walk against the roll, lean ▶ uphill, ◀ downhill. Steep hills need you both!',
        course: ['f170', 'S:{P}: walk into it to push!', 'f140', 'D:crows', 'f120', 'k', 'f160', 'u240', 'f140', 'b', 'S:Steep! {P} pushes, {R} leans ▶', 'f150',
          'U340', 'f160', 'D:scarecrow', 'd200', 'f160', 'k', 'f160', 'b', 'U280', 'f100', 'b', 'f60', 'S:Mud! {P}: leapfrog in front', 'f120', 'D340', 'm130',
          'f200', 'D:ghost', 'f160', 'k', 'f120', 'D:jacks', 'f150', 'X'],
      },
      {
        title: 'Pond Bridge', pusher: 1, act: { label: 'push', labels: ['hug', 'push'] },
        tip: 'Swap! Bo pushes, Pip rides. Bridges only hold a SLOW pumpkin: leapfrog in front, hold ◀ and lean back!',
        course: ['f170', 'D:frog', 'f130', 'u200', 'f120', 'b', 'U300', 'f100', 'b', 'f60', 'S:Pond! Go SLOW over the bridge', 'f120', 'D340', 'p160', 'f200', 'D:cattails',
          'f60', 'k', 'f160', 'b', 'U320', 'f100', 'b', 'f40', 'D:willow', 'f140', 'D360', 'p170', 'f160', 'D:frog', 'f60', 'k', 'f140', 'D:crows', 'f150', 'X'],
      },
      {
        title: 'Scarecrow Ridge', pusher: 0, act: { label: 'push', labels: ['push', 'hug'] },
        tip: 'Pip pushes again. Windy ridge! Bo, lean into the gusts. Zoom down one hill and up the next!',
        course: ['f170', 'D:scarecrow', 'f120', 'b', 'U300', 'f60', 'b', 'f80', 'S:Windy ridge! {R}: lean into the gusts', 'g<', 'f170', 'D:crows', 'g>', 'f120', 'D320', 'p150',
          'f180', 'b', 'U260', 'f100', 'g<', 'f120', 'D:scarecrow', 'f80', 'S:Zoom down, roll up!', 'f80', 'D240', 'f30', 'U220', 'f150', 'g>', 'f70', 'b',
          'f160', 'D320', 'm140', 'f180', 'k', 'f140', 'D:ghost', 'f150', 'X'],
      },
      {
        title: 'Hayride Hill', pusher: 1, act: { label: 'push', labels: ['hug', 'push'] },
        tip: 'Bo pushes to the top! One last pond, then the big climb up Hayride Hill and onto the wagon.',
        course: ['f170', 'D:jacks', 'f120', 'b', 'U300', 'f100', 'b', 'f60', 'D:willow', 'f120', 'D340', 'p170', 'f180', 'D:frog', 'f60', 'k', 'f160', 'b', 'U280', 'f120',
          'D:scarecrow', 'f80', 'U260', 'f150', 'b', 'u200', 'f120', 'k', 'f140', 'S:Hayride! Up the ramp!', 'U300', 'f180', 'D:jacks', 'f100', 'E'],
      },
    ],
  },
  // ----- END 13-1 Pumpkin Patch Roll -----
  //
  // ----- BEGIN 13-2 Graveyard Bone Hunt (mode 'bonehunt', js/levels/world13/graveyard-bone-hunt.js) -----
  // 13-2 Graveyard Bone Hunt (mode 'bonehunt', team): dig up Mr. Bones' lost bones and put him back together; each
  // room's bones give him a new shape (stool, ladder, bridge). Map chars and rules: the top of the level file.
  { name: 'Graveyard Bone Hunt', world: 12, kind: 'team', mode: 'bonehunt', ownHUD: true, noFalls: true,
    act: { label: 'dig' },
    legend: { jump: 'jump · climb', down: 'down · hold: back', padJump: 'jump · climb', padDown: 'hold down: back' },
    tip: 'Dig up Mr. Bones’s lost bones and bring them back. Every bone makes him a better helper!',
    switches: {}, signs: [],
    rooms: [
      { // ---------- Room 1: Front Gate (a head boost for the leg bone, carry the backbone together) ----------
        title: 'Front Gate', unlock: 'stool', exitVia: 'stool', exitLabel: 'CROOKED CRYPTS',
        tip: 'Boost each other up to dig the leg bone, then carry the big backbone together. Don’t pull apart!',
        mounds: [{ piece: 'leg1', how: 'boost', foot: { x: 136, feet: 480 }, land: 66 }, { piece: 'spine', how: 'big', len: 90 }],
        plan: ['boost:0', 'big:1', 'exit'], stones: ['BRB'],
        decor: [{ k: 'tree', x: 300, s: 1 }, { k: 'owl', x: 336, y: 318 }, { k: 'grave', x: 380, text: ['Here lies', 'my left sock'] },
          { k: 'grave', x: 560, text: ['R.I.P.', 'Pizza crust'], tilt: -0.05 }, { k: 'ghost', x: 470, y: 380 },
          { k: 'fence', x0: 230, x1: 760 }, { k: 'sign', x: 112, y: 300, text: 'MR. BONES · BACK SOON!' }],
        switches: {}, signs: [],
        map: [
          '................................', //  0
          '................................', //  1
          '................................', //  2
          '................................', //  3
          '................................', //  4
          '................................', //  5
          '................................', //  6
          '................................', //  7
          '................................', //  8
          '................................', //  9
          '................................', // 10
          '.d...........................E..', // 11
          'BBBB......................######', // 12
          'BBBB......................######', // 13
          'BBBB......................######', // 14
          'BBBB..h.1.2..N..S.....D..x######', // 15
          '################################', // 16
          '################################', // 17
        ] },
      { // ---------- Room 2: Crooked Crypts (stack up on the stool for the hip bone, hold the crank for the other leg) ----------
        title: 'Crooked Crypts', unlock: 'ladder', exitVia: 'ladder', exitLabel: 'PUMPKIN PLOT',
        tip: 'Stack up on Mr. Bones to reach the high roof. One holds the crank while the other digs in the crypt!',
        mounds: [{ piece: 'hips', how: 'tower', foot: { x: 136, feet: 480 }, land: 60 }, { piece: 'leg2', how: 'gate' }],
        plan: ['tower:0', 'gate:1', 'exit'], stones: ['BOO!'],
        decor: [{ k: 'grave', x: 300, text: ['Gone to', 'lunch'] }, { k: 'tree', x: 460, s: 0.9 }, { k: 'owl', x: 494, y: 330 },
          { k: 'grave', x: 640, text: ['Napping.', 'Do not disturb'], tilt: 0.06 }, { k: 'ghost', x: 380, y: 360 },
          { k: 'fence', x0: 150, x1: 700 }, { k: 'sign', x: 752, y: 228, text: 'THE CRYPT' }],
        switches: {}, signs: [],
        map: [
          '................................', //  0
          '................................', //  1
          '................................', //  2
          '................................', //  3
          '................................', //  4
          '................................', //  5
          '................................', //  6
          '................................', //  7
          '................................', //  8
          '............................E...', //  9
          '.d......................BBBBBBBB', // 10
          'BBBB....................BBBBBBBB', // 11
          'BBBB....................BBBBBBBB', // 12
          'BBBB....................g......B', // 13
          'BBBB....................g......B', // 14
          'BBBBx.h.1.2N.S....r....yg....d.B', // 15
          '################################', // 16
          '################################', // 17
        ] },
      { // ---------- Room 3: Pumpkin Plot (climb Mr. Bones up the old tree, dig the giant ribcage together) ----------
        title: 'Pumpkin Plot', unlock: 'bridge', exitVia: 'bridge', exitLabel: 'BELL TOWER',
        tip: 'Climb Mr. Bones up the old tree. The giant ribcage only digs up when you both dig at once!',
        mounds: [{ piece: 'funny', how: 'ladder' }, { piece: 'ribs', how: 'big', len: 120, together: true }],
        plan: ['ladder:0', 'big:1', 'exit'],
        decor: [{ k: 'owl', x: 14, y: 254 }, { k: 'pumpkins', x: 260 }, { k: 'grave', x: 470, text: ['Ate too', 'many sweets'] },
          { k: 'pumpkins', x: 700 }, { k: 'ghost', x: 760, y: 300 }, { k: 'fence', x0: 160, x1: 640 },
          { k: 'sign', x: 790, y: 430, text: 'OPEN GRAVE · BOING!' }],
        switches: {}, signs: [],
        map: [
          '................................', //  0
          '................................', //  1
          '................................', //  2
          '................................', //  3
          '................................', //  4
          '................................', //  5
          '................................', //  6
          '................................', //  7
          '.d..............................', //  8
          'WWW.............................', //  9
          'WWW.............................', // 10
          'WWW.............................', // 11
          'WWW.............................', // 12
          'WWW...........................E.', // 13
          'WWW..........................###', // 14
          'WWWy.h.1.2.p.p...D..Nz.......###', // 15
          '######################~~~~~~~###', // 16
          '######################~~~~~~~###', // 17
        ] },
      { // ---------- Room 4: Old Bell Tower (bridge the grave, stack up for the arm, ring the bell together) ----------
        title: 'Old Bell Tower', unlock: 'done', bellPiece: 'hand', bellY: 92, finale: { x: 840, feet: 210 },
        tip: 'Bridge the big grave, stack up for the arm bone, then climb to the bell and pull both ropes together!',
        mounds: [{ piece: 'arm', how: 'tower', foot: { x: 435, feet: 480 }, land: 410 }],
        plan: ['cross', 'tower:0', 'bell', 'finale'],
        decor: [{ k: 'grave', x: 594, text: ['Here lies', 'Steve’s homework'] }, { k: 'tree', x: 655, s: 0.8 }, { k: 'owl', x: 624, y: 346 },
          { k: 'ghost', x: 270, y: 300 }, { k: 'fence', x0: 380, x1: 700 }, { k: 'pumpkins', x: 494 }],
        switches: {}, signs: [],
        map: [
          '................................', //  0
          '........................BBBBBBBB', //  1
          '........................B......B', //  2
          '........................B......B', //  3
          '...............................B', //  4
          '...............................B', //  5
          '.........................!....!B', //  6
          '........................BBBBBBBB', //  7
          '........................BBBBBBBB', //  8
          '........................BBBBBBBB', //  9
          '.............d..........BBBBBBBB', // 10
          '............====........BBBBBBBB', // 11
          '........................BBBBBBBB', // 12
          '........................BBBBBBBB', // 13
          '........................BBBBBBBB', // 14
          '.h.12z........x..N.....yBBBBBBBB', // 15
          '######~~~~~~####################', // 16
          '######~~~~~~####################', // 17
        ] },
    ] },
  // ----- END 13-2 Graveyard Bone Hunt -----
  //
  // ----- BEGIN 13-3 Haunted Mansion (mode 'mansion', js/levels/world13/haunted-mansion.js) -----
  // Gavyn's own idea: one holds the flashlight that wakes the ghost platforms, the other hops on them (and freezes in the
  // light: "Eep!"). Map chars (read by the mode): g sleepy ghost platform, p haunted portrait (swaps Pip and Bo), d candle.
  { name: 'Haunted Mansion', world: 12, kind: 'team', mode: 'mansion', ownStep: true, ownHUD: true,
    act: { label: 'light', labels: ['light', 'swap'] },
    legend: { pip: '<kbd>A</kbd><kbd>D</kbd> move <kbd>W</kbd> jump <kbd>S</kbd> drop', bo: '<kbd>←</kbd><kbd>→</kbd> move <kbd>↑</kbd> jump <kbd>↓</kbd> drop',
              pad: 'stick or d-pad move (▲▼ aims the light), <span data-glyph="a"></span> jump,' },
    theme: { skyTop: '#2a1f45', skyBot: '#3b2a55', hillFar: '#2e2348', hillNear: '#2a2042', sun: 'rgba(0,0,0,0)', sunGlow: 'rgba(0,0,0,0)',
      stone: '#4a3352', stoneLight: '#5a4062', stoneEdge: '#1f1630', grass: '#9b6a40', grassDark: '#6b4127' },
    tip: 'A silly-spooky house! One of you holds the flashlight, the other hops on the ghosts it wakes up.',
    switches: {}, signs: [],
    rooms: [
      {
        title: 'The Foyer',
        holder: 0, style: 'foyer',
        act: { label: 'light', labels: ['light', 'swap'] },
        tip: 'Pip, shine the light on the sleepy ghosts so Bo can hop up. Keep it off Bo, or Eep!',
        cat: [27, 14, -1],
        plan: [{ portrait: 0 }, { lean: [23, 6, 1] }],
        deco: [
          { kind: 'window', x: 450, y: 292, moon: true }, { kind: 'window', x: 690, y: 300 },
          { kind: 'frame', x: 300, y: 104, w: 44, h: 54 }, { kind: 'frame', x: 630, y: 100, art: 'moon', bg: '#2e3f66' },
          { kind: 'frame', x: 760, y: 110, art: 'cat', bg: '#6a4a7a' },
          { kind: 'stairs', x: 240, y: 438, n: 7, dx: 30, dy: 30, broken: [2, 3, 5] },
          { kind: 'carpet', x: 180, y: 210, w: 540 }, { kind: 'rails', x: 540, y: 210, w: 180 },
          { kind: 'pillar', x: 165, y: 240, h: 210 },
        ],
        map: [
          '################################',
          '##............................##',
          '##............................##',
          '##............................##',
          '##............................##',
          '##............................##',
          '##......p....d....E...........##',
          '##....##################.gg...##',
          '##............................##',
          '##ggg.........................##',
          '##..........................####',
          '##............................##',
          '##..gg...................ggg..##',
          '##............................##',
          '##.....2.1......d......d......##',
          '################################',
          '################################',
          '################################',
        ],
      },
      {
        title: 'The Library',
        holder: 1, style: 'library',
        act: { label: 'light', labels: ['swap', 'light'] },
        tip: 'Swap jobs! Bo has the light. Wake the ghost book so Pip rides up. From up top, aim down over the edge.',
        cat: [21, 14, 1],
        books: [{ c: 13, w: 3, low: 15, high: 5, period: 7.2, pause: 1.4 }],
        plan: [{ book: 0 }, { portrait: 0 }, { lean: [16, 4, -1] }],
        deco: [
          { kind: 'shelf', x: 66, y: 196, w: 150, h: 254 }, { kind: 'shelf', x: 232, y: 256, w: 124, h: 194 },
          { kind: 'shelf', x: 530, y: 210, w: 150, h: 240 }, { kind: 'shelf', x: 700, y: 40, w: 110, h: 110 },
          { kind: 'window', x: 790, y: 250, moon: true }, { kind: 'frame', x: 620, y: 92, art: 'pumpkin', bg: '#3a2a5a' },
          { kind: 'carpet', x: 480, y: 150, w: 390 },
        ],
        map: [
          '################################',
          '##............................##',
          '##............................##',
          '##............................##',
          '##................p....d...E..##',
          '##..............################',
          '##............................##',
          '##............................##',
          '##............................##',
          '##............................##',
          '##............................##',
          '##............................##',
          '##............................##',
          '##............................##',
          '##..d....1........2......d....##',
          '#############...################',
          '################################',
          '################################',
        ],
      },
      {
        title: 'The Portrait Gallery',
        holder: 0, style: 'gallery',
        act: { label: 'light', labels: ['light', 'swap'] },
        tip: 'Two magic paintings! Bo swaps places with Pip to carry the light up, one floor at a time.',
        cat: [26, 14, -1],
        plan: [{ portrait: 1 }, { lean: [13, 9, 1] }, { portrait: 0 }, { lean: [17, 4, -1] }],
        deco: [
          { kind: 'frame', x: 130, y: 150, art: 'moon', bg: '#2e3f66' }, { kind: 'frame', x: 250, y: 140, w: 46, h: 58 },
          { kind: 'frame', x: 370, y: 160, art: 'cat', bg: '#6a4a7a' }, { kind: 'frame', x: 150, y: 390, art: 'pumpkin', bg: '#3a2a5a' },
          { kind: 'frame', x: 300, y: 385, w: 36, h: 46 }, { kind: 'frame', x: 660, y: 80, art: 'moon', bg: '#4a2e5a' },
          { kind: 'window', x: 790, y: 250, moon: true }, { kind: 'frame', x: 650, y: 330, art: 'pumpkin', bg: '#2e4a4a' },
          { kind: 'pillar', x: 445, y: 30, h: 420 }, { kind: 'rails', x: 60, y: 300, w: 360 },
        ],
        map: [
          '################################',
          '##............................##',
          '##............................##',
          '##............................##',
          '##.................p...d..E...##',
          '##...............###############',
          '##............................##',
          '##............................##',
          '##.............gg.............##',
          '##..p....d....................##',
          '##############................##',
          '##............................##',
          '##.............ggg............##',
          '##............................##',
          '##.....2..1...........d.......##',
          '################################',
          '################################',
          '################################',
        ],
      },
      {
        title: 'The Attic Race',
        holder: 1, style: 'attic',
        act: { label: 'light', labels: ['swap', 'light'] },
        tip: 'Race Bertie the ghost to the attic door! You both have to get there before he does.',
        cat: [20, 4, -1],
        race: { route: [[84, 420], [84, 104], [420, 92], [840, 112]], time: 40 },
        plan: [{ portrait: 0, hold: [27, 8] }, { lean: [22, 4, 1] }],
        deco: [
          { kind: 'round', x: 480, y: 84 }, { kind: 'trunk', x: 360, y: 450 }, { kind: 'boxes', x: 520, y: 450 },
          { kind: 'boxes', x: 560, y: 150 }, { kind: 'trunk', x: 380, y: 150 },
          { kind: 'stairs', x: 600, y: 440, n: 3, dx: 30, dy: 26 },
        ],
        map: [
          '################################',
          '##............................##',
          '##............................##',
          '##............................##',
          '##.......p.....d...........E..##',
          '##.....################...######',
          '##............................##',
          '##gg....................gg....##',
          '##............................##',
          '##...gg.................########',
          '##............................##',
          '##............................##',
          '##ggg...............####......##',
          '##............................##',
          '##......1.2....d..............##',
          '################################',
          '################################',
          '################################',
        ],
      },
    ],
  },
  // ----- END 13-3 Haunted Mansion -----
  //
  // ----- BEGIN 13-4 Broomstick Race (mode 'broom', js/levels/world13/broomstick-race.js) -----
  { name: 'Broomstick Race', world: 12, kind: 'versus', mode: 'broom', ownStep: true,
    // side-on broom race (MODES.broom): the map is only the two spawns, the mode builds each round's course
    match: { bestOf: 5 },
    act: { label: 'zoom', padGlyph: 'a' },   // padGlyph: on a controller A zooms too (the stick climbs and dives)
    legend: {
      pip: '<kbd>W</kbd><kbd>S</kbd> up · down <kbd>A</kbd><kbd>D</kbd> slow · fast',
      bo: '<kbd>↑</kbd><kbd>↓</kbd> up · down <kbd>←</kbd><kbd>→</kbd> slow · fast',
      pad: 'stick: fly, <span data-glyph="a"></span> or',
    },
    tip: 'Fly through the glowing rings for speed, grab a star and zoom! Bumping a friendly bat slows you.',
    switches: {}, signs: [],
    map: [
      '................................', '................................', '................................',
      '................................', '................................', '................................',
      '.....1..........................', '................................', '................................',
      '.....2..........................', '................................', '................................',
      '................................', '................................', '................................',
      '................................', '................................', '................................',
    ],
  },
  // ----- END 13-4 Broomstick Race -----
  //
  // ===== END World 13 =====

  /* ===== World 14 (Dino Valley, mixed): the prehistoric dinosaur world, world index 13 (js/levels/world14/), friendly
     dinosaurs, nothing scary. Gavyn's picks (Nov 2026): 14-1 Egg Rescue (team), 14-2 Pterodactyl Express (team),
     14-3 Tar Pit Pull (team), 14-4 Raptor Race (versus). Each level's def sits between its own BEGIN/END lines. world: 13 ===== */
  // ----- BEGIN 14-1 Egg Rescue (mode 'eggrescue', js/levels/world14/egg-rescue.js) -----
  // 14-1 Egg Rescue (team): carry Mama Dino's giant wobbly egg home on a leaf stretcher, one at each end. Walk together,
  // hop together, keep the leaf level. Course tokens and rules: the top of the level file.
  { name: 'Egg Rescue', world: 13, kind: 'team', mode: 'eggrescue', ownStep: true, ownHUD: true, noFalls: true,
    legend: {
      pip: '<kbd>A</kbd><kbd>D</kbd> walk <kbd>W</kbd> hop <kbd>S</kbd> low',
      bo: '<kbd>←</kbd><kbd>→</kbd> walk <kbd>↑</kbd> hop <kbd>↓</kbd> low',
      pad: 'stick: walk · down: low, <span data-glyph="a"></span> hop,',
    },
    tip: 'Carry the egg home on a leaf! Walk together, hop together and keep the leaf level so the egg stays on.',
    act: { label: 'lift' },
    map: [...Array(15).fill('.'.repeat(32)), '..1.2' + '.'.repeat(27), '.'.repeat(32), '.'.repeat(32)],
    rooms: [
      {
        title: 'Fern Path', front: 0,
        tip: 'Pip leads at the front, Bo follows. Hold ▲ to get ready: you hop when you are BOTH ready!',
        course: ['f240', 'S:Walk together! The leaf only stretches a little', 'f160', 'D:flowers', 'f120', 'S:A log! Hold hop: you jump when BOTH are ready', 'f90', 'L',
          'f200', 'D:trike', 'f140', 'S:Uphill! The low end lifts, the high end goes low', 'f60', 'u260', 'f140', 'n', 'f110', 'd220', 'f150', 'D:mush', 'c44', 'f170',
          'D:palm', 'f90', 'T', 'f190', 'S:Steep! Level the leaf together', 'f50', 'U200', 'f120', 'n', 'f100', 'D220', 'f150', 'L', 'f120', 'L', 'f150', 'D:mush', 'f100', 'X'],
      },
      {
        title: 'River Stepping Stones', front: 1,
        tip: 'Swap! Bo leads now. Hop stone to stone together. Stones bob and dip, so keep lifting and lowering!',
        course: ['f240', 'S:Hop stone to stone together!', 'f110', 'R:4,6,3.2,5', 'f150', 'D:stego', 'n', 'f160', 'S:Bobbing stones! Keep the leaf level', 'f90',
          'R:5,12,2.8,7', 'f140', 'n', 'f110', 'u200', 'f100', 'D:flowers', 'd200', 'f90', 'L', 'f150', 'D:dragonfly', 'R:6,15,2.4,9', 'f160', 'D:flowers', 'f120', 'X'],
      },
      {
        title: 'Geyser Field', front: 0,
        tip: 'Pip leads again. Warm steam vents bubble, then PUFF! Cross while they rest. If the egg pops up, stop!',
        course: ['f240', 'S:Steam vents puff! Cross while they rest', 'f90', 'v:0', 'f200', 'D:pool', 'v:2.4', 'f160', 'n', 'f140', 'S:Two in a row: watch them both!', 'f40',
          'v:0.6', 'f120', 'v:3.0', 'f60', 'D:trike', 'f140', 'L', 'f160', 'n', 'f100', 'u180', 'f60', 'v:1.2', 'f120', 'd180', 'f150', 'S:Old Steamy! The big one', 'f70',
          'v:0,1', 'f220', 'D:pool', 'f100', 'X'],
      },
      {
        title: "Mama's Nest", front: 1,
        tip: 'Bo leads up the hill to Mama! Hop up the ledges one at a time and level the leaf on the saggy bridge.',
        course: ['f220', "S:Up to Mama's nest!", 'f70', 'u240', 'f120', 'S:A ledge! Hop up, then level the leaf', 'f50', 'e28', 'f140', 'U220', 'f100', 'n', 'f110',
          'S:Wobbly vine bridge! It sags in the middle', 'f50', 'B:300,34', 'f140', 'n', 'f100', 'e26', 'f100', 'e26', 'f90', 'U200', 'f120', 'L', 'f120', 'n', 'f100',
          'U180', 'f100', 'D:flowers', 'f60', 'E'],
      },
    ],
  },
  // ----- END 14-1 Egg Rescue -----
  //
  // ----- BEGIN 14-2 Pterodactyl Express (mode 'ptero', js/levels/world14/pterodactyl-express.js) -----
  // 14-2 Pterodactyl Express (team, Gavyn's pick): Petra the pterodactyl carries both. The flyer flaps her wings at the
  // TOP of each wingbeat; the hanger swings from her feet, grabs fruit for the baby dinos and drops rocks on the
  // switches that open the log gates. Course tokens: the top of the level file. The map is only the two spawns.
  { name: 'Pterodactyl Express', world: 13, kind: 'team', mode: 'ptero', ownStep: true, ownHUD: true, noFalls: true, roomWord: 'Route',
    act: { label: 'flap', labels: ['flap', 'grab'] },
    legend: {
      pip: '<kbd>A</kbd><kbd>D</kbd> speed · swing <kbd>W</kbd> flap · grab <kbd>S</kbd> dive',
      bo: '<kbd>←</kbd><kbd>→</kbd> speed · swing <kbd>↑</kbd> flap · grab <kbd>↓</kbd> dive',
      pad: 'stick: speed · swing, <span data-glyph="a"></span> flap · grab, down dives,',
    },
    tip: 'Petra the pterodactyl gives you a ride! One flaps her wings, one hangs below and grabs fruit and rocks.',
    map: [...Array(15).fill('.'.repeat(32)), '..1.2' + '.'.repeat(27), '.'.repeat(32), '.'.repeat(32)],
    rooms: [
      {
        title: 'Morning Delivery', flyer: 0, pal: 'morning', act: { label: 'flap', labels: ['flap', 'grab'] },
        tip: 'Pip flies: flap at the gold TOP of the wingbeat. Bo hangs: grab fruit and drop it to the babies!',
        course: ['f360', 'S:{F}: flap at the gold TOP!', 'f100', 'D:ferns', 'f90', 't:mango:330', 'f190', 'S:{H}: grab fruit, feed the babies!', 'f170', 'n:360:1',
          'f220', 'D:bronto', 'f110', 't:banana:280', 'f170', 't:apple:340', 'f150', 't:mango:300', 'f200', 'n:370:2', 'f240', 'D:trike', 'f150', 'g400',
          't:berry:290', 'f230', 'n:350:1', 'f200', 'g430', 'f150', 'S:Rocks! {H}: drop one on the switch', 'f170', 'r:310', 'f380', 's', 'f360', 'G',
          'f220', 't:melon:300', 'f220', 'n:350:1', 'f180', 'D:eggs', 'f220', 'P'],
      },
      {
        title: 'Canyon Gates', flyer: 1, pal: 'canyon', act: { label: 'flap', labels: ['grab', 'flap'] },
        tip: 'Swap! Bo flies, Pip hangs. Mind the low canyon roofs, and drop rocks on the switches to open the gates.',
        course: ['f360', 'S:Canyon! Mind the low roofs', 'f200', 't:apple:320', 'f150', 'c180', 'f120', 't:berry:310', 'f190', 'n:370:1', 'f170', 't:apple:330',
          'f150', 'c70', 'f190', 'n:380:1', 'f220', 'r:300', 'f400', 's', 'f360', 'G',
          'f200', 'g380', 'f180', 't:mango:260', 'f210', 'n:330:1', 'f150', 'g430', 'f150', 'S:Two switches! Two rocks!', 'f150', 'r:300', 'f380', 's',
          'f220', 'r:300', 'f380', 's', 'f340', 'G',
          'f200', 'D:stego', 'f60', 'c170', 'f110', 't:melon:310', 'f150', 't:mango:320', 'f200', 'n:380:2', 'f200', 'c70', 'f80', 'D:ferns', 'f160', 'P'],
      },
      {
        title: 'Windy Cliffs', flyer: 0, pal: 'cliffs', act: { label: 'flap', labels: ['flap', 'grab'] },
        tip: 'Pip flies again. Ride the updrafts, flap PERFECT flaps through downdrafts, and wait out headwinds!',
        course: ['f360', 'S:Updraft! Ride it up', 'f160', 't:apple:330', 'f150', 'u:170', 'f230', 't:mango:200', 'f170', 'g340', 'f210', 'n:310:1',
          'f200', 'S:Downdraft! PERFECT flaps only', 'f100', 'd:320', 'f170', 't:berry:240', 'f260', 'g430', 'f170', 'n:380:2',
          'f200', 'D:bronto', 'f120', 'S:Headwind! Wait, or push on', 'f60', 'w:440', 'f220', 't:banana:300', 'f270', 'n:360:1',
          'f240', 'r:300', 'f180', 'u:140', 'f220', 's', 'f340', 'G',
          'f200', 'g330', 'f150', 't:melon:230', 'f190', 'd:260', 'f170', 'n:300:1', 'f190', 'g430', 'f260', 'P'],
      },
      {
        title: 'Volcano Smoke Run', flyer: 1, pal: 'volcano', act: { label: 'flap', labels: ['grab', 'flap'] },
        tip: 'Bo flies to the Big Nest! Fly over or under the sleepy smoke puffs, or Petra sneezes. ACHOO!',
        course: ['f360', 'S:Sleepy smoke puffs! Fly around', 'f140', 'v', 'f220', 't:mango:300', 'f200', 'v', 'f170', 'n:360:1', 'f190', 't:berry:260',
          'f170', 'v', 'f200', 'n:370:1', 'f220', 'r:300', 'f180', 'v', 'f220', 's', 'f340', 'G',
          'f200', 't:apple:320', 'f150', 'v', 'f170', 't:banana:250', 'f200', 'n:350:2', 'f190', 'v', 'f170', 'r:310', 'f220', 'v', 'f200', 's', 'f340', 'G',
          'f220', 't:melon:300', 'f200', 'n:380:1', 'f200', 'D:trike', 'f200', 'E'],
      },
    ],
  },
  // ----- END 14-2 Pterodactyl Express -----
  //
  // ----- BEGIN 14-3 Tar Pit Pull (mode 'tarpit', js/levels/world14/tar-pit-pull.js) -----
  { name: 'Tar Pit Pull', world: 13, kind: 'team', mode: 'tarpit', ownStep: true, ownHUD: true, noFalls: true,
    act: { label: 'pull' },
    tip: 'Tar is sticky! Swing across on vines, then pull your partner out of the goo. Take turns!',
    theme: { grass: '#7fbf5a', grassDark: '#5a9a44' },   // the mode paints its own swamp; this is only for core uses
    legend: { pip: '<kbd>A</kbd><kbd>D</kbd> move · wiggle, <kbd>W</kbd> jump · grab · let go,', bo: '<kbd>←</kbd><kbd>→</kbd> move · wiggle, <kbd>↑</kbd> jump · grab · let go,',
      pad: 'stick move · wiggle, <span data-glyph="a"></span> jump · grab · let go,' },
    switches: {}, signs: [],
    rooms: [
      { // Room 1: plain vines, plain pulling
        title: 'Sticky Steps', style: 'steps', act: { label: 'pull' },
        tip: 'Jump to grab the vine, jump again to let go. Then your partner hops in the tar and you pull them out!',
        cross: [{ kind: 'tied', lead: 0 }, { kind: 'tied', lead: 1 }],
        deco: [{ k: 'palm', x: 40, y: 360, h: 170, lean: 0.2 }, { k: 'fern', x: 150, y: 360 }, { k: 'sign', x: 120, y: 360, text: 'Sticky!' },
          { k: 'rock', x: 420, y: 360, w: 20 }, { k: 'reeds', x: 520, y: 360 }, { k: 'bones', x: 820, y: 360 }, { k: 'palm', x: 930, y: 360, h: 150, lean: -0.2 }],
        switches: {}, signs: [],
        map: [
          '................................', //  0
          '................................', //  1
          '................................', //  2
          '................................', //  3
          '................................', //  4
          '................................', //  5
          '................................', //  6
          '................................', //  7
          '................................', //  8
          '................................', //  9
          '................................', // 10
          '.1.2........................E...', // 11
          '######.......##tt##.......######', // 12
          '######ttttttt######ttttttt######', // 13
          '######ttttttt######ttttttt######', // 14
          '######ttttttt######ttttttt######', // 15
          '################################', // 16
          '################################', // 17
        ],
      },
      { // Room 2: vines out of reach; hook one in, swing, throw it back
        title: 'Vine Swing Gully', style: 'gully', act: { label: 'hook' },
        tip: 'These vines are out of reach. One hooks the vine with the hook stick, the other swings. Then throw it back!',
        cross: [{ kind: 'pass', lead: 0 }, { kind: 'push', lead: 1 }],
        deco: [{ k: 'fern', x: 30, y: 360, s: 0.9 }, { k: 'eggs', x: 480, y: 300 }, { k: 'palm', x: 528, y: 300, h: 130, lean: 0.15 },
          { k: 'reeds', x: 830, y: 360 }, { k: 'fern', x: 950, y: 360, s: 1.1 }],
        switches: {}, signs: [],
        map: [
          '................................', //  0
          '................................', //  1
          '................................', //  2
          '................................', //  3
          '................................', //  4
          '................................', //  5
          '................................', //  6
          '................................', //  7
          '................................', //  8
          '..............h.................', //  9
          '.............######.............', // 10
          '.1.2h........######.........E...', // 11
          '######.......######.......######', // 12
          '######ttttttt######ttttttt######', // 13
          '######ttttttt######ttttttt######', // 14
          '######ttttttt######ttttttt######', // 15
          '################################', // 16
          '################################', // 17
        ],
      },
      { // Room 3: sinking logs and bubble vents
        title: 'Sinking Logs', style: 'logs', act: { label: 'pull' },
        tip: 'Logs sink if you both stand on them too long, so keep moving! Big tar bubbles give stuck friends a pop.',
        cross: [{ kind: 'tied', lead: 0 }, { kind: 'tied', lead: 1 }, { kind: 'tied', lead: 0 }],
        logs: [{ c: 12, w: 2 }, { c: 20, w: 2 }],
        deco: [{ k: 'palm', x: 26, y: 360, h: 160, lean: 0.25 }, { k: 'sign', x: 100, y: 360, text: 'Logs sink!' }, { k: 'fern', x: 900, y: 360 }, { k: 'rock', x: 945, y: 360, w: 16 }],
        switches: {}, signs: [],
        map: [
          '................................', //  0
          '................................', //  1
          '................................', //  2
          '................................', //  3
          '................................', //  4
          '................................', //  5
          '................................', //  6
          '................................', //  7
          '................................', //  8
          '................................', //  9
          '................................', // 10
          '.1.2.........................E..', // 11
          '#####.......................####', // 12
          '#####ttttttttttttttttttttttt####', // 13
          '#####ttttttttttttttttttttttt####', // 14
          '#####tttzttttttttztttttttztt####', // 15
          '################################', // 16
          '################################', // 17
        ],
      },
      { // Room 4: Gerty the brontosaurus is the bridge, then one last pull
        title: "Gerty's Tail", style: 'gerty', act: { label: 'call' },
        tip: 'Gerty the brontosaurus makes a bridge while someone blows her leaf horn. Take turns calling!',
        cross: [{ kind: 'gerty', lead: 1 }, { kind: 'tied', lead: 0 }],
        deco: [{ k: 'fern', x: 125, y: 360, s: 0.7 }, { k: 'fern', x: 600, y: 360, s: 0.8 }, { k: 'eggs', x: 905, y: 360 }],
        switches: {}, signs: [],
        map: [
          '................................', //  0
          '................................', //  1
          '................................', //  2
          '................................', //  3
          '................................', //  4
          '................................', //  5
          '................................', //  6
          '................................', //  7
          '................................', //  8
          '................................', //  9
          '................................', // 10
          '.n12.............n...........E..', // 11
          '#####..........######.......####', // 12
          '#####tttttttttt######ttttttt####', // 13
          '#####tttttttttt######ttttttt####', // 14
          '#####tttttttttt######ttttttt####', // 15
          '################################', // 16
          '################################', // 17
        ],
      },
    ],
  },
  // ----- END 14-3 Tar Pit Pull -----
  //
  // ----- BEGIN 14-4 Raptor Race (mode 'raptor', js/levels/world14/raptor-race.js) -----
  { name: 'Raptor Race', world: 13, kind: 'versus', mode: 'raptor', ownStep: true,
    // side-on jungle race (MODES.raptor): the map is only the two spawns, the mode builds each round's course
    match: { bestOf: 5 },
    act: { label: 'dash' },
    legend: {
      pip: '<kbd>W</kbd> jump <kbd>S</kbd> duck <kbd>A</kbd><kbd>D</kbd> slow · fast',
      bo: '<kbd>↑</kbd> jump <kbd>↓</kbd> duck <kbd>←</kbd><kbd>→</kbd> slow · fast',
      pad: 'stick ◀ ▶ slow · fast, ▲ ▼ pick a path, <span data-glyph="a"></span> jump, down ducks,',
    },
    tip: 'Raptors run by themselves! Jump logs, duck branches, pick a path at forks, grab a speed egg and dash.',
    switches: {}, signs: [],
    map: [
      '................................', '................................', '................................',
      '................................', '................................', '................................',
      '................................', '................................', '................................',
      '................................', '................................', '.....1..2.......................',
      '................................', '................................', '................................',
      '................................', '................................', '................................',
    ],
  },
  // ----- END 14-4 Raptor Race -----
  //
  // ===== END World 14 =====

  /* ===== World 15 (Orbit Outpost, mixed): the space world, world index 14 (js/levels/world15/), friendly and floaty, nothing
     scary. Gavyn's picks (Nov 2026): 15-1 Tethered Spacewalk (team), 15-2 Gravity Flip Station (team), 15-3 Moon Buggy Crew
     (team), 15-4 Planet Hop Race (versus). Each level's def sits between its own BEGIN/END lines. world: 14 ===== */
  // ----- BEGIN 15-1 Tethered Spacewalk (mode 'spacewalk', js/levels/world15/tethered-spacewalk.js) -----
  // 15-1 Tethered Spacewalk (mode 'spacewalk', team, Gavyn's pick): tied together outside the station, one holds a
  // handhold and spins the other round to the next one, then they swap; fix the broken solar panels, then the airlock.
  // Room layout (holds, panels, rocks, satellites, hull, airlock): read by the mode, see the top of its level file.
  { name: 'Tethered Spacewalk', world: 14, kind: 'team', mode: 'spacewalk', ownStep: true, ownHUD: true, noFalls: true,
    act: { label: 'grab' },
    legend: {
      pip: '<kbd>A</kbd><kbd>D</kbd> spin · puff <kbd>W</kbd><kbd>S</kbd> reel · puff',
      bo: '<kbd>←</kbd><kbd>→</kbd> spin · puff <kbd>↑</kbd><kbd>↓</kbd> reel · puff',
      pad: 'stick: spin, reel, puff,',
    },
    tip: 'Tied together in space! One holds a handle and spins the other to the next one. Grab, let go, swap!',
    map: [...Array(8).fill('.'.repeat(32)), '..1..2' + '.'.repeat(26), ...Array(9).fill('.'.repeat(32))],
    rooms: [
      {
        title: 'Station Hull',
        tip: 'Hold grab on a rail and spin your partner with ◀ ▶. They grab the next rail, you let go. Fix 2 panels!',
        hull: [[0, 130, 64, 346, 'module'], [896, 130, 64, 346, 'module'], [0, 476, 960, 30, 'truss']],
        holds: [['s0', 85, 250, 'r'], ['s1', 85, 350, 'r'], ['h1', 200, 180, 'u'], ['h2', 305, 262, 'u'], ['h3', 430, 215, 'u'],
          ['h4', 530, 300, 'u'], ['h5', 655, 250, 'u'], ['h6', 760, 330, 'u']],
        panels: [['p1', 300, 140], ['p2', 620, 395]],
        lock: [896, 300, -1], start: ['s0', 's1'], dock: [32, 180],
      },
      {
        title: 'Asteroid Belt',
        tip: 'The rocks drift up and down and carry grips. Wait for a close one, then swing over. Rocks go boing!',
        hull: [[0, 130, 64, 346, 'module'], [896, 130, 64, 346, 'module'], [0, 476, 960, 30, 'truss']],
        holds: [['s0', 85, 250, 'r'], ['s1', 85, 350, 'r'], ['h1', 200, 190, 'u'], ['h2', 215, 330, 'u'], ['h3', 760, 200, 'u'], ['h4', 760, 340, 'u']],
        rocks: [
          { x: 330, y: 270, r: 28, ay: 105, per: 13, ph: 0, grips: ['l', 'r'] },
          { x: 480, y: 270, r: 28, ay: 105, per: 13, ph: Math.PI, grips: ['l', 'r'] },
          { x: 630, y: 270, r: 28, ay: 105, per: 13, ph: 0, grips: ['l', 'r'] },
        ],
        panels: [['p1', 405, 115], ['p2', 555, 430], ['p3', 820, 120]],
        lock: [896, 300, -1], start: ['s0', 's1'], dock: [32, 180],
      },
      {
        title: 'Spinning Satellite',
        tip: 'The satellite turns! Grab its arms as they come round, and bolt the panels on its wings.',
        hull: [[0, 130, 64, 346, 'module'], [896, 130, 64, 346, 'module'], [0, 476, 960, 30, 'truss']],
        holds: [['s0', 85, 250, 'r'], ['s1', 85, 350, 'r'], ['h1', 200, 185, 'u'], ['h2', 205, 370, 'u'], ['hm', 290, 275, 'u'],
          ['h3', 650, 190, 'u'], ['h4', 655, 370, 'u'], ['h5', 765, 225, 'u'], ['h6', 770, 360, 'u']],
        sats: [{ x: 470, y: 280, r: 30, w: 0.3, a0: 0.4, arms: [[0, 106], [Math.PI / 2, 104, true], [Math.PI, 106], [Math.PI * 1.5, 104, true]],
          holds: [['sa', 0, 118], ['sb', Math.PI, 118]], panels: [['p1', Math.PI / 2, 72], ['p2', Math.PI * 1.5, 72]] }],
        panels: [['p3', 720, 118]],
        lock: [896, 300, -1], start: ['s0', 's1'], dock: [32, 180],
      },
      {
        title: 'Comet Run Home',
        tip: 'Last job, the other way round: drifting rocks, a spinner and 4 panels. Then home to the airlock!',
        hull: [[0, 130, 64, 346, 'module'], [896, 130, 64, 346, 'module'], [0, 476, 960, 30, 'truss']],
        holds: [['s0', 875, 250, 'l'], ['s1', 875, 350, 'l'], ['h1', 760, 180, 'u'], ['h2', 755, 375, 'u'], ['h3', 330, 200, 'u'],
          ['h4', 335, 365, 'u'], ['h5', 225, 290, 'u']],
        rocks: [
          { x: 470, y: 165, r: 26, ax: 60, per: 11, ph: 0, grips: ['l', 'r', 'd'] },
          { x: 470, y: 390, r: 26, ay: 40, per: 9, ph: 1, grips: ['l', 'r', 'u'] },
        ],
        sats: [{ x: 620, y: 280, r: 20, w: -0.45, a0: 0, arms: [[0, 74], [Math.PI / 2, 66, true], [Math.PI, 74], [Math.PI * 1.5, 66, true]],
          holds: [['xa', 0, 86], ['xb', Math.PI, 86]], panels: [['p1', Math.PI / 2, 52], ['p2', Math.PI * 1.5, 52]] }],
        panels: [['p3', 400, 105], ['p4', 300, 440]],
        lock: [64, 300, 1], start: ['s0', 's1'], dock: [928, 180],
      },
    ],
  },
  // ----- END 15-1 Tethered Spacewalk -----
  //
  // ----- BEGIN 15-2 Gravity Flip Station (mode 'gravflip', js/levels/world15/gravity-flip-station.js) -----
  // 15-2 Gravity Flip Station (mode 'gravflip', team): a low-gravity space station where your switches flip your
  // PARTNER's gravity (Gavyn's pick). Pip's orange switches flip Bo, Bo's blue ones flip Pip; a flipped player falls up
  // and walks on the ceiling. Map chars (read by the mode): x Pip's switch, y Bo's switch (on a floor or a ceiling),
  // m button (floor or ceiling) that opens the f force fields, z fizzy zap goo, K keycard, S star, F beacon
  // (checkpoint), E the exit (a floor airlock, or a ceiling hatch). Room plans: see the top of the level file.
  { name: 'Gravity Flip Station', world: 14, kind: 'team', mode: 'gravflip', ownStep: true, ownHUD: true, noFalls: true,
    act: { label: 'flip' },
    legend: { down: 'hold: go back', padDown: 'hold down: go back' },
    tip: 'Your switch flips your PARTNER’s gravity! Pip’s orange switches flip Bo, Bo’s blue ones flip Pip.',
    switches: { f: { plate: 'm', type: 'gate' } }, signs: [],
    rooms: [
      { // ---------- Room 1: Docking Bay (Bo flips Pip over the wall, then Pip flips Bo) ----------
        title: 'Docking Bay', goer: 0, style: 'dock',
        tip: 'Bo, flip Pip up to the ceiling! Pip walks over the wall, then flips Bo the same way.',
        plan: [
          { A: { g: 1 }, say: { A: 'Wait here: {B} flips you up!', B: 'Press {Bkey} at your {Bcol} switch to flip {A}!' } },
          { A: { g: 1, zone: [17, 29] }, key: true, say: { A: 'Walk the ceiling over the wall ▶ and grab the keycard!' } },
          { A: { g: 0, zone: [17, 29] }, key: true, say: { A: 'Wait past the wall: {B} flips you down', B: 'Flip {A} down past the wall ({Bkey} at your switch)!' } },
          { A: { g: 0, zone: [17, 29] }, B: { g: 1 }, key: true, say: { A: 'Your turn: flip {B} at your {Acol} switch ({Akey})!', B: 'Wait here: {A} flips you up!' } },
          { A: { g: 0, zone: [17, 29] }, B: { g: 1, zone: [17, 29] }, key: true, say: { B: 'Walk the ceiling over the wall ▶' } },
          { A: { g: 0, zone: [17, 29] }, B: { g: 0, zone: [17, 29] }, key: true, say: { A: 'Flip {B} back down ({Akey} at your switch)!', B: 'Wait past the wall: {A} flips you down' } },
        ],
        doorSay: 'Both into the airlock!',
        map: [
          '################################',
          '################################',
          '################################',
          '##......S.....K.....S.........##',
          '##............................##',
          '##............................##',
          '##............................##',
          '##............S...............##',
          '##...........###..............##',
          '##...........###..............##',
          '##...........###..............##',
          '##...........###..............##',
          '##...........###..............##',
          '##...........###..............##',
          '##...........###..............##',
          '##1.2..y.x...###.F..y.x...E...##',
          '################################',
          '################################',
        ],
      },
      { // ---------- Room 2: Hydro Garden (a gap into space, a ceiling button and a floor button) ----------
        title: 'Hydro Garden', goer: 1, style: 'garden',
        tip: 'Cross the gap on the ceiling. Stand on a button to open the force field for your partner.',
        plan: [
          { A: { g: 1 }, say: { A: 'Wait here: {B} flips you up!', B: 'Flip {A} up: {Bkey} at your {Bcol} switch!' } },
          { A: { g: 1, zone: [18, 21] }, key: true, say: { A: 'Walk the ceiling over the gap ▶ and grab the keycard!' } },
          { A: { g: 1, zone: [18, 21] }, B: { g: 1 }, key: true, say: { A: 'Flip {B} up from your switch up there ({Akey})!', B: 'Wait here: {A} flips you up!' } },
          { A: { g: 1, zone: [18, 21] }, B: { g: 1, zone: [18, 21] }, key: true, say: { B: 'Walk the ceiling over the gap ▶' } },
          { A: { g: 0, zone: [18, 21] }, B: { g: 1, zone: [18, 21] }, key: true, say: { A: 'Wait over the floor: {B} flips you down', B: 'Flip {A} down onto the floor ({Bkey})!' } },
          { A: { g: 0, zone: [18, 23] }, B: { g: 1, hold: 0 }, key: true, say: { B: 'Stand on the ceiling button: it opens the field!' } },
          { A: { g: 0, zone: [24, 29] }, B: { g: 1, hold: 0 }, key: true, say: { A: 'Go through the open field ▶', B: 'Keep standing on the button!' } },
          { A: { g: 0, zone: [24, 29] }, key: true },
          { A: { g: 0, zone: [24, 29] }, B: { g: 1 }, key: true, say: { A: 'Flip {B} up: {Akey} at your {Acol} switch!', B: 'Wait here: {A} flips you up!' } },
          { A: { g: 0, zone: [24, 29] }, B: { g: 1, zone: [18, 21] }, key: true, say: { B: 'Walk the ceiling over the gap ▶' } },
          { A: { g: 0, zone: [24, 29] }, B: { g: 0, zone: [18, 21] }, key: true, say: { A: 'Flip {B} down: {Akey} at your {Acol} switch!', B: 'Wait here: {A} flips you down' } },
          { A: { g: 0, hold: 1 }, B: { g: 0, zone: [18, 23] }, key: true, say: { A: 'Stand on the floor button to open the field!', B: 'Wait for the field to open' } },
          { A: { g: 0, hold: 1 }, B: { g: 0, zone: [24, 29] }, key: true, say: { A: 'Keep standing on the button!', B: 'Go through the open field ▶' } },
          { A: { g: 0, zone: [24, 29] }, B: { g: 0, zone: [24, 29] }, key: true },
        ],
        doorSay: 'Both into the airlock!',
        map: [
          '################################',
          '################################',
          '################################',
          '##..S........K....xym.##...S..##',
          '##....................##......##',
          '##....................##......##',
          '##.............S......##......##',
          '##....................##......##',
          '##....................##......##',
          '##....................##......##',
          '##....................##......##',
          '##....................ff......##',
          '##....................ff......##',
          '##....................ff......##',
          '##....................ff......##',
          '##1.2.x.y.........xF.yffmFxyE.##',
          '#########.........##############',
          '#########.........##############',
        ],
      },
      { // ---------- Room 3: Star Lab (jump off the ceiling and get flipped mid-air onto the island) ----------
        title: 'Star Lab', goer: 0, style: 'lab',
        tip: 'Zap goo on the ceiling! Jump off the ceiling before it, and get flipped in mid-air onto the floating island.',
        plan: [
          { A: { g: 1 }, say: { A: 'Wait here: {B} flips you up!', B: 'Flip {A} up: {Bkey} at your {Bcol} switch!' } },
          { A: { g: 0, zone: [12, 18] }, jump: [{ x: 280, dir: 1 }, { x: 680, dir: -1 }], say: { A: 'Jump off the ceiling before the goo, toward the island', B: 'Flip {A} when the jump is over the island ({Bkey})!' } },
          { A: { g: 0, zone: [23, 29] }, key: true, say: { A: 'Grab the keycard, then hop over to the right ▶' } },
          { A: { g: 0, zone: [23, 29] }, B: { g: 1 }, key: true, say: { A: 'Flip {B} up: {Akey} at your {Acol} switch!', B: 'Wait here: {A} flips you up!' } },
          { A: { g: 0, zone: [23, 29] }, B: { g: 0, zone: [12, 18] }, jump: [{ x: 280, dir: 1 }, { x: 680, dir: -1 }], key: true, say: { A: 'Flip {B} when the jump is over the island ({Akey})!', B: 'Jump off the ceiling before the goo, toward the island' } },
          { A: { g: 0, zone: [23, 29] }, B: { g: 0, zone: [23, 29] }, key: true, say: { B: 'Hop over to the right ▶' } },
        ],
        doorSay: 'Both into the airlock!',
        map: [
          '################################',
          '################################',
          '################################',
          '##........zzzzzzzzzzzz.....S..##',
          '##............................##',
          '##............................##',
          '##.........S..................##',
          '##............................##',
          '##...........F..K.............##',
          '##..........#######...........##',
          '##..........#######...........##',
          '##............................##',
          '##..................S.........##',
          '##............................##',
          '##............................##',
          '##1.2.x.y..............F.xy.E.##',
          '#########..............#########',
          '#########..............#########',
        ],
      },
      { // ---------- Room 4: Command Deck (flipped up mid-air over the goo, two buttons, the ceiling hatch) ----------
        title: 'Command Deck', goer: 1, style: 'deck',
        tip: 'The shuttle hatch is on the ceiling! Run, jump, get flipped up over the goo, then help each other through.',
        plan: [
          { A: { g: 1, zone: [18, 29] }, jump: [{ x: 338, dir: 1 }], say: { A: 'Run and jump ▶ over the goo: {B} flips you up!', B: 'Flip {A} at the top of the jump ({Bkey})!' } },
          { A: { g: 1, zone: [18, 29] }, B: { g: 1, zone: [18, 29] }, jump: [{ x: 338, dir: 1 }], say: { A: 'Flip {B} at the top of the jump ({Akey})!', B: 'Run and jump ▶ over the goo!' } },
          { A: { g: 1, zone: [18, 23] }, B: { g: 0, zone: [20, 21] }, say: { A: 'Flip {B} down onto the little floor ({Akey})!', B: 'Wait over the clean floor: {A} flips you down' } },
          { A: { g: 1, zone: [18, 23] }, B: { g: 0, hold: 1 }, say: { B: 'Stand on the floor button: it opens the field!' } },
          { A: { g: 1, zone: [24, 29] }, B: { g: 0, hold: 1 }, say: { A: 'Walk the ceiling through the field ▶', B: 'Keep standing on the button!' } },
          { A: { g: 1, zone: [24, 29] }, B: { g: 1, zone: [18, 23] }, say: { A: 'Flip {B} up: {Akey} at your {Acol} switch!', B: 'Wait here: {A} flips you up!' } },
          { A: { g: 1, hold: 0 }, B: { g: 1, zone: [18, 23] }, say: { A: 'Stand on the ceiling button to open the field!', B: 'Wait for the field to open' } },
          { A: { g: 1, hold: 0 }, B: { g: 1, zone: [24, 29] }, say: { A: 'Keep standing on the button!', B: 'Walk through the field ▶' } },
          { A: { g: 1, zone: [24, 29] }, B: { g: 1, zone: [24, 29] } },
        ],
        doorSay: 'Both into the ceiling hatch!',
        map: [
          '################################',
          '################################',
          '################################',
          '##..S.......zzzzzzxy..ffmx..yS##',
          '##....................ff..E...##',
          '##....................ff......##',
          '##....................ff......##',
          '##....................ff......##',
          '##...............S....ff......##',
          '##....................##......##',
          '##....................##......##',
          '##....................##......##',
          '##....................##......##',
          '##....................##......##',
          '##....................##......##',
          '##1.2..x.y..zzzzzzzz.m##x.F.y.##',
          '################################',
          '################################',
        ],
      },
    ],
  },
  // ----- END 15-2 Gravity Flip Station -----
  //
  // ----- BEGIN 15-3 Moon Buggy Crew (mode 'buggy', js/levels/world15/moon-buggy-crew.js) -----
  // 15-3: side-on moon buggy (MODES.buggy): one drives, one works the grabber arm; jobs swap every room. The map is only the
  // two spawns, the mode builds each room from its course (tokens: see the top of the level file).
  { name: 'Moon Buggy Crew', world: 14, kind: 'team', mode: 'buggy', ownStep: true, ownHUD: true, noFalls: true,
    legend: {
      pip: '<kbd>A</kbd><kbd>D</kbd> drive <kbd>W</kbd> hop · claw <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>',
      bo: '<kbd>←</kbd><kbd>→</kbd> drive <kbd>↑</kbd> hop · claw <kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd>',
      pad: 'stick: drive · claw, <span data-glyph="a"></span> hop,',
    },
    tip: 'One drives the moon buggy, one works the grabber arm: toss boulders away and grab shiny moon rocks!',
    act: { label: 'grab', labels: ['honk', 'grab'] },
    map: [...Array(15).fill('.'.repeat(32)), '..1.2' + '.'.repeat(27), '.'.repeat(32), '.'.repeat(32)],
    rooms: [
      {
        title: 'Crater Flats', driver: 0, act: { label: 'grab', labels: ['honk', 'grab'] },
        tip: 'Pip drives: ◀ ▶ go, ▲ hops craters, honk at critters. Bo moves the claw: grab rocks, toss boulders back!',
        course: ['f300', 'S:{D} drives  ·  {A} works the claw', 'f140', 'r0+60', 'f200', 'r0+30', 'f150', 'h390', 'f80',
          'S:Boulder! {A}: grab it, swing it back, let go', 'f220', 'b', 'f280', 'r0+70', 'f160', 's90', 'f120', 'R+50', 'f220',
          'F', 'f150', 'S:Crater! {D}: hop at the edge', 'f230', 'r105+55', 'c105', 'f220', 'S:A sleepy critter! {D}: honk', 'f160',
          'k', 'f260', 'r0+40', 'u200', 'f120', 'R+30', 'd200', 'f160', 'F', 'f150', 'b', 'f260', 'r95+50', 'c100', 'f200', 'r0+40',
          'f160', 'X'],
      },
      {
        title: 'Boulder Alley', driver: 1, act: { label: 'grab', labels: ['grab', 'honk'] },
        tip: 'Swap! Bo drives, Pip works the claw. A huge crater? Stop at the edge and fill it up with boulders!',
        course: ['f300', 'S:Swap! {D} drives, {A} works the claw', 'f120', 'r0+80', 'f200', 'u160', 'f80', 'R+30', 'd160', 'f160',
          'b', 'f150', 'b+95', 'f330', 'r0+40', 'f150', 'R+50', 'f200', 'F', 'f150', 'h260', 'f100', 'r105+60', 'c115', 'f260',
          'S:Too wide to jump! Fill it with boulders', 'f260', 'w340', 'f240', 'r0+30', 'f150', 'F', 'f150', 'k', 'f260', 'r0+50',
          'f120', 'b', 'f280', 'R+20', 'f200', 'r0+40', 'f160', 'X'],
      },
      {
        title: 'Dark Side', driver: 0, dark: true, act: { label: 'grab', labels: ['honk', 'grab'] },
        tip: 'Pip drives in the dark: the headlight shows the way. Bouncy moss goes BOING! Full speed at the ramp!',
        course: ['f300', 'S:The dark side! Lights on', 'f160', 'r0+40', 'f200', 'S:Bouncy moss! Boing!', 'f150', 'r120+190', 'o140',
          'f340', 'r125+190', 'o140', 'f300', 'F', 'f150', 'b', 'f280', 'k', 'f280', 'r0+50', 'f180',
          'S:Ramp! {D}: full speed, hop at the top', 'f460', 'r150+210', 'j230', 'f300', 'r0+40', 'f160', 'F', 'f160', 'h260',
          'b', 'f280', 'r0+30', 'f120', 'r100+50', 'c105', 'f200', 'R+40', 'f180', 'X'],
      },
      {
        title: 'Rocket Pad', driver: 1, act: { label: 'grab', labels: ['grab', 'honk'] },
        tip: 'Bo drives to the rocket! Park in the box, honk to open the hatch, and Pip lifts the rock crate in.',
        course: ['f300', 'S:Last stretch! The rocket is waiting', 'f120', 'r0+60', 'f200', 'h260', 'f60', 'r105+50', 'c110', 'f240',
          'b', 'f260', 'F', 'f150', 'r120+190', 'o140', 'f560', 'w340', 'f240', 'r0+40', 'f140', 'F', 'f200', 'S:Ramp! Full speed!',
          'f400', 'r150+210', 'j230', 'f280', 'b', 'f260', 'k', 'f220', 'r0+40', 'f160', 'S:Park in the box under the rocket!', 'E'],
      },
    ],
  },
  // ----- END 15-3 Moon Buggy Crew -----
  //
  // ----- BEGIN 15-4 Planet Hop Race (mode 'planethop', js/levels/world15/planet-hop-race.js) -----
  { name: 'Planet Hop Race', world: 14, kind: 'versus', mode: 'planethop', ownStep: true,
    // a race over tiny round planets (MODES.planethop): the map is only the two spawns, the mode builds each round's course
    match: { bestOf: 5 },
    act: { label: 'boost' },
    legend: {
      pip: '<kbd>A</kbd><kbd>D</kbd> run <kbd>W</kbd> jump <kbd>S</kbd> dive',
      bo: '<kbd>←</kbd><kbd>→</kbd> run <kbd>↑</kbd> jump <kbd>↓</kbd> dive',
      pad: 'stick run, <span data-glyph="a"></span> jump, down dives,',
    },
    tip: 'Run round each little planet and jump to the next! Boost is a jet puff, one per jump. First to the rocket wins!',
    switches: {}, signs: [],
    map: [
      '................................', '................................', '................................',
      '................................', '................................', '................................',
      '.....1..........................', '................................', '................................',
      '.....2..........................', '................................', '................................',
      '................................', '................................', '................................',
      '................................', '................................', '................................',
    ],
  },
  // ----- END 15-4 Planet Hop Race -----
  //
  // ===== END World 15 =====

  /* ===== World 16 (Sugar Rush Factory, mixed): the candy land / candy factory world, world index 15 (js/levels/world16/),
     sweet and silly, nothing scary. Gavyn's picks (Nov 2026): 16-1 Conveyor Belt Chaos (team), 16-2 Gumball Machine Puzzle
     (team), 16-3 Chocolate River Raft (team), 16-4 Sprinkle Catch (versus). Each level's def sits between its own BEGIN/END
     lines. world: 15 ===== */
  // ----- BEGIN 16-1 Conveyor Belt Chaos (mode 'conveyor', js/levels/world16/conveyor-belt-chaos.js) -----
  // 16-1 (MODES.conveyor, Gavyn's pick): one works the levers on the catwalk (belt speed and direction, a lift, a
  // trapdoor), the other runs and jumps on the belts below and sorts candy into the right bins; jobs swap every room.
  // The map is only the two spawns: the mode builds each room's grid from its belts and shelves (see the level file).
  { name: 'Conveyor Belt Chaos', world: 15, kind: 'team', mode: 'conveyor', ownStep: true, ownHUD: true, noFalls: true,
    legend: {
      pip: '<kbd>A</kbd><kbd>D</kbd> run · walk <kbd>W</kbd> jump · faster <kbd>S</kbd> drop · slower',
      bo: '<kbd>←</kbd><kbd>→</kbd> run · walk <kbd>↑</kbd> jump · faster <kbd>↓</kbd> drop · slower',
      pad: 'stick: run · walk · belt speed, <span data-glyph="a"></span> jump · faster,',
    },
    tip: 'One works the levers that run the belts, one grabs the candy and tosses it into the right bin!',
    act: { label: 'grab', labels: ['grab', 'lever'] },
    map: [...Array(14).fill('.'.repeat(32)), '...1....2' + '.'.repeat(23), ...Array(3).fill('.'.repeat(32))],
    rooms: [
      {
        title: 'Lollipop Line', sorter: 0, act: { label: 'grab', labels: ['grab', 'lever'] }, sorterX: 480, opX: 330,
        tip: 'Bo: at the lever, ▲ ▼ set the speed and the action flips the belt. Pip: grab candy, toss it in its bin!',
        belts: [{ id: 'A', name: 'Belt', c0: 5, c1: 22, r: 12, col: 'mint', st: 420 }],
        chutes: [{ belt: 'A', x: 225, every: 3.0, mix: ['lolly', 'gum'] }],
        bins: [{ kind: 'lolly', x: 46, y: 450 }, { kind: 'gum', x: 880, y: 450 }],
        order: { lolly: 3, gum: 3 },
      },
      {
        title: 'Gumdrop Gallery', sorter: 1, act: { label: 'grab', labels: ['lever', 'grab'] }, sorterX: 420, opX: 600,
        tip: 'Swap! Bo sorts, Pip works the levers. Gumdrops go up on the high shelf: Pip works the lift!',
        belts: [
          { id: 'U', name: 'Top belt', c0: 9, c1: 22, r: 8, col: 'lilac', st: 480 },
          { id: 'L', name: 'Low belt', c0: 6, c1: 20, r: 12, col: 'mint', st: 240 },
        ],
        shelves: [[26, 31, 8]],
        lift: { x0: 690, x1: 780, lo: 450, hi: 240, st: 735 },
        chutes: [{ belt: 'U', x: 630, every: 3.2, mix: ['gum', 'lolly', 'choc'] }],
        bins: [{ kind: 'lolly', x: 50, y: 450 }, { kind: 'choc', x: 868, y: 450 }, { kind: 'gum', x: 876, y: 240 }],
        order: { gum: 3, lolly: 2, choc: 2 },
      },
      {
        title: 'Wrap & Ribbon', sorter: 0, act: { label: 'grab', labels: ['grab', 'lever'] }, sorterX: 450, opX: 420,
        tip: 'The wrapper only wraps toffees on SLOW. Bo opens the trapdoor to drop candy down to Pip!',
        belts: [
          { id: 'U', name: 'Top belt', c0: 3, c1: 29, r: 8, col: 'lilac', st: 240, ends: ['wall', 'mouth'] },
          { id: 'L', name: 'Low belt', c0: 8, c1: 24, r: 12, col: 'mint', st: 760 },
        ],
        wrap: { belt: 'U', x: 340 },
        trap: { belt: 'U', c0: 17, c1: 18, st: 540 },
        chutes: [{ belt: 'U', x: 150, every: 2.6, mix: ['toffee', 'choc', 'lolly'] }],
        bins: [{ kind: 'gift', x: 44, y: 450 }, { kind: 'lolly', x: 124, y: 450 }, { kind: 'choc', x: 886, y: 450 }],
        order: { gift: 3, choc: 2, lolly: 2 },
      },
      {
        title: 'Rush Hour', sorter: 1, act: { label: 'grab', labels: ['lever', 'grab'] }, sorterX: 420, opX: 480,
        tip: 'Rush hour! Two chutes, the lift, the trapdoor and the wrapper. Fill Boss Bonbon\'s big order!',
        belts: [
          { id: 'U', name: 'Top belt', c0: 9, c1: 22, r: 8, col: 'lilac', st: 360 },
          { id: 'L', name: 'Low belt', c0: 4, c1: 20, r: 12, col: 'mint', st: 200, ends: ['wall', 'fall'] },
        ],
        shelves: [[26, 31, 8]],
        lift: { x0: 690, x1: 780, lo: 450, hi: 240, st: 735 },
        wrap: { belt: 'U', x: 410 },
        trap: { belt: 'U', c0: 17, c1: 18, st: 560 },
        chutes: [{ belt: 'U', x: 320, every: 2.6, mix: ['toffee', 'gum', 'choc', 'lolly'] }, { belt: 'L', x: 190, every: 3.4, mix: ['lolly', 'choc', 'gum'] }],
        bins: [{ kind: 'lolly', x: 48, y: 450 }, { kind: 'choc', x: 828, y: 450 }, { kind: 'gift', x: 912, y: 450 }, { kind: 'gum', x: 876, y: 240 }],
        order: { lolly: 3, gum: 3, choc: 2, gift: 2 },
      },
    ],
  },
  // ----- END 16-1 Conveyor Belt Chaos -----
  //
  // ----- BEGIN 16-2 Gumball Machine Puzzle (mode 'gumball', js/levels/world16/gumball-machine-puzzle.js) -----
  // 16-2: a giant gumball machine seen from the front (MODES.gumball, team): one cranks gumballs into the board and picks
  // the chute, the other runs the wafer ledges and flips the levers so each colour rolls into its own cup. Jobs swap every
  // machine (room `crank`: 0 Pip cranks, 1 Bo cranks). `machine` names the board in GUMBALL_MACHINES (the level file);
  // the map only holds the keeper's wafer ledges ('=' one-way, levers stand on rows 8, 11 and 14) and the board's walls.
  { name: 'Gumball Machine Puzzle', world: 15, kind: 'team', mode: 'gumball', ownStep: true, ownHUD: true, noFalls: true,
    roomWord: 'Machine',
    legend: {
      pip: 'crank: <kbd>A</kbd><kbd>D</kbd> chute <kbd>S</kbd> swap · levers: <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> move',
      bo: 'crank: <kbd>←</kbd><kbd>→</kbd> chute <kbd>↓</kbd> swap · levers: <kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd> move',
      pad: 'stick: chute · swap · move, <span data-glyph="a"></span> hop,',
    },
    tip: 'One turns the crank to drop gumballs, one flips the levers so every colour rolls into its matching cup!',
    act: { label: 'crank', labels: ['crank', 'flip'] },
    map: [
      '......#..................#......', '......#..................#......', '......#..................#......',
      '......#..................#......', '......#..................#......', '......#..................#......',
      '......#..................#......', '......#..................#......', '======#..................#======',
      '......#..................#......', '......#..................#......', '======#..................#======',
      '......#..................#......', '......#..................#......', '======#..................#======',
      '................................', '...1.2..........................', '################################',
    ],
    rooms: [
      { title: 'Sweet Start', machine: 'start', crank: 0, act: { label: 'crank', labels: ['crank', 'flip'] },
        tip: 'Pip cranks gumballs out of the globe. Bo runs the ledges and flips each lever so the gumball rolls into its own cup!' },
      { title: 'Switch Tracks', machine: 'switch', crank: 1, act: { label: 'crank', labels: ['flip', 'crank'] },
        tip: 'Swap! Bo cranks and picks the chute with ◀ ▶. The seesaw tips over by itself after every gumball!' },
      { title: 'Spinner Swirl', machine: 'spin', crank: 0, act: { label: 'crank', labels: ['crank', 'flip'] },
        tip: 'Pip cranks again. Trapdoors only stay open for 3 seconds: open them just before the gumball gets there!' },
      { title: 'Jackpot Machine', machine: 'jackpot', crank: 1, act: { label: 'crank', labels: ['flip', 'crank'] },
        tip: 'Bo cranks the big one! Flick the flipper to send a gumball flying. Fill every cup for the golden JACKPOT!' },
    ],
  },
  // ----- END 16-2 Gumball Machine Puzzle -----
  //
  // ----- BEGIN 16-3 Chocolate River Raft (mode 'raft', js/levels/world16/chocolate-river-raft.js) -----
  // 16-3: a top-down cookie raft (MODES.raft): one paddles, one hooks candy and shoves things away; jobs swap at every
  // dock. The map is only the two spawns, the mode builds each stretch of river from its course (tokens: see the top of
  // the level file).
  { name: 'Chocolate River Raft', world: 15, kind: 'team', mode: 'raft', ownStep: true, ownHUD: true, noFalls: true, roomWord: 'Stretch',
    legend: {
      pip: '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> steer · aim the hook',
      bo: '<kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd> steer · aim the hook',
      pad: 'stick: steer · aim the hook,',
    },
    tip: 'Ride a cookie raft down the chocolate river! One paddles, one hooks candy and shoves logs away.',
    act: { label: 'hook', labels: ['paddle', 'hook'] },
    map: [...Array(15).fill('.'.repeat(32)), '..1.2' + '.'.repeat(27), '.'.repeat(32), '.'.repeat(32)],
    rooms: [
      {
        title: 'Cocoa Creek', paddler: 0, width: 420, current: 70, act: { label: 'hook', labels: ['paddle', 'hook'] },
        tip: 'Pip paddles: steer, and paddle for a big push. Bo hooks candy into the basket and shoves things away!',
        course: ['f420', 'S:{P} steers the raft  ·  {H} aims the hook', 'f200', 'c:wrap:0.25', 'f240', 'c:wrap:-0.35', 'f180',
          'S:{H}: hook the candy!', 'f120', 'c:lolly:0.8', 'd500:120', 'c:wrap:-0.85', 'f160', 'm:0', 'f220', 'c:wrap:0.6',
          'u560:160', 'c:lolly:-0.88', 'f200', 'E:0.75:440', 'c:gummy:0.85+200', 'f480', 'S:Candy by the bank? Steer close to it!',
          'L:-0.2:150', 'f300', 'c:wrap:0.9', 'd420:100', 'm:-0.5', 'c:wrap:0.05+80', 'f220', 'F', 'W300', 'f260',
          'S:Log jam! {H}: shove it twice', 'f300', 'J', 'f220', 'W420', 'c:lolly:-0.85', 'f200', 'b:0.3', 'f260', 'c:wrap:0.75',
          'u420:100', 'c:gummy:-0.88', 'f320', 'S:Dock at the pier to swap jobs!', 'D'],
      },
      {
        title: 'Marshmallow Rapids', paddler: 1, width: 380, current: 85, act: { label: 'hook', labels: ['hook', 'paddle'] },
        tip: 'Swap! Bo paddles, Pip hooks. Rapids push hard: steer round the marshmallow rocks, or shove them away!',
        course: ['f420', 'S:Swap! {P} paddles, {H} hooks', 'f200', 'c:wrap:0.5', 'f220', 'c:wrap:-0.55', 'f160',
          'C150', 'W300', 'S:Rapids! Hold on to your sprinkles!', 'f220', 'm:-0.45', 'f240', 'm:0.45', 'c:wrap:0+110', 'f260', 'b:0',
          'f220', 'c:lolly:-0.85', 'f200', 'C85', 'W400', 'd420:120', 'E:-0.75:420', 'c:gummy:-0.88+200', 'f460', 'F',
          'C150', 'W280', 'S:A wall of rocks! {H}: shove one away', 'f360', 'm:-0.66', 'm:0', 'm:0.66', 'f320', 'c:wrap:0.4', 'f200',
          'b:-0.3', 'f220', 'C85', 'W400', 'u420:120', 'c:wrap:0.85', 'f200', 'L:0.3:160', 'f260', 'c:lolly:0.88', 'f200',
          'c:wrap:-0.75', 'f200', 'F', 'W300', 'f220', 'J', 'f240', 'W400', 'c:gummy:0.88', 'f300', 'b:0.2', 'c:wrap:-0.6+100', 'f320', 'D'],
      },
      {
        title: 'Caramel Swirls', paddler: 0, width: 440, current: 75, act: { label: 'hook', labels: ['paddle', 'hook'] },
        tip: 'Pip paddles again. Paddle round the caramel whirlpools while Bo hooks the swirling candy. Toffee gates!',
        course: ['f420', 'S:Caramel whirlpools! Paddle round the edge', 'f200', 'c:wrap:-0.4', 'f320', 'P:0.15:110:3', 'f620',
          'c:wrap:0.85', 'd420:120', 'E:0.72:400', 'c:gummy:0.86+190', 'f480', 'F', 'S:Toffee gate! Paddle to the ring and hold still',
          'f340', 'G:-1', 'f520', 'c:lolly:-0.86', 'f200', 'P:-0.3:120:4', 'f640', 'c:wrap:0.65', 'u420:150', 'b:0', 'f260',
          'c:wrap:-0.85', 'f220', 'F', 'W320', 'f220', 'J', 'f240', 'W440', 'G:1', 'f420', 'c:gummy:0.88', 'f220', 'P:0.2:100:3',
          'f640', 'c:wrap:-0.75', 'f320', 'D'],
      },
      {
        title: 'Fudge Falls', paddler: 1, width: 400, current: 85, act: { label: 'hook', labels: ['hook', 'paddle'] },
        tip: 'Bo paddles to the candy village! Hit the fudge ramp straight and fast to jump Fudge Falls. Splat? Try again!',
        course: ['f420', 'S:Last stretch! Fudge Falls ahead', 'f200', 'c:wrap:0.45', 'f220', 'C140', 'W300', 'm:0.4', 'f220', 'b:-0.3',
          'f220', 'c:lolly:0.8', 'f200', 'm:-0.55', 'm:0.15+10', 'f320', 'C85', 'W400', 'G:-1', 'f420', 'c:gummy:-0.88', 'f220',
          'P:0.3:110:3', 'f620', 'F', 'W300', 'f220', 'J', 'f220', 'W400', 'c:wrap:0.75', 'f240',
          'S:Fudge Falls! Line up with the ramp and paddle hard!', 'C125', 'f300', 'F', 'b:0.45', 'f320', 'c:wrap:-0.6',
          'b:-0.45+120', 'f420', 'K:0', 'C55', 'W460', 'f240', 'c:gummy:0.35', 'f220', 'c:wrap:-0.45', 'f300', 'V'],
      },
    ],
  },
  // ----- END 16-3 Chocolate River Raft -----
  //
  // ----- BEGIN 16-4 Sprinkle Catch (mode 'sprinkle', js/levels/world16/sprinkle-catch.js) -----
  { name: 'Sprinkle Catch', world: 15, kind: 'versus', mode: 'sprinkle', ownStep: true,
    // one candy-land arena (MODES.sprinkle runs its own little platformer): the map is only the two spawns
    match: { bestOf: 5 },
    act: { label: 'bump' },
    tagLift: 18,   // name tags clear the basket on each head
    tip: 'Catch falling candy in your basket! Dodge the bouncy gobstoppers and bump the other one to make them spill.',
    switches: {}, signs: [],
    map: [
      '................................', '................................', '................................',
      '................................', '................................', '................................',
      '................................', '................................', '................................',
      '................................', '................................', '................................',
      '................................', '................................', '................................',
      '........1..............2........', '................................', '................................',
    ],
  },
  // ----- END 16-4 Sprinkle Catch -----
  //
  // ===== END World 16 =====

  /* ===== World 17 (Jungle Jamboree, mixed): the jungle world, world index 16 (js/levels/world17/), leafy, sunny and
     friendly, nothing scary. Gavyn's picks (Nov 2026): 17-1 Temple Doors (team), 17-2 River Rapids Canoe (team),
     17-3 Waterfall Climb (team), 17-4 Vine Swing (versus). Each level's def sits between its own BEGIN/END lines. world: 16 ===== */
  // ----- BEGIN 17-1 Temple Doors (mode 'temple', js/levels/world17/temple-doors.js) -----
  // 17-1 Temple Doors (mode 'temple', team): one stands on a pressure plate to open a stone door while the other runs
  // through (Gavyn's pick). Doors slide down SLOWLY when the plate is let go, and glyph lights above each door count
  // down how long it can still be passed. Map chars (read by the mode): a door letter from the room's `doors` (a door
  // column), a plate char from `plates`, ~ water (a soft "Splash!"), z golden banana, f torch (checkpoint, each player
  // their own), Y the stone monkey idol, E the exit (both must stand in it). The mode draws everything itself.
  // Room def: logic ('gate' | 'relay' | 'idol' | 'sun': which helper plans the room), lead (who holds first), style,
  // doors: { L: { glyph, close (s to shut), lights, open: [[plates...], ...] (any group fully pressed), shut: [plates]
  // (pressed: forced shut), sun: true (opens when the Sun Door glyphs are done) } }, plates: { ch: { seq: glyph } },
  // mango: [x, y] (Mango the monkey's perch).
  { name: 'Temple Doors', world: 16, kind: 'team', mode: 'temple', noFalls: true, ownHUD: true,
    act: { label: 'shout' },
    legend: { down: 'hold: go back', padDown: 'hold down: go back' },
    tip: 'Stand on a plate to open a stone door for your partner. Let go and it slides shut slowly: dash!',
    signs: [],
    rooms: [
      { // ---------- Room 1: Mossy Gate (Pip holds first, then Bo holds from the far side) ----------
        title: 'Mossy Gate', logic: 'gate', lead: 0, style: 'gate', act: { label: 'shout' }, mango: [450, 54],
        tip: 'Pip, stand on the plate: the leaf door opens for Bo! Then Bo holds the far plate for Pip.',
        doors: { A: { glyph: 'leaf', close: 2.0, lights: 5, open: [['3'], ['4']] } },
        plates: {},
        map: [
          '################################',
          '################################',
          '##.............#..............##',
          '##.............#..............##',
          '##.............#..............##',
          '##.............#..............##',
          '##.............#..............##',
          '##.............#..............##',
          '##.............#..............##',
          '##.............#..............##',
          '##..........z..#..............##',
          '##...z.........#..............##',
          '##...##........#..............##',
          '##.............A..........z...##',
          '##.............A..............##',
          '##3.f1.2.......A..f...E......4##',
          '#########~~##############~~#####',
          '#########~~##############~~#####',
        ],
      },
      { // ---------- Room 2: Two-Way Plates (each plate opens one door and shuts the other) ----------
        title: 'Two-Way Plates', logic: 'relay', lead: 1, style: 'relay', act: { label: 'shout' }, mango: [390, 54],
        tip: 'Each plate opens one door and shuts the other! Leaf plate, then hop to the flower plate: dash through both!',
        doors: {
          A: { glyph: 'leaf', close: 2.8, lights: 5, open: [['3'], ['6']], shut: ['4', '5'] },
          B: { glyph: 'flower', close: 2.8, lights: 5, open: [['4'], ['5']], shut: ['3', '6'] },
        },
        plates: {},
        map: [
          '################################',
          '################################',
          '##..........###...............##',
          '##..........###...............##',
          '##..........###...............##',
          '##..........###...............##',
          '##..........###...............##',
          '##.......z..###...............##',
          '##..........###...............##',
          '##..........###...............##',
          '##......3.4.###.5.6....z......##',
          '##....###############.........##',
          '####........###........##.....##',
          '####........A.B........##.....##',
          '#####.......AzB.......###.....##',
          '#####.f2.1..A.B.f.....###.E...##',
          '#############~##################',
          '#############~##################',
        ],
      },
      { // ---------- Room 3: Idol Hall (the moon door needs two plates at once; the big star door is slow) ----------
        title: 'Idol Hall', logic: 'idol', lead: 0, style: 'idol', act: { label: 'pull' }, mango: [660, 54],
        tip: 'The moon door needs BOTH moon plates! Push the monkey idol onto one, or stand on one each and run together.',
        doors: {
          C: { glyph: 'moon', close: 2.6, lights: 6, open: [['3', '4'], ['6']] },
          D: { glyph: 'star', close: 8.5, lights: 8, open: [['5'], ['7']] },
        },
        plates: {},
        map: [
          '################################',
          '################################',
          '##................#.......#...##',
          '##................#.......#...##',
          '##................#.......#...##',
          '##................#.......#...##',
          '##................#.......#...##',
          '##................#.......#...##',
          '##................#.......#...##',
          '##................#.......#...##',
          '##................#.......#...##',
          '##..z.............#.......#...##',
          '##..##............#...z...#...##',
          '##..........z.....C.......D...##',
          '##................C.......D...##',
          '##.5..Y1.3f2...4..C.f...6.DE.7##',
          '############~~##################',
          '############~~##################',
        ],
      },
      { // ---------- Room 4: The Sun Door (one on each side; press the glyphs in the order carved on the door) ----------
        title: 'The Sun Door', logic: 'sun', lead: 0, style: 'sun', act: { label: 'shout' }, mango: [480, 40],
        tip: 'One on each side! Press the glyph plates in the order carved on the Sun Door. Star plates open your partner’s star door.',
        doors: {
          K: { glyph: 'star', close: 1.6, lights: 4, open: [['p']] },
          N: { glyph: 'star', close: 1.6, lights: 4, open: [['n']] },
          S: { glyph: 'sun', close: 2, lights: 0, sun: true },
          W: { glyph: 'sun', close: 2, lights: 0, sun: true },
        },
        plates: { m: { seq: 'leaf' }, j: { seq: 'frog' }, g: { seq: 'bird' }, q: { seq: 'fish' }, l: { seq: 'flower' }, h: { seq: 'moon' } },
        map: [
          '################################',
          '################################',
          '##..............z.............##',
          '##............................##',
          '##............1f.2............##',
          '##..........########..........##',
          '########....#......#....########',
          '##.....K....#......#....N.....##',
          '##.z...K....#......#....N...z.##',
          '##...g.K....#......#....N.h...##',
          '##.######...#......#...######.##',
          '##..........#......#..........##',
          '##........j.#......#.l........##',
          '##.......##.S......W.##.......##',
          '##.......##.S......W.##.......##',
          '##..m.n..##.S..E...W.##..p.q..##',
          '################################',
          '################################',
        ],
      },
    ],
  },
  // ----- END 17-1 Temple Doors -----
  //
  // ----- BEGIN 17-2 River Rapids Canoe (mode 'canoe', js/levels/world17/river-rapids-canoe.js) -----
  // 17-2 River Rapids Canoe (team, Gavyn's pick): both ride one canoe down a jungle river, seen from above. The paddler
  // steers with paddle strokes (◀ ▶ in turn on a steady beat is fast and straight, ▼ slows); the bailer scoops water out
  // with a bucket (the action, timed) and pokes rocks, logs and branches out of the way with an oar (◀ ▶ aim, ▲ poke).
  // Jobs swap at the calm pool after each stretch. Course tokens: the top of the level file. The map is only the spawns.
  { name: 'River Rapids Canoe', world: 16, kind: 'team', mode: 'canoe', ownStep: true, ownHUD: true, noFalls: true, roomWord: 'Stretch',
    act: { label: 'paddle', labels: ['paddle', 'bail'] },
    legend: {
      pip: '<kbd>A</kbd><kbd>D</kbd> paddle · aim <kbd>S</kbd> slow <kbd>W</kbd> poke',
      bo: '<kbd>←</kbd><kbd>→</kbd> paddle · aim <kbd>↓</kbd> slow <kbd>↑</kbd> poke',
      pad: 'stick: paddle · aim, down slows, <span data-glyph="a"></span> poke,',
    },
    tip: 'Paddle down the jungle river together! One paddles and steers, one bails water and pokes logs away.',
    map: [...Array(15).fill('.'.repeat(32)), '..1.2' + '.'.repeat(27), '.'.repeat(32), '.'.repeat(32)],
    rooms: [
      {
        title: 'Lazy Bend', paddler: 0, pal: 'lazy', act: { label: 'paddle', labels: ['paddle', 'bail'] },
        tip: 'Pip paddles: left, right, left, right! Bo bails water and pokes the branches out of the way.',
        course: ['v40', 'w215', 'f420', 'S:{P}: {Plr} in turn to paddle. Swish!||{P} paddles left, right, in turn. Swish!', 'm:0:mango', 'f260', 'm:-34:banana', 'f300',
          'S:An island! {P}: steer around it||An island! {P} steers around it', 'f120', 'i:0:62:110:tapir', 'f330', 'c380', 'm:-40:mango', 'f260', 'A:toucan:R', 'f180',
          'S:Splashy water! {B}: {Bact} to bail when the bucket is full||Splashy water! {B} bails when the bucket is full', 'f60', 'R:340', 'm:30:berry', 'f460', 'c570', 'm:40:banana', 'f220', 'A:monkey:L', 'f240', 'F',
          'S:A wobbly rock! {B}: aim {Blr}, poke {Bpoke}||A wobbly rock! {B} aims the oar and pokes it', 'f160', 'p:0', 'f300', 'm:-70:mango', 'f160', 'p:50', 'f320', 'c480',
          'S:Branches! {B}: poke them out of the way||Branches! {B} pokes them out of the way', 'f200', 'j:4', 'f340', 'b:-80', 'b:85', 'm:0:melon', 'f300', 'A:frog:L',
          'R:280', 'm:40:mango', 'f420', 'c420', 'm:-30:starfruit', 'f300', 'A:parrot:R', 'f260', 'P'],
      },
      {
        title: 'Rocky Rapids', paddler: 1, pal: 'rapids', act: { label: 'paddle', labels: ['bail', 'paddle'] },
        tip: 'Swap! Bo paddles round the big rocks. Pip bails fast in the white water and pokes the wobbly rocks.',
        course: ['v60', 'w195', 'f380', 'S:Big rocks! {P}: steer round them||Big rocks! {P} steers round them', 'i:0:50:90', 'f280', 'b:-70', 'm:65:mango', 'f220', 'b:60', 'f220',
          'S:White water! {B}: bail, bail, bail!||White water! {B} bails fast', 'RR:520', 'b:-10', 'm:-80:banana', 'f190', 'b:70', 'f170', 'b:-75', 'f240', 'c410', 'f160',
          'S:{P}: {Pdown} slows down, so less water splashes in||{P} slows down, so less water splashes in', 'p:-10', 'm:70:coconut', 'f260', 'A:monkey:R', 'RR:440', 'b:55', 'f170', 'b:-55', 'f170', 'p:5', 'f240', 'F',
          'c550', 'w175', 'R:300', 'f120', 'b:0', 'f80', 'm:-55:berry', 'm:55:mango', 'f220', 'j:3', 'f320',
          'RR:520', 'b:-60', 'f160', 'b:45', 'f170', 'p:-25', 'f200', 'm:0:starfruit', 'A:toucan:L', 'f300', 'c480', 'w200', 'F',
          'R:300', 'b:75', 'b:-75', 'f280', 'm:0:mango', 'f280', 'A:parrot:L', 'f200', 'P'],
      },
      {
        title: 'Log Jam', paddler: 0, pal: 'logjam', act: { label: 'paddle', labels: ['paddle', 'bail'] },
        tip: 'Pip paddles again. Logs float across the river! Bo pokes the big logs twice to clear the log jams.',
        course: ['v48', 'w210', 'f380', 'S:Floating logs! Go round them or poke them away', 'i:0:56:100:turtle', 'f300', 'l:-70:120:80:38', 'f300', 'm:40:mango',
          'l:60:110:70:-34', 'f320', 'S:A log jam! Big logs need two pokes', 'f140', 'j:4:2', 'f320', 'm:-60:banana', 'm:60:berry', 'f260', 'A:sloth:L',
          'i:-25:66:130:turtle', 'f380', 'l:0:130:90:46', 'f300', 'F', 'R:300', 'l:-40:100:60:30', 'f240', 'p:30', 'f240', 'c380', 'j:5:2', 'f320',
          'c560', 'l:40:140:80:-42', 'f260', 'm:-40:coconut', 'f260', 'A:frog:R', 'l:-50:120:90:40', 'l:60:120:90:-40', 'f320', 'F', 'j:4:2', 'f300',
          'm:0:starfruit', 'f220', 'c480', 'R:260', 'f380', 'A:monkey:L', 'P'],
      },
      {
        title: 'Big Waterfall Drop', paddler: 1, pal: 'falls', act: { label: 'paddle', labels: ['bail', 'paddle'] },
        tip: 'Bo paddles to the Big Waterfall! Keep the canoe dry, aim for the gold gap, then WHOOSH!',
        course: ['v70', 'w200', 'f380', 'S:The Big Waterfall is ahead! Keep the canoe dry', 'i:0:52:96', 'f240', 'RR:460', 'b:-60', 'm:70:mango', 'f200', 'b:55', 'f230',
          'c410', 'p:0', 'f220', 'm:55:berry', 'f240', 'A:parrot:R', 'l:30:110:80:40', 'f320', 'F',
          'RR:500', 'b:60', 'f170', 'b:-45', 'f170', 'p:20', 'f220', 'j:3', 'f300', 'm:0:coconut', 'c480', 'w185', 'f240',
          'S:Bail before the drop! {P}: aim for the gold gap||Bail before the drop! {P} aims for the gold gap', 'f220', 'v95', 'f240', 'g:40:120', 'f150', 'W',
          'v55', 'w230', 'f80', 'S:SPLASH! {B}: bail it all out!||SPLASH! {B} bails it all out', 'RR:360', 'm:-45:starfruit', 'm:45:mango', 'f380', 'A:capy:L', 'R:200', 'f380', 'E'],
      },
    ],
  },
  // ----- END 17-2 River Rapids Canoe -----
  //
  // ----- BEGIN 17-3 Waterfall Climb (mode 'waterfall', js/levels/world17/waterfall-climb.js) -----
  // 17-3 Waterfall Climb (mode 'waterfall', team, Gavyn's pick): a tall climb up beside a big jungle waterfall; the camera
  // scrolls up with the pair. Ledges are too high for one jump: one braces (hold down or the action) and the other jumps
  // off their hands for a BIG boost, then lowers a vine at the post for the partner. Wet rocks, a stream a log keeps
  // blocking, a drifting log, mist geysers, springy moss and friendly frogs on the way. The 18-row map is only for the
  // engine; the mode builds the climb from def.climb (rows top first, 32 wide). Climb chars (read by the mode):
  // # rock, s wet slippery rock, m springy moss, g mist geyser vent (solid), ~ water (Splash!), w falling stream,
  // L the log's lane over a pool, V vine post (on a ledge's top edge), C checkpoint, * gem, r frog, N toucan nest,
  // 1 2 starts. The comment after each row is the height of a player's feet standing in that row (in tiles).
  // route: one step per ledge (at: [col0, col1, feet height]) saying how to move on from it, for the hints and the
  // computer: jump (from: take-off column, to: [column, height]), wall (a boost wall, by order from the bottom), log,
  // geyser, frog, nest. Columns may have halves (x = col * 30 px). hop: the computer jumps from a standstill (no run-up).
  { name: 'Waterfall Climb', world: 16, kind: 'team', mode: 'waterfall', ownStep: true, ownHUD: true, noFalls: true,
    act: { label: 'help' },
    legend: { down: 'brace', padDown: 'down braces', jump: 'jump · climb', padJump: 'jump · climb' },
    tip: 'Ledges too high? One braces (hold ▼), the other jumps off their hands. Then drop a vine for your partner!',
    map: [...Array(15).fill('.'.repeat(32)), '..1.2' + '.'.repeat(27), '.'.repeat(32), '.'.repeat(32)],
    sections: [{ name: 'Mossy Steps', h: 0 }, { name: 'Log Jam Falls', h: 18 }, { name: 'Misty Geysers', h: 44 }, { name: 'Toucan Top', h: 75 }],
    streams: [{ flow: 3.2, off: 3.6 }],
    lanes: [{ speed: 55 }],
    route: [
      { at: [1, 13, 0], go: 'wall', wall: 0 },
      { at: [14, 20, 5], go: 'jump', from: 19.5, to: [23.5, 8] },
      { at: [22, 26, 8], go: 'jump', from: 26.4, to: [29.8, 8], say: 'slip' },
      { at: [29, 30, 8], go: 'jump', from: 30.1, to: [26.5, 12], say: 'moss' },
      { at: [20, 27, 12], go: 'wall', wall: 1 },
      { at: [7, 19, 18], go: 'jump', from: 8.75, to: [6.9, 21], stream: 0 },
      { at: [6, 7, 21], go: 'jump', from: 6.35, to: [4, 24], stream: 0 },
      { at: [3, 4, 24], go: 'jump', from: 4.6, to: [6.9, 27], stream: 0 },
      { at: [6, 7, 27], go: 'jump', from: 7.4, to: [9.5, 30], stream: 0 },
      { at: [8, 13, 30], go: 'log', lane: 0, to: [24.5, 30] },
      { at: [23, 26, 30], go: 'wall', wall: 2 },
      { at: [27, 30, 36], go: 'jump', from: 27.4, to: [23.4, 38] },
      { at: [18, 24, 38], go: 'wall', wall: 3, say: 'slip' },
      { at: [1, 17, 44], go: 'geyser', gey: 0, to: [9.6, 51] },
      { at: [8, 12, 51], go: 'frog', frog: 0, to: [14.6, 56] },
      { at: [13, 22, 56], go: 'wall', wall: 4 },
      { at: [23, 30, 62], go: 'geyser', gey: 1, to: [24.6, 69] },
      { at: [16, 26, 69], go: 'wall', wall: 5 },
      { at: [1, 15, 75], go: 'jump', from: 7.7, to: [5, 78], hop: true, say: 'slip' },
      { at: [4, 6, 78], go: 'jump', from: 4.4, to: [1.6, 81], say: 'moss' },
      { at: [1, 2, 81], go: 'jump', from: 1.5, to: [5.2, 85], say: 'moss' },
      { at: [4, 8, 85], go: 'frog', frog: 1, to: [11.6, 90] },
      { at: [10, 19, 90], go: 'wall', wall: 6, say: 'slip' },
      { at: [20, 30, 96], go: 'nest' },
    ],
    climb: [
      '#..............................#', // 101
      '#..............................#', // 100
      '#.....................*........#', // 99
      '#..............................#', // 98
      '#..............................#', // 97
      '#...................V...C..N...#', // 96
      '#...................############', // 95
      '#...................############', // 94
      '#...................############', // 93
      '#...................############', // 92
      '#...................############', // 91
      '#...................############', // 90
      '#.........ssssssssss############', // 89
      '#..............................#', // 88
      '#..............................#', // 87
      '#*.............................#', // 86
      '#......r.......................#', // 85
      '#...#####......................#', // 84
      '#..............................#', // 83
      '#..............................#', // 82
      '#..............................#', // 81
      '#mm............................#', // 80
      '#..............................#', // 79
      '#..............................#', // 78
      '#...sss........................#', // 77
      '#..............................#', // 76
      '#..........C...V...............#', // 75
      '################...............#', // 74
      '#........#######...............#', // 73
      '#........#######...............#', // 72
      '#........#######...............#', // 71
      '#........#######...............#', // 70
      '#........#######...............#', // 69
      '#........##################....#', // 68
      '#..............................#', // 67
      '#..............................#', // 66
      '#..............................#', // 65
      '#..............................#', // 64
      '#..............................#', // 63
      '#......................V..C....#', // 62
      '#......................######gg#', // 61
      '#......................######..#', // 60
      '#..................*...######..#', // 59
      '#......................######..#', // 58
      '#......................######..#', // 57
      '#......................######..#', // 56
      '#............##########........#', // 55
      '#..............................#', // 54
      '#..............................#', // 53
      '#..............................#', // 52
      '#..........r...................#', // 51
      '#.......#####..................#', // 50
      '#..............................#', // 49
      '#..............................#', // 48
      '#..............................#', // 47
      '#.*............................#', // 46
      '#..............................#', // 45
      '#............C...V.............#', // 44
      '####gg############.............#', // 43
      '#..........#######.............#', // 42
      '#..........#######.............#', // 41
      '#..........#######.............#', // 40
      '#..........#######.............#', // 39
      '#..........#######.............#', // 38
      '#..........#######sssssss......#', // 37
      '#..........................V.C.#', // 36
      '#..........................#####', // 35
      '#..........................#####', // 34
      '########..........*........#####', // 33
      '########...................#####', // 32
      '#wwwwwww...................#####', // 31
      '#wwwwwww..C...LLLLLLLLL....#####', // 30
      '#wwwwwww######~~~~~~~~~#########', // 29
      '#wwwwwww########################', // 28
      '#wwwwwww.......................#', // 27
      '#ww*wwss.......................#', // 26
      '#wwwwwww.......................#', // 25
      '#wwwwwww.......................#', // 24
      '#wwsswww.......................#', // 23
      '#wwwwwww.......................#', // 22
      '#wwwwwww.......................#', // 21
      '#wwwwwss.......................#', // 20
      '#wwwwwww.......................#', // 19
      '#wwwwwww.......C...V...........#', // 18
      '#~~~~~~#############...........#', // 17
      '####################...........#', // 16
      '#.............######...........#', // 15
      '#.............######.........*.#', // 14
      '#.............######...........#', // 13
      '#.............######...........#', // 12
      '#.............##############...#', // 11
      '#.......................*......#', // 10
      '#..............................#', // 9
      '#..............................#', // 8
      '#.....................sssss..mm#', // 7
      '#..............................#', // 6
      '#.............V................#', // 5
      '#.............#######..........#', // 4
      '#.............#######..........#', // 3
      '#.............#######..........#', // 2
      '#.............#######..........#', // 1
      '#..1.2........#######..........#', // 0
      '#####################~~~~~~~~~~#', // -1
    ],
  },
  // ----- END 17-3 Waterfall Climb -----
  //
  // ----- BEGIN 17-4 Vine Swing (mode 'vine', js/levels/world17/vine-swing.js) -----
  // 17-4 Vine Swing (mode 'vine', versus, best of 5, Gavyn's pick): both swing from their own vines at once, pump with
  // the swing, let go at the right moment and fly; the camera follows them right. Longest landing wins the round.
  { name: 'Vine Swing', world: 16, kind: 'versus', mode: 'vine', ownStep: true,
    // the map is only the two spawns: the mode builds each round's field (MODES.vine)
    match: { bestOf: 5 },
    act: { label: 'glide' },
    legend: {
      pip: '<kbd>A</kbd><kbd>D</kbd> pump <kbd>W</kbd> let go <kbd>S</kbd> tuck',
      bo: '<kbd>←</kbd><kbd>→</kbd> pump <kbd>↑</kbd> let go <kbd>↓</kbd> tuck',
      pad: 'stick ◀ ▶ pump, <span data-glyph="a"></span> let go, down tucks,',
    },
    tip: 'Pump ◀ ▶ with the swing, jump to let go, open your leaf at the top. Longest swing wins!',
    switches: {}, signs: [],
    map: [
      '................................', '................................', '................................',
      '................................', '................................', '................................',
      '.....1..........................', '................................', '................................',
      '.....2..........................', '................................', '................................',
      '................................', '................................', '................................',
      '................................', '................................', '................................',
    ],
  },
  // ----- END 17-4 Vine Swing -----
  //
  // ===== END World 17 =====
  //
  // ===== World 18 (Pirate Cove, mixed): the pirate world, world index 17 (js/levels/world18/), a sunny tropical cove with
  //   friendly pirates, nothing scary, nobody gets hurt. Gavyn's picks (Nov 2026): 18-1 Runaway Ship (team, scrolling),
  //   18-2 Grapple & Zip (team, scrolling), 18-3 Tide Pool Dig (team), 18-4 Plank Duel (versus, best of 5).
  //   Each level's def sits between its own BEGIN/END lines. world: 17 =====
  //
  // ----- BEGIN 18-1 Runaway Ship (mode 'runship', js/levels/world18/runaway-ship.js) -----
  // 18-1 Runaway Ship (team, Gavyn's pick): the ship broke loose and sails itself out of the harbor, seen from the side.
  // The helm steers between three sea lanes round rocks and reefs (▲ ▼), eases off (◀) and rings the bell (the action) as
  // big waves hit; the deckhand runs round the deck patching leaks, pumping, hauling the flapping rope when the wind
  // changes, untangling the rigging up the rope ladder and looking out from the crow's nest in fog. Jobs swap at the buoy
  // after each stretch. Course tokens: the top of the level file. The map is only the spawns.
  { name: 'Runaway Ship', world: 17, kind: 'team', mode: 'runship', ownStep: true, ownHUD: true, noFalls: true, roomWord: 'Stretch',
    act: { label: 'bell', labels: ['bell', 'fix'] },
    legend: {
      pip: '<kbd>W</kbd><kbd>S</kbd> steer · climb <kbd>A</kbd><kbd>D</kbd> run · <kbd>A</kbd> ease off',
      bo: '<kbd>↑</kbd><kbd>↓</kbd> steer · climb <kbd>←</kbd><kbd>→</kbd> run · <kbd>←</kbd> ease off',
      pad: 'stick: steer · run · climb, ◀ eases off, <span data-glyph="a"></span> jump,',
    },
    tip: 'Sail the runaway ship to Treasure Cove! One steers round the rocks, one fixes leaks, ropes and sails.',
    map: [...Array(15).fill('.'.repeat(32)), '..1.2' + '.'.repeat(27), '.'.repeat(32), '.'.repeat(32)],
    rooms: [
      {
        title: 'Harbor Mouth', helm: 0, pal: 'harbor', cruise: 150, act: { label: 'bell', labels: ['bell', 'fix'] },
        tip: 'Pip steers with ▲ ▼ round the rocks. Bo runs the deck: patch leaks, pump, pull ropes, untangle!',
        course: ['f250', 'S:{H}: steer with {Hud} round the rocks!||{H} steers round the rocks', 'f350', 'r1', 'f450', 'r0', 'f220', 'c2', 'f420',
          'S:A reef! Steer round it, or the ship runs aground', 'f220', 'R1', 'f420', 'c1', 'f300',
          'S:Creak! {D}: stand on the leak and hold {Dact}||Creak! {D} patches the leak', 'L', 'f600',
          'S:The wind changed! {D}: pull the glowing rope {Dact}||The wind changed! {D} pulls the flapping rope', 'N', 'f650', 'r2', 'f350', 'r01', 'f400',
          'S:A big wave! {H}: ring the bell {Hact} as it hits the front||A big wave! {H} rings the bell as it hits', 'f200', 'V', 'f650',
          'S:Squawk! {D}: climb the ladder {Dup} and hold {Dact} on the knot||Squawk! {D} climbs up to untangle the ropes', 'T:200', 'f700',
          'R02', 'f380', 'c1', 'f380', 'r1', 'f450', 'B'],
      },
      {
        title: 'Reef Run', helm: 1, pal: 'reef', cruise: 168, act: { label: 'bell', labels: ['fix', 'bell'] },
        tip: 'Swap! Bo steers between the reefs. Pip keeps the ship patched, pumped and the sail full.',
        course: ['f250', 'S:Reef Run! {H}: weave between the reefs||{H} weaves between the reefs', 'f300', 'R1', 'f420', 'R02', 'c1', 'f450', 'r1', 'f160', 'c2', 'f320', 'R01', 'f320',
          'N', 'f420', 'r2', 'f300', 'r0', 'f300', 'c1', 'f380', 'T:150', 'f320', 'R1', 'f450', 'r02', 'f400', 'V', 'f500', 'L', 'R12', 'c0', 'f450', 'r0', 'f300', 'r1', 'f380',
          'c2', 'f300', 'R01', 'f550', 'B'],
      },
      {
        title: 'Stormy Patch', helm: 0, pal: 'storm', cruise: 165, act: { label: 'bell', labels: ['bell', 'fix'] },
        tip: 'Pip steers through the storm: ring the bell for big waves! Bo looks out from the crow\'s nest in the fog.',
        course: ['f250', 'S:Stormy seas! {H}: ring the bell {Hact} as each big wave hits||Stormy seas! {H} rings the bell for each big wave', 'f250', 'V', 'f600', 'r1', 'f300', 'N', 'r0', 'f380', 'V', 'f520', 'c2', 'f300',
          'S:Fog ahead! {D}: climb to the crow\'s nest so {H} can see||Fog ahead! {D} climbs to the crow\'s nest to look out', 'f450', 'F:1900', 'f220', 'q', 'f420', 'q', 'f420', 'q', 'f420', 'q', 'f420',
          'T:220', 'f300', 'N', 'f380', 'V', 'f600', 'R1', 'f400', 'c0', 'r2', 'f450', 'L', 'f300', 'r01', 'f500', 'B'],
      },
      {
        title: 'Treasure Cove', helm: 1, pal: 'cove', cruise: 168, act: { label: 'bell', labels: ['fix', 'bell'] },
        tip: 'Bo steers to Treasure Cove through the last fog. Then both run to the anchor and hold the action!',
        course: ['f250', 'S:Nearly there! Sail on to Treasure Cove', 'f300', 'r1', 'f350', 'c0', 'f300', 'R12', 'f400', 'N', 'f300', 'r0', 'f300', 'c2', 'f300',
          'S:More fog! {D}: look out from the crow\'s nest||More fog! {D} looks out from the crow\'s nest', 'f450', 'F:1500', 'f220', 'q', 'f420', 'q', 'f420', 'q', 'f420',
          'T:180', 'f380', 'V', 'f500', 'R02', 'c1', 'f400', 'r1', 'f300', 'c0', 'f300', 'r2', 'f420', 'S:Land ho! Treasure Cove!', 'f380', 'E'],
      },
    ],
  },
  // ----- END 18-1 Runaway Ship -----
  //
  //
  //
  //
  // ----- BEGIN 18-2 Grapple & Zip (mode 'grapple', js/levels/world18/grapple-and-zip.js) -----
  // 18-2 Grapple & Zip (mode 'grapple', team, Gavyn's pick): cross a whole fleet of friendly pirate ships, side view, the
  // camera scrolling right ship by ship. From the crow's nest the thrower aims (▲ ▼), holds the action to charge and lets
  // go to throw a grappling hook through the next ship's ring. The zipper grabs the handle and zips down the rope for
  // coins (▶ faster, ◀ brake, ▲ legs up, ▼ dip, action lets go), then cranks the capstan to haul the thrower across in
  // the bosun's chair. Whoever arrives first throws next, so the jobs swap every hop. 4 fleets of 2 hops.
  // fleet: the first ship is where the fleet starts; each later ship also describes the hop INTO it (see the level file:
  // gap, nest, ring, coins 'm.h.l', chair coins, obs, wind, gust, boom, lines, gulls, sign).
  { name: 'Grapple & Zip', world: 17, kind: 'team', mode: 'grapple', ownStep: true, ownHUD: true, noFalls: true, roomWord: 'Fleet',
    act: { label: 'throw', labels: ['throw', 'grab'] },
    legend: {
      pip: '<kbd>A</kbd><kbd>D</kbd> walk <kbd>W</kbd><kbd>S</kbd> climb · aim · legs',
      bo: '<kbd>←</kbd><kbd>→</kbd> walk <kbd>↑</kbd><kbd>↓</kbd> climb · aim · legs',
      pad: 'stick: walk, climb, aim, legs,',
    },
    tip: 'Throw the hook through the next ring, zip down the rope for coins, then crank your partner across!',
    map: [...Array(15).fill('.'.repeat(32)), '..1.2' + '.'.repeat(27), '.'.repeat(32), '.'.repeat(32)],
    rooms: [
      {
        title: 'Dockside Hop', act: { label: 'throw', labels: ['throw', 'grab'] },
        tip: 'Pip throws first: aim, hold to charge, let go. Bo zips down the rope, then cranks Pip across!',
        fleet: [
          { dock: true, name: 'Pirate Cove Dock', nest: 150 },
          { name: 'Sea Biscuit', pal: 'red', gap: 400, nest: 190, ring: 90, coins: 'm.m.h.m', chair: 'm.h', crew: 2,
            sign: '{T}: {Tud} aim, hold {Tact}, let go to throw the hook through the ring!||{T} throws the hook through the ring. Then {Z} zips!' },
          { name: 'Jolly Jelly', pal: 'teal', gap: 430, nest: 200, ring: 95, coins: 'm.h.l.m.m', chair: 'l.h', obs: ['flag:0.55'], crew: 2,
            sign: 'Swap! {T} throws now. Zipping: {Zud} for high and low coins||Swap! {T} throws now, {Z} zips for the coins' },
        ],
      },
      {
        title: 'Laundry Day', act: { label: 'throw', labels: ['throw', 'grab'] },
        tip: 'Laundry lines! Throw over the socks or under them. Dip under the lanterns as you zip.',
        fleet: [
          { name: 'Jolly Jelly', pal: 'teal', nest: 200, ring: 95, crew: 2 },
          { name: 'Salty Sock', pal: 'yellow', gap: 470, nest: 215, ring: 110, coins: 'm.l.h.m.l', chair: 'h.m', obs: ['lant:0.45'], crew: 1,
            lines: [[-70, 250, 60, 246]], sign: 'Socks on the line! Throw over them or under them' },
          { name: 'Merry Mermaid', pal: 'pink', gap: 500, nest: 225, ring: 100, coins: 'h.m.l.m.h.m', chair: 'l.h', obs: ['flag:0.4', 'lant:0.7'], crew: 2,
            lines: [[-130, 236, -30, 240], [70, 262, 170, 256]] },
        ],
      },
      {
        title: 'Windy Boom', act: { label: 'throw', labels: ['throw', 'grab'] },
        tip: 'Wind and a swinging boom! Watch the wind arrow and throw as the ring swings by.',
        fleet: [
          { name: 'Merry Mermaid', pal: 'pink', nest: 225, ring: 100, crew: 2 },
          { name: 'Breezy Barnacle', pal: 'green', gap: 520, nest: 232, ring: 115, wind: 90, boom: 34, coins: 'm.h.l.h.m.l', chair: 'h.l.m', obs: ['lant:0.35', 'flag:0.65'], crew: 2,
            sign: 'A tailwind pushes the hook further, and the ring swings on its boom!' },
          { name: 'Wobbly Whale', pal: 'purple', gap: 540, nest: 240, ring: 108, wind: -70, gust: 55, boom: 40, coins: 'l.m.h.m.l.h', chair: 'm.h', obs: ['flag:0.3', 'lant:0.55', 'flag:0.76'], crew: 1,
            lines: [[-40, 284, 90, 288]], sign: 'A gusty headwind! Throw a little harder' },
        ],
      },
      {
        title: "Polly's Flagship", act: { label: 'throw', labels: ['throw', 'grab'] },
        tip: "Gulls and gusts on the way to Captain Polly's flagship. The last haul is uphill: heave together!",
        fleet: [
          { name: 'Wobbly Whale', pal: 'purple', nest: 240, ring: 108, crew: 1 },
          { name: 'Lucky Lobster', pal: 'blue', gap: 560, nest: 248, ring: 120, gust: 90, coins: 'h.l.m.h.l.m', chair: 'l.m.h', obs: ['lant:0.4', 'flag:0.62'], crew: 2,
            gulls: [[0, 300, 120, 30, 0.8]], lines: [[-160, 232, -60, 228]], sign: 'Gulls! Throw when the way is clear' },
          { name: 'The Golden Polly', pal: 'flag', flagship: true, gap: 590, nest: 270, ring: 160, wind: 40, gust: 70, coins: 'm.h.l.m.h.l.m', chair: 'h.l.h', obs: ['flag:0.35', 'lant:0.6'], crew: 3,
            gulls: [[-90, 292, 90, 26, 0.9], [130, 252, 70, 30, 1.1]], sign: "Captain Polly's flagship! The last bit of the haul is uphill" },
        ],
      },
    ],
  },
  // ----- END 18-2 Grapple & Zip -----
  //
  //
  //
  //
  // ----- BEGIN 18-3 Tide Pool Dig (mode 'tidedig', js/levels/world18/tide-pool-dig.js) -----
  // 18-3 Tide Pool Dig (mode 'tidedig', team): one digs for buried chests while the other bails out seawater with a
  // bucket and shoos away crabs that steal coins (Gavyn's pick). A side view of a beach, cut away under the sand.
  // Map chars (read by the mode): # sand (diggable only under an x), r rock, x an X mark (a chest is buried under it,
  // see chests), w the sea (the dump spot is its edge), p a rock pool in the sand (another dump spot), n a crab burrow,
  // h the treasure blanket (coins saved), y the sand-wall spot, q a rope post (the big chest haul). Row 9 is the beach.
  // Room def: title, tip, digger (0 Pip, 1 Bo; the other bails), polly (x of Captain Polly's perch), act (labels per
  // role), style ('cove' | 'pools' | 'wreck' | 'skull'), chests: [{ depth (tiles of sand over it), coins, big, haul
  // (both haul it up on the ropes) }] in the X marks' left-to-right order, waves: { every (s), first (s), pour (px of water into a hole), reach (x the waves
  // run up to), big (every Nth wave is BIG, over the sand wall), bigPour, ramp: { every, pour, reach, over (s) } (the
  // tide coming in: the numbers move to these over the room) }, crabs: { max, every, first } (null: no crabs).
  { name: 'Tide Pool Dig', world: 17, kind: 'team', mode: 'tidedig', noFalls: true, ownHUD: true,
    act: { label: 'dig', labels: ['dig', 'bail'] },
    legend: { jump: 'jump (hold: climb out)', padJump: 'jump (hold: climb out)' },
    tip: 'One digs at the X, the other bails the waves out with a bucket and shoos the coin-grabbing crabs!',
    signs: [],
    rooms: [
      { // ---------- Room 1: Sandy Cove (one chest, gentle waves, no crabs; Pip digs) ----------
        title: 'Sandy Cove', digger: 0, polly: 320, style: 'cove', act: { label: 'dig', labels: ['dig', 'bail'] },
        tip: 'Pip, dig at the X! Bo, scoop the seawater out of the hole and dump it in the sea.',
        chests: [{ depth: 4, coins: 12 }],
        waves: { every: 7, first: 4, pour: 24, reach: 330 },
        crabs: null,
        map: [
          '................................',
          '................................',
          '................................',
          '................................',
          '................................',
          '................................',
          '................................',
          '................................',
          '......h.......1.....2...........',
          '################x#########wwwwww',
          '################################',
          '################################',
          '################################',
          '################################',
          '################################',
          '################################',
          'rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr',
          'rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr',
        ],
      },
      { // ---------- Room 2: Rock Pools (two chests, crabs, a rock pool to dump in; Bo digs) ----------
        title: 'Rock Pools', digger: 1, polly: 470, style: 'pools', act: { label: 'dig', labels: ['bail', 'dig'] },
        tip: 'Bo digs, Pip bails. Cheeky crabs grab coins: shoo them (action, or land a jump next to them)!',
        chests: [{ depth: 3, coins: 12 }, { depth: 4, coins: 14 }],
        waves: { every: 6, first: 4, pour: 26, reach: 300 },
        crabs: { max: 2, every: 6, first: 3 },
        map: [
          '................................',
          '................................',
          '................................',
          '................................',
          '................................',
          '................................',
          '................................',
          'rr..............................',
          'rrn.....h....2..1...............',
          '####pp######x######x######wwwwww',
          '################################',
          '################################',
          '################################',
          '################################',
          '################################',
          '################################',
          'rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr',
          'rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr',
        ],
      },
      { // ---------- Room 3: Shipwreck Beach (a deep chest under the wreck, bigger waves, a sand wall; Pip digs) ----------
        title: 'Shipwreck Beach', digger: 0, polly: 320, style: 'wreck', act: { label: 'dig', labels: ['dig', 'bail'] },
        tip: 'Pip digs deep under the wreck. Bo, pat a sand wall to stop a small wave: BIG waves go over it!',
        chests: [{ depth: 6, coins: 20 }],
        waves: { every: 6, first: 4, pour: 26, reach: 380, big: 2, bigPour: 40 },
        crabs: { max: 2, every: 6, first: 3 },
        map: [
          '................................',
          '................................',
          '................................',
          '................................',
          '................................',
          '................................',
          '................................',
          'rr..............................',
          'rrn...h........1...2..y..n......',
          '################x#########wwwwww',
          '################################',
          '################################',
          '################################',
          '################################',
          '################################',
          '################################',
          'rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr',
          'rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr',
        ],
      },
      { // ---------- Room 4: Skull Rock Lagoon (a small chest, then the big one; the tide comes in; Bo digs) ----------
        title: 'Skull Rock Lagoon', digger: 1, polly: 265, style: 'skull', act: { label: 'dig', labels: ['bail', 'dig'] },
        tip: 'The tide is coming in! Bo digs, Pip bails and shoos. Haul the big chest up together on the ropes!',
        chests: [{ depth: 2, coins: 8 }, { depth: 6, coins: 30, big: true, haul: true }],
        waves: { every: 6.5, first: 4, pour: 24, reach: 300, big: 3, bigPour: 40, ramp: { every: 4.5, pour: 32, reach: 240, over: 150 } },
        crabs: { max: 3, every: 5, first: 3 },
        map: [
          '................................',
          '................................',
          '................................',
          '................................',
          'rrrr............................',
          'rrrr............................',
          'rrrr............................',
          'rrrr............................',
          'rrrrn.....2..1h..q...q.y.n......',
          '######pp###x#######x######wwwwww',
          '################################',
          '################################',
          '################################',
          '################################',
          '################################',
          '################################',
          'rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr',
          'rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr',
        ],
      },
    ],
  },
  // ----- END 18-3 Tide Pool Dig -----
  //
  //
  //
  //
  // ----- BEGIN 18-4 Plank Duel (mode 'plankduel', js/levels/world18/plank-duel.js) -----
  // 18-4 Plank Duel (mode 'plankduel', versus, best of 5, Gavyn's pitch): a foam-sword fight on a plank over the lagoon.
  // Swing high or low, block by guarding the same height (stand = high, hold down = low), hop over low swings, hold the
  // action to charge a lunge. Every bonk pushes the other back; off the end is a splash and the round.
  { name: 'Plank Duel', world: 17, kind: 'versus', mode: 'plankduel', ownStep: true,
    // the map is only the two spawns: the mode builds each round's plank (MODES.plankduel); round time is set per plank
    match: { bestOf: 5, roundTime: 45 },
    act: { label: 'swing' },
    legend: {
      pip: '<kbd>A</kbd><kbd>D</kbd> step <kbd>S</kbd> low <kbd>W</kbd> hop',
      bo: '<kbd>←</kbd><kbd>→</kbd> step <kbd>↓</kbd> low <kbd>↑</kbd> hop',
      pad: 'stick ◀ ▶ step, down guards low, <span data-glyph="a"></span> hops,',
    },
    tip: 'Swing high, or hold ▼ to swing low. Guard the same height to block. Bonk them off the end!',
    switches: {}, signs: [],
    map: [
      '................................', '................................', '................................',
      '................................', '................................', '................................',
      '................................', '................................', '................................',
      '................................', '................................', '..............1..2..............',
      '................................', '................................', '................................',
      '................................', '................................', '................................',
    ],
  },
  // ----- END 18-4 Plank Duel -----
  //
  //
  //
  // ===== END World 18 =====
  //
  // ===== World 19 (Tumbleweed Gulch, mixed): the Wild West world, world index 18 (js/levels/world19/), a sunny desert
  //   town with red mesas, cactus and friendly cowpokes, nothing scary, nobody gets hurt (cork popguns only). Gavyn's
  //   picks (Nov 2026): 19-1 Train Heist Hop (team, scrolling), 19-2 Handcar Hustle (team, scrolling), 19-3 Gold Mine
  //   Cart (team, scrolling), 19-4 Quick-Draw Showdown (versus, best of 7).
  //   Each level's def sits between its own BEGIN/END lines. world: 18 =====
  //
  // ----- BEGIN 19-1 Train Heist Hop (mode 'heist', js/levels/world19/train-heist-hop.js) -----
  // 19-1 Train Heist Hop (mode 'heist', team, Gavyn's pick): run along the roofs of a runaway train to the engine and pull
  // the brake, carrying the bandits' dropped gold sack back to the sheriff. The carrier jumps low, so at wide gaps the free
  // one jumps first and the sack is tossed across. Duck the bridges, water spouts and the tunnel; jump the tumbleweeds.
  // The 18-row map is only for the engine; the mode builds each stretch from its car tokens (see the level file's top).
  { name: 'Train Heist Hop', world: 18, kind: 'team', mode: 'heist', ownStep: true, ownHUD: true, noFalls: true, roomWord: 'Stretch',
    act: { label: 'toss', labels: ['toss', 'toss'] },
    legend: { down: 'duck', padDown: 'down ducks' },
    tip: 'Run the train roofs to the engine! With the gold sack you jump low, so toss it over the wide gaps.',
    map: [...Array(15).fill('.'.repeat(32)), '..1.2' + '.'.repeat(27), '.'.repeat(32), '.'.repeat(32)],
    rooms: [
      {
        title: 'Caboose Run', carrier: 0, act: { label: 'toss', labels: ['toss', 'toss'] },
        tip: 'Pip has the gold sack. Small gaps: just hop. Wide gap: Bo jumps over first, then Pip tosses the sack!',
        news: 'With the gold sack you jump low. At a wide gap the free one jumps first!',
        cars: ['caboose 330', 'n', 'box 340 c170', 'n', 'stock 300', 'w', 'hay 300', 'n', 'box 320', 'w', 'pass 320', 'n', 'check 320'],
        hz: [{ k: 'bridge', first: 9, every: 14 }],
      },
      {
        title: 'Canyon Bridges', carrier: 1, act: { label: 'toss', labels: ['toss', 'toss'] },
        tip: 'Bo has the sack now. Rock arches and bridges come fast: duck when the whistle blows! Jump tumbleweeds.',
        news: 'Whistle = something low ahead. Hold \u25BC to duck!',
        cars: ['pass 320', 'n', 'box 320 c160', 'w', 'stock 300', 'n', 'hay 280', 'w', 'box 300', 'n', 'tank 300', 'w', 'stock 320 c160', 'n', 'check 320'],
        hz: [{ k: 'arch', first: 5, every: 11 }, { k: 'bridge', first: 12, every: 13 }, { k: 'weed', first: 14, every: 10 }],
      },
      {
        title: 'Water Tower Way', carrier: 0, act: { label: 'toss', labels: ['toss', 'toss'] },
        tip: 'Pip carries again. Water spouts hang over the roof: duck under them. Four wide gaps to toss across!',
        cars: ['tank 300', 'w', 'stock 300 c150', 'n', 'box 360 c110 c250', 'w', 'pass 300', 'n', 'hay 280', 'w', 'box 320', 'n', 'stock 300', 'w', 'check 300'],
        hz: [{ k: 'tower', first: 5, every: 9 }, { k: 'weed', first: 9, every: 7 }],
      },
      {
        title: 'Tunnel to the Engine', carrier: 1, act: { label: 'toss', labels: ['toss', 'toss'] },
        tip: 'Through the dark tunnel to the engine! Then both hold the action on the big brake lever together.',
        news: 'A tunnel ahead: duck at the mouth, lanterns light the way!',
        cars: ['box 300', 'w', 'pass 320', 'n', 'stock 300 c150', 'w', 'box 300', 'n', 'hay 300', 'w', 'tender 240', 'p', 'engine 400'],
        hz: [{ k: 'tunnel', first: 7, every: 99, len: 2400, once: true }, { k: 'bridge', first: 20, every: 12 }, { k: 'weed', first: 5, every: 9 }],
      },
    ],
  },
  // ----- END 19-1 Train Heist Hop -----
  //
  //
  //
  //
  // ----- BEGIN 19-2 Handcar Hustle (mode 'handcar', js/levels/world19/handcar-hustle.js) -----
  // 19-2: side-on railroad handcar (MODES.handcar): a seesaw pump handle, so Pip and Bo must take turns pumping, and
  // both brake for broken track, curves, cows and mail stations. The map is only the two spawns; the mode builds each
  // stretch from its course (tokens: see the top of the level file). Ends swap every stretch.
  { name: 'Handcar Hustle', world: 18, kind: 'team', mode: 'handcar', ownStep: true, ownHUD: true, noFalls: true, roomWord: 'Stretch',
    legend: {
      pip: '<kbd>S</kbd> pump · hold <kbd>W</kbd> brake',
      bo: '<kbd>↓</kbd> pump · hold <kbd>↑</kbd> brake',
      pad: 'stick down pumps, hold <span data-glyph="a"></span> to brake,',
    },
    tip: 'Take turns pumping the seesaw handle: Pip, Bo, Pip, Bo! Both hold ▲ to brake for signs, cows and stations.',
    act: { label: 'pump' },
    map: [...Array(15).fill('.'.repeat(32)), '..1.2' + '.'.repeat(27), '.'.repeat(32), '.'.repeat(32)],
    rooms: [
      {
        title: 'Dusty Flats', back: 0,
        tip: 'Pip has the back end, Bo the front. Push ▼ in turns: Pip, Bo, Pip, Bo! Both hold ▲ to brake.',
        course: ['f300', 'S:Take turns: {B}, {F}, {B}, {F}!', 'f400', 'u300', 'f100', 'd300', 'f200', 'M', 'u400', 'f100',
          'd400', 'F', 'W', 'M', 'F', 'K', 'd300', 'f100', 'X'],
      },
      {
        title: 'Mesa Hills', back: 1,
        tip: 'Swap! Bo has the back end now. Quick turns up the steep hills, and brake at the SLOW sign!',
        course: ['f300', 'S:Steep hills! Quick turns!', 'f200', 'U500', 'f150', 'D400', 'f100', 'F', 'C', 'U400', 'f150', 'M',
          'D500', 'f200', 'F', 'K', 'u300', 'f100', 'd300', 'M', 'X'],
      },
      {
        title: 'Canyon Trestle', back: 0,
        tip: 'Over the canyon on a tall trestle! Brake for the curve, the cows and the mail stop.',
        course: ['f300', 'b260', 'f200', 'u300', 'f150', 'F', 'D400', 'S:The canyon trestle!', 't900', 'C', 'F', 'W',
          'M', 'b300', 'f200', 'X'],
      },
      {
        title: 'Into Town', back: 1,
        tip: 'Last stretch! Through the cactus forest into town. Stop in the station box to finish!',
        course: ['f300', 'Z:cactus:2600', 'f300', 'U400', 'f150', 'M', 'D400', 'f200', 'F', 'K', 'C', 'u200',
          'S:Welcome to Tumbleweed!', 'Z:town:2300', 'f100', 'M', 'E'],
      },
    ],
  },
  // ----- END 19-2 Handcar Hustle -----
  //
  //
  //
  //
  // ----- BEGIN 19-3 Gold Mine Cart (mode 'minecart', js/levels/world19/gold-mine-cart.js) -----
  // 19-3: side-on mine cart ride (MODES.minecart): one rides up front (jump, duck, grab), one works the lever at the back
  // (picks the upper or lower track at every fork, brakes down steep slopes); jobs swap every stretch. The map is only the
  // two spawns, the mode builds each stretch from its course (tokens: see the top of the level file).
  { name: 'Gold Mine Cart', world: 18, kind: 'team', mode: 'minecart', ownStep: true, ownHUD: true, noFalls: true, roomWord: 'Stretch',
    legend: {
      pip: '<kbd>W</kbd> jump · lever up <kbd>S</kbd> duck · lever down',
      bo: '<kbd>↑</kbd> jump · lever up <kbd>↓</kbd> duck · lever down',
      pad: '<span data-glyph="a"></span> or stick ▲ jump · lever up, stick ▼ duck · lever down,',
    },
    tip: 'One rides up front: jump gaps, duck beams. One works the lever: read the signs, find the gold!',
    act: { label: 'grab', labels: ['grab', 'brake'] },
    map: [...Array(15).fill('.'.repeat(32)), '..1.2' + '.'.repeat(27), '.'.repeat(32), '.'.repeat(32)],
    rooms: [
      {
        title: 'Lantern Tunnel', rider: 0, look: 'lantern', act: { label: 'grab', labels: ['grab', 'brake'] },
        tip: 'Pip rides: ▲ jumps gaps, ▼ ducks beams. Bo works the lever: ▲ or ▼ picks the track at each fork.',
        course: ['f200', 'S:{R} rides up front  ·  {W} works the lever', 'f300', 'n', 'f60', 'n', 'f60', 'n', 'f260',
          'S:A gap! {R}: jump ▲', 'f260', 'a110', 'g110', 'f260', 'N', 'f200', 'S:A fork! {W}: read the sign, then ▲ or ▼', 'f520',
          { dead: 'u', sign: 'plain', up: ['f260'], down: ['f60', 'N', 'f160', 'n', 'f100'] },
          'f100', 'S:Low beam! {R}: hold ▼ to duck', 'f260', 'b', 'f280',
          { dead: 'd', sign: 'plain', up: ['f60', 'N', 'f80', 'a100', 'g100', 'f100', 'n', 'f60'], down: ['f260'] },
          'f100', 'S:Rock! {R}: jump it', 'f220', 'r', 'f160', 'S:A gold lantern! {R}: press ● to grab', 'f200', 'l', 'f200',
          { sign: 'both', up: ['f60', 'b', 'f200', 'n', 'f100'], down: ['f40', 'N', 'f160', 'N', 'f120'] },
          'f120', 'a120', 'g120', 'f360',
          { dead: 'u', sign: 'plain', up: ['f260'], down: ['f60', 'N', 'f160', 'b', 'f180'] },
          'f160', 'S:Steep slope! {W}: hold ● to brake', 'f340', 'D360', 'f260', 'n', 'f60', 'n', 'f60', 'n', 'f120', 'X'],
      },
      {
        title: 'Crystal Cavern', rider: 1, look: 'crystal', act: { label: 'grab', labels: ['brake', 'grab'] },
        tip: 'Swap! Bo rides, Pip works the lever. Some signs only show the dead end: take the other track!',
        course: ['f200', 'S:Swap! {R} rides  ·  {W} works the lever', 'f300', 'N', 'f200', 'a120', 'g120', 'f300',
          'S:An X on the sign? Take the other track!', 'f360',
          { dead: 'd', sign: 'xonly', up: ['f60', 'N', 'f120', 'r', 'f160', 'n', 'f60'], down: ['f260'] },
          'f200', 'b', 'f200', 'n', 'f60', 'n110', 'f60', 'n', 'f120',
          { dead: 'u', sign: 'xonly', up: ['f260'], down: ['f60', 'N', 'f80', 'a110', 'g110', 'f80', 'n', 'f60'] },
          'f200', 'r', 'f220', 'l', 'f220',
          { sign: 'both', up: ['f60', 'N', 'f120', 'N', 'f120', 'n', 'f60'], down: ['f100', 'b', 'f200', 'n', 'f100'] },
          'f160', 'S:Steep! {W}: brake ●', 'f280', 'D360', 'f240', 'a120', 'g120', 'f360',
          { dead: 'u', sign: 'xonly', up: ['f260'], down: ['f60', 'N', 'f120', 'r', 'f160', 'N', 'f60'] },
          'f200', 'n', 'f60', 'n', 'f60', 'n', 'f120', 'X'],
      },
      {
        title: 'Underground River', rider: 0, look: 'river', act: { label: 'grab', labels: ['grab', 'brake'] },
        tip: 'Pip rides: duck the waterfalls! Bo: two signs show the gold each way. Pick the track with more!',
        course: ['f200', 'S:{W}: two signs! Pick the track with more gold', 'f200', 'c', 'f300', 'w220', 'f240', 'N', 'f200',
          { sign: 'count', up: ['f60', 'n', 'f200', 'n', 'f140'], down: ['f60', 'N', 'f120', 'N', 'f120'] },
          'f200', 'a130', 'g130', 'f200', 'c', 'f240',
          { dead: 'u', sign: 'plain', up: ['f260'], down: ['f60', 'w200', 'f60', 'N', 'f80'] },
          'f200', 'r', 'f220', 'l', 'f360',
          { sign: 'count', up: ['f60', 'N', 'f100', 'N', 'f100', 'N', 'f60'], down: ['f100', 'c', 'f200', 'n', 'f100'] },
          'f200', 'a120', 'g120', 'f320',
          { dead: 'd', sign: 'plain', up: ['f60', 'N', 'f160', 'c', 'f180'], down: ['f260'] },
          'f160', 'S:Down the rapids! {W}: brake ●', 'f280', 'D360', 'f200', 'w240', 'f120', 'X'],
      },
      {
        title: 'Mother Lode', rider: 1, look: 'lode', dark: true, act: { label: 'grab', labels: ['brake', 'grab'] },
        tip: 'Lights out! Only the cart lantern shines. The good track has a lit lantern. Then out into the sun!',
        course: ['f200', 'S:Lights out! Follow the lit lanterns', 'f300', 'N', 'f240', 'b', 'f360',
          { dead: 'd', sign: 'lantern', up: ['f60', 'N', 'f160', 'n', 'f160'], down: ['f260'] },
          'f160', 'a120', 'g120', 'f240',
          { dead: 'u', sign: 'lantern', up: ['f260'], down: ['f60', 'N', 'f120', 'r', 'f160', 'N', 'f60'] },
          'f200', 'b', 'f220', 'l', 'f220',
          { dead: 'd', sign: 'xonly', up: ['f60', 'N', 'f80', 'a110', 'g110', 'f80', 'N', 'f60'], down: ['f260'] },
          'f160', 'S:Last slope! {W}: brake ●', 'f280', 'D360', 'f420',
          { dead: 'u', sign: 'lantern', up: ['f260'], down: ['f60', 'N', 'f100', 'N', 'f100', 'N', 'f60'] },
          'f160', 'S:Daylight ahead!', 'f240', 'E'],
      },
    ],
  },
  // ----- END 19-3 Gold Mine Cart -----
  //
  //
  //
  //
  // ----- BEGIN 19-4 Quick-Draw Showdown (mode 'quickdraw', js/levels/world19/quick-draw-showdown.js) -----
  // 19-4 Quick-Draw Showdown (mode 'quickdraw', versus, best of 7, Gavyn's pick): back to back, three paces, then wait
  // for the gold DRAW! and fire your cork popgun first. Fakeouts tempt an early press (a foul); later rounds add
  // cardboard bandit cutouts to aim at (◀ ▶).
  { name: 'Quick-Draw Showdown', world: 18, kind: 'versus', mode: 'quickdraw', ownStep: true,
    // the map is only the two spawns: the mode draws the whole street (MODES.quickdraw)
    match: { bestOf: 7 },
    act: { label: 'fire' },
    legend: {
      pip: '<kbd>A</kbd><kbd>D</kbd> aim',
      bo: '<kbd>←</kbd><kbd>→</kbd> aim',
      pad: 'stick ◀ ▶ aim,',
    },
    tip: 'Wait for the gold DRAW! and the bell, then fire first. Too early is a foul! Later: aim ◀ ▶ at the bandit.',
    switches: {}, signs: [],
    map: [
      '................................', '................................', '................................',
      '................................', '................................', '................................',
      '................................', '................................', '................................',
      '................................', '................................', '................................',
      '................................', '................................', '................................',
      '.......1................2.......', '................................', '................................',
    ],
  },
  // ----- END 19-4 Quick-Draw Showdown -----
  //
  //
  //
  // ===== END World 19 =====
  //
  /* ===== World 20 (Dragon Peak, team boss): the second boss world (Gavyn's rule: a boss world every 10 worlds), world
     index 19 (js/levels/world20/). One big boss level, 20-1 Volcano Dragon (mode 'dragon'): Cinder, a chubby, goofy,
     grumpy dragon, won't let anyone up Dragon Peak. Climb it, dunk him in his lava hot tub, ring his gong, then race
     him down the other side; he cheers up and becomes their friend. Gavyn picked every phase himself (Nov 2026).
     The core (MODES.dragon, VD_PHASES registry, Cinder, shield, fire breath, bonks, HUD, ending) is
     js/levels/world20/volcano-dragon.js; each phase has its own file (vd-climb.js, vd-levers.js, vd-golf.js,
     vd-surf.js) that registers VD_PHASES.<phase> and fills in its own room fields (map etc.) at load time with
     vdRoom(phase, fields), so nobody needs to edit this block after the core. The maps below are the core's
     placeholders (its stub phases play on them).
     Every room is ownStep: the phase moves the players itself (vdPlatform does the usual platforming on the grid).
     Room fields the core reads: title, phase, tip, act (labels per player), legend, map, ownStep, theme, look.
     The core reads one map char: 'Z' (Cinder's feet). ===== */
  // ----- BEGIN 20-1 Volcano Dragon (mode 'dragon', js/levels/world20/volcano-dragon.js) -----
  { name: 'Volcano Dragon', world: 19, kind: 'team', mode: 'dragon', ownHUD: true, noFalls: true, roomWord: 'Phase',
    act: { label: 'shield', labels: ['shield', 'ladder'] },
    tip: 'Grumpy Cinder the dragon guards Dragon Peak! Climb it, dunk him, ring his gong, then race him down.',
    switches: {}, signs: [],
    rooms: [
      // ----- 20-1 phase 1 (climb): vd-climb.js replaces the map and adds its own fields with vdRoom('climb', {...}) -----
      { title: 'Slope Climb', phase: 'climb', ownStep: true, first: 0,
        act: { label: 'shield', labels: ['shield', 'ladder'] },
        tip: 'Up the volcano! One holds the shield over you both, one climbs ahead and drops the rope ladder.',
        map: [
          '................................', //  0
          '................................', //  1
          '................................', //  2
          '................................', //  3
          '................................', //  4
          '................................', //  5
          '................................', //  6
          '................................', //  7
          '................................', //  8
          '................................', //  9
          '................................', // 10
          '................................', // 11
          '................................', // 12
          '..1.2...........................', // 13
          '................................', // 14
          '################################', // 15
          '################################', // 16
          '################################', // 17
        ] },
      // ----- 20-1 phase 2 (levers): vd-levers.js fills this room in with vdRoom('levers', {...}) -----
      { title: 'Hopping Pillars', phase: 'levers', ownStep: true, first: 0,
        act: { label: 'pull', labels: ['shield', 'pull'] },
        tip: 'Pull the lever under the pillar Cinder sits on to dunk him in his hot tub! Shield the puller.',
        map: [
          '................................', //  0
          '................................', //  1
          '................................', //  2
          '................................', //  3
          '................................', //  4
          '................................', //  5
          '................................', //  6
          '................................', //  7
          '...............Z................', //  8
          '................................', //  9
          '................................', // 10
          '................................', // 11
          '................................', // 12
          '..1.2...........................', // 13
          '................................', // 14
          '################################', // 15
          '################################', // 16
          '################################', // 17
        ] },
      // ----- 20-1 phase 3 (golf): vd-golf.js fills this room in with vdRoom('golf', {...}) -----
      { title: 'Gong Golf', phase: 'golf', ownStep: true, first: 0,
        act: { label: 'swing', labels: ['swing', 'swing'] },
        tip: 'Golf your partner across the crater and ring his gong! Fire rings speed you up. Lava is +1 stroke.',
        map: [
          '................................', //  0
          '................................', //  1
          '................................', //  2
          '................................', //  3
          '................................', //  4
          '................................', //  5
          '................................', //  6
          '................................', //  7
          '................................', //  8
          '................................', //  9
          '................................', // 10
          '................................', // 11
          '................................', // 12
          '................................', // 13
          '..1.2...................Z.......', // 14
          '################################', // 15
          '################################', // 16
          '################################', // 17
        ] },
      // ----- 20-1 phase 4 (surf): vd-surf.js fills this room in with vdRoom('surf', {...}) -----
      { title: 'Lava Surf Race', phase: 'surf', ownStep: true,
        act: { label: 'trick', labels: ['trick', 'trick'] },
        tip: 'Cinder wants a race! Surf a rock slab down the volcano. First to win 2 races is the Surf champ.',
        map: [
          '................................', //  0
          '................................', //  1
          '................................', //  2
          '................................', //  3
          '................................', //  4
          '................................', //  5
          '................................', //  6
          '................................', //  7
          '................................', //  8
          '................................', //  9
          '................................', // 10
          '................................', // 11
          '................................', // 12
          '..1.2...........................', // 13
          '................................', // 14
          '################################', // 15
          '################################', // 16
          '################################', // 17
        ] },
    ],
  },
  // ----- END 20-1 Volcano Dragon -----
  //
  // ===== END World 20 =====
  //
  // ===== World 21 (Sky Kingdom, mixed): the sky world, world index 20 (js/levels/world21/), a bright sunny sky of
  //   fluffy clouds, floating islands and a cloud castle, nothing scary, nobody gets hurt. Gavyn's picks (Nov 2026):
  //   21-1 Hot Air Balloon Climb (team, scrolls up), 21-2 Kite Tandem (team, scrolls sideways), 21-3 Cloud Bridge
  //   Builder (team, scrolls sideways), 21-4 Paper Plane Race (versus, best of 5, scrolls sideways).
  //   Each level's def sits between its own BEGIN/END lines. world: 20 =====
  //
  // ----- BEGIN 21-1 Hot Air Balloon Climb (mode 'balloon', js/levels/world21/hot-air-balloon-climb.js) -----
  // 21-1: side-on hot air balloon climb that scrolls UP (MODES.balloon): one burns (hold to heat and rise, pulse it or
  // it overheats), one steers (◀ ▶ vent ropes, steady); jobs swap every climb. The map is only the two spawns; the mode
  // builds each climb from its course (items: see the top of the level file). Altitudes h are px above the start.
  { name: 'Hot Air Balloon Climb', world: 20, kind: 'team', mode: 'balloon', ownStep: true, ownHUD: true, noFalls: true, roomWord: 'Climb',
    legend: {
      pip: 'burner: hold <kbd>W</kbd> · steerer: <kbd>A</kbd><kbd>D</kbd> ropes, <kbd>S</kbd> steady',
      bo: 'burner: hold <kbd>↑</kbd> · steerer: <kbd>←</kbd><kbd>→</kbd> ropes, <kbd>↓</kbd> steady',
      pad: 'burner holds <span data-glyph="a"></span>, steerer: stick ◀ ▶, ▼ steady,',
    },
    tip: 'One burns (hold ▲ to rise, but not too long!), one steers (◀ ▶). Thread the islands and land on the dock!',
    act: { label: 'burn', labels: ['burn', 'steady'] },
    map: [...Array(15).fill('.'.repeat(32)), '..1.2' + '.'.repeat(27), '.'.repeat(32), '.'.repeat(32)],
    rooms: [
      {
        title: 'Meadow Liftoff', burner: 0, look: 'meadow', startX: 300, act: { label: 'burn', labels: ['burn', 'steady'] },
        tip: 'Pip burns: hold ▲ to rise, let go so it cools. Bo steers with ◀ ▶. Then land softly on the dock!',
        course: [
          ['sign', 150, 520, '{B}: hold ▲ to burn and go up!'], ['stars', 300, 300, 5, 0, 75],
          ['sign', 720, 660, '{S}: ◀ ▶ pull the ropes to drift'], ['stars', 800, 380, 5, 60, 40],
          ['gap', 1200, 650, 270], ['pb', 1080, 650], ['sign', 1100, 260, 'A gap! {S} steers, {B} waits below'],
          ['sign', 1480, 230, 'Grumpy clouds go Bzzt!'], ['storm', 1700, 470, 60], ['stars', 1600, 720, 3, 0, 80],
          ['cp', 1950, 130, 470],
          ['gap', 2300, 270, 260], ['pb', 2180, 270],
          ['sign', 2520, 690, 'Birds! {B}: wait for them'], ['birds', 2750, 1, 3, 120], ['stars', 2820, 420, 4, 70, 40],
          ['dock', 3250, 650, 220],
        ],
      },
      {
        title: 'Windy Cliffs', burner: 1, look: 'cliffs', startX: 650, bounds: [128, 832], act: { label: 'burn', labels: ['steady', 'burn'] },
        tip: 'Swap! Bo burns, Pip steers. The wind pushes you: Pip pulls ◀ ▶ against the arrows.',
        course: [
          ['sign', 170, 400, 'Swap! {B} burns, {S} steers'],
          ['wind', 380, 820, 1, 120], ['stars', 480, 330, 3, 0, 90], ['sign', 340, 640, 'Wind! Pull against it'],
          ['gap', 1000, 320, 250], ['pb', 900, 320],
          ['wind', 1220, 1650, -1, 140], ['stars', 1320, 650, 3, 0, 90],
          ['gap', 1750, 660, 250],
          ['cp', 1980, 760, 660],
          ['storm', 2300, 400, 58, 70, 6], ['stars', 2240, 640, 3, 0, 70],
          ['birds', 2650, -1, 4, 130],
          ['wind', 2800, 3180, 1, 150], ['stars', 2880, 300, 3, 0, 80],
          ['gaps', 3220, [270, 230], [690, 230]], ['pb', 3100, 690],
          ['dock', 3620, 330, 220],
        ],
      },
      {
        title: 'Storm Clouds', burner: 0, look: 'storm', startX: 330, act: { label: 'burn', labels: ['burn', 'steady'] },
        tip: 'Pip burns again, Bo steers. Lots of grumpy clouds: steer around them and wait under them!',
        course: [
          ['sign', 170, 620, 'Swap back! Clouds ahead'],
          ['storm', 640, 330, 62], ['storm', 800, 640, 56, 40, 5], ['stars', 560, 480, 3, 0, 90],
          ['storm', 1150, 200, 60], ['storm', 1180, 760, 60], ['stars', 1100, 480, 3, 0, 80],
          ['gap', 1480, 480, 260], ['pb', 1360, 480],
          ['storm', 1780, 560, 52, 70, 7],
          ['cp', 1980, 160, 480],
          ['birds', 2280, 1, 4, 140], ['stars', 2330, 300, 4, 100, 30],
          ['storm', 2640, 250, 62, 30, 7], ['storm', 2640, 710, 62, 30, 7], ['stars', 2600, 480, 3, 0, 70],
          ['isle', 2980, 300, 260], ['pb', 2920, 640],
          ['storm', 3330, 560, 60, 120, 7], ['stars', 3300, 200, 3, 60, 50],
          ['dock', 3720, 720, 220],
        ],
      },
      {
        title: 'Cloud Castle Dock', burner: 1, look: 'castle', startX: 720, act: { label: 'burn', labels: ['steady', 'burn'] },
        tip: 'Last climb! Bo burns, Pip steers. Up past wind, birds and clouds to the Cloud Castle dock!',
        course: [
          ['sign', 170, 470, 'Last climb! Up to the castle!'],
          ['gap', 620, 360, 240], ['stars', 400, 720, 3, -110, 60], ['pb', 520, 360],
          ['wind', 820, 1220, -1, 130], ['stars', 900, 720, 3, 0, 90],
          ['birds', 1330, -1, 4, 140],
          ['gap', 1580, 760, 240], ['pb', 1470, 760],
          ['cp', 1820, 860, 760],
          ['storm', 2160, 520, 60, 100, 6], ['stars', 2120, 800, 3, 0, 70],
          ['wind', 2380, 2760, 1, 150], ['stars', 2450, 260, 3, 0, 90],
          ['gaps', 2840, [220, 220], [640, 220]],
          ['birds', 3180, 1, 5, 150], ['stars', 3240, 480, 4, -60, 40],
          ['storm', 3520, 760, 55], ['stars', 3560, 300, 3, 90, 20],
          ['dock', 3920, 480, 240],
        ],
      },
    ],
  },
  // ----- END 21-1 Hot Air Balloon Climb -----
  //
  //
  //
  // ----- BEGIN 21-2 Kite Tandem (mode 'kite', js/levels/world21/kite-tandem.js) -----
  // 21-2 Kite Tandem (mode 'kite', team, Gavyn's pick): one runs along the ground holding the string (run, jump, reel
  // in), the other rides the big kite behind (steer, tuck) through stars and rings and round power lines, birds and
  // spires. Each stretch ends at a tower whose flag only the rider can grab. The map is only the two spawns; the mode
  // builds each stretch from its course (tokens: see the top of the level file). Jobs swap every stretch.
  { name: 'Kite Tandem', world: 20, kind: 'team', mode: 'kite', ownStep: true, ownHUD: true, noFalls: true, roomWord: 'Stretch',
    legend: {
      pip: '<kbd>A</kbd><kbd>D</kbd> run <kbd>W</kbd> jump <kbd>S</kbd> reel · kite: <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> steer',
      bo: '<kbd>←</kbd><kbd>→</kbd> run <kbd>↑</kbd> jump <kbd>↓</kbd> reel · kite: arrows steer',
      pad: 'runner: stick run, <span data-glyph="a"></span> jump, stick ▼ reel; kite: stick steers,',
    },
    tip: 'Runner: hold ▶ to run, ▲ jump, hold ▼ to reel in. Kite rider: ▲ ▼ ◀ ▶ steer. Grab the flag at each tower!',
    act: { label: 'reel', labels: ['reel', 'tuck'] },
    map: [...Array(15).fill('.'.repeat(32)), '..1.2' + '.'.repeat(27), '.'.repeat(32), '.'.repeat(32)],
    rooms: [
      {
        title: 'Rooftop Run', runner: 0, look: 'roofs', act: { label: 'reel', labels: ['reel', 'tuck'] },
        tip: 'Pip runs, Bo rides the kite! Keep running so it flies. Bo: steer round things and grab the clock tower flag.',
        course: ['f500', 'S:{R}: hold ▶ to run!', 'f350', '*:220:4', 'f250', '*:280:3', 'f300',
          'g70', 'f300', 'S:Chimney! Jump ▲', 'f150', 'c', 'f300', 'T:200', '*:300:3', 'f350',
          'S:{K}: steer ▲ ▼ round things', 'f150', 'W:270:340', 'f420', 'j-30', 'f200', 'c', 'f300', 'O:320', 'f250',
          'g90', 'f300', '*:180:4', 'f300', 'H:250:300', 'f400', 'c', 'f200', 'j30', 'f200', 'B:280', 'f420',
          'g100', 'f250', 'T:220', 'f200', 'T:240', 'f350', 'c', 'f250', 'S:A tall spire! Fly high', 'f150', 'P:275', 'f350',
          '*:330:3', 'f250', 'j-30', 'f200', 'g80', 'f300', 'O:200', 'f300', 'E'],
      },
      {
        title: 'Windy Hill', runner: 1, look: 'hill', act: { label: 'reel', labels: ['tuck', 'reel'] },
        tip: 'Swap! Bo runs, Pip rides. Gusts push the kite up or down: steer against them. Fly over the windmill!',
        course: ['f450', 'S:Swap! {R} runs, {K} rides', 'f300', 'u500:-50', 'f200', '*:260:4', 'f200', 'c', 'f300', 'u400:40', 'f200',
          'S:Gusts! {K}: steer against the wind', 'f100', 'U:700', '*:290:4:60', 'f450', 'c', 'f350', 'D:700', '*:300:4:60', 'f500',
          'g70', 'f300', 'T:220', 'f250', 'T:250', 'f300', 'u500:-60', 'S:A windmill! Fly over the sails', 'f150', 'M:150', 'f450',
          'O:310', 'f300', 'c', 'f250', 'u400:50', 'B:220', 'f500', 'B:300', 'f450', 'g80', 'f300', 'u400:-40', 'f200', '*:200:4', 'f300', 'E'],
      },
      {
        title: 'Seaside Pier', runner: 0, look: 'pier', act: { label: 'reel', labels: ['reel', 'tuck'] },
        tip: 'Pip runs again! Gulls, ship masts and bunting. Reel in for the low rings. The lighthouse flag waits at the end.',
        course: ['f450', 'S:Swap back! {R} runs again', 'f300', '*:240:4', 'f250', 'c', 'f300', 'g80', 'f250', 'B:270', 'f700',
          'K:280', 'f300', '*:330:3', 'f200', 'H:240:320', 'f400', 'O:180', 'f250', 'g90', 'f250', 'c', 'f300', 'K:270', 'f160', 'K:280', 'f400',
          'B:220', 'f550', 'B:300', 'f400', 'g100', 'f300', 'H:260:300', 'f350', '*:180:5', 'f300', 'c', 'f250', 'O:320', 'f250', 'g80', 'f250', 'E'],
      },
      {
        title: 'Bridge to the Sky Kingdom', runner: 1, look: 'bridge', act: { label: 'reel', labels: ['tuck', 'reel'] },
        tip: 'Bo runs to the Sky Kingdom! Reel in under the cloud arches, steer round the balloons. Grab the royal flag!',
        course: ['f450', 'S:Last stretch! To the Sky Kingdom', 'f300', 'u600:-60', '*:260:4', 'f300', 'g80', 'f300', 'L:280', 'f400', 'c', 'f250',
          'S:Cloud arch! Fly under it', 'f150', 'A:200:500', '*:140:5', 'f650', 'O:300', 'f200', 'u500:-50', 'W:260:300', 'f450',
          'g90', 'f300', 'L:220', 'f500', 'L:330', 'f400', 'c', 'f250', 'A:190:400', 'O:130', 'f600', 'u500:-60', 'B:280', 'f400', 'g100', 'f300',
          '*:320:4', 'f300', 'E'],
      },
    ],
  },
  // ----- END 21-2 Kite Tandem -----
  //
  //
  //
  // ----- BEGIN 21-3 Cloud Bridge Builder (mode 'cloudbridge', js/levels/world21/cloud-bridge-builder.js) -----
  // 21-3 Cloud Bridge Builder (mode 'cloudbridge', team, Gavyn's pick): the caller walks ahead and plants "here!" flags
  // over the gaps between floating islands, the builder squeezes the cloud machine to puff a cloud block onto each flag.
  // Clouds melt after about 6 s, so keep moving; both must cross every gap. Jobs swap every stretch (Pip calls 1 and 3).
  // The map is only the two spawns; the mode builds each stretch from its course (items: see the top of the level file).
  { name: 'Cloud Bridge Builder', world: 20, kind: 'team', mode: 'cloudbridge', ownStep: true, ownHUD: true, noFalls: true, roomWord: 'Stretch',
    legend: {
      pip: '<kbd>A</kbd><kbd>D</kbd> walk <kbd>W</kbd> jump',
      bo: '<kbd>←</kbd><kbd>→</kbd> walk <kbd>↑</kbd> jump',
      pad: 'stick or d-pad walk, <span data-glyph="a"></span> jump,',
    },
    tip: 'At the edge the caller presses call for a flag, the builder presses puff to send a cloud there. Clouds melt: keep moving!',
    act: { label: 'call', labels: ['call', 'puff'] },
    map: [...Array(15).fill('.'.repeat(32)), '..1.2' + '.'.repeat(27), '.'.repeat(32), '.'.repeat(32)],
    rooms: [
      {
        title: 'First Puffs', caller: 0, look: 'meadow', act: { label: 'call', labels: ['call', 'puff'] },
        tip: 'Pip calls: at the edge, press call for a flag. Bo builds: press puff to send a cloud there. Cross together!',
        news: 'Pip plants the flags, Bo puffs the clouds!',
        course: [
          ['isle', 600, 380, { signs: [[300, '{C}: at the edge, {Ca} plants a flag', '{C} plants a flag at the edge'], [80, '{B}: {Ba} puffs a cloud onto it', '{B} puffs a cloud onto it']] }],
          ['gap', 192],
          ['isle', 340, 380, { signs: [[150, 'Clouds melt! Keep moving']] }],
          ['gap', 256, { star: true }],
          ['isle', 320, 350, { signs: [[140, 'A star up high? {C}: hold {Ca}, tap {Cu} to aim higher', 'A star up high? {C} aims a cloud higher']] }],
          ['gap', 192],
          ['isle', 260, 380, { signs: [[130, 'Stay close together!']] }],
          ['gap', 256],
          ['isle', 280, 420],
          ['gap', 320],
          ['isle', 480, 380, { flag: true }],
        ],
      },
      {
        title: 'Stairway Up', caller: 1, look: 'stairs', act: { label: 'call', labels: ['puff', 'call'] },
        tip: 'Swap! Bo calls, Pip puffs. Clouds step up and down by themselves: walk into a step to hop up. Boing on the spring!',
        news: 'Swap! Bo calls, Pip puffs',
        course: [
          ['isle', 520, 420, { signs: [[260, 'Swap! {C} calls, {B} puffs']] }],
          ['gap', 192],
          ['isle', 300, 300, { signs: [[150, 'Cloud stairs! Walk up them']] }],
          ['gap', 192],
          ['isle', 280, 380, { signs: [[140, 'Down to the rainbow spring!']] }],
          ['gap', 256, { star: true }],
          ['isle', 140, 440, { spring: 70 }],
          ['gap', 64],
          ['isle', 320, 230],
          ['gap', 256],
          ['isle', 280, 300],
          ['gap', 192],
          ['isle', 460, 260, { flag: true }],
        ],
      },
      {
        title: 'Windy Gap', caller: 0, look: 'windy', act: { label: 'call', labels: ['call', 'puff'] },
        tip: 'Pip calls, Bo puffs. When the windsock blows, puffs get blown away: puff in the calm!',
        news: 'Swap back! Pip calls, Bo puffs',
        course: [
          ['isle', 520, 380, { signs: [[260, 'Swap back! Wind ahead']] }],
          ['gap', 256, { wind: 0 }],
          ['isle', 300, 380, { signs: [[150, 'Puff when the windsock droops']] }],
          ['gap', 192],
          ['isle', 280, 340],
          ['gap', 320, { wind: 2.4, star: true }],
          ['isle', 280, 380],
          ['gap', 256, { wind: 4.6 }],
          ['isle', 260, 380],
          ['gap', 192, { wind: 1.2 }],
          ['isle', 460, 380, { flag: true }],
        ],
      },
      {
        title: 'Sunny Melt to the Cloud Castle', caller: 1, look: 'sunny', act: { label: 'call', labels: ['puff', 'call'] },
        tip: 'Bo calls, Pip puffs. Sun rays melt clouds fast: hurry over! Ride the cloud lift up to the Cloud Castle.',
        news: 'Last stretch! Bo calls, Pip puffs',
        course: [
          ['isle', 500, 380, { signs: [[260, 'Sunny! Clouds melt fast here']] }],
          ['gap', 256, { sun: true }],
          ['isle', 280, 380],
          ['gap', 192, { sun: true, star: true }],
          ['isle', 240, 360, { signs: [[100, 'Cloud lift! Ride it up together']] }],
          ['lift', 130, 240],
          ['gap', 256, { sun: true }],
          ['isle', 280, 240],
          ['gap', 256, { sun: true }],
          ['isle', 620, 340, { flag: true, castle: true }],
        ],
      },
    ],
  },
  // ----- END 21-3 Cloud Bridge Builder -----
  //
  //
  //
  // ----- BEGIN 21-4 Paper Plane Race (mode 'paperplane', js/levels/world21/paper-plane-race.js) -----
  // 21-4 Paper Plane Race (mode 'paperplane', versus, best of 5, Gavyn's pick): throw your paper plane from a slingshot
  // (hold the action, let go at the top of the meter), then tilt ▲ ▼ to glide a side-scrolling course: dive for speed,
  // ride warm air up, fly through gold rings, flap (3 a round). First through the finish cloud arch wins the round.
  // The map is only the two spawns: the mode draws the whole course (MODES.paperplane).
  { name: 'Paper Plane Race', world: 20, kind: 'versus', mode: 'paperplane', ownStep: true,
    match: { bestOf: 5, roundTime: 75 },
    act: { label: 'flap' },
    legend: {
      pip: '<kbd>W</kbd><kbd>S</kbd> tilt up / down',
      bo: '<kbd>↑</kbd><kbd>↓</kbd> tilt up / down',
      pad: 'stick ▲ ▼ tilt,',
    },
    tip: 'Hold the action to throw, let go at the top! Then ▲ ▼ tilt: dive for speed, ride warm air, fly through rings.',
    switches: {}, signs: [],
    map: [
      '................................', '................................', '................................',
      '................................', '................................', '................................',
      '................................', '................................', '................................',
      '................................', '................................', '................................',
      '................................', '................................', '................................',
      '....1.......2...................', '................................', '................................',
    ],
  },
  // ----- END 21-4 Paper Plane Race -----
  //
  //
  //
  // ===== END World 21 =====
  //
  // ===== World 22 (Coral Deep, mixed): the underwater world, world index 21 (js/levels/world22/), a bright friendly
  //   sea of coral reefs, kelp, a sunken ship and sandy seabed, nothing scary, nobody gets hurt. Gavyn's picks (Nov 2026):
  //   22-1 Submarine Duo (team, scrolls sideways), 22-2 Treasure Diver Rope (team, scrolls down), 22-3 Shipwreck
  //   Lights (team, scrolls sideways), 22-4 Dolphin Race (versus, best of 5, scrolls sideways).
  //   Each level's def sits between its own BEGIN/END lines. world: 21 =====
  //
  // ----- BEGIN 22-1 Submarine Duo (mode 'subduo', js/levels/world22/submarine-duo.js) -----
  // 22-1 Submarine Duo (mode 'subduo', team, Gavyn's pick): both ride one little sub through a reef canyon. One steers
  // (◀ ▶ ▲ ▼, the action toots the horn), the other works the claw arm (◀ ▶ ▲ ▼ move it, the action grabs / lets go):
  // pearls and shells, boulders into sandy holes, floaty logs pulled down, a conch for Clammy the clam gate. Each stretch
  // ends at a buoy ring only the claw can clip onto, then they swap jobs. The map is only the two spawns; the mode builds
  // each stretch from its course (tokens: see the top of the level file).
  { name: 'Submarine Duo', world: 21, kind: 'team', mode: 'subduo', ownStep: true, ownHUD: true, noFalls: true, roomWord: 'Stretch',
    legend: {
      pip: '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> steer the sub or move the claw',
      bo: 'arrows steer the sub or move the claw',
      pad: 'stick steers the sub or moves the claw,',
    },
    tip: 'Steerer: arrows push the sub, the action toots. Claw: arrows move the arm, the action grabs and lets go!',
    act: { label: 'grab', labels: ['toot', 'grab'] },
    map: [...Array(15).fill('.'.repeat(32)), '..1.2' + '.'.repeat(27), '.'.repeat(32), '.'.repeat(32)],
    rooms: [
      {
        title: 'Sunny Shallows', steer: 0, look: 'shallows', top: 70, bot: 440, act: { label: 'grab', labels: ['toot', 'grab'] },
        tip: 'Pip steers, Bo works the claw! Grab the pearls, lift the boulder into its sandy hole, clip onto the buoy ring.',
        course: ['f200', 'S:{S}: steer the sub!', 'f250', 'p:200:3:60', 'f250', 'Q', 'f150',
          'S:{G}: move the claw, grab pearls!', 'f200', 'p:-22', 'f140', 'p:-22', 'f160', 'h:-12', 'f260',
          'K:f:60', 'f220', 'p:150:2:60', 'f240', 'm300:120:440', 'K:c:46', 'f200', 'p:300', 'f160', 'h:-12', 'f200',
          'P:250', 'f200', 'm200:140:410', 'S:A boulder! Into the sandy hole', 'f150', 'B', 'f160', 'p:280:3:55', 'f240',
          'T:300:70', 'f300', 'h:-12', 'f160', 'K:f:64', 'f240', 'p:-22', 'f140', 'm200:70:430', 'p:200:2:60', 'f200', 'E'],
      },
      {
        title: 'Kelp Forest', steer: 1, look: 'kelp', top: 90, bot: 450, act: { label: 'grab', labels: ['grab', 'toot'] },
        tip: 'Swap! Bo steers, Pip works the claw. Pull the floaty log all the way down, then the boulder. Mind the current!',
        course: ['f200', 'S:Swap! {S} steers, {G} works the claw', 'f250', 'p:250:3:60', 'f250', 'Q', 'K:f:56', 'f200', 'p:-22', 'f160', 'h:-12', 'f200',
          'U:520:0:-150', 'S:A current pushes you up!', 'f100', 'p:380:3:60', 'f500',
          'S:A floaty log! Pull it down', 'f150', 'L', 'f150', 'p:-22:2:60', 'f220', 'T:270:80', 'f300', 'K:c:50', 'f200', 'p:330', 'f240',
          'm200:140:410', 'f150', 'B', 'f150', 'p:220:3:60', 'f300', 'h:-12', 'f200', 'E'],
      },
      {
        title: 'Coral Canyon', steer: 0, look: 'canyon', top: 100, bot: 440, act: { label: 'grab', labels: ['toot', 'grab'] },
        tip: 'Pip steers again! Squeeze between the coral, push through the current, and bring Clammy her conch.',
        course: ['f200', 'S:Swap back! {S} steers', 'f240', 'K:f:58', 'f160', 'p:200:2:60', 'f200', 'K:c:52', 'f180', 'p:-22', 'f200',
          'U:600:-120:0', 'S:A current! Push on through', 'f150', 'p:260:3:70', 'f450',
          'P:270', 'f150', 'K:f:62', 'f250', 'h:-12', 'f150', 'S:Find the conch for Clammy', 'f450', 'C:420',
          'f200', 'p:-22:2:60', 'f240', 'T:270:80', 'f300', 'L', 'f150', 'p:260:3:60', 'f240', 'K:c:48', 'f200', 'E'],
      },
      {
        title: 'Treasure Grotto', steer: 1, look: 'grotto', top: 100, bot: 450, act: { label: 'grab', labels: ['grab', 'toot'] },
        tip: 'Bo steers to the treasure! A boulder, Clammy and a log stand in the way. Grab the chest handle at the end!',
        course: ['f200', 'S:Last stretch! To the treasure', 'f240', 'p:250:3:60', 'f240', 'K:f:56', 'f180', 'p:-22', 'f160', 'm200:140:410',
          'f100', 'B', 'f160', 'p:240:2:60', 'f200', 'P:300', 'f240', 'K:c:50', 'f200', 'h:-12', 'f240',
          'C:380', 'f200', 'p:-22:2:60', 'f240', 'T:280:70', 'f240', 'L', 'f150', 'p:250:3:60', 'f220', 'E'],
      },
    ],
  },
  // ----- END 22-1 Submarine Duo -----
  //
  //
  //
  // ----- BEGIN 22-2 Treasure Diver Rope (mode 'diverope', js/levels/world22/treasure-diver-rope.js) -----
  // 22-2 Treasure Diver Rope (mode 'diverope', team, Gavyn's pick): side-on, scrolls DOWN. One stays in the boat (▼ lets
  // out rope, ▲ reels in, the action pumps air down the hose), the other dives in a brass helmet on the end of the rope
  // (◀ ▶ swim, ▲ kick, the action hooks the chest), picking up gems, starfish and pearls and dodging sleepy eels and
  // jellyfish. Treasure only counts back in the boat; a dive ends when its chest is reeled up. Out of air is a "Blub!"
  // bubble ride back up. Jobs swap every dive. The map is only the two spawns; the mode builds each dive from its course
  // (items: see the top of the level file). y is the depth in px below the surface.
  { name: 'Treasure Diver Rope', world: 21, kind: 'team', mode: 'diverope', ownStep: true, ownHUD: true, noFalls: true, roomWord: 'Dive',
    legend: {
      pip: 'diver: <kbd>A</kbd><kbd>D</kbd> swim <kbd>W</kbd> kick · boat: <kbd>S</kbd> rope out <kbd>W</kbd> reel',
      bo: 'diver: <kbd>←</kbd><kbd>→</kbd> swim <kbd>↑</kbd> kick · boat: <kbd>↓</kbd> rope out <kbd>↑</kbd> reel',
      pad: 'diver: stick swims, <span data-glyph="a"></span> kick; boat: stick ▼ rope out, <span data-glyph="a"></span> reel,',
    },
    tip: 'One dives for treasure, one runs the boat: ▼ lets out rope, the action pumps air, ▲ reels the diver up!',
    act: { label: 'grab', labels: ['grab', 'pump'] },
    map: [...Array(15).fill('.'.repeat(32)), '..1.2' + '.'.repeat(27), '.'.repeat(32), '.'.repeat(32)],
    rooms: [
      {
        title: 'Sandy Shelf', diver: 0, look: 'shelf', floor: 760, boatX: 480, act: { label: 'grab', labels: ['grab', 'pump'] },
        tip: 'Pip dives, Bo runs the boat! Bo: hold ▼ for rope, tap the action to pump air, hold ▲ to reel Pip up.',
        course: [
          ['sign', 480, 150, '{B}: hold ▼ to let out rope'],
          ['gems', 510, 230, 3, 0, 45],
          ['rock', -60, 330, 110, 760], ['rock', 860, 430, 1020, 760],
          ['ledge', 380, 110, 400], ['ledge', 380, 620, 860],
          ['gems', 230, 290, 1],
          ['star', 250, 380], ['star', 740, 380], ['kelp', 180, 380, 90], ['coral', 330, 380, 2],
          ['gems', 690, 480, 3, 0, 45],
          ['jelly', 300, 540, 60, 7],
          ['eel', 860, 650, -1, 170],
          ['gems', 410, 700, 2, 70, 0],
          ['pearl', 640, 760], ['chest', 230, 760],
          ['kelp', 140, 760, 140], ['kelp', 470, 760, 100], ['kelp', 920, 430, 110], ['coral', 340, 760, 1], ['coral', 560, 760, 2], ['coral', 780, 760, 0],
        ],
      },
      {
        title: 'Kelp Drop', diver: 1, look: 'kelp', floor: 1150, boatX: 480, act: { label: 'grab', labels: ['pump', 'grab'] },
        tip: 'Swap! Bo dives, Pip runs the boat. Pip: pump air when Bo stops. Sleepy eels: pass them while they snooze!',
        course: [
          ['sign', 480, 150, 'Swap! {D} dives, {B} runs the boat'],
          ['rock', -60, 220, 70, 1150], ['rock', 890, 180, 1020, 1150],
          ['gems', 480, 240, 2, 0, 50],
          ['ledge', 330, 70, 560], ['star', 300, 330], ['kelp', 150, 330, 100], ['gems', 200, 290, 2, 60, 0],
          ['gems', 725, 400, 3, 0, 40],
          ['eel', 890, 470, -1, 180],
          ['jelly', 470, 470, 80, 6],
          ['ledge', 590, 360, 890], ['kelp', 520, 590, 90], ['kelp', 820, 590, 70],
          ['gems', 520, 560, 3, 50, 0],
          ['eel', 70, 690, 1, 170],
          ['gems', 280, 760, 2, 0, 40],
          ['ledge', 860, 70, 540], ['star', 420, 860], ['kelp', 300, 860, 120],
          ['jelly', 620, 950, 40, 7],
          ['gems', 750, 1000, 2, 0, 40],
          ['eel', 890, 1080, -1, 140],
          ['pearl', 560, 1150], ['chest', 380, 1150],
          ['kelp', 120, 1150, 200], ['kelp', 250, 1150, 160], ['kelp', 650, 1150, 220], ['kelp', 820, 1150, 150], ['coral', 480, 1150, 1],
        ],
      },
      {
        title: 'Coral Cliffs', diver: 0, look: 'coral', floor: 1550, boatX: 480, act: { label: 'grab', labels: ['grab', 'pump'] },
        tip: 'Pip dives again, Bo runs the boat. Deeper means the air goes faster: Bo, keep pumping!',
        course: [
          ['sign', 480, 160, '{D} dives again! Down the coral canyon'],
          ['rock', -60, 260, 190, 1550], ['rock', 770, 240, 1020, 1550],
          ['gems', 480, 280, 3, 0, 40],
          ['ledge', 440, 190, 470], ['star', 330, 440], ['coral', 250, 440, 0],
          ['eel', 770, 580, -1, 190],
          ['gems', 540, 560, 2, 0, 50],
          ['ledge', 720, 490, 770], ['star', 640, 720], ['coral', 720, 720, 2],
          ['jelly', 300, 860, 50, 6],
          ['eel', 190, 980, 1, 180],
          ['gems', 450, 940, 3, 0, 45],
          ['ledge', 1110, 190, 420], ['ledge', 1110, 600, 770],
          ['eel', 600, 1132, -1, 130],
          ['pearl', 300, 1110],
          ['jelly', 560, 1270, 80, 8],
          ['gems', 330, 1300, 3, 0, 45],
          ['eel', 770, 1430, -1, 170],
          ['gems', 520, 1490, 2, 50, 0],
          ['chest', 300, 1550],
          ['coral', 230, 1550, 0], ['coral', 420, 1550, 1], ['coral', 520, 1550, 2], ['coral', 640, 1550, 0], ['coral', 720, 1550, 1], ['kelp', 600, 1550, 120],
        ],
      },
      {
        title: 'Deep Trench', diver: 1, look: 'trench', floor: 1950, boatX: 480, act: { label: 'grab', labels: ['pump', 'grab'] },
        tip: 'Last dive! Bo dives, Pip runs the boat. All the way down the Deep Trench for the golden chest!',
        course: [
          ['sign', 480, 160, 'Last dive! Down into the Deep Trench'],
          ['rock', -60, 220, 140, 920], ['rock', 820, 220, 1020, 920],
          ['gems', 480, 260, 3, 0, 40],
          ['ledge', 440, 140, 600], ['star', 380, 440],
          ['eel', 820, 560, -1, 170],
          ['gems', 640, 520, 2, 0, 50],
          ['ledge', 700, 360, 820], ['coral', 600, 700, 2],
          ['jelly', 480, 800, 90, 8],
          ['rock', -60, 920, 300, 1950], ['rock', 660, 920, 1020, 1950],
          ['coral', 740, 920, 0],
          ['gems', 480, 980, 3, 0, 45],
          ['eel', 300, 1080, 1, 170],
          ['rock', 520, 1220, 660, 1270], ['star', 590, 1220], ['gems', 360, 1200, 2, 0, 50],
          ['jelly', 400, 1360, 50, 7],
          ['gems', 560, 1420, 3, 0, 45],
          ['eel', 660, 1540, -1, 160],
          ['rock', 300, 1640, 430, 1690], ['pearl', 380, 1640],
          ['jelly', 560, 1760, 50, 7],
          ['eel', 300, 1860, 1, 150],
          ['gems', 420, 1900, 3, 40, 0],
          ['chest', 560, 1950],
          ['coral', 340, 1950, 2], ['coral', 620, 1950, 1], ['kelp', 400, 1950, 90],
        ],
      },
    ],
  },
  // ----- END 22-2 Treasure Diver Rope -----
  //
  //
  //
  // ----- BEGIN 22-3 Shipwreck Lights (mode 'shipwreck', js/levels/world22/shipwreck-lights.js) -----
  // 22-3 Shipwreck Lights (mode 'shipwreck', team, Gavyn's pick): inside a dark (cosy) sunken ship. One carries Glimmer
  // the lantern fish, whose light shows the hidden levers, wheels, keys, treasure and prickly coral (the action is a big
  // flash that wakes sleepy anemones and shoos grumpy pufferfish); the other swims with the grabby claw and opens doors,
  // pushes crates and grabs treasure, but only in the light. Jobs swap every section (Pip lights 1 and 3). The map is
  // only the two spawns; the mode builds each section from its items (see the top of the level file). Ceiling y 104,
  // floor y 476.
  { name: 'Shipwreck Lights', world: 21, kind: 'team', mode: 'shipwreck', ownStep: true, ownHUD: true, noFalls: true, roomWord: 'Section',
    legend: {
      pip: '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> swim',
      bo: '<kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd> swim',
      pad: 'stick or d-pad swims,',
    },
    tip: 'One carries Glimmer the lantern fish (flash!), one grabs. Levers, keys and treasure only show in the light!',
    act: { label: 'flash', labels: ['flash', 'grab'] },
    map: [...Array(9).fill('.'.repeat(32)), '..1.2' + '.'.repeat(27), ...Array(8).fill('.'.repeat(32))],
    rooms: [
      {
        title: 'Cargo Hold', lantern: 0, look: 'hold', len: 2800, exit: 2600, act: { label: 'flash', labels: ['flash', 'grab'] },
        tip: 'Pip carries Glimmer: light the way! Bo grabs: levers and treasure only work in the light.',
        news: 'Pip lights the way, Bo opens the doors!',
        items: [
          ['decor', 'net', 250, 0], ['decor', 'barrel', 270, 476], ['decor', 'sacks', 480, 476], ['port', 380, 200],
          ['sign', 250, 150, '{L} carries Glimmer the lantern fish!'],
          ['gems', 340, 410, 3, 40, -22, 'coin'], ['gem', 600, 300, 'pearl'],
          ['coral', 560, 0, 24, 'floor'], ['coral', 650, 0, 22, 'ceil'],
          ['sign', 640, 200, '{G}: find the lever in the light!', 'A lever hides in the dark...'],
          ['lever', 'l1', 762, 200], ['bulk', 800, 250, 476, { door: 'd1', need: ['l1'] }],
          ['urchin', 960, 250, { dy: 70, per: 4 }], ['coral', 1030, 0, 22, 'ceil'],
          ['gems', 890, 430, 3, 32, 0, 'coin'],
          ['sign', 1000, 380, 'A crate! {G} pushes it', 'A crate in the tunnel!'],
          ['wall', 1100, 74, 220, 318, 'crates'], ['crate', 1130, 1390],
          ['gems', 1430, 300, 3, 40, 0, 'pearl'],
          ['decor', 'crab', 1560, 476], ['port', 1700, 200],
          ['urchin', 1720, 452, { dx: 100, per: 5 }], ['urchin', 1930, 452, { dx: 90, per: 4.5, ph: 2 }],
          ['gems', 1650, 230, 4, 50, 15, 'coin'],
          ['coral', 2020, 0, 26, 'ceil'], ['coral', 2100, 0, 26, 'floor'], ['coral', 2190, 0, 24, 'ceil'], ['gem', 2140, 290, 'gem'],
          ['decor', 'hermit', 2200, 476, { span: 150 }], ['decor', 'barrel', 2330, 476],
          ['gems', 2290, 200, 2, 44, 0, 'coin'],
          ['wheel', 'w1', 2390, 410], ['bulk', 2450, 140, 476, { door: 'd2', need: ['w1'] }],
        ],
      },
      {
        title: 'Galley', lantern: 1, look: 'galley', len: 2950, exit: 2760, act: { label: 'flash', labels: ['grab', 'flash'] },
        tip: 'Swap! Bo carries Glimmer, Pip grabs. Flash the grumpy pufferfish away, then find the key!',
        news: 'Swap! Bo lights, Pip grabs',
        items: [
          ['sign', 220, 150, 'Swap! {L} carries Glimmer now'],
          ['decor', 'pots', 80, 0], ['decor', 'stove', 560, 476], ['port', 430, 210],
          ['wall', 300, 392, 160, 14, 'table'], ['gems', 330, 450, 3, 40, 0, 'coin'],
          ['sign', 470, 170, 'Grumpy pufferfish! {L}: flash it with {La}', 'Grumpy pufferfish! Flash it away'],
          ['bulk', 680, 240, 340], ['puffer', 698, 290, 880, 160],
          ['decor', 'plates', 880, 330], ['coral', 920, 0, 24, 'floor'], ['coral', 1010, 0, 24, 'ceil'],
          ['gems', 800, 200, 3, 0, 60, 'coin'], ['gem', 1110, 250, 'pearl'],
          ['decor', 'barrel', 1190, 476], ['key', 'k1', 1260, 450],
          ['sign', 1300, 170, 'A locked door! Find the key', 'A locked door!'],
          ['bulk', 1450, 104, 476, { door: 'd1', need: ['k1'], lock: true }],
          ['urchin', 1650, 290, { dy: 100, per: 4.4 }], ['urchin', 1830, 290, { dy: 100, per: 4.4, ph: 2.1 }], ['urchin', 2010, 290, { dy: 100, per: 4.4, ph: 4.2 }],
          ['decor', 'crab', 1740, 476], ['gems', 1740, 200, 3, 0, 90, 'coin'], ['gems', 1920, 200, 3, 0, 90, 'coin'],
          ['decor', 'pots', 2080, 0],
          ['lever', 'l1', 2250, 220], ['bulk', 2300, 270, 476, { door: 'd2', need: ['l1'] }],
          ['wall', 2500, 74, 120, 256, 'pipe'], ['wall', 2500, 420, 120, 80, 'pipe'], ['puffer', 2560, 375, 2720, 170],
          ['gems', 2400, 400, 2, 40, 0, 'coin'], ['gem', 2680, 300, 'gem'],
        ],
      },
      {
        title: "Captain's Cabin", lantern: 0, look: 'cabin', len: 3050, exit: 2880, act: { label: 'flash', labels: ['flash', 'grab'] },
        tip: 'Pip carries Glimmer again! Sleepy anemones need a flash. Mind the prickly coral in the dark!',
        news: 'Swap back! Pip lights, Bo grabs',
        items: [
          ['sign', 220, 150, 'Swap back! {L} has Glimmer'], ['decor', 'portrait', 330, 230], ['decor', 'hat', 460, 200],
          ['gems', 360, 420, 3, 40, 0, 'coin'],
          ['glow', 'g1', 540, 470], ['sign', 560, 290, 'A sleepy anemone! Flash to wake it'],
          ['lever', 'l1', 670, 180], ['bulk', 720, 230, 476, { door: 'd1', need: ['g1', 'l1'] }],
          ['wall', 880, 74, 40, 256], ['urchin', 900, 352, {}],
          ['coral', 980, 0, 24, 'floor'], ['gem', 990, 300, 'pearl'],
          ['wall', 1060, 250, 40, 250], ['urchin', 1080, 228, {}],
          ['coral', 1160, 0, 24, 'ceil'], ['gem', 1170, 330, 'pearl'],
          ['wall', 1240, 74, 40, 256], ['urchin', 1260, 352, { dy: 8, per: 3 }],
          ['decor', 'bed', 1420, 476],
          ['wall', 1560, 74, 200, 318, 'crates'], ['crate', 1590, 1830],
          ['gems', 1820, 220, 3, 34, 0, 'coin'],
          ['decor', 'shelf', 1920, 476], ['key', 'k1', 1920, 300], ['decor', 'map', 2010, 210],
          ['bulk', 2100, 104, 476, { door: 'd2', need: ['k1'], lock: true }],
          ['urchin', 2300, 452, { dx: 80, per: 4 }], ['coral', 2420, 0, 26, 'ceil'], ['urchin', 2520, 170, { dx: 60, per: 3.5 }],
          ['decor', 'crab', 2380, 476], ['decor', 'hermit', 2460, 476, { span: 120 }],
          ['gems', 2240, 250, 3, 50, -20, 'coin'], ['gem', 2660, 200, 'gem'],
          ['glow', 'g2', 2600, 470], ['wheel', 'w1', 2740, 330],
          ['bulk', 2800, 104, 476, { door: 'd3', need: ['g2', 'w1'] }],
        ],
      },
      {
        title: 'Treasure Room', lantern: 1, look: 'treasure', len: 3100, act: { label: 'flash', labels: ['grab', 'flash'] },
        tip: 'Bo carries Glimmer to the Treasure Room! Pip opens the way and the big chest at the end.',
        news: 'Last section! Bo lights, Pip grabs',
        items: [
          ['sign', 240, 150, 'Last section! The Treasure Room'], ['decor', 'gold', 440, 476], ['port', 330, 210],
          ['gems', 250, 410, 4, 40, -16, 'coin'],
          ['bulk', 600, 270, 370], ['puffer', 618, 320, 780, 170],
          ['gems', 700, 200, 3, 50, 0, 'gem'],
          ['wall', 900, 74, 200, 318, 'crates'], ['crate', 930, 1170],
          ['gems', 1180, 300, 2, 0, -70, 'coin'], ['decor', 'anchor', 1200, 476],
          ['glow', 'g1', 1250, 470], ['lever', 'l1', 1340, 170], ['bulk', 1400, 240, 476, { door: 'd1', need: ['g1', 'l1'] }],
          ['coral', 1520, 0, 24, 'floor'], ['coral', 1600, 0, 24, 'ceil'], ['decor', 'gold', 1650, 476],
          ['urchin', 1710, 290, { dy: 100, per: 4.2 }], ['coral', 1800, 0, 26, 'floor'], ['urchin', 1900, 290, { dy: 100, per: 4.2, ph: 3 }],
          ['coral', 1980, 0, 24, 'ceil'], ['gems', 1560, 300, 3, 110, 0, 'pearl'], ['gem', 1850, 200, 'gem'],
          ['key', 'k1', 2050, 440], ['bulk', 2150, 104, 476, { door: 'd2', need: ['k1'], lock: true }],
          ['wall', 2350, 74, 40, 236], ['wall', 2350, 400, 40, 100], ['puffer', 2370, 355, 2480, 170],
          ['gems', 2250, 420, 3, 30, 0, 'coin'], ['decor', 'gold', 2500, 476],
          ['wheel', 'w1', 2620, 400], ['bulk', 2700, 104, 476, { door: 'd3', need: ['w1'] }],
          ['decor', 'gold', 2800, 476], ['decor', 'gold', 3040, 476], ['chest', 2920],
        ],
      },
    ],
  },
  // ----- END 22-3 Shipwreck Lights -----
  //
  //
  //
  // ----- BEGIN 22-4 Dolphin Race (mode 'dolphinrace', js/levels/world22/dolphin-race.js) -----
  // 22-4 Dolphin Race (mode 'dolphinrace', versus, best of 5, Gavyn's pick): ride a dolphin along a side-scrolling sea
  // course: ▲ ▼ swim up and dive, the action leaps high out of the water, leap through gold hoops for a speed boost,
  // dodge seaweed, buoys, rocks, sleepy turtles, boats and gulls (bumps slow you). First through the coral arch wins.
  // The map is only the two spawns: the mode draws the whole course (MODES.dolphinrace).
  { name: 'Dolphin Race', world: 21, kind: 'versus', mode: 'dolphinrace', ownStep: true,
    match: { bestOf: 5, roundTime: 70 },
    act: { label: 'leap' },
    legend: {
      pip: '<kbd>W</kbd><kbd>S</kbd> swim up / dive',
      bo: '<kbd>↑</kbd><kbd>↓</kbd> swim up / dive',
      pad: 'stick ▲ ▼ swim up / dive,',
    },
    tip: '▲ ▼ swim up and dive. The action leaps out of the water: jump through gold hoops for speed, dodge the seaweed!',
    switches: {}, signs: [],
    map: [
      '................................', '................................', '................................',
      '................................', '................................', '................................',
      '................................', '................................', '................................',
      '................................', '................................', '................................',
      '................................', '................................', '................................',
      '....1.......2...................', '................................', '................................',
    ],
  },
  // ----- END 22-4 Dolphin Race -----
  //
  //
  //
  // ===== END World 22 =====
  //
  //
  //
  // ===== World 23 (Barnyard Fair, mixed): the farm and county fair world, world index 22 (js/levels/world23/), a sunny
  //   farm with red barns, hay fields, pig pens and a county fair with a Ferris wheel. Nothing scary, nobody gets hurt.
  //   Gavyn's picks (Nov 2026), from ten ideas: 23-1 Tractor & Trailer (team, scrolls sideways), 23-2 Runaway Pigs
  //   (team, scrolls sideways), 23-3 Hot Dog Stand Rush (team), 23-4 Pie-Eating Contest (versus, best of 5).
  //   Each level's def sits between its own BEGIN/END lines. world: 22 =====
  //
  // ----- BEGIN 23-1 Tractor & Trailer (mode 'haytractor', js/levels/world23/tractor-trailer.js) -----
  // 23-1 Tractor & Trailer (mode 'haytractor', team, Gavyn's pick): one little red tractor pulls a hay wagon across rolling
  // farmland, scrolling right. One drives (▶ gas, ◀ slow / back up, ▼ brake, the action honks at sheep, geese and crows),
  // the other stands on the wagon and catches the hay bales, pumpkins and golden corn tossed from the fields (◀ ▶ walk,
  // ▲ jumps, holding the action steadies the stack). Hard bumps fill the load's wobble meter and too many spill it. Each
  // field ends at a barn where the load is counted, then they swap jobs. The map is only the two spawns; the mode builds
  // each field from its course (tokens: see the top of the level file).
  { name: 'Tractor & Trailer', world: 22, kind: 'team', mode: 'haytractor', ownStep: true, ownHUD: true, noFalls: true, roomWord: 'Field',
    legend: {
      pip: '<kbd>A</kbd><kbd>D</kbd> drive or walk <kbd>W</kbd> jump <kbd>S</kbd> brake',
      bo: '<kbd>←</kbd><kbd>→</kbd> drive or walk <kbd>↑</kbd> jump <kbd>↓</kbd> brake',
      pad: 'stick drives or walks, <span data-glyph="a"></span> jumps,',
    },
    tip: 'Driver: ▶ gas, ◀ slow down, the action honks. Catcher: walk under the tosses, ▲ jumps, hold the action to steady the load!',
    act: { label: 'honk', labels: ['honk', 'hold'] },
    map: [...Array(15).fill('.'.repeat(32)), '..1.2' + '.'.repeat(27), '.'.repeat(32), '.'.repeat(32)],
    rooms: [
      {
        title: 'Hay Meadow', drive: 0, look: 'meadow', pace: 145, y0: 405, act: { label: 'honk', labels: ['honk', 'hold'] },
        tip: 'Pip drives, Bo catches! Keep a steady pace by the farmers, slow down for bumps, then drive up to the barn.',
        course: ['f210', 'Y:{D} drives! ▶ is the gas', 'f290', 'T:farmer:bbb', 'f250', 'Y:{C} catches the hay!', 'f210', 'u', 'f290', 'T:farmer:bbbb',
          'f210', 'g300:390', 'r', 'f150', 'Y:Sheep! Honk to shoo them', 'f170', 'S:2', 'f170', 'g300:415', 'T:kid:cbc', 'f380', 'u', 'f150',
          'Y:High bales! Jump to catch', 'f250', 'T:baler:bBB', 'f210', 'g250:395', 'r', 'f340', 'T:farmer:bbbb', 'f500', 'E'],
      },
      {
        title: 'Pumpkin Patch', drive: 1, look: 'patch', pace: 150, y0: 400, act: { label: 'honk', labels: ['hold', 'honk'] },
        tip: 'Swap! Bo drives, Pip catches. Pumpkins are heavy: they make the load wobble more. Honk at the crow!',
        course: ['f210', 'Y:Swap! {D} drives now', 'f290', 'T:farmer:bbbb', 'f210', 'g250:385', 'r', 'f150', 'Y:Pumpkins are heavy!', 'f210',
          'T:catapult:ppp', 'f420', 'u', 'f250', 'R', 'f150', 'g250:410', 'T:farmer:bpbp', 'f150', 'Y:A crow! Honk it away', 'f210', 'C:1', 'f250', 'r',
          'f340', 'T:catapult:pppp', 'f380', 'u', 'f290', 'T:kid:cpc', 'f340', 'R', 'f150', 'g250:395', 'T:baler:bBB', 'f500', 'E'],
      },
      {
        title: 'Bumpy Hills', drive: 0, look: 'hills', pace: 155, y0: 410, act: { label: 'honk', labels: ['honk', 'hold'] },
        tip: 'Pip drives again! Big humps and a little bridge: slow down, or hold on tight. Honk the geese off the road!',
        course: ['f210', 'Y:Big humps! Slow down or hold on', 'f150', 'g300:370', 'T:farmer:bbbb', 'f250', 'H', 'f250', 'g400:425', 'H', 'f250',
          'T:catapult:ppp', 'f170', 'g250:395', 'Y:Geese! Honk honk', 'f210', 'G:3', 'f340', 'T:farmer:bpbb', 'f100', 'Y:A little bridge', 'f250',
          'B:150', 'f250', 'g350:360', 'T:kid:ccb', 'f250', 'H', 'f150', 'g350:410', 'T:baler:bBBb', 'f290', 'L', 'f290', 'T:farmer:bbbb', 'f500', 'E'],
      },
      {
        title: 'Sunset Lane', drive: 1, look: 'sunset', pace: 160, y0: 400, act: { label: 'honk', labels: ['hold', 'honk'] },
        tip: 'Bo drives to the Big Barn at the fair! Crows, sheep, bumps and lots of hay. Bring home all you can!',
        course: ['f210', 'Y:To the Big Barn!', 'f290', 'T:farmer:bbbb', 'f210', 'C:2', 'f250', 'r', 'f100', 'g250:385', 'T:catapult:pppp', 'f380', 'u',
          'f210', 'H', 'f250', 'S:3', 'f380', 'T:farmer:bcbp', 'f340', 'R', 'f150', 'g300:410', 'C:2', 'T:baler:bBBb', 'f380', 'B:140', 'f300',
          'T:kid:cpc', 'f290', 'L', 'f150', 'g250:395', 'T:farmer:bbbbb', 'f550', 'E:big'],
      },
    ],
  },
  // ----- END 23-1 Tractor & Trailer -----
  //
  //
  //
  //
  // ----- BEGIN 23-2 Runaway Pigs (mode 'pigherd', js/levels/world23/runaway-pigs.js) -----
  // 23-2 Runaway Pigs (mode 'pigherd', team, Gavyn's pick): greased pigs escape across the farm, seen from above. One
  // herds (the action is a big clap: the pigs run away from the herder); the other keeps the gates (the action opens
  // forward gates, shuts side gates so curious pigs don't trot into the corn, the pond or the pie tent, flips the fork
  // levers, pulls the barn door rope and opens and shuts the pen). Jobs swap every chase (Pip herds 1 and 3). The map is
  // only the two spawns; the mode builds each chase from its items (see the top of the level file). Field y 104 to 492.
  { name: 'Runaway Pigs', world: 22, kind: 'team', mode: 'pigherd', ownStep: true, ownHUD: true, noFalls: true, roomWord: 'Chase',
    legend: {
      pip: '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> walk',
      bo: '<kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd> walk',
      pad: 'stick or d-pad walks,',
    },
    tip: 'One herds the slippery pigs (clap!), one opens and shuts the gates. Get every pig into the pen!',
    act: { label: 'clap', labels: ['clap', 'gate'] },
    map: [...Array(9).fill('.'.repeat(32)), '..1.2' + '.'.repeat(27), ...Array(8).fill('.'.repeat(32))],
    rooms: [
      {
        title: 'Barnyard', herder: 0, look: 'farm', len: 2700, keeperY: 390, act: { label: 'clap', labels: ['clap', 'gate'] },
        tip: 'Pip herds: the pigs run away from you! Bo opens the gate ahead and shuts the side gate.',
        news: 'Pip herds the pigs, Bo keeps the gates!',
        pigs: ['Rosie', 'Peanut', 'Truffle', 'Biscuit'], spots: [1, 3],
        items: [
          ['solid', 30, 104, 230, 80, 'barn'], ['decor', 'chickens', 330, 160], ['decor', 'flowers', 560, 450],
          ['route', [[120, 300], [820, 298], [1400, 300], [1900, 300], [2300, 300], [2440, 300]]],
          ['pigs', 440, 300],
          ['sign', 300, 440, '{H}: walk behind the pigs, clap with {Ha}', 'Walk behind the pigs: they run away!'],
          ['sign', 640, 140, '{K}: open the gate with {Ka}', '{K} opens the gate'],
          ['fence', 820, 104, 820, 240], ['gate', 'g1', 820, 240, 820, 360, { kind: 'fwd' }], ['fence', 820, 360, 820, 492],
          ['solid', 1020, 150, 70, 60, 'haystack'], ['solid', 1080, 404, 70, 60, 'haystack'],
          ['mud', 1230, 330, 46], ['sign', 1230, 410, 'Mud! Clap close by to get a pig out', 'Mud! Clap close by'],
          ['fence', 1420, 104, 1420, 210], ['fence', 1420, 210, 1560, 210], ['gate', 's1', 1560, 210, 1680, 210, { kind: 'side', open: true, zone: 'veg1', swing: -1 }],
          ['fence', 1680, 210, 1820, 210], ['fence', 1820, 104, 1820, 210],
          ['zone', 'veg1', 'veg', 1426, 104, 1814, 204, 1620, 268],
          ['sign', 1500, 440, '{K}: shut the side gate!', 'Shut the side gate!'],
          ['decor', 'cow', 1980, 450, { f: 1 }], ['decor', 'chickens', 2100, 150],
          ['fence', 2300, 104, 2300, 190], ['fence', 2300, 410, 2300, 492],
          ['pen', 2300, 190, 2620, 410],
        ],
      },
      {
        title: 'Duck Pond', herder: 1, look: 'pond', len: 3200, keeperY: 200, act: { label: 'clap', labels: ['gate', 'clap'] },
        tip: 'Swap! Bo herds, Pip keeps the gates. Shut the pond gates, and roll the hay into the broken fence!',
        news: 'Swap! Bo herds, Pip keeps the gates',
        pigs: ['Daisy', 'Pickles', 'Waffles', 'Button', 'Muffin'], spots: [0, 3],
        items: [
          ['route', [[120, 260], [700, 240], [1300, 240], [1520, 280], [2000, 260], [2400, 290], [2700, 300], [2860, 300]]],
          ['pigs', 430, 260], ['decor', 'flowers', 300, 150], ['decor', 'chickens', 520, 440],
          ['sign', 300, 420, 'Swap! {H} herds now'],
          ['fence', 640, 360, 760, 360], ['gate', 's1', 760, 360, 870, 360, { kind: 'side', open: true, zone: 'pondA', swing: 1 }],
          ['fence', 870, 360, 1080, 360], ['gate', 's2', 1080, 360, 1190, 360, { kind: 'side', open: true, zone: 'pondB', swing: 1 }],
          ['fence', 1190, 360, 1320, 360], ['fence', 640, 360, 640, 492], ['fence', 1320, 360, 1320, 492],
          ['zone', 'pondA', 'pond', 646, 366, 980, 492, 815, 296], ['zone', 'pondB', 'pond', 980, 366, 1314, 492, 1135, 296],
          ['sign', 700, 150, '{K}: shut both pond gates!', 'Two pond gates to shut!'],
          ['fence', 1450, 104, 1450, 220], ['gate', 'g1', 1450, 220, 1450, 340, { kind: 'fwd' }], ['fence', 1450, 340, 1450, 492],
          ['fence', 1456, 380, 1740, 380], ['fence', 1810, 380, 2100, 380], ['fence', 2100, 380, 2100, 492],
          ['zone', 'reeds', 'pond', 1462, 386, 2094, 492, 1700, 318],
          ['hay', 1775, 236, [1740, 374, 1810, 386], 'reeds'],
          ['sign', 1610, 160, '{K}: push the hay into the gap', 'The hay fills the gap'],
          ['mud', 2060, 220, 44],
          ['fence', 2400, 104, 2400, 230], ['gate', 'g2', 2400, 230, 2400, 350, { kind: 'fwd' }], ['fence', 2400, 350, 2400, 492],
          ['decor', 'cow', 2580, 160, { f: -1 }], ['decor', 'flowers', 2560, 440],
          ['fence', 2750, 104, 2750, 180], ['fence', 2750, 420, 2750, 492],
          ['pen', 2750, 180, 3100, 420],
        ],
      },
      {
        title: 'Cornfield Maze', herder: 0, look: 'corn', len: 3500, keeperY: 390, act: { label: 'clap', labels: ['clap', 'gate'] },
        tip: 'Pip herds again! At the fork, Bo pulls the lever: the top way is a dead end in the corn.',
        news: 'Swap back! Pip herds, Bo keeps the gates',
        pigs: ['Penny', 'Hamlet', 'Noodle', 'Clover', 'Sprout'], spots: [2, 4],
        items: [
          ['route', [[120, 300], [840, 300], [900, 420], [1560, 420], [1800, 300], [2500, 290], [2750, 290], [3050, 300], [3200, 300]]],
          ['pigs', 440, 300], ['decor', 'chickens', 300, 160],
          ['sign', 600, 440, 'A fork! {K}: pull the lever with {Ka}', 'A fork in the corn!'],
          ['solid', 920, 250, 640, 100, 'corn'],
          ['gate', 'gU', 920, 104, 920, 250, { kind: 'fork' }], ['gate', 'gL', 920, 492, 920, 350, { kind: 'fork' }],
          ['lever', 'lv', 880, 300, ['gU', 'gL']],
          ['zone', 'maze', 'corn', 1300, 104, 1560, 244, 840, 200], ['fence', 1566, 104, 1566, 250],
          ['mud', 1250, 430, 42],
          ['fence', 1900, 104, 1900, 200], ['fence', 1900, 200, 2040, 200], ['gate', 's1', 2040, 200, 2160, 200, { kind: 'side', open: true, zone: 'corn2', swing: -1 }],
          ['fence', 2160, 200, 2300, 200], ['fence', 2300, 104, 2300, 200],
          ['zone', 'corn2', 'corn', 1906, 104, 2294, 194, 2100, 262],
          ['mud', 2250, 390, 44],
          ['fence', 2500, 104, 2500, 230], ['gate', 'g1', 2500, 230, 2500, 350, { kind: 'fwd' }], ['fence', 2500, 350, 2500, 492],
          ['fence', 2620, 390, 2700, 390], ['gate', 's2', 2700, 390, 2810, 390, { kind: 'side', open: true, zone: 'veg3', swing: 1 }],
          ['fence', 2810, 390, 2900, 390], ['fence', 2620, 390, 2620, 492], ['fence', 2900, 390, 2900, 492],
          ['zone', 'veg3', 'veg', 2626, 396, 2894, 492, 2755, 326],
          ['decor', 'flowers', 2950, 150],
          ['fence', 3050, 104, 3050, 180], ['fence', 3050, 420, 3050, 492],
          ['pen', 3050, 180, 3400, 420],
        ],
      },
      {
        title: 'Fairground', herder: 1, look: 'fair', len: 3700, keeperY: 390, barnLen: 280, act: { label: 'clap', labels: ['gate', 'clap'] },
        tip: 'Bo herds to the county fair! Pip pulls the barn door rope when the pigs come, then picks the way.',
        news: 'Last chase! Bo herds, Pip keeps the gates',
        pigs: ['Buttercup', 'Pudding', 'Jellybean', 'Marshmallow', 'Pumpkin', 'Wiggles'], spots: [1, 4],
        items: [
          ['route', [[120, 300], [1000, 300], [1260, 300], [1640, 180], [1720, 180], [2200, 180], [2400, 260], [3000, 300], [3200, 300], [3360, 300]]],
          ['pigs', 460, 300], ['decor', 'bunting', 200, 120, { w: 500 }], ['decor', 'balloons', 760, 440],
          ['sign', 640, 150, 'The barn door shuts again by itself!', 'The barn door shuts by itself!'],
          ['solid', 1000, 104, 260, 141, 'barn'], ['solid', 1000, 355, 260, 137, 'barn'],
          ['gate', 'b1', 1000, 245, 1000, 355, { kind: 'barn' }],
          ['solid', 1400, 110, 80, 56, 'tent'], ['solid', 1460, 432, 80, 56, 'stall'],
          ['solid', 1700, 255, 500, 90, 'stall'],
          ['gate', 'gU', 1700, 104, 1700, 255, { kind: 'fork' }], ['gate', 'gL', 1700, 492, 1700, 345, { kind: 'fork' }],
          ['lever', 'lv', 1660, 300, ['gL', 'gU']],
          ['zone', 'splash', 'pond', 2000, 351, 2200, 492, 1640, 410], ['fence', 2206, 345, 2206, 492],
          ['sign', 1560, 440, 'The top way goes to the fair!', 'Top way to the fair!'],
          ['mud', 2380, 200, 44],
          ['fence', 2450, 400, 2540, 400], ['gate', 's1', 2540, 400, 2650, 400, { kind: 'side', open: true, zone: 'pie', swing: 1 }],
          ['fence', 2650, 400, 2750, 400], ['fence', 2450, 400, 2450, 492], ['fence', 2750, 400, 2750, 492],
          ['zone', 'pie', 'pie', 2456, 406, 2744, 492, 2595, 336],
          ['mud', 2880, 330, 42], ['decor', 'balloons', 2900, 150],
          ['decor', 'ribbonstage', 3000, 128],
          ['fence', 3200, 104, 3200, 160], ['fence', 3200, 440, 3200, 492],
          ['pen', 3200, 160, 3600, 440, true],
        ],
      },
    ],
  },
  // ----- END 23-2 Runaway Pigs -----
  //
  //
  //
  //
  // ----- BEGIN 23-3 Hot Dog Stand Rush (mode 'hotdog', js/levels/world23/hot-dog-stand-rush.js) -----
  // 23-3 Hot Dog Stand Rush (mode 'hotdog', team, Gavyn's pick): one screen inside a striped hot dog stand at the county
  // fair. The cook (kitchen, left) grills sausages, puts them in buns, adds the toppings the order tickets show and puts
  // them on the pass shelf; the server (counter, right) takes the fairgoers' orders, carries the hot dogs over and pours
  // lemonade, before patience runs out. Each shift runs on its own clock with a goal of happy customers; jobs swap every
  // shift (Pip cooks 1 and 3). The map is only the two spawns; the mode builds the stand (see the top of the level file).
  // Room fields: cook, len (s), goal, tops, topMin/topMax, two/three (chance of 2/3 hot dogs), maxDogs, bigAt (line
  // length that adds a hot dog), lemon (chance), every (s between fairgoers), first, patience, extraPat, bus.
  { name: 'Hot Dog Stand Rush', world: 22, kind: 'team', mode: 'hotdog', ownStep: true, ownHUD: true, noFalls: true, noTime: true, roomWord: 'Shift',
    legend: {
      pip: '<kbd>A</kbd><kbd>D</kbd> walk <kbd>W</kbd> hop',
      bo: '<kbd>←</kbd><kbd>→</kbd> walk <kbd>↑</kbd> hop',
      pad: 'stick or d-pad walks, <span data-glyph="a"></span> hops,',
    },
    tip: 'One cooks the hot dogs, one serves the fairgoers. Follow the arrow, then press the action!',
    act: { label: 'cook', labels: ['cook', 'serve'] },
    map: [...Array(9).fill('.'.repeat(32)), '..1.2' + '.'.repeat(27), ...Array(8).fill('.'.repeat(32))],
    rooms: [
      {
        title: 'Morning', cook: 0, len: 40, goal: 4, act: { label: 'cook', labels: ['cook', 'serve'] },
        tops: 'km', topMin: 0, topMax: 1, two: 0, maxDogs: 1, lemon: 0, every: 7, first: 1.0, patience: 40, extraPat: 8,
        tip: 'Pip cooks: grill, bun, topping, then the pass shelf. Bo takes the orders and hands them over!',
        news: 'Morning shift: Pip cooks, Bo serves!',
      },
      {
        title: 'Lunch Rush', cook: 1, len: 44, goal: 5, act: { label: 'serve', labels: ['serve', 'cook'] },
        tops: 'kmr', topMin: 1, topMax: 2, two: 0.2, maxDogs: 2, bigAt: 2, lemon: 0.4, every: 6.5, first: 1.0, patience: 42, extraPat: 8,
        tip: 'Swap! Bo cooks now. Pip serves and pours lemonade: hold the action, let go in the green!',
        news: 'Lunch Rush: Bo cooks, Pip serves (and pours lemonade)!',
      },
      {
        title: 'Afternoon', cook: 0, len: 44, goal: 4, act: { label: 'cook', labels: ['cook', 'serve'] },
        tops: 'kmro', topMin: 0, topMax: 2, two: 0.4, three: 0.05, maxDogs: 3, bigAt: 2, lemon: 0.35, every: 8.5, first: 1.0, patience: 46, extraPat: 8,
        tip: 'Bigger orders now! Every hot dog on a ticket has its own toppings. Onions are here too.',
        news: 'Afternoon: Pip cooks, Bo serves. Bigger orders!',
      },
      {
        title: 'County Fair Finale', cook: 1, len: 50, goal: 6, act: { label: 'serve', labels: ['serve', 'cook'] },
        tops: 'kmroc', topMin: 1, topMax: 2, two: 0.3, three: 0, maxDogs: 3, bigAt: 2, lemon: 0.35, every: 8, first: 1.0, patience: 46, extraPat: 8,
        bus: { at: 16, n: 4 },
        tip: 'The County Fair Finale! A hay-ride bus brings a crowd, and there is cheese now. Go go go!',
        news: 'The Finale: Bo cooks, Pip serves. Here comes the crowd!',
      },
    ],
  },
  // ----- END 23-3 Hot Dog Stand Rush -----
  //
  //
  //
  //
  // ----- BEGIN 23-4 Pie-Eating Contest (mode 'pieeat', js/levels/world23/pie-eating-contest.js) -----
  // 23-4 Pie-Eating Contest (mode 'pieeat', versus, best of 5, Gavyn's pick): Pip and Bo sit at the judges' table on the
  // fair stage, hands behind their backs. The action takes a bite (cheeks hold 6), ▲ gulps: a gulp on the crowd's clap is
  // a GULP! (all of it plus two bonus bites), off the beat only a third. Eating too fast fills the hiccup jar: full = HIC! and
  // no eating for a moment. First to finish every pie wins the round. The map is only the two spawns: the mode draws
  // the whole stage (MODES.pieeat).
  { name: 'Pie-Eating Contest', world: 22, kind: 'versus', mode: 'pieeat', ownStep: true,
    match: { bestOf: 5, roundTime: 60 },
    act: { label: 'bite' },
    legend: {
      pip: '<kbd>W</kbd> gulp on the clap',
      bo: '<kbd>↑</kbd> gulp on the clap',
      pad: '<span data-glyph="a"></span> or stick ▲ gulp on the clap,',
    },
    tip: 'The action takes a bite, ▲ gulps. Gulp when the crowd claps! Eat too fast and you get the hiccups.',
    switches: {}, signs: [],
    map: [
      '................................', '................................', '................................',
      '................................', '................................', '................................',
      '................................', '................................', '................................',
      '................................', '................................', '................................',
      '................................', '................................', '................................',
      '........1...........2...........', '................................', '................................',
    ],
  },
  // ----- END 23-4 Pie-Eating Contest -----
  //
  //
  //
  // ===== END World 23 =====
];

/* ---------- worlds: levels come in groups, each with its own look ---------- */
const WORLDS = [
  { name: 'Sunny Meadow', blurb: 'Buttons, boosts, colors, and a cord that keeps changing.', theme: {} },
  { name: 'Block Party', blurb: 'Build a way up for each other, team up against Robo, then fight over the crown.',
    theme: { skyTop: '#f4a58c', skyBot: '#ffe5c2', hillFar: '#d8a0bd', hillNear: '#b884a9', stone: '#4a4076', stoneLight: '#5b5190', stoneEdge: '#2f285a',
      grass: '#ffc47e', grassDark: '#d98c45', sun: 'rgba(255, 216, 160, 0.95)', sunGlow: 'rgba(255, 190, 140, 0.35)' } },
  { name: 'Fairway Fun', blurb: 'One of you swings the club, the other one is the ball.',
    theme: { skyTop: '#9cdcff', skyBot: '#eefbe2', hillFar: '#a8dd9f', hillNear: '#85ca7d', stone: '#6a5848', stoneLight: '#7f6b58', stoneEdge: '#4a3c30',
      grass: '#8fe071', grassDark: '#52aa46' } },
  // versus world: its levels use def.match (best-of-N rounds), see the MODES section. A world with no levels is hidden everywhere.
  { name: 'Rumble Park', blurb: 'Four head-to-head games. Win the most rounds!',
    theme: { skyTop: '#9a86e8', skyBot: '#ffc9a3', hillFar: '#c58fc4', hillNear: '#a771ae', stone: '#3c3466', stoneLight: '#4c4380', stoneEdge: '#28224a',
      grass: '#6fdcc4', grassDark: '#36a593', plank: '#d9925c', plankDark: '#8f5530', sun: 'rgba(255, 214, 150, 0.95)', sunGlow: 'rgba(255, 160, 130, 0.38)' } },
  // teamwork world (hidden until it has levels)
  { name: 'Road Trip', blurb: 'Drive, deliver, slide and climb: every job takes two!',
    theme: { skyTop: '#62c6dd', skyBot: '#fff0c8', hillFar: '#f0c890', hillNear: '#dca36c', sun: 'rgba(255, 238, 175, 0.95)', sunGlow: 'rgba(255, 205, 125, 0.36)',
      stone: '#4d4470', stoneLight: '#5e5487', stoneEdge: '#332c55', grass: '#9fe07f', grassDark: '#5fab55', plank: '#d8955a', plankDark: '#8c5530', rope: '#ffb347', ropeDark: '#7a4a22' } },
  // mixed world: two team levels and two versus levels (hidden until it has levels)
  { name: 'Backyard Bash', blurb: 'Feed, tug, chug and bounce: team up, then face off!',
    theme: { skyTop: '#8ccaf2', skyBot: '#ffe4ef', hillFar: '#d3ea8f', hillNear: '#b6dc6e', sun: 'rgba(255, 244, 196, 0.95)', sunGlow: 'rgba(255, 196, 220, 0.36)',
      stone: '#3f5f6f', stoneLight: '#4e7183', stoneEdge: '#2b4350', grass: '#74d65c', grassDark: '#3f9a3c', plank: '#e0a868', plankDark: '#9a6236', rope: '#f2d28c', ropeDark: '#7a5232' } },  // mixed world: three team levels and a versus finale (hidden until it has levels)
  { name: 'Castle Quest', blurb: 'Fire, fly, sneak and bump your way through the castle!',
    theme: { skyTop: '#86c3ee', skyBot: '#fdeccc', hillFar: '#a9bfd6', hillNear: '#8fb98a', sun: 'rgba(255, 242, 196, 0.95)', sunGlow: 'rgba(255, 220, 150, 0.36)',
      stone: '#625d74', stoneLight: '#756f8a', stoneEdge: '#423d55', grass: '#86d16a', grassDark: '#4a9447', plank: '#c98e57', plankDark: '#7d5030', rope: '#e8c36a', ropeDark: '#6b4a22' } },  // mixed world: two team levels and two versus levels, pretend tickets and chips only (hidden until it has levels)
  { name: 'Lucky Casino', blurb: 'Drop, spin, hop and push your way to the jackpot!',
    theme: { skyTop: '#6c54d8', skyBot: '#ffb3d1', hillFar: '#62cdbf', hillNear: '#e283bd', sun: 'rgba(255, 240, 190, 0.95)', sunGlow: 'rgba(255, 180, 220, 0.4)',
      stone: '#5a3d8c', stoneLight: '#6d4ea6', stoneEdge: '#3c2766', grass: '#ffc53d', grassDark: '#c98a12', plank: '#e8955a', plankDark: '#9a5a2e', rope: '#ffd75e', ropeDark: '#8a5a12' } },
  // teamwork world: four escapes from famous natural disasters, cartoony and family-friendly (hidden until it has levels)
  { name: 'Great Escapes', blurb: 'Volcanoes, quakes, glaciers and ash clouds: escape them together!',
    theme: { skyTop: '#f2a477', skyBot: '#ffe6bd', hillFar: '#c9a08e', hillNear: '#a98272', sun: 'rgba(255, 236, 180, 0.95)', sunGlow: 'rgba(255, 180, 120, 0.38)',
      stone: '#5d4b5f', stoneLight: '#705c73', stoneEdge: '#3e3143', grass: '#a9d870', grassDark: '#6a9c45', plank: '#d39a62', plankDark: '#8a5a32', rope: '#f0d08a', ropeDark: '#7a5432' } },
  // World 10: a boss world (Gavyn: a boss level every 10 worlds), one big boss level (a dusky purple and brass junk vault; each phase also takes the look of an earlier world)
  { name: "Collector's Vault", blurb: 'A giant robot stole a piece of every world. Win them all back together!',
    theme: { skyTop: '#3d2f6e', skyBot: '#e3a978', hillFar: '#6b5294', hillNear: '#56407c', sun: 'rgba(255, 222, 160, 0.92)', sunGlow: 'rgba(255, 190, 120, 0.32)',
      stone: '#55467a', stoneLight: '#685894', stoneEdge: '#372c58', grass: '#d9b55a', grassDark: '#a37f30', plank: '#c9955a', plankDark: '#7d5530', rope: '#f0c75e', ropeDark: '#7a5520' } },
  // World 11: the Summer Olympics (hidden until it has levels)
  { name: 'Summer Games', blurb: 'Dive, pedal, hurdle and throw: go for gold together!',
    theme: { skyTop: '#4fb6f0', skyBot: '#e9f8ff', hillFar: '#9fd4a0', hillNear: '#7cc27e', sun: 'rgba(255, 246, 190, 0.96)', sunGlow: 'rgba(255, 222, 140, 0.4)',
      stone: '#3f5a86', stoneLight: '#4f6c9c', stoneEdge: '#2b3f63', grass: '#8fdc6a', grassDark: '#4fa24a', plank: '#f0c070', plankDark: '#9a6a2e', rope: '#ffe08a', ropeDark: '#8a6420' } },
  // World 12: Winter Games (curling, bobsled, ski jump, ice hockey)
  { name: 'Winter Games', blurb: 'Slide, sweep, skate and soar: Winter Games for two!',
    theme: { skyTop: '#8fc8ef', skyBot: '#eef8ff', hillFar: '#d7e9f7', hillNear: '#b9d8ee', sun: 'rgba(255, 250, 232, 0.95)', sunGlow: 'rgba(214, 238, 255, 0.42)',
      stone: '#5d7fa8', stoneLight: '#7397c0', stoneEdge: '#3e5b82', grass: '#f4fbff', grassDark: '#bcd8ee', plank: '#c9955a', plankDark: '#7d5530', rope: '#e3f1ff', ropeDark: '#56789c' } },
  // World 13: Halloween, silly-spooky (a dusky purple night with an orange harvest moon; hidden until it has levels)
  { name: 'Spooky Hollow', blurb: 'Roll, dig, sneak and fly through a not-too-spooky Halloween night!',
    theme: { skyTop: '#2b2155', skyBot: '#f0915a', hillFar: '#5a3f78', hillNear: '#44305f', sun: 'rgba(255, 196, 110, 0.95)', sunGlow: 'rgba(255, 150, 70, 0.38)',
      stone: '#4a4060', stoneLight: '#5c5276', stoneEdge: '#302944', grass: '#8bc46a', grassDark: '#4f8a44', plank: '#c98650', plankDark: '#7a4a2a', rope: '#f2b45a', ropeDark: '#7a4a1a' } },
  // World 14: prehistoric dinosaurs, friendly and sunny (a warm jungle valley with a sleepy smoking volcano far away)
  { name: 'Dino Valley', blurb: 'Carry, fly, pull and race through the land of the dinosaurs!',
    theme: { skyTop: '#f6b26b', skyBot: '#fff1c9', hillFar: '#9fbf7a', hillNear: '#6fa45a', sun: 'rgba(255, 238, 170, 0.95)', sunGlow: 'rgba(255, 190, 110, 0.38)',
      stone: '#6b5a4a', stoneLight: '#806c58', stoneEdge: '#4a3c30', grass: '#7ccf4f', grassDark: '#3f8f3a', plank: '#c9925a', plankDark: '#7d5530', rope: '#b9d36a', ropeDark: '#5a6e2a' } },
  // World 15: space, friendly and floaty (a deep blue-violet starry sky with a big ringed planet; grey moon rock with lilac dust)
  { name: 'Orbit Outpost', blurb: 'Swing, flip, drive and hop your way across the stars!',
    theme: { skyTop: '#0d1033', skyBot: '#3a2c6e', hillFar: '#4a4a7a', hillNear: '#363660', sun: 'rgba(255, 214, 150, 0.95)', sunGlow: 'rgba(190, 160, 255, 0.35)',
      stone: '#6a6f8c', stoneLight: '#7f84a3', stoneEdge: '#474b66', grass: '#c9c3f0', grassDark: '#8f88c4', plank: '#9aa6c4', plankDark: '#5c6688', rope: '#f2f2ff', ropeDark: '#8a8fb0' } },
  // World 16: candy land and a candy factory, sweet and silly (a pink and peach sky with cotton candy clouds; chocolate ground with frosting on top)
  { name: 'Sugar Rush Factory', blurb: 'Sort, roll, paddle and catch your way through a world made of candy!',
    theme: { skyTop: '#ff9ccf', skyBot: '#fff0d6', hillFar: '#f7b8e0', hillNear: '#e48fc4', sun: 'rgba(255, 246, 200, 0.95)', sunGlow: 'rgba(255, 180, 220, 0.4)',
      stone: '#7a4a32', stoneLight: '#8f5a3e', stoneEdge: '#55301f', grass: '#fff4fa', grassDark: '#f2a7cf', plank: '#e8b06a', plankDark: '#9a6a2e', rope: '#ff6fa8', ropeDark: '#a8346a' } },
  // World 17: the jungle, leafy and sunny (a warm green-gold sky through the canopy; mossy brown earth with bright leaves on top)
  { name: 'Jungle Jamboree', blurb: 'Open temple doors, paddle the rapids, climb the falls and swing on vines!',
    theme: { skyTop: '#6cc7a8', skyBot: '#f4f6c8', hillFar: '#5fae6e', hillNear: '#3f8f55', sun: 'rgba(255, 244, 180, 0.95)', sunGlow: 'rgba(230, 255, 170, 0.38)',
      stone: '#6b5438', stoneLight: '#806645', stoneEdge: '#4a3826', grass: '#7fd65a', grassDark: '#3f9a3c', plank: '#c08a4e', plankDark: '#7a5228', rope: '#9bc85a', ropeDark: '#5a7f2e' } },
  // World 18: pirates, sunny and friendly (a bright tropical sky over a turquoise sea; warm sand on top of driftwood-brown rock)
  { name: 'Pirate Cove', blurb: 'Sail, swing, dig and duel your way across the high seas!',
    theme: { skyTop: '#55c3ef', skyBot: '#fff2cf', hillFar: '#6fd0c4', hillNear: '#3fb0a6', sun: 'rgba(255, 246, 190, 0.95)', sunGlow: 'rgba(255, 214, 140, 0.4)',
      stone: '#7a5a3e', stoneLight: '#8f6c4c', stoneEdge: '#553e2a', grass: '#f2d68c', grassDark: '#c9a457', plank: '#c98e57', plankDark: '#7d5030', rope: '#ead6a0', ropeDark: '#7a5a2a' } },
  // World 19: the Wild West, sunny and dusty (a warm orange-gold desert sky; red mesa rock with sandy dirt on top)
  { name: 'Tumbleweed Gulch', blurb: 'Hop the train, pump the handcar, ride the mine cart and face off at high noon!',
    theme: { skyTop: '#f6b26b', skyBot: '#fff0c9', hillFar: '#e59a66', hillNear: '#c7713f', sun: 'rgba(255, 244, 196, 0.95)', sunGlow: 'rgba(255, 196, 120, 0.42)',
      stone: '#a9563a', stoneLight: '#c06a48', stoneEdge: '#7a3a26', grass: '#e8c27a', grassDark: '#b98f45', plank: '#b77a45', plankDark: '#704622', rope: '#e9d29a', ropeDark: '#7a5a2a' } },
  // World 20: the second boss world (Gavyn: a boss world every 10 worlds): a volcanic sunset (dusky red and orange sky,
  // dark basalt stone, glowing orange lava accents on top)
  { name: 'Dragon Peak', blurb: 'Climb the volcano, dunk a grumpy dragon in his hot tub, ring his gong and race him down!',
    theme: { skyTop: '#5b2346', skyBot: '#ff9450', hillFar: '#8a3b3f', hillNear: '#5e2a33', sun: 'rgba(255, 200, 120, 0.95)', sunGlow: 'rgba(255, 120, 60, 0.42)',
      stone: '#3d3542', stoneLight: '#4d4453', stoneEdge: '#25202b', grass: '#ff8a3d', grassDark: '#c4501f', plank: '#8a5a3a', plankDark: '#4e3022', rope: '#e8c27a', ropeDark: '#6b4a22' } },
  // World 21: the sky, bright and breezy (a deep blue sky fading to a pale morning glow; fluffy white cloud ground with a lilac underside)
  { name: 'Sky Kingdom', blurb: 'Fly a balloon, ride a kite, build cloud bridges and race paper planes!',
    theme: { skyTop: '#5ab4f2', skyBot: '#fff4e0', hillFar: '#cfe6fb', hillNear: '#b2d5f5', sun: 'rgba(255, 248, 205, 0.96)', sunGlow: 'rgba(255, 230, 170, 0.42)',
      stone: '#8c88c4', stoneLight: '#a29fd6', stoneEdge: '#625ea0', grass: '#ffffff', grassDark: '#d6dcf4', plank: '#e0b070', plankDark: '#946232', rope: '#f4e2b0', ropeDark: '#8a6a3a' } },
  // World 22: under the sea, bright and friendly (sunlit turquoise water fading to deep blue; sandy seabed, pink coral)
  { name: 'Coral Deep', blurb: 'Steer a submarine, dive for treasure, light up a shipwreck and race the dolphins!',
    theme: { skyTop: '#3fc6d8', skyBot: '#0f5f9a', hillFar: '#2a8fb0', hillNear: '#1f7a9a', sun: 'rgba(210, 250, 255, 0.85)', sunGlow: 'rgba(150, 235, 255, 0.35)',
      stone: '#e07a8f', stoneLight: '#f29aac', stoneEdge: '#a8506a', grass: '#f2dca0', grassDark: '#c9ad6a', plank: '#9a6a3e', plankDark: '#5e3c1e', rope: '#efe0b0', ropeDark: '#7a6438' } },
  // World 23: a farm and county fair, sunny and friendly (a bright blue summer sky fading to warm gold; rich brown soil with green grass on top, red barn wood)
  { name: 'Barnyard Fair', blurb: 'Haul the hay, herd the pigs, sell hot dogs and win the pie contest!',
    theme: { skyTop: '#6ec3f2', skyBot: '#fff3c4', hillFar: '#b9dc7a', hillNear: '#8cc65a', sun: 'rgba(255, 244, 190, 0.96)', sunGlow: 'rgba(255, 214, 130, 0.42)',
      stone: '#8a5a36', stoneLight: '#a06c44', stoneEdge: '#5e3c22', grass: '#7fd05a', grassDark: '#4a9a3c', plank: '#c8483c', plankDark: '#7e2a22', rope: '#f2d27a', ropeDark: '#8a6a2a' } },
];
const worldLevels = w => LEVELS.map((l, i) => i).filter(i => LEVELS[i].world === w);
const levelCode = i => (LEVELS[i].world + 1) + '-' + (worldLevels(LEVELS[i].world).indexOf(i) + 1);
const lastInWorld = i => { const ls = worldLevels(LEVELS[i].world); return ls[ls.length - 1] === i; };
// worlds that have levels yet (an empty world is left out of every menu and summary)
const liveWorlds = () => WORLDS.map((wd, w) => w).filter(w => worldLevels(w).length > 0);
const nextLiveWorld = w => { const n = liveWorlds().find(x => x > w); return n === undefined ? null : n; };

