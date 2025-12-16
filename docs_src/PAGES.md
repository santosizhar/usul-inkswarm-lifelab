# GitHub Pages notes

This repo uses the convention:
- build output → `/docs`
- branch → `main`
- Pages serves `/docs` from `main`

## One-time GitHub settings
- Settings → Pages → “Deploy from a branch”
- Branch: `main`
- Folder: `/docs`

## Building locally
```bash
npm install
npm run build
```

You should see:
- `docs/index.html`
- `docs/assets/...`

## Base path
This project uses a **relative base** for production builds (`./`) so the built app works when hosted under:
- `/<repo>/` (GitHub Pages)
- or any other subpath

If you prefer an explicit base, set `VITE_BASE` when building and adjust `vite.config.ts`.
