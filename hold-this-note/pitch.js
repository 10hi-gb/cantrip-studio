// Tunable implementation choices. Not founder-locked. See BUILD.md.
export const TUNING = {
  minHz: 80,
  maxHz: 1000,
  yinThreshold: 0.15,
  minConfidence: 0.85,
  silenceRms: 0.008,
  soundRms: 0.015,
  // Cents from the median of the steady stretch, not from the first frame.
  stableCents: 60,
  // A continuing hum is not finished at this point. It only becomes eligible to lock.
  minHoldMs: 2500,
  // Still humming at this point: lock anyway, on the median of the stretch.
  ceilingMs: 8000,
  // A shorter hole, or the same pitch class coming back, does not restart the stretch.
  graceMs: 250,
  // Quiet for this long, after the minimum, means the hum ended.
  releaseMs: 500,
  // Listening screen shows a hold only after the stretch is clearly underway.
  showHoldMs: 400,
  minLockFrames: 2,
  // Short dropouts inside a match do not wipe that window.
  gapMs: 350,
  // Pitch frames must be the majority of the window. One leap does not replace it.
  minVoicedRatio: 0.6,
  // Heard sound that never locks leaves the listening screen before the long timeout.
  voicedUncertainMs: 6000,
  listenTimeoutMs: 20000,
  matchCents: 50,
  matchDwellMs: 700,
  minMatchFrames: 2,
  matchTimeoutMs: 45000,
  // Sum of harmonic peaks. Kept under 0.9 so the tone is loud without clipping.
  tonePeakGain: 0.72,
  toneAttackSec: 0.1,
  toneReleaseSec: 0.2,
  // Sender replay follows the held stretch, clamped to this range. Ramps sit outside it.
  toneHoldMinSec: 2,
  toneHoldMaxSec: 4,
  // The fragment has no duration. A received note uses this sustain.
  toneHoldGuestSec: 2.5,
  postPlaySettleMs: 250,
  analysisEveryMs: 50,
  fftSize: 2048,
  // Search above the stored range so a high note is refused instead of folded down an octave.
  detectMaxHz: 2000,
};

// "#1." + decihertz. Largest valid form is "#1.10000".
export const MAX_FRAGMENT_CHARS = 8;
const FRAGMENT_RE = /^1\.(?:[1-9][0-9]{2,4})$/;

// Integer harmonics of the locked pitch. Low notes put more level on the
// upper partials so a small speaker can still carry that pitch.
export function toneMix(hz, tuning = TUNING) {
  const low = hz < 240 ? Math.min(1, (240 - hz) / 160) : 0;
  const weights = [
    1 - 0.55 * low,
    0.72 + 0.35 * low,
    0.4 + 0.28 * low,
    0.22 + 0.2 * low,
  ];
  const sum = weights.reduce((total, weight) => total + weight, 0);
  const gains = weights.map((weight) => (weight / sum) * tuning.tonePeakGain);
  return {
    multiples: [1, 2, 3, 4],
    gains,
    peak: gains.reduce((total, gain) => total + gain, 0),
  };
}

export function encodeFragment(hz) {
  if (typeof hz !== "number" || !Number.isFinite(hz)) {
    throw new TypeError("pitch must be a finite number");
  }
  const deci = Math.round(hz * 10);
  if (!Number.isInteger(deci) || deci < TUNING.minHz * 10 || deci > TUNING.maxHz * 10) {
    throw new RangeError("pitch is outside the supported range");
  }
  const fragment = "#1." + String(deci);
  if (fragment.length > MAX_FRAGMENT_CHARS) {
    throw new RangeError("fragment is oversized");
  }
  return fragment;
}

export function decodeFragment(hash) {
  if (typeof hash !== "string") return null;
  if (hash.length === 0 || hash.length > MAX_FRAGMENT_CHARS) return null;
  if (!hash.startsWith("#")) return null;
  const raw = hash.slice(1);
  if (!FRAGMENT_RE.test(raw)) return null;
  const deci = Number(raw.slice(2));
  if (!Number.isInteger(deci) || !Number.isFinite(deci)) return null;
  if (String(deci) !== raw.slice(2)) return null;
  const hz = deci / 10;
  if (hz < TUNING.minHz || hz > TUNING.maxHz) return null;
  return hz;
}

export function centsBetween(aHz, bHz) {
  if (!(aHz > 0) || !(bHz > 0) || !Number.isFinite(aHz) || !Number.isFinite(bHz)) {
    return Infinity;
  }
  return 1200 * Math.log2(aHz / bHz);
}

export function pitchClassDistanceCents(aHz, bHz) {
  const cents = Math.abs(centsBetween(aHz, bHz));
  if (!Number.isFinite(cents)) return Infinity;
  const wrapped = cents % 1200;
  return Math.min(wrapped, 1200 - wrapped);
}

