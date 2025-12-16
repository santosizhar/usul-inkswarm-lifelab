# CP-0003 — Change Plan (before D-0007)

## Trigger / context
After D-0006 (trails + glow + presets), the MVP scope requires:
- a **PNG screenshot export** that bakes a **HUD + diagnostics overlay**
- a **diagnostics overlay** in-app (toggleable)
- a **profile switch** (Hero vs Stress) that stays stable and visually polished
- strict WebGPU-only behavior (no degraded fallback sim)

This CP covers **D-0007** and **D-0008** implementation plan.

## Plan (deliverables)
### D-0007 — Screenshot export (PNG) with HUD + diagnostics overlay baked in
- Add a **Screenshot** control in the HUD and a hotkey (**P**).
- Implement a WebGPU readback path:
  - configure swapchain with `COPY_SRC`
  - `copyTextureToBuffer` from the current swapchain texture
  - handle `bytesPerRow` 256-byte alignment and strip padding
- Compose the exported PNG in a 2D canvas:
  - draw captured frame
  - draw a minimal, defensible overlay block (title + preset/profile + basic stats)
- Name output with project/profile/preset/timestamp.

**Acceptance checks**
- Pressing **P** downloads a PNG.
- The PNG clearly includes overlay text (HUD/diag block).
- No “fallback” behavior is introduced when WebGPU is unavailable.

### D-0008 — Diagnostics overlay + profile switch + stability hardening
- Add **Diagnostics** overlay toggle (HUD button + hotkey **D**).
- Add **Hero / Stress** profile buttons (hotkeys **1 / 2**):
  - Hero: default particles
  - Stress: higher particles (pre-allocated buffers; no mid-run reallocation)
  - Reset + clear trail history on profile switch (no ghost trails)
- Add stability guards (fail-closed, non-crashing):
  - dt clamp already on CPU, extend with shader-side “bad state” detection
  - clamp acceleration spikes + velocity cap
- Expose lightweight timing diagnostics (CPU encode timings) in the overlay.

**Acceptance checks**
- Diagnostics overlay toggles instantly without breaking perf.
- Hero/Stress switch resets coherently and stays stable (no NaNs, no white-outs).
- Stress mode remains visually coherent (ink trails + glow) even at higher load.

## Files expected to change
- `src/gpu/webgpu.ts` (swapchain usage)
- `src/gpu/lifelab/sim.ts` (capture, stats, profiles)
- `src/gpu/lifelab/wgsl.ts` (stability guards)
- `src/app/App.tsx` (hotkeys, overlay state, screenshot composition)
- `src/ui/OverlayHud.tsx` + `src/styles/app.css` (controls + diagnostics block)
- `README.md` (update status + controls)

## Next ceremonies queued (gated)
After D-0008:
- **CR-0004** (after D-0008) — retro + polish pass
- **RR-0001** (before R1; after D-0008) — release-readiness review
