# VERA Motion Lab — Proof 02

A standalone, more ambitious scroll-driven motion prototype, isolated at
`motion-lab/vera-proof-02/`. Does not modify VERA V7, Proof 01, FORMA, ASCEND,
MERIDIAN, ATHAR Lab, the live site, or any deployment configuration. Not
committed, pushed, merged, or deployed.

## Preview instructions

```
cd motion-lab/vera-proof-02
python3 -m http.server 8031
```
Open `http://localhost:8031/index.html`. Scroll down slowly through all three
stages; scroll back up to watch the whole thing reverse.

## What's reused from Proof 01

`vendor/gsap/gsap.min.js` and `vendor/gsap/ScrollTrigger.min.js` are copied
verbatim from `motion-lab/vera-proof-01/vendor/gsap/` (same GSAP 3.12.5
build) — Proof 01 itself is untouched. The `prefers-reduced-motion` gate,
the deferred `loadScript()` pattern, and the "fade this hint on first
scroll" `ScrollTrigger` technique are all carried over structurally.
Everything else — the clip-path-driven panel architecture, the three-stage
timeline, the interactive arrival — is new.

## The three stages

**Stage 01 — Editorial opening.** A split ivory/photograph composition.
Architecturally different from Proof 01: the photo layer is *always*
full-bleed in the DOM (`inset:0`, 100vw/100vh from the first frame), and the
ivory panel sits above it, visible only through a `clip-path` polygon that
initially masks it down to the left half. Scrolling doesn't shrink any
box — it morphs the ivory panel's clip-path into an increasingly acute
diagonal sliver (with a matching slight translate/rotate), so the panel
reads as being wiped away at an angle rather than shrinking. Because the
photo was never resized, revealing more of it costs nothing structurally —
there is no box that has to "catch up" to freed space, which is exactly the
bug class Proof 01 hit on mobile. The photo's own `object-position`/scale
animate at the same time, so the framing you end up seeing is a different
region of the photo, not a zoomed copy of the same one. The split headline
(upright serif on ivory, italic on the photo) moves with its respective
panel rather than just fading in place.

**Stage 02 — Cinematic transformation.** A graphite layer, also `inset:0`
and also always in the DOM, masked by `clip-path: inset(100% 0 0 0)` (fully
hidden below the viewport). It's told to start rising at roughly the 30%
mark of Stage 1's own exit tween — so for a real stretch of scroll, Stage 1
is still resolving while Stage 2 is already visible underneath it: a
genuine overlap, not a handoff at a boundary. Once risen, a second
photograph (a different setting, different people) is revealed inside
Stage 2 via its own `clip-path` wipe — "at least two distinct image
compositions" inside one stage, as asked, done with the same masking
technique as Stage 1 rather than a plain crossfade. The headline's two
lines reveal with a clipped/staggered translateY (word-by-word-style line
reveal), coordinated with a directional scrim gradient that keeps the text
side dark regardless of which image is underneath it. Both lines are fully
settled, legible, and static for a real span of scroll before Stage 2
hands off — the "readable pause" the brief asked for.

**Stage 03 — Interactive arrival.** Not pinned at all — it's a normal
in-flow section that scrolls into view once the Stage 1/2 pin releases,
so there's no risk of trapping the visitor in a second pin. "What brings
you in?" with three selectable cards, built as a `role="radiogroup"` with
roving `tabindex`, `aria-checked`, and full keyboard support (arrow keys to
move focus, Enter/Space to select) in addition to mouse click and touch tap
— all three input methods were tested, not assumed. Selecting a card
reveals a short demo-only response panel with an explicit "no data is
collected or sent" line; nothing is stored, transmitted, or persisted
anywhere.

## GSAP timeline / ScrollTrigger configuration

One pinned, scrubbed timeline covers Stages 1–2:

```js
gsap.timeline({
  scrollTrigger: {
    trigger: '#cineStage', start: 'top top', end: '+=260%',
    scrub: 0.7, pin: true, pinSpacing: true, anticipatePin: 1
  }
})
```

- `end: '+=260%'` (desktop; `220%` mobile) is deliberately more scroll
  "runway" than Proof 01's `160%` — Proof 02 has two full compositions and
  an internal image swap to choreograph, not one.
- The timeline uses **labels** (`s1-exit`, `s2-emerge`, `s2-swap`,
  `s2-settle`) as the brief asked for "clearly labelled stages" — every
  tween is positioned relative to a label (e.g. `'s1-exit+=0.32'`) rather
  than hardcoded absolute offsets, so the overlap between Stage 1's exit
  and Stage 2's emergence is an explicit, named relationship in the code,
  not an accident of timing.
- `scrub: 0.7` ties the whole timeline to scroll position with a small
  smoothing lag — reversible by construction; scrubbed GSAP tweens simply
  play backward when scroll position decreases, which is what makes
  "forward and reverse scroll continuity" close to automatic rather than
  something hand-built.
- `gsap.matchMedia()` provides a completely separate mobile timeline (not
  a scaled-down copy of the desktop one): the ivory wipe becomes a
  horizontal collapse instead of a diagonal sideways one (more legible in
  a narrow viewport), and the Stage 2 image crops/scrim are tuned
  separately for portrait framing. Each breakpoint handler returns a
  cleanup function so `ScrollTrigger` instances are killed, not leaked, on
  a breakpoint change.
