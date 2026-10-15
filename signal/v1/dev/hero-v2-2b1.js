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
 * Framing: the locked 1440x900 frame covers the canvas, anchored right and vertically centred (as the static image is).
 * Everything is display-referred (Cycles AgX already applied) — no tone mapping or colour conversion here.
 */

const PROJ_VS = `
  uniform mat4 uProjVP;
  varying vec4 vClip;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vClip = uProjVP * w;
    gl_Position = projectionMatrix * viewMatrix * w;
  }`;
const PROJ_FS = `
  uniform sampler2D tLook; uniform vec4 uRect; uniform float uAlphaTest;
  varying vec4 vClip;
  void main() {
    vec2 s = vClip.xy / vClip.w * 0.5 + 0.5;                       // 0..1 across the locked frame
    vec2 uv = (vec2(s.x, 1.0 - s.y) - uRect.xy) / uRect.zw;        // into the crop (image space, y down)
    vec4 c = texture2D(tLook, vec2(uv.x, 1.0 - uv.y));
    if (c.a < uAlphaTest) discard;
    gl_FragColor = vec4(c.rgb, 1.0);
  }`;
const EMBER_VS = `
  attribute float aK; varying float vK; varying vec3 vN; varying vec3 vV;
  void main() {
    vK = aK; vec4 w = modelMatrix * vec4(position, 1.0);
    vN = normal / vec3(modelMatrix[0][0], modelMatrix[1][1], modelMatrix[2][2]);   // the model matrix is translate + scale only (quantization box)
    vV = cameraPosition - w.xyz; gl_Position = projectionMatrix * viewMatrix * w;
  }`;
const EMBER_FS = `
  uniform vec3 uEdge[4]; uniform vec3 uCore[4]; uniform float uCoreExp; varying float vK; varying vec3 vN; varying vec3 vV;
  void main() {                                          // an emissive tube: white-hot along its axis, saturated orange towards its silhouette
    int k = int(vK * 255.0 + 0.5);
    vec3 e = k == 0 ? uEdge[0] : k == 1 ? uEdge[1] : k == 2 ? uEdge[2] : uEdge[3];
    vec3 c = k == 0 ? uCore[0] : k == 1 ? uCore[1] : k == 2 ? uCore[2] : uCore[3];
    float f = abs(dot(normalize(vN), normalize(vV)));
    gl_FragColor = vec4(mix(e, c, pow(f, uCoreExp)), 1.0);
  }`;
const LAYER_FS = `
  uniform sampler2D tLayer; uniform vec4 uRect; uniform float uGain; uniform vec4 uWin; varying vec2 vUv;
  void main() {                                          // a projected crop of a baked light layer (display-referred), added
    vec2 s = uWin.xy + vec2(vUv.x, 1.0 - vUv.y) * uWin.zw; vec2 uv = (s - uRect.xy) / uRect.zw;
    if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) discard;
    gl_FragColor = vec4(texture2D(tLayer, vec2(uv.x, 1.0 - uv.y)).rgb * uGain, 1.0);
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
  const TA = { uint16: Uint16Array, uint32: Uint32Array, uint8: Uint8Array };
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
  const projMat = (tex, rect, { alphaTest = 0, ...rest }) => {
    const m = new THREE.ShaderMaterial({ vertexShader: PROJ_VS, fragmentShader: PROJ_FS, toneMapped: false, ...rest,
      uniforms: { uProjVP: { value: projVP }, tLook: { value: tex }, uRect: { value: new THREE.Vector4(...rect) }, uAlphaTest: { value: alphaTest } } });
    disposables.push(m); return m;
  };
  const stoneGeo = geo(man.meshes.stone), resinGeo = geo(man.meshes.resin);
  const stone = placed(new THREE.Mesh(stoneGeo, projMat(stoneTex, TX.stone.rect, { alphaTest: 0.5, side: THREE.DoubleSide })), man.meshes.stone); stone.renderOrder = 1;
  const resin = placed(new THREE.Mesh(resinGeo, projMat(resinTex, TX.resin.rect, { side: THREE.FrontSide })), man.meshes.resin); resin.renderOrder = 2;

  const emberMat = new THREE.ShaderMaterial({ vertexShader: EMBER_VS, fragmentShader: EMBER_FS, toneMapped: false,
    uniforms: { uEdge: { value: T.edge.map((c) => new THREE.Vector3(...c)) }, uCore: { value: T.core.map((c) => new THREE.Vector3(...c)) }, uCoreExp: { value: T.coreExp } } }); disposables.push(emberMat);
  const em = man.meshes.ember;
  const emberGeo = em ? geo(em, (g) => { g.setAttribute('aK', new THREE.BufferAttribute(view(em.cls), 1, true)); g.computeVertexNormals(); }) : null;
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
  const layer = (tex, key, gain) => { const q = quad(LAYER_FS, { tLayer: { value: tex }, uRect: { value: new THREE.Vector4(...TX[key].rect) }, uGain: { value: gain }, uWin }, { transparent: true, blending: THREE.AdditiveBlending }); q.renderOrder = 3; scene.add(q); return q; };
  const glowLayer = glowTex ? layer(glowTex, 'glow', T.glow) : null;
  const lightLayer = lightTex ? layer(lightTex, 'emberlight', T.emberlight) : null;
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

  return {
    camera,
    stats: { stoneTris: man.meshes.stone.tris, resinTris: man.meshes.resin.tris, emberTris: em ? em.tris : 0 },
    /** 2C controls (not animated yet): the baked Ember light and the centre glow scale with the Ember's state. */
    setLight({ emberlight, glow } = {}) {
      if (lightLayer && emberlight != null) lightLayer.material.uniforms.uGain.value = emberlight;
      if (glowLayer && glow != null) glowLayer.material.uniforms.uGain.value = glow;
    },
    render(renderer) {
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
