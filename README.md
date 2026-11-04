# Pip & Bo

A 2D local co-op game for two players on one screen, made for playing with friends and family. It's a run of short levels with a different twist each time. Most are teamwork, and a few are head-to-head.

**Play it now:** https://claude.ai/artifact/3KFgRXoujADJ9PMR1rTErY

## How to play

Download this repository (Code > Download ZIP), unzip it, and double-click `index.html`. It opens in any modern browser. Nothing to install. Keep the `css/` and `js/` folders next to `index.html`, because the game loads them.

| | Move / jump | Action |
|---|---|---|
| **Pip** (orange) | W A S D | F or E |
| **Bo** (blue) | Arrow keys | / or . or Enter |

- **Controllers:** Xbox and most other gamepads work. Action is X, RB or RT. If a controller isn't picked up in the online demo, download the game and open `index.html` straight from your computer.
- **Touch:** on-screen buttons show up on phones and tablets.
- **1 player:** on the title screen pick "1 player + computer", choose who you play, and the computer plays the other character: a teammate in team levels, your opponent in versus levels (Easy, Normal or Hard). You can use either set of keys.

## Worlds

1. **Sunny Meadow**: Hold the Door, Boost Me Up, Your Color My Color, Rope Chain & Bungee
2. **Block Party**: Brick by Brick, Sky Tower, Robo Pong, Crown Keep
3. **Fairway Fun** (golf, where your partner is the ball): Tee for Two, Bounce House, Windmill Way, Portal Park
4. **Rumble Park** (versus, best-of rounds): King of the Hill, Snowball Fight, Hot Potato Volleyball, Paint the Floor
5. **Road Trip**: Two-Seat Car, Pizza Delivery, Ice Slide, Rising Lava
6. **Backyard Bash**: Monster Feeding, Tug of War, Train Tracks, Sumo Bounce
7. **Castle Quest**: Cannon Crew, Seesaw Climb, Laser Vault, Bumper Cars
8. **Lucky Casino** (pretend tickets and chips): Plinko Drop, Roulette Wheel, Slot Machine Run, Coin Pusher
9. **Great Escapes** (famous natural disasters, kept cartoony): Pompeii Escape, San Francisco 1906 Quake, Ice Age Glacier, Krakatoa Ash Run
10. **Collector's Vault** (one big boss level): The Grand Collector

Design notes for anyone building new levels are in [GAME_NOTES.md](GAME_NOTES.md).

## How the code is organized

| File | What's in it |
|---|---|
| `index.html` | The page: top bar, game screen, touch buttons, and the list of scripts in load order |
| `css/style.css` | All styling |
| `js/core.js` | Shared constants, colors, themes, small helpers |
| `js/saving.js` | Best times and settings saved in the browser |
| `js/audio.js` | The sound effects engine |
| `js/player.js` | Pip and Bo: movement, collisions, jumping, stomps, respawns, and the cord between them |
| `js/versus.js` | Level-mode hooks and best-of rounds for versus levels (the game has no enemies; the robot in Robo Pong lives with its level) |
| `js/levels/level-list.js` | Every level's map, rules and hints, and the list of worlds |
| `js/levels/block-building.js`, `golf.js`, `robo-pong.js` | World 2 and 3 levels that need their own code |
| `js/levels/world4/` to `world12/` | One file per level, with its rules, sounds and drawing |
| `js/cpu/` | The computer player for 1-player mode: `cpu-core.js` (settings and the brain framework), `cpu-nav.js` (path finding), and one brain per level in `js/cpu/levels/` |
| `js/input.js` | Keyboard, controllers and touch buttons |
| `js/ui.js` | Menus, result cards, pause screen, controls legend, notices |
| `js/render.js` | Shared drawing: background, tiles, players, HUD, particles |
| `js/main.js` | The main loop: game state, loading levels, each game tick, finishing levels, screen sizing, startup |

The scripts are plain `<script src>` tags and share one set of names, so their order in `index.html` matters: a file can only use, while it loads, things from files above it. A new level gets its own file in `js/levels/worldN/` and a `<script>` tag after the other level files (before `js/cpu/`), plus a computer brain in `js/cpu/levels/worldN/`. `node tools/cpu-test.js` checks the computer can play every level.

## Building the single-file version

The online demo has to be one HTML file. To make it, run this from the repository folder (needs Node.js):

```
node tools/bundle.js
```

It writes `build/pip-and-bo.html`, with the CSS and every script put back inside one file. Don't edit that file; edit the files above and rebuild.
