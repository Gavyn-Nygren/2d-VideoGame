/* Pip & Bo - Outfits for Worlds 1-31: what Pip and Bo wear in each world and level (the system is js/outfits.js). */
'use strict';

/* Gavyn (Nov 2026): Pip and Bo get outfits unique to each level where it fits. New worlds declare their own
   (WORLDS[n].outfit or def.outfit, see js/outfits.js); this file only covers the worlds built before outfits, by
   level name, so level-list.js stays as it was.
   The rule of thumb: Pip keeps orange showing, Bo keeps blue, and the two never wear the same hat. A level whose own
   code already puts a hat on someone for their job (Runaway Ship's captain, Train Tracks' builder, Krakatoa's leader,
   Snowball Fight's bobble hats) gets the outfit without hats (`noHats`). */

/* ---------- World 1 Sunny Meadow: their everyday look (no outfit, so new players meet the real Pip and Bo) ---------- */

/* ---------- World 2 Block Party: builders ---------- */
defineOutfit('builders', {
  pip: [['hardhat', { col: '#ffc53d' }], ['overalls', { col: '#8a5a32', pocket: true }]],
  bo: [['hardhat', { col: '#f4f6fa', lamp: true }], ['vest', { col: '#d6ff3a' }], ['belt', { col: '#8a5a32', pouch: '#8a5a32' }]],
});
defineOutfit('royals', { // Crown Keep: capes to fight over the crown in (no hats: the crown is the prize)
  pip: [['cape', { col: '#c8202a', lining: '#ffc53d' }], ['belt', { col: '#ffc53d', buckle: '#e8483a' }]],
  bo: [['cape', { col: '#6a3fc8', lining: '#ffc53d' }], ['belt', { col: '#ffc53d', buckle: '#5bd0ff' }]],
});

/* ---------- World 3 Fairway Fun: golfers ---------- */
defineOutfit('golf', {
  pip: [['visor', { col: '#fff', band: '#fff' }], ['shirt', { col: '#fff', top: -8, collar: 'own' }], ['belt', { col: '#2b2840', buckle: '#c9d0da' }]],
  bo: [['flatcap', { col: '#c8a46a' }], ['vest', { col: '#3fbf6a', buttons: '#fff' }], ['bowtie', { col: '#2b2840' }]],
});

/* ---------- World 4 Rumble Park ---------- */
defineOutfit('wrestlers', { // King of the Hill
  pip: [['headband', { col: '#ffd23f', tails: true }], ['shirt', { col: '#c8202a', top: -7, belt: '#ffd23f' }]],
  bo: [['headband', { col: '#fff', tails: true, stripe: '#2f5fc4' }], ['shirt', { col: '#2b2840', top: -7, belt: '#5bd0ff' }]],
});
defineOutfit('snowday', { // Snowball Fight: its own bobble hats soak hits, so scarves only
  pip: [['scarf', { col: '#3fbf6a', stripe: '#fff' }]],
  bo: [['scarf', { col: '#e8483a', stripe: '#fff' }]],
});
defineOutfit('beach', { // Hot Potato Volleyball
  pip: [['visor', { col: '#ff8fc7', band: '#ff8fc7' }], ['lei', { cols: ['#ffd23f', '#fff', '#ff8fc7'] }], ['shades', { frame: '#ff8fc7' }]],
  bo: [['sunhat', { col: '#f2d07a', band: '#5bd0ff', flower: '#ff8fc7' }], ['lei', { cols: ['#ff8fc7', '#b28dff', '#fff'] }]],
});
defineOutfit('painters', { // Paint the Floor
  pip: [['cap', { col: '#fff', peak: '#fff' }], ['overalls', { col: '#f6efdf' }], ['dots', { col: '#5b95ff', at: [[-6, -3, 1.2], [5, -7, 1], [7, -2, 1.4]] }]],
  bo: [['beret', { col: '#e8483a' }], ['apron', { col: '#f6efdf', stain: '#ff6b4a' }]],
});

