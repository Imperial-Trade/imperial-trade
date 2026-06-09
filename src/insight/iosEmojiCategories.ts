export type EmojiCategoryId =
  | 'recents'
  | 'smileys'
  | 'animals'
  | 'food'
  | 'activity'
  | 'travel'
  | 'objects'
  | 'symbols'
  | 'flags';

export type EmojiCategory = {
  id: EmojiCategoryId;
  label: string;
  emojis: string[];
};

const SMILEYS: string[] = [
  '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '🫠', '😉', '😊', '😇',
  '🥰', '😍', '🤩', '😘', '😗', '☺️', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝',
  '🤑', '🤗', '🤭', '🫢', '🫣', '🤫', '🤔', '🫡', '🤐', '🤨', '😐', '😑', '😶', '🫥',
  '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢',
  '🤮', '🥵', '🥶', '🥴', '😵', '🤯', '🥳', '🥸', '😎', '🤓', '🧐', '😕', '😟', '🙁',
  '☹️', '😮', '😯', '😲', '😳', '🥺', '🥹', '😦', '😧', '😨', '😰', '😥', '😢', '😭',
  '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿',
  '💀', '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖', '😺', '😸', '😹', '😻',
  '😼', '😽', '🙀', '😿', '😾', '🙈', '🙉', '🙊',
];

const ANIMALS: string[] = [
  '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸',
  '🐵', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝',
  '🐛', '🦋', '🐌', '🐞', '🐜', '🪲', '🪳', '🦟', '🦗', '🕷️', '🦂', '🐢', '🐍', '🦎',
  '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈',
];

const FOOD: string[] = [
  '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍',
  '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🫑', '🌽', '🥕', '🫒', '🧄',
  '🧅', '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🧈', '🥞', '🧇',
  '🥓', '🥩', '🍗', '🍖', '🌭', '🍔', '🍟', '🍕', '🫓', '🥪', '🥙', '🧆', '🌮', '🌯',
  '🫔', '🥗', '🥘', '🫕', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🦪', '🍤', '🍙',
  '🍚', '🍘', '🍥', '🥠', '🥮', '🍢', '🍡', '🍧', '🍨', '🍦', '🥧', '🧁', '🍰', '🎂',
  '🍮', '🍭', '🍬', '🍫', '🍿', '🍩', '🍪', '🌰', '🥜', '🍯', '🥛', '🍼', '☕', '🍵',
];

const ACTIVITY: string[] = [
  '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒',
  '🏑', '🥍', '🏏', '🪃', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹',
  '🛼', '🛷', '⛸️', '🥌', '🎿', '⛷️', '🏂', '🪂', '🏋️', '🤼', '🤸', '⛹️', '🤺', '🤾',
  '🏌️', '🏇', '🧘', '🏄', '🏊', '🤽', '🚣', '🧗', '🚵', '🚴', '🏆', '🥇', '🥈', '🥉',
  '🏅', '🎖️', '🎯', '🎳', '🎮', '🎰', '🎲', '🧩', '♟️', '🎭', '🎨', '🎬', '🎤', '🎧',
];

const TRAVEL: string[] = [
  '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛', '🚜',
  '🦯', '🦽', '🦼', '🛴', '🚲', '🛵', '🏍️', '🛺', '🚨', '🚔', '🚍', '🚘', '🚖', '🚡',
  '🚠', '🚟', '🚃', '🚋', '🚞', '🚝', '🚄', '🚅', '🚈', '🚂', '🚆', '🚇', '🚊', '🚉',
  '✈️', '🛫', '🛬', '🛩️', '💺', '🛰️', '🚀', '🛸', '🚁', '🛶', '⛵', '🚤', '🛥️', '🛳️',
  '⛴️', '🚢', '⚓', '🪝', '⛽', '🚧', '🚦', '🚥', '🗺️', '🗿', '🗽', '🗼', '🏰', '🏯',
];

const OBJECTS: string[] = [
  '⌚', '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '🕹️', '🗜️', '💽', '💾', '💿',
  '📀', '📼', '📷', '📸', '📹', '🎥', '📽️', '🎞️', '📞', '☎️', '📟', '📠', '📺', '📻',
  '🎙️', '🎚️', '🎛️', '🧭', '⏱️', '⏲️', '⏰', '🕰️', '⌛', '⏳', '📡', '🔋', '🔌', '💡',
  '🔦', '🕯️', '🪔', '🧯', '🛢️', '💸', '💵', '💴', '💶', '💷', '🪙', '💰', '💳', '💎',
  '⚖️', '🪜', '🧰', '🪛', '🔧', '🔨', '⚒️', '🛠️', '⛏️', '🪚', '🔩', '⚙️', '🪤', '🧱',
];

