# Agents guide

The one-page site for the WoW: Forever addons, served from `site/`: static HTML, CSS and images. `pages.yml` deploys `main` to GitHub Pages on every push and daily, after `scripts/build-stats.py` fills in the download counts.

## Commands

- `CF_API_KEY=$(pass show dev/CURSEFORGE_CORE_API_KEY) python3 scripts/build-stats.py`: read every addon's CurseForge downloads (the `data-curseforge` ID on its `<article>`), write them into each `data-downloads` element, and write `site/stats.json` and the shields endpoint badges in `site/badges/` (both gitignored, built at deploy). A new addon section needs `data-curseforge` and a `data-downloads` span. ForeverCore is left out: it is a dependency, so it would count players twice. The workflow reads `CURSEFORGE_API_KEY` from the `github-pages` environment (deploys `main` only), never as a repository secret, so a manual run on another branch cannot read it.
- `scripts/sync-screenshots.sh`: copy each addon's `docs/screenshots/<name>.png` into `site/img/` and update the `<img>` sizes (needs `gh` and ImageMagick); `--check` exits 1 while a copy is stale. The weekly Screenshots workflow runs `--check`.
- `python3 scripts/sync-credits.py`: rebuild the Made with players section in `site/index.html` from each addon's `THIRD_PARTY.md` on main; `--check` exits 1 while it is stale. The weekly Screenshots workflow runs `--check`.

CI (`ci.yml`) runs `workflows` (actionlint, zizmor) and `secrets` (gitleaks) on every pull request; the ruleset requires both by name.

## Standards

- `repo-standards`: the RS-* requirements every cjber repo meets (repo, Actions and security settings, rulesets, CI hardening, community files), a skill in cjber/skills whose `audit.py` checks this repo