/* ---------- World 5 Road Trip ---------- */
defineOutfit('roadtrip', {
  pip: [['cap', { col: '#e8483a', peak: '#fff', letter: '★', letterCol: '#ffd23f' }], ['shades', {}]],
  bo: [['sunhat', { col: '#f2d07a', band: '#e8483a' }], ['backpack', { col: '#3fbf6a', roll: '#e8483a' }]],
});
defineOutfit('pizza', { // Pizza Delivery
  pip: [['cap', { col: '#e8483a', peak: '#e8483a', trim: '#fff', letter: 'P', letterCol: '#fff' }], ['apron', { col: '#fff', trim: '#e8483a' }]],
  bo: [['chef', { band: '#e8483a' }], ['apron', { col: '#fff', trim: '#3fbf6a', stain: '#e8483a' }]],
});
defineOutfit('icetrip', { // Ice Slide
  pip: [['beanie', { col: '#3fbf6a', trim: '#fff', pom: '#fff', stripe: '#fff' }], ['scarf', { col: '#ffd23f', stripe: '#e8483a' }]],
  bo: [['earmuffs', { col: '#ff8fc7', band: '#2b2840' }], ['scarf', { col: '#e8483a', stripe: '#fff' }]],
});
defineOutfit('firefighters', { // Rising Lava
  pip: [['helmet', { col: '#e8202a', stripe: '#ffd23f', visor: '#ffd23f' }], ['shirt', { col: '#3a3a4a', top: -7, stripes: null, belt: '#ffd23f' }]],
  bo: [['helmet', { col: '#ffd23f', stripe: '#e8202a', visor: '#2b2840' }], ['shirt', { col: '#3a3a4a', top: -7, belt: '#ffd23f' }]],
});

/* ---------- World 6 Backyard Bash ---------- */
defineOutfit('chefs', { // Monster Feeding
  pip: [['chef', { band: 'own' }], ['apron', { col: '#fff', trim: 'own', stain: '#8a5a32' }]],
  bo: [['chef', { band: 'own' }], ['scarf', { col: '#e8483a', stripe: '#fff' }], ['apron', { col: '#fff', trim: 'own' }]],
});
defineOutfit('tugteam', { // Tug of War
  pip: [['headband', { col: '#fff', badge: '#e8483a' }], ['shirt', { col: '#fff', top: -8, number: 1, numCol: 'own', side: 'own' }]],
  bo: [['headband', { col: '#fff', badge: '#2f5fc4' }], ['shirt', { col: '#fff', top: -8, number: 2, numCol: 'own', side: 'own' }]],
});
defineOutfit('railway', { // Train Tracks: its own hats show who builds, so overalls only
  pip: [['overalls', { col: '#4a4a5a', button: '#f2c14e' }], ['neckerchief', { col: '#e8483a', dots: '#fff' }]],
  bo: [['overalls', { col: '#6a4a2a', button: '#f2c14e' }], ['neckerchief', { col: '#ffd23f', dots: '#fff' }]],
});

/* ---------- World 7 Castle Quest ---------- */
defineOutfit('knights', {
  pip: [['knight', { plume: '#ffd23f' }], ['armor', { emblem: 'own', mail: true }]],
  bo: [['knight', { plume: '#e8483a', col: '#e0c070' }], ['armor', { col: '#e0c070', emblem: 'own' }]],
});
defineOutfit('burglars', { // Laser Vault: cartoon cat burglars sneaking through the vault
  pip: [['beanie', { col: '#2b2840', trim: '#2b2840', pom: false }], ['domino', {}], ['shirt', { col: '#fff', top: -9, stripes: '#2b2840' }]],
  bo: [['flatcap', { col: '#2b2840' }], ['domino', {}], ['shirt', { col: '#fff', top: -9, stripes: '#2b2840' }], ['backpack', { col: '#5a3418' }]],
});

/* ---------- World 8 Lucky Casino ---------- */
defineOutfit('casino', {
  pip: [['visor', { col: '#3fbf6a', band: '#3fbf6a', glass: true }], ['vest', { col: '#c8202a', buttons: '#ffd23f' }], ['bowtie', { col: '#2b2840' }]],
  bo: [['tophat', { col: '#2b2840', band: '#ffd23f', tall: 10 }], ['bowtie', { col: '#c8202a', dots: '#fff' }], ['vest', { col: '#2b2840', buttons: '#ffd23f' }]],
});

/* ---------- World 9 Great Escapes ---------- */
defineOutfit('romans', { // Pompeii Escape
  pip: [['flowers', { laurel: true, col: '#7ac25c' }], ['tunic', { col: '#f6efdf', belt: '#c8202a' }]],
  bo: [['flowers', { laurel: true, col: '#ffc53d' }], ['tunic', { col: '#f6efdf', belt: '#6a3fc8' }]],
});
defineOutfit('frisco', { // San Francisco 1906 Quake
  pip: [['flatcap', { col: '#8a7a66' }], ['overalls', { col: '#6a5a4a' }], ['neckerchief', { col: '#e8483a' }]],
  bo: [['bowler', { col: '#3a3030' }], ['vest', { col: '#4a4a5a', buttons: '#ffd23f' }], ['bowtie', { col: '#c8202a' }]],
});
defineOutfit('iceage', { // Ice Age Glacier
  pip: [['headband', { col: '#c8a070', stripe: '#f4ead0' }], ['cavefur', { col: '#c8a070', spots: '#7a4a1a' }]],
  bo: [['hood', { col: '#9a7a5a', fur: '#f4ead0' }], ['cavefur', { col: '#e8d8b0', spots: '#9a7a5a' }]],
});
defineOutfit('explorers1883', { // Krakatoa Ash Run: the leader's explorer hat is the level's own
  pip: [['vest', { col: '#c8b080' }], ['scarf', { col: '#e8483a' }]],
  bo: [['vest', { col: '#a89060' }], ['scarf', { col: '#2fbf9f' }], ['backpack', { col: '#7a5a3a' }]],
});

