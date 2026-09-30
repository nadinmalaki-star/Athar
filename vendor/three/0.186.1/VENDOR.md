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
