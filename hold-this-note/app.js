import {
  TUNING,
  encodeFragment,
  decodeFragment,
  createDwell,
  detectPitch,
} from "./pitch.js";

const ledeEl = document.getElementById("lede");
const statusEl = document.getElementById("status");
const markEl = document.getElementById("mark");
const meterEl = document.getElementById("meter");
const actionsEl = document.getElementById("actions");

const COPY = {
  soloLede: "Hum one steady note. This page catches the pitch and plays it back as a tone. Your voice stays on this device.",
  listen: "Listening. Hum one note and hold it.",
  hearing: "Hearing you. Hold it steady.",
  holding: "Holding steady.",
  quiet: "Still quiet. Hum a little closer, or cancel.",
  noise: "That's hard to hear as one note. Try a steady hum.",
  range: "That pitch is outside what this page can hold. Try a comfortable hum.",
  locked: "Got it. This plays your pitch as a tone, not a recording.",
  played: "That's the tone.",
  timeout: "No steady note landed. Try again whenever you like.",
  denied: "The microphone stayed off. If the browser didn't ask, allow the microphone for this site, then try again.",
  noDevice: "No microphone is available. You can still play a tone from a link someone sends you.",
  busyMic: "The microphone is busy in another app. You can try again when it's free.",
  unsupported: "This browser can't listen for a hum. You can still open a link and play the tone.",
  noAudio: "This browser can't play the tone.",
  interrupted: "Listening stopped. Tap start when you want to try again.",
  recipientLede: "Someone held a note for you. Tap to hear their pitch as a tone. It isn't their voice.",
  playFirst: "Play the tone before matching, so the speaker can't count as your hum.",
  listenOnly: "Listening is enough if you'd rather not hum.",
  notYet: "Not yet. Hum toward the tone.",
  staying: "Not yet. Hold it steady.",
  landed: "You landed.",
  matchTimeout: "Still not yet. You can try again, replay the tone, or leave it.",
  matchNeedsMic: "Matching needs a microphone, and this browser can't use one. You can still play the tone.",
  badLink: "This link doesn't hold a note. You can hold one of your own.",
  playing: "Playing the tone.",
  shareDone: "The share sheet closed. This page can't tell whether the link was delivered.",
  shareCancel: "Share canceled. The link was not sent.",
  shareError: "Sharing didn't finish. You can copy the link instead.",
  copied: "Link copied. It only carries the pitch. Anyone with this link can play the tone.",
  copyFail: "Couldn't copy. The link is selected so you can copy it.",
  linkNote: "The link is not secret. Anyone with it can play the tone.",
};

let route = { kind: "solo" };
let mode = "solo";
let lockedHz = null;
let heardTone = false;
let listening = false;
let starting = false;
let stopRequested = false;
let playbackActive = false;
let playGen = 0;
let audioCtx = null;
let stream = null;
let sourceNode = null;
let analyser = null;
let muteNode = null;
let timeBuf = null;
let currentOsc = null;
let currentGain = null;
let ticker = null;
let listenStartedAt = 0;
let level = "quiet";
let dwell = null;

function micSupported() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.isSecureContext);
}

function audioSupported() {
  return !!(window.AudioContext || window.webkitAudioContext);
}

function setStatus(text) {
  if (statusEl.textContent !== text) statusEl.textContent = text;
}

function setLede(text) {
  ledeEl.textContent = text;
}

function setMark(kind) {
  markEl.className = kind ? "mark " + kind : "mark";
  markEl.hidden = !kind;
  if (kind === "landed") markEl.textContent = "You landed";
  else if (kind === "notyet") markEl.textContent = "Not yet";
  else markEl.textContent = "";
}

function setMeter(text, ratio) {
  meterEl.hidden = !text;
  const label = meterEl.querySelector("span");
  if (label.textContent !== text) label.textContent = text;
  const bar = meterEl.querySelector("i");
  const clamped = Math.max(0, Math.min(1, ratio || 0));
  bar.style.transform = "scaleX(" + clamped + ")";
}

function clearActions() {
  actionsEl.replaceChildren();
}

function addButton(label, onClick, opts) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  if (opts && opts.primary) button.className = "primary";
  if (opts && opts.disabled) button.disabled = true;
  button.addEventListener("click", onClick);
  actionsEl.appendChild(button);
  return button;
}

function addNote(text) {
  const p = document.createElement("p");
  p.className = "hint";
  p.textContent = text;
  actionsEl.appendChild(p);
}

