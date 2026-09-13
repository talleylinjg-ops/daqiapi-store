#!/bin/bash
# Patch all prerendered HTML: replace dev-server asset refs with the built
# Vite assets so Cloudflare Pages serves the real JS/CSS bundle.
set -e
OUT=${1:-/workspace/cloudflare/static}
cd "$OUT"

JS=$(ls assets/index-*.js | head -1 | xargs basename)
CSS=$(ls assets/index-*.css | head -1 | xargs basename)

mapfile -t HTMLS < <(find . -name '*.html' -not -path './node_modules/*')

python3 - "$JS" "$CSS" "${HTMLS[@]}" << 'PYEOF'
import re, sys
js, css = sys.argv[1], sys.argv[2]
htmls = sys.argv[3:]
for f in htmls:
    h = open(f).read()
    orig = h
    h = re.sub(r'<script[^>]*src="[^"]*@vite/client[^"]*"[^>]*></script>', '', h)
    h = re.sub(r'<script[^>]*src="[^"]*src/main\.js[^"]*"[^>]*></script>', '', h)
    h = re.sub(r'<script[^>]*src="/assets/index-[^"]+\.js"[^>]*></script>', '', h)
    h = re.sub(r'<link[^>]*href="/assets/index-[^"]+\.css"[^>]*>', '', h)
    inject = f'<script type="module" crossorigin src="/assets/{js}"></script>'
    csslink = f'<link rel="stylesheet" crossorigin href="/assets/{css}">'
    if 'assets/' + js not in h:
        h = h.replace('</body>', inject + '\n' + '</body>')
    if 'assets/' + css not in h:
        h = h.replace('</head>', csslink + '\n' + '</head>')
    if h != orig:
        open(f, 'w').write(h)
        print('patched', f)
PYEOF
echo "Done. JS=$JS CSS=$CSS files=${#HTMLS[@]}"
