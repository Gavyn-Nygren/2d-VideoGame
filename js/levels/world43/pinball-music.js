/* Pip & Bo - 43-2 Pinball Panic: its songs and ambience (its own file, so js/music-tracks.js and the world's
   arcadecabinet-music.js are left alone).

   A bouncy fairground-in-space take on the world tune (A dorian, the same climbing hook in fourths), with an oom-pah
   organ and swing, switched part by part with Music.cue({ song }) from the scenery (never the rules):
     arcadepinball        part 1, the Flipper Field: oom-pah organ, the hook on a chip lead, a skipping beat
     arcadepinballTown    part 2, Bumper Town: busier, claps and a sixteenth arp; the bumpers land on the beat
     arcadepinballRails   part 3, the Chrome Rails: airy and echoing, vibes and a music box, a soft heartbeat
     arcadepinballBack    part 4, the Backboard: building, brass on the hook, a driving kick
     arcadepinballMulti   MULTIBALL: everything at once, faster
   Before the Jackpot the scenery cuts the music for a beat (silence), then MULTIBALL.
   AMBIENCE.arcadepinball: the hum and buzz of the table's coils, the creatures' fair far off (a barrel organ, a
   bell, a cheer), the glass ringing faintly, a coil clacking somewhere. Original music only. */
'use strict';

