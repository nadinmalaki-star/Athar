# Change Log — Athar Lab Industries Showcase

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
