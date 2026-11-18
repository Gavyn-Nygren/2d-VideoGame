/* Pip & Bo - World 41 Pop-Up Storybook: music and ambience (registered here so js/music-tracks.js is left alone). */
'use strict';

/* THE BOOKWORM'S TUNE: a little bedtime-story melody that climbs like turning pages (1 2 3 5, 4 3 2) in G major,
   so the world sounds like a book being read aloud.
     popbook   (41-1 Carry It Together)  a gentle walking tune at 104 beats a minute: music box and pizzicato
               strings on the tune, a plucked upright bass, soft brushes (shaker and woodblock), a warm string pad.
               The B section turns the page: flute takes the tune over marimba.
   AMBIENCE.popbook: a quiet attic (a faint room hum, paper rustles now and then, a far clock tick and a bird at the
   window). Loudness set with node tools/audio/check.js. */
(() => {
  SONGS.popbook = {
    bpm: 104, vol: 0.36, root: 55, scale: 'major', form: ['A', 'A2', 'B', 'A2'],
    inst: { lead: 'musicbox', lead2: 'flute', bass: 'upright', comp: 'pizz', arp: 'marimba', pad: 'softpad' },
    bass: '0 . 2 . 0 . 2 .', comp: '. x . x . x . x', arp: '. . . . . . . .',
    drums: { z: '..o...o...o...o.', w: 'x.......x.......', k: 'x.......x.......' },
    sec: {
      A: { ch: [0, 3, 4, 0], lead: ['0 . 1 . 2 . 4 .', '3 . 2 . 1 . . .', '4 . 5 . 4 . 2 .', '1 . 0 . . . . .'] },
      A2: { ch: [0, 3, 5, 4], lead: ['0 . 1 . 2 . 4 .', '5 . 4 . 3 . . .', '2 . 4 . 7 . 5 .', '4 . . . 4 . . .'],
        lead2: ['. . . . . . . .', '. . . . . . . .', '. . . . 7 . . .', '6 . . . . . . .'] },
      B: { ch: [3, 4, 2, 5], lead: ['. . . . . . . .', '. . . . . . . .', '. . . . . . . .', '. . . . . . . .'],
        lead2: ['5 - 4 - 3 - 4 -', '6 - 5 - 4 - 2 -', '4 - 3 - 2 - 4 -', '5 - - - 4 - . .'], arp: '0 1 2 1 0 1 2 1',
        drums: { z: 'o.o.o.o.o.o.o.o.', w: 'x...x...x...x...', k: 'x.......x.......' } },
    },
  };

  const RUSTLE = (A, t) => { for (let i = 0; i < 3; i++) A.chirp(t + i * 0.06, 5200 - i * 600, 3800, 0.06, 0.004, 'square'); };
  const TICK = (A, t) => { for (let i = 0; i < 4; i++) A.chirp(t + i * 0.5, 2100, 2000, 0.015, 0.006, 'square'); };
  const BIRD = (A, t) => { const f = 2600 + Math.random() * 1200, n = 2 + (Math.random() * 3 | 0); for (let i = 0; i < n; i++) A.chirp(t + i * 0.12, f, f * 1.2, 0.07, 0.008); };
  Object.assign(AMBIENCE, {
    popbook: { beds: [{ noise: 'lowpass', f: 320, vol: 0.012, lfo: [0.06, 0.4] }, { noise: 'bandpass', f: 1800, q: 0.6, vol: 0.003, lfo: [0.11, 0.7] }],
      events: [{ every: [5, 11], fn: RUSTLE }, { every: [9, 16], fn: TICK }, { every: [7, 15], fn: BIRD }] },
  });
})();
