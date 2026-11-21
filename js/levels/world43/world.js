/* Pip & Bo - World 43 Arcade Cabinet: the world entry (3D, like Worlds 41 and 42). */
'use strict';

/* World 43 is added from here (not in level-list.js), so it never conflicts with other worlds. World index 42.
   Gavyn (2026-11-20): Pip and Bo are sucked inside an old arcade machine, and each level is a different made-up game
   inside it. Everything in it is original: no real arcade game, its characters, look, sounds or name. This file sets the
   world and pushes 43-1; later World 43 levels push themselves from their own files, in their own script blocks after
   this one. Their 3D files share the arcade kit (js/levels/world43/arcade-kit.js, ARCADE), loaded on demand with the 3D
   kit; every World 43 level calls ARCADE.seed() first thing in its scene build. The world song is 'arcadecabinet'
   (js/levels/world43/arcadecabinet-music.js). */
WORLDS[42] = { name: 'Arcade Cabinet', blurb: 'One old machine still glows in the closed arcade. Drop in a coin... and get sucked inside the game!',
  outfit: 'arcadecoin',
  theme: { skyTop: '#07060c', skyBot: '#241a34', hillFar: '#2a2030', hillNear: '#1a1420', sun: 'rgba(255,226,150,0.95)', sunGlow: 'rgba(90,255,138,0.22)',
    stone: '#6a5a48', stoneLight: '#c89a48', stoneEdge: '#3a2c1c', grass: '#1f6a3c', grassDark: '#123a22', plank: '#c89a48', plankDark: '#7a5a22', rope: '#4ae8ff', ropeDark: '#1a8aa8' } };
// 43-1 Coin Drop
LEVELS.push(ARCADECOIN.def);
