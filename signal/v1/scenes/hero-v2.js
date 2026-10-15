/*
 * Scene: hero v2 — Stage 2 realtime build of the LOCKED offline Hero (athar_hero_V2.lock.blend).
 * 2A (approved): the approved Cycles look projected from the locked camera onto live 3D geometry.
 *   plate — environment without the object (keeps its shadows/reflections); stone — live geometry, stone-only layer
 *   projected; resin — live geometry (one box per slab), the approved frame projected; real depth testing.
 * 2B.1: the Ember and its light.
 *   ember      — live tube geometry (white-hot axis, orange silhouette), depth-tested against stone and resin: only the
 *                directly visible Ember is drawn live.
 *   emberlight — everything the Ember does to the glass and the room, baked from the locked Cycles frame (Ember invisible to the
 *                camera but seen through the resin and in reflections, minus the frame without it): in-slab beams, diffusion
 *                through the resin, warm slab edges, floor reflections. Added over the frame; its gain is the 2C reveal control.
 *   glow       — the centre glow volumes as seen through the resin (Cycles: frame with glow − frame without), added likewise.
 *   halo       — the soft core of the saturated emission, from the directly visible Ember only.
 *   post       — the same restrained bloom + vignette the approved offline frame uses (threshold, two blur radii, warm tint).
 * 2C.1 (motion prototype): one scroll story, a pure function of the story value (0 = the approved 2B.1 frame, exactly),
 *   UNRESOLVED -> INVESTIGATED -> STRUCTURED -> CLEAR:
 *   entry      — the arrival wavers and flickers faintly (scroll-driven) until order reaches it, then settles;
 *   front      — a restrained packet travels along the Ember with a darker ring around it (local contrast), so it is seen to
 *                disappear behind stone and reappear through the resin depths (live depth);
 *   resin      — each slab the route crosses answers when the front reaches it and then settles (layer by layer); slabs never move;
 *   ordering   — the two fine strands first drift slightly apart, then close onto the centre strand (never merged into one bar);
 *                the centre glow lifts during that moment;
 *   exit       — the outgoing line thins and calms: cleaner than the incoming one.
 *   The camera never moves. Frames only while scrolling / easing; nothing loops.
 * Framing: the locked 1440x900 frame covers the canvas, anchored right and vertically centred (as the static image is).
 * Everything is display-referred (Cycles AgX already applied) — no tone mapping or colour conversion here.
 */

const PATH = `
  uniform float uPathY[64]; uniform vec2 uPathX;
  float pathY(float x) {                                 // the Ember route's frame y (from top) at frame x
    float t = clamp((x - uPathX.x) / (uPathX.y - uPathX.x), 0.0, 1.0) * 63.0; int i = int(min(floor(t), 62.0));
    return mix(uPathY[i], uPathY[i + 1], t - float(i));
  }`;
const PROJ_VS = `
  uniform mat4 uProjVP;
  varying vec4 vClip;
  #ifdef RESPOND
  attribute float aSlab; uniform vec3 uSlab[32]; uniform float uFront; uniform vec2 uSettle; varying float vResp;
  #endif
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vClip = uProjVP * w;
    #ifdef RESPOND
    // this slab answers when the front reaches it, holds while the front crosses it, then settles to a faint residue
    vec3 sl = uSlab[int(aSlab * 255.0 + 0.5)];
    vResp = sl.z * smoothstep(sl.x - 0.01, sl.x + 0.035, uFront) * mix(1.0, uSettle.y, smoothstep(sl.y, sl.y + uSettle.x, uFront));
    #endif
    gl_Position = projectionMatrix * viewMatrix * w;
  }`;
