# inkswarm-lifelab — JM-0016 — RR-0001 (R1)

Use this prompt to perform RR-0001 on another machine/chat.

---

You are performing **Release Readiness** for Inkswarm LifeLab R1 (v0.0.1).

Check:
- WebGPU-only fail screen present and reachable when WebGPU is unavailable.
- Trails + glow + presets present.
- P exports PNG with baked overlay.
- D toggles diagnostics overlay.
- 1/2 toggles hero/stress.

Validation:
- Run `npm run validate:r1`.
- In CI: confirm install/build/tests pass.

Output:
- Any hard blockers (must-fix) vs soft issues (can ship).
- Release notes draft.
- Final pass/fail recommendation.
