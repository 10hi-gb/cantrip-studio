// GENERATED from hub.json by build-hub.py. Do not edit.
window.MILL_HUB = {
 "title": "Cantrip Studio · Mill sprint 2026-10-16",
 "note": "Review prototype; not a production release. Scope and score proposed by the Cantrip agents under Joshua's authorization; scores are the rubric scores recorded in QUEUE.md. Source links are the permalinks recorded in QUEUE.md; none are invented.",
 "sharedLimits": [
  "The source thread doesn't directly ask for any of the Wave 1 or Wave 2 tools, so those scores rest on scopes proposed by the Cantrip agents under Joshua's authorization, not on commenter demand.",
  "Every piece is memory-only: nothing is uploaded or stored. A link carries its content, anyone holding the link can read it, and it may stay in browser history.",
  "Engineer self-check is the builder checking their own work. It is not QA.",
  "QA all-9 recheck (LOCALHOST-PREVIEW @f893087, qa/all9/local-f893087/QA-all9-f893087.md) NOT TESTED: physical phones and touch, Firefox, Safari/WebKit, Windows/high-contrast modes, real screen readers (VoiceOver, TalkBack, NVDA, JAWS; accessibility checked only through the Chrome AX tree), physical print, zoom 200%/400%, RTL text; CSS-generated text (content:attr(), ::before/::after); contrast of focus rings and non-text UI."
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
    "QA all-9 NOT TESTED: the 11px “was” line drawn by .is-changed .qty::after (CSS-generated text); the Change my amount cap check ran in Chrome only, at 1280 without queries (query variants at 390)."
   ],
   "engineer": "ENGINEER SELF-CHECK on localhost-preview 134da28501527078776b63b0ffdc973de96b110e: unit 21+8; browser sack 410/410 at 305/320/390/600/1280 (incl. QA D7r received origin+path+fragment cap at 1999/2000/2001/2040, normal and long path; D10-r5 at-cap names in full, no ellipsis, sender/recipient/change/print + Letter PDF; D2 kept); quote-spoof 63/63, recipient-a11y 87/87, sender-typed 12/12. Not QA.",
   "status": "NOT READY (all-9 recheck NOT CLEAN: W-3 (Low), W-4 (Low), contrast; Change my amount at the 2,000 cap PASS 15/15; deployed pin FAIL)",
   "qaLocal": {
    "verdict": "NOT READY",
    "label": "LOCALHOST-PREVIEW",
    "sha": "f893087c7ac397638e17c9aaa084374809f02130",
    "report": "qa/all9/local-f893087/QA-all9-f893087.md (split-the-sack tree 5a07412, unchanged at c07008e)",
    "note": "QA all-9: A wrap PASS 9/9; B contrast FAIL 29 of 508, W-3 (Low), W-4 (Low); C address bar PASS 27/27; E Change my amount at the 2,000 cap PASS 15/15. Verdict for this pass: NOT CLEAN: W-3, W-4 (Low)"
   },
   "qaPrevious": {
    "verdict": "READY",
    "label": "LOCALHOST-PREVIEW",
    "sha": "48156f86a8dd9d1bbd9d52ceceaf34db18ddfdd5",
    "report": "qa/split-the-sack/local-48156f8/QA-local-48156f8.md"
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
   "status": "READY ON LOCALHOST-PREVIEW (all-9 recheck PASS at f893087; deployed pin FAIL)",
   "qaLocal": {
    "verdict": "READY",
    "label": "LOCALHOST-PREVIEW",
    "sha": "f893087c7ac397638e17c9aaa084374809f02130",
    "report": "qa/all9/local-f893087/QA-all9-f893087.md (before-you-go tree 3e24dfe, unchanged at c07008e)",
    "note": "QA all-9: A wrap PASS 6/6; B contrast PASS 0 of 384; C address bar PASS 30/30. Verdict for this pass: PASS"
   },
   "qaPrevious": {
    "verdict": "READY",
    "label": "LOCALHOST-PREVIEW",
    "sha": "b225af5b4bd505a737e46a9f78374d6d77bd5b28",
    "report": "qa/before-you-go/local-b225af5/QA-local-b225af5.md"
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
   "status": "NOT READY (all-9 recheck NOT CLEAN: W-2 (Low–Medium), contrast; deployed pin FAIL)",
   "qaLocal": {
    "verdict": "NOT READY",
    "label": "LOCALHOST-PREVIEW",
    "sha": "f893087c7ac397638e17c9aaa084374809f02130",
    "report": "qa/all9/local-f893087/QA-all9-f893087.md (one-small-ask tree f780c94, unchanged at c07008e)",
    "note": "QA all-9: A wrap PASS 9/9; B contrast FAIL, W-2 (Low–Medium) white on #C8553D 4.35:1; C address bar PASS 30/30. Verdict for this pass: NOT CLEAN: W-2"
   },
   "qaPrevious": {
    "verdict": "READY",
    "label": "LOCALHOST-PREVIEW",
    "sha": "eade562ddc783558ad2068f927f7aa576e60dd50",
    "report": "qa/one-small-ask/local-eade562/QA-local-eade562.md"
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
   "status": "NOT READY (all-9 recheck NOT CLEAN: W-6 (Low), contrast; deployed pin FAIL)",
   "qaLocal": {
    "verdict": "NOT READY",
    "label": "LOCALHOST-PREVIEW",
    "sha": "f893087c7ac397638e17c9aaa084374809f02130",
    "report": "qa/all9/local-f893087/QA-all9-f893087.md (one-less-trip tree 217f188, unchanged at c07008e)",
    "note": "QA all-9: A wrap PASS 6/6; B contrast FAIL 1 of 318, W-6 (Low) #progress 3.83:1 at 1280; C address bar PASS 30/30. Verdict for this pass: NOT CLEAN: W-6 (Low)"
   },
   "qaPrevious": {
    "verdict": "READY",
    "label": "LOCALHOST-PREVIEW",
    "sha": "6169c34f07ac2c8b51e4066d3acc76e5fee1a3f9",
    "report": "qa/one-less-trip/local-6169c34/QA-local-6169c34.md"
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
    "Nothing is sent or booked. A proposal is a suggestion worked out from what the sender typed; nobody has replied to it.",
    "QA all-9 NOT TESTED: the zone-ID check (D) ran in Chrome only."
   ],
   "engineer": "ENGINEER SELF-CHECK on localhost-preview 715aa3a: unit 19 incl. DST; browser 116/116 at 320/390/1280. Not QA.",
   "status": "NOT READY (all-9 recheck NOT CLEAN: W-1 (Low–Medium), <wbr> adds spaces in accessible names; zone-ID breaks at 320 only after \"/\" or \"_\", 23/23)",
   "qaLocal": {
    "verdict": "NOT READY",
    "label": "LOCALHOST-PREVIEW",
    "sha": "f893087c7ac397638e17c9aaa084374809f02130",
    "report": "qa/all9/local-f893087/QA-all9-f893087.md (the-same-hour tree c6ae8fd = hardening afb31b8, unchanged at c07008e)",
    "note": "QA all-9: A wrap PASS 15/15; B contrast PASS (0 failing enabled text); C address bar PASS 30/30; D zone IDs at 320: 23 breaks, all after \"/\" or \"_\", 0 mid-word; text, copy and link exact; accessibility tree FAIL, W-1 (Low–Medium). Verdict for this pass: NOT CLEAN: W-1"
   },
   "qaPrevious": {
    "verdict": "READY",
    "label": "LOCALHOST-PREVIEW",
    "sha": "88869436943a40e949ac4445487912cc14bec828",
    "report": "qa/the-same-hour/local-8886943/QA-local-8886943.md"
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
    "A received link is a snapshot of what the sender entered; nobody has agreed to anything by opening it.",
    "QA NOT TESTED (Even Up): the f893087 query strip was informational only (pre-strip); cap at 1280 with the 2,100-char pad query (ran at 390); origins with other port lengths (only a 4-digit port); pages at the cap opened from other apps (e.g. a messenger URL rewriter)."
   ],
   "engineer": "ENGINEER SELF-CHECK on localhost-preview 6f5f5435f607b901a8fae6cd674e704af77f1324: unit 21 (incl. 5000-case settlement property test); browser 312/312 at 320/360/390/700–999/1280/1440. Not QA.",
   "status": "NOT READY (all-9 recheck NOT CLEAN: W-5 (Low–Medium), contrast; F FINAL PASS at c07008e: receive cap 28/28, query strip 30/30, Make a link and no echo 6/6)",
   "qaLocal": {
    "verdict": "NOT READY",
    "label": "LOCALHOST-PREVIEW",
    "sha": "c07008e8b39e95cd698ab55812e5e6ceecbc61dc",
    "report": "qa/even-up/local-649874e/QA-local-649874e.md (even-up tree 4039c6ef0371e5a4673fdb6e02654329c0baaac0 = 649874e; also qa/all9/local-f893087/QA-all9-f893087.md)",
    "note": "QA F FINAL PASS at c07008e (= 649874e tree): receive cap 28/28, query strip 30/30, Make a link and no echo 6/6. QA all-9: A wrap PASS 6/6; B contrast FAIL 12 of 772, W-5 (Low–Medium) \"Owes\" 3.94:1. Verdict: NOT CLEAN: W-5"
   },
   "qaPrevious": {
    "verdict": "READY",
    "label": "LOCALHOST-PREVIEW",
    "sha": "6f5f5435f607b901a8fae6cd674e704af77f1324",
    "report": "qa/even-up/local-6f5f543/QA-local-6f5f543.md (also READY at 5ad5c277f48e52f1864513b3bfca3782b25fe79f)"
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
    "A link carries the questions and the choosing method, never the answers; anyone with the link can read them.",
    "QA all-9 NOT TESTED: Left or Right at c07008e/2a8c67b (by instruction); tile text drawn with content:attr(data-v) (.lr-vt)."
   ],
   "engineer": "ENGINEER SELF-CHECK on localhost-preview 2a8c67b7f480614d4c25584a42d7574d5ed8fcb4: unit 42/42; browser 543/543 at 320/390/1280 plus a classic-scrollbar sweep at 320/360/390/700/1280/1440 (synthetic keys and mouse only; single-word fewest-pieces oracle, Japanese breaks, rendered focus-ring audit of every Tab stop at 390 and 1280, bad-link path-only writes, no-?query checks). f66fb8e superseded by 2a8c67b for the single-word rule (and L8–L10) only. Not QA, and not a switch or dwell check.",
   "status": "NOT READY (L8–L10 fixed; open L11 Med, L12 Low, L13 Low (reopened per Creative 07:02; fix in progress); all-9 recheck at f893087 tree: superseded; not judged)",
   "qaLocal": {
    "verdict": "NOT READY",
    "label": "LOCALHOST-PREVIEW",
    "sha": "2a8c67b7f480614d4c25584a42d7574d5ed8fcb4",
    "report": "qa/left-or-right/local-2a8c67b/QA-local-2a8c67b.md",
    "note": "L8–L10 fixed; open L11 Med, L12 Low, L13 Low (reopened per Creative 07:02; fix in progress); QA all-9 at f893087 tree 35cfec7 (qa/all9/local-f893087/QA-all9-f893087.md): superseded pending 2a8c67b handoff; not judged"
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
    "The optional link holds only the household sheet (names, days and needs, no notes); anyone with the link can read it.",
    "QA all-9 NOT TESTED: C11–C14 and the tag grid (covered by the other QA run); the Edit lines address-bar step (control not shown on a received sheet, 3 cases).",
    "QA local-64ea179 NOT TESTED: everything outside C14, C15, C16 and the listed regressions, including the full text-contrast scan (C11 scope), print and PDF, the recipient view beyond the address-bar rows, the 2,000-character URL boundary, timezone and DST, and copy text; window widths between 391 and 1279 except as used for resize; real devices and other browsers (Chrome headless only)."
   ],
   "engineer": "ENGINEER SELF-CHECK on localhost-preview 83edf87d032af47d88508f7eed08a8e1a528a9a2: cr unit 24/24; care-rota browser 216/216 at 305–1440. Not QA.",
   "status": "NOT READY (C11–C16 fixed: local-64ea179 retest PASS for C14–C16; open W-7 (Medium) from the all-9 recheck)",
   "qaLocal": {
    "verdict": "NOT READY",
    "label": "LOCALHOST-PREVIEW",
    "sha": "64ea1799741988c047941a8fa5a0c37cfc138152",
    "report": "qa/care-rota/local-64ea179/QA-local-64ea179.md",
    "note": "C11–C16 fixed; open W-7 (Medium)"
   },
   "qaPrevious": {
    "verdict": "NOT READY",
    "label": "LOCALHOST-PREVIEW",
    "sha": "83edf87d032af47d88508f7eed08a8e1a528a9a2",
    "report": "qa/care-rota/local-83edf87/QA-local-83edf87.md"
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
    "The optional link holds only task names, minutes and helper names. Anyone with the link can read it.",
    "QA local-11d8017 NOT TESTED: real devices, Safari/Firefox and any engine other than Chrome 155 headless; screen readers (only ax-tree text was checked) and real clipboard permission prompts; physical printing (only the Chrome PDF for Letter, and A4 only for the suggest/check PDFs); widths other than those listed, high-contrast or forced-colors mode, and browser zoom above 100%; the 12.45 and 16.14 ring pairs as separate figures; production; experience and design calls (Creative); whether H16 is present at d68094a."
   ],
   "engineer": "ENGINEER SELF-CHECK on localhost-preview d68094ade9c8d49edd528b278dcf2583711c78c0: unit 18 (every proto r1d assert, check() validates, conservation, stamp/stampCheck by mode); browser 247/247 at 320/360/390/641/1024/1280/1440 (incl. Creative check 5f127ab items 1–6; QA local-8206084 H1–H3; QA local-08b466c/2a02a48 H5 tiny and huge sticks in Suggest and Check, H6 tip and capacity-bar contrast and H7 over-text contrast sampled on the rendered page, H8 rolled-up label on phones). Not QA.",
   "status": "NOT READY (H9–H13 fixed; open H14 (holds only under reduced motion), H15 High, H16 Low, H17 Low; all-9 recheck W-8, W-9 PASS at 11d8017)",
   "qaLocal": {
    "verdict": "NOT READY",
    "label": "LOCALHOST-PREVIEW",
    "sha": "11d8017894af21f7658b4ba751c3ab585d276219",
    "report": "qa/five-hands/local-11d8017/QA-local-11d8017.md",
    "note": "H9–H13 fixed; open H14 (holds only under reduced motion), H15 High, H16 Low, H17 Low"
   },
   "qaPrevious": {
    "verdict": "NOT READY",
    "label": "LOCALHOST-PREVIEW",
    "sha": "d68094ade9c8d49edd528b278dcf2583711c78c0",
    "report": "qa/five-hands/local-d68094a/QA-local-d68094a.md (H13–H14 per a later QA message, not yet in this file)"
   }
  }
 ]
};
