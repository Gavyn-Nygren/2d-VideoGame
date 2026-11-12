/* Pip & Bo - World 33 Storm Chasers: the world entry. */
'use strict';

/* World 33 is added from here (not in the WORLDS literal and LEVELS list of level-list.js), like Worlds 24 to 32, so it
   never conflicts with other worlds being built at the same time. World index 32. This file loads after the World 32
   files and the four World 33 level files, so its levels land in LEVELS after World 32 (level codes come from the world
   number). Each level's def lives at the bottom of its own level file as STORMCHASE.defs.<mode>; this file only sets the
   order.
   Storm Chasers: Pip and Bo chase wild weather in a dented van. The weather is the villain in every level: a tornado
   chases, a flash flood rises, a blizzard blinds, and in the versus level the players ARE the tornadoes.
   Gavyn picked the theme and these four levels from ten ideas (Nov 2026); he skipped Lightning Rod Relay, Eye of the
   Hurricane, Hailstorm Shield Walk, Weather Balloon Launch, Wildfire Wind Shift and Storm Surge Sprint. */
// a stormy green-grey sky, wet fields, a yellow-and-orange chase van
WORLDS[32] = { name: 'Storm Chasers', blurb: 'Chase the wild weather! Outrun a tornado, climb out of a flash flood, cross a blizzard roped together and spin as twisters!',
  theme: { skyTop: '#26302a', skyBot: '#6a7a64', hillFar: '#56645a', hillNear: '#3e4e44', sun: 'rgba(230,240,255,0.9)', sunGlow: 'rgba(200,220,255,0.3)',
    stone: '#6a6a64', stoneLight: '#9a9a90', stoneEdge: '#3a3a36', grass: '#7a9a4a', grassDark: '#4e6a2e', plank: '#9a6a3a', plankDark: '#5e3e20', rope: '#ffd23a', ropeDark: '#c89a10' } };

// 33-1 Tornado Alley Run, 33-2 Flash Flood Climb, 33-3 Blizzard Whiteout, 33-4 Twister Tag (Gavyn's order)
LEVELS.push(...['tornadorun', 'floodclimb', 'whiteout', 'twistertag'].map(k => STORMCHASE.defs[k]).filter(Boolean));
