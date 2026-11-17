/* Pip & Bo - 3D kit: outfits for the 3D Pip and Bo.

   K3D.definePart3('name', (o, ctx) => Object3D)   a part: build() returns an Object3D placed in the point's space
       ctx = { id, col, dark, T, hero }; the part names its point with o.at or its own `at` (head, back, body, face,
       hand). The head point is the top middle of the body, body is 32% up the middle (scarves, collars), face the
       front at eye height, back the middle of the back.
   K3D.defineOutfit3('name', { pip: [['part', { opts }], ...], bo: [...] })
   K3D.dress(hero, 'name')                         puts an outfit on a K3D.hero (takes off the last one)
   The 2D rules hold (GAME_NOTES "Outfits"): Pip wears no blue, Bo no orange or red, different headgear, eyes and
   sprout and ears visible, most of the body in its own colour. A part can set `ctx.hero.userData.sproutLift` (Pip's
   sprout grows out of a hat) or `earsOut` (Bo's ears stay in front of a hat).
*/
'use strict';

(function () {
  const T = K3D.T;
  const PARTS3 = K3D.PARTS3 = {}, OUTFITS3 = K3D.OUTFITS3 = K3D.OUTFITS3 || {};
  K3D.definePart3 = function (name, def) { PARTS3[name] = typeof def === 'function' ? { build: def } : def; };
  K3D.defineOutfit3 = function (name, looks) { OUTFITS3[name] = looks; };
  K3D.dress = function (hero, name) {
    const u = hero.userData;
    for (const o of u.worn || []) o.parent && o.parent.remove(o);
    u.worn = []; u.sproutLift = 0;
    const of = OUTFITS3[name];
    const list = of && (of[u.id === 0 ? 'pip' : 'bo'] || of.both);
    if (!list) return;
    for (const [pn, opts] of list) {
      const part = PARTS3[pn];
      if (!part) { console.warn('3D outfit part missing: ' + pn); continue; }
      const o = Object.assign({}, part.opts || {}, opts || {});
      const ctx = { id: u.id, col: PCOL[u.id], dark: PDARK[u.id], T, hero };
      const obj = part.build(o, ctx);
      const at = u.points[o.at || part.at || 'head'];
      at.add(obj); u.worn.push(obj);
      // drawn with the hero, after the see-through silhouettes (K3D.seeThrough), so a hat never gets a ghost over it
      obj.traverse(m => { if (m.isMesh) m.renderOrder = 10; });
    }
    if (u.sprout) u.sprout.position.y = K3D.HERO.h - 0.02 + (u.sproutLift || 0);
  };
})();
