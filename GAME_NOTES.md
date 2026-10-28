# Pip & Bo: game notes

Read this before building a new world, level or feature, then read the code files named under "How the game is built". Update this file in the same push whenever a design decision, level or convention changes.

Demo: https://claude.ai/artifact/5jJ7SJw7gwSttznxFP56TG

## Gavyn's standing decisions

- A 2D local co-op game for two players on one screen, for friends and family. Never repetitive: every level has its own twist.
- Mostly teamwork levels, a few head-to-head. Levels come in worlds of about 4, with codes like 2-3.
- Head-to-head levels are best of 3, 5 or 7 rounds. Every level lasts a few minutes.
- Gavyn picks the levels. Offer him a list of ideas and build the ones he chooses, with his rules. Keep his names (he kept "Castle Quest" over a suggested "Castle Capers").
- Keyboard, controller (Xbox mainly, others ideally) and touch must all work on every level.
- Family-friendly. World 8 uses pretend tickets and chips only: no money look, no betting, nothing that rewards risking your score. World 9's disasters stay cartoony: nobody gets hurt and nothing is scary.
- Publish each finished world to the same demo link, push it to this repo, and update the README world list.
- Build each new world or major feature in a fresh thread, briefed to read this file first.

## Controls

| | Move / jump | Action | Other |
|---|---|---|---|
| **Pip** (orange, player 0) | W A S D, Space also jumps | F or E | Esc pause, R restart, M mute |
| **Bo** (blue, player 1) | Arrow keys | / . , or Enter | |

- Controller: the first controller pressed plays Pip, the second plays Bo. A or B jumps; X, Y, RB or RT is the action; Start pauses; View on the title or pause card swaps players.
- Touch: ◀ ▶ ▲ ▼ for each player, plus a round action button in levels that use the action.
- The action button only exists in levels that set `def.act`. Its word changes per level (punch, honk, fire, bump...).

## Worlds and levels

Rules below are as built. "(Gavyn)" marks what he asked for himself.

### World 1: Sunny Meadow (team)
- **1-1 Hold the Door**: Button `a` opens gate `A` and button `b` builds bridge `X` over spikes, each only while someone stands on it. There is a button on both sides, so whoever crosses first holds it for the partner.
- **1-2 Boost Me Up**: Stand on your partner's head to reach ledges. A rider is carried and can jump again at the top of the carrier's jump. Key `k` unlocks the door. Also a gate button and a bridge button.
- **1-3 Your Color, My Color**: Orange `o` blocks hold only Pip and blue `u` blocks hold only Bo, so each carries the other over their colour. The flag needs both players (`flagNeedsBoth`).
- **1-4 Rope, Chain & Bungee**: Players are tied together (Gavyn). Three rooms, one cord each. Rope is slack (hold jump while dangling to climb). Chain is rigid (the standing player holds the other out, the hanger swings). Bungee is stretchy (jump while stretched to bounce higher). Partners pass through each other, and one fall respawns both.
- Team levels end when both players stand in the door `E` for 0.35 s (take the key first if there is one). A fall (spikes or off the bottom) respawns at the last flag `F` after 0.8 s. Falls are counted but add no time. Partners are solid (stand on heads, get carried) except in tether levels.

