# QA Report — Athar Lab Industries Showcase

All testing below was done against a real locally rendered build (`python3 -m http.server`) driven by Playwright/Chromium (`/opt/pw-browsers/chromium`, headless), not by reading source or generating mockup images. Screenshots referenced are real browser captures, saved under the scratchpad's `qa/` folder (paths given per section — ask if you want them copied into the repo).

## 1. Showcase shell (`index.html`)

Tested at 1440×900 (desktop) and 390×844 (mobile).

- ✅ Editorial opening renders, reveal-on-scroll animations fire correctly.
- ✅ 4-sector accordion: opening one closes the others; chevron rotates; `aria-expanded` toggles correctly; each panel's gradient visual + copy + CTA render.
- ✅ Offer section (₪2,190, scope list, terms) renders correctly at both widths.
- ✅ Real inquiry form: all fields render, select dropdowns styled correctly, empty-submit validation blocks with a message, honeypot field present and hidden from AT (sighted and screen-reader users) alike.
- ✅ **End-to-end navigation**: clicked "Open full demo" on all 4 sectors from a live showcase page; each opened its target page in a new tab with the correct `<title>`, zero console/page errors, and a working `../../index.html#showcase` back-link.
- ⚠️ The real inquiry form's submit path could not be exercised end-to-end in this sandboxed test environment specifically because its Supabase client library is loaded from `cdn.jsdelivr.net`, which this session's network policy blocks (confirmed via Playwright network logging — a sandbox-only restriction, not a production issue; `index.html`'s own contact form depends on the same CDN and already works live). Field-level validation was verified directly; the insert call itself was verified by code review against the exact pattern `index.html` already uses in production, not by firing a live submission (to avoid writing test rows into Athar's real `projects_inquiries` table).

## 2. FORMA (`demos/forma/index.html`)

- ✅ Confirmed byte-for-byte identical to the originally supplied V10 file (md5 `2133479c65479cf4fcde56f69a0e42eb`, matches both the first upload and the zip from the second message).
- ✅ Opens cleanly from the showcase, 0 console errors.
- ❌ **The two approved image corrections are not yet applied** — blocked on image sourcing (see CHANGELOG § Blockers). Confirmed present and unchanged: hero slide 2's embedded-screenshot flaw, and the bedroom-not-bathroom photo (with its ELE watermark) in both its reused locations.
- ✅ Everything else audited and confirmed untouched: hero slides 1 & 3, kitchen/living photography, gallery + lightbox, 4-step process accordion, consultation funnel, footer, `prefers-reduced-motion` handling.

## 3. VERA Clinic (`demos/vera-clinic/index.html`)

Built and self-tested by a sub-agent; I independently re-opened it from the live showcase and confirmed 0 console/page errors and a correct back-link.
- ✅ Hero, 4-way service selector (content genuinely swaps on click, confirmed via DOM text), fictional practitioner section (explicitly labeled fictional), approach section, appointment form.
- ✅ Form: blocks empty submit with a real error; valid submit shows an explicit "this is a demo — no real appointment was created" message; no network call fired.
- ✅ `prefers-reduced-motion: reduce` verified — all reveal elements render immediately, no transitions.
- ✅ One real bug was found and fixed during build: the "back to Athar" element initially overlapped the clinic's own logo; rebuilt as a non-overlapping top strip and re-verified at both breakpoints.

## 4. ASCEND Academy (`demos/ascend-academy/index.html`)

Built and self-tested by a sub-agent; independently re-opened and confirmed 0 errors, correct back-link.
- ✅ Hero + ticker, 4-tab keyboard-navigable program selector (content swaps correctly), 5-step learning-pathway accordion, schedule grid, enrollment form.
- ✅ Form: empty-submit blocked, valid submit shows explicit demo-only confirmation, no backend call.
- ✅ `prefers-reduced-motion: reduce` verified (`transitionDuration` forced to `0s` across all animated elements).
- ✅ Zero photography used anywhere — avoids the image-sourcing blocker entirely by design (typography/grid/ticker-driven visual system).

## 5. MERIDIAN Partners (`demos/meridian-partners/index.html`)

Built and self-tested by a sub-agent; independently re-opened and confirmed 0 errors, correct back-link.
- ✅ Hero with abstract SVG line-art, 4-line service selector (content swaps correctly), "challenges we solve" cards, 4-step process, quotation form (company/service/budget/timeline/scope).
- ✅ Form: empty-submit blocked, valid submit shows explicit demo-only confirmation, no fabricated client logos/case studies/figures anywhere.
- ✅ One real bug found and fixed during build: the "Back to Athar" chip overlapped the nav wordmark at all widths; integrated into the nav flex layout instead, re-verified at both breakpoints.

## 6. Cross-cutting checks

| Check | Result |
|---|---|
| All 4 sector links from the showcase resolve and load | ✅ |
| Each demo's "back to Athar" link resolves to the real showcase | ✅ |
| No broken `<img>` paths anywhere (VERA/ASCEND/MERIDIAN use none; FORMA's existing ones untouched) | ✅ |
| Console/page errors across all 5 pages (showcase + 4 demos) | **0** (excluding the sandbox-only `cdn.jsdelivr.net` block, and a benign favicon 404 on one demo) |
| `prefers-reduced-motion` respected | ✅ on all 4 demos + showcase |
| Desktop (1440px) and mobile (390px) checked | ✅ on all 5 pages |
| Fictional brands disclose they're fictional / demo-only where the brief requires it | ✅ (VERA's practitioner + stats footnote, all 3 forms' submit messages) |
| Real ATHAR homepage / production files modified | **No** — nothing outside `showcase/` touched |
| Database migration applied | **No** — prepared only, per instruction |

## Known gaps (explicit, not silently dropped)

- FORMA's two approved image fixes: blocked on network/image-sourcing access (see CHANGELOG).
- Keyboard-only (no mouse) traversal was spot-checked (focus rings, ARIA states) but not exhaustively walked tab-by-tab on every interactive element across all 5 pages.
- Lighthouse/performance scoring was not run (QA here is functional + visual + console-error based, per the brief's own checklist); nothing in the build suggests a performance problem (no large media, no heavy libraries), but it hasn't been measured.
- The real inquiry form's live Supabase insert was verified by code review, not an actual fired submission (see § 1).
