# Change Log — Athar Lab Industries Showcase

## Update: Flagship cinematic WebGL entrance (in progress — ATHAR Showcase shell only so far)

Per the client's explicit authorization to go beyond the prior "preserve existing design" QA-protection instruction and build the previously-requested real-3D flagship: a genuine Three.js scene (procedural geometry only, no external 3D model files — `showcase/js/flagship-scene.js`) with a real `PerspectiveCamera` moving along a `CatmullRomCurve3` path through 5 stations (ATHAR entrance, then FORMA/VERA/ASCEND/MERIDIAN, each its own lit "world": palette, point-light color, and its own real hero photo as the station's feature panel), driven by GSAP `ScrollTrigger` (`scrub:1`, not a plain scroll/IntersectionObserver listener) so the move is continuous and reversible scrolling either direction. Verified with a Playwright harness (`showcase/dev/flagship-test.html`) that reads the live camera position/rotation off the renderer at several scroll offsets forward and backward — real depth (z travels 8 → ‑119 across the scroll range), real perspective, correct zone-by-zone transitions, 0 console errors.

Integrated into `showcase/index.html` as a new section between the opening hero and the existing sector grid: a 500vh scroll-driven stage with a sticky canvas, an overlay (zone name/tag/description, a real "Open full demo" link per industry tied to the camera's current zone, jump-dots), and a keyboard-reachable "skip the cinematic intro" link. Gated behind a conservative, multi-signal check (mirrors the main studioathar.studio site's own Signal tier-classification approach) — `prefers-reduced-motion`, WebGL availability, import-map support, and coarse-pointer+narrow-viewport (phones) all route straight to the existing sector grid instead, which is treated as a legitimate fallback experience in its own right (real interactive horizontal scroll-snap zones with real photography), not a flat stand-in. GSAP + ScrollTrigger are lazy-loaded (classic `<script>` tags injected only when the gate passes) so non-cinematic visitors download none of it; Three.js was already lazy via dynamic `import()`. New self-hosted `vendor/gsap/3.12.5/` (cdnjs build, GreenSock "Standard No Charge" license — ScrollTrigger became free for everyone in GSAP's 2024 licensing change) added following the same pinned/versioned pattern as the existing `vendor/three/0.186.1/`.

Full EN/AR bilingual support added to the showcase shell (nav, hero, the new flagship overlay, the new "Real Athar work" section, offer, inquiry form, footer) using the exact `data-ar`/`data-en`/`-html`/`-placeholder` + `#langToggle` convention already used on studioathar.studio's own `index.html` — English is the default for new visitors here (matching that site's own default), not Arabic-first. New "Real Athar work" section (`#capabilities`) added, explicitly distinguishing KHZNTI — a real, live Athar product (factual Operations/Vaults/Reports description, linked to khznti.app) — from the four fictional demo brands above it. The ₪2,190 offer copy was reworded to state plainly that the cinematic/3D work is *not* included at that price and is scoped separately, without changing the number itself.

**Two real, confirmed bugs found and fixed along the way** (both pre-existing, neither introduced this pass): (1) the mobile/fallback sector cards for VERA, ASCEND and MERIDIAN had a wrong relative path (`url('../demos/...')`) pointing one directory above the actual `showcase/demos/...` location, so 3 of 4 fallback card photos silently 404'd — fixed to a correct relative path. (2) the inquiry form's honeypot field used `.hp{position:absolute;left:-9999px;...}` to hide it off-screen; once this page supports `dir="rtl"`, that far off-screen absolute position produces a pathological scrollable-overflow region that reliably blanked the entire page's paint when switching language (isolated via bisection down to that single rule, reproduced with zero WebGL/flagship code involved, confirmed pre-existing on the unmodified file). Fixed by switching `.hp` to the same safe clip-based hidden-field technique already used by `.sr-only` elsewhere in this file.

