# D-0008 — Diagnostics overlay + profiles (Hero/Stress) + stability hardening

## What changed
### Diagnostics overlay (toggle)
- Added **Diagnostics (D)** HUD control and hotkey **D**.
- Overlay shows:
  - FPS (smoothed) and dt
  - preset + profile
  - particles/species/res
  - CPU-side pass timing (encode/submit timing buckets)

### Profiles: Hero vs Stress
- Added **Hero (1)** and **Stress (2)** switches.
- Stress uses a higher active particle count with **pre-allocated buffers** (no buffer re-creation mid-run).
- Profile switch:
  - reseeds particles deterministically
  - clears trail history (no lingering ghost trails)
  - resets time integrator state

### Stability hardening
- Shader-side guards:
  - detect bad state (NaN / huge values) and reseed the particle deterministically
  - clamp acceleration spikes
  - tighter velocity cap (energy-aware)

## How to test
1) `npm install && npm run dev`
2) Press **D** to toggle diagnostics.
3) Press **1/2** to switch Hero/Stress and confirm:
   - the scene resets cleanly
   - ink trails/glow remain coherent
   - no permanent explosions/white-outs occur
4) Press **P** to export a screenshot; verify overlay content.

## Files touched
- `src/gpu/lifelab/sim.ts` (stats, profiles, trail clear on switch)
- `src/gpu/lifelab/wgsl.ts` (guards + clamps)
- `src/ui/OverlayHud.tsx` + `src/styles/app.css` (controls + overlay block)
- `src/app/App.tsx` (hotkeys, overlay state, screenshot overlay content)
- `README.md` (status + controls)

## Notes
- Timing diagnostics are CPU-side encode/submit approximations (not GPU timestamps).
- Stress mode targets stability + visuals; it is not a benchmark mode.
