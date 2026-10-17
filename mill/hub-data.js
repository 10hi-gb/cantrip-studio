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
    "Recipients see a read-only split. \"Change my amount\" makes a new link on the recipient's device; it does not update or notify the sender.",
    "Not tested: Change my amount link at the 2,000-character boundary."
   ],
   "engineer": "ENGINEER SELF-CHECK on localhost-preview 134da28501527078776b63b0ffdc973de96b110e: unit 21+8; browser sack 410/410 at 305/320/390/600/1280 (incl. QA D7r received origin+path+fragment cap at 1999/2000/2001/2040, normal and long path; D10-r5 at-cap names in full, no ellipsis, sender/recipient/change/print + Letter PDF; D2 kept); quote-spoof 63/63, recipient-a11y 87/87, sender-typed 12/12. Not QA.",
   "status": "READY ON LOCALHOST-PREVIEW (deployed pin FAIL; shared wrap f893087, recheck pending)",
   "qaLocal": {
    "verdict": "READY",
    "label": "LOCALHOST-PREVIEW",
    "sha": "48156f86a8dd9d1bbd9d52ceceaf34db18ddfdd5",
    "report": "qa/split-the-sack/local-48156f8/QA-local-48156f8.md",
    "note": "Not tested: Change my amount link at the 2,000-character boundary."
   },
   "qaPrevious": {
    "verdict": "READY",
    "label": "LOCALHOST-PREVIEW",
    "sha": "134da28501527078776b63b0ffdc973de96b110e",
    "report": "qa/split-the-sack/local-134da28/QA-local-134da28.md"
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
   "status": "READY ON LOCALHOST-PREVIEW (deployed pin FAIL; shared wrap f893087, recheck pending)",
   "qaLocal": {
    "verdict": "READY",
    "label": "LOCALHOST-PREVIEW",
    "sha": "b225af5b4bd505a737e46a9f78374d6d77bd5b28",
    "report": "qa/before-you-go/local-b225af5/QA-local-b225af5.md"
   },
   "qaPrevious": {
    "verdict": "READY",
    "label": "LOCALHOST-PREVIEW",
    "sha": "774b68d4a03a7d5c0fa0e64fd4a2f0de40497f06",
    "report": "qa/before-you-go/local-774b68d/QA-local-774b68d.md"
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
   "status": "READY ON LOCALHOST-PREVIEW (deployed pin FAIL; shared wrap f893087, recheck pending)",
   "qaLocal": {
    "verdict": "READY",
    "label": "LOCALHOST-PREVIEW",
    "sha": "eade562ddc783558ad2068f927f7aa576e60dd50",
    "report": "qa/one-small-ask/local-eade562/QA-local-eade562.md"
   },
   "qaPrevious": {
    "verdict": "READY",
    "label": "LOCALHOST-PREVIEW",
    "sha": "7add2de13797af5b9bc68ffd8b94f258b241d945",
    "report": "qa/one-small-ask/local-7add2de/QA-local-7add2de.md"
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
   "status": "READY ON LOCALHOST-PREVIEW (deployed pin FAIL; shared wrap f893087, recheck pending)",
   "qaLocal": {
    "verdict": "READY",
    "label": "LOCALHOST-PREVIEW",
    "sha": "6169c34f07ac2c8b51e4066d3acc76e5fee1a3f9",
    "report": "qa/one-less-trip/local-6169c34/QA-local-6169c34.md"
   },
   "qaPrevious": {
    "verdict": "READY",
    "label": "LOCALHOST-PREVIEW",
    "sha": "bc74052a02d8603a4ec1feeaff647920ea150886",
    "report": "qa/one-less-trip/local-bc74052/QA-local-bc74052.md"
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
   "status": "READY ON LOCALHOST-PREVIEW (hardening afb31b8, untested; shared wrap f893087, recheck pending)",
   "qaLocal": {
    "verdict": "READY",
    "label": "LOCALHOST-PREVIEW",
    "sha": "88869436943a40e949ac4445487912cc14bec828",
    "report": "qa/the-same-hour/local-8886943/QA-local-8886943.md",
    "note": "hardening afb31b8, untested"
   },
   "qaPrevious": {
    "verdict": "READY",
    "label": "LOCALHOST-PREVIEW",
    "sha": "14df77a1622593f85adf2d50ba8a0369390c37c6",
    "report": "qa/the-same-hour/local-14df77a/QA-local-14df77a.md"
   }
  },
  {
   "id": "P006",
   "name": "Even Up",
   "score": "7.30",
   "wave": 2,
   "path": "even-up/",
   "sources": [
    "https://www.reddit.com/r/ClaudeAI/comments/1x2srd4/can_we_please_start_building_apps_and_systems_to/pf7jx23/"
   ],
   "limits": [
    "Undercut in the thread; no claim of fewest transfers. Moves no money.",
    "One event, 2 to 8 people, up to 20 expenses, each split equally or by weight. Amounts are whole cents; leftover cents go to the largest fractions first, ties to whoever is listed first.",
    "The payments shown are one simple way to settle everyone to zero; they aren't necessarily the fewest. Nothing is paid, sent or linked to a bank.",
    "Currency is picked from $, € or £; there is no conversion. Refunds and negative amounts aren't supported.",
    "A received link is a snapshot of what the sender entered; nobody has agreed to anything by opening it."
   ],
   "engineer": "ENGINEER SELF-CHECK on localhost-preview 6f5f5435f607b901a8fae6cd674e704af77f1324: unit 21 (incl. 5000-case settlement property test); browser 312/312 at 320/360/390/700–999/1280/1440. Not QA.",
   "status": "READY ON LOCALHOST-PREVIEW (also READY at 5ad5c277f48e52f1864513b3bfca3782b25fe79f; wrap prep b5b0d60, untested; query-strip 649874e, untested; shared wrap f893087, recheck pending; receive cap: Engineer self-check only; independent QA check pending)",
   "qaLocal": {
    "verdict": "READY",
    "label": "LOCALHOST-PREVIEW",
    "sha": "6f5f5435f607b901a8fae6cd674e704af77f1324",
    "report": "qa/even-up/local-6f5f543/QA-local-6f5f543.md",
    "note": "wrap prep b5b0d60, untested; query-strip 649874e, untested; receive cap: Engineer self-check only; independent QA check pending"
   }
  },
  {
   "id": "P018",
   "name": "Left or Right (original scope)",
   "score": "7.05",
   "wave": 3,
   "path": "left-or-right/",
   "sources": [
    "https://www.reddit.com/r/ClaudeAI/comments/1x2srd4/can_we_please_start_building_apps_and_systems_to/pgern0r/"
   ],
   "limits": [
    "A simple two-choice screen for people who know each other. It isn't a communication aid and doesn't replace one.",
    "Review build: switch and hold modes haven't been tested with switch users yet.",
    "Real switch and dwell checks weren't done. Switch scanning and hold to choose haven't been tried with switch users, a real switch or switch interface, iOS Switch Control, Android Switch Access, a head pointer or a screen reader. Synthetic tests don't count as that check.",
    "Secondhand source: the comment describes someone else's post about a game for a brother who can only turn his head left and right. The question tool is our idea.",
    "Up to 6 questions, each with a left and a right answer (and an optional emoji). Answers chosen stay on the page for this visit only; nothing reports back. Send the answer back makes plain text to copy or send by hand.",
    "A link carries the questions and the choosing method, never the answers; anyone with the link can read them."
   ],
   "engineer": "ENGINEER SELF-CHECK on localhost-preview 2a8c67b7f480614d4c25584a42d7574d5ed8fcb4: unit 42/42; browser 543/543 at 320/390/1280 plus a classic-scrollbar sweep at 320/360/390/700/1280/1440 (synthetic keys and mouse only; single-word fewest-pieces oracle, Japanese breaks, rendered focus-ring audit of every Tab stop at 390 and 1280, bad-link path-only writes, no-?query checks). f66fb8e superseded by 2a8c67b for the single-word rule (and L8–L10) only. Not QA, and not a switch or dwell check.",
   "status": "NOT READY (L8–L10 fixed; open L11 Low, L12 Low, L13 Low (reopened per Creative 07:02; fix in progress); shared wrap f893087, recheck pending)",
   "qaLocal": {
    "verdict": "NOT READY",
    "label": "LOCALHOST-PREVIEW",
    "sha": "2a8c67b7f480614d4c25584a42d7574d5ed8fcb4",
    "report": "qa/left-or-right/local-2a8c67b/QA-local-2a8c67b.md",
    "note": "L8–L10 fixed; open L11 Low, L12 Low, L13 Low (reopened per Creative 07:02; fix in progress)"
   },
   "qaPrevious": {
    "verdict": "NOT READY",
    "label": "LOCALHOST-PREVIEW",
    "sha": "f66fb8e70ba60af04aa9e1dd0ad3ac4f8db7301c",
    "report": "qa/left-or-right/local-f66fb8e/QA-local-f66fb8e.md"
   }
  },
  {
   "id": "P017",
   "name": "Care Rota r1c",
   "score": "7.30",
   "wave": 3,
   "path": "care-rota/",
   "sources": [
    "https://old.reddit.com/r/ClaudeAI/comments/1x2srd4/can_we_please_start_building_apps_and_systems_to/pf79nth/",
    "https://old.reddit.com/r/ClaudeAI/comments/1x2srd4/can_we_please_start_building_apps_and_systems_to/pf5knni/",
    "https://old.reddit.com/r/ClaudeAI/comments/1x2srd4/can_we_please_start_building_apps_and_systems_to/pgdhlk9/"
   ],
   "limits": [
    "Loose support: commenters say coordination needs people (one of them about a large volunteer platform). Nobody asked for this tool; checking one organizer's plan is our idea.",
    "Checks a plan the group already worked out: up to 28 days, 4 kinds of help and 60 pasted lines like “Tue 20 dinner Ana”. It doesn't read chat messages.",
    "Lines that combine needs or people are set aside with a request to split them, never guessed.",
    "Nothing is booked or confirmed. Messages are copied and the sheet is printed by hand, each stamped with when the plan was checked.",
    "The optional link holds only the household sheet (names, days and needs, no notes); anyone with the link can read it."
   ],
   "engineer": "ENGINEER SELF-CHECK on localhost-preview 83edf87d032af47d88508f7eed08a8e1a528a9a2: cr unit 24/24; care-rota browser 216/216 at 305–1440. Not QA.",
   "status": "NOT READY (C11–C13 fixed; open C14 (Low), C15 (Med), C16 (Low); shared wrap f893087, recheck pending)",
   "qaLocal": {
    "verdict": "NOT READY",
    "label": "LOCALHOST-PREVIEW",
    "sha": "83edf87d032af47d88508f7eed08a8e1a528a9a2",
    "report": "qa/care-rota/local-83edf87/QA-local-83edf87.md",
    "note": "C11–C13 fixed; open C14 (Low), C15 (Med), C16 (Low)"
   },
   "qaPrevious": {
    "verdict": "NOT READY",
    "label": "LOCALHOST-PREVIEW",
    "sha": "cde64e3b02ca689ee7442fa3bc5bf48434c79c1c",
    "report": "qa/care-rota/local-cde64e3/QA-local-cde64e3.md"
   }
  },
  {
   "id": "P012",
   "name": "Five Hands r1c (narrow)",
   "score": "7.10",
   "wave": 3,
   "path": "five-hands/",
   "sources": [
    "https://old.reddit.com/r/ClaudeAI/comments/1x2srd4/can_we_please_start_building_apps_and_systems_to/",
    "https://old.reddit.com/r/ClaudeAI/comments/1x2srd4/can_we_please_start_building_apps_and_systems_to/pf5knni/",
    "https://old.reddit.com/r/ClaudeAI/comments/1x2srd4/can_we_please_start_building_apps_and_systems_to/pf5d1e5/"
   ],
   "limits": [
    "Loose fit to the thread: it's about coordinating people in general. Nobody asked for a task splitter; this narrow version is our idea.",
    "One session: up to 12 tasks and 5 helpers, whole minutes (1–480 per task, 0–480 per helper). Only for jobs that can be done in any order.",
    "Suggest uses a simple rule, not the best possible split. A task that fits nobody whole stays on the bench; nothing is split or dropped. Check only adds up your own split.",
    "Proposal only: every card, the copied text and the sheet say “Nobody has agreed to this yet.”",
    "The optional link holds only task names, minutes and helper names. Anyone with the link can read it."
   ],
   "engineer": "ENGINEER SELF-CHECK on localhost-preview d68094ade9c8d49edd528b278dcf2583711c78c0: unit 18 (every proto r1d assert, check() validates, conservation, stamp/stampCheck by mode); browser 247/247 at 320/360/390/641/1024/1280/1440 (incl. Creative check 5f127ab items 1–6; QA local-8206084 H1–H3; QA local-08b466c/2a02a48 H5 tiny and huge sticks in Suggest and Check, H6 tip and capacity-bar contrast and H7 over-text contrast sampled on the rendered page, H8 rolled-up label on phones). Not QA.",
   "status": "NOT READY (QA open: H9–H14; shared wrap f893087, recheck pending)",
   "qaLocal": {
    "verdict": "NOT READY",
    "label": "LOCALHOST-PREVIEW",
    "sha": "d68094ade9c8d49edd528b278dcf2583711c78c0",
    "report": "qa/five-hands/local-d68094a/QA-local-d68094a.md (H13–H14 per a later QA message, not yet in this file)",
    "note": "open: H9 (Med), H10 (Med), H11 (Low), H12 (Low) per report; H13 (Low) error text on --red 4.24–4.36:1, H14 (Med) drop the 104px minimum so bars stay proportional, labels beside/outside the bar, per a later QA message, not yet in report file"
   }
  }
 ]
};