Real competitive research for the camera-move/lighting/pacing decisions above is in `DESIGN-RESEARCH.md` under "Flagship WebGL/Camera Research" — live Playwright visits to Sobha Privy Collection, Forge Automotive (partially blocked by an entry gate that didn't pass under headless automation — reported honestly, not guessed around), Lusion (stuck at its own preloader for the full test window — also reported, not guessed around), YODEZEEN, and OMNIYAT.

**Still pending** (tracked, not yet done): the VERA/ASCEND/MERIDIAN creative upgrades the brief also calls for (VERA's current CSS-scale illustrated scene is explicitly not approved and still needs real elevation; ASCEND needs GSAP/ScrollTrigger and a re-verified no-lock-out gesture gate; MERIDIAN needs more than the particle field alone); the pre-existing sector-card English copy in `#sectors` itself was not translated in this pass (the bilingual *mechanism* is proven out across the rest of the page, but full string coverage of that one section is a follow-up); a full desktop+mobile QA recording pass across all four demos has not been re-run since this change.

## Update: Research-driven creative upgrade (VERA priority)

Preceded by real competitive research (`DESIGN-RESEARCH.md`) — live Playwright visits to Dentalux, WorkFin (a Three.js 3D dental-room diorama), LK Denta, Why Zero (Awwwards Site of the Day), and Hear.ai, studied for interaction mechanics, not editorial layout.

**VERA Clinic (deepest change, client priority)**: the uniform concern-card grid is replaced by an original illustrated clinic scene the visitor scroll-pulls-back from (CSS transform, no WebGL — scale measured monotonic 1.300→0.905 across the scroll range), with 4 numbered hotspots replacing the cards. Dr. Haddad's credential now composites onto an environmental photo instead of an avatar circle. The journey timeline's captions became click-to-expand pin annotations. No two sections share the same visual structure. One real bug found in my own review and fixed: the reduced-motion fallback had the stage-number chip overlapping the heading text — now hidden in favor of a clean bottom caption band.

**ASCEND Academy**: the first program switch is now gesture-gated (drag past a threshold, with the drag path drawn live) in the spirit of Why Zero's "draw to reveal," falling back to ordinary click/keyboard for every switch after that and as a day-one accessible alternative. Added a scroll-tied particle field in the curriculum panel and genuinely distinct per-program photo crops/tints (not just a shared hue-rotate).

**MERIDIAN Partners**: added a Canvas 2D particle field that resolves from chaos to an ordered bronze grid exactly at the narrative's Challenge→Solution pivot (verified via a live order-value read at 7 scroll checkpoints: 0, 0, 0.696, 1, 1, 1, 1), plus film-grain texture and an irregular (featured + 3 equal) service-grid layout replacing the uniform 2×2.

**Athar showcase shell**: the accordion sector list is replaced with a full-viewport horizontal scroll-snap zone track — one full-bleed panel per sector using each demo's own real hero photo (FORMA's own hero photo copied read-only for its panel; FORMA's file itself untouched) — with scroll-snap/drag/arrow-button/keyboard navigation and a Canvas 2D ember-dot motif in Athar's own palette. Also fixes a real pre-existing bug: the Athar logo PNG has no alpha channel, so the old `brightness(0) invert(1)` recolor filter rendered a solid white box over light content — replaced with a plain white chip so the real logo displays correctly.

All 4 "Open full demo" links re-verified by actually clicking them from the live, rebuilt showcase (not just inspecting hrefs) — each opens the correct, updated demo with the right title. 0 console errors across every page at desktop, mobile, and reduced-motion.

**Honest limitation, stated in `DESIGN-RESEARCH.md`**: WorkFin and Why Zero are 4-month Three.js/custom-GLSL productions. What's built here are original CSS/Canvas-2D/SVG equivalents capturing the *principle* (spatial scenes, gesture-gated reveals, particle resolution) within this project's vanilla-JS, no-new-library constraint — distinctive and premium for the medium, not literal parity with a custom WebGL build.

## Update: Full photography integration (this pass)

Canva's quota was restored and `media.canva.com` + `export-download.canva.com` were added to this session's allowed domains, unblocking real full-resolution photography. What changed:

**FORMA V10 — both approved fixes applied.** `demos/forma/index.html` is no longer a copy of the master; `_master-backups/patch_forma.py` was run with two newly generated, clean, high-resolution photographs (no embedded text/UI, correct room type, no watermarks). Verified byte-for-byte that *only* hero slide 2's image, the Bathrooms thumbnail, and the `cats.bath.img` JS entry changed — every other image, all text, all CSS/JS, and the cinematic-scroll section are untouched (automated diff in the QA report).

**VERA / ASCEND / MERIDIAN — real photography replaces the CSS/SVG placeholders.** Each demo now has 3 professionally art-directed photos (own `images/` folder per demo), integrated into existing layout slots (hero, service/service-detail panel, and one supporting section) via CSS background-image + gradient overlays for text legibility — no structural or interaction changes, all previously-verified functionality (selectors, forms, accordions, reduced-motion) re-confirmed working after the edits.

**Quality control applied, not just accepted on first generation**: two images failed inspection and were regenerated before use — a bathroom photo with a faint hallucinated "embossed watermark" texture on the tub, and an ASCEND photo showing clearly recognizable faces (replaced with a people-free version). Every one of the 11 final images was decoded and visually inspected (not just HTTP-200-checked) before integration.

**Photo sourcing pipeline** (for reference): `generate-image` → wrap the single image in a `desktop_wallpaper`-type Canva design via `generate-design`'s `asset_ids` (the only reliable way found to get a clean, undecorated single photo — `photo_collage` and similar content-template types auto-added unwanted text/multi-image layouts) → `create-design-from-candidate` → `export-design` → download from `export-download.canva.com`.

## New files (nothing in the existing repo was modified)

```
showcase/
  index.html                        ATHAR-branded showcase shell (sections A/B/C/E/G)
  MIGRATION.sql                     Optional Supabase schema migration — NOT applied
  CHANGELOG.md                      This file
  QA-REPORT.md                      Full QA evidence
  README.md                         How to run it locally
  assets/
    athar-logo-wordmark-official.png   (copied from /images, unmodified)
    athar-logo-icon-official.png       (copied from /images, unmodified)
  _master-backups/
    FORMA_V10_master.html           Byte-for-byte original V10, md5 2133479c65479cf4fcde56f69a0e42eb
    patch_forma.py                  Ready-to-run script for the 2 approved image fixes (not yet run — see Blockers)
  demos/
    forma/index.html                Currently a byte-identical copy of the V10 master (see Blockers — the
                                     2 approved image corrections are prepared but not yet applied)
    vera-clinic/index.html          New fictional brand — Clinics & Healthcare
    ascend-academy/index.html       New fictional brand — Education & Training
    meridian-partners/index.html    New fictional brand — Professional Services
```

Nothing outside `showcase/` was touched. `index.html`, `images/`, `clue/`, `signal/`, `solution-indicator/`, `vendor/`, `vercel.json` etc. at the repo root are exactly as they were.

## FORMA V10

- **Not modified.** `showcase/demos/forma/index.html` is a byte-for-byte copy of the original (md5-verified against both the file you first attached and the zip you attached in the second message).
- The two approved corrections (hero slide 2's embedded-screenshot background, and the bathroom photo that's actually a bedroom with a third-party "ELE" watermark, reused in both the category thumbnail and the JS `cats.bath.img` entry) are **prepared, not applied** — see Blockers below. `_master-backups/patch_forma.py` does exactly those two swaps and nothing else; it's parameterized on two replacement image files and ready to run the moment they're available.

## Three new fictional demo brands (built from scratch, no shared template)

| Brand | Sector | Palette | Type | Distinct interaction |
|---|---|---|---|---|
| **VERA Clinic** | Clinics & Healthcare | Sage green / cream / terracotta | Fraunces + Figtree | 4-way service selector, appointment form |
| **ASCEND Academy** | Education & Training | Near-black / acid-lime | Archivo Black + Space Grotesk | Keyboard-navigable program tabs, marquee ticker, pathway accordion |
| **MERIDIAN Partners** | Professional Services | Navy / graphite / bronze | Serif display + Inter | Service-line selector, quotation form |

All three are self-contained single HTML files, vanilla CSS/JS (no libraries), `prefers-reduced-motion`-aware, fully responsive, each with its own demo-only inquiry flow that validates client-side and explicitly tells the visitor nothing was submitted to a real backend.

## The Athar Lab showcase shell (`showcase/index.html`)

- Built in Athar's own real design-token system (copied verbatim from `index.html`'s `:root`: `--void/--char/--graphite/--ember/--paper/--bone`, Almarai/IBM Plex Sans Arabic/Space Mono), not FORMA's palette.
- Sections: editorial opening → 4-sector accordion index with a live preview panel per sector → the ₪2,190 offer → a real inquiry form.
- The real inquiry form reuses Athar's **existing, already-live** Supabase project and `projects_inquiries` table (same anon key / same client-side pattern as `index.html`'s own contact form) — it is genuinely wired to the real backend, not a mock. Because that table doesn't yet have columns for the extra fields this form collects (business name, sector, scope, timing, budget), they're folded into a labeled block inside the existing `project_details` text field as a zero-risk fallback. See `MIGRATION.sql` for the optional follow-up that gives them real columns.

