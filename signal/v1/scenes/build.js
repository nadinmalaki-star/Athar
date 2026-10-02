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

export const ORDER = ['core', 'experience', 'product', 'system', 'portal', 'automation', 'ai', 'exit'];

// A route is a list of node indices; [a, b] means the midpoint between two nodes
// (e.g. the centre of the Portal's gateway, which no node occupies).
export function routePoints(route, pos) {
  return route.map((r) => (Array.isArray(r) ? [(pos[r[0]][0] + pos[r[1]][0]) / 2, (pos[r[0]][1] + pos[r[1]][1]) / 2, (pos[r[0]][2] + pos[r[1]][2]) / 2] : pos[r]));
}

// ---------------------------------------------------------------------------
// The structure: N nodes (36 desktop, 24 phones / Tier C). Every state places
// the SAME nodes. Units: about -1.8 … 1.8; +x is the direction the problem
// travels. Returns { name: { pos: [[x,y,z]], edges: [[a,b]], route: [...] } }.
// S03.1: silhouettes refined so each state reads on its own; the exit core is
// its own, calmer, organised state (not the entry repeated).
// ---------------------------------------------------------------------------
export function makeStates(N) {
  const big = N >= 36, rnd = prng(big ? 7 : 11), jit = (s) => (rnd() - 0.5) * s;
  const chain = (a, b) => Array.from({ length: b - a }, (_, k) => [a + k, a + k + 1]);
  const S = {};

  { // ENTRY — unresolved: distributed modules, purpose not yet known
    const per = N / 6, C = [[-1.35, 0.55, 0.5], [0.15, 1.05, -0.85], [1.45, 0.3, 0.6], [-0.8, -0.8, -0.65], [1.0, -0.7, 0.25], [-0.2, 0.05, 1.15]];
    const pos = [], edges = [];
    for (let g = 0; g < 6; g++) for (let k = 0; k < per; k++) pos.push([C[g][0] + jit(0.75), C[g][1] + jit(0.75), C[g][2] + jit(0.75)]);
    for (let g = 0; g < 6; g++) { const b = g * per; edges.push([b, b + 1]); if (g % 2 === 0) edges.push([b + 1, b + 2]); if (per > 4 && g % 3 === 0) edges.push([b + 3, b + 4]); }
    S.core = { pos, edges, route: [0, 1] };                       // the problem only reaches the nearest fragment
  }
  { // EXPERIENCE — a journey: a corridor of thresholds turning and receding through depth
    const F = big ? 6 : 4, P = N - 4 * F, pos = [], edges = [];
    const path = (t) => {                                          // floor of the journey: from near-left to far-right, a gentle S
      const x = -1.45 + 2.7 * t, z = 1.0 - 2.5 * t, lat = 0.28 * Math.sin(t * Math.PI * 2);
      const dx = 2.7, dz = -2.5, l = Math.hypot(dx, dz), sx = -dz / l, sz = dx / l;   // side vector (cross(tangent, up))
      return { p: [x + sx * lat, -0.55 + 0.1 * Math.sin(t * Math.PI), z + sz * lat], sx, sz };
    };
    for (let f = 0; f < F; f++) {
      const t = 0.04 + 0.92 * f / (F - 1), { p, sx, sz } = path(t), w = 0.5 - 0.1 * t, h = 1.02 - 0.22 * t;
      // threshold frame, square to the path: bottom-left, bottom-right, top-left, top-right
      pos.push([p[0] - sx * w, p[1], p[2] - sz * w], [p[0] + sx * w, p[1], p[2] + sz * w], [p[0] - sx * w, p[1] + h, p[2] - sz * w], [p[0] + sx * w, p[1] + h, p[2] + sz * w]);
      const b = f * 4; edges.push([b, b + 2], [b + 1, b + 3], [b + 2, b + 3]);   // open at the floor: a passage, not a fence
      if (f < F - 1) edges.push([b + 2, b + 6], [b + 3, b + 7]);                  // the corridor's upper rails carry you through
    }
    for (let k = 0; k < P; k++) pos.push(path(k / (P - 1)).p);
    edges.push(...chain(4 * F, N - 1));
    S.experience = { pos, edges, route: Array.from({ length: P }, (_, k) => 4 * F + k) };
  }
  { // PRODUCT — components lock into one compact, coherent object (with a working face)
    const E = big ? 12 : 8, per = E / 4, Rn = N - 8 - E, rows = Rn / 4, hx = 0.68, hy = 0.52, hz = 0.44, pos = [], edges = [];
    for (let i = 0; i < 8; i++) pos.push([i & 1 ? hx : -hx, i & 2 ? hy : -hy, i & 4 ? hz : -hz]);
    // the four vertical edges carry the joined components (subdivisions along y)
    for (let e = 0; e < 4; e++) for (let k = 0; k < per; k++) { const t = (k + 1) / (per + 1); pos.push([e & 1 ? hx : -hx, -hy + 2 * hy * t, e & 2 ? hz : -hz]); }
    // the front face: an inset working surface
    for (let r = 0; r < rows; r++) for (let c = 0; c < 4; c++) pos.push([-0.42 + c * 0.28, rows > 1 ? 0.3 - r * (0.6 / (rows - 1)) : 0, hz + 0.001]);
    edges.push([0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]);
    const g0 = 8 + E;
    for (let r = 0; r < rows; r++) for (let c = 0; c < 4; c++) { const i = g0 + r * 4 + c; if (c < 3) edges.push([i, i + 1]); if (r < rows - 1) edges.push([i, i + 4]); }
    // components seated into the object: each edge-component ties across to its partner
    for (let k = 0; k < per; k++) edges.push([8 + k, 8 + per + k], [8 + 2 * per + k, 8 + 3 * per + k]);
    const midRow = g0 + Math.floor((rows - 1) / 2) * 4;
    S.product = { pos, edges, route: [[0, 6], midRow, midRow + 1, midRow + 2] };   // in through the side, along the working face, to its centre
  }
  { // SYSTEM — modules connected into a structured operating network (three layers)
    const per = N / 3, cols = 4, rows = per / cols, pos = [], edges = [];
    for (let l = 0; l < 3; l++) for (let k = 0; k < per; k++) { const gx = k % cols, gy = Math.floor(k / cols);
      pos.push([-1.15 + gx * 0.77, -0.8 + l * 0.8, rows > 1 ? -0.68 + gy * (1.36 / (rows - 1)) : 0]); }
    for (let l = 0; l < 3; l++) for (let k = 0; k < per; k++) { const i = l * per + k; if (k % cols < cols - 1) edges.push([i, i + 1]); if (k < per - cols) edges.push([i, i + cols]); }
    const hubs = big ? [1, 6, 9] : [1, 6];
    for (const h of hubs) edges.push([h, h + per], [h + per, h + 2 * per]);
    S.system = { pos, edges, route: [0, 1, 1 + per, 1 + 2 * per, 2 + 2 * per, 3 + 2 * per] };   // orthogonal: along, up through a hub, along
  }
  { // PORTAL — one recognisable gateway → distinct role / destination structures behind it
    const C = (N - 8) / 4, gx = -0.85, gz = 0.4, gy = 0.62, pos = [], edges = [];
    // gateway frame, square to the direction of travel: bl, lm, tl, tm, tr, rm, br, bm
    pos.push([gx, -gy, -gz], [gx, 0, -gz], [gx, gy, -gz], [gx, gy, 0], [gx, gy, gz], [gx, 0, gz], [gx, -gy, gz], [gx, -gy, 0]);
    edges.push(...chain(0, 7), [7, 0]);
    const HUB = [[0.7, 1.0, -0.4], [1.35, 0.35, 0.4], [1.2, -0.45, -0.55], [0.6, -1.0, 0.45]];   // four clearly separate roles
    for (let c = 0; c < 4; c++) {
      const h = HUB[c];
      for (let k = 0; k < C; k++) { if (k === 0) { pos.push(h.slice()); continue; }
        const b = (k - 1) / (C - 1) * Math.PI * 2, r = 0.22;            // each destination: a small module facing the gateway
        pos.push([h[0] + r * Math.sin(b), h[1] + r * Math.cos(b), h[2]]); }   // module faces the viewer
      const b = 8 + c * C; for (let k = 1; k < C; k++) edges.push([b + k, b + (k % (C - 1)) + 1]);   // ring around each hub
      edges.push([b, b + 1]);
    }
    // the gateway distributes: its corners lead to the four destinations
    edges.push([2, 8], [4, 8 + C], [6, 8 + 2 * C], [0, 8 + 3 * C]);
    S.portal = { pos, edges, route: [[1, 5], 8 + C, 8 + C + 1] };   // through the gateway's centre, out to one role
  }
  { // AUTOMATION — repeated processes in depth converge into one controlled flow
    const L = big ? 6 : 4, Cn = N - 4 * L, pos = [], edges = [];
    const START = [[0.78, 0.85], [0.78, -0.85], [-0.78, 0.85], [-0.78, -0.85]];     // (y, z): four parallel processes
    for (let p = 0; p < 4; p++) for (let k = 0; k < L; k++) { const t = k / (L - 1), c = 1 - smooth(t);
      pos.push([-1.75 + t * 1.65, START[p][0] * c, START[p][1] * c]); }
    for (let k = 0; k < Cn; k++) { const t = k / (Cn - 1); pos.push([0.05 + t * 1.6, 0.1 * t, 0.9 * t]); }   // the single flow, coming forward
    for (let p = 0; p < 4; p++) { edges.push(...chain(p * L, p * L + L - 1)); edges.push([p * L + L - 1, 4 * L]); }
    // the processes start as one bundle of repeated work (a square cross-section)
    edges.push([0, L], [L, 3 * L], [3 * L, 2 * L], [2 * L, 0]);
    edges.push(...chain(4 * L, N - 1));
    S.automation = { pos, edges, route: [...Array.from({ length: L }, (_, k) => k), ...Array.from({ length: Cn }, (_, k) => 4 * L + k)] };
  }
  { // AI LAYER — an existing base (separate systems on the ground) and, above and across
    // it, one interpreting layer that reaches down into each of them
    const bm = big ? 6 : 4, base = 4 * bm, lx = 4, ly = (N - base) / lx, pos = [], edges = [];
    const MC = [[-0.85, -0.55], [0.75, -0.6], [-0.7, 0.55], [0.85, 0.6]];           // module centres (x, z) on the ground
    for (let m = 0; m < 4; m++) for (let k = 0; k < bm; k++) { const c = k % 2, r = Math.floor(k / 2), rr = bm / 2;
      pos.push([MC[m][0] - 0.16 + c * 0.32, -0.78, MC[m][1] - 0.16 * (rr - 1) + r * 0.32]); }
    for (let m = 0; m < 4; m++) { const b = m * bm; for (let k = 0; k < bm; k++) { if (k % 2 === 0) edges.push([b + k, b + k + 1]); if (k + 2 < bm) edges.push([b + k, b + k + 2]); } }
    const rot = 0.5, cr = Math.cos(rot), sr = Math.sin(rot);                          // the layer runs ACROSS the base
    for (let i = 0; i < N - base; i++) { const u = i % lx, v = Math.floor(i / lx);
      const x = -0.9 + u * 0.6, z = ly > 1 ? -0.55 + v * (1.1 / (ly - 1)) : 0; pos.push([x * cr - z * sr, 0.72, x * sr + z * cr]); }
    for (let i = 0; i < N - base; i++) { const j = base + i; if (i % lx < lx - 1) edges.push([j, j + 1]); if (i < N - base - lx) edges.push([j, j + lx]); }
    // it reads every system beneath it: one fine vertical into each module, from the layer node nearest above
    const above = [];
    for (let m = 0; m < 4; m++) { const b = m * bm + 1; let best = base, bd = 1e9;
      for (let k = base; k < N; k++) { const d = (pos[k][0] - pos[b][0]) ** 2 + (pos[k][2] - pos[b][2]) ** 2; if (d < bd) { bd = d; best = k; } }
      edges.push([best, b]); above.push(best); }
    S.ai = { pos, edges, route: [1, above[0], above[2], 2 * bm + 1, 2 * bm + 3] };   // up from one system, across the layer, down into another
  }
  { // EXIT — informed, still configurable: six tidy modules held calmly around one centre
    const per = N / 6, pos = [], edges = [];
    for (let g = 0; g < 6; g++) { const a = g / 6 * Math.PI * 2 + Math.PI / 6, cx = 1.3 * Math.cos(a), cz = 0.95 * Math.sin(a), ta = a + Math.PI / 2;
      for (let k = 0; k < per; k++) { const c = k % 2, r = Math.floor(k / 2), rr = per / 2;
        const u = -0.15 + c * 0.3, v = -0.15 * (rr - 1) + r * 0.3;              // a small, flat, aligned module
        pos.push([cx + u * Math.cos(ta), v * 0.9, cz + u * Math.sin(ta)]); }
      const b = g * per; for (let k = 0; k < per; k++) { if (k % 2 === 0) edges.push([b + k, b + k + 1]); if (k + 2 < per) edges.push([b + k, b + k + 2]); }
    }
    S.exit = { pos, edges, route: [3 * per, [3 * per, 0]] };       // arrives, and rests at the centre — nothing chosen
  }
  return S;
}

