
import { z } from "zod";

// Base validation schemas for reuse
export const baseSchemas = {
  assetName: z.string()
    .min(2, "Asset name must be at least 2 characters")
    .max(50, "Asset name must be no more than 50 characters")
    .trim(),
  
  finnhubSymbol: z.string()
    .min(1, "Symbol is required")
    .max(20, "Symbol must be no more than 20 characters")
    .trim()
    .toUpperCase(),
  
  tradeType: z.enum(['buy', 'sell', 'buy_limit', 'sell_limit'], {
    errorMap: () => ({ message: "Please select a valid trade type" })
  }),
  
  price: z.number()
    .min(0.01, "Price must be greater than 0")
    .max(1000000, "Price is too high")
    .finite("Price must be a valid number"),
  
  optionalPrice: z.number()
    .min(0.01, "Price must be greater than 0")
    .max(1000000, "Price is too high")
    .finite("Price must be a valid number")
    .optional(),
  
  notes: z.string()
    .max(500, "Notes must be no more than 500 characters")
    .trim()
    .optional()
    .or(z.literal(""))
};

// Main trade alert schema with optimized validation
export const tradeAlertSchema = z.object({
  asset_name: baseSchemas.assetName,
  finnhub_symbol: baseSchemas.finnhubSymbol,
  trade_type: baseSchemas.tradeType,
  entry_price: baseSchemas.price,
  stop_loss: baseSchemas.price,
  tp1: baseSchemas.optionalPrice,
  tp2: baseSchemas.optionalPrice,
  tp3: baseSchemas.optionalPrice,
  tp4: baseSchemas.optionalPrice,
  tp5: baseSchemas.optionalPrice,
  notes: baseSchemas.notes,
}).refine((data) => {
  // Custom validation: Stop loss should be different from entry price
  if (data.stop_loss === data.entry_price) {
    return false;
  }
  
  // For buy orders, stop loss should be lower than entry
  if (data.trade_type.includes('buy') && data.stop_loss >= data.entry_price) {
    return false;
  }
  
  // For sell orders, stop loss should be higher than entry
  if (data.trade_type.includes('sell') && data.stop_loss <= data.entry_price) {
    return false;
  }
  
  return true;
}, {
  message: "Stop loss must be set appropriately based on trade direction",
  path: ["stop_loss"]
}).refine((data) => {
  // Validate take profit levels are in correct order
  const tps = [data.tp1, data.tp2, data.tp3, data.tp4, data.tp5].filter(tp => tp !== undefined) as number[];
  
  if (tps.length === 0) return true; // No TPs is valid
  
  // Check if TPs are in ascending order for buy trades or descending for sell trades
  const isBuy = data.trade_type.includes('buy');
  
  for (let i = 0; i < tps.length - 1; i++) {
    if (isBuy && tps[i] >= tps[i + 1]) {
      return false;
    }
    if (!isBuy && tps[i] <= tps[i + 1]) {
      return false;
    }
  }
  
  return true;
}, {
  message: "Take profit levels must be in correct order based on trade direction",
  path: ["tp1"]
});

// Infer TypeScript type from schema
export type TradeAlertFormData = z.infer<typeof tradeAlertSchema>;

// Schema with status for API submissions
export const tradeAlertSubmissionSchema = tradeAlertSchema.extend({
  status: z.enum(['pending', 'active']).default('active')
});

export type TradeAlertSubmissionData = z.infer<typeof tradeAlertSubmissionSchema>;

// Create cached schema parser for performance
const cachedParsers = new Map<string, ReturnType<typeof tradeAlertSchema.safeParse>>();

export const validateTradeAlert = (data: unknown, useCache = true): z.SafeParseReturnType<unknown, TradeAlertFormData> => {
  const cacheKey = useCache ? JSON.stringify(data) : '';
  
  if (useCache && cachedParsers.has(cacheKey)) {
    return cachedParsers.get(cacheKey)!;
  }
  
  const result = tradeAlertSchema.safeParse(data);
  
  if (useCache) {
    cachedParsers.set(cacheKey, result);
    
    // Limit cache size to prevent memory leaks
    if (cachedParsers.size > 100) {
      const firstKey = cachedParsers.keys().next().value;
      cachedParsers.delete(firstKey);
    }
  }
  
  return result;
};
