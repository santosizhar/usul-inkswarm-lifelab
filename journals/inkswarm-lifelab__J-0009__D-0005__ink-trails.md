# D-0005 — Ink trails (accumulation)

## Outcome
We now render into an offscreen **trail buffer** and fade it each frame. Particles “paint” into it additively, producing persistent **ink/brush-like streaks** instead of ephemeral points.

## What changed
### GPU pipeline additions
- Added **trail ping-pong textures (A/B)**:
  - Each frame: decay `trailSrc` → `trailDst`, then render particles into `trailDst`, then present.
- Added postprocess shaders and pipelines:
  - `vs_fullscreen` + `fs_decay` to multiply previous trails by a decay factor.
  - A present pipeline is now responsible for final swapchain output (instead of particles directly).

### Render pass order (per frame)
1) Compute: clear grid counts → build grid → simulate
2) Render:
   - **Decay pass**: `trailSrc` sampled, output to `trailDst`
   - **Particles pass**: additive blend into `trailDst`
   - (Glow is added in D-0006; present is already in place)

### Important correctness fix
- Updated pipeline layouts + `setBindGroup(...)` indices to match WGSL groups:
  - Compute uses **group(0)**
  - Particle render uses **group(1)**
  - Postprocess uses **group(2)**

## Known limits / notes
- Trail format is `rgba8unorm` for broad compatibility.
- Visual tuning knobs are exposed via upcoming preset work (D-0006).

## Acceptance checklist
- ✅ Trails persist across frames
- ✅ Trails fade smoothly (ink decay)
- ✅ Motion produces visible streaks
- ✅ Still WebGPU-only (no fallback sim)
