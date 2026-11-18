/* Pip & Bo - World 41 Pop-Up Storybook: the world entry (the first 3D world). */
'use strict';

/* World 41 is added from here (not in level-list.js), like Worlds 24 to 40, so it never conflicts with other worlds.
   World index 40. Its levels are 3D (def.view3d, js/3d/). This file sets the world and pushes 41-1; later World 41
   levels push themselves from their own files, loaded after this one in their own script blocks (level codes come from
   world order, so where a level lands in LEVELS doesn't matter).
   Pop-Up Storybook: the Bookworm's storybook lies open on an attic desk, and every page is a paper pop-up garden, gorge or
   town. Gavyn picked the theme, three.js and real 3D movement with one shared camera on 2026-11-17. */
WORLDS[40] = { name: 'Pop-Up Storybook', blurb: 'Step into a giant pop-up book. Carry the Bookworm\'s pencil and draw your own way through the pages!',
  theme: { skyTop: '#3a2c38', skyBot: '#6b5260', hillFar: '#8a6e62', hillNear: '#5d4a48', sun: 'rgba(255,214,150,0.9)', sunGlow: 'rgba(255,200,120,0.3)',
    stone: '#c9b48e', stoneLight: '#e6d6b4', stoneEdge: '#7a6448', grass: '#9cc77a', grassDark: '#5f8f4a', plank: '#c98b5a', plankDark: '#8a5833', rope: '#e8d8b0', ropeDark: '#9a8460' } };
// 41-1 Carry It Together
LEVELS.push(POPCARRY.def);
