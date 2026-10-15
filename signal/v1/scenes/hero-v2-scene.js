/*
 * Scene adapter: the Stage 2 Hero (hero-v2.js) inside the core runtime.
 * LOCAL REVIEW ONLY for now — selected by the index.html review switch (`data-hero-v2` on <html>, dev hosts, EN, desktop):
 *   2c  — the current module (scenes/hero-v2.js, assets/hero-v2): the approved 2B.1 look at rest + the 2C scroll story
 *   v3  — the new Hero direction (scenes/hero-v3.js): native scene, no assets — static checkpoint
 *   2b1 — the frozen approved static 2B.1 state for side-by-side review (dev/hero-v2-2b1.js, assets/hero-v2-2b1); remove after approval
 * Scroll-driven only: a frame is rendered when the scroll position changes and while the story eases onto it, never otherwise
 * (no loop, no pointer input). The approved still is the section background until the first WebGL frame.
 */
export const meta = { replacesFallback: true, zIndex: 0, mount: '.hero-pin' };   // the canvas lives in the pinned box

export function create(ctx) {
  const variant = document.documentElement.getAttribute('data-hero-v2');
  const src = variant === 'v3' ? { module: '/signal/v1/scenes/hero-v3.js', factory: 'createHeroV3' }
            : variant === '2b1' ? { module: '/signal/v1/dev/hero-v2-2b1.js', base: '/signal/v1/assets/hero-v2-2b1' }
                                : { module: '/signal/v1/scenes/hero-v2.js', base: '/signal/v1/assets/hero-v2' };
  let hero = null, disposed = false, story = 0, secH = innerHeight, vh = innerHeight;
  const review = { variant, frames: 0, stats: null };        // dev review: frames actually rendered (idle verification)
  window.__heroV2 = review;
  // Hero progress p = (scrollY + vh - top) / (sectionHeight + vh). The section is taller than the viewport by the pin travel
  // (index.html review CSS: 50svh); the story runs inside that hold — from 4% to 75% of it, so it has settled before the Hero
  // is released into Understanding. Without a pin (no extra travel) it falls back to the 2C.1 mapping (27% of a viewport).
  const PIN_FROM = 0.04, PIN_TO = 0.75, NO_PIN_SPAN = 0.27;
  const toStory = (p) => {
    const sec = ctx.section.offsetHeight || secH, y = p * (sec + vh) - vh, pin = sec - vh;
    const t = pin > vh * 0.1 ? (y - pin * PIN_FROM) / (pin * (PIN_TO - PIN_FROM)) : y / (vh * NO_PIN_SPAN);
    const c = Math.min(1, Math.max(0, t)); return c * c * (3 - 2 * c);
  };
  return {
    init() {
      import(src.module)
        .then((m) => m[src.factory || 'createHeroV2'](ctx.THREE, { base: src.base, lang: 'en' }))
        .then((h) => {
          if (disposed) { h.dispose(); return; }
          hero = h; review.stats = h.stats;
          if (hero.setStory) hero.setStory(story, true);
          ctx.requestFrame('hero-v2 ready');
        })
        .catch((e) => console.error('[hero-v2]', e));
    },
    resize(w, h, dpr, c) { secH = h || secH; vh = (c && c.viewport && c.viewport.height) || innerHeight; },
    activate() {}, deactivate() {},
    setProgress(p) { story = toStory(p); if (hero && hero.setStory) hero.setStory(story); },
    setPointer() { return false; },          // no pointer parallax (decided later)
    wantsFrame() { return !!(hero && hero.settling && hero.settling()); },   // only while the story eases onto the scroll position
    render(renderer) {
      if (!hero) return;
      // the Hero output is display-referred (Cycles AgX already applied): no colour conversion or tone mapping on top
      const cs = renderer.outputColorSpace, tm = renderer.toneMapping;
      renderer.outputColorSpace = ctx.THREE.LinearSRGBColorSpace; renderer.toneMapping = ctx.THREE.NoToneMapping;
      // dev review: a recorder may drive the clock (window.__heroV2Clock) so each captured frame advances exactly 1/30 s
      hero.render(renderer, typeof window.__heroV2Clock === 'function' ? window.__heroV2Clock() : performance.now());
      renderer.outputColorSpace = cs; renderer.toneMapping = tm;
      review.frames++; review.story = hero.story ? +hero.story().toFixed(4) : null;
    },
    dispose() { disposed = true; if (hero) hero.dispose(); hero = null; },
  };
}