### World 2: Block Party (mixed)
- **2-1 Brick by Brick**: Reverse Tetris (Gavyn). The builder has no body and drops pieces (◀▶ move, jump rotates, ▼ drops fast). The climber climbs them to a flag 10 tiles up, then they swap (Gavyn). Timed, 2 rounds, Pip builds first. A piece stops above the climber instead of moving into them.
- **2-2 Sky Tower**: Build straight up a narrow shaft to a high ledge. Falling blocks can crush or trap the climber (Gavyn). 4 rounds so it lasts a few minutes. A squash, or 5 s trapped, costs +3 s and pops the climber out sideways, never higher than a step. Jump into a block twice to break it.
- **2-3 Robo Pong** (team vs the computer, first to 7, Gavyn's spec): Pip's paddle covers the top half and Bo's the bottom half (Pip W/S, Bo ↑/↓). Robo's paddle is 50% longer and covers its whole side. The ball speeds up 1% per paddle or wall hit, compounding, and resets each point (Gavyn first said 0.1%, then agreed to 1%). Every serve goes to Robo, which returns it gently. Bot-tuned so adult pairs win about 64-78%, parent and kid about 50%, two kids about 35-40%; games last 2-4.5 min. A loss offers Rematch or Next level.
- **2-4 Crown Keep** (versus, one 90 s game): First to hold the crown for 15 s in total wins, or most crown time at 90 s. Stomp the holder to steal it; the holder runs 10% slower. It was built before the best-of rule and has no rounds.

### World 3: Fairway Fun (team golf)
- Each level has 2 holes. Pip golfs hole 1 with Bo as the ball, then they swap (Gavyn). The golfer aims with ◀▶ and holds jump to charge a meter that rises and falls, then releases to swing (▼ cancels). The ball has a small in-flight boost bar (Gavyn): hold a direction to push, 0.4 s per shot. Water, spikes, off-screen or 14 s in flight = +1 stroke from the same spot. 10 strokes = pick up. Score is strokes against par.
- **3-1 Tee for Two** (par 3+4): Pond Hop over a wall and water to a raised green; Cave Run under or over a big rock past a spike pit.
- **3-2 Bounce House** (par 2+3): Bounce pads (Gavyn's idea) and bumpers. Spring Step rolls onto 5 springs; Boomerang uses an angled pad that throws the ball back.
- **3-3 Windmill Way** (par 2+3): Windmill sails bat the ball, so time the gap. One 3-sail mill, then twin mills spinning opposite ways.
- **3-4 Portal Park** (par 3+3): Portals keep the ball's speed. Warp Zone sends a putt out high on the left; Rabbit Hole drops the ball into a tunnel to the cup. No boost while the ball rolls.
- Holes were bot-tested so a decent player scores about par, there is no fixed-shot ace, and no lie is inescapable. Boost rings (`@`) exist in the engine but no hole uses one yet.

### World 4: Rumble Park (versus)
- **4-1 King of the Hill** (best of 5): Stand alone on the hilltop to fill your meter (both on top scores nothing). First to 10 s, or most at the 70 s bell; from 45 s hill time counts double. Boxing glove: tap = jab, hold = charge, power grows the longer you hold (Gavyn). Full charge at 1 s is a MEGA punch. Big hits knock time off the meter.
- **4-2 Snowball Fight** (best of 7): 4 hits make a snowman; at the 60 s bell, fewer hits taken wins. Tap = auto-aimed throw, hold = lob along a dotted arc, ▼ ducks and packs snow, action with empty hands catches. An avalanche from 35 s ends stalling; hiding in your fort over 7 s drops snow on you. A player 2+ rounds ahead starts with 1 snow on.
- **4-3 Hot Potato Volleyball** (best of 7): Hit a potato bomb back and forth; if it's on your side when the fuse runs out, you lose (Gavyn). The fuse (22-34 s) shows on the potato and in the HUD. Each landing costs 1 s, and lying on the sand burns it 3× faster. Tap = bump, hold = power shot, jump at the net = spike, ▼ + hit = set.
- **4-4 Paint the Floor** (best of 5): Walking paints the tiles; most tiles at the 45 s bell wins. Action = splat dive (bigger splash from higher, landing on a head makes them dizzy). Behind by 6%: Super Paint. With 12 s left a golden bucket drops near whoever trails.
- Whoever trails gets catch-up help, always shown in gold (Comeback Glove, bobble hats, Big Mitts, Super Paint). Round 1 is plain; later rounds rotate twists. A tied round replays; from the 2nd tie in a row the level's tiebreak or a sudden-death replay decides; after 4 ties in a row the match is called.

### World 5: Road Trip (team)
- **5-1 Two-Seat Car** (top-down): One player steers, the other does gas and brake/reverse (Gavyn). Action = honk. Seats swap every room. Park in the box to clear a room. A splash goes back to the last flag; a tow truck comes after 8 s stuck.
- **5-2 Pizza Delivery**: Both carry one tray of wobbly pizza boxes down a bumpy street (Gavyn). It only moves when both walk the same way; hop crates and duck awnings together. When a box teeters, both stop and hold the action (steady). Too few boxes restarts the room with a smaller order.
- **5-3 Ice Slide**: Each move slides you until something stops you, often your partner (Gavyn). On ice you can only hop straight up; snow is grippy. A head-on crash bounces both back. Hint arrows show after 60 s in a room.
- **5-4 Rising Lava**: Climb 4 floors ahead of rising lava; your buttons build steps only your partner can use (Gavyn). An ouch sends you back to the checkpoint and makes that floor's lava slower. Medals by time and ouches.
- 4 rooms per level. Failure is soft with automatic rescue. In Ice Slide and Rising Lava, hold ▼ for 1 s to go back.

### World 6: Backyard Bash (mixed)
- **6-1 Monster Feeding** (team): One throws food (hold and release), the other catches it in a basket and feeds the monster before it gets grumpy (Gavyn). 4 rooms, roles swap. A tantrum spills a nearby catcher's basket. Stars per room by tantrums.
- **6-2 Tug of War** (versus, best of 5, 60 s rounds): Mash to pull, power-ups fall in the middle (Gavyn). Every press tugs; a press on the drum beat heaves harder. Jump lets go of the rope to grab a falling crate; action at your rope end grabs it again. Mud spreads from 20 s so rounds always end.
- **6-3 Train Tracks** (team, top-down): One lays track ahead of a moving train, the other flips junction levers to route each passenger home (Gavyn). 4 rooms, roles swap. Nothing fails: the train waits at gaps, a wrong lever means a detour lap, and a gold bird helps when you're stuck.
- **6-4 Sumo Bounce** (versus, best of 7, 50 s rounds): Bouncy balls on a round mat over a pool; knock the other in (Gavyn). Action = boing dash (hold to charge), ▼ = squat heavy. The first splash pops your floatie, the second loses. The mat shrinks from 25 s; later rounds add twists, and round 7 is always Tiny Mat.

### World 7: Castle Quest (mixed)
- **7-1 Cannon Crew** (team): One loads the cannon (powder and a ball), the other aims and fires to knock down a castle (Gavyn). 4 castles, roles swap. Flags drop when the block under them breaks or moves. Stars by shots against par; after par + 3 shots the castle gets wobbly so every castle ends. The loader's action button shouts FIRE.
- **7-2 Seesaw Climb** (team): Land on the high end to launch your partner up the tower (Gavyn). Higher drop, higher flight; jump just as your partner lands for a SUPER launch. 4 floors, optional gems. A head jump off a standing partner is only a small hop, so there are no solo skips.
- **7-3 Laser Vault** (team): Only the lookout's lantern shows the hidden lasers (Gavyn); the lookout also flips fuse boxes that shut laser walls for 7-8 s while the runner jumps, ducks and sneaks to the treasure. 4 rooms, roles swap, ending in an alarm escape. Stars per room by zaps.
- **7-4 Bumper Cars** (versus, best of 7, 60 s rounds, top-down): Bump the other car into the moat (Gavyn). Action = boost. 2 flags each; a splash costs one. Driving off by yourself only teeters ("Phew!"). The floor crumbles from 30 s. 2+ rounds behind: a gold extra flag and a super boost.
- In seated roles that never jump (gunner, lookout), controller A also does the action.

### World 8: Lucky Casino (mixed)
- **8-1 Plinko Drop** (team): One player is the chip falling through the pegs, the other slides paddles that kick it toward the JACKPOT slot; roles swap every drop (Gavyn). 3 boards of 4 drops, no fail. Tickets by slot; each board gives 0-3 stars, and the level is scored by stars, not time (`noTime`). Gold Lucky paddles help after missed jackpots, but only when both players took part in the drop.
- **8-2 Roulette Wheel** (versus, best of 5): Stand on a spinning wheel, race to the colour the ball lands on and bump the other off it (Gavyn). Action = bump. At LOCK the player on the lit colour closest to the ball wins a chip. First to 3 chips wins the round.
- **8-3 Slot Machine Run** (team): Giant slot reels are platforms; the stopper stops them so the runner can jump across (Gavyn). The payline picture is the platform (BAR step, 7 tall step, bell step with tickets, cherry trampoline, lemon nothing). 6 rooms, roles swap.
- **8-4 Coin Pusher** (versus, best of 5, 60 s rounds): Drop coins onto a moving shelf to push the pile off your side for points (Gavyn). Grab coins from the fountain, then press the action standing on the glass on your colour (a low hop is fine; higher is refused). First to 32, or most at the bell. Bonus Cup = 2 points and a Big Shove on your side. Whoever is behind in rounds starts with 2 coins in their tube (Lucky start). The game pauses itself after 40 s with no input.
- Pretend tickets and chips only; coins are drawn as star tokens; no money or betting words (Gavyn). Gold catch-up help is named "Lucky ..." (Lucky paddles, Lucky chip, Lucky slow-mo, Lucky shove).

### World 9: Great Escapes (team)
Famous natural disasters from history, kept light and cartoony: nobody gets hurt, lava is a "Hot foot!", ash is fluffy, quakes rattle teacups. Gavyn picked the four levels and their order; the world name was Claude's pick. Each level has 4 rooms and a small history sign (79 AD, 1906, 1883, Ice Age).
- **9-1 Pompeii Escape**: Ash falls and lava creeps in; help each other climb the rooftops to the harbor boat (Gavyn). Action = help: stand at a roof edge and press it, an arm reaches down and pulls your partner up. Every teamwork wall is 4-5 tiles, so the first one up boosts off the partner's head (a head jump goes about 152 px and can't be cut short) and the last one up always needs the hand; on 5-tile walls you jump for the hand. Jobs swap at every wall (`def.leads` per room; 10 walls, each player the step 5 times), shown by "Climb up!" / "Be the step!" badges. The lava creeps sideways along the street, never closer than 56 px behind the rearmost player; walking back into it or into a pool is a hot foot: back to your own banner, the lava backs off and slows. Ash clumps with landing shadows make you sneeze (a small hop, never during teamwork). Set pieces: a wobbly column that tips into a bridge once you both stand on it (Room 2), a cart that rolls only when you both push (Room 4), and the ship that sails when you're both on deck. Gold help: Super boost (22 s stuck), Super stretch (3 missed reaches), Cool breeze (2nd hot foot). Medal by time and hot foots.
- **9-2 San Francisco 1906 Quake**: The ground cracks; hold up a wobbly bridge for each other to cross (Gavyn). Each crack has a plank worked from a crank on the OTHER street. The holder stands on the crank and holds the action (hold); left/right then balance a ball on a gauge over their head against the crosser's weight, sliding crates and the rumble. Too long in the red, or the ball at the end, is a gentle "Whoa!": the crosser slides back. Rumbles come in waves with a warning on the HUD seismograph, so patient crossers wait for the calm. Crossing is tiptoe speed whether walking or hopping, so jumping is never a shortcut, and the gate at the end opens only when every crossing is done. Roles swap every bridge (8 holds each). Rooms: Nob Hill, Cable Car Line (the holder pulls a cable car), Market Street (crates), The Ferry Building. Gold braces after 2 whoas on a plank (sooner for a holder who needed them before), gold cable for the cable car.
- **9-3 Ice Age Glacier**: Slide down a cracking glacier and swap who steers each time the ice splits (Gavyn). Both ride one ice floe on a scrolling run the mode draws itself. The steerer brakes (◀) for bump fields and pushes (▶) for big gaps, and picks the high or low shelf at forks (▲/▼); the hopper hops (▲) crevasses and ducks (▼) icicle arches. The floe cracks at each split: Pip steers rooms 1 and 3, Bo rooms 2 and 4. No action button. A missed gap is a snowball pop 460 px back; a bump at speed is a bonk spin. Mammo the mammoth packs and then bridges a gap only after tries both players took part in, so nobody is carried alone. 10 s with no input pauses the floe ("Brrr, chilly!"). Snowflakes x of 99; medal by bonks and flakes. The longest World 9 level (about 3-4.5 min).
- **9-4 Krakatoa Ash Run**: Ash hides the way; one clears a path with a fan, the other leads (Gavyn). Thick ash is drawn over the level. The fanner holds the action (fan) to blow a cone of ash away and blow off ash drifts; the leader follows the footprints, pulls levers (pull) that open bamboo gates and drop rope bridges for the fanner, and presses the action elsewhere to shout "This way!". At windsock gaps (7 tiles) only the fanner's gust carries the leader across (an updraft while over the gap, so a tap jump or walk-off floats too). Roles swap every room: Jungle Trail, Lava Rocks, Cliff Path, Beach to the Ship. Camps are checkpoints; hold ▼ 1 s to go back to camp. The act labels switch per role every room. Help: quick nudges at gaps and drifts, a parrot with hints, a gold Super gust after 2 misses at a gap, a gold Sea breeze when stuck. Lava is "Toasty toes!" here (9-1 says "Hot foot!").
- Every World 9 level was bot-tested on keyboard, a stubbed controller and touch (844x390 and 390x844), and with solo, idle and button-mashing bots: none can be cleared by one player, and none gets stuck. Bot times for a perfect pair: 9-1 about 50 s, 9-2 about 88 s, 9-3 about 172 s, 9-4 about 51 s; slower human-like bots take 2-4.5 min. Real playtests may show the medal limits need tuning.

## How the game is built

### Conventions for every level
- Fixed physics step `DT` = 1/120 s; canvas 960×540 with 30 px tiles (32×18). Maps are 18 rows of 32 characters with spawns `1` and `2`.
- Versus: `kind: 'versus'`, `match: { bestOf, roundTime }`. End a round with `matchRoundEnd(winner, reason)` (`-1` is a tie). Reasons are short, end in "!", and name who fell when it matters.
- Team: `kind: 'team'`, timed, ends at the door or with `levelClear()`. Falls are counted unless `noFalls: true`.
- Action: `def.act = { label }` (lowercase, 6 letters or fewer). `act.labels = [pip, bo]` gives each role its own word; `act.padGlyph` names another controller button. Modes read `p.pendingAct` (a fresh press) or `p.input.act` (held), never the keyboard directly.
- Every level has a short `tip` (about 100 characters; rooms can have their own). The intro card shows it with the action keys; the pause card shows the current room's tip.
- Results card: `stats()` returns about 4 tiles and 1-2 lines. A team level scored by something other than time sets `noTime: true` (no time record or Time tile).
- No leaks between levels: level state lives in `G.mst` (fresh on every `loadLevel`), and match levels reset per-round state in `resetRound`. Prefix every top-level name and `Sfx.extra` sound with the level's mode name.
- Mode map characters: `parseLevel` takes `1 2 a b c E k F * G T H J R L M O Q U V @` (and `w s X ^ = o u #`, plus any letter in `switches`) before a mode sees the grid, so pick other characters for your own markers (9-4 lost its first dock plank to `k`, the key).
- Per-role action words: `act.labels` is per player, so a level whose roles swap every room gives each room its own `act` (as 8-3 does) or updates the labels itself (9-4 rewrites the `[data-actlabel]` text when the room changes).
- Never rename a shipped level: records are saved in localStorage by level name (`pipbo:best:<name>`, `pipbo:golf:<name>`).
- Catch-up help is gold and announced, never hidden.

### Code map
The code is split into `css/` and `js/` files (the README has the same table). `index.html` loads the scripts in this order.

| File | What's in it |
|---|---|
| `index.html` | Markup: header legend, `#stage` with `canvas#game`, touch pads `#padPip` and `#padBo`, `#overlay` cards, `#toast`; script tags in load order |
| `css/style.css` | All styles |
| `js/core.js` | Constants (`T`, `DT`, `PHYS`), colours `C`, themes and `applyTheme`, helpers |
| `js/levels/level-list.js` | `LEVELS` (with a `/* ===== World N (` marker per world from 4 on) and `WORLDS` (`name`, `blurb`, `theme`) |
| `js/saving.js` | `store`, `levelRecord` |
| `js/audio.js` | `Sfx` (each level keeps its `Sfx.extra.*` sounds in its own file) |
| `js/player.js` | `makePlayer`, tile collision (`solidFor`), movement, tether rope/chain/bungee, stomp, `kill`/`respawn` |
| `js/levels/block-building.js`, `golf.js`, `robo-pong.js` | World 2-3 mechanics (`BUILD`, `GOLF`, `PONG`) and their drawing |
| `js/versus.js` | `MODES` registry, `hook`/`drawHook`, the best-of-N framework (`MATCH`, `matchRoundEnd`), `knock` |
| `js/levels/world4/` to `world9/` | One file per level: its `MODES.<name>` block, its own drawing and `Sfx.extra` sounds, e.g. `world7/bumper-cars.js` |
| `js/input.js` | Keyboard (`keys`, `BIND`), controllers (`Pads`, `readPad`), touch, `pollInput` |
| `js/ui.js` | Overlay cards (`showTitle`, `pause`, `showResult`, `showWorldDone`, `showFinal`, `armOverlay`), legend (`setLegend`, `setActUI`), toast, mute |
| `js/render.js` | Shared drawing (`render`, `drawHUD`, `drawIntro`) and particles |
| `js/main.js` | `G`, `parseLevel`, `roomDef`, `loadLevel`, `step`, `nextRoom`, `levelClear`, `frame`, `fit`, `window.__pipbo`, startup (loads last) |

- There is no wrapper function: all files share globals, so a file may use at load time only what the files above it define.
- New level: a new `js/levels/worldN/<slug>.js` with a `MODES.<name>` block (hooks: `setup` required; `resetRound`, `go`, `pre`, `step`, `draw`, `drawTop`, `hud`, `stats`, `timeUp`, `tiebreak`, `onKill`, `onRespawn`, `onStomp`, `room` optional), its def in `LEVELS` after its world's marker (`name`, `world` 0-based, `kind`, `mode`, `tip`, `map` or `rooms`), and a script tag after the last level file, before `js/input.js`. Level codes follow the order in `LEVELS`.
- New world: a `WORLDS` entry with a theme plus a marker at the end of `LEVELS`. A world with no levels stays hidden.

### Testing
- `window.__pipbo` exposes the game state and functions (`G`, `LEVELS`, `MODES`, `loadLevel`, `step`, `matchRoundEnd`, `pause`, and more) for bot tests.
- Bot tests run in headless Chromium with Playwright: set `G.manual = true`, write each player's input, and call `step(DT)`. Set `G.introT = 0` to skip the intro card. Controller tests stub `navigator.getGamepads`.
- Test every new level with a keyboard, a controller and touch, on desktop and phone sizes, and play it through to the results card.
- For refactors: `/mnt/project-files/pip-and-bo/refactor-tools/` (in the Claude project files) has a deterministic old-vs-new play-through (`harness.js` + `cmp.js`, run with `runall.sh`): fake clock, seeded random, every level, all three input types, comparing canvas, game state, menus, audio and saves.

### Publishing
- The demo is a claude.ai Artifact at https://claude.ai/artifact/5jJ7SJw7gwSttznxFP56TG. Always republish to that same link, never a new one.
- `node tools/bundle.js` (needs only Node) writes `build/pip-and-bo.html`, one self-contained file that is not committed. Publish that file. Like `index.html`, it is the page body without the outer html/head/body tags, which the publisher adds.
- Then push to `main` here and update the README's world list and this file.

## Open questions for Gavyn
- World 9 is called "Great Escapes" (Claude's pick). Keep it or rename it?
- Crown Keep (2-4) is one 90-second game, not best of 3/5/7. It was built before that rule. Should it become a best-of match?
- Boost rings exist in the golf engine but no hole uses them. Want a hole with rings?
