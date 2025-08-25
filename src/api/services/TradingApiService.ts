import { apiClient } from '../client/ApiClient';
import { CreateTradeAlertDto, UpdateTradeAlertDto, TradeAlertResponseDto } from '@/domain/dtos/trading/CreateTradeAlertDto';
import { ApiResponse } from '@/types/common';
import { isTradeAlert } from '@/types/guards';
import { supabase } from '@/integrations/supabase/client';

export interface TradeAlertWithProfile extends TradeAlertResponseDto {
  creator?: {
    id: string;
    display_name: string;
    role: string;
    avatar_url?: string | null;
    user_type?: string | null;
    access_level?: string | null;
  };
}

type CloseReason =
  | 'manual'
  | 'stop_loss'
  | 'tp1'
  | 'tp2'
  | 'tp3'
  | 'tp4'
  | 'tp5'
  | 'reversal_after_tp';

const CLOSE_REASONS: readonly CloseReason[] = [
  'manual',
  'stop_loss',
  'tp1',
  'tp2',
  'tp3',
  'tp4',
  'tp5',
  'reversal_after_tp',
] as const;

function sanitizeCloseReason(value: unknown): CloseReason | undefined {
  return typeof value === 'string' && (CLOSE_REASONS as readonly string[]).includes(value)
    ? (value as CloseReason)
    : undefined;
}

export class TradingApiService {
  private static instance: TradingApiService;

  private constructor() {}

  static getInstance(): TradingApiService {
    if (!TradingApiService.instance) {
      TradingApiService.instance = new TradingApiService();
    }
    return TradingApiService.instance;
  }

  async createAlert(dto: CreateTradeAlertDto, userId: string): Promise<ApiResponse<TradeAlertResponseDto>> {
    try {
      // Check if user is educator/admin to auto-mark as Xeon Stream
      const { data: profileData } = await apiClient.select('profiles', {
        eq: { column: 'id', value: userId }
      });

      const isEducatorOrAdmin =
        profileData &&
        profileData.length > 0 &&
        (profileData[0].access_level === 'admin' ||
          profileData[0].access_level === 'moderator' ||
          profileData[0].user_type === 'educator');

      const alertData = {
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
        status: 'pending' as const, // Properly type the status as a const literal
        is_xeon_stream: isEducatorOrAdmin
      };

      const result = await apiClient.insert('trade_alerts', alertData);

      if (!result.success || !result.data) {
        return {
          success: false,
          error: result.error || 'Failed to create alert',
          data: undefined
        };
      }

      const createdAlert = result.data[0];
      if (!isTradeAlert(createdAlert)) {
        return {
          success: false,
          error: 'Invalid alert data returned from database',
          data: undefined
        };
      }

      const responseDto: TradeAlertResponseDto = {
        id: createdAlert.id,
        userId: createdAlert.user_id,
        assetName: createdAlert.asset_name,
        tradermadeSymbol: createdAlert.tradermade_symbol,
        tradeType: createdAlert.trade_type,
        entryPrice: Number(createdAlert.entry_price),
        stopLoss: Number(createdAlert.stop_loss),
        status: createdAlert.status,
        tp1: createdAlert.tp1 ? Number(createdAlert.tp1) : undefined,
        tp2: createdAlert.tp2 ? Number(createdAlert.tp2) : undefined,
        tp3: createdAlert.tp3 ? Number(createdAlert.tp3) : undefined,
        tp4: createdAlert.tp4 ? Number(createdAlert.tp4) : undefined,
        tp5: createdAlert.tp5 ? Number(createdAlert.tp5) : undefined,
        tpHits: createdAlert.tp_hits || [],
        notes: createdAlert.notes,
        closeReason: sanitizeCloseReason(createdAlert.close_reason),
        createdAt: createdAlert.created_at,
        updatedAt: createdAlert.updated_at
      };

      return {
        success: true,
        data: responseDto,
        error: undefined
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: undefined
      };
    }
  }

