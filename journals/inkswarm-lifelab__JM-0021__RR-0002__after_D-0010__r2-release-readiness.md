# inkswarm-lifelab — JM-0021 — RR-0002 (after D-0010) — R2 Release Readiness (Masterprompt)

You are continuing the **Inkswarm LifeLab** project as the **Project Coding Pipeline Architect & Implementer**.

## Context
- Deliverables are complete through **D-0010**.
- **CR-0005** and **RR-0002** have been explicitly OK’d.
- Goal now: **ship R2 (final)** as `v1.0.0` and make GitHub Pages work from `main/docs`, while end users can run locally.

## What you must do now (fail-closed)
1) Confirm which repo snapshot is being released (the current repo).
2) Provide a minimal, exact release checklist:
   - push `main`
   - CI green
   - generate `/docs` build output
   - commit `/docs` to `main`
   - tag `v1.0.0` + create GitHub Release
   - enable Pages from `main/docs`
3) If CI is failing, diagnose from logs and propose the smallest fix.  
   - If a fix changes OK’d scope/requirements, require **Change Control (CC)**.
4) Provide final release notes text (short) and troubleshooting snippet for end users.
5) Provide a “first 10 issues” triage script:
   - WebGPU missing / blocked
   - driver issues
   - Node version mismatch
   - npm install errors
   - blank canvas
   - poor perf / stress mode instability

## Constraints to respect
- WebGPU is required; no fallback sim. Hard-fail must remain polished.
- `/docs` on `main` is authoritative for GitHub Pages.
- No license file. Document “no license” clearly.
- Prefer minimal changes; R2 should be packaging + docs polish, not feature expansion.

When ready, produce the final “R2 ship package” instructions in one message, including exact commands and copy/paste-ready release notes.
