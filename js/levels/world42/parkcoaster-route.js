/* Pip & Bo - 42-1 Runaway Coaster: the Comet's track (the rail), what is on and beside it, and where the park stands.
   Plain JavaScript: no three.js here, so the rules (runaway-coaster.js), the computer brain and the bot tests use it
   with drawing switched off. The scenery (parkcoaster-scenery.js) is built from the same lists, so what you see is
   exactly what counts.

   Units are K3D units (1 = one 2D tile; Pip and Bo are 0.87 tall), Y is up, the park's ground is y = 0, the sea lies
   to the north (-Z) with the pier and the moon over it. The station is at x 0, z 70..90; the track leaves it heading
   north (-Z) and comes back into it from the south (+Z) at the end.

   THE RAIL. PARKCOASTER_ROUTE.R = RAIL3.build(points) (js/3d/rail.js): one closed circuit from the boarding spot to the
   buffers. Each point's v is the train's speed there (units/s): the chain lift a steady crawl, crests a hang, drops
   fast. `lift: true` marks the chain (the clack), `bank` rolls the track into a turn (degrees, + right side down).
   s is the distance along the rail. Control starts at R.START; the brake house is at R.BRAKE.

   ON THE TRACK (every list sorted by s; `lead` is where its warning sign stands, about 2 s ahead at that speed; the
   cue cards and the arrows on the track are timed from these lists by PARKCOASTER.cueList, runaway-coaster.js):
     bends   [{ s0, s1, dir: -1 left | 1 right, need: 1 half tilt | 2 full tilt }]     arrow boards (1 or 2 chevrons)
     tips    [{ s, dir, kind }]   something leans in from the -dir side; a full tilt toward dir tips the car past it
     ducks   [{ s, who: 'both' | 0 | 1, kind, h }]   a low thing across one rider's head (or both): each ducks
     hops    [{ s0, s1, kind }]   missing track: both jump together to hop over (the springs sign, yellow sleepers)
     levers  [{ s, side: 0 | 1, kind: 'switch' | 'bell' | 'target' | 'brake' }]   a rider's own side (Pip left, Bo right)
     cams    [{ s }]               a big drop with a camera sign: press nothing for its first second, arms up, photo
     arches  [s, ...]              photo arches: bolts back, the restart point
     tickets [{ s, lat, air }]     lat -2..2 across (-1 / 1 a lean out on that side, -2 / 2 a full tilt), air: needs a hop
     says    [{ s, text }]         the loudspeaker's lines (from the nearest horn speaker)
     parts   [{ s, name }]         the four stretches, for the stats line (never shown as cards)
   SWITCHES. A lever of kind 'switch' sits before a fork: unthrown, the points send the train down `det` (a short
   rough detour beside the main line that rejoins it, R.dets[i]: its own rail, bumps and one Rattle, no tickets).
   THE PARK (art): where the rides, stalls, lake, sea and pier stand, for the scenery and the wide shots. */
'use strict';

