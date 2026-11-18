/* Pip & Bo - 3D kit: Pip and Bo as code-built models.

   const h = K3D.hero(id)          a Group: Pip (0) or Bo (1), feet at y = 0, facing +Z when heading is 0
   K3D.heroPose(h, s, dt)          moves it to match a pose each drawn frame:
       s = { x, y, z,               feet position (units)
             heading,               the way it faces (radians about Y; 0 = toward +Z, the viewer)
             speed,                 0..1 of a normal run (lean, waddle)
             vy,                    up speed in units/s (stretch in the air)
             land,                  set true on the frame it lands (squash)
             hands: [p, p] | null,  world points the two arms reach for (a held pencil), else they swing
             stun, mood }           'whoa' (edge teeter: arms wave), 'sit' (bumped down)
   h.userData.points = { head, back, body, face, hand }: Object3Ds that 3D outfit parts hang on (js/3d/outfits3d.js).
   Sizes match the 2D body: 22 x 26 px is 0.73 x 0.87 units, eyes at 60% height, ears r 5 px, the sprout and leaf.
   Colours come from PCOL / PDARK (js/core.js) so they are the 2D colours exactly; the ink round the body is the darker
   rim (C.pipDark / C.boDark), as in drawPlayer.
*/
'use strict';

(function () {
  const T = K3D.T;
  const BW = PW / K3D.U, BH = PH / K3D.U, BD = 0.62, BP = 0.6; // body width, height, depth, roundness
  K3D.HERO = { w: BW, h: BH, d: BD };
  const EYE_Y = BH * 0.6;

  K3D.hero = function (id) {
    const col = PCOL[id], dark = PDARK[id];
    const g = new T.Group(); g.name = NAMES[id];
    const bodyPivot = new T.Group(); g.add(bodyPivot);      // squash / lean / waddle turn this
    const body = K3D.mesh(K3D.geo('heroBody', () => K3D.roundBox(BW, BH, BD, BP, 48)), K3D.toon(col), { ink: dark, inkW: 1.25 });
    bodyPivot.add(body);
    // the soft shine on the upper left of the 2D body, and the shaded underside
    const shine = new T.Mesh(K3D.geo('heroShine', () => new T.SphereGeometry(1, 20, 12)), K3D.flat('#ffffff', { transparent: true, opacity: 0.2, depthWrite: false }));
    shine.scale.set(0.06, 0.1, 0.02); shine.position.set(-0.24, BH * 0.84, K3D.roundBoxFront(BW, BH, BD, BP, -0.24, BH * 0.84) - 0.004);
    shine.rotation.set(-0.5, -0.5, 0.3);
    shine.userData.noSee = true; bodyPivot.add(shine);
    // face: eyes (white, pupil, glint) and cheeks, placed on the curved front
    const face = new T.Group(); face.position.set(0, 0, 0); bodyPivot.add(face);
    const eyes = [];
    for (const sx of [-1, 1]) {
      const ex = sx * 5 / K3D.U, ez = K3D.roundBoxFront(BW, BH, BD, BP, ex, EYE_Y);
      const eye = new T.Group(); eye.position.set(ex, EYE_Y, ez - 0.012); face.add(eye);
      const white = K3D.mesh(K3D.geo('eyeWhite', () => new T.SphereGeometry(1, 24, 16)), K3D.mat('eyeWhiteM', () => K3D.flat('#ffffff')), { ink: '#1c1a36', inkW: 0.7, cast: false });
      white.scale.set(3.6 / K3D.U, 4.4 / K3D.U, 0.05);
      eye.add(white);
      const pupil = new T.Mesh(K3D.geo('eyePupil', () => new T.SphereGeometry(1, 20, 14)), K3D.flat(C.ink));
      pupil.scale.set(2.1 / K3D.U, 2.3 / K3D.U, 0.03); pupil.position.set(0, -0.8 / K3D.U, 0.045);
      eye.add(pupil);
      const glint = new T.Mesh(K3D.geo('eyeGlint', () => new T.SphereGeometry(1, 12, 8)), K3D.flat('#ffffff'));
      glint.scale.set(0.8 / K3D.U, 0.8 / K3D.U, 0.01); glint.position.set(-0.8 / K3D.U, 0.2 / K3D.U, 0.07);
      eye.add(glint);
      eyes.push({ g: eye, white, pupil, glint });
      const cx = sx * 7 / K3D.U, cy = EYE_Y - 6 / K3D.U;
      const cheek = new T.Mesh(K3D.geo('cheek', () => new T.CircleGeometry(1, 20)), K3D.flat('#ff788c', { transparent: true, opacity: 0.45, depthWrite: false }));
      cheek.scale.set(2.6 / K3D.U, 2.2 / K3D.U, 1);
      cheek.position.set(cx, cy, K3D.roundBoxFront(BW, BH, BD, BP, cx, cy) + 0.004);
      cheek.rotation.y = sx * 0.5; cheek.userData.noSee = true;
      face.add(cheek);
    }
    // attach points for outfit parts
    const pt = n => { const o = new T.Group(); o.name = n; bodyPivot.add(o); return o; };
    const points = { head: pt('head'), back: pt('back'), body: pt('body'), face: pt('face'), hand: pt('hand') };
    points.head.position.set(0, BH, 0); points.back.position.set(0, BH * 0.5, -BD / 2);
    points.body.position.set(0, BH * 0.17, 0); points.face.position.set(0, EYE_Y, BD / 2);
    // Pip's sprout, Bo's ears
    let sprout = null;
    if (id === 0) {
      sprout = new T.Group(); sprout.position.set(0, BH - 0.02, 0); points.head.parent.add(sprout);
      const stem = K3D.mesh(new T.CylinderGeometry(0.022, 0.03, 0.24, 8).translate(0, 0.12, 0), K3D.toon('#3f8f5c'), { ink: '#24533a', inkW: 0.6 });
      stem.rotation.z = -0.12; sprout.add(stem);
      const leafGeo = K3D.geo('leaf', () => {
        const s = new T.Shape(); s.moveTo(0, 0); s.quadraticCurveTo(0.12, 0.11, 0.3, 0.02); s.quadraticCurveTo(0.14, -0.08, 0, 0);
        return new T.ExtrudeGeometry(s, { depth: 0.02, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 2, curveSegments: 10 }).translate(0, 0, -0.01);
      });
      const leaf = K3D.mesh(leafGeo, K3D.toon('#5cc27f'), { ink: '#2f7a4d', inkW: 0.8 });
      leaf.scale.setScalar(0.75); leaf.position.set(0.03, 0.2, 0); leaf.rotation.set(0.25, -0.4, 0.42); sprout.add(leaf);
      const leaf2 = K3D.mesh(leafGeo, K3D.toon('#5cc27f'), { ink: '#2f7a4d', inkW: 0.8 });
      leaf2.scale.setScalar(0.42); leaf2.position.set(0.0, 0.16, 0); leaf2.rotation.set(-0.3, 0.3, Math.PI - 0.5); sprout.add(leaf2);
    }
    const ears = [];
    if (id === 1) {
      for (const sx of [-1, 1]) {
        const ear = K3D.mesh(K3D.geo('ear', () => new T.SphereGeometry(5 / K3D.U, 24, 16)), K3D.toon(col), { ink: dark, inkW: 1.1 });
        ear.scale.set(1, 1, 0.62); ear.position.set(sx * (BW / 2 - 4 / K3D.U), BH - 0.02, -0.04);
        bodyPivot.add(ear);
        const inner = new T.Mesh(K3D.geo('earIn', () => new T.CircleGeometry(2.6 / K3D.U, 18)), K3D.toon(mixHex(col, '#ffffff', 0.35)));
        inner.position.set(0, 0.01, 0.105); ear.add(inner);
        ears.push(ear);
      }
    }
    // little arms: a nub from each side that reaches for what it holds
    const arms = [];
    for (const sx of [-1, 1]) {
      const sh = new T.Group(); sh.position.set(sx * (BW / 2 - 0.04), BH * 0.4, 0.02); bodyPivot.add(sh);
      const arm = K3D.mesh(K3D.geo('arm', () => new T.CapsuleGeometry(0.065, 0.2, 6, 12).translate(0, -0.13, 0)), K3D.toon(col), { ink: dark, inkW: 1 });
      sh.add(arm);
      arms.push({ sh, arm, sx });
    }
    g.userData = { id, bodyPivot, body, eyes, sprout, ears, arms, points, face,
      anim: { phase: 0, sq: 0, sqV: 0, blinkT: 1 + id, blink: 0, lean: 0 } };
    return g;
  };

  const tmp = new T.Vector3(), tmp2 = new T.Vector3(), up = new T.Vector3(0, 1, 0), dn = new T.Vector3(0, -1, 0), q = new T.Quaternion();
  K3D.heroPose = function (h, s, dt) {
    const u = h.userData, a = u.anim;
    h.position.set(s.x, s.y, s.z);
    h.rotation.y = s.heading || 0;
    // squash and stretch: a spring on the height; a landing kicks it down, rising stretches it
    if (s.land) a.sqV -= 3.2;
    const want = clamp((s.vy || 0) * 0.025, -0.12, 0.16);
    a.sqV += ((want - a.sq) * 120 - a.sqV * 14) * dt; a.sq += a.sqV * dt;
    const sy = 1 + a.sq, sxz = 1 / Math.sqrt(Math.max(0.6, sy));
    // walking: a waddle side to side with a little bob, and a lean into the way it goes
    const sp = clamp(s.speed || 0, 0, 1.4);
    a.phase += dt * (6 + sp * 9) * (sp > 0.05 ? 1 : 0);
    if (sp < 0.05) a.phase = approach(a.phase % Math.PI, 0, dt * 6);
    a.lean += ((sp * 0.16) - a.lean) * Math.min(1, dt * 10);
    const bp = u.bodyPivot;
    bp.scale.set(sxz, sy, sxz);
    bp.rotation.set(a.lean, 0, Math.sin(a.phase) * 0.09 * Math.min(1, sp * 2));
    bp.position.y = Math.abs(Math.sin(a.phase)) * 0.045 * Math.min(1, sp * 2);
    if (s.mood === 'sit') { bp.scale.set(1.12, 0.84, 1.12); bp.rotation.x = -0.1; }
    // blink every few seconds (the 2D game's rhythm: 0.12 s closed every 2-5 s)
    a.blinkT -= dt; a.blink -= dt;
    if (a.blinkT <= 0) { a.blink = 0.12; a.blinkT = 2 + ((h.id * 7.3 + a.phase * 13.1) % 3); }
    const closed = a.blink > 0 || s.stun;
    for (const e of u.eyes) {
      e.g.scale.y = closed ? 0.12 : 1;
      e.pupil.position.x = (s.lookX || 0) * 0.02;
    }
    // arms: reach for the hands' targets, or swing with the waddle; 'whoa' waves them up
    h.updateMatrixWorld(true);
    for (const [k, arm] of u.arms.entries()) {
      const tgt = s.hands && s.hands[k];
      if (tgt) {
        arm.sh.getWorldPosition(tmp);
        tmp2.copy(tgt).sub(tmp);
        const len = tmp2.length();
        // point the arm (which hangs along -Y) at the target, in the shoulder's parent space
        arm.sh.parent.getWorldQuaternion(q).invert();
        tmp2.applyQuaternion(q).normalize();
        arm.sh.quaternion.setFromUnitVectors(dn, tmp2);
        arm.arm.scale.set(1, clamp(len / 0.26, 0.8, 1.9), 1);
      } else if (s.mood === 'whoa') {
        arm.sh.rotation.set(Math.sin(G.clock * 18 + k * 3) * 0.6, 0, arm.sx * (2.4 + Math.sin(G.clock * 22 + k) * 0.4));
        arm.arm.scale.set(1, 1, 1);
      } else {
        arm.sh.rotation.set(Math.sin(a.phase + k * Math.PI) * 0.7 * Math.min(1, sp * 2), 0, arm.sx * 0.28);
        arm.arm.scale.set(1, 1, 1);
      }
    }
  };
})();
