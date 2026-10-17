// care-rota v2 (r1c "Check the plan, hand it out") — visitor copy, FINAL (Writing Bot, 2026-10-16). ADMITTED (conditional): Audience r1c 7/9/7/6/7 = 7.30, "ADMIT conditional (parser fixes + stamp)" (audience/WAVE3-AUDIT.md r1b round summary, row P017); PM build order QUEUE.md 22:26 "… → P018 original → P017 r1c → P012 r1c". Conditions: parser fixes (Engineer/QA) and the stamp (W-CR-60, kept word for word). v1 copy.js is the before version. App reads all text from COPY.
const COPY = {
  "title": "Care Rota",
  "studioName": "Cantrip Studio",
  "studioLabel": "Cantrip Studio · Care Rota",
  "backLabel": "Back to Cantrip Studio",
  "copied": "Copied.",
  "copyFail": "Couldn't copy. Select the text below and copy it yourself.",
  "copyTextLabel": "Text to copy",
  "printLabel": "Print",
  "invitation": "Paste the plan your group worked out. It finds gaps, doubles and wrong days, then writes each helper their own message.",
  "primary": "Check the plan",
  "forLabel": "Who it's for",
  "forPlaceholder": "The new parents",
  "forEmpty": "Say who it's for.",
  "forTooLong": {
    "one": "Up to {max} characters. 1 over.",
    "other": "Up to {max} characters. {n} over."
  },
  "orgLabel": "Organized by",
  "orgPlaceholder": "Your first name",
  "orgEmpty": "Add your name so helpers know who to tell.",
  "orgTooLong": {
    "one": "Up to {max} characters. 1 over.",
    "other": "Up to {max} characters. {n} over."
  },
  "daysHeading": "The days",
  "firstDayLabel": "First day",
  "lastDayLabel": "Last day",
  "dateMissing": "Pick a first and last day.",
  "dateOrder": "The last day can't be before the first.",
  "tooManyDays": "Up to {max} days. Make a second rota for the rest.",
  "needsLabel": "What's needed",
  "needs": {
    "dinner": "Dinner",
    "ride": "Ride",
    "walk": "Dog walk",
    "other": "Other"
  },
  "otherNeedPlaceholder": "Groceries",
  "otherTooLong": {
    "one": "Up to {max} characters. 1 over.",
    "other": "Up to {max} characters. {n} over."
  },
  "tooManyNeeds": "Up to {max} kinds of help.",
  "dayRuleLabel": "Which days",
  "dayRules": {
    "every": "Every day",
    "weekdays": "Weekdays",
    "these": "These days",
    "except": "Every day except"
  },
  "dayRuleSummary": {
    "every": "every day",
    "weekdays": "weekdays",
    "these": "{days}",
    "except": "every day except {days}"
  },
  "needNoDays": "{need} has no days yet. Pick some, or remove it.",
  "notesLabel": "Notes for whoever does {need}",
  "notesEveryoneLabel": "Note for everyone",
  "notesPlaceholder": "No nuts. Drop off 5:30–6:30.",
  "notesTooLong": {
    "one": "Up to {max} characters. 1 over.",
    "other": "Up to {max} characters. {n} over."
  },
  "notesHint": "Skip the address unless helpers need it. Send door codes directly, not here.",
  "planLabel": "The plan, one line each",
  "planHint": "Like “Tue 20 dinner Ana” or “Ana: Wed walk”. Day, need and name, in any order.",
  "planEmpty": "Paste at least one line.",
  "planTooManyLines": "Up to {max} lines.",
  "checkedBadge": "Checked",
  "tally": {
    "needed": {
      "one": "1 needed",
      "other": "{n} needed"
    },
    "covered": {
      "one": "1 covered",
      "other": "{n} covered"
    },
    "gaps": {
      "one": "1 gap",
      "other": "{n} gaps"
    },
    "double": {
      "one": "1 double",
      "other": "{n} double"
    },
    "toFix": {
      "one": "1 to fix",
      "other": "{n} to fix"
    },
    "notNeeded": {
      "one": "1 not needed",
      "other": "{n} not needed"
    },
    "duplicate": {
      "one": "1 duplicate line",
      "other": "{n} duplicate lines"
    }
  },
  "tallySep": " · ",
  "allClear": "Nothing to fix. Every need has someone.",
  "tagGap": "Gap: {date} {need}. Nobody yet.",
  "tagDouble": "Double: {date} {need}: {names}. Both lines stay; you decide who moves.",
  "tagToFix": "To fix: “{line}”. {date} is a {weekday}, not a {typedWeekday}. Ask {name} which day they meant.",
  "tagNotNeeded": "Not needed: “{line}”. {need} isn't needed on {date}. Set aside, not placed.",
  "tagReadAs": "Read as: “{line}” → {date} (the only {weekday} in these days), {need}, {name}.",
  "tagCouldntRead": "Couldn't read: “{line}”. Add a day, a need and a name.",
  "tagAmbiguous": "“{line}” matches {n} days. Add the date.",
  "tagDuplicate": "Same line twice: “{line}”. Counted once.",
  "setAsideHeading": "Set aside (not placed)",
  "duplicateBadge": "Duplicate line · counted once",
  "legend": {
    "covered": "Covered",
    "gap": "Gap",
    "double": "Double",
    "notNeeded": "Not needed"
  },
  "perHelperHeading": "Per helper",
  "perHelperLine": "{name}: {n}",
  "copyStillOpen": "Copy the “still open” message",
  "editAgain": "Edit lines and check again",
  "handoffsHeading": "Handoffs",
  "handoffsNote": "Each helper gets only their days and their notes.",
  "copyHelper": "Copy the message for {name}",
  "stamp": "Plan checked {datetime} by {org}. Changes after this aren't here.",
  "stillOpenText": "For: {for}\nStill open. Reply to me, not the group:\n{lines}\n{stamp}",
  "stillOpenLine": "• {date} {need}",
  "stillOpenNone": "For: {for}\nEvery need has someone for now.\n{stamp}",
  "handoffText": "Days for: {name}\nHelping: {for}\nFrom: {org}\n{dayLines}\n{noteLines}Can't make one? Tell {org} before you swap with anyone.\n{stamp}",
  "handoffDayLine": "• {date}: {needs}",
  "handoffNoteLine": "{need} note: “{note}”\n",
  "handoffEveryoneNoteLine": "Note for everyone: “{note}”\n",
  "sheetHeading": "Who's coming: {for}",
  "sheetRange": "{first} – {last}",
  "sheetLine": "{name} ({needs})",
  "sheetNothing": "Nothing planned from helpers",
  "sheetChangeNote": "Plans can change. Not sure? Ask {org}.",
  "printSheet": "Print the household sheet",
  "readingHeading": "How each line was read",
  "readingNote": "Every line shows how it was read before anything is placed.",
  "readingRules": "Two-word needs like “dog walk” stay together. Names like Mark, May or Monica stay names. The same line twice counts once.",
  "readingCols": {
    "line": "Line",
    "day": "Day",
    "need": "Need",
    "name": "Name",
    "result": "Result"
  },
  "readingResults": {
    "placed": "Placed",
    "double": "Double",
    "toFix": "To fix",
    "notNeeded": "Set aside: not needed",
    "couldntRead": "Couldn't read",
    "duplicate": "Counted once",
    "ambiguous": "Add the date"
  },
  "shareSheetHeading": "Send the household sheet as a link (optional)",
  "linkWarning": "Anyone with the link can read it, and it may stay in chat or browser history.",
  "linkHolds": "The link holds only the household sheet: names, days and needs. No notes.",
  "makeLink": "Make the link",
  "linkLabel": "Link",
  "tooLongLink": "Too long for a link. Print the sheet instead.",
  "privacy": "Nothing is uploaded or saved. Your pasted plan is the copy: paste it again to re-check.",
  "receiverIntro": "Household sheet · from: {org}",
  "receiverNote": "As it was when the link was made.",
  "receiverPrimary": "Make my own rota",
  "emptyState": "Start with who it's for, the days, and what's needed.",
  "reset": "Start over",
  "resetConfirm": "Clear everything? This also clears the link in the address bar.",
  "resetDone": "Cleared.",
  "loading": "Laying out the days…",
  "badLink": "This link is damaged or cut off, so it can't open. Ask for a fresh one.",
  "oldVersion": "This link comes from an older version and can't open here. Ask for a fresh one.",
  "error": "That didn't work. Your plan is still in the box.",
  "tagTwoNeeds": "To fix: “{line}” has two needs. Put each on its own line.",
  "tagTwoNames": "To fix: “{line}” has more than one name. One person per line.",
  "tagNoDay": "To fix: “{line}”. No day in this rota matches it.",
  "tagNameTooLong": "To fix: “{line}”. Names can be up to {max} characters. Shorten this one.",
  "otherEmpty": "Name the other kind of help.",
  "pickDays": "Pick the days",
  "quiltLabel": "Who covers each day",
  "stillOpenHeading": "Still open",
  "patchNames": "{date}: {need}, {names}",
  "patchGap": "{date}: {need}, nobody yet",
  "patchNotNeeded": "{date}: {need}, not needed"
};
