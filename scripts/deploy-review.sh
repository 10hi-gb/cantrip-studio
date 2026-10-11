#!/usr/bin/env bash
# Two Versions review deploy. Same strip rules as /workspace/10hi-site-deploy/deploy.sh, using cp+find
# (no rsync). Project is fixed to the isolated review project; production is refused.
set -euo pipefail
REPO="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT="${1:-cantrip-two-versions-review}"
case "$PROJECT" in cantrip-studio|cantrip-studio-review) echo "Refusing $PROJECT: Two Versions is review-only on its own project" >&2; exit 1;; esac
STAGE="$REPO/public-stage"
rm -rf "$STAGE"; mkdir -p "$STAGE"
for p in "$REPO"/* ; do
  b=$(basename "$p")
  case "$b" in functions|migrations|scripts|public-stage|node_modules|wrangler.toml|package.json|package-lock.json) continue;; esac
  cp -a "$p" "$STAGE/"
done
cd "$STAGE"
find . \( -name '.git' -o -name '.wrangler' -o -name 'node_modules' -o -name 'writer' -o -name 'qa' -o -name 'creative' -o -name 'src' \) -prune -exec rm -rf {} +
find . -type f \( -name '.DS_Store' -o -name '*.md' -o -name '*.test.*' -o -name '*.spec.*' -o -name 'check-*.mjs' -o -name '*.sh' -o -name '*.tgz' \
  -o -name 'package.json' -o -name 'package-lock.json' -o -name '.cfignore' -o -name '.gitignore' -o -name '*.psd' -o -name '*bakery*' -o -name '*-cutout.png' \
  -o -name 'fortune-wafer-slip-stage.png' -o -name 'logo-landing.png' \) -delete
echo "Staged files: $(find . -type f | wc -l)"
export PATH="/home/box/.local/bin:/usr/local/bin:$PATH" WRANGLER_CACHE_DIR="${WRANGLER_CACHE_DIR:-/home/box/.cache/wrangler}"
cd "$REPO"   # functions/ and wrangler.toml (D1 binding) are read from here
npx --yes wrangler@4 d1 migrations apply cantrip-two-versions-review --remote
npx --yes wrangler@4 pages deploy "$STAGE" --project-name="$PROJECT" --branch main --commit-hash="$(git rev-parse HEAD)" --commit-dirty=true
