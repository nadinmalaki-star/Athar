/*
 * Local-debug-only diagnostic primitive shared by the Phase 4 scene stubs.
 * A small neutral wireframe box: proves canvas placement, lifecycle,
 * activation, resize and scene switching. Never part of the visible site.
 */
export function diagnosticScene(ctx, label, opts) {
  const { THREE } = ctx;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
  camera.position.set(0, 0, 8);
  const group = ctx.track(new THREE.Group());
  const box = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(1.2, 1.2, 1.2)),
    new THREE.LineBasicMaterial({ color: 0x9a9995, transparent: true, opacity: 0.9 })
  );
  group.add(box);
  // the scene's composition anchor differs per mode (not a scaled desktop)
  const anchors = opts.anchors;
  scene.add(group);
  let progress = 0, px = 0, py = 0;
  return {
    label,
    scene, camera, group,
    place(mode) { const a = anchors[mode] || anchors.desktop; group.position.set(a[0], a[1], 0); group.scale.setScalar(a[2]); },
    update() {
      group.rotation.y = progress * Math.PI * 2 + px * 0.35;
      group.rotation.x = 0.35 + py * 0.25;
    },
    setProgress(p) { progress = p; },
    setPointer(x, y) { px = x; py = y; },
  };
}
