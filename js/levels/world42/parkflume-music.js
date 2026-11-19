/* Pip & Bo - 42-2 Log Flume Plunge: its own music and ambience (registered here so js/music-tracks.js is left alone).

   THE TIMBER FALLS JIG: a riverboat banjo tune in G major that bobs along like the log on the current (a lilting
   up-and-over figure, 5 3 5 6 5 3 1), marimba answering it from the jungle, an upright bass, accordion on the
   off-beats and hand drums under a shaker. The B section drops into the minor for the sawmill's clatter
   (woodblock and cowbell), then the banjo comes back.
     parkflume       the ride
     parkflumeLift   cued while a lift's belt hauls the log up: slow and tense, a clock-tick woodblock and a chain
                     clank, bells climbing a step every bar; the jig comes back as the log splashes down
   AMBIENCE.parkflume: running water and a far weir, crickets, frogs, a jungle bird now and then, the log creaking.
   Loudness set with node tools/audio/check.js. */
'use strict';
(() => {
  SONGS.parkflume = {
    bpm: 120, vol: 0.37, root: 55, scale: 'major', form: ['A', 'A2', 'B', 'A2'],
    inst: { lead: 'banjo', lead2: 'marimba', bass: 'upright', comp: 'accordion', arp: 'pluck', pad: 'softpad' },
    bass: '0 . 4 . 0 . 4 .', comp: '. x . x . x . x', arp: '. . . . . . . .',
    drums: { D: 'x.....x...x.....', e: '...x.......x..x.', z: '..x...x...x...x.', h: 'x...x...x...x...' },
    sec: {
      A: { ch: [0, 3, 4, 0], lead: ['4 2 4 5 4 2 0 .', '3 . 5 . 3 . 1 .', '4 2 4 5 6 5 4 2', '1 . 2 . 0 . . .'],
        lead2: ['. . . . . . . .', '. . . . 7 . 8 .', '. . . . . . . .', '. . . . 7 . 9 .'] },
      A2: { ch: [0, 5, 3, 4], lead: ['4 2 4 5 4 2 0 .', '5 . 4 . 5 . 7 .', '6 5 4 3 4 . 2 .', '1 2 3 4 4 - - .'],
        lead2: ['. . . . 7 . . .', '. . . . 9 . . .', '. . . . 8 . . .', '7 . 9 . 11 . . .'] },
      B: { ch: [5, 3, 5, 4], lead: ['. . . . . . . .', '. . . . . . . .', '. . . . . . . .', '. . . . . . . .'],
        lead2: ['5 . 5 6 5 . 3 .', '4 . 3 . 1 - . .', '5 . 5 6 7 . 6 .', '5 - - - 4 . . .'], arp: '0 2 4 2 0 2 4 2',
        drums: { w: 'x.x...x.x...x...', b: '....x.......x...', D: 'x.......x.......', z: 'x.x.x.x.x.x.x.x.' } },
    },
  };
  SONGS.parkflumeLift = {
    bpm: 96, vol: 0.53, root: 55, scale: 'minor', form: ['A', 'B'],
    inst: { lead: 'bell', lead2: 'vibes', bass: 'tuba', comp: 'pizz', arp: 'musicbox', pad: 'strings' },
    bass: '0 . . . 0 . . .', comp: 'x . x . x . x .', arp: '. . . . . . . .',
    drums: { w: 'x...x...x...x...', b: '..........x.....', m: 'x...............' },
    sec: {
      A: { ch: [0, 0, 5, 5], lead: ['0 . . . 2 . . .', '3 . . . 4 . . .', '5 . . . 4 . . .', '5 . . . 6 . . .'], lead2: ['. . . . . . . .', '. . . . . . . .', '. . . . . . . .', '. . . . . . . .'] },
      B: { ch: [3, 3, 4, 4], lead: ['7 . . . 6 . . .', '7 . . . 8 . . .', '9 . . . 8 . . .', '9 . 10 . 11 - - -'], lead2: ['. . . . . . . .', '. . . . . . . .', '. . . . . . . .', '. . . . . . . .'], arp: '0 4 7 4 0 4 7 4',
        drums: { w: 'x.x.x.x.x.x.x.x.', b: '..x.......x.....', m: 'x.......x.......' } },
    },
  };

  const CRICKET = (A, t) => { for (let i = 0; i < 9; i++) A.chirp(t + i * 0.045, 4300, 4100, 0.025, 0.004, 'sine'); };
  const FROG = (A, t) => { for (let i = 0; i < 2; i++) A.chirp(t + i * 0.28, 190, 120, 0.16, 0.012, 'square'); };
  const BIRD = (A, t) => { A.chirp(t, 700, 1500, 0.22, 0.006, 'triangle'); A.chirp(t + 0.3, 1500, 900, 0.18, 0.005, 'triangle'); A.chirp(t + 0.55, 1100, 1700, 0.12, 0.004, 'triangle'); };
  const CREAK = (A, t) => { A.chirp(t, 160, 230, 0.35, 0.006, 'sawtooth'); };
  const DRIP = (A, t) => { const n = 2 + (Math.random() * 3 | 0); for (let i = 0; i < n; i++) A.chirp(t + i * (0.1 + Math.random() * 0.2), 900 + Math.random() * 600, 2200, 0.05, 0.005, 'sine'); };
  Object.assign(AMBIENCE, {
    parkflume: { beds: [{ noise: 'lowpass', f: 650, vol: 0.02, lfo: [0.13, 0.5] }, { noise: 'bandpass', f: 2300, q: 0.8, vol: 0.006, lfo: [0.4, 0.7] }],
      events: [{ every: [3, 7], fn: CRICKET }, { every: [6, 12], fn: FROG }, { every: [9, 18], fn: BIRD }, { every: [5, 11], fn: CREAK }, { every: [4, 9], fn: DRIP }] },
  });
})();
