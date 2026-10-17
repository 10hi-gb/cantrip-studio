// ENGINEER FALLBACK copy (STAND-IN): literal wording only for keys Writer's copy.js (verbatim, copy.v2.js) lacks. Never
// overrides a Writer key. Logged in writer/ENGINEER-NEEDS-care-rota.txt for Writer to replace.
(function () { var X = {
  "tagTwoNeeds": "To fix: “{line}” has two needs. Put each need on its own line.",
  "tagTwoNames": "To fix: “{line}” has more than one name. Put each person on their own line.",
  "tagNoDay": "To fix: “{line}”. None of these days match it.",
  "otherEmpty": "Name the other kind of help.",
  "pickDays": "Pick the days",
  "quiltLabel": "Who covers each day",
  "stillOpenHeading": "Still open",
  "patchNames": "{date}: {need}, {names}",
  "patchGap": "{date}: {need}, gap",
  "patchNotNeeded": "{date}: {need} not needed"
}; for (var k in X) if (!(k in COPY)) COPY[k] = X[k]; })();
