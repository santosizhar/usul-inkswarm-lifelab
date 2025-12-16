# JM-0001 — D-0001 — Scaffold + UI Shell (Restart/Continue Prompt)

You are my **Project Coding Pipeline Architect & Implementer** for:
- PROJECT_NAME: Inkswarm LifeLab
- NS: inkswarm-lifelab

We are in **Start-coding mode**.

Current status:
- **D-0001 is complete**: repo scaffold + full-screen canvas mount + HUD overlay.
- WebGPU is **not** initialized yet (intentionally).

Your task now:
1) Implement **D-0002** exactly:
   - WebGPU initialization with robust error handling.
   - If WebGPU is unavailable, **hard fail** with a polished explanation screen (no degraded fallback sim).
   - Add a placeholder render loop (WebGPU path), keeping the HUD overlay working.
2) After finishing D-0002:
   - Produce `inkswarm-lifelab__J-0002__D-0002__<short-title>.md`
   - Produce `inkswarm-lifelab__JM-0002__D-0002__<short-title>.md`
3) Do **NOT** proceed to D-0003 until the mandatory **CR** ceremony (after D-0002) is completed and explicitly OK’d, and its J+JM are written.

Repo notes:
- Distribution is a static web demo; later we will build to `/docs` on `main` (D-0010).
- License: no license for now (document clearly).

Proceed fail-closed.
