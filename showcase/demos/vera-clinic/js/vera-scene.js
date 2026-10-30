// VERA Clinic — "The Unseen Visit" real-time 3D (Phase 2 proof).
// One lightweight GLB (CC BY 4.0, Alexander Antipov — see footer credit),
// loaded once and instanced into two independent, lazily-started canvases
// (hero ambient view + the interactive visit-stage view) rather than one
// persistent shared canvas: the model is small (~1.6MB, two meshes), so
// two paused-when-offscreen contexts are simpler and more robust than
// sticky-canvas compositing across sections, per the brief's own
// "don't assume one persistent canvas is automatically best" guidance.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.min.js';

const MODEL_URL = '/showcase/demos/vera-clinic/assets/human-teeth.glb';
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function ghostMaterial() {
  return new THREE.MeshPhysicalMaterial({
    color: 0xcfe6ff,
    transmission: 0.9,
    thickness: 0.45,
    roughness: 0.22,
    ior: 1.35,
    metalness: 0,
    clearcoat: 0.3,
    clearcoatRoughness: 0.35,
    attenuationColor: new THREE.Color(0x3f6fc2),
    attenuationDistance: 0.75,
    transparent: true,
    opacity: 0.97,
  });
}

let sharedGLTFPromise = null;
function loadModel() {
  if (!sharedGLTFPromise) {
    const loader = new GLTFLoader();
    sharedGLTFPromise = new Promise((resolve, reject) => {
      loader.load(MODEL_URL, resolve, undefined, reject);
    });
  }
  return sharedGLTFPromise;
}

function instanceModel(gltf) {
  const group = gltf.scene.clone(true);
  const mat = ghostMaterial();
  group.traverse((o) => { if (o.isMesh) { o.material = mat; } });
  return group;
}

function easeInOutCubic(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

function makeStage(canvas, { cameraStart, onFrame } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.01, 10);
  const start = cameraStart || { pos: [0, 0.05, 1.9], target: [0, 0, 0] };
  camera.position.set(...start.pos);
  const lookTarget = new THREE.Vector3(...start.target);
  camera.lookAt(lookTarget);

  const hemi = new THREE.HemisphereLight(0x6f93ff, 0x0b0e1a, 1.1);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xbfd6ff, 2.2);
  key.position.set(1.1, 1.3, 1.6);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x4f7fff, 1.6);
  rim.position.set(-1.4, 0.4, -1.0);
  scene.add(rim);

  let group = null;
  let running = false;
  let raf = null;
  let t0 = null;

  function resize() {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  function frame(ts) {
    if (!running) return;
    if (t0 === null) t0 = ts;
    const dt = (ts - t0) / 1000;
    t0 = ts;
    if (onFrame) onFrame(dt, { scene, camera, group, lookTarget, THREE, key, rim });
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  function start_() { if (!running) { running = true; t0 = null; raf = requestAnimationFrame(frame); } }
  function stop_() { running = false; if (raf) cancelAnimationFrame(raf); }

  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) start_(); else stop_(); });
  }, { threshold: 0.05 });
  io.observe(canvas);

  loadModel().then((gltf) => {
    group = instanceModel(gltf);
    scene.add(group);
    renderer.render(scene, camera);
  }).catch((err) => { console.error('VERA 3D: model failed to load', err); });

  return { renderer, scene, camera, get group() { return group; }, lookTarget, start: start_, stop: stop_ };
}

function tweenCamera(stage, toPos, toTarget, duration) {
  const from = stage.camera.position.clone();
  const fromTarget = stage.lookTarget.clone();
  const t1 = new THREE.Vector3(...toPos);
  const t2 = new THREE.Vector3(...toTarget);
  const dur = reduced ? 1 : (duration || 900);
  const startTime = performance.now();
  function step(now) {
    const p = Math.min(1, (now - startTime) / dur);
    const e = easeInOutCubic(p);
    stage.camera.position.lerpVectors(from, t1, e);
    stage.lookTarget.lerpVectors(fromTarget, t2, e);
    stage.camera.lookAt(stage.lookTarget);
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

export function init() {
  const heroCanvas = document.getElementById('heroCanvas');
  const journeyCanvas = document.getElementById('journeyCanvas');
  if (!heroCanvas || !journeyCanvas) return;

  const hero = makeStage(heroCanvas, {
    cameraStart: { pos: [0, 0.02, 1.35], target: [0, 0, 0] },
    onFrame(dt, ctx) {
      if (ctx.group) {
        if (ctx.group.position.x === 0) { ctx.group.position.x = 0.85; ctx.group.scale.setScalar(1.35); }
        if (!reduced) ctx.group.rotation.y += dt * 0.12;
      }
    },
  });
  hero.scene.background = null;

  const STAGE_CAMERAS = [
    { pos: [0, 0.05, 1.9], target: [0, 0, 0] },
    { pos: [0.08, -0.02, 0.85], target: [0.04, -0.06, 0.1] },
  ];
  const journey = makeStage(journeyCanvas, { cameraStart: STAGE_CAMERAS[0] });

  window.addEventListener('vera:stage', (e) => {
    const i = e.detail.index;
    const cfg = STAGE_CAMERAS[i] || STAGE_CAMERAS[0];
    tweenCamera(journey, cfg.pos, cfg.target, 950);
    if (journey.key) {
      const warm = i === 1;
      journey.key.color.set(warm ? 0xffe3bf : 0xbfd6ff);
      journey.key.intensity = warm ? 2.6 : 2.2;
    }
  });
}
