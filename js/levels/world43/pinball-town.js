/* Pip & Bo - 43-2 Pinball Panic: Bumper Town, part 2 of the table (PINBALL_TOWN). Scenery only. Loaded on demand with the
   3D kit after pinball-life.js; PINBALL_LIFE.build calls PINBALL_TOWN.build(K, SC, kit, H) before the creatures are
   finished, and builds each bumper that has a town name into its building with H.towns[name] (registered here).
   PINBALL_LIFE.update calls PINBALL_TOWN.update(K, SC, st, dt, ballPositions, L) every drawn frame.

   BUMPER TOWN (d 89 to 184). The pop bumpers are the town's round buildings: their ground floor is the bumper (the part
   a ball hits), the storeys above stay inside the bumper's radius until they are higher than a ball, then overhang.
     the diners        (both lanes, first) a chrome diner storey full of creatures at the counter, a giant coffee cup on
                       the roof with steam, a DINER neon, a ring of neon round the roof that flashes when it kicks
     the cinemas       a marquee with chase bulbs and the film's name, posters behind glass, gold deco storeys. The left
                       one is THE TALLEST BUMPER: a stepped deco tower with the rotating neon crown on top (the part's
                       landmark, seen from the Flipper Field). The right one has two searchlights sweeping the glass sky
     the barber's      a balcony with a customer in the chair, the barber snipping, a spinning striped pole, a giant comb
     the bank          columns, a frieze, a gold dome with a big coin turning on top, a guard on the ledge
     the bakery        a giant cupcake for a roof (frosting, sprinkles, a cherry that flashes), a chimney puffing
   On the shoulders: the high street (shopfronts along both walls, windows lit and full of creatures, awnings, blade
   signs, festoons of bulbs from the lamp posts to the cornices), lamp posts with lanterns, bunting and balloons, the
   lost-property office (things that fell through the glass, a clerk stamping tags, a queue), the brass band on the
   speaker grille, a newsstand, a tea room's tables, a crowd walking the pavements.
   Little stories (part 2):
     1. the diner's cook flipping a pancake on the roof: when the bumper kicks, it flies high and lands on their head
     2. the barber's customer: every kick is a big snip, hair falls, the tuft grows back
     3. the cinema's sign changer sitting on the marquee, swapping the film's name
     4. the bank's guard: a kick pops coins out of the dome; they scramble to catch them
     5. the baker's tray: a kick flips the top tart into the air; caught every time (nearly)
     6. lamp-post huggers: in a TILT they grab the lamp posts and swing out sideways
     7. the lost-property office: the clerk stamps tags; three creatures stagger along under a giant paper clip
     8. the brass band on the speaker grille: the conductor, the tuba, the drum; a fanfare when a gate opens
     9. the newsstand's board: its headline changes with what just happened (a gate, a TILT, loose balls)
    10. the window cleaner on a cradle going up and down a shopfront
    11. the crossing guard on the divider with a STOP sign, shaking a fist after the loose silver balls
    12. washing on a line between two shops, flapping, swinging wildly in a TILT */
'use strict';

