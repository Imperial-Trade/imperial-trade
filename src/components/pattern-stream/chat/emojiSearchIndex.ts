import {
  REACTION_EMOJI_CATEGORIES,
  ALL_REACTION_EMOJIS,
  type ReactionEmojiCategoryId,
} from "./reactionEmojiCatalog";

/** Common English aliases → emoji (lowercase keys). */
const EMOJI_ALIASES: Record<string, string[]> = {
  smile: ["😀", "😃", "😄", "😁", "🙂", "😊"],
  happy: ["😀", "😃", "😄", "😁", "😊", "🥳"],
  grin: ["😀", "😁", "😆"],
  laugh: ["😂", "🤣", "😆"],
  lol: ["😂", "🤣"],
  wink: ["😉"],
  love: ["❤️", "🥰", "😍", "💕", "💖", "💘"],
  heart: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "💔", "💕"],
  fire: ["🔥"],
  hot: ["🔥", "🥵"],
  thumbs: ["👍", "👎"],
  thumb: ["👍", "👎"],
  up: ["👍", "🆙"],
  down: ["👎", "📉"],
  clap: ["👏"],
  pray: ["🙏"],
  hands: ["🙌", "👐", "🤝", "🙏"],
  wave: ["👋"],
  money: ["💰", "💵", "💸", "🤑", "💳"],
  cash: ["💵", "💸", "💰"],
  chart: ["📈", "📉", "📊"],
  stock: ["📈", "📉", "💹"],
  bull: ["📈", "🐂"],
  bear: ["📉", "🐻"],
  rocket: ["🚀"],
  diamond: ["💎"],
  gem: ["💎"],
  star: ["⭐", "🌟", "✨"],
  check: ["✅", "☑️", "✔️"],
  tick: ["✅", "✔️"],
  cross: ["❌", "✖️"],
  no: ["❌", "🚫"],
  yes: ["✅", "👍"],
  warning: ["⚠️", "🚨"],
  alert: ["🚨", "⚠️", "📣"],
  think: ["🤔"],
  cry: ["😢", "😭"],
  sad: ["😢", "😭", "☹️", "🙁"],
  angry: ["😡", "😠", "🤬"],
  mad: ["😡", "😠"],
  wow: ["😮", "😲", "🤯"],
  shock: ["😮", "😲", "🤯"],
  eyes: ["👀"],
  brain: ["🧠"],
  party: ["🎉", "🥳", "🎊"],
  celebrate: ["🎉", "🥳"],
  target: ["🎯"],
  lightning: ["⚡"],
  bolt: ["⚡"],
  green: ["🟢", "💚"],
  red: ["🔴", "❤️"],
  blue: ["🔵", "💙"],
  phone: ["📱", "☎️", "📞"],
  camera: ["📷", "📸"],
  computer: ["💻", "🖥️"],
  time: ["⏰", "⌛", "⏳"],
  clock: ["⏰", "🕰️"],
  sun: ["☀️", "🌞"],
  moon: ["🌙", "🌜"],
  dog: ["🐶", "🐕"],
  cat: ["🐱", "🐈"],
  poop: ["💩"],
  skull: ["💀", "☠️"],
  hundred: ["💯"],
  ok: ["👌", "🆗"],
  muscle: ["💪"],
  trophy: ["🏆"],
  medal: ["🥇", "🥈", "🥉"],
};

const CATEGORY_SEARCH_TERMS: Record<ReactionEmojiCategoryId, string[]> = {
  recent: ["recent", "history", "clock"],
  smileys: ["smile", "smiley", "face", "emoji", "happy", "sad"],
  gestures: ["hand", "gesture", "body", "finger", "wave", "thumb"],
  objects: ["object", "thing", "phone", "tool", "light"],
  symbols: ["symbol", "sign", "mark", "heart"],
  trading: ["trade", "trading", "market", "finance", "money", "chart", "stock"],
};

/** Per-emoji keywords (lowercase). */
const EMOJI_KEYWORDS: Record<string, string[]> = {};

for (const cat of REACTION_EMOJI_CATEGORIES) {
  for (const emoji of cat.emojis) {
    if (!EMOJI_KEYWORDS[emoji]) {
      EMOJI_KEYWORDS[emoji] = [cat.id, cat.label.toLowerCase()];
    }
  }
}

/** Register high-signal aliases onto emoji keyword lists. */
for (const [term, emojis] of Object.entries(EMOJI_ALIASES)) {
  for (const emoji of emojis) {
    const list = EMOJI_KEYWORDS[emoji] ?? (EMOJI_KEYWORDS[emoji] = []);
    if (!list.includes(term)) list.push(term);
  }
}

export function searchReactionEmojis(query: string | null | undefined): string[] {
  const q = (query ?? '').trim().toLowerCase();
  if (!q) return [];

  const results = new Set<string>();

  for (const emoji of ALL_REACTION_EMOJIS) {
    if (emoji.includes(q)) {
      results.add(emoji);
    }
  }

  for (const [term, emojis] of Object.entries(EMOJI_ALIASES)) {
    if (term.includes(q) || q.includes(term)) {
      emojis.forEach((e) => results.add(e));
    }
  }

  for (const cat of REACTION_EMOJI_CATEGORIES) {
    const terms = CATEGORY_SEARCH_TERMS[cat.id] ?? [];
    if (cat.id.includes(q) || cat.label.toLowerCase().includes(q) || terms.some((t) => t.includes(q) || q.includes(t))) {
      cat.emojis.forEach((e) => results.add(e));
    }
  }

  for (const [emoji, keywords] of Object.entries(EMOJI_KEYWORDS)) {
    if (keywords.some((k) => k.includes(q) || q.includes(k))) {
      results.add(emoji);
    }
  }

  return [...results];
}

export const PAGER_CATEGORY_IDS = REACTION_EMOJI_CATEGORIES.map((c) => c.id);

export function pagerIndexForCategory(id: ReactionEmojiCategoryId): number {
  if (id === "recent") return 0;
  return REACTION_EMOJI_CATEGORIES.findIndex((c) => c.id === id);
}

export function categoryIdForPagerIndex(index: number): ReactionEmojiCategoryId {
  return REACTION_EMOJI_CATEGORIES[index]?.id ?? "smileys";
}
