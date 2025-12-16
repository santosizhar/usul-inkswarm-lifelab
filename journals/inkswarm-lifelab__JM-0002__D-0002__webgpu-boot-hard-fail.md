# inkswarm-lifelab — JM-0002 — D-0002 — webgpu-boot-hard-fail

You are continuing the **Inkswarm LifeLab** repo at deliverable **D-0002**.

## What to verify (fail-closed)
- WebGPU init path is robust:
  - Unsupported → polished hard-fail screen
  - Adapter/device/context failures → polished hard-fail screen
  - Runtime GPU errors (`uncapturederror`, `device.lost`) → polished hard-fail screen
- No degraded fallback simulation exists (intentional constraint).

## Quick run
```bash
npm install
npm run dev
```

## Acceptance expectations
- On supported machines: HUD says “WebGPU ready” and a placeholder GPU frame renders.
- On unsupported machines: fail screen is clear, helpful, and aesthetically aligned.

## If anything deviates
- Stop and propose a fix list first (do not proceed to D-0003).
