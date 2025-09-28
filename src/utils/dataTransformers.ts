/**
 * Anti-Corruption Layer (ACL) - Data Transformers
 * Centralized utilities for transforming between database snake_case and frontend camelCase
 */

import { CreateTradeAlertDto, UpdateTradeAlertDto, TradeAlertResponseDto } from '@/domain/dtos/trading/CreateTradeAlertDto';
import { TableInsert } from '@/api/client/types';

// Profile transformation types
interface DatabaseProfile {
  id: string;
  display_name: string | null;
  role: string;
  avatar_url: string | null;
  user_type: string | null;
  access_level: string | null;
}

interface TransformedProfile {
  id: string;
  display_name: string;
  role: string;
  avatar_url?: string;
  user_type?: string;
  access_level?: string;
}

// Trade Alert database row type (snake_case)
interface DatabaseTradeAlert {
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
  close_reason?: 'manual' | 'stop_loss' | 'tp1' | 'tp2' | 'tp3' | 'tp4' | 'tp5' | 'all_tps_hit' | 'reversal_after_tp' | 'expired';
  created_at: string;
  updated_at: string;
}

// Combined type for database queries with profiles
export interface DatabaseTradeAlertWithProfile extends DatabaseTradeAlert {
  profiles?: DatabaseProfile;
}

// Frontend type with profile (camelCase)
export interface TradeAlertWithProfile extends TradeAlertResponseDto {
  creator?: TransformedProfile;
}

/**
 * Transforms database profile (snake_case) to frontend profile (camelCase)
 */
export function transformProfile(dbProfile: DatabaseProfile | null): TransformedProfile | undefined {
  if (!dbProfile) return undefined;

  return {
    id: dbProfile.id,
    display_name: dbProfile.display_name || 'Anonymous User',
    role: dbProfile.role || 'user',
    avatar_url: dbProfile.avatar_url || undefined,
    user_type: dbProfile.user_type || undefined,
    access_level: dbProfile.access_level || undefined,
  };
}

/**
 * Transforms database trade alert (snake_case) to frontend DTO (camelCase)
 */
export function transformTradeAlert(dbAlert: DatabaseTradeAlert): TradeAlertResponseDto {
  return {
    id: dbAlert.id,
    userId: dbAlert.user_id,
    assetName: dbAlert.asset_name,
    tradermadeSymbol: dbAlert.tradermade_symbol,
    tradeType: dbAlert.trade_type,
    entryPrice: Number(dbAlert.entry_price),
    stopLoss: Number(dbAlert.stop_loss),
    status: dbAlert.status,
    tp1: dbAlert.tp1 ? Number(dbAlert.tp1) : undefined,
    tp2: dbAlert.tp2 ? Number(dbAlert.tp2) : undefined,
    tp3: dbAlert.tp3 ? Number(dbAlert.tp3) : undefined,
    tp4: dbAlert.tp4 ? Number(dbAlert.tp4) : undefined,
    tp5: dbAlert.tp5 ? Number(dbAlert.tp5) : undefined,
    tpHits: dbAlert.tp_hits || [],
    notes: dbAlert.notes,
    closeReason: dbAlert.close_reason,
    createdAt: dbAlert.created_at,
    updatedAt: dbAlert.updated_at
  };
}

/**
 * Transforms database trade alert with profile (snake_case) to frontend with profile (camelCase)
 */
export function transformTradeAlertWithProfile(dbAlert: DatabaseTradeAlertWithProfile): TradeAlertWithProfile {
  const baseAlert = transformTradeAlert(dbAlert);
  const creator = transformProfile(dbAlert.profiles || null);

  return {
    ...baseAlert,
    creator
  };
}

/**
 * Transforms frontend CreateTradeAlertDto (camelCase) to database format (snake_case)
 */
export function transformCreateAlertToDatabase(dto: CreateTradeAlertDto, userId: string): TableInsert<'trade_alerts'> {
  return {
    user_id: userId,
    asset_name: dto.assetName,
    tradermade_symbol: dto.tradermadeSymbol,
    trade_type: dto.tradeType,
    entry_price: dto.entryPrice,
    stop_loss: dto.stopLoss,
    tp1: dto.tp1,
    tp2: dto.tp2,
    tp3: dto.tp3,
    tp4: dto.tp4,
    tp5: dto.tp5,
    notes: dto.notes,
    status: 'pending' as const,
    tp_hits: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  } as TableInsert<'trade_alerts'>;
}

/**
 * Transforms frontend UpdateTradeAlertDto (camelCase) to database format (snake_case)
 */
export function transformUpdateAlertToDatabase(dto: UpdateTradeAlertDto): Partial<DatabaseTradeAlert> {
  const updateData: Partial<DatabaseTradeAlert> = {
    updated_at: new Date().toISOString()
  };

  if (dto.status !== undefined) updateData.status = dto.status;
  if (dto.tpHits !== undefined) updateData.tp_hits = dto.tpHits;
  if (dto.closeReason !== undefined) updateData.close_reason = dto.closeReason;
  if (dto.notes !== undefined) updateData.notes = dto.notes;

  return updateData;
}

/**
 * Batch transform multiple database trade alerts with profiles
 */
export function transformTradeAlertsWithProfiles(dbAlerts: DatabaseTradeAlertWithProfile[]): TradeAlertWithProfile[] {
  return dbAlerts.map(transformTradeAlertWithProfile);
}

/**
 * Batch transform multiple database trade alerts  
 */
export function transformTradeAlerts(dbAlerts: DatabaseTradeAlert[]): TradeAlertResponseDto[] {
  return dbAlerts.map(transformTradeAlert);
}