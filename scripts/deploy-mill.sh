#!/usr/bin/env bash
# Mill review deploy: a git archive of HEAD (committed tree only) to the isolated review project, preview branch only.
set -euo pipefail
REPO="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT="cantrip-oct13-review"; BRANCH="mill-2026-10-16"
[ "$(git -C "$REPO" rev-parse --abbrev-ref HEAD)" = "$BRANCH" ] || { echo "Not on $BRANCH" >&2; exit 1; }
[ -z "$(git -C "$REPO" status --porcelain)" ] || { echo "Uncommitted changes; commit first" >&2; exit 1; }
STAGE="${STAGE:-/tmp/mill-stage}"; rm -rf "$STAGE"; mkdir -p "$STAGE"
git -C "$REPO" archive HEAD | tar -x -C "$STAGE"
echo "Staged files: $(find "$STAGE" -type f | wc -l) from $(git -C "$REPO" rev-parse HEAD)"
export PATH="/home/box/.local/bin:/usr/local/bin:$PATH" WRANGLER_CACHE_DIR="${WRANGLER_CACHE_DIR:-/home/box/.cache/wrangler}"
cd "$REPO"
npx --yes wrangler@4 pages deploy "$STAGE" --project-name="$PROJECT" --branch "$BRANCH" --commit-hash="$(git rev-parse HEAD)" --commit-message="Mill review $(git rev-parse --short=8 HEAD)" --commit-dirty=true
