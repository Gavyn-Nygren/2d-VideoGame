/* Pip & Bo - 43-1 Coin Drop: the coin chute's route (the rail down the middle of the slide), its widths, what each
   stretch is made of, and every pickup, hazard and piece of track that needs both coins. Plain JavaScript: no three.js
   here, so the rules (coin-drop.js), the computer brain and the bot tests use it with drawing switched off. The
   scenery is built from the same lists, so what you see is exactly what counts.

   Units are K3D units (1 = one 2D tile; Pip and Bo are 0.87 tall, a coin is 2.2 across). Y is up. The coins land in the
   chute at the origin and the ride runs down and away (-Z first) through the four stretches to the START button.

   THE CHUTE. ARCADECOIN_ROUTE.R = RAIL3.build(points) (js/3d/rail.js) down the middle of the slide: p is its floor,
   v the speed the track carries both coins at (units/s, always > 0, so nothing can lock), bank the tilt of the trough
   on bends (drawing only). s is the distance along it. Across it, x is the distance to the right of the middle.
     PR.w(s)       half the slide's width (the soft walls are at -w and +w)
     PR.kind(s)    what the slide is made of there: 'brass' (the polished coin chute), 'fall' (no chute: the coins fall
                   through the air into the gear works), 'gear' (brass trough through the gear works), 'trace' (a glowing
                   copper trace on the circuit board, low raised edges), 'heap' (the slope of piled coins in the coin box)
     PR.tAt(s)     seconds from the landing to s at the track's own speed (the cue cards and the brain count with it)
     PR.eta(a, b)  seconds from a to b
   THE LISTS (PR.lists, each sorted by s; x across, s along):
     pickups  [{ s, x, kind, row }]     small coins (1), tickets (3) and star chips (5); a coin touching one or the
                                        spark passing through it takes it. `row` names the sweep row it belongs to
     rows     [{ id, s, n, x0, x1 }]    a row laid across the chute, wider than one coin can reach: the whole row in one
                                        pass is a SWEEP
     wires    [{ s, x0, x1 }]           sparking bare wires low across the chute: jump
     gaps     [{ s0, s1, x0, x1 }]      holes in the chute: jump (the springboards' big gaps are here too)
     teeth    [{ s, len, x0, x1, per, on, ph }]   gear teeth across part of the chute, there for `on` s of every `per`
                                        (from ph): steer round them (they are too tall to jump)
     levers   [{ s, cx, amp, per, ph, hw }]       the coin-return lever swinging across like a pendulum: its bar (hw
                                        half wide) is at cx + amp * sin(2 pi t / per + ph). Low: jump it or dodge it
     carry    [{ s0, s1, v }]           a gear's face turning under the chute: carries coins sideways at v
     fans     [{ s0, s1, push }]        a fan's blast across the chute: pushes coins sideways
     slick    [{ s0, s1, x0, x1 }]      a solder blob: slippery (steering answers slowly)
     bugs     [{ s, x }]                glitch bugs on the track: zap them with the spark, or dodge (or hop)
     gates    [{ s, gx }]               a gate with a contact post at -gx and +gx: it opens when the spark touches both
     splits   [{ s0, s1, pairs: [{ btn: { s, side }, gate: { s, side } }] }]   the chute divides round a low see-through
                                        divider; a button on one side (ridden over) opens the gate on the other side
     springs  [{ s0, sh, s1, x0, x1, big }]       a twin springboard: the pad from s0 to the hold line sh (lateral
                                        x0..x1, two lit halves), the gap from sh to the landing s1. It fires both coins
                                        only when both are on it
     pillars  [{ s, x, r }]             tall pillars: solid (a coin slides round), and the spark snaps if one is
                                        between the coins
     squeeze  [{ s0, s1 }]              narrow slots (the walls close in)
     brush    [{ s, x0, x1 }]           the Sweeper's brush strikes (a lit strip 1.2 s before it slams down)
     checks   [s, ...]                  checkpoint rings (restart points)
     parts    [{ s, name }]             the four stretches (stats; never shown as cards)
     sweeper  { wake, lost }            where the Sweeper wakes up and where it is finally lost
     start    s                         the START button
   A gold "section" is the run from one checkpoint to the next (the catch-up help works per section). */
