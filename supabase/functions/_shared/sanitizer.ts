/**
 * Strips HTML tags from a string to prevent injection attacks.
 * @param {string | null | undefined} text - The input text to sanitize.
 * @returns {string} The sanitized text.
 */
export function sanitizeText(text: string | null | undefined): string {
  if (!text) return "";
  // A simple regex to remove anything that looks like an HTML tag.
  return text.replace(/<[^>]*>?/gm, "");
}
