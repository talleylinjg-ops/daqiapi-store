#!/bin/bash
# Assemble the Cloudflare Pages deployment directory from:
#   - pre-rendered HTML (per-route static pages)
#   - built Vue assets
#   - exported API JSON (catalog / blog / forum data)
#   - static images (covers, flags, downloads)
set -e

EXPORT=/tmp/opencode/cf-export
DIST=/workspace/storefront/frontend/dist
OUT=/workspace/cloudflare/static

rm -rf "$OUT"
mkdir -p "$OUT/static"

# 1. Pre-rendered pages (index, token, esim, vpn, blog, forum, posts, forum subpages)
cp -r "$EXPORT/prerendered/." "$OUT/"

# 2. Built JS/CSS assets
cp -r "$DIST/assets" "$OUT/assets"

# 3. API data as static JSON (served at /api/*)
mkdir -p "$OUT/api"
cp "$EXPORT/api/packages-token.json" "$OUT/api/packages.json"
cp "$EXPORT/api/categories.json" "$OUT/api/categories.json"
cp "$EXPORT/api/blog-posts.json" "$OUT/api/blog-posts.json"
cp "$EXPORT/api/reply-templates.json" "$OUT/api/reply-templates.json"
cp "$EXPORT/api/models.json" "$OUT/api/models.json"
cp "$EXPORT/api/vpn-status.json" "$OUT/api/vpn-status.json"
cp "$EXPORT/api/esim-compare.json" "$OUT/api/esim-compare.json"
cp "$EXPORT/api/esim-countries.json" "$OUT/api/esim-countries.json"
cp "$EXPORT/api/forum-categories.json" "$OUT/api/forum-categories.json"
cp "$EXPORT/api/forum-topics-1.json" "$OUT/api/forum-topics-1.json"
cp "$EXPORT/api/forum-topic-1.json" "$OUT/api/forum-topic-1.json"
cp "$EXPORT/api/forum-topics-2.json" "$OUT/api/forum-topics-2.json"
cp "$EXPORT/api/forum-topics-3.json" "$OUT/api/forum-topics-3.json"
cp "$EXPORT/api/forum-topics-4.json" "$OUT/api/forum-topics-4.json"
cp "$EXPORT/api/forum-topics-5.json" "$OUT/api/forum-topics-5.json"
cp -r "$EXPORT/api/posts" "$OUT/api/posts"
cp -r "$EXPORT/api/comments" "$OUT/api/comments"

# 4. Static images
cp -r "$EXPORT/covers" "$OUT/static/covers"
cp -r "$EXPORT/flags" "$OUT/static/flags"
cp -r "$EXPORT/downloads" "$OUT/static/downloads"

# 5. Public assets from Vue dist (flags/downloads already copied; keep structure)
[ -d "$DIST/flags" ] && cp -r "$DIST/flags" "$OUT/flags" 2>/dev/null || true
[ -d "$DIST/downloads" ] && cp -r "$DIST/downloads" "$OUT/downloads" 2>/dev/null || true

echo "Assembled $OUT"
du -sh "$OUT"

# 6. Patch dev-server asset refs to the built Vite bundle.
"$(dirname "$0")/patch_html.sh" "$OUT"

