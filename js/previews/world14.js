/* Pip & Bo - Level previews for World 14 Dino Valley (see js/previews/preview-core.js for how to write one).
   Every top-level name starts with pw14. The whole file is skipped when the preview engine isn't loaded yet. */
'use strict';

if (typeof definePreview === 'function') {
  // ----- BEGIN 14-1 Egg Rescue preview -----
  // ----- END 14-1 Egg Rescue preview -----
  //
  // ----- BEGIN 14-2 Pterodactyl Express preview -----
  // Petra glides across on the beat (the wings snap down at the gold TOP of a little meter) with Pip on her back and Bo
  // hanging from her feet: Bo grabs a mango off a palm and drops it into a nest, where a baby dino cheers
  const pw14pFlaps = [0.12, 0.34, 0.56, 0.78];
  // Petra the pterodactyl at (x, y), wings up..down (1..0)
  const pw14pPetra = (v, x, y, up) => {
    const ctx = v.ctx;
    ctx.save(); ctx.translate(x, y);
    // far wing, tail, body, belly
    ctx.fillStyle = '#1f9e93'; ctx.beginPath(); ctx.moveTo(4, -2); ctx.quadraticCurveTo(-2, -22 * up + 8 * (1 - up), -14, -34 * up + 14 * (1 - up)); ctx.lineTo(-12, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ff7a59'; ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(-34, -4); ctx.lineTo(-30, 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#2ec4b6'; ctx.beginPath(); ctx.ellipse(0, 0, 22, 9, -0.05, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff1c9'; ctx.beginPath(); ctx.ellipse(2, 4, 15, 5, 0, 0, Math.PI * 2); ctx.fill();
    // neck, head, beak, crest, eye
    ctx.fillStyle = '#2ec4b6'; ctx.beginPath(); ctx.moveTo(14, -6); ctx.quadraticCurveTo(24, -12, 28, -16); ctx.lineTo(32, -10); ctx.quadraticCurveTo(24, -2, 16, 2); ctx.closePath(); ctx.fill();
    v.fillCircle(30, -14, 6, '#2ec4b6');
    ctx.fillStyle = '#ffb347'; ctx.beginPath(); ctx.moveTo(34, -16); ctx.lineTo(52, -12); ctx.lineTo(34, -10); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ff7a59'; ctx.beginPath(); ctx.moveTo(27, -18); ctx.lineTo(14, -26); ctx.lineTo(28, -13); ctx.closePath(); ctx.fill();
    v.fillCircle(31, -15, 1.8, v.c.ink);
    // near wing (drawn after Pip sits on her back, see below)
    ctx.restore();
  };
  const pw14pWing = (v, x, y, up) => {
    const ctx = v.ctx;
    ctx.fillStyle = '#28b3a6'; ctx.beginPath(); ctx.moveTo(x + 8, y - 2);
    ctx.quadraticCurveTo(x + 2, y - 30 * up + 10 * (1 - up), x - 8, y - 42 * up + 18 * (1 - up));
    ctx.quadraticCurveTo(x - 10, y - 18 * up + 6 * (1 - up), x - 16, y + 1); ctx.closePath(); ctx.fill();
  };
  const pw14pMango = (v, x, y, r = 4.5) => {
    v.ctx.fillStyle = '#ffb83d'; v.ctx.beginPath(); v.ctx.ellipse(x, y, r, r * 1.2, 0.3, 0, Math.PI * 2); v.ctx.fill();
    v.fillCircle(x - 1.4, y - 1.6, r * 0.35, 'rgba(255,255,255,0.5)');
    v.line(x + 1, y - r * 1.1, x + 2, y - r * 1.6, '#3f8f5c', 1.5);
  };
  definePreview('Pterodactyl Express', {
    blurb: 'Flap Petra on the beat while your partner hangs on and drops fruit to the baby dinos!',
    loop: 5, still: 2.2,
    draw(v, t) {
      const ctx = v.ctx, k = t / 5, gy = 150;
      v.backdrop(gy);
      // a sleepy volcano far away
      ctx.fillStyle = 'rgba(180,120,110,0.55)'; ctx.beginPath(); ctx.moveTo(196, gy - 28); ctx.lineTo(232, 66); ctx.lineTo(252, 66); ctx.lineTo(292, gy - 28); ctx.closePath(); ctx.fill();
      v.fillCircle(242, 60 - (t * 6 % 12), 5 + (t * 6 % 12) * 0.4, 'rgba(255,255,255,0.5)');
      // the palm with its mango, and the nest on a stump
      const treeX = 112, nestX = 250;
      ctx.strokeStyle = '#8a5a35'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(treeX + 4, gy); ctx.quadraticCurveTo(treeX - 4, gy - 30, treeX, gy - 58); ctx.stroke();
      ctx.fillStyle = '#4caf6a';
      for (const a of [-2.6, -1.9, -1.2, -0.5, 0.2]) { ctx.beginPath(); ctx.ellipse(treeX + Math.cos(a) * 12, gy - 60 + Math.sin(a) * 6, 15, 4.5, a, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = '#7a4a2a'; ctx.fillRect(nestX - 11, gy - 22, 22, 22);
      ctx.fillStyle = '#c79a5a'; ctx.beginPath(); ctx.ellipse(nestX, gy - 22, 17, 6, 0, 0, Math.PI * 2); ctx.fill();
      // Petra flies left to right; each flap kicks her up a little, then she sinks
      const px = v.lerp(-40, 360, k);
      const last = pw14pFlaps.filter(f => f <= k).pop(), since = last == null ? 1 : (k - last) * 5;
      // (wings: snapped down by the flap, rising back up to the TOP; she bobs up on each flap and sinks between)
      const up = since < 0.08 ? 0 : Math.min(1, (since - 0.08) / 0.9);
      const py = 64 + Math.sin(k * Math.PI * 2) * 3 - 7 * Math.sin(Math.min(1, since / 1.1) * Math.PI);
      // the hanger: Bo under her feet, with the mango from the grab until the drop
      const grabK = (treeX - 20 + 40) / 400, dropK = (nestX - 30 + 40) / 400;
      const bx = px + 2, by = py + 40;
      v.line(px - 2, py + 6, bx - 4, by - 22, v.c.boDark, 2); v.line(px + 6, py + 6, bx + 4, by - 22, v.c.boDark, 2);
      // the mango: on the tree, in Bo's hand, falling into the nest, then a happy baby
      let mx = treeX + 6, my = gy - 52;
      if (k > grabK && k < dropK) { mx = bx + 11; my = by - 8; }
      else if (k >= dropK) { const f = v.ease.in(v.seg(k, dropK, dropK + 0.09)); mx = v.lerp(bx + 11 + (dropK - grabK) * 0, nestX, f); my = v.lerp(py + 32, gy - 26, f); }
      const fed = k > dropK + 0.09;
      // the baby dino in the nest
      const hop = fed ? v.hop(v.phase(t, 0.5), 4) : 0;
      ctx.fillStyle = '#ff9ec7'; v.rr(nestX - 6, gy - 34 + hop, 12, 12, 5); ctx.fill();
      v.fillCircle(nestX - 2, gy - 30 + hop, 1.2, v.c.ink); v.fillCircle(nestX + 2.5, gy - 30 + hop, 1.2, v.c.ink);
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(nestX - 5, gy - 34 + hop); ctx.lineTo(nestX - 2, gy - 38 + hop); ctx.lineTo(nestX + 1, gy - 34 + hop); ctx.lineTo(nestX + 4, gy - 38 + hop); ctx.lineTo(nestX + 6, gy - 34 + hop); ctx.fill();
      ctx.fillStyle = '#c79a5a'; ctx.beginPath(); ctx.ellipse(nestX, gy - 21, 17, 4, 0, 0, Math.PI); ctx.fill();
      if (!fed) pw14pMango(v, mx, my);
      if (fed) { v.heart(nestX + 10, gy - 44 - v.seg(k, dropK + 0.09, 1) * 14, 4.5); if (k < dropK + 0.3) v.label('Nom!', nestX - 18, gy - 50, 12, '#fff'); }
      v.hero(1, bx, by, { s: 0.8, face: 1, shadow: false, mood: k > grabK - 0.03 && k < grabK + 0.06 ? 'wow' : 'happy' });
      if (k > grabK - 0.04 && k < grabK + 0.03) v.sparkle(treeX + 6, gy - 52, v.seg(k, grabK - 0.04, grabK + 0.03));
      if (k > dropK && k < dropK + 0.09) { ctx.setLineDash([2, 4]); ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(bx + 11, by - 6); ctx.lineTo(nestX, gy - 26); ctx.stroke(); ctx.setLineDash([]); }
      // Petra, Pip on her back, her near wing over Pip's legs
      pw14pPetra(v, px, py, up);
      v.hero(0, px - 4, py - 6, { s: 0.75, face: 1, shadow: false, mood: since < 0.25 ? 'joy' : 'happy' });
      pw14pWing(v, px, py - 2, up);
      if (since < 0.3) v.label('PERFECT!', px - 34, py - 30, 10, v.c.gold);
      // the wing meter: fills up, flashes TOP, empties on the flap
      const mw = 90, mx0 = 12, my0 = 12;
      ctx.fillStyle = 'rgba(28,26,54,0.78)'; v.rr(mx0 - 4, my0 - 4, mw + 46, 18, 9); ctx.fill();
      ctx.fillStyle = 'rgba(255,197,61,0.35)'; v.rr(mx0 + mw * 0.72, my0, mw * 0.28, 10, 5); ctx.fill();
      ctx.fillStyle = up >= 0.98 ? v.c.gold : '#fff'; v.rr(mx0, my0, Math.max(10, mw * up), 10, 5); ctx.fill();
      v.text(up >= 0.98 ? 'FLAP!' : 'TOP', mx0 + mw + 20, my0 + 5, 9, up >= 0.98 ? v.c.gold : '#ffe7a8', 'center', true);
    },
  });
  // ----- END 14-2 Pterodactyl Express preview -----
  //
  // ----- BEGIN 14-3 Tar Pit Pull preview -----
  // ----- END 14-3 Tar Pit Pull preview -----
  //
  // ----- BEGIN 14-4 Raptor Race preview -----
  // ----- END 14-4 Raptor Race preview -----
}
