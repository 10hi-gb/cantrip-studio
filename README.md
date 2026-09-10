# 10hi site (foundation placeholder)

Local web root for Cantrip Studio / 10hoursindustries.

```
site/
  index.html           # home — never fails
  assets/logo.svg      # placeholder mark → home
  still-have-it/       # kebab-case cantrip mini-site
    index.html
```

## Run

```bash
cd /Users/10hi/Projects/cantrip-studio/site
python3 -m http.server 8790
```

Open http://127.0.0.1:8790/

## Convention

- Home at `/`
- Each cantrip: `/kebab-name/index.html`
- Cantrip pages: upper-left logo only → `/` (no other site chrome)

Real look / deploy after Creative ≥8 lock + Cloudflare path unblocked.
