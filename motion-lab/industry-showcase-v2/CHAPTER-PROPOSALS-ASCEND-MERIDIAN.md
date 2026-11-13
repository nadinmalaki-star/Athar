# Chapter Concept Proposals — ASCEND Academy & MERIDIAN Partners

**Status: proposal only. Nothing in this document has been implemented.** Written after reviewing the approved standalone demos (`showcase/demos/ascend-academy/index.html`, `showcase/demos/meridian-partners/index.html`), their image assets, and their signature interaction patterns, against the shared framework documented in `VERA-BASELINE.md`.

Both proposals plug into the same chapter-layer / transition / nav framework as FORMA and VERA (§1, §3, §4 of the baseline doc) but deliberately do **not** reuse VERA's specific composition (bottom-right anchor, editorial serif, coral accent) — each is fitted to its own project's real brand voice and its own hero image's actual geometry, the same way VERA was fitted to its own photo.

---

## What the real demos establish

| | ASCEND Academy | MERIDIAN Partners |
|---|---|---|
| Display font | **Archivo Black** (ultra-bold geometric) | **Fraunces** (warm, editorial serif) |
| Body font | Space Grotesk | Inter |
| Accent | `#D6FF3F` lime, on near-black | `#b08968` / `#d4a876` bronze, on navy |
| Voice | energetic, systemized, "pick your track" | measured, authoritative, "clarity before strategy" |
| Signature interaction | a **draggable 4-track program switcher** (Product Design / Software Engineering / Digital Marketing / Data Fundamentals), gesture-driven | an **8-step numbered scroll narrative** (`01/08` counter + progress bar), pinned and scrubbed |
| Available photography | amphitheater-style innovation hub (lime-lit stepped seating, bookshelf, wall displays of wireframes/dashboards), a design-studio workspace (3D printer, sketchbook, material swatches), a lecture/presentation room | a dusk boardroom with a dotted world-map wall + brass globe + bonsai, a warm walnut-and-brass boardroom with a physical globe and rock/sculpture objects, a striking standalone **armillary sphere over misty mountains at dawn** |

Carrying these distinctions into each chapter is what keeps the Showcase coherent as *one system* (same nav, same transition, same no-panel rule) while each project still reads as its own thing — exactly what VERA already does relative to FORMA.

---

## Proposal 1 — ASCEND Academy (chapter 03)

**Image:** the amphitheater/innovation-hub shot (`hero.jpg` equivalent) — full-bleed, same photographic register as FORMA/VERA, but instantly distinct through its lime-lit stepped seating, bookshelf-wall, and the wireframe/dashboard displays visible on the right-hand screens. It's the most "populated" of the three available ASCEND images, giving the richest calm-zone options.

**Text anchor:** bottom-**left**, not bottom-right. Two reasons: (a) it mirrors VERA's bottom-right across the sequence rather than repeating it, giving the four chapters a left/middle/right-left visual rhythm instead of three stacked in the same corner; (b) the amphitheater shot's lower-left floor/seating-edge area reads calmer than the lower-right, which is dominated by the stepped seating's cushions and a visible display screen. Exact offsets to be measured empirically against the real rendered crop, the same way VERA's were — not assumed from this description.

