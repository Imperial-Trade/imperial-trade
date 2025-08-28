
import { TradeAlertWithProfile } from '@/types/trading';
import { TradeAlertData } from '@/types/components';

/**
 * Maps TradeAlertData (snake_case from database/components) to TradeAlertWithProfile (camelCase)
 */
export const mapTradeAlertDataToProfile = (data: TradeAlertData): TradeAlertWithProfile => {
  return {
    id: data.id,
    userId: '', // Will need to be set from context or API
    assetName: data.asset_name,
    tradermadeSymbol: data.tradermade_symbol,
    tradeType: data.trade_type,
    entryPrice: data.entry_price,
    stopLoss: data.stop_loss,
    status: data.status,
    tp1: data.tp1,
    tp2: data.tp2,
    tp3: data.tp3,
    tp4: data.tp4,
    tp5: data.tp5,
    tpHits: data.tp_hits || [],
    notes: data.notes,
    closeReason: data.close_reason,
    createdAt: data.created_date,
    updatedAt: data.updated_date || data.created_date
  };
};

/**
 * Maps TradeAlertWithProfile (camelCase) to TradeAlertData (snake_case)
 */
export const mapTradeAlertProfileToData = (profile: TradeAlertWithProfile): TradeAlertData => {
  return {
    id: profile.id,
    asset_name: profile.assetName,
    tradermade_symbol: profile.tradermadeSymbol,
    trade_type: profile.tradeType,
    entry_price: profile.entryPrice,
    stop_loss: profile.stopLoss,
    status: profile.status,
    tp1: profile.tp1,
    tp2: profile.tp2,
    tp3: profile.tp3,
    tp4: profile.tp4,
    tp5: profile.tp5,
    tp_hits: profile.tpHits,
    notes: profile.notes,
    close_reason: profile.closeReason,
    created_date: profile.createdAt,
    updated_date: profile.updatedAt
  };
};
