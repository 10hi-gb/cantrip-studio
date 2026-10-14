#!/usr/bin/env python3
"""Regenerate /review/: items.json (status/url per pin) + index.html with embedded data (no fetch, CSP-strict).
usage: hub-build.py "<updated PT>" SLUG=Status ...   (Play links are relative, so they always open the pin serving the hub)"""
import json,sys,html,re
R='oct13/review/'; d=json.load(open(R+'items.json'))
SL={'C148':'bad-on-purpose','C083':'one-across','C193':'annual-review','C106':'here-it-comes','C203':'monster-mouth','C051':'our-knock','C085':'eyes-closed','C086':'score-this','C042':'this-light','C104':'wishbone','C088':'cheers','C198':'where-you-paused','C050':'a-plant-from-this','C087':'wear-this','C102':'fogged-over','C092':'catch-this-yawn','C095':'taste-like-this','C049':'until-then','C137':'permission-slip','C199':'dont-mention-it','C200':'ask-me-at-four','C201':'broken-telephone'}
d['updated']=sys.argv[1]
for a in sys.argv[2:]:
  k,v=a.split('=',1); st,_,note=v.partition('|')
  for i in d['items']:
    if i['id']==k: i['status']=st; i['url']='../'+SL[k]+'/'; i['note']=note or i['note']
json.dump(d,open(R+'items.json','w'),indent=1,ensure_ascii=False); open(R+'items.json','a').write('\n')
emb=json.dumps(d,ensure_ascii=False).replace('<','\\u003c')
open(R+'index.html','w').write(f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer">
<title>Cantrip review</title><link rel="stylesheet" href="review.css"><script src="review.js" defer></script></head><body><main>
<h1>Cantrip review: {len(d["items"])} prototypes</h1>
<p class="sub" id="upd"></p>
<div id="list"></div>
<noscript><p>This list needs JavaScript to display.</p></noscript>
</main>
<script type="application/json" id="data">{emb}</script>
</body></html>
''')
