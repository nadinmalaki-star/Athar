// ATHAR Flagship Scene — "The Threshold"
// A continuous architectural gallery of suspended panels in near-black space,
// ember rim-lighting, that the visitor moves through as they scroll. Five
// stations along a gently curved camera path: the ATHAR entrance, then one
// per industry (FORMA / VERA / ASCEND / MERIDIAN), each re-lit and
// re-materialed to that sector's palette, with that sector's own hero
// photograph as the station's feature panel.
//
// Procedural geometry only — no external 3D model files, so there is no
// third-party asset licensing question. THREE is loaded via the project's
// existing self-hosted import map (vendor/three), matching studioathar.studio's
// own convention. Requires a WebGL-capable browser; callers must check
// isWebGLAvailable() and prefers-reduced-motion before calling init().
//
// Camera movement is driven by GSAP ScrollTrigger (vendor/gsap), scrubbed
// to the scroll position of `scrollSection` so the move is continuous and
// reversible in both scroll directions — not a plain scroll/IntersectionObserver
// listener. GSAP's cdnjs build is UMD (no static ES `export`), so it is loaded
// as classic <script> tags rather than through the import map; this module
// reads it off `window.gsap` / `window.ScrollTrigger`, which must already be
// present by the time initFlagshipScene() runs.

import * as THREE from 'three';

export const ZONES = ['entrance', 'forma', 'vera', 'ascend', 'meridian'];

const PALETTE = {
  entrance: { base: 0x0b0b0c, accent: 0xff5a36, accentHot: 0xffb199, floor: 0x050505 },
  forma:    { base: 0x2a2018, accent: 0xaa9c82, accentHot: 0xe7d9b8, floor: 0x120f0a },
  vera:     { base: 0x1c2219, accent: 0x9fae93, accentHot: 0xd7e3c9, floor: 0x0d110c },
  ascend:   { base: 0x101014, accent: 0xd6ff3f, accentHot: 0xeeffb0, floor: 0x08080a },
  meridian: { base: 0x0c1322, accent: 0xb68a52, accentHot: 0xe8cfa0, floor: 0x070a12 },
};

const STATION_SPACING = 34;