/* ---------- World 10 Collector's Vault (boss): the heroes' capes ---------- */
defineOutfit('vaultheroes', {
  pip: [['cape', { col: '#c8202a', lining: '#ffd23f' }], ['domino', { col: '#c8202a' }], ['belt', { col: '#ffd23f', buckle: '#fff' }]],
  bo: [['cape', { col: '#ffd23f', lining: '#c8202a' }], ['domino', { col: '#2b2840' }], ['belt', { col: '#ffd23f', buckle: '#fff' }]],
});

/* ---------- World 11 Summer Games ---------- */
defineOutfit('divers', { // Synchro Diving
  pip: [['swimcap', { col: '#fff', stripe: 'own' }], ['goggles', { frame: '#2b2840', lens: 'rgba(255,200,120,0.5)' }]],
  bo: [['swimcap', { col: '#fff', stripe: 'own' }], ['goggles', { frame: '#2b2840', lens: 'rgba(150,230,255,0.5)' }]],
});
defineOutfit('cyclists', { // Tandem Velodrome
  pip: [['helmet', { col: '#fff', stripe: 'own', vents: true }], ['shirt', { col: 'own', top: -8, side: '#ffd23f' }]],
  bo: [['helmet', { col: '#fff', stripe: 'own', vents: true }], ['shirt', { col: 'own', top: -8, side: '#ffd23f' }]],
});
defineOutfit('runners', { // Hurdle Dash, Javelin Throw
  pip: [['headband', { col: '#fff', stripe: 'own' }], ['shirt', { col: '#fff', top: -8, number: 1, numCol: '#2b2840', side: 'own' }]],
  bo: [['headband', { col: '#fff', stripe: 'own' }], ['shirt', { col: '#fff', top: -8, number: 2, numCol: '#2b2840', side: 'own' }]],
});

/* ---------- World 12 Winter Games ---------- */
defineOutfit('curlers', { // Curling
  pip: [['beanie', { col: '#c8202a', trim: '#fff', stripe: '#fff', pom: '#fff' }], ['shirt', { col: '#c8202a', top: -8, stripes: '#fff' }]],
  bo: [['beanie', { col: '#2b3a8a', trim: '#fff', stripe: '#fff', pom: '#fff' }], ['shirt', { col: '#2b3a8a', top: -8, stripes: '#fff' }]],
});
defineOutfit('sledders', { // Bobsled, Ski Jump
  pip: [['helmet', { col: '#c8202a', stripe: '#fff' }], ['goggles', { ski: true, frame: '#2b2840', lens: 'rgba(255,190,80,0.6)' }]],
  bo: [['helmet', { col: '#2b3a8a', stripe: '#fff' }], ['goggles', { ski: true, frame: '#2b2840', lens: 'rgba(140,220,255,0.6)' }]],
});
defineOutfit('hockey', { // Ice Hockey
  pip: [['helmet', { col: '#fff', stripe: 'own' }], ['cage', {}], ['shirt', { col: 'own', top: -9, stripes: '#fff', number: 9, numCol: '#fff' }]],
  bo: [['helmet', { col: '#2b2840', stripe: 'own' }], ['cage', {}], ['shirt', { col: 'own', top: -9, stripes: '#fff', number: 4, numCol: '#fff' }]],
});

/* ---------- World 13 Spooky Hollow: Halloween costumes ---------- */
defineOutfit('halloween', {
  pip: [['wizard', { witch: true, col: '#3a2a5a', band: '#7dffb0', buckle: true, stars: false }], ['cape', { col: '#3a2a5a', lining: '#7dffb0', len: 0.9 }]],
  bo: [['pumpkinhat', {}], ['cape', { col: '#1c1a36', lining: '#c8202a' }], ['bowtie', { col: '#ff8a1e' }]],
});
defineOutfit('ghosthunters', { // Haunted Mansion
  pip: [['goggles', { up: true, frame: '#2b2840', lens: 'rgba(125,255,176,0.6)' }], ['shirt', { col: '#c8b080', top: -8, belt: '#5a3418' }], ['tank', { col: '#c9d0da' }]],
  bo: [['cap', { col: '#3fbf6a', peak: '#2b2840' }], ['shirt', { col: '#c8b080', top: -8, belt: '#5a3418' }], ['tank', { col: '#c9d0da' }]],
});

