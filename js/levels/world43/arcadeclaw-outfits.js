/* Pip & Bo - 43-3 Claw Machine Rescue: the 3D outfit 'arcadeclaw'. Loaded on demand with the 3D kit. The matching 2D
   outfit (previews, world page, title run) is defineOutfit('arcadeclaw') in claw-machine-rescue.js.
   Pip (seen through the cab glass, mostly head and shoulders): a prize-counter attendant. A mint-and-white striped
   waistcoat with a row of pinned prize tickets, a yellow bow tie, a yellow operator's headset with a little microphone
   (the band sits forward of the sprout, so the sprout stands up behind it), and a change-belt of coins.
   Bo (seen from behind and above, climbing): kitted out from the prizes themselves. A climbing harness of teal
   prize-ticket ribbon with a glow-stick clipped to it, half a clear yellow capsule worn as a helmet between the ears,
   purple fingerless gloves, and a tiny plush keyring swinging from the harness.
   Pip wears no blue, Bo no orange or red; eyes, sprout and ears stay clear. */
'use strict';

(function () {
  const T = K3D.T;
  const BW = K3D.HERO.w, BH = K3D.HERO.h, BD = K3D.HERO.d;
  const INK = '#15121c';
  const hot = (c, k) => new T.Color(c).multiplyScalar(k);
  const mk = (geo, mat, o) => K3D.mesh(geo, mat, o);
  const def3 = (n, fn, o) => K3D.definePart3(n, Object.assign({ build: fn }, o || {}));

  /* ---------- Pip ---------- */
  // the waistcoat: mint and white stripes round the lower body, open in a V at the front (u 0.25 is the front)
  const vestTex = () => K3D.paint('ac-vest', 512, 256, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    const top = h * 0.36;
    for (let x = 0; x < w; x += 16) { c.fillStyle = (x / 16) % 2 ? '#f6fff8' : '#5fd6a0'; c.fillRect(x, top, 16, h - top); }
    c.fillStyle = 'rgba(0,0,0,0.08)'; for (let x = 0; x < w; x += 32) c.fillRect(x + 15, top, 2, h - top);
    // the V at the front: clear (Pip's orange shows), edged with a dark mint piping
    const fx = w * 0.25;
    c.globalCompositeOperation = 'destination-out';
    c.beginPath(); c.moveTo(fx - 34, top - 2); c.lineTo(fx, h * 0.8); c.lineTo(fx + 34, top - 2); c.closePath(); c.fill();
    c.globalCompositeOperation = 'source-over';
    c.strokeStyle = '#2a8a60'; c.lineWidth = 5; c.beginPath(); c.moveTo(fx - 34, top); c.lineTo(fx, h * 0.8); c.lineTo(fx + 34, top); c.stroke();
    c.fillStyle = '#2a8a60'; c.fillRect(0, top, w, 5); c.fillRect(0, h - 10, w, 10);
    // two pocket flaps and buttons down the front edge
    for (const s of [-1, 1]) { c.fillStyle = '#2a8a60'; c.fillRect(fx + s * 52 - 14, h * 0.72, 28, 6); }
  });
  def3('acVest', () => {
    const g = new T.Group();
    const m = K3D.toon('#ffffff', { map: vestTex(), alphaTest: 0.5 });
    const v = mk(K3D.roundBox(BW * 1.04, BH * 1.01, BD * 1.06, 0.6, 40), m, { ink: false }); v.position.y = -BH * 0.17 - 0.004; g.add(v);
    // gold buttons down the V
    for (let i = 0; i < 3; i++) { const b = new T.Mesh(new T.SphereGeometry(0.02, 8, 6), K3D.toon('#ffd23a')); b.position.set(0, BH * 0.06 - i * 0.08, BD * 0.535); g.add(b); }
    // pinned prize tickets across the chest, each a little card with a hole and a number
    const tix = ['#ffb0c8', '#ffe27a', '#b8f0ff', '#ffe27a', '#ffb0c8'];
    for (let i = 0; i < 5; i++) {
      const tex = K3D.paint('ac-tix' + i, 64, 32, (c, w, h) => {
        c.fillStyle = tix[i]; c.fillRect(0, 0, w, h);
        c.strokeStyle = 'rgba(0,0,0,0.35)'; c.setLineDash([3, 2]); c.strokeRect(3, 3, w - 6, h - 6); c.setLineDash([]);
        c.fillStyle = '#3a2a2a'; c.font = 'bold 15px monospace'; c.textAlign = 'center'; c.fillText(String(10 + i * 7), w / 2 + 6, h / 2 + 5);
        c.beginPath(); c.arc(9, h / 2, 3.5, 0, Math.PI * 2); c.fill();
      });
      const t = new T.Mesh(new T.PlaneGeometry(0.11, 0.055), K3D.toon('#ffffff', { map: tex, side: T.DoubleSide }));
      const a = -0.95 + i * 0.475, r = BW * 0.53;
      t.position.set(Math.sin(a) * r * 0.98, BH * 0.2 + Math.cos(i * 1.7) * 0.01, Math.cos(a) * BD * 0.53);
      t.rotation.set(0, a, (i - 2) * 0.18);
      g.add(t);
      const pin = new T.Mesh(new T.SphereGeometry(0.012, 6, 4), K3D.toon('#d8d8e0')); pin.position.copy(t.position).add(new T.Vector3(Math.sin(a) * 0.01, 0.022, Math.cos(a) * 0.01)); g.add(pin);
    }
    return g;
  }, { at: 'body' });
  // the yellow bow tie at the collar
  def3('acBowTie', () => {
    const g = new T.Group();
    const m = K3D.toon('#ffd23a');
    for (const s of [-1, 1]) { const w = mk(new T.ConeGeometry(0.06, 0.12, 4).rotateZ(s * Math.PI / 2), m, { ink: INK, inkW: 0.5 }); w.position.x = s * 0.06; w.scale.set(1, 1, 0.5); g.add(w); }
    const k = mk(new T.SphereGeometry(0.03, 8, 6), K3D.toon('#e8b020'), { ink: INK, inkW: 0.5 }); k.scale.set(1, 1, 0.6); g.add(k);
    g.position.set(0, BH * 0.3, BD * 0.5);
    return g;
  }, { at: 'body' });
  // the operator's headset: a yellow band over the head (forward of the sprout), ear cups, a mic boom
  def3('acHeadset', () => {
    const g = new T.Group();
    const y = K3D.toon('#ffd23a'), dk = K3D.toon('#2a2630');
    const band = mk(new T.TorusGeometry(BW * 0.47, 0.028, 8, 28, Math.PI).rotateY(Math.PI / 2).rotateX(0), y, { ink: INK, inkW: 0.6 });
    band.rotation.set(0, Math.PI / 2, 0); band.position.set(0, -BH * 0.2, 0.08); g.add(band);
    for (const s of [-1, 1]) {
      const cup = mk(new T.CylinderGeometry(0.075, 0.075, 0.05, 16).rotateZ(Math.PI / 2), dk, { ink: INK, inkW: 0.6 }); cup.position.set(s * BW * 0.5, -BH * 0.22, 0.08); g.add(cup);
      const pad = mk(new T.CylinderGeometry(0.06, 0.06, 0.03, 16).rotateZ(Math.PI / 2), y, { ink: false }); pad.position.set(s * (BW * 0.5 + 0.035), -BH * 0.22, 0.08); g.add(pad);
    }
    // the mic boom from the right cup round to the mouth, a little black foam ball on the end
    const curve = new T.CatmullRomCurve3([new T.Vector3(BW * 0.52, -BH * 0.24, 0.08), new T.Vector3(BW * 0.5, -BH * 0.42, 0.24), new T.Vector3(BW * 0.25, -BH * 0.5, BD * 0.56)]);
    g.add(mk(new T.TubeGeometry(curve, 12, 0.012, 6), dk, { ink: false }));
    const foam = mk(new T.SphereGeometry(0.035, 10, 8), K3D.toon('#1a1820'), { ink: INK, inkW: 0.4 }); foam.position.set(BW * 0.22, -BH * 0.5, BD * 0.57); g.add(foam);
    // a little red "on air" light on the cup
    const led = new T.Mesh(new T.SphereGeometry(0.014, 6, 4), K3D.flat(hot('#5aff8a', 2.2))); led.position.set(BW * 0.5 + 0.05, -BH * 0.17, 0.13); g.add(led);
    return g;
  }, { at: 'head' });
  // the change-belt: a leather belt with a row of coin tubes and a few loose coins that jingle
  def3('acChangeBelt', (o, x) => {
    const g = new T.Group();
    const belt = mk(new T.TorusGeometry(BW * 0.53, 0.03, 6, 32).rotateX(Math.PI / 2).scale(1, 1, BD / BW * 1.03), K3D.toon('#6a4428'), { ink: INK, inkW: 0.5 });
    belt.position.y = -BH * 0.08; g.add(belt);
    const gold = K3D.toon('#e8c060'), silver = K3D.toon('#c8ccd4');
    for (let i = 0; i < 4; i++) {
      const a = -0.8 + i * 0.53;
      const tube = mk(new T.CylinderGeometry(0.035, 0.035, 0.12, 10), K3D.toon('#3a3a44'), { ink: INK, inkW: 0.4 });
      tube.position.set(Math.sin(a) * BW * 0.55, -BH * 0.12, Math.cos(a) * BD * 0.55); g.add(tube);
      const c = new T.Mesh(new T.CylinderGeometry(0.032, 0.032, 0.012, 10), i % 2 ? gold : silver); c.position.copy(tube.position).add(new T.Vector3(0, 0.066, 0)); g.add(c);
    }
    const jingle = new T.Group(); jingle.position.set(-BW * 0.5, -BH * 0.11, 0.12); g.add(jingle);
    for (let i = 0; i < 3; i++) { const c = new T.Mesh(new T.CylinderGeometry(0.03, 0.03, 0.01, 10).rotateX(Math.PI / 2), gold); c.position.set(-0.01 * i, -0.04 - i * 0.025, 0.01 * i); jingle.add(c); }
    jingle.userData.live = true; g.userData.jingle = jingle;
    return g;
  }, { at: 'body' });

  /* ---------- Bo ---------- */
  const teal = '#2ec4b0', tealDk = '#168a7c';
  // the ribbon texture: teal ticket ribbon with little printed tickets along it
  const ribbonTex = () => K3D.paint('ac-ribbon', 128, 16, (c, w, h) => {
    c.fillStyle = teal; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(255,255,255,0.55)'; for (let x = 4; x < w; x += 24) { c.fillRect(x, 4, 14, 8); }
    c.fillStyle = tealDk; for (let x = 0; x < w; x += 24) c.fillRect(x, 0, 2, h);
  }, { repeat: true });
  def3('acHarness', () => {
    const g = new T.Group();
    const rib = K3D.toon('#ffffff', { map: ribbonTex() });
    // two straps over the shoulders crossing on the chest and on the back, a waist belt and leg loops
    const strap = (a, b, c2) => { const cv = new T.CatmullRomCurve3([a, b, c2]); g.add(mk(new T.TubeGeometry(cv, 16, 0.022, 5).scale(1, 1, 1), rib, { ink: INK, inkW: 0.35 })); };
    const f = BD * 0.55, bk = -BD * 0.55, tp = BH * 0.43;
    strap(new T.Vector3(-BW * 0.35, tp, 0.05), new T.Vector3(0, BH * 0.16, f), new T.Vector3(BW * 0.45, -BH * 0.02, f * 0.85));
    strap(new T.Vector3(BW * 0.35, tp, 0.05), new T.Vector3(0, BH * 0.16, f), new T.Vector3(-BW * 0.45, -BH * 0.02, f * 0.85));
    strap(new T.Vector3(-BW * 0.35, tp, 0.05), new T.Vector3(0, BH * 0.2, bk), new T.Vector3(BW * 0.45, -BH * 0.02, bk * 0.85));
    strap(new T.Vector3(BW * 0.35, tp, 0.05), new T.Vector3(0, BH * 0.2, bk), new T.Vector3(-BW * 0.45, -BH * 0.02, bk * 0.85));
    const belt = mk(new T.TorusGeometry(BW * 0.54, 0.035, 6, 32).rotateX(Math.PI / 2).scale(1, 1, BD / BW * 1.04), rib, { ink: INK, inkW: 0.4 }); belt.position.y = -BH * 0.06; g.add(belt);
    // the buckle where the straps cross
    const buckle = mk(new T.TorusGeometry(0.04, 0.012, 6, 14), K3D.toon('#d8dce4'), { ink: INK, inkW: 0.4 }); buckle.position.set(0, BH * 0.16, f + 0.01); g.add(buckle);
    // a carabiner and the glow-stick clipped at the hip (it glows green and blooms a little)
    const krab = mk(new T.TorusGeometry(0.035, 0.01, 6, 14).scale(0.7, 1.1, 1), K3D.toon('#9aa0ac'), { ink: false }); krab.position.set(BW * 0.53, -BH * 0.1, 0.1); krab.rotation.y = Math.PI / 2; g.add(krab);
    const stick = new T.Mesh(new T.CapsuleGeometry(0.022, 0.16, 4, 8), K3D.flat(hot('#7aff6a', 2.1))); stick.position.set(BW * 0.56, -BH * 0.24, 0.1); stick.rotation.z = 0.25; g.add(stick);
    // the tiny plush keyring: a little round pink plush on a chain, swinging (scenery code sets its swing)
    const ring = new T.Group(); ring.position.set(-BW * 0.52, -BH * 0.1, -0.05); g.add(ring);
    const chain = new T.Mesh(new T.CylinderGeometry(0.005, 0.005, 0.08, 4), K3D.toon('#c8ccd4')); chain.position.y = -0.04; ring.add(chain);
    const plush = mk(new T.SphereGeometry(0.045, 12, 10), K3D.toon('#ff9ad0'), { ink: INK, inkW: 0.4 }); plush.position.y = -0.1; ring.add(plush);
    for (const s of [-1, 1]) { const e = mk(new T.SphereGeometry(0.018, 8, 6), K3D.toon('#ff9ad0'), { ink: INK, inkW: 0.3 }); e.position.set(s * 0.03, -0.065, 0); ring.add(e); }
    for (const s of [-1, 1]) { const e = new T.Mesh(new T.SphereGeometry(0.007, 5, 4), K3D.toon('#1a1418')); e.position.set(s * 0.015, -0.095, 0.042); ring.add(e); }
    ring.userData.live = true; g.userData.keyring = ring;
    return g;
  }, { at: 'body' });
  // half a clear yellow capsule worn as a helmet between the ears, with a teal chin strap
  def3('acCapsuleHelmet', (o, x) => {
    const g = new T.Group();
    const shell = new T.Mesh(new T.SphereGeometry(BW * 0.34, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), K3D.toon('#ffe24a', { transparent: true, opacity: 0.62, side: T.DoubleSide }));
    shell.renderOrder = 11; shell.position.y = -0.04; g.add(shell);
    const rim = mk(new T.TorusGeometry(BW * 0.34, 0.025, 8, 28).rotateX(Math.PI / 2), K3D.toon('#e8b820'), { ink: INK, inkW: 0.5 }); rim.position.y = -0.04; g.add(rim);
    // a glint and the capsule's seam line
    const glint = new T.Mesh(new T.PlaneGeometry(0.05, 0.1), K3D.flat('#ffffff', { transparent: true, opacity: 0.7 })); glint.position.set(-0.08, 0.12, 0.17); glint.rotation.set(-0.5, -0.4, 0.3); g.add(glint);
    const nub = mk(new T.CylinderGeometry(0.03, 0.04, 0.03, 10), K3D.toon('#e8b820'), { ink: INK, inkW: 0.4 }); nub.position.y = BW * 0.34 - 0.04; g.add(nub);
    // the chin strap (teal ribbon) down each side in front of the ears
    for (const s of [-1, 1]) { const st = new T.Mesh(new T.BoxGeometry(0.02, BH * 0.36, 0.03), K3D.toon(teal)); st.position.set(s * BW * 0.43, -BH * 0.2, 0.12); g.add(st); }
    x.hero.userData.earsOut = true;
    return g;
  }, { at: 'head' });
  // purple fingerless gloves on both little arms
  def3('acGloves', (o, x) => {
    const g = new T.Group();
    for (const a of x.hero.userData.arms || []) {
      const glove = mk(new T.CylinderGeometry(0.075, 0.07, 0.11, 12), K3D.toon('#8a4fd0'), { ink: INK, inkW: 0.5 });
      glove.position.y = -0.22; a.arm.add(glove);
      const cuff = new T.Mesh(new T.TorusGeometry(0.073, 0.014, 6, 14).rotateX(Math.PI / 2), K3D.toon('#b88aff')); cuff.position.y = -0.165; a.arm.add(cuff);
      x.hero.userData.worn.push(glove, cuff);
    }
    return g;
  }, { at: 'body' });

  K3D.defineOutfit3('arcadeclaw', {
    pip: [['acVest', {}], ['acBowTie', {}], ['acHeadset', {}], ['acChangeBelt', {}]],
    bo: [['acHarness', {}], ['acCapsuleHelmet', {}], ['acGloves', {}]],
  });
})();
