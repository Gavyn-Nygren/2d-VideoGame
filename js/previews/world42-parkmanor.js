/* Pip & Bo - World page preview: 42-3 Spook Manor. See js/previews/preview-core.js. (Drawn properly with the full
   build; for now a plain dark hall so the card is not empty.) */
'use strict';
definePreview('Spook Manor', {
  blurb: 'One lantern, one key, and a clockwork butler. Stay in the light!', loop: 6, still: 3,
  draw(v, t) {
    const c = v.ctx; c.fillStyle = '#141024'; c.fillRect(0, 0, v.W, v.H);
    const x = 90 + (t % 6) * 25, g = c.createRadialGradient(x, 130, 4, x, 130, 70); g.addColorStop(0, 'rgba(255,214,140,0.55)'); g.addColorStop(1, 'rgba(255,214,140,0)');
    c.fillStyle = g; c.fillRect(0, 0, v.W, v.H);
    v.hero(0, x, 150, { face: 1 }); v.hero(1, x - 30, 150, { face: 1 });
  },
});