export function createDwell({ dwellMs, toleranceCents, minFrames, pitchClass, gapMs = 350, minVoicedRatio = 0.6 }) {
  let samples = [];
  let misses = [];

  function reset() {
    samples = [];
    misses = [];
  }

  function medianOf(values) {
    if (!values.length) return null;
    const sorted = values.slice().sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2) return sorted[mid];
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }

  function prune(now) {
    const start = now - dwellMs;
    samples = samples.filter((sample) => sample.now >= start);
    misses = misses.filter((t) => t >= start);
  }

  function heldMs(now) {
    if (!samples.length) return 0;
    return Math.max(0, now - samples[0].now);
  }

  function centerHz(targetHz) {
    return pitchClass ? targetHz : medianOf(samples.map((sample) => sample.hz));
  }

  function distance(hz, targetHz) {
    const center = centerHz(targetHz);
    if (center == null) return 0;
    return pitchClass ? pitchClassDistanceCents(hz, targetHz) : Math.abs(centsBetween(hz, center));
  }

  return {
    reset,
    heldMs,
    medianHz() {
      return medianOf(samples.map((sample) => sample.hz));
    },
    latched(now, targetHz) {
      if (samples.length < minFrames || heldMs(now) < dwellMs) return false;
      const total = samples.length + misses.length;
      if (samples.length / total < minVoicedRatio) return false;
      return samples.every((sample) => {
        const dist = distance(sample.hz, targetHz);
        return Number.isFinite(dist) && dist <= toleranceCents;
      });
    },
    observe(hz, now, targetHz) {
      if (typeof hz !== "number" || !Number.isFinite(hz) || hz <= 0) {
        if (!samples.length || now - samples[samples.length - 1].now > gapMs) {
          reset();
          return 0;
        }
        misses.push(now);
        prune(now);
        return heldMs(now);
      }
      const dist = distance(hz, targetHz);
      if (!Number.isFinite(dist) || dist > toleranceCents) {
        if (pitchClass || !samples.length || now - samples[samples.length - 1].now > gapMs) {
          samples = pitchClass ? [] : [{ hz, now }];
          misses = [];
          return 0;
        }
        misses.push(now);
        prune(now);
        return heldMs(now);
      }
      samples.push({ hz, now });
      prune(now);
      return heldMs(now);
    },
  };
}

// The sender's note stays open while he is still humming. It locks on the median
// of the steady stretch when the hum goes quiet after the minimum, or at the ceiling.
export function createHold(tuning = TUNING) {
  const minHoldMs = tuning.minHoldMs;
  const ceilingMs = tuning.ceilingMs;
  const graceMs = tuning.graceMs;
  const releaseMs = tuning.releaseMs;
  const showHoldMs = tuning.showHoldMs;
  const minFrames = tuning.minLockFrames;
  const toleranceCents = tuning.stableCents;
  let samples = [];
  let locked = false;
  let lockHeldMs = 0;
  let lockReason = "";

  function medianOf(values) {
    if (!values.length) return null;
    const sorted = values.slice().sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2) return sorted[mid];
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }

  function span() {
    if (samples.length < 2) return 0;
    return samples[samples.length - 1].now - samples[0].now;
  }

  function medianHz() {
    return medianOf(samples.map((sample) => sample.hz));
  }

  function sameNote(hz) {
    const center = medianHz();
    if (center == null) return true;
    const dist = Math.abs(centsBetween(hz, center));
    return Number.isFinite(dist) && dist <= toleranceCents;
  }

  function snapshot() {
    const heldMs = locked ? lockHeldMs : span();
    let phase = "idle";
    if (locked) phase = "lock";
    else if (samples.length && heldMs >= showHoldMs) phase = "holding";
    else if (samples.length) phase = "forming";
    return { lock: locked, phase, heldMs, reason: lockReason };
  }

  function finish(reason, heldMs) {
    locked = true;
    lockReason = reason;
    lockHeldMs = heldMs;
    return snapshot();
  }

  function resetTo(hz, now) {
    samples = typeof hz === "number" && Number.isFinite(hz) && hz > 0 ? [{ hz, now }] : [];
    return snapshot();
  }

  return {
    reset() {
      samples = [];
      locked = false;
      lockHeldMs = 0;
      lockReason = "";
    },
    heldMs() {
      return locked ? lockHeldMs : span();
    },
    medianHz,
    latched() {
      return locked;
    },
    active() {
      return samples.length > 0 && !locked;
    },
    observe(hz, now, quiet = false) {
      if (locked) return snapshot();
      const pitch = typeof hz === "number" && Number.isFinite(hz) && hz > 0;
      if (!samples.length) {
        if (!pitch) return snapshot();
        samples = [{ hz, now }];
        return snapshot();
      }

      const last = samples[samples.length - 1].now;
      const gap = now - last;
      const held = span();
      const openMs = now - samples[0].now;
      const earned = samples.length >= minFrames && held >= minHoldMs;

      if (quiet && earned && gap >= releaseMs) {
        return finish("release", held);
      }
      if (earned && openMs >= ceilingMs) {
        return finish("ceiling", openMs);
      }

      if (pitch && sameNote(hz)) {
        if (!earned && gap > graceMs) return resetTo(hz, now);
        samples.push({ hz, now });
        const nextHeld = span();
        const nextOpen = now - samples[0].now;
        if (samples.length >= minFrames && nextHeld >= minHoldMs && nextOpen >= ceilingMs) {
          return finish("ceiling", nextOpen);
        }
        return snapshot();
      }

      if (gap <= graceMs || earned) return snapshot();
      if (pitch) return resetTo(hz, now);
      return resetTo(NaN, now);
    },
  };
}

