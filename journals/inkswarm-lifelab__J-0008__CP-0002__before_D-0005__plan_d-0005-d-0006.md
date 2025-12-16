# CP-0002 — Planning (before D-0005)

## Gate status
- CP-0002 is **OK’d** (user approved).
- Next: implement **D-0005** then **D-0006**, then run **CR-0003** (after 2 deliverables).

## What we are building next (D-0005 → D-0006)
### D-0005 — Ink trails (accumulation)
- Add an offscreen **trail accumulation render target** (ping-pong A/B).
- Add a **decay pass** that fades the previous frame (ink on paper effect).
- Render particles **additively** into the trail target each frame.
- Present the trail target to the swapchain (no “degraded fallback” paths).

### D-0006 — Filmic glow + curated presets
- Add a low-cost **glow pass** (downsample + blur-like taps) from trail target.
- Composite trail + glow in a **present pass** with light tonemapping.
- Add **5 curated presets**:
  - Each preset defines: interaction matrix pattern + palette + trailDecay + glowStrength (+ exposure).
- Add a minimal in-app **preset picker** in the HUD.

## GitHub & releases (explicit)
- Repo is meant to become public **after D-0002** (already reached).
- Practical interpretation in this workflow:
  - I will continue delivering **versioned repo zips** (source-of-truth artifacts here).
  - You publish to GitHub on the cadence rule:
    - push/update **after every 2 deliverables** and **at every release**.
- Next GitHub push opportunity: **after D-0006** (two deliverables completed).
- Versioning intent for this segment:
  - After D-0006 + CR-0003, bump to something like **v0.3.0** (tag + GitHub release), since visuals noticeably change.

## Risks / constraints to watch
- WebGPU-only requirement: keep **fail screen** if unavailable; no CPU/canvas fallback sim.
- Postprocess resource binding: do not sample from the same texture we render into.
- Maintain the wrap/toroidal MVP behavior (already in compute).

## Acceptance checklist
D-0005
- Trails persist and fade over time; motion leaves “ink” streaks.
- Visual looks better than “just points”; not flickery.

D-0006
- Glow is visible but not blown-out.
- Preset picker works (switching changes feel and color).
- Still stable and WebGPU-only.