/* ---------- World 14 Dino Valley: an explorer and a kid in a dino suit ---------- */
defineOutfit('dinos', {
  pip: [['pith', {}], ['backpack', { col: '#8a5a32', roll: '#3fbf6a' }], ['neckerchief', { col: '#3fbf6a' }]],
  bo: [['dinohood', { col: '#5cc27f' }], ['tail', { col: '#5cc27f', spikes: '#ffc53d' }]],
});

/* ---------- World 15 Orbit Outpost: space suits ---------- */
defineOutfit('space', {
  pip: [['spacesuit', { stripe: 'own' }], ['spacehelmet', { ring: '#e8eef8', light: '#ff5a5a' }], ['tank', { col: '#e8eef8', jet: true, flame: false }]],
  bo: [['spacesuit', { stripe: 'own' }], ['spacehelmet', { ring: '#e8eef8', light: '#5bd0ff' }], ['tank', { col: '#e8eef8', jet: true, flame: false }]],
});

defineOutfit('space-nohat', { from: 'space', noHats: true }); // Tethered Spacewalk and Moon Buggy Crew draw their own bubble helmets

/* ---------- World 16 Sugar Rush Factory ---------- */
defineOutfit('candy', {
  pip: [['chef', { band: '#ff8fc7' }], ['apron', { col: '#fff', trim: '#ff8fc7', pocket: '#ff8fc7' }]],
  bo: [['cap', { col: '#fff', peak: '#ff8fc7', trim: '#ff8fc7' }], ['apron', { col: '#ffe0f0', trim: '#e8483a', stain: '#8a5a32' }]],
});
defineOutfit('candyraft', { // Chocolate River Raft
  from: 'candy', pip: [['chef', { band: '#ff8fc7' }], ['lifevest', { col: '#ff8fc7' }]],
  bo: [['cap', { col: '#fff', peak: '#ff8fc7', trim: '#ff8fc7' }], ['lifevest', { col: '#ffd23f' }]],
});
defineOutfit('sprinkles', { // Sprinkle Catch (versus)
  pip: [['party', { col: '#ff8fc7', stripe: '#fff', pom: '#ffd23f' }], ['bib', { col: '#fff', check: '#ff8fc7' }]],
  bo: [['party', { col: '#7dd8ff', stripe: '#fff', pom: '#ff8fc7' }], ['bib', { col: '#fff', check: '#7dd8ff' }]],
});

/* ---------- World 17 Jungle Jamboree ---------- */
defineOutfit('jungle', {
  pip: [['pith', { col: '#d6c290', band: '#3fbf6a' }], ['vest', { col: '#a88a50' }], ['backpack', { col: '#6a8a3a' }]],
  bo: [['feather', { cols: ['#e8483a', '#ffd23f', '#3fbf6a'] }], ['vest', { col: '#8a6a3a' }], ['belt', { col: '#5a3418', pouch: '#8a5a32' }]],
});
defineOutfit('canoe', { // River Rapids Canoe
  pip: [['pith', { col: '#d6c290', band: '#3fbf6a' }], ['lifevest', { col: '#ff7a1e' }]],
  bo: [['feather', { cols: ['#e8483a', '#ffd23f', '#3fbf6a'] }], ['lifevest', { col: '#ffd23f' }]],
});

/* ---------- World 18 Pirate Cove ---------- */
defineOutfit('pirates', {
  pip: [['tricorn', { col: '#2b2840', trim: '#ffc53d', feather: '#e8483a' }], ['sash', { col: '#c8202a', knot: true }], ['belt', { col: '#5a3418' }]],
  bo: [['bandana', { col: '#c8202a', dots: '#fff' }], ['shirt', { col: '#fff', top: -9, stripes: '#2f5fc4' }]],
});
defineOutfit('pirates-nohat', { from: 'pirates', noHats: true }); // Runaway Ship draws captain and deckhand hats itself

