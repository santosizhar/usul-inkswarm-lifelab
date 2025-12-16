# inkswarm-lifelab — J-0016 — RR-0001 (R1)

**Title:** Release readiness: v0.0.1 shareable demo

**Date:** 2025-12-15

---

## Release target
- **R1 / v0.0.1** — shareable demo intended to be run locally by end users.

## Readiness checklist
- WebGPU-only hard fail: ✅ (no fallback sim)
- Visual stack: ✅ trails → glow
- Presets: ✅ curated set available
- Screenshot export: ✅ PNG with baked overlay
- Diagnostics overlay: ✅ toggleable
- Hero/Stress profiles: ✅ deterministic + trail clear on switch
- Versioning: ✅ package.json version set, changelog present
- License: ✅ “no license” stated (no LICENSE file)

## Validation strategy without local execution
- Static checks: `npm run validate:r1`
- CI proof: GitHub Actions runs install → validate:r1 → build → tests

## Ship instructions (summary)
1) Push to GitHub (main)
2) Ensure CI green
3) Tag `v0.0.1` and create GitHub Release
4) Provide local-run instructions in release notes

RR-0001 OK’d. R1 shipped.