function addLinkField(url) {
  const input = document.createElement("input");
  input.type = "text";
  input.readOnly = true;
  input.value = url;
  input.setAttribute("aria-label", "Link to this pitch");
  input.addEventListener("focus", () => input.select());
  actionsEl.appendChild(input);
  input.focus();
  input.select();
}

function focusFirstAction() {
  const target = actionsEl.querySelector("button:not([disabled])") || actionsEl.querySelector("button");
  if (target) target.focus();
}

function shareUrl(hz) {
  const url = new URL(location.href);
  url.search = "";
  url.hash = encodeFragment(hz);
  return url.toString();
}

function releaseMic() {
  if (ticker) {
    clearInterval(ticker);
    ticker = null;
  }
  dwell = null;
  if (sourceNode) {
    try { sourceNode.disconnect(); } catch (err) { /* already gone */ }
    sourceNode = null;
  }
  if (analyser) {
    try { analyser.disconnect(); } catch (err) { /* already gone */ }
    analyser = null;
  }
  if (muteNode) {
    try { muteNode.disconnect(); } catch (err) { /* already gone */ }
    muteNode = null;
  }
  if (stream) {
    stopRequested = true;
    stream.getTracks().forEach((track) => {
      track.onended = null;
      track.stop();
    });
    stream = null;
  }
  if (timeBuf) timeBuf.fill(0);
  listening = false;
  setMeter("", 0);
}

function stopTone() {
  playGen += 1;
  playbackActive = false;
  const osc = currentOsc;
  const gain = currentGain;
  currentOsc = null;
  currentGain = null;
  if (!osc) return;
  try {
    const now = audioCtx ? audioCtx.currentTime : 0;
    if (gain) {
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(0, now);
    }
    osc.stop(now);
  } catch (err) { /* already stopped */ }
  try { osc.disconnect(); } catch (err) { /* already gone */ }
  try { if (gain) gain.disconnect(); } catch (err) { /* already gone */ }
}

function haltAudio() {
  releaseMic();
  stopTone();
}

function ensureContext() {
  if (!audioCtx) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    audioCtx = new Ctor();
  }
  return audioCtx;
}

function renderSolo() {
  mode = "solo";
  lockedHz = null;
  heardTone = false;
  setLede(COPY.soloLede);
  setMark("");
  setMeter("", 0);
  clearActions();
  if (!audioSupported()) {
    setStatus(COPY.noAudio);
    return;
  }
  if (!micSupported()) {
    setStatus(COPY.unsupported);
    return;
  }
  setStatus("");
  addButton("Start listening", () => startListening("capture"), { primary: true });
}

function renderLocked() {
  mode = "locked";
  setLede(COPY.soloLede);
  setMark("");
  setMeter("", 0);
  setStatus(COPY.locked);
  clearActions();
  addButton("Play the tone", () => playCurrent(), { primary: true });
  addButton("Try again", () => {
    haltAudio();
    renderSolo();
    focusFirstAction();
  });
  addButton("Copy link", () => copyLink());
  if (navigator.share) addButton("Share link", () => shareLink());
  addNote(COPY.linkNote);
}

function renderRecipient() {
  mode = "recipient";
  setLede(COPY.recipientLede);
  setMark("");
  setMeter("", 0);
  setStatus(heardTone ? COPY.played : "");
  clearActions();
  if (!audioSupported()) {
    setStatus(COPY.noAudio);
    addButton("Hold one of your own", () => makeOwn(), { primary: true });
    return;
  }
  addButton("Play the tone", () => playCurrent(), { primary: true });
  if (!heardTone) addNote(COPY.playFirst);
  addNote(COPY.listenOnly);
  if (!micSupported()) {
    addNote(COPY.matchNeedsMic);
  } else {
    addButton("Start matching", () => startListening("match"), { disabled: !heardTone || playbackActive });
  }
  addButton("Hold one of your own", () => makeOwn());
}

function renderMatch() {
  mode = "match";
  setLede(COPY.recipientLede);
  setMark("notyet");
  setStatus(COPY.notYet);
  clearActions();
  addButton("Stop", () => stopToRecipient(COPY.interrupted), { primary: true });
  addButton("Play the tone", () => replayFromMatch());
  addButton("Hold one of your own", () => makeOwn());
}

function renderLanded() {
  mode = "landed";
  setLede(COPY.recipientLede);
  setMark("landed");
  setMeter("", 0);
  setStatus(COPY.landed);
  clearActions();
  addButton("Play the tone", () => playCurrent(), { primary: true });
  if (micSupported()) addButton("Match again", () => startListening("match"));
  addButton("Hold one of your own", () => makeOwn());
}

