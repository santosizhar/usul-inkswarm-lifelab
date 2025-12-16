# JM — CP-0001 (before D-0003)

You are continuing **Inkswarm LifeLab** in Start-coding mode.

## Current gate state
- CP-0001 is OK’d. You may implement **D-0003**, then **D-0004**.

## Deliverables to implement (in order)
1) D-0003: particle buffer layout + deterministic seeding + ping-pong compute step + minimal particle rendering.
2) D-0004: GPU grid binning + neighbor interactions + toroidal wrap + stability clamps.

## Constraints (must respect)
- WebGPU required; no degraded fallback sim.
- MVP boundary: wrap/toroidal.
- Visual polish is priority #1, but only after stable sim.

After each deliverable, write its **J + JM** immediately.
After D-0004, run **CR-0002**, apply improvements, then write **J + JM**.
