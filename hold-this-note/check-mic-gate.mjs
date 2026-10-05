import { spawn } from "node:child_process";
import { once } from "node:events";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { rmSync } from "node:fs";

const PORT = 8791;
const DEBUG_PORT = 9333;
const PROFILE = "/tmp/hold-this-note-chrome";
const ROOT = fileURLToPath(new URL("..", import.meta.url));
rmSync(PROFILE, { recursive: true, force: true });

const hook = `(() => {
  window.__gumCalls = 0;
  const devices = navigator.mediaDevices;
  if (!devices || !devices.getUserMedia) {
    window.__gumMissing = true;
    return;
  }
  devices.getUserMedia = function () {
    window.__gumCalls += 1;
    const err = new DOMException("denied", "NotAllowedError");
    return Promise.reject(err);
  };
})();`;

function startServer() {
  const child = spawn("python3", ["-m", "http.server", String(PORT), "--bind", "127.0.0.1"], {
    cwd: ROOT,
    stdio: ["ignore", "ignore", "pipe"],
  });
  return child;
}

function startChrome() {
  const child = spawn("google-chrome", [
    "--headless=new",
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--remote-debugging-port=" + DEBUG_PORT,
    "--remote-debugging-address=127.0.0.1",
    "--user-data-dir=" + PROFILE,
    "about:blank",
  ], { stdio: ["ignore", "pipe", "pipe"] });
  return child;
}

async function waitFor(fn, label) {
  const start = Date.now();
  let last;
  while (Date.now() - start < 15000) {
    try {
      return await fn();
    } catch (err) {
      last = err;
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }
  throw new Error(label + ": " + (last && last.message));
}

function cdp(ws) {
  let id = 0;
  const pending = new Map();
  const listeners = [];
  ws.addEventListener("message", (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message || JSON.stringify(msg.error)));
      else resolve(msg.result);
      return;
    }
    for (const listener of listeners) listener(msg);
  });
  return {
    send(method, params = {}, sessionId) {
      const msgId = ++id;
      return new Promise((resolve, reject) => {
        pending.set(msgId, { resolve, reject });
        const payload = { id: msgId, method, params };
        if (sessionId) payload.sessionId = sessionId;
        ws.send(JSON.stringify(payload));
      });
    },
    on(listener) { listeners.push(listener); },
  };
}

async function evaluate(client, sessionId, expression) {
  const result = await client.send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  }, sessionId);
  if (result.exceptionDetails) {
    throw new Error(JSON.stringify(result.exceptionDetails));
  }
  return result.result.value;
}

async function openPage(client, url) {
  const { targetId } = await client.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await client.send("Target.attachToTarget", { targetId, flatten: true });
  await client.send("Page.enable", {}, sessionId);
  await client.send("Runtime.enable", {}, sessionId);
  await client.send("Network.enable", {}, sessionId);
  await client.send("Page.addScriptToEvaluateOnNewDocument", { source: hook }, sessionId);
  const requests = [];
  const loaded = new Promise((resolve) => {
    client.on((msg) => {
      if (msg.sessionId !== sessionId) return;
      if (msg.method === "Network.requestWillBeSent") requests.push(msg.params.request.url);
      if (msg.method === "Page.loadEventFired") resolve();
    });
  });
  await client.send("Page.navigate", { url }, sessionId);
  await loaded;
  await new Promise((resolve) => setTimeout(resolve, 200));
  return { sessionId, requests };
}

async function clickButton(client, sessionId, label) {
  const point = await evaluate(client, sessionId, `(() => {
    const button = [...document.querySelectorAll("button")].find((node) => node.textContent === ${JSON.stringify(label)});
    if (!button) return null;
    const rect = button.getBoundingClientRect();
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2, disabled: button.disabled };
  })()`);
  if (!point) throw new Error("missing button " + label);
  if (point.disabled) throw new Error("disabled button " + label);
  await client.send("Input.dispatchMouseEvent", {
    type: "mousePressed", x: point.x, y: point.y, button: "left", clickCount: 1,
  }, sessionId);
  await client.send("Input.dispatchMouseEvent", {
    type: "mouseReleased", x: point.x, y: point.y, button: "left", clickCount: 1,
  }, sessionId);
}