(() => {
  const hook = ['0 . 3 . 4 . 7 -', '. 6 4 . 3 . 4 .', '-1 . 2 . 3 . 6 -', '. 4 3 . 2 . 0 .'];
  const hookB = ['4 . 4 5 6 . 4 .', '3 . 3 4 5 . 3 .', '2 . 2 3 4 . 6 .', '7 - - - 6 - 4 -'];
  const ans = ['. . . . 7 . 9 .', '. . . . 6 . 4 .', '. . . . 6 . 9 .', '. . . . 4 . 3 .'];
  SONGS.arcadepinball = {
    bpm: 138, vol: 0.42, root: 57, scale: 'dorian', swing: 0.18, form: ['A', 'A', 'B', 'A'],
    inst: { lead: 'chip', lead2: 'musicbox', bass: 'tuba', comp: 'organ', arp: 'chiparp' },
    bass: '0 . 2 . 0 . 2 .', comp: '. x . x . x . x', arp: '0 . 2 . 3 . 2 .',
    drums: { k: 'x...x...x...x...', s: '....x.......x...', w: '..x...x...x...x.' },
    sec: { A: { ch: [0, 3, 6, 4], lead: hook, lead2: ans }, B: { ch: [2, 6, 3, 4], lead: hookB, drums: { k: 'x...x...x...x...', s: '....x.......x.x.', w: '..x.x.x...x.x.x.' } } },
  };
  SONGS.arcadepinballTown = {
    bpm: 142, vol: 0.38, root: 57, scale: 'dorian', swing: 0.15, form: ['A', 'B', 'A', 'B'],
    inst: { lead: 'chip', lead2: 'bell', bass: 'tuba', comp: 'organ', arp: 'chiparp' },
    bass: '0 . 2 . 0 2 3 2', comp: '. x . x . x . x', arp: '0 1 2 3 2 1 0 1 2 3 4 3 2 1 0 1',
    drums: { k: 'x...x...x...x...', s: '....x.......x...', c: '....x.......x..x', h: 'x.x.x.x.x.x.x.x.' },
    sec: { A: { ch: [0, 3, 6, 4], lead: hook, lead2: ans }, B: { ch: [2, 6, 3, 4], lead: hookB, lead2: ['9 . . . 11 . . .', '8 . . . 10 . . .', '7 . . . 9 . . .', '11 - - - 10 - - -'] } },
  };
  SONGS.arcadepinballRails = {
    bpm: 120, vol: 0.26, root: 57, scale: 'dorian', form: ['A', 'B'],
    inst: { lead: 'vibes', lead2: 'musicbox', bass: 'bass', arp: 'musicbox', pad: 'softpad' },
    bass: '0 . . . 2 . . .', arp: '0 2 3 4 3 2 0 . 0 2 3 4 7 4 3 2',
    drums: { k: 'x.......x.......', h: '....o.......o...' },
    sec: { A: { ch: [0, 0, 6, 3], lead: ['0 - 3 - 4 - 7 -', '. . 6 - 4 - - -', '-1 - 2 - 3 - 6 -', '. . 4 - 3 - - -'] }, B: { ch: [2, 6, 3, 4], lead: ['4 - - - 6 - - -', '3 - - - 5 - - -', '2 - - - 4 - 6 -', '7 - - - - - - -'], lead2: ans } },
  };
  SONGS.arcadepinballBack = {
    bpm: 146, vol: 0.33, root: 57, scale: 'dorian', form: ['A', 'A', 'B', 'B'],
    inst: { lead: 'chip', lead2: 'brass', bass: 'sawbass', comp: 'organ', arp: 'chiparp', pad: 'strings' },
    bass: '0 0 2 0 3 0 2 0', comp: '. x . x . x . x', arp: '0 1 2 3 4 3 2 1',
    drums: { k: 'x...x...x...x...', s: '....x.......x...', h: 'xxxxxxxxxxxxxxxx' },
    sec: { A: { ch: [0, 3, 6, 4], lead: hook, lead2: ['0 - - - 3 - - -', '4 - - - 3 - - -', '2 - - - 3 - - -', '4 - - - 2 - - -'] },
      B: { ch: [2, 6, 3, 4], lead: hookB, lead2: ['7 - - - 9 - - -', '6 - - - 8 - - -', '5 - - - 7 - - -', '9 - - - 8 - - -'], drums: { k: 'x.x.x...x.x.x...', s: '....x.......x.xx', h: 'xxxxxxxxxxxxxxxx', c: '............x...' } } },
  };
  SONGS.arcadepinballMulti = {
    bpm: 156, vol: 0.29, root: 57, scale: 'dorian', form: ['A', 'B'],
    inst: { lead: 'chip', lead2: 'bell', bass: 'sawbass', comp: 'organ', arp: 'chiparp', pad: 'strings' },
    bass: '0 0 2 0 3 0 2 3', comp: 'x x x x x x x x', arp: '0 1 2 3 4 3 2 1 0 1 2 3 4 5 6 7',
    drums: { k: 'x...x...x...x...', s: '....x.......x...', h: 'xxxxxxxxxxxxxxxx', c: '....x.......x...', H: 'x...............' },
    sec: { A: { ch: [0, 3, 6, 4], lead: hook, lead2: ['7 9 11 9 7 9 11 9', '6 8 10 8 6 8 10 8', '5 7 9 7 5 7 9 7', '11 - 10 - 9 - 7 -'] }, B: { ch: [2, 6, 3, 4], lead: hookB, lead2: ['11 - - - 14 - - -', '10 - - - 13 - - -', '9 - - - 11 - - -', '14 - - - - - - -'] } },
  };

  const COIL = (A, t) => { A.chirp(t, 140, 90, 0.05, 0.012, 'square'); A.puff(t, 'lowpass', 700, 0.8, 0.01, 0.05); };
  const CHIME = (A, t) => { const f = [880, 1108, 1320, 1760][Math.random() * 4 | 0]; A.chirp(t, f, f, 0.5, 0.004, 'sine'); };
  const ORGAN = (A, t) => { [0, 4, 7, 4, 9, 7].forEach((n, i) => A.chirp(t + i * 0.16, 330 * Math.pow(2, n / 12), 330 * Math.pow(2, n / 12), 0.14, 0.0018, 'square')); };
  const CHEER = (A, t) => { A.puff(t, 'bandpass', 1400, 0.6, 0.006, 0.6); A.chirp(t + 0.1, 1200, 1500, 0.2, 0.002, 'triangle'); };
  const GLASS = (A, t) => { A.chirp(t, 3300, 3290, 1.4, 0.0016, 'sine'); A.chirp(t, 4950, 4940, 1.0, 0.0008, 'sine'); };
  Object.assign(AMBIENCE, {
    arcadepinball: { beds: [{ hum: 'sawtooth', f: 60, lp: 260, vol: 0.016, lfo: [0.25, 0.35] }, { hum: 'square', f: 120, lp: 400, vol: 0.004, lfo: [3.1, 0.4] }, { noise: 'bandpass', f: 600, q: 0.6, vol: 0.009, lfo: [0.5, 0.3] }],
      events: [{ every: [0.8, 2.6], fn: COIL }, { every: [3, 7], fn: CHIME }, { every: [10, 20], fn: ORGAN }, { every: [6, 14], fn: CHEER }, { every: [8, 16], fn: GLASS }] },
  });
})();
