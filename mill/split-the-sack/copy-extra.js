// ENGINEER FALLBACK copy: literal wording for the few keys the app needs that Writer's copy.js (verbatim) lacks.
// Never overwrites a Writer key; Writer adding a key to copy.js wins. Logged in writer/ENGINEER-NEEDS-split-the-sack.txt.
(function () { var X = {
  "unitTooLong": { "one": "Unit: 1 character over.", "other": "Unit: {n} characters over." },
  "currencyTooLong": { "one": "Currency: 1 character over.", "other": "Currency: {n} characters over." },
  "linkLabel": "Link to this proposal",
  "notReady": "Fill in the item, package, price and every household's amount to finish the proposal."
}; for (var k in X) if (!(k in COPY)) COPY[k] = X[k]; })();
