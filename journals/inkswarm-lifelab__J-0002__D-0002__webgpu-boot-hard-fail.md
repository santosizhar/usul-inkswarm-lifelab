# inkswarm-lifelab — J-0002 — D-0002 — webgpu-boot-hard-fail

Date: 2025-12-15
Deliverable: D-0002
Status: Implemented

## Goal
Initialize WebGPU on the main canvas with robust error handling, and **hard-fail** (polished explanation screen) when WebGPU is unavailable or crashes.

## What shipped
- WebGPU boot path (`navigator.gpu` → adapter → device → `canvas.getContext("webgpu")` → configure).
- Placeholder render loop (fullscreen triangle) to prove the GPU pipeline is live.
- Polished hard-fail screen overlay with actionable troubleshooting steps.
- Device error hooks:
  - `device.addEventListener("uncapturederror", …)` → fail-closed.
  - `device.lost.then(…)` → fail-closed.
- Canvas DPR resize sync via `configureCanvas()`.

## Key files
- `src/gpu/webgpu.ts` — init + resize/config helper.
- `src/gpu/renderer.ts` — placeholder pipeline + renderFrame().
- `src/app/FailScreen.tsx` — hard-fail UI.
- `src/app/App.tsx` — boot orchestration + render loop + HUD state.
- `src/styles/app.css` — fail-screen styling.
- `package.json`, `tsconfig.json` — add `@webgpu/types`.

## Manual validation checklist (expected)
1) Browser supports WebGPU → app shows:
   - HUD: “WebGPU ready”
   - Subtle gradient background (placeholder render)
2) Browser lacks WebGPU / blocked → app shows:
   - “WebGPU Unavailable” fail card
   - No fallback simulation
3) Force an error (e.g., break WGSL) → uncapturederror triggers → fail screen.

Notes:
- Full automated tests are planned later (Vitest/Playwright are already in deps), but this deliverable is intentionally focused on boot reliability and the fail-closed behavior.

## Next
- Implement D-0003: core particle buffers + ping-pong compute scaffolding.
- BEFORE D-0003 we must run CP (planning) per process.
