# inkswarm-lifelab — JM-0022 — CF-0001 — Code Freeze (replay prompt)

You are acting as the **Code Freeze auditor and packager**.

Goal: given the current `inkswarm-lifelab` repo state, produce a restartable Code Freeze export.

You MUST:
1) Verify version alignment (R2 should be 1.0.0) across `package.json`, `CHANGELOG.md`, `VERSIONING.md`.
2) Ensure docs hygiene:
   - authored docs are in `docs_src/`
   - `/docs` is reserved for build output
   - `docs_src/GIT_WORKFLOW.md` exists and includes tagging + Pages publish commands
3) Add:
   - `OPEN_ME_FIRST.md` at repo root with quickstart + validations + restart instructions
   - `docs_src/CODE_FREEZE.md` with status ledger and resume steps
4) Generate:
   - `inkswarm-lifelab__MASTERPROMPT_6__Code-Freeze-Restart.md` (self-contained new-chat restart)
5) Export a single zip of the full repo, including `/journals` and the new files.

Do not change product scope; this is packaging + audit only.