// Sustain follows the held stretch. The fragment does not store a duration.
export function replaySustainSec(heldMs, tuning = TUNING) {
  if (typeof heldMs !== "number" || !Number.isFinite(heldMs)) return tuning.toneHoldGuestSec;
  const sec = heldMs / 1000;
  if (sec < tuning.toneHoldMinSec) return tuning.toneHoldMinSec;
  if (sec > tuning.toneHoldMaxSec) return tuning.toneHoldMaxSec;
  return sec;
}

// Listening either locks, or it ends in an explicit uncertain state. It does not
// stay on the capture controls just because sound was heard. An open steady
// stretch is not that failure: it is waiting for the hum to end or the ceiling.
export function captureListeningOutcome({ now, startedAt, heardSoundAt, latched, holding = false, tuning = TUNING }) {
  if (latched) return "lock";
  if (now - startedAt >= tuning.listenTimeoutMs) return "uncertain";
  if (holding) return "listen";
  if (typeof heardSoundAt === "number" && now - heardSoundAt >= tuning.voicedUncertainMs) return "uncertain";
  return "listen";
}

function rmsOf(samples) {
  let sum = 0;
  for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
  return Math.sqrt(sum / samples.length);
}

export function detectPitch(samples, sampleRate, tuning = TUNING) {
  const empty = { hz: null, confidence: 0, rms: 0, reason: "uncertain" };
  if (!samples || samples.length < 64 || !(sampleRate > 0) || !Number.isFinite(sampleRate)) {
    return empty;
  }
  const rms = rmsOf(samples);
  if (rms < tuning.silenceRms) {
    return { hz: null, confidence: 0, rms, reason: "quiet" };
  }

  const minLag = Math.max(2, Math.floor(sampleRate / tuning.detectMaxHz));
  const maxLag = Math.floor(sampleRate / tuning.minHz);
  const half = Math.floor(samples.length / 2);
  if (maxLag >= half || minLag >= maxLag) {
    return { hz: null, confidence: 0, rms, reason: "uncertain" };
  }

  const yin = new Float32Array(maxLag + 1);
  for (let tau = 1; tau <= maxLag; tau++) {
    let sum = 0;
    const limit = samples.length - tau;
    for (let i = 0; i < limit; i++) {
      const delta = samples[i] - samples[i + tau];
      sum += delta * delta;
    }
    yin[tau] = sum;
  }

  yin[0] = 1;
  let running = 0;
  for (let tau = 1; tau <= maxLag; tau++) {
    running += yin[tau];
    yin[tau] = running === 0 ? 1 : (yin[tau] * tau) / running;
  }

  let tau = minLag;
  while (tau <= maxLag && yin[tau] > tuning.yinThreshold) tau++;
  if (tau > maxLag) {
    let best = minLag;
    for (let t = minLag + 1; t <= maxLag; t++) if (yin[t] < yin[best]) best = t;
    return { hz: null, confidence: 1 - yin[best], rms, reason: "uncertain" };
  }
  while (tau + 1 <= maxLag && yin[tau + 1] < yin[tau]) tau++;

  let refined = tau;
  if (tau > 0 && tau < maxLag) {
    const s0 = yin[tau - 1];
    const s1 = yin[tau];
    const s2 = yin[tau + 1];
    const denom = 2 * s1 - s2 - s0;
    if (denom !== 0) refined = tau + (s2 - s0) / (2 * denom);
  }
  if (!(refined > 0)) {
    return { hz: null, confidence: 0, rms, reason: "uncertain" };
  }

  const hz = sampleRate / refined;
  const confidence = 1 - yin[tau];
  if (!Number.isFinite(hz) || !Number.isFinite(confidence)) {
    return { hz: null, confidence: 0, rms, reason: "uncertain" };
  }
  if (confidence < tuning.minConfidence) {
    return { hz: null, confidence, rms, reason: "uncertain" };
  }
  if (hz < tuning.minHz || hz > tuning.maxHz) {
    return { hz: null, confidence, rms, reason: "range" };
  }
  return { hz, confidence, rms, reason: "pitch" };
}