const PROJ_FS = `
  uniform sampler2D tLook; uniform vec4 uRect; uniform float uAlphaTest;
  varying vec4 vClip;
  #ifdef RESPOND
  ` + PATH + `
  uniform sampler2D tLight; uniform vec4 uLightRect; uniform vec2 uResp; varying float vResp;
  #endif
  void main() {
    vec2 s = vClip.xy / vClip.w * 0.5 + 0.5;                       // 0..1 across the locked frame
    vec2 uv = (vec2(s.x, 1.0 - s.y) - uRect.xy) / uRect.zw;        // into the crop (image space, y down)
    vec4 c = texture2D(tLook, vec2(uv.x, 1.0 - uv.y));
    if (c.a < uAlphaTest) discard;
    vec3 col = c.rgb;
    #ifdef RESPOND
    if (vResp > 0.0) {                                   // exactly 0 at rest: the approved look untouched
      vec2 f = vec2(s.x, 1.0 - s.y); float band = exp(-pow((f.y - pathY(f.x)) / 0.075, 2.0));
      vec2 lu = (f - uLightRect.xy) / uLightRect.zw;
      vec3 L = (lu.x < 0.0 || lu.y < 0.0 || lu.x > 1.0 || lu.y > 1.0) ? vec3(0.0) : texture2D(tLight, vec2(lu.x, 1.0 - lu.y)).rgb;
      col += vResp * band * (L * uResp.x + vec3(1.0, 0.55, 0.26) * uResp.y * (0.3 + dot(col, vec3(0.3, 0.5, 0.2))));
    }
    #endif
    gl_FragColor = vec4(col, 1.0);
  }`;
const EMBER_VS = `
  attribute float aK; attribute vec3 aMove;
  uniform mat4 uProjVP; uniform float uFront; uniform float uOrderLen; uniform float uMoveScale; uniform float uUnsteady; uniform float uPhase;
  uniform float uAlign; uniform float uThin; uniform vec2 uExit;
  varying float vK; varying vec3 vN; varying vec3 vV; varying float vFx; varying float vOrd;
  void main() {
    vK = aK; vec4 w = modelMatrix * vec4(position, 1.0);
    vN = normal / vec3(modelMatrix[0][0], modelMatrix[1][1], modelMatrix[2][2]);   // the model matrix is translate + scale only (quantization box)
    vec4 pc = uProjVP * w; vFx = pc.x / pc.w * 0.5 + 0.5;                           // frame x on the locked frame: the story's axis
    float ord = smoothstep(0.0, uOrderLen, uFront - vFx); vOrd = ord;               // order arrives behind the front
    float k = floor(aK * 255.0 + 0.5);
    if (k < 0.5) {             // arrival: a slow, shallow waver before order reaches it, then it settles (scroll-driven; 0 at rest)
      w.xyz += aMove * uMoveScale * (ord - uUnsteady * (1.0 - ord) * sin(vFx * 24.0 - uPhase));
    } else if (k < 1.5) {      // fine strands: drift apart while unresolved, then close onto the centre strand (as a whole)
      w.xyz += aMove * uMoveScale * uAlign;
    } else if (k > 2.5) {      // outgoing line: thins once the centre has resolved (tube vertices pulled towards the axis)
      w.xyz -= normalize(vN) * uExit.y * uThin * smoothstep(uExit.x, uExit.x + 0.03, vFx);
    }
    vV = cameraPosition - w.xyz; gl_Position = projectionMatrix * viewMatrix * w;
  }`;
const EMBER_FS = `
  uniform vec3 uEdge[4]; uniform vec3 uCore[4]; uniform float uCoreExp; uniform float uFront; uniform vec3 uPacket;
  uniform float uFlicker; uniform float uPhase; uniform float uStrandDim; uniform float uThin; uniform vec2 uExit;
  varying float vK; varying vec3 vN; varying vec3 vV; varying float vFx; varying float vOrd;
  void main() {                                          // an emissive tube: white-hot along its axis, saturated orange towards its silhouette
    int k = int(vK * 255.0 + 0.5);
    vec3 e = k == 0 ? uEdge[0] : k == 1 ? uEdge[1] : k == 2 ? uEdge[2] : uEdge[3];
    vec3 c = k == 0 ? uCore[0] : k == 1 ? uCore[1] : k == 2 ? uCore[2] : uCore[3];
    float f = abs(dot(normalize(vN), normalize(vV)));
    float d = (vFx - uFront) / uPacket.y, packet = pow(max(0.0, 1.0 - d * d), 2.0);   // compact: exactly 0 away from the front
    if (k == 1 || k == 2) packet *= 0.5;                 // gentler through the strands: the ordering must not flare into a bundle
    float d2 = d / 2.6, ring = max(0.0, pow(max(0.0, 1.0 - d2 * d2), 2.0) - packet);    // a darker ring around it: local contrast
    vec3 col = mix(e, c, pow(f, uCoreExp));
    col = mix(col * (1.0 + 0.4 * uPacket.x * packet), vec3(1.0, 0.86, 0.72), 0.55 * uPacket.x * packet);   // hotter, towards the Ember's warm white (no clipping hue shift)
    col *= 1.0 - uPacket.z * ring;
    if (k == 0) col *= 1.0 - uFlicker * (1.0 - vOrd) * (0.5 + 0.5 * sin(vFx * 55.0 - uPhase * 1.7));   // the unresolved arrival flickers faintly
    if (k == 1) col *= 1.0 - uStrandDim;                                                                  // closing strands quieten (no neon bundle)
    if (k == 3) col *= 1.0 - 0.2 * uThin * smoothstep(uExit.x, uExit.x + 0.03, vFx);                      // the outgoing line calms
    gl_FragColor = vec4(col, 1.0);
  }`;
