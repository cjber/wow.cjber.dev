# wow.cjber.dev

The one-page site listing every World of Warcraft: Forever addon by Cillian Berragan, served at https://wow.cjber.dev.

Cloudflare Pages (project `wow-cjber-dev`) deploys `site/` from `main` as is: static HTML, CSS and images, with no build step. Pages Functions in `functions/` add the live download counts.

Screenshots under `site/img/` are copies of each addon's `docs/screenshots/<name>.png`. After an addon's screenshots change, run `scripts/sync-screenshots.sh` (needs `gh` and ImageMagick) to replace the stale ones and their `<img>` sizes; `--check` exits 1 while any copy is stale, and the weekly Screenshots workflow runs it.

Download counts come from the CurseForge Core API, read at request time by `lib/stats.js`. Each addon's `<article>` carries its `data-curseforge` project ID, so the page itself is the list of addons. One request covers them all, cached at the edge for an hour. Three routes run a function, as `site/_routes.json` sets; every other file is served without one:

- `/`: the page, with every `data-downloads` element rewritten to the current count. If CurseForge cannot be reached, the page keeps the counts committed in `index.html`.
- `/stats.json`: exact downloads per addon and in total.
- `/badges/total.json` and `/badges/<addon>.json`: [shields.io endpoint](https://shields.io/badges/endpoint-badge) badges, for example `https://img.shields.io/endpoint?url=https://wow.cjber.dev/badges/total.json`.

The functions read the key from `CURSEFORGE_API_KEY`, an encrypted variable on the Pages project. To run them locally, put `CURSEFORGE_API_KEY=...` in `.dev.vars` (gitignored) and run `wrangler pages dev site`.
