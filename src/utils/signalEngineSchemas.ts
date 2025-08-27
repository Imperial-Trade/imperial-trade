
import { z } from 'zod';

export const ReconcileResultSchema = z.object({
  // Backward compatibility: support either signals_fixed or signals_closed
  signals_fixed: z.number().optional(),
  signals_closed: z.number().optional(),
  orders_activated: z.number().optional(),
  timestamp: z.string().optional(),
  status: z.string().optional(),
  error: z.any().optional(),
});

export type ReconcileResultNormalized = {
  signals_fixed: number;
  orders_activated: number;
  timestamp?: string;
  status: string;
};

export function parseReconcileResult(input: unknown): ReconcileResultNormalized {
  const parsed = ReconcileResultSchema.safeParse(input);

  if (parsed.success) {
    const signals_fixed = parsed.data.signals_fixed ?? parsed.data.signals_closed ?? 0;
    const orders_activated = parsed.data.orders_activated ?? 0;
    const status = parsed.data.status ?? 'success';

    return {
      signals_fixed,
      orders_activated,
      timestamp: parsed.data.timestamp,
      status,
    };
  }

  console.warn('[SignalEngine] Unexpected reconcile function response shape:', input);
  return { signals_fixed: 0, orders_activated: 0, status: 'unknown' };
}
