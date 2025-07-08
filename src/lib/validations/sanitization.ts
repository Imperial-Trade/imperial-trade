
import DOMPurify from 'dompurify';

export const sanitizeInput = (input: string): string => {
  // Remove HTML tags and trim whitespace
  const cleaned = input.replace(/<[^>]*>/g, '').trim();
  
  // Remove multiple consecutive spaces
  return cleaned.replace(/\s+/g, ' ');
};

export const sanitizeHtml = (input: string): string => {
  // Use DOMPurify to clean HTML content while preserving safe formatting
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true
  }).trim();
};

export const normalizeEmail = (email: string): string => {
  return email.toLowerCase().trim();
};

export const removeExtraWhitespace = (text: string): string => {
  return text.replace(/\s+/g, ' ').trim();
};
