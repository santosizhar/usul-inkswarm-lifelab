# inkswarm-lifelab — J-0021 — RR-0002 (after D-0010) — R2 Release Readiness

**Date:** 2025-12-15  
**Ceremony:** RR-0002 (Release Readiness)  
**Trigger:** After D-0010 (final deliverable)  
**Decision:** ✅ OK’d by user — proceed to ship R2

---

## 1) Release target

- **Release:** R2 “Final Version”
- **Recommended tag:** `v1.0.0`
- **Distribution model:** GitHub repo + GitHub Release + GitHub Pages served from `main/docs`
- **Runtime:** End users run locally via Node (dev server or build preview)

---

## 2) Readiness validations completed (no local run required)

These validations are available **without** relying on manual local execution of the full app:

- **Static readiness validation (Node-only):**
  - `npm run validate:r1`
  - Checks for key R1/R2 invariants (WebGPU-only, screenshot, diagnostics, profiles, no license, docs structure).
- **Pages artifact check:**
  - `npm run check:pages`
  - Confirms `docs/index.html` exists after build.

- **CI as authoritative proof (GitHub Actions):**
  - `npm ci`
  - `npm run validate:r1`
  - `npm run build`
  - `npm test`
  - `npm run check:pages`

**RR stance:** CI green + pages artifact present is acceptable readiness evidence even if the maintainer does not run locally.

---

## 3) Remaining actions to actually ship R2

### A) Push the repo (main)
- Push `main` (this is also consistent with “push every 2 deliverables and at every release”).

### B) Obtain `/docs` build output on `main`
Because Pages serves `main/docs`, the compiled assets must exist in the repo:
- Option 1: **Codespaces** (recommended)
- Option 2: any machine that can run Node (teammate/CI runner if using a commit step)
- Option 3: maintainer local build

Commands:
```bash
npm ci
npm run build
npm run check:pages
git add docs
git commit -m "Build: publish GitHub Pages artifact to /docs"
git push
```

### C) Tag + Release
```bash
git tag v1.0.0
git push origin v1.0.0
```

Then create a GitHub Release titled:
- `Inkswarm LifeLab — R2 (v1.0.0)`

---

## 4) Release notes (draft)

**Inkswarm LifeLab — R2 (v1.0.0) — Final Version**
- WebGPU-only, fail-closed hard-fail screen (no fallback sim)
- Toroidal wrap boundary
- Ink trails + filmic glow + curated presets
- PNG screenshot export including HUD + diagnostics
- Diagnostics overlay with timings
- Hero/Stress profiles + stability clamps
- GitHub Pages build-to-`/docs` on `main` (repo Pages-ready)
- CI validations: build/test/pages artifact checks

**Run locally**
1) Install Node 18+ (20+ recommended)
2) `npm install`
3) `npm run dev`
4) Open the local URL shown in the terminal

Hotkeys: **P** screenshot · **D** diagnostics · **1/2** hero/stress

**License:** No license yet (all rights reserved by default).

---

## 5) Known constraints (communicate clearly)
- Requires a WebGPU-capable browser (recent Chrome/Edge recommended).
- This is an aesthetic/engineering demo (“toy sim”); not physically accurate.
- Performance depends heavily on GPU + driver + browser.

---

## 6) RR-0002 closure
✅ RR-0002 is closed (user OK). Next step is operational: ship `v1.0.0` following the checklist above.
