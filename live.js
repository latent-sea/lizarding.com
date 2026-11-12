// Live now and Coming up: the streams the platform lists (sites/lizarding/backend.sql,
// lizarding_live and lizarding_coming_up), drawn as cards, one tap to watch.

import { when, viewers } from "./platform.js?v=9ac6e26a5128";

export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) continue;
    if (key === "class") node.className = value;
    else if (key.startsWith("on")) node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value === true ? "" : String(value));
  }
  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

// only https addresses are linked or shown: what comes from a provider is never trusted as markup or script
export const safeUrl = (url) => (typeof url === "string" && /^https:\/\//.test(url) ? url : null);

const PLATFORM = { twitch: { name: "Twitch", icon: "twitch.svg" }, youtube: { name: "YouTube", icon: "youtube.svg" } };

export function liveCard(stream, base = "") {
  const p = PLATFORM[stream.platform] ?? { name: stream.platform, icon: null };
  const picture = safeUrl(stream.thumbnail);
  return el("a", { class: `LiveCard${stream.said ? " Said" : ""}`, href: safeUrl(stream.url) ?? "#", target: "_blank", rel: "noopener" },
    el("div", { class: "Thumb" },
      picture ? el("img", { src: picture, alt: "", loading: "lazy" }) : null,
      el("span", { class: "LiveBadge" }, "LIVE")),
    el("div", { class: "LiveWords" },
      el("div", { class: "LiveName" }, p.icon ? el("img", { class: "PlatformIcon", src: `${base}art/icons/${p.icon}`, alt: p.name }) : null, stream.name),
      el("div", { class: "LiveTitle" }, stream.title || (stream.said ? "Live with Lizarding" : "")),
      el("div", { class: "LiveMeta" }, stream.said ? "said by the streamer" : [viewers(stream.viewers), stream.started_at ? ` · started ${when(stream.started_at)}` : ""].join(""))));
}

export function comingRow(item, base = "") {
  const p = PLATFORM[item.platform] ?? { name: item.platform, icon: null };
  const at = new Date(item.at);
  return el("a", { class: "ComingRow", href: safeUrl(item.url) ?? "#", target: "_blank", rel: "noopener" },
    p.icon ? el("img", { class: "PlatformIcon", src: `${base}art/icons/${p.icon}`, alt: p.name }) : null,
    el("span", { class: "ComingName" }, item.name),
    el("span", { class: "ComingWhen" }, `${at.toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} (${when(item.at)})`));
}

// Fill a place with who is live, again every minute; `limit` cards at most
export function followLive(place, api, { limit = 0, base = "", empty } = {}) {
  async function draw() {
    let streams;
    try { streams = await api.rpc("lizarding_live"); } catch { return; } // kept as it was until the platform answers
    const shown = limit ? streams.slice(0, limit) : streams;
    place.replaceChildren(...(shown.length ? shown.map((s) => liveCard(s, base)) : [empty()]));
    place.dataset.count = String(streams.length);
  }
  draw();
  return setInterval(draw, 60_000);
}

export async function drawComing(place, api, base = "") {
  let items;
  try { items = await api.rpc("lizarding_coming_up"); } catch { return; }
  place.replaceChildren(...(items.length ? items.map((i) => comingRow(i, base)) : [el("p", { class: "Quiet" }, "No streams are scheduled yet.")]));
  place.dataset.count = String(items.length);
}
