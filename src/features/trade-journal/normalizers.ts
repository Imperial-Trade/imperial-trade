import { toNum } from '@/lib/utils';
import { coerceTradeType } from '@/constants/trading';
import { TradeJournalEntry } from '@/contexts/TradeJournalContext';
import { formatYmdLocal, isValidYmd } from '@/lib/date';

export function normalizeTradeDate(d: string | Date | null | undefined): string {
  if (!d) return formatYmdLocal(new Date());
  if (typeof d === 'string') {
    // If it's already a valid YYYY-MM-DD string, return it
    if (isValidYmd(d)) return d;
    // If it's an ISO string or other format, parse and convert to local YMD
    const parsed = new Date(d);
    if (!isNaN(parsed.getTime())) return formatYmdLocal(parsed);
    // Fallback to today if invalid
    return formatYmdLocal(new Date());
  }
  // If it's a Date object, convert to local YMD
  return formatYmdLocal(d);
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
  const planned_target_price = row.planned_target_price ? toNum(row.planned_target_price) : undefined;
  const planned_stop_loss = row.planned_stop_loss ? toNum(row.planned_stop_loss) : undefined;

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
    screenshot_urls, // Include normalized screenshot URLs array
    ai_positive_feedback: cleanCoachFeedback(row.ai_positive_feedback),
    followed_plan: row.followed_plan !== null && row.followed_plan !== undefined ? row.followed_plan : undefined,
    target_hit_by_market: row.target_hit_by_market !== null && row.target_hit_by_market !== undefined ? row.target_hit_by_market : undefined,
    planned_target_price,
    planned_stop_loss,
    revenge_trade: row.revenge_trade !== null && row.revenge_trade !== undefined ? row.revenge_trade : undefined,
    strategy: row.strategy || undefined,
    session: row.session || undefined,
    emotion: row.emotion || undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
    // Manual vs auto separation (Journal XX vs Journal XX Pro)
    is_synced: row.is_synced === true,
    broker_connection_id: row.broker_connection_id ?? undefined,
    broker_trade_id: row.broker_trade_id ?? undefined,
    entry_time: row.entry_time ?? undefined,
    exit_time: row.exit_time ?? undefined,
  };
}