const LAYER_FS = PATH + `
  uniform sampler2D tLayer; uniform vec4 uRect; uniform float uGain; uniform vec4 uWin; varying vec2 vUv;
  uniform float uFront; uniform vec2 uReact; uniform vec4 uFanRect; uniform float uFanDim; uniform vec2 uClean;
  void main() {                                          // a projected crop of a baked light layer (display-referred), added
    vec2 s = uWin.xy + vec2(vUv.x, 1.0 - vUv.y) * uWin.zw; vec2 uv = (s - uRect.xy) / uRect.zw;
    if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) discard;
    // 2C: the glass answers locally as the front reaches it; where the strands have left their baked positions the baked
    // strand light eases (both exactly 0 at rest)
    float d = (s.x - uFront) / uReact.y, react = pow(max(0.0, 1.0 - d * d), 2.0) * exp(-pow((s.y - pathY(s.x)) / 0.09, 2.0));
    vec2 q = (s - uFanRect.xy) / uFanRect.zw;
    float fan = smoothstep(-0.25, 0.1, q.x) * smoothstep(1.25, 0.9, q.x) * smoothstep(-1.2, 0.0, q.y) * smoothstep(2.2, 1.0, q.y);
    vec3 L = texture2D(tLayer, vec2(uv.x, 1.0 - uv.y)).rgb;
    if (uClean.y > 0.0) {                                // exit: keep the bright core, hold back the soft spread (exactly off at rest)
      float zone = smoothstep(uClean.x, uClean.x + 0.03, s.x) * exp(-pow((s.y - pathY(s.x)) / 0.08, 2.0));
      L *= 1.0 - uClean.y * zone * (1.0 - smoothstep(0.12, 0.55, dot(L, vec3(0.3, 0.55, 0.15))));
    }
    gl_FragColor = vec4(L * uGain * (1.0 + uReact.x * react) * (1.0 - uFanDim * fan), 1.0);
  }`;
const HALO_FS = `
  uniform sampler2D tHalo; uniform float uGain; varying vec2 vUv;
  void main() { gl_FragColor = vec4(texture2D(tHalo, vUv).rgb * uGain, 1.0); }`;   // the saturated emission's soft core, added after everything
const QUAD_VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
const BRIGHT_FS = `
  uniform sampler2D t; varying vec2 vUv;
  void main() {
    vec3 lin = pow(texture2D(t, vUv).rgb, vec3(2.2)); float l = max(lin.r, max(lin.g, lin.b));
    vec3 b = lin * clamp((l - 0.55) / 0.45, 0.0, 1.0);
    gl_FragColor = vec4(pow(b, vec3(1.0 / 2.2)), 1.0);      // the offline post thresholds in linear, blurs display values
  }`;
const BLUR_FS = `
  uniform sampler2D t; uniform vec2 uDir; varying vec2 vUv;
  void main() {
    vec3 s = vec3(0.0); float wsum = 0.0;
    for (int i = -6; i <= 6; i++) { float x = float(i); float w = exp(-x * x / 18.0); s += texture2D(t, vUv + uDir * x).rgb * w; wsum += w; }
    gl_FragColor = vec4(s / wsum, 1.0);
  }`;
