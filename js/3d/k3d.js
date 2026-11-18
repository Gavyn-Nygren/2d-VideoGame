/* Pip & Bo - 3D levels: the loader and the always-there part of the 3D kit (K3D).

   World 41 is the first 3D world. A 3D level is still a MODES block on the fixed DT clock; it only draws in 3D.
   This file is small and is loaded with the game. Everything heavy is loaded the first time a 3D level is opened:
   three.js itself (js/3d/vendor/three.min.js, kept as K3D.T) and the drawing kit files in K3D.files. Worlds 1 to 40
   never download or run any of that, and never create a WebGL context.

   For a level:
     def.view3d = true            the level draws in 3D (canvas#game3d under canvas#game; see "Canvases" below)
     def.touch = 'stick'          touch players get a round thumb stick instead of the move bar
     MODES.<mode>.scene3d(K)      fills a fresh scene K (K3D.scene()) once per G.level: again for each room, after a lost
                                  context, or on the next frame after K3D.rebuild(). MODES.<mode>.scene3dOpts are its
                                  K3D.scene() options ({ bg, fov, near, far })
     MODES.<mode>.draw3d(K, dt)   moves meshes to match the game state, every drawn frame (not while paused)
     MODES.<mode>.drawTop()       as in 2D, draws flat things over the 3D picture (K3D.toScreen gives screen spots)
   Game rules stay in step() and must never read the renderer, the camera's smoothed position or wall-clock time:
   with K3D.noRender = true (the bot tests) the level must play exactly the same.

   Units: 1 unit = 1 tile = 30 px of the 2D game, Y is up. K3D.U = 30 converts PHYS (px) to units.

   Canvases: canvas#game3d sits under canvas#game in #stage at the same size. For a view3d level render() clears
   canvas#game to see-through and draws only the flat things on top (HUD, intro card, name tags, prompts, bubbles,
   toasts, 2D particles). For every other level canvas#game3d is hidden and nothing 3D runs.

   Loading: K3D.need() starts the download (the ready card calls it when a 3D level's card opens, and shows
   "Loading..." until K3D.state is 'ready'). If the library cannot load or WebGL is off, K3D.state is 'failed' and the
   ready card shows one plain card with a way back to the world map (js/controls.js).

   Always here (no three.js needed): K3D.moveDir(p) (screen-based movement for players and brains), K3D.heading
   (the camera's heading that moveDir turns stick input by), K3D.U, K3D.noRender, the flags below.
   After loading (js/3d/kit.js and friends): materials, ink outlines, painted textures, Pip and Bo models, 3D outfits,
   camera rigs, depth helpers, K3D.toScreen. Each of those files' header explains its part.
*/
'use strict';

