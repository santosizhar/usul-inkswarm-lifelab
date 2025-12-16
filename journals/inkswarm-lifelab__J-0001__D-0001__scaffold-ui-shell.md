# J-0001 — D-0001 — Scaffold + Canvas Mount + UI Shell

## What was delivered
- Created the repo scaffold for **Inkswarm LifeLab** (TypeScript + React + Vite).
- Added a full-screen canvas mount (placeholder 2D render loop) and a glassy HUD overlay.
- Set up a minimal file structure aligned with the roadmap.

## Files added / changed (high-level)
- `package.json` (scripts + dependency pins)
- `vite.config.ts`, `tsconfig*.json`, `index.html`
- `src/main.tsx`, `src/app/App.tsx`
- `src/ui/OverlayHud.tsx`, `src/ui/utils.ts`
- `src/styles/app.css`
- `README.md`
- `journals/` (this journal + JM)

## How to run locally
```bash
npm install
npm run dev
```

## Acceptance check (manual)
- App loads.
- Canvas fills the viewport.
- HUD is visible and readable over the canvas.
- No WebGPU init occurs yet (by design).

## Constraints / known limitations
- I could not run `npm install` / `npm run dev` / tests in this environment (no package install/network). The scaffold is template-faithful and intended to run locally once dependencies are installed.
- WebGPU init + robust failure screen is **D-0002**.

## Next up
- **D-0002:** WebGPU init + robust error handling + polished fail screen + placeholder render loop.
