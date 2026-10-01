/*
 * Scene: build  —  Section 03 "What should actually be built?"  ·  S03 BLOCKOUT.
 *
 * One structure, six possible configurations. A single spatial lattice (the
 * same nodes, each keeping its identity) re-forms with scroll:
 *   unresolved core → Experience → Product → System → Portal → Automation →
 *   AI Layer → neutral configurable core (all six latent, none selected).
 * The Ember Signal is the problem's thread: the route it would take through
 * the configuration currently shown. Blockout only: neutral materials, simple
 * light, no final transitions, no bridge from Understanding.
 *
 * Its own visual logic: an open node-and-member lattice that changes its own
 * shape — no slabs (Hero), no filter planes (Understanding), no cards, no icons.
 *
 * The canvas lives in the sticky stage (meta.mount) while progress comes from
 * the whole flow (the scene's section): the state follows whichever outcome row
 * is at the reading line. Deterministic and reversible: a pure function of
 * scroll. No pointer response. Frames only while progress changes.
 *
 * The geometry generator (makeStates) is pure and three-free, so the static
 * fallback SVG is generated from exactly the same structure.
 */

export const meta = {
  name: 'build',
  budget: { drawCalls: 40, triangles: { desktop: 60000, mobile: 20000 } },   // ceilings, not targets
  replacesFallback: true,
  zIndex: 1,
  mount: '.build-stage',
};

const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (t) => Math.min(1, Math.max(0, t));
const smooth = (t) => { t = clamp01(t); return t * t * (3 - 2 * t); };
function prng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

export const ORDER = ['core', 'experience', 'product', 'system', 'portal', 'automation', 'ai', 'core'];

