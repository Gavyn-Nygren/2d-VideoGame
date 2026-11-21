/* Pip & Bo - World 43 Arcade Cabinet: the shared arcade kit (ARCADE). Loaded on demand with the 3D kit (K3D.files,
   pushed by the World 43 levels), so it may use three.js (K3D.T) at load time.

   Inside an old arcade machine, at hero size: brass and dust from the old mechanical machine, neon and pixels from the
   game waking up inside it, and the pixel creatures who live in there. Everything a World 43 level reuses:
     ARCADE.seed(n)              the scenery's dice start again: EVERY WORLD 43 LEVEL CALLS IT FIRST THING IN ITS SCENE
                                 BUILD, so the machine stands exactly the same on every open, restart and replay. Then
                                 ARCADE.rnd() for scenery dice (never rules).
     ARCADE.dark(K, o)           the cabinet's darkness: near-black warm background, fog, a dim warm key light, a cool
                                 neon fill from above and amber from below, bloom on. o = { fog, fogD, bloom, key, fill }
     ARCADE.lights(K, max)       one instanced family of small bulbs / LEDs (PARK.bulbs from the World 42 kit when loaded):
                                 b.add(x, y, z, col, { size, speed, phase, blink }), b.line(a, b, gap, col, o), b.ring(c, r, n,
                                 col, o, axis), b.done()
     ARCADE.glows(K, max)        instanced soft glow sprites (always face the camera, additive, fog-aware, flicker):
                                 g.add(x, y, z, size, col, k = 1, flick = 0) -> index; g.set(i, x, y, z, size?); g.done()
     ARCADE.critters(K, max)     the pixel creatures: instanced glowing cubes animated in the shader. c.add(x, y, z, o) with
                                 o = { kind: 0-6 (blip, stack, crab, floaty, worker, twin, long), col, col2, act: 'idle'|'wave'|
                                 'cheer'|'work'|'walk'|'sleep'|'dance'|'fish'|'sit', yaw, s (size, 1 = 0.42 tall), ph }, c.done();
                                 c.react({ hero: [x, y, z], cheer: secs since a cheer, duck: secs since a jump, flee: [x, y, z, r] })
                                 each frame: creatures near the heroes turn to watch them, cheer, duck, flee and creep back
     ARCADE.motes(K, o)          dust in the light and floating pixels in a box round the camera (wraps, never runs out)
     ARCADE.shaft(K, a, b, r, col, k)    a beam of light through a vent or a slot, from a to b, radius r
     ARCADE.gear(K, o)           a brass gear: { r, teeth, th, hole, spokes, col, worn } -> mesh (spin it about its local Z)
     ARCADE.cable(K, pts, o)     a cloth-braided cable through points: { r, col, clips, labels } -> group
     ARCADE.chip(K, o)           a chip: legs, printed part number (made up), notch, dot: { w, d, h, label, col } -> group
     ARCADE.cap(K, o)            an electrolytic capacitor: { r, h, col, label }; ARCADE.resistor(K, o) colour bands
     ARCADE.screw(K, o), ARCADE.rivets(K, list, o)   slotted screws; a row of rivet heads (instanced)
     ARCADE.decal(K, kind, w, h, o)    a printed or written flat thing: 'note' (a service engineer's pencilled note and
                                 date), 'sticker' (a faded inspection sticker), 'diagram' (a wiring diagram), 'ticket' (a
                                 ticket stub), 'wrapper' (a gum wrapper), 'graffiti' (pixel-script graffiti), 'warn' (a
                                 hazard label) -> mesh (a plane facing +Z). o = { seed, text }
     ARCADE.neon(K, text, o)     a neon sign on a dark board (flickers now and then): { w, h, col, col2, font, flicker }
     ARCADE.pcbTex(o) / ARCADE.brassTex(col) / ARCADE.copperTex() / ARCADE.grimeTex()   painted textures
     ARCADE.web(K, c, r, o)      a spider's web with beads of solder for dew
     ARCADE.lost(K, kind, o)     lost things at hero scale: 'clip' (paper clip), 'hairclip', 'coin' (a foreign coin, made
                                 up), 'moth', 'button', 'pencil' -> group
   Every moving piece adds its own ticker (K.tick), driven by the drawn frame's clock: scenery only, never rules.
   All names, labels and creatures are original: nothing here copies a real arcade game. Level-only things (43-1's coins,
   its chute and route) live in the level's own files. */
'use strict';

