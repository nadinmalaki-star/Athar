/*
 * Scene: understanding  —  Phase 4 lifecycle stub (no artwork yet).
 * Contract shared by every cinematic scene:
 *   init() activate() setProgress(p) setPointer(x, y) resize(w, h, dpr, ctx)
 *   render(renderer) wantsFrame() deactivate() dispose()
 * GPU objects are registered with ctx.track(); listeners with ctx.listen();
 * the core releases both on dispose. three.js arrives through ctx.THREE only,
 * so importing this module never downloads three.js by itself.
 */
import { diagnosticScene } from './_diagnostic.js';

export const meta = {
  name: 'understanding',
  // ceilings, not targets
  budget: { drawCalls: 70, triangles: { desktop: 150000, mobile: 40000 } },
  // set true only when the scene's approved artwork may stand in for the SVG
  replacesFallback: false,
};

export function create(ctx) {
  let d = null, active = false;
  return {
    init() {
      // Phase 4: only the local-debug diagnostic primitive exists.
      if (ctx.debug) d = diagnosticScene(ctx, 'understanding', { anchors: { desktop: [2.4, -0.4, 1], tablet: [1.2, -0.8, 0.8], mobile: [0, -1.6, 0.6] } });
    },
    activate() { active = true; },
    deactivate() { active = false; },
    setProgress(p) { if (d) d.setProgress(p); },
    setPointer(x, y) { if (d) d.setPointer(x, y); },
    resize(w, h, dpr, c) {
      if (!d) return;
      d.camera.aspect = w / h; d.camera.updateProjectionMatrix();
      d.place(c.mode);
    },
    render(renderer) {
      if (!d) { renderer.clear(); return; }
      d.update();
      renderer.render(d.scene, d.camera);
    },
    wantsFrame() { return false; },   // no transitions in Phase 4
    dispose() { d = null; },          // tracked GPU objects are released by the core
  };
}
