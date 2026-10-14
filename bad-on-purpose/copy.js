// C148 Bad on Purpose — final visitor copy (Writing Bot, 2026-10-13). Paste as the app's COPY object.
const COPY = {
  title: "Bad on Purpose",
  invitation: "Draw something badly. On purpose. We'll hang it.",
  assignmentLabel: "Today's assignment",
  assignments: ["A horse", "Your house", "A self-portrait", "The ocean", "A dog that is good", "Breakfast", "A famous building", "Your boss, from memory"],
  newAssignment: "Different assignment",
  primary: "Hang it",
  canvasHint: "Use your finger, mouse, or whatever is nearby. Effort is optional.",
  emptyCanvas: "The wall is waiting. Make at least one mark.",
  undo: "Undo", clear: "Start over",
  hanging: "Hanging the work…",
  placard: {
    metaLine: "{assignment} · {strokeCount} · {secondCount} · {colors}",
    strokeCount: { one: "1 stroke", other: "{strokes} strokes" },
    secondCount: { one: "1 second", other: "{seconds} seconds" },
    medium: { one: "Single pigment on screen", many: "Mixed pigment on screen" },
    insurance: "Insured for {value} (not real, not money, not insurance)",
    acquisition: "Gift of the artist, who was asked to."
  },
  labels: [
    { id: "L1", when: "strokes <= 3", text: "The artist stopped at {strokes}. Critics call this restraint. The artist calls it done." },
    { id: "L2", when: "strokes >= 40", text: "{strokes} separate decisions, none of them load-bearing. Note the commitment." },
    { id: "L3", when: "seconds < 5", text: "Completed in {secondCount}, which is roughly how long the subject would have sat still." },
    { id: "L4", when: "seconds >= 60", text: "Over a minute of work. Scholars agree the first ten seconds were the strongest." },
    { id: "L5", when: "coverage < 0.05", text: "Mostly wall. The artist trusts you to imagine the rest of {assignment_lower}." },
    { id: "L6", when: "coverage > 0.4", text: "The artist did not so much draw {assignment_lower} as surround it." },
    { id: "L7", when: "default", text: "A bold refusal to look like {assignment_lower}. The museum has asked no follow-up questions." },
    { id: "L8", when: "default", text: "Early period. Possibly also late period." }
  ],
  samples: [
    { title: "Horse, Standing (Allegedly)", meta: "A horse · 7 strokes · 11 seconds · graphite", label: "Four legs were attempted. Three were achieved. The fourth is a matter of ongoing scholarly debate." },
    { title: "My House, Plus Sun", meta: "Your house · 5 strokes · 4 seconds · yellow, black", label: "The sun has a face and the house does not. The artist has made their priorities clear." },
    { title: "Self-Portrait at Full Confidence", meta: "A self-portrait · 3 strokes · 2 seconds · black", label: "Two eyes and a line. Visitors report it looks exactly like the artist, which the artist disputes." },
    { title: "The Ocean, Summarized", meta: "The ocean · 1 stroke · 1 second · blue", label: "One wavy line standing in for most of the planet. Efficient, if a little dismissive." },
    { title: "Good Dog", meta: "A dog that is good · 22 strokes · 38 seconds · brown, red", label: "The red is a tongue. The museum was told this twice." },
    { title: "Breakfast (Eggs?)", meta: "Breakfast · 9 strokes · 14 seconds · yellow, white", label: "Either two eggs or one very tired face. The artist has declined to clarify, and lunch is in an hour." }
  ],
  samplesHeading: "Current exhibition",
  save: "Save as image",
  saved: "Saved to your device.",
  saveFail: "Couldn't save the image. Try a screenshot, the museum won't mind.",
  share: "Invite someone to make one",
  shareText: "Draw something badly on purpose. It gets a museum label.",
  copied: "Link copied.",
  shareCancel: "Not sent. Your work is still on the wall.",
  again: "Hang another",
  privacy: "Your drawing stays on this device. Nothing you draw is uploaded. The invite link is the same for everyone and doesn't include your drawing.",
  canvasFail: "This browser can't draw here. Try another browser.",
  error: "Something fell off the wall. Start over and try again."
};
// Approved by Writing Bot copy ruling, 2026-10-13 21:37 PT (moved out of markup / new strings).
Object.assign(COPY, {
  "strokesLabel": "Strokes"
});
