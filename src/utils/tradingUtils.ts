
import { TradeAlert } from '@/domain/entities/trading/TradeAlert';
import { UpdateTradeAlertDto } from '@/domain/dtos/trading/CreateTradeAlertDto';

export interface AutoClosureResult {
  shouldClose: boolean;
  closeReason?: 'all_tps_hit';
  cleanedTpHits: number[];
  status?: 'closed';
}

/**
 * Critical utility to determine if a trade should auto-close when all TPs are hit
 */
export function checkAutoClosureCondition(alert: TradeAlert, newTpHits: number[]): AutoClosureResult {
  // Clean duplicates from both existing and new TP hits
  const existingHits = [...new Set(alert.tpHits)];
  const combinedHits = [...new Set([...existingHits, ...newTpHits])];
  const cleanedTpHits = combinedHits.sort((a, b) => a - b);

  // Get all available TP levels
  const availableTPs = [alert.tp1, alert.tp2, alert.tp3, alert.tp4, alert.tp5]
    .map((tp, index) => tp ? index + 1 : null)
    .filter(Boolean) as number[];

  console.log('🔍 Auto-closure check:', {
    alertId: alert.id,
    assetName: alert.assetName,
    availableTPs,
    cleanedTpHits,
    allTpsHit: availableTPs.every(tpLevel => cleanedTpHits.includes(tpLevel))
  });

  // Check if all available TPs have been hit
  const shouldClose = availableTPs.length > 0 && 
    availableTPs.every(tpLevel => cleanedTpHits.includes(tpLevel));

  return {
    shouldClose,
    closeReason: shouldClose ? 'all_tps_hit' : undefined,
    cleanedTpHits,
    status: shouldClose ? 'closed' : undefined
  };
}

/**
 * Create update DTO with auto-closure logic
 */
export function createTpUpdateDto(
  alert: TradeAlert, 
  newTpHits: number[], 
  manualClose?: boolean,
  manualCloseReason?: string
): UpdateTradeAlertDto {
  const autoClosureResult = checkAutoClosureCondition(alert, newTpHits);
  
  // Manual close takes precedence
  if (manualClose) {
    return {
      tpHits: autoClosureResult.cleanedTpHits,
      status: 'closed',
      closeReason: (manualCloseReason as any) || 'manual'
    };
  }

  // Auto-close if all TPs are hit
  if (autoClosureResult.shouldClose) {
    console.log('🎯 AUTO-CLOSING SIGNAL:', {
      alertId: alert.id,
      assetName: alert.assetName,
      reason: 'all_tps_hit',
      tpHits: autoClosureResult.cleanedTpHits
    });

    return {
      tpHits: autoClosureResult.cleanedTpHits,
      status: 'closed',
      closeReason: 'all_tps_hit'
    };
  }

  // Partial profit state
  const hasNewHits = autoClosureResult.cleanedTpHits.length > [...new Set(alert.tpHits)].length;
  return {
    tpHits: autoClosureResult.cleanedTpHits,
    status: hasNewHits && autoClosureResult.cleanedTpHits.length > 0 ? 'partially_profited' : alert.status
  };
}
