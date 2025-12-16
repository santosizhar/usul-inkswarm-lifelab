# Code Freeze — CF-0001 (Inkswarm LifeLab)

**Date:** 2025-12-15  
**Project:** Inkswarm LifeLab (`inkswarm-lifelab`)  
**Frozen version:** **v1.0.0** (R2)  
**Purpose:** produce a coherent, restartable snapshot with docs audit, status ledger, and a restart masterprompt.

---

## What is DONE
- Deliverables complete through **D-0010**
  - WebGPU boot + fail-closed hard-fail screen
  - Toroidal wrap boundary simulation core
  - Ink trails + glow + curated presets
  - PNG screenshot export including HUD/diagnostics overlay
  - Diagnostics overlay + hero/stress profiles + stability guards
  - Docs system (`docs_src/`)
  - GitHub Pages build configured to output to **/docs** on `main`
  - CI checks for build/tests and Pages artifact existence

- Ceremonies complete through **RR-0002**
  - CP/CR/RR journals included under `/journals`

---

## What is STILL PENDING (real-world ops)
These require Git hosting / execution environment and cannot be fully “done” inside the zip:

1) **Git tags & Releases**
- If you haven’t created tags yet, you can do it retroactively:
  - R1: `v0.0.1`
  - R2: `v1.0.0`
See `docs_src/GIT_WORKFLOW.md`.

2) **GitHub Pages publish artifact**
- Pages serves from `main/docs`. The `/docs` folder must contain a built site.
- Generate it in **Codespaces / CI / local**, then commit `/docs` to `main`.

---

## How to resume work
### Recommended next actions (order)
1) Push repo to GitHub (if not already).
2) Ensure CI is green.
3) Build Pages artifact to `/docs`, commit it, enable Pages.
4) Retro-tag R1 (`v0.0.1`) if missing; tag R2 (`v1.0.0`) and create Releases.

### Validation commands
```bash
npm install
npm run validate:r1
npm test
npm run build
npm run check:pages
```

---

## Repo map (high-level)
- `src/` — app + WebGPU sim + UI overlay
- `docs_src/` — authored docs (source of truth)
- `docs/` — build output target for GitHub Pages
- `journals/` — ceremony + deliverable logs and restart prompts
- `.github/workflows/` — CI pipeline

---

## Known constraints
- WebGPU required (no fallback).
- Visual fidelity prioritized over strict physics.
- Some GPU environments (remote desktop / virtual GPUs / corporate policy) may block WebGPU; see `docs_src/TROUBLESHOOTING.md`.

---

## Restart prompt
Use: `inkswarm-lifelab__MASTERPROMPT_6__Code-Freeze-Restart.md`
Attach this repo zip when starting a new chat.
