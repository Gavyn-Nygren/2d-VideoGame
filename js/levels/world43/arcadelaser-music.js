/* Pip & Bo - 43-4 Laser Tag Arena: music and ambience (registered here so js/music-tracks.js is left alone).

   ZAP MAZE: an original, pounding, bright dance track at 128 a minute in E minor, a four-on-the-floor bass drum that
   the risers move to (one riser change every 16 beats). The hook is a bouncing octave figure (0 7 5 7 3 7 2 7) over a
   pulsing off-beat bass. One more layer each round (Music.cue({ song }) from the show), as the spec asks:
     arcadelaser       round 1, Pillars: kick, off-beat bass, hats, the hook on a soft square
     arcadelaser2      round 2, Hall of Mirrors: + claps and a sparkling arp
     arcadelaser3      round 3 (and 5's base), The Beat: + the second voice and the pad, open hats
     arcadelaserDark   round 4, Blackout: stripped to bass and a heartbeat kick, a far-off arp
     arcadelaserFull   round 5, Full Power: everything, sixteenth hats, the hook doubled an octave up
     arcadelaserGold   NEXT TAG WINS: the hook in the major on bells with a shimmer, faster
   AMBIENCE.arcadelaser: the hum of the black-light tubes, the hiss of the smoke machines now and then, the crowd
   muffled behind the glass, a far-off whistle from the referee. Loudness set with node tools/audio/check.js. */
(() => {
  const hookA = ['0 7 5 7 3 7 2 7', '0 7 5 7 3 . 2 .', '-2 5 3 5 2 5 0 5', '-1 . 2 . 4 . 6 .'];
  const hookB = ['4 . 4 . 7 . 6 4', '3 . 3 . 6 . 5 3', '2 . 2 . 5 . 4 2', '4 - - - 6 - 7 -'];
  const ans = ['. . . . 9 . 7 .', '. . . . 10 . 9 .', '. . . . 7 . 5 .', '. . . . 9 - - -'];
  const base = (o) => Object.assign({
    bpm: 128, vol: 0.39, root: 52, scale: 'minor', form: ['A', 'A', 'B', 'A'],
    inst: { lead: 'chip', lead2: 'chiparp', bass: 'sawbass', comp: 'pluck', arp: 'chiparp', pad: 'softpad' },
    bass: '. 0 . 0 . 0 . 0', drums: { k: 'X...x...X...x...', h: '..x...x...x...x.' },
    sec: { A: { ch: [0, 0, 5, 6], lead: hookA }, B: { ch: [2, 6, 5, 4], lead: hookB } },
  }, o);
  SONGS.arcadelaser = base({});
  SONGS.arcadelaser2 = base({ vol: 0.38, arp: '0 1 2 3 2 1 2 3', drums: { k: 'X...x...X...x...', c: '....x.......x...', h: '..x...x...x...x.' } });
  SONGS.arcadelaser3 = base({ vol: 0.36, arp: '0 1 2 3 2 1 2 3', comp: '. x . x . x . x',
    drums: { k: 'X...x...X...x...', c: '....x.......x...', h: 'x.x.x.x.x.x.x.x.', H: '..x...x...x...x.' },
    sec: { A: { ch: [0, 0, 5, 6], lead: hookA, lead2: ans }, B: { ch: [2, 6, 5, 4], lead: hookB, lead2: ans } } });
  SONGS.arcadelaserDark = base({ vol: 0.65, form: ['A', 'A'], inst: { lead: 'musicbox', bass: 'sawbass', arp: 'chiparp', pad: 'strings' },
    bass: '0 . . 0 . . 0 .', arp: '0 . . 2 . . 1 .', drums: { k: 'x..x............', h: '........o.......' },
    sec: { A: { ch: [0, 0, 5, 6], lead: ['0 . . . . . . .', '. . . . . . . .', '-2 . . . . . . .', '-1 . . . . . . .'] } } });
  SONGS.arcadelaserFull = base({ vol: 0.35, bpm: 132, arp: '0 1 2 3 4 3 2 1 0 1 2 3 4 3 2 1', comp: '. x . x . x . x', oct: { lead2: 1 },
    drums: { k: 'X...x...X...x...', c: '....x.......x...', h: 'xxxxxxxxxxxxxxxx', H: '..x...x...x...x.', s: '..............xx' },
    sec: { A: { ch: [0, 0, 5, 6], lead: hookA, lead2: hookA }, B: { ch: [2, 6, 5, 4], lead: hookB, lead2: ans } } });
  SONGS.arcadelaserGold = base({ vol: 0.3, bpm: 140, scale: 'major', root: 52, form: ['A'], inst: { lead: 'bell', lead2: 'chip', bass: 'sawbass', arp: 'vibes', pad: 'strings' },
    arp: '0 1 2 3 4 3 2 1', drums: { k: 'X...x...X...x...', j: 'x.x.x.x.x.x.x.x.', c: '....x.......x...' },
    sec: { A: { ch: [0, 3, 4, 4], lead: hookA, lead2: ans } } });

  const HISS = (A, t) => { A.puff(t, 'bandpass', 2600, 0.6, 0.012, 0.9); };
  const WHISTLE = (A, t) => { A.chirp(t, 2400, 2300, 0.18, 0.004, 'sine'); A.chirp(t + 0.22, 2400, 2300, 0.3, 0.004, 'sine'); };
  const CROWD = (A, t) => { A.puff(t, 'bandpass', 900, 0.5, 0.01, 1.4); };
  Object.assign(AMBIENCE, {
    arcadelaser: { beds: [{ hum: 'sawtooth', f: 120, lp: 400, vol: 0.01, lfo: [0.3, 0.2] }, { noise: 'bandpass', f: 700, q: 0.5, vol: 0.012, lfo: [0.15, 0.4] }],
      events: [{ every: [3, 7], fn: HISS }, { every: [14, 30], fn: WHISTLE }, { every: [4, 9], fn: CROWD }] },
  });
})();
