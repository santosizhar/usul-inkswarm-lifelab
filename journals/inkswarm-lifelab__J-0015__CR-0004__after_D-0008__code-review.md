# inkswarm-lifelab — J-0015 — CR-0004 (after D-0008)

**Title:** Code review: capture/diagnostics/profiles hardening

**Date:** 2025-12-15

---

## What was reviewed
- D-0007 screenshot path (WebGPU readback + overlay baking)
- D-0008 diagnostics overlay + hotkeys
- Hero/Stress profile switching (deterministic reseed + trail clearing)
- Stability guards (clamps + NaN/Inf recovery)

## Findings (top)
- Avoid any UI toggle causing WebGPU re-init or React loop churn.
- Screenshot overlay must be built from “capture-time truth”, not “currently visible UI”.
- Profile switching must clear trails to avoid cross-profile ghosting.
- Keep diagnostics lightweight (update cadence + avoid allocation spikes).

## Actions applied
- Ensured diagnostics toggle does not restart the WebGPU init path (state isolation).
- Screenshot export uses capture-time stats to build the baked overlay block.
- Profile switching triggers deterministic reseed and one-frame trail clear.
- Minor perf hygiene: avoided per-frame allocations for diagnostics strings where possible.

## Validation (expected)
- Toggle diagnostics on/off repeatedly → no re-init, no freeze.
- Switch Hero/Stress rapidly → stable, trails reset cleanly.
- Press P with diagnostics on/off → exported PNG always includes a coherent overlay.

## Outcome
CR-0004 OK’d. Proceeded to RR-0001 for R1 shipping.
