// ENGINEER FALLBACK copy: literal wording only for keys Writer's copy.js (verbatim) lacks. Never overrides a Writer key.
// Logged in writer/ENGINEER-NEEDS-one-less-trip.txt.
(function () { var X = {
  "linkLabel": "Link",
  "editRow": "Edit",
  "editRowAria": "Edit {item}",
  "saveRow": "Save item",
  "cancelEdit": "Cancel",
  "householdDuplicate": "Two households have this name.",
  "qtyTooBig": "Use a number up to {max}.",
  "ownerChoose": "Choose",
  "mergeAria": "Merge {tags}",
  "unitTooLong": { "one": "1 character over.", "other": "{n} characters over." },
  "stopTooLong": { "one": "1 character over.", "other": "{n} characters over." }
}; for (var k in X) if (!(k in COPY)) COPY[k] = X[k]; })();
