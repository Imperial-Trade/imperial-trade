/** iOS-style long-press alternates for letter keys (lowercase a–z). */
export const IOS_LETTER_ALTERNATES: Partial<Record<string, string[]>> = {
  a: ['à', 'á', 'â', 'ä', 'æ', 'ã', 'å', 'ā'],
  c: ['ç', 'ć', 'č'],
  d: ['ð'],
  e: ['è', 'é', 'ê', 'ë', 'ē', 'ė', 'ę'],
  i: ['ì', 'í', 'î', 'ï', 'ī', 'į', 'ı'],
  l: ['ł'],
  n: ['ñ', 'ń'],
  o: ['ò', 'ó', 'ô', 'ö', 'õ', 'ø', 'ō'],
  s: ['ß', 'ś', 'š'],
  t: ['þ'],
  u: ['ù', 'ú', 'û', 'ü', 'ū'],
  y: ['ý', 'ÿ'],
  z: ['ž', 'ź', 'ż'],
};

export function getLetterAlternates(letter: string): string[] {
  const key = letter.toLowerCase();
  const alts = IOS_LETTER_ALTERNATES[key];
  if (!alts?.length) return [];
  return [letter.toLowerCase(), ...alts];
}
