/*
 * Scene: hero — "the meaningful signal inside complexity"
 * Phase 5 · Milestone 3: MATERIALS + LIGHTING on the approved composition.
 * A small material family: precision black metal (the foreground), one
 * lightly smoked optical plane, neutral technical lines; Ember only on the
 * Signal and its meaningful intersections. One soft key, a faint rim, near-
 * zero ambient. No refraction, bloom, post-processing or environment maps.
 *
 * Camera is pixel-aligned to the hero section: elements are authored in the
 * section's CSS-pixel layout, then pushed into depth. Three readable layers
 * on desktop (two on phones):
 *   1. rear structure  — faint open frames, deepest, perspective-reduced
 *   2. Signal / mid     — ONE continuous Signal path; strands around it
 *   3. foreground       — two opaque interruption elements that physically
 *                          occlude the Signal (and strands) where it is hidden
 * The Signal's gaps now come from geometry in front of it; the emerging end
 * stays unobstructed. Local debug only: ?signal-view=depth shows an angled
 * camera to verify the Z-layering.
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

// Element budget per composition — unchanged from Milestone 1 (no added complexity).
const COUNTS = {
  A:      { strands: 30, frames: 6, planes: 3 },
  B:      { strands: 20, frames: 4, planes: 2 },
  C:      { strands: 12, frames: 3, planes: 2 },
  mobile: { strands: 10, frames: 2, planes: 2 },
};
// Depth layers (CSS px behind the section plane; negative = further away)
const Z = {
  rear:   [-460, -380],   // structure
  field:  [-300, -170],   // strands behind the Signal
  near:   [-130, -70],    // strands beside the Signal
  front:  [-10, 40],      // the very few strands in front (hidden end only)
  signal: { hidden: -150, gap1: -135, mid: [-105, -80], gap2: -70, emerging: [-55, 0] },
  occluder1: -30, occluder2: -18,
};

function prng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

export function create(ctx) {
  const THREE = ctx.THREE;
  let scene, camera, D = 1000, W = 1, H = 1;
  const built = [];                 // geometries rebuilt on every layout
  let mats = null;
  const params = new URLSearchParams(location.search);
  const depthView = ctx.debug && params.get('signal-view') === 'depth';
  // local debug only: pin the discovery state (0 = at rest, 1 = discovered) for review
  const forcedT = ctx.debug && params.has('signal-state') ? Math.min(1, Math.max(0, parseFloat(params.get('signal-state')) || 0)) : null;
  let discovery = forcedT != null ? forcedT : 0;
  let lastCtx = null, fontsHooked = false;

  function rectIn(el, host) {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    return { x: r.left - host.left, y: r.top - host.top, w: r.width, h: r.height };
  }
  // Screen position (section px) + depth → world position that projects to the same pixel.
  function place(sx, sy, z) { const k = (D - z) / D; return [(sx - W / 2) * k, (H / 2 - sy) * k, z]; }

  function materials() {
    return {
      // technical lines: soft graphite / charcoal, alpha carries the depth fade
      lines:     ctx.track(new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false })),
      // precision black metal: black anodized, semi-matte, no chrome (opaque: it truly occludes)
      metal:     ctx.track(new THREE.MeshStandardMaterial({ color: 0x1c1c21, roughness: 0.5, metalness: 0.35, vertexColors: true })),
      metalEdge: ctx.track(new THREE.LineBasicMaterial({ color: 0x2b2b30 })),
      metalLit:  ctx.track(new THREE.LineBasicMaterial({ color: 0xa7a59f, transparent: true, opacity: 0.5, depthWrite: false })),
      // optical glass: lightly smoked, clean edge, minimal reflection — no refraction in the Hero
      glass:     ctx.track(new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.18, metalness: 0.0, transparent: true, opacity: 0.2, depthWrite: false })),
      edge:      ctx.track(new THREE.LineBasicMaterial({ color: 0xdedbd3, transparent: true, opacity: 0.42, depthWrite: false })),
      // Ember at the Signal's meaningful intersections (re-emergence points)
      mark:      ctx.track(new THREE.MeshBasicMaterial({ color: 0xff5a36, transparent: true, opacity: 0.5, depthWrite: false })),
      // THE SIGNAL: a thin light trace (no bloom, no halo). Soft edges are
      // computed across the ribbon; strength follows the approved ramp and
      // the discovery state. Depth-tested, so foreground geometry hides it.
      signal: ctx.track(new THREE.ShaderMaterial({
        transparent: true, depthWrite: false,
        uniforms: { uT: { value: 0 }, uForward: { value: 0 }, uD: { value: 1000 }, uColor: { value: new THREE.Vector3(1.0, 0.353, 0.212) } },
        vertexShader: `
          attribute float aBase; attribute float aU; attribute float aAcross; attribute float aLit;
          uniform float uT; uniform float uForward; uniform float uD;
          varying float vA; varying float vAcross;
          void main() {
            vec3 p = position;
            // discovered: the Signal comes forward out of the field, projection preserved
            float z2 = p.z + uForward;
            p.xy *= (uD - z2) / (uD - p.z);
            p.z = z2;
            // hidden end becomes readable, emerging end firms up; never fully resolved
            float lift = uT * (0.24 * (1.0 - smoothstep(0.35, 0.8, aU)) + 0.12 * smoothstep(0.5, 1.0, aU));
            vA = mix(min((aBase + lift) * 1.12, 0.96), aBase, aLit);
            vAcross = aAcross;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
          }`,
        fragmentShader: `
          uniform vec3 uColor; varying float vA; varying float vAcross;
          void main() {
            float edge = 1.0 - smoothstep(0.45, 1.0, abs(vAcross));
            gl_FragColor = vec4(uColor, vA * edge);
          }`,
      })),
    };
  }

  function clearBuilt() { for (const o of built) { scene.remove(o); o.geometry.dispose(); } built.length = 0; }
  function addLines(points, mat, colors) {
    if (!points.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    if (colors) g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 4));
    const l = new THREE.LineSegments(g, mat);
    scene.add(l); built.push(l); return l;
  }
  // Screen-space ribbon along a list of segments: { a:[sx,sy,z], b:[sx,sy,z], ua, ub, base: [a,b], lit }.
  function addRibbon(segs, widthPx, mat) {
    const pos = [], base = [], uu = [], across = [], lit = [], idx = [];
    let v = 0;
    for (const s of segs) {
      const dx = s.b[0] - s.a[0], dy = s.b[1] - s.a[1], len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len * widthPx / 2, ny = dx / len * widthPx / 2;
      const quad = [[s.a, -1, s.ua, s.base[0]], [s.a, 1, s.ua, s.base[0]], [s.b, -1, s.ub, s.base[1]], [s.b, 1, s.ub, s.base[1]]];
      for (const [p, side, u, bA] of quad) {
        pos.push(...place(p[0] + nx * side, p[1] + ny * side, p[2]));
        across.push(side); uu.push(u); base.push(bA); lit.push(s.lit ? 1 : 0);
      }
      idx.push(v, v + 1, v + 2, v + 1, v + 3, v + 2); v += 4;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aBase', new THREE.Float32BufferAttribute(base, 1));
    g.setAttribute('aU', new THREE.Float32BufferAttribute(uu, 1));
    g.setAttribute('aAcross', new THREE.Float32BufferAttribute(across, 1));
    g.setAttribute('aLit', new THREE.Float32BufferAttribute(lit, 1));
    g.setIndex(idx);
    const m = new THREE.Mesh(g, mat);
    scene.add(m); built.push(m); return m;
  }

  // A precision slab: thin black-metal box centred on a screen rect, slight yaw.
  // Read through its lit thickness and one restrained highlight on the edge the
  // key light catches — not by being bright.
  function addSlab(x, y, w, h, z, yaw, thick) {
    const g = new THREE.BoxGeometry(1, 1, 1);
    // soft key falloff baked per vertex: the upper edge catches the light, the base settles
    const pos = g.attributes.position, col = [];
    for (let i = 0; i < pos.count; i++) { const v = 0.6 + 0.4 * (pos.getY(i) + 0.5); col.push(v, v, v); }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    const m = new THREE.Mesh(g, mats.metal);
    const c = place(x + w / 2, y + h / 2, z), k = (D - z) / D;
    m.position.set(c[0], c[1], c[2]); m.scale.set(w * k, h * k, thick); m.rotation.y = yaw || 0;
    scene.add(m); built.push(m);
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(g), mats.metalEdge);
    e.position.copy(m.position); e.scale.copy(m.scale); e.rotation.copy(m.rotation);
    scene.add(e); built.push(e);
    const hl = new THREE.BufferGeometry();         // top-front edge: where the key light lands
    hl.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, 0.5, 0.5, 0.5, 0.5, 0.5], 3));
    const l = new THREE.LineSegments(hl, mats.metalLit);
    l.position.copy(m.position); l.scale.copy(m.scale); l.rotation.copy(m.rotation);
    scene.add(l); built.push(l);
    return m;
  }

  // A thin panel (quad) centred on a screen rect, with slight yaw.
  function addPanel(x, y, w, h, z, yaw, material, withEdge) {
    const g = new THREE.PlaneGeometry(1, 1);
    const m = new THREE.Mesh(g, material);
    const c = place(x + w / 2, y + h / 2, z), k = (D - z) / D;
    m.position.set(c[0], c[1], c[2]); m.scale.set(w * k, h * k, 1); m.rotation.y = yaw || 0;
    scene.add(m); built.push(m);
    if (withEdge) {
      const eg = new THREE.EdgesGeometry(g);
      const e = new THREE.LineSegments(eg, mats.metalEdge);
      e.position.copy(m.position); e.scale.copy(m.scale); e.rotation.copy(m.rotation);
      e.position.z += 0.5;
      scene.add(e); built.push(e);
    }
    return m;
  }

  function layout(c) {
    clearBuilt();
    const host = c.mount.getBoundingClientRect();
    const mobile = c.mode === 'mobile';
    const counts = mobile ? COUNTS.mobile : COUNTS[c.tier] || COUNTS.B;
    const rtl = document.documentElement.dir === 'rtl';
    const dir = rtl ? -1 : 1;                      // the direction the Signal travels on screen
    const q = (s) => c.mount.querySelector(s);
    const stage = rectIn(q('.hero-stage'), host);
    const glassR = rectIn(q('.pl-glass'), host);
    const box = mobile ? rectIn(q('.sig-hero-m'), host) : rectIn(q('.sig-hero'), host);
    if (!stage || !box) return;
    const path = mobile ? PATH_MOBILE : PATH_DESKTOP;
    const toPx = ([u, v]) => [box.x + (rtl ? 100 - u : u) / 100 * box.w, box.y + v / path.vbH * box.h];

    // clear space: every text block, padded
    const pad = mobile ? 14 : 24;
    const keepOut = ['.hero-headline', '.hero-sub', '.hero-actions', '.hero-eyebrow']
      .map((s) => rectIn(q(s), host)).filter(Boolean)
      .map((r) => ({ x: r.x - pad, y: r.y - pad, w: r.w + pad * 2, h: r.h + pad * 2 }));
    const blocked = (x, y) => keepOut.some((r) => x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h);

    // ================= 2. SIGNAL — one continuous path in depth =================
    const P = { hidden: path.hidden.map(toPx), mid: path.mid.map(toPx), emerging: path.emerging.map(toPx) };
    const x0 = P.hidden[0][0], x1 = P.emerging[1][0];
    const along = (x) => Math.abs((x - x0) / ((x1 - x0) || 1));
    const chain = [];                               // [sx, sy, z]
    P.hidden.forEach((p) => chain.push([p[0], p[1], Z.signal.hidden]));
    P.mid.forEach((p, i) => chain.push([p[0], p[1], Z.signal.mid[0] + (Z.signal.mid[1] - Z.signal.mid[0]) * i / (P.mid.length - 1)]));
    P.emerging.forEach((p, i) => chain.push([p[0], p[1], Z.signal.emerging[0] + (Z.signal.emerging[1] - Z.signal.emerging[0]) * i]));
    // desktop: fully continuous — the gaps are made by the foreground (occlusion).
    // phone: only the first gap is occluded; the small second break stays as drawn.
    const breakAfter = mobile ? P.hidden.length + P.mid.length - 1 : -1;
    const segs = [];
    for (let i = 0; i < chain.length - 1; i++) {
      if (i === breakAfter) continue;
      const a = chain[i], b = chain[i + 1], ua = along(a[0]), ub = along(b[0]);
      segs.push({ a, b, ua, ub, base: [ramp(ua), ramp(ub)], lit: false });
    }
    const L = path.lit.map(toPx);                   // brightest where the glass reveals it
    segs.push({ a: [L[0][0], L[0][1], -40], b: [L[1][0], L[1][1], -34], ua: along(L[0][0]), ub: along(L[1][0]), base: [0.95, 0.95], lit: true });
    addRibbon(segs, mobile ? 2.2 : 2.4, mats.signal);

    // ================= 3. FOREGROUND — what the Signal is hidden behind =================
    const H0 = P.hidden[P.hidden.length - 1], M0 = P.mid[0], M1 = P.mid[P.mid.length - 1], E0 = P.emerging[0];
    const lineY = (H0[1] + E0[1]) / 2;
    const occl = [];
    {   // occluder 1: a panel over the first interruption, reaching back over the end of the hidden run
      const gx0 = Math.min(H0[0], M0[0]), gx1 = Math.max(H0[0], M0[0]);
      const reach = (gx1 - gx0) * 0.35;             // also swallows the tail of the hidden segment
      const x = rtl ? gx0 - 10 : gx0 - reach, w = (gx1 - gx0) + reach + 10;
      const h = mobile ? 40 : 92, y = (H0[1] + M0[1]) / 2 - h * (mobile ? 0.5 : 0.55);   // desktop: ~28% shallower than 1.1
      occl.push({ x, y, w, h, z: Z.occluder1, yaw: (mobile ? 0.08 : 0.07) * dir, lineY: (H0[1] + M0[1]) / 2, thick: mobile ? 8 : 20 });   // a precision interruption, barely turned
    }
    if (!mobile && counts.planes >= 2) {   // occluder 2: a narrow precision fin across the second break
      const gx0 = Math.min(M1[0], E0[0]), gx1 = Math.max(M1[0], E0[0]);
      const w = Math.max(10, gx1 - gx0 + 6), h = 104;
      occl.push({ x: gx0 - 3, y: (M1[1] + E0[1]) / 2 - h * 0.55, w, h, z: Z.occluder2, yaw: -0.1 * dir, lineY: (M1[1] + E0[1]) / 2, thick: 14 });
    }
    // Foreground never reaches into the typography. A panel that would, moves UP
    // (keeping its size) so its lower edge ends just below the Signal line: the
    // Signal stays genuinely behind it, the text stays clear. (The keep-out already
    // carries padding, so the edge may sit inside the pad, never on the glyphs.)
    for (const o of occl) {
      let bottom = o.y + o.h;
      for (const r of keepOut) {
        const overlapsX = o.x < r.x + r.w && o.x + o.w > r.x;
        if (overlapsX && r.y < bottom && r.y + r.h > o.y) bottom = Math.min(bottom, r.y - 8);
      }
      bottom = Math.max(bottom, o.lineY + (mobile ? 6 : 9));
      o.y = bottom - o.h;
      addSlab(o.x, o.y, o.w, o.h, o.z, o.yaw, o.thick);
    }

    // Ember only where it means something: the Signal's re-emergence points
    // (past the first interruption, past the fin, into the glass).
    // Each mark sits just past the interruption's edge, on the line itself.
    const past = (p, q, px) => { const t = Math.min(1, px / (Math.abs(q[0] - p[0]) || 1)); return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]; };
    const marks = [past(M0, P.mid[1], mobile ? 12 : 16)];
    if (!mobile) marks.push(past(E0, P.emerging[1], 9), L[0]);
    // a short registration tick across the line (reads as an intersection, not a dot)
    const mk = [], mw = 1.5, mh = mobile ? 7 : 9, mz = Z.signal.mid[0] + 20;
    for (const [mx, my] of marks) {
      const q0 = place(mx - mw / 2, my - mh / 2, mz), q1 = place(mx + mw / 2, my - mh / 2, mz), q2 = place(mx - mw / 2, my + mh / 2, mz), q3 = place(mx + mw / 2, my + mh / 2, mz);
      mk.push(...q0, ...q2, ...q1, ...q1, ...q2, ...q3);   // CCW facing the camera
    }
    const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.Float32BufferAttribute(mk, 3));
    const mm = new THREE.Mesh(mg, mats.mark); scene.add(mm); built.push(mm);

    // optical plane on the DOM glass sliver (translucent; the Signal is revealed through it)
    const lite = mobile || c.tier === 'C';           // phones / low tier: no transparent layer
    if (glassR) {
      if (!lite) addPanel(glassR.x, glassR.y, glassR.w, glassR.h, -40, 0, mats.glass, false);
      const gx = rtl ? glassR.x + glassR.w : glassR.x;
      addLines([...place(gx, glassR.y, -40), ...place(gx, glassR.y + glassR.h, -40)], mats.edge);
    }

    // ================= strands — same count, distributed through depth =================
    const rnd = prng(mobile ? 11 : 7);
    const hiddenEndX = x0, emergeEndX = x1;
    const navBottom = 90;
    const region = mobile
      ? { x: 8, y: Math.max(navBottom, box.y - 120), w: W - 16, h: Math.min(200, box.y + box.h + 40 - Math.max(navBottom, box.y - 120)) }
      : { x: stage.x, y: Math.max(navBottom + 30, stage.y + stage.h * 0.13), w: stage.w * 0.97, h: stage.h * 0.46 };
    const S = [], SC = []; let tries = 0, n = 0;
    const tone = (z) => {                           // depth fading: rear quiet, front firmer
      const t = Math.min(1, Math.max(0, (z - Z.field[0]) / (Z.front[1] - Z.field[0])));
      return [0.44 + 0.14 * t, 0.16 + 0.44 * t];      // [grey level, alpha]: soft graphite, rear quiet
    };
    while (n < counts.strands && tries++ < 6000) {
      const t = Math.pow(rnd(), 1.7);               // bias toward the hidden end
      const x = hiddenEndX + (emergeEndX - hiddenEndX) * t + (rnd() - 0.5) * region.w * 0.25;
      const y = rnd() < 0.72 ? lineY + (rnd() + rnd() + rnd() - 1.5) * region.h * 0.26 : region.y + rnd() * region.h;
      if (x < region.x || x > region.x + region.w || y < region.y || y > region.y + region.h) continue;
      if (blocked(x, y)) continue;
      if (t > 0.45 && Math.abs(y - lineY) < (mobile ? 10 : 22)) continue;   // the emerging Signal stays clean
      // layer: most behind, some beside, very few in front (hidden end only); phones: two levels
      const r = rnd();
      let band;
      if (mobile) band = r < 0.75 ? Z.field : Z.near;
      else band = (r < 0.1 && t < 0.3) ? Z.front : (r < 0.62 ? Z.field : Z.near);
      const z = band[0] + rnd() * (band[1] - band[0]);
      const vertical = rnd() < 0.2;
      const len = (mobile ? 10 : 16) + rnd() * (mobile ? 30 : 58);
      const a = vertical ? Math.PI / 2 + (rnd() - 0.5) * 0.3 : (rnd() - 0.5) * 0.5;
      const dx = Math.cos(a) * len / 2, dy = Math.sin(a) * len / 2;
      if (blocked(x + dx, y + dy) || blocked(x - dx, y - dy)) continue;
      const [g, al] = tone(z);
      S.push(...place(x - dx, y - dy, z), ...place(x + dx, y + dy, z));
      SC.push(g, g, g * 0.98, al, g, g, g * 0.98, al);
      n++;
    }
    addLines(S, mats.lines, SC);

    // ================= 1. REAR STRUCTURE — faint, deepest, perspective-reduced =================
    const F = [], FC = []; tries = 0; let made = 0;
    while (made < counts.frames && tries++ < 2000) {
      const w = (mobile ? 36 : 60) + rnd() * (mobile ? 50 : 110), h = w * (0.45 + rnd() * 0.5);
      const x = region.x + rnd() * (region.w - w), y = region.y + rnd() * (region.h - h);
      if (blocked(x, y) || blocked(x + w, y) || blocked(x, y + h) || blocked(x + w, y + h) || blocked(x + w / 2, y + h / 2)) continue;
      const z = Z.rear[0] + rnd() * (Z.rear[1] - Z.rear[0]);
      // anchored where authored, but NOT size-compensated: real perspective makes it smaller
      const cx = x + w / 2, cy = y + h / 2, [wx, wy] = place(cx, cy, z);
      const yaw = (rnd() - 0.5) * 0.24;              // a few degrees at most
      const arm = Math.min(w, h) * 0.35, hw = w / 2, hh = h / 2;
      const pt = (lx, ly) => { const cxr = Math.cos(yaw), sxr = Math.sin(yaw); return [wx + lx * cxr, wy + ly, z - lx * sxr]; };
      const corner = (lx, ly, sx, sy) => { F.push(...pt(lx, ly), ...pt(lx + arm * sx, ly), ...pt(lx, ly), ...pt(lx, ly + arm * sy)); };
      corner(-hw, hh, 1, -1); corner(hw, -hh, -1, 1);
      if (rnd() < 0.5) corner(hw, hh, -1, -1);
      const segs = F.length / 3 - FC.length / 4;
      for (let s = 0; s < segs; s++) FC.push(0.36, 0.36, 0.35, 0.24);   // charcoal, quieter than everything else
      made++;
    }
    addLines(F, mats.lines, FC);

    // optional deepest plane (Tier A only)
    if (!mobile && counts.planes >= 3) addPanel(stage.x + stage.w * 0.55, stage.y + stage.h * 0.58, stage.w * 0.38, stage.h * 0.24, Z.rear[0], 0.12 * -dir, mats.glass, false);
  }

  function applyDiscovery() {
    if (!mats) return;
    mats.signal.uniforms.uT.value = discovery;
    // separates from the field behind it, but stays behind both foreground elements
    // (fin at z -18, emerging start at z -55): the Hero never fully resolves the Signal
    mats.signal.uniforms.uForward.value = discovery * 30;
    mats.lines.opacity = 1 - 0.35 * discovery;                 // the complexity quietens, it does not vanish
    mats.mark.opacity = 0.45 + 0.45 * discovery;               // intersections sharpen as the Signal is found
  }

  function setCamera() {
    D = (H / 2) / Math.tan((camera.fov * Math.PI / 180) / 2);   // 1 world unit = 1 CSS px at z = 0
    camera.aspect = W / H; camera.near = 1; camera.far = D + 4000;
    if (depthView) {   // local debug only: angled view to verify Z-layering and occlusion
      camera.position.set(D * 0.62, D * 0.2, D * 0.78);
      camera.lookAt(0, 0, -200);
    } else {
      camera.position.set(0, 0, D); camera.lookAt(0, 0, 0);
    }
    camera.updateProjectionMatrix();
    if (mats) mats.signal.uniforms.uD.value = D;
  }

  return {
    init() {
      scene = new THREE.Scene();
      // Minimal light: one soft key from upper-left, a faint rim, near-zero ambient.
      const key = new THREE.DirectionalLight(0xf2f0ea, 2.6); key.position.set(-0.45, 0.85, 0.6);
      const rim = new THREE.DirectionalLight(0xe9e7e1, 0.5); rim.position.set(0.7, 0.2, -0.6);
      scene.add(key, rim, new THREE.AmbientLight(0xffffff, 0.06));
      camera = new THREE.PerspectiveCamera(30, 1, 1, 6000);
      mats = materials();
    },
    activate() {},
    deactivate() {},
    // Hero progress runs 0.5 (at the top) → 1 (scrolled past). Discovery completes
    // after about half the hero has scrolled; camera/depth motion is Milestone 4.
    setProgress(p) {
      if (forcedT != null) return;
      const t = Math.min(1, Math.max(0, (p - 0.5) / 0.25));
      discovery = t * t * (3 - 2 * t);
      applyDiscovery();
    },
    setPointer() {},         // pointer parallax: Milestone 4
    resize(w, h, dpr, c) {
      W = w; H = h; lastCtx = c; setCamera(); layout(c); applyDiscovery();
      // the text's clear space depends on the web fonts: re-measure once they are in
      if (!fontsHooked && document.fonts && document.fonts.status !== 'loaded') {
        fontsHooked = true;
        document.fonts.ready.then(() => { if (scene && lastCtx) { layout(lastCtx); ctx.requestFrame('fonts'); } });
      }
    },
    render(renderer) { renderer.render(scene, camera); },
    wantsFrame() { return false; },
    dispose() { clearBuilt(); scene = null; },
  };
}
