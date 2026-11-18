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
                                       water now, e.g. a water wheel's paddle up)
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
    // stretch 2: Jungle Bend (laid out; filled after the look gate)
    P(-132, W1 - 0.2, -175, 2.9, 5.5, 'jungle'), P(-150, -1.8, -168, 3.0, 6), P(-166, -2.0, -152, 3.0, 6), P(-176, -2.2, -130, 3.0, 6),
    P(-178, -2.4, -106, 3.1, 7), P(-172, -2.6, -84, 3.1, 6), P(-162, -3.0, -62, 3.4, 5), P(-154, -3.4, -40, 3.4, 5),
    // stretch 3: the Sawmill
    P(-146, -3.5, -20, 3.2, 6, 'mill'), P(-132, -3.5, 0, 3.2, 5), P(-116, -3.5, 16, 3.3, 4.5), P(-98, -3.5, 28, 3.4, 4.5), P(-82, -3.5, 36, 3.4, 4.2),
    P(-72, -3.5, 42, 2.4, 3.0, 'liftFoot'),
    // stretch 4: Thunder Falls: the lift, the top, the plunge, Splashdown Lagoon, home
    P(-62, 1.5, 48, 2.2, 2.6, 'lift'), P(-48, 10.5, 55, 2.2, 2.6), P(-36, 17.6, 60, 2.2, 2.6, 'top0'), P(-30, 18.3, 62, 1.8, 2.6, 'top'),
    P(-24, 18.2, 63.5, 2.6, 2.6, 'brink'), P(-16, 12.5, 65.5, 11, 2.8), P(-6, 3.0, 67, 15, 3.0), P(2, W0 + 0.05, 68, 13, 4.5, 'splash'),
    P(14, W0, 68, 8, 9, 'lagoon'), P(30, W0, 62, 5, 10), P(40, W0, 46, 3.6, 10), P(36, W0, 30, 3, 9), P(20, W0, 20, 2.2, 7),
    P(6, W0, 14, 1.4, 5), P(0, W0, 9, 0.8, 3.6, 'ring'), P(0, W0, 4, 0.6, 3.2, 'end'),
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
  PR.kinds = [[0, 'garden'], [A.jungle, 'rock'], [A.mill, 'mill'], [A.liftFoot, 'tower'], [A.splash + 4, 'lagoon']];
  PR.kind = s => { let k = PR.kinds[0][1]; for (const [s0, n] of PR.kinds) if (s >= s0) k = n; return k; };
  PR.parts = [{ s: 0, name: 'the river' }, { s: A.jungle, name: 'the jungle' }, { s: A.mill, name: 'the sawmill' }, { s: A.liftFoot, name: 'the falls' }];

  /* ---------- what is on the water ---------- */
  const L = PR.lists = { ducks: [], drops: [], arches: [], islands: [], obs: [], signs: [], says: [], parts: PR.parts };
  const duck = (s, x, big) => L.ducks.push({ s, x, big: !!big });
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
  // signs on the bank
  L.signs.push({ s: A.fountain0 - 10, side: 1, kind: 'drag' });
  for (const d of L.drops) for (const side of [-1, 1]) L.signs.push({ s: d.lead, side, kind: 'brace' });
  L.signs.sort((a, b) => a.s - b.s);

  // the loudspeaker
  L.says.push({ s: A.start + 1, text: 'Welcome to Timber Falls, the park\'s most relaxing ride.' });
  L.says.push({ s: A.start + 16, text: 'Paddle together to go straight!' });
  L.says.push({ s: A.jungle - 4, text: 'Please do not feed the animals. The animals are clockwork. They should not be hungry.' });
  L.says.push({ s: A.mill - 4, text: 'You are now passing the historic sawmill. It has been switched off since 1962.' });
  L.says.push({ s: A.top, text: 'Riders may get slightly damp.' });

  for (const k of ['ducks', 'obs']) L[k].sort((a, b) => a.s - b.s);
  L.arches.sort((a, b) => a - b);

  /* ---------- the park round the ride (for the scenery and the wide shots) ---------- */
  PR.art = {
    dock: { x: 0, z: 4, yaw: 0 },
    moon: { x: 140, y: 130, z: -560, r: 36 },
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