const COMP_FS = `
  uniform sampler2D tScene; uniform sampler2D tB1; uniform sampler2D tB2; uniform vec4 uWin; varying vec2 vUv;
  void main() {
    vec3 lin = pow(texture2D(tScene, vUv).rgb, vec3(2.2));
    vec3 bloom = pow(texture2D(tB1, vUv).rgb, vec3(2.2)) * 0.42 + pow(texture2D(tB2, vUv).rgb, vec3(2.2)) * 0.6;
    lin += bloom * vec3(1.0, 0.82, 0.68);
    vec2 f = uWin.xy + vec2(vUv.x, 1.0 - vUv.y) * uWin.zw;   // frame coordinates (the vignette belongs to the locked frame)
    float side = clamp(f.x / 0.62, 0.0, 1.0), y = f.y;
    lin *= (0.55 + 0.45 * side) * (1.0 - 0.35 * pow((y - 0.5) * 1.6, 2.0));
    gl_FragColor = vec4(pow(clamp(lin, 0.0, 1.0), vec3(1.0 / 2.2)), 1.0);
  }`;

export const EMBER_DEFAULTS = {          // display-referred Ember colours per class (faint arrival, fine strands, centre strand, main line): silhouette / axis
  edge: [[0.7, 0.3, 0.13], [1.0, 0.36, 0.2], [1.0, 0.38, 0.22], [1.0, 0.38, 0.22]],
  core: [[1.0, 0.78, 0.62], [1.0, 0.74, 0.66], [1.0, 0.84, 0.78], [1.0, 0.84, 0.78]],
  // halo kept low: the baked emberlight already carries the glow around the Ember, a stronger live core would light it twice
  coreExp: 1.0, halo: 1.0, haloStep: 0.5, emberlight: 1.0, glow: 1.0, bloom: true,
  // 2C.1 motion (frame-x units; all effects are exactly zero at story 0)
  orderLen: 0.1,           // how far behind the front the arrival takes to settle
  packet: [1.0, 0.04, 0.22], // the travelling packet: brightness boost, half-width, darkening of the ring around it
  react: [0.3, 0.07],      // baked light answering the front near the route: boost, half-width
  respond: [0.6, 0.14],    // a slab answering the front: its baked Ember light, warm fill
  settle: [0.06, 0.15],    // ... settles over this distance once the front has passed, to this residue
  unsteady: 0.7,           // arrival waver before order reaches it (fraction of its settle offset)
  flicker: 0.3,            // arrival brightness unevenness before order reaches it
  align: 0.9,              // how far the fine strands close onto the centre strand (1 = coincident)
  spread: 0.3,             // ... and how far they drift apart first, while unresolved
  strandDim: 0.22,         // closing strands quieten
  thin: 0.45,              // the outgoing line thins by this fraction of its radius and calms
  clean: 0.6,              // ... and the soft spread of its baked glass light is held back (core kept)
  fanDim: 0.5,             // baked strand light eased once the strands have closed up
  glowLift: [0.35, 0.12],  // centre glow: lift during the ordering moment, kept after
  // story -> front (frame x): entry 0..0.2, investigation ..0.5, ordering ..0.8, clear ..1
  beats: [0.2, 0.5, 0.8],
  ease: 0.22,              // seconds: the story eases onto the scroll position
};

