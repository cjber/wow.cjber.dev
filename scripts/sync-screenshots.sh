#!/usr/bin/env bash
# Rebuild every site/img/<addon>/<name>.webp from docs/screenshots/<name>.png on that addon's
# default branch, then set the matching <img> width and height in site/index.html.
#
#   scripts/sync-screenshots.sh          replace each image that no longer matches its source
#   scripts/sync-screenshots.sh --check  exit 1 when any image is older than its addon's screenshot
#
# Needs gh (authenticated) and ImageMagick 7 (magick).
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
index="$root/site/index.html"
max_width=1200
check_only=0
[ "${1:-}" = --check ] && check_only=1

tmp="$(mktemp -d)"
trap 'command rm -rf -- "$tmp"' EXIT

stale=0
for image in "$root"/site/img/*/*.webp; do
	addon="$(basename "$(dirname "$image")")"
	name="$(basename "$image" .webp)"
	source="$tmp/$addon-$name.png"
	if ! gh api -H "Accept: application/vnd.github.raw" \
		"repos/cjber/$addon/contents/docs/screenshots/$name.png" >"$source" 2>/dev/null; then
		echo "missing: cjber/$addon docs/screenshots/$name.png" >&2
		stale=1
		continue
	fi
	built="$tmp/$addon-$name.webp"
	magick "$source" -resize "${max_width}x>" -quality 85 "$built"
	# Lossy encoding never matches byte for byte, so compare pixels. compare exits 1 whenever the
	# images differ and prints no metric when their sizes differ, which counts as stale.
	error="$({ magick compare -metric RMSE "$built" "$image" null: 2>&1 || true; } | grep -oE '\(([0-9.e-]+)\)' | tr -d '()')"
	error="${error:-1}"
	awk -v e="$error" 'BEGIN { exit !(e > 0.05) }' || continue
	if [ "$check_only" = 1 ]; then
		echo "stale: site/img/$addon/$name.webp (RMSE $error)" >&2
		stale=1
		continue
	fi
	mv "$built" "$image"
	read -r width height < <(magick identify -format '%w %h\n' "$image")
	sed -i -E "s#(<img src=\"img/$addon/$name\.webp\" )width=\"[0-9]+\" height=\"[0-9]+\"#\1width=\"$width\" height=\"$height\"#" "$index"
	echo "updated: site/img/$addon/$name.webp ${width}x${height}"
done

exit "$stale"
