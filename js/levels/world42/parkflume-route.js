/* Pip & Bo - 42-2 Log Flume Plunge: Timber Falls' channel (the rail down its middle), its widths, its banks, and what
   floats in it or stands over it. Plain JavaScript: no three.js here, so the rules (log-flume-plunge.js), the computer
   brain and the bot tests use it with drawing switched off. The scenery (parkflume-scenery.js) is built from the same
   lists, so what you see is exactly what counts.

   Units are K3D units (1 = one 2D tile; Pip and Bo are 0.87 tall), Y is up, the park's ground is y = 0 round the dock.
   The dock is at the origin; the ride leaves it heading north (-Z), runs west through the gardens and the jungle, south
   through the sawmill, climbs the lift tower and plunges east into Splashdown Lagoon, and comes home to the same dock.

   THE CHANNEL. PARKFLUME_ROUTE.R = RAIL3.build(points) (js/3d/rail.js) down the middle of the water: p.y is the water's
   surface there, v the current (units/s, always > 0, so nothing can lock). s is the distance along it. Across it, x is
   the distance to the right of the middle (Pip's paddle is on the left, -x; Bo's on the right, +x).
     PR.w(s)       half the water's width (the banks are at -w and +w)
     PR.kind(s)    what the banks are: 'garden' (stone kerb, lawns), 'trough' (painted wooden flume sides), 'rock'
                   (jungle rock), 'mill' (indoors), 'tower' (the lift and the drop), 'lagoon'
   ON THE WATER (every list sorted by s):
     ducks    [{ s, x, big }]          golden rubber ducks (a big one is worth five); the log takes one it touches
     drops    [{ s0, s1, kind, lead }] a weir or the plunge: both hold on (brace) from before s1 to it; `lead` is where
                                       the yellow "Hold on!" hand signs stand
     arches   [s, ...]                 lifebuoy arches: the bucket robot bails the log dry, the restart point
     islands  [{ s0, s1, hw, x }]      an island in the middle (a fork): left and right branches round it; hw its half
                                       width at the middle (a lens, pointed at both ends), x its middle
     obs      [{ id, kind, s, x, r, soak, move }]   things in the water: `soak` ones Soak the log, the rest only bump it.
                                       move(t) -> { s, x, on } for a thing that moves (`on` false: it is out of the
                                       water now, e.g. a water wheel's paddle up); cyc [per, on, ph] for
                                       a timed one (on for `on` s of every `per`, from `ph`: the art reads it)
     signs    [{ s, side, kind }]      boards on the bank ('drag' a paddle held in the water, 'brace' the hand signs)
     says     [{ s, text }]            the park loudspeaker's lines
     parts    [{ s, name }]            the four stretches (for the stats line; never shown as cards)
   THE PARK (art): where the dock, the gardens, the coaster's trestle and the park's rides stand. */
'use strict';

