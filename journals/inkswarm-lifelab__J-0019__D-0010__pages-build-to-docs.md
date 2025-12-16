# inkswarm-lifelab — J-0019 — D-0010

**Title:** GitHub Pages build-to-/docs on main

**Date:** 2025-12-15

---

## What shipped
- Vite configured to build into `/docs`:
  - `build.outDir = "docs"`
  - `build.emptyOutDir = true`
  - `base = "./"` for subpath hosting (GitHub Pages)

- Added `public/.nojekyll` so Pages serves the built output cleanly.

- Added a Pages artifact check script:
  - `scripts/pages_artifact_check.mjs`
  - `npm run check:pages` verifies `docs/index.html` exists after build

- Updated CI (`.github/workflows/ci.yml`):
  - uses `npm ci`
  - runs build
  - runs pages artifact check

## Files touched
- `vite.config.ts`
- `package.json`
- `public/.nojekyll`
- `scripts/pages_artifact_check.mjs`
- `.github/workflows/ci.yml`

## Acceptance expectations
After running:
```bash
npm install
npm run build
npm run check:pages
```
You should see `docs/index.html` and assets under `docs/assets/`.

## Next
Run CR-0005 (after D-0010) and RR-0002 (for R2) once build/test evidence is available (prefer CI green).