export function isWebGLAvailable() {
  try {
    const canvas = document.createElement('canvas');
    return !!(window.WebGLRenderingContext &&
      (canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
  } catch (e) {
    return false;
  }
}

/**
 * @param {Object} opts
 * @param {HTMLElement} opts.container - element to mount the canvas into
 * @param {HTMLElement} opts.scrollSection - the tall section whose scroll range drives the camera
 * @param {(zoneIndex:number, zoneName:string)=>void} [opts.onZoneChange]
 * @param {(progress:number)=>void} [opts.onProgress] - 0..1 across the whole scroll range
 * @param {Record<string,string>} opts.textures - { forma, vera, ascend, meridian } -> image URL
 * @param {boolean} [opts.allowParallax=true] - pointer-driven look offset
 * @param {boolean} [opts.debug=false] - expose camera/scene/renderer on window.__flagshipDebug for test harnesses only
 * @returns {{ destroy: () => void, setZoneByIndex: (i:number)=>void }}
 */
export function initFlagshipScene(opts) {
  const { container, scrollSection, onZoneChange, onProgress, textures, allowParallax = true, debug = false } = opts;

  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  if (!gsap || !ScrollTrigger) {
    throw new Error('initFlagshipScene requires GSAP + ScrollTrigger on window (load vendor/gsap/3.12.5/gsap.min.js and ScrollTrigger.min.js as classic <script> tags first).');
  }
  gsap.registerPlugin(ScrollTrigger);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.65;
  renderer.setClearColor(0x050505, 1);
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x050505, 0.016);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
  camera.position.set(0, 1.4, 10);

  // ---------- lighting ----------
  // Exposure is pushed up from a physically "accurate" dim gallery toward a
  // directed, premium-feeling one: ACES tone mapping still keeps emissive
  // edge-lights from blowing out, but the feature panels read clearly rather
  // than needing to be squinted at.
  const ambient = new THREE.AmbientLight(0x2a2a2e, 0.85);
  scene.add(ambient);

  const key = new THREE.PointLight(0xff8a5c, 0, 60, 2); // intensity animated per-zone
  key.position.set(2.2, 3, 2);
  scene.add(key);

  const rim = new THREE.PointLight(0xffffff, 0, 60, 2);
  rim.position.set(-3, 1.5, -4);
  scene.add(rim);

  const fill = new THREE.DirectionalLight(0x3a3a40, 0.25);
  fill.position.set(-4, 6, 6);
  scene.add(fill);

  // ---------- floor ----------
  const floorGeo = new THREE.PlaneGeometry(60, 260, 1, 1);
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.28, metalness: 0.65 });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, -2.6, -STATION_SPACING * 2);
  scene.add(floor);

  // ---------- texture loader ----------
  const loader = new THREE.TextureLoader();
  const loadedTextures = {};
  function getTexture(key) {
    if (!textures[key]) return null;
    if (!loadedTextures[key]) {
      const tex = loader.load(textures[key]);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      loadedTextures[key] = tex;
    }
    return loadedTextures[key];
  }

  // ---------- panel builder ----------
  // Each station is a cluster of 4 suspended panels (one large feature panel
  // facing the camera path + 3 smaller flanking/ceiling panels) plus two thin
  // emissive edge-light strips. All procedural BoxGeometry/PlaneGeometry.
  const stationGroups = [];
  const stationLights = []; // { key, rim } point lights, intensity tweened by zone

  function buildStation(index, zoneName) {
    const group = new THREE.Group();
    const z = -index * STATION_SPACING;
    group.position.set(0, 0, z);

    const pal = PALETTE[zoneName];
    const baseMat = new THREE.MeshPhysicalMaterial({
      color: pal.base, roughness: 0.55, metalness: 0.1, clearcoat: 0.15, clearcoatRoughness: 0.6,
    });

    // large feature panel (textured for the 4 industry zones; plain for entrance)
    const featureW = 7.2, featureH = 4.1;
    const featureGeo = new THREE.PlaneGeometry(featureW, featureH, 1, 1);
    let featureMat;
    const tex = zoneName === 'entrance' ? null : getTexture(zoneName);
    if (tex) {
      featureMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7, metalness: 0.0 });
    } else {
      featureMat = new THREE.MeshPhysicalMaterial({ color: pal.base, roughness: 0.4, metalness: 0.2, clearcoat: 0.3 });
    }
    const feature = new THREE.Mesh(featureGeo, featureMat);
    feature.position.set(1.1, 0.6, -6);
    feature.rotation.y = -0.18;
    group.add(feature);

    // edge-light frame around the feature panel (thin emissive boxes)
    const edgeMat = new THREE.MeshBasicMaterial({ color: pal.accent, toneMapped: false });
    const edgeThickness = 0.045;
    const topEdge = new THREE.Mesh(new THREE.BoxGeometry(featureW + 0.12, edgeThickness, edgeThickness), edgeMat);
    const botEdge = topEdge.clone();
    topEdge.position.copy(feature.position).add(new THREE.Vector3(0, featureH / 2 + 0.06, 0.02));
    botEdge.position.copy(feature.position).add(new THREE.Vector3(0, -featureH / 2 - 0.06, 0.02));
    topEdge.rotation.y = botEdge.rotation.y = feature.rotation.y;
    group.add(topEdge, botEdge);

    // flanking smaller panels (depth layering)
    const sideGeoA = new THREE.BoxGeometry(2.4, 5.2, 0.12);
    const sideA = new THREE.Mesh(sideGeoA, baseMat.clone());
    sideA.position.set(-4.6, 0.2, -3);
    sideA.rotation.y = 0.35;
    group.add(sideA);

    const sideGeoB = new THREE.BoxGeometry(1.8, 3.6, 0.12);
    const sideB = new THREE.Mesh(sideGeoB, baseMat.clone());
    sideB.position.set(5.6, -0.4, -9.5);
    sideB.rotation.y = -0.5;
    group.add(sideB);

    // ceiling-hung strip (suggests a gallery canopy)
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(10, 0.1, 2.2), baseMat.clone());
    canopy.position.set(0.5, 3.4, -5);
    group.add(canopy);
    const canopyEdge = new THREE.Mesh(new THREE.BoxGeometry(10, 0.04, 0.04), edgeMat);
    canopyEdge.position.set(0.5, 3.34, -4);
    group.add(canopyEdge);

    scene.add(group);
    stationGroups.push({ group, index, zoneName });

    const stationKeyLight = new THREE.PointLight(pal.accentHot, 0, 16, 2);
    stationKeyLight.position.set(feature.position.x, feature.position.y + 0.5, feature.position.z + 2.5);
    scene.add(stationKeyLight);
    const stationRimLight = new THREE.PointLight(pal.accent, 0, 14, 2);
    stationRimLight.position.set(-3, 2, z - 6);
    scene.add(stationRimLight);
    stationLights.push({ zoneName, key: stationKeyLight, rim: stationRimLight });
  }

  ZONES.forEach((z, i) => buildStation(i, z));

  // ---------- camera path ----------
  // A gentle S-curve through the five stations rather than a straight dolly —
  // reads as a directed, composed move instead of a mechanical pan.
  const waypoints = ZONES.map((_, i) => {
    const z = -i * STATION_SPACING + 8;
    const xOffset = i % 2 === 0 ? 0.6 : -0.6;
    const yOffset = 1.4 + (i === 0 ? 0.25 : 0);
    return new THREE.Vector3(xOffset, yOffset, z);
  });
  const lookTargets = ZONES.map((_, i) => new THREE.Vector3(1.1, 0.6, -i * STATION_SPACING - 6));
  const path = new THREE.CatmullRomCurve3(waypoints, false, 'catmullrom', 0.3);

  let targetProgress = 0;
  let renderedProgress = 0;
  let currentZoneIndex = 0;

  function setZoneLightIntensity(progress) {
    // Smoothly cross-fade each station's lights in/out based on proximity.
    const exact = progress * (ZONES.length - 1);
    stationLights.forEach((s, i) => {
      const dist = Math.abs(exact - i);
      const t = Math.max(0, 1 - dist / 1.6);
      const eased = t * t * (3 - 2 * t);
      s.key.intensity = eased * 15;
      s.rim.intensity = eased * 8;
    });
    key.intensity = 0; // global key unused once stations are lit; kept for fallback/debug
    rim.intensity = 0;
  }

  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  function onPointerMove(e) {
    if (!allowParallax) return;
    const w = window.innerWidth, h = window.innerHeight;
    pointer.tx = ((e.clientX / w) - 0.5) * 2;
    pointer.ty = ((e.clientY / h) - 0.5) * 2;
  }
  if (allowParallax) window.addEventListener('pointermove', onPointerMove, { passive: true });

  function resize() {
    const w = container.clientWidth, h = container.clientHeight || window.innerHeight;
    camera.aspect = w / Math.max(h, 1);
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    ScrollTrigger.refresh();
  }
  resize();
  window.addEventListener('resize', resize);

  // ---------- scroll -> progress, via GSAP ScrollTrigger ----------
  // scrollSection is a tall (e.g. 500vh) wrapper with a position:sticky,
  // full-viewport canvas layer inside it; ScrollTrigger scrubs 0..1 across
  // that wrapper's own height rather than pinning anything itself, so the
  // move is natively reversible on scroll-up and plays nicely with native
  // scroll, keyboard paging, and screen-reader scroll commands.
  const scrollTrigger = ScrollTrigger.create({
    trigger: scrollSection,
    start: 'top top',
    end: 'bottom bottom',
    scrub: 1,
    invalidateOnRefresh: true,
    onUpdate(self) {
      targetProgress = self.progress;
    },
  });
  targetProgress = scrollTrigger.progress;

  // ---------- render loop, visibility-gated ----------
  let running = false;
  let rafId = null;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { running = e.isIntersecting; });
    if (running && rafId === null) loop();
  }, { threshold: 0.01 });
  io.observe(container);

  const clock = new THREE.Clock();

  function loop() {
    if (!running) { rafId = null; return; }
    rafId = requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 0.05);

    renderedProgress += (targetProgress - renderedProgress) * Math.min(1, dt * 3.2);
    pointer.x += (pointer.tx - pointer.x) * Math.min(1, dt * 2.5);
    pointer.y += (pointer.ty - pointer.y) * Math.min(1, dt * 2.5);

    const p = Math.min(Math.max(renderedProgress, 0), 1);
    const pos = path.getPointAt(p);
    camera.position.copy(pos);

    const exact = p * (ZONES.length - 1);
    const lo = Math.max(0, Math.min(ZONES.length - 2, Math.floor(exact)));
    const lt = exact - lo;
    const look = lookTargets[lo].clone().lerp(lookTargets[lo + 1] || lookTargets[lo], lt);
    const lookWithParallax = look.clone().add(new THREE.Vector3(pointer.x * 0.6, -pointer.y * 0.35, 0));
    camera.lookAt(lookWithParallax);
    camera.rotation.z = pointer.x * 0.012;

    setZoneLightIntensity(p);

    const zoneIndex = Math.round(exact);
    if (zoneIndex !== currentZoneIndex) {
      currentZoneIndex = zoneIndex;
      if (onZoneChange) onZoneChange(zoneIndex, ZONES[zoneIndex]);
    }
    if (onProgress) onProgress(p);

    renderer.render(scene, camera);

    if (debug) {
      window.__flagshipDebug = {
        progress: p,
        cameraPosition: camera.position.toArray(),
        cameraRotation: [camera.rotation.x, camera.rotation.y, camera.rotation.z],
        zoneIndex: currentZoneIndex,
      };
    }
  }
  loop();

  function setZoneByIndex(i) {
    targetProgress = i / (ZONES.length - 1);
  }

  function destroy() {
    io.disconnect();
    if (rafId) cancelAnimationFrame(rafId);
    scrollTrigger.kill();
    window.removeEventListener('resize', resize);
    if (allowParallax) window.removeEventListener('pointermove', onPointerMove);
    scene.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); });
      }
    });
    renderer.dispose();
    if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
  }

  return { destroy, setZoneByIndex };
}
