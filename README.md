# wow.cjber.dev

The one-page site listing every World of Warcraft: Forever addon by Cillian Berragan, served at https://wow.cjber.dev.

`site/` is served as is: static HTML, CSS and images, with no build step.

Screenshots under `site/img/` are copies of each addon's `docs/screenshots/<name>.png`. After an addon's screenshots change, run `scripts/sync-screenshots.sh` (needs `gh` and ImageMagick) to replace the stale ones and their `<img>` sizes; `--check` exits 1 while any copy is stale.
