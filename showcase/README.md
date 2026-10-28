# Athar Lab — Industries Showcase

Local-only build. Nothing in this folder has been deployed or linked from the live site.

## Run it locally

The flagship WebGL entrance loads `three`/`gsap` from absolute `/vendor/...` paths and `showcase/js/flagship-scene.js` via `/showcase/js/...`, matching studioathar.studio's own convention — so the server must be started from the **repository root**, not from inside `showcase/`:

```bash
cd Athar
python3 -m http.server 8010
```

Then open `http://localhost:8010/showcase/index.html`. (Starting the server from inside `showcase/` will 404 every `/vendor/...` request and silently fall back to the sector grid — if you see no cinematic entrance, this is the first thing to check.)

No build step, no npm install — every page is a single self-contained HTML file, same approach as FORMA V10 and the production `index.html`. `vendor/three/0.186.1/` and `vendor/gsap/3.12.5/` are pinned, self-hosted, pre-existing/added vendor builds (see each folder's `VENDOR.md`), not a live CDN dependency.

## What's here

- `index.html` — the Athar-branded showcase: a cinematic WebGL entrance through four industry "worlds" (desktop/motion-capable visitors), falling back to a real interactive sector grid (mobile, reduced-motion, no-WebGL) — pick a sector, preview it, open its full demo. Bilingual EN/AR (`#langToggle`, top right).
- `demos/forma/`, `demos/vera-clinic/`, `demos/ascend-academy/`, `demos/meridian-partners/` — the four working sector demos.
- `js/flagship-scene.js` — the flagship entrance's Three.js/GSAP module (procedural geometry, no external 3D assets).
- `dev/flagship-test.html` — a dev-only fidelity harness for `flagship-scene.js` in isolation (not linked from anywhere user-facing).
- `assets/sector-previews/` — the texture images (`*-tex.jpg`, downscaled for WebGL) and full-res photos the flagship scene and sector grid use.
- `_master-backups/` — the protected, untouched FORMA V10 original, plus the patch script for its two approved image fixes.
- `MIGRATION.sql` — optional, not applied (see CHANGELOG.md).
- `CHANGELOG.md` — what was built/changed, and the current blockers.
- `QA-REPORT.md` — what was tested and how, with results.
- `DESIGN-RESEARCH.md` — the competitive research behind the creative decisions, including an honest note on what was and wasn't directly observable (e.g. a reference site stuck at its own loader during testing).

## Finishing the FORMA fix once unblocked

```bash
cd showcase/_master-backups
python3 patch_forma.py /path/to/hero2_replacement.jpg /path/to/bathroom_replacement.jpg
```

This writes the corrected file straight to `../demos/forma/index.html`, touching only the two approved images; `FORMA_V10_master.html` in this same folder stays untouched as the permanent backup.

## Deploying

Not done — per the brief, nothing here should reach production without explicit sign-off. When you're ready, the open question is where this lives: merged into the existing `athar-lab` Vercel project (this repo only contains `studioathar.studio`'s own source — `athar-lab.vercel.app` is a separate project this session has no access to), or deployed as its own preview. Happy to help with either once you've decided.
