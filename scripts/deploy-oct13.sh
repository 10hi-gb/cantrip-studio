#!/usr/bin/env bash
# Oct 13 batch review deploy. Stages ONLY the batch folders (cp + strip), deploys to the isolated review project.
set -euo pipefail
REPO="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT="${PROJECT:-cantrip-oct13-review}"
case "$PROJECT" in cantrip-studio|cantrip-studio-review|cantrip-two-versions-review) echo "Refusing $PROJECT" >&2; exit 1;; esac
SLUGS="bad-on-purpose one-across annual-review here-it-comes monster-mouth our-knock eyes-closed score-this this-light wishbone cheers where-you-paused"
STAGE="${STAGE:-/tmp/oct13-stage}"
rm -rf "$STAGE"; mkdir -p "$STAGE"
git -C "$REPO" show HEAD:oct13/_headers > "$STAGE/_headers"; git -C "$REPO" show HEAD:oct13/index.html > "$STAGE/index.html"; git -C "$REPO" show HEAD:oct13/oct13.css > "$STAGE/oct13.css"
# stage from the committed tree only (git archive HEAD), so the deploy matches the commit exactly
TMP=$(mktemp -d); git -C "$REPO" archive HEAD | tar -x -C "$TMP"
for s in $SLUGS; do if [ -d "$TMP/$s" ]; then cp -a "$TMP/$s" "$STAGE/"; fi; done; rm -rf "$TMP"
cd "$STAGE"
find . \( -name '.git' -o -name 'node_modules' -o -name 'tests' -o -name 'test' -o -name 'notes' -o -name 'writer' -o -name 'qa' -o -name 'creative' \) -prune -exec rm -rf {} +
find . -type f \( -name '*.md' -o -name '*.test.*' -o -name '*.spec.*' -o -name '*.sh' -o -name '*.txt' -o -name '.DS_Store' -o -name 'NOTES*' \) -delete
echo "Staged files: $(find . -type f | wc -l)"
export PATH="/home/box/.local/bin:/usr/local/bin:$PATH" WRANGLER_CACHE_DIR="${WRANGLER_CACHE_DIR:-/home/box/.cache/wrangler}"
cd "$REPO"
npx --yes wrangler@4 pages deploy "$STAGE" --project-name="$PROJECT" --branch main --commit-hash="$(git rev-parse HEAD)" --commit-dirty=true
