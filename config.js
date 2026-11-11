// lizarding.com's settings: every address the page links to, in one place.
// A null is a placeholder: the page says it opens soon until the address is
// filled in, as the web game's promo.js does (sites/lizarding/promo.js).

export const CONFIG = Object.freeze({
  // where the page is served: the streamer sign-ins come back here
  site: "https://lizarding.com",
  // the web Betting game (sites/lizarding, served at play.lizarding.com)
  play: "https://play.lizarding.com/",

  // the store pages, null until each is public
  stores: [
    { key: "steam", name: "Steam", call: "Wishlist on Steam", href: null },
    { key: "play", name: "Google Play", call: "Get it on Google Play", href: null },
  ],

  // Lizarding's Discord invite (a discord.gg link), null until the server is open
  discord: null,

  // the socials (marketing/social-handle-sweep.md, all @LizardingGame), as the web game has them
  socials: [
    { name: "YouTube", icon: "art/icons/youtube.svg", href: "https://www.youtube.com/@LizardingGame" },
    { name: "TikTok", icon: "art/icons/tiktok.svg", href: "https://www.tiktok.com/@LizardingGame" },
    { name: "X", icon: "art/icons/x.svg", href: "https://x.com/LizardingGame" },
    { name: "Bluesky", icon: "art/icons/bluesky.svg", href: "https://bsky.app/profile/lizardinggame.bsky.social" },
    { name: "Reddit", icon: "art/icons/reddit.svg", href: "https://www.reddit.com/r/Lizarding" },
  ],

  // The gameplay loops, one for each side of the game the adverts show
  // (release plan, 2026-11-10). Until a loop is captured, its picture stands
  // in: `video` is then the loop's file in art/loops/ (an MP4, muted,
  // about 10 seconds), and the picture becomes its poster.
  loops: [
    { key: "chaos", heading: "The chaos", said: "Ten lizards on one stage: they leap, swim, sprint and pick fights. No two races play out the same.", art: "art/race-close.jpg", video: null },
    { key: "genes", heading: "From the genes up", said: "Each lizard's genes build its body and its mind: how it runs, when it sprints, whether it starts a fight. And they pass to its young.", art: "art/race.jpg", video: null },
    { key: "form", heading: "Form that's true", said: "Every figure on the race card comes from races run by the same simulation you watch. Reading form works because form is real.", art: "art/card.jpg", video: null },
    { key: "ladder", heading: "Battle the ladder", said: "Pick five of your lizards for each of six races against another player. The most points moves you up the ladder.", art: "art/capsule.jpg", video: null },
    { key: "bet", heading: "Back a winner", said: "Study the field, back a lizard to win or to place, and scream it home. Play money only.", art: "art/card-lower.jpg", video: null },
  ],

  // The factory's platform (platform/README.md): the publishable key ships in every page, as the web game's does
  platform: {
    rest: "https://api.latent-sea.com/rest/v1",
    auth: "https://api.latent-sea.com/auth/v1",
    functions: "https://api.latent-sea.com/functions/v1",
    key: "sb_publishable_BqVtSYE4ysOb2sHMuFSwMk_HrTAUgLx",
  },

  // The streamer sign-ins: public client ids, null until each is registered
  // (README, "The streamer section"). The secrets never come here: they are
  // the platform's (platform/functions/streamers).
  twitchClientId: null,
  googleClientId: null,

  contact: "dev-latent-sea@proton.me",
});
