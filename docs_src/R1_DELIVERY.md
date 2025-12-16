# R1 delivery — run locally

This release candidate is intended for **local execution** (the end user runs it on their machine).

## System requirements
- **Node.js 18+** (recommended: Node 20+)
- A **WebGPU-capable browser** (Chrome/Edge recommended) and updated GPU drivers

## Quickstart
From the repo root:

```bash
npm install
npm run dev
```

Then open the local URL printed by Vite.

## Controls
- **P** — export PNG screenshot (includes baked HUD/diagnostics overlay)
- **D** — toggle diagnostics overlay
- **1 / 2** — Hero / Stress profiles
- Click preset pills to change the look

## Optional readiness checks (recommended)
These are safe to run before sharing:

```bash
npm run validate:r1
```

If you have internet access and want deeper confidence:

```bash
npm run build
npm test
```

## Known constraints (by design)
- **WebGPU only**. If WebGPU is unavailable, the app shows a polished hard-fail screen.
- GitHub Pages build-to-`/docs` on `main` is planned for **D-0010**.
- **No license for now** (intentional; see README).
