// What the pages ask of the platform, and the streamer's sign-in. Plain
// functions over fetch and storage, each passed in, so Node tests them
// (tests/test_platform.mjs) and the probe runs them against the stand-in.

export const YOUTUBE_SCOPE = "https://www.googleapis.com/auth/youtube.readonly";
const KEPT = "lizarding_streamer"; // the refresh token, in this browser
const ASKED = "lizarding_streamer_asked"; // a sign-in under way: its state, provider and choices

// storage that may be missing or refuse (a private window): reads give null, writes do nothing
export function safely(storage) {
  return {
    get(key) { try { return storage?.getItem(key) ?? null; } catch { return null; } },
    set(key, value) { try { storage?.setItem(key, value); } catch { /* not kept */ } },
    drop(key) { try { storage?.removeItem(key); } catch { /* nothing kept */ } },
  };
}

export class PlatformError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

async function said(response) {
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new PlatformError(body?.msg || body?.message || body?.error_description || `the server answered ${response.status}`, response.status);
  return body;
}

export function platform(config, fetchIt = globalThis.fetch.bind(globalThis)) {
  const headers = (token) => ({ apikey: config.key, Authorization: `Bearer ${token ?? config.key}`, "Content-Type": "application/json" });
  return {
    rpc: async (name, args = {}, token = null) =>
      said(await fetchIt(`${config.rest}/rpc/${name}`, { method: "POST", headers: headers(token), body: JSON.stringify(args) })),
    renew: async (refresh) =>
      said(await fetchIt(`${config.auth}/token?grant_type=refresh_token`, { method: "POST", headers: headers(null), body: JSON.stringify({ refresh_token: refresh }) })),
    signIn: async (provider, token, emails, signedIn = null) =>
      said(await fetchIt(`${config.functions}/streamers/sign-in`, { method: "POST", headers: headers(signedIn), body: JSON.stringify({ provider, token, emails }) })),
  };
}

// The provider's sign-in page, the streamer coming back to `back` with a token in the fragment
export function signInAddress(provider, clientId, back, state) {
  if (provider === "twitch") {
    const q = new URLSearchParams({ client_id: clientId, redirect_uri: back, response_type: "token", scope: "user:read:email", state, force_verify: "true" });
    return `https://id.twitch.tv/oauth2/authorize?${q}`;
  }
  const q = new URLSearchParams({ client_id: clientId, redirect_uri: back, response_type: "token", scope: `openid email ${YOUTUBE_SCOPE}`, state, prompt: "select_account", include_granted_scopes: "true" });
  return `https://accounts.google.com/o/oauth2/v2/auth?${q}`;
}

export function newState(random = globalThis.crypto) {
  const bytes = new Uint8Array(16);
  random.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// The sign-in asked for, kept for the way back
export function rememberAsked(session, asked) { safely(session).set(ASKED, JSON.stringify(asked)); }

// The way back from the provider: its token, or why there is none; null if this isn't one
export function takeReturn(hash, session) {
  const said = new URLSearchParams((hash ?? "").replace(/^#/, ""));
  if (!said.has("access_token") && !said.has("error")) return null;
  const store = safely(session);
  let asked = null;
  try { asked = JSON.parse(store.get(ASKED) ?? "null"); } catch { asked = null; }
  store.drop(ASKED);
  if (!asked || said.get("state") !== asked.state) return { refused: "That sign-in didn't start on this page. Try again." };
  if (said.has("error")) {
    return { refused: said.get("error") === "access_denied" ? "The sign-in was cancelled." : `The sign-in didn't finish (${said.get("error")}).` };
  }
  return { provider: asked.provider, token: said.get("access_token"), emails: asked.emails === true, adding: asked.adding === true };
}

// The streamer's kept sign-in, in this browser
export const keptRefresh = (local) => safely(local).get(KEPT);
export const keepRefresh = (local, token) => safely(local).set(KEPT, token);
export const forgetRefresh = (local) => safely(local).drop(KEPT);

// How long ago, or how far ahead, in words
export function when(at, now = Date.now()) {
  const t = Date.parse(at);
  if (Number.isNaN(t)) return "";
  const minutes = Math.round((t - now) / 60000);
  const ahead = minutes >= 0;
  const m = Math.abs(minutes);
  const words = m < 1 ? "now" : m < 60 ? `${m} min` : m < 60 * 36 ? `${Math.round(m / 60)} h` : `${Math.round(m / 1440)} days`;
  if (words === "now") return "now";
  return ahead ? `in ${words}` : `${words} ago`;
}

export const viewers = (n) => (typeof n === "number" ? `${n.toLocaleString("en")} watching` : "");

// a date as a datetime-local input shows it, in the browser's own time zone
export function localInput(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
