// lizarding.com's page: what config.js names, drawn in; who is live; the newsletter's form.

import { CONFIG } from "./config.js?v=9ac6e26a5128";
import { platform } from "./platform.js?v=9ac6e26a5128";
import { el, followLive } from "./live.js?v=9ac6e26a5128";
import { newsletter, WORDS } from "./newsletter.js?v=9ac6e26a5128";

// ?standin plays against the stand-in platform (tests/standin.js), for a person to try; ?probe walks the page
const asked = new URLSearchParams(location.search);
if (asked.has("probe") || asked.has("standin")) await (await import("./tests/standin.js?v=9ac6e26a5128")).standIn();

function storeButton(store) {
  const face = [el("span", { class: "Call" }, store.call), el("span", { class: "Sub" }, store.href ? store.name : "Store page coming soon")];
  return store.href
    ? el("a", { class: `Button Store Store-${store.key}`, href: store.href, target: "_blank", rel: "noopener" }, face)
    : el("span", { class: `Button Store Store-${store.key} Soon`, "aria-disabled": "true" }, face);
}

function loopCard(loop) {
  const shown = loop.video
    ? el("video", { src: loop.video, poster: loop.art, autoplay: true, muted: true, loop: true, playsinline: true, preload: "none", "aria-label": loop.heading })
    : el("img", { src: loop.art, alt: loop.heading, loading: "lazy", width: 960, height: 540 });
  if (shown.tagName === "VIDEO") shown.muted = true; // the attribute alone doesn't mute it in every browser
  return el("figure", { class: "Loop", "data-loop": loop.key }, el("div", { class: "LoopFrame" }, shown), el("figcaption", {}, el("h3", {}, loop.heading), el("p", {}, loop.said)));
}

export function draw(doc = document) {
  doc.getElementById("stores").replaceChildren(...CONFIG.stores.map(storeButton));
  doc.getElementById("play").href = CONFIG.play;
  doc.getElementById("loop-grid").replaceChildren(...CONFIG.loops.map(loopCard));
  doc.getElementById("socials").replaceChildren(...CONFIG.socials.map((s) =>
    el("a", { class: "Social", href: s.href, target: "_blank", rel: "noopener", "aria-label": `Lizarding on ${s.name}` }, el("img", { src: s.icon, alt: "" }), el("span", {}, s.name))));
  const discord = doc.getElementById("discord");
  if (CONFIG.discord) {
    discord.href = CONFIG.discord;
    discord.target = "_blank";
    discord.rel = "noopener";
    discord.querySelector(".Call").textContent = "Join the Discord";
    doc.getElementById("discord-sub").textContent = "Testers, bettors, stables: come and talk";
  } else {
    discord.removeAttribute("href");
    discord.classList.add("Soon");
    discord.setAttribute("aria-disabled", "true");
    doc.getElementById("discord-sub").textContent = "Opening soon";
  }
  doc.getElementById("contact").href = `mailto:${CONFIG.contact}`;
  drawNewsletter(doc);
}

function drawNewsletter(doc) {
  const form = doc.getElementById("newsletter");
  const said = doc.getElementById("newsletter-said");
  doc.getElementById("newsletter-words").textContent = WORDS;
  const api = newsletter(CONFIG.platform);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = form.elements.email.value.trim();
    const button = form.querySelector("button");
    button.disabled = true;
    said.classList.remove("Warn");
    said.textContent = "Sending…";
    try {
      const answer = await api.answer({ source: "landing", yes: true, email });
      if (!answer.configured) said.textContent = "The newsletter opens soon. Thanks for wanting it: try again in a few days.";
      // the same answer whether the address is new, waiting or listed already, so no one learns who is on the list
      else { said.textContent = "Check your email for the link to confirm."; form.reset(); }
    } catch (error) {
      said.classList.add("Warn");
      said.textContent = error.status === 429 ? "That's a lot of tries at once: wait a few minutes." : `That didn't work: ${error.message}`;
    }
    button.disabled = false;
  });
}

draw();
followLive(document.getElementById("live-grid"), platform(CONFIG.platform), {
  limit: 6,
  empty: () => el("p", { class: "Quiet" }, "No one is live with Lizarding right now. ", el("a", { href: "streamers/" }, "Streamers, get listed here.")),
});

if (asked.has("probe")) {
  const { Probe } = await import("./probe.js?v=9ac6e26a5128");
  new Probe(document).run();
}
