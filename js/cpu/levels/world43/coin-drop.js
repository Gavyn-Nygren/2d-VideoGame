/* Pip & Bo - Computer partner brain for 43-1 Coin Drop (mode 'arcadecoin', 3D). (First cut: it keeps its coin a little
   to its own side of the person's and jumps the wires; the full brain comes with the level.) */
'use strict';

(() => {
  cpuBrain('arcadecoin', {
    idleStop: 30,
    reset(s) { s.said = {}; },
    think(s, p, o, dt, info) {
      const out = {}, st = info.mst;
      if (!st || st.phase !== 'ride') return out;
      const me = st.c[p.id], them = st.c[1 - p.id], side = p.id ? 1 : -1;
      const want = them.state === 'ride' ? them.x + side * 3 : side * 2;
      if (want - me.x > 0.3) out.right = true; else if (want - me.x < -0.3) out.left = true;
      return out;
    },
  });
})();
