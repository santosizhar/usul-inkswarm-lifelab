# D-0006 — Filmic glow + curated presets

## Outcome
The visual stack is now:
- **Ink trails** (accumulation + decay)
- **Soft glow** (cheap blur/downsample)
- **Filmic-ish present** (tonemap + gamma)
Plus a **preset system** with a HUD picker (5 curated looks).

## What changed
### Glow pass
- Added a low-cost glow pass:
  - Render fullscreen into a half-res `glowTex`
  - Sample the trail buffer with a small 9-tap kernel (acts like blur + downsample)
  - Square the accumulated color slightly to emphasize highlights

### Present composite
- Present pass now composites:
  - `trail + glow * glowStrength`
  - then applies a small tonemap curve and gamma for display

### Presets (5)
Each preset sets:
- interaction matrix pattern (deterministic, seeded)
- palette (curated)
- trailDecay, glowStrength, exposure

Presets shipped:
1) Ink Vortex
2) Neon Kelp
3) Predator Bloom
4) Quiet Nebula
5) Chaos Inkstorm

### UI picker
- HUD now includes clickable pill buttons to swap presets live.

## Acceptance checklist
- ✅ Glow visible (but tunable via preset)
- ✅ Preset switching works (feel + color changes)
- ✅ Still WebGPU-only