/* ---------- World 19 Tumbleweed Gulch ---------- */
defineOutfit('cowboys', {
  pip: [['cowboy', { col: '#b07a44', band: '#5a2e16' }], ['neckerchief', { col: '#e8483a', dots: '#fff' }], ['vest', { col: '#8a5a32', star: true }]],
  bo: [['cowboy', { col: '#4a3a3a', band: '#c8a050' }], ['neckerchief', { col: '#ffd23f' }], ['belt', { col: '#5a3418', buckle: '#ffd23f' }]],
});
defineOutfit('railroaders', { // Handcar Hustle
  pip: [['captain', { col: '#2b3a6b', band: '#2b3a6b', peak: '#1c1a36', badge: '#ffd23f' }], ['overalls', { col: '#6a4a2a' }], ['neckerchief', { col: '#e8483a' }]],
  bo: [['flatcap', { col: '#4a6aa8' }], ['overalls', { col: '#4a6aa8' }], ['neckerchief', { col: '#ffd23f' }]],
});
defineOutfit('cowboys-nohat', { from: 'cowboys', noHats: true }); // Gold Mine Cart: its own cowboy hats fly off on a bonk

/* ---------- World 20 Dragon Peak (boss): knights ---------- */
defineOutfit('dragonknights', {
  pip: [['knight', { plume: '#ffd23f' }], ['armor', { emblem: 'own', mail: true }], ['cape', { col: '#c8202a', len: 0.8 }]],
  bo: [['knight', { plume: '#5bd0ff', col: '#e0c070' }], ['armor', { col: '#e0c070', emblem: 'own' }], ['cape', { col: '#2b3a8a', len: 0.8 }]],
});

/* ---------- World 21 Sky Kingdom: aviators ---------- */
defineOutfit('aviators', {
  pip: [['pilotcap', { col: '#8a5a32', lens: '#9fe0ff' }], ['scarf', { col: '#fff' }]],
  bo: [['pilotcap', { col: '#5a3a24', lens: '#ffd88a' }], ['scarf', { col: '#e8483a' }]],
});

/* ---------- World 22 Coral Deep: divers ---------- */
defineOutfit('scuba', {
  pip: [['divemask', { frame: '#ffc53d', snorkel: '#ff6b4a' }], ['shirt', { col: '#1c2a4a', top: -6, side: 'own' }], ['tank', { col: '#ffc53d' }]],
  bo: [['divemask', { frame: '#7dffb0', snorkel: '#ffd23f' }], ['shirt', { col: '#1c2a4a', top: -6, side: 'own' }], ['tank', { col: '#e8eef8' }]],
});

defineOutfit('scuba-nohat', { from: 'scuba', noHats: true }); // Treasure Diver Rope: the diver wears the level's brass helmet

/* ---------- World 23 Barnyard Fair ---------- */
defineOutfit('farmers', {
  pip: [['sunhat', { col: '#f2d07a', band: '#e8483a' }], ['overalls', { col: '#8a5a32' }]],
  bo: [['cap', { col: '#e8483a', peak: '#e8483a', trim: '#fff' }], ['overalls', { col: '#6a8a3a' }], ['neckerchief', { col: '#ffd23f' }]],
});
defineOutfit('hotdogs', { // Hot Dog Stand Rush
  pip: [['cap', { col: '#e8483a', peak: '#ffd23f', letter: '★', letterCol: '#ffd23f' }], ['apron', { col: '#fff', trim: '#e8483a', stain: '#ffc53d' }]],
  bo: [['visor', { col: '#ffd23f', band: '#e8483a' }], ['apron', { col: '#fff', trim: '#ffd23f', stain: '#e8483a' }]],
});
defineOutfit('pieeaters', { // Pie-Eating Contest: the level ties its own paper bibs on, so just hats
  pip: [['sunhat', { col: '#f2d07a', band: '#e8483a' }]],
  bo: [['cap', { col: '#e8483a', peak: '#e8483a', trim: '#fff' }]],
});

/* ---------- World 24 Toy Box Town ---------- */
defineOutfit('toys', {
  pip: [['propeller', {}], ['overalls', { col: '#ffd23f', button: '#e8483a' }]],
  bo: [['tophat', { col: '#c8202a', band: '#ffd23f', tall: 9 }], ['shirt', { col: '#2b3a8a', top: -9, belt: '#fff' }], ['buttons', { col: '#ffd23f' }]],
});
defineOutfit('pyjamas', { // Pillow Fort Battle
  pip: [['nightcap', { col: '#b28dff', stripe: '#fff', pom: '#ffd23f' }], ['shirt', { col: '#b28dff', top: -9, stripes: '#fff' }]],
  bo: [['nightcap', { col: '#7dd89f', stripe: '#fff', pom: '#fff' }], ['shirt', { col: '#7dd89f', top: -9, stripes: '#fff' }]],
});
defineOutfit('trainride', { // Wind-Up Train Ride
  pip: [['captain', { col: '#2b3a8a', band: '#2b3a8a', peak: '#1c1a36' }], ['overalls', { col: '#c8202a', button: '#ffd23f' }]],
  bo: [['propeller', { cols: ['#ff8fc7', '#7dd89f', '#ffd23f', '#b28dff'] }], ['overalls', { col: '#ffd23f', button: '#e8483a' }]],
});

