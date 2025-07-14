import { apiClient, TableRow, TableInsert, TableUpdate } from '../client/ApiClient';
import { supabase } from '@/integrations/supabase/client';
import { CreateTradeAlertDto, UpdateTradeAlertDto, TradeAlertResponseDto } from '@/domain/dtos/trading/CreateTradeAlertDto';
import { ApiResponse } from '@/types/common';
import { isTradeAlert } from '@/types/guards';

export interface TradeAlertWithProfile extends TradeAlertResponseDto {
  creator?: {
    id: string;
    display_name: string;
    role: string;
    avatar_url?: string;
    user_type?: string;
    access_level?: string;
  };
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
      console.log('TradingApiService - Creating alert with DTO:', dto);
      console.log('TradingApiService - User ID:', userId);
      
      const insertData: TableInsert<'trade_alerts'> = {
        asset_name: dto.assetName,
        finnhub_symbol: dto.finnhubSymbol,
        trade_type: dto.tradeType,
        entry_price: dto.entryPrice,
        stop_loss: dto.stopLoss,
        tp1: dto.tp1,
        tp2: dto.tp2,
        tp3: dto.tp3,
        tp4: dto.tp4,
        tp5: dto.tp5,
        notes: dto.notes,
        user_id: userId,
        status: 'active'
      };

      console.log('TradingApiService - Insert data:', insertData);

      const result = await apiClient.insert('trade_alerts', insertData);
      
      console.log('TradingApiService - Insert result:', result);
      
      if (!result.success || !result.data) {
        return {
          success: false,
          error: result.error || 'Failed to create alert',
          data: undefined
        };
      }

      if (!isTradeAlert(result.data)) {
        return {
          success: false,
          error: 'Invalid trade alert data received',
          data: undefined
        };
      }

      const responseDto: TradeAlertResponseDto = {
        id: result.data.id,
        assetName: result.data.asset_name,
        finnhubSymbol: result.data.finnhub_symbol,
        tradeType: result.data.trade_type,
        entryPrice: Number(result.data.entry_price),
        stopLoss: Number(result.data.stop_loss),
        status: result.data.status,
        tp1: result.data.tp1 ? Number(result.data.tp1) : undefined,
        tp2: result.data.tp2 ? Number(result.data.tp2) : undefined,
        tp3: result.data.tp3 ? Number(result.data.tp3) : undefined,
        tp4: result.data.tp4 ? Number(result.data.tp4) : undefined,
        tp5: result.data.tp5 ? Number(result.data.tp5) : undefined,
        tpHits: result.data.tp_hits || [],
        notes: result.data.notes,
        closeReason: result.data.close_reason,
        createdAt: result.data.created_at,
        updatedAt: result.data.updated_at
      };

      // Dispatch custom event to notify about new signal
      window.dispatchEvent(new CustomEvent('signal-posted'));

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

  async updateAlert(id: string, dto: UpdateTradeAlertDto, userId: string): Promise<ApiResponse<TradeAlertResponseDto>> {
    try {
      const updateData: TableUpdate<'trade_alerts'> = {
        status: dto.status,
        tp_hits: dto.tpHits,
        close_reason: dto.closeReason,
        notes: dto.notes,
        updated_at: new Date().toISOString()
      };

      const result = await apiClient.update('trade_alerts', id, updateData);
      
      if (!result.success || !result.data) {
        return {
          success: false,
          error: result.error || 'Failed to update alert',
          data: undefined
        };
      }

      if (!isTradeAlert(result.data)) {
        return {
          success: false,
          error: 'Invalid trade alert data received',
          data: undefined
        };
      }

      // Verify ownership
      if (result.data.user_id !== userId) {
        return {
          success: false,
          error: 'Unauthorized to update this alert',
          data: undefined
        };
      }

      const responseDto: TradeAlertResponseDto = {
        id: result.data.id,
        assetName: result.data.asset_name,
        finnhubSymbol: result.data.finnhub_symbol,
        tradeType: result.data.trade_type,
        entryPrice: Number(result.data.entry_price),
        stopLoss: Number(result.data.stop_loss),
        status: result.data.status,
        tp1: result.data.tp1 ? Number(result.data.tp1) : undefined,
        tp2: result.data.tp2 ? Number(result.data.tp2) : undefined,
        tp3: result.data.tp3 ? Number(result.data.tp3) : undefined,
        tp4: result.data.tp4 ? Number(result.data.tp4) : undefined,
        tp5: result.data.tp5 ? Number(result.data.tp5) : undefined,
        tpHits: result.data.tp_hits || [],
        notes: result.data.notes,
        closeReason: result.data.close_reason,
        createdAt: result.data.created_at,
        updatedAt: result.data.updated_at
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
          assetName: alert.asset_name,
          finnhubSymbol: alert.finnhub_symbol,
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
          closeReason: alert.close_reason,
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

  // NEW: Get all public signals with user profile information
  async getAllPublicAlertsWithProfiles(): Promise<ApiResponse<TradeAlertWithProfile[]>> {
    try {
      // First get all trade alerts
      const { data: alertsData, error: alertsError } = await supabase
        .from('trade_alerts')
        .select('*')
        .order('created_at', { ascending: false });

      if (alertsError) {
        return {
          success: false,
          error: alertsError.message,
          data: undefined
        };
      }

      if (!alertsData) {
        return {
          success: true,
          data: [],
          error: undefined
        };
      }

      // Get all unique user IDs from the alerts
      const userIds = [...new Set(alertsData.map(alert => alert.user_id))];

      // Fetch profiles for these users
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        // Continue without profiles if there's an error
      }

      // Create a map of user_id to profile for quick lookup
      const profilesMap = new Map();
      if (profilesData) {
        profilesData.forEach(profile => {
          profilesMap.set(profile.id, profile);
        });
      }

      const responseDtos: TradeAlertWithProfile[] = alertsData
        .filter(isTradeAlert)
        .map(alert => {
          const profile = profilesMap.get(alert.user_id);
          return {
            id: alert.id,
            assetName: alert.asset_name,
            finnhubSymbol: alert.finnhub_symbol,
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
            closeReason: alert.close_reason,
            createdAt: alert.created_at,
            updatedAt: alert.updated_at,
            creator: profile ? {
              id: profile.id,
              display_name: profile.display_name || 'Anonymous User',
              role: profile.role || 'user',
              avatar_url: profile.avatar_url,
              user_type: profile.user_type,
              access_level: profile.access_level
            } : undefined
          };
        });

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

      const filteredAlerts = result.data
        .filter(isTradeAlert)
        .filter(alert => alert.status === status)
        .map(alert => ({
          id: alert.id,
          assetName: alert.asset_name,
          finnhubSymbol: alert.finnhub_symbol,
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
          closeReason: alert.close_reason,
          createdAt: alert.created_at,
          updatedAt: alert.updated_at
        }));

      return {
        success: true,
        data: filteredAlerts,
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
      // First verify ownership
      const alertResult = await apiClient.select('trade_alerts', {
        eq: { column: 'id', value: id }
      });

      if (!alertResult.success || !alertResult.data || alertResult.data.length === 0) {
        return {
          success: false,
          error: 'Alert not found',
          data: undefined
        };
      }

      const alert = alertResult.data[0];
      if (alert.user_id !== userId) {
        return {
          success: false,
          error: 'Unauthorized to delete this alert',
          data: undefined
        };
      }

      return await apiClient.delete('trade_alerts', id);
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
