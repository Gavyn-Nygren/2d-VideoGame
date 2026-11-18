/* Pip & Bo - 42-1 Runaway Coaster: the Comet's front car (number 7, shaped like a shooting star), the empty car
   rattling behind it, and Pip and Bo in their seats. Loaded on demand with the 3D kit.

   PARKCOASTER_CAR.build(K) -> car = { train, cars: [front, second], heroes, seats, bar, starBulbs, light }
   PARKCOASTER_CAR.pose(K, car, st, dt)   places the train on the rail and poses the riders from the rules' state
       (st: the level's G.mst). Display only: nothing here changes the rules.
   The car is modelled facing -Z with +X its right, so the rail's frame (right, up, back) places it directly.
   Pip sits on the left (x -0.37), Bo on the right (x +0.37), for the whole ride. */
'use strict';

const PARKCOASTER_CAR = (function () {
  const T = K3D.T, INK = '#1a1530';
  const hot = (c, k) => new T.Color(c).multiplyScalar(k);
  const CAR = { len: 2.4, gap: 0.42, len2: 2.0, seatX: 0.37, seatY: 0.6, seatZ: 0.12 };

  // the cream paint with gold comet streaks and a big 7, chipped and much repainted
  const paintTex = (num) => K3D.paint('pc-carpaint|' + num, 512, 256, (c, w, h) => {
    c.fillStyle = '#efe4c8'; c.fillRect(0, 0, w, h);
    // gold streaks sweeping back from the nose
    for (let i = 0; i < 3; i++) {
      c.fillStyle = ['#d8a63a', '#f2c95a', '#b8862a'][i];
      c.beginPath(); c.moveTo(0, h * (0.42 + i * 0.09)); c.bezierCurveTo(w * 0.4, h * (0.36 + i * 0.1), w * 0.7, h * (0.5 + i * 0.05), w, h * (0.42 + i * 0.12));
      c.lineTo(w, h * (0.47 + i * 0.12)); c.bezierCurveTo(w * 0.7, h * (0.56 + i * 0.05), w * 0.4, h * (0.42 + i * 0.1), 0, h * (0.48 + i * 0.09)); c.fill();
    }
    // a little star at the streaks' head, the number in a ring
    if (num) {
      c.fillStyle = '#7a2f5a'; c.beginPath(); c.arc(w * 0.62, h * 0.32, 34, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#f2c95a'; c.lineWidth = 6; c.stroke();
      c.fillStyle = '#fff4d8'; c.font = '900 52px "DejaVu Sans", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(num), w * 0.62, h * 0.33);
    }
    // chips and scuffs
    for (let i = 0; i < 120; i++) { const x = Math.random() * w, y = Math.random() * h, r = 1 + Math.random() * 5; c.fillStyle = Math.random() < 0.6 ? 'rgba(120,90,60,0.35)' : 'rgba(255,255,255,0.35)'; c.beginPath(); c.ellipse(x, y, r * 1.6, r * 0.7, Math.random() * 3, 0, Math.PI * 2); c.fill(); }
    c.strokeStyle = 'rgba(90,60,40,0.25)'; c.lineWidth = 2; c.strokeRect(6, 6, w - 12, h - 12);
  });
  // a five-point star shape
  function starShape(ro, ri) {
    const s = new T.Shape();
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 + Math.PI / 2, r = i % 2 ? ri : ro; const x = Math.cos(a) * r, y = Math.sin(a) * r; if (i) s.lineTo(x, y); else s.moveTo(x, y); }
    s.closePath(); return s;
  }

  function oneCar(K, front, num) {
    const g = new T.Group(), L = front ? CAR.len : CAR.len2;
    const cream = K3D.toon('#ffffff', { map: paintTex(num) }), gold = K3D.toon('#e2b04a'), dark = K3D.toon('#2a2438'), seatM = K3D.toon('#8a2a4a'), brass = K3D.toon('#e8c060');
    // chassis and wheels
    const ch = K3D.mesh(new T.BoxGeometry(1.2, 0.2, L * 0.86), dark, { ink: INK }); ch.position.y = 0.22; g.add(ch);
    const wheels = [];
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const wh = K3D.mesh(K3D.geo('pc-wheel', () => new T.CylinderGeometry(0.17, 0.17, 0.14, 16).rotateZ(Math.PI / 2)), dark, { ink: INK, inkW: 0.8 });
      wh.position.set(sx * 0.62, 0.12, sz * L * 0.32); g.add(wh); wheels.push(wh);
      const hub = new T.Mesh(K3D.geo('pc-hub', () => new T.CylinderGeometry(0.07, 0.07, 0.15, 10).rotateZ(Math.PI / 2)), brass); hub.position.copy(wh.position); hub.position.x += sx * 0.01; g.add(hub);
    }
    // the tub: rounded, cream and gold, lower in the middle where the riders sit
    const tub = K3D.mesh(K3D.roundBox(1.62, 0.56, L, 0.42, 40), cream, { ink: INK, inkW: 1.1 }); tub.position.y = 0.3; g.add(tub);
    const rim = K3D.mesh(new T.TorusGeometry(1, 0.05, 8, 48).rotateX(Math.PI / 2), gold, { ink: INK, inkW: 0.7 }); rim.scale.set(0.79, 1, L * 0.49); rim.position.y = 0.85; g.add(rim);
    const well = new T.Mesh(K3D.roundBox(1.3, 0.3, L * 0.7, 0.5, 24), K3D.toon('#3a2238')); well.position.set(0, 0.6, 0.05); g.add(well);
    // seat backs (a padded red bench behind the riders)
    const back = K3D.mesh(K3D.roundBox(1.36, front ? 0.5 : 0.34, 0.2, 0.5, 20), seatM, { ink: INK }); back.position.set(0, 0.86, CAR.seatZ + 0.5); back.rotation.x = 0.18; g.add(back);
    const pad = K3D.mesh(K3D.roundBox(1.34, 0.12, 0.6, 0.5, 16), seatM, { ink: INK, inkW: 0.7 }); pad.position.set(0, 0.56, CAR.seatZ + 0.12); g.add(pad);
    const out = { g, wheels, L };
    if (front) {
      // the shooting star nose: a fat gold star standing up at the front, a ring of bulbs round its edge
      const st = new T.ExtrudeGeometry(starShape(0.5, 0.24), { depth: 0.32, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.06, bevelSegments: 3 });
      st.translate(0, 0, -0.16);
      const star = K3D.mesh(st, K3D.toon('#f2c95a', { emissive: '#7a5410', emissiveIntensity: 0.35 }), { ink: INK, inkW: 1.2 });
      star.position.set(0, 0.68, -L / 2 - 0.14); star.rotation.z = 0.08; g.add(star);
      // a smiling face painted on the star (an old ride's mascot)
      const face = new T.Mesh(new T.CircleGeometry(0.2, 24), K3D.flat('#fff4d8')); face.position.set(0, 0.69, -L / 2 - 0.38); face.rotation.y = Math.PI; g.add(face);
      const fTex = K3D.paint('pc-starface', 128, 128, (c, w, h) => { c.fillStyle = '#2a1a20'; c.beginPath(); c.arc(42, 52, 9, 0, Math.PI * 2); c.arc(86, 52, 9, 0, Math.PI * 2); c.fill(); c.lineWidth = 7; c.strokeStyle = '#2a1a20'; c.beginPath(); c.arc(64, 66, 28, 0.25, Math.PI - 0.25); c.stroke(); c.fillStyle = 'rgba(240,120,140,0.6)'; c.beginPath(); c.arc(28, 78, 10, 0, Math.PI * 2); c.arc(100, 78, 10, 0, Math.PI * 2); c.fill(); });
      const fm = new T.Mesh(new T.CircleGeometry(0.19, 24), K3D.flat('#ffffff', { map: fTex, transparent: true })); fm.position.set(0, 0.69, -L / 2 - 0.39); fm.rotation.y = Math.PI; g.add(fm);
      const sb = PARK.bulbs(K, 80); g.add(sb.mesh);
      const shp = starShape(0.57, 0.28).getSpacedPoints(24);
      shp.forEach((p, i) => sb.add(p.x, 0.68 + p.y, -L / 2 - 0.34, i % 3 === 0 ? '#ffffff' : '#ffd27a', { size: 0.055, speed: 7, phase: i * 0.7 }));
      // headlamps and the side bulbs along the rim
      for (const sx of [-1, 1]) for (let i = 0; i < 6; i++) sb.add(sx * 0.82, 0.76, -L / 2 + 0.3 + i * 0.36, i % 2 ? '#ff8ab0' : '#ffe07a', { size: 0.045, speed: 5, phase: i * 0.9 + (sx > 0 ? 3 : 0) });
      sb.done();
      out.starBulbs = sb; out.star = star;
      // the brass lap bar: a U from the sides, hinged at the back of the well
      const bar = new T.Group(); bar.position.set(0, 0.88, CAR.seatZ + 0.2); g.add(bar);
      const pts = [new T.Vector3(-0.68, 0, 0), new T.Vector3(-0.66, 0.05, -0.42), new T.Vector3(-0.4, 0.08, -0.6), new T.Vector3(0.4, 0.08, -0.6), new T.Vector3(0.66, 0.05, -0.42), new T.Vector3(0.68, 0, 0)];
      const barM = K3D.mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 40, 0.045, 8), brass, { ink: INK, inkW: 0.8 }); bar.add(barM);
      const grip = K3D.mesh(new T.CylinderGeometry(0.06, 0.06, 0.6, 10).rotateZ(Math.PI / 2), K3D.toon('#2a2438'), { ink: INK, inkW: 0.6 }); grip.position.set(0, 0.08, -0.6); bar.add(grip);
      out.bar = bar;
    } else {
      // the comet's tail: a gold swoosh fin rising at the back
      const sh = new T.Shape(); sh.moveTo(0, 0); sh.quadraticCurveTo(0.6, 0.1, 1.1, 0.75); sh.quadraticCurveTo(0.5, 0.45, 0, 0.35); sh.closePath();
      const fin = K3D.mesh(new T.ExtrudeGeometry(sh, { depth: 0.08, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 2 }).translate(0, 0, -0.04).rotateY(-Math.PI / 2), gold, { ink: INK, inkW: 0.9 });
      fin.position.set(0, 0.82, L / 2 - 0.65); g.add(fin);
      const front2 = K3D.mesh(new T.ExtrudeGeometry(starShape(0.34, 0.16), { depth: 0.12, bevelEnabled: false }).translate(0, 0, -0.06), K3D.toon('#f2c95a'), { ink: INK, inkW: 0.8 });
      front2.position.set(0, 0.75, -L / 2 - 0.04); g.add(front2);
      const sb = PARK.bulbs(K, 20); g.add(sb.mesh);
      for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) sb.add(sx * 0.82, 0.76, -L / 2 + 0.35 + i * 0.4, i % 2 ? '#ff8ab0' : '#ffe07a', { size: 0.045, speed: 5, phase: i * 0.9 });
      sb.done(); out.bulbs = sb;
    }
    // a coupling to the car behind
    const cp = K3D.mesh(new T.CylinderGeometry(0.05, 0.05, 0.5, 6).rotateX(Math.PI / 2), dark, { ink: INK, inkW: 0.6 }); cp.position.set(0, 0.22, L / 2 + 0.2); g.add(cp);
    return out;
  }

  function build(K) {
    const train = new T.Group(); K.add(train);
    const cars = [oneCar(K, true, 7), oneCar(K, false, 0)];
    for (const c of cars) train.add(c.g);
    const front = cars[0];
    // the riders, each in a seat pivot (lean rolls it, duck lowers it)
    const heroes = [], seats = [];
    for (const id of [0, 1]) {
      const seat = new T.Group(); seat.position.set((id ? 1 : -1) * CAR.seatX, CAR.seatY, CAR.seatZ); front.g.add(seat);
      const h = K3D.hero(id); seat.add(h);
      K3D.dress(h, 'parkcoaster');
      const m = h.userData.body.material; m.emissive = new T.Color(PCOL[id]); m.emissiveIntensity = 0.2;
      // a mouth: a grin on the drops, an O on the lift hill
      const BW = K3D.HERO.w, BH = K3D.HERO.h, BD = K3D.HERO.d, my = BH * 0.6 - 0.15;
      const mz = K3D.roundBoxFront(BW, BH, BD, 0.6, 0, my);
      const grin = new T.Mesh(new T.CircleGeometry(0.075, 16, Math.PI, Math.PI), K3D.flat('#3a1a28')); grin.position.set(0, my + 0.03, mz + 0.004); h.userData.face.add(grin);
      const tongue = new T.Mesh(new T.CircleGeometry(0.04, 12, Math.PI, Math.PI), K3D.flat('#ff7a8a')); tongue.position.set(0, my - 0.012, mz + 0.006); h.userData.face.add(tongue);
      const oh = new T.Mesh(new T.CircleGeometry(0.035, 14), K3D.flat('#3a1a28')); oh.position.set(0, my, mz + 0.004); oh.scale.y = 1.3; h.userData.face.add(oh);
      // stars circling a bonked head
      const stars = new T.Group(); stars.position.y = BH + 0.25; seat.add(stars);
      for (let i = 0; i < 3; i++) { const s = new T.Mesh(new T.ExtrudeGeometry(starShape(0.08, 0.035), { depth: 0.02, bevelEnabled: false }), K3D.flat(hot('#ffe07a', 1.6))); stars.add(s); }
      stars.visible = false;
      h.userData.extra = { grin, tongue, oh, stars };
      heroes.push(h); seats.push(seat);
    }
    // a warm light from the nose bulbs on the riders and the car (the one moving real light)
    const light = new T.PointLight('#ffd8a0', 2.4, 8, 1.6); light.position.set(0, 2.2, -1.6); front.g.add(light);
    // sparks: a small pool of glowing bits thrown back from the wheels
    const N = 220, pos = new Float32Array(N * 3), vel = new Float32Array(N * 3), life = new Float32Array(N);
    const sg = new T.BufferGeometry(); sg.setAttribute('position', new T.BufferAttribute(pos, 3)); sg.setAttribute('aL', new T.BufferAttribute(life, 1));
    const sm = new T.ShaderMaterial({ uniforms: { uPx: { value: 1 } }, transparent: true, depthWrite: false, blending: T.AdditiveBlending,
      vertexShader: 'attribute float aL; uniform float uPx; varying float vL; void main() { vL = aL; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = max(1.0, 60.0 * uPx / -mv.z) * aL; gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'varying float vL; void main() { if (vL <= 0.0) discard; float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(vec3(3.0, 2.2, 0.9) * smoothstep(0.5, 0.0, d) * vL, 1.0); }' });
    const sparks = new T.Points(sg, sm); sparks.frustumCulled = false; K.add(sparks);
    const car = { train, cars, front, heroes, seats, bar: front.bar, starBulbs: front.starBulbs, light, sparks: { pts: sparks, pos, vel, life, n: N, head: 0, mat: sm }, y: [0, 0, 0], hist: [], t: 0, scr: [null, null] };
    return car;
  }

  const m4 = new T.Matrix4(), vx = new T.Vector3(), vy = new T.Vector3(), vz = new T.Vector3(), q = new T.Quaternion(), qr = new T.Quaternion(), tmp = new T.Vector3();
  // place one car on the rail at s (or on a detour), rolled by `roll` radians about its length, lifted by `lift`
  function place(obj, f, roll, lift, tipSide) {
    vx.set(...f.br); vy.set(...f.bu); vz.set(-f.t[0], -f.t[1], -f.t[2]);
    m4.makeBasis(vx, vy, vz);
    q.setFromRotationMatrix(m4);
    // the roll pivots about the wheel on the side it tips onto (a tipped car stands on one rail)
    qr.setFromAxisAngle(tmp.set(0, 0, 1), -roll);
    q.multiply(qr);
    obj.quaternion.copy(q);
    const pv = tipSide ? tipSide * 0.62 : 0;
    obj.position.set(f.p[0], f.p[1], f.p[2]).addScaledVector(vy, lift);
    if (pv) {
      // keep the tipping wheel on its rail: move so that the pivot (pv, 0, 0) stays where it was before rolling
      const off = new T.Vector3(pv, 0, 0).applyQuaternion(obj.quaternion).sub(new T.Vector3(pv, 0, 0).applyQuaternion(new T.Quaternion().setFromRotationMatrix(m4)));
      obj.position.sub(off);
    }
  }

  function emitSparks(car, p, back, n, spread) {
    const S = car.sparks;
    for (let i = 0; i < n; i++) {
      const k = S.head = (S.head + 1) % S.n;
      S.pos[k * 3] = p.x; S.pos[k * 3 + 1] = p.y; S.pos[k * 3 + 2] = p.z;
      S.vel[k * 3] = back.x * 6 + (Math.random() - 0.5) * spread; S.vel[k * 3 + 1] = 1.5 + Math.random() * 2.5; S.vel[k * 3 + 2] = back.z * 6 + (Math.random() - 0.5) * spread;
      S.life[k] = 0.6 + Math.random() * 0.4;
    }
  }

  function pose(K, car, st, dt) {
    const PR = PARKCOASTER_ROUTE, R = PR.R;
    car.t += dt;
    const det = st.det >= 0 ? PR.dets[st.det] : null;
    const at = (ds) => {
      // a car behind the front one: along the detour or the main line, falling back onto the main line before it
      if (det) { const d = st.ds - ds; if (d >= 0) return det.at(d); return R.at(det.s0 + d); }
      return R.at(Math.max(0, st.s - ds));
    };
    // the train's own roll: the riders' tilt (a little), more when tipped onto one rail; the trailing cars follow late
    const lean = st.tilt * 0.12 + (st.tipped ? st.tipped * 0.34 : 0) + (st.screech > 0 ? Math.sin(car.t * 40) * 0.06 : 0);
    const shake = (st.phase === 'breakdown' && st.phaseT < 1.2) || st.safe > S_SAFE() - 0.35 ? Math.sin(car.t * 55) * 0.035 : 0;
    // the hop: the front car's height, replayed by each car behind when it reaches the same place
    car.hist.push({ s: st.det >= 0 ? -1 : st.s, y: st.air });
    while (car.hist.length > 240) car.hist.shift();
    const yAt = (s) => { for (let i = car.hist.length - 1; i >= 0; i--) if (car.hist[i].s >= 0 && car.hist[i].s <= s) return car.hist[i].y; return 0; };
    const offs = [0, CAR.len / 2 + CAR.gap + CAR.len2 / 2, CAR.len / 2 + CAR.gap * 2 + CAR.len2 * 1.5];
    const frames = [];
    car.cars.forEach((c, i) => {
      const f = at(offs[i]);
      frames.push(f);
      const lift = i === 0 ? st.air : yAt(st.s - offs[i]);
      // the bunny hop: the nose dips as it lands
      place(c.g, f, (i === 0 ? lean : lean * 0.5) + shake, lift, i === 0 && st.tipped ? st.tipped : 0);
      if (i === 0 && st.bunny > 0) c.g.rotateX(-Math.sin(st.bunny * Math.PI) * 0.12);
      if (i === 0 && st.phase === 'breakdown' && st.wheelOff) c.g.rotateZ(0.08);
      for (const w of c.wheels) w.rotation.x -= st.v * dt / 0.17;
    });
    car.frames = frames;
    // the bar: up while boarding (and after the stop), down for the ride
    const barDown = st.phase === 'board' ? (st.barDown ? 1 : 0) : st.barUp ? 0 : 1;
    car.barA = (car.barA == null ? 0 : car.barA) + (barDown - (car.barA || 0)) * Math.min(1, dt * 10);
    if (car.bar) car.bar.rotation.x = (1 - car.barA) * 1.2;
    // the nose bulbs chase faster with speed (and the light pulses with them)
    if (car.starBulbs) car.starBulbs.u.uT.value += dt * (st.v / 4);
    car.light.intensity = 2.2 + Math.sin(car.t * 6) * 0.2;
    // riders
    const f0 = frames[0];
    const fast = st.v > 11 && f0.pitch < -0.2, slowUp = st.v < 4 && f0.pitch > 0.2 && st.phase === 'ride';
    car.heroes.forEach((h, k) => {
      const seat = car.seats[k], ex = h.userData.extra, side = k === 0 ? -1 : 1;
      // leaning: the body rolls toward its lean (and slides a little), ducking squashes it down behind the rim
      const ln = st.phase === 'ride' ? st.lean[k] : 0;
      seat.userData.ln = (seat.userData.ln || 0) + (ln - (seat.userData.ln || 0)) * Math.min(1, dt * 12);
      const dk = st.phase === 'ride' && st.duck[k] ? 1 : 0;
      seat.userData.dk = (seat.userData.dk || 0) + (dk - (seat.userData.dk || 0)) * Math.min(1, dt * 14);
      const L = seat.userData.ln, D = seat.userData.dk;
      // boarding: they hop in from the platform (on Pip's left side) in the first second and a half
      let boardY = 0, boardX = 0;
      if (st.phase === 'board') { const u = Math.min(1, st.phaseT / (1.0 + k * 0.4)); boardY = Math.sin(u * Math.PI) * 0.9 * (u < 1 ? 1 : 0); boardX = (1 - u) * -2.2; }
      seat.position.set(side * CAR.seatX + L * 0.1 + boardX, CAR.seatY - D * 0.3 + boardY, CAR.seatZ);
      seat.rotation.set(0, 0, -L * 0.42);
      seat.scale.set(1, 1 - D * 0.2, 1);
      // hands: on the bar; thrown up on drops; one arm out on its own side for a lever
      car.front.g.updateMatrixWorld(true);
      const wp = (x, y, z) => new T.Vector3(x, y, z).applyMatrix4(car.front.g.matrixWorld);
      let hands = [wp(side * CAR.seatX - 0.2, 0.96, CAR.seatZ - 0.42), wp(side * CAR.seatX + 0.2, 0.96, CAR.seatZ - 0.42)];
      if (st.armUp[k] > 0 || (st.phase === 'stop' && st.phaseT > 2.6)) hands = [wp(side * CAR.seatX - 0.5, 2.4, CAR.seatZ - 0.1), wp(side * CAR.seatX + 0.5, 2.4, CAR.seatZ - 0.1)];
      if (st.arm[k] > 0) { const a = k === 0 ? 0 : 1; hands[a] = wp(side * (CAR.seatX + 1.0), 1.4, CAR.seatZ - 0.15); }
      K3D.heroPose(h, { x: 0, y: 0, z: 0, heading: Math.PI, speed: 0, vy: st.air > 0 ? (st.airT < st.airDur / 2 ? 2 : -2) : 0, hands, stun: st.bonk[k] > 0.6 }, dt);
      // faces: wide eyes on the lift hill, grins on drops, an O when bonked
      const wide = slowUp ? 1.28 : 1;
      for (const e of h.userData.eyes) { e.g.scale.x = wide; if (e.g.scale.y > 0.5) e.g.scale.y = wide; }
      ex.grin.visible = ex.tongue.visible = (fast || st.armUp[k] > 0 || st.phase === 'stop') && !(st.bonk[k] > 0);
      ex.oh.visible = !ex.grin.visible && (slowUp || st.bonk[k] > 0 || st.screech > 0);
      ex.stars.visible = st.bonk[k] > 0;
      if (ex.stars.visible) ex.stars.children.forEach((s, i) => { const a = car.t * 6 + i * 2.1; s.position.set(Math.cos(a) * 0.35, Math.sin(car.t * 9 + i) * 0.05, Math.sin(a) * 0.35); s.rotation.z = car.t * 4; });
      // what the wind does to the outfits: the popcorn box leans back, the foam finger flaps, the propeller spins,
      // the balloon streams behind
      const wind = Math.min(1, st.v / 16);
      for (const o of h.userData.worn || []) {
        const w = o.userData.wind; if (!w) continue;
        if (w.kind === 'tilt') o.rotation.x = -wind * w.amt + Math.sin(car.t * 13 + k) * 0.03 * wind - (st.bonk[k] > 0 ? 0 : 0);
        if (w.kind === 'flap') w.node.rotation.x = Math.sin(car.t * (8 + wind * 10)) * w.amt * (0.3 + wind);
        if (w.kind === 'prop') w.node.rotation.y += dt * (3 + st.v * 3.2);
        if (w.kind === 'balloon') { w.node.rotation.x = -0.3 - wind * 0.9 + Math.sin(car.t * 3.1) * 0.12; w.node.rotation.z = Math.sin(car.t * 2.3) * 0.15 - L * 0.3; }
        // a bonk knocks the hat up off the head and it drops back
        if (o.parent === h.userData.points.head) o.position.y = (o.userData.y0 != null ? o.userData.y0 : (o.userData.y0 = o.position.y)) + Math.sin(Math.min(1, st.bonk[k] / 1.2) * Math.PI) * 0.5;
      }
      // where the riders are on screen (name tags and bubbles)
      h.getWorldPosition(tmp); tmp.y += 0.9;
      const sp = K3D.toScreen(tmp.x, tmp.y, tmp.z);
      const p = G.players[k]; if (p && sp.z < 1) { p.x = sp.x - PW / 2; p.y = sp.y - PH; }
      car.scr[k] = sp; // display only (never on the state: the rules play the same without drawing)
    });
    // sparks: in a bend ridden right, a screech, a Rattle, the brakes, a breakdown
    const want = st.hug > 0 ? 3 : st.screech > 0 ? 4 : st.safe > S_SAFE() - 0.3 ? 8 : st.phase === 'stop' && st.phaseT < 2.4 ? 10 : st.phase === 'breakdown' && st.phaseT < 1.2 ? 6 : 0;
    if (want && st.v > 0.5) {
      const g0 = car.front.g; g0.updateMatrixWorld(true);
      const back = new T.Vector3(f0.t[0], 0, f0.t[2]).multiplyScalar(-1);
      for (const sx of [-1, 1]) { const p = new T.Vector3(sx * 0.66, 0.05, 0.75).applyMatrix4(g0.matrixWorld); emitSparks(car, p, back, Math.ceil(want / 2), 2.5); }
    }
    const S = car.sparks;
    S.mat.uniforms.uPx.value = K3D.R.domElement.height / 720;
    for (let k = 0; k < S.n; k++) { if (S.life[k] <= 0) continue; S.vel[k * 3 + 1] -= 12 * dt; S.pos[k * 3] += S.vel[k * 3] * dt; S.pos[k * 3 + 1] += S.vel[k * 3 + 1] * dt; S.pos[k * 3 + 2] += S.vel[k * 3 + 2] * dt; S.life[k] -= dt * 1.6; }
    S.pts.geometry.attributes.position.needsUpdate = true; S.pts.geometry.attributes.aL.needsUpdate = true;
  }
  const S_SAFE = () => PARKCOASTER.S.SAFE;
  return { build, pose, CAR, starShape };
})();
