# Hold This Note — workshop build

Static first playable for review only. Path: `/hold-this-note/`.

Copy on this page is still the interim engineer wording. Writer's visitor table at `/workspace/hold-this-note-writer/writer/VISITOR-COPY.md` is marked a Workshop draft and is not on this page. The privacy sentences there were checked against review commit d0627e4 and are explicitly not shipped, including not on this review page.

Visuals follow Creative direction A, Held String, from `/workspace/hold-this-note/creative/DIRECTIONS.md` (2026-10-04). Room `#0C1012`, listening string `#7AA8A4`, held string `#F4FFFD`. Glass Ring was not applied. Studio home link stays the existing logo. Reduced motion is the default: the string does not animate.

This page does not record a voice. A visitor hums; the browser estimates one pitch; playback is a short tone at that pitch, not the voice. The shared link carries the pitch only.

## Run locally

From the site root (the directory that contains `hold-this-note/`):

```bash
python3 -m http.server 8790 --bind 127.0.0.1
```

Open `http://127.0.0.1:8790/hold-this-note/`.

Use a secure context (`https` or `http://127.0.0.1`). The microphone is requested only from a button, never on load.

## Fragment

Version token `1`, then `.`, then the pitch in decihertz (hertz × 10) as an unsigned decimal integer. No sign, exponent, decimal point, leading zero, or other fields.

| | |
| --- | --- |
| Example | `#1.4400` |
| Meaning | 440.0 Hz |
| UTF-8 size | 7 bytes |
| Largest valid | `#1.10000` (1000.0 Hz, 8 bytes) |
| Smallest valid | `#1.800` (80.0 Hz, 6 bytes) |

`location.hash` longer than 8 characters is rejected, as is anything that is not this exact form, including non-finite text, extra characters, and pitches outside 80.0–1000.0 Hz. The fragment is never inserted into HTML.

Round-trip a detected pitch with `encodeFragment` / `decodeFragment` in `pitch.js`.

## Tunables

These live in `TUNING` in `pitch.js`. They are implementation choices, not founder-locked constants.

| Choice | Value |
| --- | --- |
| Pitch range | 80–1000 Hz |
| Lock | 2.2 s of confident pitch, each frame within 60 cents of the window's median, pitch frames at least 60% of that window, at least 2 frames. A dropout shorter than 0.35 s does not wipe it. One far frame does not. |
| Confidence | YIN cumulative-mean dip at or below 0.15, and confidence at least 0.85 |
| Silence / sound RMS | below 0.008 quiet, at or above 0.015 treated as sound |
| Heard but not locked | after 6 s of sound without a lock, leave listening and offer Try again |
| Quiet capture timeout | 20 s, then the same uncertain screen |
| Capture mic processing | echo cancellation off, noise suppression off, auto gain off |
| Match | pitch class across octaves, within 50 cents, held about 0.7 s, at least 2 frames |
| Match timeout | 45 s |
| Tone | four sines at 1×, 2×, 3×, and 4× the locked pitch. Their gains sum to 0.72, under 0.9. Below 240 Hz more of that level moves onto the upper partials; the fundamental stays the pitch. Master gain ramps 0→1 in 0.04 s, holds 0.8 s, ramps to 0 in 0.18 s, then 0.25 s of silence before matching can listen. One play when a capture locks. A later lock plays once more. |
| High-note search | up to 2000 Hz, refused above 1000 Hz instead of stored |

Noise, silence, and a weak pitch estimate do not lock. One matching frame does not land.

## Screens

Button labels live in the `COPY` object in `app.js`.

One tap starts listening. The browser's own microphone prompt is the only confirmation. Try again starts listening the same way.

The microphone tracks are stopped before a tone starts. Send it stays usable while the locked tone plays.

