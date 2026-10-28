# Design Research — Live Interactive References

Scope correction mid-research: the brief was redirected away from editorial/award-directory pages toward **live interactive mechanics** — what a visitor can physically do (drag, scroll, hover) and how the screen responds. Every site below was actually navigated with Playwright (not read as a listing) at 1440px, with real mouse/scroll interaction, and visually inspected frame-by-frame before being written up. Award-listing/index pages (CSSDA, We Awards, Awwwards) were used only to *discover* live destination URLs, never analyzed as references themselves.

## Healthcare / Dental

### 1. Dentalux — https://www.dentalux.net/ (via CSSDA listing → live site)
Not a cinematic/WebGL site — a conventional Ukrainian clinic site — but two things stand out: an oversized photorealistic 3D tooth render sits *behind* huge wordmark type in the hero (object + type overlap, not stacked), and the practitioner section composites a small circular credential card over a full-bleed environmental photo rather than a portrait-in-a-box. Services use an irregular 2-large + 3-small photo-tile grid, not uniform cards.
**Adopt:** oversized hero object overlapping type; compositing a small trust/credential chip directly onto an environmental photo instead of isolating it in its own card; irregular (not uniform) tile sizing for service imagery.

### 2. WorkFin — https://three-js-dental-studio.vercel.app/ (via virtualaxis.dev portfolio)
The standout find. A real-time Three.js **isometric 3D diorama of a dental practice room** — chair, desk, wall-mounted monitor actually rendering a live "Practice 360" dashboard UI inside the 3D scene, a framed logo poster on the wall. Scrolling dollies the camera back, shrinking the room into a vivid magenta/pink void. Navigation ("SERVICES", "ABOUT", "GET IN TOUCH") is extruded 3D text sitting on the diorama's floor, not an HTML overlay — you click inside the scene itself.
**Adopt (principle, not literal 3D):** a *spatial, dimensional* opening rather than a flat hero — an illustrated isometric "room" scene with a scroll-tied pull-back/zoom effect (buildable with CSS 3D transforms + scroll-linked `transform: scale()/translateZ()`, no WebGL dependency needed), and nav labels anchored *inside* the scene rather than floating in a conventional bar. This directly answers the client's "not another beige card-heavy dental site" complaint — nothing in healthcare web design looks like this.

### 3. LK Denta — https://www.lkdenta.cz/ (via We Awards listing → live site)
A real clinic interior photo as the hero background, with small numbered floating info-tags (parking, sedation, new-patient status) pinned at fixed positions over the photo like annotations on a map, each expandable.
**Adopt:** contextual floating annotations pinned to specific points in a real space photo, instead of a flat "features grid" below the fold.

## Education

### 4. Why Zero — https://why.zero.university/ (via wehatevanilla.com case study → live site)
Site of the Day (Awwwards) + FWA of the Month. Custom Three.js/GLSL build: the entire viewport is a frosted/fractured-ice shader texture. The opening screen reads **"DRAW A ZERO"** — you literally draw a "0" with the cursor; the drag path leaves a comet-trail and "melts" the ice, revealing a green topographic terrain growing beneath. A visible counter ("63") ticks in the corner. Built over 4 months with GSAP + Howler (sound) against a strict <10MB / 60fps-on-budget-Android performance budget.
**Adopt (principle, not the shader):** an opening that demands *physical participation before revealing content* — building anticipation through a gesture, not a button click — and using the gesture's own path as the visual. A lightweight Canvas-2D equivalent (reveal-through-drag using a destination-out composite mask, no WebGL) is realistic for ASCEND without the engineering cost of a custom shader pipeline.

## Professional Services / B2B

