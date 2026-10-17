// one-less-trip — visitor copy (Writing Bot, 2026-10-16). Matches briefs/JOSHUA-SCOPES-WAVE1-2.md. App reads all text from COPY.
const COPY = {
  "title": "One Less Trip",
  "studioName": "Cantrip Studio",
  "studioLabel": "Cantrip Studio · One Less Trip",
  "backLabel": "Back to Cantrip Studio",
  "copied": "Copied.",
  "copyFail": "Couldn't copy. Select the text below and copy it yourself.",
  "printLabel": "Print",
  "invitation": "Pool a few households' lists and see everything by stop.",
  "primary": "Group by stop",
  "householdsHeading": "Households",
  "householdLabel": "Household",
  "householdPlaceholder": "Lee",
  "addHousehold": "Add household",
  "removeHousehold": "Remove {name}",
  "householdCount": {
    "one": "1 household",
    "other": "{n} households"
  },
  "tooFewHouseholds": "Add at least two households.",
  "tooManyHouseholds": "Six households is the most.",
  "householdEmpty": "Give each household a name.",
  "householdTooLong": {
    "one": "1 character over.",
    "other": "{n} characters over."
  },
  "itemsHeading": "The lists",
  "ownerLabel": "For",
  "itemLabel": "Item",
  "itemPlaceholder": "Oat milk",
  "qtyLabel": "Qty",
  "qtyPlaceholder": "2",
  "unitLabel": "Unit",
  "unitPlaceholder": "cartons",
  "stopLabel": "Stop",
  "stopPlaceholder": "Hardware store",
  "stopUnknownOption": "Not sure yet",
  "addRow": "Add item",
  "removeRow": "Remove {item}",
  "rowCount": {
    "one": "1 item",
    "other": "{n} items"
  },
  "tooManyRows": "Thirty items is the most.",
  "itemEmpty": "Name the item.",
  "itemTooLong": {
    "one": "1 character over.",
    "other": "{n} characters over."
  },
  "qtyInvalid": "Enter a quantity above zero.",
  "ownerMissing": "Pick who it's for.",
  "stopsHeading": "By stop",
  "stopCount": {
    "one": "1 stop",
    "other": "{n} stops"
  },
  "stopTicket": "{stop}",
  "stopItems": {
    "one": "1 item",
    "other": "{n} items"
  },
  "unknownStop": "Stop unknown",
  "unknownStopHint": "These need a stop before anyone can pick them up.",
  "traceLine": "{owner}: {qty} {unit}",
  "duplicateFound": "{owner1} and {owner2} both want {item} ({unit}).",
  "mergeButton": "Merge into one line",
  "unmergeButton": "Split back out",
  "mergedLine": "{item}: {qty} {unit} total",
  "mergedTrace": "From {traces}",
  "similarNote": "Items with different names or units stay separate.",
  "notOrdered": "Stops are in the order you entered them, not by route.",
  "checkLabel": "Got it",
  "checkAria": "Got {item} for {owner} at {stop}",
  "checksNote": "Checks reset when you close the page.",
  "progress": {
    "one": "1 of {total} picked up",
    "other": "{n} of {total} picked up"
  },
  "allSourceNote": "Every item from every list is here once.",
  "copyList": "Copy the list",
  "printList": "Print stop tickets",
  "share": "Send as a link",
  "shareText": "Shopping by stop",
  "shareCancel": "Not sent. The list is still here.",
  "privacy": "Nothing is uploaded or saved. A link holds the whole list, so anyone with it can read it, and it may stay in browser history.",
  "receiverIntro": "A shared list, grouped by stop.",
  "receiverNote": "The list as it was when the link was made.",
  "receiverPrimary": "Make my own from this",
  "emptyState": "Add the households, then each item with its stop.",
  "reset": "Clear everything",
  "resetConfirm": "Clear the list and checks? This also clears the link in the address bar.",
  "resetDone": "Cleared.",
  "loading": "Sorting tickets…",
  "badLink": "This link is damaged or cut off, so it can't open. Ask for a fresh one.",
  "oldVersion": "This link comes from an older version and can't open here. Ask for a fresh one.",
  "tooLongLink": "Too much for a link. Copy or print the list instead.",
  "error": "Something broke. Reload and try again.",
  "stopsAria": "{n} stop tickets",
  "mergedBadge": "Merged",
  "mergeHint": "Merge only if it's the same thing.",
  "keptSeparateUnit": "Kept separate: {unit1} isn't {unit2}.",
  "ledgerIn": {
    "one": "1 row in",
    "other": "{n} rows in"
  },
  "ledgerPlaced": {
    "one": "1 on a ticket",
    "other": "{n} on tickets"
  },
  "ledgerSetAside": {
    "one": "1 set aside",
    "other": "{n} set aside"
  },
  "ledgerHeld": {
    "one": "1 held back",
    "other": "{n} held back"
  },
  "printFooter": "Grouped by stop, in the order the stops were entered. Not a route.",
  "copyTextLabel": "List text",
  "qtyNotNumber": "Use a plain number, like 2 or 0.5.",
  "rowsNeedFixing": {
    "one": "1 row needs fixing. It stays in the list and isn't on a ticket yet.",
    "other": "{n} rows need fixing. They stay in the list and aren't on a ticket yet."
  },
  "copyBlocked": "Copy and print wait until every row is fixed, so nothing drops out.",
  "skipToStops": "Jump to the stops",
  "mergedStatus": "Merged {item} into one line.",
  "unmergedStatus": "{item} split back out."
};