// ---------------------------------------------------------------------------
// The structure: N nodes (36 desktop, 24 phones). Every state places the SAME
// nodes. Units: about -1.8 … 1.8; +x is the direction the problem travels.
// Returns { name: { pos: [[x,y,z]], edges: [[a,b]], route: [i] } }.
// ---------------------------------------------------------------------------
export function makeStates(N) {
  const big = N >= 36, rnd = prng(big ? 7 : 11), jit = (s) => (rnd() - 0.5) * s;
  const chain = (a, b) => Array.from({ length: b - a }, (_, k) => [a + k, a + k + 1]);
  const S = {};

  { // unresolved core: six loose modules, purpose not decided
    const per = N / 6, C = [[-1.1, 0.5, 0.3], [0.2, 0.9, -0.6], [1.2, 0.2, 0.5], [-0.6, -0.6, -0.4], [0.8, -0.5, 0.2], [-0.1, 0.0, 0.9]];
    const pos = [], edges = [];
    for (let g = 0; g < 6; g++) for (let k = 0; k < per; k++) pos.push([C[g][0] + jit(0.6), C[g][1] + jit(0.6), C[g][2] + jit(0.6)]);
    for (let g = 0; g < 6; g++) { const b = g * per; edges.push([b, b + 1], [b + 1, b + 2]); if (per > 4) edges.push([b + 3, b + 4]); }
    S.core = { pos, edges, route: [5 * per, 5 * per + 1, 2 * per, 2 * per + 1] };
  }
  { // Experience: a sequence of frames receding as one pathway
    const F = big ? 6 : 4, P = N - 4 * F, pos = [], edges = [];
    for (let f = 0; f < F; f++) { const t = f / (F - 1), x = -1.6 + t * 3.2, z = 0.6 - t * 1.4, y = 0.15 * Math.sin(t * 3), s = 0.62 - t * 0.18;
      for (let c = 0; c < 4; c++) pos.push([x, y + (c < 2 ? s : -s), z + (c % 2 ? s : -s) * 0.6]);
      const b = f * 4; edges.push([b, b + 1], [b + 1, b + 3], [b + 3, b + 2], [b + 2, b]); }
    for (let k = 0; k < P; k++) { const t = k / (P - 1); pos.push([-1.6 + t * 3.2, -0.05 + 0.15 * Math.sin(t * 3), 0.6 - t * 1.4]); }
    edges.push(...chain(4 * F, N - 1));
    S.experience = { pos, edges, route: Array.from({ length: P }, (_, k) => 4 * F + k) };
  }
  { // Product: components lock into one coherent, bounded object
    const E = big ? 12 : 8, per = E / 4, Rn = N - 8 - E, rows = Rn / 4, pos = [], edges = [];
    for (let i = 0; i < 8; i++) pos.push([i & 1 ? 0.9 : -0.9, i & 2 ? 0.6 : -0.6, i & 4 ? 0.45 : -0.45]);
    for (let e = 0; e < 4; e++) for (let k = 0; k < per; k++) { const t = (k + 1) / (per + 1); pos.push([-0.9 + t * 1.8, e & 1 ? 0.6 : -0.6, e & 2 ? 0.45 : -0.45]); }
    for (let r = 0; r < rows; r++) for (let c = 0; c < 4; c++) pos.push([-0.6 + c * 0.4, rows > 1 ? -0.4 + r * (0.8 / (rows - 1)) : 0, 0.46]);
    edges.push([0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]);
    const g0 = 8 + E;
    for (let r = 0; r < rows; r++) for (let c = 0; c < 4; c++) { const i = g0 + r * 4 + c; if (c < 3) edges.push([i, i + 1]); if (r < rows - 1) edges.push([i, i + 4]); }
    const mid = g0 + Math.floor(rows / 2) * 4;
    S.product = { pos, edges, route: [4, mid, mid + 1, mid + 2, mid + 3, 5] };
  }
  { // System: modules connect into a structured operating network (three layers)
    const per = N / 3, cols = 4, rows = per / cols, pos = [], edges = [];
    for (let l = 0; l < 3; l++) for (let k = 0; k < per; k++) { const gx = k % cols, gy = Math.floor(k / cols);
      pos.push([-1.2 + gx * 0.8, -0.75 + l * 0.75, rows > 1 ? -0.7 + gy * (1.4 / (rows - 1)) : 0]); }
    for (let l = 0; l < 3; l++) for (let k = 0; k < per; k++) { const i = l * per + k; if (k % cols < cols - 1) edges.push([i, i + 1]); if (k < per - cols) edges.push([i, i + cols]); }
    const hubs = big ? [1, 6, 9] : [1, 6];
    for (const h of hubs) edges.push([h, h + per], [h + per, h + 2 * per]);
    S.system = { pos, edges, route: [0, 1, 1 + per, 2 + per, 2 + 2 * per, 3 + 2 * per] };
  }
  { // Portal: one central access layer → distinct roles / destinations
    const C = (N - 8) / 4, pos = [], edges = [];
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; pos.push([0.38 * Math.cos(a), 0.38 * Math.sin(a), 0]); }
    for (let c = 0; c < 4; c++) { const a = c / 4 * Math.PI * 2 + Math.PI / 4, cx = 1.45 * Math.cos(a), cy = 0.95 * Math.sin(a), cz = c % 2 ? -0.5 : 0.5;
      for (let k = 0; k < C; k++) { if (k === 0) { pos.push([cx, cy, cz]); continue; } const b = (k - 1) / (C - 1) * Math.PI * 2; pos.push([cx + 0.22 * Math.cos(b), cy + 0.22 * Math.sin(b), cz + jit(0.12)]); } }
    edges.push(...chain(0, 7), [7, 0]);
    for (let c = 0; c < 4; c++) { const h = 8 + c * C; edges.push([c * 2, h]); for (let k = 1; k < C; k++) edges.push([h, h + k]); }
    S.portal = { pos, edges, route: [8 + 2 * C, 4, 3, 2, 8 + C] };
  }
  { // Automation: repeated parallel paths collapse into one controlled flow
    const L = big ? 6 : 4, Cn = N - 4 * L, pos = [], edges = [];
    for (let p = 0; p < 4; p++) for (let k = 0; k < L; k++) { const t = k / (L - 1), lane = (p - 1.5) * 0.42; pos.push([-1.7 + t * 1.5, lane * (1 - t * 0.85), (p % 2 ? 0.3 : -0.3) * (1 - t)]); }
    for (let k = 0; k < Cn; k++) { const t = k / (Cn - 1); pos.push([t * 1.75, 0, 0]); }
    for (let p = 0; p < 4; p++) { edges.push(...chain(p * L, p * L + L - 1)); edges.push([p * L + L - 1, 4 * L]); }
    edges.push(...chain(4 * L, N - 1));
    S.automation = { pos, edges, route: [...Array.from({ length: L }, (_, k) => L + k), ...Array.from({ length: Cn }, (_, k) => 4 * L + k)] };
  }
  { // AI Layer: an interpreting layer above an existing structure
    const bx = big ? 6 : 4, by = 4, base = bx * by, lx = 4, ly = (N - base) / lx, pos = [], edges = [];
    for (let i = 0; i < base; i++) { const gx = i % bx, gy = Math.floor(i / bx); pos.push([-1.25 + gx * (2.5 / (bx - 1)), -0.65, -0.75 + gy * 0.5]); }
    for (let i = 0; i < N - base; i++) { const gx = i % lx, gy = Math.floor(i / lx); pos.push([-0.75 + gx * 0.5, 0.55, ly > 1 ? -0.5 + gy * (1 / (ly - 1)) : 0]); }
    for (let i = 0; i < base; i++) { if (i % bx < bx - 1) edges.push([i, i + 1]); if (i < base - bx) edges.push([i, i + bx]); }
    for (let i = 0; i < N - base; i++) { const j = base + i; if (i % lx < lx - 1) edges.push([j, j + 1]); if (i < N - base - lx) edges.push([j, j + lx]); }
    // fine verticals: the layer reads the structure beneath it
    for (let i = 0; i < N - base; i += 2) { const p = pos[base + i]; let best = 0, bd = 1e9; for (let k = 0; k < base; k++) { const d = (pos[k][0] - p[0]) ** 2 + (pos[k][2] - p[2]) ** 2; if (d < bd) { bd = d; best = k; } } edges.push([base + i, best]); }
    const top = base + Math.floor(ly / 2) * lx;
    S.ai = { pos, edges, route: [bx, bx + 1, top + 1, top + 2, top + 3, bx + 3] };
  }
  return S;
}

