/* Pip & Bo - 3D kit: the four camera rigs. One camera, steered by the game, always shows both players.
   No split screen and no camera buttons, ever.

   Each rig is a small object the level feeds every drawn frame:  rig.update(K, dt, targets)
     targets = [{ x, y, z }, ...]  everything that must stay in frame (both players, both pencil ends...)
   It moves K.camera smoothly, sets K.focus (what the photo pass keeps sharp) and K3D.heading (which way "up" walks).
   Smoothing only ever affects the picture: game rules never read the camera.

   K3D.cams.diorama({ pos, at })                         fixed, like a model on a shelf
   K3D.cams.follow({ pitch, heading, fov, min, max, ahead, lead })
       looks down at `pitch` degrees (default 50) along `heading` (radians, 0 = looking toward -Z); aims at the middle
       of the targets plus `ahead` (a world vector: look a little further along the route), and pulls back as the
       targets spread, from `min` to `max` distance. Change heading with rig.heading = ... (it turns smoothly).
   K3D.cams.rail({ path: [{ pos, at }, ...], fov })      travels a path by progress: rig.progress = 0..1
   K3D.cams.chase({ dist, height, fov })                 behind the players, looking along rig.dir ({ x, z })
   rig.snap() jumps straight to the wanted shot on the next update (a new page, a restart).
*/
'use strict';

(function () {
  const T = K3D.T;
  const v = (x, y, z) => new T.Vector3(x, y, z);
  // a smooth follow that never overshoots (critically damped, frame-rate independent)
  const ease = (cur, want, dt, k) => cur.lerp(want, 1 - Math.exp(-k * dt));
  function center(targets) {
    const c = v(0, 0, 0);
    if (!targets || !targets.length) return c;
    for (const t of targets) c.add(t);
    return c.multiplyScalar(1 / targets.length);
  }
  function aim(K, pos, at, fov, dt, rig) {
    const cam = K.camera;
    if (rig._snap || !rig._pos) { rig._pos = pos.clone(); rig._at = at.clone(); rig._snap = false; }
    else { ease(rig._pos, pos, dt, rig.k || 4); ease(rig._at, at, dt, rig.k || 4); }
    cam.position.copy(rig._pos); cam.lookAt(rig._at);
    if (fov && Math.abs(cam.fov - fov) > 0.01) { cam.fov = fov; cam.updateProjectionMatrix(); }
    K.focus.copy(rig._at);
    const d = rig._at.clone().sub(rig._pos);
    K3D.heading = Math.atan2(-d.x, -d.z);
    K.sunAt(rig._at, rig.shadowReach || 16);
  }
  K3D.cams = {
    diorama(o) {
      const rig = { kind: 'diorama', pos: v(...o.pos), at: v(...o.at), fov: o.fov || 30, k: 3,
        update(K, dt) { aim(K, this.pos, this.at, this.fov, dt, this); }, snap() { this._snap = true; } };
      return rig;
    },
    follow(o = {}) {
      const rig = { kind: 'follow', pitch: o.pitch || 50, heading: o.heading || 0, fov: o.fov || 24, min: o.min || 13, max: o.max || 26,
        ahead: o.ahead ? v(...o.ahead) : v(0, 0, 0), k: o.k || 3.2, _h: null,
        update(K, dt, targets) {
          const c = center(targets).add(this.ahead);
          // spread: how far the targets reach from the middle, measured across and along the view (aspect aware)
          let sx = 0, sz = 0;
          const hd = this._h == null ? this.heading : (this._h += Math.atan2(Math.sin(this.heading - this._h), Math.cos(this.heading - this._h)) * (1 - Math.exp(-2.5 * dt)));
          if (this._h == null) this._h = this.heading;
          const cx = Math.cos(hd), sn = Math.sin(hd);
          for (const t of targets || []) {
            const dx = t.x - c.x, dz = t.z - c.z;
            sx = Math.max(sx, Math.abs(dx * cx - dz * sn)); sz = Math.max(sz, Math.abs(dx * sn + dz * cx));
          }
          const asp = K.camera.aspect || 16 / 9, tf = Math.tan(this.fov * Math.PI / 360);
          const need = Math.max(sx / (tf * asp), sz * 1.6 / tf) * 1.25 + 4;
          const dist = clamp(need, this.min, this.max), p = this.pitch * Math.PI / 180;
          const back = v(sn, 0, cx).multiplyScalar(Math.cos(p) * dist); // the camera sits back toward +Z (turned by heading)
          const pos = c.clone().add(back).add(v(0, Math.sin(p) * dist, 0));
          aim(K, pos, c, this.fov, dt, this);
        }, snap() { this._snap = true; this._h = null; } };
      return rig;
    },
    rail(o) {
      const curveP = new T.CatmullRomCurve3(o.path.map(s => v(...s.pos))), curveA = new T.CatmullRomCurve3(o.path.map(s => v(...s.at)));
      const rig = { kind: 'rail', progress: 0, fov: o.fov || 26, k: 3,
        update(K, dt) { const t = clamp(this.progress, 0, 1); aim(K, curveP.getPoint(t), curveA.getPoint(t), this.fov, dt, this); },
        snap() { this._snap = true; } };
      return rig;
    },
    chase(o = {}) {
      const rig = { kind: 'chase', dist: o.dist || 9, height: o.height || 4.5, fov: o.fov || 34, dir: { x: 0, z: -1 }, k: 3,
        update(K, dt, targets) {
          const c = center(targets), d = v(this.dir.x, 0, this.dir.z).normalize();
          const pos = c.clone().addScaledVector(d, -this.dist).add(v(0, this.height, 0));
          aim(K, pos, c.clone().addScaledVector(d, 3).add(v(0, 0.6, 0)), this.fov, dt, this);
        }, snap() { this._snap = true; } };
      return rig;
    },
  };
})();