/* ---------- World 25 Zombie Acres: home-made armour ---------- */
defineOutfit('zombiefort', {
  pip: [['helmet', { col: '#3fbf6a', stripe: '#fff', visor: '#2b2840' }], ['shirt', { col: '#6a8a3a', top: -8, belt: '#5a3418' }], ['belt', { col: '#5a3418', pouch: '#8a5a32' }]],
  bo: [['saucepan', {}], ['overalls', { col: '#6a5a4a' }], ['neckerchief', { col: '#e8483a' }]],
});

/* ---------- World 26 Circus Big Top ---------- */
defineOutfit('acrobats', { // Trapeze Catch: spangled leotards in their own colours
  pip: [['headband', { col: '#ffd23f' }], ['shirt', { col: 'own', top: -9, emblem: '#ffd23f', side: '#ffd23f' }]],
  bo: [['headband', { col: '#ffd23f' }], ['shirt', { col: 'own', top: -9, emblem: '#ffd23f', side: '#ffd23f' }]],
});
defineOutfit('clowns', { // Clown Car Getaway, Stilt Race
  pip: [['clownwig', { col: '#7dd89f', hat: '#2b2840' }], ['clownnose', {}], ['ruff', { cols: ['#ffd23f', '#7dd89f'] }]],
  bo: [['clownwig', { col: '#ff8fc7', hat: '#c8202a' }], ['clownnose', {}], ['ruff', { cols: ['#ffd23f', '#ff8fc7'] }]],
});
defineOutfit('cannonball', { // Human Cannonball Tour: the level gives the flier a helmet, so capes and belts
  pip: [['cape', { col: '#c8202a', lining: '#ffd23f' }], ['belt', { col: '#ffd23f', buckle: '#c8202a' }]],
  bo: [['cape', { col: '#2b3a8a', lining: '#ffd23f' }], ['belt', { col: '#ffd23f', buckle: '#2b3a8a' }]],
});

/* ---------- World 27 Robot Factory ---------- */
defineOutfit('factory', {
  pip: [['hardhat', { col: '#ffc53d' }], ['goggles', { up: false, frame: '#2b2840', lens: 'rgba(125,255,176,0.35)' }], ['overalls', { col: '#5a6a7a', button: '#ffc53d' }]],
  bo: [['antenna', { col: '#7dffb0' }], ['vest', { col: '#d6ff3a' }], ['belt', { col: '#5a6a7a', buckle: '#c9d0da', pouch: '#5a6a7a' }]],
});

/* ---------- World 28 Pyramid Sands ---------- */
defineOutfit('pyramid', {
  pip: [['pith', {}], ['vest', { col: '#c8b080' }], ['backpack', { col: '#8a5a32', roll: '#e8483a' }]],
  bo: [['nemes', { col: '#ffc53d', stripe: '#2f5fc4' }], ['belt', { col: '#ffc53d', buckle: '#2fbf9f' }]],
});
defineOutfit('camelriders', { // Camel Race
  pip: [['turban', { col: '#fff', gem: '#e8483a' }], ['sash', { col: '#e8483a' }]],
  bo: [['turban', { col: '#f2d07a', gem: '#2fbf9f' }], ['sash', { col: '#2fbf9f' }]],
});

/* ---------- World 29 Ninja Dojo ---------- */
defineOutfit('ninjas', {
  pip: [['ninjahood', { col: '#2b2840' }], ['headband', { col: '#c8202a', tails: true, layer: 'head' }], ['quiver', { sword: true, grip: '#c8202a' }], ['belt', { col: '#c8202a', buckle: '#c8202a', y: -4 }]],
  bo: [['ninjahood', { col: '#2b2840' }], ['headband', { col: '#ffd23f', tails: true, layer: 'head' }], ['quiver', { sword: true, grip: '#ffd23f' }], ['belt', { col: '#ffd23f', buckle: '#ffd23f', y: -4 }]],
});

defineOutfit('ninjas-nohat', { from: 'ninjas', noHats: true }); // World 29's levels tie their own headbands on

