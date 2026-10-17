// GENERATED from hub.json by build-hub.py. Do not edit.
window.MILL_HUB = {
 "title": "Cantrip Studio · Mill sprint 2026-10-16",
 "note": "Review prototype; not a production release. Scope and score proposed by the Cantrip agents under Joshua's authorization; scores are the rubric scores recorded in QUEUE.md. Source links are the permalinks recorded in QUEUE.md; none are invented.",
 "sharedLimits": [
  "The source thread doesn't directly ask for any of the Wave 1 or Wave 2 tools, so those scores rest on scopes proposed by the Cantrip agents under Joshua's authorization, not on commenter demand.",
  "Every piece is memory-only: nothing is uploaded or stored. A link carries its content, anyone holding the link can read it, and it may stay in browser history.",
  "Engineer self-check is the builder checking their own work. It is not QA."
 ],
 "pieces": [
  {
   "id": "P001",
   "name": "Split the Sack",
   "score": "8.35",
   "wave": 1,
   "path": "split-the-sack/",
   "sources": [
    "https://www.reddit.com/r/ClaudeAI/comments/1x2srd4/can_we_please_start_building_apps_and_systems_to/pf5j98h/"
   ],
   "limits": [
    "Loose support only: the seed comment is about a grocery co-op, and no comment mentions splitting a bulk buy.",
    "One item, one unit, one currency per split. No savings, purchase or payment features.",
    "Fee rule: by amount, the fee is split over all quantity and the unclaimed row carries its own fee share until someone takes it or the sender assigns it; equal, the fee is split among households taking some, and with no takers the split is blocked.",
    "Recipients see a read-only split. \"Change my amount\" makes a new link on the recipient's device; it does not update or notify the sender."
   ],
   "engineer": {
    "pin": "83a2ebcd",
    "commit": "d37121e7f446865ae3e7e930042ffb1582390070",
    "tree": "dd88bafd8539e76efa7a2ffbc142dfb3a1a6fd6d",
    "result": "unit tests 21+5 pass; live browser check 107/107 at 320/390/1280 (incl. D1-D4 checks, read-only recipient, fee rule); byte-compare 65/65."
   },
   "status": "NOT READY",
   "qaLocal": {
    "verdict": "NOT READY",
    "label": "LOCALHOST-PREVIEW",
    "sha": "652d0e038d7033812cf6954e32576cd794ad896e",
    "report": "qa/split-the-sack/local-652d0e0/QA-local-652d0e0.md"
   },
   "qaDeployed": {
    "pin": "83a2ebcd",
    "verdict": "FAIL",
    "commit": "d37121e7f446865ae3e7e930042ffb1582390070"
   }
  },
  {
   "id": "P003",
   "name": "Before You Go",
   "score": "7.75",
   "wave": 1,
   "path": "before-you-go/",
   "sources": [
    "https://www.reddit.com/r/ClaudeAI/comments/1x2srd4/can_we_please_start_building_apps_and_systems_to/pf5a6mv/",
    "https://www.reddit.com/r/ClaudeAI/comments/1x2srd4/can_we_please_start_building_apps_and_systems_to/pf89iw1/",
    "https://www.reddit.com/r/ClaudeAI/comments/1x2srd4/can_we_please_start_building_apps_and_systems_to/pf8nce7/"
   ],
   "limits": [
    "No comment mentions calling ahead.",
    "Questions come from a fixed generic checklist. It knows nothing about any real place."
   ],
   "engineer": {
    "pin": "83a2ebcd",
    "commit": "d37121e7f446865ae3e7e930042ffb1582390070",
    "tree": "1f37ffe0ce0236ea213816e7f4cdf74961bf59c9",
    "result": "unit tests 9 pass; live browser check 81/81 at 320/390/1280; byte-compare 65/65."
   },
   "status": "NOT READY",
   "qaLocal": {
    "verdict": "NOT READY",
    "label": "LOCALHOST-PREVIEW",
    "sha": "652d0e038d7033812cf6954e32576cd794ad896e",
    "report": "qa/before-you-go/local-652d0e0/QA-local-652d0e0.md"
   },
   "qaDeployed": {
    "pin": "83a2ebcd",
    "verdict": "FAIL",
    "commit": "d37121e7f446865ae3e7e930042ffb1582390070"
   }
  },
  {
   "id": "P002",
   "name": "One Small Ask",
   "score": "7.70",
   "wave": 1,
   "path": "one-small-ask/",
   "sources": [
    "https://www.reddit.com/r/ClaudeAI/comments/1x2srd4/can_we_please_start_building_apps_and_systems_to/pf5o31i/",
    "https://www.reddit.com/r/ClaudeAI/comments/1x2srd4/can_we_please_start_building_apps_and_systems_to/pf6gfqe/",
    "https://www.reddit.com/r/ClaudeAI/comments/1x2srd4/can_we_please_start_building_apps_and_systems_to/pgdhlk9/"
   ],
   "limits": [
    "No comment mentions a counteroffer.",
    "Replies travel only by a link the recipient chooses to send back. It never tells the asker anything by itself."
   ],
   "engineer": {
    "pin": "83a2ebcd",
    "commit": "d37121e7f446865ae3e7e930042ffb1582390070",
    "tree": "f83c650c08b683a712f9d700e4ff76e66f756316",
    "result": "unit tests 11 pass; live browser check 81/81 at 320/390/1280; byte-compare 65/65."
   },
   "status": "NOT READY",
   "qaLocal": {
    "verdict": "NOT READY",
    "label": "LOCALHOST-PREVIEW",
    "sha": "652d0e038d7033812cf6954e32576cd794ad896e",
    "report": "qa/one-small-ask/local-652d0e0/QA-local-652d0e0.md"
   },
   "qaDeployed": {
    "pin": "83a2ebcd",
    "verdict": "FAIL",
    "commit": "d37121e7f446865ae3e7e930042ffb1582390070"
   }
  },
  {
   "id": "P004",
   "name": "One Less Trip",
   "score": "7.70",
   "wave": 2,
   "path": "one-less-trip/",
   "sources": [],
   "limits": [
    "No direct comment in the thread; scope proposed by the Cantrip agents under Joshua's authorization.",
    "No map, routing or live list.",
    "Stop names that differ only in capital letters or spaces are treated as the same stop.",
    "Merging needs an exact item name and unit match; near-matches (\"Oat milks\", \"litre\" vs \"l\") stay separate."
   ],
   "engineer": {
    "pin": "83a2ebcd",
    "commit": "d37121e7f446865ae3e7e930042ffb1582390070",
    "tree": "b436439c6fafa24c13bf8e20dc5a3f34a660b771",
    "result": "unit tests 15 pass; live browser check 84/84 at 320/390/1280; byte-compare 65/65."
   },
   "status": "NOT READY",
   "qaLocal": {
    "verdict": "NOT READY",
    "label": "LOCALHOST-PREVIEW",
    "sha": "652d0e038d7033812cf6954e32576cd794ad896e",
    "report": "qa/one-less-trip/local-652d0e0/QA-local-652d0e0.md"
   },
   "qaDeployed": {
    "pin": "83a2ebcd",
    "verdict": "FAIL",
    "commit": "d37121e7f446865ae3e7e930042ffb1582390070"
   }
  },
  {
   "id": "P005",
   "name": "The Same Hour",
   "score": "7.35",
   "wave": 2,
   "path": "the-same-hour/",
   "sources": [],
   "limits": [
    "No direct comment in the thread; scope proposed by the Cantrip agents under Joshua's authorization.",
    "Manual entry only. No calendar access. One time zone per week; everyone's times are read in that zone.",
    "A day with no times for someone is unknown, never free; it is never offered as a shared time.",
    "Times the clocks skip or repeat on a daylight-saving change are refused, never moved or guessed. Lengths are real elapsed time across a change.",
    "Nothing is sent or booked. A proposal is a suggestion worked out from what the sender typed; nobody has replied to it."
   ],
   "engineer": "ENGINEER SELF-CHECK on localhost-preview 715aa3a: unit 19 incl. DST; browser 116/116 at 320/390/1280. Not QA.",
   "status": "NOT READY",
   "qaLocal": {
    "verdict": "NOT READY",
    "label": "LOCALHOST-PREVIEW",
    "sha": "715aa3a42da68f1c1e339b396cb6611f49c7ba46",
    "report": "qa/the-same-hour/local-715aa3a/QA-local-715aa3a.md"
   }
  },
  {
   "id": "P006",
   "name": "Even Up",
   "status": "QUEUED, NOT BUILT",
   "path": null,
   "limits": [
    "Undercut in the thread; no claim of fewest transfers. Moves no money."
   ]
  },
  {
   "id": "P018",
   "name": "Left or Right (original scope)",
   "status": "QUEUED, NOT BUILT",
   "path": null,
   "limits": [
    "Not a communication aid.",
    "A real switch and dwell accessibility check has not been done; synthetic tests don't count as that check."
   ]
  },
  {
   "id": "P017",
   "name": "Care Rota r1c",
   "status": "QUEUED, NOT BUILT",
   "path": null,
   "limits": [
    "Lines that combine needs or people are set aside with a request to split them, never guessed.",
    "Nothing is booked or confirmed."
   ]
  },
  {
   "id": "P012",
   "name": "Five Hands r1c (narrow)",
   "status": "QUEUED, NOT BUILT",
   "path": null,
   "limits": [
    "Narrow r1c scope only."
   ]
  }
 ]
};