## Blockers encountered (documented, not silently worked around)

1. **Image sourcing hit a hard quota wall.** Canva's `generate-image` tool failed with `quota_exceeded` after 4 successful generations this session. The CDN that serves full-resolution output (`media.canva.com`) is also not in this session's allowed network domains — confirmed via direct `curl` (403, connection refused by the egress proxy) — so even the 4 that did generate could only be retrieved as ~200px preview thumbnails, not usable at hero scale. Net effect:
   - The two FORMA image corrections are **not yet applied** — `patch_forma.py` is ready, just needs two real image files.
   - VERA/ASCEND/MERIDIAN were built with **no photography at all** — CSS/SVG-driven color, geometry and typography instead. This was a deliberate recovery, not a silent downgrade: each demo still has a genuinely distinct, complete visual identity.
   - To unblock: add `media.canva.com` to this environment's allowed network domains, or supply the two FORMA replacement photos directly.
2. **`www.eleinterior.com/approach`** (the brief's cited motion reference) is still outside this session's allowed domains — only the bare `eleinterior.com` apex resolves. Not a hard blocker; the supplied reference video and `elet.zip` covered the motion/pacing study instead.
3. **Schema decision deferred to you**, per the brief's own instruction not to apply migrations without approval: `MIGRATION.sql` is prepared but not run.
