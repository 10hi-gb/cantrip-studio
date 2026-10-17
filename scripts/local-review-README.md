# Cantrip Studio Mill: LOCALHOST-PREVIEW review build

**LOCALHOST-PREVIEW, NOT A DEPLOYED PIN.** Nothing here was deployed, posted or published.

- Commit: `{SHA}` (branch mill-2026-10-16), exported from a clean `git worktree` of that exact SHA.
- Built: {BUILT} by `scripts/build-local-review.py`, using the same `scripts/mill_stage.py` hygiene as a deploy.
- `mill/build-info.js` says `"commit": "{SHA}"` and `"label": "localhost-preview, not a deployed pin"`.
- Pieces in this build (linked from the hub): {PIECES}.

## Open it on a Mac
1. Unzip: `unzip mill-review-local-{SHA}.zip` (it makes a folder `mill-review-local-<first 12 of the SHA>`).
2. `cd mill-review-local-*`
3. `python3 -m http.server 8000`
4. Open http://localhost:8000/ (the studio front page). The Mill review hub is http://localhost:8000/mill/ and each piece is http://localhost:8000/mill/<piece>/ (for example http://localhost:8000/mill/one-less-trip/).

## Open it on a phone on the same Wi-Fi
1. On the Mac, start the server so other devices can reach it: `python3 -m http.server 8000 --bind 0.0.0.0`
2. Find the Mac's IP: `ipconfig getifaddr en0` (use `en1` if en0 prints nothing).
3. On the phone, open `http://<that IP>:8000/mill/`. If it doesn't load, allow incoming connections for Python in macOS's firewall prompt.

## Does file:// work? (double-clicking index.html)
{FILE_RESULTS}

Use the local server above for any real review: it's the only way that matches how the pages are served.

## Security headers in this build
`python3 -m http.server` can't send the `_headers` file, so the Content-Security-Policy from `_headers` is injected into every HTML page ({CSP_PAGES} pages) as `<meta http-equiv="Content-Security-Policy">`. Browsers ignore `frame-ancestors`, `report-uri` and `sandbox` in a meta tag, so those directives were dropped from the meta copy (they stay in `_headers` for a real deploy). The other `_headers` lines (Referrer-Policy, Permissions-Policy, COOP, X-Robots-Tag, nosniff) are not applied by a plain local server. `connect-src 'none'` still blocks any network call from the pages, and every font, script and style is self-hosted.

## Status of each piece (taken ONLY from QA's latest verdict files)
{STATUS}

- Anything QA failed stays **NOT READY**, including everything QA scored on deployed pin 83a2ebcd. A piece with no QA verdict is NOT READY.
- "deployed pin …" means QA's verdict came from a deployed Cloudflare Pages preview. "localhost-preview" means QA ran on a local build like this one.
- This build contains fixes made after those verdicts. They have only been self-checked by the Engineer on localhost (ENGINEER SELF-CHECK, not QA). They are not QA results and don't change the statuses above.