'use strict';

const ARCADECOIN_ROUTE = (function () {
  const PR = {};
  // a control point: x, floor y, z, track speed, half width, tag, kind, bank (degrees, + dips the right side)
  const P = (x, y, z, v, w, tag, kind, bank) => ({ p: [x, y, z], v, w, tag, kind, bank: bank || 0 });

  /* ---------- the rail ----------
     1 THE COIN CHUTE: a polished brass slide twisting down in the dark. Gentle bends, a first sweep row, a first wire,
       one easy split, a first twin springboard over a short gap, then the chute drops away into a long fall.
     2 THE GEAR WORKS: gear faces that turn under the coins, meshing teeth that open and close on a beat, the coin-return
       lever, the first arc gates and glitch bugs, a big spiral down round the master gear, a split, a squeeze. The
       Sweeper wakes near the end.
     3 CIRCUIT CITY: the chute becomes a glowing trace on a vast board. Data-bus sweeps, chip-block splits, fans, gates
       between resistors, pillars, bugs; the Sweeper chases. A wide twin springboard between two boards loses it.
     4 THE COIN BOX: an avalanche slope of piled coins: rolling giant coins (teeth that move), ridges to jump, the richest
       rows, the last twin springboard onto the START button. */
  PR.pts = [
    // 1 The Coin Chute
    P(0, 0, 0, 7.6, 4.8, 'land', 'brass'), P(0, -1.4, -16, 8.6, 5.0, null, 'brass'), P(1, -3.4, -34, 9.0, 5.2, 'row1', 'brass'),
    P(6, -5.8, -52, 9.0, 5.2, null, 'brass', 6), P(15, -8.3, -66, 9.0, 5.2, 'bend1', 'brass', 14), P(27, -10.8, -74, 9.0, 5.2, null, 'brass', 12),
    P(41, -13.3, -78, 9.2, 5.2, 'wire1', 'brass', 3), P(55, -15.8, -80, 9.4, 5.4, null, 'brass'), P(68, -18.3, -86, 9.5, 5.4, 'rowB', 'brass', -9),
    P(78, -20.8, -98, 9.5, 5.4, 'bend2', 'brass', -14), P(82, -23.3, -114, 9.5, 5.4, 'ck1', 'brass', -4), P(82.5, -25.8, -132, 9.5, 5.6, 'split1a', 'brass'),
    P(82, -28.3, -150, 9.5, 5.6, null, 'brass'), P(80, -30.8, -168, 9.5, 5.6, 'split1b', 'brass'), P(78, -32.8, -184, 9.0, 5.6, 'spring1', 'brass'),
    P(77, -33.3, -196, 7.6, 5.6, 'hold1', 'brass'), P(76, -35.0, -214, 9.0, 5.4, 'land1', 'brass'), P(74, -37.5, -230, 9.6, 5.2, 'wire2', 'brass'),
    P(71.5, -40.0, -246, 10.0, 5.0, 'brink', 'brass'),
    P(69.5, -58, -260, 13.0, 5.0, 'fall0', 'fall'), P(67.5, -86, -270, 15.0, 5.0, null, 'fall'), P(65.5, -106, -277, 12.0, 5.2, 'fall1', 'fall'),
    // 2 The Gear Works
    P(63, -110, -284, 9.2, 5.4, 'gears', 'gear'), P(58, -112, -300, 9.2, 5.4, null, 'gear'), P(50, -114, -316, 9.2, 5.4, 'gface1', 'gear', 6),
    P(38, -116, -327, 9.3, 5.4, null, 'gear', 8), P(24, -118, -332, 9.3, 5.2, 'teeth1', 'gear'), P(8, -120, -333, 9.4, 5.2, null, 'gear'),
    P(-8, -122, -330, 9.4, 5.4, 'lever1', 'gear', -4), P(-23, -124, -323, 9.4, 5.4, 'ck2', 'gear', -8), P(-37, -126, -312, 9.5, 5.4, 'gate1', 'gear', -10),
    P(-47, -128, -298, 9.5, 5.4, null, 'gear', -6), P(-51, -130, -282, 9.5, 5.4, 'bugs1', 'gear'),
    // the spiral down round the master gear (a turn and a quarter, banked)
    P(-49, -133, -266, 9.2, 5.6, 'spiral0', 'gear', -10), P(-40, -136, -252, 9.2, 5.6, null, 'gear', -18), P(-25, -139, -246, 9.2, 5.6, null, 'gear', -20),
    P(-11, -142, -253, 9.2, 5.6, 'spiralM', 'gear', -20), P(-6, -145, -268, 9.2, 5.6, null, 'gear', -20), P(-14, -148, -282, 9.2, 5.6, null, 'gear', -20),
    P(-29, -151, -286, 9.2, 5.6, null, 'gear', -18), P(-43, -154, -278, 9.4, 5.6, 'spiral1', 'gear', -12), P(-52, -156, -263, 9.6, 5.4, 'ck3', 'gear', -4),
    P(-55, -158, -246, 9.6, 5.4, 'split2a', 'gear'), P(-55, -160, -228, 9.6, 5.4, null, 'gear'), P(-53, -162, -210, 9.6, 5.4, 'split2b', 'gear'),
    P(-49, -164, -194, 9.8, 5.4, 'sweeper', 'gear', 4), P(-45, -166, -178, 10.0, 5.4, 'lever2', 'gear'), P(-43, -168, -162, 10.0, 5.2, 'squeeze1', 'gear'),
    P(-42.5, -170, -148, 10.0, 2.7, null, 'gear'), P(-42.5, -172, -136, 10.0, 2.7, null, 'gear'), P(-43, -174, -124, 10.4, 5.2, 'ck4', 'gear'),
    P(-44, -177, -108, 11.0, 5.4, 'brink2', 'gear'), P(-45, -186, -94, 12.0, 5.6, null, 'trace'),
    // 3 Circuit City
    P(-46, -191, -78, 11.0, 5.6, 'city', 'trace'), P(-46, -192, -60, 11.0, 5.8, 'bus1', 'trace'), P(-44, -193, -40, 11.0, 7.4, null, 'trace'),
    P(-36, -194, -24, 11.0, 7.4, null, 'trace', 6), P(-22, -195, -17, 11.0, 5.6, 'ck5', 'trace', 4), P(-4, -196, -15, 11.0, 5.6, 'split3a', 'trace'),
    P(14, -197, -15, 11.0, 6.0, null, 'trace'), P(32, -198, -17, 11.0, 5.6, 'split3b', 'trace', 6), P(46, -199, -25, 11.0, 5.6, 'fan1', 'trace', 8),
    P(54, -200, -41, 11.0, 5.6, null, 'trace'), P(56, -201, -59, 11.0, 5.6, 'gate2', 'trace'), P(55, -202, -77, 11.0, 5.6, 'ck6', 'trace'),
    P(51, -203, -95, 11.0, 5.6, 'bugs2', 'trace', -6), P(41, -204, -109, 11.0, 5.6, null, 'trace', -8), P(27, -205, -116, 11.0, 5.6, 'split4a', 'trace'),
    P(9, -206, -118, 11.0, 6.0, null, 'trace'), P(-9, -207, -116, 11.0, 5.6, 'split4b', 'trace', -6), P(-23, -208, -108, 11.0, 5.6, 'pillars', 'trace', -8),
    P(-31, -209, -94, 11.0, 5.8, 'bus2', 'trace'), P(-33, -210, -76, 11.0, 7.4, null, 'trace'), P(-33, -211, -58, 11.0, 7.4, 'ck7', 'trace'),
    P(-31, -212, -40, 11.0, 5.6, 'gate3', 'trace'), P(-27, -213, -22, 11.0, 5.6, 'fan2', 'trace'), P(-21, -214, -5, 11.0, 5.6, null, 'trace', 6),
    P(-8, -215, 8, 11.0, 5.6, 'bus3', 'trace', 6), P(8, -216, 14, 11.0, 7.4, null, 'trace'), P(24, -217, 20, 11.0, 7.4, null, 'trace', -4),
    P(34, -218, 32, 10.4, 5.8, 'spring3', 'trace', -6), P(37, -218.5, 44, 8.6, 5.8, 'hold3', 'trace'), P(38, -225, 72, 11.0, 6.2, 'land3', 'heap'),
    // 4 The Coin Box
    P(39, -228, 86, 12.0, 7.0, 'box', 'heap'), P(41, -233, 102, 12.4, 7.4, null, 'heap'), P(45, -239, 118, 12.8, 7.6, 'roll1', 'heap', 4),
    P(53, -245, 134, 13.0, 7.6, null, 'heap', 6), P(63, -251, 149, 13.0, 7.6, 'ridge1', 'heap'), P(71, -257, 165, 13.0, 7.6, 'ck8', 'heap'),
    P(75, -263, 182, 13.2, 7.6, 'rows4', 'heap'), P(75, -269, 199, 13.2, 7.6, null, 'heap', -5), P(71, -275, 216, 13.4, 7.6, null, 'heap', -6),
    P(63, -281, 232, 13.4, 7.6, null, 'heap', -4), P(52, -287, 246, 13.4, 7.6, 'roll2', 'heap', -6), P(38, -293, 256, 13.4, 7.6, null, 'heap', -8),
    P(22, -299, 262, 13.4, 7.6, 'ck9', 'heap', -4), P(6, -305, 266, 13.6, 7.6, null, 'heap'), P(-10, -311, 272, 13.6, 7.6, 'ridge2', 'heap', 6),
    P(-22, -317, 282, 13.6, 7.6, null, 'heap', 8), P(-28, -323, 297, 13.8, 7.6, 'rows5', 'heap', 4), P(-28, -329, 314, 13.8, 7.6, 'roll3', 'heap'),
    P(-24, -335, 331, 13.8, 7.6, 'ck10', 'heap', -4), P(-16, -341, 346, 13.8, 7.6, 'rows6', 'heap', -6), P(-5, -347, 359, 13.6, 7.4, null, 'heap', -4),
    P(8, -352, 369, 13.0, 7.0, null, 'heap'), P(21, -356, 378, 12.0, 6.4, 'spring4', 'heap'),
    P(30, -357, 385, 8.6, 6.4, 'hold4', 'heap'), P(46, -361, 396, 6.0, 6.4, 'start', 'button'), P(57, -361, 404, 3.0, 6.4, 'end', 'button'),
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
    PR.pts[0].s = 0; PR.at.land = 0; PR.pts[PR.pts.length - 1].s = R.len;
  }
  const A = PR.at;
  const sm = u => u * u * (3 - 2 * u);
  PR.w = s => {
    const ps = PR.pts;
    if (s <= ps[0].s) return ps[0].w;
    for (let i = 0; i < ps.length - 1; i++) if (s <= ps[i + 1].s) { const a = ps[i], b = ps[i + 1], u = (s - a.s) / ((b.s - a.s) || 1); return a.w + (b.w - a.w) * sm(u); }
    return ps[ps.length - 1].w;
  };
  // what the slide is made of: the kind of the control point at or before s
  PR.kinds = []; { let last = null; for (const q of PR.pts) if (q.kind !== last) { PR.kinds.push([q.s, q.kind]); last = q.kind; } }
  PR.kind = s => { let k = PR.kinds[0][1]; for (const [a, kk] of PR.kinds) if (s >= a) k = kk; return k; };
  // the ride's clock: seconds from the landing at the track's own speed (springboard holds and flights not counted)
  const tTab = [0];
  for (let i = 1; i < R.tab.length; i++) tTab.push(tTab[i - 1] + R.step / Math.max(1, (R.tab[i].v + R.tab[i - 1].v) / 2));
  PR.tAt = s => { const f = Math.max(0, Math.min(tTab.length - 1.001, s / R.step)), i = Math.floor(f); return tTab[i] + (tTab[i + 1] - tTab[i]) * (f - i); };
  PR.eta = (a, b) => PR.tAt(b) - PR.tAt(a);
  // the place the track reaches `secs` after s
  PR.sAfter = (s, secs) => { const t = PR.tAt(s) + secs; let lo = s, hi = R.len; for (let k = 0; k < 30; k++) { const m = (lo + hi) / 2; if (PR.tAt(m) < t) lo = m; else hi = m; } return (lo + hi) / 2; };

  /* ---------- what is on the chute ---------- */
  const L = PR.lists = { pickups: [], rows: [], wires: [], gaps: [], teeth: [], levers: [], carry: [], fans: [], slick: [], bugs: [], gates: [], splits: [],
    springs: [], pillars: [], squeeze: [], brush: [], checks: [], parts: [], says: [] };
  let rowN = 0;
  // a lateral row of pickups at s from x0 to x1 (n of them), a sweep row when wide enough
  const row = (s, x0, x1, n, kind = 'coin') => {
    const id = rowN++, r = { id, s, n, x0, x1 };
    for (let i = 0; i < n; i++) L.pickups.push({ s, x: x0 + (x1 - x0) * (n > 1 ? i / (n - 1) : 0.5), kind: i === Math.floor(n / 2) && kind === 'coin' && n >= 5 ? 'ticket' : kind, row: id });
    L.rows.push(r);
  };
  // a trail of pickups along the chute (s0 to s1, x easing from x0 to x1), one every `gap` units
  const trail = (s0, s1, x0, x1, gap = 2.2, kind = 'coin') => {
    for (let s = s0; s <= s1 + 1e-6; s += gap) { const u = (s - s0) / ((s1 - s0) || 1); L.pickups.push({ s, x: x0 + (x1 - x0) * sm(u), kind, row: -1 }); }
  };
  // two trails at once, one each side (for a pair riding spread out)
  const pairTrail = (s0, s1, x, gap = 2.4) => { trail(s0, s1, -x, -x, gap); trail(s0, s1, x, x, gap); };
  const wire = (s, x0, x1) => L.wires.push({ s, x0: x0 != null ? x0 : -9, x1: x1 != null ? x1 : 9 });
  const gap = (s0, s1, x0, x1) => L.gaps.push({ s0, s1, x0: x0 != null ? x0 : -9, x1: x1 != null ? x1 : 9 });
  const star = (s, x) => L.pickups.push({ s, x, kind: 'star', row: -1 });
  const ck = s => L.checks.push(s);
  const W = s => PR.w(s);

  // 1 THE COIN CHUTE ---------------------------------------------------------------------------------------------
  L.parts.push({ s: 0, name: 'the Coin Chute' });
  ck(0);
  trail(8, 30, 0, -2.2, 2.4);
  trail(14, 30, 0, 2.2, 2.4);
  row(A.row1 + 4, -3.8, 3.8, 7);                 // the first sweep row: spread out to take the lot
  trail(A.row1 + 12, A.bend1 + 6, -2.5, -3.5, 2.6); trail(A.row1 + 12, A.bend1 + 6, 2.5, 3.5, 2.6);
  wire(A.wire1 + 2);                             // the first wire: jump
  star(A.wire1 + 2, 0);
  trail(A.wire1 + 10, A.rowB - 4, 0, 0, 2.2);
  row(A.rowB + 2, -4.0, 4.0, 7);
  pairTrail(A.rowB + 10, A.ck1 - 6, 3.0);
  ck(A.ck1);
  // the first split: a button on the left opens the gate on the right, then a button on the right opens the left gate
  L.splits.push({ s0: A.split1a, s1: A.split1b + 2, pairs: [
    { btn: { s: A.split1a + 7, side: -1 }, gate: { s: A.split1a + 18, side: 1 } },
    { btn: { s: A.split1a + 22, side: 1 }, gate: { s: A.split1a + 33, side: -1 } }] });
  trail(A.split1a + 4, A.split1b - 2, -2.9, -2.9, 2.6); trail(A.split1a + 4, A.split1b - 2, 2.9, 2.9, 2.6);
  // the first twin springboard over a short gap
  L.springs.push({ s0: A.spring1 - 2, sh: A.hold1, s1: A.land1 - 2, x0: -3.6, x1: 3.6, big: 0 });
  row(A.land1 + 3, -3.6, 3.6, 5);
  wire(A.wire2 + 1);
  trail(A.wire2 + 6, A.brink - 1, 0, 0, 2.0);
  // the long fall: coins fall free (stars in the air)
  for (let k = 0; k < 6; k++) star(A.fall0 + 4 + k * 6, (k % 2 ? 1 : -1) * 2.0);

  // 2 THE GEAR WORKS ---------------------------------------------------------------------------------------------
  L.parts.push({ s: A.gears, name: 'the Gear Works' });
  ck(A.gears + 2);
  trail(A.gears + 6, A.gface1 - 4, -2.4, 2.4, 2.4);
  // a gear's face turning under the chute: it carries the coins to the right, then the next one to the left
  L.carry.push({ s0: A.gface1 - 2, s1: A.gface1 + 12, v: 2.4 });
  trail(A.gface1, A.gface1 + 12, -3.2, -3.2, 2.4);
  L.carry.push({ s0: A.gface1 + 16, s1: A.gface1 + 28, v: -2.6 });
  trail(A.gface1 + 16, A.gface1 + 28, 3.2, 3.2, 2.4);
  // meshing teeth: the left half and the right half close in turn (each closed 1.6 s of every 3.6, never both)
  for (let k = 0; k < 3; k++) {
    const s = A.teeth1 + 2 + k * 9, ph = k * 1.2;
    L.teeth.push({ s, len: 1.8, x0: -9, x1: -0.2, per: 3.6, on: 1.6, ph });
    L.teeth.push({ s, len: 1.8, x0: 0.2, x1: 9, per: 3.6, on: 1.6, ph: ph + 1.8 });
  }
  // the coin-return lever: a low bar swinging across (jump it, or slip past at the end of its swing)
  L.levers.push({ s: A.lever1 + 2, cx: 0, amp: 3.4, per: 2.6, ph: 0, hw: 1.0 });
  row(A.lever1 + 9, -3.8, 3.8, 7);
  ck(A.ck2);
  trail(A.ck2 + 4, A.gate1 - 6, 0, 0, 2.2);
  L.gates.push({ s: A.gate1 + 2, gx: 3.9 });            // the first arc gate: a coin at each post
  // glitch bugs: zap them with the spark between you
  L.bugs.push({ s: A.bugs1 - 8, x: 0 }); L.bugs.push({ s: A.bugs1 + 3, x: -1.2 }); L.bugs.push({ s: A.bugs1 + 14, x: 1.4 });
  trail(A.bugs1 + 18, A.spiral0 + 4, -3.0, -3.0, 2.6); trail(A.bugs1 + 18, A.spiral0 + 4, 3.0, 3.0, 2.6);
  // round the spiral: rows to sweep, a wire, the teeth again
  row(A.spiral0 + 14, -4.2, 4.2, 7);
  wire(A.spiral0 + 26);
  row(A.spiralM + 6, -4.2, 4.2, 7);
  L.levers.push({ s: A.spiralM + 22, cx: 0, amp: 3.6, per: 2.4, ph: 1.4, hw: 1.0 });
  row(A.spiral1 - 8, -4.2, 4.2, 7, 'coin');
  ck(A.ck3);
  // the second split (the button on the right first this time)
  L.splits.push({ s0: A.split2a, s1: A.split2b + 2, pairs: [
    { btn: { s: A.split2a + 6, side: 1 }, gate: { s: A.split2a + 17, side: -1 } },
    { btn: { s: A.split2a + 21, side: -1 }, gate: { s: A.split2a + 32, side: 1 } }] });
  trail(A.split2a + 3, A.split2b - 2, -2.8, -2.8, 2.6); trail(A.split2a + 3, A.split2b - 2, 2.8, 2.8, 2.6);
  // the Sweeper wakes here (stretch 2 into 3); its brush strikes start a little later
  L.levers.push({ s: A.lever2 + 1, cx: 0, amp: 3.4, per: 2.2, ph: 0.6, hw: 1.0 });
  // the squeeze: both coins tight together through the narrow slot (the spark glows bright)
  L.squeeze.push({ s0: A.squeeze1 + 6, s1: A.ck4 - 4 });
  trail(A.squeeze1 + 8, A.ck4 - 6, 0, 0, 1.6);
  ck(A.ck4);
  for (let k = 0; k < 3; k++) star(A.brink2 + 4 + k * 5, (k - 1) * 2.4);

  // 3 CIRCUIT CITY -----------------------------------------------------------------------------------------------
  L.parts.push({ s: A.city, name: 'Circuit City' });
  trail(A.city + 2, A.bus1 - 2, -2.6, 2.6, 2.4);
  // the data bus: many parallel lanes, the widest sweep rows yet
  row(A.bus1 + 10, -5.4, 5.4, 9);
  row(A.bus1 + 22, -5.6, 5.6, 9);
  L.bugs.push({ s: A.bus1 + 30, x: 0.5 });
  ck(A.ck5);
  // a chip-block split
  L.splits.push({ s0: A.split3a, s1: A.split3b + 2, pairs: [
    { btn: { s: A.split3a + 6, side: -1 }, gate: { s: A.split3a + 16, side: 1 } },
    { btn: { s: A.split3a + 20, side: 1 }, gate: { s: A.split3a + 30, side: -1 } }] });
  trail(A.split3a + 3, A.split3b - 2, -3.0, -3.0, 2.4); trail(A.split3a + 3, A.split3b - 2, 3.0, 3.0, 2.4);
  // the cooling fan's blast pushes the coins left
  L.fans.push({ s0: A.fan1 - 4, s1: A.fan1 + 14, push: -9 });
  trail(A.fan1, A.fan1 + 12, 3.4, 3.4, 2.2);
  L.gates.push({ s: A.gate2 + 1, gx: 4.0 });
  row(A.gate2 + 9, -4.2, 4.2, 7);
  ck(A.ck6);
  L.bugs.push({ s: A.bugs2 + 6, x: -0.6 }); L.bugs.push({ s: A.bugs2 + 18, x: 1.0 }); L.bugs.push({ s: A.bugs2 + 30, x: -1.4 });
  L.slick.push({ s0: A.bugs2 + 34, s1: A.split4a - 3, x0: -9, x1: 9 });
  L.splits.push({ s0: A.split4a, s1: A.split4b + 2, pairs: [
    { btn: { s: A.split4a + 6, side: 1 }, gate: { s: A.split4a + 16, side: -1 } },
    { btn: { s: A.split4a + 20, side: -1 }, gate: { s: A.split4a + 30, side: 1 } }] });
  trail(A.split4a + 3, A.split4b - 2, -3.0, -3.0, 2.4); trail(A.split4a + 3, A.split4b - 2, 3.0, 3.0, 2.4);
  // pillars: the spark snaps if one comes between you (go the same side, or squeeze past together)
  L.pillars.push({ s: A.pillars + 2, x: 0, r: 0.7 });
  L.pillars.push({ s: A.pillars + 10, x: -2.2, r: 0.7 });
  L.pillars.push({ s: A.pillars + 18, x: 2.2, r: 0.7 });
  row(A.bus2 + 10, -5.6, 5.6, 9);
  row(A.bus2 + 22, -5.6, 5.6, 9);
  ck(A.ck7);
  L.gates.push({ s: A.gate3 + 7, gx: 4.0 });
  L.fans.push({ s0: A.fan2 - 4, s1: A.fan2 + 12, push: 9 });
  trail(A.fan2, A.fan2 + 10, -3.4, -3.4, 2.2);
  // the wide springboard between the boards: the Sweeper's rail ends here
  L.springs.push({ s0: A.spring3 - 2, sh: A.hold3, s1: A.land3 - 1, x0: -3.8, x1: 3.8, big: 1 });

  // 4 THE COIN BOX -----------------------------------------------------------------------------------------------
  L.parts.push({ s: A.box, name: 'the Coin Box' });
  ck(A.box + 4);
  row(A.box + 12, -5.4, 5.4, 9, 'coin');
  // giant coins rolling down the heap across the slope (moving teeth): steer round them
  for (let k = 0; k < 3; k++) {
    const s = A.roll1 + k * 10;
    L.teeth.push({ s, len: 2.4, x0: k % 2 ? 0.6 : -6.5, x1: k % 2 ? 6.5 : -0.6, per: 4.0, on: 2.0, ph: k * 0.9, roll: 1 });
  }
  pairTrail(A.roll1 - 6, A.roll1 + 26, 3.6, 2.6);
  wire(A.ridge1 + 1); // (a ridge of coins: jump)
  row(A.ridge1 + 9, -5.6, 5.6, 9, 'coin');
  ck(A.ck8);
  row(A.rows4, -5.8, 5.8, 9);
  row(A.rows4 + 8, -5.8, 5.8, 9);
  row(A.rows4 + 16, -5.8, 5.8, 9);
  for (let k = 0; k < 3; k++) {
    const s = A.roll2 + k * 10;
    L.teeth.push({ s, len: 2.4, x0: k % 2 ? -6.5 : 0.6, x1: k % 2 ? -0.6 : 6.5, per: 4.0, on: 2.0, ph: 0.4 + k * 0.9, roll: 1 });
  }
  pairTrail(A.roll2 - 4, A.roll2 + 26, 3.4, 2.6);
  ck(A.ck9);
  wire(A.ridge2 + 8);
  row(A.rows5, -5.8, 5.8, 9);
  row(A.rows5 + 8, -5.8, 5.8, 9);
  for (let k = 0; k < 2; k++) {
    const s = A.roll3 + 4 + k * 10;
    L.teeth.push({ s, len: 2.4, x0: k % 2 ? 0.6 : -6.5, x1: k % 2 ? 6.5 : -0.6, per: 4.0, on: 2.0, ph: 0.8 + k * 0.9, roll: 1 });
  }
  pairTrail(A.roll3, A.ck10 - 6, 3.5, 2.6);
  ck(A.ck10);
  row(A.rows6, -5.8, 5.8, 9);
  row(A.rows6 + 8, -5.8, 5.8, 9);
  trail(A.rows6 + 14, A.spring4 - 4, 0, 0, 1.8, 'coin');
  // the last twin springboard: onto the START button
  L.springs.push({ s0: A.spring4 - 2, sh: A.hold4, s1: A.start, x0: -4.2, x1: 4.2, big: 2 });
  PR.start = A.start;

  // the Sweeper: wakes late in the gear works, chases through Circuit City, lost at the wide springboard
  L.sweeper = { wake: A.sweeper - 8, lost: A.hold3 };
  {
    // its brush strikes: every few seconds, across part of the chute, always leaving room for two coins
    const pat = [[-9, -0.4], [0.4, 9], [-9, 1.2], [-1.2, 9], [-9, -1.8], [1.8, 9]];
    let k = 0;
    for (let s = A.sweeper + 18; s < A.spring3 - 14; s += 26) {
      // (not inside a split, a squeeze, a springboard pad, nor on top of a gate or a pillar row)
      const busy = L.splits.some(sp => s > sp.s0 - 6 && s < sp.s1 + 4) || L.squeeze.some(q => s > q.s0 - 6 && s < q.s1 + 4)
        || L.gates.some(g => Math.abs(g.s - s) < 10) || L.pillars.some(p => Math.abs(p.s - s) < 8) || L.springs.some(p => s > p.s0 - 10 && s < p.s1 + 4)
        || L.wires.some(w => Math.abs(w.s - s) < 7) || L.levers.some(w => Math.abs(w.s - s) < 7) || L.bugs.some(b => Math.abs(b.s - s) < 6) || L.checks.some(c => s > c - 4 && PR.eta(c, s) < 2.6);
      if (busy) continue;
      const [x0, x1] = pat[k++ % pat.length];
      L.brush.push({ s, x0, x1 });
    }
  }
  // the springboards' big gaps are holes like any other
  for (const sp of L.springs) gap(sp.sh, sp.s1);
  // the long fall into the gear works and the drop onto the board are open air (no chute, nothing to hit)
  PR.air = [[A.brink, A.gears - 1]];

  // the park loudspeaker of this machine: a tinny voice in the cabinet
  for (const k of Object.keys(L)) if (Array.isArray(L[k]) && L[k].length && typeof L[k][0] === 'object' && 's' in L[k][0]) L[k].sort((a, b) => a.s - b.s);
  L.checks.sort((a, b) => a - b);
  L.pickups.forEach((p, i) => { p.i = i; });
  PR.sectionOf = s => { let k = 0; for (let i = 0; i < L.checks.length; i++) if (s >= L.checks[i] - 0.01) k = i; return k; };
  PR.partAt = s => { let k = 0; for (let i = 0; i < L.parts.length; i++) if (s >= L.parts[i].s) k = i; return k; };
  PR.inAir = s => PR.air.some(([a, b]) => s > a && s < b);
  return PR;
})();
