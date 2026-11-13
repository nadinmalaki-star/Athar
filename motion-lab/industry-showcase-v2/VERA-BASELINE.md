# ATHAR Industry Showcase V2 — Approved Baseline

**Status:** Approved by the client as the baseline direction (VERA Clinic R2). Preserve as-is — no further cosmetic iteration without explicit approval.
**File:** `motion-lab/industry-showcase-v2/index.html`
**Supersedes:** `motion-lab/industry-showcase-proto02/` (kept untouched as a historical reference; not deleted).
**Scope of this document:** the shared framework (navigation, transition, chapter-layer architecture, responsive rules, accessibility) plus the VERA chapter's specific composition, as the reference every future chapter (ASCEND, MERIDIAN, and any later revisit of FORMA) must plug into.

---

## 1. Chapter-layer architecture (shared, chapter-agnostic)

Each chapter is a `<section class="chapter-layer" id="<name>Layer" data-chapter="<name>">` stacked absolutely inside `<main class="stage">`, in DOM/z-index order. Internally, every chapter shares the same four-part structure:

```html
<section class="chapter-layer" id="xLayer" data-chapter="x" aria-label="X chapter">
  <div class="chapter-bg"><picture>…or plain <img>…</picture></div>
  <div class="chapter-wash" aria-hidden="true"></div>
  <div class="chapter-content">
    <div class="ch-panel">
      <span class="ch-index">NN / 04</span>
      <div class="ch-cat mask"><span class="mask-in">Category label</span></div>
      <h1 class="ch-title">…</h1>
      <p class="ch-value">…</p>
      <p class="ch-note">…</p>            <!-- optional, chapter-specific -->
      <div class="ch-actions"><a class="btn-demo">…</a></div>
    </div>
  </div>
</section>
```