### 5. Hear.ai — https://hear.ai/ (via Ecrin Digital's case study → live site)
Dark, grain-textured background; a large decorative SVG parabolic arc-grid motif (visually evoking a sound wave, matching "Hear"). A client-logo marquee, then a field of hundreds of small dots that forms/dissolves around a central statement ("Beyond Insight. Into Impact.") as you scroll — a cheap, high-impact scroll-tied particle/dot-grid motif.
**Adopt:** a scroll-tied dot/particle field that resolves into a statement or metric — works well for MERIDIAN's business-data register, and is CSS/Canvas-cheap (no WebGL needed) — plus film-grain texture overlay on dark sections as a low-cost way to avoid "flat dark background with text" fatigue.

---

## Translating research into art direction

### VERA Clinic — highest priority, deepest change
1. Replace the current uniform white concern-cards with an **isometric/illustrated scene opening** (reception + chair + window, CSS 3D or a layered SVG illustration) that the visitor scroll-pulls-back from, in the spirit of WorkFin — this becomes VERA's signature, unlike anything a generic dental template does.
2. Composite Dr. Haddad's credential chip directly onto an environmental photo (Dentalux technique) instead of an isolated avatar-in-a-box.
3. Convert the horizontal Arrive→Aftercare timeline's stage markers into floating annotation tags pinned to specific points in real photography (LK Denta technique), not plain captioned tiles.
4. Retire flat beige/card backgrounds in favor of asymmetric, photo-anchored composition throughout — no two sections should share the same card-grid structure.
5. Keep all existing copy, the fictional-brand disclosure, and the pre-fill-on-concern-selection logic — this is a structural/art-direction upgrade, not a rewrite of VERA's underlying concept, which the client already approved.

### ASCEND Academy
1. Give the opening program switcher a *drag/gesture-gated* reveal for the first program transition only (Why Zero principle, Canvas-2D mask, not WebGL) — after that, keep the existing instant full-viewport switch for subsequent program changes so it stays fast and usable.
2. Add a decorative scroll-tied particle/line motif (Hear.ai-style, cheap) behind the curriculum-pin section to fill what was previously empty space during the build-up, without adding more text.
3. Ensure each program's imagery/color treatment reads as a genuinely different *room* or *environment*, not a re-tinted filter over the same photo.

### MERIDIAN Partners
1. Introduce a scroll-tied dot/particle field (Hear.ai) that resolves into the "Challenge → Solution" pivot statement, breaking up the long flat-dark-background-with-text stretch the client flagged.
2. Add film-grain/noise texture to dark sections for tactile depth at near-zero cost.
3. Treat the editorial service grid's imagery with the same irregular-tile-sizing principle from Dentalux rather than a uniform 2×2.

### ATHAR Showcase shell
1. Apply the WorkFin "scene you scroll-zoom through" principle to the sector index itself — the four sectors could sit as distinct zones in one continuous spatial canvas rather than an accordion list.
2. A decorative scroll-tied motif (dot-field or line-grid, Hear.ai-style) ties the showcase's own visual language to Athar's charcoal/ember identity without copying any one demo's look.

## Honest limitations
WorkFin and Why Zero are built with Three.js/custom GLSL and a 4-month production budget — their exact techniques are out of scope to replicate literally in this pass. What's proposed above are CSS/Canvas-2D/SVG equivalents that capture the *principle* (spatial navigation, gesture-gated reveal, scroll-tied particle resolution) within the project's existing vanilla-JS, no-new-library constraint. These will read as distinctive and premium, not as "the same quality as a 4-month Awwwards Site of the Day build" — that gap is real and should be stated plainly, not implied away.

## Flagship WebGL/Camera Research

Five additional live references were visited with Playwright (1440×900 desktop + 390×844 mobile), using real `window.scrollTo()` increments and, where the page used a custom scroll container, real synthetic wheel events — specifically for the flagship ATHAR Showcase rebuild (real Three.js + GSAP ScrollTrigger, camera movement through the scene, not a CSS zoom). Two of the five could not be fully observed in this sandboxed headless environment; that is reported honestly below rather than guessed at.