export async function createHeroV2(THREE, { base, lang = 'en', tune = {} }) {
  const T = Object.assign({}, EMBER_DEFAULTS, tune);
  const [man, bin] = await Promise.all([
    fetch(`${base}/hero_v2_${lang}.json`).then((r) => r.json()),
    fetch(`${base}/hero_v2_${lang}.bin`).then((r) => r.arrayBuffer()),
  ]);
  const loadTex = (u) => new Promise((res, rej) => new THREE.TextureLoader().load(u, (t) => { t.colorSpace = THREE.NoColorSpace; t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; res(t); }, undefined, rej));
  const TX = man.textures;
  const opt = (k) => (TX[k] ? loadTex(`${base}/${TX[k].file}`) : Promise.resolve(null));
  const [plate, stoneTex, resinTex, glowTex, lightTex] = await Promise.all([loadTex(`${base}/plate_${lang}.webp`), loadTex(`${base}/${TX.stone.file}`), loadTex(`${base}/${TX.resin.file}`), opt('glow'), opt('emberlight')]);
  const disposables = [plate, stoneTex, resinTex]; if (glowTex) disposables.push(glowTex); if (lightTex) disposables.push(lightTex);
  const TA = { uint16: Uint16Array, uint32: Uint32Array, uint8: Uint8Array, int16: Int16Array };
  const view = (s) => new TA[s.dtype](bin, s.offset, s.count);

  const C = man.camera, aspect = C.res[0] / C.res[1];
  const hfov = 2 * Math.atan((C.sensor_width / 2) / C.lens);
  const camera = new THREE.PerspectiveCamera(THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(hfov / 2) / aspect)), aspect, 0.1, 100);
  camera.matrixAutoUpdate = false; camera.matrix.fromArray(C.matrix); camera.matrixWorld.copy(camera.matrix); camera.matrixWorldInverse.copy(camera.matrix).invert();
  camera.setViewOffset(C.res[0], C.res[1], C.shift_x * C.res[0], -C.shift_y * C.res[0], C.res[0], C.res[1]); camera.updateProjectionMatrix();
  const projVP = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);   // the locked projector (full frame)

  const geo = (m, extra) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(view(m.position), 3, true)); g.setIndex(new THREE.BufferAttribute(view(m.index), 1));
    if (extra) extra(g); disposables.push(g); return g;
  };
  const placed = (o, m) => { o.position.fromArray(m.min); o.scale.set(m.max[0] - m.min[0], m.max[1] - m.min[1], m.max[2] - m.min[2]); o.frustumCulled = false; return o; };
  const MO = man.motion || { emberX: [0.43, 1], fanRect: [0.74, 0.5, 0.15, 0.04] }, em = man.meshes.ember;
  const front = { value: MO.emberX[0] - T.packet[1] * 2.6 - 0.02 };                 // the story's front (frame x); at rest: before the Ember (and its ring)
  const pathU = { uPathY: { value: MO.pathY || new Array(64).fill(0.52) }, uPathX: { value: new THREE.Vector2(...(MO.pathX || [0.4, 1.05])) } };
  const respond = !!(MO.slabs && man.meshes.resin.slab && lightTex);
  const projMat = (tex, rect, { alphaTest = 0, resp = false, ...rest }) => {
    const uniforms = { uProjVP: { value: projVP }, tLook: { value: tex }, uRect: { value: new THREE.Vector4(...rect) }, uAlphaTest: { value: alphaTest } };
    if (resp) {
      const sl = MO.slabs.map((v) => new THREE.Vector3(...v)); while (sl.length < 32) sl.push(new THREE.Vector3(2, 2, 0));
      Object.assign(uniforms, pathU, { uSlab: { value: sl }, uFront: front, uSettle: { value: new THREE.Vector2(...T.settle) }, tLight: { value: lightTex },
        uLightRect: { value: new THREE.Vector4(...TX.emberlight.rect) }, uResp: { value: new THREE.Vector2(...T.respond) } });
    }
    const m = new THREE.ShaderMaterial({ vertexShader: PROJ_VS, fragmentShader: PROJ_FS, toneMapped: false, ...rest, defines: resp ? { RESPOND: '' } : {}, uniforms });
    disposables.push(m); return m;
  };
  const stoneGeo = geo(man.meshes.stone);
  const resinGeo = geo(man.meshes.resin, (g) => { if (respond) g.setAttribute('aSlab', new THREE.BufferAttribute(view(man.meshes.resin.slab), 1, true)); });
  const stone = placed(new THREE.Mesh(stoneGeo, projMat(stoneTex, TX.stone.rect, { alphaTest: 0.5, side: THREE.DoubleSide })), man.meshes.stone); stone.renderOrder = 1;
  const resin = placed(new THREE.Mesh(resinGeo, projMat(resinTex, TX.resin.rect, { side: THREE.FrontSide, resp: respond })), man.meshes.resin); resin.renderOrder = 2;

  const emberMat = new THREE.ShaderMaterial({ vertexShader: EMBER_VS, fragmentShader: EMBER_FS, toneMapped: false,
    uniforms: { uEdge: { value: T.edge.map((c) => new THREE.Vector3(...c)) }, uCore: { value: T.core.map((c) => new THREE.Vector3(...c)) }, uCoreExp: { value: T.coreExp },
                uProjVP: { value: projVP }, uFront: front, uOrderLen: { value: T.orderLen }, uMoveScale: { value: em && em.moveScale || 0 },
                uUnsteady: { value: 0 }, uPhase: { value: 0 }, uPacket: { value: new THREE.Vector3(...T.packet) }, uFlicker: { value: 0 },
                uAlign: { value: 0 }, uStrandDim: { value: 0 }, uThin: { value: 0 },
                uExit: { value: new THREE.Vector2(MO.fanRect[0] + MO.fanRect[2], 0.013) } } }); disposables.push(emberMat);   // exit starts after the strands; main-line tube radius
  const emberGeo = em ? geo(em, (g) => {
    g.setAttribute('aK', new THREE.BufferAttribute(view(em.cls), 1, true)); g.computeVertexNormals();
    g.setAttribute('aMove', em.move ? new THREE.BufferAttribute(view(em.move), 3, true) : new THREE.BufferAttribute(new Float32Array(em.verts * 3), 3));
  }) : null;
  const ember = emberGeo ? placed(new THREE.Mesh(emberGeo, emberMat), em) : null; if (ember) ember.renderOrder = 4;

  // ---- the directly visible Ember alone (stone and resin depth, Ember colour): the source of the halo ----
  const rtE = new THREE.WebGLRenderTarget(2, 2, { depthBuffer: true }); disposables.push(rtE);
  const depthMat = (side) => { const m = new THREE.MeshBasicMaterial({ colorWrite: false, side }); disposables.push(m); return m; };
  const emberScene = new THREE.Scene(); emberScene.background = new THREE.Color(0, 0, 0);
  const stoneDepth = placed(new THREE.Mesh(stoneGeo, depthMat(THREE.DoubleSide)), man.meshes.stone); stoneDepth.renderOrder = 1;
  const resinDepth = placed(new THREE.Mesh(resinGeo, depthMat(THREE.FrontSide)), man.meshes.resin); resinDepth.renderOrder = 2;
  emberScene.add(stoneDepth, resinDepth); if (ember) { const e2 = placed(new THREE.Mesh(emberGeo, emberMat), em); e2.renderOrder = 4; emberScene.add(e2); }

  // ---- the main frame ----
  const uWin = { value: new THREE.Vector4(0, 0, 1, 1) };   // visible window of the locked frame (x, y from top-left, w, h), in frame fractions
  const scene = new THREE.Scene(); scene.background = plate; scene.add(stone, resin); if (ember) scene.add(ember);
  const quad = (fs, uniforms, extra = {}) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ vertexShader: QUAD_VS, fragmentShader: fs, uniforms, depthTest: false, depthWrite: false, toneMapped: false, ...extra })); m.frustumCulled = false; disposables.push(m.geometry, m.material); return m; };
  const fanRect = new THREE.Vector4(...MO.fanRect);
  const layer = (tex, key, gain, react) => {
    const q = quad(LAYER_FS, { ...pathU, tLayer: { value: tex }, uRect: { value: new THREE.Vector4(...TX[key].rect) }, uGain: { value: gain }, uWin,
      uFront: front, uReact: { value: new THREE.Vector2(...react) }, uFanRect: { value: fanRect }, uFanDim: { value: 0 }, uClean: { value: new THREE.Vector2(MO.fanRect[0] + MO.fanRect[2] + 0.03, 0) } }, { transparent: true, blending: THREE.AdditiveBlending });
    q.renderOrder = 3; scene.add(q); return q;
  };
  const glowLayer = glowTex ? layer(glowTex, 'glow', T.glow, [0, 1]) : null;                  // the glow lifts as a whole (setStory)
  const lightLayer = lightTex ? layer(lightTex, 'emberlight', T.emberlight, T.react) : null;
  const rtH1 = new THREE.WebGLRenderTarget(2, 2), rtH2 = new THREE.WebGLRenderTarget(2, 2); disposables.push(rtH1, rtH2);
  const halo = quad(HALO_FS, { tHalo: { value: rtH2.texture }, uGain: { value: T.halo } }, { transparent: true, blending: THREE.AdditiveBlending }); halo.renderOrder = 5; scene.add(halo);
  // ---- post: bloom (two radii) + vignette ----
  const rtMain = new THREE.WebGLRenderTarget(2, 2, { samples: 4 }), rtA = new THREE.WebGLRenderTarget(2, 2), rtB = new THREE.WebGLRenderTarget(2, 2),
        rtC = new THREE.WebGLRenderTarget(2, 2), rtD = new THREE.WebGLRenderTarget(2, 2);
  disposables.push(rtMain, rtA, rtB, rtC, rtD);
  const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), one = (m) => { const s = new THREE.Scene(); s.add(m); return s; };
  const bright = quad(BRIGHT_FS, { t: { value: rtMain.texture } }), blur = quad(BLUR_FS, { t: { value: null }, uDir: { value: new THREE.Vector2() } });
  const comp = quad(COMP_FS, { tScene: { value: rtMain.texture }, tB1: { value: rtA.texture }, tB2: { value: rtD.texture }, uWin });
  const brightS = one(bright), blurS = one(blur), compS = one(comp);
  let W = 0, H = 0, k = 1;
  function size(w, h) {
    // cover: the locked frame scaled to cover w x h, anchored right and vertically centred
    const sc = Math.max(w / C.res[0], h / C.res[1]), FW = C.res[0] * sc, FH = C.res[1] * sc, x0 = FW - w, y0 = (FH - h) / 2;
    k = FW / 1440;                                                     // offline post radii are defined at 1440 px frame width
    uWin.value.set(x0 / FW, y0 / FH, w / FW, h / FH);
    plate.repeat.set(w / FW, h / FH); plate.offset.set(x0 / FW, 1 - (y0 + h) / FH); plate.matrixAutoUpdate = true;
    W = w; H = h; rtE.setSize(w, h); rtMain.setSize(w, h); rtH1.setSize(w >> 1, h >> 1); rtH2.setSize(w >> 1, h >> 1);
    rtA.setSize(w >> 1, h >> 1); rtB.setSize(w >> 1, h >> 1); rtC.setSize(w >> 2, h >> 2); rtD.setSize(w >> 2, h >> 2);
    camera.setViewOffset(FW, FH, C.shift_x * FW + x0, -C.shift_y * FW + y0, w, h); camera.updateProjectionMatrix();
  }
  const pass = (r, src, dst, dx, dy) => { blur.material.uniforms.t.value = src.texture; blur.material.uniforms.uDir.value.set(dx, dy); r.setRenderTarget(dst); r.render(blurS, ortho); };

  // ---- 2C: the scroll story (0 = the approved 2B.1 frame) ----
  const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  // the front's course: before the Ember -> end of the arrival (entry) -> start of the strands (investigation) -> just past the
  // strands (ordering) -> beyond the exit (clear); piecewise, so each beat gets its own share of the story
  const fanX0 = MO.fanRect[0], fanX1 = MO.fanRect[0] + MO.fanRect[2], fanMid = (fanX0 + fanX1) / 2;
  const KX = [front.value, 0.585, fanX0, fanX1 + 0.03, MO.emberX[1] + T.packet[1] * 2.6 + 0.04], KS = [0, ...T.beats, 1];
  const frontAt = (v) => { let i = 0; while (i < KS.length - 2 && v > KS[i + 1]) i++; const t = (v - KS[i]) / (KS[i + 1] - KS[i]); return KX[i] + (KX[i + 1] - KX[i]) * Math.min(1, Math.max(0, t)); };
  let story = 0, target = 0, lastT = 0;
  function applyStory() {
    const f = frontAt(story); front.value = f; const u = emberMat.uniforms, on = sm(0, 0.05, story);   // on: exactly 0 at rest
    u.uPhase.value = story * 40.0;                                                     // the arrival's waver / flicker move only with scroll
    u.uUnsteady.value = T.unsteady * on; u.uFlicker.value = T.flicker * on;
    const fanOrd = sm(fanX0, fanX1 + 0.03, f);                                         // how closed the central strands are
    const apart = T.spread * sm(T.beats[0] - 0.02, T.beats[1] - 0.05, story) * (1 - fanOrd);   // unresolved: drifting apart first
    u.uAlign.value = T.align * fanOrd - apart; u.uStrandDim.value = T.strandDim * fanOrd;
    u.uThin.value = T.thin * sm(fanX1, MO.emberX[1], f);                                 // the outgoing line calms as the front leaves
    if (lightLayer) { lightLayer.material.uniforms.uFanDim.value = T.fanDim * fanOrd; lightLayer.material.uniforms.uClean.value.y = T.clean * sm(fanX1, MO.emberX[1] + 0.05, f); }
    const bell = Math.max(0, 1 - ((f - fanMid) / 0.1) ** 2) ** 2;
    if (glowLayer) glowLayer.material.uniforms.uGain.value = T.glow * (1 + T.glowLift[0] * bell + T.glowLift[1] * fanOrd);
  }

  return {
    camera,
    /** 2C: the scroll story target (0..1); `now` true jumps straight to it. */
    setStory(v, now) { target = Math.min(1, Math.max(0, v)); if (now) { story = target; applyStory(); } },
    settling() { return Math.abs(target - story) > 1e-4; },
    story() { return story; },
    stats: { stoneTris: man.meshes.stone.tris, resinTris: man.meshes.resin.tris, emberTris: em ? em.tris : 0 },
    /** 2C controls (not animated yet): the baked Ember light and the centre glow scale with the Ember's state. */
    setLight({ emberlight, glow } = {}) {
      if (lightLayer && emberlight != null) lightLayer.material.uniforms.uGain.value = emberlight;
      if (glowLayer && glow != null) glowLayer.material.uniforms.uGain.value = glow;
    },
    render(renderer, now) {
      // ease the story onto the scroll target (time-based, frame-rate independent); snaps once close, so frames stop
      const t = now == null ? 0 : now, dt = lastT ? Math.min(0.1, (t - lastT) / 1000) : 1 / 60; lastT = t;
      if (story !== target) { story += (target - story) * (1 - Math.exp(-dt / T.ease)); if (Math.abs(target - story) <= 1e-4) story = target; applyStory(); }
      if (story === target) lastT = 0;                                                    // settled: the next scroll starts a fresh clock
      const s = renderer.getDrawingBufferSize(new THREE.Vector2());
      if (s.x !== W || s.y !== H) size(s.x, s.y);
      renderer.setRenderTarget(rtE); renderer.render(emberScene, camera);                // the directly visible Ember
      pass(renderer, rtE, rtH2, 0, 0); pass(renderer, rtH2, rtH1, T.haloStep * k / rtH1.width, 0); pass(renderer, rtH1, rtH2, 0, T.haloStep * k / rtH1.height);   // its soft core
      renderer.setRenderTarget(T.bloom ? rtMain : null); renderer.render(scene, camera);   // plate, stone, resin, Ember, baked light + glow, halo
      if (!T.bloom) { renderer.setRenderTarget(null); return; }
      // bloom: the offline post uses Gaussian radii of 6 px and 22 px at 1x; a 13-tap sigma-3 kernel at 1/2 and 1/4 res gives ~6 and ~22 px
      bright.material.uniforms.t.value = rtMain.texture; renderer.setRenderTarget(rtB); renderer.render(brightS, ortho);
      pass(renderer, rtB, rtA, k / rtA.width, 0); pass(renderer, rtA, rtB, 0, k / rtA.height);    // b1 (rtB): sigma 3 half-res texels = 6 px
      pass(renderer, rtB, rtA, 0, 0);                                                                 // keep b1 in rtA
      pass(renderer, rtA, rtD, 0, 0); pass(renderer, rtD, rtC, 1.75 * k / rtC.width, 0); pass(renderer, rtC, rtD, 0, 1.75 * k / rtC.height);  // b2 (rtD): ~sqrt(6^2+21^2) = 22 px
      renderer.setRenderTarget(null); renderer.render(compS, ortho);
    },
    dispose() { for (const d of disposables) d.dispose(); },
  };
}
