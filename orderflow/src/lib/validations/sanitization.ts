
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

// ============================================
// PHASE 1: CRITICAL FIX - Boolean Field Sanitization
// ============================================

/**
 * Sanitizes database payloads to prevent invalid data types
 * 
 * CRITICAL FIX for Bug #1: Converts empty strings to undefined for non-text fields
 * This prevents "invalid input syntax for type boolean: ''" errors
 * 
 * @param payload - The data object to sanitize
 * @returns Sanitized payload safe for database operations
 */
export const sanitizeDatabasePayload = <T extends Record<string, any>>(payload: T): T => {
  const sanitized: Record<string, any> = { ...payload };

  // List of field names that should be text and can have empty strings
  const textFields = ['notes', 'description', 'content', 'message', 'text', 'name', 'title'];

  // List of fields to exclude from database payloads (security/data integrity)
  const excludedFields = ['is_xeon_stream', 'expectedVersion'];

  Object.keys(sanitized).forEach(key => {
    const value = sanitized[key];

    // Remove excluded fields to prevent type errors
    if (excludedFields.includes(key)) {
      delete sanitized[key];
      return;
    }

    // Check if this is a text field
    const isTextField = textFields.some(field => key.toLowerCase().includes(field));

    // CRITICAL FIX: Delete empty string keys for non-text fields to prevent boolean errors
    // Setting to undefined doesn't work because Supabase converts undefined to empty string
    if (value === '' && !isTextField) {
      delete sanitized[key];
      return;
    }

    // Remove string representations of booleans
    if (value === 'true') {
      sanitized[key] = true;
    } else if (value === 'false') {
      sanitized[key] = false;
    }

    // Explicitly handle null values (keep them as null)
    if (value === null) {
      sanitized[key] = null;
    }
  });

  return sanitized as T;
};
