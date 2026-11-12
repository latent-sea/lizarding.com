// The newsletter's question (T-682, latent-productions Projects/Lizarding/design/newsletter/plan.md):
// a forced Yes or No, the same words everywhere, two equal buttons, neither
// pre-selected; No changes nothing. The answer goes to the platform's
// `newsletter` function (platform/functions/newsletter), which keeps it with
// its words and time and hands a Yes to Brevo's double opt-in.

import { el } from "./live.js?v=f0d2b658ede3";

// Version 1, word for word as the function keeps it. A new wording is a new version, never an edit.
export const WORDS_VERSION = 1;
export const WORDS = "Email me Lizarding news? Get the demo and the Steam launch first: one email at each big moment, nothing else. We email you a link to confirm first, and every email has a link to stop them. Privacy policy: lizarding.com/privacy";
export const YES = "Yes, email me";
export const NO = "No thanks";

// The function's three routes. A function not there yet (404) or not set up (configured: false) reads as not set up.
export function newsletter(config, fetchIt = globalThis.fetch.bind(globalThis)) {
  const base = `${config.functions}/newsletter`;
  const headers = (token) => ({ apikey: config.key, Authorization: `Bearer ${token ?? config.key}`, "Content-Type": "application/json" });
  async function said(response) {
    const body = await response.json().catch(() => null);
    if (response.status === 404 || body?.configured === false) return { configured: false };
    if (!response.ok) throw Object.assign(new Error(body?.msg || `the server answered ${response.status}`), { status: response.status });
    return { configured: true, ...body };
  }
  return {
    answer: async ({ source, yes, email = null, token = null }) => said(await fetchIt(`${base}/answer`, {
      method: "POST", headers: headers(token),
      body: JSON.stringify({ app: "lizarding", source, answer: yes ? "yes" : "no", words_version: WORDS_VERSION, ...(yes ? { email } : {}) }),
    })),
    me: async (token) => said(await fetchIt(`${base}/me?app=lizarding`, { headers: headers(token) })),
    leave: async ({ source, token }) => said(await fetchIt(`${base}/leave`, { method: "POST", headers: headers(token), body: JSON.stringify({ app: "lizarding", source }) })),
  };
}

// What an answer as it stands says, for a row on a page
export function stateWords(me) {
  switch (me?.state) {
    case "yes": return `Yes: Lizarding news goes to ${me.email}.`;
    case "waiting": return `Waiting for you to confirm: we emailed a link to ${me.email}.`;
    case "no": return "No: you get no Lizarding news.";
    case "withdrawn": return "Stopped: you get no Lizarding news.";
    default: return "Not answered yet.";
  }
}

// The question: the words, then two equal buttons. `onAnswer(yes)` is told which was pressed.
export function question(onAnswer, { idPrefix = "news" } = {}) {
  const yes = el("button", { class: "Button Small Choice", type: "button", id: `${idPrefix}-yes`, onclick: () => onAnswer(true) }, YES);
  const no = el("button", { class: "Button Small Choice", type: "button", id: `${idPrefix}-no`, onclick: () => onAnswer(false) }, NO);
  return el("div", { class: "Question", id: `${idPrefix}-question` }, el("p", { class: "QuestionWords" }, WORDS), el("div", { class: "Choices" }, yes, no));
}

// After a Yes: the address to send to, filled in with what is known, changeable
export function addressForm(onSend, { email = "", idPrefix = "news" } = {}) {
  const input = el("input", { type: "email", id: `${idPrefix}-email`, autocomplete: "email", required: true, maxlength: 254, value: email ?? "" });
  return el("form", { class: "Newsletter", id: `${idPrefix}-address`, onsubmit: (e) => { e.preventDefault(); onSend(input.value.trim()); } },
    el("label", { class: "Field" }, el("span", {}, "Your email"), input),
    el("button", { class: "Button Small", type: "submit" }, "Send me the link"));
}
