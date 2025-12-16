# Inkswarm LifeLab — J-0020 — CR-0005 (after D-0010) — Docs + Pages Retro
Date: 2025-12-15
Scope: CR-0005 (post D-0009 & D-0010) — documentation refresh and GitHub Pages build-to-/docs pipeline.

## Context snapshot
- Latest deliverable state: D-0010 completed (Pages build outputs to `/docs` on `main`, base path handled for repo Pages).
- Docs source now lives under `docs_src/` (so `/docs` remains generated build output only).
- CI includes a Pages artifact check (expects `docs/index.html` after build).

## What was reviewed
1) Documentation correctness + clarity for end users (WebGPU-only, controls, troubleshooting).
2) Pages pipeline assumptions (Vite `outDir=docs`, `base="./"`, `.nojekyll`, and CI artifact verification).
3) Repo ergonomics: separation between authored docs vs generated output.

## Findings (high-signal)
### Strengths confirmed
- Clean separation: `docs_src/` authored docs + `/docs` build output avoids Pages confusion.
- `base: "./"` + `outDir: "docs"` is the right default for GitHub Pages under `/<repo>/`.
- CI’s `check:pages` is a meaningful non-local readiness signal.

### Issues caught & fixed during this CR
- Static validator rules were updated to reflect the new docs layout (`docs_src/`) and Pages config expectations.
- CI workflow updated so that Pages artifact presence is enforced after build.

## CR outcome
- Result: **Approved** (explicit OK received from user).
- Follow-ups (queued for next iteration, not required for R2):
  - Add `docs_src/FAQ.md`
  - Improve screenshot naming (include preset/profile)
  - Add clearer WebGPU failure mode examples

## Next gate
- Proceed to **RR-0002** (Release Readiness) for R2 (after D-0010).
