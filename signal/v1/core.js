/*
 * THE SIGNAL — WebGL foundation (Phase 4)
 *
 * One renderer, one canvas, one active cinematic scene, one frame scheduler.
 * The approved Phase 3 SVG Signal is always the source of truth: WebGL may
 * only progressively enhance a section, and every failure path (no WebGL,
 * software renderer, lost context, downgrade to Tier S) simply leaves the SVG
 * state in place. No animation loop: frames are requested only for scroll or
 * pointer changes, transitions, resizes, or an explicit scene request.
 *
 * Loaded lazily by the inline bootstrap in index.html after the page is idle,
 * never for Tier S (except in local debug mode, for the diagnostic overlay).
 * three.js is imported only when a scene is actually allowed to render.
 */

const SCENES = [
  // `productionReady` stays false until the scene's approved artwork exists;
  // until then scenes run only in local debug mode (diagnostic primitive).
  { name: 'hero',           selector: '.hero',          module: './scenes/hero.js',           tiers: 'ABC', productionReady: false },
  { name: 'understanding',  selector: '.u-optics-wrap', module: './scenes/understanding.js',  tiers: 'ABC', productionReady: false },
  { name: 'process-states', selector: '.t-system',      module: './scenes/process-states.js', tiers: 'AB',  productionReady: false }, // Tier C keeps the SVG
  { name: 'threshold',      selector: '#contact',       module: './scenes/threshold.js',      tiers: 'ABC', productionReady: false },
];

const TIER = {
  A: { dprCap: 1.5,  antialias: true,  refraction: true,  frameBudgetMs: 20 },
  B: { dprCap: 1.25, antialias: true,  refraction: false, frameBudgetMs: 24 },
  C: { dprCap: 1.0,  antialias: false, refraction: false, frameBudgetMs: 33 },
};
const ORDER = ['A', 'B', 'C', 'S'];
const CAP_KEY = 'athar_signal_tier_cap';
const MEASURED_KEY = 'athar_signal_measured';   // one measurement per browser session

/* ------------------------------------------------------------------ */
/* Tier classification: conservative, several signals, never just one */
/* ------------------------------------------------------------------ */
export function compositionMode(width, coarse) {
  if (width <= 600 || (coarse && width <= 900)) return 'mobile';
  if (width <= 1100) return 'tablet';
  return 'desktop';
}

/** Pure classification from collected signals (unit-testable). */
export function classify(s) {
  if (s.staticReasons && s.staticReasons.length) return { tier: 'S', why: s.staticReasons.slice() };
  if (!s.webgl) return { tier: 'S', why: ['no-webgl-context'] };
  if (s.majorPerformanceCaveat) return { tier: 'S', why: ['major-performance-caveat'] };
  if (/swiftshader|llvmpipe|softpipe|software|basic render|microsoft basic/i.test(s.gpu || '')) return { tier: 'S', why: ['software-renderer'] };
  const why = [];
  if (s.mode === 'mobile' || s.coarse) why.push('mobile/coarse');
  if (s.cores && s.cores <= 4) why.push('cores<=4');
  if (s.memory && s.memory <= 4) why.push('memory<=4GB');
  if (s.maxTexture && s.maxTexture < 4096) why.push('maxTexture<4096');
  if (why.length) return { tier: 'C', why };
  const strongGPU = /nvidia|geforce|rtx|quadro|radeon (rx|pro)|apple m\d/i.test(s.gpu || '');
  if (s.mode === 'desktop' && s.fine && (s.cores || 0) >= 8 && (!s.memory || s.memory >= 8) && strongGPU) {
    return { tier: 'A', why: ['desktop', 'fine-pointer', 'cores>=8', 'strong-gpu'] };
  }
  return { tier: 'B', why: ['default desktop/tablet'] };
}

function probeWebGL() {
  const out = { webgl: false, majorPerformanceCaveat: false, gpu: '', maxTexture: 0 };
  try {
    const c = document.createElement('canvas');
    let gl = c.getContext('webgl2', { failIfMajorPerformanceCaveat: true });
    if (!gl) {
      const any = c.getContext('webgl2') || c.getContext('webgl');
      if (any) { out.webgl = true; out.majorPerformanceCaveat = true; gl = any; }
    } else {
      out.webgl = true;
    }
    if (gl) {
      const info = gl.getExtension('WEBGL_debug_renderer_info');
      out.gpu = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : String(gl.getParameter(gl.RENDERER));
      out.maxTexture = gl.getParameter(gl.MAX_TEXTURE_SIZE);
      const lose = gl.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();   // free the probe context right away
    }
  } catch (e) { /* treated as no WebGL */ }
  return out;
}

