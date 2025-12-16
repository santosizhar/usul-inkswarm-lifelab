# D-0007 — Screenshot export (PNG) with HUD + diagnostics overlay

## What changed
Implemented a **native WebGPU screenshot export** that produces a PNG and bakes an overlay block into the image.

### UI / UX
- Added a **Screenshot (P)** button in the HUD.
- Added hotkey **P** to export a PNG.

### Capture pipeline (WebGPU → PNG)
- Swapchain configured with `GPUTextureUsage.COPY_SRC`.
- On request, the current swapchain texture is copied into a mapped readback buffer.
- Handles `bytesPerRow` alignment (256-byte) and strips padding to produce a tight RGBA buffer.

### Overlay baked into the PNG
- The exported image includes a small monospace overlay block:
  - title
  - preset/profile
  - basic stats (res, dt/FPS hint via overlay lines)

## How to test
1) `npm install && npm run dev`
2) Press **P** or click **Screenshot (P)**.
3) Verify a PNG downloads and contains the overlay block.

## Files touched (high level)
- `src/gpu/webgpu.ts` (swapchain usage includes COPY_SRC)
- `src/gpu/lifelab/sim.ts` (readback + requestCapture API)
- `src/app/App.tsx` (screenshot composition + download)

## Notes
- Capture is intentionally **single-flight** (a second capture request rejects until the current one resolves).
- This preserves the “WebGPU-only” constraint: capture exists only when WebGPU exists.