function renderBad() {
  mode = "bad";
  lockedHz = null;
  setLede(COPY.badLink);
  setMark("");
  setMeter("", 0);
  setStatus("");
  clearActions();
  addButton("Hold one of your own", () => makeOwn(), { primary: true });
}

function renderPlaying(returnMode) {
  mode = "playing";
  clearActions();
  setStatus(COPY.playing);
  addButton("Stop", () => {
    stopTone();
    restoreAfterPlay(returnMode);
    focusFirstAction();
  }, { primary: true });
}

function applyRoute() {
  haltAudio();
  const hash = location.hash;
  if (!hash || hash === "#") {
    route = { kind: "solo" };
    renderSolo();
    return;
  }
  const hz = decodeFragment(hash);
  if (hz == null) {
    route = { kind: "bad" };
    renderBad();
    return;
  }
  route = { kind: "recipient", hz };
  lockedHz = hz;
  heardTone = false;
  renderRecipient();
}

function makeOwn() {
  haltAudio();
  const url = new URL(location.href);
  url.search = "";
  url.hash = "";
  history.replaceState(null, "", url.pathname);
  route = { kind: "solo" };
  renderSolo();
  focusFirstAction();
}

function micErrorCopy(err) {
  const name = err && err.name;
  if (name === "NotAllowedError" || name === "PermissionDeniedError") return COPY.denied;
  if (name === "NotFoundError" || name === "DevicesNotFoundError") return COPY.noDevice;
  if (name === "NotReadableError" || name === "TrackStartError") return COPY.busyMic;
  if (name === "SecurityError") return COPY.unsupported;
  return COPY.denied;
}

function showMicError(err) {
  releaseMic();
  setMark("");
  setMeter("", 0);
  setStatus(micErrorCopy(err));
  clearActions();
  if (micSupported()) addButton("Try again", () => startListening(route.kind === "recipient" ? "match" : "capture"), { primary: true });
  if (route.kind === "recipient") addButton("Play the tone", () => playCurrent());
  addButton(route.kind === "recipient" ? "Back" : "Start over", () => {
    if (route.kind === "recipient") renderRecipient();
    else renderSolo();
    focusFirstAction();
  });
  focusFirstAction();
}

async function startListening(purpose) {
  if (starting || listening || playbackActive) return;
  if (!micSupported()) {
    setStatus(purpose === "match" ? COPY.matchNeedsMic : COPY.unsupported);
    return;
  }
  if (purpose === "match" && (!heardTone || route.kind !== "recipient")) return;
  starting = true;
  stopRequested = false;
  try {
    const ctx = ensureContext();
    const resumePromise = ctx.resume();
    let nextStream;
    try {
      nextStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false,
          channelCount: 1,
        },
        video: false,
      });
    } catch (err) {
      if (err && err.name === "OverconstrainedError") {
        nextStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      } else {
        throw err;
      }
    }
    await resumePromise;
    if (stopRequested || document.visibilityState === "hidden") {
      nextStream.getTracks().forEach((track) => track.stop());
      return;
    }
    stream = nextStream;
    listening = true;
    sourceNode = ctx.createMediaStreamSource(stream);
    analyser = ctx.createAnalyser();
    analyser.fftSize = TUNING.fftSize;
    analyser.smoothingTimeConstant = 0;
    muteNode = ctx.createGain();
    muteNode.gain.value = 0;
    sourceNode.connect(analyser);
    analyser.connect(muteNode);
    muteNode.connect(ctx.destination);
    timeBuf = new Float32Array(analyser.fftSize);
    listenStartedAt = performance.now();
    level = "quiet";
    if (purpose === "match") {
      dwell = createDwell({
        dwellMs: TUNING.matchDwellMs,
        toleranceCents: TUNING.matchCents,
        minFrames: TUNING.minMatchFrames,
        pitchClass: true,
      });
      renderMatch();
    } else {
      dwell = createDwell({
        dwellMs: TUNING.lockMs,
        toleranceCents: TUNING.stableCents,
        minFrames: TUNING.minLockFrames,
        pitchClass: false,
      });
      mode = "listen";
      setMark("");
      setStatus(COPY.listen);
      setMeter("Quiet", 0);
      clearActions();
      addButton("Cancel", () => {
        releaseMic();
        renderSolo();
        setStatus(COPY.interrupted);
        focusFirstAction();
      }, { primary: true });
    }
    stream.getTracks().forEach((track) => {
      track.onended = () => {
        if (stopRequested || !listening) return;
        releaseMic();
        setStatus(COPY.interrupted);
        clearActions();
        addButton("Try again", () => startListening(purpose), { primary: true });
        if (purpose === "match") addButton("Play the tone", () => playCurrent());
        focusFirstAction();
      };
    });
    ticker = setInterval(() => analyse(purpose), TUNING.analysisEveryMs);
    focusFirstAction();
  } catch (err) {
    showMicError(err);
  } finally {
    starting = false;
  }
}

