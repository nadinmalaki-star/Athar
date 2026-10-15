/*
 * Scene: hero v3 — "complexity → structure → clarity" (approved visual direction, 2026-10-10). Static checkpoint, pass 2.
 * Native realtime scene, no external assets: a layered composition of parallel architectural planes — clear optical panels,
 * slim charcoal slabs and one warm ceramic/mineral slab at the core — receding in a 3/4 view, with one Ember signal passing
 * through them, inside a room that turns from a dark text zone (left) to a warm, sunlit space (right).
 *   geometry  — boxes, one tube (+ halo), one instanced field of small fragments, wall + floor, two light shafts
 *   materials — small procedural shaders, display-referred output (no tone mapping, no textures); depth haze on everything
 *   floor     — a blurred reflection (mirrored row rendered at half resolution, blurred, sampled by the floor)
 *   motion    — not yet; positions (u along the row), the Ember path and the per-element glow are all parameters
 */

const NOISE = `
  float h3(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float vnoise(vec3 x) {
    vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z);
  }
  float fbm(vec3 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * vnoise(p); p *= 2.03; a *= 0.5; } return s; }`;
// depth haze: everything recedes into the warm air of the lit room
const HAZE = `
  uniform vec3 uHaze; uniform vec3 uCam; uniform vec3 uHazeGate;   // gate: screen width, lit split (x0, x1)
  vec3 haze(vec3 c, vec3 w) {          // only the lit side has bright air; the text zone stays dark
    float lit = smoothstep(uHazeGate.y, uHazeGate.z, gl_FragCoord.x / uHazeGate.x);
    float d = length(w - uCam); return mix(c, mix(vec3(0.03, 0.028, 0.026), uHaze, lit), (1.0 - exp(-max(d - 8.0, 0.0) * 0.09)) * 0.55);
  }`;
const HITS = `
  uniform vec3 uHits[12];
  float hitGlow(vec3 w, float r2) { float g = 0.0; for (int i = 0; i < 12; i++) { vec3 q = w - uHits[i]; g += exp(-dot(q, q) / r2); } return g; }`;

// ---- room ----
const WALL_VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.9999, 1.0); }';
const WALL_FS = NOISE + `
  uniform vec2 uSplit; varying vec2 vUv;
  void main() {
    vec2 p = vUv;
    float lit = smoothstep(uSplit.x, uSplit.y, p.x);
    vec3 dark = vec3(0.04, 0.037, 0.034), warm = vec3(0.7, 0.62, 0.53);
    vec3 c = mix(dark, warm * (0.62 + 0.38 * p.y), lit);
    c *= 1.0 - (smoothstep(0.035, 0.0, abs(p.x - 0.87)) * 0.45 + smoothstep(0.06, 0.0, abs(p.x - 0.66)) * 0.15) * lit;   // window-frame shadows
    c += vec3(0.14, 0.11, 0.08) * smoothstep(0.75, 0.81, p.x) * smoothstep(0.96, 0.89, p.x) * smoothstep(0.3, 0.95, p.y);
    c *= mix(1.0, 0.82, smoothstep(0.55, 0.0, p.y) * lit);                                                                  // darker toward the floor line
    c *= 0.95 + 0.05 * vnoise(vec3(p * vec2(240.0, 60.0), 1.0));
    gl_FragColor = vec4(c, 1.0);
  }`;
