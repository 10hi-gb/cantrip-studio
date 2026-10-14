#!/usr/bin/env python3
# Generates oct13/review/index.html (review hub for all 22). Static, no scripts, no storage, same CSP.
import html
QA="qa"; SELF="self"; BUILD="build"
A=[("C148","bad-on-purpose","Bad on Purpose"),("C083","one-across","One Across"),("C193","annual-review","Annual Review of You"),("C106","here-it-comes","Here It Comes"),
   ("C203","monster-mouth","Monster Mouth"),("C051","our-knock","Our Knock"),("C085","eyes-closed","Eyes Closed"),("C086","score-this","Score This"),
   ("C042","this-light","This Light"),("C104","wishbone","Wishbone"),("C088","cheers","Cheers"),("C198","where-you-paused","Where You Paused")]
B=[("C050","a-plant-from-this","A Plant From This"),("C087","wear-this","Wear This"),("C102","fogged-over","Fogged Over"),("C092","catch-this-yawn","Catch This Yawn"),
   ("C095","taste-like-this","Taste Like This"),("C049","until-then","Until Then"),("C137","permission-slip","Permission Slip"),("C199","dont-mention-it","Don't Mention It"),
   ("C200","ask-me-at-four","Ask Me At Four"),("C201","broken-telephone","Broken Telephone")]
# status per id: (label-class, label text, known limitations)
A_NOTE="Independent QA passed on pin 2f9a934d (Cantrip QA). Since then: copy-key rewiring only (identical wording), engineer self-checked."
ST={}
for c,_,_ in A: ST[c]=(QA,"Independent QA passed (pin 2f9a934d)",A_NOTE)
ST["C203"]=(QA,"Independent QA passed with copy gaps (pin 2f9a934d)","QA passed with copy gaps (Undo/Clear, canvasAria); those keys are now wired, engineer self-checked.")
ST["C085"]=(QA,"Independent QA passed with copy gap (pin 2f9a934d)","QA passed with copy gap (canvasAria); now wired, engineer self-checked.")
import json,sys
extra=json.load(open(sys.argv[1])) if len(sys.argv)>1 else {}
for c,_,_ in B: ST[c]=tuple(extra.get(c,(BUILD,"Building","Not built yet.")))
def items(lst):
    out=[]
    for c,s,t in lst:
        cls,lab,lim=ST[c]; live=cls!=BUILD
        name=('<a href="../%s/">%s</a>'%(s,html.escape(t))) if live else html.escape(t)
        out.append('<li>%s<span class="id">%s</span><br><span class="st %s">%s</span><p class="lim">%s</p></li>'%(name,c,cls,html.escape(lab),html.escape(lim)))
    return "\n".join(out)
page='''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer">
<title>Cantrip Studio · Review hub</title><meta name="robots" content="noindex"><link rel="stylesheet" href="hub.css"></head><body><main>
<p class="meta">Cantrip Studio · review build (oct13-batch) · this page is part of the pinned deploy you are viewing</p>
<h1>Review hub: all 22 prototypes</h1>
<p class="key">Labels are honest: <b>Independent QA passed</b> only where Cantrip QA explicitly passed it; <b>Engineer self-check only</b> means built and tested by the engineer, not yet independently verified; <b>Building</b> means not playable yet. Nothing here stores or uploads what you type; shared links carry their content and anyone with a link can read it.</p>
<h2>Batch A (12)</h2><ul>
%s
</ul><h2>Batch B (10)</h2><ul>
%s
</ul></main></body></html>
'''%(items(A),items(B))
open("oct13/review/index.html","w").write(page)
print("hub written")
