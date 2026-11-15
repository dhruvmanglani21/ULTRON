// src/lib/voice-session.ts
function voiceErrorMessage(error) {
  const raw = typeof error === "string" ? error : error instanceof Error ? `${error.name}: ${error.message}` : "The live voice link closed unexpectedly.";
  const safe = raw.replace(/(?:https?|wss?):\/\/\S+/gi, "[connection URL]").replace(/(?:sk_|Bearer\s+)[A-Za-z0-9._-]+/gi, "[redacted]").replace(/[A-Za-z0-9_-]{40,}/g, "[redacted]").replace(/[\r\n<>]/g, " ").slice(0, 350);
  if (/NotAllowed|permission.*denied|PermissionDenied/i.test(safe)) return "Microphone or audio permission was blocked. Allow the microphone and autoplay sound for this site in your browser, then activate voice again.";
  if (/NotFound|DevicesNotFound/i.test(safe)) return "No microphone was found. Connect or select a microphone, then activate voice again.";
  if (/NotReadable|TrackStart|in use/i.test(safe)) return "The browser could not open your microphone. Close any app using it and try again.";
  if (/credit|quota|payment|subscription|concurrency/i.test(safe)) return `ElevenLabs could not run the live call: ${safe}`;
  return safe || "The live voice link closed unexpectedly.";
}
function voiceDisconnectMessage(details) {
  const parts = [
    details?.message,
    details?.closeReason,
    typeof details?.context?.type === "string" ? details.context.type : "",
    typeof details?.closeCode === "number" ? `Close code ${details.closeCode}` : ""
  ].filter((value) => typeof value === "string" && !!value);
  return voiceErrorMessage(parts.length ? [...new Set(parts)].join(". ") : "The voice link closed. Open Configuration and choose Check last voice call for the provider's reason.");
}
async function openVoiceSession(start, options, controls = {}) {
  let handle;
  let finished = false;
  let failure;
  let rejectStartup = () => {
  };
  const failed = new Promise((_, reject) => {
    rejectStartup = reject;
  });
  function fail(error) {
    if (!finished && !failure) {
      failure = error;
      rejectStartup(error);
    }
  }
  const abort = () => fail(new DOMException("Voice startup cancelled.", "AbortError"));
  controls.signal?.addEventListener("abort", abort, { once: true });
  if (controls.signal?.aborted) abort();
  const timer = setTimeout(() => fail(new Error("Voice startup timed out. Check microphone permission and try the other voice connection in Configuration.")), controls.timeoutMs ?? 3e4);
  const pending = Promise.resolve().then(() => {
    if (failure) throw failure;
    return start({
      ...options,
      onError: (message, context) => {
        fail(new Error(voiceErrorMessage(message)));
        options.onError?.(message, context);
      },
      onDisconnect: (details) => {
        fail(new Error(voiceDisconnectMessage(details)));
        options.onDisconnect?.(details);
      }
    });
  }).then(async (value) => {
    handle = value;
    if (failure || controls.signal?.aborted) {
      handle = void 0;
      await value.endSession().catch(() => {
      });
      throw failure || new DOMException("Voice startup cancelled.", "AbortError");
    }
    return value;
  });
  try {
    const value = await Promise.race([pending, failed]);
    finished = true;
    return value;
  } catch (error) {
    if (handle) await handle.endSession().catch(() => {
    });
    throw error;
  } finally {
    clearTimeout(timer);
    controls.signal?.removeEventListener("abort", abort);
  }
}
async function resumeSpeakerAudio(root, volume) {
  const elements = Array.from(root.querySelectorAll("audio"));
  if (!elements.length) return false;
  await Promise.all(elements.map(async (element) => {
    element.muted = false;
    element.volume = volume;
    await element.play();
  }));
  return true;
}
async function ensureMicrophone(getMedia, signal, timeoutMs = 2e4) {
  let rejectWait = () => {
  };
  const failure = new Promise((_, reject) => {
    rejectWait = reject;
  });
  const abort = () => rejectWait(new DOMException("Microphone check cancelled.", "AbortError"));
  const timer = setTimeout(() => rejectWait(new Error("Microphone permission is still pending. Respond to your browser's microphone prompt, then try again.")), timeoutMs);
  signal.addEventListener("abort", abort, { once: true });
  const media = Promise.resolve().then(getMedia).then((stream) => {
    stream.getTracks().forEach((track) => track.stop());
  });
  try {
    if (signal.aborted) abort();
    await Promise.race([media, failure]);
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", abort);
  }
}
export {
  ensureMicrophone,
  openVoiceSession,
  resumeSpeakerAudio,
  voiceDisconnectMessage,
  voiceErrorMessage
};