const FLOOR_VS = 'varying vec3 vW; varying vec4 vC; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vC = projectionMatrix * viewMatrix * w; gl_Position = vC; }';
const FLOOR_FS = NOISE + HAZE + `
  uniform vec2 uSplit; uniform vec3 uRowA; uniform vec3 uRowB; uniform sampler2D tRefl; uniform vec3 uFoot[12]; uniform vec3 uFootS[12];
  varying vec3 vW; varying vec4 vC;
  void main() {
    vec2 sc = vC.xy / vC.w * 0.5 + 0.5;
    float lit = smoothstep(uSplit.x - 0.15, uSplit.y + 0.1, sc.x);
    vec3 dark = vec3(0.035, 0.032, 0.03), warm = vec3(0.5, 0.44, 0.37);
    vec3 c = mix(dark, warm, lit) * (0.5 + 0.5 * smoothstep(10.0, -8.0, vW.z));
    float streak = smoothstep(0.3, 0.8, sin((vW.x * 0.55 + vW.z * 0.9) * 0.9 + 0.8 * vnoise(vW * 0.35)) * 0.5 + 0.5);
    c *= mix(0.88, 1.14, streak * lit);
    // contact shadows: a soft one under every element (oriented footprint), a deeper one right at its base
    float sh = 0.0;
    for (int i = 0; i < 12; i++) {
      vec2 q = vW.xz - uFoot[i].xz; float ca = cos(uFoot[i].y), sa = sin(uFoot[i].y);
      vec2 l = vec2(ca * q.x - sa * q.y, sa * q.x + ca * q.y);                   // into the element's frame (x along its width)
      vec2 e = max(abs(l) - uFootS[i].xy * 0.5, 0.0); float dd = length(e);
      sh = max(sh, uFootS[i].z * (0.55 * exp(-dd * dd / 0.02) + 0.35 * exp(-dd * dd / 0.35)));
    }
    c *= 1.0 - sh;
    // blurred reflection of the row, broken up by the floor's own roughness
    float rough = vnoise(vW * 3.0);
    vec3 r = texture2D(tRefl, sc + (vec2(rough, vnoise(vW * 3.0 + 7.0)) - 0.5) * 0.012).rgb;
    c += r * (0.38 + 0.2 * rough);
    gl_FragColor = vec4(haze(c, vW), 1.0);
  }`;
const SHAFT_VS = 'varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }';
const SHAFT_FS = NOISE + `
  uniform float uGain; varying vec2 vUv; varying vec3 vW;
  void main() {   // a soft beam of window light through the air: brightest in its core, fading at the ends and with height
    float a = smoothstep(0.0, 0.5, vUv.x) * smoothstep(1.0, 0.5, vUv.x) * smoothstep(0.0, 0.35, vUv.y) * smoothstep(1.0, 0.6, vUv.y);
    a *= 0.75 + 0.25 * vnoise(vW * 1.3);
    gl_FragColor = vec4(vec3(1.0, 0.86, 0.68) * a * uGain, 1.0);
  }`;

// ---- solids: slim charcoal slabs + one ceramic/mineral slab ----
const SOLID_VS = `
  varying vec3 vW; varying vec3 vN; varying vec3 vL;
  void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vL = position; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`;
const SOLID_FS = NOISE + HAZE + HITS + `
  uniform vec3 uBase; uniform float uTex; uniform vec3 uSun; uniform float uMirror; uniform float uGloss;
  varying vec3 vW; varying vec3 vN; varying vec3 vL;
  void main() {
    vec3 n = normalize(vN) * (gl_FrontFacing ? 1.0 : -1.0);
    vec3 vd = normalize(uCam - vW);
    vec3 p = vL * 1.6;
    vec3 alb = uBase * (1.0 + uTex * (fbm(p * 2.2) - 0.5) + uTex * 0.35 * (vnoise(p * 60.0) - 0.5));   // low-contrast mineral grain
    float dif = max(dot(n, uSun), 0.0);
    float spec = pow(max(dot(n, normalize(uSun + vd)), 0.0), 60.0) * uGloss;
    float rim = pow(1.0 - abs(dot(n, vd)), 3.0);
    float top = smoothstep(0.0, 3.4, vW.y);
    vec3 c = alb * (0.3 + 0.22 * top + dif * vec3(1.12, 0.98, 0.82)) + spec * vec3(1.0, 0.92, 0.8);
    c += vec3(1.0, 0.72, 0.48) * rim * 0.12 * top;                                     // soft warm back/rim light
    float g = hitGlow(vW, 0.09);
    c += vec3(1.0, 0.42, 0.14) * g * (0.18 + 0.7 * rim);                              // the Ember warms the edges it passes
    c = haze(c, vW);
    if (uMirror > 0.5) c *= 0.55 * exp(vW.y * 1.4);
    gl_FragColor = vec4(c, 1.0);
  }`;

// ---- glass: optical, nearly clear faces reflecting the room, subtle edges, local Ember response ----
const GLASS_VS = `
  varying vec3 vW; varying vec3 vN; varying vec3 vLN; varying vec2 vUv;
  void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vLN = normal; vN = normalize(mat3(modelMatrix) * normal); vUv = uv; gl_Position = projectionMatrix * viewMatrix * w; }`;
