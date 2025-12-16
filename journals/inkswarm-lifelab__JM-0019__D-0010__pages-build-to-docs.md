# inkswarm-lifelab — JM-0019 — D-0010

---

You are reviewing D-0010 for Inkswarm LifeLab.

Verify:
- `vite.config.ts` builds to `/docs` and uses relative `base: "./"`.
- `public/.nojekyll` exists.
- CI runs `npm ci`, build, and `npm run check:pages`.
- `npm run check:pages` fails if `docs/index.html` is missing.

Then provide an acceptance recommendation and list any changes required for Pages to work on GitHub.
