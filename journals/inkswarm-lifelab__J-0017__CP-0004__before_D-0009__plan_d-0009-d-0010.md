# inkswarm-lifelab — J-0017 — CP-0004 (before D-0009)

**Title:** Plan D-0009/D-0010 docs + Pages pipeline

**Date:** 2025-12-15

---

## Approved scope
D-0009:
- Rewrite README (portfolio-grade)
- Add docs_src authored docs (architecture, gallery, troubleshooting, pages)
- Keep `/docs` reserved for generated build output

D-0010:
- Configure Vite build output to `/docs` on main
- Base path safe for GitHub Pages
- Add `.nojekyll`
- CI step to verify `docs/index.html` exists after build

## Acceptance tests (agreed)
- D-0009: README contains quickstart, controls, troubleshooting, license note, docs links.
- D-0010: build outputs `docs/index.html` + assets; Pages can serve from main/docs.

CP-0004 OK’d. Implementation begins D-0009.
