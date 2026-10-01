/*
 * Scene: understanding  —  Milestone U1: SPATIAL + OPTICAL BLOCKOUT.
 *
 * Complexity is filtered into clarity. The Hero's Ember Signal enters a field
 * of fragmented information, passes through three optical filtering stages,
 * and leaves cleaner each time:
 *   unstructured → filter 1 → reduced → filter 2 → structured → filter 3 → clear Signal
 *
 * Its own visual logic (not the Hero's): no foreground slabs, no strand field,
 * no pointer parallax. Depth comes from travelling THROUGH layers: the three
 * planes are real rectangles in depth (perspective makes them trapezoids),
 * the Signal rises from deep to near and physically crosses each one, and the
 * information marks get fewer, better aligned, tighter and shallower at every
 * stage. Neutral blockout materials only — final optics come after approval.
 *
 * Registered to the approved Phase 3 SVG (the fallback): the composition is
 * authored in that SVG's viewBox and laid onto the SVG's on-screen rect, so
 * replacing it after the first frame is seamless. Desktop/tablet use the
 * horizontal composition; phones use their own vertical one (as the SVG does).
 * Arabic desktop runs right → left (the Hero's RTL narrative), mirrored exactly
 * as the fallback SVG is mirrored in CSS; phones stay vertical in both languages.
 *
 * Contract: init() activate() setProgress(p) setPointer(x, y) resize(w, h, dpr, ctx)
 *           render(renderer) wantsFrame() deactivate() dispose()
 * U1 is static: no scroll story, no pointer (setPointer returns false so the
 * core does not render frames for pointer movement over this section).
 */

export const meta = {
  name: 'understanding',
  budget: { drawCalls: 70, triangles: { desktop: 150000, mobile: 40000 } },   // ceilings, not targets
  replacesFallback: true,     // after the first rendered frame, the SVG fades out (core)
  zIndex: 1,
};

function prng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (t) => Math.min(1, Math.max(0, t));
const smooth = (t) => { t = clamp01(t); return t * t * (3 - 2 * t); };

// ---------------------------------------------------------------------------
// Composition, in the fallback SVG's own units. `a` = the axis the Signal
// travels along (x on desktop, y on phones), `b` = across it.
// ---------------------------------------------------------------------------
const COMP = {
  desktop: {
    svg: '.u-optics-d', vb: [1200, 460], axis: 'x', mid: 230, end: 1168,
    // filter planes: leading edge on the axis, its screen thickness, half-height across
    planes: [{ a: 330, t: 56, h: 208 }, { a: 625, t: 50, h: 184 }, { a: 890, t: 44, h: 160 }],
    // marks per zone: count, axis range, half-spread across, depth jitter, row pitch, lengths, alpha
    zones: [
      { n: 130, a: [8, 316], b: 194, dz: 70, rows: 0, len: [6, 46], alpha: [0.14, 0.36], vert: 0.08 },
      { n: 38, a: [400, 611], b: 156, dz: 32, rows: 22, len: [12, 66], alpha: [0.22, 0.4], vert: 0 },
      { n: 12, a: [690, 876], b: 92, dz: 10, rows: 42, len: [54, 122], alpha: [0.32, 0.46], vert: 0, cols: 2 },
    ],
    exitTicks: [960, 1010, 1060, 1110],
    width: [1.7, 2.0, 2.2, 2.4],
  },
  mobile: {
    svg: '.u-optics-m', vb: [360, 640], axis: 'y', mid: 180, end: 626,
    planes: [{ a: 190, t: 26, h: 166 }, { a: 362, t: 26, h: 146 }, { a: 486, t: 26, h: 122 }],
    zones: [
      { n: 84, a: [10, 178], b: 156, dz: 50, rows: 0, len: [6, 34], alpha: [0.2, 0.42], vert: 0 },
      { n: 18, a: [230, 350], b: 106, dz: 22, rows: 14, len: [10, 44], alpha: [0.22, 0.4], vert: 0 },
      { n: 7, a: [400, 474], b: 66, dz: 8, rows: 18, len: [30, 70], alpha: [0.32, 0.46], vert: 0, cols: 2 },
    ],
    exitTicks: [536, 566, 596],
    width: [1.6, 1.8, 2.0, 2.2],
  },
};
// Depth: the Signal rises from deep (entry) to near (exit); each plane sits at
// its own depth and the Signal crosses it halfway through its thickness.
const DEPTH = { entry: -340, planes: [-250, -160, -70], planeDz: [140, 124, 108], exit: -12 };
const TIER_SCALE = { A: 1, B: 1, C: 0.62 };

