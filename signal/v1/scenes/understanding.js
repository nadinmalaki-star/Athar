/*
 * Scene: understanding  —  U1 spatial blockout (approved, locked) + U2 scroll filtering.
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
 * U2 — SCROLL FILTERING. The approved U1 layout is the processed ("understood")
 * state and is generated exactly as approved (same seed, same call order). U2
 * adds, from a second fixed seed, where every element comes FROM: survivors
 * start fragmented, scattered and deep, and are processed into their rows;
 * transient marks exist only before a filter and are removed by it (they
 * collapse onto the nearest row); the noise field itself quietens and settles
 * once the Signal has been filtered. A "filter front" moves along the Signal
 * with section progress and processes each element as it passes — position,
 * depth, alignment, length and opacity together, never opacity alone. Pure
 * function of progress: deterministic, reversible, nothing re-seeded on scroll,
 * and it renders only when progress changes (no frame loop).
 *
 * Contract: init() activate() setProgress(p) setPointer(x, y) resize(w, h, dpr, ctx)
 *           render(renderer) wantsFrame() deactivate() dispose()
 * No pointer response (setPointer returns false: the core renders nothing for it).
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
    // U2: the story. R = how long (axis units) an element takes to be processed;
    // transient = marks that only exist before each filter; raw = how unprocessed things start
    story: { R: 150, transient: [22, 12, 6], scatter: [18, 34, 20], rawSignal: 3.4, quietRow: 22 },
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
    // phones: shorter processing distance (short scroll), fewer transients, the
    // scatter runs ACROSS the vertical Signal (marks lie across it)
    story: { R: 70, transient: [10, 6, 3], scatter: [26, 30, 14], rawSignal: 3.0, quietRow: 14 },
  },
};
// Depth: the Signal rises from deep (entry) to near (exit); each plane sits at
// its own depth and the Signal crosses it halfway through its thickness.
const DEPTH = { entry: -340, planes: [-250, -160, -70], planeDz: [140, 124, 108], exit: -12 };
const TIER_SCALE = { A: 1, B: 1, C: 0.62 };
// Desktop: the story runs over this part of the section's progress (the field
// is fully on screen through it). Phones: a reading line in the viewport — a
// plane processes as it reaches that line while scrolling down.
const DESKTOP_RANGE = [0.27, 0.6], PHONE_READ_LINE = 0.66;

export function create(ctx) {
  const THREE = ctx.THREE;
  let scene, camera, D = 1000, W = 1, H = 1, mats = null;
  const built = [];
  const params = new URLSearchParams(location.search);
  const depthView = ctx.debug && params.get('signal-view') === 'depth';
  // local debug only: pin the story (0 = entry/noise … 1 = exit) for review
  const forcedT = ctx.debug && params.has('signal-state') ? clamp01(parseFloat(params.get('signal-state')) || 0) : null;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;   // → the resolved state, no filtering motion
  let lastCtx = null, fontsHooked = false, dirWatch = null;
  let story = null;                 // built per layout: everything the story needs
  let lastP = 0.5;

  function place(sx, sy, z) { const k = (D - z) / D; return [(sx - W / 2) * k, (H / 2 - sy) * k, z]; }

  function materials() {
    return {
      // information marks + neutral structure: off-white, alpha carries the hierarchy
      marks: ctx.track(new THREE.MeshBasicMaterial({ color: 0xe9e6df, vertexColors: true, transparent: true, depthWrite: false })),
      plane: ctx.track(new THREE.MeshBasicMaterial({ color: 0xe9e6df, vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide })),
      edges: ctx.track(new THREE.LineBasicMaterial({ color: 0xe9e6df, vertexColors: true, transparent: true, depthWrite: false })),
      node: ctx.track(new THREE.MeshBasicMaterial({ color: 0xff5a36, vertexColors: true, transparent: true, depthWrite: false })),
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
  // dynamic buffers: rewritten in place when progress changes (no reallocation)
  function dyn(n, size) { const a = new THREE.BufferAttribute(new Float32Array(n * size), size); a.setUsage(THREE.DynamicDrawUsage); return a; }

  // ---------------------------------------------------------------------------
  function layout(c) {
    clearBuilt();
    story = null;
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
    const rnd = prng(horiz ? 23 : 29);          // U1 (approved layout) — call order must never change
    const rnd2 = prng(horiz ? 1023 : 1029);     // U2 (where things come from) — separate, so U1 stays exact
    const pl = C.planes, ST = C.story;
    const mids = pl.map((p) => p.a + p.t / 2);

    // Signal depth along the axis: entry → crossing each plane mid → exit
    const zKeys = [[0, DEPTH.entry], ...mids.map((m, i) => [m, DEPTH.planes[i]]), [C.end, DEPTH.exit]];
    const zAt = (a) => { for (let i = 0; i < zKeys.length - 1; i++) { const [a0, z0] = zKeys[i], [a1, z1] = zKeys[i + 1]; if (a <= a1) return lerp(z0, z1, clamp01((a - a0) / (a1 - a0))); } return DEPTH.exit; };
    // which stage a point on the axis is in (0 noise … 3 clear), fractional across a plane
    const stageAt = (a) => { let st = 0; for (let i = 0; i < pl.length; i++) st += smooth((a - pl[i].a) / pl[i].t); return st; };

    // ===================== 1. THE SIGNAL (U1 path, exactly) =====================
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
    // U2: subdivide the approved polyline (identical shape) so irregularity can be
    // added back point by point; each point knows its unprocessed offset.
    const sig = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i], p1 = pts[i + 1], n = Math.max(1, Math.ceil((p1.a - p0.a) / 16));
      for (let k = 0; k < n; k++) {
        const t = k / n;
        sig.push({ a: lerp(p0.a, p1.a, t), b: lerp(p0.b, p1.b, t), z: lerp(p0.z, p1.z, t), al: lerp(p0.al, p1.al, t), w: lerp(p0.w, p1.w, t) });
      }
    }
    sig.push({ ...pts[pts.length - 1] });
    let sgn = 1;
    for (const q of sig) {
      // before processing, the stretch beyond filter 1 is as restless as the field
      // it came from; the noisy entry itself is already at its approved irregularity
      const amp = ST.rawSignal * smooth((q.a - pl[0].a) / pl[0].t) * (q.a >= C.end ? 0 : 1);
      if (rnd2() < 0.85) sgn = -sgn;
      q.rawB = q.b + sgn * amp * (0.3 + 0.7 * rnd2());
      q.rawAl = Math.min(q.al, 0.5); q.rawW = Math.min(q.w, C.width[0] + 0.1);
    }

    // ===================== 2. INFORMATION MARKS (U1 layout, exactly) =====================
    // Every mark: a state it comes FROM and the state it is processed TO, plus
    // what drives it. kind: 'noise' (the field: quietens), 'kept' (processed into
    // its approved row), 'gone' (exists only before the filter, then removed).
    const marks = [];
    const thick = 1.6;
    const quad = (ca, cb, z, la, lb, A, zone) => marks.push({ zone, to: { ca, cb, z, la, lb, A } });
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
          quad(ca, cb, zAt(ca) + (rnd() * 2 - 1) * Z.dz, thick, Math.round(len / 2) * 2, lerp(Z.alpha[0], Z.alpha[1], rnd()), zi);
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
        if (vert) quad(ca, b, z, thick, len, A, zi); else quad(ca, b, z, len, thick, A, zi);
        made++;
      }
    });
    // exit: only a few meaningful marks remain — registration ticks on the Signal's own depth
    for (const t of C.exitTicks) quad(t, C.mid + (horiz ? 17 : 12), zAt(t), thick, 7, 0.42, 3);

    // ---- U2: where each mark comes from (rnd2 only) ----
    const lenKey = (m) => (m.la >= m.lb ? 'la' : 'lb');      // which extent is the mark's length
    const nearestRow = (b, pitch) => C.mid + Math.round((b - C.mid) / pitch) * pitch;
    const zoneA = (zi) => (zi < 3 ? C.zones[zi].a : [pl[2].a + pl[2].t + 12, C.end - 24]);
    const zoneB = (zi) => (zi < 3 ? C.zones[zi].b : (horiz ? 40 : 30));
    const R = ST.R;
    for (const m of marks) {
      const T = m.to;
      if (m.zone === 0) {
        // the field: it IS the start state; once the Signal is filtered it quietens —
        // about half is removed, the rest drops back, compresses in depth and
        // half-aligns to rows (reorganised, not erased)
        m.kind = 'noise'; m.from = { ...T };
        const removed = rnd2() < 0.45, k = lenKey(T);
        m.to = { ...T,
          cb: lerp(T.cb, removed ? C.mid + (T.cb - C.mid) * 0.75 : nearestRow(T.cb, ST.quietRow), removed ? 1 : 0.45),
          z: removed ? T.z - 40 : lerp(T.z, zAt(T.ca) - 30, 0.65),
          A: removed ? 0 : T.A * 0.42 };
        m.to[k] = removed ? 0 : T[k] * 0.85;
        // each noise mark settles at its own moment, from filter 1 to the exit
        m.at = pl[0].a + rnd2() * (C.end - pl[0].a - R * 0.5);
      } else {
        // survivors: fragmented, scattered, deeper and faint before their filter
        m.kind = 'kept';
        const sc = ST.scatter[Math.min(2, m.zone - 1)], k = lenKey(T);
        m.from = { ...T,
          ca: T.ca + (rnd2() * 2 - 1) * (horiz ? 14 : 8),
          cb: T.cb + (rnd2() * 2 - 1) * sc,
          z: T.z + (rnd2() * 2 - 1) * 60,
          A: T.A * 0.4 };
        m.from[k] = T[k] * (0.35 + 0.45 * rnd2());
        m.at = T.ca;
      }
    }
    // transients: information that only exists before each filter; the filter removes it
    [1, 2, 3].forEach((zi) => {
      const n = Math.round(ST.transient[zi - 1] * scale), [a0, a1] = zoneA(zi), bb = zoneB(zi);
      for (let i = 0; i < n; i++) {
        const len = lerp(6, zi === 1 ? 40 : 30, rnd2()), ca = lerp(a0, a1, rnd2());
        const cb = C.mid + (rnd2() * 2 - 1) * bb;
        if (horiz && Math.abs(cb - C.mid) < 8) continue;   // desktop keeps the Signal's lane clear
        const from = horiz ? { ca, cb, z: zAt(ca) + (rnd2() * 2 - 1) * 60, la: len, lb: thick, A: 0.12 + 0.12 * rnd2() }
                           : { ca, cb, z: zAt(ca) + (rnd2() * 2 - 1) * 50, la: thick, lb: len, A: 0.12 + 0.12 * rnd2() };
        // removed: it collapses onto the structure it was filtered into (desktop: the
        // nearest row; phones: toward the vertical Signal) — never just fades in place
        const to = { ...from, cb: horiz ? nearestRow(cb, zi === 3 ? 17 : C.zones[Math.min(2, zi)].rows) : lerp(cb, C.mid, 0.45), z: zAt(ca), A: 0 };
        to[horiz ? 'la' : 'lb'] = 0;
        marks.push({ kind: 'gone', zone: zi, from, to, at: ca });
      }
    });

    const mGeo = new THREE.BufferGeometry();
    mGeo.setAttribute('position', dyn(marks.length * 6, 3));
    mGeo.setAttribute('color', dyn(marks.length * 6, 4));
    add(new THREE.Mesh(mGeo, mats.marks), 1);

    // ===================== 3. FILTER PLANES (U1 geometry) =====================
    const FP = [], EP = [];
    pl.forEach((p, i) => {
      const zc = DEPTH.planes[i], dz = DEPTH.planeDz[i], zn = zc + dz / 2, zf = zc - dz / 2;
      const [lx, ly] = P(p.a, C.mid), [tx, ty] = P(p.a + p.t, C.mid);
      const near = place(lx, ly, zn), far = place(tx, ty, zf);
      const k = (D - zn) / D, hw = p.h * s * k;               // world half-extent across the axis
      const tilt = (i - 1) * 3 * s;                          // a slightly different orientation each
      const corners = horiz
        ? [[near[0], near[1] + hw, zn], [near[0], near[1] - hw, zn], [far[0], far[1] + hw + tilt, zf], [far[0], far[1] - hw + tilt, zf]]
        : [[near[0] - hw, near[1], zn], [near[0] + hw, near[1], zn], [far[0] - hw + tilt, far[1], zf], [far[0] + hw + tilt, far[1], zf]];
      const [n0, n1, f0, f1] = corners;
      FP.push(...n0, ...n1, ...f0, ...f0, ...n1, ...f1);
      EP.push(...n0, ...n1, ...n0, ...f0, ...n1, ...f1, ...f0, ...f1);
    });
    const fGeo = new THREE.BufferGeometry();
    fGeo.setAttribute('position', new THREE.Float32BufferAttribute(FP, 3)); fGeo.setAttribute('color', dyn(FP.length / 3, 4));
    add(new THREE.Mesh(fGeo, mats.plane), 2);
    const eGeo = new THREE.BufferGeometry();
    eGeo.setAttribute('position', new THREE.Float32BufferAttribute(EP, 3)); eGeo.setAttribute('color', dyn(EP.length / 3, 4));
    add(new THREE.LineSegments(eGeo, mats.edges), 3);

    // ===================== 4. SIGNAL + CROSSING NODES (dynamic) =====================
    const sGeo = new THREE.BufferGeometry();
    const nSeg = sig.length - 1;
    sGeo.setAttribute('position', dyn(nSeg * 4, 3));
    sGeo.setAttribute('aA', dyn(nSeg * 4, 1));
    const acr = new Float32Array(nSeg * 4), idx = [];
    for (let i = 0; i < nSeg; i++) { acr.set([-1, 1, -1, 1], i * 4); const v = i * 4; idx.push(v, v + 1, v + 2, v + 1, v + 3, v + 2); }
    sGeo.setAttribute('aAcross', new THREE.BufferAttribute(acr, 1));
    sGeo.setIndex(idx);
    add(new THREE.Mesh(sGeo, mats.signal), 0);
    const nodes = [...pl.map((p) => ({ a: p.a, size: horiz ? 4 : 3.5 })), { a: C.end, size: horiz ? 6 : 5, exit: true }];
    const nGeo = new THREE.BufferGeometry();
    nGeo.setAttribute('position', dyn(nodes.length * 6, 3)); nGeo.setAttribute('color', dyn(nodes.length * 6, 4));
    add(new THREE.Mesh(nGeo, mats.node), 4);

    story = { C, P, s, ox, oy, horiz, zAt, sig, sGeo, marks, mGeo, nodes, nGeo, fGeo, eGeo, pl, R };

    if (ctx.debug) window.__signalU = { comp: horiz ? 'desktop' : 'mobile', mirror, marks: marks.length, kept: marks.filter((m) => m.kind === 'kept').length, transient: marks.filter((m) => m.kind === 'gone').length, svgRect: { x: Math.round(ox), y: Math.round(oy), w: Math.round(C.vb[0] * s), h: Math.round(C.vb[1] * s) } };
  }

  // ---------------------------------------------------------------------------
  // The story: a filter front along the axis (viewBox units). Elements are
  // processed as it passes them; everything is a pure function of the front.
  function frontFor(p) {
    const S = story, C = S.C, R = S.R;
    // nothing is processed before filter 1 (the field is the source), so the
    // front starts just ahead of it: ~1/3 = stage 1 done, ~2/3 = stage 2, 1 = exit
    const span = (t) => lerp(S.pl[0].a - 20, C.end + R, t);
    if (reduced) return span(1);
    if (forcedT != null) return span(forcedT);
    if (S.horiz) return span(clamp01((p - DESKTOP_RANGE[0]) / (DESKTOP_RANGE[1] - DESKTOP_RANGE[0])));
    // phones: where the reading line falls on the scene, in viewBox units
    const vh = innerHeight, wrapTop = vh - p * (H + vh);
    return Math.max(-R, Math.min(C.end + R, (PHONE_READ_LINE * vh - wrapTop - S.oy) / S.s));
  }

  function applyStory(front) {
    const S = story; if (!S) return;
    const { C, P, s, horiz, sig, marks, nodes, pl, R } = S;
    const done = (a, span) => smooth((front - a) / (span || R));   // 0 = untouched … 1 = processed

    // Signal: irregularity is reduced where the front has passed; strength follows
    const sp = S.sGeo.attributes.position.array, sa = S.sGeo.attributes.aA.array;
    const xy = sig.map((q) => { const u = done(q.a); return { u, p: P(q.a, lerp(q.rawB, q.b, u)) }; });
    for (let i = 0; i < sig.length - 1; i++) {
      const q0 = sig[i], q1 = sig[i + 1], A = xy[i], B = xy[i + 1];
      const [x0, y0] = A.p, [x1, y1] = B.p, dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1;
      const ends = [[x0, y0, q0.z, lerp(q0.rawW, q0.w, A.u), lerp(q0.rawAl, q0.al, A.u)], [x1, y1, q1.z, lerp(q1.rawW, q1.w, B.u), lerp(q1.rawAl, q1.al, B.u)]];
      ends.forEach(([x, y, z, w, al], e) => {
        const nx = -dy / len * w / 2, ny = dx / len * w / 2, o = (i * 4 + e * 2) * 3;
        sp.set(place(x - nx, y - ny, z), o); sp.set(place(x + nx, y + ny, z), o + 3);
        sa[i * 4 + e * 2] = al; sa[i * 4 + e * 2 + 1] = al;
      });
    }
    S.sGeo.attributes.position.needsUpdate = true; S.sGeo.attributes.aA.needsUpdate = true;

    // marks: position, depth, alignment, length and opacity together
    const mp = S.mGeo.attributes.position.array, mc = S.mGeo.attributes.color.array;
    marks.forEach((m, i) => {
      const u = done(m.at), F = m.from, T = m.to;
      const ca = lerp(F.ca, T.ca, u), cb = lerp(F.cb, T.cb, u), z = lerp(F.z, T.z, u);
      const la = lerp(F.la, T.la, u), lb = lerp(F.lb, T.lb, u), A = lerp(F.A, T.A, u);
      const [cx, cy] = P(ca, cb), c3 = place(cx, cy, z);
      const hx = (horiz ? la : lb) * s / 2, hy = (horiz ? lb : la) * s / 2, o = i * 18;
      const v = [[-hx, hy], [-hx, -hy], [hx, hy], [hx, hy], [-hx, -hy], [hx, -hy]];
      v.forEach(([dx, dy], k) => { mp[o + k * 3] = c3[0] + dx; mp[o + k * 3 + 1] = c3[1] + dy; mp[o + k * 3 + 2] = z; });
      for (let k = 0; k < 6; k++) { const c = i * 24 + k * 4; mc[c] = 1; mc[c + 1] = 1; mc[c + 2] = 1; mc[c + 3] = A; }
    });
    S.mGeo.attributes.position.needsUpdate = true; S.mGeo.attributes.color.needsUpdate = true;

    // planes: quiet and neutral until the Signal crosses; then their approved
    // (U1) presence — a slight edge/readability change, nothing more
    const fc = S.fGeo.attributes.color.array, ec = S.eGeo.attributes.color.array;
    pl.forEach((p, i) => {
      const u = done(p.a, R * 0.6), fill = lerp(0.026, 0.035 + 0.012 * i, u);
      for (let k = 0; k < 6; k++) fc.set([1, 1, 1, fill], (i * 6 + k) * 4);
      const lead = lerp(0.3, 0.4, u), rest = lerp(0.75, 1, u);
      [lead, lead, 0.2 * rest, 0.12 * rest, 0.2 * rest, 0.12 * rest, 0.1 * rest, 0.1 * rest].forEach((al, k) => ec.set([1, 1, 1, al], (i * 8 + k) * 4));
    });
    S.fGeo.attributes.color.needsUpdate = true; S.eGeo.attributes.color.needsUpdate = true;

    // nodes: Ember only here — each crossing becomes legible once the Signal has
    // been filtered there; the exit marker never moves (exactly where U1 places it)
    const np = S.nGeo.attributes.position.array, nc = S.nGeo.attributes.color.array;
    nodes.forEach((n, i) => {
      const u = n.exit ? done(n.a - R * 0.6, R * 0.6) : done(n.a, R * 0.6);
      const size = n.size * (n.exit ? 1 : lerp(0.7, 1, u)), al = lerp(n.exit ? 0.4 : 0.3, 0.9, u);
      const z = (n.exit ? DEPTH.exit : S.zAt(n.a)) + 1, [cx, cy] = P(n.a, C.mid), h = size / 2;
      const q = [place(cx - h, cy - h, z), place(cx + h, cy - h, z), place(cx - h, cy + h, z), place(cx + h, cy + h, z)];
      [q[0], q[2], q[1], q[1], q[2], q[3]].forEach((v, k) => { np.set(v, (i * 6 + k) * 3); nc.set([1, 1, 1, al], (i * 6 + k) * 4); });
    });
    S.nGeo.attributes.position.needsUpdate = true; S.nGeo.attributes.color.needsUpdate = true;

    if (ctx.debug && window.__signalU) window.__signalU.front = Math.round(front);
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

  function relayout(c) { layout(c); if (story) applyStory(frontFor(lastP)); }

  return {
    init() {
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(34, 1, 1, 6000);   // a touch more perspective than the Hero: the planes need it
      mats = materials();
      // a language switch flips the direction in place: re-lay out to stay on the (mirrored) fallback
      dirWatch = new MutationObserver(() => { if (scene && lastCtx) { relayout(lastCtx); ctx.requestFrame('direction'); } });
      dirWatch.observe(document.documentElement, { attributes: true, attributeFilter: ['dir'] });
    },
    activate() {},
    deactivate() {},
    // Scroll-driven directly: one frame per progress change (the core requests
    // it); nothing keeps animating afterwards.
    setProgress(p) { lastP = p; if (story) applyStory(frontFor(p)); },
    setPointer() { return false; },   // no pointer response in Understanding
    resize(w, h, dpr, c) {
      W = w; H = h; lastCtx = c; setCamera(); relayout(c);
      if (!fontsHooked && document.fonts && document.fonts.status !== 'loaded') {
        fontsHooked = true;
        document.fonts.ready.then(() => { if (scene && lastCtx) { relayout(lastCtx); ctx.requestFrame('fonts'); } });
      }
    },
    render(renderer) { renderer.render(scene, camera); },
    wantsFrame() { return false; },
    dispose() { if (dirWatch) dirWatch.disconnect(); dirWatch = null; clearBuilt(); story = null; scene = null; },
  };
}