const server = startServer();
const chrome = startChrome();
let failed = false;
try {
  await waitFor(async () => {
    const response = await fetch("http://127.0.0.1:" + PORT + "/hold-this-note/");
    if (!response.ok) throw new Error(String(response.status));
    return true;
  }, "http server");
  const version = await waitFor(async () => fetch("http://127.0.0.1:" + DEBUG_PORT + "/json/version").then((res) => res.json()), "chrome");
  const ws = new WebSocket(version.webSocketDebuggerUrl);
  await once(ws, "open");
  const client = cdp(ws);

  const plain = await openPage(client, "http://127.0.0.1:" + PORT + "/hold-this-note/");
  const before = await evaluate(client, plain.sessionId, "window.__gumCalls");
  const missing = await evaluate(client, plain.sessionId, "window.__gumMissing === true");
  const textBefore = await evaluate(client, plain.sessionId, "document.body.innerText");
  if (missing) throw new Error("headless Chrome has no mediaDevices; mic gate could not be observed");
  if (before !== 0) throw new Error("getUserMedia ran before a control was activated: " + before);
  if (!textBefore.includes("Hold a note")) throw new Error("start control missing");
  if (!textBefore.includes("We don't keep your voice")) throw new Error("mic privacy line missing before the tap");
  if (textBefore.includes("I'm ready")) throw new Error("start screen still asks for a second confirmation");
  await clickButton(client, plain.sessionId, "Hold a note");
  await new Promise((resolve) => setTimeout(resolve, 400));
  const after = await evaluate(client, plain.sessionId, "window.__gumCalls");
  const denied = await evaluate(client, plain.sessionId, "document.getElementById('status').textContent");
  const afterText = await evaluate(client, plain.sessionId, "document.body.innerText");
  if (after !== 1) throw new Error("expected one getUserMedia call after the tap, got " + after);
  if (!denied.includes("Mic is blocked")) throw new Error("unexpected status after denial: " + denied);
  if (afterText.includes("I'm ready")) throw new Error("denial still asks for a second confirmation");
  await clickButton(client, plain.sessionId, "Try again");
  await new Promise((resolve) => setTimeout(resolve, 400));
  const retried = await evaluate(client, plain.sessionId, "window.__gumCalls");
  if (retried !== 2) throw new Error("Try again did not start listening, getUserMedia calls: " + retried);

  const linked = await openPage(client, "http://127.0.0.1:" + PORT + "/hold-this-note/#1.4400");
  const linkedCalls = await evaluate(client, linked.sessionId, "window.__gumCalls");
  const linkedText = await evaluate(client, linked.sessionId, "document.body.innerText");
  const matchDisabled = await evaluate(client, linked.sessionId, `(() => {
    const button = [...document.querySelectorAll("button")].find((node) => node.textContent === "Hum along");
    return button ? button.disabled : null;
  })()`);
  if (linkedCalls !== 0) throw new Error("recipient page requested the mic on load");
  if (!linkedText.includes("Play it")) throw new Error("recipient play control missing");
  if (!linkedText.includes("not their voice")) throw new Error("recipient copy missing");
  if (matchDisabled !== true) throw new Error("matching was available before playback");
  await clickButton(client, linked.sessionId, "Play it");
  await new Promise((resolve) => setTimeout(resolve, 300));
  const during = await evaluate(client, linked.sessionId, "window.__gumCalls");
  const duringMatch = await evaluate(client, linked.sessionId, `(() => {
    const button = [...document.querySelectorAll("button")].find((node) => node.textContent === "Hum along");
    return button ? button.disabled : "missing";
  })()`);
  if (during !== 0) throw new Error("playing the tone requested the mic");
  if (duringMatch === false) throw new Error("matching became available while the tone was still starting");
  const enabled = await waitFor(async () => {
    const state = await evaluate(client, linked.sessionId, `(() => {
      const button = [...document.querySelectorAll("button")].find((node) => node.textContent === "Hum along");
      return { disabled: button ? button.disabled : null, calls: window.__gumCalls, status: document.getElementById("status").textContent };
    })()`);
    if (!state || state.disabled !== false) throw new Error("still waiting " + JSON.stringify(state));
    return state;
  }, "match enabled after playback");
  if (enabled.calls !== 0) throw new Error("mic requested while enabling match");

  const hostile = "http://127.0.0.1:" + PORT + "/hold-this-note/#%3Cimg%20src=x%20onerror=window.__xss=1%3E";
  const bad = await openPage(client, hostile);
  const xss = await evaluate(client, bad.sessionId, "window.__xss === 1");
  const imgs = await evaluate(client, bad.sessionId, "document.querySelectorAll('img').length");
  const badText = await evaluate(client, bad.sessionId, "document.body.innerText");
  const badCalls = await evaluate(client, bad.sessionId, "window.__gumCalls");
  if (xss) throw new Error("hostile fragment executed");
  if (imgs !== 1) throw new Error("unexpected image count " + imgs);
  if (!badText.includes("doesn't hold a note")) throw new Error("bad link copy missing: " + badText);
  if (badText.includes("onerror") || badText.includes("<img")) throw new Error("fragment was rendered");
  if (badCalls !== 0) throw new Error("bad link requested the mic");

  const audioPosts = [...plain.requests, ...linked.requests, ...bad.requests].filter((url) => {
    return !url.startsWith("http://127.0.0.1:" + PORT + "/") || url.includes("upload");
  });
  if (audioPosts.length) throw new Error("unexpected requests " + audioPosts.join(", "));

  console.log(JSON.stringify({
    noHashGetUserMediaBeforeTap: before,
    noHashGetUserMediaAfterTap: after,
    fragmentGetUserMediaOnLoad: linkedCalls,
    matchDisabledBeforePlayback: matchDisabled,
    matchEnabledAfterPlayback: enabled.disabled === false,
    micCallsAfterPlayback: enabled.calls,
    hostileFragmentExecuted: xss,
  }, null, 2));
  ws.close();
} catch (err) {
  failed = true;
  console.error(err);
} finally {
  chrome.kill("SIGTERM");
  server.kill("SIGTERM");
}
process.exit(failed ? 1 : 0);
