type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;
type ApiResult = { configuredKeyAvailable?: boolean; credits?: {available:boolean;used?:number;limit?:number;remaining?:number;tier?:string;resetAt?:number;overageEnabled?:boolean;note?:string}; error?: string; code?: string; connected: boolean; agentId: string; voice: string; signedUrl: string; conversationToken?: string; diagnostic?: string; sessionToken?: string };
const TOKEN_KEY = "ultron-session-token";
export class UltronApiError extends Error {
  constructor(message: string, public status: number, public code?: string) { super(message); }
}
export function createUltronClient(
  fetcher: typeof fetch = (...args) => fetch(...args),
  getStorage: () => StorageLike | undefined = () => typeof window === "undefined" ? undefined : window.sessionStorage,
) {
  let token = "";
  let loaded = false;
  function save(value: string) {
    token = value; loaded = true;
    try { const storage = getStorage(); if (value) storage?.setItem(TOKEN_KEY, value); else storage?.removeItem(TOKEN_KEY); } catch { /* In-memory sessions also work when browser storage is blocked. */ }
  }
  return async function api(path: string, body: Record<string, unknown> = {}): Promise<ApiResult> {
    if (!loaded) { loaded = true; try { token = getStorage()?.getItem(TOKEN_KEY) || ""; } catch {} }
    const response = await fetcher(`/api/ultron/${path}`, {
      method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, ...(token ? { sessionToken: token } : {}) }),
    });
    const data = await response.json() as ApiResult;
    if (!response.ok) {
      if (response.status === 401 && (data.code === "session_required" || path === "status")) save("");
      throw new UltronApiError(data.error || "The connection failed.", response.status, data.code);
    }
    if (path === "connect" || path === "session") {
      if (!data.connected || typeof data.sessionToken !== "string" || data.sessionToken.length < 20) throw new UltronApiError("The server did not return a usable voice connection. Please reconnect.", 502);
      save(data.sessionToken);
    }
    if (path === "disconnect" || (path === "status" && !data.connected)) save("");
    delete data.sessionToken;
    return data;
  };
}