const PARKCOASTER_ROUTE = (function () {
  const PR = {};
  // The speeds below are the first build's; FAST is the rework that made the whole ride quicker (the slow weaving
  // stretches by about 45%, the big drops by about 20%, the chain lifts by 70%; the hang at each crest and the roll
  // into the station barely change). Everything on the track is placed by time (lead, the cues), so it keeps up.
  const sm01 = (a, b, x) => { const u = Math.max(0, Math.min(1, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
  // (`raw: true` on a point keeps its speed as written: the three trapdoors, which are hopped on a steady beat)
  PR.FAST = (v, o) => (o && o.raw ? v : o && o.lift ? v * 1.7 : v < 3.2 ? v * 1.25 : v * (1.45 - 0.25 * sm01(8, 18, v)));
  const P = (x, y, z, v, o) => Object.assign({ p: [x, y, z], v: PR.FAST(v, o) }, o || {});

  /* ---------- the circuit ----------
     Stretch 1 the Lift Hill: the dark station, round the station yard (two gentle bends, a low board), the chain up the
     big lift hill facing the sea with the park spread out below, the hang at the crest, the first drop, the first gold
     bend and the first hop.
     Stretch 2 the Midway (low and weaving through the stalls along the seafront), 3 the Funhouse (into the moon face),
     4 the Thunderbolt (the old wooden trestle over the boating lake, the loop, home to the station): laid out here so
     the park and the whole ride exist; their hazards are filled in after the look gate. */
  PR.pts = [
    // stretch 1: the station and its yard
    P(0, 3, 88, 1.2), P(0, 3, 80, 3.8), P(0, 3, 70, 5.2), P(0.6, 3, 62, 5.6),
    P(4, 3, 54, 5.8, { bank: 10 }), P(11, 3.2, 48.5, 5.8, { bank: 14 }), P(20, 3.4, 46.5, 5.8, { bank: 6 }),       // a gentle right
    P(29, 3.6, 46.5, 5.8), P(36.5, 3.8, 43.5, 5.8, { bank: -12 }), P(41, 4, 36, 5.8, { bank: -14 }), P(42, 4, 28, 5.6, { bank: -2 }), // a gentle left
    P(42, 4, 20, 4.2),
    // the chain lift: 32 up over 60 along, facing the sea
    P(42, 5.2, 14, 2.8, { lift: true }), P(42, 12, 2, 2.8, { lift: true }), P(42, 22, -16, 2.8, { lift: true }), P(42, 32, -34, 2.8, { lift: true }),
    P(42, 36.4, -42, 2.7, { lift: true }),
    // the crest: a hang
    P(42, 37.6, -47.5, 2.4), P(42, 37.3, -52, 3.0),
    // the first drop (hands up)
    P(42, 33.5, -57.5, 7), P(42, 21, -66.5, 14), P(42, 8, -75, 18), P(42.5, 3.6, -83, 18.5),
    // the first gold bend (hard right) at the bottom
    P(45, 3.4, -93, 17, { bank: 30 }), P(53, 3.6, -101, 16, { bank: 44 }), P(64, 3.8, -104, 15, { bank: 18 }),
    // the first hop: a missing stretch behind a "Track repairs" barrier
    P(76, 4, -104.5, 14), P(88, 4, -104.5, 13.5), P(100, 4, -104, 13),
    // stretch 2: the Midway. Low (head height) east between the game stalls along the seafront, round the carousel in a
    // long banked circle, back west along the garden walk (the targets, the bell, the pair of switches), a tight gold
    // turn, east past the fountain's spray, through the ferris wheel and over the sweepers' service crossing
    P(112, 3.2, -103, 10), P(124, 2.8, -101, 9, { bank: -6 }), P(138, 2.8, -104, 8.6, { bank: 6 }), P(152, 2.8, -101, 8.4, { bank: -6 }),
    P(166, 2.8, -104, 8.4, { bank: 6 }), P(180, 2.8, -102, 8.4), P(194, 2.8, -102, 8.6), P(206, 3, -100, 8.8),
    P(218, 3, -97, 8.8, { bank: -14 }), P(230, 3, -91, 8.8, { bank: -20 }), P(237, 3.1, -80, 8.8, { bank: -22 }), P(237, 3.2, -68, 8.8, { bank: -22 }),
    P(230, 3.2, -58, 8.8, { bank: -20 }), P(218, 3.2, -52, 8.8, { bank: -12 }), P(204, 3.2, -50, 8.8),
    P(190, 3.2, -49, 8.6), P(176, 3.2, -47, 8.4, { bank: 6 }), P(162, 3.2, -49, 8.4, { bank: -6 }), P(148, 3.2, -47, 8.4), P(134, 3.2, -48, 8.4),
    P(122, 3.4, -46, 8.2, { bank: -20 }), P(114, 3.6, -38, 8, { bank: -30 }), P(117, 3.6, -28, 8, { bank: -26 }), P(128, 3.5, -24, 8.2, { bank: -10 }),
    P(142, 3.4, -24, 8.4), P(156, 3.4, -26, 8.4), P(170, 3.6, -24, 8.6), P(184, 4, -23, 8.6, { bank: 14 }), P(194, 5, -19, 8.4, { bank: 26 }),
    P(199, 7, -12, 8.2, { bank: 8 }), P(200, 9.6, -4, 8), P(200.5, 9, 4, 8.2), P(202, 5, 12, 8.6),
    P(204.5, 1.4, 20, 9), P(205.5, 0.7, 22, 9), P(207, 1.4, 25, 9), P(212, 3.4, 36, 9.2), P(222, 7.5, 50, 9.2, { bank: -14 }), P(230, 10, 61, 9.4, { bank: -14 }),
    // stretch 3: the Funhouse, inside the laughing moon's building (in at the mouth, out through the right eye):
    // the spinning barrel, a gold turn into the hall of mirrors, the clockwork room, the trapdoors, the ball pit, and a
    // long climb back to the eye
    P(240, 11, 68, 8.6), P(252, 11, 68, 8.6), P(264, 11, 70, 8.6, { bank: 10 }), P(276, 11, 66, 8.6, { bank: -10 }), P(288, 11, 68, 8.6),
    P(300, 11, 70, 8.3, { bank: 24 }), P(309, 11, 78, 8.3, { bank: 32 }), P(312, 11, 90, 8.3, { bank: 10 }),
    P(312, 11, 100, 8.3), P(309, 11, 108, 8.1, { bank: 22 }), P(300, 11, 113, 8.1, { bank: 22 }), P(288, 11, 114, 8.1),
    P(278, 11, 114, 7.9), P(268, 11, 114, 7.9), P(260, 11, 117, 7.9, { bank: -20 }), P(256, 11, 126, 7.9, { bank: -26 }), P(260, 11, 135, 7.9, { bank: -20 }),
    P(270, 11, 138, 10, { raw: true }), P(282, 11, 138, 10, { raw: true }), P(294, 11, 138, 10, { raw: true }), P(305, 10.5, 142, 9, { bank: 20 }), P(312, 9.5, 150, 8.6, { bank: 26 }), P(306, 8, 156, 8.3, { bank: 20 }),
    P(294, 7, 156, 8.1), P(280, 7, 156, 8.1), P(268, 7.5, 156, 8.1),
    P(256, 8.5, 154, 7.7, { bank: 20 }), P(248, 9.5, 148, 7.6, { bank: 24 }), P(244, 11, 138, 7.2),
    P(243, 13.5, 126, 6.7), P(242.5, 16, 114, 7), P(242, 18.5, 102, 6.8), P(242, 20.5, 91, 6.6),
    P(241, 22, 82, 6.4, { bank: -12 }), P(238, 22.8, 75, 6.2, { bank: -14 }), P(233, 23, 73, 6),
    // stretch 4: the Thunderbolt. Straight out of the eye onto the second lift (scaffolding, tarpaulins, a sleeping
    // crane), fireworks all round; the big drop onto the old wooden trestle over the boating lake
    P(226, 23.4, 73, 3.2, { lift: true }), P(214, 28.6, 73, 3.2, { lift: true }), P(202, 34, 73, 3.2, { lift: true }), P(194, 37.6, 73, 2.8, { lift: true }),
    P(188, 39.2, 73, 2.4), P(183, 39, 73, 3),
    P(177, 34, 73.5, 8), P(169, 21, 75, 15), P(160, 9, 78, 18.5), P(150, 7, 84, 16, { bank: -20 }),
    P(144, 7, 96, 15, { bank: -34 }), P(143, 7, 110, 14.5), P(143, 7, 124, 14.5), P(139, 7, 136, 14.2, { bank: 30 }), P(129, 7, 144, 14.2, { bank: 36 }),
    P(116, 7, 147, 14, { bank: 8 }), P(104, 7, 146, 14), P(96, 7.2, 140, 14.5, { bank: -34 }), P(88, 7.4, 130, 15, { bank: -40 }),
    // the loop
    P(84, 7.8, 114, 15.5), P(84, 9, 104, 14.5, { loop: true }), P(84, 16, 97, 12, { loop: true }), P(84, 23, 101, 10, { loop: true }),
    P(84.6, 24.4, 108, 9.5, { loop: true }), P(85.8, 21, 115, 10.5, { loop: true }), P(87, 13.5, 116, 12.5, { loop: true }), P(88, 8, 110, 14.5, { loop: true }),
    P(88.4, 7, 100, 15), P(88.4, 7, 88, 15),
    // the crane's hook, then the long turn for home
    P(82, 6.6, 74, 14.5, { bank: -24 }), P(68, 6.2, 66, 14, { bank: -26 }), P(52, 5.8, 72, 13, { bank: -12 }), P(40, 5.3, 88, 12),
    P(32, 4.9, 108, 11.5), P(26, 4.6, 128, 11, { bank: 10 }), P(18, 4.4, 146, 10, { bank: 22 }), P(8, 4.2, 154, 9, { bank: 26 }),
    P(1.6, 4.1, 148, 8.5, { bank: 16 }), P(0, 4, 138, 8), P(0, 3.6, 124, 7.5), P(0, 3, 110, 7),
    // the brake house and the station
    P(0, 3, 99, 6), P(0, 3, 93, 3), P(0, 3, 89.2, 0.6),
  ];
  // the chain: points with lift: true and the rail rows between two of them
  PR.R = RAIL3.build(PR.pts);
  const R = PR.R;
  const sAt = (x, y, z, s0 = 0, s1 = R.len) => R.toLocal(x, y, z, s0, s1).s;
  const spt = i => sAt(...PR.pts[i].p);
  PR.START = sAt(0, 3, 76);        // control starts as the train rolls out of the station
  PR.END = R.len - 0.3;            // the buffers
  // the chain lifts (s ranges)
  PR.lifts = [];
  { let a = -1; PR.pts.forEach((pt, i) => { if (pt.lift && a < 0) a = i; if (!pt.lift && a >= 0) { PR.lifts.push([spt(a), spt(i - 1)]); a = -1; } }); }

  /* ---------- detours (a missed switch) ---------- */
  // a detour leaves the main line at the switch's fork, swings out to the lever's side, bumps along and rejoins
  PR.dets = [];
  PR.makeDetour = function (s0, s1, side) {
    const pts = [], n = 10, out = side === 0 ? -1 : 1;
    for (let i = 0; i <= n; i++) {
      const u = i / n, s = s0 + (s1 - s0) * u, f = R.at(s), w = Math.sin(u * Math.PI);
      const p = R.local(s, out * 5.5 * Math.pow(w, 0.6), -0.6 * w + 0.35 * Math.sin(u * Math.PI * 7) * w);
      pts.push({ p, v: f.v * 0.75 });
    }
    const D = RAIL3.build(pts);
    D.s0 = s0; D.s1 = s1; D.side = side;
    PR.dets.push(D);
    return PR.dets.length - 1;
  };

  /* ---------- places along the rail ----------
     nx(x, y, z) finds the rail nearest a point, searching on from the last place found (the circuit passes close to
     itself inside the funhouse and round the lake), so places are listed in riding order. */
  const at = {};
  let last = 0;
  const nx = (x, y, z, span = 260) => (last = sAt(x, y, z, last, Math.min(R.len, last + span)));
  at.yard1 = nx(11, 3.2, 48.5); at.yard2 = nx(37, 3.8, 42); at.board = nx(42, 4, 24);
  at.lift = PR.lifts[0][0]; at.crest = nx(42, 37.6, -47.5); at.drop = nx(42, 33.5, -57.5);
  at.gold1 = nx(53, 3.6, -101); at.hop1 = nx(88, 4, -104.5);
  // stretch 2
  at.midway = nx(112, 3.2, -103); at.bunting1 = nx(117, 2.9, -102); at.awnL = nx(126, 2.8, -101.5); at.ringToss = nx(134, 2.8, -103);
  at.sw1 = nx(146, 2.8, -102.5); at.plush = nx(176, 2.8, -103); at.awnR = nx(186, 2.8, -102); at.sw2 = nx(194, 2.8, -102);
  at.carouselIn = nx(222, 3, -95.5); at.carousel = nx(237, 3.2, -74); at.carouselOut = nx(214, 3.2, -51);
  at.targets = nx(188, 3.2, -48.8); at.bell = nx(166, 3.2, -48.5); at.sw3 = nx(154, 3.2, -48); at.sw4 = nx(145, 3.2, -47.2);
  at.uturnIn = nx(124, 3.4, -46.5); at.uturnOut = nx(128, 3.5, -24); at.fountain = nx(156, 3.4, -26); at.bunting2 = nx(170, 3.6, -24);
  at.wheelIn = nx(184, 4, -23); at.wheelBend = nx(199, 7, -12); at.spoke1 = nx(200, 9.6, -5.8); at.spoke2 = nx(200, 9.6, -2.2); at.wheel = at.spoke1;
  at.gondola = nx(201, 8.4, 7); at.crossing = nx(205.5, 0.7, 22);
  // stretch 3
  at.funhouse = nx(240, 11, 68); at.barrel = nx(252, 11, 68); at.barrelL = nx(276, 11, 66); at.barrelEnd = nx(292, 11, 68.5);
  at.goldF = nx(300, 11, 70); at.goldFOut = nx(312, 11, 90); at.mirrors = nx(312, 11, 96); at.sw5 = nx(305, 11, 111);
  at.clock = nx(282, 11, 114); at.gear = nx(278, 11, 114); at.pendulum = nx(269, 11, 114); at.cuckoo = nx(256, 11, 126); at.clockOut = nx(262, 11, 136);
  at.trap = nx(274, 11, 138); at.trap2 = nx(286.5, 11, 138); at.trap3 = nx(299, 10.8, 139); at.pit = nx(294, 7, 156); at.pitOut = nx(268, 7.5, 156);
  at.ramp = nx(243, 13.5, 126); at.rampTop = nx(242, 20.5, 91); at.eye = nx(236, 22.9, 73.5);
  // stretch 4
  at.lift2 = PR.lifts[1][0]; last = at.lift2; at.crest2 = nx(188, 39.2, 73); at.drop2 = nx(177, 34, 73.5);
  at.trestle = nx(150, 7, 84); at.goldT1 = nx(152, 7, 81); at.goldT1Out = nx(143.5, 7, 104); at.rocket = nx(143, 7, 108); at.hopT = nx(143, 7, 118); at.closed = nx(143, 7, 127);
  at.goldT2 = nx(141, 7, 131); at.goldT2Out = nx(118, 7, 147); at.loopArch = nx(114, 7, 147.2); at.scaffold = nx(106, 7, 146.4);
  at.cork = nx(97, 7.2, 141); at.loopIn = nx(84, 7.8, 114); at.loop = nx(84.6, 24.4, 108); at.loopOut = nx(88.4, 7, 100);
  at.hook1 = nx(88.4, 7, 93); at.homeL = nx(84, 6.8, 78); at.homeLOut = nx(55, 5.9, 70); at.hook2 = nx(39, 5.2, 91); at.crane = at.hook1;
  at.homeR = nx(26, 4.6, 128); at.homeROut = nx(3, 4.2, 152);
  at.brake = sAt(0, 3, 98, R.len - 60, R.len); at.station = sAt(0, 3, 89.2, R.len - 20, R.len);
  PR.at = at;

  /* ---------- the ride's clock ----------
     PR.tAt(s): the second the train is at s, riding at the track's own speed. The cues (PARKCOASTER.cues) and the
     computer's brain count "seconds until" with it, which stays right where the speed changes fast (the drops). */
  {
    const STEP = 0.25, tab = [0]; let t = 0;
    for (let s = 0; s < R.len; s += STEP) { t += STEP / Math.max(0.5, R.at(s + STEP / 2).v); tab.push(t); }
    PR.tAt = s => { const x = Math.max(0, Math.min(R.len, s)) / STEP, i = Math.min(tab.length - 2, Math.floor(x)); return tab[i] + (tab[i + 1] - tab[i]) * (x - i); };
    PR.eta = (from, to) => PR.tAt(to) - PR.tAt(from);   // seconds from one place to another (negative: already passed)
  }

  /* ---------- what is on the track ---------- */
  const L = PR.lists = { bends: [], tips: [], ducks: [], hops: [], levers: [], cams: [], arches: [], tickets: [], says: [], parts: [] };
  const v = s => R.at(s).v;
  const lead = s => Math.max(14, v(s) * 2.0);
  const bend = (s0, s1, dir, need) => L.bends.push({ s0, s1, dir, need, lead: s0 - lead(s0) });
  const duck = (s, who, kind, h) => L.ducks.push({ s, who, kind, h: h || 1.25, lead: s - lead(s) });
  const tip = (s, dir, kind) => L.tips.push({ s, dir, kind, lead: s - lead(s) });
  const hop = (s0, s1, kind) => L.hops.push({ s0, s1, kind, lead: s0 - lead(s0) });
  const lever = (s, side, kind, extra) => L.levers.push(Object.assign({ s, side, kind, lead: s - lead(s) }, extra || {}));
  // a track switch: the lever, then the fork 2.5 on; unthrown, the points send the train down a 22-long detour
  const sw = (s, side) => { const fork = s + 2.5; lever(s, side, 'switch', { fork, det: PR.makeDetour(fork, fork + 22, side) }); };
  const tk = (s, lat, air) => L.tickets.push({ s, lat, air: !!air });
  const row = (s0, s1, n, lat, air) => { for (let i = 0; i < n; i++) tk(s0 + (s1 - s0) * (n > 1 ? i / (n - 1) : 0), lat, air); };
  const zig = (s0, s1, n, lats) => { for (let i = 0; i < n; i++) tk(s0 + (s1 - s0) * (n > 1 ? i / (n - 1) : 0), lats[i % lats.length]); };
  const say = (s, text) => L.says.push({ s, text });
  L.parts.push({ s: 0, name: 'the lift hill' });

  // stretch 1. The yard: two gentle bends (one chevron each), tickets out to each side, a "Mind your head" board
  say(PR.START + 0.5, 'Welcome to Starlight Park! Please keep your hands inside the car.');
  L.arches.push(PR.START + 3);
  row(PR.START + 6, PR.START + 10, 3, 0);
  bend(at.yard1 - 6, at.yard1 + 6, 1, 1);
  row(at.yard1 - 4, at.yard1 + 4, 4, 1);                  // on the outside... Bo leans out right into the bend
  row(at.yard1 + 10, at.yard1 + 16, 3, -1);               // then Pip's side on the straight
  bend(at.yard2 - 6, at.yard2 + 6, -1, 1);
  row(at.yard2 - 4, at.yard2 + 4, 4, -1);
  duck(at.board, 'both', 'mindhead', 1.2);
  row(at.board - 3, at.board + 3, 3, 0);
  // the lift: tickets hang left and right the whole way up (keep leaning while you look)
  say(at.lift - 4, 'Lean together on the gold arrows!');
  {
    const [a, b] = PR.lifts[0];
    for (let k = 0; k < 14; k++) { const s = a + 3 + (b - a - 6) * k / 13; tk(s, [1, -1, 2, -2, -1, 1, -2, 2, 1, -1, 2, -2, 1, -1][k]); }
    L.arches.push(a + (b - a) * 0.45);
  }
  // the crest and the first drop: a camera sign
  L.cams.push({ s: at.drop - 2, lead: at.drop - 14 });
  row(at.drop + 4, at.drop + 22, 4, 0);
  // the first gold bend at the bottom, the first hop
  bend(at.gold1 - 9, at.gold1 + 9, 1, 2);
  row(at.gold1 - 6, at.gold1 + 6, 4, 2);
  hop(at.hop1 - 1.6, at.hop1 + 1.6, 'repairs');
  row(at.hop1 - 3, at.hop1 + 3, 3, 0, true);

  // stretch 2, the Midway: at head height between the stalls. Bunting and awnings to duck (an awning only over its
  // own side's rider), the ring-toss hoops are tickets on Bo's side, a giant plush prize hangs in from the right
  // (tip left past it), the first switch on Pip's side, then one on Bo's
  L.parts.push({ s: at.midway - 6, name: 'the midway' });
  L.arches.push(at.midway - 4);
  say(at.midway - 2, 'Riders on the left, mind the left-hand levers. Riders on the right, you get the idea.');
  duck(at.bunting1, 'both', 'bunting', 1.3);
  duck(at.awnL, 0, 'awning', 1.25);
  row(at.ringToss - 2, at.ringToss + 6, 4, 1); tk(at.ringToss + 9, 2);
  sw(at.sw1, 0);
  row(at.sw1 + 26, at.sw1 + 30, 2, 0);
  tip(at.plush, -1, 'plush');
  tk(at.plush + 3, -2);
  duck(at.awnR, 1, 'awning', 1.25);
  sw(at.sw2, 1);
  // round the carousel: a long one-chevron bend, keeping pace with the horses, tickets between them (inside, left)
  bend(at.carouselIn, at.carouselOut, -1, 1);
  zig(at.carouselIn + 6, at.carouselOut - 4, 9, [-1, -1, -2, -1, -1, -2, -1, -1, -2]);
  L.arches.push(at.carouselOut + 4);
  // back west along the garden walk: a row of duck targets on Pip's side, the strongman's bell on Bo's, then a pair of
  // switches, left then right, a beat apart
  for (let k = 0; k < 3; k++) lever(at.targets + k * 6, 0, 'target', { pre: 3.5 });
  lever(at.bell, 1, 'bell', { pre: 5 });
  sw(at.sw3, 0); sw(at.sw4, 1);
  // a tight gold turn, then east past the fountain (tickets in its spray), bunting, and a right turn into the wheel
  bend(at.uturnIn, at.uturnOut, -1, 2);
  row(at.uturnIn + 6, at.uturnOut - 6, 3, -1);
  zig(at.uturnOut + 6, at.fountain + 10, 6, [1, -1]);
  duck(at.bunting2, 'both', 'bunting', 1.3);
  L.arches.push(at.bunting2 + 8);
  bend(at.wheelIn, at.wheelBend + 2, 1, 1);
  row(at.wheelIn + 2, at.wheelBend, 3, 1);
  // through the ferris wheel between its spokes (duck, duck), past a gondola hoisted off for repairs that swings in
  // from the right (tip left), then the sweepers' crossing, where one has dropped his broom on the rails (hop)
  duck(at.spoke1, 'both', 'spoke', 1.3); duck(at.spoke2, 'both', 'spoke', 1.3);
  tip(at.gondola, -1, 'gondola');
  hop(at.crossing - 1.4, at.crossing + 1.4, 'broom');
  row(at.crossing - 2.5, at.crossing + 2.5, 3, 0, true);
  row(at.crossing + 10, at.funhouse - 14, 5, 0);

  // stretch 3, the Funhouse: in at the moon's mouth. The spinning barrel (the walls turn; only the arrows are true),
  // a gold turn into the hall of mirrors (the switch's lamp shows in the mirrors before the lever), the clockwork room
  // (gear teeth from the right, a low pendulum, a cuckoo on Bo's side), three trapdoors on the beat, the ball pit, and
  // the long climb out through the right eye
  L.parts.push({ s: at.funhouse - 8, name: 'the funhouse' });
  say(at.funhouse - 16, 'You are now entering the Funhouse. Everything is completely normal.');
  L.arches.push(at.funhouse - 6);
  row(at.barrel - 2, at.barrel + 6, 3, 0);
  bend(at.barrel + 9, at.barrel + 17, 1, 1); row(at.barrel + 10, at.barrel + 16, 3, 1);
  bend(at.barrelL - 4, at.barrelL + 4, -1, 1); row(at.barrelL - 3, at.barrelL + 3, 3, -1);
  bend(at.goldF - 2, at.goldFOut, 1, 2); row(at.goldF + 2, at.goldFOut - 3, 3, 2);
  row(at.mirrors, at.mirrors + 6, 3, 0);
  sw(at.sw5, 0);
  tip(at.gear, 1, 'gear');
  duck(at.pendulum, 'both', 'pendulum', 1.3);
  duck(at.cuckoo, 1, 'cuckoo', 1.25);
  tk(at.cuckoo - 5, -1); tk(at.cuckoo + 5, -1);
  L.arches.push(at.clockOut);
  for (const t0 of [at.trap, at.trap2, at.trap3]) { hop(t0 - 1.6, t0 + 1.6, 'trapdoor'); tk(t0, 0, true); }
  zig(at.pit - 2, at.pitOut, 8, [0, -1, 0, 1]);
  row(at.ramp, at.rampTop - 4, 4, 0);
  L.arches.push(at.rampTop);

  // stretch 4, the Thunderbolt: the second lift (fireworks start), the big drop (hands up), the old trestle over the
  // lake: a gold left, a gap, a runaway rocket that chases the train until Bo's switch sends it up a siding, a gold
  // right, straight into the corkscrew (hold the
  // full lean left), the loop, the crane's hook twice (duck, then tip right), two gold turns home, the brake house
  L.parts.push({ s: at.lift2 - 4, name: 'the Thunderbolt' });
  say(at.lift2, 'This section of the ride is closed for repairs. Enjoy!');
  {
    const [a, b] = PR.lifts[1];
    for (let k = 0; k < 8; k++) tk(a + 3 + (b - a - 6) * k / 7, [-1, 1, -2, 2, 1, -1, 2, -2][k]);
    tip(a + 3 + (b - a - 6) * 0.5, 1, 'scaffold');     // a scaffolding pole leans in from the left: tip right past it
  }
  L.arches.push(at.crest2 - 6);
  L.cams.push({ s: at.drop2 - 2, lead: at.drop2 - 14 });
  row(at.drop2 + 4, at.drop2 + 22, 4, 0);
  bend(at.goldT1, at.goldT1Out, -1, 2); row(at.goldT1 + 3, at.goldT1Out - 3, 3, -2);
  hop(at.hopT - 1.7, at.hopT + 1.7, 'trestle'); row(at.hopT - 3.5, at.hopT + 3.5, 3, 0, true);
  lever(at.rocket, 1, 'rocket', { fork: at.rocket + 2.5 });
  // (the first build had a "Closed" board to duck here too, between the hop and the gold bend: at the ride's new speed
  // that was four different presses in a second and a half, so it went)
  bend(at.goldT2, at.goldT2Out, 1, 2); row(at.goldT2 + 3, at.goldT2Out - 3, 4, 2);
  L.arches.push(at.loopArch);
  // (scaffolding leaned in here in the first build: at the new speed there was no time to swing from the gold right to
  // a full lean left for it, and the corkscrew's own gold left starts a moment later)
  bend(at.cork, at.loopIn, -1, 2);
  { for (let k = 0; k < 12; k++) tk(at.loopIn + 4 + k * 3.2, 0); }
  duck(at.hook1, 'both', 'hook', 1.3);
  bend(at.homeL, at.homeLOut, -1, 2); row(at.homeL + 4, at.homeLOut - 4, 4, -2);
  tip(at.hook2, 1, 'hook');
  row(at.hook2 + 8, at.homeR - 4, 4, 0);
  bend(at.homeR, at.homeROut, 1, 2); row(at.homeR + 4, at.homeROut - 4, 4, 2);
  L.arches.push(at.brake - 30);
  lever(at.brake, 0, 'brake'); lever(at.brake, 1, 'brake');
  say(at.station - 1, 'Please exit to your left. We hope you had a pleasant ride.');

  for (const k of Object.keys(L)) if (k !== 'arches') L[k].sort((a, b) => (a.s0 != null ? a.s0 : a.s) - (b.s0 != null ? b.s0 : b.s));
  L.arches.sort((a, b) => a - b);
  L.parts.sort((a, b) => a.s - b.s);

  // the station loop: a missed brake sends the train out of the station to the west, round an oval and back onto the
  // home straight ahead of the brake house, so the levers come again
  {
    const pts = [[0, 3, 97], [-1.5, 3, 90], [-8, 3, 84.5], [-18, 3.2, 86], [-24.5, 3.4, 96], [-26, 3.6, 112], [-25, 3.8, 128], [-20, 4, 142], [-11, 4, 150.5], [-3, 4, 149], [-0.2, 4, 141], [0, 4, 133]];
    const D = RAIL3.build(pts.map(p => ({ p, v: 6.5 })));
    D.s0 = sAt(0, 3, 97, R.len - 30, R.len); D.s1 = sAt(0, 4, 133, R.len - 80, R.len); D.side = -1; D.loop = true;
    PR.dets.push(D); PR.stationLoop = PR.dets.length - 1;
  }

  /* ---------- the park: where everything stands (for the scenery) ---------- */
  PR.art = {
    station: { x: 0, z: 84, w: 14, d: 22 }, clock: { x: -12, z: 78, h: 22 },
    sea: { z: -150 }, pier: { x: 120, z0: -146, z1: -300, w: 12 }, moon: { x: -60, y: 200, z: -520, r: 46 },
    lake: { x: 150, z: 112, rx: 74, rz: 46 },
    funhouse: { x: 279, z: 104, w: 84, d: 112, h: 34 },
    fountain: { x: 156, z: -33, r: 4.6 }, crane: { x: 70, z: 97, h: 32 },
    midway: { x0: 100, x1: 210, z: -103 },
    rides: [
      { k: 'wheel', x: 200, z: -4, r: 18, hub: 21, yaw: 0 },           // the big ferris wheel (the track threads it)
      { k: 'carousel', x: 220, z: -76, r: 9, speed: -R.at(at.carousel).v / 18 },   // (turns with the train going round it)
      { k: 'swings', x: -18, z: -16, r: 9, h: 16 },
      { k: 'drop', x: -46, z: -70, h: 52 },
      { k: 'teacups', x: -42, z: 30, r: 10 },
      { k: 'flume', x: -96, z: -10, h: 22 },
      { k: 'wheel', x: -110, z: -120, r: 14, hub: 16, yaw: 0.7, small: true },
      { k: 'swings', x: 330, z: -60, r: 8, h: 14 },
      { k: 'drop', x: 360, z: 40, h: 44 },
      { k: 'carousel', x: -70, z: 110, r: 7 },
    ],
  };
  return PR;
})();
