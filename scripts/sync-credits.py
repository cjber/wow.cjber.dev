#!/usr/bin/env python3
"""Rebuild the Made with players section in site/index.html from each addon's THIRD_PARTY.md.

    python3 scripts/sync-credits.py          rewrite the section between its markers
    python3 scripts/sync-credits.py --check  exit 1 when the section is stale

Every repository is read at main. The ## Players table is read with forever-core's credits parser,
downloaded with its forever_tools package and imported from a temporary directory. Players are
merged by exact name, each row counted as one contribution, and ranked by count and then name. A
repository without the parser or without a ## Players section fails the run and is named.
"""

from __future__ import annotations

import argparse
import html
import importlib
import json
import sys
import tempfile
import urllib.error
import urllib.request
from pathlib import Path
from types import ModuleType

ROOT = Path(__file__).resolve().parent.parent
INDEX = ROOT / "site" / "index.html"
START = "<!-- credits:start -->"
END = "<!-- credits:end -->"
RAW = "https://raw.githubusercontent.com/cjber/{repo}/{ref}/{path}"
USER_AGENT = "wow.cjber.dev credits sync (+https://wow.cjber.dev)"
REF = "main"

CORE = "forever-core"
TOOL = ".agents/skills/wow-forever-addon/tooling/forever_tools"

# The addon's repository and the title used for it on the site.
ADDONS = (
    (CORE, "Forever Core"),
    ("shortest-path-forever", "Shortest Path Forever"),
    ("adventure-guide-forever", "Adventure Guide Forever"),
    ("skillup-forever", "SkillUp Forever"),
    ("legacy-forever", "Legacy Forever"),
    ("tweaks-forever", "Tweaks Forever"),
    ("field-guide-forever", "Field Guide Forever"),
    ("commissions-forever", "Commissions Forever"),
    ("macro-assist-forever", "Macro Assist Forever"),
)

PLAYERS = "## Players"


def fetch(repo: str, path: str) -> bytes:
    """One file from a repository's main."""
    url = RAW.format(repo=repo, ref=REF, path=path)
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return response.read()
    except urllib.error.HTTPError as error:
        if error.code == 404:
            raise
        raise SystemExit(f"cannot fetch {url}: HTTP {error.code}") from error
    except (urllib.error.URLError, OSError) as error:
        raise SystemExit(f"cannot fetch {url}: {error}") from error


def load_credits(destination: Path) -> ModuleType:
    """The credits parser, with its forever_tools package, in `destination`."""
    try:
        manifest = json.loads(fetch(CORE, f"{TOOL}/MANIFEST.json"))
    except urllib.error.HTTPError as error:
        if error.code != 404:
            raise
        raise SystemExit(f"missing: cjber/{CORE} {TOOL}/MANIFEST.json on {REF} (no credits parser)") from error
    if "credits.py" not in manifest.get("files", {}):
        raise SystemExit(f"missing: cjber/{CORE} {TOOL}/credits.py on {REF} (no credits parser)")

    package = destination / "forever_tools"
    package.mkdir(parents=True)
    for name in manifest["files"]:
        target = package / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(fetch(CORE, f"{TOOL}/{name}"))

    sys.path.insert(0, str(destination))
    importlib.invalidate_caches()
    return importlib.import_module("forever_tools.credits")


def players_in(repo: str, text: str, credits: ModuleType) -> list[dict[str, str]]:
    """The player rows in one THIRD_PARTY.md, which must carry a ## Players section."""
    if not any(line.strip() == PLAYERS for line in text.splitlines()):
        raise SystemExit(f"missing: cjber/{repo}/THIRD_PARTY.md on {REF} has no '{PLAYERS}' section")
    return credits.parse(text)["players"]


def collect(credits: ModuleType) -> list[tuple[str, int, list[str]]]:
    """Every player once: (name, rows, addons), ranked by rows and then name."""
    found: dict[str, tuple[int, list[str]]] = {}
    for repo, title in ADDONS:
        try:
            text = fetch(repo, "THIRD_PARTY.md").decode("utf-8")
        except urllib.error.HTTPError as error:
            if error.code != 404:
                raise
            raise SystemExit(f"missing: cjber/{repo}/THIRD_PARTY.md on {REF}") from error
        for entry in players_in(repo, text, credits):
            name = entry["name"].strip()
            if not name:
                continue
            count, addons = found.get(name, (0, []))
            found[name] = (count + 1, addons if title in addons else [*addons, title])
    rows = [(name, count, addons) for name, (count, addons) in found.items()]
    return sorted(rows, key=lambda row: (-row[1], row[0].casefold(), row[0]))


def render(rows: list[tuple[str, int, list[str]]], indent: str) -> str:
    """The section's HTML, every line indented to sit inside its markers."""
    if not rows:
        return f'{indent}<p class="credits-empty">No player contributions to credit yet.</p>'
    lines = [f'{indent}<ul class="credits-list" role="list">']
    for name, count, addons in rows:
        title = html.escape("Helped: " + ", ".join(addons), quote=True)
        label = f'<span class="credit-name">{html.escape(name, quote=False)}</span>'
        if count > 1:
            label += (
                f'<span class="credit-count">{count}'
                '<span class="visually-hidden"> contributions</span></span>'
            )
        lines.append(f'{indent}  <li title="{title}">{label}</li>')
    lines.append(f"{indent}</ul>")
    return "\n".join(lines)


def section(text: str) -> tuple[int, int, str]:
    """The bounds between the markers, and the indentation the markers sit at."""
    start = text.find(START)
    end = text.find(END)
    if start < 0 or end < 0 or end < start:
        raise SystemExit(f"site/index.html: expected {START} then {END}")
    line_start = text.rfind("\n", 0, start) + 1
    indent = text[line_start:start]
    if indent.strip():
        indent = ""
    return start + len(START), end, indent


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Sync the Made with players section from THIRD_PARTY.md files.")
    parser.add_argument("--check", action="store_true", help="fail instead of writing when the section is stale")
    arguments = parser.parse_args(argv)

    with tempfile.TemporaryDirectory(prefix="wow-credits-") as scratch:
        credits = load_credits(Path(scratch))
        rows = collect(credits)

    text = INDEX.read_bytes().decode("utf-8")
    start, end, indent = section(text)
    newline = "\r\n" if "\r\n" in text else "\n"
    wanted = newline + render(rows, indent).replace("\n", newline) + newline + indent
    if text[start:end] == wanted:
        print(f"credits: site/index.html is up to date ({len(rows)} players)")
        return 0
    if arguments.check:
        print("stale: site/index.html (the Made with players section does not match THIRD_PARTY.md)", file=sys.stderr)
        return 1
    INDEX.write_bytes((text[:start] + wanted + text[end:]).encode("utf-8"))
    print(f"updated: site/index.html ({len(rows)} players)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
