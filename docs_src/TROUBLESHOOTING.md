# Troubleshooting

## “WebGPU is not available”
- Use Chrome or Edge (stable).
- Update GPU drivers.
- Corporate devices / VMs sometimes block WebGPU.
- Try disabling aggressive browser extensions that modify GPU behavior.

## The app opens but is black / frozen
- Open DevTools → Console and look for WebGPU errors.
- If you see `device lost`, it usually indicates driver instability.
- Try reducing GPU load (use Hero profile).

## Build / Pages issues
If GitHub Pages shows a blank page or missing assets:
- Confirm Vite `base` is set to relative (`./`) or correct repo base.
- Check that the built output is in `/docs` on `main`.
- Inspect the Network tab for 404s on `/assets/...`.

See: `docs_src/PAGES.md`
