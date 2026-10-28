# Athar Lab — Industries Showcase

Local-only build. Nothing in this folder has been deployed or linked from the live site.

## Run it locally

```bash
cd showcase
python3 -m http.server 8010
```

Then open `http://localhost:8010/index.html`.

No build step, no dependencies to install — every page is a single self-contained HTML file (same approach as the existing FORMA V10 and the production `index.html`).

## What's here

- `index.html` — the Athar-branded showcase: pick a sector, preview it, open its full demo.
- `demos/forma/`, `demos/vera-clinic/`, `demos/ascend-academy/`, `demos/meridian-partners/` — the four working sector demos.
- `_master-backups/` — the protected, untouched FORMA V10 original, plus the patch script for its two approved image fixes.
- `MIGRATION.sql` — optional, not applied (see CHANGELOG.md).
- `CHANGELOG.md` — what was built/changed, and the current blockers.
- `QA-REPORT.md` — what was tested and how, with results.

## Finishing the FORMA fix once unblocked

```bash
cd showcase/_master-backups
python3 patch_forma.py /path/to/hero2_replacement.jpg /path/to/bathroom_replacement.jpg
```

This writes the corrected file straight to `../demos/forma/index.html`, touching only the two approved images; `FORMA_V10_master.html` in this same folder stays untouched as the permanent backup.

## Deploying

Not done — per the brief, nothing here should reach production without explicit sign-off. When you're ready, the open question is where this lives: merged into the existing `athar-lab` Vercel project (this repo only contains `studioathar.studio`'s own source — `athar-lab.vercel.app` is a separate project this session has no access to), or deployed as its own preview. Happy to help with either once you've decided.
