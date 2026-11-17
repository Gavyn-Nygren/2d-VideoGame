# three.js 0.187.0 (MIT)

`three.min.js` is three.js **0.187.0** (https://threejs.org, licence in `LICENSE`), unchanged, built once into a
single classic script that sets the global `THREE`:

    npm pack three@0.187.0 && tar xzf three-0.187.0.tgz
    npx esbuild@0.25.0 package/build/three.module.js --bundle --format=iife --global-name=THREE \
      --minify --legal-comments=inline --target=es2020 --outfile=three.min.js

It is one classic script rather than the two ES module files because a module `import()` is blocked when
`index.html` is opened straight from disk (file://), and the game must keep working offline that way. The game
never loads it at start-up: `js/3d/k3d.js` adds it to the page the first time a 3D level is opened and keeps it as
`K3D.T`. Do not edit it; to update, rebuild it the same way with a new pinned version and check `node tools/k3d/check.js`.
