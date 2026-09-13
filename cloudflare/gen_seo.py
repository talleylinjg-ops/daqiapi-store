#!/usr/bin/env python3
"""Generate SEO/GEO artifacts for the daqiapi-store static mirror.

Reads the assembled mirror directory (default /tmp/cf-out) and writes:
  - sitemap.xml   (static pages + blog posts + forum categories + topics)
  - robots.txt    (crawl rules + AI crawler allowances + sitemap reference)
  - llms.txt      (GEO summary for LLM/AI answer engines)
It also rewrites local development base URLs to the production base URL and
injects a rel=canonical link into every prerendered HTML page that lacks one.

Usage:
  python3 gen_seo.py [OUT_DIR] [BASE_URL]
"""
import glob
import html
import json
import os
import re
import sys

BASE = sys.argv[2] if len(sys.argv) > 2 else "https://daqi.app"
OUT = sys.argv[1] if len(sys.argv) > 1 else "/tmp/cf-out"
LOCAL_BASES = ("http://127.0.0.1:5173", "http://localhost:5173")

STATIC_PAGES = [
    ("/", "daily", "1.0"),
    ("/blog", "daily", "0.9"),
    ("/forum", "daily", "0.9"),
    ("/token", "weekly", "0.7"),
    ("/esim", "weekly", "0.7"),
    ("/vpn", "weekly", "0.7"),
]


def load(path):
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def iso_date(value):
    if not value:
        return None
    text = str(value)
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", text):
        return text
    return text[:10] if re.match(r"\d{4}-\d{2}-\d{2}", text) else None


def build_sitemap():
    urls = []

    def add(path, priority="0.6", changefreq="weekly", lastmod=None):
        entry = ["  <url>", f"    <loc>{html.escape(BASE + path)}</loc>"]
        if lastmod:
            entry.append(f"    <lastmod>{lastmod}</lastmod>")
        entry.append(f"    <changefreq>{changefreq}</changefreq>")
        entry.append(f"    <priority>{priority}</priority>")
        entry.append("  </url>")
        urls.extend(entry)

    for path, changefreq, priority in STATIC_PAGES:
        add(path, priority=priority, changefreq=changefreq)

    posts = load(os.path.join(OUT, "api/blog-posts.json"))["posts"]
    for post in posts:
        add(f"/blog/{post['slug']}", priority="0.8", changefreq="monthly", lastmod=iso_date(post.get("date")))

    cats = load(os.path.join(OUT, "api/forum-categories.json"))["categories"]
    for cat in cats:
        add(f"/forum/category/{cat['id']}", priority="0.6", changefreq="daily")

    topic_ids = []
    for fname in glob.glob(os.path.join(OUT, "api/forum-topic-*.json")):
        m = re.search(r"forum-topic-(\d+)\.json$", fname)
        if m and not re.search(r"-p\d+\.json$", fname):
            topic_ids.append(int(m.group(1)))
    for tid in sorted(set(topic_ids)):
        add(f"/forum/topic/{tid}", priority="0.5", changefreq="weekly")

    xml = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        *urls,
        "</urlset>",
        "",
    ]
    return "\n".join(xml), len(posts), len(cats), len(set(topic_ids))


def build_robots():
    return "\n".join(
        [
            "User-agent: *",
            "Allow: /",
            "Disallow: /admin",
            "Disallow: /admin/",
            "Disallow: /api/",
            "",
            "User-agent: GPTBot",
            "Allow: /",
            "",
            "User-agent: OAI-SearchBot",
            "Allow: /",
            "",
            "User-agent: ChatGPT-User",
            "Allow: /",
            "",
            "User-agent: ClaudeBot",
            "Allow: /",
            "",
            "User-agent: PerplexityBot",
            "Allow: /",
            "",
            "User-agent: Google-Extended",
            "Allow: /",
            "",
            "# AI/LLM documentation: " + BASE + "/llms.txt",
            "Sitemap: " + BASE + "/sitemap.xml",
            "",
        ]
    )


