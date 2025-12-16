# D-0004 — Spatial grid + neighbor interactions + toroidal wrap

## Goal
Upgrade the sim from “drift” to emergent interaction:
- spatial grid binning on GPU
- neighbor interactions (local radius)
- wrap/toroidal boundary (MVP behavior)
- stability clamps (avoid blow-ups)

## What changed
### GPU grid binning
- Added `cellCounts` (atomic u32) and `cellSlots` buffers.
- Added compute passes:
  - `cs_clearCounts`: clears all cells each frame
  - `cs_buildGrid`: bins each particle into a cell list (bounded by `cellCap`)

### Neighbor interactions + toroidal wrap
- `cs_simulate` now:
  - loops over 3×3 neighbor cells
  - applies attraction/repulsion based on a host-provided interaction matrix
  - uses toroidal shortest-vector delta for forces
  - wraps position back into [0,1] on integration

### Stability clamps
- dt clamped on host.
- velocity clamped in shader.
- mild damping + safe eps on distance.

## Verification checklist
- Particles stay in-bounds via wrap (no “lost particles”).
- Patterns emerge (clumps/streams) without exploding to NaNs.
- No crashes; fail-closed still handles GPU errors.

## Notes
- This completes the CP-0001 planned scope. Next: CR-0002 (required cadence).
