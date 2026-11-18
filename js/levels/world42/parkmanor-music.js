/* Pip & Bo - 42-3 Spook Manor: music and ambience (registered here so js/music-tracks.js is left alone). */
'use strict';

/* THE MANOR WALTZ: the attraction's own theme, a slow waltz in D harmonic minor on a slightly out-of-tune music box,
   with a wheezy pipe organ under it. It is mostly quiet so the house can be heard: the A section is the music box
   alone over a held organ chord, the B section drops to almost nothing (a low pulse and one note at a time), and the
   C section lets the organ take the tune for a few bars before it sinks back.
     parkmanor        (42-3, the walk through the house)  86 beats a minute in 3/4: music box lead (detuned a touch by
                      its vibrato), organ pad and a soft bass on the downbeats; brushed hats only in C.
     parkmanorball    (the ballroom, the last waltz) the same tune, faster and full: organ lead, strings, a waltz
                      bass and drums. Music.cue switches to it in the ballroom.
   AMBIENCE.parkmanor: the old house (wind in the chimney, rain on the windows, a clock ticking, creaks, a far
   fairground organ from outside, muffled thunder now and then). Loudness set with node tools/audio/check.js. */
(() => {
  SONGS.parkmanor = {
    bpm: 86, beats: 3, vol: 0.5, root: 50, scale: 'harmonic', form: ['A', 'B', 'A', 'C'],
    inst: { lead: 'musicbox', lead2: 'organ', bass: 'upright', pad: 'softpad', arp: 'bell' },
    bass: '0 . .', arp: '. . .',
    sec: {
      A: { ch: [0, 3, 4, 0, 5, 3, 4, 4], lead: ['4 . 3', '2 - .', '1 2 3', '4 - .', '5 4 3', '2 . 0', '1 - 6', '5 . .'], lead2: ['. . .', '. . .', '. . .', '. . .', '. . .', '. . .', '. . .', '. . .'] },
      B: { ch: [0, 0, 5, 4], lead: ['. . .', '7 . .', '. . .', '6# . .'], bass: '0 . .', lead2: ['. . .', '. . .', '. . .', '. . .'] },
      C: { ch: [0, 3, 5, 4], lead: ['. . .', '. . .', '. . .', '. . .'], lead2: ['4 . 3', '2 - 0', '5 4 3', '1 - .'], drums: { h: '. o o' } },
    },
  };
  SONGS.parkmanorball = {
    bpm: 132, beats: 3, vol: 0.49, root: 50, scale: 'harmonic', form: ['A', 'A2'],
    inst: { lead: 'organ', lead2: 'musicbox', bass: 'tuba', comp: 'pizz', pad: 'strings' },
    bass: '0 . .', comp: '. x x', drums: { k: 'x . .', h: '. x x' },
    sec: {
      A: { ch: [0, 3, 4, 0, 5, 3, 4, 4], lead: ['4 . 3', '2 - .', '1 2 3', '4 - .', '5 4 3', '2 . 0', '1 - 6', '5 . .'] },
      A2: { ch: [0, 3, 5, 4, 0, 3, 4, 0], lead: ['7 . 6', '5 - 4', '5 6 7', '6# - .', '4 . 3', '2 - 0', '1 2 6', '0 - .'], lead2: ['. . 7', '. . .', '. . 9', '. . .', '. . 7', '. . .', '. . 8', '7 . .'] },
    },
  };
  const CREAK = (A, t) => { A.chirp(t, 260 + Math.random() * 120, 190, 0.5, 0.004, 'sawtooth'); };
  const DRIP = (A, t) => { A.chirp(t, 1800, 900, 0.06, 0.004, 'sine'); };
  const THUD = (A, t) => { A.chirp(t, 70, 45, 0.5, 0.008, 'sine'); A.chirp(t + 0.15, 60, 40, 0.6, 0.006, 'sine'); };
  const FAR_ORGAN = (A, t) => { [587, 659, 740, 880].forEach((f, i) => A.chirp(t + i * 0.22, f, f, 0.2, 0.0018, 'square')); };
  const CLOCK = (A, t) => { for (let i = 0; i < 8; i++) A.chirp(t + i * 0.5, 2400 - (i % 2) * 400, 2000, 0.02, 0.0025, 'square'); };
  Object.assign(AMBIENCE, {
    parkmanor: { beds: [{ noise: 'lowpass', f: 300, vol: 0.02, lfo: [0.07, 0.8] }, { noise: 'bandpass', f: 3200, q: 0.7, vol: 0.006, lfo: [0.2, 0.5] }],
      events: [{ every: [5, 11], fn: CREAK }, { every: [3, 7], fn: DRIP }, { every: [12, 22], fn: THUD }, { every: [14, 26], fn: FAR_ORGAN }, { every: [8, 15], fn: CLOCK }] },
  });
})();
