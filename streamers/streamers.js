// The streamer section (README, "The streamer section"): who is live and who
// will be, for everyone; for a streamer, signing in with Twitch or YouTube,
// their next stream, "I'm live", their emails, and leaving.
//
// Signing in goes to the provider's own page and back here with a token in
// the address's fragment; the platform's `streamers` function checks it with
// the provider and answers a session (platform/functions/streamers). Only the
// refresh token is kept, in this browser.

import { CONFIG } from "../config.js?v=bbe266fda68c";
import { platform, signInAddress, newState, rememberAsked, takeReturn, keptRefresh, keepRefresh, forgetRefresh, when, localInput } from "../platform.js?v=bbe266fda68c";
import { el, followLive, drawComing, safeUrl } from "../live.js?v=bbe266fda68c";
import { newsletter, question, addressForm, stateWords } from "../newsletter.js?v=bbe266fda68c";

const asked = new URLSearchParams(location.search);
const probing = asked.has("probe");
if (probing || asked.has("standin")) await (await import("../tests/standin.js?v=bbe266fda68c")).standIn();

const NAMES = { twitch: "Twitch", youtube: "YouTube" };

export class Streamers {
  constructor(doc, { local = globalThis.localStorage, session = globalThis.sessionStorage, go = (url) => location.assign(url), back = `${CONFIG.site}/streamers/`,
    clients = { twitch: CONFIG.twitchClientId, youtube: CONFIG.googleClientId } } = {}) {
    this.doc = doc;
    this.clients = clients;
    this.following = null;
    this.local = local;
    this.session = session;
    this.go = go;
    this.back = back;
    this.api = platform(CONFIG.platform);
    this.news = newsletter(CONFIG.platform);
    this.access = null;
    this.me = null;
  }

  $(id) { return this.doc.getElementById(id); }

  say(words, good = false) {
    const banner = this.$("said");
    banner.hidden = !words;
    banner.textContent = words ?? "";
    banner.classList.toggle("Good", good);
  }

  async start() {
    this.wire();
    this.drawLists();
    const unsubscribe = asked.get("unsubscribe");
    if (unsubscribe) await this.unsubscribe(unsubscribe);
    await this.renew();
    await this.takeBack();
  }

  drawLists() {
    clearInterval(this.following);
    this.following = followLive(this.$("live-grid"), this.api, { base: "../", empty: () => el("p", { class: "Quiet" }, "No one is live with Lizarding right now.") });
    drawComing(this.$("coming"), this.api, "../");
  }

  // back from the provider's sign-in page, if this is the way back
  async takeBack() {
    const back = takeReturn(location.hash, this.session);
    if (back) {
      history.replaceState(history.state, "", location.pathname + location.search);
      if (back.refused) this.say(back.refused);
      else await this.finishSignIn(back);
    }
    await this.drawMine();
  }

  // the kept sign-in renewed, if there is one
  async renew() {
    const refresh = keptRefresh(this.local);
    if (!refresh) return;
    try {
      const session = await this.api.renew(refresh);
      this.access = session.access_token;
      keepRefresh(this.local, session.refresh_token);
    } catch (error) {
      if (error.status === 400 || error.status === 401) forgetRefresh(this.local);
      this.access = null;
    }
  }

  async signIn(provider, adding = false) {
    const clientId = this.clients[provider];
    if (!clientId) { this.say(`Signing in with ${NAMES[provider]} opens soon.`); return; }
    const state = newState();
    rememberAsked(this.session, { state, provider, adding, emails: adding ? undefined : this.$("emails").checked });
    this.go(signInAddress(provider, clientId, this.back, state));
  }

  async finishSignIn({ provider, token, emails, adding }) {
    try {
      const answer = await this.api.signIn(provider, token, emails, adding ? this.access : null);
      if (answer.session) {
        this.access = answer.session.access_token;
        keepRefresh(this.local, answer.session.refresh_token);
      }
      this.say(answer.fresh ? `Welcome, ${answer.channel.name}: you're on the list. Stream with Lizarding in your title and you're listed by yourself.`
        : `Signed in as ${answer.channel.name}.`, true);
    } catch (error) {
      this.say(`Couldn't sign in: ${error.message}`);
    }
  }

  async unsubscribe(token) {
    try {
      const done = await this.api.rpc("lizarding_unsubscribe", { token });
      this.say(done ? "Done: you won't get any more streamer emails. You stay listed when you're live." : "That link is out of date; you may have left the list already.", done);
    } catch { this.say("That link didn't work. Try it again in a moment."); }
    history.replaceState(history.state, "", location.pathname);
  }

  async call(name, args = {}) {
    try { return await this.api.rpc(name, args, this.access); } catch (error) {
      if (error.status === 401) { await this.renew(); return await this.api.rpc(name, args, this.access); }
      throw error;
    }
  }