const SYMBOLS: string[] = [
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓',
  '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️',
  '☦️', '🛐', '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓',
  '🆔', '⚛️', '🉑', '☢️', '☣️', '📴', '📳', '🈶', '🈚', '🈸', '🈺', '🈷️', '✴️', '🆚',
  '💮', '🉐', '㊙️', '㊗️', '🈴', '🈵', '🈹', '🈲', '🅰️', '🅱️', '🆎', '🆑', '🅾️', '🆘',
  '❌', '⭕', '🛑', '⛔', '📛', '🚫', '💯', '💢', '♨️', '🚷', '🚯', '🚳', '🚱', '🔞',
  '📵', '🚭', '❗', '❕', '❓', '❔', '‼️', '⁉️', '🔅', '🔆', '〽️', '⚠️', '🚸', '🔱',
  '⚜️', '🔰', '♻️', '✅', '🈯', '💹', '❇️', '✳️', '❎', '🌐', '💠', 'Ⓜ️', '🌀', '💤',
  '🏧', '🚾', '♿', '🅿️', '🛗', '🈳', '🈂️', '🛂', '🛃', '🛄', '🛅', '🚹', '🚺', '🚼',
  '⚧️', '🚻', '🚮', '🎦', '📶', '🈁', '🔣', 'ℹ️', '🔤', '🔡', '🔠', '🆖', '🆗', '🆙',
  '🆒', '🆕', '🆓', '0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟',
];

const FLAGS: string[] = [
  '🏁', '🚩', '🎌', '🏴', '🏳️', '🏳️‍🌈', '🏳️‍⚧️', '🏴‍☠️', '🇺🇸', '🇬🇧', '🇨🇦', '🇦🇺', '🇯🇵',
  '🇰🇷', '🇨🇳', '🇮🇳', '🇧🇷', '🇲🇽', '🇩🇪', '🇫🇷', '🇮🇹', '🇪🇸', '🇵🇹', '🇳🇱', '🇸🇪',
  '🇳🇴', '🇩🇰', '🇫🇮', '🇨🇭', '🇦🇹', '🇧🇪', '🇮🇪', '🇵🇱', '🇺🇦', '🇷🇺', '🇹🇷', '🇸🇦',
  '🇦🇪', '🇮🇱', '🇿🇦', '🇳🇬', '🇪🇬', '🇵🇭', '🇮🇩', '🇹🇭', '🇻🇳', '🇸🇬', '🇲🇾', '🇳🇿',
  '🇦🇷', '🇨🇱', '🇨🇴', '🇵🇪', '🇵🇰', '🇧🇩', '🇵🇹', '🇬🇷', '🇨🇿', '🇭🇺', '🇷🇴',
];

export const IOS_EMOJI_CATEGORIES: EmojiCategory[] = [
  { id: 'smileys', label: 'Smileys', emojis: SMILEYS },
  { id: 'animals', label: 'Animals', emojis: ANIMALS },
  { id: 'food', label: 'Food', emojis: FOOD },
  { id: 'activity', label: 'Activity', emojis: ACTIVITY },
  { id: 'travel', label: 'Travel', emojis: TRAVEL },
  { id: 'objects', label: 'Objects', emojis: OBJECTS },
  { id: 'symbols', label: 'Symbols', emojis: SYMBOLS },
  { id: 'flags', label: 'Flags', emojis: FLAGS },
];

const CATEGORY_KEYWORDS: Record<Exclude<EmojiCategoryId, 'recents'>, string[]> = {
  smileys: ['smile', 'face', 'happy', 'sad', 'laugh', 'cry', 'love', 'emoji'],
  animals: ['animal', 'dog', 'cat', 'pet', 'bird', 'fish', 'bug'],
  food: ['food', 'eat', 'fruit', 'drink', 'coffee', 'pizza', 'apple'],
  activity: ['sport', 'ball', 'game', 'run', 'gym', 'music'],
  travel: ['car', 'plane', 'travel', 'train', 'bus', 'ship'],
  objects: ['phone', 'computer', 'tool', 'money', 'light', 'clock'],
  symbols: ['heart', 'symbol', 'sign', 'mark', 'arrow', 'number'],
  flags: ['flag', 'country', 'nation'],
};

function uniqueEmojis(list: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const e of list) {
    if (seen.has(e)) continue;
    seen.add(e);
    out.push(e);
  }
  return out;
}

export function getAllCategoryEmojis(): string[] {
  return uniqueEmojis(IOS_EMOJI_CATEGORIES.flatMap((c) => c.emojis));
}

export function getEmojisForCategory(
  categoryId: EmojiCategoryId,
  recents: string[],
): string[] {
  if (categoryId === 'recents') {
    return recents.length > 0 ? recents : SMILEYS.slice(0, 32);
  }
  const cat = IOS_EMOJI_CATEGORIES.find((c) => c.id === categoryId);
  return cat?.emojis ?? [];
}

export function searchEmojis(query: string, recents: string[]): string[] {
  const q = (query ?? '').trim().toLowerCase();
  if (!q) return [];

  const direct = getAllCategoryEmojis().filter((e) => e.includes(q));
  if (direct.length > 0) return direct;

  const matched = IOS_EMOJI_CATEGORIES.filter((cat) => {
    const keywords = CATEGORY_KEYWORDS[cat.id];
    return (
      cat.id.includes(q) ||
      cat.label.toLowerCase().includes(q) ||
      keywords.some((k) => k.includes(q) || q.includes(k))
    );
  });

  if (matched.length > 0) {
    return uniqueEmojis(matched.flatMap((c) => c.emojis));
  }

  const recentHits = recents.filter((e) => e.toLowerCase().includes(q));
  if (recentHits.length > 0) return recentHits;

  return [];
}