const K3D = {
  T: null,               // three.js once loaded
  U: 30,                 // px per unit
  state: 'none',         // none | loading | ready | failed
  why: '',               // why it failed (for the console and the tools)
  noRender: false,       // the bot tests: no drawing at all, the level must play identically
  heading: 0,            // which way "up" walks: radians about Y, 0 = away is -Z. The level sets it in step() from game
                         // state (the heading its camera is steered to), never from the camera's smoothed picture
  // the drawing kit, loaded in this order after three.js (classic scripts sharing the game's globals)
  files: ['js/3d/kit.js', 'js/3d/heroes.js', 'js/3d/outfits3d.js', 'js/3d/cameras.js', 'js/3d/proof.js',
    'js/levels/world41/popup-kit.js', 'js/levels/world41/popup-outfits.js'],
  lib: 'js/3d/vendor/three.min.js',
  _p: null,
  // a level, room or page asks for 3D
  wants(def) { return !!(def && def.view3d); },
  // start loading (once); returns a promise that resolves to true when ready, false when it failed
  need() {
    if (this._p) return this._p;
    this.state = 'loading';
    const fail = why => { this.state = 'failed'; this.why = why; console.warn('3D unavailable: ' + why); return false; };
    if (!this.glOk()) { this._p = Promise.resolve(fail('WebGL is switched off or not supported')); return this._p; }
    const add = src => new Promise((res, rej) => {
      // the single-file build (tools/bundle.js) carries three.js as text (run here from a blob)
      const inline = window.__k3dInline && window.__k3dInline[src];
      const s = document.createElement('script');
      s.src = inline ? URL.createObjectURL(new Blob([inline], { type: 'text/javascript' })) : src;
      s.async = false;
      s.onload = () => res(); s.onerror = () => rej(new Error('could not load ' + src));
      document.head.appendChild(s);
    });
    this._p = (async () => {
      try {
        if (!window.THREE) await add(this.lib);
        if (!window.THREE || !window.THREE.WebGLRenderer) return fail('three.js did not load');
        this.T = window.THREE;
        // the single-file build carries the kit inside the game's own script as K3D.kitInline (run once, here)
        if (this.kitInline) { const k = this.kitInline; this.kitInline = null; k(); }
        else for (const f of this.files) await add(f);
        if (!this.kitReady) return fail('the 3D kit did not load');
        this.state = 'ready';
        return true;
      } catch (e) { return fail(e && e.message || String(e)); }
    })();
    return this._p;
  },
  // can this browser make a WebGL2 context at all? (asked once, on a throwaway canvas, only when a 3D level opens)
  glOk() {
    if (this._gl != null) return this._gl;
    if (window.__k3dNoGL) return (this._gl = false); // tools: pretend WebGL is off
    try {
      const c = document.createElement('canvas'), g = c.getContext('webgl2');
      this._gl = !!g;
      if (g) { const lose = g.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext(); }
    } catch (e) { this._gl = false; }
    return this._gl;
  },
  // is the level now on screen a 3D one?
  on() { return !!(G.level && G.level.def.view3d && G.mode !== 'title'); },
  fit() {},          // sizes canvas#game3d like canvas#game (js/3d/kit.js; fit() in js/main.js calls it)

  /* ---------- a 3D level on screen (render() calls these; nothing here runs for a 2D level) ---------- */
  _for: null,        // the G.level object the current scene was built for (a new room or a reload builds again)
  dirty: false,      // the 3D canvas was resized or cleared and needs one more picture even while paused
  // one drawn frame of a view3d level. Returns false while the kit is still loading (or failed), so render() can draw
  // a plain page under the ready card instead.
  frame(dt) {
    const L = G.level;
    if (this.noRender) return false;
    if (this.state === 'none') this.need();
    if (this.state !== 'ready') return false;
    if (this._for !== L) this.enter(L);
    if (!this.K) return false;
    this.show(true);
    if (this.lost) return true;
    // paused: the 3D picture holds still (only a resize draws it once more, unmoved)
    const still = G.mode === 'paused';
    if (!still) hook('draw3d', this.K, dt);
    if (!still || this.dirty) { this.draw(still ? 0 : dt); this.dirty = false; }
    return true;
  },
  // builds the level's scene: a fresh K3D.scene (the last one is freed), then the mode's scene3d(K) fills it
  enter(L) {
    this._for = L;
    const K = this.scene(Object.assign({}, G.lmode && G.lmode.scene3dOpts));
    hook('scene3d', K);
    this.dirty = true;
  },
  // back to a 2D level or the menus: free the scene and hide the 3D canvas (the renderer itself is kept for next time)
  leave() {
    if (!this._for && !this.K) return;
    this._for = null;
    if (this.free) this.free();
    if (this.show) this.show(false);
  },
  // a lost WebGL context that comes back: the kit clears its caches, then the scene is built again on the next frame
  rebuild() { this._for = null; },
  proofOn: false,    // the look-proof page (?k3dproof) is showing
  // the look-proof page: reachable only by the URL flag ?k3dproof (js/3d/proof.js)
  startProof() {
    this.proofOn = true; G.mode = 'k3dproof'; hideOverlay();
    window.K3D = this; // the shot tool reaches the kit by name (the single-file build keeps the game's names private)
    document.documentElement.classList.add('k3d-proof');
    this.need().then(ok => { if (ok) this.proof.start(); });
  },
  proofFrame(dt) {
    if (this.freeze) return; // the shot tool holds the last picture still while it takes a screenshot
    ctx.save();
    ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
    if (this.state === 'ready' && this.proof && this.proof.st) { this.proof.update(dt); this.draw(dt); this.proof.draw2d(); }
    else {
      ctx.fillStyle = '#2e2228'; ctx.fillRect(0, 0, W, H);
      text(this.state === 'failed' ? 'This world needs 3D graphics, which this device or browser has switched off.' : 'Loading\u2026', W / 2, H / 2, 22, '#f6efdf', 'center');
    }
    ctx.restore();
  },

  /* ---------- screen-based movement (no three.js needed) ----------
     K3D.moveDir(p) -> { x, z, s }: the direction a player is pushing in world space (x, z unit vector) and how hard
     (s, 0 to 1). Keyboard and the touch buttons give 8 directions; a controller stick or the touch thumb stick its
     true angle and strength (p.input.ax, p.input.ay, -1 to 1); a brain's answer may add ax / ay the same way.
     Up always means away from the viewer. While a direction is held, it keeps the camera heading it started with,
     so a turning camera never bends a straight walk; letting go (or changing direction) picks up the new heading. */
  moveDir(p) {
    const i = p.input || {};
    let ax = 0, ay = 0;
    if (i.ax || i.ay) { ax = i.ax || 0; ay = i.ay || 0; }
    else {
      ax = (i.right ? 1 : 0) - (i.left ? 1 : 0);
      ay = (i.down ? 1 : 0) - (i.up ? 1 : 0);
      if (ax && ay) { ax *= Math.SQRT1_2; ay *= Math.SQRT1_2; }
    }
    let s = Math.hypot(ax, ay);
    if (s < 0.2) { p.mvHold = null; return { x: 0, z: 0, s: 0 }; }
    if (s > 1) { ax /= s; ay /= s; s = 1; }
    // the heading this push started with: kept while the stick points the same way (within 25 degrees)
    const ang = Math.atan2(ay, ax), h = p.mvHold;
    if (!h || Math.abs(Math.atan2(Math.sin(ang - h.ang), Math.cos(ang - h.ang))) > 0.44) p.mvHold = { ang, heading: this.heading };
    const hd = p.mvHold.heading, c = Math.cos(hd), sn = Math.sin(hd);
    // screen right = (cos, 0, -sin) turned by the heading; screen up (ay < 0) = away from the viewer = (-sin, 0, -cos)
    const nx = ax / s, ny = ay / s;
    return { x: nx * c + ny * sn, z: -nx * sn + ny * c, s };
  },
};
