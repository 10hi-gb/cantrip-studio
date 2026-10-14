// C087-wear-this — final visitor copy (Writing Bot, 2026-10-13). Every visitor/state/a11y string; app reads all text from COPY.
const COPY = {
  "title": "Wear This",
  "studioLabel": "Cantrip Studio · Dressing Board",
  "invitation": "Dress the paper doll. Send it so they can spot you, or just for fun.",
  "slots": {
    "head": "Hair & hat",
    "top": "Top",
    "bottom": "Bottom",
    "shoes": "Shoes"
  },
  "slotHint": "Pick one for each tab. Arrow keys move through choices, Enter puts it on.",
  "choiceAria": "{slot}: {item}",
  "selected": "On",
  "shuffle": "Surprise me",
  "clearSlot": "Take it off",
  "empty": "The doll is waiting. Pick anything.",
  "primary": "Send the outfit",
  "partial": {
    "one": "1 slot is empty. That's allowed.",
    "other": "{n} slots are empty. That's allowed."
  },
  "meetHint": "Meeting up? Send what you're wearing so they can find you.",
  "share": "Send the outfit",
  "shareText": "This is what I'm wearing. Look for me.",
  "save": "Save as image",
  "saved": "Saved to your device.",
  "saveFail": "Couldn't save the image. A screenshot works too.",
  "privacy": "Only your picks ride in the link: no photo, no body, no location. Nothing is uploaded. Anyone with the link can see the outfit.",
  "receiverIntro": "Someone sent you an outfit.",
  "receiverPrimary": "Make one yours",
  "receiverEdit": "Change something",
  "unknownItem": "One piece didn't come through, so that slot is empty.",
  "badLink": "This outfit didn't come through. Ask them to send it again.",
  "loading": "Laying out the clothes…",
  "dollAlt": "Paper doll with {skin} skin, wearing {head}, {top}, {bottom}, and {shoes}.",
  "copied": "Link copied.",
  "copyFail": "Couldn't copy. Select the link below and copy it yourself.",
  "shareCancel": "Not sent. The outfit is still on.",
  "home": "Cantrip Studio",
  "backLabel": "Back to Cantrip Studio",
  "reducedMotion": "Motion is reduced. Everything still works.",
  "error": "Something went wrong. Reload the page and try again.",
  "items": {
    "head": {
      "h1": {
        "name": "Sharp Crop",
        "alt": "short cropped hair"
      },
      "h2": {
        "name": "Long & Loose",
        "alt": "long, loose hair"
      },
      "h3": {
        "name": "Big Curly Puff",
        "alt": "big puff of curly hair"
      },
      "h4": {
        "name": "Cozy Beanie",
        "alt": "knit beanie"
      },
      "h5": {
        "name": "Bucket Hat",
        "alt": "bucket hat"
      },
      "h6": {
        "name": "Headscarf",
        "alt": "headscarf wrapped around the head"
      }
    },
    "top": {
      "t1": {
        "name": "Classic Tee",
        "alt": "T-shirt"
      },
      "t2": {
        "name": "Sailor Stripes",
        "alt": "striped long-sleeve top"
      },
      "t3": {
        "name": "Hoodie",
        "alt": "hoodie"
      },
      "t4": {
        "name": "Cardigan & Tee",
        "alt": "cardigan over a T-shirt"
      },
      "t5": {
        "name": "Button-Up",
        "alt": "button-up shirt"
      },
      "t6": {
        "name": "Puffer",
        "alt": "puffer jacket"
      }
    },
    "bottom": {
      "b1": {
        "name": "Straight Jeans",
        "alt": "straight-leg jeans"
      },
      "b2": {
        "name": "Shorts",
        "alt": "shorts"
      },
      "b3": {
        "name": "Midi Skirt",
        "alt": "midi skirt"
      },
      "b4": {
        "name": "Wide-Leg Trousers",
        "alt": "wide-leg trousers"
      },
      "b5": {
        "name": "Overalls",
        "alt": "overalls"
      },
      "b6": {
        "name": "Sweatpants",
        "alt": "sweatpants"
      }
    },
    "shoes": {
      "s1": {
        "name": "Sneakers",
        "alt": "sneakers"
      },
      "s2": {
        "name": "Boots",
        "alt": "boots"
      },
      "s3": {
        "name": "Sandals",
        "alt": "sandals"
      },
      "s4": {
        "name": "Loafers",
        "alt": "loafers"
      },
      "s5": {
        "name": "Puddle Boots",
        "alt": "rain boots"
      },
      "s6": {
        "name": "Slippers",
        "alt": "slippers"
      }
    }
  },
  "colors": {
    "c1": "Cobalt",
    "c2": "Tomato",
    "c3": "Sunflower",
    "c4": "Mint",
    "c5": "Plum",
    "c6": "Ink"
  },
  "colorAlt": {
    "c1": "cobalt blue",
    "c2": "tomato red",
    "c3": "sunflower yellow",
    "c4": "mint green",
    "c5": "plum purple",
    "c6": "ink black"
  },
  "itemAlt": "{color} {item}",
  "colorLabel": "Color",
  "colorAria": "Color: {color}",
  "emptySlot": {
    "head": "No hair or hat",
    "top": "No top",
    "bottom": "No bottom",
    "shoes": "No shoes"
  },
  "emptySlotAlt": {
    "head": "nothing on the head",
    "top": "no top",
    "bottom": "no bottom",
    "shoes": "no shoes"
  },
  "skinLabel": "Skin tone (optional)",
  "skinHint": "Pick any. It's just the paper.",
  "skinTones": {
    "k1": "Skin tone 1 of 6, lightest",
    "k2": "Skin tone 2 of 6, light",
    "k3": "Skin tone 3 of 6, medium",
    "k4": "Skin tone 4 of 6, medium deep",
    "k5": "Skin tone 5 of 6, deep",
    "k6": "Skin tone 6 of 6, deepest"
  }
};
