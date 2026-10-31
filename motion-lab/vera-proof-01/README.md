# VERA Motion Lab — Proof 01

A standalone, isolated scroll-driven motion prototype. This is **not** part of the VERA
production site and does not modify it — it lives entirely in `motion-lab/vera-proof-01/`
with its own local copies of GSAP and one photo asset, and has not been committed.

## Reference check

The Aventura reference video (`Aventura_Website_Reference_For_Claude.mp4`, the file
previously supplied in this session) was accessible and reviewed before building this —
both a 1fps pass across its full ~35s and a denser frame set of its opening ~13s. Real,
specific observations drawn from it (not invented) are listed under "What this borrows
from the reference" below.

## Preview instructions

```
cd motion-lab/vera-proof-01
python3 -m http.server 8030
```
Then open `http://localhost:8030/index.html`. No build step — it's a single HTML file plus
two local asset folders (`vendor/gsap/`, `images/`). Scroll down slowly to drive the
transition; scroll back up to watch it reverse.

## What's in the composition

**Scene 1** — a full-viewport split opening: an ivory panel (upright serif headline,
"Every visit,") beside a full-height photo panel (italic serif headline, "explained
first.") — one sentence, two typographic treatments, continuing across the seam between
the light ground and the photograph.

**The scroll-driven transition** — scrolling pins the opening scene and scrubs a single
coordinated timeline: the ivory panel's own width (and, on mobile, height) animates to
zero rather than simply fading, so the geometry change and the text's exit are the same
event. The photo panel grows from a right-half panel to full-bleed while its internal
scale and `object-position` shift at the same time, so the *visible framing* of the photo
changes — more of it becomes visible, and a different region is centered — rather than a
flat zoom. The split headline's photo-side half shrinks and settles inward as the image
moves under it.

**Scene 2** — a settled, full-bleed editorial statement ("Nothing about the visit should
feel like a guess.") fades and rises in as the image reaches its final framing, timed to
overlap the tail of Scene 1's exit so there is never a frame with nothing legible on
screen. It's fully readable before the pin releases.

**After the pin** — ordinary document scroll resumes into a plain next section, proving
the prototype doesn't end in a dead, pinned frame.

## GSAP timeline / ScrollTrigger configuration

One `gsap.timeline()` is driven by a single `ScrollTrigger`:

```js
gsap.timeline({
  scrollTrigger: {
    trigger: '#stage', start: 'top top', end: '+=160%',
    scrub: 0.6, pin: true, pinSpacing: true, anticipatePin: 1
  }
})
```

- `pin: true` holds `#stage` in place for `end: '+=160%'` of extra scroll distance (desktop;
  `120%` on mobile) — that scroll distance is the "runway" the whole transformation plays
  across.
- `scrub: 0.6` ties every tween's progress directly to scroll position, with a small
  (0.6s) smoothing lag rather than an instant 1:1 snap — reversible by construction,
  since scrubbed tweens simply play backward when scroll position decreases.
- All tweens inside the timeline are positioned at overlapping timeline offsets (`0`,
  `0.12`, `0.6`, `0.66`, …) rather than running sequentially, so panel geometry, image
  framing, typography, and Scene 2's entrance move as one coordinated event instead of
  a chain of independent section animations.
- `gsap.matchMedia()` provides a completely separate, simpler timeline for `max-width:
  900px` (no split panel — a single full-bleed photo panel instead), and both breakpoint
  handlers return a cleanup function so `ScrollTrigger`/timeline instances are properly
  killed on a breakpoint change rather than leaking.
- A third, always-on `ScrollTrigger` (outside both breakpoint handlers) fades the
  "scroll to drive the transition" hint on first movement, since that UI affordance isn't
  specific to either layout.
- `prefers-reduced-motion: reduce` is checked before GSAP is even loaded; if set, neither
  GSAP nor ScrollTrigger is fetched at all, and CSS alone lays out both scenes statically,
  stacked, fully visible and fully readable, with the "scroll to drive" hint hidden.

## What this borrows from the reference (and what's original)

From studying the Aventura video: a full-viewport opening where one sentence is split
across a light panel (upright serif) and a photographic panel (italic serif) crossing
onto the photo itself; and a sequence in its first ~13 seconds where the photographic
panel cycles through different crops/framings of its imagery while the headline holds
position. Neither the wording, the photograph, the color system, nor the exact typeface
pairing is copied — the split-sentence/dual-treatment technique and the idea of a photo
panel whose *framing* changes (not just its scale) were reimplemented from scratch as an
original VERA composition, in VERA's own Fraunces/Figtree and Graphite/Ivory/Copper
tokens (already in use on the real VERA site), using one of the VERA project's own
previously-sourced, licensed photographs.

## Known limitations / differences from the reference

- This proof covers exactly the two compositions and one transition the brief asked for.
  The Aventura reference has many more scenes (a branded loading sequence, a circular
  stat cluster, a dark split "Beyond the Smile" panel, a team grid, etc.) — none of that
  additional scope was attempted here; it was explicitly out of scope for a single proof.
- The reference's photo-panel cycling in its opening seconds reads as an autoplaying
  background video/carousel, not a scroll-scrubbed transform — that specific mechanism
  isn't reproduced (it isn't scroll-driven, so it doesn't fit a ScrollTrigger proof); the
  *principle* (the image's framing changes in a coordinated, non-trivial way) is instead
  expressed through the scroll-scrubbed clip/scale/object-position animation described
  above.
- Only one photograph is used; the image "reframes" rather than cross-fading between
  multiple photos, which keeps the transition legible as a single continuous shot rather
  than a slideshow.
- This is a visual/motion proof, not production-ready markup — it has no real navigation,
  no footer, and the "next section" exists solely to demonstrate the pin releases cleanly.
- Tested at 1440×900 and 390×844 via actual browser automation (screenshots at multiple
  scroll positions in both directions, plus full video recordings), and with
  `prefers-reduced-motion: reduce` forced on. Not tested on a physical device or in every
  browser engine.

## Verification performed

- Zero console/page errors at every tested viewport and motion setting.
- Scroll-progress screenshots at 0/15/30/45/60/75/90/100% confirmed the transition is
  continuous with no blank frames, no clipped/cut-off text, and a legible settled state.
- Explicit reverse-scroll test (forward to 100%, back to 50%, back to 0%) confirmed the
  composition exactly restores at each point — scrubbed GSAP tweens are reversible by
  construction, and this was checked against real screenshots rather than assumed.
- Mobile scrub checked the same way; found and fixed a real bug (a blank ivory gap
  opening up mid-scroll because the light panel's text faded but its box didn't shrink)
  before considering it done.
- `prefers-reduced-motion` checked with Playwright's `reducedMotion: 'reduce'` context
  option — confirms GSAP never loads and both scenes render immediately and statically.