/* ---------- World 30 Time Chase (boss): a lab-coat look, and clothes for each era (time-thief.js calls setOutfit) ---------- */
defineOutfit('timetravellers', {
  pip: [['goggles', { up: true, frame: '#8a5a32', lens: 'rgba(255,200,120,0.6)' }], ['labcoat', { pen: '#e8483a' }]],
  bo: [['goggles', { up: true, frame: '#8a5a32', lens: 'rgba(150,230,255,0.6)' }], ['labcoat', { pen: '#3fbf6a' }], ['tank', { col: '#c9d0da' }]],
});
defineOutfit('stoneage', { // Stonehenge
  pip: [['flowers', { cols: ['#fff', '#ffd23f', '#b28dff'] }], ['cavefur', { col: '#c8a070', spots: '#7a4a1a' }]],
  bo: [['headband', { col: '#9a7a5a', stripe: '#f4ead0' }], ['cavefur', { col: '#e8d8b0', spots: '#9a7a5a' }]],
});
defineOutfit('greeks', { // The Fall of Troy
  pip: [['greek', { col: '#d6a845', crest: '#e8483a' }], ['tunic', { col: '#f6efdf', belt: '#8a5a32' }]],
  bo: [['greek', { col: '#c9d0da', crest: '#ffd23f' }], ['tunic', { col: '#f6efdf', belt: '#8a5a32' }]],
});
defineOutfit('renaissance', { // Leonardo's Flying Machine
  pip: [['beret', { col: '#8a2a5a' }], ['tunic', { col: '#c8a46a', belt: '#5a3418' }]],
  bo: [['beret', { col: '#2b3a8a' }], ['scarf', { col: '#c8a46a' }]],
});
const TTH_OUTFITS = { dino: 'iceage', henge: 'stoneage', troy: 'greeks', olympics: 'romans', vikings: 'vikings', davinci: 'renaissance',
  wright: 'aviators', moon: 'space', finale: 'timetravellers', race: 'timetravellers' };

/* ---------- World 31 Shrunk in the Backyard ---------- */
defineOutfit('shrunk', {
  pip: [['acorn', {}], ['backpack', { col: '#7a9a3a' }]],
  bo: [['thimble', {}], ['belt', { col: '#5a3418', pouch: '#8a5a32' }]],
});
defineOutfit('jockeys', { // Snail Race
  pip: [['helmet', { col: '#fff', stripe: 'own', visor: 'own' }], ['shirt', { col: '#ffd23f', top: -9, stripes: 'own' }]],
  bo: [['helmet', { col: '#fff', stripe: 'own', visor: 'own' }], ['shirt', { col: '#fff', top: -9, stripes: 'own' }]],
});

/* ---------- Worlds 32-35: their levels already dress Pip and Bo (32 superhero suits, 33 storm-chaser raincoats and
   hoods, 34 Viking helmets, 35 wizard robes), so they declare no outfit. ---------- */

/* ---------- Viking clothes (the Time Thief's Viking era; World 34's levels draw their own) ---------- */
defineOutfit('vikings', {
  pip: [['viking', { col: '#9aa3ad', horn: '#f4ead0' }], ['furtrim', { col: '#d8c4a0', under: '#8a5a32', belt: '#5a3418' }]],
  bo: [['viking', { col: '#b07a44', horn: '#f4ead0', braids: '#ffd23f', trim: '#9aa3ad' }], ['furtrim', { col: '#f4ead0', under: '#6a4a2a', belt: '#5a3418' }]],
});


