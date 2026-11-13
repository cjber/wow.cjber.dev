# wow.cjber.dev

The one-page site listing every World of Warcraft: Forever addon by Cillian Berragan, served at https://wow.cjber.dev.

`site/` is served as is: static HTML, CSS and images. The one step before each deploy is `scripts/build-stats.py`, which fills in the CurseForge download counts.

Screenshots under `site/img/` are copies of each addon's `docs/screenshots/<name>.png`. After an addon's screenshots change, run `scripts/sync-screenshots.sh` (needs `gh` and ImageMagick) to replace the stale ones and their `<img>` sizes; `--check` exits 1 while any copy is stale, and the weekly Screenshots workflow runs it.

Download counts come from the CurseForge Core API. Each addon's `<article>` carries its `data-curseforge` project ID, and the Pages workflow runs `scripts/build-stats.py` on every push to main and once a day. The script writes the counts into the page and publishes:

- https://wow.cjber.dev/stats.json: exact downloads per addon and in total
- https://wow.cjber.dev/badges/total.json and `badges/<addon>.json`: [shields.io endpoint](https://shields.io/badges/endpoint-badge) badges, for example `https://img.shields.io/endpoint?url=https://wow.cjber.dev/badges/total.json`

Run it locally with `CF_API_KEY=... python3 scripts/build-stats.py`. The workflow reads the key from `CURSEFORGE_API_KEY`, a secret of the `github-pages` environment rather than of the repository: that environment only deploys `main`, so a manual run on any other branch never sees the key.
