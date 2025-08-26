import { toNum } from '@/lib/utils';
import { coerceTradeType } from '@/constants/trading';
import { TradeJournalEntry } from '@/contexts/TradeJournalContext';

export function normalizeTradeDate(d: string | Date | null | undefined): string {
  if (!d) return new Date().toISOString().slice(0, 10);
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toISOString().slice(0, 10);
}

function stripWrappingQuotes(text: string): string {
  const trimmed = text.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || 
      (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function cleanCoachFeedback(feedback: string | null | undefined): string | undefined {
  if (!feedback) return undefined;
  
  // Try to parse as JSON
  try {
    const parsed = JSON.parse(feedback);
    if (typeof parsed === 'object' && parsed !== null) {
      // Check known keys in order of preference
      const knownKeys = ['coach_response', 'feedback', 'message', 'text'];
      for (const key of knownKeys) {
        if (parsed[key] && typeof parsed[key] === 'string') {
          return stripWrappingQuotes(parsed[key]);
        }
      }
    }
  } catch {
    // Not JSON, continue with original string
  }
  
  // Return original string if not JSON or no known keys found, stripped of quotes
  return stripWrappingQuotes(feedback);
}

export function mapDbRowToEntry(row: any): TradeJournalEntry {
  // Coerce numeric fields with toNum
  const pnl = toNum(row.pnl);
  const entry_price = row.entry_price ? toNum(row.entry_price) : undefined;
  const exit_price = row.exit_price ? toNum(row.exit_price) : undefined;
  const position_size = row.position_size ? toNum(row.position_size) : undefined;

  // Normalize trade_type with coerceTradeType
  const trade_type = coerceTradeType(row.trade_type);

  // Normalize screenshots: screenshot_urls if array; else wrap screenshot_url; else []
  let screenshot_urls: string[];
  if (Array.isArray(row.screenshot_urls) && row.screenshot_urls.length > 0) {
    screenshot_urls = row.screenshot_urls;
  } else if (row.screenshot_url) {
    screenshot_urls = [row.screenshot_url];
  } else {
    screenshot_urls = [];
  }

  // Normalize trade_date
  const trade_date = normalizeTradeDate(row.trade_date);

  return {
    id: row.id,
    user_id: row.user_id,
    asset_ticker: row.asset_ticker || '',
    trade_type,
    pnl,
    entry_price,
    exit_price,
    position_size,
    trade_date,
    notes: row.notes || undefined,
    screenshot_url: row.screenshot_url || undefined,
    screenshot_urls,
    ai_positive_feedback: cleanCoachFeedback(row.ai_positive_feedback),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}