/*
 * Scene: hero — "the meaningful signal inside complexity"
 * Phase 5 · Milestone 1: COMPOSITION BLOCKOUT (neutral, no final materials).
 *
 * The camera is pixel-aligned to the hero section, and every element is
 * placed in the section's own CSS-pixel layout (then pushed into depth with
 * its projection preserved). So the 3D composition sits exactly on the
 * approved 2D one: the graphite planes, the glass sliver, the Phase 3 Signal
 * path, and the text's clear space, measured live for AR and EN.
 *
 * Lifecycle contract (shared by every scene):
 *   init() activate() setProgress(p) setPointer(x, y) resize(w, h, dpr, ctx)
 *   render(renderer) wantsFrame() deactivate() dispose()
 */

export const meta = {
  name: 'hero',
  budget: { drawCalls: 40, triangles: { desktop: 150000, mobile: 40000 } }, // ceilings, not targets
  replacesFallback: true,   // the WebGL Signal stands in for the Phase 3 SVG trace once rendered
  zIndex: 1,                // above the DOM graphite planes, below the typography (z-index 2)
};

// Phase 3 fallback geometry (SVG viewBox units) — the WebGL Signal follows it exactly.
const PATH_DESKTOP = {   // viewBox 0..100 x 0..100 over the hero stage
  hidden:   [[2, 35.6], [5.5, 34.3], [8.4, 35.9], [11.8, 34.5], [14.6, 35.4], [17.9, 34.7]],
  mid:      [[30.5, 33.9], [35.2, 33.1], [38.6, 33.5], [45.6, 32.5]],
  emerging: [[48.9, 32.1], [93, 29.1]],
  lit:      [[58.3, 31.5], [66.8, 30.9]],
  vbH: 100,
};
const PATH_MOBILE = {    // viewBox 0..100 x 0..24 over the phone band
  hidden:   [[1, 15.8], [4.6, 12.6], [8.4, 16.3], [12, 13.1], [15.6, 15.2]],
  mid:      [[29, 13.6], [35.4, 12.1], [39.8, 12.9], [46.5, 11.5]],
  emerging: [[50.5, 11], [98, 7.6]],
  lit:      [[60.5, 10.3], [72, 9.5]],
  vbH: 24,
};
// Ember strength along the path (same stops as the SVG gradient): hidden → emerging
const RAMP = [[0, 0], [0.08, 0.2], [0.3, 0.32], [0.5, 0.55], [0.92, 0.82], [1, 0.82]];
const ramp = (u) => { for (let i = 1; i < RAMP.length; i++) if (u <= RAMP[i][0]) { const [a, va] = RAMP[i - 1], [b, vb] = RAMP[i]; return va + (vb - va) * (u - a) / (b - a); } return 0.82; };

// Element budget per composition (meaning identical, complexity reduced).
const COUNTS = {
  A:      { strands: 30, frames: 6, planes: 3 },
  B:      { strands: 20, frames: 4, planes: 2 },
  C:      { strands: 12, frames: 3, planes: 2 },
  mobile: { strands: 10, frames: 2, planes: 2 },
};

function prng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