const ARCADE = (function () {
  const T = K3D.T;
  const A = {};
  const hot = (hex, k) => new T.Color(hex).multiplyScalar(k);
  A.hot = hot;
  // the scenery's dice (scenery only, never rules): every World 43 level calls ARCADE.seed() first in its scene build
  let seedS = 4343;
  const rnd = () => { seedS = (seedS * 16807) % 2147483647; return seedS / 2147483647; };
  A.rnd = rnd;
  A.seed = (n = 4343) => { seedS = n; };
  const pick = arr => arr[Math.floor(rnd() * arr.length) % arr.length];
  A.pick = pick;
  const M = (key, make) => K3D.mat('arc|' + key, make);
  A.toonM = (col, o) => M('t|' + col + (o ? JSON.stringify(o) : ''), () => K3D.toon(col, o));
  A.flatM = (col, k = 1, o) => M('f|' + col + '|' + k + (o ? JSON.stringify(o) : ''), () => K3D.flat(hot(col, k), o));
  A.INK = '#120d14';
  A.NEON = ['#5aff8a', '#4ae8ff', '#ff5ad6', '#ffe24a', '#fff0b0', '#ff8a4a', '#9a8aff', '#7affd8'];

  /* ---------- painted textures ---------- */
  // scratched, worn brass: streaks along one way, fingerprints, dust in the corners, a few dents
  A.brassTex = (col = '#c89a48', o = {}) => K3D.paint('arc-brass|' + col + (o.dark ? 'd' : ''), 256, 256, (c, w, h) => {
    c.fillStyle = col; c.fillRect(0, 0, w, h);
    const g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, 'rgba(255,240,200,0.12)'); g.addColorStop(0.5, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(60,30,0,0.18)');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) { c.strokeStyle = rnd() < 0.5 ? `rgba(255,236,190,${0.04 + rnd() * 0.1})` : `rgba(60,34,8,${0.05 + rnd() * 0.12})`; c.lineWidth = 0.5 + rnd(); c.beginPath(); const x = rnd() * w, y = rnd() * h; c.moveTo(x, y); c.lineTo(x + 8 + rnd() * 50, y + (rnd() - 0.5) * 4); c.stroke(); }
    for (let i = 0; i < 6; i++) { const x = rnd() * w, y = rnd() * h; for (let k = 0; k < 6; k++) { c.strokeStyle = 'rgba(60,40,20,0.08)'; c.lineWidth = 0.7; c.beginPath(); c.ellipse(x, y, 3 + k * 1.6, 4 + k * 2, 0.4, 0, Math.PI * 2); c.stroke(); } }
    for (let i = 0; i < 12; i++) { c.fillStyle = `rgba(30,18,6,${0.06 + rnd() * 0.08})`; c.beginPath(); c.arc(rnd() * w, rnd() * h, 3 + rnd() * 12, 0, Math.PI * 2); c.fill(); }
    for (let i = 0; i < 4; i++) { c.fillStyle = 'rgba(90,140,90,0.10)'; c.beginPath(); c.arc(rnd() * w, rnd() * h, 6 + rnd() * 14, 0, Math.PI * 2); c.fill(); } // verdigris
    if (o.dark) { c.fillStyle = 'rgba(20,10,0,0.35)'; c.fillRect(0, 0, w, h); }
  }, { repeat: true });
  A.copperTex = () => K3D.paint('arc-copper', 128, 128, (c, w, h) => {
    c.fillStyle = '#b8642e'; c.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 3) { c.fillStyle = y % 6 ? 'rgba(255,190,140,0.18)' : 'rgba(60,20,0,0.2)'; c.fillRect(0, y, w, 1.5); }
    for (let i = 0; i < 40; i++) { c.fillStyle = `rgba(40,90,70,${rnd() * 0.15})`; c.fillRect(rnd() * w, rnd() * h, 2 + rnd() * 8, 1 + rnd() * 3); }
  }, { repeat: true });
  A.grimeTex = () => K3D.paint('arc-grime', 256, 256, (c, w, h) => {
    c.fillStyle = '#3a3438'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 1400; i++) { c.fillStyle = `rgba(${rnd() < 0.5 ? '255,240,220' : '0,0,0'},${rnd() * 0.06})`; c.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 3, 1 + rnd() * 3); }
    for (let i = 0; i < 8; i++) { c.fillStyle = 'rgba(10,6,8,0.18)'; c.beginPath(); c.arc(rnd() * w, rnd() * h, 10 + rnd() * 40, 0, Math.PI * 2); c.fill(); }
  }, { repeat: true });
  // a printed circuit board: solder mask, copper traces with pads and vias, silkscreen part outlines and made-up labels
  A.pcbTex = (o = {}) => K3D.paint('arc-pcb|' + (o.col || '#1f6a3c') + (o.seed || 0), 512, 512, (c, w, h) => {
    const s0 = seedS; seedS = 777 + (o.seed || 0);
    c.fillStyle = o.col || '#1f6a3c'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) { c.fillStyle = `rgba(0,0,0,${rnd() * 0.05})`; c.fillRect(rnd() * w, rnd() * h, 2, 2); }
    // traces: right-angle runs with 45-degree corners, in bundles
    c.lineCap = 'round';
    for (let b = 0; b < 26; b++) {
      let x = Math.round(rnd() * 32) * 16, y = Math.round(rnd() * 32) * 16;
      const n = 1 + Math.floor(rnd() * 5), dir = rnd() < 0.5;
      for (let k = 0; k < n; k++) {
        c.strokeStyle = 'rgba(212,160,70,0.85)'; c.lineWidth = 3;
        c.beginPath(); const ox = dir ? 0 : k * 8, oy = dir ? k * 8 : 0; c.moveTo(x + ox, y + oy);
        let px = x + ox, py = y + oy;
        for (let seg = 0; seg < 4; seg++) { const L = 30 + rnd() * 110; if ((seg + (dir ? 1 : 0)) % 2) px += L * (rnd() < 0.5 ? 1 : -1); else py += L * (rnd() < 0.5 ? 1 : -1); c.lineTo(px, py); }
        c.stroke();
        c.fillStyle = '#e8c070'; c.beginPath(); c.arc(px, py, 4.5, 0, Math.PI * 2); c.fill(); c.fillStyle = '#1a1a1a'; c.beginPath(); c.arc(px, py, 1.8, 0, Math.PI * 2); c.fill();
      }
    }
    // silkscreen outlines and labels
    c.strokeStyle = 'rgba(240,240,220,0.75)'; c.fillStyle = 'rgba(240,240,220,0.8)'; c.lineWidth = 1.5; c.font = 'bold 11px monospace';
    for (let i = 0; i < 14; i++) {
      const x = rnd() * (w - 60), y = rnd() * (h - 40), bw = 20 + rnd() * 50, bh = 12 + rnd() * 30;
      c.strokeRect(x, y, bw, bh);
      c.fillText(pick(['R', 'C', 'U', 'Q', 'D', 'L', 'J']) + (1 + Math.floor(rnd() * 99)), x + 2, y - 3);
    }
    c.font = 'bold 13px monospace'; c.fillText('PB-43 MAIN  REV C', 20 + rnd() * 200, 30 + rnd() * 440);
    c.fillText('MADE BY HAND IN THE BACK ROOM', 20 + rnd() * 120, 30 + rnd() * 440);
    seedS = s0;
  }, { repeat: true });
  // cloth braid on a cable
  A.braidTex = col => K3D.paint('arc-braid|' + col, 64, 64, (c, w, h) => {
    c.fillStyle = col; c.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 8) for (let x = 0; x < w; x += 8) { c.fillStyle = ((x + y) / 8) % 2 ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.2)'; c.beginPath(); c.moveTo(x, y + 4); c.lineTo(x + 4, y); c.lineTo(x + 8, y + 4); c.lineTo(x + 4, y + 8); c.closePath(); c.fill(); }
  }, { repeat: true });
  A.glowTex = () => K3D.paint('arc-glow', 128, 128, (c, w, h) => {
    const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.22, 'rgba(255,255,255,0.5)'); g.addColorStop(0.55, 'rgba(255,255,255,0.12)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
  });

  /* ---------- the darkness ---------- */
  A.dark = function (K, o = {}) {
    const fogCol = new T.Color(o.fog || '#0e0a10');
    K.scene.background = new T.Color(o.bg || '#06050a');
    K.scene.fog = new T.FogExp2(fogCol, o.fogD != null ? o.fogD : 0.011);
    K.fogCol = fogCol;
    // lit faces: a dim warm key and a little ambient; the rest of the light comes from the glows and bulbs (bloom)
    K.amb.color.set(o.amb || '#5a4a66'); K.amb.intensity = (o.ambK != null ? o.ambK : 0.42) * Math.PI;
    K.sun.color.set(o.key || '#ffd9a0'); K.sun.intensity = (o.keyK != null ? o.keyK : 0.5) * Math.PI;
    const hemi = new T.HemisphereLight(o.fill || '#3ad8ff', o.under || '#ff9a3a', (o.hemiK != null ? o.hemiK : 0.34) * Math.PI); K.scene.add(hemi); K.hemi = hemi;
    K.bloom = { strength: o.bloom != null ? o.bloom : 1.0, threshold: 1.0, radius: 1.15 };
    K.maxBlur = 1.6; K.focusRange = 40;
    return { fogCol, hemi };
  };

  /* ---------- small lights: bulbs and LEDs ---------- */
  A.lights = function (K, max = 12000) {
    if (typeof PARK !== 'undefined' && PARK.bulbs) { const b = PARK.bulbs(K, max); b.u.uFogD.value = (K.scene.fog && K.scene.fog.density) || 0.01; return b; }
    // (without the World 42 kit: plain glowing spheres, one instanced mesh)
    const im = new T.InstancedMesh(new T.IcosahedronGeometry(1, 1), new T.MeshBasicMaterial({ toneMapped: false }), max); im.count = 0; im.frustumCulled = false;
    const m4 = new T.Matrix4(), c = new T.Color();
    const b = { mesh: im, n: 0, add(x, y, z, col = '#ffd890', o = {}) { if (this.n >= max) return -1; const i = this.n++, s = o.size || 0.1; m4.makeScale(s, s, s).setPosition(x, y, z); im.setMatrixAt(i, m4); im.setColorAt(i, c.set(col).multiplyScalar(2)); return i; },
      line(a, bb, gap, col, o = {}) { const d = Math.hypot(bb[0] - a[0], bb[1] - a[1], bb[2] - a[2]), n = Math.max(1, Math.round(d / gap)); for (let k = 0; k <= n; k++) { const t = k / n; this.add(a[0] + (bb[0] - a[0]) * t, a[1] + (bb[1] - a[1]) * t, a[2] + (bb[2] - a[2]) * t, Array.isArray(col) ? col[k % col.length] : col, o); } },
      ring(cc, r, n, col, o = {}, axis = 'y') { for (let k = 0; k < n; k++) { const an = k / n * Math.PI * 2, ca = Math.cos(an) * r, sa = Math.sin(an) * r; const p = axis === 'y' ? [cc[0] + ca, cc[1], cc[2] + sa] : axis === 'z' ? [cc[0] + ca, cc[1] + sa, cc[2]] : [cc[0], cc[1] + sa, cc[2] + ca]; this.add(p[0], p[1], p[2], Array.isArray(col) ? col[k % col.length] : col, o); } },
      done() { im.count = this.n; im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; return im; } };
    K.add(im);
    return b;
  };

  /* ---------- soft glows: instanced camera-facing sprites ---------- */
  A.glows = function (K, max = 4000) {
    const geo = new T.PlaneGeometry(1, 1);
    const aPos = new Float32Array(max * 4), aCol = new Float32Array(max * 4);
    const u = { uT: { value: 0 }, uMap: { value: A.glowTex() }, uFog: { value: K.fogCol || new T.Color('#0e0a10') }, uFogD: { value: (K.scene.fog && K.scene.fog.density) || 0.01 } };
    const mat = new T.ShaderMaterial({ uniforms: u, transparent: true, depthWrite: false, blending: T.AdditiveBlending,
      vertexShader: `attribute vec4 aPos; attribute vec4 aCol; uniform float uT, uFogD; varying vec2 vUv; varying vec3 vC;
        void main() {
          vUv = uv;
          vec4 mv = viewMatrix * vec4(aPos.xyz, 1.0);
          float fl = aCol.w > 0.0 ? (0.75 + 0.25 * sin(uT * (3.0 + aCol.w * 9.0) + aPos.x * 3.1 + aPos.z)) * (step(0.04, fract(uT * 0.13 + aPos.y * 0.37)) * 0.6 + 0.4) : 1.0;
          mv.xy += position.xy * aPos.w;
          float f = exp(-uFogD * uFogD * dot(mv.xyz, mv.xyz) * 0.6);
          vC = aCol.rgb * fl * f;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: 'uniform sampler2D uMap; varying vec2 vUv; varying vec3 vC; void main() { float a = texture2D(uMap, vUv).r; gl_FragColor = vec4(vC * a, 1.0); }' });
    const ig = new T.InstancedBufferGeometry(); ig.index = geo.index; ig.setAttribute('position', geo.attributes.position); ig.setAttribute('uv', geo.attributes.uv);
    const pa = new T.InstancedBufferAttribute(aPos, 4), ca = new T.InstancedBufferAttribute(aCol, 4);
    pa.setUsage(T.DynamicDrawUsage);
    ig.setAttribute('aPos', pa); ig.setAttribute('aCol', ca); ig.instanceCount = 0;
    const m = new T.Mesh(ig, mat); m.frustumCulled = false; m.renderOrder = 5; m.userData.live = true;
    K.add(m); K.tick(dt => { u.uT.value += dt; });
    const col = new T.Color();
    const g = { mesh: m, n: 0,
      add(x, y, z, size, c, k = 1, flick = 0) { if (this.n >= max) return -1; const i = this.n++; aPos.set([x, y, z, size], i * 4); col.set(c); aCol.set([col.r * k, col.g * k, col.b * k, flick], i * 4); return i; },
      set(i, x, y, z, size) { aPos[i * 4] = x; aPos[i * 4 + 1] = y; aPos[i * 4 + 2] = z; if (size != null) aPos[i * 4 + 3] = size; pa.needsUpdate = true; },
      color(i, c, k = 1) { col.set(c); aCol[i * 4] = col.r * k; aCol[i * 4 + 1] = col.g * k; aCol[i * 4 + 2] = col.b * k; ca.needsUpdate = true; },
      done() { ig.instanceCount = this.n; pa.needsUpdate = true; ca.needsUpdate = true; return m; } };
    return g;
  };

  /* ---------- the pixel creatures ----------
     Each creature is a few cubes (body, eyes, pupils, legs, arms, a hat or antenna). One InstancedMesh draws every cube of
     every creature; the shader moves them (bob, wave, cheer, work, walk, sleep, dance, fish), turns a creature to watch
     the heroes when they are near, makes it jump for a cheer, duck from a jump, flee the Sweeper and creep back. */
  const KINDS = [
    // [part, offset xyz, size xyz, colour slot] slot: 0 body, 1 body dark, 2 eye white, 3 pupil, 4 accent (glow), 5 hat yellow
    // 0 blip: a chunky cube with big eyes, little legs and arms
    [[0, [0, 0.62, 0], [1, 0.86, 0.8], 0], [1, [-0.22, 0.72, 0.41], [0.26, 0.28, 0.04], 2], [1, [0.22, 0.72, 0.41], [0.26, 0.28, 0.04], 2], [1, [-0.22, 0.7, 0.44], [0.12, 0.14, 0.04], 3], [1, [0.22, 0.7, 0.44], [0.12, 0.14, 0.04], 3],
      [2, [-0.26, 0.1, 0], [0.22, 0.24, 0.24], 1], [3, [0.26, 0.1, 0], [0.22, 0.24, 0.24], 1], [4, [-0.6, 0.6, 0], [0.18, 0.42, 0.18], 1], [5, [0.6, 0.6, 0], [0.18, 0.42, 0.18], 1]],
    // 1 stack: three blocks and an antenna with a glowing tip
    [[0, [0, 0.22, 0], [0.62, 0.42, 0.56], 1], [0, [0, 0.62, 0], [0.56, 0.4, 0.52], 0], [0, [0, 1.0, 0], [0.5, 0.38, 0.48], 0], [1, [-0.12, 1.04, 0.25], [0.14, 0.16, 0.03], 2], [1, [0.12, 1.04, 0.25], [0.14, 0.16, 0.03], 2],
      [1, [-0.12, 1.03, 0.27], [0.07, 0.08, 0.03], 3], [1, [0.12, 1.03, 0.27], [0.07, 0.08, 0.03], 3], [6, [0, 1.36, 0], [0.05, 0.34, 0.05], 1], [6, [0, 1.56, 0], [0.13, 0.13, 0.13], 4], [4, [-0.38, 0.62, 0], [0.14, 0.32, 0.14], 1], [5, [0.38, 0.62, 0], [0.14, 0.32, 0.14], 1]],
    // 2 crab: wide and flat, four legs, eyes on stalks
    [[0, [0, 0.36, 0], [1.3, 0.42, 0.8], 0], [2, [-0.5, 0.1, 0.25], [0.14, 0.3, 0.14], 1], [3, [0.5, 0.1, 0.25], [0.14, 0.3, 0.14], 1], [2, [-0.5, 0.1, -0.25], [0.14, 0.3, 0.14], 1], [3, [0.5, 0.1, -0.25], [0.14, 0.3, 0.14], 1],
      [6, [-0.25, 0.7, 0.2], [0.07, 0.3, 0.07], 1], [6, [0.25, 0.7, 0.2], [0.07, 0.3, 0.07], 1], [1, [-0.25, 0.9, 0.2], [0.2, 0.2, 0.2], 2], [1, [0.25, 0.9, 0.2], [0.2, 0.2, 0.2], 2], [1, [-0.25, 0.9, 0.3], [0.09, 0.09, 0.04], 3], [1, [0.25, 0.9, 0.3], [0.09, 0.09, 0.04], 3],
      [4, [-0.82, 0.42, 0.1], [0.3, 0.16, 0.2], 4], [5, [0.82, 0.42, 0.1], [0.3, 0.16, 0.2], 4]],
    // 3 floaty: a plus of five cubes with one big eye, hovering
    [[0, [0, 0.9, 0], [0.5, 0.5, 0.5], 0], [0, [-0.42, 0.9, 0], [0.34, 0.34, 0.34], 1], [0, [0.42, 0.9, 0], [0.34, 0.34, 0.34], 1], [0, [0, 1.32, 0], [0.34, 0.34, 0.34], 1], [0, [0, 0.48, 0], [0.34, 0.34, 0.34], 1],
      [1, [0, 0.92, 0.26], [0.3, 0.3, 0.04], 2], [1, [0, 0.9, 0.29], [0.14, 0.14, 0.03], 3], [6, [0, 0.18, 0], [0.12, 0.12, 0.12], 4]],
    // 4 worker: a blip in a hard hat with a spanner arm
    [[0, [0, 0.6, 0], [0.9, 0.8, 0.74], 0], [1, [-0.2, 0.7, 0.38], [0.22, 0.24, 0.04], 2], [1, [0.2, 0.7, 0.38], [0.22, 0.24, 0.04], 2], [1, [-0.2, 0.68, 0.41], [0.1, 0.12, 0.03], 3], [1, [0.2, 0.68, 0.41], [0.1, 0.12, 0.03], 3],
      [6, [0, 1.08, 0], [0.84, 0.2, 0.7], 5], [6, [0, 1.0, 0.24], [0.9, 0.06, 0.4], 5], [2, [-0.24, 0.1, 0], [0.2, 0.22, 0.22], 1], [3, [0.24, 0.1, 0], [0.2, 0.22, 0.22], 1],
      [4, [-0.56, 0.58, 0], [0.16, 0.38, 0.16], 1], [5, [0.56, 0.62, 0.1], [0.16, 0.42, 0.16], 1], [5, [0.56, 0.9, 0.18], [0.1, 0.36, 0.1], 7]],
    // 5 twin: two little cubes holding hands
    [[0, [-0.3, 0.32, 0], [0.48, 0.48, 0.44], 0], [0, [0.3, 0.32, 0], [0.48, 0.48, 0.44], 4], [1, [-0.3, 0.38, 0.23], [0.16, 0.16, 0.03], 2], [1, [0.3, 0.38, 0.23], [0.16, 0.16, 0.03], 2],
      [1, [-0.3, 0.37, 0.25], [0.08, 0.08, 0.03], 3], [1, [0.3, 0.37, 0.25], [0.08, 0.08, 0.03], 3], [6, [0, 0.3, 0], [0.2, 0.06, 0.06], 1]],
    // 6 long: a caterpillar of four cubes (it walks in waves)
    [[0, [0.66, 0.28, 0], [0.42, 0.42, 0.42], 0], [0, [0.22, 0.26, 0], [0.4, 0.38, 0.4], 1], [0, [-0.22, 0.26, 0], [0.4, 0.38, 0.4], 0], [0, [-0.64, 0.24, 0], [0.36, 0.34, 0.36], 1],
      [1, [0.76, 0.34, 0.2], [0.12, 0.14, 0.03], 2], [1, [0.56, 0.34, 0.2], [0.12, 0.14, 0.03], 2], [1, [0.76, 0.33, 0.22], [0.06, 0.07, 0.03], 3], [1, [0.56, 0.33, 0.22], [0.06, 0.07, 0.03], 3], [6, [0.7, 0.58, 0], [0.06, 0.2, 0.06], 4]],
  ];
  A.KINDS = KINDS;
  const ACTS = { idle: 0, wave: 1, cheer: 2, work: 3, walk: 4, sleep: 5, dance: 6, fish: 7, sit: 8 };
  A.critters = function (K, max = 6000) {
    const geo = new T.BoxGeometry(1, 1, 1);
    const ig = new T.InstancedBufferGeometry(); ig.index = geo.index;
    ig.setAttribute('position', geo.attributes.position); ig.setAttribute('normal', geo.attributes.normal);
    const n = max * 9;
    const aBase = new Float32Array(n * 4), aOff = new Float32Array(n * 4), aSz = new Float32Array(n * 3), aCol = new Float32Array(n * 3), aAnim = new Float32Array(n * 4);
    ig.setAttribute('aBase', new T.InstancedBufferAttribute(aBase, 4)); ig.setAttribute('aOff', new T.InstancedBufferAttribute(aOff, 4));
    ig.setAttribute('aSz', new T.InstancedBufferAttribute(aSz, 3)); ig.setAttribute('aCol', new T.InstancedBufferAttribute(aCol, 3)); ig.setAttribute('aAnim', new T.InstancedBufferAttribute(aAnim, 4));
    const u = { uT: { value: 0 }, uHero: { value: new T.Vector3(0, -1e4, 0) }, uCheer: { value: 99 }, uDuck: { value: 99 }, uFlee: { value: new T.Vector4(0, -1e4, 0, 0) },
      uFog: { value: K.fogCol || new T.Color('#0e0a10') }, uFogD: { value: (K.scene.fog && K.scene.fog.density) || 0.01 } };
    const mat = new T.ShaderMaterial({ uniforms: u,
      vertexShader: `attribute vec4 aBase; attribute vec4 aOff; attribute vec3 aSz; attribute vec3 aCol; attribute vec4 aAnim;
        uniform float uT, uCheer, uDuck, uFogD; uniform vec3 uHero; uniform vec4 uFlee; varying vec3 vC; varying float vFog;
        void main() {
          float ph = aAnim.x, act = aAnim.y, yaw = aAnim.z, sc = aAnim.w, part = aOff.w;
          vec3 base = aBase.xyz;
          // react to the heroes: watch them, cheer, duck; flee the Sweeper
          vec3 dh = uHero - base; float dH = length(dh.xz) + abs(dh.y) * 0.5;
          float near = 1.0 - smoothstep(10.0, 22.0, dH);
          float face = atan(dh.x, dh.z);
          float dy = face - yaw; dy = atan(sin(dy), cos(dy));
          float yw = yaw + dy * near * 0.85 * step(act, 7.5);
          vec3 fl = base - uFlee.xyz; float dF = length(fl);
          float flee = uFlee.w * (1.0 - smoothstep(4.0, 14.0, dF));
          base.xz += normalize(fl.xz + vec2(0.001)) * flee * 2.4 * sc;
          float hop = 0.0, squash = 1.0, t = uT + ph;
          float cheer = (1.0 - smoothstep(0.0, 1.8, uCheer)) * (1.0 - smoothstep(14.0, 30.0, dH));
          hop += cheer * abs(sin(t * 9.0)) * 0.55;
          float duck = (1.0 - smoothstep(0.0, 0.5, uDuck)) * near;
          squash -= duck * 0.35;
          vec3 o = aOff.xyz;
          // acts
          if (act < 0.5) { hop += abs(sin(t * 2.2)) * 0.06; }
          else if (act < 1.5) { if (part > 4.5 && part < 5.5) { o.y += 0.3 + sin(t * 9.0) * 0.18; o.x += 0.05; } hop += abs(sin(t * 2.0)) * 0.05; }
          else if (act < 2.5) { hop += abs(sin(t * 7.0)) * 0.4; if (part > 3.5 && part < 5.5) o.y += 0.35; }
          else if (act < 3.5) { if (part > 4.5 && part < 5.5) { o.y += sin(t * 8.0) * 0.16; o.z += 0.12 + sin(t * 8.0) * 0.1; } }
          else if (act < 4.5) { base.x += sin(t * 0.35) * 1.4 * sc * cos(yaw); base.z += sin(t * 0.35) * 1.4 * sc * -sin(yaw); hop += abs(sin(t * 8.0)) * 0.08; if (part > 1.5 && part < 3.5) o.y += max(0.0, sin(t * 8.0 + part * 3.14)) * 0.1; }
          else if (act < 5.5) { squash *= 0.92 + 0.08 * sin(t * 1.3); }
          else if (act < 6.5) { hop += abs(sin(t * 6.0)) * 0.25; o.x += sin(t * 3.0) * 0.12; if (part > 3.5 && part < 5.5) o.y += 0.25 + sin(t * 6.0 + part) * 0.15; }
          else if (act < 7.5) { if (part > 4.5 && part < 5.5) { o.z += 0.3; o.y += 0.15 + sin(t * 0.9) * 0.05; } }
          else { o.y -= 0.12; }
          if (part > 5.5 && part < 6.5) o.x += sin(t * 3.0) * 0.03;
          vec3 p = position * aSz;
          p += o;
          p.y = p.y * squash;
          p *= sc;
          float c = cos(yw), s = sin(yw);
          p = vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
          vec3 wp = base + p + vec3(0.0, (hop + flee * 0.4) * sc, 0.0);
          vec3 n = normal; n = vec3(c * n.x + s * n.z, n.y, -s * n.x + c * n.z);
          float lit = 0.72 + 0.28 * n.y + 0.12 * n.z;
          vC = aCol * lit;
          vec4 mv = viewMatrix * vec4(wp, 1.0);
          vFog = 1.0 - exp(-uFogD * uFogD * dot(mv.xyz, mv.xyz));
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: 'uniform vec3 uFog; varying vec3 vC; varying float vFog; void main() { gl_FragColor = vec4(mix(vC, uFog, vFog), 1.0); }' });
    const mesh = new T.Mesh(ig, mat); mesh.frustumCulled = false; mesh.userData.live = true;
    K.add(mesh); K.tick(dt => { u.uT.value += dt; });
    let k = 0; const list = [];
    const col = new T.Color();
    const c = { mesh, u, list,
      add(x, y, z, o = {}) {
        const kind = o.kind != null ? o.kind : Math.floor(rnd() * KINDS.length), parts = KINDS[kind % KINDS.length];
        if (k + parts.length > n) return null;
        const base = new T.Color(o.col || pick(A.NEON)), slot = [
          base.clone().multiplyScalar(o.glow != null ? o.glow : 1.25), base.clone().multiplyScalar(0.62), new T.Color('#f8f4ea').multiplyScalar(1.1), new T.Color('#16121a'),
          new T.Color(o.col2 || pick(A.NEON)).multiplyScalar(1.6), new T.Color('#ffd23a').multiplyScalar(1.05), null, new T.Color('#b8b8c0')];
        const ph = o.ph != null ? o.ph : rnd() * 20, act = ACTS[o.act || 'idle'] || 0, yaw = o.yaw != null ? o.yaw : rnd() * 6.28, s = (o.s || 1) * 0.42;
        for (const [part, off, sz, sl] of parts) {
          aBase.set([x, y, z, 0], k * 4); aOff.set([off[0], off[1], off[2], part], k * 4); aSz.set(sz, k * 3);
          col.copy(slot[sl] || slot[0]); aCol.set([col.r, col.g, col.b], k * 3); aAnim.set([ph, act, yaw, s], k * 4); k++;
        }
        const cr = { x, y, z, kind, act: o.act || 'idle' }; list.push(cr); return cr;
      },
      done() { ig.instanceCount = k; for (const nm of ['aBase', 'aOff', 'aSz', 'aCol', 'aAnim']) ig.attributes[nm].needsUpdate = true; return mesh; },
      // each drawn frame: where the heroes are and what just happened
      react(o) {
        if (o.hero) u.uHero.value.set(o.hero[0], o.hero[1], o.hero[2]);
        if (o.cheer != null) u.uCheer.value = o.cheer;
        if (o.duck != null) u.uDuck.value = o.duck;
        if (o.flee) u.uFlee.value.set(o.flee[0], o.flee[1], o.flee[2], o.flee[3]); else u.uFlee.value.w = 0;
      },
      count: () => list.length };
    return c;
  };

  /* ---------- dust in the light, floating pixels ---------- */
  A.motes = function (K, o = {}) {
    const n = o.n || 2600, B = o.box || 46;
    const pos = new Float32Array(n * 3), ph = new Float32Array(n * 2), col = new Float32Array(n * 3);
    const c = new T.Color();
    for (let i = 0; i < n; i++) {
      pos[i * 3] = rnd() * B; pos[i * 3 + 1] = rnd() * B; pos[i * 3 + 2] = rnd() * B;
      const pix = rnd() < (o.pixels != null ? o.pixels : 0.18);
      ph[i * 2] = rnd() * 6.28; ph[i * 2 + 1] = pix ? 1 : 0;
      c.set(pix ? pick(A.NEON) : pick(['#ffe2b0', '#ffd090', '#fff4dc'])); const k = pix ? 1.4 : 0.9;
      col[i * 3] = c.r * k; col[i * 3 + 1] = c.g * k; col[i * 3 + 2] = c.b * k;
    }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('aPh', new T.BufferAttribute(ph, 2)); g.setAttribute('aCol', new T.BufferAttribute(col, 3));
    const u = { uT: { value: 0 }, uCam: { value: new T.Vector3() }, uB: { value: B }, uPx: { value: 1 }, uFogD: { value: (K.scene.fog && K.scene.fog.density) || 0.01 }, uK: { value: o.k || 1 } };
    const m = new T.ShaderMaterial({ uniforms: u, transparent: true, depthWrite: false, blending: T.AdditiveBlending,
      vertexShader: `attribute vec2 aPh; attribute vec3 aCol; uniform float uT, uB, uPx, uFogD, uK; uniform vec3 uCam; varying vec3 vC; varying float vPix;
        void main() {
          vec3 p = position + vec3(sin(uT * 0.21 + aPh.x) * 1.5, uT * (aPh.y > 0.5 ? 0.25 : -0.12) + sin(uT * 0.3 + aPh.x * 2.0), cos(uT * 0.17 + aPh.x) * 1.5);
          p = mod(p - uCam + uB * 0.5, uB) - uB * 0.5 + uCam;
          vec4 mv = viewMatrix * vec4(p, 1.0);
          float d = -mv.z;
          float tw = aPh.y > 0.5 ? (0.6 + 0.4 * step(0.5, fract(uT * 0.7 + aPh.x))) : (0.55 + 0.45 * sin(uT * 1.7 + aPh.x * 5.0));
          float edge = 1.0 - smoothstep(uB * 0.32, uB * 0.5, length(p - uCam));
          vC = aCol * tw * edge * exp(-uFogD * uFogD * d * d * 0.5) * uK; vPix = aPh.y;
          gl_PointSize = (aPh.y > 0.5 ? 34.0 : 22.0) * uPx / max(1.0, d);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `varying vec3 vC; varying float vPix; void main() { vec2 q = gl_PointCoord - 0.5;
          float a = vPix > 0.5 ? step(max(abs(q.x), abs(q.y)), 0.32) : smoothstep(0.5, 0.0, length(q));
          gl_FragColor = vec4(vC * a, 1.0); }` });
    const pts = new T.Points(g, m); pts.frustumCulled = false; pts.renderOrder = 6; pts.userData.live = true;
    K.add(pts);
    K.tick(dt => { u.uT.value += dt; u.uCam.value.copy(K.camera.position); u.uPx.value = Math.max(1, K3D.R.domElement.height / 540); });
    return { pts, u };
  };

  /* ---------- light shafts ---------- */
  A.shaft = function (K, a, b, r = 1.2, col = '#ffe2b0', k = 0.35) {
    const va = new T.Vector3(...a), vb = new T.Vector3(...b), len = va.distanceTo(vb);
    const geo = K3D.geo('arc-shaft', () => { const g = new T.CylinderGeometry(1, 1.8, 1, 20, 1, true); g.translate(0, -0.5, 0); return g; });
    const mat = new T.ShaderMaterial({ uniforms: { uC: { value: hot(col, k) }, uT: { value: 0 } }, transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide,
      vertexShader: 'varying float vY; varying vec3 vN; varying vec3 vV; void main() { vY = -position.y; vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform vec3 uC; uniform float uT; varying float vY; varying vec3 vN; varying vec3 vV; void main() { float e = pow(abs(dot(vN, vV)), 1.6); float f = (1.0 - vY) * smoothstep(0.0, 0.08, vY); float w = 0.85 + 0.15 * sin(uT * 0.7 + vY * 9.0); gl_FragColor = vec4(uC * e * f * w, 1.0); }' });
    const m = new T.Mesh(geo, mat);
    m.position.copy(va); m.scale.set(r, len, r);
    m.quaternion.setFromUnitVectors(new T.Vector3(0, -1, 0), vb.clone().sub(va).normalize());
    m.renderOrder = 4; m.userData.live = true; m.frustumCulled = false;
    K.add(m); K.tick(dt => { mat.uniforms.uT.value += dt; });
    return m;
  };

  /* ---------- props ---------- */
  // a brass gear: teeth, a rim, spokes with holes between them, a hub with a key slot; in the XY plane, spins about Z
  A.gearGeo = function (r = 3, teeth = 24, th = 0.6, o = {}) {
    const key = 'arc-gear|' + r + '|' + teeth + '|' + th + '|' + (o.spokes || 0) + (o.solid ? 's' : '');
    return K3D.geo(key, () => {
      const sh = new T.Shape(), tw = Math.PI * 2 / teeth, ro = r, ri = r - Math.min(0.5, r * 0.12);
      for (let i = 0; i < teeth; i++) {
        const a = i * tw;
        const pts = [[a, ri], [a + tw * 0.18, ro], [a + tw * 0.5, ro], [a + tw * 0.68, ri]];
        pts.forEach(([aa, rr], k) => { const x = Math.cos(aa) * rr, y = Math.sin(aa) * rr; if (i === 0 && k === 0) sh.moveTo(x, y); else sh.lineTo(x, y); });
        sh.lineTo(Math.cos(a + tw) * ri, Math.sin(a + tw) * ri);
      }
      const spokes = o.spokes != null ? o.spokes : (r > 1.2 ? 5 : 0);
      if (!o.solid && spokes) {
        const rin = ri * 0.78, rhub = Math.max(0.25, r * 0.22);
        for (let i = 0; i < spokes; i++) {
          const a0 = i / spokes * Math.PI * 2 + 0.25, a1 = (i + 1) / spokes * Math.PI * 2 - 0.25, hole = new T.Path();
          hole.moveTo(Math.cos(a0) * rhub * 1.6, Math.sin(a0) * rhub * 1.6);
          for (let k = 0; k <= 10; k++) { const aa = a0 + (a1 - a0) * k / 10; hole.lineTo(Math.cos(aa) * rin, Math.sin(aa) * rin); }
          hole.lineTo(Math.cos(a1) * rhub * 1.6, Math.sin(a1) * rhub * 1.6);
          sh.holes.push(hole);
        }
      }
      const axle = new T.Path(); axle.absarc(0, 0, Math.max(0.08, r * 0.07), 0, Math.PI * 2, true); sh.holes.push(axle);
      const g = new T.ExtrudeGeometry(sh, { depth: th, bevelEnabled: true, bevelThickness: Math.min(0.06, th * 0.15), bevelSize: Math.min(0.05, r * 0.02), bevelSegments: 1, curveSegments: 6 });
      g.translate(0, 0, -th / 2);
      // uv in world-ish units so the brass texture's scratches keep their size
      const p = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) * 0.25, p.getY(i) * 0.25 + p.getZ(i) * 0.25);
      return g;
    });
  };
  A.gear = function (K, o = {}) {
    const r = o.r || 3, g = new T.Group();
    const mat = M('gear|' + (o.col || '#c8963e') + (o.dark ? 'd' : ''), () => K3D.toon(o.col || '#c8963e', { map: A.brassTex(o.col || '#c8963e', { dark: o.dark }) }));
    const m = K3D.mesh(A.gearGeo(r, o.teeth || Math.max(8, Math.round(r * 7)), o.th || Math.max(0.25, r * 0.18), o), mat, { ink: o.ink === false ? false : A.INK, inkW: 0.8 });
    g.add(m);
    // the hub: a boss with a nut and grease
    const hr = Math.max(0.18, r * 0.2), hub = K3D.mesh(K3D.geo('arc-hub', () => new T.CylinderGeometry(1, 1, 1, 18).rotateX(Math.PI / 2)), M('hub', () => K3D.toon('#a07a34', { map: A.brassTex('#a07a34') })), { ink: A.INK, inkW: 0.7 });
    hub.scale.set(hr, hr, (o.th || r * 0.18) * 1.7); g.add(hub);
    const nut = new T.Mesh(K3D.geo('arc-nut', () => new T.CylinderGeometry(1, 1, 1, 6).rotateX(Math.PI / 2)), M('nut', () => K3D.toon('#5a5560')));
    nut.scale.set(hr * 0.55, hr * 0.55, (o.th || r * 0.18) * 2.1); g.add(nut);
    g.userData.spin = o.spin != null ? o.spin : 0;
    return g;
  };
  // a cable: braided cloth through points, clips along it, a paper label tied on now and then
  A.cable = function (K, pts, o = {}) {
    const g = new T.Group(), curve = new T.CatmullRomCurve3(pts.map(p => new T.Vector3(...p)));
    const col = o.col || pick(['#3a6ad8', '#d84a3a', '#e8c040', '#3aa860', '#2a2a30', '#e8e0d0']);
    const len = curve.getLength(), tube = new T.TubeGeometry(curve, Math.max(8, Math.round(len * 3)), o.r || 0.12, 7, false);
    const uv = tube.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * len * 2, uv.getY(i));
    const mat = M('cable|' + col, () => { const t = A.braidTex(col).clone(); t.needsUpdate = true; t.wrapS = t.wrapT = T.RepeatWrapping; return K3D.toon(col, { map: t }); });
    g.add(K3D.mesh(tube, mat, { ink: A.INK, inkW: 0.6 }));
    const nC = o.clips != null ? o.clips : Math.floor(len / 3);
    for (let i = 1; i <= nC; i++) {
      const t = i / (nC + 1), p = curve.getPointAt(t), tg = curve.getTangentAt(t);
      const cl = new T.Mesh(K3D.geo('arc-clip', () => new T.TorusGeometry(1, 0.35, 5, 10)), M('clip', () => K3D.toon('#d8d4c8')));
      const rr = (o.r || 0.12) * 1.25; cl.scale.set(rr, rr, rr); cl.position.copy(p); cl.lookAt(p.clone().add(tg)); g.add(cl);
    }
    if (o.labels) {
      const t = 0.3 + rnd() * 0.4, p = curve.getPointAt(t);
      const lab = A.decal(K, 'tag', 0.5, 0.28, { text: o.labels === true ? pick(['COIN MECH', 'LAMP 12V', 'TO SCREEN', 'SPKR L', 'SPKR R', 'DO NOT CUT', 'GND', 'FAN']) : o.labels });
      lab.position.copy(p).add(new T.Vector3(0, -0.22, 0)); lab.rotation.y = rnd() * 6.28; g.add(lab);
    }
    return g;
  };
  // a chip: a black body, legs down both long sides, a printed made-up part number, the notch and the pin-1 dot
  const CHIP_NAMES = ['PX-7741', 'MB-4316', 'QZ80-C', 'SND-02', 'VDP-11', 'RAM 4K', 'TMR-55', 'LOG-138', 'CPU-B6', 'ROM 3', 'IO-21', 'CLK-8'];
  A.chipTex = label => K3D.paint('arc-chip|' + label, 256, 128, (c, w, h) => {
    c.fillStyle = '#1c1b20'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 300; i++) { c.fillStyle = `rgba(255,255,255,${rnd() * 0.04})`; c.fillRect(rnd() * w, rnd() * h, 2, 2); }
    c.fillStyle = 'rgba(236,232,220,0.86)'; c.font = 'bold 34px monospace'; c.textAlign = 'center'; c.fillText(label, w / 2, h / 2 + 8);
    c.font = '18px monospace'; c.fillStyle = 'rgba(236,232,220,0.55)'; c.fillText(pick(['8211', '7909', '8402', '8517', '7744']) + '  ' + pick(['B', 'C', 'J']), w / 2, h / 2 + 36);
    c.fillStyle = '#0c0b0e'; c.beginPath(); c.arc(0, h / 2, 14, -Math.PI / 2, Math.PI / 2); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.12)'; c.beginPath(); c.arc(26, h - 22, 6, 0, Math.PI * 2); c.fill();
  });
  A.chip = function (K, o = {}) {
    const w = o.w || 3, d = o.d || 1.4, h = o.h || 0.4, g = new T.Group(), label = o.label || pick(CHIP_NAMES);
    const top = K3D.toon('#ffffff', { map: A.chipTex(label) }), side = M('chipside', () => K3D.toon('#24232a'));
    const body = K3D.mesh(new T.BoxGeometry(w, h, d), [side, side, top, side, side, side], { ink: A.INK, inkW: 0.7 });
    body.position.y = h / 2 + 0.12; g.add(body);
    const nLegs = Math.max(3, Math.round(w / 0.35)), legGeo = K3D.geo('arc-leg', () => new T.BoxGeometry(0.12, 0.26, 0.2));
    const legs = new T.InstancedMesh(legGeo, M('leg', () => K3D.toon('#d8d0c0')), nLegs * 2);
    const m4 = new T.Matrix4();
    for (let i = 0; i < nLegs; i++) for (const sd of [-1, 1]) { m4.makeTranslation(-w / 2 + (i + 0.5) * w / nLegs, 0.13, sd * (d / 2 + 0.06)); legs.setMatrixAt(i * 2 + (sd > 0 ? 1 : 0), m4); }
    g.add(legs);
    return g;
  };
  // an electrolytic capacitor: a can with a coloured sleeve, a pale stripe with minus signs, the scored cross on top
  A.capTex = (col, label) => K3D.paint('arc-cap|' + col + label, 256, 128, (c, w, h) => {
    c.fillStyle = col; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(240,240,230,0.75)'; c.fillRect(w * 0.08, 0, w * 0.1, h);
    c.fillStyle = col; c.font = 'bold 22px monospace'; for (let y = 18; y < h; y += 28) c.fillText('-', w * 0.11, y);
    c.fillStyle = 'rgba(240,240,230,0.85)'; c.font = 'bold 20px monospace'; c.fillText(label, w * 0.3, h * 0.42); c.font = '16px monospace'; c.fillText('105°C', w * 0.3, h * 0.72);
    c.fillStyle = 'rgba(255,255,255,0.15)'; c.fillRect(0, 6, w, 4);
  });
  A.cap = function (K, o = {}) {
    const r = o.r || 0.6, h = o.h || 1.6, g = new T.Group(), col = o.col || pick(['#2a4ab8', '#1c1c24', '#3a2a6a', '#1e5a3a', '#6a2a2a']);
    const sleeve = K3D.toon('#ffffff', { map: A.capTex(col, o.label || pick(['470uF 16V', '1000uF 25V', '220uF 35V', '47uF 50V'])) });
    const tp = M('captop', () => K3D.toon('#c8ccd4'));
    const can = K3D.mesh(new T.CylinderGeometry(r, r, h, 24), [sleeve, tp, tp], { ink: A.INK, inkW: 0.7 }); can.position.y = h / 2; g.add(can);
    for (const a of [0, Math.PI / 2]) { const sc = new T.Mesh(K3D.geo('arc-score', () => new T.BoxGeometry(1, 0.03, 0.05)), M('score', () => K3D.toon('#7a7e88'))); sc.scale.x = r * 1.6; sc.position.y = h + 0.01; sc.rotation.y = a; g.add(sc); }
    return g;
  };
  A.resistor = function (K, o = {}) {
    const g = new T.Group(), l = o.l || 1.4, r = o.r || 0.22;
    const body = K3D.mesh(K3D.geo('arc-res', () => new T.CapsuleGeometry(1, 2.2, 6, 12).rotateZ(Math.PI / 2)), M('res|' + (o.col || '#d8c08a'), () => K3D.toon(o.col || '#d8c08a')), { ink: A.INK, inkW: 0.6 });
    body.scale.set(l / 4.2, r, r); g.add(body);
    const bands = o.bands || [pick(['#8a4a1a', '#d83a2a', '#e88a2a', '#e8d03a']), pick(['#1a1a1a', '#3aa84a', '#2a5ad8', '#8a3ad8']), pick(['#d83a2a', '#e88a2a', '#ffffff']), '#d8b040'];
    bands.forEach((bc, i) => { const b = new T.Mesh(K3D.geo('arc-band', () => new T.CylinderGeometry(1, 1, 1, 14).rotateZ(Math.PI / 2)), A.toonM(bc)); b.scale.set(l * 0.06, r * 1.04, r * 1.04); b.position.x = -l * 0.28 + i * l * 0.16 + (i === 3 ? l * 0.1 : 0); g.add(b); });
    for (const sd of [-1, 1]) { const ld = new T.Mesh(K3D.geo('arc-lead', () => new T.CylinderGeometry(0.035, 0.035, 1, 5).rotateZ(Math.PI / 2)), M('lead', () => K3D.toon('#c8ccd4'))); ld.scale.x = l * 0.5; ld.position.x = sd * l * 0.62; g.add(ld); }
    return g;
  };
  A.screw = function (K, o = {}) {
    const r = o.r || 0.18, g = new T.Group();
    const head = new T.Mesh(K3D.geo('arc-screw', () => new T.SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2)), M('screw', () => K3D.toon('#9a9aa2')));
    head.scale.set(r, r * 0.45, r); g.add(head);
    const slot = new T.Mesh(K3D.geo('arc-slot', () => new T.BoxGeometry(1, 0.2, 0.18)), M('slot', () => K3D.toon('#2a2a30')));
    slot.scale.set(r * 1.7, r, r); slot.position.y = r * 0.38; slot.rotation.y = o.turn != null ? o.turn : rnd() * 3; g.add(slot);
    return g;
  };
  // a row of rivet heads, one instanced mesh: list of [x, y, z] and the normal they face (o.n)
  A.rivets = function (K, list, o = {}) {
    const im = new T.InstancedMesh(K3D.geo('arc-rivet', () => new T.SphereGeometry(1, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2)), o.mat || M('rivet', () => K3D.toon('#d8b060', { map: A.brassTex('#d8b060') })), list.length);
    const m4 = new T.Matrix4(), q = new T.Quaternion(), s = new T.Vector3(), p = new T.Vector3(), up = new T.Vector3(0, 1, 0);
    list.forEach((pt, i) => { const nrm = new T.Vector3(...(pt[3] || o.n || [0, 1, 0])); q.setFromUnitVectors(up, nrm.normalize()); const r = o.r || 0.08; m4.compose(p.set(pt[0], pt[1], pt[2]), q, s.set(r, r * 0.6, r)); im.setMatrixAt(i, m4); });
    im.castShadow = false; K.add(im); return im;
  };

  /* ---------- printed and written things ---------- */
  const NOTES = [['Coin mech cleaned', 'R.K.  3/14'], ['LEFT GEAR — do not', 'over-oil!!  T.'], ['Replaced lamp 4', '11/02  M.D.'], ['Belt tension OK', 'checked 6/9'], ['Who keeps leaving', 'gum in here?'],
    ['Screen tube is', 'GETTING TIRED'], ['Ticket reel jams', 'tap here  →'], ['Fuse 3: 2 amp', 'NOT 5 amp!'], ['Serviced', 'Jan / Apr / Aug'], ['Sweeper fixed', 'it was eating coins'],
    ['Strange beeping', 'at night??  - J.'], ['DO NOT TILT', 'thank you'], ['Board 2 OK', 'Board 3 ??'], ['Lucky coin taped', 'here 1987']];
  A.decalTex = (kind, seed, text) => K3D.paint('arc-decal|' + kind + '|' + seed + '|' + (text || ''), 256, kind === 'tag' || kind === 'ticket' || kind === 'wrapper' ? 128 : 256, (c, w, h) => {
    const s0 = seedS; seedS = 99 + seed * 31;
    if (kind === 'note') {
      c.fillStyle = '#f2e6b8'; c.fillRect(0, 0, w, h);
      for (let y = 40; y < h; y += 26) { c.fillStyle = 'rgba(80,120,180,0.25)'; c.fillRect(0, y, w, 1.5); }
      c.fillStyle = 'rgba(200,80,80,0.3)'; c.fillRect(30, 0, 1.5, h);
      const nt = NOTES[seed % NOTES.length];
      c.fillStyle = 'rgba(60,56,64,0.85)'; c.font = 'italic bold 26px cursive, serif'; c.fillText(nt[0], 40, 70 + rnd() * 6); c.fillText(nt[1], 48, 120 + rnd() * 6);
      c.font = 'italic 18px cursive, serif'; c.fillText(pick(['- service', 'thx', '!!', 'ok', '???']), 120, 190);
      c.fillStyle = 'rgba(120,90,40,0.18)'; c.beginPath(); c.arc(rnd() * w, rnd() * h, 30, 0, Math.PI * 2); c.fill(); // a coffee ring
      c.fillStyle = 'rgba(200,190,170,0.6)'; c.fillRect(w / 2 - 30, -4, 60, 18); // tape
    } else if (kind === 'sticker') {
      c.fillStyle = '#e8e4d4'; c.beginPath(); c.arc(w / 2, h / 2, w * 0.46, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#3a8a4a'; c.lineWidth = 10; c.beginPath(); c.arc(w / 2, h / 2, w * 0.4, 0, Math.PI * 2); c.stroke();
      c.fillStyle = '#3a8a4a'; c.font = 'bold 30px sans-serif'; c.textAlign = 'center'; c.fillText('INSPECTED', w / 2, h / 2 - 8); c.font = 'bold 22px sans-serif'; c.fillText(pick(['PASS', 'OK', 'No. ' + (100 + seed)]), w / 2, h / 2 + 26);
      c.fillStyle = 'rgba(200,180,120,0.35)'; c.fillRect(0, 0, w, h); // faded
    } else if (kind === 'diagram') {
      c.fillStyle = '#e8e8f0'; c.fillRect(0, 0, w, h); c.strokeStyle = '#2a3a8a'; c.lineWidth = 2;
      for (let i = 0; i < 18; i++) { c.beginPath(); let x = rnd() * w, y = rnd() * h; c.moveTo(x, y); for (let k = 0; k < 3; k++) { if (k % 2) x = rnd() * w; else y = rnd() * h; c.lineTo(x, y); } c.stroke(); }
      for (let i = 0; i < 6; i++) { c.strokeRect(rnd() * (w - 40), rnd() * (h - 30), 36, 22); }
      c.fillStyle = '#2a3a8a'; c.font = 'bold 14px monospace'; c.fillText('WIRING  FIG. 7', 10, 20); c.fillStyle = 'rgba(160,140,90,0.2)'; c.fillRect(0, 0, w, h);
    } else if (kind === 'ticket') {
      c.fillStyle = '#ff9ab8'; c.fillRect(0, 0, w, h); c.fillStyle = '#c84a78'; c.font = 'bold 34px sans-serif'; c.textAlign = 'center'; c.fillText('ADMIT ONE', w / 2, h / 2 + 4);
      c.font = '16px monospace'; c.fillText('No. 0' + (4000 + seed * 7), w / 2, h / 2 + 32); for (let y = 6; y < h; y += 12) { c.fillStyle = '#e8e0d0'; c.beginPath(); c.arc(4, y, 3, 0, Math.PI * 2); c.fill(); }
    } else if (kind === 'wrapper') {
      c.fillStyle = '#e8e8f0'; c.fillRect(0, 0, w, h); c.fillStyle = '#3ac87a'; c.fillRect(0, h * 0.3, w, h * 0.4); c.fillStyle = '#fff'; c.font = 'bold 30px sans-serif'; c.textAlign = 'center'; c.fillText('MINTY CHEW', w / 2, h / 2 + 10);
      for (let i = 0; i < 20; i++) { c.strokeStyle = 'rgba(0,0,0,0.15)'; c.beginPath(); c.moveTo(rnd() * w, 0); c.lineTo(rnd() * w, h); c.stroke(); }
    } else if (kind === 'graffiti') {
      c.clearRect(0, 0, w, h); const glyphs = text || pick(['HI PIP', 'BO WAS HERE', 'GO GO', 'LVL 1', '<3 <3', 'NO SWEEPERS', 'COIN CITY', 'ZAP!']);
      c.fillStyle = pick(A.NEON); const px = 10; let x = 10;
      for (const ch of glyphs) { const code = ch.charCodeAt(0); for (let yy = 0; yy < 5; yy++) for (let xx = 0; xx < 3; xx++) if (((code * 7 + yy * 3 + xx * 5) % 3) || ch === ' ') { if (ch !== ' ') c.fillRect(x + xx * px, 90 + yy * px, px - 1, px - 1); } x += 4 * px; if (x > w - 40) break; }
    } else if (kind === 'warn') {
      c.fillStyle = '#ffd23a'; c.fillRect(0, 0, w, h); c.fillStyle = '#1a1a1a'; for (let i = -h; i < w; i += 40) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i + 20, 0); c.lineTo(i + 20 + h, h); c.lineTo(i + h, h); c.closePath(); c.fill(); }
      c.fillStyle = '#ffd23a'; c.fillRect(20, h / 2 - 40, w - 40, 80); c.fillStyle = '#1a1a1a'; c.font = 'bold 34px sans-serif'; c.textAlign = 'center'; c.fillText(text || 'HIGH VOLTAGE', w / 2, h / 2 + 12);
    } else if (kind === 'tag') {
      c.fillStyle = '#f2ead2'; c.fillRect(0, 0, w, h); c.fillStyle = '#3a3440'; c.font = 'bold 30px monospace'; c.textAlign = 'center'; c.fillText(text || 'TAG', w / 2, h / 2 + 10);
      c.fillStyle = '#8a7a5a'; c.beginPath(); c.arc(16, h / 2, 6, 0, Math.PI * 2); c.fill();
    }
    seedS = s0;
  });
  A.decal = function (K, kind, w, h, o = {}) {
    const seed = o.seed != null ? o.seed : Math.floor(rnd() * 1000);
    const mat = M('decal|' + kind + '|' + seed + '|' + (o.text || ''), () => { const m = K3D.toon('#ffffff', { map: A.decalTex(kind, seed, o.text), transparent: kind === 'graffiti', side: T.DoubleSide, polygonOffset: -2 }); if (kind === 'graffiti') { m.emissive = new T.Color('#ffffff'); m.emissiveMap = m.map; m.emissiveIntensity = 1.4; m.depthWrite = false; } return m; });
    const m = new T.Mesh(K3D.geo('arc-plane', () => new T.PlaneGeometry(1, 1)), mat);
    m.scale.set(w, h, 1);
    return m;
  };

  /* ---------- a neon sign ---------- */
  A.neon = function (K, text, o = {}) {
    const w = o.w || 4, h = o.h || 1.2, col = o.col || '#ff5ad6', col2 = o.col2 || '#4ae8ff', g = new T.Group();
    const tex = K3D.paint('arc-neon|' + text + col + col2 + w, 512, Math.round(512 * h / w), (c, cw, ch) => {
      c.fillStyle = '#0a0810'; c.fillRect(0, 0, cw, ch);
      c.strokeStyle = col2; c.lineWidth = 6; c.shadowColor = col2; c.shadowBlur = 18; c.strokeRect(10, 10, cw - 20, ch - 20);
      c.font = `bold ${Math.round(ch * 0.5)}px ${o.font || 'sans-serif'}`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.shadowColor = col; c.shadowBlur = 26; c.fillStyle = col; c.fillText(text, cw / 2, ch / 2 + 4); c.shadowBlur = 8; c.fillStyle = '#ffffff'; c.globalAlpha = 0.6; c.fillText(text, cw / 2, ch / 2 + 4);
    });
    const mat = new T.MeshBasicMaterial({ map: tex, toneMapped: false, color: new T.Color(1.5, 1.5, 1.5) });
    const board = new T.Mesh(new T.PlaneGeometry(w, h), mat); g.add(board);
    const back = K3D.mesh(new T.BoxGeometry(w + 0.1, h + 0.1, 0.12), M('neonback', () => K3D.toon('#1a161e')), { ink: A.INK }); back.position.z = -0.07; g.add(back);
    if (o.flicker !== false) { let tt = rnd() * 9; K.tick(dt => { tt += dt; const f = (tt % 7.3) < 0.18 ? (Math.sin(tt * 90) > 0 ? 0.4 : 1.6) : 1.5; mat.color.setScalar(f); }); }
    g.userData.live = true;
    return g;
  };

  /* ---------- a spider's web with beads of solder for dew ---------- */
  A.web = function (K, c, r = 1.5, o = {}) {
    const g = new T.Group(), pts = [], n = 9, ring = 6, rot = rnd() * 6.28;
    const P = (a, rr) => [Math.cos(a + rot) * rr, Math.sin(a + rot) * rr, 0];
    for (let i = 0; i < n; i++) { const a = i / n * 6.28; pts.push(...[0, 0, 0], ...P(a, r)); }
    for (let k = 1; k <= ring; k++) for (let i = 0; i < n; i++) { const a = i / n * 6.28, b = (i + 1) / n * 6.28, rr = r * k / ring * (0.9 + rnd() * 0.15); pts.push(...P(a, rr), ...P(b, rr * (0.92 + rnd() * 0.1))); }
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(pts, 3));
    g.add(new T.LineSegments(geo, A.flatM('#d8d4e0', 0.9, { transparent: true, opacity: 0.55 })));
    const beads = new T.InstancedMesh(K3D.geo('arc-bead', () => new T.SphereGeometry(1, 8, 6)), A.flatM('#e8eef8', 1.6), 14);
    const m4 = new T.Matrix4(); for (let i = 0; i < 14; i++) { const a = rnd() * 6.28, rr = rnd() * r, s = 0.03 + rnd() * 0.04; m4.makeScale(s, s, s).setPosition(...P(a, rr)); beads.setMatrixAt(i, m4); }
    g.add(beads);
    g.position.set(...c); if (o.yaw != null) g.rotation.y = o.yaw;
    g.userData.live = true; // (it sways when something passes: the level moves it)
    return g;
  };

  /* ---------- lost things at hero scale ---------- */
  A.lost = function (K, kind, o = {}) {
    const g = new T.Group();
    if (kind === 'clip') {
      // a paper clip the size of a bridge: a bent wire loop
      const s = o.s || 4, pts = [[0, 0], [0, 1.6], [0.5, 2], [1, 1.6], [1, 0.3], [0.75, 0.05], [0.5, 0.3], [0.5, 1.3]].map(([x, y]) => new T.Vector3((x - 0.5) * s * 0.35, 0, -y * s * 0.5));
      const curve = new T.CatmullRomCurve3(pts, false, 'catmullrom', 0.2);
      g.add(K3D.mesh(new T.TubeGeometry(curve, 80, 0.06 * s * 0.25, 8, false), M('clipmetal', () => K3D.toon('#c8ccd8', { emissive: '#606878', emissiveIntensity: 0.3 })), { ink: A.INK, inkW: 0.6 }));
    } else if (kind === 'hairclip') {
      const s = o.s || 1.5, body = K3D.mesh(new T.TorusGeometry(s * 0.5, s * 0.12, 6, 20, Math.PI), A.toonM(o.col || '#ff7ab8'), { ink: A.INK, inkW: 0.6 });
      body.rotation.x = Math.PI / 2; g.add(body);
      const bow = K3D.mesh(new T.SphereGeometry(s * 0.25, 10, 8), A.toonM('#ffd23a'), { ink: A.INK }); bow.scale.set(1.6, 0.6, 1); bow.position.set(0, s * 0.1, -s * 0.5); g.add(bow);
    } else if (kind === 'coin') {
      // a foreign coin (made up): a hole in the middle, a wavy edge, a bird stamped on it
      const s = o.s || 1.4, tex = K3D.paint('arc-fcoin', 128, 128, (c, w, h) => { c.fillStyle = '#b8a0c8'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(60,40,70,0.6)'; c.lineWidth = 3; c.beginPath(); c.arc(64, 64, 52, 0, 6.28); c.stroke(); c.fillStyle = 'rgba(60,40,70,0.55)'; c.font = 'bold 18px serif'; c.textAlign = 'center'; c.fillText('10  ZOLA', 64, 104); c.beginPath(); c.moveTo(40, 50); c.quadraticCurveTo(64, 20, 88, 50); c.quadraticCurveTo(64, 40, 40, 50); c.fill(); });
      const shp = new T.Shape(); for (let i = 0; i <= 48; i++) { const a = i / 48 * 6.28, rr = s * (1 + 0.04 * Math.sin(a * 12)); if (i) shp.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); else shp.moveTo(rr, 0); }
      const hole = new T.Path(); hole.absarc(0, 0, s * 0.25, 0, 6.28, true); shp.holes.push(hole);
      const geo = new T.ExtrudeGeometry(shp, { depth: s * 0.12, bevelEnabled: false }); const uv = geo.attributes.uv, p = geo.attributes.position; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / (2.4 * s) + 0.5, p.getY(i) / (2.4 * s) + 0.5);
      const m = K3D.mesh(geo, K3D.toon('#ffffff', { map: tex }), { ink: A.INK, inkW: 0.6 }); m.rotation.x = -Math.PI / 2; g.add(m);
    } else if (kind === 'moth') {
      const s = o.s || 1, body = K3D.mesh(new T.CapsuleGeometry(0.08 * s, 0.4 * s, 4, 8), A.toonM('#6a5a4a'), { ink: A.INK, inkW: 0.5 }); body.rotation.x = Math.PI / 2; g.add(body);
      for (const sd of [-1, 1]) { const wg = new T.Mesh(K3D.geo('arc-moth', () => new T.CircleGeometry(0.4, 10)), A.toonM('#a8987a', { side: T.DoubleSide })); wg.scale.set(s, s * 0.7, 1); wg.rotation.x = -Math.PI / 2; wg.rotation.z = sd * 0.3; wg.position.x = sd * 0.32 * s; g.add(wg); }
    } else if (kind === 'button') {
      const s = o.s || 1, b = K3D.mesh(new T.CylinderGeometry(s, s, s * 0.25, 20), A.toonM(o.col || '#d84a6a'), { ink: A.INK }); g.add(b);
      for (const [x, z] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]]) { const hh = new T.Mesh(K3D.geo('arc-bhole', () => new T.CylinderGeometry(0.1, 0.1, 0.3, 8)), M('bhole', () => K3D.toon('#2a1a20'))); hh.position.set(x * s, 0.02, z * s); g.add(hh); }
    } else if (kind === 'pencil') {
      const s = o.s || 5, body = K3D.mesh(new T.CylinderGeometry(0.25 * s / 5, 0.25 * s / 5, s, 6), A.toonM('#ffd23a'), { ink: A.INK }); body.rotation.z = Math.PI / 2; g.add(body);
      const tip = K3D.mesh(new T.ConeGeometry(0.25 * s / 5, 0.6 * s / 5, 6), A.toonM('#e8c89a'), { ink: A.INK }); tip.rotation.z = -Math.PI / 2; tip.position.x = s / 2 + 0.3 * s / 5; g.add(tip);
      const er = K3D.mesh(new T.CylinderGeometry(0.26 * s / 5, 0.26 * s / 5, 0.4 * s / 5, 8), A.toonM('#ff8aa8'), { ink: A.INK }); er.rotation.z = Math.PI / 2; er.position.x = -s / 2 - 0.2 * s / 5; g.add(er);
    }
    return g;
  };

  return A;
})();