function analyse(purpose) {
  if (!listening || !analyser || !timeBuf || !dwell) return;
  analyser.getFloatTimeDomainData(timeBuf);
  const now = performance.now();
  const found = detectPitch(timeBuf, audioCtx.sampleRate, TUNING);
  timeBuf.fill(0);
  const timeoutMs = purpose === "match" ? TUNING.matchTimeoutMs : TUNING.listenTimeoutMs;

  if (found.rms >= TUNING.soundRms) level = "sound";
  else if (found.rms < TUNING.silenceRms) level = "quiet";

  if (found.reason === "pitch") {
    const held = dwell.observe(found.hz, now, lockedHz);
    if (dwell.latched(now)) {
      if (purpose === "match") {
        releaseMic();
        renderLanded();
        focusFirstAction();
      } else {
        const hz = dwell.medianHz();
        releaseMic();
        try {
          lockedHz = decodeFragment(encodeFragment(hz));
        } catch (err) {
          setStatus(COPY.range);
          renderSolo();
          focusFirstAction();
          return;
        }
        renderLocked();
        focusFirstAction();
      }
      return;
    }
    if (purpose === "match") {
      setMark("notyet");
      setStatus(held > 0 ? COPY.staying : COPY.notYet);
      setMeter(held > 0 ? "Holding steady" : "Not yet", held / TUNING.matchDwellMs);
    } else {
      setStatus(held > 0 ? COPY.holding : COPY.hearing);
      setMeter(held > 0 ? "Holding steady" : "Hearing you", held / TUNING.lockMs);
    }
  } else {
    dwell.observe(NaN, now, lockedHz);
    if (found.reason === "range") {
      setStatus(COPY.range);
      setMeter("Outside range", 0);
    } else if (found.reason === "uncertain" && level === "sound") {
      setStatus(COPY.noise);
      setMeter("Not one note", 0);
    } else if (purpose === "match") {
      setMark("notyet");
      setStatus(COPY.notYet);
      setMeter("Not yet", 0);
    } else if (level === "quiet" && now - listenStartedAt > 2000) {
      setStatus(COPY.quiet);
      setMeter("Quiet", 0);
    } else {
      setStatus(COPY.listen);
      setMeter("Quiet", 0);
    }
  }

  if (now - listenStartedAt >= timeoutMs) {
    releaseMic();
    setMark(purpose === "match" ? "notyet" : "");
    setStatus(purpose === "match" ? COPY.matchTimeout : COPY.timeout);
    clearActions();
    addButton("Try again", () => startListening(purpose), { primary: true });
    if (purpose === "match") {
      addButton("Play the tone", () => playCurrent());
      addButton("Hold one of your own", () => makeOwn());
    }
    focusFirstAction();
  }
}

