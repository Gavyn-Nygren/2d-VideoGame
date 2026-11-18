/* Pip & Bo - 41-3 Paper Dragon Flight: the attic's mood. Drawing only (three.js through K3D.T, inside build()).

   POPDRAGON_MOOD.build(K, still, live) is called by POPDRAGON_ART.build before it bakes, and adds:
     the lights     a dim blue night (ambient), the lamp's warm pool (a point light at the bulb that fades with distance),
                    cool moonlight from the window, and the shadow light turned warm and low (it follows the dragon)
     the lamp beam  a soft glowing cone under the shade, with dust motes turning in it
     the moonbeam   motes drifting in the window's shaft and the window's cross of light on the floor
     the storm      now and then lightning lights the room (thunder follows), more often the further the flight has gone
                    (cosy at the desk, stormy by the window); the rain on the glass is painted here, the window's panes
                    and the storm outside are POPDRAGON_WINDOW's (popdragon-window.js)
     fairy lights   strings of tiny bulbs swagged along the back wall, the left wall and the beam (they twinkle)
     bunting        paper flags on strings across the room (they stir in the draught)
     drawings       a child's crayon pictures pinned and taped to the walls round the desk
   Returns { tick(st, t, dt), flash(), hold, fl, moon, softTex, rainTex }; hold (0..1 or null) freezes the lightning for
   the screenshot tool, fl is the flash right now (0..1), moon the moonlight (the bedroom dims it under the bed).
*/
'use strict';

