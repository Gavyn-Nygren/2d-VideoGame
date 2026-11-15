/* Pip & Bo - World 40 Colossus March: the world entry. */
'use strict';

/* World 40 is added from here (not in level-list.js), like Worlds 24 to 39, so it never conflicts with other worlds.
   World index 39; it loads after World 39 so the boss is the last level of the page. One level, 40-1 The Iron Colossus
   (mode 'colossus', js/levels/world40/iron-colossus.js and iron-<part>.js). Gavyn picked it on 2026-11-14. */
WORLDS[39] = { name: 'Colossus March', blurb: 'Chase, climb and switch off a walking iron giant. The boss of worlds 31 to 40.',
  theme: { skyTop: '#d9c49a', skyBot: '#f2e6cc', hillFar: '#c9ae7e', hillNear: '#b9955e', sun: 'rgba(255,236,190,0.95)', sunGlow: 'rgba(255,214,140,0.35)',
    stone: '#8a5c46', stoneLight: '#9a735e', stoneEdge: '#463c37', grass: '#86c2ad', grassDark: '#4f9a86', plank: '#9a6a3e', plankDark: '#62401f', rope: '#e8d8b0', ropeDark: '#9a8458' } };
LEVELS.push(IRON_DEF);
