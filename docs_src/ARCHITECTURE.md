# Architecture (high level)

This project is deliberately “honest toy engineering”: simple dynamics, strong guardrails, and a clean rendering pipeline.

## Runtime pipeline (per-frame)

1. **Sim compute (WebGPU compute pass)**
   - Reads particle buffer A → writes particle buffer B (ping-pong).
   - Applies:
     - neighbor interactions (grid/binning)
     - toroidal wrap boundary
     - stability clamps (dt/force/velocity) + NaN/Inf recovery

2. **Trail accumulation**
   - Writes particles into a trail texture (ping-pong trail buffers).
   - Applies decay (fade) to preserve motion history.

3. **Glow**
   - Downsample + blur-ish pass (cheap bloom) to soften highlights.

4. **Present**
   - Composites trails + glow into the final frame.

## Data model

### Particles
Each particle carries:
- position (xy)
- velocity (xy)
- species id
- energy (drives size/brightness)
- size (derived; visual + mild dynamics)

### Species interactions
- A species interaction matrix defines attraction/repulsion between species pairs.
- Presets provide different matrices and visual parameters.

### Profiles
- **Hero**: stable default particle count + tuned parameters
- **Stress**: higher active particle count to pressure-test stability/perf

Switching profile triggers:
- deterministic reseed
- trail clear (avoid cross-profile ghosting)

## Failure policy (fail-closed)
- WebGPU is required.
- If adapter/device/context init fails, show a polished fail screen.
- No degraded fallback sim is provided.

## Where to look in code
- `src/gpu/lifelab/` — sim + WGSL + pipelines
- `src/ui/OverlayHud.tsx` — HUD, controls, diagnostics
- `src/app/App.tsx` — orchestration, hotkeys, screenshot export