### 6. Sobha — The Privy Collection — https://sobha-privy-collection.com/
A single glossy black abstract/sculptural 3D object ("THE PRIVY COLLECTION — The art OF THE SUBLIME") occupies the hero and is still the dominant visual at every one of 6 even scroll increments across the page's full 42,936px scroll height — the object continuously rotates/reorients (ribbon-like chrome form catching a rim light that sweeps across it) rather than the page cutting to new sections. This is a textbook GSAP ScrollTrigger `scrub` pattern: one long pinned timeline scrubbing a 3D object's rotation/camera angle 1:1 with scroll position, not a series of discrete reveals. Persistent fixed UI chrome survives the whole scroll: hamburger "Menu" top-left, "3D Map" link top-right, a circular scroll-cue arrow bottom-left, and — notably — a small interactive **"3D — OPEN THE MAP"** tile bottom-right showing a real satellite view of Palm Jumeirah with a location pin, sitting permanently over the 3D scene as its own clickable widget. Mobile keeps the identical composition and chrome at 390px, just re-flowed — confirming the long-pinned-scrub approach is treated as a first-class mobile pattern here, not desktop-only.
**Adopt:** one continuous scrubbed camera/object transform bound to scroll position (not step-based reveals) for the flagship's connective "journey" sections; a small persistent secondary UI tile (ATHAR equivalent: a live industry-zone indicator) layered over the canvas the whole time, matching this permanent-widget-over-3D-scene convention.

### 7. Forge Automotive — https://forgeautomotive.co.uk/
**Partially observed.** The real site is gated behind a full-screen cookie/intro splash — "BESPOKE VEHICLES BUILT ON DISTINCTION, DESIRE, AND IDENTITY. NOT SIMPLY TO BE MODIFIED." with two text links, **"ACCEPT & ENTER"** / **"REJECT & ENTER"**. In this headless Playwright session, clicking either link (via both a text-locator click and synthetic wheel events once past it) did not advance past the gate — the page stayed on the splash through every attempt, so the actual in-scene cinematic sequence could not be captured first-hand here. What can be reported with confidence, from the WhatsApp reference video already reviewed earlier in this project (independently confirmed to be this site, matching its exact copy and pacing): a dark studio-lit sequence of three bespoke vehicles shot in sequence, "For Those Who…" editorial copy intercut with the imagery, macro/detail product shots (paint, trim, badging), closing on "…Ends Here." The gate copy captured here ("not simply to be modified") is consistent with that same brand voice.
**Adopt:** the gate itself is a useful cautionary pattern — any intro/consent gate on the flagship must have a guaranteed, always-functional "skip/enter" control reachable by click, touch, AND keyboard (Enter/Space), since this is exactly the kind of gesture that silently fails for some input paths; never let an intro screen become a dead end.

### 8. Lusion — https://lusion.co/
**Not observed beyond the loader.** The real-time WebGL homepage never progressed past its own loading screen in this sandboxed headless Chromium session — a determinate progress bar (captured at 69%) sat static through the full observation window (initial load + ~20s of scroll/wheel attempts), with only a large numeral counter ("069") visible beneath it. This is most likely a software/headless GPU rendering limitation in this environment rather than a reflection of the real site's behavior, and is reported as an honest gap rather than guessed detail — no claim is made here about Lusion's actual in-scene interactions.
**Adopt (from the loader alone, with appropriate caution):** a determinate numeric progress readout (not a spinner) during WebGL/asset preload is itself a useful, on-brand loading-state pattern — but the flagship's own preloader must have a hard timeout and degrade gracefully (skip to a lower scene or static fallback) rather than risk ever leaving a visitor stuck the way this session got stuck here.