  async getAllAlerts(userId: string): Promise<ApiResponse<TradeAlertResponseDto[]>> {
    try {
      const result = await apiClient.select('trade_alerts', {
        eq: { column: 'user_id', value: userId },
        order: { column: 'created_at', ascending: false }
      });

      if (!result.success || !result.data) {
        return {
          success: false,
          error: result.error || 'Failed to fetch alerts',
          data: undefined
        };
      }

      const responseDtos: TradeAlertResponseDto[] = result.data
        .filter(isTradeAlert)
        .map(alert => ({
          id: alert.id,
          userId: alert.user_id,
          assetName: alert.asset_name,
          tradermadeSymbol: alert.tradermade_symbol,
          tradeType: alert.trade_type,
          entryPrice: Number(alert.entry_price),
          stopLoss: Number(alert.stop_loss),
          status: alert.status,
          tp1: alert.tp1 ? Number(alert.tp1) : undefined,
          tp2: alert.tp2 ? Number(alert.tp2) : undefined,
          tp3: alert.tp3 ? Number(alert.tp3) : undefined,
          tp4: alert.tp4 ? Number(alert.tp4) : undefined,
          tp5: alert.tp5 ? Number(alert.tp5) : undefined,
          tpHits: alert.tp_hits || [],
          notes: alert.notes,
          closeReason: sanitizeCloseReason(alert.close_reason),
          createdAt: alert.created_at,
          updatedAt: alert.updated_at
        }));

      return {
        success: true,
        data: responseDtos,
        error: undefined
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: undefined
      };
    }
  }

  async getAlertsByStatus(status: 'pending' | 'active' | 'closed', userId: string): Promise<ApiResponse<TradeAlertResponseDto[]>> {
    try {
      // Our apiClient options don't support multiple filters; fetch by user and filter in memory
      const allResult = await apiClient.select('trade_alerts', {
        eq: { column: 'user_id', value: userId },
        order: { column: 'created_at', ascending: false }
      });

      if (!allResult.success || !allResult.data) {
        return {
          success: false,
          error: allResult.error || 'Failed to fetch alerts by user',
          data: undefined
        };
      }

      const filtered = allResult.data.filter(isTradeAlert).filter(a => a.status === status);

      const responseDtos: TradeAlertResponseDto[] = filtered.map(alert => ({
        id: alert.id,
        userId: alert.user_id,
        assetName: alert.asset_name,
        tradermadeSymbol: alert.tradermade_symbol,
        tradeType: alert.trade_type,
        entryPrice: Number(alert.entry_price),
        stopLoss: Number(alert.stop_loss),
        status: alert.status,
        tp1: alert.tp1 ? Number(alert.tp1) : undefined,
        tp2: alert.tp2 ? Number(alert.tp2) : undefined,
        tp3: alert.tp3 ? Number(alert.tp3) : undefined,
        tp4: alert.tp4 ? Number(alert.tp4) : undefined,
        tp5: alert.tp5 ? Number(alert.tp5) : undefined,
        tpHits: alert.tp_hits || [],
        notes: alert.notes,
        closeReason: sanitizeCloseReason(alert.close_reason),
        createdAt: alert.created_at,
        updatedAt: alert.updated_at
      }));

      return {
        success: true,
        data: responseDtos,
        error: undefined
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: undefined
      };
    }
  }

