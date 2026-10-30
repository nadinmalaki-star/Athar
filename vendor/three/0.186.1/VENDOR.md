# three.js 0.186.1 (self-hosted, pinned)

Source: npm package `three@0.186.1`
- tarball integrity: `sha512-blFeqb49wRCSGUGj7gtpfnSGHy2lwDk94RhUmS1c/hTby70kvChbWpkJ4Pm1390LqzzvTmzgXKHPEafJwCb8jA==`
- `build/three.core.js`   sha256 `9edde002b066a9a05676a6127f67735b62baf399bdea529f2f7e31657da769e6`
- `build/three.module.js` sha256 `9052042d676cb0fdc1ddfefe193053f34b7ac0513a616fdac4535d49987812ea`

This release ships no `.min` builds. The files here are a one-time
minification of those exact sources (no bundling, no tree-shaking):

    terser@5.51.2  <file>.js --module --compress passes=2 --mangle --format comments=/@license/

then the single import specifier in `three.module.min.js` was changed from
`./three.core.js` to `./three.core.min.js`.

- `three.core.min.js`   sha256 `552991236baeed9d73fe67de835a21abb207c6b968d41fe21940ae4a09760767`
- `three.module.min.js` sha256 `f2619e5aa6701708485fa2632c20c46789b213308274f6de2ed3837d8f859677`

Loaded only through the import map entry `three`, only when a scene needs
WebGL, never for Tier S. Versioned path: never edit in place — a new
release goes in a new folder (see sw.js versioning convention).

License: MIT (see LICENSE).

## addons/ (added for VERA Clinic's "The Unseen Visit" 3D scene)

Same `three@0.186.1` npm package, `examples/jsm/` subtree, fetched and
minified the same way (`terser@5.51.2 <file>.js --module --compress
passes=2 --mangle --format comments=/@license/`), with one manual edit:
`GLTFLoader.min.js`'s two relative imports were repointed from
`../utils/{Buffer...,Skeleton...}Utils.js` to the `.min.js` filenames,
mirroring how `three.module.min.js` itself was patched above.

- `examples/jsm/loaders/GLTFLoader.js` sha256 `131c0f78c01d19368ae495caa65b3adaa10487810a36a05bb5901b769a35ac16`
  → `addons/loaders/GLTFLoader.min.js` sha256 `81b3ccc73fde84f47ddc4d593cc0b57fb2e37b3b025aae54bc7249a905962f8b`
- `examples/jsm/utils/BufferGeometryUtils.js` sha256 `9fb63427ce6641fa14fd0baff9cc4d1b5f9c3d85fd084bf2e90e803c44ec1797`
  → `addons/utils/BufferGeometryUtils.min.js` sha256 `1efb3d43406fe608bf3b78945a4100ce96072b08b208d84cd25f5ebde8d68fd3`
- `examples/jsm/utils/SkeletonUtils.js` sha256 `b1632a703206c3d830de9fcbe515696770d04b71a15ee6b50afa6d2c3298c86f`
  → `addons/utils/SkeletonUtils.min.js` sha256 `b7a5b6709e7e74b39bebd43465a7d48c205a1c4d42bade522b5fbff5b7f00703`

Loaded via an import map prefix entry (`"three/addons/": "/vendor/three/0.186.1/addons/"`), only on pages that load a GLB model.
