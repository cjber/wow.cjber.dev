# Agents guide

The one-page site for the WoW: Forever addons. Cloudflare Pages (project `wow-cjber-dev`, which owns the wow.cjber.dev domain) deploys `site/` from `main` with no build step, and previews every branch. Pages Functions in `functions/` (shared code in `lib/stats.js`) fill in live CurseForge download counts and serve `/stats.json` and the shields badges under `/badges/`. `pages.yml` also publishes `site/` to GitHub Pages at cjber.github.io/wow.cjber.dev, a static mirror without the functions.

## Commands

- `wrangler pages dev site` (with `CURSEFORGE_API_KEY=...` from `pass show dev/CURSEFORGE_CORE_API_KEY` in the gitignored `.dev.vars`): serve the site and its functions locally. The local workerd may support only an older compatibility date than Cloudflare's: pass `--compatibility-date` with the date its error names. A new addon section needs `data-curseforge` on its `<article>` and a `data-downloads` element; nothing else lists the addons. ForeverCore is left out: it is a dependency, so it would count players twice. The production key is an encrypted variable on the Pages project, set only by the user.
- `scripts/sync-screenshots.sh`: copy each addon's `docs/screenshots/<name>.png` into `site/img/` and update the `<img>` sizes (needs `gh` and ImageMagick); `--check` exits 1 while a copy is stale. The weekly Screenshots workflow runs `--check`.
- `python3 scripts/sync-credits.py`: rebuild the Made with players section in `site/index.html` from each addon's `THIRD_PARTY.md` on main; `--check` exits 1 while it is stale. The weekly Screenshots workflow runs `--check`.

CI (`ci.yml`) runs `workflows` (actionlint, zizmor) and `secrets` (gitleaks) on every pull request; the ruleset requires both by name.

## Standards

- `repo-standards`: the RS-* requirements every cjber repo meets (repo, Actions and security settings, rulesets, CI hardening, community files), a skill in cjber/skills whose `audit.py` checks this repo
