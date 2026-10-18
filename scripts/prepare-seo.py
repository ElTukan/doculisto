#!/usr/bin/env python3
from pathlib import Path
import html
import json
import re
import subprocess
from datetime import date

ROOT = Path(__file__).resolve().parents[1]
SITE = "https://doculisto.es"
GUIDES = ROOT / "guias"

def git_date(path, first=False):
    try:
        args = ["git", "log"]
        args += ["--reverse"] if first else []
        args += ["-1", "--format=%cs", "--", str(path.relative_to(ROOT))]
        value = subprocess.check_output(args, cwd=ROOT, text=True, stderr=subprocess.DEVNULL).strip()
        if re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
            return value
    except (OSError, subprocess.CalledProcessError):
        pass
    return date.today().isoformat()

for path in sorted(GUIDES.glob("*.html")):
    if path.name == "index.html":
        continue

    text = path.read_text(encoding="utf-8")
    title_match = re.search(r"<title>(.*?)</title>", text, re.I | re.S)
    h1_match = re.search(r"<h1[^>]*>(.*?)</h1>", text, re.I | re.S)
    desc_match = re.search(r'<meta\s+name=["\']description["\']\s+content=["\']([^"\']*)["\']', text, re.I)

    title = html.unescape(re.sub(r"\s+", " ", title_match.group(1)).strip()) if title_match else path.stem.replace("-", " ").title()
    breadcrumb_title = html.unescape(re.sub(r"<[^>]+>", "", h1_match.group(1))) if h1_match else title.replace(" — DocuListo", "")
    breadcrumb_title = re.sub(r"\s+", " ", breadcrumb_title).strip()
    description = html.unescape(desc_match.group(1).strip()) if desc_match else f"Guía práctica de DocuListo sobre {title}."

    canonical = f"{SITE}/guias/{path.name}"
    published = git_date(path, first=True)
    modified = git_date(path)

    faq_schemas = []
    for match in re.finditer(r'<script\s+type=["\']application/ld\+json["\']>(.*?)</script>', text, re.I | re.S):
        try:
            data = json.loads(match.group(1))
        except json.JSONDecodeError:
            continue
        if isinstance(data, dict) and data.get("@type") == "FAQPage":
            faq_schemas.append(json.dumps(data, ensure_ascii=False, separators=(",", ":")))

    article_schema = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": title,
        "description": description,
        "url": canonical,
        "inLanguage": "es-ES",
        "datePublished": published,
        "dateModified": modified,
        "mainEntityOfPage": {"@type": "WebPage", "@id": canonical},
        "publisher": {"@type": "Organization", "name": "DocuListo", "url": SITE}
    }

    breadcrumb_schema = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Inicio", "item": f"{SITE}/"},
            {"@type": "ListItem", "position": 2, "name": "Guías", "item": f"{SITE}/guias/"},
            {"@type": "ListItem", "position": 3, "name": breadcrumb_title, "item": canonical}
        ]
    }

    meta = (
        f'\n'
        f'<link rel="canonical" href="{canonical}">'
        f'<meta name="robots" content="index,follow">'
        f'<meta property="og:type" content="article">'
        f'<meta property="og:title" content="{html.escape(title, quote=True)}">'
        f'<meta property="og:description" content="{html.escape(description, quote=True)}">'
        f'<meta property="og:url" content="{canonical}">'
        f'<meta property="og:site_name" content="DocuListo">'
        f'<meta property="og:image" content="{SITE}/og-image.svg">'
        f'<meta name="twitter:card" content="summary">'
        f'<meta name="twitter:title" content="{html.escape(title, quote=True)}">'
        f'<meta name="twitter:description" content="{html.escape(description, quote=True)}">'
        f'<meta name="twitter:image" content="{SITE}/og-image.svg">'
        f'<script type="application/ld+json">{json.dumps(article_schema, ensure_ascii=False, separators=(",", ":"))}</script>'
        f'<script type="application/ld+json">{json.dumps(breadcrumb_schema, ensure_ascii=False, separators=(",", ":"))}</script>\n'
    )
    meta += "".join(f'<script type="application/ld+json">{schema}</script>' for schema in faq_schemas)

    breadcrumb_html = (
        '<nav class="breadcrumbs" aria-label="Migas de pan">'
        '<a href="/">Inicio</a><span aria-hidden="true">/</span>'
        '<a href="/guias/">Guías</a><span aria-hidden="true">/</span>'
        f'<span>{html.escape(breadcrumb_title)}</span>'
        '</nav>'
    )

    text = re.sub(r'\n?\s*<link\s+rel=["\']canonical["\'][^>]*>', '', text, flags=re.I)
    text = re.sub(r'\n?\s*<meta\s+name=["\']robots["\'][^>]*>', '', text, flags=re.I)
    text = re.sub(r'\n?\s*<script\s+type=["\']application/ld\+json["\']>.*?</script>', '', text, flags=re.I | re.S)
    text = re.sub(r'<script[^>]+googletagmanager\.com/gtag/js[^>]*>\s*</script>', '', text, flags=re.I)
    text = text.replace('href="../favicon.svg"', 'href="../favicon-doculisto.svg"')
    text = re.sub(r'<script>.*?(?:G-ZTCN2SMVB7|G-ZC7K8J3BSVS).*?</script>', '', text, flags=re.I | re.S)

    # AdSense va como etiqueta estatica en el HTML para que Google la vea
    # aunque no se acepten cookies. consent.js aplica Consent Mode (denied por
    # defecto) y Analytics solo se carga tras aceptar. Sin duplicados.
    adsense_tag = '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2993676855543434" crossorigin="anonymous"></script>'
    text = re.sub(r'[ \t]*<script[^>]+src=["\'][^"\']*consent\.js["\'][^>]*>\s*</script>\s*', '', text, flags=re.I)
    text = re.sub(r'[ \t]*<script[^>]+pagead2\.googlesyndication\.com/pagead/js/adsbygoogle\.js[^>]*>\s*</script>\s*', '', text, flags=re.I)
    text = re.sub(r'(</head>)', '<script src="../consent.js"></script>' + adsense_tag + r'\1', text, count=1, flags=re.I)

    text = re.sub(r'<nav class="breadcrumbs"[^>]*>.*?</nav>', '', text, flags=re.I | re.S)
    text = re.sub(r'(</head>)', meta + r'\1', text, count=1, flags=re.I)
    text = re.sub(r'(<main[^>]*>)', r'\1' + breadcrumb_html, text, count=1, flags=re.I)
    path.write_text(text, encoding="utf-8")

print("Guide SEO metadata, breadcrumbs and structured data prepared.")
