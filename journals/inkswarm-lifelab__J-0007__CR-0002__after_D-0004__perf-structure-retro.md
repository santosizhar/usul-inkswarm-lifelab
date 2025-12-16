# CR-0002 — Retro + code review (after D-0004)

## What I reviewed
- Frame loop allocations and perf cliffs.
- Pipeline/bind group usage patterns.
- Shader/host coupling (layout, constants, MAX_SPECIES).
- Failure modes (kept fail-closed).

## 15 things that would improve speed/results/tradeoffs
1) Avoid per-frame bind group creation (major).
2) Reduce per-frame `performance.now()` calls.
3) Move constants (MAX_SPECIES/gridDim/cellCap) into one place.
4) Add small CPU-side sanity checks (buffer sizing, speciesCount <= MAX_SPECIES).
5) Add a single Playwright “boot” smoke test (later).
6) Add a quick “seed randomize” button (later).
7) Add a “pause” toggle (later).
8) Use a separate accumulation target for trails (D-0005).
9) Introduce postprocess pipeline layout separation (D-0006).
10) Add a lightweight perf HUD (D-0008).
11) Consider larger cellCap for higher N (tunable).
12) Add overflow counter for dropped particles (debug).
13) Consider half precision packing for perf later.
14) Add validation error scopes around pipeline creation (optional).
15) Add a deterministic “preset” system for interaction matrices (D-0006 presets phase).

## 10 things that are still excellent
- Fail-closed WebGPU requirement remains strict.
- Deterministic seeding exists.
- Shader is compact and readable.
- Toroidal delta uses shortest-vector semantics.
- Grid binning is capped and bounded.
- Render path is minimal but informative.
- Layout is modular (`src/gpu/lifelab/*`).
- Journaling cadence is consistent.
- Clear separation between boot and sim.
- Defaults are sensible for MVP.

## 5 things to make it more elegant/polished
- Persistent bind groups (do it now).
- Tighten HUD phrasing.
- Reduce redundant state updates.
- Add clearer comments on layout/stride.
- Small naming cleanup.

## Changes applied (this CR)
✅ **Persistent bind groups**: removed per-frame bind group allocation by creating:
- `simBG_AB`, `simBG_BA`
- `renderBG_A`, `renderBG_B`
and toggling a `pingAB` flag each frame.

This is the most direct measurable perf win at this stage.

## Outcome
- CR-0002 improvements are applied.
- Ready to proceed to CP before D-0005 (ink trails) when requested.
