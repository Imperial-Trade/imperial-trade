import { z } from 'zod';

// ============================================
// PHASE 3: RUNTIME VALIDATION SCHEMAS
// ============================================

/**
 * Comprehensive Zod schema for trade alert updates
 * Validates all fields at runtime before database operations
 */
export const UpdateTradeAlertSchema = z.object({
  status: z.enum(['pending', 'active', 'closed', 'partially_profited']).optional(),
  tpHits: z.array(z.number().int().min(1).max(5)).optional(),
  closeReason: z.enum([
    'manual', 
    'stop_loss', 
    'tp1', 
    'tp2', 
    'tp3', 
    'tp4', 
    'tp5', 
    'all_tps_hit', 
    'reversal_after_tp', 
    'expired'
  ]).optional(),
  notes: z.string().max(5000).optional(),
  expectedVersion: z.string().optional(), // For optimistic locking
}).strict(); // Reject any extra fields

/**
 * Type inference from schema
 */
export type ValidatedUpdateTradeAlert = z.infer<typeof UpdateTradeAlertSchema>;

/**
 * Validation helper function
 */
export function validateUpdateTradeAlert(data: unknown) {
  return UpdateTradeAlertSchema.safeParse(data);
}
