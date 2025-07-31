
import { z } from "zod";

// Base validation schemas for reuse
export const baseSchemas = {
  assetName: z.string()
    .min(2, "Asset name must be at least 2 characters")
    .max(50, "Asset name must be no more than 50 characters")
    .trim(),
  
  tradermadeSymbol: z.string()
    .min(1, "Symbol is required")
    .max(20, "Symbol must be no more than 20 characters")
    .trim()
    .toUpperCase(),
  
  tradeType: z.enum(['buy', 'sell', 'buy_limit', 'sell_limit'], {
    errorMap: () => ({ message: "Please select a valid trade type" })
  }),
  
  price: z.number()
    .min(0.000001, "Price must be greater than 0")
    .max(10000000, "Price is too high")
    .finite("Price must be a valid number"),
  
  optionalPrice: z.number()
    .min(0.000001, "Price must be greater than 0")  
    .max(10000000, "Price is too high")
    .finite("Price must be a valid number")
    .optional(),
  
  notes: z.string()
    .max(500, "Notes must be no more than 500 characters")
    .trim()
    .optional()
    .or(z.literal(""))
};

// Base trade alert object schema without refinements
const baseTradeAlertSchema = z.object({
  asset_name: baseSchemas.assetName,
  tradermade_symbol: baseSchemas.tradermadeSymbol,
  trade_type: baseSchemas.tradeType,
  entry_price: baseSchemas.price,
  stop_loss: baseSchemas.price,
  tp1: baseSchemas.optionalPrice,
  tp2: baseSchemas.optionalPrice,
  tp3: baseSchemas.optionalPrice,
  tp4: baseSchemas.optionalPrice,
  tp5: baseSchemas.optionalPrice,
  notes: baseSchemas.notes,
});

// Main trade alert schema with simplified validation
export const tradeAlertSchema = baseTradeAlertSchema.refine((data) => {
  // Stop loss validation based on trade direction
  const tolerance = 0.000001; // Small tolerance for floating point comparison
  
  if (Math.abs(data.stop_loss - data.entry_price) < tolerance) {
    return false;
  }
  
  if (data.trade_type === 'buy' || data.trade_type === 'buy_limit') {
    return data.stop_loss < data.entry_price;
  }
  
  if (data.trade_type === 'sell' || data.trade_type === 'sell_limit') {
    return data.stop_loss > data.entry_price;
  }
  
  return true;
}, {
  message: "Stop loss must be positioned correctly for the trade direction",
  path: ["stop_loss"]
}).refine((data) => {
  // Take profit validation - at least TP1 should be positioned correctly
  if (!data.tp1) return true; // No TP1 is acceptable
  
  if (data.trade_type === 'buy' || data.trade_type === 'buy_limit') {
    return data.tp1 > data.entry_price;
  }
  
  if (data.trade_type === 'sell' || data.trade_type === 'sell_limit') {
    return data.tp1 < data.entry_price;
  }
  
  return true;
}, {
  message: "Take profit must be positioned correctly for the trade direction",
  path: ["tp1"]
});

// Infer TypeScript type from schema
export type TradeAlertFormData = z.infer<typeof tradeAlertSchema>;

// Schema with status for API submissions
export const tradeAlertSubmissionSchema = baseTradeAlertSchema
  .extend({
    status: z.enum(['pending', 'active']).default('active')
  })
  .refine((data) => {
    // Stop loss validation
    const tolerance = 0.000001;
    
    if (Math.abs(data.stop_loss - data.entry_price) < tolerance) {
      return false;
    }
    
    if (data.trade_type === 'buy' || data.trade_type === 'buy_limit') {
      return data.stop_loss < data.entry_price;
    }
    
    if (data.trade_type === 'sell' || data.trade_type === 'sell_limit') {
      return data.stop_loss > data.entry_price;
    }
    
    return true;
  }, {
    message: "Stop loss must be positioned correctly for the trade direction",
    path: ["stop_loss"]
  })
  .refine((data) => {
    // Take profit validation
    if (!data.tp1) return true;
    
    if (data.trade_type === 'buy' || data.trade_type === 'buy_limit') {
      return data.tp1 > data.entry_price;
    }
    
    if (data.trade_type === 'sell' || data.trade_type === 'sell_limit') {
      return data.tp1 < data.entry_price;
    }
    
    return true;
  }, {
    message: "Take profit must be positioned correctly for the trade direction", 
    path: ["tp1"]
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
