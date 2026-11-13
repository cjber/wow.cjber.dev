#!/usr/bin/env python3
"""Fill in CurseForge download counts for every addon on the site.

    CF_API_KEY=... python3 scripts/build-stats.py

Each <article class="addon"> carries its CurseForge project ID in data-curseforge. One request
to the CurseForge Core API reads every count. The script then writes:

- site/stats.json: the exact count per addon and the total, for anything that wants raw numbers
- site/badges/<addon>.json and site/badges/total.json: shields.io endpoint badges
- site/index.html: the text of every element marked data-downloads="<addon>" or "total"

ForeverCore is not on the page and is left out on purpose: every player of any addon downloads
it as a dependency, so adding it would count the same players twice.

The Pages workflow runs this before each deploy and on a daily schedule, so the published site
stays current without commits. A failed request fails the run rather than publishing stale or
missing numbers.
"""

from __future__ import annotations

import json
import os
import re
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "site"
INDEX = SITE / "index.html"
API = "https://api.curseforge.com/v1/mods"
USER_AGENT = "wow.cjber.dev stats (+https://wow.cjber.dev)"

# Our own markup, written by hand in index.html: the article id is the addon's repository name.
ARTICLE = re.compile(r'<article class="addon" id="([a-z0-9-]+)" data-curseforge="(\d+)">')
COUNT = re.compile(r'(<(\w+)[^>]* data-downloads="([a-z0-9-]+)"[^>]*>)[^<]*(</\2>)')


def compact(n: int) -> str:
    """Round down, so the page never claims more downloads than CurseForge reports."""
    if n >= 1_000_000:
        return f"{n // 100_000 / 10:g}M"
    if n >= 10_000:
        return f"{n // 1_000}K"
    if n >= 1_000:
        return f"{n // 100 / 10:g}K"
    return str(n)


def fetch(key: str, ids: list[int]) -> dict[int, int]:
    request = urllib.request.Request(
        API,
        data=json.dumps({"modIds": ids}).encode(),
        headers={
            "x-api-key": key,
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": USER_AGENT,
        },
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        mods = json.load(response)["data"]
    counts = {mod["id"]: int(mod["downloadCount"]) for mod in mods}
    missing = sorted(set(ids) - set(counts))
    if missing:
        sys.exit(f"CurseForge returned no project for IDs {missing}")
    return counts


def badge(label: str, n: int) -> dict[str, object]:
    return {"schemaVersion": 1, "label": label, "message": compact(n), "color": "d9a441"}


def main() -> None:
    key = os.environ.get("CF_API_KEY")
    if not key:
        sys.exit("CF_API_KEY is not set")
    page = INDEX.read_text()
    addons = {slug: int(pid) for slug, pid in ARTICLE.findall(page)}
    if not addons:
        sys.exit("no <article> in site/index.html carries data-curseforge")

    counts = fetch(key, list(addons.values()))
    downloads = {slug: counts[pid] for slug, pid in addons.items()}
    total = sum(downloads.values())
    text = {**{slug: compact(n) for slug, n in downloads.items()}, "total": compact(total)}

    def fill(match: re.Match[str]) -> str:
        name = match.group(3)
        if name not in text:
            sys.exit(f'data-downloads="{name}" names no addon with a CurseForge ID')
        return f"{match.group(1)}{text[name]}{match.group(4)}"

    INDEX.write_text(COUNT.sub(fill, page))

    stats = {
        "generated": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source": "CurseForge",
        "total": total,
        "addons": {
            slug: {"curseforge_id": addons[slug], "downloads": n} for slug, n in downloads.items()
        },
    }
    (SITE / "stats.json").write_text(json.dumps(stats, indent=2) + "\n")
    badges = SITE / "badges"
    badges.mkdir(exist_ok=True)
    (badges / "total.json").write_text(json.dumps(badge("CurseForge downloads", total)) + "\n")
    for slug, n in downloads.items():
        (badges / f"{slug}.json").write_text(json.dumps(badge("downloads", n)) + "\n")

    for slug, n in sorted(downloads.items(), key=lambda item: -item[1]):
        print(f"{slug:26} {n:>10,}")
    print(f"{'total':26} {total:>10,}")


if __name__ == "__main__":
    main()
