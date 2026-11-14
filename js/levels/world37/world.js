/* Pip & Bo - World 37 Medieval Tournament: the world entry. */
'use strict';

/* World 37 is added from here (not in the WORLDS literal and LEVELS list of level-list.js), like Worlds 24 to 35, so it
   never conflicts with other worlds being built at the same time. World index 36, set by index (World 36 Movie Studio,
   index 35, was being built in parallel; liveWorlds skips an empty slot until it lands). Its script tags sit together in
   one block after js/cpu/levels/golf.js in index.html (a spot no other world uses), so the two branches don't touch the
   same lines. Level codes come from the world number, so where its levels land in LEVELS doesn't matter. Each level's
   def lives at the bottom of its own level file as TOURNEY.defs.<mode>; this file only sets the order.
   Medieval Tournament: the King's Grand Tournament. Gavyn picked the theme and these four levels on 2026-11-12; he
   skipped Dragon Kite Parade Gone Wrong, Castle Wall Dash, Dungeon Flood Escape, Squire Scramble, Trebuchet Team and
   Archery Showdown. */
// a bright tournament sky, green lists, striped pavilions in red and gold
WORLDS[36] = { name: 'Medieval Tournament', blurb: 'The King\'s Grand Tournament! Stop a runaway royal carriage, ride one horse together, push a siege tower and win the Grand Joust!',
  theme: { skyTop: '#5ab4ee', skyBot: '#e8f6f0', hillFar: '#8ccf86', hillNear: '#5cb056', sun: 'rgba(255,246,200,0.95)', sunGlow: 'rgba(255,240,190,0.35)',
    stone: '#a8a69c', stoneLight: '#d2d0c6', stoneEdge: '#6e6c64', grass: '#d8323a', grassDark: '#8a1a22', plank: '#a0683a', plankDark: '#5e3a1c', rope: '#f6ecd0', ropeDark: '#b8a070' } };

// 37-1 Runaway Royal Carriage, 37-2 Tandem Joust Run, 37-3 Siege Tower Push, 37-4 Grand Joust (Gavyn's order)
LEVELS.push(...['royalcarriage', 'tandemjoust', 'siegetower', 'grandjoust'].map(k => TOURNEY.defs[k]).filter(Boolean));
