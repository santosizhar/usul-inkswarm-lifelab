# D-0003 — Seeded particles + ping-pong compute scaffold

## Goal
Introduce the first real “life lab” loop:
- deterministic seeded initialization
- GPU storage buffers for particles
- compute step with ping-pong buffers
- minimal particle rendering (no trails/glow yet)

## What changed
### New GPU sim module
- Added `src/gpu/lifelab/wgsl.ts` with:
  - `Particle` layout
  - compute entry point(s)
  - particle render vertex/fragment
- Added `src/gpu/lifelab/sim.ts`:
  - `createLifelabSim()` constructs buffers + pipelines
  - seeded particle init on CPU → uploaded to GPU
  - per-frame compute + render

### App wiring
- `src/app/App.tsx` now boots WebGPU and runs the sim loop instead of the placeholder fullscreen renderer.
- HUD now shows seed + particle/species counts.

## Verification checklist
- App boots on WebGPU-capable browsers.
- Particles visibly render and move.
- Behavior is deterministic given the same seed.

## Notes
- D-0004 will add spatial grid + neighbor interactions + toroidal wrap and tighter stability clamps.
