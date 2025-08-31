/**
 * Shared notification helpers with environment-based guardrails
 */

/**
 * Check if email notifications are enabled via environment flag
 */
export function isEmailEnabled(): boolean {
  const flag = Deno.env.get('EMAIL_ENABLED');
  return flag === 'true';
}

/**
 * Check if push notifications are enabled via environment flag
 */
export function isPushEnabled(): boolean {
  const flag = Deno.env.get('PUSH_ENABLED');
  return flag === 'true';
}

/**
 * Hash an identifier for safe logging (async version for consistency)
 */
export async function hashId(identifier: string | null | undefined): Promise<string> {
  if (!identifier) return 'null';
  
  const encoder = new TextEncoder();
  const data = encoder.encode(identifier);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = new Uint8Array(hashBuffer);
  const hashHex = Array.from(hashArray)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  return hashHex.slice(0, 8); // First 8 chars for brevity
}

/**
 * Sanitize error messages to remove PII
 */
export function sanitizeError(error: any): string {
  if (!error) return 'Unknown error';
  
  const message = error.message || error.toString();
  // Remove email patterns and common PII
  return message
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL_REDACTED]')
    .replace(/\b\d{4,}\b/g, '[NUMERIC_ID]')
    .replace(/Bearer\s+[\w\.-]+/gi, 'Bearer [TOKEN]');
}