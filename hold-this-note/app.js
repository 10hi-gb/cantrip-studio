import {
  TUNING,
  encodeFragment,
  decodeFragment,
  createDwell,
  detectPitch,
  captureListeningOutcome,
  toneMix,
} from "./pitch.js";

const ledeEl = document.getElementById("lede");
const statusEl = document.getElementById("status");
const markEl = document.getElementById("mark");
const meterEl = document.getElementById("meter");
const stringEl = document.getElementById("string");
const actionsEl = document.getElementById("actions");

const COPY = {
  soloLede: "Hum a note. We'll catch the pitch and play it back as a tone — not your voice.",
  micBody: "We'll listen for a moment, on this phone. Your voice isn't recorded, and it isn't sent. The link just carries the pitch, so someone else can hear it as a tone.",
  micAbout: "Listening happens on your device, and only after you start it. We don't save a recording of your voice, and we don't send one. The link carries the pitch so the other phone can play a tone. We don't promise the pitch is exact, or that the message gets there.",
  listen: "Hum something comfortable.",
  hearing: "Hum something comfortable.",
  holding: "Hold it steady.",
  uncertain: "Didn't catch a steady note.",
  holdNote: "Hold a note",
  sendIt: "Send it",
  tryAgain: "Try again",
  makeOneBack: "Make one back",
  humAlong: "Hum along",
  playNote: "Play the note",
  locked: "Got it.",
  lockedSub: "That's your pitch, played as a tone.",
  toneFailed: "Couldn't play the tone.",
  played: "That's the one.",
  denied: "The mic is off, so we can't catch a pitch. You can allow it in the browser. If someone sent you a note, you can still play it.",
  unavailable: "This browser can't use the microphone. If someone sent you a note, you can still play it.",
  busyMic: "The microphone is in use somewhere else. You can try again when it's free.",
  noAudio: "This browser can't play the note.",
  interrupted: "Hum another, whenever you're ready.",
  recipientLede: "A note for you. Their pitch, played as a tone. Not their voice.",
  matching: "Hum along if you want. We'll say when you land on it.",
  listenOnly: "You can just play the note. Matching takes hearing it and humming along.",
  notYet: "Not yet. Keep going.",
  landed: "You landed.",
  landedSub: "Same note.",
  badLink: "That link doesn't hold a note.",
  playing: "That's the one.",
  shareDone: "That's as far as this page goes. Your note's still here if you need it.",
  shareCancel: "Didn't send. Your note's still here.",
  shareError: "Couldn't share from here.",
  copied: "Link copied. Send it when you want.",
  copyFail: "Couldn't copy. The link is selected so you can copy it.",
  cancel: "Cancel",
  stop: "Stop",
  holdOneBack: "Hold one back",
  holdOneYourself: "Hold one yourself",
  back: "Back",
  startOver: "Start over",
  aboutMic: "About the mic",
  playbackStopped: "Playback stopped.",
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
let toneNodes = [];
let ticker = null;
let listenStartedAt = 0;
let heardSoundAt = null;
let level = "quiet";
let dwell = null;
let sharing = false;

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


function setString(state) {
  if (!stringEl) return;
  stringEl.dataset.state = state || "idle";
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

function addAboutMic() {
  const details = document.createElement("details");
  const summary = document.createElement("summary");
  summary.textContent = COPY.aboutMic;
  const note = document.createElement("p");
  note.className = "hint";
  note.textContent = COPY.micAbout;
  details.append(summary, note);
  actionsEl.appendChild(details);
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

function stopToneNodes() {
  const nodes = toneNodes.splice(0);
  const now = audioCtx ? audioCtx.currentTime : 0;
  for (const node of nodes) {
    try {
      if (node.gain && typeof node.gain.cancelScheduledValues === "function") {
        node.gain.cancelScheduledValues(now);
        node.gain.setValueAtTime(0, now);
      }
    } catch (err) { /* already gone */ }
    try { if (typeof node.stop === "function") node.stop(now); } catch (err) { /* already stopped */ }
    try { node.disconnect(); } catch (err) { /* already gone */ }
  }
  currentOsc = null;
  currentGain = null;
}

function stopTone() {
  playGen += 1;
  playbackActive = false;
  stopToneNodes();
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
  setString("idle");
  setMark("");
  setMeter("", 0);
  clearActions();
  if (!audioSupported()) {
    setStatus(COPY.noAudio);
    return;
  }
  if (!micSupported()) {
    setStatus(COPY.unavailable);
    return;
  }
  setStatus(COPY.micBody);
  addButton(COPY.holdNote, () => startListening("capture"), { primary: true });
  addAboutMic();
}

function renderLocked() {
  mode = "locked";
  setLede(COPY.soloLede);
  setString("held");
  setMark("");
  setMeter("", 0);
  setStatus(COPY.locked);
  clearActions();
  addNote(COPY.lockedSub);
  addButton(COPY.sendIt, () => sendNote(), { primary: true });
  addButton(COPY.tryAgain, () => retryCapture());
}

function renderRecipient() {
  mode = "recipient";
  setLede(COPY.recipientLede);
  setString("held");
  setMark("");
  setMeter("", 0);
  setStatus(heardTone ? COPY.played : "");
  clearActions();
  if (!audioSupported()) {
    setStatus(COPY.noAudio);
    addButton(COPY.holdOneBack, () => makeOwn(), { primary: true });
    return;
  }
  addButton(COPY.playNote, () => playCurrent(), { primary: true });
  addNote(COPY.matching);
  addNote(COPY.listenOnly);
  if (!micSupported()) {
    addNote(COPY.unavailable);
  } else {
    addButton(COPY.humAlong, () => startListening("match"), { disabled: !heardTone || playbackActive });
  }
  addButton(COPY.holdOneBack, () => makeOwn());
}

function renderMatch() {
  mode = "match";
  setLede(COPY.recipientLede);
  setString("match");
  setMark("notyet");
  setStatus(COPY.notYet);
  clearActions();
  addButton(COPY.stop, () => stopToRecipient(COPY.interrupted), { primary: true });
  addButton(COPY.playNote, () => replayFromMatch());
  addButton(COPY.holdOneBack, () => makeOwn());
}

function renderLanded() {
  mode = "landed";
  setLede(COPY.recipientLede);
  setString("landed");
  setMark("landed");
  setMeter("", 0);
  setStatus(COPY.landed);
  clearActions();
  addNote(COPY.landedSub);
  addButton(COPY.makeOneBack, () => makeOwn(), { primary: true });
}

function renderBad() {
  mode = "bad";
  lockedHz = null;
  setLede(COPY.badLink);
  setString("dim");
  setMark("");
  setMeter("", 0);
  setStatus("");
  clearActions();
  addButton(COPY.holdOneYourself, () => makeOwn(), { primary: true });
}

function renderPlaying(returnMode) {
  mode = "playing";
  clearActions();
  setStatus(COPY.playing);
  addButton(COPY.stop, () => {
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
  if (name === "NotFoundError" || name === "DevicesNotFoundError") return COPY.unavailable;
  if (name === "NotReadableError" || name === "TrackStartError") return COPY.busyMic;
  if (name === "SecurityError") return COPY.unavailable;
  return COPY.denied;
}

function showMicError(err) {
  releaseMic();
  setString("dim");
  setMark("");
  setMeter("", 0);
  setStatus(micErrorCopy(err));
  clearActions();
  if (micSupported()) addButton(COPY.tryAgain, () => startListening(route.kind === "recipient" ? "match" : "capture"), { primary: true });
  if (route.kind === "recipient") addButton(COPY.playNote, () => playCurrent());
  addButton(route.kind === "recipient" ? COPY.back : COPY.startOver, () => {
    if (route.kind === "recipient") renderRecipient();
    else renderSolo();
    focusFirstAction();
  });
  focusFirstAction();
}

async function startListening(purpose) {
  if (starting || listening || playbackActive) return;
  if (!micSupported()) {
    setStatus(COPY.unavailable);
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
          // Processing gates a hum into confident-looking sound that never holds one pitch.
          echoCancellation: false,
          noiseSuppression: false,
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
    heardSoundAt = null;
    level = "quiet";
    if (purpose === "match") {
      dwell = createDwell({
        dwellMs: TUNING.matchDwellMs,
        toleranceCents: TUNING.matchCents,
        minFrames: TUNING.minMatchFrames,
        pitchClass: true,
        gapMs: TUNING.gapMs,
        minVoicedRatio: TUNING.minVoicedRatio,
      });
      renderMatch();
    } else {
      dwell = createDwell({
        dwellMs: TUNING.lockMs,
        toleranceCents: TUNING.stableCents,
        minFrames: TUNING.minLockFrames,
        pitchClass: false,
        gapMs: TUNING.gapMs,
        minVoicedRatio: TUNING.minVoicedRatio,
      });
      mode = "listen";
      setString("capture");
      setMark("");
      setStatus(COPY.listen);
      setMeter("Hum something comfortable.", 0);
      clearActions();
      addButton(COPY.cancel, () => {
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
        setString("dim");
        setStatus(COPY.interrupted);
        clearActions();
        addButton(COPY.tryAgain, () => startListening(purpose), { primary: true });
        if (purpose === "match") addButton(COPY.playNote, () => playCurrent());
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

  if (found.rms >= TUNING.soundRms) {
    level = "sound";
    if (heardSoundAt == null) heardSoundAt = now;
  } else if (found.rms < TUNING.silenceRms) level = "quiet";

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
          renderSolo();
          setStatus(COPY.uncertain);
          focusFirstAction();
          return;
        }
        renderLocked();
        focusFirstAction();
        void playLockedTone(lockedHz);
      }
      return;
    }
    if (purpose === "match") {
      setMark("notyet");
      setStatus(COPY.notYet);
      setMeter("Not yet", held / TUNING.matchDwellMs);
    } else {
      setStatus(held > 0 ? COPY.holding : COPY.hearing);
      setMeter(held > 0 ? "Hold it steady." : "Hum something comfortable.", held / TUNING.lockMs);
    }
  } else {
    dwell.observe(NaN, now, lockedHz);
    if (found.reason === "range") {
      setStatus(COPY.uncertain);
      setMeter("Hold it steady.", 0);
    } else if (found.reason === "uncertain" && level === "sound") {
      setStatus(COPY.uncertain);
      setMeter("Hold it steady.", 0);
    } else if (purpose === "match") {
      setMark("notyet");
      setStatus(COPY.notYet);
      setMeter("Not yet", 0);
    } else if (level === "quiet" && now - listenStartedAt > 2000) {
      setStatus(COPY.listen);
      setMeter("Hum something comfortable.", 0);
    } else {
      setStatus(COPY.listen);
      setMeter("Hum something comfortable.", 0);
    }
  }

  const outcome = purpose === "capture"
    ? captureListeningOutcome({
      now,
      startedAt: listenStartedAt,
      heardSoundAt,
      latched: false,
    })
    : (now - listenStartedAt >= timeoutMs ? "uncertain" : "listen");
  if (outcome === "uncertain") finishUncertain(purpose);
}

function finishUncertain(purpose) {
  releaseMic();
  setString("dim");
  setMark(purpose === "match" ? "notyet" : "");
  setStatus(purpose === "match" ? COPY.notYet : COPY.uncertain);
  clearActions();
  addButton(COPY.tryAgain, () => startListening(purpose), { primary: true });
  if (purpose === "match") {
    addButton(COPY.playNote, () => playCurrent());
    addButton(COPY.holdOneBack, () => makeOwn());
  }
  focusFirstAction();
}

function restoreAfterPlay(returnMode) {
  if (returnMode === "locked") renderLocked();
  else if (returnMode === "landed") renderLanded();
  else renderRecipient();
  if (heardTone && returnMode !== "locked") setStatus(COPY.played);
  focusFirstAction();
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function retryCapture() {
  stopTone();
  startListening("capture");
}

async function playLockedTone(hz) {
  await runTone(hz, { holdScreen: true });
}

async function runTone(hz, options) {
  const holdScreen = !!(options && options.holdScreen);
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
    if (!holdScreen) {
      renderPlaying("recipient");
      focusFirstAction();
    }
    const mix = toneMix(hz);
    const master = ctx.createGain();
    const oscs = [];
    const start = ctx.currentTime;
    mix.multiples.forEach((multiple, index) => {
      const osc = ctx.createOscillator();
      const partial = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(hz * multiple, start);
      partial.gain.setValueAtTime(mix.gains[index], start);
      osc.connect(partial);
      partial.connect(master);
      oscs.push(osc);
      toneNodes.push(osc, partial);
    });
    toneNodes.push(master);
    currentOsc = oscs[0];
    currentGain = master;
    const releaseAt = start + TUNING.toneAttackSec + TUNING.toneHoldSec + TUNING.toneReleaseSec;
    master.gain.setValueAtTime(0, start);
    master.gain.linearRampToValueAtTime(1, start + TUNING.toneAttackSec);
    master.gain.setValueAtTime(1, start + TUNING.toneAttackSec + TUNING.toneHoldSec);
    master.gain.linearRampToValueAtTime(0, releaseAt);
    master.connect(ctx.destination);
    oscs.forEach((osc) => {
      osc.start(start);
      osc.stop(releaseAt + 0.02);
    });
    await new Promise((resolve) => {
      oscs[0].onended = () => {
        try {
          master.gain.cancelScheduledValues(ctx.currentTime);
          master.gain.setValueAtTime(0, ctx.currentTime);
        } catch (err) { /* node already closed */ }
        toneNodes.splice(0).forEach((node) => {
          try { node.disconnect(); } catch (ignore) { /* already gone */ }
        });
        if (currentOsc === oscs[0]) currentOsc = null;
        if (currentGain === master) currentGain = null;
        resolve();
      };
    });
    if (token !== playGen || document.visibilityState === "hidden") {
      if (token === playGen) playbackActive = false;
      return;
    }
    if (!holdScreen && route.kind === "recipient") heardTone = true;
    if (!holdScreen) {
      setStatus(COPY.played);
      clearActions();
    }
    await delay(TUNING.postPlaySettleMs);
    if (token !== playGen || document.visibilityState === "hidden") {
      if (token === playGen) {
        playbackActive = false;
        if (!holdScreen && route.kind === "recipient") heardTone = false;
      }
      return;
    }
    playbackActive = false;
    if (!holdScreen) restoreAfterPlay("recipient");
  } catch (err) {
    if (token === playGen) {
      stopToneNodes();
      playbackActive = false;
      setStatus(COPY.toneFailed);
      if (!holdScreen) restoreAfterPlay("recipient");
    }
  }
}

async function playHz(hz) {
  await runTone(hz, { holdScreen: false });
}

function playCurrent() {
  playHz(lockedHz);
}

async function replayFromMatch() {
  if (playbackActive) return;
  releaseMic();
  await playHz(lockedHz);
}

async function copyLinkInline(url) {
  const existing = actionsEl.querySelector("input");
  if (existing) existing.remove();
  try {
    await navigator.clipboard.writeText(url);
    if (mode !== "locked") return;
    setStatus(COPY.copied);
  } catch (err) {
    if (mode !== "locked") return;
    setStatus(COPY.copyFail);
    addLinkField(url);
  }
}

async function sendNote() {
  if (lockedHz == null || mode !== "locked" || sharing) return;
  const url = shareUrl(lockedHz);
  sharing = true;
  try {
    if (!navigator.share) {
      await copyLinkInline(url);
      return;
    }
    try {
      await navigator.share({
        title: "Hold This Note",
        text: "A pitch, played as a tone.",
        url,
      });
      if (mode === "locked") setStatus(COPY.shareDone);
    } catch (err) {
      if (mode !== "locked") return;
      if (err && err.name === "AbortError") setStatus(COPY.shareCancel);
      else setStatus(COPY.shareError);
    }
  } finally {
    sharing = false;
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
  } else if (wasPlaying && mode === "playing") {
    if (route.kind === "recipient") renderRecipient();
    else renderSolo();
    setStatus(COPY.playbackStopped);
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
    const replace = mode === "playing";
    stopTone();
    if (replace) {
      if (route.kind === "recipient") renderRecipient();
      else renderSolo();
      setStatus(COPY.playbackStopped);
      focusFirstAction();
    }
  }
});

applyRoute();
