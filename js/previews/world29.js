/* Pip & Bo - Level previews for World 29 Ninja Dojo. Helpers are prefixed pw29. Each level's preview sits between its
   own BEGIN/END lines. */
'use strict';

// ----- BEGIN 29-1 Rooftop Moonlight Run -----
// Under a big moon Pip throws the grappling hook onto a lantern post over a wide gap, Bo swings across on the rope and
// leaps onto the far roof, then heaves Pip up and over. Both cheer.
{
  const pw29rrTAU = Math.PI * 2;
  // a tiled roof with curled eaves and its house: top from x to x + w at y
  const pw29rrRoof = (v, x, y, w) => {
    const c = v.ctx;
    c.fillStyle = '#3a3566'; c.fillRect(x + 6, y + 6, w - 12, 180 - y);
    c.fillStyle = '#2b2750'; c.fillRect(x + 6, y + 6, w - 12, 5);
    c.fillStyle = '#ffd98a'; for (let wx = x + 16; wx + 10 < x + w - 10; wx += 26) c.fillRect(wx, y + 20, 10, 12);
    c.fillStyle = '#c8474a'; c.fillRect(x + 3, y + 6, w - 6, 2);
    c.fillStyle = '#46507f'; c.strokeStyle = '#1f2244'; c.lineWidth = 1.2; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + w, y); c.quadraticCurveTo(x + w + 5, y, x + w + 8, y - 5); c.quadraticCurveTo(x + w + 5, y + 6, x + w - 3, y + 7);
    c.lineTo(x + 3, y + 7); c.quadraticCurveTo(x - 5, y + 6, x - 8, y - 5); c.quadraticCurveTo(x - 5, y, x, y); c.closePath(); c.fill(); c.stroke();
    c.strokeStyle = '#8090c8'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(x + 1, y + 0.8); c.lineTo(x + w - 1, y + 0.8); c.stroke();
  };
  // ninja Pip / Bo: the hero plus a headband tail. hang: x, y is the grip and rot swings the body under it
  const pw29rrNinja = (v, id, x, y, o = {}) => {
    const c = v.ctx, s = 0.6, f = o.face || 1, t = o.t || 0;
    c.save(); c.translate(x, y);
    if (o.hang) { c.rotate(o.rot || 0); c.translate(0, 19); }
    c.strokeStyle = id ? '#d4e6ff' : '#ffd9c2'; c.lineWidth = 1.6; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-f * 6, -11.5); c.quadraticCurveTo(-f * 11, -12 + Math.sin(t * 9 + id) * 1.5, -f * 15, -9 + Math.sin(t * 9 + id + 1) * 2.5); c.stroke();
    v.hero(id, 0, 0, { s, face: f, mood: o.mood, rot: o.hang ? 0 : o.rot, sq: o.sq, shadow: !o.hang && !o.air });
    c.fillStyle = id ? '#d4e6ff' : '#ffd9c2'; c.fillRect(-6.4, -12.6, 12.8, 2.2);
    if (o.hang) { c.strokeStyle = id ? '#5b95ff' : '#ff6b4a'; c.lineWidth = 1.8; c.beginPath(); c.moveTo(-4, -14); c.lineTo(-1, -19); c.moveTo(4, -14); c.lineTo(1, -19); c.stroke(); }
    c.restore();
  };
  const pw29rrRope = (v, x0, y0, x1, y1, sag) => {
    const c = v.ctx;
    c.strokeStyle = '#4a3a2a'; c.lineWidth = 2.6; c.lineCap = 'round'; c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + (sag || 0), x1, y1); c.stroke();
    c.strokeStyle = '#e8d8b0'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + (sag || 0), x1, y1); c.stroke();
  };
  const pw29rrHook = (v, x, y, rot) => {
    const c = v.ctx;
    c.save(); c.translate(x, y); c.rotate(rot);
    for (const [col, lw] of [['#1c1a36', 3.4], ['#dfe4f5', 1.6]]) {
      c.strokeStyle = col; c.lineWidth = lw; c.lineCap = 'round';
      c.beginPath(); c.moveTo(0, 0); c.lineTo(8, 0); c.quadraticCurveTo(12, -1, 10, -5); c.moveTo(8, 0); c.quadraticCurveTo(12, 1, 10, 5); c.stroke();
    }
    c.restore();
  };
  definePreview('Rooftop Moonlight Run', {
    blurb: 'One throws the grappling hook, the other swings over the gap and pulls them across.',
    loop: 6.4, still: 2.75,
    draw(v, t) {
      const c = v.ctx, e = v.ease, ry = 122, HX = 160, HY = 46;
      // night sky, stars, a big moon, far pagodas
      const g = c.createLinearGradient(0, 0, 0, 180); g.addColorStop(0, '#0e1434'); g.addColorStop(0.6, '#2b2a68'); g.addColorStop(1, '#5a4a86');
      c.fillStyle = g; c.fillRect(0, 0, 320, 180);
      c.fillStyle = '#ffffff'; for (let i = 0; i < 26; i++) { c.globalAlpha = 0.45 + 0.4 * Math.sin(t * (pw29rrTAU / 3.2) * (1 + i % 2) + i); c.fillRect(v.rand(i * 3 + 1) * 320, v.rand(i * 3 + 2) * 90, 1.4, 1.4); }
      c.globalAlpha = 1;
      v.fillCircle(248, 44, 34, 'rgba(210,216,255,0.12)'); v.fillCircle(248, 44, 23, '#faf4d6');
      v.fillCircle(241, 38, 4.5, 'rgba(196,190,170,0.5)'); v.fillCircle(256, 47, 3, 'rgba(196,190,170,0.5)');
      c.fillStyle = '#2c2a58';
      for (const [px, pw, ph] of [[30, 30, 44], [118, 22, 30], [196, 26, 38], [292, 30, 48]]) {
        c.fillRect(px - pw * 0.3, 150 - ph, pw * 0.6, ph);
        for (let k = 0; k < 3; k++) { const yy = 150 - ph + k * ph * 0.3, ww = pw * (0.9 - k * 0.12); c.beginPath(); c.moveTo(px - ww, yy + 5); c.lineTo(px, yy - 4); c.lineTo(px + ww, yy + 5); c.closePath(); c.fill(); }
      }
      c.fillStyle = '#211d48'; c.fillRect(0, 150, 320, 30);
      // the lantern post over the gap, and a hay cart below
      c.fillStyle = '#5a3824'; c.fillRect(HX - 2, HY + 3, 4, 140); c.fillRect(HX - 14, HY + 8, 28, 2.5);
      for (const lx of [HX - 12, HX + 12]) { v.fillCircle(lx, HY + 18, 9, 'rgba(255,190,110,0.16)'); c.fillStyle = '#ff7a4a'; c.beginPath(); c.ellipse(lx, HY + 18, 4.2, 5.4, 0, 0, pw29rrTAU); c.fill(); }
      c.fillStyle = '#e8c860'; c.beginPath(); c.ellipse(HX, 164, 20, 10, 0, Math.PI, 0); c.fill(); c.fillStyle = '#8a5a3a'; v.rr(HX - 20, 163, 40, 8, 2); c.fill();
      v.fillCircle(HX - 12, 172, 5, '#3c2634'); v.fillCircle(HX + 12, 172, 5, '#3c2634');
      pw29rrRoof(v, -10, ry, 116); pw29rrRoof(v, 214, ry, 120);
      // a moon star in the swing's path
      const got = t > 2.3 && t < 5.9;
      if (!got) v.star(HX, HY + 96, 5, '#eaf2ff'); else if (t < 2.7) v.sparkle(HX, HY + 96, (t - 2.3) / 0.4, '#eaf2ff', 8);
      c.strokeStyle = '#dfe4f5'; c.lineWidth = 1.6; v.circle(HX, HY, 3.4); c.stroke();
      // the beats: aim and throw (0-1.3), swing (1.7-2.9), leap (2.9-3.3), the pull (3.7-4.9), cheers
      const pipX = 78, hooked = t >= 1.3 && t < 5.9, gx = 104, gy = ry - 20, L = Math.hypot(gx - HX, gy - HY), th0 = Math.atan2(gx - HX, gy - HY);
      const hand = { x: pipX + 9, y: ry - 9 };
      if (t < 0.9) {
        // the aim line sweeps, the ring waits
        const a = 0.55 + 0.5 * Math.sin(t * 5.2 + 0.4);
        c.fillStyle = '#ffffff'; for (let d = 12; d < 84; d += 11) v.fillCircle(hand.x + Math.cos(a) * d, hand.y - Math.sin(a) * d, 1.3, '#ffffff');
        c.strokeStyle = t > 0.7 ? '#8fe3b0' : 'rgba(255,255,255,0.8)'; c.lineWidth = 1.6; c.setLineDash(t > 0.7 ? [] : [3, 3]); v.circle(HX, HY, 11); c.stroke(); c.setLineDash([]);
      }
      // the swinger's state
      let bo = null, zipU = v.seg(t, 3.7, 4.9);
      if (t >= 1.7 && t < 2.9) {
        const u = v.seg(t, 1.7, 2.9), th = v.lerp(th0, 0.92, e.inOut(u));
        bo = { hang: true, x: HX + Math.sin(th) * L, y: HY + Math.cos(th) * L, rot: -th };
      } else if (t >= 2.9 && t < 3.3) {
        const u = v.seg(t, 2.9, 3.3), x0 = HX + Math.sin(0.92) * L, y0 = HY + Math.cos(0.92) * L + 19;
        bo = { x: v.lerp(x0, 260, u), y: v.lerp(y0, ry, u) + v.hop(u, 16), air: true };
      } else if (t >= 3.3) bo = { x: 260, y: ry };
      // ropes
      if (t >= 0.9 && t < 1.3) {
        const u = v.seg(t, 0.9, 1.3), hx = v.lerp(hand.x, HX, u), hy = v.lerp(hand.y, HY, u);
        pw29rrRope(v, hand.x, hand.y, hx, hy, 3); pw29rrHook(v, hx, hy, Math.atan2(HY - hand.y, HX - hand.x));
      }
      const zp = (() => { const u = e.inOut(zipU), w = 1 - u, ax = 92, ay = ry - 20, bx = 226, by = ry - 20; return { x: w * w * ax + 2 * w * u * HX + u * u * bx, y: w * w * ay + 2 * w * u * (ry - 70) + u * u * by }; })();
      if (hooked) {
        if (t < 3.7) pw29rrRope(v, hand.x, hand.y, HX, HY, 2); else if (zipU < 1) pw29rrRope(v, zp.x, zp.y, HX, HY, 0);
        if (bo && bo.hang) pw29rrRope(v, HX, HY, bo.x, bo.y, 0);
        else if (bo && zipU < 1) pw29rrRope(v, HX, HY, bo.x - 8, bo.y - (bo.air ? 14 : 9), bo.air ? 6 : 0);
        else if (t < 1.7) pw29rrRope(v, HX, HY, gx, gy, 5);
        if (zipU < 1) pw29rrHook(v, HX, HY + 2, -Math.PI / 2);
      }
      // Bo
      if (!bo) pw29rrNinja(v, 1, 96 + v.lerp(-30, 0, e.out(v.seg(t, 0, 0.8))), ry, { face: 1, t });
      else if (bo.hang) pw29rrNinja(v, 1, bo.x, bo.y, { hang: true, rot: bo.rot, face: 1, t, mood: 'wow' });
      else if (t < 4.9) pw29rrNinja(v, 1, bo.x, bo.y, { face: -1, t, air: bo.air, rot: t >= 3.7 ? 0.2 + 0.18 * Math.sin(t * 16) : 0, mood: t >= 3.7 ? 'grit' : 'happy' });
      else pw29rrNinja(v, 1, bo.x, ry + v.hop(v.phase(t, 0.5), 9), { face: -1, t, mood: 'joy', air: true });
      // Pip
      if (t < 3.7) pw29rrNinja(v, 0, pipX, ry, { face: 1, t, rot: t >= 0.9 && t < 1.15 ? 0.3 : 0 });
      else if (zipU < 1) pw29rrNinja(v, 0, zp.x, zp.y, { hang: true, rot: -0.15 + Math.sin(t * 9) * 0.12, face: 1, t, mood: 'wow' });
      else pw29rrNinja(v, 0, 226, ry + v.hop(v.phase(t, 0.5, 0.25), 9), { face: 1, t, mood: 'joy', air: true });
      // words and sparkle
      if (t >= 1.3 && t < 1.9) { v.label('Hooked!', HX, HY - 18, 13, '#ffffff'); v.sparkle(HX, HY, (t - 1.3) / 0.6, '#ffffff', 10); }
      if (t >= 3.7 && t < 4.9) v.label(v.phase(t, 0.6) < 0.5 ? 'Heave!' : 'Ho!', 262, ry - 34, 12, '#ffffff');
      if (t >= 4.9) { v.label('Across!', 236, 78, 15, '#ffffff'); v.confetti(236, 84, v.seg(t, 4.9, 6.4)); }
    },
  });
}
// ----- END 29-1 Rooftop Moonlight Run -----