const POPDRAGON_MOOD = (function () {
  const M = {};
  // the light levels (x PI, the kit's convention: amb 0.42 + sun 0.58 = 1 on a lit face in daylight levels)
  M.LIGHT = { amb: '#45558a', ambI: 0.4, sun: '#ffd49a', sunI: 0.15, lamp: '#ffc47a', lampI: 19, lampDecay: 0.72, lampReach: 170,
    moon: '#8ea6e6', moonI: 0.24 };

  // a soft beam of light: see-through, brightest where you look straight through it and fading toward its silhouette
  // (so it has no hard edge), and fading along its length from a0 (the geometry's bottom, uv.y 0) to a1 (its top)
  M.beam = function (color, opacity, a0, a1) {
    const T = K3D.T;
    return new T.ShaderMaterial({
      uniforms: { uCol: { value: new T.Color(color) }, uOp: { value: opacity }, uA0: { value: a0 }, uA1: { value: a1 } },
      vertexShader: 'varying vec3 vN; varying vec3 vV; varying vec2 vUv; void main() { vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = -mv.xyz; vN = normalMatrix * normal; gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform vec3 uCol; uniform float uOp, uA0, uA1; varying vec3 vN; varying vec3 vV; varying vec2 vUv; void main() { float e = abs(dot(normalize(vN), normalize(vV))); float a = pow(e, 1.6) * mix(uA0, uA1, smoothstep(0.0, 1.0, vUv.y)) * uOp; gl_FragColor = vec4(uCol * a, 1.0); }',
      transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide,
    });
  };

  M.build = function (K, still, live) {
    const T = K3D.T, K3 = K3D, P = POPUP, R = POPDRAGON_ROUTE, F = R.FLOOR, L = M.LIGHT, PI = Math.PI;
    const rng = P.rng(9101);

    /* ---------- lights ---------- */
    K.amb.color.set(L.amb); K.amb.intensity = L.ambI * PI;
    K.sun.color.set(L.sun); K.sun.intensity = L.sunI * PI;
    const B = R.art.bulb;
    const lampL = new T.PointLight(L.lamp, L.lampI * PI, L.lampReach, L.lampDecay);
    lampL.position.set(B[0], B[1] - 1.2, B[2]); live.add(lampL);
    const moon = new T.DirectionalLight(L.moon, L.moonI * PI);
    moon.position.set(0.18, 0.5, -0.85).multiplyScalar(100); live.add(moon);

    const softTex = K3.paint('pdSoft', 64, 64, (c) => { const g = c.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 64, 64); });

    /* ---------- the lamp's beam ---------- */
    const coneH = B[1] - 0.3;
    const cone = new T.Mesh(new T.CylinderGeometry(5.2, 25, coneH, 48, 1, true).translate(0, -coneH / 2, 0), M.beam('#ffd08a', 0.42, 0.05, 1));
    cone.position.set(B[0], B[1] - 1.5, B[2]); live.add(cone);
    // a second, narrower core so the beam is brightest in the middle
    const core = new T.Mesh(new T.CylinderGeometry(3.4, 13, coneH * 0.85, 40, 1, true).translate(0, -coneH * 0.425, 0), M.beam('#ffe2b0', 0.4, 0.0, 1));
    core.position.copy(cone.position); live.add(core);

    /* ---------- dust motes ---------- */
    const clouds = [];
    function motes(n, place, size, col) {
      const pos = new Float32Array(n * 3), colA = new Float32Array(n * 3), base = new Float32Array(n * 3), ph = new Float32Array(n * 4), bright = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const p = place(i); base.set(p.slice(0, 3), i * 3); pos.set(p.slice(0, 3), i * 3); bright[i] = p[3];
        ph[i * 4] = rng() * 6.28; ph[i * 4 + 1] = rng() * 6.28; ph[i * 4 + 2] = rng() * 6.28; ph[i * 4 + 3] = 0.6 + rng() * 0.8;
      }
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('color', new T.BufferAttribute(colA, 3));
      const m = new T.PointsMaterial({ map: softTex, size, sizeAttenuation: true, vertexColors: true, transparent: true, depthWrite: false, blending: T.AdditiveBlending });
      const pts = new T.Points(g, m); pts.frustumCulled = false; live.add(pts);
      const cl = { pts, pos, colA, base, ph, bright, col: new T.Color(col), n, amp: 1 }; clouds.push(cl); return cl;
    }
    // in the lamp's beam (bright), and a few drifting over the whole desk (fainter away from the lamp)
    motes(260, () => { const f = Math.pow(rng(), 0.8), r = (5 + 19 * f) * Math.sqrt(rng()), a = rng() * 6.28; return [B[0] + Math.cos(a) * r, B[1] - 2 - f * (coneH - 2), B[2] + Math.sin(a) * r, 0.5 + 0.5 * (1 - f) * rng() + 0.25]; }, 0.22, '#ffd89a');
    motes(320, () => { const x = -70 + rng() * 170, y = 1 + rng() * 26, z = -34 + rng() * 68, d = Math.hypot(x - B[0], y - B[1], z - B[2]); return [x, y, z, clamp(1.15 - d / 70, 0.12, 1) * (0.35 + rng() * 0.4)]; }, 0.18, '#ffd6a0');
    // in the moonbeam: the shaft runs from the window down to the floor
    const W0 = [300, F + 62, -40], W1 = [300, F + 6, 56];
    const moonM = motes(300, () => { const f = rng(), r = (20 + 12 * f) * Math.sqrt(rng()), a = rng() * 6.28; return [W0[0] + (W1[0] - W0[0]) * f + Math.cos(a) * r, W0[1] + (W1[1] - W0[1]) * f + Math.sin(a) * r * 0.88, W0[2] + (W1[2] - W0[2]) * f + Math.sin(a) * r * 0.47, 0.35 + rng() * 0.65]; }, 0.75, '#b8caff');

    /* ---------- the window: rain on the glass, lightning, the light on the floor ---------- */
    const WIN = [300, F + 64, -43];
    const rainTex = K3.paint('pdRainGlass', 256, 512, (c, w, h) => {
      c.clearRect(0, 0, w, h); c.lineCap = 'round';
      const r = P.rng(9111);
      for (let i = 0; i < 46; i++) {
        const x = r() * w, y = r() * h, len = 30 + r() * 120, lw = 1.2 + r() * 2.4;
        c.strokeStyle = 'rgba(200,220,255,' + (0.25 + r() * 0.35).toFixed(2) + ')'; c.lineWidth = lw;
        c.beginPath(); c.moveTo(x, y); for (let k = 1; k <= 6; k++) c.lineTo(x + Math.sin(k * 1.7 + i) * 2.2, y + len * k / 6); c.stroke();
        c.fillStyle = 'rgba(230,240,255,0.75)'; c.beginPath(); c.ellipse(x, y + len, lw * 1.4, lw * 1.9, 0, 0, Math.PI * 2); c.fill();
        // the same streak again a canvas height down so the scroll wraps
        if (y + len > h) { c.beginPath(); c.moveTo(x, y - h); c.lineTo(x, y - h + len); c.stroke(); }
      }
      for (let i = 0; i < 140; i++) { const x = r() * w, y = r() * h, s = 0.8 + r() * 2.4; c.fillStyle = 'rgba(220,235,255,0.55)'; c.beginPath(); c.arc(x, y, s, 0, Math.PI * 2); c.fill(); c.fillStyle = 'rgba(255,255,255,0.8)'; c.fillRect(x - s * 0.4, y - s * 0.5, s * 0.5, s * 0.5); }
    }, { repeat: true });
    // a cool glow round the window on the wall
    const winGlow = new T.Sprite(new T.SpriteMaterial({ map: softTex, color: '#7f98d8', transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 0.28 }));
    winGlow.position.set(WIN[0], WIN[1], WIN[2] + 1); winGlow.scale.set(90, 90, 1); live.add(winGlow);
    // the window's cross of moonlight lying on the floor
    const patchTex = K3.paint('pdMoonPatch', 256, 256, (c, w, h) => {
      const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); g.addColorStop(0, 'rgba(200,215,255,0.9)'); g.addColorStop(0.75, 'rgba(180,200,255,0.6)'); g.addColorStop(1, 'rgba(160,185,255,0)');
      c.fillStyle = g; c.beginPath(); c.arc(w / 2, h / 2, w / 2, 0, Math.PI * 2); c.fill();
      c.globalCompositeOperation = 'destination-out'; c.fillStyle = 'rgba(0,0,0,0.85)'; c.fillRect(w / 2 - 5, 0, 10, h); c.fillRect(0, h / 2 - 5, w, 10); c.globalCompositeOperation = 'source-over';
    });
    const patch = new T.Mesh(new T.PlaneGeometry(50, 84).rotateX(-Math.PI / 2), K3.flat('#ffffff', { map: patchTex, transparent: true, opacity: 0.32, depthWrite: false, add: true }));
    patch.position.set(300, F + 0.15, 14); patch.scale.set(0.66, 1, 0.6); live.add(patch);   // (on the floor in front of the bed)

    /* ---------- fairy lights ---------- */
    // a hanging string between two nails: n points along a sagging curve
    const sagPts = (a, b, drop, n) => { const out = []; for (let i = 0; i <= n; i++) { const f = i / n; out.push(new T.Vector3(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f - drop * 4 * f * (1 - f), a[2] + (b[2] - a[2]) * f)); } return out; };
    const swags = (nails, drop) => { const pts = []; for (let i = 0; i + 1 < nails.length; i++) { const seg = sagPts(nails[i], nails[i + 1], drop, 10); pts.push(...(i ? seg.slice(1) : seg)); } return pts; };
    const fairyRuns = [];
    { const n = []; for (let x = -146; x <= 366; x += 42) n.push([x, 70 + Math.sin(x) * 1.5, -43.1]); fairyRuns.push(swags(n, 6)); }
    { const n = []; for (let z = -40; z <= 140; z += 36) n.push([-149.1, 57 - (z + 40) * 0.05, z]); fairyRuns.push(swags(n, 5)); }
    { const n = []; for (let x = -140; x <= 360; x += 50) n.push([x, F + 133, -37.2]); fairyRuns.push(swags(n, 7)); }
    const wireM = K3.mat('pdWire', () => K3.toon('#24301f'));
    const bulbAt = [];
    for (const run of fairyRuns) {
      const curve = new T.CatmullRomCurve3(run);
      still.add(K3.mesh(new T.TubeGeometry(curve, run.length * 3, 0.13, 5, false), wireM, { ink: false, cast: false }));
      const len = curve.getLength(), nb = Math.floor(len / 3.4);
      for (let i = 0; i < nb; i++) bulbAt.push(curve.getPointAt((i + 0.5) / nb));
    }
    const fairyCols = ['#ffd27a', '#ffb070', '#ff8aa8', '#9ae8c0', '#8ac8ff', '#fff0c0'].map(c => new T.Color(c));
    const NB = bulbAt.length;
    const bulbsI = new T.InstancedMesh(new T.SphereGeometry(0.55, 10, 8).scale(0.8, 1.15, 0.8), new T.MeshBasicMaterial({ color: '#ffffff' }), NB);
    const fairyPos = new Float32Array(NB * 3), fairyCol = new Float32Array(NB * 3), fairyBase = [];
    const m4 = new T.Matrix4();
    bulbAt.forEach((p, i) => { m4.makeTranslation(p.x, p.y - 0.5, p.z); bulbsI.setMatrixAt(i, m4); const c = fairyCols[i % fairyCols.length]; bulbsI.setColorAt(i, c); fairyPos.set([p.x, p.y - 0.5, p.z], i * 3); fairyBase.push(c); });
    bulbsI.frustumCulled = false; live.add(bulbsI);
    const fg = new T.BufferGeometry(); fg.setAttribute('position', new T.BufferAttribute(fairyPos, 3)); fg.setAttribute('color', new T.BufferAttribute(fairyCol, 3));
    const fairyGlow = new T.Points(fg, new T.PointsMaterial({ map: softTex, size: 5.5, sizeAttenuation: true, vertexColors: true, transparent: true, depthWrite: false, blending: T.AdditiveBlending }));
    fairyGlow.frustumCulled = false; live.add(fairyGlow);
    const twPh = Array.from({ length: NB }, () => [rng() * 6.28, 0.8 + rng() * 2.2]);

    /* ---------- paper bunting ---------- */
    const flagTex = K3.paint('pdFlag', 128, 128, (c, w, h) => {
      c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h);
      c.fillStyle = 'rgba(255,255,255,0.0)';
      const r = P.rng(9121); for (let i = 0; i < 26; i++) { c.fillStyle = 'rgba(255,255,255,0.7)'; c.beginPath(); c.arc(r() * w, r() * h, 5 + r() * 4, 0, Math.PI * 2); c.fill(); c.strokeStyle = 'rgba(60,40,40,0.18)'; c.lineWidth = 1.5; c.stroke(); }
      c.strokeStyle = 'rgba(40,20,20,0.25)'; c.lineWidth = 4; c.setLineDash([6, 5]); c.beginPath(); c.moveTo(10, 8); c.lineTo(w / 2, h - 10); c.lineTo(w - 10, 8); c.stroke();
    });
    const flagShape = new T.Shape(); flagShape.moveTo(-1.7, 0); flagShape.lineTo(1.7, 0); flagShape.lineTo(0, -3.6); flagShape.closePath();
    const flagGeo = new T.ShapeGeometry(flagShape);
    { const uv = flagGeo.attributes.uv, pa = flagGeo.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, (pa.getX(i) + 1.7) / 3.4, 1 + pa.getY(i) / 3.6); }
    const flagCols = ['#e8615e', '#f2c14e', '#5fbfa0', '#6f93e6', '#e883b8', '#f4ead6', '#9a7ad8', '#f29a4e'].map(c => new T.Color(c));
    const buntRuns = [
      sagPts([-149, 74, 22], [369, 74, 22], 16, 140),
      sagPts([-149, 64, 104], [369, 64, 104], 12, 140),
      sagPts([30, 96, -43.5], [-149, 56, 118], 14, 80),
    ];
    const flags = [];
    for (const run of buntRuns) {
      const curve = new T.CatmullRomCurve3(run);
      still.add(K3.mesh(new T.TubeGeometry(curve, run.length, 0.1, 4, false), K3.mat('pdString', () => K3.toon('#e8dcc0')), { ink: false, cast: false }));
      const len = curve.getLength(), nf = Math.floor(len / 5.2);
      for (let i = 0; i < nf; i++) { const f = (i + 0.5) / nf, p = curve.getPointAt(f), tg = curve.getTangentAt(f); tg.y = 0; tg.normalize(); flags.push({ p, tg, ph: rng() * 6.28 }); }
    }
    const NF = flags.length;
    const flagsI = new T.InstancedMesh(flagGeo, K3.toon('#ffffff', { map: flagTex, side: T.DoubleSide }), NF);
    flags.forEach((f, i) => flagsI.setColorAt(i, flagCols[i % flagCols.length]));
    flagsI.frustumCulled = false; live.add(flagsI); K3.ink(flagsI, '#3a2a28', 0.7);
    const fx = new T.Vector3(), fy = new T.Vector3(), fz = new T.Vector3(), up = new T.Vector3(0, 1, 0), fq = new T.Quaternion(), fs = new T.Vector3(1, 1, 1), fqa = new T.Quaternion();
    const placeFlags = (t) => {
      for (let i = 0; i < NF; i++) {
        const f = flags[i]; fx.copy(f.tg); fz.crossVectors(fx, up).normalize(); fy.crossVectors(fz, fx);
        m4.makeBasis(fx, fy, fz); fq.setFromRotationMatrix(m4);
        fqa.setFromAxisAngle(fx, Math.sin(t * 1.1 + f.ph) * 0.16 + Math.sin(t * 0.37 + f.p.x * 0.02) * 0.1); fq.premultiply(fqa);
        m4.compose(f.p, fq, fs); flagsI.setMatrixAt(i, m4);
      }
      flagsI.instanceMatrix.needsUpdate = true;
    };
    placeFlags(0);

    /* ---------- the child's drawings on the walls ---------- */
    const drawTex = K3.paint('pdDrawings', 1024, 512, (c, w, h) => {
      const cw = 256, ch = 256, r = P.rng(9131);
      // a crayon line: wobbly, a few passes
      const cray = (pts, col, lw = 7, passes = 2) => { c.strokeStyle = col; c.lineCap = 'round'; c.lineJoin = 'round'; for (let k = 0; k < passes; k++) { c.lineWidth = lw * (0.7 + r() * 0.4); c.globalAlpha = 0.75; c.beginPath(); pts.forEach(([x, y], i) => { const jx = x + (r() - 0.5) * 3, jy = y + (r() - 0.5) * 3; i ? c.lineTo(jx, jy) : c.moveTo(jx, jy); }); c.stroke(); } c.globalAlpha = 1; };
      // crayon fill: scribbled strokes inside a path
      const fill = (path, col, dens = 7) => { c.save(); c.beginPath(); path(); c.clip(); c.strokeStyle = col; c.globalAlpha = 0.6; c.lineWidth = 6; for (let y = -cw; y < cw * 2; y += dens) { c.beginPath(); c.moveTo(-10, y); c.lineTo(cw * 4, y - cw * 0.6); c.stroke(); } c.restore(); c.globalAlpha = 1; };
      const circ = (x, y, rr) => () => c.arc(x, y, rr, 0, Math.PI * 2);
      const cells = [
        () => { // the paper dragon, breathing confetti
          fill(() => { c.moveTo(30, 150); c.quadraticCurveTo(80, 90, 130, 140); c.quadraticCurveTo(170, 180, 210, 120); c.lineTo(220, 150); c.quadraticCurveTo(170, 210, 120, 165); c.quadraticCurveTo(80, 130, 40, 175); c.closePath(); }, '#3a9a5a');
          cray([[30, 150], [80, 105], [130, 140], [170, 175], [210, 120], [220, 150], [170, 205], [120, 165], [80, 135], [40, 175], [30, 150]], '#1e5a30', 5);
          cray([[200, 125], [235, 95]], '#e84a3a', 6); cray([[205, 130], [240, 120]], '#f2b03a', 6); cray([[205, 135], [235, 150]], '#e84a3a', 6);
          fill(circ(70, 70, 22), '#f2c14e'); c.fillStyle = '#2b2130'; c.font = 'bold 30px "Comic Sans MS", "DejaVu Sans", sans-serif'; c.fillText('RAWR', 92, 60);
        },
        () => { // a house with smoke and a sun
          fill(() => c.rect(60, 120, 120, 100), '#e8615e'); fill(() => { c.moveTo(45, 125); c.lineTo(120, 55); c.lineTo(195, 125); c.closePath(); }, '#8a5a3a');
          cray([[60, 220], [60, 120], [180, 120], [180, 220], [60, 220]], '#7a2a2a', 5); cray([[45, 125], [120, 55], [195, 125]], '#4a2a1a', 6);
          fill(() => c.rect(105, 170, 30, 50), '#4a7ad8'); fill(() => c.rect(75, 140, 22, 22), '#f2e06a'); fill(() => c.rect(145, 140, 22, 22), '#f2e06a');
          fill(circ(215, 40, 24), '#f2b03a'); for (let a = 0; a < 6.28; a += 0.8) cray([[215 + Math.cos(a) * 30, 40 + Math.sin(a) * 30], [215 + Math.cos(a) * 42, 40 + Math.sin(a) * 42]], '#f2a03a', 4, 1);
          cray([[150, 70], [150, 40], [160, 40], [160, 75]], '#5a4a4a', 5); cray([[155, 35], [145, 20], [160, 10], [150, -5]], '#9a9aa8', 5);
          cray([[0, 225], [256, 225]], '#4aa84a', 9);
        },
        () => { // the cat, with very green eyes
          fill(() => { c.moveTo(50, 210); c.quadraticCurveTo(40, 110, 70, 80); c.lineTo(80, 30); c.lineTo(110, 70); c.lineTo(150, 70); c.lineTo(180, 30); c.lineTo(190, 80); c.quadraticCurveTo(220, 110, 210, 210); c.closePath(); }, '#e8923a');
          cray([[50, 210], [45, 120], [70, 80], [80, 30], [110, 70], [150, 70], [180, 30], [190, 80], [215, 120], [210, 210]], '#7a4a1a', 5);
          for (const y of [130, 160, 190]) { cray([[60, y], [90, y + 4]], '#a85a1a', 5, 1); cray([[200, y], [170, y + 4]], '#a85a1a', 5, 1); }
          fill(circ(100, 120, 16), '#4ad84a'); fill(circ(160, 120, 16), '#4ad84a'); cray([[100, 108], [100, 132]], '#1a1a1a', 5, 1); cray([[160, 108], [160, 132]], '#1a1a1a', 5, 1);
          fill(() => { c.moveTo(122, 150); c.lineTo(138, 150); c.lineTo(130, 160); c.closePath(); }, '#e86a8a');
          for (const s of [-1, 1]) for (const dy of [-6, 6]) cray([[130 + s * 18, 158 + dy], [130 + s * 60, 150 + dy * 2]], '#2b2130', 2.5, 1);
          c.fillStyle = '#2b2130'; c.font = 'bold 24px "Comic Sans MS", "DejaVu Sans", sans-serif'; c.fillText('MOG', 20, 245);
        },
        () => { // two friends, orange and blue, holding hands
          fill(() => c.ellipse(85, 140, 38, 46, 0, 0, Math.PI * 2), '#f08a3a'); fill(() => c.ellipse(170, 140, 38, 46, 0, 0, Math.PI * 2), '#4a8ae8');
          cray([[47, 140], [60, 100], [85, 94], [110, 100], [123, 140], [110, 182], [85, 186], [60, 182], [47, 140]], '#a84a10', 4);
          cray([[132, 140], [145, 100], [170, 94], [195, 100], [208, 140], [195, 182], [170, 186], [145, 182], [132, 140]], '#1a4aa8', 4);
          for (const x of [72, 98, 157, 183]) fill(circ(x, 130, 6), '#2b2130');
          cray([[75, 158], [85, 165], [97, 158]], '#2b2130', 3, 1); cray([[160, 158], [170, 165], [182, 158]], '#2b2130', 3, 1);
          cray([[118, 155], [137, 155]], '#2b2130', 5); cray([[85, 186], [80, 225]], '#2b2130', 4, 1); cray([[170, 186], [176, 225]], '#2b2130', 4, 1);
          for (let i = 0; i < 5; i++) { const x = 30 + i * 48, y = 40 + (i % 2) * 18; fill(() => { for (let k = 0; k < 10; k++) { const a = k / 10 * 6.28 - 1.57, rr = k % 2 ? 6 : 14; k ? c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : c.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.closePath(); }, '#f2c14e'); }
        },
        () => { // a rocket to the moon
          fill(() => { c.moveTo(128, 30); c.quadraticCurveTo(170, 80, 160, 180); c.lineTo(96, 180); c.quadraticCurveTo(86, 80, 128, 30); }, '#d8d8e8');
          cray([[128, 30], [165, 90], [160, 180], [96, 180], [91, 90], [128, 30]], '#5a5a7a', 5);
          fill(circ(128, 100, 16), '#6ac4f0'); fill(() => { c.moveTo(96, 150); c.lineTo(70, 195); c.lineTo(100, 180); c.closePath(); c.moveTo(160, 150); c.lineTo(186, 195); c.lineTo(156, 180); c.closePath(); }, '#e8615e');
          fill(() => { c.moveTo(105, 182); c.lineTo(128, 240); c.lineTo(151, 182); c.closePath(); }, '#f2a03a');
          fill(circ(210, 50, 26), '#f2e6a0'); fill(circ(222, 44, 22), '#ffffff');
          for (let i = 0; i < 9; i++) { const x = 20 + r() * 216, y = 20 + r() * 216; if (Math.hypot(x - 128, y - 130) > 70) { cray([[x - 6, y], [x + 6, y]], '#f2c14e', 3, 1); cray([[x, y - 6], [x, y + 6]], '#f2c14e', 3, 1); } }
        },
        () => { // a rainbow over clouds
          ['#e8615e', '#f29a4e', '#f2d04e', '#5fbf6a', '#5a8ae8', '#9a6ad8'].forEach((col, i) => cray(Array.from({ length: 13 }, (_, k) => { const a = Math.PI + k / 12 * Math.PI; return [128 + Math.cos(a) * (110 - i * 12), 190 + Math.sin(a) * (110 - i * 12)]; }), col, 11));
          for (const [x, y] of [[40, 195], [215, 195]]) fill(() => { c.arc(x - 18, y, 18, 0, 6.28); c.arc(x + 4, y - 10, 22, 0, 6.28); c.arc(x + 24, y + 2, 16, 0, 6.28); }, '#c8d8f0');
        },
        () => { // a castle with a flag
          fill(() => { c.rect(50, 110, 156, 110); c.rect(40, 70, 40, 60); c.rect(176, 70, 40, 60); }, '#a8a8b8');
          cray([[50, 220], [50, 110], [206, 110], [206, 220]], '#4a4a5a', 5); for (const x of [40, 176]) cray([[x, 130], [x, 70], [x + 10, 70], [x + 10, 60], [x + 20, 60], [x + 20, 70], [x + 30, 70], [x + 30, 60], [x + 40, 60], [x + 40, 130]], '#4a4a5a', 4);
          fill(() => { c.moveTo(110, 220); c.lineTo(110, 175); c.quadraticCurveTo(128, 150, 146, 175); c.lineTo(146, 220); c.closePath(); }, '#6a4a2a');
          cray([[196, 60], [196, 20]], '#2b2130', 4, 1); fill(() => { c.moveTo(196, 20); c.lineTo(230, 30); c.lineTo(196, 40); c.closePath(); }, '#e8615e');
          cray([[0, 225], [256, 225]], '#4aa84a', 9);
        },
        () => { // a whale in the sea
          fill(() => c.rect(0, 160, 256, 96), '#4a8ae8'); cray(Array.from({ length: 9 }, (_, k) => [k * 32, 160 + (k % 2) * 10]), '#2a5aa8', 6);
          fill(() => c.ellipse(120, 140, 80, 46, 0, 0, Math.PI * 2), '#5a6ab8'); cray([[40, 140], [70, 100], [130, 94], [190, 120], [200, 150], [160, 180], [80, 182], [40, 140]], '#2a3a7a', 5);
          fill(() => { c.moveTo(195, 140); c.lineTo(240, 110); c.lineTo(235, 165); c.closePath(); }, '#5a6ab8'); fill(circ(80, 130, 7), '#ffffff'); fill(circ(80, 130, 3), '#2b2130');
          cray([[120, 94], [115, 60], [100, 45]], '#8ac8f0', 5); cray([[120, 94], [125, 55], [140, 40]], '#8ac8f0', 5);
        },
      ];
      cells.forEach((draw, i) => {
        const x0 = (i % 4) * cw, y0 = Math.floor(i / 4) * ch;
        c.save(); c.translate(x0, y0); c.beginPath(); c.rect(0, 0, cw, ch); c.clip();
        c.fillStyle = i % 3 === 1 ? '#f4efdc' : '#fbf8ee'; c.fillRect(0, 0, cw, ch);
        for (let k = 0; k < 300; k++) { c.fillStyle = 'rgba(120,100,60,0.05)'; c.fillRect(r() * cw, r() * ch, 2, 2); }
        draw(); c.restore();
      });
    });
    const paperM = K3.toon('#ffffff', { map: drawTex });
    const pinM = [K3.mat('pdPinR', () => K3.toon('#d8403a')), K3.mat('pdPinB', () => K3.toon('#3a6ad8')), K3.mat('pdPinY', () => K3.toon('#e8b83a'))];
    const tapeM = K3.mat('pdTape', () => K3.toon('#f0e4b4'));
    // where they hang: [cell, x, y, z, w, h, roll, wall ('back' or 'left'), pinned (else taped)]
    const hung = [[0, -52, 28, 0, 17, 15, 0.06, 'back', 1], [3, -26, 52, 0, 15, 14, -0.05, 'back', 0], [1, 14, 34, 0, 16, 15, 0.04, 'back', 1],
      [5, 40, 56, 0, 15, 13, -0.08, 'back', 0], [6, 66, 30, 0, 14, 14, 0.07, 'back', 1], [2, 104, 40, 0, 17, 16, -0.04, 'back', 1],
      [4, -92, 34, 0, 13, 15, 0.05, 'back', 0], [7, -149, 30, 6, 16, 13, -0.06, 'left', 1], [1, -149, 40, 34, 13, 12, 0.08, 'left', 0], [3, -149, 22, 62, 14, 13, 0.03, 'left', 1]];
    for (const [cell, x, y, zz, w, h, roll, wall, pinned] of hung) {
      const g = new T.PlaneGeometry(w, h), uv = g.attributes.uv, u0 = (cell % 4) / 4, v0 = 1 - (Math.floor(cell / 4) + 1) / 2;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + uv.getX(i) * 0.25, v0 + uv.getY(i) * 0.5);
      const card = new T.Group();
      if (wall === 'back') card.position.set(x, y, -43.5); else { card.position.set(-149.5, y, zz); card.rotation.y = Math.PI / 2; }
      card.rotation.z = roll;
      const sheet = K3.mesh(g, paperM, { ink: '#6a5a40', inkW: 0.6, cast: false }); card.add(sheet);
      if (pinned) { const pin = K3.mesh(K3.geo('pdPin', () => new T.SphereGeometry(0.55, 12, 8)), pinM[(cell + x) % 3 < 0 ? 0 : (cell + Math.abs(x)) % 3], { ink: '#2b2130', inkW: 0.5 }); pin.position.set(0, h / 2 - 1, 0.4); card.add(pin); }
      else for (const s of [-1, 1]) { const tp = K3.mesh(K3.geo('pdTapeG', () => new T.BoxGeometry(4, 1.4, 0.05)), tapeM, { ink: false, cast: false }); tp.position.set(s * (w / 2 - 1), h / 2 - 0.4, 0.06); tp.rotation.z = s * 0.6; card.add(tp); }
      still.add(card);
    }

    /* ---------- every drawn frame ---------- */
    const mood = { hold: null, next: 22 + rng() * 10, flashT: -9, thunder: null, fl: 0, moon, softTex, rainTex, ambBase: L.ambI * PI };
    const ambBase = L.ambI * PI, moonBase = L.moonI * PI, ambCol = new T.Color(L.amb), flashCol = new T.Color('#c8d6ff');
    // lightning: a double flicker over about 0.7 s
    const flashAt = (u) => (u < 0 || u > 0.75 ? 0 : u < 0.08 ? u / 0.08 : u < 0.16 ? 1 - (u - 0.08) / 0.08 * 0.8 : u < 0.24 ? 0.2 + (u - 0.16) / 0.08 * 0.7 : 0.9 * Math.pow(1 - (u - 0.24) / 0.51, 2));
    mood.flash = function (t) { mood.flashT = t; mood.thunder = t + 0.9 + rng() * 1.2; };
    mood.tick = function (st, t, dt) {
      // the storm builds as the flight goes on: rare over the desk, often by the window
      const along = clamp((st.s || 0) / (R.end || 270), 0, 1);
      if (t >= mood.next) { mood.flash(t); mood.next = t + (34 - 22 * along) * (0.7 + rng() * 0.6); }
      if (mood.thunder != null && t >= mood.thunder) { mood.thunder = null; if (typeof Sfx !== 'undefined' && !window.__w41shot) Sfx.play('popdragonThunder'); }
      const fl = mood.hold != null ? mood.hold : flashAt(t - mood.flashT);
      K.amb.intensity = ambBase * (1 + fl * 2.6); K.amb.color.copy(ambCol).lerp(flashCol, fl * 0.8);
      moon.intensity = moonBase * (1 + fl * 9);
      mood.fl = fl; winGlow.material.opacity = 0.28 + fl * 0.7; patch.material.opacity = 0.32 + fl * 0.6;
      // the lamp flickers a hair, like an old bulb
      lampL.intensity = L.lampI * PI * (1 + Math.sin(t * 13.1) * 0.012 + Math.sin(t * 5.3) * 0.01);
      // rain runs down the glass
      rainTex.offset.y = (rainTex.offset.y + dt * 0.11) % 1;
      // motes drift and sparkle; the moonbeam's shine brighter in a flash
      for (const cl of clouds) {
        const { pos, colA, base, ph, bright, col, n } = cl, boost = cl === moonM ? 1 + fl * 2 : 1;
        for (let i = 0; i < n; i++) {
          const i3 = i * 3, i4 = i * 4, sp = ph[i4 + 3];
          pos[i3] = base[i3] + Math.sin(t * 0.21 * sp + ph[i4]) * 1.4;
          pos[i3 + 1] = base[i3 + 1] + Math.sin(t * 0.15 * sp + ph[i4 + 1]) * 1.1;
          pos[i3 + 2] = base[i3 + 2] + Math.cos(t * 0.18 * sp + ph[i4 + 2]) * 1.4;
          const k = bright[i] * (0.55 + 0.45 * Math.sin(t * 1.3 * sp + ph[i4] * 3)) * boost;
          colA[i3] = col.r * k; colA[i3 + 1] = col.g * k; colA[i3 + 2] = col.b * k;
        }
        cl.pts.geometry.attributes.position.needsUpdate = true; cl.pts.geometry.attributes.color.needsUpdate = true;
      }
      // fairy lights twinkle
      for (let i = 0; i < NB; i++) { const c = fairyBase[i], k = 0.62 + 0.38 * Math.sin(t * twPh[i][1] + twPh[i][0]); fairyCol[i * 3] = c.r * k; fairyCol[i * 3 + 1] = c.g * k; fairyCol[i * 3 + 2] = c.b * k; }
      fg.attributes.color.needsUpdate = true;
      placeFlags(t);
    };
    return mood;
  };
  return M;
})();
