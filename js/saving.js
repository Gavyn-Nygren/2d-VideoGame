/* Pip & Bo - Saving: best times and settings kept in the browser (localStorage). */
'use strict';

const store = {
  get(k) { try { return JSON.parse(localStorage.getItem('pipbo:' + k)); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem('pipbo:' + k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
};
// best times and golf scores are kept by level name. Builds up to v5 kept them by level number, in this order,
// so an old record is read only where that number held the same level.
const OLD_RECORD_ORDER = ['Hold the Door', 'Boost Me Up', 'Your Color, My Color', 'Rope, Chain & Bungee', 'Brick by Brick',
  'Sky Tower', 'Robo Pong', 'Crown Keep', 'Tee for Two', 'Bounce House', 'Windmill Way', 'Portal Park', 'King of the Hill',
  'Snowball Fight', 'Hot Potato Volleyball', 'Paint the Floor', 'Two-Seat Car', 'Pizza Delivery', 'Ice Slide', 'Rising Lava'];
// a level whose course changed a lot keeps its records under a new name (`recordName`), so a best from the old course
// (Portal Park's short holes, before Nov 2026) can't stand forever
const recordName = i => LEVELS[i].recordName || LEVELS[i].name;
function levelRecord(kind, i) {
  const name = recordName(i), v = store.get(kind + ':' + name);
  if (v != null) return v;
  const old = OLD_RECORD_ORDER.indexOf(name);
  return old >= 0 ? store.get(kind + old) : null;
}