function restoreAfterPlay(returnMode) {
  if (returnMode === "locked") renderLocked();
  else if (returnMode === "landed") renderLanded();
  else renderRecipient();
  if (heardTone && returnMode !== "locked") setStatus(COPY.played);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function playHz(hz, returnMode) {
  if (playbackActive || starting || listening) return;
  if (!audioSupported() || hz == null) {
    setStatus(COPY.noAudio);
    return;
  }
  const token = ++playGen;
  playbackActive = true;
  releaseMic();
  try {
    const ctx = ensureContext();
    if (ctx.state === "suspended") await ctx.resume();
    if (token !== playGen || document.visibilityState === "hidden") {
      if (token === playGen) playbackActive = false;
      return;
    }
    renderPlaying(returnMode);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    currentOsc = osc;
    currentGain = gain;
    osc.type = "sine";
    const start = ctx.currentTime;
    osc.frequency.setValueAtTime(hz, start);
    const peak = TUNING.tonePeakGain;
    const releaseAt = start + TUNING.toneAttackSec + TUNING.toneHoldSec + TUNING.toneReleaseSec;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(peak, start + TUNING.toneAttackSec);
    gain.gain.setValueAtTime(peak, start + TUNING.toneAttackSec + TUNING.toneHoldSec);
    gain.gain.linearRampToValueAtTime(0, releaseAt);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(releaseAt + 0.02);
    await new Promise((resolve) => {
      osc.onended = () => {
        try {
          gain.gain.cancelScheduledValues(ctx.currentTime);
          gain.gain.setValueAtTime(0, ctx.currentTime);
        } catch (err) { /* node already closed */ }
        try { osc.disconnect(); } catch (err) { /* already gone */ }
        try { gain.disconnect(); } catch (err) { /* already gone */ }
        if (currentOsc === osc) currentOsc = null;
        if (currentGain === gain) currentGain = null;
        resolve();
      };
    });
    if (token !== playGen || document.visibilityState === "hidden") {
      if (token === playGen) playbackActive = false;
      return;
    }
    if (route.kind === "recipient") heardTone = true;
    setStatus(COPY.played);
    clearActions();
    await delay(TUNING.postPlaySettleMs);
    if (token !== playGen || document.visibilityState === "hidden") {
      if (token === playGen) {
        playbackActive = false;
        if (route.kind === "recipient") heardTone = false;
      }
      return;
    }
    playbackActive = false;
    restoreAfterPlay(returnMode);
    if (returnMode === "locked") setStatus(COPY.played);
  } catch (err) {
    if (token === playGen) {
      const osc = currentOsc;
      const gain = currentGain;
      currentOsc = null;
      currentGain = null;
      try { if (gain && audioCtx) gain.gain.setValueAtTime(0, audioCtx.currentTime); } catch (ignore) { /* already gone */ }
      try { if (osc) osc.stop(); } catch (ignore) { /* already stopped */ }
      try { if (osc) osc.disconnect(); } catch (ignore) { /* already gone */ }
      try { if (gain) gain.disconnect(); } catch (ignore) { /* already gone */ }
      playbackActive = false;
      setStatus("Couldn't play the tone. Tap play to try again.");
      restoreAfterPlay(returnMode);
    }
  }
}

function playCurrent() {
  const returnMode = mode === "landed" ? "landed" : mode === "locked" ? "locked" : "recipient";
  const hz = lockedHz;
  playHz(hz, returnMode);
}

async function replayFromMatch() {
  if (playbackActive) return;
  releaseMic();
  await playHz(lockedHz, "recipient");
}

async function copyLink() {
  if (lockedHz == null || mode !== "locked") return;
  const url = shareUrl(lockedHz);
  try {
    await navigator.clipboard.writeText(url);
    setStatus(COPY.copied);
  } catch (err) {
    setStatus(COPY.copyFail);
    addLinkField(url);
  }
}

async function shareLink() {
  if (lockedHz == null || mode !== "locked") return;
  const url = shareUrl(lockedHz);
  if (!navigator.share) {
    setStatus(COPY.shareError);
    return;
  }
  try {
    await navigator.share({
      title: "Hold This Note",
      text: "A pitch, played as a tone.",
      url,
    });
    setStatus(COPY.shareDone);
  } catch (err) {
    if (err && err.name === "AbortError") setStatus(COPY.shareCancel);
    else setStatus(COPY.shareError);
  }
}

function stopToRecipient(message) {
  releaseMic();
  renderRecipient();
  setStatus(message);
  focusFirstAction();
}

function onHide() {
  const wasListening = listening;
  const wasPlaying = playbackActive;
  haltAudio();
  if (wasPlaying && route.kind === "recipient") heardTone = false;
  if (wasListening) {
    if (route.kind === "recipient" && (mode === "match" || mode === "listen")) {
      renderRecipient();
      setStatus(COPY.interrupted);
    } else {
      renderSolo();
      setStatus(COPY.interrupted);
    }
  } else if (wasPlaying) {
    if (mode === "playing") {
      if (route.kind === "recipient") renderRecipient();
      else if (lockedHz != null) renderLocked();
      else renderSolo();
    }
    setStatus("Playback stopped.");
  }
}

window.addEventListener("pagehide", onHide);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") onHide();
});
window.addEventListener("pageshow", (event) => {
  if (event.persisted) onHide();
});
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (listening) {
    event.preventDefault();
    if (route.kind === "recipient") stopToRecipient(COPY.interrupted);
    else {
      releaseMic();
      renderSolo();
      setStatus(COPY.interrupted);
      focusFirstAction();
    }
  } else if (playbackActive && currentOsc) {
    event.preventDefault();
    const returnMode = route.kind === "recipient" ? "recipient" : lockedHz != null ? "locked" : "solo";
    stopTone();
    if (returnMode === "recipient") renderRecipient();
    else if (returnMode === "locked") renderLocked();
    else renderSolo();
    setStatus("Playback stopped.");
    focusFirstAction();
  }
});

applyRoute();