  async updateAlert(id: string, dto: UpdateTradeAlertDto, userId: string): Promise<ApiResponse<TradeAlertResponseDto>> {
    try {
      // Only allow fields defined in UpdateTradeAlertDto
      const updateData: any = {};
      if (dto.status !== undefined) updateData.status = dto.status;
      if (dto.notes !== undefined) updateData.notes = dto.notes;
      if (dto.closeReason !== undefined) updateData.close_reason = dto.closeReason;
      if (dto.tpHits !== undefined) updateData.tp_hits = dto.tpHits;

      const { data, error } = await supabase
        .from('trade_alerts')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', userId)
        .select('*')
        .single();

      if (error || !data) {
        return {
          success: false,
          error: error?.message || 'Failed to update alert',
          data: undefined
        };
      }

      const responseDto: TradeAlertResponseDto = {
        id: data.id,
        userId: data.user_id,
        assetName: data.asset_name,
        tradermadeSymbol: data.tradermade_symbol,
        tradeType: data.trade_type,
        entryPrice: Number(data.entry_price),
        stopLoss: Number(data.stop_loss),
        status: data.status,
        tp1: data.tp1 ? Number(data.tp1) : undefined,
        tp2: data.tp2 ? Number(data.tp2) : undefined,
        tp3: data.tp3 ? Number(data.tp3) : undefined,
        tp4: data.tp4 ? Number(data.tp4) : undefined,
        tp5: data.tp5 ? Number(data.tp5) : undefined,
        tpHits: data.tp_hits || [],
        notes: data.notes,
        closeReason: sanitizeCloseReason(data.close_reason),
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };

      return {
        success: true,
        data: responseDto,
        error: undefined
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: undefined
      };
    }
  }

  async deleteAlert(id: string, userId: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from('trade_alerts')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) {
        return {
          success: false,
          error: error.message || 'Failed to delete alert',
          data: undefined
        };
      }

      return {
        success: true,
        data: undefined,
        error: undefined
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: undefined
      };
    }
  }

  // Public Xeon Stream alerts with creator profile
  async getAllPublicAlertsWithProfiles(): Promise<ApiResponse<TradeAlertWithProfile[]>> {
    try {
      const { data: alertsData, error: alertsError } = await supabase
        .from('trade_alerts')
        .select('*')
        .eq('is_xeon_stream', true)
        .order('created_at', { ascending: false });

      if (alertsError) {
        return { success: false, error: alertsError.message, data: undefined };
      }

      const alerts = alertsData || [];
      if (alerts.length === 0) {
        return { success: true, data: [], error: undefined };
      }

      const userIds = Array.from(new Set(alerts.map(a => a.user_id)));
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, display_name, role, avatar_url, user_type, access_level')
        .in('id', userIds);

      if (profilesError) {
        // If profiles fail, still return alerts without creator info
        console.warn('getAllPublicAlertsWithProfiles - profiles fetch failed:', profilesError.message);
      }

      const profilesMap = new Map<string, any>();
      (profilesData || []).forEach(p => profilesMap.set(p.id, p));

      const withProfiles: TradeAlertWithProfile[] = alerts.map(a => {
        const profile = profilesMap.get(a.user_id);
        return {
          id: a.id,
          userId: a.user_id,
          assetName: a.asset_name,
          tradermadeSymbol: a.tradermade_symbol,
          tradeType: a.trade_type,
          entryPrice: Number(a.entry_price),
          stopLoss: Number(a.stop_loss),
          status: a.status,
          tp1: a.tp1 ? Number(a.tp1) : undefined,
          tp2: a.tp2 ? Number(a.tp2) : undefined,
          tp3: a.tp3 ? Number(a.tp3) : undefined,
          tp4: a.tp4 ? Number(a.tp4) : undefined,
          tp5: a.tp5 ? Number(a.tp5) : undefined,
          tpHits: a.tp_hits || [],
          notes: a.notes,
          closeReason: sanitizeCloseReason(a.close_reason),
          createdAt: a.created_at,
          updatedAt: a.updated_at,
          creator: profile
            ? {
                id: profile.id,
                display_name: profile.display_name || 'Anonymous User',
                role: profile.role || 'user',
                avatar_url: profile.avatar_url,
                user_type: profile.user_type,
                access_level: profile.access_level
              }
            : {
                id: a.user_id,
                display_name: 'Unknown User',
                role: 'user',
                avatar_url: null,
                user_type: null,
                access_level: null
              }
        };
      });

      return { success: true, data: withProfiles, error: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: undefined
      };
    }
  }
}

export const tradingApiService = TradingApiService.getInstance();
