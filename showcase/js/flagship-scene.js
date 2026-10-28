// ATHAR Flagship Scene — "Four Rooms"
// Five real architectural fragments the camera flies through on scroll: the
// ATHAR entrance, then one distinctly-built room per industry (FORMA / VERA /
// ASCEND / MERIDIAN) — each its own floor, wall, light fixture, foreground
// architectural element and shape language, not a shared template re-colored.
// Dark connective void between rooms (a deliberate transition device, used
// the same way by the luxury references this was built against), but each
// room itself is bright, detailed and lit with visible, motivated light
// sources — not a diorama of thin glowing outlines in empty black.
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

// Each room's own identity: wall/floor tone, light fixture color, accent
// (edge/neon trim), and a floor-brightness figure used to keep every room
// readable (VERA is deliberately the brightest — "light, precision, warmth"
// — not dark-moody like the others).
const ROOM = {
  entrance: { wall: 0x1a1613, floor: 0x241d17, fixture: 0xffcDA0, accent: 0xff5a36, fov: 40 },
  forma:    { wall: 0x3a2c1c, floor: 0x4a3722, fixture: 0xffcf9e, accent: 0xc9a876, fov: 38 },
  vera:     { wall: 0xe9ecdf, floor: 0xd7ddc9, fixture: 0xfdfbf3, accent: 0x8fae87, fov: 42 },
  ascend:   { wall: 0x1e2028, floor: 0x262a33, fixture: 0xd6ff3f, accent: 0xd6ff3f, fov: 44 },
  meridian: { wall: 0x111b2c, floor: 0x16233a, fixture: 0xe8cfa0, accent: 0xc89a5e, fov: 38 },
};