export function create(ctx) {
  const THREE = ctx.THREE;
  let scene, camera, D = 1000, W = 1, H = 1;
  const built = [];                 // geometries rebuilt on every layout
  let mats = null;

  function rectIn(el, host) {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    return { x: r.left - host.left, y: r.top - host.top, w: r.width, h: r.height };
  }
  // screen position (section px) + depth → world position with the same projection
  function place(sx, sy, z) {
    const k = (D - z) / D;
    return [(sx - W / 2) * k, (H / 2 - sy) * k, z];
  }

  function materials() {
    // BLOCKOUT: flat, neutral, unlit. Final materials come in Milestone 3.
    return {
      strand: ctx.track(new THREE.LineBasicMaterial({ color: 0x8c8b87, transparent: true, opacity: 0.55, depthWrite: false })),
      frame:  ctx.track(new THREE.LineBasicMaterial({ color: 0x6f6e6b, transparent: true, opacity: 0.6, depthWrite: false })),
      plane:  ctx.track(new THREE.MeshBasicMaterial({ color: 0x1c1c20, transparent: true, opacity: 0.55, depthWrite: true })),
      glass:  ctx.track(new THREE.MeshBasicMaterial({ color: 0x9a9995, transparent: true, opacity: 0.07, depthWrite: false })),
      edge:   ctx.track(new THREE.LineBasicMaterial({ color: 0xb8b6b0, transparent: true, opacity: 0.45, depthWrite: false })),
      signal: ctx.track(new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false })),
    };
  }

  function clearBuilt() {
    for (const o of built) { scene.remove(o); o.geometry.dispose(); }
    built.length = 0;
  }
  function addLines(points, mat, colors) {   // points: flat [x,y,z,...] pairs for LineSegments
    if (!points.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    if (colors) g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 4));
    const l = new THREE.LineSegments(g, mat);
    scene.add(l); built.push(l); return l;
  }
  function addQuad(x, y, w, h, z, mat, rotY) {
    const g = new THREE.PlaneGeometry(1, 1);
    const m = new THREE.Mesh(g, mat);
    const c = place(x + w / 2, y + h / 2, z), k = (D - z) / D;
    m.position.set(c[0], c[1], c[2]); m.scale.set(w * k, h * k, 1); if (rotY) m.rotation.y = rotY;
    scene.add(m); built.push(m); return m;
  }

  function layout(c) {
    clearBuilt();
    const host = c.mount.getBoundingClientRect();
    const mobile = c.mode === 'mobile';
    const counts = mobile ? COUNTS.mobile : COUNTS[c.tier] || COUNTS.B;
    const rtl = document.documentElement.dir === 'rtl';
    const q = (s) => c.mount.querySelector(s);
    const stage = rectIn(q('.hero-stage'), host);
    const glassR = rectIn(q('.pl-glass'), host);
    const box = mobile ? rectIn(q('.sig-hero-m'), host) : rectIn(q('.sig-hero'), host);
    if (!stage || !box) return;
    const path = mobile ? PATH_MOBILE : PATH_DESKTOP;
    // the fallback SVG mirrors with the composition in RTL; the WebGL path matches it
    const toPx = ([u, v]) => [box.x + (rtl ? 100 - u : u) / 100 * box.w, box.y + v / path.vbH * box.h];

    // clear space: every text block, padded
    const pad = mobile ? 14 : 24;
    const keepOut = ['.hero-headline', '.hero-sub', '.hero-actions', '.hero-eyebrow']
      .map((s) => rectIn(q(s), host)).filter(Boolean)
      .map((r) => ({ x: r.x - pad, y: r.y - pad, w: r.w + pad * 2, h: r.h + pad * 2 }));
    const blocked = (x, y) => keepOut.some((r) => x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h);

    // ---- Signal: depth recedes where it is hidden, comes forward as it emerges
    const segs = [['hidden', -170, -140], ['mid', -100, -70], ['emerging', -40, 0]];
    const pts = [], cols = [];
    const x0 = toPx(path.hidden[0])[0], x1 = toPx(path.emerging[1])[0];
    const along = (x) => Math.abs((x - x0) / ((x1 - x0) || 1));
    for (const [key, zA, zB] of segs) {
      const P = path[key].map(toPx);
      for (let i = 0; i < P.length - 1; i++) {
        const za = zA + (zB - zA) * (i / (P.length - 1)), zb = zA + (zB - zA) * ((i + 1) / (P.length - 1));
        pts.push(...place(P[i][0], P[i][1], za), ...place(P[i + 1][0], P[i + 1][1], zb));
        cols.push(1, 0.353, 0.212, ramp(along(P[i][0])), 1, 0.353, 0.212, ramp(along(P[i + 1][0])));
      }
    }
    const L = path.lit.map(toPx);                      // brightest where the glass reveals it
    pts.push(...place(L[0][0], L[0][1], -12), ...place(L[1][0], L[1][1], -8));
    cols.push(1, 0.353, 0.212, 0.95, 1, 0.353, 0.212, 0.95);
    addLines(pts, mats.signal, cols);

    // ---- where the Signal is interrupted, something is in front of it
    const H0 = toPx(path.hidden[path.hidden.length - 1]), M0 = toPx(path.mid[0]);
    const M1 = toPx(path.mid[path.mid.length - 1]), E0 = toPx(path.emerging[0]);
    const occ = [];
    occ.push({ x: Math.min(H0[0], M0[0]) - 6, y: Math.min(H0[1], M0[1]) - (mobile ? 22 : 70), w: Math.abs(M0[0] - H0[0]) + 12, h: mobile ? 44 : 150, z: -60 });
    if (counts.planes >= 2) occ.push({ x: Math.min(M1[0], E0[0]) - 3, y: Math.min(M1[1], E0[1]) - (mobile ? 16 : 46), w: Math.abs(E0[0] - M1[0]) + 6, h: mobile ? 32 : 96, z: -30 });
    for (const o of occ) addQuad(o.x, o.y, o.w, o.h, o.z, mats.plane);

    // ---- optical plane aligned with the DOM glass sliver (the Signal passes through it)
    if (glassR) {
      addQuad(glassR.x, glassR.y, glassR.w, glassR.h, 10, mats.glass);
      const e = [], gx = glassR.x, gy = glassR.y, gw = glassR.w, gh = glassR.h;
      e.push(...place(rtl ? gx + gw : gx, gy, 10), ...place(rtl ? gx + gw : gx, gy + gh, 10));   // one precise leading edge
      addLines(e, mats.edge);
    }
    if (counts.planes >= 3) addQuad(stage.x + stage.w * 0.55, stage.y + stage.h * 0.58, stage.w * 0.38, stage.h * 0.24, -320, mats.glass, rtl ? 0.18 : -0.18);

    // ---- complexity field: few, intentional strands, denser toward the hidden end
    const rnd = prng(mobile ? 11 : 7);
    const lineY = (H0[1] + E0[1]) / 2;
    const hiddenEndX = toPx(path.hidden[0])[0], emergeEndX = x1;
    // the field lives in a band around the Signal, inside the planes — never up by the nav or down by the actions
    const navBottom = 90;
    const region = mobile
      ? { x: 8, y: Math.max(navBottom, box.y - 120), w: W - 16, h: Math.min(200, box.y + box.h + 40 - Math.max(navBottom, box.y - 120)) }
      : { x: stage.x, y: Math.max(navBottom + 30, stage.y + stage.h * 0.13), w: stage.w * 0.97, h: stage.h * 0.46 };
    const S = []; let tries = 0;
    while (S.length / 6 < counts.strands && tries++ < 4000) {
      const t = Math.pow(rnd(), 1.7);                                 // bias toward the hidden end
      const x = hiddenEndX + (emergeEndX - hiddenEndX) * t + (rnd() - 0.5) * region.w * 0.25;
      const y = rnd() < 0.72 ? lineY + (rnd() + rnd() + rnd() - 1.5) * region.h * 0.26 : region.y + rnd() * region.h;
      if (x < region.x || x > region.x + region.w || y < region.y || y > region.y + region.h) continue;
      if (blocked(x, y)) continue;
      if (t > 0.45 && Math.abs(y - lineY) < (mobile ? 10 : 22)) continue;   // the emerging Signal stays clean
      const vertical = rnd() < 0.2;
      const len = (mobile ? 10 : 16) + rnd() * (mobile ? 30 : 58);
      const a = vertical ? Math.PI / 2 + (rnd() - 0.5) * 0.3 : (rnd() - 0.5) * 0.5;
      const z = -260 + rnd() * 300;
      const dx = Math.cos(a) * len / 2, dy = Math.sin(a) * len / 2;
      if (blocked(x + dx, y + dy) || blocked(x - dx, y - dy)) continue;
      S.push(...place(x - dx, y - dy, z), ...place(x + dx, y + dy, z));
    }
    addLines(S, mats.strand);

    // ---- partial structural frames: open corners at shallow depths
    const F = []; tries = 0; let made = 0;
    while (made < counts.frames && tries++ < 2000) {
      const w = (mobile ? 36 : 60) + rnd() * (mobile ? 50 : 110), h = w * (0.45 + rnd() * 0.5);
      const x = region.x + rnd() * (region.w - w), y = region.y + rnd() * (region.h - h);
      if (blocked(x, y) || blocked(x + w, y) || blocked(x, y + h) || blocked(x + w, y + h) || blocked(x + w / 2, y + h / 2)) continue;
      const z = -220 + rnd() * 180, arm = Math.min(w, h) * 0.35;
      const corner = (cx, cy, sx, sy) => { F.push(...place(cx, cy, z), ...place(cx + arm * sx, cy, z), ...place(cx, cy, z), ...place(cx, cy + arm * sy, z)); };
      corner(x, y, 1, 1); corner(x + w, y + h, -1, -1);                // incomplete: two opposite corners only
      if (rnd() < 0.5) corner(x + w, y, -1, 1);
      made++;
    }
    addLines(F, mats.frame);
  }

  return {
    init() {
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(30, 1, 1, 6000);
      mats = materials();
    },
    activate() {},
    deactivate() {},
    setProgress() {},        // scroll behaviour: Milestone 4
    setPointer() {},         // pointer parallax: Milestone 4
    resize(w, h, dpr, c) {
      W = w; H = h;
      D = (h / 2) / Math.tan((camera.fov * Math.PI / 180) / 2);   // 1 world unit = 1 CSS px at z = 0
      camera.aspect = w / h; camera.position.set(0, 0, D); camera.near = 1; camera.far = D + 2000;
      camera.updateProjectionMatrix();
      layout(c);
    },
    render(renderer) { renderer.render(scene, camera); },
    wantsFrame() { return false; },
    dispose() { clearBuilt(); scene = null; },
  };
}
