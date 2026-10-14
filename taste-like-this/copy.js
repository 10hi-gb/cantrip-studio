// C095-taste-like-this — final visitor copy (Writing Bot, 2026-10-13). Every visitor/state/a11y string; app reads all text from COPY.
const COPY = {
  "title": "Taste Like This",
  "studioLabel": "Cantrip Studio · Tasting Slab 095",
  "invitation": "Show someone how you like it: sweet, salt, heat.",
  "axes": {
    "sweet": "Sweet",
    "salt": "Salt",
    "heat": "Heat"
  },
  "levels": [
    "None",
    "A little",
    "Plenty",
    "All of it"
  ],
  "levelAria": "{axis}: {level} ({n} of 3)",
  "sliderHint": "Drag, or use arrow keys. 0 is the center, 3 is the edge.",
  "dishLabel": "What's it for? (optional)",
  "dishPlaceholder": "Hot chocolate",
  "dishTooLong": {
    "one": "1 character over.",
    "other": "{n} characters over."
  },
  "primary": "Plate it",
  "shapeAlt": "Taste shape for {dish}: sweet {sweet}, salty {salt}, heat {heat}, out of 3.",
  "shapeAltNoDish": "Taste shape: sweet {sweet}, salty {salt}, heat {heat}, out of 3.",
  "allZero": "Plain. Respect.",
  "allMax": "All three, all the way. Brave.",
  "share": "Send your taste",
  "shareText": "This is how I like it.",
  "disclaimer": "A personal preference, not a recipe, not allergy or diet advice.",
  "privacy": "Your three numbers and dish name live in the link. Nothing is uploaded. Anyone with the link can see them.",
  "receiverIntro": "Here's how they like it{dishSuffix}.",
  "dishSuffix": ": {dish}",
  "receiverPrimary": "Show yours",
  "compareLegend": "Theirs and yours, laid on top of each other. Numbers are on each axis.",
  "badLink": "This taste didn't come through. Ask them to send it again.",
  "loading": "Setting the table…",
  "copied": "Link copied.",
  "copyFail": "Couldn't copy. Select the link below and copy it yourself.",
  "shareCancel": "Not sent. Your taste is still here.",
  "home": "Cantrip Studio",
  "backLabel": "Back to Cantrip Studio",
  "reducedMotion": "Motion is reduced. Everything still works.",
  "error": "Something went wrong. Reload the page and try again."
};