export function create(ctx) {
  const THREE = ctx.THREE;
  let scene, camera, D = 1000, W = 1, H = 1, mats = null;
  const built = [];
  const params = new URLSearchParams(location.search);
  const depthView = ctx.debug && params.get('signal-view') === 'depth';
  let lastCtx = null, fontsHooked = false, dirWatch = null;

  function place(sx, sy, z) { const k = (D - z) / D; return [(sx - W / 2) * k, (H / 2 - sy) * k, z]; }

  function materials() {
    return {
      // information marks + neutral structure: off-white, alpha carries the hierarchy
      marks: ctx.track(new THREE.MeshBasicMaterial({ color: 0xe9e6df, vertexColors: true, transparent: true, depthWrite: false })),
      plane: ctx.track(new THREE.MeshBasicMaterial({ color: 0xe9e6df, vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide })),
      edges: ctx.track(new THREE.LineBasicMaterial({ color: 0xe9e6df, vertexColors: true, transparent: true, depthWrite: false })),
      node: ctx.track(new THREE.MeshBasicMaterial({ color: 0xff5a36, transparent: true, opacity: 0.9, depthWrite: false })),
      // THE SIGNAL — same Ember language and thickness family as the Hero:
      // a thin screen-space trace, soft edges, no bloom. Depth-written so a
      // plane drawn afterwards veils only the part of the Signal behind it.
      signal: ctx.track(new THREE.ShaderMaterial({
        transparent: true, depthWrite: true,
        uniforms: { uColor: { value: new THREE.Vector3(1.0, 0.353, 0.212) } },
        vertexShader: `
          attribute float aA; attribute float aAcross;
          varying float vA; varying float vAcross;
          void main() { vA = aA; vAcross = aAcross; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `
          uniform vec3 uColor; varying float vA; varying float vAcross;
          void main() { float e = 1.0 - smoothstep(0.45, 1.0, abs(vAcross)); gl_FragColor = vec4(uColor, vA * e); }`,
      })),
    };
  }

  function clearBuilt() { for (const o of built) { o.removeFromParent(); if (o.geometry) o.geometry.dispose(); } built.length = 0; }
  function add(o, order) { o.renderOrder = order; scene.add(o); built.push(o); return o; }
  function mesh(pos, col, mat, order) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    if (col) g.setAttribute('color', new THREE.Float32BufferAttribute(col, 4));
    return add(new THREE.Mesh(g, mat), order);
  }
  function lines(pos, col, mat, order) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 4));
    return add(new THREE.LineSegments(g, mat), order);
  }

  // ---------------------------------------------------------------------------
  function layout(c) {
    clearBuilt();
    const host = c.mount.getBoundingClientRect();
    // the visible fallback SVG decides the composition (desktop/tablet vs phone)
    const pick = ['.u-optics-m', '.u-optics-d'].map((sel) => c.mount.querySelector(sel))
      .find((el) => el && getComputedStyle(el).display !== 'none');
    if (!pick) return;
    const C = pick.classList.contains('u-optics-m') ? COMP.mobile : COMP.desktop;
    const r = pick.getBoundingClientRect();
    if (!r.width || !r.height) return;
    // preserveAspectRatio="xMidYMid meet": the viewBox is uniformly scaled and centred
    const s = Math.min(r.width / C.vb[0], r.height / C.vb[1]);
    const ox = r.left - host.left + (r.width - C.vb[0] * s) / 2, oy = r.top - host.top + (r.height - C.vb[1] * s) / 2;
    const horiz = C.axis === 'x';
    const mirror = horiz && document.documentElement.dir === 'rtl';   // = [dir=rtl] .u-optics-d { scaleX(-1) }
    // (a = along the Signal, b = across, in viewBox units) → section pixels
    const P = (a, b) => horiz ? [ox + (mirror ? C.vb[0] - a : a) * s, oy + b * s] : [ox + b * s, oy + a * s];
    const scale = TIER_SCALE[c.tier] || 1;
    const rnd = prng(horiz ? 23 : 29);
    const pl = C.planes;
    const mids = pl.map((p) => p.a + p.t / 2);

    // Signal depth along the axis: entry → crossing each plane mid → exit
    const zKeys = [[0, DEPTH.entry], ...mids.map((m, i) => [m, DEPTH.planes[i]]), [C.end, DEPTH.exit]];
    const zAt = (a) => { for (let i = 0; i < zKeys.length - 1; i++) { const [a0, z0] = zKeys[i], [a1, z1] = zKeys[i + 1]; if (a <= a1) return lerp(z0, z1, clamp01((a - a0) / (a1 - a0))); } return DEPTH.exit; };
    // which stage a point on the axis is in (0 noise … 3 clear), fractional across a plane
    const stageAt = (a) => { let st = 0; for (let i = 0; i < pl.length; i++) st += smooth((a - pl[i].a) / pl[i].t); return st; };

    // ===================== 1. THE SIGNAL =====================
    // irregular at entry; each stage reduces the irregularity; still not
    // perfectly straight at exit (full resolution belongs to the clarity slab)
    const AMP = [5.2, 2.4, 0.9, 0.35], STEP = [17, 27, 42, 64], ALPHA = [0.46, 0.64, 0.8, 0.94];
    const pts = []; let a = 0, sign = 1;
    while (a < C.end) {
      const st = stageAt(a), i0 = Math.min(3, Math.floor(st)), f = st - i0, i1 = Math.min(3, i0 + 1);
      const amp = lerp(AMP[i0], AMP[i1], f), step = lerp(STEP[i0], STEP[i1], f);
      const noisy = 1 - clamp01(st);                 // 1 in the unstructured field, 0 after filter 1
      const b = C.mid + sign * amp * lerp(0.55 + 0.45 * rnd(), 0.15 + 1.05 * rnd(), noisy)
        + (st > 2.6 ? 0.6 * Math.sin(a / 140) : 0);   // last stretch: a residual, gentle drift
      pts.push({ a, b, z: zAt(a), al: lerp(ALPHA[i0], ALPHA[i1], f), w: lerp(C.width[i0], C.width[i1], f) });
      if (noisy < 0.5 || rnd() < 0.82) sign = -sign;   // the noisy field sometimes breaks the rhythm
      a += step * lerp(0.8 + 0.4 * rnd(), 0.5 + 1.0 * rnd(), noisy);
    }
    pts.push({ a: C.end, b: C.mid + 0.3, z: DEPTH.exit, al: ALPHA[3], w: C.width[3] });
    {
      const pos = [], al = [], acr = [], idx = []; let v = 0;
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i], p1 = pts[i + 1];
        const [x0, y0] = P(p0.a, p0.b), [x1, y1] = P(p1.a, p1.b);
        const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1;
        for (const [x, y, z, w, A] of [[x0, y0, p0.z, p0.w, p0.al], [x1, y1, p1.z, p1.w, p1.al]]) {
          const nx = -dy / len * w / 2, ny = dx / len * w / 2;
          pos.push(...place(x - nx, y - ny, z), ...place(x + nx, y + ny, z));
          al.push(A, A); acr.push(-1, 1);
        }
        idx.push(v, v + 1, v + 2, v + 1, v + 3, v + 2); v += 4;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('aA', new THREE.Float32BufferAttribute(al, 1));
      g.setAttribute('aAcross', new THREE.Float32BufferAttribute(acr, 1));
      g.setIndex(idx);
      add(new THREE.Mesh(g, mats.signal), 0);
    }

    // ===================== 2. INFORMATION MARKS =====================
    // Anchored where authored, sized in true perspective (deeper = smaller):
    // the field reads as having depth even before anything moves.
    const MP = [], MC = [];
    const quad = (ca, cb, z, la, lb, A) => {     // centre (a,b), extents along/across, alpha
      const [cx, cy] = P(ca, cb), c3 = place(cx, cy, z);
      const hx = (horiz ? la : lb) * s / 2, hy = (horiz ? lb : la) * s / 2;
      const q = [[-hx, hy], [hx, hy], [-hx, -hy], [hx, -hy]].map(([u, w]) => [c3[0] + u, c3[1] + w, z]);
      MP.push(...q[0], ...q[2], ...q[1], ...q[1], ...q[2], ...q[3]);
      for (let k = 0; k < 6; k++) MC.push(1, 1, 1, A);
    };
    const thick = 1.6;
    C.zones.forEach((Z, zi) => {
      const n = Math.round(Z.n * scale);
      let made = 0, tries = 0;
      const colsAt = Z.cols ? Array.from({ length: Z.cols }, (_, i) => lerp(Z.a[0], Z.a[0] + (Z.a[1] - Z.a[0]) * 0.52, i)) : null;
      while (made < n && tries++ < 4000) {
        if (!horiz) {
          // phones (as the approved SVG): marks lie ACROSS the vertical Signal, in rows
          // that tighten stage by stage; the structured stage is centred on the line
          const len = lerp(Z.len[0], Z.len[1], Math.pow(rnd(), zi === 0 ? 1.6 : 1));
          const ca = Z.rows ? Z.a[0] + Math.round(rnd() * (Z.a[1] - Z.a[0]) / Z.rows) * Z.rows : Z.a[0] + rnd() * (Z.a[1] - Z.a[0]);
          const cb = Z.cols ? C.mid + (rnd() * 2 - 1) * 4 : C.mid + (rnd() * 2 - 1) * (Z.b - len / 2);
          if (ca < Z.a[0] || ca > Z.a[1]) continue;
          quad(ca, cb, zAt(ca) + (rnd() * 2 - 1) * Z.dz, thick, Math.round(len / 2) * 2, lerp(Z.alpha[0], Z.alpha[1], rnd()));
          made++; continue;
        }
        const vert = rnd() < Z.vert;
        let len = lerp(Z.len[0], Z.len[1], Math.pow(rnd(), zi === 0 ? 1.8 : 1));
        const b = Z.rows ? C.mid + (rnd() < 0.5 ? -1 : 1) * Z.rows * (1 + Math.floor(rnd() * Math.floor(Z.b / Z.rows))) : C.mid + (rnd() * 2 - 1) * Z.b;
        let a0;
        if (colsAt) {
          a0 = colsAt[Math.floor(rnd() * colsAt.length)];
          len = Math.floor(Math.min(len, Z.a[1] - a0) / 6) * 6;      // never runs into the next plane
          if (len < Z.len[0] * 0.6) continue;
        }
        else if (Z.rows) { a0 = Z.a[0] + Math.round(rnd() * (Z.a[1] - Z.a[0] - len) / 6) * 6; len = Math.round(len / 6) * 6; }
        else a0 = Z.a[0] + rnd() * (Z.a[1] - Z.a[0] - len);
        if (vert) len = 6 + rnd() * 8;
        const ca = vert ? a0 : a0 + len / 2;
        if (Math.abs(b - C.mid) < (zi === 0 ? 7 : 12)) continue;     // the Signal keeps a clear lane
        if (ca < Z.a[0] || ca > Z.a[1]) continue;
        const z = zAt(ca) + (rnd() * 2 - 1) * Z.dz;
        const A = lerp(Z.alpha[0], Z.alpha[1], rnd());
        if (vert) quad(ca, b, z, thick, len, A); else quad(ca, b, z, len, thick, A);
        made++;
      }
    });
    // exit: only a few meaningful marks remain — registration ticks on the Signal's own depth
    for (const t of C.exitTicks) quad(t, C.mid + (horiz ? 17 : 12), zAt(t), thick, 7, 0.42);
    mesh(MP, MC, mats.marks, 1);

    // ===================== 3. FILTER PLANES =====================
    // Real rectangles in depth: the leading edge is nearer, the trailing edge
    // recedes (dz), so perspective draws the trapezoid. Each a little more
    // turned and a little more present than the one before.
    const FP = [], FC = [], EP = [], EC = [];
    pl.forEach((p, i) => {
      const zc = DEPTH.planes[i], dz = DEPTH.planeDz[i], zn = zc + dz / 2, zf = zc - dz / 2;
      const [lx, ly] = P(p.a, C.mid), [tx, ty] = P(p.a + p.t, C.mid);
      const near = place(lx, ly, zn), far = place(tx, ty, zf);
      const k = (D - zn) / D, hw = p.h * s * k;               // world half-extent across the axis
      const tilt = (i - 1) * 3 * s;                          // a slightly different orientation each
      const corners = horiz
        ? [[near[0], near[1] + hw, zn], [near[0], near[1] - hw, zn], [far[0], far[1] + hw + tilt, zf], [far[0], far[1] - hw + tilt, zf]]
        : [[near[0] - hw, near[1], zn], [near[0] + hw, near[1], zn], [far[0] - hw + tilt, far[1], zf], [far[0] + hw + tilt, far[1], zf]];
      const [n0, n1, f0, f1] = corners, fill = 0.035 + 0.012 * i;
      FP.push(...n0, ...n1, ...f0, ...f0, ...n1, ...f1);
      for (let q = 0; q < 6; q++) FC.push(1, 1, 1, fill);
      // leading edge firm, the rest structural and quiet
      EP.push(...n0, ...n1); EC.push(1, 1, 1, 0.4, 1, 1, 1, 0.4);
      EP.push(...n0, ...f0, ...n1, ...f1, ...f0, ...f1);
      EC.push(1, 1, 1, 0.2, 1, 1, 1, 0.12, 1, 1, 1, 0.2, 1, 1, 1, 0.12, 1, 1, 1, 0.1, 1, 1, 1, 0.1);
    });
    mesh(FP, FC, mats.plane, 2);
    lines(EP, EC, mats.edges, 3);

    // ===================== 4. CROSSING NODES =====================
    // Ember only on the Signal: a small node where it meets each plane, a
    // slightly larger one where it leaves the field.
    const NP = [];
    const node = (aa, size) => {
      const z = (aa === C.end ? DEPTH.exit : zAt(aa)) + 1, [cx, cy] = P(aa, C.mid), h = size / 2;
      const q = [place(cx - h, cy - h, z), place(cx + h, cy - h, z), place(cx - h, cy + h, z), place(cx + h, cy + h, z)];
      NP.push(...q[0], ...q[2], ...q[1], ...q[1], ...q[2], ...q[3]);
    };
    pl.forEach((p) => node(p.a, horiz ? 4 : 3.5));
    node(C.end, horiz ? 6 : 5);
    mesh(NP, null, mats.node, 4);

    // local debug: scene bounds for the review report
    if (ctx.debug) {
      const box = new THREE.Box3().setFromObject(scene);
      window.__signalU = { comp: horiz ? 'desktop' : 'mobile', mirror, bounds: { min: box.min.toArray().map(Math.round), max: box.max.toArray().map(Math.round) }, marks: MC.length / 24, svgRect: { x: Math.round(ox), y: Math.round(oy), w: Math.round(C.vb[0] * s), h: Math.round(C.vb[1] * s) } };
    }
  }

  function setCamera() {
    D = (H / 2) / Math.tan((camera.fov * Math.PI / 180) / 2);   // 1 world unit = 1 CSS px at z = 0
    camera.aspect = W / H; camera.near = 1; camera.far = D + 4000;
    if (depthView) {   // local debug only: angled view to verify the layers in depth
      camera.position.set(D * 0.55, D * 0.32, D * 0.62);
      camera.lookAt(0, 0, -180);
    } else {
      camera.position.set(0, 0, D); camera.lookAt(0, 0, 0);
    }
    camera.updateProjectionMatrix();
  }

  return {
    init() {
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(34, 1, 1, 6000);   // a touch more perspective than the Hero: the planes need it
      mats = materials();
      // a language switch flips the direction in place: re-lay out to stay on the (mirrored) fallback
      dirWatch = new MutationObserver(() => { if (scene && lastCtx) { layout(lastCtx); ctx.requestFrame('direction'); } });
      dirWatch.observe(document.documentElement, { attributes: true, attributeFilter: ['dir'] });
    },
    activate() {},
    deactivate() {},
    setProgress() {},                 // U1: the resolved blockout state (scroll story comes after approval)
    setPointer() { return false; },   // no pointer response in Understanding
    resize(w, h, dpr, c) {
      W = w; H = h; lastCtx = c; setCamera(); layout(c);
      if (!fontsHooked && document.fonts && document.fonts.status !== 'loaded') {
        fontsHooked = true;
        document.fonts.ready.then(() => { if (scene && lastCtx) { layout(lastCtx); ctx.requestFrame('fonts'); } });
      }
    },
    render(renderer) { renderer.render(scene, camera); },
    wantsFrame() { return false; },
    dispose() { if (dirWatch) dirWatch.disconnect(); dirWatch = null; clearBuilt(); scene = null; },
  };
}