const STATION_SPACING = 30;
const FEATURE_W = 10.5, FEATURE_H = 6.4;

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
  renderer.toneMappingExposure = 1.3;
  renderer.setClearColor(0x030303, 1);
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x050505, 0.0115);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 220);
  camera.position.set(0, 1.5, 11);

  // ---------- global fill (very low — each room supplies its own real light) ----------
  // Three.js ships physically-correct lighting by default (point/spot light
  // intensity is in candela, inverse-square attenuated) — these numbers are
  // tuned empirically against the actual rendered output, not against the
  // old pre-r155 "intensity ~1" convention.
  const ambient = new THREE.AmbientLight(0x35353a, 1.3);
  scene.add(ambient);
  const skyFill = new THREE.HemisphereLight(0x8899aa, 0x1c1710, 1.1);
  scene.add(skyFill);

  // ---------- texture loader ----------
  const loader = new THREE.TextureLoader();
  const loadedTextures = {};
  function getTexture(key) {
    if (!textures[key]) return null;
    if (!loadedTextures[key]) {
      const tex = loader.load(textures[key]);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      loadedTextures[key] = tex;
    }
    return loadedTextures[key];
  }

  // A soft visible light-cone (classic cheap volumetric trick: an additive-
  // blended, depth-writeless cone aligned with a spotlight) — sells "directed
  // cinematic light" far more than an invisible point light ever can.
  function makeLightCone(color, length, radius) {
    // A small non-zero top radius (a frustum, not a true cone) — a real
    // apex has every triangle converging on one screen pixel, which with
    // additive blending overdraws into a blown-out hotspot from most camera
    // angles. The frustum reads identically as a light cone with none of that.
    const geo = new THREE.CylinderGeometry(radius * 0.045, radius, length, 24, 1, true);
    const mat = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide, depthWrite: false, fog: false,
    });
    const cone = new THREE.Mesh(geo, mat);
    cone.geometry.translate(0, -length / 2, 0);
    return cone;
  }

  // A glowing practical fixture (the thing that appears to be casting the
  // light) — a simple emissive bar, unlit by scene lights itself.
  function makeFixtureBar(color, w, h, d) {
    return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ color, toneMapped: false }));
  }

  const stationGroups = [];
  const stationLights = []; // per-station { key(SpotLight), fill(PointLight), cone(Mesh), fixture(Mesh) }

  function buildRoom(index, zoneName) {
    const group = new THREE.Group();
    const z = -index * STATION_SPACING;
    group.position.set(0, 0, z);
    const room = ROOM[zoneName];

    // ---------- floor: wide, brighter, low-roughness so direct light blooms across it ----------
    const floorMat = new THREE.MeshStandardMaterial({ color: room.floor, roughness: 0.22, metalness: 0.5 });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(22, STATION_SPACING + 8, 1, 1), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, -2.4, 2);
    group.add(floor);

    // ---------- back wall: paneled (a grid of seam lines), not a flat card ----------
    const wallMat = new THREE.MeshPhysicalMaterial({ color: room.wall, roughness: 0.62, metalness: 0.08, clearcoat: 0.1 });
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(20, 11, 1, 1), wallMat);
    wall.position.set(0, 2.9, -9.2);
    group.add(wall);
    const seamMat = new THREE.MeshBasicMaterial({ color: room.accent, transparent: true, opacity: 0.22, toneMapped: false });
    for (let s = -2; s <= 2; s++) {
      const seam = new THREE.Mesh(new THREE.PlaneGeometry(0.02, 11), seamMat);
      seam.position.set(s * 4, 2.9, -9.18);
      group.add(seam);
    }

    // ---------- feature photo: large, recessed into the wall with a real frame ----------
    const tex = zoneName === 'entrance' ? null : getTexture(zoneName);
    const featureMat = tex
      ? new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, metalness: 0.0 })
      : new THREE.MeshPhysicalMaterial({ color: room.wall, roughness: 0.3, metalness: 0.3, clearcoat: 0.5 });
    const feature = new THREE.Mesh(new THREE.PlaneGeometry(FEATURE_W, FEATURE_H, 1, 1), featureMat);
    feature.position.set(1.6, 2.3, -8.95);
    group.add(feature);

    // recess shadow lip (a slightly larger, darker plane just behind the photo)
    const lip = new THREE.Mesh(
      new THREE.PlaneGeometry(FEATURE_W + 0.5, FEATURE_H + 0.5),
      new THREE.MeshBasicMaterial({ color: 0x000000 })
    );
    lip.position.set(feature.position.x, feature.position.y, feature.position.z - 0.03);
    group.add(lip);

    // entrance only: the real ATHAR wordmark, presented as a backlit sign —
    // self-illuminated (unaffected by scene lighting/exposure, like a real
    // lit sign would be), at its true aspect ratio, not stretched to fill
    // the feature frame. The unaltered source PNG (opaque background, same
    // asset used in the nav) is the point: nothing here redraws the mark.
    if (zoneName === 'entrance' && textures.logo) {
      const logoTex = loader.load(textures.logo);
      logoTex.colorSpace = THREE.SRGBColorSpace;
      const logoAspect = 1463 / 370;
      const logoW = 6.6, logoH = logoW / logoAspect;
      const logoRim = new THREE.Mesh(
        new THREE.PlaneGeometry(logoW + 0.5, logoH + 0.5),
        new THREE.MeshBasicMaterial({ color: 0xfff6ec, transparent: true, opacity: 0.1, toneMapped: false })
      );
      logoRim.position.set(feature.position.x, feature.position.y, feature.position.z + 0.02);
      group.add(logoRim);
      const logoPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(logoW, logoH),
        new THREE.MeshBasicMaterial({ map: logoTex, toneMapped: false })
      );
      logoPlane.position.set(feature.position.x, feature.position.y, feature.position.z + 0.05);
      group.add(logoPlane);
    }

    // frame: a real box border around the photo, catches light on its inner edge
    const frameMat = new THREE.MeshPhysicalMaterial({ color: room.accent, roughness: 0.3, metalness: 0.75, clearcoat: 0.4 });
    const frameT = 0.16;
    [
      [FEATURE_W + frameT, frameT, 0, FEATURE_H / 2 + frameT / 2],
      [FEATURE_W + frameT, frameT, 0, -FEATURE_H / 2 - frameT / 2],
      [frameT, FEATURE_H + frameT, FEATURE_W / 2 + frameT / 2, 0],
      [frameT, FEATURE_H + frameT, -FEATURE_W / 2 - frameT / 2, 0],
    ].forEach(([w, h, dx, dy]) => {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.22), frameMat);
      bar.position.set(feature.position.x + dx, feature.position.y + dy, feature.position.z + 0.08);
      group.add(bar);
    });

    // ---------- overhead practical fixture + visible light cone washing the photo ----------
    const fixture = makeFixtureBar(room.fixture, 2.6, 0.12, 0.3);
    fixture.position.set(feature.position.x, 6.1, feature.position.z + 2.0);
    group.add(fixture);
    const cone = makeLightCone(room.fixture, 6.4, 3.4);
    cone.position.set(feature.position.x, 6.0, feature.position.z + 2.0);
    cone.rotation.x = Math.PI * 0.02;
    group.add(cone);

    // ---------- per-sector foreground element: the thing that creates real parallax ----------
    let foreground;
    if (zoneName === 'forma') {
      // a warm bronze archway the camera passes beneath
      foreground = new THREE.Group();
      const archMat = new THREE.MeshPhysicalMaterial({ color: 0x7a5a38, roughness: 0.4, metalness: 0.65 });
      const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 5.6, 16), archMat);
      legL.position.set(-3.6, 0.4, 4.2);
      const legR = legL.clone(); legR.position.x = 3.6;
      const beam = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.16, 0.16), archMat);
      beam.position.set(0, 3.1, 4.2);
      foreground.add(legL, legR, beam);
    } else if (zoneName === 'vera') {
      // slim, bright brushed-steel pendant columns either side — clean, precise
      foreground = new THREE.Group();
      const colMat = new THREE.MeshPhysicalMaterial({ color: 0xf4f2ea, roughness: 0.18, metalness: 0.85 });
      [-4.4, 4.4].forEach((x) => {
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 6, 16), colMat);
        col.position.set(x, 1, 5.2);
        foreground.add(col);
      });
    } else if (zoneName === 'ascend') {
      // an angled neon blade cutting across the foreground — bold, dynamic
      foreground = new THREE.Group();
      const bladeMat = new THREE.MeshBasicMaterial({ color: room.accent, toneMapped: false });
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.1, 7.5, 0.6), bladeMat);
      blade.position.set(-2.4, 1.2, 5.0);
      blade.rotation.z = 0.32;
      foreground.add(blade);
      // thin grid lines on the floor (tech-lab feel)
      const gridMat = new THREE.MeshBasicMaterial({ color: room.accent, transparent: true, opacity: 0.35, toneMapped: false });
      for (let g = -8; g <= 8; g += 2) {
        const line = new THREE.Mesh(new THREE.PlaneGeometry(0.025, STATION_SPACING), gridMat);
        line.rotation.x = -Math.PI / 2;
        line.position.set(g, -2.38, 2);
        foreground.add(line);
      }
    } else if (zoneName === 'meridian') {
      // tall glass-like panels suggesting a corporate tower corridor
      foreground = new THREE.Group();
      const glassMat = new THREE.MeshPhysicalMaterial({
        color: 0x1c2b42, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.35, clearcoat: 1,
      });
      [-4.8, 4.8].forEach((x) => {
        const pane = new THREE.Mesh(new THREE.BoxGeometry(0.08, 6.4, 3.2), glassMat);
        pane.position.set(x, 1, 4.4);
        foreground.add(pane);
        const trim = new THREE.Mesh(new THREE.BoxGeometry(0.12, 6.5, 0.12), new THREE.MeshPhysicalMaterial({ color: 0xc89a5e, roughness: 0.3, metalness: 0.85 }));
        trim.position.set(x, 1, 2.8);
        foreground.add(trim);
      });
    } else {
      // entrance: a threshold ring positioned right at the camera's starting
      // point, so the opening move is literally passing through it — by the
      // time the logo sign is readable it's long behind the camera, never
      // competing with it.
      foreground = new THREE.Group();
      const ringMat = new THREE.MeshStandardMaterial({ color: 0x241d17, roughness: 0.75, metalness: 0.15 });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.06, 16, 48), ringMat);
      ring.position.set(0.9, 1.8, 5.5);
      foreground.add(ring);
      const ringGlow = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.018, 12, 48), new THREE.MeshBasicMaterial({ color: room.accent, toneMapped: false }));
      ringGlow.position.copy(ring.position);
      foreground.add(ringGlow);
    }
    if (foreground) group.add(foreground);

    scene.add(group);
    stationGroups.push({ group, index, zoneName });

    // Real SpotLight (visible falloff cone on wall/floor) + a softer fill PointLight.
    const key = new THREE.SpotLight(room.fixture, 0, 18, Math.PI / 5.5, 0.55, 1.4);
    key.position.set(feature.position.x, 6.0, feature.position.z + 2.0);
    key.target.position.set(feature.position.x, feature.position.y, feature.position.z);
    group.add(key.target);
    scene.add(key);

    const fill = new THREE.PointLight(room.accent, 0, 15, 2);
    fill.position.set(-2.5, 1.4, z + 4);
    scene.add(fill);

    // VERA is deliberately the brightest room (light/precision/warmth); a
    // second soft fill keeps it from reading dark even at rest.
    const roomFill = new THREE.PointLight(room.fixture, 0, 20, 1.6);
    roomFill.position.set(0, 2, z + 5);
    scene.add(roomFill);

    const fillByZone = { entrance: 1.3, forma: 1.5, vera: 3.2, ascend: 2.9, meridian: 1.6 };
    stationLights.push({ zoneName, key, fill, roomFill, cone, baseFillIntensity: fillByZone[zoneName] || 1.3 });
  }

  ZONES.forEach((z, i) => buildRoom(i, z));

  // ---------- camera path ----------
  // A gentle S-curve through the five rooms, closer to the feature walls than
  // a straight dolly would sit — reads as a directed, composed walk-through.
  const waypoints = ZONES.map((_, i) => {
    const z = -i * STATION_SPACING + 7.5;
    const xOffset = i % 2 === 0 ? 0.9 : -0.9;
    const yOffset = 1.5 + (i === 0 ? 0.3 : 0);
    return new THREE.Vector3(xOffset, yOffset, z);
  });
  const lookTargets = ZONES.map((_, i) => new THREE.Vector3(1.6, 2.1, -i * STATION_SPACING - 8.5));
  const path = new THREE.CatmullRomCurve3(waypoints, false, 'catmullrom', 0.35);
  const fovByZone = ZONES.map((z) => ROOM[z].fov);

  let targetProgress = 0;
  let renderedProgress = 0;
  let currentZoneIndex = 0;

  function setRoomLighting(progress) {
    const exact = progress * (ZONES.length - 1);
    stationLights.forEach((s, i) => {
      const dist = Math.abs(exact - i);
      const t = Math.max(0, 1 - dist / 1.3);
      const eased = t * t * (3 - 2 * t);
      s.key.intensity = eased * 340;
      s.fill.intensity = eased * 90;
      s.roomFill.intensity = eased * s.baseFillIntensity * 70;
      s.cone.material.opacity = eased * 0.05;
    });
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

    // subtle per-room focal-length change (telephoto-ish for intimate rooms,
    // wider for the entrance) — reads as directed cinematography, not a fixed lens.
    const fov = fovByZone[lo] + (fovByZone[lo + 1] !== undefined ? (fovByZone[lo + 1] - fovByZone[lo]) * lt : 0);
    if (Math.abs(camera.fov - fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); }

    setRoomLighting(p);

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
