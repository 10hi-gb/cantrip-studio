// Synthetic buffers only. Not a microphone recording and not a phone pass.
import assert from "node:assert/strict";
import {
  TUNING,
  MAX_FRAGMENT_CHARS,
  encodeFragment,
  decodeFragment,
  detectPitch,
  pitchClassDistanceCents,
  createDwell,
  captureListeningOutcome,
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

function syntheticHum(baseHz, depthCents, noiseAmp, frames) {
  const sr = 48000;
  const hop = 2400;
  const total = TUNING.fftSize + frames * hop;
  const samples = new Float32Array(total);
  let phase = 0;
  let seed = 99;
  for (let i = 0; i < total; i++) {
    const t = i / sr;
    const hz = baseHz * Math.pow(2, (depthCents * Math.sin(2 * Math.PI * 5 * t)) / 1200);
    phase += (2 * Math.PI * hz) / sr;
    seed = (1664525 * seed + 1013904223) >>> 0;
    const noise = ((seed / 4294967296) * 2 - 1) * noiseAmp;
    samples[i] = 0.15 * Math.sin(phase) + 0.08 * Math.sin(2 * phase) + 0.03 * Math.sin(3 * phase) + noise;
  }
  return { samples, sr, hop };
}

function runDwell(signal, frames) {
  const dwell = createDwell({
    dwellMs: TUNING.lockMs,
    toleranceCents: TUNING.stableCents,
    minFrames: TUNING.minLockFrames,
    pitchClass: false,
    gapMs: TUNING.gapMs,
    minVoicedRatio: TUNING.minVoicedRatio,
  });
  let latchedAt = null;
  let pitchFrames = 0;
  for (let i = 0; i < frames; i++) {
    const start = i * signal.hop;
    const buf = signal.samples.subarray(start, start + TUNING.fftSize);
    const found = detectPitch(buf, signal.sr);
    const now = i * TUNING.analysisEveryMs;
    if (found.reason === "pitch") {
      pitchFrames += 1;
      dwell.observe(found.hz, now);
    } else {
      dwell.observe(Number.NaN, now);
    }
    if (latchedAt == null && dwell.latched(now)) latchedAt = now;
  }
  return { latchedAt, pitchFrames, median: dwell.medianHz() };
}

const wobble = runDwell(syntheticHum(196, 40, 0.02, 40), 40);
assert.ok(wobble.pitchFrames > 30, "synthetic wobble was not heard as pitch");
assert.equal(wobble.latchedAt, 1500);
assert.ok(Math.abs(1200 * Math.log2(wobble.median / 196)) < TUNING.stableCents);

const steady = runDwell(syntheticHum(220, 0, 0, 40), 40);
assert.equal(steady.latchedAt, 1500);

const noiseOnly = new Float32Array(TUNING.fftSize + 40 * 2400);
let noiseSeed = 5;
for (let i = 0; i < noiseOnly.length; i++) {
  noiseSeed = (1664525 * noiseSeed + 1013904223) >>> 0;
  noiseOnly[i] = ((noiseSeed / 4294967296) * 2 - 1) * 0.2;
}
const noiseRun = runDwell({ samples: noiseOnly, sr: 48000, hop: 2400 }, 40);
assert.equal(noiseRun.pitchFrames, 0);
assert.equal(noiseRun.latchedAt, null);

const rising = createDwell({
  dwellMs: TUNING.lockMs,
  toleranceCents: TUNING.stableCents,
  minFrames: TUNING.minLockFrames,
  pitchClass: false,
  gapMs: TUNING.gapMs,
  minVoicedRatio: TUNING.minVoicedRatio,
});
for (let i = 0; i < 40; i++) {
  const hz = 180 * Math.pow(2, (i * 8) / 1200);
  rising.observe(hz, i * 50);
  if (i < 30) assert.equal(rising.latched(i * 50), false);
}
assert.equal(rising.latched(39 * 50), false);

assert.equal(captureListeningOutcome({
  now: 1500,
  startedAt: 0,
  heardSoundAt: 0,
  latched: true,
}), "lock");
assert.equal(captureListeningOutcome({
  now: TUNING.voicedUncertainMs - 1,
  startedAt: 0,
  heardSoundAt: 0,
  latched: false,
}), "listen");
assert.equal(captureListeningOutcome({
  now: TUNING.voicedUncertainMs,
  startedAt: 0,
  heardSoundAt: 0,
  latched: false,
}), "uncertain");
assert.equal(captureListeningOutcome({
  now: 5000,
  startedAt: 0,
  heardSoundAt: null,
  latched: false,
}), "listen");
assert.equal(captureListeningOutcome({
  now: TUNING.listenTimeoutMs,
  startedAt: 0,
  heardSoundAt: null,
  latched: false,
}), "uncertain");

console.log("pitch tests passed");
console.log("synthetic buffers only — not a phone or microphone pass");
console.log("example " + example + " bytes " + Buffer.byteLength(example, "utf8"));
