#!/usr/bin/env bash
# Mill review deploy: a git archive of HEAD (committed tree only) to the isolated review project, preview branch only.
set -euo pipefail
REPO="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT="cantrip-oct13-review"; BRANCH="mill-2026-10-16"
[ "$(git -C "$REPO" rev-parse --abbrev-ref HEAD)" = "$BRANCH" ] || { echo "Not on $BRANCH" >&2; exit 1; }
[ -z "$(git -C "$REPO" status --porcelain)" ] || { echo "Uncommitted changes; commit first" >&2; exit 1; }
STAGE="${STAGE:-/tmp/mill-stage}"; rm -rf "$STAGE"; mkdir -p "$STAGE"
git -C "$REPO" archive HEAD | tar -x -C "$STAGE"
# D6: stamp the stage (not git) with the deployed commit + per-piece tree ids for the hub's self-check freshness line.
{ echo "// Written by scripts/deploy-mill.sh at deploy time (not in git)."; printf 'window.MILL_BUILD = {"commit":"%s","trees":{' "$(git -C "$REPO" rev-parse HEAD)"; sep=""
  for d in $(git -C "$REPO" ls-tree -d --name-only HEAD mill/); do slug="${d#mill/}"; [ -n "$(git -C "$REPO" ls-tree --name-only HEAD "$d/index.html")" ] || continue; printf '%s"%s":"%s"' "$sep" "$slug" "$(git -C "$REPO" rev-parse "HEAD:$d")"; sep=","; done; echo '}};'; } > "$STAGE/mill/build-info.js"
echo "Staged files: $(find "$STAGE" -type f | wc -l) from $(git -C "$REPO" rev-parse HEAD)"
export PATH="/home/box/.local/bin:/usr/local/bin:$PATH" WRANGLER_CACHE_DIR="${WRANGLER_CACHE_DIR:-/home/box/.cache/wrangler}"
cd "$REPO"
npx --yes wrangler@4 pages deploy "$STAGE" --project-name="$PROJECT" --branch "$BRANCH" --commit-hash="$(git rev-parse HEAD)" --commit-message="Mill review $(git rev-parse --short=8 HEAD)" --commit-dirty=true