def build_llms():
    posts = load(os.path.join(OUT, "api/blog-posts.json"))["posts"]
    cats = load(os.path.join(OUT, "api/forum-categories.json"))["categories"]
    lines = [
        "# DaqiAPI",
        "",
        "> DaqiAPI is an OpenAI-compatible API gateway and storefront. Buy credits,",
        "> redeem a code, create an API token, and call chat, reasoning and embedding",
        "> models through a single OpenAI-compatible endpoint. The site also offers",
        "> eSIM data plans and VPN access.",
        "",
        "Key facts:",
        f"- API base URL: {BASE}/v1 (OpenAI-compatible)",
        "- Auth: Bearer token created in the account panel",
        "- Models: fast/mini, reasoning, and embedding model classes",
        "- Billing: prepaid credits, redeemed via redemption codes",
        "- Docs and guides: " + BASE + "/blog",
        "- Community forum: " + BASE + "/forum",
        "",
        "## Main pages",
        f"- [Home]({BASE}/): product overview, pricing and credit purchase",
        f"- [Blog]({BASE}/blog): integration guides, model selection and cost tips",
        f"- [Forum]({BASE}/forum): community discussions and announcements",
        f"- [Token]({BASE}/token): API token setup",
        f"- [eSIM]({BASE}/esim): eSIM data plans",
        f"- [VPN]({BASE}/vpn): VPN access",
        "",
        "## Guides",
    ]
    for post in posts:
        desc = (post.get("excerpt") or "").replace("\n", " ").strip()
        lines.append(f"- [{post['title']}]({BASE}/blog/{post['slug']}): {desc}")
    lines += ["", "## Forum categories"]
    for cat in cats:
        desc = (cat.get("description") or "").replace("\n", " ").strip()
        lines.append(f"- [{cat['name']}]({BASE}/forum/category/{cat['id']}): {desc}")
    lines.append("")
    return "\n".join(lines)


def canonical_path(rel):
    rel = rel.replace(os.sep, "/")
    if rel == "index.html":
        return "/"
    if rel == "blog.html":
        return "/blog"
    if rel == "forum.html":
        return "/forum"
    if rel.endswith(".html"):
        rel = rel[: -len(".html")]
    if rel.startswith("blog/") or rel.startswith("forum/"):
        if re.fullmatch(r"forum/category-\d+", rel):
            return "/forum/category/" + rel.rsplit("-", 1)[1]
        if re.fullmatch(r"forum/topic-\d+", rel):
            return "/forum/topic/" + rel.rsplit("-", 1)[1]
        return "/" + rel
    return "/" + rel


def rewrite_html():
    changed = 0
    canonical_added = 0
    for root, _dirs, files in os.walk(OUT):
        for name in files:
            if not name.endswith(".html"):
                continue
            path = os.path.join(root, name)
            rel = os.path.relpath(path, OUT)
            with open(path, encoding="utf-8") as fh:
                text = fh.read()
            original = text
            for local in LOCAL_BASES:
                text = text.replace(local, BASE)
            if 'rel="canonical"' not in text:
                href = BASE + canonical_path(rel)
                tag = f'<link rel="canonical" href="{href}">'
                if "</head>" in text:
                    text = text.replace("</head>", tag + "</head>", 1)
                else:
                    text = tag + text
                canonical_added += 1
            if text != original:
                with open(path, "w", encoding="utf-8") as fh:
                    fh.write(text)
                changed += 1
    return changed, canonical_added


def main():
    sitemap, posts, cats, topics = build_sitemap()
    with open(os.path.join(OUT, "sitemap.xml"), "w", encoding="utf-8") as fh:
        fh.write(sitemap)
    with open(os.path.join(OUT, "robots.txt"), "w", encoding="utf-8") as fh:
        fh.write(build_robots())
    with open(os.path.join(OUT, "llms.txt"), "w", encoding="utf-8") as fh:
        fh.write(build_llms())
    changed, canonical_added = rewrite_html()
    print(f"base={BASE}")
    print(f"sitemap.xml: {len(STATIC_PAGES)} static + {posts} posts + {cats} categories + {topics} topics")
    print(f"html rewritten: {changed} files, canonical added: {canonical_added}")


if __name__ == "__main__":
    main()
