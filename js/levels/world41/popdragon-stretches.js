/* Pip & Bo - 41-3 Paper Dragon Flight: what stands along stretches 2 to 4 (the bookshelf, the bedroom, the window) and
   the things that move or grab. Plain JavaScript like popdragon-route.js (loaded straight after it): the rules, the
   computer brain and the bot tests read these lists with drawing switched off, and the scenery files
   (popdragon-shelf.js, popdragon-bedroom.js, popdragon-window.js) draw exactly what is listed here.

   Besides the still solids (POPDRAGON_ROUTE.solids) and the stars, hoops, signs and lines, this file fills:
     movers    [{ id, part, s0, s1, at(clock, s) -> [solid, ...] }]   things that move: tipping books (on a beat), the
               toy train, the mobile's planets, the lost marble. s0..s1 is where along the rail they can be met;
               at() gives their solids at a moment (the brain asks for moments ahead, so they depend only on the clock
               or on how far the dragon has flown, never on randomness)
     paws      [{ id, s, tel, ox: [a, b], oy: [a, b], from, bonus }]  the cat. A paw strikes when the dragon reaches s;
               it is shown winding up for tel (rail units, 1.2 s of flying) before. A dragon whose middle is inside the
               ox/oy box when it strikes Crumples, unless the tail is swishing at that moment: then the paw is batted
               ("Mrrp!") and the bonus stars just ahead light up. from: where the paw comes from (drawing)
     clingers  [{ id, s, ox, oy, kind: 'moth'|'bunny', from: [x, y, z] }]  paper moths and dust bunnies. Each flies
               from its spot to meet the dragon at (ox, oy) as it reaches s. A dragon within CLING of that spot gets it
               stuck on a wing (unless the tail is swishing): each one slows the wings by a quarter, three is a
               Crumple, and a tail swish knocks them all off. They let go by themselves after a while
     lights    [{ id, s, ox, oy, r }]  candles: confetti fire lights them (stars with need: id appear when lit)
     drift(s)  -> [dx, dy] window units per second the air pushes the dragon: the snore's updraft, the gusts outside,
               the rain soaking the wings (they sag)
     flashes   [{ s }]  a lightning flash when the dragon gets there (it shows the rooftop)
     cues      [{ s, song }]  the music changing with the stretch
   Stars may carry need: 'id' (a candle lit, a paw batted): until then they are not shown and cannot be caught.
*/
'use strict';

