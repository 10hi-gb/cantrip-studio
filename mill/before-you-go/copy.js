// before-you-go — visitor copy (Writing Bot, 2026-10-16). Matches the Wave 1-2 scope brief in briefs/ (scopes proposed by the Cantrip agents under Joshua's authorization). App reads all text from COPY.
const COPY = {
  "title": "Before You Go",
  "studioName": "Cantrip Studio",
  "studioLabel": "Cantrip Studio · Before You Go",
  "backLabel": "Back to Cantrip Studio",
  "copied": "Copied.",
  "copyFail": "Couldn't copy. Select the text below and copy it yourself.",
  "printLabel": "Print",
  "invitation": "Catch the missing detail before you make the trip.",
  "primary": "Check what's missing",
  "pickupLabel": "What are you picking up?",
  "pickupPlaceholder": "Used bike from Marketplace",
  "pickupTooLong": {
    "one": "1 character over.",
    "other": "{n} characters over."
  },
  "fields": {
    "place": "Place",
    "window": "When",
    "contact": "Contact",
    "instructions": "Instructions",
    "bring": "Bring"
  },
  "placeholders": {
    "place": "1420 Pine St, side gate",
    "window": "Sat 10–12",
    "contact": "Text Maria, 555-0134",
    "instructions": "Ring twice, it's in the garage",
    "bring": "Cash, straps"
  },
  "fieldTooLong": {
    "one": "1 character over.",
    "other": "{n} characters over."
  },
  "status": {
    "unknown": "Unknown",
    "said": "You said",
    "confirmed": "Confirmed",
    "optional": "Optional · not asked"
  },
  "statusAria": "{field}: {status}",
  "questionsHeading": "Ask before you go",
  "questions": {
    "place": "What's the exact address, and where do I go when I get there?",
    "window": "What day and time can I come?",
    "contact": "Who do I contact, and how?",
    "instructions": "Anything I should know when I arrive?",
    "bring": "What should I bring?"
  },
  "confirmLabel": "Their answer",
  "confirmPlaceholder": "Type what they told you",
  "confirmButton": "Mark confirmed",
  "confirmNeedsAnswer": "Type their answer first.",
  "unconfirm": "Undo confirm",
  "contactMissing": "No contact yet, so there's no call button. Find who to ask before you go.",
  "callButton": "Call {number}",
  "textButton": "Text {number}",
  "notSetHeading": {
    "one": "Not set: 1 essential still open",
    "other": "Not set: {n} essentials still open"
  },
  "openList": "Still open: {fields}",
  "allConfirmedHeading": "Everything essential is confirmed.",
  "someSaidNote": {
    "one": "1 detail is what you said, not confirmed.",
    "other": "{n} details are what you said, not confirmed."
  },
  "addOwnQuestion": "Add a question",
  "ownPlaceholder": "Can I park in front?",
  "ownTooLong": {
    "one": "1 character over.",
    "other": "{n} characters over."
  },
  "removeQuestion": "Remove",
  "checklistHeading": "Before you leave",
  "checkItem": "{field}: {value}",
  "printHeading": "Pickup: {pickup}",
  "printUnknownMarker": "Unknown",
  "printSaidMarker": "You said",
  "printConfirmedMarker": "Confirmed",
  "copyNotes": "Copy the notes",
  "printNotes": "Print the checklist",
  "share": "Send as a link",
  "shareText": "Pickup notes: {pickup}",
  "shareCancel": "Not sent. Your notes are still here.",
  "privacy": "Nothing here is uploaded or saved. If you send a link, anyone who has it can read these notes, and it may stay in browser history.",
  "receiverIntro": "Pickup notes: {pickup}",
  "receiverNote": "Notes as they were when the link was made. Statuses show what was confirmed then.",
  "receiverPrimary": "Make my own copy",
  "snapshotNote": "Changed something? Send a new link. Old links show the old notes.",
  "emptyState": "Start with what you're picking up and where.",
  "reset": "Clear",
  "resetConfirm": "Clear all notes? This also clears the link in the address bar.",
  "resetDone": "Cleared.",
  "loading": "Loading…",
  "badLink": "This link is damaged or cut off, so it can't open. Ask for a fresh one.",
  "oldVersion": "This link comes from an older version and can't open here. Ask for a fresh one.",
  "tooLongLink": "Too much to fit in a link. Copy or print the notes instead.",
  "error": "Something broke. Reload and try again.",
  "plateKicker": "One pickup",
  "byLabel": "Your name (optional)",
  "byPlaceholder": "Jo",
  "optionalFields": {
    "id": "ID or paperwork",
    "appt": "Appointment",
    "park": "Parking or transit",
    "access": "Access"
  },
  "optionalQuestions": {
    "id": "Do I need ID or paperwork, or is it fine without?",
    "appt": "Do I need an appointment, or can I just come?",
    "park": "Where can I park, or what's the nearest stop?",
    "access": "Are there steps, or anything I should know about getting in?"
  },
  "questionWindowDay": "What time can I come on {day}?",
  "optionalHeading": "Optional",
  "confirmedBy": "Confirmed by {name}",
  "confirmedByYou": "Confirmed by you",
  "notSureNote": "{name} wasn't sure.",
  "notSureNoteAnon": "Not sure.",
  "notSureToggle": "Not sure",
  "confirmHint": "Use what you heard or read. If they said nothing's needed, type that.",
  "answerAria": "Answer for {field}",
  "copyLink": "Copy link",
  "noLookupNote": "It only shows what you typed. Nothing is looked up.",
  "receiverEditNote": "Your edits make a new copy. {by}'s link doesn't change.",
  "receiverEditNoteAnon": "Your edits make a new copy. The original link doesn't change.",
  "printFooter": "Only what was entered is shown. Confirmed means confirmed by whoever filled it in. Nothing was looked up.",
  "printAnswerLine": "Answer:",
  "datePassed": "This date has passed.",
  "readinessAria": "{n} essentials still open"
};
