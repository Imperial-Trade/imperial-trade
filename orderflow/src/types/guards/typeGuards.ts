// Type guard functions to validate types at runtime

// Generic type guard for Record<string, any>
export function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Type guard for string
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

// Type guard for number
export function isNumber(value: unknown): value is number {
  return typeof value === 'number';
}

// Type guard for boolean
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

// Type guard for Date
export function isDate(value: unknown): value is Date {
  return value instanceof Date;
}

// Type guard for array of strings
export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string');
}

// Type guard for array of numbers
export function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every(item => typeof item === 'number');
}

// Trade Alert type guards
export function isTradeAlert(value: unknown): value is {
  id: string;
  asset_name: string;
  tradermade_symbol: string;
  trade_type: 'buy' | 'sell' | 'buy_limit' | 'sell_limit';
  entry_price: number;
  stop_loss: number;
  status: 'pending' | 'active' | 'closed';
  tp1?: number;
  tp2?: number;
  tp3?: number;
  tp4?: number;
  tp5?: number;
  tp_hits: number[];
  notes?: string;
  close_reason?: string;
  created_at: string;
  updated_at: string;
  user_id: string;
} {
  if (!value || typeof value !== 'object') return false;
  
  const obj = value as Record<string, unknown>;
  
  return (
    typeof obj.id === 'string' &&
    typeof obj.asset_name === 'string' &&
    typeof obj.tradermade_symbol === 'string' &&
    ['buy', 'sell', 'buy_limit', 'sell_limit'].includes(obj.trade_type as string) &&
    typeof obj.entry_price === 'number' &&
    typeof obj.stop_loss === 'number' &&
    ['pending', 'active', 'closed'].includes(obj.status as string) &&
    Array.isArray(obj.tp_hits) &&
    typeof obj.created_at === 'string' &&
    typeof obj.updated_at === 'string' &&
    typeof obj.user_id === 'string'
  );
}

export function isCreateTradeAlertDto(value: unknown): value is {
  assetName: string;
  tradermadeSymbol: string;
  tradeType: 'buy' | 'sell' | 'buy_limit' | 'sell_limit';
  entryPrice: number;
  stopLoss: number;
  tp1?: number;
  tp2?: number;
  tp3?: number;
  tp4?: number;
  tp5?: number;
  notes?: string;
} {
  if (!value || typeof value !== 'object') return false;
  
  const obj = value as Record<string, unknown>;
  
  return (
    typeof obj.assetName === 'string' &&
    typeof obj.tradermadeSymbol === 'string' &&
    ['buy', 'sell', 'buy_limit', 'sell_limit'].includes(obj.tradeType as string) &&
    typeof obj.entryPrice === 'number' &&
    typeof obj.stopLoss === 'number'
  );
}

export function isUpdateTradeAlertDto(value: unknown): value is {
  status?: 'pending' | 'active' | 'closed';
  tpHits?: number[];
  closeReason?: string;
  notes?: string;
} {
  if (!value || typeof value !== 'object') return false;
  
  const obj = value as Record<string, unknown>;
  
  return (
    (obj.status === undefined || ['pending', 'active', 'closed'].includes(obj.status as string)) &&
    (obj.tpHits === undefined || Array.isArray(obj.tpHits)) &&
    (obj.closeReason === undefined || typeof obj.closeReason === 'string') &&
    (obj.notes === undefined || typeof obj.notes === 'string')
  );
}

// UUID validation
export function isValidUUID(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

// API Response type guards
export function isApiResponse<T>(value: unknown): value is {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
} {
  if (!value || typeof value !== 'object') return false;
  
  const obj = value as Record<string, unknown>;
  
  return typeof obj.success === 'boolean';
}
