/* Pip & Bo - Level previews for World 1, Sunny Meadow (see js/previews/preview-core.js for how to write one). */
'use strict';

// 1-1: Bo holds a button so Pip gets through the gate, then Pip holds the far button so Bo gets through too
definePreview('Hold the Door', {
  blurb: 'One of you holds the button so the other can get through the gate.',
  loop: 6, still: 2.1,
  draw(v, t) {
    const gy = 150, k = t / 6, ctx = v.ctx, gx = 164, bA = 70, bB = 228, door = 292;
    v.backdrop(gy);
    // who stands on which button
    const boRun = v.ease.inOut(v.seg(k, 0.5, 0.7)), pipRun = v.ease.inOut(v.seg(k, 0.2, 0.42));
    const boX = k < 0.5 ? v.lerp(30, bA, v.ease.inOut(v.seg(k, 0, 0.12))) : v.lerp(bA, door + 8, boRun);
    const pipX = k < 0.74 ? v.lerp(120, bB, pipRun) : v.lerp(bB, door - 12, v.ease.inOut(v.seg(k, 0.74, 0.84)));
    const onA = k > 0.12 && k < 0.5, onB = k > 0.42 && k < 0.74;
    const open = k < 0.12 ? 0 : k < 0.18 ? v.ease.out(v.seg(k, 0.12, 0.18)) : k < 0.74 ? 1 : 1 - v.seg(k, 0.74, 0.8);
    v.button(bA, gy, '#ffc53d', onA ? 1 : 0);
    v.button(bB, gy, '#ffc53d', onB ? 1 : 0);
    // the gate: gold bars that slide up into the stone wall above while a button is held
    ctx.save(); ctx.beginPath(); ctx.rect(gx - 14, 0, 28, gy); ctx.clip();
    ctx.fillStyle = '#ffc53d';
    for (let b = 0; b < 4; b++) { v.rr(gx - 11 + b * 6, gy - 54 - open * 46, 4, 54, 2); ctx.fill(); }
    ctx.restore();
    v.block(gx - 16, -4, 32, gy - 50, false);
    v.door(door, gy, k > 0.8 ? 1 : 0);
    const happy = k > 0.82;
    v.hero(1, boX, gy + (boRun > 0 && boRun < 1 ? v.hop(v.phase(t, 0.36), 5) : 0), { face: 1, sq: onA ? 0.12 : 0, mood: happy ? 'joy' : boRun > 0 && boRun < 1 ? 'grit' : 'happy' });
    v.hero(0, pipX, gy + (pipRun > 0 && pipRun < 1 ? v.hop(v.phase(t, 0.36), 5) : 0), { face: k > 0.42 && k < 0.74 ? -1 : 1, sq: onB ? 0.12 : 0, mood: happy ? 'joy' : pipRun > 0 && pipRun < 1 ? 'grit' : 'happy' });
    if (k > 0.14 && k < 0.36) v.bubble('Go!', bA, gy - 32);
    if (k > 0.47 && k < 0.66) v.bubble('Your turn!', bB, gy - 32);
    v.confetti(door, gy - 30, v.seg(k, 0.82, 1));
  },
});