const GLASS_FS = NOISE + HAZE + HITS + `
  uniform vec2 uSize; uniform float uOrange; uniform float uMirror; uniform float uFace; uniform vec2 uSplitW;
  varying vec3 vW; varying vec3 vN; varying vec3 vLN; varying vec2 vUv;
  void main() {
    vec3 ember = vec3(1.0, 0.45, 0.16);
    vec3 n = normalize(vN); vec3 vd = normalize(uCam - vW);
    float ndv = abs(dot(n, vd)), fres = 0.04 + 0.96 * pow(1.0 - ndv, 5.0);
    vec3 r = reflect(-vd, n * sign(dot(n, vd)));
    vec3 env = mix(vec3(0.05, 0.045, 0.04), vec3(0.95, 0.86, 0.74), smoothstep(-0.2, 0.7, r.x)) * (0.55 + 0.45 * smoothstep(-0.4, 0.6, r.y));
    float rough = 0.8 + 0.4 * vnoise(vW * 2.5);                                         // slight roughness variation
    float sun = smoothstep(-0.5, 3.6, vW.y);
    vec3 c; float a;
    if (abs(vLN.z) > 0.5) {                              // the two large faces: reflection + faint warm transmission
      vec2 e = vec2(min(vUv.x, 1.0 - vUv.x) * uSize.x, min(vUv.y, 1.0 - vUv.y) * uSize.y);
      float edge = exp(-min(e.x, e.y) / 0.006);
      c = env; a = fres * 0.55 * rough + uFace * sun;
      c = mix(c, vec3(1.0, 0.82, 0.62), uFace * 4.0 * sun);                             // warm light carried in the material
      c = mix(c, vec3(1.0, 0.92, 0.82), edge); a += edge * 0.28;
      float g = hitGlow(vW, 0.035);
      c = mix(c, ember, clamp(g * 0.85 + edge * uOrange, 0.0, 1.0)); a += g * 0.22;
    } else {                                             // the thin thickness faces: quiet, warm, refractive-looking
      c = mix(vec3(0.75, 0.68, 0.58), ember, uOrange * 0.6) * (0.55 + 0.6 * sun); a = 0.42;
    }
    c = haze(c, vW);
    if (uMirror > 0.5) a *= 0.6 * exp(vW.y * 1.4);
    gl_FragColor = vec4(c, clamp(a, 0.0, 1.0));
  }`;

// ---- Ember: thin core, brighter and haloed only near its crossings ----
const EMBER_VS = `
  attribute float aT; attribute float aG; varying float vT; varying float vG; varying vec3 vN; varying vec3 vW;
  void main() { vT = aT; vG = aG; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`;
const EMBER_FS = `
  uniform vec3 uCam; uniform float uHalo; uniform float uMirror; varying float vT; varying float vG; varying vec3 vN; varying vec3 vW;
  void main() {
    float f = abs(dot(normalize(vN), normalize(uCam - vW)));
    float fade = smoothstep(0.0, 0.14, vT) * smoothstep(1.0, 0.92, vT);
    vec3 c; float a;
    if (uHalo > 0.5) { c = vec3(1.0, 0.42, 0.13); a = pow(f, 2.4) * (0.06 + 0.34 * vG) * fade; }
    else { float k = 0.62 + 0.38 * vG; c = mix(vec3(0.95, 0.34, 0.09), vec3(1.0, 0.86, 0.68), pow(f, 2.0) * k) * k; a = fade; }
    if (uMirror > 0.5) a *= 0.5 * exp(vW.y * 1.4);
    gl_FragColor = vec4(c, a);
  }`;

const FRAG_VS = `
  attribute vec3 aCol; varying vec3 vCol;
  void main() { vCol = aCol; gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0); }`;
const FRAG_FS = 'varying vec3 vCol; void main(){ gl_FragColor = vec4(vCol, 0.8); }';
const QUAD_VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
const BLUR_FS = `
  uniform sampler2D t; uniform vec2 uDir; varying vec2 vUv;
  void main() { vec3 s = vec3(0.0); float ws = 0.0; for (int i = -6; i <= 6; i++) { float x = float(i); float w = exp(-x * x / 18.0); s += texture2D(t, vUv + uDir * x).rgb * w; ws += w; } gl_FragColor = vec4(s / ws, 1.0); }`;