(function () {
  const R = POPDRAGON_ROUTE, S = R.solids, art = R.art, F = R.FLOOR, PI = Math.PI;
  R.movers = []; R.paws = []; R.clingers = []; R.lights = []; R.flashes = []; R.cues = []; R.zones = [];
  R.CLING = 2.2; R.TEL = 1.2;

  // the rail row nearest a world spot (searched in s0..s1), then the exact crossing found by toLocal around it
  const sNear = (x, y, z, s0 = 0, s1 = R.len) => {
    let best = 1e9, bs = s0;
    for (const f of R.tab) { if (f.s < s0 || f.s > s1) continue; const d = Math.hypot(f.p[0] - x, f.p[1] - y, f.p[2] - z); if (d < best) { best = d; bs = f.s; } }
    return R.toLocal(x, y, z, Math.max(0, bs - 12), Math.min(R.len, bs + 12)).s;
  };
  R.sNear = sNear;
  const star = (s, ox, oy, need) => R.stars.push(need ? { s, ox, oy, need } : { s, ox, oy });
  const line = (s0, s1, n, ox0, oy0, ox1 = ox0, oy1 = oy0, need) => { for (let i = 0; i < n; i++) { const u = n > 1 ? i / (n - 1) : 0; star(s0 + (s1 - s0) * u, ox0 + (ox1 - ox0) * u, oy0 + (oy1 - oy0) * u, need); } };
  const arc = (s0, s1, n, ox0, oy0, ox1, oy1, bow, axis) => { for (let i = 0; i < n; i++) { const u = i / (n - 1), b = Math.sin(u * PI) * bow; star(s0 + (s1 - s0) * u, ox0 + (ox1 - ox0) * u + (axis === 'x' ? b : 0), oy0 + (oy1 - oy0) * u + (axis === 'y' ? b : 0)); } };
  const say = (s, text) => R.says.push({ s, who: 'worm', text });
  const sign = (s, kind, dir, ox = 3.2, oy = 1.8) => R.signs.push({ s, kind, dir, ox, oy });
  const hoop = (s) => R.hoops.push({ s });
  const pl = R.place;

  /* ======================= STRETCH 2: THE BOOKSHELF ======================= */
  pl.shelf = sNear(96, -16, -17, 200, 400);
  R.parts.push({ s: pl.shelf, name: 'the bookshelf' });
  R.cues.push({ s: pl.shelf, song: 'popdragonShelf' });
  // deep shelves hung on the back wall: five boards (top surfaces), four corner posts, books along the back
  const CS = art.case = { x0: 104, x1: 194, z0: -44, z1: -6, tops: [-31, -3, 25, 53, 81], th: 2, post: 1.4, back: -28 };
  for (const y of CS.tops) S.push({ k: 'box', x: (CS.x0 + CS.x1) / 2, y: y - CS.th / 2, z: (CS.z0 + CS.z1) / 2, hx: (CS.x1 - CS.x0) / 2 + 1, hy: CS.th / 2, hz: (CS.z1 - CS.z0) / 2, part: 2 });
  // (deep shelves hung on the wall on iron brackets: nothing stands at the front corners)

  // --- shelf 1 (+x, rail y -18, z -17: ox = z + 17, oy = y + 18): books that tip out on a beat, then the fat volumes
  // A tipping book stands in the back row, spine out at z = back; it wobbles and creaks, tips forward about its bottom
  // front edge to `max`, holds, and drops back. One beat of the song is 60/126 s; a book's cycle is 6 beats.
  const BEAT = 60 / 126, TIP_PER = 6 * BEAT;
  R.tipAngle = (u, max) => {
    if (u < 0.22) return 0;
    if (u < 0.42) return 0.045 * Math.sin((u - 0.22) / 0.2 * PI * 5) * Math.sin((u - 0.22) / 0.2 * PI);   // the wobble (and the creak)
    if (u < 0.52) { const k = (u - 0.42) / 0.1; return max * k * k * (3 - 2 * k); }
    if (u < 0.75) return max;
    if (u < 0.88) { const k = (u - 0.75) / 0.13; return max * (1 - k * k * (3 - 2 * k)); }
    return 0;
  };
  art.tippers = [];
  const tipper = (x, h, d, th, ph, col, title) => {
    const b = { x, y: CS.tops[0], z: CS.back, h, d, th, ph, per: TIP_PER, max: 0.6, col, title };
    art.tippers.push(b);
    const s = sNear(x, -18, -17, pl.shelf, pl.shelf + 160);
    R.movers.push({ id: 'tip' + art.tippers.length, part: 2, s0: s - 6, s1: s + 6, book: b,
      at(clock) {
        const a = R.tipAngle(((clock / b.per + b.ph) % 1 + 1) % 1, b.max), c = Math.cos(a), sn = Math.sin(a);
        return [{ k: 'box', x: b.x, y: b.y + h / 2 * c + d / 2 * sn, z: b.z + h / 2 * sn - d / 2 * c, hx: th / 2, hy: h / 2, hz: d / 2, rx: a, yaw: 0 }];
      } });
    return s;
  };
  pl.tip1 = tipper(124, 20, 14, 4.4, 0.0, '#7a2f3a', 'TALES');
  pl.tip2 = tipper(139, 21, 14, 5.0, 0.34, '#2f5a7a', 'MYTHS');
  pl.tip3 = tipper(154, 20.5, 14, 4.6, 0.67, '#5a6a2a', 'SAGAS');
  // the fat volumes: one pulled half out of the back row, one stood at the front edge; a slot between them (tuck!)
  art.fat = [{ x: 176, hx: 3.4, z0: CS.z0 + 1, z1: -18.55, col: '#6a2a2a', title: 'DICTIONARY' }, { x: 176, hx: 3.4, z0: -15.45, z1: -6.6, col: '#2a3a5a', title: 'ENCYCLOPAEDIA' }];
  for (const v of art.fat) S.push({ k: 'box', x: v.x, y: (CS.tops[0] + CS.tops[1] - CS.th) / 2, z: (v.z0 + v.z1) / 2, hx: v.hx, hy: (CS.tops[1] - CS.th - CS.tops[0]) / 2, hz: (v.z1 - v.z0) / 2, part: 2 });
  pl.slot1 = sNear(176, -18, -17, pl.shelf, pl.shelf + 160);

  // --- shelf 2 (-x, rail y 8, z -17: ox = -(z + 17), oy = y - 8): paper moths out of an open atlas, the toy train coming
  // the other way along its track, and the bent paperback tunnel (tuck, and stay low)
  pl.shelf2 = sNear(184, 8, -14, pl.slot1, pl.slot1 + 140);
  art.atlas = { x: 186, y: CS.tops[1], z: -9.5 };
  const mothSpots = [[170, 1.6, 1.0], [162, -2.6, -1.4], [154, 2.8, 2.0], [147, -1.2, 2.4]];
  for (const [x, ox, oy] of mothSpots) R.clingers.push({ id: 'moth' + R.clingers.length, kind: 'moth', s: sNear(x, 8, -17, pl.shelf2 - 10, pl.shelf2 + 80), ox, oy, from: [art.atlas.x - 2, art.atlas.y + 3, art.atlas.z] });
  pl.moths = R.clingers[0].s;
  // the train: a wind-up loco and two cars on a track down the middle of the shelf. It waits in the tunnel until the
  // dragon reaches the shelf, then chugs out toward it (its place goes with how far the dragon has flown)
  art.train = { y: CS.tops[1], z: -17, x0: 116, speed: 0.55, len: [9.5, 7, 7], gap: 1.2, hz: 2.3, hBody: 6.4, hCab: 8.8, funnel: [2.4, 10.4] };
  art.trainX = (s) => Math.min(186, art.train.x0 + Math.max(0, s - pl.shelf2) * art.train.speed);
  R.movers.push({ id: 'train', part: 2, s0: pl.shelf2, s1: pl.shelf2 + 80,
    at(clock, s) {
      const T = art.train, fx = art.trainX(s), out = [];
      // the loco faces +x (its front at fx), the cars behind it
      out.push({ k: 'box', x: fx - T.len[0] / 2, y: T.y + T.hBody / 2, z: T.z, hx: T.len[0] / 2, hy: T.hBody / 2, hz: T.hz });
      out.push({ k: 'box', x: fx - T.len[0] + 2.2, y: T.y + T.hCab / 2, z: T.z, hx: 2.2, hy: T.hCab / 2, hz: T.hz });
      out.push({ k: 'cyl', x: fx - T.funnel[0], z: T.z, r: 1.0, y0: T.y + T.hBody, y1: T.y + T.funnel[1] });
      let x = fx - T.len[0] - T.gap;
      for (let i = 1; i < 3; i++) { out.push({ k: 'box', x: x - T.len[i] / 2, y: T.y + 2.9, z: T.z, hx: T.len[i] / 2, hy: 2.9, hz: T.hz }); x -= T.len[i] + T.gap; }
      return out;
    } });
  pl.train = sNear(138, 8, -17, pl.shelf2, pl.shelf2 + 80);
  // the paperback tunnel: a paperback bent into an A over the track. Its feet stand 3.8 either side of the line, its
  // ridge 16 above the shelf: only a tucked dragon fits, and only in the lower half
  art.tunnel = { x: 120, hx: 3.0, feet: 4.0, ridge: CS.tops[1] + 16.5, base: CS.tops[1], th: 3.0, z: -17, col: '#e85a4a', title: 'THE BIG PAPERBACK OF JOKES' };
  // either side of it the way is shut: a tall stack of comics behind, a tin of crayons at the front edge
  art.tunnelSides = [{ kind: 'comics', z0: CS.z0 + 1, z1: art.tunnel.z - art.tunnel.feet - 0.5 }, { kind: 'crayons', z0: art.tunnel.z + art.tunnel.feet + 0.5, z1: CS.z1 - 0.4 }];
  for (const b of art.tunnelSides) S.push({ k: 'box', x: art.tunnel.x, y: (CS.tops[1] + CS.tops[2] - CS.th) / 2, z: (b.z0 + b.z1) / 2, hx: art.tunnel.hx + 0.6, hy: (CS.tops[2] - CS.th - CS.tops[1]) / 2, hz: (b.z1 - b.z0) / 2, part: 2 });
  {
    const T = art.tunnel, hgt = T.ridge - T.base, L = Math.hypot(T.feet, hgt), lean = Math.atan2(T.feet, hgt);
    for (const side of [-1, 1]) {
      // side -1: the foot at z = z - feet (the dragon's right), +1: z + feet (its left)
      const footZ = T.z + side * T.feet, cz = (footZ + T.z) / 2 + side * T.th / 2 / Math.cos(lean), cy = (T.base + T.ridge) / 2;
      S.push({ k: 'box', x: T.x, y: cy, z: cz, hx: T.hx, hy: L / 2, hz: T.th / 2, rx: -side * lean, part: 2 });
    }
  }
  pl.tunnel = sNear(art.tunnel.x, 8, -17, pl.shelf2, pl.shelf2 + 100);

  // --- shelf 3 (+x, rail y 38, z -17: ox = z + 17, oy = y - 38): the dark shelf. A candle to light, the snow globe, the
  // ship in a bottle, a row of chess pieces to slalom
  pl.shelf3 = sNear(114, 38, -14, pl.tunnel, pl.tunnel + 120);
  art.candle = { x: 121, z: -22, y: CS.tops[2], h: 8.6, r: 1.25 };
  S.push({ k: 'cyl', x: art.candle.x, z: art.candle.z, r: 3.0, y0: art.candle.y, y1: art.candle.y + 0.9, part: 2 });
  S.push({ k: 'cyl', x: art.candle.x, z: art.candle.z, r: art.candle.r + 0.05, y0: art.candle.y, y1: art.candle.y + art.candle.h, part: 2 });
  pl.candle = sNear(art.candle.x, 38, -17, pl.shelf3 - 10, pl.shelf3 + 40);
  R.lights.push({ id: 'candle', s: pl.candle, ox: -5, oy: -2.6, r: 3.3 });
  art.globe = { x: 134, z: -20, y: CS.tops[2], r: 5.0, base: 4.2 };
  S.push({ k: 'cyl', x: art.globe.x, z: art.globe.z, r: art.globe.base, y0: art.globe.y, y1: art.globe.y + 3, part: 2 });
  S.push({ k: 'sph', x: art.globe.x, y: art.globe.y + 3 + art.globe.r - 0.4, z: art.globe.z, r: art.globe.r, part: 2 });
  pl.globe = sNear(art.globe.x, 38, -17, pl.shelf3, pl.shelf3 + 60);
  art.bottle = { x0: 140, x1: 151, z: -12.2, y: CS.tops[2] + 2.3 + 4.2, r: 4.2, neck: 5 };
  S.push({ k: 'cyl', x: (art.bottle.x0 + art.bottle.x1) / 2, z: art.bottle.z, r: 3.2, y0: CS.tops[2], y1: CS.tops[2] + 2.3, part: 2 });
  S.push({ k: 'cap', a: [art.bottle.x0, art.bottle.y, art.bottle.z], b: [art.bottle.x1, art.bottle.y, art.bottle.z], r: art.bottle.r, part: 2 });
  S.push({ k: 'cap', a: [art.bottle.x1, art.bottle.y, art.bottle.z], b: [art.bottle.x1 + art.bottle.neck, art.bottle.y, art.bottle.z], r: 1.6, part: 2 });
  pl.bottle = sNear(146, 38, -17, pl.shelf3, pl.shelf3 + 60);
  // (12 apart: the dragon is about 3 long and a piece 4.4 across, so it needs that much room to change sides)
  art.chess = [{ x: 156, z: -14.0, kind: 'knight', h: 18.5 }, { x: 168, z: -20.0, kind: 'bishop', h: 19.5 }, { x: 180, z: -14.0, kind: 'queen', h: 21 }];
  for (const c of art.chess) S.push({ k: 'cyl', x: c.x, z: c.z, r: 1.8, y0: CS.tops[2], y1: CS.tops[2] + c.h, part: 2 });
  pl.chess = sNear(168, 38, -17, pl.shelf3, pl.shelf3 + 90);
  // eyes in the dark at the back of the shelf above (they blink out when the candle is lit)
  art.shelfEyes = { x: 150, y: CS.tops[3] + 7, z: -35 };
  pl.spiral = sNear(200, 44, -10, pl.chess, pl.chess + 60);
  pl.top = sNear(156, 97, -19, pl.spiral, pl.spiral + 120);

  // --- stars, hoops, signs, lines (the bookshelf)
  line(pl.shelf - 12, pl.shelf, 2, 0, 1.2, 0, 0);                 // the dive off the desk into the bottom shelf
  for (const s of [pl.tip1, pl.tip2, pl.tip3]) star(s, 3.4, 0.6);       // the safe side of each book
  line(pl.slot1 - 2, pl.slot1 + 2, 2, 0, 0);                         // through the slot
  arc(pl.slot1 + 22, pl.shelf2 - 8, 3, 0, -1, 0, 1, 2.2, 'y');       // round the right end
  for (const c of R.clingers.filter((c, i) => i % 2)) star(c.s + 3, -c.ox * 0.5, 0);         // between the moths
  arc(pl.train - 6, pl.train + 6, 3, 0, 1.0, 0, 1.0, 2.0, 'y');        // over the train
  line(pl.tunnel - 2, pl.tunnel + 2, 2, 0, -1.2);                  // through the tunnel, low
  arc(pl.tunnel + 22, pl.shelf3 - 8, 3, 0, 0, 0, 0, 2.4, 'y');         // round the left end
  line(pl.candle + 5, pl.bottle + 6, 4, 0.4, 2.6, 0.4, 2.6, 'candle');  // shown by the candle's light
  star(pl.globe, 2.8, 0.8);
  star(pl.bottle, -2.6, 1.2);
  star(pl.chess - 12, -2.4, 1.2); star(pl.chess, 2.4, 1.2); star(pl.chess + 12, -2.4, 1.2);   // the slalom
  line(pl.spiral + 10, pl.top - 20, 3, 0, 0.5, 0, 0.5);                      // the spiral up and over
  star(pl.top + 12, 0, 0);
  hoop(pl.shelf2 + 4); hoop(pl.shelf3 + 2);
  say(pl.tip1 - 30, 'Books! Watch them wobble, then tip!');
  sign(pl.slot1 - 24, 'tuck', 'ahead', -3.2, 1.8);
  say(pl.slot1 - 26, 'Tuck your wings for the tight bits. Both of you!');
  say(pl.moths - 22, 'Paper moths! Bo, swish your tail!');
  say(pl.train - 26, 'Toot toot! Up over the train!');
  sign(pl.tunnel - 24, 'tuck', 'ahead', 3.2, 1.8);
  say(pl.tunnel - 20, 'Into the tunnel: tuck and keep low!');
  sign(pl.candle - 24, 'fire', 'ahead', 3.4, 1.8);
  say(pl.candle - 26, "It's so dark. Pip, light the candle!");
  say(pl.chess - 22, 'Chess pieces! Weave left, right, left!');
  say(pl.spiral - 4, 'The page is blowing up and over the top!');

  /* ======================= STRETCH 3: THE BEDROOM ======================= */
  pl.bedroom = sNear(116, 96, -8, pl.top, pl.top + 80);
  R.parts.push({ s: pl.bedroom, name: 'the bedroom' });
  R.cues.push({ s: pl.bedroom, song: 'popdragonHush' });
  // the bed, its head against the right-hand wall: legs, the frame, the mattress, the quilt over the sleeping Reader
  const BD = art.bed = { x0: 260, x1: 370, z0: 40, z1: 120, legTop: -18, frame: -12, top: 0 };
  BD.x = (BD.x0 + BD.x1) / 2; BD.z = (BD.z0 + BD.z1) / 2;
  S.push({ k: 'box', x: BD.x, y: (BD.legTop + BD.top) / 2, z: BD.z, hx: (BD.x1 - BD.x0) / 2, hy: (BD.top - BD.legTop) / 2, hz: (BD.z1 - BD.z0) / 2, part: 3 });
  for (const [x, z] of [[BD.x0 + 3, BD.z0 + 3], [BD.x1 - 3, BD.z0 + 3], [BD.x0 + 3, BD.z1 - 3], [BD.x1 - 3, BD.z1 - 3]]) S.push({ k: 'cyl', x, z, r: 2.4, y0: F, y1: BD.legTop, part: 3 });
  S.push({ k: 'box', x: BD.x1 - 1.5, y: 14, z: BD.z, hx: 1.5, hy: 48 / 2, hz: (BD.z1 - BD.z0) / 2, part: 3 });                    // the headboard
  S.push({ k: 'box', x: 312, y: 4.6, z: 82, hx: 34, hy: 4.6, hz: 15, part: 3 });                                                    // the sleeper under the quilt
  art.reader = { head: [356, 14.5, 76], r: 5.8 };
  S.push({ k: 'sph', x: art.reader.head[0], y: art.reader.head[1], z: art.reader.head[2], r: art.reader.r, part: 3 });
  S.push({ k: 'box', x: 359, y: 2.2, z: 80, hx: 7, hy: 2.4, hz: 18, part: 3 });                                                    // the pillow

  // --- the planet mobile: four planets on a turning cross of wire, the rail runs right under its hub
  art.mobile = { x: 197, z: 50, hub: 113, w: 0.42, planets: [
    { r: 14.2, y: 99.8, size: 3.2, ph: 0.4, col: '#e0a060', name: 'jupiter' },
    { r: 7.4, y: 101.2, size: 2.8, ph: 2.3, col: '#e8d08a', name: 'saturn', ring: 5.0 },
    { r: 9.8, y: 98.6, size: 2.5, ph: 4.0, col: '#4a8ad8', name: 'earth' },
    { r: 12.4, y: 97.2, size: 1.9, ph: 5.4, col: '#d8603a', name: 'mars' }] };
  art.planetAt = (p, clock) => { const a = p.ph + art.mobile.w * clock; return [art.mobile.x + Math.cos(a) * p.r, p.y + Math.sin(clock * 0.9 + p.ph) * 0.4, art.mobile.z + Math.sin(a) * p.r]; };
  pl.mobile = sNear(art.mobile.x, 99, art.mobile.z, pl.bedroom, pl.bedroom + 200);
  R.movers.push({ id: 'mobile', part: 3, s0: pl.mobile - 20, s1: pl.mobile + 20,
    at(clock) {
      const out = [];
      for (const p of art.mobile.planets) {
        const c = art.planetAt(p, clock);
        out.push({ k: 'sph', x: c[0], y: c[1], z: c[2], r: p.size });
        if (p.ring) out.push({ k: 'cyl', x: c[0], z: c[2], r: p.ring, y0: c[1] - 0.3, y1: c[1] + 0.3 });
      }
      return out;
    } });

  // --- the ceiling lamp on its long cord (swoop round it)
  pl.clamp = sNear(268, 72, 96, pl.mobile, pl.mobile + 120);
  {
    const fr = R.at(pl.clamp), c = R.local(pl.clamp, -5.0, 0.4, fr);
    const roofY = z => 202 - 0.7172 * (z + 44);
    art.clamp = { x: c[0], y: c[1], z: c[2], top: roofY(c[2]) };
    S.push({ k: 'cyl', x: c[0], z: c[2], r: 5.4, y0: c[1] - 4, y1: c[1] - 0.5, part: 3 });
    S.push({ k: 'cyl', x: c[0], z: c[2], r: 3.4, y0: c[1] - 0.5, y1: c[1] + 4, part: 3 });
    S.push({ k: 'cap', a: [c[0], c[1] + 4, c[2]], b: [c[0], art.clamp.top, c[2]], r: 0.4, part: 3 });
  }

  // --- the Reader's snore: an updraft over the pillow that lifts the dragon to a high line of stars
  pl.snore = sNear(352, 17, 94, pl.clamp, pl.clamp + 200);
  // --- the cat at the foot of the bed: four swipes along the quilt, then it jumps down and pounces from the rug
  art.cat = { bed: [272, BD.top, 61], rug: [238, F, 134] };
  pl.catHoop = sNear(316, 15, 80, pl.snore, pl.snore + 80);
  const paw = (x, y, z, ox, oy, from) => { const s = sNear(x, y, z, pl.catHoop, pl.catHoop + 200); R.paws.push({ id: 'paw' + (R.paws.length + 1), s, tel: R.TEL * R.at(s).v, ox, oy, from }); return s; };
  pl.sw1 = paw(293, 17, 80, [0.4, 6.2], [-3.6, 3.6], 'right');
  pl.sw2 = paw(282, 19.5, 82, [-6.2, 6.2], [-3.6, -0.2], 'below');
  pl.sw3 = paw(271.5, 21, 84, [-1.4, 6.2], [0.6, 3.6], 'right');
  pl.sw4 = paw(259, 19, 88.5, [-2.2, 6.2], [-3.6, 3.6], 'right');
  pl.pounce = sNear(238, -20, 130, pl.sw4, pl.sw4 + 80);
  R.paws.push({ id: 'pounce', s: pl.pounce, tel: R.TEL * R.at(pl.pounce).v, ox: [-6.2, 6.2], oy: [-3.6, 1.2], from: 'pounce' });
  art.rug = { x: 236, z: 138, r: 28 };

  // --- under the bed (going -z: ox = x - 311, oy = y + 26): dark; dust bunnies, two narrow slots and the lost marble
  pl.bedHoop = sNear(294, -26, 150, pl.pounce, pl.pounce + 120);
  pl.under = sNear(311, -26, BD.z1, pl.bedHoop, pl.bedHoop + 60);
  const ux = (ox) => 311 + ox;
  art.under = { slot1: [{ x0: ux(-15), x1: ux(-1.55), z: 103, hz: 3.4, kind: 'shoebox' }, { x0: ux(1.55), x1: ux(15), z: 103.5, hz: 1.0, kind: 'slat' }],
    slot2: [{ x0: ux(-14), x1: ux(-1.55), z: 65, hz: 4.2, kind: 'games' }, { x0: ux(1.55), x1: ux(13), z: 65, hz: 4.0, kind: 'slipper' }] };
  for (const b of [...art.under.slot1, ...art.under.slot2]) S.push({ k: 'box', x: (b.x0 + b.x1) / 2, y: (F + BD.legTop) / 2, z: b.z, hx: (b.x1 - b.x0) / 2, hy: (BD.legTop - F) / 2, hz: b.hz, part: 3 });
  pl.slot2 = sNear(311, -26, 103, pl.under, pl.under + 40);
  pl.slot3 = sNear(311, -26, 65, pl.under, pl.under + 80);
  art.marble = { z: 86, r: 3.4, amp: 8.4, w: 1.25 };
  art.marbleX = (clock) => 311 + Math.sin(clock * art.marble.w + 0.6) * art.marble.amp;
  pl.marble = sNear(311, -26, art.marble.z, pl.under, pl.under + 60);
  R.movers.push({ id: 'marble', part: 3, s0: pl.marble - 5, s1: pl.marble + 5, at(clock) { return [{ k: 'sph', x: art.marbleX(clock), y: F + art.marble.r, z: art.marble.z, r: art.marble.r }]; } });
  for (const [z, ox, oy] of [[112, 2.2, 0.6], [95, -2.2, -1.2], [89, 1.8, 1.8], [75, -2.6, 1.0], [56, 2.2, -1.4]]) R.clingers.push({ id: 'bunny' + R.clingers.length, kind: 'bunny', s: sNear(311, -26, z, pl.under - 4, pl.under + 90), ox, oy, from: [ux(ox * 2.6), F + 1.5, z - 6] });
  pl.underEnd = sNear(312, -24, 30, pl.under, pl.under + 120);

  // --- stars, hoops, signs, lines (the bedroom)
  line(pl.bedroom + 40, pl.mobile - 40, 2, 0, 0, 0, 0.8);
  line(pl.mobile - 9, pl.mobile + 9, 3, 0, -2.2, 0, -2.2);           // under the mobile, low
  sign(pl.clamp - 30, 'swoop', 'right', -3.2, 1.8);
  arc(pl.clamp - 10, pl.clamp + 8, 4, 2, 0.4, 2, 0.4, 3.2, 'x');            // round the lamp, out to the right
  line(pl.clamp + 40, pl.snore - 30, 2, 0, -0.6);
  line(pl.snore + 3, pl.snore + 21, 5, 0, 3.0);                        // the snore's high arc
  for (const pw of R.paws) line(pw.s + 6, pw.s + 12, 2, 0, 0, 0, 0, pw.id);   // bonus: a paw batted with the tail
  line(pl.pounce + 3, pl.pounce + 8, 2, 0, 2.8);                       // up over the pounce
  arc(pl.pounce + 20, pl.bedHoop - 6, 3, -1.5, -0.5, 1.5, -0.5, 1.0, 'y');   // the floor loop
  star(pl.slot2, 0, 0);
  line(pl.marble - 2, pl.marble + 2, 2, 0, 2.2);
  star(pl.slot3, 0, 0);
  hoop(pl.bedroom + 30); hoop(pl.catHoop); hoop(pl.bedHoop);
  say(pl.mobile - 30, 'The planet mobile! Slip between them!');
  say(pl.snore - 50, "Shh! Don't wake the Reader. And whatever you do, don't wake the...");
  say(pl.sw1 - 26, '...cat. Oh no. Dodge the paws! Bo, bat it with the tail!');
  sign(pl.pounce - 30, 'swoop', 'up', 3.2, 2.2);
  say(pl.pounce - 34, "Up! Up! It's going to pounce!");
  say(pl.under - 10, 'Under the bed. Dust bunnies! Swish them off!');
  sign(pl.slot2 - 22, 'tuck', 'ahead', 3.2, 1.8);
  sign(pl.slot3 - 22, 'tuck', 'ahead', -3.2, 1.8);

  /* ======================= STRETCH 4: THE WINDOW ======================= */
  pl.window = sNear(318, -16, 6, pl.underEnd - 10, pl.underEnd + 60);
  R.parts.push({ s: pl.window, name: 'the window' });
  R.cues.push({ s: pl.window, song: 'popdragonStorm' });
  // the round window: two casement halves, the right one stuck on its latch a crack open (a slot for a tucked dragon)
  const WN = art.win = { x: 300, y: 30, z: -44, r: 24, gap: 1.55 };
  for (const sd of [-1, 1]) S.push({ k: 'box', x: WN.x + sd * (WN.gap + (WN.r + 1 - WN.gap) / 2), y: WN.y, z: WN.z, hx: (WN.r + 1 - WN.gap) / 2, hy: WN.r, hz: 0.6, part: 4 });
  pl.climb = sNear(334, -8, -6, pl.window, pl.window + 60);
  pl.gap = sNear(300, 32, -44, pl.climb, pl.climb + 200);
  pl.gap2 = sNear(300, 31, -44, pl.gap + 40, pl.gap + 400);
  art.latch = [WN.x - WN.gap - 0.8, WN.y - 1, WN.z + 0.9];   // on the closed left half, by the crack
  // the curtain to the right of the window (the rod above, the cords hanging), two tissue-paper sheers across the climb
  art.curtain = { x0: 326, x1: 354, z: -39, rod: 60 };
  pl.tis1 = sNear(343, 6, -31, pl.climb, pl.climb + 60);
  pl.tis2 = sNear(339, 25, -10, pl.tis1, pl.tis1 + 80);
  R.webs.push({ s: pl.tis1, r: 7.6, oy: 0.2, burn: 'tissue1', kind: 'tissue', col: '#f4a6b8' }, { s: pl.tis2, r: 7.6, oy: -0.2, burn: 'tissue2', kind: 'tissue', col: '#a6d8f0' });
  art.cords = [];
  for (const [x, y, z, ox] of [[329, 14, -27, 2.6], [346, 29, -14, -2.6], [347, 35, -27, 2.4]]) {
    const s = sNear(x, y, z, pl.climb, pl.gap), c = R.local(s, ox, 0);
    art.cords.push({ s, ox, x: c[0], z: c[2], y0: c[1] - 26, y1: art.curtain.rod });
    S.push({ k: 'cap', a: [c[0], c[1] - 26, c[2]], b: [c[0], art.curtain.rod, c[2]], r: 0.5, part: 4 });
    S.push({ k: 'sph', x: c[0], y: c[1] - 27.4, z: c[2], r: 1.6, part: 4 });
  }
  // the cat climbs the curtain behind the dragon and swipes once more, from below
  pl.sw5 = sNear(338, 40, -32, pl.tis2, pl.gap);
  R.paws.push({ id: 'paw5', s: pl.sw5, tel: R.TEL * R.at(pl.sw5).v, ox: [-6.2, 6.2], oy: [-3.6, 0.3], from: 'curtain' });
  pl.winHoop = sNear(322, 40, -31, pl.sw5, pl.gap);

  // --- outside: the rooftop in the rain. A turret with the weather vane, a chimney, gusts, the rain making the wings sag
  pl.vane = sNear(334, 36, -96, pl.gap, pl.gap2);
  {
    const fr = R.at(pl.vane), c = R.local(pl.vane, -3.4, 0, fr);
    art.vane = { x: c[0], z: c[2], y0: -2, y1: 47, arms: 41.2, armLen: 5.6, turret: [c[0], -40, c[2]], roofTop: 24 };
    S.push({ k: 'cap', a: [c[0], 14, c[2]], b: [c[0], 47, c[2]], r: 0.6, part: 4 });
    S.push({ k: 'cap', a: [c[0] - 5.6, 41.2, c[2]], b: [c[0] + 5.6, 41.2, c[2]], r: 0.35, part: 4 });
    S.push({ k: 'cap', a: [c[0], 41.2, c[2] - 5.6], b: [c[0], 41.2, c[2] + 5.6], r: 0.35, part: 4 });
    S.push({ k: 'cyl', x: c[0], z: c[2], r: 10, y0: -40, y1: 12, part: 4 });       // the turret
    S.push({ k: 'cyl', x: c[0], z: c[2], r: 4.6, y0: 12, y1: art.vane.roofTop, part: 4 });   // its pointed roof (the top half)
  }
  pl.chim = sNear(266, 33, -98, pl.vane, pl.gap2);
  {
    const fr = R.at(pl.chim), c = R.local(pl.chim, 9.6, 0, fr);
    art.chimney = { x: c[0], z: c[2], y0: -46, y1: 41, h: 4.6, yaw: fr.yaw };
    S.push({ k: 'box', x: c[0], y: (art.chimney.y0 + art.chimney.y1) / 2, z: c[2], hx: 4.6, hy: (art.chimney.y1 - art.chimney.y0) / 2, hz: 4.6, yaw: fr.yaw, part: 4 });
  }
  pl.outHoop1 = sNear(302, 38, -130, pl.vane, pl.gap2);
  pl.outHoop2 = sNear(280, 31, -74, pl.chim, pl.gap2);
  R.flashes.push({ s: sNear(314, 32, -76, pl.gap, pl.vane) });
  const gusts = [{ s: sNear(316, 32, -78, pl.gap, pl.vane), w: 14, dx: 3.4 }, { s: sNear(300, 38, -130, pl.vane, pl.chim), w: 14, dx: -3.6 }, { s: sNear(274, 32, -84, pl.chim, pl.gap2), w: 12, dx: 3.2 }];
  R.gusts = gusts;
  const snore = { s: pl.snore - 1, w: 12, dy: 7.5 };
  R.snore = snore;
  R.rain = { s0: pl.gap + 3, s1: pl.gap2 - 3, dy: -1.25 };
  R.drift = (s) => {
    let dx = 0, dy = 0;
    if (s > snore.s && s < snore.s + snore.w) dy += snore.dy * Math.sin((s - snore.s) / snore.w * PI);
    if (s > R.rain.s0 && s < R.rain.s1) {
      dy += R.rain.dy;
      for (const g of gusts) { const d = (s - g.s) / g.w; if (Math.abs(d) < 1) dx += g.dx * 0.5 * (1 + Math.cos(d * PI)); }
    }
    return [dx, dy];
  };
  R.gustAt = (s) => { for (const g of gusts) if (Math.abs(s - g.s) < g.w) return g; return null; };

  // --- stars, hoops, signs, lines (the window)
  star(pl.climb - 6, 0, 0.6);
  hoop(pl.climb);
  sign(pl.tis1 - 22, 'fire', 'ahead', -3.4, 1.8);
  line(pl.tis1 + 2, pl.tis1 + 6, 2, 0, 0.2);
  for (const cd of art.cords) star(cd.s, -Math.sign(cd.ox) * 2.6, 0.6);           // the weave: beside each cord
  line(pl.tis2 + 2, pl.tis2 + 6, 2, 0, -0.2);
  star(pl.sw5 + 4, 0, 2.6);
  hoop(pl.winHoop);
  star(pl.gap - 1, 0, 0);                             // through the gap
  line(pl.gap + 8, pl.vane - 20, 3, 0, 1.6, 0, 2.2);                     // out into the rain (fly up against the sag)
  sign(pl.vane - 30, 'swoop', 'right', -3.4, 1.8);
  arc(pl.vane - 9, pl.vane + 9, 4, 2.2, 0, 2.2, 0, 2.6, 'x');             // round the weather vane
  line(pl.outHoop1 + 4, pl.chim - 16, 2, 0, 1.4);
  arc(pl.chim - 10, pl.chim + 8, 3, -1.6, 1, -1.6, 1, -2.4, 'x');         // round the chimney, left of it
  star(pl.outHoop2 + 6, 0, 1.2);
  star(pl.gap2 - 1, 0, 0);
  hoop(pl.outHoop1); hoop(pl.outHoop2);
  say(pl.climb + 2, "It's stuck on the latch! Up the curtain, quick!");
  say(pl.tis1 - 26, 'Tissue curtains! Pip, burn through!');
  say(pl.tis1 + 10, 'Weave round the curtain cords!');
  say(pl.sw5 - 24, "The cat's climbing after us! Fly up!");
  sign(pl.gap - 22, 'tuck', 'ahead', 3.2, 1.8);
  say(pl.gap - 24, 'Through the gap! Tuck!');
  say(pl.gap + 8, "Brr! The rain's soaking our wings. Bo, keep us up!");
  say(pl.vane - 34, 'The weather vane! Swoop right round it!');
  say(pl.chim - 30, 'Hold on, the wind!');
  sign(pl.gap2 - 22, 'tuck', 'ahead', -3.2, 1.8);
  say(pl.gap2 - 26, 'Back inside! Tuck again!');
  // the dive home across the room
  pl.dive = sNear(286, 28, -4, pl.gap2, pl.gap2 + 60);
  R.cues.push({ s: pl.dive, song: 'popdragon' });
  line(pl.dive + 10, R.len - 50, 6, 0, 0.4, 0, -0.4);
  say(pl.dive + 2, 'There it goes! Dive for the desk!');

  // the tuck slots: tucked in together near one, the dragon is drawn gently into its middle (a kind help for steering)
  R.slots = [{ s: pl.slot1, ox: 0 }, { s: pl.tunnel, ox: 0, oy: -1.0 }, { s: pl.slot2, ox: 0 }, { s: pl.slot3, ox: 0 }, { s: pl.gap, ox: 0 }, { s: pl.gap2, ox: 0 }];

  // the scenery groups are drawn only when the dragon is near them (the speed-up pass); the rules never read these
  R.zones = [
    { name: 'desk', s0: -1, s1: pl.shelf + 120 },
    { name: 'shelf', s0: R.place.edge - 30, s1: pl.bedroom + 140 },
    { name: 'bed', s0: pl.top - 10, s1: pl.dive + 140 },
    { name: 'window', s0: pl.underEnd - 120, s1: pl.dive + 60 },
    { name: 'outside', s0: pl.climb - 30, s1: pl.gap2 + 40 },
  ];

  R.hoops.sort((a, b) => a.s - b.s);
  R.signs.sort((a, b) => a.s - b.s);
  R.says.sort((a, b) => a.s - b.s);
  R.stars.sort((a, b) => a.s - b.s);
  R.paws.sort((a, b) => a.s - b.s);
  R.clingers.sort((a, b) => a.s - b.s);
  R.webs.sort((a, b) => a.s - b.s);
  R._idx = null;
})();