/* ------------------------------------------------------------------ */
/* Runtime                                                             */
/* ------------------------------------------------------------------ */
export function start(boot) {
  const params = new URLSearchParams(location.search);
  const debug = !!boot.debug;
  const devTier = debug ? params.get('signal-tier') : null;          // local-only overrides
  const devSlow = debug && params.get('signal-perf') === 'slow';
  const rtl = document.documentElement.dir === 'rtl';
  const coarse = matchMedia('(pointer: coarse)').matches;
  const fine = matchMedia('(pointer: fine)').matches;

  const state = {
    tier: 'S', why: [], mode: compositionMode(innerWidth, coarse), dpr: devicePixelRatio || 1,
    three: 'not loaded', renderer: 'none', active: null, loaded: new Set(),
    frames: 0, pendingFrame: false, lastReasons: [], measured: null, losses: 0, gpu: '',
  };

  // ---------- tier ----------
  const probe = boot.staticReasons.length ? { webgl: false } : probeWebGL();
  state.gpu = probe.gpu || '';
  let decided = classify({
    staticReasons: boot.staticReasons, webgl: probe.webgl, majorPerformanceCaveat: probe.majorPerformanceCaveat,
    gpu: probe.gpu, maxTexture: probe.maxTexture, mode: state.mode, coarse, fine,
    cores: navigator.hardwareConcurrency, memory: navigator.deviceMemory,
  });
  if (devTier && /^[ABCS]$/.test(devTier)) decided = { tier: devTier, why: ['dev override'] };
  // one-way session cap: never upgrade within a session
  let cap = null;
  try { cap = sessionStorage.getItem(CAP_KEY); } catch (e) {}
  if (cap && ORDER.indexOf(cap) > ORDER.indexOf(decided.tier)) decided = { tier: cap, why: decided.why.concat('session cap ' + cap) };
  state.tier = decided.tier; state.why = decided.why;
  document.documentElement.setAttribute('data-signal-tier', state.tier);

  const diag = debug ? createDiagnostics(state) : { update() {} };
  if (debug) window.__signal = { state, classify, compositionMode };

  if (state.tier === 'S') { diag.update(); return; }   // three.js is never requested for Tier S

  // ---------- renderer host ----------
  let THREE = null, renderer = null, canvas = null, loseExt = null;
  const scenes = new Map();          // name -> { def, api, el, ctx, disposables, listeners, measured }
  let hostPromise = null;

  function dprFor(tier) {
    const t = TIER[tier];
    let capV = t.dprCap;
    if (tier === 'C' && state.mode === 'mobile' && (navigator.hardwareConcurrency || 0) >= 6) capV = 1.25;
    return Math.min(devicePixelRatio || 1, capV);
  }

  function ensureHost() {
    if (hostPromise) return hostPromise;
    hostPromise = import('three').then((mod) => {
      THREE = mod; state.three = 'loaded r' + mod.REVISION;
      canvas = document.createElement('canvas');
      canvas.className = 'signal-canvas';
      canvas.setAttribute('aria-hidden', 'true');
      canvas.setAttribute('tabindex', '-1');
      // Mounted inside the active scene's section (see mountCanvas): it scrolls
      // natively with the page and sits between the section's own art and its
      // text, so it can never cover copy. Hidden until a scene has rendered.
      canvas.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;visibility:hidden;opacity:0;transition:opacity .6s ease;';
      renderer = new THREE.WebGLRenderer({
        canvas, alpha: true, antialias: TIER[state.tier].antialias,
        powerPreference: state.tier === 'A' ? 'high-performance' : 'default',
        failIfMajorPerformanceCaveat: !devTier,
      });
      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(dprFor(state.tier));
      renderer.setSize(1, 1, false);
      loseExt = renderer.getContext().getExtension('WEBGL_lose_context');   // unavailable once lost: keep it now
      canvas.addEventListener('webglcontextlost', onContextLost, false);
      canvas.addEventListener('webglcontextrestored', onContextRestored, false);
      state.renderer = 'ready';
      if (debug) window.__signal.renderer = renderer;
      diag.update();
    }).catch((err) => {
      goStatic('renderer-init-failed: ' + (err && err.message || err));
      throw err;
    });
    return hostPromise;
  }

  // ---------- scheduler: the only requestAnimationFrame user ----------
  let rafId = 0, stopped = false;
  const reasons = new Set();
  function requestFrame(reason) {
    if (stopped || !renderer || !state.active) return;
    reasons.add(reason);
    if (!rafId) { rafId = requestAnimationFrame(tick); state.pendingFrame = true; }
  }
  let lastT = 0, measuring = null;
  function tick(t) {
    rafId = 0; state.pendingFrame = false;
    const rec = scenes.get(state.active);
    if (!rec || !rec.api || stopped) return;
    state.lastReasons = Array.from(reasons); reasons.clear();
    state.frames++;
    rec.api.render(renderer);
    if (!rec.shown) { rec.shown = true; canvas.style.opacity = '1'; setFallback(rec, true); }
    if (debug) checkBudget(rec);
    if (measuring) measureFrame(t);
    lastT = t;
    if (measuring || (rec.api.wantsFrame && rec.api.wantsFrame())) requestFrame(measuring ? 'measure' : 'transition');
    diag.update();
  }
  function stopScheduler() { stopped = true; if (rafId) cancelAnimationFrame(rafId); rafId = 0; state.pendingFrame = false; diag.update(); }
  function resumeScheduler() { if (state.tier === 'S' || state.renderer !== 'ready') return; stopped = false; requestFrame('resume'); }
  document.addEventListener('visibilitychange', () => { document.hidden ? stopScheduler() : resumeScheduler(); });

  // ---------- one short runtime measurement, one-way downgrade ----------
  function startMeasurement() {
    if (state.measured || measuring) return;
    let done = null;
    try { done = sessionStorage.getItem(MEASURED_KEY); } catch (e) {}
    if (done) { state.measured = { skipped: true, earlier: done }; diag.update(); return; }
    measuring = { deltas: [], prev: 0, frames: 0 };
    requestFrame('measure');
  }
  function measureFrame(t) {
    const m = measuring;
    if (m.prev) m.deltas.push((t - m.prev) + (devSlow ? 40 : 0));
    m.prev = t; m.frames++;
    if (m.frames < 40) return;
    measuring = null;
    const d = m.deltas.slice(4).sort((a, b) => a - b);
    const median = d[Math.floor(d.length / 2)] || 0;
    const budget = TIER[state.tier].frameBudgetMs;
    let steps = median > budget ? 1 : 0;
    if (median > budget * 2) steps = 2;
    state.measured = { medianMs: Math.round(median * 10) / 10, budgetMs: budget, steps };
    try { sessionStorage.setItem(MEASURED_KEY, state.measured.medianMs + 'ms@' + state.tier); } catch (e) {}
    if (steps) downgrade(steps, 'measured ' + state.measured.medianMs + 'ms > ' + budget + 'ms');
    diag.update();
  }
  function downgrade(steps, why) {
    const next = ORDER[Math.min(ORDER.length - 1, ORDER.indexOf(state.tier) + steps)];
    try { sessionStorage.setItem(CAP_KEY, next); } catch (e) {}
    state.why = state.why.concat('downgraded ' + state.tier + '→' + next + ' (' + why + ')');
    if (next === 'S') { goStatic('downgraded to S'); return; }
    state.tier = next;
    document.documentElement.setAttribute('data-signal-tier', next);
    // scenes no longer allowed at this tier are released
    for (const [name, rec] of scenes) if (rec.def.tiers.indexOf(next) < 0) disposeScene(name);
    sizeToMount();
    requestFrame('tier-change');
  }

  // ---------- context loss: fall back to the SVG immediately ----------
  function onContextLost(e) {
    e.preventDefault();               // allows a single, safe restore attempt
    state.losses++;
    state.renderer = 'lost';
    stopScheduler();
    canvas.style.visibility = 'hidden';
    for (const rec of scenes.values()) { setFallback(rec, false); rec.api = null; rec.lostGPU = true; rec.shown = false; }
    diag.update();
    if (state.losses > 1) { goStatic('context lost twice'); return; }
    setTimeout(() => { if (state.renderer === 'lost') goStatic('context not restored'); }, 3000);
  }
  function onContextRestored() {
    if (state.losses > 1 || state.tier === 'S') return;
    state.renderer = 'ready'; stopped = false;
    // rebuild scene state from scratch on the restored context
    for (const [name, rec] of scenes) { rec.disposables = []; rec.lostGPU = false; buildScene(name); }
    refreshActive();
    diag.update();
  }
  function goStatic(why) {
    stopScheduler();
    for (const name of Array.from(scenes.keys())) disposeScene(name);
    if (renderer) { try { renderer.dispose(); } catch (e) {} }
    if (canvas) canvas.remove();
    renderer = null; canvas = null;
    state.tier = 'S'; state.renderer = 'static'; state.active = null;
    state.why = state.why.concat(why);
    try { sessionStorage.setItem(CAP_KEY, 'S'); } catch (e) {}
    document.documentElement.setAttribute('data-signal-tier', 'S');
    teardownInput();
    diag.update();
  }
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => { if (e.matches) goStatic('reduced-motion enabled'); });

  // ---------- scene lifecycle ----------
  function contextFor(rec) {
    return {
      THREE, renderer, tier: state.tier, tierConfig: TIER[state.tier], mode: state.mode,
      viewport: { width: innerWidth, height: innerHeight }, mount: rec.el, dpr: renderer ? renderer.getPixelRatio() : 1, dprCap: TIER[state.tier].dprCap,
      rtl, reducedMotion: false, debug, section: rec.el,
      track(obj) { rec.disposables.push(obj); return obj; },
      listen(target, type, fn, opts) { target.addEventListener(type, fn, opts); rec.listeners.push([target, type, fn, opts]); },
      requestFrame: (why) => requestFrame(why || rec.def.name),
    };
  }
  function setFallback(rec, webglOn) {
    // Only a scene that declares it replaces the SVG may hide it (none in Phase 4).
    if (webglOn && rec.meta && rec.meta.replacesFallback) rec.el.setAttribute('data-signal-webgl', 'on');
    else rec.el.removeAttribute('data-signal-webgl');
  }
  async function loadScene(name) {
    const rec = scenes.get(name);
    if (!rec || rec.loading || rec.api) return;
    rec.loading = true;
    try {
      const [mod] = await Promise.all([import(rec.def.module), ensureHost()]);
      rec.meta = mod.meta; rec.factory = mod.create;
      if (state.tier === 'S' || !renderer) return;
      buildScene(name);
      state.loaded.add(name);
      refreshActive();
    } catch (e) {
      if (state.tier !== 'S') goStatic('scene load failed: ' + name);
    } finally { rec.loading = false; diag.update(); }
  }
  function buildScene(name) {
    const rec = scenes.get(name);
    if (!rec.factory || !renderer) return;
    rec.disposables = []; rec.listeners = [];
    rec.api = rec.factory(contextFor(rec));
    rec.api.init();
    rec.api.resize(rec.el.clientWidth || innerWidth, rec.el.clientHeight || innerHeight, renderer.getPixelRatio(), contextFor(rec));
  }
  function disposeScene(name) {
    const rec = scenes.get(name);
    if (!rec || !rec.api) return;
    if (state.active === name) { rec.api.deactivate(); state.active = null; }
    rec.api.dispose();
    for (const obj of rec.disposables) {
      if (!obj) continue;
      if (obj.isObject3D) {
        obj.traverse((o) => {
          if (o.geometry) o.geometry.dispose();
          const mats = Array.isArray(o.material) ? o.material : (o.material ? [o.material] : []);
          for (const m of mats) { for (const k in m) { const v = m[k]; if (v && v.isTexture) v.dispose(); } m.dispose(); }
        });
      } else if (typeof obj.dispose === 'function') obj.dispose();
    }
    for (const [t, type, fn, opts] of rec.listeners) t.removeEventListener(type, fn, opts);
    rec.disposables = []; rec.listeners = []; rec.api = null;
    setFallback(rec, false);
    state.loaded.delete(name);
    diag.update();
  }

  // ---------- visibility: lazy near-viewport loading + single active scene ----------
  const ratios = new Map();
  for (const def of SCENES) {
    const el = document.querySelector(def.selector);
    if (!el) continue;
    scenes.set(def.name, { def, el, api: null, disposables: [], listeners: [] });
  }
  const allowed = (rec) => rec.def.tiers.indexOf(state.tier) >= 0 && (rec.def.productionReady || debug);

  const nearIO = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const name = e.target.getAttribute('data-signal-scene');
      const rec = scenes.get(name);
      if (!rec) continue;
      if (e.isIntersecting && allowed(rec)) loadScene(name);
      else if (!e.isIntersecting && rec.api && state.active !== name) disposeScene(name); // far away: release GPU memory
    }
  }, { rootMargin: '100% 0px 100% 0px' });
  const activeIO = new IntersectionObserver((entries) => {
    for (const e of entries) ratios.set(e.target.getAttribute('data-signal-scene'), e.isIntersecting ? e.intersectionRatio : 0);
    refreshActive();
  }, { threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] });
  for (const [name, rec] of scenes) {
    rec.el.setAttribute('data-signal-scene', name);
    nearIO.observe(rec.el); activeIO.observe(rec.el);
  }

  function refreshActive() {
    if (state.tier === 'S' || state.renderer !== 'ready') return;
    let best = null, bestR = 0;
    for (const [name, r] of ratios) { const rec = scenes.get(name); if (r > bestR && rec && rec.api) { best = name; bestR = r; } }
    if (best === state.active) return;
    const prev = scenes.get(state.active);
    if (prev && prev.api) { prev.api.deactivate(); setFallback(prev, false); }
    state.active = best;
    const next = scenes.get(best);
    if (next && next.api) {
      cacheGeometry(next);
      mountCanvas(next);
      next.api.activate();
      next.shown = false; canvas.style.opacity = '0';
      canvas.style.visibility = 'visible';
      updateProgress(true);
      requestFrame('activate');
      startMeasurement();
    } else {
      canvas.style.visibility = 'hidden';   // nothing cinematic on screen: no frames at all
    }
    diag.update();
  }

  // ---------- canvas mount: one canvas, moved into the active section ----------
  let mountEl = null;
  const mountRO = new ResizeObserver(() => sizeToMount());
  function mountCanvas(rec) {
    const el = rec.el;
    if (mountEl !== el) {
      if (mountEl) mountRO.unobserve(mountEl);
      if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
      el.appendChild(canvas);
      mountEl = el;
      mountRO.observe(el);
    }
    const z = rec.meta && rec.meta.zIndex != null ? rec.meta.zIndex : (debug ? 40 : 0);
    canvas.style.zIndex = String(z);
    sizeToMount();
  }
  function sizeToMount() {
    if (!renderer || !mountEl) return;
    const w = mountEl.clientWidth, h = mountEl.clientHeight;
    if (!w || !h) return;
    renderer.setPixelRatio(dprFor(state.tier));
    renderer.setSize(w, h, false);
    const rec = scenes.get(state.active);
    if (rec && rec.api && rec.el === mountEl) rec.api.resize(w, h, renderer.getPixelRatio(), contextFor(rec));
    requestFrame('resize');
  }

  // ---------- scroll progress: cached geometry, no layout reads on scroll ----------
  let geo = null;
  function cacheGeometry(rec) {
    const r = rec.el.getBoundingClientRect();
    geo = { name: rec.def.name, top: r.top + scrollY, height: r.height, vh: innerHeight };
  }
  let lastProgress = -1;
  function updateProgress(force) {
    const rec = scenes.get(state.active);
    if (!rec || !rec.api || !geo || geo.name !== state.active) return;
    const p = Math.min(1, Math.max(0, (scrollY + geo.vh - geo.top) / (geo.height + geo.vh)));
    if (force || Math.abs(p - lastProgress) > 0.0005) {
      lastProgress = p; state.progress = Math.round(p * 1000) / 1000;
      rec.api.setProgress(p);
      requestFrame('scroll');
    }
  }
  const onScroll = () => updateProgress(false);
  addEventListener('scroll', onScroll, { passive: true });
  const ro = new ResizeObserver(() => { const rec = scenes.get(state.active); if (rec) cacheGeometry(rec); });
  for (const rec of scenes.values()) ro.observe(rec.el);

  // ---------- pointer: fine pointers only, normalised, event-driven ----------
  let pointerHandler = null;
  if (fine) {
    let px = 0, py = 0;
    pointerHandler = (e) => {
      if (e.pointerType !== 'mouse') return;       // touch/pen never emulate mouse motion
      const x = (e.clientX / innerWidth) * 2 - 1, y = -((e.clientY / innerHeight) * 2 - 1);
      if (Math.abs(x - px) < 0.002 && Math.abs(y - py) < 0.002) return;
      px = x; py = y; state.pointer = [Math.round(x * 100) / 100, Math.round(y * 100) / 100];
      const rec = scenes.get(state.active);
      if (rec && rec.api) { rec.api.setPointer(x, y); requestFrame('pointer'); }
    };
    addEventListener('pointermove', pointerHandler, { passive: true });
  }

  // ---------- resize: new composition mode, DPR, cached geometry ----------
  let resizeT = 0;
  const onResize = () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => {
      state.mode = compositionMode(innerWidth, coarse);
      if (!renderer) return;
      const rec = scenes.get(state.active); if (rec) cacheGeometry(rec);
      sizeToMount();
      diag.update();
    }, 100);
  };
  addEventListener('resize', onResize);

  function teardownInput() {
    removeEventListener('scroll', onScroll);
    removeEventListener('resize', onResize);
    if (pointerHandler) removeEventListener('pointermove', pointerHandler);
    nearIO.disconnect(); activeIO.disconnect(); ro.disconnect(); mountRO.disconnect();
  }

  function checkBudget(rec) {
    const info = renderer.info.render, b = rec.meta && rec.meta.budget;
    state.usedDpr = Math.round(renderer.getPixelRatio() * 100) / 100;
    state.renderInfo = { calls: info.calls, triangles: info.triangles, geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures, programs: (renderer.info.programs || []).length };
    if (b) {
      const triCap = state.mode === 'mobile' ? b.triangles.mobile : b.triangles.desktop;
      state.overBudget = info.calls > b.drawCalls || info.triangles > triCap ? rec.def.name : null;
    }
  }

  if (debug) {
    window.__signal.api = {
      loseContext: () => loseExt && loseExt.loseContext(),
      restoreContext: () => loseExt && loseExt.restoreContext(),
      memory: () => renderer ? Object.assign({}, renderer.info.memory) : null,
      scenes: () => Array.from(scenes.entries()).map(([n, r]) => ({ name: n, loaded: !!r.api })),
    };
  }
  diag.update();
}