// S03 materials (prototype): member hierarchy per state — which members define the
// silhouette (primary) and which are internal detail (secondary). Metadata only: it
// never changes positions, edges or node identity. Returns a Set of 'a-b' keys.
export function primaryMembers(name, st, N) {
  const key = (a, b) => (a < b ? a + '-' + b : b + '-' + a), P = new Set();
  if (name === 'system') {                       // layer outlines + the hub verticals carry the network
    const per = N / 3, cols = 4, rows = per / cols;
    for (const [a, b] of st.edges) {
      const la = Math.floor(a / per), lb = Math.floor(b / per);
      if (la !== lb) { P.add(key(a, b)); continue; }
      const ka = a % per, kb = b % per, ga = [ka % cols, Math.floor(ka / cols)], gb = [kb % cols, Math.floor(kb / cols)];
      const alongX = ga[1] === gb[1], edgeRow = ga[1] === 0 || ga[1] === rows - 1, edgeCol = ga[0] === 0 || ga[0] === cols - 1;
      if ((alongX && edgeRow) || (!alongX && edgeCol && gb[0] === ga[0])) P.add(key(a, b));
    }
    return P;
  }
  if (name === 'core') return P;                 // unresolved: nothing is primary yet
  for (const [a, b] of st.edges) P.add(key(a, b)); // exit + (until rolled out) the other states: all primary
  return P;
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
  // S03 materials prototype (local debug only): ?signal-mat=v2
  const matV2 = ctx.debug && params.get('signal-mat') === 'v2';
  let L = null, lastP = 0, lastCtx = null, fontsHooked = false, dirWatch = null;

  function materials() {
    return {
      node: ctx.track(new THREE.MeshLambertMaterial({ color: 0xffffff })),
      members: ctx.track(new THREE.LineBasicMaterial({ color: 0xd9d6cf, vertexColors: true, transparent: true, depthWrite: false })),
      latent: ctx.track(new THREE.LineBasicMaterial({ color: 0xd9d6cf, transparent: true, opacity: 0, depthWrite: false })),
      signal: ctx.track(new THREE.MeshBasicMaterial({ color: 0xff5a36, transparent: true, opacity: 0.92, depthWrite: false, side: THREE.DoubleSide })),
      // --- S03 materials prototype ---
      rod: ctx.track(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55, metalness: 0.3 })),        // graphite satin (tone per instance)
      rodFlat: ctx.track(new THREE.MeshBasicMaterial({ color: 0xffffff })),                                        // phones: flat
      joint: ctx.track(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.42, metalness: 0.55, flatShading: true })), // dark anodized
      jointFlat: ctx.track(new THREE.MeshBasicMaterial({ color: 0xffffff })),
      ember: ctx.track(new THREE.MeshBasicMaterial({ color: 0xff5a36, vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide })),
      seat: ctx.track(new THREE.MeshBasicMaterial({ color: 0xff5a36, transparent: true, opacity: 0.9, depthWrite: false })),
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
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const rotate = (p0) => { const p = orient(p0, mode, rtl);
      const x = p[0] * cy - p[2] * sy, z = p[0] * sy + p[2] * cy;
      return [x, p[1] * cp - z * sp, p[1] * sp + z * cp]; };
    // S03.1 framing: the largest state fills most of the stage (never clipped) — the structure is the
    // protagonist; a margin for perspective (nearer parts read larger) keeps it off the stage edges
    let bx0 = 1e9, bx1 = -1e9, by0 = 1e9, by1 = -1e9;
    for (const n of ORDER) for (const q of S[n].pos.map(rotate)) { bx0 = Math.min(bx0, q[0]); bx1 = Math.max(bx1, q[0]); by0 = Math.min(by0, q[1]); by1 = Math.max(by1, q[1]); }
    const sx = (bx1 - bx0) / 2, syy = (by1 - by0) / 2;          // half-spans of the whole structure (it is centred below)
    const fit = mode === 'mobile' ? [0.45, 0.46] : [0.43, 0.42];
    const k = Math.min(W * fit[0] / sx, H * fit[1] / syy);
    const toWorld = (p0) => { const q = rotate(p0); return [q[0] * k, q[1] * k, q[2] * k]; };
    const states = ORDER.map((n) => S[n]);
    const W3 = states.map((st) => st.pos.map(toWorld));
    // centre the structure (all states together) in the stage, so no state drifts
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const st of W3) for (const p of st) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    const cxo = (x0 + x1) / 2, cyo = (y0 + y1) / 2;
    for (const st of W3) for (const p of st) { p[0] -= cxo; p[1] -= cyo; }
    const entry = toWorld(ENTRY); entry[0] -= cxo; entry[1] -= cyo;
    // all members across all states (the union), each knows the states it belongs to
    const key = (a, b) => (a < b ? a + '-' + b : b + '-' + a);
    const edgeIx = new Map(), edges = [];
    states.forEach((st, si) => st.edges.forEach(([a, b]) => { const kk = key(a, b); if (!edgeIx.has(kk)) { edgeIx.set(kk, edges.length); edges.push({ a, b, in: new Set() }); } edges[edgeIx.get(kk)].in.add(si); }));

    if (matV2) { layoutV2(c, { N, mode, rtl, k, W3, entry, edges, states, S, pitch, yaw, edgeIx, key }); return; }
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
    L = { N, mode, rtl, k, W3, entry, edges, nodes, mGeo, sGeo, M, keys, secH: sec.height, tones: new Float32Array(N), q: new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ')) };
    if (ctx.debug) window.__signalB = { N, states: ORDER, edges: edges.length, keys: keys.map((v) => v && Math.round(v)) };
  }

  // ---------------------------------------------------------------- S03 materials prototype
  // Members are thin rectangular rods (real 3D: depth-tested, perspective, occlusion),
  // joints are small faceted dark-metal joints in two grades, Ember is a thinner inlay
  // with seat rings. Phones: flat, unlit, two weights, no latent hairlines.
  function layoutV2(c, g) {
    const { N, mode, W3, edges, states, S, pitch, yaw, key } = g, phone = mode === 'mobile';
    // per state: tier of every member (0 absent, 1 secondary, 2 primary) and joint grade
    const tiers = states.map((st, si) => {
      const name = ORDER[si], prim = primaryMembers(name, st, N), t = new Uint8Array(edges.length);
      edges.forEach((ed, j) => { if (ed.in.has(si)) t[j] = prim.has(key(ed.a, ed.b)) ? 2 : 1; });
      return t;
    });
    const grades = states.map((st, si) => {
      const deg = new Uint8Array(N), gr = new Uint8Array(N);
      edges.forEach((ed, j) => { if (tiers[si][j]) { deg[ed.a]++; deg[ed.b]++; } });
      edges.forEach((ed, j) => { if (tiers[si][j] === 2) { gr[ed.a] = 1; gr[ed.b] = 1; } });
      for (let i = 0; i < N; i++) if (deg[i] >= 3) gr[i] = 1;
      if (ORDER[si] === 'core') gr.fill(0);           // unresolved: no structural joints yet
      return gr;
    });
    // entry: uneven, fragmentary tone per member (fixed, deterministic)
    const jitter = new Float32Array(edges.length); { let sd = 3; for (let j = 0; j < edges.length; j++) { sd = (sd * 16807) % 2147483647; jitter[j] = (sd / 2147483647); } }
    // seats: where the route enters and leaves the configuration (Ember rings, not dots)
    const seats = states.map((st, si) => { const n = ORDER[si]; if (n === 'core') return []; const r = st.route;
      if (n === 'exit') return [r[r.length - 1]]; return phone ? [r[r.length - 1]] : [r[0], r[r.length - 1]]; });

    const rodGeo = new THREE.BoxGeometry(1, 1, 1);
    const rods = new THREE.InstancedMesh(rodGeo, phone ? mats.rodFlat : mats.rod, edges.length);
    rods.instanceMatrix.setUsage(THREE.DynamicDrawUsage); add(rods, 2);
    const jGeo = phone ? new THREE.PlaneGeometry(1, 1) : new THREE.IcosahedronGeometry(0.5, 0);
    const joints = new THREE.InstancedMesh(jGeo, phone ? mats.jointFlat : mats.joint, N);
    joints.instanceMatrix.setUsage(THREE.DynamicDrawUsage); add(joints, 1);
    let lGeo = null;
    if (!phone) {   // latent: desktop only, hairlines, very faint
      const LP = []; for (let si = 1; si <= 6; si++) for (const [a, b] of states[si].edges) LP.push(...W3[si][a], ...W3[si][b]);
      lGeo = new THREE.BufferGeometry(); lGeo.setAttribute('position', new THREE.Float32BufferAttribute(LP, 3));
      add(new THREE.LineSegments(lGeo, mats.latent), 0);
    }
    const M = 40, sGeo = new THREE.BufferGeometry();
    sGeo.setAttribute('position', dyn(M * 2, 3)); sGeo.setAttribute('color', dyn(M * 2, 4));
    const idx = []; for (let i = 0; i < M - 1; i++) { const v = i * 2; idx.push(v, v + 1, v + 2, v + 1, v + 3, v + 2); }
    sGeo.setIndex(idx); add(new THREE.Mesh(sGeo, mats.ember), 3);
    const seatMesh = new THREE.InstancedMesh(new THREE.TorusGeometry(1, 0.16, 3, 16), mats.seat, 4);
    seatMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); add(seatMesh, 4);

    const sec = c.section.getBoundingClientRect();
    const keyEls = [c.section.querySelector('.outcomes'), ...c.section.querySelectorAll('.outcome'), c.section.querySelector('.build-exit')];
    const keys = keyEls.map((el, i) => { if (!el) return null; const r = el.getBoundingClientRect(); return (i === 0 ? r.top : r.top + r.height / 2) - sec.top; });
    if (mode === 'desktop' && keys.every((v) => v != null)) keys[0] = keys[1] - 1.5 * (keys[2] - keys[1]);
    L = { v2: true, N, mode, rtl: g.rtl, k: g.k, W3, entry: g.entry, edges, tiers, grades, jitter, seats, rods, joints, sGeo, seatMesh, M, keys, secH: sec.height,
      q: new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ')) };
    if (ctx.debug) window.__signalB = { N, states: ORDER, edges: edges.length, keys: keys.map((v) => v && Math.round(v)), mat: 'v2', members: phone ? 'rods (flat, unlit)' : 'rods (lit satin prisms)' };
  }

  const zAxis = new THREE.Vector3(0, 0, 1), tmpD = new THREE.Vector3(), tmpQ = new THREE.Quaternion();
  function applyV2(t) {
    const phone = L.mode === 'mobile', i0 = Math.min(6, Math.floor(t)), u = t - i0, e = smooth((u - 0.3) / 0.4);
    const A = L.W3[i0], B = L.W3[i0 + 1];
    const P = A.map((a, i) => [lerp(a[0], B[i][0], e), lerp(a[1], B[i][1], e), lerp(a[2], B[i][2], e)]);
    let zmin = 1e9, zmax = -1e9; for (const p of P) { zmin = Math.min(zmin, p[2]); zmax = Math.max(zmax, p[2]); }
    const dn = (z) => (z - zmin) / ((zmax - zmin) || 1);                  // 0 far … 1 near
    const isEntry = (si) => ORDER[si] === 'core';
    // ---- members: thin rods; width and tone by tier, depth and state
    const WIDTH = phone ? [0, 0.9, 1.4] : [0, 1.15, 1.9];
    const TONE = phone ? [0, 0.3, 0.44] : [0, 0.3, 0.5];        // phones are unlit: tones are display (sRGB) values, kept quiet
    L.edges.forEach((ed, j) => {
      const ta = L.tiers[i0][j], tb = L.tiers[i0 + 1][j];
      // entry: present but unresolved — uneven fragments, quieter than any configured state
      const wOf = (si, tr) => (tr ? WIDTH[tr] * (isEntry(si) ? 1.08 : 1) : 0);
      const cOf = (si, tr) => (tr ? TONE[tr] * (isEntry(si) ? 1.25 + 0.6 * L.jitter[j] : 1) : 0);
      const pa = P[ed.a], pb = P[ed.b], depth = (dn(pa[2]) + dn(pb[2])) / 2;
      let w = lerp(wOf(i0, ta), wOf(i0 + 1, tb), e) * (phone ? 1 : 0.78 + 0.4 * depth);
      let c = lerp(cOf(i0, ta), cOf(i0 + 1, tb), e) * (phone ? (depth > 0.5 ? 1 : 0.72) : 0.7 + 0.5 * depth);
      const dx = pb[0] - pa[0], dy = pb[1] - pa[1], dz = pb[2] - pa[2], len = Math.hypot(dx, dy, dz) || 1e-3;
      if (w < 0.05) w = 0;
      tmpQ.setFromUnitVectors(zAxis, tmpD.set(dx / len, dy / len, dz / len));
      L.rods.setMatrixAt(j, tmpM.compose(tmpV.set((pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2, (pa[2] + pb[2]) / 2), tmpQ, tmpS.set(w, w, w ? len : 0)));
      if (idsView) tmpC.setRGB(0.5, 0.5, 0.5); else if (phone) tmpC.setRGB(c * 0.98, c * 0.98, c, THREE.SRGBColorSpace); else tmpC.setRGB(c * 0.98, c * 0.98, c);   // graphite, the faintest cool lean
      L.rods.setColorAt(j, tmpC);
    });
    L.rods.instanceMatrix.needsUpdate = true; if (L.rods.instanceColor) L.rods.instanceColor.needsUpdate = true;
    // ---- joints: two grades; structural joints catch the key, pass-through ones recede
    const SIZE = phone ? [1.9, 2.8] : [2.3, 3.6];
    P.forEach((p, i) => {
      const ga = L.grades[i0][i], gb = L.grades[i0 + 1][i], g = lerp(ga, gb, e), depth = dn(p[2]);
      const ent = isEntry(i0) ? 1 - e : 0;              // entry joints: a touch more present (no structure to carry them yet)
      const s = lerp(SIZE[0], SIZE[1], g) * (phone ? 1 : 0.85 + 0.3 * depth) * (1 + 0.85 * ent);
      L.joints.setMatrixAt(i, tmpM.compose(tmpV.set(p[0], p[1], p[2]), phone ? tmpQ.identity() : L.q, tmpS.set(s, s, s)));
      if (idsView) tmpC.setHSL(i / L.N, 0.75, 0.6);
      else { const v = (phone ? lerp(0.3, 0.5, g) * (depth > 0.5 ? 1 : 0.8) : lerp(0.22, 0.62, g)) + 0.36 * ent; if (phone) tmpC.setRGB(v, v, v, THREE.SRGBColorSpace); else tmpC.setRGB(v, v, v * 1.01); }
      L.joints.setColorAt(i, tmpC);
    });
    L.joints.instanceMatrix.needsUpdate = true; if (L.joints.instanceColor) L.joints.instanceColor.needsUpdate = true;
    // ---- latent: very faint, only as the structure returns to its calm core
    mats.latent.opacity = phone ? 0 : 0.045 * smooth((t - 6.3) / 0.6);
    // ---- Ember: a thinner inlay; quieter on its approach, full where it is seated in the structure
    const route = (si, pos) => { const pts = routePoints(SROUTES[si], pos), f = pts[0];
      const from = L.mode === 'mobile' ? [f[0], H / 2 + 12, f[2]] : [L.rtl ? W / 2 + 12 : -W / 2 - 12, f[1], f[2]];
      return [from, ...pts]; };
    const ra = resample(route(i0, A), L.M), rb = resample(route(i0 + 1, B), L.M);
    const R = ra.map((a, i) => [lerp(a[0], rb[i][0], e), lerp(a[1], rb[i][1], e), lerp(a[2], rb[i][2], e)]);
    // where the approach ends (first point inside the structure), as a fraction of the route
    const seatFrac = (pts) => { let tot = 0, first = 0; for (let i = 0; i < pts.length - 1; i++) { const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); if (i === 0) first = l; tot += l; } return tot ? first / tot : 0; };
    const fa = seatFrac(route(i0, A)), fb = seatFrac(route(i0 + 1, B)), fs = lerp(fa, fb, e);
    const sp = L.sGeo.attributes.position.array, sc = L.sGeo.attributes.color.array, hw = phone ? 0.75 : 0.8;
    for (let i = 0; i < L.M; i++) {
      const a = R[Math.max(0, i - 1)], b = R[Math.min(L.M - 1, i + 1)];
      let dx = b[0] - a[0], dy = b[1] - a[1]; const len = Math.hypot(dx, dy) || 1; dx /= len; dy /= len;
      const zo = R[i][2] + (phone ? 2 : 3);            // seated on the member's near face: an inlay, never hidden inside it
      sp.set([R[i][0] - dy * hw, R[i][1] + dx * hw, zo], i * 6); sp.set([R[i][0] + dy * hw, R[i][1] - dx * hw, zo], i * 6 + 3);
      const al = i / (L.M - 1) < fs ? 0.55 : 0.95;
      sc.set([1, 1, 1, al, 1, 1, 1, al], i * 8);
    }
    L.sGeo.attributes.position.needsUpdate = true; L.sGeo.attributes.color.needsUpdate = true;
    // ---- seats: thin Ember rings where the route enters / leaves the configuration
    const R0 = phone ? 2.6 : 3.2; let n = 0;
    const seatAt = (si, w, pos) => { for (const r of L.seats[si]) { if (n >= 4) break; const p = Array.isArray(r) ? routePoints([r], pos)[0] : pos[r];
      const s = R0 * w; L.seatMesh.setMatrixAt(n++, tmpM.compose(tmpV.set(p[0], p[1], p[2] + (phone ? 3 : 4)), tmpQ.identity(), tmpS.set(s, s, s))); } };
    seatAt(i0, 1 - e, P); seatAt(i0 + 1, e, P);
    while (n < 4) L.seatMesh.setMatrixAt(n++, tmpM.makeScale(0, 0, 0));
    L.seatMesh.instanceMatrix.needsUpdate = true;
    if (ctx.debug && window.__signalB) window.__signalB.t = Math.round(t * 100) / 100;
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
    if (L.v2) { applyV2(t); return; }
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
    const route = (si, pos) => { const pts = routePoints(SROUTES[si], pos), f = pts[0];
      const from = L.mode === 'mobile' ? [f[0], H / 2 + 12, f[2]] : [L.rtl ? W / 2 + 12 : -W / 2 - 12, f[1], f[2]];
      return [from, ...pts]; };
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
      if (matV2) {   // one restrained key from upper-left-front, a faint rim behind-right, near-zero ambient
        const key = new THREE.DirectionalLight(0xf2f0ea, 2.4); key.position.set(-0.45, 0.85, 0.6);
        const rim = new THREE.DirectionalLight(0xe6e4de, 0.45); rim.position.set(0.6, 0.15, -0.8);
        scene.add(key, rim, new THREE.AmbientLight(0xffffff, 0.08));
      } else {
        const key = new THREE.DirectionalLight(0xf2f0ea, 1.7); key.position.set(-0.4, 0.8, 0.7);
        scene.add(key, new THREE.AmbientLight(0xffffff, 0.55));
      }
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
