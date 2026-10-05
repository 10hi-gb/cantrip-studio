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
  createHold,
  captureListeningOutcome,
  replaySustainSec,
  toneMix,
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

assert.equal(TUNING.minHoldMs, 2500);
assert.equal(TUNING.graceMs, 250);
assert.equal(TUNING.releaseMs, 500);
assert.equal(TUNING.ceilingMs, 8000);
assert.ok(TUNING.graceMs >= 200 && TUNING.graceMs <= 300);
assert.ok(TUNING.releaseMs > TUNING.graceMs);
assert.ok(TUNING.ceilingMs > TUNING.minHoldMs);
assert.ok(TUNING.ceilingMs >= 6000 && TUNING.ceilingMs <= 8000);

function feedHold(hold, hz, from, to, step, quiet = false) {
  let last = null;
  for (let t = from; t <= to; t += step) last = hold.observe(hz, t, quiet);
  return last;
}

const stillHumming = createHold();
const atMinimum = feedHold(stillHumming, 440, 0, TUNING.minHoldMs, 50);
assert.equal(atMinimum.lock, false);
assert.equal(stillHumming.latched(), false);
assert.ok(stillHumming.heldMs() >= TUNING.minHoldMs);
const pastMinimum = feedHold(stillHumming, 440, TUNING.minHoldMs + 50, 4000, 50);
assert.equal(pastMinimum.lock, false);
assert.equal(pastMinimum.phase, "holding");
assert.ok(stillHumming.heldMs() > TUNING.minHoldMs);
assert.ok(stillHumming.heldMs() < TUNING.ceilingMs);

const ended = stillHumming.observe(Number.NaN, 4000 + TUNING.releaseMs, true);
assert.equal(ended.lock, true);
assert.equal(ended.reason, "release");
assert.equal(ended.heldMs, 4000);
assert.equal(stillHumming.medianHz(), 440);
assert.equal(replaySustainSec(ended.heldMs), 4);

const wobble = createHold();
feedHold(wobble, 440, 0, 1000, 50);
wobble.observe(880, 1100, false);
const wobbleBack = wobble.observe(442, 1000 + TUNING.graceMs, false);
assert.equal(wobbleBack.lock, false);
assert.ok(wobble.heldMs() >= 1000 + TUNING.graceMs);
assert.ok(Math.abs(wobble.medianHz() - 440) < 5);

const resetEarly = createHold();
feedHold(resetEarly, 440, 0, 1000, 50);
const reset = resetEarly.observe(Number.NaN, 1000 + TUNING.graceMs + 50, true);
assert.equal(reset.lock, false);
assert.equal(resetEarly.active(), false);
assert.equal(resetEarly.heldMs(), 0);

const tooShort = createHold();
feedHold(tooShort, 440, 0, 2000, 50);
const tooShortEnd = tooShort.observe(Number.NaN, 2000 + TUNING.releaseMs, true);
assert.equal(tooShortEnd.lock, false);
assert.equal(tooShort.latched(), false);

const ceiling = createHold();
let ceilingResult = null;
for (let t = 0; t <= TUNING.ceilingMs; t += 50) {
  ceilingResult = ceiling.observe(440, t, false);
  if (t < TUNING.ceilingMs) assert.equal(ceilingResult.lock, false, "locked while still humming at " + t);
}
assert.equal(ceilingResult.lock, true);
assert.equal(ceilingResult.reason, "ceiling");
assert.equal(ceilingResult.heldMs, TUNING.ceilingMs);
assert.equal(replaySustainSec(ceilingResult.heldMs), TUNING.toneHoldMaxSec);

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

function runHold(signal, frames, tailQuietMs) {
  const holder = createHold();
  let lockedAt = null;
  let reason = "";
  let pitchFrames = 0;
  for (let i = 0; i < frames; i++) {
    const start = i * signal.hop;
    const buf = signal.samples.subarray(start, start + TUNING.fftSize);
    const found = detectPitch(buf, signal.sr);
    const now = i * TUNING.analysisEveryMs;
    if (found.reason === "pitch") pitchFrames += 1;
    const quiet = found.rms < TUNING.silenceRms;
    const result = holder.observe(found.reason === "pitch" ? found.hz : Number.NaN, now, quiet);
    if (lockedAt == null && result.lock) {
      lockedAt = now;
      reason = result.reason;
    }
  }
  if (tailQuietMs && lockedAt == null) {
    const end = (frames - 1) * TUNING.analysisEveryMs;
    const result = holder.observe(Number.NaN, end + tailQuietMs, true);
    if (result.lock) {
      lockedAt = end + tailQuietMs;
      reason = result.reason;
    }
  }
  return { lockedAt, reason, pitchFrames, heldMs: holder.heldMs(), median: holder.medianHz(), latched: holder.latched() };
}