// ----- BEGIN 29-2 Shadow Sneak -----
// Night at the fortress wall. A guard's lantern cone points at the barrel where Pip hides. Bo, up on the wall, tosses a
// pebble behind the barrel: "tik!", the guard gets a "?" and walks right past the barrel to look. Pip pops out behind
// him, creeps to the gate lever and pulls it: the gate goes up. Sneaky!
{
  const pw29ssGuard = (v, x, y, f, mark, walk) => {
    const c = v.ctx, bob = walk ? Math.abs(Math.sin(walk)) * 1.5 : 0;
    c.fillStyle = 'rgba(14,16,40,0.3)'; c.beginPath(); c.ellipse(x, y, 9, 2, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#2a2546'; const st = walk ? Math.sin(walk) * 3 : 0;
    c.beginPath(); c.ellipse(x - 4 + st, y - 1, 3.5, 2, 0, 0, Math.PI * 2); c.fill(); c.beginPath(); c.ellipse(x + 4 - st, y - 1, 3.5, 2, 0, 0, Math.PI * 2); c.fill();
    // a little lantern on a stick
    c.strokeStyle = '#5a3824'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x + f * 6, y - 9 - bob); c.lineTo(x + f * 15, y - 18 - bob); c.stroke();
    v.fillCircle(x + f * 15, y - 14 - bob, 6, 'rgba(255,170,90,0.28)'); v.fillCircle(x + f * 15, y - 14 - bob, 3.2, '#ff7a4a');
    c.fillStyle = '#7a6cae'; c.strokeStyle = '#2a2546'; c.lineWidth = 1.5; v.rr(x - 8, y - 22 - bob, 16, 21, 7); c.fill(); c.stroke();
    c.fillStyle = '#c8474a'; c.fillRect(x - 8, y - 9 - bob, 16, 3);
    c.fillStyle = '#f6e3c6'; v.rr(x - 5.5 + f * 1.5, y - 18 - bob, 11, 6, 3); c.fill();
    v.fillCircle(x - 2 + f * 2.2, y - 15 - bob, 1.2, '#1c1a36'); v.fillCircle(x + 2.6 + f * 2.2, y - 15 - bob, 1.2, '#1c1a36');
    if (mark) v.label(mark, x, y - 32 - bob, 13, mark === '?' ? '#ffffff' : '#ff8a7a');
  };
  const pw29ssCone = (v, x, y, f, len) => {
    const c = v.ctx;
    c.fillStyle = 'rgba(255,236,170,0.16)'; c.beginPath(); c.moveTo(x + f * 7, y - 15); c.lineTo(x + f * len, y - 34); c.lineTo(x + f * len, y + 4); c.lineTo(x + f * 12, y + 4); c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,236,170,0.45)'; c.fillRect(Math.min(x + f * 8, x + f * len), y + 1, len - 8, 3);
  };
  const pw29ssBarrel = (v, x, y) => {
    const c = v.ctx;
    c.fillStyle = '#7a4e30'; c.strokeStyle = '#3a2416'; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(x - 10, y - 24); c.quadraticCurveTo(x - 14, y - 12, x - 10, y); c.lineTo(x + 10, y); c.quadraticCurveTo(x + 14, y - 12, x + 10, y - 24); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#b9bedc'; c.fillRect(x - 12, y - 19, 24, 2); c.fillRect(x - 12, y - 7, 24, 2);
    c.fillStyle = '#2a1a12'; c.beginPath(); c.ellipse(x, y - 24, 10, 2.5, 0, 0, Math.PI * 2); c.fill();
  };
  const pw29ssBand = (v, id, x, y, f, s) => {
    const c = v.ctx;
    c.strokeStyle = id ? '#d4e6ff' : '#ffd9c2'; c.lineWidth = 2.2 * s; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x - 8 * s, y); c.lineTo(x + 8 * s, y); c.moveTo(x - f * 8 * s, y); c.lineTo(x - f * 14 * s, y + 3 * s); c.stroke();
  };
  definePreview('Shadow Sneak', {
    blurb: 'One tosses pebbles so the guards look away; the other sneaks past in the shadows.',
    loop: 6, still: 3.4,
    draw(v, t) {
      const c = v.ctx, e = v.ease, gy = 150, top = 64;
      // night sky, moon, far pagoda
      const g = c.createLinearGradient(0, 0, 0, top); g.addColorStop(0, '#141a3c'); g.addColorStop(1, '#4a3f7c'); c.fillStyle = g; c.fillRect(0, 0, 320, 180);
      for (let i = 0; i < 14; i++) v.fillCircle(v.rand(i) * 320, v.rand(i + 40) * 50, 0.8, 'rgba(255,255,255,' + (0.5 + 0.4 * Math.sin(t * 3 + i)) + ')');
      v.fillCircle(262, 30, 24, 'rgba(200,210,255,0.16)'); v.fillCircle(262, 30, 16, '#faf4d6');
      c.fillStyle = '#2c2a58'; c.fillRect(150, 34, 22, 30); for (const [w, y] of [[40, 34], [32, 24], [22, 15]]) { c.beginPath(); c.moveTo(161 - w / 2, y); c.lineTo(161 + w / 2, y); c.lineTo(161 + w / 2 - 6, y - 6); c.lineTo(161 - w / 2 + 6, y - 6); c.closePath(); c.fill(); }
      // the wall, its tile cap, lanterns and the cobbles
      c.fillStyle = '#3b3768'; c.fillRect(0, top, 320, gy - top);
      c.fillStyle = '#2d2a54'; c.fillRect(0, gy - 20, 320, 20);
      c.fillStyle = '#1f2244'; c.fillRect(0, top, 320, 7); c.fillStyle = '#46507f'; c.fillRect(0, top, 320, 5); c.fillStyle = '#8090c8'; c.fillRect(0, top, 320, 1.5);
      c.fillStyle = '#c8474a'; c.fillRect(0, top + 7, 320, 1.5);
      for (const lx of [40, 130, 220]) { v.fillCircle(lx, top + 22, 8, 'rgba(255,170,90,0.22)'); v.fillCircle(lx, top + 22, 4, '#ff7a4a'); }
      c.fillStyle = '#3d3a64'; c.fillRect(0, gy, 320, 30); c.fillStyle = '#6a6590'; c.fillRect(0, gy, 320, 2.5);
      // the gatehouse on the right: arch, lever and gate bars
      const open = e.out(v.seg(t, 4.6, 5.1));
      c.fillStyle = '#262349'; c.fillRect(262, top + 8, 58, gy - top - 8);
      c.fillStyle = '#0d0c22'; v.rr(270, gy - 52, 50, 60, 12); c.fill();
      c.save(); c.beginPath(); c.rect(296, gy - 52, 24, 52); c.clip();
      c.strokeStyle = '#9aa0c8'; c.lineWidth = 2; c.beginPath();
      for (const dx of [302, 309, 316]) { c.moveTo(dx, gy - 54 - open * 62); c.lineTo(dx, gy - open * 62); }
      for (const dy of [14, 32]) { c.moveTo(298, gy - dy - open * 62); c.lineTo(320, gy - dy - open * 62); }
      c.stroke(); c.restore();
      const la = v.lerp(-0.6, 0.6, e.inOut(v.seg(t, 4.4, 4.7)));
      c.fillStyle = '#6a6590'; c.fillRect(280, gy - 6, 10, 6);
      v.line(285, gy - 5, 285 + Math.sin(la) * 15, gy - 5 - Math.cos(la) * 15, '#cfd3ee', 2.2); v.fillCircle(285 + Math.sin(la) * 15, gy - 5 - Math.cos(la) * 15, 3, '#ff6b5a');
      // the guard: stares left at the barrel, hears the tik, turns and walks over to look
      const heard = t > 1.45, gu = e.inOut(v.seg(t, 1.8, 3.1)), gx = v.lerp(222, 96, gu), gf = -1;
      pw29ssCone(v, gx, gy, gf, 62);
      pw29ssGuard(v, gx, gy, gf, heard && t < 4.3 ? '?' : '', gu > 0 && gu < 1 ? t * 10 : 0);
      // the pebble from Bo's hand
      const pu = v.seg(t, 0.8, 1.45), px = v.lerp(104, 70, pu), py = v.lerp(top - 14, gy - 2, pu) - Math.sin(pu * Math.PI) * 30;
      if (pu > 0 && pu < 1) v.fillCircle(px, py, 2.4, '#d6d3e6');
      if (pu >= 1) v.fillCircle(70, gy - 2, 2.2, '#b4b0c8');
      const ring = v.seg(t, 1.45, 2.1);
      if (ring > 0 && ring < 1) { c.strokeStyle = 'rgba(255,255,255,' + (1 - ring) + ')'; c.lineWidth = 2; v.circle(70, gy - 2, 6 + ring * 26); c.stroke(); v.label('tik!', 70, gy - 22 - ring * 6, 11, '#ffffff'); }
      // Bo on the wall walk
      const thr = t > 0.5 && t < 1.0;
      v.hero(1, 112, top, { s: 0.62, face: -1, rot: thr ? -0.2 : 0, mood: t > 4.6 ? 'joy' : 'happy' });
      pw29ssBand(v, 1, 112, top - 13.5, -1, 0.62);
      if (t < 0.8) v.fillCircle(103, top - 12, 2.2, '#d6d3e6');
      // Pip: peeking out of the barrel, then creeping past behind the guard to the lever
      const cu = v.seg(t, 2.8, 4.4), pxx = v.lerp(150, 276, cu), out = cu > 0;
      if (!out) { v.hero(0, 150, gy - 13 + Math.sin(t * 3) * 1, { s: 0.62, face: 1, mood: 'blink' }); pw29ssBand(v, 0, 150, gy - 26.5 + Math.sin(t * 3), 1, 0.62); }
      pw29ssBarrel(v, 150, gy);
      if (out) {
        const hop = cu < 0.08 ? v.hop(cu / 0.08, 16) : 0, done = cu >= 1;
        v.hero(0, pxx, gy + hop - (done ? Math.abs(Math.sin(t * 9)) * 4 : 0), { s: 0.62, face: 1, sq: done ? 0 : 0.18, mood: done ? 'joy' : 'grit' });
        pw29ssBand(v, 0, pxx, gy + hop - (done ? 13.5 + Math.abs(Math.sin(t * 9)) * 4 : 11), 1, 0.62);
      }
      // the payoff
      if (t > 4.7) { v.sparkle(308, gy - 30, v.seg(t, 4.7, 5.5), v.c.gold, 12); v.label('Sneaky!', 150, 40, 15, v.c.gold); v.confetti(150, 56, v.seg(t, 4.8, 6)); }
      else if (t > 2.5 && t < 3.4) v.label('Go!', 150, gy - 44, 12, '#ffffff');
    },
  });
}
// ----- END 29-2 Shadow Sneak -----

