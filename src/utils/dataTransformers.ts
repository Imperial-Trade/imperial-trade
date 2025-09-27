import { TradeAlertResponseDto } from '@/domain/dtos/trading/CreateTradeAlertDto';

// Anti-Corruption Layer (ACL) - Data Transformation Utilities
// This layer converts between database snake_case and frontend camelCase

export interface TradeAlertWithProfile {
  id: string;
  userId: string;
  assetName: string;
  tradermadeSymbol: string;
  tradeType: 'buy' | 'sell' | 'buy_limit' | 'sell_limit';
  entryPrice: number;
  stopLoss: number;
  status: 'pending' | 'active' | 'closed' | 'partially_profited';
  tp1?: number;
  tp2?: number;
  tp3?: number;
  tp4?: number;
  tp5?: number;
  tpHits: number[];
  notes?: string;
  closeReason?: 'manual' | 'stop_loss' | 'tp1' | 'tp2' | 'tp3' | 'tp4' | 'tp5' | 'all_tps_hit' | 'expired' | 'reversal_after_tp';
  createdAt?: string;
  updatedAt?: string;
  creator?: {
    id: string;
    displayName: string;
    role: string;
    avatarUrl?: string;
    userType?: string;
    accessLevel?: string;
  };
}

export interface DatabaseTradeAlert {
  id: string;
  user_id: string;
  asset_name: string;
  tradermade_symbol: string;
  trade_type: 'buy' | 'sell' | 'buy_limit' | 'sell_limit';
  entry_price: number;
  stop_loss: number;
  status: 'pending' | 'active' | 'closed' | 'partially_profited';
  tp1?: number;
  tp2?: number;
  tp3?: number;
  tp4?: number;
  tp5?: number;
  tp_hits: number[];
  notes?: string;
  close_reason?: 'manual' | 'stop_loss' | 'tp1' | 'tp2' | 'tp3' | 'tp4' | 'tp5' | 'all_tps_hit' | 'expired' | 'reversal_after_tp';
  created_at: string;
  updated_at: string;
  profiles?: {
    id: string;
    display_name: string;
    role: string;
    avatar_url?: string;
    user_type?: string;
    access_level?: string;
  };
}

/**
 * Transform database snake_case to frontend camelCase
 */
export function transformTradeAlertToFrontend(dbAlert: DatabaseTradeAlert): TradeAlertWithProfile {
  return {
    id: dbAlert.id,
    userId: dbAlert.user_id,
    assetName: dbAlert.asset_name,
    tradermadeSymbol: dbAlert.tradermade_symbol,
    tradeType: dbAlert.trade_type,
    entryPrice: dbAlert.entry_price,
    stopLoss: dbAlert.stop_loss,
    status: dbAlert.status,
    tp1: dbAlert.tp1,
    tp2: dbAlert.tp2,
    tp3: dbAlert.tp3,
    tp4: dbAlert.tp4,
    tp5: dbAlert.tp5,
    tpHits: dbAlert.tp_hits || [],
    notes: dbAlert.notes,
    closeReason: dbAlert.close_reason,
    createdAt: dbAlert.created_at || new Date().toISOString(),
    updatedAt: dbAlert.updated_at || new Date().toISOString(),
    creator: dbAlert.profiles ? {
      id: dbAlert.profiles.id,
      displayName: dbAlert.profiles.display_name,
      role: dbAlert.profiles.role,
      avatarUrl: dbAlert.profiles.avatar_url,
      userType: dbAlert.profiles.user_type,
      accessLevel: dbAlert.profiles.access_level,
    } : undefined,
  };
}

/**
 * Transform frontend camelCase to database snake_case
 */
export function transformTradeAlertToDatabase(frontendAlert: Partial<TradeAlertWithProfile>): Partial<DatabaseTradeAlert> {
  const dbAlert: Partial<DatabaseTradeAlert> = {};

  if (frontendAlert.id) dbAlert.id = frontendAlert.id;
  if (frontendAlert.userId) dbAlert.user_id = frontendAlert.userId;
  if (frontendAlert.assetName) dbAlert.asset_name = frontendAlert.assetName;
  if (frontendAlert.tradermadeSymbol) dbAlert.tradermade_symbol = frontendAlert.tradermadeSymbol;
  if (frontendAlert.tradeType) dbAlert.trade_type = frontendAlert.tradeType;
  if (frontendAlert.entryPrice) dbAlert.entry_price = frontendAlert.entryPrice;
  if (frontendAlert.stopLoss) dbAlert.stop_loss = frontendAlert.stopLoss;
  if (frontendAlert.status) dbAlert.status = frontendAlert.status;
  if (frontendAlert.tp1) dbAlert.tp1 = frontendAlert.tp1;
  if (frontendAlert.tp2) dbAlert.tp2 = frontendAlert.tp2;
  if (frontendAlert.tp3) dbAlert.tp3 = frontendAlert.tp3;
  if (frontendAlert.tp4) dbAlert.tp4 = frontendAlert.tp4;
  if (frontendAlert.tp5) dbAlert.tp5 = frontendAlert.tp5;
  if (frontendAlert.tpHits) dbAlert.tp_hits = frontendAlert.tpHits;
  if (frontendAlert.notes !== undefined) dbAlert.notes = frontendAlert.notes;
  if (frontendAlert.closeReason) dbAlert.close_reason = frontendAlert.closeReason;
  if (frontendAlert.createdAt) dbAlert.created_at = frontendAlert.createdAt;
  if (frontendAlert.updatedAt) dbAlert.updated_at = frontendAlert.updatedAt;

  return dbAlert;
}

/**
 * Transform TradeAlertResponseDto to frontend format
 */
export function transformDtoToFrontend(dto: TradeAlertResponseDto, creator?: TradeAlertWithProfile['creator']): TradeAlertWithProfile {
  return {
    id: dto.id,
    userId: dto.userId,
    assetName: dto.assetName,
    tradermadeSymbol: dto.tradermadeSymbol,
    tradeType: dto.tradeType,
    entryPrice: dto.entryPrice,
    stopLoss: dto.stopLoss,
    status: dto.status,
    tp1: dto.tp1,
    tp2: dto.tp2,
    tp3: dto.tp3,
    tp4: dto.tp4,
    tp5: dto.tp5,
    tpHits: dto.tpHits || [],
    notes: dto.notes,
    closeReason: dto.closeReason,
    createdAt: dto.createdAt || new Date().toISOString(),
    updatedAt: dto.updatedAt || new Date().toISOString(),
    creator,
  };
}

/**
 * Transform array of database alerts to frontend format
 */
export function transformTradeAlertsArrayToFrontend(dbAlerts: DatabaseTradeAlert[]): TradeAlertWithProfile[] {
  return dbAlerts.map(transformTradeAlertToFrontend);
}

/**
 * Create Alert object for components that still expect the old interface
 */
export function createLegacyAlert(alert: TradeAlertWithProfile): any {
  return {
    asset_name: alert.assetName,
    trade_type: alert.tradeType,
    entry_price: alert.entryPrice,
    stop_loss: alert.stopLoss,
    tp1: alert.tp1,
    tp2: alert.tp2,
    tp3: alert.tp3,
    tp4: alert.tp4,
    tp5: alert.tp5,
    // Add other legacy properties as needed
  };
}