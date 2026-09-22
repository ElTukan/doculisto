#!/usr/bin/env python3
"""Generate the public sitemap from the HTML pages that are intended for indexing."""

from __future__ import annotations

from datetime import date
from pathlib import Path
import re
import subprocess
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parents[1]
SITE = "https://doculisto.es"
CANONICAL_RE = re.compile(
    r'<link\s+rel=["\']canonical["\']\s+href=["\']([^"\']+)["\']',
    re.IGNORECASE,
)
NOINDEX_RE = re.compile(
    r'<meta\s+name=["\']robots["\']\s+content=["\'][^"\']*noindex',
    re.IGNORECASE,
)

def git_lastmod(path: Path) -> str:
    try:
        value = subprocess.check_output(
            ["git", "log", "-1", "--format=%cs", "--", str(path.relative_to(ROOT))],
            cwd=ROOT,
            text=True,
            stderr=subprocess.DEVNULL,
        ).strip()
        if re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
            return value
    except (OSError, subprocess.CalledProcessError):
        pass
    return date.today().isoformat()

def canonical_for(path: Path, html: str) -> str | None:
    if NOINDEX_RE.search(html):
        return None

    match = CANONICAL_RE.search(html)
    if match:
        canonical = match.group(1).strip()
        if canonical.startswith(SITE + "/") or canonical == SITE:
            return canonical
        return None

    relative = path.relative_to(ROOT).as_posix()
    if relative == "index.html":
        return SITE + "/"
    if relative.endswith("/index.html"):
        return SITE + "/" + relative[:-len("index.html")]
    return SITE + "/" + relative

def priority_for(url: str) -> str:
    if url == SITE + "/":
        return "1.0"
    if url == SITE + "/guias/":
        return "0.9"
    return "0.8"

entries: dict[str, str] = {}

for path in ROOT.rglob("*.html"):
    if ".git" in path.parts:
        continue
    try:
        html = path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        continue

    canonical = canonical_for(path, html)
    if canonical is None or canonical in entries:
        continue

    entries[canonical] = git_lastmod(path)

ordered = sorted(entries.items(), key=lambda item: (item[0] != SITE + "/", item[0]))

lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
]
for url, lastmod in ordered:
    lines.append(
        "  <url>"
        f"<loc>{escape(url)}</loc>"
        f"<lastmod>{lastmod}</lastmod>"
        "<changefreq>monthly</changefreq>"
        f"<priority>{priority_for(url)}</priority>"
        "</url>"
    )
lines.append("</urlset>")
(ROOT / "sitemap.xml").write_text("\n".join(lines) + "\n", encoding="utf-8")

print(f"Generated sitemap.xml with {len(ordered)} URLs.")