// ----- BEGIN 29-3 Runaway Rickshaw -----
// ----- END 29-3 Runaway Rickshaw -----

// ----- BEGIN 29-4 Throwing Star Duel -----
// A moonlit dojo. Pip throws a high foam star: Bo ducks it. Bo throws a low one: Pip hops it. Then a rally: Pip throws,
// Bo bats it back with his sword ("Clang!"), Pip bats it back faster ("Perfect!") and it bonks Bo on the head: his last
// lantern goes out, he sees stars and Pip cheers.
{
  const pw29sdTAU = Math.PI * 2, pw29sdF = 146, pw29sdS = 0.7;
  const pw29sdDojo = (v, t, boLit) => {
    const c = v.ctx, F = pw29sdF;
    c.fillStyle = '#2a2342'; c.fillRect(0, 0, 320, 180);
    // paper screens with a dark lattice
    c.fillStyle = '#6f69aa'; c.fillRect(6, 24, 308, F - 28);
    c.fillStyle = 'rgba(160,150,220,0.25)'; c.fillRect(6, 24, 308, 40);
    c.strokeStyle = 'rgba(42,35,66,0.55)'; c.lineWidth = 1; c.beginPath();
    for (let x = 25; x < 314; x += 19) { c.moveTo(x + 0.5, 24); c.lineTo(x + 0.5, F - 4); }
    for (let y = 46; y < F - 6; y += 22) { c.moveTo(6, y + 0.5); c.lineTo(314, y + 0.5); }
    c.stroke();
    c.fillStyle = '#2a2342'; for (const x of [4, 80, 236, 312]) c.fillRect(x - 2, 20, 4, F - 20);
    c.fillRect(0, 0, 320, 24); c.fillRect(0, F - 6, 320, 6);
    c.fillStyle = '#3d3460'; c.fillRect(0, 21, 320, 3);
    // hanging scrolls
    for (const x of [42, 278]) {
      c.fillStyle = '#f1e7cc'; c.fillRect(x - 8, 40, 16, 50); c.fillStyle = '#c8474a'; c.fillRect(x - 9, 38, 18, 3); c.fillRect(x - 9, 89, 18, 3);
      c.strokeStyle = '#2a2546'; c.lineWidth = 2.4; c.beginPath(); c.arc(x, 62, 5, 0.6, pw29sdTAU - 0.3); c.stroke();
    }
    // the round moon window and the gong under it
    v.fillCircle(160, 66, 27, '#18204a'); v.fillCircle(160, 66, 16, 'rgba(250,244,214,0.2)'); v.fillCircle(160, 66, 11, '#fbf4d2');
    c.strokeStyle = '#2f2440'; c.lineWidth = 4; v.circle(160, 66, 27); c.stroke();
    c.lineWidth = 1.5; c.beginPath(); c.moveTo(160, 39); c.lineTo(160, 93); c.moveTo(133, 66); c.lineTo(187, 66); c.stroke();
    c.fillStyle = '#b8474a'; c.fillRect(144, F - 44, 3, 40); c.fillRect(173, F - 44, 3, 40); c.fillRect(140, F - 46, 40, 3.5);
    v.line(153, F - 43, 153, F - 34, '#e8d8b0', 1); v.line(167, F - 43, 167, F - 34, '#e8d8b0', 1);
    const ring = t > 4.47 ? Math.sin((t - 4.47) * 40) * 1.5 * Math.max(0, 1 - (t - 4.47) / 0.8) : 0;
    v.fillCircle(160 + ring, F - 24, 11, '#c7922c'); v.fillCircle(160 + ring, F - 24, 8.5, '#e9bd4a'); v.fillCircle(160 + ring, F - 24, 3, '#c7922c');
    // three lanterns each: one goes out with every bonk (Pip has two left, Bo is down to his last)
    for (let n = 0; n < 3; n++) for (const id of [0, 1]) {
      const x = id ? 242 - n * 17 : 78 + n * 17, on = id ? n === 0 && boLit : n < 2;
      v.line(x, 24, x, 30, '#1c1a36', 1);
      if (on) v.fillCircle(x, 36, 10 + Math.sin(t * 7 + x) * 0.6, id ? 'rgba(120,170,255,0.22)' : 'rgba(255,180,100,0.22)');
      c.fillStyle = on ? (id ? '#5b95ff' : '#ff9a3d') : '#6b5a7a'; c.beginPath(); c.ellipse(x, 36, 4.6, 6, 0, 0, pw29sdTAU); c.fill();
      if (on) { c.fillStyle = 'rgba(255,240,190,0.8)'; c.beginPath(); c.ellipse(x, 36.5, 2.2, 3.4, 0, 0, pw29sdTAU); c.fill(); }
      c.fillStyle = '#2a2546'; c.fillRect(x - 2.5, 29, 5, 1.8); c.fillRect(x - 2.5, 41.2, 5, 1.8);
    }
    // tatami mats
    c.fillStyle = '#b7b36c'; c.fillRect(0, F, 320, 180 - F); c.fillStyle = '#d2cd8a'; c.fillRect(0, F, 320, 2);
    c.fillStyle = '#3f5a3a'; c.fillRect(0, F + 16, 320, 2); for (const x of [56, 160, 264]) c.fillRect(x - 1, F + 2, 2, 14); for (const x of [108, 212]) c.fillRect(x - 1, F + 18, 2, 180 - F);
    c.fillStyle = 'rgba(200,71,74,0.55)'; c.fillRect(134, F + 2, 52, 2.5);
  };
  // a foam throwing star in its owner's colour, with speed streaks behind it
  const pw29sdStar = (v, id, x, y, rot, dir, fast) => {
    const c = v.ctx, r = 5.2;
    c.strokeStyle = id ? 'rgba(170,205,255,0.5)' : 'rgba(255,190,150,0.5)'; c.lineWidth = 1.6; c.lineCap = 'round'; c.beginPath();
    for (let n = 0; n < 3; n++) { const yy = y - 3 + n * 3, len = (8 + n % 2 * 5) * fast; c.moveTo(x - dir * 7, yy); c.lineTo(x - dir * (7 + len), yy); }
    c.stroke();
    if (fast > 1.4) v.fillCircle(x, y, r + 4, 'rgba(200,235,255,0.35)');
    c.fillStyle = id ? v.c.bo : v.c.pip; c.strokeStyle = id ? v.c.boDark : v.c.pipDark; c.lineWidth = 1.3; c.lineJoin = 'round';
    c.beginPath();
    for (let n = 0; n < 8; n++) { const a = rot + n * pw29sdTAU / 8, rr = n % 2 ? r * 0.42 : r; c[n ? 'lineTo' : 'moveTo'](x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    c.closePath(); c.fill(); c.stroke();
    v.fillCircle(x, y, 1.3, '#ffffff');
  };
  // ninja Pip / Bo, facing the middle: headband with a fluttering tail and a sword. o.aim: sword angle (0 = level, forward)
  const pw29sdNinja = (v, id, x, y, o = {}) => {
    const c = v.ctx, s = pw29sdS, f = id ? -1 : 1, sq = o.sq || 0, bw = 20 * s * (1 + sq * 0.35), bh = 24 * s * (1 - sq * 0.3), t = o.t || 0;
    const band = id ? '#d4e6ff' : '#ffd9c2', by = y - bh * 0.88;
    if (o.air) v.shadow(x, pw29sdF, 12);
    c.strokeStyle = band; c.lineWidth = 1.8; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x - f * bw / 2, by); c.quadraticCurveTo(x - f * (bw / 2 + 5), by - 1 + Math.sin(t * 9 + id) * 1.5, x - f * (bw / 2 + 9), by + 2 + Math.sin(t * 9 + id + 1) * 2.5); c.stroke();
    v.hero(id, x, y, { s, face: f, sq, mood: o.mood, shadow: !o.air });
    c.fillStyle = band; c.fillRect(x - bw / 2 + 0.8, by - 1.3, bw - 1.6, 2.6);
    if (o.aim == null) return;
    const hx = x + f * (bw / 2 + 1.5), hy = y - bh * 0.42, ex = hx + f * Math.cos(o.aim) * 15, ey = hy + Math.sin(o.aim) * 15;
    v.line(hx, hy, ex, ey, '#2a2546', 4.2); v.line(hx, hy, ex, ey, o.glint ? '#ffffff' : '#dfe4f6', 2.2);
    v.fillCircle(hx, hy, 2.6, id ? v.c.bo : v.c.pip); c.strokeStyle = id ? v.c.boDark : v.c.pipDark; c.lineWidth = 1; v.circle(hx, hy, 2.6); c.stroke();
    if (o.slash > 0) { c.strokeStyle = 'rgba(255,255,255,' + 0.8 * o.slash + ')'; c.lineWidth = 2.5; c.beginPath(); if (f > 0) c.arc(hx, hy, 17, -2.1, o.aim); else c.arc(hx, hy, 17, Math.PI - o.aim, Math.PI + 2.1); c.stroke(); }
  };
  definePreview('Throwing Star Duel', {
    blurb: 'Throw foam stars, duck and hop them, or bat one back with your sword. Bonk!',
    loop: 6.2, still: 4.62,
    draw(v, t) {
      const c = v.ctx, e = v.ease, F = pw29sdF, HI = F - 16, LO = F - 4, PX = 70, BX = 250;
      const bonkT = 4.47, bonked = t >= bonkT;
      pw29sdDojo(v, t, !bonked);
      // who does what, when
      const bump = (a, b) => Math.sin(v.seg(t, a, b) * Math.PI);                 // 0 -> 1 -> 0 between a and b
      const boDuck = bump(0.9, 1.5), pipHop = v.hop(v.seg(t, 2.18, 2.62), 21);
      const swing = (a) => (t >= a && t < a + 0.3 ? v.lerp(-2.1, 0.45, e.out(v.seg(t, a, a + 0.12))) : null);
      const boSw = swing(3.6), pipSw = swing(4.04);
      const pipThrow = bump(0.4, 0.7) + bump(2.95, 3.25), boThrow = bump(1.65, 1.95);
      const idleAim = id => -1.15 + Math.sin(t * 2.4 + id) * 0.06;
      // Bo
      if (bonked) {
        const wob = Math.sin(t * 7) * 1.6;
        pw29sdNinja(v, 1, BX + wob, F, { mood: 'dizzy', sq: 0.25 + Math.sin(t * 7) * 0.08, t, aim: 1.1 });
        for (let n = 0; n < 3; n++) { const a = t * 5 + n * 2.1; v.star(BX + wob + Math.cos(a) * 13, F - 22 + Math.sin(a) * 3.5, 3.2, n % 2 ? '#fff3a0' : '#ffffff', a); }
      } else pw29sdNinja(v, 1, BX, F, { sq: boDuck * 1.25 + boThrow * 0.2, t, mood: boDuck > 0.2 ? 'grit' : boSw != null ? 'grit' : t > 4.1 ? 'wow' : 'happy',
        aim: boSw != null ? boSw : boDuck > 0.2 ? -0.5 : idleAim(1) + boThrow * 1.3, slash: boSw != null ? 1 - v.seg(t, 3.66, 3.9) : 0, glint: t > 3.65 && t < 3.8 });
      // Pip
      const cheer = t > 4.65 ? Math.abs(Math.sin((t - 4.65) * 7)) * 9 : 0;
      pw29sdNinja(v, 0, PX, F + pipHop - cheer, { air: pipHop < -1 || cheer > 1, t, sq: pipThrow * 0.2 - (pipHop < -1 ? 0.12 : 0), mood: cheer > 0 || bonked ? 'joy' : pipSw != null || pipHop < -1 ? 'grit' : 'happy',
        aim: bonked && t > 4.65 ? -1.9 : pipSw != null ? pipSw : idleAim(0) + pipThrow * 1.3, slash: pipSw != null ? 1 - v.seg(t, 4.1, 4.34) : 0, glint: t > 4.09 && t < 4.24 });
      // the stars
      if (t >= 0.55 && t < 1.39) pw29sdStar(v, 0, 84 + 270 * (t - 0.55), HI, t * 16, 1, 1);
      if (t >= 1.8 && t < 2.64) pw29sdStar(v, 1, 236 - 270 * (t - 1.8), LO, -t * 16, -1, 1);
      if (t >= 3.1 && t < 3.65) pw29sdStar(v, 0, 84 + 270 * (t - 3.1), HI, t * 16, 1, 1);
      else if (t >= 3.65 && t < 4.09) pw29sdStar(v, 1, 232 - 327 * (t - 3.65), HI, -t * 20, -1, 1.3);
      else if (t >= 4.09 && t < bonkT) pw29sdStar(v, 0, 88 + 426 * (t - 4.09), HI, t * 26, 1, 1.7);
      else if (bonked && t < bonkT + 0.7) { const k = (t - bonkT) / 0.7; c.globalAlpha = 1 - k * k; pw29sdStar(v, 0, BX - 4 - k * 26, HI - 4 + v.hop(k, 26) + k * 14, t * 12, 0, 0); c.globalAlpha = 1; }
      // puffs where a star sticks in the wall
      if (t >= 1.39 && t < 1.7) v.puff(310, HI, v.seg(t, 1.39, 1.7));
      if (t >= 2.64 && t < 2.95) v.puff(10, LO, v.seg(t, 2.64, 2.95));
      // words
      const word = (str, x, y, a, b, col, size) => { if (t >= a && t < b) { const k = v.seg(t, a, b); c.globalAlpha = Math.min(1, (1 - k) * 4); v.label(str, x, y - k * 6, size || 12, col || '#ffffff'); c.globalAlpha = 1; } };
      word('Duck!', BX, F - 30, 0.95, 1.6, '#ffe7a8');
      word('Hop!', PX, F - 46, 2.2, 2.85, '#9fe8ff');
      word('Clang!', BX - 8, F - 36, 3.65, 4.1, '#ffffff');
      word('Perfect!', PX + 12, F - 36, 4.09, 4.5, '#bfe8ff', 13);
      if (t >= 3.65 && t < 3.9) v.sparkle(232, HI, v.seg(t, 3.65, 3.9), '#ffffff', 8);
      if (t >= 4.09 && t < 4.34) v.sparkle(88, HI, v.seg(t, 4.09, 4.34), '#bfe8ff', 10);
      if (bonked) {
        const k = v.seg(t, bonkT, bonkT + 0.25);
        if (t < bonkT + 0.3) v.sparkle(BX, HI, k, '#fff3a0', 12);
        c.globalAlpha = v.clamp((6.1 - t) * 5, 0, 1);
        v.label('Bonk!', BX - 6, F - 46 - e.out(k) * 6, 12 + e.back(k) * 5, '#ffffff');
        v.confetti(PX + 14, 84, v.seg(t, 4.6, 6.1), 22);
        c.globalAlpha = 1;
      }
    },
  });
}
// ----- END 29-4 Throwing Star Duel -----
