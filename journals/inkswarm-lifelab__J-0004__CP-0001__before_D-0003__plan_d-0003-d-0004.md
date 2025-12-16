# CP-0001 — Planning Ceremony (before D-0003)

## Gate
- Status: **OK’d by user** (“OK CP-0001”)
- Scope covered: **D-0003 + D-0004** (next two deliverables)

## Context refresh
- WebGPU boot + fail-closed hard-fail screen are already implemented (D-0002).
- Next step is the real simulation backbone: particle buffers, compute step, and minimal render loop.
- MVP boundary behavior must be **wrap/toroidal**.
- Visual polish remains priority #1, but we must reach stable emergent motion first.

## Scope (next two deliverables)
### D-0003 — Core buffers + ping-pong compute scaffold
- Define `Particle` layout (pos/vel/species/energy/size).
- Seeded deterministic initialization.
- Compute pass updates particles using ping-pong buffers.
- Minimal particle render (read storage buffer in vertex shader).

### D-0004 — Spatial grid + neighbor interactions + wrap boundary
- Uniform grid binning on GPU (cell counts + per-cell index list).
- Neighbor loops on 3×3 cells (bounded by cell capacity).
- Interaction matrix drives attraction/repulsion.
- Toroidal wrap for both integration and neighbor deltas.
- Stability clamps (dt clamp, velocity clamp, mild damping).

## Acceptance tests
- D-0003: particles move deterministically from a seed; no crashes; visible particles render.
- D-0004: interaction patterns emerge; wrap boundary is clearly in effect (particles re-enter smoothly).

## Risks & mitigations
- Validation/device errors → fail-closed surface via existing hard-fail screen.
- Perf cliffs → start with moderate N; grid bins cap neighbor loops.
- Numerical explosions → clamp dt/forces/velocity; avoid divide-by-zero with eps.

## Notes
- D-0004 will trigger **CR-0002** immediately afterward (cadence rule).
