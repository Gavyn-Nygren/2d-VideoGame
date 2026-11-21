/* Pip & Bo - 43-1 Coin Drop: the machine's life for the scenery files. Loaded on demand with the 3D kit, after the
   arcade kit. Display only.
     ARCADECOIN_LIFE.actor(o)          a pixel creature as its own little model, for the ones in a story who must move
                                       about (the instanced crowds stay in ARCADE.critters): o = { kind: 'blip' | 'stack' |
                                       'worker' | 'floaty' | 'crab', col, col2, s, hat } -> Group; pose it each frame with
     ARCADECOIN_LIFE.pose(a, act, t, o)  act: 'idle' | 'walk' | 'run' | 'wave' | 'cheer' | 'work' | 'sit' | 'sleep' |
                                       'peek' | 'tremble' | 'hang' | 'slide' | 'spray' | 'push'; o = { dir, look }
     ARCADECOIN_LIFE.nib()             NIB, the nervous little creature who turns up in every stretch: a lavender blip
                                       with huge eyes, one bent antenna and a tiny backpack (always on the move, always
                                       just about to hide)
     ARCADECOIN_LIFE.lamps(K, n)       light that does half the work: n real point lights shared by every pool of light
                                       on the route (spots.add(p, col, k, dist)); each frame they go to the n spots
                                       nearest the camera's target, so every lamp, screen and fire on the way lights
                                       its own patch of the world as the riders reach it
   All creatures and names are made up. */
'use strict';

