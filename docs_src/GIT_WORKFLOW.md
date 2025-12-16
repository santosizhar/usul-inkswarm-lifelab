# Git workflow — Inkswarm LifeLab

This doc centralizes **all Git commands** used in the project cadence:
- repo goes public after **D-0002**
- push/update **every 2 deliverables** and **at every release**
- releases: **R1 after D-0008**, **R2 after D-0010**
- GitHub Pages serves from **`main/docs`**

> Tip: if you already “missed” tags/docs, you can fix it retroactively (see **Retroactive fixes**).

---

## One-time: first push (new repo)

```bash
cd inkswarm-lifelab
git init
git branch -M main
git add .
git commit -m "Initial import"
git remote add origin <YOUR_GITHUB_REPO_URL>
git push -u origin main
```

If you want the repo public: GitHub → Repo Settings → **Visibility: Public**  
(Allowed by project rules after D-0002.)

---

## Regular cadence push (every 2 deliverables)

```bash
git add .
git commit -m "D-000X: <short summary>"
git push
```

---

## Release tagging (normal flow)

### R1 (example: `v0.0.1`)
After RR for R1 is OK:

```bash
git add .
git commit -m "R1: D-0007 screenshot + D-0008 diagnostics/profiles"
git push

git tag v0.0.1
git push origin v0.0.1
```

Then create a GitHub Release for `v0.0.1` (paste notes from README / docs).

### R2 (example: `v1.0.0`)
After RR for R2 is OK:

1) Ensure CI is green on `main`.
2) Publish Pages artifact to `/docs` (compiled output) and commit it:

```bash
npm ci
npm run build
npm run check:pages

git add docs
git commit -m "Build: publish GitHub Pages artifact to /docs"
git push
```

3) Tag + push:

```bash
git tag v1.0.0
git push origin v1.0.0
```

Then create a GitHub Release for `v1.0.0`.

---

## GitHub Pages settings (one-time)

GitHub → Settings → Pages:
- Source: **Deploy from a branch**
- Branch: `main`
- Folder: `/docs`

---

## Retroactive fixes (if you skipped tags/docs)

### Find the commit you *should have tagged*
Use `git log` and locate the commit that corresponds to the intended release point.

```bash
git log --oneline --decorate --max-count=30
```

If you have a helpful commit message, you can search:

```bash
git log --oneline | findstr /i "R1 D-0008"
```

(Windows PowerShell alternative: `Select-String`.)

### Add the missing tag retroactively
If you did **not** create the tag at the time, you can create it now pointing at the right commit.

Annotated tag (recommended):

```bash
git tag -a v0.0.1 <COMMIT_SHA> -m "R1: Shareable Demo"
git push origin v0.0.1
```

Lightweight tag:

```bash
git tag v0.0.1 <COMMIT_SHA>
git push origin v0.0.1
```

### Add docs retroactively
Docs are just commits. Add / edit docs, commit them, push.

```bash
git add docs_src README.md
git commit -m "Docs: add/revise release workflow notes"
git push
```

If you already published a release tag, do **not** move the tag unless you intentionally want to retag history.
If you do need to move a tag (rare), prefer making a new tag like `v0.0.1-docs` or `v0.0.2`.

---

## Minimal “ship” sequence (recommended)

- Push `main` → let CI go green
- Publish `/docs` build output (for Pages) → commit → push
- Tag → push tag
- Create GitHub Release using the tag
