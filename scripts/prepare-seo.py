#!/usr/bin/env python3
from pathlib import Path
import html
import json
import re

ROOT = Path(__file__).resolve().parents[1]
SITE = "https://doculisto.es"
GUIDES = ROOT / "guias"

for path in sorted(GUIDES.glob("*.html")):
    if path.name == "index.html":
        continue
    text = path.read_text(encoding="utf-8")
    title_match = re.search(r"<title>(.*?)</title>", text, re.I | re.S)
    desc_match = re.search(r'<meta\s+name=["\']description["\']\s+content=["\']([^"\']*)["\']', text, re.I)
    title = html.unescape(re.sub(r"\s+", " ", title_match.group(1)).strip()) if title_match else path.stem.replace("-", " ").title()
    description = html.unescape(desc_match.group(1).strip()) if desc_match else f"Guía práctica de DocuListo sobre {title}."
    canonical = f"{SITE}/guias/{path.name}"
    schema = {"@context":"https://schema.org","@type":"Article","headline":title,"description":description,"url":canonical,"mainEntityOfPage":{"@type":"WebPage","@id":canonical},"publisher":{"@type":"Organization","name":"DocuListo","url":SITE}}
    meta = f'\n<link rel="canonical" href="{canonical}"><meta property="og:type" content="article"><meta property="og:title" content="{html.escape(title, quote=True)}"><meta property="og:description" content="{html.escape(description, quote=True)}"><meta property="og:url" content="{canonical}"><meta property="og:site_name" content="DocuListo"><meta property="og:image" content="{SITE}/og-image.svg"><meta name="twitter:card" content="summary"><meta name="twitter:title" content="{html.escape(title, quote=True)}"><meta name="twitter:description" content="{html.escape(description, quote=True)}"><meta name="twitter:image" content="{SITE}/og-image.svg"><script type="application/ld+json">{json.dumps(schema, ensure_ascii=False, separators=(",", ":"))}</script>\n'
    text = re.sub(r'\n?\s*<link\s+rel=["\']canonical["\'][^>]*>', '', text, flags=re.I)
    text = re.sub(r'\n?\s*<script\s+type=["\']application/ld\+json["\']>.*?</script>', '', text, flags=re.I | re.S)
    text = re.sub(r'<script[^>]+googletagmanager\.com/gtag/js[^>]*></script>', '', text, flags=re.I)
    text = re.sub(r'<script>.*?(?:G-ZTCN2SMVB7|G-ZC7K8J3BSVS).*?</script>', '', text, flags=re.I | re.S)
    if '<ins class="adsbygoogle"' not in text:
        text = re.sub(r'<script[^>]+pagead2\.googlesyndication\.com/pagead/js/adsbygoogle\.js[^>]*></script>', '', text, flags=re.I)
    text = re.sub(r'(</head>)', meta + r'\1', text, count=1, flags=re.I)
    path.write_text(text, encoding="utf-8")

print("Guide SEO, Analytics and advertising scripts prepared.")
