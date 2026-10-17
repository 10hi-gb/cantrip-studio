// before-you-go — visitor copy (Writing Bot, 2026-10-16). Matches briefs/JOSHUA-SCOPES-WAVE1-2.md. App reads all text from COPY.
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
    "one": "Up to {max} characters. 1 over.",
    "other": "Up to {max} characters. {n} over."
  },
  "fields": {
    "place": "Place",
    "window": "When",
    "contact": "Contact",
    "instructions": "Instructions",
    "bring": "Bring"
  },
  "placeholders": {
    "place": "The pickup spot",
    "window": "A date, and a time if you know it",
    "contact": "Who to ask",
    "instructions": "What to do when you get there",
    "bring": "What to bring"
  },
  "fieldTooLong": {
    "one": "Up to {max} characters. 1 over.",
    "other": "Up to {max} characters. {n} over."
  },
  "status": {
    "unknown": "Unknown",
    "said": "Your note · not confirmed",
    "confirmed": "Confirmed",
    "optional": "Optional · not asked",
    "saidSender": "Sender's note · not confirmed",
    "notSure": "Not sure"
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
  "openList": "Still open: {fields}.",
  "allConfirmedHeading": "Everything essential is confirmed.",
  "someSaidNote": {
    "one": "1 detail is your note, not confirmed.",
    "other": "{n} details are your notes, not confirmed."
  },
  "addOwnQuestion": "Add a question",
  "ownPlaceholder": "Can I park in front?",
  "ownTooLong": {
    "one": "Up to {max} characters. 1 over.",
    "other": "Up to {max} characters. {n} over."
  },
  "removeQuestion": "Remove",
  "checklistHeading": "Before you leave",
  "checkItem": "{field}: {value}",
  "printHeading": "Pickup: “{pickup}”",
  "printUnknownMarker": "Unknown",
  "printSaidMarker": "Your note, not confirmed",
  "printConfirmedMarker": "Confirmed",
  "copyNotes": "Copy the notes",
  "printNotes": "Print the checklist",
  "share": "Send as a link",
  "shareText": "Pickup notes: {pickup}",
  "shareCancel": "Not sent. Your notes are still here.",
  "privacy": "Nothing here is uploaded or saved. If you send a link, anyone who has it can read these notes, and it may stay in browser history.",
  "receiverIntro": "Pickup notes for “{pickup}”",
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
  "error": "That didn't work. Your notes are still here. Copy them before you reload.",
  "plateKicker": "One pickup",
  "byLabel": "Your name (optional)",
  "byPlaceholder": "First name",
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
  "confirmedBy": "Marked confirmed by the sender: {name}",
  "confirmedByYou": "Confirmed by you",
  "notSureNote": "Marked not sure by the sender: {name}",
  "notSureNoteAnon": "Not sure.",
  "notSureToggle": "Not sure",
  "confirmHint": "Use what you heard or read. If they said nothing's needed, type that.",
  "answerAria": "Answer for {field}",
  "copyLink": "Copy link",
  "noLookupNote": "It only shows what you typed. Nothing is looked up.",
  "receiverEditNote": "Your edits make a new copy. The link you were sent doesn't change.",
  "receiverEditNoteAnon": "Your edits make a new copy. The original link doesn't change.",
  "printFooter": "Quoted text is as typed. Confirmed means marked confirmed by whoever filled it in. Nothing was looked up.",
  "printAnswerLine": "Answer:",
  "datePassed": "This date has passed.",
  "readinessAria": "{n} essentials still open",
  "answerAsTyped": "As typed:",
  "linkLabel": "Link",
  "someSaidNoteSender": {
    "one": "1 detail is the sender's note, not confirmed.",
    "other": "{n} details are the sender's notes, not confirmed."
  },
  "confirmedBySenderAnon": "Marked confirmed by the sender",
  "notSureBySenderAnon": "Marked not sure by the sender",
  "printSaidMarkerSender": "Sender's note, not confirmed",
  "printConfirmedBySender": "Confirmed by the sender",
  "printNotSureMarker": "Not sure",
  "typedBySenderMarker": "Typed by the sender. Not checked.",
  "privateDetailsHint": "Only add what you're fine with anyone who has the link seeing. Leave out other people's private details.",
  "limitCounter": "{n}/{max}",
  "answerTooLong": {
    "one": "Up to {max} characters. 1 over.",
    "other": "Up to {max} characters. {n} over."
  },
  "byTooLong": {
    "one": "Up to {max} characters. 1 over.",
    "other": "Up to {max} characters. {n} over."
  },
  "ownLimitReached": "Up to {max} questions.",
  "tooLongToShare": {
    "one": "Too long for a link: {fields}. Shorten it and try again. Nothing was cleared.",
    "other": "Too long for a link: {fields}. Shorten them and try again. Nothing was cleared."
  },
  "windowNeedsDate": "Add the date, not just a weekday or a time.",
  "factAria": "{field}: what you know",
  "shareTextTyped": "Pickup notes for “{pickup}” (typed by the sender)",
  "textHeading": "Pickup notes for “{pickup}”",
  "textByLine": "Notes by: {name}",
  "textFactLine": "{field}: “{value}” · {status}",
  "textFactUnknown": "{field}: Unknown",
  "textAnswerLine": "Answer: “{answer}”",
  "textQuestionsHeading": "Ask before you go:",
  "textQuestionLine": "• {question}",
  "textOwnQuestionLine": "• “{question}”",
  "textFooter": "Quoted text is as typed by the sender. Nothing was looked up."
};