- **`.chapter-bg img`** — full-bleed, `object-fit:cover`, base `scale(1.06)`; VERA (and any photographic chapter) adds a per-chapter `scale(1.12)` override as its resting state, since the transition's counter-scale animates relative to this resting value (see §3).
- **`.chapter-wash`** — a chapter-scoped CSS gradient only, never a panel. VERA's is a faint bottom-edge vignette (`rgba(20,18,16,.16)→0` over the bottom 30%) — insurance alongside text-shadow, not a legibility crutch on its own.
- **`.chapter-content`** — positions `.ch-panel` via flexbox (`justify-content`/`align-items`) on the OUTER container only. The base rule is left/middle (FORMA's position); VERA overrides to bottom-right. **Each new chapter should pick its own anchor** rather than reusing VERA's bottom-right — see §7 (next-phase guidance).
- **No panel, card, or background fill is ever placed behind the text.** Legibility comes entirely from: (a) picking a genuinely calm region of the source photo, (b) a soft `text-shadow` glow in the paper tone, (c) the faint chapter-wash gradient. This is the single non-negotiable rule carried over from the VERA Hero work and now the whole Showcase's house style.

## 2. VERA chapter — approved composition (desktop)

- **Image:** `assets/vera-reception-desktop.jpg` (same approved Hero V2 asset as VERA's real site), full-bleed, `object-fit:cover`, resting `scale(1.12)`.
- **Text anchor:** bottom-right. `justify-content:flex-end; align-items:flex-end; padding-right:calc(var(--gutter) + 40px); padding-bottom:132px`. The `+40px` beyond the shared gutter is VERA-specific — measured empirically to clear the flower vase (photo x 947–1003 at 1600px viewport) and the real "VERA Clinic" wall sign (photo x 1180–1460, y 255–420) with margin on both axes. **Do not copy these exact offsets to another chapter** — they are a fit to this one photo; each new chapter needs its own empirical measurement pass (see §7).
- **Typography:** a deliberately *quiet*, compact register — `--editorial` (Instrument Serif, the same family as VERA's real site) at `clamp(28px,3vw,44px)`, weight 400, upright "VERA" + italic coral "Clinic". This was a direct response to the real wall signage already being the loudest wordmark in frame; a second bold sans headline duplicated it. Supporting value text 12.5px/1.7, secondary concept-work note 10.5px mono, both with `rgba(20,18,16,…)` ink and a light paper-toned `text-shadow` for contrast (never a background fill).
- **Accent color:** `#C96A4E` (coral), used for the index number and the italic "Clinic".
- **CTA:** an icon-circle button — a bordered 32px circle with an arrow icon, paired with an underlined text label (`.btn-demo-text` + `.btn-demo-icon`), not a solid block. This reads as an intentional, clickable action without introducing a panel. Label: "View the interactive prototype", linking out to `showcase/demos/vera-clinic/vera-clinic-final.html` (`target="_blank"`).
- **Secondary note:** one line, concise, chapter-specific concept-work disclosure ("ATHAR Lab concept work, self-directed — not commissioned by VERA Clinic."), distinct in size/opacity from the atmospheric `.ch-value` copy above it.

## 3. Transition mechanism (shared, chapter-agnostic)

Mechanism: a `clip-path` polygon wipe + counter-scale parallax + a brief shared "breath" scrim + a soft rack-focus blur on the incoming layer. This is the one mechanism every chapter must plug into — **do not invent a new transition type per chapter.**

- **Wipe:** incoming layer's `clip-path` animates from a zero-width line at the leading edge (right edge when moving forward, left edge when moving back) to the full box — `power4.inOut`, `1.3s`, starting at `t=0.08s`.
- **Parallax:** outgoing image scales `1.06→1.16` (`power3.inOut`, 1.45s); incoming image scales `1.16→1.06` over the same window — this is why every chapter's resting `.chapter-bg img` scale must be `1.12` (or whatever the chapter sets) so the counter-scale has graceful headroom in both directions.
- **Breath:** `#transitionScrim` (fixed, full-bleed, `background:var(--void)`) dips `0→.15→0` opacity, centered on the wipe's crossing point (`t=0.55s→0.85s→1.27s`). This is what makes the hard cut between a dark chapter (FORMA) and a bright one (VERA) read as a considered exposure change rather than a flash — it is palette-neutral (always `--void`) and does not need per-chapter tinting to work, though a future chapter *could* tint it to its own accent at very low opacity as a refinement — not required.
- **Rack-focus:** incoming image starts at `blur(9px)`, eases to `blur(0)` over 1.2s, offset `t=0.2s` — a soft depth cue, tuned down from an earlier, heavier 14px pass.
- **Text choreography:** `.mask-in` lines wipe up (`yPercent 115→0`, staggered); `.ch-value`/`.ch-note`/`.ch-actions` fade+rise in sequence after. Outgoing text fades out fast (`.22s`) before the wipe starts.
- **Reduced motion:** every duration is wrapped in `D(v)` (`reduced ? 0.001 : v`), driven by `prefers-reduced-motion`. This collapses the whole transition to an effectively instant cut while preserving the same code path (no branching logic to maintain twice).

## 4. Navigation system (shared, chapter-agnostic)

A single consolidated bottom bar, `<nav class="ch-nav">`, replacing Prototype 02's three separate dark circular/pill controls:

```html
<nav class="ch-nav" aria-label="Chapters">
  <button class="ch-nav-arrow ch-nav-prev" id="backBtn" aria-label="Previous chapter" disabled>…</button>
  <div class="ch-nav-index">
    <button class="ch-nav-tick is-current" data-chapter="forma" aria-current="true">01</button>
    <button class="ch-nav-tick" data-chapter="vera">02</button>
    <button class="ch-nav-tick is-soon" data-chapter="ascend" aria-label="…— not yet built">03</button>
    <button class="ch-nav-tick is-soon" data-chapter="meridian" aria-label="…— not yet built">04</button>
  </div>
  <button class="ch-nav-arrow ch-nav-next" id="nextBtn" aria-label="Next chapter">…</button>
</nav>
```

- **No background chips.** Arrows are thin bordered circles (38px, 40px on mobile); ticks are bare numerals with an underline progress indicator (faint for inactive, solid ember for current). A single shared bottom gradient (`.ch-nav::before`, `rgba(5,5,5,.42)→0`, 140px tall) provides contrast insurance on both a dark chapter (FORMA) and a bright one (VERA) — this is why individual controls never need their own background fill or per-chapter color flips.
- **State:** `backBtn` carries the native `disabled` attribute on chapter 1 (not a CSS visibility class) — this is deliberate, so assistive tech announces it as genuinely unavailable rather than merely hidden. `.ch-nav-tick.is-current` + `aria-current="true"` track the active chapter; both are updated in the transition's `onComplete`, not optimistically before the animation finishes.
- **"Coming soon" chapters:** `.ch-nav-tick.is-soon` (lower opacity) is still a real, clickable, keyboard-reachable button — clicking it shows `#soonToast` (centered above the nav bar, auto-dismiss ~1.8s) rather than silently doing nothing or being disabled. This is the pattern ASCEND and MERIDIAN will drop out of once built — their ticks lose `.is-soon` and start participating in `goTo()`'s forward/back logic (currently hard-restricted to `forma`/`vera` only — see §7).

## 5. Responsive rules

- **Breakpoint `max-width:860px`** — the general "mobile" switch: `.chapter-content` re-anchors to `align-items:flex-end` (bottom) for every chapter by default, `.ch-panel` goes full-width, nav bar padding/gaps tighten. VERA additionally re-anchors horizontally to `justify-content:flex-start` (left) on mobile — because its mobile source image (`vera-reception-mobile.jpg`) is a different, taller crop than desktop, and left-anchoring sits it over that crop's own calm area. **This is a VERA-specific choice, not a rule every chapter must follow** — each chapter's mobile anchor should be chosen against its own mobile crop, the same way VERA's was.
- **VERA's mobile image crop fix:** `object-position:58% 46%` on `#veraLayer .chapter-bg img` inside the mobile query. The centered default crop was cutting the real "VERA Clinic" wall sign to within ~10px of its edge at 390px width (verified via `getBoundingClientRect` + pixel-cropped screenshots, not assumption). Shifting the crop's focal point onto the sign — not onto the image's raw geometric center — fixed it without touching the approved source asset. **Any future chapter using a photo where the "hero" subject isn't centered will likely need the same per-chapter `object-position` treatment**, found the same empirical way.
- **Breakpoint `max-width:340px`** — nav-only tightening (gaps, arrow size) for very narrow phones.
- **Combined `max-width:860px and max-height:650px`** — a short-viewport rule, specifically because VERA's mobile crop puts the sign/vase higher in frame *relative to viewport height* on short phones (e.g. 320×568) than on taller ones (390×844) at the same width-based breakpoint. At 568px tall, the same text block that cleared the sign at 844px climbed back into it. Fix: shrink `padding-bottom`, tighten title/value size and margins, and hide `.ch-note` entirely (the persistent top "Concept Work" tag already covers that disclosure globally). **This confirms a general rule for every future chapter: verify both 390×844 and 320×568 independently — width alone does not predict whether a short viewport is safe.**

## 6. Accessibility requirements (shared, chapter-agnostic — do not regress these)

- All nav controls are real `<button>` elements, keyboard-reachable in document order, with `:focus-visible` outlines (global, `2px solid var(--ember)`).
- `ArrowRight`/`ArrowLeft` keys drive `goTo()` directly (document-level listener); this must keep working for any chapter added to `ORDER`.
- `#liveRegion` (`aria-live="polite"`, visually hidden) announces `"<CHAPTER> chapter opened"` on every completed transition — must fire for new chapters too.
- `aria-current="true"` is set/cleared on the active `.ch-nav-tick` in sync with `.is-current`, not just visually.
- `prefers-reduced-motion` is honored for *all* motion in the page (transition timeline, mask reveals, nav hover transitions) via the shared `D()` helper and a dedicated `@media (prefers-reduced-motion: reduce)` block that strips CSS transitions on nav elements too — reduced motion is a first-class state, not an afterthought.
- Each chapter's `aria-label` on its `<section>` must name the actual chapter ("VERA Clinic chapter", not "Chapter 2").
- Touch swipe (left/right, 60px threshold) is a progressive enhancement on top of the same `goTo()` — any new chapter is swipe-navigable for free as long as it's added to the same forward/back logic.

## 7. Guidance for the next phase (ASCEND, MERIDIAN)

What must stay identical: the four-part chapter-layer structure (§1), the transition mechanism (§3), the nav bar (§4), and every accessibility guarantee (§6).

What must NOT be copied verbatim from VERA: the bottom-right text anchor, the Instrument Serif treatment, the coral accent, the specific pixel offsets in §2/§5. Those are VERA's own fit to VERA's own photo — each new chapter needs its own:
- text anchor (pick the chapter's own calm region, not reflexively bottom-right),
- accent color and typographic register (matched to that project's own real standalone demo, not VERA's),
- empirical collision check against its own hero image's actual subject placement, at desktop, 390px, and 320px independently,
- own mobile `object-position` fit if the hero subject isn't centered in its mobile crop.

`goTo()`'s forward/back logic currently hard-codes `forma`/`vera` as the only "real" chapters (anything else shows the soon-toast). Wiring in ASCEND and MERIDIAN means extending `ORDER` and the forward/reverse branching to a 4-chapter sequence — this is shared-framework work, to be done once both chapters' own composition is approved, not before.
