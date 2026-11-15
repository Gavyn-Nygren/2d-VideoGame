/* Pip & Bo - World 40 Colossus March: music and ambience (registered here so js/music-tracks.js is left alone). */
'use strict';

/* One tune runs through everything: TICK'S TUNE, a small music-box melody (he is a wind-up toy): 2 4 5 4 7 (in a
   major key: mi so la so do). The Colossus's march is the same tune played huge and slow in minor.
     ironmarch  (Part 1)  80 beats a minute, one bar a 3 s stride: a deep drum and low brass on the footfall, a
                          grinding bass ostinato, the tune in low brass, scratchy hats. ironmarch2 (Part 2) a step up,
                          ironmarch3 (Part 3) another step up with a snare.
     ironworks  (Parts 4 to 6)  clockwork: a ticking woodblock, bellows chords, hammered bells, the music box clear.
     ironfall   (Part 7)  fast and breathless, the tune broken into pieces and rushing, in a bright major key.
     ironthumb  (Part 8)  a jaunty accordion and toy-piano jig on the tune; ironthumbFast for the last 10 s of a round.
   Loudness set with node tools/audio/check.js. */
(() => {
  const march = (root, snare, vol) => ({
    bpm: 80, vol, root, scale: 'minor', form: ['A', 'A2', 'B', 'A2'],
    inst: { lead: 'brass', bass: 'sawbass', pad: 'strings', arp: 'musicbox' }, oct: { lead: -1 },
    bass: '0 0 . 0 2 . 0 . 0 0 . 0 1 . 2 .', arp: '. . . . . . . . . . . . 4 . 2 .',
    drums: Object.assign({ m: 'X.......o.......', t: '........x.......', h: '..o...o...o...o.' }, snare ? { s: '....x.......x..o' } : {}),
    sec: {
      A: { ch: [0, 0, 5, 4], lead: ['2 - 4 - 5 - 4 -', '7 - - - - - . .', '5 - 4 - 2 - 0 -', '1 - - - - - . .'] },
      A2: { ch: [0, 5, 3, 4], lead: ['2 - 4 - 5 - 4 -', '7 - - - 9 - 7 -', '5 - 7 - 5 - 4 -', '4 - - - 2 - . .'] },
      B: { ch: [5, 3, 0, 4], lead: ['7 - 9 - 10 - 9 -', '7 - 5 - 4 - . .', '5 - 7 - 9 - 7 -', '6 - - - 4 - . .'],
        drums: Object.assign({ m: 'X...o...X...o...', t: '....x.......x...', h: 'o.o.o.o.o.o.o.o.' }, snare ? { s: '....x.......x.xx' } : {}) },
    },
  });
  SONGS.ironmarch = march(45, false, 0.5); SONGS.ironmarch2 = march(47, false, 0.49); SONGS.ironmarch3 = march(48, true, 0.51);
  SONGS.ironworks = {
    bpm: 120, vol: 0.44, root: 57, scale: 'dorian', form: ['A', 'A2', 'B', 'A2'],
    inst: { lead: 'musicbox', lead2: 'bell', bass: 'upright', comp: 'accordion', arp: 'marimba' },
    bass: '0 . 2 . 0 . 2 .', comp: '. . x . . . x .', arp: '0 . 1 . 2 . 1 .',
    drums: { w: 'x.o.x.o.x.o.x.o.', k: 'x.......x.......', z: '..o...o...o...o.' },
    sec: {
      A: { ch: [0, 3, 0, 4], lead: ['2 . 4 . 5 . 4 .', '7 . . . 5 . 4 .', '2 . 4 . 5 . 7 .', '6 . 4 . 2 . . .'] },
      A2: { ch: [0, 3, 5, 4], lead: ['2 . 4 . 5 . 4 .', '7 . 9 . 7 . 5 .', '4 . 5 . 7 . 5 .', '4 . 2 . 1 . . .'], lead2: ['. . . . . . . .', '7 . . . . . . .', '. . . . . . . .', '4 . . . . . . .'] },
      B: { ch: [5, 6, 3, 4], lead: ['9 . 8 . 7 . 5 .', '6 . 5 . 4 . 2 .', '5 . 7 . 9 . 11 .', '8 . . . 7 . . .'],
        drums: { w: 'x.o.x.o.x.o.x.o.', k: 'x...x...x...x...', z: 'o.o.o.o.o.o.o.o.' } },
    },
  };
  SONGS.ironfall = {
    bpm: 150, vol: 0.18, root: 62, scale: 'major', form: ['A', 'A2', 'B', 'A2'],
    inst: { lead: 'flute', bass: 'bass', comp: 'pizz', arp: 'musicbox', pad: 'softpad' }, oct: { lead: 1 },
    bass: '0 . 0 2 0 . 0 2', comp: '. x . x . x . x', arp: '0 1 2 1 0 1 2 1',
    drums: { k: 'x...x...x...x...', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' },
    sec: {
      A: { ch: [0, 4, 5, 4], lead: ['2 4 5 4 7 . . .', '6 4 2 . 4 . . .', '5 7 9 7 5 . 4 .', '6 . 4 . 1 . . .'] },
      A2: { ch: [0, 4, 3, 4], lead: ['2 4 5 4 7 . 9 .', '8 . 6 . 4 . . .', '5 4 2 4 5 . 7 .', '8 . 9 . 11 . . .'] },
      B: { ch: [3, 0, 3, 4], lead: ['5 . 7 . 9 . 10 .', '9 7 4 . . . . .', '5 . 7 . 9 . 10 .', '11 . 9 . 8 . 6 .'],
        drums: { k: 'x.x.x.x.x.x.x.x.', s: '....x.......x.xx', h: 'xxxxxxxxxxxxxxxx' } },
    },
  };
  const jig = (bpm, vol) => ({
    bpm, vol, beats: 3, root: 60, scale: 'major', form: ['A', 'A2', 'B', 'A2'],
    inst: { lead: 'accordion', lead2: 'musicbox', bass: 'tuba', comp: 'pizz' }, oct: { lead2: 1 },
    bass: '0 . . 2 . .', comp: '. x x . x x',
    drums: { k: 'x.....', w: '...x..', j: 'x.xx.x' },
    sec: {
      A: { ch: [0, 4, 0, 4], lead: ['2 4 5 4 . 7', '6 . 4 2 . .', '2 4 5 4 . 7', '9 . 7 6 . .'] },
      A2: { ch: [0, 3, 4, 0], lead: ['2 4 5 4 . 7', '8 . 7 5 . 3', '4 . 2 1 . 4', '2 - - . . .'], lead2: ['. . . 4 . 7', '. . . . . .', '. . . 4 . 7', '. . . . . .'] },
      B: { ch: [3, 0, 3, 4], lead: ['5 7 8 7 5 3', '4 . 2 0 . .', '5 7 8 9 . 8', '7 . 6 4 . .'] },
    },
  });
  SONGS.ironthumb = jig(126, 0.63); SONGS.ironthumbFast = jig(150, 0.59);
  MUSIC_BY_WORLD[39] = 'ironmarch';

  const BIRD = (A, t) => { const f = 2300 + Math.random() * 1400, n = 2 + (Math.random() * 3 | 0); for (let i = 0; i < n; i++) A.chirp(t + i * 0.11, f, f * 1.25, 0.07, 0.014); };
  const CREAK = (A, t) => { A.chirp(t, 160, 120, 0.45, 0.008, 'sawtooth'); };
  Object.assign(AMBIENCE, {
    // Part 1: desert wind, sand hiss, far iron creaks
    ironDesert: { beds: [{ noise: 'bandpass', f: 650, q: 0.7, vol: 0.014, lfo: [0.08, 0.7], sweep: [0.05, 160] }, { noise: 'highpass', f: 5200, vol: 0.004, lfo: [0.17, 0.8] }],
      events: [{ every: [6, 13], fn: CREAK }] },
    // Part 2: high wind, chain rattle, crows, the canyon far below
    ironHeights: { beds: [{ noise: 'bandpass', f: 480, q: 1, vol: 0.024, lfo: [0.12, 0.7], sweep: [0.07, 240] }],
      events: [{ every: [4, 9], fn(A, t) { for (let i = 0; i < 5; i++) A.chirp(t + i * 0.05, 3000 + Math.random() * 800, 2600, 0.03, 0.006, 'square'); } },
        { every: [9, 18], fn(A, t) { A.chirp(t, 700, 520, 0.22, 0.012, 'sawtooth'); A.chirp(t + 0.3, 680, 500, 0.24, 0.01, 'sawtooth'); } }] },
    // Part 3: dusk city hum far down, tiny distant sirens, glass rattling
    ironCity: { beds: [{ noise: 'lowpass', f: 280, vol: 0.024, lfo: [0.08, 0.3] }, { noise: 'bandpass', f: 600, q: 0.8, vol: 0.008, lfo: [0.1, 0.6] }],
      events: [{ every: [10, 20], fn(A, t) { for (let i = 0; i < 4; i++) A.chirp(t + i * 0.5, 900, 700, 0.45, 0.003); } },
        { every: [4, 9], fn(A, t) { for (let i = 0; i < 4; i++) A.chirp(t + i * 0.03, 4200 + i * 200, 4000, 0.02, 0.004, 'square'); } }] },
    // Parts 4 to 6: furnace roar, drips, pipes knocking, a tick
    ironBelly: { beds: [{ noise: 'lowpass', f: 220, vol: 0.04, lfo: [0.3, 0.4] }, { hum: 'sawtooth', f: 55, lp: 160, vol: 0.012, lfo: [3, 0.3] }],
      events: [{ every: [2, 6], fn(A, t) { A.chirp(t, 1500, 900, 0.05, 0.016); } },
        { every: [3, 8], fn(A, t) { A.chirp(t, 240, 200, 0.06, 0.03, 'square'); A.chirp(t + 0.14, 230, 190, 0.05, 0.02, 'square'); } }] },
    // Parts 7 and 8: birds, a breeze, loose plates settling now and then
    ironMeadow: { beds: [{ noise: 'bandpass', f: 450, q: 0.6, vol: 0.007, lfo: [0.1, 0.6] }], events: [{ every: [1.5, 5], fn: BIRD }, { every: [8, 18], fn: CREAK }] },
  });
})();
