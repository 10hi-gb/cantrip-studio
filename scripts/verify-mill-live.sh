#!/usr/bin/env bash
# Byte-compare every committed mill/ file (plus root _headers effect) against a live deployment URL.
set -uo pipefail
BASE="$1"; REPO="$(cd "$(dirname "$0")/.." && pwd)"; ok=0; bad=0
while read -r f; do
  url="$BASE/$f"; case "$f" in */index.html) url="$BASE/${f%index.html}";; *.html) url="$BASE/${f%.html}";; esac
  want=$(git -C "$REPO" show "HEAD:$f" | sha256sum | cut -c1-64); got=$(curl -sfL "$url" | sha256sum | cut -c1-64)
  if [ "$want" = "$got" ]; then ok=$((ok+1)); else bad=$((bad+1)); echo "MISMATCH $f"; fi
done < <(git -C "$REPO" ls-tree -r --name-only HEAD mill/)
echo "byte-compare: $ok match, $bad mismatch ($BASE)"
csp=$(curl -sI "$BASE/mill/split-the-sack/" | tr -d '\r' | grep -i '^content-security-policy:'); echo "$csp" | grep -q "connect-src 'none'" && echo "CSP ok: $csp" || echo "CSP MISSING"
[ "$bad" = 0 ]