const ARCADECOIN_LIFE = (function () {
  const T = K3D.T, INK = '#120d14';
  const hot = (c, k) => new T.Color(c).multiplyScalar(k);
  const box = K3D.geo('al-box', () => new T.BoxGeometry(1, 1, 1));
  const M = (col, k = 1) => K3D.mat('al-m|' + col + '|' + k, () => K3D.toon(col, { emissive: col, emissiveIntensity: 0.35 * k }));
  const F = (col, k = 1) => K3D.mat('al-f|' + col + '|' + k, () => K3D.flat(hot(col, k)));
  const cube = (parent, x, y, z, sx, sy, sz, mat, ink) => { const m = ink ? K3D.mesh(box, mat, { ink: INK, inkW: 0.5 }) : new T.Mesh(box, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); parent.add(m); return m; };

  function actor(o = {}) {
    const s = o.s || 1, col = o.col || '#5aff8a', col2 = o.col2 || '#ffe24a', kind = o.kind || 'blip';
    const g = new T.Group(), body = new T.Group(); g.add(body);
    const U = { body, legs: [], arms: [], eyes: [], kind, s, ph: o.ph != null ? o.ph : Math.random() * 10 };
    const dark = '#' + new T.Color(col).multiplyScalar(0.6).getHexString();
    if (kind === 'stack') {
      cube(body, 0, 0.22, 0, 0.62, 0.42, 0.56, M(dark), true); cube(body, 0, 0.62, 0, 0.56, 0.4, 0.52, M(col), true); cube(body, 0, 1.0, 0, 0.5, 0.38, 0.48, M(col), true);
      for (const sx of [-1, 1]) { U.eyes.push(cube(body, sx * 0.12, 1.04, 0.25, 0.14, 0.16, 0.03, F('#f8f4ea'))); cube(body, sx * 0.12, 1.03, 0.27, 0.07, 0.08, 0.03, F('#16121a')); }
      cube(body, 0, 1.36, 0, 0.05, 0.34, 0.05, M(dark)); U.tip = cube(body, 0, 1.56, 0, 0.13, 0.13, 0.13, F(col2, 1.8));
      for (const sx of [-1, 1]) { const a = new T.Group(); a.position.set(sx * 0.38, 0.78, 0); cube(a, 0, -0.16, 0, 0.14, 0.32, 0.14, M(dark), true); body.add(a); U.arms.push(a); }
    } else if (kind === 'floaty') {
      cube(body, 0, 0.9, 0, 0.5, 0.5, 0.5, M(col), true); for (const [x, y] of [[-0.42, 0.9], [0.42, 0.9], [0, 1.32], [0, 0.48]]) cube(body, x, y, 0, 0.34, 0.34, 0.34, M(dark), true);
      U.eyes.push(cube(body, 0, 0.92, 0.26, 0.3, 0.3, 0.04, F('#f8f4ea'))); cube(body, 0, 0.9, 0.29, 0.14, 0.14, 0.03, F('#16121a')); U.tip = cube(body, 0, 0.18, 0, 0.12, 0.12, 0.12, F(col2, 1.8));
    } else if (kind === 'crab') {
      cube(body, 0, 0.36, 0, 1.3, 0.42, 0.8, M(col), true);
      for (const [x, z] of [[-0.5, 0.25], [0.5, 0.25], [-0.5, -0.25], [0.5, -0.25]]) { const l = new T.Group(); l.position.set(x, 0.2, z); cube(l, 0, -0.1, 0, 0.14, 0.3, 0.14, M(dark), true); body.add(l); U.legs.push(l); }
      for (const sx of [-1, 1]) { cube(body, sx * 0.25, 0.7, 0.2, 0.07, 0.3, 0.07, M(dark)); U.eyes.push(cube(body, sx * 0.25, 0.9, 0.2, 0.2, 0.2, 0.2, F('#f8f4ea'))); cube(body, sx * 0.25, 0.9, 0.3, 0.09, 0.09, 0.04, F('#16121a')); const a = new T.Group(); a.position.set(sx * 0.82, 0.42, 0.1); cube(a, 0, 0, 0, 0.3, 0.16, 0.2, F(col2, 1.4), true); body.add(a); U.arms.push(a); }
    } else {
      // blip and worker: a chunky cube with big eyes, little legs and arms (a worker has a hard hat and a spanner)
      cube(body, 0, 0.62, 0, 1, 0.86, 0.8, M(col), true);
      for (const sx of [-1, 1]) { U.eyes.push(cube(body, sx * 0.22, 0.72, 0.41, 0.26, 0.28, 0.04, F('#f8f4ea'))); cube(body, sx * 0.22, 0.7, 0.44, 0.12, 0.14, 0.04, F('#16121a')); }
      for (const sx of [-1, 1]) { const l = new T.Group(); l.position.set(sx * 0.26, 0.22, 0); cube(l, 0, -0.11, 0, 0.22, 0.24, 0.24, M(dark), true); body.add(l); U.legs.push(l); }
      for (const sx of [-1, 1]) { const a = new T.Group(); a.position.set(sx * 0.6, 0.8, 0); cube(a, 0, -0.2, 0, 0.18, 0.42, 0.18, M(dark), true); body.add(a); U.arms.push(a); }
      if (kind === 'worker' || o.hat === 'hard') { cube(body, 0, 1.08, 0, 0.84, 0.2, 0.7, M('#ffd23a'), true); cube(body, 0, 1.0, 0.24, 0.9, 0.06, 0.4, M('#ffd23a')); }
      if (kind === 'worker') cube(U.arms[1], 0, -0.48, 0.08, 0.1, 0.36, 0.1, M('#b8b8c0'), true);
      if (o.hat === 'cap') { cube(body, 0, 1.1, 0, 0.8, 0.16, 0.7, M(col2), true); cube(body, 0, 1.04, 0.42, 0.7, 0.05, 0.3, M(col2)); }
      if (o.hat === 'bow') { cube(body, -0.16, 1.1, 0, 0.26, 0.2, 0.1, M(col2), true); cube(body, 0.16, 1.1, 0, 0.26, 0.2, 0.1, M(col2), true); cube(body, 0, 1.1, 0, 0.1, 0.12, 0.12, M(col2)); }
      if (o.hat === 'antenna') { cube(body, 0, 1.2, 0, 0.05, 0.32, 0.05, M(dark)); U.tip = cube(body, 0, 1.4, 0, 0.12, 0.12, 0.12, F(col2, 1.8)); }
    }
    g.scale.setScalar(s * 0.42);
    g.userData = U; g.userData.live = true;
    return g;
  }

  // the pose for this frame (t: seconds of the scene clock)
  function pose(a, act, t, o = {}) {
    const U = a.userData, b = U.body, p = t * 1 + U.ph;
    b.position.set(0, 0, 0); b.rotation.set(0, 0, 0); b.scale.set(1, 1, 1);
    U.legs.forEach(l => l.rotation.set(0, 0, 0)); U.arms.forEach(l => l.rotation.set(0, 0, 0));
    const sw = Math.sin(p * 10);
    if (act === 'walk' || act === 'run' || act === 'push') {
      const k = act === 'run' ? 1.8 : 1;
      U.legs.forEach((l, i) => { l.rotation.x = Math.sin(p * 10 * k + i * Math.PI) * 0.7; }); U.arms.forEach((l, i) => { l.rotation.x = act === 'push' ? -1.3 : -Math.sin(p * 10 * k + i * Math.PI) * 0.6; });
      b.position.y = Math.abs(Math.sin(p * 10 * k)) * 0.08 * k; b.rotation.x = act === 'push' ? 0.25 : 0.08 * k;
    } else if (act === 'wave') { if (U.arms[1]) U.arms[1].rotation.z = 2.4 + Math.sin(p * 9) * 0.5; b.position.y = Math.abs(Math.sin(p * 3)) * 0.04; }
    else if (act === 'cheer') { b.position.y = Math.abs(Math.sin(p * 7)) * 0.4; U.arms.forEach((l, i) => { l.rotation.z = (i ? 1 : -1) * (2.5 + Math.sin(p * 14) * 0.3); }); }
    else if (act === 'work') { if (U.arms[1]) U.arms[1].rotation.x = -1.2 + Math.abs(Math.sin(p * 6)) * 1.2; b.rotation.x = 0.15; }
    else if (act === 'spray') { if (U.arms[1]) { U.arms[1].rotation.x = -1.5; U.arms[1].rotation.z = Math.sin(p * 2) * 0.4; } b.rotation.y = Math.sin(p * 2) * 0.15; }
    else if (act === 'sit') { b.position.y = -0.18; b.scale.set(1.05, 0.9, 1.05); U.legs.forEach(l => { l.rotation.x = -1.4; }); }
    else if (act === 'sleep') { b.scale.set(1.1, 0.8 + Math.sin(p * 1.5) * 0.04, 1.1); b.position.y = -0.2; U.eyes.forEach(e => { e.scale.y = 0.03; }); }
    else if (act === 'tremble') { b.position.x = Math.sin(t * 60) * 0.04; b.scale.set(1.04, 0.94, 1.04); }
    else if (act === 'hang') { b.rotation.z = Math.sin(p * 2) * 0.2; U.arms.forEach((l, i) => { l.rotation.z = (i ? 1 : -1) * 2.9; }); U.legs.forEach((l, i) => { l.rotation.x = Math.sin(p * 4 + i) * 0.5; }); }
    else if (act === 'slide') { b.rotation.x = -0.3; U.arms.forEach((l, i) => { l.rotation.z = (i ? 1 : -1) * 1.6; }); }
    else if (act === 'peek') { b.position.y = Math.sin(p * 0.9) * 0.1; b.rotation.z = Math.sin(p * 0.7) * 0.25; }
    else { b.position.y = Math.abs(Math.sin(p * 2)) * 0.05; b.rotation.y = Math.sin(p * 0.5) * 0.2; }
    // eyes blink now and then (not when asleep)
    if (act !== 'sleep') { const bl = (p % 3.7) < 0.12; U.eyes.forEach(e => { e.scale.y = bl ? 0.03 : (e.userData.y0 || (e.userData.y0 = e.scale.y)); }); }
    if (o.look != null) b.rotation.y += o.look;
  }

  // NIB: the nervous one. A small lavender blip, huge eyes with tiny pupils, one bent antenna with a pale tip, a
  // little green backpack, knobbly knees. nib.userData.eyes / pupils / antenna for the expressions.
  function nib() {
    const g = new T.Group(), body = new T.Group(); g.add(body);
    const lav = M('#b89aff', 1), dk = M('#7a5ac8', 1);
    cube(body, 0, 0.6, 0, 0.9, 0.8, 0.72, lav, true);
    const eyes = [], pupils = [];
    for (const sx of [-1, 1]) {
      eyes.push(cube(body, sx * 0.22, 0.72, 0.37, 0.34, 0.38, 0.04, F('#ffffff')));
      pupils.push(cube(body, sx * 0.22, 0.7, 0.4, 0.09, 0.1, 0.03, F('#16121a')));
    }
    cube(body, -0.3, 0.98, 0.2, 0.14, 0.05, 0.04, dk); cube(body, 0.3, 0.98, 0.2, 0.14, 0.05, 0.04, dk); // worried brows
    cube(body, 0, 0.42, 0.37, 0.16, 0.05, 0.03, F('#3a1a40')); // a tiny wobbly mouth
    const ant = new T.Group(); ant.position.set(0.12, 1.0, 0); body.add(ant);
    cube(ant, 0, 0.16, 0, 0.05, 0.32, 0.05, dk); const bend = new T.Group(); bend.position.y = 0.32; bend.rotation.z = 0.9; ant.add(bend); cube(bend, 0, 0.1, 0, 0.05, 0.2, 0.05, dk); const tip = cube(bend, 0, 0.24, 0, 0.12, 0.12, 0.12, F('#fff0a8', 1.8));
    cube(body, 0, 0.62, -0.46, 0.6, 0.5, 0.24, M('#3aa860'), true); cube(body, 0, 0.84, -0.6, 0.3, 0.12, 0.08, M('#2a7a48'));
    const legs = [], arms = [];
    for (const sx of [-1, 1]) { const l = new T.Group(); l.position.set(sx * 0.22, 0.22, 0); cube(l, 0, -0.11, 0, 0.16, 0.24, 0.18, dk, true); body.add(l); legs.push(l); const a = new T.Group(); a.position.set(sx * 0.52, 0.72, 0); cube(a, 0, -0.16, 0, 0.13, 0.34, 0.13, dk, true); body.add(a); arms.push(a); }
    g.scale.setScalar(0.4);
    g.userData = { body, eyes, pupils, ant, tip, legs, arms, live: true, kind: 'nib', ph: 0, eyes0: eyes.map(e => e.scale.y) };
    return g;
  }
  // Nib's moods: 'hide' (crouched, peeking out, trembling), 'peek' (rises, looks), 'flee' (runs, arms up), 'wave' (a
  // shy little wave once the heroes have passed), 'relief'
  function nibPose(n, mood, t, look = 0) {
    const U = n.userData, b = U.body;
    b.position.set(0, 0, 0); b.rotation.set(0, look, 0); b.scale.set(1, 1, 1);
    U.legs.forEach(l => l.rotation.set(0, 0, 0)); U.arms.forEach(l => l.rotation.set(0, 0, 0));
    U.ant.rotation.z = Math.sin(t * 5) * 0.15;
    const bl = (t % 2.9) < 0.1; U.eyes.forEach((e, i) => { e.scale.y = bl ? 0.03 : 0.38; });
    U.pupils.forEach((p, i) => { p.position.x = (i ? 0.22 : -0.22) + Math.sin(t * 1.3) * 0.06; });
    if (mood === 'hide') { b.position.y = -0.3; b.scale.set(1.08, 0.82, 1.08); b.position.x = Math.sin(t * 50) * 0.03; U.arms.forEach((a, i) => { a.rotation.z = (i ? 1 : -1) * 2.2; a.rotation.x = -0.6; }); }
    else if (mood === 'peek') { b.position.y = -0.1 + Math.sin(t * 2) * 0.05; b.rotation.z = 0.3; b.position.x = Math.sin(t * 40) * 0.015; }
    else if (mood === 'flee') { U.legs.forEach((l, i) => { l.rotation.x = Math.sin(t * 26 + i * Math.PI) * 0.9; }); U.arms.forEach((a, i) => { a.rotation.z = (i ? 1 : -1) * 2.8; }); b.position.y = Math.abs(Math.sin(t * 26)) * 0.12; U.eyes.forEach(e => { e.scale.y = 0.44; }); U.pupils.forEach(p => { p.scale.set(0.06, 0.07, 0.03); }); }
    else if (mood === 'wave') { U.arms[1].rotation.z = 2.3 + Math.sin(t * 8) * 0.4; b.rotation.z = -0.08; }
    else { b.position.y = Math.abs(Math.sin(t * 2.5)) * 0.03; }
  }

  // the light pool: n real point lights moved each frame to the n spots nearest the camera's target
  function lamps(K, n = 6) {
    const lights = [];
    for (let i = 0; i < n; i++) { const l = new T.PointLight('#ffffff', 0, 12, 1.6); K.add(l); lights.push(l); }
    const spots = [];
    const P = { lights, spots,
      add(p, col, k = 2, dist = 12, o = {}) { spots.push({ p: p.clone ? p.clone() : new T.Vector3(p[0], p[1], p[2]), col: new T.Color(col), k, dist, flick: o.flick || 0, ph: Math.random() * 10, fn: o.fn || null }); return spots.length - 1; },
      update(at, t) {
        const near = spots.map((s, i) => [s.p.distanceToSquared(at), i]).sort((a, b) => a[0] - b[0]).slice(0, n);
        lights.forEach((l, i) => {
          const q = near[i]; if (!q) { l.intensity = 0; return; }
          const s = spots[q[1]];
          l.position.copy(s.p); l.color.copy(s.col); l.distance = s.dist;
          let k = s.k;
          if (s.flick) k *= (Math.sin(t * 23 + s.ph) > 0.85 - s.flick ? 0.25 : 1) * (0.9 + 0.1 * Math.sin(t * 7 + s.ph));
          if (s.fn) k *= s.fn(t);
          // (fades in as it becomes one of the nearest, so a light never pops on)
          const fade = Math.min(1, Math.max(0, (Math.sqrt(near[n - 1] ? near[n - 1][0] : 1e9) - Math.sqrt(q[0])) / 6 + 0.2));
          l.intensity = k * fade;
        });
      } };
    return P;
  }

  return { actor, pose, nib, nibPose, lamps };
})();
