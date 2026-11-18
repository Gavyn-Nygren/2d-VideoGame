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

   ON THE TRACK (every list sorted by s; `lead` is where its warning sign stands, about 1.6 s ahead at that speed):
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
  const P = (x, y, z, v, o) => Object.assign({ p: [x, y, z], v }, o || {});

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
    // stretch 2: the Midway, low through the stalls along the seafront
    P(112, 3.2, -103, 11), P(126, 2.8, -100, 10, { bank: -8 }), P(140, 2.8, -104, 10, { bank: 8 }), P(156, 2.8, -100, 10, { bank: -8 }),
    P(172, 2.8, -104, 10), P(188, 2.8, -102, 10), P(204, 3, -100, 10.5),
    // round the carousel (a long banked circle, left)
    P(220, 3, -96, 10.5, { bank: -16 }), P(232, 3, -84, 10.5, { bank: -22 }), P(234, 3.2, -68, 10.5, { bank: -22 }), P(224, 3.4, -56, 10.5, { bank: -20 }),
    P(210, 3.6, -58, 10.5, { bank: -10 }),
    // through the fountain's spray and on to the ferris wheel (the track threads between its spokes)
    P(198, 4, -48, 10, { bank: 8 }), P(196, 6, -32, 9.5), P(198, 9, -16, 9), P(200, 10, -4, 9), P(202, 9, 8, 9.5),
    // the service crossing (sweeper robots), then up to the funhouse's mouth
    P(206, 5, 22, 10.5), P(212, 4.2, 36, 11), P(222, 6, 50, 10.5, { bank: 10 }), P(236, 8, 56, 10),
    // stretch 3: the Funhouse (inside the moon face's building)
    P(250, 8, 58, 10), P(262, 7.5, 58, 10.5), P(276, 7.5, 58, 11),                       // the spinning barrel
    P(288, 7.5, 64, 11, { bank: 20 }), P(292, 7.5, 76, 11, { bank: 24 }), P(286, 7.5, 88, 11, { bank: 16 }),   // the hall of mirrors
    P(272, 8, 94, 11), P(258, 8.5, 96, 11.5), P(246, 9, 102, 11.5, { bank: -18 }), P(244, 9.5, 114, 11.5, { bank: -18 }), // the clockwork room
    P(254, 10, 122, 12), P(268, 10, 124, 12.5), P(282, 9.5, 124, 12.5),                // the trapdoors
    P(294, 7.5, 128, 12, { bank: 18 }), P(298, 6.5, 140, 11.5), P(290, 9, 150, 11), // the ball pit
    P(276, 15, 154, 9), P(262, 22, 154, 7),                                              // up and out through the moon's eye
    // stretch 4: the Thunderbolt. The second lift (scaffolding, a sleeping crane), fireworks all round
    P(250, 25, 154, 3.2, { lift: true }), P(238, 31, 154, 3.2, { lift: true }), P(226, 37, 154, 3.2, { lift: true }), P(218, 39.4, 154, 2.6),
    P(212, 39.6, 154, 3.0),
    // the big drop onto the trestle over the boating lake
    P(205, 34, 154, 8), P(196, 20, 152, 15), P(186, 9, 148, 18.5), P(176, 7, 144, 18.5),
    P(162, 7, 138, 17.5, { bank: -14 }), P(148, 7, 134, 17), P(134, 7, 136, 17, { bank: 14 }), P(120, 7, 140, 16.5),
    P(106, 7, 140, 16.5), P(92, 7.2, 136, 16, { bank: -36 }), P(84, 7.4, 126, 15.5, { bank: -40 }),            // the corkscrew entry
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

  /* ---------- places along the rail ---------- */
  const at = {};
  at.yard1 = sAt(11, 3.2, 48.5); at.yard2 = sAt(37, 3.8, 42); at.board = sAt(42, 4, 24);
  at.lift = PR.lifts[0][0]; at.crest = sAt(42, 37.6, -47.5); at.drop = sAt(42, 33.5, -57.5);
  at.gold1 = sAt(53, 3.6, -101); at.hop1 = sAt(88, 4, -104.5);
  at.midway = sAt(112, 3.2, -103); at.carousel = sAt(234, 3.2, -68); at.wheel = sAt(200, 10, -4); at.crossing = sAt(206, 5, 22);
  at.funhouse = sAt(250, 8, 58); at.barrel = sAt(264, 7.5, 58); at.mirrors = sAt(292, 7.5, 76); at.clock = sAt(250, 9, 108);
  at.trap = sAt(268, 10, 124); at.pit = sAt(298, 6.5, 140); at.eye = sAt(262, 22, 154);
  at.lift2 = PR.lifts[1][0]; at.crest2 = sAt(218, 39.4, 154); at.drop2 = sAt(205, 34, 154); at.trestle = sAt(176, 7, 144);
  at.cork = sAt(88, 7.3, 131); at.loop = sAt(84, 24.4, 108); at.loopIn = sAt(84, 7.8, 114, at.cork, at.cork + 20); at.crane = sAt(70, 6, 70);
  at.brake = sAt(0, 3, 98); at.station = sAt(0, 3, 89.2, R.len - 20, R.len);
  PR.at = at;

  /* ---------- what is on the track ---------- */
  const L = PR.lists = { bends: [], tips: [], ducks: [], hops: [], levers: [], cams: [], arches: [], tickets: [], says: [], parts: [] };
  const v = s => R.at(s).v;
  const lead = s => Math.max(12, v(s) * 1.7);
  const bend = (s0, s1, dir, need) => L.bends.push({ s0, s1, dir, need, lead: s0 - lead(s0) });
  const duck = (s, who, kind, h) => L.ducks.push({ s, who, kind, h: h || 1.25, lead: s - lead(s) });
  const tip = (s, dir, kind) => L.tips.push({ s, dir, kind, lead: s - lead(s) });
  const hop = (s0, s1, kind) => L.hops.push({ s0, s1, kind, lead: s0 - lead(s0) });
  const lever = (s, side, kind, extra) => L.levers.push(Object.assign({ s, side, kind, lead: s - lead(s) }, extra || {}));
  const tk = (s, lat, air) => L.tickets.push({ s, lat, air: !!air });
  const row = (s0, s1, n, lat, air) => { for (let i = 0; i < n; i++) tk(s0 + (s1 - s0) * (n > 1 ? i / (n - 1) : 0), lat, air); };
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

  // stretch 2 (the Midway): its lines, arches and the loudspeaker; the hazards come after the look gate
  L.parts.push({ s: at.midway - 6, name: 'the midway' });
  L.arches.push(at.midway - 4);
  say(at.midway - 2, 'Riders on the left, mind the left-hand levers. Riders on the right, you get the idea.');
  row(at.midway + 4, at.midway + 40, 8, 0);
  L.arches.push(at.carousel - 30);
  row(at.carousel - 20, at.carousel + 20, 8, -1);
  L.arches.push(at.crossing - 8);
  // stretch 3 (the Funhouse)
  L.parts.push({ s: at.funhouse - 8, name: 'the funhouse' });
  say(at.funhouse - 10, 'You are now entering the Funhouse. Everything is completely normal.');
  L.arches.push(at.funhouse - 4);
  row(at.barrel - 4, at.barrel + 12, 6, 0);
  L.arches.push(at.clock - 10);
  row(at.trap - 6, at.trap + 10, 6, 0);
  L.arches.push(at.pit + 8);
  // stretch 4 (the Thunderbolt)
  L.parts.push({ s: at.lift2 - 4, name: 'the Thunderbolt' });
  say(at.lift2, 'This section of the ride is closed for repairs. Enjoy!');
  L.arches.push(at.crest2 - 6);
  L.cams.push({ s: at.drop2 - 2, lead: at.drop2 - 14 });
  row(at.trestle + 4, at.trestle + 40, 8, 0);
  L.arches.push(at.cork - 18);
  { for (let k = 0; k < 12; k++) tk(at.loopIn + 4 + k * 3.2, 0); }
  L.arches.push(at.brake - 30);
  lever(at.brake, 0, 'brake'); lever(at.brake, 1, 'brake');
  say(at.station - 1, 'Please exit to your left. We hope you had a pleasant ride.');

  for (const k of Object.keys(L)) if (k !== 'arches') L[k].sort((a, b) => (a.s0 != null ? a.s0 : a.s) - (b.s0 != null ? b.s0 : b.s));
  L.arches.sort((a, b) => a - b);
  L.parts.sort((a, b) => a.s - b.s);

  /* ---------- detours (a missed switch) ---------- */
  // a detour leaves the main line at the switch, swings out to the lever's side, bumps along and rejoins
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
    funhouse: { x: 272, z: 104, w: 70, d: 112, h: 34 },
    midway: { x0: 100, x1: 210, z: -103 },
    rides: [
      { k: 'wheel', x: 200, z: -4, r: 18, hub: 21, yaw: 0 },           // the big ferris wheel (the track threads it)
      { k: 'carousel', x: 220, z: -76, r: 9 },
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