const PINBALL_TOWN = (function () {
  const T = K3D.T, TB = PINBALL_TABLE, A = ARCADE;
  const W = {};
  let kit = null, H = null;
  const D0 = 89, D1 = 184;

  /* ---------- painted textures ---------- */
  const PX = 48; // canvas pixels per world unit on the shopfronts
  const SHOPS = [
    ['HATS', '#2a6a8a', 'hats'], ['SPRINGS & COILS', '#7a4a2a', 'springs'], ['BULBS 12V', '#3a3a5a', 'bulbs'], ['TEA ROOM', '#6a2a4a', 'tea'],
    ['TOY REPAIR', '#2a5a3a', 'toys'], ['POLISH & SHINE', '#5a3a6a', 'polish'], ['RUBBER RINGS', '#8a2a2a', 'rings'], ['PIXEL PRINTS', '#2a4a7a', 'prints'],
    ['SWEETS', '#a04a6a', 'sweets'], ['CLOCKS', '#4a3a2a', 'clocks'], ['MAPS OF THE TABLE', '#3a5a5a', 'maps'], ['FLOWERS', '#3a6a2a', 'flowers'],
    ['BOOKS', '#5a2a2a', 'books'], ['LAUNDRY', '#2a5a8a', 'laundry'], ['GLASS & MIRRORS', '#4a4a6a', 'glass'], ['TICKETS', '#8a5a1a', 'tickets'],
  ];
  const WALLS = ['#c8a882', '#b88a6a', '#9ab0a0', '#c8b8d8', '#d8c098', '#a8b8c8', '#c89090', '#b8c890'];
  function frontTex(key, w, hTot, plinth, floors, name, col, wall, brick) {
    return K3D.paint('tw-front|' + key, Math.round(w * PX), Math.round(hTot * PX), (c, cw, ch) => {
      const y = v => ch - v * PX; // v: height above the box bottom (world units)
      c.fillStyle = wall; c.fillRect(0, 0, cw, ch);
      if (brick) { for (let r = 0, yy = 0; yy < ch; r++, yy += 9) for (let x = (r % 2) * -11; x < cw; x += 22) { c.fillStyle = `rgba(${90 + A.rnd() * 40},${40 + A.rnd() * 20},${30 + A.rnd() * 14},0.55)`; c.fillRect(x + 1, yy + 1, 20, 7); } }
      else for (let i = 0; i < cw * ch / 60; i++) { c.fillStyle = `rgba(${A.rnd() < 0.5 ? '255,255,255' : '0,0,0'},${A.rnd() * 0.06})`; c.fillRect(A.rnd() * cw, A.rnd() * ch, 2 + A.rnd() * 4, 2 + A.rnd() * 3); }
      // the plinth (dark stone; the pavement climbs along it)
      c.fillStyle = '#3a3036'; c.fillRect(0, y(plinth), cw, plinth * PX); c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(0, y(plinth), cw, 2);
      // the shopfront: frame, the window (a lit plane goes over it), the door, the fascia with the name
      const g0 = plinth, gh = 1.5;
      c.fillStyle = col; c.fillRect(4, y(g0 + gh), cw - 8, gh * PX);
      c.fillStyle = '#120e14'; c.fillRect(0.12 * PX, y(g0 + 1.05), cw - 0.24 * PX - 0.7 * PX, 0.95 * PX);
      c.fillStyle = '#2a1a14'; c.fillRect(cw - 0.7 * PX, y(g0 + 1.08), 0.5 * PX, 1.08 * PX);
      c.fillStyle = '#ffd890'; c.fillRect(cw - 0.66 * PX, y(g0 + 1.04), 0.42 * PX, 0.24 * PX); // the fanlight
      c.fillStyle = '#d8a838'; c.beginPath(); c.arc(cw - 0.3 * PX, y(g0 + 0.5), 2.5, 0, 7); c.fill();
      c.fillStyle = '#1a1418'; c.fillRect(4, y(g0 + gh), cw - 8, 0.36 * PX);
      c.fillStyle = '#f2e6c8'; c.font = `900 ${Math.round(0.24 * PX)}px "DejaVu Sans", sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(name, cw / 2, y(g0 + gh - 0.18), cw - 14);
      // the upper floors: window recesses (lit planes go over them), sills, lintels, grime under the sills
      for (let f = 0; f < floors.length; f++) for (const wx of floors[f]) {
        const fy = g0 + gh + 0.25 + f * 1.0;
        c.fillStyle = '#120e14'; c.fillRect((wx - 0.22) * PX, y(fy + 0.6), 0.44 * PX, 0.6 * PX);
        c.fillStyle = '#e8dcc0'; c.fillRect((wx - 0.28) * PX, y(fy), 0.56 * PX, 0.06 * PX); c.fillRect((wx - 0.26) * PX, y(fy + 0.66), 0.52 * PX, 0.07 * PX);
        const gr = c.createLinearGradient(0, y(fy), 0, y(fy) + 0.5 * PX); gr.addColorStop(0, 'rgba(30,20,20,0.25)'); gr.addColorStop(1, 'rgba(30,20,20,0)'); c.fillStyle = gr; c.fillRect((wx - 0.2) * PX, y(fy), 0.4 * PX, 0.5 * PX);
      }
      // the cornice and a drainpipe
      c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(0, 0, cw, 0.22 * PX); c.fillStyle = 'rgba(255,255,255,0.18)'; for (let x = 3; x < cw; x += 8) c.fillRect(x, 0.22 * PX, 4, 4);
      c.fillStyle = '#6a6a72'; c.fillRect(cw - 5, 0, 3, ch - plinth * PX);
    });
  }
  // a shop's window: a lit interior with its goods on shelves
  function shopTex(kind, w) {
    return K3D.paint('tw-shop|' + kind + '|' + Math.round(w * 10), Math.round(w * 64), 64, (c, cw, ch) => {
      const g = c.createLinearGradient(0, 0, 0, ch); g.addColorStop(0, '#ffe8b8'); g.addColorStop(1, '#d89a5a'); c.fillStyle = g; c.fillRect(0, 0, cw, ch);
      c.fillStyle = 'rgba(90,50,30,0.6)'; c.fillRect(0, 22, cw, 3); c.fillRect(0, 46, cw, 3);
      const pal = ['#e8302a', '#2a8ae8', '#ffd24a', '#3ac86a', '#e84ab0', '#ff8a4a', '#9a8aff'];
      for (let x = 6; x < cw - 6; x += 12 + A.rnd() * 6) for (const sy of [20, 44]) {
        c.fillStyle = A.pick(pal); c.strokeStyle = c.fillStyle; c.lineWidth = 2;
        if (kind === 'hats') { c.fillRect(x - 6, sy - 2, 12, 2); c.fillRect(x - 3, sy - 9, 6, 7); }
        else if (kind === 'springs') { c.beginPath(); for (let k = 0; k < 6; k++) c.lineTo(x + (k % 2 ? 4 : -4), sy - k * 2.2); c.stroke(); }
        else if (kind === 'bulbs' || kind === 'glass') { c.fillStyle = '#fff6d0'; c.beginPath(); c.arc(x, sy - 7, 4, 0, 7); c.fill(); c.fillStyle = '#8a8a90'; c.fillRect(x - 2, sy - 3, 4, 3); }
        else if (kind === 'tea') { c.fillRect(x - 4, sy - 6, 8, 6); c.beginPath(); c.arc(x + 5, sy - 3, 2.5, 0, 7); c.stroke(); }
        else if (kind === 'clocks') { c.fillStyle = '#f8f0dc'; c.beginPath(); c.arc(x, sy - 7, 5, 0, 7); c.fill(); c.strokeStyle = '#222'; c.lineWidth = 1; c.beginPath(); c.moveTo(x, sy - 7); c.lineTo(x, sy - 11); c.moveTo(x, sy - 7); c.lineTo(x + 3, sy - 7); c.stroke(); }
        else if (kind === 'flowers') { c.fillStyle = '#3ac86a'; c.fillRect(x - 1, sy - 8, 2, 8); c.fillStyle = A.pick(pal); c.beginPath(); c.arc(x, sy - 10, 3.5, 0, 7); c.fill(); }
        else if (kind === 'books') { for (let k = 0; k < 3; k++) { c.fillStyle = A.pick(pal); c.fillRect(x - 5 + k * 3.5, sy - 10, 3, 10); } }
        else if (kind === 'rings') { c.lineWidth = 2.5; c.beginPath(); c.arc(x, sy - 6, 4.5, 0, 7); c.stroke(); }
        else { c.fillRect(x - 4, sy - 8, 8, 8); c.fillStyle = 'rgba(255,255,255,0.5)'; c.fillRect(x - 3, sy - 7, 3, 3); }
      }
      // a creature behind the counter, reflections on the glass
      c.fillStyle = A.pick(A.NEON); c.fillRect(cw * 0.62, 30, 12, 12); c.fillStyle = '#fff'; c.fillRect(cw * 0.62 + 2, 33, 3, 3); c.fillRect(cw * 0.62 + 7, 33, 3, 3);
      c.fillStyle = 'rgba(255,255,255,0.22)'; c.beginPath(); c.moveTo(cw * 0.1, 0); c.lineTo(cw * 0.22, 0); c.lineTo(cw * 0.05, ch); c.lineTo(0, ch); c.fill();
    });
  }
  // the gable ends you see between the shops: the same wall, a little window, a painted advert on some
  const ADS = [['SPIN SODA', '#e8302a', '#f2e6c8'], ['FIZZ POP', '#2a6ae8', '#ffd24a'], ['TILT-PROOF\nGLUE', '#3a8a3a', '#f2e6c8'], ['BRIGHT BULBS', '#ffd24a', '#3a1a4a'], ['ZIP SPRINGS', '#c0182a', '#ffffff']];
  function sideTex(wall, brick, n) {
    return K3D.paint('tw-side|' + n, 128, 192, (c, w, h) => {
      c.fillStyle = wall; c.fillRect(0, 0, w, h);
      if (brick) { for (let r = 0, yy = 0; yy < h; r++, yy += 9) for (let x = (r % 2) * -11; x < w; x += 22) { c.fillStyle = `rgba(${90 + A.rnd() * 40},${40 + A.rnd() * 20},${30 + A.rnd() * 14},0.55)`; c.fillRect(x + 1, yy + 1, 20, 7); } }
      else for (let i = 0; i < 300; i++) { c.fillStyle = `rgba(0,0,0,${A.rnd() * 0.07})`; c.fillRect(A.rnd() * w, A.rnd() * h, 3, 2); }
      c.fillStyle = '#3a3036'; c.fillRect(0, h - 22, w, 22);
      if (n % 2) { const [t, bg, fg] = ADS[n % ADS.length]; c.globalAlpha = 0.85; c.fillStyle = bg; c.fillRect(10, 40, w - 20, 70); c.fillStyle = fg; c.font = '900 20px "DejaVu Sans", sans-serif'; c.textAlign = 'center'; t.split('\n').forEach((ln, i, a) => c.fillText(ln, w / 2, 80 + (i - (a.length - 1) / 2) * 22, w - 26)); c.globalAlpha = 1; for (let i = 0; i < 40; i++) { c.fillStyle = 'rgba(255,255,255,0.15)'; c.fillRect(10 + A.rnd() * (w - 20), 40 + A.rnd() * 70, 3, 2); } }
      else { c.fillStyle = '#ffd890'; c.fillRect(w / 2 - 12, 50, 24, 30); c.fillStyle = '#2a1a1a'; c.fillRect(w / 2 - 1, 50, 2, 30); c.fillStyle = '#e8dcc0'; c.fillRect(w / 2 - 15, 80, 30, 4); }
      c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(0, 0, w, 10);
    });
  }
  const windowTex = () => K3D.paint('tw-window', 32, 48, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#fff0c8'); g.addColorStop(1, '#e8a860'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(120,40,60,0.75)'; c.fillRect(0, 0, 7, h); c.fillRect(w - 7, 0, 7, h); c.fillRect(0, 0, w, 5); // curtains
    c.fillStyle = '#2a1a1a'; c.fillRect(w / 2 - 1, 0, 2, h); c.fillRect(0, h * 0.45, w, 2);
  });
  // a ring of lit windows round a round building (repeats round it)
  function ringTex(kind) {
    return K3D.paint('tw-ring|' + kind, 512, 64, (c, w, h) => {
      const warm = kind === 'barber' ? ['#f8fbff', '#c8e8ff'] : kind === 'bakery' ? ['#fff0f4', '#ffc8d8'] : kind === 'cinema' ? ['#2a1030', '#5a1a40'] : ['#fff2c8', '#ffc870'];
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, warm[0]); g.addColorStop(1, warm[1]); c.fillStyle = g; c.fillRect(0, 0, w, h);
      if (kind === 'cinema') {
        // posters behind glass: original films of the table town
        const films = [['COMET 2', '#ffd24a', '#c0182a'], ['THE BIG\nDRAIN', '#4ae8ff', '#1a2a6a'], ['FLIPPER\nFRIENDS', '#ff5ad6', '#2a1a4a'], ['TILT!', '#ffffff', '#e8302a'], ['NIGHT OF\nTHE GLASS', '#9a8aff', '#101028'], ['STAR\nROLL', '#ffd24a', '#2a6a3a']];
        films.forEach(([t, fg, bg], i) => { const x = 6 + i * 84; c.fillStyle = '#d8a838'; c.fillRect(x, 4, 72, 56); c.fillStyle = bg; c.fillRect(x + 4, 8, 64, 48); c.fillStyle = fg; c.font = '900 13px "DejaVu Sans", sans-serif'; c.textAlign = 'center'; t.split('\n').forEach((ln, k, a) => c.fillText(ln, x + 36, 34 + (k - (a.length - 1) / 2) * 14)); c.beginPath(); c.arc(x + 54, 16, 5, 0, 7); c.fill(); });
        return;
      }
      for (let x = 0; x < w; x += 64) {
        if (kind === 'diner') { // the counter, stools, creatures eating, a pie stand
          c.fillStyle = '#c0182a'; c.fillRect(x, 44, 64, 6); c.fillStyle = '#d8d4e0'; c.fillRect(x, 50, 64, 3);
          for (const sx of [12, 36, 54]) { c.fillStyle = A.pick(A.NEON); c.fillRect(x + sx - 6, 28, 12, 14); c.fillStyle = '#fff'; c.fillRect(x + sx - 4, 31, 3, 4); c.fillRect(x + sx + 1, 31, 3, 4); c.fillStyle = '#1a1018'; c.fillRect(x + sx - 3, 33, 2, 2); c.fillRect(x + sx + 2, 33, 2, 2); }
          c.fillStyle = '#f2e6c8'; c.beginPath(); c.arc(x + 24, 43, 5, Math.PI, 0); c.fill();
        } else if (kind === 'barber') { // mirrors, a chair, the striped wall
          for (let k = 0; k < 64; k += 8) { c.fillStyle = k % 16 ? 'rgba(200,30,40,0.25)' : 'rgba(40,60,200,0.18)'; c.fillRect(x + k, 0, 4, 20); }
          c.fillStyle = '#bfe0ff'; c.fillRect(x + 14, 14, 36, 22); c.fillStyle = '#c0182a'; c.fillRect(x + 20, 40, 24, 12); c.fillRect(x + 22, 30, 20, 8);
        } else if (kind === 'bakery') { // cakes on stands
          for (const sx of [14, 44]) { c.fillStyle = '#d8d4e0'; c.fillRect(x + sx - 1, 40, 2, 12); c.fillRect(x + sx - 9, 50, 18, 2); c.fillStyle = A.pick(['#ff7ab8', '#ffd24a', '#f2e6c8', '#9a5a3a']); c.fillRect(x + sx - 9, 26, 18, 14); c.fillStyle = '#fff'; c.fillRect(x + sx - 9, 26, 18, 3); c.fillStyle = '#e8302a'; c.beginPath(); c.arc(x + sx, 24, 3, 0, 7); c.fill(); }
        } else { // the bank: brass lamps, a counter
          c.fillStyle = '#5a3a2a'; c.fillRect(x, 42, 64, 12); c.fillStyle = '#ffd24a'; c.beginPath(); c.arc(x + 32, 22, 6, 0, 7); c.fill(); c.fillStyle = A.pick(A.NEON); c.fillRect(x + 8, 28, 10, 12);
        }
        c.fillStyle = '#2a1a1a'; c.fillRect(x, 0, 3, h); // mullions
      }
    }, { repeat: true });
  }
  const textTex = (key, text, fg, bg, o = {}) => K3D.paint('tw-txt|' + key, o.w || 256, o.h || 64, (c, w, h) => {
    c.fillStyle = bg; c.fillRect(0, 0, w, h);
    if (o.bulbs) { for (let x = 8; x < w; x += 16) for (const yy of [6, h - 6]) { c.fillStyle = '#fff4d0'; c.beginPath(); c.arc(x, yy, 3, 0, 7); c.fill(); } }
    c.fillStyle = fg; c.font = `900 ${Math.round(h * (o.k || 0.5))}px "DejaVu Sans", sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
    const lines = text.split('\n'); lines.forEach((ln, i) => c.fillText(ln, w / 2, h / 2 + (i - (lines.length - 1) / 2) * h * (o.k || 0.5) * 1.1, w - 10));
  }, o.repeat ? { repeat: true } : {});
  const beamTex = () => K3D.paint('tw-beam', 8, 128, (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.7, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,1)'); c.fillStyle = g; c.fillRect(0, 0, w, h); });
  const poleTex = () => K3D.paint('tw-pole', 64, 64, (c, w, h) => { c.fillStyle = '#f2e6c8'; c.fillRect(0, 0, w, h); c.lineWidth = 9; for (let k = -2; k < 4; k++) { c.strokeStyle = k % 2 ? '#c0182a' : '#1a4ac0'; c.beginPath(); c.moveTo(k * 32 - 20, h + 10); c.lineTo(k * 32 + 44, -10); c.stroke(); } }, { repeat: true });
  const grilleTex = () => K3D.paint('tw-grille', 256, 256, (c, w, h) => { c.fillStyle = '#16121a'; c.fillRect(0, 0, w, h); for (let y = 4; y < h; y += 9) for (let x = (y / 9) % 2 ? 8 : 4; x < w; x += 9) { const r = Math.hypot(x - w / 2, y - h / 2); if (r > w / 2 - 4) continue; c.fillStyle = `rgba(${150 + A.rnd() * 40},${140 + A.rnd() * 30},${150},0.7)`; c.beginPath(); c.arc(x, y, 2.2, 0, 7); c.fill(); } c.strokeStyle = 'rgba(0,0,0,0.6)'; c.lineWidth = 3; for (const r of [40, 80]) { c.beginPath(); c.arc(w / 2, h / 2, r, 0, 7); c.stroke(); } });

  /* ---------- helpers ---------- */
  const add = (par, geo, mat, x, y, z, o = {}) => { const m = o.ink === false || !o.ink ? new T.Mesh(geo, mat) : K3D.mesh(geo, mat, { ink: o.ink, inkW: o.inkW || 0.4 }); if (o.ink === undefined) { /* no outline */ } m.position.set(x, y, z); if (o.ry) m.rotation.y = o.ry; if (o.rx) m.rotation.x = o.rx; if (o.rz) m.rotation.z = o.rz; par.add(m); return m; };
  const cyl = (r0, r1, h, n = 24, open = false) => new T.CylinderGeometry(r0, r1, h, n, 1, open);
  const box = (w, h, d) => new T.BoxGeometry(w, h, d);
  // a ring of bulbs round a building (world positions from the bumper's spot)
  const ringBulbs = (q, r, y, n, cols, k = 2, o = {}) => { const out = []; for (let j = 0; j < n; j++) { const a = j / n * Math.PI * 2; out.push(kit.lamps.bulb.add(q.x + Math.sin(a) * r, q.y + y, q.z + Math.cos(a) * r, o.size || 0.06, cols[j % cols.length], k, { mode: o.mode != null ? o.mode : 1, sp: o.sp || 1.2, ph: j / n })); } return out; };
  const puffs = (par, n, col = '#ffffff', op = 0.3) => { const list = []; for (let k = 0; k < n; k++) { const m = new T.Mesh(K3D.geo('tw-puff', () => new T.SphereGeometry(0.12, 10, 8)), new T.MeshBasicMaterial({ color: col, transparent: true, opacity: op, depthWrite: false })); par.add(m); list.push({ m, ph: k / n }); } return list; };

  /* ====================================================================================================
     The bumper buildings (H.towns)
     ==================================================================================================== */
  function storey(bg, r, y0, h, mat, ink) { return add(bg, cyl(r, r, h, 28), mat, 0, y0 + h / 2, 0, { ink }); }
  function windowBand(bg, r, y0, h, kind, k = 1.15) { const tex = ringTex(kind); tex.repeat.set(kind === 'cinema' ? 1 : 2, 1); return add(bg, cyl(r, r, h, 28, true), H.lit(tex, k), 0, y0 + h / 2, 0); }
  function begin(B, col, ground) {
    B.tall = true; B.col = col; if (ground) B.body.material.color.set(ground);
    const bg = new T.Group(); B.g.add(bg); // still parts: merged after the build (K3D.bake)
    const live = new T.Group(); live.userData.live = true; B.g.add(live);
    return { bg, live, q: B.q, INK: kit.INK };
  }
  const finish = (b) => K3D.bake(b.bg);

  const towns = {
    diner(K, B, p) {
      const b = begin(B, '#ff5ad6', '#e84ab0'), { bg, live, q, INK } = b;
      storey(bg, 0.88, 1.04, 0.78, A.toonM('#d8d4e0'), INK);
      windowBand(bg, 0.885, 1.18, 0.42, 'diner', 1.25);
      add(bg, cyl(0.9, 0.9, 0.05, 28), kit.chrome, 0, 1.15, 0); add(bg, cyl(0.9, 0.9, 0.06, 28), A.toonM('#c0182a'), 0, 1.66, 0);
      add(bg, cyl(1.16, 1.12, 0.1, 32), A.toonM('#c0182a'), 0, 1.88, 0, { ink: INK });
      add(bg, cyl(1.17, 1.17, 0.04, 32, true), kit.chrome, 0, 1.94, 0);
      const ring = add(live, new T.TorusGeometry(1.1, 0.05, 6, 40).rotateX(Math.PI / 2), B.capMat, 0, 1.97, 0);
      B.cap.visible = false;
      // the coffee cup on the roof, its saucer, and steam
      add(bg, cyl(0.5, 0.46, 0.05, 24), A.toonM('#f8f4ea'), 0.1, 1.96, -0.15, { ink: INK });
      add(bg, cyl(0.34, 0.26, 0.44, 24, true), A.toonM('#f8f4ea', { side: T.DoubleSide }), 0.1, 2.2, -0.15, { ink: INK });
      add(bg, cyl(0.31, 0.31, 0.02, 20), A.toonM('#4a2a1a'), 0.1, 2.36, -0.15);
      add(bg, new T.TorusGeometry(0.12, 0.035, 6, 14), A.toonM('#f8f4ea'), 0.45, 2.22, -0.15, { ink: INK });
      add(bg, cyl(0.345, 0.345, 0.06, 24, true), A.toonM('#c0182a'), 0.1, 2.3, -0.15);
      const steam = puffs(live, 4);
      // the DINER neon on poles, facing down the table
      const neon = A.neon(K, 'DINER', { w: 1.5, h: 0.46, col: '#ff5ad6', col2: '#4ae8ff' }); neon.position.set(-0.35, 2.75, 0.2); live.add(neon);
      for (const sx of [-0.95, 0.25]) add(bg, cyl(0.025, 0.025, 0.7, 6), kit.chrome, sx, 2.25, 0.18);
      ringBulbs(q, 1.16, 1.94, 18, ['#ff5ad6', '#fff4d8'], 2, { mode: 1, sp: 1.4 });
      kit.glows.add(q.x, q.y + 1.4, q.z, 2.0, '#ffd8a0', 0.08, 0.05);
      // creatures on the roof terrace: a cook (story 1, the left diner) or a regular with a paper (the right one)
      if (p.x < 0) {
        const cook = H.guy('#7affd8', { s: 0.85 }); cook.position.set(-0.55, 1.93, 0.55); live.add(cook);
        const chefHat = new T.Group(); const hb = new T.Mesh(cyl(0.1, 0.1, 0.12, 10), A.toonM('#ffffff')); hb.position.y = 0.06; chefHat.add(hb); const hp = new T.Mesh(new T.SphereGeometry(0.13, 10, 8), A.toonM('#ffffff')); hp.position.y = 0.17; chefHat.add(hp); chefHat.position.y = 0.45; cook.userData.body.add(chefHat);
        const pan = new T.Group(); const pp = new T.Mesh(cyl(0.15, 0.13, 0.04, 14), A.toonM('#2a2a32')); pan.add(pp); const hd = new T.Mesh(box(0.04, 0.03, 0.22), A.toonM('#4a2a1a')); hd.position.set(0, 0, -0.17); pan.add(hd); pan.position.set(0, -0.2, 0.18); cook.userData.armR.add(pan);
        const cake = new T.Mesh(cyl(0.12, 0.12, 0.03, 14), A.toonM('#e8b050')); live.add(cake);
        W.cook = { B, cook, pan, cake, t: 0, big: 0, onHead: 0, lastCool: 0 };
      } else {
        H.crit.add(q.x + 0.45, q.y + 1.93, q.z - 0.5, { kind: 1, act: 'sit', yaw: 0, s: 0.9 });
        H.crit.add(q.x - 0.5, q.y + 1.93, q.z + 0.35, { kind: 5, act: 'wave', yaw: 0, s: 0.85 });
      }
      // a creature leaning out of the diner's door at street level would be squashed: they wave from the roof edge
      H.crit.add(q.x + 0.75, q.y + 1.93, q.z + 0.6, { act: 'wave', yaw: 0.4, s: 0.7 });
      W.diners = (W.diners || []).concat([{ B, ring, steam, live }]);
      finish(b);
    },
    cinema(K, B, p) {
      const tall = p.x < 0, b = begin(B, tall ? '#ff5ad6' : '#ffd24a', '#8a1a2a'), { bg, live, q, INK } = b;
      storey(bg, 0.88, 1.04, 0.78, A.toonM('#5a1020'), INK);
      windowBand(bg, 0.885, 1.14, 0.56, 'cinema', 1.05);
      // the marquee (over a ball's head, facing down the table): chase bulbs round the film's name
      add(bg, box(2.1, 0.5, 0.56), A.toonM('#d8a838'), 0, 2.07, 0.6, { ink: INK });
      add(bg, box(2.2, 0.06, 0.66), kit.chrome, 0, 2.35, 0.62);
      const films = tall ? ['COMET 2', 'COMET 2'] : ['FLIPPER FRIENDS', 'THE BIG DRAIN', 'STAR ROLL'];
      const mats = films.map(f => H.lit(textTex('mq' + f, f, '#1a1018', '#fff4d8', { bulbs: false, k: 0.46 }), 1.25));
      const face = add(live, new T.PlaneGeometry(1.86, 0.32), mats[0], 0, 2.07, 0.885);
      for (const [a0, a1] of [[[-1.04, 1.83], [1.04, 1.83]], [[-1.04, 2.31], [1.04, 2.31]]]) kit.lamps.bulb.line(kit.V(q.x + a0[0], q.y + a0[1], q.z + 0.9), kit.V(q.x + a1[0], q.y + a1[1], q.z + 0.9), 0.14, 0.045, ['#fff4d8', '#ffd24a'], 2.2, { mode: 1, sp: 2.2, step: 0.12 });
      // the gold deco storey above, with lit slits
      storey(bg, 0.8, 1.82, 1.0, A.toonM('#e8b030'), INK);
      const slit = K3D.paint('tw-slit', 128, 32, (c, w, h) => { c.fillStyle = '#5a1020'; c.fillRect(0, 0, w, h); for (let x = 4; x < w; x += 16) { c.fillStyle = '#ffe8b0'; c.fillRect(x, 3, 5, h - 6); } }, { repeat: true });
      slit.repeat.set(3, 1); add(bg, cyl(0.805, 0.805, 0.6, 28, true), H.lit(slit, 1.1), 0, 2.4, 0);
      add(bg, cyl(0.88, 0.88, 0.08, 28), A.toonM('#5a1020'), 0, 2.86, 0, { ink: INK });
      if (tall) {
        // THE TALLEST BUMPER: a stepped deco tower with the rotating neon crown (Bumper Town's landmark)
        B.cap.visible = false;
        add(bg, cyl(0.58, 0.64, 0.8, 24), A.toonM('#e8b030'), 0, 3.3, 0, { ink: INK });
        add(live, new T.TorusGeometry(0.62, 0.04, 6, 32).rotateX(Math.PI / 2), B.capMat, 0, 3.72, 0);
        add(bg, cyl(0.38, 0.44, 0.9, 20), A.toonM('#5a1020'), 0, 4.15, 0, { ink: INK });
        const slit2 = K3D.paint('tw-slit2', 64, 64, (c, w, h) => { c.fillStyle = '#5a1020'; c.fillRect(0, 0, w, h); for (let x = 6; x < w; x += 16) { c.fillStyle = '#ff9adf'; c.fillRect(x, 4, 4, h - 8); } }, { repeat: true });
        slit2.repeat.set(4, 1); add(bg, cyl(0.395, 0.425, 0.7, 20, true), H.lit(slit2, 1.3), 0, 4.15, 0);
        for (let k = 0; k < 4; k++) { const a = k / 4 * Math.PI * 2 + Math.PI / 4; add(bg, box(0.08, 1.5, 0.3), A.toonM('#e8b030'), Math.sin(a) * 0.52, 3.85, Math.cos(a) * 0.52, { ink: INK, ry: a }); }
        add(live, new T.TorusGeometry(0.44, 0.035, 6, 28).rotateX(Math.PI / 2), B.capMat, 0, 4.62, 0);
        add(bg, cyl(0.2, 0.28, 0.45, 16), A.toonM('#e8b030'), 0, 4.85, 0, { ink: INK });
        // the crown: a gold band, points tipped with neon bulbs, a jewel that flashes when the bumper kicks
        const crown = new T.Group(); crown.position.y = 5.25; live.add(crown);
        add(crown, new T.TorusGeometry(0.62, 0.07, 8, 36).rotateX(Math.PI / 2), A.toonM('#ffd24a', { emissive: '#6a4a08', emissiveIntensity: 0.6 }), 0, 0, 0, { ink: INK });
        add(crown, new T.TorusGeometry(0.66, 0.025, 6, 36).rotateX(Math.PI / 2), A.flatM('#ff5ad6', 2.2), 0, 0.1, 0);
        add(crown, new T.TorusGeometry(0.66, 0.025, 6, 36).rotateX(Math.PI / 2), A.flatM('#4ae8ff', 2.2), 0, -0.09, 0);
        for (let k = 0; k < 7; k++) {
          const a = k / 7 * Math.PI * 2, pt = add(crown, new T.ConeGeometry(0.1, 0.5, 8), A.toonM('#ffd24a'), Math.sin(a) * 0.62, 0.3, Math.cos(a) * 0.62, { ink: INK });
          pt.rotation.z = -Math.sin(a) * 0.25; pt.rotation.x = Math.cos(a) * 0.25;
          add(crown, new T.SphereGeometry(0.085, 10, 8), A.flatM(k % 2 ? '#ff5ad6' : '#4ae8ff', 2.6), Math.sin(a) * 0.7, 0.6, Math.cos(a) * 0.7);
        }
        add(crown, new T.SphereGeometry(0.22, 16, 12), B.capMat, 0, 0.18, 0);
        add(crown, new T.ConeGeometry(0.08, 0.3, 8), A.toonM('#ffd24a'), 0, 0.5, 0);
        // a pennant on a pole above it all
        add(bg, cyl(0.02, 0.02, 1.0, 6), kit.chrome, 0, 5.85, 0);
        const pen = add(live, new T.ConeGeometry(0.14, 0.5, 3).rotateZ(-Math.PI / 2), A.flatM('#ffd24a', 1.3), 0.25, 6.25, 0);
        const gi = kit.glows.add(q.x, q.y + 5.3, q.z, 2.6, '#ff9adf', 0.22, 0.1);
        W.crown = { crown, pen, gi, q, B };
        // story 4: a creature riding round on the crown, polishing it
        const pol = H.guy('#9a8aff', { s: 0.6 }); pol.position.set(0, 0.05, 0.62); pol.rotation.y = 0; crown.add(pol);
        const rag = new T.Mesh(box(0.12, 0.1, 0.04), A.toonM('#ffd24a')); rag.position.set(0, -0.2, 0.06); pol.userData.armR.add(rag);
        W.polisher = pol;
      } else {
        B.cap.position.y = 2.9; B.cap.scale.set(0.85, 0.55, 0.85);
        // two searchlights on the roof sweeping the glass sky
        const beams = [];
        for (const sx of [-0.45, 0.45]) {
          const yoke = new T.Group(); yoke.position.set(sx, 2.95, -0.1); live.add(yoke);
          add(yoke, cyl(0.12, 0.16, 0.3, 14), A.toonM('#3a3a44'), 0, 0.15, 0, { ink: INK });
          const head = new T.Group(); head.position.y = 0.3; yoke.add(head);
          add(head, cyl(0.12, 0.09, 0.26, 14), kit.chrome, 0, 0.1, 0);
          add(head, new T.CircleGeometry(0.11, 14).rotateX(-Math.PI / 2), A.flatM('#ffffff', 3), 0, 0.235, 0);
          const beam = add(head, cyl(0.75, 0.1, 8, 20, true).translate(0, 4.1, 0), new T.MeshBasicMaterial({ map: beamTex(), color: A.hot('#d8ecff', 0.1), transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide, toneMapped: false }), 0, 0, 0);
          beam.renderOrder = 5;
          beams.push({ yoke, head, ph: sx > 0 ? 0 : 2.2 });
        }
        W.beams = beams;
        // story 3: the sign changer sitting on the marquee with a spare letter
        const chg = H.guy('#ffd24a', { s: 0.7 }); chg.position.set(0.65, 2.38, 0.6); live.add(chg);
        const tile = new T.Mesh(box(0.16, 0.2, 0.03), A.flatM('#fff4d8', 1.4)); tile.position.set(0, -0.2, 0.1); chg.userData.armR.add(tile);
        W.marquee = { face, mats, chg, n: 0, t: 0 };
      }
      kit.glows.add(q.x, q.y + 2.1, q.z + 0.9, 2.6, '#ffe0a0', 0.22, 0.05);
      ringBulbs(q, 0.9, 2.9, 16, ['#ffd24a', '#ff5ad6'], 2, { mode: 1, sp: 0.9 });
      H.crit.add(q.x - 0.6, q.y + 2.9, q.z - 0.3, { act: 'cheer', yaw: 0, s: 0.7 });
      finish(b);
    },
    barber(K, B, p) {
      const b = begin(B, '#e8302a', '#f2e6c8'), { bg, live, q, INK } = b;
      storey(bg, 0.88, 1.04, 0.78, A.toonM('#f2e6c8'), INK);
      windowBand(bg, 0.885, 1.16, 0.44, 'barber', 1.2);
      // the balcony over a ball's head, the front half, with its railing
      add(bg, new T.CylinderGeometry(1.25, 1.25, 0.08, 28, 1, false, -Math.PI / 2, Math.PI), A.toonM('#3a3a44'), 0, 1.86, 0, { ink: INK });
      add(bg, new T.TorusGeometry(1.2, 0.025, 6, 28, Math.PI).rotateX(Math.PI / 2).rotateY(Math.PI), kit.chrome, 0, 2.18, 0);
      for (let k = 0; k <= 6; k++) { const a = -Math.PI / 2 + k / 6 * Math.PI; add(bg, cyl(0.018, 0.018, 0.3, 5), kit.chrome, Math.sin(a) * 1.2, 2.04, Math.cos(a) * 1.2); }
      storey(bg, 0.78, 1.84, 0.72, A.toonM('#c0182a'), INK);
      const sg = H.sign('BARBER', 1.1, 0.34, { fg: '#c0182a', k: 0.6 }); sg.position.set(0, 2.38, 0.79); bg.add(sg);
      B.cap.position.y = 2.56; B.cap.scale.set(0.82, 0.6, 0.82);
      // a giant comb stuck in the dome like a crest
      const comb = new T.Group(); comb.position.set(0, 2.9, -0.1); comb.rotation.z = 0.35; bg.add(comb);
      add(comb, box(0.9, 0.16, 0.06), A.toonM('#1a1a22'), 0, 0.12, 0, { ink: INK });
      for (let k = 0; k < 12; k++) add(comb, box(0.03, 0.22, 0.05), A.toonM('#1a1a22'), -0.41 + k * 0.075, -0.06, 0);
      // the spinning striped pole at the balcony's corner
      const pole = add(live, cyl(0.075, 0.075, 0.7, 16), A.toonM('#ffffff', { map: poleTex() }), -0.95, 2.26, 0.5);
      for (const yy of [1.9, 2.62]) add(bg, new T.SphereGeometry(0.09, 10, 8), kit.chrome, -0.95, yy, 0.5);
      // story 2: the customer in the chair facing down the table; the barber snipping behind them
      add(bg, box(0.34, 0.08, 0.3), A.toonM('#c0182a'), 0.05, 2.02, 0.82, { ink: INK });
      add(bg, box(0.34, 0.34, 0.06), A.toonM('#c0182a'), 0.05, 2.2, 0.66, { ink: INK });
      add(bg, cyl(0.04, 0.08, 0.12, 8), kit.chrome, 0.05, 1.94, 0.82);
      const cust = H.guy('#4ae8ff', { s: 0.72 }); cust.position.set(0.05, 1.96, 0.84); live.add(cust);
      const cape = new T.Mesh(new T.ConeGeometry(0.22, 0.28, 10, 1, true), A.toonM('#f8f4ea', { side: T.DoubleSide })); cape.position.set(0, 0.2, 0); cust.userData.body.add(cape);
      const tuft = new T.Group(); tuft.position.set(0, 0.27, 0); cust.userData.body.add(tuft);
      for (let k = 0; k < 7; k++) { const c = new T.Mesh(box(0.07, 0.12, 0.07), A.toonM('#ff8a4a')); c.position.set((k % 3 - 1) * 0.07, 0.06, (Math.floor(k / 3) - 1) * 0.06); tuft.add(c); }
      const bar = H.guy('#f2e6c8', { s: 0.8 }); bar.position.set(0.5, 1.9, 0.58); bar.rotation.y = -0.9; live.add(bar);
      const sc = new T.Group(); for (const r of [-0.4, 0.4]) { const bl = new T.Mesh(box(0.02, 0.16, 0.01), kit.chrome); bl.rotation.z = r; sc.add(bl); } sc.position.set(0, -0.22, 0.05); bar.userData.armR.add(sc);
      const hair = []; for (let k = 0; k < 8; k++) { const c = new T.Mesh(box(0.05, 0.05, 0.05), A.toonM('#ff8a4a')); c.visible = false; live.add(c); hair.push({ c, t: 9, vx: 0, vy: 0, vz: 0 }); }
      W.barber = { B, cust, tuft, bar, sc, hair, grow: 1, lastCool: 0, pole };
      ringBulbs(q, 0.82, 2.56, 14, ['#e8302a', '#f2e6c8', '#2a6ae8'], 2, { mode: 1, sp: 1.6 });
      kit.glows.add(q.x, q.y + 1.4, q.z, 2.6, '#d8ecff', 0.12, 0.05);
      finish(b);
    },
    bank(K, B, p) {
      const b = begin(B, '#e8b030', '#d8ccb0'), { bg, live, q, INK } = b;
      add(bg, cyl(0.84, 0.84, 0.08, 28), A.toonM('#efe6d2'), 0, 1.08, 0, { ink: INK });
      storey(bg, 0.64, 1.1, 0.7, A.toonM('#3a3040'), INK);
      windowBand(bg, 0.645, 1.2, 0.42, 'bank', 1.15);
      for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; add(bg, cyl(0.05, 0.06, 0.7, 10), A.toonM('#efe6d2'), Math.sin(a) * 0.76, 1.47, Math.cos(a) * 0.76, { ink: INK, inkW: 0.3 }); }
      const fr = textTex('bank', 'TOWN BANK  ★  SAFE AS SPRINGS  ★  ', '#5a3a1a', '#efe6d2', { w: 512, h: 48, k: 0.6, repeat: true }); fr.repeat.set(1, 1);
      add(bg, cyl(0.9, 0.9, 0.24, 32), K3D.toon('#ffffff', { map: fr }), 0, 1.92, 0, { ink: INK });
      add(bg, cyl(0.96, 0.92, 0.06, 32), A.toonM('#efe6d2'), 0, 2.06, 0, { ink: INK });
      B.cap.position.y = 2.08; B.cap.scale.set(0.82, 0.82, 0.82);
      add(bg, box(0.3, 0.06, 0.06), A.toonM('#1a1418'), 0, 2.72, 0);
      const coin = new T.Group(); coin.position.y = 3.05; live.add(coin);
      add(coin, cyl(0.3, 0.3, 0.06, 28).rotateX(Math.PI / 2), A.toonM('#ffd24a', { emissive: '#5a3a08', emissiveIntensity: 0.5 }), 0, 0, 0, { ink: INK });
      const star = H.sign('★', 0.32, 0.32, { bg: '#ffd24a', fg: '#c08a10', k: 0.9 }); star.position.z = 0.032; coin.add(star);
      add(bg, cyl(0.015, 0.015, 0.2, 5), kit.chrome, 0, 2.78, 0);
      // story 4: the guard on the ledge and the coins a kick pops out of the dome
      const guard = H.guy('#2a6ae8', { s: 0.8 }); guard.position.set(0.55, 2.09, 0.55); guard.rotation.y = 0.6; live.add(guard);
      const cap = H.hat('#1a2a5a', 0.75); cap.position.y = 0.45; guard.userData.body.add(cap);
      const coins = []; for (let k = 0; k < 3; k++) { const c = new T.Mesh(cyl(0.09, 0.09, 0.02, 14).rotateX(Math.PI / 2), A.toonM('#ffd24a', { emissive: '#5a3a08', emissiveIntensity: 0.6 })); c.visible = false; live.add(c); coins.push(c); }
      W.bank = { B, coin, guard, coins, t: 9, lastCool: 0 };
      ringBulbs(q, 0.95, 2.1, 16, ['#ffd24a', '#fff4d8'], 2, { mode: 1, sp: 1.0 });
      kit.glows.add(q.x, q.y + 3.0, q.z, 2.2, '#ffd24a', 0.25, 0.05);
      finish(b);
    },
    bakery(K, B, p) {
      const b = begin(B, '#ff7ab8', '#ff9ac8'), { bg, live, q, INK } = b;
      storey(bg, 0.8, 1.04, 0.78, A.toonM('#ffe0ec'), INK);
      windowBand(bg, 0.805, 1.16, 0.44, 'bakery', 1.2);
      add(bg, new T.CylinderGeometry(0.8, 1.06, 0.26, 28, 1, true), K3D.toon('#ffffff', { map: H.stripes('#fff4f8', '#ff7ab8', 'bak'), side: T.DoubleSide }), 0, 1.95, 0, { ink: INK });
      add(bg, cyl(0.96, 0.96, 0.04, 28), A.toonM('#fff4f8'), 0, 2.08, 0);
      const ribs = K3D.paint('tw-case', 128, 32, (c, w, h) => { for (let x = 0; x < w; x += 8) { c.fillStyle = (x / 8) % 2 ? '#ff9ac8' : '#ffe0ec'; c.fillRect(x, 0, 8, h); } c.fillStyle = 'rgba(0,0,0,0.15)'; c.fillRect(0, h - 4, w, 4); }, { repeat: true });
      ribs.repeat.set(3, 1);
      add(bg, cyl(0.7, 0.6, 0.46, 32), K3D.toon('#ffffff', { map: ribs }), 0, 2.33, 0, { ink: INK });
      const cream = A.toonM('#fff2e0');
      add(bg, new T.TorusGeometry(0.52, 0.21, 10, 28).rotateX(Math.PI / 2), cream, 0, 2.66, 0, { ink: INK });
      add(bg, new T.TorusGeometry(0.36, 0.17, 10, 24).rotateX(Math.PI / 2), A.toonM('#ffc8e0'), 0, 2.9, 0, { ink: INK });
      add(bg, new T.TorusGeometry(0.2, 0.13, 10, 20).rotateX(Math.PI / 2), cream, 0, 3.1, 0, { ink: INK });
      add(bg, new T.ConeGeometry(0.14, 0.26, 12), cream, 0, 3.27, 0, { ink: INK });
      const spr = new T.InstancedMesh(K3D.geo('tw-spr', () => new T.BoxGeometry(0.05, 0.018, 0.018)), new T.MeshBasicMaterial({ toneMapped: false }), 40);
      { const m4 = new T.Matrix4(), e = new T.Euler(), qq = new T.Quaternion(), c = new T.Color(); for (let k = 0; k < 40; k++) { const tier = k % 3, R0 = [0.52, 0.36, 0.2][tier], rr = [0.21, 0.17, 0.13][tier], yy = [2.66, 2.9, 3.1][tier], a = A.rnd() * 6.28, up = 0.3 + A.rnd() * 0.9; e.set(A.rnd() * 3, A.rnd() * 3, A.rnd() * 3); qq.setFromEuler(e); m4.compose(new T.Vector3(Math.sin(a) * (R0 + rr * Math.cos(up)), yy + rr * Math.sin(up), Math.cos(a) * (R0 + rr * Math.cos(up))), qq, new T.Vector3(1, 1, 1)); spr.setMatrixAt(k, m4); spr.setColorAt(k, c.set(A.pick(['#ff3a5a', '#3ac8ff', '#ffd24a', '#5aff8a', '#ffffff'])).multiplyScalar(1.2)); } }
      live.add(spr);
      B.cap.visible = false;
      add(live, new T.SphereGeometry(0.15, 14, 10), B.capMat, 0, 3.47, 0);
      add(bg, new T.TorusGeometry(0.12, 0.012, 4, 10, Math.PI * 0.6), A.toonM('#3a8a2a'), 0.06, 3.6, 0);
      // the chimney puffing
      add(bg, cyl(0.08, 0.09, 0.46, 10), A.toonM('#8a5a4a'), -0.62, 2.3, -0.32, { ink: INK });
      const smoke = puffs(live, 5, '#f0ecf8', 0.16);
      // story 5: the baker on the ledge with a tray of tarts; a kick flips the top one
      const baker = H.guy('#ffd24a', { s: 0.8 }); baker.position.set(0.62, 2.1, 0.42); baker.rotation.y = 0.5; live.add(baker);
      const ch = new T.Group(); const c1 = new T.Mesh(cyl(0.1, 0.1, 0.16, 10), A.toonM('#ffffff')); c1.position.y = 0.08; ch.add(c1); const c2 = new T.Mesh(new T.SphereGeometry(0.14, 10, 8), A.toonM('#ffffff')); c2.position.y = 0.2; ch.add(c2); ch.position.y = 0.45; baker.userData.body.add(ch);
      const tray = new T.Mesh(box(0.36, 0.02, 0.22), kit.chrome); tray.position.set(0, 0.36, 0.2); baker.userData.body.add(tray);
      for (let k = 0; k < 3; k++) { const tt = new T.Mesh(cyl(0.05, 0.04, 0.04, 10), A.toonM(['#ff5a7a', '#ffd24a', '#7a3a2a'][k])); tt.position.set(-0.11 + k * 0.11, 0.03, 0); tray.add(tt); }
      const tart = new T.Mesh(cyl(0.05, 0.04, 0.04, 10), A.toonM('#ff5a7a')); live.add(tart);
      baker.userData.armL.rotation.x = baker.userData.armR.rotation.x = -1.2;
      W.baker = { B, baker, tray, tart, t: 9, lastCool: 0 };
      W.smoke = { list: smoke, x: -0.62, y: 2.55, z: -0.32 };
      ringBulbs(q, 1.06, 1.84, 16, ['#ff7ab8', '#fff4d8'], 2, { mode: 1, sp: 1.1 });
      kit.glows.add(q.x, q.y + 2.8, q.z, 2.6, '#ffc8e0', 0.14, 0.05);
      finish(b);
    },
  };

  /* ====================================================================================================
     Build: the high street, lamp posts, bunting, the lost-property office, the band, the newsstand, stories
     ==================================================================================================== */
  function build(K, SC, k, h) {
    kit = k; H = h;
    Object.assign(H.towns, towns);
    const { V, lamps, glows, chrome, INK, WALL, RAIL, SH, yb } = kit, still = H.still, crit = H.crit, S = H.S, SL = TB.T.SLOPE;
    A.seed(4322);
    /* ---------- the high street: shopfronts along both walls ---------- */
    const winList = [];
    const gaps = { '-1': [[144, 156]], '1': [[111.5, 124.5], [94, 99.5]] };
    let shopN = 0;
    for (const s of [-1, 1]) {
      let d = D0 + 1.2 + (s > 0 ? 1.6 : 0);
      while (d < D1 - 2) {
        const w = 4.4 + A.rnd() * 2.2;
        if (gaps[s].some(([a, b]) => d + w > a && d < b)) { const g = gaps[s].find(([a, b]) => d + w > a && d < b); d = g[1] + 0.2; continue; }
        if (d + w > D1 - 0.5) break;
        const [name, col, kind] = SHOPS[shopN++ % SHOPS.length], wall = A.pick(WALLS), brick = A.rnd() < 0.4;
        const dm = d + w / 2, nFl = 1 + Math.floor(A.rnd() * 3), hh = 1.5 + 0.35 + nFl * 1.0 + 0.35;
        const plinth = w * SL / 2 + 0.2, yLo = yb(dm) + SH - w * SL / 2 - 0.15, hTot = plinth + hh;
        const depth = 1.5 + A.rnd() * 0.4, xf = s * (WALL - depth);
        const per = Math.max(1, Math.floor(w / 1.4)), floors = [];
        for (let f = 0; f < nFl; f++) { const row = []; for (let j = 0; j < per; j++) row.push(0.5 + (j + 0.5) * (w - 1.0) / per); floors.push(row); }
        const tex = frontTex(shopN + '|' + s, w, hTot, plinth, floors, name, col, wall, brick);
        const side = K3D.toon('#ffffff', { map: sideTex(wall, brick, shopN) }), front = K3D.toon('#ffffff', { map: tex });
        const mats = s < 0 ? [front, side, side, side, side, side] : [side, front, side, side, side, side];
        const m = K3D.mesh(box(depth, hTot, w), mats, { ink: INK, inkW: 0.5 }); m.position.set(s * (WALL - depth / 2), yLo + hTot / 2, -dm); still.add(m);
        // canvas u runs from the viewer's left: on the left wall that is the low end (d), on the right wall the high end
        const dOf = u => (s < 0 ? d + u : d + w - u), yOf = v => yLo + v;
        // the cornice, a chimney pot, the awning, the shop window, the blade sign
        add(still, box(depth + 0.3, 0.2, w + 0.2), A.toonM('#3a2a30'), s * (WALL - depth / 2 - 0.15), yLo + hTot + 0.1, -dm, { ink: INK, inkW: 0.4 });
        if (A.rnd() < 0.6) { const cx = s * (WALL - 0.5), cd = d + 0.6 + A.rnd() * (w - 1.2); add(still, box(0.5, 0.7, 0.5), A.toonM('#7a4a3a'), cx, yLo + hTot + 0.45, -cd, { ink: INK }); add(still, cyl(0.09, 0.1, 0.25, 8), A.toonM('#c86a4a'), cx, yLo + hTot + 0.92, -cd); }
        const sw = w - 0.95;
        const shopWin = new T.Mesh(new T.PlaneGeometry(sw - 0.24, 0.95), H.lit(shopTex(kind, sw), 1.15)); shopWin.position.set(xf - s * 0.012, yOf(plinth + 0.575), -dOf(0.12 + (sw - 0.24) / 2)); shopWin.rotation.y = -s * Math.PI / 2; still.add(shopWin);
        const aw = K3D.mesh(box(0.9, 0.06, sw), K3D.toon('#ffffff', { map: H.stripes('#f2e6c8', col, 'aw' + kind), side: T.DoubleSide }), { ink: INK, inkW: 0.4 });
        aw.position.set(xf - s * 0.42, yOf(plinth + 1.2), -dOf(sw / 2)); aw.rotation.z = s * 0.32; still.add(aw);
        for (let j = 0; j < Math.floor(sw / 0.5); j++) { const fl = new T.Mesh(K3D.geo('tw-scal', () => new T.ConeGeometry(0.16, 0.24, 3).rotateX(Math.PI)), A.toonM(j % 2 ? '#f2e6c8' : col)); fl.position.set(xf - s * 0.86, yOf(plinth + 1.0), -dOf(0.25 + j * 0.5)); still.add(fl); }
        lamps.bulb.line(V(xf - s * 0.88, yOf(plinth + 1.06), -dOf(0.1)), V(xf - s * 0.88, yOf(plinth + 1.06), -dOf(sw)), 0.5, 0.045, ['#fff4d8', '#ffd890'], 1.7, { mode: 1, sp: 0.7, step: 0.08 });
        const blade = H.sign(name.split(' ')[0], 1.1, 0.46, { fg: col, k: name.length > 8 ? 0.34 : 0.48 }); blade.position.set(xf - s * 0.75, yOf(plinth + 2.0), -(s < 0 ? d + 0.15 : d + w - 0.15)); still.add(blade);
        add(still, cyl(0.02, 0.02, 0.9, 5).rotateZ(Math.PI / 2), chrome, xf - s * 0.45, yOf(plinth + 2.26), blade.position.z);
        // windows upstairs (lit or dark, some with a creature at them)
        floors.forEach((row, f) => row.forEach(wx => {
          const v = plinth + 1.5 + 0.25 + f * 1.0 + 0.3, on = A.rnd() < 0.78;
          winList.push([xf - s * 0.012, yOf(v), -dOf(wx), -s * Math.PI / 2, on ? A.pick(['#ffffff', '#ffe8c0', '#ffd0a0', '#c8e0ff']) : '#40404a', on ? 1.15 : 0.5]);
          if (on && A.rnd() < 0.42) crit.add(xf - s * 0.1, yOf(v - 0.3), -dOf(wx), { act: A.pick(['wave', 'idle', 'cheer']), yaw: -s * Math.PI / 2, s: 0.7 + A.rnd() * 0.2 });
          if (A.rnd() < 0.3) { add(still, box(0.18, 0.12, 0.5), A.toonM('#6a4a2a'), xf - s * 0.1, yOf(v - 0.36), -dOf(wx)); for (let j = 0; j < 4; j++) add(still, new T.SphereGeometry(0.06, 6, 5), A.toonM(A.pick(['#ff5a7a', '#ffd24a', '#ff8ad8', '#ffffff'])), xf - s * 0.12, yOf(v - 0.27), -dOf(wx) + (j - 1.5) * 0.11); }
        }));
        // the keeper in the doorway
        crit.add(xf - s * 0.15, yOf(plinth), -dOf(w - 0.45), { kind: 4, act: 'idle', yaw: -s * Math.PI / 2, s: 0.95 });
        (W.fronts = W.fronts || []).push({ s, d, w, xf, yLo, hTot, plinth });
        d += w + 0.12 + (A.rnd() < 0.25 ? 0.9 : 0);
      }
    }
    { const wm = new T.InstancedMesh(K3D.geo('tw-win', () => new T.PlaneGeometry(0.44, 0.6)), new T.MeshBasicMaterial({ map: windowTex(), toneMapped: false }), winList.length);
      const m4 = new T.Matrix4(), e = new T.Euler(), qq = new T.Quaternion(), c = new T.Color(), one = new T.Vector3(1, 1, 1), p = new T.Vector3();
      winList.forEach(([x, y, z, ry, col, kk], i) => { e.set(0, ry, 0); qq.setFromEuler(e); m4.compose(p.set(x, y, z), qq, one); wm.setMatrixAt(i, m4); wm.setColorAt(i, c.set(col).multiplyScalar(kk)); });
      still.add(wm); }
    /* ---------- lamp posts along the pavements, a lantern and a pool of light each; bunting and festoons between them ---------- */
    const posts = W.posts = [];
    for (const s of [-1, 1]) for (let d = D0 + 3; d < D1; d += 7) {
      const x = s * (RAIL + 0.95), y0 = yb(d) + SH;
      add(still, cyl(0.16, 0.2, 0.18, 12), A.toonM('#2a2a32'), x, y0 + 0.09, -d, { ink: INK });
      add(still, cyl(0.045, 0.06, 2.7, 10), A.toonM('#2a3a32'), x, y0 + 1.35, -d, { ink: INK, inkW: 0.3 });
      add(still, new T.TorusGeometry(0.22, 0.03, 6, 12, Math.PI / 2).rotateY(s > 0 ? Math.PI : 0), A.toonM('#2a3a32'), x + 0.0, y0 + 2.48, -d, { rz: 0 });
      const lx = x - s * 0.22;
      add(still, box(0.2, 0.26, 0.2), A.toonM('#1a1a22'), lx, y0 + 2.42, -d, { ink: INK, inkW: 0.3 });
      add(still, new T.ConeGeometry(0.17, 0.14, 4).rotateY(Math.PI / 4), A.toonM('#1a1a22'), lx, y0 + 2.62, -d);
      lamps.bulb.add(lx, y0 + 2.42, -d, 0.1, '#ffe2a8', 2.4, { mode: 0 });
      glows.add(lx, y0 + 2.42, -d, 0.9, '#ffd890', 0.2, 0.05);
      lamps.pool.add(lx, y0 + 0.04, -d, 2.2, '#ffc880', 0.45, {});
      posts.push({ s, d, x, y0 });
    }
    { // bunting from post to post along the rail side, and festoons of bulbs from the posts to the cornices
      const flags = [];
      for (const s of [-1, 1]) for (let d = D0 + 3; d + 7 < D1; d += 7) {
        const a = V(s * (RAIL + 0.95), yb(d) + SH + 2.2, -d), b = V(s * (RAIL + 0.95), yb(d + 7) + SH + 2.2, -(d + 7));
        for (let j = 0; j < 10; j++) { const u = (j + 0.5) / 10, sag = Math.sin(u * Math.PI) * 0.55; flags.push([a.x, a.y + (b.y - a.y) * u - sag, a.z + (b.z - a.z) * u]); }
        const mid = a.clone().add(b).multiplyScalar(0.5); mid.y -= 0.55; still.add(kit.wire([a, mid, b], 0.012, A.toonM('#f2e6c8')));
      }
      const fm = new T.InstancedMesh(K3D.geo('pl-flag', () => { const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute([-0.22, 0, 0, 0.22, 0, 0, 0, -0.42, 0], 3)); g.computeVertexNormals(); return g; }), new T.MeshBasicMaterial({ side: T.DoubleSide, toneMapped: false }), flags.length);
      const c = new T.Color(), cols = ['#e8302a', '#ffd24a', '#2a8ae8', '#f2e6c8', '#3ac86a', '#e84ab0'];
      flags.forEach((f, i) => fm.setColorAt(i, c.set(cols[i % cols.length]).multiplyScalar(1.05)));
      fm.userData.live = true; K.add(fm); W.flags = { fm, flags };
      for (const pq of posts) {
        const f = (W.fronts || []).find(q => q.s === pq.s && pq.d > q.d - 0.5 && pq.d < q.d + q.w + 0.5); if (!f) continue;
        const a = V(pq.x - pq.s * 0.22, pq.y0 + 2.7, -pq.d), b = V(f.xf, f.yLo + f.hTot - 0.3, -(pq.d + 1.5));
        const n = 12; for (let j = 0; j <= n; j++) { const u = j / n, sag = Math.sin(u * Math.PI) * 0.45; lamps.bulb.add(a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u - sag, a.z + (b.z - a.z) * u, 0.05, A.pick(['#ff5a5a', '#ffd24a', '#5ac8ff', '#5aff8a', '#ff8ad8']), 1.9, { mode: 1, sp: 0.6, ph: u }); }
        const mid = a.clone().add(b).multiplyScalar(0.5); mid.y -= 0.45; still.add(kit.wire([a, mid, b], 0.008, A.toonM('#2a2a2a')));
      }
      // balloons tied to the posts
      const bm = new T.InstancedMesh(K3D.geo('pl-ball', () => new T.SphereGeometry(0.4, 16, 12).scale(1, 1.2, 1)), K3D.toon('#ffffff', { emissive: '#222222', emissiveIntensity: 0.6 }), 40);
      const bl = W.balloons = []; let n = 0;
      for (const pq of posts) if (n < 40 && A.rnd() < 0.45) for (let j = 0; j < 2 && n < 40; j++) {
        const base = V(pq.x + pq.s * 0.15, pq.y0 + 0.9, -pq.d - j * 0.25), hgt = 2.4 + j * 0.5 + A.rnd() * 0.4;
        bm.setColorAt(n, c.set(A.pick(['#e8302a', '#ffd24a', '#2a8ae8', '#e84ab0', '#3ac86a', '#ff8a4a'])));
        const str = new T.Mesh(cyl(0.008, 0.008, hgt, 4), A.flatM('#f2e6c8', 0.9)); str.position.set(base.x, base.y + hgt / 2, base.z); K.add(str);
        bl.push({ base, i: n, ph: A.rnd() * 6, h: hgt, str }); n++;
      }
      bm.count = n; bm.userData.live = true; K.add(bm); W.bm = bm;
    }
    // little lit inserts along the streets between the buildings, lighting under a passing ball
    for (const s of [-1, 1]) for (const [a, b] of [[[5.25, 100.6], [2.6, 103.4]], [[2.6, 103.4], [4.9, 107]], [[5.25, 100.6], [4.9, 107]]]) {
      const ax = s * a[0], bx = s * b[0], L = Math.hypot(bx - ax, b[1] - a[1]), n = Math.floor(L / 0.55);
      for (let j = 2; j < n - 1; j++) { const u = j / n, q = kit.P(ax + (bx - ax) * u, a[1] + (b[1] - a[1]) * u, 0.025); lamps.disc.add(q.x, q.y, q.z, 0.12, j % 2 ? '#ffd24a' : '#fff4d8', 0.5, { mode: 1, sp: 0.8, ph: u, ball: 2.2 }); }
    }
    /* ---------- the lost-property office (right shoulder, d 118) ---------- */
    {
      const d = 118, x0 = RAIL + 1.7, w = 10, dep = WALL - x0, yLo = yb(d) + SH - w * SL / 2 - 0.15, hh = 4.4 + w * SL / 2;
      const g = new T.Group(); still.add(g);
      const wall = K3D.toon('#ffffff', { map: K3D.paint('tw-lp', 256, 128, (c, cw, ch) => { c.fillStyle = '#e8dcc0'; c.fillRect(0, 0, cw, ch); for (let y = 0; y < ch; y += 8) { c.fillStyle = 'rgba(0,0,0,0.1)'; c.fillRect(0, y, cw, 1); } c.fillStyle = '#2a6a8a'; c.fillRect(0, ch - 18, cw, 18); c.fillRect(0, 0, cw, 10); c.fillStyle = '#ffd24a'; c.fillRect(0, ch - 22, cw, 4); }, { repeat: true }) });
      // back wall, side walls, roof: the front is open behind a long counter
      add(g, box(0.3, hh, w), wall, WALL - 0.15, yLo + hh / 2, -d, { ink: INK });
      for (const dd of [-w / 2, w / 2]) add(g, box(dep, hh, 0.3), wall, x0 + dep / 2, yLo + hh / 2, -(d + dd), { ink: INK });
      add(g, box(dep + 0.5, 0.3, w + 0.6), A.toonM('#3a3a4a'), x0 + dep / 2 - 0.25, yLo + hh + 0.15, -d, { ink: INK });
      add(g, box(0.5, 0.25, w), A.toonM('#3a3a4a'), x0 + 0.1, yLo + hh - 0.12, -d, { ink: INK });
      add(g, box(0.7, 1.05 + w * SL / 2 + 0.15, w - 0.3), K3D.toon('#ffffff', { map: H.stripes('#f2e6c8', '#2a6a8a', 'lpc') }), x0 + 0.35, yLo + (1.05 + w * SL / 2 + 0.15) / 2, -d, { ink: INK });
      add(g, box(0.9, 0.08, w - 0.2), A.toonM('#8a5a2a'), x0 + 0.35, yLo + 1.05 + w * SL / 2 + 0.19, -d, { ink: INK, inkW: 0.3 });
      const sg = H.sign('LOST PROPERTY\nFOUND UNDER THE GLASS', 5.6, 1.0, { fg: '#1a3a6a', k: 0.3 }); sg.position.set(x0 - 0.2, yLo + hh + 0.45, -d); sg.rotation.y = -Math.PI / 2; g.add(sg);
      // a billboard on the roof facing down the table, a big hand pointing at the counter, bulbs round it
      const bb = H.sign('LOST\nPROPERTY', 3.2, 1.6, { fg: '#1a3a6a', bg: '#ffd24a', k: 0.36 }); bb.position.set(x0 + dep / 2, yLo + hh + 1.3, -(d - w / 2 + 0.6)); g.add(bb);
      for (const dx of [-1.2, 1.2]) add(g, cyl(0.04, 0.04, 1.0, 6), chrome, x0 + dep / 2 + dx, yLo + hh + 0.6, -(d - w / 2 + 0.7));
      lamps.bulb.line(V(x0 + dep / 2 - 1.65, yLo + hh + 2.15, -(d - w / 2 + 0.55)), V(x0 + dep / 2 + 1.65, yLo + hh + 2.15, -(d - w / 2 + 0.55)), 0.3, 0.06, ['#fff4d8', '#ff5a5a'], 2, { mode: 1, sp: 1.2 });
      lamps.bulb.line(V(x0 + dep / 2 - 1.65, yLo + hh + 0.45, -(d - w / 2 + 0.55)), V(x0 + dep / 2 + 1.65, yLo + hh + 0.45, -(d - w / 2 + 0.55)), 0.3, 0.06, ['#fff4d8', '#ff5a5a'], 2, { mode: 1, sp: 1.2 });
      const lt = H.sign('ASK AT THE COUNTER', 2.6, 0.5, { fg: '#c0182a', k: 0.4 }); lt.position.set(x0 + dep / 2, yLo + 2.6, -(d - w / 2 - 0.16)); g.add(lt);
      const lit2 = new T.Mesh(new T.PlaneGeometry(w - 0.6, hh - 1.6), H.lit(K3D.paint('tw-lpback', 256, 96, (c, cw, ch) => { const gr = c.createLinearGradient(0, 0, 0, ch); gr.addColorStop(0, '#ffe8c0'); gr.addColorStop(1, '#c8905a'); c.fillStyle = gr; c.fillRect(0, 0, cw, ch); c.fillStyle = 'rgba(90,50,30,0.7)'; for (const y of [30, 62]) c.fillRect(0, y, cw, 4); for (let x = 8; x < cw; x += 26) { c.fillStyle = '#f2e6c8'; c.fillRect(x, 20, 8, 10); c.fillRect(x + 10, 52, 8, 10); } }), 0.9));
      lit2.position.set(WALL - 0.31, yLo + 1.3 + (hh - 1.6) / 2, -d); lit2.rotation.y = -Math.PI / 2; g.add(lit2);
      // shelves and the things on them (each with a paper tag)
      for (const sy of [1.9, 3.1]) add(g, box(0.9, 0.08, w - 0.8), A.toonM('#6a4a2a'), WALL - 0.75, yLo + sy, -d, { ink: INK, inkW: 0.3 });
      const things = [['button', 0.75, -3.6, 1.9], ['coin', 0.5, -1.6, 1.98], ['hairclip', 1.1, 0.6, 1.98], ['pencil', 1.4, 2.6, 2.0], ['moth', 0.9, -2.8, 3.18], ['coin', 0.42, 3.4, 3.18]];
      for (const [kind, s, dd, yy] of things) { const o = A.lost(K, kind, { s, col: A.pick(['#d84a6a', '#4a8ad8', '#3ac86a']) }); o.position.set(WALL - 0.75, yLo + yy + 0.12, -(d + dd)); o.rotation.y = A.rnd() * 3; if (kind === 'coin' || kind === 'button') { o.rotation.z = Math.PI / 2; o.rotation.y = Math.PI / 2; o.position.y += s * 0.85; } still.add(o); const tg = A.decal(K, 'tag', 0.32, 0.18, { text: '#' + (100 + Math.floor(A.rnd() * 900)) }); tg.position.set(WALL - 1.25, yLo + yy + 0.3, -(d + dd - 0.4)); tg.rotation.y = -Math.PI / 2; still.add(tg); }
      // a marble, a bottle cap and a key on the floor in front, too big for the shelves
      const marble = new T.Mesh(new T.SphereGeometry(0.55, 24, 16), new T.MeshBasicMaterial({ color: A.hot('#7ac8ff', 0.8), transparent: true, opacity: 0.55, depthWrite: false })); marble.position.set(12.0, yb(124) + SH + 0.55, -124); K.add(marble);
      add(still, new T.SphereGeometry(0.25, 12, 8), A.toonM('#ff5a3a'), 12.0, yb(124) + SH + 0.55, -124);
      add(still, new T.CylinderGeometry(0.62, 0.62, 0.18, 21), A.toonM('#c0182a'), 12.4, yb(112) + SH + 0.09, -112, { ink: INK });
      const key = new T.Group(); key.position.set(13.4, yb(125.4) + SH + 0.05, -125.4); key.rotation.set(-Math.PI / 2, 0, 1.2); still.add(key);
      add(key, new T.TorusGeometry(0.32, 0.08, 8, 18), A.toonM('#c8a040'), 0, 0, 0, { ink: INK }); add(key, box(1.2, 0.12, 0.08), A.toonM('#c8a040'), 0.85, 0, 0, { ink: INK }); for (const kx of [1.15, 1.35]) add(key, box(0.1, 0.22, 0.08), A.toonM('#c8a040'), kx, -0.14, 0);
      // the clerk stamping tags at the counter; a queue claiming their things
      const clerk = H.guy('#7affd8', { s: 1.0 }); clerk.position.set(x0 + 1.0, yb(d) + SH + 0.35, -d); clerk.rotation.y = -Math.PI / 2; K.add(clerk);
      const stamp = new T.Mesh(box(0.1, 0.12, 0.1), A.toonM('#c0182a')); stamp.position.set(0, -0.22, 0.05); clerk.userData.armR.add(stamp);
      add(still, box(0.5, 0.36, 0.4), A.toonM('#8a5a2a'), x0 + 1.0, yb(d) + SH + 0.18, -d);
      for (let i = 0; i < 6; i++) { const q = S(x0 - 0.8, d - 3.5 + i * 0.95); crit.add(q.x + (i % 2) * 0.3, q.y, q.z, { act: i === 0 ? 'wave' : 'idle', yaw: Math.PI / 2, s: 0.9 + A.rnd() * 0.3 }); }
      // story 7: three creatures carrying a giant paper clip back and forth along the pavement
      const clip = A.lost(K, 'clip', { s: 3.2 }); K.add(clip);
      const carriers = [0, 1, 2].map(i => { const c = H.guy(['#ffd24a', '#ff8a4a', '#4ae8ff'][i], { s: 0.9 }); K.add(c); return c; });
      W.lost = { clerk, clip, carriers, x: RAIL + 2.0, d0: d + 6, d1: d + 22 };
      lamps.bulb.line(V(x0 - 0.05, yLo + hh - 0.25, -(d - w / 2 + 0.3)), V(x0 - 0.05, yLo + hh - 0.25, -(d + w / 2 - 0.3)), 0.4, 0.06, ['#fff4d8', '#ffd24a'], 2, { mode: 1, sp: 0.8 });
    }
    /* ---------- the brass band on the speaker grille (left shoulder, d 150) ---------- */
    {
      const d = 150, cx = -12.2, y0 = yb(d) + SH, R = 2.3;
      const yd = dd => yb(dd) + SH, tiltX = Math.atan(SL); // (the grille lies in the sloping shoulder)
      add(still, new T.TorusGeometry(R, 0.12, 8, 48).rotateX(Math.PI / 2), chrome, cx, y0 + 0.08, -d, { ink: INK, inkW: 0.4, rx: tiltX });
      const gr = new T.Mesh(new T.CircleGeometry(R, 48).rotateX(-Math.PI / 2), K3D.toon('#ffffff', { map: grilleTex() })); gr.position.set(cx, y0 + 0.05, -d); gr.rotation.x = tiltX; K.add(gr); gr.userData.live = true;
      for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; add(still, cyl(0.07, 0.07, 0.06, 8), chrome, cx + Math.cos(a) * (R - 0.15), yd(d - Math.sin(a) * (R - 0.15)) + 0.1, -d + Math.sin(a) * (R - 0.15)); }
      const sg = H.sign('THE COMET TOWN BAND', 3.4, 0.5, { fg: '#8a1a1a', k: 0.42 }); sg.position.set(cx - 1.6, y0 + 2.2, -d); sg.rotation.y = Math.PI / 2; still.add(sg);
      for (const dd of [-1.5, 1.5]) add(still, cyl(0.03, 0.03, 2.3, 6), chrome, cx - 1.6, y0 + 1.1, -(d + dd));
      const band = W.band = { gr, players: [], notes: [], y0, cx, d, beat: 0, fan: 99 };
      const gold = A.toonM('#e8b030', { emissive: '#4a3008', emissiveIntensity: 0.4 });
      const player = (col, dx, dd, inst) => { const g = H.guy(col, { s: 1.0 }); g.position.set(cx + dx, yd(d + dd) + 0.08, -(d + dd)); g.rotation.y = Math.PI / 2; K.add(g); const ig = new T.Group(); g.userData.body.add(ig); inst(ig); band.players.push({ g, ig, ph: A.rnd() * 6 }); return g; };
      player('#ff8a4a', -0.9, -0.9, ig => { add(ig, new T.TorusGeometry(0.16, 0.05, 8, 18), gold, 0, 0.28, 0.2); add(ig, new T.ConeGeometry(0.16, 0.24, 14, 1, true).rotateX(Math.PI), gold, 0.06, 0.52, 0.18); });
      player('#4ae8ff', 0.2, -1.2, ig => { add(ig, cyl(0.02, 0.02, 0.35, 6).rotateX(Math.PI / 2), gold, 0, 0.34, 0.28); add(ig, new T.ConeGeometry(0.07, 0.12, 10, 1, true).rotateX(-Math.PI / 2), gold, 0, 0.34, 0.5); });
      player('#9a8aff', 0.2, 0.0, ig => { add(ig, cyl(0.02, 0.02, 0.35, 6).rotateX(Math.PI / 2), gold, 0, 0.34, 0.28); add(ig, new T.ConeGeometry(0.07, 0.12, 10, 1, true).rotateX(-Math.PI / 2), gold, 0, 0.34, 0.5); });
      player('#ffd24a', 0.2, 1.2, ig => { add(ig, cyl(0.018, 0.018, 0.55, 6).rotateX(Math.PI / 2), gold, 0.06, 0.32, 0.36); add(ig, new T.ConeGeometry(0.07, 0.12, 10, 1, true).rotateX(-Math.PI / 2), gold, 0.06, 0.32, 0.68); });
      const drummer = player('#5aff8a', -0.9, 0.9, ig => { add(ig, cyl(0.28, 0.28, 0.24, 18).rotateX(Math.PI / 2), K3D.toon('#ffffff', { map: H.stripes('#f2e6c8', '#c0182a', 'drum') }), 0, 0.2, 0.28, { ink: INK }); });
      band.drummer = drummer;
      // the conductor on a box, facing the band, baton up
      add(still, box(0.4, 0.3, 0.4), A.toonM('#8a1a1a'), cx + 1.5, y0 + 0.15, -d, { ink: INK });
      const cond = H.guy('#f2e6c8', { s: 1.1 }); cond.position.set(cx + 1.5, y0 + 0.3, -d); cond.rotation.y = -Math.PI / 2; K.add(cond);
      const tails = H.hat('#1a1a22', 1.0); tails.position.y = 0.48; cond.userData.body.add(tails);
      const baton = new T.Mesh(cyl(0.008, 0.008, 0.3, 4), A.flatM('#ffffff', 1.3)); baton.position.set(0, -0.3, 0.06); baton.rotation.x = 0.4; cond.userData.armR.add(baton);
      band.cond = cond;
      // music stands, footlights, an audience on the pavement
      for (const dd of [-1.2, 0, 1.2]) { add(still, cyl(0.015, 0.015, 0.5, 5), chrome, cx + 0.75, yd(d + dd) + 0.3, -(d + dd)); add(still, box(0.04, 0.22, 0.3), A.toonM('#1a1a22'), cx + 0.78, yd(d + dd) + 0.6, -(d + dd), { rz: -0.3 }); }
      for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2; lamps.bulb.add(cx + Math.cos(a) * (R + 0.15), yd(d - Math.sin(a) * (R + 0.15)) + 0.2, -d + Math.sin(a) * (R + 0.15), 0.06, k % 2 ? '#ffd24a' : '#fff4d8', 2, { mode: 1, sp: 1.0, ph: k / 14 }); }
      glows.add(cx, y0 + 1.0, -d, 2.2, '#ffd890', 0.07, 0.05);
      for (let i = 0; i < 12; i++) { const a = -0.9 + i / 11 * 1.8, rr = R + 1.0 + (i % 2) * 0.6, ox = Math.cos(a) * rr, oz = Math.sin(a) * rr * 1.3; crit.add(cx + ox, yd(d - oz), -d + oz, { act: i % 3 ? 'dance' : 'cheer', yaw: Math.atan2(-ox, -oz), s: 0.9 + A.rnd() * 0.3 }); }
      // the notes that float up
      const nt = K3D.paint('tw-note', 32, 32, (c, w, h) => { c.clearRect(0, 0, w, h); c.fillStyle = '#fff'; c.beginPath(); c.ellipse(11, 24, 6, 4.5, -0.4, 0, 7); c.fill(); c.fillRect(15, 4, 3, 20); c.fillRect(15, 4, 10, 4); });
      for (let k = 0; k < 10; k++) { const m = new T.Mesh(K3D.geo('tw-noteg', () => new T.PlaneGeometry(0.32, 0.32)), new T.MeshBasicMaterial({ map: nt, color: A.hot(A.pick(['#ffd24a', '#ff8ad8', '#7affd8']), 1.6), transparent: true, depthWrite: false, toneMapped: false, side: T.DoubleSide })); K.add(m); band.notes.push({ m, ph: k / 10, x: (A.rnd() - 0.5) * 2, z: (A.rnd() - 0.5) * 2.6 }); }
    }
    /* ---------- the newsstand (right shoulder, d 96) and its board that changes with the news ---------- */
    {
      const d = 96.5, x = RAIL + 2.6, y0 = yb(d) + SH;
      const g = new T.Group(); g.position.set(x, y0, -d); still.add(g);
      add(g, box(1.6, 1.3, 2.2), A.toonM('#2a5a3a'), 0.4, 0.65, 0, { ink: INK });
      add(g, box(2.0, 0.12, 2.6), A.toonM('#1a3a2a'), 0.35, 1.9, 0, { ink: INK });
      for (const dd of [-1.0, 1.0]) add(g, cyl(0.04, 0.04, 0.7, 6), chrome, -0.35, 1.5, dd);
      const mags = new T.Mesh(new T.PlaneGeometry(2.0, 0.5), H.lit(K3D.paint('tw-mags', 256, 64, (c, w, h) => { c.fillStyle = '#d8c8a0'; c.fillRect(0, 0, w, h); for (let x2 = 4; x2 < w; x2 += 22) { c.fillStyle = A.pick(['#e8302a', '#2a8ae8', '#ffd24a', '#3ac86a', '#e84ab0']); c.fillRect(x2, 6, 18, 26); c.fillStyle = '#fff'; c.fillRect(x2 + 2, 9, 14, 4); c.fillStyle = A.pick(['#e8302a', '#2a8ae8', '#ffd24a']); c.fillRect(x2 + 3, 36, 16, 22); } }), 1.0));
      mags.position.set(-0.41, 1.0, 0); mags.rotation.y = -Math.PI / 2; g.add(mags);
      const sg = H.sign('NEWS', 1.2, 0.4, { fg: '#1a3a2a', k: 0.6 }); sg.position.set(-0.6, 2.2, 0); sg.rotation.y = -Math.PI / 2; g.add(sg);
      // the sandwich board out front (its headline is swapped by what happens on the table)
      const heads = { idle: 'BUMPER TOWN\nLIGHTS UP!', gate: 'EXTRA!\nGATE OPENS!', tilt: 'TILT!\nHOLD ON!', loose: 'LOOSE BALLS\nON MAIN ST!', flip: 'FRIEND\nFLIPS FRIEND!' };
      const mats = {}; for (const k in heads) mats[k] = K3D.toon('#ffffff', { map: K3D.paint('tw-head|' + k, 128, 160, (c, w, h) => { c.fillStyle = '#f8f4e8'; c.fillRect(0, 0, w, h); c.fillStyle = '#1a1418'; c.fillRect(0, 0, w, 26); c.fillStyle = '#f8f4e8'; c.font = '900 18px "DejaVu Sans", sans-serif'; c.textAlign = 'center'; c.fillText('THE DAILY BUMP', w / 2, 19); c.fillStyle = k === 'idle' ? '#1a1418' : '#c0182a'; c.font = '900 22px "DejaVu Sans", sans-serif'; heads[k].split('\n').forEach((ln, i) => c.fillText(ln, w / 2, 70 + i * 28, w - 8)); for (let i = 0; i < 6; i++) { c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(10, 118 + i * 6, w - 20 - (i % 2) * 30, 3); } }) });
      const bd = new T.Group(); bd.position.set(x - 1.6, y0, -(d - 1.6)); K.add(bd); bd.userData.live = true;
      const face = new T.Mesh(new T.PlaneGeometry(0.8, 1.0), mats.idle); face.position.set(0, 0.6, 0.18); face.rotation.x = -0.18; bd.add(face);
      const back = new T.Mesh(new T.PlaneGeometry(0.8, 1.0), A.toonM('#6a4a2a', { side: T.DoubleSide })); back.position.set(0, 0.6, 0.2); back.rotation.x = -0.17; bd.add(back);
      const seller = H.guy('#ff8a4a', { s: 1.1 }); seller.position.set(x - 1.2, y0, -(d + 1.4)); seller.rotation.y = -Math.PI / 2 + 0.3; K.add(seller);
      const paper = new T.Mesh(new T.PlaneGeometry(0.22, 0.3), A.toonM('#f8f4e8', { side: T.DoubleSide })); paper.position.set(0, -0.28, 0.08); seller.userData.armR.add(paper);
      W.news = { face, mats, seller, now: 'idle', t: 0 };
    }
    /* ---------- the tea room's tables on the left pavement ---------- */
    {
      const f = (W.fronts || []).find(q => q.s < 0 && q.d > 100 && q.d < 135) || { d: 110, w: 5 };
      for (let i = 0; i < 3; i++) {
        const d = f.d + 1 + i * 1.6, x = -(RAIL + 2.4), y0 = yb(d) + SH;
        add(still, cyl(0.03, 0.05, 0.5, 6), A.toonM('#2a2a32'), x, y0 + 0.25, -d); add(still, cyl(0.32, 0.32, 0.04, 16), A.toonM('#f2e6c8'), x, y0 + 0.5, -d, { ink: INK, inkW: 0.3 });
        add(still, cyl(0.02, 0.02, 1.1, 5), chrome, x, y0 + 0.95, -d); add(still, new T.ConeGeometry(0.62, 0.3, 12, 1, true), K3D.toon('#ffffff', { map: H.stripes('#f2e6c8', '#6a2a4a', 'umb'), side: T.DoubleSide }), x, y0 + 1.5, -d, { ink: INK, inkW: 0.3 });
        add(still, cyl(0.05, 0.04, 0.08, 8), A.toonM('#ffffff'), x + 0.1, y0 + 0.56, -d);
        for (const dx of [-0.5, 0.5]) H.crit.add(x + dx, y0, -d, { act: 'sit', yaw: dx > 0 ? -Math.PI / 2 : Math.PI / 2, s: 0.9 });
      }
    }
    /* ---------- the crowd on the pavements ---------- */
    for (const s of [-1, 1]) for (let d = D0 + 1; d < D1; d += 1.15) {
      if (A.rnd() < 0.4) continue;
      if (s > 0 && d > 112 && d < 124.5) continue; if (s < 0 && d > 146 && d < 154.5) continue; if (s > 0 && d > 94 && d < 99.5) continue;
      const x = s * (RAIL + 1.3 + A.rnd() * 2.6), q = S(x, d);
      crit.add(q.x, q.y, q.z, { act: A.pick(['idle', 'walk', 'walk', 'wave', 'cheer', 'idle', 'dance']), yaw: A.rnd() < 0.5 ? Math.PI : 0, s: 0.85 + A.rnd() * 0.5 });
    }
    /* ---------- story creatures with their own animation ---------- */
    // 6. lamp-post huggers (they grab their post in a TILT)
    W.huggers = [];
    for (const pq of posts.filter((_, i) => i % 3 === 1)) { const g = H.guy(A.pick(A.NEON), { s: 1.0 }); g.position.set(pq.x + pq.s * 0.35, pq.y0, -pq.d); g.rotation.y = pq.s > 0 ? -Math.PI / 2 : Math.PI / 2; K.add(g); W.huggers.push({ g, pq, a: 0 }); }
    // 10. the window cleaner on a cradle going up and down a shopfront
    { const f = (W.fronts || []).filter(q => q.s > 0 && q.hTot > 4).pop() || W.fronts[W.fronts.length - 1];
      const g = new T.Group(); K.add(g); g.userData.live = true;
      add(g, box(0.4, 0.06, 1.6), A.toonM('#8a5a2a'), 0, 0, 0, { ink: INK, inkW: 0.3 });
      for (const dz of [-0.75, 0.75]) add(g, cyl(0.015, 0.015, 0.5, 4), chrome, 0, 0.25, dz);
      add(g, box(0.02, 0.02, 1.5), chrome, 0, 0.5, 0);
      const cl = H.guy('#5aff8a', { s: 0.95 }); cl.position.set(0, 0.03, 0); cl.rotation.y = -f.s * Math.PI / 2; g.add(cl);
      const sq = new T.Mesh(box(0.04, 0.04, 0.3), A.toonM('#2a2a32')); sq.position.set(0, -0.22, 0.08); cl.userData.armR.add(sq);
      const ropes = [0, 1].map(() => { const r = new T.Mesh(cyl(0.008, 0.008, 1, 4), A.toonM('#f2e6c8')); K.add(r); return r; });
      W.cleaner = { g, cl, f, ropes };
    }
    // 11. the crossing guard on the divider by the loose balls, with a STOP sign
    { const d = 164.2, q = kit.P(0, d, 1.02); const g = H.guy('#ffd24a', { s: 0.85 }); g.position.copy(q); K.add(g);
      const stick = new T.Group(); const st2 = new T.Mesh(cyl(0.015, 0.015, 0.55, 5), A.toonM('#f2e6c8')); st2.position.y = -0.3; stick.add(st2); const disc = new T.Mesh(new T.CircleGeometry(0.16, 16), A.flatM('#e8302a', 1.4)); disc.position.y = -0.58; disc.rotation.y = 0; stick.add(disc); const tx = H.sign('STOP', 0.24, 0.1, { bg: '#e8302a', fg: '#ffffff', k: 0.8 }); tx.position.set(0, -0.58, 0.005); stick.add(tx);
      disc.material = A.flatM('#e8302a', 1.4, { side: T.DoubleSide }); disc.rotation.x = Math.PI; tx.rotation.x = Math.PI; tx.position.z = -0.005;
      stick.position.set(0, 0, 0.03); g.userData.armR.add(stick);
      const vest = new T.Mesh(box(0.38, 0.12, 0.3), A.flatM('#ff8a2a', 1.2)); vest.position.y = 0.22; g.userData.body.add(vest);
      W.guard = { g, d, a: 0 }; }
    // 12. washing on a line between two shops on the left
    { const fs = (W.fronts || []).filter(q => q.s < 0); const f0 = fs[Math.min(fs.length - 2, 3)], f1 = fs[Math.min(fs.length - 1, 4)];
      if (f0 && f1) { const a = V(f0.xf - 0.4, f0.yLo + f0.hTot - 0.8, -(f0.d + f0.w - 0.6)), b = V(f1.xf - 0.4, f1.yLo + f1.hTot - 0.8, -(f1.d + 0.8)), mid = a.clone().lerp(b, 0.5); mid.y -= 0.35; mid.x += 0.9;
        still.add(kit.wire([a, mid, b], 0.01, A.toonM('#f2e6c8')));
        const crv = new T.QuadraticBezierCurve3(a, mid, b); W.wash = [];
        for (let k = 1; k < 8; k++) { const pt = crv.getPoint(k / 8), m = new T.Mesh(box(0.04, 0.34 + (k % 3) * 0.08, 0.26), A.toonM(A.pick(['#e8302a', '#ffd24a', '#2a8ae8', '#f2e6c8', '#3ac86a', '#ff8ad8']))); const pv = new T.Group(); pv.position.copy(pt); K.add(pv); m.position.y = -0.2; pv.add(m); W.wash.push({ pv, ph: k }); } } }
    W.t = 0; W.fxN = 0; W.news.last = 0;
  }

  /* ====================================================================================================
     Update
     ==================================================================================================== */
  const m4 = new T.Matrix4(), qq = new T.Quaternion(), ee = new T.Euler(), one = new T.Vector3(1, 1, 1), pv = new T.Vector3();
  const kickOf = (st, B) => { const s = st.bump[B.i]; return s ? s.cool : 0; };
  const near = (pos, q, r) => pos.some(p => Math.hypot(p.x - q.x, p.z - q.z) < r);
  function update(K, SC, st, dt, pos, L) {
    if (!kit) return;
    W.t += dt; const t = W.t, lead = Math.max(...pos.map(p => -p.z));
    const awake = lead > D0 - 30 && lead < D1 + 30; // (the far scenery still turns, but the stories only run near the heroes)
    // what just happened (for the newsstand and the band)
    let gate = false, tilt = false, flip = false;
    for (const f of st.fx) if (f.n > W.fxN) { W.fxN = f.n; if (['gateUp', 'latch', 'stairsDone', 'bridgeLatch'].includes(f.k)) gate = true; if (f.k === 'tiltWarn' || f.k === 'tilt') tilt = true; if (f.k === 'flip') flip = true; }
    // the crown turns, its pennant flaps; the searchlights sweep; the barber's pole spins; the coin turns
    if (W.crown) { W.crown.crown.rotation.y = t * 0.8; W.crown.pen.rotation.y = Math.sin(t * 3) * 0.5; const kc = kickOf(st, W.crown.B); kit.glows.color(W.crown.gi, kc > 0 ? '#ffffff' : '#ff9adf', 0.22 + kc * 0.5); }
    if (W.polisher) { const u = W.polisher.userData; u.armR.rotation.x = -1.2 + Math.sin(t * 9) * 0.5; u.armL.rotation.x = -0.4; u.body.rotation.z = Math.sin(t * 9) * 0.06; }
    if (W.beams) for (const b of W.beams) { b.yoke.rotation.y = t * 0.35 + b.ph; b.head.rotation.x = 0.45 + Math.sin(t * 0.5 + b.ph) * 0.2; }
    if (W.barber) W.barber.pole.rotation.y = -t * 3;
    if (W.bank) W.bank.coin.rotation.y = t * 1.4;
    // diner steam and bakery smoke
    if (W.diners) for (const D of W.diners) D.steam.forEach(p => { const c = (t * 0.45 + p.ph) % 1; p.m.position.set(0.1 + Math.sin(c * 6 + p.ph * 9) * 0.1, 2.4 + c * 1.0, -0.15); p.m.scale.setScalar(0.6 + c * 1.6); p.m.material.opacity = 0.32 * Math.sin(c * Math.PI); });
    if (W.smoke) { const S = W.smoke, big = W.baker && kickOf(st, W.baker.B) > 0.5; S.list.forEach(p => { const c = (t * 0.35 + p.ph) % 1; p.m.position.set(S.x + c * 0.4 + Math.sin(c * 5 + p.ph * 7) * 0.08, S.y + c * 1.3, S.z - c * 0.2); p.m.scale.setScalar((0.8 + c * 2.4) * (big ? 1.5 : 1)); p.m.material.opacity = 0.18 * Math.sin(c * Math.PI); }); }
    // 1. the cook flips a pancake; a kick sends it high and it lands on their head
    if (W.cook) {
      const C = W.cook, kc = kickOf(st, C.B), u = C.cook.userData, q = C.B.q;
      if (kc > 0.6 && C.lastCool <= 0.6 && C.big <= 0) C.big = 1.6;
      C.lastCool = kc; C.t += dt;
      const hand = new T.Vector3(); C.pan.getWorldPosition(hand);
      if (C.big > 0) {
        C.big -= dt; const u2 = 1 - C.big / 1.6, hgt = Math.sin(Math.min(1, u2 * 1.25) * Math.PI) * 2.2;
        const headP = new T.Vector3(); u.body.getWorldPosition(headP); headP.y += 0.45 * 0.85 + 0.05;
        if (u2 < 0.8) C.cake.position.set(hand.x + u2 * 0.15, hand.y + 0.05 + hgt, hand.z); else { C.cake.position.copy(headP); C.onHead = 1.4; }
        C.cake.rotation.x = u2 * 14; u.armR.rotation.x = -1.4; u.armL.rotation.x = -2.4 * Math.min(1, u2 * 3);
      } else if (C.onHead > 0) {
        C.onHead -= dt; const headP = new T.Vector3(); u.body.getWorldPosition(headP); headP.y += 0.43;
        C.cake.position.copy(headP); C.cake.rotation.set(0, 0, 0); u.body.rotation.z = Math.sin(t * 10) * 0.08; u.armL.rotation.x = -2.6; u.armR.rotation.x = -0.6;
      } else {
        const c = (C.t % 2.2) / 2.2, hop = c < 0.35 ? Math.sin(c / 0.35 * Math.PI) * 0.45 : 0;
        C.cake.position.set(hand.x, hand.y + 0.04 + hop, hand.z); C.cake.rotation.set(c < 0.35 ? c / 0.35 * Math.PI * 2 : 0, 0, 0);
        u.armR.rotation.x = -1.2 + (c < 0.08 ? -c / 0.08 * 0.6 : 0); u.armL.rotation.x = 0; u.body.rotation.z = 0;
      }
      void q;
    }
    // 2. the barber's customer: a kick is a big snip; hair falls; the tuft grows back
    if (W.barber) {
      const Bb = W.barber, kc = kickOf(st, Bb.B);
      if (kc > 0.6 && Bb.lastCool <= 0.6 && Bb.grow > 0.35) { Bb.grow = Math.max(0.2, Bb.grow - 0.4); const p0 = new T.Vector3(); Bb.tuft.getWorldPosition(p0); for (const h of Bb.hair) { h.t = 0; h.c.visible = true; h.c.position.copy(p0); h.vx = (A.rnd() - 0.5) * 1.2; h.vz = (A.rnd() - 0.2) * 1.0; h.vy = 0.6 + A.rnd() * 1.2; } }
      Bb.lastCool = kc; Bb.grow = Math.min(1, Bb.grow + dt * 0.06);
      Bb.tuft.scale.set(1, Bb.grow, 1);
      const bu = Bb.bar.userData; bu.armR.rotation.x = -1.3 + Math.sin(t * (kc > 0 ? 30 : 7)) * 0.2; bu.armL.rotation.x = -0.9; Bb.sc.rotation.z = Math.sin(t * 16) * 0.3;
      Bb.cust.userData.body.rotation.z = kc > 0 ? Math.sin(t * 25) * 0.1 : 0; Bb.cust.userData.armL.rotation.x = kc > 0 ? -2.4 : 0;
      for (const h of Bb.hair) { if (h.t > 1.6) { h.c.visible = false; continue; } h.t += dt; h.vy -= 5 * dt; h.c.position.x += h.vx * dt; h.c.position.y += h.vy * dt; h.c.position.z += h.vz * dt; h.c.rotation.x += dt * 6; }
    }
    // 3. the sign changer swaps the cinema's film every few seconds
    if (W.marquee) { const M = W.marquee, c = (t % 9) / 9, n = Math.floor(t / 9) % M.mats.length; if (n !== M.n) { M.n = n; M.face.material = M.mats[n]; } const u = M.chg.userData; u.armR.rotation.x = c > 0.85 ? -2.5 + Math.sin(t * 12) * 0.3 : -0.4 - Math.sin(t * 2) * 0.2; u.armL.rotation.x = c > 0.85 ? -1.0 : 0; M.chg.position.x = 0.65 - (c > 0.8 ? (c - 0.8) * 4 : 0); }
    // 4. the bank's guard and the coins a kick pops out
    if (W.bank) {
      const Bk = W.bank, kc = kickOf(st, Bk.B);
      if (kc > 0.6 && Bk.lastCool <= 0.6 && Bk.t > 1.4) Bk.t = 0;
      Bk.lastCool = kc; Bk.t += dt;
      const u = Bk.guard.userData;
      Bk.coins.forEach((c, k) => { const tt = Bk.t - k * 0.08; c.visible = tt > 0 && tt < 1.0; if (!c.visible) return; const a = k * 2.1 + 0.4; c.position.set(Math.sin(a) * tt * 0.9, 2.75 + tt * 3.2 - tt * tt * 4.6, Math.cos(a) * tt * 0.9); c.rotation.y = tt * 12; c.rotation.x = tt * 7; });
      const busy = Bk.t < 1.2;
      u.armL.rotation.x = u.armR.rotation.x = busy ? -2.2 + Math.sin(t * 14) * 0.3 : 0; Bk.guard.rotation.y = 0.6 + (busy ? Math.sin(t * 8) * 0.9 : 0); u.body.position.y = busy ? Math.abs(Math.sin(t * 12)) * 0.08 : 0;
    }
    // 5. the baker's tray: a kick flips the top tart into the air; they catch it
    if (W.baker) {
      const Bk = W.baker, kc = kickOf(st, Bk.B);
      if (kc > 0.6 && Bk.lastCool <= 0.6 && Bk.t > 1.2) Bk.t = 0;
      Bk.lastCool = kc; Bk.t += dt;
      const home = new T.Vector3(); Bk.tray.getWorldPosition(home); home.y += 0.05;
      if (Bk.t < 1.1) { const u = Bk.t / 1.1; Bk.tart.position.set(home.x + Math.sin(u * Math.PI) * 0.2, home.y + Math.sin(u * Math.PI) * 1.4, home.z); Bk.tart.rotation.x = u * 12; Bk.baker.userData.body.rotation.z = Math.sin(t * 10) * 0.12; }
      else { Bk.tart.position.copy(home); Bk.tart.rotation.set(0, 0, 0); Bk.baker.userData.body.rotation.z = 0; }
    }
    // the bunting flaps, balloons bob
    if (W.flags) { W.flags.flags.forEach((f, i) => { ee.set(Math.sin(t * 2.2 + i * 0.7) * 0.35 + L.tilt * 0.6, Math.PI / 2, 0); qq.setFromEuler(ee); m4.compose(pv.set(f[0], f[1], f[2]), qq, one); W.flags.fm.setMatrixAt(i, m4); }); W.flags.fm.instanceMatrix.needsUpdate = true; }
    if (W.bm) { for (const b of W.balloons) { const sx = Math.sin(t * 0.9 + b.ph) * 0.25 + L.lean * 0.8, sz = Math.cos(t * 0.7 + b.ph) * 0.2; m4.makeTranslation(b.base.x + sx, b.base.y + b.h + 0.4 + Math.sin(t * 1.3 + b.ph) * 0.08, b.base.z + sz); W.bm.setMatrixAt(b.i, m4); b.str.position.x = b.base.x + sx / 2; b.str.position.z = b.base.z + sz / 2; b.str.rotation.z = -sx / b.h; b.str.rotation.x = sz / b.h; } W.bm.instanceMatrix.needsUpdate = true; }
    // 6. lamp-post huggers: in a TILT (and its warning) they grab the post and swing out the way the table goes
    for (const Hg of W.huggers) {
      const want = L.warn || L.tilt ? 1 : 0; Hg.a += (want - Hg.a) * Math.min(1, dt * 6);
      const u = Hg.g.userData, sw = L.tilt ? -L.tilt * Hg.pq.s : 0;
      u.armL.rotation.x = u.armR.rotation.x = -Hg.a * 2.6 + (1 - Hg.a) * Math.sin(t * 2 + Hg.pq.d) * 0.15;
      Hg.g.position.x = Hg.pq.x + Hg.pq.s * (0.35 - Hg.a * 0.17); Hg.g.position.y = Hg.pq.y0 + Hg.a * 0.25;
      Hg.g.rotation.z = Hg.a * (Math.abs(sw) > 0 ? sw * 0.9 + Math.sin(t * 14) * 0.12 : Math.sin(t * 9) * 0.05);
      u.legL.rotation.x = Hg.a * Math.sin(t * 16) * 0.5; u.legR.rotation.x = -Hg.a * Math.sin(t * 16) * 0.5;
    }
    // 7. lost property: the clerk stamps; three creatures carry the giant paper clip up and down the pavement
    if (W.lost) {
      const Lp = W.lost, cu = Lp.clerk.userData, c = (t % 1.3) / 1.3; cu.armR.rotation.x = c < 0.3 ? -1.6 + c / 0.3 * 1.4 : -0.2 - (c - 0.3) * 1.4; cu.armL.rotation.x = -0.6;
      const cyc = (t / 26) % 1, u = cyc < 0.5 ? cyc * 2 : 2 - cyc * 2, dir = cyc < 0.5 ? 1 : -1, d = Lp.d0 + (Lp.d1 - Lp.d0) * (u * u * (3 - 2 * u));
      const y = kit.yb(d) + kit.SH, bob = Math.abs(Math.sin(t * 7)) * 0.05;
      Lp.clip.position.set(Lp.x + 0.2, y + 0.62 + bob, -(d - 1.6)); Lp.clip.rotation.set(0, 0, Math.sin(t * 3.5) * 0.06);
      Lp.carriers.forEach((g, i) => { const dd = d + (i - 1) * 0.8; g.position.set(Lp.x + (i % 2 ? 0.25 : -0.05), kit.yb(dd) + kit.SH + Math.abs(Math.sin(t * 7 + i)) * 0.06, -dd); g.rotation.y = dir > 0 ? Math.PI : 0; const gu = g.userData; gu.armL.rotation.x = gu.armR.rotation.x = -2.9; gu.body.rotation.z = Math.sin(t * 7 + i) * 0.1; gu.legL.rotation.x = Math.sin(t * 7 + i) * 0.5; gu.legR.rotation.x = -Math.sin(t * 7 + i) * 0.5; });
    }
    // 8. the band: a steady beat, the conductor's baton, notes floating up; a fanfare when a gate opens
    if (W.band) {
      const Bd = W.band; if (gate) Bd.fan = 0; Bd.fan += dt;
      const fan = Bd.fan < 2.5 ? 1 : 0, beat = Math.abs(Math.sin(t * Math.PI * 2));
      Bd.gr.scale.set(1, 1, 1); Bd.gr.position.y = Bd.y0 + 0.05 + beat * 0.03 * (1 + fan);
      for (const p of Bd.players) { const u = p.g.userData; u.body.position.y = beat * 0.04 * (1 + fan * 2); p.ig.rotation.x = -0.15 - fan * 0.5 + Math.sin(t * 6.28 + p.ph) * 0.06; u.armL.rotation.x = u.armR.rotation.x = -1.3 - fan * 0.4; p.g.rotation.z = L.tilt * 0.3; }
      const du = Bd.drummer.userData; du.armR.rotation.x = -1.0 - Math.abs(Math.sin(t * Math.PI * 2)) * 1.2; du.armL.rotation.x = -1.0 - Math.abs(Math.cos(t * Math.PI * 2)) * 1.2;
      const cu = Bd.cond.userData; cu.armR.rotation.x = -2.0 + Math.sin(t * Math.PI * 2) * 0.6 - fan * 0.5; cu.armR.rotation.z = Math.cos(t * Math.PI * 2) * 0.4; cu.armL.rotation.x = -1.2 - fan * 1.2;
      for (const n of Bd.notes) { const c = (t * (0.28 + fan * 0.3) + n.ph) % 1; n.m.position.set(Bd.cx + n.x + Math.sin(c * 7 + n.ph * 9) * 0.3, Bd.y0 + 0.8 + c * 3.2, -Bd.d + n.z); n.m.material.opacity = Math.sin(c * Math.PI) * 0.95; n.m.rotation.y = Math.PI / 2 + Math.sin(c * 5) * 0.4; }
    }
    // 9. the newsstand board: the headline follows the news
    if (W.news) {
      const N = W.news; N.t += dt;
      const loose = st.loose && st.loose.some(s => s.d > D0 && s.d < D1);
      const want = tilt ? 'tilt' : gate ? 'gate' : flip ? 'flip' : null;
      if (want) { N.now = want; N.t = 0; } else if (loose && N.t > 4) { N.now = 'loose'; N.t = 0; } else if (N.t > 7 && N.now !== 'idle') { N.now = 'idle'; N.t = 0; }
      N.face.material = N.mats[N.now];
      const u = N.seller.userData; u.armR.rotation.x = N.now !== 'idle' ? -2.6 + Math.sin(t * 9) * 0.3 : -1.0 + Math.sin(t * 2) * 0.2; u.body.position.y = N.now !== 'idle' ? Math.abs(Math.sin(t * 8)) * 0.08 : 0;
    }
    // 10. the window cleaner: up and down the shopfront, squeegee going
    if (W.cleaner) {
      const Cl = W.cleaner, f = Cl.f, c = (t / 18) % 1, u = c < 0.5 ? c * 2 : 2 - c * 2, top = f.yLo + f.hTot + 0.05, y = f.yLo + f.plinth + 1.9 + u * (f.hTot - f.plinth - 2.4);
      const d = f.d + f.w * 0.5, x = f.xf - f.s * 0.3;
      Cl.g.position.set(x, y, -d); Cl.g.rotation.z = L.tilt * 0.4 + Math.sin(t * 1.3) * 0.02;
      Cl.cl.userData.armR.rotation.x = -1.6; Cl.cl.userData.armR.rotation.z = Math.sin(t * 5) * 0.8; Cl.cl.userData.armL.rotation.x = -0.4;
      Cl.ropes.forEach((r, i) => { const dz = i ? 0.75 : -0.75, len = top - y; r.scale.y = len; r.position.set(x, y + len / 2, -d + dz); });
    }
    // 11. the crossing guard: up with the sign when a loose ball rolls by; a fist shaken after it
    if (W.guard) {
      const G = W.guard, ls = (st.loose || []).filter(s => Math.abs(s.d - G.d) < 2.2).length > 0;
      G.a = ls ? 1.2 : Math.max(0, G.a - dt);
      const u = G.g.userData; u.armR.rotation.x = ls ? -2.8 : -1.4 + Math.sin(t * 1.5) * 0.1; u.armL.rotation.x = !ls && G.a > 0 ? -2.6 + Math.sin(t * 18) * 0.4 : 0;
      u.body.position.y = ls ? Math.abs(Math.sin(t * 10)) * 0.06 : 0; G.g.rotation.y = ls ? Math.sin(t * 6) * 0.6 : 0;
    }
    // 12. the washing flaps (wildly in a TILT)
    if (W.wash) for (const w of W.wash) { w.pv.rotation.x = Math.sin(t * 2.4 + w.ph) * 0.25; w.pv.rotation.z = L.tilt * 0.9 + Math.sin(t * 7 + w.ph) * 0.15 * (L.tilt ? 2 : 0.3); }
    void awake; void near;
  }

  return { build, update, W };
})();
