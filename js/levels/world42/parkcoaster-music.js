/* Pip & Bo - World 42 Midnight Theme Park: music and ambience (registered here so js/music-tracks.js is left alone). */
'use strict';

/* THE STARLIGHT GALOP: an old fairground organ tune in D major, played by a park that should be asleep. It hops
   up the scale like a coaster climbing (1 2 3 5, 5 6 5 3) and tumbles back down, with a cheeky minor turn in the
   middle (the midnight part).
     parkmidnight   (42-1 Runaway Coaster, and the World 42 world page)  a galop at 138 beats a minute: the band organ
                    (organ) on the tune, glockenspiel bells answering, an oom-pah tuba, an accordion on the
                    off-beats, snare and bass drum like a carousel band. The B section goes minor and quieter (the
                    dark funhouse), the bells take the tune, then the organ bursts back in.
   AMBIENCE.parkmidnight: an empty seaside park at night (the sea washing the beach, a soft wind, flags flapping,
   a gull now and then, a far ride clanking round, a buzzing neon sign). Loudness set with node tools/audio/check.js. */
(() => {
  SONGS.parkmidnight = {
    bpm: 138, vol: 0.34, root: 50, scale: 'major', form: ['A', 'A2', 'B', 'A2'],
    inst: { lead: 'organ', lead2: 'bell', bass: 'tuba', comp: 'accordion', arp: 'vibes', pad: 'softpad' },
    bass: '0 . 4 . 0 . 4 .', comp: '. x . x . x . x', arp: '. . . . . . . .',
    drums: { k: 'x...x...x...x...', s: '..x...x...x...x.', h: 'x.x.x.x.x.x.x.x.' },
    sec: {
      A: { ch: [0, 4, 0, 4], lead: ['0 1 2 4 4 . 5 4', '2 . 1 . 2 . . .', '4 5 6 7 7 . 6 5', '4 . 2 . 1 . . .'],
        lead2: ['. . . . . . . .', '. . . . 7 . 9 .', '. . . . . . . .', '. . . . 8 . 7 .'] },
      A2: { ch: [0, 3, 4, 0], lead: ['0 1 2 4 4 . 5 4', '3 . 5 . 3 . 1 .', '2 3 4 5 6 5 4 2', '0 . . . 0 . . .'],
        lead2: ['. . . . . . . .', '. . . . 8 . 10 .', '. . . . . . . .', '7 . . . 7 . . .'] },
      B: { ch: [5, 3, 5, 4], lead: ['. . . . . . . .', '. . . . . . . .', '. . . . . . . .', '. . . . . . . .'],
        lead2: ['5 . 6 . 5 . 4 .', '3 - - - 1 . . .', '5 . 6 . 7 . 8 .', '6 - - - 4 . . .'], arp: '0 2 4 2 0 2 4 2',
        drums: { k: 'x.......x.......', s: '........x.......', h: '..x...x...x...x.' } },
    },
  };

  const GULL = (A, t) => { const n = 2 + (Math.random() * 3 | 0); for (let i = 0; i < n; i++) A.chirp(t + i * 0.22, 1900 + Math.random() * 300, 1300, 0.18, 0.006, 'triangle'); };
  const CLANK = (A, t) => { for (let i = 0; i < 6; i++) A.chirp(t + i * 0.16, 240 + (i % 2) * 40, 200, 0.05, 0.006, 'square'); };
  const BUZZ = (A, t) => { for (let i = 0; i < 3; i++) A.chirp(t + i * 0.09, 120, 120, 0.06, 0.003, 'sawtooth'); };
  const FLAP = (A, t) => { for (let i = 0; i < 4; i++) A.chirp(t + i * 0.08, 900 - i * 80, 500, 0.04, 0.003, 'square'); };
  Object.assign(AMBIENCE, {
    parkmidnight: { beds: [{ noise: 'lowpass', f: 520, vol: 0.016, lfo: [0.09, 0.7] }, { noise: 'bandpass', f: 1400, q: 0.5, vol: 0.004, lfo: [0.05, 0.6] }],
      events: [{ every: [7, 14], fn: GULL }, { every: [10, 19], fn: CLANK }, { every: [6, 13], fn: BUZZ }, { every: [4, 9], fn: FLAP }] },
  });
})();