export const HERO_V3 = {
  rowA: [-0.6, 0, 2.4], rowB: [6.2, 0, -4.8],      // the row recedes into depth (front-left -> back-right)
  faceYaw: 40,                                      // the planes' own facing (degrees): a 3/4 view of every face
  camPos: [-0.6, 1.75, 11.5], camLook: [2.4, 1.45, -1.0], fov: 32, shift: -0.78,
  sun: [0.15, 0.5, 0.85], split: [0.4, 0.62], haze: [0.5, 0.44, 0.38],
};

export async function createHeroV3(THREE, { tune = {} } = {}) {
  const T = Object.assign({}, HERO_V3, tune);
  const disposables = [];
  const V = (a) => new THREE.Vector3(...a);
  const camera = new THREE.PerspectiveCamera(T.fov, 16 / 9, 0.1, 80);
  camera.position.copy(V(T.camPos)); camera.lookAt(V(T.camLook));
  const cam = { value: camera.position.clone() }, sun = { value: V(T.sun).normalize() }, haze = { value: V(T.haze) }, hazeGate = { value: new THREE.Vector3(1440, T.split[0], T.split[1] + 0.1) };
  const scene = new THREE.Scene(), mscene = new THREE.Scene(); mscene.background = new THREE.Color(0, 0, 0);
  const mat = (vs, fs, uniforms, extra = {}) => { const m = new THREE.ShaderMaterial({ vertexShader: vs, fragmentShader: fs, uniforms, toneMapped: false, ...extra }); disposables.push(m); return m; };
  const add = (geo, m, parent = scene) => { if (!disposables.includes(geo)) disposables.push(geo); const o = new THREE.Mesh(geo, m); o.frustumCulled = false; parent.add(o); return o; };

  const A = V(T.rowA), B = V(T.rowB), d = B.clone().sub(A).normalize(), side = new THREE.Vector3(-d.z, 0, d.x);
  const at = (u, lateral = 0) => A.clone().lerp(B, u).addScaledVector(side, lateral);
  const faceYaw = THREE.MathUtils.degToRad(T.faceYaw);
  const ROW = [   // kind, u, lateral, width, height, bottom, options — FRONT glass … slim charcoal + ceramic core … REAR glass
    ['glass', 0.0, 0.1, 2.2, 3.3, 0.05, {}],
    ['glass', 0.05, -0.15, 1.6, 2.5, 0.6, { face: 0.008 }],
    ['solid', 0.15, 0.0, 1.9, 3.15, 0.05, { th: 0.1, base: [0.07, 0.068, 0.068], tex: 0.35, gloss: 0.22 }],
    ['solid', 0.185, 0.12, 1.6, 2.85, 0.05, { th: 0.05, base: [0.1, 0.095, 0.092], tex: 0.3, gloss: 0.3 }],
    ['glass', 0.25, -0.05, 2.1, 3.1, 0.1, { orange: 0.35 }],
    ['solid', 0.33, 0.05, 2.0, 2.95, 0.12, { th: 0.1, base: [0.82, 0.78, 0.72], tex: 0.12, gloss: 0.12 }],
    ['glass', 0.42, -0.1, 1.9, 2.85, 0.18, {}],
    ['glass', 0.47, 0.15, 1.8, 2.6, 0.3, { orange: 0.25 }],
    ['solid', 0.6, 0.0, 1.1, 2.1, 0.5, { th: 0.12, base: [0.065, 0.063, 0.063], tex: 0.35, gloss: 0.22 }],
    ['glass', 0.72, -0.1, 1.7, 2.4, 0.35, {}],
  ];
  const signalY = (u) => 1.55 - 0.15 * u;
  const hits = ROW.map(([, u, lat]) => at(u, lat * 0).setY(signalY(u)));
  while (hits.length < 12) hits.push(new THREE.Vector3(0, -50, 0));
  const uHits = { value: hits };

  // room
  const wall = add(new THREE.PlaneGeometry(2, 2), mat(WALL_VS, WALL_FS, { uSplit: { value: new THREE.Vector2(...T.split) } }, { depthWrite: false }));
  wall.renderOrder = -10;
  const rtR1 = new THREE.WebGLRenderTarget(2, 2), rtR2 = new THREE.WebGLRenderTarget(2, 2); disposables.push(rtR1, rtR2);
  const foot = [], footS = [];
  for (const [kind, u, lat, w, h, b, o] of ROW) { const p = at(u, lat); foot.push(new THREE.Vector3(p.x, faceYaw, p.z)); footS.push(new THREE.Vector3(w, kind === 'glass' ? 0.035 : o.th, b < 0.3 ? 1.0 : 0.45)); }
  while (foot.length < 12) { foot.push(new THREE.Vector3(0, 0, 999)); footS.push(new THREE.Vector3(0, 0, 0)); }
  const floor = add(new THREE.PlaneGeometry(60, 60), mat(FLOOR_VS, FLOOR_FS, { uSplit: { value: new THREE.Vector2(...T.split) }, uRowA: { value: A }, uRowB: { value: B },
    tRefl: { value: rtR2.texture }, uFoot: { value: foot }, uFootS: { value: footS }, uHaze: haze, uHazeGate: hazeGate, uCam: cam }));
  floor.rotation.x = -Math.PI / 2; floor.renderOrder = -5;
  // two faint shafts of window light through the air, falling from the upper right into the composition
  for (const [x, z, w, rotZ, g] of [[2.6, -2.4, 1.6, -0.5, 0.05], [4.2, -4.6, 2.2, -0.45, 0.04]]) {
    const s = add(new THREE.PlaneGeometry(w, 9), mat(SHAFT_VS, SHAFT_FS, { uGain: { value: g } }, { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    s.position.set(x, 3.6, z); s.rotation.set(0, -0.6, rotZ); s.renderOrder = 8;
  }

  // the row (real + its mirror image for the floor reflection)
  const real = new THREE.Group(), mirror = new THREE.Group(); mirror.scale.y = -1; scene.add(real); mscene.add(mirror);
  for (const [kind, u, lat, w, h, b, o] of ROW) {
    const p = at(u, lat); const geo = new THREE.BoxGeometry(w, h, kind === 'glass' ? 0.03 : o.th);
    for (const [grp, mir] of [[real, 0], [mirror, 1]]) {
      const m = kind === 'glass'
        ? mat(GLASS_VS, GLASS_FS, { uSize: { value: new THREE.Vector2(w, h) }, uCam: cam, uHits, uOrange: { value: o.orange || 0 }, uMirror: { value: mir },
            uFace: { value: o.face == null ? 0.022 : o.face }, uHaze: haze, uHazeGate: hazeGate }, { transparent: true, depthWrite: false, side: THREE.DoubleSide })
        : mat(SOLID_VS, SOLID_FS, { uBase: { value: V(o.base) }, uTex: { value: o.tex }, uGloss: { value: o.gloss }, uSun: sun, uMirror: { value: mir }, uCam: cam, uHits, uHaze: haze, uHazeGate: hazeGate },
            { side: mir ? THREE.DoubleSide : THREE.FrontSide });
      const mesh = add(geo, m, grp); mesh.position.set(p.x, b + h / 2, p.z); mesh.rotation.y = faceYaw;
    }
  }
  // the Ember: enters unsteady from the text side, passes through the row, leaves calm; brighter only near its crossings
  const pts = [], us = [];
  for (let i = 0; i <= 200; i++) {
    const t = i / 200, u = -0.22 + 1.12 * t;
    const calm = Math.min(1, Math.max(0, (u + 0.02) / 0.55));
    const amp = (1 - calm) * 0.24 + 0.03, wob = Math.sin(u * 24.0) * amp + Math.sin(u * 61.0) * amp * 0.2 * (1 - calm);
    pts.push(at(u, (1 - calm) * 0.22 * Math.sin(u * 14.0)).setY(signalY(u) + wob)); us.push(u);
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  const SEG = 520, RAD = 10;
  const tube = (r) => {
    const g = new THREE.TubeGeometry(curve, SEG, r, RAD, false); const n = g.attributes.position.count, aT = new Float32Array(n), aG = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const t = Math.floor(i / (RAD + 1)) / SEG, u = -0.22 + 1.12 * t; aT[i] = t;
      let gg = 0; for (const [, uu] of ROW) gg = Math.max(gg, Math.exp(-((u - uu) ** 2) / 0.0012)); aG[i] = gg;
    }
    g.setAttribute('aT', new THREE.BufferAttribute(aT, 1)); g.setAttribute('aG', new THREE.BufferAttribute(aG, 1)); return g;
  };
  const core = tube(0.011), halo = tube(0.07);
  for (const [grp, mir] of [[real, 0], [mirror, 1]]) {
    add(core, mat(EMBER_VS, EMBER_FS, { uCam: cam, uHalo: { value: 0 }, uMirror: { value: mir } }, { transparent: true }), grp);
    add(halo, mat(EMBER_VS, EMBER_FS, { uCam: cam, uHalo: { value: 1 }, uMirror: { value: mir } }, { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), grp);
  }
  // complexity: small fragments around the entry + a few fine vertical traces through the row
  const fr = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  const N = 40, qg = new THREE.PlaneGeometry(1, 1); disposables.push(qg);
  const inst = new THREE.InstancedMesh(qg.clone(), mat(FRAG_VS, FRAG_FS, {}, { transparent: true, depthWrite: false, side: THREE.DoubleSide }), N);
  const cols = new Float32Array(N * 3), m4 = new THREE.Matrix4(), q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), faceYaw);
  for (let i = 0; i < N; i++) {
    const trace = i >= N - 5;
    const u = trace ? 0.1 + (i - (N - 5)) * 0.13 : -0.16 + fr() * 0.2;
    const pos = at(u, (fr() - 0.5) * (trace ? 0.3 : 1.2)).setY(trace ? 1.9 : 0.9 + fr() * 1.6);
    const s = trace ? new THREE.Vector3(0.005, 2.4 + fr() * 1.4, 1) : new THREE.Vector3(0.015 + fr() * 0.05, 0.015 + fr() * (fr() < 0.3 ? 0.14 : 0.04), 1);
    m4.compose(pos, q, s); inst.setMatrixAt(i, m4);
    const orange = trace || fr() < 0.2, gray = 0.4 + fr() * 0.35;
    cols.set(orange ? [0.95, 0.48, 0.2] : [gray, gray * 0.97, gray * 0.93], i * 3);
  }
  inst.geometry.setAttribute('aCol', new THREE.InstancedBufferAttribute(cols, 3)); disposables.push(inst.geometry);
  inst.frustumCulled = false; real.add(inst);

  // reflection blur
  const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const blur = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat(QUAD_VS, BLUR_FS, { t: { value: null }, uDir: { value: new THREE.Vector2() } }, { depthTest: false, depthWrite: false }));
  disposables.push(blur.geometry); const blurS = new THREE.Scene(); blurS.add(blur);
  const pass = (r, src, dst, dx, dy) => { blur.material.uniforms.t.value = src.texture; blur.material.uniforms.uDir.value.set(dx, dy); r.setRenderTarget(dst); r.render(blurS, ortho); };

  let W = 0, H = 0;
  function size(w, h) {
    W = w; H = h; hazeGate.value.x = w; camera.aspect = w / h; camera.updateProjectionMatrix();
    camera.projectionMatrix.elements[8] = T.shift * Math.min(1, (w / h) / 1.6); camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
    rtR1.setSize(w >> 1, h >> 1); rtR2.setSize(w >> 1, h >> 1);
  }
  return {
    camera,
    stats: { elements: ROW.length, fragments: N },
    setStory() {}, settling() { return false; }, story() { return 0; },
    render(renderer) {
      const s = renderer.getDrawingBufferSize(new THREE.Vector2());
      if (s.x !== W || s.y !== H) size(s.x, s.y);
      renderer.setRenderTarget(rtR2); renderer.render(mscene, camera);                     // the mirrored row
      const k = W / 1440;
      pass(renderer, rtR2, rtR1, 2.2 * k / rtR1.width, 0); pass(renderer, rtR1, rtR2, 0, 2.2 * k / rtR1.height);   // blurred: a satin floor
      renderer.setRenderTarget(null); renderer.render(scene, camera);
    },
    dispose() { for (const x of disposables) x.dispose(); },
  };
}