/* ------------------------------------------------------------------ */
/* Local-development diagnostic overlay (never in production)          */
/* ------------------------------------------------------------------ */
function createDiagnostics(state) {
  const el = document.createElement('pre');
  el.setAttribute('aria-hidden', 'true');
  el.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:9999;margin:0;padding:10px 12px;max-width:340px;' +
    'font:11px/1.55 ui-monospace,Consolas,monospace;color:#F5F3ED;background:rgba(5,5,5,.88);border:1px solid rgba(255,90,54,.6);' +
    'pointer-events:none;white-space:pre-wrap;direction:ltr;text-align:left';
  document.body.appendChild(el);
  let queued = false;
  function paint() {
    queued = false;
    const m = state.renderInfo;
    el.textContent =
      'SIGNAL DEBUG (local only)\n' +
      'tier        ' + state.tier + '  [' + state.why.join(', ') + ']\n' +
      'mode        ' + state.mode + '   dpr ' + (state.dpr || 1) + ' → used ' + (state.usedDpr || '-') + '\n' +
      'gpu         ' + (state.gpu || '-').slice(0, 42) + '\n' +
      'three.js    ' + state.three + '\n' +
      'renderer    ' + state.renderer + (state.losses ? ' (context losses ' + state.losses + ')' : '') + '\n' +
      'scenes      ' + (Array.from(state.loaded).join(', ') || '-') + '\n' +
      'active      ' + (state.active || '-') + (state.progress != null && state.active ? '  progress ' + state.progress : '') + '\n' +
      'scheduler   ' + (state.pendingFrame ? 'frame pending' : 'idle') + '  frames ' + state.frames + (state.lastReasons.length ? '  last: ' + state.lastReasons.join('+') : '') + '\n' +
      'measure     ' + (state.measured && state.measured.skipped ? 'done earlier this session (' + state.measured.earlier + ')' : state.measured ? state.measured.medianMs + 'ms / budget ' + state.measured.budgetMs + 'ms' + (state.measured.steps ? '  → downgrade ' + state.measured.steps : '  → ok') : '-') + '\n' +
      (m ? 'render      ' + m.calls + ' calls, ' + m.triangles + ' tris, ' + m.geometries + ' geo, ' + m.textures + ' tex' + (state.overBudget ? '  OVER BUDGET' : '') + '\n' : '') +
      (state.pointer ? 'pointer     ' + state.pointer.join(', ') + '\n' : '');
  }
  // coalesce updates into the next task, not a frame loop
  return { update() { if (!queued) { queued = true; setTimeout(paint, 0); } } };
}
