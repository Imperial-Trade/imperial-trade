import { TradeAlertStatus, TradeAlertCloseReason } from '@/types/trading';

export interface BadgeVariant {
  label: string;
  className: string;
  iconKey: 'hourglass' | 'target' | 'trending-up' | 'check' | 'x' | 'clock';
  tone: 'pending' | 'active' | 'partial' | 'success' | 'error' | 'neutral';
}

/**
 * Maps trade alert status and close reason to consistent badge styling
 * Returns a neutral variant for unknown states to prevent UI crashes
 */
export function mapStatusToVariant(
  status: TradeAlertStatus, 
  closeReason?: TradeAlertCloseReason | string | null,
  tpHits: number[] = []
): BadgeVariant {
  // Handle partially_profited status
  if (status === 'partially_profited') {
    return {
      label: 'PARTIALLY PROFITED',
      className: 'bg-amber-500/20 text-amber-300 border-amber-500/30 animate-pulse',
      iconKey: 'target',
      tone: 'partial'
    };
  }

  // Handle pending status
  if (status === 'pending') {
    return {
      label: 'PENDING',
      className: 'bg-gold-light/20 text-gold-warm border border-gold-warm/30',
      iconKey: 'hourglass',
      tone: 'pending'
    };
  }

  // Handle active status with TP hits
  if (status === 'active') {
    if (tpHits.length > 0) {
      return {
        label: 'ACTIVE',
        className: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 animate-pulse',
        iconKey: 'target',
        tone: 'active'
      };
    }
    return {
      label: 'ACTIVE',
      className: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      iconKey: 'trending-up',
      tone: 'active'
    };
  }

  // Handle closed status with various close reasons
  if (status === 'closed') {
    if (closeReason === 'stop_loss') {
      return {
        label: 'STOP LOSS HIT',
        className: 'bg-red-500/30 text-red-200 border-red-400 shadow-lg shadow-red-500/50 border-2',
        iconKey: 'x',
        tone: 'error'
      };
    }

    // Handle TP close reasons
    if (closeReason && typeof closeReason === 'string') {
      const tpMatch = closeReason.match(/^tp([1-5])$/);
      if (tpMatch) {
        const tpNumber = tpMatch[1];
        return {
          label: `TP${tpNumber} REACHED`,
          className: 'bg-emerald-500/30 text-emerald-200 border-emerald-400 shadow-lg shadow-emerald-500/50 border-2',
          iconKey: 'trending-up',
          tone: 'success'
        };
      }
      
      if (closeReason === 'all_tps_hit') {
        return {
          label: 'ALL TPS HIT',
          className: 'bg-emerald-500/30 text-emerald-200 border-emerald-400 shadow-lg shadow-emerald-500/50 border-2',
          iconKey: 'check',
          tone: 'success'
        };
      }

      if (closeReason === 'expired') {
        return {
          label: 'EXPIRED',
          className: 'bg-gray-600/30 text-gray-300 border-gray-500',
          iconKey: 'clock',
          tone: 'neutral'
        };
      }

      if (closeReason === 'reversal_after_tp') {
        return {
          label: 'REVERSED AFTER TP',
          className: 'bg-orange-500/30 text-orange-200 border-orange-400',
          iconKey: 'target',
          tone: 'neutral'
        };
      }
    }

    // Check if we have TP hits without explicit close reason
    if (tpHits.length > 0) {
      const highestTP = Math.max(...tpHits);
      return {
        label: `TP${highestTP} HIT`,
        className: 'bg-emerald-500/30 text-emerald-200 border-emerald-400 shadow-lg shadow-emerald-500/50 border-2',
        iconKey: 'check',
        tone: 'success'
      };
    }

    // Default closed (manual or other)
    return {
      label: 'MANUALLY CLOSED',
      className: 'bg-gray-600/30 text-gray-300 border-gray-500 shadow-lg shadow-gray-500/30 border-2',
      iconKey: 'x',
      tone: 'neutral'
    };
  }

  // Neutral fallback for unknown states
  return {
    label: 'UNKNOWN STATUS',
    className: 'bg-muted/30 text-muted-foreground border-border',
    iconKey: 'clock',
    tone: 'neutral'
  };
}

/**
 * Get TP badge variant for active/partial states with TP hits
 */
export function getTpHitVariant(tpNumber: number, tone: 'active' | 'partial' = 'active'): BadgeVariant {
  const baseClass = tone === 'partial' 
    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
  
  return {
    label: `TP${tpNumber} HIT`,
    className: baseClass,
    iconKey: 'target',
    tone
  };
}

/**
 * Get card accent classes based on trade alert status
 * Provides visual context with subtle borders and backgrounds
 */
export function getCardAccentClasses(
  status: TradeAlertStatus, 
  closeReason?: TradeAlertCloseReason | string | null,
  tpHits: number[] = []
): string {
  const variant = mapStatusToVariant(status, closeReason, tpHits);
  
  switch (variant.tone) {
    case 'pending':
      return 'border-l-4 border-l-yellow-500/50 bg-yellow-500/5';
    case 'active':
      return 'border-l-4 border-l-emerald-500/50 bg-emerald-500/5';
    case 'partial':
      return 'border-l-4 border-l-amber-500/50 bg-amber-500/5';
    case 'success':
      return 'border-l-4 border-l-emerald-500/50 bg-emerald-500/5';
    case 'error':
      return 'border-l-4 border-l-red-500/50 bg-red-500/5';
    case 'neutral':
    default:
      return 'border-l-4 border-l-gray-500/50 bg-gray-500/5';
  }
}