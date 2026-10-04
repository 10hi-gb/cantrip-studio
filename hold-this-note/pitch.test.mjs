import assert from "node:assert/strict";
import {
  TUNING,
  MAX_FRAGMENT_CHARS,
  encodeFragment,
  decodeFragment,
  detectPitch,
  pitchClassDistanceCents,
  createDwell,
} from "./pitch.js";

const example = encodeFragment(440);
assert.equal(example, "#1.4400");
assert.equal(Buffer.byteLength(example, "utf8"), 7);
assert.equal(example.length, 7);
assert.equal(decodeFragment(example), 440);
assert.equal(encodeFragment(80), "#1.800");
assert.equal(Buffer.byteLength(encodeFragment(80), "utf8"), 6);
assert.equal(encodeFragment(1000), "#1.10000");
assert.equal(Buffer.byteLength("#1.10000", "utf8"), 8);
assert.equal(MAX_FRAGMENT_CHARS, 8);
assert.equal(decodeFragment("#1.10000"), 1000);
assert.equal(decodeFragment("#1.800"), 80);
assert.equal(encodeFragment(440.04), "#1.4400");
assert.equal(decodeFragment(encodeFragment(440.04)), 440);

for (const bad of [
  "",
  "#",
  "#1",
  "#1.",
  "#1.Infinity",
  "#1.NaN",
  "#1.nan",
  "#1.-4400",
  "#1.1e3",
  "#1.1E3",
  "#1.4400.1",
  "#1.0800",
  "#1.0440",
  "#2.4400",
  "#1.799",
  "#1.10001",
  "#1.4400 ",
  "#1.4400/",
  "#1.4400<script>",
  "#1." + "9".repeat(40),
  "1.4400",
  "#1.4400\u0000",
  "#1.４４００",
]) {
  assert.equal(decodeFragment(bad), null, bad);
}

assert.throws(() => encodeFragment(Number.NaN));
assert.throws(() => encodeFragment(Number.POSITIVE_INFINITY));
assert.throws(() => encodeFragment(Number.NEGATIVE_INFINITY));
assert.throws(() => encodeFragment(50));
assert.throws(() => encodeFragment(2000));
assert.throws(() => encodeFragment("440"));

function sine(hz, sampleRate, length, amplitude) {
  const out = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    out[i] = amplitude * Math.sin((2 * Math.PI * hz * i) / sampleRate);
  }
  return out;
}

for (const hz of [82, 110, 220, 440, 523.3, 880]) {
  const found = detectPitch(sine(hz, 48000, TUNING.fftSize, 0.2), 48000);
  assert.equal(found.reason, "pitch", hz + " " + found.reason);
  assert.ok(found.confidence >= TUNING.minConfidence);
  assert.ok(Math.abs(1200 * Math.log2(found.hz / hz)) < 20, hz + " detected " + found.hz);
}

assert.equal(detectPitch(new Float32Array(TUNING.fftSize), 48000).reason, "quiet");

const noise = new Float32Array(TUNING.fftSize);
let seed = 0x12345678;
for (let i = 0; i < noise.length; i++) {
  seed = (1664525 * seed + 1013904223) >>> 0;
  noise[i] = (seed / 4294967296) * 2 - 1;
}
const noisy = detectPitch(noise, 48000);
assert.notEqual(noisy.reason, "pitch");

const tooHigh = detectPitch(sine(1800, 48000, TUNING.fftSize, 0.25), 48000);
assert.equal(tooHigh.reason, "range");

assert.ok(pitchClassDistanceCents(440, 220) < 1);
assert.ok(pitchClassDistanceCents(440, 880) < 1);
assert.ok(Math.abs(pitchClassDistanceCents(440, 466.16) - 100) < 2);
assert.equal(pitchClassDistanceCents(0, 440), Infinity);

const match = createDwell({
  dwellMs: TUNING.matchDwellMs,
  toleranceCents: TUNING.matchCents,
  minFrames: TUNING.minMatchFrames,
  pitchClass: true,
});
assert.equal(match.latched(1000), false);
match.observe(220, 1000, 440);
assert.equal(match.latched(1000), false);
match.observe(220.2, 1000 + TUNING.matchDwellMs, 440);
assert.equal(match.latched(1000 + TUNING.matchDwellMs), true);

const oneFrame = createDwell({
  dwellMs: 0,
  toleranceCents: 50,
  minFrames: 2,
  pitchClass: true,
});
oneFrame.observe(440, 0, 440);
assert.equal(oneFrame.latched(0), false);

const lock = createDwell({
  dwellMs: TUNING.lockMs,
  toleranceCents: TUNING.stableCents,
  minFrames: TUNING.minLockFrames,
  pitchClass: false,
});
lock.observe(440, 0);
lock.observe(442, 400);
assert.equal(lock.latched(400), false);
lock.observe(441, 1500);
assert.equal(lock.latched(1500), true);
lock.observe(500, 1600);
assert.equal(lock.latched(1600), false);

console.log("pitch tests passed");
console.log("example " + example + " bytes " + Buffer.byteLength(example, "utf8"));