const keepFrames = Math.round(4000 / TUNING.analysisEveryMs) + 1;
const kept = runHold(syntheticHum(220, 0, 0, keepFrames), keepFrames, 0);
assert.ok(kept.pitchFrames > keepFrames * 0.9, "synthetic hum was not heard as pitch");
assert.equal(kept.latched, false);
assert.ok(kept.heldMs >= TUNING.minHoldMs);
assert.ok(kept.heldMs < TUNING.ceilingMs);

const released = runHold(syntheticHum(220, 0, 0, keepFrames), keepFrames, TUNING.releaseMs);
assert.equal(released.latched, true);
assert.equal(released.reason, "release");
assert.ok(released.heldMs >= TUNING.minHoldMs);
assert.ok(released.heldMs < TUNING.ceilingMs);
assert.ok(released.lockedAt > released.heldMs);
assert.ok(Math.abs(1200 * Math.log2(released.median / 220)) < TUNING.stableCents);

const ceilingFrames = Math.round((TUNING.ceilingMs + 1000) / TUNING.analysisEveryMs) + 1;
const heldToCeiling = runHold(syntheticHum(196, 20, 0.01, ceilingFrames), ceilingFrames, 0);
assert.ok(heldToCeiling.pitchFrames > ceilingFrames * 0.8, "synthetic ceiling hum was not heard as pitch");
assert.equal(heldToCeiling.latched, true);
assert.equal(heldToCeiling.reason, "ceiling");
assert.ok(heldToCeiling.lockedAt >= TUNING.ceilingMs);
assert.equal(replaySustainSec(heldToCeiling.heldMs), TUNING.toneHoldMaxSec);

const noiseFrames = Math.round(TUNING.ceilingMs / TUNING.analysisEveryMs) + 1;
const noiseOnly = new Float32Array(TUNING.fftSize + noiseFrames * 2400);
let noiseSeed = 5;
for (let i = 0; i < noiseOnly.length; i++) {
  noiseSeed = (1664525 * noiseSeed + 1013904223) >>> 0;
  noiseOnly[i] = ((noiseSeed / 4294967296) * 2 - 1) * 0.2;
}
const noiseRun = runHold({ samples: noiseOnly, sr: 48000, hop: 2400 }, noiseFrames, TUNING.releaseMs);
assert.equal(noiseRun.pitchFrames, 0);
assert.equal(noiseRun.latched, false);

const rising = createHold();
const risingFrames = Math.round(TUNING.ceilingMs / TUNING.analysisEveryMs) + 1;
for (let i = 0; i < risingFrames; i++) {
  const hz = 180 * Math.pow(2, (i * 8) / 1200);
  const result = rising.observe(hz, i * TUNING.analysisEveryMs, false);
  assert.equal(result.lock, false);
}

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
  holding: true,
}), "listen");
assert.equal(captureListeningOutcome({
  now: TUNING.voicedUncertainMs,
  startedAt: 0,
  heardSoundAt: 0,
  latched: false,
  holding: false,
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

assert.ok(TUNING.tonePeakGain < 0.9);
assert.equal(TUNING.tonePeakGain, 0.72);
assert.equal(TUNING.toneAttackSec, 0.1);
assert.equal(TUNING.toneReleaseSec, 0.2);
assert.ok(TUNING.toneAttackSec >= 0.08 && TUNING.toneAttackSec <= 0.12);
assert.ok(TUNING.toneReleaseSec >= 0.15 && TUNING.toneReleaseSec <= 0.25);
assert.equal(TUNING.toneHoldMinSec, 2);
assert.equal(TUNING.toneHoldMaxSec, 4);
assert.equal(TUNING.toneHoldGuestSec, 2.5);
assert.equal(replaySustainSec(2500), 2.5);
assert.equal(replaySustainSec(3200), 3.2);
assert.equal(replaySustainSec(1500), 2);
assert.equal(replaySustainSec(9000), 4);
assert.equal(replaySustainSec(Number.NaN), TUNING.toneHoldGuestSec);
for (const hz of [80, 196, 440, 880]) {
  const mix = toneMix(hz);
  assert.deepEqual(mix.multiples, [1, 2, 3, 4]);
  const summed = mix.gains.reduce((total, gain) => total + gain, 0);
  assert.ok(Math.abs(summed - TUNING.tonePeakGain) < 1e-9, hz + " peak " + summed);
  assert.ok(Math.abs(mix.peak - TUNING.tonePeakGain) < 1e-9);
  assert.ok(mix.gains.every((gain) => gain > 0));
}
const lowMix = toneMix(80);
assert.ok(lowMix.gains[1] + lowMix.gains[2] + lowMix.gains[3] > lowMix.gains[0]);
const midMix = toneMix(440);
assert.ok(midMix.gains[0] > midMix.gains[1]);
assert.ok(midMix.gains[0] > midMix.gains[2]);
assert.ok(midMix.gains[0] > midMix.gains[3]);

console.log("pitch tests passed");
console.log("synthetic buffers only — not a phone or microphone pass");
console.log("example " + example + " bytes " + Buffer.byteLength(example, "utf8"));