const PARKFLUME_ROUTE = (function () {
  const PR = {};
  // a control point: x, water y, z, current, half width, an optional tag (its s is kept in PR.at)
  const P = (x, y, z, v, w, tag) => ({ p: [x, y, z], v, w, tag });
  const W0 = -0.45; // the water's surface round the dock (the ground is 0, a stone kerb between)
  const W1 = -1.45; // below the first weir

  /* ---------- the channel ----------
     Stretch 1 Lantern River (slow, wide, the park's gardens): the dock; a long straight to learn pairs; a lazy S (Pip's
     strokes, then Bo's); swan boats drifting loose and a low footbridge with fishing robots; a tight left bend round
     the fountain (a drag); the coaster's trestle overhead; the first weir (hold on); a fork round an island (left easy,
     right more ducks and a water wheel).
     Stretches 2 to 4 (Jungle Bend, the Sawmill, Thunder Falls) are laid out so the whole ride exists; their hazards and
     scenery come after the look gate. */
  PR.pts = [
    P(0, W0, 7, 0.9, 3.2, 'dock'), P(0, W0, 0, 1.6, 3.6), P(0, W0, -10, 2.2, 5.0, 'start'),
    P(0, W0, -26, 2.4, 5.2), P(0, W0, -44, 2.5, 5.2, 'sStart'),
    // the lazy S: right, then left
    P(4, W0, -58, 2.5, 4.8), P(10, W0, -70, 2.5, 4.6), P(10.5, W0, -80, 2.5, 4.4, 'arch1'), P(6, W0, -92, 2.5, 4.8),
    P(-1, W0, -104, 2.5, 5.0), P(-4, W0, -116, 2.5, 5.6),
    // the swans' pool and the footbridge
    P(-4, W0, -130, 2.4, 6.4, 'swans'), P(-2, W0, -146, 2.4, 6.0), P(-1, W0, -156, 2.4, 4.6, 'bridge'),
    // the fountain pool: a tight left round it (the fountain on the inside)
    P(-2, W0, -166, 2.3, 6.5, 'fountain0'), P(-7, W0, -176, 2.3, 7.2), P(-16, W0, -181.5, 2.3, 6.4), P(-26, W0, -182, 2.4, 4.8, 'arch2'),
    // under the coaster's trestle to the first weir
    P(-36, W0, -181, 2.5, 4.4, 'trestle'), P(-45, W0, -180.6, 2.6, 4.2), P(-49.5, W0 - 0.1, -180.5, 3.2, 4.2, 'weir0'),
    P(-51.5, W1 + 0.05, -180.5, 4.2, 4.2, 'weir1'), P(-55, W1, -180.6, 3.2, 4.6),
    // the fork round the island
    P(-64, W1, -181, 2.6, 7.5, 'fork0'), P(-78, W1, -182, 2.6, 10.5), P(-92, W1, -181.5, 2.6, 10.5), P(-104, W1, -180, 2.6, 7.5, 'fork1'),
    P(-114, W1, -178.5, 2.7, 5.0), P(-122, W1, -177, 2.7, 3.0, 'arch3'),
    // stretch 2: Jungle Bend: the hippos' pool, the elephant, crocodiles, the first rapids (a row of small drops),
    // the whirlpool, the snake tunnel, a fork (left behind a waterfall curtain, right through rapids)
    P(-132, W1 - 0.1, -175, 2.8, 5.0, 'jungle'), P(-146, W1 - 0.15, -170, 2.4, 8.0, 'hippos'), P(-160, W1 - 0.2, -161, 2.4, 7.5),
    P(-170, W1 - 0.25, -148, 2.7, 5.2, 'elephant'), P(-176, W1 - 0.3, -134, 2.7, 5.4, 'crocs'), P(-180, W1 - 0.3, -120, 2.7, 4.8),
    P(-182, W1 - 0.35, -110, 2.6, 3.0, 'arch4'), P(-183, W1 - 0.4, -100, 3.2, 4.6, 'rapids0'), P(-184, -2.3, -90, 3.6, 4.4),
    P(-186, -2.7, -80, 3.6, 4.6, 'rapids1'), P(-190, -2.85, -71, 2.8, 6.0),
    P(-197, -2.85, -63, 1.6, 8.5, 'whirl'), P(-200, -2.85, -53, 2.6, 6.0), P(-197, -2.9, -42, 2.8, 4.2, 'snake'),
    P(-192, -2.95, -33, 2.8, 3.0, 'arch5'), P(-186, -3.0, -24, 2.7, 7.5, 'fork2a'), P(-175, -3.0, -17, 2.7, 10.5),
    P(-163, -3.1, -14, 2.7, 10.5), P(-152, -3.2, -13, 2.7, 7.0, 'fork2b'), P(-143, -3.4, -12.5, 2.4, 3.6),
    // the first lift: a belt hauls the log up out of the jungle; a short flat top; a drop into the mill pond
    P(-137, -3.4, -12.2, 2.2, 2.4, 'lift1Foot'), P(-130, -0.6, -12, 2.0, 2.2, 'lift1'), P(-121, 3.3, -12, 2.0, 2.2),
    P(-115, 5.0, -12, 2.0, 2.2, 'lift1Top0'), P(-111, 5.2, -12, 1.8, 2.3, 'lift1Top'), P(-107.5, 5.1, -12, 2.6, 2.3, 'brink1'),
    P(-102, 2.4, -11.8, 8, 2.5), P(-97, -1.2, -11, 9, 3.2), P(-93, W1, -10, 7, 4.5, 'splash1'),
    // stretch 3: the Sawmill: the mill pond (floating logs), in through the doors, saw blades, chutes dropping logs,
    // a band saw splitting the channel, the steam room and a big paddle wheel; the last conveyor goes onto the big lift
    P(-84, W1, -6, 3.2, 9.0, 'mill'), P(-74, W1, 0, 2.4, 8.0), P(-66, W1, 8, 2.6, 5.0), P(-62, W1, 16, 2.8, 4.2, 'millDoor'),
    P(-60, W1, 26, 3.0, 4.4, 'saws'), P(-59, W1, 38, 3.0, 4.4), P(-58.5, W1, 48, 3.0, 4.4, 'chutes'), P(-58, W1, 58, 2.8, 3.0, 'arch6'),
    P(-57, W1, 66, 2.8, 7.0, 'band0'), P(-55, W1, 76, 2.8, 8.5), P(-53, W1, 86, 2.8, 7.0, 'band1'),
    P(-50, W1, 94, 2.8, 4.4, 'steam'), P(-45, W1, 101, 2.8, 4.4, 'wheel2'), P(-38, W1, 105, 2.6, 3.0, 'arch7'),
    // stretch 4: Thunder Falls: the big lift out over the park, the top ("Smile!"), the plunge, Splashdown Lagoon, home
    P(-31, W1, 106.5, 2.2, 2.6, 'liftFoot'), P(-24, 2.6, 106.5, 2.0, 2.4, 'lift'), P(-10, 11.6, 106, 2.0, 2.4), P(2, 18.0, 105, 2.0, 2.4, 'top0'),
    P(7, 18.3, 104.5, 1.6, 2.5, 'top'), P(11, 18.2, 104, 2.4, 2.5, 'brink'),
    P(18, 12.5, 102, 11, 2.8), P(27, 4.0, 98, 15, 3.0), P(34, W0 + 0.05, 92, 13, 4.5, 'splash'),
    P(40, W0, 82, 8, 9, 'lagoon'), P(44, W0, 66, 5, 10), P(44, W0, 48, 3.6, 10, 'barges'), P(38, W0, 32, 3.2, 9), P(28, W0, 22, 2.8, 6, 'arch9'),
    P(18, W0, 18, 2.6, 6.5), P(10, W0, 16, 2.2, 5.5, 'weirJump'), P(5, W0 - 0.5, 14, 2.4, 4.6),
    P(1.5, W0 - 0.5, 11.5, 1.2, 4.0), P(0, W0 - 0.5, 9, 0.8, 3.6, 'ring'), P(0, W0 - 0.5, 4, 0.6, 3.2, 'end'),
  ];
  const R = PR.R = RAIL3.build(PR.pts, { step: 0.25 });
  PR.len = R.len;

  // the s of every control point (each lies on the rail: look for it just after the last one)
  PR.at = {};
  {
    let s0 = 0;
    for (const q of PR.pts) {
      const l = R.toLocal(q.p[0], q.p[1], q.p[2], Math.max(0, s0 - 1), Math.min(R.len, s0 + 80));
      q.s = Math.max(s0, l ? l.s : s0); s0 = q.s;
      if (q.tag) PR.at[q.tag] = q.s;
    }
    PR.pts[0].s = 0; PR.at.dock = 0; PR.pts[PR.pts.length - 1].s = R.len;
  }
  const sm = u => u * u * (3 - 2 * u);
  // the half width between control points (eased)
  PR.w = s => {
    const ps = PR.pts;
    if (s <= ps[0].s) return ps[0].w;
    for (let i = 0; i < ps.length - 1; i++) if (s <= ps[i + 1].s) { const a = ps[i], b = ps[i + 1], u = (s - a.s) / ((b.s - a.s) || 1); return a.w + (b.w - a.w) * sm(u); }
    return ps[ps.length - 1].w;
  };
  const A = PR.at;
  PR.START = A.start;
  // what the banks are along the way
  PR.kinds = [[0, 'garden'], [A.jungle, 'rock'], [A.lift1Foot - 3, 'tower'], [A.splash1 + 3, 'pond'], [A.millDoor, 'mill'], [A.liftFoot - 3, 'tower'], [A.splash + 4, 'lagoon']];
  PR.kind = s => { let k = PR.kinds[0][1]; for (const [s0, n] of PR.kinds) if (s >= s0) k = n; return k; };
  PR.parts = [{ s: 0, name: 'the river' }, { s: A.jungle, name: 'the jungle' }, { s: A.splash1, name: 'the sawmill' }, { s: A.liftFoot, name: 'the falls' }];

  /* ---------- what is on the water ---------- */
  const L = PR.lists = { ducks: [], drops: [], arches: [], islands: [], obs: [], signs: [], says: [], lifts: [], whirls: [], parts: PR.parts };
  const duck = (s, x, big, hook) => L.ducks.push({ s, x, big: !!big, hook: hook || 0 });
  const line = (s0, s1, x0, x1, n, big) => { for (let i = 0; i < n; i++) { const u = n > 1 ? i / (n - 1) : 0; duck(s0 + (s1 - s0) * u, x0 + (x1 - x0) * u, big && i === n - 1); } };

  // stretch 1: the long straight (ducks down the middle: paddle together); a lazy S of ducks (right, then left)
  line(A.start + 6, A.sStart - 2, 0, 0, 7);
  { const n = 12; for (let i = 0; i < n; i++) { const u = i / (n - 1), s = A.sStart + 4 + u * (A.swans - A.sStart - 10); duck(s, Math.sin(u * Math.PI * 2) * 2.6); } }
  // between the swans
  line(A.swans - 4, A.swans + 8, -2.6, 2.4, 5);
  // round the fountain on the inside line, close past its rim (a drag turns the log in tight)
  { const a0 = A.fountain0 - 2, a1 = A.arch2 - 4; for (let i = 0; i < 7; i++) { const u = i / 6; duck(a0 + (a1 - a0) * u, -2.6 + Math.sin(u * Math.PI) * 1.1); } }
  // under the trestle, then the weir: one over the drop's lip itself
  line(A.trestle - 2, A.weir0 - 3, 1.2, -0.6, 4);
  // the fork: left branch three ducks, right branch seven and a big one past the water wheel
  const ISL = { s0: A.fork0 + 2, s1: A.fork1 - 2, hw: 4.2, x: 0 };
  L.islands.push(ISL);
  line(ISL.s0 + 6, ISL.s1 - 6, -6.8, -6.8, 3);
  line(ISL.s0 + 3, ISL.s1 - 3, 6.6, 6.6, 7, true);
  line(A.fork1 + 2, A.arch3 - 3, 0, 0, 3);

  // weirs and the plunge (the lead is where the "Hold on!" hand signs stand, about 2.5 s ahead)
  L.drops.push({ s0: A.weir0 - 0.5, s1: A.weir1 + 1.0, kind: 'weir', lead: A.weir0 - 8.5 });
  L.drops.push({ s0: A.brink, s1: A.splash + 2, kind: 'plunge', lead: A.top + 1 });

  // lifebuoy arches: the channel narrows under them
  L.arches.push(A.arch1, A.arch2, A.arch3);

  // swan boats drifting loose (rubber: a bump, no Soak); the fountain (a bump); the island's nose and tail are its own
  const swan = (s, x, ax, ph, sp) => L.obs.push({ id: 'swan' + L.obs.length, kind: 'swan', s, x, r: 1.0, soak: false,
    move: t => ({ s: s + Math.sin(t * sp * 0.7 + ph) * 1.4, x: x + Math.sin(t * sp + ph) * ax, on: true }) });
  swan(A.swans - 6, 2.2, 1.6, 0.0, 0.32);
  swan(A.swans + 2, -2.4, 1.4, 2.1, 0.27);
  swan(A.swans + 11, 1.4, 2.0, 4.0, 0.3);
  L.obs.push({ id: 'fountain', kind: 'fountain', s: A.fountain0 + 9, x: -4.4, r: 1.7, soak: false });
  // the water wheel on the right branch: its paddles dip into the channel two seconds in every five (a Soak)
  {
    const s = (ISL.s0 + ISL.s1) / 2 + 3, x = 6.4, per = 5.0, down = 2.0;
    L.obs.push({ id: 'wheel', kind: 'wheel', s, x, r: 1.5, soak: true, per, down,
      move: t => { const u = ((t % per) + per) % per; return { s, x, on: u < down }; } });
  }

  /* stretch 2: Jungle Bend */
  // a timed thing: on for `on` seconds of every `per`, starting `ph` seconds in
  const cyc = (t, per, on, ph) => { const u = (((t - ph) % per) + per) % per; return u < on; };
  // hippos surfacing to yawn (up 3.6 s in every 6.5; the mouth open for the middle 1.4 s is a Soak, the back a bump)
  const hippo = (s, x, ph) => L.obs.push({ id: 'hippo' + L.obs.length, kind: 'hippo', s, x, r: 1.35, soak: false, ph,
    move: t => { const u = (((t - ph) % 6.5) + 6.5) % 6.5; return { s, x, on: u < 3.6, soak: u > 1.1 && u < 2.5, u }; } });
  hippo(A.hippos + 4, -3.0, 0); hippo(A.hippos + 12, 2.6, 2.2); hippo(A.hippos + 20, -1.4, 4.1);
  line(A.jungle + 4, A.hippos + 2, 0, 0.4, 3); line(A.hippos + 6, A.hippos + 22, 1.4, -3.4, 5);
  // the elephant on the right bank sprays a jet right across (1.3 s in every 4.5): time it, or hold on
  L.obs.push({ id: 'jet', kind: 'jet', s: A.elephant + 2, x: 0, r: 0.6, line: true, braceOk: true, soak: true, per: 4.5, cyc: [4.5, 1.3, 0.5],
    move: t => ({ s: A.elephant + 2, x: 0, on: cyc(t, 4.5, 1.3, 0.5) }) });
  line(A.elephant - 6, A.elephant + 8, -2.0, -2.0, 5);
  // crocodiles drifting like logs, then snapping sideways toward the middle (their eyes light 0.8 s first)
  const croc = (s, x, dir, ph) => L.obs.push({ id: 'croc' + L.obs.length, kind: 'croc', s, x, r: 1.0, soak: true, dir, ph,
    move: t => { const u = (((t - ph) % 5) + 5) % 5, k = u < 4.2 ? 0 : Math.sin((u - 4.2) / 0.8 * Math.PI); return { s: s + Math.sin(t * 0.3 + ph) * 1.2, x: x + dir * 2.2 * k, on: true, u }; } });
  croc(A.crocs + 3, 3.0, -1, 0); croc(A.crocs + 11, -3.0, 1, 1.7); croc(A.crocs + 19, 2.6, -1, 3.3);
  line(A.crocs - 4, A.crocs + 22, 0, 0, 6);
  // monkeys in the vines throwing coconuts: a ring on the water 1.5 s before each splash (a Soak for 0.35 s)
  const coco = (s, x, ph) => L.obs.push({ id: 'coco' + L.obs.length, kind: 'coconut', s, x, r: 1.0, soak: true, ph,
    move: t => { const u = (((t - ph) % 3.6) + 3.6) % 3.6; return { s, x, on: u > 1.5 && u < 1.85, u }; } });
  coco(A.arch4 - 13, -1.6, 0); coco(A.arch4 - 9, 1.8, 1.2); coco(A.arch4 - 5, 0, 2.4);
  // the first rapids: white water between rocks and a row of small drops to hold on through
  for (const k of [0, 1, 2]) { const d0 = A.rapids0 + 4 + k * 9; L.drops.push({ s0: d0, s1: d0 + 2.2, kind: 'rapid', lead: d0 - 6 }); }
  for (const [ds, x] of [[6, 2.6], [12, -2.4], [16, 1.9], [24, -2.0]]) L.obs.push({ id: 'rock' + L.obs.length, kind: 'rock', s: A.rapids0 + ds, x, r: 0.9, soak: false });
  line(A.rapids0 + 2, A.rapids1 + 6, -0.6, 0.6, 5);
  // the whirlpool: round and round until three good pairs break out (or long enough that it lets go anyway)
  L.whirls.push({ s: A.whirl, x: 0, r: 5.2, need: 3 });
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; duck(A.whirl + Math.sin(a) * 3.6, Math.cos(a) * 3.6); }
  // the snake arched over the channel: its tail flicks down in the middle (1.5 s in every 4): drag to wait
  L.obs.push({ id: 'tail', kind: 'tail', s: A.snake + 2, x: 0.4, r: 1.5, soak: true, cyc: [4, 1.5, 0.3], move: t => ({ s: A.snake + 2, x: 0.4, on: cyc(t, 4, 1.5, 0.3) }) });
  line(A.snake - 4, A.snake + 6, -2.3, -2.3, 3);
  // the fork: left behind a waterfall curtain (hold on through it: ducks and a hidden temple), right through rapids
  const ISL2 = { s0: A.fork2a + 2, s1: A.fork2b - 2, hw: 4.4, x: 0 };
  L.islands.push(ISL2);
  L.obs.push({ id: 'curtain', kind: 'curtain', s: (ISL2.s0 + ISL2.s1) / 2 - 4, x: -7.6, r: 2.4, side: -1, braceOk: true, soak: true });
  line(ISL2.s0 + 4, ISL2.s1 - 4, -7.4, -7.4, 6, true);
  for (const k of [0, 1, 2]) { const d0 = ISL2.s0 + 8 + k * 7; L.drops.push({ s0: d0, s1: d0 + 2, kind: 'rapid', side: 1, lead: d0 - 5 }); }
  line(ISL2.s0 + 4, ISL2.s1 - 4, 7.4, 7.4, 4);
  // the first lift: ducks on the belt's edges to hook with a stroke on your side
  L.lifts.push({ s0: A.lift1Foot, s1: A.lift1Top0 });
  for (const k of [0, 1, 2]) for (const sd of [-1, 1]) duck(A.lift1 + 2 + k * 5 + (sd > 0 ? 2.5 : 0), sd * 2.6, false, sd);
  L.drops.push({ s0: A.brink1 - 0.5, s1: A.splash1 + 2, kind: 'drop', lead: A.lift1Top0 - 1 });

  /* stretch 3: the Sawmill */
  // the mill pond: floating logs to nudge through (lumberjack robots log-rolling on some)
  { const xs = [-4.5, 3.8, -1.2, 5.2, -5.6, 1.8, -3.0, 4.2]; xs.forEach((x, i) => { const s0 = A.mill - 4 + i * 4.2, ph = i * 1.3; L.obs.push({ id: 'flog' + i, kind: 'floatlog', s: s0, x, r: 1.1, soak: false, roller: i % 3 === 0, move: t => ({ s: s0 + Math.sin(t * 0.25 + ph) * 0.8, x: x + Math.sin(t * 0.4 + ph) * 0.9, on: true }) }); }); }
  line(A.splash1 + 5, A.millDoor - 4, 0, -0.8, 6);
  // saw blades rising through slots in the floor (up 1.4 s in every 3; a spinning lamp warns)
  for (const [ds, x, ph] of [[3, -1.8, 0], [9, 1.8, 1.0], [15, -0.6, 2.0], [20, 2.1, 0.5]]) { const ss = A.saws + ds; L.obs.push({ id: 'saw' + L.obs.length, kind: 'saw', s: ss, x, r: 1.3, soak: true, ph, cyc: [3, 1.4, ph], move: t => ({ s: ss, x, on: cyc(t, 3, 1.4, ph) }) }); }
  line(A.saws + 1, A.saws + 22, 0.3, -0.3, 6);
  // chutes overhead tip logs in beside the boat: the wave (0.8 s in every 5) needs holding on (a shadow shows 1.5 s first)
  for (const [ds, ph] of [[3, 0], [8, 2.5]]) { const ss = A.chutes + ds; L.obs.push({ id: 'wave' + L.obs.length, kind: 'wave', s: ss, x: 0, r: 0.8, line: true, braceOk: true, soak: true, ph, cyc: [5, 0.8, ph], move: t => ({ s: ss, x: 0, on: cyc(t, 5, 0.8, ph) }) }); }
  // the band saw splits the channel: either side is fine, the right has the ducks
  const ISL3 = { s0: A.band0 + 1, s1: A.band1 - 1, hw: 3.6, x: 0, saw: true };
  L.islands.push(ISL3);
  line(ISL3.s0 + 3, ISL3.s1 - 3, 6.0, 6.0, 5);
  // the log grabber crane swinging a log across
  L.obs.push({ id: 'crane', kind: 'crane', s: A.band1 + 4, x: 0, r: 1.2, soak: true, move: t => ({ s: A.band1 + 4, x: Math.sin(t * 0.9) * 3.4, on: true }) });
  // the steam room: jets across on a count, then the big paddle wheel's blades coming down (hold on, or time them)
  for (const [ds, ph] of [[2, 0], [6, 1.8]]) { const ss = A.steam + ds; L.obs.push({ id: 'steam' + L.obs.length, kind: 'steam', s: ss, x: 0, r: 0.7, line: true, braceOk: true, soak: true, ph, cyc: [3.6, 1.0, ph], move: t => ({ s: ss, x: 0, on: cyc(t, 3.6, 1.0, ph) }) }); }
  L.obs.push({ id: 'pwheel', kind: 'pwheel', s: A.wheel2 + 2, x: 0, r: 0.9, line: true, braceOk: true, soak: true, cyc: [4, 1.4, 0.7], move: t => ({ s: A.wheel2 + 2, x: 0, on: cyc(t, 4, 1.4, 0.7) }) });
  line(A.steam - 2, A.arch7 - 2, 0, 0, 5);

  /* stretch 4: Thunder Falls */
  L.lifts.push({ s0: A.liftFoot, s1: A.top0 });
  for (const k of [0, 1, 2, 3]) for (const sd of [-1, 1]) duck(A.lift + 3 + k * 6.5 + (sd > 0 ? 3 : 0), sd * 2.8, k === 3, sd);
  // the lagoon: fountains firing one after another, swan boats again, fireworks barges, a water-skiing robot
  [[6, -4.0], [11, 3.4], [16, -2.0], [21, 4.2]].forEach(([ds, x], i) => { const ss = A.lagoon + ds; L.obs.push({ id: 'ftn' + i, kind: 'jetFountain', s: ss, x, r: 1.4, soak: true, braceOk: true, cyc: [4, 1.0, i], move: t => ({ s: ss, x, on: cyc(t, 4, 1.0, i) }) }); });
  line(A.lagoon + 4, A.lagoon + 24, 1.0, -1.0, 6);
  swan(A.lagoon + 28, 3.0, 2.0, 1.0, 0.3); swan(A.lagoon + 31, -3.6, 1.8, 3.0, 0.28);
  [[3, 4.0], [8, -4.0], [13, 4.0], [18, -4.0], [23, 3.6]].forEach(([ds, x], i) => L.obs.push({ id: 'barge' + i, kind: 'barge', s: A.barges + ds, x, r: 1.5, soak: false }));
  [[0, 0], [5.5, -1.2], [10.5, 1.2], [15.5, -1.2], [20.5, 1.2]].forEach(([ds, x]) => duck(A.barges + ds + 1, x));
  L.obs.push({ id: 'skier', kind: 'skier', s: A.arch9 - 4, x: 0, r: 1.0, soak: true, move: t => ({ s: A.arch9 - 4, x: Math.sin(t * 0.7) * 5.0, on: true }) });
  L.drops.push({ s0: A.weirJump, s1: A.weirJump + 2.5, kind: 'weir', lead: A.weirJump - 8 });
  duck(A.weirJump + 1.2, 0, true);
  line(A.weirJump + 4, A.ring - 4, 0, 0, 3);

  // signs on the bank
  L.signs.push({ s: A.fountain0 - 10, side: 1, kind: 'drag' });
  L.signs.push({ s: A.snake - 9, side: -1, kind: 'drag' });
  for (const o of L.obs) if (o.line && o.braceOk) for (const side of [-1, 1]) L.signs.push({ s: o.s - 8, side, kind: 'brace' });
  for (const d of L.drops) for (const side of [-1, 1]) L.signs.push({ s: d.lead, side, kind: 'brace' });
  L.signs.sort((a, b) => a.s - b.s);

  // the loudspeaker
  L.says.push({ s: A.start + 1, text: 'Welcome to Timber Falls, the park\'s most relaxing ride.' });
  L.says.push({ s: A.start + 16, text: 'Paddle together to go straight!' });
  L.says.push({ s: A.jungle - 4, text: 'Please do not feed the animals. The animals are clockwork. They should not be hungry.' });
  L.says.push({ s: A.mill - 4, text: 'You are now passing the historic sawmill. It has been switched off since 1962.' });
  L.says.push({ s: A.lift1 + 2, text: 'Up we go! Keep your paddles inside the log. Mostly.' });
  L.says.push({ s: A.top, text: 'Riders may get slightly damp.' });
  L.says.push({ s: A.ring - 14, text: 'Thank you for riding Timber Falls. Towels are not provided.' });

  // later arches: in the jungle, on top of each lift (so a Sinking never repeats a lift), in the mill, after the
  // splashdown and before the dock
  L.arches.push(A.arch4, A.arch5, A.lift1Top0 - 2, A.arch6, A.arch7, A.top0 - 2, A.splash + 7, A.arch9);
  for (const k of ['ducks', 'obs']) L[k].sort((a, b) => a.s - b.s);
  L.drops.sort((a, b) => a.s0 - b.s0);
  L.arches.sort((a, b) => a - b);

  /* ---------- the park round the ride (for the scenery and the wide shots) ---------- */
  PR.art = {
    dock: { x: 0, z: 4, yaw: 0 },
    moon: { x: 140, y: 200, z: -540, r: 46 },
    // the Comet's trestle crossing over the river just before the weir (a train of empty cars goes by now and then)
    trestle: { s: A.trestle + 1, h: 7.5 },
    fountain: { s: A.fountain0 + 9, x: -4.4 },
    bridge: { s: A.bridge },
    // the park's other rides, seen across the gardens
    rides: [
      { k: 'wheel', x: 46, z: -118, r: 17, hub: 21, yaw: 0.35 },
      { k: 'carousel', x: 36, z: -38, r: 7 },
      { k: 'swings', x: -38, z: -70, r: 8 },
      { k: 'drop', x: -42, z: -132, h: 34 },
      { k: 'teacups', x: 30, z: -168, r: 8 },
    ],
    lagoon: { x: 26, z: 44, rx: 26, rz: 30 },
  };
  PR.A = A;
  return PR;
})();