/* ---------- which level wears what ---------- */
Object.assign(OUTFIT_BY_LEVEL, {
  'Brick by Brick': 'builders', 'Sky Tower': 'builders', 'Crown Keep': 'royals',
  'Tee for Two': 'golf', 'Bounce House': 'golf', 'Windmill Way': 'golf', 'Portal Park': 'golf',
  'King of the Hill': 'wrestlers', 'Snowball Fight': 'snowday', 'Hot Potato Volleyball': 'beach', 'Paint the Floor': 'painters',
  'Two-Seat Car': 'roadtrip', 'Pizza Delivery': 'pizza', 'Ice Slide': 'icetrip', 'Rising Lava': 'firefighters',
  'Monster Feeding': 'chefs', 'Tug of War': 'tugteam', 'Train Tracks': 'railway',
  'Cannon Crew': 'knights', 'Seesaw Climb': 'knights', 'Laser Vault': 'burglars',
  'Roulette Wheel': 'casino', 'Slot Machine Run': 'casino', 'Coin Pusher': 'casino',
  'Pompeii Escape': 'romans', 'San Francisco 1906 Quake': 'frisco', 'Ice Age Glacier': 'iceage', 'Krakatoa Ash Run': 'explorers1883',
  'The Grand Collector': 'vaultheroes',
  'Synchro Diving': 'divers', 'Tandem Velodrome': 'cyclists', 'Hurdle Dash': 'runners', 'Javelin Throw': 'runners',
  'Curling': 'curlers', 'Bobsled': 'sledders', 'Ski Jump': 'sledders', 'Ice Hockey': 'hockey',
  'Pumpkin Patch Roll': 'halloween', 'Graveyard Bone Hunt': 'halloween', 'Haunted Mansion': 'ghosthunters',
  'Egg Rescue': 'dinos', 'Pterodactyl Express': 'dinos', 'Tar Pit Pull': 'dinos',
  'Tethered Spacewalk': 'space-nohat', 'Gravity Flip Station': 'space', 'Moon Buggy Crew': 'space-nohat',
  'Conveyor Belt Chaos': 'candy', 'Gumball Machine Puzzle': 'candy', 'Chocolate River Raft': 'candyraft', 'Sprinkle Catch': 'sprinkles',
  'Temple Doors': 'jungle', 'River Rapids Canoe': 'canoe', 'Waterfall Climb': 'jungle', 'Vine Swing': 'jungle',
  'Runaway Ship': 'pirates-nohat', 'Tide Pool Dig': 'pirates',
  'Train Heist Hop': 'cowboys', 'Handcar Hustle': 'railroaders', 'Gold Mine Cart': 'cowboys-nohat',
  'Volcano Dragon': 'dragonknights',
  'Hot Air Balloon Climb': 'aviators', 'Kite Tandem': 'aviators', 'Cloud Bridge Builder': 'aviators',
  'Submarine Duo': 'scuba', 'Treasure Diver Rope': 'scuba-nohat', 'Shipwreck Lights': 'scuba',
  'Tractor & Trailer': 'farmers', 'Runaway Pigs': 'farmers', 'Hot Dog Stand Rush': 'hotdogs', 'Pie-Eating Contest': 'pieeaters',
  'Wind-Up Train Ride': 'trainride', 'Jack-in-the-Box Launch': 'toys', 'Slinky Stairs': 'toys', 'Pillow Fort Battle': 'pyjamas',
  'Defend the Heart': 'zombiefort',
  'Trapeze Catch': 'acrobats', 'Clown Car Getaway': 'clowns', 'Human Cannonball Tour': 'cannonball', 'Stilt Race': 'clowns',
  'Mech Suit Duo': 'factory', 'Runaway Assembly Line': 'factory', 'Magnet Crane Crew': 'factory', 'Robot Rumble': 'factory',
  'Rolling Boulder Run': 'pyramid', 'Tomb Torch Explorers': 'pyramid', 'Sliding Stone Puzzle': 'pyramid', 'Camel Race': 'camelriders',
  'Rooftop Moonlight Run': 'ninjas-nohat', 'Shadow Sneak': 'ninjas-nohat', 'Runaway Rickshaw': 'ninjas-nohat', 'Throwing Star Duel': 'ninjas-nohat',
  'The Time Thief': 'iceage', // (its first era; in the level each era sets its own, TTH_OUTFITS)
  'Lawnmower Escape': 'shrunk', 'Ant Hill Heist': 'shrunk', 'Bird Attack Dash': 'shrunk', 'Snail Race': 'jockeys',
  // levels that draw Pip and Bo their own way, already dressed for the job (or as a ball, a chip, a paddle, a car): none
  'Robo Pong': 'none', 'Sumo Bounce': 'none', 'Bumper Cars': 'none', 'Plinko Drop': 'none', 'Broomstick Race': 'none',
  'Raptor Race': 'none', 'Planet Hop Race': 'none', 'Grapple & Zip': 'none', 'Plank Duel': 'none', 'Quick-Draw Showdown': 'none',
  'Paper Plane Race': 'none', 'Dolphin Race': 'none',
});

/* ---------- each world's look (the title screen's run through the worlds, and any level not named above) ---------- */
Object.assign(OUTFIT_BY_WORLD, {
  1: 'builders', 2: 'golf', 3: 'wrestlers', 4: 'roadtrip', 5: 'chefs', 6: 'knights', 7: 'casino', 8: 'romans', 9: 'vaultheroes',
  10: 'runners', 11: 'curlers', 12: 'halloween', 13: 'dinos', 14: 'space', 15: 'candy', 16: 'jungle', 17: 'pirates', 18: 'cowboys',
  19: 'dragonknights', 20: 'aviators', 21: 'scuba', 22: 'farmers', 23: 'toys', 24: 'zombiefort', 25: 'clowns', 26: 'factory',
  27: 'pyramid', 28: 'ninjas', 29: 'timetravellers', 30: 'shrunk',
});
