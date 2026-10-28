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
