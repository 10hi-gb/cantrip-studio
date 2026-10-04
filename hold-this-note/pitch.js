// Tunable implementation choices. Not founder-locked. See BUILD.md.
export const TUNING = {
  minHz: 80,
  maxHz: 1000,
  yinThreshold: 0.15,
  minConfidence: 0.85,
  silenceRms: 0.008,
  soundRms: 0.015,
  // Cents from the median of the current lock window, not from the first frame.
  stableCents: 60,
  lockMs: 1500,
  minLockFrames: 2,
  // Short dropouts inside an otherwise steady hum do not wipe the window.
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
  tonePeakGain: 0.08,
  toneAttackSec: 0.05,
  toneHoldSec: 0.7,
  toneReleaseSec: 0.2,
  postPlaySettleMs: 250,
  analysisEveryMs: 50,
  fftSize: 2048,
  // Search above the stored range so a high note is refused instead of folded down an octave.
  detectMaxHz: 2000,
};

// "#1." + decihertz. Largest valid form is "#1.10000".
export const MAX_FRAGMENT_CHARS = 8;
const FRAGMENT_RE = /^1\.(?:[1-9][0-9]{2,4})$/;

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

// Listening either locks, or it ends in an explicit uncertain state. It does not
// stay on the capture controls just because sound was heard.
export function captureListeningOutcome({ now, startedAt, heardSoundAt, latched, tuning = TUNING }) {
  if (latched) return "lock";
  if (typeof heardSoundAt === "number" && now - heardSoundAt >= tuning.voicedUncertainMs) return "uncertain";
  if (now - startedAt >= tuning.listenTimeoutMs) return "uncertain";
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