| Screen | Actions |
| --- | --- |
| Start | Hold a note. About the mic is a disclosure. The privacy line is already on the screen. |
| Listening | Cancel |
| Didn't catch a steady note | Try again |
| Mic blocked | Try again, and Start over. On a received note: Try again, Play the note, Back. |
| Locked | Send it, Try again. The tone plays once by itself. If there is no share sheet, Send it copies the link and says so in the status line. Cancelling the share sheet does not say the note was sent. |
| Received note | Play the note, Hum along, Hold one back. Hum along stays off until playback has ended. |
| Matching | Stop, Play the note, Hold one back |
| Landed | Make one back |
| Bad link | Hold one yourself |

## Deploy onto review Pages

Do not deploy to production. Do not publish this cantrip.

Checked 2026-10-04:

- Review host: `https://cantrip-studio-review.pages.dev`
- Production host: `https://cantrip-studio.pages.dev`
- `/fortune-cookie/` is on those hosts and is **not** in this git repo
- This repo's `main` is the older foundation (home + `still-have-it/`)
- A missing path on review currently returns the review home page with HTTP 200
- `/fortune-cookie` redirects to `/fortune-cookie/` with HTTP 308 without a per-cantrip rule
- This repo has no `_redirects` file. None was added. A new root `_redirects` could replace the live review rules on a full upload. `hold-this-note/index.html` is the route.

Cloudflare Pages direct upload replaces the whole tree. Uploading this repo alone would drop `fortune-cookie/`.

1. Confirm the project name in the Cloudflare dashboard. The review hostname is `cantrip-studio-review.pages.dev`. The production hostname is `cantrip-studio.pages.dev`.
2. Download the current **review** deployment, or start from a local tree that already matches review, including `fortune-cookie/`.
3. Copy this `hold-this-note/` directory into that tree. Do not delete other folders. Do not replace the review home with this repo's `index.html`.
4. Deploy that combined tree to the **review** project only. Example, from the combined directory, after you have confirmed the project name:

```bash
npx wrangler pages deploy . --project-name cantrip-studio-review
```

5. Open `https://cantrip-studio-review.pages.dev/hold-this-note/` and confirm `https://cantrip-studio-review.pages.dev/fortune-cookie/` still loads.
6. Do not run that deploy against the production project.

This task does not deploy.

## Checks

```bash
node hold-this-note/pitch.test.mjs
node hold-this-note/check-mic-gate.mjs
```

`check-mic-gate.mjs` uses system `google-chrome` headless. It stubs `getUserMedia` before load. The no-hash page must not call it until **Hold a note** is clicked, and that screen already shows that the voice isn't recorded. `#1.4400` must not call it on load. **Hum along** stays disabled until a tone has finished. `pitch.test.mjs` uses synthetic buffers only. It is not a phone pass.

## License

Original page code. No runtime dependency and no copied pitch-detection library. The detector is a small YIN-style autocorrelation (method described by de Cheveigné and Kawahara, JASA 2002). The logo is the existing site file `assets/logo.svg`, linked relatively, not duplicated.

## Known limits

- Real-phone pitch accuracy is not proven. The pitch tests use synthetic buffers only. A headless microphone-gate check is not a phone trial. A later device pass did lock a steady note and move on. That is still not a measured pitch-accuracy pass.
- A hum that wobbles past the median window, or never forms a confident pitch, still does not lock. After sound has been heard for the voiced timeout, listening ends on "Didn't catch a steady note." with Try again, instead of staying on Cancel.
- Octave mistakes are still possible on some voices. Matching compares pitch class so a true octave can still land; a wrong octave in the shared number would play the wrong register.
- The analysis window is 2048 samples. At sample rates well above 48 kHz the lowest notes may be refused instead of guessed.
- Speaker echo is blocked by ending playback (oscillator stopped, gain at zero) before matching can listen. It is not proven against every device's echo path.
- Share success only means the share sheet finished. Cancel and errors do not report delivery. The page cannot tell whether a recipient got the link.
- The fragment is visible in the URL. It is not encrypted and not secret.
- In-app browsers may lack the microphone or a user-gesture audio path.
- Listening-only use is the Play control. There is no substitute that pretends a person hummed.
