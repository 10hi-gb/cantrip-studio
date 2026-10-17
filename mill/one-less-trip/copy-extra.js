// ENGINEER FALLBACK copy: literal wording only for keys Writer's copy.js (verbatim) lacks. Never overrides a Writer key.
// Logged in writer/ENGINEER-NEEDS-one-less-trip.txt.
(function () { var X = {
  "limitsNote": "Names up to {name} characters, items {item}, units {unit}, stops {stop}. The whole link can be up to {url} characters.",
  "linkRoom": "Link length: {n} of {max} characters.",
  "sameStopPrompt": "Same stop? “{a}” and “{b}” differ only in capitals or spacing.",
  "sameStopYes": "Same stop",
  "sameStopNo": "Keep separate",
  "copyTakenNote": "This is your copy now. The sender isn't notified.",
  "copyMergedNote": "This is your copy now, with your change. The sender isn't notified.",
  "ownLinkLabel": "Link to your copy"
}; for (var k in X) if (!(k in COPY)) COPY[k] = X[k]; })();
