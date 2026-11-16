type VoiceHandle = { endSession: () => Promise<void> };
type VoiceOptions = Record<string, any>;

export function voiceErrorMessage(error: unknown): string {
  const raw = typeof error === "string" ? error : error instanceof Error ? `${error.name}: ${error.message}` : "The live voice link closed unexpectedly.";
  const safe = raw.replace(/(?:https?|wss?):\/\/\S+/gi, "[connection URL]").replace(/(?:sk_|Bearer\s+)[A-Za-z0-9._-]+/gi, "[redacted]").replace(/[A-Za-z0-9_-]{40,}/g, "[redacted]").replace(/[\r\n<>]/g, " ").slice(0, 350);
  if (/NotAllowed|permission.*denied|PermissionDenied/i.test(safe)) return "Microphone or audio permission was blocked. Allow the microphone and autoplay sound for this site in your browser, then activate voice again.";
  if (/NotFound|DevicesNotFound/i.test(safe)) return "No microphone was found. Connect or select a microphone, then activate voice again.";
  if (/NotReadable|TrackStart|in use/i.test(safe)) return "The browser could not open your microphone. Close any app using it and try again.";
  if (/credit|quota|payment|subscription|concurrency/i.test(safe)) return `ElevenLabs could not run the live call: ${safe}`;
  return safe || "The live voice link closed unexpectedly.";
}

export function isDurationEnd(details:any):boolean {
  const text=[details?.message,details?.closeReason,details?.context?.type].filter(x=>typeof x==='string').join(' ');
  if(/quota|credit|payment|subscription|permission|unauthori[sz]ed|invalid.*key/i.test(text))return false;
  return /max(?:imum)?[_ -]?(?:conversation[_ -]?)?duration|duration[_ -]exceeded|conversation has exceeded maximum duration/i.test(text);
}

export function shouldRenewVoice(details:any,desired:boolean,startedAt:number,now=Date.now()):boolean {
  return desired&&startedAt>0&&now-startedAt>=60000&&isDurationEnd(details);
}

export function voiceDisconnectMessage(details: any): string {
  const parts = [details?.message, details?.closeReason,
    typeof details?.context?.type === "string" ? details.context.type : "",
    typeof details?.closeCode === "number" ? `Close code ${details.closeCode}` : ""]
    .filter((value): value is string => typeof value === "string" && !!value);
  return voiceErrorMessage(parts.length ? [...new Set(parts)].join(". ") : "The voice link closed. Open Configuration and choose Check last voice call for the provider's reason.");
}

/** Prevent a failed, cancelled, or timed-out SDK startup from becoming a live UI session. */
export async function openVoiceSession<T extends VoiceHandle>(
  start: (options: VoiceOptions) => Promise<T>, options: VoiceOptions,
  controls: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<T> {
  let handle: T | undefined;
  let finished = false;
  let failure: Error | undefined;
  let rejectStartup: (reason: Error) => void = () => {};
  const failed = new Promise<never>((_, reject) => { rejectStartup = reject; });
  function fail(error: Error) { if (!finished && !failure) { failure = error; rejectStartup(error); } }
  const abort = () => fail(new DOMException("Voice startup cancelled.", "AbortError"));
  controls.signal?.addEventListener("abort", abort, { once: true });
  if (controls.signal?.aborted) abort();
  const timer = setTimeout(() => fail(new Error("Voice startup timed out. Check microphone permission and try the other voice connection in Configuration.")), controls.timeoutMs ?? 30000);
  const pending = Promise.resolve().then(() => {
    if (failure) throw failure;
    return start({ ...options,
      onError: (message: string, context?: unknown) => { fail(new Error(voiceErrorMessage(message))); options.onError?.(message, context); },
      onDisconnect: (details: any) => { fail(new Error(voiceDisconnectMessage(details))); options.onDisconnect?.(details); },
    });
  }).then(async value => {
    handle = value;
    if (failure || controls.signal?.aborted) { handle = undefined; await value.endSession().catch(() => {}); throw failure || new DOMException("Voice startup cancelled.", "AbortError"); }
    return value;
  });
  try { const value = await Promise.race([pending, failed]); finished = true; return value; }
  catch (error) { if (handle) await handle.endSession().catch(() => {}); throw error; }
  finally { clearTimeout(timer); controls.signal?.removeEventListener("abort", abort); }
}

export async function resumeSpeakerAudio(root: Pick<Document, "querySelectorAll">, volume: number) {
  const elements = Array.from(root.querySelectorAll("audio"));
  if (!elements.length) return false;
  await Promise.all(elements.map(async element => { element.muted = false; element.volume = volume; await element.play(); }));
  return true;
}

export async function ensureMicrophone(getMedia: () => Promise<MediaStream>, signal: AbortSignal, timeoutMs = 20000) {
  let rejectWait: (reason: Error) => void = () => {};
  const failure = new Promise<never>((_, reject) => { rejectWait = reject; });
  const abort = () => rejectWait(new DOMException("Microphone check cancelled.", "AbortError"));
  const timer = setTimeout(() => rejectWait(new Error("Microphone permission is still pending. Respond to your browser's microphone prompt, then try again.")), timeoutMs);
  signal.addEventListener("abort", abort, { once: true });
  const media = Promise.resolve().then(getMedia).then(stream => { stream.getTracks().forEach(track => track.stop()); });
  try { if (signal.aborted) abort(); await Promise.race([media, failure]); }
  finally { clearTimeout(timer); signal.removeEventListener("abort", abort); }
}
