# inkswarm-lifelab — J-0018 — D-0009

**Title:** Docs + gallery scaffolding (portfolio-grade)

**Date:** 2025-12-15

---

## What shipped
- Rewrote `README.md` to be portfolio-grade:
  - requirements (WebGPU-only)
  - quickstart + controls
  - outputs (screenshot/diagnostics)
  - validations (static + CI)
  - Pages workflow overview
  - license + limitations

- Added `docs_src/` authored documentation:
  - `ARCHITECTURE.md`
  - `GALLERY.md`
  - `TROUBLESHOOTING.md`
  - `PAGES.md`
  - `screenshots/.gitkeep`

- Moved `docs/R1_DELIVERY.md` → `docs_src/R1_DELIVERY.md`
  - Rationale: `/docs` is reserved for generated Pages output.

## Files touched
- `README.md`
- `docs_src/**`
- `docs/R1_DELIVERY.md` (moved)

## How to validate
- Open README and confirm links.
- Run `npm run validate:r1` (updated to expect `docs_src/R1_DELIVERY.md`).

## Next
Proceed to D-0010: configure build-to-/docs and CI artifact check.
