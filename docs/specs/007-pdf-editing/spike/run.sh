#!/usr/bin/env bash
# Reruns the 007.01 spike. Needs: bun, python3 with reportlab, poppler-utils,
# mupdf-tools (mutool), and ghostscript. Run from this folder.
set -euo pipefail
bun install --silent
mkdir -p fixtures out/a out/b renders
python3 fixtures.py fixtures
sha256sum fixtures/*.pdf > fixtures.sha256
for engine in a b; do
  for run in form:form scanned:scanned annotated:annotated encrypted-owner:form encrypted-user:form; do
    bun "engine-$engine.mjs" "${run%%:*}" "${run##*:}" | tail -1
  done
done
echo "== sources unchanged"; sha256sum -c fixtures.sha256
for engine in a b; do
  for name in form scanned annotated; do
    file="out/$engine/$name.pdf"
    echo "== $file"
    pdfinfo "$file" | grep -E "^Pages"
    echo "ghostscript errors and warnings: $(gs -q -dNOPAUSE -dBATCH -sDEVICE=nullpage "$file" 2>&1 | grep -ciE 'error|warning' || true)"
    mutool run inspect.js "$file"
    pdftoppm -r 40 -png "$file" "renders/$engine-$name"
  done
done
bun pdfjs-check.mjs out/a/*.pdf out/b/*.pdf