  async drawMine() {
    this.me = this.access ? await this.call("lizarding_me").catch(() => null) : null;
    this.$("join").hidden = Boolean(this.me);
    this.$("mine").hidden = !this.me;
    for (const provider of ["twitch", "youtube"]) {
      if (!this.clients[provider]) this.$(`${provider}-sub`).textContent = "Opens soon";
    }
    if (!this.me) { this.$("news-ask").hidden = true; return; }
    const me = this.me;
    this.$("channels").replaceChildren(...me.channels.map((c) =>
      el("a", { class: "Channel", href: safeUrl(c.url) ?? "#", target: "_blank", rel: "noopener" },
        safeUrl(c.avatar) ? el("img", { class: "Avatar", src: c.avatar, alt: "" }) : null,
        el("img", { class: "PlatformIcon", src: `../art/icons/${c.platform}.svg`, alt: NAMES[c.platform] }), c.name)));
    const have = new Set(me.channels.map((c) => c.platform));
    this.$("add").replaceChildren(...["twitch", "youtube"].filter((p) => !have.has(p)).map((p) =>
      el("button", { class: "Button Small", type: "button", onclick: () => this.signIn(p, true) }, `Add your ${NAMES[p]} channel`)));
    const said = me.said_live_until;
    this.$("live-said").textContent = me.live ? "You're live with Lizarding now: you're listed above."
      : said ? `You're listed as live until ${new Date(said).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}.`
      : "Put Lizarding in your stream's title and we find you by ourselves.";
    this.$("im-live").hidden = Boolean(said) || me.live;
    this.$("not-live").hidden = !said;
    this.$("next-said").textContent = me.next_stream_at ? `Set for ${new Date(me.next_stream_at).toLocaleString(undefined, { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })} (${when(me.next_stream_at)}), in your own time zone. It shows under Coming up.` : "Not set.";
    this.$("next").value = me.next_stream_at ? localInput(new Date(me.next_stream_at)) : "";
    this.$("mine-emails").checked = me.emails;
    await this.drawNews();
  }

  // Lizarding news (T-682): the question, asked once, right after signing in, when the platform says to ask; the
  // streamer page waits for the answer. Then a row on the page that shows the answer and changes it. All of it hidden
  // until the platform's newsletter is set up. It is apart from the streamer emails, which are this list's own consent.
  async drawNews() {
    let news;
    try { news = await this.news.me(this.access); } catch { news = { configured: false }; }
    this.newsState = news;
    const asking = news.configured && news.ask;
    this.$("news-ask").hidden = !asking;
    this.$("mine").hidden = asking;
    this.$("news-part").hidden = !news.configured || asking;
    if (!news.configured) return;
    if (asking) {
      this.$("news-ask-body").replaceChildren(question((yes) => this.newsAnswer(yes, "news-ask-body"), { idPrefix: "news-ask" }));
      return;
    }
    const row = [el("p", { id: "news-said" }, stateWords(news))];
    if (news.state === "yes" || news.state === "waiting") {
      row.push(el("button", { class: "Button Small Danger", type: "button", id: "news-stop", onclick: () => this.act(() => this.news.leave({ source: "streamers", token: this.access }), "Lizarding news stopped.") }, "Stop the emails"));
    } else {
      row.push(question((yes) => this.newsAnswer(yes, "news-row"), { idPrefix: "news-row" }));
    }
    this.$("news-row").replaceChildren(...row);
  }

  async newsAnswer(yes, place) {
    if (!yes) {
      await this.act(() => this.news.answer({ source: "streamers", yes: false, token: this.access }), "No Lizarding news: nothing else changes.");
      return;
    }
    // a Yes asks for the address, filled in with the account's own, changeable
    let email = "";
    try { email = (await this.api.user(this.access))?.email ?? ""; } catch { email = ""; }
    this.$(place).replaceChildren(addressForm((address) => this.act(
      () => this.news.answer({ source: "streamers", yes: true, email: address, token: this.access }),
      "Check your email for the link to confirm."), { email, idPrefix: place }));
  }

  async act(work, words) {
    try { await work(); if (words) this.say(words, true); } catch (error) { this.say(`That didn't work: ${error.message}`); }
    await this.drawMine();
    this.drawLists();
  }

  wire() {
    this.$("twitch").addEventListener("click", () => this.signIn("twitch"));
    this.$("youtube").addEventListener("click", () => this.signIn("youtube"));
    this.$("im-live").addEventListener("click", () => this.act(() => this.call("lizarding_im_live"), "You're listed as live for 4 hours."));
    this.$("not-live").addEventListener("click", () => this.act(() => this.call("lizarding_not_live"), "You're no longer listed as live."));
    this.$("next-save").addEventListener("click", () => {
      const value = this.$("next").value;
      if (!value) { this.say("Choose a day and time first."); return; }
      this.act(() => this.call("lizarding_set_next_stream", { at: new Date(value).toISOString() }), "Your next stream is set.");
    });
    this.$("next-clear").addEventListener("click", () => this.act(() => this.call("lizarding_set_next_stream", { at: null }), "Your next stream is cleared."));
    this.$("mine-emails").addEventListener("change", (event) => {
      const ok = event.target.checked;
      this.act(() => this.call("lizarding_set_emails", { ok }), ok ? "You'll get streamer emails." : "No more streamer emails.");
    });
    this.$("sign-out").addEventListener("click", () => { forgetRefresh(this.local); this.access = null; this.say("Signed out.", true); this.drawMine(); });
    this.$("leave").addEventListener("click", () => {
      if (!probing && !confirm("Leave the streamer list? Your channels, your next stream and your email choice are deleted.")) return;
      this.act(async () => { await this.call("lizarding_leave"); forgetRefresh(this.local); this.access = null; }, "You've left the streamer list, and what we kept of yours is deleted.");
    });
  }
}

// Against the stand-in, the providers are set up, and their pages are the
// stand-in's: the probe notes where it was sent; a person trying ?standin is
// sent straight back here, signed in.
const STANDIN = { twitch: "standin-twitch", youtube: "standin-google" };
const comeStraightBack = (url) => {
  location.hash = `access_token=standin-token&state=${new URL(url).searchParams.get("state")}`;
  location.reload();
};
const page = new Streamers(document, probing ? { go: (url) => { globalThis.__wentTo = url; }, clients: STANDIN }
  : asked.has("standin") ? { go: comeStraightBack, clients: STANDIN } : {});
await page.start();

if (probing) {
  const { Probe } = await import("./probe.js?v=bbe266fda68c");
  await new Probe(document, page).run();
}