// Orientation: desktop flows along +x (mirrored for RTL); phones flow DOWN the
// stage (the vertical reading order), never mirrored.
export function orient(p, mode, rtl) {
  if (mode === 'mobile') return [p[1], -p[0], p[2]];
  return rtl ? [-p[0], p[1], p[2]] : p;
}
export const ENTRY = [-2.35, 0.15, 0.2];                       // where the problem arrives (before orient)
export const VIEW = { desktop: { yaw: 0.52, pitch: 0.3 }, mobile: { yaw: 0.28, pitch: 0.22 } };

export function create(ctx) {
  const THREE = ctx.THREE;
  let scene, camera, D = 1000, W = 1, H = 1, mats = null;
  const built = [];
  const params = new URLSearchParams(location.search);
  const depthView = ctx.debug && params.get('signal-view') === 'depth';
  const idsView = ctx.debug && params.get('signal-view') === 'ids';     // local debug: colour nodes by identity
  const forcedT = ctx.debug && params.has('signal-state') ? clamp01(parseFloat(params.get('signal-state')) || 0) * 7 : null;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let L = null, lastP = 0, lastCtx = null, fontsHooked = false, dirWatch = null;

  function materials() {
    return {
      node: ctx.track(new THREE.MeshLambertMaterial({ color: 0xffffff })),
      members: ctx.track(new THREE.LineBasicMaterial({ color: 0xd9d6cf, vertexColors: true, transparent: true, depthWrite: false })),
      latent: ctx.track(new THREE.LineBasicMaterial({ color: 0xd9d6cf, transparent: true, opacity: 0, depthWrite: false })),
      signal: ctx.track(new THREE.MeshBasicMaterial({ color: 0xff5a36, transparent: true, opacity: 0.92, depthWrite: false, side: THREE.DoubleSide })),
    };
  }
  function clearBuilt() { for (const o of built) { o.removeFromParent(); if (o.isInstancedMesh) o.dispose(); if (o.geometry) o.geometry.dispose(); } built.length = 0; }
  function add(o, order) { o.renderOrder = order || 0; scene.add(o); built.push(o); return o; }
  function dyn(n, size) { const a = new THREE.BufferAttribute(new Float32Array(n * size), size); a.setUsage(THREE.DynamicDrawUsage); return a; }

  // ---------------------------------------------------------------------------
  function layout(c) {
    clearBuilt(); L = null;
    const mode = c.mode === 'mobile' ? 'mobile' : 'desktop';
    const rtl = document.documentElement.dir === 'rtl';
    const N = mode === 'mobile' || c.tier === 'C' ? 24 : 36;
    const S = makeStates(N);
    const V = VIEW[mode], yaw = (rtl && mode !== 'mobile' ? -1 : 1) * V.yaw, pitch = V.pitch;
    // world: structure units → px, fitted to the stage
    const k = mode === 'mobile' ? Math.min(W * 0.36, H * 0.2) : Math.min(W * 0.23, H * 0.3);
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const toWorld = (p0) => { const p = orient(p0, mode, rtl);
      const x = p[0] * cy - p[2] * sy, z = p[0] * sy + p[2] * cy;
      const y = p[1] * cp - z * sp, z2 = p[1] * sp + z * cp;
      return [x * k, y * k, z2 * k]; };
    const states = ORDER.map((n) => S[n]);
    const W3 = states.map((st) => st.pos.map(toWorld));
    const entry = toWorld(ENTRY);
    // all members across all states (the union), each knows the states it belongs to
    const key = (a, b) => (a < b ? a + '-' + b : b + '-' + a);
    const edgeIx = new Map(), edges = [];
    states.forEach((st, si) => st.edges.forEach(([a, b]) => { const kk = key(a, b); if (!edgeIx.has(kk)) { edgeIx.set(kk, edges.length); edges.push({ a, b, in: new Set() }); } edges[edgeIx.get(kk)].in.add(si); }));

    // nodes: the same N instances in every state
    const box = new THREE.BoxGeometry(1, 1, 1);
    const nodes = new THREE.InstancedMesh(box, mats.node, N);
    nodes.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    add(nodes, 1);
    // members
    const mGeo = new THREE.BufferGeometry();
    mGeo.setAttribute('position', dyn(edges.length * 2, 3)); mGeo.setAttribute('color', dyn(edges.length * 2, 4));
    add(new THREE.LineSegments(mGeo, mats.members), 2);
    // latent: every configuration's members at their own positions (shown only at the exit)
    const LP = [];
    for (let si = 1; si <= 6; si++) for (const [a, b] of states[si].edges) LP.push(...W3[si][a], ...W3[si][b]);
    const lGeo = new THREE.BufferGeometry(); lGeo.setAttribute('position', new THREE.Float32BufferAttribute(LP, 3));
    add(new THREE.LineSegments(lGeo, mats.latent), 0);
    // the Signal: a resampled route, so any two states blend point by point
    const M = 40, sGeo = new THREE.BufferGeometry();
    sGeo.setAttribute('position', dyn(M * 2, 3));
    const idx = []; for (let i = 0; i < M - 1; i++) { const v = i * 2; idx.push(v, v + 1, v + 2, v + 1, v + 3, v + 2); }
    sGeo.setIndex(idx);
    add(new THREE.Mesh(sGeo, mats.signal), 3);

    // keyframes from the DOM: the state follows the outcome row at the reading line
    const sec = c.section.getBoundingClientRect();
    const keyEls = [c.section.querySelector('.outcomes'), ...c.section.querySelectorAll('.outcome'), c.section.querySelector('.build-exit')];
    const keys = keyEls.map((el, i) => { if (!el) return null; const r = el.getBoundingClientRect(); return (i === 0 ? r.top : r.top + r.height / 2) - sec.top; });
    // desktop: the unresolved core holds while the stage comes fully into view, and
    // Experience resolves as it docks (1.5 row-steps before the first outcome)
    if (mode === 'desktop' && keys.every((v) => v != null)) keys[0] = keys[1] - 1.5 * (keys[2] - keys[1]);
    L = { N, mode, k, W3, entry, edges, nodes, mGeo, sGeo, M, keys, secH: sec.height, tones: new Float32Array(N), q: new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ')) };
    if (ctx.debug) window.__signalB = { N, states: ORDER, edges: edges.length, keys: keys.map((v) => v && Math.round(v)) };
  }

  // scroll → continuous state index t (0 … 7)
  function stateFor(p) {
    if (reduced) return 7;
    if (forcedT != null) return forcedT;
    const vh = innerHeight, read = (L.mode === 'mobile' ? 0.66 : 0.5) * vh;
    const y = p * (L.secH + vh) - vh + read;                      // the reading line, in section coordinates
    const K = L.keys; if (K.some((v) => v == null)) return 0;
    if (y <= K[0]) return 0;
    for (let i = 0; i < K.length - 1; i++) if (y < K[i + 1]) return i + (y - K[i]) / (K[i + 1] - K[i]);
    return 7;
  }

  const tmpM = new THREE.Matrix4(), tmpV = new THREE.Vector3(), tmpS = new THREE.Vector3(), tmpC = new THREE.Color();
  function apply(t) {
    if (!L) return;
    const i0 = Math.min(6, Math.floor(t)), u = t - i0;
    const e = smooth((u - 0.3) / 0.4);                           // each configuration holds, then re-forms
    const A = L.W3[i0], B = L.W3[i0 + 1];
    const P = A.map((a, i) => [lerp(a[0], B[i][0], e), lerp(a[1], B[i][1], e), lerp(a[2], B[i][2], e)]);
    // depth tone: nearer = clearer
    let zmin = 1e9, zmax = -1e9; for (const p of P) { zmin = Math.min(zmin, p[2]); zmax = Math.max(zmax, p[2]); }
    const tone = (z) => 0.45 + 0.55 * ((z - zmin) / ((zmax - zmin) || 1));
    // nodes
    const size = L.mode === 'mobile' ? 4.2 : 5.2;
    P.forEach((p, i) => {
      const tn = tone(p[2]); L.tones[i] = tn;
      L.nodes.setMatrixAt(i, tmpM.compose(tmpV.set(p[0], p[1], p[2]), L.q, tmpS.set(size, size, size)));
      if (idsView) tmpC.setHSL(i / L.N, 0.75, 0.6); else tmpC.setRGB(0.85 * tn, 0.84 * tn, 0.81 * tn);
      L.nodes.setColorAt(i, tmpC);
    });
    L.nodes.instanceMatrix.needsUpdate = true; if (L.nodes.instanceColor) L.nodes.instanceColor.needsUpdate = true;
    // members: those of the two neighbouring states, cross-weighted, attached to the moving nodes
    const mp = L.mGeo.attributes.position.array, mc = L.mGeo.attributes.color.array;
    L.edges.forEach((ed, j) => {
      const w = (ed.in.has(i0) ? 1 - e : 0) + (ed.in.has(i0 + 1) ? e : 0);
      const pa = P[ed.a], pb = P[ed.b];
      mp.set(pa, j * 6); mp.set(pb, j * 6 + 3);
      const al = w * (0.16 + 0.34 * (L.tones[ed.a] + L.tones[ed.b]) / 2);
      mc.set([1, 1, 1, al], j * 8); mc.set([1, 1, 1, al], j * 8 + 4);
    });
    L.mGeo.attributes.position.needsUpdate = true; L.mGeo.attributes.color.needsUpdate = true;
    // latent possibilities: only as the structure returns to its neutral core
    mats.latent.opacity = 0.07 * smooth((t - 6.3) / 0.6);
    // the Signal: the route through the state shown (both neighbours resampled, then blended)
    const route = (si, pos) => [L.entry, ...SROUTES[si].map((n) => pos[n])];
    const ra = resample(route(i0, A), L.M), rb = resample(route(i0 + 1, B), L.M);
    const R = ra.map((a, i) => [lerp(a[0], rb[i][0], e), lerp(a[1], rb[i][1], e), lerp(a[2], rb[i][2], e)]);
    const sp = L.sGeo.attributes.position.array, w = L.mode === 'mobile' ? 1.1 : 1.25;
    for (let i = 0; i < L.M; i++) {
      const a = R[Math.max(0, i - 1)], b = R[Math.min(L.M - 1, i + 1)];
      let dx = b[0] - a[0], dy = b[1] - a[1]; const len = Math.hypot(dx, dy) || 1; dx /= len; dy /= len;
      sp.set([R[i][0] - dy * w, R[i][1] + dx * w, R[i][2]], i * 6); sp.set([R[i][0] + dy * w, R[i][1] - dx * w, R[i][2]], i * 6 + 3);
    }
    L.sGeo.attributes.position.needsUpdate = true;
    if (ctx.debug && window.__signalB) window.__signalB.t = Math.round(t * 100) / 100;
  }
  let SROUTES = null;
  function resample(pts, M) {
    const seg = []; let tot = 0;
    for (let i = 0; i < pts.length - 1; i++) { const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1], pts[i + 1][2] - pts[i][2]); seg.push(l); tot += l; }
    const out = []; let si = 0, acc = 0;
    for (let k = 0; k < M; k++) {
      const d = tot * k / (M - 1);
      while (si < seg.length - 1 && acc + seg[si] < d) { acc += seg[si]; si++; }
      const f = seg[si] ? (d - acc) / seg[si] : 0, a = pts[si], b = pts[si + 1] || a;
      out.push([lerp(a[0], b[0], f), lerp(a[1], b[1], f), lerp(a[2], b[2], f)]);
    }
    return out;
  }

  function setCamera() {
    D = (H / 2) / Math.tan((camera.fov * Math.PI / 180) / 2);
    camera.aspect = W / H; camera.near = 1; camera.far = D + 4000;
    if (depthView) { camera.position.set(D * 0.6, D * 0.25, D * 0.75); camera.lookAt(0, 0, 0); }
    else { camera.position.set(0, 0, D); camera.lookAt(0, 0, 0); }
    camera.updateProjectionMatrix();
  }
  function relayout(c) {
    layout(c);
    if (L) { SROUTES = ORDER.map((n) => makeStates(L.N)[n].route); apply(stateFor(lastP)); }
  }

  return {
    init() {
      scene = new THREE.Scene();
      const key = new THREE.DirectionalLight(0xf2f0ea, 1.7); key.position.set(-0.4, 0.8, 0.7);
      scene.add(key, new THREE.AmbientLight(0xffffff, 0.55));
      camera = new THREE.PerspectiveCamera(30, 1, 1, 6000);
      mats = materials();
      dirWatch = new MutationObserver(() => { if (scene && lastCtx) { relayout(lastCtx); ctx.requestFrame('direction'); } });
      dirWatch.observe(document.documentElement, { attributes: true, attributeFilter: ['dir'] });
    },
    activate() {},
    deactivate() {},
    setProgress(p) { lastP = p; if (L) apply(stateFor(p)); },
    setPointer() { return false; },          // no pointer response in Section 03
    resize(w, h, dpr, c) {
      W = w; H = h; lastCtx = c; setCamera(); relayout(c);
      if (!fontsHooked && document.fonts && document.fonts.status !== 'loaded') {
        fontsHooked = true;
        document.fonts.ready.then(() => { if (scene && lastCtx) { relayout(lastCtx); ctx.requestFrame('fonts'); } });
      }
    },
    render(renderer) { renderer.render(scene, camera); },
    wantsFrame() { return false; },
    dispose() { if (dirWatch) dirWatch.disconnect(); dirWatch = null; clearBuilt(); L = null; scene = null; },
  };
}