**Typography:** `Archivo Black` for the title (ASCEND's own real display font, not VERA's Instrument Serif or FORMA's Almarai), set tight and heavy — the opposite move from VERA's "quieten it down" treatment, because ASCEND's own brand voice *is* loud and systemized; underplaying it here would be the same mismatch VERA had in reverse. Index/eyebrow in the existing shared mono family, lime (`#D6FF3F`) for the index number and any italic/accent word, matching the real demo exactly rather than inventing a new tint.

**The distinct compositional device (so this isn't "VERA with different colors"):** VERA's eyebrow is a single static category line. ASCEND's real identity *is* a 4-track switcher — so the chapter's eyebrow becomes a **short rotating label** cycling through the same four tracks ("Product Design · Software Engineering · Digital Marketing · Data Fundamentals"), auto-advancing every few seconds (pausable on hover/focus, inert entirely under reduced motion). It's a lightweight, text-only echo of the real demo's drag mechanic — not a reimplementation of the drag interaction inside the Showcase chapter, just a nod that rewards someone who then opens the real demo and recognizes the pattern.

**CTA:** same icon-circle + underlined-label pattern as VERA, copy specific to what's actually there: *"Open the program explorer"* → `showcase/demos/ascend-academy/index.html`.

**Secondary note:** one line, same concept-work register as VERA's, e.g. *"ATHAR Lab concept work — a draggable, multi-track curriculum explorer."* (states what the real demo's interaction actually is, per the Showcase's "demonstrate actual product value" requirement).

**Mobile:** needs its own empirical pass once built — different crop, different collision zones (the wall displays and bookshelf sit at different heights than VERA's sign/vase), checked independently at 390px and 320px per the baseline doc's §5/§7 guidance, not assumed from the desktop fit.

---

## Proposal 2 — MERIDIAN Partners (chapter 04)

**Image:** the dusk boardroom with the dotted world-map wall, brass globe and bonsai (`hero.jpg` equivalent) — keeps the same "full-bleed interior photo" register as the other three chapters (rather than switching to the more abstract armillary-sphere image, which risks breaking the Showcase's visual consistency this early). The map wall and window-skyline glow give two genuinely calm, texturally quiet zones to choose from.

**Text anchor:** top-**right**, over the dusk window/skyline glow. None of the other three chapters anchor to the top — FORMA is left-middle, VERA is bottom-right, ASCEND (proposed) is bottom-left — so this gives the four-chapter sequence real positional variety instead of three bottom-anchored blocks in a row, and it sits in the one part of this specific photo (the soft dusk sky beyond the glass) with no competing objects at all, unlike the map wall or the table itself.

**Typography:** `Fraunces` for the title — MERIDIAN's own real serif, warmer and more decorative than VERA's Instrument Serif, so the two "quiet serif" chapters (VERA, MERIDIAN) still read as different voices rather than the same move twice. Bronze (`#b08968`/`#d4a876`) accent, matching the real demo exactly.

**The distinct compositional device:** MERIDIAN's real identity is its numbered `01/08` narrative counter with a progress bar. Rather than VERA's plain `"04 / 04"` static index, MERIDIAN's chapter index is treated as a small **ticking counter with a thin progress bar beneath it** — reusing the same underline-tick visual language already built for the shared bottom nav (§4 of the baseline doc), just relocated inside the chapter panel itself. It's a genuine echo of the real demo's own device, built from a pattern the framework already has, not a new one.

**CTA:** *"Request the diagnostic narrative"* (or similar — matches the real demo's own "Request a diagnostic" framing) → `showcase/demos/meridian-partners/index.html`.

**Secondary note:** *"ATHAR Lab concept work — an eight-stage scroll narrative on how the firm actually advises."*

**Mobile:** same requirement as ASCEND — independent empirical pass at 390px and 320px once built; the map wall's dotted pattern and the window glow will crop very differently from VERA's sign-and-vase composition.

**Optional, not proposed for this round:** the standalone armillary-sphere-over-mountains image is striking enough that it could work as a brief *glimpsed* frame during the FORMA→…→MERIDIAN transition sequence itself (nothing in the static chapter), as a small future refinement to the shared transition's per-chapter tinting mentioned in the baseline doc's §3 — flagging it here only as an idea for later, not part of this proposal.

---

## What happens once these are approved

Per the baseline doc's §7: building either chapter means (1) the same four-part chapter-layer markup, (2) an empirical collision/legibility pass against the real rendered photo at desktop/390/320 — not assumption, (3) extending `ORDER` and `goTo()`'s forward/back branching from the current 2-chapter (`forma`/`vera`) hard-code to the real 4-chapter sequence, and (4) each chapter's own nav tick losing `.is-soon`. None of that has been started — this document is concept-approval material only.