- Stage 3's interaction layer is plain DOM/JS with no GSAP dependency at
  all, so it works identically whether GSAP loaded successfully or not —
  important, since `prefers-reduced-motion` skips loading GSAP entirely.

## Known limitations / honest differences from the Aventura reference

- The reference's opening sequence includes a separate branded loading
  screen (logo draw-in, spinner, category labels) before the hero settles.
  Proof 02 doesn't reproduce that — it was out of scope for this proof,
  which was asked to focus on the *scroll-driven* transformation, not the
  initial page-load sequence.
- The reference's photo panel in its first ~13 seconds cycles through
  several images in what reads as an autoplaying background video, not a
  scroll-scrubbed transform. That mechanism isn't scroll-driven, so it
  doesn't translate into a ScrollTrigger proof; Proof 02 expresses the
  *underlying idea* (the image's framing changes in a coordinated way, not
  via a flat zoom) through the clip-path/object-position system instead,
  both in Stage 1 and, more directly, in Stage 2's image-to-image mask
  wipe.
- The reference has considerably more scenes (a circular stat cluster, a
  team grid, a dark "Beyond the Smile" split panel, etc.). Proof 02 covers
  exactly the three stages the brief specified — not an attempt at
  matching the reference's total scope.
- Only two photographs are used in Stage 2 (and one in Stage 1). The
  reference's photography is also considerably higher in both volume and,
  likely, art-direction budget — VERA's existing sourced/licensed Pexels
  photography was reused here rather than commissioning anything new.
- This remains a visual/motion proof, not production markup: no real
  navigation, no footer, and the trailing "next section" exists solely to
  prove the pin releases cleanly.

## What genuinely improved over Proof 01

- **The panel transform is structurally different, not just stronger.**
  Proof 01 shrank the ivory panel's own width to 0; Proof 02 masks it with
  a morphing diagonal `clip-path` while the photo underneath never resizes
  at all. This is both a more interesting visual (a true wipe, not a
  retreat) and a more robust architecture — it's the direct fix for the
  bug class (a box that has to grow to fill freed space, and doesn't,
  fast enough, on mobile) that Proof 01 actually hit and had to patch.
- **Two stages genuinely overlap**, not just one transition into a static
  second scene. Stage 2 is visibly present and rising while Stage 1 is
  still resolving, which is the specific creative gap called out going
  into this round.
- **A real second image composition inside one stage**, revealed with the
  same masking technique as the macro transition rather than a crossfade —
  this is new; Proof 01 had exactly one photograph per scene.
- **A working interactive end-state** — Proof 01 ended on a readable
  static scene; Proof 02 ends on something the visitor can actually use,
  tested across mouse, touch, and keyboard rather than just visually
  inspected.

## What still falls short of the reference

- Aventura's motion reads as the output of a larger production — more
  photography, more scenes, a dedicated loading sequence, and (visible in
  the stat-cluster scene) compositions this proof didn't attempt at all.
  Proof 02 is closer in *technique* (masked, coordinated, multi-element
  transforms rather than independent fades) but is still a three-stage
  proof against what is, in the reference, a much longer site.
- The Stage 1 diagonal wipe is a strong, deliberate effect, but it's one
  technique repeated (mirrored, roughly) for the mobile variant; the
  reference's transitions vary more per-scene than this proof's two scenes
  can really demonstrate.
- Stage 2's typography entrance (clipped line-reveal) is good but simpler
  than the kind of per-word or per-character choreography visible in the
  reference's hero headline — a reasonable place to go further in a next
  round, not something attempted here.

## Verification performed (not assumed)

- Zero console/page errors at 1440×900, 390×844, and 375×812, and under
  `prefers-reduced-motion: reduce`.
- Screenshots captured at 0/10/25/35/50/65/75/90/100% scroll progress at
  all three required viewports.
- A real bug was found this way and fixed before delivery: the mobile
  Stage 2 image crop revealed too much flat, bright background wall with
  a scrim gradient that left that region almost unscrimmed — legible on
  desktop, genuinely low-contrast on mobile. Fixed by reframing the
  mobile `object-position` toward the actual subject matter and
  strengthening the mobile scrim curve; re-verified clean afterward.
- An apparent text-overlap at 65% progress was checked against the actual
  DOM (`getBoundingClientRect()` on both headline lines) rather than taken
  at face value — the lines were in fact stacked with zero overlap; the
  screenshot was a capture-timing artifact of the scrub's smoothing lag,
  confirmed resolved with a longer settle wait and not treated as a
  real defect.
- Explicit reverse-scroll screenshots (forward to 100%, back to 50%, back
  to 0%, both desktop and mobile) confirmed the composition restores
  exactly at each point.
- Stage 3 selection tested via keyboard (Tab, Arrow keys, Enter), mouse
  click, and `page.tap()` touch emulation — all three update
  `aria-checked` and the response panel correctly.
- Both walkthrough videos include the interaction (keyboard + mouse on
  desktop, touch on mobile) and the full reverse scroll, not just the
  forward pass.
