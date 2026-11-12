/* Pip & Bo - World 36 Movie Studio: the world entry. */
'use strict';

/* World 36 is added from here (not in the WORLDS literal and LEVELS list of level-list.js), like Worlds 24 to 35, so it
   never conflicts with other worlds being built at the same time (World 37 was built alongside it). World index 35.
   Its script tags sit together in their own block in index.html (marked "World 36 Movie Studio"), after World 35's
   level files, so this file runs after World 35 has pushed its level and World 36's levels land after it (level codes
   come from the world number, so the order only matters for "play the next level"). Each level's def lives at the
   bottom of its own level file as STUDIO.defs.<mode>; this file only sets the order.
   Movie Studio: Pip and Bo are stunt performers at Gigantic Pictures, where some things are fake (paper, foam, sugar
   glass) and some are very real (steel, brick, a runaway tram). Gavyn picked the theme and these four levels from ten
   ideas (Nov 2026); he skipped Monster Movie Stomp, Collapsing Set Escape, Dolly Track Dash, Special Effects Gone
   Wrong, Lights Camera Action and Red Carpet Race. */
// a backlot sky, cream soundstages, red carpet and gold
WORLDS[35] = { name: 'Movie Studio', blurb: 'Lights, camera, stunts! Film a car chase, stop a runaway tram, fall off a skyscraper and win the stunt show!',
  theme: { skyTop: '#2a2448', skyBot: '#d88a6a', hillFar: '#c8bca2', hillNear: '#8a7a5a', sun: 'rgba(255,244,210,0.95)', sunGlow: 'rgba(255,220,170,0.35)',
    stone: '#6a7480', stoneLight: '#a8b2be', stoneEdge: '#3a424c', grass: '#c8202e', grassDark: '#8a1018', plank: '#c8a070', plankDark: '#8a6a40', rope: '#ffd23a', ropeDark: '#c89a10' } };

// 36-1 Car Chase, Take One; 36-2 Backlot Tram Runaway; 36-3 Stunt Double Fall; 36-4 Stunt Show Showdown (Gavyn's order)
LEVELS.push(...['takeone', 'tramrun', 'stuntfall', 'stuntshow'].map(k => STUDIO.defs[k]).filter(Boolean));
