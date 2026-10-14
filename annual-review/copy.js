// C193 Annual Review of You — A′ Formal Review final visitor copy (Writing Bot, 2026-10-13).
// Frames/closers reused verbatim from /workspace/annual-review/writer (CONCEPT-COPY + ADDENDUM incl. frame-fit fixes). No new variants.
const COPY = {
  "title": "Annual Review of You",
  "invitation": "Write your friend a performance review. Use things that actually happened.",
  "primary": "Start the review",
  "nameLabel": "Employee name",
  "periodLabel": "Review period",
  "periodPlaceholder": "January – December 2026",
  "momentsHeading": "Key moments this period",
  "momentHint": "Start with what they did. We'll add their name.",
  "momentPrompts": [
    "The time they showed up when they didn't have to",
    "Something they keep almost doing",
    "A small disaster they handled",
    "A habit everyone knows about"
  ],
  "momentNudge": "Start with what they did, like \"drove four hours to…\"",
  "momentSoft": "Shorter lands better.",
  "momentTooLong": "Keep it to one line. {n} over.",
  "defaultMoments": 3,
  "maxMoments": 5,
  "addMoment": "Add another",
  "limit": "Up to 5",
  "tooFew": "Add at least three moments. Small ones count.",
  "ratingLabel": "Rating:",
  "ratings": [
    "Exceeds Expectations",
    "Meets Expectations",
    "Redefined Expectations",
    "Expectations Recalibrated",
    "Not Applicable, Somehow"
  ],
  "docTitle": "Annual review: {name}",
  "categoryLabel": "Category",
  "differentWording": "Different wording",
  "categories": {
    "a1": {
      "heading": "Facilities & Access",
      "hint": "keys, doors, getting in or out",
      "frames": [
        "{name} {moment}. Facilities has been notified.",
        "Incident report: {name} {moment}. Resolved without escalation.",
        "{name} {moment}. Access has not been revoked."
      ]
    },
    "a2": {
      "heading": "Cross-Team Support",
      "hint": "helping someone out",
      "frames": [
        "{name} {moment}. This was not in their job description.",
        "Above and beyond: {name} {moment}. No reimbursement was requested.",
        "{name} {moment}. The team noticed."
      ]
    },
    "a3": {
      "heading": "Professional Development",
      "hint": "something they keep meaning to do",
      "frames": [
        "{name} {moment}. Progress is ongoing.",
        "Initiative launched: {name} {moment}. Rollout remains in planning.",
        "{name} {moment}. Training will continue."
      ]
    },
    "a4": {
      "heading": "Stakeholder Relations",
      "hint": "birthdays, gifts, showing up for people",
      "frames": [
        "{name} {moment}. This has been noted with appreciation.",
        "{name} {moment}. Attendance was perfect.",
        "{name} {moment}. Stakeholders were moved."
      ]
    },
    "a5": {
      "heading": "Internal Communications",
      "hint": "texts, calls, the group chat",
      "frames": [
        "{name} {moment}. The message was received.",
        "{name} {moment}. Further study is recommended.",
        "Comms update: {name} {moment}. Meetings happened anyway."
      ]
    },
    "a6": {
      "heading": "Crisis Management",
      "hint": "a small disaster",
      "frames": [
        "{name} {moment}. No further action required.",
        "{name} {moment}. Composure was maintained, mostly.",
        "{name} {moment}. Everyone made it home."
      ]
    },
    "a7": {
      "heading": "Catering & Morale",
      "hint": "food, drinks, parties",
      "frames": [
        "{name} {moment}. Morale was measurably improved.",
        "{name} {moment}. Feedback was positive and full.",
        "{name} {moment}. Seconds were requested."
      ]
    },
    "a8": {
      "heading": "Special Projects",
      "hint": "anything else",
      "frames": [
        "{name} {moment}. It has been entered into the record.",
        "{name} {moment}. The project is considered a success by at least one person.",
        "{name} {moment}. Outcomes are still being assessed."
      ]
    }
  },
  "closers": {
    "c1": "Overall: Retain.",
    "c2": "Overall: Retain indefinitely.",
    "c3": "Overall: Promoted to Friend (Senior). Benefits unchanged.",
    "c4": "Overall: Contract renewed. No end date.",
    "c5": "Overall: Irreplaceable. Do not attempt."
  },
  "closerExtraLabel": "Anything to add?",
  "closerExtraPlaceholder": "Do not let them near your keys.",
  "reviewerLabel": "Reviewed by",
  "reviewerPlaceholder": "Your name",
  "previewHeading": "Here's the review.",
  "send": "Send it",
  "edit": "Edit",
  "save": "Save as image",
  "saved": "Saved to your device.",
  "saveFail": "Couldn't save the image. A screenshot works too.",
  "linkReady": "Link ready.",
  "copied": "Link copied.",
  "shareCancel": "Not sent. The review is still here.",
  "tooLongLink": "This one's too long to fit in a link. Trim it, or save it as an image instead.",
  "privacy": "Nothing is uploaded. The review lives in the link, and anyone with the link can read it.",
  "saveHint": "The image is made on this device. Where it goes next is up to you.",
  "recipientHeading": "You've been reviewed.",
  "recipientBody": "{reviewer} filed your annual review.",
  "recipientPrimary": "Read it",
  "recipientEnd": "Review them back",
  "stamp": "RETAIN",
  "badLink": "This review didn't come through. Ask them to send it again.",
  "loading": "Pulling your file…",
  "altExport": "Annual performance review for {name}, from {reviewer}.",
  "previewTitle": "Annual Review of You",
  "previewDescription": "Someone filed a review. Open it to read.",
  "overall": "Overall",
  "studioName": "Cantrip Studio",
  "formNo": "Form 193-R",
  "formHeader": "Form 193-R · Annual Review",
  "formCopy": "Copy 1 of 3 · Employee",
  "formFile": "Personnel File",
  "formReturned": "Returned",
  "removeMoment": "Remove moment {n}"
};