### 9. YODEZEEN — https://www.yodezeen.com/
Opens on a looping cinematic video — a slow push through dark jungle foliage toward a lit, multi-level architectural villa at dusk — with wordmark + "ARCHITECTURE AND INTERIOR DESIGN STUDIO" centered over it and an explicit **"SKIP"** control bottom-right at all times. Scrolling moves between isolated, full-black project "chapter" cards (e.g. "STILLSTONE — JUBAYLAH, RIYADH REGION, SAUDI ARABIA" with a single "VIEW PROJECT" pill button), each its own discrete full-viewport beat rather than a continuous scrub — a different pacing model from Sobha's single long scrub. The footer is a distinctive touch: a list of studio cities (London, Miami, Dubai, Warsaw, Kyiv, Milan) each paired with a live-updating local clock and, for two cities, a "Representative" tag.
**Adopt:** always-visible "SKIP" affordance on any cinematic intro (directly supports the brief's ban on gesture-gates); isolated full-black chapter cards as the pattern for each of the flagship's four industry-zone intro beats within the camera's journey; a studio-presence footer detail (could translate to ATHAR's own locations/availability) as a low-cost premium touch.

### 10. OMNIYAT — https://www.omniyat.com/
Notably, OMNIYAT achieves a comparably premium feel with **no heavy real-time WebGL at all** — a full-bleed cinematic video hero ("THE ART OF ELEVATION" over a sunlit portrait), then alternating full-viewport photography panels (an infinity-edge terrace dissolving into a glass-tower upward shot, "INSPIRING LIFE WITHIN MASTERFUL CREATIONS"), a horizontal project carousel that wipes between images using a **triangular/diamond clip-path mask mid-transition** (caught mid-wipe in one frame), and an "OMNIYAT Atelier" lifestyle-photography section with serif overlay copy. Consistent on mobile at 390px. This is directly relevant since it is the closest reference in the brief's list to the "well-directed mix of real 3D + cinematic photography" approach already favored for VERA.
**Adopt:** large-scale cinematic video/photography sections are a legitimate, lower-engineering-cost way to carry premium weight between the flagship's heavier procedural-3D zones; a clip-path/mask wipe transition (triangle or diamond) is a cheap, WebGL-free technique worth using for the flagship's mobile/reduced-motion fallback between industry zones.

### Translating into the flagship scene
1. **Scrub, don't cut, for the connective camera journey.** Bind the camera's forward dolly/rotation through the suspended-panel gallery to GSAP ScrollTrigger's `scrub` (Sobha's one-long-pinned-timeline pattern), reserving discrete cuts only for the per-industry "chapter" entry moments.
2. **Isolated full-bleed chapter cards per industry zone** (YODEZEEN pattern): each of the four zones gets one near-black beat with large type, a one-line context tag, and a single CTA before the camera continues — not a continuous wall of UI.
3. **Persistent secondary UI tile over the canvas** (Sobha's "3D Map" widget): keep a small always-visible industry-zone indicator/switcher layered over the WebGL canvas throughout, separate from the main nav.
4. **Mandatory, keyboard-reachable skip control on any intro/preload sequence** — directly enforced by Forge's dead-end gate and YODEZEEN's "SKIP": the flagship's entry state must never require a specific pointer gesture to proceed.
5. **Hard-capped, honest preloader.** Determinate progress (not a spinner) is good practice, but Lusion's loader stalling in this test session is the cautionary case: set a hard timeout (a few seconds) after which the scene enters at reduced fidelity rather than risk ever blocking entry.
6. **Concentrate WebGL cost, don't spread it.** Use procedural Three.js only for the connective journey/gallery; treat the four industry detail sections more like OMNIYAT's cinematic photography/video panels, keeping the heaviest rendering work to the transitions where it earns the most impact per pixel.
7. **Clip-path/mask wipe as the reduced-motion and mobile fallback transition** between zones (OMNIYAT technique) — no WebGL dependency, cheap, and already reads as premium.
8. **Report gaps plainly.** Forge's actual in-scene interaction and Lusion's full WebGL experience could not be directly captured here (gate click didn't register headless; preloader never completed in this sandboxed GPU environment) — Forge's description above leans on the previously-reviewed WhatsApp video, and nothing about Lusion's in-scene behavior is asserted beyond what its stalled loader showed.
